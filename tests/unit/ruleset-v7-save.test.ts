import { describe, expect, it } from "vitest";
import {
  createPlayableGameV7,
  createReplayV7,
  parseReplayFileV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/v7";
import { setupV7 } from "../fixtures/v7-builders";

describe("ruleset-7 revision-4 save compatibility", () => {
  it("recognizes an otherwise recognizable revision-3 envelope as incompatible", () => {
    expect(
      parseSaveV7(
        JSON.stringify({
          format: "pulp-wars-save",
          version: 7,
          rulesetId: "pulp-wars-poc-7r3",
        }),
      ),
    ).toMatchObject({ kind: "INCOMPATIBLE" });
  });

  it("rejects malformed biome and Ore data across save and replay boundaries", () => {
    const setup = setupV7(9, 1);
    const created = createPlayableGameV7(setup);
    if (!created.ok) throw new Error(created.error.code);
    const save = createSaveEnvelopeV7(
      { state: created.state, replay: createReplayV7(setup) },
      "2026-09-12T10:00:00.000Z",
    );
    const malformedBiome = structuredClone(save) as unknown as {
      state: { board: { tiles: Record<string, unknown>[] } };
    };
    delete malformedBiome.state.board.tiles[0]?.biome;
    expect(parseSaveV7(JSON.stringify(malformedBiome))).toMatchObject({
      kind: "CORRUPT",
    });

    const malformedOre = structuredClone(save) as unknown as {
      state: { board: { tiles: Record<string, unknown>[] } };
    };
    if (malformedOre.state.board.tiles[0] !== undefined) {
      malformedOre.state.board.tiles[0].terrain = "FOREST";
      malformedOre.state.board.tiles[0].resource = "ORE";
      malformedOre.state.board.tiles[0].site = null;
      malformedOre.state.board.tiles[0].improvement = null;
    }
    expect(parseSaveV7(JSON.stringify(malformedOre))).toMatchObject({
      kind: "CORRUPT",
    });

    const replay = createReplayV7(setup);
    expect(
      parseReplayFileV7({
        ...replay,
        setup: { ...replay.setup, rulesetId: "pulp-wars-poc-7r3" },
      }),
    ).toMatchObject({ kind: "INCOMPATIBLE_REPLAY" });
    expect(
      parseReplayFileV7({
        ...replay,
        setup: { ...replay.setup, mapGenerationRevision: "SPATIAL_ECONOMY" },
      }),
    ).toMatchObject({ kind: "INVALID_REPLAY" });
  });
});
