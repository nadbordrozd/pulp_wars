import type { FactionIdV7 } from "../engine/v7/types";

/**
 * The campaign, part one, "The Hollow Frontier" (`pulp_wars-v642.1`,
 * docs/product/CAMPAIGN.md section 9): the order of its ten missions, the
 * story, the briefings, hints, closing lines, the names of the things a
 * mission's objective talks about, and the unlock table. Data only; the
 * campaign screens and progress read it. Each mission's board, seats,
 * objective, and directives live in its engine definition
 * (`src/engine/v7/missions/frontier-*.ts`), which `missionId` names.
 *
 * All ten missions are built (`pulp_wars-v642.1` to `pulp_wars-v642.4`),
 * so no entry of this chapter has `planned`. The field stays for the next
 * part (`pulp_wars-v642.5` decided to keep it): a mission that is designed
 * and listed before it is registered carries in `planned` what its card
 * shows ("Coming soon"), as missions 5 to 10 did until they were built.
 * The places a mission names are on its engine definition
 * (`MissionCityV7.name`, CAMPAIGN.md section 10.6); the `names` here are
 * how a sentence calls a landmark or a tagged unit.
 *
 * Player-facing text follows the simplified interface overlay
 * (docs/ui/SCREEN_FLOW.md): short and plain, the pulp flavour confined to
 * the story, and never a tile coordinate.
 */
export type CampaignFormatV7 =
  "CONQUEST" | "ESCORT" | "SURVIVE" | "CAPTURE" | "KILL" | "ALLY";

/** One word for a mission's format, on its card and its briefing. */
export const CAMPAIGN_FORMAT_LABELS_V7: Readonly<
  Record<CampaignFormatV7, string>
> = Object.freeze({
  CONQUEST: "Conquest",
  ESCORT: "Escort",
  SURVIVE: "Hold out",
  CAPTURE: "Capture",
  KILL: "Hunt",
  ALLY: "Rescue",
});

export interface CampaignMissionEntryV7 {
  /** The mission's ID: registered once built (`MISSION_REGISTRY_V7`). */
  readonly missionId: string;
  /** 1-based position in the chapter; mission N opens when N − 1 is won. */
  readonly number: number;
  readonly name: string;
  readonly format: CampaignFormatV7;
  /** The briefing's story blurb. */
  readonly briefing: string;
  /** The Objective line of the briefing and of the tracker in a match. */
  readonly objective: string;
  /** At most three short hints. */
  readonly hints: readonly string[];
  /** The debrief: the Victory dialog's closing line. */
  readonly closing: string;
  /** Factions this mission's first win unlocks. */
  readonly unlocks: readonly FactionIdV7[];
  /**
   * What the mission's landmarks and tagged units are called, by tag (the
   * engine definition's `landmarks[].tag` and `units[].tag`).
   */
  readonly names?: Readonly<Record<string, string>>;
  /**
   * A mission that is designed but not built yet: who leads, against whom,
   * and on what size of board, for its card ("Coming soon"). Absent once it
   * is registered; no entry of Chapter One has it any more, the next part
   * will.
   */
  readonly planned?: {
    readonly leads: readonly FactionIdV7[];
    readonly opponents: readonly FactionIdV7[];
    readonly allies?: readonly FactionIdV7[];
    readonly size: number;
  };
}

export interface CampaignChapterV7 {
  readonly id: string;
  readonly number: number;
  readonly title: string;
  /** The chapter's opening story, shown above the mission list. */
  readonly intro: string;
  /** Factions unlocked before any mission is won. */
  readonly startingFactions: readonly FactionIdV7[];
  readonly missions: readonly CampaignMissionEntryV7[];
  /** Shown after the last mission's closing line. */
  readonly outro: string;
}

export const CHAPTER_ONE_V7: CampaignChapterV7 = Object.freeze({
  id: "CHAPTER_1",
  number: 1,
  title: "Part One: The Hollow Frontier",
  intro:
    "Captain Vera Steele of the Frontier Rangers holds the last fort before the Hollow Hills. Something is driving every creature in those hills downhill, and the first of them are already at her gate.",
  startingFactions: Object.freeze(["ORIGINAL"] as const),
  missions: Object.freeze([
    Object.freeze({
      missionId: "FRONTIER_1",
      number: 1,
      name: "Goblins at the Gate",
      format: "CONQUEST",
      briefing:
        "Fort Hollow was meant to be a quiet posting. Then the drums started. Grubnak's goblins are pouring out of the eastern hills, and they are not here to trade. Hold the fort, Captain Steele, then show them the way home.",
      objective: "Capture Drum Camp.",
      hints: Object.freeze([
        "Keep your Guards on the walls.",
        "Goblins hit hard together: don't stand alone in the open.",
        "Grow the fort: a level 5 city sends a giant.",
      ]),
      closing:
        "The rush broke on your walls. Grubnak fled north-east, to something his goblins call the Warrens.",
      unlocks: Object.freeze([]),
    }),
    Object.freeze({
      missionId: "FRONTIER_2",
      number: 2,
      name: "The Warrens",
      format: "CAPTURE",
      briefing:
        "Grubnak has three strongholds and a grudge: Muckgate on the road, Stinkwell in the hills, and the Warrens. The villages in the valley will answer to whoever gets there first. Be first, then dig him out. A goblin is a coward alone and a terror in a crowd, so never give him the crowd.",
      objective: "Capture the Warrens.",
      hints: Object.freeze([
        "Goblins mob whatever stands alone: keep together.",
        "Marksmen shoot first and take no blow in return.",
        "Muckgate, the outpost on the road, falls first.",
      ]),
      closing:
        "Grubnak, cornered in his own Warrens, asks to talk. His goblins did not come for your fort, he says. Something drove them out of the hills. Something that does not breathe.",
      unlocks: Object.freeze(["GOBLIN"] as const),
      names: Object.freeze({ WARRENS: "the Warrens" }),
    }),
    Object.freeze({
      missionId: "FRONTIER_3",
      number: 3,
      name: "Green Tide",
      format: "CAPTURE",
      briefing:
        "The dead hold the high plain where the goblins grazed their wolves, and Grubnak wants it back. All he has left is one camp in the hills, and the dead know where it is. Dig deep, grow a Troll and break their raids on your own hills; at the new moon they crawl back to the plain. And remember: a goblin's best weapon is his last one, and a Troll can throw it a long way.",
      objective: "Capture the Barrow by turn 26.",
      hints: Object.freeze([
        "The hills are full of ore: Mines grow the camp.",
        "The dead raid from turn 5. Fight them on your hills.",
        "A Troll can throw a Goblin. Then: Kaboom.",
      ]),
      closing:
        "The plain is green again. In the Barrow's ashes Grubnak finds a seal: a skull in a crown. The Ashen Marquis. His tower stands beyond Bone Neck.",
      unlocks: Object.freeze([]),
      names: Object.freeze({ BARROW: "the Barrow" }),
    }),
    Object.freeze({
      missionId: "FRONTIER_4",
      number: 4,
      name: "Bone Neck",
      format: "CAPTURE",
      briefing:
        "The Ashen Marquis waits beyond Bone Neck, a strip of land one cart wide. Two Zombies hold the far end, bone-men thick as a hedge behind them, and his dead are already rising in your own fields. Crack the front rank with stones, send riders through the gap, and leave a guard at home. Who leads the charge: Steele's Rangers or Grubnak's horde?",
      objective: "Capture the Bone Gate by turn 14.",
      hints: Object.freeze([
        "One way in: the Neck. Walk it alone and you rise dead.",
        "The dead rise in your fields too: keep a guard home.",
        "A rider who kills keeps charging: let him run.",
      ]),
      closing:
        "The gate falls, and a dry voice offers terms. 'I did not choose to wake, Captain. Someone is ringing a bell under the mountains. Find the bell-ringer, and my soldiers are yours. They never tire.'",
      unlocks: Object.freeze(["UNDEAD"] as const),
      names: Object.freeze({
        GATE: "the Bone Gate",
        TOWER: "the Ashen Tower",
      }),
    }),
    Object.freeze({
      missionId: "FRONTIER_5",
      number: 5,
      name: "Dead Men's Road",
      format: "ESCORT",
      briefing:
        "Only the Marquis's archivist, Doctor Mortimer Crane, can read the bell's score, and only the Dwarves of Ironbraid Hold know the mountain. Walk him to their gate before the snows close it, twenty-four days from now. Baron Kessler's toll-men hold the pass, and something white is already hunting your towns.",
      objective: "Get Doctor Crane to the gate by turn 24.",
      hints: Object.freeze([
        "White raiders hit Gallows Cross from turn 3.",
        "A Lich outranges Kessler's Toll. Pestilence rots it.",
        "Keep the Doctor behind the dead. He can raise more.",
      ]),
      closing:
        "Thane Brunhild Ironbraid reads the score twice and bars her doors. 'That bell is ours, Captain. It hangs in the Deep Gate. And nobody is ringing it.'",
      unlocks: Object.freeze(["DWARF"] as const),
      names: Object.freeze({
        ARCHIVIST: "Doctor Crane",
        IRONBRAID_GATE: "the Ironbraid Gate",
      }),
    }),
    Object.freeze({
      missionId: "FRONTIER_6",
      number: 6,
      name: "The Deep Gate",
      format: "SURVIVE",
      briefing:
        "The bell calls everything on the mountain to the Deep Gate: the Ice Folk down from the peaks, the Baron's hired guns up from the valley. Thane Ironbraid needs fourteen days to cut the bell loose. Give them to her.",
      objective: "Hold the Deep Gate for 14 turns.",
      hints: Object.freeze([
        "Ice Folk: turn 3, then 7 and 11. Baron: 6, then 9 and 12.",
        "Blasting Charges bring the peaks down on the Yetis.",
        "Gunners that stand still fire twice. Keep the Thane back.",
      ]),
      closing:
        "The bell falls silent, and the Ice Folk stop where they stand. Mother Rime lowers her spear. 'It was not your bell we came for. It was calling a star down. It fell in the sea, where the old beasts live.'",
      unlocks: Object.freeze(["ICE_FOLK"] as const),
      names: Object.freeze({
        DEEP_GATE: "the Deep Gate",
        THANE: "the Thane",
      }),
    }),
    Object.freeze({
      missionId: "FRONTIER_7",
      number: 7,
      name: "The Island That Time Forgot",
      format: "CAPTURE",
      briefing:
        "A star fell on an island no chart admits to, and the Baron's ships are already under sail. The Ice Folk have one cold town and no ships, but they walk on the sea they freeze. Grow, cross, and take the crater before the Baron does. Mind the natives. They have teeth.",
      objective: "Capture the Crater by turn 30.",
      hints: Object.freeze([
        "Rime freezes the shallows; Pack Ice the deep water.",
        "Whoever steps on your ice freezes. Giants shatter them.",
        "Level 5 cities send Frost Giants. The Baron lands turn 14.",
      ]),
      closing:
        "In the crater lies a ship of glass and brass, and around it the great beasts keep watch like dogs at a door. They let you pass. Whatever is inside, they hate it more than they hate you.",
      unlocks: Object.freeze(["DINOSAUR"] as const),
      names: Object.freeze({ CRATER: "the Crater" }),
    }),
    Object.freeze({
      missionId: "FRONTIER_8",
      number: 8,
      name: "Brain Wave",
      format: "KILL",
      briefing:
        "The thing in the glass ship is awake. It calls itself the Overmind, its saucers hold the crater, and the Baron's men march in step for it. All the island has left is one nest and a young queen. Hatch an army first, then hunt it down before it finishes its signal, and keep your wounded away from that brain.",
      objective: "Kill the Overmind by turn 26.",
      hints: Object.freeze([
        "One nest won't do it: take the villages, then grow.",
        "The crater has one gate. Climbers have more.",
        "Feed the Queen small prey: an Alpha bites through walls.",
      ]),
      closing:
        "The Overmind bursts like a wet lantern, and every Martian on the island blinks. Their captain salutes with three hands. 'We were not invading. We were answering. Someone here has been calling the stars.'",
      unlocks: Object.freeze(["MARTIAN"] as const),
      names: Object.freeze({
        OVERMIND: "the Overmind",
        OLD_QUEEN: "the Old Queen",
      }),
    }),
    Object.freeze({
      missionId: "FRONTIER_9",
      number: 9,
      name: "Sugar and Spite",
      format: "ALLY",
      briefing:
        "The call tore a hole in the world, and a kingdom fell out of it: Sugarcrest, soft, sweet and besieged. The Rift is closing. If Sugarcrest falls before it shuts, whatever is on the other side comes through instead. Only wings cross a Rift, and the Martians have saucers.",
      objective: "Hold Sugarcrest for 16 turns.",
      hints: Object.freeze([
        "Sugarcrest's land is closed to you: fight in front of it.",
        "Only flyers cross the Rift. Saucers carry the rest over.",
        "Siege engines outrange walls: hunt them with Saucers.",
      ]),
      closing:
        "The Rift seals with a sound like a kiss. Queen Praline curtsies, armed to the teeth. 'They wear grey hoods,' she says, 'and they sing to the hole. They call it a door.'",
      unlocks: Object.freeze(["CANDY"] as const),
      names: Object.freeze({
        SUGARCREST: "Sugarcrest",
        PRALINE: "Queen Praline",
        RIFTWATCH: "Riftwatch",
      }),
    }),
    Object.freeze({
      missionId: "FRONTIER_10",
      number: 10,
      name: "The Stars Are Right",
      format: "CAPTURE",
      briefing:
        "The Lodge of the Unblinking Eye stands on the summit where the bell was cast, and tonight the stars are right. Every toll, every soldier its daemons take and every cultist offered up feeds the Great Summoning. At the twenty-fourth toll the door opens. Steele has her army, Grubnak his horde, and the dead still rise at Hollow Barrow. Take the Lodge first.",
      objective: "Capture the Lodge by turn 24.",
      hints: Object.freeze([
        "The Lodge's Favour is the countdown: at 18, the Herald.",
        "An idol blunts your shots: break its Bearer, then charge.",
        "A marked star falls at dawn: scatter, or slay the gazer.",
      ]),
      closing:
        "The Lodge falls one toll short, and the hooded ones kneel to the winning side, as they always have. But far below, in the shaft where the bell hung, something that was called has opened one eye.",
      unlocks: Object.freeze(["CULT"] as const),
      names: Object.freeze({ LODGE: "the Lodge" }),
    }),
  ]),
  outro:
    "End of Part One. To be continued in Part Two: The Thing in the Shaft.",
});
