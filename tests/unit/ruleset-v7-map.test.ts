import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  canonicalMapRandomHashV6,
  canonicalMapRandomHashV7,
  createInitialMapStateV7,
  generateInitialMapV6,
  generateInitialMapV7,
  parseGameStateV7,
  toV6Setup,
  type AiCountV7,
  type BoardSizeV7,
  type MatchSetupV7,
} from "../../src/engine/index";

describe("ruleset-7 map adapter", () => {
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
    "preserves exact v6 board, settlements, treasure, and PRNG for %i AI size %i seed %i",
    (aiCount, size, seed) => {
      const v7Setup = setup(aiCount, size, seed);
      const v6 = generateInitialMapV6(toV6Setup(v7Setup));
      const v7 = generateInitialMapV7(v7Setup);
      if (!v6.ok || !v7.ok) throw new Error("map generation failed");
      expect(v7.map.board).toEqual(v6.map.board);
      expect(v7.map.capitalAssignments).toEqual(v6.map.capitalAssignments);
      expect(v7.map.turnOrderSeats).toEqual(v6.map.turnOrderSeats);
      expect(v7.map.villages).toEqual(v6.map.villages);
      expect(v7.map.treasureChests).toEqual(v6.map.treasureChests);
      expect(v7.map.random).toEqual(v6.map.random);
      expect(canonicalMapRandomHashV7(v7.map)).toBe(
        canonicalMapRandomHashV6(v6.map),
      );
    },
  );

  it("creates a strict v7 staged state without selecting it in production", () => {
    const created = createInitialMapStateV7(setup(3, 16, 41));
    if (!created.ok) throw new Error(created.error.code);
    expect(parseGameStateV7(created.state)).toEqual(created.state);
    expect(created.state.rulesetId).toBe("pulp-wars-poc-7r2");
    expect(
      created.state.players.every(
        (player) => player.factionTreeId === "ORIGINAL_BASELINE_V3",
      ),
    ).toBe(true);
    expect(
      created.state.players.every(
        (player) => player.spoilsClaimedCityIds.length === 0,
      ),
    ).toBe(true);
    expect(created.state.defectionMarks).toEqual([]);
    expect(created.state.saboteurExposures).toEqual([]);
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
    mapGenerationRevision: "SPATIAL_ECONOMY",
  };
}
