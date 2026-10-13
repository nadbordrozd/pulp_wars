import { BOARD_ART_GEOMETRY } from "./board-art-geometry";
import type { Point } from "./geometry";

export interface ArcherProjectileEndpoints {
  readonly from: Point;
  readonly to: Point;
}

export interface ArrowGeometry {
  readonly tail: Point;
  readonly shaftEnd: Point;
  readonly tip: Point;
  readonly headLeft: Point;
  readonly headRight: Point;
  readonly outlineWidth: number;
}

/**
 * Where a shot leaves the shooter, as a fraction of the unit frame. These
 * were the attachments of the retired Ruleset 6 Archer and Gumball Guard
 * rasters (bead pulp_wars-lky5); the numbers stay, so a shot starts where it
 * always did.
 */
const ARCHER_ATTACHMENT = { x: 0.7, y: 0.37 } as const;
const GUMBALL_ATTACHMENT = { x: 0.6523, y: 0.5156 } as const;
const DEFENDER_TORSO_NORMALIZED = { x: 0.5, y: 0.43 } as const;

/**
 * Reprojects the shooter's attachment and target torso from current entity
 * ground anchors. Calling this every frame makes pan/zoom/resize camera-only.
 */
export function archerProjectileEndpoints(
  attackerGround: Point,
  defenderGround: Point,
  zoom: number,
  projectile: "ARROW" | "GUMBALL" = "ARROW",
): ArcherProjectileEndpoints {
  const attachment =
    projectile === "GUMBALL" ? GUMBALL_ATTACHMENT : ARCHER_ATTACHMENT;
  return {
    from: normalizedUnitAttachment(attackerGround, attachment, zoom),
    to: normalizedUnitAttachment(
      defenderGround,
      DEFENDER_TORSO_NORMALIZED,
      zoom,
    ),
  };
}

/** Computes one direction-independent, outlined arrow at the supplied frame. */
export function arrowGeometry(
  endpoints: ArcherProjectileEndpoints,
  progress: number,
  zoom: number,
): ArrowGeometry {
  const dx = endpoints.to.x - endpoints.from.x;
  const dy = endpoints.to.y - endpoints.from.y;
  const distance = Math.hypot(dx, dy);
  const ux = distance === 0 ? 1 : dx / distance;
  const uy = distance === 0 ? 0 : dy / distance;
  const px = -uy;
  const py = ux;
  const tip = {
    x: endpoints.from.x + dx * clamp(progress),
    y: endpoints.from.y + dy * clamp(progress),
  };
  const shaftLength = clampBetween(16 * zoom, 10, 28);
  const headLength = clampBetween(5 * zoom, 4, 9);
  const headHalfWidth = clampBetween(3.5 * zoom, 3, 6.5);
  const shaftEnd = {
    x: tip.x - ux * headLength,
    y: tip.y - uy * headLength,
  };
  return {
    tail: {
      x: shaftEnd.x - ux * shaftLength,
      y: shaftEnd.y - uy * shaftLength,
    },
    shaftEnd,
    tip,
    headLeft: {
      x: shaftEnd.x + px * headHalfWidth,
      y: shaftEnd.y + py * headHalfWidth,
    },
    headRight: {
      x: shaftEnd.x - px * headHalfWidth,
      y: shaftEnd.y - py * headHalfWidth,
    },
    outlineWidth: clampBetween(2 * zoom, 1.5, 3.5),
  };
}

function normalizedUnitAttachment(
  ground: Point,
  normalized: Point,
  zoom: number,
): Point {
  const geometry = BOARD_ART_GEOMETRY.unit;
  const scale = geometry.displayScale * zoom;
  return {
    x: ground.x + (normalized.x * geometry.width - geometry.anchor.x) * scale,
    y: ground.y + (normalized.y * geometry.height - geometry.anchor.y) * scale,
  };
}

function clamp(value: number): number {
  return clampBetween(value, 0, 1);
}

function clampBetween(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
