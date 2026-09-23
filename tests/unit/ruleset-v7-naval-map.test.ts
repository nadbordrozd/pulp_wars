import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  createInitialMapStateV7,
  generateInitialMapV7,
  type MapTypeV7,
} from "../../src/engine/index";

const mapTypes: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];

describe("ruleset-7 naval map contract", () => {
  it.each(mapTypes)(
    "creates deterministic %s setup with exact water identity",
    (mapType) => {
      const setup = {
        rulesetId: RULESET_7_ID,
        seed: 71,
        width: 11,
        height: 11,
        aiCount: 1 as const,
        aiDifficulty: "NORMAL" as const,
        aiMode: "RIVAL" as const,
        humanColor: "CORAL" as const,
        factions: ["ORIGINAL", "ORIGINAL"] as const,
        mapType,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V1" as const,
      };
      const first = generateInitialMapV7(setup);
      const second = generateInitialMapV7(setup);
      expect(first).toEqual(second);
      expect(first.ok).toBe(true);
      if (!first.ok) return;
      const water = first.map.board.tiles.filter((tile) => tile.biome === null);
      expect(water.length === 0).toBe(mapType === "DRY_LAND");
      expect(
        water.every(
          (tile) =>
            tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER",
        ),
      ).toBe(true);
      expect(
        first.map.treasureChests.every((at) => {
          const tile =
            first.map.board.tiles[at.y * first.map.board.width + at.x];
          return tile?.biome !== null;
        }),
      ).toBe(true);
      expect(createInitialMapStateV7(setup)).toMatchObject({ ok: true });
    },
  );

  it("varies each seeded coastline family", () => {
    for (const mapType of mapTypes.slice(1)) {
      const masks = new Set<string>();
      for (const seed of [0, 1, 2]) {
        const result = generateInitialMapV7({
          rulesetId: RULESET_7_ID,
          seed,
          width: 11,
          height: 11,
          aiCount: 1,
          aiDifficulty: "NORMAL",
          aiMode: "RIVAL",
          humanColor: "CORAL",
          factions: ["ORIGINAL", "ORIGINAL"],
          mapType,
          mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V1",
        });
        expect(result.ok).toBe(true);
        if (result.ok)
          masks.add(
            result.map.board.tiles
              .map((tile) => (tile.biome === null ? "W" : "L"))
              .join(""),
          );
      }
      expect(masks.size).toBeGreaterThan(1);
    }
  });

  it("records dedicated topology, full land-field, and fresh water draws", () => {
    const result = generateInitialMapV7({
      rulesetId: RULESET_7_ID,
      seed: 1234,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["ORIGINAL", "ORIGINAL"],
      mapType: "CONTINENTS",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const water = result.map.board.tiles.filter((tile) => tile.biome === null);
    const accepted = result.map.attempts[result.map.attempt - 1];
    expect(accepted).toMatchObject({
      topologyDrawCount: 121,
      landResourceDrawCount: 121 - water.length,
      waterResourceDrawCount: water.length,
      resourceDrawCount: 121,
    });
    expect(
      water.every(
        (tile) => tile.resource !== "FISH" || tile.terrain === "SHALLOW_WATER",
      ),
    ).toBe(true);
    expect(water.some((tile) => tile.resource === null)).toBe(true);
  });
});
