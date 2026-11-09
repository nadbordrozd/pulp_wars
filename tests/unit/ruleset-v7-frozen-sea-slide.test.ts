import { describe, expect, it } from "vitest";
import {
  effectiveRoleRuleV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  reachableMovementPathsV7,
  unitMovementModeV7,
  validateMovementPathV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  frozenShipsV7,
  lineV7,
  patchFrozenUnitV7,
  type FrozenIceV7,
} from "../fixtures/v7-frozen-sea";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

/** Every Ice Folk Naval technology but Glacier (Submersibles). */
const NO_GLACIER = NAVAL_TECHS_V7.filter((tech) => tech !== "SUBMERSIBLES");

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.3 and 8.7): ice is
// ground for land-form units and closed to ships; every other ground unit
// slipped (its Move ended on entering ice) until `pulp_wars-y242` (7r132):
// since then only the Ice Folk, walkers, and flyers enter ice. Ice Folk movement
// (`pulp_wars-s55m.2`, `pulp-wars-poc-7r124`; the forced slide before): an
// Ice Folk unit skates (each step onto ice costs half a Move point), the
// Sled and the Snow Hunter glide free straight on along the ice (Runners),
// and the Sled glides on through zones of control.

const CENTER: CoordV7 = { x: 5, y: 5 };
const DIRECTIONS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
const sorted = (tiles: readonly CoordV7[]): CoordV7[] =>
  [...tiles].sort((left, right) => left.y - right.y || left.x - right.x);
/** Ice on the center and two tiles out in each of the eight directions. */
const STAR: readonly FrozenIceV7[] = [
  { at: CENTER },
  ...DIRECTIONS.flatMap(([dx, dy]) =>
    lineV7(CENTER, dx, dy, 2).map((at) => ({ at })),
  ),
];
/** A column of ice across the strait on `x`: rows 3 to 7. */
const bridge = (x: number): readonly FrozenIceV7[] =>
  lineV7({ x, y: 2 }, 0, 1, 5).map((at) => ({ at }));

const move = (
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): CommandV7 => ({
  kind: "MOVE",
  unitId: navalUnitAtV7(state, from).id,
  path: [...path],
});
const offeredMoves = (state: GameStateV7, from: CoordV7, seat: 0 | 1 = 0) => {
  const unitId = navalUnitAtV7(state, from).id;
  return queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id)).filter(
    (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
      command.kind === "MOVE" && command.unitId === unitId,
  );
};
const destinations = (state: GameStateV7, from: CoordV7, seat: 0 | 1 = 0) =>
  sorted(
    offeredMoves(state, from, seat).map(
      (command) => command.path.at(-1) as CoordV7,
    ),
  );
const spent = (state: GameStateV7, from: CoordV7, path: readonly CoordV7[]) =>
  validateMovementPathV7(state, navalUnitAtV7(state, from), path);

describe("Skating (Ice Folk movement, pulp_wars-s55m.2)", () => {
  it("each step onto ice costs an Ice Folk unit half a Move point, and it may stop on any tile", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
      ice: bridge(2),
    });
    const from = { x: 2, y: 2 };
    const column = lineV7(from, 0, 1, 5);
    expect(effectiveRoleRuleV7("FIGHTER", "ICE_FOLK").move).toBe(1);
    // A Yeti (Move 1) skates two ice tiles: half a point each.
    expect(spent(state, from, column.slice(0, 1))).toMatchObject({
      legal: true,
      spentPoints2: 1,
    });
    expect(spent(state, from, column.slice(0, 2))).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
    expect(spent(state, from, column.slice(0, 3))).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    // No forced slide: it stops on the first tile.
    const result = acceptV7(state, 0, move(state, from, column.slice(0, 1)));
    expect(navalUnitV7(result.state, navalUnitAtV7(state, from).id).at).toEqual(
      column[0],
    );
    expect(destinations(state, from)).toEqual(
      expect.arrayContaining([column[0], column[1]] as CoordV7[]),
    );
    expect(destinations(state, from)).not.toContainEqual(column[2]);
    // A step off the ice onto land costs a full point (ice is no Road).
    const onIce = patchFrozenUnitV7(state, navalUnitAtV7(state, from).id, {
      at: { x: 2, y: 3 },
    });
    expect(spent(onIce, { x: 2, y: 3 }, [from])).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
  });

  it("skates in all eight directions and may turn on the ice", () => {
    const state = frozenArenaV7({
      technologies: [NO_GLACIER, NO_GLACIER],
      units: [{ seat: 0, role: "FIGHTER", at: CENTER }],
      ice: STAR,
    });
    // Every tile of the star but its center: two half steps away at most.
    expect(destinations(state, CENTER)).toEqual(
      sorted(STAR.map((entry) => entry.at).filter((at) => at !== CENTER)),
    );
    for (const [dx, dy] of DIRECTIONS)
      expect(spent(state, CENTER, lineV7(CENTER, dx, dy, 2))).toMatchObject({
        legal: true,
        spentPoints2: 2,
      });
  });

  it("every Ice Folk ground role skates, the Frost Wyrm flies over the ice, and Glacier adds no Move", () => {
    for (const technologies of [NO_GLACIER, NAVAL_TECHS_V7]) {
      const state = frozenArenaV7({
        technologies: [technologies, technologies],
        units: [
          { seat: 0, role: "CATAPULT", at: { x: 2, y: 2 } },
          { seat: 0, role: "KNIGHT", at: { x: 7, y: 2 } },
        ],
        ice: [...bridge(2), ...bridge(7)],
      });
      const from = { x: 2, y: 2 };
      // The Snow Golem and the Mammoth (`pulp_wars-3qtp`, 7r134): the Snow Golem
      // has Move 1 (2 before).
      expect(effectiveRoleRuleV7("CATAPULT", "ICE_FOLK").move).toBe(1);
      // Two ice tiles at half a point each: the whole Move of 1.
      expect(spent(state, from, lineV7(from, 0, 1, 2))).toMatchObject({
        legal: true,
        spentPoints2: 2,
      });
      expect(spent(state, from, lineV7(from, 0, 1, 3))).toEqual({
        legal: false,
        reason: "BUDGET_EXCEEDED",
      });
      // The Ice Folk roster rework (`pulp_wars-s55m.4`): the Frost Wyrm is a
      // flyer: it does not skate, each tile is a whole step of its Move 3.
      const wyrm = { x: 7, y: 2 };
      expect(effectiveRoleRuleV7("KNIGHT", "ICE_FOLK").move).toBe(3);
      expect(spent(state, wyrm, lineV7(wyrm, 0, 1, 3))).toMatchObject({
        legal: true,
        spentPoints2: 6,
      });
      expect(spent(state, wyrm, lineV7(wyrm, 0, 1, 4))).toEqual({
        legal: false,
        reason: "BUDGET_EXCEEDED",
      });
    }
  });

  it("passes its own units on the ice", () => {
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 3 } },
      ],
      ice: bridge(2),
    });
    const from = { x: 2, y: 2 };
    acceptV7(state, 0, move(state, from, lineV7(from, 0, 1, 2)));
    expect(destinations(state, from)).toContainEqual({ x: 2, y: 4 });
    expect(destinations(state, from)).not.toContainEqual({ x: 2, y: 3 });
  });
});

describe("Runners (Ice Folk movement, pulp_wars-s55m.2)", () => {
  it("the Sled and the Snow Hunter glide free in a straight line along the ice and stop anywhere", () => {
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "RAIDER", at: { x: 2, y: 2 } },
        { seat: 0, role: "MARKSMAN", at: { x: 7, y: 2 } },
      ],
      ice: [...bridge(2), ...bridge(7)],
    });
    const sled = { x: 2, y: 2 };
    const hunter = { x: 7, y: 2 };
    const column = lineV7(sled, 0, 1, 5);
    // The first step onto the ice is a skate; every step straight on is free.
    for (const length of [1, 2, 3, 4, 5])
      expect(spent(state, sled, column.slice(0, length))).toMatchObject({
        legal: true,
        spentPoints2: 1,
      });
    // The Sled (Move 2) then steps ashore at a full point.
    const ashore = [...column, { x: 2, y: 8 }];
    expect(spent(state, sled, ashore)).toMatchObject({
      legal: true,
      spentPoints2: 3,
    });
    const result = acceptV7(state, 0, move(state, sled, ashore));
    const sledId = navalUnitAtV7(state, sled).id;
    expect(navalUnitV7(result.state, sledId).at).toEqual({ x: 2, y: 8 });
    // The glided tiles are part of the path (its Charge counts them).
    expect(navalUnitV7(result.state, sledId).activation.movedPathLength).toBe(
      6,
    );
    // Every tile of the ice is offered, and the shore beyond it.
    expect(destinations(state, sled)).toEqual(
      expect.arrayContaining([...column, { x: 2, y: 8 }] as CoordV7[]),
    );
    // The Snow Hunter (Move 1) glides the whole column too, and no farther.
    const hunterColumn = lineV7(hunter, 0, 1, 5);
    expect(spent(state, hunter, hunterColumn)).toMatchObject({
      legal: true,
      spentPoints2: 1,
    });
    expect(spent(state, hunter, [...hunterColumn, { x: 7, y: 8 }])).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    expect(destinations(state, hunter)).toEqual(
      expect.arrayContaining(hunterColumn as CoordV7[]),
    );
  });

  it("a turn on the ice is a new skate; only a straight step from ice onto ice is free", () => {
    // An L: down the column x = 2 to (2, 5), then east along row 5 to (5, 5).
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "MARKSMAN", at: { x: 2, y: 2 } }],
      ice: [
        ...lineV7({ x: 2, y: 2 }, 0, 1, 3).map((at) => ({ at })),
        ...lineV7({ x: 2, y: 5 }, 1, 0, 3).map((at) => ({ at })),
      ],
    });
    const from = { x: 2, y: 2 };
    const path = [...lineV7(from, 0, 1, 3), ...lineV7({ x: 2, y: 5 }, 1, 0, 3)];
    // One skate onto the column, one more for the turn: Move 1.
    expect(spent(state, from, path)).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
    expect(destinations(state, from)).toEqual(
      expect.arrayContaining([...path] as CoordV7[]),
    );
    // A Yeti has no Runners: the same ice costs half a point a tile.
    const yeti = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
      ice: [
        ...lineV7({ x: 2, y: 2 }, 0, 1, 3).map((at) => ({ at })),
        ...lineV7({ x: 2, y: 5 }, 1, 0, 3).map((at) => ({ at })),
      ],
    });
    expect(spent(yeti, from, path.slice(0, 3))).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
  });

  it("the Sled glides on through a zone of control while it goes straight; the others stop in it", () => {
    const scene = (role: "RAIDER" | "MARKSMAN" | "FIGHTER") =>
      frozenArenaV7({
        units: [
          { seat: 0, role, at: { x: 2, y: 2 } },
          // A hostile Fighter on ice beside (2, 4), (2, 5), and (2, 6).
          { seat: 1, role: "FIGHTER", at: { x: 3, y: 5 } },
        ],
        ice: [...bridge(2), { at: { x: 3, y: 5 } }, { at: { x: 1, y: 5 } }],
      });
    const from = { x: 2, y: 2 };
    const column = lineV7(from, 0, 1, 5);
    const sled = scene("RAIDER");
    // Straight through the zone to the far end of the ice.
    expect(spent(sled, from, column)).toMatchObject({
      legal: true,
      spentPoints2: 1,
      interruption: null,
    });
    acceptV7(sled, 0, move(sled, from, column));
    // It may stop in the zone, too.
    acceptV7(sled, 0, move(sled, from, column.slice(0, 3)));
    // A turn in the zone ends the Move there.
    expect(
      rejectV7(
        sled,
        0,
        move(sled, from, [...column.slice(0, 2), { x: 1, y: 5 }]),
      ),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ZOC_STOPS_MOVE" },
    });
    expect(destinations(sled, from)).toContainEqual({ x: 2, y: 7 });
    // The Snow Hunter has Runners but stops in the zone.
    const hunter = scene("MARKSMAN");
    expect(rejectV7(hunter, 0, move(hunter, from, column.slice(0, 3)))).toEqual(
      {
        code: "MOVEMENT_ILLEGAL",
        params: { reason: "ZOC_STOPS_MOVE" },
      },
    );
    acceptV7(hunter, 0, move(hunter, from, column.slice(0, 2)));
    expect(destinations(hunter, from)).not.toContainEqual({ x: 2, y: 7 });
    // So does a Yeti.
    const yeti = scene("FIGHTER");
    expect(destinations(yeti, from)).toContainEqual({ x: 2, y: 4 });
    expect(destinations(yeti, from)).not.toContainEqual({ x: 2, y: 5 });
  });

  it("a Sled meeting a zone it had not seen glides on while it goes straight", () => {
    const base = frozenArenaV7({
      units: [
        { seat: 0, role: "RAIDER", at: { x: 2, y: 2 } },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 6 } },
      ],
      ice: bridge(2),
    });
    const hidden: GameStateV7 = {
      ...base,
      players: base.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !(at.x === 3 && at.y === 6),
              ),
            }
          : player,
      ),
    };
    const from = { x: 2, y: 2 };
    const whole = lineV7(from, 0, 1, 5);
    const result = acceptV7(hidden, 0, move(hidden, from, whole));
    expect(
      navalUnitV7(result.state, navalUnitAtV7(hidden, from).id).at,
    ).toEqual({ x: 2, y: 7 });
    expect(
      result.events.some((event) => event.kind === "UNIT_MOVE_INTERRUPTED"),
    ).toBe(false);
  });

  it("publishes skating and Runners on the public unit stats", () => {
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 0, role: "RAIDER", at: { x: 4, y: 2 } },
        { seat: 0, role: "MARKSMAN", at: { x: 6, y: 2 } },
      ],
      ice: bridge(2),
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const stats = (at: CoordV7) =>
      view.unitStats.find(
        (entry) => entry.unitId === navalUnitAtV7(state, at).id,
      )?.iceFolk;
    expect(stats({ x: 2, y: 2 })).toMatchObject({
      skates: true,
      runners: false,
    });
    expect(stats({ x: 4, y: 2 })).toMatchObject({
      skates: true,
      runners: true,
    });
    expect(stats({ x: 6, y: 2 })).toMatchObject({
      skates: true,
      runners: true,
    });
  });

  it("every offered Move of an Ice Folk unit on and around ice is accepted as offered", () => {
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: CENTER },
        { seat: 0, role: "RAIDER", at: { x: 2, y: 2 } },
        { seat: 0, role: "KNIGHT", at: { x: 7, y: 2 } },
        { seat: 0, role: "MARKSMAN", at: { x: 3, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 4 } },
      ],
      ice: [...STAR, ...bridge(2), ...bridge(7)],
    });
    const owner = seatV7(state, 0).id;
    const moves = queryPlayerCommandsV7(viewForV7(state, owner)).filter(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE",
    );
    expect(moves.length).toBeGreaterThan(20);
    for (const command of moves) {
      const result = acceptV7(state, 0, command);
      expect(
        result.events.some((event) => event.kind === "UNIT_MOVE_INTERRUPTED"),
      ).toBe(false);
      expect(navalUnitV7(result.state, command.unitId).at).toEqual(
        command.path.at(-1),
      );
    }
    // The canonical enumeration agrees with the public one.
    for (const unit of state.units.filter(
      (candidate) => candidate.ownerId === owner,
    ))
      expect(
        sorted(
          reachableMovementPathsV7(state, unit).map((path) => path.destination),
        ),
      ).toEqual(
        sorted(
          moves
            .filter((command) => command.unitId === unit.id)
            .map((command) => command.path.at(-1) as CoordV7),
        ),
      );
  });

  it("gives a visible Ice Folk unit its skating reach in the threatened tiles", () => {
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 0, role: "RAIDER", at: { x: 7, y: 2 } },
      ],
      ice: [...bridge(2), ...bridge(7)],
    });
    const opponent = viewForV7(state, seatV7(state, 1).id);
    // The Yeti skates to (2, 4) and strikes row 5, not row 6.
    const yeti = navalUnitAtV7(state, { x: 2, y: 2 });
    const yetiReach = queryThreatenedTilesV7(opponent, yeti.id);
    expect(yetiReach).toEqual(
      expect.arrayContaining([
        { x: 1, y: 5 },
        { x: 2, y: 5 },
        { x: 3, y: 5 },
      ]),
    );
    expect(yetiReach).not.toContainEqual({ x: 2, y: 6 });
    // The Sled glides to the far end and strikes the shore beyond.
    const sled = navalUnitAtV7(state, { x: 7, y: 2 });
    expect(queryThreatenedTilesV7(opponent, sled.id)).toEqual(
      expect.arrayContaining([
        { x: 6, y: 9 },
        { x: 7, y: 9 },
        { x: 8, y: 9 },
      ]),
    );
  });
});

describe("Only the Ice Folk walk on ice (pulp_wars-y242, 7r132; the slip before)", () => {
  const GROUND: readonly FactionIdV7[] = [
    "ORIGINAL",
    "UNDEAD",
    "GOBLIN",
    "DINOSAUR",
    "MARTIAN",
    "DWARF",
    "CANDY",
  ];

  it("a ground unit of every other faction never enters ice", () => {
    for (const faction of GROUND) {
      const state = frozenArenaV7({
        factions: [faction, "ICE_FOLK"],
        units: [{ seat: 0, role: "KNIGHT", at: { x: 2, y: 2 } }],
        ice: bridge(2).map((entry) => ({ ...entry, seat: 1 as const })),
      });
      const from = { x: 2, y: 2 };
      const unit = navalUnitAtV7(state, from);
      if (unitMovementModeV7(state, unit) !== "GROUND") continue;
      for (const path of [[{ x: 2, y: 3 }], lineV7(from, 0, 1, 2)])
        expect(rejectV7(state, 0, move(state, from, path)), faction).toEqual({
          code: "MOVEMENT_ILLEGAL",
          params: { reason: "ICE_FORBIDDEN" },
        });
      const offered = destinations(state, from);
      expect(offered, faction).not.toContainEqual({ x: 2, y: 3 });
      expect(offered, faction).not.toContainEqual({ x: 2, y: 4 });
    }
  });

  it("a unit of another kind already on ice may step off it, never onto more ice", () => {
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [{ seat: 0, role: "KNIGHT", at: { x: 2, y: 3 } }],
      ice: bridge(2).map((entry) => ({ ...entry, seat: 1 as const })),
    });
    const from = { x: 2, y: 3 };
    // Ashore only: the bridge beyond it is closed.
    const offered = destinations(state, from);
    expect(offered).not.toContainEqual({ x: 2, y: 4 });
    expect(offered).toEqual(
      expect.arrayContaining([
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 2 },
      ]),
    );
    const knight = navalUnitAtV7(state, from);
    expect(validateMovementPathV7(state, knight, [{ x: 2, y: 4 }])).toEqual({
      legal: false,
      reason: "ICE_FORBIDDEN",
    });
    expect(
      validateMovementPathV7(state, knight, [
        { x: 2, y: 2 },
        { x: 2, y: 1 },
      ]),
    ).toMatchObject({ legal: true, spentPoints2: 4 });
  });

  it("walkers and flyers cross ice like land and stand on it", () => {
    for (const [faction, role] of [
      ["MARTIAN", "RAIDER"],
      ["MARTIAN", "CATAPULT"],
      ["DWARF", "RAIDER"],
    ] as const) {
      const state = frozenArenaV7({
        factions: [faction, "ICE_FOLK"],
        units: [{ seat: 0, role, at: { x: 2, y: 2 } }],
        ice: bridge(2).map((entry) => ({ ...entry, seat: 1 as const })),
      });
      const from = { x: 2, y: 2 };
      const unit = navalUnitAtV7(state, from);
      expect(unitMovementModeV7(state, unit), role).not.toBe("GROUND");
      expect(effectiveRoleRuleV7(role, faction).move).toBeGreaterThanOrEqual(2);
      const path = lineV7(from, 0, 1, 2);
      const result = acceptV7(state, 0, move(state, from, path));
      // It stands on the ice: no self-launch.
      expect(navalUnitV7(result.state, unit.id), role).toMatchObject({
        at: { x: 2, y: 4 },
        form: "LAND",
      });
      expect(
        result.events.some((event) => event.kind === "UNIT_EMBARKED"),
      ).toBe(false);
    }
  });
});

describe("ships and ice (sections 8.3 and 8.9)", () => {
  // The Ice Folk freeze rework (`pulp_wars-s55m.1`): no ship is in the
  // ice; a Frozen ship never moves, as a Frozen land unit.
  it("a ship never enters ice, and a Frozen one never moves", () => {
    const state = frozenShipsV7(
      frozenArenaV7({
        factions: ["ORIGINAL", "ICE_FOLK"],
        units: [
          { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 4 } },
          { seat: 0, role: "BATTLESHIP", at: { x: 8, y: 5 } },
        ],
        ice: bridge(2).map((entry) => ({ ...entry, seat: 1 as const })),
      }),
      [{ x: 8, y: 5 }],
    );
    const boat = { x: 1, y: 4 };
    expect(rejectV7(state, 0, move(state, boat, [{ x: 2, y: 4 }]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
    // It cannot sail through the bridge either.
    expect(destinations(state, boat).filter((at) => at.x >= 2)).toEqual([]);
    expect(destinations(state, boat).length).toBeGreaterThan(0);
    // The Battleship Frozen on (8, 5).
    const frozen = { x: 8, y: 5 };
    expect(rejectV7(state, 0, move(state, frozen, [{ x: 8, y: 4 }])).code).toBe(
      "UNIT_FROZEN",
    );
    expect(offeredMoves(state, frozen)).toEqual([]);
  });

  it("an Ice Folk unit never embarks: a Move never ends on its own dock", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } }],
    });
    const from = { x: 4, y: 2 };
    expect(rejectV7(state, 0, move(state, from, [{ x: 4, y: 3 }]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
    expect(destinations(state, from)).not.toContainEqual({ x: 4, y: 3 });
    // The same Move embarks a Human Fighter.
    const human = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } }],
    });
    const result = acceptV7(human, 0, move(human, from, [{ x: 4, y: 3 }]));
    expect(navalUnitAtV7(result.state, { x: 4, y: 3 }).form).toBe("EMBARKED");
  });
});
