import type { StorageAdapter } from "./index";

/**
 * Campaign progress (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md section
 * 4.1; per campaign since `pulp_wars-hmyk.3`, section 14.4). Its own
 * localStorage key, never a save key: it is not in
 * `OBSOLETE_SAVE_STORAGE_KEYS_V7`, so a ruleset identity change leaves it
 * alone, and deleting the autosave never touches it. Only completed
 * missions are stored, grouped by campaign; which missions and campaigns
 * are open and which factions are unlocked are derived from them
 * (`src/campaign/progress-v7.ts`).
 *
 * Version 2 lives under its own key. Progress of version 1 (one flat
 * record of the prologue's missions, under the old key) is read while there
 * is no version 2 and migrated into the campaign `FRONTIER`; the first win
 * recorded afterwards writes version 2 under the new key. The old key is
 * left alone (an older build still reads it) until Reset erases both.
 *
 * `FRONTIER`, the prologue, was retired by `pulp_wars-hmyk.22`: its
 * progress (of either version) still loads, is kept on every write, and is
 * ignored by the campaign map, since no registered campaign or mission has
 * its IDs.
 */
export const CAMPAIGN_PROGRESS_STORAGE_KEY_V7 = "pulpWars.campaign.v2";
/** Where version 1 lived (`pulp_wars-68k.5` until `pulp_wars-hmyk.3`). */
export const LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7 = "pulpWars.campaign.v1";
export const CAMPAIGN_PROGRESS_FORMAT_V7 = "pulp-wars-campaign-progress";
/** The campaign version 1's missions belong to: the retired prologue. */
export const LEGACY_CAMPAIGN_ID_V7 = "FRONTIER";
/** Progress is a handful of missions; anything larger is not ours. */
export const MAX_CAMPAIGN_PROGRESS_BYTES_V7 = 64 * 1024;

export interface CampaignCompletionV7 {
  /** When the mission was first won (ISO 8601). */
  readonly firstWonAt: string;
  /** The fewest rounds any win of the mission took. */
  readonly bestRounds: number;
  /**
   * The most stars any win earned (`pulp_wars-v642.1`): 1 to 3. Absent in
   * progress written before stars existed, which reads as one star.
   */
  readonly stars?: number;
}

/** One campaign's progress: its completed missions by mission ID. */
export interface CampaignRecordV7 {
  readonly completed: Readonly<Record<string, CampaignCompletionV7>>;
}

export interface CampaignProgressV7 {
  readonly format: typeof CAMPAIGN_PROGRESS_FORMAT_V7;
  readonly version: 2;
  /**
   * Campaign ID to its progress. Unknown campaign and mission IDs are kept
   * and ignored (a campaign removed from a later build wipes nothing).
   */
  readonly campaigns: Readonly<Record<string, CampaignRecordV7>>;
}

export type CampaignProgressLoadV7 =
  | { readonly kind: "VALID"; readonly progress: CampaignProgressV7 }
  | {
      readonly kind: "UNREADABLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

export type CampaignRecordResultV7 =
  | {
      readonly ok: true;
      /** True when this win is the mission's first. */
      readonly firstWin: boolean;
      readonly before: CampaignProgressV7;
      readonly progress: CampaignProgressV7;
    }
  | {
      readonly ok: false;
      readonly kind: "UNREADABLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

export type CampaignWriteResultV7 =
  { readonly ok: true } | { readonly ok: false; readonly diagnostic: string };

type CompletedV7 = Readonly<Record<string, CampaignCompletionV7>>;

const ID_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function emptyCampaignProgressV7(): CampaignProgressV7 {
  return Object.freeze({
    format: CAMPAIGN_PROGRESS_FORMAT_V7,
    version: 2,
    campaigns: Object.freeze({}),
  });
}

/**
 * Every campaign's completions in one record. Mission IDs are unique
 * across campaigns (a mission belongs to one campaign), so nothing is lost.
 */
export function campaignCompletionsV7(
  progress: CampaignProgressV7,
): CompletedV7 {
  const all: Record<string, CampaignCompletionV7> = {};
  for (const record of Object.values(progress.campaigns))
    Object.assign(all, record.completed);
  return Object.freeze(all);
}

/**
 * Strict parse of stored progress of either version; version 1 is migrated
 * into the prologue (`LEGACY_CAMPAIGN_ID_V7`). Anything else is unreadable.
 */
export function parseCampaignProgressV7(
  source: string,
): CampaignProgressLoadV7 {
  if (source.length > MAX_CAMPAIGN_PROGRESS_BYTES_V7)
    return unreadable("Campaign progress is too large.");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return unreadable("Campaign progress is not valid JSON.");
  }
  if (!isRecord(value))
    return unreadable("Campaign progress has an unknown shape.");
  if (value.version === 1) {
    if (!hasExactKeys(value, ["format", "version", "completed"]))
      return unreadable("Campaign progress has an unknown shape.");
    if (value.format !== CAMPAIGN_PROGRESS_FORMAT_V7)
      return unreadable("Campaign progress has an unknown format or version.");
    const completed = parseCompleted(value.completed);
    if (typeof completed === "string") return unreadable(completed);
    return {
      kind: "VALID",
      progress: freezeProgress(
        Object.keys(completed).length === 0
          ? {}
          : { [LEGACY_CAMPAIGN_ID_V7]: completed },
      ),
    };
  }
  if (!hasExactKeys(value, ["format", "version", "campaigns"]))
    return unreadable("Campaign progress has an unknown shape.");
  if (value.format !== CAMPAIGN_PROGRESS_FORMAT_V7 || value.version !== 2)
    return unreadable("Campaign progress has an unknown format or version.");
  const campaigns = value.campaigns;
  if (!isRecord(campaigns))
    return unreadable("Campaign progress has no campaigns record.");
  const parsed: Record<string, CompletedV7> = {};
  const seen = new Set<string>();
  for (const [id, record] of Object.entries(campaigns)) {
    if (!ID_PATTERN.test(id))
      return unreadable("Campaign progress names an invalid campaign.");
    if (!isRecord(record) || !hasExactKeys(record, ["completed"]))
      return unreadable("Campaign progress has an invalid campaign.");
    const completed = parseCompleted(record.completed);
    if (typeof completed === "string") return unreadable(completed);
    for (const missionId of Object.keys(completed)) {
      // A mission belongs to one campaign.
      if (seen.has(missionId))
        return unreadable("Campaign progress lists a mission twice.");
      seen.add(missionId);
    }
    parsed[id] = completed;
  }
  return { kind: "VALID", progress: freezeProgress(parsed) };
}

/** A record of completions, or why it is unreadable. */
function parseCompleted(completed: unknown): CompletedV7 | string {
  if (!isRecord(completed))
    return "Campaign progress has no completed missions record.";
  const entries: [string, CampaignCompletionV7][] = [];
  for (const [id, entry] of Object.entries(completed)) {
    if (!ID_PATTERN.test(id))
      return "Campaign progress names an invalid mission.";
    if (
      !isRecord(entry) ||
      !(
        hasExactKeys(entry, ["firstWonAt", "bestRounds"]) ||
        hasExactKeys(entry, ["firstWonAt", "bestRounds", "stars"])
      ) ||
      (Object.hasOwn(entry, "stars") &&
        entry.stars !== 1 &&
        entry.stars !== 2 &&
        entry.stars !== 3) ||
      typeof entry.firstWonAt !== "string" ||
      !ISO_INSTANT_PATTERN.test(entry.firstWonAt) ||
      !Number.isSafeInteger(entry.bestRounds) ||
      (entry.bestRounds as number) < 1
    )
      return "Campaign progress has an invalid completion.";
    entries.push([
      id,
      {
        firstWonAt: entry.firstWonAt,
        bestRounds: entry.bestRounds as number,
        ...(Object.hasOwn(entry, "stars")
          ? { stars: entry.stars as number }
          : {}),
      },
    ]);
  }
  return Object.fromEntries(entries);
}

/**
 * The browser repository of campaign progress. Every storage access is
 * guarded: restricted or failing storage reports an error and never
 * throws, so the skirmish game is unaffected.
 */
export class CampaignProgressStoreV7 {
  readonly #storage: StorageAdapter | null;
  readonly #now: () => string;

  constructor(
    storage: StorageAdapter | null,
    options: { readonly now?: () => string } = {},
  ) {
    this.#storage = storage;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  /** Version 2; else version 1, migrated; else empty progress. */
  load(): CampaignProgressLoadV7 {
    if (this.#storage === null)
      return { kind: "VALID", progress: emptyCampaignProgressV7() };
    let source: string | null;
    try {
      source =
        this.#storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7) ??
        this.#storage.getItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
    } catch (error) {
      return {
        kind: "STORAGE_ERROR",
        diagnostic: diagnosticV7("Unable to read campaign progress", error),
      };
    }
    if (source === null)
      return { kind: "VALID", progress: emptyCampaignProgressV7() };
    return parseCampaignProgressV7(source);
  }

  /**
   * Records a won mission of a campaign. Idempotent: a later win keeps
   * `firstWonAt`, only ever lowers `bestRounds`, and only ever raises
   * `stars`. Unreadable progress records nothing until it is reset.
   */
  recordWin(
    campaignId: string,
    missionId: string,
    rounds: number,
    stars = 1,
  ): CampaignRecordResultV7 {
    if (!ID_PATTERN.test(campaignId))
      throw new RangeError(`Invalid campaign ID ${campaignId}`);
    if (!ID_PATTERN.test(missionId))
      throw new RangeError(`Invalid mission ID ${missionId}`);
    if (!Number.isSafeInteger(rounds) || rounds < 1)
      throw new RangeError("rounds must be a positive integer");
    if (stars !== 1 && stars !== 2 && stars !== 3)
      throw new RangeError("stars must be 1, 2, or 3");
    const loaded = this.load();
    if (loaded.kind !== "VALID") return { ok: false, ...loaded };
    const before = loaded.progress;
    // A mission's wins stay where its first was filed.
    const home =
      Object.entries(before.campaigns).find(([, record]) =>
        Object.hasOwn(record.completed, missionId),
      )?.[0] ?? campaignId;
    const prior = before.campaigns[home]?.completed[missionId];
    const completion: CampaignCompletionV7 =
      prior === undefined
        ? { firstWonAt: this.#now(), bestRounds: rounds, stars }
        : {
            firstWonAt: prior.firstWonAt,
            bestRounds: Math.min(prior.bestRounds, rounds),
            stars: Math.max(prior.stars ?? 1, stars),
          };
    // A win that does not beat the best changes nothing: no write.
    if (
      prior !== undefined &&
      prior.bestRounds === completion.bestRounds &&
      (prior.stars ?? 1) === completion.stars
    )
      return { ok: true, firstWin: false, before, progress: before };
    const campaigns: Record<string, CompletedV7> = Object.fromEntries(
      Object.entries(before.campaigns).map(([id, record]) => [
        id,
        record.completed,
      ]),
    );
    campaigns[home] = { ...campaigns[home], [missionId]: completion };
    const progress = freezeProgress(campaigns);
    if (this.#storage !== null) {
      try {
        this.#storage.setItem(
          CAMPAIGN_PROGRESS_STORAGE_KEY_V7,
          JSON.stringify(progress),
        );
      } catch (error) {
        return {
          ok: false,
          kind: "STORAGE_ERROR",
          diagnostic: diagnosticV7("Unable to write campaign progress", error),
        };
      }
    }
    return { ok: true, firstWin: prior === undefined, before, progress };
  }

  /**
   * Erases all campaign progress of both versions (the reset and the
   * unreadable recovery).
   */
  reset(): CampaignWriteResultV7 {
    if (this.#storage === null) return { ok: true };
    try {
      this.#storage.removeItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
      this.#storage.removeItem(LEGACY_CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: diagnosticV7("Unable to reset campaign progress", error),
      };
    }
  }
}

/** Frozen progress with campaigns and missions in ID order. */
function freezeProgress(
  campaigns: Readonly<Record<string, CompletedV7>>,
): CampaignProgressV7 {
  return Object.freeze({
    format: CAMPAIGN_PROGRESS_FORMAT_V7,
    version: 2,
    campaigns: Object.freeze(
      Object.fromEntries(
        sortedEntries(campaigns).map(([id, completed]) => [
          id,
          Object.freeze({
            completed: Object.freeze(
              Object.fromEntries(
                sortedEntries(completed).map(([missionId, entry]) => [
                  missionId,
                  Object.freeze({ ...entry }),
                ]),
              ),
            ),
          }),
        ]),
      ),
    ),
  });
}

function sortedEntries<T>(record: Readonly<Record<string, T>>): [string, T][] {
  return Object.entries(record).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

function unreadable(diagnostic: string): CampaignProgressLoadV7 {
  return { kind: "UNREADABLE", diagnostic };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const own = Object.keys(value);
  return (
    own.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function diagnosticV7(prefix: string, error: unknown): string {
  return error instanceof Error ? `${prefix}: ${error.message}` : prefix;
}
