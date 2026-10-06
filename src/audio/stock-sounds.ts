import provenance from "./stock-sounds.json";

/**
 * The recorded sounds (beads pulp_wars-2yc.20 and pulp_wars-2yc.24,
 * docs/ui/SOUND.md "Stock recordings"). `stock-sounds.json` is the
 * provenance manifest and the one list of recordings: for each game sound
 * that has any, its candidates (the library file each was cut from, the
 * stretch that was cut and how it was processed) and which of them the
 * game plays by default. The sound manifest reads it to give those sounds
 * a file source (with the synthesised sound as the fallback),
 * `scripts/audio/cut-stock-sounds.ts` reads it to cut the clips, the
 * Gallery reads it to show where a sound comes from and to let a listener
 * compare the candidates, and `docs/audio/STOCK_SOUND_CHOICES.md` is
 * written from it.
 *
 * The clips are short stretches the game plays, under the game's own
 * names in `public/assets/audio/`. The library itself is not in the
 * repository.
 */

/** One recording that could play for a game sound. */
export interface StockSoundCandidateV1 {
  /**
   * Its number within the sound, from 1. It never changes once given (a
   * browser's stored pick and a pasted list of picks name it), so numbers
   * may have gaps after a candidate is removed.
   */
  readonly n: number;
  /** The clip's file name under the output folder. */
  readonly file: string;
  /** Which of the bundle's nine folders the library is in. */
  readonly part: number;
  /** The library's folder in the bundle: "Vendor - Library". */
  readonly library: string;
  /** The file in that folder, exactly as the bundle names it. */
  readonly originalFile: string;
  /** The stretch of the original that was cut, in seconds. */
  readonly startSeconds: number;
  readonly endSeconds: number;
  readonly fadeInMs: number;
  readonly fadeOutMs: number;
  /** A high-pass at this frequency was applied; 0 for none. */
  readonly highpassHz: number;
  /**
   * The level the clip is played at, 0 to 1. Every clip is stored at the
   * same peak; this sets its place in the game's mix.
   */
  readonly gain: number;
  /** Which event of the original the stretch is. */
  readonly take: string;
  /** Its character in a line, from the measurements: "brighter, shorter". */
  readonly note: string;
}

/** How sure the choice is; nobody listened while choosing. */
export type StockSoundConfidenceV1 = "high" | "medium" | "low";

/** A game sound that has at least one recording. */
export interface StockSoundV1 {
  /** The game sound (an id of `SOUND_IDS_V1`). */
  readonly id: string;
  /**
   * The candidate the game plays unless the browser has a pick of its
   * own: a candidate's `n`, or 0 for the generated sound (the recordings
   * are then only offered for comparison).
   */
  readonly default: number;
  readonly confidence: StockSoundConfidenceV1;
  /** Present when a person should listen to this sound before others. */
  readonly listenFirst?: string;
  /** Why these recordings were chosen for this sound. */
  readonly why: string;
  readonly candidates: readonly StockSoundCandidateV1[];
}

/** A candidate with the sound it belongs to. */
export interface StockSoundClipV1 extends StockSoundCandidateV1 {
  readonly id: string;
}

/** A game sound without any recording, and what would be needed. */
export interface StockSoundGeneratedV1 {
  readonly id: string;
  /** What was looked at and why nothing was taken. */
  readonly why: string;
  /** The kind of recording that would serve it. */
  readonly wanted: string;
}

export interface StockSoundOutputV1 {
  /** Where the clips are, from the repository root. */
  readonly folder: string;
  readonly sampleRate: number;
  readonly channels: number;
  /** The peak every clip is scaled to (0.708 is -3 dB). */
  readonly peak: number;
  readonly codec: string;
  readonly bitRate: number;
}

/** What a pick or a default of 0 means: the generated sound. */
export const STOCK_SOUND_GENERATED_CHOICE_V1 = 0;

export const STOCK_SOUND_BUNDLE_V1: string = provenance.bundle;
export const STOCK_SOUND_LICENCE_V1: string = provenance.licence;
export const STOCK_SOUND_OUTPUT_V1: StockSoundOutputV1 = provenance.output;

/** Every game sound that has recordings, in the manifest's order. */
export const STOCK_SOUNDS_V1: readonly StockSoundV1[] =
  provenance.sounds as unknown as readonly StockSoundV1[];

/** The sounds that stay generated, with the reason. */
export const STOCK_SOUND_GENERATED_V1: readonly StockSoundGeneratedV1[] =
  provenance.generated;

/** Every candidate of every sound. */
export const STOCK_SOUND_ALL_CLIPS_V1: readonly StockSoundClipV1[] =
  STOCK_SOUNDS_V1.flatMap((sound) =>
    sound.candidates.map((candidate) => ({ id: sound.id, ...candidate })),
  );

/**
 * The default clip of each sound whose default is a recording: what the
 * game fetches at its start and plays without a pick.
 */
export const STOCK_SOUND_CLIPS_V1: readonly StockSoundClipV1[] =
  STOCK_SOUND_ALL_CLIPS_V1.filter(
    (clip) => stockSoundV1(clip.id)?.default === clip.n,
  );

/** The recordings of a game sound, when it has any. */
export function stockSoundV1(id: string): StockSoundV1 | null {
  return STOCK_SOUNDS_V1.find((sound) => sound.id === id) ?? null;
}

/** One candidate of a game sound; null when there is no such candidate. */
export function stockSoundCandidateV1(
  id: string,
  n: number,
): StockSoundClipV1 | null {
  const candidate = stockSoundV1(id)?.candidates.find((entry) => entry.n === n);
  return candidate === undefined ? null : { id, ...candidate };
}

/** The default clip of a game sound, when its default is a recording. */
export function stockSoundClipV1(id: string): StockSoundClipV1 | null {
  const sound = stockSoundV1(id);
  return sound === null ? null : stockSoundCandidateV1(id, sound.default);
}

/** The folder the clips are served from, under the site's base. */
export const STOCK_SOUND_PUBLIC_PATH_V1 = "assets/audio/";

/** Where the browser fetches a clip. */
export function stockSoundUrlV1(clip: { readonly file: string }): string {
  const base =
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return `${base}${STOCK_SOUND_PUBLIC_PATH_V1}${clip.file}`;
}

/**
 * The master switch. False plays every sound from the synthesiser, as
 * before the recordings: no clip is fetched.
 */
export const STOCK_SOUNDS_ENABLED_V1 = true;

/** `?stock-sounds=0` (or `off`, `false`) turns the recordings off. */
export const STOCK_SOUNDS_PARAMETER_V1 = "stock-sounds";

export function stockSoundsEnabledV1(search?: string): boolean {
  const query =
    search ??
    (globalThis as { location?: { search?: string } }).location?.search ??
    "";
  let value: string | null;
  try {
    value = new URLSearchParams(query).get(STOCK_SOUNDS_PARAMETER_V1);
  } catch {
    value = null;
  }
  if (value === null) return STOCK_SOUNDS_ENABLED_V1;
  const text = value.trim().toLowerCase();
  if (text === "0" || text === "off" || text === "false") return false;
  if (text === "1" || text === "on" || text === "true") return true;
  return STOCK_SOUNDS_ENABLED_V1;
}
