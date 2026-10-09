import { describe, expect, it } from "vitest";
import {
  NEUTRAL_BREEDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  isNeutralOwnerV7,
  parseGameStateV7,
  projectEventsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  frozenAtV7,
  frozenOfUnitV7,
  iceFieldV7,
  type IcePieceV7,
} from "../fixtures/v7-ice-folk";
import { offeredV7, playV7, rejectedV7 } from "../fixtures/v7-martian";
import { round2ArenaV7, round2UnitAtV7 } from "../fixtures/v7-round2-arena";
import { activeIdV7, at, kindsV7, moveV7 } from "../fixtures/v7-revision20";

// Ice Folk Freeze (`pulp_wars-w49.37`, docs/product/RULESET_7_CURRENT.md
// sections 21.2, 21.3, 21.6, 21.9, 21.12, and 21.17): Frozen replaces
// Chill. A Frozen unit cannot move or act during its owner's next turn,
// does not retaliate, and thaws at the end of that turn; there is no thaw
// immunity.

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

const frostBolt = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
): CommandV7 => ({
  kind: "FROST_BOLT",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, to).id,
});

/** The kinds the active seat is offered for the unit on `where`. */
const offeredKindsFor = (state: GameStateV7, where: CoordV7): string[] => {
  const unit = unitAtV7(state, where);
  return [
    ...new Set(
      offeredV7(state)
        .filter((command) => "unitId" in command && command.unitId === unit.id)
        .map((command) => command.kind),
    ),
  ];
};

/** `state` with seat `seat`'s explored list missing `where`. */
const unexplored = (
  state: GameStateV7,
  seat: number,
  where: CoordV7,
): GameStateV7 =>
  checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.seat === seat
        ? {
            ...player,
            explored: player.explored.filter(
              (tile) => !(tile.x === where.x && tile.y === where.y),
            ),
          }
        : player,
    ),
  });

describe("Frozen: duration (section 21.2)", () => {
  it("a Bolas freezes a unit through its owner's next turn; it thaws at that End Turn and may be frozen again at once", () => {
    let state = sledAndFighter();
    const thrown = playV7(state, bolas(state, at(4, 3), at(5, 3)));
    const fighter = unitAtV7(state, at(5, 3));
    expect(thrown.events).toEqual([
      {
        kind: "UNITS_FROZEN",
        playerId: seatIdV7(state, 0),
        sourceUnitId: unitAtV7(state, at(4, 3)).id,
        source: "BOLAS",
        results: [{ unitId: fighter.id, turnsLeft: 1 }],
      },
    ]);
    state = thrown.state;
    expect(frozenOfUnitV7(state, fighter)).toEqual({
      unitId: fighter.id,
      turnsLeft: 1,
    });
    // The owner's turn: still Frozen; nothing but Disband and Wait is
    // offered.
    state = endTurn(state);
    expect(frozenOfUnitV7(state, fighter)).toEqual({
      unitId: fighter.id,
      turnsLeft: 1,
    });
    expect(offeredKindsFor(state, at(5, 3))).toEqual(["DISBAND", "WAIT"]);
    // It thaws at the end of that turn.
    state = endTurn(state);
    expect(frozenOfUnitV7(state, fighter)).toBeUndefined();
    // No thaw immunity: the Sled freezes it again at once.
    const again = playV7(state, bolas(state, at(4, 3), at(5, 3)));
    expect(frozenOfUnitV7(again.state, fighter)).toEqual({
      unitId: fighter.id,
      turnsLeft: 1,
    });
    // Kept Frozen every turn, it never acts.
    let locked = again.state;
    for (let round = 0; round < 3; round += 1) {
      locked = endTurn(locked);
      expect(offeredKindsFor(locked, at(5, 3)), `round ${round}`).toEqual([
        "DISBAND",
        "WAIT",
      ]);
      locked = endTurn(locked);
      locked = playV7(locked, bolas(locked, at(4, 3), at(5, 3))).state;
    }
  });

  it("Frostbite freezes the attacker during its own turn, so it stays Frozen through its next turn", () => {
    let state = iceFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
      { activeSeat: 1 },
    );
    const fighter = unitAtV7(state, at(4, 3));
    const ox = unitAtV7(state, at(5, 3));
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: ox.id,
    };
    const preview = queryCombatPreviewV7(
      viewForV7(state, activeIdV7(state)),
      fighter.id,
      ox.id,
    );
    expect(preview?.frostbiteApplied).toBe(true);
    const result = playV7(state, attack);
    expect(result.events).toContainEqual({
      kind: "UNITS_FROZEN",
      playerId: seatIdV7(state, 0),
      sourceUnitId: ox.id,
      source: "FROSTBITE",
      results: [{ unitId: fighter.id, turnsLeft: 2 }],
    });
    state = result.state;
    // Frozen at once (it has attacked, and has nothing more anyway).
    expect(offeredKindsFor(state, at(4, 3))).toEqual([]);
    state = endTurn(state);
    expect(frozenOfUnitV7(state, fighter)?.turnsLeft).toBe(1);
    state = endTurn(state);
    // Its next turn: Frozen.
    expect(offeredKindsFor(state, at(4, 3))).toEqual(["DISBAND", "WAIT"]);
    state = endTurn(state);
    expect(frozenOfUnitV7(state, fighter)).toBeUndefined();
  });
});

describe("Frozen: no move, no action, no retaliation (section 21.3)", () => {
  /** Seat 1 (`faction`) is active; its `role` on (4, 3) is Frozen. */
  const frozenField = (
    faction: FactionIdV7,
    role: UnitRoleIdV7,
    more: readonly IcePieceV7[] = [],
  ) =>
    iceFieldV7(
      [
        { seat: 1, role, at: at(4, 3), frozen: { turnsLeft: 1 } },
        { seat: 0, role: "FIGHTER", at: at(5, 3), hp: 3 },
        ...more,
      ],
      { factions: ["ICE_FOLK", faction], activeSeat: 1 },
    );

  it("refuses every command naming a Frozen unit except Promote, Disband, and Wait", () => {
    const cases: readonly {
      readonly faction: FactionIdV7;
      readonly role: UnitRoleIdV7;
      readonly command: (state: GameStateV7) => CommandV7;
      readonly more?: readonly IcePieceV7[];
    }[] = [
      {
        faction: "ORIGINAL",
        role: "FIGHTER",
        command: (state) => ({
          kind: "MOVE",
          unitId: unitAtV7(state, at(4, 3)).id,
          path: [at(4, 4)],
        }),
      },
      {
        faction: "ORIGINAL",
        role: "FIGHTER",
        command: (state) => ({
          kind: "ATTACK",
          unitId: unitAtV7(state, at(4, 3)).id,
          targetUnitId: unitAtV7(state, at(5, 3)).id,
        }),
      },
      {
        faction: "ORIGINAL",
        role: "CAPTAIN",
        more: [{ seat: 1, role: "FIGHTER", at: at(4, 4), hp: 4 }],
        command: (state) => ({
          kind: "TEND_WOUNDED",
          unitId: unitAtV7(state, at(4, 3)).id,
        }),
      },
      {
        faction: "UNDEAD",
        role: "MARKSMAN",
        command: (state) => ({
          kind: "WAIL",
          unitId: unitAtV7(state, at(4, 3)).id,
        }),
      },
      {
        faction: "GOBLIN",
        role: "FIGHTER",
        command: (state) => ({
          kind: "KABOOM",
          unitId: unitAtV7(state, at(4, 3)).id,
        }),
      },
      {
        faction: "MARTIAN",
        role: "CAPTAIN",
        command: (state) => ({
          kind: "MIND_CONTROL",
          unitId: unitAtV7(state, at(4, 3)).id,
          targetUnitId: unitAtV7(state, at(5, 3)).id,
        }),
      },
    ];
    for (const entry of cases) {
      const state = frozenField(entry.faction, entry.role, entry.more);
      const command = entry.command(state);
      const label = `${entry.faction} ${command.kind}`;
      expect(rejectedV7(state, command), label).toEqual({
        code: "UNIT_FROZEN",
        params: { unitId: unitAtV7(state, at(4, 3)).id },
      });
      // Without the entry the same command is legal.
      const warm = checkedV7({ ...state, frozen: [] });
      expect(
        applyCommandV7(warm, activeIdV7(warm), command).accepted,
        label,
      ).toBe(true);
    }
    // Disband and Wait are offered and accepted.
    const state = frozenField("ORIGINAL", "FIGHTER");
    expect(offeredKindsFor(state, at(4, 3))).toEqual(["DISBAND", "WAIT"]);
    playV7(state, { kind: "WAIT", unitId: unitAtV7(state, at(4, 3)).id });
  });

  it("a Frozen defender does not retaliate, exactly in the public preview", () => {
    const build = (frozen: boolean) =>
      iceFieldV7([
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        {
          seat: 1,
          role: "GUARD",
          at: at(5, 3),
          ...(frozen ? { frozen: { turnsLeft: 1 as const } } : {}),
        },
      ]);
    const cold = build(true);
    const yeti = unitAtV7(cold, at(4, 3));
    const guard = unitAtV7(cold, at(5, 3));
    const preview = queryCombatPreviewV7(
      viewForV7(cold, activeIdV7(cold)),
      yeti.id,
      guard.id,
    );
    expect(preview).toMatchObject({
      retaliation: false,
      damageToAttacker: 0,
      noRetaliationReason: "FROZEN",
    });
    const result = playV7(cold, {
      kind: "ATTACK",
      unitId: yeti.id,
      targetUnitId: guard.id,
    });
    const resolved = result.events.find(
      (event) => event.kind === "COMBAT_RESOLVED",
    );
    expect(
      resolved?.kind === "COMBAT_RESOLVED" ? resolved.preview : null,
    ).toMatchObject({ noRetaliationReason: "FROZEN", damageToAttacker: 0 });
    expect(unitAtV7(result.state, at(4, 3)).hp).toBe(yeti.hp);
    // The same Guard unfrozen strikes back.
    const warm = build(false);
    expect(
      queryCombatPreviewV7(viewForV7(warm, activeIdV7(warm)), yeti.id, guard.id)
        ?.damageToAttacker,
    ).toBeGreaterThan(0);
  });

  it("a Frozen unit threatens no tile", () => {
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
    const enemy = unitAtV7(state, at(6, 3));
    expect(
      queryThreatenedTilesV7(state, enemy.id, seatIdV7(state, 0)).length,
    ).toBeGreaterThan(0);
    const frozen = checkedV7({
      ...state,
      frozen: [{ unitId: enemy.id, turnsLeft: 1 }],
    });
    expect(
      queryThreatenedTilesV7(frozen, enemy.id, seatIdV7(frozen, 0)),
    ).toEqual([]);
  });

  it("Tend Wounded thaws a Frozen unit, which may then move and act", () => {
    const state = iceFieldV7(
      [
        { seat: 1, role: "CAPTAIN", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), frozen: { turnsLeft: 1 } },
        { seat: 0, role: "RAIDER", at: at(7, 3) },
      ],
      { activeSeat: 1 },
    );
    const result = playV7(state, {
      kind: "TEND_WOUNDED",
      unitId: unitAtV7(state, at(4, 3)).id,
    });
    expect(result.events[0]).toMatchObject({
      kind: "WOUNDED_TENDED",
      results: [{ amount: 0, curedFrozen: true }],
    });
    expect(frozenAtV7(result.state, at(5, 3))).toBeUndefined();
    const moved = moveV7(result.state, at(5, 3), [at(6, 3)]).state;
    expect(offeredV7(moved, "ATTACK")).toHaveLength(1);
  });
});

describe("Who can be Frozen, and the Bolas (sections 21.2 and 21.9)", () => {
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
    expect(rejectedV7(state, bolas(state, at(4, 3), at(5, 2)))).toEqual({
      code: "BOLAS_NOT_LEGAL",
      params: { reason: "TARGET_IMMUNE" },
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
    expect(rejectedV7(state, bolas(state, at(4, 4), at(5, 2))).code).toBe(
      "UNIT_ROLE_INVALID",
    );
    const hidden = unexplored(state, 0, at(7, 3));
    expect(rejectedV7(hidden, bolas(hidden, at(4, 3), at(7, 3))).code).toBe(
      "TARGET_NOT_FOUND",
    );
  });

  it("freezes any land role (a Juggernaut, a two-slot T-Rex, Martian flyers and walkers); a Shield does not stop it", () => {
    for (const [faction, role] of [
      ["ORIGINAL", "JUGGERNAUT"],
      ["DINOSAUR", "KNIGHT"],
      ["MARTIAN", "RAIDER"],
      ["MARTIAN", "CATAPULT"],
    ] as const) {
      const state = iceFieldV7(
        [
          { seat: 0, role: "RAIDER", at: at(4, 3) },
          { seat: 1, role, at: at(5, 3) },
        ],
        { factions: ["ICE_FOLK", faction] },
      );
      const result = playV7(state, bolas(state, at(4, 3), at(5, 3)));
      expect(frozenAtV7(result.state, at(5, 3)), `${faction} ${role}`).toEqual({
        unitId: unitAtV7(state, at(5, 3)).id,
        turnsLeft: 1,
      });
    }
    const shielded = iceFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3) },
        { seat: 1, role: "GUARD", at: at(5, 3), shield: 4 },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"] },
    );
    const result = playV7(shielded, bolas(shielded, at(4, 3), at(5, 3)));
    expect(frozenAtV7(result.state, at(5, 3))).toBeDefined();
    expect(
      result.state.shields.find(
        (entry) => entry.unitId === unitAtV7(shielded, at(5, 3)).id,
      )?.shield,
    ).toBe(4);
  });
});

describe("the Ice Witch: Cold Snap and Frost Bolt (section 21.6)", () => {
  /** A Witch of seat 0 on (5, 3) with hostile units at distance 1 and 2. */
  const witchField = () =>
    iceFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 2), frozen: { turnsLeft: 1 } },
        { seat: 1, role: "MARKSMAN", at: at(7, 1) },
        { seat: 1, role: "GUARD", at: at(8, 3) },
      ],
      {},
    );

  it("Cold Snap freezes every visible hostile unit next to her, renews a Frozen one, and spends her action", () => {
    const state = witchField();
    const witch = unitAtV7(state, at(5, 3));
    const result = playV7(state, { kind: "COLD_SNAP", unitId: witch.id });
    expect(result.events).toEqual([
      {
        kind: "UNITS_FROZEN",
        playerId: seatIdV7(state, 0),
        sourceUnitId: witch.id,
        source: "COLD_SNAP",
        results: [
          { unitId: unitAtV7(state, at(4, 3)).id, turnsLeft: 1 },
          { unitId: unitAtV7(state, at(6, 2)).id, turnsLeft: 1 },
        ].sort((left, right) => left.unitId - right.unitId),
      },
    ]);
    // Distance 2 and more, and the own Yeti, are not targets.
    expect(frozenAtV7(result.state, at(7, 1))).toBeUndefined();
    expect(frozenAtV7(result.state, at(8, 3))).toBeUndefined();
    expect(frozenAtV7(result.state, at(5, 4))).toBeUndefined();
    // One of the two a turn: no Frost Bolt after a Cold Snap.
    expect(offeredV7(result.state, "FROST_BOLT", "COLD_SNAP")).toEqual([]);
    expect(
      rejectedV7(result.state, frostBolt(result.state, at(5, 3), at(7, 1)))
        .code,
    ).toBe("UNIT_ALREADY_ACTED");
    // With no adjacent hostile unit there is no Cold Snap.
    const far = iceFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(7, 3) },
    ]);
    expect(offeredV7(far, "COLD_SNAP")).toEqual([]);
    expect(
      rejectedV7(far, {
        kind: "COLD_SNAP",
        unitId: unitAtV7(far, at(5, 3)).id,
      }).params,
    ).toEqual({ reason: "NO_TARGET" });
  });

  it("Frost Bolt freezes one visible hostile unit within 2, in table order, and spends her action", () => {
    const state = witchField();
    const witch = unitAtV7(state, at(5, 3));
    // Offered for every legal target within 2, in target-ID order.
    expect(offeredV7(state, "FROST_BOLT")).toEqual(
      [at(4, 3), at(6, 2), at(7, 1)]
        .map((where) => unitAtV7(state, where).id)
        .sort((left, right) => left - right)
        .map((targetUnitId) => ({
          kind: "FROST_BOLT",
          unitId: witch.id,
          targetUnitId,
        })),
    );
    const result = playV7(state, frostBolt(state, at(5, 3), at(7, 1)));
    expect(result.events).toEqual([
      {
        kind: "UNITS_FROZEN",
        playerId: seatIdV7(state, 0),
        sourceUnitId: witch.id,
        source: "FROST_BOLT",
        results: [{ unitId: unitAtV7(state, at(7, 1)).id, turnsLeft: 1 }],
      },
    ]);
    expect(offeredV7(result.state, "COLD_SNAP", "FROST_BOLT")).toEqual([]);
    expect(
      rejectedV7(result.state, {
        kind: "COLD_SNAP",
        unitId: witch.id,
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
    // Rejections.
    expect(rejectedV7(state, frostBolt(state, at(5, 3), at(8, 3)))).toEqual({
      code: "FROST_BOLT_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    expect(rejectedV7(state, frostBolt(state, at(5, 3), at(5, 4))).code).toBe(
      "TARGET_ALLIED",
    );
    expect(rejectedV7(state, frostBolt(state, at(5, 4), at(4, 3))).code).toBe(
      "UNIT_ROLE_INVALID",
    );
    const hidden = unexplored(state, 0, at(7, 1));
    expect(rejectedV7(hidden, frostBolt(hidden, at(5, 3), at(7, 1))).code).toBe(
      "TARGET_NOT_FOUND",
    );
  });
});

describe("the Frost Giant's Cold Aura (section 21.12)", () => {
  it("freezes every hostile unit around it when it ends its own Move, and not at its owner's Start Turn", () => {
    const state = iceFieldV7([
      { seat: 0, role: "JUGGERNAUT", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(6, 4) },
      { seat: 1, role: "FIGHTER", at: at(6, 2) },
      { seat: 1, role: "GUARD", at: at(6, 3) },
      { seat: 1, role: "FIGHTER", at: at(2, 3) },
    ]);
    const giant = unitAtV7(state, at(4, 3));
    const moved = moveV7(state, at(4, 3), [at(5, 3)]);
    const kinds = kindsV7(moved.events);
    expect(kinds).toContain("UNITS_FROZEN");
    expect(kinds.indexOf("UNIT_MOVED")).toBeLessThan(
      kinds.indexOf("UNITS_FROZEN"),
    );
    expect(moved.events.find((event) => event.kind === "UNITS_FROZEN")).toEqual(
      {
        kind: "UNITS_FROZEN",
        playerId: seatIdV7(state, 0),
        sourceUnitId: giant.id,
        source: "COLD_AURA",
        results: [
          { unitId: unitAtV7(state, at(6, 2)).id, turnsLeft: 1 },
          { unitId: unitAtV7(state, at(6, 3)).id, turnsLeft: 1 },
        ].sort((left, right) => left.unitId - right.unitId),
      },
    );
    expect(frozenAtV7(moved.state, at(6, 4))).toBeUndefined();
    expect(frozenAtV7(moved.state, at(2, 3))).toBeUndefined();
    // Standing next to enemies at its owner's Start Turn freezes nothing.
    const standing = iceFieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
      { activeSeat: 1 },
    );
    const started = applyOkV7(standing, activeIdV7(standing), {
      kind: "END_TURN",
    });
    expect(kindsV7(started.events)).not.toContain("UNITS_FROZEN");
    expect(started.state.frozen).toEqual([]);
    // Nor does an attack without a Move.
    const attack = playV7(started.state, {
      kind: "ATTACK",
      unitId: unitAtV7(started.state, at(5, 3)).id,
      targetUnitId: unitAtV7(started.state, at(4, 3)).id,
    });
    expect(kindsV7(attack.events)).not.toContain("UNITS_FROZEN");
  });
});

describe("Frozen state, view, and events (sections 21.2 and 21.15)", () => {
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
    const parse = (frozen: unknown) =>
      parseGameStateV7(JSON.parse(JSON.stringify({ ...state, frozen })));
    for (const legal of [
      [{ unitId: fighter, turnsLeft: 1 }],
      [{ unitId: fighter, turnsLeft: 2 }],
      [
        { unitId: Math.min(yeti, fighter), turnsLeft: 1 },
        { unitId: Math.max(yeti, fighter), turnsLeft: 2 },
      ],
    ])
      expect(parse(legal), JSON.stringify(legal)).not.toBeNull();
    for (const illegal of [
      [{ unitId: fighter, turnsLeft: 0 }],
      [{ unitId: fighter, turnsLeft: 3 }],
      [{ unitId: fighter, turnsLeft: 1, sluggish: true }],
      [{ unitId: 9999, turnsLeft: 1 }],
      [{ unitId: boat, turnsLeft: 1 }],
      [{ unitId: egg, turnsLeft: 1 }],
      [
        { unitId: Math.max(yeti, fighter), turnsLeft: 1 },
        { unitId: Math.min(yeti, fighter), turnsLeft: 1 },
      ],
      [
        { unitId: fighter, turnsLeft: 1 },
        { unitId: fighter, turnsLeft: 1 },
      ],
    ])
      expect(parse(illegal), JSON.stringify(illegal)).toBeNull();
    // The old `chilled` field is gone.
    const { frozen, ...rest } = state;
    expect(frozen).toEqual([]);
    expect(
      parseGameStateV7(JSON.parse(JSON.stringify({ ...rest, chilled: [] }))),
    ).toBeNull();
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
            frozen: [{ unitId: unitAtV7(human, at(5, 3)).id, turnsLeft: 1 }],
          }),
        ),
      ),
    ).toBeNull();
  });

  it("lists the entries of visible units in the view (Frozen is public) and in the unit stats", () => {
    const state = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 3), frozen: { turnsLeft: 1 } },
      { seat: 1, role: "FIGHTER", at: at(9, 1), frozen: { turnsLeft: 1 } },
    ]);
    const hidden = unexplored(state, 0, at(9, 1));
    const view = viewForV7(hidden, seatIdV7(hidden, 0));
    expect(view.frozen).toEqual([
      { unitId: unitAtV7(state, at(5, 3)).id, turnsLeft: 1 },
    ]);
    expect(
      view.unitStats.find(
        (entry) => entry.unitId === unitAtV7(state, at(5, 3)).id,
      )?.frozen,
    ).toEqual({ turnsLeft: 1 });
    expect(
      view.unitStats.find(
        (entry) => entry.unitId === unitAtV7(state, at(4, 3)).id,
      )?.frozen,
    ).toBeNull();
    expect(viewForV7(hidden, seatIdV7(hidden, 1)).frozen).toHaveLength(2);
  });

  it("removes the entry when the unit dies and keeps it through Mind Control", () => {
    const dying = iceFieldV7([
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      {
        seat: 1,
        role: "FIGHTER",
        at: at(5, 3),
        hp: 1,
        frozen: { turnsLeft: 1 },
      },
    ]);
    const killed = playV7(dying, offeredV7(dying, "ATTACK")[0] as CommandV7);
    expect(killed.state.frozen).toEqual([]);
    const control = iceFieldV7(
      [
        { seat: 1, role: "CAPTAIN", at: at(4, 3) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 4,
          frozen: { turnsLeft: 1 },
        },
      ],
      { factions: ["ICE_FOLK", "MARTIAN"], activeSeat: 1 },
    );
    const mind = playV7(control, {
      kind: "MIND_CONTROL",
      unitId: unitAtV7(control, at(4, 3)).id,
      targetUnitId: unitAtV7(control, at(5, 3)).id,
    });
    expect(mind.state.frozen).toEqual(control.frozen);
  });

  it("projects UNITS_FROZEN to a target owner who cannot see the source with sourceUnitId null", () => {
    const state = sledAndFighter();
    const result = applyOkV7(
      state,
      activeIdV7(state),
      bolas(state, at(4, 3), at(5, 3)),
    );
    const humanId = seatIdV7(state, 1);
    expect(
      projectEventsV7(state, result.state, humanId, result.events).events,
    ).toContainEqual(result.events[0]);
    const hide = (input: GameStateV7) => unexplored(input, 1, at(4, 3));
    expect(
      projectEventsV7(hide(state), hide(result.state), humanId, result.events)
        .events,
    ).toContainEqual({ ...result.events[0], sourceUnitId: null });
    expect(
      queryPlayerCommandsV7(viewForV7(result.state, humanId)),
    ).toBeDefined();
  });
});

describe("the fairness numbers (`pulp_wars-w49.37`)", () => {
  it("sets the Ice Folk costs, HP, and Defense", () => {
    const rule = (role: UnitRoleIdV7) => effectiveRoleRuleV7(role, "ICE_FOLK");
    expect(rule("RAIDER").cost).toBe(4);
    expect(rule("GUARD").defense2).toBe(4);
    expect(rule("CAPTAIN")).toMatchObject({ cost: 6, maxHp: 10 });
    expect(rule("CATAPULT")).toMatchObject({ cost: 9, maxHp: 10 });
    expect(rule("SWORDSMAN").cost).toBe(7);
    expect(rule("JUGGERNAUT").maxHp).toBe(36);
    // Unchanged.
    expect(rule("FIGHTER")).toMatchObject({ cost: 2, maxHp: 9 });
    expect(rule("MARKSMAN")).toMatchObject({ cost: 3, maxHp: 8 });
    expect(rule("KNIGHT")).toMatchObject({ cost: 9, maxHp: 14 });
    expect(rule("CAPTAIN").abilities).toEqual([
      "ATTACK",
      // Any unit can capture (`pulp_wars-ke95`).
      "CAPTURE",
      "BLIZZARD",
      "COLD_SNAP",
      "FROST_BOLT",
      "FREEZE",
    ]);
    expect(rule("SWORDSMAN").abilities).toContain("STAMPEDE");
  });
});

describe("Ice Folk Freeze with any-unit capture and the round-2 curiosities", () => {
  const P1 = 1 as PlayerId;
  const SAUCER = at(5, 9);
  const WELL = at(4, 6);

  it("a Frozen unit cannot capture the center it stands on", () => {
    const frozen = iceFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(8, 8), frozen: { turnsLeft: 1 } },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
      ],
      { factions: ["ICE_FOLK", "ORIGINAL"], activeSeat: 1 },
    );
    const capturer = unitAtV7(frozen, at(8, 8));
    const state = checkedV7({
      ...frozen,
      units: frozen.units.map((unit) =>
        unit.id === capturer.id ? { ...unit, captureEligible: true } : unit,
      ),
    });
    const capture: CommandV7 = { kind: "CAPTURE", unitId: capturer.id };
    expect(rejectedV7(state, capture)).toEqual({
      code: "UNIT_FROZEN",
      params: { unitId: capturer.id },
    });
    expect(offeredKindsFor(state, at(8, 8))).not.toContain("CAPTURE");
    const warm = checkedV7({ ...state, frozen: [] });
    expect(applyCommandV7(warm, activeIdV7(warm), capture).accepted).toBe(true);
  });

  it("a Frozen unit on the Wishing Well cannot toss a Coin", () => {
    const arena = round2ArenaV7({
      factions: ["ICE_FOLK", "ORIGINAL"],
      pieces: [{ seat: 0, role: "FIGHTER", at: WELL }],
      curiosities: [{ kind: "WISHING_WELL", at: WELL, tossedBy: [] }],
    });
    const yeti = round2UnitAtV7(arena, WELL);
    const state = checkedV7({
      ...arena,
      frozen: [{ unitId: yeti.id, turnsLeft: 1 }],
    });
    const toss: CommandV7 = { kind: "TOSS_COIN", unitId: yeti.id };
    expect(rejectedV7(state, toss)).toEqual({
      code: "UNIT_FROZEN",
      params: { unitId: yeti.id },
    });
    expect(
      queryPlayerCommandsV7(viewForV7(state, P1)).filter(
        (command) => command.kind === "TOSS_COIN",
      ),
    ).toEqual([]);
    const warm = checkedV7({ ...state, frozen: [] });
    expect(applyCommandV7(warm, P1, toss).accepted).toBe(true);
  });

  it("never freezes a neutral unit of any breed: Cold Snap passes it over and a Frost Bolt cannot take it", () => {
    for (const breed of NEUTRAL_BREEDS_V7) {
      const home = breed === "BIGFOOT" ? at(15, 10) : SAUCER;
      const standOn =
        breed === "GIANT_SPIDER" || breed === "BIGFOOT" ? home : at(5, 8);
      const witchAt = at(standOn.x - 1, standOn.y);
      const fighterAt = at(standOn.x - 2, standOn.y);
      const arena = round2ArenaV7({
        factions: ["ICE_FOLK", "ORIGINAL"],
        pieces: [
          { seat: 0, role: "CAPTAIN", at: witchAt },
          { seat: 1, role: "FIGHTER", at: fighterAt },
        ],
        terrain: breed === "BIGFOOT" ? [{ at: home, terrain: "FOREST" }] : [],
        neutrals: [{ breed, home, at: standOn }],
        curiosities:
          breed === "ZOMBIE"
            ? [{ kind: "GRAVEYARD", at: SAUCER }]
            : breed === "GIANT_SPIDER" || breed === "BIGFOOT"
              ? []
              : [{ kind: "DOWNED_SAUCER", at: SAUCER }],
      });
      const witch = round2UnitAtV7(arena, witchAt);
      const fighter = round2UnitAtV7(arena, fighterAt);
      const neutral = arena.units.find((unit) =>
        isNeutralOwnerV7(unit.ownerId),
      );
      if (neutral === undefined) throw new Error(breed);
      const offered = queryPlayerCommandsV7(viewForV7(arena, P1));
      expect(
        offered.filter(
          (command) =>
            command.kind === "FROST_BOLT" &&
            command.targetUnitId === neutral.id,
        ),
        breed,
      ).toEqual([]);
      expect(
        applyCommandV7(arena, P1, {
          kind: "FROST_BOLT",
          unitId: witch.id,
          targetUnitId: neutral.id,
        }).accepted,
        breed,
      ).toBe(false);
      const snap = applyCommandV7(arena, P1, {
        kind: "COLD_SNAP",
        unitId: witch.id,
      });
      expect(snap.accepted, breed).toBe(true);
      if (!snap.accepted) continue;
      expect(snap.state.frozen, breed).toEqual([
        { unitId: fighter.id, turnsLeft: 1 },
      ]);
    }
  });
});
