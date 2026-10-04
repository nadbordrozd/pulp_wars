import {
  missionByIdV7,
  missionSeatFactionsV7,
  type FactionIdV7,
} from "../engine/index";
import type { CampaignCompletionV7 } from "../persistence/campaign-v7";
import {
  CHAPTER_ONE_V7,
  type CampaignChapterV7,
  type CampaignMissionEntryV7,
} from "./chapter-1";

/**
 * Derived campaign state (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md
 * sections 4.2 and 4.3). Progress stores only completed missions; which
 * missions are open and which factions are unlocked are computed here from
 * the completions and the chapter table on every read, so they can never
 * disagree with what was won.
 */
export const CAMPAIGN_CHAPTERS_V7: readonly CampaignChapterV7[] = Object.freeze(
  [CHAPTER_ONE_V7],
);

export type CampaignCompletedV7 = Readonly<
  Record<string, CampaignCompletionV7>
>;

export type CampaignMissionStatusV7 = "LOCKED" | "OPEN" | "DONE";

export interface CampaignMissionCardV7 {
  readonly entry: CampaignMissionEntryV7;
  readonly status: CampaignMissionStatusV7;
  /** The fewest rounds of a win, for a completed mission. */
  readonly bestRounds: number | null;
  /** The factions seat 0 may lead: its fixed faction or its choice list. */
  readonly leads: readonly FactionIdV7[];
  /** The AI seats' factions, in seat order. */
  readonly opponents: readonly FactionIdV7[];
  readonly size: number;
}

/** The chapter and entry of a chapter mission, or null (hidden fixtures). */
export function campaignMissionV7(missionId: string): {
  readonly chapter: CampaignChapterV7;
  readonly entry: CampaignMissionEntryV7;
} | null {
  for (const chapter of CAMPAIGN_CHAPTERS_V7) {
    const entry = chapter.missions.find(
      (candidate) => candidate.missionId === missionId,
    );
    if (entry !== undefined) return { chapter, entry };
  }
  return null;
}

/** Missions are linear: mission 1 is open, mission N once N − 1 is won. */
export function campaignMissionStatusV7(
  chapter: CampaignChapterV7,
  entry: CampaignMissionEntryV7,
  completed: CampaignCompletedV7,
): CampaignMissionStatusV7 {
  if (Object.hasOwn(completed, entry.missionId)) return "DONE";
  const index = chapter.missions.indexOf(entry);
  const previous = index > 0 ? chapter.missions[index - 1] : undefined;
  return previous === undefined || Object.hasOwn(completed, previous.missionId)
    ? "OPEN"
    : "LOCKED";
}

export function campaignMissionCardsV7(
  chapter: CampaignChapterV7,
  completed: CampaignCompletedV7,
): readonly CampaignMissionCardV7[] {
  return chapter.missions.map((entry) => {
    const mission = missionByIdV7(entry.missionId);
    if (mission === null)
      throw new Error(`Chapter mission ${entry.missionId} is not registered`);
    const [human, ...ai] = mission.seats;
    return {
      entry,
      status: campaignMissionStatusV7(chapter, entry, completed),
      bestRounds: Object.hasOwn(completed, entry.missionId)
        ? (completed[entry.missionId]?.bestRounds ?? null)
        : null,
      leads: human === undefined ? [] : missionSeatFactionsV7(human),
      opponents: ai.flatMap((seat) => missionSeatFactionsV7(seat)),
      size: mission.size,
    };
  });
}

/**
 * The factions unlocked for campaign choices: the chapters' starting
 * factions plus the unlocks of every completed mission, in chapter order.
 * Skirmish is never gated (section 4.3).
 */
export function campaignUnlockedFactionsV7(
  completed: CampaignCompletedV7,
): readonly FactionIdV7[] {
  const unlocked: FactionIdV7[] = [];
  const add = (faction: FactionIdV7): void => {
    if (!unlocked.includes(faction)) unlocked.push(faction);
  };
  for (const chapter of CAMPAIGN_CHAPTERS_V7) {
    chapter.startingFactions.forEach(add);
    for (const entry of chapter.missions)
      if (Object.hasOwn(completed, entry.missionId)) entry.unlocks.forEach(add);
  }
  return unlocked;
}

/**
 * The factions seat 0 may lead in a mission: its fixed faction, or its
 * choice list filtered to the unlocked factions (section 4.3).
 */
export function campaignFactionChoicesV7(
  missionId: string,
  completed: CampaignCompletedV7,
): readonly FactionIdV7[] {
  const human = missionByIdV7(missionId)?.seats[0];
  if (human === undefined) return [];
  if (typeof human.faction === "string") return [human.faction];
  const unlocked = campaignUnlockedFactionsV7(completed);
  return human.faction.choice.filter((faction) => unlocked.includes(faction));
}

/** The mission after this one in its chapter, or null after the last. */
export function campaignNextMissionV7(
  missionId: string,
): CampaignMissionEntryV7 | null {
  const found = campaignMissionV7(missionId);
  if (found === null) return null;
  const index = found.chapter.missions.indexOf(found.entry);
  return found.chapter.missions[index + 1] ?? null;
}

/** Factions in `after` that `before` did not have (an unlock notice). */
export function campaignNewlyUnlockedV7(
  before: CampaignCompletedV7,
  after: CampaignCompletedV7,
): readonly FactionIdV7[] {
  const prior = campaignUnlockedFactionsV7(before);
  return campaignUnlockedFactionsV7(after).filter(
    (faction) => !prior.includes(faction),
  );
}
