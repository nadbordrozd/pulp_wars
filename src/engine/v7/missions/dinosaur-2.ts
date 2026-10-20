import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_2` "Big Game" (docs/product/SAGA.md section 3.5, DN2; the
 * Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old Queen's
 * dinosaurs into the tar country after Major Basil Thornbury, the Baron's
 * great white hunter (a tagged Marksman), who has the Queen's eggs in a
 * crate, and must kill him by round 20. Step 2 of 6: a ranged killer
 * behind guards on rough ground. The Major stands on the highest peak of
 * the ridge over his lodge, every tile beside him a Mountain, and never
 * leaves it (`GUARD` on his tile alone); his gun-bearers (two rifles, two
 * Guards and the lodge's men) play their ordinary game round him. The tar
 * peaks are too steep for a dinosaur (no Engineering, Armoury or
 * Wallbreaker for you), so only range reaches him: a Spitter's Acid
 * ignores the cover and walls he hides behind. His Redcap trackers march
 * on your nests from their two camps from the first round (`RUSH`), with
 * more packs in rounds 5 and 9; a Caveman hits harder beside a dinosaur
 * (Pack Hunt).
 *
 * The board is the map generator's (Pangea 14, seed 4): open plains in the
 * north with Thunder Nest (retune 3: Fernmaw is gone); a massif of peaks in the middle and
 * the south-west, with Tarpit Lodge in the pocket behind its southern
 * ridge; wooded hills in the east. The Redcaps camp in the two valleys:
 * the strip of the western shore and the gap between the massif and the
 * woods. Four villages are gone (the two camps and the two of the south
 * that would feed the Redcaps), and the two chests by the eastern camp.
 *
 * Retune 3 (`pulp_wars-hmyk.21`, untested): you start like a skirmish
 * (a level 1 nest, the Old Queen and one Spitter, no technology, no
 * Coins), the four villages near the nest are gone, the lodge is level 2
 * with eleven men, of whom the Major and three guns hold the ridge and
 * the rest rush the nest, and eleven Redcaps rush with four announced
 * packs (rounds 3, 6, 9, 12) on a 16-round clock.
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * layout: with Thornbury on the ridge over the lodge and Engineering
 * yours, the Queen fed on the Redcaps and rampaged into him in round 4.
 *
 * ```text
 *      x 0123456789ABCD
 * y  0   ~~~~~~~~~~~~~~
 *    1   ~~~........~~~
 *    2   ~~......v..f~~      v: villages
 *    3   ~~ffT....f..^~      T: Thunder Nest
 *    4   ~^f^f.f.....f~
 *    5   ~v^^^.f.vfff.~
 *    6   ~^^fv^f.ff^ff~
 *    7   ~.f^^^^^.^ff.~
 *    8   ~.^^H^^G.fff.~      H: Thornbury's peak; G: Gutter Gulch
 *    9   ~R^^^^^f.fff.~      R: Redcap Hollow
 *   10   ~~f.L.^^^f.f.~      L: Tarpit Lodge
 *   11   ~~..f.^^.^f.~~
 *   12   ~~~~^f.^..f~~~
 *   13   ~~~~~~~~~~~~~~
 * ```
 */
export const DINOSAUR_2_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_2",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a skirmish start, the
  // villages near the nest gone, a bigger lodge and four Redcap waves.
  revision: 3,
  seed: 20261402,
  // <map>
  size: 14,
  source: {
    mapType: "PANGEA",
    size: 14,
    seats: 3,
    seed: 4,
    // The Redcap camps stand on villages; the two villages of the south
    // and the chests by Gutter Gulch would feed the Redcaps.
    edits: [
      { kind: "VILLAGE", at: { x: 1, y: 9 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 11, y: 11 }, present: false },
      { kind: "CHEST", at: { x: 7, y: 9 }, present: false },
      { kind: "CHEST", at: { x: 8, y: 9 }, present: false },
      // Retune 3: the four villages of the north are gone.
      { kind: "VILLAGE", at: { x: 8, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 6 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~",
    "~~~........~~~",
    "~~.........f~~",
    "~~ff.....f..^~",
    "~^f^f.f.....f~",
    "~.^^^.f..fff.~",
    "~^^f.^f.ff^ff~",
    "~.f^^^^^.^ff.~",
    "~.^^^^^..fff.~",
    "~.^^^^^f.fff.~",
    "~~f...^^^f.f.~",
    "~~..f.^^.^f.~~",
    "~~~~^f.^..f~~~",
    "~~~~~~~~~~~~~~",
  ],
  resources: [
    "p.ps..s..s....",
    "...e.rrr.r.p..",
    "..re.ree..eg..",
    ".....r.ee.....",
    ".o.ogeg.er.rgs",
    "...oo..e......",
    "soo..o..g..g.s",
    "pe.oo.ooeo....",
    "s.ooooo..g.g..",
    "..ooooo..ggg..",
    "p..r.e.ooge...",
    ".srr.eo......p",
    ".p.....oer....",
    ".....s.s....pp",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPP",
    "PHHHHPPPPPPPWP",
    "PHHHHHPPPPPWWP",
    "PHHHHHHPPPWWWP",
    "PHHHHHHHHWWWWP",
    "PHHHHHHHHWWWWP",
    "PHHHHHHHHWWWWP",
    "PPHHHHHHHWWWWP",
    "PPHHHHHHHWWWPP",
    "PPPPHHHHHWWPPP",
    "PPPPPPPPPPPPPP",
  ],
  villages: [],
  treasureChests: [],
  // </map>
  aiMode: "RIVAL",
  // Thornbury's lodge and his Redcap trackers are one side.
  teams: [0, 1, 1],
  seats: [
    {
      faction: "DINOSAUR",
      // Retune 3: a skirmish start. One nest at level 1, no technology and
      // no Coins; the Old Queen and one Spitter (Marksmanship and Hunting
      // are yours to research before you can raise another), the tar
      // country unseen.
      coins: 0,
      technologies: [],
      cities: [
        {
          name: "Thunder Nest",
          at: { x: 4, y: 3 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        // The Old Queen, a T-Rex.
        { role: "KNIGHT", at: { x: 4, y: 4 }, tag: "OLD_QUEEN" },
        { role: "MARKSMAN", at: { x: 5, y: 3 } },
      ],
      // The tar peaks are too steep for a dinosaur: no Engineering, and
      // no Wallbreaker to blast them (the lesson is the Spitter's Acid).
      forbiddenTechnologies: ["ENGINEERING", "METALLURGY", "EXPLOSIVES"],
      reveal: { radius: 1 },
    },
    {
      // Major Thornbury's shooting lodge at Tarpit: the Major and his
      // gun-bearers on the peaks of the ridge.
      faction: "ORIGINAL",
      // Retune 3: a level 2 lodge with Gathering and Scouting, 8 Coins.
      coins: 8,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "ENGINEERING",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Tarpit Lodge",
          at: { x: 4, y: 10 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Major Basil Thornbury, on the highest peak of the ridge, where
        // nothing that cannot climb gets beside him.
        { role: "MARKSMAN", at: { x: 4, y: 8 }, tag: "THORNBURY" },
        // His gun-bearers: two rifles on the peaks beside him, a Guard on
        // the peak in front, and the lodge's men.
        { role: "MARKSMAN", at: { x: 3, y: 8 } },
        { role: "MARKSMAN", at: { x: 5, y: 8 } },
        { role: "GUARD", at: { x: 4, y: 7 } },
        { role: "GUARD", at: { x: 4, y: 10 } },
        { role: "FIGHTER", at: { x: 3, y: 10 } },
        { role: "FIGHTER", at: { x: 5, y: 10 } },
        { role: "FIGHTER", at: { x: 4, y: 11 } },
        { role: "FIGHTER", at: { x: 2, y: 11 } },
        { role: "MARKSMAN", at: { x: 3, y: 11 } },
        { role: "GUARD", at: { x: 5, y: 11 } },
      ],
      // Thunder Nest, from the Redcaps' spoor.
      reveal: { radius: 2, rects: [{ x0: 3, y0: 2, x1: 5, y1: 4 }] },
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
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The Major and his three nearest guns hold the ridge; every other
      // man of the lodge goes for the nest (retune 3: they used to play
      // their ordinary game round the lodge).
      directive: {
        kind: "GUARD",
        zone: [{ x0: 3, y0: 7, x1: 5, y1: 8 }],
        garrison: 4,
        others: { kind: "RUSH" },
      },
    },
    {
      // The Redcap trackers, very good at finding dinosaurs.
      faction: "GOBLIN",
      // Retune 3: eleven trackers, a level 2 Gutter Gulch, Drill and Walls,
      // Raiding.
      coins: 6,
      technologies: ["SCOUTING", "RAIDING", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Redcap Hollow",
          at: { x: 1, y: 9 },
          level: 1,
          rewards: [],
        },
        {
          name: "Gutter Gulch",
          at: { x: 7, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 1, y: 9 } },
        { role: "FIGHTER", at: { x: 1, y: 8 } },
        { role: "RAIDER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 2, y: 7 } },
        { role: "RAIDER", at: { x: 2, y: 10 } },
        { role: "GUARD", at: { x: 7, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 9 }, home: 1 },
        { role: "FIGHTER", at: { x: 9, y: 8 }, home: 1 },
        { role: "RAIDER", at: { x: 8, y: 7 }, home: 1 },
        { role: "RAIDER", at: { x: 7, y: 9 }, home: 1 },
      ],
      // Your nests, from the trackers' spoor.
      reveal: { radius: 2, rects: [{ x0: 3, y0: 2, x1: 12, y1: 4 }] },
      forbiddenTechnologies: [
        "GATHERING",
        "FARMING",
        "MILLING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "ROADS",
        "COMMERCE",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      directive: { kind: "RUSH" },
    },
  ],
  // More Redcaps answer the Major's bounty: a pack at each camp in rounds
  // 3, 6, 9 and 12, each announced (retune 3: two waves, rounds 5 and 9).
  reinforcements: [
    [3, "Redcap trackers pick up the spoor of your nest."],
    [6, "The Major's bounty has brought more trackers."],
    [9, "Every Redcap in the tar country is on his way."],
    [12, "The last trackers, still hopeful about the bounty."],
  ].map(([round, line]) => ({
    seat: 2,
    round: round as number,
    units: [
      { role: "FIGHTER" as const, at: { x: 1, y: 8 } },
      { role: "RAIDER" as const, at: { x: 1, y: 7 } },
      { role: "FIGHTER" as const, at: { x: 8, y: 8 } },
      { role: "RAIDER" as const, at: { x: 8, y: 7 } },
    ],
    line: line as string,
    announce: true as const,
  })),
  // Nobody sails the tar country.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Hunt the hunter by round 16 (was 20). The stars: by round 12, and the
  // Old Queen lives.
  objective: {
    kind: "KILL",
    units: ["THORNBURY"],
    byRound: 16,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
