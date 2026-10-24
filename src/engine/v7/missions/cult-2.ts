import type { MissionDefinitionV7 } from "./types";

/**
 * `CULT_2` "One Wrong Note" (docs/product/SAGA.md section 3.9, CU2; the
 * Cult campaign, `pulp_wars-hmyk.12`). Brother Mallory is dead and the
 * Lodge has elected Mr. Pettigrew Hierophant by a show of one hand. You
 * lead it from Greyhood against the Ashen Marquis's archive guard: take
 * Cinderfield, where the Lullaby is filed, change one note, and let the
 * Marquis believe you came for the silver. Step 2 of 6: an enemy that
 * cannot be frightened. Skeletons shrug off shots, the dead rise again
 * from the Graves of the Barrowlands, and nothing living is Seized from
 * them; the daemons do the close work while the robed men stay back. The
 * Summoners know Gibbering Masses: a Mass on or beside a city needs no
 * strand, and enemies beside it move one tile.
 *
 * The board is the map generator's (Dry Land 14, seed 16): open plains,
 * Greyhood in the east and its hidden camp, Candle Copse, behind it; the
 * Barrowlands in the middle with their Graves and the barrow camp of the
 * dead; Cinderfield's walled archive-town in the west. The archive guard
 * keeps four at home (`GUARD`) and lets the rest roam.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   .^.f.^.f.^....
 *    1   f.............
 *    2   ............vf      v: villages
 *    3   ........fv...^
 *    4   ...C.f....$..f      C: Cinderfield; $: a treasure chest
 *    5   f.f....f.....f
 *    6   ......B...G...      B: the barrow camp; G: Greyhood
 *    7   fffff....f....
 *    8   ffv^f......^f^
 *    9   ...f..v...^.H^      H: Candle Copse
 *   10   f...^f...v^^ff
 *   11   ^f..ff..^$^^^.
 *   12   .f.f..vf.^^.v^
 *   13   ^^f^.^^^f.f.f^
 * ```
 *
 * The third retune (`pulp_wars-hmyk.21`, CAMPAIGN.md section 23.4, not
 * play-tested): a thin start. Greyhood alone at level 2 (Candle Copse is
 * gone) with four units, four technologies (no Masses yet), 3 Coins and
 * Favour 4; the villages by Greyhood are gone. Cinderfield is walled at
 * level 3 and the dead have twelve units and 5 Coins: six stay, the rest
 * rush from round 3, and three announced waves rise in rounds 4, 8 and 12.
 * The clock is 15 (was 18).
 *
 * The fourth retune (`pulp_wars-hmyk.33`, CAMPAIGN.md section 23.5,
 * hand-played): eased toward the middle. Greyhood with Pettigrew, a second
 * Summoner, two Initiates and a Hexer, five technologies (Hunting and Drill
 * as well), 5 Coins and Favour 5; the two villages by Greyhood are back.
 * The dead have thirteen (two Wights by Cinderfield and one at Barrow
 * Camp) and 3 Coins: thirteen hold to round 3, then six stay and the rest
 * rush; the three waves are cut. The clock is 20 (star 15).
 */
export const CULT_2_V7: MissionDefinitionV7 = {
  id: "CULT_2",
  // Revision 2 (`pulp_wars-hmyk.21`, the third retune): a thin start against
  // a rushing, reinforced archive guard.
  // Revision 3 (`pulp_wars-hmyk.33`, the fourth retune): eased toward the
  // middle.
  revision: 3,
  seed: 20261902,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 16,
    // The barrow camp and Candle Copse stand on villages; the three by
    // Cinderfield are gone, so the archive guard stays an archive guard
    // (retune 4: the two by Greyhood are back).
    edits: [
      { kind: "VILLAGE", at: { x: 6, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
    ],
  },
  terrain: [
    ".^.f.^.f.^....",
    "f.............",
    ".............f",
    "........f....^",
    ".....f.......f",
    "f.f....f.....f",
    "..............",
    "fffff....f....",
    "ff.^f......^f^",
    "...f......^..^",
    "f...^f....^^ff",
    "^f..ff..^f^^^.",
    ".f.f...f.^^..^",
    "^^f^.^^^f.f.f^",
  ],
  resources: [
    "ror.r..g..re..",
    "....r.eer..e..",
    "er.rrrr.re....",
    "rrre...r...e.o",
    ".e..r.rre...r.",
    ".....re....e..",
    "r...re.r.r.e..",
    "ggg...ee..rerr",
    "g.....e.eeeogo",
    "ee..r...rro...",
    "....o.r...oo.g",
    "......rro.ooor",
    ".ge.......oe..",
    "...oro.o.r.e..",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "WWPPPPPPPPPPPP",
    "WWWPPPPPPPPHHH",
    "WWWWPPPPPPHHHH",
    "WWWWWPPPPHHHHH",
    "WWWWWWPPHHHHHH",
    "WWWWWWWHHHHHHH",
    "WWWWWWWHHHHHHH",
  ],
  villages: [
    { x: 12, y: 2 },
    { x: 9, y: 3 },
    { x: 6, y: 9 },
    { x: 9, y: 10 },
    { x: 6, y: 12 },
    { x: 12, y: 12 },
  ],
  treasureChests: [
    { x: 10, y: 4 },
    { x: 9, y: 11 },
  ],
  // </map>
  // The Barrowlands: old Graves between the archive and the marsh.
  graves: [
    { x: 4, y: 5 },
    { x: 6, y: 5 },
    { x: 5, y: 6 },
    { x: 7, y: 7 },
    { x: 4, y: 3 },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CULT",
      // Retune 4: 5 Coins and Favour 5 (retune 3 3 and 4, was 5 and 6).
      coins: 5,
      favour: 5,
      // Leadership (the Summoner) and Hexers; Gibbering Masses are a
      // research away through Drill, Engineering and Metallurgy.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
      ],
      cities: [
        {
          name: "Greyhood",
          at: { x: 10, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Mr. Pettigrew, Hierophant, a Summoner now.
        { role: "CAPTAIN", at: { x: 10, y: 6 }, tag: "PETTIGREW" },
        { role: "CAPTAIN", at: { x: 9, y: 6 } },
        { role: "FIGHTER", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 9, y: 7 } },
        { role: "MARKSMAN", at: { x: 10, y: 5 } },
      ],
      // The archive-town and the camp only (retune 3: no more of the
      // Barrowlands).
      reveal: { radius: 2, rects: [{ x0: 3, y0: 4, x1: 6, y1: 6 }] },
    },
    {
      // The Marquis's archive guard.
      faction: "UNDEAD",
      coins: 3,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Cinderfield",
          at: { x: 3, y: 4 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        { name: "Barrow Camp", at: { x: 6, y: 6 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "MARKSMAN", at: { x: 2, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 6 }, home: 1 },
        { role: "GUARD", at: { x: 7, y: 6 }, home: 1 },
        // Retune 3's six more of the dead (two Skeletons are Wights now).
        { role: "SWORDSMAN", at: { x: 4, y: 3 } },
        { role: "SWORDSMAN", at: { x: 2, y: 5 } },
        { role: "GUARD", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 5 }, home: 1 },
        { role: "GUARD", at: { x: 7, y: 7 }, home: 1 },
        // Retune 4: a Wight holds Barrow Camp.
        { role: "SWORDSMAN", at: { x: 5, y: 5 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 7, y0: 4, x1: 12, y1: 8 }] },
      // Step 2 keeps to the lesson: Skeletons, Zombies and a Banshee; no
      // Ghouls, Liches or Vampires.
      forbiddenTechnologies: [
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FIELDCRAFT",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The archive keeps six at home (retune 3: was four); from round 3 the
      // rest of the dead march on Greyhood (retune 4: all thirteen hold
      // until then).
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 2, y0: 3, x1: 4, y1: 5 }],
          garrison: 13,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 2, y0: 3, x1: 4, y1: 5 }],
          garrison: 6,
          others: { kind: "RUSH" },
          fromRound: 3,
        },
      ],
    },
  ],
  landmarks: [
    { tag: "CINDERFIELD", at: { x: 3, y: 4 } },
    { tag: "GREYHOOD", at: { x: 10, y: 6 } },
  ],
  // A dry board.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Cinderfield by round 20 (retune 4; retune 3 15, was 18). The stars: by
  // round 15, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["CINDERFIELD"],
    byRound: 20,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 15 }, { kind: "KEEP_CITIES" }],
  },
};
