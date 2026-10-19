import {
  DIFFICULTIES_V7,
  DIFFICULTY_BASE_HEAD_START_V7,
  DIFFICULTY_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7,
  DIFFICULTY_REFERENCE_LAND_PER_PLAYER_V7,
  REGULAR_LAND_PER_PLAYER_V7,
  REGULAR_MAP_CYCLE_V7,
  REGULAR_MAX_BOARD_SIZE_V7,
  difficultyHeadStartCoinsV7,
  regularBoardSizeV7,
  type BoardSizeV7,
  type DifficultyV7,
  type GameKindV7,
  type FactionIdV7,
  type MapTypeV7,
} from "../engine/index";

/**
 * Quick start (bead `pulp_wars-2yc.54`, docs/ui/QUICK_START.md): the new-game
 * screen's defaults. The player picks the game mode, a tribe, the number of
 * opponents and a difficulty; this module derives the rest. Nothing here is
 * shown to the player: the screen shows the result (the map and its size),
 * never the formulas. Every number is a first guess, meant to be tuned.
 *
 * Pure: no DOM, no storage, no randomness of its own (the caller passes it).
 */

/**
 * The difficulty levels, easiest first (the engine's `DIFFICULTIES_V7`,
 * `src/engine/v7/difficulty.ts`, which also reads a match's level back for
 * the skirmish stars). Normal is the game as balanced, the AI with no head
 * start (the AI cannot be made weaker than that without a rule change);
 * each harder level gives the AI players more starting Coins.
 */
export const QUICK_DIFFICULTIES_V7 = DIFFICULTIES_V7;
export type QuickDifficultyV7 = DifficultyV7;
/** The difficulty a first game starts on. */
export const QUICK_DEFAULT_DIFFICULTY_V7: QuickDifficultyV7 = "NORMAL";
export const QUICK_DIFFICULTY_LABELS_V7: Readonly<
  Record<QuickDifficultyV7, string>
> = Object.freeze({
  NORMAL: "Normal",
  HARD: "Hard",
  HARDER: "Harder",
  BRUTAL: "Brutal",
});

/**
 * The map cycle and the board size of a quick start: the engine's regular
 * game defaults (`src/engine/v7/game-kind.ts`, `pulp_wars-2yc.103`) under
 * the quick start's names. The map cycles Continents, Lakes, Pangea, one
 * per game; the size is the smallest legal board up to 20 x 20 that is not
 * crowded and gives every player its land share.
 */
export const QUICK_MAP_CYCLE_V7 = REGULAR_MAP_CYCLE_V7;

/** The map after `last` in the cycle; the first when there is none. */
export function nextQuickMapTypeV7(last: MapTypeV7 | null): MapTypeV7 {
  const index = last === null ? -1 : QUICK_MAP_CYCLE_V7.indexOf(last);
  return (
    QUICK_MAP_CYCLE_V7[(index + 1) % QUICK_MAP_CYCLE_V7.length] ?? "CONTINENTS"
  );
}

export const QUICK_MAX_BOARD_SIZE_V7 = REGULAR_MAX_BOARD_SIZE_V7;
export const QUICK_LAND_PER_PLAYER_V7 = REGULAR_LAND_PER_PLAYER_V7;
export const quickBoardSizeV7 = regularBoardSizeV7;

/**
 * The AI head start of each difficulty and its scaling by crowding: the
 * engine's (`src/engine/v7/difficulty.ts`) under the quick start's names.
 * Normal none, then +5, +10 and +20 Coins at one player per 40 land tiles
 * (33 on Continents), scaled by the land each player has and snapped to the
 * Coins the engine offers.
 */
export const QUICK_BASE_HEAD_START_V7 = DIFFICULTY_BASE_HEAD_START_V7;
export const QUICK_REFERENCE_LAND_PER_PLAYER_V7 =
  DIFFICULTY_REFERENCE_LAND_PER_PLAYER_V7;
export const QUICK_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7 =
  DIFFICULTY_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7;
export const quickHeadStartCoinsV7 = difficultyHeadStartCoinsV7;

/**
 * The opponents' factions: every faction but the player's, in a random
 * order (a Fisher-Yates shuffle drawing from `random`, which returns a
 * non-negative integer; a source that always draws 0 keeps the given
 * order). Seat 1 plays the first.
 */
export function randomOpponentFactionsV7(
  factions: readonly FactionIdV7[],
  own: FactionIdV7,
  random: () => number,
): readonly FactionIdV7[] {
  const others = factions.filter((candidate) => candidate !== own);
  for (let index = others.length - 1; index > 0; index -= 1) {
    const draw = index - (Math.abs(Math.trunc(random())) % (index + 1));
    const swap = others[draw];
    const here = others[index];
    if (swap === undefined || here === undefined) continue;
    others[index] = swap;
    others[draw] = here;
  }
  return others;
}

/**
 * The new-game screen's choices that decide whether its game is regular
 * (bead `pulp_wars-2yc.103`): everything under Custom game, the quick map
 * the screen picked, and whether an opponent's faction was set by hand.
 */
export interface QuickGameKindInputV7 {
  /** The map the quick start picked for this game (the cycle's). */
  readonly quickMapType: MapTypeV7;
  readonly mapType: MapTypeV7;
  readonly boardSize: BoardSizeV7;
  readonly aiCount: number;
  readonly difficulty: DifficultyV7;
  readonly aiHeadStartCoins: number;
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly curiosities: boolean;
  /** "New map" (a random seed at launch) or "Use seed". */
  readonly seedMode: "NEW" | "SEED";
  /** An opponent's faction was chosen by hand under Custom game. */
  readonly opponentFactionsChosen: boolean;
}

/**
 * Regular or custom (`pulp_wars-2yc.103`, docs/ui/QUICK_START.md): a game
 * is regular when everything under Custom game is what the quick choices
 * (mode, tribe, opponents, difficulty) give it: the quick map, its quick
 * size, the difficulty's AI head start on that board, Free-for-all,
 * Curiosities on, a new random map and the opponents' factions as drawn.
 * A value set by hand that equals the default keeps the game regular; an
 * opponent's faction chosen by hand makes it custom (the default is a
 * random draw).
 */
export function quickGameKindV7(input: QuickGameKindInputV7): GameKindV7 {
  const regular =
    input.mapType === input.quickMapType &&
    QUICK_MAP_CYCLE_V7.includes(input.mapType) &&
    input.boardSize === quickBoardSizeV7(input.mapType, input.aiCount) &&
    input.aiHeadStartCoins ===
      quickHeadStartCoinsV7(
        input.difficulty,
        input.mapType,
        input.boardSize,
        input.aiCount,
      ) &&
    input.aiMode === "RIVAL" &&
    input.curiosities &&
    input.seedMode === "NEW" &&
    !input.opponentFactionsChosen;
  return regular ? "REGULAR" : "CUSTOM";
}
