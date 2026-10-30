import {
  missionByIdV7,
  missionSeatFactionsV7,
  type FactionIdV7,
} from "../engine/index";
import type { CampaignCompletionV7 } from "../persistence/campaign-v7";
import {
  CAMPAIGNS_V7,
  type CampaignDefinitionV7,
  type CampaignIdV7,
} from "./campaigns";
import type { CampaignChapterV7, CampaignMissionEntryV7 } from "./chapter";

/**
 * Derived campaign state (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md
 * section 4.2; the campaign graph of `pulp_wars-hmyk.3`, section 14).
 * Progress stores only completed missions; which missions and campaigns are
 * open is computed here from the completions and the campaign registry on
 * every read, so it can never disagree with what was won. Every faction is
 * open from the start, in skirmish and in the campaigns: the faction
 * unlocks were the retired prologue's reward (`pulp_wars-hmyk.22`, section
 * 24).
 */
export const CAMPAIGN_CHAPTERS_V7: readonly CampaignChapterV7[] = Object.freeze(
  CAMPAIGNS_V7.flatMap((campaign) =>
    campaign.chapter === null ? [] : [campaign.chapter],
  ),
);

export type CampaignCompletedV7 = Readonly<
  Record<string, CampaignCompletionV7>
>;

/** The campaign with this ID, or null. */
export function campaignByIdV7(id: string): CampaignDefinitionV7 | null {
  return CAMPAIGNS_V7.find((campaign) => campaign.id === id) ?? null;
}

/**
 * True once at least one of the campaign's missions is registered: a
 * campaign with none is "Coming soon" and is never started.
 */
export function campaignBuiltV7(campaign: CampaignDefinitionV7): boolean {
  return (
    campaign.chapter?.missions.some(
      (entry) => missionByIdV7(entry.missionId) !== null,
    ) ?? false
  );
}

/** A campaign is completed when its last mission is won. */
export function campaignCompletedV7(
  campaign: CampaignDefinitionV7,
  completed: CampaignCompletedV7,
): boolean {
  const last = campaign.chapter?.missions.at(-1);
  return (
    last !== undefined &&
    campaignBuiltV7(campaign) &&
    Object.hasOwn(completed, last.missionId)
  );
}

/**
 * A campaign on the map: SOON (not built: never started), LOCKED (a
 * prerequisite is not completed), OPEN, or DONE (its last mission won).
 */
export type CampaignStatusV7 = "SOON" | "LOCKED" | "OPEN" | "DONE";

export interface CampaignPlateV7 {
  readonly campaign: CampaignDefinitionV7;
  readonly status: CampaignStatusV7;
  /** The prerequisites still to complete, in registry order. */
  readonly waitingFor: readonly CampaignDefinitionV7[];
  /** Built missions won, and built missions in all. */
  readonly missionsWon: number;
  readonly missionCount: number;
  /** Stars earned over the built missions, and the most there are. */
  readonly stars: number;
  readonly maxStars: number;
}

/**
 * Every campaign's plate, in map order. With `allUnlocked` (the testing
 * cheat, section 14.5) every built campaign is open whatever its
 * prerequisites; progress is still what was won.
 */
export function campaignPlatesV7(
  completed: CampaignCompletedV7,
  allUnlocked = false,
): readonly CampaignPlateV7[] {
  return CAMPAIGNS_V7.map((campaign) => {
    const waitingFor = campaign.prerequisites.flatMap((id) => {
      const prerequisite = campaignByIdV7(id);
      return prerequisite === null ||
        campaignCompletedV7(prerequisite, completed)
        ? []
        : [prerequisite];
    });
    const built = campaignBuiltV7(campaign);
    const cards =
      built && campaign.chapter !== null
        ? campaignMissionCardsV7(campaign.chapter, completed).filter(
            (card) => card.built,
          )
        : [];
    const status: CampaignStatusV7 = !built
      ? "SOON"
      : campaignCompletedV7(campaign, completed)
        ? "DONE"
        : allUnlocked || waitingFor.length === 0
          ? "OPEN"
          : "LOCKED";
    return {
      campaign,
      status,
      waitingFor,
      missionsWon: cards.filter((card) => card.status === "DONE").length,
      missionCount: cards.length,
      stars: cards.reduce((sum, card) => sum + card.stars, 0),
      maxStars: cards.reduce((sum, card) => sum + card.maxStars, 0),
    };
  });
}

/** Campaigns `after` opened that `before` had not (a notice of a win). */
export function campaignNewlyOpenedV7(
  before: CampaignCompletedV7,
  after: CampaignCompletedV7,
): readonly CampaignIdV7[] {
  const prior = campaignPlatesV7(before);
  return campaignPlatesV7(after).flatMap((plate, index) =>
    plate.status !== "LOCKED" &&
    plate.status !== "SOON" &&
    prior[index]?.status === "LOCKED"
      ? [plate.campaign.id]
      : [],
  );
}

export type CampaignMissionStatusV7 = "LOCKED" | "OPEN" | "DONE";

export interface CampaignMissionCardV7 {
  readonly entry: CampaignMissionEntryV7;
  readonly status: CampaignMissionStatusV7;
  /** The fewest rounds of a win, for a completed mission. */
  readonly bestRounds: number | null;
  /** The factions seat 0 may lead: its fixed faction or its choice list. */
  readonly leads: readonly FactionIdV7[];
  /** The factions of the AI seats that fight you, in seat order. */
  readonly opponents: readonly FactionIdV7[];
  /** The factions of the AI seats on your side, in seat order. */
  readonly allies: readonly FactionIdV7[];
  readonly size: number;
  /** False for a mission that is designed but not built: never playable. */
  readonly built: boolean;
  /** The best stars of a win (1 to `maxStars`); 0 until the mission is won. */
  readonly stars: number;
  /** One star for the win plus one for each secondary goal. */
  readonly maxStars: number;
  /**
   * Easy mode (`pulp_wars-q6cc`): every win of the mission was on Easy
   * (the card's "Easy" tag).
   */
  readonly easy: boolean;
}

/** The chapter and entry of a chapter mission, or null (hidden fixtures). */
export function campaignMissionV7(missionId: string): {
  readonly campaign: CampaignDefinitionV7;
  readonly chapter: CampaignChapterV7;
  readonly entry: CampaignMissionEntryV7;
} | null {
  for (const campaign of CAMPAIGNS_V7) {
    const chapter = campaign.chapter;
    const entry = chapter?.missions.find(
      (candidate) => candidate.missionId === missionId,
    );
    if (chapter !== null && entry !== undefined)
      return { campaign, chapter, entry };
  }
  return null;
}

/**
 * Missions are linear: mission 1 is open, mission N once N − 1 is won.
 * With `allUnlocked` (the testing cheat) every mission is open.
 */
export function campaignMissionStatusV7(
  chapter: CampaignChapterV7,
  entry: CampaignMissionEntryV7,
  completed: CampaignCompletedV7,
  allUnlocked = false,
): CampaignMissionStatusV7 {
  if (Object.hasOwn(completed, entry.missionId)) return "DONE";
  if (allUnlocked) return "OPEN";
  const index = chapter.missions.indexOf(entry);
  const previous = index > 0 ? chapter.missions[index - 1] : undefined;
  return previous === undefined || Object.hasOwn(completed, previous.missionId)
    ? "OPEN"
    : "LOCKED";
}

export function campaignMissionCardsV7(
  chapter: CampaignChapterV7,
  completed: CampaignCompletedV7,
  allUnlocked = false,
): readonly CampaignMissionCardV7[] {
  return chapter.missions.map((entry) => {
    const mission = missionByIdV7(entry.missionId);
    const done = Object.hasOwn(completed, entry.missionId)
      ? (completed[entry.missionId] ?? null)
      : null;
    const progress = {
      entry,
      status: campaignMissionStatusV7(chapter, entry, completed, allUnlocked),
      bestRounds: done?.bestRounds ?? null,
    };
    if (mission === null) {
      // Designed, not built (docs/product/CAMPAIGN.md section 9).
      if (entry.planned === undefined)
        throw new Error(`Chapter mission ${entry.missionId} is not registered`);
      return {
        ...progress,
        leads: entry.planned.leads,
        opponents: entry.planned.opponents,
        allies: entry.planned.allies ?? [],
        size: entry.planned.size,
        built: false,
        stars: 0,
        maxStars: 3,
        easy: false,
      };
    }
    const [human, ...ai] = mission.seats;
    const team = (seat: number): number => mission.teams?.[seat] ?? seat;
    const maxStars = 1 + (mission.objective?.bonus?.length ?? 0);
    return {
      ...progress,
      leads: human === undefined ? [] : missionSeatFactionsV7(human),
      opponents: ai.flatMap((seat, index) =>
        team(index + 1) === team(0) ? [] : missionSeatFactionsV7(seat),
      ),
      allies: ai.flatMap((seat, index) =>
        team(index + 1) === team(0) ? missionSeatFactionsV7(seat) : [],
      ),
      size: mission.size,
      built: true,
      stars: done === null ? 0 : Math.min(maxStars, done.stars ?? 1),
      maxStars,
      easy: done?.easy === true,
    };
  });
}

/**
 * The factions seat 0 may lead in a mission: its fixed faction, or its
 * whole choice list. No faction is locked (`pulp_wars-hmyk.22`).
 */
export function campaignFactionChoicesV7(
  missionId: string,
): readonly FactionIdV7[] {
  const human = missionByIdV7(missionId)?.seats[0];
  return human === undefined ? [] : missionSeatFactionsV7(human);
}

/**
 * True when the mission is open in the normal game (`pulp_wars-6o5t`,
 * docs/product/CAMPAIGN.md section 25.1): its campaign is open or done
 * whatever developer mode says, and the mission is open or done there
 * (mission 1, or the previous mission won). A developer-mode win of such
 * a mission is recorded: it shortcuts neither the campaign graph nor the
 * faction locks. False for a mission in no chapter.
 */
export function campaignMissionOpenNormallyV7(
  missionId: string,
  completed: CampaignCompletedV7,
): boolean {
  const found = campaignMissionV7(missionId);
  if (found === null) return false;
  const plate = campaignPlatesV7(completed).find(
    (candidate) => candidate.campaign.id === found.campaign.id,
  );
  return (
    (plate?.status === "OPEN" || plate?.status === "DONE") &&
    campaignMissionStatusV7(found.chapter, found.entry, completed) !== "LOCKED"
  );
}

/**
 * The mission after this one in its chapter, or null after the last built
 * one: a mission that is designed but not built is nothing to go on to.
 */
export function campaignNextMissionV7(
  missionId: string,
): CampaignMissionEntryV7 | null {
  const found = campaignMissionV7(missionId);
  if (found === null) return null;
  const index = found.chapter.missions.indexOf(found.entry);
  const next = found.chapter.missions[index + 1] ?? null;
  return next !== null && missionByIdV7(next.missionId) !== null ? next : null;
}

/** What a mission calls one of its landmarks or tagged units. */
export function campaignTagNameV7(missionId: string, tag: string): string {
  return (
    campaignMissionV7(missionId)?.entry.names?.[tag] ??
    tag.toLowerCase().replaceAll("_", " ")
  );
}
