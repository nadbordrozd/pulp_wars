import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  RULESET7_PLAYTEST_CAPTAIN_ID,
  RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
  assertRuleset7PlaytestArtOrder,
} from "../../scripts/art/ruleset7-playtest-art-order";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import {
  RULESET7_PLAYTEST_PORTRAIT_ART_IDS,
  RULESET7_PLAYTEST_TECH_ART_IDS,
  RULESET7_PLAYTEST_UNIT_ART_IDS,
} from "../../src/assets/ruleset7-playtest-art";

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
  readonly preferredBounds?: Bounds;
  readonly hardBounds: Bounds;
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

describe("Ruleset 7 playtest art", () => {
  it("enforces the individual Captain source and dependent portrait gates", () => {
    expect(() =>
      assertRuleset7PlaytestArtOrder(
        [{ id: RULESET7_PLAYTEST_CAPTAIN_ID }, { id: "unit-original-knight" }],
        { records: {} },
      ),
    ).toThrow("individually");
    expect(() =>
      assertRuleset7PlaytestArtOrder(
        [{ id: RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID }],
        { records: {} },
      ),
    ).toThrow(RULESET7_PLAYTEST_CAPTAIN_ID);
    expect(() =>
      assertRuleset7PlaytestArtOrder(
        [{ id: RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID }],
        {
          records: {
            [RULESET7_PLAYTEST_CAPTAIN_ID]: { status: "ACCEPTED" },
          },
        },
      ),
    ).not.toThrow();
  });

  it("records the versioned Captain calibration and deterministic portrait", async () => {
    const { recipes, records } = await manifests();
    const captain = recipes.find(
      ({ id }) => id === RULESET7_PLAYTEST_CAPTAIN_ID,
    );
    const portrait = recipes.find(
      ({ id }) => id === RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
    );
    expect(captain).toMatchObject({
      class: "units",
      requestSize: { width: 256, height: 296 },
      outputSize: { width: 256, height: 296 },
      anchor: { x: 128, y: 222 },
      groundContactY: 222,
      displayScale: 0.275,
      cosmeticOffsetY: 18,
      postprocess: "unit-fit",
      styleReference: "unit-warrior",
      preferredBounds: { left: 28, top: 8, right: 228, bottom: 222 },
    });
    expect(captain?.prompt).toMatch(/bicorne/i);
    expect(captain?.prompt).toMatch(/epaulettes/i);
    expect(captain?.prompt).toMatch(/sash/i);
    expect(captain?.prompt).toMatch(/coat/i);
    expect(captain?.negativePrompt).toMatch(/flag/);
    expect(portrait).toMatchObject({
      class: "ui",
      postprocess: "sprite-derived-portrait",
      styleReference: RULESET7_PLAYTEST_CAPTAIN_ID,
    });
    expect(records[RULESET7_PLAYTEST_CAPTAIN_ID]?.alphaBounds).toEqual({
      left: 28,
      top: 9,
      right: 228,
      bottom: 222,
      empty: false,
    });
    const bounds = records[RULESET7_PLAYTEST_CAPTAIN_ID]?.alphaBounds;
    expect(bounds).toBeDefined();
    expect(((bounds?.right ?? 0) - (bounds?.left ?? 0)) * 0.275).toBeCloseTo(
      55,
      2,
    );
    expect(((bounds?.bottom ?? 0) - (bounds?.top ?? 0)) * 0.275).toBeCloseTo(
      58.58,
      2,
    );
  });

  it("keeps revision-9 Captain bytes frozen and publishes versioned accepted outputs", async () => {
    const { recipes, records } = await manifests();
    expect(
      hash(
        await readFile(
          "public/assets/pixellab/units/original-captain-v7r9.png",
        ),
      ),
    ).toBe("fb521ed596568b23530c588c3c07cf128d64bcc7c585d7232174627df2608504");
    expect(
      hash(
        await readFile(
          "public/assets/pixellab/ui/portrait-original-captain-v7r9.png",
        ),
      ),
    ).toBe("0186989e0d71b0a4e836507916b5ad2c72cd02edc6ace46cf538ef137282c344");
    const receipts = await Promise.all(
      (await readdir("art/pixellab/submissions")).map(async (name) =>
        JSON.parse(
          await readFile(path.join("art/pixellab/submissions", name), "utf8"),
        ),
      ),
    );
    for (const id of [
      RULESET7_PLAYTEST_CAPTAIN_ID,
      RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
    ]) {
      const recipe = recipes.find((entry) => entry.id === id);
      const record = records[id];
      expect(record).toMatchObject({
        status: "ACCEPTED",
        reviewChecks: {
          source: true,
          native: true,
          enlarged: true,
          minimumZoom: true,
          composition: true,
        },
      });
      const bytes = await readFile(recipe?.output ?? "");
      expect(hash(bytes)).toBe(record?.outputSha256);
      expect(await sharp(bytes).metadata()).toMatchObject(
        recipe?.outputSize ?? {},
      );
      expect(ACCEPTED_ART_URLS[id]).toContain(
        (recipe?.output ?? "").replace(/^public\//, ""),
      );
    }
    const sourceRecord = records[RULESET7_PLAYTEST_CAPTAIN_ID];
    expect(sourceRecord?.jobId).toBeTruthy();
    expect(sourceRecord?.providerOutputSha256).toBeTruthy();
    expect(
      receipts.some(
        (receipt) =>
          receipt.id === RULESET7_PLAYTEST_CAPTAIN_ID &&
          receipt.jobId === sourceRecord?.jobId,
      ),
    ).toBe(true);
    expect(
      records[RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID]?.request?.styleReference,
    ).toEqual({
      id: RULESET7_PLAYTEST_CAPTAIN_ID,
      sha256: sourceRecord?.outputSha256,
      usageDescription:
        "Deterministic full-silhouette fit into the 256x256 portrait safe area; no provider request.",
    });
  });

  it("registers Raider for Scouting and Pillage for Raiding without live wiring", async () => {
    expect(RULESET7_PLAYTEST_UNIT_ART_IDS).toEqual({
      CAPTAIN: RULESET7_PLAYTEST_CAPTAIN_ID,
    });
    expect(RULESET7_PLAYTEST_PORTRAIT_ART_IDS).toEqual({
      CAPTAIN: RULESET7_PLAYTEST_CAPTAIN_PORTRAIT_ID,
    });
    expect(RULESET7_PLAYTEST_TECH_ART_IDS).toEqual({
      SCOUTING: "portrait-original-raider",
      RAIDING: "ui-action-pillage",
    });
    const { recipes, records } = await manifests();
    for (const id of Object.values(RULESET7_PLAYTEST_TECH_ART_IDS)) {
      const recipe = recipes.find((entry) => entry.id === id);
      expect(records[id]?.status).toBe("ACCEPTED");
      expect(hash(await readFile(recipe?.output ?? ""))).toBe(
        records[id]?.outputSha256,
      );
    }
  });

  it("checks in deterministic native, map, technology and dock review evidence", async () => {
    const reviewRoot = "art/pixellab/reviews/ruleset7-playtest";
    const evidence = JSON.parse(
      await readFile(path.join(reviewRoot, "review-evidence.json"), "utf8"),
    ) as {
      readonly measuredHints: {
        readonly captainVisibleCss: {
          readonly width: number;
          readonly height: number;
        };
      };
      readonly reuse: Readonly<Record<string, string>>;
      readonly checks: Readonly<Record<string, boolean>>;
      readonly artifacts: Readonly<Record<string, string>>;
    };
    expect(evidence.measuredHints.captainVisibleCss).toEqual({
      width: 55,
      height: 58.58,
    });
    expect(evidence.reuse).toEqual({
      scouting: "portrait-original-raider",
      raiding: "ui-action-pillage",
    });
    expect(Object.values(evidence.checks).every(Boolean)).toBe(true);
    for (const [name, expectedHash] of Object.entries(evidence.artifacts))
      expect(hash(await readFile(path.join(reviewRoot, name))), name).toBe(
        expectedHash,
      );
  });
});

function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
