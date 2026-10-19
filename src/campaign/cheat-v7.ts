import type { StorageAdapter } from "../persistence/index";

/**
 * The testing cheat of the campaign map (`pulp_wars-hmyk.3`,
 * docs/product/CAMPAIGN.md section 14.5): "All missions unlocked". While it
 * is on, every built campaign and every mission can be picked; progress is
 * still recorded as usual. It is turned on and off on the campaign screen by
 * tapping the "Campaign" title seven times quickly, or by typing
 * "pulpwars"; `?campaign-cheat=1` in the address turns it on (and `=0`
 * off). The switch lives in localStorage, beside the settings.
 */
export const CAMPAIGN_CHEAT_STORAGE_KEY_V7 = "pulpWars.campaignCheat";
/** Taps of the title that toggle the cheat. */
export const CAMPAIGN_CHEAT_TAPS_V7 = 7;
/** The longest pause between two of those taps, in milliseconds. */
export const CAMPAIGN_CHEAT_TAP_GAP_MS_V7 = 800;
/** The word that toggles the cheat when typed on the campaign screen. */
export const CAMPAIGN_CHEAT_WORD_V7 = "pulpwars";
/** The address parameter that sets the cheat. */
export const CAMPAIGN_CHEAT_PARAMETER_V7 = "campaign-cheat";

/** The stored switch; off when storage is missing or refuses access. */
export function loadCampaignCheatV7(storage: StorageAdapter | null): boolean {
  try {
    return storage?.getItem(CAMPAIGN_CHEAT_STORAGE_KEY_V7) === "1";
  } catch {
    return false;
  }
}

/** Stores the switch; restricted storage keeps it for the page only. */
export function saveCampaignCheatV7(
  storage: StorageAdapter | null,
  on: boolean,
): void {
  try {
    if (on) storage?.setItem(CAMPAIGN_CHEAT_STORAGE_KEY_V7, "1");
    else storage?.removeItem(CAMPAIGN_CHEAT_STORAGE_KEY_V7);
  } catch {
    // The page still remembers it until it is closed.
  }
}

/** What the address says: true for `=1`, false for `=0`, else null. */
export function campaignCheatFromSearchV7(search: string): boolean | null {
  let value: string | null;
  try {
    value = new URLSearchParams(search).get(CAMPAIGN_CHEAT_PARAMETER_V7);
  } catch {
    return null;
  }
  return value === "1" ? true : value === "0" ? false : null;
}

/**
 * Hears the two gestures. `tap` and `key` return true on the tap or key
 * that completes a gesture, and then start counting afresh.
 */
export class CampaignCheatGestureV7 {
  #taps: number[] = [];
  #typed = "";

  /** A tap of the title at `now` (milliseconds). */
  tap(now: number): boolean {
    const last = this.#taps.at(-1);
    if (last !== undefined && now - last > CAMPAIGN_CHEAT_TAP_GAP_MS_V7)
      this.#taps = [];
    this.#taps.push(now);
    if (this.#taps.length < CAMPAIGN_CHEAT_TAPS_V7) return false;
    this.#taps = [];
    return true;
  }

  /** A key pressed on the campaign screen (`KeyboardEvent.key`). */
  key(key: string): boolean {
    if (key.length !== 1) return false;
    this.#typed = (this.#typed + key.toLowerCase()).slice(
      -CAMPAIGN_CHEAT_WORD_V7.length,
    );
    if (this.#typed !== CAMPAIGN_CHEAT_WORD_V7) return false;
    this.#typed = "";
    return true;
  }
}
