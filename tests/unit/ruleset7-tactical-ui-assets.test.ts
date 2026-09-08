import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  RULESET7_TACTICAL_UI_SYMBOL_BY_ID,
  RULESET7_TACTICAL_UI_SYMBOLS,
  RULESET7_TACTICAL_UI_THEME_TREATMENTS,
} from "../../src/assets/ruleset7-tactical-ui-symbols";
import {
  assertRuleset7TacticalUiOrder,
  RULESET7_TACTICAL_UI_ACTION_IDS,
} from "../../scripts/art/ruleset7-tactical-ui-order";

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
    readonly endpoint?: string;
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
    readonly request?: {
      readonly styleReference?: { readonly sha256?: string };
    };
  }[];
}

const EXPECTED_SYMBOL_IDS = [
  "ui-action-pursue",
  "ui-action-end-pursuit",
  "ui-status-concealed",
  "ui-status-detected",
  "ui-status-exposed",
  "ui-status-defection-waiting",
  "ui-status-defection-armed",
  "ui-status-defection-reservation",
  "ui-status-spoils",
  "ui-status-blackout-cooldown",
  "ui-status-blackout-pending",
  "ui-status-blackout-active",
  "ui-status-blackout-recovery",
  "ui-status-capacity-reservation",
  "ui-status-achievement-progress",
  "ui-status-achievement-entitlement-locked",
  "ui-status-achievement-entitlement-unlocked",
  "ui-status-achievement-entitlement-spent",
  "ui-status-achievement-source-current-owner",
] as const;

async function manifests() {
  const [sourceText, generatedText] = await Promise.all([
    readFile("scripts/art/pixellab-manifest.json", "utf8"),
    readFile("scripts/art/pixellab-generated.json", "utf8"),
  ]);
  return {
    source: JSON.parse(sourceText) as { readonly recipes: readonly Recipe[] },
    generated: JSON.parse(generatedText) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    },
  };
}

describe("Ruleset 7 tactical action and status assets", () => {
  it("guards the exact initial pair and permits only a rejected member retry", () => {
    expect(() =>
      assertRuleset7TacticalUiOrder(
        RULESET7_TACTICAL_UI_ACTION_IDS.map((id) => ({ id })),
        { records: {} },
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7TacticalUiOrder([{ id: "ui-action-defection" }], {
        records: {},
      }),
    ).toThrow("exactly Defection and Blackout");
    expect(() =>
      assertRuleset7TacticalUiOrder(
        [
          { id: "ui-action-defection" },
          { id: "ui-action-blackout" },
          { id: "ui-action-pillage" },
        ],
        { records: {} },
      ),
    ).toThrow("unrelated generation families");
    const recorded = {
      records: {
        "ui-action-defection": { status: "REJECTED" },
        "ui-action-blackout": { status: "ACCEPTED" },
      },
    };
    expect(() =>
      assertRuleset7TacticalUiOrder([{ id: "ui-action-defection" }], recorded),
    ).not.toThrow();
    expect(() =>
      assertRuleset7TacticalUiOrder([{ id: "ui-action-blackout" }], recorded),
    ).toThrow("Do not regenerate accepted");
  });

  it("defines exactly two new raster actions with the approved recipe", async () => {
    const { source } = await manifests();
    const recipes = source.recipes.filter(({ id }) =>
      RULESET7_TACTICAL_UI_ACTION_IDS.includes(id as never),
    );
    expect(recipes.map(({ id }) => id)).toEqual(
      RULESET7_TACTICAL_UI_ACTION_IDS,
    );
    expect(recipes.map(({ seed }) => seed)).toEqual([107503, 107502]);
    for (const recipe of recipes) {
      expect(recipe).toMatchObject({
        class: "ui",
        stage: "batch",
        endpoint: "generate-ui-v2",
        requestSize: { width: 384, height: 384 },
        outputSize: { width: 128, height: 128 },
        hardBounds: { left: 10, top: 10, right: 118, bottom: 118 },
        postprocess: "lanczos3-resize",
      });
      expect(recipe.styleReferenceUsage).toContain("Match only");
      expect(recipe.prompt.toLowerCase()).toContain("northwest");
      expect(recipe.prompt.toLowerCase()).toContain("eight percent");
    }
    expect(recipes[0]?.styleReference).toBe("ui-action-disband");
    expect(recipes[1]?.styleReference).toBe("ui-action-pillage");
  });

  it("preserves complete accepted provider and output provenance", async () => {
    const { source, generated } = await manifests();
    for (const id of RULESET7_TACTICAL_UI_ACTION_IDS) {
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      const record = generated.records[id];
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.jobId, id).toMatch(/^[a-f0-9-]{36}$/);
      expect(record?.candidateSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.outputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(record?.request, id).toMatchObject({
        endpoint: "generate-ui-v2",
        model: "generate-image-v2",
        seed: recipe?.seed,
        postprocess: "lanczos3-resize",
        styleReference: { id: recipe?.styleReference },
      });
      expect(record?.request?.styleReference?.sha256, id).toMatch(
        /^[a-f0-9]{64}$/,
      );
      expect(record?.request?.styleReference?.usageDescription, id).toContain(
        "Match only",
      );
      expect(record?.alphaBounds?.left, id).toBeGreaterThanOrEqual(10);
      expect(record?.alphaBounds?.top, id).toBeGreaterThanOrEqual(10);
      expect(record?.alphaBounds?.right, id).toBeLessThanOrEqual(118);
      expect(record?.alphaBounds?.bottom, id).toBeLessThanOrEqual(118);
      expect(Object.values(record?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record?.notes?.length, id).toBeGreaterThan(300);
      expect(record?.rejectedAttempts ?? [], id).toHaveLength(
        id === "ui-action-defection" ? 1 : 0,
      );
      expect(ACCEPTED_ART_URLS[id], id).toMatch(/^\/assets\/pixellab\//);
      if (recipe === undefined || record?.outputSha256 === undefined) continue;
      const bytes = await readFile(recipe.output);
      expect(createHash("sha256").update(bytes).digest("hex"), id).toBe(
        record.outputSha256,
      );
    }
    const rejected =
      generated.records["ui-action-defection"]?.rejectedAttempts?.[0];
    expect(rejected).toMatchObject({
      candidate: "art/pixellab/quarantine/ui-action-defection-66aea22e8e3b.png",
      candidateSha256:
        "66aea22e8e3bb159519f40c94ce82c7e55d0e64655712fe6c4d240ec0edcc262",
      providerOutputSha256:
        "6b2e212b03dc747fe838ca34587d6f993b4a4616f757a05ed0203498f1875223",
      jobId: "4f3d1e23-45fa-4bef-819c-69a00d0cea7b",
      request: {
        styleReference: {
          sha256:
            "e6d7bc99de393c63a1c7e9aa51169fef87ec52f7841f1b0d43cdaf94d9d57548",
        },
      },
    });
    expect(rejected?.notes).toContain("clipboard/control panel");
    if (rejected?.candidateSha256 !== undefined) {
      const bytes = await readFile(rejected.candidate);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        rejected.candidateSha256,
      );
    }
  });

  it("registers every required code-native role with unique static metadata", () => {
    expect(RULESET7_TACTICAL_UI_SYMBOLS.map(({ id }) => id)).toEqual(
      EXPECTED_SYMBOL_IDS,
    );
    expect(Object.keys(RULESET7_TACTICAL_UI_SYMBOL_BY_ID)).toEqual(
      EXPECTED_SYMBOL_IDS,
    );
    expect(new Set(EXPECTED_SYMBOL_IDS).size).toBe(EXPECTED_SYMBOL_IDS.length);
    for (const symbol of RULESET7_TACTICAL_UI_SYMBOLS) {
      expect(symbol.semanticLabel.length, symbol.id).toBeGreaterThan(8);
      expect(symbol.projectedSource.length, symbol.id).toBeGreaterThan(15);
      expect(symbol.reducedMotion, symbol.id).toBe("STATIC");
      expect(symbol.themeTreatmentId, symbol.id).toBe(
        "RULESET7_TACTICAL_STATIC_V1",
      );
      expect(symbol.primitives.length, symbol.id).toBeGreaterThan(0);
      for (const primitive of symbol.primitives) {
        expect(primitive.kind, symbol.id).toMatch(
          /^(line|circle|rect|polygon)$/,
        );
      }
    }
    expect(Object.keys(RULESET7_TACTICAL_UI_THEME_TREATMENTS)).toEqual([
      "LIGHT",
      "DARK",
      "HIGH_CONTRAST",
    ]);
    for (const treatment of Object.values(
      RULESET7_TACTICAL_UI_THEME_TREATMENTS,
    )) {
      expect(treatment.minimumGraphicalContrast).toBe(3);
      expect(treatment.boundary).toMatch(/^#[a-f0-9]{6}$/i);
      expect(Object.keys(treatment.tones)).toEqual([
        "ink",
        "paper",
        "slate",
        "bronze",
        "coral",
      ]);
    }
    expect(RULESET7_TACTICAL_UI_THEME_TREATMENTS.LIGHT.lineTonePolicy).toBe(
      "SEMANTIC_TONE",
    );
    expect(RULESET7_TACTICAL_UI_THEME_TREATMENTS.DARK.lineTonePolicy).toBe(
      "BOUNDARY_TONE",
    );
    expect(
      RULESET7_TACTICAL_UI_THEME_TREATMENTS.HIGH_CONTRAST.lineTonePolicy,
    ).toBe("BOUNDARY_TONE");
  });

  it("pins exact viewer-safe visibility boundaries without hidden inference", () => {
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-concealed"],
    ).toMatchObject({
      semanticLabel: "Concealment ability",
      visibility: "OWNER_ONLY",
    });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-concealed"].projectedSource,
    ).toContain("no claim");
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-detected"],
    ).toMatchObject({
      visibility: "DETECTED_VIEWER_ONLY",
    });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-detected"].projectedSource,
    ).toContain("aya.31");
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-exposed"].projectedSource,
    ).toContain("exact safe expiry requires future aya.31");
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID["ui-status-defection-reservation"],
    ).toMatchObject({ visibility: "DEFECTION_FULL_ONLY" });
    for (const id of [
      "ui-status-defection-waiting",
      "ui-status-defection-armed",
    ] as const) {
      const symbol = RULESET7_TACTICAL_UI_SYMBOL_BY_ID[id];
      expect(symbol.visibility).toBe("DEFECTION_FULL_OR_ENDPOINT");
      expect(symbol.projectedSource).not.toMatch(
        /counterpart|link|targetUnitId|reservedHomeCityId/,
      );
    }
    for (const id of [
      "ui-status-blackout-pending",
      "ui-status-blackout-active",
      "ui-status-blackout-recovery",
    ] as const)
      expect(RULESET7_TACTICAL_UI_SYMBOL_BY_ID[id]).toMatchObject({
        visibility: "BLACKOUT_FULL_OR_CITY_ONLY",
      });
    expect(
      RULESET7_TACTICAL_UI_SYMBOL_BY_ID[
        "ui-status-achievement-source-current-owner"
      ],
    ).toMatchObject({ visibility: "OWNER_ONLY" });
  });

  it("pins complete actual-size dedicated review evidence", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset7-tactical-ui/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly status: string;
      readonly generationOrder: readonly string[];
      readonly rasterInventory: readonly string[];
      readonly codeNativeInventory: readonly string[];
      readonly reviewCoverage: readonly string[];
      readonly projectionSafety: string;
      readonly artifacts: readonly {
        readonly filename: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.status).toBe("COMPLETE");
    expect(evidence.generationOrder).toEqual(RULESET7_TACTICAL_UI_ACTION_IDS);
    expect(evidence.rasterInventory).toEqual(RULESET7_TACTICAL_UI_ACTION_IDS);
    expect(evidence.codeNativeInventory).toEqual(EXPECTED_SYMBOL_IDS);
    expect(evidence.reviewCoverage.join(" ")).toContain("112x130");
    expect(evidence.reviewCoverage.join(" ")).toContain("176px");
    expect(evidence.reviewCoverage.join(" ")).toContain("DPR1/2");
    expect(evidence.reviewCoverage.join(" ")).toContain("protanopia");
    expect(evidence.reviewCoverage.join(" ")).toContain(
      "without color or motion",
    );
    expect(evidence.projectionSafety).toContain("do not derive concealed");
    expect(evidence.artifacts).toHaveLength(5);
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(
        `art/pixellab/reviews/ruleset7-tactical-ui/${artifact.filename}`,
      );
      expect(bytes.byteLength).toBe(artifact.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        artifact.sha256,
      );
      expect(artifact.bytes).toBeGreaterThan(1_000);
    }
  });
});
