// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type Ruleset7BrowserSnapshot,
  type Ruleset7CampaignProgressV7,
} from "../../src/app/index";
import {
  NO_ANALYTICS_V7,
  type GameAnalyticsV7,
} from "../../src/app/analytics-v7";
import { CHAPTER_HUMANS_V7 } from "../../src/campaign/chapter-humans";
import {
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  SAVE_STORAGE_KEY_V7,
  viewForV7,
  type FactionIdV7,
  type MatchOutcomeV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
  LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
} from "../../src/persistence/index";
import type { BoardHostV7 } from "../../src/render/canvas/board-host-v7";
import {
  missionOutcomeLineV7,
  missionStarGoalsV7,
} from "../../src/render/mission-presentation-v7";
import {
  RETRY_MISSION_DETAIL_V7,
  RETRY_MISSION_QUESTION_V7,
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { TUTORIAL_MISSION_ID_V7 } from "../../src/render/tutorial-v7";
import {
  won,
  seedLegacyProgress,
  seedProgress,
  settle,
  waitUntil,
  requiredButton,
  required,
} from "./ruleset7-campaign-dom.shared";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

async function openCampaign(): Promise<void> {
  requiredButton('[data-action="campaign"]').click();
  await settle();
}

/** The campaign map, then the Humans' mission list (pulp_wars-hmyk.3). */
async function openHumans(): Promise<void> {
  await openCampaign();
  requiredButton('[data-action="campaign-open-humans"]').click();
  await settle();
}

describe("Ruleset 7 campaign front screen", () => {
  it("opens from the main menu's Campaign button; Menu returns, keeping focus", async () => {
    const app = bootstrapRuleset7App(document);
    expect(document.querySelector(".v7-main-menu")).not.toBeNull();
    expect(document.querySelector("[data-v7-campaign]")).toBeNull();
    // The old Skirmish / Campaign switch is gone: the menu has both.
    expect(
      document.querySelector('[role="group"][aria-label="Game mode"]'),
    ).toBeNull();
    await openCampaign();
    expect(document.querySelector(".v7-main-menu")).toBeNull();
    expect(document.querySelector("[data-v7-setup]")).toBeNull();
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "front-back",
    );
    expect(document.querySelector("#v7-front-title")?.textContent).toBe(
      "Campaign",
    );
    // The campaign map (pulp_wars-hmyk.3): no prologue (retired by
    // pulp_wars-hmyk.22), the Humans and the Undead campaigns open
    // (pulp_wars-hmyk.4, .5), the Martians, the Goblins and the
    // Dwarves locked behind both first campaigns (pulp_wars-hmyk.7,
    // pulp_wars-hmyk.8, pulp_wars-hmyk.9), the Ice Folk, the Cult and Candy
    // locked behind the middle four (pulp_wars-hmyk.10, pulp_wars-hmyk.12,
    // pulp_wars-hmyk.11).
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-campaign-plate")].map(
        (plate) => [plate.dataset.campaign, plate.dataset.status],
      ),
    ).toEqual([
      ["HUMANS", "open"],
      ["UNDEAD", "open"],
      ["DINOSAURS", "locked"],
      ["MARTIANS", "locked"],
      ["GOBLINS", "locked"],
      ["DWARVES", "locked"],
      ["ICE_FOLK", "locked"],
      ["CULT", "locked"],
      ["CANDY", "locked"],
    ]);
    expect(document.querySelector(".v7-campaign-prologue")).toBeNull();
    expect(
      document.querySelector('[data-action="campaign-open-frontier"]'),
    ).toBeNull();
    expect(
      document
        .querySelector('[data-action="campaign-open-humans"]')
        ?.getAttribute("aria-label"),
    ).toBe("The Marshal's Law, open, 0 of 6 missions won");
    expect(
      document
        .querySelector('[data-action="campaign-open-undead"]')
        ?.getAttribute("aria-label"),
    ).toBe("The Long Sleep, open, 0 of 6 missions won");
    expect(
      document
        .querySelector('[data-action="campaign-open-martians"]')
        ?.getAttribute("aria-label"),
    ).toBe("Signal from Home, Locked: finish Humans and Undead");
    expect(
      document
        .querySelector('[data-action="campaign-open-goblins"]')
        ?.getAttribute("aria-label"),
    ).toBe("The Big Score, Locked: finish Humans and Undead");
    expect(
      document
        .querySelector('[data-action="campaign-open-dwarves"]')
        ?.getAttribute("aria-label"),
    ).toBe("The Bottomless, Locked: finish Humans and Undead");
    expect(
      document
        .querySelector('[data-action="campaign-open-ice_folk"]')
        ?.getAttribute("aria-label"),
    ).toBe(
      "The Long Winter, Locked: finish Dinosaurs, Martians, Goblins and Dwarves",
    );
    expect(
      document
        .querySelector('[data-action="campaign-open-cult"]')
        ?.getAttribute("aria-label"),
    ).toBe(
      "The Long Night, Locked: finish Dinosaurs, Martians, Goblins and Dwarves",
    );
    expect(
      document
        .querySelector('[data-action="campaign-open-candy"]')
        ?.getAttribute("aria-label"),
    ).toBe(
      "Sweet Dreams, Locked: finish Dinosaurs, Martians, Goblins and Dwarves",
    );
    requiredButton('[data-action="campaign-open-humans"]').click();
    await settle();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-map",
    );
    expect(document.querySelector(".v7-campaign-title")?.textContent).toBe(
      "The Marshal's Law",
    );
    expect(document.querySelector(".v7-campaign-kicker")?.textContent).toBe(
      "Steele against the Baron",
    );
    // Six missions, every one built: none says "Coming soon".
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(6);
    expect(
      document.querySelectorAll('.v7-mission-card[data-status="soon"]'),
    ).toHaveLength(0);
    // Campaigns returns to the map, on the campaign's plate.
    requiredButton('[data-action="campaign-map"]').click();
    await settle();
    expect(document.querySelector(".v7-mission-card")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-open-humans",
    );
    requiredButton('[data-action="front-back"]').click();
    await settle();
    expect(document.querySelector("[data-v7-campaign]")).toBeNull();
    expect(document.querySelector(".v7-main-menu")).not.toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign",
    );
    app.destroy();
  });

  it("shows each mission's state, emblems and accessible name from stored progress", async () => {
    seedProgress({ HUMAN_1: { ...won(14), stars: 2 } });
    const app = bootstrapRuleset7App(document);
    await openHumans();
    const cards = [
      ...document.querySelectorAll<HTMLButtonElement>(".v7-mission-card"),
    ];
    expect(cards.map((card) => card.dataset.status)).toEqual([
      "done",
      "open",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "Mission 1, Thaw at Northwatch, Conquest, done, 2 of 3 stars, best 14 turns",
      "Mission 2, The Lord Protector's Writ, Capture, open",
      "Mission 3, Outlaws of the Greenwood, Escort, locked",
      "Mission 4, The Siege of Fort Hollow, Hold out, locked",
      "Mission 5, Broadsides at Saltmarsh, Hunt, locked",
      "Mission 6, Kessler Hall, Capture, locked",
    ]);
    expect(cards[0]?.textContent).toContain("Best: 14 turns");
    expect(cards[1]?.textContent).toContain("Open");
    expect(cards[2]?.textContent).toContain("Win the previous mission");
    expect(cards[5]?.textContent).toContain("Win the previous mission");
    expect(cards.some((card) => card.textContent.includes("Coming soon"))).toBe(
      false,
    );
    // Stars: only on a mission that is won, filled as far as they were won.
    expect(
      cards.map((card) => {
        const stars = card.querySelector<HTMLElement>(".v7-mission-stars");
        return stars === null
          ? null
          : [
              stars.dataset.stars,
              stars.getAttribute("aria-label"),
              stars.querySelectorAll('[data-icon="star"]').length,
              stars.querySelectorAll('[data-icon="star-outline"]').length,
            ];
      }),
    ).toEqual([
      ["2", "2 of 3 stars", 2, 1],
      ...Array.from({ length: 5 }, () => null),
    ]);
    // No mission unlocks a faction any more (pulp_wars-hmyk.22).
    expect(document.querySelector(".v7-mission-unlock")).toBeNull();
    // A mission still to come opens nothing.
    expect(cards[4]?.getAttribute("aria-disabled")).toBe("true");
    cards[4]?.click();
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    // Emblems: you lead, your ally, "vs", then the opponents.
    expect(
      cards.map((card) =>
        [
          ...card.querySelectorAll<HTMLElement>(
            ".v7-mission-sides .v7-faction-emblem",
          ),
        ].map((emblem) => emblem.dataset.faction),
      ),
    ).toEqual([
      ["ORIGINAL", "UNDEAD"],
      ["ORIGINAL", "GOBLIN"],
      ["ORIGINAL", "GOBLIN", "DINOSAUR"],
      // An ally stands on your side of "vs".
      ["ORIGINAL", "UNDEAD", "CULT", "ICE_FOLK"],
      ["ORIGINAL", "GOBLIN"],
      ["ORIGINAL", "GOBLIN", "DINOSAUR", "CULT"],
    ]);
    // A locked card stays focusable but opens nothing.
    expect(cards[2]?.disabled).toBe(false);
    expect(cards[2]?.getAttribute("aria-disabled")).toBe("true");
    cards[2]?.click();
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    // No faction roster: every faction is open from the start.
    expect(document.querySelector(".v7-campaign-roster")).toBeNull();
    expect(document.querySelector(".v7-campaign-faction")).toBeNull();
    app.destroy();
  });

  it("keeps the way back, the cards and the briefing in keyboard reading order", async () => {
    const app = bootstrapRuleset7App(document);
    await openHumans();
    const order = focusables().map(
      (node) => node.getAttribute("data-action") ?? node.tagName.toLowerCase(),
    );
    // Gallery and Settings are on the main menu (pulp_wars-2yc.18).
    expect(order).toEqual([
      "front-back",
      "campaign-map",
      "mission-human_1",
      "mission-human_2",
      "mission-human_3",
      "mission-human_4",
      "mission-human_5",
      "mission-human_6",
    ]);
    app.destroy();
  });

  it("opens the briefing with focus on its heading, and Back returns focus to the card", async () => {
    const app = bootstrapRuleset7App(document);
    await openHumans();
    requiredButton('[data-action="mission-human_1"]').click();
    await settle();
    const briefing = required(
      document.querySelector<HTMLElement>("[data-v7-region='briefing']"),
    );
    const entry = required(CHAPTER_HUMANS_V7.missions[0]);
    expect(document.activeElement?.id).toBe("v7-briefing-title");
    expect(briefing.querySelector("h2")?.textContent).toBe(
      "Thaw at Northwatch",
    );
    expect(briefing.querySelector(".v7-campaign-story")?.textContent).toBe(
      entry.briefing,
    );
    expect(briefing.querySelector(".v7-briefing-kicker")?.textContent).toBe(
      "Mission 1 · Conquest",
    );
    const objective = required(
      briefing.querySelector<HTMLElement>(".v7-briefing-objective"),
    );
    expect(objective.textContent).toBe(
      "ObjectiveTake the barrow and its camp by turn 20.",
    );
    expect(objective.dataset.objective).toBe("domination");
    expect(objective.querySelector("svg")?.dataset.icon).toBe("attack");
    // What the three stars are for.
    expect(
      [...briefing.querySelectorAll(".v7-mission-goal")].map(
        (goal) => goal.textContent,
      ),
    ).toEqual(["Win the mission", "Win by turn 14", "Lose no city"]);
    // No mission unlocks a faction (pulp_wars-hmyk.22).
    expect(
      briefing.querySelector("[data-v7-region='briefing-unlock']"),
    ).toBeNull();
    expect(
      [...briefing.querySelectorAll(".v7-briefing-hints li")].map(
        (hint) => hint.textContent,
      ),
    ).toEqual(entry.hints);
    expect(briefing.querySelector(".v7-briefing-size")?.textContent).toBe(
      "11 × 11",
    );
    expect(briefing.querySelector(".v7-briefing-opponent")?.textContent).toBe(
      "vsUndead",
    );
    expect(briefing.querySelector("#v7-campaign-faction")).toBeNull();
    expect(briefing.querySelector(".v7-briefing-lead-text")?.textContent).toBe(
      "You leadHuman",
    );
    expect(
      focusables().map((node) => node.getAttribute("data-action")),
    ).toEqual([
      "front-back",
      // pulp_wars-q6cc: the difficulty, Normal or Easy.
      "campaign-difficulty-normal",
      "campaign-difficulty-easy",
      "campaign-start",
      "campaign-back",
    ]);
    // Escape steps back from the briefing to its card, then to the menu.
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "mission-human_1",
    );
    requiredButton('[data-action="mission-human_1"]').click();
    await settle();
    requiredButton('[data-action="campaign-back"]').click();
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "mission-human_1",
    );
    // Escape from the list goes to the campaign map, then to the menu.
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(
      document.querySelector("[data-v7-region='campaign-map']"),
    ).not.toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-open-humans",
    );
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(document.querySelector(".v7-main-menu")).not.toBeNull();
    app.destroy();
  });

  it("keeps the retired prologue's stored wins out of sight: the map is as fresh", async () => {
    // pulp_wars-hmyk.22: a profile that played the Hollow Frontier (version
    // 1 progress, all ten won) sees the nine campaigns as a new one does.
    seedLegacyProgress(
      Object.fromEntries(
        Array.from({ length: 10 }, (_, index) => [
          `FRONTIER_${String(index + 1)}`,
          { ...won(12), stars: 3 },
        ]),
      ),
    );
    const app = bootstrapRuleset7App(document);
    await openCampaign();
    expect(document.querySelector(".v7-campaign-recovery")).toBeNull();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-campaign-plate")].map(
        (plate) => [plate.dataset.campaign, plate.dataset.status],
      ),
    ).toEqual([
      ["HUMANS", "open"],
      ["UNDEAD", "open"],
      ["DINOSAURS", "locked"],
      ["MARTIANS", "locked"],
      ["GOBLINS", "locked"],
      ["DWARVES", "locked"],
      ["ICE_FOLK", "locked"],
      ["CULT", "locked"],
      ["CANDY", "locked"],
    ]);
    expect(
      document
        .querySelector('[data-action="campaign-open-humans"]')
        ?.getAttribute("aria-label"),
    ).toBe("The Marshal's Law, open, 0 of 6 missions won");
    app.destroy();
  });

  it("starts a mission; Settings and the resume screen name the mission, not the seed", async () => {
    const app = bootstrapRuleset7App(document);
    await openHumans();
    requiredButton('[data-action="mission-human_1"]').click();
    await settle();
    requiredButton('[data-action="campaign-start"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    const view = required(app.controller.snapshot().view);
    expect(view.setup).toMatchObject({
      mapType: "MISSION",
      mission: { id: "HUMAN_1" },
      factions: ["ORIGINAL", "UNDEAD"],
    });
    expect(view.turnOrder[view.activeSeatIndex]).toBe(view.humanPlayerId);
    // The objective tracker of the top bar.
    const tracker = required(
      document.querySelector<HTMLElement>(
        "[data-v7-region='hud'] [data-v7-region='mission-tracker']",
      ),
    );
    expect(tracker.dataset.missionId).toBe("HUMAN_1");
    expect(tracker.textContent).toBe(
      "Take the barrow and its camp by turn 20.20 turns",
    );
    expect(tracker.getAttribute("aria-label")).toBe(
      "Objective: Take the barrow and its camp by turn 20. 20 turns left.",
    );
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="settings"]').click();
    expect(document.querySelector(".v7-mission-label")?.textContent).toBe(
      "Mission: Thaw at Northwatch",
    );
    expect(document.querySelector(".v7-mission-objective")?.textContent).toBe(
      "Objective: Take the barrow and its camp by turn 20.",
    );
    expect(document.querySelector(".v7-map-seed")).toBeNull();
    requiredButton('[data-action="close-overlay"]').click();
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="main-menu"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(document.querySelector(".v7-resume-summary")?.textContent).toBe(
      "Mission 1 · Thaw at Northwatch · Turn 1",
    );
    // A mission started from the menu's Campaign replaces the saved one.
    requiredButton('[data-action="campaign"]').click();
    await settle();
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
    requiredButton('[data-action="campaign-open-humans"]').click();
    await settle();
    requiredButton('[data-action="mission-human_1"]').click();
    await settle();
    requiredButton('[data-action="campaign-start"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    expect(document.querySelector("#v7-alert")?.textContent ?? "").toBe("");
    app.destroy();
  });
});

describe("Ruleset 7 mission dialogs", () => {
  it("Defeat: Mission failed, Retry mission restarts the same setup, Campaign returns to the list", async () => {
    const fake = new FakeController(
      completeView("HUMAN_1", "ORIGINAL", (view) => ({
        kind: "DEFEAT",
        humanId: view.humanPlayerId,
        defeatedByPlayerId: required(
          view.turnOrder.find((id) => id !== view.humanPlayerId),
        ),
      })),
    );
    const view = mount(fake);
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.dataset.outcome).toBe("defeat");
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission failed");
    expect(
      dialog.querySelector("[data-v7-region='mission-cause']")?.textContent,
    ).toBe("Your last city fell.");
    // A defeat shows no stars.
    expect(dialog.querySelector(".v7-mission-stars")).toBeNull();
    expect(dialog.querySelector(".v7-mission-goals")).toBeNull();
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Retry mission", "Campaign", "Main menu"]);
    // Bead pulp_wars-hmyk.24: Retry mission is the first, primary action.
    expect(
      requiredButton('[data-action="mission-retry"]').classList.contains(
        "primary-action",
      ),
    ).toBe(true);
    requiredButton('[data-action="mission-retry"]').click();
    await settle();
    expect(fake.calls).toEqual(["restart"]);
    requiredButton('[data-action="campaign-menu"]').click();
    await settle();
    expect(fake.calls).toEqual(["restart", "deleteStoredSave"]);
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    view.destroy();
  });

  it("Main menu on a mission's end dialog leaves for the title screen", async () => {
    for (const outcome of ["VICTORY", "DEFEAT"] as const) {
      const fake = new FakeController(
        completeView("HUMAN_1", "ORIGINAL", (view) =>
          outcome === "VICTORY"
            ? { kind: "VICTORY", winnerId: view.humanPlayerId }
            : {
                kind: "DEFEAT",
                humanId: view.humanPlayerId,
                defeatedByPlayerId: required(
                  view.turnOrder.find((id) => id !== view.humanPlayerId),
                ),
              },
        ),
      );
      const view = mount(fake);
      const menu = requiredButton(
        "[data-v7-region='results'] [data-action=\"results-menu\"]",
      );
      expect(menu.textContent).toBe("Main menu");
      menu.click();
      await settle();
      // The finished mission leaves the save slot, like Campaign does.
      expect(fake.calls).toEqual(["deleteStoredSave"]);
      expect(document.querySelector("[data-v7-region='results']")).toBeNull();
      expect(document.querySelector("[data-v7-campaign]")).toBeNull();
      expect(document.querySelector(".v7-main-menu")).not.toBeNull();
      expect(document.querySelector('[data-action="resume"]')).toBeNull();
      // The menu's first button: the Tutorial, on a profile that has
      // never played (`pulp_wars-0yxy`).
      expect(document.activeElement?.getAttribute("data-action")).toBe(
        "tutorial",
      );
      view.destroy();
    }
  });

  it("Victory: why, the stars with what each was for, the debrief, Next mission and Replay mission", async () => {
    const fake = new FakeController(
      completeView("HUMAN_2", "ORIGINAL", (view) => ({
        kind: "VICTORY",
        winnerId: view.humanPlayerId,
        cause: "PLACES_CAPTURED",
      })),
    );
    const view = mount(fake);
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.dataset.outcome).toBe("victory");
    expect(dialog.getAttribute("role")).toBe("dialog");
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission complete");
    expect(
      dialog.querySelector("[data-v7-region='mission-cause']")?.textContent,
    ).toBe("Mudford Toll and Halfway Toll and Kingsgate are yours.");
    // Round 1 with every own city: all three stars.
    const stars = required(
      dialog.querySelector<HTMLElement>(".v7-mission-stars"),
    );
    expect(stars.dataset.stars).toBe("3");
    expect(stars.getAttribute("aria-label")).toBe("3 of 3 stars");
    expect(
      [...dialog.querySelectorAll<HTMLElement>(".v7-mission-goal")].map(
        (goal) => [goal.textContent, goal.dataset.met],
      ),
    ).toEqual([
      ["Win the mission", "true"],
      ["Win by turn 22", "true"],
      ["Lose no city", "true"],
    ]);
    expect(dialog.querySelector(".v7-campaign-story")?.textContent).toBe(
      required(CHAPTER_HUMANS_V7.missions[1]).closing,
    );
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Next mission", "Replay mission", "Campaign", "Main menu"]);
    // Bead pulp_wars-hmyk.24: Next mission stays first; Replay is secondary.
    expect(
      requiredButton('[data-action="campaign-next"]').classList.contains(
        "primary-action",
      ),
    ).toBe(true);
    expect(
      requiredButton('[data-action="mission-replay"]').classList.contains(
        "primary-action",
      ),
    ).toBe(false);
    expect(document.querySelector('[data-action="mission-retry"]')).toBeNull();
    requiredButton('[data-action="mission-replay"]').click();
    await settle();
    expect(fake.calls).toEqual(["restart"]);
    view.destroy();
  });

  it("Victory names the campaigns the win opened; Campaign returns to the mission's own list", async () => {
    const fake = new FakeController(
      completeView("HUMAN_2", "ORIGINAL", (view) => ({
        kind: "VICTORY",
        winnerId: view.humanPlayerId,
        cause: "PLACES_CAPTURED",
      })),
      {
        status: "OK",
        completed: { HUMAN_1: won(), HUMAN_2: won() },
        lastWin: {
          missionId: "HUMAN_2",
          firstWin: true,
          opened: ["DINOSAURS", "MARTIANS", "GOBLINS", "DWARVES"],
        },
        diagnostic: null,
      },
    );
    const view = mount(fake);
    const opened = required(
      document.querySelector<HTMLElement>("[data-v7-region='campaign-opened']"),
    );
    expect(opened.textContent).toBe(
      "New campaigns: Dinosaurs, Martians, Goblins and Dwarves",
    );
    expect(opened.getAttribute("role")).toBe("status");
    requiredButton('[data-action="campaign-menu"]').click();
    await settle();
    expect(
      document.querySelector<HTMLElement>(".v7-campaign-chapter")?.dataset
        .v7Campaign,
    ).toBe("HUMANS");
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(6);
    view.destroy();
  });

  it("Victory names a faction the win unlocked for a new game, outside developer mode (pulp_wars-5xki)", () => {
    const progress: Ruleset7CampaignProgressV7 = {
      status: "OK",
      completed: { HUMAN_6: won() },
      lastWin: {
        missionId: "HUMAN_6",
        firstWin: true,
        opened: ["ICE_FOLK"],
        factions: ["ICE_FOLK"],
      },
      diagnostic: null,
    };
    const victory = (view: PlayerViewV7): MatchOutcomeV7 => ({
      kind: "VICTORY",
      winnerId: view.humanPlayerId,
      cause: "PLACES_CAPTURED",
    });
    const view = mount(
      new FakeController(
        completeView("HUMAN_6", "ORIGINAL", victory),
        progress,
      ),
    );
    const line = required(
      document.querySelector<HTMLElement>(
        "[data-v7-region='faction-unlocked']",
      ),
    );
    expect(line.textContent).toBe("New faction unlocked: Ice Folk");
    expect(line.dataset.faction).toBe("ICE_FOLK");
    expect(line.getAttribute("role")).toBe("status");
    expect(
      document.querySelector("[data-v7-region='dev-progress-note']"),
    ).toBeNull();
    view.destroy();
    // Developer mode (pulp_wars-6o5t): a win the controller recorded (the
    // normal game had the mission open) gets the normal game's notices.
    window.history.replaceState(null, "", "/?dev=1");
    document.body.innerHTML = '<div id="app"></div>';
    try {
      const recorded = mount(
        new FakeController(
          completeView("HUMAN_6", "ORIGINAL", victory),
          progress,
        ),
      );
      expect(
        document.querySelector("[data-v7-region='faction-unlocked']"),
      ).not.toBeNull();
      expect(
        document.querySelector("[data-v7-region='dev-progress-note']"),
      ).toBeNull();
      recorded.destroy();
      // A win it did not record (only developer mode opened the mission):
      // one clearly visible line says so in place of the notices.
      document.body.innerHTML = '<div id="app"></div>';
      const dev = mount(
        new FakeController(completeView("HUMAN_6", "ORIGINAL", victory), {
          ...progress,
          lastWin: null,
        }),
      );
      expect(
        document.querySelector("[data-v7-region='faction-unlocked']"),
      ).toBeNull();
      expect(
        document.querySelector("[data-v7-region='campaign-opened']"),
      ).toBeNull();
      const note = required(
        document.querySelector<HTMLElement>(
          "[data-v7-region='dev-progress-note']",
        ),
      );
      expect(note.textContent).toBe("Developer mode: not saved to progress");
      expect(note.classList.contains("v7-dev-progress-note")).toBe(true);
      expect(note.getAttribute("role")).toBe("status");
      dev.destroy();
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("Victory says a win the storage refused was not saved (pulp_wars-6o5t)", () => {
    const victory = (view: PlayerViewV7): MatchOutcomeV7 => ({
      kind: "VICTORY",
      winnerId: view.humanPlayerId,
      cause: "ESCORT_ARRIVED",
    });
    const unsaved = (missionId: string): Ruleset7CampaignProgressV7 => ({
      status: "OK",
      completed: {},
      lastWin: null,
      diagnostic: "Unable to write campaign progress: QuotaExceededError",
      unsavedWin: missionId,
    });
    const view = mount(
      new FakeController(
        completeView("GOBLIN_6", "GOBLIN", victory),
        unsaved("GOBLIN_6"),
      ),
    );
    const line = required(
      document.querySelector<HTMLElement>(
        "[data-v7-region='campaign-unsaved']",
      ),
    );
    expect(line.textContent).toBe(
      "This win couldn't be saved in this browser, so the campaign won't show it.",
    );
    expect(line.getAttribute("role")).toBe("status");
    view.destroy();
    // Another mission's failure says nothing about this win.
    document.body.innerHTML = '<div id="app"></div>';
    const other = mount(
      new FakeController(
        completeView("GOBLIN_6", "GOBLIN", victory),
        unsaved("GOBLIN_5"),
      ),
    );
    expect(
      document.querySelector("[data-v7-region='campaign-unsaved']"),
    ).toBeNull();
    other.destroy();
  });

  it("Victory after the deadline for a star: the star is shown as missed", () => {
    const setup = required(
      missionMatchSetupV7(required(missionByIdV7("HUMAN_2")), "ORIGINAL"),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    // Won in round 23 (the star was for round 22), every own city kept.
    const fake = new FakeController(
      viewForV7(
        {
          ...state,
          round: 23,
          outcome: {
            kind: "VICTORY",
            winnerId: state.humanPlayerId,
            cause: "PLACES_CAPTURED",
          },
        },
        state.humanPlayerId,
      ),
    );
    const view = mount(fake);
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    const stars = required(
      dialog.querySelector<HTMLElement>(".v7-mission-stars"),
    );
    expect(stars.getAttribute("aria-label")).toBe("2 of 3 stars");
    expect(stars.querySelectorAll('[data-icon="star-outline"]')).toHaveLength(
      1,
    );
    expect(
      [...dialog.querySelectorAll<HTMLElement>(".v7-mission-goal")].map(
        (goal) => [goal.dataset.met, goal.getAttribute("aria-label")],
      ),
    ).toEqual([
      ["true", "Win the mission: earned"],
      ["false", "Win by turn 22: missed"],
      ["true", "Lose no city: earned"],
    ]);
    view.destroy();
  });

  it("Defeat by the objective says which: the clock, a lost place, a lost unit", () => {
    const cases: readonly (readonly [string, string, string])[] = [
      ["TEST_CAPTURE", "OUT_OF_TIME", "Out of time."],
      ["TEST_ESCORT", "ESCORT_LOST", "Envoy was killed."],
    ];
    for (const [missionId, cause, line] of cases) {
      const base = completeView(missionId, "ORIGINAL", (view) => ({
        kind: "DEFEAT",
        humanId: view.humanPlayerId,
        defeatedByPlayerId: required(
          view.turnOrder.find((id) => id !== view.humanPlayerId),
        ),
        cause: cause as never,
      }));
      expect(missionOutcomeLineV7(base), missionId).toBe(line);
    }
  });

  it("after a campaign's last mission: the outro, Replay mission, Campaign and Main menu", () => {
    const fake = new FakeController(
      completeView("HUMAN_6", "ORIGINAL", (view) => ({
        kind: "VICTORY",
        winnerId: view.humanPlayerId,
      })),
      {
        status: "OK",
        completed: Object.fromEntries(
          CHAPTER_HUMANS_V7.missions.map((entry) => [entry.missionId, won()]),
        ),
        lastWin: { missionId: "HUMAN_6", firstWin: true },
        diagnostic: null,
      },
    );
    const view = mount(fake);
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission complete");
    // No faction notice: nothing is unlocked (pulp_wars-hmyk.22).
    expect(dialog.querySelector("[data-v7-region='unlock-notice']")).toBeNull();
    expect(dialog.querySelector(".v7-campaign-outro")?.textContent).toBe(
      CHAPTER_HUMANS_V7.outro,
    );
    // Mission 6 is the campaign's last: there is no Next mission to offer.
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Replay mission", "Campaign", "Main menu"]);
    view.destroy();
  });

  it("a hidden fixture mission (in no chapter) keeps the ordinary Victory dialog", () => {
    const setup = required(
      missionMatchSetupV7(required(missionByIdV7("TEST_GROUNDS"))),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const base = viewForV7(created.state, created.state.humanPlayerId);
    const fake = new FakeController({
      ...base,
      outcome: { kind: "VICTORY", winnerId: base.humanPlayerId },
    });
    const view = mount(fake);
    expect(
      document.querySelector("[data-v7-region='results'] h2")?.textContent,
    ).toBe("Victory");
    expect(document.querySelector(".v7-mission-results")).toBeNull();
    view.destroy();
  });

  it("an ordinary Victory or Defeat offers Play again and Main menu", async () => {
    const setup = required(
      missionMatchSetupV7(required(missionByIdV7("TEST_GROUNDS"))),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const base = viewForV7(created.state, created.state.humanPlayerId);
    const outcomes: MatchOutcomeV7[] = [
      { kind: "VICTORY", winnerId: base.humanPlayerId },
      {
        kind: "DEFEAT",
        humanId: base.humanPlayerId,
        defeatedByPlayerId: required(
          base.turnOrder.find((id) => id !== base.humanPlayerId),
        ),
      },
    ];
    for (const outcome of outcomes) {
      const fake = new FakeController({ ...base, outcome });
      const view = mount(fake);
      const dialog = required(
        document.querySelector<HTMLElement>("[data-v7-region='results']"),
      );
      expect(dialog.querySelector("h2")?.textContent).toBe(
        outcome.kind === "VICTORY" ? "Victory" : "Defeat",
      );
      // The score toggles of the players' list (pulp_wars-kaw6.3) come
      // first; then the dialog's own buttons.
      const ownButtons = (selector: string) =>
        [...dialog.querySelectorAll<HTMLElement>(selector)].filter(
          (node) => node.closest(".v7-result-seats") === null,
        );
      expect(ownButtons("button").map((node) => node.textContent)).toEqual([
        "Play again",
        "Main menu",
      ]);
      // Tab order after the list: Play again, Main menu.
      expect(
        ownButtons("button, a").map(
          (node) => node.dataset.action ?? node.tagName,
        ),
      ).toEqual(["restart", "results-menu"]);
      requiredButton('[data-action="results-menu"]').click();
      await settle();
      // The finished match leaves the save slot: the menu has no Continue.
      expect(fake.calls).toEqual(["deleteStoredSave"]);
      expect(document.querySelector("[data-v7-region='results']")).toBeNull();
      expect(document.querySelector(".v7-match-root")).toBeNull();
      const menu = required(
        document.querySelector<HTMLElement>(".v7-main-menu"),
      );
      expect(
        [...menu.querySelectorAll("button")].map((node) => node.dataset.action),
      ).toEqual([
        "tutorial",
        "new-game",
        "campaign",
        "front-settings",
        "about",
      ]);
      expect(document.activeElement?.getAttribute("data-action")).toBe(
        "tutorial",
      );
      view.destroy();
    }
  });
});

describe("Ruleset 7 Retry mission (pulp_wars-hmyk.24)", () => {
  const activeMission = (missionId: string): PlayerViewV7 => {
    const mission = required(missionByIdV7(missionId));
    const setup = required(
      missionId === "HUMAN_1"
        ? missionMatchSetupV7(mission, "ORIGINAL")
        : missionMatchSetupV7(mission),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    return viewForV7(created.state, created.state.humanPlayerId);
  };
  const menuActions = (): (string | undefined)[] =>
    [
      ...document.querySelectorAll<HTMLElement>("#v7-hud-menu .v7-menu-item"),
    ].map((node) => node.dataset.action);
  const confirm = (): HTMLElement | null =>
    document.querySelector<HTMLElement>("[data-v7-region='retry-confirm']");
  const escape = (): void => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  };

  it("the match menu offers Retry mission only in a campaign mission, before Save & quit", () => {
    let view = mount(
      new FakeController(activeMission("HUMAN_1"), undefined, "ACTIVE"),
    );
    requiredButton('[data-action="compact-menu"]').click();
    const actions = menuActions();
    expect(actions).toContain("menu-mission-retry");
    expect(actions.indexOf("menu-mission-retry")).toBe(
      actions.indexOf("main-menu") - 1,
    );
    expect(
      requiredButton('[data-action="menu-mission-retry"]').textContent,
    ).toBe("Retry mission");
    view.destroy();
    // A hidden fixture mission (in no chapter) and the tutorial: none.
    for (const missionId of ["TEST_GROUNDS", TUTORIAL_MISSION_ID_V7]) {
      document.body.innerHTML = '<div id="app"></div>';
      view = mount(
        new FakeController(activeMission(missionId), undefined, "ACTIVE"),
      );
      requiredButton('[data-action="compact-menu"]').click();
      expect(menuActions(), missionId).toContain("main-menu");
      expect(menuActions(), missionId).not.toContain("menu-mission-retry");
      view.destroy();
    }
  });

  it("asks first: Cancel, Escape and the scrim keep the match; Retry restarts it", async () => {
    const fake = new FakeController(
      activeMission("HUMAN_1"),
      undefined,
      "ACTIVE",
    );
    const view = mount(fake);
    const open = (): HTMLElement => {
      requiredButton('[data-action="compact-menu"]').click();
      requiredButton('[data-action="menu-mission-retry"]').click();
      return required(confirm());
    };
    const dialog = open();
    // The menu closes behind the question.
    expect(document.querySelector("#v7-hud-menu")).toBeNull();
    expect(dialog.getAttribute("role")).toBe("alertdialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(RETRY_MISSION_QUESTION_V7).toBe("Restart this mission?");
    expect(RETRY_MISSION_DETAIL_V7).toBe("Your progress in it will be lost.");
    expect(
      document.getElementById(required(dialog.getAttribute("aria-labelledby")))
        ?.textContent,
    ).toBe(RETRY_MISSION_QUESTION_V7);
    expect(
      document.getElementById(required(dialog.getAttribute("aria-describedby")))
        ?.textContent,
    ).toBe(RETRY_MISSION_DETAIL_V7);
    // The safe answer comes first and takes the focus.
    expect(
      [...dialog.querySelectorAll("button")].map((node) => [
        node.dataset.action,
        node.textContent,
      ]),
    ).toEqual([
      ["retry-confirm-cancel", "Cancel"],
      ["retry-confirm", "Retry"],
    ]);
    await settle();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "retry-confirm-cancel",
    );
    // A scrim takes the pointer from the board behind it.
    expect(
      document.querySelector<HTMLElement>("[data-v7-region='scrim']")?.dataset
        .dismissable,
    ).toBe("true");
    requiredButton('[data-action="retry-confirm-cancel"]').click();
    await settle();
    expect(confirm()).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "compact-menu",
    );
    open();
    await settle();
    escape();
    await settle();
    expect(confirm()).toBeNull();
    open();
    required(
      document.querySelector<HTMLElement>("[data-v7-region='scrim']"),
    ).click();
    expect(confirm()).toBeNull();
    expect(fake.calls).toEqual([]);
    open();
    requiredButton('[data-action="retry-confirm"]').click();
    await settle();
    expect(fake.calls).toEqual(["restart"]);
    expect(confirm()).toBeNull();
    view.destroy();
  });

  it("Settings in a mission reads Retry mission and asks the same question", async () => {
    const fake = new FakeController(
      activeMission("HUMAN_1"),
      undefined,
      "ACTIVE",
    );
    const view = mount(fake);
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="settings"]').click();
    expect(document.querySelector('[data-action="restart"]')).toBeNull();
    const retry = requiredButton('[data-action="settings-mission-retry"]');
    expect(retry.textContent).toBe("Retry mission");
    retry.click();
    await settle();
    // Settings closes; the question is over the match.
    expect(
      document.querySelector("[data-v7-region='overlay-settings']"),
    ).toBeNull();
    expect(confirm()).not.toBeNull();
    expect(fake.calls).toEqual([]);
    requiredButton('[data-action="retry-confirm"]').click();
    await settle();
    expect(fake.calls).toEqual(["restart"]);
    view.destroy();
  });

  it("restarts the same mission and choice from its start: progress untouched, the autosave replaced, the attempt abandoned", async () => {
    seedProgress({ HUMAN_1: won() });
    const started: {
      readonly source: string;
      readonly missionId: string | undefined;
      readonly beforePhase: string | null;
      readonly beforeOutcome: unknown;
    }[] = [];
    const analytics: GameAnalyticsV7 = {
      ...NO_ANALYTICS_V7,
      matchStarted: (setup, source, before) => {
        started.push({
          source,
          missionId: setup.mission?.id,
          beforePhase: before?.phase ?? null,
          beforeOutcome: before?.view?.outcome ?? null,
        });
      },
    };
    const app = bootstrapRuleset7App(document, { analytics });
    await openHumans();
    requiredButton('[data-action="mission-human_2"]').click();
    await settle();
    requiredButton('[data-action="campaign-start"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    const fresh = required(app.controller.snapshot().view);
    expect(fresh.setup.mission?.id).toBe("HUMAN_2");
    const progress = window.localStorage.getItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    );
    expect(progress).not.toBeNull();
    // One step into the attempt: a unit moves, and the autosave has it.
    const move = required(
      app.controller
        .snapshot()
        .offeredCommands.find((command) => command.kind === "MOVE"),
    );
    await app.controller.dispatch(move);
    await waitUntil(
      () =>
        app.controller.snapshot().view?.commandIndex === 1 &&
        !app.controller.snapshot().transitioning,
    );
    app.controller.flushPersistence();
    expect(savedCommandCount()).toBe(1);
    started.length = 0;
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="menu-mission-retry"]').click();
    requiredButton('[data-action="retry-confirm"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning &&
        app.controller.snapshot().view?.commandIndex === 0,
    );
    const again = required(app.controller.snapshot().view);
    // The same mission, revision, seed and faction, from its start.
    expect(again.setup).toEqual(fresh.setup);
    expect(again.round).toBe(fresh.round);
    expect(again.units).toEqual(fresh.units);
    expect(document.querySelector("#v7-live")?.textContent).toBe(
      "Mission restarted.",
    );
    // Campaign progress is not touched: no win, no stars.
    expect(window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7)).toBe(
      progress,
    );
    // The abandoned attempt's autosave is replaced by the fresh start.
    app.controller.flushPersistence();
    expect(savedCommandCount()).toBe(0);
    // Analytics: the unfinished attempt goes as abandoned (the snapshot
    // before the launch), and the mission starts again as a campaign start.
    expect(started).toEqual([
      {
        source: "campaign",
        missionId: "HUMAN_2",
        beforePhase: "ACTIVE",
        beforeOutcome: null,
      },
    ]);
    app.destroy();
  });
});

describe("Ruleset 7 mission objective in a match", () => {
  const active = (missionId: string): PlayerViewV7 => {
    const setup = required(
      missionMatchSetupV7(required(missionByIdV7(missionId)), "ORIGINAL"),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    return viewForV7(created.state, created.state.humanPlayerId);
  };

  it("shows the tracker: an icon, one line, and what is left", () => {
    const expected: readonly (readonly [
      string,
      string,
      string,
      string | null,
    ])[] = [
      ["TEST_ESCORT", "move", "Bring envoy to gate.", "4 steps"],
      ["TEST_SURVIVE", "defense", "Hold out for 3 turns.", "3 turns"],
      ["TEST_CAPTURE", "flag", "Capture outpost by turn 4.", "4 turns"],
      ["TEST_KILL", "skull", "Kill boss.", null],
    ];
    for (const [missionId, icon, line, counter] of expected) {
      document.body.innerHTML = '<div id="app"></div>';
      const host = new NullBoardHost();
      const view = mount(
        new FakeController(active(missionId), undefined, "ACTIVE"),
        host,
      );
      const tracker = required(
        document.querySelector<HTMLElement>(
          "[data-v7-region='mission-tracker']",
        ),
      );
      expect(tracker.querySelector("svg")?.dataset.icon, missionId).toBe(icon);
      expect(
        tracker.querySelector(".v7-mission-tracker-line")?.textContent,
        missionId,
      ).toBe(line);
      expect(
        tracker.querySelector(".v7-mission-tracker-counter")?.textContent ??
          null,
        missionId,
      ).toBe(counter);
      // No tile coordinate anywhere in it.
      expect(tracker.getAttribute("aria-label")).not.toMatch(/\d\s*,\s*\d/);
      view.destroy();
    }
  });

  it("hands the board the objective's marks: the goal, what to defend, who to escort, who to kill", () => {
    const marks = (missionId: string) => {
      document.body.innerHTML = '<div id="app"></div>';
      const host = new NullBoardHost();
      const view = mount(
        new FakeController(active(missionId), undefined, "ACTIVE"),
        host,
      );
      const found = (host.last?.missionMarkers ?? []).map(
        (mark) => `${mark.kind}:${mark.on}:${mark.label}`,
      );
      view.destroy();
      return found;
    };
    expect(marks("TEST_ESCORT")).toEqual([
      "GOAL:TILE:gate",
      "ESCORT:UNIT:envoy",
    ]);
    expect(marks("TEST_CAPTURE")).toEqual([
      "GOAL:TILE:outpost",
      "DEFEND:TILE:ally home",
    ]);
    expect(marks("TEST_KILL")).toEqual([
      "TARGET:UNIT:boss",
      "ESCORT:UNIT:hero",
    ]);
    expect(marks("HUMAN_2")).toEqual([
      "GOAL:TILE:Mudford Toll",
      "GOAL:TILE:Halfway Toll",
      "GOAL:TILE:Kingsgate",
    ]);
    // A skirmish has none, and no tracker.
    expect(marks("TEST_GROUNDS")).toEqual([]);
    expect(
      document.querySelector("[data-v7-region='mission-tracker']"),
    ).toBeNull();
  });

  it("an escort and a hold-out: the tracker, the marks, the stars, and why each ends", () => {
    // The Humans' missions 3 and 4: an escort against a clock, and a
    // hold-out with an ally.
    const start = (missionId: string) => {
      const setup = required(
        missionMatchSetupV7(required(missionByIdV7(missionId))),
      );
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      return created.state;
    };
    const shown = (view: PlayerViewV7) => {
      document.body.innerHTML = '<div id="app"></div>';
      const host = new NullBoardHost();
      const mounted = mount(
        new FakeController(view, undefined, "ACTIVE"),
        host,
      );
      const tracker = required(
        document.querySelector<HTMLElement>(
          "[data-v7-region='mission-tracker']",
        ),
      );
      const found = {
        icon: tracker.querySelector("svg")?.dataset.icon,
        line: tracker.querySelector(".v7-mission-tracker-line")?.textContent,
        counter: tracker.querySelector(".v7-mission-tracker-counter")
          ?.textContent,
        said: tracker.getAttribute("aria-label") ?? "",
        marks: (host.last?.missionMarkers ?? []).map(
          (mark) =>
            `${mark.kind}:${mark.on}:${mark.label}@${String(mark.at.x)},${String(mark.at.y)}`,
        ),
      };
      mounted.destroy();
      return found;
    };
    const ended = (
      view: PlayerViewV7,
      kind: "VICTORY" | "DEFEAT",
      cause: string,
    ): string | null => {
      const other = required(
        view.turnOrder.find((id) => id !== view.humanPlayerId),
      );
      const outcome =
        kind === "VICTORY"
          ? { kind, winnerId: view.humanPlayerId, cause }
          : {
              kind,
              humanId: view.humanPlayerId,
              defeatedByPlayerId: other,
              cause,
            };
      return missionOutcomeLineV7({
        ...view,
        outcome: outcome as MatchOutcomeV7,
      });
    };

    // Mission 3: the clock is the counter, the steps are in the sentence.
    const road = start("HUMAN_3");
    const roadView = viewForV7(road, road.humanPlayerId);
    const roadShown = shown(roadView);
    expect([roadShown.icon, roadShown.line, roadShown.counter]).toEqual([
      "move",
      "Get Mr. Pettigrew to Kingsbridge by turn 16.",
      "16 turns",
    ]);
    expect(roadShown.said).toContain("16 turns left.");
    expect(roadShown.said).toContain("8 steps to go.");
    expect(roadShown.said).not.toMatch(/\d\s*,\s*\d/);
    // A flag on Kingsbridge, a star on the clerk.
    expect(roadShown.marks).toEqual([
      "GOAL:TILE:Kingsbridge@13,2",
      "ESCORT:UNIT:Mr. Pettigrew@4,11",
    ]);
    expect(
      missionStarGoalsV7("HUMAN_3", null).map((goal) => goal.text),
    ).toEqual(["Win the mission", "Win by turn 13", "Lose no city"]);
    expect(ended(roadView, "VICTORY", "ESCORT_ARRIVED")).toBe(
      "Mr. Pettigrew made it.",
    );
    expect(ended(roadView, "DEFEAT", "ESCORT_LOST")).toBe(
      "Mr. Pettigrew was killed.",
    );
    expect(ended(roadView, "DEFEAT", "OUT_OF_TIME")).toBe("Out of time.");

    // Mission 4: twelve turns, a shield on the fort, a star on the clerk.
    const fort = start("HUMAN_4");
    const fortView = viewForV7(fort, fort.humanPlayerId);
    const fortShown = shown(fortView);
    expect([fortShown.icon, fortShown.line, fortShown.counter]).toEqual([
      "defense",
      "Hold Fort Hollow for 12 turns.",
      "12 turns",
    ]);
    expect(fortShown.marks).toEqual([
      "DEFEND:TILE:Fort Hollow@10,9",
      "ESCORT:UNIT:Mr. Pettigrew@10,9",
    ]);
    expect(
      missionStarGoalsV7("HUMAN_4", null).map((goal) => goal.text),
    ).toEqual(["Win the mission", "Lose no city", "Keep Mr. Pettigrew alive"]);
    expect(ended(fortView, "VICTORY", "SURVIVED")).toBe("You held out.");
    // Fort Hollow in an enemy's hands.
    const taker = required(
      fort.turnOrder.find((id) => id !== fort.humanPlayerId),
    );
    const fallen = viewForV7(
      {
        ...fort,
        cities: fort.cities.map((city) =>
          city.at.x === 10 && city.at.y === 9
            ? { ...city, ownerId: taker }
            : city,
        ),
      },
      fort.humanPlayerId,
    );
    expect(ended(fallen, "DEFEAT", "PLACE_LOST")).toBe("Fort Hollow fell.");
  });
});

describe("Ruleset 7 campaign progress recovery and reset", () => {
  it("says unreadable progress can't be read and resets it", async () => {
    window.localStorage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7, "{ broken");
    const app = bootstrapRuleset7App(document);
    await openCampaign();
    expect(
      document.querySelector(".v7-campaign-recovery")?.textContent,
    ).toContain("Campaign progress can't be read.");
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(0);
    requiredButton('[data-action="campaign-reset-unreadable"]').click();
    await settle();
    expect(
      window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7),
    ).toBeNull();
    // The campaign map again, and the Humans from their start.
    expect(document.querySelectorAll(".v7-campaign-plate")).toHaveLength(9);
    requiredButton('[data-action="campaign-open-humans"]').click();
    await settle();
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(6);
    app.destroy();
  });

  it("resets progress only after confirmation", async () => {
    seedProgress({ HUMAN_1: won(), HUMAN_2: won() });
    seedLegacyProgress({ FRONTIER_1: won() });
    const app = bootstrapRuleset7App(document);
    await openCampaign();
    requiredButton('[data-action="campaign-reset"]').click();
    await settle();
    expect(
      document.querySelector(".v7-campaign-reset-question")?.textContent,
    ).toBe("Erase all campaign progress?");
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-reset-cancel",
    );
    requiredButton('[data-action="campaign-reset-cancel"]').click();
    await settle();
    expect(
      window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7),
    ).not.toBeNull();
    requiredButton('[data-action="campaign-reset"]').click();
    await settle();
    requiredButton('[data-action="campaign-reset-confirm"]').click();
    await settle();
    expect(
      window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7),
    ).toBeNull();
    expect(
      window.localStorage.getItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7),
    ).toBeNull();
    requiredButton('[data-action="campaign-open-humans"]').click();
    await settle();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-mission-card")].map(
        (card) => card.dataset.status,
      ),
    ).toEqual(["open", "locked", "locked", "locked", "locked", "locked"]);
    app.destroy();
  });
});

/** The accepted commands of the autosave slot's match. */
function savedCommandCount(): number {
  const raw = window.localStorage.getItem(SAVE_STORAGE_KEY_V7);
  if (raw === null) throw new Error("No autosave");
  const find = (value: unknown): unknown[] | null => {
    if (value === null || typeof value !== "object") return null;
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.acceptedCommands)) return record.acceptedCommands;
    for (const child of Object.values(record)) {
      const found = find(child);
      if (found !== null) return found;
    }
    return null;
  };
  return required(find(JSON.parse(raw))).length;
}

function completeView(
  missionId: string,
  faction: FactionIdV7,
  outcome: (view: PlayerViewV7) => MatchOutcomeV7,
): PlayerViewV7 {
  const setup = required(
    missionMatchSetupV7(required(missionByIdV7(missionId)), faction),
  );
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  const view = viewForV7(created.state, created.state.humanPlayerId);
  return { ...view, outcome: outcome(view) };
}

/** A controller port that holds one finished match and logs its calls. */
class FakeController implements Ruleset7ControllerPortV7 {
  readonly calls: string[] = [];
  readonly #subscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  #snapshot: Ruleset7BrowserSnapshot;
  readonly #progress: Ruleset7CampaignProgressV7;

  constructor(
    view: PlayerViewV7,
    progress: Ruleset7CampaignProgressV7 = {
      status: "OK",
      completed: {},
      lastWin: null,
      diagnostic: null,
    },
    phase: Ruleset7BrowserSnapshot["phase"] = "COMPLETE",
  ) {
    this.#snapshot = snapshotOf(phase, view);
    this.#progress = progress;
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#subscribers.delete(subscriber);
  }
  subscribeAcceptedBoundary(): () => void {
    return () => undefined;
  }
  campaignProgress(): Ruleset7CampaignProgressV7 {
    return this.#progress;
  }
  resetCampaignProgress(): boolean {
    this.calls.push("resetCampaignProgress");
    return true;
  }
  readonly restart: Ruleset7ControllerPortV7["restart"] = async () => {
    this.calls.push("restart");
    return { ok: false, code: "INVALID_SETUP", diagnostic: "Not used" };
  };
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    async () => {
      this.calls.push("deleteStoredSave");
      this.#snapshot = snapshotOf("EMPTY", null);
      for (const subscriber of this.#subscribers) subscriber(this.#snapshot);
      return true;
    };
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "Not used",
  });
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
  readonly dispatch: Ruleset7ControllerPortV7["dispatch"] = async () => ({
    accepted: false,
    reason: "NO_ACTIVE_MATCH",
  });
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] =
    async () => ({
      ok: false,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "No AI",
    });
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({ ok: false, reason: "NO_ACTIVE_MATCH" });
}

function snapshotOf(
  phase: Ruleset7BrowserSnapshot["phase"],
  view: PlayerViewV7 | null,
): Ruleset7BrowserSnapshot {
  return {
    phase,
    view,
    offeredCommands: [],
    savedAt: null,
    hasStoredSave: view !== null,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: {
      active: false,
      fastForward: false,
      policySlices: 0,
      acceptedCommands: 0,
      lastSliceMilliseconds: 0,
      maximumSliceMilliseconds: 0,
    },
  };
}

class NullBoardHost implements BoardHostV7 {
  /** The last model the view handed the board. */
  last: Parameters<BoardHostV7["update"]>[0] | null = null;
  mount(container: HTMLElement): void {
    container.append(document.createElement("canvas"));
  }
  update(model: Parameters<BoardHostV7["update"]>[0]): void {
    this.last = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function mount(
  controller: Ruleset7ControllerPortV7,
  boardHost: BoardHostV7 = new NullBoardHost(),
): Ruleset7DomAppView {
  const root = required(document.querySelector<HTMLElement>("#app"));
  return new Ruleset7DomAppView(document, root, controller, {
    boardHost,
    settingsStorage: null,
  });
}

/** Tab-reachable controls in document order. */
function focusables(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>(
      "button, select, summary, a[href], input, [tabindex]:not([tabindex='-1'])",
    ),
  ].filter((node) => {
    const closed = node.closest("details:not([open])");
    return (
      !(node instanceof HTMLButtonElement && node.disabled) &&
      node.closest("[hidden]") === null &&
      (closed === null ||
        (node.tagName === "SUMMARY" && node.parentElement === closed))
    );
  });
}
