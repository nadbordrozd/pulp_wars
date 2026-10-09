import {
  matchSummaryV7,
  type FactionIdV7,
  type GameModeV7,
  type GameStateV7,
} from "../engine/index";
import type { StorageAdapter } from "./index";

/**
 * Tribe stars (docs/product/RULESET_7_SCORE_AND_STARS.md section 6): the
 * best star grade per play mode and tribe, kept in the browser and never
 * lowered. Its own localStorage key, never a save key: it is not in
 * `OBSOLETE_SAVE_STORAGE_KEYS_V7`, so a ruleset identity change and
 * "Delete save" leave it alone. Per profile means per browser profile (one
 * localStorage origin), the scope of the save and the campaign.
 */
export const TRIBE_STARS_STORAGE_KEY_V7 = "pulpWars.stars.v1";
export const TRIBE_STARS_FORMAT_V7 = "pulp-wars-tribe-stars";
/** A few dozen records; anything larger is not ours. */
export const MAX_TRIBE_STARS_BYTES_V7 = 64 * 1024;

/** One tribe's best result in one mode. A tribe with no record shows 0. */
export interface TribeStarRecordV7 {
  readonly stars: 1 | 2 | 3;
  /** The hidden glow of a flawless win (section 5.4). */
  readonly glow: boolean;
  /** The best rating of any recorded win, to two decimals. */
  readonly bestRating: number;
  /** The first recorded win (ISO 8601). */
  readonly firstAt: string;
  /** The last win that improved anything (ISO 8601). */
  readonly updatedAt: string;
}

export interface TribeStarsV7 {
  readonly format: typeof TRIBE_STARS_FORMAT_V7;
  readonly version: 1;
  /**
   * Mode to tribe to record. Unknown modes and tribes are kept and
   * ignored, so a later version's records survive this one.
   */
  readonly modes: Readonly<
    Record<string, Readonly<Record<string, TribeStarRecordV7>>>
  >;
}

export type TribeStarsLoadV7 =
  | { readonly kind: "VALID"; readonly stars: TribeStarsV7 }
  | {
      readonly kind: "UNREADABLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

/** A won match's grade, as the records take it. */
export interface TribeStarResultV7 {
  readonly gameMode: GameModeV7;
  readonly faction: FactionIdV7;
  readonly stars: 1 | 2 | 3;
  readonly glow: boolean;
  /** The rating rounded down to hundredths (`StarGradeV7.rating`). */
  readonly ratingHundredths: number;
}

export type TribeStarsRecordResultV7 =
  | {
      readonly ok: true;
      /** True when the stars, the glow, or the best rating went up. */
      readonly improved: boolean;
      /** The record before this result (null for the tribe's first win). */
      readonly before: TribeStarRecordV7 | null;
      /** The record now stored. */
      readonly record: TribeStarRecordV7;
    }
  | {
      readonly ok: false;
      readonly kind: "UNREADABLE" | "STORAGE_ERROR";
      readonly diagnostic: string;
    };

export type TribeStarsWriteResultV7 =
  { readonly ok: true } | { readonly ok: false; readonly diagnostic: string };

const KEY_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const ISO_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
const RECORD_KEYS = [
  "stars",
  "glow",
  "bestRating",
  "firstAt",
  "updatedAt",
] as const;

export function emptyTribeStarsV7(): TribeStarsV7 {
  return freezeStars({ DOMINATION: {}, PERFECTION: {} });
}

/** The tribe's record in a mode, or null when it has none. */
export function tribeStarRecordV7(
  stars: TribeStarsV7,
  gameMode: string,
  faction: string,
): TribeStarRecordV7 | null {
  return stars.modes[gameMode]?.[faction] ?? null;
}

/** Strict parse of the stored records; anything else is unreadable. */
export function parseTribeStarsV7(source: string): TribeStarsLoadV7 {
  if (source.length > MAX_TRIBE_STARS_BYTES_V7)
    return unreadable("Tribe records are too large.");
  let value: unknown;
  try {
    value = JSON.parse(source);
  } catch {
    return unreadable("Tribe records are not valid JSON.");
  }
  if (!isRecord(value) || !hasExactKeys(value, ["format", "version", "modes"]))
    return unreadable("Tribe records have an unknown shape.");
  if (value.format !== TRIBE_STARS_FORMAT_V7 || value.version !== 1)
    return unreadable("Tribe records have an unknown format or version.");
  if (!isRecord(value.modes))
    return unreadable("Tribe records have no modes record.");
  const modes: Record<string, Record<string, TribeStarRecordV7>> = {};
  for (const [mode, tribes] of Object.entries(value.modes)) {
    if (!KEY_PATTERN.test(mode) || !isRecord(tribes))
      return unreadable("Tribe records name an invalid mode.");
    const parsed: Record<string, TribeStarRecordV7> = {};
    for (const [faction, entry] of Object.entries(tribes)) {
      if (!KEY_PATTERN.test(faction))
        return unreadable("Tribe records name an invalid tribe.");
      const record = parseRecord(entry);
      if (record === null)
        return unreadable("Tribe records hold an invalid record.");
      parsed[faction] = record;
    }
    modes[mode] = parsed;
  }
  return {
    kind: "VALID",
    stars: freezeStars({ DOMINATION: {}, PERFECTION: {}, ...modes }),
  };
}

/**
 * Section 6, "Never lowered": the record after `result`. Stars and the best
 * rating take the larger, the glow either; `firstAt` is kept and
 * `updatedAt` changes only when something improved. Idempotent.
 */
export function mergeTribeStarRecordV7(
  prior: TribeStarRecordV7 | null,
  result: Pick<TribeStarResultV7, "stars" | "glow" | "ratingHundredths">,
  now: string,
): TribeStarRecordV7 {
  const rating = Math.max(0, Math.floor(result.ratingHundredths)) / 100;
  if (prior === null)
    return Object.freeze({
      stars: result.stars,
      glow: result.glow,
      bestRating: rating,
      firstAt: now,
      updatedAt: now,
    });
  const stars = Math.max(prior.stars, result.stars) as 1 | 2 | 3;
  const glow = prior.glow || result.glow;
  const bestRating =
    Math.round(rating * 100) > Math.round(prior.bestRating * 100)
      ? rating
      : prior.bestRating;
  const improved =
    stars !== prior.stars ||
    glow !== prior.glow ||
    bestRating !== prior.bestRating;
  return Object.freeze({
    stars,
    glow,
    bestRating,
    firstAt: prior.firstAt,
    updatedAt: improved ? now : prior.updatedAt,
  });
}

/**
 * Section 6, "What records": the grade of a finished match the records
 * take, or null. Only a human victory in a generated match records (not
 * the Showcase, not a mission, never a mirror setup), under the human
 * seat's tribe and the match's mode; a defeat records nothing.
 */
export function tribeStarResultV7(
  state: GameStateV7,
): TribeStarResultV7 | null {
  const summary = matchSummaryV7(state);
  if (summary === null || !summary.recordable) return null;
  const grade = summary.grade;
  if (!grade.conditions.victory || grade.stars === 0) return null;
  const human = state.players.find(
    (player) => player.id === state.humanPlayerId,
  );
  if (human === undefined) return null;
  return {
    gameMode: summary.gameMode,
    faction: human.faction,
    stars: grade.stars,
    glow: grade.glow,
    ratingHundredths: grade.rating.hundredths,
  };
}

/**
 * The browser repository of tribe stars. Every storage access is guarded:
 * restricted or failing storage reports an error and never throws, so the
 * game is unaffected.
 */
export class TribeStarsStoreV7 {
  readonly #storage: StorageAdapter | null;
  readonly #now: () => string;

  constructor(
    storage: StorageAdapter | null,
    options: { readonly now?: () => string } = {},
  ) {
    this.#storage = storage;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  load(): TribeStarsLoadV7 {
    if (this.#storage === null)
      return { kind: "VALID", stars: emptyTribeStarsV7() };
    let source: string | null;
    try {
      source = this.#storage.getItem(TRIBE_STARS_STORAGE_KEY_V7);
    } catch (error) {
      return {
        kind: "STORAGE_ERROR",
        diagnostic: diagnosticV7("Unable to read tribe records", error),
      };
    }
    if (source === null) return { kind: "VALID", stars: emptyTribeStarsV7() };
    return parseTribeStarsV7(source);
  }

  /**
   * Records a won match's grade, never lowering anything. A result that
   * improves nothing writes nothing. Unreadable records record nothing
   * until they are reset.
   */
  record(result: TribeStarResultV7): TribeStarsRecordResultV7 {
    if (!KEY_PATTERN.test(result.gameMode) || !KEY_PATTERN.test(result.faction))
      throw new RangeError("Invalid tribe record key");
    if (
      ![1, 2, 3].includes(result.stars) ||
      !Number.isSafeInteger(result.ratingHundredths) ||
      result.ratingHundredths < 0
    )
      throw new RangeError("Invalid tribe star result");
    const loaded = this.load();
    if (loaded.kind !== "VALID") return { ok: false, ...loaded };
    const before = tribeStarRecordV7(
      loaded.stars,
      result.gameMode,
      result.faction,
    );
    const record = mergeTribeStarRecordV7(before, result, this.#now());
    const improved =
      before === null ||
      record.stars !== before.stars ||
      record.glow !== before.glow ||
      record.bestRating !== before.bestRating;
    if (!improved) return { ok: true, improved: false, before, record: before };
    const next = freezeStars({
      ...loaded.stars.modes,
      [result.gameMode]: {
        ...loaded.stars.modes[result.gameMode],
        [result.faction]: record,
      },
    });
    if (this.#storage !== null) {
      try {
        this.#storage.setItem(TRIBE_STARS_STORAGE_KEY_V7, JSON.stringify(next));
      } catch (error) {
        return {
          ok: false,
          kind: "STORAGE_ERROR",
          diagnostic: diagnosticV7("Unable to write tribe records", error),
        };
      }
    }
    return { ok: true, improved: true, before, record };
  }

  /** Erases every tribe's stars (Settings, and the unreadable recovery). */
  reset(): TribeStarsWriteResultV7 {
    if (this.#storage === null) return { ok: true };
    try {
      this.#storage.removeItem(TRIBE_STARS_STORAGE_KEY_V7);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        diagnostic: diagnosticV7("Unable to reset tribe records", error),
      };
    }
  }
}

function parseRecord(entry: unknown): TribeStarRecordV7 | null {
  if (!isRecord(entry) || !hasExactKeys(entry, RECORD_KEYS)) return null;
  const { stars, glow, bestRating, firstAt, updatedAt } = entry;
  if (
    (stars !== 1 && stars !== 2 && stars !== 3) ||
    typeof glow !== "boolean" ||
    typeof bestRating !== "number" ||
    !Number.isFinite(bestRating) ||
    bestRating < 0 ||
    typeof firstAt !== "string" ||
    !ISO_INSTANT_PATTERN.test(firstAt) ||
    typeof updatedAt !== "string" ||
    !ISO_INSTANT_PATTERN.test(updatedAt)
  )
    return null;
  return Object.freeze({ stars, glow, bestRating, firstAt, updatedAt });
}

function freezeStars(
  modes: Readonly<Record<string, Readonly<Record<string, TribeStarRecordV7>>>>,
): TribeStarsV7 {
  return Object.freeze({
    format: TRIBE_STARS_FORMAT_V7,
    version: 1,
    modes: Object.freeze(
      Object.fromEntries(
        sortedEntries(modes).map(([mode, tribes]) => [
          mode,
          Object.freeze(
            Object.fromEntries(
              sortedEntries(tribes).map(([faction, record]) => [
                faction,
                Object.freeze({ ...record }),
              ]),
            ),
          ),
        ]),
      ),
    ),
  });
}

function sortedEntries<T>(
  record: Readonly<Record<string, T>>,
): (readonly [string, T])[] {
  return Object.entries(record).sort(([left], [right]) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

function unreadable(diagnostic: string): TribeStarsLoadV7 {
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
