/**
 * Game states for the settlement shadow review (bead pulp_wars-2yc.8,
 * docs/art/SETTLEMENT_SHADOW.md). Loaded in the browser through the Vite
 * dev server by scripts/art/look-switch-review.ts; nothing here is part of
 * the game build.
 *
 * Each scene is the border scene of the faction grass review (the Human
 * capital on the left, the faction's capital on its own ground on the
 * right) with a neutral-looking Village added on the Human side.
 */
import type { GameStateV7 } from "../../../src/engine/index";
import { borderScene } from "../faction-grass/review-scenes";
import type { LookSwitchShot } from "../look-switch-review";

/** The Village's cell: open Grass on the Human side of the scene. */
const VILLAGE = { x: 6, y: 8 } as const;

function withVillage(state: GameStateV7): GameStateV7 {
  return {
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tile.at.x === VILLAGE.x && tile.at.y === VILLAGE.y
          ? {
              ...tile,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              site: "VILLAGE" as const,
              territoryCityId: null,
            }
          : tile,
      ),
    },
    units: state.units.filter(
      (unit) => unit.at.x !== VILLAGE.x || unit.at.y !== VILLAGE.y,
    ),
  };
}

export const sceneUndead = (): GameStateV7 =>
  withVillage(borderScene("UNDEAD"));
export const sceneMartian = (): GameStateV7 =>
  withVillage(borderScene("MARTIAN"));
export const sceneIceFolk = (): GameStateV7 =>
  withVillage(borderScene("ICE_FOLK"));
export const sceneCandy = (): GameStateV7 => withVillage(borderScene("CANDY"));
export const sceneDwarf = (): GameStateV7 => withVillage(borderScene("DWARF"));

export const SWITCH_PARAMETER = "city-shadow";

const CROP = [240, 200, 960, 590] as const;
/** The faction's capital, the Human capital and the Village, on the page. */
const FACTION_CITY = [930, 430, 150, 150] as const;
const HUMAN_CITY = [290, 430, 150, 150] as const;
const VILLAGE_CELL = [530, 510, 150, 150] as const;

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  {
    name: "undead",
    scene: "sceneUndead",
    zoomIn: 1,
    crop: CROP,
    zoom: FACTION_CITY,
  },
  {
    name: "martian",
    scene: "sceneMartian",
    zoomIn: 1,
    crop: CROP,
    zoom: FACTION_CITY,
  },
  {
    name: "ice-folk",
    scene: "sceneIceFolk",
    zoomIn: 1,
    crop: CROP,
    zoom: FACTION_CITY,
  },
  {
    name: "candy",
    scene: "sceneCandy",
    zoomIn: 1,
    crop: CROP,
    zoom: FACTION_CITY,
  },
  {
    name: "dwarf",
    scene: "sceneDwarf",
    zoomIn: 1,
    crop: CROP,
    zoom: FACTION_CITY,
  },
  {
    name: "human",
    scene: "sceneDwarf",
    zoomIn: 1,
    crop: CROP,
    zoom: HUMAN_CITY,
  },
  {
    name: "village",
    scene: "sceneDwarf",
    zoomIn: 1,
    crop: CROP,
    zoom: VILLAGE_CELL,
  },
];
