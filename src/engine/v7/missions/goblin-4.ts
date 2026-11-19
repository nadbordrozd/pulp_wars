import type { MissionDefinitionV7 } from "./types";

/**
 * `GOBLIN_4` "The Inside Job" (docs/product/SAGA.md section 3.3, G4; the
 * Goblin campaign, `pulp_wars-hmyk.8`). The crew has landed at Egg Rock on
 * the north-western shore of the Baron's island. Port Kessler, with the
 * vault under its harbour, stands walled on the far south-eastern shore;
 * on the hill above it stands the Baron's Moon Gun, a circus cannon built
 * to fire a man at the moon. Between them lie the whole island and its
 * tribes, who bite everyone. Capture Port Kessler by round 32. Step 4 of
 * 6.
 *
 * The board is the map generator's (Pangea 16, seed 7, three seats; it was
 * Archipelago 16, seed 74, until `pulp_wars-hmyk.38`). The user,
 * 2026-10-25: "mission 4 of goblin campaign is about taking a city that is
 * right next to yours. so I won it fairly quickly and didn't even explore
 * 20% of the map. it all played out in a tiny neighbourhood. put the
 * target a bit further away." So the port is ten tiles from Egg Rock (it
 * was three), across open plains, the tribes' camp at Tarpit in the middle
 * of the island, a Rift and the forests of Fernhollow, the tribes' home,
 * in the east. Four villages on the crew's side of the island, a Lost
 * Expedition in the western hills (a free technology) and a Gold Claim in
 * the middle reward the march; Tarpit, five tiles on, is the forward base.
 * The Moon Gun (a mission curiosity, E1) stands four tiles from the port
 * and fires a unit standing on it to any empty land tile within five, once
 * a turn: from it a Brute lands beside the port's centre.
 *
 * Hand play (CAMPAIGN.md section 19.6) set the numbers: the tribes, two
 * towns and seven men, storm Egg Rock from round 4 and keep hatching
 * Raptors and Ankylosaurs; the port holds seven on its shore and sends
 * three into the island, which take the villages near it and fight the
 * tribes. A first thoughtful attempt won in round 28 with its last
 * assault, so the clock is a lax 32.
 *
 * Revision 6 (`pulp_wars-i9o2`, section 19.8): the user found it too easy.
 * Under ruleset 7r143 the crew's Brutes took Tarpit in round 7 and broke
 * the tribes by round 10, so the tribes now hold both towns with
 * Ankylosaurs, have nine men, Nesting and 10 Coins, and storm Egg Rock from
 * round 3; the port has 10 Coins to retrain its walls.
 *
 * Revisions 7 to 9 (`pulp_wars-e912`, section 19.8): revision 6 was too
 * hard. Hand play lost it twice, and its first easings (no third Raptor at
 * Tarpit; then 5 and 6 Coins for the tribes and the port) were lost to the
 * clock: the tribes' Ankylosaurus eggs held the crew until Tarpit fell in
 * round 14 to 16. So the tribes lose Nesting: it is forbidden to them, so
 * they keep the Ankylosaurs on their centres but can never hatch more (the
 * Bone Neck gate, `pulp_wars-v642.7`); the round-3 storm stays.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~~.....f.f~~~~
 *    2   ~~~.f.vf.v...~~~      E: Egg Rock, yours
 *    3   ~~.E.........ff~      v: villages
 *    4   ~........G...ff~      G: the Gold Claim
 *    5   ~f.......fffFf.~      F: Fernhollow, the tribes' home
 *    6   ~v^fv...f.ffff^~
 *    7   ~^L^.f^..fxffff~      L: the Lost Expedition; x: the Rift
 *    8   ~^..f.fT..xf.f.~      T: Tarpit, the tribes' camp
 *    9   ~fv^f^....x.f^f~
 *   10   ~...f^^.M...^f.~      M: the Moon Gun
 *   11   ~^..^^v..v..f^.~
 *   12   ~^^....ff^.....~
 *   13   ~~.^f^.ff..fP~~~      P: Port Kessler
 *   14   ~~~~^..ff...~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const GOBLIN_4_V7: MissionDefinitionV7 = {
  id: "GOBLIN_4",
  // Revision 2 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  // Revision 3 (`pulp_wars-hmyk.21`, the third retune): a lean landing
  // against a port of ten, assaulting tribes and four announced waves.
  // Revision 4 (`pulp_wars-hmyk.29`, the fourth retune): a Brute and three
  // technologies more, a port of nine, no waves, a lax clock.
  // Revision 5 (`pulp_wars-hmyk.38`): a new board, the whole island; Port
  // Kessler ten tiles from the landing.
  // Revision 6 (`pulp_wars-i9o2`, CAMPAIGN.md section 19.8): the user found
  // it too easy; the tribes hold both towns with Ankylosaurs, have Nesting
  // and 10 Coins and storm Egg Rock from round 3; the port has 10 Coins.
  // Revision 7 (`pulp_wars-e912`, section 19.8): revision 6 was lost twice
  // in hand play, so the Raptor it added at Tarpit is gone (eight men).
  // Revision 8 (`pulp_wars-e912`): revision 7 was lost too, so the tribes
  // and the port are back to their revision 5 Coins (5 and 6).
  // Revision 9 (`pulp_wars-e912`): revision 8 was lost three times, each
  // time to the clock after the tribes' Ankylosaurus eggs held the crew
  // until Tarpit fell in round 14 to 16, so Nesting is forbidden to the
  // tribes (their two centre Ankylosaurs stay).
  revision: 9,
  seed: 20261504,
  // <map>
  size: 16,
  source: {
    mapType: "PANGEA",
    size: 16,
    seats: 3,
    seed: 7,
    // Fernhollow stands on a village; the two others in the tribes' woods
    // and the two by Port Kessler would hand the AI seats free towns. The
    // seven left are all on the crew's island, in reach of a march.
    edits: [
      { kind: "VILLAGE", at: { x: 12, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 14 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~.....f.f~~~~",
    "~~~.f..f.....~~~",
    "~~...........ff~",
    "~............ff~",
    "~f.......fff.f.~",
    "~.^f....f.ffff^~",
    "~^.^.f^..fxffff~",
    "~^..f.f...xf.f.~",
    "~f.^f^....x.f^f~",
    "~...f^^.....^f.~",
    "~^..^^......f^.~",
    "~^^....ff^.....~",
    "~~.^f^.ff..f.~~~",
    "~~~~^..ff...~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "...p......ssp...",
    ".pp.eee.e.e.sp..",
    "........e.......",
    "..e.r....r.ergg.",
    "s..er.r...er.gg.",
    ".....e.re....gr.",
    "..o..ree.egg...s",
    "so.oe..r......g.",
    "so.e.e........es",
    "pg.o..rrr..eg.g.",
    ".e...oo..ree...s",
    ".o.roo.e...e...p",
    ".o..r...go.errrs",
    "..rogorg.ee..sp.",
    "..ssoe....re..p.",
    "..p......pp.....",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPWWP",
    "PPPPPPPPPPPPWWWP",
    "PHPPPPPPPPPWWWWP",
    "PHHPPPPPPPWWWWWP",
    "PHHHPPPPPWWWWWWP",
    "PHHHHPPPPWWWWWWP",
    "PHHHHHPPPPPWWWWP",
    "PHHHHHHPPPPPWWWP",
    "PHHHHHHPPPPPPWWP",
    "PHHHHHHPPPPPPPWP",
    "PPHHHHPPPPPPPPPP",
    "PPPPHPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 6, y: 2 },
    { x: 9, y: 2 },
    { x: 1, y: 6 },
    { x: 4, y: 6 },
    { x: 2, y: 9 },
    { x: 6, y: 11 },
    { x: 9, y: 11 },
  ],
  treasureChests: [
    { x: 14, y: 11 },
    { x: 7, y: 14 },
  ],
  // </map>
  // Port Kessler's farm and timber yard.
  improvements: [
    { at: { x: 11, y: 12 }, improvement: "FARM" },
    { at: { x: 11, y: 13 }, improvement: "LUMBER_CAMP" },
  ],
  // The Baron's Moon Gun on the hill above the port (E1), and on the way
  // the Lost Expedition's notes in the western hills and a Gold Claim in
  // the middle of the island.
  curiosities: [
    { kind: "MOON_GUN", at: { x: 8, y: 10 } },
    { kind: "GOLD_CLAIM", at: { x: 9, y: 4 } },
    { kind: "LOST_EXPEDITION", at: { x: 2, y: 7 } },
  ],
  aiMode: "RIVAL",
  seats: [
    {
      faction: "GOBLIN",
      // Snikkit, the Ogre, a Chucker and an Orc Brute, seven technologies
      // (Land Grants, Bomb Chuckers, Orc Brutes and the way to
      // Explosives), 5 Coins; Egg Rock level 1 with Grass to grow on.
      coins: 5,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "PLANNING",
        "HUNTING",
        "MARKSMANSHIP",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [{ name: "Egg Rock", at: { x: 3, y: 3 }, level: 1, rewards: [] }],
      units: [
        // Snikkit, who did the sums.
        { role: "FIGHTER", at: { x: 3, y: 3 }, tag: "SNIKKIT" },
        { role: "SWORDSMAN", at: { x: 4, y: 3 } },
        { role: "MARKSMAN", at: { x: 3, y: 2 } },
        { role: "GUARD", at: { x: 4, y: 4 } },
      ],
      // The beachhead and the port's own tiles (the objective's place
      // must be known); the island between is the crew's to explore.
      reveal: {
        radius: 2,
        rects: [{ x0: 11, y0: 12, x1: 13, y1: 14 }],
      },
    },
    {
      // Kessler's island garrison: Port Kessler, walled. The Baron himself
      // stays in his counting-house.
      faction: "ORIGINAL",
      // 6 Coins (revision 6 had 10; revision 8 went back to revision 5's
      // 6 along with the tribes' 5).
      coins: 6,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Port Kessler",
          at: { x: 12, y: 13 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      // Seven on the port's shore, in the order of the garrison, then
      // three on the road north of it.
      units: [
        { role: "GUARD", at: { x: 12, y: 13 } },
        { role: "GUARD", at: { x: 11, y: 12 } },
        { role: "MARKSMAN", at: { x: 12, y: 12 } },
        { role: "FIGHTER", at: { x: 11, y: 13 } },
        { role: "MARKSMAN", at: { x: 13, y: 12 } },
        { role: "FIGHTER", at: { x: 11, y: 14 } },
        { role: "GUARD", at: { x: 10, y: 12 } },
        { role: "FIGHTER", at: { x: 9, y: 9 } },
        { role: "MARKSMAN", at: { x: 10, y: 10 } },
        { role: "FIGHTER", at: { x: 11, y: 10 } },
      ],
      // The Baron's spies have seen the landing (a RUSH needs a known
      // hostile city).
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 4, y1: 4 }] },
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
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The garrison holds the port's shore; from round 4 the others
      // march on the nearest hostile town.
      directive: [
        {
          kind: "GUARD",
          zone: [{ x0: 10, y0: 11, x1: 14, y1: 14 }],
          garrison: 7,
          untilRound: 4,
        },
        {
          kind: "GUARD",
          zone: [{ x0: 10, y0: 11, x1: 14, y1: 14 }],
          garrison: 7,
          others: { kind: "RUSH" },
        },
      ],
    },
    {
      // The island's tribes, who bite whoever lands. Revision 6: Nesting
      // from the start (Ankylosaurus eggs) and 10 Coins (were 5): in hand
      // play the crew's Brutes broke their Cavemen and Raptors one by one
      // and took Tarpit in round 7; only the Ankylosaurs held them.
      // Revision 8 (`pulp_wars-e912`): 5 Coins again; with 10 and Nesting
      // their eggs outran the crew's Brutes in every hand-played attempt.
      // Revision 9 (`pulp_wars-e912`): no Nesting, and it is forbidden (see
      // below), so the two centre Ankylosaurs are the only ones.
      faction: "DINOSAUR",
      coins: 5,
      technologies: ["GATHERING", "HUNTING", "SCOUTING", "DRILL"],
      // Fernhollow, their home, is in the eastern woods; Tarpit is the
      // hunting camp in the middle of the island. Each centre is held by an
      // Ankylosaurus.
      cities: [
        {
          name: "Fernhollow",
          at: { x: 12, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Tarpit", at: { x: 7, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 12, y: 5 } },
        { role: "RAIDER", at: { x: 11, y: 4 } },
        { role: "FIGHTER", at: { x: 13, y: 6 } },
        { role: "FIGHTER", at: { x: 12, y: 6 } },
        { role: "GUARD", at: { x: 7, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 6, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 7 }, home: 1 },
        // Revision 7 (`pulp_wars-e912`): the third Raptor revision 6 added
        // at Tarpit (8,8) is gone.
        { role: "RAIDER", at: { x: 8, y: 7 }, home: 1 },
      ],
      // They know where the crew landed.
      reveal: { radius: 2, rects: [{ x0: 2, y0: 2, x1: 4, y1: 4 }] },
      // Revision 9: Nesting (Fortification) forbidden, so they keep their
      // starting defenders and hatch no more; Explosives sits behind it.
      forbiddenTechnologies: [
        "METALLURGY",
        "CHIVALRY",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      // The tribes bite whoever lands: from round 3 (was 4) they storm Egg
      // Rock.
      directive: [
        { kind: "NORMAL", untilRound: 3 },
        { kind: "ASSAULT", target: { x: 3, y: 3 } },
      ],
    },
  ],
  // The sea is the Baron's last moat: no ships this time.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "PORT_KESSLER", at: { x: 12, y: 13 } }],
  // Capture Port Kessler by round 32 (lax: a first thoughtful attempt won
  // in round 28). The stars: by round 24, and Snikkit lives.
  objective: {
    kind: "CAPTURE",
    places: ["PORT_KESSLER"],
    byRound: 32,
    bonus: [
      { kind: "WITHIN_ROUNDS", rounds: 24 },
      { kind: "UNIT_ALIVE", unit: "SNIKKIT" },
    ],
  },
};
