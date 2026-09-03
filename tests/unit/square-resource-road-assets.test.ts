import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";

const IDS = [
  "terrain-square-original-fruit",
  "terrain-square-candy-fruit",
  "terrain-square-original-animal",
  "terrain-square-candy-animal",
  "terrain-square-ore",
  "terrain-square-fertile-ground",
  "terrain-square-stone",
  "terrain-square-road-material",
] as const;

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly stage: string;
  readonly seed: number;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly squareFootprint?: Bounds;
  readonly preferredBounds?: Bounds;
  readonly hardBounds: Bounds;
  readonly groundContactY?: number;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly jobId?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds & { readonly empty: boolean };
  readonly request?: {
    readonly seed: number;
    readonly requestSize: { readonly width: number; readonly height: number };
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly postprocess?: string;
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly notes?: string;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly providerOutputSha256?: string;
    readonly jobId?: string;
    readonly disposition?: string;
    readonly notes?: string;
  }[];
}

describe("square resource and Road production art", () => {
  it("defines exactly eight square sources in bounded coherent request families", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const recipes = source.recipes.filter(({ id }) =>
      IDS.includes(id as (typeof IDS)[number]),
    );
    expect(recipes.map(({ id }) => id)).toEqual([...IDS]);
    expect(recipes.every(({ stage }) => stage === "batch")).toBe(true);
    expect(recipes.map(({ seed }) => seed)).toEqual([
      106101, 106102, 106201, 106202, 106301, 106302, 106303, 106402,
    ]);
    for (const recipe of recipes) {
      const road = recipe.id.endsWith("road-material");
      expect(recipe.requestSize, recipe.id).toEqual({
        width: 256,
        height: road ? 256 : 384,
      });
      expect(recipe.outputSize, recipe.id).toEqual(recipe.requestSize);
      expect(recipe.anchor, recipe.id).toEqual({
        x: 128,
        y: road ? 128 : 256,
      });
      expect(recipe.squareFootprint, recipe.id).toEqual(
        road
          ? { left: 0, top: 0, right: 256, bottom: 256 }
          : { left: 0, top: 128, right: 256, bottom: 384 },
      );
      expect(recipe.postprocess, recipe.id).toBe(
        road ? "square-road-material" : "preferred-low-marker-fit",
      );
      expect(recipe.styleReference, recipe.id).toMatch(/^terrain-/);
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(400);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(250);
      expect(recipe.output, recipe.id).toBe(
        `public/assets/pixellab/terrain-square/${recipe.id.replace("terrain-square-", "")}.png`,
      );
    }
    const pipeline = await readFile("scripts/art/pixellab.ts", "utf8");
    expect(pipeline).toContain(
      "Square resource and Road PixelLab requests may contain at most three assets",
    );
    expect(pipeline).toContain(
      "Do not mix square Fruit, Animal, shared-low-resource, or Road material request families",
    );
  });

  it("records accepted provider provenance, review decisions, rejected iterations and superseded duplicates", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };
    const expectedRejections: Readonly<Record<string, number>> = {
      "terrain-square-original-fruit": 2,
      "terrain-square-candy-fruit": 1,
      "terrain-square-road-material": 2,
    };
    for (const id of IDS) {
      const recipe = source.recipes.find((entry) => entry.id === id);
      const record = generated.records[id];
      expect(recipe, id).toBeDefined();
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.jobId, id).toMatch(/^[a-f0-9-]{36}$/);
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.outputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.request, id).toMatchObject({
        seed: recipe?.seed,
        requestSize: recipe?.requestSize,
        outputSize: recipe?.outputSize,
        postprocess: recipe?.postprocess,
      });
      expect(Object.values(record?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record?.notes?.length, id).toBeGreaterThan(300);
      if (recipe === undefined) continue;
      const bytes = await readFile(recipe.output);
      expect(hash(bytes), id).toBe(record?.outputSha256);
      expect(ACCEPTED_ART_URLS[id], id).toBe(
        `/${recipe.output.replace(/^public\//, "")}`,
      );
      expect(record?.rejectedAttempts ?? [], id).toHaveLength(
        expectedRejections[id] ?? 0,
      );
      for (const rejected of record?.rejectedAttempts ?? []) {
        expect(rejected.candidate, id).toMatch(/^art\/pixellab\/quarantine\//);
        expect(rejected.candidateSha256, id).toMatch(/^[a-f0-9]{64}$/);
        expect(rejected.notes?.length, id).toBeGreaterThan(100);
        expect(hash(await readFile(rejected.candidate)), id).toBe(
          rejected.candidateSha256,
        );
      }
    }
    const originalAttempts =
      generated.records["terrain-square-original-fruit"]?.rejectedAttempts ??
      [];
    const candyAttempts =
      generated.records["terrain-square-candy-fruit"]?.rejectedAttempts ?? [];
    expect(
      [...originalAttempts, ...candyAttempts].filter(
        ({ disposition }) => disposition === "SUPERSEDED_DUPLICATE",
      ),
    ).toHaveLength(2);
    expect(
      [...originalAttempts, ...candyAttempts]
        .filter(({ disposition }) => disposition === "SUPERSEDED_DUPLICATE")
        .every(({ jobId, providerOutputSha256 }) =>
          Boolean(jobId && providerOutputSha256),
        ),
    ).toBe(true);
    expect(originalAttempts[0]).toMatchObject({
      candidate:
        "art/pixellab/quarantine/terrain-square-original-fruit-8d6c831fbd8d.png",
      disposition: "REJECTED",
    });
    expect(originalAttempts[0]?.jobId).toBeUndefined();
    expect(originalAttempts[0]?.providerOutputSha256).toBeUndefined();
    expect(originalAttempts[0]?.notes).toContain(
      "duplicate provider job ID and raw provider-response hash were not captured",
    );
  });

  it("keeps resource alpha inside the full square footprint and preserves exact accepted silhouettes", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };
    const expected = {
      "terrain-square-original-fruit": {
        sha256:
          "4642843133720393490b4649274ae6a8a7999cd07e9476cdd98bd6c84adf7d76",
        bounds: { left: 76, top: 237, right: 180, bottom: 320 },
      },
      "terrain-square-candy-fruit": {
        sha256:
          "ef727af46e7401ae8784b38f6069c7505b3609526c8044f599ea9af604e115ac",
        bounds: { left: 76, top: 247, right: 180, bottom: 320 },
      },
      "terrain-square-original-animal": {
        sha256:
          "5817682f9520679c26ac1d2bc3bb42202c2167190c0433f01569482e3116ef0f",
        bounds: { left: 68, top: 220, right: 188, bottom: 324 },
      },
      "terrain-square-candy-animal": {
        sha256:
          "354f6745221ef4d0c7d62e5bcadd909633b50da90ab738d2311924f3879588a6",
        bounds: { left: 68, top: 213, right: 188, bottom: 324 },
      },
      "terrain-square-ore": {
        sha256:
          "16394b3afdd295cf259d95ac1d519f34af5981129e34fdd7715d7b5bf29e8a00",
        bounds: { left: 69, top: 224, right: 186, bottom: 320 },
      },
      "terrain-square-fertile-ground": {
        sha256:
          "f2c0c4913d01130979589b4ac7ccba50ef4b825976d9a398211eff64c82b67fd",
        bounds: { left: 59, top: 250, right: 196, bottom: 324 },
      },
      "terrain-square-stone": {
        sha256:
          "c6143b3b75259dc91cb334959af79fa453128d02b4a300843cee19e029dfea25",
        bounds: { left: 82, top: 232, right: 173, bottom: 320 },
      },
    } as const;
    for (const id of Object.keys(expected) as (keyof typeof expected)[]) {
      const contract = expected[id];
      const recipe = source.recipes.find((entry) => entry.id === id);
      const record = generated.records[id];
      expect(record?.outputSha256, id).toBe(contract.sha256);
      expect(record?.alphaBounds, id).toEqual({
        ...contract.bounds,
        empty: false,
      });
      if (recipe === undefined) continue;
      const { data, info } = await sharp(recipe.output)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let y = 0; y < 128; y += 1)
        for (let x = 0; x < 256; x += 1)
          expect(data[(y * info.width + x) * 4 + 3], `${id}:${x},${y}`).toBe(0);
      expect(contract.bounds.left, id).toBeGreaterThan(0);
      expect(contract.bounds.right, id).toBeLessThan(256);
      expect(contract.bounds.bottom, id).toBeLessThan(384);
    }
  }, 30_000);

  it("derives all 16 square Road masks with exact cardinal edges and no diagonals", async () => {
    const manifest = JSON.parse(
      await readFile("scripts/art/square-road-masks.generated.json", "utf8"),
    ) as {
      readonly algorithm: string;
      readonly deterministicProcessing: {
        readonly source: string;
        readonly sourceSha256: string;
        readonly directionBitOrder: readonly string[];
        readonly adjacencySemantics: string;
        readonly diagonalSemantics: string;
      };
      readonly records: readonly {
        readonly id: string;
        readonly mask: number;
        readonly bits: string;
        readonly output: string;
        readonly sha256: string;
        readonly width: number;
        readonly height: number;
        readonly anchor: { readonly x: number; readonly y: number };
        readonly accepted: boolean;
      }[];
    };
    expect(manifest.algorithm).toBe("orthogonal-square-road-mask-v1");
    expect(manifest.deterministicProcessing.directionBitOrder).toEqual([
      "NORTH",
      "EAST",
      "SOUTH",
      "WEST",
    ]);
    expect(manifest.deterministicProcessing.diagonalSemantics).toMatch(
      /no diagonal/i,
    );
    expect(hash(await readFile(manifest.deterministicProcessing.source))).toBe(
      manifest.deterministicProcessing.sourceSha256,
    );
    expect(manifest.records).toHaveLength(16);
    const endpoints = [
      { bit: 8, x: 128, y: 0 },
      { bit: 4, x: 255, y: 128 },
      { bit: 2, x: 128, y: 255 },
      { bit: 1, x: 0, y: 128 },
    ] as const;
    for (let mask = 0; mask < 16; mask += 1) {
      const record = manifest.records[mask];
      const bits = mask.toString(2).padStart(4, "0");
      expect(record).toMatchObject({
        id: `terrain-square-road-mask-${bits}`,
        mask,
        bits,
        width: 256,
        height: 256,
        anchor: { x: 128, y: 128 },
        accepted: true,
      });
      if (record === undefined) continue;
      const bytes = await readFile(record.output);
      expect(hash(bytes), bits).toBe(record.sha256);
      expect(ACCEPTED_ART_URLS[record.id], bits).toBe(
        `/${record.output.replace(/^public\//, "")}`,
      );
      const { data } = await sharp(bytes).ensureAlpha().raw().toBuffer({
        resolveWithObject: true,
      });
      expect(data[(128 * 256 + 128) * 4 + 3], bits).toBe(255);
      for (const endpoint of endpoints)
        expect(
          (data[(endpoint.y * 256 + endpoint.x) * 4 + 3] ?? 0) > 0,
          `${bits}:${endpoint.bit}`,
        ).toBe((mask & endpoint.bit) !== 0);
      for (const [x, y] of [
        [0, 0],
        [255, 0],
        [0, 255],
        [255, 255],
      ] as const)
        expect(data[(y * 256 + x) * 4 + 3], `${bits}:corner`).toBe(0);
    }
  }, 30_000);

  it("keeps Road material quiet, registers accepted URLs without switching runtime coverage, and hashes complete review evidence", async () => {
    const road = await readFile(
      "public/assets/pixellab/terrain-square/road-material.png",
    );
    const { data, info } = await sharp(road)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const minima = [255, 255, 255];
    const maxima = [0, 0, 0];
    for (let index = 0; index < info.width * info.height; index += 1) {
      expect(data[index * 4 + 3]).toBe(255);
      for (let channel = 0; channel < 3; channel += 1) {
        minima[channel] = Math.min(
          minima[channel] ?? 255,
          data[index * 4 + channel] ?? 0,
        );
        maxima[channel] = Math.max(
          maxima[channel] ?? 0,
          data[index * 4 + channel] ?? 0,
        );
      }
    }
    expect(
      Math.max(
        ...maxima.map((value, channel) => value - (minima[channel] ?? 255)),
      ),
    ).toBeLessThanOrEqual(10);

    const [coverage, bindings] = await Promise.all([
      readFile("src/render/canvas/asset-coverage-v6.ts", "utf8"),
      readFile("src/render/canvas/pixellab-asset-bindings.ts", "utf8"),
    ]);
    for (const id of IDS) {
      expect(coverage, id).not.toContain(id);
      expect(bindings, id).not.toContain(id);
    }
    expect(bindings).not.toContain("terrain-square-road-mask-");

    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/square-resources-roads/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly status: string;
      readonly blocker: null;
      readonly pixelLabSourceCalls: number;
      readonly pixelLabCommandFamilies: number;
      readonly coherentRequestFamilies: readonly (readonly string[])[];
      readonly requiredCoverage: readonly string[];
      readonly sampleGate: Readonly<Record<string, GeneratedRecord>>;
      readonly acceptedUnitByteHashes: Readonly<Record<string, string>>;
      readonly runtimeCoverageSwitched: boolean;
      readonly artifacts: readonly {
        readonly path: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.status).toBe("READY_FOR_ORCHESTRATOR_REVIEW");
    expect(evidence.blocker).toBeNull();
    expect(evidence.pixelLabSourceCalls).toBe(12);
    expect(evidence.pixelLabCommandFamilies).toBe(7);
    expect(evidence.coherentRequestFamilies.flat()).toEqual([...IDS]);
    expect(
      Math.max(
        ...evidence.coherentRequestFamilies.map((group) => group.length),
      ),
    ).toBeLessThanOrEqual(3);
    expect(evidence.requiredCoverage).toHaveLength(8);
    expect(Object.keys(evidence.sampleGate)).toEqual([...IDS]);
    expect(evidence.runtimeCoverageSwitched).toBe(false);
    expect(Object.keys(evidence.acceptedUnitByteHashes).length).toBeGreaterThan(
      15,
    );
    for (const [file, expected] of Object.entries(
      evidence.acceptedUnitByteHashes,
    ))
      expect(hash(await readFile(file)), file).toBe(expected);
    expect(evidence.artifacts).toHaveLength(10);
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(artifact.path);
      expect(bytes.byteLength, artifact.path).toBe(artifact.bytes);
      expect(hash(bytes), artifact.path).toBe(artifact.sha256);
    }
  }, 30_000);
});

function hash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
