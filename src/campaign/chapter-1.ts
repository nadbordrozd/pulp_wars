import type { FactionIdV7 } from "../engine/v7/types";

/**
 * Campaign Chapter One, "The Hollow Frontier" (`pulp_wars-68k.4`,
 * docs/product/CAMPAIGN.md sections 4.3, 5, and 6): the teaser's mission
 * order, story, briefings, hints, closing lines, and unlock table. Data
 * only; the campaign UI and progress (`pulp_wars-68k.5`) read it. Each
 * mission's board, seats, and directives live in its engine definition
 * (`src/engine/v7/missions/frontier-*.ts`), which `missionId` names.
 *
 * Player-facing text follows the simplified interface overlay
 * (docs/ui/SCREEN_FLOW.md): short and plain, the pulp flavour confined to
 * the story, and never a tile coordinate.
 */
export interface CampaignMissionEntryV7 {
  /** A registered, non-hidden mission (`MISSION_REGISTRY_V7`). */
  readonly missionId: string;
  /** 1-based position in the chapter; mission N opens when N − 1 is won. */
  readonly number: number;
  readonly name: string;
  /** The briefing's story blurb. */
  readonly briefing: string;
  /** The briefing's Objective line. */
  readonly objective: string;
  /** At most three short hints. */
  readonly hints: readonly string[];
  /** The Victory dialog's closing line. */
  readonly closing: string;
  /** Factions this mission's first win unlocks. */
  readonly unlocks: readonly FactionIdV7[];
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

const DOMINATION_OBJECTIVE = "Capture every enemy city.";

export const CHAPTER_ONE_V7: CampaignChapterV7 = Object.freeze({
  id: "CHAPTER_1",
  number: 1,
  title: "Chapter One: The Hollow Frontier",
  intro:
    "Captain Vera Steele of the Frontier Rangers holds the last fort before the Hollow Hills. The goblins of Grubnak the Loud are coming down out of the hills, and they are not coming to trade.",
  startingFactions: Object.freeze(["ORIGINAL"] as const),
  missions: Object.freeze([
    Object.freeze({
      missionId: "FRONTIER_1",
      number: 1,
      name: "Goblins at the Gate",
      briefing:
        "Fort Hollow was meant to be a quiet posting. Then the drums started. Grubnak's goblins are pouring out of the eastern hills, and they are not here to trade. Hold the fort, Captain Steele, then show them the way home.",
      objective: DOMINATION_OBJECTIVE,
      hints: Object.freeze([
        "Keep a Guard on your city.",
        "Goblins hit hard and break easily.",
        "When the rush breaks, march east.",
      ]),
      closing:
        "The rush broke on your walls. Grubnak fled north-east, to something his goblins call the Warrens.",
      unlocks: Object.freeze([]),
    }),
    Object.freeze({
      missionId: "FRONTIER_2",
      number: 2,
      name: "The Warrens",
      briefing:
        "The rush broke, but Grubnak has three strongholds and a grudge. Your scouts count more goblins than bullets. The villages in the valley will answer to whoever gets there first. Be first.",
      objective: DOMINATION_OBJECTIVE,
      hints: Object.freeze([
        "Villages become cities: take them early.",
        "The outpost to the east is the weak point.",
        "The walled capital comes last.",
      ]),
      closing:
        "Grubnak, cornered in his own warrens, asks to talk. His goblins did not come for your fort, he says. Something drove them out of the hills. Something that does not breathe.",
      unlocks: Object.freeze(["GOBLIN"] as const),
    }),
    Object.freeze({
      missionId: "FRONTIER_3",
      number: 3,
      name: "Green Tide",
      briefing:
        "The dead took the warrens, and Grubnak wants them back. They are digging in behind the ridge. Scouts say they won't cross it until the new moon, sixteen days from now. Hit them before they're ready. And remember: a goblin's best weapon is his last one.",
      objective: DOMINATION_OBJECTIVE,
      hints: Object.freeze([
        "The Undead won't cross the ridge before turn 16.",
        "Goblins are cheap: spend them.",
        "Kaboom hurts everything around it, yours too.",
      ]),
      closing:
        "The warrens are green again. Among the ashes, Grubnak finds a seal: a skull in a crown. The Ashen Marquis. His tower stands on Bone Neck.",
      unlocks: Object.freeze([]),
    }),
    Object.freeze({
      missionId: "FRONTIER_4",
      number: 4,
      name: "Bone Neck",
      briefing:
        "The Ashen Marquis waits on the far shore of Bone Neck, a strip of land one road wide. No boat will cross those waters. Who leads the charge: Steele's Rangers or Grubnak's horde?",
      objective: DOMINATION_OBJECTIVE,
      hints: Object.freeze([
        "One way in: the isthmus.",
        "Catapults or Rocket Carts outrange the gate.",
        "A Lich punishes a crowd on the isthmus.",
      ]),
      closing:
        "The tower falls. From its ashes a dry voice offers terms: 'Every army needs soldiers who never tire, Captain.'",
      unlocks: Object.freeze(["UNDEAD"] as const),
    }),
  ]),
  outro: "To be continued…",
});
