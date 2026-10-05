/**
 * Game states for the composed-forest review (bead pulp_wars-maw.3,
 * docs/art/COMPOSED_FORESTS.md). Each scene is a real generated Dry Land
 * match (createPlayableGameV7) at turn 1. Scene A is the untouched start;
 * scenes B to D reveal a window of the map to the human seat, and scene C
 * also places improvements and copies a unit into Forest, so later-game
 * situations can be captured without playing a match. Loaded in the browser
 * through the Vite dev server by scripts/art/chibi-forest-review.ts; nothing
 * here is part of the game build.
 */
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type ImprovementIdV7,
  type MatchSetupV7,
} from "../../../src/engine/index";

export function forestSetupV7(
  seed: number,
  human: FactionIdV7 = "ORIGINAL",
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width: 16,
    height: 16,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [human, "GOBLIN"],
    mapType: "DRY_LAND",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: true,
  };
}

export function startStateV7(
  seed: number,
  human: FactionIdV7 = "ORIGINAL",
): GameStateV7 {
  const created = createPlayableGameV7(forestSetupV7(seed, human));
  if (!created.ok) throw new Error(`seed ${seed}: ${created.error.code}`);
  return created.state;
}

interface Window {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** The same state with a window of cells (default: all) explored. */
export function revealedV7(state: GameStateV7, window?: Window): GameStateV7 {
  const cells = state.board.tiles
    .map((tile) => tile.at)
    .filter(
      (at) =>
        window === undefined ||
        // A seat always sees its own cities.
        state.cities.some(
          (city) =>
            city.ownerId === state.humanPlayerId &&
            city.at.x === at.x &&
            city.at.y === at.y,
        ) ||
        (at.x >= window.x0 &&
          at.x <= window.x1 &&
          at.y >= window.y0 &&
          at.y <= window.y1),
    );
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === state.humanPlayerId
        ? { ...player, explored: cells }
        : player,
    ),
  };
}

const same = (a: CoordV7, b: CoordV7): boolean => a.x === b.x && a.y === b.y;

export function humanCapitalV7(state: GameStateV7): CoordV7 {
  const city = state.cities.find(
    (item) => item.ownerId === state.humanPlayerId,
  );
  if (city === undefined) throw new Error("no human city");
  return city.at;
}

/**
 * Scene C: the human capital's surroundings with improvements on and next
 * to Forest and copies of the starting unit standing in Forest.
 */
export function developedV7(state: GameStateV7): GameStateV7 {
  const capital = humanCapitalV7(state);
  const city = state.cities.find((item) => same(item.at, capital));
  const near = (tile: { at: CoordV7 }): number =>
    Math.max(Math.abs(tile.at.x - capital.x), Math.abs(tile.at.y - capital.y));
  const mine = state.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city?.id &&
        tile.site === null &&
        tile.improvement === null,
    )
    .sort((a, b) => near(a) - near(b) || a.at.y - b.at.y || a.at.x - b.at.x);
  const forest = mine.filter((tile) => tile.terrain === "FOREST");
  const grass = mine.filter((tile) => tile.terrain === "GRASS");
  const placed = new Map<string, ImprovementIdV7>();
  const key = (at: CoordV7): string => `${at.x},${at.y}`;
  const [camp] = forest;
  if (camp !== undefined) placed.set(key(camp.at), "LUMBER_CAMP");
  const [farm, sawmill, market] = grass;
  if (farm !== undefined) placed.set(key(farm.at), "FARM");
  if (sawmill !== undefined) placed.set(key(sawmill.at), "SAWMILL");
  if (market !== undefined) placed.set(key(market.at), "MARKET");
  const standing = state.board.tiles
    .filter(
      (tile) =>
        tile.terrain === "FOREST" &&
        tile.site === null &&
        !placed.has(key(tile.at)) &&
        near(tile) >= 1 &&
        near(tile) <= 3,
    )
    .sort((a, b) => near(a) - near(b) || a.at.y - b.at.y || a.at.x - b.at.x);
  const template = state.units.find(
    (unit) => unit.ownerId === state.humanPlayerId,
  );
  const spots = [standing[0], standing[5], standing[9], standing[14]].filter(
    (tile) => tile !== undefined,
  );
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  const units =
    template === undefined
      ? state.units
      : [
          ...state.units.filter((unit) => unit.id !== template.id),
          ...spots.map((tile, index) => ({
            ...template,
            id: (index === 0 ? template.id : nextId++) as typeof template.id,
            at: tile.at,
          })),
        ];
  return {
    ...state,
    units,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) => {
        const improvement = placed.get(key(tile.at));
        return improvement === undefined ? tile : { ...tile, improvement };
      }),
    },
  };
}

/**
 * Seeds chosen by forest-review-seed-search.ts: seed 75 has the most Forest
 * around the human capital (2, 2) and Mountains beside it; seed 66 has the
 * most Forest of the first 80 seeds.
 */
export const FOREST_SCENE_SEEDS_V7 = { a: 75, b: 75, c: 75, d: 66 };

/** A: the untouched start area (fog around a 5 x 5 explored patch). */
export const sceneA = (): GameStateV7 => startStateV7(FOREST_SCENE_SEEDS_V7.a);
/** B: Forest against Mountains, a 12 x 9 explored window. */
export const sceneB = (): GameStateV7 =>
  revealedV7(startStateV7(FOREST_SCENE_SEEDS_V7.b), {
    x0: 0,
    y0: 2,
    x1: 11,
    y1: 10,
  });
/** C: the capital with improvements and units in Forest. */
export const sceneC = (): GameStateV7 =>
  developedV7(
    revealedV7(startStateV7(FOREST_SCENE_SEEDS_V7.c), {
      x0: 0,
      y0: 0,
      x1: 8,
      y1: 5,
    }),
  );
/** D: the whole map of the most forested seed. */
export const sceneD = (): GameStateV7 =>
  revealedV7(startStateV7(FOREST_SCENE_SEEDS_V7.d));

/** A window of `radius` cells around the human capital. */
function aroundCapital(state: GameStateV7, radius: number): GameStateV7 {
  const capital = humanCapitalV7(state);
  return revealedV7(state, {
    x0: capital.x - radius,
    y0: capital.y - radius,
    x1: capital.x + radius + 2,
    y1: capital.y + radius,
  });
}

/** E: an Ice Folk capital, for Snow under and on the trees. */
export const sceneE = (): GameStateV7 =>
  aroundCapital(startStateV7(FOREST_SCENE_SEEDS_V7.a, "ICE_FOLK"), 3);
/** F: an Undead capital, for the gloam territory ground under the trees. */
export const sceneF = (): GameStateV7 =>
  aroundCapital(startStateV7(FOREST_SCENE_SEEDS_V7.a, "UNDEAD"), 3);

// ----------------------------------------- mountain ranges (pulp_wars-e9f)

/**
 * The human capital's surroundings with Mines on two Mountains of its
 * territory and copies of the starting unit standing on Mountains.
 */
export function minedV7(state: GameStateV7): GameStateV7 {
  const capital = humanCapitalV7(state);
  const city = state.cities.find((item) => same(item.at, capital));
  const near = (tile: { at: CoordV7 }): number =>
    Math.max(Math.abs(tile.at.x - capital.x), Math.abs(tile.at.y - capital.y));
  const order = (a: { at: CoordV7 }, b: { at: CoordV7 }): number =>
    near(a) - near(b) || a.at.y - b.at.y || a.at.x - b.at.x;
  const mountains = state.board.tiles
    .filter((tile) => tile.terrain === "MOUNTAIN" && tile.site === null)
    .sort(order);
  const mines = new Set(
    mountains
      .filter((tile) => tile.territoryCityId === city?.id)
      .slice(0, 2)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  const standing = mountains.filter(
    (tile) => !mines.has(`${tile.at.x},${tile.at.y}`),
  );
  const template = state.units.find(
    (unit) => unit.ownerId === state.humanPlayerId,
  );
  const spots = [standing[1], standing[4], standing[8]].filter(
    (tile) => tile !== undefined,
  );
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  return {
    ...state,
    units:
      template === undefined
        ? state.units
        : [
            ...state.units,
            ...spots.map((tile) => ({
              ...template,
              id: nextId++ as typeof template.id,
              at: tile.at,
            })),
          ],
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        mines.has(`${tile.at.x},${tile.at.y}`)
          ? { ...tile, improvement: "MINE" as const }
          : tile,
      ),
    },
  };
}

/**
 * Seeds for the mountain scenes, on map revision V4 (picked again with
 * mountain-review-seed-search.ts over seeds 1 to 150 for bead
 * pulp_wars-2o7.1; the V3 seeds 96 and 189 lost their Mountains): seed 78
 * has the densest 12 x 8 window of Mountains (54 cells, at 0,3); seed 31 has
 * the most Mountains around the human capital (18 within two cells).
 */
export const MOUNTAIN_SCENE_SEEDS_V7 = { heavy: 78, capital: 31 };

/** M1: a mountain-heavy 12 x 8 window. */
export const sceneM1 = (): GameStateV7 =>
  revealedV7(startStateV7(MOUNTAIN_SCENE_SEEDS_V7.heavy), {
    x0: 0,
    y0: 3,
    x1: 11,
    y1: 10,
  });
/** M2: Forest against Mountains (scene B). */
export const sceneM2 = sceneB;
/** M3: a capital among Mountains, with Mines and units on Mountains. */
export const sceneM3 = (): GameStateV7 =>
  aroundCapital(minedV7(startStateV7(MOUNTAIN_SCENE_SEEDS_V7.capital)), 3);
/** M4: the whole map of the most mountainous seed. */
export const sceneM4 = (): GameStateV7 =>
  revealedV7(startStateV7(MOUNTAIN_SCENE_SEEDS_V7.heavy));
/** M5: an Ice Folk capital among Mountains, for Snow. */
export const sceneM5 = (): GameStateV7 =>
  aroundCapital(startStateV7(MOUNTAIN_SCENE_SEEDS_V7.capital, "ICE_FOLK"), 3);

// ------------------------------ mountains as massifs (pulp_wars-2o7.1)

/**
 * M6: drawn blocks of Mountains on open Grass, the shapes the user named:
 * a block two cells wide and three deep, a block three wide and two deep, a
 * column, a row and a single mountain, with copies of the starting unit
 * north of a block, on one and south of one. The 9 x 7 window is the one
 * farthest from the two capitals that holds no city; a village in it
 * keeps its cell.
 */
const BLOCK_SCENE_V7 = [
  ".........",
  ".MM..MMM.",
  ".MM..MMM.",
  ".MM......",
  "....M.MMM",
  ".M..M....",
  "....M....",
] as const;
const BLOCK_SCENE_UNITS_V7: readonly (readonly [number, number])[] = [
  [1, 0],
  [2, 2],
  [6, 3],
  [3, 2],
];

export const sceneM6 = (): GameStateV7 => {
  const state = startStateV7(MOUNTAIN_SCENE_SEEDS_V7.capital);
  const columns = BLOCK_SCENE_V7[0].length;
  const rows = BLOCK_SCENE_V7.length;
  const inWindow = (at: CoordV7, x0: number, y0: number): boolean =>
    at.x >= x0 && at.x < x0 + columns && at.y >= y0 && at.y < y0 + rows;
  let best: { x0: number; y0: number; score: number } | null = null;
  for (let y0 = 0; y0 + rows <= state.board.height; y0 += 1)
    for (let x0 = 0; x0 + columns <= state.board.width; x0 += 1) {
      if (
        state.cities.some((city) => inWindow(city.at, x0, y0)) ||
        state.units.some((unit) => inWindow(unit.at, x0, y0))
      )
        continue;
      const score = Math.min(
        ...state.cities.map(
          (city) =>
            Math.abs(city.at.x - (x0 + columns / 2)) +
            Math.abs(city.at.y - (y0 + rows / 2)),
        ),
      );
      if (best === null || score > best.score) best = { x0, y0, score };
    }
  if (best === null) throw new Error("no free window for the block scene");
  const { x0, y0 } = best;
  const template = state.units.find(
    (unit) => unit.ownerId === state.humanPlayerId,
  );
  let nextId = Math.max(...state.units.map((unit) => Number(unit.id))) + 1;
  return revealedV7(
    {
      ...state,
      units:
        template === undefined
          ? state.units
          : [
              ...state.units,
              ...BLOCK_SCENE_UNITS_V7.map(([x, y]) => ({
                ...template,
                id: nextId++ as typeof template.id,
                at: { x: x0 + x, y: y0 + y },
              })),
            ],
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          inWindow(tile.at, x0, y0) && tile.site === null
            ? {
                ...tile,
                terrain:
                  BLOCK_SCENE_V7[tile.at.y - y0]?.[tile.at.x - x0] === "M"
                    ? ("MOUNTAIN" as const)
                    : ("GRASS" as const),
                resource: null,
                improvement: null,
                road: false,
              }
            : tile,
        ),
      },
    },
    { x0, y0, x1: x0 + columns - 1, y1: y0 + rows - 1 },
  );
};
