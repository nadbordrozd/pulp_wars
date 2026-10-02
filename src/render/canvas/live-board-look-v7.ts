import type { ArtSetV7, ChibiArtRegistryV7 } from "../../assets/chibi-art-v7";
import {
  DEFAULT_FARM_CROP_CHOICE_V7,
  chibiDirectionArtRegistryV7,
  type FarmCropChoiceV7,
} from "../../assets/chibi-direction-art-manifest";
import {
  LIVE_DIRECTION_V7,
  type BoardVisualDirectionV7,
} from "./visual-direction-v7";

/**
 * The production art of the new visual direction (bead pulp_wars-3tq.5).
 * Since bead pulp_wars-3tq.6 it is part of the CHIBI set's normal asset
 * loading: the board and the interface resolve it before the default art,
 * and a piece whose direction raster fails to load falls back to its
 * default asset. This is the default registry: every Farm tile shows the
 * crop of its coordinates (bead pulp_wars-9s0.6).
 */
export const LIVE_DIRECTION_ART_REGISTRY_V7: ChibiArtRegistryV7 =
  chibiDirectionArtRegistryV7();

const FARM_CROP_REGISTRIES = new Map<FarmCropChoiceV7, ChibiArtRegistryV7>([
  [DEFAULT_FARM_CROP_CHOICE_V7, LIVE_DIRECTION_ART_REGISTRY_V7],
]);

/**
 * The direction art for the developer setting "Farm crop": the default
 * registry for "MIXED", otherwise one with that crop as the only Farm. One
 * registry per choice, so the board host keeps its resolver between frames.
 */
export function liveDirectionArtRegistryV7(
  farmCrop: FarmCropChoiceV7 = DEFAULT_FARM_CROP_CHOICE_V7,
): ChibiArtRegistryV7 {
  let registry = FARM_CROP_REGISTRIES.get(farmCrop);
  if (registry === undefined) {
    registry = chibiDirectionArtRegistryV7(farmCrop);
    FARM_CROP_REGISTRIES.set(farmCrop, registry);
  }
  return registry;
}

/** The board-host model fields that select a look. */
export interface BoardLookV7 {
  readonly visualDirection?: BoardVisualDirectionV7;
  readonly visualDirectionArt?: ChibiArtRegistryV7;
}

const LIVE_LOOKS = new Map<FarmCropChoiceV7, BoardLookV7>();
const CLASSIC_LOOK: BoardLookV7 = {};

/**
 * What the game passes to the board host (bead pulp_wars-3tq.6): the new
 * visual direction for the CHIBI art set, and nothing for the LEGACY set or
 * the developer option "Classic look (previous art)", which then draw
 * exactly as before the direction existed. Review scenes that mount a board
 * host of their own spread it into their model to draw what the game draws.
 * `farmCrop` is the developer setting "Farm crop"; it only changes which
 * Farm art the direction registers, so it has no effect on the classic look
 * or the LEGACY set.
 */
export function liveBoardLookV7(
  artSet: ArtSetV7 | undefined,
  classicLook = false,
  farmCrop: FarmCropChoiceV7 = DEFAULT_FARM_CROP_CHOICE_V7,
): BoardLookV7 {
  if (artSet !== "CHIBI" || classicLook) return CLASSIC_LOOK;
  let look = LIVE_LOOKS.get(farmCrop);
  if (look === undefined) {
    look = {
      visualDirection: LIVE_DIRECTION_V7,
      visualDirectionArt: liveDirectionArtRegistryV7(farmCrop),
    };
    LIVE_LOOKS.set(farmCrop, look);
  }
  return look;
}
