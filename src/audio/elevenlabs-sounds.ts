import manifest from "./elevenlabs-sounds.json";

/**
 * The game's sound effects generated with ElevenLabs (bead
 * pulp_wars-2yc.51, docs/audio/ELEVENLABS_SFX.md). For each game sound,
 * up to three takes chosen by measurement, and the one the game plays by
 * default; `scripts/audio/elevenlabs-sfx.ts` generated, measured and
 * encoded them and wrote this manifest. The prompts, the records of every
 * take and the measurements are in `docs/audio/`.
 *
 * The clips are in `public/assets/audio/` beside the stock recordings,
 * numbered from 101 (`impact-hit-102.m4a`), so a take's number never
 * meets a stock candidate's.
 */

/** One ElevenLabs take of a game sound. */
export interface ElevenLabsTakeV1 {
  /** Its candidate number, from 101. It never changes once given. */
  readonly n: number;
  /** The clip's file name under the output folder. */
  readonly file: string;
  /** The day it was generated. */
  readonly generated: string;
  /** The clip's length in seconds. */
  readonly seconds: number;
  /** The level the clip is played at, 0 to 1. */
  readonly gain: number;
  /**
   * True for a take that passed every measured rule. False only for a
   * sound none of whose takes passed: its best takes are offered to listen
   * to, and its old default stays.
   */
  readonly passed: boolean;
  /** What was asked for (without the style every prompt shares). */
  readonly prompt: string;
  /** Its character in a line, from the measurements. */
  readonly note: string;
}

export interface ElevenLabsSoundV1 {
  readonly id: string;
  /** The take the game plays; null when no take passed. */
  readonly default: number | null;
  readonly confidence: "high" | "medium" | "low";
  readonly takes: readonly ElevenLabsTakeV1[];
}

/** "ElevenLabs sound effects, generated 2026-10-14". */
export const ELEVENLABS_SOUND_PROVENANCE_V1: string = manifest.provenance;
export const ELEVENLABS_SOUND_MODEL_V1: string = manifest.model;

/** The first number an ElevenLabs take can have. */
export const ELEVENLABS_FIRST_TAKE_V1 = 101;

/** Every game sound with takes, in the manifest's order. */
export const ELEVENLABS_SOUNDS_V1: readonly ElevenLabsSoundV1[] =
  manifest.sounds as unknown as readonly ElevenLabsSoundV1[];

/** The takes of a game sound, when it has any. */
export function elevenLabsSoundV1(id: string): ElevenLabsSoundV1 | null {
  return ELEVENLABS_SOUNDS_V1.find((sound) => sound.id === id) ?? null;
}
