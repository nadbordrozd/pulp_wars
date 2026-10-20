import type { CampaignChapterV7 } from "./chapter";

/**
 * The Ice Folk campaign, "The Long Winter" (`pulp_wars-hmyk.10`,
 * docs/product/SAGA.md sections 2.7 and 3.7): six missions of Mother Rime
 * bringing the cold to the Hollow Mountain, from the goblins' stove under
 * Rime Camp's glacier to the night she carries the Heart of Winter onto
 * the summit. Data only, in the shape of a chapter
 * (`./chapter.ts`); each mission's board, seats, objective and directives
 * live in its engine definition (`src/engine/v7/missions/ice-folk-*.ts`).
 *
 * The briefings are the saga bible's, trimmed to the card; the hints state
 * the rules plainly and never name a tile coordinate.
 */
export const CHAPTER_ICE_FOLK_V7: CampaignChapterV7 = Object.freeze({
  id: "ICE_FOLK",
  number: 8,
  title: "The Long Winter",
  intro:
    "Mother Rime brought her people down from the peaks once already, called by a bell. This autumn the glaciers are weeping into the valleys and the mountain where the bell fell is warm to the touch. The Pact has learned that the thing below sleeps in the cold. So Rime will bring the cold.",
  // Every mission seats you as the Ice Folk (a fixed faction, no choice).
  missions: Object.freeze([
    Object.freeze({
      missionId: "ICE_FOLK_1",
      number: 1,
      name: "The Warm Mountain",
      format: "CONQUEST",
      briefing:
        "Rime Camp's glacier is melting from underneath, and in the warm caves below it a goblin gang calling itself the Frostbite Boys has moved in with a stove. The Ice Folk do not object to goblins. They object to stoves. They are ten; you have a Fighter and a Guard. Put the stove out, and the goblins with it. Chief Gnash of Whitefang, out of work, is watching from the ridge to see how it is done.",
      objective: "Take both goblin camps by turn 15.",
      hints: Object.freeze([
        "Frozen enemies can't act: freeze first, then strike.",
        "A badly hurt Frozen enemy shatters when hit up close.",
        "You start small: train before the gang marches.",
      ]),
      closing:
        "The stove is out. Chief Gnash comes down from the ridge, bows to Mother Rime, and asks to come home. The Whitefang are Ice Folk again.",
      names: Object.freeze({
        RIME: "Mother Rime",
        STOVEPIPE: "the Stovepipe",
        BOILER_HOLE: "Boiler Hole",
      }),
    }),
    Object.freeze({
      missionId: "ICE_FOLK_2",
      number: 2,
      name: "Waking the Giants",
      format: "KILL",
      briefing:
        "Long ago, say the Ice Folk, the giants of the frost walked out of the cold to put a hungry star to bed. They sleep now in the Glacier Tomb, and the Frozen Abbot, a monk who has prayed to the wrong thing for three hundred years, has raised his dead to keep them asleep. Destroy the Abbot, who has eleven dead and more coming. The first giant wakes on the tenth day whether he is gone or not.",
      objective: "Destroy the Frozen Abbot by turn 16.",
      hints: Object.freeze([
        "A Frost Giant joins you on turn 10: freeze, then smash.",
        "The Abbot's dead come in waves: hold the camp first.",
      ]),
      closing:
        "The Abbot shatters, and the giant walks out of the glacier yawning. He remembers the hungry star. It sleeps, he says, under the Hollow Mountain, and it is warm.",
      names: Object.freeze({
        RIME: "Mother Rime",
        ABBOT: "the Frozen Abbot",
        GLACIER_TOMB: "the Glacier Tomb",
      }),
    }),
    Object.freeze({
      missionId: "ICE_FOLK_3",
      number: 3,
      name: "The Frozen Strait",
      format: "CAPTURE",
      briefing:
        "The shortest road from the peaks to the Hollow Mountain crosses the Grey Strait, and the dwarves of Anvil Bay patrol it with ironclads. They saw the first floes coming and decided it was an invasion. It is, a little. The harbour is walled and its soldiers are marching. Freeze a road across the strait and take Anvil Bay. The Ice Folk need no ships: they walk on the sea they freeze.",
      objective: "Take Anvil Bay by turn 18.",
      hints: Object.freeze([
        "Ice with a unit on it can't be broken: hold your road.",
        "Icebound locks a ship beside your ice in place.",
        "Soldiers in boats can't strike back.",
      ]),
      closing:
        "Anvil Bay surrenders with a dwarvish oath and a pot of tea. Thane Ironbraid sends word: the Ice Folk may pass, and may she please have her harbour back after the Long Night.",
      names: Object.freeze({
        RIME: "Mother Rime",
        ANVIL_BAY: "Anvil Bay",
      }),
    }),
    Object.freeze({
      missionId: "ICE_FOLK_4",
      number: 4,
      name: "A Year Without Summer",
      format: "SURVIVE",
      briefing:
        "Winter is coming down off the mountains three months early, and the lowlands are not grateful. The Crown's Harvest Wardens are riding out to burn the snow-shrines, and Sugarcrest, whose people crack in a frost, has marched to stop the snowline at the river. Rime does not want to fight them. She has no choice, and they come from both sides, in waves. Hold the Snow Line until the winter has settled.",
      objective: "Hold Whitewater and Frostford for 13 turns.",
      hints: Object.freeze([
        "A Crashed sweet cannot attack on its next turn.",
        "Musk Oxen freeze whoever strikes them up close.",
        "Knights Overrun anyone left alone in the open.",
      ]),
      closing:
        "The snow settles. Under a white flag Queen Praline and Mother Rime meet on the frozen river and sign the Frost Treaty: no frost on Sugarcrest, and Sugarcrest's soldiers beside the Ice Folk until the Long Night is over.",
      names: Object.freeze({
        RIME: "Mother Rime",
        WHITEWATER: "Whitewater",
        FROSTFORD: "Frostford",
      }),
    }),
    Object.freeze({
      missionId: "ICE_FOLK_5",
      number: 5,
      name: "The Ember Lodge",
      format: "CAPTURE",
      briefing:
        "The Grey Lodge knows what cold does to the thing it worships, and it has found the answer every cult finds sooner or later: a bonfire. At the Ember Lodge on the mountain's shoulder burns a fire that has not gone out in three hundred years, and the Redcaps feed it with every tree for miles. While it burns, the mountain stays warm. Take the Lodge, where ten keepers wait, and put the fire out.",
      objective: "Take the Ember Lodge by turn 18.",
      hints: Object.freeze([
        "A giant's blow shatters a badly hurt Frozen enemy.",
        "A city of level 5 wakes a Frost Giant.",
        "An awestruck unit or a frog can't take a city.",
      ]),
      closing:
        "The fire goes out with a hiss they hear in Kingsport. The mountain cools. Now the winter needs a heart, set on the summit, and Rime must carry it there herself.",
      names: Object.freeze({
        RIME: "Mother Rime",
        EMBER_LODGE: "the Ember Lodge",
      }),
    }),
    Object.freeze({
      missionId: "ICE_FOLK_6",
      number: 6,
      name: "The Winter Crown",
      format: "ESCORT",
      briefing:
        "The Heart of Winter is a stone of ice older than the mountain, and it must be set on the summit before the Long Night. Mother Rime will carry it. The Grey Lodge and the dead will try to stop her, because they understand exactly what it is for. Thane Ironbraid's dwarves hold the Deep Gate on the road and will fight beside you. Bring Rime to the summit.",
      objective: "Bring Rime to the Summit by turn 16.",
      hints: Object.freeze([
        "Musk Oxen freeze whoever strikes them up close.",
        "A Sled's bolas holds a daemon still for a turn.",
        "Research Explosives to blast a peak flat.",
      ]),
      closing:
        "On the summit Rime sets the Heart of Winter in the snow and lays her hands on it, and does not take them away. By morning she is ice to the elbows, by evening to the crown. 'Someone has to stay with it,' she said, before she couldn't.",
      names: Object.freeze({
        RIME: "Mother Rime",
        SUMMIT: "the Summit",
      }),
    }),
  ]),
  outro:
    "The Winter Crown stands on the Hollow Mountain, and Mother Rime stands inside it. The mountain is cold at last, and the thing below it sleeps, as long as the Crown is whole.",
});
