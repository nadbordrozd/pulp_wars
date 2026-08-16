import type { PlayerUnitView, PlayerView } from "../../engine/index";

export const READINESS_PULSE_DURATION_MS = 1_600;
export const READINESS_PULSE_MIN_OPACITY = 0.62;

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
