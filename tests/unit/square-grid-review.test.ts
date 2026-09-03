import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

interface Evidence {
  readonly generatedBy: string;
  readonly projection: {
    readonly kind: string;
    readonly cellCssPixels: { readonly width: number; readonly height: number };
    readonly xAxis: string;
    readonly yAxis: string;
    readonly tieBreak: string;
  };
  readonly transition: {
    readonly terrainAndImprovements: string;
    readonly nativeSquareGroundUnderlay: boolean;
    readonly nativeSquareRoadContinuity: boolean;
    readonly unitRasterBytesChanged: boolean;
  };
  readonly views: readonly {
    readonly id: string;
    readonly cssSize: { readonly width: number; readonly height: number };
    readonly backingSize: { readonly width: number; readonly height: number };
    readonly dpr: number;
    readonly zoom: number;
  }[];
  readonly reviewCoverage: readonly string[];
  readonly visualReview: { readonly status: string };
  readonly artifacts: readonly {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
  }[];
}

describe("square-grid deterministic visual review", () => {
  it("records native/enlarged DPR evidence without changing production art", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/integration/reviews/square-grid-experiment/review-evidence.json",
        "utf8",
      ),
    ) as Evidence;
    expect(evidence.generatedBy).toBe("npm run art:square-grid-review");
    expect(evidence.projection).toMatchObject({
      kind: "AXIS_ALIGNED_SQUARE",
      cellCssPixels: { width: 128, height: 128 },
      xAxis: "RIGHT",
      yAxis: "DOWN",
      tieBreak: "lowest row, then lowest column",
    });
    expect(evidence.transition).toEqual({
      terrainAndImprovements: "TEMPORARY_ACCEPTED_DIAMOND_RASTERS",
      nativeSquareGroundUnderlay: true,
      nativeSquareRoadContinuity: true,
      unitRasterBytesChanged: false,
    });
    expect(evidence.views.map(({ id, dpr }) => [id, dpr])).toEqual([
      ["desktop", 1],
      ["mobile", 2],
    ]);
    expect(
      evidence.views.every(({ zoom }) => zoom >= 0.625 && zoom <= 1.75),
    ).toBe(true);
    expect(evidence.reviewCoverage).toHaveLength(5);
    expect(evidence.visualReview.status).toBe("ACCEPTED_FOR_EXPERIMENT");
    expect(evidence.artifacts).toHaveLength(4);

    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(data.byteLength, artifact.path).toBe(artifact.bytes);
      expect(
        createHash("sha256").update(data).digest("hex"),
        artifact.path,
      ).toBe(artifact.sha256);
      const metadata = await sharp(data).metadata();
      const view = evidence.views.find(({ id }) =>
        artifact.path.includes(`/${id}-`),
      );
      if (view === undefined)
        throw new Error(`No viewport for ${artifact.path}`);
      const enlargement = artifact.path.endsWith("-enlarged.png") ? 2 : 1;
      expect(metadata.width).toBe(view.backingSize.width * enlargement);
      expect(metadata.height).toBe(view.backingSize.height * enlargement);
    }
  });
});
