import type { StorageAdapter } from "../persistence/index";

/**
 * Developer experiment (bead pulp_wars-3tq.1): whether the board draws the
 * recommended visual direction. Like the board saturation it is a
 * presentation-only client preference under its own key; it never enters a
 * save or a replay, and it is off unless the stored value is exactly `true`.
 */
export const BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.boardVisualDirection.v1";

/** A missing or malformed value is off. */
export function parseStoredBoardVisualDirectionV7(
  value: string | null,
): boolean {
  if (value === null) return false;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as Readonly<Record<string, unknown>>).recommended === true
    );
  } catch {
    return false;
  }
}

/** Restricted storage never prevents the app from mounting. */
export function loadBoardVisualDirectionV7(
  storage: StorageAdapter | null,
): boolean {
  try {
    return parseStoredBoardVisualDirectionV7(
      storage?.getItem(BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7) ?? null,
    );
  } catch {
    return false;
  }
}

/** Returns false when the value could not be stored. */
export function storeBoardVisualDirectionV7(
  storage: StorageAdapter | null,
  recommended: boolean,
): boolean {
  try {
    storage?.setItem(
      BOARD_VISUAL_DIRECTION_STORAGE_KEY_V7,
      JSON.stringify({ recommended }),
    );
    return true;
  } catch {
    return false;
  }
}
