import type { ArtSetV7, ChibiArtRegistryV7 } from "../../assets/chibi-art-v7";
import { chibiDirectionArtRegistryV7 } from "../../assets/chibi-direction-art-manifest";
import {
  LIVE_DIRECTION_V7,
  type BoardVisualDirectionV7,
} from "./visual-direction-v7";

/**
 * The production art of the new visual direction (bead pulp_wars-3tq.5).
 * Since bead pulp_wars-3tq.6 it is part of the CHIBI set's normal asset
 * loading: the board and the interface resolve it before the default art,
 * and a piece whose direction raster fails to load falls back to its
 * default asset.
 */
export const LIVE_DIRECTION_ART_REGISTRY_V7: ChibiArtRegistryV7 =
  chibiDirectionArtRegistryV7();

/** The board-host model fields that select a look. */
export interface BoardLookV7 {
  readonly visualDirection?: BoardVisualDirectionV7;
  readonly visualDirectionArt?: ChibiArtRegistryV7;
}

const LIVE_LOOK: BoardLookV7 = {
  visualDirection: LIVE_DIRECTION_V7,
  visualDirectionArt: LIVE_DIRECTION_ART_REGISTRY_V7,
};
const CLASSIC_LOOK: BoardLookV7 = {};

/**
 * What the game passes to the board host (bead pulp_wars-3tq.6): the new
 * visual direction for the CHIBI art set, and nothing for the LEGACY set or
 * the developer option "Classic look (previous art)", which then draw
 * exactly as before the direction existed. Review scenes that mount a board
 * host of their own spread it into their model to draw what the game draws.
 */
export function liveBoardLookV7(
  artSet: ArtSetV7 | undefined,
  classicLook = false,
): BoardLookV7 {
  return artSet === "CHIBI" && !classicLook ? LIVE_LOOK : CLASSIC_LOOK;
}
