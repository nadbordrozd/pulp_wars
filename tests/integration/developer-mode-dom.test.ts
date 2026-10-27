// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import { CAMPAIGNS_V7 } from "../../src/campaign/campaigns";
import { DEV_MODE_STORAGE_KEY_V7 } from "../../src/campaign/dev-mode-v7";
import { campaignBuiltV7 } from "../../src/campaign/progress-v7";
import { CAMPAIGN_PROGRESS_STORAGE_KEY_V7 } from "../../src/persistence/index";
import { RecordingBoardHost } from "../fixtures/v7-dom-rig";
import {
  AT,
  required,
  requiredButton,
  settle,
  waitUntil,
} from "./ruleset7-campaign-dom.shared";

/**
 * Developer mode and the faction locks (`pulp_wars-5xki`,
 * docs/product/CAMPAIGN.md section 25): the secret gestures turn it on,
 * Settings turns it off; the Gallery is in the menu only in developer
 * mode; every campaign and mission opens without touching the stored
 * progress; outside it Ice Folk, Candy and the Cultists wait for 4, 5 and
 * 6 completed campaigns, greyed with a tooltip, and a new game never leads
 * a locked faction, while a saved game that does still loads. No match is
 * played: a launched match is resumed, never advanced.
 */

let app: ReturnType<typeof bootstrapRuleset7App> | null = null;

function mount(): ReturnType<typeof bootstrapRuleset7App> {
  app?.destroy();
  document.body.innerHTML = '<div id="app"></div>';
  app = bootstrapRuleset7App(document, {
    boardHost: new RecordingBoardHost(),
    randomSeed: () => 7,
    randomDraw: () => 0,
  });
  return app;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

afterEach(() => {
  app?.destroy();
  app = null;
  window.history.replaceState(null, "", "/");
});

/** Stores version 2 progress with the first `count` campaigns completed. */
function completeCampaigns(count: number): void {
  const built = CAMPAIGNS_V7.filter(campaignBuiltV7);
  window.localStorage.setItem(
    CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    JSON.stringify({
      format: "pulp-wars-campaign-progress",
      version: 2,
      campaigns: Object.fromEntries(
        built.slice(0, count).map((campaign, index) => [
          campaign.id,
          {
            completed: {
              [campaign.chapter?.missions.at(-1)?.missionId ?? ""]: {
                firstWonAt: AT,
                bestRounds: 12,
                stars: 1,
                // An Easy win completes a campaign too.
                ...(index === 0 ? { easy: true } : {}),
              },
            },
          },
        ]),
      ),
    }),
  );
}

function menuItems(): (string | undefined)[] {
  return [
    ...document.querySelectorAll<HTMLElement>(".v7-main-menu button"),
  ].map((item) => item.dataset.action);
}

function tapLogo(times: number): void {
  for (let index = 0; index < times; index += 1)
    required(document.querySelector<HTMLElement>(".v7-brand h1")).click();
}

function card(faction: string): HTMLButtonElement {
  return requiredButton(`.v7-tribe-card[data-faction="${faction}"]`);
}

async function openNewGame(): Promise<void> {
  requiredButton('[data-action="new-game"]').click();
  await settle();
}

async function turnOffInSettings(): Promise<void> {
  requiredButton('[data-action="front-settings"]').click();
  await settle();
  const toggle = requiredButton('[data-action="developer-mode"]');
  expect(toggle.textContent).toBe("Developer mode: on");
  expect(toggle.getAttribute("aria-pressed")).toBe("true");
  toggle.click();
  await settle();
  requiredButton('[data-action="front-back"]').click();
  await settle();
}

describe("developer mode", () => {
  it("is off on a fresh profile: no Gallery in the menu, no DEV tag, no Settings switch", async () => {
    mount();
    await settle();
    expect(menuItems()).not.toContain("gallery");
    expect(document.querySelector('[data-v7-region="dev-tag"]')).toBeNull();
    requiredButton('[data-action="front-settings"]').click();
    await settle();
    expect(document.querySelector('[data-action="developer-mode"]')).toBeNull();
  });

  it("seven quick taps of the logo turn it on: a notice, the DEV tag and the Gallery; more taps leave it on", async () => {
    mount();
    await settle();
    tapLogo(6);
    await settle();
    expect(menuItems()).not.toContain("gallery");
    tapLogo(1);
    await settle();
    expect(
      document.querySelector('[data-v7-region="front-toast"]')?.textContent,
    ).toBe("Developer mode on");
    expect(
      document.querySelector('[data-v7-region="dev-tag"]')?.textContent,
    ).toBe("DEV");
    expect(menuItems()).toEqual([
      "tutorial",
      "new-game",
      "campaign",
      "gallery",
      "front-settings",
      "about",
    ]);
    expect(window.localStorage.getItem(DEV_MODE_STORAGE_KEY_V7)).toBe("1");
    tapLogo(7);
    await settle();
    expect(menuItems()).toContain("gallery");
    // Remembered in this browser.
    mount();
    await settle();
    expect(menuItems()).toContain("gallery");
  });

  it("typing 'pulpwars' on the menu turns it on, and so does ?dev=1", async () => {
    mount();
    await settle();
    for (const key of "pulpwars")
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    await settle();
    expect(menuItems()).toContain("gallery");
    window.localStorage.clear();
    window.history.replaceState(null, "", "/?dev=1");
    mount();
    await settle();
    expect(menuItems()).toContain("gallery");
    expect(window.localStorage.getItem(DEV_MODE_STORAGE_KEY_V7)).toBe("1");
  });

  it("the Settings switch turns it off at once: the Gallery, the tag and the open campaigns go", async () => {
    window.localStorage.setItem(DEV_MODE_STORAGE_KEY_V7, "1");
    mount();
    await settle();
    expect(menuItems()).toContain("gallery");
    await turnOffInSettings();
    expect(menuItems()).not.toContain("gallery");
    expect(document.querySelector('[data-v7-region="dev-tag"]')).toBeNull();
    expect(window.localStorage.getItem(DEV_MODE_STORAGE_KEY_V7)).toBeNull();
    requiredButton('[data-action="campaign"]').click();
    await settle();
    expect(
      document.querySelector<HTMLElement>(
        '.v7-campaign-plate[data-campaign="CULT"]',
      )?.dataset.status,
    ).toBe("locked");
  });

  it("opens every campaign and mission as a view: the stored progress is untouched", async () => {
    completeCampaigns(1);
    const stored = window.localStorage.getItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    );
    window.localStorage.setItem(DEV_MODE_STORAGE_KEY_V7, "1");
    mount();
    await settle();
    requiredButton('[data-action="campaign"]').click();
    await settle();
    const statuses = [
      ...document.querySelectorAll<HTMLElement>(".v7-campaign-plate"),
    ].map((plate) => [plate.dataset.campaign, plate.dataset.status]);
    expect(statuses).toHaveLength(9);
    for (const [id, status] of statuses)
      expect(["open", "done"], id).toContain(status);
    requiredButton('[data-action="campaign-open-cult"]').click();
    await settle();
    const cards = [
      ...document.querySelectorAll<HTMLElement>(".v7-mission-card"),
    ];
    expect(cards.length).toBeGreaterThan(1);
    for (const node of cards) expect(node.dataset.status).toBe("open");
    expect(window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(
      stored,
    );
    // Back in the normal game the real progress stands.
    requiredButton('[data-action="campaign-map"]').click();
    await settle();
    requiredButton('[data-action="front-back"]').click();
    await settle();
    await turnOffInSettings();
    requiredButton('[data-action="campaign"]').click();
    await settle();
    expect(
      document.querySelector<HTMLElement>(
        '.v7-campaign-plate[data-campaign="HUMANS"]',
      )?.dataset.status,
    ).toBe("done");
    expect(
      document.querySelector<HTMLElement>(
        '.v7-campaign-plate[data-campaign="CULT"]',
      )?.dataset.status,
    ).toBe("locked");
    expect(window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(
      stored,
    );
  });
});

describe("faction locks", () => {
  const lockedCards = (): (string | undefined)[] =>
    [
      ...document.querySelectorAll<HTMLElement>(
        '.v7-tribe-card[data-locked="true"]',
      ),
    ].map((node) => node.dataset.faction);

  it("grey Ice Folk, Candy and the Cultists until 4, 5 and 6 campaigns, saying how far along", async () => {
    for (const [count, locked, labels] of [
      [
        3,
        ["ICE_FOLK", "CANDY", "CULT"],
        [
          "Ice Folk, locked. Complete any 4 campaigns to unlock (3/4)",
          "Candy, locked. Complete any 5 campaigns to unlock (3/5)",
          "Cultists, locked. Complete any 6 campaigns to unlock (3/6)",
        ],
      ],
      [
        4,
        ["CANDY", "CULT"],
        [
          "Candy, locked. Complete any 5 campaigns to unlock (4/5)",
          "Cultists, locked. Complete any 6 campaigns to unlock (4/6)",
        ],
      ],
      [
        5,
        ["CULT"],
        ["Cultists, locked. Complete any 6 campaigns to unlock (5/6)"],
      ],
      [6, [], []],
    ] as const) {
      window.localStorage.clear();
      completeCampaigns(count);
      mount();
      await settle();
      await openNewGame();
      expect(lockedCards(), `${count} campaigns`).toEqual(locked);
      expect(
        locked.map((faction) => card(faction).getAttribute("aria-label")),
      ).toEqual(labels);
      for (const faction of locked) {
        expect(card(faction).getAttribute("aria-disabled")).toBe("true");
        expect(card(faction).querySelector(".v7-tribe-lock")).not.toBeNull();
      }
      expect(card("ORIGINAL").getAttribute("aria-disabled")).toBeNull();
    }
  });

  it("a tap on a locked tribe shows its tooltip and does not pick it; the hidden select refuses it too", async () => {
    completeCampaigns(2);
    mount();
    await settle();
    await openNewGame();
    const tip = required(
      document.querySelector<HTMLElement>('[data-v7-region="tribe-lock-tip"]'),
    );
    expect(tip.hidden).toBe(true);
    expect(tip.getAttribute("role")).toBe("tooltip");
    card("ICE_FOLK").click();
    expect(tip.hidden).toBe(false);
    expect(tip.textContent).toBe("Complete any 4 campaigns to unlock (2/4)");
    expect(card("ICE_FOLK").getAttribute("aria-describedby")).toBe(tip.id);
    expect(card("ICE_FOLK").getAttribute("aria-checked")).toBe("false");
    expect(card("ORIGINAL").getAttribute("aria-checked")).toBe("true");
    card("CULT").click();
    expect(tip.textContent).toBe("Complete any 6 campaigns to unlock (2/6)");
    // An open tribe is picked, and the tooltip goes.
    card("GOBLIN").click();
    await settle();
    expect(card("GOBLIN").getAttribute("aria-checked")).toBe("true");
    expect(
      required(
        document.querySelector<HTMLElement>(
          '[data-v7-region="tribe-lock-tip"]',
        ),
      ).hidden,
    ).toBe(true);
    // "Your faction" offers no locked faction, and a forced value is refused.
    const select = required(
      document.querySelector<HTMLSelectElement>("#v7-faction-0"),
    );
    expect(
      [...select.options]
        .filter((option) => option.disabled)
        .map((option) => option.value),
    ).toEqual(["ICE_FOLK", "CANDY", "CULT"]);
    select.value = "CANDY";
    select.dispatchEvent(new Event("change", { bubbles: true }));
    await settle();
    expect(card("CANDY").getAttribute("aria-checked")).toBe("false");
    expect(card("GOBLIN").getAttribute("aria-checked")).toBe("true");
  });

  it("every faction can be picked in developer mode; turned off, the new game leads an open faction", async () => {
    window.localStorage.setItem(DEV_MODE_STORAGE_KEY_V7, "1");
    const started = mount();
    await settle();
    await openNewGame();
    expect(lockedCards()).toEqual([]);
    card("CULT").click();
    await settle();
    expect(card("CULT").getAttribute("aria-checked")).toBe("true");
    requiredButton('[data-action="front-back"]').click();
    await settle();
    await turnOffInSettings();
    await openNewGame();
    expect(lockedCards()).toEqual(["ICE_FOLK", "CANDY", "CULT"]);
    expect(card("CULT").getAttribute("aria-checked")).toBe("false");
    expect(card("ORIGINAL").getAttribute("aria-checked")).toBe("true");
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => started.controller.snapshot().phase === "ACTIVE");
    const factions = started.controller.snapshot().view?.setup.factions ?? [];
    expect(factions[0]).toBe("ORIGINAL");
    // The opponents may still be any faction, locked ones included.
    expect(factions.length).toBeGreaterThan(1);
  });

  it("a saved game whose player leads a locked faction still loads and plays", async () => {
    window.localStorage.setItem(DEV_MODE_STORAGE_KEY_V7, "1");
    const first = mount();
    await settle();
    await openNewGame();
    card("CULT").click();
    await settle();
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    expect(first.controller.snapshot().view?.setup.factions[0]).toBe("CULT");
    first.destroy();
    app = null;
    // The normal game, Cult still locked: Continue resumes the match.
    window.localStorage.removeItem(DEV_MODE_STORAGE_KEY_V7);
    const second = mount();
    await waitUntil(
      () => document.querySelector('[data-action="resume"]') !== null,
    );
    requiredButton('[data-action="resume"]').click();
    await waitUntil(() => second.controller.snapshot().phase === "ACTIVE");
    expect(second.controller.snapshot().view?.setup.factions[0]).toBe("CULT");
  });
});
