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
 */
export const CULT_2_V7: MissionDefinitionV7 = {
  id: "CULT_2",
  // Revision 2 (`pulp_wars-hmyk.21`, the third retune): a thin start against
  // a rushing, reinforced archive guard.
  revision: 2,
  seed: 20261902,
  // <map>
  size: 14,
  source: {
    mapType: "DRY_LAND",
    size: 14,
    seats: 2,
    seed: 16,
    // The barrow camp and Candle Copse stand on villages; the three by
    // Cinderfield are gone, so the archive guard stays an archive guard.
    edits: [
      { kind: "VILLAGE", at: { x: 6, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
      // Retune 3: the villages by Greyhood are gone too.
      { kind: "VILLAGE", at: { x: 9, y: 3 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 10 }, present: false },
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
    { x: 6, y: 9 },
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
      // Retune 3: 3 Coins and Favour 4 (was 5 and 6).
      coins: 3,
      favour: 4,
      // Leadership (the Summoner) and Hexers; Gibbering Masses are a
      // research away through Drill, Engineering and Metallurgy.
      technologies: ["GATHERING", "ADMINISTRATION", "HUNTING", "MARKSMANSHIP"],
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
        { role: "FIGHTER", at: { x: 9, y: 5 } },
        { role: "FIGHTER", at: { x: 9, y: 7 } },
        { role: "MARKSMAN", at: { x: 10, y: 5 } },
      ],
      // The archive-town only (retune 3: no more of the Barrowlands).
      reveal: { radius: 2, rects: [{ x0: 3, y0: 4, x1: 3, y1: 4 }] },
    },
    {
      // The Marquis's archive guard.
      faction: "UNDEAD",
      coins: 5,
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
        // Retune 3: six more of the dead.
        { role: "FIGHTER", at: { x: 4, y: 3 } },
        { role: "FIGHTER", at: { x: 2, y: 5 } },
        { role: "GUARD", at: { x: 4, y: 5 } },
        { role: "FIGHTER", at: { x: 5, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 5 }, home: 1 },
        { role: "GUARD", at: { x: 7, y: 7 }, home: 1 },
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
      // rest of the dead march on Greyhood.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 2, y0: 3, x1: 4, y1: 5 }],
          garrison: 12,
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
  // Retune 3: three announced waves of the archive's dead.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      line: "The shelves open and the first of the filed dead step out, in order.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 2 } },
        { role: "FIGHTER", at: { x: 5, y: 3 } },
        { role: "GUARD", at: { x: 3, y: 3 } },
        { role: "FIGHTER", at: { x: 2, y: 3 } },
      ],
    },
    {
      seat: 1,
      round: 8,
      line: "A second sorting of the archive: Skeletons by height, Zombies by weight.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 5, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 4 } },
        { role: "GUARD", at: { x: 5, y: 5 } },
        { role: "GUARD", at: { x: 4, y: 6 } },
        { role: "FIGHTER", at: { x: 3, y: 6 } },
      ],
    },
    {
      seat: 1,
      round: 12,
      line: "The Marquis's last requisition: every body in the Barrowlands, signed for.",
      announce: true,
      units: [
        { role: "FIGHTER", at: { x: 6, y: 6 } },
        { role: "FIGHTER", at: { x: 7, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 6 } },
        { role: "FIGHTER", at: { x: 5, y: 7 } },
        { role: "GUARD", at: { x: 6, y: 7 } },
        { role: "FIGHTER", at: { x: 8, y: 6 } },
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
  // Cinderfield by round 15. The stars: by round 12, and no city lost.
  objective: {
    kind: "CAPTURE",
    places: ["CINDERFIELD"],
    byRound: 15,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 12 }, { kind: "KEEP_CITIES" }],
  },
};
