import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("ruleset-6 ready-unit checked visual evidence", () => {
  it("covers factions, terrain contrast, zoom, high contrast, and Reduced motion", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/integration/reviews/ruleset6-readiness/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly fixture: string;
      readonly zooms: readonly number[];
      readonly devicePixelRatios: readonly number[];
      readonly modes: readonly string[];
      readonly contrast: readonly string[];
      readonly frames: readonly {
        readonly metric: {
          readonly zoom: number;
          readonly readyImages: number;
          readonly spentImages: number;
          readonly anchorErrors: number;
          readonly devicePixelRatio: number;
          readonly registrationSamples: number;
          readonly registrationMismatchPixels: number;
          readonly destinationRects: readonly unknown[];
          readonly sourceVisibleBounds: readonly unknown[];
          readonly glowVisibleBounds: readonly unknown[];
          readonly selectedOutlineAfterUnit: boolean;
        };
      }[];
      readonly visualReview: {
        readonly status: string;
        readonly nativeAndEnlarged: boolean;
      };
      readonly artifacts: readonly {
        readonly path: string;
        readonly bytes: number;
        readonly sha256: string;
      }[];
    };
    expect(evidence.fixture).toContain("Original and Candy");
    expect(evidence.fixture).toContain("light Grass and dark Forest/Mountain");
    expect(evidence.zooms).toEqual([0.625, 1, 1.75]);
    expect(evidence.devicePixelRatios).toEqual([1, 2]);
    expect(evidence.modes).toEqual(["FULL", "REDUCED"]);
    expect(evidence.contrast).toEqual(["STANDARD", "HIGH"]);
    expect(evidence.frames).toHaveLength(8);
    expect(
      evidence.frames
        .filter(({ metric }) => metric.devicePixelRatio === 2)
        .map(({ metric }) => metric.zoom),
    ).toEqual([0.625, 1, 1.75]);
    expect(
      evidence.frames.every(
        ({ metric }) =>
          metric.readyImages === 5 &&
          metric.spentImages === 1 &&
          metric.anchorErrors === 0 &&
          metric.registrationSamples === 5 &&
          metric.registrationMismatchPixels === 0 &&
          metric.destinationRects.length === 5 &&
          metric.sourceVisibleBounds.length === 5 &&
          metric.glowVisibleBounds.length === 5 &&
          metric.selectedOutlineAfterUnit,
      ),
    ).toBe(true);
    expect(evidence.visualReview).toMatchObject({
      status: "ACCEPTED",
      nativeAndEnlarged: true,
    });
    expect(evidence.artifacts).toHaveLength(16);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(data.byteLength, artifact.path).toBe(artifact.bytes);
      expect(
        createHash("sha256").update(data).digest("hex"),
        artifact.path,
      ).toBe(artifact.sha256);
    }
  });
});
