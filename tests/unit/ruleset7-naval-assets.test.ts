import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const contracts = new Map([
  ["terrain-ruleset7-water-shallow", [256, 256, 128, 128, 0.5]],
  ["terrain-ruleset7-water-deep", [256, 256, 128, 128, 0.5]],
  ["terrain-ruleset7-resource-fish", [256, 384, 128, 256, 0.5]],
  ["terrain-ruleset7-resource-pearls", [256, 384, 128, 256, 0.5]],
  ["building-ruleset7-port", [384, 384, 192, 288, 0.3]],
  ["unit-shared-embarked-transport", [384, 384, 192, 288, 0.24]],
  ["unit-original-patrol-boat", [384, 384, 192, 288, 0.24]],
  ["unit-original-battleship", [384, 384, 192, 288, 0.27]],
]);

describe("Ruleset 7 naval assets", () => {
  it("records the exact eight-source PixelLab inventory and geometry", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(root, "scripts/art/pixellab-manifest.json"),
        "utf8",
      ),
    ) as { recipes: Array<Record<string, unknown>> };
    const generated = JSON.parse(
      await readFile(
        path.join(root, "scripts/art/pixellab-generated.json"),
        "utf8",
      ),
    ) as {
      records: Record<
        string,
        { status?: string; outputSha256?: string; jobId?: string }
      >;
    };
    for (const [
      id,
      [width, height, anchorX, anchorY, displayScale],
    ] of contracts) {
      const recipe = manifest.recipes.find((candidate) => candidate.id === id);
      expect(recipe).toMatchObject({
        id,
        requestSize: { width, height },
        outputSize: { width, height },
        anchor: { x: anchorX, y: anchorY },
        displayScale,
      });
      expect(generated.records[id]).toMatchObject({
        status: "ACCEPTED",
        jobId: expect.any(String),
        outputSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      });
      const output = path.join(root, String(recipe?.output));
      expect(await sharp(output).metadata()).toMatchObject({ width, height });
      expect(hash(await readFile(output))).toBe(
        generated.records[id]?.outputSha256,
      );
    }
    expect(
      manifest.recipes.some(
        (recipe) => recipe.id === "ui-tech-navigation-v7r6",
      ),
    ).toBe(false);
  });

  it("keeps water opaque and all transparent sources inside hard bounds", async () => {
    const manifest = JSON.parse(
      await readFile(
        path.join(root, "scripts/art/pixellab-manifest.json"),
        "utf8",
      ),
    ) as {
      recipes: Array<{
        id: string;
        output: string;
        hardBounds: Bounds;
      }>;
    };
    for (const id of contracts.keys()) {
      const recipe = required(
        manifest.recipes.find((candidate) => candidate.id === id),
        id,
      );
      const image = sharp(path.join(root, recipe.output)).ensureAlpha();
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });
      const bounds = alphaBounds(data, info.width, info.height);
      expect(bounds.left).toBeGreaterThanOrEqual(recipe.hardBounds.left);
      expect(bounds.top).toBeGreaterThanOrEqual(recipe.hardBounds.top);
      expect(bounds.right).toBeLessThanOrEqual(recipe.hardBounds.right);
      expect(bounds.bottom).toBeLessThanOrEqual(recipe.hardBounds.bottom);
      if (id.includes("water-")) {
        const { channels } = await image.stats();
        expect(channels[3]?.min).toBe(255);
      }
    }
  });

  it("preserves receipt-backed ordered unit provenance", async () => {
    const generated = JSON.parse(
      await readFile(
        path.join(root, "scripts/art/pixellab-generated.json"),
        "utf8",
      ),
    ) as {
      records: Record<
        string,
        { jobId?: string; outputSha256?: string; rejectedAttempts?: unknown[] }
      >;
    };
    const receipts = await Promise.all(
      (await readdir(path.join(root, "art/pixellab/submissions")))
        .filter((name) => name.endsWith(".json"))
        .map(
          async (name) =>
            JSON.parse(
              await readFile(
                path.join(root, "art/pixellab/submissions", name),
                "utf8",
              ),
            ) as Receipt,
        ),
    );
    const receiptFor = (id: string): Receipt | undefined =>
      receipts.find(
        (receipt) =>
          receipt.id === id && receipt.jobId === generated.records[id]?.jobId,
      );
    for (const id of contracts.keys()) expect(receiptFor(id)).toBeDefined();
    expect(
      receiptFor("unit-original-patrol-boat")?.request.styleReference,
    ).toMatchObject({
      id: "unit-shared-embarked-transport",
      sha256:
        "6faa7fbb10b8b0346210e3b823055c4079055d78ceb628a6585e0ae6cb3c820f",
    });
    expect(
      hash(
        await readFile(
          path.join(
            root,
            "art/pixellab/reframe-sources/unit-shared-embarked-transport-6faa7fbb10b8.png",
          ),
        ),
      ),
    ).toBe("6faa7fbb10b8b0346210e3b823055c4079055d78ceb628a6585e0ae6cb3c820f");
    expect(
      receiptFor("unit-original-battleship")?.request.styleReference,
    ).toMatchObject({
      id: "unit-original-patrol-boat",
      sha256: generated.records["unit-original-patrol-boat"]?.outputSha256,
    });
    expect(
      Object.values(generated.records).some((record) =>
        record.rejectedAttempts?.some((attempt) =>
          JSON.stringify(attempt).includes("PIXELLAB_API_KEY"),
        ),
      ),
    ).toBe(false);
  });

  it("checks complete deterministic visual evidence", async () => {
    const reviewRoot = path.join(root, "art/pixellab/reviews/ruleset7-naval");
    const evidence = JSON.parse(
      await readFile(path.join(reviewRoot, "review-evidence.json"), "utf8"),
    ) as {
      inventory: Array<{ id: string }>;
      conditionalNavigationSymbol: string;
      checks: Record<string, boolean>;
      artifacts: Record<string, string>;
    };
    expect(evidence.inventory.map(({ id }) => id)).toEqual([
      ...contracts.keys(),
    ]);
    expect(evidence.conditionalNavigationSymbol).toBe(
      "not-generated-deep-water-readable",
    );
    expect(Object.values(evidence.checks).every(Boolean)).toBe(true);
    for (const [artifact, expectedHash] of Object.entries(evidence.artifacts))
      expect(hash(await readFile(path.join(reviewRoot, artifact)))).toBe(
        expectedHash,
      );
  });
});

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
interface Receipt {
  id: string;
  jobId: string;
  request: { styleReference?: { id?: string; sha256?: string } };
}
function alphaBounds(data: Buffer, width: number, height: number): Bounds {
  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      if ((data[(y * width + x) * 4 + 3] ?? 0) > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + 1);
        bottom = Math.max(bottom, y + 1);
      }
  return { left, top, right, bottom };
}
function hash(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
function required<T>(value: T | undefined, name: string): T {
  if (value === undefined) throw new Error(`Missing ${name}`);
  return value;
}
