import type { CampaignChapterV7 } from "./chapter-1";

/**
 * The Humans campaign, "The Marshal's Law" (`pulp_wars-hmyk.4`,
 * docs/product/SAGA.md sections 2.1 and 3.1): six missions of Marshal
 * Steele's war on Baron Kessler in the year after the Lodge fell. Data
 * only, in the shape of the prologue's chapter (`./chapter-1.ts`); each
 * mission's board, seats, objective and directives live in its engine
 * definition (`src/engine/v7/missions/human-*.ts`).
 *
 * The briefings are the saga bible's, trimmed to the card; the hints state
 * the rules plainly and never name a tile coordinate.
 */
export const CHAPTER_HUMANS_V7: CampaignChapterV7 = Object.freeze({
  id: "HUMANS",
  number: 1,
  title: "The Marshal's Law",
  intro:
    "The Lodge has fallen and the Crown has made Vera Steele Marshal of the Frontier. Her first winter of peace is ending badly: the ground shakes, the dead won't stay down, and Baron Kessler has bought himself a royal writ.",
  startingFactions: Object.freeze(["ORIGINAL"] as const),
  missions: Object.freeze([
    Object.freeze({
      missionId: "HUMAN_1",
      number: 1,
      name: "Thaw at Northwatch",
      format: "CONQUEST",
      briefing:
        "Marshal Steele's first spring of peace begins with an earthquake and a knock on the barrow doors. The dead of Hollow Barrow are walking again, and this time nobody gave the order: the Ashen Marquis swears they are none of his. Mr. Pettigrew, your clerk, has already filed the incident report. Clear the barrow before the farmers start burying each other.",
      objective: "Take Hollow Barrow and the Barrow Camp.",
      hints: Object.freeze([
        "Stand on Graves: the dead rise only from free ones.",
        "The Necromancer raises them. Ride him down first.",
        "The dead march on Northwatch from turn 4.",
      ]),
      closing:
        "The barrow is quiet. In the mud a Ranger finds a grey hood, neatly folded. Mr. Pettigrew files it under Lost Property.",
      unlocks: Object.freeze([]),
    }),
    Object.freeze({
      missionId: "HUMAN_2",
      number: 2,
      name: "The Lord Protector's Writ",
      format: "CAPTURE",
      briefing:
        "Baron Kessler is back from Kingsport with a royal writ, a new title and an army of goblin mercenaries in red caps. As Lord Protector he has disbanded the Rangers, doubled the tolls and seized the three toll forts on the King's Road. Steele has read the writ twice and decided it is a forgery. Take the forts back before his Redcaps dig in.",
      objective: "Take the three toll forts by turn 18.",
      hints: Object.freeze([
        "Redcaps mob a lone unit: advance in a block.",
        "Explosives' Breach: melee ignores Walls.",
        "Win the gate in melee: the victor steps inside.",
      ]),
      closing:
        "The forts are yours, and the Crown has declared you an outlaw. Mr. Pettigrew has kept copies of everything. 'The Baron's accounts, Marshal. They do not add up.'",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        MUDFORD: "Mudford Toll",
        HALFWAY: "Halfway Toll",
        KINGSGATE: "Kingsgate",
      }),
    }),
    Object.freeze({
      missionId: "HUMAN_3",
      number: 3,
      name: "Outlaws of the Greenwood",
      format: "ESCORT",
      briefing:
        "An outlaw cannot hang a baron, but a judge can. The Royal Assizes sit at Kingsbridge in twenty days, and Mr. Pettigrew carries the Baron's ledgers in a box chained to his wrist. Redcaps comb the Greenwood for him, and something large that escaped the Baron's circus has been eating Redcaps ever since. Get your clerk to court alive.",
      objective: "Get Mr. Pettigrew to Kingsbridge by turn 20.",
      hints: Object.freeze([
        "Lead the Redcaps into the beasts' wood.",
        "The beasts keep to their wood: pass two steps clear.",
        "Mr. Pettigrew walks one step a turn. Keep him moving.",
      ]),
      closing:
        "The judge reads the ledgers and signs a warrant for the Baron. Kessler answers it as he answers everything: he hires more men, and a grey-hooded lodge, it seems, is for hire.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        PETTIGREW: "Mr. Pettigrew",
        KINGSBRIDGE: "Kingsbridge",
      }),
    }),
    Object.freeze({
      missionId: "HUMAN_4",
      number: 4,
      name: "The Siege of Fort Hollow",
      format: "SURVIVE",
      briefing:
        "Kessler has bought the Grey Lodge, the hooded men who knelt to you last autumn, and the Whitefang clan, Ice Folk who would sooner fight than freeze. Together they march on Fort Hollow, where this whole business began. Hold the fort for twelve days. The Ashen Marquis has promised a relief column, and the dead, he says, are never late, merely slow.",
      objective: "Hold Fort Hollow for 12 turns.",
      hints: Object.freeze([
        "Shoot the robed men, and their daemon turns on them.",
        "Farm the fort to level 5 and it sends a giant.",
        "Keep Mr. Pettigrew on the walls; train at the Mill.",
      ]),
      closing:
        "The dead arrive on the seventh day, bowing. The Grey Lodge scatters and the Whitefang go home to sulk. But the Baron has closed the river mouth with his fleet, and not a sack of grain will reach the Frontier this spring.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        FORT_HOLLOW: "Fort Hollow",
        PETTIGREW: "Mr. Pettigrew",
      }),
    }),
    Object.freeze({
      missionId: "HUMAN_5",
      number: 5,
      name: "Broadsides at Saltmarsh",
      format: "KILL",
      briefing:
        "Kessler's blockade sits at the mouth of the river: Redcap fire rafts, a diving barrel, and his treasure ship, the Golden Goose, a scrap-iron dreadnought carrying the Frontier's stolen taxes and his good cutlery. The Crown keeps no navy up here, so Steele is building one. Sink the Golden Goose and the blockade loses its paymaster.",
      objective: "Sink the Golden Goose by turn 20.",
      hints: Object.freeze([
        "Ships need Navigation to cross the deep sea.",
        "Torpedoes hit big ships, and nothing hits back.",
        "Fire Rafts Kaboom: never bunch your ships.",
      ]),
      closing:
        "The Golden Goose goes down with a sound like a dropped till. Unpaid, the Redcap fleet scatters, and every hired sword on the Frontier falls back on the one place still paying: Kessler Hall.",
      unlocks: Object.freeze([]),
      names: Object.freeze({ GOLDEN_GOOSE: "the Golden Goose" }),
    }),
    Object.freeze({
      missionId: "HUMAN_6",
      number: 6,
      name: "Kessler Hall",
      format: "CAPTURE",
      briefing:
        "Kessler Hall stands on its hill above the Baron's lands, with the last of the Redcaps in the yard, his circus beasts in the cellars and the Grey Lodge chanting in the chapel. Every road to it is a toll road. Take the Hall before midsummer. Grubnak has offered help, the Marquis has offered help, and Steele has said no to both: this one belongs to the Frontier.",
      objective: "Take Kessler Hall by turn 22.",
      hints: Object.freeze([
        "Goblins Gang Up: never leave a Knight alone by a fort.",
        "The Troll on the Hall's gate needs four lances at once.",
        "Kill the Lodge's channellers and its daemon turns on it.",
      ]),
      closing:
        "The Hall falls, but the Baron has slipped down the river to his island. In his strongroom lie two ledgers, his payments to the Grey Lodge and theirs to him, in one small, tidy hand. Mr. Pettigrew offers to file them.",
      unlocks: Object.freeze([]),
      names: Object.freeze({ KESSLER_HALL: "Kessler Hall" }),
    }),
  ]),
  outro:
    "Steele calls the Frontier Pact at Northwatch: Ranger, goblin, dwarf and dead man at one table. The Marquis brings a warning: the thing under the mountain will wake before the year turns, and somebody must be standing at the shaft when it does.",
});
