import type { StorageAdapter } from "../persistence/index";
import {
  STOCK_SOUNDS_V1,
  STOCK_SOUND_GENERATED_CHOICE_V1,
  stockSoundCandidateV1,
  stockSoundV1,
} from "./stock-sounds";

/**
 * A listener's own choice among the recordings of a sound (bead
 * pulp_wars-2yc.24, docs/ui/SOUND.md "Choosing between recordings"). The
 * recordings were chosen without anyone hearing them, so where a sound has
 * several candidates the Gallery lets a person compare them and pick one.
 * A pick is kept in this browser only and changes what the game plays
 * here at once; the default everyone gets changes when the provenance
 * manifest does. The Gallery's "Copy my picks" hands the picks back to
 * the developer as text.
 *
 * Like the sound preference it is a presentation preference under its own
 * key, outside the shared settings envelope. It never enters a save, a
 * replay or the engine.
 */
export const STOCK_SOUND_PICKS_STORAGE_KEY_V1 = "pulpWars.stockSoundPicks.v1";

/**
 * Sound id to the chosen candidate's number, or 0 for the generated
 * sound. A sound without an entry plays its default.
 */
export type StockSoundPicksV1 = Readonly<Record<string, number>>;

/** Whether `n` can be chosen for the sound: a candidate of it, or 0. */
export function isStockSoundChoiceV1(id: string, n: unknown): n is number {
  if (typeof n !== "number" || !Number.isInteger(n)) return false;
  if (stockSoundV1(id) === null) return false;
  return (
    n === STOCK_SOUND_GENERATED_CHOICE_V1 ||
    stockSoundCandidateV1(id, n) !== null
  );
}

/**
 * The picks in a stored value. A missing or malformed value is no picks;
 * a pick for a sound that has no recordings, or of a candidate that no
 * longer exists, is dropped (that sound plays its default again).
 */
export function parseStockSoundPicksV1(
  value: string | null,
): StockSoundPicksV1 {
  if (value === null) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return {};
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return {};
  const picks: Record<string, number> = {};
  // In the manifest's order, whatever order they were stored in.
  for (const sound of STOCK_SOUNDS_V1) {
    const n = (parsed as Readonly<Record<string, unknown>>)[sound.id];
    if (isStockSoundChoiceV1(sound.id, n)) picks[sound.id] = n;
  }
  return picks;
}

/** Restricted storage never prevents the app from mounting. */
export function loadStockSoundPicksV1(
  storage: StorageAdapter | null,
): StockSoundPicksV1 {
  try {
    return parseStockSoundPicksV1(
      storage?.getItem(STOCK_SOUND_PICKS_STORAGE_KEY_V1) ?? null,
    );
  } catch {
    return {};
  }
}

/** Returns false when the picks could not be stored. */
export function storeStockSoundPicksV1(
  storage: StorageAdapter | null,
  picks: StockSoundPicksV1,
): boolean {
  try {
    const kept = parseStockSoundPicksV1(JSON.stringify(picks));
    if (Object.keys(kept).length === 0)
      storage?.removeItem(STOCK_SOUND_PICKS_STORAGE_KEY_V1);
    else
      storage?.setItem(STOCK_SOUND_PICKS_STORAGE_KEY_V1, JSON.stringify(kept));
    return true;
  } catch {
    return false;
  }
}

/**
 * What the sound plays with these picks: the picked candidate's number,
 * else the sound's default; 0 is the generated sound. Null for a sound
 * that has no recordings.
 */
export function stockSoundChoiceV1(
  id: string,
  picks: StockSoundPicksV1 = {},
): number | null {
  const sound = stockSoundV1(id);
  if (sound === null) return null;
  const pick = picks[id];
  return isStockSoundChoiceV1(id, pick) ? pick : sound.default;
}

/** One line of the picks summary. */
export interface StockSoundPickLineV1 {
  readonly id: string;
  /** The chosen candidate's number; 0 is the generated sound. */
  readonly pick: number;
  /** The sound's checked-in default, for comparison. */
  readonly default: number;
  /** "generated", or the library file the candidate was cut from. */
  readonly source: string;
}

export function stockSoundPickLinesV1(
  picks: StockSoundPicksV1,
): readonly StockSoundPickLineV1[] {
  const lines: StockSoundPickLineV1[] = [];
  for (const sound of STOCK_SOUNDS_V1) {
    const pick = picks[sound.id];
    if (!isStockSoundChoiceV1(sound.id, pick)) continue;
    const candidate = stockSoundCandidateV1(sound.id, pick);
    lines.push({
      id: sound.id,
      pick,
      default: sound.default,
      source:
        candidate === null
          ? "generated"
          : `${candidate.library} / ${candidate.originalFile}`,
    });
  }
  return lines;
}

/**
 * The picks as text to paste back to the developer: compact JSON, one
 * sound a line. `picks` is the part to apply (sound id to candidate
 * number, 0 for generated); `sources` repeats each pick in words, so a
 * number that has since moved can still be recognised.
 */
export function stockSoundPickSummaryV1(picks: StockSoundPicksV1): string {
  const lines = stockSoundPickLinesV1(picks);
  if (lines.length === 0) return '{"pulpWarsSoundPicks":1,"picks":{}}';
  const chosen = lines.map(
    (line) => `    ${JSON.stringify(line.id)}: ${line.pick}`,
  );
  const sources = lines.map(
    (line) =>
      `    ${JSON.stringify(line.id)}: ${JSON.stringify(
        `${line.pick === 0 ? "" : `#${line.pick} `}${line.source}${
          line.pick === line.default ? " (already the default)" : ""
        }`,
      )}`,
  );
  return [
    "{",
    '  "pulpWarsSoundPicks": 1,',
    '  "picks": {',
    chosen.join(",\n"),
    "  },",
    '  "sources": {',
    sources.join(",\n"),
    "  }",
    "}",
  ].join("\n");
}
