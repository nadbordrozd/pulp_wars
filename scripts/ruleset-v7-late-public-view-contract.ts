export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH =
  "tests/fixtures/ruleset-v7-late-public-view.json";

export const RULESET7_LATE_PUBLIC_VIEW_FIXTURE_URL = `/${RULESET7_LATE_PUBLIC_VIEW_FIXTURE_PATH}`;

export const RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX = 150;

/** Upgrade the immutable revision-4 public fixture at its read boundary. */
export function upgradeRetainedPublicViewV7(
  retained: PlayerViewV7,
): PlayerViewV7 {
  return {
    ...retained,
    rulesetId: "pulp-wars-poc-7r6",
    setup: {
      ...retained.setup,
      rulesetId: "pulp-wars-poc-7r6",
      mapType: "DRY_LAND",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V1",
    },
    units: retained.units.map((unit) => ({ ...unit, form: "LAND" })),
    board: {
      ...retained.board,
      tiles: retained.board.tiles.map((tile) =>
        tile.explored ? { ...tile, biome: "HIGHLANDS" } : tile,
      ),
    },
    naval: {
      ownedPorts: [],
      tradeCityIds: [],
      networkCityIds: [],
      seaRoutes: [],
      recoverableNavalUnitIds: [],
    },
  };
}
import type { PlayerViewV7 } from "../src/engine/index";
