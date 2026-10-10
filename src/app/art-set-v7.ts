import type { ArtSetV7 } from "../assets/chibi-art-v7";
import type { StorageAdapter } from "../persistence/index";

/**
 * Where a browser kept its Ruleset 7 art-set choice while the game had two
 * art sets to choose from (`?art=legacy` and `?art=chibi`, until bead
 * pulp_wars-67q.13). Nothing is written under it any more; a value left
 * there by an earlier visit is removed.
 */
export const ART_SET_STORAGE_KEY_V7 = "pulpWars.ruleset7.artSet.v1";

/** The one art set of the game. */
export const DEFAULT_ART_SET_V7: ArtSetV7 = "CHIBI";

/**
 * The art set of the page: always CHIBI. The player-facing switch is
 * retired (bead pulp_wars-67q.13): `?art=legacy` is no longer recognised,
 * `?art=chibi` (still in old links and review scripts) is harmless, and a
 * choice an earlier version stored, LEGACY or CHIBI, is cleared so it
 * cannot come back. Restricted storage never prevents the app from
 * mounting.
 */
export function resolveArtSetV7(
  _search: string,
  storage: StorageAdapter | null,
): ArtSetV7 {
  try {
    if (storage !== null && storage.getItem(ART_SET_STORAGE_KEY_V7) !== null)
      storage.removeItem(ART_SET_STORAGE_KEY_V7);
  } catch {
    // The stale choice stays stored and is still ignored.
  }
  return DEFAULT_ART_SET_V7;
}
