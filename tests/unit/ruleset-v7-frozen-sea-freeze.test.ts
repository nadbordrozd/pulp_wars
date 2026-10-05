import { describe, expect, it } from "vitest";
import {
  parseEventV7,
  parsePlayerEventEnvelopeV7,
  previewFreezeV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  frozenStateV7,
  iceEntryV7,
  patchFrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md section 8.4): Freeze. An Ice Folk
// land unit turns the water next to it to ice, two tiles out in a straight
// line; the Ice Witch freezes every tile around her.

const SHORE: CoordV7 = { x: 2, y: 2 };
const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = ["SHORECRAFT", "NAVIGATION"];
const ICEBOUND: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];
const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

const freeze = (state: GameStateV7, from: CoordV7, at: CoordV7): CommandV7 => ({
  kind: "FREEZE",
  unitId: navalUnitAtV7(state, from).id,
  at,
});
const CAPITAL: CoordV7 = { x: 5, y: 2 };
/** The offered Freezes of seat 0, without those of its capital Fighter. */
const offeredFreezes = (state: GameStateV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id)).filter(
    (command) =>
      command.kind === "FREEZE" &&
      command.unitId !== navalUnitAtV7(state, CAPITAL).id,
  );
const frozenTiles = (state: GameStateV7) => state.ice.map((entry) => entry.at);

describe("Freeze: the legality rows in order (section 8.4)", () => {
  it("row 1: the ordinary unit errors", () => {
    const state = frozenArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 8 } },
      ],
    });
    expect(
      rejectV7(state, 0, {
        kind: "FREEZE",
        unitId: 999_999 as never,
        at: SHORE,
      }).code,
    ).toBe("UNIT_NOT_FOUND");
    expect(
      rejectV7(state, 0, {
        kind: "FREEZE",
        unitId: navalUnitAtV7(state, { x: 2, y: 8 }).id,
        at: { x: 2, y: 7 },
      }).code,
    ).toBe("UNIT_NOT_OWNED");
  });

  it("row 2: only a land role of the Ice Folk kind Freezes", () => {
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
    });
    expect(rejectV7(state, 0, freeze(state, SHORE, { x: 2, y: 3 }))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    expect(offeredFreezes(state)).toEqual([]);
  });

  it("row 3: Rime (the Ice Folk Shorecraft) is required", () => {
    const state = frozenArenaV7({
      technologies: [[], ALL],
      ports: [false, true],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
    });
    expect(rejectV7(state, 0, freeze(state, SHORE, { x: 2, y: 3 }))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "SHORECRAFT" },
    });
    expect(offeredFreezes(state)).toEqual([]);
  });

  it("row 4: a unit that used its primary action cannot Freeze, and a Freeze is one", () => {
    const base = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
    });
    const yeti = navalUnitAtV7(base, SHORE);
    const acted = patchFrozenUnitV7(base, yeti.id, {
      activation: { ...yeti.activation, attacked: true, attacksUsed: 1 },
    });
    expect(rejectV7(acted, 0, freeze(acted, SHORE, { x: 2, y: 3 }))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: yeti.id },
    });
    expect(offeredFreezes(acted)).toEqual([]);
    // A Yeti may act after moving, so a Freeze after a Move is legal.
    const moved = patchFrozenUnitV7(base, yeti.id, {
      activation: { ...yeti.activation, moved: true, movedPathLength: 1 },
    });
    const result = acceptV7(moved, 0, freeze(moved, SHORE, { x: 2, y: 3 }));
    const after = navalUnitAtV7(result.state, SHORE);
    expect(after.activation.specialActed).toBe(true);
    expect(after.activation.handled).toBe(true);
    expect(
      rejectV7(result.state, 0, freeze(result.state, SHORE, { x: 1, y: 3 }))
        .code,
    ).toBe("UNIT_ALREADY_ACTED");
    expect(offeredFreezes(result.state)).toEqual([]);
  });

  it("row 5: `at` is one of the eight tiles around the unit (the Witch: her own tile)", () => {
    const state = frozenArenaV7({
      technologies: [[...RIME, "GATHERING", "ADMINISTRATION"], ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 0, role: "CAPTAIN", at: { x: 8, y: 2 } },
      ],
    });
    for (const at of [SHORE, { x: 2, y: 4 }, { x: 4, y: 3 }])
      expect(rejectV7(state, 0, freeze(state, SHORE, at))).toEqual({
        code: "FREEZE_NOT_LEGAL",
        params: { reason: "OUT_OF_RANGE" },
      });
    const witch = { x: 8, y: 2 };
    expect(rejectV7(state, 0, freeze(state, witch, { x: 8, y: 3 }))).toEqual({
      code: "FREEZE_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    expect(acceptV7(state, 0, freeze(state, witch, witch)).events[0]).toEqual({
      kind: "WATER_FROZEN",
      playerId: seatV7(state, 0).id,
      unitId: navalUnitAtV7(state, witch).id,
      tiles: [
        { x: 7, y: 3 },
        { x: 8, y: 3 },
        { x: 9, y: 3 },
      ],
      icebound: [],
    });
  });

  it("row 6: an empty freeze set is NO_TARGET (land, a dock, a tile the line may not skip)", () => {
    const state = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        // Next to the own Port on (4, 3).
        { seat: 0, role: "RAIDER", at: { x: 4, y: 2 } },
      ],
    });
    // Land.
    expect(rejectV7(state, 0, freeze(state, SHORE, { x: 2, y: 1 }))).toEqual({
      code: "FREEZE_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
    // Docks never freeze, and a line never skips its first tile.
    expect(
      rejectV7(state, 0, freeze(state, { x: 4, y: 2 }, { x: 4, y: 3 })),
    ).toEqual({ code: "FREEZE_NOT_LEGAL", params: { reason: "NO_TARGET" } });
    // The offers are exactly the `at` with a non-empty set, in (y, x) order.
    expect(offeredFreezes(state)).toEqual([
      freeze(state, SHORE, { x: 1, y: 3 }),
      freeze(state, SHORE, { x: 2, y: 3 }),
      freeze(state, SHORE, { x: 3, y: 3 }),
      freeze(state, { x: 4, y: 2 }, { x: 3, y: 3 }),
      freeze(state, { x: 4, y: 2 }, { x: 5, y: 3 }),
    ]);
  });
});

describe("the freeze set (section 8.4)", () => {
  it("is a two-tile line in the direction of `at`; Deep Water needs Pack Ice", () => {
    for (const [technologies, expected] of [
      [RIME, [{ x: 2, y: 3 }]],
      [
        PACK_ICE,
        [
          { x: 2, y: 3 },
          { x: 2, y: 4 },
        ],
      ],
    ] as const) {
      const state = frozenArenaV7({
        technologies: [technologies, ALL],
        units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
      });
      const result = acceptV7(state, 0, freeze(state, SHORE, { x: 2, y: 3 }));
      expect(frozenTiles(result.state)).toEqual(expected);
      for (const at of expected)
        expect(iceEntryV7(result.state, at)).toEqual({
          at,
          ownerId: seatV7(state, 0).id,
          turnsLeft: 3,
        });
    }
    // A diagonal line.
    const state = frozenArenaV7({
      technologies: [PACK_ICE, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
    });
    expect(
      frozenTiles(
        acceptV7(state, 0, freeze(state, SHORE, { x: 3, y: 3 })).state,
      ),
    ).toEqual([
      { x: 3, y: 3 },
      { x: 4, y: 4 },
    ]);
  });

  it("never leaves the tiles the actor has explored", () => {
    const state = frozenArenaV7({
      technologies: [PACK_ICE, ALL],
      explored: [false, true],
      units: [],
    });
    const explored = seatV7(state, 0).explored;
    expect(explored.some((at) => at.x === 5 && at.y === 3)).toBe(true);
    expect(explored.some((at) => at.x === 5 && at.y === 4)).toBe(false);
    expect(
      frozenTiles(
        acceptV7(state, 0, freeze(state, CAPITAL, { x: 5, y: 3 })).state,
      ),
    ).toEqual([{ x: 5, y: 3 }]);
  });

  it("refreshes existing ice (whoever stands on it) and takes it over", () => {
    const base = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [PACK_ICE, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        // An enemy Fighter stands on the ice the line reaches.
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 4 } },
      ],
      ice: [
        { at: { x: 2, y: 3 }, seat: 0, turnsLeft: 1 },
        { at: { x: 2, y: 4 }, seat: 0, turnsLeft: 0 },
      ],
    });
    const view = viewForV7(base, seatV7(base, 0).id);
    const yeti = navalUnitAtV7(base, SHORE);
    expect(previewFreezeV7(view, yeti.id, { x: 2, y: 3 })).toEqual({
      unitId: yeti.id,
      tiles: [
        { x: 2, y: 3 },
        { x: 2, y: 4 },
      ],
      refreshed: [
        { x: 2, y: 3 },
        { x: 2, y: 4 },
      ],
      icebound: [],
    });
    const result = acceptV7(base, 0, freeze(base, SHORE, { x: 2, y: 3 }));
    expect(result.state.ice.map((entry) => entry.turnsLeft)).toEqual([3, 3]);
  });

  it("does not take a tile that holds a ship without Icebound, and locks a hostile ship in with it", () => {
    const scene = (technologies: readonly TechnologyIdV7[]) =>
      frozenArenaV7({
        technologies: [technologies, ALL],
        units: [
          { seat: 0, role: "FIGHTER", at: SHORE },
          { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
        ],
      });
    const without = scene(PACK_ICE);
    expect(
      rejectV7(without, 0, freeze(without, SHORE, { x: 2, y: 3 })),
    ).toEqual({ code: "FREEZE_NOT_LEGAL", params: { reason: "NO_TARGET" } });
    const withTech = scene(ICEBOUND);
    const boat = navalUnitAtV7(withTech, { x: 2, y: 3 });
    const result = acceptV7(
      withTech,
      0,
      freeze(withTech, SHORE, { x: 2, y: 3 }),
    );
    // The line stops after a tile that held a ship.
    expect(frozenTiles(result.state)).toEqual([{ x: 2, y: 3 }]);
    expect(result.events).toEqual([
      {
        kind: "WATER_FROZEN",
        playerId: seatV7(withTech, 0).id,
        unitId: navalUnitAtV7(withTech, SHORE).id,
        tiles: [{ x: 2, y: 3 }],
        icebound: [boat.id],
      },
    ]);
    // The ship has not moved.
    expect(navalUnitAtV7(result.state, { x: 2, y: 3 }).id).toBe(boat.id);
  });

  it("the Ice Witch freezes every freezable tile around her; Glacier ice lasts 5", () => {
    const witchAt = { x: 2, y: 3 };
    const state = frozenArenaV7({
      technologies: [[...ALL, "GATHERING", "ADMINISTRATION"], ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: witchAt },
        // A hostile ship next to her is locked in (Icebound).
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
      ],
      ice: [{ at: witchAt, seat: 0, turnsLeft: 0 }],
    });
    const witch = navalUnitAtV7(state, witchAt);
    const boat = navalUnitAtV7(state, { x: 3, y: 4 });
    expect(offeredFreezes(state)).toEqual([freeze(state, witchAt, witchAt)]);
    const preview = previewFreezeV7(
      viewForV7(state, seatV7(state, 0).id),
      witch.id,
      witchAt,
    );
    expect(preview).toEqual({
      unitId: witch.id,
      tiles: [
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 1, y: 4 },
        { x: 2, y: 4 },
        { x: 3, y: 4 },
      ],
      refreshed: [witchAt],
      icebound: [boat.id],
    });
    const result = acceptV7(state, 0, freeze(state, witchAt, witchAt));
    expect(frozenTiles(result.state)).toEqual(preview?.tiles);
    expect(result.state.ice.every((entry) => entry.turnsLeft === 5)).toBe(true);
  });

  it("previews every offered Freeze exactly, and offers exactly the accepted ones", () => {
    const state = frozenArenaV7({
      technologies: [ICEBOUND, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 0, role: "RAIDER", at: { x: 7, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 1, y: 4 } },
      ],
      ice: [{ at: { x: 6, y: 3 }, seat: 0, turnsLeft: 2 }],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const offers = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "FREEZE",
    );
    expect(offers.length).toBeGreaterThan(4);
    for (const command of offers) {
      if (command.kind !== "FREEZE") throw new Error("not a Freeze");
      const preview = previewFreezeV7(view, command.unitId, command.at);
      const result = acceptV7(state, 0, command);
      expect(result.events[0]).toEqual({
        kind: "WATER_FROZEN",
        playerId: seatV7(state, 0).id,
        unitId: command.unitId,
        tiles: preview?.tiles,
        icebound: preview?.icebound,
      });
      expect(parseEventV7(result.events[0]).ok).toBe(true);
    }
    // Every `at` that is not offered is rejected.
    const offered = new Set(
      offers.map((command) =>
        command.kind === "FREEZE"
          ? `${command.unitId}:${command.at.x},${command.at.y}`
          : "",
      ),
    );
    for (const unit of state.units.filter(
      (candidate) => candidate.ownerId === seatV7(state, 0).id,
    ))
      for (let y = unit.at.y - 2; y <= unit.at.y + 2; y += 1)
        for (let x = unit.at.x - 2; x <= unit.at.x + 2; x += 1) {
          if (x < 0 || y < 0 || x > 10 || y > 10) continue;
          const command: CommandV7 = {
            kind: "FREEZE",
            unitId: unit.id,
            at: { x, y },
          };
          if (offered.has(`${unit.id}:${x},${y}`)) continue;
          rejectV7(state, 0, command);
          expect(
            previewFreezeV7(view, unit.id, { x, y }),
            `${unit.id} at ${x},${y}`,
          ).toBeNull();
        }
  });
});

describe("Freeze: who learns of it (section 12)", () => {
  it("projects the tiles a viewer has explored, hides an unseen unit, and drops an unseen Freeze", () => {
    const scene = (explored: boolean) =>
      frozenArenaV7({
        technologies: [PACK_ICE, ALL],
        explored: [true, explored],
        units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
      });
    const seen = scene(true);
    const result = acceptV7(seen, 0, freeze(seen, SHORE, { x: 2, y: 3 }));
    const opponent = seatV7(seen, 1).id;
    const projected = projectEventsV7(
      seen,
      result.state,
      opponent,
      result.events,
    );
    expect(projected.events).toEqual(result.events);
    expect(parsePlayerEventEnvelopeV7(projected).ok).toBe(true);
    expect(viewForV7(result.state, opponent).ice).toEqual([
      {
        at: { x: 2, y: 3 },
        ownerId: seatV7(seen, 0).id,
        turnsLeft: 3,
        permanent: false,
      },
      {
        at: { x: 2, y: 4 },
        ownerId: seatV7(seen, 0).id,
        turnsLeft: 3,
        permanent: false,
      },
    ]);
    // A viewer that explored neither tile learns nothing.
    const hidden = scene(false);
    const far = acceptV7(hidden, 0, freeze(hidden, SHORE, { x: 2, y: 3 }));
    expect(
      projectEventsV7(hidden, far.state, seatV7(hidden, 1).id, far.events)
        .events,
    ).toEqual([]);
    expect(viewForV7(far.state, seatV7(hidden, 1).id).ice).toEqual([]);
    // A viewer that explored one tile but not the unit's sees that tile only.
    const partial: GameStateV7 = {
      ...hidden,
      players: hidden.players.map((player) =>
        player.seat === 1
          ? {
              ...player,
              explored: [...player.explored, { x: 2, y: 4 }].sort(
                (left, right) => left.y - right.y || left.x - right.x,
              ),
            }
          : player,
      ),
    };
    const partialResult = acceptV7(
      partial,
      0,
      freeze(partial, SHORE, { x: 2, y: 3 }),
    );
    const partialEvents = projectEventsV7(
      partial,
      partialResult.state,
      seatV7(partial, 1).id,
      partialResult.events,
    );
    expect(partialEvents.events).toEqual([
      {
        kind: "WATER_FROZEN",
        playerId: seatV7(partial, 0).id,
        unitId: null,
        tiles: [{ x: 2, y: 4 }],
        icebound: [],
      },
    ]);
    expect(parsePlayerEventEnvelopeV7(partialEvents).ok).toBe(true);
    expect(
      viewForV7(partialResult.state, seatV7(partial, 1).id).ice.map(
        (entry) => entry.at,
      ),
    ).toEqual([{ x: 2, y: 4 }]);
  });

  it("a state with ice survives the schema, and the frozen state is what the fixture built", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } }],
    });
    expect(frozenTiles(state)).toEqual([{ x: 2, y: 3 }]);
    expect(frozenStateV7(state, [{ at: { x: 3, y: 3 } }]).ice).toHaveLength(2);
  });
});
