import type { StorageAdapter } from "../persistence/index";

/**
 * The sound preference (bead pulp_wars-2yc.10): on or off, and the master
 * volume. Like the art set and the board saturation it is a presentation
 * preference under its own key, so the shared exact-schema settings
 * envelope (also read by Ruleset 6) stays unchanged. It never enters a
 * save, a replay or the engine.
 */
export const AUDIO_SETTINGS_STORAGE_KEY_V1 = "pulpWars.audio.v1";

export interface AudioSettingsV1 {
  /** Sound is on by default; it starts with the player's first gesture. */
  readonly enabled: boolean;
  /** Master volume in percent, 0 to 100 in steps of 5. */
  readonly volume: number;
}

export const AUDIO_VOLUME_STEP_V1 = 5;

export const DEFAULT_AUDIO_SETTINGS_V1: AudioSettingsV1 = {
  enabled: true,
  volume: 70,
};

export function clampAudioVolumeV1(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value))
    return DEFAULT_AUDIO_SETTINGS_V1.volume;
  const stepped =
    Math.round(value / AUDIO_VOLUME_STEP_V1) * AUDIO_VOLUME_STEP_V1;
  return Math.min(100, Math.max(0, stepped));
}

/** A missing or malformed value becomes the default. */
export function parseStoredAudioSettingsV1(
  value: string | null,
): AudioSettingsV1 {
  if (value === null) return DEFAULT_AUDIO_SETTINGS_V1;
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null)
      return DEFAULT_AUDIO_SETTINGS_V1;
    const record = parsed as Readonly<Record<string, unknown>>;
    return {
      enabled:
        typeof record.enabled === "boolean"
          ? record.enabled
          : DEFAULT_AUDIO_SETTINGS_V1.enabled,
      volume: clampAudioVolumeV1(record.volume),
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS_V1;
  }
}

/** Restricted storage never prevents the app from mounting. */
export function loadAudioSettingsV1(
  storage: StorageAdapter | null,
): AudioSettingsV1 {
  try {
    return parseStoredAudioSettingsV1(
      storage?.getItem(AUDIO_SETTINGS_STORAGE_KEY_V1) ?? null,
    );
  } catch {
    return DEFAULT_AUDIO_SETTINGS_V1;
  }
}

/** Returns false when the value could not be stored. */
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
    return true;
  } catch {
    return false;
  }
}
