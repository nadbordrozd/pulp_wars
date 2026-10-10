import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  RULESET7_REVISION9_SOURCE_IDS,
  assertRuleset7Revision9ArtOrder,
} from "../../scripts/art/ruleset7-revision9-art-order";
import { ACCEPTED_ART_URLS } from "../../src/assets/generated-art-manifest";

interface Recipe {
  readonly id: string;
  readonly class: string;
  readonly output: string;
  readonly requestSize: { readonly width: number; readonly height: number };
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly displayScale?: number;
  readonly cosmeticOffsetY?: number;
  readonly postprocess?: string;
}

interface RecordEntry {
  readonly status: string;
  readonly jobId?: string;
  readonly outputSha256?: string;
  readonly providerOutputSha256?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
}

async function manifests() {
  const [sourceText, generatedText] = await Promise.all([
    readFile("scripts/art/pixellab-manifest.json", "utf8"),
    readFile("scripts/art/pixellab-generated.json", "utf8"),
  ]);
  return {
    source: JSON.parse(sourceText) as {
      readonly recipes: readonly Recipe[];
      readonly retired: readonly { readonly id: string }[];
    },
    records: (
      JSON.parse(generatedText) as {
        records: Readonly<Record<string, RecordEntry>>;
      }
    ).records,
  };
}

// The Shipyard, the three action icons and the two portraits of this family
// are retired (bead pulp_wars-67q.15); the Captain and Knight sprites stay.
describe("Ruleset 7 revision-9 art assets", () => {
  it("enforces the serial Captain-then-Knight source gates", () => {
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
        RULESET7_REVISION9_SOURCE_IDS.map((id) => ({ id })),
        accepted([]),
      ),
    ).toThrow("separate individual gates");
    expect(() =>
      assertRuleset7Revision9ArtOrder(
        [{ id: "unit-original-captain" }, { id: "unit-warrior" }],
        accepted([]),
      ),
    ).toThrow("Do not mix");
    expect(() =>
      assertRuleset7Revision9ArtOrder([{ id: "unit-warrior" }], accepted([])),
    ).not.toThrow();
  });

  it("records the two world sprites and retires the rest of the family", async () => {
    const { source } = await manifests();
    const [captain, knight] = RULESET7_REVISION9_SOURCE_IDS.map((id) =>
      source.recipes.find((recipe) => recipe.id === id),
    );
    expect(captain).toMatchObject({
      class: "units",
      requestSize: { width: 256, height: 296 },
      anchor: { x: 128, y: 222 },
      displayScale: 0.25,
      cosmeticOffsetY: 18,
      postprocess: "unit-fit",
    });
    expect(knight).toMatchObject({
      class: "units",
      requestSize: { width: 384, height: 384 },
      anchor: { x: 192, y: 288 },
      displayScale: 0.27,
      cosmeticOffsetY: 18,
      postprocess: "unit-fit",
    });
    for (const id of [
      "building-ruleset7-shipyard",
      "ui-action-rally-v7r9",
      "ui-action-cultivate-forest-v7r9",
      "ui-action-blast-mountain-v7r9",
      "portrait-original-captain",
      "portrait-original-knight",
    ]) {
      expect(
        source.recipes.some((recipe) => recipe.id === id),
        id,
      ).toBe(false);
      expect(
        source.retired.some((entry) => entry.id === id),
        id,
      ).toBe(true);
      expect(ACCEPTED_ART_URLS[id], id).toBeUndefined();
    }
  });

  it("publishes accepted hash-locked outputs and receipts", async () => {
    const { source, records } = await manifests();
    const receiptNames = await readdir("art/pixellab/submissions");
    const receipts = await Promise.all(
      receiptNames.map(
        async (name) =>
          JSON.parse(
            await readFile(path.join("art/pixellab/submissions", name), "utf8"),
          ) as { readonly id?: string; readonly jobId?: string },
      ),
    );
    for (const id of RULESET7_REVISION9_SOURCE_IDS) {
      const recipe = source.recipes.find((candidate) => candidate.id === id);
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
      expect(record?.jobId, id).toBeTruthy();
      expect(record?.providerOutputSha256, id).toBeTruthy();
      expect(
        receipts.some(
          (receipt) => receipt.id === id && receipt.jobId === record?.jobId,
        ),
        id,
      ).toBe(true);
    }
  });
});

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}
