import { describe, expect, it } from "vitest";
import {
  SELECTION_JUMP_AMPLITUDE_CSS_PX,
  SELECTION_JUMP_FAST_DURATION_MS,
  SELECTION_JUMP_NORMAL_DURATION_MS,
  selectionJumpDurationMs,
  selectionJumpOffsetCssPx,
} from "../../src/render/canvas/selection-jump-presentation";

describe("unit selection jump presentation", () => {
  it("uses one deterministic half-sine from and back to the ground anchor", () => {
    expect(SELECTION_JUMP_AMPLITUDE_CSS_PX).toBe(12);
    expect(SELECTION_JUMP_NORMAL_DURATION_MS).toBe(240);
    expect(selectionJumpOffsetCssPx(0, "NORMAL", false)).toBe(0);
    expect(selectionJumpOffsetCssPx(60, "NORMAL", false)).toBeCloseTo(
      -12 / Math.sqrt(2),
      10,
    );
    expect(selectionJumpOffsetCssPx(120, "NORMAL", false)).toBe(-12);
    expect(selectionJumpOffsetCssPx(180, "NORMAL", false)).toBeCloseTo(
      -12 / Math.sqrt(2),
      10,
    );
    expect(selectionJumpOffsetCssPx(240, "NORMAL", false)).toBe(0);
    expect(selectionJumpOffsetCssPx(1_000, "NORMAL", false)).toBe(0);
  });

  it("honors Fast timing and keeps Reduced motion exactly stationary", () => {
    expect(SELECTION_JUMP_FAST_DURATION_MS).toBe(120);
    expect(selectionJumpDurationMs("NORMAL")).toBe(240);
    expect(selectionJumpDurationMs("FAST")).toBe(120);
    expect(selectionJumpOffsetCssPx(60, "FAST", false)).toBe(-12);
    for (const elapsed of [0, 1, 60, 120, 240])
      expect(selectionJumpOffsetCssPx(elapsed, "FAST", true)).toBe(0);
  });
});
