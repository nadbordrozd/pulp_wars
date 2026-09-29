/**
 * Deterministic owner-mask extraction and mask QA for chibi assets
 * (docs/art/CHIBI_ART_DIRECTION.md section 4, bead pulp_wars-67q.2).
 *
 * Assets are generated with every owner area in one key colour (#d8262c).
 * The mask is the runtime's only owner selector: a pixel with alpha >= 128
 * in the checked-in mask PNG is recoloured by brightness relative to the key
 * (src/render/canvas/owner-recolour-v7.ts). Extraction therefore has to be
 * strict: a red-brown shield or boot that slips into the mask turns teal for
 * owner B, which is the failure the tile-80 test found.
 *
 * Everything here is pure: it reads RGBA bytes and returns masks and
 * reports, so tests can drive it with synthetic rasters.
 */

export interface Hsv {
  /** Degrees, 0 <= hue < 360. */
  readonly hue: number;
  readonly saturation: number;
  readonly value: number;
}

export function rgbToHsv(r: number, g: number, b: number): Hsv {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return {
    hue,
    saturation: max === 0 ? 0 : delta / max,
    value: max / 255,
  };
}

/** A hue interval in degrees; `from > to` wraps through 0. Bounds are inclusive. */
export interface HueBand {
  readonly from: number;
  readonly to: number;
}

export interface ColourBand {
  readonly hue: HueBand;
  readonly saturationMin: number;
  readonly valueMin: number;
}

function inHue(hue: number, band: HueBand): boolean {
  return band.from <= band.to
    ? hue >= band.from && hue <= band.to
    : hue >= band.from || hue <= band.to;
}

export function inColourBand(colour: Hsv, band: ColourBand): boolean {
  return (
    inHue(colour.hue, band.hue) &&
    colour.saturation >= band.saturationMin &&
    colour.value >= band.valueMin
  );
}

export type MaskQaCode =
  | "MASK_SIZE_MISMATCH"
  | "MASK_ON_TRANSPARENT"
  | "MASK_ON_RED_BROWN"
  | "MASK_ON_NON_KEY"
  | "MASK_EMBEDDED_IN_RED_BROWN"
  | "MASK_EMPTY"
  | "RED_BROWN_MATERIAL"
  | "COVERAGE_LOW"
  | "COVERAGE_HIGH";

/** Codes a reviewed, checked-in override may waive with a written reason. */
export const WAIVABLE_MASK_QA_CODES: readonly MaskQaCode[] = [
  "RED_BROWN_MATERIAL",
  "COVERAGE_LOW",
  "COVERAGE_HIGH",
];

/**
 * The strict thresholds. The key colour #d8262c is hue 357.8, saturation
 * 0.82, value 0.85; its flat-shaded shadow and highlight tones in the tile-80
 * Pixen sprites sit between hue 344 and 5. Red-brown materials (shield rims,
 * boots, bows) start just above that, around hue 7.5, so the owner band
 * stops at 5 and everything above 5 up to 15 degrees is treated as
 * red-brown. The tile-80 masks bled onto exactly that range (they took hue
 * <= 14); orange-browns above 15 degrees read as brown, not red.
 */
export const OWNER_MASK_THRESHOLDS = {
  /** A master pixel must be at least this opaque to carry owner colour. */
  alphaMin: 128,
  /** Extraction band: only these pixels become owner pixels automatically. */
  owner: {
    hue: { from: 340, to: 5 },
    saturationMin: 0.65,
    valueMin: 0.3,
  },
  /** Red-brown materials that must stay out of the mask. */
  redBrown: {
    hue: { from: 5.0001, to: 15 },
    saturationMin: 0.45,
    valueMin: 0.3,
  },
  /**
   * The widest band a hand-corrected override may select: shades of the key
   * colour only. Anything else in an override mask is rejected.
   */
  keyLike: {
    hue: { from: 335, to: 5 },
    saturationMin: 0.5,
    valueMin: 0.2,
  },
  /** Owner components smaller than this are speckle and are dropped. */
  minComponentPixels: 3,
  /**
   * A mask pixel with at least this many of its 8 neighbours in the
   * red-brown band sits inside a red-brown material: that is bleed.
   */
  embeddedNeighbourMin: 5,
  /**
   * Largest share of opaque pixels that may be red-brown material. A little
   * skin shading lands in the band; a red-brown shield, bow or boots does
   * not fit under 3% (the tile-80 Fighter and Marksman are 12% and 17%).
   */
  redBrownMaterialMaxShare: 0.03,
  /** Owner coverage of opaque pixels: hard limits and the direction's target. */
  coverage: { min: 0.15, targetMin: 0.2, targetMax: 0.4, max: 0.55 },
} as const satisfies {
  readonly alphaMin: number;
  readonly owner: ColourBand;
  readonly redBrown: ColourBand;
  readonly keyLike: ColourBand;
  readonly minComponentPixels: number;
  readonly embeddedNeighbourMin: number;
  readonly redBrownMaterialMaxShare: number;
  readonly coverage: {
    readonly min: number;
    readonly targetMin: number;
    readonly targetMax: number;
    readonly max: number;
  };
};

export type OwnerMaskThresholds = typeof OWNER_MASK_THRESHOLDS;

export interface RgbaRaster {
  readonly width: number;
  readonly height: number;
  /** width * height * 4 bytes, RGBA. */
  readonly data: Uint8Array | Uint8ClampedArray;
}

/** One byte per pixel: 1 = owner pixel, 0 = keep. */
export interface BinaryMask {
  readonly width: number;
  readonly height: number;
  readonly bits: Uint8Array;
}

function pixelHsv(raster: RgbaRaster, index: number): Hsv {
  const offset = index * 4;
  return rgbToHsv(
    raster.data[offset] ?? 0,
    raster.data[offset + 1] ?? 0,
    raster.data[offset + 2] ?? 0,
  );
}

function opaque(
  raster: RgbaRaster,
  index: number,
  thresholds: OwnerMaskThresholds,
): boolean {
  return (raster.data[index * 4 + 3] ?? 0) >= thresholds.alphaMin;
}

/** 8-connected components of set bits, in scan order. */
function components(mask: BinaryMask): number[][] {
  const { width, height, bits } = mask;
  const seen = new Uint8Array(bits.length);
  const result: number[][] = [];
  for (let start = 0; start < bits.length; start += 1) {
    if (bits[start] !== 1 || seen[start] === 1) continue;
    const component: number[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const index = stack.pop() ?? 0;
      component.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const next = ny * width + nx;
          if (bits[next] === 1 && seen[next] === 0) {
            seen[next] = 1;
            stack.push(next);
          }
        }
    }
    result.push(component.sort((a, b) => a - b));
  }
  return result;
}

export interface ExtractedOwnerMask {
  readonly mask: BinaryMask;
  /** Pixels in the owner band dropped as speckle components. */
  readonly speckleDropped: number;
}

/** Strict, deterministic extraction: the owner colour band, minus speckle. */
export function extractOwnerMask(
  raster: RgbaRaster,
  thresholds: OwnerMaskThresholds = OWNER_MASK_THRESHOLDS,
): ExtractedOwnerMask {
  const bits = new Uint8Array(raster.width * raster.height);
  for (let index = 0; index < bits.length; index += 1)
    if (
      opaque(raster, index, thresholds) &&
      inColourBand(pixelHsv(raster, index), thresholds.owner)
    )
      bits[index] = 1;
  const mask = { width: raster.width, height: raster.height, bits };
  let speckleDropped = 0;
  for (const component of components(mask))
    if (component.length < thresholds.minComponentPixels) {
      speckleDropped += component.length;
      for (const index of component) bits[index] = 0;
    }
  return { mask, speckleDropped };
}

export interface MaskQaIssue {
  readonly code: MaskQaCode;
  readonly detail: string;
  /** Set when a checked-in override waived this code with a reason. */
  readonly waived?: true;
}

export interface MaskQaReport {
  readonly status: "PASS" | "FAIL";
  readonly opaquePixels: number;
  readonly ownerPixels: number;
  /** Owner pixels / opaque pixels, 0..1, rounded to 4 decimals. */
  readonly coverage: number;
  /** True when coverage is inside the direction's 20-40% target. */
  readonly coverageOnTarget: boolean;
  readonly redBrownPixels: number;
  readonly maskOnTransparent: number;
  readonly maskOnRedBrown: number;
  readonly maskOnNonKey: number;
  readonly maskEmbeddedInRedBrown: number;
  readonly failures: readonly MaskQaIssue[];
  readonly warnings: readonly MaskQaIssue[];
}

export interface MaskQaOptions {
  /** Owned assets need a non-empty mask inside the coverage limits. */
  readonly owned: boolean;
  /** Codes a reviewed override waives; only WAIVABLE_MASK_QA_CODES count. */
  readonly waive?: readonly string[];
  readonly thresholds?: OwnerMaskThresholds;
}

const round4 = (value: number): number => Math.round(value * 10_000) / 10_000;

/**
 * Checks a mask (automatic or hand-corrected) against its master. Failures
 * reject the asset; waived failures and off-target coverage are warnings.
 */
export function ownerMaskQa(
  raster: RgbaRaster,
  mask: BinaryMask,
  options: MaskQaOptions,
): MaskQaReport {
  const thresholds = options.thresholds ?? OWNER_MASK_THRESHOLDS;
  const issues: MaskQaIssue[] = [];
  if (mask.width !== raster.width || mask.height !== raster.height)
    return {
      status: "FAIL",
      opaquePixels: 0,
      ownerPixels: 0,
      coverage: 0,
      coverageOnTarget: false,
      redBrownPixels: 0,
      maskOnTransparent: 0,
      maskOnRedBrown: 0,
      maskOnNonKey: 0,
      maskEmbeddedInRedBrown: 0,
      failures: [
        {
          code: "MASK_SIZE_MISMATCH",
          detail: `mask ${mask.width}x${mask.height} differs from master ${raster.width}x${raster.height}`,
        },
      ],
      warnings: [],
    };
  const count = raster.width * raster.height;
  const redBrown = new Uint8Array(count);
  let opaquePixels = 0;
  let ownerPixels = 0;
  let redBrownPixels = 0;
  let maskOnTransparent = 0;
  let maskOnRedBrown = 0;
  let maskOnNonKey = 0;
  for (let index = 0; index < count; index += 1) {
    const isOpaque = opaque(raster, index, thresholds);
    const colour = pixelHsv(raster, index);
    if (isOpaque) opaquePixels += 1;
    if (isOpaque && inColourBand(colour, thresholds.redBrown)) {
      redBrown[index] = 1;
      if (mask.bits[index] !== 1) redBrownPixels += 1;
    }
    if (mask.bits[index] !== 1) continue;
    if (!isOpaque) {
      maskOnTransparent += 1;
      continue;
    }
    ownerPixels += 1;
    if (redBrown[index] === 1) maskOnRedBrown += 1;
    else if (!inColourBand(colour, thresholds.keyLike)) maskOnNonKey += 1;
  }
  let maskEmbeddedInRedBrown = 0;
  for (let index = 0; index < count; index += 1) {
    if (mask.bits[index] !== 1) continue;
    const x = index % raster.width;
    const y = Math.floor(index / raster.width);
    let neighbours = 0;
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= raster.width || ny >= raster.height)
          continue;
        if (redBrown[ny * raster.width + nx] === 1) neighbours += 1;
      }
    if (neighbours >= thresholds.embeddedNeighbourMin)
      maskEmbeddedInRedBrown += 1;
  }
  const coverage = opaquePixels === 0 ? 0 : ownerPixels / opaquePixels;
  const redBrownShare = opaquePixels === 0 ? 0 : redBrownPixels / opaquePixels;
  if (maskOnTransparent > 0)
    issues.push({
      code: "MASK_ON_TRANSPARENT",
      detail: `${maskOnTransparent} mask pixels lie on transparent master pixels`,
    });
  if (maskOnRedBrown > 0)
    issues.push({
      code: "MASK_ON_RED_BROWN",
      detail: `${maskOnRedBrown} mask pixels are red-brown material (bleed)`,
    });
  if (maskOnNonKey > 0)
    issues.push({
      code: "MASK_ON_NON_KEY",
      detail: `${maskOnNonKey} mask pixels are not a shade of the key colour`,
    });
  if (maskEmbeddedInRedBrown > 0)
    issues.push({
      code: "MASK_EMBEDDED_IN_RED_BROWN",
      detail: `${maskEmbeddedInRedBrown} mask pixels sit inside red-brown material (bleed)`,
    });
  if (redBrownShare > thresholds.redBrownMaterialMaxShare)
    issues.push({
      code: "RED_BROWN_MATERIAL",
      detail: `${redBrownPixels} red-brown pixels (${(redBrownShare * 100).toFixed(1)}% of opaque) next to the key colour; use browns that are clearly not red`,
    });
  if (options.owned) {
    if (ownerPixels === 0)
      issues.push({
        code: "MASK_EMPTY",
        detail: "owned asset has no owner pixels",
      });
    else if (coverage < thresholds.coverage.min)
      issues.push({
        code: "COVERAGE_LOW",
        detail: `owner coverage ${(coverage * 100).toFixed(1)}% is below ${thresholds.coverage.min * 100}%`,
      });
    else if (coverage > thresholds.coverage.max)
      issues.push({
        code: "COVERAGE_HIGH",
        detail: `owner coverage ${(coverage * 100).toFixed(1)}% is above ${thresholds.coverage.max * 100}%`,
      });
  }
  const waive = new Set(
    (options.waive ?? []).filter((code) =>
      (WAIVABLE_MASK_QA_CODES as readonly string[]).includes(code),
    ),
  );
  const failures = issues.filter((issue) => !waive.has(issue.code));
  const warnings: MaskQaIssue[] = issues
    .filter((issue) => waive.has(issue.code))
    .map((issue) => ({ ...issue, waived: true }));
  const coverageOnTarget =
    coverage >= thresholds.coverage.targetMin &&
    coverage <= thresholds.coverage.targetMax;
  return {
    status: failures.length === 0 ? "PASS" : "FAIL",
    opaquePixels,
    ownerPixels,
    coverage: round4(coverage),
    coverageOnTarget,
    redBrownPixels,
    maskOnTransparent,
    maskOnRedBrown,
    maskOnNonKey,
    maskEmbeddedInRedBrown,
    failures,
    warnings,
  };
}

/** Mask PNG pixels: owner pixels are opaque key colour, the rest transparent. */
export function maskToRgba(mask: BinaryMask): Uint8Array {
  const data = new Uint8Array(mask.width * mask.height * 4);
  for (let index = 0; index < mask.bits.length; index += 1) {
    if (mask.bits[index] !== 1) continue;
    data[index * 4] = 0xd8;
    data[index * 4 + 1] = 0x26;
    data[index * 4 + 2] = 0x2c;
    data[index * 4 + 3] = 255;
  }
  return data;
}

/** The runtime contract: a mask pixel with alpha >= 128 is an owner pixel. */
export function rgbaToMask(raster: RgbaRaster): BinaryMask {
  const bits = new Uint8Array(raster.width * raster.height);
  for (let index = 0; index < bits.length; index += 1)
    if ((raster.data[index * 4 + 3] ?? 0) >= 128) bits[index] = 1;
  return { width: raster.width, height: raster.height, bits };
}
