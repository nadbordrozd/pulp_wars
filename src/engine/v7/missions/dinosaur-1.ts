import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_1` "The Empty Nest" (docs/product/SAGA.md section 3.5, DN1; the
 * Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old Queen's
 * dinosaurs against Kessler's poachers, who stole her first clutch, on an
 * 11 x 11 island. Step 1 of 6: the Dinosaurs from scratch. A city lays an
 * Egg on a tile beside it (a Raptor hatches at your next turn), the Shaman
 * hatches an older Egg at once, and every dinosaur grows with its kills:
 * Big at one kill, Alpha at three, each step a full heal. The Old Queen is
 * a T-Rex, strong but alone; the poachers' Marksmen shoot her to pieces if
 * she walks in by herself.
 *
 * The board is the map generator's (Pangea 11, seed 16). Thunder Nest
 * stands on the north-eastern edge of the jungle; the poachers have two
 * beach camps, one on the western shore and one on the south-eastern. The
 * other villages are gone, the jungle's is yours to take.
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * numbers: against three Fighters and a rifle per camp the Queen alone
 * ate both camps by round 4; with two rifles each she was shot dead in
 * round 4.
 *
 * Retune 3 (`pulp_wars-hmyk.21`) made it a skirmish against twelve
 * rushing poachers, two crate-wagon waves and a 16-round clock; the user
 * found the campaign mostly impossible. Retune 4 (`pulp_wars-hmyk.27`,
 * hand-played, CAMPAIGN.md section 17.5) eases it toward the middle: a
 * level 2 nest with Drill, Nesting and 4 Coins, the jungle village back, no
 * waves, and a lax 20-round clock, against eleven poachers (two Guards,
 * four rifles, four clubs and a Champion) with Engineering and Metallurgy
 * who dig in for two rounds and then rush the nest.
 *
 * ```text
 *      x 0123456789A
 * y  0   ~~~~~~~~~~~
 *    1   ~~~^^....~~
 *    2   ~~^.ffffN.~      N: Thunder Nest
 *    3   ~^^fffffff~
 *    4   ~..f.^ffff~
 *    5   ~.G.ff^fvf~      G: Gunwale Camp; v: a village
 *    6   ~^^^^.f.$f~      $: treasure chests
 *    7   ~f^^f^..^f~
 *    8   ~..^^.$.T~~      T: Tusker's Landing
 *    9   ~~~^....~~~
 *   10   ~~~~~~~~~~~
 * ```
 */
export const DINOSAUR_1_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_1",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a skirmish start, no
  // village or chest in reach, a rushing, richer poacher and two waves.
  // Revision 4 (`pulp_wars-hmyk.27`, retune 4): a level 2 nest with Drill
  // and Nesting, the jungle village back, no waves, a 20-round clock.
  revision: 4,
  seed: 20261401,
  // <map>
  size: 11,
  source: {
    mapType: "PANGEA",
    size: 11,
    seats: 2,
    seed: 16,
    // The two camps stand on villages; the village in the south-western
    // pocket, walled in by peaks, is gone.
    edits: [
      { kind: "VILLAGE", at: { x: 2, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
      // Retune 3: the chests would be free Raptors for whoever walks
      // there first (retune 3 also took the jungle village; retune 4 gives
      // it back).
      { kind: "CHEST", at: { x: 8, y: 6 }, present: false },
      { kind: "CHEST", at: { x: 6, y: 8 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~",
    "~~~^^....~~",
    "~~^.ffff..~",
    "~^^fffffff~",
    "~..f.^ffff~",
    "~...ff^f.f~",
    "~^^^^.f.ff~",
    "~f^^f^..^f~",
    "~..^^....~~",
    "~~~^....~~~",
    "~~~~~~~~~~~",
  ],
  resources: [
    ".....ss.p.p",
    "...o...r...",
    "..o.gg.g..s",
    ".oo.g.gggg.",
    "p.......g..",
    "...r...g...",
    "soo....r..s",
    "..oo.oee...",
    "s...o....pp",
    ".spoereep..",
    ".....s.p...",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPP",
    "PPPHWWWWWPP",
    "PPHHWWWWWWP",
    "PHHHWWWWWWP",
    "PHHHHWWWWWP",
    "PHHHHHWWWWP",
    "PHHHHHPPWWP",
    "PHHHHHPPPWP",
    "PHHHHPPPPPP",
    "PPPHPPPPPPP",
    "PPPPPPPPPPP",
  ],
  villages: [{ x: 8, y: 5 }],
  treasureChests: [],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "DINOSAUR",
      // Retune 3 started you like a skirmish (a level 1 nest, nothing
      // else); retune 4: a level 2 nest, Drill and Nesting, 4 Coins. The
      // jungle is unseen, and the Old Queen and Oona are all you have.
      coins: 4,
      technologies: ["DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Thunder Nest",
          at: { x: 8, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a T-Rex, and Shaman Oona, who speaks for her.
        { role: "KNIGHT", at: { x: 8, y: 3 }, tag: "OLD_QUEEN" },
        { role: "CAPTAIN", at: { x: 8, y: 2 }, tag: "OONA" },
      ],
      reveal: { radius: 1 },
    },
    {
      // Kessler's poachers, Thunder Nest's eggs in their crates: a Guard
      // on each camp, two rifles behind it, and men with clubs.
      faction: "ORIGINAL",
      // Retune 3: a richer poacher with Gathering and Scouting, and twelve
      // men instead of seven. Retune 4: eleven, with a Champion, four
      // rifles, Engineering and Metallurgy, and 6 Coins.
      coins: 6,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Gunwale Camp",
          at: { x: 2, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Tusker's Landing",
          at: { x: 8, y: 8 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 5 } },
        { role: "MARKSMAN", at: { x: 1, y: 4 } },
        { role: "MARKSMAN", at: { x: 1, y: 5 } },
        { role: "FIGHTER", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 5 } },
        { role: "FIGHTER", at: { x: 2, y: 4 } },
        { role: "GUARD", at: { x: 8, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 7, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 6, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 7 }, home: 1 },
        { role: "SWORDSMAN", at: { x: 6, y: 7 }, home: 1 },
      ],
      // Thunder Nest, from the crates' trail.
      reveal: { radius: 1, rects: [{ x0: 7, y0: 1, x1: 9, y1: 3 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "FORESTRY",
        "SAWMILLING",
        "FIELDCRAFT",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "EXPLOSIVES",
        "SHORECRAFT",
        "NAVIGATION",
        "NAVAL_ENGINEERING",
        "SEAMANSHIP",
        "SUBMERSIBLES",
      ],
      // The poachers dig in for two rounds, then each camp keeps two men
      // on its centre and everyone else marches on the nest.
      directive: [
        {
          kind: "GUARD",
          zone: [
            { x0: 1, y0: 4, x1: 3, y1: 6 },
            { x0: 6, y0: 7, x1: 8, y1: 9 },
          ],
          garrison: 12,
          untilRound: 3,
        },
        {
          kind: "GUARD",
          zone: [
            { x0: 2, y0: 5, x1: 2, y1: 5 },
            { x0: 8, y0: 8, x1: 8, y1: 8 },
          ],
          garrison: 3,
          others: { kind: "RUSH" },
        },
      ],
    },
  ],
  forbiddenTechnologies: [],
  // Follow the boots: take both camps by round 20 (retune 3: 16). The
  // stars: by round 13, and the Old Queen lives.
  objective: {
    kind: "DOMINATION",
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 13 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
