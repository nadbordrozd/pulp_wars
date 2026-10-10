import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  RULESET7_REVISION3_HORSE_ARCHER_GEOMETRY,
  RULESET7_REVISION3_HORSE_ARCHER_ID,
  RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
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

describe("Ruleset 7 revision-3 art assets", () => {
  it("enforces individual generation and the world sprite before its portrait", () => {
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
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID }],
        {
          records: {
            [RULESET7_REVISION3_HORSE_ARCHER_ID]: { status: "ACCEPTED" },
          },
        },
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [
          { id: RULESET7_REVISION3_HORSE_ARCHER_ID },
          { id: RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID },
        ],
        { records: {} },
      ),
    ).toThrow("one revision-3 asset per call");
    expect(() =>
      assertRuleset7Revision3ArtOrder(
        [{ id: RULESET7_REVISION3_HORSE_ARCHER_ID }, { id: "unit-warrior" }],
        { records: {} },
      ),
    ).toThrow("unrelated generation families");
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

  it("keeps the Horse Archer accepted and retires the gravel and the Mountains", async () => {
    const { recipes, records } = await manifests();
    for (const id of [
      RULESET7_REVISION3_HORSE_ARCHER_ID,
      RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
    ]) {
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
    // Bead pulp_wars-67q.15.
    const retired = (
      JSON.parse(
        await readFile("scripts/art/pixellab-manifest.json", "utf8"),
      ) as { readonly retired: readonly { readonly id: string }[] }
    ).retired.map(({ id }) => id);
    for (const id of [
      "terrain-ruleset7-revision3-gravel",
      ...[1, 2, 3].flatMap((variant) => [
        `terrain-ruleset7-revision3-mountain-${variant}`,
        `terrain-ruleset7-revision3-mined-mountain-${variant}`,
      ]),
    ]) {
      expect(retired, id).toContain(id);
      expect(records[id], id).toBeUndefined();
      expect(ACCEPTED_ART_URLS[id], id).toBeUndefined();
    }
  });

  it("leaves all prior accepted generated outputs byte-identical to their recorded hashes", async () => {
    const { recipes, records } = await manifests();
    const revision3 = new Set<string>([
      RULESET7_REVISION3_HORSE_ARCHER_ID,
      RULESET7_REVISION3_HORSE_ARCHER_PORTRAIT_ID,
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
