import type { StorageAdapter } from "./index";

/**
 * Campaign progress (`pulp_wars-68k.5`, docs/product/CAMPAIGN.md section
 * 4.1). Its own localStorage key, never a save key: it is not in
 * `OBSOLETE_SAVE_STORAGE_KEYS_V7`, so a ruleset identity change leaves it
 * alone, and deleting the autosave never touches it. Only completed
 * missions are stored; which missions are open and which factions are
 * unlocked are derived from them (`src/campaign/progress-v7.ts`).
 */
export const CAMPAIGN_PROGRESS_STORAGE_KEY_V7 = "pulpWars.campaign.v1";
export const CAMPAIGN_PROGRESS_FORMAT_V7 = "pulp-wars-campaign-progress";
/** Progress is a handful of missions; anything larger is not ours. */
export const MAX_CAMPAIGN_PROGRESS_BYTES_V7 = 64 * 1024;

export interface CampaignCompletionV7 {
  /** When the mission was first won (ISO 8601). */
  readonly firstWonAt: string;
  /** The fewest rounds any win of the mission took. */
  readonly bestRounds: number;
}

export interface CampaignProgressV7 {
  readonly format: typeof CAMPAIGN_PROGRESS_FORMAT_V7;
  readonly version: 1;
  /** Mission ID to completion; unknown IDs are kept and ignored. */
  readonly completed: Readonly<Record<string, CampaignCompletionV7>>;
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

const MISSION_ID_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export function emptyCampaignProgressV7(): CampaignProgressV7 {
  return Object.freeze({
    format: CAMPAIGN_PROGRESS_FORMAT_V7,
    version: 1,
    completed: Object.freeze({}),
  });
}

/** Strict parse of the stored progress; anything else is unreadable. */
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
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ["format", "version", "completed"])
  )
    return unreadable("Campaign progress has an unknown shape.");
  if (value.format !== CAMPAIGN_PROGRESS_FORMAT_V7 || value.version !== 1)
    return unreadable("Campaign progress has an unknown format or version.");
  const completed = value.completed;
  if (!isRecord(completed))
    return unreadable("Campaign progress has no completed missions record.");
  const entries: [string, CampaignCompletionV7][] = [];
  for (const [id, entry] of Object.entries(completed)) {
    if (!MISSION_ID_PATTERN.test(id))
      return unreadable("Campaign progress names an invalid mission.");
    if (
      !isRecord(entry) ||
      !hasExactKeys(entry, ["firstWonAt", "bestRounds"]) ||
      typeof entry.firstWonAt !== "string" ||
      !ISO_INSTANT_PATTERN.test(entry.firstWonAt) ||
      !Number.isSafeInteger(entry.bestRounds) ||
      (entry.bestRounds as number) < 1
    )
      return unreadable("Campaign progress has an invalid completion.");
    entries.push([
      id,
      Object.freeze({
        firstWonAt: entry.firstWonAt,
        bestRounds: entry.bestRounds as number,
      }),
    ]);
  }
  return {
    kind: "VALID",
    progress: freezeProgress(Object.fromEntries(entries)),
  };
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

  load(): CampaignProgressLoadV7 {
    if (this.#storage === null)
      return { kind: "VALID", progress: emptyCampaignProgressV7() };
    let source: string | null;
    try {
      source = this.#storage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
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
   * Records a won mission. Idempotent: a later win keeps `firstWonAt` and
   * only ever lowers `bestRounds`. Unreadable progress records nothing
   * until it is reset.
   */
  recordWin(missionId: string, rounds: number): CampaignRecordResultV7 {
    if (!MISSION_ID_PATTERN.test(missionId))
      throw new RangeError(`Invalid mission ID ${missionId}`);
    if (!Number.isSafeInteger(rounds) || rounds < 1)
      throw new RangeError("rounds must be a positive integer");
    const loaded = this.load();
    if (loaded.kind !== "VALID") return { ok: false, ...loaded };
    const before = loaded.progress;
    const prior = before.completed[missionId];
    const completion: CampaignCompletionV7 =
      prior === undefined
        ? { firstWonAt: this.#now(), bestRounds: rounds }
        : {
            firstWonAt: prior.firstWonAt,
            bestRounds: Math.min(prior.bestRounds, rounds),
          };
    const progress = freezeProgress({
      ...before.completed,
      [missionId]: completion,
    });
    // A win that does not beat the best changes nothing: no write.
    if (prior !== undefined && prior.bestRounds === completion.bestRounds)
      return { ok: true, firstWin: false, before, progress: before };
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

  /** Erases all campaign progress (the reset and the unreadable recovery). */
  reset(): CampaignWriteResultV7 {
    if (this.#storage === null) return { ok: true };
    try {
      this.#storage.removeItem(CAMPAIGN_PROGRESS_STORAGE_KEY_V7);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: diagnosticV7("Unable to reset campaign progress", error),
      };
    }
  }
}

function freezeProgress(
  completed: Readonly<Record<string, CampaignCompletionV7>>,
): CampaignProgressV7 {
  const entries = Object.entries(completed)
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([id, entry]) => [id, Object.freeze({ ...entry })] as const);
  return Object.freeze({
    format: CAMPAIGN_PROGRESS_FORMAT_V7,
    version: 1,
    completed: Object.freeze(Object.fromEntries(entries)),
  });
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
