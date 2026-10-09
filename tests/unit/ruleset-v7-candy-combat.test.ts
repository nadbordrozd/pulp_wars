import { describe, expect, it } from "vitest";
import {
  calculateCombatPreviewV7,
  parseGameStateV7,
  previewSugarTossV7,
  previewTendWoundedV7,
  queryCombatPreviewV7,
  unitIsSplattedV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  candyFieldV7,
  exchangeV7,
  type CandyPieceV7,
} from "../fixtures/v7-candy";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  expectOfferedAcceptedV7,
  hasUnitAtV7,
  offeredV7,
  playV7,
  rejectedV7,
  shieldAtV7,
} from "../fixtures/v7-martian";
import { monsterArenaV7, monsterOfV7 } from "../fixtures/v7-monster-arena";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  movedV7,
  mountainV7,
  patchTileV7,
  unexploreV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Candy revision (`pulp_wars-jdb.3`): Splat, Bounce, Sugar Toss, and
// Frosting (docs/product/RULESET_7_CANDY.md sections 7 to 10).

function endTurn(state: GameStateV7) {
  return applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
}

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

describe("Splat (section 7)", () => {
  const PIE = at(5, 5);
  const TARGET = at(5, 2);
  const field = (
    target: Partial<CandyPieceV7> & { role: UnitRoleIdV7 },
    enemy: FactionIdV7 = "ORIGINAL",
    extra: readonly CandyPieceV7[] = [],
    options: Parameters<typeof candyFieldV7>[1] = {},
  ) =>
    candyFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: PIE },
        { seat: 1, at: TARGET, ...target },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        ...extra,
      ],
      { factions: ["CANDY", enemy], ...options },
    );

  it("Splats a surviving target, whose strike-back is gone for every later attacker this turn", () => {
    const state = field({ role: "GUARD" });
    const guard = unitAtV7(state, TARGET);
    // Before the pie: the Guard strikes back at the Toffee Trooper.
    const before = exchangeV7(state, at(5, 3), TARGET);
    expect(before).toMatchObject({
      retaliation: true,
      noRetaliationReason: null,
    });
    expect(before.damageToAttacker).toBeGreaterThan(0);
    const pie = attackV7(state, PIE, TARGET);
    expect(pie.combat).toMatchObject({
      splatApplied: true,
      defenderDies: false,
    });
    expect(pie.state.splattedThisTurn).toEqual([guard.id]);
    expect(unitIsSplattedV7(pie.state, guard.id)).toBe(true);
    // Splat has no event of its own: it is in the attack's preview.
    expect(kindsV7(pie.events)).not.toContain("UNITS_SPLATTED");
    const follow = attackV7(pie.state, at(5, 3), TARGET);
    expect(follow.combat).toMatchObject({
      retaliation: false,
      noRetaliationReason: "SPLATTED",
      damageToAttacker: 0,
      attackerShieldDamage: 0,
      splatApplied: false,
    });
    expect(follow.attacker?.hp).toBe(unitAtV7(state, at(5, 3)).hp);
  });

  it("answers the Pie's own exchange when the target reaches it, and never Splats by retaliation", () => {
    const state = candyFieldV7([
      { seat: 0, role: "CATAPULT", at: at(5, 4) },
      { seat: 1, role: "MARKSMAN", at: TARGET },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
    ]);
    const marksman = unitAtV7(state, TARGET);
    const pie = attackV7(state, at(5, 4), TARGET);
    expect(pie.combat).toMatchObject({ retaliation: true, splatApplied: true });
    expect(pie.combat.damageToAttacker).toBeGreaterThan(0);
    expect(pie.state.splattedThisTurn).toEqual([marksman.id]);
    // On the enemy's turn the Marksman shoots the Pie: the Pie strikes back
    // (distance 2), and its retaliation Splats nobody.
    const enemyTurn = endTurn(pie.state).state;
    expect(enemyTurn.splattedThisTurn).toEqual([]);
    const shot = attackV7(enemyTurn, TARGET, at(5, 4));
    expect(shot.combat.splatApplied).toBe(false);
    expect(shot.state.splattedThisTurn).toEqual([]);
  });

  it("keeps the ordinary reason where the ordinary rules have no strike-back", () => {
    // A Gunner at range 2 against a Splatted Fighter: out of range anyway.
    const state = candyFieldV7([
      { seat: 0, role: "MARKSMAN", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: TARGET, splatted: true },
    ]);
    expect(exchangeV7(state, at(5, 4), TARGET)).toMatchObject({
      retaliation: false,
      noRetaliationReason: "OUT_OF_RANGE",
    });
    // A kill: the defender died.
    const kill = candyFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: TARGET, hp: 1, splatted: true },
    ]);
    expect(exchangeV7(kill, at(5, 3), TARGET)).toMatchObject({
      retaliation: false,
      noRetaliationReason: "DEFENDER_DIED",
    });
  });

  it("Splats on a hit a Shield took whole, and on a target in any form", () => {
    const martian = field({ role: "GUARD" }, "MARTIAN");
    const projector = unitAtV7(martian, TARGET);
    const shield = shieldAtV7(martian, TARGET);
    expect(shield).toBeGreaterThan(0);
    const pie = attackV7(martian, PIE, TARGET);
    expect(pie.combat.splatApplied).toBe(true);
    expect(pie.state.splattedThisTurn).toEqual([projector.id]);
    // An embarked unit and a boat.
    for (const [role, form] of [
      ["FIGHTER", "EMBARKED"],
      ["PATROL_BOAT", "NAVAL"],
    ] as const) {
      const state = field({ role, form }, "ORIGINAL", [], { water: [TARGET] });
      const run = attackV7(state, PIE, TARGET);
      if (run.target === undefined) continue;
      expect(run.combat.splatApplied, role).toBe(true);
      expect(run.state.splattedThisTurn, role).toEqual([run.target.id]);
    }
  });

  it("stops retaliation Lifesteal, Infect, and Dig In strike-backs of a Splatted unit", () => {
    for (const [enemy, role] of [
      ["UNDEAD", "KNIGHT"],
      ["UNDEAD", "GUARD"],
      ["DWARF", "FIGHTER"],
      // A Gyrocopter's distance-1 strike-back.
      ["DWARF", "RAIDER"],
      ["DINOSAUR", "KNIGHT"],
    ] as const) {
      const state = candyFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role, at: TARGET, splatted: true },
        ],
        { factions: ["CANDY", enemy] },
      );
      const run = attackV7(state, at(5, 3), TARGET);
      expect(run.combat, `${enemy} ${role}`).toMatchObject({
        retaliation: false,
        noRetaliationReason: "SPLATTED",
        damageToAttacker: 0,
        defenderHeal: 0,
        attackerInfected: false,
        attackerBitten: false,
      });
      expect(run.attacker?.hp).toBe(10);
      expect(run.state.bitten).toEqual([]);
    }
  });

  it("is cleared at the Candy End Turn and when the unit dies, and a controlled Pie Splats into its controller's turn", () => {
    const state = field({ role: "GUARD", splatted: true });
    expect(endTurn(state).state.splattedThisTurn).toEqual([]);
    const dying = candyFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: TARGET, hp: 1, splatted: true },
      { seat: 1, role: "FIGHTER", at: at(1, 1), splatted: true },
    ]);
    const run = attackV7(dying, at(5, 3), TARGET);
    expect(run.state.splattedThisTurn).toEqual([idAt(dying, at(1, 1))]);
    const controlled = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 5) },
        {
          seat: 1,
          role: "CATAPULT",
          at: PIE,
          hp: 5,
          controlledBy: at(6, 5),
        },
        { seat: 1, role: "GUARD", at: TARGET },
      ],
      { factions: ["MARTIAN", "CANDY"] },
    );
    const pie = attackV7(controlled, PIE, TARGET);
    expect(pie.combat.splatApplied).toBe(true);
    expect(pie.state.splattedThisTurn).toEqual([idAt(controlled, TARGET)]);
    expect(endTurn(pie.state).state.splattedThisTurn).toEqual([]);
  });

  it("never Splats the Giant Spider, and the state refuses a neutral entry", () => {
    const state = monsterArenaV7(
      [
        { seat: 0, role: "CATAPULT", at: at(7, 10) },
        { seat: 1, role: "FIGHTER", at: at(1, 14) },
      ],
      {},
      ["CANDY", "UNDEAD", "GOBLIN", "DINOSAUR"],
    );
    const spider = monsterOfV7(state);
    const pie = unitAtV7(state, at(7, 10));
    const preview = calculateCombatPreviewV7(state, pie.id, spider.id);
    expect(preview.splatApplied).toBe(false);
    const result = applyOkV7(state, activeIdV7(state), {
      kind: "ATTACK",
      unitId: pie.id,
      targetUnitId: spider.id,
    });
    expect(result.state.splattedThisTurn).toEqual([]);
    expect(
      parseGameStateV7({ ...result.state, splattedThisTurn: [spider.id] }),
    ).toBeNull();
    // The Spider (a JUGGERNAUT body) is never bounced off a Marshmallow.
    const guarded = monsterArenaV7(
      [
        { seat: 0, role: "GUARD", at: at(7, 8) },
        { seat: 1, role: "FIGHTER", at: at(1, 14) },
      ],
      {},
      ["CANDY", "UNDEAD", "GOBLIN", "DINOSAUR"],
    );
    expect(
      calculateCombatPreviewV7(
        guarded,
        monsterOfV7(guarded).id,
        idAt(guarded, at(7, 8)),
      ),
    ).toMatchObject({ bounce: "NONE", bounceTo: null });
  });

  it("rejects malformed Splat and Toss lists", () => {
    const state = field({ role: "GUARD" });
    const guard = idAt(state, TARGET);
    const gumdrop = idAt(state, at(5, 3));
    expect(
      parseGameStateV7({ ...state, splattedThisTurn: [guard, guard] }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        splattedThisTurn: [guard, gumdrop].sort((a, b) => b - a),
      }),
    ).toBeNull();
    expect(parseGameStateV7({ ...state, splattedThisTurn: [999] })).toBeNull();
    expect(parseGameStateV7({ ...state, tossedThisTurn: [999] })).toBeNull();
    expect(
      parseGameStateV7({ ...state, tossedThisTurn: [gumdrop, gumdrop] }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        sugarRush: [{ unitId: guard, phase: "RUSHED" }],
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        sugarRush: [
          { unitId: gumdrop, phase: "RUSHED" },
          { unitId: gumdrop, phase: "CRASHED" },
        ],
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        sugarRush: [{ unitId: gumdrop, phase: "SLEEPY" }],
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        sugarRush: [{ unitId: gumdrop, phase: "RUSHED" }],
      }),
    ).not.toBeNull();
  });
});

describe("Bounce (section 8)", () => {
  const MALLOW = at(5, 4);

  it("bounces a surviving melee attacker one tile straight back, in each of the eight directions", () => {
    for (const [dx, dy] of [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ] as const) {
      const from = at(MALLOW.x + dx, MALLOW.y + dy);
      const to = at(MALLOW.x + 2 * dx, MALLOW.y + 2 * dy);
      const state = candyFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: from, activation: movedV7(1) },
          { seat: 0, role: "GUARD", at: MALLOW },
        ],
        { activeSeat: 1 },
      );
      const fighter = unitAtV7(state, from);
      const mallow = unitAtV7(state, MALLOW);
      const run = attackV7(state, from, MALLOW);
      expect(run.combat, `${dx},${dy}`).toMatchObject({
        bounce: "WILL_BOUNCE",
        bounceTo: to,
      });
      expect(run.attacker?.at).toEqual(to);
      expect(run.events).toContainEqual({
        kind: "UNIT_PUSHED",
        sourceUnitId: mallow.id,
        targetUnitId: fighter.id,
        from,
        to,
      });
      // Not a Move: the flags are kept.
      expect(run.attacker?.activation).toMatchObject({
        moved: true,
        movedPathLength: 1,
        attacksUsed: 1,
      });
    }
  });

  it("is blocked by the edge, a unit, a site, terrain, water, and a chest, and then nothing happens", () => {
    const blocked = (state: GameStateV7, from: CoordV7, target: CoordV7) => {
      const run = attackV7(state, from, target);
      expect(run.combat).toMatchObject({ bounce: "BLOCKED", bounceTo: null });
      expect(run.attacker?.at).toEqual(from);
      expect(kindsV7(run.events)).not.toContain("UNIT_PUSHED");
    };
    // The edge of the board.
    blocked(
      candyFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(5, 0) },
          { seat: 0, role: "GUARD", at: at(5, 1) },
        ],
        { activeSeat: 1 },
      ),
      at(5, 0),
      at(5, 1),
    );
    // A unit behind the attacker.
    blocked(
      candyFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(5, 3) },
          { seat: 1, role: "FIGHTER", at: at(5, 2) },
          { seat: 0, role: "GUARD", at: MALLOW },
        ],
        { activeSeat: 1 },
      ),
      at(5, 3),
      MALLOW,
    );
    // A settlement site (the village (5, 5)) behind the attacker.
    blocked(
      candyFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(5, 6) },
          { seat: 0, role: "GUARD", at: at(5, 7) },
        ],
        { activeSeat: 1 },
      ),
      at(5, 6),
      at(5, 7),
    );
    // A Mountain the attacker's seat cannot enter.
    blocked(
      mountainV7(
        candyFieldV7(
          [
            { seat: 1, role: "FIGHTER", at: at(5, 3) },
            { seat: 0, role: "GUARD", at: MALLOW },
          ],
          {
            activeSeat: 1,
            techs: { 1: withoutTechsV7("ORIGINAL", "ENGINEERING") },
          },
        ),
        at(5, 2),
      ),
      at(5, 3),
      MALLOW,
    );
    // Water behind a land unit.
    blocked(
      candyFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(5, 3) },
          { seat: 0, role: "GUARD", at: MALLOW },
        ],
        { activeSeat: 1, water: [at(5, 2)] },
      ),
      at(5, 3),
      MALLOW,
    );
    // A treasure chest.
    const chest = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { activeSeat: 1 },
    );
    blocked(
      checkedV7({ ...chest, treasureChests: [at(5, 2)] }),
      at(5, 3),
      MALLOW,
    );
  });

  it("never bounces a JUGGERNAUT body, an attack from distance 2, or an exchange in which someone dies", () => {
    for (const faction of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
    ] as const) {
      const state = candyFieldV7(
        [
          { seat: 1, role: "JUGGERNAUT", at: at(5, 3) },
          { seat: 0, role: "JUGGERNAUT", at: MALLOW },
        ],
        { factions: ["CANDY", faction], activeSeat: 1 },
      );
      expect(exchangeV7(state, at(5, 3), MALLOW), faction).toMatchObject({
        bounce: "NONE",
        bounceTo: null,
      });
    }
    // A Golem attacking a Marshmallow in a test mirror.
    const mirror = candyFieldV7(
      [
        { seat: 1, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { factions: ["CANDY", "CANDY"], activeSeat: 1 },
    );
    expect(exchangeV7(mirror, at(5, 3), MALLOW).bounce).toBe("NONE");
    // Distance 2.
    const ranged = candyFieldV7(
      [
        { seat: 1, role: "MARKSMAN", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { activeSeat: 1 },
    );
    expect(attackV7(ranged, at(5, 2), MALLOW).combat.bounce).toBe("NONE");
    // The Marshmallow dies: no Bounce (the Knight advances instead).
    const kill = candyFieldV7(
      [
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
        { seat: 0, role: "GUARD", at: MALLOW, hp: 1 },
      ],
      { activeSeat: 1 },
    );
    const killed = attackV7(kill, at(5, 3), MALLOW);
    expect(killed.combat.bounce).toBe("NONE");
    expect(killed.attacker?.at).toEqual(MALLOW);
    // The attacker dies to the strike-back.
    const dies = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { activeSeat: 1 },
    );
    const died = attackV7(dies, at(5, 3), MALLOW);
    expect(died.attacker).toBeUndefined();
    expect(died.combat.bounce).toBe("NONE");
  });

  it("bounces two-slot bodies, a flyer, and a boat; a Knight's Overrun and a Raider's Escape follow the rules", () => {
    // A T-Rex (two slots) and a Mothership (a flyer) are bounced.
    for (const [faction, role] of [
      ["DINOSAUR", "KNIGHT"],
      // (The ninth unit, 7r55: the Triceratops, the Steam Tank, and the
      // Mammoth are the heavy role of their factions.)
      ["DINOSAUR", "SWORDSMAN"],
      ["MARTIAN", "KNIGHT"],
      ["DWARF", "SWORDSMAN"],
      ["DWARF", "KNIGHT"],
      ["DWARF", "GUARD"],
      ["ICE_FOLK", "SWORDSMAN"],
      ["ICE_FOLK", "GUARD"],
      ["GOBLIN", "KNIGHT"],
      ["UNDEAD", "KNIGHT"],
    ] as const) {
      const state = candyFieldV7(
        [
          { seat: 1, role, at: at(5, 3) },
          { seat: 0, role: "GUARD", at: MALLOW },
        ],
        { factions: ["CANDY", faction], activeSeat: 1 },
      );
      const run = attackV7(state, at(5, 3), MALLOW);
      if (run.combat.push === "WILL_PUSH") continue;
      expect(run.combat, `${faction} ${role}`).toMatchObject({
        bounce: "WILL_BOUNCE",
        bounceTo: at(5, 2),
      });
      expect(run.attacker?.at, `${faction} ${role}`).toEqual(at(5, 2));
      // A bounced attacker made no kill: no continuation.
      expect(run.combat.overrunContinues).toBe(false);
    }
    // A flyer bounced off a Marshmallow may land on a Rift (a ground unit is
    // never bounced onto one), under the Push conditions for a flyer: water
    // is not the land kind of its form.
    const onto = (
      faction: FactionIdV7,
      patch: "RIFT" | "WATER",
    ): { readonly bounce: string; readonly at: CoordV7 | undefined } => {
      const base = candyFieldV7(
        [
          { seat: 1, role: "KNIGHT", at: at(5, 3) },
          { seat: 0, role: "GUARD", at: MALLOW },
        ],
        {
          factions: ["CANDY", faction],
          activeSeat: 1,
          ...(patch === "WATER" ? { water: [at(5, 2)] } : {}),
        },
      );
      const state =
        patch === "RIFT"
          ? patchTileV7(base, at(5, 2), { terrain: "RIFT" })
          : base;
      const run = attackV7(state, at(5, 3), MALLOW);
      return { bounce: run.combat.bounce, at: run.attacker?.at };
    };
    expect(onto("MARTIAN", "RIFT")).toEqual({
      bounce: "WILL_BOUNCE",
      at: at(5, 2),
    });
    expect(onto("ORIGINAL", "RIFT")).toEqual({
      bounce: "BLOCKED",
      at: at(5, 3),
    });
    expect(onto("MARTIAN", "WATER")).toEqual({
      bounce: "BLOCKED",
      at: at(5, 3),
    });
    // A boat is bounced onto water.
    const boat = candyFieldV7(
      [
        { seat: 1, role: "PATROL_BOAT", at: at(5, 3), form: "NAVAL" },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { activeSeat: 1, water: [at(5, 3), at(5, 2)] },
    );
    const sailed = attackV7(boat, at(5, 3), MALLOW);
    expect(sailed.combat).toMatchObject({
      bounce: "WILL_BOUNCE",
      bounceTo: at(5, 2),
    });
    // A boat with land behind it is not bounced.
    const coast = candyFieldV7(
      [
        { seat: 1, role: "PATROL_BOAT", at: at(5, 3), form: "NAVAL" },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { activeSeat: 1, water: [at(5, 3)] },
    );
    expect(attackV7(coast, at(5, 3), MALLOW).combat.bounce).toBe("BLOCKED");
    // A bounced Raider may still Escape.
    const raider = candyFieldV7(
      [
        { seat: 1, role: "RAIDER", at: at(5, 3) },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { activeSeat: 1 },
    );
    const escaped = attackV7(raider, at(5, 3), MALLOW);
    expect(escaped.attacker).toMatchObject({
      at: at(5, 2),
      activation: { escapeAvailable: true },
    });
  });

  it("bounces a Triceratops back to the tile its Charge! follow started from", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "SWORDSMAN", at: at(5, 2), activation: movedV7(2) },
        { seat: 0, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["CANDY", "DINOSAUR"], activeSeat: 1 },
    );
    const triceratops = unitAtV7(state, at(5, 2));
    const mallow = unitAtV7(state, at(5, 3));
    const run = attackV7(state, at(5, 2), at(5, 3));
    expect(run.combat.push).toBe("WILL_PUSH");
    // Pushed to (5, 4), followed to (5, 3), bounced back to (5, 2).
    expect(run.target?.at).toEqual(at(5, 4));
    expect(run.combat).toMatchObject({
      bounce: "WILL_BOUNCE",
      bounceTo: at(5, 2),
    });
    expect(run.attacker?.at).toEqual(at(5, 2));
    const pushes = run.events.filter((event) => event.kind === "UNIT_PUSHED");
    expect(pushes.at(-1)).toMatchObject({
      sourceUnitId: mallow.id,
      targetUnitId: triceratops.id,
      from: at(5, 3),
      to: at(5, 2),
    });
  });

  it("is not a Move: no eating, no chest, no Field Defense destroyed, and the Golem bounces too", () => {
    const base = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(3, 5) },
        { seat: 0, role: "JUGGERNAUT", at: at(4, 5), rush: "CRASHED" },
      ],
      {
        activeSeat: 1,
        crumbs: [{ at: at(2, 5), role: "KNIGHT" }],
      },
    );
    // A Crashed Golem still bounces; the attacker lands on Candy Crumbs
    // without eating them.
    const run = attackV7(base, at(3, 5), at(4, 5));
    expect(run.combat).toMatchObject({
      bounce: "WILL_BOUNCE",
      bounceTo: at(2, 5),
    });
    expect(run.state.crumbs).toHaveLength(1);
    expect(kindsV7(run.events)).not.toContain("CRUMBS_EATEN");
    // Field Defense of the Candy seat on the landing tile stays.
    const defended = fieldDefenseV7(
      candyFieldV7(
        [
          { seat: 1, role: "FIGHTER", at: at(8, 6) },
          { seat: 0, role: "GUARD", at: at(8, 5) },
        ],
        { activeSeat: 1 },
      ),
      at(8, 7),
    );
    const landed = attackV7(defended, at(8, 6), at(8, 5));
    expect(landed.attacker?.at).toEqual(at(8, 7));
    expect(kindsV7(landed.events)).not.toContain("FIELD_DEFENSE_DESTROYED");
    // A Splatted Marshmallow still bounces (and does not strike back).
    const splatted = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "GUARD", at: MALLOW, splatted: true },
      ],
      { factions: ["CANDY", "CANDY"] },
    );
    expect(attackV7(splatted, at(5, 3), MALLOW).combat).toMatchObject({
      retaliation: false,
      noRetaliationReason: "SPLATTED",
      bounce: "WILL_BOUNCE",
    });
  });

  it("is exact for the attacker, and unknown behind fog only in an estimate over an unexplored tile", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "GUARD", at: MALLOW },
      ],
      { activeSeat: 1 },
    );
    const fighter = idAt(state, at(5, 3));
    const mallow = idAt(state, MALLOW);
    // The tile behind an attacker is always in its own sight, so its
    // preview is exact (and `attackV7` compares it with the resolution).
    expect(
      queryCombatPreviewV7(activeViewV7(state), fighter, mallow),
    ).toMatchObject({ bounce: "WILL_BOUNCE", bounceTo: at(5, 2) });
    // An estimate over a tile the viewer has not explored (a state no real
    // match reaches for the attacker's own seat) reports the unknown.
    const hidden = unexploreV7(state, 1, [at(5, 2)]);
    expect(
      queryCombatPreviewV7(
        viewForV7(hidden, seatIdV7(hidden, 1)),
        fighter,
        mallow,
      ),
    ).toMatchObject({ bounce: "UNKNOWN_BEHIND_FOG", bounceTo: null });
    // Another seat is offered no preview of this attack.
    expect(
      queryCombatPreviewV7(
        viewForV7(state, seatIdV7(state, 0)),
        fighter,
        mallow,
      ),
    ).toBeNull();
  });
});

describe("Sugar Toss (section 9)", () => {
  const GUNNER = at(5, 3);
  const field = (
    extra: Partial<CandyPieceV7> = {},
    pieces: readonly CandyPieceV7[] = [
      { seat: 0, role: "FIGHTER", at: at(5, 5), hp: 4 },
    ],
    options: Parameters<typeof candyFieldV7>[1] = {},
  ) =>
    candyFieldV7(
      [
        { seat: 0, role: "MARKSMAN", at: GUNNER, ...extra },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ...pieces,
      ],
      options,
    );
  const toss = (state: GameStateV7, target: CoordV7): CommandV7 => ({
    kind: "SUGAR_TOSS",
    unitId: idAt(state, GUNNER),
    targetUnitId: idAt(state, target),
  });

  it("heals an own land unit within two tiles by 2, once per target per turn", () => {
    const state = field({}, [
      { seat: 0, role: "FIGHTER", at: at(5, 5), hp: 4 },
      { seat: 0, role: "GUARD", at: at(4, 3), hp: 17 },
      { seat: 0, role: "MARKSMAN", at: at(6, 4) },
    ]);
    const gunner = unitAtV7(state, GUNNER);
    const gumdrop = unitAtV7(state, at(5, 5));
    expect(previewSugarTossV7(activeViewV7(state), gunner.id)).toEqual({
      unitId: gunner.id,
      targets: [
        { unitId: idAt(state, at(4, 3)), amount: 1, hpAfter: 18 },
        { unitId: gumdrop.id, amount: 2, hpAfter: 6 },
      ].sort((left, right) => left.unitId - right.unitId),
    });
    const result = playV7(state, toss(state, at(5, 5)));
    expect(result.events).toEqual([
      {
        kind: "SUGAR_TOSSED",
        playerId: activeIdV7(state),
        unitId: gunner.id,
        targetUnitId: gumdrop.id,
        amount: 2,
        hpAfter: 6,
      },
    ]);
    expect(unitAtV7(result.state, at(5, 5)).hp).toBe(6);
    expect(result.state.tossedThisTurn).toEqual([gumdrop.id]);
    expect(unitAtV7(result.state, GUNNER).activation).toMatchObject({
      specialActed: true,
      handled: true,
    });
    // The target's own action is not used.
    expect(unitAtV7(result.state, at(5, 5)).activation).toEqual(
      gumdrop.activation,
    );
    // A second Gunner cannot toss to the same unit this turn.
    const second: CommandV7 = {
      kind: "SUGAR_TOSS",
      unitId: idAt(result.state, at(6, 4)),
      targetUnitId: gumdrop.id,
    };
    expect(rejectedV7(result.state, second)).toEqual({
      code: "SUGAR_TOSS_NOT_LEGAL",
      params: { reason: "ALREADY_TOSSED" },
    });
    // The list is emptied at End Turn.
    expect(endTurn(result.state).state.tossedThisTurn).toEqual([]);
  });

  it("offers exactly the accepted tosses", () => {
    const state = field({}, [
      { seat: 0, role: "FIGHTER", at: at(5, 5), hp: 4 },
      { seat: 0, role: "GUARD", at: at(4, 3) },
      { seat: 0, role: "KNIGHT", at: at(8, 3), hp: 2 },
      { seat: 0, role: "FIGHTER", at: at(6, 3), hp: 4, tossed: true },
      { seat: 0, role: "MARKSMAN", at: at(6, 5), hp: 3 },
    ]);
    const offered = expectOfferedAcceptedV7(state, "SUGAR_TOSS");
    const pairs: readonly (readonly [CoordV7, CoordV7])[] = [
      [GUNNER, at(5, 5)],
      [GUNNER, at(6, 5)],
      [at(6, 5), at(5, 5)],
      [at(6, 5), at(8, 3)],
    ];
    expect(offered).toEqual(
      pairs
        .map(([from, target]) => ({
          kind: "SUGAR_TOSS" as const,
          unitId: idAt(state, from),
          targetUnitId: idAt(state, target),
        }))
        .sort(
          (left, right) =>
            left.unitId - right.unitId ||
            left.targetUnitId - right.targetUnitId,
        ),
    );
  });

  it("rejects each row in order, atomically", () => {
    // Row 2: not a Gunner.
    const gumdrop = field({ role: "FIGHTER" });
    expect(rejectedV7(gumdrop, toss(gumdrop, at(5, 5)))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "FIGHTER" },
    });
    // Row 3: Crashed.
    const crashed = field({ rush: "CRASHED" });
    expect(rejectedV7(crashed, toss(crashed, at(5, 5))).code).toBe(
      "UNIT_CRASHED",
    );
    // Row 4: the action is spent. Ice Folk Freeze (`pulp_wars-w49.37`): a
    // Frozen Gunner is refused before it (`UNIT_FROZEN`).
    const acted = field({ activation: { attacked: true, attacksUsed: 1 } });
    expect(rejectedV7(acted, toss(acted, at(5, 5))).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    const sluggish = field(
      { frozen: { turnsLeft: 1 }, activation: movedV7(1) },
      undefined,
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    expect(rejectedV7(sluggish, toss(sluggish, at(5, 5))).code).toBe(
      "UNIT_FROZEN",
    );
    // A Gunner that moved (not Frozen) may still toss.
    const moved = field({ activation: movedV7(1) });
    expect(playV7(moved, toss(moved, at(5, 5))).events).toHaveLength(1);
    // Row 5: an embarked Gunner.
    const afloat = field({ form: "EMBARKED" }, undefined, { water: [GUNNER] });
    expect(rejectedV7(afloat, toss(afloat, at(5, 5)))).toEqual({
      code: "SUGAR_TOSS_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    // Row 6: no such unit, the Gunner itself, an embarked target.
    const base = field();
    const gunner = idAt(base, GUNNER);
    for (const targetUnitId of [999, gunner])
      expect(
        rejectedV7(base, {
          kind: "SUGAR_TOSS",
          unitId: gunner,
          targetUnitId: targetUnitId as never,
        }).code,
      ).toBe("HEAL_TARGET_NOT_FOUND");
    const boarded = field(
      {},
      [{ seat: 0, role: "FIGHTER", at: at(5, 5), hp: 4, form: "EMBARKED" }],
      { water: [at(5, 5)] },
    );
    void boarded;
    // Row 7: an enemy unit in sight.
    const enemy = field({}, [
      { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 4 },
    ]);
    expect(rejectedV7(enemy, toss(enemy, at(5, 5))).code).toBe(
      "HEAL_TARGET_NOT_OWNED",
    );
    // Row 8: three tiles away.
    const far = field({}, [{ seat: 0, role: "FIGHTER", at: at(5, 6), hp: 4 }]);
    expect(rejectedV7(far, toss(far, at(5, 6)))).toEqual({
      code: "SUGAR_TOSS_NOT_LEGAL",
      params: { reason: "OUT_OF_RANGE" },
    });
    // Row 10: a full target.
    const full = field({}, [{ seat: 0, role: "FIGHTER", at: at(5, 5) }]);
    expect(rejectedV7(full, toss(full, at(5, 5))).code).toBe(
      "HEAL_TARGET_FULL",
    );
    expect(
      previewSugarTossV7(activeViewV7(full), idAt(full, GUNNER)),
    ).toBeNull();
  });

  it("a controlled Gunner tosses to its controller's units", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(6, 3) },
        {
          seat: 1,
          role: "MARKSMAN",
          at: GUNNER,
          hp: 4,
          controlledBy: at(6, 3),
        },
        { seat: 0, role: "FIGHTER", at: at(5, 5), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(4, 4), hp: 3 },
      ],
      { factions: ["MARTIAN", "CANDY"] },
    );
    const result = playV7(state, toss(state, at(5, 5)));
    expect(unitAtV7(result.state, at(5, 5)).hp).toBe(5);
    // Its original seat's unit is no longer its own.
    expect(rejectedV7(state, toss(state, at(4, 4))).code).toBe(
      "HEAL_TARGET_NOT_OWNED",
    );
  });
});

describe("Frosting (section 9)", () => {
  it("is the Confectioner's Tend Wounded: heals 2, cures, thaws, and ends neither a Crash nor a Splat", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(5, 3) },
        {
          seat: 0,
          role: "FIGHTER",
          at: at(5, 4),
          hp: 4,
          rush: "CRASHED",
          frozen: { turnsLeft: 1 },
        },
        { seat: 0, role: "GUARD", at: at(4, 3), hp: 17 },
        { seat: 0, role: "KNIGHT", at: at(6, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 5), hp: 4 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["CANDY", "ICE_FOLK"] },
    );
    const confectioner = unitAtV7(state, at(5, 3));
    const preview = previewTendWoundedV7(activeViewV7(state), confectioner.id);
    expect(preview).not.toBeNull();
    const result = playV7(state, {
      kind: "TEND_WOUNDED",
      unitId: confectioner.id,
    });
    const tended = result.events.find(
      (event) => event.kind === "WOUNDED_TENDED",
    );
    if (tended?.kind !== "WOUNDED_TENDED") throw new Error("not tended");
    expect(tended.results.map((entry) => [entry.unitId, entry.amount])).toEqual(
      [
        [idAt(state, at(5, 4)), 2],
        [idAt(state, at(4, 3)), 1],
      ].sort((left, right) => (left[0] as number) - (right[0] as number)),
    );
    expect(unitAtV7(result.state, at(5, 4)).hp).toBe(6);
    expect(unitAtV7(result.state, at(4, 3)).hp).toBe(18);
    // Two tiles away: not reached. A full unit is not listed.
    expect(unitAtV7(result.state, at(5, 5)).hp).toBe(4);
    // The Frozen unit thaws (Ice Folk Freeze); the Crash stays.
    expect(
      result.state.frozen.find(
        (entry) => entry.unitId === idAt(state, at(5, 4)),
      ),
    ).toBeUndefined();
    expect(result.state.sugarRush).toEqual([
      { unitId: idAt(state, at(5, 4)), phase: "CRASHED" },
    ]);
    // A unit can be healed by one Frosting and one Sugar Toss per turn.
    expect(result.state.tossedThisTurn).toEqual([]);
    // No Rally is ever offered to the Confectioner.
    expect(offeredV7(state, "RALLY")).toEqual([]);
    expect(hasUnitAtV7(result.state, at(5, 3))).toBe(true);
  });
});
