import type { StorageAdapter } from "../persistence/index";

/**
 * Where a browser kept its Ruleset 7 art-set choice while the game had two
 * art sets to choose from (`?art=legacy` and `?art=chibi`, until bead
 * pulp_wars-67q.13). Nothing is written under it any more; a value left
 * there by an earlier visit is removed.
 */
export const ART_SET_STORAGE_KEY_V7 = "pulpWars.ruleset7.artSet.v1";

/**
 * Ruleset 7 has one art set (bead pulp_wars-67q.15): `?art=legacy` is not
 * recognised, `?art=chibi` (still in old links and review scripts) is
 * harmless, and a choice an earlier version stored is cleared here at
 * bootstrap. Restricted storage never prevents the app from mounting.
 */
export function clearStoredArtSetV7(storage: StorageAdapter | null): void {
  try {
    if (storage !== null && storage.getItem(ART_SET_STORAGE_KEY_V7) !== null)
      storage.removeItem(ART_SET_STORAGE_KEY_V7);
  } catch {
    // The stale choice stays stored and is still ignored.
  }
}
