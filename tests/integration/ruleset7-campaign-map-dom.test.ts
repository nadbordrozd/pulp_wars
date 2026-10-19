// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapRuleset7App } from "../../src/app/index";
import type * as CampaignsModule from "../../src/campaign/campaigns";
import type { CampaignIdV7 } from "../../src/campaign/campaigns";
import { CAMPAIGN_CHEAT_STORAGE_KEY_V7 } from "../../src/campaign/cheat-v7";
import { CAMPAIGN_PROGRESS_STORAGE_KEY_V7 } from "../../src/persistence/index";
import { fixtureLastMissionV7 } from "../fixtures/v7-campaign-graph";
import {
  AT,
  required,
  requiredButton,
  settle,
  waitUntil,
} from "./ruleset7-campaign-dom.shared";

// The faction campaigns built from fixture missions (Candy stays unbuilt):
// the real registry builds only the Humans so far (pulp_wars-hmyk.4), and
// the fixture keeps each campaign's real title.
vi.mock("../../src/campaign/campaigns", async (importOriginal) => {
  const original = await importOriginal<typeof CampaignsModule>();
  const { fixtureCampaignsV7 } = await import("../fixtures/v7-campaign-graph");
  return {
    ...original,
    CAMPAIGNS_V7: fixtureCampaignsV7(original.CAMPAIGNS_V7),
  };
});

/**
 * The campaign map (`pulp_wars-hmyk.3`, docs/product/CAMPAIGN.md section
 * 14): the unlock graph's states, locked against coming soon, a campaign's
 * mission list in order, and the testing cheat by taps, keys and address.
 */
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

/** Stores version 2 progress with these campaigns completed. */
function completedCampaigns(...ids: CampaignIdV7[]): void {
  window.localStorage.setItem(
    CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    JSON.stringify({
      format: "pulp-wars-campaign-progress",
      version: 2,
      campaigns: Object.fromEntries(
        ids.map((id) => [
          id,
          {
            completed: {
              [fixtureLastMissionV7(id)]: {
                firstWonAt: AT,
                bestRounds: 10,
                stars: 2,
              },
            },
          },
        ]),
      ),
    }),
  );
}

async function openMap(): Promise<void> {
  requiredButton('[data-action="campaign"]').click();
  await settle();
}

function plates(): Record<string, string | undefined> {
  return Object.fromEntries(
    [...document.querySelectorAll<HTMLElement>(".v7-campaign-plate")].map(
      (plate) => [plate.dataset.campaign, plate.dataset.status],
    ),
  );
}

function plate(id: string): HTMLButtonElement {
  return requiredButton(`[data-action="campaign-open-${id.toLowerCase()}"]`);
}

function links(): (string | undefined)[] {
  return [...document.querySelectorAll<HTMLElement>(".v7-campaign-link")].map(
    (link) => link.dataset.open,
  );
}

function tapTitle(times: number): void {
  for (let index = 0; index < times; index += 1)
    required(document.querySelector<HTMLElement>("#v7-front-title")).click();
}

describe("Ruleset 7 campaign map", () => {
  it("shows the prologue apart and three tiers joined by lines; the openers open, the rest locked", async () => {
    const app = bootstrapRuleset7App(document);
    await openMap();
    const map = required(
      document.querySelector<HTMLElement>("[data-v7-region='campaign-map']"),
    );
    expect(
      [
        ...map.querySelectorAll<HTMLElement>(
          ".v7-campaign-prologue .v7-campaign-plate",
        ),
      ].map((node) => node.dataset.campaign),
    ).toEqual(["FRONTIER"]);
    expect(
      [...map.querySelectorAll<HTMLElement>(".v7-campaign-tier")].map(
        (tier) => [
          tier.getAttribute("aria-label"),
          [...tier.querySelectorAll<HTMLElement>(".v7-campaign-plate")].map(
            (node) => node.dataset.campaign,
          ),
        ],
      ),
    ).toEqual([
      ["First campaigns", ["HUMANS", "UNDEAD"]],
      ["Second campaigns", ["DINOSAURS", "MARTIANS", "GOBLINS", "DWARVES"]],
      ["Last campaigns", ["ICE_FOLK", "CULT", "CANDY"]],
    ]);
    expect(plates()).toEqual({
      FRONTIER: "open",
      HUMANS: "open",
      UNDEAD: "open",
      DINOSAURS: "locked",
      MARTIANS: "locked",
      GOBLINS: "locked",
      DWARVES: "locked",
      ICE_FOLK: "locked",
      CULT: "locked",
      CANDY: "soon",
    });
    // Every plate above a gate joins its knot, which fans out below.
    expect(links()).toEqual(["false", "false"]);
    const firstLink = required(
      document.querySelector<HTMLElement>(".v7-campaign-link"),
    );
    expect(
      firstLink.querySelectorAll('svg[data-layout="wide"] line'),
    ).toHaveLength(2 + 4);
    expect(
      firstLink.querySelectorAll('svg[data-layout="narrow"] line'),
    ).toHaveLength(2 + 2);
    expect(firstLink.textContent).toBe("Finish both");
    expect(document.querySelectorAll(".v7-campaign-link")[1]?.textContent).toBe(
      "Finish all 4",
    );
    // Locked says what to finish; coming soon says so; both are greyed.
    expect(plate("DINOSAURS").getAttribute("aria-label")).toBe(
      "The Dinosaur Campaign, Locked: finish Humans and Undead",
    );
    expect(plate("CULT").getAttribute("aria-label")).toBe(
      "The Cultist Campaign, Locked: finish Dinosaurs, Martians, Goblins and Dwarves",
    );
    expect(plate("CANDY").getAttribute("aria-label")).toBe(
      "The Candy Campaign, Coming soon",
    );
    expect(plate("DINOSAURS").textContent).toContain("Locked");
    expect(plate("CANDY").textContent).toContain("Coming soon");
    for (const id of ["DINOSAURS", "CANDY"]) {
      expect(plate(id).getAttribute("aria-disabled")).toBe("true");
      expect(
        plate(id).querySelector('.v7-campaign-lock[data-icon="lock"]'),
      ).not.toBeNull();
    }
    expect(plate("HUMANS").getAttribute("aria-disabled")).toBeNull();
    expect(plate("HUMANS").getAttribute("aria-label")).toBe(
      "The Marshal's Law, open, 0 of 2 missions won",
    );
    // A tap on a closed plate says why and opens nothing.
    plate("DINOSAURS").click();
    await settle();
    expect(document.querySelector(".v7-mission-card")).toBeNull();
    expect(
      document.querySelector("[data-v7-region='campaign-note']")?.textContent,
    ).toBe("The Dinosaur Campaign opens when you finish Humans and Undead.");
    // The note stands under the tapped plate's row.
    expect(
      document
        .querySelector<HTMLElement>("[data-v7-region='campaign-note']")
        ?.previousElementSibling?.getAttribute("data-tier"),
    ).toBe("2");
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-open-dinosaurs",
    );
    plate("CANDY").click();
    await settle();
    expect(
      document.querySelector("[data-v7-region='campaign-note']")?.textContent,
    ).toBe("The Candy Campaign: coming soon.");
    app.destroy();
  });

  it("opens the middle four once both openers are completed, and the last three after all four", async () => {
    completedCampaigns("HUMANS");
    const one = bootstrapRuleset7App(document);
    await openMap();
    expect(plates()).toMatchObject({ HUMANS: "done", DINOSAURS: "locked" });
    expect(plate("DINOSAURS").getAttribute("aria-label")).toBe(
      "The Dinosaur Campaign, Locked: finish Undead",
    );
    expect(document.querySelector(".v7-campaign-link")?.textContent).toBe(
      "Finish both · 1/2",
    );
    expect(plate("HUMANS").getAttribute("aria-label")).toBe(
      "The Marshal's Law, completed, 1 of 2 stars",
    );
    one.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    completedCampaigns("HUMANS", "UNDEAD");
    const two = bootstrapRuleset7App(document);
    await openMap();
    expect(plates()).toEqual({
      FRONTIER: "open",
      HUMANS: "done",
      UNDEAD: "done",
      DINOSAURS: "open",
      MARTIANS: "open",
      GOBLINS: "open",
      DWARVES: "open",
      ICE_FOLK: "locked",
      CULT: "locked",
      CANDY: "soon",
    });
    expect(links()).toEqual(["true", "false"]);
    two.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    completedCampaigns(
      "HUMANS",
      "UNDEAD",
      "DINOSAURS",
      "MARTIANS",
      "GOBLINS",
      "DWARVES",
    );
    const all = bootstrapRuleset7App(document);
    await openMap();
    expect(plates()).toMatchObject({
      ICE_FOLK: "open",
      CULT: "open",
      CANDY: "soon",
    });
    expect(links()).toEqual(["true", "true"]);
    all.destroy();
  });

  it("lists an open campaign's missions in order, unlocking them one by one", async () => {
    const app = bootstrapRuleset7App(document);
    await openMap();
    plate("HUMANS").click();
    await settle();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-map",
    );
    expect(document.querySelector(".v7-campaign-title")?.textContent).toBe(
      "The Marshal's Law",
    );
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-mission-card")].map(
        (card) => [card.dataset.missionId, card.dataset.status],
      ),
    ).toEqual([
      ["TEST_GROUNDS", "open"],
      ["TEST_RUSH", "locked"],
    ]);
    // No faction roster: this campaign unlocks no faction.
    expect(document.querySelector(".v7-campaign-roster")).toBeNull();
    requiredButton('[data-action="mission-test_grounds"]').click();
    await settle();
    expect(
      document.querySelector<HTMLElement>("[data-v7-region='briefing']")
        ?.dataset.missionId,
    ).toBe("TEST_GROUNDS");
    requiredButton('[data-action="campaign-back"]').click();
    await settle();
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(2);
    requiredButton('[data-action="campaign-map"]').click();
    await settle();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-open-humans",
    );
    app.destroy();
  });

  it("seven quick taps of the title unlock every mission, shown by a badge and remembered; again turns it off", async () => {
    const app = bootstrapRuleset7App(document);
    await openMap();
    tapTitle(6);
    await settle();
    expect(
      document.querySelector('[data-action="campaign-cheat-off"]'),
    ).toBeNull();
    tapTitle(1);
    await settle();
    const badge = requiredButton('[data-action="campaign-cheat-off"]');
    expect(badge.textContent).toBe("All missions unlocked");
    expect(window.localStorage.getItem(CAMPAIGN_CHEAT_STORAGE_KEY_V7)).toBe(
      "1",
    );
    expect(plates()).toEqual({
      FRONTIER: "open",
      HUMANS: "open",
      UNDEAD: "open",
      DINOSAURS: "open",
      MARTIANS: "open",
      GOBLINS: "open",
      DWARVES: "open",
      ICE_FOLK: "open",
      CULT: "open",
      CANDY: "soon",
    });
    // Every mission of a campaign that was locked can be picked.
    plate("CULT").click();
    await settle();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-mission-card")].map(
        (card) => card.dataset.status,
      ),
    ).toEqual(["open", "open"]);
    // The badge stays on every campaign screen.
    expect(
      document.querySelector('[data-action="campaign-cheat-off"]'),
    ).not.toBeNull();
    requiredButton('[data-action="mission-test_guard_raid"]').click();
    await settle();
    const start = requiredButton('[data-action="campaign-start"]');
    expect(start.disabled).toBe(false);
    // Seven more taps turn it off.
    tapTitle(7);
    await settle();
    expect(
      document.querySelector('[data-action="campaign-cheat-off"]'),
    ).toBeNull();
    expect(
      window.localStorage.getItem(CAMPAIGN_CHEAT_STORAGE_KEY_V7),
    ).toBeNull();
    expect(requiredButton('[data-action="campaign-start"]').disabled).toBe(
      true,
    );
    app.destroy();
  });

  it("typing 'pulpwars' toggles it, and the badge turns it off", async () => {
    const app = bootstrapRuleset7App(document);
    await openMap();
    for (const key of "pulpwars")
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true }),
      );
    await settle();
    expect(
      document.querySelector('[data-action="campaign-cheat-off"]'),
    ).not.toBeNull();
    expect(plates().DINOSAURS).toBe("open");
    requiredButton('[data-action="campaign-cheat-off"]').click();
    await settle();
    expect(
      document.querySelector('[data-action="campaign-cheat-off"]'),
    ).toBeNull();
    expect(plates().DINOSAURS).toBe("locked");
    app.destroy();
  });

  it("?campaign-cheat=1 in the address turns it on, and =0 off", async () => {
    window.history.replaceState(null, "", "/?campaign-cheat=1");
    const on = bootstrapRuleset7App(document);
    await openMap();
    expect(
      document.querySelector('[data-action="campaign-cheat-off"]'),
    ).not.toBeNull();
    expect(plates().CULT).toBe("open");
    on.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    window.history.replaceState(null, "", "/?campaign-cheat=0");
    const off = bootstrapRuleset7App(document);
    await openMap();
    expect(
      document.querySelector('[data-action="campaign-cheat-off"]'),
    ).toBeNull();
    expect(
      window.localStorage.getItem(CAMPAIGN_CHEAT_STORAGE_KEY_V7),
    ).toBeNull();
    off.destroy();
  });

  it("with the cheat, a mission of a locked campaign starts", async () => {
    window.localStorage.setItem(CAMPAIGN_CHEAT_STORAGE_KEY_V7, "1");
    const app = bootstrapRuleset7App(document);
    await openMap();
    plate("DWARVES").click();
    await settle();
    requiredButton('[data-action="mission-test_survive"]').click();
    await settle();
    requiredButton('[data-action="campaign-start"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(app.controller.snapshot().view?.setup).toMatchObject({
      mapType: "MISSION",
      mission: { id: "TEST_SURVIVE" },
    });
    app.destroy();
  });
});
