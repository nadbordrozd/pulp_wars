import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalNavalPlanV7,
} from "../../src/ai/v7";
import { campaignPlanForPolicyV7 } from "../../src/ai/v7-campaign";
import {
  NAVAL_SEA_ROUTE_MARGIN_V7,
  navalSeaRouteBeatsWalkV7,
} from "../../src/ai/v7-naval";
import {
  applyCommandV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  BAY_CAPITALS_V7,
  BAY_EXPLORED_V7,
  BAY_PORT_V7,
  BAY_TERRAIN_V7,
  CANAL_CAPITALS_V7,
  CANAL_PORT_V7,
  CANAL_TERRAIN_V7,
  COAST_CAPITALS_V7,
  COAST_PORT_V7,
  COAST_TERRAIN_V7,
  COAST_VALLEY_V7,
  LAKE_CAPITALS_V7,
  LAKE_POND_PORT_V7,
  LAKE_PORT_V7,
  LAKE_TERRAIN_V7,
  coastHopV7,
  type CoastHopOptionsV7,
} from "../fixtures/v7-coast-hop";
import {
  NAVAL_ARENA_CAPITALS_V7,
  NAVAL_ARENA_PORTS_V7,
  navalArenaV7,
} from "../fixtures/v7-naval-branch";

// The landing and embark discipline on one landmass (`pulp_wars-eru`,
// docs/architecture/NORMAL_AI.md, "Landing discipline"). The naval-playable
// validator found Normal AI units on Pangea and Lakes boards that boarded,
// stepped off one tile on, and boarded again. Read from the scoring, the
// cycle was: the naval plan called the sea the shortcut to a target the
// units could also walk to (comparing the best water route from any Port or
// future Port, Deep Water included, with the walk of the nearest unit), so
// those units got no job on land and boarded at whatever Port stood beside
// them; a unit aboard with no way forward (a Port on other water, or a
// crossing that needs Navigation) was "stranded" and stepped off at once,
// because a walk to the target from home always exists on one landmass; on
// land it had no job again, and boarded.
//
// No test plays a match. Each asks the policy for one decision on a
// hand-built state, applies the command the policy itself ranks first for
// the unit, ends the turn, and asks again: two or three decisions of one
// unit. On the code before the fix the first three decisions of the pond
// and the bay sequences below were board (priority 1300), step off (810),
// board (1300).

const seat = (state: GameStateV7, index: 0 | 1) => {
  const player = state.players.find((item) => item.seat === index);
  if (player === undefined) throw new Error("seat missing");
  return player;
};

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, seat(state, 0).id);

function accept(state: GameStateV7, index: 0 | 1, command: CommandV7) {
  const result = applyCommandV7(state, seat(state, index).id, command);
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result;
}

/** Both seats end their turn: seat 0 decides again. */
function nextTurn(state: GameStateV7): GameStateV7 {
  const mine = accept(state, 0, { kind: "END_TURN" }).state;
  return accept(mine, 1, { kind: "END_TURN" }).state;
}

function unitAt(state: GameStateV7, at: CoordV7): UnitId {
  const unit = state.units.find(
    (item) => item.hp > 0 && item.at.x === at.x && item.at.y === at.y,
  );
  if (unit === undefined) throw new Error("no unit there");
  return unit.id;
}

/** The state with one unit aboard on `at` (as a boarding Move leaves it). */
function aboard(state: GameStateV7, id: UnitId, at: CoordV7): GameStateV7 {
  const parsed = parseGameStateV7({
    ...state,
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, form: "EMBARKED", at } : unit,
    ),
  });
  if (parsed === null) throw new Error("the embarked state is invalid");
  return parsed;
}

/** The unit's candidates in this decision, best first. */
function candidatesOf(view: PlayerViewV7, id: UnitId) {
  return chooseNormalCommandV7(view).candidates.filter(
    (item) => "unitId" in item.command && item.command.unitId === id,
  );
}

function bestOf(view: PlayerViewV7, id: UnitId) {
  const best = candidatesOf(view, id)[0];
  if (best === undefined) throw new Error("the unit has no candidate");
  return best;
}

const endsOn = (command: CommandV7, at: CoordV7): boolean => {
  const end = command.kind === "MOVE" ? command.path.at(-1) : undefined;
  return end !== undefined && end.x === at.x && end.y === at.y;
};

/** Whether any candidate of the unit is a Move onto one of `ports`. */
function boards(
  view: PlayerViewV7,
  id: UnitId,
  ports: readonly CoordV7[],
): boolean {
  return candidatesOf(view, id).some((item) =>
    ports.some((port) => endsOn(item.command, port)),
  );
}

const lands = (view: PlayerViewV7, id: UnitId): boolean =>
  candidatesOf(view, id).some((item) => item.command.kind === "DISEMBARK");

const lake = (options: Partial<CoastHopOptionsV7> = {}): GameStateV7 =>
  coastHopV7({
    mapType: "LAKES",
    terrain: LAKE_TERRAIN_V7,
    capitals: LAKE_CAPITALS_V7,
    ports: [LAKE_PORT_V7],
    ...options,
  });

/** A second Fighter beside the Port: the first one scouts the bay's north end. */
const BAY_UNIT: CoordV7 = { x: 2, y: 7 };
const bay = (options: Partial<CoastHopOptionsV7> = {}): GameStateV7 =>
  coastHopV7({
    mapType: "PANGEA",
    terrain: BAY_TERRAIN_V7,
    capitals: BAY_CAPITALS_V7,
    ports: [BAY_PORT_V7],
    explored: BAY_EXPLORED_V7,
    units: [{ seat: 0, role: "FIGHTER", at: BAY_UNIT }],
    ...options,
  });

describe("the sea route against the walk (pulp_wars-eru)", () => {
  it("wants the sea shorter by more than the margin, and a route the seat can sail", () => {
    const route = { toPort: 1, water: 2, coast: 0 };
    const breakEven = route.toPort + route.water + NAVAL_SEA_ROUTE_MARGIN_V7;
    expect(navalSeaRouteBeatsWalkV7({ ...route, walk: breakEven })).toBe(false);
    expect(navalSeaRouteBeatsWalkV7({ ...route, walk: breakEven + 1 })).toBe(
      true,
    );
    // No water route the seat can sail today: it walks, however far.
    expect(
      navalSeaRouteBeatsWalkV7({ ...route, water: undefined, walk: 99 }),
    ).toBe(false);
  });

  it("keeps its answer while the unit follows it", () => {
    // Toward the Port: one step nearer the Port, at most one step nearer
    // the target.
    for (let toPort = 6; toPort > 0; toPort -= 1) {
      const walk = 14 + toPort;
      expect(
        navalSeaRouteBeatsWalkV7({ toPort, water: 2, coast: 1, walk }),
      ).toBe(true);
      expect(
        navalSeaRouteBeatsWalkV7({
          toPort: toPort - 1,
          water: 2,
          coast: 1,
          walk: walk - 1,
        }),
      ).toBe(true);
    }
    // Landed beside its target (a walk of the coast distance, or one more),
    // a unit never boards again, even standing on the tile beside a Port.
    for (const coast of [0, 1, 2, 3])
      for (const walk of [coast, coast + 1])
        expect(
          navalSeaRouteBeatsWalkV7({ toPort: 1, water: 0, coast, walk }),
        ).toBe(false);
  });
});

describe("a target across a lake (Lakes-like)", () => {
  it("boards at the Port on the lake: two tiles of water against fourteen steps", () => {
    const state = lake();
    const view = viewOf(state);
    const unit = unitAt(state, LAKE_CAPITALS_V7[0]);
    expect(inspectNormalNavalPlanV7(view)).toMatchObject({
      active: true,
      target: LAKE_CAPITALS_V7[1],
      seaShortcut: true,
    });
    const first = bestOf(view, unit);
    expect(first.command).toEqual({
      kind: "MOVE",
      unitId: unit,
      path: [LAKE_PORT_V7],
    });
    expect(first.score.priority).toBe(1300);
    // Aboard, it sails on: it does not step off beside the Port it left.
    const sailing = viewOf(nextTurn(accept(state, 0, first.command).state));
    expect(lands(sailing, unit)).toBe(false);
    expect(bestOf(sailing, unit)).toMatchObject({
      command: { kind: "MOVE" },
      score: { priority: 1230 },
    });
  });

  it("walks from a Port on a pond: no water route leaves it", () => {
    const state = lake({ ports: [LAKE_POND_PORT_V7] });
    const view = viewOf(state);
    const unit = unitAt(state, LAKE_CAPITALS_V7[0]);
    // The plan still calls the sea the shortcut (a Port on the lake would
    // be one), but this unit's own way by sea does not exist.
    expect(inspectNormalNavalPlanV7(view).seaShortcut).toBe(true);
    expect(boards(view, unit, [LAKE_POND_PORT_V7])).toBe(false);
    expect(bestOf(view, unit).command.kind).toBe("MOVE");
  });

  it("a unit aboard on the pond steps off once and stays ashore", () => {
    const start = lake({
      ports: [LAKE_POND_PORT_V7],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 8 } }],
    });
    const unit = unitAt(start, { x: 2, y: 8 });
    let state = aboard(start, unit, LAKE_POND_PORT_V7);
    // Stranded: it lands where it can walk to the enemy city.
    const landing = bestOf(viewOf(state), unit);
    expect(landing.command.kind).toBe("DISEMBARK");
    expect(landing.score.priority).toBe(810);
    state = nextTurn(accept(state, 0, landing.command).state);
    // The same target, the same threat picture, the Port in reach: before
    // the fix it boarded again here (priority 1300), turn after turn.
    for (let turn = 0; turn < 2; turn += 1) {
      const view = viewOf(state);
      expect(boards(view, unit, [LAKE_POND_PORT_V7])).toBe(false);
      const walk = bestOf(view, unit);
      expect(walk.command.kind).toBe("MOVE");
      state = nextTurn(accept(state, 0, walk.command).state);
    }
  });
});

describe("a target across a bay (Pangea-like)", () => {
  it("does not board while the only known crossing is Deep Water it cannot sail", () => {
    const state = bay({ technologies: ["SHORECRAFT"] });
    const view = viewOf(state);
    const unit = unitAt(state, BAY_UNIT);
    expect(inspectNormalNavalPlanV7(view)).toMatchObject({
      active: true,
      target: BAY_CAPITALS_V7[1],
      seaShortcut: true,
    });
    expect(boards(view, unit, [BAY_PORT_V7])).toBe(false);
    // It has its job on land instead: the march round the bay.
    const walk = bestOf(view, unit);
    expect(walk.command.kind).toBe("MOVE");
    const after = viewOf(nextTurn(accept(state, 0, walk.command).state));
    expect(boards(after, unit, [BAY_PORT_V7])).toBe(false);
  });

  it("a unit aboard at that Port steps off once and stays ashore", () => {
    const start = bay({ technologies: ["SHORECRAFT"] });
    const unit = unitAt(start, BAY_UNIT);
    let state = aboard(start, unit, BAY_PORT_V7);
    const landing = bestOf(viewOf(state), unit);
    expect(landing.command.kind).toBe("DISEMBARK");
    expect(landing.score.priority).toBe(810);
    state = nextTurn(accept(state, 0, landing.command).state);
    for (let turn = 0; turn < 2; turn += 1) {
      const view = viewOf(state);
      expect(boards(view, unit, [BAY_PORT_V7])).toBe(false);
      const walk = bestOf(view, unit);
      expect(walk.command.kind).toBe("MOVE");
      state = nextTurn(accept(state, 0, walk.command).state);
    }
  });

  it("boards once Navigation opens the crossing, and sails on", () => {
    const state = bay();
    const unit = unitAt(state, BAY_UNIT);
    const first = bestOf(viewOf(state), unit);
    expect(first.command).toEqual({
      kind: "MOVE",
      unitId: unit,
      path: [BAY_PORT_V7],
    });
    expect(first.score.priority).toBe(1300);
    const sailing = viewOf(nextTurn(accept(state, 0, first.command).state));
    expect(lands(sailing, unit)).toBe(false);
    expect(bestOf(sailing, unit)).toMatchObject({
      command: { kind: "MOVE" },
      score: { priority: 1230 },
    });
  });
});

describe("a village up the coast (Pangea-like, before contact)", () => {
  it("does not board for a village three steps away while a transport keeps the plan active", () => {
    const village: CoordV7 = { x: 4, y: 6 };
    const start = coastHopV7({
      mapType: "PANGEA",
      terrain: COAST_TERRAIN_V7,
      capitals: COAST_CAPITALS_V7,
      ports: [COAST_PORT_V7],
      villages: [village],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 0, y: 6 } },
      ],
      explored: [COAST_VALLEY_V7],
    });
    // The third Fighter is already afloat, so the plan is active.
    const state = aboard(start, unitAt(start, { x: 0, y: 6 }), {
      x: 0,
      y: 10,
    });
    const view = viewOf(state);
    const unit = unitAt(state, COAST_CAPITALS_V7[0]);
    expect(inspectNormalNavalPlanV7(view)).toMatchObject({
      active: true,
      target: village,
      seaShortcut: false,
    });
    // Before the fix it boarded (1300) and then waited off the coast for
    // the village the Fighter on (4, 8) was walking to.
    expect(boards(view, unit, [COAST_PORT_V7])).toBe(false);
  });
});

describe("a transport held up at sea", () => {
  it("does not step off onto a tile it would board from again", () => {
    // Two own Patrol Boats fill the canal: the transport on the Port has no
    // Move, so it is stranded, and the enemy city can be walked to from
    // home. Its way by sea is still 13 steps shorter than the walk through
    // the gap, so on land it would board again: it stays aboard.
    const start = coastHopV7({
      mapType: "LAKES",
      terrain: CANAL_TERRAIN_V7,
      capitals: CANAL_CAPITALS_V7,
      ports: [CANAL_PORT_V7],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 7 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 8 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 8 } },
      ],
    });
    const unit = unitAt(start, { x: 3, y: 7 });
    // From the tile beside the Port the unit boards.
    expect(boards(viewOf(start), unit, [CANAL_PORT_V7])).toBe(true);
    const view = viewOf(aboard(start, unit, CANAL_PORT_V7));
    // The engine offers the landings; the policy takes none of them.
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => command.kind === "DISEMBARK" && command.unitId === unit,
      ),
    ).toBe(true);
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => command.kind === "MOVE" && command.unitId === unit,
      ),
    ).toBe(false);
    expect(lands(view, unit)).toBe(false);
  });
});

describe("a target overseas (Continents)", () => {
  // The strait of `v7-naval-branch.ts`: the enemy capital cannot be walked
  // to, so nothing here changed.
  const strait = (technologies: Parameters<typeof navalArenaV7>[0]) =>
    navalArenaV7(technologies);

  it("boards at its Port as before, with and without Navigation", () => {
    for (const technologies of [undefined, ["SHORECRAFT"] as const]) {
      const state = strait({
        units: [],
        ...(technologies === undefined
          ? {}
          : { technologies: [[...technologies], []] }),
      });
      const view = viewOf(state);
      const unit = unitAt(state, NAVAL_ARENA_CAPITALS_V7[0]);
      expect(inspectNormalNavalPlanV7(view)).toMatchObject({
        active: true,
        target: NAVAL_ARENA_CAPITALS_V7[1],
        seaShortcut: false,
      });
      const first = bestOf(view, unit);
      expect(first.command).toEqual({
        kind: "MOVE",
        unitId: unit,
        path: [NAVAL_ARENA_PORTS_V7[0]],
      });
      expect(first.score.priority).toBe(1300);
    }
  });

  it("a transport that cannot cross yet waits aboard: there is no work at home", () => {
    const start = strait({ units: [], technologies: [["SHORECRAFT"], []] });
    const unit = unitAt(start, NAVAL_ARENA_CAPITALS_V7[0]);
    const view = viewOf(aboard(start, unit, NAVAL_ARENA_PORTS_V7[0]));
    expect(lands(view, unit)).toBe(false);
  });
});

describe("the campaign's jobs beside a sea shortcut", () => {
  it("gives a land job to the units that do not sail, and none to those that do", () => {
    const state = lake({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 8 } }],
    });
    const view = viewOf(state);
    const first = unitAt(state, LAKE_CAPITALS_V7[0]);
    const second = unitAt(state, { x: 2, y: 8 });
    const facts = {
      isHostile: (ownerId: number) => ownerId !== view.viewer.id,
      isAllied: () => false,
      keepsObjective: () => false,
      freeLandSlots: 0,
      seaTarget: LAKE_CAPITALS_V7[1],
    };
    // Without the predicate every capture unit bound for the sea target
    // sails, as before.
    const all = campaignPlanForPolicyV7(view, facts);
    expect(all.assignmentByUnitId.has(first)).toBe(false);
    expect(all.assignmentByUnitId.has(second)).toBe(false);
    const some = campaignPlanForPolicyV7(view, {
      ...facts,
      sails: (unit) => unit.id === first,
    });
    expect(some.assignmentByUnitId.has(first)).toBe(false);
    expect(some.assignmentByUnitId.get(second)).toMatchObject({
      job: "ATTACK",
      at: LAKE_CAPITALS_V7[1],
    });
  });
});
