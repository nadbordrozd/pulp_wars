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
 * Seeds for the mountain scenes: seed 7 has the densest 12 x 8 window of
 * Mountains of the first 80 seeds (58 cells); seed 77 has the most
 * Mountains around the human capital (14 within two cells).
 */
export const MOUNTAIN_SCENE_SEEDS_V7 = { heavy: 7, capital: 77 };

/** M1: a mountain-heavy 12 x 8 window. */
export const sceneM1 = (): GameStateV7 =>
  revealedV7(startStateV7(MOUNTAIN_SCENE_SEEDS_V7.heavy), {
    x0: 4,
    y0: 2,
    x1: 15,
    y1: 9,
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
