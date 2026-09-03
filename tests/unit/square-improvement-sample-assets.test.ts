import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";

const IDS = [
  "building-square-farm",
  "building-square-quarry",
  "building-square-windmill",
] as const;

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly empty?: boolean;
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
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly jobId?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly notes?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly request?: {
    readonly seed: number;
    readonly requestSize: { readonly width: number; readonly height: number };
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly postprocess?: string;
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
  };
}

describe("square economic-improvement sample art", () => {
  it("defines exactly the Farm, Quarry and Windmill production sample gate", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const recipes = source.recipes.filter(({ id }) =>
      IDS.includes(id as (typeof IDS)[number]),
    );
    expect(recipes.map(({ id }) => id)).toEqual([...IDS]);
    expect(recipes.map(({ seed }) => seed)).toEqual([107101, 107102, 107103]);
    expect(recipes.every((recipe) => recipe.class === "buildings")).toBe(true);
    expect(recipes.every((recipe) => recipe.stage === "sample")).toBe(true);
    expect(recipes.map(({ requestSize }) => requestSize)).toEqual([
      { width: 256, height: 256 },
      { width: 256, height: 296 },
      { width: 384, height: 384 },
    ]);
    expect(recipes.map(({ anchor }) => anchor)).toEqual([
      { x: 128, y: 128 },
      { x: 128, y: 222 },
      { x: 192, y: 288 },
    ]);
    expect(recipes.map(({ postprocess }) => postprocess)).toEqual([
      "square-farm-fill",
      "compact-building-fit",
      "compact-building-fit",
    ]);
    for (const recipe of recipes) {
      expect(recipe.styleReference, recipe.id).toBeTruthy();
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(450);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(250);
      expect(recipe.output, recipe.id).toBe(
        `public/assets/pixellab/buildings-square/${recipe.id.replace("building-square-", "")}.png`,
      );
    }
    expect(await readFile("scripts/art/pixellab.ts", "utf8")).toContain(
      "Square improvement sample gate must generate exactly Farm, Quarry, and Windmill together in manifest order",
    );
  });

  it("records accepted provider requests, references, hashes and review decisions", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as { readonly records: Readonly<Record<string, GeneratedRecord>> };
    const expectedHashes = [
      "34f46d4f1aad59200a53511dadfe460ba2ca465a7f4536985425d19b5cc03d0f",
      "c6061c6c4b687c05b4e94459f1224467cc3217f3e983579111929144ea5b94fd",
      "367b2186690ea72df3c9eab8558d903c51972081a3e26c4823681daacdbbd848",
    ];
    for (const [index, id] of IDS.entries()) {
      const recipe = source.recipes.find((entry) => entry.id === id);
      const record = generated.records[id];
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.jobId, id).toMatch(/^[a-f0-9-]{36}$/);
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.candidateSha256, id).toBe(expectedHashes[index]);
      expect(record?.outputSha256, id).toBe(expectedHashes[index]);
      expect(record?.request, id).toMatchObject({
        seed: recipe?.seed,
        requestSize: recipe?.requestSize,
        outputSize: recipe?.outputSize,
        postprocess: recipe?.postprocess,
        styleReference: { id: recipe?.styleReference },
      });
      expect(record?.request?.styleReference?.sha256, id).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(Object.values(record?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record?.notes?.length, id).toBeGreaterThan(400);
      if (recipe === undefined) continue;
      expect(hash(await readFile(recipe.output)), id).toBe(
        expectedHashes[index],
      );
      expect(ACCEPTED_ART_URLS[id], id).toBe(
        `/${recipe.output.replace(/^public\//, "")}`,
      );
    }
  });

  it("makes Farm fully opaque with exact opposing edges and continuous repeat joins", async () => {
    const farm = await readFile(
      "public/assets/pixellab/buildings-square/farm.png",
    );
    const { data, info } = await sharp(farm)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info).toMatchObject({ width: 256, height: 256, channels: 4 });
    for (let y = 0; y < info.height; y += 1)
      for (let x = 0; x < info.width; x += 1)
        expect(data[(y * info.width + x) * 4 + 3], `${x},${y}`).toBe(255);
    for (let x = 0; x < info.width; x += 1)
      expect(pixel(data, info.width, x, 0), `N/S ${x}`).toEqual(
        pixel(data, info.width, x, info.height - 1),
      );
    for (let y = 0; y < info.height; y += 1)
      expect(pixel(data, info.width, 0, y), `W/E ${y}`).toEqual(
        pixel(data, info.width, info.width - 1, y),
      );
    expect(hash(farm)).not.toBe(
      hash(
        await readFile(
          "public/assets/pixellab/terrain-square/fertile-ground.png",
        ),
      ),
    );
  });

  it("keeps Quarry and Windmill inside transparent square-aware safety bounds", async () => {
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as { readonly records: Readonly<Record<string, GeneratedRecord>> };
    expect(generated.records[IDS[1]]?.alphaBounds).toEqual({
      left: 64,
      top: 144,
      right: 191,
      bottom: 244,
      empty: false,
    });
    expect(generated.records[IDS[2]]?.alphaBounds).toEqual({
      left: 94,
      top: 38,
      right: 290,
      bottom: 322,
      empty: false,
    });
    for (const id of IDS.slice(1)) {
      const output = `public/assets/pixellab/buildings-square/${id.replace("building-square-", "")}.png`;
      const { data, info } = await sharp(output)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let x = 0; x < info.width; x += 1)
        expect(data[((info.height - 1) * info.width + x) * 4 + 3], id).toBe(0);
      for (let y = 0; y < info.height; y += 1) {
        expect(data[y * info.width * 4 + 3], id).toBe(0);
        expect(data[(y * info.width + info.width - 1) * 4 + 3], id).toBe(0);
      }
    }
  });

  it("registers URLs without switching runtime coverage and preserves review/unit evidence", async () => {
    const [coverage, bindings, evidenceText, interactionTest] =
      await Promise.all([
        readFile("src/render/canvas/asset-coverage-v6.ts", "utf8"),
        readFile("src/render/canvas/pixellab-asset-bindings.ts", "utf8"),
        readFile(
          "art/pixellab/reviews/square-improvement-samples/review-evidence.json",
          "utf8",
        ),
        readFile("tests/integration/ruleset6-dom-shell.test.ts", "utf8"),
      ]);
    for (const id of IDS) {
      expect(coverage, id).not.toContain(id);
      expect(bindings, id).not.toContain(id);
    }
    expect(interactionTest).toContain(
      "dispatches every selected-tile economy command directly for pointer, keyboard, and touch activation",
    );
    expect(interactionTest).toContain(
      "expect(fake.dispatch).toHaveBeenLastCalledWith(command)",
    );
    expect(interactionTest).toContain(
      "expect(fake.economicPreview).not.toHaveBeenCalled()",
    );
    const evidence = JSON.parse(evidenceText) as {
      readonly status: string;
      readonly pixelLabSourceCalls: number;
      readonly exactSampleGate: readonly string[];
      readonly providerRejections: readonly unknown[];
      readonly runtimeCoverageSwitched: boolean;
      readonly acceptedUnitByteHashes: Readonly<Record<string, string>>;
      readonly artifacts: readonly {
        readonly path: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.status).toBe("READY_FOR_ORCHESTRATOR_REVIEW");
    expect(evidence.pixelLabSourceCalls).toBe(3);
    expect(evidence.exactSampleGate).toEqual([...IDS]);
    expect(evidence.providerRejections).toEqual([]);
    expect(evidence.runtimeCoverageSwitched).toBe(false);
    expect(Object.keys(evidence.acceptedUnitByteHashes).length).toBeGreaterThan(
      15,
    );
    for (const [file, expected] of Object.entries(
      evidence.acceptedUnitByteHashes,
    ))
      expect(hash(await readFile(file)), file).toBe(expected);
    expect(evidence.artifacts).toHaveLength(5);
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(artifact.path);
      expect(bytes.byteLength, artifact.path).toBe(artifact.bytes);
      expect(hash(bytes), artifact.path).toBe(artifact.sha256);
    }
  }, 30_000);
});

function pixel(data: Buffer, width: number, x: number, y: number): number[] {
  const offset = (y * width + x) * 4;
  return [...data.subarray(offset, offset + 4)];
}

function hash(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}
