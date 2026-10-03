import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  queryCombatPreviewV7,
  viewForV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  iceFieldV7,
  withChillV7,
  type IcePieceV7,
} from "../fixtures/v7-ice-folk";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  kindsV7,
  movedV7,
  moveV7,
  walledV7,
} from "../fixtures/v7-revision20";

// The Ice Folk revision (`pulp_wars-7g3.3`): Shatter
// (docs/product/RULESET_7_ICE_FOLK.md sections 5.5, 5.6, and 8, with the
// rulings of section 10).

const CHILLED = { sluggish: false, turnsLeft: 1 } as const;

/**
 * Ice Folk (seat 0, active) pieces against a Chilled target on (5, 3). The
 * Ice Folk seat has Scouting and Raiding only (threshold 3, no Explosives
 * demolition), as in the worked examples.
 */
const against = (
  faction: FactionIdV7,
  role: UnitRoleIdV7,
  attackers: readonly IcePieceV7[],
  target: Partial<IcePieceV7> = {},
  options: Parameters<typeof iceFieldV7>[1] = {},
): GameStateV7 =>
  iceFieldV7(
    [...attackers, { seat: 1, role, at: at(5, 3), chill: CHILLED, ...target }],
    {
      factions: ["ICE_FOLK", faction],
      techs: { 0: ["SCOUTING", "RAIDING"] },
      ...options,
    },
  );

/** Runs the attacks in order and returns the last run. */
function hits(
  state: GameStateV7,
  attackers: readonly CoordV7[],
  target: CoordV7 = at(5, 3),
) {
  let current = state;
  const runs = [];
  for (const from of attackers) {
    const run = attackV7(current, from, target);
    runs.push(run);
    current = run.state;
  }
  return runs;
}

// Revision 20 section 6.3 (`pulp_wars-0hi.3`, 7r23) made the Human Fighter
// and Marksman 12 HP and the Caveman 10 HP after section 5.6 was written,
// so the examples written for a 12-HP Caveman use the Human Fighter, those
// for a 10-HP Fighter use the Caveman (same Attack and Defense), and the
// Marksman example uses the 10-HP Spitter.
describe("Shatter worked examples (section 5.6)", () => {
  it("Fighter 12 HP (the section's 12-HP Caveman): Yeti 5, then the second Yeti hit would leave 1: shatters", () => {
    const state = against("ORIGINAL", "FIGHTER", [
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
    ]);
    const [first, second] = hits(state, [at(4, 3), at(4, 4)]);
    expect(first?.combat).toMatchObject({
      damageToDefender: 5,
      damageToAttacker: 5,
      shatters: false,
    });
    expect(second?.combat).toMatchObject({
      shatters: true,
      damageToDefender: 7,
      defenderDies: true,
      retaliation: false,
      noRetaliationReason: "DEFENDER_DIED",
      damageToAttacker: 0,
    });
    // Unchilled it survives two hits and deals 3 more.
    const warm = checkedV7({ ...state, chilled: [] });
    const [, plain] = hits(warm, [at(4, 3), at(4, 4)]);
    expect(plain?.combat).toMatchObject({
      shatters: false,
      defenderDies: false,
      damageToDefender: 6,
      damageToAttacker: 3,
    });
  });

  it("Caveman 10 HP (the section's 10-HP Fighter): two Yeti hits kill by plain damage; no Shatter happens", () => {
    const state = against("DINOSAUR", "FIGHTER", [
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
    ]);
    const [first, second] = hits(state, [at(4, 3), at(4, 4)]);
    expect(first?.combat).toMatchObject({
      damageToDefender: 5,
      shatters: false,
    });
    expect(second?.combat).toMatchObject({
      damageToDefender: 5,
      defenderDies: true,
      shatters: false,
    });
    expect(kindsV7(second?.events ?? [])).toContain("UNIT_DIED");
    expect(
      second?.events.find((event) => event.kind === "UNIT_DIED"),
    ).toMatchObject({ cause: "ATTACK" });
  });

  it("Caveman 10 HP: a Sled with Charge deals 8, leaving 2: shatters at full HP", () => {
    const state = against("DINOSAUR", "FIGHTER", [
      { seat: 0, role: "RAIDER", at: at(4, 3), activation: movedV7(2) },
    ]);
    const [run] = hits(state, [at(4, 3)]);
    expect(run?.combat).toMatchObject({
      chargeApplied: true,
      shatters: true,
      damageToDefender: 10,
      retaliation: false,
    });
  });

  it("Fighter (12 HP) on Field Defense: Yeti 4 (takes 8), then the second would leave 3: shatters", () => {
    // The Human Fighter stands on Field Defense in its own territory (3, 7).
    const base = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 7) },
        { seat: 0, role: "FIGHTER", at: at(4, 6) },
        { seat: 1, role: "FIGHTER", at: at(3, 7), chill: CHILLED },
      ],
      { techs: { 0: [] } },
    );
    const state = fieldDefenseV7(base, at(3, 7));
    const [first, second] = hits(state, [at(4, 7), at(4, 6)], at(3, 7));
    expect(first?.combat).toMatchObject({
      fortificationLevel: 1,
      damageToDefender: 4,
      damageToAttacker: 8,
    });
    expect(second?.combat).toMatchObject({
      shatters: true,
      damageToDefender: 8,
    });
  });

  it("Fighter at 8 HP (after a Sweep flank): a Yeti's 5 would leave 3: shatters", () => {
    const state = against(
      "ORIGINAL",
      "FIGHTER",
      [{ seat: 0, role: "FIGHTER", at: at(4, 3) }],
      { hp: 8 },
    );
    const [run] = hits(state, [at(4, 3)]);
    expect(run?.combat).toMatchObject({ shatters: true, damageToDefender: 8 });
  });

  it("Guard at 15 HP on a Walled center: Mammoth 4, Mammoth 5, then the Yeti's 5 would leave 1: shatters", () => {
    // Three attackers walk up to the capital's ring (the ring holds the
    // fixture's Farms) and attack after moving.
    const walled = walledV7({
      attackerFaction: "ICE_FOLK",
      attackers: [
        { role: "GUARD", at: at(6, 7) },
        { role: "GUARD", at: at(6, 8) },
        { role: "FIGHTER", at: at(6, 9) },
      ],
    });
    // The section's 15-HP Guard is a 17-HP Guard at 15 HP since revision 20
    // section 6.3.
    const guardId = unitAtV7(walled, at(8, 8)).id;
    let state = withChillV7(
      checkedV7({
        ...walled,
        units: walled.units.map((unit) =>
          unit.id === guardId ? { ...unit, hp: 15 } : unit,
        ),
      }),
      [{ at: at(8, 8), sluggish: false, turnsLeft: 1 }],
    );
    const runs = [];
    for (const [from, to] of [
      [at(6, 7), at(7, 7)],
      [at(6, 8), at(7, 8)],
      [at(6, 9), at(7, 9)],
    ] as const) {
      state = moveV7(state, from, [to]).state;
      const run = attackV7(state, to, at(8, 8));
      runs.push(run);
      state = run.state;
    }
    const [first, second, third] = runs;
    expect(first?.combat).toMatchObject({
      damageToDefender: 4,
      damageToAttacker: 14,
    });
    expect(second?.combat).toMatchObject({
      damageToDefender: 5,
      damageToAttacker: 13,
    });
    expect(third?.combat).toMatchObject({
      shatters: true,
      damageToDefender: 6,
    });
    // Unchilled the Yeti takes 10, capped at its 9 HP (`pulp_wars-7g3.7`),
    // and dies.
    const warm = checkedV7({ ...(second?.state as GameStateV7), chilled: [] });
    const walked = moveV7(warm, at(6, 9), [at(7, 9)]).state;
    expect(attackV7(walked, at(7, 9), at(8, 8)).combat).toMatchObject({
      shatters: false,
      damageToAttacker: 9,
      attackerDies: true,
    });
  });

  it("Zombie 18 HP: the third Yeti hit would leave 2: shatters, and leaves no Grave", () => {
    const state = against("UNDEAD", "GUARD", [
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
    ]);
    const runs = hits(state, [at(4, 3), at(4, 4), at(4, 2)]);
    expect(runs.map((run) => run.combat.damageToDefender)).toEqual([5, 5, 8]);
    const last = runs[2];
    expect(last?.combat.shatters).toBe(true);
    expect(kindsV7(last?.events ?? [])).not.toContain("GRAVE_CREATED");
    expect(last?.state.graves).toEqual([]);
    expect(
      last?.events.find((event) => event.kind === "UNIT_DIED"),
    ).toMatchObject({ cause: "SHATTER" });
  });

  it("Triceratops 20 HP: Mammoth 6, Yeti 5, then the Yeti would leave 3: shatters (two slots are not exempt)", () => {
    const state = against("DINOSAUR", "CATAPULT", [
      { seat: 0, role: "GUARD", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
    ]);
    const runs = hits(state, [at(4, 3), at(4, 4), at(4, 2)]);
    expect(runs.map((run) => run.combat.damageToDefender)).toEqual([6, 5, 9]);
    expect(runs[2]?.combat.shatters).toBe(true);
  });

  it("T-Rex 28 HP: dead on the fifth hit by plain damage; the window was never hit", () => {
    const state = against("DINOSAUR", "KNIGHT", [
      { seat: 0, role: "GUARD", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 0, role: "FIGHTER", at: at(4, 2) },
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "FIGHTER", at: at(6, 2) },
    ]);
    const runs = hits(state, [
      at(4, 3),
      at(4, 4),
      at(4, 2),
      at(5, 2),
      at(6, 2),
    ]);
    expect(runs.map((run) => run.combat.damageToDefender)).toEqual([
      6, 5, 6, 6, 5,
    ]);
    expect(runs.map((run) => run.combat.shatters)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(runs[4]?.combat.defenderDies).toBe(true);
  });

  it("Goblin 6 HP: dead by plain damage; Shatter never happens", () => {
    const state = against("GOBLIN", "FIGHTER", [
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
    ]);
    expect(hits(state, [at(4, 3)])[0]?.combat).toMatchObject({
      defenderDies: true,
      shatters: false,
    });
  });

  it("Grunt 10 HP, Shield 2: Yeti 5 (Shield 2, HP 3), then the second would leave 1: shatters", () => {
    const state = against("MARTIAN", "FIGHTER", [
      { seat: 0, role: "FIGHTER", at: at(4, 3) },
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
    ]);
    const [first, second] = hits(state, [at(4, 3), at(4, 4)]);
    expect(first?.combat).toMatchObject({
      defenderShieldDamage: 2,
      damageToDefender: 3,
      damageToAttacker: 3,
    });
    expect(second?.combat).toMatchObject({
      shatters: true,
      damageToDefender: 7,
    });
  });

  it("Spitter, Knight, Wolf Rider: a Mammoth's 8 would leave 2: shatters at full HP", () => {
    for (const [faction, role] of [
      ["DINOSAUR", "MARKSMAN"],
      ["ORIGINAL", "KNIGHT"],
      ["GOBLIN", "RAIDER"],
    ] as const) {
      const state = against(faction, role, [
        { seat: 0, role: "GUARD", at: at(4, 3) },
      ]);
      expect(hits(state, [at(4, 3)])[0]?.combat, role).toMatchObject({
        shatters: true,
        damageToDefender: 10,
      });
    }
  });

  it("Bomb Chucker and Rocket Cart: shattered at full HP, no bomb goes off, the Yeti advances unhurt", () => {
    for (const role of ["MARKSMAN", "CATAPULT"] as const) {
      const state = against("GOBLIN", role, [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
      ]);
      const [run] = hits(state, [at(4, 3)]);
      expect(run?.combat, role).toMatchObject({
        shatters: true,
        damageToDefender: 8,
        advances: true,
      });
      expect(kindsV7(run?.events ?? []), role).not.toContain(
        "EXPLOSION_RESOLVED",
      );
      expect(unitAtV7(run?.state as GameStateV7, at(5, 3)).hp).toBe(9);
      // Killed by plain damage instead, the Rocket Cart explodes.
      const warm = checkedV7({
        ...against(
          "GOBLIN",
          role,
          [{ seat: 0, role: "FIGHTER", at: at(4, 3) }],
          { hp: 1 },
        ),
        chilled: [],
      });
      expect(kindsV7(hits(warm, [at(4, 3)])[0]?.events ?? [])).toContain(
        "EXPLOSION_RESOLVED",
      );
    }
  });

  it("Guard at 3 HP on a Walled center: the Witch's 2 would leave 1: shatters", () => {
    const walled = walledV7({
      attackerFaction: "ICE_FOLK",
      attackers: [{ role: "CAPTAIN", at: at(8, 7) }],
    });
    const state = withChillV7(
      checkedV7({
        ...walled,
        units: walled.units.map((unit) =>
          unit.at.x === 8 && unit.at.y === 8 ? { ...unit, hp: 3 } : unit,
        ),
      }),
      [{ at: at(8, 8), sluggish: false, turnsLeft: 1 }],
    );
    expect(attackV7(state, at(8, 7), at(8, 8)).combat).toMatchObject({
      shatters: true,
      damageToDefender: 3,
    });
  });

  it("a JUGGERNAUT-role unit at 3 HP never shatters", () => {
    for (const [faction, role] of [
      ["ORIGINAL", "JUGGERNAUT"],
      ["DINOSAUR", "JUGGERNAUT"],
      ["MARTIAN", "JUGGERNAUT"],
    ] as const) {
      const state = against(
        faction,
        role,
        [{ seat: 0, role: "FIGHTER", at: at(4, 3) }],
        { hp: 5 },
      );
      expect(hits(state, [at(4, 3)])[0]?.combat.shatters, faction).toBe(false);
    }
  });
});

describe("Shatter exact points (section 5.5)", () => {
  it("is melee only: a Snow Hunter and a Boulder Yeti shatter at distance 1, not at 2", () => {
    for (const role of ["MARKSMAN", "CATAPULT"] as const) {
      const near = against(
        "DINOSAUR",
        "FIGHTER",
        [{ seat: 0, role, at: at(4, 3) }],
        { hp: 9 },
      );
      expect(hits(near, [at(4, 3)])[0]?.combat.shatters, role).toBe(true);
      const far = against(
        "DINOSAUR",
        "FIGHTER",
        [{ seat: 0, role, at: at(3, 3) }],
        { hp: 9 },
      );
      expect(hits(far, [at(3, 3)])[0]?.combat, role).toMatchObject({
        shatters: false,
      });
    }
  });

  it("a hit that deals no HP damage (all absorbed by a Shield) still shatters a Chilled unit at 1 to 3 HP", () => {
    const state = against(
      "MARTIAN",
      "GUARD",
      [{ seat: 0, role: "CAPTAIN", at: at(4, 3) }],
      { hp: 3, shield: 3 },
    );
    // The Witch's whole hit (3) goes to the Shield: 0 HP damage.
    expect(hits(state, [at(4, 3)])[0]?.combat).toMatchObject({
      shatters: true,
      defenderShieldDamage: 3,
      damageToDefender: 3,
    });
  });

  it("only attacks: an Ice Folk unit's retaliation never shatters", () => {
    // A Chilled Human Fighter at 7 HP attacks a Yeti; the Yeti's
    // retaliation (4 at Defense 1.5, `pulp_wars-7g3.7`) leaves it inside the
    // window but it does not shatter.
    const state = iceFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 7, chill: CHILLED },
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat).toMatchObject({
      shatters: false,
      retaliation: true,
      damageToAttacker: 4,
      attackerDies: false,
    });
    expect(run.attacker?.hp).toBe(3);
  });

  it("the threshold is the attacker's owner's: 3, or 4 with Brittle", () => {
    // A Fighter at 9 HP: a Yeti deals 5 and leaves 4.
    for (const [brittle, shatters] of [
      [false, false],
      [true, true],
    ] as const) {
      const state = against(
        "ORIGINAL",
        "FIGHTER",
        [{ seat: 0, role: "FIGHTER", at: at(4, 3) }],
        { hp: 9 },
        {
          techs: {
            0: brittle
              ? ["DRILL", "FORTIFICATION", "EXPLOSIVES"]
              : ["DRILL", "FORTIFICATION"],
          },
        },
      );
      expect(hits(state, [at(4, 3)])[0]?.combat).toMatchObject({ shatters });
    }
  });

  it("Eggs and embarked units are never shattered", () => {
    const egg = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(3, 6) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["ICE_FOLK", "DINOSAUR"],
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7), hp: 5 }],
      },
    );
    expect(attackV7(egg, at(3, 6), at(2, 7)).combat.shatters).toBe(false);
    // An embarked unit keeps a dormant entry and is never shattered.
    const afloat = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          form: "EMBARKED",
          hp: 6,
          chill: CHILLED,
        },
      ],
      { water: [at(5, 3)] },
    );
    expect(attackV7(afloat, at(4, 3), at(5, 3)).combat.shatters).toBe(false);
  });

  it("credits the kill (and Promotion) to the attacker; a Bitten victim still rises and the attacker does not advance", () => {
    const state = against(
      "ORIGINAL",
      "FIGHTER",
      [{ seat: 0, role: "FIGHTER", at: at(4, 3) }],
      { hp: 8 },
    );
    const [run] = hits(state, [at(4, 3)]);
    expect(run?.attacker?.kills).toBe(1);
    // A Bitten Human Fighter (in a match with an Undead seat).
    const bitten = iceFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 8, chill: CHILLED },
        { seat: 2, role: "GUARD", at: at(9, 1) },
      ],
      { factions: ["ICE_FOLK", "ORIGINAL", "UNDEAD"] },
    );
    const victim = unitAtV7(bitten, at(5, 3));
    const zombie = unitAtV7(bitten, at(9, 1));
    const withBite = checkedV7({
      ...bitten,
      bitten: [
        {
          unitId: victim.id,
          biterPlayerId: seatIdV7(bitten, 2),
          biterUnitId: zombie.id,
        },
      ],
    });
    const rose = attackV7(withBite, at(4, 3), at(5, 3));
    expect(rose.combat).toMatchObject({
      shatters: true,
      defenderBittenRises: true,
      advances: false,
    });
    const kinds = kindsV7(rose.events);
    expect(kinds).toContain("BITTEN_UNIT_RISEN");
    expect(kinds).not.toContain("GRAVE_CREATED");
    expect(
      rose.events.find((event) => event.kind === "UNIT_DIED"),
    ).toMatchObject({
      cause: "SHATTER",
    });
    expect(unitAtV7(rose.state, at(5, 3)).role).toBe("GUARD");
    expect(rose.state.chilled).toEqual([]);
  });

  it("follows the event order of section 8: combat, deaths (Shatter without a Grave), then the advance", () => {
    const state = against(
      "UNDEAD",
      "FIGHTER",
      [{ seat: 0, role: "FIGHTER", at: at(4, 3) }],
      { hp: 7 },
    );
    const [run] = hits(state, [at(4, 3)]);
    expect(kindsV7(run?.events ?? []).slice(0, 3)).toEqual([
      "COMBAT_RESOLVED",
      "UNIT_DIED",
      "UNIT_MOVED",
    ]);
  });

  it("assumeTargetChilled previews the attack as if the target were Chilled", () => {
    const state = iceFieldV7([
      { seat: 0, role: "GUARD", at: at(4, 3) },
      { seat: 1, role: "MARKSMAN", at: at(5, 3) },
    ]);
    const view = viewForV7(state, activeIdV7(state));
    const attacker = unitAtV7(state, at(4, 3)).id;
    const target = unitAtV7(state, at(5, 3)).id;
    expect(queryCombatPreviewV7(view, attacker, target)?.shatters).toBe(false);
    expect(
      queryCombatPreviewV7(view, attacker, target, {
        assumeTargetChilled: true,
      })?.shatters,
    ).toBe(true);
    expect(
      queryCombatPreviewV7(state, activeIdV7(state), attacker, target, {
        assumeTargetChilled: true,
      })?.shatters,
    ).toBe(true);
    // The command itself is unaffected.
    const result = applyCommandV7(state, activeIdV7(state), {
      kind: "ATTACK",
      unitId: attacker,
      targetUnitId: target,
    });
    expect(result.accepted).toBe(true);
  });
});
