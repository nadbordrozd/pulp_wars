import { difficultyHeadStartCoinsV7, matchDifficultyV7 } from "./difficulty";
import {
  allowedBoardSizesV7,
  crowdedBoardV7,
  isGeneratedMapTypeV7,
  landTileCountV7,
} from "./map-scale";
import {
  aiHeadStartCoinsV7,
  type BoardSizeV7,
  type GameKindV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "./types";

/**
 * Regular and custom games (bead `pulp_wars-2yc.103`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md section 5.8). A skirmish is
 * **regular** when the player chose only what the new-game screen asks on
 * its quick path (the game mode, the tribe, the number of opponents and the
 * difficulty) and left every other option at the default the quick choices
 * give it; anything changed under Custom game makes it **custom**. Only a
 * regular game earns tribe stars (and, later, a leaderboard place,
 * `pulp_wars-2yc.104`).
 *
 * The defaults a regular game has (the quick start, docs/ui/QUICK_START.md,
 * moved here from `src/render/quick-start-v7.ts` so the engine can tell a
 * regular setup made before the kinds were recorded):
 *
 * - the map of the cycle Continents, Lakes, Pangea ({@link REGULAR_MAP_CYCLE_V7});
 * - the board size {@link regularBoardSizeV7} for that map and the opponents;
 * - the AI head start the difficulty gives on that board;
 * - Alliances Free-for-all (`RIVAL`) and Curiosities on;
 * - a new random map (no chosen seed) and the opponents' factions as drawn.
 *
 * The last line cannot be read from a setup, so the kind is recorded on the
 * setup (`MatchSetupV7.gameKind`) by the screen that launched it.
 */

/**
 * The map types a new game cycles through, one per game, in this order
 * and starting from Continents (the long-standing default): Continents,
 * Lakes, Pangea, Continents...
 */
export const REGULAR_MAP_CYCLE_V7: readonly MapTypeV7[] = Object.freeze([
  "CONTINENTS",
  "LAKES",
  "PANGEA",
]);

/** The largest board the quick start picks (performance). */
export const REGULAR_MAX_BOARD_SIZE_V7: BoardSizeV7 = 20;

/**
 * The land tiles each player should have to themselves, by map type: the
 * quick start picks the smallest board giving every player at least this
 * much land. The land counts of the map types already differ; Continents
 * asks less so that one opponent still plays the long-standing 11 x 11
 * board (56 land tiles since the natural water of `7r87`, `pulp_wars-ykw.8`;
 * 34 of 68 before, and 28 of 56 picks the same size for every count of
 * opponents: the wider sea is crossed by boat, not lost room).
 */
export const REGULAR_LAND_PER_PLAYER_V7: Readonly<Record<string, number>> =
  Object.freeze({ PANGEA: 35, CONTINENTS: 28, LAKES: 35 });
/** The target for any other generated map type (from Custom game). */
const DEFAULT_LAND_PER_PLAYER = 35;

/**
 * The board size of a quick start: among the sizes the engine allows for
 * the players on this map type, up to 20 x 20, the smallest that is not
 * crowded and gives each player its land share; else the largest allowed
 * one up to 20 x 20 (else the smallest allowed, should every legal size be
 * larger). Non-decreasing in `opponents`.
 */
export function regularBoardSizeV7(
  mapType: MapTypeV7,
  opponents: number,
): BoardSizeV7 {
  const seats = opponents + 1;
  const allowed = allowedBoardSizesV7(mapType, seats);
  const capped = allowed.filter((size) => size <= REGULAR_MAX_BOARD_SIZE_V7);
  if (!isGeneratedMapTypeV7(mapType))
    return capped[0] ?? allowed[0] ?? REGULAR_MAX_BOARD_SIZE_V7;
  const target = REGULAR_LAND_PER_PLAYER_V7[mapType] ?? DEFAULT_LAND_PER_PLAYER;
  const roomy = capped.find(
    (size) =>
      landTileCountV7(size, mapType) >= target * seats &&
      !crowdedBoardV7(size, mapType, seats),
  );
  return roomy ?? capped.at(-1) ?? allowed[0] ?? REGULAR_MAX_BOARD_SIZE_V7;
}

type KindSetupV7 = Pick<
  MatchSetupV7,
  | "gameKind"
  | "mapType"
  | "width"
  | "aiCount"
  | "aiMode"
  | "curiosities"
  | "aiDifficulty"
  | "aiHeadStart"
  | "allowDuplicateFactions"
  | "mission"
>;

/** A skirmish: a generated map, not a mission, never a mirror setup. */
function skirmishSetupV7(setup: KindSetupV7): boolean {
  return (
    isGeneratedMapTypeV7(setup.mapType) &&
    setup.mission === undefined &&
    setup.allowDuplicateFactions === undefined
  );
}

/**
 * Whether everything a setup holds is what a regular game has: a skirmish
 * on a map of the cycle at its regular size, Free-for-all, Curiosities on,
 * and the AI head start of its difficulty (named, or read back from the
 * head start by `matchDifficultyV7`). The seed and the opponents' factions
 * cannot be told from a setup and are not checked.
 */
export function regularSetupShapeV7(setup: KindSetupV7): boolean {
  return (
    skirmishSetupV7(setup) &&
    REGULAR_MAP_CYCLE_V7.includes(setup.mapType) &&
    setup.width === regularBoardSizeV7(setup.mapType, setup.aiCount) &&
    setup.aiMode === "RIVAL" &&
    setup.curiosities &&
    aiHeadStartCoinsV7(setup) ===
      difficultyHeadStartCoinsV7(
        matchDifficultyV7(setup),
        setup.mapType,
        setup.width,
        setup.aiCount,
      )
  );
}

/**
 * The kind of a setup: the one it records, and for a setup without the key
 * (made before the kinds: a save, a replay, a headless setup) `REGULAR`
 * exactly when {@link regularSetupShapeV7} holds, else `CUSTOM`. The
 * Showcase, a mission and a mirror setup are never regular.
 */
export function gameKindOfV7(setup: KindSetupV7): GameKindV7 {
  if (!skirmishSetupV7(setup)) return "CUSTOM";
  if (setup.gameKind !== undefined) return setup.gameKind;
  return regularSetupShapeV7(setup) ? "REGULAR" : "CUSTOM";
}

/**
 * Whether a match is a regular game: the one query the tribe stars and the
 * public leaderboard (`pulp_wars-2yc.104`) accept a match by.
 */
export function isRegularGameV7(setup: KindSetupV7): boolean {
  return gameKindOfV7(setup) === "REGULAR";
}
