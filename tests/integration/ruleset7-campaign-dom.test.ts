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
  SAVE_STORAGE_KEY_V7,
} from "../../src/persistence/index";
import type { BoardHostV7 } from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  missionLostSaveV7,
  missionWonSaveV7,
  missionWinFixtureV7,
} from "../fixtures/v7-campaign-ui";

/**
 * The campaign screens (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md
 * sections 4 and 5): the Skirmish / Campaign switch, the mission list, the
 * briefing with its filtered faction choice, the mission label in Settings
 * and on the resume screen, the mission Victory and Defeat dialogs, the
 * unlock notice, and Reset progress.
 */
const AT = "2026-10-03T12:00:00.000Z";
const won = (bestRounds = 12) => ({ firstWonAt: AT, bestRounds });

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

function seedProgress(completed: Record<string, unknown>): void {
  window.localStorage.setItem(
    CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
    JSON.stringify({
      format: "pulp-wars-campaign-progress",
      version: 1,
      completed,
    }),
  );
}

async function openCampaign(): Promise<void> {
  requiredButton('[data-action="mode-campaign"]').click();
  await settle();
}

describe("Ruleset 7 campaign front screen", () => {
  it("defaults to Skirmish; the switch shows the campaign and back, keeping focus", async () => {
    const app = bootstrapRuleset7App(document);
    const skirmish = requiredButton('[data-action="mode-skirmish"]');
    expect(skirmish.getAttribute("aria-pressed")).toBe("true");
    expect(
      requiredButton('[data-action="mode-campaign"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("false");
    expect(
      document.querySelector('[role="group"][aria-label="Game mode"]'),
    ).not.toBeNull();
    expect(document.querySelector("[data-v7-setup]")).not.toBeNull();
    await openCampaign();
    expect(document.querySelector("[data-v7-setup]")).toBeNull();
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "mode-campaign",
    );
    expect(document.querySelector(".v7-campaign-title")?.textContent).toBe(
      "Chapter One: The Hollow Frontier",
    );
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(4);
    requiredButton('[data-action="mode-skirmish"]').click();
    await settle();
    expect(document.querySelector("[data-v7-setup]")).not.toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "mode-skirmish",
    );
    app.destroy();
  });

  it("shows each mission's state, emblems and accessible name from stored progress", async () => {
    seedProgress({ FRONTIER_1: won(14) });
    const app = bootstrapRuleset7App(document);
    await openCampaign();
    const cards = [
      ...document.querySelectorAll<HTMLButtonElement>(".v7-mission-card"),
    ];
    expect(cards.map((card) => card.dataset.status)).toEqual([
      "done",
      "open",
      "locked",
      "locked",
    ]);
    expect(cards.map((card) => card.getAttribute("aria-label"))).toEqual([
      "Mission 1, Goblins at the Gate, done, best 14 turns",
      "Mission 2, The Warrens, open",
      "Mission 3, Green Tide, locked",
      "Mission 4, Bone Neck, locked",
    ]);
    expect(cards[0]?.textContent).toContain("Best: 14 turns");
    expect(cards[1]?.textContent).toContain("Open");
    expect(cards[2]?.textContent).toContain("Win the previous mission");
    // Emblems: you lead, then the opponent (mission 4 offers two leaders).
    expect(
      cards.map((card) =>
        [...card.querySelectorAll<HTMLElement>(".v7-faction-emblem")].map(
          (emblem) => emblem.dataset.faction,
        ),
      ),
    ).toEqual([
      ["ORIGINAL", "GOBLIN"],
      ["ORIGINAL", "GOBLIN"],
      ["GOBLIN", "UNDEAD"],
      ["ORIGINAL", "GOBLIN", "UNDEAD"],
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
    // Eight since the Candy engine (pulp_wars-jdb.3); no mission unlocks the
    // Candy yet, so its entry stays dimmed.
    expect(roster).toHaveLength(8);
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

  it("keeps the switch, the cards and the briefing in keyboard reading order", async () => {
    const app = bootstrapRuleset7App(document);
    await openCampaign();
    const order = focusables().map(
      (node) => node.getAttribute("data-action") ?? node.tagName.toLowerCase(),
    );
    expect(order).toEqual([
      "mode-skirmish",
      "mode-campaign",
      "mission-frontier_1",
      "mission-frontier_2",
      "mission-frontier_3",
      "mission-frontier_4",
      "summary",
      // The Gallery entry (pulp_wars-ic8) stays on the campaign screen.
      "gallery",
      "a",
    ]);
    app.destroy();
  });

  it("opens the briefing with focus on its heading, and Back returns focus to the card", async () => {
    const app = bootstrapRuleset7App(document);
    await openCampaign();
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
    expect(briefing.querySelector(".v7-briefing-objective")?.textContent).toBe(
      "ObjectiveCapture every enemy city.",
    );
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
    ).toEqual([
      "mode-skirmish",
      "mode-campaign",
      "campaign-start",
      "campaign-back",
      "gallery",
      null,
    ]);
    requiredButton('[data-action="campaign-back"]').click();
    await settle();
    expect(document.querySelector("[data-v7-region='briefing']")).toBeNull();
    expect(document.activeElement?.getAttribute("data-action")).toBe(
      "mission-frontier_1",
    );
    app.destroy();
  });

  it("offers mission 4's choice filtered to unlocked factions and launches the chosen one", async () => {
    seedProgress({ FRONTIER_1: won(), FRONTIER_3: won() });
    const first = bootstrapRuleset7App(document);
    await openCampaign();
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
    await openCampaign();
    requiredButton('[data-action="mission-frontier_4"]').click();
    await settle();
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
    await openCampaign();
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
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="settings"]').click();
    expect(document.querySelector(".v7-mission-label")?.textContent).toBe(
      "Mission: Goblins at the Gate",
    );
    expect(document.querySelector(".v7-mission-objective")?.textContent).toBe(
      "Objective: Capture every enemy city.",
    );
    expect(document.querySelector(".v7-map-seed")).toBeNull();
    requiredButton('[data-action="close-overlay"]').click();
    requiredButton('[data-action="compact-menu"]').click();
    requiredButton('[data-action="main-menu"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    expect(document.querySelector(".v7-resume-summary")?.textContent).toBe(
      "Mission 1 · Goblins at the Gate · Turn 1",
    );
    // A new game from the resume screen replaces the saved mission.
    requiredButton('[data-action="show-replace"]').click();
    await settle();
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
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
  it("records a win before the dialog, announces the unlock, and Next mission opens its briefing", async () => {
    seedProgress({ FRONTIER_1: won(20) });
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      missionWonSaveV7(AT, "FRONTIER_2"),
    );
    const app = bootstrapRuleset7App(document);
    expect(app.controller.snapshot().phase).toBe("COMPLETE");
    await settle();
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.dataset.outcome).toBe("victory");
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission complete");
    expect(dialog.querySelector(".v7-campaign-story")?.textContent).toBe(
      CHAPTER_ONE_V7.missions[1]?.closing,
    );
    const notice = required(
      dialog.querySelector<HTMLElement>("[data-v7-region='unlock-notice']"),
    );
    expect(notice.dataset.faction).toBe("GOBLIN");
    expect(notice.textContent).toBe("New faction: Goblin");
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Next mission", "Campaign"]);
    expect(
      JSON.parse(
        window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "",
      ).completed,
    ).toMatchObject({ FRONTIER_1: won(20), FRONTIER_2: {} });
    requiredButton('[data-action="campaign-next"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "EMPTY");
    await settle();
    expect(window.localStorage.getItem(SAVE_STORAGE_KEY_V7)).toBeNull();
    const briefing = required(
      document.querySelector<HTMLElement>("[data-v7-region='briefing']"),
    );
    expect(briefing.dataset.missionId).toBe("FRONTIER_3");
    expect(briefing.querySelector("h2")?.textContent).toBe("Green Tide");
    expect(document.activeElement?.id).toBe("v7-briefing-title");
    expect(document.querySelector(".v7-briefing-lead-text")?.textContent).toBe(
      "You leadGoblin",
    );
    // The campaign list now shows the Goblin unlocked.
    requiredButton('[data-action="campaign-back"]').click();
    await settle();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-campaign-faction")]
        .filter((entry) => entry.dataset.unlocked === "true")
        .map((entry) => entry.dataset.faction),
    ).toEqual(["ORIGINAL", "GOBLIN"]);
    app.destroy();
  }, 60_000);

  it("Campaign from a Victory without an unlock returns to the updated list", async () => {
    const fixture = missionWinFixtureV7("FRONTIER_1");
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      missionWonSaveV7(AT, "FRONTIER_1"),
    );
    const next = bootstrapRuleset7App(document);
    await settle();
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.querySelector("[data-v7-region='unlock-notice']")).toBeNull();
    expect(
      JSON.parse(
        window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ?? "",
      ).completed.FRONTIER_1.bestRounds,
    ).toBe(fixture.after.state.round);
    requiredButton('[data-action="campaign-menu"]').click();
    await waitUntil(() => next.controller.snapshot().phase === "EMPTY");
    await settle();
    expect(document.querySelector("[data-v7-campaign]")).not.toBeNull();
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-mission-card")].map(
        (card) => card.dataset.status,
      ),
    ).toEqual(["done", "open", "locked", "locked"]);
    next.destroy();
  }, 60_000);

  it("a lost mission records nothing, and Retry restarts the same mission", async () => {
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      missionLostSaveV7(AT, "FRONTIER_1"),
    );
    const app = bootstrapRuleset7App(document);
    expect(app.controller.snapshot().phase).toBe("COMPLETE");
    await settle();
    const dialog = required(
      document.querySelector<HTMLElement>("[data-v7-region='results']"),
    );
    expect(dialog.dataset.outcome).toBe("defeat");
    expect(dialog.querySelector("h2")?.textContent).toBe("Mission failed");
    expect(dialog.querySelector("[data-v7-region='unlock-notice']")).toBeNull();
    expect(
      window.localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7),
    ).toBeNull();
    requiredButton('[data-action="mission-retry"]').click();
    await waitUntil(
      () =>
        app.controller.snapshot().phase === "ACTIVE" &&
        !app.controller.snapshot().transitioning,
    );
    expect(app.controller.snapshot().view).toMatchObject({
      commandIndex: 0,
      setup: { mapType: "MISSION", mission: { id: "FRONTIER_1" } },
    });
    app.destroy();
  });

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
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Retry", "Campaign"]);
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

  it("after the last mission: the unlock, To be continued…, and only Campaign", () => {
    const fake = new FakeController(
      completeView("FRONTIER_4", "GOBLIN", (view) => ({
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
        },
        lastWin: {
          missionId: "FRONTIER_4",
          firstWin: true,
          unlocked: ["UNDEAD"],
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
    ).toBe("New faction: Undead");
    expect(dialog.querySelector(".v7-campaign-outro")?.textContent).toBe(
      "To be continued…",
    );
    expect(
      [...dialog.querySelectorAll("button")].map((node) => node.textContent),
    ).toEqual(["Campaign"]);
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
    expect(document.querySelectorAll(".v7-mission-card")).toHaveLength(4);
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
      [...document.querySelectorAll<HTMLElement>(".v7-mission-card")].map(
        (card) => card.dataset.status,
      ),
    ).toEqual(["open", "locked", "locked", "locked"]);
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
  ) {
    this.#snapshot = snapshotOf("COMPLETE", view);
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
  mount(container: HTMLElement): void {
    container.append(document.createElement("canvas"));
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function mount(controller: Ruleset7ControllerPortV7): Ruleset7DomAppView {
  const root = required(document.querySelector<HTMLElement>("#app"));
  return new Ruleset7DomAppView(document, root, controller, {
    boardHost: new NullBoardHost(),
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

async function settle(): Promise<void> {
  for (let index = 0; index < 5; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}

function requiredButton(selector: string): HTMLButtonElement {
  const node = document.querySelector<HTMLButtonElement>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function requiredSelect(id: string): HTMLSelectElement {
  const node = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (node === null) throw new Error(`Missing #${id}`);
  return node;
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required value missing");
  return value;
}
