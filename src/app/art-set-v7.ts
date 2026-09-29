import type { ArtSetV7 } from "../assets/chibi-art-v7";
import type { StorageAdapter } from "../persistence/index";

/**
 * Ruleset 7 art-set preference. It lives under its own key so the shared
 * exact-schema settings envelope (also read by Ruleset 6) stays unchanged.
 */
export const ART_SET_STORAGE_KEY_V7 = "pulpWars.ruleset7.artSet.v1";

/** `?art=chibi` or `?art=legacy`; anything else, or a repeated value, is ignored. */
export function artSetFromSearchV7(search: string): ArtSetV7 | null {
  const values = new URLSearchParams(search).getAll("art");
  if (values.length !== 1) return null;
  const value = values[0]?.toLowerCase();
  return value === "chibi" ? "CHIBI" : value === "legacy" ? "LEGACY" : null;
}

export function parseStoredArtSetV7(value: string | null): ArtSetV7 | null {
  return value === "CHIBI" || value === "LEGACY" ? value : null;
}

/**
 * The URL parameter selects and persists the art set; otherwise the stored
 * choice applies. LEGACY is the default, and restricted storage never
 * prevents the app from mounting.
 */
export function resolveArtSetV7(
  search: string,
  storage: StorageAdapter | null,
): ArtSetV7 {
  const requested = artSetFromSearchV7(search);
  if (requested !== null) {
    try {
      storage?.setItem(ART_SET_STORAGE_KEY_V7, requested);
    } catch {
      // The requested art set still applies to this page.
    }
    return requested;
  }
  try {
    return (
      parseStoredArtSetV7(storage?.getItem(ART_SET_STORAGE_KEY_V7) ?? null) ??
      "LEGACY"
    );
  } catch {
    return "LEGACY";
  }
}
