import type { StorageAdapter } from "../persistence/index";

/**
 * The sound preference (beads pulp_wars-2yc.10 and pulp_wars-2yc.27): two
 * levels, each with its own on or off. **Sound** is the effects, **Music**
 * the themes. Like the art set and the board saturation they are
 * presentation preferences under their own keys, so the shared
 * exact-schema settings envelope (also read by Ruleset 6) stays unchanged.
 * They never enter a save, a replay or the engine.
 *
 * Sound keeps the key and the shape it had while it was the only level.
 * Music has a key of its own. A browser that stored a sound preference
 * before there was a music one starts with the same values for both, so a
 * player who had turned the sound down or off does not get music at
 * another level.
 */
export const AUDIO_SETTINGS_STORAGE_KEY_V1 = "pulpWars.audio.v1";
export const MUSIC_SETTINGS_STORAGE_KEY_V1 = "pulpWars.music.v1";

export interface AudioSettingsV1 {
  /** Sound effects are on by default; they start with the first gesture. */
  readonly enabled: boolean;
  /** The effects' volume in percent, 0 to 100 in steps of 5. */
  readonly volume: number;
  /** Music is on by default; it starts with the first gesture too. */
  readonly musicEnabled: boolean;
  /** The music's volume in percent, 0 to 100 in steps of 5. */
  readonly musicVolume: number;
}

export const AUDIO_VOLUME_STEP_V1 = 5;

export const DEFAULT_AUDIO_SETTINGS_V1: AudioSettingsV1 = {
  enabled: true,
  volume: 70,
  musicEnabled: true,
  musicVolume: 70,
};

export function clampAudioVolumeV1(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return DEFAULT_AUDIO_SETTINGS_V1.volume;
  const stepped =
    Math.round(value / AUDIO_VOLUME_STEP_V1) * AUDIO_VOLUME_STEP_V1;
  return Math.min(100, Math.max(0, stepped));
}

/** One stored level: `{"enabled": true, "volume": 70}`. */
interface StoredLevelV1 {
  readonly enabled: boolean;
  readonly volume: number;
}

/** Null for a missing or malformed value. */
function parseLevel(value: string | null): StoredLevelV1 | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Readonly<Record<string, unknown>>;
    return {
      enabled:
        typeof record.enabled === "boolean"
          ? record.enabled
          : DEFAULT_AUDIO_SETTINGS_V1.enabled,
      volume: clampAudioVolumeV1(record.volume),
    };
  } catch {
    return null;
  }
}

/**
 * The preference from its two stored values. A missing or malformed sound
 * value becomes the default. A missing or malformed music value takes the
 * sound's (the preference stored before music had its own), or the default
 * when there is no sound value either.
 */
export function parseStoredAudioSettingsV1(
  sound: string | null,
  music: string | null = null,
): AudioSettingsV1 {
  const effects = parseLevel(sound);
  const themes = parseLevel(music) ?? effects;
  return {
    enabled: effects?.enabled ?? DEFAULT_AUDIO_SETTINGS_V1.enabled,
    volume: effects?.volume ?? DEFAULT_AUDIO_SETTINGS_V1.volume,
    musicEnabled: themes?.enabled ?? DEFAULT_AUDIO_SETTINGS_V1.musicEnabled,
    musicVolume: themes?.volume ?? DEFAULT_AUDIO_SETTINGS_V1.musicVolume,
  };
}

/** Restricted storage never prevents the app from mounting. */
export function loadAudioSettingsV1(
  storage: StorageAdapter | null,
): AudioSettingsV1 {
  try {
    return parseStoredAudioSettingsV1(
      storage?.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1) ?? null,
      storage?.getItem(MUSIC_SETTINGS_STORAGE_KEY_V1) ?? null,
    );
  } catch {
    return DEFAULT_AUDIO_SETTINGS_V1;
  }
}

/**
 * Stores both levels, each under its key, so a later change of one never
 * reads as "no music preference yet". Returns false when a value could not
 * be stored.
 */
export function storeAudioSettingsV1(
  storage: StorageAdapter | null,
  settings: AudioSettingsV1,
): boolean {
  try {
    storage?.setItem(
      AUDIO_SETTINGS_STORAGE_KEY_V1,
      JSON.stringify({
        enabled: settings.enabled,
        volume: clampAudioVolumeV1(settings.volume),
      }),
    );
    storage?.setItem(
      MUSIC_SETTINGS_STORAGE_KEY_V1,
      JSON.stringify({
        enabled: settings.musicEnabled,
        volume: clampAudioVolumeV1(settings.musicVolume),
      }),
    );
    return true;
  } catch {
    return false;
  }
}
