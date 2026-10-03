/**
 * Colour measurement for the Ice Folk art direction (bead pulp_wars-7g3.5,
 * docs/art/factions/ICE_FOLK.md): CIE76 colour difference, WCAG contrast
 * and the Machado 2009 colour-vision simulations, the same formulas as the
 * Martian and Dinosaur reviews, in a module of their own so that the study
 * and the review measure alike.
 */
export type Rgb = readonly [number, number, number];

export const rgbOf = (hex: string): Rgb => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

export const hexOf = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

const toLinear = (value: number): number => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (value: number): number => {
  const c = Math.max(0, Math.min(1, value));
  return Math.round(
    255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055),
  );
};

/** CIE L*a*b* (D65) of an sRGB colour. */
export function lab(rgb: Rgb): readonly [number, number, number] {
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76: about 10 is clear at a glance, 20 and more are different colours. */
export function deltaE(left: Rgb, right: Rgb): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

export const luminance = (rgb: Rgb): number =>
  0.2126 * toLinear(rgb[0]) +
  0.7152 * toLinear(rgb[1]) +
  0.0722 * toLinear(rgb[2]);

/** WCAG contrast ratio, 1 (none) to 21. */
export function contrast(left: Rgb, right: Rgb): number {
  const [hi, lo] = [luminance(left), luminance(right)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Machado, Oliveira and Fernandes 2009, severity 1.0, in linear RGB. */
const CVD = {
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182,
    0.04294, 0.968881,
  ],
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882,
    -0.048116, 1.051998,
  ],
} as const;

export function simulateColour(rgb: Rgb, kind: keyof typeof CVD): Rgb {
  const m = CVD[kind];
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  return [
    toSrgb(m[0] * r + m[1] * g + m[2] * b),
    toSrgb(m[3] * r + m[4] * g + m[5] * b),
    toSrgb(m[6] * r + m[7] * g + m[8] * b),
  ];
}

/** HSV hue in whole degrees (0 for a grey). */
export function hueOf(rgb: Rgb): number {
  const [r, g, b] = [rgb[0] / 255, rgb[1] / 255, rgb[2] / 255];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return Math.round((((h * 60) % 360) + 360) % 360);
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

export interface ColourPair {
  readonly a: string;
  readonly b: string;
  readonly deltaE: number;
  readonly contrast: number;
  readonly deuteranopiaDeltaE: number;
  readonly protanopiaDeltaE: number;
  readonly hueA: number;
  readonly hueB: number;
}

export function colourPair(
  aName: string,
  a: Rgb,
  bName: string,
  b: Rgb,
): ColourPair {
  return {
    a: `${aName} ${hexOf(a)}`,
    b: `${bName} ${hexOf(b)}`,
    deltaE: round1(deltaE(a, b)),
    contrast: round1(contrast(a, b)),
    deuteranopiaDeltaE: round1(
      deltaE(
        simulateColour(a, "deuteranopia"),
        simulateColour(b, "deuteranopia"),
      ),
    ),
    protanopiaDeltaE: round1(
      deltaE(simulateColour(a, "protanopia"), simulateColour(b, "protanopia")),
    ),
    hueA: hueOf(a),
    hueB: hueOf(b),
  };
}

/** The smallest of the normal and the two simulated differences. */
export const worstDeltaE = (pair: ColourPair): number =>
  Math.min(pair.deltaE, pair.deuteranopiaDeltaE, pair.protanopiaDeltaE);
