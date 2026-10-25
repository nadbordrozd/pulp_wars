import { isGeneratedMapTypeV7, landTileCountV7 } from "./map-scale";
import {
  AI_HEAD_START_COINS_V7,
  DIFFICULTIES_V7,
  aiHeadStartCoinsV7,
  type AiHeadStartCoinsV7,
  type BoardSizeV7,
  type DifficultyV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "./types";

/**
 * Difficulty (bead `pulp_wars-2yc.54`, docs/ui/QUICK_START.md; moved into
 * the engine by `pulp_wars-2yc.69` so the skirmish stars can read it): the
 * levels of `DIFFICULTIES_V7`, easiest first. Normal is the game as
 * balanced, with no head start; each harder level gives every AI seat more
 * starting Coins. Easy (`pulp_wars-q6cc`) has no head start either: its AI
 * seats play the cautious Easy personality (`src/ai/v7-personality.ts`).
 *
 * A setup names its level in `aiDifficulty` (only with exactly that level's
 * head start, which the setup validation checks); a setup whose head start
 * was set by hand, or made before the levels, says `NORMAL`, and
 * {@link matchDifficultyV7} reads its level back from the head start.
 */

/**
 * The AI head start of each difficulty on a board of reference crowding:
 * Easy and Normal none, then +5, +10 and +20 Coins.
 */
export const DIFFICULTY_BASE_HEAD_START_V7: Readonly<
  Record<DifficultyV7, number>
> = Object.freeze({ EASY: 0, NORMAL: 0, HARD: 5, HARDER: 10, BRUTAL: 20 });
/** Reference crowding: one player per this many land tiles. */
export const DIFFICULTY_REFERENCE_LAND_PER_PLAYER_V7 = 40;
/**
 * The reference on Continents: 33, the 40 above scaled to the 46% land of
 * `7r87` (56% before), which gives every Continents board and opponent
 * count the head start it had.
 */
export const DIFFICULTY_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7 = 33;

/**
 * The AI head start of a difficulty on a board. A head start counts for more
 * where players meet early, so the base Coins scale with the land each
 * player has: `base * (land / players) / 40`. The result snaps to the
 * nearest Coins the engine offers (5, 10, 20, nearest by ratio), never
 * below +5, so only Easy and Normal have none. Non-decreasing with the difficulty and
 * with the land per player.
 */
export function difficultyHeadStartCoinsV7(
  difficulty: DifficultyV7,
  mapType: MapTypeV7,
  boardSize: BoardSizeV7,
  opponents: number,
): 0 | AiHeadStartCoinsV7 {
  const base = DIFFICULTY_BASE_HEAD_START_V7[difficulty];
  if (base === 0) return 0;
  const seats = opponents + 1;
  const land = isGeneratedMapTypeV7(mapType)
    ? landTileCountV7(boardSize, mapType)
    : boardSize * boardSize;
  const reference =
    mapType === "CONTINENTS"
      ? DIFFICULTY_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7
      : DIFFICULTY_REFERENCE_LAND_PER_PLAYER_V7;
  const raw = (base * land) / seats / reference;
  return nearestHeadStartCoinsV7(raw);
}

/** The offered Coins nearest to `raw` by ratio (the larger on a tie). */
function nearestHeadStartCoinsV7(raw: number): AiHeadStartCoinsV7 {
  let best: AiHeadStartCoinsV7 = AI_HEAD_START_COINS_V7[0];
  for (const coins of AI_HEAD_START_COINS_V7)
    if (Math.abs(Math.log(raw / coins)) <= Math.abs(Math.log(raw / best)))
      best = coins;
  return best;
}

/**
 * The difficulty of a match: the level its setup names, and for a `NORMAL`
 * setup the level its head start reaches on this board, map type and
 * opponent count: the hardest level whose head start is at most the
 * match's. So a head start set by hand (Advanced, the headless CLI) or
 * carried by a match made before the levels reads as the level it gives:
 * +10 where Harder gives +10 and Brutal +20 is Harder; +5 where Hard
 * already gives +10 is Normal; where two levels give the same head start
 * (Harder and Brutal on a roomy board) it reads as the harder, the same
 * game. No head start (the Showcase, a mission) is Normal. An `EASY`
 * setup is Easy (it never has a head start).
 */
export function matchDifficultyV7(
  setup: Pick<
    MatchSetupV7,
    "aiDifficulty" | "aiHeadStart" | "mapType" | "width" | "aiCount"
  >,
): DifficultyV7 {
  if (setup.aiDifficulty !== "NORMAL") return setup.aiDifficulty;
  const coins = aiHeadStartCoinsV7(setup);
  let reached: DifficultyV7 = "NORMAL";
  if (coins === 0) return reached;
  for (const difficulty of DIFFICULTIES_V7)
    if (
      difficulty !== "EASY" &&
      difficultyHeadStartCoinsV7(
        difficulty,
        setup.mapType,
        setup.width,
        setup.aiCount,
      ) <= coins
    )
      reached = difficulty;
  return reached;
}

/**
 * Whether a setup may name this difficulty: `NORMAL` always; `EASY`
 * (`pulp_wars-q6cc`) on any setup without a head start (a mission and the
 * Showcase included); a harder level only on a generated map with exactly
 * that level's head start on this board (the head start the new-game
 * screen gives it).
 */
export function setupDifficultyAllowedV7(
  setup: Pick<MatchSetupV7, "aiHeadStart" | "mapType" | "width" | "aiCount">,
  difficulty: DifficultyV7,
): boolean {
  if (difficulty === "NORMAL") return true;
  if (difficulty === "EASY") return aiHeadStartCoinsV7(setup) === 0;
  return (
    isGeneratedMapTypeV7(setup.mapType) &&
    aiHeadStartCoinsV7(setup) ===
      difficultyHeadStartCoinsV7(
        difficulty,
        setup.mapType,
        setup.width,
        setup.aiCount,
      )
  );
}
