/**
 * Game states for the faction grass review (EXPERIMENT, bead
 * pulp_wars-2o7.4, docs/art/FACTION_GRASS.md). Loaded in the browser through
 * the Vite dev server by scripts/art/faction-grass-review.ts; nothing here
 * is part of the game build.
 *
 * `borderScene(faction)` is a drawn 12 x 7 window of a real generated
 * match: the Human capital and its territory on the left six columns, the
 * faction's capital and territory on the right six, and a neutral row
 * under both, with Forest, Mountains, a Mine, resources, Farms, a Road and
 * units of both sides. `overviewScene()` is an eight-seat match with every
 * capital's territory widened to three cells.
 */
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type TileStateV7,
} from "../../../src/engine/index";

function setup(factions: readonly FactionIdV7[], size: 16 | 25): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 31,
    width: size,
    height: size,
    aiCount: factions.length - 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions,
    mapType: "DRY_LAND",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  };
}

function start(factions: readonly FactionIdV7[], size: 16 | 25): GameStateV7 {
  const created = createPlayableGameV7(setup(factions, size));
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

/**
 * `.` Grass, `T` Forest, `G` Forest with Game, `M` Mountain, `O` Mountain
 * with Ore, `X` a Mine, `f` a Farm, `r` Fruit, `R` a Road, `C` the Human
 * capital, `K` the faction's capital, `u` a Human unit, `U` a faction unit,
 * `V` a faction unit on a Mountain, `W` a faction unit in Forest.
 */
const BORDER_SCENE = [
  "..TT.TTT..MM",
  ".f.T..Gr.fMV",
  "..r...T.U.OT",
  "MC.RRRRRRK.T",
  "MX.u..r.f...",
  ".f..rTTW.MM.",
  "..T...T.r..T",
] as const;
const ORIGIN = { x: 2, y: 4 } as const;
const COLUMNS = BORDER_SCENE[0].length;
const ROWS = BORDER_SCENE.length;

function reveal(state: GameStateV7, cells: readonly CoordV7[]): GameStateV7 {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, explored: cells }
        : player,
    ),
  };
}

export function borderScene(faction: FactionIdV7): GameStateV7 {
  const state = start(["ORIGINAL", faction], 16);
  const human = state.cities.find(
    (city) => city.ownerId === state.humanPlayerId,
  );
  const other = state.cities.find(
    (city) => city.ownerId !== state.humanPlayerId,
  );
  if (human === undefined || other === undefined) throw new Error("no cities");
  const mark = (at: CoordV7): string | undefined =>
    BORDER_SCENE[at.y - ORIGIN.y]?.[at.x - ORIGIN.x];
  const find = (wanted: string): CoordV7 => {
    for (let y = 0; y < ROWS; y += 1)
      for (let x = 0; x < COLUMNS; x += 1)
        if (BORDER_SCENE[y]?.[x] === wanted)
          return { x: ORIGIN.x + x, y: ORIGIN.y + y };
    throw new Error(`no ${wanted} in the scene`);
  };
  const humanAt = find("C");
  const otherAt = find("K");
  const tiles = state.board.tiles.map((tile): TileStateV7 => {
    const code = mark(tile.at);
    if (code === undefined)
      return { ...tile, site: null, territoryCityId: null };
    const column = tile.at.x - ORIGIN.x;
    const row = tile.at.y - ORIGIN.y;
    return {
      ...tile,
      biome: tile.biome ?? "PLAINS",
      terrain:
        code === "T" || code === "G" || code === "W"
          ? "FOREST"
          : code === "M" || code === "O" || code === "X" || code === "V"
            ? "MOUNTAIN"
            : "GRASS",
      resource:
        code === "r"
          ? "FRUIT"
          : code === "G"
            ? "GAME"
            : code === "O" || code === "X"
              ? "ORE"
              : code === "f"
                ? "FERTILE_GROUND"
                : null,
      improvement: code === "f" ? "FARM" : code === "X" ? "MINE" : null,
      road: code === "R",
      fieldDefense: false,
      site: code === "C" || code === "K" ? "CAPITAL" : null,
      territoryCityId:
        row === ROWS - 1 ? null : column < COLUMNS / 2 ? human.id : other.id,
    };
  });
  const humanUnit = state.units.find(
    (unit) => unit.ownerId === state.humanPlayerId,
  );
  const otherUnit = state.units.find(
    (unit) => unit.ownerId !== state.humanPlayerId,
  );
  if (humanUnit === undefined || otherUnit === undefined)
    throw new Error("no units");
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  const units = tiles.flatMap((tile) => {
    const code = mark(tile.at);
    const template =
      code === "u"
        ? humanUnit
        : code === "U" || code === "V" || code === "W"
          ? otherUnit
          : null;
    return template === null
      ? []
      : [
          {
            ...template,
            id: nextId++ as typeof template.id,
            at: tile.at,
          },
        ];
  });
  return reveal(
    {
      ...state,
      units,
      cities: state.cities.map((city) =>
        city.id === human.id
          ? { ...city, at: humanAt }
          : city.id === other.id
            ? { ...city, at: otherAt }
            : city,
      ),
      board: { ...state.board, tiles },
    },
    tiles.filter((tile) => mark(tile.at) !== undefined).map((tile) => tile.at),
  );
}

export const sceneUndead = (): GameStateV7 => borderScene("UNDEAD");
export const sceneGoblin = (): GameStateV7 => borderScene("GOBLIN");
export const sceneDinosaur = (): GameStateV7 => borderScene("DINOSAUR");
export const sceneMartian = (): GameStateV7 => borderScene("MARTIAN");
export const sceneIceFolk = (): GameStateV7 => borderScene("ICE_FOLK");
export const sceneDwarf = (): GameStateV7 => borderScene("DWARF");
export const sceneCandy = (): GameStateV7 => borderScene("CANDY");

/** All eight factions, every capital's territory three cells deep. */
export function overviewScene(): GameStateV7 {
  const state = start(
    [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ],
    25,
  );
  const tiles = state.board.tiles.map((tile): TileStateV7 => {
    if (tile.biome === null) return tile;
    let best: { id: (typeof state.cities)[number]["id"]; d: number } | null =
      null;
    for (const city of state.cities) {
      const d = Math.max(
        Math.abs(city.at.x - tile.at.x),
        Math.abs(city.at.y - tile.at.y),
      );
      if (d <= 3 && (best === null || d < best.d)) best = { id: city.id, d };
    }
    return best === null ? tile : { ...tile, territoryCityId: best.id };
  });
  return reveal(
    { ...state, board: { ...state.board, tiles } },
    tiles.map((tile) => tile.at),
  );
}
