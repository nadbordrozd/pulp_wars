import type { CampaignChapterV7 } from "./chapter";

/**
 * The Martian campaign, "Signal from Home" (`pulp_wars-hmyk.7`,
 * docs/product/SAGA.md sections 2.6 and 3.6): six missions of Captain
 * Quaxx's stranded Martians, who want to call home and learn what called
 * them here. Data only, in the shape of a chapter
 * (`./chapter.ts`); each mission's board, seats, objective and
 * directives live in its engine definition
 * (`src/engine/v7/missions/martian-*.ts`).
 *
 * The briefings are the saga bible's (Quaxx's captain's log), trimmed to
 * the card; the hints state the rules plainly and never name a tile
 * coordinate.
 */
export const CHAPTER_MARTIANS_V7: CampaignChapterV7 = Object.freeze({
  id: "MARTIANS",
  number: 4,
  title: "Signal from Home",
  intro:
    "The Overmind is dead and the Glass Ship is broken. Captain Quaxx and three hundred Martians are stranded on a wet, green, noisy planet. They answered a call to come here. Now they would like to make one to go home.",
  // Every mission seats you as the Martians (a fixed faction, no choice).
  missions: Object.freeze([
    Object.freeze({
      missionId: "MARTIAN_1",
      number: 1,
      name: "Strangers in a Strange Land",
      format: "CONQUEST",
      briefing:
        "Captain's log, Earth summer. Our colony at Saucer Field has neighbours: goblins, who have discovered that a crashed saucer is worth more in pieces. They have stripped two already and are wearing the parts as hats. Their camps lie across the water and the Rift. Recover the saucers, Captain. Teach the natives to respect the Shield. They are coming for the colony first.",
      objective: "Take both scrap camps by turn 20.",
      hints: Object.freeze([
        "A heat ray hits hardest from a gun that has not moved.",
        "Shields soak a hit and refill at the start of your turn.",
        "A Saucer beams down a unit from beside any of your towns.",
      ]),
      closing:
        "The goblins are gone, and so are two saucers, but we have their hats. Our scientists report that to decode the call that brought us here, they need a native who understands the stars.",
      names: Object.freeze({ QUAXX: "Captain Quaxx" }),
    }),
    Object.freeze({
      missionId: "MARTIAN_2",
      number: 2,
      name: "Abduction at Millford",
      format: "CAPTURE",
      briefing:
        "Professor Ambrose Haddock of the Millford Observatory has published four papers on last autumn's falling stars and been laughed at for all of them. He is exactly the native we need. Collect him. Millford's militia will object, so bring a Brain: the natives are far more reasonable when they are fighting for us. Do not damage the telescope. The county is mustering.",
      objective: "Take Millford by turn 22.",
      hints: Object.freeze([
        "A Brain takes up to three enemies beside it.",
        "An enemy taken on a town's centre can capture it.",
        "A Brain is frail: keep a Shield Projector beside it.",
      ]),
      closing:
        "Professor Haddock steps aboard in his slippers and asks to see the engine. Millford is handed back with an apology. The Professor has a theory about the bell under the mountain, and to test it he needs the Glass Ship's star-drive core.",
      names: Object.freeze({ QUAXX: "Captain Quaxx", MILLFORD: "Millford" }),
    }),
    Object.freeze({
      missionId: "MARTIAN_3",
      number: 3,
      name: "The Glass Ship",
      format: "ESCORT",
      briefing:
        "The Glass Ship still lies in the Crater on the dinosaur island, and the beasts that guard it hate it more than ever. The star-drive core is too heavy to fly: a Tripod must carry it through the jungle and across the strait to Ray Hollow. The beasts will come for it. So will the sea. Bring the core home, and quickly: the whole island is hunting it.",
      objective: "Walk the core to Ray Hollow by turn 16.",
      hints: Object.freeze([
        "With Hover Pods, foot units launch from any beach.",
        "One torpedo sinks a Tripod afloat: cross out of reach.",
        "The ford in the south is shallow: two steps of water.",
      ]),
      closing:
        "The core is home. Haddock wires it to the big dish at Red Dust and points the dish at the mountain. 'Listen,' he says. 'It is still calling.'",
      names: Object.freeze({
        CORE_WALKER: "the Core-Walker",
        RAY_HOLLOW: "Ray Hollow",
      }),
    }),
    Object.freeze({
      missionId: "MARTIAN_4",
      number: 4,
      name: "Red Dust",
      format: "SURVIVE",
      briefing:
        "The dish is listening, and something is listening back. Every night the core hums, and the dead of the Rift Lakes climb out of the ground and walk toward the dish. Haddock needs sixteen nights to decode the call. Hold Red Dust until he does. Queen Praline of Sugarcrest, who remembers who saved her kingdom last autumn, holds her walls across the lake.",
      objective: "Hold Red Dust for 16 turns.",
      hints: Object.freeze([
        "Plague goes through Shields: kill the Liches first.",
        "Two Grunts beamed beside a Lich finish it in a turn.",
        "Keep a unit on Red Dust's centre.",
      ]),
      closing:
        "Haddock has half of it: the call came from the bell under the mountain, in a language older than this planet. Quaxx sends a mothership to borrow the bell and saucers after a stolen crate. The rest is in the Lodge's orrery at Candlewick.",
      names: Object.freeze({
        RED_DUST: "Red Dust",
        SUGARCREST: "Sugarcrest",
      }),
    }),
    Object.freeze({
      missionId: "MARTIAN_5",
      number: 5,
      name: "The Orrery at Candlewick",
      format: "CAPTURE",
      briefing:
        "Candlewick is a quiet town of candle-makers on the mountain's slope that has thrown out Steele's reeve and started lighting very large candles. In its meeting hall stands the Lodge's orrery, a brass machine that shows when the stars will be right. The Grey Lodge has hired Redcaps to guard it, with orders to melt it down if anyone comes. Take Candlewick first, before the Redcaps arrive in force.",
      objective: "Take Candlewick by turn 20.",
      hints: Object.freeze([
        "A marked star falls next turn: get out from under it.",
        "Beside an idol you may hit only the Idol Bearer.",
        "A Brain beside the centre can take whoever stands on it.",
      ]),
      closing:
        "Haddock sets the orrery running. The stars are right until midwinter, the Long Night, and then not again for three hundred years. When he plays the call through its brass, every Martian in the room knows the voice. It is the voice of Mars.",
      names: Object.freeze({ CANDLEWICK: "Candlewick" }),
    }),
    Object.freeze({
      missionId: "MARTIAN_6",
      number: 6,
      name: "Starfall over Red Dust",
      format: "KILL",
      briefing:
        "Captain's log: the truth. Mars was green once. Something like the thing under this mountain woke there, called with the voices of the living, and ate until our world was red and still. The call that brought us here was our grandmothers' voices in its mouth. Three of the Lodge's Stargazers are pulling stars down on Red Dust. Kill them. Then we will decide whether we are going home.",
      objective: "Kill the three Stargazers by turn 16.",
      hints: Object.freeze([
        "Hurt or move a chanter and the star hits softer.",
        "Hurt a Stargazer and its marked star never falls.",
        "Take an idol with a Brain: its circle can strike only it.",
      ]),
      closing:
        "The last star falls short. Quaxx asks her crew who wants to go home. Nobody raises a hand. 'Then we stay,' she says. The date of the Long Night and the star-chart go to the Pact by the Crown's courier, a helpful clerk named Pettigrew.",
      names: Object.freeze({
        QUAXX: "Captain Quaxx",
        STARGAZER_1: "the Stargazer of Hob's Knoll",
        STARGAZER_2: "the Stargazer of Cairn Top",
        STARGAZER_3: "the Stargazer of Owl Hill",
      }),
    }),
  ]),
  outro:
    "The Martians stay. Mars was green once, and the thing that made it red is asleep under a mountain on this world. 'Not twice,' says Captain Quaxx, and the colony at Red Dust turns its dish to the stars to watch for the Long Night.",
});
