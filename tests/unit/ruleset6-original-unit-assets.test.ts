import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_ART_ALIASES,
  ACCEPTED_ART_URLS,
} from "../../src/assets/generated-art-manifest";
import { UNIT_ROLE_IDS } from "../../src/engine/index";
import { unitCoverageV6 } from "../../src/render/canvas/asset-coverage-v6";
import { UNIT_SCALE_CONTRACT } from "../../src/render/canvas/board-art-geometry";

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly output: string;
  readonly outputSize: { readonly width: number; readonly height: number };
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly hardBounds: Bounds;
}

interface SourceManifest {
  readonly aliases: readonly {
    readonly id: string;
    readonly source: string;
    readonly semanticRole: string;
  }[];
  readonly recipes: readonly Recipe[];
}

interface RecordEntry {
  readonly status: string;
  readonly outputSha256?: string;
  readonly width?: number;
  readonly height?: number;
  readonly alphaBounds?: Bounds;
  readonly rejectedAttempts?: readonly unknown[];
  readonly request?: {
    readonly postprocess?: string;
    readonly styleReference?: { readonly id: string; readonly sha256?: string };
  };
}

interface GeneratedManifest {
  readonly records: Readonly<Record<string, RecordEntry>>;
}

const roles = UNIT_ROLE_IDS.map((role) => ({
  role,
  slug: role.toLowerCase(),
}));
const newSources = [
  ["unit-original-scout", 256, 296, { x: 128, y: 222 }, "standard"],
  ["unit-original-medic", 256, 296, { x: 128, y: 222 }, "standard"],
  ["unit-original-heavy", 256, 296, { x: 128, y: 222 }, "standard"],
  ["unit-original-breacher", 384, 384, { x: 192, y: 288 }, "siege"],
  ["unit-original-juggernaut", 384, 448, { x: 192, y: 336 }, "giant"],
] as const;

describe("ruleset-6 Original production unit art", () => {
  it("binds every Original role to an accepted explicit v6 sprite id", () => {
    for (const { role, slug } of roles) {
      const coverage = unitCoverageV6("ORIGINAL", role);
      expect(coverage.status, role).toBe("ACCEPTED");
      if (coverage.status !== "ACCEPTED") continue;
      expect(coverage.assetId).toBe(`unit-original-${slug}`);
      expect(ACCEPTED_ART_URLS[coverage.assetId]).toMatch(
        /^\/assets\/pixellab\/units\//,
      );
    }
  });

  it("records the four deliberate v6 role aliases exactly", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as SourceManifest;
    const expected = {
      "unit-original-fighter": "unit-warrior",
      "unit-original-marksman": "unit-archer",
      "unit-original-guard": "unit-defender",
      "unit-original-raider": "unit-rider",
    } as const;
    for (const [id, aliasSource] of Object.entries(expected)) {
      expect(ACCEPTED_ART_ALIASES[id]).toBe(aliasSource);
      expect(source.aliases.find((alias) => alias.id === id)).toMatchObject({
        source: aliasSource,
      });
    }
  });

  it("keeps every new map sprite on its exact untrimmed class geometry", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as SourceManifest;
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as GeneratedManifest;
    for (const [id, width, height, anchor, scaleClass] of newSources) {
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      const record = generated.records[id];
      expect(recipe).toMatchObject({
        outputSize: { width, height },
        anchor,
        postprocess: "unit-fit",
      });
      expect(record).toMatchObject({ status: "ACCEPTED", width, height });
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
      expect(
        unitCoverageV6(
          "ORIGINAL",
          id
            .replace("unit-original-", "")
            .toUpperCase() as (typeof UNIT_ROLE_IDS)[number],
        ).geometry.displayScale,
      ).toBe(UNIT_SCALE_CONTRACT[scaleClass].displayScale);
    }
    expect(
      generated.records["unit-original-breacher"]?.rejectedAttempts,
    ).toHaveLength(2);
  });

  it("publishes nine manifest-backed 256px portraits with final-source provenance", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as SourceManifest;
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as GeneratedManifest;
    for (const { slug } of roles) {
      const id = `portrait-original-${slug}`;
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      const record = generated.records[id];
      expect(recipe).toMatchObject({
        outputSize: { width: 256, height: 256 },
        postprocess: "sprite-derived-portrait",
        hardBounds: { left: 20, top: 20, right: 236, bottom: 236 },
      });
      expect(record).toMatchObject({
        status: "ACCEPTED",
        width: 256,
        height: 256,
      });
      expect(record?.request?.styleReference?.id).toBe(recipe?.styleReference);
      const sourceHash =
        recipe?.styleReference === undefined
          ? undefined
          : generated.records[recipe.styleReference]?.outputSha256;
      expect(record?.request?.styleReference?.sha256).toBe(sourceHash);
      expect(ACCEPTED_ART_URLS[id]).toContain(
        `assets/pixellab/ui/portrait-original-${slug}.png`,
      );
      expect(record?.rejectedAttempts?.length ?? 0).toBeGreaterThanOrEqual(1);
    }
  });

  it("checks in passing numeric and visual evidence for every required context", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset6-original-units/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly measurements: readonly {
        readonly id: string;
        readonly scaleClass: "standard" | "siege" | "giant";
        readonly visibleWidthRatio: number;
        readonly visibleHeightRatio: number;
        readonly opaqueDiamondAreaRatio: number;
        readonly maximumRearTileOcclusionRatio: number;
      }[];
      readonly reviewCoverage: readonly string[];
      readonly artifacts: readonly {
        readonly filename: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
      readonly visualReview: { readonly status: string };
      readonly rejectedPortraitAttemptCount: number;
    };
    expect(evidence.measurements).toHaveLength(9);
    expect(evidence.visualReview.status).toBe("ACCEPTED");
    expect(evidence.rejectedPortraitAttemptCount).toBeGreaterThanOrEqual(9);
    for (const measurement of evidence.measurements) {
      const contract = UNIT_SCALE_CONTRACT[measurement.scaleClass];
      expect(measurement.visibleWidthRatio).toBeLessThanOrEqual(
        contract.maximumVisibleWidthRatio,
      );
      expect(measurement.visibleHeightRatio).toBeLessThanOrEqual(
        contract.maximumVisibleHeightRatio,
      );
      if (contract.maximumOpaqueDiamondAreaRatio !== null)
        expect(measurement.opaqueDiamondAreaRatio).toBeLessThanOrEqual(
          contract.maximumOpaqueDiamondAreaRatio,
        );
      expect(measurement.maximumRearTileOcclusionRatio).toBeLessThanOrEqual(
        contract.maximumRearTileOcclusionRatio,
      );
    }
    expect(evidence.reviewCoverage.join(" ")).toContain(
      "all four owner colors",
    );
    expect(evidence.reviewCoverage.join(" ")).toContain("portrait 64 CSS px");
    for (const artifact of evidence.artifacts) {
      const bytes = await readFile(
        `art/pixellab/reviews/ruleset6-original-units/${artifact.filename}`,
      );
      expect(bytes.byteLength).toBe(artifact.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        artifact.sha256,
      );
      expect(artifact.bytes).toBeGreaterThan(1_000);
    }
  });
});
