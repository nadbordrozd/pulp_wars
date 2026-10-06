/**
 * Game states for the resource review (bead pulp_wars-2yc.16): Game on
 * Forest inside and outside a faction's borders, and Fish on shallow and
 * deep water. Each scene is a throwaway Ruleset 7 state built with the
 * mission builder, like the Gallery's terrain sample. Loaded in the browser
 * through the Vite dev server by scripts/art/resource-review.ts; nothing
 * here is part of the game build.
 *
 * ```text
 *      x 0123456789A
 * y  0   ....fffff..     f: Forest          g: Game on Forest
 *    1   ...fgffgf..     C: the capital     ~: water, s: Fish
 *    2   ..ffffgff..     The capital's borders are widened to two cells
 *    3   ..fgffffg..     (x 2 to 6, y 2 to 6), so the west half of the
 *    4   ..f.Cgfff..     wood is the faction's forest and the east half
 *    5   ..ffgffgf..     the default Forest, side by side.
 *    6   ...fffgff..
 *    7   ...........
 *    8   ~s~s~ss~s~~     Fish on Shallow Water
 *    9   ~~s~s~~s~~~     Fish put on Deep Water for the review only
 *    A   ~~~~~~~~~~~
 * ```
 */
import {
  RULESET_7_ID,
  buildMissionStateV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
} from "../../../src/engine/index";

const SIZE = 11;
const CAPITAL: CoordV7 = { x: 4, y: 4 };
const ENEMY_CAPITAL: CoordV7 = { x: 9, y: 1 };

const TERRAIN = [
  "....fffff..",
  "...ffffff..",
  "..fffffff..",
  "..fffffff..",
  "..f..ffff..",
  "..fffffff..",
  "...ffffff..",
  "...........",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
] as const;

const RESOURCES = [
  "...........",
  "....g..g...",
  "......g....",
  "...g....g..",
  ".....g.....",
  "....g..g...",
  "......g....",
  "...........",
  ".s.s.ss.s..",
  "...........",
  "...........",
] as const;

/** Deep cells given Fish for the review (the rules put Fish on Shallow). */
const DEEP_FISH: readonly CoordV7[] = [
  { x: 2, y: 9 },
  { x: 4, y: 9 },
  { x: 7, y: 9 },
  { x: 5, y: 10 },
];

function mission(faction: FactionIdV7): MissionDefinitionV7 {
  return {
    id: "RESOURCE_REVIEW",
    revision: 1,
    hidden: true,
    size: SIZE,
    seed: 1,
    terrain: [...TERRAIN],
    resources: [...RESOURCES],
    biome: "PLAINS",
    villages: [],
    aiMode: "RIVAL",
    seats: [
      {
        faction,
        coins: 0,
        technologies: [],
        cities: [{ at: CAPITAL, level: 1, rewards: [] }],
        units: [{ role: "FIGHTER", at: { x: 3, y: 4 } }],
        reveal: {
          radius: 0,
          rects: [{ x0: 0, y0: 0, x1: SIZE - 1, y1: SIZE - 1 }],
        },
      },
      {
        faction: faction === "GOBLIN" ? "ORIGINAL" : "GOBLIN",
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

export function resourceSceneV7(faction: FactionIdV7): GameStateV7 {
  const state = buildMissionStateV7(mission(faction), {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: SIZE,
    height: SIZE,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, faction === "GOBLIN" ? "ORIGINAL" : "GOBLIN"],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });
  const capital = state.cities.find(
    (city) => city.at.x === CAPITAL.x && city.at.y === CAPITAL.y,
  );
  if (capital === undefined) throw new Error("no capital");
  return {
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) => {
        const near =
          Math.max(
            Math.abs(tile.at.x - CAPITAL.x),
            Math.abs(tile.at.y - CAPITAL.y),
          ) <= 2;
        const fish = DEEP_FISH.some(
          (at) => at.x === tile.at.x && at.y === tile.at.y,
        );
        return {
          ...tile,
          territoryCityId: near ? capital.id : tile.territoryCityId,
          resource: fish ? ("FISH" as const) : tile.resource,
        };
      }),
    },
  };
}

export const sceneHuman = (): GameStateV7 => resourceSceneV7("ORIGINAL");
export const sceneCandy = (): GameStateV7 => resourceSceneV7("CANDY");
export const sceneUndead = (): GameStateV7 => resourceSceneV7("UNDEAD");
export const sceneIceFolk = (): GameStateV7 => resourceSceneV7("ICE_FOLK");
