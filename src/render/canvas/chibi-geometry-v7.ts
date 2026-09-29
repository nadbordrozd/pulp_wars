import {
  CHIBI_TILE_CSS_PX,
  chibiAnchorV7,
  type ChibiArtAssetV7,
} from "../../assets/chibi-art-v7";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  screenToWorld,
  type CameraState,
  type Point,
  type Size,
  type WorldBounds,
} from "./geometry";

/**
 * CHIBI geometry for Ruleset 7. World coordinates keep the shared 128-unit
 * square projection, so picking, sorting and every legacy overlay stay
 * untouched. A chibi zoom step maps onto the camera scale that makes one
 * cell exactly 80 CSS px at step 1: camera.zoom = step * 80 / 128.
 */
export const CHIBI_ZOOM_STEPS = [0.75, 1, 1.5, 2] as const;
export type ChibiZoomStepV7 = (typeof CHIBI_ZOOM_STEPS)[number];
export const CHIBI_MIN_ZOOM_STEP: ChibiZoomStepV7 = 0.75;
export const CHIBI_DEFAULT_ZOOM_STEP: ChibiZoomStepV7 = 1;
export const CHIBI_WORLD_SCALE = CHIBI_TILE_CSS_PX / TILE_WIDTH;

/** City side overflow (8 px) and upward overflow (24 px) at step 1, in world units. */
const CHIBI_SIDE_BOUND = 8 / CHIBI_WORLD_SCALE;
const CHIBI_TOP_BOUND = 24 / CHIBI_WORLD_SCALE;

export function chibiCameraZoom(step: ChibiZoomStepV7): number {
  return step * CHIBI_WORLD_SCALE;
}

/** CSS pixels drawn per DPR-1 master pixel; equals the zoom step. */
export function chibiMasterScale(camera: CameraState): number {
  return camera.zoom / CHIBI_WORLD_SCALE;
}

export function chibiTileCssPx(camera: CameraState): number {
  return TILE_WIDTH * camera.zoom;
}

/** Nearest discrete step in log space, so pinch and restore never drift. */
export function nearestChibiZoomStep(step: number): ChibiZoomStepV7 {
  let best: ChibiZoomStepV7 = CHIBI_DEFAULT_ZOOM_STEP;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of CHIBI_ZOOM_STEPS) {
    const distance = Math.abs(Math.log(candidate) - Math.log(step));
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export function chibiZoomStepForCamera(camera: CameraState): ChibiZoomStepV7 {
  return nearestChibiZoomStep(chibiMasterScale(camera));
}

export function adjacentChibiZoomStep(
  current: ChibiZoomStepV7,
  direction: "IN" | "OUT",
): ChibiZoomStepV7 {
  const index = CHIBI_ZOOM_STEPS.indexOf(current);
  const next = Math.max(
    0,
    Math.min(
      CHIBI_ZOOM_STEPS.length - 1,
      index + (direction === "IN" ? 1 : -1),
    ),
  );
  return CHIBI_ZOOM_STEPS[next] ?? current;
}

export function chibiBoardWorldBounds(board: Size): WorldBounds {
  return {
    left: -TILE_WIDTH / 2 - CHIBI_SIDE_BOUND,
    top: -TILE_HEIGHT / 2 - CHIBI_TOP_BOUND,
    right: (board.width - 1) * TILE_WIDTH + TILE_WIDTH / 2 + CHIBI_SIDE_BOUND,
    bottom: (board.height - 1) * TILE_HEIGHT + TILE_HEIGHT / 2,
  };
}

/**
 * Largest step no greater than the normal play view (1) that shows the whole
 * board; never below 0.75, so larger boards scroll instead.
 */
export function fitChibiZoomStep(board: Size, viewport: Size): ChibiZoomStepV7 {
  const bounds = chibiBoardWorldBounds(board);
  const fit =
    Math.min(
      (viewport.width * 0.94) / (bounds.right - bounds.left),
      (viewport.height * 0.92) / (bounds.bottom - bounds.top),
    ) / CHIBI_WORLD_SCALE;
  let chosen: ChibiZoomStepV7 = CHIBI_MIN_ZOOM_STEP;
  for (const step of CHIBI_ZOOM_STEPS)
    if (step <= CHIBI_DEFAULT_ZOOM_STEP && step <= fit + 1e-9) chosen = step;
  return chosen;
}

export function fitChibiCamera(board: Size, viewport: Size): CameraState {
  const bounds = chibiBoardWorldBounds(board);
  const zoom = chibiCameraZoom(fitChibiZoomStep(board, viewport));
  return {
    zoom,
    offsetX: viewport.width / 2 - ((bounds.left + bounds.right) / 2) * zoom,
    offsetY: viewport.height / 2 - ((bounds.top + bounds.bottom) / 2) * zoom,
  };
}

/** Zooms to an exact step about a fixed screen point without legacy clamping. */
export function zoomChibiCameraAt(
  camera: CameraState,
  step: ChibiZoomStepV7,
  fixedScreenPoint: Point,
): CameraState {
  const zoom = chibiCameraZoom(step);
  const fixedWorldPoint = screenToWorld(fixedScreenPoint, camera);
  return {
    zoom,
    offsetX: fixedScreenPoint.x - fixedWorldPoint.x * zoom,
    offsetY: fixedScreenPoint.y - fixedWorldPoint.y * zoom,
  };
}

/** Rounds the camera offset to whole device pixels so every cell edge is crisp. */
export function snapCameraToDevicePixels(
  camera: CameraState,
  devicePixelRatio: number,
): CameraState {
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    zoom: camera.zoom,
    offsetX: Math.round(camera.offsetX * ratio) / ratio,
    offsetY: Math.round(camera.offsetY * ratio) / ratio,
  };
}

export function isWholeScale(value: number): boolean {
  return Math.abs(value - Math.round(value)) < 1e-6 && Math.round(value) >= 1;
}

export interface ChibiRasterChoiceV7 {
  readonly url: string;
  readonly density: 1 | 2 | 3;
  /** Smoothing stays off unless the remaining scale is fractional (zoom 0.75). */
  readonly smoothing: boolean;
}

/**
 * Picks the master or a manifest x2/x3 variant for a device scale (master
 * pixels per device pixel). Whole scales draw nearest-neighbour from the
 * densest variant that divides them; fractional scales use the master.
 */
export function chibiRasterForDeviceScale(
  asset: ChibiArtAssetV7,
  deviceScale: number,
): ChibiRasterChoiceV7 {
  if (isWholeScale(deviceScale)) {
    const whole = Math.round(deviceScale);
    for (const density of [3, 2] as const) {
      const url = asset.densityUrls?.[density];
      if (url !== undefined && whole % density === 0)
        return { url, density, smoothing: false };
    }
    return { url: asset.url, density: 1, smoothing: false };
  }
  return { url: asset.url, density: 1, smoothing: true };
}

export interface ChibiDestinationRectV7 {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * A chibi unit standing on a settlement centre (a city or a village) is
 * drawn at this fraction of its normal size, so the settlement it covers
 * stays readable (chibi direction section 3).
 */
export const CHIBI_GARRISON_SCALE = 0.75;
/**
 * The garrisoned unit's right canvas edge, in world units from the cell
 * centre (128 = one cell): the left edge of the city's population pip
 * column in the CHIBI overlay frame, so the unit never covers the pips.
 */
export const CHIBI_GARRISON_RIGHT = 46;

/**
 * CSS-pixel destination of a chibi unit on a settlement centre: scaled by
 * CHIBI_GARRISON_SCALE, its canvas bottom on the cell's bottom edge (where
 * a bottom-centred unit stands) and its right edge at CHIBI_GARRISON_RIGHT,
 * so the unit stands in the front-right of the cell and the settlement's
 * left side, roofs and upward overflow stay visible. The origin snaps to a
 * whole device pixel like chibiDestinationRect (x rounds down).
 */
export function chibiGarrisonDestinationRect(
  cellCentre: Point,
  camera: CameraState,
  asset: ChibiArtAssetV7,
  devicePixelRatio: number,
): ChibiDestinationRectV7 {
  const scale = chibiMasterScale(camera);
  const width = asset.width * scale * CHIBI_GARRISON_SCALE;
  const height = asset.height * scale * CHIBI_GARRISON_SCALE;
  const anchor = chibiAnchorV7(asset);
  const bottom = cellCentre.y + (asset.height - anchor.y) * scale;
  const right = cellCentre.x + CHIBI_GARRISON_RIGHT * camera.zoom;
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    // Floor, so snapping never pushes the unit into the pip column.
    x: Math.floor((right - width) * ratio) / ratio,
    y: Math.round((bottom - height) * ratio) / ratio,
    width,
    height,
  };
}

/**
 * CSS-pixel destination of a chibi master: the anchor lands on the cell
 * centre, the size is master x step, and the origin snaps to a whole device
 * pixel so integer scales stay nearest-neighbour exact.
 */
export function chibiDestinationRect(
  cellCentre: Point,
  camera: CameraState,
  asset: ChibiArtAssetV7,
  devicePixelRatio: number,
): ChibiDestinationRectV7 {
  const scale = chibiMasterScale(camera);
  const anchor = chibiAnchorV7(asset);
  const ratio = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return {
    x: Math.round((cellCentre.x - anchor.x * scale) * ratio) / ratio,
    y: Math.round((cellCentre.y - anchor.y * scale) * ratio) / ratio,
    width: asset.width * scale,
    height: asset.height * scale,
  };
}
