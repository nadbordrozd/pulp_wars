import type { PlayerUnitView, PlayerView } from "../../engine/index";

export const READINESS_PULSE_DURATION_MS = 1_600;
export const READINESS_PULSE_MIN_OPACITY = 0.62;
export const READINESS_PULSE_MAX_SCALE = 1.08;

export interface ReadinessUnitStyleV6 {
  readonly opacity: number;
  readonly scale: number;
  readonly glow: {
    readonly color: string;
    readonly alpha: number;
    readonly blurCssPx: number;
  };
}

/**
 * Presentation-only eligibility. The filtered view is the sole source: no
 * authoritative state, command inference, or wall-clock value enters it.
 */
export function unitNeedsReadinessPulse(
  view: PlayerView,
  unit: PlayerUnitView,
): boolean {
  return (
    view.viewer.id === view.humanPlayerId &&
    view.turnOrder[view.activeSeatIndex] === view.viewer.id &&
    unit.ownerId === view.viewer.id &&
    unit.hp > 0 &&
    !unit.activation.handled
  );
}

/**
 * Shared 1.6-second ease-in-out cycle: 1 at the turn boundary, 0.62 at the
 * midpoint, and 1 at the next boundary. Reduced motion is fully opaque.
 */
export function readinessSpriteOpacity(
  elapsedMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 1;
  const phase =
    ((elapsedMs % READINESS_PULSE_DURATION_MS) + READINESS_PULSE_DURATION_MS) %
    READINESS_PULSE_DURATION_MS;
  const eased =
    (1 - Math.cos((phase / READINESS_PULSE_DURATION_MS) * Math.PI * 2)) / 2;
  return 1 - (1 - READINESS_PULSE_MIN_OPACITY) * eased;
}

/**
 * A unit-attached silhouette treatment. Full motion pairs the retained slow
 * opacity cycle with a modest anchor-preserving scale and glow rhythm. Reduced
 * motion keeps the same semantic state obvious with one strong static frame.
 */
export function readinessUnitStyleV6(
  elapsedMs: number,
  reducedMotion: boolean,
  highContrast: boolean,
): ReadinessUnitStyleV6 {
  if (reducedMotion) {
    return {
      opacity: 1,
      scale: 1.04,
      glow: {
        color: highContrast ? "#ffffff" : "#fff09a",
        alpha: 0.94,
        blurCssPx: highContrast ? 5 : 9,
      },
    };
  }
  const phase =
    ((elapsedMs % READINESS_PULSE_DURATION_MS) + READINESS_PULSE_DURATION_MS) %
    READINESS_PULSE_DURATION_MS;
  const eased =
    (1 - Math.cos((phase / READINESS_PULSE_DURATION_MS) * Math.PI * 2)) / 2;
  return {
    opacity: readinessSpriteOpacity(elapsedMs, false),
    scale: 1 + (READINESS_PULSE_MAX_SCALE - 1) * eased,
    glow: {
      color: highContrast ? "#ffffff" : "#fff09a",
      alpha: (highContrast ? 0.78 : 0.58) + (highContrast ? 0.2 : 0.34) * eased,
      blurCssPx: (highContrast ? 4 : 7) + (highContrast ? 2 : 5) * eased,
    },
  };
}
