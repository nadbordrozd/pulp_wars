import type { GameModeV7 } from "../engine/index";
import type { StorageAdapter } from "../persistence/index";

/**
 * The game mode the new-game screen last started
 * (docs/product/RULESET_7_SCORE_AND_STARS.md section 7, item 1): a client
 * preference under its own key, like the board saturation; it never enters
 * a save or a replay.
 */
export const GAME_MODE_STORAGE_KEY_V7 = "pulpWars.ruleset7.gameMode.v1";

/** A missing or unknown value is Domination; restricted storage too. */
export function loadGameModePreferenceV7(
  storage: StorageAdapter | null,
): GameModeV7 {
  try {
    return storage?.getItem(GAME_MODE_STORAGE_KEY_V7) === "PERFECTION"
      ? "PERFECTION"
      : "DOMINATION";
  } catch {
    return "DOMINATION";
  }
}

/** Returns false when the choice could not be stored. */
export function storeGameModePreferenceV7(
  storage: StorageAdapter | null,
  mode: GameModeV7,
): boolean {
  try {
    storage?.setItem(GAME_MODE_STORAGE_KEY_V7, mode);
    return true;
  } catch {
    return false;
  }
}
