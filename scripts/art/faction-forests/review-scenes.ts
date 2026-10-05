/**
 * Game states for the faction forests review (bead pulp_wars-2yc.2,
 * docs/art/FACTION_FORESTS.md). Loaded in the browser through the Vite dev
 * server by scripts/art/look-switch-review.ts; nothing here is part of the
 * game build.
 *
 * Each scene is the border scene of the faction grass review (the Human
 * capital and territory on the left, the faction's on the right, a neutral
 * row under both) with more Forest: a wood across the border at the top, a
 * wood in each territory and one that runs out into neutral land, with the
 * scene's units, Farms, resources and Mountains among them.
 */
import type { GameStateV7 } from "../../../src/engine/index";
import { borderScene, overviewScene } from "../faction-grass/review-scenes";
import type { LookSwitchShot } from "../look-switch-review";

/** The scene's window starts here (faction-grass/review-scenes.ts). */
const ORIGIN = { x: 2, y: 4 } as const;
/** Extra Forest, as rectangles of the window: [left, top, right, bottom]. */
const WOODS: readonly (readonly [number, number, number, number])[] = [
  [2, 0, 9, 1],
  [0, 5, 2, 6],
  [8, 4, 11, 6],
  [4, 2, 5, 2],
];

function forested(state: GameStateV7): GameStateV7 {
  const taken = new Set(state.units.map((unit) => `${unit.at.x},${unit.at.y}`));
  return {
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) => {
        const x = tile.at.x - ORIGIN.x;
        const y = tile.at.y - ORIGIN.y;
        const wood = WOODS.some(
          ([left, top, right, bottom]) =>
            x >= left && x <= right && y >= top && y <= bottom,
        );
        return wood &&
          tile.terrain === "GRASS" &&
          tile.site === null &&
          tile.improvement === null &&
          !tile.road &&
          !taken.has(`${tile.at.x},${tile.at.y}`)
          ? { ...tile, terrain: "FOREST" as const }
          : tile;
      }),
    },
  };
}

export const sceneUndead = (): GameStateV7 => forested(borderScene("UNDEAD"));
export const sceneGoblin = (): GameStateV7 => forested(borderScene("GOBLIN"));
export const sceneDinosaur = (): GameStateV7 =>
  forested(borderScene("DINOSAUR"));
export const sceneMartian = (): GameStateV7 => forested(borderScene("MARTIAN"));
export const sceneIceFolk = (): GameStateV7 =>
  forested(borderScene("ICE_FOLK"));
export const sceneDwarf = (): GameStateV7 => forested(borderScene("DWARF"));
export const sceneCandy = (): GameStateV7 => forested(borderScene("CANDY"));
export const sceneOverview = (): GameStateV7 => overviewScene();

export const SWITCH_PARAMETER = "faction-forests";

const CROP = [240, 200, 960, 590] as const;
/** The wood in the faction's territory, shown again at 3x. */
const ZOOM = [840, 500, 320, 250] as const;
const shot = (name: string, scene: string): LookSwitchShot => ({
  name,
  scene,
  zoomIn: 1,
  crop: CROP,
  zoom: ZOOM,
});

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  shot("undead", "sceneUndead"),
  shot("goblin", "sceneGoblin"),
  shot("dinosaur", "sceneDinosaur"),
  shot("martian", "sceneMartian"),
  shot("dwarf", "sceneDwarf"),
  shot("candy", "sceneCandy"),
  shot("ice-folk", "sceneIceFolk"),
  {
    name: "overview",
    scene: "sceneOverview",
    zoomIn: 0,
    size: [1760, 1700],
    crop: [130, 130, 1500, 1500],
  },
];
