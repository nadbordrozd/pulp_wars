import { describe, expect, it } from "vitest";
import {
  parseEventV7,
  parsePlayerEventEnvelopeV7,
  previewColdSnapV7,
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
// line; the Ice Witch freezes every tile around her. The frozen sea
// redesign (`pulp_wars-5ti.25`, docs/product/RULESET_7_ICE_REDESIGN.md
// section 2.4): ice is permanent, the own dock freezes, foreign ice is
// taken, own cracked ice mended, own sound ice passed over, and a Freeze
// that changes nothing is neither offered nor accepted. The Ice Folk freeze
// rework (`pulp_wars-s55m.1`): a hostile ship the line reaches is Frozen
// (its tile stays open water), any dock may be iced over, Hoarfrost (the
// node Icebound was) makes the line three tiles, and the Witch freezes her
// ring with her Cold Snap (she has no Freeze of her own).

const SHORE: CoordV7 = { x: 2, y: 2 };
const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = ["SHORECRAFT", "NAVIGATION"];
const HOARFROST: readonly TechnologyIdV7[] = [
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

  it("row 5: `at` is one of the eight tiles around the unit; the Witch has no Freeze (her Cold Snap freezes her ring)", () => {
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
    for (const at of [witch, { x: 8, y: 3 }])
      expect(rejectV7(state, 0, freeze(state, witch, at))).toEqual({
        code: "UNIT_ROLE_INVALID",
        params: { role: "CAPTAIN" },
      });
    expect(
      acceptV7(state, 0, {
        kind: "COLD_SNAP",
        unitId: navalUnitAtV7(state, witch).id,
      }).events[0],
    ).toEqual({
      kind: "WATER_FROZEN",
      playerId: seatV7(state, 0).id,
      unitId: navalUnitAtV7(state, witch).id,
      tiles: [
        { x: 7, y: 3 },
        { x: 8, y: 3 },
        { x: 9, y: 3 },
      ],
    });
  });

  it("row 6: an empty freeze set is NO_TARGET (land); any dock freezes, a hostile one too", () => {
    const state = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        // Next to the own Port on (4, 3).
        { seat: 0, role: "RAIDER", at: { x: 4, y: 2 } },
        // On ice next to the hostile Port on (6, 7).
        { seat: 0, role: "GUARD", at: { x: 6, y: 6 } },
      ],
      ice: [{ at: { x: 6, y: 6 } }],
    });
    // Land.
    expect(rejectV7(state, 0, freeze(state, SHORE, { x: 2, y: 1 }))).toEqual({
      code: "FREEZE_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
    // The Ice Folk freeze rework (`pulp_wars-s55m.1`): a hostile dock is
    // iced over; it stays its owner's Port, in its owner's territory.
    const icedOver = acceptV7(
      state,
      0,
      freeze(state, { x: 6, y: 6 }, { x: 6, y: 7 }),
    );
    expect(iceEntryV7(icedOver.state, { x: 6, y: 7 })).toEqual({
      at: { x: 6, y: 7 },
      ownerId: seatV7(state, 0).id,
      cracked: false,
    });
    const port = icedOver.state.board.tiles.find(
      (tile) => tile.at.x === 6 && tile.at.y === 7,
    );
    expect(port?.improvement).toBe("PORT");
    expect(
      icedOver.state.cities.find((city) => city.id === port?.territoryCityId)
        ?.ownerId,
    ).toBe(seatV7(state, 1).id);
    // The redesign: the own Port freezes (an Ice Harbour).
    const harbour = acceptV7(
      state,
      0,
      freeze(state, { x: 4, y: 2 }, { x: 4, y: 3 }),
    );
    expect(iceEntryV7(harbour.state, { x: 4, y: 3 })).toEqual({
      at: { x: 4, y: 3 },
      ownerId: seatV7(state, 0).id,
      cracked: false,
    });
    expect(
      harbour.state.board.tiles.find(
        (tile) => tile.at.x === 4 && tile.at.y === 3,
      )?.improvement,
    ).toBe("PORT");
    // The offers are exactly the `at` with a non-empty set, in (y, x) order
    // (the Musk Ox's Deep Water needs Pack Ice; the hostile dock is one).
    expect(offeredFreezes(state)).toEqual([
      freeze(state, SHORE, { x: 1, y: 3 }),
      freeze(state, SHORE, { x: 2, y: 3 }),
      freeze(state, SHORE, { x: 3, y: 3 }),
      freeze(state, { x: 4, y: 2 }, { x: 3, y: 3 }),
      freeze(state, { x: 4, y: 2 }, { x: 4, y: 3 }),
      freeze(state, { x: 4, y: 2 }, { x: 5, y: 3 }),
      freeze(state, { x: 6, y: 6 }, { x: 5, y: 7 }),
      freeze(state, { x: 6, y: 6 }, { x: 6, y: 7 }),
      freeze(state, { x: 6, y: 6 }, { x: 7, y: 7 }),
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
          cracked: false,
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

  it("passes over own sound ice, takes another player's ice (whoever stands on it), and mends own cracked ice", () => {
    const owner = (state: GameStateV7, seat: 0 | 1) => seatV7(state, seat).id;
    // Own sound ice, then ice of seat 1 with its Fighter on it.
    const taking = frozenArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      technologies: [PACK_ICE, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 1, role: "FIGHTER", at: { x: 2, y: 4 } },
      ],
      ice: [
        { at: { x: 2, y: 3 }, seat: 0 },
        { at: { x: 2, y: 4 }, seat: 1 },
      ],
    });
    const yeti = navalUnitAtV7(taking, SHORE);
    expect(
      previewFreezeV7(viewForV7(taking, owner(taking, 0)), yeti.id, {
        x: 2,
        y: 3,
      }),
    ).toEqual({
      unitId: yeti.id,
      tiles: [{ x: 2, y: 4 }],
      mended: [],
      taken: [{ x: 2, y: 4 }],
      frozenUnits: [],
    });
    const taken = acceptV7(taking, 0, freeze(taking, SHORE, { x: 2, y: 3 }));
    expect(taken.state.ice).toEqual([
      { at: { x: 2, y: 3 }, ownerId: owner(taking, 0), cracked: false },
      { at: { x: 2, y: 4 }, ownerId: owner(taking, 0), cracked: false },
    ]);
    // Own cracked thick ice (Glacier), then open Deep Water.
    const mending = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
      ice: [{ at: { x: 2, y: 3 }, seat: 0, cracked: true }],
    });
    expect(
      previewFreezeV7(
        viewForV7(mending, owner(mending, 0)),
        navalUnitAtV7(mending, SHORE).id,
        { x: 2, y: 3 },
      ),
    ).toMatchObject({
      // Every technology, Hoarfrost included: a three-tile line.
      tiles: [
        { x: 2, y: 3 },
        { x: 2, y: 4 },
        { x: 2, y: 5 },
      ],
      mended: [{ x: 2, y: 3 }],
      taken: [],
    });
    const mended = acceptV7(mending, 0, freeze(mending, SHORE, { x: 2, y: 3 }));
    expect(mended.state.ice.every((entry) => !entry.cracked)).toBe(true);
    // Two tiles of own sound ice: the Freeze changes nothing.
    const sound = frozenArenaV7({
      technologies: [PACK_ICE, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
      ice: [
        { at: { x: 2, y: 3 }, seat: 0 },
        { at: { x: 2, y: 4 }, seat: 0 },
      ],
    });
    expect(rejectV7(sound, 0, freeze(sound, SHORE, { x: 2, y: 3 }))).toEqual({
      code: "FREEZE_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
    expect(offeredFreezes(sound)).not.toContainEqual(
      freeze(sound, SHORE, { x: 2, y: 3 }),
    );
  });

  it("Freezes a hostile ship the line reaches (Rime alone), leaves its tile open water, and stops there", () => {
    const state = frozenArenaV7({
      technologies: [PACK_ICE, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
      ],
    });
    const yeti = navalUnitAtV7(state, SHORE);
    const boat = navalUnitAtV7(state, { x: 2, y: 3 });
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(previewFreezeV7(view, yeti.id, { x: 2, y: 3 })).toEqual({
      unitId: yeti.id,
      tiles: [],
      mended: [],
      taken: [],
      frozenUnits: [boat.id],
    });
    const result = acceptV7(state, 0, freeze(state, SHORE, { x: 2, y: 3 }));
    // No ice: the ship's tile is open water, and the line stops at it.
    expect(frozenTiles(result.state)).toEqual([]);
    expect(result.events).toEqual([
      {
        kind: "UNITS_FROZEN",
        playerId: seatV7(state, 0).id,
        sourceUnitId: yeti.id,
        source: "FREEZE",
        results: [{ unitId: boat.id, turnsLeft: 1 }],
      },
    ]);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
    expect(result.state.frozen).toEqual([{ unitId: boat.id, turnsLeft: 1 }]);
    // The ship has not moved; the Yeti has used its action.
    expect(navalUnitAtV7(result.state, { x: 2, y: 3 }).id).toBe(boat.id);
    expect(navalUnitAtV7(result.state, SHORE).activation.specialActed).toBe(
      true,
    );
    // A ship Frozen already for as long changes nothing: no Freeze.
    const again = frozenStateV7(
      patchFrozenUnitV7(result.state, yeti.id, {
        activation: navalUnitAtV7(state, SHORE).activation,
      }),
      [],
    );
    expect(rejectV7(again, 0, freeze(again, SHORE, { x: 2, y: 3 }))).toEqual({
      code: "FREEZE_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
  });

  it("Hoarfrost (the node Icebound was) makes the line three tiles", () => {
    const line = (technologies: readonly TechnologyIdV7[]) => {
      const state = frozenArenaV7({
        technologies: [technologies, ALL],
        units: [{ seat: 0, role: "FIGHTER", at: SHORE }],
      });
      return frozenTiles(
        acceptV7(state, 0, freeze(state, SHORE, { x: 2, y: 3 })).state,
      );
    };
    expect(line(PACK_ICE)).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 4 },
    ]);
    expect(line(HOARFROST)).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ]);
  });

  it("the Ice Witch's Cold Snap freezes every freezable tile around her, her own cracked tile included, and Freezes the ship beside her", () => {
    const witchAt = { x: 2, y: 3 };
    const state = frozenArenaV7({
      technologies: [[...ALL, "GATHERING", "ADMINISTRATION"], ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: witchAt },
        // A hostile ship next to her is Frozen; its tile stays water.
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
      ],
      // Glacier: her own tile is cracked thick ice.
      ice: [{ at: witchAt, seat: 0, cracked: true }],
    });
    const witch = navalUnitAtV7(state, witchAt);
    const boat = navalUnitAtV7(state, { x: 3, y: 4 });
    expect(offeredFreezes(state)).toEqual([]);
    const preview = previewColdSnapV7(
      viewForV7(state, seatV7(state, 0).id),
      witch.id,
    );
    expect(preview).toEqual({
      unitId: witch.id,
      targets: [{ unitId: boat.id, alreadyFrozen: false }],
      tiles: [
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
        { x: 1, y: 4 },
        { x: 2, y: 4 },
      ],
    });
    const result = acceptV7(state, 0, { kind: "COLD_SNAP", unitId: witch.id });
    expect(frozenTiles(result.state)).toEqual(preview?.tiles);
    expect(result.state.ice.every((entry) => !entry.cracked)).toBe(true);
    expect(result.state.frozen).toEqual([{ unitId: boat.id, turnsLeft: 1 }]);
    expect(result.events.map((event) => event.kind)).toEqual([
      "UNITS_FROZEN",
      "WATER_FROZEN",
    ]);
    // Once her tile is sound, the ring passes it over.
    const sound = frozenArenaV7({
      technologies: [[...ALL, "GATHERING", "ADMINISTRATION"], ALL],
      units: [{ seat: 0, role: "CAPTAIN", at: witchAt }],
      ice: [{ at: witchAt, seat: 0 }],
    });
    expect(
      previewColdSnapV7(
        viewForV7(sound, seatV7(sound, 0).id),
        navalUnitAtV7(sound, witchAt).id,
      )?.tiles,
    ).not.toContainEqual(witchAt);
  });

  it("previews every offered Freeze exactly, and offers exactly the accepted ones", () => {
    const state = frozenArenaV7({
      technologies: [HOARFROST, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: SHORE },
        { seat: 0, role: "RAIDER", at: { x: 7, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 3 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 1, y: 4 } },
      ],
      ice: [{ at: { x: 6, y: 3 }, seat: 0 }],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const offers = queryPlayerCommandsV7(view).filter(
      (command) => command.kind === "FREEZE",
    );
    expect(offers.length).toBeGreaterThan(4);
    for (const command of offers) {
      if (command.kind !== "FREEZE") throw new Error("not a Freeze");
      const preview = previewFreezeV7(view, command.unitId, command.at);
      if (preview === null) throw new Error("preview missing");
      const result = acceptV7(state, 0, command);
      expect(result.events.slice(0, 2)).toEqual([
        ...(preview.frozenUnits.length === 0
          ? []
          : [
              {
                kind: "UNITS_FROZEN",
                playerId: seatV7(state, 0).id,
                sourceUnitId: command.unitId,
                source: "FREEZE",
                results: preview.frozenUnits.map((unitId) => ({
                  unitId,
                  turnsLeft: 1,
                })),
              },
            ]),
        ...(preview.tiles.length === 0
          ? []
          : [
              {
                kind: "WATER_FROZEN",
                playerId: seatV7(state, 0).id,
                unitId: command.unitId,
                tiles: preview.tiles,
              },
            ]),
      ]);
      for (const event of result.events)
        expect(parseEventV7(event).ok).toBe(true);
      // Every tile of the preview is the actor's sound ice afterwards.
      const after = viewForV7(result.state, seatV7(state, 0).id).ice;
      for (const at of preview.tiles)
        expect(
          after.find((ice) => ice.at.x === at.x && ice.at.y === at.y),
        ).toMatchObject({ ownerId: seatV7(state, 0).id, cracked: false });
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
        cracked: false,
        thick: false,
      },
      {
        at: { x: 2, y: 4 },
        ownerId: seatV7(seen, 0).id,
        cracked: false,
        thick: false,
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
