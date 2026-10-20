/**
 * The `remap` derivation step (bead pulp_wars-mch9.59): a deterministic,
 * lightness-keyed palette remap applied after the class derivation and the
 * accent step, for a faction whose colours change after its art is accepted.
 *
 * It was proven by the Cult colour samples of bead pulp_wars-mch9.58
 * (scripts/art/cult-palette-mch958/recolour.ts), of which the user chose
 * option 1, royal purple + aquamarine (2026-10-20: "go with cultists color
 * scheme 1."). Every pixel is classified by colour (and, per asset, by a few
 * boxes that protect a face line, a bloody blade or a prop), and each class
 * goes through a ramp of the palette keyed by the source pixel's CIE L*, so
 * the shading of the drawn pixels is kept and every other material (skin,
 * blood, steel, wood, stone, cream, brass, the summoned teal) keeps its
 * exact pixels:
 *
 * - **robed** (the robed cultists, their busts and the campaign picture):
 *   the crimson cloth goes through `main`, the deep purple second cloth
 *   through `dark`, the gold embroidery through `trim` (props boxed off) and
 *   the green flames and sparks through `glow`.
 * - **lodge** (the cities, buildings, Monuments, ships, the Familiar, the
 *   Herald, lodge icons): the indigo shingles, hulls, sails, drapes and
 *   bodies go through `main`, the eldritch green windows and lanterns
 *   through `glow` (unless the asset says `noGlow`).
 *
 * Palette 1's tweak (bead pulp_wars-mch9.60, preset `cult-royal-teal`) adds
 * two classes the lodge rules can ask for:
 *
 * - **summon** (`body: "summon"`): the indigo goes through the summoned
 *   teal instead of the purple (the Familiar, which the user wanted the
 *   colour of the other summons);
 * - **wood** (`wood` boxes): inside the boxes the indigo goes through a
 *   warm wood ramp (the hulls of the Galleon, the Gondola and the barge,
 *   whose sails, banners and sigils stay purple).
 *
 * The preset is named in the batch manifest (`remap.preset`, with the
 * asset's `remap.rules`), stored whole in the asset record, and
 * `art:validate` re-derives the master from the recorded candidate through
 * the class derivation, the accent and this step, so the master is never a
 * hand-made file.
 */
import { rgbToHsv, type RgbaRaster } from "./owner-mask";

type Rgb = readonly [number, number, number];
type Lab = readonly [number, number, number];

/** A ramp stop: the source L* it answers and the colour it gives. */
export type RemapStop = readonly [number, string];

export interface RemapPalette {
  /** The main colour as one swatch, for documents and sheets. */
  readonly main: string;
  /** The accent colour as one swatch. */
  readonly accent: string;
  /** Robe crimson and lodge indigo, by the source pixel's L*. */
  readonly ramp: readonly RemapStop[];
  /** The robes' deep purple second cloth. */
  readonly dark: readonly RemapStop[];
  /** The robes' gold embroidery. */
  readonly trim: readonly RemapStop[];
  /** The eldritch green lights. */
  readonly glow: readonly RemapStop[];
  /** The summoned teal, for a lodge body that is a summon (`body`). */
  readonly summon?: readonly RemapStop[];
  /** Hull wood, for the indigo inside a lodge asset's `wood` boxes. */
  readonly wood?: readonly RemapStop[];
  /**
   * The value from which a strongly saturated green (0.6 and more) is a
   * light too: the dark green rim of a flame or a lamp, which the default
   * 0.45 leaves green beside the remapped light.
   */
  readonly glowMinValue?: number;
  /**
   * Colours no remapped pixel may come near (RGB distance under
   * `avoidDistance`): the four player colours of owner recolouring
   * (RULESET7_PLAYER_COLORS), which the aquamarine and the light purple
   * pass close to. A ramp colour that would is taken a little darker (the
   * source L* lowered step by step) until it is clear.
   */
  readonly avoid: readonly string[];
  readonly avoidDistance: number;
}

export interface RemapBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Inside `box`, a colour of this hue window is cloth too. */
export interface RemapExtend {
  readonly box: RemapBox;
  readonly hue: readonly [number, number];
  readonly minSaturation: number;
  readonly maxValue: number;
}

/** The asset's own classifier settings, in the batch manifest. */
export interface RemapRules {
  readonly kind: "robed" | "lodge";
  /** Exact colours (#rrggbb) the rule takes that are not cloth. */
  readonly keep?: readonly string[];
  /** Boxes never touched: bloody blades, face lines, an eye. */
  readonly protect?: readonly RemapBox[];
  /** Boxes where gold is a prop, not embroidery (robed only). */
  readonly props?: readonly RemapBox[];
  /** Hue window of the deep purple cloth when not 268 to 315. */
  readonly secondaryHue?: readonly [number, number];
  /** A cloth the crimson rule does not reach (the Summoner's rust hood). */
  readonly extend?: readonly RemapExtend[];
  /** Green that is not a light, or a light that keeps the faction green. */
  readonly noGlow?: boolean;
  /** The lodge hue window when not 222 to 268 (the Familiar's pale blue). */
  readonly lodgeHue?: readonly [number, number];
  /** The lodge indigo is a summon's body: the `summon` ramp (lodge only). */
  readonly body?: "summon";
  /** Boxes where the lodge indigo is a hull: the `wood` ramp (lodge only). */
  readonly wood?: readonly RemapBox[];
}

/** The manifest's `remap` field. */
export interface RemapSpec {
  readonly preset: string;
  readonly rules: RemapRules;
}

export const REMAP_PRESETS = {
  /**
   * The Cult's palette 1 (bead pulp_wars-mch9.58, chosen 2026-10-20):
   * plum-royal purple cloth, roofs and hulls; the deep purple second cloth
   * goes near-black; aquamarine trim, flames, windows and lanterns, lifted
   * above the summons' teal (#2c7e7d, L* 47) so the trim is a light mint
   * line on the purple and the summoned a mid teal body.
   */
  "cult-royal-aqua": {
    main: "#6a2f93",
    accent: "#4fe3c1",
    ramp: [
      [0, "#0c0612"],
      [10, "#1f0e2e"],
      [18, "#33184b"],
      [26, "#4a2269"],
      [34, "#62308a"],
      [44, "#7f43ab"],
      [56, "#a266cc"],
      [70, "#c79be3"],
    ],
    dark: [
      [0, "#060508"],
      [10, "#121016"],
      [20, "#1e1b24"],
      [30, "#2e2a36"],
      [45, "#48424f"],
    ],
    trim: [
      [15, "#124a42"],
      [30, "#22836f"],
      [45, "#3dbb9e"],
      [60, "#66dec2"],
      [75, "#9cf3dd"],
      [90, "#d4fff4"],
    ],
    glow: [
      [30, "#0f5f53"],
      [50, "#22a58e"],
      [65, "#3fd6b7"],
      [80, "#7af2d6"],
      [92, "#c8fff2"],
    ],
    avoid: ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"],
    avoidDistance: 14,
  },
  /**
   * Palette 1 as the user tweaked it (bead pulp_wars-mch9.60, 2026-10-20:
   * "make the familiar match the color of the other summons and have the
   * accents on the robes match that hue as well ... the purple body of the
   * cultist galleon and gondola is slightly nonsensical. make it wood
   * colored"). The purple and the near-black are `cult-royal-aqua`'s. The
   * accent is the summons' teal instead of the light mint: the trim and
   * the lights keep the mint's lightness (so a lit line still reads on the
   * purple) but take the summoned bodies' CIE hue (h 185 to 208, darker
   * stops bluer as the summons' shading is) and their chroma (about 30,
   * not the mint's 40 to 46). `summon` is the summons' own ramp, measured
   * on the Imp, the Horror, the Gibbering Mass, the Tentacle and the
   * Thing (the Imp's body #2f9194 at L* 55, its shade #245e66 at L* 37);
   * `wood` a warm brown (CIE hue 45 to 68) a step darker than the ships'
   * gold rails. The dark green rim of a flame or a lamp (saturation 0.6,
   * value 0.15 and more) is a light too (`glowMinValue`), so no green
   * outline is left round a teal flame.
   */
  "cult-royal-teal": {
    main: "#6a2f93",
    accent: "#46ada9",
    ramp: [
      [0, "#0c0612"],
      [10, "#1f0e2e"],
      [18, "#33184b"],
      [26, "#4a2269"],
      [34, "#62308a"],
      [44, "#7f43ab"],
      [56, "#a266cc"],
      [70, "#c79be3"],
    ],
    dark: [
      [0, "#060508"],
      [10, "#121016"],
      [20, "#1e1b24"],
      [30, "#2e2a36"],
      [45, "#48424f"],
    ],
    trim: [
      [15, "#1b464a"],
      [30, "#287b7c"],
      [45, "#46ada9"],
      [60, "#6cd1c9"],
      [75, "#a6ede3"],
      [90, "#dbfaf5"],
    ],
    glow: [
      [12, "#073639"],
      [30, "#176163"],
      [50, "#369f9c"],
      [65, "#5acdc4"],
      [80, "#92ede2"],
      [92, "#d4fcf5"],
    ],
    summon: [
      [0, "#061619"],
      [10, "#0c252b"],
      [22, "#19484e"],
      [30, "#255f65"],
      [37, "#2d7d7d"],
      [44, "#2f9496"],
      [52, "#43aaa7"],
      [62, "#59c7bd"],
      [72, "#83dfd4"],
      [84, "#afefe5"],
    ],
    wood: [
      [0, "#150c08"],
      [10, "#2a170f"],
      [18, "#412215"],
      [26, "#562f1b"],
      [34, "#6b3e23"],
      [44, "#845231"],
      [56, "#a36d44"],
      [70, "#c49160"],
    ],
    glowMinValue: 0.15,
    avoid: ["#f06762", "#28b7a4", "#e2b63f", "#a277d2"],
    avoidDistance: 14,
  },
} as const satisfies Readonly<Record<string, RemapPalette>>;

export type RemapPresetName = keyof typeof REMAP_PRESETS;

export function remapPreset(name: string): RemapPalette | undefined {
  return Object.hasOwn(REMAP_PRESETS, name)
    ? REMAP_PRESETS[name as RemapPresetName]
    : undefined;
}

export type RemapKind = "main" | "dark" | "trim" | "glow" | "summon" | "wood";

const hexOf = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

const rgbOf = (hex: string): Rgb => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const toLinear = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

/** CIE L*a*b* (D65) of an sRGB colour. */
export function labOf(rgb: Rgb): Lab {
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** sRGB from CIE L*a*b* (D65), the inverse of `labOf`. */
export function rgbOfLab([l, a, b]: Lab): Rgb {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const inv = (t: number): number =>
    t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787;
  const x = inv(fx) * 0.95047;
  const y = inv(fy);
  const z = inv(fz) * 1.08883;
  const lin = [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ];
  const srgb = lin.map((c) => {
    const v = Math.max(0, Math.min(1, c));
    return Math.round(
      255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055),
    );
  });
  return [srgb[0] ?? 0, srgb[1] ?? 0, srgb[2] ?? 0];
}

/** The ramp's colour for a source L*, interpolated in L*a*b*. */
export function rampAt(stops: readonly RemapStop[], sourceL: number): Rgb {
  const labs = stops.map(([at, hex]) => [at, labOf(rgbOf(hex))] as const);
  const first = labs[0];
  const last = labs[labs.length - 1];
  if (first === undefined || last === undefined) throw new Error("empty ramp");
  if (sourceL <= first[0]) return rgbOfLab(first[1]);
  if (sourceL >= last[0]) return rgbOfLab(last[1]);
  for (let k = 1; k < labs.length; k += 1) {
    const [a0, l0] = labs[k - 1] ?? first;
    const [a1, l1] = labs[k] ?? last;
    if (sourceL > a1) continue;
    const t = (sourceL - a0) / (a1 - a0);
    return rgbOfLab([
      l0[0] + (l1[0] - l0[0]) * t,
      l0[1] + (l1[1] - l0[1]) * t,
      l0[2] + (l1[2] - l0[2]) * t,
    ]);
  }
  return rgbOfLab(last[1]);
}

const inBox = (box: RemapBox, x: number, y: number): boolean =>
  x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;

/** The eldritch green of flames, windows, lamps and lanterns. */
export function isRemapGlow(rgb: Rgb, minValue = 0.45): boolean {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  if (hue < 100 || hue > 160) return false;
  if (saturation >= 0.4 && value >= 0.45) return true;
  return saturation >= 0.6 && value >= minValue;
}

/**
 * A hull pixel inside a `wood` box: the indigo and its pale blue lights
 * (hue 190 to 268, saturation from 0.2), so no blue glint is left on the
 * planks; grey steel (cannons, fittings) is under 0.2 and kept.
 */
export function isRemapHull(rgb: Rgb): boolean {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  return hue >= 190 && hue <= 268 && saturation >= 0.2 && value >= 0.1;
}

/** The lodge's indigo: shingles, hulls, sail stripes, tarps, bodies. */
export function isRemapIndigo(
  rgb: Rgb,
  window: readonly [number, number] = [222, 268],
): boolean {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  return (
    hue >= window[0] && hue <= window[1] && saturation >= 0.3 && value >= 0.1
  );
}

/** The robes' rule alone: crimson cloth, deep purple cloth, or neither. */
export function robeRule(rgb: Rgb): "main" | "dark" | undefined {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  if (value < 0.06) return undefined;
  const crimson = hue >= 315 || hue <= 5;
  const blood = (hue >= 354 || hue <= 6) && saturation >= 0.95;
  if (crimson && saturation >= 0.6 && !blood) return "main";
  if (hue >= 268 && hue < 315 && saturation >= 0.4) return "dark";
  return undefined;
}

/** Gold embroidery on a robe: a saturated orange-gold, not skin. */
export function isRemapGold(rgb: Rgb): boolean {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  return hue >= 18 && hue <= 52 && saturation >= 0.62 && value >= 0.3;
}

/** What a pixel is under an asset's rules, or undefined (kept). */
export function remapClassify(
  rules: RemapRules,
  rgb: Rgb,
  x: number,
  y: number,
  palette?: Pick<RemapPalette, "glowMinValue">,
): RemapKind | undefined {
  if (rules.keep?.includes(hexOf(rgb)) === true) return undefined;
  if ((rules.protect ?? []).some((box) => inBox(box, x, y))) return undefined;
  const glowFrom = palette?.glowMinValue;
  if (rules.kind === "lodge") {
    if ((rules.wood ?? []).some((box) => inBox(box, x, y)) && isRemapHull(rgb))
      return "wood";
    if (isRemapIndigo(rgb, rules.lodgeHue))
      return rules.body === "summon" ? "summon" : "main";
    if (rules.noGlow !== true && isRemapGlow(rgb, glowFrom)) return "glow";
    return undefined;
  }
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  const second = rules.secondaryHue;
  if (
    second !== undefined &&
    hue >= second[0] &&
    hue <= second[1] &&
    saturation >= 0.4 &&
    value >= 0.06
  )
    return "dark";
  const kind = robeRule(rgb);
  if (kind !== undefined) return kind;
  const extended = (rules.extend ?? []).some(
    (rule) =>
      inBox(rule.box, x, y) &&
      hue >= rule.hue[0] &&
      hue <= rule.hue[1] &&
      saturation >= rule.minSaturation &&
      value <= rule.maxValue,
  );
  if (extended) return "main";
  if (rules.noGlow !== true && isRemapGlow(rgb, glowFrom)) return "glow";
  if (isRemapGold(rgb) && !(rules.props ?? []).some((box) => inBox(box, x, y)))
    return "trim";
  return undefined;
}

export interface RemapResult {
  readonly raster: RgbaRaster;
  /**
   * Remapped pixels of each class: main, dark, trim and glow always, summon
   * and wood when the asset's rules use them (so palette 1's records stay
   * as they were).
   */
  readonly pixels: Readonly<Partial<Record<RemapKind, number>>>;
}

const RAMP_OF: Record<RemapKind, keyof RemapPalette> = {
  main: "ramp",
  dark: "dark",
  trim: "trim",
  glow: "glow",
  summon: "summon",
  wood: "wood",
};

/** The ramp's colour for `sourceL`, taken darker until no avoided colour is near. */
function clearOf(
  palette: RemapPalette,
  ramp: readonly RemapStop[],
  sourceL: number,
): Rgb {
  const avoid = palette.avoid.map(rgbOf);
  const near = (rgb: Rgb): boolean =>
    avoid.some(
      (colour) =>
        Math.hypot(rgb[0] - colour[0], rgb[1] - colour[1], rgb[2] - colour[2]) <
        palette.avoidDistance,
    );
  for (let step = 0; step <= 20; step += 1) {
    const out = rampAt(ramp, sourceL - step);
    if (!near(out)) return out;
  }
  throw new Error(`no clear ramp colour below L* ${sourceL.toFixed(1)}`);
}

/** One palette applied to one raster under the asset's rules. */
export function remapRaster(
  base: RgbaRaster,
  palette: RemapPalette,
  rules: RemapRules,
): RemapResult {
  const data = new Uint8Array(base.data);
  const pixels: Partial<Record<RemapKind, number>> = {
    main: 0,
    dark: 0,
    trim: 0,
    glow: 0,
  };
  const cache = new Map<string, Rgb>();
  for (let y = 0; y < base.height; y += 1)
    for (let x = 0; x < base.width; x += 1) {
      const p = y * base.width + x;
      if ((base.data[p * 4 + 3] ?? 0) === 0) continue;
      const rgb: Rgb = [
        base.data[p * 4] ?? 0,
        base.data[p * 4 + 1] ?? 0,
        base.data[p * 4 + 2] ?? 0,
      ];
      const kind = remapClassify(rules, rgb, x, y, palette);
      if (kind === undefined) continue;
      pixels[kind] = (pixels[kind] ?? 0) + 1;
      const key = `${kind}${hexOf(rgb)}`;
      let out = cache.get(key);
      if (out === undefined) {
        const ramp = palette[RAMP_OF[kind]] as readonly RemapStop[] | undefined;
        if (ramp === undefined)
          throw new Error(`the palette has no ${RAMP_OF[kind]} ramp`);
        out = clearOf(palette, ramp, labOf(rgb)[0]);
        cache.set(key, out);
      }
      data.set(out, p * 4);
    }
  return {
    raster: { width: base.width, height: base.height, data },
    pixels,
  };
}
