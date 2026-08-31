import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
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
  readonly postprocess?: string;
  readonly styleReference?: string;
  readonly styleReferenceUsage?: string;
  readonly prompt: string;
  readonly negativePrompt: string;
}

interface GeneratedRecord {
  readonly status: string;
  readonly outputSha256?: string;
  readonly reviewChecks?: Readonly<Record<string, boolean>>;
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
    expect(recipes.map(({ seed }) => seed)).toEqual([63101, 63102, 63103]);
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
      expect(recipe.groundContactY, recipe.id).toBe(road ? undefined : 222);
      expect(recipe.postprocess, recipe.id).toBe(
        road ? "diamond-mask" : undefined,
      );
      expect(recipe.styleReference, recipe.id).toMatch(/^terrain-/);
      expect(recipe.styleReferenceUsage, recipe.id).toMatch(
        /Input reference role/,
      );
      expect(recipe.prompt.length, recipe.id).toBeGreaterThan(300);
      expect(recipe.negativePrompt.length, recipe.id).toBeGreaterThan(180);
    }
  });

  it("keeps missing generation explicit and leaves production outputs absent", async () => {
    const source = JSON.parse(
      await readFile("scripts/art/pixellab-manifest.json", "utf8"),
    ) as { readonly recipes: readonly Recipe[] };
    const generated = JSON.parse(
      await readFile("scripts/art/pixellab-generated.json", "utf8"),
    ) as {
      readonly records: Readonly<Record<string, GeneratedRecord>>;
    };

    for (const id of SAMPLE_IDS) {
      expect(generated.records[id], id).toBeUndefined();
      const recipe = source.recipes.find((entry) => entry.id === id);
      expect(recipe, id).toBeDefined();
      if (recipe === undefined) continue;
      await expect(stat(recipe.output), id).rejects.toMatchObject({
        code: "ENOENT",
      });
      expect(ACCEPTED_ART_URLS[id], id).toBeUndefined();
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

  it("checks in honest blocked evidence and the complete review matrix", async () => {
    const evidence = JSON.parse(
      await readFile(
        "art/pixellab/reviews/ruleset6-terrain/review-evidence.json",
        "utf8",
      ),
    ) as {
      readonly status: string;
      readonly blocker: string;
      readonly requiredCoverage: readonly string[];
      readonly sampleGate: Readonly<
        Record<string, { readonly status: string }>
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

    expect(evidence.status).toBe("BLOCKED_MISSING_GENERATION");
    expect(evidence.blocker).toContain("PIXELLAB_API_KEY is missing");
    expect(evidence.requiredCoverage).toHaveLength(8);
    for (const id of SAMPLE_IDS)
      expect(evidence.sampleGate[id]?.status, id).toBe("MISSING");
    expect(evidence.pendingArtifacts).toEqual([
      "sample-gate-source-native-enlarged-minimum.png",
      "compatible-contexts-and-four-edges.png",
      "repetition-8x8.png",
      "dense-mixed-map-dpr1.png",
      "dense-mixed-map-dpr2.png",
      "dpr1-dpr2-comparison.png",
    ]);
    expect(evidence.gameAlias.status).toBe("ACCEPTED");
    expect(evidence.gameAlias.contexts).toEqual([
      "empty Forest",
      "GAME on Forest",
      "occupied GAME on Forest",
      "locked GAME on Forest",
      "selected GAME on Forest",
      "repeated GAME/empty Forest",
    ]);
    expect(evidence.gameAlias.sourceOutputSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(evidence.artifacts.map(({ path }) => path)).toEqual([
      "art/pixellab/reviews/ruleset6-terrain/README.md",
      "art/pixellab/reviews/ruleset6-terrain/game-alias-forest-contexts.png",
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
