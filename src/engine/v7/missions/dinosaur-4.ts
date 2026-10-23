import type { MissionDefinitionV7 } from "./types";

/**
 * `DINOSAUR_4` "The Greatest Show on Earth" (docs/product/SAGA.md section
 * 3.5, DN4; the Dinosaur campaign, `pulp_wars-hmyk.6`). You lead the Old
 * Queen's dinosaurs, landed at Big Top Bay, against Baron Kessler's
 * Travelling Wonder Circus, and must kill the Baron himself (a tagged
 * Champion, the ringmaster) by round 16. Step 4 of 6: a walled ring and a
 * ringmaster hiding in it. The big top is a walled town under the peaks,
 * its ring eight Guards dug in on Field Defenses (`GUARD` on the ring
 * alone: it is full, so nothing in it moves); the Redcap roustabouts, Orc
 * Brutes among them, march on your camp from their two camps (`RUSH`, and
 * more of them in round 6). A Triceratops's Charge! ignores Walls
 * and Field Defense and shoves its target back, and Wallbreaker's Breach
 * lets every dinosaur bite through the trenches; kill one Guard of the
 * ring and the Queen's Rampage carries her in. The beasts freed from the
 * cage wagons join you in rounds 6 and 10.
 *
 * The board is the map generator's (Pangea 16, seed 12): open dunes in the
 * south and the middle, wooded hills in the west and the peaks of the
 * north, where the big top stands with half its ring up on the Mountains
 * (the Baron's men have Engineering). Your camp is the fishing village of
 * Big Top Bay on the southern shore; the Redcaps camp on the western shore
 * and in the east. Nine villages are gone (under the camps and the big top,
 * and those that would feed the circus and the Redcaps), and the chest by
 * the big top.
 *
 * Retune 3 (`pulp_wars-hmyk.21`) started you like a skirmish against six
 * rushing rifles, level 2 Redcap camps of twelve, four packs and a firing
 * line on a 15-round clock; the user found the campaign mostly
 * impossible. Retune 4 (`pulp_wars-hmyk.27`, hand-played, CAMPAIGN.md
 * section 17.5): a level 2 Big Top Bay with Hunting, Spitters, Drill,
 * Nesting and 5 Coins, two villages back; the Baron is a Champion (a
 * 10-HP Captain fell to the first bite), his six rifles hold posts round
 * the ring, apart and two of them on the peaks, the Redcap camps are
 * level 1 with eight, one pack comes in round 6, the freed beasts in
 * rounds 6 and 10, and the clock is 16.
 *
 * Hand play (the Dinosaur campaign's record in CAMPAIGN.md) set the
 * layout: with the big top in the middle of the dunes and Fighters in its ring, a T-Rex's Rampage ran
 * through the ring into the 10-HP Baron in round 3, and a ring leashed to a
 * wider zone walked round to the side facing you.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~.ff.f^^^^~~~~
 *    2   ~~f^^..^.^^^ff~~
 *    3   ~~.ff.f^^^.ff^~~
 *    4   ~.ffff.gggf^ff.~      g: the ring (half of it on the peaks)
 *    5   ~.fff..gKg^.f^f~      K: the Big Top (Kessler)
 *    6   ~.ff...ggg^^f^^~
 *    7   ~f.......f^.Sf.~      S: Sawdust Camp (the Redcaps)
 *    8   ~fR...f.......f~      R: Rope Yard (the Redcaps)
 *    9   ~..............~
 *   10   ~........f.....~
 *   11   ~f......v..f...~      v: villages
 *   12   ~~.f..........~~
 *   13   ~~~f.....$..f~~~      $: a treasure chest
 *   14   ~~~..vf.B..v~~~~      B: Big Top Bay (yours)
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const DINOSAUR_4_V7: MissionDefinitionV7 = {
  id: "DINOSAUR_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, retune 3): a skirmish start (the
  // Queen and a Triceratops, no technology), no village in reach, a richer
  // circus with rifles that rush, bigger Redcap packs and a 15-round clock.
  // Revision 4 (`pulp_wars-hmyk.27`, retune 4): a level 2 bay, two
  // villages back, a Champion Baron, rifles at posts, one Redcap pack and
  // a 16-round clock.
  revision: 4,
  seed: 20261404,
  // <map>
  size: 16,
  source: {
    mapType: "PANGEA",
    size: 16,
    seats: 3,
    seed: 12,
    // The big top, the two Redcap camps and your camp stand on villages;
    // four more would feed the circus and the Redcaps; the chest by the
    // big top would hand them a unit.
    edits: [
      { kind: "VILLAGE", at: { x: 8, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 2, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 8, y: 2 }, present: false },
      { kind: "CHEST", at: { x: 7, y: 6 }, present: false },
      // Retune 3: the villages round Big Top Bay and its chest (retune 4
      // gives back two of the three villages).
      { kind: "VILLAGE", at: { x: 5, y: 14 }, present: false },
      { kind: "CHEST", at: { x: 9, y: 13 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~.ff.f^^^^~~~~",
    "~~f^^..^.^^^ff~~",
    "~~.ff.f^^^.ff^~~",
    "~.ffff.^^^f^ff.~",
    "~.fff.....^.f^f~",
    "~.ff...f.^^^f^^~",
    "~f.......f^..f.~",
    "~f....f.......f~",
    "~..............~",
    "~........f.....~",
    "~f.........f...~",
    "~~.f..........~~",
    "~~~f.....f..f~~~",
    "~~~...f.....~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "...p....s..s....",
    "......rg..o.ss..",
    "......ro.ooo.g..",
    "........oo.g.o..",
    "s......ooo.og.e.",
    ".e.g.....ror....",
    ".egg.er...oog...",
    ".gr.rreeegor....",
    ".g..r....r..e.g.",
    "se.erree..re.re.",
    "s.r.e.rer.e..e.p",
    "s....e.e.e..re..",
    "...gr.r.r.re....",
    "..s..e..r.regp..",
    ".p..e..r.e...p..",
    "....sp.pps.sp.p.",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPWWWWWHHHHPPPP",
    "PPWWWWWHHHHHHHPP",
    "PPWWWWWHHHHHHHPP",
    "PWWWWWWHHHHHHHHP",
    "PWWWWPPPHHHHHHPP",
    "PWWWPPPPPHHHHPPP",
    "PPPPPPPPPPHHPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 8, y: 11 },
    { x: 11, y: 14 },
  ],
  treasureChests: [],
  // </map>
  // The ring round the big top: the roustabouts' trenches, on the dunes
  // and up on the peaks behind it.
  fieldDefenses: [
    { x: 7, y: 4 },
    { x: 8, y: 4 },
    { x: 9, y: 4 },
    { x: 7, y: 5 },
    { x: 9, y: 5 },
    { x: 7, y: 6 },
    { x: 8, y: 6 },
    { x: 9, y: 6 },
  ],
  aiMode: "RIVAL",
  // The circus and its Redcap roustabouts are one side.
  teams: [0, 1, 1],
  seats: [
    {
      faction: "DINOSAUR",
      // Retune 3 started you like a skirmish (a level 1 bay, nothing
      // else); retune 4: level 2, Hunting, Spitters, Drill, Nesting and
      // 5 Coins. The Old Queen and a Triceratops, nothing seen beyond the
      // shore.
      coins: 5,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Big Top Bay",
          at: { x: 8, y: 14 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // The Old Queen, a T-Rex.
        { role: "KNIGHT", at: { x: 8, y: 13 }, tag: "OLD_QUEEN" },
        { role: "SWORDSMAN", at: { x: 7, y: 13 } },
      ],
      reveal: { radius: 1 },
    },
    {
      // Baron Kessler's Travelling Wonder Circus.
      faction: "ORIGINAL",
      // Retune 3: 10 Coins, Scouting, and six rifles instead of two.
      // Retune 4: 6 Coins and Metallurgy.
      coins: 6,
      technologies: [
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
          name: "The Big Top",
          at: { x: 8, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // Baron Otto Kessler, in a ringmaster's coat: a Champion (retune
        // 4; as a 10-HP Captain he died to the first bite through the
        // ring).
        { role: "SWORDSMAN", at: { x: 8, y: 5 }, tag: "KESSLER" },
        // The ring: eight Guards dug in round the ringmaster (hand play:
        // with Fighters in it, a T-Rex's Overrun ran through a Fighter
        // into the Baron in round 3), and two rifles before it.
        { role: "GUARD", at: { x: 7, y: 4 } },
        { role: "GUARD", at: { x: 8, y: 4 } },
        { role: "GUARD", at: { x: 9, y: 4 } },
        { role: "GUARD", at: { x: 7, y: 5 } },
        { role: "GUARD", at: { x: 9, y: 5 } },
        { role: "GUARD", at: { x: 7, y: 6 } },
        { role: "GUARD", at: { x: 8, y: 6 } },
        { role: "GUARD", at: { x: 9, y: 6 } },
        // Retune 4: six rifles posted apart round the ring (none beside
        // another, so a T-Rex cannot eat her way along them), two of them
        // up on the peaks, each holding its post.
        { role: "MARKSMAN", at: { x: 5, y: 6 } },
        { role: "MARKSMAN", at: { x: 6, y: 4 } },
        { role: "MARKSMAN", at: { x: 10, y: 5 } },
        { role: "MARKSMAN", at: { x: 10, y: 7 } },
        { role: "MARKSMAN", at: { x: 6, y: 8 } },
        { role: "MARKSMAN", at: { x: 8, y: 9 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 12, x1: 10, y1: 14 }] },
      forbiddenTechnologies: [
        "GATHERING",
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
      ],
      // The ring holds the big top and each rifle holds its post (an exact
      // one-tile zone; retune 3's rifles marched on your camp and fed the
      // Queen).
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 7, y0: 4, x1: 9, y1: 6 },
          { x0: 5, y0: 6, x1: 5, y1: 6 },
          { x0: 6, y0: 4, x1: 6, y1: 4 },
          { x0: 10, y0: 5, x1: 10, y1: 5 },
          { x0: 10, y0: 7, x1: 10, y1: 7 },
          { x0: 6, y0: 8, x1: 6, y1: 8 },
          { x0: 8, y0: 9, x1: 8, y1: 9 },
        ],
        garrison: 15,
        others: { kind: "RUSH" },
      },
    },
    {
      // The Redcap roustabouts, with cattle-prods.
      faction: "GOBLIN",
      // Retune 3: level 2 camps, 8 Coins, Raiding, twelve roustabouts.
      // Retune 4: level 1 camps, 4 Coins, eight.
      coins: 4,
      // Orc Brutes with cattle-prods, Goblins and Wolf Riders.
      technologies: ["SCOUTING", "RAIDING", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Rope Yard",
          at: { x: 2, y: 8 },
          level: 1,
          rewards: [],
        },
        {
          name: "Sawdust Camp",
          at: { x: 12, y: 7 },
          level: 1,
          rewards: [],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 2, y: 8 } },
        { role: "FIGHTER", at: { x: 3, y: 8 } },
        { role: "RAIDER", at: { x: 3, y: 9 } },
        { role: "GUARD", at: { x: 1, y: 8 } },
        { role: "GUARD", at: { x: 12, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 12, y: 8 }, home: 1 },
        { role: "RAIDER", at: { x: 11, y: 8 }, home: 1 },
        { role: "GUARD", at: { x: 13, y: 7 }, home: 1 },
      ],
      reveal: { radius: 2, rects: [{ x0: 6, y0: 12, x1: 10, y1: 14 }] },
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
  // The beasts freed from the cage wagons come to the Queen's side in
  // rounds 6 and 10, one at a time (retune 3: rounds 8 and 12), and more
  // roustabouts come at both camps in round 6 (retune 3: four packs and a
  // firing line), all announced.
  reinforcements: [
    {
      seat: 2,
      round: 6,
      units: [
        { role: "GUARD", at: { x: 2, y: 9 } },
        { role: "FIGHTER", at: { x: 1, y: 9 } },
        { role: "FIGHTER", at: { x: 13, y: 8 } },
        { role: "RAIDER", at: { x: 12, y: 9 } },
      ],
      line: "More roustabouts, and the Baron's whip-hand with them.",
      announce: true,
    },
    {
      seat: 0,
      round: 6,
      units: [{ role: "SWORDSMAN", at: { x: 4, y: 10 } }],
      line: "A cage door bursts: a Triceratops runs to the Queen.",
      announce: true,
    },
    {
      seat: 0,
      round: 10,
      units: [{ role: "MARKSMAN", at: { x: 12, y: 11 } }],
      line: "A Spitter slips its chain and follows her scent.",
      announce: true,
    },
  ],
  // Nobody sails.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  // The Queen would like a word with the ringmaster, by round 16 (the
  // saga's 20; retune 3: 15). The stars: by round 12, and the Old Queen
  // lives.
  objective: {
    kind: "KILL",
    units: ["KESSLER"],
    byRound: 16,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 12 },
      { kind: "UNIT_ALIVE", unit: "OLD_QUEEN" },
    ],
  },
};
