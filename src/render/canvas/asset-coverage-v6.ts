import type {
  EconomicImprovementId,
  FactionIdV6,
  ResourceId,
  TerrainIdV6,
  UnitRoleId,
} from "../../engine/index";
import {
  BOARD_ART_GEOMETRY,
  ECONOMIC_ART_GEOMETRY,
  PLACEMENT_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  cityArtLevel,
  mountainGeometryForVariant,
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
  CONTACT_SHADOW: "CODE_NATIVE",
  TERRAIN_BODY: "CONTENT_ASSET",
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

const STANDARD_PLACEHOLDER_GEOMETRY = BOARD_ART_GEOMETRY.unit;

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
      `terrain-${candy ? "candy-" : ""}grass-${normalized}`,
      `assets/pixellab/terrain/${candy ? "candy-" : ""}grass-${normalized}.png`,
      BOARD_ART_GEOMETRY.ground,
    );
  }
  const candy = faction === "CANDY";
  if (terrain === "FOREST") {
    const normalized = positiveModulo(variant, 4) + 1;
    return accepted(
      `terrain:${faction}:FOREST:${normalized}`,
      `terrain-${candy ? "candy-" : ""}forest-${normalized}`,
      `assets/pixellab/terrain/${candy ? "candy-" : ""}forest-${normalized}.png`,
      PLACEMENT_ART_GEOMETRY.forest,
    );
  }
  const normalized = positiveModulo(variant, 3) + 1;
  return accepted(
    `terrain:${faction}:MOUNTAIN:${normalized}`,
    `terrain-${candy ? "candy-" : ""}mountain-${normalized}`,
    `assets/pixellab/terrain/${candy ? "candy-" : ""}mountain-${normalized}.png`,
    mountainGeometryForVariant(variant),
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
        candy ? "terrain-candy-fruit" : "terrain-fruit",
        `assets/pixellab/terrain/${candy ? "candy-" : ""}fruit.png`,
        PLACEMENT_ART_GEOMETRY.fruit,
      );
    case "GAME":
      return accepted(
        `resource:${faction}:GAME`,
        candy ? "terrain-candy-animal" : "terrain-game",
        `assets/pixellab/terrain/${candy ? "candy-" : ""}animal.png`,
        PLACEMENT_ART_GEOMETRY.animal,
      );
    case "ORE":
      return accepted(
        `resource:${faction}:ORE`,
        "terrain-ore",
        "assets/pixellab/terrain/ore.png",
        BOARD_ART_GEOMETRY.lowObject,
      );
    case "FERTILE_GROUND":
      return placeholder(
        `resource:${faction}:FERTILE_GROUND`,
        "FERTILE",
        BOARD_ART_GEOMETRY.lowObject,
      );
    case "STONE":
      return placeholder(
        `resource:${faction}:STONE`,
        "STONE",
        BOARD_ART_GEOMETRY.lowObject,
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
      assetId: "building-farm",
      filename: "farm.png",
      geometry: ECONOMIC_ART_GEOMETRY.low,
    },
    LUMBER_CAMP: {
      assetId: "building-lumber-camp",
      filename: "lumber-mill.png",
      geometry: ECONOMIC_ART_GEOMETRY.low,
    },
    MINE: {
      assetId: "building-ruleset6-mine",
      filename: "mine.png",
      geometry: ECONOMIC_ART_GEOMETRY.low,
    },
    QUARRY: {
      assetId: "building-quarry",
      filename: "quarry.png",
      geometry: ECONOMIC_ART_GEOMETRY.low,
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
    `assets/pixellab/buildings/${contract.filename}`,
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
    `terrain-road-mask-${bits}`,
    `assets/pixellab/terrain/road-masks/road-mask-${bits}.png`,
    BOARD_ART_GEOMETRY.ground,
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
  Partial<Record<FactionIdV6, Partial<Record<UnitRoleId, string>>>>
> = {
  ORIGINAL: {
    FIGHTER: "warrior",
    MARKSMAN: "archer",
    GUARD: "defender",
    RAIDER: "rider",
  },
  CANDY: {
    FIGHTER: "candy-warrior",
    MARKSMAN: "candy-gumball-guard",
    GUARD: "candy-choco-engineer",
    RAIDER: "candy-donut",
  },
};

export function unitCoverageV6(
  faction: FactionIdV6,
  role: UnitRoleId,
): AssetCoverageV6 {
  const geometry =
    role === "BREACHER"
      ? BOARD_ART_GEOMETRY.siegeUnit
      : role === "JUGGERNAUT"
        ? BOARD_ART_GEOMETRY.giantUnit
        : faction === "CANDY" && role === "FIGHTER"
          ? PLACEMENT_ART_GEOMETRY.candyWarrior
          : STANDARD_PLACEHOLDER_GEOMETRY;
  const fileStem = ACCEPTED_UNIT_ART[faction]?.[role];
  if (fileStem === undefined) {
    return placeholder(`unit:${faction}:${role}`, unitLabel(role), geometry);
  }
  return accepted(
    `unit:${faction}:${role}`,
    `unit-${fileStem}`,
    `assets/pixellab/units/${fileStem}.png`,
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
    assetId: `building-${filename}`,
    filename: `${filename}.png`,
    geometry: ECONOMIC_ART_GEOMETRY.processor,
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
