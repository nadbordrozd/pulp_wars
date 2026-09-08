import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_ART_ALIASES,
  ACCEPTED_ART_URLS,
} from "../../src/assets/generated-art-manifest";
import {
  assertRuleset7BuildingEconomyOrder,
  RULESET7_BUILDING_ECONOMY_ACTION_IDS,
  RULESET7_BUILDING_ECONOMY_WORLD_IDS,
} from "../../scripts/art/ruleset7-building-economy-order";

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
  readonly endpoint: string;
  readonly seed: number;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly output: string;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly preferredBounds?: Bounds;
  readonly fitBounds?: Bounds;
  readonly hardBounds: Bounds;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly styleReferenceUsage?: string;
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
  readonly request?: {
    readonly model?: string;
    readonly seed?: number;
    readonly postprocess?: string;
    readonly styleReference?: {
      readonly id: string;
      readonly sha256?: string;
      readonly usageDescription?: string;
    };
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly providerOutputSha256?: string;
    readonly jobId?: string;
    readonly notes?: string;
  }[];
}

const ALL_IDS = [
  ...RULESET7_BUILDING_ECONOMY_WORLD_IDS,
  ...RULESET7_BUILDING_ECONOMY_ACTION_IDS,
] as const;

async function manifests() {
  const [sourceText, generatedText] = await Promise.all([
    readFile("scripts/art/pixellab-manifest.json", "utf8"),
    readFile("scripts/art/pixellab-generated.json", "utf8"),
  ]);
  return {
    source: JSON.parse(sourceText) as {
      readonly aliases: readonly {
        readonly id: string;
        readonly source: string;
        readonly semanticRole: string;
      }[];
      readonly recipes: readonly Recipe[];
    },
    generated: JSON.parse(generatedText) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    },
  };
}

describe("Ruleset 7 Barracks, Monument, Pillage and Disband art", () => {
  it("enforces two serial world requests before the exact action pair", () => {
    expect(() =>
      assertRuleset7BuildingEconomyOrder([{ id: "building-square-barracks" }], {
        records: {},
      }),
    ).not.toThrow();
    const recordedActions = Object.fromEntries(
      RULESET7_BUILDING_ECONOMY_ACTION_IDS.map((id) => [
        id,
        { status: "CANDIDATE" },
      ]),
    );
    expect(() =>
      assertRuleset7BuildingEconomyOrder([{ id: "ui-action-pillage" }], {
        records: {
          ...Object.fromEntries(
            RULESET7_BUILDING_ECONOMY_WORLD_IDS.map((id) => [
              id,
              { status: "ACCEPTED" },
            ]),
          ),
          ...recordedActions,
        },
      }),
    ).not.toThrow();
    expect(() =>
      assertRuleset7BuildingEconomyOrder(
        [{ id: "ui-action-pillage" }, { id: "ui-action-heal" }],
        {
          records: {
            ...Object.fromEntries(
              RULESET7_BUILDING_ECONOMY_WORLD_IDS.map((id) => [
                id,
                { status: "ACCEPTED" },
              ]),
            ),
            ...recordedActions,
          },
        },
      ),
    ).toThrow("unrelated generation families");
    expect(() =>
      assertRuleset7BuildingEconomyOrder([{ id: "building-square-monument" }], {
        records: {},
      }),
    ).toThrow("Barracks request");
    expect(() =>
      assertRuleset7BuildingEconomyOrder(
        [
          { id: "building-square-barracks" },
          { id: "building-square-monument" },
        ],
        { records: {} },
      ),
    ).toThrow("exactly one");
    const barracksRecorded = {
      records: { "building-square-barracks": { status: "CANDIDATE" } },
    };
    expect(() =>
      assertRuleset7BuildingEconomyOrder(
        [{ id: "building-square-monument" }],
        barracksRecorded,
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7BuildingEconomyOrder(
        RULESET7_BUILDING_ECONOMY_ACTION_IDS.map((id) => ({ id })),
        barracksRecorded,
      ),
    ).toThrow("Accept both");
    expect(() =>
      assertRuleset7BuildingEconomyOrder(
        RULESET7_BUILDING_ECONOMY_ACTION_IDS.map((id) => ({ id })),
        {
          records: Object.fromEntries(
            RULESET7_BUILDING_ECONOMY_WORLD_IDS.map((id) => [
              id,
              { status: "ACCEPTED" },
            ]),
          ),
        },
      ),
    ).not.toThrow();
  });

  it("defines exactly four new assets with strict geometry and no Spoils raster", async () => {
    const { source } = await manifests();
    const recipes = source.recipes.filter(({ id }) =>
      ALL_IDS.includes(id as never),
    );
    expect(recipes.map(({ id }) => id)).toEqual(ALL_IDS);
    expect(
      source.recipes.some(({ id }) => id.toLowerCase().includes("spoils")),
    ).toBe(false);
    for (const id of RULESET7_BUILDING_ECONOMY_WORLD_IDS) {
      const recipe = recipes.find((candidate) => candidate.id === id);
      expect(recipe).toMatchObject({
        class: "buildings",
        stage: "batch",
        endpoint: "generate-image-v2",
        requestSize: { width: 384, height: 384 },
        outputSize: { width: 384, height: 384 },
        anchor: { x: 192, y: 288 },
        groundContactY: 316,
        preferredBounds: { left: 24, top: 24, right: 360, bottom: 326 },
        hardBounds: { left: 8, top: 8, right: 376, bottom: 344 },
        postprocess: "compact-building-fit",
      });
      expect(recipe?.prompt.toLowerCase()).toContain("northwest");
      expect(recipe?.prompt.toLowerCase()).toContain("no ground");
      expect(recipe?.styleReferenceUsage).toContain("Match only");
    }
    for (const id of RULESET7_BUILDING_ECONOMY_ACTION_IDS) {
      expect(recipes.find((candidate) => candidate.id === id)).toMatchObject({
        class: "ui",
        stage: "batch",
        endpoint: "generate-ui-v2",
        requestSize: { width: 384, height: 384 },
        outputSize: { width: 128, height: 128 },
        hardBounds: { left: 10, top: 10, right: 118, bottom: 118 },
        postprocess: "lanczos3-resize",
      });
    }
  });

  it("registers exact world selection/build aliases and accepted URLs", async () => {
    const { source } = await manifests();
    const expected = {
      "ui-selection-barracks": "building-square-barracks",
      "ui-action-build-barracks": "building-square-barracks",
      "ui-selection-monument": "building-square-monument",
      "ui-action-build-monument": "building-square-monument",
    } as const;
    for (const [id, target] of Object.entries(expected)) {
      expect(source.aliases.find((alias) => alias.id === id)).toMatchObject({
        source: target,
      });
      expect(ACCEPTED_ART_ALIASES[id]).toBe(target);
      expect(ACCEPTED_ART_URLS[id]).toBe(ACCEPTED_ART_URLS[target]);
    }
    for (const id of ALL_IDS)
      expect(ACCEPTED_ART_URLS[id], id).toMatch(/^\/assets\/pixellab\//);
  });

  it("preserves complete accepted provider and review provenance", async () => {
    const { source, generated } = await manifests();
    for (const id of ALL_IDS) {
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      const record = generated.records[id];
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.jobId, id).toMatch(/^[a-f0-9-]{36}$/);
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.outputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.request, id).toMatchObject({
        model: "generate-image-v2",
        seed: recipe?.seed,
        postprocess: recipe?.postprocess,
        styleReference: { id: recipe?.styleReference },
      });
      expect(record?.request?.styleReference?.sha256, id).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(record?.request?.styleReference?.usageDescription, id).toContain(
        "Match only",
      );
      expect(Object.values(record?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record?.notes?.length, id).toBeGreaterThan(300);
      if (recipe === undefined || record?.outputSha256 === undefined) continue;
      const bytes = await readFile(recipe.output);
      expect(createHash("sha256").update(bytes).digest("hex"), id).toBe(
        record.outputSha256,
      );
    }
  });

  it("preserves the reconsidered Barracks rejection when resuming the exact job", async () => {
    const { source, generated } = await manifests();
    const recipe = source.recipes.find(
      ({ id }) => id === "building-square-barracks",
    );
    const record = generated.records["building-square-barracks"];
    expect(record).toMatchObject({
      status: "ACCEPTED",
      jobId: "769b92db-ad81-4cfe-bcbe-6358b4a485db",
      outputSha256:
        "f924d1646ec42185ef42dbb79966e0405b2e619447365044bda8b2d46037fae6",
      providerOutputSha256:
        "b19ea66fc3f9a81e564a60928c91303eaacd6f70f4f4460d80704df38007aef2",
    });
    expect(record?.notes).toContain("reconsideration");
    expect(record?.rejectedAttempts).toHaveLength(1);
    expect(record?.rejectedAttempts?.[0]).toMatchObject({
      candidate:
        "art/pixellab/quarantine/building-square-barracks-f924d1646ec4.png",
      candidateSha256:
        "f924d1646ec42185ef42dbb79966e0405b2e619447365044bda8b2d46037fae6",
      providerOutputSha256:
        "b19ea66fc3f9a81e564a60928c91303eaacd6f70f4f4460d80704df38007aef2",
      jobId: "769b92db-ad81-4cfe-bcbe-6358b4a485db",
    });
    expect(record?.rejectedAttempts?.[0]?.notes).toContain("solid tan floor");
    if (recipe === undefined || record?.rejectedAttempts?.[0] === undefined)
      return;
    const [acceptedBytes, quarantinedBytes] = await Promise.all([
      readFile(recipe.output),
      readFile(record.rejectedAttempts[0].candidate),
    ]);
    expect(createHash("sha256").update(acceptedBytes).digest("hex")).toBe(
      record.outputSha256,
    );
    expect(createHash("sha256").update(quarantinedBytes).digest("hex")).toBe(
      record.rejectedAttempts[0].candidateSha256,
    );
  });

  it("pins complete actual-scale evidence and review order", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset7-building-economy/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly status: string;
      readonly generationOrder: readonly string[];
      readonly worldApprovalGate: boolean;
      readonly reviewCoverage: readonly string[];
      readonly assets: Readonly<
        Record<string, { readonly alphaBounds: Bounds }>
      >;
      readonly artifacts: readonly {
        readonly filename: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.status).toBe("COMPLETE");
    expect(evidence.generationOrder).toEqual(ALL_IDS);
    expect(evidence.worldApprovalGate).toBe(true);
    expect(evidence.reviewCoverage.join(" ")).toContain("0.625/1/1.75");
    expect(evidence.reviewCoverage.join(" ")).toContain("DPR1/2");
    expect(evidence.reviewCoverage.join(" ")).toContain("112x130");
    expect(evidence.reviewCoverage.join(" ")).toContain(
      "unchanged units/status",
    );
    for (const id of RULESET7_BUILDING_ECONOMY_WORLD_IDS) {
      const bounds = evidence.assets[id]?.alphaBounds;
      expect(bounds?.left, id).toBeGreaterThanOrEqual(8);
      expect(bounds?.right, id).toBeLessThanOrEqual(376);
      expect(bounds?.bottom, id).toBeLessThanOrEqual(326);
    }
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(
        `art/pixellab/reviews/ruleset7-building-economy/${artifact.filename}`,
      );
      expect(bytes.byteLength).toBe(artifact.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        artifact.sha256,
      );
      expect(artifact.bytes).toBeGreaterThan(1_000);
    }
  });
});
