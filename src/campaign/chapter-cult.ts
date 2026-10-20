import type { CampaignChapterV7 } from "./chapter";

/**
 * The Cult campaign, "The Long Night" (`pulp_wars-hmyk.12`,
 * docs/product/SAGA.md sections 2.9 and 3.9): the saga's finale, six
 * missions of Mr. Silas Pettigrew rising from the Grey Lodge's minute-taker
 * to the Hierophant who holds the Herald's strand on the Long Night, from
 * the Ranger in the hedge at Greyhood to the capture of the Deep Gate. Data
 * only, in the shape of a chapter (`./chapter.ts`); each
 * mission's board, seats, objective and directives live in its engine
 * definition (`src/engine/v7/missions/cult-*.ts`).
 *
 * The briefings are the minutes of the Lodge's meetings, as the saga bible
 * writes them, trimmed to the card; the hints state the rules plainly and
 * never name a tile coordinate. The last closing is the saga's ending and
 * the outro its epilogue.
 */
export const CHAPTER_CULT_V7: CampaignChapterV7 = Object.freeze({
  id: "CULT",
  number: 9,
  title: "The Long Night",
  intro:
    "Silas Pettigrew was a junior clerk in the Lodge of the Unblinking Eye for nineteen years, and a junior clerk to Marshal Steele for six months. He knelt when everybody knelt and kept the minutes. On the Long Night the stars will be right for the last time in three hundred years, and Mr. Pettigrew has decided it is time somebody was promoted.",
  // Every mission seats you as the Cult (a fixed faction, no choice).
  missions: Object.freeze([
    Object.freeze({
      missionId: "CULT_1",
      number: 1,
      name: "Minutes of the Last Meeting",
      format: "KILL",
      briefing:
        "Minutes of the spring meeting of the Grey Lodge, Greyhood. Present: Brother Mallory (Hierophant), one brother, Mr. Pettigrew (minutes, on his afternoon off from the Marshal's office). Item one: Sergeant Hobb of the Rangers observed the meeting from a hedge and is riding for Northwatch. Item two: Sergeant Hobb is not to reach Northwatch. Item three: refreshments.",
      objective: "Stop Sergeant Hobb by turn 8.",
      hints: Object.freeze([
        "Hobb rides the road: an Imp is fast enough to catch him.",
        "Keep a channeller within 3 of every daemon.",
      ]),
      closing:
        "Sergeant Hobb was lost in the marsh. Marshal Steele signs the letter to his mother that Mr. Pettigrew drafted for her. It is a very kind letter.",
      names: Object.freeze({
        PETTIGREW: "Mr. Pettigrew",
        HOBB: "Sergeant Hobb",
        GREYHOOD: "Greyhood",
        MARSH_ROAD: "the Marsh Road",
      }),
    }),
    Object.freeze({
      missionId: "CULT_2",
      number: 2,
      name: "One Wrong Note",
      format: "CAPTURE",
      briefing:
        "Item one: Brother Mallory is dead, and the Lodge has elected a new Hierophant, Mr. Pettigrew, by a show of hands (one hand). Item two: the Ashen Marquis has found a Lullaby that would put the Guest back to sleep. Item three: the Lodge will borrow it from his archive at Cinderfield, change one note, and put it back. Item four: the Marquis is to believe we came for the silver.",
      objective: "Take Cinderfield by turn 15.",
      hints: Object.freeze([
        "Skeletons shrug off shots: send a Horror in.",
        "A frog loses its walls: Ribbit, then strike.",
        "An Offering trades two people for 6 Favour.",
      ]),
      closing:
        "One note in the Lullaby is changed, in a hand so like the Marquis's that he will never know. In the same drawer Mr. Pettigrew finds a torn page in the Founder's own hand. He files it in his pocket, unread, for later. Mr. Pettigrew always files things for later.",
      names: Object.freeze({
        PETTIGREW: "Mr. Pettigrew",
        GREYHOOD: "Greyhood",
        CINDERFIELD: "Cinderfield",
      }),
    }),
    Object.freeze({
      missionId: "CULT_3",
      number: 3,
      name: "Old Blood",
      format: "ESCORT",
      briefing:
        "Item one: the Grey Book says a Herald is paid for in old blood, and the oldest blood in the world is a dinosaur egg. Item two: the brethren at Greyhood were overrun by dinosaurs, and only one egg got away, aboard the Galleon of the Eye. Item three: the Galleon must sail the Lost Sea to Lamplight Cove, past the sea-beasts and the Martian skimmers. Item four: it is not to sink.",
      objective: "Bring the egg to Lamplight Cove by turn 13.",
      hints: Object.freeze([
        "Beside the Kraken, an enemy ship moves only one tile.",
        "The Galleon moves or shoots: never both in one turn.",
        "A Tentacle slaps the weakest beside it, even yours.",
      ]),
      closing:
        "The egg comes ashore at Lamplight Cove, warm and humming. Mr. Pettigrew has it put in a basket by the fire, and knits it a small cosy.",
      names: Object.freeze({
        GALLEON: "the Galleon of the Eye",
        LAMPLIGHT_COVE: "Lamplight Cove",
        REEDMOUTH: "Reedmouth",
      }),
    }),
    Object.freeze({
      missionId: "CULT_4",
      number: 4,
      name: "The Inspector Calls",
      format: "SURVIVE",
      briefing:
        "Item one: Mr. Pettigrew has been appointed the Crown's Inspector of Works, by himself, with a very good stamp. Item two: the Inspector and four brethren with toolbags will replace each bolt of the Great Seal with one of black wax. Item three: the dwarves will notice on the third day, and on the fourth the goblin who refused our gold, now an Honorary Dwarf. Item four: hold the Seal-works.",
      objective: "Hold the Seal-works for 12 turns.",
      hints: Object.freeze([
        "Research Metallurgy: a Gibbering Mass needs no strand.",
        "A hurt cultist drops its strand: keep them out of reach.",
        "Enemies beside an Idol Bearer can strike only the Bearer.",
      ]),
      closing:
        "The last bolt is wax by the twelfth day, and the brethren slip away in the snow. The dwarves count every bolt twice and find them all present. Grubnak, scratching his head, swears that one of them smelled of candles.",
      names: Object.freeze({
        PETTIGREW: "Mr. Pettigrew",
        SEAL_WORKS: "the Seal-works",
        DEEP_GATE: "the Deep Gate",
      }),
    }),
    Object.freeze({
      missionId: "CULT_5",
      number: 5,
      name: "Thaw",
      format: "KILL",
      briefing:
        "Item one: Mother Rime has made herself into a crown of ice on the summit, and while she stands the mountain is cold and the Guest sleeps through any note. Item two: Sister Agatha Vole, formerly of the Millford Ladies' Academy, has offered to drop a star on her. Item three: the Redcaps have been hired at the usual rate. Item four: a star needs a Stargazer, chanters, and one clear night.",
      objective: "Break the Winter Crown by turn 16.",
      hints: Object.freeze([
        "Chanters beside a Stargazer make its star hit harder.",
        "Rime never leaves her Crown: bring the star to her.",
        "A chanter who is hurt or moved drops out of the chant.",
      ]),
      closing:
        "The star falls on the summit at midnight, and the Winter Crown breaks into a thousand pieces of hail. By morning the snow on the Hollow Mountain is melting. The Ice Folk carry the pieces down, and say, as Ice Folk do, that Mother Rime will be back with the first snow.",
      names: Object.freeze({
        PETTIGREW: "Mr. Pettigrew",
        VOLE: "Sister Agatha Vole",
        RIME: "Mother Rime",
        SUMMIT: "the Winter Crown",
        HOOD_HOLLOW: "Hood Hollow",
      }),
    }),
    Object.freeze({
      missionId: "CULT_6",
      number: 6,
      name: "The Long Night",
      format: "CAPTURE",
      briefing:
        "Item one: tonight is the Long Night. Item two: the Pact is at the Deep Gate to ring the Lullaby, with Marshal Steele and every Ranger in the north. Item three: the Lullaby has a wrong note, the Seal has wax bolts, and the mountain is warm. Item four: whoever holds the Gate at dawn holds the leash of whatever comes up first. Item five: Mr. Pettigrew has not read the page in his pocket.",
      objective: "Take the Deep Gate by turn 16.",
      hints: Object.freeze([
        "Three chanters, 18 Favour, The Stars Are Right: Herald.",
        "Stand your own unit on the mark: no foe can block it.",
        "A Thing in the Cellar's grip makes one strand count three.",
      ]),
      closing:
        "On the wrong note the Hollow Mountain opens its eye, and up the shaft comes the Herald. Holding its strand, Mr. Pettigrew reads the page in his pocket: 'It eats the door first.' He tells it to sit. It sits on the shaft, and at dawn the window shuts for three hundred years.",
      names: Object.freeze({
        PETTIGREW: "Mr. Pettigrew",
        DEEP_GATE: "the Deep Gate",
        HOOD_HOLLOW: "Hood Hollow",
      }),
    }),
  ]),
  outro:
    "In the spring the Lodge of the Deep Gate sends its first invoices: to the Crown, the Thane, the Queen of Sugarcrest, the Warboss of the Hollow Hills and the Marshal of the Frontier. The Herald is hungry, the letters explain, and a hungry Herald may wander off its door. Everybody pays. The dead of the north lie down at last, the Ashen Marquis among them. The hooded ones no longer kneel to the winning side. Far below, under a bell with one wrong note, the eye that never blinks, blinks.",
});
