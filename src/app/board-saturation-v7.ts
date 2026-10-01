import type { StorageAdapter } from "../persistence/index";
import {
  DEFAULT_BOARD_SATURATION_V7,
  clampSaturationPercentV7,
  type BoardSaturationV7,
} from "../render/canvas/sprite-saturation-v7";

/**
 * Developer experiment (bead pulp_wars-x6c): board saturation of buildings
 * and cities. Like the art set it is a presentation-only client preference
 * under its own key, so the shared exact-schema settings envelope (also
 * read by Ruleset 6) stays unchanged. It never enters a save or a replay.
 */
export const BOARD_SATURATION_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.boardSaturation.v1";

/** A missing, malformed or out-of-range value becomes a valid percentage. */
export function parseStoredBoardSaturationV7(
  value: string | null,
): BoardSaturationV7 {
  if (value === null) return DEFAULT_BOARD_SATURATION_V7;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null)
      return DEFAULT_BOARD_SATURATION_V7;
    const record = parsed as Readonly<Record<string, unknown>>;
    return {
      building: clampSaturationPercentV7(record.building),
      city: clampSaturationPercentV7(record.city),
    };
  } catch {
    return DEFAULT_BOARD_SATURATION_V7;
  }
}

/** Restricted storage never prevents the app from mounting. */
export function loadBoardSaturationV7(
  storage: StorageAdapter | null,
): BoardSaturationV7 {
  try {
    return parseStoredBoardSaturationV7(
      storage?.getItem(BOARD_SATURATION_STORAGE_KEY_V7) ?? null,
    );
  } catch {
    return DEFAULT_BOARD_SATURATION_V7;
  }
}

/** Returns false when the value could not be stored. */
export function storeBoardSaturationV7(
  storage: StorageAdapter | null,
  saturation: BoardSaturationV7,
): boolean {
  try {
    storage?.setItem(
      BOARD_SATURATION_STORAGE_KEY_V7,
      JSON.stringify({
        building: clampSaturationPercentV7(saturation.building),
        city: clampSaturationPercentV7(saturation.city),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
