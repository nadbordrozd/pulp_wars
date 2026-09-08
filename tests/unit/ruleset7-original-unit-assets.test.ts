import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  assertRuleset7OriginalUnitOrder,
  RULESET7_ORIGINAL_PORTRAIT_IDS,
  RULESET7_ORIGINAL_WORLD_IDS,
} from "../../scripts/art/ruleset7-original-unit-order";

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
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly output: string;
  readonly prompt: string;
  readonly negativePrompt: string;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly fitOffsetX?: number;
  readonly preferredBounds?: Bounds;
  readonly hardBounds: Bounds;
}

interface SourceManifest {
  readonly recipes: readonly Recipe[];
}

interface GeneratedRecord {
  readonly status: string;
  readonly jobId?: string;
  readonly candidate?: string;
  readonly candidateSha256?: string;
  readonly providerOutputSha256?: string;
  readonly outputSha256?: string;
  readonly width?: number;
  readonly height?: number;
  readonly alphaBounds?: Bounds;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly providerOutputSha256?: string;
    readonly jobId?: string;
    readonly disposition?: string;
    readonly request?: { readonly seed: number };
  }[];
  readonly request?: {
    readonly seed: number;
    readonly postprocess?: string;
    readonly fitOffsetX?: number;
    readonly styleReference?: {
      readonly id: string;
      readonly sha256?: string;
      readonly usageDescription?: string;
    };
  };
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, GeneratedRecord>>;
}

const roles = [
  {
    role: "envoy",
    fitOffsetX: -16,
    preferredBounds: { left: 48, top: 22, right: 208, bottom: 222 },
  },
  {
    role: "lancer",
    fitOffsetX: 0,
    preferredBounds: { left: 32, top: 26, right: 224, bottom: 222 },
  },
  {
    role: "saboteur",
    fitOffsetX: -11,
    preferredBounds: { left: 44, top: 24, right: 212, bottom: 222 },
  },
] as const;

async function manifests(): Promise<{
  readonly source: SourceManifest;
  readonly generated: GeneratedManifest;
}> {
  const [sourceText, generatedText] = await Promise.all([
    readFile("scripts/art/pixellab-manifest.json", "utf8"),
    readFile("scripts/art/pixellab-generated.json", "utf8"),
  ]);
  return {
    source: JSON.parse(sourceText) as SourceManifest,
    generated: JSON.parse(generatedText) as GeneratedManifest,
  };
}

function requiredItem<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) {
    throw new Error(`Missing test fixture at index ${index}`);
  }
  return value;
}

describe("ruleset-7 Original Envoy, Lancer, and Saboteur art", () => {
  it("enforces the executable first-trio and targeted-retry order guards", () => {
    const recipes = RULESET7_ORIGINAL_WORLD_IDS.map((id) => ({ id }));
    expect(() =>
      assertRuleset7OriginalUnitOrder(recipes, { records: {} }),
    ).not.toThrow();
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(recipes, 0)], {
        records: {},
      }),
    ).toThrow("first Ruleset 7 Original sample call");
    expect(() =>
      assertRuleset7OriginalUnitOrder([...recipes, { id: "unit-warrior" }], {
        records: {},
      }),
    ).toThrow("unrelated generation families");

    const recordedWorlds = Object.fromEntries(
      RULESET7_ORIGINAL_WORLD_IDS.map((id) => [id, { status: "CANDIDATE" }]),
    );
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(recipes, 1)], {
        records: recordedWorlds,
      }),
    ).not.toThrow();

    const portraitRecipes = RULESET7_ORIGINAL_PORTRAIT_IDS.map((id) => ({
      id,
    }));
    expect(() =>
      assertRuleset7OriginalUnitOrder(portraitRecipes, {
        records: recordedWorlds,
      }),
    ).toThrow("before deriving portraits");
    const acceptedWorlds = Object.fromEntries(
      RULESET7_ORIGINAL_WORLD_IDS.map((id) => [id, { status: "ACCEPTED" }]),
    );
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(portraitRecipes, 0)], {
        records: acceptedWorlds,
      }),
    ).toThrow("first Ruleset 7 Original portrait call");
    expect(() =>
      assertRuleset7OriginalUnitOrder(portraitRecipes, {
        records: acceptedWorlds,
      }),
    ).not.toThrow();
    const recordedPortraits = Object.fromEntries(
      RULESET7_ORIGINAL_PORTRAIT_IDS.map((id) => [id, { status: "CANDIDATE" }]),
    );
    expect(() =>
      assertRuleset7OriginalUnitOrder([requiredItem(portraitRecipes, 2)], {
        records: { ...acceptedWorlds, ...recordedPortraits },
      }),
    ).not.toThrow();
  });

  it("records exact standard geometry, role language, and accepted world hashes", async () => {
    const { source, generated } = await manifests();
    for (const { role, fitOffsetX, preferredBounds } of roles) {
      const id = `unit-original-${role}`;
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      const record = generated.records[id];
      expect(recipe).toMatchObject({
        class: "units",
        stage: "sample",
        requestSize: { width: 256, height: 296 },
        outputSize: { width: 256, height: 296 },
        anchor: { x: 128, y: 222 },
        groundContactY: 222,
        preferredBounds,
        hardBounds: { left: 16, top: 4, right: 240, bottom: 252 },
        postprocess: "unit-fit",
        styleReference: "unit-warrior",
      });
      expect(recipe?.fitOffsetX ?? 0).toBe(fitOffsetX);
      expect(recipe?.prompt.toLowerCase()).toContain("northwest");
      expect(recipe?.prompt.toLowerCase()).toContain("southeast");
      expect(recipe?.negativePrompt.toLowerCase()).not.toContain(
        "detailed pixel art only",
      );
      expect(record).toMatchObject({
        status: "ACCEPTED",
        width: 256,
        height: 296,
      });
      expect(Object.values(record?.reviewChecks ?? {})).not.toContain(false);
      if (recipe === undefined || record?.outputSha256 === undefined) continue;
      const bytes = await readFile(recipe.output);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        record.outputSha256,
      );
      expect(record.alphaBounds?.left).toBeGreaterThanOrEqual(
        recipe.hardBounds.left,
      );
      expect(record.alphaBounds?.right).toBeLessThanOrEqual(
        recipe.hardBounds.right,
      );
      expect(record.alphaBounds?.bottom).toBeLessThanOrEqual(
        recipe.hardBounds.bottom,
      );
      expect(ACCEPTED_ART_URLS[id]).toContain(
        `assets/pixellab/units/original-${role}.png`,
      );
    }
  });

  it("retains complete rejected Lancer job history", async () => {
    const { generated } = await manifests();
    const record = generated.records["unit-original-lancer"];
    expect(record?.rejectedAttempts).toHaveLength(1);
    const rejected = record?.rejectedAttempts?.[0];
    expect(rejected).toMatchObject({
      disposition: "REJECTED",
      request: { seed: 97102 },
    });
    expect(rejected?.candidate).toContain(
      "art/pixellab/quarantine/unit-original-lancer-",
    );
    expect(rejected?.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(rejected?.providerOutputSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(rejected?.jobId).toMatch(/^[a-f0-9-]{36}$/);
    if (rejected === undefined) return;
    const bytes = await readFile(rejected.candidate);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      rejected.candidateSha256,
    );
  });

  it("publishes three deterministic portraits with final world-source hashes", async () => {
    const { source, generated } = await manifests();
    for (const { role } of roles) {
      const worldId = `unit-original-${role}`;
      const portraitId = `portrait-original-${role}`;
      const recipe = source.recipes.find(
        (candidate) => candidate.id === portraitId,
      );
      const record = generated.records[portraitId];
      const sourceHash = generated.records[worldId]?.outputSha256;
      expect(recipe).toMatchObject({
        class: "ui",
        stage: "batch",
        outputSize: { width: 256, height: 256 },
        postprocess: "sprite-derived-portrait",
        styleReference: worldId,
        hardBounds: { left: 20, top: 20, right: 236, bottom: 236 },
      });
      expect(record).toMatchObject({
        status: "ACCEPTED",
        width: 256,
        height: 256,
        providerOutputSha256: sourceHash,
        request: {
          postprocess: "sprite-derived-portrait",
          styleReference: { id: worldId, sha256: sourceHash },
        },
      });
      expect(record?.jobId).toBeUndefined();
      expect(record?.request?.styleReference?.usageDescription).toContain(
        "no provider request",
      );
      expect(ACCEPTED_ART_URLS[portraitId]).toContain(
        `assets/pixellab/ui/portrait-original-${role}.png`,
      );
      if (recipe === undefined || record?.outputSha256 === undefined) continue;
      const bytes = await readFile(recipe.output);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        record.outputSha256,
      );
    }
  });

  it("checks in complete active-square, zoom, feet, and portrait evidence", async () => {
    const reviewRoot = "art/pixellab/reviews/ruleset7-original-units";
    const evidence = JSON.parse(
      await readFile(`${reviewRoot}/review-evidence.json`, "utf8"),
    ) as {
      readonly phase: string;
      readonly measurements: readonly {
        readonly id: string;
        readonly feetCalibration: {
          readonly contactRuns: readonly Bounds[];
          readonly xDeltaFromAnchor: number;
          readonly yDeltaFromAnchor: number;
        };
        readonly legacyDiamondContract: {
          readonly visibleWidthRatio: number;
          readonly visibleHeightRatio: number;
          readonly opaqueAreaRatio: number;
          readonly maximumRearOcclusionRatio: number;
        };
        readonly activeSquareContract: {
          readonly noLeftOverflow: boolean;
          readonly noRightOverflow: boolean;
          readonly noBottomOverflow: boolean;
          readonly visibleFeetInsideCell: boolean;
          readonly adjacentOcclusionRatio: Readonly<Record<string, number>>;
        };
      }[];
      readonly portraitProvenance: readonly {
        readonly providerRequestMade: boolean;
        readonly postprocess: string;
        readonly sourceSha256: string;
      }[];
      readonly reviewCoverage: readonly string[];
      readonly artifacts: readonly {
        readonly filename: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.phase).toBe("COMPLETE_TRIO");
    expect(evidence.measurements).toHaveLength(3);
    for (const measurement of evidence.measurements) {
      expect(measurement.feetCalibration.contactRuns).toHaveLength(2);
      expect(
        Math.abs(measurement.feetCalibration.xDeltaFromAnchor),
      ).toBeLessThanOrEqual(8);
      expect(
        Math.abs(measurement.feetCalibration.yDeltaFromAnchor),
      ).toBeLessThanOrEqual(6);
      expect(
        measurement.legacyDiamondContract.visibleWidthRatio,
      ).toBeLessThanOrEqual(0.48);
      expect(
        measurement.legacyDiamondContract.visibleHeightRatio,
      ).toBeLessThanOrEqual(0.84);
      expect(
        measurement.legacyDiamondContract.opaqueAreaRatio,
      ).toBeLessThanOrEqual(0.45);
      expect(
        measurement.legacyDiamondContract.maximumRearOcclusionRatio,
      ).toBeLessThanOrEqual(0.08);
      expect(measurement.activeSquareContract).toMatchObject({
        noLeftOverflow: true,
        noRightOverflow: true,
        noBottomOverflow: true,
        visibleFeetInsideCell: true,
        adjacentOcclusionRatio: { NORTH: 0, EAST: 0, SOUTH: 0, WEST: 0 },
      });
    }
    expect(evidence.portraitProvenance).toHaveLength(3);
    for (const provenance of evidence.portraitProvenance) {
      expect(provenance.providerRequestMade).toBe(false);
      expect(provenance.postprocess).toBe("sprite-derived-portrait");
      expect(provenance.sourceSha256).toMatch(/^[a-f0-9]{64}$/);
    }
    expect(evidence.reviewCoverage.join(" ")).toContain("nominal 64x64");
    expect(evidence.reviewCoverage.join(" ")).toContain("112x130 object-fit");
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
