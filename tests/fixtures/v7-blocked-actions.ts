import type {
  CoordV7,
  FactionIdV7,
  GameStateV7,
  TechnologyIdV7,
} from "../../src/engine/index";
import { replaceTileV7 } from "./v7-builders";
import { martianUiFieldV7, type MartianUiPieceV7 } from "./v7-martian-ui";

/**
 * The tiles of {@link blockedActionsMatchV7}. The viewer's territory is
 * x 7-9, y 7-9 round its capital (8, 8); the opponent's is x 1-3, y 7-9;
 * (5, 6) is neutral land the viewer has explored.
 */
export const BLOCKED_ACTIONS_UI_V7 = {
  capital: { x: 8, y: 8 },
  fruit: { x: 7, y: 7 },
  game: { x: 9, y: 7 },
  forest: { x: 7, y: 9 },
  fertile: { x: 9, y: 9 },
  grass: { x: 8, y: 7 },
  unit: { x: 7, y: 8 },
  second: { x: 9, y: 8 },
  third: { x: 8, y: 9 },
  enemyFruit: { x: 2, y: 7 },
  neutralFruit: { x: 5, y: 6 },
} as const satisfies Readonly<Record<string, CoordV7>>;

const EXHAUSTED = {
  moved: true,
  attacked: true,
  attacksUsed: 1,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
} as const;

/**
 * A playable match for the blocked actions of the dock (bead
 * `pulp_wars-2yc.36`): the two-seat Dry Land arena on the human's turn
 * with a Fruit, a Game Forest, a bare Forest and Fertile Ground in its
 * territory, a Fruit in the opponent's and one on neutral land. The
 * viewer knows every technology unless `researched` says otherwise. The
 * module imports no test runner, so the browser smoke mounts it through
 * the dev server.
 */
export function blockedActionsMatchV7(
  options: {
    readonly viewer?: FactionIdV7;
    readonly researched?: readonly TechnologyIdV7[];
    readonly coins?: number;
    /** Own units homed to the capital, on `unit`, `second`, `third`. */
    readonly garrison?: 0 | 1 | 2 | 3;
    /** The unit on `unit` has nothing left to do this turn. */
    readonly exhausted?: boolean;
  } = {},
): GameStateV7 {
  const viewer = options.viewer ?? "ORIGINAL";
  const at = BLOCKED_ACTIONS_UI_V7;
  const posts = [at.unit, at.second, at.third].slice(0, options.garrison ?? 0);
  const pieces: MartianUiPieceV7[] = posts.map((post, index) => ({
    seat: 0,
    role: "FIGHTER",
    at: post,
    ...(index === 0 && options.exhausted === true
      ? { activation: EXHAUSTED }
      : {}),
  }));
  let state = martianUiFieldV7(pieces, {
    factions: [viewer, viewer === "UNDEAD" ? "ORIGINAL" : "UNDEAD"],
    ...(options.researched === undefined
      ? {}
      : { techs: { 0: options.researched, 1: [] } }),
    coins: options.coins ?? 20,
    homed: posts,
  });
  state = replaceTileV7(state, at.fruit, { resource: "FRUIT" });
  state = replaceTileV7(state, at.game, {
    terrain: "FOREST",
    resource: "GAME",
  });
  state = replaceTileV7(state, at.forest, { terrain: "FOREST" });
  state = replaceTileV7(state, at.fertile, { resource: "FERTILE_GROUND" });
  state = replaceTileV7(state, at.enemyFruit, { resource: "FRUIT" });
  state = replaceTileV7(state, at.neutralFruit, { resource: "FRUIT" });
  return state;
}

/** 1 Coin and the harvest technologies: every paid tile action is too dear. */
export const blockedPoorTileFixtureV7 = (): GameStateV7 =>
  blockedActionsMatchV7({
    coins: 1,
    researched: ["GATHERING", "FARMING", "HUNTING", "FORESTRY"],
  });

/** 3 Coins and every technology: the capital affords some units only. */
export const blockedPoorCityFixtureV7 = (): GameStateV7 =>
  blockedActionsMatchV7({ coins: 3 });

/** The same for a Goblin capital, which trains nine units. */
export const blockedGoblinCityFixtureV7 = (): GameStateV7 =>
  blockedActionsMatchV7({ viewer: "GOBLIN", coins: 3 });

/** The same for a Dinosaur capital: train cards and Lay Egg cards. */
export const blockedDinosaurCityFixtureV7 = (): GameStateV7 =>
  blockedActionsMatchV7({ viewer: "DINOSAUR", coins: 3 });

/** 1 Coin: the unit on `second` cannot pay for its Field Defense. */
export const blockedPoorUnitFixtureV7 = (): GameStateV7 =>
  blockedActionsMatchV7({ garrison: 2, coins: 1 });

/** No technology: the Game Forest asks for Hunting. */
export const blockedNeedsTechFixtureV7 = (): GameStateV7 =>
  blockedActionsMatchV7({ researched: [] });

/** Every slot of the capital is taken; one unit has acted. */
export const blockedFullCityFixtureV7 = (): GameStateV7 =>
  blockedActionsMatchV7({ garrison: 3, exhausted: true });
