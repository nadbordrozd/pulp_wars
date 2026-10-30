import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalTacticalFactsV7,
} from "../../src/ai/v7";
import {
  BARRICADE_BREACH_PRIORITY_V7,
  BARRICADE_CROSSING_COST_V7,
  BARRICADE_DETOUR_STEPS_V7,
  barricadeOnRouteV7,
  barricadeRouteMarksV7,
  landRouteStepsV7,
} from "../../src/ai/v7-barricades";
import { RouteFieldV7 } from "../../src/ai/v7-campaign";
import {
  BARRICADE_CAP_V7,
  BARRICADE_HP_V7,
  applyCommandV7,
  queryAiReadyCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import { unitMayEnterMountainV7 } from "../../src/engine/rules/ruleset-v7";
import { playable } from "./ruleset-v7-mission-directives.shared";

// Barricades in the way (`pulp_wars-54fb`, docs/architecture/NORMAL_AI.md
// "Barricades in the way", `src/ai/v7-barricades.ts`). The user: in Dwarf
// mission 1 the dead never attacked the Barricades, and should when one is
// in the way. The rule: a land route goes round a hostile Barricade when
// the way round is at most `BARRICADE_DETOUR_STEPS_V7` steps longer and
// through it otherwise, and a unit whose route runs through a hostile
// Barricade in its range attacks it. Hand-built states only, one decision
// each; no match is played.

const at = (x: number, y: number): CoordV7 => ({ x, y });

// ------------------------------------------------------------ The routes ---

/**
 * A route field on a hand-drawn board: `#` rock, `.` open, `U` the unit
 * (open), `G` the goal, `B` a hostile Barricade, `W` an own one; `as`
 * redraws every Barricade first (`.` open ground, `#` rock).
 */
function drawn(
  rows: readonly string[],
  as?: "." | "#",
): {
  readonly field: RouteFieldV7;
  readonly unit: CoordV7;
  readonly barricade: CoordV7 | undefined;
} {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const enterable = new Uint8Array(width * height);
  const marks = new Uint8Array(width * height);
  const sources: number[] = [];
  let unit: CoordV7 | undefined;
  let barricade: CoordV7 | undefined;
  rows.forEach((row, y) => {
    [...row].forEach((written, x) => {
      const index = y * width + x;
      const drawnBarricade = written === "B" || written === "W";
      const cell = as !== undefined && drawnBarricade ? as : written;
      if (cell !== "#") enterable[index] = 1;
      if (cell === "G") sources.push(index);
      if (cell === "U") unit = at(x, y);
      if (cell === "B") marks[index] = 1;
      if (cell === "W") marks[index] = 2;
      if (drawnBarricade) barricade = at(x, y);
    });
  });
  if (unit === undefined) throw new Error("no unit drawn");
  const steps = landRouteStepsV7(
    width,
    height,
    enterable,
    sources,
    marks.some((mark) => mark !== 0) ? marks : null,
  );
  return { field: new RouteFieldV7(width, height, steps), unit, barricade };
}

/** Whether the drawn Barricade lies on the drawn unit's route. */
function onRoute(rows: readonly string[]): boolean {
  const { field, unit, barricade } = drawn(rows);
  if (barricade === undefined) throw new Error("no Barricade drawn");
  return barricadeOnRouteV7(field, unit, barricade);
}

/** The steps the way round adds to the way through the Barricade. */
function detour(rows: readonly string[]): number | undefined {
  const { field: round, unit } = drawn(rows, "#");
  const { field: through } = drawn(rows, ".");
  const roundSteps = round.get(unit);
  const throughSteps = through.get(unit);
  if (throughSteps === undefined) throw new Error("no way through");
  return roundSteps === undefined ? undefined : roundSteps - throughSteps;
}

describe("Barricades in the way: the routes", () => {
  it("is the plain breadth-first search with no Barricade", () => {
    const { field } = drawn(["#####", "U...G", "#####"]);
    expect([0, 1, 2, 3, 4].map((x) => field.get(at(x, 1)))).toEqual([
      4, 3, 2, 1, 0,
    ]);
    expect(field.get(at(0, 0))).toBeUndefined();
  });

  it("crosses a hostile Barricade with no way round at its cost", () => {
    const lane = ["#######", ".UB...G", "#######"];
    const { field } = drawn(lane);
    expect(detour(lane)).toBeUndefined();
    expect(field.get(at(3, 1))).toBe(3);
    expect(field.get(at(2, 1))).toBe(3 + BARRICADE_CROSSING_COST_V7);
    expect(field.get(at(1, 1))).toBe(4 + BARRICADE_CROSSING_COST_V7);
    expect(onRoute(lane)).toBe(true);
    // From two tiles away (a ranged unit's reach) it is on the route too.
    expect(barricadeOnRouteV7(field, at(0, 1), at(2, 1))).toBe(true);
    // Past it (nearer the goal) it is not.
    expect(barricadeOnRouteV7(field, at(3, 1), at(2, 1))).toBe(false);
  });

  it("goes round when the way round is no longer", () => {
    const beside = ["###.###", "U..B..G", "#######"];
    expect(detour(beside)).toBe(0);
    expect(onRoute(beside)).toBe(false);
  });

  it("goes round a detour of BARRICADE_DETOUR_STEPS_V7, breaks a longer one", () => {
    // The unit stands at the foot of a shaft that climbs over a rock spur
    // and comes down beyond the Barricade.
    const three = ["###.##", "##.#.#", "##.#.#", "##UB.G"];
    expect(detour(three)).toBe(BARRICADE_DETOUR_STEPS_V7);
    expect(onRoute(three)).toBe(false);
    const five = ["###.##", "##.#.#", "##.#.#", "##.#.#", "##UB.G"];
    expect(detour(five)).toBeGreaterThan(BARRICADE_DETOUR_STEPS_V7);
    expect(onRoute(five)).toBe(true);
  });

  it("never enters an own or allied Barricade (a wall)", () => {
    const { field } = drawn(["#######", "U.W...G", "#######"]);
    expect(field.get(at(2, 1))).toBeUndefined();
    expect(field.get(at(0, 1))).toBeUndefined();
  });
});

// ------------------------------------------------ Dwarf mission 1 boards ---

// Copperstep (6, 5) on the Highlands of DWARF_1: Mountains on (6, 4),
// (7, 4), (7, 5), and (6, 6), so its land approaches for a unit that cannot
// climb are (5, 4), (5, 5), (5, 6), and (7, 6).
const COPPERSTEP = at(6, 5);
const APPROACHES = [at(5, 4), at(5, 5), at(5, 6), at(7, 6)];

/** DWARF_1 after the Dwarves end their first turn: the dead to act. */
function deadToAct(
  change: (
    state: GameStateV7,
    dwarf: GameStateV7["players"][number],
  ) => GameStateV7,
): { readonly state: GameStateV7; readonly view: PlayerViewV7 } {
  const first = playable("DWARF_1");
  const dwarf = first.players[0];
  if (dwarf === undefined) throw new Error("no Dwarf seat");
  const ended = applyCommandV7(first, dwarf.id, { kind: "END_TURN" });
  if (!ended.accepted) throw new Error("END_TURN refused");
  const state = change(ended.state, dwarf);
  const dead = state.players[1];
  if (dead === undefined) throw new Error("no Undead seat");
  return { state, view: viewForV7(state, dead.id) };
}

/**
 * The dwarves leave Copperstep's approaches (Tobbin stays in the town),
 * Barricades of theirs stand on `barricades` (with `hp`), and the dead
 * Fighter of (2, 0) stands on `fighterAt` (Tobbin on `tobbinAt`).
 */
function walled(
  barricades: readonly CoordV7[],
  fighterAt: CoordV7,
  hp: (where: CoordV7) => number = () => BARRICADE_HP_V7,
  tobbinAt: CoordV7 = COPPERSTEP,
) {
  return deadToAct((state, dwarf) => ({
    ...state,
    units: state.units
      .filter((unit) => unit.ownerId !== dwarf.id || unit.role === "CAPTAIN")
      .map((unit) =>
        unit.ownerId === dwarf.id
          ? { ...unit, at: tobbinAt }
          : unit.at.x === 2 && unit.at.y === 0
            ? { ...unit, at: fighterAt }
            : unit,
      ),
    barricades: barricades.map((where) => ({
      at: where,
      ownerId: dwarf.id,
      hp: hp(where),
    })),
  }));
}

/** The scored candidates of the unit on `where`, best first. */
function candidatesOf(view: PlayerViewV7, where: CoordV7) {
  const unit = fighterOn(view, where);
  return chooseNormalCommandV7(view).candidates.filter(
    (candidate) =>
      "unitId" in candidate.command && candidate.command.unitId === unit.id,
  );
}

function fighterOn(view: PlayerViewV7, where: CoordV7) {
  const unit = view.units.find(
    (candidate) => candidate.at.x === where.x && candidate.at.y === where.y,
  );
  if (unit === undefined) throw new Error(`no unit on ${where.x},${where.y}`);
  return unit;
}

describe("Barricades in the way: Dwarf mission 1", () => {
  it("has four land approaches to Copperstep, one Barricade each", () => {
    const state = playable("DWARF_1");
    const dead = state.units.find(
      (unit) =>
        unit.ownerId === state.players[1]?.id && unit.role === "FIGHTER",
    );
    if (dead === undefined) throw new Error("no dead Fighter");
    // The dead learn nothing, so no Mountain is open to them.
    const engineering =
      state.players[1]?.researchedTechs.includes("ENGINEERING") ?? true;
    expect(engineering).toBe(false);
    expect(unitMayEnterMountainV7(state, dead, engineering)).toBe(false);
    const land = state.board.tiles.filter(
      (tile) =>
        Math.max(
          Math.abs(tile.at.x - COPPERSTEP.x),
          Math.abs(tile.at.y - COPPERSTEP.y),
        ) === 1 &&
        (tile.terrain === "GRASS" || tile.terrain === "FOREST"),
    );
    expect(land.map((tile) => tile.at)).toEqual(
      [...APPROACHES].sort((a, b) => a.y - b.y || a.x - b.x),
    );
    // Tobbin, an Engineer, can stand a Barricade on every one of them.
    expect(APPROACHES.length).toBeLessThanOrEqual(BARRICADE_CAP_V7);
  });

  it("walled in, every dead unit still marches on Copperstep", () => {
    const { view } = walled(APPROACHES, at(4, 4));
    const campaign = inspectNormalTacticalFactsV7(view).campaign;
    const dead = view.units.filter((unit) => unit.ownerId === view.viewer.id);
    expect(campaign.assignments.map((entry) => entry.unitId).sort()).toEqual(
      dead.map((unit) => unit.id).sort(),
    );
    for (const entry of campaign.assignments)
      expect(entry).toMatchObject({ job: "ATTACK", at: COPPERSTEP });
    // With no Barricade the same marks are absent (the plain search).
    expect(
      barricadeRouteMarksV7(walled([], at(4, 4)).view, () => true),
    ).toBeNull();
  });

  it("a unit whose only way in is through a Barricade attacks it", () => {
    const { view } = walled(APPROACHES, at(4, 4));
    const fighter = fighterOn(view, at(4, 4));
    // Both Barricades beside it are offered; before pulp_wars-54fb no
    // command of this unit scored at all, so it stood there.
    const offered = queryAiReadyCommandsV7(view)
      .map((item) => item.command)
      .filter(
        (command) =>
          command.kind === "ATTACK_BARRICADE" && command.unitId === fighter.id,
      );
    expect(offered).toHaveLength(2);
    const own = candidatesOf(view, at(4, 4));
    expect(own[0]?.command).toEqual({
      kind: "ATTACK_BARRICADE",
      unitId: fighter.id,
      at: at(5, 4),
    });
    expect(own[0]?.score.priority).toBe(BARRICADE_BREACH_PRIORITY_V7);
  });

  it("of the Barricades on its route it hits the weakest", () => {
    const { view } = walled(APPROACHES, at(4, 4), (where) =>
      where.y === 5 ? 3 : BARRICADE_HP_V7,
    );
    expect(candidatesOf(view, at(4, 4))[0]?.command).toMatchObject({
      kind: "ATTACK_BARRICADE",
      at: at(5, 5),
    });
  });

  it("a unit further out walks up to the wall", () => {
    // Tobbin is away at Slagheap, so no defender's reach holds the dead
    // back (the assault masses outside a defended town), and the route
    // through the wall still draws the Fighter to it.
    const { view } = walled(APPROACHES, at(3, 3), undefined, at(9, 5));
    const best = candidatesOf(view, at(3, 3))[0]?.command;
    expect(best?.kind).toBe("MOVE");
    const end = best?.kind === "MOVE" ? best.path.at(-1) : undefined;
    expect(end).toEqual(at(4, 4));
  });

  it("a unit with an open way round ignores the Barricade", () => {
    // Only (5, 4) is barricaded: (5, 5) beside it is as short a way in.
    const { view } = walled([at(5, 4)], at(4, 4));
    const fighter = fighterOn(view, at(4, 4));
    // The Barricade is offered, it just is not in the way.
    expect(
      queryAiReadyCommandsV7(view).some(
        (item) =>
          item.command.kind === "ATTACK_BARRICADE" &&
          item.command.unitId === fighter.id,
      ),
    ).toBe(true);
    const own = candidatesOf(view, at(4, 4));
    expect(own.some((item) => item.command.kind === "ATTACK_BARRICADE")).toBe(
      false,
    );
    // It walks on through the open approach.
    expect(own[0]?.command).toMatchObject({ kind: "MOVE", path: [at(5, 5)] });
  });

  it("a Barricade behind the unit is never hit", () => {
    // The Fighter is through the approach (5, 4), the Barricade at its back.
    const { view } = walled([at(4, 4)], at(5, 4));
    const own = candidatesOf(view, at(5, 4));
    expect(own.some((item) => item.command.kind === "ATTACK_BARRICADE")).toBe(
      false,
    );
  });
});
