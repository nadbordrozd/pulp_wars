import { describe, expect, it } from "vitest";
import {
  CITY_REWARD_COINS_V7,
  FACTION_IDS_V7,
  LAND_TRADE_INCOME_COINS_V7,
  MONUMENT_POPULATION_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  TREASURE_TIER_3_UNIT_FIRST_ROUND_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  landGrantCostV7,
  nextBounded,
  queryCombatPreviewV7,
  parseEventV7,
  parseGameStateV7,
  previewEconomicV7,
  previewMonumentV7,
  queryLandGrantPreviewV7,
  queryPlayerCommandsV7,
  queryTechnologyTreeV7,
  rewardCandidatesForLevelV7,
  roleMechanicsV7,
  spatialContributionAtV7,
  technologyCapabilitiesV7,
  technologyResearchCostV7,
  treasureUnitRoleForRoundV7,
  unitRoleRuleV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type EconomyGraphV7,
  type FactionIdV7,
  type GameStateV7,
  type ImprovementIdV7,
  type TechnologyIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { technologyEffectGroupsV7 } from "../../src/render/dom/app-view-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7, rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import { acceptV7, navalUnitAtV7, seatV7 } from "../fixtures/v7-naval-branch";
import {
  at,
  attackV7,
  fieldDefenseV7,
  fieldV7,
  forestV7,
  mountainV7,
  patchTileV7,
  tileV7,
  unexploreV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

/**
 * Tuning 1 (`pulp_wars-w49.3`, `pulp-wars-poc-7r47`;
 * docs/product/RULESET_7_TUNING_1.md): the Human tech tree and economy
 * changes that followed the five hand-played games. One block per decision
 * A to G of that document.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8)
 * with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
 * y 7-9; villages (5, 5), (8, 5), (5, 8).
 */

const NO_EXPLOSIVES = withoutTechsV7("ORIGINAL", "EXPLOSIVES");

/** `roundHalfUp(force share * defense * 4.5)` with the base Defense. */
function baseRetaliation(
  attacker: { attack2: number; hp: number; maxHp: number },
  defender: { defense2: number; hp: number; maxHp: number },
): number {
  const defense =
    BigInt(defender.defense2) * BigInt(defender.hp) * BigInt(attacker.maxHp);
  const attack =
    BigInt(attacker.attack2) * BigInt(attacker.hp) * BigInt(defender.maxHp);
  const numerator = defense * BigInt(defender.defense2) * 9n;
  const denominator = (attack + defense) * 4n;
  return Number((2n * numerator + denominator) / (2n * denominator));
}

const rule = (role: UnitStateV7["role"], faction: FactionIdV7) =>
  effectiveRoleRuleV7(role, faction);
const full = (role: UnitStateV7["role"], faction: FactionIdV7) => {
  const value = rule(role, faction);
  return { ...value, hp: value.maxHp };
};
const offered = (state: GameStateV7, seat: number): readonly CommandV7[] =>
  queryPlayerCommandsV7(viewForV7(state, seatIdV7(state, seat)));
/** Applies an accepted command; its events and state pass the schemas. */
const applied = (state: GameStateV7, seat: number, command: CommandV7) => {
  const result = applyOkV7(state, seatIdV7(state, seat), command);
  for (const event of result.events)
    expect(parseEventV7(event).ok, event.kind).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  return result;
};

describe("tuning 1 identity", () => {
  // Tuning 1 took 7r46; tuning 2 (tests/unit/ruleset-v7-tuning-2.test.ts)
  // took 7r47, so 7r46 is the last prior identity.
  it("was 7r46, after 7r45 in the prior list", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r73");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r73.current");
    expect(PRIOR_RULESET_7_IDS.slice(-28, -26)).toEqual([
      "pulp-wars-poc-7r45",
      "pulp-wars-poc-7r46",
    ]);
    expect(PRIOR_RULESET_7_IDS).toHaveLength(72);
  });
});

describe("A: retaliation uses the base Defense, without fortification or cover", () => {
  it("a Fighter attacking a Guard on a Walled center with Field Defense takes the open-ground retaliation", () => {
    const state = walledV7({
      attackerFaction: "ORIGINAL",
      attackers: [{ role: "FIGHTER", at: at(7, 7) }],
      fieldDefense: true,
      attackerTechs: NO_EXPLOSIVES,
    });
    const run = attackV7(state, at(7, 7), at(8, 8));
    // The defender still takes the hit against its full fortified Defense.
    expect(run.combat.fortificationLevel).toBe(4);
    expect(run.combat.defense2).toBe(rule("GUARD", "ORIGINAL").defense2 + 8);
    expect(run.combat.damageToDefender).toBe(2);
    // Before 7r46 the fortified Defense 6 answered with 20: the Fighter died.
    expect(run.combat.damageToAttacker).toBe(
      baseRetaliation(full("FIGHTER", "ORIGINAL"), full("GUARD", "ORIGINAL")),
    );
    expect(run.combat.damageToAttacker).toBe(8);
    expect(run.combat.attackerDies).toBe(false);
    expect(run.attacker?.hp).toBe(4);
  });

  it("Forest cover lowers the damage taken and leaves the retaliation as on open ground", () => {
    const scene = (cover: boolean): GameStateV7 => {
      const open = fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
          { seat: 1, role: "GUARD", at: at(5, 3) },
        ],
        { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: NO_EXPLOSIVES } },
      );
      return cover ? forestV7(open, at(5, 3)) : open;
    };
    const open = attackV7(scene(false), at(5, 2), at(5, 3)).combat;
    const covered = attackV7(scene(true), at(5, 2), at(5, 3)).combat;
    expect(covered.defenseBonusNumerator).toBe(3);
    expect(covered.defenseBonusDenominator).toBe(2);
    expect(covered.damageToDefender).toBeLessThan(open.damageToDefender);
    expect(covered.damageToAttacker).toBe(open.damageToAttacker);
    expect(covered.damageToAttacker).toBe(
      baseRetaliation(full("FIGHTER", "ORIGINAL"), full("GUARD", "UNDEAD")),
    );
  });

  it("a dug-in Dwarf and an Ice Folk unit in Snow strike back with their base Defense", () => {
    for (const [faction, flag] of [
      ["DWARF", "dugIn"],
      ["ICE_FOLK", "snowCover"],
    ] as const) {
      const state = fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(7, 7) },
          { seat: 1, role: "FIGHTER", at: at(6, 6) },
        ],
        {
          factions: [faction, "ORIGINAL"],
          activeSeat: 1,
          techs: { 1: NO_EXPLOSIVES },
        },
      );
      const run = attackV7(state, at(6, 6), at(7, 7));
      expect(run.combat[flag], faction).toBe(true);
      expect(run.combat.retaliation, faction).toBe(true);
      expect(run.combat.damageToAttacker, faction).toBe(
        baseRetaliation(full("FIGHTER", "ORIGINAL"), full("FIGHTER", faction)),
      );
    }
  });

  it("Mountain cover and Glacier's cover on ice leave the retaliation as on open ground", () => {
    const onMountain = mountainV7(
      fieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 2) },
          { seat: 1, role: "GUARD", at: at(5, 3) },
        ],
        { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: NO_EXPLOSIVES } },
      ),
      at(5, 3),
    );
    const mountain = attackV7(onMountain, at(5, 2), at(5, 3)).combat;
    expect(mountain.defenseBonusNumerator).toBe(3);
    expect(mountain.damageToAttacker).toBe(
      baseRetaliation(full("FIGHTER", "ORIGINAL"), full("GUARD", "UNDEAD")),
    );

    // A Yeti on ice with Glacier, attacked from the shore beside it.
    const frozen = frozenArenaV7({
      factions: ["ORIGINAL", "ICE_FOLK"],
      technologies: [NO_EXPLOSIVES, TECHNOLOGY_IDS_V7],
      units: [
        { seat: 0, role: "FIGHTER", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 3) },
      ],
      ice: [{ at: at(2, 3), seat: 1, turnsLeft: 3 }],
    });
    const fighter = navalUnitAtV7(frozen, at(2, 2));
    const yeti = navalUnitAtV7(frozen, at(2, 3));
    const preview = queryCombatPreviewV7(
      viewForV7(frozen, seatV7(frozen, 0).id),
      fighter.id,
      yeti.id,
    );
    expect(preview).toMatchObject({
      iceCover: true,
      defenseBonusNumerator: 5,
      defenseBonusDenominator: 4,
      retaliation: true,
      damageToAttacker: baseRetaliation(
        full("FIGHTER", "ORIGINAL"),
        full("FIGHTER", "ICE_FOLK"),
      ),
    });
    const resolved = acceptV7(frozen, 0, {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: yeti.id,
    }).events.find((event) => event.kind === "COMBAT_RESOLVED");
    if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
    expect(resolved.preview).toEqual(preview);
  });

  it("a wounded fortified defender no longer kills a full-HP Fighter", () => {
    // Playtest G2: "at 8/15 hp the walled Brute dealt 11 to a Fighter".
    const base = walledV7({
      attackerFaction: "ORIGINAL",
      defenderFaction: "GOBLIN",
      attackers: [{ role: "FIGHTER", at: at(7, 7) }],
      attackerTechs: NO_EXPLOSIVES,
    });
    const brute = unitAtV7(base, at(8, 8));
    const state = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.id === brute.id ? { ...unit, hp: 8 } : unit,
      ),
    });
    const run = attackV7(state, at(7, 7), at(8, 8));
    expect(run.combat.fortificationLevel).toBe(2);
    expect(run.combat.damageToAttacker).toBe(
      baseRetaliation(full("FIGHTER", "ORIGINAL"), {
        ...rule("GUARD", "GOBLIN"),
        hp: 8,
      }),
    );
    expect(run.combat.damageToAttacker).toBeLessThan(6);
  });
});

// Tuning 4 replaced the per-city steps of tuning 1 (1, 2, and 2) by 2 Coins
// per technology already owned beyond the first, for every tier; tuning 6
// (`pulp_wars-w49.6`) made that 1 Coin.
// The economy rejig (`pulp_wars-w49.16`, 7r54) went back to the cities, with
// steps of 1 / 2 / 3 (tests/unit/ruleset-v7-economy-rejig.test.ts).
describe("B: research cost steps per city (1 / 2 / 3 since the economy rejig)", () => {
  it("costs 5/7/9 with one city and 10/17/24 with six", () => {
    const table = [1, 2, 3, 4, 5, 6].map((cities) => [
      technologyResearchCostV7(1, cities),
      technologyResearchCostV7(2, cities),
      technologyResearchCostV7(3, cities),
    ]);
    expect(table).toEqual([
      [5, 7, 9],
      [6, 9, 12],
      [7, 11, 15],
      [8, 13, 18],
      [9, 15, 21],
      [10, 17, 24],
    ]);
  });
});

describe("C: the Catapult and the Knight", () => {
  it("the Catapult has Attack 3, reaches 2 to 3 tiles, and never targets an adjacent unit", () => {
    const catapult = rule("CATAPULT", "ORIGINAL");
    expect(catapult).toMatchObject({
      attack2: 6,
      cost: 8,
      minimumRange: 2,
      range: 3,
      mayUsePrimaryActionAfterMove: false,
    });
    const state = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    const attacks = offered(state, 0).filter(
      (command) => command.kind === "ATTACK",
    );
    expect(attacks).toEqual([
      {
        kind: "ATTACK",
        unitId: unitAtV7(state, at(5, 2)).id,
        targetUnitId: unitAtV7(state, at(5, 4)).id,
      },
    ]);
    const adjacent = applyCommandV7(state, seatIdV7(state, 0), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(5, 2)).id,
      targetUnitId: unitAtV7(state, at(5, 3)).id,
    });
    expect(adjacent.accepted).toBe(false);
  });

  it.each(["ORIGINAL", "UNDEAD", "DINOSAUR"] as const)(
    "a full-HP %s basic infantry unit on its city center survives one Catapult shot",
    (faction) => {
      const state = fieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(4, 8) },
          { seat: 1, role: "FIGHTER", at: at(2, 8) },
        ],
        { factions: ["ORIGINAL", faction] },
      );
      const run = attackV7(state, at(4, 8), at(2, 8));
      // The Undead pass (`pulp_wars-w49.13`, 7r51): a Skeleton has Bones
      // (Defense 3 against a shot), so the Catapult deals it 7.
      const dealt = faction === "UNDEAD" ? 7 : 8;
      expect(run.combat.fortificationLevel).toBe(0);
      expect(run.combat.damageToDefender).toBe(dealt);
      expect(run.combat.defenderDies).toBe(false);
      expect(run.combat.retaliation).toBe(false);
      expect(run.target?.hp).toBe(rule("FIGHTER", faction).maxHp - dealt);
    },
  );

  it("the Knight has 13 HP and keeps Overrun (it has no Charge)", () => {
    const knight = rule("KNIGHT", "ORIGINAL");
    expect(knight).toMatchObject({
      maxHp: 13,
      cost: 9,
      // Tuning 3: Attack 4 (tests/unit/ruleset-v7-tuning-3.test.ts).
      attack2: 8,
      defense2: 2,
      move: 3,
    });
    // Tuning 2 (7r47) added Capture.
    expect(knight.abilities).toEqual(["ATTACK", "CAPTURE", "OVERRUN"]);
    // An Overrun kill still advances and offers the next attack.
    const state = fieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(5, 4) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    const run = attackV7(state, at(5, 2), at(5, 3));
    expect(run.combat.advances).toBe(true);
    expect(run.combat.overrunContinues).toBe(true);
    expect(run.attacker?.at).toEqual(at(5, 3));
    expect(run.attacker?.maxHp).toBe(13);
  });
});

describe("D: the Marksman", () => {
  it("costs 4 Coins and never advances after a kill, even from distance 1", () => {
    expect(rule("MARKSMAN", "ORIGINAL").cost).toBe(4);
    expect(roleMechanicsV7("MARKSMAN", "ORIGINAL").advancesAfterKill).toBe(
      false,
    );
    for (const target of [at(5, 3), at(5, 4)]) {
      const state = fieldV7(
        [
          { seat: 0, role: "MARKSMAN", at: at(5, 2) },
          { seat: 1, role: "FIGHTER", at: target, hp: 1 },
        ],
        { factions: ["ORIGINAL", "GOBLIN"] },
      );
      const run = attackV7(state, at(5, 2), target);
      expect(run.combat.defenderDies).toBe(true);
      expect(run.combat.advances).toBe(false);
      expect(run.attacker?.at).toEqual(at(5, 2));
    }
  });

  // Tuning 2 (7r47) stopped every ranged unit from advancing through the
  // role's range (tests/unit/ruleset-v7-tuning-2.test.ts); the mechanics
  // flag of the other factions is as it was.
  it("leaves the other factions' ranged units as they were", () => {
    expect(roleMechanicsV7("MARKSMAN", "DINOSAUR").advancesAfterKill).toBe(
      true,
    );
    expect(rule("MARKSMAN", "UNDEAD").cost).toBe(3);
    expect(rule("CATAPULT", "GOBLIN").attack2).toBe(7);
    // The Vampire and Banshee rework: 13 (was 10: pulp_wars-ty6i).
    expect(rule("KNIGHT", "UNDEAD").maxHp).toBe(13);
  });
});

describe("E: the level-reward loop", () => {
  // The economy rejig (`pulp_wars-w49.16`, 7r54): the fixture's capital
  // is choosing its level-6 reward (level 5 before).
  const pendingLevelSix = () => rewardStateV7("JUGGERNAUT", "ORIGINAL");

  // Tuning 1 made the reward unit once per city; tuning 4 the first
  // capital's (once per player); the economy rejig every city's, once,
  // from level 6. The reward ladder rework (`pulp_wars-zypi`): every level
  // from 5 offers the giant or the Treasury, with no limit. The second and
  // third city are in tests/unit/ruleset-v7-economy-rejig.test.ts.
  it("offers the reward unit at every level from 5; the other choice is the Treasury", () => {
    for (const level of [5, 6, 7])
      expect(rewardCandidatesForLevelV7(level)).toEqual([
        "JUGGERNAUT",
        "TREASURY",
      ]);

    const fixture = pendingLevelSix();
    const actor = seatIdV7(fixture.state, 0);
    const city = cityOfV7(fixture.state, 0);
    expect(city.level).toBe(6);
    expect(
      offered(fixture.state, 0).filter(
        (command) => command.kind === "CHOOSE_CITY_REWARD",
      ),
    ).toEqual(
      (["JUGGERNAUT", "TREASURY"] as const).map((reward) => ({
        kind: "CHOOSE_CITY_REWARD",
        cityId: city.id,
        reachedLevel: 6,
        reward,
      })),
    );
    const coins = (state: GameStateV7) =>
      state.players.find((player) => player.id === actor)?.coins ?? 0;
    const treasury = applied(fixture.state, 0, {
      ...fixture.command,
      reward: "TREASURY",
    });
    expect(coins(treasury.state) - coins(fixture.state)).toBe(10);
    const taken = applied(fixture.state, 0, fixture.command);
    expect(cityOfV7(taken.state, 0).rewards.at(-1)).toEqual({
      reachedLevel: 6,
      reward: "JUGGERNAUT",
    });
    // A stored level-4 choice that offers the unit is not a valid state.
    const four = fixture.state.pendingChoices[0];
    expect(
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...fixture.state,
            cities: fixture.state.cities.map((candidate) =>
              candidate.id === city.id
                ? {
                    ...candidate,
                    rewards: candidate.rewards.filter(
                      (record) => record.reachedLevel < 4,
                    ),
                  }
                : candidate,
            ),
            pendingChoices: [{ ...four, reachedLevel: 4 }],
          }),
        ),
      ),
    ).toBeNull();
    const refused = applyCommandV7(taken.state, actor, fixture.command);
    expect(refused.accepted).toBe(false);
  });

  // The level-4 Treasury of tuning 1 (`TREASURY_6`, 6 Coins) is no longer
  // offered since `pulp_wars-zypi`; a history that holds it still parses.
  it("the 6-Coin level-4 Treasury is a record of the old ladder only", () => {
    expect(CITY_REWARD_COINS_V7).toEqual({
      STOCKPILE: 4,
      TREASURY_6: 6,
      TREASURY: 10,
    });
    expect(rewardCandidatesForLevelV7(4)).toEqual(["BOOM", "ECONOMIC_MIRACLE"]);
    const fixture = pendingLevelSix();
    const city = cityOfV7(fixture.state, 0);
    expect(city.rewards).toContainEqual({
      reachedLevel: 4,
      reward: "TREASURY_6",
    });
    const pendingFour = (candidates: readonly string[]) =>
      parseGameStateV7(
        JSON.parse(
          JSON.stringify({
            ...fixture.state,
            cities: fixture.state.cities.map((candidate) =>
              candidate.id === city.id
                ? {
                    ...candidate,
                    rewards: candidate.rewards.filter(
                      (record) => record.reachedLevel < 4,
                    ),
                  }
                : candidate,
            ),
            pendingChoices: [
              {
                kind: "CITY_REWARD",
                cityId: city.id,
                reachedLevel: 4,
                candidates,
              },
            ],
          }),
        ),
      );
    expect(pendingFour(["BOOM", "TREASURY_6", "BARRACKS"])).toBeNull();
    expect(pendingFour(["BOOM", "ECONOMIC_MIRACLE"])).not.toBeNull();
  });

  // The economy rejig (`pulp_wars-w49.16`, 7r54): 3 again (tuning 1 made it
  // 2).
  it("a Monument adds 3 population", () => {
    expect(MONUMENT_POPULATION_V7).toBe(3);
    const state = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    const actor = seatIdV7(state, 0);
    const command = offered(state, 0).find(
      (candidate) => candidate.kind === "BUILD_MONUMENT",
    );
    if (command?.kind !== "BUILD_MONUMENT") throw new Error("no Monument");
    const preview = previewMonumentV7(viewForV7(state, actor), command);
    expect(preview.ok && preview.preview.populationAdded).toBe(3);
    const before = cityOfV7(state, 0);
    const result = applied(state, 0, command);
    expect(result.events[0]).toMatchObject({
      kind: "MONUMENT_BUILT",
      populationAdded: 3,
    });
    const after = cityOfV7(result.state, 0);
    expect(after.economicPopulation - before.economicPopulation).toBe(3);
    expect(
      spatialContributionAtV7(result.state, command.at, "MONUMENT"),
    ).toMatchObject({ population: 3 });
  });

  // Tuning 5 (`pulp_wars-w49.4`): 1 Coin a tile and no minimum above it
  // (tuning 1 made it 2 Coins a tile and at least 6).
  describe("Land Grant costs 1 Coin per explored tile it claims", () => {
    /** A level-5 capital at (8, 8): 16 neutral tiles in its 5 x 5. */
    const grantState = (coins = 100): GameStateV7 => {
      const fixture = pendingLevelSix();
      const actor = seatIdV7(fixture.state, 0);
      const chosen = applyOkV7(fixture.state, actor, {
        ...fixture.command,
        reward: "TREASURY",
      }).state;
      return checkedV7({
        ...chosen,
        players: chosen.players.map((player) =>
          player.id === actor ? { ...player, coins } : player,
        ),
      });
    };
    const footprint = (state: GameStateV7): readonly CoordV7[] => {
      const city = cityOfV7(state, 0);
      return state.board.tiles
        .filter(
          (tile) =>
            tile.territoryCityId === null &&
            Math.abs(tile.at.x - city.at.x) <= 2 &&
            Math.abs(tile.at.y - city.at.y) <= 2,
        )
        .map((tile) => tile.at);
    };
    const grant = (state: GameStateV7): CommandV7 => ({
      kind: "LAND_GRANT",
      cityId: cityOfV7(state, 0).id,
    });

    it("states the formula", () => {
      expect([0, 1, 3, 4, 8, 13, 16].map(landGrantCostV7)).toEqual([
        1, 1, 3, 4, 8, 13, 16,
      ]);
    });

    it("charges every explored tile and shows the same cost in the preview", () => {
      const state = grantState();
      const actor = seatIdV7(state, 0);
      const tiles = footprint(state);
      expect(tiles).toHaveLength(16);
      const preview = queryLandGrantPreviewV7(
        viewForV7(state, actor),
        cityOfV7(state, 0).id,
      );
      expect(preview).toMatchObject({ cost: 16 });
      expect(preview?.tiles).toHaveLength(16);
      const result = applied(state, 0, grant(state));
      expect(result.events[0]).toMatchObject({
        kind: "LAND_GRANTED",
        cost: 16,
      });
      const coins = (value: GameStateV7) =>
        value.players.find((player) => player.id === actor)?.coins ?? 0;
      expect(coins(state) - coins(result.state)).toBe(16);
    });

    // Tuning 4: unexplored tiles are neither claimed nor charged (tuning 1
    // claimed them free, which told the player what lay in the fog).
    it("leaves unexplored neutral tiles alone and charges the explored ones", () => {
      const open = grantState();
      const actor = seatIdV7(open, 0);
      const tiles = footprint(open);
      for (const [hidden, cost] of [
        [4, 12],
        [14, 2],
      ] as const) {
        const state = unexploreV7(open, 0, tiles.slice(0, hidden));
        const preview = queryLandGrantPreviewV7(
          viewForV7(state, actor),
          cityOfV7(state, 0).id,
        );
        expect(preview?.cost).toBe(cost);
        expect(preview?.tiles).toHaveLength(16 - hidden);
        const result = applied(state, 0, grant(state));
        const granted = result.events[0];
        if (granted?.kind !== "LAND_GRANTED") throw new Error("no grant");
        expect(granted.cost).toBe(cost);
        expect(granted.tiles).toHaveLength(16 - hidden);
        expect(
          result.events.some((event) => event.kind === "TILES_REVEALED"),
        ).toBe(false);
      }
    });

    it("is not offered and is refused below its cost", () => {
      const state = grantState(15);
      const actor = seatIdV7(state, 0);
      expect(offered(state, 0)).not.toContainEqual(grant(state));
      expect(
        queryLandGrantPreviewV7(viewForV7(state, actor), cityOfV7(state, 0).id),
      ).toBeNull();
      const result = applyCommandV7(state, actor, grant(state));
      expect(result.accepted).toBe(false);
      if (!result.accepted)
        expect(result.error).toMatchObject({
          code: "INSUFFICIENT_COINS",
          params: { cost: 16 },
        });
      expect(offered(grantState(16), 0)).toContainEqual(grant(state));
    });
  });

  // The economy rejig (`pulp_wars-w49.16`, 7r54): the "one building of a
  // kind" rule of tuning 1 holds for Markets only; a Windmill, Sawmill,
  // or Forge counts every contributor of its owner next to it, shared or
  // not (tests/unit/ruleset-v7-economy-rejig.test.ts has the layouts).
  describe("one contributor counts for one Market, and for every mill next to it", () => {
    const OWNER = 1 as never;
    /** A 6 x 3 strip: city 1 owns x 0-1, city 2 x 2-3, city 3 x 4-5. */
    const graph = (
      improvements: Readonly<Record<string, ImprovementIdV7>>,
      owners: readonly [number, number, number] = [1, 1, 1],
    ): EconomyGraphV7 => ({
      board: {
        width: 6,
        height: 3,
        tiles: Array.from({ length: 18 }, (_, index) => {
          const x = index % 6;
          const y = Math.floor(index / 6);
          return {
            at: { x, y },
            improvement: improvements[`${x},${y}`] ?? null,
            road: false,
            territoryCityId: (Math.floor(x / 2) + 1) as never,
          };
        }),
      },
      cities: [0, 1, 2].map((index) => ({
        id: (index + 1) as never,
        ownerId: (owners[index] ?? OWNER) as never,
        at: { x: index * 2, y: 0 },
        isCapital: index === 0,
      })),
    });
    const output = (
      value: EconomyGraphV7,
      x: number,
      y: number,
      improvement: ImprovementIdV7,
    ) => spatialContributionAtV7(value, { x, y }, improvement);

    it.each([
      ["SAWMILL", "LUMBER_CAMP"],
      ["WINDMILL", "FARM"],
      ["FORGE", "MINE"],
    ] as const)(
      "a %s counts a %s of its own city, and so does the neighbouring city's",
      (processor, basic) => {
        // The contributor (2, 1) belongs to city 2 and touches both.
        const value = graph({
          "1,1": processor,
          "2,1": basic,
          "3,1": processor,
        });
        expect(output(value, 1, 1, processor).population).toBe(1);
        expect(output(value, 3, 1, processor).population).toBe(1);
        expect(output(value, 3, 1, processor).contributingTiles).toEqual([
          { x: 2, y: 1 },
        ]);
      },
    );

    it("a contributor of a third city counts for every mill next to it, whatever the reading order", () => {
      const value = graph(
        { "1,0": "SAWMILL", "2,1": "LUMBER_CAMP", "3,2": "SAWMILL" },
        [1, 1, 1],
      );
      expect(output(value, 1, 0, "SAWMILL").population).toBe(1);
      expect(output(value, 3, 2, "SAWMILL").population).toBe(1);
      const split = graph({
        "1,0": "SAWMILL",
        "2,1": "LUMBER_CAMP",
        "3,1": "LUMBER_CAMP",
        "4,2": "SAWMILL",
      });
      expect(output(split, 1, 0, "SAWMILL").population).toBe(1);
      expect(output(split, 4, 2, "SAWMILL").population).toBe(1);
      expect(output(split, 4, 2, "SAWMILL").contributingTiles).toEqual([
        { x: 3, y: 1 },
      ]);
    });

    it("answers a placement the same way before the building stands", () => {
      const value = graph({ "1,1": "SAWMILL", "2,1": "LUMBER_CAMP" });
      expect(output(value, 3, 1, "SAWMILL").placementCount).toBe(1);
      // City 1's other candidate (1, 2) touches the camp too.
      expect(output(value, 1, 2, "SAWMILL").placementCount).toBe(1);
      // Another owner's contributor never counts.
      const foreign = graph(
        { "1,1": "SAWMILL", "2,1": "LUMBER_CAMP", "3,1": "SAWMILL" },
        [2, 1, 1],
      );
      expect(output(foreign, 1, 1, "SAWMILL").population).toBe(0);
      expect(output(foreign, 3, 1, "SAWMILL").population).toBe(1);
    });

    it("a Market counts only the buildings that serve it; each still pays its base Coin", () => {
      // Playtest G4: one Farm fed the Markets of three cities.
      const value = graph({
        "1,0": "MARKET",
        "2,1": "FARM",
        "3,0": "MARKET",
        "3,2": "LUMBER_CAMP",
      });
      expect(output(value, 3, 0, "MARKET").marketIncome).toBe(2);
      expect(output(value, 3, 0, "MARKET").distinctFamilies).toEqual([
        "AGRICULTURE",
      ]);
      expect(output(value, 1, 0, "MARKET").marketIncome).toBe(1);
      // A Farm counts for a Windmill and for a Market independently.
      const both = graph({ "2,0": "WINDMILL", "2,1": "FARM", "3,0": "MARKET" });
      expect(output(both, 2, 0, "WINDMILL").population).toBe(1);
      expect(output(both, 3, 0, "MARKET").marketIncome).toBe(2);
    });
  });
});

describe("F: Commerce, Explosives, and Field Defense", () => {
  const ALL = TECHNOLOGY_IDS_V7;

  it("the tech cards state the changed rules", () => {
    const state = fieldV7([], { factions: ["ORIGINAL", "UNDEAD"] });
    const tree = queryTechnologyTreeV7(state, seatIdV7(state, 0));
    const card = (technology: TechnologyIdV7): readonly string[] => {
      const node = tree.nodes.find((item) => item.id === technology);
      if (node === undefined) throw new Error(`no ${technology} node`);
      return technologyEffectGroupsV7(node.effects, tree.faction).flatMap(
        (group) => group.items,
      );
    };
    expect(card("EXPLOSIVES")).toEqual([
      "Blast Mountain (3 Coins): a Mountain in your territory or next to one of your units becomes Grass, and every unit on it or next to it takes 5 damage, yours too except the one that sets it; in your territory its city gains +1 population",
      "Breach: melee attacks ignore Walls and Field Defense, and destroy Field Defense",
    ]);
    expect(card("COMMERCE")).toContain(
      "Each city linked by Road to another of your cities: +1 Coin each turn",
    );
    expect(card("FORTIFICATION")).toContain(
      "Build Field Defense: +2 Defense for the unit on it; the builder keeps its move and attack",
    );
  });

  it("Commerce pays 1 Coin per linked city in every tree but the Goblin one (2 before tuning 4)", () => {
    expect(LAND_TRADE_INCOME_COINS_V7).toBe(1);
    for (const faction of FACTION_IDS_V7) {
      const capabilities = technologyCapabilitiesV7(ALL, faction);
      expect(capabilities.landTradeIncomeCoins, faction).toBe(
        faction === "GOBLIN" ? 0 : 1,
      );
      // The Goblin pass, correction (`pulp_wars-w49.12`): Plunder pays 2.
      expect(capabilities.plunderCoins, faction).toBe(
        faction === "GOBLIN" ? 2 : 0,
      );
    }
  });

  it("every tree's Explosives grants Breach", () => {
    for (const faction of FACTION_IDS_V7) {
      expect(technologyCapabilitiesV7(ALL, faction).breach, faction).toBe(true);
      expect(
        technologyCapabilitiesV7(withoutTechsV7(faction, "EXPLOSIVES"), faction)
          .breach,
        faction,
      ).toBe(false);
    }
  });

  it("Breach: a melee attack ignores Walls and Field Defense, keeps cover, and destroys the Field Defense", () => {
    const state = walledV7({
      attackerFaction: "ORIGINAL",
      attackers: [{ role: "FIGHTER", at: at(7, 7) }],
      fieldDefense: true,
    });
    const run = attackV7(state, at(7, 7), at(8, 8));
    expect(run.combat).toMatchObject({
      breachApplied: true,
      fortificationLevel: 0,
      fortificationIgnored: 4,
      defense2: rule("GUARD", "ORIGINAL").defense2,
      // The open-ground exchange: 2 of 5 force, Attack 2.
      damageToDefender: 4,
      damageToAttacker: 8,
    });
    expect(run.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(8, 8),
      reason: "EXPLOSIVES",
    });
    expect(tileV7(run.state, at(8, 8)).fieldDefense).toBe(false);
    // Walls are not destroyed: the next attack without Explosives meets them.
    expect(
      cityOfV7(run.state, 0).rewards.some(
        (record) => record.reward === "WALLS",
      ),
    ).toBe(true);
  });

  it("Breach keeps Forest cover and destroys the Field Defense even when the attacker dies", () => {
    const open = fieldV7(
      [
        { seat: 0, role: "GUARD", at: at(7, 7) },
        { seat: 1, role: "FIGHTER", at: at(6, 6), hp: 1 },
      ],
      { factions: ["UNDEAD", "ORIGINAL"], activeSeat: 1 },
    );
    const state = fieldDefenseV7(forestV7(open, at(7, 7)), at(7, 7));
    const run = attackV7(state, at(6, 6), at(7, 7));
    expect(run.combat).toMatchObject({
      breachApplied: true,
      fortificationLevel: 0,
      fortificationIgnored: 2,
      defenseBonusNumerator: 3,
      defenseBonusDenominator: 2,
      attackerDies: true,
    });
    expect(tileV7(run.state, at(7, 7)).fieldDefense).toBe(false);
    expect(run.events).toContainEqual({
      kind: "FIELD_DEFENSE_DESTROYED",
      at: at(7, 7),
      reason: "EXPLOSIVES",
    });
  });

  it("a ranged attack and an attacker without Explosives do not breach", () => {
    const scene = (
      role: UnitStateV7["role"],
      from: CoordV7,
      techs: readonly TechnologyIdV7[] = ALL,
    ) =>
      fieldDefenseV7(
        fieldV7(
          [
            { seat: 0, role: "GUARD", at: at(7, 7) },
            { seat: 1, role, at: from },
          ],
          {
            factions: ["UNDEAD", "ORIGINAL"],
            activeSeat: 1,
            techs: { 1: techs },
          },
        ),
        at(7, 7),
      );
    const ranged = attackV7(scene("MARKSMAN", at(5, 5)), at(5, 5), at(7, 7));
    expect(ranged.combat).toMatchObject({
      breachApplied: false,
      fortificationLevel: 2,
      fortificationIgnored: 0,
    });
    expect(tileV7(ranged.state, at(7, 7)).fieldDefense).toBe(true);
    const plain = attackV7(
      scene("FIGHTER", at(6, 6), NO_EXPLOSIVES),
      at(6, 6),
      at(7, 7),
    );
    expect(plain.combat).toMatchObject({
      breachApplied: false,
      fortificationLevel: 2,
      fortificationIgnored: 0,
    });
    expect(tileV7(plain.state, at(7, 7)).fieldDefense).toBe(true);
  });

  it("Blast Mountain works on an Ore Mountain and gives its city 1 permanent population", () => {
    const open = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    for (const resource of ["ORE", null] as const) {
      const state = patchTileV7(open, at(7, 7), {
        terrain: "MOUNTAIN",
        biome: "HIGHLANDS",
        resource,
      });
      const actor = seatIdV7(state, 0);
      const command: CommandV7 = { kind: "BLAST_MOUNTAIN", at: at(7, 7) };
      expect(offered(state, 0)).toContainEqual(command);
      const city = cityOfV7(state, 0);
      const preview = previewEconomicV7(viewForV7(state, actor), command);
      expect(preview.ok && preview.preview).toMatchObject({
        cost: 3,
        resultingContribution: 1,
        populationDeltaByCity: [{ cityId: city.id, delta: 1 }],
      });
      const result = applied(state, 0, command);
      expect(result.events[0]).toMatchObject({
        kind: "MOUNTAIN_BLASTED",
        cost: 3,
        terrainAfter: "GRASS",
      });
      expect(tileV7(result.state, at(7, 7))).toMatchObject({
        terrain: "GRASS",
        resource: null,
      });
      const after = cityOfV7(result.state, 0);
      expect(after.permanentPopulation - city.permanentPopulation).toBe(1);
      expect(
        parseGameStateV7(JSON.parse(JSON.stringify(result.state))),
      ).toEqual(result.state);
    }
    // A Mine still blocks the Blast.
    const mined = patchTileV7(open, at(7, 7), {
      terrain: "MOUNTAIN",
      biome: "HIGHLANDS",
      resource: "ORE",
    });
    const actor = seatIdV7(mined, 0);
    const built = applyOkV7(mined, actor, { kind: "BUILD_MINE", at: at(7, 7) });
    expect(offered(built.state, 0)).not.toContainEqual({
      kind: "BLAST_MOUNTAIN",
      at: at(7, 7),
    });
    expect(
      applyCommandV7(built.state, actor, {
        kind: "BLAST_MOUNTAIN",
        at: at(7, 7),
      }).accepted,
    ).toBe(false);
  });

  it("building a Field Defense keeps the unit's Move and attack; it is still refused after an attack", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 1, role: "FIGHTER", at: at(6, 6) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"] },
    );
    const actor = seatIdV7(state, 0);
    const fighter = unitAtV7(state, at(7, 7));
    const enemy = unitAtV7(state, at(6, 6));
    const build: CommandV7 = {
      kind: "BUILD_FIELD_DEFENSE",
      unitId: fighter.id,
    };
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: fighter.id,
      targetUnitId: enemy.id,
    };
    expect(offered(state, 0)).toContainEqual(build);
    const built = applied(state, 0, build);
    expect(built.events).toEqual([
      {
        kind: "FIELD_DEFENSE_BUILT",
        playerId: actor,
        unitId: fighter.id,
        at: at(7, 7),
        cost: 3,
      },
    ]);
    expect(unitAtV7(built.state, at(7, 7)).activation).toEqual(
      fighter.activation,
    );
    const after = offered(built.state, 0);
    expect(after).toContainEqual(attack);
    expect(
      after.some(
        (command) => command.kind === "MOVE" && command.unitId === fighter.id,
      ),
    ).toBe(true);
    expect(after).not.toContainEqual(build);
    applyOkV7(built.state, actor, attack);
    // After an attack the unit cannot build.
    const attacked = applyOkV7(state, actor, attack);
    if (attacked.state.units.some((unit) => unit.id === fighter.id)) {
      expect(offered(attacked.state, 0)).not.toContainEqual(build);
      const refused = applyCommandV7(attacked.state, actor, build);
      expect(refused.accepted).toBe(false);
      if (!refused.accepted)
        expect(refused.error.code).toBe("UNIT_ALREADY_ACTED");
    }
  });
});

describe("G: treasure chests give no tier 3 unit before round 15", () => {
  it("names the unit by faction and round", () => {
    expect(TREASURE_TIER_3_UNIT_FIRST_ROUND_V7).toBe(15);
    for (const faction of FACTION_IDS_V7) {
      const early = treasureUnitRoleForRoundV7(faction, 1);
      expect(early, faction).toBe("RAIDER");
      expect(treasureUnitRoleForRoundV7(faction, 14), faction).toBe("RAIDER");
      expect(treasureUnitRoleForRoundV7(faction, 15), faction).toBe(
        ["ORIGINAL", "UNDEAD", "GOBLIN"].includes(faction)
          ? "KNIGHT"
          : "RAIDER",
      );
    }
  });

  it.each([
    [14, "RAIDER"],
    [15, "KNIGHT"],
  ] as const)("in round %i a Human chest unit is a %s", (round, role) => {
    let seed = 0;
    while (
      nextBounded({ algorithm: "MULBERRY32", version: 1, state: seed }, 2)
        .value !== 1
    )
      seed += 1;
    const arena = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
    );
    const cleared = patchTileV7(arena, at(5, 3), {
      terrain: "GRASS",
      biome: "PLAINS",
      resource: null,
      improvement: null,
    });
    const state = checkedV7({
      ...cleared,
      round,
      random: { ...cleared.random, state: seed },
      treasureChests: [at(5, 3)],
    });
    const result = applyOkV7(state, seatIdV7(state, 0), {
      kind: "MOVE",
      unitId: unitAtV7(state, at(5, 2)).id,
      path: [at(5, 3)],
    });
    const event = result.events.find(
      (candidate) => candidate.kind === "TREASURE_CAPTURED",
    );
    if (event?.kind !== "TREASURE_CAPTURED") throw new Error("no chest");
    expect(event).toMatchObject({
      requestedReward: "KNIGHT",
      grantedReward: "KNIGHT",
    });
    const unit = result.state.units.find(
      (candidate) => candidate.id === event.spawnedUnitId,
    );
    expect(unit?.role).toBe(role);
    if (unit !== undefined)
      expect(unitRoleRuleV7(result.state, unit).label).toBe(
        role === "KNIGHT" ? "Knight" : "Raider",
      );
  });
});
