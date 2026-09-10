import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  RULESET7_REVISION3_GRAVEL_ID,
  RULESET7_REVISION3_HORSE_ARCHER_GEOMETRY,
  RULESET7_REVISION3_HORSE_ARCHER_ID,
  RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
  RULESET7_REVISION3_MINED_MOUNTAIN_IDS,
  RULESET7_REVISION3_MOUNTAIN_IDS,
  RULESET7_REVISION3_MOUNTAIN_RESTORATION,
  assertRuleset7Revision3ArtOrder,
  resolveRepairStyleReferenceHash,
} from "../../scripts/art/ruleset7-revision3-art-order";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly class: string;
  readonly stage: string;
  readonly seed: number;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly displayScale?: number;
  readonly cosmeticOffsetY?: number;
  readonly squareFootprint?: Bounds;
  readonly hardBounds: Bounds;
  readonly preferredBounds?: Bounds;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly groundReference?: string;
  readonly reframeSource?: string;
  readonly reframeSourceSha256?: string;
  readonly reframeGroundReference?: string;
  readonly bodyOffsetY?: number;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly jobId?: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly alphaBounds?: Bounds & { readonly empty?: boolean };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly providerOutputSha256?: string;
    readonly jobId?: string;
    readonly disposition?: string;
    readonly request?: { readonly seed?: number };
  }[];
  readonly request?: {
    readonly seed: number;
    readonly displayScale?: number;
    readonly cosmeticOffsetY?: number;
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
    readonly groundReference?: {
      readonly id: string;
      readonly sha256?: string;
    };
    readonly reframeSource?: { readonly path: string; readonly sha256: string };
  };
}

async function manifests(): Promise<{
  readonly recipes: readonly Recipe[];
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}> {
  const [sourceText, generatedText] = await Promise.all([
    readFile("scripts/art/pixellab-manifest.json", "utf8"),
    readFile("scripts/art/pixellab-generated.json", "utf8"),
  ]);
  return {
    recipes: (JSON.parse(sourceText) as { readonly recipes: readonly Recipe[] })
      .recipes,
    records: (
      JSON.parse(generatedText) as {
        readonly records: Readonly<Record<string, GeneratedRecord>>;
      }
    ).records,
  };
}

function acceptedRecords(
  ids: readonly string[],
): Record<string, { status: string }> {
  return Object.fromEntries(ids.map((id) => [id, { status: "ACCEPTED" }]));
}

describe("Ruleset 7 revision-3 art assets", () => {
  it("enforces individual generation, deterministic derivation, and the guarded final Mine pair", () => {
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_ID }],
        { records: {} },
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID }],
        { records: {} },
      ),
    ).toThrow("before deriving its portrait");
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_MOUNTAIN_IDS[0] as string }],
        { records: {} },
      ),
    ).toThrow("use pixellab repair");
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [
          { id: RULESET7_REVISION3_GRAVEL_ID },
          { id: "terrain-ruleset7-original-grass-1" },
        ],
        { records: {} },
      ),
    ).toThrow("unrelated generation families");

    const dependencies = {
      ...acceptedRecords([
        RULESET7_REVISION3_GRAVEL_ID,
        ...RULESET7_REVISION3_MOUNTAIN_IDS,
      ]),
    };
    const finalPair = RULESET7_REVISION3_MINED_MOUNTAIN_IDS.slice(1).map(
      (id) => ({ id }),
    );
    expect(() =>
      assertRuleset7Revision3ArtOrder(finalPair, { records: dependencies }),
    ).toThrow("guarded Mine 2 + Mine 3 pair");
    expect(() =>
      assertRuleset7Revision3ArtOrder(finalPair, {
        records: {
          ...dependencies,
          [RULESET7_REVISION3_MINED_MOUNTAIN_IDS[0] as string]: {
            status: "ACCEPTED",
          },
        },
      }),
    ).not.toThrow();
  });

  it("does not retain a stale reference hash when a repair recipe changes reference ID", () => {
    expect(
      resolveRepairStyleReferenceHash(
        "mountain-current",
        { id: "mountain-current", sha256: "accepted-old-hash" },
        "generated-current-hash",
      ),
    ).toBe("accepted-old-hash");
    expect(
      resolveRepairStyleReferenceHash(
        "mountain-current",
        { id: "mountain-wrong", sha256: "stale-wrong-hash" },
        "generated-current-hash",
      ),
    ).toBe("generated-current-hash");
  });

  it("records the approved mounted geometry, portrait provenance, and rejected west-facing attempt", async () => {
    const { recipes, records } = await manifests();
    const recipe = recipes.find(
      ({ id }) => id === RULESET7_REVISION3_HORSE_ARCHER_ID,
    );
    expect(recipe).toMatchObject({
      class: "units",
      stage: "batch",
      requestSize: { width: 384, height: 384 },
      outputSize: { width: 384, height: 384 },
      anchor: RULESET7_REVISION3_HORSE_ARCHER_GEOMETRY.anchor,
      groundContactY: 288,
      displayScale: 0.27,
      cosmeticOffsetY: 18,
      preferredBounds: { left: 24, top: 16, right: 360, bottom: 288 },
      hardBounds: { left: 12, top: 4, right: 372, bottom: 320 },
      postprocess: "unit-fit",
      styleReference: "unit-warrior",
    });
    expect(recipe?.prompt).toContain("Horse HEAD is on SCREEN RIGHT");
    expect(recipe?.prompt).toContain("clear curve and string");
    const record = records[RULESET7_REVISION3_HORSE_ARCHER_ID];
    expect(record).toMatchObject({
      status: "ACCEPTED",
      alphaBounds: { left: 55, top: 16, right: 329, bottom: 288 },
      request: { displayScale: 0.27, cosmeticOffsetY: 18 },
    });
    expect((329 - 55) * 0.27).toBeCloseTo(73.98);
    expect((288 - 16) * 0.27).toBeCloseTo(73.44);
    expect(record?.rejectedAttempts).toEqual([
      expect.objectContaining({
        candidate:
          "art/pixellab/quarantine/unit-original-horse-archer-8b8243cb1769.png",
        candidateSha256:
          "8b8243cb1769ee0d019343140a3d565afd8e2eac5796718c0522415541bcb7b4",
        jobId: "e3914d8c-af06-4809-afc3-97d129193e6a",
        disposition: "REJECTED",
        request: expect.objectContaining({ seed: 110501 }),
      }),
    ]);

    const portrait = recipes.find(
      ({ id }) => id === RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
    );
    expect(portrait).toMatchObject({
      outputSize: { width: 256, height: 256 },
      postprocess: "sprite-derived-portrait",
      styleReference: RULESET7_REVISION3_HORSE_ARCHER_ID,
    });
    expect(
      records[RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID]?.request
        ?.styleReference?.sha256,
    ).toBe(record?.outputSha256);
  });

  it("registers one quiet gravel source and exact three-to-three Mountain restoration", async () => {
    const { recipes, records } = await manifests();
    expect(RULESET7_REVISION3_MOUNTAIN_RESTORATION).toEqual(
      Object.fromEntries(
        RULESET7_REVISION3_MOUNTAIN_IDS.map((id, index) => [
          id,
          RULESET7_REVISION3_MINED_MOUNTAIN_IDS[index],
        ]),
      ),
    );
    const gravel = recipes.find(
      ({ id }) => id === RULESET7_REVISION3_GRAVEL_ID,
    );
    expect(gravel).toMatchObject({
      seed: 110512,
      requestSize: { width: 256, height: 256 },
      outputSize: { width: 256, height: 256 },
      anchor: { x: 128, y: 128 },
      squareFootprint: { left: 0, top: 0, right: 256, bottom: 256 },
      postprocess: "square-gravel-ground-v7r3",
    });
    expect(gravel?.prompt).toContain("angular scree fragments");
    expect(records[RULESET7_REVISION3_GRAVEL_ID]?.rejectedAttempts).toEqual([
      expect.objectContaining({
        candidateSha256:
          "f1d808a483bd7505c6485e472cdee59c9c4ed46599d47c83a93de1c6e236e383",
        jobId: "0324683a-11e7-49e9-ba52-3d83444022de",
        disposition: "REJECTED",
      }),
    ]);

    for (const [
      index,
      mountainId,
    ] of RULESET7_REVISION3_MOUNTAIN_IDS.entries()) {
      const ordinal = index + 1;
      const mountain = recipes.find(({ id }) => id === mountainId);
      expect(mountain).toMatchObject({
        outputSize: { width: 256, height: 384 },
        anchor: { x: 128, y: 256 },
        squareFootprint: { left: 0, top: 128, right: 256, bottom: 384 },
        postprocess: "square-mountain-reframe-gravel-v7r3",
        styleReference: `terrain-square-original-mountain-${ordinal}`,
        groundReference: RULESET7_REVISION3_GRAVEL_ID,
        reframeGroundReference: "terrain-square-original-grass-1",
        bodyOffsetY: 40,
      });
      expect(mountain?.reframeSourceSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(records[mountainId]?.request?.reframeSource).toEqual({
        path: mountain?.reframeSource,
        sha256: mountain?.reframeSourceSha256,
        usageDescription: expect.any(String),
      });

      const minedId = RULESET7_REVISION3_MINED_MOUNTAIN_IDS[index] as string;
      const mined = recipes.find(({ id }) => id === minedId);
      expect(mined).toMatchObject({
        outputSize: { width: 256, height: 384 },
        anchor: { x: 128, y: 256 },
        squareFootprint: { left: 0, top: 128, right: 256, bottom: 384 },
        postprocess: "square-tall-ground-reference",
        styleReference: mountainId,
        groundReference: RULESET7_REVISION3_GRAVEL_ID,
      });
      expect(mined?.prompt.toLowerCase()).toMatch(/entrance|tunnel/);
      expect(mined?.prompt.toLowerCase()).toContain("braces");
      expect(mined?.prompt.toLowerCase()).toContain("spoil");
      expect(records[minedId]?.request?.styleReference).toMatchObject({
        id: mountainId,
        sha256: records[mountainId]?.outputSha256,
      });
      expect(records[minedId]?.request?.groundReference).toMatchObject({
        id: RULESET7_REVISION3_GRAVEL_ID,
        sha256: records[RULESET7_REVISION3_GRAVEL_ID]?.outputSha256,
      });
    }
  });

  it("keeps every accepted owning square opaque, gravel seam-safe, and Mountain rock pixels intact", async () => {
    const { recipes, records } = await manifests();
    const gravel = recipes.find(
      ({ id }) => id === RULESET7_REVISION3_GRAVEL_ID,
    );
    if (gravel === undefined) throw new Error("revision-3 gravel missing");
    const { data: gravelData, info: gravelInfo } = await sharp(gravel.output)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect({ width: gravelInfo.width, height: gravelInfo.height }).toEqual({
      width: 256,
      height: 256,
    });
    const colors = new Set<string>();
    let transparentGravelPixels = 0;
    for (let offset = 0; offset < gravelData.length; offset += 4) {
      if (gravelData[offset + 3] !== 255) transparentGravelPixels += 1;
      colors.add(
        `${gravelData[offset]},${gravelData[offset + 1]},${gravelData[offset + 2]}`,
      );
    }
    expect(transparentGravelPixels).toBe(0);
    expect(colors.size).toBeGreaterThan(40);
    for (let index = 0; index < 256; index += 1)
      for (const [x, y] of [
        [index, 0],
        [index, 255],
        [0, index],
        [255, index],
      ] as const) {
        const offset = (y * 256 + x) * 4;
        expect([...gravelData.subarray(offset, offset + 4)]).toEqual([
          0x71, 0x83, 0x91, 0xff,
        ]);
      }

    for (const [
      index,
      mountainId,
    ] of RULESET7_REVISION3_MOUNTAIN_IDS.entries()) {
      const recipe = recipes.find(({ id }) => id === mountainId);
      if (recipe === undefined) throw new Error(`missing ${mountainId}`);
      const oldFile = `public/assets/pixellab/terrain-square/original-mountain-${index + 1}.png`;
      const [oldPixels, revised] = await Promise.all([
        sharp(oldFile).ensureAlpha().raw().toBuffer(),
        sharp(recipe.output).ensureAlpha().raw().toBuffer(),
      ]);
      let exactRockPixels = 0;
      let transparentOwningPixels = 0;
      for (let offset = 0; offset < revised.length; offset += 4) {
        const y = Math.floor(offset / 4 / 256);
        if (y >= 128 && revised[offset + 3] !== 255)
          transparentOwningPixels += 1;
        const oldIsGround =
          oldPixels[offset] === 135 &&
          oldPixels[offset + 1] === 135 &&
          oldPixels[offset + 2] === 135 &&
          oldPixels[offset + 3] === 255;
        if (
          !oldIsGround &&
          oldPixels[offset + 3] !== 0 &&
          oldPixels
            .subarray(offset, offset + 4)
            .equals(revised.subarray(offset, offset + 4))
        )
          exactRockPixels += 1;
      }
      expect(transparentOwningPixels, mountainId).toBe(0);
      expect(exactRockPixels, mountainId).toBeGreaterThan(20_000);
      expect(hash(await readFile(recipe.output))).toBe(
        records[mountainId]?.outputSha256,
      );
    }
  });

  it("accepts and registers every new asset without changing live Ruleset 7 mappings", async () => {
    const { recipes, records } = await manifests();
    const ids = [
      RULESET7_REVISION3_HORSE_ARCHER_ID,
      RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
      RULESET7_REVISION3_GRAVEL_ID,
      ...RULESET7_REVISION3_MOUNTAIN_IDS,
      ...RULESET7_REVISION3_MINED_MOUNTAIN_IDS,
    ];
    for (const id of ids) {
      const recipe = recipes.find((candidate) => candidate.id === id);
      expect(records[id]?.status, id).toBe("ACCEPTED");
      expect(Object.values(records[id]?.reviewChecks ?? {}), id).not.toContain(
        false,
      );
      expect(ACCEPTED_ART_URLS[id], id).toBeTypeOf("string");
      if (recipe === undefined) throw new Error(`missing ${id}`);
      expect(hash(await readFile(recipe.output)), id).toBe(
        records[id]?.outputSha256,
      );
    }
    const runtimeMappings = await readFile(
      "src/assets/ruleset7-ui-art.ts",
      "utf8",
    );
    expect(runtimeMappings).toContain('MINE: "building-square-mine"');
    expect(runtimeMappings).toContain(
      'MOUNTAIN: "terrain-square-original-mountain-1"',
    );
    for (const id of ids) expect(runtimeMappings).not.toContain(id);
  });

  it("leaves all prior accepted generated outputs byte-identical to their recorded hashes", async () => {
    const { recipes, records } = await manifests();
    const revision3 = new Set([
      RULESET7_REVISION3_HORSE_ARCHER_ID,
      RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
      RULESET7_REVISION3_GRAVEL_ID,
      ...RULESET7_REVISION3_MOUNTAIN_IDS,
      ...RULESET7_REVISION3_MINED_MOUNTAIN_IDS,
    ]);
    const priorAccepted = recipes.filter(
      ({ id }) => !revision3.has(id) && records[id]?.status === "ACCEPTED",
    );
    expect(priorAccepted.length).toBeGreaterThan(50);
    for (const recipe of priorAccepted) {
      expect(hash(await readFile(recipe.output)), recipe.id).toBe(
        records[recipe.id]?.outputSha256,
      );
    }
  });
});

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
