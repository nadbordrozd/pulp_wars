import {
  RULESET_7_ID,
  buildMissionStateV7,
  viewForV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
  type PlayerViewV7,
} from "../engine/index";
import { galleryDemoTargetFactionV7 } from "./gallery-demo-v7";
import type { GalleryTerrainRowIdV7 } from "./gallery-terrain-presentation-v7";

/**
 * The sample patch of a Terrain detail (bead pulp_wars-2yc.3): a small
 * real board the board host draws, so the Gallery shows a terrain exactly
 * as a match does (composed forests and massifs, coasts, the faction's
 * ground inside its borders, snow, sea ice with its edges). Like the
 * animation preview (gallery-demo-v7.ts) it is a throwaway Ruleset 7 state
 * built with the mission builder; nothing is saved and nothing is played.
 *
 * Only a five by five patch round the viewer's capital is explored, and
 * the board host frames the explored area. A Fighter stands west of the
 * capital, for scale:
 *
 * ```text
 *      x 23456
 * y  2   ..TTT     T: the terrain of the row (Forest, Mountain, Water)
 *    3   ...TT     C: the capital; its borders hold the faction's ground
 *    4   .UCTT     U: the Fighter
 *    5   ...TT
 *    6   ...TT
 * ```
 *
 * Grass is the patch itself; the Rift is one crack in each direction.
 */
const SIZE = 11;
const CAPITAL: CoordV7 = { x: 4, y: 4 };
const FIGHTER: CoordV7 = { x: 3, y: 4 };
const ENEMY_CAPITAL: CoordV7 = { x: 9, y: 8 };
/** The explored patch. */
export const GALLERY_TERRAIN_PATCH_V7 = { x0: 2, y0: 2, x1: 6, y1: 6 } as const;

function terrainRows(row: GalleryTerrainRowIdV7): string[] {
  const grid = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => "."),
  );
  const set = (x: number, y: number, value: string): void => {
    const line = grid[y];
    if (line !== undefined && x >= 0 && x < SIZE) line[x] = value;
  };
  // Every board has a sea (out of view): a board without water would have
  // to forbid the Naval branch.
  for (let x = 0; x < SIZE; x += 1) set(x, SIZE - 1, "~");
  if (row === "FOREST" || row === "MOUNTAIN") {
    const value = row === "FOREST" ? "f" : "^";
    for (let y = 2; y <= 6; y += 1) for (const x of [5, 6]) set(x, y, value);
    set(4, 2, value);
  } else if (row === "WATER" || row === "ICE") {
    // Three columns of water: the middle one has no land beside it (Deep).
    for (let y = 0; y <= 7; y += 1) for (const x of [5, 6, 7]) set(x, y, "~");
  } else if (row === "RIFT") {
    for (const x of [2, 3, 4]) set(x, 6, "x");
    for (const y of [2, 3, 4]) set(6, y, "x");
  }
  return grid.map((line) => line.join(""));
}

function mission(
  row: GalleryTerrainRowIdV7,
  faction: FactionIdV7,
): MissionDefinitionV7 {
  return {
    id: "GALLERY_TERRAIN",
    revision: 1,
    hidden: true,
    size: SIZE,
    seed: 1,
    terrain: terrainRows(row),
    resources: Array.from({ length: SIZE }, () => ".".repeat(SIZE)),
    biome: "PLAINS",
    villages: [],
    aiMode: "RIVAL",
    seats: [
      {
        faction,
        coins: 0,
        technologies: [],
        cities: [{ at: CAPITAL, level: 1, rewards: [] }],
        units: [{ role: "FIGHTER", at: FIGHTER }],
        reveal: { radius: 0, rects: [GALLERY_TERRAIN_PATCH_V7] },
      },
      {
        faction: galleryDemoTargetFactionV7(faction),
        coins: 0,
        technologies: [],
        cities: [{ at: ENEMY_CAPITAL, level: 1, rewards: [] }],
        units: [{ role: "FIGHTER", at: ENEMY_CAPITAL }],
        reveal: { radius: 0 },
      },
    ],
    forbiddenTechnologies: [],
    objective: { kind: "DOMINATION" },
  };
}

/** The frozen sea of the Ice row: ice inside the borders and beyond them. */
function frozen(state: GameStateV7): GameStateV7 {
  const ownerId = state.players[0]?.id;
  if (ownerId === undefined) return state;
  const ice = [];
  for (let y = 2; y <= 5; y += 1)
    for (const x of [5, 6])
      // Outside its owner's borders ice melts: a few turns are left.
      ice.push({ at: { x, y }, ownerId, turnsLeft: 3 });
  return { ...state, ice };
}

/**
 * The viewer's view of the sample board of a terrain as `faction` has it
 * (the Humans for terrain every faction shares), or null when the board
 * cannot be built.
 */
export function buildGalleryTerrainSampleV7(
  row: GalleryTerrainRowIdV7,
  faction: FactionIdV7 | null,
): PlayerViewV7 | null {
  const viewer = faction ?? "ORIGINAL";
  try {
    const built = buildMissionStateV7(mission(row, viewer), {
      rulesetId: RULESET_7_ID,
      seed: 1,
      width: SIZE,
      height: SIZE,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: [viewer, galleryDemoTargetFactionV7(viewer)],
      mapType: "CONTINENTS",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    });
    const state = row === "ICE" ? frozen(built) : built;
    const viewerId = state.players[0]?.id;
    return viewerId === undefined ? null : viewForV7(state, viewerId);
  } catch {
    return null;
  }
}
