import type { CampaignChapterV7 } from "./chapter-1";

/**
 * The Undead campaign, "The Long Sleep" (`pulp_wars-hmyk.5`,
 * docs/product/SAGA.md sections 2.2 and 3.2): six missions of the Ashen
 * Marquis's search for the Lullaby, from the robbed barrows to his own
 * tomb under the summit. Data only, in the shape of the prologue's chapter
 * (`./chapter-1.ts`); each mission's board, seats, objective and
 * directives live in its engine definition
 * (`src/engine/v7/missions/undead-*.ts`).
 *
 * The briefings are the saga bible's, trimmed to the card; the hints state
 * the rules plainly and never name a tile coordinate.
 */
export const CHAPTER_UNDEAD_V7: CampaignChapterV7 = Object.freeze({
  id: "UNDEAD",
  number: 2,
  title: "The Long Sleep",
  intro:
    "The Ashen Marquis kept his word: his dead marched for the living until the bell fell silent. Now he would like to lie down. But the dead of the whole north are walking again, his and not his, and something under the mountain will not let them rest.",
  // Every mission seats you as the Undead (a fixed faction, no choice), so
  // the chapter unlocks nothing for the prologue's faction choices: the
  // Undead are still won there, in its fourth mission.
  startingFactions: Object.freeze([]),
  missions: Object.freeze([
    Object.freeze({
      missionId: "UNDEAD_1",
      number: 1,
      name: "Resurrection Men",
      format: "CONQUEST",
      briefing:
        "The Ashen Marquis has decided to go back to sleep, and finds his bed has been robbed. Kessler's Resurrection Company is digging up the Barrowlands by lantern light and selling the bones by the barrel. Doctor Crane, his archivist, has the foreman's name: Grimsditch. Run them off the Marquis's land. Politely, if possible. It will not be possible.",
      objective: "Take both of the Company's camps.",
      hints: Object.freeze([
        "A Necromancer raises a Skeleton from every free Grave.",
        "A Vampire's kill heals it and lets it strike again.",
        "After its strike the Vampire may fly two steps away.",
      ]),
      closing:
        "In Grimsditch's cart is an order for the Marquis's own bones, to be delivered to a buyer in a grey hood. The Marquis is flattered. Doctor Crane is not.",
      unlocks: Object.freeze([]),
      names: Object.freeze({ MARQUIS: "the Ashen Marquis" }),
    }),
    Object.freeze({
      missionId: "UNDEAD_2",
      number: 2,
      name: "The Drowned Library",
      format: "SURVIVE",
      briefing:
        "Doctor Crane believes the bell's score has a counter-score, and that the Marquis wrote of it in a diary before he was ashen. It was shelved in the Abbey of Saint Ashes, under a lake since a dam broke, and the Bonepicker goblins use its bell tower as a lair. Hold the abbey isle for twelve days while Crane reads with a lantern and a pair of tongs.",
      objective: "Keep Saint Ashes and Crane for 12 turns.",
      hints: Object.freeze([
        "After a Wail, the Goblins cannot hit back.",
        "What a Zombie kills rises as one of yours.",
        "The dead heal only inside their own borders.",
      ]),
      closing:
        "Crane finds the diary, water-stained, in the Marquis's own hand. It describes a bell, a summit, a thing that hums in the rock, and a song he wrote to make it sleep: the Lullaby. He does not remember writing any of it.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        SAINT_ASHES: "Saint Ashes",
        CRANE: "Doctor Crane",
        MARQUIS: "the Ashen Marquis",
      }),
    }),
    Object.freeze({
      missionId: "UNDEAD_3",
      number: 3,
      name: "The Ship of the Dead",
      format: "CAPTURE",
      briefing:
        "Half the Lullaby went to sea in the Marquis's flagship, the Last Rites, and down with her in Gravesend Bay. The Martians are dredging the bay for star-iron with machines that hover, and have built a fort on Chapel Rock, right over the wreck. Take the Rock and raise the Last Rites. Every Martian ship you sink comes back up with a crew of yours.",
      objective: "Take Chapel Rock by turn 22.",
      hints: Object.freeze([
        "Shields refill each turn: sink one ship at a time.",
        "Sunken Galleys strike from below, unanswered.",
        "Grow Gravesend: at level 5 it sends a giant.",
      ]),
      closing:
        "The Last Rites comes up with her captain at the wheel and half a score in a lead box. The other half, says the captain, the Marquis took to his grave. The Marquis has never seen his grave. He was told it was under the summit.",
      unlocks: Object.freeze([]),
      names: Object.freeze({ CHAPEL_ROCK: "Chapel Rock" }),
    }),
    Object.freeze({
      missionId: "UNDEAD_4",
      number: 4,
      name: "The Hall of the Thanes",
      format: "ESCORT",
      briefing:
        "The shortest road to the summit runs under the mountain, through the Hall of the Thanes, where the Ironbraid dwarves bury their dead and do not care to see them walk. Walk Doctor Crane through to the summit stair, past every hammer in the clan. The Marquis has instructed his troops to apologise as they go.",
      objective: "Walk Crane to the Summit Stair by turn 22.",
      hints: Object.freeze([
        "Dwarves dig in by their cities: go around them.",
        "Engineering lets the dead climb the peaks.",
        "Kill the Gyrocopters before they find Crane.",
      ]),
      closing:
        "Crane reaches the stair with his hat still on. Behind him the Thane writes to Marshal Steele about the dead, in capitals.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        CRANE: "Doctor Crane",
        SUMMIT_STAIR: "the Summit Stair",
      }),
    }),
    Object.freeze({
      missionId: "UNDEAD_5",
      number: 5,
      name: "Bedtime Reading",
      format: "KILL",
      briefing:
        "The Grey Lodge has worked out who the Marquis was before he was ashen. Brother Mallory, its Hierophant, a corn merchant in a very good robe, has stolen the Marquis's diary and reads it aloud to his Summoners to learn which pages to burn. Stop his reading for good, before he gets to the end. The Marquis would like his diary back.",
      objective: "Kill Brother Mallory by turn 20.",
      hints: Object.freeze([
        "Beside a raised idol you may hit only the Bearer.",
        "A Wail hurts only the living: daemons shrug it off.",
        "Kill a daemon's channellers and it turns on them.",
      ]),
      closing:
        "Mallory falls mid-sentence and the diary comes home. In the Lodge's account books every entry, for years back, is in one small, tidy hand.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        MALLORY: "Brother Mallory",
        MARQUIS: "the Ashen Marquis",
      }),
    }),
    Object.freeze({
      missionId: "UNDEAD_6",
      number: 6,
      name: "The Founder's Tomb",
      format: "ALLY",
      briefing:
        "The rest of the Lullaby lies in the Marquis's grave, under the Lodge on the summit, where Steele's Rangers keep watch. The Grey Lodge wants its old temple back and has hired the Whitefang clan to help it up the slopes. Hold the summit for sixteen days while the Marquis goes down into his own tomb. He says he is not nervous. He has said so four times.",
      objective: "Keep the Rangers' Lodge for 16 turns.",
      hints: Object.freeze([
        "You cannot enter the Rangers' land: fight in front.",
        "Liches outrange both the daemons and the frost.",
        "Sleds' bolas freeze: keep the Vampire back.",
      ]),
      closing:
        "In the tomb lie the rest of the Lullaby and a page from the Grey Book in the Marquis's hand: 'It eats the door first.' He remembers now. He founded the Lodge and rang the bell. He gives Crane the page and goes to tell Steele what he is.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        THE_LODGE: "the Rangers' Lodge",
        MARQUIS: "the Ashen Marquis",
        CRANE: "Doctor Crane",
      }),
    }),
  ]),
  outro:
    "The Lullaby is whole. On the Long Night it must be rung on the bell at the bottom of the Bottomless, the only voice the thing below will hear. After that, the Marquis says, he would very much like to rest.",
});
