export const SELECTION_JUMP_AMPLITUDE_CSS_PX = 12;
export const SELECTION_JUMP_NORMAL_DURATION_MS = 240;
export const SELECTION_JUMP_FAST_DURATION_MS = 120;

export type SelectionJumpSpeed = "NORMAL" | "FAST";

export function selectionJumpDurationMs(speed: SelectionJumpSpeed): number {
  return speed === "FAST"
    ? SELECTION_JUMP_FAST_DURATION_MS
    : SELECTION_JUMP_NORMAL_DURATION_MS;
}

/**
 * Presentation-only vertical offset in nominal CSS pixels. The half-sine
 * begins and ends at the authoritative ground anchor and reaches one subtle
 * 12 px apex at the animation midpoint. Reduced motion is exactly stationary.
 */
export function selectionJumpOffsetCssPx(
  elapsedMs: number,
  speed: SelectionJumpSpeed,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 0;
  const duration = selectionJumpDurationMs(speed);
  const progress = Math.min(1, Math.max(0, elapsedMs / duration));
  if (progress === 0 || progress === 1) return 0;
  return -SELECTION_JUMP_AMPLITUDE_CSS_PX * Math.sin(progress * Math.PI);
}
