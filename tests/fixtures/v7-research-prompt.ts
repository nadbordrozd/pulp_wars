import {
  viewForV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { replaceTileV7 } from "./v7-builders";
import { martianUiFieldV7 } from "./v7-martian-ui";

/**
 * The resource tiles of {@link researchPromptMatchV7}. The viewer's
 * territory is x 7-9, y 7-9 round its capital (8, 8); the opponent's is
 * x 1-3, y 7-9.
 */
export const RESEARCH_PROMPT_UI_V7 = {
  fruit: { x: 7, y: 7 },
  game: { x: 9, y: 7 },
  forest: { x: 7, y: 9 },
  fertile: { x: 9, y: 9 },
  grass: { x: 8, y: 7 },
  enemyFruit: { x: 2, y: 7 },
} as const satisfies Readonly<Record<string, CoordV7>>;

/**
 * A playable match for the research prompts (bead `pulp_wars-gl1`): the
 * two-seat Dry Land arena on the human's turn with a Fruit, a Game Forest,
 * a bare Forest and Fertile Ground in its territory and a Fruit in the
 * opponent's. The module imports no test runner, so the browser smoke
 * mounts it through the dev server.
 */
export function researchPromptMatchV7(
  options: {
    readonly viewer?: FactionIdV7;
    readonly researched?: readonly TechnologyIdV7[];
    readonly coins?: number;
  } = {},
): GameStateV7 {
  const viewer = options.viewer ?? "ORIGINAL";
  const at = RESEARCH_PROMPT_UI_V7;
  let state = martianUiFieldV7([], {
    factions: [viewer, viewer === "UNDEAD" ? "ORIGINAL" : "UNDEAD"],
    techs: { 0: options.researched ?? [], 1: [] },
    coins: options.coins ?? 20,
  });
  state = replaceTileV7(state, at.fruit, { resource: "FRUIT" });
  state = replaceTileV7(state, at.game, {
    terrain: "FOREST",
    resource: "GAME",
  });
  state = replaceTileV7(state, at.forest, { terrain: "FOREST" });
  state = replaceTileV7(state, at.fertile, { resource: "FERTILE_GROUND" });
  state = replaceTileV7(state, at.enemyFruit, { resource: "FRUIT" });
  return state;
}

/** The no-argument fixture the browser smoke mounts. */
export function researchPromptSmokeFixtureV7(): GameStateV7 {
  return researchPromptMatchV7();
}

/**
 * Research prompt fixtures (bead `pulp_wars-gl1`): the two-seat Dry Land
 * arena on the viewer's turn, with chosen technologies and Coins, and one
 * resource tile of each kind placed in the viewer's territory, plus a Fruit
 * in the opponent's territory, one on neutral land and one on a tile the
 * viewer has not explored. The resources are placed on the public view, so
 * they are shown whatever the viewer has researched.
 */
export type ResearchPromptTileV7 = Extract<
  PlayerViewV7["board"]["tiles"][number],
  { explored: true }
>;

export interface ResearchPromptFixtureV7 {
  readonly view: PlayerViewV7;
  readonly fruit: CoordV7;
  readonly fertile: CoordV7;
  readonly game: CoordV7;
  readonly forest: CoordV7;
  readonly ore: CoordV7;
  readonly fish: CoordV7;
  readonly grass: CoordV7;
  readonly enemyFruit: CoordV7;
  readonly neutralFruit: CoordV7;
  readonly unexploredFruit: CoordV7;
}

export function researchPromptFixtureV7(
  options: {
    readonly viewer?: FactionIdV7;
    readonly opponent?: FactionIdV7;
    readonly researched?: readonly TechnologyIdV7[];
    readonly coins?: number;
    readonly mapType?: PlayerViewV7["setup"]["mapType"];
  } = {},
): ResearchPromptFixtureV7 {
  const viewer = options.viewer ?? "ORIGINAL";
  const opponent =
    options.opponent ?? (viewer === "UNDEAD" ? "ORIGINAL" : "UNDEAD");
  const state = martianUiFieldV7([], {
    factions: [viewer, opponent],
    techs: { 0: options.researched ?? [], 1: [] },
    coins: options.coins ?? 20,
  });
  const live = viewForV7(state, state.humanPlayerId);
  const cityCells = new Set(
    live.cities.map((city) => `${city.at.x},${city.at.y}`),
  );
  const plain = (
    owner: (tile: ResearchPromptTileV7) => boolean,
  ): ResearchPromptTileV7[] =>
    live.board.tiles.filter(
      (tile): tile is ResearchPromptTileV7 =>
        tile.explored &&
        tile.biome !== null &&
        tile.site === null &&
        !cityCells.has(`${tile.at.x},${tile.at.y}`) &&
        owner(tile),
    );
  const own = plain((tile) => tile.territoryOwnerId === live.viewer.id);
  const [fruit, fertile, game, forest, ore, fish, grass] = own;
  const enemy = plain(
    (tile) =>
      tile.territoryOwnerId !== null &&
      tile.territoryOwnerId !== live.viewer.id,
  )[0];
  const [neutral, unexplored] = plain((tile) => tile.territoryOwnerId === null);
  if (
    fruit === undefined ||
    fertile === undefined ||
    game === undefined ||
    forest === undefined ||
    ore === undefined ||
    fish === undefined ||
    grass === undefined ||
    enemy === undefined ||
    neutral === undefined ||
    unexplored === undefined
  )
    throw new Error("the arena has too few free tiles");
  const same = (left: CoordV7, right: CoordV7): boolean =>
    left.x === right.x && left.y === right.y;
  const bare = {
    improvement: null,
    road: false,
    fieldDefense: false,
    resource: null,
  } as const;
  const patches: readonly [CoordV7, Partial<ResearchPromptTileV7>][] = [
    [fruit.at, { ...bare, terrain: "GRASS", resource: "FRUIT" }],
    [fertile.at, { ...bare, terrain: "GRASS", resource: "FERTILE_GROUND" }],
    [game.at, { ...bare, terrain: "FOREST", resource: "GAME" }],
    [forest.at, { ...bare, terrain: "FOREST" }],
    [ore.at, { ...bare, terrain: "MOUNTAIN", resource: "ORE" }],
    [
      fish.at,
      { ...bare, biome: null, terrain: "SHALLOW_WATER", resource: "FISH" },
    ],
    [grass.at, { ...bare, terrain: "GRASS" }],
    [enemy.at, { ...bare, terrain: "GRASS", resource: "FRUIT" }],
    [neutral.at, { ...bare, terrain: "GRASS", resource: "FRUIT" }],
  ];
  const view: PlayerViewV7 = {
    ...live,
    setup: { ...live.setup, mapType: options.mapType ?? live.setup.mapType },
    board: {
      ...live.board,
      tiles: live.board.tiles.map((tile) => {
        if (same(tile.at, unexplored.at))
          return { at: tile.at, explored: false as const };
        if (!tile.explored) return tile;
        const patch = patches.find(([at]) => same(at, tile.at));
        return patch === undefined ? tile : { ...tile, ...patch[1] };
      }),
    },
  };
  return {
    view,
    fruit: fruit.at,
    fertile: fertile.at,
    game: game.at,
    forest: forest.at,
    ore: ore.at,
    fish: fish.at,
    grass: grass.at,
    enemyFruit: enemy.at,
    neutralFruit: neutral.at,
    unexploredFruit: unexplored.at,
  };
}
