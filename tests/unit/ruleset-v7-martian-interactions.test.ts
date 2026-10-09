import { describe, expect, it } from "vitest";
import {
  estimateCombatV7,
  previewAttackExplosionsV7,
  queryThreatenedTilesV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  endTurnUntilV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeViewV7,
  hasUnitAtV7,
  martianFieldV7,
  offeredV7,
  playV7,
  shieldAtV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  forestV7,
  kindsV7,
  movedV7,
  tileV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// The Martian revision, section 10 (docs/product/RULESET_7_MARTIANS.md):
// interactions with the rules of the other factions, and the public queries
// of section 11. Shield absorption of Wail, Kaboom, death blasts, Lich and
// Bomb splash, Plague, Bitten, Infect, Lifesteal, Armoured, and Charge! is in
// ruleset-v7-martian-shields.test.ts; Mind Control and Tractor Beam targets
// are in ruleset-v7-martian-abilities.test.ts.

const coins = (state: GameStateV7, seat: number): number =>
  state.players.find((player) => player.seat === seat)?.coins ?? 0;

describe("Undead rules (section 10.1)", () => {
  it("Graves: a Martian land-form unit leaves one, a flyer included; an embarked machine leaves none", () => {
    for (const [role, form, grave] of [
      ["FIGHTER", "LAND", true],
      ["RAIDER", "LAND", true],
      ["CATAPULT", "EMBARKED", false],
    ] as const) {
      const state = martianFieldV7(
        [
          { seat: 0, role, at: at(4, 3), hp: 1, shield: 0, form },
          // A Banshee: it never advances onto the tile.
          { seat: 1, role: "MARKSMAN", at: at(6, 3) },
        ],
        {
          activeSeat: 1,
          factions: ["MARTIAN", "UNDEAD"],
          water: form === "EMBARKED" ? [at(4, 3)] : [],
        },
      );
      const run = playV7(state, {
        kind: "WAIL",
        unitId: unitAtV7(state, at(6, 3)).id,
      });
      expect(hasUnitAtV7(run.state, at(4, 3)), role).toBe(false);
      expect(
        run.state.graves.some((entry) => sameV7(entry, at(4, 3))),
        role,
      ).toBe(grave);
    }
  });

  it("Unanswered: a Martian unit never retaliates against a Vampire", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(4, 3) },
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
      ],
      { activeSeat: 1, factions: ["MARTIAN", "UNDEAD"] },
    );
    const run = attackV7(state, at(5, 3), at(4, 3));
    expect(run.combat).toMatchObject({
      retaliation: false,
      noRetaliationReason: "UNANSWERED",
      damageToAttacker: 0,
    });
  });

  it("Restless is not a Martian rule: a Martian unit recovers 4 in own territory and 2 elsewhere", () => {
    const state = martianFieldV7([
      { seat: 0, role: "FIGHTER", at: at(8, 7), hp: 3, shield: 0 },
      { seat: 0, role: "FIGHTER", at: at(4, 3), hp: 3, shield: 0 },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const home = playV7(state, {
      kind: "RECOVER",
      unitId: unitAtV7(state, at(8, 7)).id,
    });
    expect(unitAtV7(home.state, at(8, 7)).hp).toBe(7);
    const away = playV7(state, {
      kind: "RECOVER",
      unitId: unitAtV7(state, at(4, 3)).id,
    });
    expect(unitAtV7(away.state, at(4, 3)).hp).toBe(5);
    // Recovery is HP only: the Shield stays spent until a recharge.
    expect(shieldAtV7(home.state, at(8, 7))).toBe(0);
  });
});

describe("Goblin rules (section 10.2)", () => {
  it("Gang Up counts helpers around a Martian target as usual", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "GUARD", at: at(4, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(4, 4) },
      ],
      { activeSeat: 1, factions: ["MARTIAN", "GOBLIN"] },
    );
    expect(attackV7(state, at(5, 3), at(4, 3)).combat.gangUp).toBe(2);
    // No Martian attack has Gang Up.
    const martian = martianFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
      ],
      { factions: ["MARTIAN", "GOBLIN"] },
    );
    expect(attackV7(martian, at(4, 3), at(5, 3)).combat.gangUp).toBe(0);
  });

  // Tuning 2 (`pulp_wars-w49.3`, 7r47): the Grunt has range 2, so it is a
  // ranged unit and stays (it advanced onto the exploder's tile before).
  it("chains: a Grunt and a flyer stay next to the blast and are hit, a ray at range 2 is outside", () => {
    // A Bomb Chucker at 1 HP (death blast 5 around its tile since
    // `pulp_wars-w49.35`, 2 before: a Shield of 2 absorbs 2 and 3 reach HP).
    const build = (role: "FIGHTER" | "RAIDER" | "MARKSMAN", from: CoordV7) =>
      martianFieldV7(
        [
          { seat: 0, role, at: from },
          { seat: 1, role: "MARKSMAN", at: at(5, 3), hp: 1 },
          { seat: 1, role: "FIGHTER", at: at(1, 5) },
        ],
        { factions: ["MARTIAN", "GOBLIN"] },
      );
    // The Grunt stays next to the exploder's tile and is hit there.
    const grunt = attackV7(build("FIGHTER", at(4, 3)), at(4, 3), at(5, 3));
    expect(grunt.attacker?.at).toEqual(at(4, 3));
    expect(kindsV7(grunt.events)).toContain("EXPLOSION_RESOLVED");
    expect(shieldAtV7(grunt.state, at(4, 3))).toBe(0);
    expect(grunt.attacker?.hp).toBe(5);
    // The Saucer does not advance and is still in the blast area.
    const saucer = attackV7(build("RAIDER", at(4, 3)), at(4, 3), at(5, 3));
    expect(saucer.attacker?.at).toEqual(at(4, 3));
    expect(shieldAtV7(saucer.state, at(4, 3))).toBe(0);
    expect(saucer.attacker?.hp).toBe(5);
    // The Ray Gunner at range 2 is outside it.
    const gunner = attackV7(build("MARKSMAN", at(3, 3)), at(3, 3), at(5, 3));
    expect(gunner.combat.advances).toBe(false);
    expect(shieldAtV7(gunner.state, at(3, 3))).toBe(2);
  });

  it("a pierced exploding unit that dies explodes like a splash kill", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 3) },
        { seat: 1, role: "GUARD", at: at(5, 3) },
        { seat: 1, role: "MARKSMAN", at: at(6, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(7, 3) },
      ],
      {
        factions: ["MARTIAN", "GOBLIN"],
        techs: { 0: withoutTechsV7("MARTIAN", "EXPLOSIVES") },
      },
    );
    const preview = previewAttackExplosionsV7(
      activeViewV7(state),
      unitAtV7(state, at(3, 3)).id,
      unitAtV7(state, at(5, 3)).id,
    );
    const run = attackV7(state, at(3, 3), at(5, 3));
    expect(run.combat.splash).toMatchObject([{ at: at(6, 3), dies: true }]);
    expect(kindsV7(run.events)).toContain("EXPLOSION_RESOLVED");
    expect(preview?.explosions).toHaveLength(1);
    // A hostile kill by Pierce is credited to the Tripod.
    expect(run.attacker?.kills).toBe(1);
  });

  it("Plunder: a Goblin seat earns 2 Coins for a Martian unit it kills", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3), hp: 1, shield: 0 },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
      ],
      { activeSeat: 1, factions: ["MARTIAN", "GOBLIN"] },
    );
    const run = attackV7(state, at(5, 3), at(4, 3));
    expect(run.combat.defenderDies).toBe(true);
    expect(kindsV7(run.events)).toContain("PLUNDER_AWARDED");
    expect(coins(run.state, 1)).toBe(coins(state, 1) + 2);
  });
});

describe("Dinosaur rules (section 10.3)", () => {
  it("a hostile Egg is an ordinary target of a ray and never retaliates", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "MARKSMAN", at: at(3, 6) },
        { seat: 1, role: "FIGHTER", at: at(1, 9) },
      ],
      {
        factions: ["MARTIAN", "DINOSAUR"],
        eggs: [{ seat: 1, role: "RAIDER", at: at(2, 7) }],
      },
    );
    const run = attackV7(state, at(3, 6), at(2, 7));
    expect(run.combat).toMatchObject({
      rayPower: "FULL",
      retaliation: false,
      defenderDies: true,
    });
  });

  it("a dinosaur grows from killing a Martian unit; Armoured takes 1 less from a half-power ray and a Pierce hit", () => {
    const growth = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3), hp: 1, shield: 0 },
        { seat: 1, role: "RAIDER", at: at(5, 3) },
      ],
      { activeSeat: 1, factions: ["MARTIAN", "DINOSAUR"] },
    );
    const raptor = unitAtV7(growth, at(5, 3));
    const kill = attackV7(growth, at(5, 3), at(4, 3));
    expect(kill.attacker?.kills).toBe(1);
    expect(kill.attacker?.maxHp).toBeGreaterThan(raptor.maxHp);

    // An Ankylosaurus behind a Raptor, both hit by a half-power Tripod ray.
    const build = (factions: readonly ["MARTIAN", "DINOSAUR" | "ORIGINAL"]) =>
      martianFieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(3, 3), activation: movedV7(1) },
          { seat: 1, role: "GUARD", at: at(5, 3) },
          { seat: 1, role: "GUARD", at: at(6, 3) },
        ],
        { factions, techs: { 0: withoutTechsV7("MARTIAN", "EXPLOSIVES") } },
      );
    const armoured = attackV7(
      build(["MARTIAN", "DINOSAUR"]),
      at(3, 3),
      at(5, 3),
    );
    expect(armoured.combat).toMatchObject({
      rayPower: "HALF",
      defenderArmoured: true,
    });
    const whole = armoured.combat.damageToDefender;
    // The Pierce hit is half of the whole (reduced) hit, minus 1 again.
    expect(armoured.combat.splash).toMatchObject([
      { damage: Math.max(0, Math.max(1, Math.ceil(whole / 2)) - 1) },
    ]);
  });

  it("Acid ignores the cover and the Walls of a Martian foot unit; machines have neither anyway", () => {
    const forest = forestV7(
      martianFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(4, 3) },
          { seat: 1, role: "MARKSMAN", at: at(6, 3) },
        ],
        { activeSeat: 1, factions: ["MARTIAN", "DINOSAUR"] },
      ),
      at(4, 3),
    );
    expect(attackV7(forest, at(6, 3), at(4, 3)).combat).toMatchObject({
      acid: true,
      defenseBonusNumerator: 1,
      defenseBonusDenominator: 1,
      fortificationLevel: 0,
    });
    const walls = walledV7({
      defenderFaction: "MARTIAN",
      defender: "FIGHTER",
      attackers: [{ role: "MARKSMAN", at: at(6, 8) }],
    });
    expect(attackV7(walls, at(6, 8), at(8, 8)).combat).toMatchObject({
      acid: true,
      fortificationLevel: 0,
    });
  });

  it("Charge! and Wallbreaker remove the Walls of a Martian foot unit", () => {
    const state = walledV7({
      defenderFaction: "MARTIAN",
      defender: "GUARD",
      attackers: [{ role: "SWORDSMAN", at: at(7, 8) }],
    });
    const run = attackV7(state, at(7, 8), at(8, 8));
    expect(run.combat).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 2,
    });
    // The Shield absorbs the hit first.
    expect(run.combat.defenderShieldDamage).toBe(3);
  });

  it("Rampage: a T-Rex that kills a Brain keeps rampaging; the unit it controlled is already back", () => {
    const base = martianFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: at(4, 3), hp: 1, shield: 0 },
        // A Caveman of the Dinosaur seat that the Brain controls.
        {
          seat: 1,
          role: "FIGHTER",
          at: at(4, 4),
          controlledBy: at(4, 3),
          hp: 5,
        },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
      ],
      { activeSeat: 1, factions: ["MARTIAN", "DINOSAUR"] },
    );
    const run = attackV7(base, at(5, 3), at(4, 3));
    expect(run.combat).toMatchObject({
      defenderDies: true,
      overrunAdvance: true,
      overrunContinues: true,
    });
    // Released to its owner before the advance (the Mind Control revision).
    expect(unitAtV7(run.state, at(4, 4)).ownerId).toBe(run.attacker?.ownerId);
    expect(run.attacker?.at).toEqual(at(4, 3));
    // It may attack the Grunt next to its new tile.
    expect(
      offeredV7(run.state, "ATTACK").map((command) =>
        command.kind === "ATTACK" ? command.targetUnitId : null,
      ),
    ).toEqual([unitAtV7(run.state, at(3, 3)).id]);
  });
});

describe("Human abilities (section 10.4)", () => {
  it("Field Defense gives a Human defender the ordinary bonus against a Martian attack that is no ray", () => {
    const state = fieldDefenseV7(
      martianFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(4, 7) },
          { seat: 1, role: "GUARD", at: at(3, 7) },
        ],
        { techs: { 0: withoutTechsV7("MARTIAN", "EXPLOSIVES") } },
      ),
      at(3, 7),
    );
    const run = attackV7(state, at(4, 7), at(3, 7));
    expect(run.combat.fortificationLevel).toBe(2);
    // Without Explosives the melee attack does not demolish it.
    expect(tileV7(run.state, at(3, 7)).fieldDefense).toBe(true);
  });

  it("the Disintegrator keeps the melee Field Defense demolition of Explosives", () => {
    const state = fieldDefenseV7(
      martianFieldV7([
        { seat: 0, role: "FIGHTER", at: at(4, 7) },
        // A wounded Guard: the attacker must survive its retaliation.
        { seat: 1, role: "GUARD", at: at(3, 7), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(1, 9) },
      ]),
      at(3, 7),
    );
    const run = attackV7(state, at(4, 7), at(3, 7));
    expect(run.attacker).toBeDefined();
    expect(tileV7(run.state, at(3, 7)).fieldDefense).toBe(false);
    expect(kindsV7(run.events)).toContain("FIELD_DEFENSE_DESTROYED");
  });

  it("Overrun: a Knight that kills a Martian unit advances and may attack again", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(4, 3), hp: 1, shield: 0 },
        { seat: 0, role: "FIGHTER", at: at(3, 3) },
        { seat: 1, role: "KNIGHT", at: at(5, 3) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 3), at(4, 3));
    expect(run.combat).toMatchObject({
      overrunAdvance: true,
      overrunContinues: true,
    });
    expect(run.attacker?.at).toEqual(at(4, 3));
  });

  it("a Catapult out-ranges every ray", () => {
    const state = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 3) },
        { seat: 1, role: "CATAPULT", at: at(6, 3) },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(6, 3), at(3, 3));
    expect(run.combat.retaliation).toBe(false);
    const own = endTurnUntilV7(state, seatIdV7(state, 0)).state;
    expect(offeredV7(own, "ATTACK")).toEqual([]);
  });
});

describe("public queries (section 11)", () => {
  it("an estimate for an attack after a planned Move uses half power", () => {
    const state = martianFieldV7([
      { seat: 0, role: "CATAPULT", at: at(3, 3) },
      { seat: 1, role: "JUGGERNAUT", at: at(5, 3) },
    ]);
    const tripod = unitAtV7(state, at(3, 3)).id;
    const target = unitAtV7(state, at(5, 3)).id;
    expect(estimateCombatV7(state, tripod, target)).toMatchObject({
      rayPower: "FULL",
      attack2: 8,
      coolingApplied: true,
    });
    expect(estimateCombatV7(state, tripod, target, 1)).toMatchObject({
      rayPower: "HALF",
      attack2: 4,
      coolingApplied: false,
    });
    // And equals the resolution after that Move.
    const moved = applyOkV7(state, activeIdV7(state), {
      kind: "MOVE",
      unitId: tripod,
      path: [at(3, 4)],
    }).state;
    expect(attackV7(moved, at(3, 4), at(5, 3)).combat.damageToDefender).toBe(
      estimateCombatV7(state, tripod, target, 1)?.damageToDefender,
    );
  });

  it("threatened tiles: a flyer's flying reach, a walker's striding reach, and range 2 for a ray unit", () => {
    const threatens = (
      state: GameStateV7,
      from: CoordV7,
      where: CoordV7,
      viewerSeat = 1,
    ) =>
      queryThreatenedTilesV7(
        state,
        unitAtV7(state, from).id,
        seatIdV7(state, viewerSeat),
      ).some((tile) => sameV7(tile, where));
    // A Saucer (Move 3, range 1) behind a line of its own and hostile units.
    const saucer = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(2, 3) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(6, 3) },
    ]);
    // It flies over both to (5, 3) and threatens (6, 3) from there.
    expect(threatens(saucer, at(2, 3), at(6, 3))).toBe(true);
    // A Tripod (Move 2, range 2) across a Mountain without Engineering.
    const base = martianFieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(2, 3) },
        { seat: 1, role: "FIGHTER", at: at(9, 1) },
      ],
      { techs: { 0: withoutTechsV7("MARTIAN", "ENGINEERING") } },
    );
    const tripod = checkedV7({
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          tile.at.x === 3 && tile.at.y >= 1 && tile.at.y <= 5
            ? {
                ...tile,
                terrain: "MOUNTAIN" as const,
                biome: "HIGHLANDS" as const,
              }
            : tile,
        ),
      },
    });
    expect(threatens(tripod, at(2, 3), at(6, 3), 0)).toBe(true);
    expect(threatens(tripod, at(2, 3), at(7, 3), 0)).toBe(false);
    expect(threatens(tripod, at(2, 3), at(6, 3), 1)).toBe(true);
    // A Grunt in the same place does not cross the Mountains (its owner's
    // view knows it has no Engineering). `pulp_wars-b5f.2`: its ray pistol
    // (range 2) still shoots over the ridge to (4, 3), not to (5, 3).
    const grunt = checkedV7({
      ...tripod,
      units: tripod.units.map((unit) =>
        sameV7(unit.at, at(2, 3))
          ? { ...unit, role: "FIGHTER" as const, hp: 8, maxHp: 8 }
          : unit,
      ),
    });
    expect(threatens(grunt, at(2, 3), at(4, 3), 0)).toBe(true);
    expect(threatens(grunt, at(2, 3), at(5, 3), 0)).toBe(false);
    // Mind Control and the Tractor Beam add no threatened tile: a Brain
    // (Move 1, range 1) threatens distance 2 at most.
    const brain = martianFieldV7([
      { seat: 0, role: "CAPTAIN", at: at(2, 3) },
      { seat: 1, role: "FIGHTER", at: at(9, 1) },
    ]);
    expect(threatens(brain, at(2, 3), at(4, 3))).toBe(true);
    expect(threatens(brain, at(2, 3), at(5, 3))).toBe(false);
  });
});
