// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
} from "../../src/engine/index";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserSnapshot,
  Ruleset7DispatchResult,
} from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  buildBoardRenderPlanV7,
  type MapCommandTargetV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import {
  dinosaurCityFixtureV7,
  dinosaurShowcaseFixtureV7,
} from "../fixtures/v7-dinosaur-ui";
import {
  dwarfDigInFixtureV7,
  dwarfUiFixtureV7,
  dwarfVictimFixtureV7,
} from "../fixtures/v7-dwarf-ui";
import { goblinShowcaseFixtureV7 } from "../fixtures/v7-goblin-ui";
import {
  iceFolkUiFixtureV7,
  iceFolkVictimFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import {
  martianDuelFixtureV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";
import { riftUiFixtureV7 } from "../fixtures/v7-rift-ui";
import { undeadShowcaseFixtureV7 } from "../fixtures/v7-undead-ui";

/**
 * Bead pulp_wars-b5f.8 ("no coordinates, minimal text"): no Ruleset 7
 * player-facing string names a tile by its coordinates. The sweep mounts
 * the real DOM app on a fixture of every faction's abilities, selects every
 * visible unit and own city, aims every ability (stepping through its
 * stages on the board), opens Help, and performs each ability once for its
 * notices; at every step it reads every text node, accessible name and
 * tooltip of the page and every label of the board plan the real host
 * would draw and describe.
 */
const COORDINATE = /\b\d{1,2}, ?\d{1,2}\b/;
/** Choosing one of these targets moves an aimed ability to its next stage. */
const STAGE_FAMILIES = new Set([
  "TUNNEL_DESTINATION",
  "BOMB_TARGET",
  "BEAM_DOWN_PASSENGER",
]);
/** These toggle or adjust an aimed ability without finishing it. */
const ADJUST_FAMILIES = new Set(["TUNNEL_PASSENGER", "TUNNEL_RIDER"]);
const ABILITY_BUTTONS =
  ".v7-selection-dock [data-dwarf-ability]:not([aria-disabled='true']), .v7-selection-dock [data-martian-ability]:not([aria-disabled='true']), .v7-selection-dock [data-ice-folk-ability]:not([aria-disabled='true'])";

/**
 * The fixtures, and steps each sweep must reach (so a fixture that stops
 * offering an ability fails here instead of passing vacuously).
 */
const FIXTURES: readonly (readonly [
  string,
  () => GameStateV7,
  readonly string[],
])[] = [
  [
    "Dwarf abilities",
    () => dwarfUiFixtureV7(),
    [
      "dwarf-tunnel stage 1",
      "dwarf-tunnel rider moved",
      "dwarf-tunnel performed",
      "dwarf-bomb-run stage 1",
      "dwarf-bomb-run performed",
      "dwarf-assemble aimed",
      "dwarf-assemble performed",
    ],
  ],
  ["Dwarf passengers", dwarfDigInFixtureV7, ["dwarf-tunnel stage 1"]],
  ["Dwarf victim", dwarfVictimFixtureV7, []],
  [
    "Martian abilities",
    () => martianUiFixtureV7(),
    [
      "martian-beam-down stage 1",
      "martian-beam-down performed",
      "martian-tractor-beam aimed",
      "martian-mind-control aimed",
      "martian-mind-control performed",
    ],
  ],
  ["Martian duel", martianDuelFixtureV7, []],
  [
    "Ice Folk abilities",
    () => iceFolkUiFixtureV7(),
    [
      "ice-folk-bolas aimed",
      "ice-folk-bolas performed",
      "ice-folk-cold-snap aimed",
    ],
  ],
  ["Ice Folk victim", iceFolkVictimFixtureV7, []],
  ["Dinosaur showcase", dinosaurShowcaseFixtureV7, []],
  ["Dinosaur nest", () => dinosaurCityFixtureV7(), ["lay-egg-knight"]],
  ["Undead showcase", undeadShowcaseFixtureV7, []],
  ["Goblin showcase", goblinShowcaseFixtureV7, ["kaboom"]],
  ["Rift", riftUiFixtureV7, []],
];

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 player-facing text names no tile coordinates", () => {
  it("the pattern catches a coordinate and spares HP, damage and costs", () => {
    for (const text of ["Tunnel to 4, 2?", "now at 3,1", "Windmill (12, 7)"])
      expect(COORDINATE.test(text)).toBe(true);
    for (const text of [
      "12/12",
      "Erupt −6",
      "4 Coins · slot 2/3",
      "+4 machines, +2 others",
      "Hammerer, 12 of 12 HP, riding",
      "Controls 1 / 1",
    ])
      expect(COORDINATE.test(text)).toBe(false);
  });

  for (const [name, fixture, steps] of FIXTURES)
    it(`${name}: docks, aiming panels, board labels, Help and notices`, async () => {
      const { offences, visited } = await sweep(fixture);
      expect(offences).toEqual([]);
      expect(visited.has("help")).toBe(true);
      for (const step of steps)
        expect(
          [...visited].some((seen) => seen.endsWith(step)),
          `step ${step}`,
        ).toBe(true);
    });
});

async function sweep(fixture: () => GameStateV7): Promise<{
  readonly offences: readonly string[];
  readonly visited: ReadonlySet<string>;
}> {
  const offences = new Set<string>();
  const visited = new Set<string>();
  let controller = new FixtureController(fixture());
  let host = new RecordingBoardHost();
  let app = mount(controller, host);
  const check = (step: string): void => {
    visited.add(step);
    for (const text of collect(host))
      if (COORDINATE.test(text)) offences.add(`${step}: ${text}`);
  };
  check("start");
  const view = required(controller.snapshot().view);
  const units = view.units.map((unit) => unit.id);
  const abilities: { unitId: number; action: string }[] = [];
  for (const unitId of units) {
    host.callbacks?.onSelection({ kind: "UNIT", unitId });
    check(`unit ${unitId}`);
    for (const control of document.querySelectorAll<HTMLButtonElement>(
      ABILITY_BUTTONS,
    ))
      abilities.push({ unitId, action: required(control.dataset.action) });
    // A Kaboom! armed shows its whole preview.
    const kaboom = document.querySelector<HTMLButtonElement>(
      '.v7-selection-dock [data-action="command-kaboom"]:not(:disabled)',
    );
    if (kaboom !== null) {
      kaboom.click();
      check(`unit ${unitId} kaboom`);
      document
        .querySelector<HTMLButtonElement>('[data-action="cancel-kaboom"]')
        ?.click();
    }
  }
  for (const { unitId, action } of abilities) {
    host.callbacks?.onSelection({ kind: "UNIT", unitId });
    document
      .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
      ?.click();
    check(`${action} aimed`);
    for (let stage = 0; stage < 3; stage += 1) {
      const target = boardPlan(host).targets.find((candidate) =>
        STAGE_FAMILIES.has(candidate.family),
      );
      if (target === undefined) break;
      host.callbacks?.onCommand(target);
      await settle();
      check(`${action} stage ${stage + 1}`);
      const rider = boardPlan(host).targets.find(
        (candidate) => candidate.family === "TUNNEL_RIDER",
      );
      if (rider !== undefined) {
        host.callbacks?.onCommand(rider);
        await settle();
        check(`${action} rider moved`);
      }
      if (target.family === "TUNNEL_DESTINATION") break;
    }
    document
      .querySelector<HTMLButtonElement>('[data-action$="pick-cancel"]')
      ?.click();
  }
  // Own cities: the train and Lay Egg cards, and nest-tile picking.
  for (const city of view.cities.filter(
    (candidate) => candidate.ownerId === view.viewer.id,
  )) {
    host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
    check(`city ${city.id}`);
    const eggs = [
      ...document.querySelectorAll<HTMLButtonElement>(
        '[data-action^="lay-egg-"]:not(:disabled)',
      ),
    ].map((control) => required(control.dataset.action));
    for (const egg of eggs) {
      host.callbacks?.onSelection({ kind: "CITY", cityId: city.id });
      document
        .querySelector<HTMLButtonElement>(`[data-action="${egg}"]`)
        ?.click();
      check(`city ${city.id} ${egg}`);
      document
        .querySelector<HTMLButtonElement>('[data-action="cancel-lay-egg"]')
        ?.click();
    }
  }
  host.callbacks?.onSelection(null);
  document
    .querySelector<HTMLButtonElement>('[data-action="compact-menu"]')
    ?.click();
  document.querySelector<HTMLButtonElement>('[data-action="help"]')?.click();
  check("help");
  app.destroy();
  // Perform each ability once on a fresh match, for its notices and log.
  for (const { unitId, action } of abilities) {
    document.body.innerHTML = '<div id="app"></div>';
    controller = new FixtureController(fixture());
    host = new RecordingBoardHost();
    app = mount(controller, host);
    host.callbacks?.onSelection({ kind: "UNIT", unitId });
    document
      .querySelector<HTMLButtonElement>(`[data-action="${action}"]`)
      ?.click();
    for (
      let step = 0;
      step < 4 && controller.accepted.length === 0;
      step += 1
    ) {
      const targets = boardPlan(host).targets;
      const target: MapCommandTargetV7 | undefined =
        targets.find((candidate) => STAGE_FAMILIES.has(candidate.family)) ??
        targets.find((candidate) => !ADJUST_FAMILIES.has(candidate.family));
      if (target === undefined) break;
      host.callbacks?.onCommand(target);
      await settle();
      check(`${action} step ${step + 1}`);
    }
    // A chosen Tunnel destination is confirmed in the dock.
    document
      .querySelector<HTMLButtonElement>('[data-action="tunnel-confirm"]')
      ?.click();
    await settle();
    check(
      controller.accepted.length > 0
        ? `${action} performed`
        : `${action} not performed`,
    );
    app.destroy();
  }
  return { offences: [...offences], visited };
}

/**
 * Every player-facing string on the page and on the board: text nodes,
 * accessible names, tooltips, and the plan's labels, notes and semantic
 * labels (the board's cursor description reads the latter).
 */
function collect(host: RecordingBoardHost): string[] {
  const texts: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? "";
    if (text !== "") texts.push(text);
  }
  for (const element of document.querySelectorAll(
    "[aria-label], [title], [aria-description], [placeholder]",
  ))
    for (const attribute of [
      "aria-label",
      "title",
      "aria-description",
      "placeholder",
    ]) {
      const value = element.getAttribute(attribute);
      if (value !== null && value !== "") texts.push(value);
    }
  if (host.lastModel !== null) {
    const plan = boardPlan(host);
    for (const item of [...plan.entries, ...plan.targets])
      for (const [key, value] of Object.entries(item))
        if (typeof value === "string" && /label|note|text|title/i.test(key))
          texts.push(value);
  }
  return texts;
}

async function settle(): Promise<void> {
  for (let index = 0; index < 5; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}

class FixtureController implements Ruleset7ControllerPortV7 {
  readonly accepted: CommandV7[] = [];
  readonly #snapshotSubscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  readonly #boundarySubscribers = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  #state: GameStateV7;
  #snapshot: Ruleset7BrowserSnapshot;

  constructor(state: GameStateV7) {
    this.#state = state;
    this.#snapshot = activeSnapshot(state);
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#snapshotSubscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#snapshotSubscribers.delete(subscriber);
  }
  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#boundarySubscribers.add(subscriber);
    return () => this.#boundarySubscribers.delete(subscriber);
  }
  readonly dispatch = async (
    command: CommandV7,
  ): Promise<Ruleset7DispatchResult> => {
    const beforeState = this.#state;
    const beforeView = viewForV7(beforeState, beforeState.humanPlayerId);
    const result = applyCommandV7(
      beforeState,
      beforeState.humanPlayerId,
      command,
    );
    if (!result.accepted)
      return {
        accepted: false,
        reason: "ENGINE_REJECTED",
        error: result.error,
      };
    this.accepted.push(command);
    this.#state = result.state;
    const afterView = viewForV7(result.state, result.state.humanPlayerId);
    const playerEvents = projectEventsV7(
      beforeState,
      result.state,
      result.state.humanPlayerId,
      result.events,
    );
    this.#snapshot = activeSnapshot(result.state);
    const boundary = {
      actor: "HUMAN" as const,
      beforeView,
      afterView,
      playerEvents,
    };
    for (const subscriber of this.#boundarySubscribers) subscriber(boundary);
    for (const subscriber of this.#snapshotSubscribers)
      subscriber(this.#snapshot);
    return { accepted: true, beforeView, afterView, playerEvents };
  };
  readonly launch: Ruleset7ControllerPortV7["launch"] = async () => ({
    ok: false,
    code: "INVALID_SETUP",
    diagnostic: "Not used",
  });
  readonly resume: Ruleset7ControllerPortV7["resume"] = async () => false;
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = async () =>
    false;
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

class RecordingBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  lastModel: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.lastModel = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function activeSnapshot(state: GameStateV7): Ruleset7BrowserSnapshot {
  const view = viewForV7(state, state.humanPlayerId);
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

function mount(
  controller: Ruleset7ControllerPortV7,
  host: BoardHostV7,
): Ruleset7DomAppView {
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  return new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
  });
}

/** The board plan the real host would build from the last model. */
function boardPlan(
  host: RecordingBoardHost,
): ReturnType<typeof buildBoardRenderPlanV7> {
  const model = required(host.lastModel);
  return buildBoardRenderPlanV7(
    model.view,
    model.offeredCommands,
    model.interaction,
  );
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required fixture value missing");
  return value;
}
