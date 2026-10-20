import type { MissionDefinitionV7 } from "./types";

/**
 * `FRONTIER_4` "Bone Neck" (docs/product/CAMPAIGN.md section 9, mission 4).
 * You lead Humans or Goblins against the Undead on a 16 x 16 board. Hard.
 * The lesson is a breach: the Undead realm is the eastern land, joined to
 * yours by Bone Neck, a strip of land two tiles long, under a gate city
 * with Field Defenses. The Naval branch is forbidden, so the neck is the
 * only way in. The Undead `GUARD` the gate with a garrison of five while
 * the rest of their army plays `NORMAL`, and the tower restocks the gate
 * in round 6. The choice is Human or Goblin only: a Martian flyer or a
 * Dwarf Mole would bypass the neck.
 *
 * Revision 5 (`pulp_wars-v642.7`, the campaign difficulty pass,
 * CAMPAIGN.md section 11.15): the problem is a front rank. Two Zombies on
 * Field Defenses hold the neck's exit and Skeletons stand behind them;
 * whatever walks over the neck in single file dies there and rises on the
 * other side. Your two siege engines break the front rank from the near
 * shore, and a rider's Overrun (Knight or Scrap Buggy) sweeps the weak
 * bone-men behind it onto the gate's center. You start with little
 * research (Chivalry is one step away) and a deadline of round 14; the
 * Undead seat may not train Liches, Ghouls, Banshees or new Zombies, and
 * builds no Field Defenses.
 *
 * Revision 6 (`pulp_wars-v642.10`, the danger pass, CAMPAIGN.md sections
 * 9.6 and 11.18): two fronts. The dead rise in your own fields, south of
 * Camp Concord in round 3 and north of Ferry Rest in round 7, take the
 * villages beside your towns and march on Camp Concord: the gate and the
 * tower keep seven (`GUARD` of both, garrison 7) and every other bone-man,
 * the tower's restock of round 6 included, storms Camp Concord (`others:
 * ASSAULT`). Two of the four villages on your side are gone, and the dead
 * may not research Wights (Metallurgy). A Knight sent alone dies; one that
 * lands on the gate's center beside two bone-men dies that night. The
 * answer is still the front rank broken by stones and an Overrun chain,
 * now one that clears the ring before it lands, with a guard at home.
 *
 * Revision 4 (`pulp_wars-v642.1`): the board is the map generator's
 * (Continents, seed 6): two lands and the channel between them, with two
 * water tiles of the channel turned to land: Bone Neck. The village at its
 * eastern end is the gate city; the Undead capital, the Marquis's tower,
 * stands four tiles beyond it. Taking the gate wins the mission.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ~~~~~~~~~~~~~~~~
 *    1   ~~~~~~~~~~~~~~~~
 *    2   ^~.~~~~~~~~~^~~.
 *    3   .^~^^.f~~.vf.~.f
 *    4   ^..v..v~~.fff~.f
 *    5   .f^.f..~~~fffu..      u: an Undead town
 *    6   .......==#g.....      =: Bone Neck; #: a Field Defense; g: the gate
 *    7   .....h.~~#...ff.      h: your town
 *    8   ......f~~~~...vf
 *    9   ..H....~~$^F...^      H: your capital; F: the tower's Farm
 *   10   .f...v^~~.fU.f.$      U: the Marquis's tower
 *   11   f~....f~~ff.^ff^
 *   12   .~v~.f~~~~^.f.~f
 *   13   ~.f~~f.~~.v~f.~f
 *   14   ~~~~~~~~~f~f~~~~
 *   15   ~~~~~~~~~~~~~~~~
 * ```
 */
export const FRONTIER_4_V7: MissionDefinitionV7 = {
  id: "FRONTIER_4",
  // Revision 7 (`pulp_wars-hmyk.17`): each seat explores its units' sight.
  revision: 7,
  seed: 20261104,
  // <map>
  size: 16,
  source: {
    mapType: "CONTINENTS",
    size: 16,
    seats: 2,
    seed: 6,
    // Baked before the natural water of `7r87` (pulp_wars-ykw.8): the board
    // stays the one this generator drew.
    rules: "SPREAD_VILLAGES_CURIOSITIES",
    edits: [
      { kind: "TERRAIN", at: { x: 7, y: 6 }, terrain: "." },
      { kind: "TERRAIN", at: { x: 8, y: 6 }, terrain: "." },
      { kind: "VILLAGE", at: { x: 5, y: 7 }, present: false },
      { kind: "VILLAGE", at: { x: 10, y: 6 }, present: false },
      { kind: "VILLAGE", at: { x: 13, y: 5 }, present: false },
      // Revision 6 (`pulp_wars-v642.10`): two of the four villages on your
      // side of the water, so the start is not a free empire.
      { kind: "VILLAGE", at: { x: 6, y: 4 }, present: false },
      { kind: "VILLAGE", at: { x: 5, y: 10 }, present: false },
    ],
  },
  terrain: [
    "~~~~~~~~~~~~~~~~",
    "~~~~~~~~~~~~~~~~",
    "^~.~~~~~~~~~^~~.",
    ".^~^^.f~~..f.~.f",
    "^......~~.fff~.f",
    ".f^.f..~~~fff...",
    "................",
    ".......~~....ff.",
    "......f~~~~....f",
    ".......~~f^....^",
    ".f....^~~.f..f..",
    "f~....f~~ff.^ff^",
    ".~.~.f~~~~^.f.~f",
    "~.f~~f.~~..~f.~f",
    "~~~~~~~~~f~f~~~~",
    "~~~~~~~~~~~~~~~~",
  ],
  resources: [
    "...........p..p.",
    ".....p.........s",
    "o....s..ps....s.",
    ".o.ooe.s.r..rp..",
    "o......spe.....g",
    "......e.......er",
    ".r.re....e...e.r",
    "r..e..r.se....gr",
    "...r...s....re..",
    "....ee.s...e.r..",
    "egrr....p...r.e.",
    "..re.rg.p.gro.g.",
    "......s....eg.s.",
    "....p..s....g..g",
    ".p....s...pg.s.s",
    ".......p........",
  ],
  biome: "PLAINS",
  biomes: [
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "HPHPPPPPPPPPPPPP",
    "HHPHHHPPPPPPPPPP",
    "HHHHHPPPPPPPPPPP",
    "HHHHPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPWPPPPPP",
    "PPPPPPWPPWWWWWWW",
    "PPPPPWPPPPWWWWPW",
    "PPPPPWWPPWWPWWPW",
    "PPPPPPPPPWPWPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 10, y: 3 },
    { x: 3, y: 4 },
    { x: 14, y: 8 },
    { x: 2, y: 12 },
    { x: 10, y: 13 },
  ],
  treasureChests: [
    { x: 9, y: 9 },
    { x: 15, y: 10 },
  ],
  // </map>
  fieldDefenses: [
    { x: 9, y: 6 },
    { x: 9, y: 7 },
  ],
  // The tower's Farm.
  improvements: [{ at: { x: 11, y: 9 }, improvement: "FARM" }],
  aiMode: "RIVAL",
  seats: [
    {
      faction: { choice: ["ORIGINAL", "GOBLIN"] },
      coins: 10,
      // Little researched (the difficulty pass, `pulp_wars-v642.7`): the
      // siege train is in hand and the riders are one step from their
      // Knights; the rest of the tree is yours to find.
      technologies: ["DRILL", "FORTIFICATION", "SCOUTING", "RAIDING"],
      cities: [
        {
          name: "Camp Concord",
          at: { x: 2, y: 9 },
          level: 3,
          rewards: ["SURVEY", "WALLS"],
        },
        {
          name: "Ferry Rest",
          at: { x: 5, y: 7 },
          level: 2,
          rewards: ["SURVEY"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 3, y: 9 } },
        { role: "RAIDER", at: { x: 4, y: 8 } },
        { role: "MARKSMAN", at: { x: 5, y: 6 }, home: 1 },
        // The siege train: the only siege units of the mission.
        { role: "CATAPULT", at: { x: 4, y: 7 }, home: 1 },
        { role: "CATAPULT", at: { x: 4, y: 6 }, home: 1 },
      ],
      // Bone Neck and the gate, seen across the water, and the tower.
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 5, x1: 11, y1: 8 },
          { x0: 10, y0: 9, x1: 12, y1: 11 },
        ],
      },
    },
    {
      faction: "UNDEAD",
      coins: 6,
      technologies: ["GATHERING", "HUNTING", "FORESTRY", "DRILL"],
      cities: [
        {
          name: "Ashen Tower",
          at: { x: 11, y: 10 },
          level: 3,
          rewards: ["SURVEY", "WALLS"],
        },
        {
          name: "Bone Gate",
          at: { x: 10, y: 6 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
        { name: "Cinderfield", at: { x: 13, y: 5 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "FIGHTER", at: { x: 11, y: 10 } },
        { role: "FIGHTER", at: { x: 12, y: 10 } },
        { role: "GUARD", at: { x: 9, y: 6 }, home: 1 },
        { role: "GUARD", at: { x: 9, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 6 }, home: 1 },
        { role: "FIGHTER", at: { x: 10, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 11, y: 7 }, home: 1 },
        { role: "FIGHTER", at: { x: 13, y: 5 }, home: 2 },
      ],
      // Bone Neck, watched from the gate, and (revision 6) Camp Concord,
      // which the risen march on.
      reveal: {
        radius: 2,
        rects: [
          { x0: 6, y0: 6, x1: 8, y1: 6 },
          { x0: 1, y0: 8, x1: 3, y1: 10 },
        ],
      },
      // No Necromancers (hand play, CAMPAIGN.md section 11.4): three of
      // them raised a Skeleton on every Grave of the gate every turn, and
      // the siege never ended. The difficulty pass (section 11.15) took
      // the Lich (Sawmilling: it would outrange the siege train), the
      // Ghoul (Scouting), the Banshee (Marksmanship) and new Zombies and
      // Field Defenses (Fortification) too: with them, every Knight that
      // broke through to the gate's center was killed on it the same
      // night. The two Zombies on the exit's Field Defenses are the front
      // rank; behind them stand Skeletons.
      forbiddenTechnologies: [
        "ADMINISTRATION",
        "PLANNING",
        "SAWMILLING",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "FORTIFICATION",
        "EXPLOSIVES",
        // Revision 6: no Wights (hand play: four of them refilled the
        // gate's center faster than any Knight could empty it).
        "METALLURGY",
      ],
      // Revision 6 (`pulp_wars-v642.10`): the gate and the tower keep
      // their seven; every other bone-man (the risen in your fields, the
      // tower's restock once the garrison is full) marches on Camp Concord.
      directive: {
        kind: "GUARD",
        zone: [
          { x0: 9, y0: 5, x1: 11, y1: 7 },
          { x0: 10, y0: 9, x1: 12, y1: 11 },
        ],
        garrison: 7,
        others: { kind: "ASSAULT", target: { x: 2, y: 9 } },
      },
    },
  ],
  // The tower restocks the gate; and (revision 6) the dead rise in your
  // own fields, south of Camp Concord in round 3 and north of Ferry Rest in
  // round 7.
  reinforcements: [
    {
      seat: 1,
      round: 3,
      units: [
        { role: "FIGHTER", at: { x: 4, y: 12 } },
        { role: "FIGHTER", at: { x: 5, y: 12 } },
        { role: "GUARD", at: { x: 2, y: 13 } },
      ],
    },
    {
      seat: 1,
      round: 7,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 4 } },
        { role: "FIGHTER", at: { x: 2, y: 4 } },
        { role: "GUARD", at: { x: 0, y: 5 } },
      ],
    },
    {
      seat: 1,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 12, y: 8 } },
        { role: "FIGHTER", at: { x: 13, y: 9 } },
      ],
    },
  ],
  // The Naval branch: Bone Neck is the only way in.
  forbiddenTechnologies: [
    "SHORECRAFT",
    "NAVIGATION",
    "NAVAL_ENGINEERING",
    "SEAMANSHIP",
    "SUBMERSIBLES",
  ],
  landmarks: [
    { tag: "TOWER", at: { x: 11, y: 10 } },
    { tag: "GATE", at: { x: 10, y: 6 } },
  ],
  // Take the gate city: with Bone Neck open the Marquis asks for terms. The
  // stars are for doing it by round 12 and for losing no city of your own.
  objective: {
    kind: "CAPTURE",
    places: ["GATE"],
    byRound: 14,
    bonus: [{ kind: "WITHIN_ROUNDS", rounds: 9 }, { kind: "KEEP_CITIES" }],
  },
};
