import type { MissionDefinitionV7 } from "./types";

/**
 * `UNDEAD_6` "The Founder's Tomb" (docs/product/SAGA.md section 3.2, U6;
 * the Undead campaign, `pulp_wars-hmyk.5`). The Marquis's grave lies under
 * the Rangers' Lodge on the summit. The Grey Lodge wants its old temple
 * back and has hired the Whitefang clan to help it up the slopes; hold
 * for 16 rounds while the Marquis goes down into his tomb. Step 6 of 6: a
 * rescue. No unit may step into an ally's land, so the dead must hold the
 * slopes in front of the Rangers' walls: daemons from the marsh to the
 * east, the Whitefang and their frost from the snowline to the west.
 *
 * The board is the map generator's (Dry Land 16, seed 23): the Lodge on
 * a walled plateau in the north, Greyhood in the eastern woods, the
 * Whitefang camp in the north-western highlands, and the Marquis's Ashby
 * Camp on the southern slope with Cinderwick, a hamlet of his, on the
 * eastern one. The Lodge (`ASSAULT`) and the Whitefang (`ASSAULT`) both
 * go for the Lodge, the Lodge's second and third bands in rounds 5 and 9,
 * the Whitefang's in rounds 6 and 10; the Rangers keep to their walls
 * (`HOLD`) and train a fresh Guard whenever the centre's falls.
 *
 * Hand play (CAMPAIGN.md section 16) set the shape: Ashby Camp was over
 * its unit limit with no second town, so nothing could be trained; the
 * Whitefang camp beside Ashby, `RUSH`ing, went for the camp instead of
 * the Lodge and fell in round 4. Liches outrange both enemies, the
 * Vampire only finishes the wounded.
 *
 * ```text
 *      x 0123456789012345
 * y  0   ^^.^^f.^f^^f^fff
 *    1   ^^^..fff^..^.fff
 *    2   f^W^f^.^.L.f..ff      W: Whitefang Camp; L: the Rangers' Lodge
 *    3   ^f..f^^.f^.f.^G.      G: Greyhood
 *    4   ^^^..^^^f.ff.^^f
 *    5   ......^^f.^f..^.
 *    6   f........^fff.f^
 *    7   f^^...^^.^ff^fx^      x: the Rift
 *    8   ^.f.f.A.^.ffCfxf      A: Ashby Camp; C: Cinderwick
 *    9   ...^.^..^f.ff.xf
 *   10   ......f^....f^f^
 *   11   f........^......
 *   12   ....f....^..f...
 *   13   f.....^.........
 *   14   .v....f..v..$...      v: villages; $: a treasure chest
 *   15   .....f.f.fff..^f
 * ```
 */
export const UNDEAD_6_V7: MissionDefinitionV7 = {
  id: "UNDEAD_6",
  revision: 1,
  seed: 20261306,
  // <map>
  size: 16,
  source: {
    mapType: "DRY_LAND",
    size: 16,
    seats: 4,
    seed: 23,
    edits: [
      // The Lodge's plateau: two woods cleared for its fields.
      { kind: "TERRAIN", at: { x: 8, y: 2 }, terrain: "." },
      { kind: "TERRAIN", at: { x: 10, y: 2 }, terrain: "." },
      // Ashby Camp's fields: a wood cleared and a patch of soil worked.
      { kind: "TERRAIN", at: { x: 7, y: 9 }, terrain: "." },
      { kind: "RESOURCE", at: { x: 5, y: 8 }, resource: "." },
      // The Lodge and Ashby Camp stand on villages; the rest would be
      // more camps for the Lodge and the Whitefang.
      { kind: "VILLAGE", at: { x: 9, y: 2 }, present: false },
      { kind: "VILLAGE", at: { x: 6, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 1 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 5 }, present: false },
      { kind: "VILLAGE", at: { x: 3, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 9, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 12, y: 8 }, present: false },
      { kind: "VILLAGE", at: { x: 1, y: 11 }, present: false },
      { kind: "VILLAGE", at: { x: 7, y: 11 }, present: false },
      { kind: "CHEST", at: { x: 4, y: 3 }, present: false },
    ],
  },
  terrain: [
    "^^.^^f.^f^^f^fff",
    "^^^..fff^..^.fff",
    "f^.^f^.^...f..ff",
    "^f..f^^.f^.f.^..",
    "^^^..^^^f.ff.^^f",
    "......^^f.^f..^.",
    "f........^fff.f^",
    "f^^...^^.^ff^fx^",
    "^.f.f...^.ff.fxf",
    "...^.^..^f.ff.xf",
    "......f^....f^f^",
    "f........^......",
    "....f....^..f...",
    "f.....^.........",
    "......f.........",
    ".....f.f.fff..^f",
  ],
  resources: [
    "..ro.g........gg",
    ".o....ggor...gg.",
    "g..o.oeo...gr.g.",
    "og...oo..o.geo..",
    "o.or.ooo.eg....g",
    "....r.oo..og..o.",
    "........rog.....",
    ".oo.r.oo.oggog..",
    "........o.g.....",
    ".eeor.r..geg.e.g",
    ".eeree..e.ee.o..",
    "..e.er..eo.rr..e",
    "r.e..eer..erg.r.",
    "g....r.r....e..r",
    "r..r.rg.r.r..rrr",
    "e.....e...g..r.g",
  ],
  biome: "PLAINS",
  biomes: [
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHHWWWWW",
    "HHHHHHHHHHWWWWWW",
    "HHHHHHHHHHWWWWWW",
    "HHHHHHHHHHWWWWWW",
    "HHHHHHHHHHWWWWWW",
    "HHHHHHHHHHWWWWWW",
    "PPPPPHHHHHWWWWWW",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
    "PPPPPPPPPPPPPPPP",
  ],
  villages: [
    { x: 1, y: 14 },
    { x: 9, y: 14 },
  ],
  treasureChests: [{ x: 12, y: 14 }],
  // </map>
  aiMode: "RIVAL",
  seats: [
    {
      faction: "UNDEAD",
      coins: 8,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "HUNTING",
        "MARKSMANSHIP",
        "FORESTRY",
        "SAWMILLING",
        "DRILL",
        "FORTIFICATION",
        "ENGINEERING",
        "PLANNING",
      ],
      cities: [
        {
          name: "Ashby Camp",
          at: { x: 6, y: 8 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
        { name: "Cinderwick", at: { x: 12, y: 8 }, level: 1, rewards: [] },
      ],
      units: [
        { role: "KNIGHT", at: { x: 6, y: 6 }, tag: "MARQUIS" },
        { role: "CAPTAIN", at: { x: 6, y: 8 }, tag: "CRANE" },
        { role: "CATAPULT", at: { x: 7, y: 8 } },
        { role: "FIGHTER", at: { x: 5, y: 7 } },
        { role: "GUARD", at: { x: 5, y: 8 } },
        { role: "FIGHTER", at: { x: 12, y: 8 }, home: 1 },
        { role: "MARKSMAN", at: { x: 11, y: 7 }, home: 1 },
      ],
      // The slopes, the summit and both enemy camps.
      reveal: { radius: 2, rects: [{ x0: 2, y0: 0, x1: 15, y1: 6 }] },
    },
    {
      // The Grey Lodge, come for its old temple.
      faction: "CULT",
      coins: 3,
      favour: 10,
      technologies: [
        "GATHERING",
        "ADMINISTRATION",
        "DRILL",
        "FORTIFICATION",
        "HUNTING",
      ],
      cities: [
        {
          name: "Greyhood",
          at: { x: 14, y: 3 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "CAPTAIN", at: { x: 14, y: 3 } },
        { role: "CAPTAIN", at: { x: 13, y: 2 } },
        { role: "GUARD", at: { x: 12, y: 3 } },
        { role: "FIGHTER", at: { x: 12, y: 2 } },
        { role: "FIGHTER", at: { x: 12, y: 4 } },
        { role: "FIGHTER", at: { x: 13, y: 5 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 4, y0: 0, x1: 13, y1: 9 }] },
      // Summoners, Initiates and Idol Bearers with Favour for Imps and
      // Horrors; no Hexers, Familiars, Stargazers, Tentacles or Masses.
      forbiddenTechnologies: [
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "FORESTRY",
        "SAWMILLING",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      directive: { kind: "ASSAULT", target: { x: 9, y: 2 } },
    },
    {
      // The Whitefang clan, hired to help the Lodge up the slopes.
      faction: "ICE_FOLK",
      coins: 3,
      technologies: ["HUNTING", "DRILL", "ENGINEERING"],
      cities: [
        {
          name: "Whitefang Camp",
          at: { x: 2, y: 2 },
          level: 2,
          rewards: ["STOCKPILE"],
        },
      ],
      units: [
        { role: "FIGHTER", at: { x: 2, y: 2 } },
        // Chief Gnash.
        { role: "SWORDSMAN", at: { x: 3, y: 3 } },
        { role: "FIGHTER", at: { x: 4, y: 1 } },
        { role: "FIGHTER", at: { x: 3, y: 2 } },
        { role: "FIGHTER", at: { x: 2, y: 3 } },
        { role: "FIGHTER", at: { x: 5, y: 1 } },
        { role: "RAIDER", at: { x: 4, y: 2 } },
      ],
      reveal: { radius: 2, rects: [{ x0: 3, y0: 0, x1: 12, y1: 9 }] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "FORESTRY",
        "SAWMILLING",
        "MARKSMANSHIP",
        "FIELDCRAFT",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The clan goes up the western slope for the Lodge.
      directive: { kind: "ASSAULT", target: { x: 9, y: 2 } },
    },
    {
      // Marshal Steele's Rangers, on watch at the Lodge since the autumn.
      faction: "ORIGINAL",
      coins: 0,
      technologies: ["HUNTING", "MARKSMANSHIP", "DRILL", "FORTIFICATION"],
      cities: [
        {
          name: "Rangers' Lodge",
          at: { x: 9, y: 2 },
          level: 3,
          rewards: ["STOCKPILE", "WALLS"],
        },
      ],
      units: [
        { role: "GUARD", at: { x: 9, y: 2 } },
        { role: "MARKSMAN", at: { x: 8, y: 2 } },
        { role: "MARKSMAN", at: { x: 10, y: 3 } },
        { role: "FIGHTER", at: { x: 10, y: 1 } },
      ],
      reveal: { radius: 2, rects: [] },
      forbiddenTechnologies: [
        "FARMING",
        "MILLING",
        "FORESTRY",
        "SAWMILLING",
        "SCOUTING",
        "ROADS",
        "COMMERCE",
        "RAIDING",
        "CHIVALRY",
        "ENGINEERING",
        "METALLURGY",
        "EXPLOSIVES",
      ],
      // The Rangers keep to their walls.
      directive: { kind: "HOLD", zone: [{ x0: 8, y0: 1, x1: 10, y1: 3 }] },
    },
  ],
  teams: [0, 1, 1, 0],
  // The dead of the old court, under the southern slope.
  graves: [
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 8, y: 6 },
  ],
  reinforcements: [
    {
      seat: 1,
      round: 5,
      units: [
        { role: "CAPTAIN", at: { x: 15, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 6 } },
        { role: "FIGHTER", at: { x: 12, y: 5 } },
        { role: "GUARD", at: { x: 14, y: 6 } },
      ],
    },
    {
      seat: 2,
      round: 6,
      units: [
        { role: "FIGHTER", at: { x: 1, y: 3 } },
        { role: "FIGHTER", at: { x: 2, y: 4 } },
        { role: "RAIDER", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
      ],
    },
    {
      seat: 1,
      round: 9,
      units: [
        { role: "CAPTAIN", at: { x: 15, y: 5 } },
        { role: "FIGHTER", at: { x: 13, y: 6 } },
        { role: "FIGHTER", at: { x: 12, y: 5 } },
        { role: "FIGHTER", at: { x: 14, y: 6 } },
      ],
    },
    {
      seat: 2,
      round: 10,
      units: [
        { role: "SWORDSMAN", at: { x: 1, y: 3 } },
        { role: "FIGHTER", at: { x: 2, y: 4 } },
        { role: "FIGHTER", at: { x: 3, y: 4 } },
        { role: "FIGHTER", at: { x: 4, y: 3 } },
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
  landmarks: [{ tag: "THE_LODGE", at: { x: 9, y: 2 } }],
  // Sixteen rounds, and the Rangers' Lodge must not fall. The stars: Crane
  // lives, and no city lost.
  objective: {
    kind: "SURVIVE",
    rounds: 16,
    protect: [{ place: "THE_LODGE" }],
    bonus: [{ kind: "UNIT_ALIVE", unit: "CRANE" }, { kind: "KEEP_CITIES" }],
  },
};
