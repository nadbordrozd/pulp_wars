// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type Ruleset7BrowserSnapshot,
  type Ruleset7CampaignProgressV7,
} from "../../src/app/index";
import { CHAPTER_ONE_V7 } from "../../src/campaign/chapter-1";
import {
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
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
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  won,
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

/** The campaign map, then the prologue's mission list (pulp_wars-hmyk.3). */
async function openFrontier(): Promise<void> {
  await openCampaign();
  requiredButton('[data-action="campaign-open-frontier"]').click();
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
    // The campaign map (pulp_wars-hmyk.3): the prologue open, the Humans
    // campaign open (pulp_wars-hmyk.4), the Martians and the Goblins locked
    // behind both first campaigns (pulp_wars-hmyk.7, pulp_wars-hmyk.8), the
    // rest not written yet.
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-campaign-plate")].map(
        (plate) => [plate.dataset.campaign, plate.dataset.status],
      ),
    ).toEqual([
      ["FRONTIER", "open"],
      ["HUMANS", "open"],
      ["UNDEAD", "open"],
      ["DINOSAURS", "locked"],
      ["MARTIANS", "locked"],
      ["GOBLINS", "locked"],
      ["DWARVES", "soon"],
      ["ICE_FOLK", "soon"],
      ["CULT", "soon"],
      ["CANDY", "soon"],
    ]);
    expect(
      document
        .querySelector('[data-action="campaign-open-frontier"]')
        ?.getAttribute("aria-label"),
    ).toBe("The Hollow Frontier, open, 0 of 10 missions won");
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
    requiredButton('[data-action="campaign-open-frontier"]').click();
    await settle();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-map",
    );
    expect(document.querySelector(".v7-campaign-title")?.textContent).toBe(
      "The Hollow Frontier",
    );
    expect(document.querySelector(".v7-campaign-kicker")?.textContent).toBe(
      "Prologue",
    );
    // Ten missions (`pulp_wars-v642.1`); the ones not built yet say so.
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(10);
    expect(
      document.querySelectorAll('.v7-mission-card[data-status="soon"]'),
    ).toHaveLength(
      CHAPTER_ONE_V7.missions.filter((entry) => entry.planned !== undefined)
        .length,
    );
    // Campaigns returns to the map, on the prologue's plate.
    requiredButton('[data-action="campaign-map"]').click();
    await settle();
    expect(document.querySelector(".v7-mission-card")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "campaign-open-frontier",
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
    seedProgress({ FRONTIER_1: { ...won(14), stars: 2 } });
    const app = bootstrapRuleset7App(document);
    await openFrontier();
    const cards = [
      ...document.querySelectorAll<HTMLButtonElement>(".v7-mission-card"),
    ];
    expect(cards.map((card) => card.dataset.status)).toEqual([
      "done",
      "open",
      "locked",
      "locked",
      // Missions 5 to 10 are built (`pulp_wars-v642.2` to `.4`).
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "Mission 1, Goblins at the Gate, Conquest, done, 2 of 3 stars, best 14 turns",
      "Mission 2, The Warrens, Capture, open, unlocks Goblin",
      "Mission 3, Green Tide, Capture, locked",
      "Mission 4, Bone Neck, Capture, locked, unlocks Undead",
      "Mission 5, Dead Men's Road, Escort, locked, unlocks Dwarf",
      "Mission 6, The Deep Gate, Hold out, locked, unlocks Ice Folk",
      "Mission 7, The Island That Time Forgot, Capture, locked, unlocks Dinosaur",
      "Mission 8, Brain Wave, Hunt, locked, unlocks Martian",
      "Mission 9, Sugar and Spite, Rescue, locked, unlocks Candy",
      "Mission 10, The Stars Are Right, Capture, locked, unlocks Cultists",
    ]);
    expect(cards[0]?.textContent).toContain("Best: 14 turns");
    expect(cards[1]?.textContent).toContain("Open");
    expect(cards[2]?.textContent).toContain("Win the previous mission");
    expect(cards[4]?.textContent).toContain("Win the previous mission");
    // Every mission is built (`pulp_wars-v642.4`): none says "Coming soon".
    expect(cards[8]?.textContent).toContain("Win the previous mission");
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
      ...Array.from({ length: 9 }, () => null),
    ]);
    // What a mission unlocks, on its card.
    expect(
      cards.map(
        (card) =>
          card.querySelector<HTMLElement>(
            ".v7-mission-unlock .v7-faction-emblem",
          )?.dataset.faction ?? null,
      ),
    ).toEqual([
      null,
      "GOBLIN",
      null,
      "UNDEAD",
      "DWARF",
      "ICE_FOLK",
      "DINOSAUR",
      "MARTIAN",
      "CANDY",
      "CULT",
    ]);
    // A mission still to come opens nothing.
    expect(cards[4]?.getAttribute("aria-disabled")).toBe("true");
    cards[4]?.click();
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    // Emblems: you lead, then the opponent (mission 4 offers two leaders).
    expect(
      cards.map((card) =>
        [
          ...card.querySelectorAll<HTMLElement>(
            ".v7-mission-sides .v7-faction-emblem",
          ),
        ].map((emblem) => emblem.dataset.faction),
      ),
    ).toEqual([
      ["ORIGINAL", "GOBLIN"],
      ["ORIGINAL", "GOBLIN"],
      ["GOBLIN", "UNDEAD"],
      ["ORIGINAL", "GOBLIN", "UNDEAD"],
      ["UNDEAD", "ORIGINAL", "ICE_FOLK"],
      ["DWARF", "ICE_FOLK", "ORIGINAL"],
      ["ICE_FOLK", "DINOSAUR", "ORIGINAL"],
      ["DINOSAUR", "MARTIAN", "ORIGINAL"],
      // An ally stands on your side of "vs".
      ["MARTIAN", "CANDY", "UNDEAD", "GOBLIN"],
      ["ORIGINAL", "GOBLIN", "CULT", "UNDEAD"],
    ]);
    // A locked card stays focusable but opens nothing.
    expect(cards[2]?.disabled).toBe(false);
    expect(cards[2]?.getAttribute("aria-disabled")).toBe("true");
    cards[2]?.click();
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    // Every faction, dimmed until unlocked.
    const roster = [
      ...document.querySelectorAll<HTMLElement>(".v7-campaign-faction"),
    ];
    // Nine since the Cultists were offered (pulp_wars-mch9.20); mission 10
    // unlocks them, last of all (`pulp_wars-v642.1`).
    expect(roster).toHaveLength(9);
    expect(roster.at(-1)?.dataset.faction).toBe("CULT");
    expect(roster.at(-1)?.getAttribute("aria-label")).toBe("Cultists, locked");
    expect(
      roster
        .filter((entry) => entry.dataset.unlocked === "true")
        .map((entry) => entry.dataset.faction),
    ).toEqual(["ORIGINAL"]);
    expect(
      roster
        .find((entry) => entry.dataset.faction === "GOBLIN")
        ?.getAttribute("aria-label"),
    ).toBe("Goblin, locked");
    app.destroy();
  });

  it("keeps the way back, the cards and the briefing in keyboard reading order", async () => {
    const app = bootstrapRuleset7App(document);
    await openFrontier();
    const order = focusables().map(
      (node) => node.getAttribute("data-action") ?? node.tagName.toLowerCase(),
    );
    // Gallery and Settings are on the main menu (pulp_wars-2yc.18).
    expect(order).toEqual([
      "front-back",
      "campaign-map",
      "mission-frontier_1",
      "mission-frontier_2",
      "mission-frontier_3",
      "mission-frontier_4",
      "mission-frontier_5",
      "mission-frontier_6",
      "mission-frontier_7",
      "mission-frontier_8",
      "mission-frontier_9",
      "mission-frontier_10",
    ]);
    app.destroy();
  });

  it("opens the briefing with focus on its heading, and Back returns focus to the card", async () => {
    const app = bootstrapRuleset7App(document);
    await openFrontier();
    requiredButton('[data-action="mission-frontier_1"]').click();
    await settle();
    const briefing = required(
      document.querySelector<HTMLElement>("[data-v7-region='briefing']"),
    );
    const entry = required(CHAPTER_ONE_V7.missions[0]);
    expect(document.activeElement?.id).toBe("v7-briefing-title");
    expect(briefing.querySelector("h2")?.textContent).toBe(
      "Goblins at the Gate",
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
    expect(objective.textContent).toBe("ObjectiveCapture Drum Camp.");
    expect(objective.dataset.objective).toBe("domination");
    expect(objective.querySelector("svg")?.dataset.icon).toBe("attack");
    // What the three stars are for.
    expect(
      [...briefing.querySelectorAll(".v7-mission-goal")].map(
        (goal) => goal.textContent,
      ),
    ).toEqual(["Win the mission", "Win by turn 12", "Lose no city"]);
    // Mission 1 unlocks nothing.
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
      "vsGoblin",
    );
    expect(briefing.querySelector("#v7-campaign-faction")).toBeNull();
    expect(briefing.querySelector(".v7-briefing-lead-text")?.textContent).toBe(
      "You leadHuman",
    );
    expect(
      focusables().map((node) => node.getAttribute("data-action")),
    ).toEqual(["front-back", "campaign-start", "campaign-back"]);
    // Escape steps back from the briefing to its card, then to the menu.
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "mission-frontier_1",
    );
    requiredButton('[data-action="mission-frontier_1"]').click();
    await settle();
    requiredButton('[data-action="campaign-back"]').click();
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "mission-frontier_1",
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
      "campaign-open-frontier",
    );
    document.activeElement?.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await settle();
    expect(document.querySelector(".v7-main-menu")).not.toBeNull();
    app.destroy();
  });

  it("offers mission 4's choice filtered to unlocked factions and launches the chosen one", async () => {
    seedProgress({ FRONTIER_1: won(), FRONTIER_3: won() });
    const first = bootstrapRuleset7App(document);
    await openFrontier();
    requiredButton('[data-action="mission-frontier_4"]').click();
    await settle();
    // Goblin is not unlocked yet (mission 2 was never won): Human only.
    expect(document.querySelector("#v7-campaign-faction")).toBeNull();
    expect(document.querySelector(".v7-briefing-lead-text")?.textContent).toBe(
      "You leadHuman",
    );
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    seedProgress({ FRONTIER_1: won(), FRONTIER_2: won(), FRONTIER_3: won() });
    const app = bootstrapRuleset7App(document);
    await openFrontier();
    requiredButton('[data-action="mission-frontier_4"]').click();
    await settle();
    expect(
      document.querySelector("[data-v7-region='briefing-unlock']")?.textContent,
    ).toBe("Win to unlockUndead");
    expect(
      document.querySelector<HTMLElement>(".v7-briefing-objective svg")?.dataset
        .icon,
    ).toBe("flag");
    const choice = requiredSelect("v7-campaign-faction");
    expect([...choice.options].map((option) => option.value)).toEqual([
      "ORIGINAL",
      "GOBLIN",
    ]);
    expect([...choice.options].map((option) => option.textContent)).toEqual([
      "Human",
      "Goblin",
    ]);
    expect(choice.closest("label")?.textContent).toContain("You lead");
    choice.value = "GOBLIN";
    choice.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      document.querySelector<HTMLElement>(
        ".v7-briefing-lead-emblem .v7-faction-emblem",
      )?.dataset.faction,
    ).toBe("GOBLIN");
    requiredButton('[data-action="campaign-start"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(app.controller.snapshot().view?.setup).toMatchObject({
      mapType: "MISSION",
      mission: { id: "FRONTIER_4" },
      factions: ["GOBLIN", "UNDEAD"],
      width: 16,
    });
    app.destroy();
  });

  it("starts a mission; Settings and the resume screen name the mission, not the seed", async () => {
    const app = bootstrapRuleset7App(document);
    await openFrontier();
    requiredButton('[data-action="mission-frontier_1"]').click();
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
      mission: { id: "FRONTIER_1" },
      factions: ["ORIGINAL", "GOBLIN"],
    });
    expect(view.turnOrder[view.activeSeatIndex]).toBe(view.humanPlayerId);
    // The objective tracker of the top bar.
    const tracker = required(
      document.querySelector<HTMLElement>(
        "[data-v7-region='hud'] [data-v7-region='mission-tracker']",
      ),
    );
    expect(tracker.dataset.missionId).toBe("FRONTIER_1");
    expect(tracker.textContent).toBe("Capture Drum Camp.");
    expect(tracker.getAttribute("aria-label")).toBe(
      "Objective: Capture Drum Camp.",
    );
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="settings"]').click();
    expect(document.querySelector(".v7-mission-label")?.textContent).toBe(
      "Mission: Goblins at the Gate",
    );
    expect(document.querySelector(".v7-mission-objective")?.textContent).toBe(
      "Objective: Capture Drum Camp.",
    );
    expect(document.querySelector(".v7-map-seed")).toBeNull();
    requiredButton('[data-action="close-overlay"]').click();
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="main-menu"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(document.querySelector(".v7-resume-summary")?.textContent).toBe(
      "Mission 1 · Goblins at the Gate · Turn 1",
    );
    // A mission started from the menu's Campaign replaces the saved one.
    requiredButton('[data-action="campaign"]').click();
    await settle();
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
    requiredButton('[data-action="campaign-open-frontier"]').click();
    await settle();
    requiredButton('[data-action="mission-frontier_1"]').click();
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
  it("Defeat: Mission failed, Retry restarts the same setup, Campaign returns to the list", async () => {
    const fake = new FakeController(
      completeView("FRONTIER_1", "ORIGINAL", (view) => ({
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
    ).toEqual(["Retry", "Campaign", "Main menu"]);
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
        completeView("FRONTIER_1", "ORIGINAL", (view) =>
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

  it("Victory: why, the stars with what each was for, the debrief, Next mission and Retry", async () => {
    const fake = new FakeController(
      completeView("FRONTIER_2", "ORIGINAL", (view) => ({
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
    ).toBe("The Warrens is yours.");
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
      ["Win by turn 18", "true"],
      ["Lose no city", "true"],
    ]);
    expect(dialog.querySelector(".v7-campaign-story")?.textContent).toBe(
      required(CHAPTER_ONE_V7.missions[1]).closing,
    );
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Next mission", "Retry", "Campaign", "Main menu"]);
    requiredButton('[data-action="mission-retry"]').click();
    await settle();
    expect(fake.calls).toEqual(["restart"]);
    view.destroy();
  });

  it("Victory names the campaigns the win opened; Campaign returns to the mission's own list", async () => {
    const fake = new FakeController(
      completeView("FRONTIER_2", "ORIGINAL", (view) => ({
        kind: "VICTORY",
        winnerId: view.humanPlayerId,
        cause: "PLACES_CAPTURED",
      })),
      {
        status: "OK",
        completed: { FRONTIER_1: won(), FRONTIER_2: won() },
        lastWin: {
          missionId: "FRONTIER_2",
          firstWin: true,
          unlocked: ["GOBLIN"],
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
    ).toBe("FRONTIER");
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(10);
    view.destroy();
  });

  it("Victory after the deadline for a star: the star is shown as missed", () => {
    const setup = required(
      missionMatchSetupV7(required(missionByIdV7("FRONTIER_2")), "ORIGINAL"),
    );
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const state = created.state;
    // Won in round 19 (the star was for round 18), every own city kept.
    const fake = new FakeController(
      viewForV7(
        {
          ...state,
          round: 19,
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
      ["false", "Win by turn 18: missed"],
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

  it("after the last built mission: the unlock, the outro, Retry, Campaign and Main menu", () => {
    const fake = new FakeController(
      completeView("FRONTIER_10", "ORIGINAL", (view) => ({
        kind: "VICTORY",
        winnerId: view.humanPlayerId,
      })),
      {
        status: "OK",
        completed: {
          FRONTIER_1: won(),
          FRONTIER_2: won(),
          FRONTIER_3: won(),
          FRONTIER_4: won(),
          FRONTIER_5: won(),
          FRONTIER_6: won(),
          FRONTIER_7: won(),
          FRONTIER_8: won(),
          FRONTIER_9: won(),
          FRONTIER_10: won(),
        },
        lastWin: {
          missionId: "FRONTIER_10",
          firstWin: true,
          unlocked: ["CULT"],
        },
        diagnostic: null,
      },
    );
    const view = mount(fake);
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission complete");
    expect(
      dialog.querySelector("[data-v7-region='unlock-notice']")?.textContent,
    ).toBe("New faction: Cultists");
    expect(dialog.querySelector(".v7-campaign-outro")?.textContent).toBe(
      CHAPTER_ONE_V7.outro,
    );
    // Mission 10 is the last of part one (`pulp_wars-v642.4`): there is no
    // Next mission to offer.
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Retry", "Campaign", "Main menu"]);
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
        "gallery",
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
    expect(marks("FRONTIER_2")).toEqual(["GOAL:TILE:the Warrens"]);
    // A skirmish has none, and no tracker.
    expect(marks("TEST_GROUNDS")).toEqual([]);
    expect(
      document.querySelector("[data-v7-region='mission-tracker']"),
    ).toBeNull();
  });

  it("missions 5 and 6: the tracker, the marks, the stars, and why each ends", () => {
    // `pulp_wars-v642.2`: an escort against a clock, and a hold-out.
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

    // Mission 5: the clock is the counter, the steps are in the sentence.
    const road = start("FRONTIER_5");
    const roadView = viewForV7(road, road.humanPlayerId);
    const roadShown = shown(roadView);
    expect([roadShown.icon, roadShown.line, roadShown.counter]).toEqual([
      "move",
      "Get Doctor Crane to the gate by turn 24.",
      "24 turns",
    ]);
    expect(roadShown.said).toContain("24 turns left.");
    expect(roadShown.said).toContain("8 steps to go.");
    expect(roadShown.said).not.toMatch(/\d\s*,\s*\d/);
    // A flag on the gate, a star on the Doctor.
    expect(roadShown.marks).toEqual([
      "GOAL:TILE:the Ironbraid Gate@14,2",
      "ESCORT:UNIT:Doctor Crane@5,11",
    ]);
    expect(
      missionStarGoalsV7("FRONTIER_5", null).map((goal) => goal.text),
    ).toEqual(["Win the mission", "Win by turn 20", "Lose no city"]);
    expect(ended(roadView, "VICTORY", "ESCORT_ARRIVED")).toBe(
      "Doctor Crane made it.",
    );
    expect(ended(roadView, "DEFEAT", "ESCORT_LOST")).toBe(
      "Doctor Crane was killed.",
    );
    expect(ended(roadView, "DEFEAT", "OUT_OF_TIME")).toBe("Out of time.");

    // Mission 6: fourteen turns, a shield on the gate, a star on the Thane.
    const gate = start("FRONTIER_6");
    const gateView = viewForV7(gate, gate.humanPlayerId);
    const gateShown = shown(gateView);
    expect([gateShown.icon, gateShown.line, gateShown.counter]).toEqual([
      "defense",
      "Hold the Deep Gate for 14 turns.",
      "14 turns",
    ]);
    expect(gateShown.marks).toEqual([
      "DEFEND:TILE:the Deep Gate@5,6",
      "ESCORT:UNIT:the Thane@5,6",
    ]);
    expect(
      missionStarGoalsV7("FRONTIER_6", null).map((goal) => goal.text),
    ).toEqual(["Win the mission", "Lose no city", "Keep the Thane alive"]);
    expect(ended(gateView, "VICTORY", "SURVIVED")).toBe("You held out.");
    // The Deep Gate in an enemy's hands.
    const taker = required(
      gate.turnOrder.find((id) => id !== gate.humanPlayerId),
    );
    const fallen = viewForV7(
      {
        ...gate,
        cities: gate.cities.map((city) =>
          city.at.x === 5 && city.at.y === 6
            ? { ...city, ownerId: taker }
            : city,
        ),
      },
      gate.humanPlayerId,
    );
    expect(ended(fallen, "DEFEAT", "PLACE_LOST")).toBe("The Deep Gate fell.");
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
    // The campaign map again, and the prologue from its start.
    expect(document.querySelectorAll(".v7-campaign-plate")).toHaveLength(10);
    requiredButton('[data-action="campaign-open-frontier"]').click();
    await settle();
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(10);
    app.destroy();
  });

  it("resets progress only after confirmation", async () => {
    seedProgress({ FRONTIER_1: won(), FRONTIER_2: won() });
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
      window.localStorage.getItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7),
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
    requiredButton('[data-action="campaign-open-frontier"]').click();
    await settle();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-mission-card")].map(
        (card) => card.dataset.status,
      ),
    ).toEqual([
      "open",
      "locked",
      "locked",
      "locked",
      ...CHAPTER_ONE_V7.missions
        .slice(4)
        .map((entry) => (entry.planned === undefined ? "locked" : "soon")),
    ]);
    app.destroy();
  });
});

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

function requiredSelect(id: string): HTMLSelectElement {
  const node = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (node === null) throw new Error(`Missing #${id}`);
  return node;
}
