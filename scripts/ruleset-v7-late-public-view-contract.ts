export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH =
  "tests/fixtures/ruleset-v7-late-public-view.json";

export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_URL = `/${RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH}`;

export const RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX = 150;

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
        recovered: unit.activation.recovered,
        captured: unit.activation.captured,
        handled: unit.activation.handled,
        specialActed: unit.activation.specialActed,
      },
    };
  });
  return {
    ...retained,
    rulesetId: "pulp-wars-poc-7r11",
    setup: {
      ...retained.setup,
      rulesetId: "pulp-wars-poc-7r11",
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
