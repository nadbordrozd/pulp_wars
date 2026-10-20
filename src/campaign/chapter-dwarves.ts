import type { CampaignChapterV7 } from "./chapter-1";

/**
 * The Dwarf campaign, "The Bottomless" (`pulp_wars-hmyk.9`,
 * docs/product/SAGA.md sections 2.4 and 3.4): six missions of Thane
 * Brunhild Ironbraid's work to put a lid on the Bottomless, from the dead
 * miners of Copperstep to the night the Great Seal goes down over the Deep
 * Gate. Data only, in the shape of the prologue's chapter
 * (`./chapter-1.ts`); each mission's board, seats, objective and directives
 * live in its engine definition (`src/engine/v7/missions/dwarf-*.ts`).
 *
 * The briefings are the saga bible's, trimmed to the card; the hints state
 * the rules plainly and never name a tile coordinate.
 */
export const CHAPTER_DWARVES_V7: CampaignChapterV7 = Object.freeze({
  id: "DWARVES",
  number: 6,
  title: "The Bottomless",
  intro:
    "Thane Brunhild Ironbraid cut the Deep Bell loose last autumn, and it fell down the Bottomless with a sound like a door slamming. Since then the mountain shakes every night, the dead climb out of the old workings, and every dwarf in the Hold can hear something breathing below.",
  // Every mission seats you as the Dwarves (a fixed faction, no choice),
  // so the chapter unlocks nothing for the prologue's faction choices.
  startingFactions: Object.freeze([]),
  missions: Object.freeze([
    Object.freeze({
      missionId: "DWARF_1",
      number: 1,
      name: "Tremors",
      format: "SURVIVE",
      briefing:
        "The night shift at Copperstep came up early, and dead. Miners lost in a cave-in three hundred years ago are walking out of the cracks the tremors opened, still carrying their picks. The Thane needs twelve days to shore up the lower galleries. Hold Copperstep until the props are in, and remember: a dwarf never leaves a dwarf behind, even one who ought to stay put.",
      objective: "Hold Copperstep for 12 turns.",
      hints: Object.freeze([
        "A Clockwork Gunner that doesn't move shoots twice.",
        "The dead come up in four waves, from turn 3.",
        "Dwarves who stand still by their own city dig in.",
      ]),
      closing:
        "The props hold. The dead lie down again, and the oldest of them, before he does, says one word: 'Deeper.'",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        COPPERSTEP: "Copperstep",
        TOBBIN: "Tobbin",
      }),
    }),
    Object.freeze({
      missionId: "DWARF_2",
      number: 2,
      name: "The Iron Peak",
      format: "CAPTURE",
      briefing:
        "The Thane means to put a lid on the Bottomless: a seal of iron a hundred feet across. The best iron in the north is in the Iron Peak, and the Iron Peak belongs to the Whitefang clan, who have been in a temper since Marshal Steele beat them at Fort Hollow. Take the Peak's three mine-camps. Their Yetis walk over mountains; your Steam Moles go under them.",
      objective: "Take the clan's three camps by turn 16.",
      hints: Object.freeze([
        "A Steam Mole digs up to 3 tiles under anything.",
        "The clan marches on Copperstep from turn 3.",
        "Hit a Musk Ox up close and you freeze: shoot it.",
      ]),
      closing:
        "The Peak is yours and the forges are lit. Chief Gnash of Whitefang, beaten this year by the living, the dead and now the dwarves, goes off to sulk at Mother Rime's door. Now the Thane must find out how big the lid has to be.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        TUSK_CAMP: "Tusk Camp",
        GNASHS_CAMP: "Gnash's Camp",
        IRON_DEN: "the Iron Den",
      }),
    }),
    Object.freeze({
      missionId: "DWARF_3",
      number: 3,
      name: "Down the Bottomless",
      format: "ESCORT",
      briefing:
        "Nobody has been to the bottom of the Bottomless. The Thane is going anyway, down the old galleries with lanterns, a chain, and her best engineers. Somewhere below is the Deep Bell, and somewhere below that is whatever it woke. The galleries are full of the dead, and someone has been down here lately: there are candle stubs, and hooded footprints, all going down. Get the Thane to the bell.",
      objective: "Get the Thane to the Bell's Rest by turn 16.",
      hints: Object.freeze([
        "A Steam Mole tunnels a Hammerer past a blocked gallery.",
        "Nobody climbs the peaks here: the gallery is the way.",
        "The Lodge's diggers come up the gallery from turn 4.",
      ]),
      closing:
        "The bell lies on its side at the bottom of the world, without its tongue, resting on something smooth and grey and very large. As the lanterns come close, the something moves. It is an eyelid. The Thane climbs back up in silence and orders the lid made twice as thick.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        THANE: "the Thane",
        TOBBIN: "Tobbin",
        BELLS_REST: "the Bell's Rest",
      }),
    }),
    Object.freeze({
      missionId: "DWARF_4",
      number: 4,
      name: "Saucers over the Hold",
      format: "KILL",
      briefing:
        "Martians have found the Deep Gate. A mothership hangs over Ironbraid Hold, beaming soldiers down onto the forge roofs and asking, very politely, for the bell. They want to ring it, they say, to call home. The Thane has explained that the bell is at the bottom of a hole, on a monster's face, and that they may not. They did not listen. Bring the mothership down.",
      objective: "Bring down the Mothership by turn 14.",
      hints: Object.freeze([
        "A Gyrocopter bombs over walls, and nothing hits back.",
        "Bomb first to break the Shield, then strike.",
        "Grunts beam down by the Hold on turns 3 and 8.",
      ]),
      closing:
        "The mothership comes down in the forge yard with a polite apology. The Thane sends the Martians home, by which she means to their colony at Red Dust, on foot. The forges go back to work on the Seal.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        MOTHERSHIP: "the Mothership",
      }),
    }),
    Object.freeze({
      missionId: "DWARF_5",
      number: 5,
      name: "Iron on the Water",
      format: "ESCORT",
      briefing:
        "The last of the Seal's iron, the great bolts, is cast at Anvil Bay on the coast and must come up the river by ironclad. The river runs past Greyhood, and the Grey Lodge has boats: black gondolas, a galleon with an eye painted on the sail, and something in the water with too many arms. The Redcaps, out of work since the Baron's war, have hired on as wreckers. Bring the bolt-ship to the landing.",
      objective: "Bring the Anvil to the Landing by turn 18.",
      hints: Object.freeze([
        "Dwarf hulls take 1 less a hit: screen the Anvil.",
        "The Redcaps hunt from turn 3; the Lodge sails in waves.",
        "Fill the water round the Anvil and nothing can ram it.",
      ]),
      closing:
        "The bolts come ashore. In the reeds a hooded man writes the ship's name in a small notebook.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        ANVIL: "the Anvil",
        RIVER_LANDING: "the River Landing",
      }),
    }),
    Object.freeze({
      missionId: "DWARF_6",
      number: 6,
      name: "The Great Seal",
      format: "CAPTURE",
      briefing:
        "The Seal is ready, and the Bottomless knows it. On the night the dwarves begin to lower the lid, the dead pour up out of the shaft, the Grey Lodge comes up the mountain behind them, and by morning they hold the Deep Gate itself. Take it back so the lid can go down. Marshal Steele has kept the Pact's first promise: her Rangers are on the road.",
      objective: "Take the Deep Gate by turn 16.",
      hints: Object.freeze([
        "Steam Tanks shrug off hits: send them in first.",
        "Blasting Charges bring a mountain down on its neighbours.",
        "The dead climb out every third turn from turn 3.",
      ]),
      closing:
        "The Seal comes down over the Bottomless with a boom that rattles teeth in Kingsport. 'It will hold,' says the Thane, 'until the stars pull on it.' Under the iron the bell lies silent, and beside the chain waits its tongue, bought from a goblin at a scandalous price.",
      unlocks: Object.freeze([]),
      names: Object.freeze({
        THANE: "the Thane",
        DEEP_GATE: "the Deep Gate",
      }),
    }),
  ]),
  outro:
    "The Seal is down and the bell lies under it, with a tongue waiting beside the chain. 'It will hold,' says the Thane, 'until the stars pull on it. On the Long Night, nothing holds. On the Long Night, we ring.'",
});
