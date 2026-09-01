import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  ACCEPTED_ART_ALIASES,
  ACCEPTED_ART_URLS,
} from "../../src/assets/generated-art-manifest";

const SAMPLE_IDS = [
  "terrain-fertile-ground",
  "terrain-stone",
  "terrain-road-material",
] as const;

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
  readonly transparent: boolean;
  readonly output: string;
  readonly anchor?: { readonly x: number; readonly y: number };
  readonly groundContactY?: number;
  readonly hardBounds: Bounds;
  readonly preferredBounds?: Bounds;
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly styleReferenceUsage?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly candidateSha256?: string;
  readonly outputSha256?: string;
  readonly width?: number;
  readonly height?: number;
  readonly hasAlpha?: boolean;
  readonly alphaBounds?: Bounds & { readonly empty: boolean };
  readonly request?: {
    readonly endpoint: string;
    readonly model: string;
    readonly requestSize: { readonly width: number; readonly height: number };
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly seed: number;
    readonly postprocess?: string;
  };
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
  readonly rejectedAttempts?: readonly {
    readonly candidate: string;
    readonly candidateSha256?: string;
    readonly notes?: string;
  }[];
}

describe("Ruleset 6 terrain PixelLab preparation", () => {
  it("records exactly the three first-sample recipes and hard geometry", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const recipes = source.recipes.filter((recipe) =>
      SAMPLE_IDS.includes(recipe.id as (typeof SAMPLE_IDS)[number]),
    );

    expect(recipes.map(({ id }) => id)).toEqual([...SAMPLE_IDS]);
    expect(recipes.map(({ seed }) => seed)).toEqual([83101, 73102, 73103]);
    for (const recipe of recipes) {
      const road = recipe.id === "terrain-road-material";
      expect(recipe.class, recipe.id).toBe("terrain");
      expect(recipe.stage, recipe.id).toBe("sample");
      expect(recipe.endpoint, recipe.id).toBe("generate-image-v2");
      expect(recipe.transparent, recipe.id).toBe(true);
      expect(recipe.requestSize, recipe.id).toEqual({
        width: 256,
        height: road ? 148 : 296,
      });
      expect(recipe.outputSize, recipe.id).toEqual(recipe.requestSize);
      expect(recipe.anchor, recipe.id).toEqual({
        x: 128,
        y: road ? 74 : 222,
      });
      expect(recipe.hardBounds, recipe.id).toEqual(
        road
          ? { left: 0, top: 0, right: 256, bottom: 148 }
          : { left: 32, top: 112, right: 224, bottom: 246 },
      );
      expect(recipe.preferredBounds, recipe.id).toEqual(
        road ? undefined : { left: 56, top: 142, right: 200, bottom: 230 },
      );
      expect(recipe.groundContactY, recipe.id).toBe(road ? undefined : 222);
      expect(recipe.postprocess, recipe.id).toBe(
        road ? "diamond-mask" : "preferred-low-marker-fit",
      );
      expect(recipe.styleReference, recipe.id).toMatch(/^terrain-/);
      expect(recipe.styleReferenceUsage, recipe.id).toMatch(
        /Input reference role/,
      );
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(300);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(180);
    }
  });

  it("accepts all three generated samples with exact output and rejection history", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };

    const expected = {
      "terrain-fertile-ground": {
        sha256:
          "97545314656cee7b83d0744309086051f1d520957d0b982ff5e5515cba4adc6b",
        bounds: { left: 56, top: 144, right: 200, bottom: 222 },
        rejected: 2,
        url: "/assets/pixellab/terrain/fertile-ground.png",
      },
      "terrain-stone": {
        sha256:
          "8d8719bec9de96392e1a205c38b0f74ebff32aaabbae046800ef23744bef2f14",
        bounds: { left: 84, top: 142, right: 171, bottom: 222 },
        rejected: 1,
        url: "/assets/pixellab/terrain/stone.png",
      },
      "terrain-road-material": {
        sha256:
          "d0f60535de68afa17fcc39f9fcc6cefd886d45292ad0e3216727c5dca850e84f",
        bounds: { left: 14, top: 1, right: 239, bottom: 147 },
        rejected: 1,
        url: "/assets/pixellab/terrain/road-material.png",
      },
    } as const;

    for (const id of SAMPLE_IDS) {
      const record = generated.records[id];
      const recipe = source.recipes.find((entry) => entry.id === id);
      const contract = expected[id];
      expect(record?.status, id).toBe("ACCEPTED");
      expect(recipe, id).toBeDefined();
      if (recipe === undefined) continue;
      const file = await readFile(recipe.output);
      const metadata = await sharp(file).metadata();
      expect(metadata.width, id).toBe(recipe.outputSize.width);
      expect(metadata.height, id).toBe(recipe.outputSize.height);
      expect(metadata.channels, id).toBe(4);
      expect(record?.width, id).toBe(recipe.outputSize.width);
      expect(record?.height, id).toBe(recipe.outputSize.height);
      expect(record?.hasAlpha, id).toBe(true);
      expect(record?.alphaBounds, id).toEqual({
        ...contract.bounds,
        empty: false,
      });
      expect(record?.candidateSha256, id).toBe(contract.sha256);
      expect(record?.outputSha256, id).toBe(contract.sha256);
      expect(createHash("sha256").update(file).digest("hex"), id).toBe(
        contract.sha256,
      );
      expect(Object.values(record?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(record?.request, id).toMatchObject({
        endpoint: recipe.endpoint,
        model: "generate-image-v2",
        requestSize: recipe.requestSize,
        outputSize: recipe.outputSize,
        seed: recipe.seed,
        postprocess: recipe.postprocess,
      });
      expect(record?.rejectedAttempts, id).toHaveLength(contract.rejected);
      for (const rejection of record?.rejectedAttempts ?? []) {
        expect(rejection.candidate, id).toMatch(/^art\/pixellab\/quarantine\//);
        expect(rejection.candidateSha256, id).toMatch(/^[a-f0-9]{64}$/);
        expect(rejection.notes?.length, id).toBeGreaterThan(100);
        const quarantined = await readFile(rejection.candidate);
        expect(createHash("sha256").update(quarantined).digest("hex"), id).toBe(
          rejection.candidateSha256,
        );
      }
      expect(ACCEPTED_ART_URLS[id], id).toBe(contract.url);
    }
  });

  it("publishes GAME as one explicit alias of the accepted Animal art", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly aliases: readonly {
        readonly id: string;
        readonly source: string;
        readonly semanticRole: string;
        readonly notes: string;
      }[];
    };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };
    const alias = source.aliases.find(({ id }) => id === "terrain-game");
    const animal = generated.records["terrain-animal"];
    const animalFile = await readFile(
      "public/assets/pixellab/terrain/animal.png",
    );

    expect(alias).toEqual({
      id: "terrain-game",
      source: "terrain-animal",
      semanticRole: "GAME",
      notes:
        "Ruleset 6 GAME deliberately reuses the accepted Animal world raster after dedicated label and Forest-context revalidation; this is one art asset, not duplicated gameplay art.",
    });
    expect(animal?.status).toBe("ACCEPTED");
    expect(animal?.outputSha256).toBe(
      createHash("sha256").update(animalFile).digest("hex"),
    );
    expect(Object.values(animal?.reviewChecks ?? {})).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(ACCEPTED_ART_ALIASES["terrain-game"]).toBe("terrain-animal");
    expect(ACCEPTED_ART_URLS["terrain-game"]).toBe(
      ACCEPTED_ART_URLS["terrain-animal"],
    );
  });

  it("checks in complete accepted review evidence and the full matrix", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset6-terrain/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly status: string;
      readonly blocker: string | null;
      readonly requiredCoverage: readonly string[];
      readonly sampleGate: Readonly<
        Record<
          string,
          {
            readonly status: string;
            readonly outputSha256: string;
            readonly reviewChecks: Readonly<Record<string, boolean>>;
            readonly visualFindings: string;
            readonly rejectedAttempts: readonly unknown[];
          }
        >
      >;
      readonly pendingArtifacts: readonly string[];
      readonly gameAlias: {
        readonly status: string;
        readonly contexts: readonly string[];
        readonly sourceOutputSha256: string;
      };
      readonly artifacts: readonly {
        readonly path: string;
        readonly sha256: string;
        readonly bytes: number;
      }[];
    };

    expect(evidence.status).toBe("READY_FOR_ORCHESTRATOR_REVIEW");
    expect(evidence.blocker).toBeNull();
    expect(evidence.requiredCoverage).toHaveLength(8);
    for (const id of SAMPLE_IDS) {
      const sample = evidence.sampleGate[id];
      expect(sample?.status, id).toBe("ACCEPTED");
      expect(sample?.outputSha256, id).toMatch(/^[a-f0-9]{64}$/);
      expect(Object.values(sample?.reviewChecks ?? {}), id).toEqual([
        true,
        true,
        true,
        true,
        true,
      ]);
      expect(sample?.visualFindings.length, id).toBeGreaterThan(300);
      expect(sample?.rejectedAttempts.length, id).toBeGreaterThanOrEqual(1);
    }
    expect(evidence.pendingArtifacts).toEqual([]);
    expect(evidence.gameAlias.status).toBe("ACCEPTED");
    expect(evidence.gameAlias.contexts).toEqual([
      "empty Forest",
      "GAME on Forest",
      "occupied GAME on Forest",
      "locked GAME on Forest",
      "selected GAME on Forest",
      "hunted GAME removed while Forest remains",
      "repeated GAME/empty Forest",
    ]);
    expect(evidence.gameAlias.sourceOutputSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.artifacts.map(({ path }) => path)).toEqual([
      "art/pixellab/reviews/ruleset6-terrain/README.md",
      "art/pixellab/reviews/ruleset6-terrain/game-alias-forest-contexts.png",
      "art/pixellab/reviews/ruleset6-terrain/sample-gate-source-native-enlarged-minimum.png",
      "art/pixellab/reviews/ruleset6-terrain/compatible-contexts-and-four-edges.png",
      "art/pixellab/reviews/ruleset6-terrain/faction-terrain-and-visibility-contexts.png",
      "art/pixellab/reviews/ruleset6-terrain/semantic-collision-minimum-zoom.png",
      "art/pixellab/reviews/ruleset6-terrain/repetition-8x8.png",
      "art/pixellab/reviews/ruleset6-terrain/dense-mixed-map-dpr1.png",
      "art/pixellab/reviews/ruleset6-terrain/dense-mixed-map-dpr2.png",
      "art/pixellab/reviews/ruleset6-terrain/dpr1-dpr2-comparison.png",
    ]);
    for (const artifact of evidence.artifacts) {
      const data = await readFile(artifact.path);
      expect(artifact.bytes, artifact.path).toBe(data.byteLength);
      expect(artifact.sha256, artifact.path).toBe(
        createHash("sha256").update(data).digest("hex"),
      );
    }
  });
});
