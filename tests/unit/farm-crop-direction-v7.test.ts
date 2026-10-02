import { describe, expect, it } from "vitest";
import {
  BOARD_FARM_CROP_STORAGE_KEY_V7,
  loadBoardFarmCropV7,
  parseStoredBoardFarmCropV7,
  storeBoardFarmCropV7,
} from "../../src/app/board-farm-crop-v7";
import { CHIBI_ART_ASSETS_V7 } from "../../src/assets/chibi-art-manifest";
import {
  buildChibiArtRegistryV7,
  chibiVariantV7,
} from "../../src/assets/chibi-art-v7";
import {
  CHIBI_DIRECTION_ART_ASSETS_V7,
  FARM_CROPS_V7,
  FARM_CROP_ASSET_IDS_V7,
  FARM_CROP_CHOICES_V7,
  chibiDirectionArtRegistryV7,
  isFarmCropChoiceV7,
  type FarmCropChoiceV7,
} from "../../src/assets/chibi-direction-art-manifest";
import {
  LIVE_DIRECTION_ART_REGISTRY_V7,
  liveBoardLookV7,
  liveDirectionArtRegistryV7,
} from "../../src/render/canvas/live-board-look-v7";
import { LIVE_DIRECTION_V7 } from "../../src/render/canvas/visual-direction-v7";

const FARM = "IMPROVEMENT:FARM" as const;
const farmAt = (
  x: number,
  y: number,
  crop: FarmCropChoiceV7 = "MIXED",
): string | undefined =>
  chibiVariantV7(liveDirectionArtRegistryV7(crop).variants(FARM), { x, y })?.id;

describe("the Farm's three crops, one per tile (pulp_wars-9s0.6)", () => {
  it("registers lettuce, cabbage and veggies as the variants of the one Farm subject", () => {
    const variants = LIVE_DIRECTION_ART_REGISTRY_V7.variants(FARM);
    expect(variants.map((asset) => asset.id)).toEqual(
      FARM_CROPS_V7.map((crop) => FARM_CROP_ASSET_IDS_V7[crop]),
    );
    expect(variants.map((asset) => asset.id).sort()).toEqual([
      "chibi-direction-farm-cabbage",
      "chibi-direction-farm-lettuce",
      "chibi-direction-farm-veggies",
    ]);
    for (const asset of variants) {
      expect([asset.width, asset.height]).toEqual([80, 80]);
      expect(asset.ownerMaskUrl).toBeUndefined();
      expect(asset.fixedColours).toBeUndefined();
    }
    // The retired wheat master is not registered any more.
    expect(
      CHIBI_DIRECTION_ART_ASSETS_V7.some(
        (asset) => asset.id === "chibi-direction-farm",
      ),
    ).toBe(false);
  });

  it("picks the crop from the tile's coordinates alone: the same tile always shows the same crop", () => {
    for (let y = 0; y < 24; y += 1)
      for (let x = 0; x < 24; x += 1) {
        const first = farmAt(x, y);
        expect(first).toBeDefined();
        // Another frame, another registry instance, another client.
        expect(farmAt(x, y)).toBe(first);
        expect(
          chibiVariantV7(chibiDirectionArtRegistryV7().variants(FARM), {
            x,
            y,
          })?.id,
        ).toBe(first);
        // (x - y) mod 3 in the manifest's order.
        const crop = FARM_CROPS_V7[(((x - y) % 3) + 3) % 3];
        expect(first).toBe(crop && FARM_CROP_ASSET_IDS_V7[crop]);
      }
  });

  it("mixes neighbouring Farms and shows every crop equally often", () => {
    const counts = new Map<string, number>();
    for (let y = 0; y < 18; y += 1)
      for (let x = 0; x < 18; x += 1) {
        const here = farmAt(x, y) ?? "";
        counts.set(here, (counts.get(here) ?? 0) + 1);
        expect(farmAt(x + 1, y)).not.toBe(here);
        expect(farmAt(x, y + 1)).not.toBe(here);
      }
    expect([...counts.values()]).toEqual([108, 108, 108]);
    // Any three Farms in a row or a column show all three crops.
    for (let n = 0; n < 6; n += 1) {
      expect(new Set([0, 1, 2].map((d) => farmAt(n + d, 5))).size).toBe(3);
      expect(new Set([0, 1, 2].map((d) => farmAt(5, n + d))).size).toBe(3);
    }
  });

  it("the Farm crop setting forces one crop on every tile and changes nothing else", () => {
    for (const crop of FARM_CROPS_V7) {
      const registry = liveDirectionArtRegistryV7(crop);
      expect(registry.variants(FARM).map((asset) => asset.id)).toEqual([
        FARM_CROP_ASSET_IDS_V7[crop],
      ]);
      for (let y = 0; y < 8; y += 1)
        for (let x = 0; x < 8; x += 1)
          expect(farmAt(x, y, crop)).toBe(FARM_CROP_ASSET_IDS_V7[crop]);
      for (const asset of CHIBI_DIRECTION_ART_ASSETS_V7)
        if (asset.subject !== FARM)
          expect(registry.variants(asset.subject)).toEqual(
            LIVE_DIRECTION_ART_REGISTRY_V7.variants(asset.subject),
          );
      // One registry per choice: the board host keeps its resolver.
      expect(liveDirectionArtRegistryV7(crop)).toBe(registry);
      const look = liveBoardLookV7("CHIBI", false, crop);
      expect(look.visualDirection).toBe(LIVE_DIRECTION_V7);
      expect(look.visualDirectionArt).toBe(registry);
      expect(liveBoardLookV7("CHIBI", false, crop)).toBe(look);
    }
    expect(liveDirectionArtRegistryV7("MIXED")).toBe(
      LIVE_DIRECTION_ART_REGISTRY_V7,
    );
    expect(liveBoardLookV7("CHIBI", false, "MIXED")).toBe(
      liveBoardLookV7("CHIBI"),
    );
  });

  it("leaves the LEGACY set and the Classic look untouched", () => {
    for (const crop of FARM_CROP_CHOICES_V7) {
      expect(liveBoardLookV7("LEGACY", false, crop)).toEqual({});
      expect(liveBoardLookV7(undefined, false, crop)).toEqual({});
      expect(liveBoardLookV7("CHIBI", true, crop)).toEqual({});
    }
    // The classic look's Farm is the default registry's single asset.
    const classic = buildChibiArtRegistryV7(CHIBI_ART_ASSETS_V7).registry;
    expect(classic.variants(FARM).map((asset) => asset.id)).toEqual([
      "chibi-farm",
    ]);
    expect(
      CHIBI_ART_ASSETS_V7.some((asset) => asset.id.includes("direction")),
    ).toBe(false);
  });
});

describe("the Farm crop developer setting (pulp_wars-9s0.6)", () => {
  const memory = () => {
    const values = new Map<string, string>();
    return {
      values,
      storage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => void values.set(key, value),
        removeItem: (key: string) => void values.delete(key),
      },
    };
  };

  it("is Mixed unless the stored value names a crop", () => {
    expect(FARM_CROP_CHOICES_V7).toEqual([
      "MIXED",
      "LETTUCE",
      "CABBAGE",
      "VEGGIES",
    ]);
    expect(parseStoredBoardFarmCropV7(null)).toBe("MIXED");
    for (const malformed of [
      "",
      "{",
      "null",
      "true",
      "[]",
      "{}",
      '{"crop":"WHEAT"}',
      '{"crop":1}',
      '"LETTUCE"',
    ])
      expect(parseStoredBoardFarmCropV7(malformed), malformed).toBe("MIXED");
    for (const crop of FARM_CROP_CHOICES_V7) {
      expect(isFarmCropChoiceV7(crop)).toBe(true);
      expect(parseStoredBoardFarmCropV7(JSON.stringify({ crop }))).toBe(crop);
    }
    expect(isFarmCropChoiceV7("WHEAT")).toBe(false);
  });

  it("persists under its own key and survives restricted storage", () => {
    const { values, storage } = memory();
    expect(loadBoardFarmCropV7(storage)).toBe("MIXED");
    expect(storeBoardFarmCropV7(storage, "CABBAGE")).toBe(true);
    expect(values.get(BOARD_FARM_CROP_STORAGE_KEY_V7)).toBe(
      '{"crop":"CABBAGE"}',
    );
    expect([...values.keys()]).toEqual([BOARD_FARM_CROP_STORAGE_KEY_V7]);
    expect(loadBoardFarmCropV7(storage)).toBe("CABBAGE");
    expect(storeBoardFarmCropV7(storage, "MIXED")).toBe(true);
    expect(loadBoardFarmCropV7(storage)).toBe("MIXED");
    expect(loadBoardFarmCropV7(null)).toBe("MIXED");
    const denied = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
      removeItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadBoardFarmCropV7(denied)).toBe("MIXED");
    expect(storeBoardFarmCropV7(denied, "VEGGIES")).toBe(false);
  });
});
