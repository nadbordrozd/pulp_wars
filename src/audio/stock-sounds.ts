import provenance from "./stock-sounds.json";

/**
 * The recorded sounds (bead pulp_wars-2yc.20, docs/ui/SOUND.md "Stock
 * recordings"). `stock-sounds.json` is the provenance manifest and the one
 * list of recordings: for each game sound that has one, the library file
 * it was cut from, the stretch that was cut and how it was processed. The
 * sound manifest reads it to give those sounds a file source (with the
 * synthesised sound as the fallback), `scripts/audio/cut-stock-sounds.ts`
 * reads it to cut the clips, and the Gallery reads it to show where a
 * sound comes from.
 *
 * The clips are short stretches the game plays, under the game's own
 * names in `public/assets/audio/`. The library itself is not in the
 * repository.
 */
export interface StockSoundClipV1 {
  /** The game sound it replaces (an id of `SOUND_IDS_V1`). */
  readonly id: string;
  /** The clip's file name under the output folder. */
  readonly file: string;
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
  /** Why this recording was chosen for this sound. */
  readonly why: string;
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

export const STOCK_SOUND_BUNDLE_V1: string = provenance.bundle;
export const STOCK_SOUND_LICENCE_V1: string = provenance.licence;
export const STOCK_SOUND_OUTPUT_V1: StockSoundOutputV1 = provenance.output;
export const STOCK_SOUND_CLIPS_V1: readonly StockSoundClipV1[] =
  provenance.clips;

/** The clip of a game sound, when it has a recording. */
export function stockSoundClipV1(id: string): StockSoundClipV1 | null {
  return STOCK_SOUND_CLIPS_V1.find((clip) => clip.id === id) ?? null;
}

/** The folder the clips are served from, under the site's base. */
export const STOCK_SOUND_PUBLIC_PATH_V1 = "assets/audio/";

/** Where the browser fetches a clip. */
export function stockSoundUrlV1(clip: StockSoundClipV1): string {
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
