import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_3` "The Sea Road" (docs/product/SAGA.md section 3.5, DN3; the
 * Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old Queen's
 * dinosaurs, who have never needed to sail, across the Lost Sea after the
 * eggs: she must come within a tile of Big Top Bay on the mainland's
 * north-eastern shore by round 22, crossing embarked. Step 3 of 6: a
 * transport carrying your best unit is the weakest thing on the sea, so
 * the lane is cleared first. A Dugout rams harder after a run of two tiles
 * (Horned Prows), a Plesiosaur torpedoes unanswered and grows; War Rafts
 * are yours to research.
 *
 * The board is the map generator's (Archipelago 16, seed 9): the island
 * in the west with Fernmaw on its northern bay and the Crater inland; a
 * channel of open sea with the Baron's fort, Gullrock, on an islet at its
 * northern mouth (joined to the island by a diagonal step); the mainland
 * in the east, with Kessler's Wharf on its western shore and Big Top Bay,
 * a fishing village, on its north-east; the old Sea Serpent in the deep
 * water south of the channel (E1, mission curiosities). The Baron's last
 * warships are a blockade, not a navy: the Baron learns nothing, so his
 * Battleship, Submarine and two Patrol Boats keep to the shallows (no
 * Navigation), the Battleship's guns covering the whole
 * northern lane. His landing parties come ashore on the island's western
 * beaches in rounds 4, 8 and 12. Gullrock's garrison holds the islet
 * (`GUARD`) and the rest of his men hunt you (`others: RUSH`).
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * numbers: with Hunting, Drill and the naval tree Gullrock and the Wharf
 * grew two levels a turn on fish, pearls, Ports and Workshops, took Big
 * Top Bay and launched a Patrol Boat a turn; Gullrock's pearls, fruit and
 * fish are gone.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~~~~~~~~~~~~~~
 *    2   ~~.~~~~~~~~~~~~~
 *    3   f~v.~~G~~~f~fB~~      G: Gullrock; B: Big Top Bay; v: villages
 *    4   ~~f.P~.~~~.~.f.f      P: Fernmaw's Port
 *    5   .f.F..~~~~~^^ff.      F: Fernmaw
 *    6   f...f~~~~~~~^f..
 *    7   ...ff.~~~~f^..ff
 *    8   .$..~^~~~f~Wf.ff      W: Kessler's Wharf; $: treasure chests
 *    9   ^fC..~~~~~~fff..      C: the Crater
 *   10   .f..~.~~~f.ffff^
 *   11   ^^v~fv~~~..fff$~
 *   12   ~~~~..~~~~~~f.~.
 *   13   f~^..~~~@~~~~~~f      @: the Sea Serpent
 *   14   ~~~~~~~~~~~~~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const DINOSAUR_3_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_3",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 2,
  seed: 20261403,
  // <map>
  size: 16,
  source: {
    mapType: "ARCHIPELAGO",
    size: 16,
    seats: 2,
    seed: 9,
    // The mainland's other villages would hand the Wharf more towns.
    edits: [
      { kind: "VILLAGE", at: { x: 14, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 14, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 11 }, present: false },
      // Gullrock is a fort, not a town: no pearls, fruit or fish round it.
      { kind: "RESOURCE", at: { x: 5, y: 2 }, resource: "." },
      { kind: "RESOURCE", at: { x: 5, y: 4 }, resource: "." },
      { kind: "RESOURCE", at: { x: 6, y: 4 }, resource: "." },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "~~.~~~~~~~~~~~~~",
    "f~..~~.~~~f~f.~~",
    "~~f.~.~~~~.~.f.f",
    ".f....~~~~~^^ff.",
    "f...f~~~~~~~^f..",
    "...ff.~~~~f^..ff",
    "....~^~~~f~.f.ff",
    "^f...~~~~~~fff..",
    ".f..~.~~~f.ffff^",
    "^^.~f.~~~..fff.~",
    "~~~~..~~~~~~f.~.",
    "f~^..~~~~~~~~~~f",
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "p...p.p..pp.....",
    "..s.............",
    "s.rp.....p......",
    "g..r.....sgs..s.",
    "s...........e..g",
    "r.e.rr...p.o.g..",
    ".e.r.pp.........",
    ".r......psgoeegg",
    "..ersos..g...e..",
    "og.re..p...g....",
    "rgees..pp.egg...",
    "oo.s.....e..gg..",
    ".psseep.....g...",
    ".sor.s....p...s.",
    ".p..s...p...p..s",
    "..p......p.p....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPWPWWPP",
    "PPPPPPPPPPWPWWWW",
    "PPPPPPPPPPPWWWWW",
    "PPPPPPPPPPPPWWWW",
    "HPPPPPPPPPWWWWWW",
    "HHPPPPPPPWPWWWWW",
    "HHPPPPPPPPPWWWWW",
    "HHPPPPPPPPWWWWWW",
    "HHPPPPPPPPPWWWWP",
    "PPPPPPPPPPPPWWPW",
    "HPHHPPPPPPPPPPPW",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 2, y: 3 },
    { x: 13, y: 3 },
    { x: 2, y: 11 },
    { x: 5, y: 11 },
  ],
  treasureChests: [
    { x: 1, y: 8 },
    { x: 14, y: 11 },
  ],
  // </map>
  improvements: [
    // Fernmaw's Port on its northern bay and the Wharf's.
    { at: { x: 4, y: 4 }, improvement: "PORT" },
    { at: { x: 10, y: 8 }, improvement: "PORT" },
  ],
  // The old serpent of the deep water south of the channel.
  curiosities: [{ kind: "SEA_SERPENT", at: { x: 8, y: 13 } }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DINOSAUR",
      coins: 8,
      // Dugouts (the first ships of the Dinosaur fleet) and Navigation for
      // the deep water; the Shaman and Raptors.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "SCOUTING",
        "SHORECRAFT",
        "NAVIGATION",
        "SEAMANSHIP",
      ],
      cities: [
        {
          name: "Fernmaw",
          at: { x: 3, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "The Crater",
          at: { x: 2, y: 9 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a T-Rex, who must cross the sea.
        { role: "KNIGHT", at: { x: 3, y: 4 }, tag: "OLD_QUEEN" },
        { role: "CAPTAIN", at: { x: 3, y: 5 }, home: 1 },
        { role: "PATROL_BOAT", at: { x: 4, y: 3 } },
        { role: "FIGHTER", at: { x: 2, y: 9 }, home: 1 },
        { role: "RAIDER", at: { x: 3, y: 8 }, home: 1 },
      ],
      // The channel, Gullrock and the mainland's northern shore.
      reveal: {
        radius: 2,
        rects: [
          { x0: 4, y0: 1, x1: 15, y1: 5 },
          { x0: 5, y0: 6, x1: 11, y1: 13 },
        ],
      },
    },
    {
      // The Baron's last warships, Gullrock fort and Kessler's Wharf.
      faction: "ORIGINAL",
      coins: 5,
      // Sailing and Navigation and nothing else: the last ships are all
      // the Baron has (hand play: with game, fish, fruit and pearls,
      // Workshops and Ports, Gullrock and the Wharf grew two levels a turn
      // and took Big Top Bay).
      technologies: [],
      cities: [
        {
          name: "Gullrock",
          at: { x: 6, y: 3 },
          level: 1,
          rewards: [],
        },
        {
          name: "Kessler's Wharf",
          at: { x: 11, y: 8 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 6, y: 3 } },
        // The fleet keeps to the shallows (no Navigation): the
        // Battleship over the northern lane, the Submarine off Big Top
        // Bay, the Patrol Boats by Gullrock (hand play: free to sail, the
        // Battleship shelled Fernmaw's port in round 2).
        { role: "BATTLESHIP", at: { x: 9, y: 3 } },
        { role: "PATROL_BOAT", at: { x: 7, y: 3 } },
        { role: "PATROL_BOAT", at: { x: 6, y: 4 }, home: 1 },
        { role: "SUBMARINE", at: { x: 11, y: 4 }, home: 1 },
        { role: "GUARD", at: { x: 11, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 8 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 0, y0: 2, x1: 5, y1: 7 }] },
      forbiddenTechnologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      // Gullrock's garrison holds the islet; the rest hunt you.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 6, y0: 3, x1: 6, y1: 3 }],
        garrison: 1,
        others: { kind: "RUSH" },
      },
    },
  ],
  // The Baron's landing parties on the island's western shore, in rounds
  // 4, 8 and 12, for Fernmaw and the Crater.
  reinforcements: [
    {
      seat: 1,
      round: 4,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 1, y: 7 } },
      ],
    },
    {
      seat: 1,
      round: 8,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 10 } },
        { role: "FIGHTER", at: { x: 0, y: 8 } },
        { role: "MARKSMAN", at: { x: 0, y: 7 } },
      ],
    },
    {
      seat: 1,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 6 } },
        { role: "FIGHTER", at: { x: 1, y: 7 } },
        { role: "MARKSMAN", at: { x: 0, y: 6 } },
      ],
    },
  ],
  landmarks: [{ tag: "BIG_TOP_BAY", at: { x: 13, y: 3 }, name: "Big Top Bay" }],
  forbiddenTechnologies: [],
  // The Queen to Big Top Bay by round 22. The stars: by round 18, and no
  // city lost.
  objective: {
    kind: "ESCORT",
    unit: "OLD_QUEEN",
    to: "BIG_TOP_BAY",
    within: 1,
    byRound: 22,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 18 }, { kind: "KEEP_CITIES" }],
  },
};
