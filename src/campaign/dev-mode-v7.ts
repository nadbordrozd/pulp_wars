import type { StorageAdapter } from "../persistence/index";

/**
 * Developer mode (`pulp_wars-5xki`, docs/product/CAMPAIGN.md section 25).
 * It grew out of the campaign map's testing cheat "All missions unlocked"
 * (`pulp_wars-hmyk.3`, section 14.5) and keeps its secret gestures: tap the
 * "Campaign" title or the main menu's logo seven times quickly, or type
 * "pulpwars" on the main menu or the campaign screen; `?dev=1` in the
 * address (or the old `?campaign-cheat=1`) turns it on and `=0` off. A
 * gesture only ever turns it on; Settings has the switch that turns it off.
 *
 * While it is on, every built campaign and mission is open, the main menu
 * lists the Gallery, every faction can be picked, and no match goes to the
 * public leaderboard or the play statistics. It is a view over the stored
 * progress, never a write to it. The switch lives in localStorage under a
 * versioned key, beside the settings.
 */
export const DEV_MODE_STORAGE_KEY_V7 = "pulpWars.devMode.v1";
/**
 * The campaign cheat's old key: a browser that had the cheat on starts in
 * developer mode, and the old key is dropped on the next write.
 */
export const LEGACY_CAMPAIGN_CHEAT_STORAGE_KEY_V7 = "pulpWars.campaignCheat";
/** Taps of the title that turn developer mode on. */
export const DEV_MODE_TAPS_V7 = 7;
/** The longest pause between two of those taps, in milliseconds. */
export const DEV_MODE_TAP_GAP_MS_V7 = 800;
/** The word that turns developer mode on when typed. */
export const DEV_MODE_WORD_V7 = "pulpwars";
/** The address parameter that sets developer mode, and its old alias. */
export const DEV_MODE_PARAMETER_V7 = "dev";
export const DEV_MODE_LEGACY_PARAMETER_V7 = "campaign-cheat";

/** The stored switch; off when storage is missing or refuses access. */
export function loadDevModeV7(storage: StorageAdapter | null): boolean {
  try {
    return (
      storage?.getItem(DEV_MODE_STORAGE_KEY_V7) === "1" ||
      storage?.getItem(LEGACY_CAMPAIGN_CHEAT_STORAGE_KEY_V7) === "1"
    );
  } catch {
    return false;
  }
}

/** Stores the switch; restricted storage keeps it for the page only. */
export function saveDevModeV7(
  storage: StorageAdapter | null,
  on: boolean,
): void {
  try {
    if (on) storage?.setItem(DEV_MODE_STORAGE_KEY_V7, "1");
    else storage?.removeItem(DEV_MODE_STORAGE_KEY_V7);
    storage?.removeItem(LEGACY_CAMPAIGN_CHEAT_STORAGE_KEY_V7);
  } catch {
    // The page still remembers it until it is closed.
  }
}

/**
 * What the address says: true for `dev=1`, false for `dev=0`, else null.
 * `campaign-cheat` is read the same way when `dev` is absent.
 */
export function devModeFromSearchV7(search: string): boolean | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const value =
    params.get(DEV_MODE_PARAMETER_V7) ??
    params.get(DEV_MODE_LEGACY_PARAMETER_V7);
  return value === "1" ? true : value === "0" ? false : null;
}

/**
 * Developer mode at start-up: the stored switch, overridden (and stored)
 * by the address when it says `dev=` or `campaign-cheat=`.
 */
export function startupDevModeV7(
  storage: StorageAdapter | null,
  search: string,
): boolean {
  const fromAddress = devModeFromSearchV7(search);
  if (fromAddress === null) return loadDevModeV7(storage);
  saveDevModeV7(storage, fromAddress);
  return fromAddress;
}

/**
 * Hears the two gestures. `tap` and `key` return true on the tap or key
 * that completes a gesture, and then start counting afresh.
 */
export class DevModeGestureV7 {
  #taps: number[] = [];
  #typed = "";

  /** A tap of the title at `now` (milliseconds). */
  tap(now: number): boolean {
    const last = this.#taps.at(-1);
    if (last !== undefined && now - last > DEV_MODE_TAP_GAP_MS_V7)
      this.#taps = [];
    this.#taps.push(now);
    if (this.#taps.length < DEV_MODE_TAPS_V7) return false;
    this.#taps = [];
    return true;
  }

  /** A key pressed on a screen that listens (`KeyboardEvent.key`). */
  key(key: string): boolean {
    if (key.length !== 1) return false;
    this.#typed = (this.#typed + key.toLowerCase()).slice(
      -DEV_MODE_WORD_V7.length,
    );
    if (this.#typed !== DEV_MODE_WORD_V7) return false;
    this.#typed = "";
    return true;
  }
}
