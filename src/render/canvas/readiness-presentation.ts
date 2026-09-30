import type { PlayerUnitView, PlayerView } from "../../engine/index";

export const READINESS_PULSE_DURATION_MS = 1_600;
export const READINESS_PULSE_MIN_OPACITY = 0.62;
export const READINESS_PULSE_MAX_SCALE = 1.08;

export interface ReadinessUnitStyleV6 {
  readonly opacity: number;
  readonly scale: number;
  readonly glow: {
    readonly color: string;
    readonly alpha: number;
    readonly blurCssPx: number;
  };
}

/**
 * Presentation-only eligibility. The filtered view is the sole source: no
 * authoritative state, command inference, or wall-clock value enters it.
 */
export function unitNeedsReadinessPulse(
  view: PlayerView,
  unit: PlayerUnitView,
): boolean {
  return (
    view.viewer.id === view.humanPlayerId &&
    view.turnOrder[view.activeSeatIndex] === view.viewer.id &&
    unit.ownerId === view.viewer.id &&
    unit.hp > 0 &&
    !unit.activation.handled
  );
}

/**
 * Shared 1.6-second ease-in-out cycle: 1 at the turn boundary, 0.62 at the
 * midpoint, and 1 at the next boundary. Reduced motion is fully opaque.
 */
export function readinessSpriteOpacity(
  elapsedMs: number,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 1;
  const phase =
    ((elapsedMs % READINESS_PULSE_DURATION_MS) + READINESS_PULSE_DURATION_MS) %
    READINESS_PULSE_DURATION_MS;
  const eased =
    (1 - Math.cos((phase / READINESS_PULSE_DURATION_MS) * Math.PI * 2)) / 2;
  return 1 - (1 - READINESS_PULSE_MIN_OPACITY) * eased;
}

/**
 * A unit-attached silhouette treatment. Full motion pairs the retained slow
 * opacity cycle with a modest anchor-preserving scale and glow rhythm. Reduced
 * motion keeps the same semantic state obvious with one strong static frame.
 */
export function readinessUnitStyleV6(
  elapsedMs: number,
  reducedMotion: boolean,
  highContrast: boolean,
): ReadinessUnitStyleV6 {
  if (reducedMotion) {
    return {
      opacity: 1,
      scale: 1.04,
      glow: {
        color: highContrast ? "#ffffff" : "#fff09a",
        alpha: 0.94,
        blurCssPx: highContrast ? 5 : 9,
      },
    };
  }
  const phase =
    ((elapsedMs % READINESS_PULSE_DURATION_MS) + READINESS_PULSE_DURATION_MS) %
    READINESS_PULSE_DURATION_MS;
  const eased =
    (1 - Math.cos((phase / READINESS_PULSE_DURATION_MS) * Math.PI * 2)) / 2;
  return {
    opacity: readinessSpriteOpacity(elapsedMs, false),
    scale: 1 + (READINESS_PULSE_MAX_SCALE - 1) * eased,
    glow: {
      color: highContrast ? "#ffffff" : "#fff09a",
      alpha: (highContrast ? 0.78 : 0.58) + (highContrast ? 0.2 : 0.34) * eased,
      blurCssPx: (highContrast ? 4 : 7) + (highContrast ? 2 : 5) * eased,
    },
  };
}

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
