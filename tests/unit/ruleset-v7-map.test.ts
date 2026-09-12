import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  canonicalMapRandomHashV7,
  createInitialMapStateV7,
  generateInitialMapV7,
  parseGameStateV7,
  type AiCountV7,
  type BoardSizeV7,
  type MatchSetupV7,
} from "../../src/engine/index";

describe("ruleset-7 regional biome map", () => {
  it.each([
    [1, 11, 0],
    [1, 14, 0],
    [2, 14, 0],
    [1, 16, 0],
    [2, 16, 0],
    [3, 16, 0],
    [1, 20, 17],
    [2, 20, 0],
    [3, 20, 0],
    [1, 25, 0],
    [2, 25, 0],
    [3, 25, 0],
  ] as const)(
    "generates deterministically for %i AI size %i seed %i",
    (aiCount, size, seed) => {
      const v7Setup = setup(aiCount, size, seed);
      const v7 = generateInitialMapV7(v7Setup);
      if (!v7.ok) throw new Error("map generation failed");
      const repeated = generateInitialMapV7(v7Setup);
      if (!repeated.ok) throw new Error("repeated map generation failed");
      expect(v7.map).toEqual(repeated.map);
      expect(canonicalMapRandomHashV7(v7.map)).toBe(
        canonicalMapRandomHashV7(repeated.map),
      );
    },
  );

  it("creates the strict v7 production state with serialized biomes and Ore", () => {
    const created = createInitialMapStateV7(setup(3, 16, 41));
    if (!created.ok) throw new Error(created.error.code);
    expect(parseGameStateV7(created.state)).toEqual(created.state);
    expect(created.state.rulesetId).toBe("pulp-wars-poc-7r4");
    expect(
      created.state.players.every(
        (player) => player.factionTreeId === "ORIGINAL_BASELINE_V4",
      ),
    ).toBe(true);
    expect(
      created.state.players.every(
        (player) => player.spoilsClaimedCityIds.length === 0,
      ),
    ).toBe(true);
    expect(created.state.saboteurExposures).toEqual([]);
    expect(
      created.state.board.tiles.every((tile) => tile.biome !== undefined),
    ).toBe(true);
    expect(
      created.state.board.tiles.some((tile) => tile.resource === "ORE"),
    ).toBe(true);
  });
});

function setup(
  aiCount: AiCountV7,
  size: BoardSizeV7,
  seed: number,
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: size,
    height: size,
    aiCount,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    mapGenerationRevision: "REGIONAL_BIOMES_V1",
  };
}
