import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_10` "The Stars Are Right" (docs/product/CAMPAIGN.md section 9,
 * mission 10; `pulp_wars-v642.4`). The finale of part one. You lead the
 * Humans beside Grubnak's Goblins against the Cultists and their Undead
 * thralls on a 20 x 20 board. Very hard. Capture the Lodge of the
 * Unblinking Eye before round 24 ends.
 *
 * Revision 2 (`pulp_wars-v642.6`, CAMPAIGN.md section 11.13): replayed on
 * the corrected Cult AI, the first build was won in round 12 with nothing
 * lost (a Knight's Overrun ran through the summit's Initiates, Hexers, and
 * both Summoners in one charge). Toughened: 5 Coins for you (was 15), an
 * Idol Bearer and a Chosen (an Idol Bearer since revision 3) in the ring
 * where a Hexer and an Initiate stood
 * and a garrison of eight (was six), a Zombie on the barrow's center, and
 * the lodge's Summoner waves in rounds 12 and 17 (were 14 and 20).
 *
 * Revision 3 (the Cult redesign's roster, `pulp_wars-mch9.31`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 15): the Caller and the
 * Chosen retired, so the ring's Chosen on the goat path side (9,2) is an
 * Idol Bearer, the other Chosen (11,4) an Initiate, and the Caller (9,4) a
 * Hexer. A stop-gap so the mission loads: its retune (technologies, Favour,
 * text, and the difficulty replay) is the campaign bead of the redesign.
 *
 * The board is the map generator's (Pangea, seed 23). The Lodge stands in
 * the northern highlands with Mountains on three sides: a wooded slope
 * leads up to it from the south and a goat path from the west. Two
 * Mountain tiles beside it are turned to Grass (the summit's clearing: the
 * Lodge's Walls need the level).
 *
 * - **The Cultists** `GUARD` the summit with a garrison of eight (the
 *   Thing on the Lodge, three Idol Bearers, both Summoners, and two
 *   Hexers); the rest of the lodge roams. They start with 9 Favour, two
 *   Summoners, and The Stars Are Right, so the first Horrors come in the
 *   opening rounds and every unit a Horror kills, every Seizure, and every
 *   Sacrifice feeds the pool: at 20 Favour, with a Summoner and three
 *   chanters left unthreatened, the Great Summoning begins and the Herald
 *   comes. The Favour is public: it is the Summoning's clock, and round 24
 *   is its last toll. The seat may research nothing else (no Offering: the
 *   Favour is paid in blood), starts far over its unit limit, and is kept
 *   up by three waves that arrive behind the Lodge (rounds 8, 12, and 17),
 *   the last two with a fresh Summoner.
 * - **The Undead** (the thralls) hold the barrow on your road and a town in
 *   the east, and `RUSH`. Three waves rise at the barrow (rounds 6, 12, and
 *   18) for as long as the seat lives: take both towns and the dead stop
 *   rising.
 * - **The Goblins** are your ally (teams): they play their ordinary game
 *   until round 10 and `RUSH` from then on, which brings the horde up the
 *   eastern side to the Lodge about when you arrive.
 *
 * ```text
 *      x 01234567890123456789
 * y  0   ~~~~~~~~~~~~~~~~~~~~
 *    1   ~~~~~~.^....fc~~~~~~      c: the Cult's towns
 *    2   ~~~^.^fc^.L^^.^f.~~~      L: the Lodge
 *    3   ~~~....^^^ffff^.f.~~
 *    4   ~~f.^f..^fff.^.f^.f~
 *    5   ~v...^.Uf^...fff.f.~      U: the barrow (the Undead capital)
 *    6   ~....^.$^.^.$ff....~
 *    7   ~.f.......x...^fff.~
 *    8   ~v..hf....x..u^f.ff~      h: your towns; u: an Undead town
 *    9   ~.........x.f.f.ff^~
 *   10   ~.............^ff..~
 *   11   ~............v.^vff~
 *   12   ~...f..ffffff..^fff~
 *   13   ~..H..^.fff..^.ff^f~      H: your capital
 *   14   ~.....$hffvffff.G..~      G: Grubnak's camp
 *   15   ~~.f.f^f^$.fff^^.f~~
 *   16   ~~~v^.f^^^ff...ff~~~
 *   17   ~~~^.ffv^.vf.vfff~~~
 *   18   ~~~~~.^^^^^ff.^~~~~~
 *   19   ~~~~~~~~~~~~~~~~~~~~
 * ```
 */
export const FRONTIER_10_V7: MissionDefinitionV7 = {
  id: "FRONTIER_10",
  revision: 3,
  seed: 20261110,
  // <map>
  size: 20,
  source: {
    mapType: "PANGEA",
    size: 20,
    seats: 4,
    seed: 23,
    edits: [
      { kind: "VILLAGE", at: { x: 10, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 4, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 18, y: 14 }, present: false },
      { kind: "VILLAGE", at: { x: 18, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 16, y: 8 }, present: false },
      { kind: "TERRAIN", at: { x: 8, y: 1 }, terrain: "." },
      { kind: "TERRAIN", at: { x: 11, y: 1 }, terrain: "." },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~~~~~",
    "~~~~~~.^....f.~~~~~~",
    "~~~^.^f.^..^^.^f.~~~",
    "~~~....^^^ffff^.f.~~",
    "~~f.^f..^fff.^.f^.f~",
    "~....^..f^...fff.f.~",
    "~....^..^.^..ff....~",
    "~.f.......x...^fff.~",
    "~....f....x...^f.ff~",
    "~.........x.f.f.ff^~",
    "~.............^ff..~",
    "~..............^.ff~",
    "~...f..ffffff..^fff~",
    "~.....^.fff..^.ff^f~",
    "~.......ff.ffff....~",
    "~~.f.f^f^..fff^^.f~~",
    "~~~.^.f^^^ff...ff~~~",
    "~~~^.ff.^..f..fff~~~",
    "~~~~~.^^^^^ff.^~~~~~",
    "~~~~~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "...p......s.......p.",
    ".p..ss.o....g.sss...",
    "..poro..o..oorog.sp.",
    "...r.e.ooo..ggor.rs.",
    "p..e.gr.og...o..oe..",
    "..eee.e....eeg.....s",
    ".e.eror.oe.....r.e..",
    ".e.rrerree.r...g..r.",
    "s.....rrrr.ee..g.g..",
    "..e.rrr.rr.e...e.gop",
    ".eerr..er.r......e.p",
    "..rrerrrr...e....ggp",
    "..rrg....g.gge...ggs",
    "s.r.eeo....e...g....",
    "s.errr..g.....g..r.p",
    ".p....o.o.e...ooe.s.",
    "p...o..o.og...rg....",
    "...o....oe....gg....",
    "......o..oog.....p..",
    ".....s..ppss........",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPPPPPP",
    "PPPPPPHHHHHHHHPPPPPP",
    "PPPHHHHHHHHHHHHHWPPP",
    "PPPHHHHHHHHHHHHWWWPP",
    "PPPPHHHHHHHHHHWWWWWP",
    "PPPPPHHHHHPPPWWWWWWP",
    "PPPPPPHHHPPPPWWWWWWP",
    "PPPPPPPPPPPPPWWWWWWP",
    "PPPPPPPPPPPPPWWWWWWP",
    "PPPPPPPPPPPPPPWWWWWP",
    "PPPPPPPPPPPPPPPWWWWP",
    "PPPPPPPPPPPPPPPWWWWP",
    "PPPPPPPPPPPPPPPWWWWP",
    "PPPPPPHPPPPPPWWWWWWP",
    "PPPPPHHHPPPPWWWWWWWP",
    "PPPPHHHHHPPWWWWWWWPP",
    "PPPHHHHHHHWWWWWWWPPP",
    "PPPHHHHHHHWWWWWWWPPP",
    "PPPPPHHHHHWWWWWPPPPP",
    "PPPPPPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 1, y: 5 },
    { x: 1, y: 8 },
    { x: 13, y: 11 },
    { x: 16, y: 11 },
    { x: 10, y: 14 },
    { x: 3, y: 16 },
    { x: 7, y: 17 },
    { x: 10, y: 17 },
    { x: 13, y: 17 },
  ],
  treasureChests: [
    { x: 7, y: 6 },
    { x: 12, y: 6 },
    { x: 6, y: 14 },
    { x: 9, y: 15 },
  ],
  // </map>
  aiMode: "RIVAL",
  teams: [0, 0, 1, 1],
  seats: [
    {
      faction: "ORIGINAL",
      // 15 in revision 1: the capital and Northwatch reached their
      // Juggernauts in rounds 1 and 2.
      coins: 5,
      // Everything Steele has learned on the way: the whole Human roster
      // but the Champion, and no Engineering yet (the Mountains around the
      // Lodge are a research away).
      technologies: [
        "GATHERING",
        "FARMING",
        "ADMINISTRATION",
        "HUNTING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "SCOUTING",
        "RAIDING",
        "CHIVALRY",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Fort Steele",
          at: { x: 3, y: 13 },
          level: 5,
          rewards: ["STOCKPILE", "WALLS", "BOOM", "TREASURY"],
          landGrant: true,
        },
        {
          name: "Northwatch",
          at: { x: 4, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Millford", at: { x: 7, y: 14 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "GUARD", at: { x: 3, y: 13 } },
        { role: "FIGHTER", at: { x: 2, y: 13 } },
        { role: "MARKSMAN", at: { x: 3, y: 12 } },
        { role: "MARKSMAN", at: { x: 2, y: 12 } },
        { role: "CATAPULT", at: { x: 3, y: 14 } },
        { role: "KNIGHT", at: { x: 4, y: 14 } },
        { role: "GUARD", at: { x: 4, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 4, y: 7 }, home: 1 },
        { role: "CAPTAIN", at: { x: 3, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 7, y: 14 }, home: 2 },
      ],
      // The Lodge, seen from the valley.
      reveal: { radius: 2, rects: [{ x0: 9, y0: 1, x1: 11, y1: 3 }] },
    },
    {
      faction: "GOBLIN",
      coins: 8,
      technologies: [
        "GATHERING",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Grubnak's Hall",
          at: { x: 16, y: 14 },
          level: 3,
          rewards: ["STOCKPILE", "SURVEY"],
          landGrant: true,
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 16, y: 14 } },
        { role: "FIGHTER", at: { x: 15, y: 14 } },
        { role: "FIGHTER", at: { x: 17, y: 14 } },
        { role: "GUARD", at: { x: 16, y: 15 } },
        { role: "MARKSMAN", at: { x: 14, y: 13 } },
        { role: "RAIDER", at: { x: 14, y: 12 } },
        { role: "FIGHTER", at: { x: 16, y: 13 } },
        { role: "FIGHTER", at: { x: 15, y: 13 } },
      ],
      reveal: { radius: 3 },
      // The ally's directive: grow first, then march on the enemy's cities.
      directive: [{ kind: "NORMAL", untilRound: 10 }, { kind: "RUSH" }],
    },
    {
      faction: "CULT",
      coins: 0,
      // One Horror at once and a second for a spare Initiate; the rest of
      // the way to the Herald's 20 is paid by what the Horrors kill.
      favour: 9,
      // Leadership (the Summoner: Sacrifice, Seize, Summon), Hexers,
      // Familiars, Warding Circles (the Idol Bearer), and The Stars Are
      // Right (the Great Summoning). The Stargazer and the Thing in the
      // Cellar are here as starting units only.
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
        "EXPLOSIVES",
      ],
      cities: [
        {
          name: "The Lodge",
          at: { x: 10, y: 2 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
          landGrant: true,
        },
        { name: "Candlewick", at: { x: 7, y: 2 }, level: 1, rewards: [] },
        { name: "Greyhood", at: { x: 13, y: 1 }, level: 1, rewards: [] },
      ],
      units: [
        // The ring (the GUARD garrison: the first eight inside the zone):
        // the Idol Bearers on the goat path and beside the Summoners end a
        // Knight's Overrun (revision 2; revision 3: the Chosen at 9,2 is an
        // Idol Bearer, the one at 11,4 an Initiate, the Caller a Hexer).
        { role: "JUGGERNAUT", at: { x: 10, y: 2 } },
        { role: "GUARD", at: { x: 11, y: 1 } },
        { role: "GUARD", at: { x: 8, y: 1 } },
        { role: "CAPTAIN", at: { x: 9, y: 1 } },
        { role: "CAPTAIN", at: { x: 10, y: 1 } },
        { role: "GUARD", at: { x: 9, y: 2 } },
        { role: "MARKSMAN", at: { x: 10, y: 3 } },
        { role: "MARKSMAN", at: { x: 11, y: 3 } },
        { role: "GUARD", at: { x: 10, y: 4 } },
        { role: "FIGHTER", at: { x: 11, y: 4 } },
        { role: "FIGHTER", at: { x: 12, y: 4 } },
        { role: "CATAPULT", at: { x: 12, y: 3 } },
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "MARKSMAN", at: { x: 9, y: 4 } },
        { role: "FIGHTER", at: { x: 7, y: 2 }, home: 1 },
        { role: "GUARD", at: { x: 6, y: 3 }, home: 1 },
        { role: "FIGHTER", at: { x: 13, y: 1 }, home: 2 },
        { role: "RAIDER", at: { x: 13, y: 2 }, home: 2 },
      ],
      reveal: { radius: 3 },
      // Hand play (CAMPAIGN.md section 11.11): with Harvest Rites the lodge
      // made an Offering in every city every turn and the Herald stood on
      // the summit in round 3; with the whole tree it fielded forty units.
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
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
      ],
      directive: {
        kind: "GUARD",
        zone: [{ x0: 8, y0: 0, x1: 12, y1: 4 }],
        garrison: 8,
      },
    },
    {
      faction: "UNDEAD",
      coins: 6,
      technologies: [
        "GATHERING",
        "HUNTING",
        "SCOUTING",
        "DRILL",
        "FORTIFICATION",
      ],
      cities: [
        {
          name: "Hollow Barrow",
          at: { x: 7, y: 5 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        {
          name: "Bonefield",
          at: { x: 13, y: 8 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        // A Zombie on the barrow's center (revision 2: a Skeleton fell to
        // one Juggernaut's blow in round 4).
        { role: "GUARD", at: { x: 7, y: 5 } },
        { role: "FIGHTER", at: { x: 6, y: 5 } },
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "RAIDER", at: { x: 6, y: 6 } },
        { role: "FIGHTER", at: { x: 8, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 8 }, home: 1 },
        { role: "GUARD", at: { x: 12, y: 8 }, home: 1 },
        { role: "FIGHTER", at: { x: 13, y: 9 }, home: 1 },
        { role: "RAIDER", at: { x: 12, y: 7 }, home: 1 },
      ],
      // Your towns and the road to them.
      reveal: { radius: 2, rects: [{ x0: 2, y0: 6, x1: 8, y1: 14 }] },
      // Thralls: no Necromancers, Liches, Wights, or Mines.
      forbiddenTechnologies: [
        "ADMINISTRATION",
        "PLANNING",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      directive: { kind: "RUSH" },
    },
  ],
  // The dead rise around the barrow; the lodge's waves come up behind the
  // summit, out of reach of an army on the slope.
  reinforcements: [
    {
      seat: 3,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 4 } },
        { role: "GUARD", at: { x: 8, y: 5 } },
        { role: "RAIDER", at: { x: 7, y: 3 } },
      ],
    },
    {
      seat: 3,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 4 } },
        { role: "GUARD", at: { x: 8, y: 5 } },
        { role: "RAIDER", at: { x: 7, y: 3 } },
      ],
    },
    {
      seat: 3,
      round: 18,
      units: [
        { role: "FIGHTER", at: { x: 7, y: 4 } },
        { role: "FIGHTER", at: { x: 6, y: 4 } },
        { role: "GUARD", at: { x: 8, y: 5 } },
        { role: "RAIDER", at: { x: 7, y: 3 } },
      ],
    },
    {
      seat: 2,
      round: 8,
      units: [
        { role: "FIGHTER", at: { x: 13, y: 2 } },
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "MARKSMAN", at: { x: 12, y: 3 } },
        { role: "GUARD", at: { x: 12, y: 1 } },
      ],
    },
    {
      seat: 2,
      round: 12,
      units: [
        { role: "FIGHTER", at: { x: 13, y: 2 } },
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "MARKSMAN", at: { x: 12, y: 3 } },
        { role: "CAPTAIN", at: { x: 12, y: 1 } },
      ],
    },
    {
      seat: 2,
      round: 17,
      units: [
        { role: "FIGHTER", at: { x: 13, y: 2 } },
        { role: "FIGHTER", at: { x: 13, y: 3 } },
        { role: "MARKSMAN", at: { x: 12, y: 3 } },
        { role: "CAPTAIN", at: { x: 12, y: 1 } },
      ],
    },
  ],
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [{ tag: "LODGE", at: { x: 10, y: 2 } }],
  // Take the Lodge before round 24 ends. The stars: by round 20, and with
  // every city you started with.
  objective: {
    kind: "CAPTURE",
    places: ["LODGE"],
    byRound: 24,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 20 }, { kind: "KEEP_CITIES" }],
  },
};
