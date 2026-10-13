/**
 * The playback camera (bead pulp_wars-2yc.49). Pure: where the camera
 * should rest for another player's event, and how it glides there.
 *
 * - The comfort zone: the map region the HUD and the dock leave free, inset
 *   by 15% on every side. While an event's tiles are inside it the camera
 *   does not move at all, so a cluster of moves plays on a still map.
 * - An event outside it is framed once: centred in the region together
 *   with as many of the events still to play as fit the zone with it,
 *   without showing more of the void beyond the board's edge than it must.
 * - The glide is a critically damped spring in closed form over a clock
 *   the caller owns: it starts from rest, never overshoots from rest, and
 *   takes longer the further it travels, within fixed bounds.
 *
 * The zoom never changes. The host decides when to ask (never for a player
 * who took the camera, never for an event the fog hides: those have no
 * steps) and whether to glide or cut (reduced motion cuts).
 */
import type { CoordV7 } from "../../engine/index";
import {
  TILE_HEIGHT,
  TILE_WIDTH,
  type CameraState,
  type Point,
  type ScreenBand,
  type Size,
  type WorldBounds,
} from "./geometry";
import type { CorePresentationStepV7 } from "./presentation-plan-v7";

/** The comfort zone's inset, as a share of the free map region's side. */
export const COMFORT_INSET_SHARE_V7 = 0.15;
/** The shortest and the longest glide, at Normal animation speed. */
export const CAMERA_GLIDE_MIN_MS_V7 = 260;
export const CAMERA_GLIDE_MAX_MS_V7 = 600;
/**
 * The spring's stiffness: its angular frequency times the glide's duration.
 * At 8 a glide from rest has covered 99.7% of the way when its time is up.
 */
export const CAMERA_SPRING_SETTLE_V7 = 8;
/** A camera this close to its target (CSS px, each axis) is there. */
export const CAMERA_REST_EPSILON_PX_V7 = 0.5;

/** A rectangle on the canvas, in CSS px from its top-left corner. */
export interface ScreenRectV7 {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The map region the top HUD and the open dock leave free. */
export function visibleMapRegionV7(
  viewport: Size,
  band: ScreenBand,
): ScreenRectV7 {
  const whole = band.bottom - band.top < 1;
  return {
    left: 0,
    right: viewport.width,
    top: whole ? 0 : band.top,
    bottom: whole ? viewport.height : band.bottom,
  };
}

/**
 * The comfort zone: the free map region inset on every side by
 * `COMFORT_INSET_SHARE_V7` of that side, and by at least half a tile, so a
 * unit whose tile centre is in the zone is drawn whole. On a region too
 * small for that the zone shrinks to the region's middle line.
 */
export function comfortZoneV7(
  viewport: Size,
  band: ScreenBand,
  zoom: number,
): ScreenRectV7 {
  const region = visibleMapRegionV7(viewport, band);
  const inset = (length: number, tile: number): number =>
    Math.min(
      length / 2,
      Math.max(length * COMFORT_INSET_SHARE_V7, (tile * zoom) / 2),
    );
  const x = inset(region.right - region.left, TILE_WIDTH);
  const y = inset(region.bottom - region.top, TILE_HEIGHT);
  return {
    left: region.left + x,
    right: region.right - x,
    top: region.top + y,
    bottom: region.bottom - y,
  };
}

function cellSpan(
  cells: readonly CoordV7[],
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  const first = cells[0];
  if (first === undefined) return null;
  let { x: minX, x: maxX, y: minY, y: maxY } = first;
  for (const cell of cells) {
    minX = Math.min(minX, cell.x);
    maxX = Math.max(maxX, cell.x);
    minY = Math.min(minY, cell.y);
    maxY = Math.max(maxY, cell.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Whether every cell's centre is inside `zone` under `camera`. */
export function cellsInsideZoneV7(
  camera: CameraState,
  cells: readonly CoordV7[],
  zone: ScreenRectV7,
): boolean {
  const span = cellSpan(cells);
  if (span === null) return true;
  const slack = CAMERA_REST_EPSILON_PX_V7;
  return (
    camera.offsetX + span.minX * TILE_WIDTH * camera.zoom >=
      zone.left - slack &&
    camera.offsetX + span.maxX * TILE_WIDTH * camera.zoom <=
      zone.right + slack &&
    camera.offsetY + span.minY * TILE_HEIGHT * camera.zoom >=
      zone.top - slack &&
    camera.offsetY + span.maxY * TILE_HEIGHT * camera.zoom <=
      zone.bottom + slack
  );
}

/** Whether no part of any cell's tile is on the canvas under `camera`. */
export function cellsOffscreenV7(
  camera: CameraState,
  cells: readonly CoordV7[],
  viewport: Size,
): boolean {
  const span = cellSpan(cells);
  if (span === null) return false;
  const halfX = (TILE_WIDTH * camera.zoom) / 2;
  const halfY = (TILE_HEIGHT * camera.zoom) / 2;
  return (
    camera.offsetX + span.maxX * TILE_WIDTH * camera.zoom + halfX < 0 ||
    camera.offsetX + span.minX * TILE_WIDTH * camera.zoom - halfX >
      viewport.width ||
    camera.offsetY + span.maxY * TILE_HEIGHT * camera.zoom + halfY < 0 ||
    camera.offsetY + span.minY * TILE_HEIGHT * camera.zoom - halfY >
      viewport.height
  );
}

export interface PlaybackCameraInputV7 {
  readonly camera: CameraState;
  readonly viewport: Size;
  /** The canvas rows the HUD and the open dock leave free. */
  readonly band: ScreenBand;
  /** The tiles of the event about to play (a Move: its whole path). */
  readonly cells: readonly CoordV7[];
  /**
   * The tiles of the events still to play for the same player, in order.
   * Each one that fits the comfort zone together with the event (and the
   * ones taken before it) is framed with it; the others are left out.
   */
  readonly upcoming?: readonly (readonly CoordV7[])[];
  /**
   * The board's extent in world units. Given, the framed camera shows no
   * void beyond a board edge on an axis where the board is larger than the
   * free region, and the whole board where it is smaller: an event in a
   * corner of the map is framed near the screen's edge, not in its middle.
   */
  readonly board?: WorldBounds;
}

/**
 * The comfort-zone rule. Null when the camera should stay where it is: the
 * event has no tiles, or all of them are inside the comfort zone. Else the
 * camera, at the same zoom, that frames the event:
 *
 * - on each axis the framed group (the event and the upcoming events that
 *   fit the zone with it) is centred in the free map region;
 * - an event wider than the zone on an axis is centred there alone when its
 *   tiles fit the region, else centred and then slid the least distance
 *   that puts its last tile (where a Move ends) inside the zone.
 *
 * With `board`, each axis then slides the least distance that leaves no
 * void beyond the board's edge (every tile of the event stays in view).
 * Null too when that camera is the current one to within half a pixel.
 */
export function playbackCameraTargetV7(
  input: PlaybackCameraInputV7,
): CameraState | null {
  const { camera, viewport, band, cells } = input;
  const event = cellSpan(cells);
  const last = cells.at(-1);
  if (event === null || last === undefined) return null;
  const zone = comfortZoneV7(viewport, band, camera.zoom);
  if (cellsInsideZoneV7(camera, cells, zone)) return null;
  const region = visibleMapRegionV7(viewport, band);
  const tileX = TILE_WIDTH * camera.zoom;
  const tileY = TILE_HEIGHT * camera.zoom;
  const zoneWidth = zone.right - zone.left;
  const zoneHeight = zone.bottom - zone.top;
  const fits = (span: NonNullable<ReturnType<typeof cellSpan>>): boolean =>
    (span.maxX - span.minX) * tileX <= zoneWidth + CAMERA_REST_EPSILON_PX_V7 &&
    (span.maxY - span.minY) * tileY <= zoneHeight + CAMERA_REST_EPSILON_PX_V7;
  let group = event;
  if (fits(event))
    for (const later of input.upcoming ?? []) {
      const span = cellSpan(later);
      if (span === null) continue;
      const joined = {
        minX: Math.min(group.minX, span.minX),
        maxX: Math.max(group.maxX, span.maxX),
        minY: Math.min(group.minY, span.minY),
        maxY: Math.max(group.maxY, span.maxY),
      };
      if (fits(joined)) group = joined;
    }
  const framed = (
    min: number,
    max: number,
    end: number,
    tile: number,
    regionStart: number,
    regionEnd: number,
    zoneStart: number,
    zoneEnd: number,
  ): number => {
    const offset = (regionStart + regionEnd) / 2 - ((min + max) / 2) * tile;
    if ((max - min) * tile <= zoneEnd - zoneStart + CAMERA_REST_EPSILON_PX_V7)
      return offset;
    if ((max - min + 1) * tile <= regionEnd - regionStart) return offset;
    const at = offset + end * tile;
    if (at < zoneStart) return offset + (zoneStart - at);
    if (at > zoneEnd) return offset - (at - zoneEnd);
    return offset;
  };
  const axis = (
    min: number,
    max: number,
    end: number,
    tile: number,
    regionStart: number,
    regionEnd: number,
    zoneStart: number,
    zoneEnd: number,
    boardStart: number | null,
    boardEnd: number | null,
  ): number => {
    const offset = framed(
      min,
      max,
      end,
      tile,
      regionStart,
      regionEnd,
      zoneStart,
      zoneEnd,
    );
    if (boardStart === null || boardEnd === null) return offset;
    const start = boardStart * camera.zoom + offset;
    const finish = boardEnd * camera.zoom + offset;
    if (finish - start <= regionEnd - regionStart) {
      if (start < regionStart) return offset + (regionStart - start);
      if (finish > regionEnd) return offset - (finish - regionEnd);
      return offset;
    }
    if (start > regionStart) return offset - (start - regionStart);
    if (finish < regionEnd) return offset + (regionEnd - finish);
    return offset;
  };
  const board = input.board ?? null;
  const target: CameraState = {
    zoom: camera.zoom,
    offsetX: axis(
      group.minX,
      group.maxX,
      last.x,
      tileX,
      region.left,
      region.right,
      zone.left,
      zone.right,
      board?.left ?? null,
      board?.right ?? null,
    ),
    offsetY: axis(
      group.minY,
      group.maxY,
      last.y,
      tileY,
      region.top,
      region.bottom,
      zone.top,
      zone.bottom,
      board?.top ?? null,
      board?.bottom ?? null,
    ),
  };
  return Math.abs(target.offsetX - camera.offsetX) <=
    CAMERA_REST_EPSILON_PX_V7 &&
    Math.abs(target.offsetY - camera.offsetY) <= CAMERA_REST_EPSILON_PX_V7
    ? null
    : target;
}

/**
 * How long a glide over `distancePx` takes at Normal animation speed:
 * `CAMERA_GLIDE_MIN_MS_V7` for a nudge, growing with the distance, and
 * `CAMERA_GLIDE_MAX_MS_V7` from one long side of the canvas on. A glide
 * across several screens takes no longer, so it travels faster instead.
 */
export function cameraGlideDurationMsV7(
  distancePx: number,
  viewport: Size,
): number {
  const screen = Math.max(1, viewport.width, viewport.height);
  const share = Math.min(1, Math.max(0, distancePx) / screen);
  return (
    CAMERA_GLIDE_MIN_MS_V7 +
    (CAMERA_GLIDE_MAX_MS_V7 - CAMERA_GLIDE_MIN_MS_V7) * share
  );
}

/** A glide of the camera offset: a critically damped spring to `target`. */
export interface CameraGlideV7 {
  /** The offset and its velocity (CSS px per ms) when the glide started. */
  readonly from: Point;
  readonly velocity: Point;
  readonly target: Point;
  readonly durationMs: number;
}

/** Where a glide is `elapsedMs` after it started. */
export interface CameraGlideSampleV7 {
  readonly offset: Point;
  readonly velocity: Point;
  /** True from the glide's end on: the offset is exactly the target. */
  readonly settled: boolean;
}

/**
 * Starts a glide from `from` to `target`. `velocity` carries the motion of
 * a glide this one replaces, so a new target mid-glide bends the path
 * instead of stopping it. `durationScale` is the animation's time scale
 * (0.5 at Fast).
 */
export function startCameraGlideV7(input: {
  readonly from: Point;
  readonly target: Point;
  readonly viewport: Size;
  readonly velocity?: Point;
  readonly durationScale?: number;
}): CameraGlideV7 {
  const distance = Math.hypot(
    input.target.x - input.from.x,
    input.target.y - input.from.y,
  );
  return {
    from: input.from,
    velocity: input.velocity ?? { x: 0, y: 0 },
    target: input.target,
    durationMs:
      cameraGlideDurationMsV7(distance, input.viewport) *
      (input.durationScale ?? 1),
  };
}

/**
 * The glide at `elapsedMs`, in closed form (the same answer whatever the
 * frame times were). Settled, exactly on the target, once its duration has
 * passed.
 */
export function cameraGlideAtV7(
  glide: CameraGlideV7,
  elapsedMs: number,
): CameraGlideSampleV7 {
  if (elapsedMs >= glide.durationMs || glide.durationMs <= 0)
    return { offset: glide.target, velocity: { x: 0, y: 0 }, settled: true };
  const time = Math.max(0, elapsedMs);
  const omega = CAMERA_SPRING_SETTLE_V7 / glide.durationMs;
  const decay = Math.exp(-omega * time);
  const axis = (
    from: number,
    velocity: number,
    target: number,
  ): readonly [number, number] => {
    const offset = from - target;
    const drift = velocity + omega * offset;
    return [
      target + (offset + drift * time) * decay,
      (drift - omega * (offset + drift * time)) * decay,
    ];
  };
  const [x, vx] = axis(glide.from.x, glide.velocity.x, glide.target.x);
  const [y, vy] = axis(glide.from.y, glide.velocity.y, glide.target.y);
  return { offset: { x, y }, velocity: { x: vx, y: vy }, settled: false };
}

/** The tiles a presentation step plays on (a Move: its whole path). */
export function playbackStepCellsV7(
  step: CorePresentationStepV7,
): readonly CoordV7[] {
  switch (step.kind) {
    case "MOVE":
      return step.path;
    case "DINOSAUR":
    case "DWARF":
    case "CULT":
      return [...(step.from === undefined ? [] : [step.from]), ...step.cells];
    case "MARTIAN":
      return [
        ...(step.from === undefined ? [] : [step.from]),
        ...(step.pierce === undefined ? [] : [step.pierce]),
        ...step.cells,
      ];
    case "ICE_FOLK":
      return [
        ...(step.from === undefined ? [] : [step.from]),
        ...(step.hits ?? []),
        ...step.cells,
      ];
    case "CANDY":
      return [
        ...(step.from === undefined ? [] : [step.from]),
        ...(step.source === undefined ? [] : [step.source]),
        ...step.cells,
      ];
    case "GIANT":
      return [step.from, ...step.cells];
    case "BUILD":
    case "DISBAND":
    case "DAMAGE":
    case "TACTICAL_STATUS":
      return [step.at];
    case "MELEE":
    case "RANGED":
    case "CATAPULT":
      return [step.from, ...(step.splash ?? []), step.to];
    case "EXPLOSION":
      return step.blasts.map((blast) => blast.at);
    case "SUPPORT":
      return [
        step.actor.at,
        ...step.recipients.map((recipient) => recipient.at),
      ];
    case "WINDMILL_HEALING":
    case "VISIBILITY_CROSSFADE":
      return [];
  }
}

/** A step the playback camera frames, and the tiles it plays on. */
export interface PlaybackCameraEventV7 {
  /** The step's index in its boundary's plan. */
  readonly index: number;
  readonly cells: readonly CoordV7[];
}

/**
 * The steps of one boundary the playback camera frames: the ones the plan
 * marked for another player's turn (`followCamera`), every improvement
 * another player builds and, in another player's turn (`otherSeat`, or
 * after a marked step of the neutral turn inside the viewer's own End
 * Turn), their attacks. The viewer's own steps are never framed. Steps the
 * fog hides are not in a plan at all.
 */
export function playbackCameraEventsV7(
  steps: readonly CorePresentationStepV7[],
  otherSeat: boolean,
): readonly PlaybackCameraEventV7[] {
  const events: PlaybackCameraEventV7[] = [];
  let following = otherSeat;
  for (const [index, step] of steps.entries()) {
    const marked = "followCamera" in step && step.followCamera === true;
    if (marked) following = true;
    const attack =
      step.kind === "MELEE" ||
      step.kind === "RANGED" ||
      step.kind === "CATAPULT";
    if (!marked && step.kind !== "BUILD" && !(attack && following)) continue;
    const cells = playbackStepCellsV7(step);
    if (cells.length > 0) events.push({ index, cells });
  }
  return events;
}

/**
 * Player input wins: the seat whose playback the player took the camera
 * from, after a pan, zoom or tap. `presentingSeat` is the seat of the
 * boundary playing now when the camera frames its steps (null otherwise);
 * between boundaries it is the active seat when that is not the viewer.
 * The camera then leaves that seat's events alone until another seat's
 * playback starts (`playbackFollowAllowedV7`).
 */
export function suppressedSeatAfterInputV7(input: {
  readonly presentingSeat: number | null;
  readonly activeSeat: number | null;
  readonly viewerSeat: number;
  readonly suppressedSeat: number | null;
}): number | null {
  if (input.presentingSeat !== null) return input.presentingSeat;
  if (input.activeSeat !== null && input.activeSeat !== input.viewerSeat)
    return input.activeSeat;
  return input.suppressedSeat;
}

/** Whether the camera may frame the events of `seat`'s boundary. */
export function playbackFollowAllowedV7(
  suppressedSeat: number | null,
  seat: number | null,
): boolean {
  return suppressedSeat === null || suppressedSeat !== seat;
}
