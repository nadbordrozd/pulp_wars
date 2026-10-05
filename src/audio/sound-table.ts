import {
  SOUND_IDS_V1,
  SOUND_MANIFEST_V1,
  soundRecipeV1,
  type SoundCategoryV1,
  type SoundIdV1,
} from "./sound-manifest";
import { synthRecipeDurationMsV1, type SynthWaveV1 } from "./synth";

/**
 * One row per sound for docs/ui/SOUND.md and the sound test (bead
 * pulp_wars-2yc.10): what the recipe is made of, in plain numbers. A unit
 * test checks the document's table against these rows, so the two cannot
 * drift apart.
 */
export interface SoundTableRowV1 {
  readonly id: SoundIdV1;
  readonly label: string;
  readonly category: SoundCategoryV1;
  /** "synth" or "file". */
  readonly source: string;
  /** The layers' waveforms, most used first, e.g. "square + triangle". */
  readonly waves: string;
  /** Lowest to highest pitch of the tonal layers in Hz, or "noise only". */
  readonly pitch: string;
  readonly durationMs: number;
  readonly peak: number;
}

export function soundTableRowsV1(): readonly SoundTableRowV1[] {
  return SOUND_IDS_V1.map((id) => {
    const entry = SOUND_MANIFEST_V1[id];
    const recipe = soundRecipeV1(id);
    const counts = new Map<SynthWaveV1, number>();
    let low = Infinity;
    let high = 0;
    for (const layer of recipe?.layers ?? []) {
      counts.set(layer.wave, (counts.get(layer.wave) ?? 0) + 1);
      if (layer.wave === "noise" || layer.hz === undefined) continue;
      low = Math.min(low, layer.hz, layer.hzEnd ?? layer.hz);
      high = Math.max(high, layer.hz, layer.hzEnd ?? layer.hz);
    }
    return {
      id,
      label: entry.label,
      category: entry.category,
      source: entry.source.kind === "SYNTH" ? "synth" : "file",
      waves: [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([wave]) => wave)
        .join(" + "),
      pitch:
        high === 0
          ? "noise only"
          : Math.round(low) === Math.round(high)
            ? `${Math.round(low)}`
            : `${Math.round(low)}–${Math.round(high)}`,
      durationMs:
        recipe === null ? 0 : Math.round(synthRecipeDurationMsV1(recipe)),
      peak: recipe?.peak ?? 0,
    };
  });
}

/** The Markdown table body of docs/ui/SOUND.md (one line per sound). */
export function soundTableMarkdownV1(): readonly string[] {
  return soundTableRowsV1().map(
    (row) =>
      `| \`${row.id}\` | ${row.label} | ${row.category} | ${row.waves} | ${row.pitch} | ${row.durationMs} | ${row.peak} |`,
  );
}
