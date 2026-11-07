import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import {
  exhaustedActivationV7,
  FISHING_HOLE_COST_V7,
  FISHING_HOLE_POPULATION_V7,
  ICE_FOLK_BASELINE_V1_NODES,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  reachableMovementPathsV7,
  validateMovementPathV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  DIVE_HOLES_V7,
  DIVE_TERRAIN_V7,
  frozenArenaV7,
  patchFrozenUnitV7,
  withFishingHolesV7,
  type FrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Ice Folk movement (`pulp_wars-s55m.2`, `pulp-wars-poc-7r124`; the user,
// 2026-11-06: "you can build a fishing hole or an ice harbour on ice and
// it's confusing ... it's pretty generic and doesn't do anything"): the
// Ice Folk build no dock, and the Fishing Hole is their one ice building,
// with a dive from one hole to any other. Small hand-built states on the
// authored strait (`DIVE_TERRAIN_V7`: seat 0's capital on (5, 2) with four
// water tiles two apart in its territory).

const [NORTH_WEST, NORTH_EAST, SOUTH_WEST, SOUTH_EAST] = DIVE_HOLES_V7 as [
  CoordV7,
  CoordV7,
  CoordV7,
  CoordV7,
];

function diveScene(
  units: readonly FrozenUnitV7[],
  holes: readonly CoordV7[] = DIVE_HOLES_V7,
): GameStateV7 {
  return withFishingHolesV7(
    frozenArenaV7({
      units,
      terrain: DIVE_TERRAIN_V7,
      ports: [false, true],
      ice: DIVE_HOLES_V7.map((at) => ({ at })),
    }),
    holes,
  );
}

const ownMoves = (state: GameStateV7, from: CoordV7) => {
  const unitId = navalUnitAtV7(state, from).id;
  return queryPlayerCommandsV7(viewForV7(state, seatV7(state, 0).id)).filter(
    (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
      command.kind === "MOVE" && command.unitId === unitId,
  );
};
const dives = (state: GameStateV7, from: CoordV7): CoordV7[] =>
  ownMoves(state, from)
    .filter(
      (command) =>
        command.path.length === 1 &&
        Math.max(
          Math.abs((command.path[0] as CoordV7).x - from.x),
          Math.abs((command.path[0] as CoordV7).y - from.y),
        ) > 1,
    )
    .map((command) => command.path[0] as CoordV7)
    .sort((left, right) => left.y - right.y || left.x - right.x);
const dive = (state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 => ({
  kind: "MOVE",
  unitId: navalUnitAtV7(state, from).id,
  path: [to],
});

describe("the identity", () => {
  // The Ice Folk roster rework (`pulp_wars-s55m.4`) took 7r125 after it.
  it("was 7r124 after 7r123, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r128");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r128.current");
    const at = PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r124");
    expect(at).toBeGreaterThan(0);
    expect(PRIOR_RULESET_7_IDS[at - 1]).toBe("pulp-wars-poc-7r123");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    const key = OBSOLETE_SAVE_STORAGE_KEYS_V7.indexOf(
      "pulpWars.save.v7r124.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7[key - 1]).toBe(
      "pulpWars.save.v7r123.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

describe("the Fishing Hole dive (pulp_wars-s55m.2)", () => {
  it("is offered from an own Fishing Hole to every other free one, as the unit's whole Move", () => {
    const state = diveScene([{ seat: 0, role: "FIGHTER", at: NORTH_WEST }]);
    expect(dives(state, NORTH_WEST)).toEqual([
      NORTH_EAST,
      SOUTH_WEST,
      SOUTH_EAST,
    ]);
    const yeti = navalUnitAtV7(state, NORTH_WEST);
    expect(validateMovementPathV7(state, yeti, [SOUTH_EAST])).toMatchObject({
      legal: true,
      traversedPath: [SOUTH_EAST],
      spentPoints2: 2,
      interruption: null,
    });
    // The canonical enumeration offers the same dives.
    expect(
      reachableMovementPathsV7(state, yeti)
        .filter((path) => path.path.length === 1)
        .map((path) => path.destination),
    ).toEqual(expect.arrayContaining([NORTH_EAST, SOUTH_WEST, SOUTH_EAST]));
    const result = acceptV7(state, 0, dive(state, NORTH_WEST, SOUTH_EAST));
    expect(result.events[0]).toEqual({
      kind: "UNIT_MOVED",
      unitId: yeti.id,
      path: [SOUTH_EAST],
    });
    const after = navalUnitV7(result.state, yeti.id);
    expect(after.at).toEqual(SOUTH_EAST);
    expect(after.activation).toMatchObject({
      moved: true,
      movedPathLength: 1,
    });
    // It has moved: no second Move, no second dive.
    expect(ownMoves(result.state, SOUTH_EAST)).toEqual([]);
    // The Yeti may act after moving: its Freeze of the water beside the
    // hole is offered.
    expect(
      queryPlayerCommandsV7(
        viewForV7(result.state, seatV7(result.state, 0).id),
      ).some(
        (command) => command.kind === "FREEZE" && command.unitId === yeti.id,
      ),
    ).toBe(true);
  });

  it("never reaches a hole a unit stands on, and needs an unmoved unit standing on a hole", () => {
    const beside = { x: 4, y: 2 };
    const state = diveScene([
      { seat: 0, role: "FIGHTER", at: NORTH_WEST },
      { seat: 0, role: "MARKSMAN", at: NORTH_EAST },
      { seat: 0, role: "FIGHTER", at: beside },
    ]);
    expect(dives(state, NORTH_WEST)).toEqual([SOUTH_WEST, SOUTH_EAST]);
    expect(rejectV7(state, 0, dive(state, NORTH_WEST, NORTH_EAST))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "OCCUPIED" },
    });
    // A unit beside the holes, not on one: no dive.
    expect(dives(state, beside)).toEqual([]);
    expect(rejectV7(state, 0, dive(state, beside, SOUTH_EAST))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "NOT_ADJACENT" },
    });
    // A unit that walked onto a hole has moved.
    const walked = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: navalUnitAtV7(state, beside).id,
      path: [SOUTH_WEST],
    }).state;
    expect(rejectV7(walked, 0, dive(walked, SOUTH_WEST, SOUTH_EAST))).toEqual(
      expect.objectContaining({ code: "UNIT_ALREADY_ACTED" }),
    );
  });

  it("needs a Fishing Hole at both ends, the unit's own", () => {
    // Only two holes: the ice on (6, 1) and (4, 3) is bare.
    const state = diveScene(
      [{ seat: 0, role: "FIGHTER", at: NORTH_WEST }],
      [NORTH_WEST, SOUTH_EAST],
    );
    expect(dives(state, NORTH_WEST)).toEqual([SOUTH_EAST]);
    expect(
      rejectV7(state, 0, dive(state, NORTH_WEST, SOUTH_WEST)).params,
    ).toEqual({ reason: "NOT_ADJACENT" });
  });

  it("is in a hostile unit's threat reach for the other seats", () => {
    const state = diveScene([{ seat: 0, role: "FIGHTER", at: NORTH_WEST }]);
    const yeti = navalUnitAtV7(state, NORTH_WEST);
    const opponent = viewForV7(state, seatV7(state, 1).id);
    // From the south-east hole the Yeti strikes the Deep Water beside it.
    expect(queryThreatenedTilesV7(opponent, yeti.id)).toEqual(
      expect.arrayContaining([
        { x: 7, y: 4 },
        { x: 6, y: 4 },
      ]),
    );
  });

  it("the Normal AI dives to reach an enemy it can then strike", () => {
    // A weak Human Marksman on the ice beside the south-east hole; the Yeti
    // on the north-west hole reaches it only by the dive. A land bridge
    // down column 5 joins the two capitals, so no ice crossing holds the
    // Yeti back, and the seat's other units have acted.
    const base = withFishingHolesV7(
      frozenArenaV7({
        units: [
          { seat: 0, role: "FIGHTER", at: NORTH_WEST },
          { seat: 1, role: "MARKSMAN", at: { x: 7, y: 4 } },
        ],
        terrain: DIVE_TERRAIN_V7.map((row, y) =>
          y >= 3 && y <= 7 ? `${row.slice(0, 5)}.${row.slice(6)}` : row,
        ),
        ports: [false, true],
        ice: [...DIVE_HOLES_V7, { x: 7, y: 4 }].map((at) => ({ at })),
      }),
      DIVE_HOLES_V7,
    );
    let state = patchFrozenUnitV7(
      base,
      navalUnitAtV7(base, { x: 7, y: 4 }).id,
      { hp: 1 },
    );
    const yeti = navalUnitAtV7(state, NORTH_WEST);
    for (const unit of state.units)
      if (unit.ownerId === yeti.ownerId && unit.id !== yeti.id)
        state = patchFrozenUnitV7(state, unit.id, {
          activation: exhaustedActivationV7(),
        });
    const view = viewForV7(state, seatV7(state, 0).id);
    const best = chooseNormalCommandV7(view).candidates.find(
      (item) => "unitId" in item.command && item.command.unitId === yeti.id,
    );
    expect(best?.command).toEqual(dive(state, NORTH_WEST, SOUTH_EAST));
  });
});

describe("no docks for the Ice Folk (pulp_wars-s55m.2)", () => {
  it("their tree unlocks no Port, Shipyard, Harbours, or naval discount, and no node is empty", () => {
    for (const node of ICE_FOLK_BASELINE_V1_NODES) {
      expect(node.unlocks.length, node.id).toBeGreaterThan(0);
      for (const unlock of node.unlocks) {
        expect(unlock.kind, node.id).not.toBe("HARBOURS");
        expect(unlock.kind, node.id).not.toBe("NAVAL_TRAINING_DISCOUNT");
        if (unlock.kind === "COMMAND")
          expect(["BUILD_PORT", "BUILD_SHIPYARD"], node.id).not.toContain(
            unlock.command,
          );
      }
    }
    const unlocks = (id: string) =>
      ICE_FOLK_BASELINE_V1_NODES.find((node) => node.id === id)?.unlocks;
    expect(unlocks("SHORECRAFT")).toEqual(
      expect.arrayContaining([
        { kind: "FREEZE", depth: "SHALLOW" },
        { kind: "COMMAND", command: "BUILD_FISHING_HOLE" },
      ]),
    );
    // Hoarfrost keeps its long Freeze line, Glacier its thick ice.
    expect(unlocks("NAVAL_ENGINEERING")).toEqual([{ kind: "LONG_FREEZE" }]);
    expect(unlocks("SUBMERSIBLES")).toEqual([{ kind: "GLACIER" }]);
  });

  it("an Ice Folk seat is offered a Fishing Hole on its ice and never a Port or a Shipyard", () => {
    const state = frozenArenaV7({
      units: [],
      ice: [{ at: { x: 5, y: 3 } }],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const offered = queryPlayerCommandsV7(view);
    expect(
      offered.some(
        (command) =>
          command.kind === "BUILD_PORT" || command.kind === "BUILD_SHIPYARD",
      ),
    ).toBe(false);
    expect(offered).toContainEqual({
      kind: "BUILD_FISHING_HOLE",
      at: { x: 5, y: 3 },
    });
    // The rules refuse a Port on its ice and on open water, and a Shipyard
    // on the dock it holds.
    for (const at of [
      { x: 5, y: 3 },
      { x: 6, y: 3 },
    ])
      expect(rejectV7(state, 0, { kind: "BUILD_PORT", at })).toEqual({
        code: "INVALID_TILE",
        params: { action: "BUILD_PORT" },
      });
    expect(
      rejectV7(state, 0, { kind: "BUILD_SHIPYARD", at: { x: 4, y: 3 } }),
    ).toEqual({ code: "INVALID_TILE", params: { action: "BUILD_SHIPYARD" } });
    // The Fishing Hole: 3 Coins, +1 population.
    expect([FISHING_HOLE_COST_V7, FISHING_HOLE_POPULATION_V7]).toEqual([3, 1]);
    const built = acceptV7(state, 0, {
      kind: "BUILD_FISHING_HOLE",
      at: { x: 5, y: 3 },
    });
    expect(built.events[0]).toMatchObject({
      kind: "ECONOMIC_BUILDING_BUILT",
      cost: 3,
    });
  });

  it("every other seat still builds its Port on open Shallow Water", () => {
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [],
      ports: [false, true],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(queryPlayerCommandsV7(view)).toContainEqual({
      kind: "BUILD_PORT",
      at: { x: 5, y: 3 },
    });
    acceptV7(state, 0, { kind: "BUILD_PORT", at: { x: 5, y: 3 } });
  });
});
