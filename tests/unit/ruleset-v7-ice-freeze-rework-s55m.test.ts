import { describe, expect, it } from "vitest";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  parseEventV7,
  parseGameStateV7,
  previewColdSnapV7,
  previewCrackIceV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import { frozenArenaV7, iceEntryV7 } from "../fixtures/v7-frozen-sea";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  frozenAtV7,
  iceFieldV7,
  offeredForV7,
  withFrozenUnitsV7,
} from "../fixtures/v7-ice-folk";
import { playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import { at } from "../fixtures/v7-revision20";

// The Ice Folk freeze rework (`pulp_wars-s55m.1`, `pulp-wars-poc-7r123`;
// the user, 2026-11-06: "freezing mechanic should work on tiles with a
// port, right now it doesn't"; "I expected to be able to freeze an enemy
// ship same as any other unit and it would last 1 turn"; "ice witch cold
// snap should not require confirmation. just snap. furthermore the
// coldsnap should freeze water around her"). Ships, embarked units, and
// units on docks are Frozen like anyone and shatter like anyone; Icebound
// and its crush are gone (no unit afloat is ever on ice); a water Freeze
// that reaches a hostile ship Freezes it and leaves its tile open water;
// any dock may be iced over and its owner may crack it open; the Witch's
// Cold Snap also freezes the water around her. Hand-built states only.

describe("the identity", () => {
  it("is 7r123, with 7r122 the last prior identity and its save key obsolete", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r123");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r123.current");
    expect(PRIOR_RULESET_7_IDS.at(-1)).toBe("pulp-wars-poc-7r122");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-1)).toBe(
      "pulpWars.save.v7r122.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

/** `state` with the given units Frozen for `turnsLeft` (re-validated). */
const frozenUnits = (
  state: GameStateV7,
  entries: readonly { readonly at: CoordV7; readonly turnsLeft: 1 | 2 }[],
): GameStateV7 => {
  const frozen = entries
    .map((entry) => ({
      unitId: navalUnitAtV7(state, entry.at).id,
      turnsLeft: entry.turnsLeft,
    }))
    .sort((left, right) => left.unitId - right.unitId);
  const parsed = parseGameStateV7({ ...state, frozen });
  if (parsed === null) throw new Error("the Frozen state is invalid");
  return parsed;
};
const offeredKinds = (state: GameStateV7, seat: 0 | 1, unitId: number) => [
  ...new Set(
    queryPlayerCommandsV7(viewForV7(state, seatV7(state, seat).id))
      .filter((command) => "unitId" in command && command.unitId === unitId)
      .map((command) => command.kind),
  ),
];

describe("a Frozen ship (section 21.2)", () => {
  // Seat 0 sails (ORIGINAL, the active seat); seat 1 is the Ice Folk and
  // owns the ice on (6, 4) beside the Patrol Boat.
  const BATTLESHIP = { x: 2, y: 5 };
  const BOAT = { x: 6, y: 5 };
  const PREY = { x: 7, y: 5 };
  const build = () =>
    frozenUnits(
      frozenArenaV7({
        factions: ["ORIGINAL", "ICE_FOLK"],
        units: [
          { seat: 0, role: "BATTLESHIP", at: BATTLESHIP },
          { seat: 0, role: "PATROL_BOAT", at: BOAT },
          { seat: 1, role: "FIGHTER", at: { x: 2, y: 2 } },
          { seat: 0, role: "PATROL_BOAT", at: PREY },
        ],
        ice: [{ at: { x: 6, y: 4 }, seat: 1 }],
      }),
      [
        { at: BATTLESHIP, turnsLeft: 1 },
        { at: BOAT, turnsLeft: 1 },
      ],
    );

  it("cannot sail, shoot, board, or crack, and thaws at the end of its owner's turn", () => {
    const state = build();
    const battleship = navalUnitAtV7(state, BATTLESHIP);
    const boat = navalUnitAtV7(state, BOAT);
    const yeti = navalUnitAtV7(state, { x: 2, y: 2 });
    for (const unit of [battleship, boat]) {
      const kinds = offeredKinds(state, 0, unit.id);
      for (const kind of ["MOVE", "ATTACK", "BOARD", "CRACK_ICE", "RECOVER"])
        expect(kinds, `${unit.role} ${kind}`).not.toContain(kind);
      expect(kinds).toContain("WAIT");
    }
    expect(
      rejectV7(state, 0, {
        kind: "ATTACK",
        unitId: battleship.id,
        targetUnitId: yeti.id,
      }),
    ).toEqual({ code: "UNIT_FROZEN", params: { unitId: battleship.id } });
    expect(
      rejectV7(state, 0, {
        kind: "CRACK_ICE",
        unitId: boat.id,
        at: { x: 6, y: 4 },
      }).code,
    ).toBe("UNIT_FROZEN");
    expect(
      rejectV7(state, 0, {
        kind: "MOVE",
        unitId: boat.id,
        path: [{ x: 6, y: 6 }],
      }).code,
    ).toBe("UNIT_FROZEN");
    // The same ship free of the freeze cracks the ice beside it.
    const free = frozenUnits(state, []);
    expect(offeredKinds(free, 0, boat.id)).toContain("CRACK_ICE");
    // It thaws at the end of its owner's turn, as a land unit does.
    const ended = acceptV7(state, 0, { kind: "END_TURN" });
    expect(ended.state.frozen).toEqual([]);
  });

  it("does not strike back, and an Ice Folk blow from the next tile shatters it", () => {
    // Seat 0 is the Ice Folk now: a Yeti on the shore and a hostile Patrol
    // Boat on the Shallow Water in front of it.
    const shore = { x: 2, y: 2 };
    const water = { x: 2, y: 3 };
    const scene = (hp: number, frozen: boolean) => {
      const base = frozenArenaV7({
        units: [
          { seat: 0, role: "FIGHTER", at: shore },
          { seat: 1, role: "PATROL_BOAT", at: water },
        ],
      });
      const boat = navalUnitAtV7(base, water);
      const wounded = parseGameStateV7({
        ...base,
        units: base.units.map((unit) =>
          unit.id === boat.id ? { ...unit, hp } : unit,
        ),
      });
      if (wounded === null) throw new Error("invalid");
      return frozen
        ? frozenUnits(wounded, [{ at: water, turnsLeft: 1 }])
        : wounded;
    };
    const preview = (state: GameStateV7) =>
      queryCombatPreviewV7(
        viewForV7(state, seatV7(state, 0).id),
        navalUnitAtV7(state, shore).id,
        navalUnitAtV7(state, water).id,
      );
    // Unfrozen at full HP, the boat strikes back and never shatters.
    expect(preview(scene(10, false))).toMatchObject({
      shatters: false,
      retaliation: true,
    });
    // Frozen, it does not strike back.
    expect(preview(scene(10, true))).toMatchObject({
      retaliation: false,
      noRetaliationReason: "FROZEN",
      damageToAttacker: 0,
    });
    // Frozen and in the window, the Yeti's blow shatters it.
    const hp = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].find(
      (value) => preview(scene(value, true))?.shatters === true,
    );
    expect(hp).toBeDefined();
    const state = scene(hp as number, true);
    expect(preview(state)).toMatchObject({
      shatters: true,
      defenderDies: true,
      noRetaliationReason: "DEFENDER_DIED",
    });
    const boat = navalUnitAtV7(state, water);
    const result = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: navalUnitAtV7(state, shore).id,
      targetUnitId: boat.id,
    });
    expect(result.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: boat.id,
      cause: "SHATTER",
    });
    expect(result.state.units.some((unit) => unit.id === boat.id)).toBe(false);
    // The same hit on the unfrozen boat is a plain hit.
    expect(preview(scene(hp as number, false))?.shatters).toBe(false);
  });

  it("is a Frostbite victim when it attacks a Musk Ox from the next tile", () => {
    // Seat 0 sails; seat 1's Musk Ox stands on the shore beside the boat.
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 2 } },
      ],
    });
    const boat = navalUnitAtV7(state, { x: 2, y: 3 });
    const ox = navalUnitAtV7(state, { x: 2, y: 2 });
    expect(
      queryCombatPreviewV7(
        viewForV7(state, seatV7(state, 0).id),
        boat.id,
        ox.id,
      ),
    ).toMatchObject({ frostbiteApplied: true, attackerDies: false });
    const result = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: boat.id,
      targetUnitId: ox.id,
    });
    expect(result.state.frozen).toContainEqual({
      unitId: boat.id,
      turnsLeft: 2,
    });
  });
});

describe("no unit afloat is ever on ice (Icebound is gone)", () => {
  it("rejects a state with a ship or an embarked unit on an ice tile", () => {
    const base = frozenArenaV7({
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 5 } }],
    });
    expect(
      parseGameStateV7({
        ...base,
        ice: [
          {
            at: { x: 2, y: 5 },
            ownerId: seatV7(base, 0).id,
            cracked: false,
          },
        ],
      }),
    ).toBeNull();
  });
});

describe("a water Freeze and the docks (section 21.16)", () => {
  it("Freezes a hostile ship standing on its own Port, and the Port stays open water", () => {
    // Seat 1's Port on (6, 7) with its boat on it; seat 0's Musk Ox on its
    // own ice on (6, 6).
    const state = frozenArenaV7({
      technologies: [["SHORECRAFT"], ["SHORECRAFT"]],
      units: [
        { seat: 0, role: "GUARD", at: { x: 6, y: 6 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 7 } },
      ],
      ice: [{ at: { x: 6, y: 6 } }],
    });
    const ox = navalUnitAtV7(state, { x: 6, y: 6 });
    const boat = navalUnitAtV7(state, { x: 6, y: 7 });
    const command: CommandV7 = {
      kind: "FREEZE",
      unitId: ox.id,
      at: { x: 6, y: 7 },
    };
    const result = acceptV7(state, 0, command);
    expect(iceEntryV7(result.state, { x: 6, y: 7 })).toBeUndefined();
    expect(result.state.frozen).toEqual([{ unitId: boat.id, turnsLeft: 1 }]);
    for (const event of result.events)
      expect(parseEventV7(event).ok).toBe(true);
  });

  it("ices over a hostile dock, which its owner (and only its owner or an ally) may crack open again", () => {
    // Seat 0 sails (the active seat); seat 1, the Ice Folk, has iced over
    // seat 0's Port on (4, 3). Seat 1's own Ice Harbour on (6, 7) is built
    // on its own ice. Seat 1 has no Glacier, so its ice breaks at once.
    const state = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [NAVAL_TECHS_V7, ["SHORECRAFT"]],
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 7, y: 8 } },
      ],
      ice: [
        { at: { x: 4, y: 3 }, seat: 1 },
        { at: { x: 6, y: 7 }, seat: 1 },
      ],
    });
    const own = navalUnitAtV7(state, { x: 4, y: 2 });
    const raider = navalUnitAtV7(state, { x: 7, y: 8 });
    const view = viewForV7(state, seatV7(state, 0).id);
    expect(previewCrackIceV7(view, own.id, { x: 4, y: 3 })).toEqual({
      unitId: own.id,
      at: { x: 4, y: 3 },
      broken: true,
    });
    const cracked = acceptV7(state, 0, {
      kind: "CRACK_ICE",
      unitId: own.id,
      at: { x: 4, y: 3 },
    });
    expect(iceEntryV7(cracked.state, { x: 4, y: 3 })).toBeUndefined();
    expect(
      cracked.state.board.tiles.find(
        (tile) => tile.at.x === 4 && tile.at.y === 3,
      )?.improvement,
    ).toBe("PORT");
    expect(cracked.events[0]).toEqual({
      kind: "ICE_CRACKED",
      playerId: seatV7(state, 0).id,
      unitId: own.id,
      at: { x: 4, y: 3 },
      broken: true,
    });
    // Another player's building on ice is still Pillaged, never cracked.
    expect(
      rejectV7(state, 0, {
        kind: "CRACK_ICE",
        unitId: raider.id,
        at: { x: 6, y: 7 },
      }),
    ).toEqual({ code: "CRACK_ICE_NOT_LEGAL", params: { reason: "BUILT" } });
    expect(previewCrackIceV7(view, raider.id, { x: 6, y: 7 })).toBeNull();
  });
});

describe("the Ice Witch's Cold Snap: units and water at once (section 21.6)", () => {
  // Seat 0 (Ice Folk, every technology: Rime) has a Witch on (5, 3).
  const WITCH = at(5, 3);
  const snap = (state: GameStateV7): CommandV7 => ({
    kind: "COLD_SNAP",
    unitId: unitAtV7(state, WITCH).id,
  });

  it("freezes the water around her with no unit to Freeze", () => {
    const state = iceFieldV7([{ seat: 0, role: "CAPTAIN", at: WITCH }], {
      water: [at(4, 2), at(6, 4)],
    });
    expect(offeredForV7(state, WITCH, "COLD_SNAP")).toEqual([snap(state)]);
    expect(
      previewColdSnapV7(
        viewForV7(state, seatV7(state, 0).id),
        unitAtV7(state, WITCH).id,
      ),
    ).toEqual({
      unitId: unitAtV7(state, WITCH).id,
      targets: [],
      tiles: [at(4, 2), at(6, 4)],
    });
    const result = playV7(state, snap(state));
    expect(result.events.map((event) => event.kind)).toEqual(["WATER_FROZEN"]);
    expect(result.state.ice.map((entry) => entry.at)).toEqual([
      at(4, 2),
      at(6, 4),
    ]);
  });

  it("Freezes a ship and an embarked unit beside her like any unit, and ices the open water", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 1, role: "PATROL_BOAT", at: at(6, 2), form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: at(4, 4), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ],
      { water: [at(6, 2), at(4, 4), at(4, 2)] },
    );
    const result = playV7(state, snap(state));
    for (const where of [at(6, 2), at(4, 4), at(5, 4)])
      expect(frozenAtV7(result.state, where)).toEqual({
        unitId: unitAtV7(state, where).id,
        turnsLeft: 1,
      });
    expect(result.state.ice.map((entry) => entry.at)).toEqual([at(4, 2)]);
    expect(result.events.map((event) => event.kind)).toEqual([
      "UNITS_FROZEN",
      "WATER_FROZEN",
    ]);
  });

  it("is neither offered nor accepted when it would change nothing", () => {
    // No water and no unit: no target.
    const empty = iceFieldV7([{ seat: 0, role: "CAPTAIN", at: WITCH }]);
    expect(offeredForV7(empty, WITCH, "COLD_SNAP")).toEqual([]);
    expect(rejectedV7(empty, snap(empty))).toEqual({
      code: "COLD_SNAP_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
    // Every unit Frozen already and no open water: nothing changes.
    const frozen = withFrozenUnitsV7(
      iceFieldV7([
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ]),
      [{ at: at(5, 4), turnsLeft: 1 }],
    );
    expect(rejectedV7(frozen, snap(frozen)).params).toEqual({
      reason: "ALREADY_FROZEN",
    });
    // Without Rime, water is not a target.
    const noRime = iceFieldV7([{ seat: 0, role: "CAPTAIN", at: WITCH }], {
      water: [at(4, 2)],
      techs: { 0: ["GATHERING", "ADMINISTRATION"] },
    });
    expect(offeredForV7(noRime, WITCH, "COLD_SNAP")).toEqual([]);
    expect(
      applyCommandV7(noRime, seatV7(noRime, 0).id, snap(noRime)).accepted,
    ).toBe(false);
  });
});
