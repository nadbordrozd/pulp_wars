import type { Coord } from "../../engine/index";

export const TILE_WIDTH = 128;
export const TILE_HEIGHT = 74;
export const MIN_ZOOM = 0.625;
export const MAX_ZOOM = 1.75;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface CameraState {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly zoom: number;
}

export interface WorldBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface GroundAnchor {
  readonly at: Coord;
  readonly tie: number;
  readonly id: number;
}

export interface Rectangle {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface UnitHealthBarGeometry {
  readonly background: Rectangle;
  readonly fill: Rectangle;
}

export type DiamondEdge =
  "NORTH_WEST" | "NORTH_EAST" | "SOUTH_EAST" | "SOUTH_WEST";

export interface TerritoryBoundarySegment {
  readonly at: Coord;
  readonly edge: DiamondEdge;
}

const DIAMOND_EDGES: readonly {
  readonly edge: DiamondEdge;
  readonly neighbor: Coord;
}[] = [
  { edge: "NORTH_WEST", neighbor: { x: -1, y: 0 } },
  { edge: "NORTH_EAST", neighbor: { x: 0, y: -1 } },
  { edge: "SOUTH_EAST", neighbor: { x: 1, y: 0 } },
  { edge: "SOUTH_WEST", neighbor: { x: 0, y: 1 } },
];

/**
 * Returns only the perimeter of the supplied, already-observable territory.
 * Missing neighbors are treated as outside, so callers never need to inspect
 * fogged tiles to produce a closed and readable boundary.
 */
export function territoryBoundarySegments(
  observableTerritory: readonly Coord[],
): readonly TerritoryBoundarySegment[] {
  const coordinates = new Set(
    observableTerritory.map((at) => `${at.x},${at.y}`),
  );
  const ordered = [...observableTerritory].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
  const segments: TerritoryBoundarySegment[] = [];
  for (const at of ordered) {
    for (const { edge, neighbor } of DIAMOND_EDGES) {
      if (!coordinates.has(`${at.x + neighbor.x},${at.y + neighbor.y}`))
        segments.push({ at, edge });
    }
  }
  return segments;
}

export function diamondEdgeIndex(edge: DiamondEdge): number {
  return DIAMOND_EDGES.findIndex((candidate) => candidate.edge === edge);
}

export function projectGrid(at: Coord, origin: Point = { x: 0, y: 0 }): Point {
  return {
    x: origin.x + ((at.x - at.y) * TILE_WIDTH) / 2,
    y: origin.y + ((at.x + at.y) * TILE_HEIGHT) / 2,
  };
}

export function worldToScreen(point: Point, camera: CameraState): Point {
  return {
    x: camera.offsetX + point.x * camera.zoom,
    y: camera.offsetY + point.y * camera.zoom,
  };
}

export function screenToWorld(point: Point, camera: CameraState): Point {
  return {
    x: (point.x - camera.offsetX) / camera.zoom,
    y: (point.y - camera.offsetY) / camera.zoom,
  };
}

export function inverseProject(point: Point): Point {
  const horizontal = (2 * point.x) / TILE_WIDTH;
  const vertical = (2 * point.y) / TILE_HEIGHT;
  return {
    x: (vertical + horizontal) / 2,
    y: (vertical - horizontal) / 2,
  };
}

export function pickGridTile(
  screen: Point,
  camera: CameraState,
  board: Size,
): Coord | null {
  const world = screenToWorld(screen, camera);
  const approximate = inverseProject(world);
  const candidates: Coord[] = [];
  const baseX = Math.floor(approximate.x);
  const baseY = Math.floor(approximate.y);
  for (let y = baseY - 1; y <= baseY + 2; y += 1) {
    for (let x = baseX - 1; x <= baseX + 2; x += 1) {
      if (x >= 0 && y >= 0 && x < board.width && y < board.height) {
        candidates.push({ x, y });
      }
    }
  }
  const containing = candidates.filter((candidate) => {
    const center = projectGrid(candidate);
    const normalized =
      Math.abs(world.x - center.x) / (TILE_WIDTH / 2) +
      Math.abs(world.y - center.y) / (TILE_HEIGHT / 2);
    return normalized <= 1 + Number.EPSILON * 16;
  });
  containing.sort((left, right) => {
    const leftCenter = projectGrid(left);
    const rightCenter = projectGrid(right);
    const leftDistance = squaredDistance(world, leftCenter);
    const rightDistance = squaredDistance(world, rightCenter);
    return leftDistance - rightDistance || left.y - right.y || left.x - right.x;
  });
  return containing[0] ?? null;
}

export function boardWorldBounds(width: number, height: number): WorldBounds {
  const corners = [
    projectGrid({ x: 0, y: 0 }),
    projectGrid({ x: width - 1, y: 0 }),
    projectGrid({ x: 0, y: height - 1 }),
    projectGrid({ x: width - 1, y: height - 1 }),
  ];
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  // City sources permit 92 CSS px lateral, 148 px upward, and 38 px of
  // label space below the ground anchor at nominal zoom.
  return {
    left: Math.min(...xs) - 92,
    top: Math.min(...ys) - 148,
    right: Math.max(...xs) + 92,
    bottom: Math.max(...ys) + 62,
  };
}

export function fitCamera(
  board: Size,
  viewport: Size,
  preferredZoom = 1,
): CameraState {
  const bounds = boardWorldBounds(board.width, board.height);
  const worldWidth = bounds.right - bounds.left;
  const worldHeight = bounds.bottom - bounds.top;
  const fitted = Math.min(
    preferredZoom,
    (viewport.width * 0.94) / worldWidth,
    (viewport.height * 0.92) / worldHeight,
  );
  const zoom = clampZoom(fitted);
  return {
    zoom,
    offsetX: viewport.width / 2 - ((bounds.left + bounds.right) / 2) * zoom,
    offsetY: viewport.height / 2 - ((bounds.top + bounds.bottom) / 2) * zoom,
  };
}

export function zoomCameraAt(
  camera: CameraState,
  nextZoom: number,
  fixedScreenPoint: Point,
): CameraState {
  const zoom = clampZoom(nextZoom);
  const fixedWorldPoint = screenToWorld(fixedScreenPoint, camera);
  return {
    zoom,
    offsetX: fixedScreenPoint.x - fixedWorldPoint.x * zoom,
    offsetY: fixedScreenPoint.y - fixedWorldPoint.y * zoom,
  };
}

export function panCamera(camera: CameraState, delta: Point): CameraState {
  return {
    ...camera,
    offsetX: camera.offsetX + delta.x,
    offsetY: camera.offsetY + delta.y,
  };
}

export function centerCameraOn(
  camera: CameraState,
  worldPoint: Point,
  viewport: Size,
): CameraState {
  return {
    ...camera,
    offsetX: viewport.width / 2 - worldPoint.x * camera.zoom,
    offsetY: viewport.height * 0.55 - worldPoint.y * camera.zoom,
  };
}

export function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function compareGroundAnchors(
  left: GroundAnchor,
  right: GroundAnchor,
): number {
  const leftPoint = projectGrid(left.at);
  const rightPoint = projectGrid(right.at);
  return (
    leftPoint.y - rightPoint.y ||
    leftPoint.x - rightPoint.x ||
    left.tie - right.tie ||
    left.id - right.id
  );
}

export function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}

/**
 * Code-native unit health geometry in CSS pixels. The bar hugs the feet/ground
 * anchor while its bounded status scale keeps it legible at every camera zoom.
 */
export function unitHealthBarGeometry(
  center: Point,
  zoom: number,
  hpRatio: number,
): UnitHealthBarGeometry {
  const statusScale = Math.min(1.25, Math.max(0.75, zoom));
  const width = 42 * statusScale;
  const barTop = center.y + 4 * zoom;
  const left = center.x - width / 2;
  return {
    background: {
      left: left - 2,
      top: barTop - 2,
      width: width + 4,
      height: 10,
    },
    fill: {
      left,
      top: barTop,
      width: width * Math.min(1, Math.max(0, hpRatio)),
      height: 6,
    },
  };
}

export function cityLabelVerticalBounds(
  centerY: number,
  zoom: number,
): readonly [top: number, bottom: number] {
  const labelY = centerY + 38 * zoom;
  return [labelY - 10, labelY + 11];
}

function squaredDistance(left: Point, right: Point): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}
