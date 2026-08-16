import type { UnitState } from "../../engine/index";
import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  CODE_NATIVE_PLACEHOLDER_ASSETS,
  type BoardAssetBindings,
  type DrawAssetOptions,
} from "./asset-bindings";
import { TILE_HEIGHT, TILE_WIDTH, type Point } from "./geometry";

export interface SourceGeometry {
  readonly width: number;
  readonly height: number;
  readonly anchor: Point;
  readonly displayScale: number;
  readonly lowerDiamondClip?: boolean;
}

export interface DestinationRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const BOARD_ART_GEOMETRY = {
  ground: {
    width: 256,
    height: 148,
    anchor: { x: 128, y: 74 },
    displayScale: 0.5,
  },
  lowObject: {
    width: 256,
    height: 296,
    anchor: { x: 128, y: 222 },
    displayScale: 0.5,
  },
  unit: {
    width: 256,
    height: 296,
    anchor: { x: 128, y: 222 },
    displayScale: 0.35,
  },
  siegeUnit: {
    width: 384,
    height: 384,
    anchor: { x: 192, y: 288 },
    displayScale: 0.3,
  },
} as const satisfies Readonly<Record<string, SourceGeometry>>;

/**
 * The accepted mountain silhouettes do not share one useful footprint.
 * Variants 1/2 are broad while variant 3 has a taller, flat base, so each is
 * calibrated independently. The lower-diamond clip is a deterministic runtime
 * safety boundary: peaks may overhang above the tile, but no foreground alpha
 * may paint into the tile below it.
 */
export const MOUNTAIN_ART_GEOMETRY = Object.freeze([
  {
    width: 256,
    height: 296,
    anchor: { x: 128, y: 179 },
    displayScale: 0.42,
    lowerDiamondClip: true,
  },
  {
    width: 256,
    height: 296,
    anchor: { x: 128, y: 179 },
    displayScale: 0.42,
    lowerDiamondClip: true,
  },
  {
    width: 256,
    height: 296,
    anchor: { x: 128, y: 186 },
    displayScale: 0.4,
    lowerDiamondClip: true,
  },
] as const satisfies readonly SourceGeometry[]);

export const SETTLEMENT_ART_GEOMETRY = {
  village: {
    width: 256,
    height: 296,
    anchor: { x: 128, y: 176 },
    displayScale: 0.5,
  },
  cities: {
    1: {
      width: 384,
      height: 384,
      anchor: { x: 192, y: 236 },
      displayScale: 0.3,
    },
    2: {
      width: 384,
      height: 384,
      anchor: { x: 192, y: 243 },
      displayScale: 0.3,
    },
    3: {
      width: 384,
      height: 384,
      anchor: { x: 192, y: 243 },
      displayScale: 0.3,
    },
  },
} as const;

export function mountainGeometryForVariant(variant: number): SourceGeometry {
  const index =
    ((variant % MOUNTAIN_ART_GEOMETRY.length) + MOUNTAIN_ART_GEOMETRY.length) %
    MOUNTAIN_ART_GEOMETRY.length;
  return MOUNTAIN_ART_GEOMETRY[index] ?? MOUNTAIN_ART_GEOMETRY[0];
}

export function cityArtLevel(level: number): 1 | 2 | 3 {
  return Math.max(1, Math.min(3, level)) as 1 | 2 | 3;
}

export function anchoredDestinationRect(
  center: Point,
  zoom: number,
  geometry: SourceGeometry,
): DestinationRect {
  const scale = geometry.displayScale * zoom;
  return {
    x: center.x - geometry.anchor.x * scale,
    y: center.y - geometry.anchor.y * scale,
    width: geometry.width * scale,
    height: geometry.height * scale,
  };
}

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
    id: string,
    options: DrawAssetOptions,
    geometry: SourceGeometry,
    fallback: () => void,
    ownerVariant = false,
  ): void => {
    const image = imageFor(id);
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
    drawGrass(context, options): void {
      draw(
        context,
        `terrain-grass-${(options.variant % 4) + 1}`,
        options,
        BOARD_ART_GEOMETRY.ground,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawGrass(context, options),
      );
    },
    drawMountain(context, options): void {
      const geometry = mountainGeometryForVariant(options.variant);
      draw(
        context,
        `terrain-mountain-${(options.variant % 3) + 1}`,
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
    drawFruit(context, options): void {
      CODE_NATIVE_PLACEHOLDER_ASSETS.drawFruit(context, options);
    },
    drawAnimal(context, options): void {
      draw(
        context,
        "terrain-animal",
        options,
        BOARD_ART_GEOMETRY.lowObject,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawAnimal(context, options),
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
    drawForest(context, options): void {
      draw(
        context,
        `terrain-forest-${(options.variant % 4) + 1}`,
        options,
        BOARD_ART_GEOMETRY.lowObject,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawForest(context, options),
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
    drawCityBack(context, options, city): void {
      const artLevel = cityArtLevel(city.level);
      draw(
        context,
        `building-city-${artLevel}`,
        options,
        SETTLEMENT_ART_GEOMETRY.cities[artLevel],
        () =>
          CODE_NATIVE_PLACEHOLDER_ASSETS.drawCityBack(context, options, city),
        true,
      );
    },
    drawCityFront(context, options, city): void {
      const artLevel = cityArtLevel(city.level);
      if (imageFor(`building-city-${artLevel}`) === null)
        CODE_NATIVE_PLACEHOLDER_ASSETS.drawCityFront(context, options, city);
    },
    drawUnit(context, options, unit): void {
      draw(
        context,
        unitArtId(unit.type),
        options,
        unit.type === "CATAPULT"
          ? BOARD_ART_GEOMETRY.siegeUnit
          : BOARD_ART_GEOMETRY.unit,
        () => CODE_NATIVE_PLACEHOLDER_ASSETS.drawUnit(context, options, unit),
      );
    },
    drawUnitOwnerCue(context, options, unit): void {
      CODE_NATIVE_PLACEHOLDER_ASSETS.drawUnitOwnerCue(context, options, unit);
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
    destination.x,
    destination.y,
    destination.width,
    Math.max(0, center.y - destination.y),
  );
  context.moveTo(center.x - (TILE_WIDTH / 2) * zoom, center.y);
  context.lineTo(center.x, center.y + (TILE_HEIGHT / 2) * zoom);
  context.lineTo(center.x + (TILE_WIDTH / 2) * zoom, center.y);
  context.closePath();
  context.clip();
}

function unitArtId(type: UnitState["type"]): string {
  return `unit-${type.toLowerCase()}`;
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
  "terrain-grass-1",
  "terrain-grass-2",
  "terrain-grass-3",
  "terrain-grass-4",
  "terrain-mountain-1",
  "terrain-mountain-2",
  "terrain-mountain-3",
  "terrain-ore",
  "building-village",
  "building-city-1",
  "building-city-2",
  "building-city-3",
  "building-mine",
] as const);

/** Recipe-backed slots that deliberately remain fallback-only until accepted. */
export const PIXELLAB_PENDING_BOARD_ART_IDS = Object.freeze([
  "unit-catapult",
  "terrain-forest-1",
  "terrain-forest-2",
  "terrain-forest-3",
  "terrain-forest-4",
  "terrain-animal",
  "building-lumber-mill",
] as const);
