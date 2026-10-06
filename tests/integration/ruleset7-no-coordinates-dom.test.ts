// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  applyCommandV7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  bootstrapRuleset7App,
  type Ruleset7AcceptedBoundary,
  type Ruleset7BrowserSnapshot,
  type Ruleset7CampaignProgressV7,
  type Ruleset7DispatchResult,
} from "../../src/app/index";
import { CHAPTER_ONE_V7 } from "../../src/campaign/chapter-1";
import { CAMPAIGN_PROGRESS_STORAGE_KEY_V7 } from "../../src/persistence/index";
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
  iceFolkGlideFixtureV7,
  iceFolkUiFixtureV7,
  iceFolkVictimFixtureV7,
  martianFrozenFixtureV7,
} from "../fixtures/v7-ice-folk-ui";
import {
  MARTIAN_UI_V7,
  martianDuelFixtureV7,
  martianMobilityFixtureV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";
import { BOARD_PICK_PANEL_MAX_BUTTONS_V7 } from "../../src/render/canvas/target-highlight-v7";
import { candyUiFixtureV7 } from "../fixtures/v7-candy-ui";
import { curiositiesUiFixtureV7 } from "../fixtures/v7-curiosities-ui";
import {
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
} from "../fixtures/v7-naval-branch";
import {
  frozenFreezeUiFixtureV7,
  frozenIceboundUiFixtureV7,
  frozenSlideUiFixtureV7,
} from "../fixtures/v7-frozen-sea-ui";
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
  ".v7-selection-dock [data-dwarf-ability]:not([aria-disabled='true']), .v7-selection-dock [data-martian-ability]:not([aria-disabled='true']), .v7-selection-dock [data-ice-folk-ability]:not([aria-disabled='true']), .v7-selection-dock [data-candy-ability]:not([aria-disabled='true']), .v7-selection-dock [data-naval-ability]:not([aria-disabled='true']), .v7-selection-dock [data-freeze-ability]:not([aria-disabled='true'])";

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
  // Bead pulp_wars-1wy.5: the balance round's mobility UI (the passenger
  // badges and pick-up range, both pulls with their paths, the "Beamed"
  // and "Beam used" chips, the used and Frozen carriers' reasons) and the
  // Ice Folk Glide tiles and Snow cover.
  [
    "Martian mobility",
    martianMobilityFixtureV7,
    [
      "martian-beam-down stage 1",
      "martian-beam-down performed",
      "martian-beam-down chip beamed",
      "martian-beam-down disabled Already acted this turn",
      "martian-tractor-beam aimed",
      "martian-tractor-beam performed",
      "martian-tractor-beam chip tractor-used",
      "martian-tractor-beam disabled Tractor Beam used this turn",
    ],
  ],
  ["Martian Frozen carriers", martianFrozenFixtureV7, []],
  ["Ice Folk Glide", iceFolkGlideFixtureV7, []],
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
  // Bead pulp_wars-9im: the Candy abilities, each picked on the board.
  [
    "Candy abilities",
    () => candyUiFixtureV7(),
    [
      "candy-sugar-rush aimed",
      "candy-rebake aimed",
      "candy-rebake performed",
      "candy-sugar-toss aimed",
      "candy-sugar-toss performed",
    ],
  ],
  ["Dinosaur showcase", dinosaurShowcaseFixtureV7, []],
  ["Dinosaur nest", () => dinosaurCityFixtureV7(), ["lay-egg-knight"]],
  ["Undead showcase", undeadShowcaseFixtureV7, []],
  ["Goblin showcase", goblinShowcaseFixtureV7, ["kaboom"]],
  ["Rift", riftUiFixtureV7, []],
  // Map curiosities (bead pulp_wars-737.6): the Spider, its lair, the
  // Fountain, the Shrine and the Wreck; the provoke warning on Moves.
  ["Curiosities", () => curiositiesUiFixtureV7(), []],
  // The naval branch interface (bead pulp_wars-5ti.7): two boardable ships
  // beside one boarder. One Board button arms it; the ship to capture is
  // picked on the board, so the dock lists neither ship.
  [
    "Naval boarding",
    navalBoardingFixtureV7,
    ["naval-board aimed", "naval-board performed"],
  ],
  // The frozen sea (bead pulp_wars-5ti.7, second part): a Yeti's Freeze is
  // armed and its tile picked on the board, the Ice Witch's casts her
  // ring; the ice chips, the slide, the slip and an icebound ship.
  [
    "Frozen sea: Freeze",
    frozenFreezeUiFixtureV7,
    ["freeze aimed", "freeze performed"],
  ],
  ["Frozen sea: slide", frozenSlideUiFixtureV7, []],
  ["Frozen sea: slip", () => frozenSlideUiFixtureV7({ slipper: true }), []],
  ["Frozen sea: icebound", frozenIceboundUiFixtureV7, []],
  [
    "Frozen sea: icebound victim",
    () => frozenIceboundUiFixtureV7({ victim: true }),
    [],
  ],
];

const NAVAL_BOARDER = { x: 5, y: 4 } as const;
const NAVAL_PRIZES = [
  { x: 5, y: 5 },
  { x: 4, y: 5 },
] as const;
/** A Patrol Boat with Seamanship beside two enemy Patrol Boats at 1 HP. */
function navalBoardingFixtureV7(): GameStateV7 {
  let state = navalArenaV7({
    units: [
      { seat: 0, role: "PATROL_BOAT", at: NAVAL_BOARDER },
      ...NAVAL_PRIZES.map((at) => ({
        seat: 1 as const,
        role: "PATROL_BOAT" as const,
        at,
      })),
    ],
  });
  for (const at of NAVAL_PRIZES)
    state = patchNavalUnitV7(state, navalUnitAtV7(state, at).id, { hp: 1 });
  return state;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 player-facing text names no tile coordinates", () => {
  it("Board has one button whatever the number of boardable ships, and they are picked on the board", () => {
    const controller = new FixtureController(navalBoardingFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const boarder = required(
      view.units.find(
        (unit) =>
          unit.at.x === NAVAL_BOARDER.x && unit.at.y === NAVAL_BOARDER.y,
      ),
    );
    expect(
      queryPlayerCommandsV7(view).filter(
        (command) => command.kind === "BOARD" && command.unitId === boarder.id,
      ),
    ).toHaveLength(2);
    host.callbacks?.onSelection({ kind: "UNIT", unitId: boarder.id });
    expect(document.querySelector(".v7-selection-dock")).not.toBeNull();
    expect(
      document.querySelectorAll('[data-action^="command-board"]'),
    ).toHaveLength(0);
    expect(targetListOffences(controller, host)).toEqual([]);
    // Unarmed, the two ships are attack targets; armed, they are the two
    // Board targets, and the dock holds the aiming panel's fixed controls.
    expect(
      boardPlan(host).targets.some((target) => target.family === "BOARD"),
    ).toBe(false);
    const board = document.querySelectorAll<HTMLButtonElement>(
      '.v7-selection-dock [data-naval-ability="board"]',
    );
    expect(board).toHaveLength(1);
    required(board[0]).click();
    const panel = required(
      document.querySelector<HTMLElement>("[data-v7-naval-pick]"),
    );
    expect(panel.classList.contains("v7-board-pick")).toBe(true);
    expect(panel.dataset.boardTargets).toBe("2");
    expect(
      boardPlan(host)
        .targets.map((target) => target.family)
        .sort(),
    ).toEqual(["BOARD", "BOARD"]);
    expect(targetListOffences(controller, host)).toEqual([]);
    app.destroy();
  });

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

  // The campaign screens (pulp_wars-68k.5): the list in every progress
  // state, every briefing, Settings and the resume label of a mission, and
  // the mission Victory (with every unlock) and Defeat dialogs.
  it("Campaign: list, briefings, mission Settings, resume label and dialogs", async () => {
    const offences = new Set<string>();
    const check = (step: string): void => {
      for (const text of pageTexts())
        if (COORDINATE.test(text)) offences.add(`${step}: ${text}`);
    };
    const progressStates: Record<string, unknown>[] = [
      {},
      {
        FRONTIER_1: { firstWonAt: "2026-10-03T12:00:00.000Z", bestRounds: 12 },
      },
      Object.fromEntries(
        CHAPTER_ONE_V7.missions.map((entry) => [
          entry.missionId,
          { firstWonAt: "2026-10-03T12:00:00.000Z", bestRounds: 21 },
        ]),
      ),
    ];
    let steps = 0;
    for (const completed of progressStates) {
      document.body.innerHTML = '<div id="app"></div>';
      window.localStorage.clear();
      window.localStorage.setItem(
        CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
        JSON.stringify({
          format: "pulp-wars-campaign-progress",
          version: 1,
          completed,
        }),
      );
      const app = bootstrapRuleset7App(document);
      document
        .querySelector<HTMLButtonElement>('[data-action="campaign"]')
        ?.click();
      await settle();
      check("campaign list");
      document
        .querySelector<HTMLButtonElement>('[data-action="campaign-reset"]')
        ?.click();
      await settle();
      check("campaign reset");
      for (const entry of CHAPTER_ONE_V7.missions) {
        const card = document.querySelector<HTMLButtonElement>(
          `[data-action="mission-${entry.missionId.toLowerCase()}"]`,
        );
        if (card === null || card.dataset.status === "locked") continue;
        card.click();
        await settle();
        check(`briefing ${entry.missionId}`);
        steps += 1;
        document
          .querySelector<HTMLButtonElement>('[data-action="campaign-back"]')
          ?.click();
        await settle();
      }
      app.destroy();
    }
    // Every briefing was reached with full progress.
    expect(steps).toBe(1 + 2 + CHAPTER_ONE_V7.missions.length);
    // A mission in play: Settings, then the resume screen.
    document.body.innerHTML = '<div id="app"></div>';
    window.localStorage.clear();
    const app = bootstrapRuleset7App(document);
    document
      .querySelector<HTMLButtonElement>('[data-action="campaign"]')
      ?.click();
    await settle();
    document
      .querySelector<HTMLButtonElement>('[data-action="mission-frontier_1"]')
      ?.click();
    await settle();
    document
      .querySelector<HTMLButtonElement>('[data-action="campaign-start"]')
      ?.click();
    for (let wait = 0; wait < 200; wait += 1) {
      if (app.controller.snapshot().phase === "ACTIVE") break;
      await settle();
    }
    document
      .querySelector<HTMLButtonElement>('[data-action="compact-menu"]')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('[data-action="settings"]')
      ?.click();
    expect(document.querySelector(".v7-mission-label")).not.toBeNull();
    check("mission settings");
    document
      .querySelector<HTMLButtonElement>('[data-action="close-overlay"]')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('[data-action="compact-menu"]')
      ?.click();
    document
      .querySelector<HTMLButtonElement>('[data-action="main-menu"]')
      ?.click();
    for (let wait = 0; wait < 200; wait += 1) {
      if (app.controller.snapshot().phase === "RESUMABLE") break;
      await settle();
    }
    expect(document.querySelector(".v7-resume-summary")?.textContent).toMatch(
      /^Mission 1/,
    );
    check("mission resume");
    app.destroy();
    // The mission dialogs, each with its unlocks announced.
    for (const entry of CHAPTER_ONE_V7.missions)
      for (const victory of [true, false]) {
        document.body.innerHTML = '<div id="app"></div>';
        const state = missionStateV7(entry.missionId);
        const view = viewForV7(state, state.humanPlayerId);
        const ended: GameStateV7["outcome"] = victory
          ? { kind: "VICTORY", winnerId: view.humanPlayerId }
          : {
              kind: "DEFEAT",
              humanId: view.humanPlayerId,
              defeatedByPlayerId: required(
                view.turnOrder.find((id) => id !== view.humanPlayerId),
              ),
            };
        const controller = new FixtureController(state);
        controller.complete({ ...view, outcome: ended }, entry.missionId, [
          ...entry.unlocks,
        ]);
        const host = new RecordingBoardHost();
        const mounted = mount(controller, host);
        expect(
          document.querySelector("[data-v7-region='results']"),
        ).not.toBeNull();
        check(`${entry.missionId} ${victory ? "victory" : "defeat"}`);
        mounted.destroy();
      }
    expect([...offences]).toEqual([]);
  });

  // Bead pulp_wars-9im: the sweep below also fails on a dock that lists
  // the targets of a board-targetable action; this proves the guard bites.
  it("the target-list guard passes an aiming panel and catches a list of targets", () => {
    const controller = new FixtureController(martianUiFixtureV7());
    const host = new RecordingBoardHost();
    const app = mount(controller, host);
    const view = required(controller.snapshot().view);
    const unitAt = (at: { readonly x: number; readonly y: number }) =>
      required(
        view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y),
      );
    host.callbacks?.onSelection({
      kind: "UNIT",
      unitId: unitAt(MARTIAN_UI_V7.brain).id,
    });
    required(
      document.querySelector<HTMLButtonElement>(
        '[data-action="martian-mind-control"]',
      ),
    ).click();
    const panel = required(
      document.querySelector<HTMLElement>("[data-v7-martian-pick]"),
    );
    expect(panel.classList.contains("v7-board-pick")).toBe(true);
    expect(Number(panel.dataset.boardTargets)).toBeGreaterThanOrEqual(1);
    expect(targetListOffences(controller, host)).toEqual([]);
    // A button named after the unit on a highlighted target is a list.
    const listed = document.createElement("button");
    listed.dataset.action = `mind-control-${unitAt(MARTIAN_UI_V7.weakTarget).id}`;
    panel.append(listed);
    expect(targetListOffences(controller, host)).toEqual([
      `an aiming panel lists "${listed.dataset.action}"`,
      `the dock lists the target "${listed.dataset.action}"`,
    ]);
    listed.remove();
    // So is a panel that grows past its fixed controls.
    const before = panel.querySelectorAll("button").length;
    for (
      let extra = before;
      extra <= BOARD_PICK_PANEL_MAX_BUTTONS_V7;
      extra += 1
    ) {
      const control = document.createElement("button");
      control.dataset.action = "pick-info";
      panel.append(control);
    }
    expect(targetListOffences(controller, host)).toEqual([
      `an aiming panel has ${BOARD_PICK_PANEL_MAX_BUTTONS_V7 + 1} buttons`,
    ]);
    // And a panel that is not marked as a board pick.
    panel.classList.remove("v7-board-pick");
    expect(targetListOffences(controller, host)).toContain(
      "an aiming panel is not a board pick",
    );
    app.destroy();
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
    for (const offence of targetListOffences(controller, host))
      offences.add(`${step}: ${offence}`);
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
    // Bead pulp_wars-1wy.5: the docks after the ability, with the unit
    // that acted (its used or disabled buttons and "Beam used") and every
    // unit beamed this turn ("Beamed").
    const afterView = required(controller.snapshot().view);
    for (const id of new Set<number>([unitId, ...afterView.beamedThisTurn])) {
      if (!afterView.units.some((unit) => unit.id === id)) continue;
      host.callbacks?.onSelection({ kind: "UNIT", unitId: id });
      check(`${action} after, unit ${id}`);
      for (const status of ["beamed", "tractor-used"])
        if (
          document.querySelector(
            `.v7-selection-dock [data-unit-status="${status}"]`,
          ) !== null
        )
          visited.add(`${action} chip ${status}`);
      for (const disabled of document.querySelectorAll<HTMLElement>(
        ".v7-selection-dock [data-martian-ability][aria-disabled='true']",
      ))
        visited.add(
          `${action} disabled ${required(disabled.dataset.disabledReason)}`,
        );
    }
    app.destroy();
  }
  return { offences: [...offences], visited };
}

/** The only controls an aiming panel may hold (bead pulp_wars-9im). */
const PICK_PANEL_CONTROLS =
  /^(pick-info|[a-z-]+-pick-cancel|[a-z-]+-pick-back|tunnel-confirm|tunnel-passenger-none|cold-snap-cast)$/;

/**
 * Bead pulp_wars-9im, the generic guard: targets are picked on the board,
 * never from a list in the dock. An aiming panel holds a fixed, small set
 * of controls whatever the number of targets, and no dock button is named
 * after a unit that stands on a highlighted target.
 */
function targetListOffences(
  controller: FixtureController,
  host: RecordingBoardHost,
): string[] {
  const offences: string[] = [];
  const dock = document.querySelector<HTMLElement>(".v7-selection-dock");
  if (dock === null || host.lastModel === null) return offences;
  for (const panel of dock.querySelectorAll<HTMLElement>(
    "[data-v7-martian-pick], [data-v7-ice-folk-pick], [data-v7-dwarf-pick], [data-v7-candy-pick], [data-v7-naval-pick], [data-v7-freeze-pick]",
  )) {
    if (!panel.classList.contains("v7-board-pick"))
      offences.push("an aiming panel is not a board pick");
    const controls = [...panel.querySelectorAll("button")].map(
      (control) => control.dataset.action ?? "",
    );
    if (controls.length > BOARD_PICK_PANEL_MAX_BUTTONS_V7)
      offences.push(`an aiming panel has ${controls.length} buttons`);
    for (const action of controls)
      if (!PICK_PANEL_CONTROLS.test(action))
        offences.push(`an aiming panel lists "${action}"`);
  }
  const view = controller.snapshot().view;
  if (view === null) return offences;
  const targetCells = new Set(
    boardPlan(host).targets.map((target) => `${target.at.x},${target.at.y}`),
  );
  const targetUnitIds = new Set(
    view.units
      .filter((unit) => targetCells.has(`${unit.at.x},${unit.at.y}`))
      .map((unit) => String(unit.id)),
  );
  for (const control of dock.querySelectorAll<HTMLButtonElement>("button")) {
    const id = /-(\d+)$/.exec(control.dataset.action ?? "")?.[1];
    if (id !== undefined && targetUnitIds.has(id))
      offences.push(
        `the dock lists the target "${control.dataset.action ?? ""}"`,
      );
  }
  return offences;
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

/** Every text node, accessible name and tooltip of the page. */
function pageTexts(): string[] {
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
  return texts;
}

/** A chapter mission's initial state (seat 0's first choice). */
function missionStateV7(missionId: string): GameStateV7 {
  const setup = missionMatchSetupV7(required(missionByIdV7(missionId)));
  const created = createPlayableGameV7(required(setup));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
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
  #lastWin: Ruleset7CampaignProgressV7["lastWin"] = null;

  constructor(state: GameStateV7) {
    this.#state = state;
    this.#snapshot = activeSnapshot(state);
  }
  /** Shows a finished mission and the unlocks its win announced. */
  complete(
    view: PlayerViewV7,
    missionId: string,
    unlocked: readonly FactionIdV7[],
  ): void {
    this.#snapshot = {
      ...activeSnapshot(this.#state),
      phase: "COMPLETE",
      view,
      offeredCommands: [],
    };
    this.#lastWin = { missionId, firstWin: true, unlocked };
  }
  campaignProgress(): Ruleset7CampaignProgressV7 {
    return {
      status: "OK",
      completed: {},
      lastWin: this.#lastWin,
      diagnostic: null,
    };
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
