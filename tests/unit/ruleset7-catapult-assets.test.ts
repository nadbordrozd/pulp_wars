import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  assertRuleset7CatapultOrder,
  RULESET7_CATAPULT_PORTRAIT_ID,
  RULESET7_CATAPULT_WORLD_ID,
} from "../../scripts/art/ruleset7-catapult-order";
import { resolveUnitFitOffset } from "../../scripts/art/unit-fit-offset";

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
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly output: string;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly preferredBounds?: Bounds;
  readonly hardBounds: Bounds;
  readonly postprocess?: string;
  readonly fitOffsetX?: number;
  readonly fitOffsetY?: number;
  readonly styleReference?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface RecordEntry {
  readonly status: string;
  readonly jobId?: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly providerOutputSha256?: string;
    readonly jobId?: string;
    readonly notes?: string;
    readonly request?: { readonly seed?: number };
  }[];
  readonly request?: {
    readonly postprocess?: string;
    readonly fitOffsetX?: number;
    readonly fitOffsetY?: number;
    readonly styleReference?: {
      readonly id: string;
      readonly sha256?: string;
      readonly usageDescription?: string;
    };
  };
}

async function manifests(): Promise<{
  readonly recipes: readonly Recipe[];
  readonly records: Readonly<Record<string, RecordEntry>>;
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
        readonly records: Readonly<Record<string, RecordEntry>>;
      }
    ).records,
  };
}

describe("Ruleset 7 Original Catapult production art", () => {
  it("enforces one world-or-portrait asset per call and world-first derivation", () => {
    expect(() =>
      assertRuleset7CatapultOrder([{ id: RULESET7_CATAPULT_WORLD_ID }], {
        records: {},
      }),
    ).not.toThrow();
    expect(() =>
      assertRuleset7CatapultOrder(
        [
          { id: RULESET7_CATAPULT_WORLD_ID },
          { id: RULESET7_CATAPULT_PORTRAIT_ID },
        ],
        { records: {} },
      ),
    ).toThrow("exactly one Ruleset 7 Catapult asset");
    expect(() =>
      assertRuleset7CatapultOrder(
        [{ id: RULESET7_CATAPULT_WORLD_ID }, { id: "unit-warrior" }],
        { records: {} },
      ),
    ).toThrow("unrelated generation families");
    expect(() =>
      assertRuleset7CatapultOrder([{ id: RULESET7_CATAPULT_PORTRAIT_ID }], {
        records: {},
      }),
    ).toThrow("before deriving its portrait");
    expect(() =>
      assertRuleset7CatapultOrder([{ id: RULESET7_CATAPULT_PORTRAIT_ID }], {
        records: {
          [RULESET7_CATAPULT_WORLD_ID]: { status: "ACCEPTED" },
        },
      }),
    ).not.toThrow();
  });

  it("applies bounded integer fit offsets and preserves the no-offset default", () => {
    const bounds = { left: 72, top: 64, right: 311, bottom: 288 };
    const hard = { left: 16, top: 8, right: 368, bottom: 336 };
    expect(resolveUnitFitOffset(bounds, hard)).toEqual({
      x: 0,
      y: 0,
      shiftedBounds: bounds,
    });
    expect(resolveUnitFitOffset(bounds, hard, 50, 21)).toEqual({
      x: 50,
      y: 21,
      shiftedBounds: { left: 122, top: 85, right: 361, bottom: 309 },
    });
    expect(() => resolveUnitFitOffset(bounds, hard, 58, 21)).toThrow(
      "exceeds hard bounds",
    );
    expect(() => resolveUnitFitOffset(bounds, hard, 50, 49)).toThrow(
      "exceeds hard bounds",
    );
    expect(() => resolveUnitFitOffset(bounds, hard, 0, 1.5)).toThrow(
      "finite integer",
    );
    expect(() => resolveUnitFitOffset(bounds, hard, Number.NaN, 0)).toThrow(
      "finite integer",
    );
    expect(() =>
      resolveUnitFitOffset(bounds, hard, 0, Number.POSITIVE_INFINITY),
    ).toThrow("finite integer");
  });

  it("records a new accepted world asset with calibrated siege geometry", async () => {
    const { recipes, records } = await manifests();
    const recipe = recipes.find(({ id }) => id === RULESET7_CATAPULT_WORLD_ID);
    const record = records[RULESET7_CATAPULT_WORLD_ID];
    expect(recipe).toMatchObject({
      class: "units",
      stage: "sample",
      requestSize: { width: 384, height: 384 },
      outputSize: { width: 384, height: 384 },
      output: "public/assets/pixellab/units/original-catapult.png",
      anchor: { x: 192, y: 288 },
      groundContactY: 288,
      preferredBounds: { left: 30, top: 64, right: 354, bottom: 318 },
      hardBounds: { left: 16, top: 8, right: 368, bottom: 336 },
      postprocess: "unit-fit",
      fitOffsetX: 50,
      fitOffsetY: 21,
      styleReference: "unit-warrior",
    });
    expect(recipe?.prompt.toLowerCase()).toContain("catapult");
    expect(recipe?.prompt.toLowerCase()).toContain("northwest");
    expect(recipe?.prompt.toLowerCase()).toContain("southeast");
    expect(recipe?.negativePrompt.toLowerCase()).toContain("projectile");
    expect(record).toMatchObject({
      status: "ACCEPTED",
      outputSha256:
        "67e7f8cb6fc9a36b385eed9aecc2a12fb2884701cb7661d5503f8dbcf373c360",
      providerOutputSha256:
        "87ee3c107d205769db888bc297974d3e5a608ded5cae53c74e802c00338027dc",
      alphaBounds: { left: 122, top: 85, right: 361, bottom: 309 },
      request: { fitOffsetX: 50, fitOffsetY: 21 },
    });
    expect(Object.values(record?.reviewChecks ?? {})).not.toContain(false);
    expect(ACCEPTED_ART_URLS[RULESET7_CATAPULT_WORLD_ID]).toContain(
      "assets/pixellab/units/original-catapult.png",
    );
    expect(ACCEPTED_ART_URLS[RULESET7_CATAPULT_WORLD_ID]).not.toContain(
      "/catapult.png",
    );
    if (recipe === undefined || record?.outputSha256 === undefined) return;
    const bytes = await readFile(recipe.output);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      record.outputSha256,
    );
  });

  it("preserves both rejected jobs and clarifies the wheel-count preference", async () => {
    const { records } = await manifests();
    const attempts = records[RULESET7_CATAPULT_WORLD_ID]?.rejectedAttempts;
    expect(attempts).toHaveLength(2);
    expect(attempts?.map(({ request }) => request?.seed)).toEqual([
      97301, 97311,
    ]);
    expect(attempts?.[1]?.notes).toContain("prompt preference");
    for (const attempt of attempts ?? []) {
      expect(attempt.jobId).toMatch(/^[a-f0-9-]{36}$/);
      expect(attempt.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(attempt.providerOutputSha256).toMatch(/^[a-f0-9]{64}$/);
      const bytes = await readFile(attempt.candidate);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        attempt.candidateSha256,
      );
    }
  });

  it("publishes a deterministic safe-area portrait from the accepted world hash", async () => {
    const { recipes, records } = await manifests();
    const recipe = recipes.find(
      ({ id }) => id === RULESET7_CATAPULT_PORTRAIT_ID,
    );
    const portrait = records[RULESET7_CATAPULT_PORTRAIT_ID];
    const worldHash = records[RULESET7_CATAPULT_WORLD_ID]?.outputSha256;
    expect(recipe).toMatchObject({
      class: "ui",
      stage: "batch",
      outputSize: { width: 256, height: 256 },
      output: "public/assets/pixellab/ui/portrait-original-catapult.png",
      postprocess: "sprite-derived-portrait",
      styleReference: RULESET7_CATAPULT_WORLD_ID,
      hardBounds: { left: 20, top: 20, right: 236, bottom: 236 },
    });
    expect(portrait).toMatchObject({
      status: "ACCEPTED",
      outputSha256:
        "18e928c5584fc31bd9e451601c55f7fc5b5d08a264f562b77c556c394e00dd4c",
      providerOutputSha256: worldHash,
      alphaBounds: { left: 20, top: 27, right: 236, bottom: 229 },
      request: {
        postprocess: "sprite-derived-portrait",
        styleReference: {
          id: RULESET7_CATAPULT_WORLD_ID,
          sha256: worldHash,
        },
      },
    });
    expect(portrait?.jobId).toBeUndefined();
    expect(portrait?.request?.styleReference?.usageDescription).toContain(
      "no provider request",
    );
    expect(ACCEPTED_ART_URLS[RULESET7_CATAPULT_PORTRAIT_ID]).toContain(
      "assets/pixellab/ui/portrait-original-catapult.png",
    );
  });

  it("checks in hash-locked world and portrait review evidence", async () => {
    const reviewRoot = "art/pixellab/reviews/ruleset7-catapult";
    const evidence = JSON.parse(
      await readFile(`${reviewRoot}/review-evidence.json`, "utf8"),
    ) as {
      readonly phase: string;
      readonly world: { readonly sourceSha256: string };
      readonly portraitProvenance: {
        readonly sourceSha256: string;
        readonly postprocess: string;
        readonly providerRequestMade: boolean;
      };
      readonly measurement: {
        readonly wheelContacts: {
          readonly points: readonly {
            readonly x: number;
            readonly y: number;
          }[];
          readonly midpoint: { readonly x: number; readonly y: number };
          readonly xDeltaFromAnchor: number;
          readonly yDeltaFromAnchor: number;
        };
        readonly historicalDiamondWithoutBaselineOffset: {
          readonly visibleWidthRatio: number;
          readonly visibleHeightRatio: number;
          readonly opaqueAreaRatio: number;
          readonly maximumRearOcclusionRatio: number;
          readonly meetsPreferredWidth: boolean;
          readonly meetsPreferredHeight: boolean;
        };
        readonly activeSquareWithBaselineOffset: {
          readonly noLeftOverflow: boolean;
          readonly noRightOverflow: boolean;
          readonly noBottomOverflow: boolean;
          readonly adjacentOcclusionRatio: Readonly<Record<string, number>>;
        };
      };
      readonly reviewCoverage: readonly string[];
      readonly artifacts: readonly {
        readonly filename: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.phase).toBe("COMPLETE_WITH_PORTRAIT");
    expect(evidence.world.sourceSha256).toBe(
      "67e7f8cb6fc9a36b385eed9aecc2a12fb2884701cb7661d5503f8dbcf373c360",
    );
    expect(evidence.measurement.wheelContacts).toMatchObject({
      points: [
        { x: 142, y: 267 },
        { x: 240, y: 309 },
      ],
      midpoint: { x: 191, y: 288 },
      xDeltaFromAnchor: -1,
      yDeltaFromAnchor: 0,
    });
    expect(
      evidence.measurement.historicalDiamondWithoutBaselineOffset,
    ).toMatchObject({
      visibleWidthRatio: 0.4481,
      visibleHeightRatio: 0.7265,
      opaqueAreaRatio: 0.3089,
      maximumRearOcclusionRatio: 0.034,
      meetsPreferredWidth: false,
      meetsPreferredHeight: false,
    });
    expect(evidence.measurement.activeSquareWithBaselineOffset).toMatchObject({
      noLeftOverflow: true,
      noRightOverflow: true,
      noBottomOverflow: true,
      adjacentOcclusionRatio: { NORTH: 0, EAST: 0, SOUTH: 0, WEST: 0 },
    });
    expect(evidence.portraitProvenance).toMatchObject({
      sourceSha256: evidence.world.sourceSha256,
      postprocess: "sprite-derived-portrait",
      providerRequestMade: false,
    });
    expect(evidence.reviewCoverage.join(" ")).toContain(
      "current-geometry city",
    );
    expect(evidence.reviewCoverage.join(" ")).toContain("112x130");
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(`${reviewRoot}/${artifact.filename}`);
      expect(bytes.byteLength).toBe(artifact.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        artifact.sha256,
      );
      expect(artifact.bytes).toBeGreaterThan(1_000);
    }
  });
});
