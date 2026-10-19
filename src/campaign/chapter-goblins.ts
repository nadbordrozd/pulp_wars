import type { CampaignChapterV7 } from "./chapter-1";

/**
 * The Goblin campaign, "The Big Score" (`pulp_wars-hmyk.8`,
 * docs/product/SAGA.md sections 2.3 and 3.3): six missions of Grubnak the
 * Loud's heist, from the Baron's last fort on the mainland to the getaway
 * through the Hollow Hills to the Ironbraid Gate. Data only, in the shape of
 * the prologue's chapter (`./chapter-1.ts`); each mission's board, seats,
 * objective and directives live in its engine definition
 * (`src/engine/v7/missions/goblin-*.ts`).
 *
 * The briefings are the saga bible's, trimmed to the card; the hints state
 * the rules plainly and never name a tile coordinate.
 */
export const CHAPTER_GOBLINS_V7: CampaignChapterV7 = Object.freeze({
  id: "GOBLINS",
  number: 5,
  title: "The Big Score",
  intro:
    "Peace has been very bad for Grubnak the Loud. The Warrens are tidy, the wolves are fat, and Marshal Steele keeps sending him thank-you letters. Then a rumour comes up the river: Baron Kessler has run to his island with a vault full of everybody's money.",
  // Every mission seats you as the Goblins (a fixed faction, no choice),
  // so the chapter unlocks nothing for the prologue's faction choices.
  startingFactions: Object.freeze([]),
  missions: Object.freeze([
    Object.freeze({
      missionId: "GOBLIN_1",
      number: 1,
      name: "Grubnak Gets Bored",
      format: "CONQUEST",
      briefing:
        "The Baron's last soldiers on the mainland are sitting in Fort Bullion with nothing to guard but his paperwork. Grubnak has never read paperwork, but he can smell a map. Take the fort, find the papers, and give the one with a drawing of a vault on it to Snikkit, who can read. Then, says Grubnak, we rob a baron.",
      objective: "Take Fort Bullion and its toll village.",
      hints: Object.freeze([
        "Each Goblin beside a target makes the next hit harder.",
        "An Ogre beside a target counts as two Goblins.",
        "Keep Snikkit out of the brawl: he does the reading.",
      ]),
      closing:
        "Snikkit reads the map aloud: Port Kessler, the vault under the harbour, and a list. Gold, silver, the good cutlery, and 'one bell-tongue, dwarf-made'. Nobody knows what a bell-tongue is. Grubnak wants it anyway.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        GRUBNAK: "Grubnak the Loud",
        SNIKKIT: "Snikkit",
      }),
    }),
    Object.freeze({
      missionId: "GOBLIN_2",
      number: 2,
      name: "Boats for Bones",
      format: "CAPTURE",
      briefing:
        "The island is across the Lost Sea, and goblins have never owned a boat they did not set on fire. The only shipyard on this coast is Wreckers' Cove, and the Unquiet have taken it: drowned sailors who walked ashore when the bell rang. Take the cove and the boats are yours, powder and all. Mogga the Ogre will carry the barrels. Nobody else is to touch the powder.",
      objective: "Take Wreckers' Cove by turn 18.",
      hints: Object.freeze([
        "Bombs hurt your own: chuck them ahead of the mob.",
        "Kill the Necromancer and the dead stop getting up.",
        "Bitten goblins rise as Zombies: pull the hurt ones back.",
      ]),
      closing:
        "The boats leak, the powder is damp, and the crew is singing. Snikkit has drawn the course across the Lost Sea in crayon.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        MOGGA: "Mogga the Ogre",
        WRECKERS_COVE: "Wreckers' Cove",
      }),
    }),
    Object.freeze({
      missionId: "GOBLIN_3",
      number: 3,
      name: "Here Be Monsters",
      format: "KILL",
      briefing:
        "Halfway across, the Lost Sea gets more lost. The island's sea-beasts do not like boats, and the biggest of them, a grey old plesiosaur the natives call Snapjaw, has already eaten three fire rafts and a rowing boat. Sink Snapjaw and the way to Egg Rock lies open. Fire rafts are very good at sinking things, including themselves.",
      objective: "Sink Snapjaw by turn 16.",
      hints: Object.freeze([
        "Don't feed Snapjaw: its next kill heals it whole.",
        "A Diving Barrel torpedoes from below, unanswered.",
        "A Dugout rams hard: keep your barrels out of its reach.",
      ]),
      closing:
        "Snapjaw sinks with a burp. On Egg Rock, Snikkit stands on a barrel and looks across the bay at Port Kessler: walls, guns, and on the hill above the town a cannon pointed at the moon.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        SNAPJAW: "Snapjaw",
      }),
    }),
    Object.freeze({
      missionId: "GOBLIN_4",
      number: 4,
      name: "The Inside Job",
      format: "CAPTURE",
      briefing:
        "Port Kessler's vault sits under the harbour behind walls no goblin has ever climbed. But on the hill above the town stands the Baron's Moon Gun, a circus cannon built to fire a man at the moon, and Snikkit has done the sums. Take the Moon Gun, fire the crew over the walls, and have the vault before the garrison and the island's angry natives work out what is going on. Bring sacks.",
      objective: "Take Port Kessler by turn 20.",
      hints: Object.freeze([
        "The Moon Gun fires a unit to any empty tile within 5.",
        "With Explosives an Orc Brute's hit ignores Walls.",
        "An empty port trains a new guard: kill and step in.",
      ]),
      closing:
        "The vault is full: gold, silver, the good cutlery, and a long iron crate marked 'bell-tongue'. The Baron escapes into the jungle with his hat and his debts and nothing else. The crate hums.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        PORT_KESSLER: "Port Kessler",
        SNIKKIT: "Snikkit",
      }),
    }),
    Object.freeze({
      missionId: "GOBLIN_5",
      number: 5,
      name: "Everybody Wants the Tongue",
      format: "SURVIVE",
      briefing:
        "The crate hums. Snikkit says it is just iron; Mogga says it is singing. Either way, flying saucers have been circling Smuggler's Rock since you landed with it, the Baron's last loyal men want their master's money back, and the getaway rafts will not be ready for sixteen days. Dig in on the Rock and keep the loot.",
      objective: "Hold Smuggler's Rock for 16 turns.",
      hints: Object.freeze([
        "Never stand beside a Brain: it takes your Goblins.",
        "An Orc Brute on a Field Defense is a wall.",
        "The raft crews land to help you on turn 12.",
      ]),
      closing:
        "On the sixteenth night the rafts are ready, and the crew sails home with the gold, the crate, and three saucer pilots who surrendered to Mogga. On the quay at home a polite man in a grey coat is waiting.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        MOGGA: "Mogga the Ogre",
        SMUGGLERS_ROCK: "Smuggler's Rock",
      }),
    }),
    Object.freeze({
      missionId: "GOBLIN_6",
      number: 6,
      name: "The Big Getaway",
      format: "ESCORT",
      briefing:
        "The polite man in grey offers twice the crate's weight in gold. Snikkit has made inquiries: the crate holds the clapper of the dwarves' Deep Bell, and the polite man's friends wear hoods. Grubnak, for reasons he cannot explain, says no. Now the Grey Lodge and the Unquiet stand between you and Thane Ironbraid, waiting at her gate with beer. Get the loot-cart there in one piece.",
      objective: "Get the cart to Ironbraid Gate by turn 20.",
      hints: Object.freeze([
        "A Hexer turns your best unit into a frog: kill it first.",
        "A Scrap Buggy that kills may strike again: chain them.",
        "Keep the cart inside the mob, never out in front.",
      ]),
      closing:
        "Thane Ironbraid pays in gold, in beer, and in a title: Grubnak the Loud, Honorary Dwarf. She takes the clapper down into the Deep Gate. Snikkit, for no reason he can name, starts a notebook about the polite man in grey.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        GETAWAY: "the getaway cart",
        IRONBRAID_GATE: "the Ironbraid Gate",
      }),
    }),
  ]),
  outro:
    "The bell has its tongue back, the goblins have their score, and the Thane owes Grubnak a favour he intends to collect in beer for the rest of his life.",
});
