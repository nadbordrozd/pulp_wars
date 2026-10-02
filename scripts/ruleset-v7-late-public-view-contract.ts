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
 */
export const RULESET7_LATE_PUBLIC_VIEW_NORMAL_DECISION = Object.freeze({
  /** `canonicalHash` of the retained fixture as read from disk. */
  fixtureViewHash:
    "d095b657a12242e56e4bf3ada5e3a0a8d1982da358a906c9bd477e0eabe6c75b",
  /** `canonicalHash` of the whole decision (command and candidates). */
  policyDecisionHash:
    "74d6056adf54e01cd9d535f0327caee08bbaf849cc20dc5ce0f037d9a2cfed4b",
  command: Object.freeze({
    kind: "ATTACK",
    unitId: 19,
    targetUnitId: 34,
  }),
  candidateCount: 28,
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
    rulesetId: "pulp-wars-poc-7r21",
    setup: {
      ...retained.setup,
      rulesetId: "pulp-wars-poc-7r21",
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
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
          String(reward.reward) === "EXPAND" ? "TREASURY_8" : reward.reward,
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
    // Revision 13: the retained all-Human match has no Graves.
    graves: [],
    // Revision 14: nor any Plague or Bitten status.
    plagued: [],
    bitten: [],
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
