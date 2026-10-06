import {
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  SOUND_THEMES_V1,
  type SoundCategoryV1,
  type SoundIdV1,
  type SoundKeyV1,
  type SoundSourceV1,
} from "./sound-manifest";
import type { SynthRecipeV1 } from "./synth";

/**
 * What the mixer and the device need to know to play a manifest entry,
 * whether it is an effect (`SOUND_MANIFEST_V1`) or a faction theme
 * (`SOUND_THEMES_V1`, bead pulp_wars-2yc.19). A theme is music: it is never
 * detuned, it keeps its voice like a tune, and it may loop.
 */
export interface PlayableSoundV1 {
  readonly id: SoundKeyV1;
  readonly category: SoundCategoryV1;
  readonly priority: 1 | 2 | 3;
  readonly jitterCents: number;
  /** Repeats until stopped. */
  readonly loop: boolean;
  readonly source: SoundSourceV1;
}

function isEffectId(id: string): id is SoundIdV1 {
  return (SOUND_IDS_V1 as readonly string[]).includes(id);
}

/** Null for an id that is in neither list. */
export function playableSoundV1(id: SoundKeyV1): PlayableSoundV1 | null {
  if (isEffectId(id)) {
    const entry = SOUND_MANIFEST_V1[id];
    return {
      id,
      category: entry.category,
      priority: entry.priority,
      jitterCents: entry.jitterCents,
      loop: false,
      source: entry.source,
    };
  }
  const theme = SOUND_THEMES_V1.find((entry) => entry.id === id);
  if (theme === undefined) return null;
  return {
    id: theme.id,
    category: "music",
    priority: 3,
    jitterCents: 0,
    loop: theme.loop,
    source: theme.source,
  };
}

/** Every effect, then every theme. */
export function playableSoundIdsV1(): readonly SoundKeyV1[] {
  return [...SOUND_IDS_V1, ...SOUND_THEMES_V1.map((theme) => theme.id)];
}

/** The synth recipe a sound plays when no recording is available. */
export function playableRecipeV1(id: SoundKeyV1): SynthRecipeV1 | null {
  const source = playableSoundV1(id)?.source;
  if (source === undefined) return null;
  return source.kind === "SYNTH" ? source.recipe : (source.fallback ?? null);
}
