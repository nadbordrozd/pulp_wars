import { describe, expect, it } from "vitest";
import {
  READINESS_PULSE_DURATION_MS,
  READINESS_PULSE_MAX_SCALE,
  readinessUnitStyleV6,
} from "../../src/render/canvas/readiness-presentation";

describe("ruleset-6 ready-unit visual rhythm", () => {
  it("uses one slow obvious pulse without moving its ground anchor", () => {
    const start = readinessUnitStyleV6(0, false, false);
    const quarter = readinessUnitStyleV6(400, false, false);
    const peak = readinessUnitStyleV6(800, false, false);
    const end = readinessUnitStyleV6(READINESS_PULSE_DURATION_MS, false, false);

    expect(start).toMatchObject({ opacity: 1, scale: 1 });
    expect(quarter.opacity).toBeCloseTo(0.81, 10);
    expect(quarter.scale).toBeCloseTo(1.04, 10);
    expect(peak.opacity).toBe(0.62);
    expect(peak.scale).toBe(READINESS_PULSE_MAX_SCALE);
    expect(peak.glow.alpha).toBeGreaterThan(start.glow.alpha);
    expect(peak.glow.blurCssPx).toBeGreaterThan(start.glow.blurCssPx);
    expect(end).toEqual(start);
  });

  it("uses an unmistakable static high-contrast silhouette in Reduced motion", () => {
    const standard = readinessUnitStyleV6(0, true, false);
    const highContrast = readinessUnitStyleV6(12_345, true, true);

    expect(standard).toMatchObject({
      opacity: 1,
      scale: 1.04,
      glow: { color: "#fff09a", alpha: 0.94, blurCssPx: 9 },
    });
    expect(highContrast).toMatchObject({
      opacity: 1,
      scale: 1.04,
      glow: { color: "#ffffff", alpha: 0.94, blurCssPx: 5 },
    });
  });
});
