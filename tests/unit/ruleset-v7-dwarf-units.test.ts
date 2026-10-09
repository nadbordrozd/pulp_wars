import { describe, expect, it } from "vitest";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  cityUnitCapacityV7,
  assignedUnitCountV7,
  isLivingUnitV7,
  previewAssembleV7,
  publicUnitStatsV7,
  queryAssembleUnavailableReasonV7,
  queryCombatPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import {
  dwarfFieldV7,
  offeredOfV7,
  refusalV7,
  withBurrowedV7,
} from "../fixtures/v7-dwarf";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { type IcePieceV7 } from "../fixtures/v7-ice-folk";
import { playV7 } from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  patchUnitV7,
  walledV7,
} from "../fixtures/v7-revision20";

// The Dwarf revision (`pulp_wars-78i.3`): clockwork, the Clockwork Gunner's
// two shots, Dig In, the Engineer's Repair and Assemble, the Steam Cannon's
// Knockback, the Steam Tank's Plated, and the Brass Titan
// (docs/product/RULESET_7_DWARVES.md sections 7 to 10 and 13). The field is
// the one of ruleset-v7-dwarf-tunnel.test.ts.

const ENEMY: IcePieceV7 = { seat: 1, role: "FIGHTER", at: at(1, 1) };
const WITHOUT = (...techs: string[]) =>
  TECHNOLOGY_IDS_V7.filter((tech) => !techs.includes(tech));
const enemyTurn = (state: GameStateV7): GameStateV7 =>
  checkedV7({
    ...state,
    activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
  });

describe("clockwork (section 7)", () => {
  it("attacks unflinching at its maximum HP and defends at its current HP", () => {
    const wounded = dwarfFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 2), hp: 3 },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ENEMY,
    ]);
    const fresh = patchUnitV7(wounded, at(5, 2), { hp: 10 });
    const hurt = attackV7(wounded, at(5, 2), at(5, 4));
    const full = attackV7(fresh, at(5, 2), at(5, 4));
    // Reported for every attack by a construct (its force reads its
    // maximum HP, whatever its current HP).
    expect(hurt.combat.unflinchingApplied).toBe(true);
    expect(full.combat.unflinchingApplied).toBe(true);
    expect(hurt.combat.damageToDefender).toBe(full.combat.damageToDefender);
    // As a defender it is ordinary: its retaliation falls with its HP.
    const near = dwarfFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 3), hp: 5 },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ENEMY,
    ]);
    const struck = attackV7(enemyTurn(near), at(5, 4), at(5, 3));
    expect(struck.combat.unflinchingApplied).toBe(false);
    const struckFresh = attackV7(
      enemyTurn(patchUnitV7(near, at(5, 3), { hp: 10 })),
      at(5, 4),
      at(5, 3),
    );
    expect(struck.combat.damageToAttacker).toBeLessThan(
      struckFresh.combat.damageToAttacker,
    );
  });

  it("is not living: no Wail, no Grave; living Dwarf units are", () => {
    const state = dwarfFieldV7(
      [
        { seat: 0, role: "MARKSMAN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(6, 3) },
        { seat: 0, role: "JUGGERNAUT", at: at(4, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 4) },
        ENEMY,
      ],
      { factions: ["DWARF", "UNDEAD"] },
    );
    const lookup = (where: CoordV7) =>
      isLivingUnitV7(state, unitAtV7(state, where));
    expect([lookup(at(5, 3)), lookup(at(6, 3)), lookup(at(4, 3))]).toEqual([
      false,
      true,
      false,
    ]);
    const wail = playV7(enemyTurn(state), {
      kind: "WAIL",
      unitId: unitAtV7(state, at(5, 4)).id,
    });
    const resolved = wail.events.find(
      (event) => event.kind === "WAIL_RESOLVED",
    );
    if (resolved?.kind !== "WAIL_RESOLVED") throw new Error("no wail");
    expect(resolved.results.map((entry) => entry.unitId)).toEqual([
      unitAtV7(state, at(6, 3)).id,
    ]);
    // A Skeleton kills a 1-HP Gunner: no Grave; a 1-HP Hammerer: a Grave.
    for (const [role, grave] of [
      ["MARKSMAN", false],
      ["FIGHTER", true],
    ] as const) {
      const duel = dwarfFieldV7(
        [
          { seat: 0, role, at: at(5, 3), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(5, 4) },
          ENEMY,
        ],
        { factions: ["DWARF", "UNDEAD"] },
      );
      const killed = attackV7(enemyTurn(duel), at(5, 4), at(5, 3));
      expect(kindsV7(killed.events).includes("GRAVE_CREATED"), role).toBe(
        grave,
      );
    }
  });

  it("is immune to Mind Control (TARGET_IMMUNE)", () => {
    const state = enemyTurn(
      dwarfFieldV7(
        [
          { seat: 0, role: "MARKSMAN", at: at(5, 3) },
          { seat: 0, role: "FIGHTER", at: at(6, 3) },
          { seat: 1, role: "CAPTAIN", at: at(5, 4) },
          ENEMY,
        ],
        { factions: ["DWARF", "MARTIAN"] },
      ),
    );
    expect(
      refusalV7(state, {
        kind: "MIND_CONTROL",
        unitId: unitAtV7(state, at(5, 4)).id,
        targetUnitId: unitAtV7(state, at(5, 3)).id,
      }),
    ).toMatchObject({
      code: "MIND_CONTROL_NOT_LEGAL",
      params: { reason: "TARGET_IMMUNE" },
    });
  });

  it("never mends itself: no Recover, no idle recovery; Repair heals a machine 4 and a Hammerer 2", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 3), hp: 4 },
      { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 6 },
      { seat: 0, role: "CAPTAIN", at: at(5, 2) },
      ENEMY,
    ]);
    const gunner = unitAtV7(state, at(5, 3));
    const hammerer = unitAtV7(state, at(6, 3));
    expect(offeredOfV7(state, at(5, 3), "RECOVER")).toEqual([]);
    expect(refusalV7(state, { kind: "RECOVER", unitId: gunner.id })).toEqual({
      code: "RECOVER_NOT_LEGAL",
      params: { reason: "CONSTRUCT" },
    });
    const ended = applyCommandV7(state, activeIdV7(state), {
      kind: "END_TURN",
    });
    if (!ended.accepted) throw new Error(ended.error.code);
    expect(ended.state.units.find((unit) => unit.id === gunner.id)?.hp).toBe(4);
    expect(
      ended.state.units.find((unit) => unit.id === hammerer.id)?.hp,
    ).toBeGreaterThan(6);
    const repaired = playV7(state, {
      kind: "TEND_WOUNDED",
      unitId: unitAtV7(state, at(5, 2)).id,
    });
    const tended = repaired.events.find(
      (event) => event.kind === "WOUNDED_TENDED",
    );
    if (tended?.kind !== "WOUNDED_TENDED") throw new Error("no repair");
    expect(
      tended.results.map((entry) => [
        entry.unitId,
        entry.amount,
        entry.hpAfter,
      ]),
    ).toEqual(
      [
        [gunner.id, 4, 8],
        [hammerer.id, 2, 8],
      ].sort((l, r) => (l[0] as number) - (r[0] as number)),
    );
  });

  it("is healed in full by a Promotion", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 3), hp: 2, kills: 3 },
      ENEMY,
    ]);
    const promoted = playV7(state, {
      kind: "PROMOTE",
      unitId: unitAtV7(state, at(5, 3)).id,
    });
    expect(unitAtV7(promoted.state, at(5, 3))).toMatchObject({
      veteran: true,
      hp: 15,
      maxHp: 15,
    });
  });
});

describe("the Clockwork Gunner's two shots (section 7.3)", () => {
  it("shoots twice unmoved, never moves after a shot, and never advances", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(6, 3), hp: 1 },
      ENEMY,
    ]);
    const gunner = unitAtV7(state, at(5, 2));
    expect(publicUnitStatsV7(state, gunner).dwarf?.shotsLeft).toBe(2);
    const first = attackV7(state, at(5, 2), at(5, 4));
    expect(first.combat.attacksRemaining).toBe(1);
    expect(
      refusalV7(first.state, {
        kind: "MOVE",
        unitId: gunner.id,
        path: [at(4, 2)],
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
    expect(offeredOfV7(first.state, at(5, 2), "MOVE")).toEqual([]);
    expect(
      publicUnitStatsV7(first.state, unitAtV7(first.state, at(5, 2))).dwarf
        ?.shotsLeft,
    ).toBe(1);
    // The second shot kills at range 1 and does not advance.
    const second = attackV7(first.state, at(5, 2), at(6, 3));
    expect(second.target).toBeUndefined();
    expect(unitAtV7(second.state, at(5, 2)).id).toBe(gunner.id);
    expect(second.combat.attacksRemaining).toBe(0);
    expect(offeredOfV7(second.state, at(5, 2), "ATTACK")).toEqual([]);
  });

  it("shoots once after moving; a Frozen Gunner does not shoot", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 1) },
      { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ENEMY,
    ]);
    const moved = playV7(state, {
      kind: "MOVE",
      unitId: unitAtV7(state, at(5, 1)).id,
      path: [at(5, 2)],
    });
    const shot = attackV7(moved.state, at(5, 2), at(5, 4));
    expect(shot.combat.attacksRemaining).toBe(0);
    expect(offeredOfV7(shot.state, at(5, 2), "ATTACK")).toEqual([]);
    const cold = dwarfFieldV7(
      [
        {
          seat: 0,
          role: "MARKSMAN",
          at: at(5, 2),
          frozen: { turnsLeft: 1 },
        },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        ENEMY,
      ],
      { factions: ["DWARF", "ICE_FOLK"] },
    );
    // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen unit does nothing.
    expect(offeredOfV7(cold, at(5, 2), "ATTACK")).toEqual([]);
  });
});

describe("Dig In (section 8)", () => {
  const duel = (
    hammerer: Partial<IcePieceV7>,
    options: Parameters<typeof dwarfFieldV7>[1] = {},
  ) =>
    enemyTurn(
      dwarfFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(8, 7), ...hammerer },
          { seat: 1, role: "FIGHTER", at: at(8, 6) },
          ENEMY,
        ],
        // Tuning 1 (7r46): the attacker has no Explosives, whose Breach
        // would ignore the Dig In level.
        {
          ...options,
          techs: { 1: WITHOUT("EXPLOSIVES"), ...options.techs },
        },
      ),
    );

  it("gives an unmoved Hammerer next to its own center one Field Defense level, never with Field Defense too", () => {
    const dug = attackV7(duel({}), at(8, 6), at(8, 7));
    // Tuning 1 (7r46): Dig In lowers the damage taken (4 instead of 5); the
    // retaliation is the open-ground 5 either way (8 before).
    expect(dug.combat).toMatchObject({
      dugIn: true,
      damageToDefender: 4,
      damageToAttacker: 5,
    });
    const open = attackV7(
      duel({ activation: { moved: true } }),
      at(8, 6),
      at(8, 7),
    );
    expect(open.combat).toMatchObject({
      dugIn: false,
      damageToDefender: 5,
      damageToAttacker: 5,
    });
    // Field Defense and Dig In: max, not sum (a Field Defense is two
    // levels since tuning 4, so it is the Field Defense that counts).
    const both = attackV7(
      fieldDefenseV7(duel({}), at(8, 7)),
      at(8, 6),
      at(8, 7),
    );
    expect([
      both.combat.damageToDefender,
      both.combat.damageToAttacker,
    ]).toEqual([3, 5]);
    // Without the Dwarf Fortification nobody digs in.
    const untrained = attackV7(
      duel({}, { techs: { 0: WITHOUT("FORTIFICATION", "EXPLOSIVES") } }),
      at(8, 6),
      at(8, 7),
    );
    expect(untrained.combat.dugIn).toBe(false);
    // Two tiles from the center: not dug in.
    const far = enemyTurn(
      dwarfFieldV7([
        { seat: 0, role: "FIGHTER", at: at(8, 6) },
        { seat: 1, role: "FIGHTER", at: at(8, 5) },
        ENEMY,
      ]),
    );
    expect(attackV7(far, at(8, 5), at(8, 6)).combat.dugIn).toBe(false);
    expect(publicUnitStatsV7(far, unitAtV7(far, at(8, 6))).dwarf?.dugIn).toBe(
      false,
    );
  });

  it("adds to the Walls: a dug-in Hammerer on its Walled center has fortification 3", () => {
    const state = walledV7({
      defenderFaction: "DWARF",
      defender: "FIGHTER",
      attackerFaction: "ORIGINAL",
      attackers: [{ role: "FIGHTER", at: at(8, 7) }],
      // Tuning 1 (7r46): without Explosives (no Breach).
      attackerTechs: WITHOUT("EXPLOSIVES"),
    });
    const hammerer = unitAtV7(state, at(8, 8));
    const preview = queryCombatPreviewV7(
      viewForV7(state, activeIdV7(state)),
      unitAtV7(state, at(8, 7)).id,
      hammerer.id,
    );
    expect(preview).toMatchObject({ dugIn: true, fortificationLevel: 3 });
    expect(publicUnitStatsV7(state, hammerer).dwarf?.dugIn).toBe(true);
  });

  it("sets moved on a Hammerer's and a Mole's advance only", () => {
    // (The ninth unit, 7r55: the Steam Tank is the heavy role.)
    for (const role of ["FIGHTER", "GUARD", "SWORDSMAN"] as const) {
      const state = dwarfFieldV7([
        { seat: 0, role, at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
        ENEMY,
      ]);
      const killed = attackV7(state, at(5, 2), at(5, 3));
      expect(killed.attacker?.at, role).toEqual(at(5, 3));
      expect(killed.attacker?.activation.moved, role).toBe(
        role !== "SWORDSMAN",
      );
    }
  });
});

describe("the Engineer's Assemble (section 9.2)", () => {
  const field = (
    extra: readonly IcePieceV7[] = [],
    options: Parameters<typeof dwarfFieldV7>[1] = {},
  ) =>
    dwarfFieldV7(
      [{ seat: 0, role: "CAPTAIN", at: at(5, 2) }, ...extra, ENEMY],
      options,
    );

  it("builds an exhausted Gunner homed to the Engineer's city for 4 Coins, spending the Engineer's action", () => {
    const state = field();
    const engineer = unitAtV7(state, at(5, 2));
    const capital = cityOfV7(state, 0);
    const view = viewForV7(state, activeIdV7(state));
    const preview = previewAssembleV7(view, engineer.id);
    expect(preview).toMatchObject({
      unitId: engineer.id,
      cost: 4,
      cityId: capital.id,
      usedSlots: assignedUnitCountV7(state, capital.id),
      capacity: cityUnitCapacityV7(state, capital),
    });
    expect(preview?.tiles).toHaveLength(8);
    const command: CommandV7 = {
      kind: "ASSEMBLE",
      unitId: engineer.id,
      to: at(6, 3),
    };
    const result = playV7(state, command);
    const gunner = unitAtV7(result.state, at(6, 3));
    expect(result.events[0]).toEqual({
      kind: "UNIT_ASSEMBLED",
      playerId: activeIdV7(state),
      unitId: engineer.id,
      assembledUnitId: gunner.id,
      at: at(6, 3),
      cityId: capital.id,
      cost: 4,
    });
    expect(gunner).toMatchObject({
      role: "MARKSMAN",
      homeCityId: capital.id,
      hp: 10,
      kills: 0,
      captureEligible: false,
      activation: { moved: true, handled: true },
    });
    const coins = (s: GameStateV7) =>
      s.players.find((player) => player.id === activeIdV7(state))?.coins ?? 0;
    expect(coins(state) - coins(result.state)).toBe(4);
    expect(
      result.state.cities.find((city) => city.id === capital.id)
        ?.cityActionAvailable,
    ).toBe(
      state.cities.find((city) => city.id === capital.id)?.cityActionAvailable,
    );
    // Once per Engineer per turn.
    expect(
      refusalV7(result.state, {
        kind: "ASSEMBLE",
        unitId: engineer.id,
        to: at(4, 3),
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
  });

  it("refuses each legality row with its code", () => {
    const noTech = field([], {
      techs: { 0: WITHOUT("MARKSMANSHIP", "FIELDCRAFT") },
    });
    const engineerOf = (state: GameStateV7) => unitAtV7(state, at(5, 2)).id;
    expect(
      refusalV7(noTech, {
        kind: "ASSEMBLE",
        unitId: engineerOf(noTech),
        to: at(6, 3),
      }),
    ).toEqual({ code: "TECH_REQUIRED", params: { tech: "MARKSMANSHIP" } });
    expect(
      queryAssembleUnavailableReasonV7(
        viewForV7(noTech, activeIdV7(noTech)),
        engineerOf(noTech),
      ),
    ).toBe("TECH_REQUIRED");
    const hammer = field([{ seat: 0, role: "FIGHTER", at: at(4, 2) }]);
    expect(
      refusalV7(hammer, {
        kind: "ASSEMBLE",
        unitId: unitAtV7(hammer, at(4, 2)).id,
        to: at(4, 3),
      }).code,
    ).toBe("UNIT_ROLE_INVALID");
    const orphan = patchUnitV7(field(), at(5, 2), { homeCityId: null });
    expect(
      refusalV7(orphan, {
        kind: "ASSEMBLE",
        unitId: engineerOf(orphan),
        to: at(6, 3),
      }),
    ).toEqual({ code: "ASSEMBLE_NOT_LEGAL", params: { reason: "NO_HOME" } });
    const poor = checkedV7({
      ...field(),
      players: field().players.map((player) =>
        player.seat === 0 ? { ...player, coins: 3 } : player,
      ),
    });
    expect(
      refusalV7(poor, {
        kind: "ASSEMBLE",
        unitId: engineerOf(poor),
        to: at(6, 3),
      }).code,
    ).toBe("INSUFFICIENT_COINS");
    // A full home city.
    const base = field();
    const capital = cityOfV7(base, 0);
    const free =
      cityUnitCapacityV7(base, capital) - assignedUnitCountV7(base, capital.id);
    const fillers: IcePieceV7[] = Array.from({ length: free }, (_, index) => ({
      seat: 0,
      role: "FIGHTER",
      at: at(index % 11, 0),
    }));
    const full = field(fillers);
    expect(
      refusalV7(full, {
        kind: "ASSEMBLE",
        unitId: engineerOf(full),
        to: at(6, 3),
      }).code,
    ).toBe("CITY_CAPACITY_FULL");
    // A burrowed unit keeps its slot.
    const buried = withBurrowedV7(
      field([...fillers.slice(1), { seat: 0, role: "GUARD", at: at(2, 4) }]),
      [{ at: at(2, 4) }],
    );
    expect(
      refusalV7(buried, {
        kind: "ASSEMBLE",
        unitId: engineerOf(buried),
        to: at(6, 3),
      }).code,
    ).toBe("CITY_CAPACITY_FULL");
    // The tile: a unit, a mound, a chest, a village, water.
    const tiles = withBurrowedV7(
      field(
        [
          { seat: 1, role: "FIGHTER", at: at(4, 3) },
          { seat: 0, role: "GUARD", at: at(6, 1) },
        ],
        { water: [at(6, 2)] },
      ),
      [{ at: at(6, 1) }],
    );
    const chest = checkedV7({ ...tiles, treasureChests: [at(4, 1)] });
    for (const to of [at(4, 3), at(6, 1), at(4, 1), at(6, 2), at(5, 4)])
      expect(
        refusalV7(chest, { kind: "ASSEMBLE", unitId: engineerOf(chest), to }),
        JSON.stringify(to),
      ).toEqual({ code: "INVALID_TILE", params: { action: "ASSEMBLE" } });
  });
});

describe("the Steam Cannon's Knockback (section 10.1)", () => {
  it("knocks a surviving target one tile straight back, in each of the eight directions", () => {
    const directions = [
      [0, -1],
      [1, -1],
      [1, 0],
      [1, 1],
      [0, 1],
      [-1, 1],
      [-1, 0],
      [-1, -1],
    ] as const;
    for (const [dx, dy] of directions) {
      const cannon = at(5, 4);
      const target = at(5 + 2 * dx, 4 + 2 * dy);
      const state = dwarfFieldV7([
        { seat: 0, role: "CATAPULT", at: cannon },
        { seat: 1, role: "GUARD", at: target },
        ENEMY,
      ]);
      const shot = attackV7(state, cannon, target);
      const pushed = at(target.x + dx, target.y + dy);
      expect(shot.events, `${dx},${dy}`).toContainEqual(
        expect.objectContaining({ kind: "UNIT_PUSHED", to: pushed }),
      );
      expect(unitAtV7(shot.state, pushed).id).toBe(unitAtV7(state, target).id);
    }
  });

  it("is blocked by the edge, a unit, a mound, a center, water, a JUGGERNAUT, and an Egg", () => {
    const blocked = (
      pieces: readonly IcePieceV7[],
      target: CoordV7,
      options: Parameters<typeof dwarfFieldV7>[1] = {},
      burrow: readonly CoordV7[] = [],
    ) => {
      let state = dwarfFieldV7(
        [{ seat: 0, role: "CATAPULT", at: at(5, 2) }, ...pieces],
        options,
      );
      if (burrow.length > 0)
        state = withBurrowedV7(
          state,
          burrow.map((where) => ({ at: where })),
        );
      const shot = attackV7(state, at(5, 2), target);
      expect(kindsV7(shot.events), JSON.stringify(target)).not.toContain(
        "UNIT_PUSHED",
      );
      if (shot.target !== undefined) expect(shot.target.at).toEqual(target);
      return shot;
    };
    // The edge.
    blocked([{ seat: 1, role: "GUARD", at: at(5, 0) }, ENEMY], at(5, 0));
    // A unit behind.
    blocked(
      [
        { seat: 1, role: "GUARD", at: at(7, 2) },
        { seat: 1, role: "FIGHTER", at: at(8, 2) },
        ENEMY,
      ],
      at(7, 2),
    );
    // A mound behind.
    blocked(
      [
        { seat: 1, role: "GUARD", at: at(7, 2) },
        { seat: 0, role: "GUARD", at: at(8, 2) },
        ENEMY,
      ],
      at(7, 2),
      {},
      [at(8, 2)],
    );
    // A village center behind (5, 5).
    blocked([{ seat: 1, role: "GUARD", at: at(5, 4) }, ENEMY], at(5, 4));
    // Water behind a land unit.
    blocked([{ seat: 1, role: "GUARD", at: at(3, 2) }, ENEMY], at(3, 2), {
      water: [at(2, 2)],
    });
    // A JUGGERNAUT.
    blocked([{ seat: 1, role: "JUGGERNAUT", at: at(7, 2) }, ENEMY], at(7, 2));
  });

  it("ignores the Walls with Blasting Charges", () => {
    const state = walledV7({
      defenderFaction: "ORIGINAL",
      attackerFaction: "DWARF",
      attackers: [{ role: "CATAPULT", at: at(8, 5) }],
    });
    const shot = attackV7(state, at(8, 5), at(8, 8));
    expect(shot.combat.fortificationIgnored).toBeGreaterThan(0);
  });
});

describe("the Steam Tank's Plated (section 10.2)", () => {
  it("caps every hit on it at 4 and reports platedApplied", () => {
    const state = enemyTurn(
      dwarfFieldV7([
        { seat: 0, role: "SWORDSMAN", at: at(5, 3) },
        { seat: 1, role: "CATAPULT", at: at(3, 3) },
        ENEMY,
      ]),
    );
    const shot = attackV7(state, at(3, 3), at(5, 3));
    expect(shot.combat.damageToDefender).toBeLessThanOrEqual(4);
    expect(shot.combat.platedApplied).toBe(true);
    expect(
      publicUnitStatsV7(state, unitAtV7(state, at(5, 3))).dwarf?.plated,
    ).toBe(4);
  });
});

describe("the Brass Titan (section 10.3)", () => {
  it("attacks unflinching with the Siege Hammer and no longer pushes", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "JUGGERNAUT", at: at(5, 2), hp: 20 },
      { seat: 1, role: "GUARD", at: at(5, 3) },
      ENEMY,
    ]);
    const hit = attackV7(state, at(5, 2), at(5, 3));
    expect(hit.combat.unflinchingApplied).toBe(true);
    // The giants' signatures (`pulp_wars-w49.30`): the Brass Titan has the
    // Siege Hammer instead of Push.
    expect(hit.combat.siegeHammer).toBe(true);
    expect(kindsV7(hit.events)).not.toContain("UNIT_PUSHED");
  });
});
