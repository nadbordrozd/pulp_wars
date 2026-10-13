export const READINESS_PULSE_DURATION_MS = 1_600;

/** One cached silhouette outline layer, in destination CSS pixels. */
export interface ReadinessOutlineLayerV7 {
  /** Solid fill of the dilated silhouette band. */
  readonly color: string;
  /** Band thickness beyond the sprite silhouette. */
  readonly widthCssPx: number;
  /** Optional dark edge outside the band, for light terrain. */
  readonly rimColor: string | null;
  readonly rimCssPx: number;
  /** Soft glow around the outer edge; 0 draws none. */
  readonly blurCssPx: number;
  /** Composite opacity for this frame; the cached raster never changes. */
  readonly alpha: number;
}

export interface ReadinessUnitStyleV7 {
  /** Ready sprites stay opaque and unscaled in Ruleset 7. */
  readonly opacity: 1;
  readonly scale: 1;
  /** Drawn first, under the core: a wide soft pulsing aura. */
  readonly halo: ReadinessOutlineLayerV7;
  /** Drawn second: a crisp warm-white band with a dark outer rim. */
  readonly core: ReadinessOutlineLayerV7;
}

/** Warm white: brighter than every terrain and distinct from all owners. */
export const READINESS_V7_CORE_COLOR = "#fff6cf";
export const READINESS_V7_RIM_COLOR = "#2b1a00";
export const READINESS_V7_HALO_COLOR = "#ffc83d";
export const READINESS_V7_HIGH_CONTRAST_CORE_COLOR = "#ffffff";
export const READINESS_V7_HIGH_CONTRAST_RIM_COLOR = "#000000";

/**
 * Ruleset 7 readiness: a thick, unit-attached silhouette outline (warm-white
 * band, dark outer rim, gold aura) around the unchanged sprite. `pieceScale`
 * is the sprite's display scale (the CHIBI zoom step or the LEGACY camera
 * zoom); widths never fall below a legible floor at the smallest zoom. Only
 * the composite alphas animate, so each outline raster is cached once per
 * sprite size: the aura breathes on the shared 1.6-second loop and the band
 * stays nearly solid. Reduced motion is one static strong frame; high
 * contrast is a solid white band with a black rim.
 */
export function readinessUnitStyleV7(
  elapsedMs: number,
  reducedMotion: boolean,
  highContrast: boolean,
  pieceScale: number,
): ReadinessUnitStyleV7 {
  const scale = Math.max(0, pieceScale);
  // 0 at the turn boundary, 1 at the midpoint of the shared loop.
  const eased = reducedMotion ? 1 : readinessPulseEase(elapsedMs);
  const coreWidth = Math.max(3, 4 * scale);
  const rim = Math.max(1, (highContrast ? 2 : 1.5) * scale);
  const core: ReadinessOutlineLayerV7 = {
    color: highContrast
      ? READINESS_V7_HIGH_CONTRAST_CORE_COLOR
      : READINESS_V7_CORE_COLOR,
    widthCssPx: coreWidth,
    rimColor: highContrast
      ? READINESS_V7_HIGH_CONTRAST_RIM_COLOR
      : READINESS_V7_RIM_COLOR,
    rimCssPx: rim,
    blurCssPx: 0,
    alpha: highContrast ? 1 : 0.88 + 0.12 * eased,
  };
  const halo: ReadinessOutlineLayerV7 = {
    color: highContrast
      ? READINESS_V7_HIGH_CONTRAST_CORE_COLOR
      : READINESS_V7_HALO_COLOR,
    widthCssPx: coreWidth + rim,
    rimColor: null,
    rimCssPx: 0,
    blurCssPx: Math.max(highContrast ? 5 : 8, (highContrast ? 7 : 14) * scale),
    alpha: reducedMotion
      ? highContrast
        ? 0.7
        : 0.9
      : (highContrast ? 0.25 : 0.3) + (highContrast ? 0.55 : 0.7) * eased,
  };
  return { opacity: 1, scale: 1, halo, core };
}

function readinessPulseEase(elapsedMs: number): number {
  const phase =
    ((elapsedMs % READINESS_PULSE_DURATION_MS) + READINESS_PULSE_DURATION_MS) %
    READINESS_PULSE_DURATION_MS;
  return (
    (1 - Math.cos((phase / READINESS_PULSE_DURATION_MS) * Math.PI * 2)) / 2
  );
}
