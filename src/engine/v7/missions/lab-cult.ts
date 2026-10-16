import type { MissionDefinitionV7 } from "./types";
import { LAB_DWARF_MID_V7 } from "./lab-dwarf";

/**
 * `LAB_CULT_MID` (the sixth Cult engine bead, `pulp_wars-mch9.8`;
 * docs/product/RULESET_7_CULTISTS.md section 21.6 and
 * docs/validation/TEXT_PLAY.md): the Cult roster in an even middle game,
 * for a hand player to judge in about ten rounds without playing an
 * opening. **It is built and checked, and has not been played**: the
 * hand-play fairness check of the Cult runs only if the user asks for it
 * (section 19 of the spec). Like the other labs it is an ordinary hidden
 * mission definition with no rule of its own. Its land, its cities, and its
 * Human side are those of `LAB_DWARF_MID`, so the rosters meet the same
 * opponent on the same ground.
 *
 * **The player is the Cult** (seat 0, west) against the Human Normal AI
 * (east), five cities a side with the same levels (a level-4 capital, two
 * level-3 cities, two level-2 cities at the front: 15 Coins a turn each).
 * The Cult owns the fourteen technologies that make every Cult unit
 * trainable and every rite possible: the thirteen of the Dwarf lab
 * (Leadership: the Summoner with Sacrifice, Seize, and Summon; Familiars
 * with Switcheroo; Hexers; Stargazers; Tentacles; Warding Circles: the Idol
 * Bearer; Gibbering Masses) and The Stars Are Right (the Great Summoning). It
 * does not own Harvest Rites (the Offering), Fieldcraft, or Roads. It holds
 * 17 units worth 53 Coins (6 Initiates, 3 Idol Bearers, 2 Familiars, 3
 * Hexers, 2 Summoners, and a Stargazer; 68 Coins in revision 1), two free unit
 * slots (one in the capital, one in the northern level-3 city), 20 Coins
 * before the income of the first turn (35 in hand on it), and **12 Favour**
 * (two Horrors, or the way to a Herald after Sacrifices worth 8 more): its
 * bodies are worth 12 Coins less than the Humans', and the Favour stands
 * for them (revision 1's numbers). It starts with no daemon: the first summoning is the player's.
 * The Humans hold 17 units worth 80 Coins with two free slots and 15 Coins
 * (30 on their first turn). The front cities are four tiles apart; two
 * neutral villages lie between the lines (an Initiate takes one in the turn
 * it arrives: Pamphlets). The AI has no directive: it plays the ordinary
 * Normal policy.
 *
 * Revision 2 (the Cult redesign's roster, `pulp_wars-mch9.31`,
 * docs/product/RULESET_7_CULT_REDESIGN.md section 15): the Caller and the
 * Chosen retired, so the Caller (3,6) is a Hexer and the two Chosen (6,4
 * and 6,10) an Idol Bearer and an Initiate; the cultists' new prices make
 * the 17 units worth 53 Coins. Chivalry (now Tentacles: the Summoner's
 * Tentacle) and Metallurgy (now Gibbering Masses) stay owned; Favour 12
 * stays.
 *
 * Checked again by the redesign's campaign bead (`pulp_wars-mch9.46`), with
 * no change to its state (still revision 2): on the first turn the two
 * Summoners side by side call an Imp (alone), a Horror, or a Gibbering Mass
 * (with the other's help); the Stargazer begins a star alone and the robed
 * units beside it (both Summoners and an Idol Bearer) may join the chant;
 * the three Idol Bearers raise their idols; and 12 Favour buys a Mass, a
 * Horror, and an Imp (5 + 4 + 2), or the Herald's 18 after Sacrifices
 * worth 6. Still unplayed.
 *
 * ```text
 *      x 0123456789ABCDEF
 * y  1   .Ge.....v....eG.      v: a neutral village
 *    2   .Om....f.....uO.      m, M: your cities; u, U: the AI's
 *    3   .L...e........L.      f: Forest; G: Forest with Game
 *    4   .....m.f.f......      L: Forest with a Lumber Camp
 *    5   ....fe..f.ue....      e: Fertile Ground
 *    6   .Le.......ef....      O: a Mountain with Ore; ^: a Mountain
 *    7   .OM.....^....eL.      M: your capital
 *    8   .L.....^.....UO.      U: its walled capital
 *    9   ....fe........L.
 *   10   .....m.f..e.....
 *   11   .....e..f.uf....
 *   12   .L........e...L.
 *   13   .Om.....f....uO.
 *   14   .Ge.....v....eG.
 * ```
 */
const [dwarfSeat, humanSeat] = LAB_DWARF_MID_V7.seats;
if (dwarfSeat === undefined || humanSeat === undefined)
  throw new RangeError("LAB_DWARF_MID has no seats");

export const LAB_CULT_MID_V7: MissionDefinitionV7 = {
  id: "LAB_CULT_MID",
  revision: 2,
  hidden: true,
  size: LAB_DWARF_MID_V7.size,
  seed: 20261008,
  terrain: LAB_DWARF_MID_V7.terrain,
  resources: LAB_DWARF_MID_V7.resources,
  biome: LAB_DWARF_MID_V7.biome,
  villages: LAB_DWARF_MID_V7.villages,
  ...(LAB_DWARF_MID_V7.improvements === undefined
    ? {}
    : { improvements: LAB_DWARF_MID_V7.improvements }),
  aiMode: "RIVAL",
  seats: [
    {
      faction: "CULT",
      coins: 20,
      favour: 12,
      technologies: [
        "GATHERING",
        // Leadership: the Summoner (Sacrifice, Seize, Summon Horror).
        "ADMINISTRATION",
        "HUNTING",
        "FORESTRY",
        // Stargazers (Star-fall).
        "SAWMILLING",
        // Hexers (Ribbit).
        "MARKSMANSHIP",
        // Familiars (Switcheroo).
        "SCOUTING",
        "RAIDING",
        // Tentacles (the Summoner's Tentacle).
        "CHIVALRY",
        "DRILL",
        // Warding Circles: the Idol Bearer (Behold!).
        "FORTIFICATION",
        "ENGINEERING",
        // Gibbering Masses (the Forge; the Summoner's Mass).
        "METALLURGY",
        // The Stars Are Right: the Great Summoning.
        "EXPLOSIVES",
      ],
      // The cities of the Dwarf lab. Unit slots: 5, 4, 4, 3, 3; every Cult
      // unit fills one (a daemon fills none).
      cities: dwarfSeat.cities,
      // Every center is free, so a city with a slot trains on the first
      // turn.
      units: [
        // The capital's (one free slot): the two Summoners side by side (a
        // Horror on the first turn), a Hexer (the Caller before revision 2),
        // and the Stargazer behind the line.
        { role: "CAPTAIN", at: { x: 4, y: 7 } },
        { role: "CAPTAIN", at: { x: 3, y: 8 } },
        { role: "MARKSMAN", at: { x: 3, y: 6 } },
        { role: "CATAPULT", at: { x: 4, y: 8 } },
        // The northern cities' (one free slot in the level-3 city; the
        // front city is full).
        { role: "FIGHTER", at: { x: 3, y: 2 }, home: 1 },
        { role: "RAIDER", at: { x: 4, y: 2 }, home: 1 },
        { role: "MARKSMAN", at: { x: 5, y: 3 }, home: 1 },
        { role: "GUARD", at: { x: 6, y: 4 }, home: 3 },
        { role: "GUARD", at: { x: 6, y: 3 }, home: 3 },
        { role: "FIGHTER", at: { x: 6, y: 5 }, home: 3 },
        // The southern cities' (both full).
        { role: "FIGHTER", at: { x: 3, y: 13 }, home: 2 },
        { role: "RAIDER", at: { x: 4, y: 12 }, home: 2 },
        { role: "MARKSMAN", at: { x: 5, y: 11 }, home: 2 },
        { role: "GUARD", at: { x: 5, y: 7 }, home: 2 },
        { role: "FIGHTER", at: { x: 6, y: 10 }, home: 4 },
        { role: "FIGHTER", at: { x: 6, y: 11 }, home: 4 },
        { role: "FIGHTER", at: { x: 6, y: 9 }, home: 4 },
      ],
      reveal: dwarfSeat.reveal,
    },
    // The Human side of `LAB_DWARF_MID`.
    humanSeat,
  ],
  forbiddenTechnologies: LAB_DWARF_MID_V7.forbiddenTechnologies,
  objective: { kind: "DOMINATION" },
};
