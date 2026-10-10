/**
 * Small monochrome interface glyphs for the Ruleset 7 HUD and docks.
 * They inherit `currentColor` so they follow the active theme; game art
 * (units, terrain, buildings, coins, population) stays PixelLab-generated.
 */
export type UiIconIdV7 =
  | "hp"
  | "attack"
  | "defense"
  | "move"
  | "range"
  | "sight"
  | "menu"
  | "tech"
  | "close"
  | "zoom-in"
  | "zoom-out"
  | "skip"
  | "trophy"
  | "info"
  | "units"
  | "skull"
  | "grave"
  | "devour"
  | "wail"
  | "plague"
  | "bite"
  | "goblin"
  | "dinosaur"
  | "bomb"
  | "egg"
  | "hatch"
  | "stampede"
  // The Martian revision (bead pulp_wars-t6s.4).
  | "martian"
  | "shield"
  | "cooling"
  | "beam-down"
  | "mind-control"
  | "tractor-beam"
  // The Ice Folk revision (bead pulp_wars-7g3.6).
  | "snowflake"
  | "bolas"
  | "ice-peak"
  // The Dwarf revision (bead pulp_wars-78i.6).
  | "gear"
  | "drill"
  | "bomb-run"
  | "key"
  // Dwarf crowd control (`pulp_wars-w49.34`): three hammer heads swept
  // round a hub (Whirl), and sharpened stakes bound by a band (Barricade).
  | "whirl"
  | "barricade"
  // The Candy polish (bead pulp_wars-jdb.9): a wrapped sweet, the Candy
  // badge over stand-in art.
  | "sweet"
  // The Mind Control revision (bead pulp_wars-b5f.3): a brain, the badge of
  // a mind-controlled unit.
  | "brain"
  // The naval branch interface (bead pulp_wars-5ti.7): a grappling hook
  // (Board, Boardable) and a periscope over a wave (Submerged).
  | "grapple"
  | "periscope"
  // Sound (bead pulp_wars-2yc.10): a loudspeaker with waves, the same
  // crossed out, and a play triangle for the sound test.
  | "sound"
  | "sound-off"
  // Music (bead pulp_wars-2yc.27): a pair of beamed notes, and the same
  // crossed out.
  | "music"
  | "music-off"
  | "play"
  // The main menu (bead pulp_wars-2yc.18): a pennant for the campaign and
  // a chevron for the way back.
  | "flag"
  | "back"
  // Score and modes (bead pulp_wars-kaw6.3, RULESET_7_SCORE_AND_STARS.md
  // section 7 item 8): a five-pointed star, filled for an earned star and
  // outlined for one still to earn.
  | "star"
  | "star-outline"
  // The Cultists (bead pulp_wars-mch9.17): a lit candle, the Favour of the
  // HUD and the leaderboard and the Sacrifice and Offering buttons: the
  // LEGACY and stand-in glyph until the art registers `ICON:HUD:CULT:FAVOUR`
  // and the action icons.
  | "candle"
  // The leaderboard's alliance setting (bead pulp_wars-2yc.45): two linked
  // rings, the mark of "AIs allied" and of every allied AI row.
  | "allied";

/** The star of the grade (shared by its filled and outlined forms). */
const STAR =
  "M12 2.8l2.75 5.9 6.45.75-4.78 4.4 1.28 6.37L12 17.02l-5.7 3.2 1.28-6.37L2.8 9.45l6.45-.75Z";

/** The Mind Control brain's two lobes (shared by its outline and parts). */
const BRAIN_LOBES =
  "M8.7 5.4a5.3 6.6 0 1 0 0 13.2 5.3 6.6 0 1 0 0-13.2ZM15.3 5.4a5.3 6.6 0 1 0 0 13.2 5.3 6.6 0 1 0 0-13.2Z";

const PATHS: Readonly<Record<UiIconIdV7, string>> = {
  star: STAR,
  "star-outline": STAR,
  hp: "M12 20.5 4.2 12.8a4.6 4.6 0 0 1 6.5-6.5L12 7.6l1.3-1.3a4.6 4.6 0 0 1 6.5 6.5Z",
  attack: "M20 4 9.5 14.5M20 4h-4.5M20 4v4.5M6.5 11.5l6 6M9.5 14.5 4 20",
  defense: "M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6Z",
  move: "M4 12h14M13 6.5 18.5 12 13 17.5",
  range:
    "M12 3v4m0 10v4M3 12h4m10 0h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 3.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z",
  sight:
    "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z",
  menu: "M4 6.5h16M4 12h16M4 17.5h16",
  tech: "M9 3h6M10 3v6.2L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 9.2V3M7.5 14h9",
  close: "M6 6l12 12M18 6 6 18",
  "zoom-in": "M5 12h14M12 5v14",
  "zoom-out": "M5 12h14",
  skip: "M4 6l7 6-7 6ZM13 6l7 6-7 6Z",
  trophy:
    "M8 4h8v5a4 4 0 0 1-8 0ZM8 6H4.5v1.5A3.5 3.5 0 0 0 8 11M16 6h3.5v1.5A3.5 3.5 0 0 1 16 11M12 13v4M8.5 20h7M9.5 17h5v3h-5Z",
  units:
    "M12 3.5a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6ZM4.5 20.5c0-4.1 3.4-7.4 7.5-7.4s7.5 3.3 7.5 7.4Z",
  info: "M12 11v6M12 7.2v.1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  skull:
    "M12 3a7.5 7.5 0 0 0-5 13.1V19a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-2.9A7.5 7.5 0 0 0 12 3Zm-3 8.2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm6 0a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM11 17v3m2-3v3",
  grave: "M7 20V9.5a5 5 0 0 1 10 0V20M4 20h16M12 9v6M9.5 11.5h5",
  devour:
    "M4 9c2 3 14 3 16 0M4 9l2 6c3 3 9 3 12 0l2-6M8 10.5l1 2 1-2M14 10.5l1 2 1-2",
  wail: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14",
  // Revision 14: a miasma cloud with falling drops, and a bite of two jaws.
  plague:
    "M7.5 15.5a3.5 3.5 0 0 1-.4-7A5 5 0 0 1 16.6 7.6a3.9 3.9 0 0 1 .4 7.9ZM9 18.5v1.5M12.5 18.5v2.5M16 18.5v1.5",
  bite: "M4 8.5l2.7 4.5 2.6-4.5 2.7 4.5 2.7-4.5 2.6 4.5L20 8.5M5.5 18l2.3-3.5 2.4 3.5 1.8-3.5 1.8 3.5 2.4-3.5 2.3 3.5",
  // Revision 17: a goblin head with long sideways ears (the Goblin badge;
  // the eyes are even-odd holes when filled). The Kaboom! bomb is drawn
  // from BOMB_PARTS; this path is only its single-stroke outline (ball, cap
  // and a fuse rising straight up).
  goblin:
    "M12 7.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM7.4 10.6 1.8 8.4l5.4 5ZM16.6 10.6l5.6-2.2-5.4 5ZM10 11.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2ZM14 11.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z",
  // Revision 19: a three-toed footprint (the Dinosaur badge, filled).
  dinosaur:
    "M12 13a4 3.6 0 1 0 0 7.2 4 3.6 0 0 0 0-7.2ZM12 3.5 10.2 11h3.6ZM5.5 6.5 7.6 13l3-1.8ZM18.5 6.5 16.4 13l-3-1.8Z",
  bomb: "M12 8.8a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2ZM10.5 8.8v-2h3v2M12 6.8c0-1.7.6-2.9 2-3.6",
  // Revision 19: an egg (the Lay Egg cue, filled), an egg with a zigzag
  // crack (Hatch), and a double chevron running into a bar (the Charge!
  // ability since revision 20; formerly the Stampede command).
  egg: "M12 2c-4.4 0-8 6-8 11.5a8 8 0 0 0 16 0C20 8 16.4 2 12 2Z",
  hatch:
    "M12 2c-4.4 0-8 6-8 11.5a8 8 0 0 0 16 0C20 8 16.4 2 12 2ZM4.3 12.5l3.4 2.3 3-3 3 3 5.9-2.8",
  stampede: "M3.5 6.5 9 12l-5.5 5.5M10.5 6.5 16 12l-5.5 5.5M20 5v14",
  // The Martian revision: a flying saucer (the Martian badge, filled), a
  // hexagon Shield, three rising heat lines (Cooling), a saucer shining a
  // beam down (Beam Down), a spiral (Mind Control) and a cone with hoops
  // (Tractor Beam): LEGACY glyphs; CHIBI draws the PixelLab icons.
  martian:
    "M7.6 10.2a4.4 4.4 0 0 1 8.8 0ZM2.5 12.6c0-1.6 4.3-2.9 9.5-2.9s9.5 1.3 9.5 2.9-4.3 2.9-9.5 2.9-9.5-1.3-9.5-2.9Z",
  shield: "M12 2.5 20 7v10l-8 4.5L4 17V7Z",
  cooling:
    "M7 20c-2-3 2-5 0-8s2-5 0-8M12 20c-2-3 2-5 0-8s2-5 0-8M17 20c-2-3 2-5 0-8s2-5 0-8",
  "beam-down":
    "M7.5 6.5a4.5 4.5 0 0 1 9 0M3.5 8.5h17M8.5 11 6 20M15.5 11 18 20M12 12.5v5M10 15.5l2 2 2-2",
  "mind-control":
    "M12 12a1.5 1.5 0 0 1 3 0 3 3 0 0 1-6 0 4.5 4.5 0 0 1 9 0 6 6 0 0 1-12 0 7.5 7.5 0 0 1 15 0",
  "tractor-beam": "M12 3 5 20h14ZM8.3 15h7.4M9.8 10h4.4",
  // The Ice Folk revision: a six-spoke snowflake with barbs (Cold Snap and
  // Frozen), two weights on a cord (Bolas), and a snow-capped peak (the Ice
  // Folk badge, filled): LEGACY glyphs; CHIBI draws the PixelLab icons.
  "ice-peak":
    "M12 3.5 21.5 19.5h-19ZM12 3.5l3.6 6.1-1.6 1-1-1.4-1 1.4-1-1.4-1.6 1Z",
  snowflake:
    "M12 2.5v19M3.8 7.25l16.4 9.5M3.8 16.75l16.4-9.5M9.6 4.2 12 6.6l2.4-2.4M9.6 19.8 12 17.4l2.4 2.4M3.5 10.6l3.3.9-.9-3.3M20.5 13.4l-3.3-.9.9 3.3M5.9 16.5l.9-3.3-3.3.9M18.1 7.5l-.9 3.3 3.3-.9",
  bolas:
    "M7 15.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM17 15.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM8.6 16 12 4l3.4 12M12 4l-1.6-1.5M12 4l1.6-1.5",
  // The Dwarf revision: a cog (the Dwarf badge and the clockwork glyph), a
  // drill boring into the ground (Tunnel), a bomb under a rotor (Bomb Run)
  // and a wind-up key (Assemble): LEGACY glyphs; CHIBI draws the PixelLab
  // icons.
  gear: "M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M5.5 18.5l2.1-2.1M16.4 7.6l2.1-2.1M12 6.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6ZM12 9.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8Z",
  drill:
    "M7.5 2.5h9L12 15.5ZM9.2 6.5h5.6M10.5 10.5h3M2.5 19.5c3-2.5 16-2.5 19 0M6 17.5l1.6 2.5M18 17.5l-1.6 2.5",
  "bomb-run":
    "M3.5 3.5h17M12 3.5v3.5M12 9.5a5.2 5.2 0 1 0 0 10.4 5.2 5.2 0 0 0 0-10.4ZM15.4 10.4l1.8-1.8",
  key: "M12 10.5 7 6.2a2.6 2.6 0 1 0 0 8.6L12 10.5l5 4.3a2.6 2.6 0 1 0 0-8.6ZM12 10.5v10.5M9.5 18h5",
  // The Candy polish: a round sweet with two twisted wrapper ends (the
  // Candy badge, filled).
  sweet:
    "M12 7.8a4.2 4.2 0 1 0 0 8.4 4.2 4.2 0 0 0 0-8.4ZM7.9 12 3 8.4v7.2ZM16.1 12 21 8.4v7.2Z",
  whirl:
    "M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM12 9.5V4M14.2 13.2l4.7 2.8M9.8 13.2 5.1 16M9.5 2.5h5v3h-5ZM17.6 15.6l2.5 4.3 2.6-1.5-2.5-4.3ZM6.4 15.6l-2.5 4.3-2.6-1.5 2.5-4.3ZM4.5 8.5a8.5 8.5 0 0 1 4-4M19.5 8.5a8.5 8.5 0 0 0-4-4",
  barricade:
    "M4.5 20.5V8L6.5 4.5 8.5 8v12.5M10 20.5V9.5l2-3.5 2 3.5v11M15.5 20.5V8l2-3.5 2 3.5v12.5M3 11.5h18v2.5H3ZM3 16h18v2.5H3ZM2.5 21h19",
  brain: BRAIN_LOBES,
  // The naval branch interface: a hook on a ringed shank, and a periscope
  // over a wave: LEGACY and stand-in glyphs until the art registers icons.
  grapple:
    "M14.5 2.8a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2ZM14.5 6v9a4.5 4.5 0 0 1-9 0v-3M5.5 12l-2.2 2.6M5.5 12l2.4 2.4",
  periscope:
    "M10 15V5.5h6V9M3 17.5c1.5-1.6 3-1.6 4.5 0s3 1.6 4.5 0 3-1.6 4.5 0 3 1.6 4.5 0",
  sound:
    "M4 9.5h3.5L12 5.5v13l-4.5-4H4ZM15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11",
  "sound-off": "M4 9.5h3.5L12 5.5v13l-4.5-4H4ZM16 9.5l5 5M21 9.5l-5 5",
  music:
    "M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM9 9.5l10-2",
  "music-off":
    "M9 17.5V6l10-2v11.5M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM19 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM3.5 3.5l17 17",
  play: "M8 5.5v13l10.5-6.5Z",
  flag: "M6 21V3.5M6 4.5h12.5l-3 4 3 4H6",
  back: "M14.5 5 7.5 12l7 7",
  allied:
    "M3.5 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0M10.5 12a5 5 0 1 0 10 0 5 5 0 1 0-10 0",
  // A fat candle on a dish, a short wick and a teardrop flame.
  candle:
    "M8.5 11.5h7V20h-7ZM5.5 20.5h13M12 11.5V9.8M12 2.6c1.9 2 2.7 3.3 2.7 4.5a2.7 2.7 0 0 1-5.4 0c0-1.2.8-2.5 2.7-4.5Z",
};

/**
 * The Cultists (bead pulp_wars-mch9.17): the Favour candle as a sprite that
 * flies to the Favour counter, in the Cult's fixed colours (cream wax, the
 * green flame; docs/art/factions/CULT.md): the stand-in until the art
 * registers `ICON:HUD:CULT:FAVOUR`, and the candle of the LEGACY set.
 */
export const FAVOUR_CANDLE_SPRITE_URL_V7 = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M8.5 11.5h7V20h-7Z" fill="#f3e7c4" stroke="#1a1410" stroke-width="1.6"/>' +
    '<path d="M5.5 20.5h13M12 11.5V9.8" fill="none" stroke="#1a1410" stroke-width="1.8"/>' +
    '<path d="M12 2.6c1.9 2 2.7 3.3 2.7 4.5a2.7 2.7 0 0 1-5.4 0c0-1.2.8-2.5 2.7-4.5Z" fill="#00d868" stroke="#0a6638" stroke-width="1.4"/>' +
    "</svg>",
)}`;

/** One shape of a multi-part icon; `fill` may be a fixed colour. */
interface IconPartV7 {
  readonly d: string;
  readonly fill: string;
  readonly stroke: string;
  readonly width: number;
}

/** The bomb's iron, and the hairline that keeps it off the dark dock. */
const BOMB_IRON = "#18191d";
const BOMB_EDGE = "#5d616c";

/**
 * Revision 17 Kaboom! (docs/art/factions/GOBLIN.md: "a round black bomb with
 * a lit cream fuse and a pale spark"), drawn after the CHIBI raster
 * (`pulp_wars-0ao.17`): a solid black ball with only a hairline grey edge and
 * a soft glint, a fuse cap on top, a short fuse rising straight up and
 * curving slightly right (cream in the button's colour over a dark
 * under-stroke, so it shows on any background), and a pale four-point spark
 * at its tip. Nothing leaves the ball's edge diagonally, so it cannot read
 * as a ring with a stroke (the male symbol).
 */
const BOMB_PARTS: readonly IconPartV7[] = [
  {
    d: "M10.5 6.8h3v3.2h-3Z",
    fill: BOMB_IRON,
    stroke: BOMB_EDGE,
    width: 0.6,
  },
  {
    d: "M12 8.8a6.6 6.6 0 1 0 0 13.2 6.6 6.6 0 0 0 0-13.2Z",
    fill: BOMB_IRON,
    stroke: BOMB_EDGE,
    width: 0.6,
  },
  {
    d: "M8.5 14.1a1.1 1.8 40 1 0 2.3-2.7 1.1 1.8 40 1 0-2.3 2.7Z",
    fill: "#8d929e",
    stroke: "none",
    width: 0,
  },
  {
    d: "M12 6.8c0-1.7.6-2.9 2-3.6",
    fill: "none",
    stroke: BOMB_IRON,
    width: 2.6,
  },
  {
    d: "M12 6.8c0-1.7.6-2.9 2-3.6",
    fill: "none",
    stroke: "currentColor",
    width: 1.4,
  },
  {
    d: "M15 .2l.9 1.9 1.9.9-1.9.9-.9 1.9-.9-1.9-1.9-.9 1.9-.9Z",
    fill: "#fff8d0",
    stroke: BOMB_IRON,
    width: 0.6,
  },
];

/**
 * The Mind Control revision: a brain seen from the side, two lobes filled
 * in the icon's colour (the Martian faction colour in the dock) with their
 * folds darkened over it, like the board's brain chip.
 */
const BRAIN_PARTS: readonly IconPartV7[] = [
  {
    d: BRAIN_LOBES,
    fill: "currentColor",
    stroke: "rgba(0, 0, 0, 0.55)",
    width: 1,
  },
  {
    d: "M12 5.8v12.4M5.4 10.6c1.6.9 2.9.3 3.6-1.2M5.6 14.8c2-.2 3 .7 3.3 2.1M18.6 10.6c-1.6.9-2.9.3-3.6-1.2M18.4 14.8c-2-.2-3 .7-3.3 2.1",
    fill: "none",
    stroke: "rgba(0, 0, 0, 0.55)",
    width: 1.3,
  },
];

const PARTS: Partial<Record<UiIconIdV7, readonly IconPartV7[]>> = {
  bomb: BOMB_PARTS,
  brain: BRAIN_PARTS,
};

const FILLED: ReadonlySet<UiIconIdV7> = new Set([
  "star",
  "hp",
  "defense",
  "skip",
  "units",
  "egg",
  "martian",
]);

export function uiIconV7(
  documentRoot: Document,
  id: UiIconIdV7,
  className = "v7-ui-icon",
): SVGSVGElement {
  const svg = documentRoot.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", className);
  svg.dataset.icon = id;
  const parts = PARTS[id];
  if (parts !== undefined) {
    for (const part of parts) {
      const shape = documentRoot.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      shape.setAttribute("d", part.d);
      shape.setAttribute("fill", part.fill);
      shape.setAttribute("stroke", part.stroke);
      shape.setAttribute("stroke-width", String(part.width));
      shape.setAttribute("stroke-linecap", "round");
      shape.setAttribute("stroke-linejoin", "round");
      svg.append(shape);
    }
    return svg;
  }
  const path = documentRoot.createElementNS(
    "http://www.w3.org/2000/svg",
    "path",
  );
  path.setAttribute("d", PATHS[id]);
  path.setAttribute("fill", FILLED.has(id) ? "currentColor" : "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "2");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}
