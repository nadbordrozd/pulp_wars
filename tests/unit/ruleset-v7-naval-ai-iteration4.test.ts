import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  publicDangerForPolicyV7,
} from "../../src/ai/v7";
import {
  navalLaunchSunkV7,
  navalWarshipShoreExposedV7,
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
  seatV7,
} from "../fixtures/v7-naval-branch";

// Naval AI iteration 4 (`pulp_wars-xddb`, docs/architecture/NORMAL_AI.md
// "Naval AI iteration 4"): a warship does not wait in the reach of shore
// guns and Fire Rafts. Proven on the authored strait of
// `tests/fixtures/v7-naval-branch.ts` (rows 0 to 2 and 8 to 10 land, 3 and 7
// Shallow, 4 to 6 Deep; seat 0's capital (5, 2) and Port (4, 3), seat 1's
// capital (5, 8) with a Fighter on it and Port (6, 7)).

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, seatV7(state, 0).id);
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;

/** The danger to the own unit `id` on `at`, as the policy reads it. */
function dangerAt(view: PlayerViewV7, id: UnitId, at: CoordV7): number {
  const projected = projectPublicUnitForPolicyV7(view, id, { at });
  const unit = projected.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("unit not visible");
  return publicDangerForPolicyV7(projected, unit, at);
}

describe("a warship out of shore reach (navalWarshipShoreExposedV7)", () => {
  it("refuses a destination where the shore takes half its HP", () => {
    // Patrol Boat, 10 HP: exposed from 5 danger.
    expect(
      navalWarshipShoreExposedV7({ hp: 10, dangerAtTo: 5, dangerHere: 0 }),
    ).toBe(true);
    expect(
      navalWarshipShoreExposedV7({ hp: 10, dangerAtTo: 4, dangerHere: 0 }),
    ).toBe(false);
    // Already exposed: it may always get away to a less dangerous tile...
    expect(
      navalWarshipShoreExposedV7({ hp: 10, dangerAtTo: 6, dangerHere: 8 }),
    ).toBe(false);
    // ...but not to one as dangerous or worse.
    expect(
      navalWarshipShoreExposedV7({ hp: 10, dangerAtTo: 8, dangerHere: 8 }),
    ).toBe(true);
  });

  it("keeps a Patrol Boat off the coast the hostile Marksmen cover", () => {
    // Seat 0's Patrol Boat mid strait; three seat-1 Marksmen on the south
    // shore west of the capital.
    const state = navalArenaV7({
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "MARKSMAN", at: { x: 2, y: 8 } },
        { seat: 1, role: "MARKSMAN", at: { x: 3, y: 8 } },
        { seat: 1, role: "MARKSMAN", at: { x: 4, y: 8 } },
      ],
    });
    const view = viewOf(state);
    const boat = navalUnitAtV7(state, { x: 3, y: 5 });
    const endOf = (command: CommandV7, unitId: UnitId): CoordV7[] => {
      if (command.kind !== "MOVE" || command.unitId !== unitId) return [];
      const end = command.path.at(-1);
      return end === undefined ? [] : [end];
    };
    const legal = queryPlayerCommandsV7(state, seatV7(state, 0).id).flatMap(
      (command) => endOf(command, boat.id),
    );
    const offered = new Set(
      chooseNormalCommandV7(view).candidates.flatMap((item) =>
        endOf(item.command, boat.id).map(key),
      ),
    );
    const exposed = legal.filter(
      (at) => dangerAt(view, boat.id, at) * 10 >= boat.hp * 5,
    );
    // The shore covers row 7 by the Marksmen; it is legal but not offered.
    expect(exposed.map(key)).toContain("3,7");
    for (const at of exposed) expect(offered.has(key(at))).toBe(false);
    // Out of their reach the boat still sails.
    const safe = legal.filter(
      (at) => !exposed.some((bad) => key(bad) === key(at)),
    );
    expect(safe.length).toBeGreaterThan(0);
    expect(safe.some((at) => offered.has(key(at)))).toBe(true);
  });
});

describe("no ship launched onto a dock where it is sunk (navalLaunchSunkV7)", () => {
  it("is sunk when the danger reaches its HP", () => {
    expect(navalLaunchSunkV7({ maxHp: 10, danger: 10 })).toBe(true);
    expect(navalLaunchSunkV7({ maxHp: 10, danger: 9 })).toBe(false);
  });

  const trainAt = (state: GameStateV7) =>
    chooseNormalCommandV7(viewOf(state)).candidates.filter(
      (item) =>
        item.command.kind === "TRAIN_NAVAL" &&
        item.command.role === "PATROL_BOAT" &&
        key(item.command.at) === "4,3",
    );

  it("does not train a Patrol Boat on a Port the hostile fleet covers", () => {
    // Seat 0's Port (4, 3); three seat-1 Patrol Boats off it (no Battleship
    // or Submarine: the counter to one is launched anyway).
    const covered = navalArenaV7({
      units: [
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
      ],
    });
    // The training is legal, but the policy does not make it.
    expect(
      queryPlayerCommandsV7(covered, seatV7(covered, 0).id).some(
        (command) =>
          command.kind === "TRAIN_NAVAL" &&
          command.role === "PATROL_BOAT" &&
          key(command.at) === "4,3",
      ),
    ).toBe(true);
    for (const item of trainAt(covered)) expect(item.tuple[0]).toBe(-1);
    expect(chooseNormalCommandV7(viewOf(covered)).command?.kind).not.toBe(
      "TRAIN_NAVAL",
    );
    // The same Port with the fleet far off: the boat is trained as before.
    const clear = navalArenaV7({
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 9, y: 6 } }],
    });
    const free = trainAt(clear);
    expect(free.length).toBeGreaterThan(0);
    for (const item of free) expect(item.tuple[0]).toBeGreaterThan(1000);
  });
});
