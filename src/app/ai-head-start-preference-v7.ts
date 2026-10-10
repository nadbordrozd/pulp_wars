import {
  AI_HEAD_START_COINS_V7,
  type AiHeadStartCoinsV7,
} from "../engine/index";
import type { StorageAdapter } from "../persistence/index";

/**
 * The AI head start the new-game screen last chose (`pulp_wars-w49.39`): a
 * client preference under its own key, like the game mode; it never enters
 * a save or a replay. This key holds the Coins of the head start; a further
 * kind of head start gets a key of its own.
 */
export const AI_HEAD_START_COINS_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.aiHeadStart.coins.v1";

/** A missing or unknown value is no head start; restricted storage too. */
export function loadAiHeadStartCoinsPreferenceV7(
  storage: StorageAdapter | null,
): 0 | AiHeadStartCoinsV7 {
  try {
    const stored = storage?.getItem(AI_HEAD_START_COINS_STORAGE_KEY_V7);
    return (
      AI_HEAD_START_COINS_V7.find((coins) => String(coins) === stored) ?? 0
    );
  } catch {
    return 0;
  }
}

/** Returns false when the choice could not be stored. */
export function storeAiHeadStartCoinsPreferenceV7(
  storage: StorageAdapter | null,
  coins: 0 | AiHeadStartCoinsV7,
): boolean {
  try {
    storage?.setItem(AI_HEAD_START_COINS_STORAGE_KEY_V7, String(coins));
    return true;
  } catch {
    return false;
  }
}
