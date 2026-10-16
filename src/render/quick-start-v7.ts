import {
  AI_HEAD_START_COINS_V7,
  allowedBoardSizesV7,
  crowdedBoardV7,
  isGeneratedMapTypeV7,
  landTileCountV7,
  type AiHeadStartCoinsV7,
  type BoardSizeV7,
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
 * The difficulty levels, easiest first. Normal is the game as balanced, the
 * AI with no head start (the AI cannot be made weaker than that without a
 * rule change); each harder level gives the AI players more starting Coins.
 */
export const QUICK_DIFFICULTIES_V7 = Object.freeze([
  "NORMAL",
  "HARD",
  "HARDER",
  "BRUTAL",
] as const);
export type QuickDifficultyV7 = (typeof QUICK_DIFFICULTIES_V7)[number];
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
 * The map types a new game cycles through, one per game, in this order
 * and starting from Continents (the long-standing default): Continents,
 * Lakes, Pangea, Continents...
 */
export const QUICK_MAP_CYCLE_V7: readonly MapTypeV7[] = Object.freeze([
  "CONTINENTS",
  "LAKES",
  "PANGEA",
]);

/** The map after `last` in the cycle; the first when there is none. */
export function nextQuickMapTypeV7(last: MapTypeV7 | null): MapTypeV7 {
  const index = last === null ? -1 : QUICK_MAP_CYCLE_V7.indexOf(last);
  return (
    QUICK_MAP_CYCLE_V7[(index + 1) % QUICK_MAP_CYCLE_V7.length] ?? "CONTINENTS"
  );
}

/** The largest board the quick start picks (performance). */
export const QUICK_MAX_BOARD_SIZE_V7: BoardSizeV7 = 20;

/**
 * The land tiles each player should have to themselves, by map type: the
 * quick start picks the smallest board giving every player at least this
 * much land. The land counts of the map types already differ; Continents
 * asks less so that one opponent still plays the long-standing 11 x 11
 * board (56 land tiles since the natural water of `7r87`, `pulp_wars-ykw.8`;
 * 34 of 68 before, and 28 of 56 picks the same size for every count of
 * opponents: the wider sea is crossed by boat, not lost room).
 */
export const QUICK_LAND_PER_PLAYER_V7: Readonly<Record<string, number>> =
  Object.freeze({ PANGEA: 35, CONTINENTS: 28, LAKES: 35 });
/** The target for any other generated map type (from Advanced). */
const DEFAULT_LAND_PER_PLAYER = 35;

/**
 * The board size of a quick start: among the sizes the engine allows for
 * the players on this map type, up to 20 x 20, the smallest that is not
 * crowded and gives each player its land share; else the largest allowed
 * one up to 20 x 20 (else the smallest allowed, should every legal size be
 * larger). Non-decreasing in `opponents`.
 */
export function quickBoardSizeV7(
  mapType: MapTypeV7,
  opponents: number,
): BoardSizeV7 {
  const seats = opponents + 1;
  const allowed = allowedBoardSizesV7(mapType, seats);
  const capped = allowed.filter((size) => size <= QUICK_MAX_BOARD_SIZE_V7);
  if (!isGeneratedMapTypeV7(mapType))
    return capped[0] ?? allowed[0] ?? QUICK_MAX_BOARD_SIZE_V7;
  const target = QUICK_LAND_PER_PLAYER_V7[mapType] ?? DEFAULT_LAND_PER_PLAYER;
  const roomy = capped.find(
    (size) =>
      landTileCountV7(size, mapType) >= target * seats &&
      !crowdedBoardV7(size, mapType, seats),
  );
  return roomy ?? capped.at(-1) ?? allowed[0] ?? QUICK_MAX_BOARD_SIZE_V7;
}

/**
 * The AI head start of each difficulty on a board of reference crowding:
 * Normal none, then +5, +10 and +20 Coins.
 */
export const QUICK_BASE_HEAD_START_V7: Readonly<
  Record<QuickDifficultyV7, number>
> = Object.freeze({ NORMAL: 0, HARD: 5, HARDER: 10, BRUTAL: 20 });
/** Reference crowding: one player per this many land tiles. */
export const QUICK_REFERENCE_LAND_PER_PLAYER_V7 = 40;
/**
 * The reference on Continents: 33, the 40 above scaled to the 46% land of
 * `7r87` (56% before), which gives every Continents board and opponent
 * count the head start it had.
 */
export const QUICK_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7 = 33;

/**
 * The AI head start of a difficulty on a board. A head start counts for more
 * where players meet early, so the base Coins scale with the land each
 * player has: `base * (land / players) / 40`. The result snaps to the
 * nearest Coins the engine offers (5, 10, 20, nearest by ratio), never
 * below +5, so only Normal has none. Non-decreasing with the difficulty and
 * with the land per player.
 */
export function quickHeadStartCoinsV7(
  difficulty: QuickDifficultyV7,
  mapType: MapTypeV7,
  boardSize: BoardSizeV7,
  opponents: number,
): 0 | AiHeadStartCoinsV7 {
  const base = QUICK_BASE_HEAD_START_V7[difficulty];
  if (base === 0) return 0;
  const seats = opponents + 1;
  const land = isGeneratedMapTypeV7(mapType)
    ? landTileCountV7(boardSize, mapType)
    : boardSize * boardSize;
  const reference =
    mapType === "CONTINENTS"
      ? QUICK_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7
      : QUICK_REFERENCE_LAND_PER_PLAYER_V7;
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
