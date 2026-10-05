/**
 * Presentation data of the Martian production art (bead pulp_wars-t6s.6,
 * docs/art/factions/MARTIAN.md): pennant anchors, the flyers' lift and
 * shadow, and the palette for code-drawn markers. It imports nothing, so
 * the review script and the tests read it in Node as well as the game.
 */

/**
 * Pennant anchors of the Martian cities, in the form of
 * DIRECTION_FLAG_ANCHORS_V7 (master pixels from the sprite's top-left
 * corner: the top of the pole; `pole` is the length drawn downward). Each
 * colony has an antenna mast of its own, so no pole is drawn: the pennant
 * flies from the mast's tip.
 */
export const MARTIAN_FLAG_ANCHORS_V7: Readonly<
  Record<
    string,
    { readonly x: number; readonly y: number; readonly pole: number }
  >
> = {
  // The tip of the lattice mast right of the saucer.
  "chibi-direction-martian-city-1": { x: 68.5, y: 22, pole: 0 },
  // The magenta tip of the mast at the right corner of the ring wall.
  "chibi-direction-martian-city-2": { x: 80, y: 33, pole: 0 },
  // The tip of the mast on the right-hand tower.
  "chibi-direction-martian-city-3": { x: 75.5, y: 20, pole: 0 },
};

/**
 * How the two flyers show that they fly. Each sprite keeps a gap of empty
 * rows under its hull (its lowest pixel is `hullBottom`, where a walking
 * unit of the same canvas stands at about `groundLine`), so on a base plate
 * it already hovers. `shadow` is the ground shadow the interface draws in
 * code under it, as RULESET_7_MARTIANS.md section 13.1 asks: an ellipse in
 * master pixels, centred on the ground line, in `MARTIAN_PALETTE_V7.shadow`.
 * A further lift, if the interface adds one, moves the sprite up and leaves
 * the shadow in place.
 */
export const MARTIAN_FLYER_PRESENTATION_V7 = {
  "chibi-direction-martian-saucer": {
    hullBottom: 71,
    groundLine: 81,
    shadow: { x: 36, y: 80, radiusX: 20, radiusY: 4 },
  },
  "chibi-direction-martian-mothership": {
    hullBottom: 69,
    groundLine: 82,
    shadow: { x: 36, y: 81, radiusX: 25, radiusY: 5 },
  },
} as const;

/**
 * The faction's colours for code-drawn markers and effects (measured on the
 * masters; docs/art/factions/MARTIAN.md, "Palette").
 */
export const MARTIAN_PALETTE_V7 = {
  /** The accent: ray emitters, lights, the Shield bar's filled segments. */
  magenta: "#ff2fb0",
  /** Glow highlights, beam cores, the shimmer of a Shield. */
  magentaGlow: "#ff8fd6",
  /** The palest tone of a beam or a flash. */
  magentaPale: "#ffd3ee",
  /** Shade and outline of magenta shapes; an empty Shield segment's rim. */
  magentaDark: "#8c1264",
  chrome: "#d5dde6",
  chromeShade: "#8e9bb0",
  gunmetal: "#4a5262",
  /** The Cooling glyph: a dull grey with no glow. */
  cooling: "#aab3c0",
  /** The flyers' ground shadow (drawn at 35% alpha). */
  shadow: "#10131a",
} as const;
