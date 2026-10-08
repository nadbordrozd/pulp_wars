/**
 * Game states for the review of the tundra forest, the warmer candy grove
 * and the per-faction Lumber Camps and Sawmills (bead pulp_wars-2yc.38,
 * docs/art/FACTION_BUILDINGS.md section 12). Loaded in the browser through
 * the Vite dev server by scripts/art/look-switch-review.ts; nothing here is
 * part of the game build.
 *
 *   npx vite --port 6597 --strictPort &
 *   CHROME_PATH=... SWITCH_GAME_URL=http://localhost:6597/ \
 *     npx tsx scripts/art/look-switch-review.ts \
 *     scripts/art/faction-buildings/forest-building-scenes.ts <out-dir>
 *
 * Each scene is the border scene of the faction grass review (the Human
 * capital and territory on the left, the faction's on the right) with a
 * wood in each territory, a Lumber Camp and a Sawmill on Forest in both,
 * and the faction's units standing in the wood and beside it. "Before" is
 * the game with `?faction-forests=0`.
 */
import type {
  CoordV7,
  GameStateV7,
  FactionIdV7,
  ImprovementIdV7,
} from "../../../src/engine/index";
import { borderScene } from "../faction-grass/review-scenes";
import type { LookSwitchShot } from "../look-switch-review";
import { terrainFogScene } from "../terrain-fog/review-scenes";

/** The scene's window starts here (faction-grass/review-scenes.ts). */
const ORIGIN = { x: 2, y: 4 } as const;

/**
 * Over the border scene: `T` more Forest, `L` a Lumber Camp on Forest, `S`
 * a Sawmill on Forest, `W` a faction unit in Forest, `U` a faction unit on
 * open ground, `.` as the border scene has it.
 */
const OVERLAY = [
  "..TTTTTTTT..",
  ".....T..TT..",
  "TL......U.TW",
  "T.........TT",
  "TS.....UTLTT",
  "TT......TTST",
  "........WTTT",
] as const;

function overlaid(
  state: GameStateV7,
  overlay: readonly string[] = OVERLAY,
): GameStateV7 {
  const code = (at: CoordV7): string =>
    overlay[at.y - ORIGIN.y]?.[at.x - ORIGIN.x] ?? ".";
  const template = state.units.find(
    (unit) => unit.ownerId !== state.humanPlayerId,
  );
  if (template === undefined) throw new Error("no faction unit");
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  const tiles = state.board.tiles.map((tile) => {
    const mark = code(tile.at);
    if (mark === "." || tile.site !== null) return tile;
    const improvement: ImprovementIdV7 | null =
      mark === "L" ? "LUMBER_CAMP" : mark === "S" ? "SAWMILL" : null;
    return mark === "U"
      ? {
          ...tile,
          terrain: "GRASS" as const,
          resource: null,
          improvement: null,
        }
      : {
          ...tile,
          terrain: "FOREST" as const,
          resource: null,
          road: false,
          improvement,
        };
  });
  const cleared = new Set(
    tiles
      .filter((tile) => code(tile.at) !== ".")
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  return {
    ...state,
    board: { ...state.board, tiles },
    units: [
      ...state.units.filter(
        (unit) => !cleared.has(`${unit.at.x},${unit.at.y}`),
      ),
      ...tiles
        .filter((tile) => code(tile.at) === "W" || code(tile.at) === "U")
        .map((tile) => ({
          ...template,
          id: nextId++ as typeof template.id,
          at: tile.at,
        })),
    ],
  };
}

const scene = (faction: FactionIdV7) => (): GameStateV7 =>
  overlaid(borderScene(faction));

export const sceneUndead = scene("UNDEAD");
export const sceneGoblin = scene("GOBLIN");
export const sceneDinosaur = scene("DINOSAUR");
export const sceneMartian = scene("MARTIAN");
export const sceneIceFolk = scene("ICE_FOLK");
export const sceneDwarf = scene("DWARF");
export const sceneCandy = scene("CANDY");

/**
 * Stage 2 of the bead: the border scene with a strip of Shallow Water down
 * the outer edge of each territory. `~` water, `P` a Port and `Y` a
 * Shipyard on water, `F` a Forge and `K` a Workshop on Grass, `T` Forest,
 * `U` a faction unit, `.` as the border scene has it.
 */
const TRADE_OVERLAY = [
  "~....TT....~",
  "P..F....F..P",
  "~..K....K..~",
  "Y..........Y",
  "~......U...~",
  "~....TT....~",
  "~..........~",
] as const;

function traded(state: GameStateV7): GameStateV7 {
  const code = (at: CoordV7): string =>
    TRADE_OVERLAY[at.y - ORIGIN.y]?.[at.x - ORIGIN.x] ?? ".";
  const template = state.units.find(
    (unit) => unit.ownerId !== state.humanPlayerId,
  );
  if (template === undefined) throw new Error("no faction unit");
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  const improvements: Readonly<Record<string, ImprovementIdV7>> = {
    P: "PORT",
    Y: "SHIPYARD",
    F: "FORGE",
    K: "WORKSHOP",
  };
  const tiles = state.board.tiles.map((tile) => {
    const mark = code(tile.at);
    if (mark === "." || tile.site !== null) return tile;
    const water = mark === "~" || mark === "P" || mark === "Y";
    return {
      ...tile,
      terrain: water
        ? ("SHALLOW_WATER" as const)
        : mark === "T"
          ? ("FOREST" as const)
          : ("GRASS" as const),
      resource: null,
      road: false,
      improvement: improvements[mark] ?? null,
    };
  });
  const cleared = new Set(
    tiles
      .filter((tile) => code(tile.at) !== ".")
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  return {
    ...state,
    board: { ...state.board, tiles },
    units: [
      ...state.units.filter(
        (unit) => !cleared.has(`${unit.at.x},${unit.at.y}`),
      ),
      ...tiles
        .filter((tile) => code(tile.at) === "U")
        .map((tile) => ({
          ...template,
          id: nextId++ as typeof template.id,
          at: tile.at,
        })),
    ],
  };
}

const trade = (faction: FactionIdV7) => (): GameStateV7 =>
  traded(borderScene(faction));

export const tradeUndead = trade("UNDEAD");
export const tradeGoblin = trade("GOBLIN");
export const tradeDinosaur = trade("DINOSAUR");
export const tradeMartian = trade("MARTIAN");
export const tradeIceFolk = trade("ICE_FOLK");
export const tradeDwarf = trade("DWARF");
export const tradeCandy = trade("CANDY");

/**
 * The Ice Folk scene with the two east columns and the bottom row of its
 * window unexplored, so the tundra wood of the Ice Folk territory runs into
 * the fog: its pieces are packed with the cells behind the cloud and drawn
 * only over explored ones (docs/art/TERRAIN_AT_THE_FOG.md).
 */
export function sceneIceFolkFog(): GameStateV7 {
  const state = sceneIceFolk();
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? {
            ...player,
            explored: player.explored.filter(
              (at) =>
                at.x - ORIGIN.x <= 10 &&
                at.y - ORIGIN.y <= 5 &&
                !(at.x - ORIGIN.x === 10 && at.y - ORIGIN.y >= 4),
            ),
          }
        : player,
    ),
  };
}

/**
 * The wood of the terrain-and-fog review (scripts/art/terrain-fog/
 * review-scenes.ts: a map the match's own setup makes, so the board has its
 * skeleton and packs the wood with its ghosts) held by an Ice Folk city:
 * whole, and with only the columns from x 5 on explored. The explored cells
 * of the second draw the pieces they draw in the first.
 */
export const sceneTundraWood = (): GameStateV7 =>
  terrainFogScene({ other: "ICE_FOLK", widened: true, owner: 1 });
export const sceneTundraWoodCut = (): GameStateV7 =>
  terrainFogScene({
    other: "ICE_FOLK",
    widened: true,
    owner: 1,
    cut: { west: 5 },
  });

export const SWITCH_PARAMETER = "faction-forests";

const CROP = [240, 200, 960, 590] as const;
/** The faction's wood with its Lumber Camp and Sawmill, shown again at 3x. */
const ZOOM = [880, 500, 320, 260] as const;
/** The faction's Forge, Workshop, Port and Shipyard, shown again at 3x. */
const TRADE_ZOOM = [820, 240, 380, 280] as const;
const shot = (name: string, sceneName: string): LookSwitchShot => ({
  name,
  scene: sceneName,
  zoomIn: 1,
  crop: CROP,
  zoom: ZOOM,
});

export const REVIEW_SHOTS: readonly LookSwitchShot[] = [
  shot("ice-folk", "sceneIceFolk"),
  // The wood at the fog's edge, shown again at 3x.
  { ...shot("ice-folk-fog", "sceneIceFolkFog"), zoom: [880, 400, 320, 260] },
  // The same camera for both, so the two can be laid over each other.
  { name: "tundra-wood", scene: "sceneTundraWood", zoomIn: 1 },
  { name: "tundra-wood-cut", scene: "sceneTundraWoodCut", zoomIn: 1 },
  shot("candy", "sceneCandy"),
  shot("undead", "sceneUndead"),
  shot("goblin", "sceneGoblin"),
  shot("dinosaur", "sceneDinosaur"),
  shot("martian", "sceneMartian"),
  shot("dwarf", "sceneDwarf"),
  // Stage 2: a Forge, a Workshop, a Port and a Shipyard in both territories.
  ...(
    [
      ["undead", "tradeUndead"],
      ["goblin", "tradeGoblin"],
      ["dinosaur", "tradeDinosaur"],
      ["martian", "tradeMartian"],
      ["ice-folk", "tradeIceFolk"],
      ["dwarf", "tradeDwarf"],
      ["candy", "tradeCandy"],
    ] as const
  ).map(([name, sceneName]): LookSwitchShot => ({
    name: `trade-${name}`,
    scene: sceneName,
    zoomIn: 1,
    crop: CROP,
    zoom: TRADE_ZOOM,
  })),
];
