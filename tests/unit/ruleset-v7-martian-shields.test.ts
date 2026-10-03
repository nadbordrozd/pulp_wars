import { describe, expect, it } from "vitest";
import {
  FORCE_FIELD_SHIELD_V7,
  absorbHitV7,
  applyCommandV7,
  parseGameStateV7,
  previewKaboomV7,
  previewWailV7,
  projectEventsV7,
  viewForV7,
  type DomainEventV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  martianFieldV7,
  playV7,
  shieldAtV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  moveV7,
  movedV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian revision, section 5 (docs/product/RULESET_7_MARTIANS.md):
// Shields. Every instance of damage is taken from the Shield first; the
// Shield recharges at its owner's Start Turn, to 4 next to a Shield
// Projector, and again at End Turn with Force Fields.

const recharges = (events: readonly DomainEventV7[]) =>
  events.filter((event) => event.kind === "SHIELDS_RECHARGED");

describe("Martian Shields: absorption (section 5.3)", () => {
  it("takes one instance of damage from the Shield first, capped at Shield plus HP", () => {
    expect(absorbHitV7(2, 10, 5)).toEqual({ shieldDamage: 2, hpDamage: 3 });
    expect(absorbHitV7(4, 10, 3)).toEqual({ shieldDamage: 3, hpDamage: 0 });
    expect(absorbHitV7(0, 10, 6)).toEqual({ shieldDamage: 0, hpDamage: 6 });
    expect(absorbHitV7(2, 4, 13)).toEqual({ shieldDamage: 2, hpDamage: 4 });
    expect(absorbHitV7(2, 10, 0)).toEqual({ shieldDamage: 0, hpDamage: 0 });
  });

  it("Fighter attacks a Grunt: hit 5, Shield 2, HP 3, and takes 3 back; the next Fighter deals 6 HP", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
      ],
      { activeSeat: 1 },
    );
    const first = attackV7(state, at(5, 3), at(5, 2));
    expect(first.combat).toMatchObject({
      damageToDefender: 3,
      defenderShieldDamage: 2,
      damageToAttacker: 3,
      attackerShieldDamage: 0,
      rayPower: "NONE",
      coolingApplied: false,
    });
    expect(first.target?.hp).toBe(7);
    expect(shieldAtV7(first.state, at(5, 2))).toBe(0);
    expect(first.state.shields).toEqual([]);
    // The Shield does not recharge between attacks of one turn.
    const second = attackV7(first.state, at(4, 3), at(5, 2));
    expect(second.combat).toMatchObject({
      damageToDefender: 6,
      defenderShieldDamage: 0,
    });
    expect(second.target?.hp).toBe(1);
  });

  it("Guard attacks a Grunt: hit 3, Shield 2, HP 1", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat).toMatchObject({
      damageToDefender: 1,
      defenderShieldDamage: 2,
    });
    expect(shieldAtV7(run.state, at(5, 2))).toBe(0);
  });

  it("Fighter attacks a Mothership (16 HP, Shield 4): hit 5, Shield 4, HP 1", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat).toMatchObject({
      damageToDefender: 1,
      defenderShieldDamage: 4,
    });
    expect(run.target?.hp).toBe(15);
  });

  it("the retaliation a Grunt takes as an attacker is absorbed too", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
    ]);
    const run = attackV7(state, at(5, 2), at(5, 3));
    // The Grunt (Attack 1.5 since `pulp_wars-b5f.2`, was 2 and 5) deals 3;
    // the Fighter retaliates for 5.
    expect(run.combat).toMatchObject({
      damageToDefender: 3,
      defenderShieldDamage: 0,
      damageToAttacker: 3,
      attackerShieldDamage: 2,
      retaliation: true,
    });
    expect(run.attacker?.hp).toBe(7);
    // It meets the enemy turn with Shield 0.
    expect(shieldAtV7(run.state, at(5, 2))).toBe(0);
  });

  it("a hit the Shield absorbs completely costs no HP and still pushes (Charge!)", () => {
    // A Triceratops at 1 of 20 HP hits an embarked Mothership for 3.
    const state = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 3), form: "EMBARKED" },
        { seat: 1, role: "CATAPULT", at: at(5, 5), hp: 1 },
      ],
      {
        factions: ["MARTIAN", "DINOSAUR"],
        activeSeat: 1,
        water: [at(5, 3), at(5, 2)],
      },
    );
    const moved = moveV7(state, at(5, 5), [at(5, 4)]).state;
    const run = attackV7(moved, at(5, 4), at(5, 3));
    expect(run.combat).toMatchObject({
      damageToDefender: 0,
      defenderShieldDamage: 3,
      retaliation: false,
      push: "WILL_PUSH",
    });
    // The push happens whatever the Shield absorbed.
    expect(run.target).toMatchObject({ at: at(5, 2), hp: 16 });
    expect(shieldAtV7(run.state, at(5, 2))).toBe(1);
    expect(run.events.map((event) => event.kind)).toContain("UNIT_PUSHED");
  });

  it("Triceratops with a run-up of 2 on a Mothership: 16, Shield 4, HP 12, then the push and the follow", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 2) },
        { seat: 1, role: "CATAPULT", at: at(5, 5) },
      ],
      { factions: ["MARTIAN", "DINOSAUR"], activeSeat: 1 },
    );
    const moved = moveV7(state, at(5, 5), [at(5, 4), at(5, 3)]).state;
    const run = attackV7(moved, at(5, 3), at(5, 2));
    expect(run.combat).toMatchObject({
      damageToDefender: 12,
      defenderShieldDamage: 4,
      damageToAttacker: 3,
      push: "WILL_PUSH",
      advances: true,
    });
    expect(run.target).toMatchObject({ at: at(5, 1), hp: 4 });
    expect(run.attacker?.at).toEqual(at(5, 2));
  });
});

describe("Martian Shields: other factions' damage (sections 5.3 and 10)", () => {
  it("Banshee Wail on a Grunt: 2 absorbed, 0 HP; the Wail strips every Shield in its radius", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "KNIGHT", at: at(6, 3) },
        { seat: 1, role: "MARKSMAN", at: at(5, 4) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const banshee = unitAtV7(state, at(5, 4));
    const preview = previewWailV7(activeViewV7(state), banshee.id);
    const result = playV7(state, { kind: "WAIL", unitId: banshee.id });
    const wail = result.events.find((event) => event.kind === "WAIL_RESOLVED");
    if (wail?.kind !== "WAIL_RESOLVED") throw new Error("no wail");
    expect(wail.results).toEqual([
      {
        unitId: unitAtV7(state, at(5, 2)).id,
        at: at(5, 2),
        damage: 0,
        dies: false,
        shieldDamage: 2,
      },
      {
        unitId: unitAtV7(state, at(6, 3)).id,
        at: at(6, 3),
        damage: 0,
        dies: false,
        shieldDamage: 2,
      },
    ]);
    expect(preview?.targets.map((target) => target.shieldDamage)).toEqual([
      2, 2,
    ]);
    expect(preview?.targets.map((target) => target.damage)).toEqual([0, 0]);
    expect(shieldAtV7(result.state, at(5, 2))).toBe(0);
    expect(shieldAtV7(result.state, at(6, 3))).toBe(2);
    expect(unitAtV7(result.state, at(5, 2)).hp).toBe(10);
  });

  it("Goblin Kaboom (5) on a Grunt: Shield 2, HP 3; a second deals 5, a third kills", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 3) },
      ],
      { factions: ["MARTIAN", "GOBLIN"], activeSeat: 1 },
    );
    const kaboom = (current: GameStateV7, where: { x: number; y: number }) => {
      const unit = unitAtV7(current, where);
      const preview = previewKaboomV7(activeViewV7(current), unit.id);
      const result = playV7(current, { kind: "KABOOM", unitId: unit.id });
      const blast = result.events.find(
        (event) => event.kind === "EXPLOSION_RESOLVED",
      );
      if (blast?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
      const grunt = blast.results.find((entry) => entry.at.y === 2);
      expect(
        preview?.explosions[0]?.results.find((entry) => entry.at.y === 2),
      ).toMatchObject({
        damage: grunt?.damage,
        shieldDamage: grunt?.shieldDamage,
        dies: grunt?.dies,
      });
      return { state: result.state, grunt };
    };
    const first = kaboom(state, at(5, 3));
    expect(first.grunt).toMatchObject({ damage: 3, shieldDamage: 2 });
    const second = kaboom(first.state, at(4, 3));
    expect(second.grunt).toMatchObject({ damage: 5, shieldDamage: 0 });
    const third = kaboom(second.state, at(6, 3));
    expect(third.grunt).toMatchObject({ damage: 2, dies: true });
  });

  it("a death blast of 2 is absorbed by a full Shield, and a chain strips a Shield once", () => {
    // A Grunt kills a Bomb Chucker (death blast 2) next to another Grunt.
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 1, role: "MARKSMAN", at: at(5, 3), hp: 1 },
      ],
      { factions: ["MARTIAN", "GOBLIN"] },
    );
    const run = attackV7(state, at(5, 2), at(5, 3));
    const blast = run.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    if (blast?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
    // The attacker advanced onto the tile and is in the blast area, with
    // its full Shield (the kill drew no retaliation).
    expect(blast.results).toEqual([
      {
        unitId: unitAtV7(state, at(6, 2)).id,
        at: at(6, 2),
        damage: 0,
        dies: false,
        shieldDamage: 2,
      },
      {
        unitId: unitAtV7(state, at(5, 2)).id,
        at: at(5, 3),
        damage: 0,
        dies: false,
        shieldDamage: 2,
      },
    ]);
    expect(run.state.shields).toEqual([]);
    expect(run.state.units.every((unit) => unit.hp === unit.maxHp)).toBe(true);
  });

  it("Zombie attacks a Grunt: HP was lost, so it is Bitten, in a Force Field too", () => {
    const bare = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(bare, at(5, 3), at(5, 2));
    expect(run.combat).toMatchObject({
      damageToDefender: 3,
      defenderShieldDamage: 2,
      defenderBitten: true,
    });
    expect(run.state.bitten).toHaveLength(1);
    const field = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), shield: 4 },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const covered = attackV7(field, at(5, 3), at(5, 2));
    expect(covered.combat).toMatchObject({
      damageToDefender: 1,
      defenderShieldDamage: 4,
      defenderBitten: true,
    });
  });

  it("a Zombie bites only a unit that lost HP to its hit", () => {
    // A Zombie at 3 of 18 HP hits a Mothership for less than its Shield.
    const state = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3), hp: 3 },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat.damageToDefender).toBe(0);
    expect(run.combat.defenderShieldDamage).toBeGreaterThan(0);
    expect(run.combat.defenderBitten).toBe(false);
    expect(run.state.bitten).toEqual([]);
  });

  it("Infect needs a kill: a Grunt killed by a Zombie rises as an ordinary Zombie without a Shield", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 2, shield: 0 },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat.defenderInfected).toBe(true);
    const rising = unitAtV7(run.state, at(5, 2));
    expect(rising).toMatchObject({
      role: "GUARD",
      ownerId: seatIdV7(state, 1),
      hp: 10,
      maxHp: 18,
    });
    expect(run.state.shields).toEqual([]);
  });

  it("Vampire at 4 of 10 HP attacks a Grunt: hit 6, HP 4, and it heals 4, not 6", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "KNIGHT", at: at(5, 3), hp: 4 },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat).toMatchObject({
      damageToDefender: 4,
      defenderShieldDamage: 2,
      attackerHeal: 4,
      retaliation: false,
    });
    expect(run.attacker?.hp).toBe(8);
  });

  it("Lich attacks a Grunt next to another Grunt: 9 on the target, splash 5 from the whole hit, Plague on both", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 1, role: "CATAPULT", at: at(5, 4) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 4), at(5, 2));
    expect(run.combat).toMatchObject({
      damageToDefender: 7,
      defenderShieldDamage: 2,
    });
    expect(run.combat.splash).toEqual([
      {
        unitId: unitAtV7(state, at(6, 2)).id,
        at: at(6, 2),
        damage: 3,
        dies: false,
        shieldDamage: 2,
      },
    ]);
    expect(run.combat.plagued).toEqual([
      unitAtV7(state, at(5, 2)).id,
      unitAtV7(state, at(6, 2)).id,
    ]);
  });

  it("a Lich plagues only targets that lost HP", () => {
    // A Lich at 1 of 10 HP: its hit and its splash are absorbed completely
    // by a Mothership and a covered Grunt.
    const state = martianFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 2), shield: 4 },
        { seat: 1, role: "CATAPULT", at: at(5, 4), hp: 1 },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 4), at(5, 2));
    expect(run.combat.damageToDefender).toBe(0);
    expect(run.combat.defenderShieldDamage).toBeGreaterThan(0);
    expect(run.combat.splash[0]).toMatchObject({ damage: 0 });
    expect(run.combat.splash[0]?.shieldDamage).toBeGreaterThan(0);
    expect(run.combat.plagued).toEqual([]);
    expect(run.state.plagued).toEqual([]);
  });

  it("Plague bypasses the Shield and spreads whatever the Shields are", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(6, 2) },
        { seat: 1, role: "CATAPULT", at: at(1, 1) },
        { seat: 1, role: "FIGHTER", at: at(9, 1) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1 },
    );
    const plagued = checkedV7({
      ...base,
      plagued: [
        {
          unitId: unitAtV7(base, at(5, 2)).id,
          sourceUnitId: unitAtV7(base, at(1, 1)).id,
          turnsRemaining: 3,
        },
      ],
    });
    const started = endTurnUntilV7(plagued, seatIdV7(plagued, 0));
    const damage = started.events.find(
      (event) => event.kind === "PLAGUE_DAMAGED",
    );
    if (damage?.kind !== "PLAGUE_DAMAGED") throw new Error("no plague");
    // The Plague entry keeps the pre-Martian shape (no `shieldDamage`).
    expect(damage.results).toEqual([
      {
        unitId: unitAtV7(base, at(5, 2)).id,
        at: at(5, 2),
        damage: 2,
        dies: false,
      },
    ]);
    expect(unitAtV7(started.state, at(5, 2)).hp).toBe(8);
    expect(shieldAtV7(started.state, at(5, 2))).toBe(2);
    // The spread ignores the neighbour's full Shield.
    expect(started.state.plagued.map((entry) => entry.unitId)).toEqual([
      unitAtV7(base, at(5, 2)).id,
      unitAtV7(base, at(6, 2)).id,
    ]);
    expect(unitAtV7(started.state, at(6, 2)).hp).toBe(10);
  });

  it("Bomb splash is computed from the whole hit and each victim's Shield absorbs its share", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "KNIGHT", at: at(6, 2) },
        { seat: 1, role: "MARKSMAN", at: at(5, 4) },
      ],
      { factions: ["MARTIAN", "GOBLIN"], activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 4), at(5, 2));
    const whole = run.combat.damageToDefender + run.combat.defenderShieldDamage;
    expect(run.combat.defenderShieldDamage).toBe(2);
    const share = Math.max(1, Math.ceil(whole / 2));
    expect(run.combat.splash).toEqual([
      {
        unitId: unitAtV7(state, at(6, 2)).id,
        at: at(6, 2),
        damage: Math.max(0, share - 4),
        dies: false,
        shieldDamage: Math.min(4, share),
      },
    ]);
  });

  it("an Armoured hit is reduced before a Shield would absorb it", () => {
    // No Martian unit is Armoured; an Ankylosaurus takes 1 less from a
    // Grunt's hit, and the Grunt's Shield absorbs the retaliation.
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["MARTIAN", "DINOSAUR"] },
    );
    const run = attackV7(state, at(5, 2), at(5, 3));
    expect(run.combat.defenderArmoured).toBe(true);
    expect(run.combat.defenderShieldDamage).toBe(0);
    expect(run.combat.attackerShieldDamage).toBe(2);
    expect(run.combat.attackerArmoured).toBe(false);
  });

  it("an embarked Martian unit keeps its Shield and the Shield absorbs first", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), form: "EMBARKED" },
        { seat: 1, role: "MARKSMAN", at: at(5, 4) },
      ],
      { activeSeat: 1, water: [at(5, 2)] },
    );
    const run = attackV7(state, at(5, 4), at(5, 2));
    expect(run.combat.defense2).toBe(2);
    expect(run.combat.defenderShieldDamage).toBe(2);
    expect(run.combat.damageToDefender).toBe(4);
    expect(shieldAtV7(run.state, at(5, 2))).toBe(0);
  });
});

describe("Martian Shields: recharge (sections 5.2, 5.4, and 5.5)", () => {
  const spent = (extra: Parameters<typeof martianFieldV7>[0] = []) =>
    martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), shield: 0 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
        ...extra,
      ],
      { techs: { 0: withoutTechsV7("MARTIAN", "FORTIFICATION") } },
    );

  it("sets every shielded unit to its maximum at its owner's Start Turn, before Plague, and not before", () => {
    const state = spent();
    const ended = applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
    // No Force Fields: nothing at End Turn.
    expect(recharges(ended.events)).toEqual([]);
    expect(shieldAtV7(ended.state, at(5, 2))).toBe(0);
    const started = endTurnUntilV7(ended.state, seatIdV7(state, 0));
    expect(recharges(started.events)).toEqual([
      {
        kind: "SHIELDS_RECHARGED",
        playerId: seatIdV7(state, 0),
        results: [{ unitId: unitAtV7(state, at(5, 2)).id, shield: 2 }],
      },
    ]);
    const kinds = started.events.map((event) => event.kind);
    expect(kinds.indexOf("SHIELDS_RECHARGED")).toBe(
      kinds.lastIndexOf("TURN_STARTED") + 1,
    );
    // The recharge is not healing.
    expect(unitAtV7(started.state, at(5, 2)).hp).toBe(10);
  });

  it("emits no event when nothing changed", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const round = endTurnUntilV7(
      applyOkV7(state, activeIdV7(state), { kind: "END_TURN" }).state,
      seatIdV7(state, 0),
    );
    expect(recharges(round.events)).toEqual([]);
  });

  it("recharges an embarked unit and runs before Plague", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), form: "EMBARKED", shield: 0 },
        { seat: 0, role: "FIGHTER", at: at(6, 3), shield: 0, hp: 2 },
        { seat: 1, role: "CATAPULT", at: at(1, 1) },
      ],
      { factions: ["MARTIAN", "UNDEAD"], activeSeat: 1, water: [at(5, 2)] },
    );
    const plagued = checkedV7({
      ...base,
      plagued: [
        {
          unitId: unitAtV7(base, at(6, 3)).id,
          sourceUnitId: unitAtV7(base, at(1, 1)).id,
          turnsRemaining: 3,
        },
      ],
    });
    const started = endTurnUntilV7(plagued, seatIdV7(plagued, 0));
    const kinds = started.events.map((event) => event.kind);
    expect(kinds.indexOf("SHIELDS_RECHARGED")).toBeLessThan(
      kinds.indexOf("PLAGUE_DAMAGED"),
    );
    // The plagued Grunt was recharged and then died of Plague.
    expect(recharges(started.events)[0]).toMatchObject({
      results: [
        { unitId: unitAtV7(base, at(5, 2)).id, shield: 2 },
        { unitId: unitAtV7(base, at(6, 3)).id, shield: 2 },
      ],
    });
    expect(shieldAtV7(started.state, at(5, 2))).toBe(2);
    expect(started.state.shields).toHaveLength(1);
  });

  it("Force Field: a covered unit recharges to 4; a Projector needs another Projector; not cumulative", () => {
    const state = martianFieldV7(
      [
        // Covered by the Projector on (5, 3).
        { seat: 0, role: "FIGHTER", at: at(5, 2), shield: 0 },
        { seat: 0, role: "RAIDER", at: at(4, 2), shield: 0 },
        { seat: 0, role: "MARKSMAN", at: at(6, 2), shield: 0 },
        { seat: 0, role: "CAPTAIN", at: at(4, 3), shield: 0 },
        { seat: 0, role: "CATAPULT", at: at(6, 3), shield: 0 },
        { seat: 0, role: "KNIGHT", at: at(4, 4), shield: 0 },
        { seat: 0, role: "JUGGERNAUT", at: at(6, 4), shield: 0 },
        { seat: 0, role: "GUARD", at: at(5, 3), shield: 0 },
        // Two tiles away: not covered.
        { seat: 0, role: "FIGHTER", at: at(8, 2), shield: 0 },
        // A second Projector covers the first; next to both: still 4.
        { seat: 0, role: "GUARD", at: at(5, 4), shield: 0 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1 },
    );
    const started = endTurnUntilV7(state, seatIdV7(state, 0));
    const expected: [number, number, number][] = [
      [5, 2, 4],
      [4, 2, 4],
      [6, 2, 4],
      [4, 3, 4],
      [6, 3, 4],
      [4, 4, 4],
      [6, 4, 4],
      [5, 3, 4],
      [8, 2, 2],
      [5, 4, 4],
    ];
    for (const [x, y, shield] of expected)
      expect(shieldAtV7(started.state, at(x, y)), `${x},${y}`).toBe(shield);
    expect(FORCE_FIELD_SHIELD_V7).toBe(4);
    // No Shield in the game exceeds 4.
    expect(
      Math.max(...started.state.shields.map((entry) => entry.shield)),
    ).toBe(4);
  });

  it("a lone Shield Projector and a lone Colossus recharge to their own 3", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(5, 3), shield: 0 },
        { seat: 0, role: "JUGGERNAUT", at: at(8, 2), shield: 0 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1 },
    );
    const started = endTurnUntilV7(state, seatIdV7(state, 0));
    expect(shieldAtV7(started.state, at(5, 3))).toBe(3);
    expect(shieldAtV7(started.state, at(8, 2))).toBe(3);
  });

  it("is read at the recharge only, from a land-form Projector, and covers an embarked unit", () => {
    const state = martianFieldV7(
      [
        // An embarked Projector projects no field.
        { seat: 0, role: "GUARD", at: at(5, 3), form: "EMBARKED" },
        { seat: 0, role: "FIGHTER", at: at(5, 2), shield: 0 },
        // An embarked Grunt next to a land-form Projector is covered.
        { seat: 0, role: "GUARD", at: at(8, 3) },
        { seat: 0, role: "FIGHTER", at: at(8, 2), form: "EMBARKED", shield: 0 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1, water: [at(5, 3), at(8, 2)] },
    );
    const started = endTurnUntilV7(state, seatIdV7(state, 0));
    expect(shieldAtV7(started.state, at(5, 2))).toBe(2);
    expect(shieldAtV7(started.state, at(8, 2))).toBe(4);
    // Walking away keeps the Shield already granted until the next recharge.
    const walked = moveV7(started.state, at(8, 3), [at(8, 4)]).state;
    expect(shieldAtV7(walked, at(8, 2))).toBe(4);
    // The seat has Force Fields: its End Turn recharge reads the positions
    // at that moment. Now two tiles from the Projector, the Grunt is SET
    // back to its own maximum.
    const ended = applyOkV7(walked, activeIdV7(walked), { kind: "END_TURN" });
    expect(shieldAtV7(ended.state, at(8, 2))).toBe(2);
    expect(recharges(ended.events)).toEqual([
      {
        kind: "SHIELDS_RECHARGED",
        playerId: seatIdV7(state, 0),
        results: [{ unitId: unitAtV7(state, at(8, 2)).id, shield: 2 }],
      },
    ]);
  });

  it("a Thrall and a boat have no Shield and gain nothing from a Force Field", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), thrallOf: at(4, 2), hp: 5 },
        { seat: 0, role: "GUARD", at: at(5, 3) },
        { seat: 0, role: "PATROL_BOAT", at: at(6, 3), form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1, water: [at(6, 3)] },
    );
    const started = endTurnUntilV7(state, seatIdV7(state, 0));
    expect(shieldAtV7(started.state, at(5, 2))).toBe(0);
    expect(shieldAtV7(started.state, at(6, 3))).toBe(0);
    expect(shieldAtV7(started.state, at(4, 2))).toBe(4);
  });

  it("Force Fields: a second recharge at End Turn after the Cooling step, with the positions at that moment", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "GUARD", at: at(7, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 3) },
    ]);
    // The Grunt spends its Shield on the Fighter's retaliation.
    const fought = attackV7(state, at(5, 2), at(5, 3));
    expect(shieldAtV7(fought.state, at(5, 2))).toBe(0);
    // The Projector ends its turn next to the Grunt.
    const moved = moveV7(fought.state, at(7, 3), [at(6, 3)]).state;
    const ended = applyOkV7(moved, activeIdV7(moved), { kind: "END_TURN" });
    const kinds = ended.events.map((event) => event.kind);
    expect(kinds.indexOf("SHIELDS_RECHARGED")).toBeLessThan(
      kinds.indexOf("INCOME_PREVIEWED"),
    );
    expect(recharges(ended.events)).toEqual([
      {
        kind: "SHIELDS_RECHARGED",
        playerId: seatIdV7(state, 0),
        results: [{ unitId: unitAtV7(state, at(5, 2)).id, shield: 4 }],
      },
    ]);
    // Covered during the enemy turn.
    expect(shieldAtV7(ended.state, at(5, 2))).toBe(4);
    expect(unitAtV7(ended.state, at(5, 2)).hp).toBe(7);
  });
});

describe("Martian Shields: creation, view, projection, and parsing (sections 5.1 and 10.8)", () => {
  it("lists a visible unit's Shield in the view and hides an unseen unit's", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 0, role: "KNIGHT", at: at(9, 1) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const hidden = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.seat === 1
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => !(where.x === 9 && where.y === 1),
              ),
            }
          : player,
      ),
    });
    const own = viewForV7(hidden, seatIdV7(hidden, 0));
    expect(own.shields).toEqual(hidden.shields);
    const other = viewForV7(hidden, seatIdV7(hidden, 1));
    expect(other.shields).toEqual([
      { unitId: unitAtV7(state, at(5, 2)).id, shield: 2 },
    ]);
  });

  it("projects SHIELDS_RECHARGED to its owner in full and to others for the units they see", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2), shield: 0 },
        { seat: 0, role: "KNIGHT", at: at(9, 1), shield: 0 },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1 },
    );
    const hidden = checkedV7({
      ...state,
      players: state.players.map((player) =>
        player.seat === 1
          ? {
              ...player,
              explored: player.explored.filter(
                (where) => !(where.x === 9 && where.y === 1),
              ),
            }
          : player,
      ),
    });
    const result = applyOkV7(hidden, activeIdV7(hidden), { kind: "END_TURN" });
    const owner = projectEventsV7(
      hidden,
      result.state,
      seatIdV7(hidden, 0),
      result.events,
    ).events.filter((event) => event.kind === "SHIELDS_RECHARGED");
    expect(owner).toHaveLength(1);
    expect(owner[0]).toMatchObject({
      results: [{ shield: 2 }, { shield: 4 }],
    });
    const other = projectEventsV7(
      hidden,
      result.state,
      seatIdV7(hidden, 1),
      result.events,
    ).events.filter((event) => event.kind === "SHIELDS_RECHARGED");
    expect(other).toEqual([
      {
        kind: "SHIELDS_RECHARGED",
        playerId: seatIdV7(hidden, 0),
        results: [{ unitId: unitAtV7(state, at(5, 2)).id, shield: 2 }],
      },
    ]);
  });

  it("rejects a malformed Shield list", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 0, role: "GUARD", at: at(7, 2) },
        { seat: 0, role: "CAPTAIN", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(4, 5), thrallOf: at(4, 4), hp: 4 },
        { seat: 0, role: "PATROL_BOAT", at: at(9, 2), form: "NAVAL" },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { water: [at(9, 2)] },
    );
    const grunt = unitAtV7(state, at(5, 2)).id;
    const projector = unitAtV7(state, at(7, 2)).id;
    const withShields = (shields: unknown): unknown => ({ ...state, shields });
    expect(parseGameStateV7(state)).not.toBeNull();
    const bad: unknown[] = [
      // An entry without a living unit.
      [{ unitId: 9999, shield: 1 }],
      // Duplicate and unsorted entries.
      [
        { unitId: grunt, shield: 2 },
        { unitId: grunt, shield: 2 },
      ],
      [
        { unitId: projector, shield: 3 },
        { unitId: grunt, shield: 2 },
      ],
      // Not an integer from 1 to max(maximum, 4).
      [{ unitId: grunt, shield: 0 }],
      [{ unitId: grunt, shield: 1.5 }],
      [{ unitId: grunt, shield: 5 }],
      [{ unitId: projector, shield: 5 }],
      // A unit whose Shield maximum is 0: a Human unit, a Thrall, a boat.
      [{ unitId: unitAtV7(state, at(1, 1)).id, shield: 1 }],
      [{ unitId: unitAtV7(state, at(4, 5)).id, shield: 1 }],
      [{ unitId: unitAtV7(state, at(9, 2)).id, shield: 1 }],
      // Extra keys.
      [{ unitId: grunt, shield: 2, extra: true }],
      "none",
    ];
    for (const shields of bad)
      expect(
        parseGameStateV7(withShields(shields)),
        JSON.stringify(shields),
      ).toBeNull();
    // Up to 4 is legal for a Grunt (a Force Field).
    expect(
      parseGameStateV7(withShields([{ unitId: grunt, shield: 4 }])),
    ).not.toBeNull();
    // A state without the list is rejected.
    const { shields: _shields, ...without } = state;
    void _shields;
    expect(parseGameStateV7(without)).toBeNull();
  });

  it("rejects any Shield entry in a match without a Martian seat", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DINOSAUR"] },
    );
    expect(state.shields).toEqual([]);
    for (const unit of state.units)
      expect(
        parseGameStateV7({
          ...state,
          shields: [{ unitId: unit.id, shield: 1 }],
        }),
      ).toBeNull();
    const result = applyCommandV7(state, activeIdV7(state), {
      kind: "END_TURN",
    });
    expect(result.accepted && result.state.shields).toEqual([]);
  });
});

describe("Martian Shields: movement between turns", () => {
  it("a moved Grunt keeps its Shield (moving is not damage)", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(
      shieldAtV7(moveV7(state, at(5, 2), [at(5, 3)]).state, at(5, 3)),
    ).toBe(2);
    void movedV7;
  });
});
