// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  queryStarGradeV7,
  viewForV7,
  type GameStateV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import {
  Ruleset7BrowserController,
  type Ruleset7AcceptedBoundary,
  type Ruleset7BrowserSnapshot,
  type Ruleset7TribeStarsV7,
} from "../../src/app/index";
import type {
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  TRIBE_STARS_STORAGE_KEY_V7,
  type StorageAdapter,
} from "../../src/persistence/index";
import { GAME_MODE_STORAGE_KEY_V7 } from "../../src/app/game-mode-preference-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";

/**
 * The new-game screen's mode toggle and tribe grid, and the star award at
 * the end of a match (`pulp_wars-kaw6.4`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md sections 6 to 8, test 8). No
 * match is played: the setup is read from the launch, and the end of a
 * match is a hand-built state won by one capture.
 */
const AT = "2026-10-08T12:00:00.000Z";
const record = (stars: 1 | 2 | 3, glow = false, bestRating = 1.5) => ({
  stars,
  glow,
  bestRating,
  firstAt: AT,
  updatedAt: AT,
});
const RECORDS = {
  format: "pulp-wars-tribe-stars",
  version: 1,
  modes: {
    DOMINATION: {
      GOBLIN: record(2),
      DWARF: record(3, true),
    },
    PERFECTION: { UNDEAD: record(1) },
  },
} as const;

class Host implements BoardHostV7 {
  model: BoardHostModelV7 | null = null;
  mount(container: HTMLElement): void {
    container.replaceChildren(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  destroy(): void {}
}

class MemoryStorage implements StorageAdapter {
  readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function idleAi(): Ruleset7BrowserSnapshot["ai"] {
  return {
    active: false,
    fastForward: false,
    policySlices: 0,
    acceptedCommands: 0,
    lastSliceMilliseconds: 0,
    maximumSliceMilliseconds: 0,
  };
}

/**
 * A port over a real controller's tribe stars (so storage is the real
 * store) that records launches instead of starting a match, or shows a
 * fixed finished state.
 */
class StarsController implements Ruleset7ControllerPortV7 {
  readonly launched: MatchSetupV7[] = [];
  readonly #stars: Ruleset7BrowserController;
  readonly #snapshot: Ruleset7BrowserSnapshot;
  award: Ruleset7TribeStarsV7["lastAward"] = null;

  constructor(storage: StorageAdapter | null, finished?: GameStateV7) {
    this.#stars = new Ruleset7BrowserController({ storage });
    const view =
      finished === undefined
        ? null
        : viewForV7(finished, finished.humanPlayerId);
    this.#snapshot = {
      phase: view === null ? "EMPTY" : "COMPLETE",
      view,
      offeredCommands: [],
      savedAt: null,
      hasStoredSave: false,
      recovery: null,
      saveWarning: null,
      diagnostic: null,
      transitioning: false,
      ai: idleAi(),
    };
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    subscriber(this.#snapshot);
    return () => undefined;
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    void subscriber;
    return () => undefined;
  }
  tribeStars(): Ruleset7TribeStarsV7 {
    return { ...this.#stars.tribeStars(), lastAward: this.award };
  }
  resetTribeStars(): boolean {
    return this.#stars.resetTribeStars();
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async (setup) => {
    this.launched.push(setup);
    return { ok: false, code: "INVALID_SETUP", diagnostic: "Recorded" };
  };
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
  readonly dispatch: Ruleset7ControllerPortV7["dispatch"] = async () => ({
    accepted: false,
    reason: "NOT_OFFERED",
  });
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] =
    async () => ({
      ok: false,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "No AI",
    });
  readonly restart: Ruleset7ControllerPortV7["restart"] = async () => ({
    ok: false,
    code: "CONTROLLER_DESTROYED",
    diagnostic: "No restart",
  });
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    async () => false;
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] =
    () => {};
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = () =>
    null;
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    () => ({ ok: false, reason: "NO_ACTIVE_MATCH" });
  destroy(): void {
    this.#stars.destroy();
  }
}

let view: Ruleset7DomAppView | null = null;
let controller: StarsController | null = null;

function mount(
  storage: StorageAdapter | null,
  options: {
    readonly finished?: GameStateV7;
    readonly settings?: StorageAdapter | null;
  } = {},
): StarsController {
  document.body.innerHTML = '<div id="app"></div>';
  controller = new StarsController(storage, options.finished);
  view = new Ruleset7DomAppView(document, required("#app"), controller, {
    boardHost: new Host(),
    settingsStorage: options.settings ?? null,
    randomSeed: () => 7,
  });
  return controller;
}

function seeded(source: unknown = RECORDS): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem(
    TRIBE_STARS_STORAGE_KEY_V7,
    typeof source === "string" ? source : JSON.stringify(source),
  );
  return storage;
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function press(action: string): void {
  required<HTMLButtonElement>(`[data-action="${action}"]`).click();
}

function cards(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>(".v7-tribe-card")];
}

function card(faction: string): HTMLButtonElement {
  return required<HTMLButtonElement>(
    `.v7-tribe-card[data-faction="${faction}"]`,
  );
}

function filled(node: Element): number {
  return node.querySelectorAll('.v7-star[data-filled="true"]').length;
}

function key(name: string): void {
  (document.activeElement ?? document.body).dispatchEvent(
    new KeyboardEvent("keydown", {
      key: name,
      bubbles: true,
      cancelable: true,
    }),
  );
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 400; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Condition not reached");
}

/** A hand-built two-seat Goblin win by one capture (no match is played). */
function wonMatch(rivalPeak: number, flawless: boolean): GameStateV7 {
  const at = (x: number, y: number) => ({ x, y });
  const base = goblinArenaV7(
    ["GOBLIN", "UNDEAD"],
    [{ seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true }],
    { techs: { 1: [] } },
  );
  const human = seatIdV7(base, 0);
  const rival = seatIdV7(base, 1);
  const state = checkedV7({
    ...base,
    round: 12,
    scoreLedger: base.scoreLedger.map((entry) =>
      entry.playerId === rival
        ? { ...entry, peakScore: rivalPeak }
        : { ...entry, flawless },
    ),
  });
  return applyOkV7(state, human, {
    kind: "CAPTURE",
    unitId: unitAtV7(state, at(2, 8)).id,
  }).state;
}

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  view?.destroy();
  controller?.destroy();
  view = null;
  controller = null;
});

describe("Ruleset 7 new game: mode toggle and tribe grid", () => {
  it("replaces the faction dropdown with a radio grid of all eight tribes and their stars", () => {
    mount(seeded());
    press("new-game");
    const grid = required(".v7-tribe-grid");
    expect(grid.getAttribute("role")).toBe("radiogroup");
    expect(
      document.getElementById(grid.getAttribute("aria-labelledby") ?? "")
        ?.textContent,
    ).toBe("Your tribe");
    expect(cards().map((node) => node.dataset.faction)).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ]);
    for (const node of cards()) {
      expect(node.getAttribute("role")).toBe("radio");
      expect(node.querySelector(".v7-faction-emblem")).not.toBeNull();
      expect(node.querySelectorAll(".v7-star")).toHaveLength(3);
    }
    // The visible "Your faction" select is gone; its hidden value remains.
    expect(required("#v7-faction-0").closest("[hidden]")).not.toBeNull();
    expect(required("#v7-faction-1").closest("[hidden]")).toBeNull();
    expect(card("GOBLIN").getAttribute("aria-label")).toBe(
      "Goblin, 2 of 3 stars in Domination",
    );
    expect(filled(card("GOBLIN"))).toBe(2);
    expect(card("DWARF").getAttribute("aria-label")).toBe(
      "Dwarf, 3 of 3 stars in Domination, flawless",
    );
    expect(card("DWARF").dataset.glow).toBe("true");
    expect(card("UNDEAD").getAttribute("aria-label")).toBe(
      "Undead, 0 of 3 stars in Domination",
    );
    expect(filled(card("UNDEAD"))).toBe(0);
    // Nothing explains the glow before it is earned.
    expect(required(".v7-setup-form").textContent).not.toMatch(/flawless/i);
    // One "mode" on the screen: the AI select is "Alliances".
    expect(
      required("#v7-ai-mode").closest("label")?.firstChild?.textContent,
    ).toBe("Alliances");
  });

  it("switches every card to the selected mode's records and remembers the mode", () => {
    const settings = new MemoryStorage();
    mount(seeded(), { settings });
    press("new-game");
    expect(
      required('[data-action="game-mode-domination"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(required(".v7-game-mode-line").textContent).toBe(
      "Win by taking every rival's last city.",
    );
    press("game-mode-perfection");
    expect(
      required('[data-action="game-mode-perfection"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(required(".v7-game-mode-line").textContent).toBe(
      "30 rounds. The highest score wins.",
    );
    expect(card("UNDEAD").getAttribute("aria-label")).toBe(
      "Undead, 1 of 3 stars in Perfection",
    );
    expect(card("GOBLIN").getAttribute("aria-label")).toBe(
      "Goblin, 0 of 3 stars in Perfection",
    );
    expect(card("DWARF").dataset.glow).toBe("false");
    expect(settings.getItem(GAME_MODE_STORAGE_KEY_V7)).toBe("PERFECTION");
    // A new screen starts in the remembered mode.
    view?.destroy();
    mount(seeded(), { settings });
    press("new-game");
    expect(
      required('[data-action="game-mode-perfection"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
  });

  it("explains the stars for the current opponent count behind the info button", () => {
    mount(seeded());
    press("new-game");
    const info = required('[data-action="star-rules"]');
    expect(info.getAttribute("aria-label")).toBe("How stars are earned");
    expect(required("#v7-star-rules").hidden).toBe(true);
    info.click();
    expect(info.getAttribute("aria-expanded")).toBe("true");
    expect(required("#v7-star-rules").textContent).toContain(
      "★★ Win with 2 times the best rival's score.",
    );
    const count = required<HTMLSelectElement>("#v7-ai-count");
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(required("#v7-star-rules").textContent).toContain(
      "★★ Win with 1.5 times the best rival's score.",
    );
  });

  it("moves with the arrow keys, picks with Enter or Space, and keeps one tab stop", () => {
    mount(seeded());
    press("new-game");
    expect(cards().filter((node) => node.tabIndex === 0)).toEqual([
      card("ORIGINAL"),
    ]);
    card("ORIGINAL").focus();
    key("ArrowRight");
    expect(document.activeElement).toBe(card("UNDEAD"));
    expect(card("ORIGINAL").getAttribute("aria-checked")).toBe("true");
    key("ArrowLeft");
    key("ArrowLeft");
    expect(document.activeElement).toBe(card("CANDY"));
    key("Home");
    key("ArrowRight");
    expect(document.activeElement).toBe(card("UNDEAD"));
    expect(cards().filter((node) => node.tabIndex === 0)).toEqual([
      card("UNDEAD"),
    ]);
    // A button's Enter and Space are its click.
    card("UNDEAD").click();
    expect(card("UNDEAD").getAttribute("aria-checked")).toBe("true");
    expect(card("ORIGINAL").getAttribute("aria-checked")).toBe("false");
    expect(required<HTMLSelectElement>("#v7-faction-0").value).toBe("UNDEAD");
    // The opponent who played the Undead moves to a free tribe.
    expect(required<HTMLSelectElement>("#v7-faction-1").value).toBe("ORIGINAL");
    expect(document.activeElement).toBe(card("UNDEAD"));
  });

  it("starts a Perfection game from the picker with gameMode PERFECTION", async () => {
    const chosen = mount(seeded());
    press("new-game");
    press("game-mode-perfection");
    card("DWARF").click();
    press("launch");
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]).toMatchObject({
      gameMode: "PERFECTION",
      factions: ["DWARF", "UNDEAD"],
      mapType: "CONTINENTS",
    });
    press("game-mode-domination");
    press("launch");
    await waitUntil(() => chosen.launched.length === 2);
    expect(chosen.launched[1]?.gameMode).toBe("DOMINATION");
  });

  it("greys the stars and disables Perfection for the Showcase, which launches Domination", async () => {
    const chosen = mount(seeded());
    press("new-game");
    press("game-mode-perfection");
    const map = required<HTMLSelectElement>("#v7-map-type");
    map.value = "SHOWCASE";
    map.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      required<HTMLButtonElement>('[data-action="game-mode-perfection"]')
        .disabled,
    ).toBe(true);
    expect(
      required('[data-action="game-mode-domination"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    expect(required(".v7-tribe-picker").dataset.records).toBe("off");
    expect(required(".v7-tribe-records-note").textContent).toBe(
      "The Showcase records no stars.",
    );
    press("launch");
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]).toMatchObject({
      mapType: "SHOWCASE",
      gameMode: "DOMINATION",
    });
    // The player's Perfection choice comes back with another map.
    const next = required<HTMLSelectElement>("#v7-map-type");
    next.value = "PANGEA";
    next.dispatchEvent(new Event("change", { bubbles: true }));
    expect(
      required('[data-action="game-mode-perfection"]').getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
  });

  it("shows unreadable records as none, with a Reset that clears them", () => {
    const storage = seeded("{ not json");
    mount(storage);
    press("new-game");
    expect(required(".v7-tribe-picker").dataset.records).toBe("off");
    expect(required(".v7-tribe-records-note").textContent).toContain(
      "Tribe records can't be read.",
    );
    for (const node of cards()) expect(filled(node)).toBe(0);
    press("tribe-stars-reset-unreadable");
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).toBeNull();
    expect(required(".v7-tribe-picker").dataset.records).toBe("on");
    expect(required(".v7-tribe-records-note").hidden).toBe(true);
  });

  it("still works when storage is blocked", async () => {
    const blocked: StorageAdapter = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    const chosen = mount(blocked, { settings: blocked });
    press("new-game");
    expect(cards()).toHaveLength(8);
    expect(required(".v7-tribe-records-note").textContent).toBe(
      "Tribe stars can't be saved in this browser.",
    );
    press("game-mode-perfection");
    card("GOBLIN").click();
    press("launch");
    await waitUntil(() => chosen.launched.length === 1);
    expect(chosen.launched[0]).toMatchObject({
      gameMode: "PERFECTION",
      factions: ["GOBLIN", "UNDEAD"],
    });
  });

  it("resets every tribe's stars from Settings behind a confirmation", () => {
    const storage = seeded();
    mount(storage);
    press("front-settings");
    press("tribe-stars-reset");
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).not.toBeNull();
    press("tribe-stars-reset-cancel");
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).not.toBeNull();
    press("tribe-stars-reset");
    press("tribe-stars-reset-confirm");
    expect(storage.getItem(TRIBE_STARS_STORAGE_KEY_V7)).toBeNull();
  });
});

describe("Ruleset 7 game end: the tribe record in the grade panel", () => {
  function awarded(
    finished: GameStateV7,
    award: Ruleset7TribeStarsV7["lastAward"],
  ): void {
    const chosen = mount(null, { finished });
    chosen.award = award;
    view?.destroy();
    view = new Ruleset7DomAppView(document, required("#app"), chosen, {
      boardHost: new Host(),
      settingsStorage: null,
    });
  }

  it('folds "New best" into the one grade panel, with no second set of stars', () => {
    const finished = wonMatch(20, true);
    const graded = queryStarGradeV7(
      viewForV7(finished, finished.humanPlayerId),
    );
    if (graded === null) throw new Error("not graded");
    expect(graded.grade).toMatchObject({ stars: 3, glow: true });
    awarded(finished, {
      result: {
        gameMode: "DOMINATION",
        faction: "GOBLIN",
        stars: 3,
        glow: true,
        ratingHundredths: graded.grade.rating.hundredths,
      },
      before: null,
      improved: true,
      saved: true,
    });
    const panel = required('[data-v7-region="grade"]');
    expect(document.querySelectorAll('[data-v7-region="grade"]')).toHaveLength(
      1,
    );
    expect(panel.dataset).toMatchObject({ stars: "3", glow: "true" });
    const record = required('[data-v7-region="star-record"]');
    expect(record.closest('[data-v7-region="grade"]')).toBe(panel);
    expect(record.textContent).toBe("New best for the Goblins in Domination");
    // One set of stars on the end screen: the grade panel's.
    expect(
      required('[data-v7-region="results"]').querySelectorAll(
        ".v7-grade-stars",
      ),
    ).toHaveLength(1);
  });

  it("shows no record line when nothing improved, and notes unsaved stars", () => {
    const finished = wonMatch(240, false);
    const graded = queryStarGradeV7(
      viewForV7(finished, finished.humanPlayerId),
    );
    expect(graded?.grade).toMatchObject({ stars: 2, glow: false });
    const result = {
      gameMode: "DOMINATION" as const,
      faction: "GOBLIN" as const,
      stars: 2 as const,
      glow: false,
      ratingHundredths: graded?.grade.rating.hundredths ?? 0,
    };
    awarded(finished, { result, before: null, improved: false, saved: true });
    expect(required('[data-v7-region="grade"]').dataset.stars).toBe("2");
    expect(document.querySelector('[data-v7-region="star-record"]')).toBeNull();
    awarded(finished, { result, before: null, improved: false, saved: false });
    expect(required('[data-v7-region="star-record"]').textContent).toBe(
      "Stars couldn't be saved in this browser.",
    );
  });

  it("shows no grade or record for a defeat", () => {
    const won = wonMatch(20, true);
    const rival = won.players.find((player) => player.id !== won.humanPlayerId);
    if (rival === undefined) throw new Error("no rival");
    mount(null, {
      finished: {
        ...won,
        outcome: {
          kind: "DEFEAT",
          humanId: won.humanPlayerId,
          defeatedByPlayerId: rival.id,
        },
      },
    });
    expect(required('[data-v7-region="results"]').dataset.outcome).toBe(
      "defeat",
    );
    expect(document.querySelector('[data-v7-region="grade"]')).toBeNull();
    expect(document.querySelector('[data-v7-region="star-record"]')).toBeNull();
  });
});
