/**
 * Game states for the board review of the Cult, Undead and Dwarf grounds
 * (bead pulp_wars-2yc.48, docs/art/FACTION_GRASS.md). Loaded in the browser
 * through the Vite dev server by scripts/art/look-switch-review.ts; nothing
 * here is part of the game build.
 *
 *   npx vite --host localhost --port 6593 --strictPort &
 *   CHROME_PATH=... SWITCH_GAME_URL=http://localhost:6593/ \
 *     SWITCH_BEFORE_URL=http://localhost:6594/ \
 *     npx tsx scripts/art/look-switch-review.ts \
 *     scripts/art/faction-grounds/review-scenes.ts <out-dir>
 *
 * "Before" is a second server: a checkout of the commit before the change
 * with this file copied to the same path. With one server both sides are
 * the same picture.
 *
 * A scene is a drawn 16 x 9 window of a generated three-seat match. The
 * reviewed faction is the player's own, so one of its units can be
 * selected and the board shows its move and attack highlights on the
 * ground: Human territory on the left four columns, the faction's on the
 * middle eight (eight rows of them), another faction's on the right four,
 * a neutral row under all, and unexplored land round it. The faction's land
 * holds its capital, a wood, Mountains, Fruit, Game, Ore and a Farm, a Road
 * from the Human capital, three units of its own and a Human unit beside
 * one of them.
 */
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type TileStateV7,
  type UnitRoleIdV7,
} from "../../../src/engine/index";
import type { LookSwitchShot } from "../look-switch-review";

/**
 * `.` Grass, `T` Forest, `G` Forest with Game, `M` Mountain, `O` Mountain
 * with Ore, `r` Fruit, `f` a Farm, `=` a Road, `C` the Human capital, `K`
 * the faction's, `D` the neighbour's, `u` a Human unit, `z` a neighbour's
 * unit, `1` to `3` a unit of the faction (Fighter, Marksman, Guard), `e` a
 * Human unit inside the faction's land, beside unit `1`.
 */
const SCENE = [
  "T..MTT..r.MM..T.",
  ".f..TTG....M.T..",
  "..u..T..2.r.z...",
  "MC======K.3...D.",
  "......1e..f.....",
  ".T..r..TT..O.T.z",
  ".....3.TG..M....",
  "................",
  "................",
] as const;
const ORIGIN = { x: 0, y: 4 } as const;
const COLUMNS = SCENE[0].length;
const ROWS = SCENE.length;

const ROLE: Readonly<Record<string, UnitRoleIdV7>> = {
  "1": "FIGHTER",
  "2": "MARKSMAN",
  "3": "GUARD",
};

export function groundScene(
  faction: FactionIdV7,
  neighbour: FactionIdV7,
): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 31,
    width: 16,
    height: 16,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [faction, "ORIGINAL", neighbour],
    mapType: "DRY_LAND",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  const state = created.state;
  const seat = (wanted: FactionIdV7) => {
    const player = state.players.find((item) => item.faction === wanted);
    const city = state.cities.find((item) => item.ownerId === player?.id);
    const unit = state.units.find((item) => item.ownerId === player?.id);
    if (player === undefined || city === undefined || unit === undefined)
      throw new Error(`no ${wanted} seat`);
    return { player, city, unit };
  };
  const own = seat(faction);
  const human = seat("ORIGINAL");
  const other = seat(neighbour);
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
      terrain:
        code === "T" || code === "G"
          ? "FOREST"
          : code === "M" || code === "O"
            ? "MOUNTAIN"
            : "GRASS",
      resource:
        code === "r"
          ? "FRUIT"
          : code === "G"
            ? "GAME"
            : code === "O"
              ? "ORE"
              : code === "f"
                ? "FERTILE_GROUND"
                : null,
      improvement: code === "f" ? "FARM" : null,
      road: code === "=",
      fieldDefense: false,
      site: code === "C" || code === "K" || code === "D" ? "CAPITAL" : null,
      territoryCityId:
        row === ROWS - 1
          ? null
          : column < 4
            ? human.city.id
            : column < 12
              ? own.city.id
              : other.city.id,
    };
  });
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  const units = tiles.flatMap((tile) => {
    const code = mark(tile.at) ?? ".";
    const role = ROLE[code];
    const template =
      code === "u" || code === "e"
        ? human.unit
        : code === "z"
          ? other.unit
          : role !== undefined
            ? { ...own.unit, role }
            : null;
    return template === null
      ? []
      : [{ ...template, id: nextId++ as typeof template.id, at: tile.at }];
  });
  return {
    ...state,
    // The player's own turn, wherever the match's turn order put the seat:
    // the selected unit then shows its moves and its target.
    activeSeatIndex: Math.max(0, state.turnOrder.indexOf(state.humanPlayerId)),
    units,
    cities: state.cities.map((city) =>
      city.id === human.city.id
        ? { ...city, at: find("C") }
        : city.id === own.city.id
          ? { ...city, at: find("K"), level: 2 }
          : city.id === other.city.id
            ? { ...city, at: find("D") }
            : city,
    ),
    board: { ...state.board, tiles },
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

export const sceneCultGround = (): GameStateV7 => groundScene("CULT", "UNDEAD");
export const sceneUndeadGround = (): GameStateV7 =>
  groundScene("UNDEAD", "DWARF");
export const sceneDwarfGround = (): GameStateV7 => groundScene("DWARF", "CULT");
export const sceneCandyGround = (): GameStateV7 =>
  groundScene("CANDY", "GOBLIN");
export const sceneGoblinGround = (): GameStateV7 =>
  groundScene("GOBLIN", "CANDY");
export const sceneMartianGround = (): GameStateV7 =>
  groundScene("MARTIAN", "DWARF");

/**
 * The whole 16 x 16 map as one faction's explored Grass: the field the
 * draw-time measure of the textured grounds redraws
 * (scripts/art/textured-grounds/draw-timing.ts).
 */
export function fieldScene(faction: FactionIdV7): GameStateV7 {
  const state = groundScene(faction, faction === "DWARF" ? "CULT" : "DWARF");
  const own = state.cities.find((city) => city.ownerId === state.humanPlayerId);
  if (own === undefined) throw new Error("no city");
  const tiles = state.board.tiles.map((tile): TileStateV7 => ({
    ...tile,
    biome: tile.biome ?? "PLAINS",
    terrain: "GRASS",
    resource: null,
    improvement: null,
    road: false,
    fieldDefense: false,
    site: tile.at.x === own.at.x && tile.at.y === own.at.y ? "CAPITAL" : null,
    territoryCityId: own.id,
  }));
  return {
    ...state,
    units: state.units.filter((unit) => unit.ownerId === state.humanPlayerId),
    cities: state.cities.filter((city) => city.id === own.id),
    board: { ...state.board, tiles },
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, explored: tiles.map((tile) => tile.at) }
        : player,
    ),
  };
}
export const sceneMartianField = (): GameStateV7 => fieldScene("MARTIAN");
export const sceneDwarfField = (): GameStateV7 => fieldScene("DWARF");

/** No switch: "before" is another server (SWITCH_BEFORE_URL). */
export const SWITCH_PARAMETER = "faction-grounds-review";

const PHONE = [390, 844] as const;
/** Where unit `1` stands on the 1440 x 900 page, one zoom step in. */
const SELECT = [600, 500] as const;

const GROUND_SHOTS: readonly LookSwitchShot[] = (
  [
    ["cult", "sceneCultGround"],
    ["undead", "sceneUndeadGround"],
    ["dwarf", "sceneDwarfGround"],
    ["candy", "sceneCandyGround"],
    ["goblin", "sceneGoblinGround"],
    ["martian", "sceneMartianGround"],
  ] as const
).flatMap(([name, scene]): LookSwitchShot[] => [
  // The whole scene at the board's default zoom, and its middle at 3x.
  { name: `${name}-desktop`, scene, zoomIn: 0, zoom: [520, 300, 400, 260] },
  // One step in, a unit of the faction selected: its moves and its target.
  {
    name: `${name}-selected`,
    scene,
    zoomIn: 1,
    click: SELECT,
    zoom: [520, 300, 400, 260],
  },
  { name: `${name}-phone`, scene, zoomIn: 0, size: PHONE },
]);

/**
 * A whole 16 x 16 map as one faction's land, on a page tall enough to show
 * it: whether a textured ground's period shows on a large territory.
 */
export const FIELD_SHOTS: readonly LookSwitchShot[] = (
  [
    ["martian", "sceneMartianField"],
    ["dwarf", "sceneDwarfField"],
  ] as const
).map(([name, scene]) => ({
  name: `${name}-field`,
  scene,
  zoomIn: 0 as const,
  size: [1440, 1500] as const,
}));

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  ...GROUND_SHOTS,
  ...FIELD_SHOTS,
];
