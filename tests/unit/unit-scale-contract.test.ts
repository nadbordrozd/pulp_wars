import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  BOARD_ART_GEOMETRY,
  PLACEMENT_ART_GEOMETRY,
  UNIT_SCALE_CONTRACT,
} from "../../src/render/canvas/board-art-geometry";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface GeneratedRecord {
  readonly status: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
}

interface Measurement {
  readonly widthRatio: number;
  readonly heightRatio: number;
  readonly areaRatio: number;
  readonly rearRatio: number;
}

const STANDARD_IDS = [
  "unit-warrior",
  "unit-archer",
  "unit-defender",
  "unit-rider",
  "unit-candy-warrior",
  "unit-candy-gumball-guard",
  "unit-candy-choco-engineer",
  "unit-candy-donut",
] as const;
const REVIEW_ROOT = "art/pixellab/reviews/unit-scale-calibration";
const ARTIFACTS = [
  "README.md",
  "candidate-scale-comparison-native.png",
  "candidate-scale-comparison-enlarged.png",
  "map-context-zoom-dpr1-native.png",
  "map-context-zoom-dpr1-enlarged.png",
  "map-context-zoom-dpr2-native.png",
  "map-context-zoom-dpr2-enlarged.png",
  "adjacency-and-city-native.png",
  "adjacency-and-city-enlarged.png",
] as const;

describe("unit map-scale contract", () => {
  it("publishes one bounded runtime class geometry without changing anchors", () => {
    expect(UNIT_SCALE_CONTRACT.tile).toEqual({ width: 128, height: 74 });
    expect(UNIT_SCALE_CONTRACT.standard).toEqual({
      displayScale: 0.25,
      preferredVisibleWidthRatio: [0.28, 0.44],
      maximumVisibleWidthRatio: 0.48,
      preferredVisibleHeightRatio: [0.66, 0.8],
      maximumVisibleHeightRatio: 0.84,
      maximumOpaqueDiamondAreaRatio: 0.45,
      maximumRearTileOcclusionRatio: 0.08,
    });
    expect(UNIT_SCALE_CONTRACT.siege).toEqual({
      displayScale: 0.24,
      preferredVisibleWidthRatio: [0.5, 0.61],
      maximumVisibleWidthRatio: 0.66,
      preferredVisibleHeightRatio: [0.75, 0.95],
      maximumVisibleHeightRatio: 1.04,
      maximumOpaqueDiamondAreaRatio: 0.58,
      maximumRearTileOcclusionRatio: 0.12,
    });
    expect(UNIT_SCALE_CONTRACT.giant).toEqual({
      displayScale: 0.25,
      preferredVisibleWidthRatio: [0.58, 0.66],
      maximumVisibleWidthRatio: 0.72,
      preferredVisibleHeightRatio: [1, 1.23],
      maximumVisibleHeightRatio: 1.35,
      maximumOpaqueDiamondAreaRatio: null,
      maximumRearTileOcclusionRatio: 0.18,
    });
    expect(BOARD_ART_GEOMETRY.unit).toMatchObject({
      width: 256,
      height: 296,
      anchor: { x: 128, y: 222 },
      displayScale: 0.25,
    });
    expect(BOARD_ART_GEOMETRY.siegeUnit).toMatchObject({
      width: 384,
      height: 384,
      anchor: { x: 192, y: 288 },
      displayScale: 0.24,
    });
    expect(BOARD_ART_GEOMETRY.giantUnit).toEqual({
      width: 384,
      height: 448,
      anchor: { x: 192, y: 336 },
      displayScale: 0.25,
    });
    expect(PLACEMENT_ART_GEOMETRY.candyWarrior.offsetY).toBe(7.5);
  });

  it("keeps every accepted standard inside occupancy and rear-occlusion limits", async () => {
    const generated = await generatedManifest();
    const measurements = await Promise.all(
      STANDARD_IDS.map((id) =>
        measure(
          id,
          generated,
          BOARD_ART_GEOMETRY.unit.displayScale,
          id === "unit-candy-warrior"
            ? PLACEMENT_ART_GEOMETRY.candyWarrior.offsetY
            : 0,
        ),
      ),
    );
    for (const measurement of measurements) {
      expect(measurement.widthRatio).toBeGreaterThanOrEqual(
        UNIT_SCALE_CONTRACT.standard.preferredVisibleWidthRatio[0],
      );
      expect(measurement.widthRatio).toBeLessThanOrEqual(
        UNIT_SCALE_CONTRACT.standard.preferredVisibleWidthRatio[1],
      );
      expect(measurement.heightRatio).toBeGreaterThanOrEqual(
        UNIT_SCALE_CONTRACT.standard.preferredVisibleHeightRatio[0],
      );
      expect(measurement.heightRatio).toBeLessThanOrEqual(
        UNIT_SCALE_CONTRACT.standard.preferredVisibleHeightRatio[1],
      );
      expect(measurement.areaRatio).toBeLessThanOrEqual(
        UNIT_SCALE_CONTRACT.standard.maximumOpaqueDiamondAreaRatio,
      );
      expect(measurement.rearRatio).toBeLessThanOrEqual(
        UNIT_SCALE_CONTRACT.standard.maximumRearTileOcclusionRatio,
      );
    }

    const maximumStandardWidth = Math.max(
      ...measurements.map(({ widthRatio }) => widthRatio * 128),
    );
    const maximumStandardHeight = Math.max(
      ...measurements.map(({ heightRatio }) => heightRatio * 74),
    );
    const terrainBounds = [
      {
        bounds: requiredRecord(generated, "terrain-mountain-1").alphaBounds,
        scale: 0.42,
      },
      {
        bounds: requiredRecord(generated, "terrain-forest-2").alphaBounds,
        scale: 0.5,
      },
    ];
    for (const terrain of terrainBounds) {
      if (terrain.bounds === undefined)
        throw new Error("Missing terrain bounds");
      expect(
        (terrain.bounds.right - terrain.bounds.left) * terrain.scale,
      ).toBeGreaterThan(maximumStandardWidth);
      expect(
        (terrain.bounds.bottom - terrain.bounds.top) * terrain.scale,
      ).toBeGreaterThan(maximumStandardHeight);
    }
  });

  it("keeps accepted Catapult inside the explicit siege exception", async () => {
    const generated = await generatedManifest();
    const measurement = await measure(
      "unit-catapult",
      generated,
      BOARD_ART_GEOMETRY.siegeUnit.displayScale,
      0,
    );
    expect(measurement.widthRatio).toBeCloseTo(0.555, 3);
    expect(measurement.heightRatio).toBeCloseTo(0.89189, 5);
    expect(measurement.areaRatio).toBeCloseTo(0.52635, 5);
    expect(measurement.rearRatio).toBeCloseTo(0.09219, 5);
    expect(measurement.widthRatio).toBeLessThanOrEqual(
      UNIT_SCALE_CONTRACT.siege.maximumVisibleWidthRatio,
    );
    expect(measurement.heightRatio).toBeLessThanOrEqual(
      UNIT_SCALE_CONTRACT.siege.maximumVisibleHeightRatio,
    );
    expect(measurement.areaRatio).toBeLessThanOrEqual(
      UNIT_SCALE_CONTRACT.siege.maximumOpaqueDiamondAreaRatio,
    );
    expect(measurement.rearRatio).toBeLessThanOrEqual(
      UNIT_SCALE_CONTRACT.siege.maximumRearTileOcclusionRatio,
    );
  });

  it("checks in reproducible native/enlarged evidence for the complete matrix", async () => {
    const evidence = JSON.parse(
      await readFile(`${REVIEW_ROOT}/review-evidence.json`, "utf8"),
    ) as {
      readonly candidateScales: {
        readonly standard: readonly number[];
        readonly siege: readonly number[];
      };
      readonly reviewCoverage: readonly string[];
      readonly visualReview: { readonly status: string };
      readonly artifacts: readonly {
        readonly path: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.candidateScales).toEqual({
      standard: [0.2, 0.25, 0.3],
      siege: [0.2, 0.24, 0.28],
    });
    expect(evidence.reviewCoverage).toHaveLength(7);
    expect(evidence.reviewCoverage.join(" ")).toContain(
      "NORTH/EAST/SOUTH/WEST",
    );
    expect(evidence.reviewCoverage.join(" ")).toContain("0.625x, 1x and 1.75x");
    expect(evidence.reviewCoverage.join(" ")).toContain("DPR1 and DPR2");
    expect(evidence.visualReview.status).toBe("ACCEPTED");
    expect(evidence.artifacts.map(({ path }) => path)).toEqual(
      ARTIFACTS.map((name) => `${REVIEW_ROOT}/${name}`),
    );
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(artifact.bytes, artifact.path).toBe(data.byteLength);
      expect(artifact.sha256, artifact.path).toBe(
        createHash("sha256").update(data).digest("hex"),
      );
    }
  });

  it("documents bounded faction batches and individual giants canonically", async () => {
    const [general, units] = await Promise.all([
      readFile("docs/art/ART_DIRECTION.md", "utf8"),
      readFile("docs/art/classes/units.md", "utf8"),
    ]);
    for (const document of [general, units]) {
      expect(document).toContain("0.25");
      expect(document).toContain("rear");
      expect(document).toMatch(/whole\s+roster/i);
      expect(document).toMatch(/Giant|giant/);
    }
    expect(units).toContain("Scout/Medic/Breacher sample gate");
    expect(units).toContain("Jelly Scout/Marshmallow Medic/Candy Crusher");
    expect(units).toContain("at most three");
    expect(units).toContain(
      "never include Juggernaut or Sugar Titan in a batch",
    );
  });
});

async function generatedManifest(): Promise<
  Readonly<Record<string, GeneratedRecord>>
> {
  const parsed = JSON.parse(
    await readFile("scripts/art/pixellab-generated.json", "utf8"),
  ) as { readonly records: Readonly<Record<string, GeneratedRecord>> };
  return parsed.records;
}

async function measure(
  id: string,
  generated: Readonly<Record<string, GeneratedRecord>>,
  scale: number,
  offsetY: number,
): Promise<Measurement> {
  const record = requiredRecord(generated, id);
  if (record.status !== "ACCEPTED" || record.alphaBounds === undefined)
    throw new Error(`${id}: accepted bounds missing`);
  const file = `public/assets/pixellab/units/${id.replace("unit-", "")}.png`;
  const source = await readFile(file);
  expect(createHash("sha256").update(source).digest("hex"), id).toBe(
    record.outputSha256,
  );
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const anchor =
    id === "unit-catapult" ? { x: 192, y: 288 } : { x: 128, y: 222 };
  const tileArea = (128 * 74) / 2;
  let area = 0;
  let north = 0;
  let west = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = (data[(y * info.width + x) * info.channels + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const pixelArea = alpha * scale * scale;
      area += pixelArea;
      const screenX = (x + 0.5 - anchor.x) * scale;
      const screenY = (y + 0.5 - anchor.y) * scale + offsetY;
      if (insideDiamond(screenX, screenY, 64, -37)) north += pixelArea;
      if (insideDiamond(screenX, screenY, -64, -37)) west += pixelArea;
    }
  }
  return {
    widthRatio:
      ((record.alphaBounds.right - record.alphaBounds.left) * scale) / 128,
    heightRatio:
      ((record.alphaBounds.bottom - record.alphaBounds.top) * scale) / 74,
    areaRatio: area / tileArea,
    rearRatio: Math.max(north, west) / tileArea,
  };
}

function insideDiamond(
  x: number,
  y: number,
  centerX: number,
  centerY: number,
): boolean {
  return Math.abs(x - centerX) / 64 + Math.abs(y - centerY) / 37 <= 1;
}

function requiredRecord(
  generated: Readonly<Record<string, GeneratedRecord>>,
  id: string,
): GeneratedRecord {
  const record = generated[id];
  if (record === undefined) throw new Error(`${id}: generated record missing`);
  return record;
}
