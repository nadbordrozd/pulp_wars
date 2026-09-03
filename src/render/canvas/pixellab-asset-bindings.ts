import type { FactionId, UnitState } from "../../engine/index";
import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  CODE_NATIVE_PLACEHOLDER_ASSETS,
  type BoardAssetBindings,
  type DrawAssetOptions,
} from "./asset-bindings";
import {
  BOARD_ART_GEOMETRY,
  PLACEMENT_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  anchoredDestinationRect,
  cityArtLevel,
  mountainGeometryForVariant,
  type DestinationRect,
  type SourceGeometry,
} from "./board-art-geometry";
import { TILE_HEIGHT, TILE_WIDTH } from "./geometry";

export {
  BOARD_ART_GEOMETRY,
  MOUNTAIN_ART_GEOMETRY,
  PLACEMENT_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  UNIT_SCALE_CONTRACT,
  anchoredDestinationRect,
  cityArtLevel,
  mountainGeometryForVariant,
  type DestinationRect,
  type SourceGeometry,
  type UnitScaleClassContract,
} from "./board-art-geometry";

interface LoadedImage {
  readonly image: HTMLImageElement;
  status: "LOADING" | "READY" | "ERROR";
}

/**
 * Accepted PixelLab art binding. Images load lazily behind the renderer's
 * swappable asset boundary; a missing, rejected, or failed image draws the
 * existing code-native asset instead.
 */
export function createPixelLabAssetBindings(
  documentRoot: Document,
  requestRedraw: () => void = () => {},
): BoardAssetBindings {
  const images = new Map<string, LoadedImage>();

  const imageFor = (id: string): HTMLImageElement | null => {
    const url = ACCEPTED_ART_URLS[id];
    if (url === undefined) return null;
    let loaded = images.get(id);
    if (loaded === undefined) {
      const image = documentRoot.createElement("img");
      image.alt = "";
      image.decoding = "async";
      loaded = { image, status: "LOADING" };
      images.set(id, loaded);
      image.addEventListener("load", () => {
        const current = images.get(id);
        if (current === undefined) return;
        current.status = "READY";
        requestRedraw();
      });
      image.addEventListener("error", () => {
        const current = images.get(id);
        if (current === undefined) return;
        current.status = "ERROR";
        requestRedraw();
      });
      image.src = url;
    }
    return loaded.status === "READY" ? loaded.image : null;
  };

  const draw = (
    context: CanvasRenderingContext2D,
    ids: string | readonly string[],
    options: DrawAssetOptions,
    geometry: SourceGeometry,
    fallback: () => void,
    ownerVariant = false,
  ): void => {
    const candidates = typeof ids === "string" ? [ids] : ids;
    const image =
      candidates
        .map((id) => imageFor(id))
        .find(
          (candidate): candidate is HTMLImageElement => candidate !== null,
        ) ?? null;
    if (image === null) {
      fallback();
      return;
    }
    const destination = anchoredDestinationRect(
      options.center,
      options.zoom,
      geometry,
    );
    if (geometry.lowerDiamondClip === true) {
      context.save();
      clipToTileUpperPlaneAndLowerDiamond(context, options, destination);
    }
    context.drawImage(
      image,
      destination.x,
      destination.y,
      destination.width,
      destination.height,
    );
    if (geometry.lowerDiamondClip === true) context.restore();
    if (ownerVariant) drawOwnerStripe(context, options);
  };

  return {
    drawGrass(context, options, faction = "ORIGINAL"): void {
      const variant = (options.variant % 4) + 1;
      CODE_NATIVE_PLACEHOLDER_ASSETS.drawGrass(context, options);
      draw(
        context,
        faction === "CANDY"
          ? [`terrain-candy-grass-${variant}`, `terrain-grass-${variant}`]
          : `terrain-grass-${variant}`,
        options,
        BOARD_ART_GEOMETRY.ground,
        () => {},
      );
    },
    drawMountain(context, options, faction = "ORIGINAL"): void {
      const geometry = mountainGeometryForVariant(options.variant);
      const variant = (options.variant % 3) + 1;
      draw(
        context,
        faction === "CANDY"
          ? [`terrain-candy-mountain-${variant}`, `terrain-mountain-${variant}`]
          : `terrain-mountain-${variant}`,
        options,
        geometry,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawMountain(context, options),
      );
    },
    drawOre(context, options): void {
      draw(context, "terrain-ore", options, BOARD_ART_GEOMETRY.lowObject, () =>
        CODE_NATIVE_PLACEHOLDER_ASSETS.drawOre(context, options),
      );
    },
    drawFruit(context, options, faction = "ORIGINAL"): void {
      draw(
        context,
        faction === "CANDY"
          ? ["terrain-candy-fruit", "terrain-fruit"]
          : "terrain-fruit",
        options,
        PLACEMENT_ART_GEOMETRY.fruit,
        () =>
          CODE_NATIVE_PLACEHOLDER_ASSETS.drawFruit(
            context,
            offsetFallbackOptions(options, PLACEMENT_ART_GEOMETRY.fruit),
          ),
      );
    },
    drawAnimal(context, options, faction = "ORIGINAL"): void {
      draw(
        context,
        faction === "CANDY"
          ? ["terrain-candy-animal", "terrain-animal"]
          : "terrain-animal",
        options,
        PLACEMENT_ART_GEOMETRY.animal,
        () =>
          CODE_NATIVE_PLACEHOLDER_ASSETS.drawAnimal(
            context,
            offsetFallbackOptions(options, PLACEMENT_ART_GEOMETRY.animal),
          ),
      );
    },
    drawMine(context, options): void {
      draw(
        context,
        "building-mine",
        options,
        BOARD_ART_GEOMETRY.lowObject,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawMine(context, options),
      );
    },
    drawLumberMill(context, options): void {
      draw(
        context,
        "building-lumber-mill",
        options,
        BOARD_ART_GEOMETRY.lowObject,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawLumberMill(context, options),
      );
    },
    drawChocolateWall(context, options): void {
      draw(
        context,
        "building-chocolate-wall",
        options,
        BOARD_ART_GEOMETRY.lowObject,
        () =>
          CODE_NATIVE_PLACEHOLDER_ASSETS.drawChocolateWall(context, options),
        true,
      );
    },
    drawForest(context, options, faction = "ORIGINAL"): void {
      const variant = (options.variant % 4) + 1;
      draw(
        context,
        faction === "CANDY"
          ? [`terrain-candy-forest-${variant}`, `terrain-forest-${variant}`]
          : `terrain-forest-${variant}`,
        options,
        PLACEMENT_ART_GEOMETRY.forest,
        () =>
          CODE_NATIVE_PLACEHOLDER_ASSETS.drawForest(
            context,
            offsetFallbackOptions(options, PLACEMENT_ART_GEOMETRY.forest),
          ),
      );
    },
    drawVillage(context, options): void {
      draw(
        context,
        "building-village",
        options,
        SETTLEMENT_ART_GEOMETRY.village,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawVillage(context, options),
      );
    },
    drawCityBack(context, options, city, faction = "ORIGINAL"): void {
      const artLevel = cityArtLevel(city.level);
      draw(
        context,
        faction === "CANDY"
          ? [`building-candy-city-${artLevel}`, `building-city-${artLevel}`]
          : `building-city-${artLevel}`,
        options,
        SETTLEMENT_ART_GEOMETRY.cities[artLevel],
        () =>
          CODE_NATIVE_PLACEHOLDER_ASSETS.drawCityBack(context, options, city),
        true,
      );
    },
    drawCityFront(context, options, city, faction = "ORIGINAL"): void {
      const artLevel = cityArtLevel(city.level);
      const candidates =
        faction === "CANDY"
          ? [`building-candy-city-${artLevel}`, `building-city-${artLevel}`]
          : [`building-city-${artLevel}`];
      if (candidates.every((id) => imageFor(id) === null))
        CODE_NATIVE_PLACEHOLDER_ASSETS.drawCityFront(context, options, city);
    },
    drawUnit(context, options, unit, faction = "ORIGINAL"): void {
      const geometry =
        faction === "CANDY" && unit.type === "WARRIOR"
          ? PLACEMENT_ART_GEOMETRY.candyWarrior
          : unit.type === "CATAPULT"
            ? BOARD_ART_GEOMETRY.siegeUnit
            : BOARD_ART_GEOMETRY.unit;
      draw(context, unitArtId(unit.type, faction), options, geometry, () =>
        CODE_NATIVE_PLACEHOLDER_ASSETS.drawUnit(
          context,
          offsetFallbackOptions(options, geometry),
          unit,
        ),
      );
    },
    drawUnitOwnerCue(context, options, unit): void {
      CODE_NATIVE_PLACEHOLDER_ASSETS.drawUnitOwnerCue(context, options, unit);
    },
  };
}

function offsetFallbackOptions(
  options: DrawAssetOptions,
  geometry: SourceGeometry,
): DrawAssetOptions {
  if (geometry.offsetY === undefined) return options;
  return {
    ...options,
    center: {
      ...options.center,
      y: options.center.y + geometry.offsetY * options.zoom,
    },
  };
}

function clipToTileUpperPlaneAndLowerDiamond(
  context: CanvasRenderingContext2D,
  options: DrawAssetOptions,
  destination: DestinationRect,
): void {
  const { center, zoom } = options;
  context.beginPath();
  context.rect(
    center.x - (TILE_WIDTH / 2) * zoom,
    destination.y,
    TILE_WIDTH * zoom,
    Math.max(0, center.y + (TILE_HEIGHT / 2) * zoom - destination.y),
  );
  context.clip();
}

function unitArtId(type: UnitState["type"], faction: FactionId): string {
  if (type === "CATAPULT" || faction === "ORIGINAL")
    return `unit-${type.toLowerCase()}`;
  return type === "WARRIOR"
    ? "unit-candy-warrior"
    : type === "ARCHER"
      ? "unit-candy-gumball-guard"
      : type === "DEFENDER"
        ? "unit-candy-choco-engineer"
        : "unit-candy-donut";
}

function drawOwnerStripe(
  context: CanvasRenderingContext2D,
  options: DrawAssetOptions,
): void {
  if (options.ownerColor === null) return;
  const { center, zoom, ownerColor } = options;
  context.save();
  context.fillStyle = ownerColor;
  context.strokeStyle = "#19282a";
  context.lineWidth = Math.max(1, 1.5 * zoom);
  context.beginPath();
  context.moveTo(center.x - 29 * zoom, center.y - 7 * zoom);
  context.lineTo(center.x - 20 * zoom, center.y - 12 * zoom);
  context.lineTo(center.x - 11 * zoom, center.y - 7 * zoom);
  context.lineTo(center.x - 20 * zoom, center.y - 2 * zoom);
  context.closePath();
  context.fill();
  context.stroke();
  context.restore();
}

export const PIXELLAB_BOARD_ART_IDS = Object.freeze([
  "unit-warrior",
  "unit-archer",
  "unit-defender",
  "unit-rider",
  "unit-catapult",
  "unit-candy-warrior",
  "unit-candy-gumball-guard",
  "unit-candy-choco-engineer",
  "unit-candy-donut",
  "terrain-grass-1",
  "terrain-grass-2",
  "terrain-grass-3",
  "terrain-grass-4",
  "terrain-candy-grass-1",
  "terrain-candy-grass-2",
  "terrain-candy-grass-3",
  "terrain-candy-grass-4",
  "terrain-mountain-1",
  "terrain-mountain-2",
  "terrain-mountain-3",
  "terrain-candy-mountain-1",
  "terrain-candy-mountain-2",
  "terrain-candy-mountain-3",
  "terrain-ore",
  "terrain-fruit",
  "terrain-candy-fruit",
  "terrain-forest-1",
  "terrain-forest-2",
  "terrain-forest-3",
  "terrain-forest-4",
  "terrain-candy-forest-1",
  "terrain-candy-forest-2",
  "terrain-candy-forest-3",
  "terrain-candy-forest-4",
  "terrain-animal",
  "terrain-candy-animal",
  "building-village",
  "building-city-1",
  "building-city-2",
  "building-city-3",
  "building-candy-city-1",
  "building-candy-city-2",
  "building-candy-city-3",
  "building-mine",
  "building-lumber-mill",
  "building-chocolate-wall",
] as const);

/** Recipe-backed board slots that are still awaiting accepted production art. */
export const PIXELLAB_PENDING_BOARD_ART_IDS = Object.freeze([] as const);
