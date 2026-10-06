export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH =
  "tests/fixtures/ruleset-v7-late-public-view.json";

export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_URL = `/${RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH}`;

export const RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX = 150;

/**
 * The Normal policy's decision for the upgraded retained view: the single
 * pin shared by `tests/unit/ruleset-v7-normal-policy.test.ts` (which keeps it
 * current under `npm run check`) and
 * `scripts/benchmark-ruleset-v7-normal-policy.ts`. The benchmark used to
 * carry its own copy, which no gate ran: it went stale at 521c3da (revision
 * 4, 2026-09-12), when the decision changed from a Forge to this Attack, and
 * the decision hash then changed twelve more times unnoticed
 * (`pulp_wars-c87.8`). Refresh it here, with the cause, whenever a change is
 * meant to alter this decision or its candidate list.
 *
 * Revision 20 (`pulp_wars-0hi.2`): `policyDecisionHash` was 27ee3b…bfeb. The
 * `STAMPEDE` command kind is removed, so the `-ordinal` tie-break of every
 * candidate whose kind follows `KABOOM` moves by one. The command, the
 * candidate count, and the hash with revision-12 ordinals are unchanged.
 *
 * `pulp_wars-9s0.1` (campaign plan): `policyDecisionHash` was 74d605…ed4b
 * and the command the Attack of unit 19 on unit 34. An enemy city is known
 * and fewer than two thirds of the seat's unit slots are filled, so land
 * production takes priority 1205 and the Guard is trained in city 16
 * before that Attack (which is still a candidate). The candidate count is
 * unchanged; Move candidates follow the units' campaign jobs.
 *
 * The Martian revision (`pulp_wars-t6s.2`): `policyDecisionHash` was
 * 455981…4e25. `BEAM_DOWN`, `MIND_CONTROL`, and `TRACTOR_BEAM` are inserted
 * after `HATCH`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `HATCH` moves by three. The command, the candidate count, and the
 * hash with revision-12 ordinals are unchanged.
 *
 * `pulp_wars-0hi.3` (revision 20 section 6.3, Human HP): `policyDecisionHash`
 * was 312823…8c44. The command and the candidate count are unchanged; three
 * of the 28 candidates score differently, all because a role's maximum HP is
 * part of its value: the two Train Guard candidates have strategic value 17
 * (was 15), and Research Scouting is now the missing-role plan (priority
 * 1060 and value 6, was 1040 and 0), because the Raider's value rose from
 * 16 to 18.
 *
 * The Ice Folk revision (`pulp_wars-7g3.3`): `policyDecisionHash` was
 * 5f5406…2618. `THROW_BOLAS` and `COLD_SNAP` are inserted after
 * `TRACTOR_BEAM`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `TRACTOR_BEAM` moves by two. The command, the candidate count,
 * and the hash with revision-12 ordinals are unchanged.
 *
 * The Dwarf revision (`pulp_wars-78i.3`): `policyDecisionHash` was
 * 9aa14a…171f. `TUNNEL`, `BOMB_RUN`, and `ASSEMBLE` are inserted after
 * `COLD_SNAP`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `COLD_SNAP` moves by three. The command, the candidate count,
 * and the hash with revision-12 ordinals are unchanged.
 *
 * The Candy revision (`pulp_wars-jdb.3`): `policyDecisionHash` was
 * 634f04…55da. `SUGAR_RUSH`, `REBAKE`, and `SUGAR_TOSS` are inserted after
 * `ASSEMBLE`, so the `-ordinal` tie-break of every candidate whose kind
 * follows `ASSEMBLE` moves by three. The command, the candidate count, and
 * the hash with revision-12 ordinals are unchanged.
 *
 * Tuning 5 (`pulp_wars-w49.4`): the command was the training of a Guard in
 * city 16. The view owns Engineering, so the city now offers the Swordsman,
 * and the Normal AI's army play (a match of Human seats with an enemy in
 * sight) trains the best line unit it can pay for instead of a Guard.
 * `DRILL_UNIT` is removed, so every kind after `PROMOTE` moves back by one.
 */
export const RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION = Object.freeze({
  /** `canonicalHash` of the retained fixture as read from disk. */
  fixtureViewHash:
    "d095b657a12242e56e4bf3ada5e3a0a8d1982da358a906c9bd477e0eabe6c75b",
  /** `canonicalHash` of the whole decision (command and candidates). */
  policyDecisionHash:
    // The naval branch (`pulp_wars-5ti.2`) inserts BOARD after ATTACK, moving
    // every later command kind forward by one (was 7622b4…e548).
    // The frozen sea (`pulp_wars-5ti.3`) inserts FREEZE after COLD_SNAP,
    // moving every later command kind forward by one (was a30271…8cc3).
    // Tuning 3 (`pulp_wars-w49.3`) inserts HIRE after TRAIN_NAVAL, moving every later command kind forward by one
    // (was 0618e5…b49c).
    // Tuning 4 (`pulp_wars-w49.3`) inserts DRILL_UNIT after PROMOTE and
    // prices research by the technologies owned, so the view's one RESEARCH
    // candidate is gone (was 28c2e6…c05b).
    // Tuning 5 (`pulp_wars-w49.4`): army play and the Swordsman, as in the
    // comment above (was 0cd4ad…5ea7).
    "d083c1e72e371b989ede7964d4ec8a8a13624f9a72b70287efad47e23f9d4725",
  command: Object.freeze({
    kind: "TRAIN",
    cityId: 16,
    role: "SWORDSMAN",
  }),
  // Tuning 4 (`pulp_wars-w49.3`): 27 (28 before): the view's 12 Coins no
  // longer buy a technology (a tier 1 as the sixth costs 13).
  // Tuning 5: 21. Two Train Swordsman candidates are new, and the army
  // play's garrison and formation rules leave fewer Moves as candidates.
  candidateCount: 21,
});

/**
 * Upgrade the immutable retained benchmark fixture at its revision-9 read
 * boundary. This is a public-fixture adapter, never a runtime save migration.
 */
export function upgradeRetainedPublicViewV7(
  retained: PlayerViewV7,
): PlayerViewV7 {
  const upgradedTechs = (
    technologies: readonly TechnologyIdV7[],
  ): readonly TechnologyIdV7[] => {
    const upgradedIds = new Set<TechnologyIdV7>();
    const addWithPrerequisites = (technology: TechnologyIdV7): void => {
      if (upgradedIds.has(technology)) return;
      const node = ORIGINAL_BASELINE_V5_NODES.find(
        (candidate) => candidate.id === technology,
      );
      if (node === undefined) throw new RangeError("UNSUPPORTED_RETAINED_TECH");
      for (const prerequisite of node.prerequisites)
        addWithPrerequisites(prerequisite);
      upgradedIds.add(technology);
    };
    for (const retainedTechnology of technologies) {
      if (!TECHNOLOGY_IDS_V7.includes(retainedTechnology))
        throw new RangeError("UNSUPPORTED_RETAINED_TECH");
      addWithPrerequisites(retainedTechnology);
    }
    return TECHNOLOGY_IDS_V7.filter((technology) =>
      upgradedIds.has(technology),
    );
  };
  const viewer = {
    ...retained.viewer,
    factionTreeId: "ORIGINAL_BASELINE_V5" as const,
    originalCapitalCityId: cityId(retained.viewer.seat * 2 + 1),
    researchedTechs: upgradedTechs(retained.viewer.researchedTechs),
  };
  const units = retained.units.map((unit) => {
    if (!RETAINED_SUPPORTED_ROLES.has(unit.role))
      throw new RangeError("UNSUPPORTED_RETAINED_ROLE");
    return {
      id: unit.id,
      ownerId: unit.ownerId,
      homeCityId: unit.homeCityId,
      role: unit.role,
      form: "LAND" as const,
      at: unit.at,
      hp: unit.hp,
      maxHp: unit.maxHp,
      kills: unit.kills,
      veteran: unit.veteran,
      captureEligible: unit.captureEligible,
      activation: {
        moved: unit.activation.moved,
        movedPathLength: unit.activation.movedPathLength,
        attacked: unit.activation.attacked,
        attacksUsed: unit.activation.attacksUsed,
        tendedThisTurn: false,
        inspired: false,
        overrunActive: false,
        escapeAvailable: false,
        recovered: unit.activation.recovered,
        captured: unit.activation.captured,
        handled: unit.activation.handled,
        specialActed: unit.activation.specialActed,
      },
    };
  });
  return {
    ...retained,
    rulesetId: "pulp-wars-poc-7r48",
    setup: {
      ...retained.setup,
      rulesetId: "pulp-wars-poc-7r48",
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    },
    viewer,
    players: retained.players.map((player) => ({
      ...player,
      factionTreeId: "ORIGINAL_BASELINE_V5",
      originalCapitalCityId: cityId(player.seat * 2 + 1),
    })),
    cities: retained.cities.map((city) => ({
      id: city.id,
      ownerId: city.ownerId,
      at: city.at,
      level: city.level,
      permanentPopulation: city.permanentPopulation,
      economicPopulation: city.economicPopulation,
      population: city.population,
      isCapital: city.isCapital,
      expanded: false,
      landGrantUsed: city.expanded,
      ...(city.ownerId === retained.viewer.id
        ? { cityActionAvailable: true }
        : {}),
      rewards: city.rewards.map((reward) => ({
        ...reward,
        reward:
          String(reward.reward) === "EXPAND" ? "TREASURY_6" : reward.reward,
      })),
    })),
    units,
    unitStats: retained.unitStats.map((entry) => ({
      ...entry,
      stats: entry.stats.map((stat) => {
        const modifiers = stat.modifiers.filter(
          (modifier) => !LEGACY_DEFENSE_SOURCES.has(String(modifier.source)),
        );
        return {
          ...stat,
          modifiers,
          total: modifiers.reduce(
            (sum, modifier) => addValues(sum, modifier.value),
            stat.base.value,
          ),
        };
      }),
    })),
    board: {
      ...retained.board,
      tiles: retained.board.tiles.map((tile) => {
        if (!tile.explored) return tile;
        const city = retained.cities.find(
          (candidate) =>
            candidate.at.x === tile.at.x && candidate.at.y === tile.at.y,
        );
        const knownOwnedCity = city?.ownerId === viewer.id;
        const walls =
          knownOwnedCity &&
          city.rewards.some((reward) => reward.reward === "WALLS")
            ? 2
            : 0;
        return {
          ...tile,
          biome: "HIGHLANDS",
          fieldDefense: false,
          fortificationLevel:
            tile.territoryOwnerId === viewer.id
              ? knownOwnedCity
                ? walls
                : 0
              : null,
        };
      }),
    },
    naval: {
      ownedPorts: [],
      tradeCityIds: [],
      landTradeCityIds: [],
      seaTradeCityIds: [],
      networkCityIds: [],
      networkRoads: [],
      seaRoutes: [],
      recoverableNavalUnitIds: [],
    },
    // Map curiosities: the retained match was generated without any (and
    // without a Monster).
    curiosities: [],
    // The frozen sea: nor any ice.
    ice: [],
    monsters: [],
    // Revision 13: the retained all-Human match has no Graves.
    graves: [],
    // Revision 14: nor any Plague or Bitten status.
    plagued: [],
    bitten: [],
    // The Martian revision: nor any Shield, Cooling, control, or cooldown.
    shields: [],
    cooling: [],
    mindControlled: [],
    mindControlCooldowns: [],
    // The Ice Folk revision: nor any Chill.
    chilled: [],
    // The Dwarf revision: nor any mound, surfacing, or bomb.
    burrowed: [],
    surfacedThisTurn: [],
    bombedThisTurn: [],
    beamedThisTurn: [],
    tractorUsedThisTurn: [],
    // The Candy revision: nor any Rush, Crumbs, Splat, or Toss.
    sugarRush: [],
    crumbs: [],
    splattedThisTurn: [],
    tossedThisTurn: [],
  };
}
import {
  ORIGINAL_BASELINE_V5_NODES,
  TECHNOLOGY_IDS_V7,
  cityId,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../src/engine/index";

const RETAINED_SUPPORTED_ROLES = new Set(["FIGHTER", "GUARD"]);
const LEGACY_DEFENSE_SOURCES = new Set(["FRIENDLY_CITY", "CITY_FORTIFICATION"]);

function addValues(
  left: { readonly numerator: number; readonly denominator: number },
  right: { readonly numerator: number; readonly denominator: number },
): { readonly numerator: number; readonly denominator: number } {
  const numerator =
    left.numerator * right.denominator + right.numerator * left.denominator;
  const denominator = left.denominator * right.denominator;
  const divisor = greatestCommonDivisor(Math.abs(numerator), denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function greatestCommonDivisor(left: number, right: number): number {
  while (right !== 0) [left, right] = [right, left % right];
  return left || 1;
}
