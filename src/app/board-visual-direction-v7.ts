import type { StorageAdapter } from "../persistence/index";

/**
 * Developer option (bead pulp_wars-3tq.6): whether the CHIBI board and
 * interface return to the previous look ("Classic look (previous art)") for
 * comparison. The new visual direction is the default, so the classic look
 * is on only when the stored value is exactly `{ "classic": true }`. Like
 * the board saturation it is a presentation-only client preference under
 * its own key; it never enters a save or a replay.
 */
export const BOARD_CLASSIC_LOOK_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.boardClassicLook.v1";

/**
 * The retired key of the visual-direction experiment (beads pulp_wars-3tq.1
 * to .5), which stored `{ "recommended": boolean }` and was off by default.
 * Its `false` meant "the experiment was never switched on" (or was switched
 * off while comparing), not "I want the previous art", so no stored value of
 * it selects the classic look: the key is ignored and removed.
 */
export const RETIRED_BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.boardVisualDirection.v1";

/** A missing or malformed value is off: the new look is drawn. */
export function parseStoredBoardClassicLookV7(value: string | null): boolean {
  if (value === null) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Readonly<Record<string, unknown>>).classic === true
    );
  } catch {
    return false;
  }
}

/**
 * Reads the preference and drops the retired experiment key. Restricted
 * storage never prevents the app from mounting.
 */
export function loadBoardClassicLookV7(
  storage: StorageAdapter | null,
): boolean {
  try {
    storage?.removeItem(RETIRED_BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7);
  } catch {
    // The retired key is never read, so leaving it behind is harmless.
  }
  try {
    return parseStoredBoardClassicLookV7(
      storage?.getItem(BOARD_CLASSIC_LOOK_STORAGE_KEY_V7) ?? null,
    );
  } catch {
    return false;
  }
}

/** Returns false when the value could not be stored. */
export function storeBoardClassicLookV7(
  storage: StorageAdapter | null,
  classic: boolean,
): boolean {
  try {
    storage?.setItem(
      BOARD_CLASSIC_LOOK_STORAGE_KEY_V7,
      JSON.stringify({ classic }),
    );
    return true;
  } catch {
    return false;
  }
}
