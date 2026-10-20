/**
 * Holistic Cult palettes (bead pulp_wars-mch9.58): the data and the
 * deterministic remap. No PixelLab call is made; every option recolours the
 * production pixels palette entry by palette entry, through lightness-keyed
 * ramps, so faces, blood, steel, wood, stone, cream walls and the summoned
 * teal keep their exact pixels and the shading is preserved.
 *
 * The user (2026-10-20): "let's keep iterating on the cultists robes. I want
 * a holistic vision with the robes and the buildings and naval units. needs
 * to be consistent. purple as main color plus aquamarine accents is a valid
 * option but want to see alternatives." It supersedes the robe-only options
 * of bead pulp_wars-mch9.55, whose classifier for the robed cultists
 * (scripts/art/cult-recolour-mch955/recolour.ts on branch
 * cult-recolour-mch955) is carried over here and extended:
 *
 * - **Robed cultists and busts** (the round-2 rasters): the crimson cloth
 *   goes through the palette's `main` ramp, the deep purple cloth (the
 *   Hexer's cowl, the Stargazer's lining) through `dark`; where the palette
 *   has a `trim` ramp the gold embroidery goes through it too (props such as
 *   the telescope, the hilts and the idol are boxed off), and where it has a
 *   `glow` ramp the green flames, amulets and sparks go through that.
 * - **The lodge** (the three cities, the seven buildings, the obelisk, the
 *   four ships, the three ship portraits, the Kraken, the Familiar and the
 *   Herald): the indigo shingles, hulls, sail stripes, tarps, drapes and
 *   bodies go through `main` (unless the palette keeps the lodge indigo),
 *   and the eldritch green windows, lamps and lanterns through `glow`.
 *
 * Brass, cream, stone, wood, skin, blood, steel and the summoned teal are
 * never touched.
 */
import { rgbToHsv, type RgbaRaster } from "../chibi/owner-mask";
import { hexOf, lab, rgbOf, type Rgb } from "../ice-folk-direction/colour";

type Lab = readonly [number, number, number];

/** A ramp stop: the source L* it answers and the colour it gives. */
export type Stop = readonly [number, string];

export interface CultPalette {
  readonly id: string;
  readonly name: string;
  /** The main colour, as one swatch (the lit cloth and roof tone). */
  readonly main: string;
  /** The accent colour, as one swatch. */
  readonly accent: string;
  /** One line on the sheet. */
  readonly note: string;
  /** Crimson robe cloth and lodge indigo, by the source pixel's L*. */
  readonly ramp: readonly Stop[];
  /** The deep purple second cloth of the robes. */
  readonly dark: readonly Stop[];
  /** The robes' gold embroidery; undefined keeps the gold. */
  readonly trim?: readonly Stop[];
  /** The eldritch green lights; undefined keeps the green. */
  readonly glow?: readonly Stop[];
  /** True when the lodge's indigo is already this palette's main colour. */
  readonly lodgeKept?: boolean;
  /** The territory border and UI colour this palette proposes. */
  readonly border: string;
  /** Why the border is what it is. */
  readonly borderNote: string;
}

/**
 * The lodge's own brass (domes, prows, bollards: lit #ecd27c, #c9a24a,
 * shade #8a6a2a), for palettes whose accent is gold: the Summoner's
 * orange embroidery joins the brass of the buildings and ships.
 */
const BRASS: readonly Stop[] = [
  [15, "#2e1f08"],
  [30, "#5a4012"],
  [45, "#8a6a2a"],
  [60, "#c9a24a"],
  [75, "#ecd27c"],
  [90, "#fff2c0"],
];

const NEAR_BLACK: readonly Stop[] = [
  [0, "#050505"],
  [10, "#111113"],
  [20, "#1d1d21"],
  [30, "#2d2d33"],
  [45, "#46464f"],
];

export const PALETTES: readonly CultPalette[] = [
  {
    id: "p1-purple-aqua",
    name: "1  Royal purple + aquamarine",
    main: "#6a2f93",
    accent: "#4fe3c1",
    note: "the user's option: plum-royal purple cloth, roofs and hulls; aquamarine trim, flames, windows and lanterns",
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
    // Lifted above the summons' teal (#2c7e7d, L* 47): the trim is a light
    // mint line on the purple, the summoned a mid teal body.
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
    border: "#00ff78",
    borderNote:
      "keeps the eldritch green: an aquamarine border (#46f0c8) is only 23 from the Dwarf jade",
  },
  {
    id: "p2-indigo-gold",
    name: "2  Midnight indigo + gold",
    main: "#4a43b5",
    accent: "#e0b44a",
    note: "the lodge as built: robes join the indigo of the roofs, hulls and sails; gold trim and brass; the green flame stays",
    ramp: [
      [0, "#07061a"],
      [10, "#141134"],
      [18, "#201c55"],
      [26, "#2e2a7c"],
      [34, "#3f39a0"],
      [44, "#5650c0"],
      [56, "#7a76d8"],
      [70, "#a7a4ea"],
    ],
    dark: NEAR_BLACK,
    trim: BRASS,
    lodgeKept: true,
    border: "#00ff78",
    borderNote: "keeps the eldritch green, the flame's colour",
  },
  {
    id: "p3-umber-brass",
    name: "3  Dried-blood umber + brass",
    main: "#714225",
    accent: "#d6a640",
    note: "old blood gone brown: umber cloth, shingles and lacquered hulls; brass trim and fittings; the green flame stays",
    ramp: [
      [0, "#0a0504"],
      [10, "#22110a"],
      [18, "#391d11"],
      [26, "#522c19"],
      [34, "#6d3e23"],
      [44, "#8d5631"],
      [56, "#ae7a4f"],
      [70, "#cfa37e"],
    ],
    dark: NEAR_BLACK,
    trim: BRASS,
    border: "#00ff78",
    borderNote: "keeps the eldritch green",
  },
  {
    id: "p4-soot-bile",
    name: "4  Soot black + bile green",
    main: "#3f501f",
    accent: "#a8c43a",
    note: "soot-black cloth, shingles and hulls whose lit side turns a sickly bile; bile embroidery; the green flame stays",
    ramp: [
      [0, "#050504"],
      [10, "#0c0d0a"],
      [18, "#141610"],
      [26, "#1d2214"],
      [34, "#2a3318"],
      [44, "#3f4f1e"],
      [56, "#657f28"],
      [70, "#9bb948"],
    ],
    dark: NEAR_BLACK,
    trim: [
      [15, "#2a3109"],
      [30, "#4c5a12"],
      [45, "#73881d"],
      [60, "#9cb52e"],
      [75, "#c3da55"],
      [90, "#e8f6a6"],
    ],
    border: "#00ff78",
    borderNote: "keeps the eldritch green",
  },
];

export interface Box {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/** Inside `box`, a colour of this hue window is cloth too. */
interface Extend {
  readonly box: Box;
  readonly hue: readonly [number, number];
  readonly minSaturation: number;
  readonly maxValue: number;
}

export interface CultAsset {
  readonly id: string;
  readonly file: string;
  readonly kind: "robed" | "lodge";
  /** Palette entries the rule takes that are not cloth. */
  readonly keep?: readonly string[];
  /** Boxes never touched: bloody blades, face lines, an eye. */
  readonly protect?: readonly Box[];
  /** Boxes where gold is a prop, not embroidery (robed only). */
  readonly props?: readonly Box[];
  /** Hue window of the deep purple cloth when not 268 to 315. */
  readonly secondaryHue?: readonly [number, number];
  /** The Summoner's rust hood, which the crimson rule does not reach. */
  readonly extend?: readonly Extend[];
  /** Green that is not a light (the Herald's tentacle head). */
  readonly noGlow?: boolean;
  /** The lodge hue window when not 222 to 268 (the Familiar's pale blue). */
  readonly lodgeHue?: readonly [number, number];
}

const UNITS = "public/assets/chibi/units";
const PORTRAITS = "public/assets/chibi/portraits";
const BUILDINGS = "public/assets/chibi/buildings";
const SETTLEMENTS = "public/assets/chibi/settlements";

/** The five robed cultists and their busts (mch9.55's boxes). */
export const ROBED: readonly CultAsset[] = [
  {
    id: "initiate",
    kind: "robed",
    file: `${UNITS}/chibi-direction-cult-initiate.png`,
    protect: [
      { x0: 0, y0: 26, x1: 10, y1: 47 },
      { x0: 25, y0: 29, x1: 38, y1: 44 },
    ],
  },
  {
    id: "idol-bearer",
    kind: "robed",
    file: `${UNITS}/chibi-direction-cult-idol-bearer.png`,
    protect: [{ x0: 13, y0: 21, x1: 20, y1: 29 }],
  },
  {
    id: "hexer",
    kind: "robed",
    file: `${UNITS}/chibi-direction-cult-hexer.png`,
    keep: ["#31171b"],
    protect: [{ x0: 27, y0: 35, x1: 37, y1: 40 }],
  },
  {
    id: "summoner",
    kind: "robed",
    file: `${UNITS}/chibi-direction-cult-summoner.png`,
    protect: [
      { x0: 26, y0: 21, x1: 30, y1: 27 },
      { x0: 34, y0: 24, x1: 47, y1: 47 },
    ],
    extend: [
      {
        box: { x0: 10, y0: 0, x1: 38, y1: 30 },
        hue: [6, 26],
        minSaturation: 0.6,
        maxValue: 0.76,
      },
    ],
  },
  {
    id: "stargazer",
    kind: "robed",
    file: `${UNITS}/chibi-direction-cult-stargazer.png`,
    keep: ["#3e0d10"],
    protect: [{ x0: 24, y0: 35, x1: 27, y1: 39 }],
    props: [{ x0: 36, y0: 0, x1: 71, y1: 87 }],
  },
  {
    id: "portrait-initiate",
    kind: "robed",
    file: `${PORTRAITS}/chibi-direction-portrait-cult-initiate.png`,
    protect: [
      { x0: 3, y0: 16, x1: 11, y1: 42 },
      { x0: 12, y0: 19, x1: 31, y1: 33 },
    ],
  },
  {
    id: "portrait-idol-bearer",
    kind: "robed",
    file: `${PORTRAITS}/chibi-direction-portrait-cult-idol-bearer.png`,
    protect: [
      { x0: 14, y0: 19, x1: 33, y1: 34 },
      { x0: 9, y0: 12, x1: 17, y1: 22 },
      { x0: 29, y0: 12, x1: 40, y1: 22 },
    ],
  },
  {
    id: "portrait-hexer",
    kind: "robed",
    file: `${PORTRAITS}/chibi-direction-portrait-cult-hexer.png`,
    secondaryHue: [268, 335],
    protect: [{ x0: 21, y0: 17, x1: 34, y1: 31 }],
  },
  {
    id: "portrait-summoner",
    kind: "robed",
    file: `${PORTRAITS}/chibi-direction-portrait-cult-summoner.png`,
    protect: [
      { x0: 18, y0: 20, x1: 36, y1: 33 },
      { x0: 36, y0: 22, x1: 47, y1: 44 },
      { x0: 0, y0: 29, x1: 6, y1: 35 },
    ],
  },
  {
    id: "portrait-stargazer",
    kind: "robed",
    file: `${PORTRAITS}/chibi-direction-portrait-cult-stargazer.png`,
    props: [{ x0: 30, y0: 0, x1: 47, y1: 47 }],
  },
];

const lodge = (id: string, file: string): CultAsset => ({
  id,
  file,
  kind: "lodge",
});

export const CITIES: readonly CultAsset[] = [1, 2, 3].map((level) =>
  lodge(
    `city-${level}`,
    `${SETTLEMENTS}/chibi-direction-cult-city-${level}.png`,
  ),
);

export const BUILDING_IDS = [
  "lumber-camp",
  "sawmill",
  "forge",
  "workshop",
  "port",
  "shipyard",
  "market",
  "monument",
] as const;

export const BUILDINGS_LIST: readonly CultAsset[] = BUILDING_IDS.map((id) =>
  lodge(id, `${BUILDINGS}/chibi-cult-${id}.png`),
);

export const SHIP_IDS = [
  "patrol-boat",
  "battleship",
  "submarine",
  "transport",
] as const;

/** The Black Gondola, the Galleon of the Eye, the Kraken and the barge. */
export const SHIPS: readonly CultAsset[] = SHIP_IDS.map((id) =>
  lodge(`ship-${id}`, `${UNITS}/chibi-naval-cult-${id}.png`),
);

export const SHIP_PORTRAITS: readonly CultAsset[] = [
  "patrol-boat",
  "battleship",
  "submarine",
].map((id) =>
  lodge(
    `ship-portrait-${id}`,
    `${PORTRAITS}/chibi-naval-cult-portrait-${id}.png`,
  ),
);

/** The two lodge creatures that wear the indigo today. */
export const CREATURES: readonly CultAsset[] = [
  {
    ...lodge("familiar", `${UNITS}/chibi-direction-cult-familiar.png`),
    lodgeHue: [190, 268],
  },
  {
    ...lodge("herald", `${UNITS}/chibi-direction-cult-herald.png`),
    noGlow: true,
  },
];

/** The Cult's campaign picture: red-robed men round a green well. */
export const CAMPAIGN: CultAsset = {
  id: "campaign",
  kind: "robed",
  file: "public/assets/chibi/campaign/campaign-cult.png",
};

export const ALL_ASSETS: readonly CultAsset[] = [
  ...ROBED,
  ...CITIES,
  ...BUILDINGS_LIST,
  ...SHIPS,
  ...SHIP_PORTRAITS,
  ...CREATURES,
  CAMPAIGN,
];

export type Kind = "main" | "dark" | "trim" | "glow" | undefined;

const inBox = (box: Box, x: number, y: number): boolean =>
  x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1;

/** The eldritch green of flames, windows, lamps and lanterns. */
export function isGlow(rgb: Rgb): boolean {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  return hue >= 100 && hue <= 160 && saturation >= 0.4 && value >= 0.45;
}

/** The lodge's indigo: shingles, hulls, sail stripes, tarps, bodies. */
export function isIndigo(
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
export function isGold(rgb: Rgb): boolean {
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  return hue >= 18 && hue <= 52 && saturation >= 0.62 && value >= 0.3;
}

/** What a pixel of an asset is, before the palette decides what moves. */
export function classify(
  asset: CultAsset,
  rgb: Rgb,
  x: number,
  y: number,
): Kind {
  if (asset.keep?.includes(hexOf(rgb)) === true) return undefined;
  if ((asset.protect ?? []).some((box) => inBox(box, x, y))) return undefined;
  if (asset.kind === "lodge") {
    if (isIndigo(rgb, asset.lodgeHue)) return "main";
    if (asset.noGlow !== true && isGlow(rgb)) return "glow";
    return undefined;
  }
  const { hue, saturation, value } = rgbToHsv(rgb[0], rgb[1], rgb[2]);
  const second = asset.secondaryHue;
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
  const extended = (asset.extend ?? []).some(
    (rule) =>
      inBox(rule.box, x, y) &&
      hue >= rule.hue[0] &&
      hue <= rule.hue[1] &&
      saturation >= rule.minSaturation &&
      value <= rule.maxValue,
  );
  if (extended) return "main";
  if (isGlow(rgb)) return "glow";
  if (isGold(rgb) && !(asset.props ?? []).some((box) => inBox(box, x, y)))
    return "trim";
  return undefined;
}

// sRGB from CIE L*a*b* (D65), the inverse of `lab`.
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
export function rampAt(stops: readonly Stop[], sourceL: number): Rgb {
  const labs = stops.map(([at, hex]) => [at, lab(rgbOf(hex))] as const);
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

/** The ramp a kind goes through under a palette, or undefined (kept). */
export function rampOf(
  palette: CultPalette,
  asset: CultAsset,
  kind: Kind,
): readonly Stop[] | undefined {
  if (kind === "main")
    return asset.kind === "lodge" && palette.lodgeKept === true
      ? undefined
      : palette.ramp;
  if (kind === "dark") return palette.dark;
  if (kind === "trim") return palette.trim;
  if (kind === "glow") return palette.glow;
  return undefined;
}

const DEBUG: Record<Exclude<Kind, undefined>, Rgb> = {
  main: [0, 255, 255],
  dark: [255, 230, 0],
  trim: [255, 0, 255],
  glow: [0, 255, 0],
};

/**
 * One palette applied to one asset. With no palette, a debug view: main
 * cyan, dark yellow, trim magenta, glow green, everything else dimmed.
 */
export function recolour(
  asset: CultAsset,
  raster: RgbaRaster,
  palette: CultPalette | undefined,
): RgbaRaster & { data: Uint8Array } {
  const data = new Uint8Array(raster.data);
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1) {
      const p = y * raster.width + x;
      if ((raster.data[p * 4 + 3] ?? 0) === 0) continue;
      const rgb: Rgb = [
        raster.data[p * 4] ?? 0,
        raster.data[p * 4 + 1] ?? 0,
        raster.data[p * 4 + 2] ?? 0,
      ];
      const kind = classify(asset, rgb, x, y);
      if (palette === undefined) {
        data.set(
          kind === undefined
            ? [rgb[0] * 0.45, rgb[1] * 0.45, rgb[2] * 0.45].map(Math.round)
            : DEBUG[kind],
          p * 4,
        );
        continue;
      }
      const ramp = rampOf(palette, asset, kind);
      if (ramp === undefined) continue;
      data.set(rampAt(ramp, lab(rgb)[0]), p * 4);
    }
  return { width: raster.width, height: raster.height, data };
}
