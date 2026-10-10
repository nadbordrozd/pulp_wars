/**
 * Game states for the review of the Cult heather moor and lantern wood
 * (bead pulp_wars-mch9.22, docs/art/factions/CULT.md, Ground and forest).
 * Loaded in the browser through the Vite dev server by
 * scripts/art/look-switch-review.ts; nothing here is part of the game build.
 *
 *   npx vite --host localhost --port 6597 --strictPort &
 *   CHROME_PATH=... SWITCH_GAME_URL=http://localhost:6597/ \
 *     npx tsx scripts/art/look-switch-review.ts \
 *     scripts/art/cult-terrain/review-scenes.ts <out-dir>
 *
 * `sceneCult` is a drawn 16 x 8 window of a generated three-seat match:
 * Human territory on the left four columns, Cult territory on the middle
 * eight and Undead territory on the right four, a neutral row under all.
 * The Cult's holds its capital, the seven buildings with a Cult look (a
 * Lumber Camp and a Sawmill on Forest), the seven Monuments, a Field
 * Defense in the wood, and Cult units of five kinds in the wood and beside
 * it. "Before" is the game with `?faction-forests=0`: the default Forest on
 * the moor.
 */
import {
  ACHIEVEMENT_IDS_V7,
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  type CoordV7,
  type GameStateV7,
  type ImprovementIdV7,
  type TileStateV7,
  type UnitRoleIdV7,
} from "../../../src/engine/index";
import type { LookSwitchShot } from "../look-switch-review";
import { terrainFogScene } from "../terrain-fog/review-scenes";

/**
 * `.` Grass, `T` Forest, `M` Mountain, `~` Shallow Water, `=` a Road, `C`
 * the Human capital, `K` the Cult's, `D` the Undead's, `u` a Human unit,
 * `z` an Undead unit, `1` to `5` a Cult unit on Grass (Initiate, Hexer,
 * Idol Bearer, rider, Stargazer), `w` an Initiate in Forest, `d` a Field
 * Defense on Forest, `L` a Lumber Camp and `S` a Sawmill on Forest, `F` a
 * Forge, `W` a Workshop, `R` a Market, `P` a Port and `Y` a Shipyard on
 * water, `N` a Monument (the achievements in order).
 */
const SCENE = [
  "TT..TTTT.NNNTT.M",
  ".T.TTLwT1.NN.TT.",
  "..u.TTS.4.NNz.T.",
  "MC.====K3.FW..D.",
  "....TdwT.5.R.T..",
  ".TT.TTTT2~P~TT.z",
  "..T..wTT.~Y~.T..",
  "................",
] as const;
const ORIGIN = { x: 0, y: 4 } as const;
const COLUMNS = SCENE[0].length;
const ROWS = SCENE.length;

const FOREST = new Set(["T", "w", "d", "L", "S"]);
const WATER = new Set(["~", "P", "Y"]);
const IMPROVEMENT: Readonly<Record<string, ImprovementIdV7>> = {
  L: "LUMBER_CAMP",
  S: "SAWMILL",
  F: "FORGE",
  W: "WORKSHOP",
  R: "MARKET",
  P: "PORT",
  Y: "SHIPYARD",
  N: "MONUMENT",
};
const CULT_ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  "1": "FIGHTER",
  "2": "MARKSMAN",
  "3": "GUARD",
  "4": "RAIDER",
  "5": "CATAPULT",
  w: "FIGHTER",
};

function sceneState(): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 31,
    width: 16,
    height: 16,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "CULT", "UNDEAD"],
    mapType: "DRY_LAND",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

export function sceneCult(): GameStateV7 {
  const state = sceneState();
  const cityOf = (faction: string) => {
    const player = state.players.find((item) => item.faction === faction);
    const city = state.cities.find((item) => item.ownerId === player?.id);
    const unit = state.units.find((item) => item.ownerId === player?.id);
    if (player === undefined || city === undefined || unit === undefined)
      throw new Error(`no ${faction} seat`);
    return { player, city, unit };
  };
  const human = cityOf("ORIGINAL");
  const cult = cityOf("CULT");
  const undead = cityOf("UNDEAD");
  const mark = (at: CoordV7): string | undefined =>
    SCENE[at.y - ORIGIN.y]?.[at.x - ORIGIN.x];
  const find = (wanted: string): CoordV7 => {
    for (let y = 0; y < ROWS; y += 1)
      for (let x = 0; x < COLUMNS; x += 1)
        if (SCENE[y]?.[x] === wanted)
          return { x: ORIGIN.x + x, y: ORIGIN.y + y };
    throw new Error(`no ${wanted} in the scene`);
  };
  const tiles = state.board.tiles.map((tile): TileStateV7 => {
    const code = mark(tile.at);
    if (code === undefined)
      return { ...tile, site: null, territoryCityId: null };
    const column = tile.at.x - ORIGIN.x;
    const row = tile.at.y - ORIGIN.y;
    return {
      ...tile,
      biome: tile.biome ?? "PLAINS",
      terrain: FOREST.has(code)
        ? "FOREST"
        : code === "M"
          ? "MOUNTAIN"
          : WATER.has(code)
            ? "SHALLOW_WATER"
            : "GRASS",
      resource: null,
      improvement: IMPROVEMENT[code] ?? null,
      road: code === "=",
      fieldDefense: code === "d",
      site: code === "C" || code === "K" || code === "D" ? "CAPITAL" : null,
      territoryCityId:
        row === ROWS - 1
          ? null
          : column < 4
            ? human.city.id
            : column < 12
              ? cult.city.id
              : undead.city.id,
    };
  });
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  const units = tiles.flatMap((tile) => {
    const code = mark(tile.at) ?? ".";
    const role = CULT_ROLE[code];
    const template =
      code === "u"
        ? human.unit
        : code === "z"
          ? undead.unit
          : role !== undefined
            ? { ...cult.unit, role }
            : null;
    return template === null
      ? []
      : [{ ...template, id: nextId++ as typeof template.id, at: tile.at }];
  });
  const monuments = tiles.filter((tile) => mark(tile.at) === "N");
  return {
    ...state,
    units,
    cities: state.cities.map((city) =>
      city.id === human.city.id
        ? { ...city, at: find("C") }
        : city.id === cult.city.id
          ? { ...city, at: find("K"), level: 3 }
          : city.id === undead.city.id
            ? { ...city, at: find("D") }
            : city,
    ),
    board: { ...state.board, tiles },
    populationContributions: [
      ...state.populationContributions,
      ...monuments.flatMap((tile, index) => {
        const achievement = ACHIEVEMENT_IDS_V7[index];
        return achievement === undefined
          ? []
          : [
              {
                id: 9700 + index,
                cityId: cult.city.id,
                category: "LIVE" as const,
                amount: 3,
                source: {
                  kind: "MONUMENT" as const,
                  achievement,
                  at: tile.at,
                  builderFaction: "CULT" as const,
                },
              },
            ];
      }),
    ],
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: tiles
              .filter((tile) => mark(tile.at) !== undefined)
              .map((tile) => tile.at),
          }
        : player,
    ),
  };
}

/**
 * The same board with the north-west of the Cult's territory unexplored, so
 * the lantern wood runs into the fog.
 */
export function sceneCultFog(): GameStateV7 {
  const state = sceneCult();
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: player.explored.filter((at) => {
              const column = at.x - ORIGIN.x;
              const row = at.y - ORIGIN.y;
              return !(row === 0 || (column <= 5 && row <= 2) || column <= 3);
            }),
          }
        : player,
    ),
  };
}

/**
 * The wood of the terrain-and-fog review (a map the match's own setup
 * makes, so the board has its skeleton and packs the wood with its ghosts)
 * held by a Cult city: whole, and with only the columns from x 5 on
 * explored. The explored cells of the second draw the pieces they draw in
 * the first.
 */
export const sceneLanternWood = (): GameStateV7 =>
  terrainFogScene({ other: "CULT", widened: true, owner: 1 });
export const sceneLanternWoodCut = (): GameStateV7 =>
  terrainFogScene({
    other: "CULT",
    widened: true,
    owner: 1,
    cut: { west: 5 },
  });

export const SWITCH_PARAMETER = "faction-forests";

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  { name: "cult", scene: "sceneCult", zoomIn: 1, zoom: [560, 250, 420, 300] },
  {
    name: "cult-fog",
    scene: "sceneCultFog",
    zoomIn: 1,
    zoom: [560, 250, 420, 300],
  },
  // The same camera for both, so the two can be laid over each other.
  { name: "lantern-wood", scene: "sceneLanternWood", zoomIn: 1 },
  { name: "lantern-wood-cut", scene: "sceneLanternWoodCut", zoomIn: 1 },
];
