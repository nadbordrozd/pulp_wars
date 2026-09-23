export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH =
  "tests/fixtures/ruleset-v7-late-public-view.json";

export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_URL = `/${RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH}`;

export const RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX = 150;

/** Upgrade the immutable revision-4 public fixture at its read boundary. */
export function upgradeRetainedPublicViewV7(
  retained: PlayerViewV7,
): PlayerViewV7 {
  const upgradedTechs = (
    technologies: readonly TechnologyIdV7[],
  ): readonly TechnologyIdV7[] =>
    technologies.includes("ENGINEERING") &&
    !technologies.includes("PROSPECTING")
      ? technologies.flatMap((technology) =>
          technology === "ENGINEERING"
            ? (["PROSPECTING", technology] as const)
            : [technology],
        )
      : technologies;
  const viewer = {
    ...retained.viewer,
    originalCapitalCityId: cityId(retained.viewer.seat * 2 + 1),
    researchedTechs: upgradedTechs(retained.viewer.researchedTechs),
  };
  return {
    ...retained,
    rulesetId: "pulp-wars-poc-7r7",
    setup: {
      ...retained.setup,
      rulesetId: "pulp-wars-poc-7r7",
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
    },
    viewer,
    players: retained.players.map((player) => ({
      ...player,
      originalCapitalCityId: cityId(player.seat * 2 + 1),
    })),
    units: retained.units.map((unit) => ({ ...unit, form: "LAND" })),
    board: {
      ...retained.board,
      tiles: retained.board.tiles.map((tile) => {
        if (!tile.explored) return tile;
        const city = retained.cities.find(
          (candidate) =>
            candidate.at.x === tile.at.x && candidate.at.y === tile.at.y,
        );
        const knownOwnedCity = city?.ownerId === viewer.id;
        const drill = viewer.researchedTechs.includes("DRILL") ? 1 : 0;
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
                ? drill + walls
                : 0
              : null,
        };
      }),
    },
    naval: {
      ownedPorts: [],
      tradeCityIds: [],
      networkCityIds: [],
      networkRoads: [],
      seaRoutes: [],
      recoverableNavalUnitIds: [],
    },
  };
}
import {
  cityId,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../src/engine/index";
