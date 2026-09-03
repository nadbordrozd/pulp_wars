import type {
  EconomicImprovementId,
  FactionIdV6,
  ResourceId,
  TerrainIdV6,
  UnitRoleId,
} from "../../engine/index";
import {
  BOARD_ART_GEOMETRY,
  RULESET6_UNIT_ART_GEOMETRY,
  SQUARE_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  cityArtLevel,
  type SourceGeometry,
} from "./board-art-geometry";
import type { RenderEntryKindV6 } from "./render-plan-v6";

export type AssetCoverageStatusV6 = "ACCEPTED" | "PLACEHOLDER";

export type AssetCoverageV6 =
  | {
      readonly status: "ACCEPTED";
      readonly semanticId: string;
      readonly assetId: string;
      readonly publicPath: string;
      readonly geometry: SourceGeometry;
      readonly production: true;
    }
  | {
      readonly status: "PLACEHOLDER";
      readonly semanticId: string;
      readonly label: string;
      readonly geometry: SourceGeometry;
      readonly production: false;
    };

export type RenderCoverageModeV6 = "CONTENT_ASSET" | "CODE_NATIVE";

/**
 * Every v6 render-plan arm has an explicit presentation owner. CONTENT_ASSET
 * arms resolve through the accepted/placeholder functions below. CODE_NATIVE
 * arms are intentionally drawn by Canvas and are not missing production art.
 */
export const RENDER_ENTRY_COVERAGE_V6 = {
  FOG: "CODE_NATIVE",
  TERRAIN: "CONTENT_ASSET",
  OWNERSHIP: "CODE_NATIVE",
  ROAD: "CONTENT_ASSET",
  RESOURCE: "CONTENT_ASSET",
  UNKNOWN_RESOURCE: "CODE_NATIVE",
  IMPROVEMENT: "CONTENT_ASSET",
  IMPROVEMENT_LEVEL: "CODE_NATIVE",
  CONTACT_SHADOW: "CODE_NATIVE",
  // Square Forest/Mountain sources combine the full ground and tall body, so
  // TERRAIN owns their one raster draw and this structural plan arm is a no-op.
  TERRAIN_BODY: "CODE_NATIVE",
  SITE: "CONTENT_ASSET",
  CHOCOLATE_WALL: "CONTENT_ASSET",
  CITY_BACK: "CONTENT_ASSET",
  UNIT: "CONTENT_ASSET",
  CITY_FRONT: "CODE_NATIVE",
  SELECTION: "CODE_NATIVE",
  CITY_TERRITORY_BOUNDARY: "CODE_NATIVE",
  MOVE_TARGET: "CODE_NATIVE",
  ATTACK_TARGET: "CODE_NATIVE",
  ROLL_TARGET: "CODE_NATIVE",
  ROLL_PATH: "CODE_NATIVE",
  HEAL_TARGET: "CODE_NATIVE",
  WALL_TARGET: "CODE_NATIVE",
  ABILITY_TARGET: "CODE_NATIVE",
  ECONOMIC_TARGET: "CODE_NATIVE",
  TRAIN_TARGET: "CODE_NATIVE",
  CHOICE_TARGET: "CODE_NATIVE",
  MOVE_PATH: "CODE_NATIVE",
  ECONOMIC_VALUE: "CODE_NATIVE",
  ECONOMIC_CONTRIBUTOR: "CODE_NATIVE",
  ECONOMIC_PAIR_AXIS: "CODE_NATIVE",
  UNIT_STATUS: "CODE_NATIVE",
  CHOCOLATE_WALL_STATUS: "CODE_NATIVE",
  CITY_STATUS: "CODE_NATIVE",
} as const satisfies Readonly<Record<RenderEntryKindV6, RenderCoverageModeV6>>;

export function terrainCoverageV6(
  terrain: TerrainIdV6,
  faction: FactionIdV6,
  variant: number,
): AssetCoverageV6 {
  if (terrain === "GRASS") {
    const normalized = positiveModulo(variant, 4) + 1;
    const candy = faction === "CANDY";
    return accepted(
      `terrain:${faction}:GRASS:${normalized}`,
      `terrain-square-${candy ? "candy" : "original"}-grass-${normalized}`,
      `assets/pixellab/terrain-square/${candy ? "candy" : "original"}-grass-${normalized}.png`,
      SQUARE_ART_GEOMETRY.ground,
    );
  }
  const candy = faction === "CANDY";
  if (terrain === "FOREST") {
    const normalized = positiveModulo(variant, 4) + 1;
    return accepted(
      `terrain:${faction}:FOREST:${normalized}`,
      `terrain-square-${candy ? "candy" : "original"}-forest-${normalized}`,
      `assets/pixellab/terrain-square/${candy ? "candy" : "original"}-forest-${normalized}.png`,
      SQUARE_ART_GEOMETRY.tallTerrain,
    );
  }
  const normalized = positiveModulo(variant, 3) + 1;
  return accepted(
    `terrain:${faction}:MOUNTAIN:${normalized}`,
    `terrain-square-${candy ? "candy" : "original"}-mountain-${normalized}`,
    `assets/pixellab/terrain-square/${candy ? "candy" : "original"}-mountain-${normalized}.png`,
    SQUARE_ART_GEOMETRY.tallTerrain,
  );
}

export function resourceCoverageV6(
  resource: ResourceId,
  faction: FactionIdV6,
): AssetCoverageV6 {
  const candy = faction === "CANDY";
  switch (resource) {
    case "FRUIT":
      return accepted(
        `resource:${faction}:FRUIT`,
        `terrain-square-${candy ? "candy" : "original"}-fruit`,
        `assets/pixellab/terrain-square/${candy ? "candy" : "original"}-fruit.png`,
        SQUARE_ART_GEOMETRY.resource,
      );
    case "GAME":
      return accepted(
        `resource:${faction}:GAME`,
        `terrain-square-${candy ? "candy" : "original"}-animal`,
        `assets/pixellab/terrain-square/${candy ? "candy" : "original"}-animal.png`,
        SQUARE_ART_GEOMETRY.resource,
      );
    case "ORE":
      return accepted(
        `resource:${faction}:ORE`,
        "terrain-square-ore",
        "assets/pixellab/terrain-square/ore.png",
        SQUARE_ART_GEOMETRY.resource,
      );
    case "FERTILE_GROUND":
      return accepted(
        `resource:${faction}:FERTILE_GROUND`,
        "terrain-square-fertile-ground",
        "assets/pixellab/terrain-square/fertile-ground.png",
        SQUARE_ART_GEOMETRY.resource,
      );
    case "STONE":
      return accepted(
        `resource:${faction}:STONE`,
        "terrain-square-stone",
        "assets/pixellab/terrain-square/stone.png",
        SQUARE_ART_GEOMETRY.resource,
      );
  }
}

export function improvementCoverageV6(
  improvement: EconomicImprovementId,
): AssetCoverageV6 {
  const contracts: Readonly<
    Record<
      EconomicImprovementId,
      {
        readonly assetId: string;
        readonly filename: string;
        readonly geometry: SourceGeometry;
      }
    >
  > = {
    FARM: {
      assetId: "building-square-farm",
      filename: "farm.png",
      geometry: SQUARE_ART_GEOMETRY.ground,
    },
    LUMBER_CAMP: {
      assetId: "building-square-lumber-camp",
      filename: "lumber-camp.png",
      geometry: SQUARE_ART_GEOMETRY.lowImprovement,
    },
    MINE: {
      assetId: "building-square-mine",
      filename: "mine.png",
      geometry: SQUARE_ART_GEOMETRY.lowImprovement,
    },
    QUARRY: {
      assetId: "building-square-quarry",
      filename: "quarry.png",
      geometry: SQUARE_ART_GEOMETRY.lowImprovement,
    },
    WINDMILL: processor("windmill"),
    SAWMILL: processor("sawmill"),
    FORGE: processor("forge"),
    STONEWORKS: processor("stoneworks"),
    WORKSHOP: processor("workshop"),
    GRAND_WORKS: processor("grand-works"),
    MARKET: processor("market"),
  };
  const contract = contracts[improvement];
  return accepted(
    `improvement:${improvement}`,
    contract.assetId,
    `assets/pixellab/buildings-square/${contract.filename}`,
    contract.geometry,
  );
}

/** Deterministic N/E/S/W mask over the accepted PixelLab Road material. */
export function roadCoverageV6(mask = 0): AssetCoverageV6 {
  if (!Number.isInteger(mask) || mask < 0 || mask > 15)
    throw new Error(`Invalid orthogonal Road mask ${mask}`);
  const bits = mask.toString(2).padStart(4, "0");
  return accepted(
    `infrastructure:ROAD:${bits}`,
    `terrain-square-road-mask-${bits}`,
    `assets/pixellab/terrain-square/road-masks/road-mask-${bits}.png`,
    SQUARE_ART_GEOMETRY.ground,
  );
}

export function siteCoverageV6(
  site: "CAPITAL" | "VILLAGE" | "CITY",
): AssetCoverageV6 {
  if (site === "VILLAGE") {
    return accepted(
      "site:VILLAGE",
      "building-village",
      "assets/pixellab/buildings/village.png",
      SETTLEMENT_ART_GEOMETRY.village,
    );
  }
  return placeholder(`site:${site}`, site, SETTLEMENT_ART_GEOMETRY.cities[1]);
}

export function cityCoverageV6(
  faction: FactionIdV6,
  level: number,
): AssetCoverageV6 {
  const artLevel = cityArtLevel(level);
  const candy = faction === "CANDY";
  return accepted(
    `city:${faction}:${artLevel}`,
    `building-${candy ? "candy-" : ""}city-${artLevel}`,
    `assets/pixellab/buildings/${candy ? "candy-" : ""}city-${artLevel}.png`,
    SETTLEMENT_ART_GEOMETRY.cities[artLevel],
  );
}

export function chocolateWallCoverageV6(): AssetCoverageV6 {
  return accepted(
    "structure:CANDY:CHOCOLATE_WALL",
    "building-chocolate-wall",
    "assets/pixellab/buildings/chocolate-wall.png",
    BOARD_ART_GEOMETRY.lowObject,
  );
}

const ACCEPTED_UNIT_ART: Readonly<
  Partial<
    Record<
      FactionIdV6,
      Partial<
        Record<
          UnitRoleId,
          { readonly assetId: string; readonly fileStem: string }
        >
      >
    >
  >
> = {
  ORIGINAL: {
    FIGHTER: { assetId: "unit-original-fighter", fileStem: "warrior" },
    SCOUT: { assetId: "unit-original-scout", fileStem: "original-scout" },
    MARKSMAN: { assetId: "unit-original-marksman", fileStem: "archer" },
    GUARD: { assetId: "unit-original-guard", fileStem: "defender" },
    RAIDER: { assetId: "unit-original-raider", fileStem: "rider" },
    MEDIC: { assetId: "unit-original-medic", fileStem: "original-medic" },
    HEAVY: { assetId: "unit-original-heavy", fileStem: "original-heavy" },
    BREACHER: {
      assetId: "unit-original-breacher",
      fileStem: "original-breacher",
    },
    JUGGERNAUT: {
      assetId: "unit-original-juggernaut",
      fileStem: "original-juggernaut",
    },
  },
  CANDY: {
    FIGHTER: { assetId: "unit-candy-fighter", fileStem: "candy-warrior" },
    SCOUT: { assetId: "unit-candy-scout", fileStem: "candy-jelly-scout" },
    MARKSMAN: {
      assetId: "unit-candy-marksman",
      fileStem: "candy-gumball-guard",
    },
    GUARD: {
      assetId: "unit-candy-guard",
      fileStem: "candy-choco-engineer",
    },
    RAIDER: { assetId: "unit-candy-raider", fileStem: "candy-donut" },
    MEDIC: {
      assetId: "unit-candy-medic",
      fileStem: "candy-marshmallow-medic",
    },
    HEAVY: { assetId: "unit-candy-heavy", fileStem: "candy-jawbreaker" },
    BREACHER: {
      assetId: "unit-candy-breacher",
      fileStem: "candy-crusher",
    },
    JUGGERNAUT: {
      assetId: "unit-candy-juggernaut",
      fileStem: "candy-sugar-titan",
    },
  },
};

export function unitCoverageV6(
  faction: FactionIdV6,
  role: UnitRoleId,
): AssetCoverageV6 {
  const geometry =
    role === "BREACHER"
      ? RULESET6_UNIT_ART_GEOMETRY.siege
      : role === "JUGGERNAUT"
        ? RULESET6_UNIT_ART_GEOMETRY.giant
        : RULESET6_UNIT_ART_GEOMETRY.standard;
  const art = ACCEPTED_UNIT_ART[faction]?.[role];
  if (art === undefined) {
    return placeholder(`unit:${faction}:${role}`, unitLabel(role), geometry);
  }
  return accepted(
    `unit:${faction}:${role}`,
    art.assetId,
    `assets/pixellab/units/${art.fileStem}.png`,
    geometry,
  );
}

function accepted(
  semanticId: string,
  assetId: string,
  publicPath: string,
  geometry: SourceGeometry,
): AssetCoverageV6 {
  return {
    status: "ACCEPTED",
    semanticId,
    assetId,
    publicPath,
    geometry,
    production: true,
  };
}

function placeholder(
  semanticId: string,
  label: string,
  geometry: SourceGeometry,
): AssetCoverageV6 {
  return {
    status: "PLACEHOLDER",
    semanticId,
    label,
    geometry,
    production: false,
  };
}

function processor(filename: string): {
  readonly assetId: string;
  readonly filename: string;
  readonly geometry: SourceGeometry;
} {
  return {
    assetId: `building-square-${filename}`,
    filename: `${filename}.png`,
    geometry: SQUARE_ART_GEOMETRY.processor,
  };
}

function unitLabel(role: UnitRoleId): string {
  const labels: Readonly<Record<UnitRoleId, string>> = {
    FIGHTER: "FTR",
    SCOUT: "SCT",
    MARKSMAN: "MRK",
    GUARD: "GRD",
    RAIDER: "RDR",
    MEDIC: "MED",
    HEAVY: "HVY",
    BREACHER: "BRCH",
    JUGGERNAUT: "JUGG",
  };
  return labels[role];
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
