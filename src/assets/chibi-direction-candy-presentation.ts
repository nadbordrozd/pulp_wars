/**
 * Presentation data of the Candy production art (bead pulp_wars-jdb.5,
 * docs/art/factions/CANDY.md): the palette for code-drawn markers and the
 * proposed size and place of the board markers the spec lists (Crumbs,
 * Crashed, Rushed, Splatted).
 *
 * It imports nothing, so the review script and the tests run it in Node and
 * the game can run it in the browser. The Candy UI (bead pulp_wars-jdb.6)
 * reads it for its board markers, its cues and its two attack cues
 * (`candy-canvas-v7`, `candy-effects-v7`, `attack-effects-v7`).
 */

/** The faction's colours for code-drawn markers, chips and effects. */
export const CANDY_PALETTE_V7 = {
  /** The faction colour (spec 15.4): the border and the interface. */
  faction: "#ffb8d8",
  /** Glaze, frosting, jelly and crystal, lit (measured on the masters). */
  pink: "#fba4c7",
  /** The shadow tone of the pink. */
  pinkShade: "#b25d80",
  /** The darkest pink a marker may use: an outline on white. */
  pinkDark: "#8f4565",
  /** Marshmallow, whipped cream, sugar and the hard shine. */
  white: "#fcf7f5",
  /** Cream shade, vanilla and pale sponge. */
  cream: "#f0d7ba",
  /** Wafer, graham cracker, donut dough and caramel. */
  biscuit: "#c8783a",
  /** Chocolate, gingerbread shade and the feet. */
  chocolate: "#6d2415",
  /** The small mint trim. */
  mint: "#8ddab3",
  /** The darkest outline of a marker. */
  outline: "#24121a",
} as const;

/**
 * The board markers of the Candy rules (spec 15.1), as the review draws
 * them: which raster, its drawn size in master pixels at zoom 1, and where
 * it sits. `OVER_HEAD` centres the marker on the top row of the unit's
 * sprite; `BESIDE_HEAD` puts it at that height, `shift` pixels to the
 * right; `FACE` centres it a third of the way down the sprite's body; `TILE`
 * stands it on the tile, `lift` pixels above the tile's bottom edge.
 */
export const CANDY_MARKERS_V7 = {
  crumbs: {
    subject: "CRUMBS",
    size: 40,
    place: "TILE",
    lift: 14,
    /** Up to three pips for `turnsLeft`, and the role icon, are code-drawn. */
    pips: 3,
  },
  crashed: {
    subject: "ICON:STATUS:CRASHED",
    size: 24,
    place: "OVER_HEAD",
  },
  rushed: {
    subject: "ICON:STATUS:RUSHED",
    size: 16,
    place: "BESIDE_HEAD",
    shift: 18,
  },
  splatted: {
    subject: "ICON:STATUS:SPLATTED",
    size: 24,
    place: "FACE",
  },
} as const;
