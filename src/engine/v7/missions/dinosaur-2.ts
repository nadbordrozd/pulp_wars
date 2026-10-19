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
 * north with Thunder Nest and Fernmaw; a massif of peaks in the middle and
 * the south-west, with Tarpit Lodge in the pocket behind its southern
 * ridge; wooded hills in the east. The Redcaps camp in the two valleys:
 * the strip of the western shore and the gap between the massif and the
 * woods. Four villages are gone (the two camps and the two of the south
 * that would feed the Redcaps), and the two chests by the eastern camp.
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
 *    3   ~~ffT....f.F^~      T: Thunder Nest; F: Fernmaw
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
  revision: 1,
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
  villages: [
    { x: 8, y: 2 },
    { x: 1, y: 5 },
    { x: 8, y: 5 },
    { x: 4, y: 6 },
  ],
  treasureChests: [],
  // </map>
  aiMode: "RIVAL",
  // Thornbury's lodge and his Redcap trackers are one side.
  teams: [0, 1, 1],
  seats: [
    {
      faction: "DINOSAUR",
      coins: 8,
      // Spitters (Acid), Raptors, the Shaman, and Nesting's slots.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Thunder Nest",
          at: { x: 4, y: 3 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Fernmaw",
          at: { x: 11, y: 3 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a T-Rex.
        { role: "KNIGHT", at: { x: 4, y: 4 }, tag: "OLD_QUEEN" },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
        { role: "RAIDER", at: { x: 10, y: 4 }, home: 1 },
        { role: "MARKSMAN", at: { x: 11, y: 4 }, home: 1 },
        { role: "CAPTAIN", at: { x: 11, y: 3 }, home: 1 },
      ],
      // The tar peaks are too steep for a dinosaur: no Engineering, and
      // no Wallbreaker to blast them (the lesson is the Spitter's Acid).
      forbiddenTechnologies: ["ENGINEERING", "METALLURGY", "EXPLOSIVES"],
      // The tar country: the ridge over the lodge and both valleys.
      reveal: {
        radius: 2,
        rects: [
          { x0: 1, y0: 7, x1: 6, y1: 11 },
          { x0: 7, y0: 7, x1: 9, y1: 9 },
        ],
      },
    },
    {
      // Major Thornbury's shooting lodge at Tarpit: the Major and his
      // gun-bearers on the peaks of the ridge.
      faction: "ORIGINAL",
      coins: 3,
      technologies: [
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "ENGINEERING",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Tarpit Lodge",
          at: { x: 4, y: 10 },
          level: 1,
          rewards: [],
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
      ],
      reveal: { radius: 2 },
      forbiddenTechnologies: [
        "GATHERING",
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
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The Major never leaves his peak; his gun-bearers play their
      // ordinary game round the lodge.
      directive: {
        kind: "GUARD",
        zone: [{ x0: 4, y0: 8, x1: 4, y1: 8 }],
        garrison: 1,
      },
    },
    {
      // The Redcap trackers, very good at finding dinosaurs.
      faction: "GOBLIN",
      coins: 2,
      technologies: ["SCOUTING"],
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
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 1, y: 9 } },
        { role: "FIGHTER", at: { x: 1, y: 8 } },
        { role: "RAIDER", at: { x: 1, y: 7 } },
        { role: "FIGHTER", at: { x: 7, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 8, y: 8 }, home: 1 },
        { role: "RAIDER", at: { x: 8, y: 7 }, home: 1 },
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
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "ENGINEERING",
        "METALLURGY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      directive: { kind: "RUSH" },
    },
  ],
  // More Redcaps answer the Major's bounty: a pack at each camp in rounds
  // 5 and 9.
  reinforcements: [5, 9].map((round) => ({
    seat: 2,
    round,
    units: [
      { role: "FIGHTER" as const, at: { x: 1, y: 8 } },
      { role: "RAIDER" as const, at: { x: 1, y: 7 } },
      { role: "FIGHTER" as const, at: { x: 8, y: 8 } },
      { role: "RAIDER" as const, at: { x: 8, y: 7 } },
    ],
  })),
  // Nobody sails the tar country.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // Hunt the hunter by round 20. The stars: by round 16, and the Old Queen
  // lives.
  objective: {
    kind: "KILL",
    units: ["THORNBURY"],
    byRound: 20,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 16 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
