import type { CoordV7, GameStateV7 } from "../../src/engine/index";
import { goblinArenaV7 } from "./v7-goblin-arena";

/**
 * Bead pulp_wars-2yc.88: a Human Raider on mixed ground (Grass, a Forest, a
 * Mountain) whose reach has holes: a Shallow Water tile and an own Guard
 * beside it, each surrounded by tiles it may move to. Two enemy Fighters
 * stand in reach, so its Moves and Attacks show together. No match is
 * played: a test or a review mounts the state and selects the Raider.
 */
export const MOVE_TARGETS_UI_V7 = {
  raider: { x: 5, y: 5 },
  /** Shallow Water beside the Raider: not a destination. */
  water: { x: 5, y: 4 },
  /** An own Guard beside the Raider: not a destination. */
  guard: { x: 6, y: 5 },
  forest: { x: 4, y: 5 },
  mountain: { x: 4, y: 6 },
  enemyNear: { x: 6, y: 6 },
  enemyFar: { x: 7, y: 4 },
} as const satisfies Record<string, CoordV7>;

export function moveTargetsFixtureV7(): GameStateV7 {
  const at = MOVE_TARGETS_UI_V7;
  const state = goblinArenaV7(
    ["ORIGINAL", "ORIGINAL"],
    [
      { seat: 0, role: "RAIDER", at: at.raider },
      { seat: 0, role: "GUARD", at: at.guard },
      { seat: 1, role: "FIGHTER", at: at.enemyNear },
      { seat: 1, role: "FIGHTER", at: at.enemyFar },
    ],
    { water: [at.water] },
  );
  const ground = (tile: {
    readonly at: CoordV7;
  }): "FOREST" | "MOUNTAIN" | null =>
    tile.at.x === at.forest.x && tile.at.y === at.forest.y
      ? "FOREST"
      : tile.at.x === at.mountain.x && tile.at.y === at.mountain.y
        ? "MOUNTAIN"
        : null;
  return {
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) => {
        const terrain = ground(tile);
        return terrain === null || tile.site !== null
          ? tile
          : {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain,
              resource: null,
              improvement: null,
              site: null,
            };
      }),
    },
  };
}
