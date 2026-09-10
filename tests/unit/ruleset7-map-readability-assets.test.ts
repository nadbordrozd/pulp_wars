import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_TERRAIN_ART_IDS,
} from "../../src/assets/ruleset7-ui-art";

const GRASS_IDS = [1, 2, 3].map(
  (variant) => `terrain-ruleset7-original-grass-${variant}`,
);
const FOREST_IDS = [1, 2, 3, 4].map(
  (variant) => `terrain-ruleset7-original-forest-${variant}`,
);
const CAMP_ID = "building-ruleset7-lumber-camp";

interface Recipe {
  readonly id: string;
  readonly seed: number;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly squareFootprint?: {
    readonly left: number;
    readonly top: number;
    readonly right: number;
    readonly bottom: number;
  };
  readonly postprocess?: string;
  readonly bodyOffsetY?: number;
  readonly reframeSource?: string;
  readonly reframeSourceSha256?: string;
  readonly reframeGroundReference?: string;
  readonly groundReference?: string;
}

async function manifests() {
  const [sourceText, generatedText] = await Promise.all([
    readFile("scripts/art/pixellab-manifest.json", "utf8"),
    readFile("scripts/art/pixellab-generated.json", "utf8"),
  ]);
  return {
    recipes: (JSON.parse(sourceText) as { readonly recipes: readonly Recipe[] })
      .recipes,
    records: (
      JSON.parse(generatedText) as {
        readonly records: Readonly<
          Record<
            string,
            {
              readonly status: string;
              readonly jobId?: string;
              readonly outputSha256?: string;
              readonly providerOutputSha256?: string;
              readonly alphaBounds?: Record<string, number | boolean>;
              readonly rejectedAttempts?: readonly unknown[];
              readonly reviewChecks?: Readonly<Record<string, boolean>>;
            }
          >
        >;
      }
    ).records,
  };
}

describe("Ruleset 7 map readability art", () => {
  it("registers exactly three v7 Grass variants, four derived Forests, and the larger Camp", async () => {
    const { recipes, records } = await manifests();
    for (const [index, id] of GRASS_IDS.entries()) {
      const recipe = recipes.find((candidate) => candidate.id === id);
      expect(recipe).toMatchObject({
        seed: 107801 + index,
        requestSize: { width: 256, height: 256 },
        outputSize: { width: 256, height: 256 },
        anchor: { x: 128, y: 128 },
        squareFootprint: { left: 0, top: 0, right: 256, bottom: 256 },
        postprocess: "square-grass-texture-v7",
      });
      expect(records[id]?.status, id).toBe("ACCEPTED");
      expect(records[id]?.jobId, id).toMatch(/^[a-f0-9-]{36}$/);
      expect(records[id]?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(records[id]?.reviewChecks, id).toEqual({
        source: true,
        native: true,
        enlarged: true,
        minimumZoom: true,
        composition: true,
      });
      expect(ACCEPTED_ART_URLS[id], id).toBeTypeOf("string");
    }
    expect(records[GRASS_IDS[1] ?? ""]?.rejectedAttempts).toHaveLength(1);
    expect(records[GRASS_IDS[2] ?? ""]?.rejectedAttempts).toHaveLength(1);

    for (const [index, id] of FOREST_IDS.entries()) {
      expect(recipes.find((candidate) => candidate.id === id)).toMatchObject({
        requestSize: { width: 256, height: 384 },
        outputSize: { width: 256, height: 384 },
        anchor: { x: 128, y: 256 },
        squareFootprint: { left: 0, top: 128, right: 256, bottom: 384 },
        postprocess: "square-tall-reframe-ground-reference",
        bodyOffsetY: [64, 44, 0, 44][index],
        reframeGroundReference: "terrain-square-original-grass-1",
        groundReference: "terrain-ruleset7-original-grass-1",
      });
      expect(records[id]?.status, id).toBe("ACCEPTED");
      expect(ACCEPTED_ART_URLS[id], id).toBeTypeOf("string");
    }

    expect(recipes.find((candidate) => candidate.id === CAMP_ID)).toMatchObject(
      {
        seed: 107811,
        requestSize: { width: 384, height: 384 },
        outputSize: { width: 384, height: 384 },
        anchor: { x: 192, y: 288 },
        postprocess: "compact-building-fit",
      },
    );
    expect(records[CAMP_ID]?.status).toBe("ACCEPTED");
    expect(records[CAMP_ID]?.alphaBounds).toMatchObject({
      left: 52,
      top: 102,
      right: 332,
      bottom: 326,
    });
    expect(ACCEPTED_ART_URLS[CAMP_ID]).toBeTypeOf("string");
    expect(RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP).toBe(CAMP_ID);
    expect(RULESET7_TERRAIN_ART_IDS).toMatchObject({
      GRASS: GRASS_IDS[0],
      FOREST: FOREST_IDS[0],
    });
  });

  it("keeps Grass opaque and seam-identical while preserving Forest 3 canopy interiors", async () => {
    const { recipes, records } = await manifests();
    for (const id of GRASS_IDS) {
      const recipe = recipes.find((candidate) => candidate.id === id);
      if (recipe === undefined) throw new Error(`missing ${id}`);
      const { data, info } = await sharp(recipe.output)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      expect({ width: info.width, height: info.height }).toEqual({
        width: 256,
        height: 256,
      });
      for (let index = 0; index < 256; index += 1) {
        for (const [x, y] of [
          [index, 0],
          [index, 255],
          [0, index],
          [255, index],
        ] as const) {
          const offset = (y * 256 + x) * 4;
          expect([...data.subarray(offset, offset + 4)]).toEqual([
            0x6f, 0x92, 0x55, 0xff,
          ]);
        }
      }
      expect(hash(await readFile(recipe.output))).toBe(
        records[id]?.outputSha256,
      );
    }

    const forest3 = recipes.find(
      ({ id }) => id === "terrain-ruleset7-original-forest-3",
    );
    if (forest3?.reframeSource === undefined)
      throw new Error("Forest 3 source missing");
    expect(hash(await readFile(forest3.reframeSource))).toBe(
      forest3.reframeSourceSha256,
    );
    const [source, derived] = await Promise.all([
      sharp(forest3.reframeSource).ensureAlpha().raw().toBuffer(),
      sharp(forest3.output).ensureAlpha().raw().toBuffer(),
    ]);
    for (const [x, y] of [
      [120, 130],
      [120, 170],
      [55, 252],
    ] as const) {
      const offset = (y * 256 + x) * 4;
      expect([...derived.subarray(offset, offset + 4)]).toEqual([
        ...source.subarray(offset, offset + 4),
      ]);
    }
  });

  it("leaves the frozen Ruleset 6 Original sources byte-identical", async () => {
    const expected = {
      "public/assets/pixellab/terrain-square/original-grass-1.png":
        "a20fbc91f4bcd6120fb8c9ce4bcd9ed9276fcdbd4f145d4153cc71c93bda6567",
      "public/assets/pixellab/terrain-square/original-forest-1.png":
        "ada147cc84e3b3dbd70cd0aa3e5f39a1a41dfe74be63833ad3c375fae316571f",
      "public/assets/pixellab/terrain-square/original-forest-2.png":
        "93a942c0a5828271bf478b03dea35673ccb2f456fe4da8e460909c75c5568b61",
      "public/assets/pixellab/terrain-square/original-forest-3.png":
        "33700d975ac040df56cf355bb0330c6e3a04402f39d5bbe3117f65dde8386fa8",
      "public/assets/pixellab/terrain-square/original-forest-4.png":
        "405262746d5b95e5507dfad353938393ed4b809d77ffbe1b2832a4e3361de0c3",
      "public/assets/pixellab/buildings-square/lumber-camp.png":
        "c3511299607d3524ba6fdd2828d4bef9c0ad50e9a35cd47d5abdf30d2d46479c",
    } as const;
    for (const [file, digest] of Object.entries(expected))
      expect(hash(await readFile(file)), file).toBe(digest);
  });
});

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
