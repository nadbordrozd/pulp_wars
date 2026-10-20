import type { FactionIdV7 } from "../engine/v7/types";

/**
 * The shape of a campaign's chapter (docs/product/CAMPAIGN.md sections 10
 * and 14): the order of its missions, the story, the briefings, hints,
 * closing lines, and the names of the things a mission's objective talks
 * about. Data only; the campaign screens and progress read it. Each
 * mission's board, seats, objective, and directives live in its engine
 * definition (`src/engine/v7/missions/`), which `missionId` names.
 *
 * The prologue, "The Hollow Frontier", was the first chapter of this shape;
 * it was retired by `pulp_wars-hmyk.22` (CAMPAIGN.md section 24), and with
 * it the faction unlocks that were its reward: every faction is open from
 * the start.
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
  /**
   * What the mission's landmarks and tagged units are called, by tag (the
   * engine definition's `landmarks[].tag` and `units[].tag`).
   */
  readonly names?: Readonly<Record<string, string>>;
  /**
   * A mission that is designed but not built yet: who leads, against whom,
   * and on what size of board, for its card ("Coming soon"). Absent once it
   * is registered.
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
  readonly missions: readonly CampaignMissionEntryV7[];
  /** Shown after the last mission's closing line. */
  readonly outro: string;
}
