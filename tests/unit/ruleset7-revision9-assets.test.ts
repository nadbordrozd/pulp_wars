import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  RULESET7_REVISION9_PORTRAIT_IDS,
  RULESET7_REVISION9_SOURCE_IDS,
  RULESET7_REVISION9_UI_SAMPLE_IDS,
  assertRuleset7Revision9ArtOrder,
} from "../../scripts/art/ruleset7-revision9-art-order";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  RULESET7_REVISION9_ACTION_ART_IDS,
  RULESET7_REVISION9_IMPROVEMENT_ART_IDS,
  RULESET7_REVISION9_PORTRAIT_ART_IDS,
  RULESET7_REVISION9_UNIT_ART_IDS,
} from "../../src/assets/ruleset7-revision9-art";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly class: string;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly displayScale?: number;
  readonly cosmeticOffsetY?: number;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly hardBounds: Bounds;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface RecordEntry {
  readonly status: string;
  readonly jobId?: string;
  readonly candidateSha256?: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly alphaBounds?: Bounds;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly request?: {
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
  };
}

async function manifests() {
  const [sourceText, generatedText] = await Promise.all([
    readFile("scripts/art/pixellab-manifest.json", "utf8"),
    readFile("scripts/art/pixellab-generated.json", "utf8"),
  ]);
  return {
    recipes: (JSON.parse(sourceText) as { recipes: readonly Recipe[] }).recipes,
    records: (
      JSON.parse(generatedText) as {
        records: Readonly<Record<string, RecordEntry>>;
      }
    ).records,
  };
}

describe("Ruleset 7 revision-9 art assets", () => {
  it("enforces the approved serial source, bounded UI, and portrait gates", () => {
    const accepted = (ids: readonly string[]) => ({
      records: Object.fromEntries(
        ids.map((id) => [id, { status: "ACCEPTED" }]),
      ),
    });
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "unit-original-knight" }],
        accepted([]),
      ),
    ).toThrow("unit-original-captain");
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "unit-original-knight" }],
        accepted(["unit-original-captain"]),
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        RULESET7_REVISION9_SOURCE_IDS.slice(3).map((id) => ({ id })),
        accepted(RULESET7_REVISION9_UI_SAMPLE_IDS),
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "ui-action-rally-v7r9" }],
        accepted(RULESET7_REVISION9_UI_SAMPLE_IDS),
      ),
    ).toThrow("complete Rally");
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "portrait-original-captain" }],
        accepted([]),
      ),
    ).toThrow("before deriving");
  });

  it("records the exact six sources and two deterministic portrait derivatives", async () => {
    const { recipes } = await manifests();
    const selected = [
      ...RULESET7_REVISION9_SOURCE_IDS,
      ...RULESET7_REVISION9_PORTRAIT_IDS,
    ].map((id) => recipes.find((recipe) => recipe.id === id));
    expect(selected.every(Boolean)).toBe(true);
    expect(selected[0]).toMatchObject({
      class: "units",
      requestSize: { width: 256, height: 296 },
      anchor: { x: 128, y: 222 },
      displayScale: 0.25,
      cosmeticOffsetY: 18,
      postprocess: "unit-fit",
    });
    expect(selected[1]).toMatchObject({
      class: "units",
      requestSize: { width: 384, height: 384 },
      anchor: { x: 192, y: 288 },
      displayScale: 0.27,
      cosmeticOffsetY: 18,
      postprocess: "unit-fit",
    });
    expect(selected[2]).toMatchObject({
      class: "buildings",
      requestSize: { width: 384, height: 384 },
      anchor: { x: 192, y: 288 },
      displayScale: 0.3,
      postprocess: "compact-building-fit",
    });
    for (const action of selected.slice(3, 6))
      expect(action).toMatchObject({
        class: "ui",
        requestSize: { width: 384, height: 384 },
        outputSize: { width: 192, height: 192 },
        postprocess: "lanczos3-resize",
      });
    expect(selected[6]).toMatchObject({
      postprocess: "sprite-derived-portrait",
      styleReference: "unit-original-captain",
    });
    expect(selected[7]).toMatchObject({
      postprocess: "sprite-derived-portrait",
      styleReference: "unit-original-knight",
    });
  });

  it("publishes explicit revision-9 semantic mappings without runtime wiring", () => {
    expect(RULESET7_REVISION9_UNIT_ART_IDS).toEqual({
      CAPTAIN: "unit-original-captain",
      KNIGHT: "unit-original-knight",
    });
    expect(RULESET7_REVISION9_PORTRAIT_ART_IDS).toEqual({
      CAPTAIN: "portrait-original-captain",
      KNIGHT: "portrait-original-knight",
    });
    expect(RULESET7_REVISION9_IMPROVEMENT_ART_IDS).toEqual({
      SHIPYARD: "building-ruleset7-shipyard",
    });
    expect(RULESET7_REVISION9_ACTION_ART_IDS).toEqual({
      RALLY: "ui-action-rally-v7r9",
      CULTIVATE_FOREST: "ui-action-cultivate-forest-v7r9",
      BLAST_MOUNTAIN: "ui-action-blast-mountain-v7r9",
    });
  });

  it("publishes accepted hash-locked outputs, receipts, and explicit registry mappings", async () => {
    const { recipes, records } = await manifests();
    const receiptNames = await readdir("art/pixellab/submissions");
    const receipts = await Promise.all(
      receiptNames.map(
        async (name) =>
          JSON.parse(
            await readFile(path.join("art/pixellab/submissions", name), "utf8"),
          ) as { readonly id?: string; readonly jobId?: string },
      ),
    );
    for (const id of [
      ...RULESET7_REVISION9_SOURCE_IDS,
      ...RULESET7_REVISION9_PORTRAIT_IDS,
    ]) {
      const recipe = recipes.find((candidate) => candidate.id === id);
      const record = records[id];
      expect(recipe, id).toBeDefined();
      expect(record, id).toMatchObject({
        status: "ACCEPTED",
        reviewChecks: {
          source: true,
          native: true,
          enlarged: true,
          minimumZoom: true,
          composition: true,
        },
      });
      const bytes = await readFile(path.join(recipe?.output ?? ""));
      expect(sha256(bytes), id).toBe(record?.outputSha256);
      const metadata = await sharp(bytes).metadata();
      expect({ width: metadata.width, height: metadata.height }, id).toEqual(
        recipe?.outputSize,
      );
      expect(ACCEPTED_ART_URLS[id], id).toContain(
        (recipe?.output ?? "").replace(/^public\//, ""),
      );
      if (RULESET7_REVISION9_SOURCE_IDS.includes(id as never)) {
        expect(record?.jobId, id).toBeTruthy();
        expect(record?.providerOutputSha256, id).toBeTruthy();
        expect(
          receipts.some(
            (receipt) => receipt.id === id && receipt.jobId === record?.jobId,
          ),
          id,
        ).toBe(true);
      } else {
        const sourceId = recipe?.styleReference ?? "";
        expect(record?.request?.styleReference).toMatchObject({
          id: sourceId,
          sha256: records[sourceId]?.outputSha256,
        });
      }
    }
  });
});

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
