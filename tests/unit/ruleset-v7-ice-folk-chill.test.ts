import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseGameStateV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  chillAtV7,
  chillOfUnitV7,
  iceFieldV7,
  withChillV7,
  type IcePieceV7,
} from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  kindsV7,
  moveV7,
  tileV7,
  walledV7,
} from "../fixtures/v7-revision20";

// The Ice Folk revision (`pulp_wars-7g3.3`): Chill
// (docs/product/RULESET_7_ICE_FOLK.md sections 5.1 to 5.4, 6.4, 7.3, 7.8,
// 10.4, 10.5, and 10.8).

const endTurn = (state: GameStateV7): GameStateV7 =>
  applyOkV7(state, activeIdV7(state), { kind: "END_TURN" }).state;

/** A Sled of seat 0 on (4, 3) and a Human Fighter of seat 1 on (5, 3). */
const sledAndFighter = (more: readonly IcePieceV7[] = []): GameStateV7 =>
  iceFieldV7([
    { seat: 0, role: "RAIDER", at: at(4, 3) },
    { seat: 1, role: "FIGHTER", at: at(5, 3) },
    ...more,
  ]);

const bolas = (state: GameStateV7, from: CoordV7, to: CoordV7): CommandV7 => ({
  kind: "THROW_BOLAS",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

describe("Chill duration and re-application (section 5.4)", () => {
  it("one application: sluggish once, Shatter-eligible on two Ice Folk turns, then thawing, then gone", () => {
    let state = sledAndFighter();
    const thrown = playV7(state, bolas(state, at(4, 3), at(5, 3)));
    expect(thrown.events).toEqual([
      {
        kind: "UNITS_CHILLED",
        playerId: seatIdV7(state, 0),
        sourceUnitId: unitAtV7(state, at(4, 3)).id,
        source: "BOLAS",
        results: [
          {
            unitId: unitAtV7(state, at(5, 3)).id,
            sluggish: true,
            turnsLeft: 2,
          },
        ],
      },
    ]);
    state = thrown.state;
    const fighter = unitAtV7(state, at(5, 3));
    const entry = () => chillOfUnitV7(state, fighter);
    // Ice Folk turn N, after the Chill.
    expect(entry()).toEqual({
      unitId: fighter.id,
      sluggish: true,
      turnsLeft: 2,
    });
    // The owner's next turn: sluggish (no countdown at the Ice Folk End Turn).
    state = endTurn(state);
    expect(entry()).toMatchObject({ sluggish: true, turnsLeft: 2 });
    // Its End Turn: not sluggish, one turn left.
    state = endTurn(state);
    expect(entry()).toMatchObject({ sluggish: false, turnsLeft: 1 });
    // Ice Folk turn N + 1: still Chilled. The owner's turn after: not
    // sluggish; the Chill ends at its end (thawing).
    state = endTurn(state);
    expect(entry()).toMatchObject({ sluggish: false, turnsLeft: 1 });
    state = endTurn(state);
    expect(entry()).toMatchObject({ sluggish: false, turnsLeft: 0 });
    // Ice Folk turn N + 2: thawing. A Chill now is not a new freeze.
    const thawing = playV7(state, bolas(state, at(4, 3), at(5, 3)));
    expect(chillOfUnitV7(thawing.state, fighter)).toMatchObject({
      sluggish: false,
      turnsLeft: 2,
    });
    // Without it, the owner's End Turn removes the entry, and the next Chill
    // is a new freeze.
    state = endTurn(endTurn(state));
    expect(entry()).toBeUndefined();
    const fresh = playV7(state, bolas(state, at(4, 3), at(5, 3)));
    expect(chillOfUnitV7(fresh.state, fighter)).toMatchObject({
      sluggish: true,
      turnsLeft: 2,
    });
  });

  it("re-applied every Ice Folk turn: sluggish only on arrival (no kite lock)", () => {
    let state = sledAndFighter();
    const fighter = unitAtV7(state, at(5, 3));
    for (let round = 0; round < 4; round += 1) {
      state = playV7(state, bolas(state, at(4, 3), at(5, 3))).state;
      expect(chillOfUnitV7(state, fighter)).toMatchObject({
        sluggish: round === 0,
        turnsLeft: 2,
      });
      state = endTurn(state);
      expect(chillOfUnitV7(state, fighter)?.sluggish).toBe(round === 0);
      state = endTurn(state);
    }
  });

  it("the countdown is the owner's: an embarked Chilled unit keeps its entry, which counts down with no effect", () => {
    let state = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 1),
          form: "EMBARKED",
          chill: { sluggish: true, turnsLeft: 2 },
        },
      ],
      { water: [at(5, 1)], activeSeat: 1 },
    );
    const unit = unitAtV7(state, at(5, 1));
    // Embarked: a sluggish entry does not stop anything (no primary action).
    state = endTurn(state);
    expect(chillOfUnitV7(state, unit)).toMatchObject({
      sluggish: false,
      turnsLeft: 1,
    });
  });
});

describe("Sluggish: move or act, not both (section 5.3)", () => {
  /**
   * A field where seat 1 (the given faction) is active and its `role` on
   * (4, 3) is sluggish; seat 0 is the Ice Folk with a Yeti on (6, 3) as a
   * target.
   */
  const sluggishField = (
    faction: FactionIdV7,
    role: UnitRoleIdV7,
    more: readonly IcePieceV7[] = [],
    options: Parameters<typeof iceFieldV7>[1] = {},
  ) =>
    iceFieldV7(
      [
        {
          seat: 1,
          role,
          at: at(4, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 3 },
        ...more,
      ],
      { factions: ["ICE_FOLK", faction], activeSeat: 1, ...options },
    );

  it("a sluggish unit that has not moved acts; one that has moved cannot attack", () => {
    for (const faction of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
    ] as const) {
      const state = sluggishField(faction, "FIGHTER");
      const unit = unitAtV7(state, at(4, 3));
      // Moving next to the Yeti: the Move is offered once; then no Attack.
      const moved = moveV7(state, at(4, 3), [at(5, 3)]).state;
      const attack: CommandV7 = {
        kind: "ATTACK",
        unitId: unit.id,
        targetUnitId: unitAtV7(moved, at(6, 3)).id,
      };
      expect(offeredV7(moved, "ATTACK"), faction).toEqual([]);
      expect(rejectedV7(moved, attack).code, faction).toBe(
        "UNIT_ALREADY_ACTED",
      );
      // An interrupted or partial Move counts too: the same without the
      // entry may attack after moving.
      const warm = checkedV7({ ...moved, chilled: [] });
      expect(offeredV7(warm, "ATTACK"), faction).toContainEqual(attack);
    }
    // A sluggish unit that starts next to its target attacks.
    const standing = iceFieldV7(
      [
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 3 },
      ],
      { activeSeat: 1 },
    );
    expect(offeredV7(standing, "ATTACK")).toHaveLength(1);
    playV7(standing, offeredV7(standing, "ATTACK")[0] as CommandV7);
  });

  it("refuses every primary action after a Move, for each faction that has it", () => {
    const cases: readonly {
      readonly faction: FactionIdV7;
      readonly role: UnitRoleIdV7;
      readonly command: (state: GameStateV7) => CommandV7;
      readonly more?: readonly IcePieceV7[];
      readonly setup?: (state: GameStateV7) => GameStateV7;
    }[] = [
      {
        // Human Captain: Rally and Tend Wounded.
        faction: "ORIGINAL",
        role: "CAPTAIN",
        more: [{ seat: 1, role: "FIGHTER", at: at(4, 5), hp: 4 }],
        command: (state) => ({
          kind: "RALLY",
          unitId: unitAtV7(state, at(4, 4)).id,
        }),
      },
      {
        faction: "ORIGINAL",
        role: "CAPTAIN",
        more: [{ seat: 1, role: "FIGHTER", at: at(4, 5), hp: 4 }],
        command: (state) => ({
          kind: "TEND_WOUNDED",
          unitId: unitAtV7(state, at(4, 4)).id,
        }),
      },
      {
        // Undead Banshee: Wail (the Yeti is within 2 of (4, 4)? no: (6, 3)).
        faction: "UNDEAD",
        role: "MARKSMAN",
        command: (state) => ({
          kind: "WAIL",
          unitId: unitAtV7(state, at(4, 4)).id,
        }),
        more: [{ seat: 0, role: "FIGHTER", at: at(5, 5) }],
      },
      {
        // Goblin Kaboom (no role flag: the plain sluggish test).
        faction: "GOBLIN",
        role: "FIGHTER",
        command: (state) => ({
          kind: "KABOOM",
          unitId: unitAtV7(state, at(4, 4)).id,
        }),
      },
      {
        // Martian Brain: Mind Control of the 3-HP Yeti within 2.
        faction: "MARTIAN",
        role: "CAPTAIN",
        command: (state) => ({
          kind: "MIND_CONTROL",
          unitId: unitAtV7(state, at(4, 4)).id,
          targetUnitId: unitAtV7(state, at(6, 3)).id,
        }),
      },
    ];
    for (const entry of cases) {
      const state = iceFieldV7(
        [
          {
            seat: 1,
            role: entry.role,
            at: at(4, 3),
            chill: { sluggish: true, turnsLeft: 2 },
          },
          { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 3 },
          ...(entry.more ?? []),
        ],
        { factions: ["ICE_FOLK", entry.faction], activeSeat: 1 },
      );
      const moved = moveV7(state, at(4, 3), [at(4, 4)]).state;
      const command = entry.command(moved);
      const label = `${entry.faction} ${command.kind}`;
      expect(
        offeredV7(moved, command.kind).filter(
          (offered) =>
            "unitId" in offered &&
            "unitId" in command &&
            offered.unitId === command.unitId,
        ),
        label,
      ).toEqual([]);
      expect(rejectedV7(moved, command).code, label).toBe("UNIT_ALREADY_ACTED");
      // Without the entry the same command is legal after the Move.
      const warm = checkedV7({ ...moved, chilled: [] });
      expect(
        applyCommandV7(warm, activeIdV7(warm), command).accepted,
        label,
      ).toBe(true);
    }
  });

  it("refuses a Shaman's Hatch after a Move", () => {
    const state = iceFieldV7(
      [
        {
          seat: 1,
          role: "CAPTAIN",
          at: at(3, 5),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "FIGHTER", at: at(9, 1) },
      ],
      {
        factions: ["ICE_FOLK", "DINOSAUR"],
        activeSeat: 1,
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    const moved = moveV7(state, at(3, 5), [at(2, 6)]).state;
    const hatch: CommandV7 = {
      kind: "HATCH",
      unitId: unitAtV7(moved, at(2, 6)).id,
      eggUnitId: unitAtV7(moved, at(2, 7)).id,
    };
    expect(rejectedV7(moved, hatch).code).toBe("UNIT_ALREADY_ACTED");
    expect(
      applyCommandV7(
        checkedV7({ ...moved, chilled: [] }),
        activeIdV7(moved),
        hatch,
      ).accepted,
    ).toBe(true);
  });

  it("refuses Pillage after a Move and grants no Escape to a sluggish Raider", () => {
    // A hostile Farm (7, 8) of the grown Ice Folk capital.
    const walled = walledV7({
      defenderFaction: "ICE_FOLK",
      attackerFaction: "ORIGINAL",
      defender: "FIGHTER",
      attackers: [{ role: "RAIDER", at: at(6, 8) }],
    });
    expect(tileV7(walled, at(7, 8)).improvement).toBe("FARM");
    const farmed = withChillV7(walled, [
      { at: at(6, 8), sluggish: true, turnsLeft: 2 },
    ]);
    const moved = moveV7(farmed, at(6, 8), [at(7, 8)]).state;
    const pillage: CommandV7 = {
      kind: "PILLAGE",
      unitId: unitAtV7(moved, at(7, 8)).id,
    };
    expect(rejectedV7(moved, pillage).code).toBe("UNIT_ALREADY_ACTED");
    expect(
      applyCommandV7(
        checkedV7({ ...moved, chilled: [] }),
        activeIdV7(moved),
        pillage,
      ).accepted,
    ).toBe(true);
    // Escape: a sluggish Raider that attacks from where it stands is not
    // granted Escape; the same Raider unchilled is.
    const raid = iceFieldV7(
      [
        {
          seat: 1,
          role: "RAIDER",
          at: at(4, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
      ],
      { activeSeat: 1 },
    );
    const command: CommandV7 = {
      kind: "ATTACK",
      unitId: unitAtV7(raid, at(4, 3)).id,
      targetUnitId: unitAtV7(raid, at(5, 3)).id,
    };
    const cold = playV7(raid, command);
    expect(unitAtV7(cold.state, at(4, 3)).activation.escapeAvailable).toBe(
      false,
    );
    const warm = playV7(checkedV7({ ...raid, chilled: [] }), command);
    expect(unitAtV7(warm.state, at(4, 3)).activation.escapeAvailable).toBe(
      true,
    );
  });

  it("a frosted (not sluggish) or thawing unit acts after moving as usual", () => {
    for (const chill of [
      { sluggish: false, turnsLeft: 2 },
      { sluggish: false, turnsLeft: 1 },
      { sluggish: false, turnsLeft: 0 },
    ] as const) {
      const state = iceFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(4, 3), chill },
          { seat: 0, role: "FIGHTER", at: at(6, 3) },
        ],
        { activeSeat: 1 },
      );
      const moved = moveV7(state, at(4, 3), [at(5, 3)]).state;
      expect(offeredV7(moved, "ATTACK")).toHaveLength(1);
    }
  });

  it("the advance, Overrun, and Push of a sluggish unit that did not move happen as usual", () => {
    // A sluggish Knight kills from where it stands, advances, and continues.
    const knight = iceFieldV7(
      [
        {
          seat: 1,
          role: "KNIGHT",
          at: at(4, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 1 },
        { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 1 },
      ],
      { activeSeat: 1 },
    );
    const killed = playV7(knight, offeredV7(knight, "ATTACK")[0] as CommandV7);
    const after = unitAtV7(killed.state, at(5, 3));
    expect(after.role).toBe("KNIGHT");
    expect(after.activation.overrunActive).toBe(true);
    // A sluggish Juggernaut pushes.
    const push = iceFieldV7(
      [
        {
          seat: 1,
          role: "JUGGERNAUT",
          at: at(4, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "GUARD", at: at(5, 3) },
      ],
      { activeSeat: 1 },
    );
    const pushed = playV7(push, offeredV7(push, "ATTACK")[0] as CommandV7);
    expect(kindsV7(pushed.events)).toContain("UNIT_PUSHED");
  });

  it("the Ice Folk's own Bolas and Cold Snap obey the same rule in a mirror", () => {
    const state = iceFieldV7(
      [
        {
          seat: 1,
          role: "RAIDER",
          at: at(4, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        {
          seat: 1,
          role: "CAPTAIN",
          at: at(4, 5),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "FIGHTER", at: at(6, 4) },
      ],
      { factions: ["ICE_FOLK", "ICE_FOLK"], activeSeat: 1 },
    );
    // Unmoved, both are offered.
    expect(offeredV7(state, "THROW_BOLAS")).toHaveLength(1);
    expect(offeredV7(state, "COLD_SNAP")).toHaveLength(1);
    const sled = moveV7(state, at(4, 3), [at(5, 3)]).state;
    expect(offeredV7(sled, "THROW_BOLAS")).toEqual([]);
    expect(rejectedV7(sled, bolas(sled, at(5, 3), at(6, 4))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    const witch = moveV7(state, at(4, 5), [at(5, 5)]).state;
    expect(offeredV7(witch, "COLD_SNAP")).toEqual([]);
    expect(
      rejectedV7(witch, {
        kind: "COLD_SNAP",
        unitId: unitAtV7(witch, at(5, 5)).id,
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
  });
});

describe("Who can be Chilled (section 5.2)", () => {
  it("never an embarked, naval, Egg, own, or allied unit; Bolas rejections in table order", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 2), form: "EMBARKED" },
        { seat: 1, role: "PATROL_BOAT", at: at(6, 2), form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: at(7, 3) },
      ],
      { water: [at(5, 2), at(6, 2)] },
    );
    expect(rejectedV7(state, bolas(state, at(4, 3), at(5, 2))).code).toBe(
      "BOLAS_NOT_LEGAL",
    );
    expect(rejectedV7(state, bolas(state, at(4, 3), at(5, 2))).params).toEqual({
      reason: "TARGET_IMMUNE",
    });
    expect(rejectedV7(state, bolas(state, at(4, 3), at(6, 2))).params).toEqual({
      reason: "TARGET_IMMUNE",
    });
    expect(rejectedV7(state, bolas(state, at(4, 3), at(4, 4))).code).toBe(
      "TARGET_ALLIED",
    );
    expect(rejectedV7(state, bolas(state, at(4, 3), at(7, 3))).params).toEqual({
      reason: "OUT_OF_RANGE",
    });
    // A Yeti has no Bolas.
    expect(rejectedV7(state, bolas(state, at(4, 4), at(5, 2))).code).toBe(
      "UNIT_ROLE_INVALID",
    );
    // An Egg is immune (a Dinosaur seat).
    const eggs = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(3, 5) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["ICE_FOLK", "DINOSAUR"],
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    expect(rejectedV7(eggs, bolas(eggs, at(3, 5), at(2, 7))).params).toEqual({
      reason: "TARGET_IMMUNE",
    });
    // An embarked Sled cannot throw.
    const afloat = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 2), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { water: [at(5, 2)] },
    );
    expect(
      rejectedV7(afloat, bolas(afloat, at(5, 2), at(5, 3))).params,
    ).toEqual({ reason: "EMBARKED" });
    // A hidden target is not found.
    const hidden = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => !(where.x === 7 && where.y === 3),
              ),
            }
          : player,
      ),
    });
    expect(rejectedV7(hidden, bolas(hidden, at(4, 3), at(7, 3))).code).toBe(
      "TARGET_NOT_FOUND",
    );
  });

  it("chills any land role: a JUGGERNAUT, a two-slot T-Rex, a Martian flyer and walker, a Thrall", () => {
    for (const [faction, role, extra] of [
      ["ORIGINAL", "JUGGERNAUT", {}],
      ["DINOSAUR", "KNIGHT", {}],
      ["MARTIAN", "RAIDER", {}],
      ["MARTIAN", "CATAPULT", {}],
      ["MARTIAN", "KNIGHT", {}],
    ] as const) {
      const state = iceFieldV7(
        [
          { seat: 0, role: "RAIDER", at: at(4, 3) },
          { seat: 1, role, at: at(5, 3), ...extra },
        ],
        { factions: ["ICE_FOLK", faction] },
      );
      const result = playV7(state, bolas(state, at(4, 3), at(5, 3)));
      expect(chillAtV7(result.state, at(5, 3)), `${faction} ${role}`).toEqual({
        unitId: unitAtV7(state, at(5, 3)).id,
        sluggish: true,
        turnsLeft: 2,
      });
    }
    // A Thrall.
    const thrall = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 1, role: "CAPTAIN", at: at(6, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), thrallOf: at(6, 4), hp: 4 },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"] },
    );
    expect(
      chillAtV7(
        playV7(thrall, bolas(thrall, at(4, 3), at(5, 3))).state,
        at(5, 3),
      ),
    ).toMatchObject({ sluggish: true });
  });

  it("a Martian Shield neither absorbs nor blocks Chill (section 10.4)", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 1, role: "GUARD", at: at(5, 3), shield: 4 },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"] },
    );
    const result = playV7(state, bolas(state, at(4, 3), at(5, 3)));
    expect(chillAtV7(result.state, at(5, 3))?.sluggish).toBe(true);
    expect(
      result.state.shields.find(
        (entry) => entry.unitId === unitAtV7(state, at(5, 3)).id,
      )?.shield,
    ).toBe(4);
  });
});

describe("Cold Snap (section 6.4)", () => {
  it("chills every visible target within 2 at once, re-applies, and spends the Witch's action", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(3, 3) },
        {
          seat: 1,
          role: "MARKSMAN",
          at: at(7, 1),
          chill: { sluggish: false, turnsLeft: 1 },
        },
        { seat: 1, role: "GUARD", at: at(8, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 2), form: "EMBARKED" },
      ],
      { water: [at(6, 2)] },
    );
    const witch = unitAtV7(state, at(5, 3));
    const result = playV7(state, { kind: "COLD_SNAP", unitId: witch.id });
    expect(result.events).toEqual([
      {
        kind: "UNITS_CHILLED",
        playerId: seatIdV7(state, 0),
        sourceUnitId: witch.id,
        source: "COLD_SNAP",
        results: [
          {
            unitId: unitAtV7(state, at(3, 3)).id,
            sluggish: true,
            turnsLeft: 2,
          },
          {
            unitId: unitAtV7(state, at(7, 1)).id,
            sluggish: false,
            turnsLeft: 2,
          },
        ].sort((left, right) => left.unitId - right.unitId),
      },
    ]);
    // The Guard at distance 3, the embarked unit, and the own Yeti are not
    // targets.
    expect(chillAtV7(result.state, at(8, 3))).toBeUndefined();
    expect(chillAtV7(result.state, at(6, 2))).toBeUndefined();
    expect(chillAtV7(result.state, at(5, 4))).toBeUndefined();
    const after = unitAtV7(result.state, at(5, 3));
    expect(after.activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    expect(
      offeredV7(result.state, "ATTACK", "COLD_SNAP").filter(
        (command) => "unitId" in command && command.unitId === witch.id,
      ),
    ).toEqual([]);
  });

  it("rejects in the stated order and only offers a Witch with a visible target", () => {
    const lonely = iceFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(offeredV7(lonely, "COLD_SNAP")).toEqual([]);
    expect(
      rejectedV7(lonely, {
        kind: "COLD_SNAP",
        unitId: unitAtV7(lonely, at(5, 3)).id,
      }).params,
    ).toEqual({ reason: "NO_TARGET" });
    // A hidden unit is not a target.
    const hiddenTarget = iceFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 5) },
    ]);
    const hidden = checkedV7({
      ...hiddenTarget,
      players: hiddenTarget.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => !(where.x === 5 && where.y === 5),
              ),
            }
          : player,
      ),
    });
    expect(
      rejectedV7(hidden, {
        kind: "COLD_SNAP",
        unitId: unitAtV7(hidden, at(5, 3)).id,
      }).params,
    ).toEqual({ reason: "NO_TARGET" });
    const afloat = iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 2), form: "EMBARKED" },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { water: [at(5, 2)] },
    );
    expect(
      rejectedV7(afloat, {
        kind: "COLD_SNAP",
        unitId: unitAtV7(afloat, at(5, 2)).id,
      }).params,
    ).toEqual({ reason: "EMBARKED" });
    const yeti = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
    ]);
    expect(
      rejectedV7(yeti, {
        kind: "COLD_SNAP",
        unitId: unitAtV7(yeti, at(5, 3)).id,
      }).code,
    ).toBe("UNIT_ROLE_INVALID");
  });
});

describe("the Cold Aura (section 7.8)", () => {
  it("chills every adjacent hostile at the Giant's owner's Start Turn, after the Shield recharge and before Plague", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
      { activeSeat: 1 },
    );
    const giant = unitAtV7(state, at(5, 3));
    const started = applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
    const chilledEvent = started.events.find(
      (event) => event.kind === "UNITS_CHILLED",
    );
    expect(chilledEvent).toEqual({
      kind: "UNITS_CHILLED",
      playerId: seatIdV7(state, 0),
      sourceUnitId: giant.id,
      source: "COLD_AURA",
      results: [
        { unitId: unitAtV7(state, at(4, 3)).id, sluggish: true, turnsLeft: 2 },
      ],
    });
    const kinds = kindsV7(started.events);
    expect(kinds.indexOf("TURN_STARTED")).toBeLessThan(
      kinds.indexOf("UNITS_CHILLED"),
    );
    // The own Yeti is never chilled.
    expect(chillAtV7(started.state, at(5, 4))).toBeUndefined();
    // Martian: the Shield recharge precedes the aura.
    const martian = iceFieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3), shield: 0 },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"], activeSeat: 1 },
    );
    const auraEvents = kindsV7(
      applyOkV7(martian, activeIdV7(martian), { kind: "END_TURN" }).events,
    );
    expect(auraEvents).toContain("UNITS_CHILLED");
  });
});

describe("Tend Wounded cures Chill (section 10.5)", () => {
  it("targets a Chilled unit at full HP and leaves its entry thawing", () => {
    const state = iceFieldV7(
      [
        { seat: 1, role: "CAPTAIN", at: at(4, 3) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          chill: { sluggish: true, turnsLeft: 2 },
        },
        { seat: 0, role: "RAIDER", at: at(6, 4) },
      ],
      { activeSeat: 1 },
    );
    const result = playV7(state, {
      kind: "TEND_WOUNDED",
      unitId: unitAtV7(state, at(4, 3)).id,
    });
    expect(result.events[0]).toMatchObject({
      kind: "WOUNDED_TENDED",
      results: [{ amount: 0, curedChill: true }],
    });
    expect(chillAtV7(result.state, at(5, 3))).toMatchObject({
      sluggish: false,
      turnsLeft: 0,
    });
    // The cured unit may move and act this turn.
    const moved = moveV7(result.state, at(5, 3), [at(6, 3)]).state;
    expect(offeredV7(moved, "ATTACK")).toHaveLength(1);
    // A Chill applied before its owner's next End Turn does not slow it.
    const iceTurn = endTurn(result.state);
    expect(chillAtV7(iceTurn, at(5, 3))).toBeUndefined();
  });

  it("a thawing unit is not a Tend target", () => {
    const state = iceFieldV7(
      [
        { seat: 1, role: "CAPTAIN", at: at(4, 3) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          chill: { sluggish: false, turnsLeft: 0 },
        },
        { seat: 0, role: "RAIDER", at: at(1, 1) },
      ],
      { activeSeat: 1 },
    );
    expect(offeredV7(state, "TEND_WOUNDED")).toEqual([]);
  });
});

describe("Chill state and view (section 5.1)", () => {
  it("rejects every illegal entry in state parsing", () => {
    const state = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "PATROL_BOAT", at: at(6, 2), form: "NAVAL" },
      ],
      {
        water: [at(6, 2)],
        factions: ["ICE_FOLK", "DINOSAUR"],
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    const fighter = unitAtV7(state, at(5, 3)).id;
    const yeti = unitAtV7(state, at(4, 3)).id;
    const boat = unitAtV7(state, at(6, 2)).id;
    const egg = unitAtV7(state, at(2, 7)).id;
    const parse = (chilled: unknown) =>
      parseGameStateV7(JSON.parse(JSON.stringify({ ...state, chilled })));
    for (const legal of [
      [{ unitId: fighter, sluggish: true, turnsLeft: 2 }],
      [{ unitId: fighter, sluggish: false, turnsLeft: 2 }],
      [{ unitId: fighter, sluggish: false, turnsLeft: 1 }],
      [{ unitId: fighter, sluggish: false, turnsLeft: 0 }],
      [
        { unitId: Math.min(yeti, fighter), sluggish: false, turnsLeft: 1 },
        { unitId: Math.max(yeti, fighter), sluggish: true, turnsLeft: 2 },
      ],
    ])
      expect(parse(legal), JSON.stringify(legal)).not.toBeNull();
    for (const illegal of [
      [{ unitId: fighter, sluggish: true, turnsLeft: 1 }],
      [{ unitId: fighter, sluggish: true, turnsLeft: 0 }],
      [{ unitId: fighter, sluggish: false, turnsLeft: 3 }],
      [{ unitId: fighter, sluggish: false, turnsLeft: -1 }],
      [{ unitId: fighter, sluggish: "yes", turnsLeft: 2 }],
      [{ unitId: fighter, sluggish: false, turnsLeft: 2, extra: 1 }],
      [{ unitId: 9999, sluggish: false, turnsLeft: 2 }],
      [{ unitId: boat, sluggish: false, turnsLeft: 2 }],
      [{ unitId: egg, sluggish: false, turnsLeft: 2 }],
      [
        { unitId: Math.max(yeti, fighter), sluggish: false, turnsLeft: 1 },
        { unitId: Math.min(yeti, fighter), sluggish: false, turnsLeft: 1 },
      ],
      [
        { unitId: fighter, sluggish: false, turnsLeft: 1 },
        { unitId: fighter, sluggish: false, turnsLeft: 1 },
      ],
    ])
      expect(parse(illegal), JSON.stringify(illegal)).toBeNull();
    // No entry in a match without an Ice Folk seat.
    const human = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { factions: ["ORIGINAL", "ORIGINAL"] },
    );
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...human,
            chilled: [
              {
                unitId: unitAtV7(human, at(5, 3)).id,
                sluggish: false,
                turnsLeft: 1,
              },
            ],
          }),
        ),
      ),
    ).toBeNull();
  });

  it("lists the entries of visible units in the view; Chill is public", () => {
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(5, 3),
        chill: { sluggish: true, turnsLeft: 2 },
      },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(9, 1),
        chill: { sluggish: false, turnsLeft: 1 },
      },
    ]);
    const hidden = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => !(where.x === 9 && where.y === 1),
              ),
            }
          : player,
      ),
    });
    const view = viewForV7(hidden, seatIdV7(hidden, 0));
    expect(view.chilled).toEqual([
      { unitId: unitAtV7(state, at(5, 3)).id, sluggish: true, turnsLeft: 2 },
    ]);
    const owner = viewForV7(hidden, seatIdV7(hidden, 1));
    expect(owner.chilled).toHaveLength(2);
  });

  it("removes the entry when the unit leaves the board (death, Disband, Mind Control)", () => {
    // Death.
    const dying = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(5, 3),
        hp: 1,
        chill: { sluggish: false, turnsLeft: 1 },
      },
    ]);
    const killed = playV7(dying, offeredV7(dying, "ATTACK")[0] as CommandV7);
    expect(killed.state.chilled).toEqual([]);
    // Mind Control: the victim's entry ends; the Thrall is not Chilled.
    const control = iceFieldV7(
      [
        { seat: 1, role: "CAPTAIN", at: at(4, 3) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 4,
          chill: { sluggish: false, turnsLeft: 1 },
        },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"], activeSeat: 1 },
    );
    const mind = playV7(control, {
      kind: "MIND_CONTROL",
      unitId: unitAtV7(control, at(4, 3)).id,
      targetUnitId: unitAtV7(control, at(5, 3)).id,
    });
    expect(mind.state.chilled).toEqual([]);
  });

  it("projects UNITS_CHILLED to a target owner who cannot see the source with sourceUnitId null", () => {
    const state = sledAndFighter();
    const command = bolas(state, at(4, 3), at(5, 3));
    const result = applyOkV7(state, activeIdV7(state), command);
    const humanId = seatIdV7(state, 1);
    // Visible source: the full event.
    expect(
      projectEventsV7(state, result.state, humanId, result.events).events,
    ).toContainEqual(result.events[0]);
    // A hidden source: the target owner still gets its own entry.
    const hide = (input: GameStateV7) =>
      checkedV7({
        ...input,
        players: input.players.map((player) =>
          player.seat === 1
            ? {
                ...player,
                explored: player.explored.filter(
                  (where) => !(where.x === 4 && where.y === 3),
                ),
              }
            : player,
        ),
      });
    const projected = projectEventsV7(
      hide(state),
      hide(result.state),
      humanId,
      result.events,
    ).events;
    expect(projected).toContainEqual({
      ...result.events[0],
      sourceUnitId: null,
    });
    expect(
      queryPlayerCommandsV7(viewForV7(result.state, humanId)),
    ).toBeDefined();
  });
});
