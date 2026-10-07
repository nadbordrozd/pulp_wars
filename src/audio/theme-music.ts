import manifest from "./theme-music.json";

/**
 * The theme music's files (bead pulp_wars-2yc.27, docs/ui/SOUND.md "Theme
 * music"). `theme-music.json` is written by
 * `scripts/audio/encode-themes.ts` from the masters: for each theme its
 * encoded file, how loud the master measured, the level it is therefore
 * played at, and how far before its end the next pass of its loop starts.
 * The sound manifest reads it to register the themes; the documentation's
 * records and the size test read it too.
 *
 * The masters are not in the repository.
 */

export interface ThemeMusicTrackV1 {
  /** The theme's id: "theme.undead", "theme.title". */
  readonly id: string;
  /** The faction it belongs to; null for the title theme. */
  readonly faction: string | null;
  /** The encoded file under the themes folder. */
  readonly file: string;
  /** The master it was encoded from, as its author named it. */
  readonly master: string;
  /** The prompt entry and version it was generated from. */
  readonly prompt: string;
  readonly masterSeconds: number;
  /** Silence cut from the start and the end of the master, in seconds. */
  readonly headTrimSeconds: number;
  readonly tailTrimSeconds: number;
  /** Length of the encoded theme, in seconds. */
  readonly seconds: number;
  /** Integrated loudness (LUFS) and peak (dBFS) of the trimmed master. */
  readonly lufs: number;
  readonly peakDb: number;
  /** The level it is played at, so every theme is equally loud. */
  readonly gain: number;
  /** How far before its end the next pass of the loop starts, in seconds. */
  readonly loopOverlapSeconds: number;
  /** The level of its last 50 ms, in dBFS. */
  readonly endLevelDb: number;
  readonly bytes: number;
}

export interface ThemeMusicOutputV1 {
  /** Where the files are, from the repository root. */
  readonly folder: string;
  readonly codec: string;
  readonly channels: number;
  readonly sampleRate: number;
  readonly bitRate: number;
  /** The loudness every theme is brought to by its `gain`. */
  readonly targetLufs: number;
}

export const THEME_MUSIC_OUTPUT_V1: ThemeMusicOutputV1 = {
  folder: manifest.folder,
  codec: manifest.codec,
  channels: manifest.channels,
  sampleRate: manifest.sampleRate,
  bitRate: manifest.bitRate,
  targetLufs: manifest.targetLufs,
};

/** Every encoded theme, in the order of the factions, the title last. */
export const THEME_MUSIC_TRACKS_V1: readonly ThemeMusicTrackV1[] =
  manifest.tracks;

/** The folder the themes are served from, under the site's base. */
export const THEME_MUSIC_PUBLIC_PATH_V1 = "assets/audio/themes/";

/** Where the browser fetches a theme. */
export function themeMusicUrlV1(track: { readonly file: string }): string {
  const base =
    (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? "/";
  return `${base}${THEME_MUSIC_PUBLIC_PATH_V1}${track.file}`;
}
