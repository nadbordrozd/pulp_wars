import {
  DEFAULT_FARM_CROP_CHOICE_V7,
  isFarmCropChoiceV7,
  type FarmCropChoiceV7,
} from "../assets/chibi-direction-art-manifest";
import type { StorageAdapter } from "../persistence/index";

/**
 * Developer option (bead pulp_wars-9s0.6): which crop the Farms of the CHIBI
 * board show while the user compares the three green Farm variants. "MIXED"
 * (the default) gives every Farm tile the crop of its coordinates; the other
 * values force one crop on every tile. Like the board saturation and the
 * classic look it is a presentation-only client preference under its own
 * key; it never enters a save or a replay.
 */
export const BOARD_FARM_CROP_STORAGE_KEY_V7 =
  "pulpWars.ruleset7.boardFarmCrop.v1";

/** A missing, malformed or unknown value is the default, "MIXED". */
export function parseStoredBoardFarmCropV7(
  value: string | null,
): FarmCropChoiceV7 {
  if (value === null) return DEFAULT_FARM_CROP_CHOICE_V7;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null)
      return DEFAULT_FARM_CROP_CHOICE_V7;
    const crop = (parsed as Readonly<Record<string, unknown>>).crop;
    return isFarmCropChoiceV7(crop) ? crop : DEFAULT_FARM_CROP_CHOICE_V7;
  } catch {
    return DEFAULT_FARM_CROP_CHOICE_V7;
  }
}

/** Restricted storage never prevents the app from mounting. */
export function loadBoardFarmCropV7(
  storage: StorageAdapter | null,
): FarmCropChoiceV7 {
  try {
    return parseStoredBoardFarmCropV7(
      storage?.getItem(BOARD_FARM_CROP_STORAGE_KEY_V7) ?? null,
    );
  } catch {
    return DEFAULT_FARM_CROP_CHOICE_V7;
  }
}

/** Returns false when the value could not be stored. */
export function storeBoardFarmCropV7(
  storage: StorageAdapter | null,
  crop: FarmCropChoiceV7,
): boolean {
  try {
    storage?.setItem(BOARD_FARM_CROP_STORAGE_KEY_V7, JSON.stringify({ crop }));
    return true;
  } catch {
    return false;
  }
}
