import type { CampaignChapterV7 } from "./chapter-1";

/**
 * The Dinosaur campaign, "The Egg Thief" (`pulp_wars-hmyk.6`,
 * docs/product/SAGA.md sections 2.5 and 3.5): six missions of the Old
 * Queen's hunt for her stolen clutch, from the poachers' camps on the
 * island to the Grey Lodge's town in the marsh. Data only, in the shape of
 * the prologue's chapter (`./chapter-1.ts`); each mission's board, seats,
 * objective and directives live in its engine definition
 * (`src/engine/v7/missions/dinosaur-*.ts`).
 *
 * The briefings are the saga bible's, trimmed to the card; the hints state
 * the rules plainly and never name a tile coordinate.
 */
export const CHAPTER_DINOSAURS_V7: CampaignChapterV7 = Object.freeze({
  id: "DINOSAURS",
  number: 3,
  title: "The Egg Thief",
  intro:
    "On the Island That Time Forgot the Old Queen has outlived the Overmind and the Baron's ships. This summer she laid her first clutch. Then the Baron, ruined by goblins and owing money to men in hoods, came back for it.",
  // Every mission seats you as the Dinosaurs (a fixed faction, no
  // choice), so the chapter unlocks nothing for the prologue's faction
  // choices.
  startingFactions: Object.freeze([]),
  missions: Object.freeze([
    Object.freeze({
      missionId: "DINOSAUR_1",
      number: 1,
      name: "The Empty Nest",
      format: "CONQUEST",
      briefing:
        "The Old Queen woke to an empty nest and a trail of boot prints. Shaman Oona read them: big boots, many men, the Baron's. They carried the eggs to the poachers' camps on the coast. The Queen is very angry. Oona says: follow the boots. Eat the boots.",
      objective: "Take both of the poachers' camps.",
      hints: Object.freeze([
        "Dinosaurs grow when they kill: feed the young ones.",
        "A city lays an Egg beside it; a Raptor hatches next turn.",
        "Alone, the Queen is shot to pieces: bring the pack.",
      ]),
      closing:
        "The camps are empty of eggs. One poacher, before he runs, says the eggs went with the Major. The Major always gets his trophies home.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        OLD_QUEEN: "the Old Queen",
        OONA: "Shaman Oona",
      }),
    }),
    Object.freeze({
      missionId: "DINOSAUR_2",
      number: 2,
      name: "Big Game",
      format: "KILL",
      briefing:
        "Major Basil Thornbury has shot one of everything and stuffed most of it. He is the Baron's hunter, he has the Queen's eggs in a crate, and he is up in the tar country with a rifle that can stop a Triceratops at a hundred paces. He has hired Redcap trackers, who are very good at finding dinosaurs and very bad at running away from them. Hunt the hunter.",
      objective: "Kill Major Thornbury by turn 20.",
      hints: Object.freeze([
        "Spitter acid ignores cover, Walls and Field Defense.",
        "Dinosaurs cannot climb the tar peaks: shoot from below.",
        "A Caveman hits harder beside one of your dinosaurs.",
      ]),
      closing:
        "Thornbury is stuffed, by the Queen, personally. His crate is empty. His diary says the eggs went on the Baron's last ship to the mainland, to the Baron's circus, where the buyers come.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        OLD_QUEEN: "the Old Queen",
        THORNBURY: "Major Thornbury",
      }),
    }),
    Object.freeze({
      missionId: "DINOSAUR_3",
      number: 3,
      name: "The Sea Road",
      format: "ESCORT",
      briefing:
        "Dinosaurs do not sail. Dinosaurs have never needed to. But the eggs are across the sea, so the cavemen have hollowed out the biggest logs on the island and the sea-reptiles have come up from the deep. The Baron's last warships stand between the island and the mainland. Get the Queen across. Mind the old serpent in the deep water: it is nobody's friend.",
      objective: "Bring the Queen to Big Top Bay by turn 22.",
      hints: Object.freeze([
        "A Dugout rams harder after a run of two tiles.",
        "A Plesiosaur torpedoes from below, unanswered.",
        "A ship carrying the Queen is the weakest thing afloat.",
      ]),
      closing:
        "The Old Queen steps ashore on the mainland, the first queen of her kind to do it. Behind the dunes a brass band is playing. The Baron's Travelling Wonder Circus is in town.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        OLD_QUEEN: "the Old Queen",
        BIG_TOP_BAY: "Big Top Bay",
      }),
    }),
    Object.freeze({
      missionId: "DINOSAUR_4",
      number: 4,
      name: "The Greatest Show on Earth",
      format: "KILL",
      briefing:
        "Kessler's Travelling Wonder Circus has pitched its big top under the hills: cages of stolen beasts, Redcap roustabouts with cattle-prods, and the Baron himself in a ringmaster's coat, selling tickets. The eggs are not here. He sold them last week to men in hoods. But the Baron is here. Break open the cages, and the Queen would like a word with the ringmaster.",
      objective: "Kill Baron Kessler by turn 18.",
      hints: Object.freeze([
        "Charge! ignores Walls and shoves the target back.",
        "Kill one Guard of the ring and the Queen goes on in.",
        "The freed beasts join you on turns 6 and 10.",
      ]),
      closing:
        "The Queen has her word with the ringmaster. All that is found of Baron Otto Kessler is his hat. In its lining is his pocket-book: 'Eggs, eight, sold to the Grey Lodge, Greyhood, for the Long Night. Paid in full.'",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        OLD_QUEEN: "the Old Queen",
        KESSLER: "Baron Kessler",
      }),
    }),
    Object.freeze({
      missionId: "DINOSAUR_5",
      number: 5,
      name: "Through the Barrowlands",
      format: "ESCORT",
      briefing:
        "Greyhood lies across the Barrowlands, and the eggs are giving off a smell of old blood that wakes every corpse for miles. The Unquiet are rising all along the road, and the Redcaps, unpaid since the Baron's unfortunate accident, have taken service with the hoods. The Martians, who have not forgotten who ate the Overmind, have offered saucers. Get the Queen to the edge of the marsh.",
      objective: "Bring the Queen to Mire's Edge by turn 18.",
      hints: Object.freeze([
        "Bitten units rise as Zombies: keep the wounded back.",
        "Never let the Queen walk alone into the barrows.",
        "Kill the Necromancers and the Graves stay quiet.",
      ]),
      closing:
        "At the marsh's edge the Queen stops and lifts her head. Out in the reeds the Grey Lodge is singing, and somewhere in the singing are eight small heartbeats.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        OLD_QUEEN: "the Old Queen",
        MIRES_EDGE: "Mire's Edge",
      }),
    }),
    Object.freeze({
      missionId: "DINOSAUR_6",
      number: 6,
      name: "Old Blood",
      format: "CAPTURE",
      briefing:
        "The Grey Lodge means to offer the Queen's eggs to the thing under the mountain: the oldest blood in the world, they say, for the oldest hunger. Every egg they offer brings them closer to calling up something worse than a dinosaur. Take Greyhood before the last egg is offered. Oona says the Queen's blood remembers that hunger.",
      objective: "Take Greyhood by turn 18.",
      hints: Object.freeze([
        "Hit the cultists holding a daemon, and it turns on them.",
        "A daemon set loose bites whoever stands nearest.",
        "Beside a raised idol you may hit only the Bearer.",
      ]),
      closing:
        "Seven eggs come home through the reeds; the eighth slipped out of the marsh at dawn on a black-sailed galleon. The Queen's blood remembers the star that fell, the fire, and the long cold after it. 'Cold,' says Oona. 'It sleeps in cold.'",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        GREYHOOD: "Greyhood",
        OLD_QUEEN: "the Old Queen",
        OONA: "Shaman Oona",
      }),
    }),
  ]),
  outro:
    "Seven eggs come home to Thunder Nest. The eighth is gone with a black sail. And the Pact has learned from the oldest blood in the world the one thing that ever put the hunger to sleep: cold.",
});
