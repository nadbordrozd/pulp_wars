import type { FactionIdV7, UnitRoleIdV7 } from "../engine/v7/types";
import { CHAPTER_ONE_V7, type CampaignChapterV7 } from "./chapter-1";
import { CHAPTER_DINOSAURS_V7 } from "./chapter-dinosaurs";
import { CHAPTER_GOBLINS_V7 } from "./chapter-goblins";
import { CHAPTER_HUMANS_V7 } from "./chapter-humans";
import { CHAPTER_MARTIANS_V7 } from "./chapter-martians";
import { CHAPTER_UNDEAD_V7 } from "./chapter-undead";

/**
 * The campaign registry (`pulp_wars-hmyk.3`, docs/product/CAMPAIGN.md
 * section 14): the prologue, "The Hollow Frontier" (the ten-mission chapter
 * of part one), and the nine faction campaigns of the saga, which unlock
 * one another as a graph:
 *
 * - the prologue is always open and is no one's prerequisite;
 * - tier 1, the Humans and the Undead, are open from the start;
 * - tier 2, the Dinosaurs, Martians, Goblins and Dwarves, open once both
 *   campaigns of tier 1 are completed;
 * - tier 3, the Ice Folk, the Cult and Candy, open once all four of tier 2
 *   are completed.
 *
 * A campaign is completed when its last mission is won. A campaign whose
 * `chapter` is null, or whose missions are none of them registered yet, is
 * "Coming soon": shown on the campaign map, never started.
 *
 * Data only. The titles and subtitles are placeholders until the saga bible
 * (`pulp_wars-hmyk.1`, docs/product/SAGA.md) names the campaigns; each
 * campaign bead (`pulp_wars-hmyk.4` to `.12`) fills in its entry here: the
 * title, the subtitle, and a chapter of six missions. The art bead
 * (`pulp_wars-hmyk.13`) sets `picture`.
 */
export const CAMPAIGN_IDS_V7 = Object.freeze([
  "FRONTIER",
  "HUMANS",
  "UNDEAD",
  "DINOSAURS",
  "MARTIANS",
  "GOBLINS",
  "DWARVES",
  "ICE_FOLK",
  "CULT",
  "CANDY",
] as const);

export type CampaignIdV7 = (typeof CAMPAIGN_IDS_V7)[number];

/**
 * Where a campaign stands on the map: 0 the prologue, set apart; 1 the two
 * openers; 2 the middle four; 3 the last three.
 */
export type CampaignTierV7 = 0 | 1 | 2 | 3;

export interface CampaignDefinitionV7 {
  readonly id: CampaignIdV7;
  /** The faction the campaign is about (its plate's placeholder art). */
  readonly faction: FactionIdV7;
  /** What a sentence calls it: "Finish Humans and Undead". */
  readonly name: string;
  readonly title: string;
  /** One short line under the title: the kicker of its mission list. */
  readonly subtitle: string;
  readonly tier: CampaignTierV7;
  /** Campaigns that must all be completed before this one opens. */
  readonly prerequisites: readonly CampaignIdV7[];
  /**
   * The asset ID of the campaign's picture, or null until the art bead
   * draws it: the map then shows the faction's portrait on a framed plate.
   */
  readonly picture: string | null;
  /** The portrait the plate shows while `picture` is null. */
  readonly placeholderRole: UnitRoleIdV7;
  /** The missions, story and unlocks; null until the campaign is written. */
  readonly chapter: CampaignChapterV7 | null;
}

const OPENERS: readonly CampaignIdV7[] = Object.freeze(["HUMANS", "UNDEAD"]);
const MIDDLE: readonly CampaignIdV7[] = Object.freeze([
  "DINOSAURS",
  "MARTIANS",
  "GOBLINS",
  "DWARVES",
]);

function factionCampaign(
  id: CampaignIdV7,
  faction: FactionIdV7,
  name: string,
  adjective: string,
  tier: 1 | 2 | 3,
): CampaignDefinitionV7 {
  return Object.freeze({
    id,
    faction,
    name,
    title: `The ${adjective} Campaign`,
    subtitle: "Six missions",
    tier,
    prerequisites: tier === 1 ? [] : tier === 2 ? OPENERS : MIDDLE,
    picture: null,
    placeholderRole: "CAPTAIN",
    chapter: null,
  });
}

/** Every campaign, in map order: the prologue, then tier by tier. */
export const CAMPAIGNS_V7: readonly CampaignDefinitionV7[] = Object.freeze([
  Object.freeze({
    id: "FRONTIER",
    faction: "ORIGINAL",
    name: "the Frontier",
    title: "The Hollow Frontier",
    subtitle: "Prologue",
    tier: 0,
    prerequisites: Object.freeze([]),
    picture: null,
    placeholderRole: "GUARD",
    chapter: CHAPTER_ONE_V7,
  } satisfies CampaignDefinitionV7),
  // The Humans campaign (`pulp_wars-hmyk.4`, docs/product/SAGA.md 2.1).
  Object.freeze({
    ...factionCampaign("HUMANS", "ORIGINAL", "Humans", "Human", 1),
    title: "The Marshal's Law",
    subtitle: "Steele against the Baron",
    chapter: CHAPTER_HUMANS_V7,
  } satisfies CampaignDefinitionV7),
  // The Undead campaign (`pulp_wars-hmyk.5`, docs/product/SAGA.md 2.2).
  Object.freeze({
    ...factionCampaign("UNDEAD", "UNDEAD", "Undead", "Undead", 1),
    title: "The Long Sleep",
    subtitle: "The Marquis would like to rest",
    chapter: CHAPTER_UNDEAD_V7,
  } satisfies CampaignDefinitionV7),
  // The Dinosaur campaign (`pulp_wars-hmyk.6`, docs/product/SAGA.md 2.5).
  Object.freeze({
    ...factionCampaign("DINOSAURS", "DINOSAUR", "Dinosaurs", "Dinosaur", 2),
    title: "The Egg Thief",
    subtitle: "The Old Queen wants her eggs back",
    chapter: CHAPTER_DINOSAURS_V7,
  } satisfies CampaignDefinitionV7),
  // The Martian campaign (`pulp_wars-hmyk.7`, docs/product/SAGA.md 2.6).
  Object.freeze({
    ...factionCampaign("MARTIANS", "MARTIAN", "Martians", "Martian", 2),
    title: "Signal from Home",
    subtitle: "Quaxx would like to call home",
    chapter: CHAPTER_MARTIANS_V7,
  } satisfies CampaignDefinitionV7),
  // The Goblin campaign (`pulp_wars-hmyk.8`, docs/product/SAGA.md 2.3).
  Object.freeze({
    ...factionCampaign("GOBLINS", "GOBLIN", "Goblins", "Goblin", 2),
    title: "The Big Score",
    subtitle: "Grubnak robs the Baron",
    chapter: CHAPTER_GOBLINS_V7,
  } satisfies CampaignDefinitionV7),
  factionCampaign("DWARVES", "DWARF", "Dwarves", "Dwarf", 2),
  factionCampaign("ICE_FOLK", "ICE_FOLK", "Ice Folk", "Ice Folk", 3),
  // The saga culminates with the Cult: the middle of the last row.
  factionCampaign("CULT", "CULT", "Cultists", "Cultist", 3),
  factionCampaign("CANDY", "CANDY", "Candy", "Candy", 3),
]);
