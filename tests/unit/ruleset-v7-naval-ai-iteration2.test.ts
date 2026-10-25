import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  publicDangerForPolicyV7,
} from "../../src/ai/v7";
import {
  NAVAL_TRANSPORT_ESCAPE_PRIORITY_V7,
  NAVAL_TRANSPORT_EXPOSED_TENTHS_V7,
  navalLandingInForceV7,
  navalTransportEscapeValueV7,
} from "../../src/ai/v7-naval";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
  type NavalArenaOptionsV7,
} from "../fixtures/v7-naval-branch";

// Naval AI iteration 2 (`pulp_wars-32bb`, docs/architecture/NORMAL_AI.md
// "Naval AI iteration 2"): a transport does not land outnumbered, an exposed
// transport sails out of reach, and the urgent Patrol Boat answers a hostile
// warship, not a hostile transport. Proven on the authored strait of
// `tests/fixtures/v7-naval-branch.ts` (rows 0 to 2 and 8 to 10 land, 3 and 7
// Shallow, 4 to 6 Deep; seat 0's capital (5, 2) and Port (4, 3), seat 1's
// capital (5, 8) with a Fighter on it and Port (6, 7)).

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, seatV7(state, 0).id);
}

function idAt(state: GameStateV7, at: CoordV7): UnitId {
  return navalUnitAtV7(state, at).id;
}

/** Seat 0's Fighters placed on land at `from`, then put afloat at `to`. */
function embark(
  state: GameStateV7,
  moves: readonly { readonly from: CoordV7; readonly to: CoordV7 }[],
): { readonly state: GameStateV7; readonly ids: readonly UnitId[] } {
  let next = state;
  const ids: UnitId[] = [];
  for (const move of moves) {
    const id = idAt(next, move.from);
    ids.push(id);
    next = patchNavalUnitV7(next, id, { at: move.to, form: "EMBARKED" });
  }
  return { state: next, ids };
}

function scored(view: PlayerViewV7) {
  return chooseNormalCommandV7(view).candidates;
}

function landingsOf(commands: readonly CommandV7[], unitId: UnitId) {
  return commands.filter(
    (command) => command.kind === "DISEMBARK" && command.unitId === unitId,
  );
}

/** The danger to the own unit `id` afloat on `at`, as the policy reads it. */
function afloatDanger(view: PlayerViewV7, id: UnitId, at: CoordV7): number {
  const projected = projectPublicUnitForPolicyV7(view, id, {
    at,
    form: "EMBARKED",
  });
  const unit = projected.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("unit not visible");
  return publicDangerForPolicyV7(projected, unit, at);
}

describe("the landing in force (navalLandingInForceV7)", () => {
  it("lands when not outnumbered, or when it would be sunk where it waits", () => {
    const landing = (force: number, defenders: number, lethal = false) =>
      navalLandingInForceV7({ force, defenders, lethalAfloat: lethal });
    expect(landing(1, 0)).toBe(true);
    expect(landing(1, 1)).toBe(true);
    expect(landing(1, 2)).toBe(false);
    expect(landing(2, 3)).toBe(false);
    expect(landing(3, 3)).toBe(true);
    expect(landing(4, 3)).toBe(true);
    expect(landing(1, 3, true)).toBe(true);
  });

  // Three hostile Fighters stand within two tiles of the landing coast by
  // seat 1's capital: the one on the center and two on (6, 9) and (6, 10),
  // out of reach of the water. Only the one on the center reaches the
  // transports, so none of them is in lethal danger.
  const defended = (extra: NavalArenaOptionsV7["units"]) =>
    navalArenaV7({
      units: [
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 9 } },
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 10 } },
        ...extra,
      ],
    });

  it("holds a lone transport off a coast three defenders hold", () => {
    const { state, ids } = embark(
      defended([{ seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } }]),
      [{ from: { x: 3, y: 1 }, to: { x: 4, y: 7 } }],
    );
    const view = viewOf(state);
    const cargo = ids[0];
    if (cargo === undefined) throw new Error("no cargo");
    // The landing beside the capital is offered, and nothing sinks the
    // transport where it waits.
    expect(
      landingsOf(queryPlayerCommandsV7(view), cargo).some(
        (command) =>
          command.kind === "DISEMBARK" &&
          command.at.x === 4 &&
          command.at.y === 8,
      ),
    ).toBe(true);
    const cargoUnit = view.units.find((unit) => unit.id === cargo);
    if (cargoUnit === undefined) throw new Error("cargo not visible");
    expect(afloatDanger(view, cargo, cargoUnit.at)).toBeLessThan(cargoUnit.hp);
    expect(
      landingsOf(
        scored(view).map((item) => item.command),
        cargo,
      ),
    ).toEqual([]);
  });

  it("lands when it is not outnumbered there", () => {
    // Two transports beside the landing and a Fighter already ashore on
    // (3, 9): three against three. (A beachhead, so the wave does not wait
    // for followers either.)
    const { state, ids } = embark(
      defended([
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 1 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 9 } },
      ]),
      [
        { from: { x: 3, y: 1 }, to: { x: 4, y: 7 } },
        { from: { x: 4, y: 1 }, to: { x: 3, y: 7 } },
      ],
    );
    const view = viewOf(state);
    for (const id of ids) {
      const unit = view.units.find((candidate) => candidate.id === id);
      if (unit === undefined) throw new Error("cargo not visible");
      expect(afloatDanger(view, id, unit.at)).toBeLessThan(unit.hp);
    }
    const landings = ids.flatMap((id) =>
      landingsOf(
        scored(view).map((item) => item.command),
        id,
      ),
    );
    expect(landings.length).toBeGreaterThan(0);
  });
});

describe("an exposed transport sails out of reach (navalTransportEscapeValueV7)", () => {
  it("values the danger left behind, twice when the destination is safe", () => {
    expect(NAVAL_TRANSPORT_EXPOSED_TENTHS_V7).toBe(5);
    const escape = (dangerHere: number, dangerAtTo: number) =>
      navalTransportEscapeValueV7({ hp: 12, dangerHere, dangerAtTo });
    // Not exposed where it stands: no escape.
    expect(escape(5, 0)).toBe(0);
    // Exposed, and the destination is no safer.
    expect(escape(8, 8)).toBe(0);
    expect(escape(8, 10)).toBe(0);
    // Safer but still exposed, then out of the exposure.
    expect(escape(10, 7)).toBe(3);
    expect(escape(10, 5)).toBe(10);
  });

  it("moves a transport two Patrol Boats reach to a tile only one reaches", () => {
    const { state, ids } = embark(
      navalArenaV7({
        units: [
          { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 4 } },
        ],
      }),
      [{ from: { x: 1, y: 2 }, to: { x: 1, y: 3 } }],
    );
    const view = viewOf(state);
    const cargo = ids[0];
    if (cargo === undefined) throw new Error("no cargo");
    const here = afloatDanger(view, cargo, { x: 1, y: 3 });
    expect(here * 10).toBeGreaterThanOrEqual(
      12 * NAVAL_TRANSPORT_EXPOSED_TENTHS_V7,
    );
    const moves = scored(view).filter(
      (item) => item.command.kind === "MOVE" && item.command.unitId === cargo,
    );
    const escapes = moves.filter(
      (item) => item.tuple[0] === NAVAL_TRANSPORT_ESCAPE_PRIORITY_V7,
    );
    expect(escapes.length).toBeGreaterThan(0);
    // Its best Move leaves it in less danger than where it stands.
    const best = moves[0]?.command;
    const end = best?.kind === "MOVE" ? best.path.at(-1) : undefined;
    if (end === undefined) throw new Error("the transport has no Move");
    expect(afloatDanger(view, cargo, end)).toBeLessThan(here);
  });
});

describe("the urgent Patrol Boat answers a warship, not a transport", () => {
  const patrolPriority = (state: GameStateV7): number | undefined =>
    scored(viewOf(state)).find(
      (item) =>
        item.command.kind === "TRAIN_NAVAL" &&
        item.command.role === "PATROL_BOAT",
    )?.tuple[0];

  it("trains it at 1290 under a hostile Patrol Boat only", () => {
    // A hostile transport afloat in sight: the boat is no emergency (it
    // used to be trained at 1290, and nobody boarded until it was).
    const transport = navalArenaV7({
      units: [{ seat: 1, role: "FIGHTER", at: { x: 2, y: 9 } }],
    });
    const afloat = patchNavalUnitV7(
      transport,
      idAt(transport, { x: 2, y: 9 }),
      { at: { x: 2, y: 6 }, form: "EMBARKED" },
    );
    // (Here the savings goal holds it, as it holds every other training.)
    expect(patrolPriority(afloat) ?? 0).toBeLessThan(1290);
    // A hostile Patrol Boat in sight: it is.
    const warship = navalArenaV7({
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 6 } }],
    });
    expect(patrolPriority(warship)).toBe(1290);
  });
});
