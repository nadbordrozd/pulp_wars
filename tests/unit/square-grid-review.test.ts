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
  readonly runtimeCoverage: {
    readonly factions: readonly string[];
    readonly terrainVariants: {
      readonly grass: number;
      readonly forest: number;
      readonly mountain: number;
    };
    readonly resources: readonly string[];
    readonly roadMasks: number;
    readonly improvements: readonly string[];
    readonly sharedUiViewportCssPixels: {
      readonly width: number;
      readonly height: number;
    };
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
      terrainAndImprovements: "ACCEPTED_SQUARE_RASTERS",
      nativeSquareGroundUnderlay: false,
      nativeSquareRoadContinuity: false,
      unitRasterBytesChanged: false,
    });
    expect(evidence.views.map(({ id, dpr }) => [id, dpr])).toEqual([
      ["minimum-dpr1", 1],
      ["minimum-dpr2", 2],
      ["one-x-dpr1", 1],
      ["one-x-dpr2", 2],
      ["maximum-dpr1", 1],
      ["maximum-dpr2", 2],
    ]);
    expect(
      evidence.views.every(({ zoom }) => zoom >= 0.625 && zoom <= 1.75),
    ).toBe(true);
    expect(evidence.runtimeCoverage).toEqual({
      factions: ["ORIGINAL", "CANDY"],
      terrainVariants: { grass: 4, forest: 4, mountain: 3 },
      resources: ["FRUIT", "GAME", "ORE", "FERTILE_GROUND", "STONE"],
      roadMasks: 16,
      improvements: [
        "FARM",
        "QUARRY",
        "WINDMILL",
        "LUMBER_CAMP",
        "MINE",
        "SAWMILL",
        "FORGE",
        "STONEWORKS",
        "WORKSHOP",
        "GRAND_WORKS",
        "MARKET",
      ],
      sharedUiViewportCssPixels: { width: 112, height: 130 },
    });
    expect(evidence.reviewCoverage).toHaveLength(6);
    expect(evidence.visualReview.status).toBe("ACCEPTED_RUNTIME_INTEGRATION");
    expect(evidence.artifacts).toHaveLength(12);

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
