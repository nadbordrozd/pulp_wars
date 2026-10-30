import { describe, expect, it } from "vitest";
import {
  parseGameStateV7,
  type CoordV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { generatedMissionLayersV7 } from "../../src/engine/v7/missions/generated-map";
import type { MissionMapSourceV7 } from "../../src/engine/v7/missions/types";
import {
  MARKETING_SCENE_MAP_V7,
  MARKETING_SCENE_V7,
  marketingSceneStateV7,
} from "../fixtures/v7-marketing-scene";
import {
  MARKETING_TAKE2_MAP_V7,
  MARKETING_TAKE2_V7,
  MARKETING_TAKE3_MAP_V7,
  MARKETING_TAKE3_V7,
  marketingTake2StateV7,
  marketingTake3StateV7,
} from "../fixtures/v7-marketing-takes";

/**
 * The marketing screenshot scenes (beads pulp_wars-mxwn, pulp_wars-n3lv,
 * pulp_wars-vbi9) are legal-looking states on the generator's own boards:
 * each passes the state schema and holds what its shots promise.
 */
const SCENES: readonly {
  readonly name: string;
  readonly state: () => GameStateV7;
  readonly map: MissionMapSourceV7;
  /** The selected unit and its role. */
  readonly selected: CoordV7;
  readonly role: UnitRoleIdV7;
  /** At most this share of the board stays unexplored. */
  readonly maxHidden: number;
}[] = [
  {
    name: "v2 (Pangea 24)",
    state: marketingSceneStateV7,
    map: MARKETING_SCENE_MAP_V7,
    selected: MARKETING_SCENE_V7.tripod,
    role: "CATAPULT",
    maxHidden: 1 / 3,
  },
  {
    name: "take 2 (Lakes 13)",
    state: marketingTake2StateV7,
    map: MARKETING_TAKE2_MAP_V7,
    selected: MARKETING_TAKE2_V7.saucer,
    role: "RAIDER",
    maxHidden: 1 / 3,
  },
  {
    // Most of the hidden part is the open sea south of the two islands.
    name: "take 3 (Continents 14)",
    state: marketingTake3StateV7,
    map: MARKETING_TAKE3_MAP_V7,
    selected: MARKETING_TAKE3_V7.selected,
    role: "KNIGHT",
    maxHidden: 1 / 2,
  },
];

const terrainChar = (terrain: string): string =>
  terrain === "GRASS"
    ? "."
    : terrain === "FOREST"
      ? "f"
      : terrain === "MOUNTAIN"
        ? "^"
        : terrain === "RIFT"
          ? "x"
          : "~";

describe.each(SCENES)("marketing scene $name", (scene) => {
  const state = scene.state();

  it("passes the state schema", () => {
    expect(parseGameStateV7(state)).not.toBeNull();
  });

  it("stands on the map generator's terrain for its skirmish setup", () => {
    const generated = generatedMissionLayersV7(scene.map);
    const rows = Array.from({ length: 20 }, (_, y) =>
      state.board.tiles
        .slice(y * 20, y * 20 + 20)
        .map((tile) => terrainChar(tile.terrain))
        .join(""),
    );
    expect(rows).toEqual(generated.terrain);
    expect(state.setup).toMatchObject({
      mapType: scene.map.mapType,
      seed: scene.map.seed,
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
    expect(
      state.cities.map((city) => factionOf.get(city.ownerId)).sort(),
    ).toEqual(["DINOSAUR", "DINOSAUR", "MARTIAN", "MARTIAN", "UNDEAD"]);
    expect(state.units.length).toBe(30);
    const selected = state.units.find(
      (unit) =>
        unit.at.x === scene.selected.x && unit.at.y === scene.selected.y,
    );
    expect(selected?.role).toBe(scene.role);
    expect(selected?.ownerId).toBe(state.humanPlayerId);
    expect(state.units.some((unit) => unit.hp < unit.maxHp)).toBe(true);
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
    expect(hidden).toBeLessThan(state.board.tiles.length * scene.maxHidden);
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
