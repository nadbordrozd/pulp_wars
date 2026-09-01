import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_ART_ALIASES,
  ACCEPTED_ART_URLS,
} from "../../src/assets/generated-art-manifest";
import {
  improvementCoverageV6,
  roadCoverageV6,
} from "../../src/render/canvas/asset-coverage-v6";
import {
  buildBoardDrawListV6,
  roadMaskAtV6,
} from "../../src/render/canvas/board-renderer-v6";
import type {
  BoardRenderPlanV6,
  RenderPlanEntryV6,
} from "../../src/render/canvas/render-plan-v6";

const BUILDING_IDS = [
  "building-farm",
  "building-quarry",
  "building-windmill",
  "building-sawmill",
  "building-forge",
  "building-stoneworks",
  "building-workshop",
  "building-grand-works",
  "building-market",
] as const;

const EXPECTED = {
  "building-farm": {
    sha256: "c8256173c6cbb846031ac05b327907c3ef425c5c466486d736d8bd082a726e9b",
    bounds: { left: 75, top: 130, right: 180, bottom: 222 },
  },
  "building-quarry": {
    sha256: "edff5ef36e7b01edd640b4dfb006c1988a69582298f7400abba8fb5e8eef181c",
    bounds: { left: 83, top: 126, right: 172, bottom: 222 },
  },
  "building-windmill": {
    sha256: "6ce840dc94e39cddd63225eb804123e5774055dc025c25d7a38f40c8ad04068e",
    bounds: { left: 108, top: 52, right: 276, bottom: 288 },
  },
  "building-sawmill": {
    sha256: "661acee29048d9e0e6d7ba8ea6bdfc546454d31e0ba576dde4a679bb1cf27f6c",
    bounds: { left: 76, top: 62, right: 308, bottom: 288 },
  },
  "building-forge": {
    sha256: "5abaf5b302712afca4897dd4d1e6cbbd4ec0437e40d8e7ebbf4e37d275d5b9d6",
    bounds: { left: 92, top: 64, right: 292, bottom: 288 },
  },
  "building-stoneworks": {
    sha256: "bb0202ec44307e938d827568d541c64048a24ec06363b46720018489e9187ac4",
    bounds: { left: 79, top: 58, right: 305, bottom: 288 },
  },
  "building-workshop": {
    sha256: "f1336fb53f069ad7956c6f6b565113ad3ab300c98a7cd1313ab3f3b08ce903d2",
    bounds: { left: 98, top: 72, right: 286, bottom: 288 },
  },
  "building-grand-works": {
    sha256: "64313dbd7b577ea2433c738feb47049bb374db5d4c7f208823b79d935e4c16e6",
    bounds: { left: 71, top: 48, right: 312, bottom: 288 },
  },
  "building-market": {
    sha256: "d3dfa959e971d5dff54a0a8c4c459ae4d38c8716b15fbc307a037aead3b148e3",
    bounds: { left: 91, top: 66, right: 292, bottom: 288 },
  },
} as const;

interface Bounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Recipe {
  readonly id: string;
  readonly stage: string;
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
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly outputSha256?: string;
  readonly candidateSha256?: string;
  readonly width?: number;
  readonly height?: number;
  readonly hasAlpha?: boolean;
  readonly alphaBounds?: Bounds & { readonly empty: boolean };
  readonly request?: {
    readonly endpoint: string;
    readonly model: string;
    readonly seed: number;
    readonly requestSize: { readonly width: number; readonly height: number };
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly postprocess?: string;
    readonly description: string;
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly notes?: string;
  }[];
}

describe("Ruleset 6 building and Road production art", () => {
  it("records the exact individual gate, bounded batches, compact geometry, and accepted hashes", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };
    const recipes = BUILDING_IDS.map((id) =>
      source.recipes.find((recipe) => recipe.id === id),
    );

    expect(recipes.every(Boolean)).toBe(true);
    expect(recipes.map((recipe) => recipe?.stage)).toEqual([
      "sample",
      "sample",
      "sample",
      "batch",
      "batch",
      "batch",
      "batch",
      "batch",
      "batch",
    ]);
    expect(recipes.map((recipe) => recipe?.seed)).toEqual([
      94101, 94112, 94103, 94201, 94202, 94203, 94301, 94302, 94303,
    ]);
    for (const [index, id] of BUILDING_IDS.entries()) {
      const recipe = recipes[index];
      const record = generated.records[id];
      const expected = EXPECTED[id];
      expect(recipe, id).toBeDefined();
      if (recipe === undefined) continue;
      const low = index < 2;
      expect(recipe.requestSize, id).toEqual({
        width: low ? 256 : 384,
        height: low ? 296 : 384,
      });
      expect(recipe.outputSize, id).toEqual(recipe.requestSize);
      expect(recipe.anchor, id).toEqual({
        x: low ? 128 : 192,
        y: low ? 222 : 288,
      });
      expect(recipe.groundContactY, id).toBe(low ? 222 : 288);
      expect(recipe.postprocess, id).toBe("compact-building-fit");
      expect(recipe.fitBounds, id).toBeDefined();
      if (!low) {
        expect(recipe.preferredBounds, id).toEqual({
          left: 24,
          top: 24,
          right: 360,
          bottom: 326,
        });
        expect(recipe.hardBounds, id).toEqual({
          left: 8,
          top: 8,
          right: 376,
          bottom: 344,
        });
      }
      expect(recipe.prompt.length, id).toBeGreaterThan(300);
      expect(recipe.negativePrompt.length, id).toBeGreaterThan(180);
      expect(record?.status, id).toBe("ACCEPTED");
      expect(record?.outputSha256, id).toBe(expected.sha256);
      expect(record?.candidateSha256, id).toBe(expected.sha256);
      expect(record?.alphaBounds, id).toEqual({
        ...expected.bounds,
        empty: false,
      });
      expect(record?.width, id).toBe(recipe.outputSize.width);
      expect(record?.height, id).toBe(recipe.outputSize.height);
      expect(record?.hasAlpha, id).toBe(true);
      expect(Object.values(record?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record?.request, id).toMatchObject({
        endpoint: "generate-image-v2",
        model: "generate-image-v2",
        seed: recipe.seed,
        requestSize: recipe.requestSize,
        outputSize: recipe.outputSize,
        postprocess: "compact-building-fit",
      });
      expect(record?.request?.description, id).not.toMatch(
        /bearer|api[_-]?key|pixellab_api_key/i,
      );
      const output = await readFile(recipe.output);
      expect(createHash("sha256").update(output).digest("hex"), id).toBe(
        expected.sha256,
      );
      expect(ACCEPTED_ART_URLS[id], id).toBe(
        `/${recipe.output.replace(/^public\//, "")}`,
      );
    }
  });

  it("preserves the rejected Quarry iteration and reuses Mine and Lumber Camp without duplicate rasters", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly aliases: readonly {
        readonly id: string;
        readonly source: string;
        readonly semanticRole: string;
      }[];
    };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };
    const rejection = generated.records["building-quarry"]?.rejectedAttempts;
    expect(rejection).toHaveLength(1);
    expect(rejection?.[0]?.candidate).toMatch(
      /^art\/pixellab\/quarantine\/building-quarry-/,
    );
    expect(rejection?.[0]?.notes).toMatch(/floor|platform|block/i);
    const rejectedFile = await readFile(rejection?.[0]?.candidate ?? "");
    expect(createHash("sha256").update(rejectedFile).digest("hex")).toBe(
      rejection?.[0]?.candidateSha256,
    );

    expect(
      source.aliases.filter((alias) =>
        ["building-ruleset6-mine", "building-lumber-camp"].includes(alias.id),
      ),
    ).toEqual([
      {
        id: "building-ruleset6-mine",
        source: "building-mine",
        semanticRole: "MINE",
        notes:
          "Ruleset 6 Mine deliberately reuses the accepted Mine raster after dedicated spatial-economy context revalidation; no duplicate raster is generated.",
      },
      {
        id: "building-lumber-camp",
        source: "building-lumber-mill",
        semanticRole: "LUMBER_CAMP",
        notes:
          "Ruleset 6 Lumber Camp deliberately reuses the accepted Lumber Mill raster after dedicated Forest-cluster and contributor revalidation; no duplicate raster is generated.",
      },
    ]);
    expect(ACCEPTED_ART_ALIASES["building-ruleset6-mine"]).toBe(
      "building-mine",
    );
    expect(ACCEPTED_ART_ALIASES["building-lumber-camp"]).toBe(
      "building-lumber-mill",
    );
    expect(ACCEPTED_ART_URLS["building-ruleset6-mine"]).toBe(
      ACCEPTED_ART_URLS["building-mine"],
    );
    expect(ACCEPTED_ART_URLS["building-lumber-camp"]).toBe(
      ACCEPTED_ART_URLS["building-lumber-mill"],
    );
  });

  it("derives exactly 16 complete orthogonal masks with isolated 0000 semantics and no diagonal bits", async () => {
    const manifest = JSON.parse(
      await readFile("scripts/art/road-masks.generated.json", "utf8"),
    ) as {
      readonly schemaVersion: number;
      readonly algorithm: string;
      readonly deterministicProcessing: {
        readonly source: string;
        readonly sourceSha256: string;
        readonly directionBitOrder: readonly string[];
        readonly emptySemantics: string;
        readonly diagonalSemantics: string;
      };
      readonly records: readonly {
        readonly id: string;
        readonly mask: number;
        readonly bits: string;
        readonly semantics: readonly string[];
        readonly output: string;
        readonly sha256: string;
        readonly width: number;
        readonly height: number;
        readonly anchor: { readonly x: number; readonly y: number };
        readonly accepted: boolean;
      }[];
    };
    const source = await readFile(manifest.deterministicProcessing.source);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.algorithm).toBe("orthogonal-road-mask-v1");
    expect(manifest.deterministicProcessing.sourceSha256).toBe(
      createHash("sha256").update(source).digest("hex"),
    );
    expect(manifest.deterministicProcessing.directionBitOrder).toEqual([
      "NORTH",
      "EAST",
      "SOUTH",
      "WEST",
    ]);
    expect(manifest.deterministicProcessing.emptySemantics).toMatch(
      /no overlay.*isolated/is,
    );
    expect(manifest.deterministicProcessing.diagonalSemantics).toMatch(
      /no diagonal/i,
    );
    expect(manifest.records).toHaveLength(16);
    const endpoints = [
      { bit: 8, x: 166, y: 52 },
      { bit: 4, x: 166, y: 96 },
      { bit: 2, x: 90, y: 96 },
      { bit: 1, x: 90, y: 52 },
    ] as const;
    for (let mask = 0; mask < 16; mask += 1) {
      const record = manifest.records[mask];
      const bits = mask.toString(2).padStart(4, "0");
      expect(record).toMatchObject({
        id: `terrain-road-mask-${bits}`,
        mask,
        bits,
        width: 256,
        height: 148,
        anchor: { x: 128, y: 74 },
        accepted: true,
      });
      if (record === undefined) continue;
      expect(
        record.semantics.every((direction) =>
          ["NORTH", "EAST", "SOUTH", "WEST"].includes(direction),
        ),
      ).toBe(true);
      const file = await readFile(record.output);
      expect(createHash("sha256").update(file).digest("hex")).toBe(
        record.sha256,
      );
      const { data } = await sharp(file).ensureAlpha().raw().toBuffer({
        resolveWithObject: true,
      });
      expect(data[(74 * 256 + 128) * 4 + 3]).toBeGreaterThan(0);
      for (const endpoint of endpoints) {
        let endpointAlpha = 0;
        for (let dy = -3; dy <= 3; dy += 1)
          for (let dx = -3; dx <= 3; dx += 1)
            endpointAlpha = Math.max(
              endpointAlpha,
              data[((endpoint.y + dy) * 256 + endpoint.x + dx) * 4 + 3] ?? 0,
            );
        expect(endpointAlpha > 0, `${bits} endpoint ${endpoint.bit}`).toBe(
          (mask & endpoint.bit) !== 0,
        );
      }
      expect(ACCEPTED_ART_URLS[record.id]).toBe(
        `/${record.output.replace(/^public\//, "")}`,
      );
      expect(roadCoverageV6(mask)).toMatchObject({
        status: "ACCEPTED",
        semanticId: `infrastructure:ROAD:${bits}`,
        assetId: record.id,
        production: true,
      });
    }
  });

  it("selects every Road mask from orthogonal neighbors only and keeps absence distinct from isolated", () => {
    const center = { x: 5, y: 5 } as const;
    const directions = [
      { bit: 8, at: { x: 5, y: 4 } },
      { bit: 4, at: { x: 6, y: 5 } },
      { bit: 2, at: { x: 5, y: 6 } },
      { bit: 1, at: { x: 4, y: 5 } },
    ] as const;
    for (let mask = 0; mask < 16; mask += 1) {
      const roads = [
        center,
        ...directions
          .filter(({ bit }) => (mask & bit) !== 0)
          .map(({ at }) => at),
      ];
      const plan: BoardRenderPlanV6 = {
        planVersion: 6,
        entries: roads.map(roadEntry),
        legalCommands: [],
        commandTargets: [],
        economicPreview: null,
      };
      expect(roadMaskAtV6(plan, center)).toBe(mask);
      expect(roadMaskAtV6(plan, { x: 0, y: 0 })).toBeNull();
      const list = buildBoardDrawListV6({
        viewport: { width: 800, height: 600 },
        camera: { offsetX: 400, offsetY: 180, zoom: 1 },
        plan,
      });
      expect(
        list.coverage.find((item) => item.entryKey === "ROAD:5,5"),
      ).toMatchObject({
        semanticId: `infrastructure:ROAD:${mask.toString(2).padStart(4, "0")}`,
        assetId: `terrain-road-mask-${mask.toString(2).padStart(4, "0")}`,
      });
    }
    const diagonalPlan: BoardRenderPlanV6 = {
      planVersion: 6,
      entries: [roadEntry(center, 0), roadEntry({ x: 4, y: 4 }, 1)],
      legalCommands: [],
      commandTargets: [],
      economicPreview: null,
    };
    expect(roadMaskAtV6(diagonalPlan, center)).toBe(0);
  });

  it("publishes accepted improvement coverage and complete hashed visual evidence", async () => {
    const improvementIds = [
      "FARM",
      "LUMBER_CAMP",
      "MINE",
      "QUARRY",
      "WINDMILL",
      "SAWMILL",
      "FORGE",
      "STONEWORKS",
      "WORKSHOP",
      "GRAND_WORKS",
      "MARKET",
    ] as const;
    for (const improvement of improvementIds)
      expect(improvementCoverageV6(improvement).status, improvement).toBe(
        "ACCEPTED",
      );

    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset6-buildings-roads/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly status: string;
      readonly blocker: string | null;
      readonly requiredCoverage: readonly string[];
      readonly sampleGate: Readonly<
        Record<string, { readonly status: string; readonly notes: string }>
      >;
      readonly aliases: readonly unknown[];
      readonly roadMasks: { readonly records: readonly unknown[] };
      readonly quarantines: readonly unknown[];
      readonly artifacts: readonly {
        readonly path: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };
    expect(evidence.status).toBe("READY_FOR_ORCHESTRATOR_REVIEW");
    expect(evidence.blocker).toBeNull();
    expect(evidence.requiredCoverage).toHaveLength(8);
    expect(Object.keys(evidence.sampleGate)).toEqual([...BUILDING_IDS]);
    expect(
      Object.values(evidence.sampleGate).every(
        (record) => record.status === "ACCEPTED" && record.notes.length > 200,
      ),
    ).toBe(true);
    expect(evidence.aliases).toHaveLength(2);
    expect(evidence.roadMasks.records).toHaveLength(16);
    expect(evidence.quarantines).toHaveLength(1);
    expect(evidence.artifacts).toHaveLength(15);
    for (const artifact of evidence.artifacts) {
      const file = await readFile(artifact.path);
      expect(file.byteLength, artifact.path).toBe(artifact.bytes);
      expect(
        createHash("sha256").update(file).digest("hex"),
        artifact.path,
      ).toBe(artifact.sha256);
    }
  });
});

function roadEntry(
  at: { readonly x: number; readonly y: number },
  id: number,
): RenderPlanEntryV6 {
  return {
    kind: "ROAD",
    key: `ROAD:${at.x},${at.y}`,
    at,
    id,
    ownerId: null,
    variant: 0,
    layer: 3,
    details: null,
  };
}
