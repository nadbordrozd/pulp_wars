import { describe, expect, it } from "vitest";
import {
  buildChibiArtRegistryV7,
  chibiVariantV7,
  type ArtSubjectV7,
} from "../../src/assets/chibi-art-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  RULESET7_FRUIT_MAP_ART_IDS,
  RULESET7_GAME_MAP_ART_IDS,
  resourceMapArtIdV7,
} from "../../src/assets/ruleset7-ui-art";
import {
  createChibiArtResolverV7,
  type ChibiRasterEnvironmentV7,
} from "../../src/render/canvas/chibi-art-resolver-v7";

/**
 * Resource variants (bead pulp_wars-glz): Game and Fruit each have three
 * CHIBI rasters, and every tile picks one by its coordinates with the same
 * hash terrain variants use.
 */
const GAME = ["chibi-game", "chibi-game-boar", "chibi-game-rabbit"];
const FRUIT = ["chibi-fruit", "chibi-fruit-blueberry", "chibi-fruit-pear"];

const { registry, problems } = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7);

const syncEnvironment: ChibiRasterEnvironmentV7 = {
  loadImage: (_url, settle) => {
    settle(true);
    return {} as CanvasImageSource;
  },
  readPixels: (_image, width, height) =>
    new Uint8ClampedArray(width * height * 4),
  createSurface: () => ({}) as CanvasImageSource,
};

const board = Array.from({ length: 9 }, (_, y) =>
  Array.from({ length: 9 }, (_, x) => ({ x, y })),
).flat();

describe("CHIBI Game and Fruit variants", () => {
  it("registers the batch-3 Deer and Peach Tree first, then two more of each", () => {
    expect(problems).toEqual([]);
    for (const [subject, ids] of [
      ["RESOURCE:GAME", GAME],
      ["RESOURCE:FRUIT", FRUIT],
    ] as const) {
      const variants = registry.variants(subject);
      expect(variants.map((asset) => asset.id)).toEqual(ids);
      for (const asset of variants) {
        // Unowned resources, the batch-3 canvas, centred on the cell.
        expect(asset).toMatchObject({
          assetClass: "RESOURCE",
          width: 48,
          height: 48,
        });
        expect(asset.ownerMaskUrl).toBeUndefined();
        expect(asset.anchor).toBeUndefined();
      }
    }
  });

  it("picks one variant per tile by its coordinates, deterministically", () => {
    for (const [subject, ids] of [
      ["RESOURCE:GAME", GAME],
      ["RESOURCE:FRUIT", FRUIT],
    ] as const) {
      const variants = registry.variants(subject);
      const picks = board.map((at) => chibiVariantV7(variants, at)?.id);
      // Every variant shows up on a 9 x 9 patch, about equally often.
      for (const id of ids)
        expect(picks.filter((pick) => pick === id)).toHaveLength(27);
      for (const at of board) {
        const index = (at.x * 31 + at.y * 17) % 3;
        expect(chibiVariantV7(variants, at)?.id).toBe(ids[index]);
        // Same answer on every call and for any copy of the coordinates.
        expect(chibiVariantV7(variants, { ...at })?.id).toBe(ids[index]);
        // Neighbours in a row or a column never repeat the same variant.
        expect(chibiVariantV7(variants, { x: at.x + 1, y: at.y })?.id).not.toBe(
          ids[index],
        );
        expect(chibiVariantV7(variants, { x: at.x, y: at.y + 1 })?.id).not.toBe(
          ids[index],
        );
      }
    }
  });

  it("varies on the same tiles as the LEGACY resource art, which is unchanged", () => {
    for (const at of board) {
      const index = (at.x * 31 + at.y * 17) % 3;
      expect(resourceMapArtIdV7("GAME", at)).toBe(
        RULESET7_GAME_MAP_ART_IDS[index],
      );
      expect(resourceMapArtIdV7("FRUIT", at)).toBe(
        RULESET7_FRUIT_MAP_ART_IDS[index],
      );
      expect(chibiVariantV7(registry.variants("RESOURCE:GAME"), at)?.id).toBe(
        GAME[index],
      );
    }
    expect(resourceMapArtIdV7("FISH", { x: 1, y: 0 })).toBe(
      resourceMapArtIdV7("FISH", { x: 0, y: 0 }),
    );
  });

  it("resolves the board raster of a Game or Fruit tile from its coordinates", () => {
    const resolver = createChibiArtResolverV7({
      environment: syncEnvironment,
      redraw: () => undefined,
    });
    const resolve = (subject: ArtSubjectV7, x: number, y: number) => {
      const resolution = resolver.resolve({
        subject,
        at: { x, y },
        deviceScale: 1,
      });
      if (resolution.kind !== "READY") throw new Error(resolution.kind);
      return resolution.asset.id;
    };
    expect([0, 1, 2].map((x) => resolve("RESOURCE:GAME", x, 0))).toEqual([
      "chibi-game",
      "chibi-game-boar",
      "chibi-game-rabbit",
    ]);
    expect([0, 1, 2].map((x) => resolve("RESOURCE:FRUIT", x, 0))).toEqual([
      "chibi-fruit",
      "chibi-fruit-blueberry",
      "chibi-fruit-pear",
    ]);
    expect(resolve("RESOURCE:GAME", 5, 7)).toBe(GAME[(5 * 31 + 7 * 17) % 3]);
    expect(resolve("RESOURCE:GAME", 5, 7)).toBe(resolve("RESOURCE:GAME", 5, 7));
    // Single-variant resources keep their one raster everywhere.
    expect(
      new Set(board.map((at) => resolve("RESOURCE:FISH", at.x, at.y))),
    ).toEqual(new Set(["chibi-fish"]));
  });
});
