export interface FitOffsetBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export interface FitOffsetResult {
  readonly x: number;
  readonly y: number;
  readonly shiftedBounds: FitOffsetBounds;
}

export function resolveUnitFitOffset(
  bounds: FitOffsetBounds,
  hardBounds: FitOffsetBounds,
  x = 0,
  y = 0,
): FitOffsetResult {
  if (!Number.isFinite(x) || !Number.isInteger(x))
    throw new Error("Deterministic unit fit x offset must be a finite integer");
  if (!Number.isFinite(y) || !Number.isInteger(y))
    throw new Error("Deterministic unit fit y offset must be a finite integer");
  const shiftedBounds = {
    left: bounds.left + x,
    top: bounds.top + y,
    right: bounds.right + x,
    bottom: bounds.bottom + y,
  };
  if (
    shiftedBounds.left < hardBounds.left ||
    shiftedBounds.top < hardBounds.top ||
    shiftedBounds.right > hardBounds.right ||
    shiftedBounds.bottom > hardBounds.bottom
  )
    throw new Error("Deterministic unit fit offset exceeds hard bounds");
  return { x, y, shiftedBounds };
}
