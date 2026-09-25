import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  RULESET7_LOGISTICS_SOURCE_IDS,
  assertRuleset7LogisticsArtOrder,
} from "../../scripts/art/ruleset7-logistics-art-order";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";
import { RULESET7_LOGISTICS_ART_IDS } from "../../src/assets/ruleset7-logistics-art";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
} from "../../src/assets/ruleset7-ui-art";

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
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly displayScale?: number;
  readonly groundContactY?: number;
  readonly postprocess?: string;
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
  readonly rejectedAttempts?: readonly { readonly jobId?: string }[];
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

describe("Ruleset 7 revision-11 logistics art", () => {
  it("guards the two PixelLab requests as separate ordered sources", () => {
    const accepted = (ids: readonly string[]) => ({
      records: Object.fromEntries(
        ids.map((id) => [id, { status: "ACCEPTED" }]),
      ),
    });
    expect(() =>
      assertRuleset7LogisticsArtOrder(
        RULESET7_LOGISTICS_SOURCE_IDS.map((id) => ({ id })),
        accepted([]),
      ),
    ).toThrow("individually");
    expect(() =>
      assertRuleset7LogisticsArtOrder(
        [{ id: "terrain-ruleset7-resource-fish-v7r11" }],
        accepted([]),
      ),
    ).toThrow("Accept building-ruleset7-port-v7r11");
    expect(() =>
      assertRuleset7LogisticsArtOrder(
        [{ id: "building-ruleset7-port-v7r11" }],
        accepted([]),
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7LogisticsArtOrder(
        [{ id: "terrain-ruleset7-resource-fish-v7r11" }],
        accepted(["building-ruleset7-port-v7r11"]),
      ),
    ).not.toThrow();
    expect(() =>
      assertRuleset7LogisticsArtOrder(
        [
          { id: "building-ruleset7-port-v7r11" },
          { id: "unit-original-captain" },
        ],
        accepted([]),
      ),
    ).toThrow("unrelated generation families");
  });

  it("records exactly the approved source geometry and keeps runtime mappings deferred", async () => {
    const { recipes } = await manifests();
    expect(
      recipes.filter(({ id }) => id.endsWith("v7r11")).map(({ id }) => id),
    ).toEqual(RULESET7_LOGISTICS_SOURCE_IDS);
    expect(
      recipes.find(({ id }) => id === RULESET7_LOGISTICS_ART_IDS.PORT),
    ).toMatchObject({
      class: "buildings",
      stage: "sample",
      requestSize: { width: 384, height: 384 },
      outputSize: { width: 384, height: 384 },
      anchor: { x: 192, y: 288 },
      groundContactY: 288,
      displayScale: 0.3,
      postprocess: "compact-building-fit",
      hardBounds: { left: 12, top: 36, right: 372, bottom: 340 },
    });
    expect(
      recipes.find(({ id }) => id === RULESET7_LOGISTICS_ART_IDS.FISH),
    ).toMatchObject({
      class: "terrain",
      stage: "sample",
      requestSize: { width: 256, height: 384 },
      outputSize: { width: 256, height: 384 },
      anchor: { x: 128, y: 256 },
      groundContactY: 320,
      displayScale: 0.5,
      postprocess: "preferred-low-marker-fit",
      preferredBounds: { left: 48, top: 180, right: 208, bottom: 320 },
      hardBounds: { left: 40, top: 148, right: 216, bottom: 336 },
    });
    expect(RULESET7_IMPROVEMENT_ART_IDS.PORT).toBe("building-ruleset7-port");
    expect(RULESET7_RESOURCE_ART_IDS.FISH).toBe(
      "terrain-ruleset7-resource-fish",
    );
  });

  it("locks accepted outputs, every submission receipt, and the static source registry", async () => {
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
    for (const id of RULESET7_LOGISTICS_SOURCE_IDS) {
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
      expect(record?.providerOutputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      const bytes = await readFile(recipe?.output ?? "");
      expect(sha256(bytes), id).toBe(record?.outputSha256);
      expect(ACCEPTED_ART_URLS[id], id).toContain(
        (recipe?.output ?? "").replace(/^public\//, ""),
      );
      for (const jobId of [
        record?.jobId,
        ...(record?.rejectedAttempts ?? []).map((attempt) => attempt.jobId),
      ])
        expect(
          receipts.some(
            (receipt) => receipt.id === id && receipt.jobId === jobId,
          ),
          `${id} receipt ${jobId}`,
        ).toBe(true);
    }
  });

  it("enforces the substantial Port and six-separated-fish image contracts", async () => {
    const { recipes } = await manifests();
    const currentPort = required(
      recipes.find(({ id }) => id === RULESET7_LOGISTICS_ART_IDS.PORT),
    );
    const previousPort = required(
      recipes.find(({ id }) => id === "building-ruleset7-port"),
    );
    const currentFish = required(
      recipes.find(({ id }) => id === RULESET7_LOGISTICS_ART_IDS.FISH),
    );
    const [portMetric, oldPortMetric, fishMetric] = await Promise.all([
      measure(currentPort.output),
      measure(previousPort.output),
      measure(currentFish.output),
    ]);
    expect(
      portMetric.bounds.right - portMetric.bounds.left,
    ).toBeGreaterThanOrEqual(300);
    expect(
      portMetric.bounds.bottom - portMetric.bounds.top,
    ).toBeGreaterThanOrEqual(210);
    expect(
      portMetric.weightedArea / oldPortMetric.weightedArea,
    ).toBeGreaterThanOrEqual(1.25);
    expect(fishMetric.components).toHaveLength(6);
    expect(
      Math.max(...fishMetric.components) / Math.min(...fishMetric.components),
    ).toBeLessThan(2.25);
  });
});

async function measure(input: string): Promise<{
  readonly bounds: Bounds;
  readonly weightedArea: number;
  readonly components: readonly number[];
}> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = 0;
  let bottom = 0;
  let weightedArea = 0;
  const mask = new Uint8Array(info.width * info.height);
  for (let y = 0; y < info.height; y += 1)
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3] ?? 0;
      weightedArea += alpha / 255;
      if (alpha > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
      if (alpha >= 32) mask[y * info.width + x] = 1;
    }
  return {
    bounds: { left, top, right, bottom },
    weightedArea,
    components: components(mask, info.width, info.height).filter(
      (area) => area >= 50,
    ),
  };
}

function components(mask: Uint8Array, width: number, height: number): number[] {
  const areas: number[] = [];
  const queue: number[] = [];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] !== 1) continue;
    mask[start] = 2;
    queue.push(start);
    let area = 0;
    while (queue.length > 0) {
      const current = required(queue.pop());
      area += 1;
      const x = current % width;
      const y = Math.floor(current / width);
      for (const next of [
        x > 0 ? current - 1 : -1,
        x + 1 < width ? current + 1 : -1,
        y > 0 ? current - width : -1,
        y + 1 < height ? current + width : -1,
      ]) {
        if (next >= 0 && mask[next] === 1) {
          mask[next] = 2;
          queue.push(next);
        }
      }
    }
    areas.push(area);
  }
  return areas;
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing required test value");
  return value;
}
