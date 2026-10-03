import type { CoordV7, GameStateV7, TerrainIdV7 } from "../../src/engine/index";
import { checkedV7 } from "./v7-builders";
import { sameV7 } from "./v7-goblin-arena";
import { martianUiFieldV7 } from "./v7-martian-ui";

/**
 * The Rift UI fixture (bead pulp_wars-9s0.5) on the seed-2 11 x 11 arena
 * (seat 0, the human, is Martian; capitals (8, 8) and (2, 8); villages
 * (5, 5), (8, 5), (5, 8)): a horizontal Rift with a Saucer over its middle
 * and a vertical Rift with a Mothership over it, Forest and Mountain cells
 * beside them, and a Human Fighter in reach. The module imports no test
 * runner, so the browser review and the smoke mount it through the dev
 * server.
 */
export const RIFT_UI_V7 = {
  horizontal: [
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
  ],
  vertical: [
    { x: 8, y: 1 },
    { x: 8, y: 2 },
    { x: 8, y: 3 },
  ],
  saucer: { x: 4, y: 2 },
  mothership: { x: 8, y: 2 },
  grunt: { x: 4, y: 3 },
  fighter: { x: 6, y: 3 },
  forest: [
    { x: 2, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 3 },
  ],
  mountain: [
    { x: 2, y: 3 },
    { x: 9, y: 2 },
  ],
} as const;

export function riftUiFixtureV7(): GameStateV7 {
  const at = RIFT_UI_V7;
  const state = martianUiFieldV7([
    { seat: 0, role: "RAIDER", at: at.saucer },
    { seat: 0, role: "KNIGHT", at: at.mothership },
    { seat: 0, role: "FIGHTER", at: at.grunt },
    { seat: 1, role: "FIGHTER", at: at.fighter },
  ]);
  const terrainAt = (where: CoordV7): TerrainIdV7 | null =>
    [...at.horizontal, ...at.vertical].some((tile) => sameV7(tile, where))
      ? "RIFT"
      : at.forest.some((tile) => sameV7(tile, where))
        ? "FOREST"
        : at.mountain.some((tile) => sameV7(tile, where))
          ? "MOUNTAIN"
          : null;
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) => {
        const terrain = terrainAt(tile.at);
        return terrain === null
          ? tile
          : {
              ...tile,
              terrain,
              biome:
                terrain === "FOREST"
                  ? ("WOODLAND" as const)
                  : terrain === "MOUNTAIN"
                    ? ("HIGHLANDS" as const)
                    : tile.biome,
            };
      }),
    },
  });
}
