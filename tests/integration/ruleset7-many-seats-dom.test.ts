// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import {
  bootstrapRuleset7App,
  type Ruleset7AcceptedBoundary,
  type Ruleset7BrowserSnapshot,
} from "../../src/app/index";
import {
  FACTION_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  allowedBoardSizesV7,
  createPlayableGameV7,
  createReplayV7,
  crowdedBoardV7,
  queryPlayerCommandsV7,
  viewForV7,
  type MatchSetupV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7 } from "../../src/persistence/v7";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { FACTION_COLOURS_V7 } from "../../src/render/canvas/faction-colours-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";

/**
 * Many players in the browser (`pulp_wars-ykw.5`,
 * docs/product/RULESET_7_MAP_SCALE.md sections 6.3, 8.5 and 10.3): the
 * setup offers up to one opponent per other faction and only the sizes the
 * engine allows; the match shows the turn order and every player.
 */

const SEATS = FACTION_IDS_V7.length;
const MOST_OPPONENTS = SEATS - 1;

const SETUP: MatchSetupV7 = {
  rulesetId: RULESET_7_ID,
  seed: 5,
  width: 11,
  height: 11,
  aiCount: MOST_OPPONENTS,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: [...FACTION_IDS_V7],
  mapType: "DRY_LAND",
  mapGenerationRevision: MAP_GENERATION_REVISION_V7,
  curiosities: false,
};

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 setup for many players", () => {
  it("offers one opponent per other faction and one faction cell per seat", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    expect(optionValues("#v7-ai-count")).toEqual(
      Array.from({ length: MOST_OPPONENTS }, (_, index) => String(index + 1)),
    );
    choose("#v7-ai-count", String(MOST_OPPONENTS));
    const cells = [...document.querySelectorAll<HTMLElement>(".v7-setup-seat")];
    expect(cells).toHaveLength(SEATS);
    // Every seat a different faction, each with its emblem in its colour.
    expect(cells.map((cell) => cell.dataset.faction)).toEqual([
      ...FACTION_IDS_V7,
    ]);
    for (const cell of cells) {
      const faction = cell.dataset.faction as (typeof FACTION_IDS_V7)[number];
      expect(cell.querySelector(".v7-faction-emblem")).not.toBeNull();
      expect(cell.style.getPropertyValue("--player")).toBe(
        FACTION_COLOURS_V7[faction],
      );
      expect(cell.querySelector("select")?.value).toBe(faction);
    }
    // With every faction taken an opponent has nothing free to switch to.
    const opponent = required<HTMLSelectElement>("#v7-faction-3");
    expect(
      [...opponent.options].filter((option) => !option.disabled),
    ).toHaveLength(1);
    // The human takes an opponent's faction: they swap, and the emblems
    // follow in place (the selects are not replaced).
    const own = required<HTMLSelectElement>("#v7-faction-0");
    choose("#v7-faction-0", "DWARF");
    expect(required<HTMLSelectElement>("#v7-faction-0")).toBe(own);
    const after = [
      ...document.querySelectorAll<HTMLElement>(".v7-setup-seat"),
    ].map((cell) => cell.dataset.faction);
    expect(after[0]).toBe("DWARF");
    expect(new Set(after).size).toBe(SEATS);
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-setup-seat")].map(
        (cell) =>
          cell.querySelector<HTMLElement>(".v7-faction-emblem")?.dataset
            .faction,
      ),
    ).toEqual(after);
    app.destroy();
  });

  it("offers only the sizes the engine allows and marks the crowded ones", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    for (const mapType of ["DRY_LAND", "LAKES", "ARCHIPELAGO"] as const)
      for (const opponents of [1, 3, MOST_OPPONENTS]) {
        choose("#v7-ai-count", String(opponents));
        choose("#v7-map-type", mapType);
        const allowed = allowedBoardSizesV7(mapType, opponents + 1);
        expect(optionValues("#v7-board-size")).toEqual(allowed.map(String));
        const select = required<HTMLSelectElement>("#v7-board-size");
        for (const option of [...select.options]) {
          const crowded = crowdedBoardV7(
            Number(option.value),
            mapType,
            opponents + 1,
          );
          expect(option.dataset.crowded).toBe(String(crowded));
          expect(option.textContent).toBe(
            `${option.value} × ${option.value}${crowded ? " · Crowded" : ""}`,
          );
        }
      }
    app.destroy();
  });

  it("shows the Crowded mark and the villages of the chosen size", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    choose("#v7-ai-count", String(MOST_OPPONENTS));
    choose("#v7-map-type", "DRY_LAND");
    choose("#v7-board-size", "11");
    const chip = required<HTMLElement>(".v7-crowded-chip");
    expect(chip.hidden).toBe(false);
    expect(chip.textContent).toBe("Crowded");
    expect(chip.querySelector("svg")).not.toBeNull();
    expect(chip.title).toBe("Few or no villages. Expect early fighting.");
    expect(required(".v7-setup-villages").textContent).toBe("No villages");
    choose("#v7-board-size", "25");
    expect(required<HTMLElement>(".v7-crowded-chip").hidden).toBe(true);
    expect(required(".v7-setup-villages").textContent).toMatch(
      /^Up to \d+ villages$/,
    );
    // No tile coordinates and no long sentence on the line.
    expect(required(".v7-setup-size-info").textContent).not.toMatch(/\d, \d/);
    app.destroy();
  });

  it("moves a size that stops being legal to the nearest legal one and says so", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    choose("#v7-map-type", "LAKES");
    choose("#v7-board-size", "11");
    expect(required<HTMLElement>(".v7-setup-note").hidden).toBe(true);
    const size = required<HTMLSelectElement>("#v7-board-size");
    const count = required<HTMLSelectElement>("#v7-ai-count");
    count.focus();
    choose("#v7-ai-count", "2");
    const smallest = allowedBoardSizesV7("LAKES", 3)[0];
    expect(smallest).toBeGreaterThan(11);
    // Updated in place: the same controls, focus where it was.
    expect(required<HTMLSelectElement>("#v7-board-size")).toBe(size);
    expect(document.activeElement).toBe(count);
    expect(size.value).toBe(String(smallest));
    expect(size.dataset.moved).toBe("true");
    const note = required<HTMLElement>(".v7-setup-note");
    expect(note.hidden).toBe(false);
    expect(note.getAttribute("role")).toBe("status");
    expect(note.textContent).toBe(`Size changed to ${smallest} × ${smallest}.`);
    // The next change that moves nothing clears the note.
    choose("#v7-ai-mode", "COOPERATIVE");
    expect(required<HTMLElement>(".v7-setup-note").hidden).toBe(true);
    expect(size.dataset.moved).toBe("false");
    expect(size.value).toBe(String(smallest));
    app.destroy();
  });

  it("disables a map that cannot take the players, with a short reason", () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    const map = required<HTMLSelectElement>("#v7-map-type");
    const showcase = (): HTMLOptionElement =>
      required<HTMLOptionElement>('#v7-map-type option[value="SHOWCASE"]');
    expect(showcase().disabled).toBe(false);
    expect(showcase().textContent).toBe("Showcase");
    choose("#v7-map-type", "SHOWCASE");
    // More opponents than the Showcase holds: the map moves, visibly.
    choose("#v7-ai-count", "4");
    expect(map.value).toBe("CONTINENTS");
    expect(map.dataset.moved).toBe("true");
    expect(showcase().disabled).toBe(true);
    expect(showcase().textContent).toBe("Showcase (up to 3 opponents)");
    expect(required(".v7-setup-note").textContent).toBe(
      "Map changed to Continents.",
    );
    expect(required<HTMLSelectElement>("#v7-board-size").disabled).toBe(false);
    // Every generated map stays on offer at every opponent count.
    choose("#v7-ai-count", String(MOST_OPPONENTS));
    expect(
      [...map.options]
        .filter((option) => option.disabled)
        .map((option) => option.value),
    ).toEqual(["SHOWCASE"]);
    choose("#v7-ai-count", "3");
    expect(showcase().disabled).toBe(false);
    expect(showcase().textContent).toBe("Showcase");
    app.destroy();
  });

  it("launches the most players on the smallest Dry Land board", async () => {
    const app = bootstrapRuleset7App(document, { storage: null });
    choose("#v7-ai-count", String(MOST_OPPONENTS));
    choose("#v7-map-type", "DRY_LAND");
    choose("#v7-board-size", "11");
    required<HTMLButtonElement>('[data-action="seed-mode-seed"]').click();
    required<HTMLInputElement>("#v7-seed").value = "5";
    required<HTMLButtonElement>('[data-action="launch"]').click();
    await waitUntil(() => {
      const snapshot = app.controller.snapshot();
      const view = snapshot.view;
      return (
        snapshot.phase === "ACTIVE" &&
        view !== null &&
        !snapshot.ai.active &&
        view.turnOrder[view.activeSeatIndex] === view.humanPlayerId
      );
    });
    const view = required_(app.controller.snapshot().view);
    expect(view.setup).toMatchObject({
      aiCount: MOST_OPPONENTS,
      width: 11,
      height: 11,
      mapType: "DRY_LAND",
      seed: 5,
    });
    expect(view.players).toHaveLength(SEATS);
    expect(new Set(view.players.map((player) => player.faction)).size).toBe(
      SEATS,
    );
    // The turn-order strip: every player once, in turn order, the human's
    // turn ringed.
    const chips = [...document.querySelectorAll<HTMLElement>(".v7-turn-chip")];
    expect(chips.map((chip) => Number(chip.dataset.seat))).toEqual(
      view.turnOrder.map(
        (id) => view.players.find((player) => player.id === id)?.seat,
      ),
    );
    expect(chips.filter((chip) => chip.dataset.active === "true")).toHaveLength(
      1,
    );
    expect(
      chips.find((chip) => chip.dataset.active === "true")?.dataset.viewer,
    ).toBe("true");
    expect(required(".v7-turn-strip-count").textContent).toBe(
      `${view.activeSeatIndex + 1}/${SEATS}`,
    );
    // Nothing in the strip takes focus, and nothing names a tile.
    expect(
      required(".v7-turn-strip").querySelector("button, a, [tabindex]"),
    ).toBeNull();
    expect(required(".v7-turn-strip").textContent).not.toMatch(/\d, \d/);
    app.destroy();
  });
});

describe("Ruleset 7 interface with eight players", () => {
  it("resumes an eight-player match and lists every player in its faction colour", async () => {
    const created = createPlayableGameV7(SETUP);
    if (!created.ok) throw new Error(created.error.code);
    window.localStorage.setItem(
      SAVE_STORAGE_KEY_V7,
      JSON.stringify(
        createSaveEnvelopeV7(
          { state: created.state, replay: createReplayV7(SETUP) },
          "2026-10-05T10:00:00.000Z",
        ),
      ),
    );
    const app = bootstrapRuleset7App(document);
    await waitUntil(() => app.controller.snapshot().phase === "RESUMABLE");
    // The resume summary names the player count.
    expect(required(".v7-resume-summary").textContent).toContain(
      ` · ${SEATS} players · Dry land`,
    );
    required<HTMLButtonElement>('[data-action="resume"]').click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(document.querySelector(".v7-match-root")).not.toBeNull();
    const view = app.controller.snapshot().view;
    if (view === null) throw new Error("public view missing");
    expect(view.players).toHaveLength(SEATS);
    expect(view.leaderboard).toHaveLength(SEATS);
    expect(document.querySelectorAll(".v7-turn-chip")).toHaveLength(SEATS);
    if (document.querySelector('[data-action="leaderboard"]') === null)
      required<HTMLButtonElement>('[data-action="compact-menu"]').click();
    required<HTMLButtonElement>('[data-action="leaderboard"]').click();
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-leaderboard-row"),
    ];
    expect(rows).toHaveLength(SEATS);
    const colours = rows.map((row) => row.style.getPropertyValue("--player"));
    expect(colours).toEqual(
      view.leaderboard.map((entry) => FACTION_COLOURS_V7[entry.faction]),
    );
    // Eight factions, eight different owner colours.
    expect(new Set(colours).size).toBe(SEATS);
    // The player whose turn it is carries the mark.
    expect(rows.filter((row) => row.dataset.active === "true")).toHaveLength(1);
    app.destroy();
  });

  it("shows whose turn it is among the opponents and crosses out a player who is out", () => {
    const base = openingView();
    const humanIndex = base.turnOrder.indexOf(base.humanPlayerId);
    // The second opponent after the human is playing; the first is out.
    const order = [
      ...base.turnOrder.slice(humanIndex + 1),
      ...base.turnOrder.slice(0, humanIndex),
    ];
    const outId = order[0];
    const activeId = order[1];
    const view: PlayerViewV7 = {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(required_(activeId)),
      players: base.players.map((player) =>
        player.id === outId ? { ...player, status: "ELIMINATED" } : player,
      ),
      leaderboard: base.leaderboard.map((entry) =>
        entry.playerId === outId
          ? { ...entry, status: "ELIMINATED", cityCount: 0, livingUnitCount: 0 }
          : entry,
      ),
    };
    const app = mount(
      new StaticController({
        ...snapshotOf(view),
        offeredCommands: [],
        ai: { ...idleAi(), active: true },
      }),
    );
    const active = required_(
      view.players.find((player) => player.id === activeId),
    );
    const status = required<HTMLElement>(".v7-turn-status");
    // Six opponents are still in; this is the first of them to play.
    expect(status.textContent).toMatch(
      new RegExp(
        `^Player ${active.seat + 1} \\(.+\\) is playing… \\(1 of ${SEATS - 2}\\)$`,
      ),
    );
    expect(status.querySelector(".v7-turn-place")?.textContent).toBe(
      ` (1 of ${SEATS - 2})`,
    );
    const chips = [...document.querySelectorAll<HTMLElement>(".v7-turn-chip")];
    expect(chips).toHaveLength(SEATS);
    const out = chips.filter((chip) => chip.dataset.status === "eliminated");
    expect(out).toHaveLength(1);
    expect(out[0]?.textContent).toMatch(/, out$/);
    const playing = chips.filter((chip) => chip.dataset.active === "true");
    expect(playing).toHaveLength(1);
    expect(Number(playing[0]?.dataset.seat)).toBe(active.seat);
    expect(playing[0]?.getAttribute("aria-current")).toBe("true");
    expect(playing[0]?.textContent).toMatch(/, playing now$/);
    // The Fast Forward control stays with the status.
    expect(
      document.querySelector('[data-action="fast-forward"]'),
    ).not.toBeNull();
    app.destroy();
  });

  it("lists every player at the end of the game", () => {
    const base = openingView();
    const view: PlayerViewV7 = {
      ...base,
      outcome: { kind: "VICTORY", winnerId: base.humanPlayerId },
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? player
          : { ...player, status: "ELIMINATED" },
      ),
      leaderboard: base.leaderboard.map((entry) =>
        entry.isViewer
          ? entry
          : {
              ...entry,
              status: "ELIMINATED",
              cityCount: 0,
              livingUnitCount: 0,
            },
      ),
    };
    const app = mount(
      new StaticController({
        ...snapshotOf(view),
        phase: "COMPLETE",
        offeredCommands: [],
      }),
    );
    const rows = [
      ...document.querySelectorAll<HTMLElement>(".v7-results .v7-result-seat"),
    ];
    expect(rows).toHaveLength(SEATS);
    expect(rows.filter((row) => row.dataset.winner === "true")).toHaveLength(1);
    expect(
      rows.find((row) => row.dataset.winner === "true")?.dataset.viewer,
    ).toBe("true");
    expect(
      rows.filter((row) => row.dataset.status === "eliminated"),
    ).toHaveLength(SEATS - 1);
    expect(
      rows.every((row) => row.querySelector(".v7-faction-emblem") !== null),
    ).toBe(true);
    expect(required(".v7-results h2").textContent).toBe("Victory");
    // Nobody is ringed as playing once the game is over.
    expect(
      [...document.querySelectorAll<HTMLElement>(".v7-turn-chip")].filter(
        (chip) => chip.dataset.active === "true",
      ),
    ).toHaveLength(0);
    app.destroy();
  });

  it("keeps two-player matches free of the strip and the count", () => {
    const created = createPlayableGameV7({
      ...SETUP,
      aiCount: 1,
      factions: ["ORIGINAL", "UNDEAD"],
    });
    if (!created.ok) throw new Error(created.error.code);
    const view = viewForV7(created.state, created.state.humanPlayerId);
    const app = mount(new StaticController(snapshotOf(view)));
    expect(document.querySelector(".v7-turn-strip")).toBeNull();
    expect(document.querySelector(".v7-turn-place")).toBeNull();
    app.destroy();
  });

  it("keeps the same short Help with eight players", () => {
    // Bead pulp_wars-2yc.39: the player limit is what the setup form shows;
    // Help is the short "How to play" of every match.
    const app = mount(new StaticController(snapshotOf(openingView())));
    if (document.querySelector('[data-action="help"]') === null)
      required<HTMLButtonElement>('[data-action="compact-menu"]').click();
    required<HTMLButtonElement>('[data-action="help"]').click();
    expect(required(".v7-help").textContent).toContain(
      "Capture every enemy city.",
    );
    expect(required(".v7-help").textContent).not.toContain(
      `A game holds up to ${SEATS} players`,
    );
    app.destroy();
  });

  it("has the phone and reduced-motion rules for many players", () => {
    // jsdom lays nothing out: the browser smoke and the review screenshots
    // measure the overflow; this pins the rules they rely on.
    const css = readFileSync("src/styles/v7.css", "utf8");
    const section = css.slice(
      css.indexOf("Many players (bead pulp_wars-ykw.5)"),
    );
    const phone = section.slice(section.indexOf("@media (max-width: 599px)"));
    expect(phone).toContain('.v7-turn-chip:not([data-active="true"])');
    expect(phone).toContain(".v7-turn-strip-count");
    expect(phone).toContain(".v7-turn-place");
    expect(phone).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    const reduced = section.slice(
      section.indexOf("@media (prefers-reduced-motion: reduce)"),
    );
    expect(reduced).toContain('.v7-setup-form select[data-moved="true"]');
    expect(reduced).toContain("animation: none");
    expect(section).toContain("overflow-x: auto");
    expect(section).toContain("overflow-y: auto");
  });
});

function openingView(): PlayerViewV7 {
  const created = createPlayableGameV7(SETUP);
  if (!created.ok) throw new Error(created.error.code);
  return viewForV7(created.state, created.state.humanPlayerId);
}

function snapshotOf(view: PlayerViewV7): Ruleset7BrowserSnapshot {
  return {
    phase: "ACTIVE",
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    savedAt: null,
    hasStoredSave: false,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: idleAi(),
  };
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

/** A controller that shows one fixed snapshot and accepts nothing. */
class StaticController implements Ruleset7ControllerPortV7 {
  readonly #snapshot: Ruleset7BrowserSnapshot;
  constructor(snapshot: Ruleset7BrowserSnapshot) {
    this.#snapshot = snapshot;
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    // An AI turn starts from an idle snapshot, as in the real controller:
    // the view only patches its status between two AI-active snapshots.
    if (this.#snapshot.ai.active)
      subscriber({ ...this.#snapshot, ai: idleAi() });
    subscriber(this.#snapshot);
    return () => undefined;
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    void subscriber;
    return () => undefined;
  }
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "No launch",
  });
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
}

class QuietBoardHost implements BoardHostV7 {
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    void callbacks;
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
  return new Ruleset7DomAppView(
    document,
    required<HTMLElement>("#app"),
    controller,
    { boardHost: new QuietBoardHost(), settingsStorage: null },
  );
}

function choose(selector: string, value: string): void {
  const field = required<HTMLSelectElement>(selector);
  field.value = value;
  if (field.value !== value)
    throw new Error(`${selector} does not offer ${value}`);
  field.dispatchEvent(new Event("change", { bubbles: true }));
}

function optionValues(selector: string): string[] {
  return [...required<HTMLSelectElement>(selector).options].map(
    (option) => option.value,
  );
}

function required<T extends Element = HTMLElement>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (node === null) throw new Error(`Missing ${selector}`);
  return node;
}

function required_<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required value missing");
  return value;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let index = 0; index < 4000; index += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("Condition not reached");
}
