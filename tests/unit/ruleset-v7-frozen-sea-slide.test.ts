import { describe, expect, it } from "vitest";
import {
  effectiveRoleRuleV7,
  parseGameStateV7,
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
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  lineV7,
  patchFrozenUnitV7,
  type FrozenIceV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.3, 8.6, and 8.7): ice is
// ground for land-form units and closed to ships; an Ice Folk unit that
// steps onto ice slides straight on (forced, free); every other ground unit
// slips (its Move ends on entering ice).

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

describe("Slide (section 8.6)", () => {
  it("slides straight on in all eight directions, at the cost of one step", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: CENTER }],
      ice: STAR,
    });
    const yeti = navalUnitAtV7(state, CENTER);
    expect(effectiveRoleRuleV7("FIGHTER", "ICE_FOLK").move).toBe(1);
    // A Yeti (Move 1) reaches exactly the end of each arm: the tiles between
    // cannot be stopped on.
    expect(destinations(state, CENTER)).toEqual(
      sorted(
        DIRECTIONS.map(([dx, dy]) => ({
          x: CENTER.x + 2 * dx,
          y: CENTER.y + 2 * dy,
        })),
      ),
    );
    for (const [dx, dy] of DIRECTIONS) {
      const path = lineV7(CENTER, dx, dy, 2);
      const result = acceptV7(state, 0, move(state, CENTER, path));
      expect(result.events[0]).toEqual({
        kind: "UNIT_MOVED",
        unitId: yeti.id,
        path,
      });
      const after = navalUnitV7(result.state, yeti.id);
      expect(after.at).toEqual(path[1]);
      // The slid tile is part of the path.
      expect(after.activation.movedPathLength).toBe(2);
      expect(validateMovementPathV7(state, yeti, path)).toMatchObject({
        legal: true,
        spentPoints2: 2,
        interruption: null,
      });
    }
  });

  it("is forced: a path that stops or turns where the slide continues is rejected", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "RAIDER", at: { x: 2, y: 2 } }],
      ice: [...bridge(2), { at: { x: 3, y: 5 } }],
    });
    const from = { x: 2, y: 2 };
    const full = lineV7(from, 0, 1, 5);
    for (const length of [1, 2, 3, 4])
      expect(
        rejectV7(state, 0, move(state, from, full.slice(0, length))),
      ).toEqual({
        code: "MOVEMENT_ILLEGAL",
        params: { reason: "SLIDE_FORCED" },
      });
    // A turn in the middle of the slide.
    expect(
      rejectV7(
        state,
        0,
        move(state, from, [...full.slice(0, 2), { x: 3, y: 5 }]),
      ),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "SLIDE_FORCED" } });
    // The whole slide costs one step; a Sled (Move 2) then steps ashore.
    const sled = navalUnitAtV7(state, from);
    expect(validateMovementPathV7(state, sled, full)).toMatchObject({
      legal: true,
      spentPoints2: 2,
    });
    const ashore = [...full, { x: 2, y: 8 }];
    expect(validateMovementPathV7(state, sled, ashore)).toMatchObject({
      legal: true,
      // Leaving ice costs a full point (water has no Roads).
      spentPoints2: 4,
    });
    const result = acceptV7(state, 0, move(state, from, ashore));
    expect(navalUnitV7(result.state, sled.id).at).toEqual({ x: 2, y: 8 });
    expect(navalUnitV7(result.state, sled.id).activation.movedPathLength).toBe(
      6,
    );
    // The offers hold the slide's end and the tiles beyond it, never a tile
    // in the middle of the slide.
    const offered = destinations(state, from);
    // (The first tile can be entered diagonally from the shore, which is a
    // slide of one tile; no Move stops in the middle of the straight one.)
    for (const at of full.slice(1, 4)) expect(offered).not.toContainEqual(at);
    for (const command of offeredMoves(state, from))
      if (command.path.at(-1)?.x === 2 && command.path.at(-1)?.y === 3)
        expect(command.path.at(-2)).not.toEqual({ x: 2, y: 2 });
    expect(offered).toContainEqual(full[4]);
    expect(offered).toContainEqual({ x: 2, y: 8 });
  });

  it("stops at the end of the ice, before a unit (an own one too), and before an unexplored tile", () => {
    const base = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        // An own unit on the bridge.
        { seat: 0, role: "MARKSMAN", at: { x: 2, y: 6 } },
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 2 } },
        // A hostile unit on the other bridge.
        { seat: 1, role: "FIGHTER", at: { x: 7, y: 5 } },
      ],
      ice: [...bridge(2), ...bridge(7)],
    });
    // Before the own unit: (2, 3), (2, 4), (2, 5).
    expect(destinations(base, { x: 2, y: 2 })).toContainEqual({ x: 2, y: 5 });
    expect(destinations(base, { x: 2, y: 2 })).not.toContainEqual({
      x: 2,
      y: 7,
    });
    acceptV7(
      base,
      0,
      move(base, { x: 2, y: 2 }, lineV7({ x: 2, y: 2 }, 0, 1, 3)),
    );
    // A slide never passes a unit, own or not.
    expect(
      rejectV7(
        base,
        0,
        move(base, { x: 2, y: 2 }, lineV7({ x: 2, y: 2 }, 0, 1, 5)),
      ).code,
    ).toBe("MOVEMENT_ILLEGAL");
    // Before the hostile unit: (7, 3), (7, 4), which is in its zone of control.
    acceptV7(
      base,
      0,
      move(base, { x: 7, y: 2 }, lineV7({ x: 7, y: 2 }, 0, 1, 2)),
    );
    // Before a tile the mover has not explored.
    const blind: GameStateV7 = {
      ...base,
      players: base.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: player.explored.filter(
                (at) =>
                  !(at.x === 2 && at.y >= 5) &&
                  !(at.x === 1 && at.y >= 5) &&
                  !(at.x === 3 && at.y >= 5),
              ),
            }
          : player,
      ),
    };
    expect(parseGameStateV7(blind)).not.toBeNull();
    const short = lineV7({ x: 2, y: 2 }, 0, 1, 2);
    const result = acceptV7(blind, 0, move(blind, { x: 2, y: 2 }, short));
    expect(result.events[0]).toMatchObject({ kind: "UNIT_MOVED", path: short });
    expect(
      rejectV7(blind, 0, move(blind, { x: 2, y: 2 }, short.slice(0, 1))),
    ).toEqual({ code: "MOVEMENT_ILLEGAL", params: { reason: "SLIDE_FORCED" } });
  });

  it("stops in a hostile zone of control it knew of; a land unit projects it onto ice, a ship does not", () => {
    const scene = (role: UnitRoleIdV7, at: CoordV7) =>
      frozenArenaV7({
        units: [
          { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
          { seat: 1, role, at },
        ],
        ice: [...bridge(2), ...(role === "FIGHTER" ? [{ at }] : [])],
      });
    // A hostile Fighter standing on ice next to (2, 4) and (2, 5).
    const guarded = scene("FIGHTER", { x: 3, y: 5 });
    const stopped = lineV7({ x: 2, y: 2 }, 0, 1, 2);
    acceptV7(guarded, 0, move(guarded, { x: 2, y: 2 }, stopped));
    expect(
      rejectV7(
        guarded,
        0,
        move(guarded, { x: 2, y: 2 }, lineV7({ x: 2, y: 2 }, 0, 1, 3)),
      ),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ZOC_STOPS_MOVE" },
    });
    expect(destinations(guarded, { x: 2, y: 2 })).toContainEqual({
      x: 2,
      y: 4,
    });
    // A hostile Patrol Boat on open water there projects nothing onto ice.
    const sailed = scene("PATROL_BOAT", { x: 3, y: 5 });
    const whole = lineV7({ x: 2, y: 2 }, 0, 1, 5);
    acceptV7(sailed, 0, move(sailed, { x: 2, y: 2 }, whole));
  });

  it("is interrupted by a zone of control first seen during the slide", () => {
    const base = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
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
    expect(parseGameStateV7(hidden)).not.toBeNull();
    const yeti = navalUnitAtV7(hidden, { x: 2, y: 2 });
    const whole = lineV7({ x: 2, y: 2 }, 0, 1, 5);
    // The public view offers the whole slide: the unit is not visible.
    expect(destinations(hidden, { x: 2, y: 2 })).toContainEqual({ x: 2, y: 7 });
    const result = acceptV7(hidden, 0, move(hidden, { x: 2, y: 2 }, whole));
    expect(result.events).toContainEqual({
      kind: "UNIT_MOVED",
      unitId: yeti.id,
      path: whole.slice(0, 3),
    });
    expect(result.events).toContainEqual({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: yeti.id,
      at: { x: 2, y: 5 },
      reason: "ZOC",
    });
    expect(navalUnitV7(result.state, yeti.id).at).toEqual({ x: 2, y: 5 });
  });

  it("continues after a slide, and a step onto ice in a new direction starts a new slide", () => {
    // An L: down the column x = 2 to (2, 5), then east along row 5 to (5, 5).
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "RAIDER", at: { x: 2, y: 2 } }],
      ice: [
        ...lineV7({ x: 2, y: 2 }, 0, 1, 3).map((at) => ({ at })),
        ...lineV7({ x: 2, y: 5 }, 1, 0, 3).map((at) => ({ at })),
      ],
    });
    const from = { x: 2, y: 2 };
    const sled = navalUnitAtV7(state, from);
    const path = [...lineV7(from, 0, 1, 3), ...lineV7({ x: 2, y: 5 }, 1, 0, 3)];
    expect(validateMovementPathV7(state, sled, path)).toMatchObject({
      legal: true,
      // Two steps (each onto ice): the slid tiles are free.
      spentPoints2: 4,
    });
    const result = acceptV7(state, 0, move(state, from, path));
    expect(navalUnitV7(result.state, sled.id).at).toEqual({ x: 5, y: 5 });
    // The Sled may still act (it may Charge after the slide: the slid tiles
    // count toward the path length).
    expect(navalUnitV7(result.state, sled.id).activation).toMatchObject({
      moved: true,
      movedPathLength: 6,
      attacked: false,
    });
    // The second slide is forced too.
    expect(
      rejectV7(state, 0, move(state, from, path.slice(0, 4))).params,
    ).toEqual({ reason: "SLIDE_FORCED" });
    // On the ice it can end on (2, 5), on (5, 5), and on (2, 3): the first
    // tile of the column entered diagonally from the shore (that slide has
    // no next tile), or by sliding back north from (2, 5).
    expect(
      destinations(state, from).filter((at) => at.y >= 3 && at.y <= 7),
    ).toEqual(
      sorted([
        { x: 2, y: 3 },
        { x: 2, y: 5 },
        { x: 5, y: 5 },
      ]),
    );
  });

  it("the Sabretooth never slides: it walks the ice at the ordinary cost", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "KNIGHT", at: { x: 2, y: 2 } }],
      ice: bridge(2),
    });
    const from = { x: 2, y: 2 };
    expect(effectiveRoleRuleV7("KNIGHT", "ICE_FOLK").move).toBe(3);
    const cat = navalUnitAtV7(state, from);
    for (const length of [1, 2, 3])
      expect(
        validateMovementPathV7(state, cat, lineV7(from, 0, 1, length)),
      ).toMatchObject({ legal: true, spentPoints2: length * 2 });
    expect(validateMovementPathV7(state, cat, lineV7(from, 0, 1, 4))).toEqual({
      legal: false,
      reason: "BUDGET_EXCEEDED",
    });
    expect(destinations(state, from)).toEqual(
      expect.arrayContaining(lineV7(from, 0, 1, 3) as CoordV7[]),
    );
  });

  it("every offered Move of an Ice Folk unit on and around ice is accepted as offered", () => {
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: CENTER },
        { seat: 0, role: "RAIDER", at: { x: 2, y: 2 } },
        { seat: 0, role: "KNIGHT", at: { x: 7, y: 2 } },
        { seat: 0, role: "CAPTAIN", at: { x: 3, y: 5 } },
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

  it("gives a visible Ice Folk unit its slide reach in the threatened tiles", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } }],
      ice: bridge(2),
    });
    const yeti = navalUnitAtV7(state, { x: 2, y: 2 });
    const opponent = viewForV7(state, seatV7(state, 1).id);
    // From the far end of the bridge (2, 7) the Yeti reaches row 8.
    expect(queryThreatenedTilesV7(opponent, yeti.id)).toEqual(
      expect.arrayContaining([
        { x: 1, y: 8 },
        { x: 2, y: 8 },
        { x: 3, y: 8 },
      ]),
    );
  });
});

describe("Slip (section 8.7)", () => {
  const GROUND: readonly FactionIdV7[] = [
    "ORIGINAL",
    "UNDEAD",
    "GOBLIN",
    "DINOSAUR",
    "MARTIAN",
    "DWARF",
    "CANDY",
  ];

  it("a ground unit of every other faction ends its Move on entering ice", () => {
    for (const faction of GROUND) {
      const state = frozenArenaV7({
        factions: [faction, "ICE_FOLK"],
        units: [{ seat: 0, role: "KNIGHT", at: { x: 2, y: 2 } }],
        ice: bridge(2).map((entry) => ({ ...entry, seat: 1 as const })),
      });
      const from = { x: 2, y: 2 };
      const unit = navalUnitAtV7(state, from);
      if (unitMovementModeV7(state, unit) !== "GROUND") continue;
      expect(
        rejectV7(state, 0, move(state, from, lineV7(from, 0, 1, 2))),
        faction,
      ).toEqual({
        code: "MOVEMENT_ILLEGAL",
        params: { reason: "ICE_STOPS_MOVE" },
      });
      const offered = destinations(state, from);
      expect(offered, faction).toContainEqual({ x: 2, y: 3 });
      expect(offered, faction).not.toContainEqual({ x: 2, y: 4 });
      const result = acceptV7(state, 0, move(state, from, [{ x: 2, y: 3 }]));
      expect(navalUnitV7(result.state, unit.id), faction).toMatchObject({
        at: { x: 2, y: 3 },
        form: "LAND",
      });
    }
  });

  it("crossing a bridge takes one tile a turn; leaving ice costs a full point", () => {
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [{ seat: 0, role: "KNIGHT", at: { x: 2, y: 4 } }],
      ice: bridge(2).map((entry) => ({ ...entry, seat: 1 as const })),
    });
    const from = { x: 2, y: 4 };
    // On the bridge the only steps are onto the next ice tiles.
    expect(destinations(state, from)).toEqual(
      sorted([
        { x: 2, y: 3 },
        { x: 2, y: 5 },
      ]),
    );
    // From the last ice tile the unit steps ashore and may go on.
    const edge = patchFrozenUnitV7(state, navalUnitAtV7(state, from).id, {
      at: { x: 2, y: 3 },
    });
    const knight = navalUnitAtV7(edge, { x: 2, y: 3 });
    expect(
      validateMovementPathV7(edge, knight, [
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
  it("a ship never enters ice, and an icebound one never moves", () => {
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 4 } },
        { seat: 0, role: "BATTLESHIP", at: { x: 8, y: 5 } },
      ],
      ice: [
        ...bridge(2).map((entry) => ({ ...entry, seat: 1 as const })),
        { at: { x: 8, y: 5 }, seat: 1 },
      ],
    });
    const boat = { x: 1, y: 4 };
    expect(rejectV7(state, 0, move(state, boat, [{ x: 2, y: 4 }]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
    // It cannot sail through the bridge either.
    expect(destinations(state, boat).filter((at) => at.x >= 2)).toEqual([]);
    expect(destinations(state, boat).length).toBeGreaterThan(0);
    // The Battleship frozen in on (8, 5).
    const frozen = { x: 8, y: 5 };
    expect(rejectV7(state, 0, move(state, frozen, [{ x: 8, y: 4 }]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ICEBOUND" },
    });
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
