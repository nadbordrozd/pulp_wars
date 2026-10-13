import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACTION_ART_KEYS_V7,
  FARM_ART_KEYS_V7,
  FRUIT_MAP_ART_KEYS_V7,
  GAME_MAP_ART_KEYS_V7,
  IMPROVEMENT_ART_KEYS_V7,
  PORTRAIT_ART_KEYS_V7,
  RESOURCE_ART_KEYS_V7,
  TECH_ART_KEYS_V7,
  TERRAIN_ART_KEYS_V7,
  UNIT_ART_KEYS_V7,
  commandArtKeyV7,
  resourceMapArtKeyV7,
  rewardArtKeyV7,
  terrainMapArtKeyV7,
} from "../../src/assets/art-keys-v7";
import {
  type CityId,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  TECHNOLOGY_IDS_V7,
  TERRAIN_IDS_V7,
  type UnitId,
  UNIT_ROLE_IDS_V7,
} from "../../src/engine/index";
import { missingArtLetterOfAssetV7 } from "../../src/render/dom/app-view-v7";

/**
 * The Ruleset 7 art keys (bead pulp_wars-67q.15): names of board plan
 * entries and interface stand-ins, never looked up as files.
 */
describe("Ruleset 7 art keys", () => {
  // The title is the one the archived 7r2 release corpus names; the keys
  // are no longer resolved against the accepted PixelLab art.
  it("has explicit resolvable entries for every role, technology and improvement", () => {
    expect(Object.keys(UNIT_ART_KEYS_V7)).toEqual(UNIT_ROLE_IDS_V7);
    expect(Object.keys(PORTRAIT_ART_KEYS_V7)).toEqual(UNIT_ROLE_IDS_V7);
    expect(Object.keys(TECH_ART_KEYS_V7)).toEqual(TECHNOLOGY_IDS_V7);
    expect(Object.keys(IMPROVEMENT_ART_KEYS_V7)).toEqual(IMPROVEMENT_IDS_V7);
    expect(Object.keys(RESOURCE_ART_KEYS_V7).sort()).toEqual(
      [...RESOURCE_IDS_V7].sort(),
    );
    expect(Object.keys(TERRAIN_ART_KEYS_V7).sort()).toEqual(
      [...TERRAIN_IDS_V7].sort(),
    );
  });

  it("resolves no key as a file: every legacy raster is retired", () => {
    // Bead pulp_wars-lky5: the legacy PixelLab art went with the retired
    // prototypes. A key that still spells one of its ids ("unit-warrior")
    // is a name only, like the `v7-` keys.
    const manifest = JSON.parse(
      readFileSync("scripts/art/pixellab-manifest.json", "utf8"),
    ) as {
      readonly recipes: readonly unknown[];
      readonly aliases: readonly unknown[];
      readonly retired: readonly { readonly id: string }[];
    };
    expect(manifest.recipes).toEqual([]);
    expect(manifest.aliases).toEqual([]);
    expect(manifest.retired.length).toBeGreaterThan(200);
    expect(existsSync("src/assets/generated-art-manifest.ts")).toBe(false);
    expect(existsSync("public/assets/pixellab")).toBe(false);
    const keys = [
      ...Object.values(UNIT_ART_KEYS_V7),
      ...Object.values(PORTRAIT_ART_KEYS_V7),
      ...Object.values(TECH_ART_KEYS_V7),
      ...Object.values(IMPROVEMENT_ART_KEYS_V7),
      ...Object.values(RESOURCE_ART_KEYS_V7),
      ...Object.values(TERRAIN_ART_KEYS_V7),
      ...Object.values(FARM_ART_KEYS_V7),
      ...FRUIT_MAP_ART_KEYS_V7,
      ...GAME_MAP_ART_KEYS_V7,
      rewardArtKeyV7("TREASURY"),
    ];
    for (const key of keys) {
      expect(key, key).not.toMatch(/[/.]/);
      expect(key.length, key).toBeGreaterThan(0);
    }
  });

  it("keeps the letter every stand-in had under its retired name", () => {
    // Each pair is the retired raster id a key replaced and the key.
    for (const [before, key] of [
      ["terrain-ruleset7-original-grass-1", TERRAIN_ART_KEYS_V7.GRASS],
      ["terrain-ruleset7-original-forest-1", TERRAIN_ART_KEYS_V7.FOREST],
      ["terrain-ruleset7-revision3-mountain-1", TERRAIN_ART_KEYS_V7.MOUNTAIN],
      ["terrain-ruleset7-water-shallow", TERRAIN_ART_KEYS_V7.SHALLOW_WATER],
      ["terrain-ruleset7-water-deep", TERRAIN_ART_KEYS_V7.DEEP_WATER],
      ["building-ruleset7-farm-single", IMPROVEMENT_ART_KEYS_V7.FARM],
      [
        "building-ruleset7-farm-pair-horizontal",
        FARM_ART_KEYS_V7.HORIZONTAL_PAIR,
      ],
      ["building-ruleset7-farm-pair-vertical", FARM_ART_KEYS_V7.VERTICAL_PAIR],
      [
        "building-ruleset7-resource-lumber-camp",
        IMPROVEMENT_ART_KEYS_V7.LUMBER_CAMP,
      ],
      [
        "terrain-ruleset7-revision3-mined-mountain-1",
        IMPROVEMENT_ART_KEYS_V7.MINE,
      ],
      ["building-ruleset7-port-v7r11", IMPROVEMENT_ART_KEYS_V7.PORT],
      ["building-ruleset7-shipyard", IMPROVEMENT_ART_KEYS_V7.SHIPYARD],
      [
        "terrain-ruleset7-resource-fertile-ground",
        RESOURCE_ART_KEYS_V7.FERTILE_GROUND,
      ],
      ["terrain-ruleset7-resource-fish-v7r11", RESOURCE_ART_KEYS_V7.FISH],
      ["terrain-ruleset7-resource-pearls", RESOURCE_ART_KEYS_V7.PEARLS],
      ["terrain-ruleset7-original-fruit-pear", FRUIT_MAP_ART_KEYS_V7[1]],
      ["terrain-ruleset7-original-fruit-plum", FRUIT_MAP_ART_KEYS_V7[2]],
      ["terrain-ruleset7-original-game-deer", GAME_MAP_ART_KEYS_V7[1]],
      ["terrain-ruleset7-original-game-fox", GAME_MAP_ART_KEYS_V7[2]],
      ["portrait-original-captain-v7r10", PORTRAIT_ART_KEYS_V7.CAPTAIN],
      ["portrait-original-catapult", PORTRAIT_ART_KEYS_V7.CATAPULT],
      ["portrait-original-knight", PORTRAIT_ART_KEYS_V7.KNIGHT],
      ["ui-action-rally-v7r9", ACTION_ART_KEYS_V7.RALLY],
      ["ui-action-cultivate-forest-v7r9", ACTION_ART_KEYS_V7.CULTIVATE_FOREST],
      ["ui-action-blast-mountain-v7r9", TECH_ART_KEYS_V7.EXPLOSIVES],
      ["ui-action-pillage", TECH_ART_KEYS_V7.RAIDING],
      ["ui-action-disband", ACTION_ART_KEYS_V7.DISBAND],
      ["ui-hud-gold-coin-v7", rewardArtKeyV7("TREASURY")],
    ] as const) {
      expect(key, before).toMatch(/^v7-/);
      expect(missingArtLetterOfAssetV7(key), before).toBe(
        missingArtLetterOfAssetV7(before),
      );
    }
  });

  it("keys map terrain by variant, with a mined Mountain apart", () => {
    expect(terrainMapArtKeyV7("GRASS", 3)).toBe("v7-terrain-grass-3");
    expect(terrainMapArtKeyV7("RIFT", 2)).toBe("v7-terrain-grass-2");
    expect(terrainMapArtKeyV7("FOREST", 4)).toBe("v7-terrain-forest-4");
    expect(terrainMapArtKeyV7("MOUNTAIN", 2)).toBe("v7-terrain-mountain-2");
    expect(terrainMapArtKeyV7("MOUNTAIN", 1, true)).toBe(
      IMPROVEMENT_ART_KEYS_V7.MINE,
    );
    expect(terrainMapArtKeyV7("SHALLOW_WATER", 2)).toBe(
      TERRAIN_ART_KEYS_V7.SHALLOW_WATER,
    );
    expect(terrainMapArtKeyV7("DEEP_WATER", 1)).toBe(
      TERRAIN_ART_KEYS_V7.DEEP_WATER,
    );
    expect(terrainMapArtKeyV7("GRASS", 1)).toBe(TERRAIN_ART_KEYS_V7.GRASS);
  });

  it("uses the world unit key for training and leaves spatial actions map-only", () => {
    expect(
      commandArtKeyV7({
        kind: "TRAIN",
        cityId: 1 as CityId,
        role: "CATAPULT",
      }),
    ).toBe(UNIT_ART_KEYS_V7.CATAPULT);
    expect(
      commandArtKeyV7({
        kind: "MOVE",
        unitId: 1 as UnitId,
        path: [{ x: 1, y: 1 }],
      }),
    ).toBeNull();
    expect(
      commandArtKeyV7({
        kind: "ATTACK",
        unitId: 1 as UnitId,
        targetUnitId: 2 as UnitId,
      }),
    ).toBeNull();
    expect(UNIT_ART_KEYS_V7.KNIGHT).toBe("unit-original-knight");
    expect(UNIT_ART_KEYS_V7.CAPTAIN).toBe("unit-original-captain-v7r10");
    expect(TECH_ART_KEYS_V7.ADMINISTRATION).toBe(PORTRAIT_ART_KEYS_V7.CAPTAIN);
    expect(TECH_ART_KEYS_V7.SCOUTING).toBe("portrait-original-raider");
  });

  it("uses the single Farm for technology, action, and identity", () => {
    expect(TECH_ART_KEYS_V7.FARMING).toBe(FARM_ART_KEYS_V7.SINGLE);
    expect(IMPROVEMENT_ART_KEYS_V7.FARM).toBe(FARM_ART_KEYS_V7.SINGLE);
    expect(commandArtKeyV7({ kind: "BUILD_FARM", at: { x: 1, y: 1 } })).toBe(
      FARM_ART_KEYS_V7.SINGLE,
    );
  });

  it("uses coordinate-only cosmetic Fruit and Game families with canonical action keys", () => {
    for (const [resource, family] of [
      ["FRUIT", FRUIT_MAP_ART_KEYS_V7],
      ["GAME", GAME_MAP_ART_KEYS_V7],
    ] as const) {
      expect(family).toHaveLength(3);
      expect(new Set(family).size).toBe(3);
      for (const [x, id] of family.entries()) {
        // 31 is congruent to 1 modulo 3; x=0,1,2 cycles the family.
        expect(resourceMapArtKeyV7(resource, { x, y: 0 })).toBe(id);
      }
    }
    expect(resourceMapArtKeyV7("FERTILE_GROUND", { x: 2, y: 4 })).toBe(
      RESOURCE_ART_KEYS_V7.FERTILE_GROUND,
    );
    expect(TECH_ART_KEYS_V7.FORESTRY).toBe(IMPROVEMENT_ART_KEYS_V7.LUMBER_CAMP);
    expect(commandArtKeyV7({ kind: "HARVEST_FRUIT", at: { x: 2, y: 0 } })).toBe(
      RESOURCE_ART_KEYS_V7.FRUIT,
    );
    expect(commandArtKeyV7({ kind: "HUNT_GAME", at: { x: 2, y: 0 } })).toBe(
      RESOURCE_ART_KEYS_V7.GAME,
    );
  });
});
