/**
 * Presentation data of the Candy production art (bead pulp_wars-jdb.5,
 * docs/art/factions/CANDY.md): the palette for code-drawn markers and the
 * proposed size and place of the board markers the spec lists (Crumbs,
 * Crashed, Rushed, Splatted; the Candy redesign's Toothache).
 *
 * It imports nothing, so the review script and the tests run it in Node and
 * the game can run it in the browser. The Candy UI (bead pulp_wars-jdb.6)
 * reads it for its board markers, its cues and its two attack cues
 * (`candy-canvas-v7`, `candy-effects-v7`, `attack-effects-v7`).
 */

/**
 * The faction's colours for code-drawn markers, chips and effects. Since the
 * Chocolatier look (bead pulp_wars-jdb.10) the accents are caramel gold and
 * chocolate, as on the sprites; they were cotton-candy pink (`pink`,
 * `pinkShade`, `pinkDark`). Only `faction` is still pink: the identity
 * colour of the territory border.
 */
export const CANDY_PALETTE_V7 = {
  /** The faction colour (spec 15.4): the territory border, nothing else. */
  faction: "#ffb8d8",
  /** Caramel and toffee gold, lit: the accent of every code-drawn piece. */
  caramel: "#e0a040",
  /** The shadow tone of the caramel. */
  caramelShade: "#b06a1c",
  /** Milk chocolate: the outline of a white or caramel marker. */
  milkChocolate: "#7a4526",
  /** Marshmallow, whipped cream, sugar and the hard shine. */
  white: "#fcf7f5",
  /** Cream shade, vanilla and pale sponge. */
  cream: "#f0d7ba",
  /** Wafer, graham cracker, donut dough and gingerbread. */
  biscuit: "#c8783a",
  /** Dark chocolate: dips, glazes and the feet. */
  chocolate: "#4a2412",
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
  /**
   * The Candy redesign (bead pulp_wars-jdb.14): Toothache, a cracked tooth
   * in a dark token beside the head, on the side away from the Rushed chip.
   * Stuck is code-drawn round the feet (toffee strands; no raster).
   */
  toothache: {
    subject: "ICON:STATUS:TOOTHACHE",
    size: 16,
    place: "BESIDE_HEAD",
    shift: -18,
  },
} as const;
