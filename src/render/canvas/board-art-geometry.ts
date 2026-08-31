import { TILE_HEIGHT, TILE_WIDTH, type Point } from "./geometry";

export interface SourceGeometry {
  readonly width: number;
  readonly height: number;
  readonly anchor: Point;
  readonly displayScale: number;
  /** Cosmetic screen-space placement only; the source contact anchor is unchanged. */
  readonly offsetY?: number;
  readonly lowerDiamondClip?: boolean;
}

export interface DestinationRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface UnitScaleClassContract {
  readonly displayScale: number;
  readonly preferredVisibleWidthRatio: readonly [number, number];
  readonly maximumVisibleWidthRatio: number;
  readonly preferredVisibleHeightRatio: readonly [number, number];
  readonly maximumVisibleHeightRatio: number;
  readonly maximumOpaqueDiamondAreaRatio: number | null;
  readonly maximumRearTileOcclusionRatio: number;
}

/**
 * Nominal 128 x 74 tile occupancy is an art/rendering contract only. Ratios are
 * measured from non-zero source alpha after applying the class display scale.
 * Rear occlusion is alpha-weighted coverage of either immediately rear/above
 * adjacent projected diamond (logical NORTH or WEST); camera zoom and DPR
 * scale both sprite and diamond together, so the ratios remain invariant.
 */
export const UNIT_SCALE_CONTRACT = {
  tile: { width: TILE_WIDTH, height: TILE_HEIGHT },
  standard: {
    displayScale: 0.25,
    preferredVisibleWidthRatio: [0.28, 0.44],
    maximumVisibleWidthRatio: 0.48,
    preferredVisibleHeightRatio: [0.66, 0.8],
    maximumVisibleHeightRatio: 0.84,
    maximumOpaqueDiamondAreaRatio: 0.45,
    maximumRearTileOcclusionRatio: 0.08,
  },
  siege: {
    displayScale: 0.24,
    preferredVisibleWidthRatio: [0.5, 0.61],
    maximumVisibleWidthRatio: 0.66,
    preferredVisibleHeightRatio: [0.75, 0.95],
    maximumVisibleHeightRatio: 1.04,
    maximumOpaqueDiamondAreaRatio: 0.58,
    maximumRearTileOcclusionRatio: 0.12,
  },
  giant: {
    displayScale: 0.25,
    preferredVisibleWidthRatio: [0.58, 0.66],
    maximumVisibleWidthRatio: 0.72,
    preferredVisibleHeightRatio: [1, 1.23],
    maximumVisibleHeightRatio: 1.35,
    maximumOpaqueDiamondAreaRatio: null,
    maximumRearTileOcclusionRatio: 0.18,
  },
} as const satisfies {
  readonly tile: { readonly width: number; readonly height: number };
  readonly standard: UnitScaleClassContract;
  readonly siege: UnitScaleClassContract;
  readonly giant: UnitScaleClassContract;
};

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
    displayScale: UNIT_SCALE_CONTRACT.standard.displayScale,
  },
  siegeUnit: {
    width: 384,
    height: 384,
    anchor: { x: 192, y: 288 },
    displayScale: UNIT_SCALE_CONTRACT.siege.displayScale,
  },
  giantUnit: {
    width: 384,
    height: 448,
    anchor: { x: 192, y: 336 },
    displayScale: UNIT_SCALE_CONTRACT.giant.displayScale,
  },
} as const satisfies Readonly<Record<string, SourceGeometry>>;

/**
 * Placement corrections for accepted silhouettes that otherwise sit visibly
 * high over their owning tile. Source anchors remain authoritative.
 */
export const PLACEMENT_ART_GEOMETRY = {
  forest: {
    ...BOARD_ART_GEOMETRY.lowObject,
    offsetY: 23,
  },
  animal: {
    ...BOARD_ART_GEOMETRY.lowObject,
    offsetY: 23,
  },
  fruit: {
    ...BOARD_ART_GEOMETRY.lowObject,
    offsetY: 23,
  },
  candyWarrior: {
    ...BOARD_ART_GEOMETRY.unit,
    offsetY: 7.5,
  },
} as const satisfies Readonly<Record<string, SourceGeometry>>;

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
    y: center.y - geometry.anchor.y * scale + (geometry.offsetY ?? 0) * zoom,
    width: geometry.width * scale,
    height: geometry.height * scale,
  };
}
