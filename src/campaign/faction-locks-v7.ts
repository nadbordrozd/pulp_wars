import type { FactionIdV7 } from "../engine/index";
import { CAMPAIGNS_V7 } from "./campaigns";
import { campaignCompletedV7, type CampaignCompletedV7 } from "./progress-v7";

/**
 * Faction locks (`pulp_wars-5xki`, docs/product/CAMPAIGN.md section 25).
 * Outside developer mode three factions are earned by finishing campaigns:
 * Ice Folk after any 4, Candy after any 5, the Cultists after any 6. A
 * campaign is completed when its last mission is won, on any difficulty
 * (Easy wins count). Like the rest of the campaign state, the locks are
 * derived from the stored completions on every read, never stored.
 *
 * A lock gates only the player's own pick of a new game (skirmish, new
 * game, quick start). AI opponents may be any faction, a saved game or a
 * replayed setup with a locked faction still loads and plays, and the
 * campaigns of the locked factions stay playable as the campaign map
 * opens them.
 */
export const FACTION_UNLOCK_CAMPAIGNS_V7: Readonly<
  Partial<Record<FactionIdV7, number>>
> = Object.freeze({
  ICE_FOLK: 4,
  CANDY: 5,
  CULT: 6,
});

/** A locked faction: the campaigns it needs and the campaigns completed. */
export interface FactionLockV7 {
  readonly faction: FactionIdV7;
  readonly required: number;
  readonly completed: number;
}

/** How many campaigns are completed (their last mission won). */
export function completedCampaignCountV7(
  completed: CampaignCompletedV7,
): number {
  return CAMPAIGNS_V7.filter((campaign) =>
    campaignCompletedV7(campaign, completed),
  ).length;
}

/** The faction's lock, or null when the player may pick it. */
export function factionLockV7(
  faction: FactionIdV7,
  completed: CampaignCompletedV7,
  devMode = false,
): FactionLockV7 | null {
  const required = FACTION_UNLOCK_CAMPAIGNS_V7[faction];
  if (devMode || required === undefined) return null;
  const done = completedCampaignCountV7(completed);
  return done >= required ? null : { faction, required, completed: done };
}

/** True when the player may pick the faction for a new game. */
export function factionUnlockedV7(
  faction: FactionIdV7,
  completed: CampaignCompletedV7,
  devMode = false,
): boolean {
  return factionLockV7(faction, completed, devMode) === null;
}

/** The tooltip of a locked faction: "Complete any 4 campaigns to unlock (2/4)". */
export function factionLockTextV7(lock: FactionLockV7): string {
  return `Complete any ${lock.required} campaigns to unlock (${Math.min(lock.completed, lock.required)}/${lock.required})`;
}

/**
 * The factions a win unlocked: locked by `before`'s completions, open by
 * `after`'s (the debrief's "New faction unlocked" line), in lock order.
 */
export function factionsNewlyUnlockedV7(
  before: CampaignCompletedV7,
  after: CampaignCompletedV7,
): readonly FactionIdV7[] {
  return (Object.keys(FACTION_UNLOCK_CAMPAIGNS_V7) as FactionIdV7[]).filter(
    (faction) =>
      factionLockV7(faction, before) !== null &&
      factionLockV7(faction, after) === null,
  );
}

/**
 * The faction a new game's player leads: `wanted` when it may be picked,
 * else the first faction of `factions` that may.
 */
export function unlockedFactionV7(
  wanted: FactionIdV7,
  factions: readonly FactionIdV7[],
  completed: CampaignCompletedV7,
  devMode = false,
): FactionIdV7 {
  if (factionUnlockedV7(wanted, completed, devMode)) return wanted;
  return (
    factions.find((faction) =>
      factionUnlockedV7(faction, completed, devMode),
    ) ?? "ORIGINAL"
  );
}
