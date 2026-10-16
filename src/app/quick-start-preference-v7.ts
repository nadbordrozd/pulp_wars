import type { MapTypeV7 } from "../engine/index";
import type { StorageAdapter } from "../persistence/index";
import {
  QUICK_DEFAULT_DIFFICULTY_V7,
  QUICK_DIFFICULTIES_V7,
  QUICK_MAP_CYCLE_V7,
  type QuickDifficultyV7,
} from "../render/quick-start-v7";

/**
 * Quick start (bead `pulp_wars-2yc.54`): what the new-game screen remembers
 * per browser, like the game mode. Client preferences under their own keys;
 * they never enter a save or a replay. Blocked storage reads as nothing
 * stored and a failed write returns false.
 */
export const QUICK_DIFFICULTY_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.quickStart.difficulty.v1";
/** The map type of the last quick-cycle game started (Pangea, Continents, Lakes). */
export const QUICK_LAST_MAP_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.quickStart.lastMap.v1";

/** A missing or unknown value is the default difficulty (Normal). */
export function loadQuickDifficultyPreferenceV7(
  storage: StorageAdapter | null,
): QuickDifficultyV7 {
  try {
    const stored = storage?.getItem(QUICK_DIFFICULTY_STORAGE_KEY_V7);
    return (
      QUICK_DIFFICULTIES_V7.find((level) => level === stored) ??
      QUICK_DEFAULT_DIFFICULTY_V7
    );
  } catch {
    return QUICK_DEFAULT_DIFFICULTY_V7;
  }
}

export function storeQuickDifficultyPreferenceV7(
  storage: StorageAdapter | null,
  difficulty: QuickDifficultyV7,
): boolean {
  try {
    storage?.setItem(QUICK_DIFFICULTY_STORAGE_KEY_V7, difficulty);
    return true;
  } catch {
    return false;
  }
}

/** The last quick-cycle map started, or null (none, unknown, blocked). */
export function loadQuickLastMapPreferenceV7(
  storage: StorageAdapter | null,
): MapTypeV7 | null {
  try {
    const stored = storage?.getItem(QUICK_LAST_MAP_STORAGE_KEY_V7);
    return QUICK_MAP_CYCLE_V7.find((mapType) => mapType === stored) ?? null;
  } catch {
    return null;
  }
}

export function storeQuickLastMapPreferenceV7(
  storage: StorageAdapter | null,
  mapType: MapTypeV7,
): boolean {
  try {
    storage?.setItem(QUICK_LAST_MAP_STORAGE_KEY_V7, mapType);
    return true;
  } catch {
    return false;
  }
}
