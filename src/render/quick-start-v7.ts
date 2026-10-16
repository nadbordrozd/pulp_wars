import {
  DIFFICULTIES_V7,
  DIFFICULTY_BASE_HEAD_START_V7,
  DIFFICULTY_CONTINENTS_REFERENCE_LAND_PER_PLAYER_V7,
  DIFFICULTY_REFERENCE_LAND_PER_PLAYER_V7,
  allowedBoardSizesV7,
  crowdedBoardV7,
  difficultyHeadStartCoinsV7,
  isGeneratedMapTypeV7,
  landTileCountV7,
  type BoardSizeV7,
  type DifficultyV7,
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
