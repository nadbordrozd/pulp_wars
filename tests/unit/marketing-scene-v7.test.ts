import { describe, expect, it } from "vitest";
import { parseGameStateV7 } from "../../src/engine/index";
import { generatedMissionLayersV7 } from "../../src/engine/v7/missions/generated-map";
import {
  MARKETING_SCENE_MAP_V7,
  MARKETING_SCENE_V7,
  marketingSceneStateV7,
} from "../fixtures/v7-marketing-scene";

/**
 * The marketing screenshot scene (beads pulp_wars-mxwn, pulp_wars-n3lv) is
 * a legal-looking state on the generator's own board: it passes the state
 * schema and holds what the shots promise.
 */
describe("marketing scene", () => {
  const state = marketingSceneStateV7();

  it("passes the state schema", () => {
    expect(parseGameStateV7(state)).not.toBeNull();
  });

  it("stands on the map generator's terrain for its skirmish setup", () => {
    const generated = generatedMissionLayersV7(MARKETING_SCENE_MAP_V7);
    const char = (terrain: string): string =>
      terrain === "GRASS"
        ? "."
        : terrain === "FOREST"
          ? "f"
          : terrain === "MOUNTAIN"
            ? "^"
            : terrain === "RIFT"
              ? "x"
              : "~";
    const rows = Array.from({ length: 20 }, (_, y) =>
      state.board.tiles
        .slice(y * 20, y * 20 + 20)
        .map((tile) => char(tile.terrain))
        .join(""),
    );
    expect(rows).toEqual(generated.terrain);
    expect(state.setup).toMatchObject({
      mapType: MARKETING_SCENE_MAP_V7.mapType,
      seed: MARKETING_SCENE_MAP_V7.seed,
      width: 20,
    });
  });

  it("is the Martians' turn 19 against the Undead and the Dinosaurs", () => {
    const factionOf = new Map(
      state.players.map((player) => [player.id, player.faction]),
    );
    expect(state.round).toBe(19);
    expect(factionOf.get(state.humanPlayerId)).toBe("MARTIAN");
    expect(state.turnOrder[state.activeSeatIndex]).toBe(state.humanPlayerId);
    expect(state.cities.map((city) => factionOf.get(city.ownerId))).toEqual([
      "MARTIAN",
      "UNDEAD",
      "DINOSAUR",
      "MARTIAN",
      "DINOSAUR",
    ]);
    expect(state.units.length).toBe(30);
    const tripod = state.units.find(
      (unit) =>
        unit.at.x === MARKETING_SCENE_V7.tripod.x &&
        unit.at.y === MARKETING_SCENE_V7.tripod.y,
    );
    expect(tripod?.role).toBe("CATAPULT");
    expect(tripod?.ownerId).toBe(state.humanPlayerId);
  });

  it("leaves a ragged fog at the edges, never on a city", () => {
    const martians = state.players.find(
      (player) => player.id === state.humanPlayerId,
    );
    const seen = new Set(
      (martians?.explored ?? []).map((at) => `${at.x},${at.y}`),
    );
    const hidden = state.board.tiles.length - seen.size;
    expect(hidden).toBeGreaterThan(0);
    expect(hidden).toBeLessThan(state.board.tiles.length / 3);
    for (const city of state.cities)
      expect(seen.has(`${city.at.x},${city.at.y}`)).toBe(true);
    // The eastern edge of the explored land differs from row to row.
    const eastEdges = new Set(
      Array.from({ length: 20 }, (_, y) =>
        Math.max(
          -1,
          ...Array.from({ length: 20 }, (_, x) => x).filter((x) =>
            seen.has(`${x},${y}`),
          ),
        ),
      ),
    );
    expect(eastEdges.size).toBeGreaterThan(3);
  });
});
