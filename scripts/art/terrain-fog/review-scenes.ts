/**
 * Game states for the terrain-and-fog review (bead pulp_wars-2yc.28,
 * docs/art/TERRAIN_AT_THE_FOG.md): a mountain range, a wood and a bay that
 * lie half inside the fog, a wood with every kind of occupant whose
 * territory changes hands, and a city whose capture ripples over its land.
 * Loaded in the browser through the Vite dev server by
 * scripts/art/terrain-fog/review.ts; nothing here is part of the game
 * build.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ~~~~~~~~~~~~~~      ^: Mountain   f: Forest   ~: water
 *    1   ~~..^^^^^^..~~      C: the viewer's capital (x 10, y 6)
 *    2   ~...^^^^^^...~      E: the other seat's capital (x 12, y 2)
 *    3   ~...^^^^^^...~      W: the wood's city (x 7, y 9)
 *    4   ~............~      V: a Village      g: Game on Forest
 *    5   ~..ffffff....~
 *    6   ~..fgffff.C..~      With `widened` the wood's city holds the
 *    7   ~..ffgfff....~      whole wood (x 2 to 8, y 4 to 10), and the
 *    8   ~..LfffgfV...~      wood a Lumber Camp (L). `owner` is the seat
 *    9   ~......W.....~      that holds the wood's city.
 *    A   ~~....~~~....~
 *    B   ~~~..~~~~~..~~
 *    C   ~~~~~~~~~~~~~~
 *    D   ~~~~~~~~~~~~~~
 * ```
 */
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  buildMissionStateV7,
  createPlayableGameV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
} from "../../../src/engine/index";

export const TERRAIN_FOG_SIZE = 14;
const CAPITAL: CoordV7 = { x: 10, y: 6 };
const ENEMY_CAPITAL: CoordV7 = { x: 12, y: 2 };
export const WOOD_CITY: CoordV7 = { x: 7, y: 9 };
const VILLAGE: CoordV7 = { x: 9, y: 8 };

export const TERRAIN_FOG_TERRAIN = [
  "~~~~~~~~~~~~~~",
  "~~..^^^^^^..~~",
  "~...^^^^^^...~",
  "~...^^^^^^...~",
  "~............~",
  "~..ffffff....~",
  "~..ffffff....~",
  "~..ffffff....~",
  "~..ffffff....~",
  "~............~",
  "~~....~~~....~",
  "~~~..~~~~~..~~",
  "~~~~~~~~~~~~~~",
  "~~~~~~~~~~~~~~",
] as const;

const RESOURCES = [
  "..............",
  "..............",
  "..............",
  "..............",
  "..............",
  "..............",
  "....g.........",
  ".....g........",
  ".......g......",
  "..............",
  "..............",
  "..............",
  "..............",
  "..............",
] as const;

/** Which cells the viewer has explored. */
export type TerrainFogCut =
  /** Everything. */
  | "ALL"
  /** Columns from x on: the range and the wood are cut north to south. */
  | { readonly west: number }
  /** Rows from y on: only the front rows of the range are known. */
  | { readonly north: number }
  /** Rows up to y: only the back rows are known. */
  | { readonly south: number }
  /** A ragged diagonal frontier across both. */
  | "DIAGONAL";

const seen = (cut: TerrainFogCut, at: CoordV7): boolean => {
  if (cut === "ALL") return true;
  if (cut === "DIAGONAL")
    return at.x + at.y >= 11 + (((at.x * 7 + at.y * 3) % 3) - 1);
  if ("west" in cut) return at.x >= cut.west;
  if ("north" in cut) return at.y >= cut.north;
  return at.y <= cut.south;
};

function mission(
  faction: FactionIdV7,
  other: FactionIdV7,
): MissionDefinitionV7 {
  return {
    id: "TERRAIN_FOG_REVIEW",
    revision: 1,
    hidden: true,
    size: TERRAIN_FOG_SIZE,
    seed: 1,
    terrain: [...TERRAIN_FOG_TERRAIN],
    resources: [...RESOURCES],
    biome: "PLAINS",
    villages: [VILLAGE],
    // Clearings: a Treasure and a Field Defense on Forest.
    treasureChests: [{ x: 5, y: 5 }],
    fieldDefenses: [{ x: 7, y: 6 }],
    aiMode: "RIVAL",
    seats: [
      {
        faction,
        coins: 0,
        technologies: [],
        cities: [
          { at: CAPITAL, level: 1, rewards: [] },
          { at: WOOD_CITY, level: 1, rewards: [] },
        ],
        units: [
          { role: "FIGHTER", at: { x: 9, y: 5 } },
          { role: "FIGHTER", at: { x: 8, y: 5 } },
          { role: "FIGHTER", at: { x: 6, y: 7 } },
        ],
        reveal: {
          radius: 0,
          rects: [
            {
              x0: 0,
              y0: 0,
              x1: TERRAIN_FOG_SIZE - 1,
              y1: TERRAIN_FOG_SIZE - 1,
            },
          ],
        },
      },
      {
        faction: other,
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

/**
 * The largest map, a generated 25 x 25 match of eight seats with every
 * cell explored: the cost of a ripple is measured on it. With `captured`
 * the capital nearest the viewer's, and its land, is the viewer's.
 */
export function terrainFogLargeScene(
  options: { readonly captured?: boolean } = {},
): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 77,
    width: 25,
    height: 25,
    aiCount: 7,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [
      "CANDY",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "ORIGINAL",
    ],
    mapType: "CONTINENTS",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  const own = state.cities.find((city) => city.ownerId === state.humanPlayerId);
  if (own === undefined) throw new Error("no capital");
  const taken = [...state.cities]
    .filter((city) => city.ownerId !== state.humanPlayerId)
    .sort(
      (a, b) =>
        Math.hypot(a.at.x - own.at.x, a.at.y - own.at.y) -
        Math.hypot(b.at.x - own.at.x, b.at.y - own.at.y),
    )[0];
  if (taken === undefined) throw new Error("no other capital");
  return {
    ...state,
    cities: state.cities.map((city) =>
      city.id === taken.id && options.captured === true
        ? { ...city, ownerId: state.humanPlayerId }
        : city,
    ),
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, explored: state.board.tiles.map((tile) => tile.at) }
        : player,
    ),
    // The taken capital holds a 5 x 5 of land, as after a Land Grant.
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        Math.max(
          Math.abs(tile.at.x - taken.at.x),
          Math.abs(tile.at.y - taken.at.y),
        ) <= 2 &&
        (tile.territoryCityId === null || tile.territoryCityId === taken.id)
          ? { ...tile, territoryCityId: taken.id }
          : tile,
      ),
    },
  };
}

export interface TerrainFogSceneOptions {
  readonly faction?: FactionIdV7;
  readonly other?: FactionIdV7;
  readonly cut?: TerrainFogCut;
  /** The wood's city holds the whole wood (x 2 to 8, y 4 to 10). */
  readonly widened?: boolean;
  /** The seat (0, the viewer, or 1) that holds the wood's city. */
  readonly owner?: 0 | 1;
  /** The review runner: `terrainFogLargeScene` instead, and its option. */
  readonly large?: boolean;
  readonly captured?: boolean;
}

export function terrainFogScene(
  options: TerrainFogSceneOptions = {},
): GameStateV7 {
  const faction = options.faction ?? "ORIGINAL";
  const other = options.other ?? (faction === "GOBLIN" ? "ORIGINAL" : "GOBLIN");
  const cut = options.cut ?? "ALL";
  const state = buildMissionStateV7(mission(faction, other), {
    rulesetId: RULESET_7_ID,
    seed: 1,
    width: TERRAIN_FOG_SIZE,
    height: TERRAIN_FOG_SIZE,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, other],
    mapType: "CONTINENTS",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  });
  const wood = state.cities.find(
    (city) => city.at.x === WOOD_CITY.x && city.at.y === WOOD_CITY.y,
  );
  if (wood === undefined) throw new Error("no wood city");
  const holder = state.players[options.owner ?? 0];
  if (holder === undefined) throw new Error("no such seat");
  return {
    ...state,
    cities: state.cities.map((city) =>
      city.id === wood.id ? { ...city, ownerId: holder.id } : city,
    ),
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: state.board.tiles
              .map((tile) => tile.at)
              .filter(
                (at) =>
                  seen(cut, at) ||
                  // The capital and its ring are always known.
                  Math.max(
                    Math.abs(at.x - CAPITAL.x),
                    Math.abs(at.y - CAPITAL.y),
                  ) <= 1,
              ),
          }
        : player,
    ),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) => {
        const wide =
          options.widened === true &&
          tile.at.x >= 2 &&
          tile.at.x <= 8 &&
          tile.at.y >= 4 &&
          tile.at.y <= 10;
        // A Lumber Camp (its Forest is drawn as Grass) in the wood's corner.
        const camp = wide && tile.at.x === 3 && tile.at.y === 8;
        return wide
          ? {
              ...tile,
              territoryCityId: wood.id,
              improvement: camp ? ("LUMBER_CAMP" as const) : tile.improvement,
            }
          : tile;
      }),
    },
  };
}
