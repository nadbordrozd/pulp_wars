import type { CombatPresentation } from "../../app/types";
import { ACCEPTED_ART_ATTACHMENTS } from "../../assets/generated-art-manifest";
import { BOARD_ART_GEOMETRY } from "./pixellab-asset-bindings";
import type { Point } from "./geometry";

export interface CombatAnimationFrame {
  /** Fraction of the source-to-target vector used by a lunging attacker. */
  readonly attackerTravel: number;
  /** Cubic-out fraction of the Archer source-to-target projectile vector. */
  readonly arrowTravel: number;
  /** Decaying 0..1 intensity for impact feedback. */
  readonly impact: number;
  readonly defenderOpacity: number;
  readonly attackerOpacity: number;
  /** Old snapshot opacity during the impact-boundary crossfade. */
  readonly preCombatOpacity: number;
}

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

export const ARCHER_PROJECTILE_TIMING = {
  flightMs: 280,
  impactMs: 100,
} as const;

const ARCHER_ATTACHMENT =
  ACCEPTED_ART_ATTACHMENTS["unit-archer"]?.projectileOrigin;
const GUMBALL_ATTACHMENT =
  ACCEPTED_ART_ATTACHMENTS["unit-candy-gumball-guard"]?.projectileOrigin;
const DEFENDER_TORSO_NORMALIZED = { x: 0.5, y: 0.43 } as const;

/** Pure timing projection so browser rendering and fake-time tests agree. */
export function combatAnimationFrame(
  presentation: CombatPresentation,
  elapsedMs: number,
): CombatAnimationFrame {
  const progress = clamp(
    presentation.phaseDurationMs <= 0
      ? 1
      : elapsedMs / presentation.phaseDurationMs,
  );
  if (presentation.kind === "ARCHER_ARROW") {
    if (presentation.phase === "FLIGHT") {
      return {
        attackerTravel: 0,
        arrowTravel: easeOutCubic(progress),
        impact: 0,
        defenderOpacity: 1,
        attackerOpacity: 1,
        preCombatOpacity: 1,
      };
    }
    return {
      attackerTravel: 0,
      arrowTravel: 1,
      impact: 1 - progress,
      defenderOpacity: 1,
      attackerOpacity: 1,
      preCombatOpacity: 1 - progress,
    };
  }
  if (presentation.motion === "REDUCED") {
    return {
      attackerTravel: presentation.advances ? 1 : 0,
      arrowTravel: 0,
      impact: 1 - progress * 0.7,
      defenderOpacity: presentation.defenderDies ? 1 - progress : 1,
      attackerOpacity: presentation.attackerDies ? 1 - progress : 1,
      preCombatOpacity: 1,
    };
  }
  if (presentation.phase === "CONTACT") {
    return {
      attackerTravel: easeOutCubic(progress) * 0.72,
      arrowTravel: 0,
      impact: 0,
      defenderOpacity: 1,
      attackerOpacity: 1,
      preCombatOpacity: 1,
    };
  }
  return {
    attackerTravel: presentation.advances ? 1 : 0.72 * (1 - progress),
    arrowTravel: 0,
    impact: 1 - progress,
    defenderOpacity: presentation.defenderDies ? 1 - progress : 1,
    attackerOpacity: presentation.attackerDies ? 1 - progress : 1,
    preCombatOpacity: 1,
  };
}

/**
 * Reprojects the manifest attachment and target torso from current entity
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
  if (attachment === undefined)
    throw new Error(`${projectile} projectile attachment is missing`);
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

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}
