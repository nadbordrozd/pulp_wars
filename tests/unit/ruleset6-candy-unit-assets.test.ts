import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_ART_ALIASES,
  ACCEPTED_ART_ATTACHMENTS,
  ACCEPTED_ART_URLS,
} from "../../src/assets/generated-art-manifest";
import { UNIT_ROLE_IDS } from "../../src/engine/index";
import { unitCoverageV6 } from "../../src/render/canvas/asset-coverage-v6";
import {
  RULESET6_UNIT_COSMETIC_OFFSET_Y,
  UNIT_SCALE_CONTRACT,
} from "../../src/render/canvas/board-art-geometry";

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
  readonly fitOffsetX?: number;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly hardBounds: Bounds;
  readonly projectileOrigin?: { readonly x: number; readonly y: number };
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
    readonly fitOffsetX?: number;
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
  ["unit-candy-scout", 256, 296, { x: 128, y: 222 }, "standard", undefined],
  ["unit-candy-medic", 256, 296, { x: 128, y: 222 }, "standard", undefined],
  ["unit-candy-heavy", 256, 296, { x: 128, y: 222 }, "standard", undefined],
  ["unit-candy-breacher", 384, 384, { x: 192, y: 288 }, "siege", 37],
  ["unit-candy-juggernaut", 384, 448, { x: 192, y: 336 }, "giant", undefined],
] as const;

describe("ruleset-6 Candy production unit art", () => {
  it("binds every Candy role to an accepted explicit v6 sprite id", () => {
    for (const { role, slug } of roles) {
      const coverage = unitCoverageV6("CANDY", role);
      expect(coverage.status, role).toBe("ACCEPTED");
      if (coverage.status !== "ACCEPTED") continue;
      expect(coverage.assetId).toBe(`unit-candy-${slug}`);
      expect(ACCEPTED_ART_URLS[coverage.assetId]).toMatch(
        /^\/assets\/pixellab\/units\//,
      );
    }
  });

  it("records the four deliberate Candy role aliases exactly", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as SourceManifest;
    const expected = {
      "unit-candy-fighter": {
        source: "unit-candy-warrior",
        semanticRole: "CANDY_FIGHTER_CANDY_WARRIOR",
      },
      "unit-candy-marksman": {
        source: "unit-candy-gumball-guard",
        semanticRole: "CANDY_MARKSMAN_GUMBALL_GUARD",
      },
      "unit-candy-guard": {
        source: "unit-candy-choco-engineer",
        semanticRole: "CANDY_GUARD_CHOCO_ENGINEER",
      },
      "unit-candy-raider": {
        source: "unit-candy-donut",
        semanticRole: "CANDY_RAIDER_DONUT",
      },
    } as const;
    for (const [id, alias] of Object.entries(expected)) {
      expect(ACCEPTED_ART_ALIASES[id]).toBe(alias.source);
      expect(
        source.aliases.find((candidate) => candidate.id === id),
      ).toMatchObject(alias);
    }
  });

  it("keeps every new map sprite on its exact untrimmed class geometry", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as SourceManifest;
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as GeneratedManifest;
    for (const [
      id,
      width,
      height,
      anchor,
      scaleClass,
      fitOffsetX,
    ] of newSources) {
      const recipe = source.recipes.find((candidate) => candidate.id === id);
      const record = generated.records[id];
      expect(recipe).toMatchObject({
        outputSize: { width, height },
        anchor,
        postprocess: "unit-fit",
      });
      expect(recipe?.fitOffsetX).toBe(fitOffsetX);
      expect(record).toMatchObject({ status: "ACCEPTED", width, height });
      expect(record?.request?.fitOffsetX).toBe(fitOffsetX);
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
          "CANDY",
          id
            .replace("unit-candy-", "")
            .toUpperCase() as (typeof UNIT_ROLE_IDS)[number],
        ).geometry.displayScale,
      ).toBe(UNIT_SCALE_CONTRACT[scaleClass].displayScale);
    }
    expect(
      generated.records["unit-candy-breacher"]?.rejectedAttempts,
    ).toHaveLength(2);
    expect(
      generated.records["unit-candy-juggernaut"]?.rejectedAttempts,
    ).toHaveLength(1);
  });

  it("publishes nine manifest-backed 256px portraits with final-source provenance", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as SourceManifest;
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as GeneratedManifest;
    for (const { slug } of roles) {
      const id = `portrait-candy-${slug}`;
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
        `assets/pixellab/ui/portrait-candy-${slug}.png`,
      );
    }
  });

  it("uses the shared visible-bound placement and preserves the opaque Gumball Guard muzzle", async () => {
    for (const role of UNIT_ROLE_IDS)
      expect(unitCoverageV6("CANDY", role).geometry.offsetY, role).toBe(
        RULESET6_UNIT_COSMETIC_OFFSET_Y,
      );

    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as SourceManifest;
    const recipe = source.recipes.find(
      (candidate) => candidate.id === "unit-candy-gumball-guard",
    );
    expect(recipe?.projectileOrigin).toEqual({ x: 0.6523, y: 0.5156 });
    expect(
      ACCEPTED_ART_ATTACHMENTS["unit-candy-gumball-guard"]?.projectileOrigin,
    ).toEqual({ x: 0.6523, y: 0.5156 });
    const { data, info } = await sharp(
      "public/assets/pixellab/units/candy-gumball-guard.png",
    )
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const x = Math.round(0.6523 * info.width);
    const y = Math.round(0.5156 * info.height);
    expect({ x, y }).toEqual({ x: 167, y: 153 });
    expect(data[(y * info.width + x) * info.channels + 3]).toBe(255);
  });

  it("checks in passing numeric and visual evidence for every required context", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset6-candy-units/review-evidence.json",
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
      readonly rejectionHistory: Readonly<Record<string, readonly unknown[]>>;
      readonly reviewCoverage: readonly string[];
      readonly artifacts: readonly {
        readonly filename: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
      readonly visualReview: { readonly status: string };
    };
    expect(evidence.measurements).toHaveLength(9);
    expect(evidence.visualReview.status).toBe("ACCEPTED");
    expect(evidence.rejectionHistory["unit-candy-breacher"]).toHaveLength(2);
    expect(evidence.rejectionHistory["unit-candy-juggernaut"]).toHaveLength(1);
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
      const path = `art/pixellab/reviews/ruleset6-candy-units/${artifact.filename}`;
      const bytes = await readFile(path);
      expect(bytes.byteLength).toBe(artifact.bytes);
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        artifact.sha256,
      );
      expect(artifact.bytes).toBeGreaterThan(1_000);
      if (artifact.filename === "individual-source-native-enlarged-minimum.png")
        expect((await sharp(path).metadata()).width).toBeGreaterThanOrEqual(
          1_420,
        );
    }
  });
});
