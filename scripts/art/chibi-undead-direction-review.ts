/**
 * Review evidence for the Undead production art of the new visual direction
 * (bead pulp_wars-3tq.12, batch `direction-undead` and the violet effects of
 * batch `effects-undead`):
 *
 *   CHROME_PATH=... npm run art:chibi-undead-direction-review -- [--port 6501] [--skip-capture]
 *
 * It writes art/pixellab/reviews/chibi-batch-direction-undead/:
 *
 *   units-old-new-{1x,x4}.png      every Undead unit: today's sprite in the
 *                                  key colour and in a player colour, the new
 *                                  one on Grass, Forest and Mountain, and the
 *                                  Human unit of its role
 *   units-zoom-0.75.png            the 1:1 sheet at zoom step 0.75
 *   portraits-old-new-{1x,x4}.png  the eight portraits and the four command
 *                                  icons, today and new, on the dock panel
 *   cities-{1x,x4}.png             City 1-3: today, new with the pennant at
 *                                  its recorded anchor, and the Human city
 *   effects-old-new-x4.png         the four effect sprites in the classic and
 *                                  the violet palette, and the markers that
 *                                  are not converted
 *   palette.{png,json}             the palette measured on the masters
 *   readability.json               colour differences and unit widths
 *   showcase-undead-{desktop,phone}-zoom-{1,0.75}.png
 *                                  a real Showcase match with an Undead
 *                                  viewer against Human, Goblin and Dinosaur
 *   showcase-undead-classic-desktop-zoom-1.png   the same match with the
 *                                  Classic look developer option on
 *   showcase-undead-{dock,train,tech,help}-desktop.png, setup-{desktop,phone}.png
 *                                  the interface in the default look
 *   scene-{four,mixed}-{desktop,phone}-zoom-{1,0.75}.png,
 *   scene-four-classic-desktop-zoom-1.png,
 *   scene-magic-{raise-preview,wail-preview,cues,cues-b}-{desktop,phone}-zoom-{1,0.75}.png
 *                                  the scenes of
 *                                  scripts/art/chibi/review-undead-direction-scene-v7.ts
 *                                  drawn by the real board host
 *   index.json                     sizes and hashes
 *
 * No PixelLab call is made. Captures start Vite on --port (never 6173).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";
import { DIRECTION_FLAG_ANCHORS_V7 } from "../../src/render/canvas/visual-direction-v7";
import { ACCENT_PRESETS, isAccentColour } from "./chibi/accent";
import { rgbToHsv } from "./chibi/owner-mask";
import {
  loadRecords,
  productionLayout,
  reviewDirectory,
  sha256,
} from "./chibi/pipeline";

const ROOT = process.cwd();
const BATCH = "direction-undead";
const BEAD = "pulp_wars-3tq.12";

const UNITS = [
  ["Skeleton", "skeleton", "FIGHTER", "fighter"],
  ["Ghoul", "ghoul", "RAIDER", "raider"],
  ["Banshee", "banshee", "MARKSMAN", "marksman"],
  ["Zombie", "zombie", "GUARD", "guard"],
  ["Necromancer", "necromancer", "CAPTAIN", "captain"],
  ["Lich", "lich", "CATAPULT", "catapult"],
  ["Vampire", "vampire", "KNIGHT", "knight"],
  ["Abomination", "abomination", "JUGGERNAUT", "juggernaut"],
] as const;

const ICONS = [
  ["Raise Dead", "raise-dead"],
  ["Devour", "devour"],
  ["Wail", "wail"],
  ["Frenzy", "undead-rally"],
] as const;

const EFFECTS = [
  ["Wail", "wail"],
  ["Lich splash", "splash"],
  ["Raise Dead", "raise"],
  ["Spirit wisp", "wisp"],
] as const;

type Rgb = readonly [number, number, number];

const hex = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
const rgbOf = (colour: string): Rgb => [
  Number.parseInt(colour.slice(1, 3), 16),
  Number.parseInt(colour.slice(3, 5), 16),
  Number.parseInt(colour.slice(5, 7), 16),
];

/** Terrain colours measured by the Undead study (untoned rasters). */
const TERRAIN = {
  grass: "#89b75b",
  forest: "#769a51",
  forestDark: "#2d3a37",
  mountain: "#929ca9",
  mountainLightRock: "#d1dbe8",
} as const;

const BACKGROUNDS = {
  grass: "rgb(137,183,91)",
  forest: "rgb(118,154,81)",
  mountain: "rgb(162,170,182)",
  panel: "rgb(29,36,38)",
} as const;
type Background = keyof typeof BACKGROUNDS;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

function posix(file: string): string {
  return path.relative(ROOT, file).replaceAll("\\", "/");
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

// ------------------------------------------------------------ rasters

interface Raster {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
}

async function load(file: string): Promise<Raster> {
  const { data, info } = await sharp(path.join(ROOT, file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** The classic sprite recoloured through its mask, as the runtime does. */
async function recoloured(
  file: string,
  maskFile: string,
  colour: string,
): Promise<Raster> {
  const art = await load(file);
  const mask = await load(maskFile);
  const owner = parseHexColourV7(colour);
  if (owner === null) throw new Error(colour);
  return {
    width: art.width,
    height: art.height,
    data: Buffer.from(
      recolourOwnerPixelsV7({
        pixels: new Uint8ClampedArray(art.data),
        width: art.width,
        height: art.height,
        mask: new Uint8ClampedArray(mask.data),
        maskWidth: mask.width,
        maskHeight: mask.height,
        owner,
      }),
    ),
  };
}

// ------------------------------------------------------------ sheets

interface Cell {
  readonly image: string | Raster;
  readonly label: string;
  readonly background: Background;
  /** A pennant drawn at this master pixel (the top of its pole). */
  readonly flag?: {
    readonly x: number;
    readonly y: number;
    readonly pole: number;
  };
}

interface Row {
  readonly title: string;
  readonly cells: readonly Cell[];
}

const LABEL_HEIGHT = 18;
const GAP = 8;

/**
 * A labelled grid: every cell is a box of `box` master pixels with the art
 * bottom-centred, drawn at `scale` (integer, nearest neighbour).
 */
async function writeGrid(
  file: string,
  rows: readonly Row[],
  box: { readonly width: number; readonly height: number },
  scale: number,
): Promise<string> {
  const columns = Math.max(...rows.map((row) => row.cells.length));
  const cellWidth = box.width * scale;
  const cellHeight = box.height * scale;
  const titleWidth = 128;
  const width = titleWidth + columns * (cellWidth + GAP) + GAP;
  const rowHeight = cellHeight + LABEL_HEIGHT + GAP;
  const height = rows.length * rowHeight + GAP;
  const shapes: string[] = [
    `<rect width="${width}" height="${height}" fill="rgb(29,36,38)"/>`,
  ];
  const overlays: string[] = [];
  const composites: { input: Buffer; left: number; top: number }[] = [];
  for (const [rowIndex, row] of rows.entries()) {
    const top = GAP + rowIndex * rowHeight;
    shapes.push(
      `<text x="${GAP}" y="${top + LABEL_HEIGHT + 14}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#f4f1e8">${escapeXml(row.title)}</text>`,
    );
    for (const [column, cell] of row.cells.entries()) {
      const left = titleWidth + column * (cellWidth + GAP);
      shapes.push(
        `<text x="${left}" y="${top + 13}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#cfd6cf">${escapeXml(cell.label)}</text>`,
        `<rect x="${left}" y="${top + LABEL_HEIGHT}" width="${cellWidth}" height="${cellHeight}" fill="${BACKGROUNDS[cell.background]}"/>`,
      );
      const art =
        typeof cell.image === "string" ? await load(cell.image) : cell.image;
      const artLeft = left + Math.floor((box.width - art.width) / 2) * scale;
      const artTop = top + LABEL_HEIGHT + (box.height - art.height) * scale;
      composites.push({
        input: await sharp(art.data, {
          raw: { width: art.width, height: art.height, channels: 4 },
        })
          .resize(art.width * scale, art.height * scale, { kernel: "nearest" })
          .png()
          .toBuffer(),
        left: artLeft,
        top: artTop,
      });
      if (cell.flag !== undefined) {
        // The code-drawn city pennant (17 x 11 master px) at its anchor,
        // here in the Violet player's colour.
        const x = artLeft + cell.flag.x * scale;
        const y = artTop + cell.flag.y * scale;
        const w = 17 * scale;
        const h = 11 * scale;
        overlays.push(
          cell.flag.pole > 0
            ? `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cell.flag.pole * scale}" stroke="#4a3b2e" stroke-width="${2.6 * scale}"/>`
            : "",
          `<polygon points="${x},${y} ${x + w},${y} ${x + w * 0.72},${y + h / 2} ${x + w},${y + h} ${x},${y + h}" fill="${RULESET7_PLAYER_COLORS.VIOLET}" stroke="#3d2c55" stroke-width="${1.2 * scale}"/>`,
        );
      }
    }
  }
  const svg = (body: string): Buffer =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
    );
  await sharp(svg(shapes.join("")))
    .composite([
      ...composites,
      { input: svg(overlays.join("")), left: 0, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(file);
  return file;
}

async function sheets(directory: string): Promise<string[]> {
  const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
  const effects = await loadRecords(
    productionLayout(ROOT, "effects-undead"),
    "effects-undead",
  );
  const master = (id: string): string => {
    const record = records.assets[id] ?? effects.assets[id];
    if (record?.status !== "ACCEPTED")
      throw new Error(`${id} has no accepted record`);
    return record.master.path;
  };
  const files: string[] = [];
  const units = "public/assets/chibi/units";

  const unitRows: Row[] = await Promise.all(
    UNITS.map(async ([title, name, , human]) => {
      const today = `${units}/chibi-undead-${name}.png`;
      const fresh = master(`chibi-direction-undead-${name}`);
      return {
        title,
        cells: [
          { image: today, label: "today (key red)", background: "grass" },
          {
            image: await recoloured(
              today,
              `${units}/chibi-undead-${name}.mask.png`,
              RULESET7_PLAYER_COLORS.TEAL,
            ),
            label: "today, Teal player",
            background: "grass",
          },
          { image: fresh, label: "new (fixed colours)", background: "grass" },
          { image: fresh, label: "new, on Forest", background: "forest" },
          { image: fresh, label: "new, on Mountain", background: "mountain" },
          {
            image: `${units}/chibi-direction-${human}.png`,
            label: "Human of the role",
            background: "grass",
          },
        ] satisfies Cell[],
      };
    }),
  );
  const unitBox = { width: 96, height: 108 };
  const units1x = path.join(directory, "units-old-new-1x.png");
  files.push(await writeGrid(units1x, unitRows, unitBox, 1));
  files.push(
    await writeGrid(
      path.join(directory, "units-old-new-x4.png"),
      unitRows,
      unitBox,
      4,
    ),
  );
  const meta = await sharp(units1x).metadata();
  const zoomFile = path.join(directory, "units-zoom-0.75.png");
  await sharp(units1x)
    .resize(Math.round((meta.width ?? 0) * 0.75), null, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toFile(zoomFile);
  files.push(zoomFile);

  const portraits = "public/assets/chibi/portraits";
  const icons = "public/assets/chibi/icons";
  const portraitRows: Row[] = [
    ...UNITS.map(([title, name, , human]) => ({
      title,
      cells: [
        {
          image: `${portraits}/chibi-portrait-undead-${name}.png`,
          label: "today (key red)",
          background: "panel",
        },
        {
          image: master(`chibi-direction-portrait-undead-${name}`),
          label: "new",
          background: "panel",
        },
        {
          image: `${portraits}/chibi-direction-portrait-${human}.png`,
          label: "Human of the role",
          background: "panel",
        },
      ] satisfies Cell[],
    })),
    ...ICONS.map(([title, name]) => ({
      title: `${title} (icon)`,
      cells: [
        {
          image: `${icons}/chibi-icon-action-${name}.png`,
          label: "today",
          background: "panel",
        },
        {
          image: master(`chibi-direction-icon-action-${name}`),
          label: "new",
          background: "panel",
        },
      ] satisfies Cell[],
    })),
  ];
  for (const [suffix, scale] of [
    ["1x", 1],
    ["x4", 4],
  ] as const)
    files.push(
      await writeGrid(
        path.join(directory, `portraits-old-new-${suffix}.png`),
        portraitRows,
        { width: 56, height: 52 },
        scale,
      ),
    );

  const settlements = "public/assets/chibi/settlements";
  const flag = (id: string): NonNullable<Cell["flag"]> => {
    const anchor = DIRECTION_FLAG_ANCHORS_V7[id];
    if (anchor === undefined) throw new Error(`${id} has no pennant anchor`);
    return anchor;
  };
  const cityRows: Row[] = [1, 2, 3].map((level) => ({
    title: `City ${level}`,
    cells: [
      {
        image: `${settlements}/chibi-undead-city-${level}.png`,
        label: "today (key red roofs)",
        background: "grass",
      },
      {
        image: master(`chibi-direction-undead-city-${level}`),
        label: "new, with the pennant",
        background: "grass",
        flag: flag(`chibi-direction-undead-city-${level}`),
      },
      {
        image: `${settlements}/chibi-direction-city-${level}.png`,
        label: "Human, with the pennant",
        background: "grass",
        flag: flag(`chibi-direction-city-${level}`),
      },
    ] satisfies Cell[],
  }));
  for (const [suffix, scale] of [
    ["1x", 1],
    ["x4", 4],
  ] as const)
    files.push(
      await writeGrid(
        path.join(directory, `cities-${suffix}.png`),
        cityRows,
        { width: 104, height: 112 },
        scale,
      ),
    );

  const fx = "public/assets/chibi/effects";
  const effectRows: Row[] = [
    ...EFFECTS.map(([title, name]) => ({
      title,
      cells: (["grass", "forest", "panel"] as const).flatMap((background) => [
        {
          image: `${fx}/chibi-effect-${name}.png`,
          label: "classic",
          background,
        },
        {
          image: master(`chibi-direction-effect-${name}`),
          label: "violet (default look)",
          background,
        },
      ]) satisfies Cell[],
    })),
    {
      title: "Not converted",
      cells: [
        {
          image: "public/assets/chibi/status/chibi-marker-plagued.png",
          label: "Plague marker",
          background: "grass",
        },
        {
          image: "public/assets/chibi/status/chibi-marker-bitten.png",
          label: "Bitten marker",
          background: "grass",
        },
        {
          image: `${fx}/chibi-effect-cure.png`,
          label: "cure sparkle",
          background: "grass",
        },
      ],
    },
  ];
  files.push(
    await writeGrid(
      path.join(directory, "effects-old-new-x4.png"),
      effectRows,
      { width: 52, height: 52 },
      4,
    ),
  );
  return files;
}

// ------------------------------------------------------------ measurements

function lab(rgb: Rgb): readonly [number, number, number] {
  const linear = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const x =
    (linear[0] * 0.4124 + linear[1] * 0.3576 + linear[2] * 0.1805) / 0.95047;
  const y = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const z =
    (linear[0] * 0.0193 + linear[1] * 0.1192 + linear[2] * 0.9505) / 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76 colour difference. */
function deltaE(left: Rgb, right: Rgb): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG luminance ratio. */
function contrast(left: Rgb, right: Rgb): number {
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

function pair(aName: string, a: string, bName: string, b: string) {
  return {
    a: `${aName} ${a}`,
    b: `${bName} ${b}`,
    deltaE: round1(deltaE(rgbOf(a), rgbOf(b))),
    contrast: round1(contrast(rgbOf(a), rgbOf(b))),
  };
}

type Material = "bone" | "flesh" | "darkCloth" | "accent" | "accentTrim";

/**
 * Material of an opaque pixel of a new Undead master, by colour: the accent
 * is the violet band of the derivation's output (its lightened trim is the
 * pale part), bone is a pale warm ivory, flesh a pale warm grey, dark cloth
 * anything near black.
 */
function material(r: number, g: number, b: number): Material | null {
  const { hue, saturation, value } = rgbToHsv(r, g, b);
  if (hue >= 255 && hue <= 292 && saturation >= 0.35 && value >= 0.2)
    return saturation <= 0.63 && value >= 0.95 ? "accentTrim" : "accent";
  if (value <= 0.26) return "darkCloth";
  if (
    hue >= 28 &&
    hue <= 62 &&
    saturation >= 0.09 &&
    saturation <= 0.4 &&
    value >= 0.58
  )
    return "bone";
  if (
    (hue <= 28 || hue >= 330) &&
    saturation <= 0.2 &&
    value >= 0.45 &&
    value <= 0.8
  )
    return "flesh";
  return null;
}

interface Measured {
  readonly opaque: number;
  readonly share: Readonly<Record<Material, number>>;
  readonly commonest: Readonly<Record<Material, string | null>>;
  readonly width: number;
  readonly footWidth: number;
}

function measure(raster: Raster): Measured {
  const counts: Record<Material, Map<string, number>> = {
    bone: new Map(),
    flesh: new Map(),
    darkCloth: new Map(),
    accent: new Map(),
    accentTrim: new Map(),
  };
  let opaque = 0;
  let left = raster.width;
  let right = -1;
  let footLeft = raster.width;
  let footRight = -1;
  let bottom = -1;
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128)
        bottom = Math.max(bottom, y);
  for (let y = 0; y < raster.height; y += 1)
    for (let x = 0; x < raster.width; x += 1) {
      const offset = (y * raster.width + x) * 4;
      if ((raster.data[offset + 3] ?? 0) < 128) continue;
      opaque += 1;
      left = Math.min(left, x);
      right = Math.max(right, x);
      // The feet: the lowest six rows of the art.
      if (y > bottom - 6) {
        footLeft = Math.min(footLeft, x);
        footRight = Math.max(footRight, x);
      }
      const rgb: Rgb = [
        raster.data[offset] ?? 0,
        raster.data[offset + 1] ?? 0,
        raster.data[offset + 2] ?? 0,
      ];
      const kind = material(rgb[0], rgb[1], rgb[2]);
      if (kind === null) continue;
      const key = hex(rgb);
      counts[kind].set(key, (counts[kind].get(key) ?? 0) + 1);
    }
  const total = (kind: Material): number =>
    [...counts[kind].values()].reduce((sum, value) => sum + value, 0);
  const top = (kind: Material): string | null =>
    [...counts[kind].entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const kinds: readonly Material[] = [
    "bone",
    "flesh",
    "darkCloth",
    "accent",
    "accentTrim",
  ];
  return {
    opaque,
    share: Object.fromEntries(
      kinds.map((kind) => [
        kind,
        Math.round((total(kind) / Math.max(1, opaque)) * 1000) / 10,
      ]),
    ) as Record<Material, number>,
    commonest: Object.fromEntries(
      kinds.map((kind) => [kind, top(kind)]),
    ) as Record<Material, string | null>,
    width: right - left + 1,
    footWidth: footRight - footLeft + 1,
  };
}

/** The plate under a unit: `drawDirectedUnitBaseV7` (PLATE, 26 px radius). */
function plateWidth(sprite: Raster): number {
  return Math.round(
    2 * Math.min(sprite.width * 0.5, 26 * (sprite.height / 80)),
  );
}

async function measurements(directory: string): Promise<string[]> {
  const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
  const spec = ACCENT_PRESETS["undead-violet"];
  const perUnit: Record<string, unknown> = {};
  const all: Measured[] = [];
  for (const [title, name] of UNITS) {
    const record = records.assets[`chibi-direction-undead-${name}`];
    if (record === undefined) throw new Error(`${name} is not accepted`);
    const raster = await load(record.master.path);
    const measured = measure(raster);
    all.push(measured);
    const plate = plateWidth(raster);
    perUnit[title] = {
      master: record.master.path,
      recipe: `${record.recipe} (candidate ${record.candidate})`,
      opaquePixels: measured.opaque,
      sharePercent: measured.share,
      commonest: measured.commonest,
      accentPixelsRemapped: record.derivation.accent?.accentPixels ?? 0,
      trimPixelsLightened: record.derivation.accent?.trimPixels ?? 0,
      widthPx: measured.width,
      feetWidthPx: measured.footWidth,
      plateWidthPx: plate,
      widerThanPlate: measured.width > plate,
      feetWiderThanPlate: measured.footWidth > plate,
    };
  }
  const violetPlate = RULESET7_PLAYER_COLORS.VIOLET;
  const bone = "#e6e0c8";
  const boneShade = "#bab497";
  const flesh = "#948884";
  const cloth = "#313135";
  const clothDark = "#14181a";
  const lit = "#a221ee";
  // The lightened trim tone: the derivation's output for a lit source pixel.
  const trimTones = new Map<string, number>();
  for (const [, name] of UNITS) {
    const record = records.assets[`chibi-direction-undead-${name}`];
    if (record === undefined) continue;
    const raster = await load(record.master.path);
    for (let offset = 0; offset < raster.data.length; offset += 4) {
      if ((raster.data[offset + 3] ?? 0) < 128) continue;
      const rgb: Rgb = [
        raster.data[offset] ?? 0,
        raster.data[offset + 1] ?? 0,
        raster.data[offset + 2] ?? 0,
      ];
      if (material(rgb[0], rgb[1], rgb[2]) !== "accentTrim") continue;
      trimTones.set(hex(rgb), (trimTones.get(hex(rgb)) ?? 0) + 1);
    }
  }
  const trim =
    [...trimTones.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "#b55cf5";
  const plates = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
  const readability = {
    bead: BEAD,
    note: "deltaE is CIE76 in L*a*b* (about 2 is just noticeable, 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio (1 to 21). Terrain colours are those the Undead study measured on the untoned rasters. Materials are classified by colour on the accepted masters: `darkCloth` is the near-black cloth and the black outline together, and pallid flesh in a warm light counts as bone on some sprites, so the flesh share is a lower bound. The plate width is that of drawDirectedUnitBaseV7.",
    accentDerivation: {
      preset: "undead-violet",
      spec,
      sourceBandIsAccent: isAccentColour(spec, 213, 33, 238),
      litAccent: lit,
      lightenedTrim: trim,
    },
    boneAgainstTerrain: [
      pair("bone", bone, "Grass", TERRAIN.grass),
      pair("bone", bone, "Forest (mean)", TERRAIN.forest),
      pair("bone", bone, "Mountain (mean)", TERRAIN.mountain),
      pair("bone", bone, "Mountain (light rock)", TERRAIN.mountainLightRock),
      pair("bone, shaded", boneShade, "Mountain (mean)", TERRAIN.mountain),
      pair("pallid flesh", flesh, "Grass", TERRAIN.grass),
      pair("pallid flesh", flesh, "Mountain (mean)", TERRAIN.mountain),
    ],
    darkClothAgainstTerrain: [
      pair("dark cloth", cloth, "Grass", TERRAIN.grass),
      pair("dark cloth", cloth, "Forest (mean)", TERRAIN.forest),
      pair("dark cloth", cloth, "Forest (dark tones)", TERRAIN.forestDark),
    ],
    accent: [
      pair("violet accent, lit", lit, "Violet plate", violetPlate),
      pair("violet trim, lightened", trim, "Violet plate", violetPlate),
      pair("violet accent, lit", lit, "dark cloth", cloth),
      pair("violet accent, lit", lit, "dark cloth, shaded", clothDark),
      pair("violet trim, lightened", trim, "dark cloth", cloth),
      pair("violet trim, lightened", trim, "dark cloth, shaded", clothDark),
      pair("violet accent, lit", lit, "Grass", TERRAIN.grass),
      pair("violet trim, lightened", trim, "bone", bone),
      ...plates
        .filter(([name]) => name !== "VIOLET")
        .map(([name, colour]) =>
          pair("violet accent, lit", lit, `${name} plate`, colour),
        ),
    ],
    violetEffects: [
      pair("effect, lit violet", "#b06bf2", "Violet plate", violetPlate),
      pair("effect, lit violet", "#b06bf2", "Grass", TERRAIN.grass),
      pair("effect, pale glow", "#dcc4ff", "Grass", TERRAIN.grass),
      pair("Plague marker", "#9fac8a", "effect, lit violet", "#b06bf2"),
      pair("Plague marker", "#9fac8a", "Grass", TERRAIN.grass),
    ],
    units: perUnit,
  };
  const readabilityFile = path.join(directory, "readability.json");
  await writeFile(readabilityFile, `${JSON.stringify(readability, null, 2)}\n`);

  const mean = (kind: Material): number =>
    Math.round(
      (all.reduce((sum, unit) => sum + unit.share[kind], 0) / all.length) * 10,
    ) / 10;
  const swatches = [
    {
      role: "Bone, lit",
      colours: [bone, "#fefbdd", "#d0c9a9"],
      share: mean("bone"),
    },
    { role: "Bone, shaded", colours: [boneShade, "#a59e84"], share: null },
    {
      role: "Pallid flesh",
      colours: [flesh, "#9e918b", "#a89b93"],
      share: mean("flesh"),
    },
    {
      role: "Dark cloth (share with the outline)",
      colours: [cloth, clothDark, "#100f10"],
      share: mean("darkCloth"),
    },
    { role: "Iron", colours: ["#64717e", "#818f9b", "#3d424d"], share: null },
    {
      role: "Tarnished bronze (rims, crown)",
      colours: ["#574329", "#966f40"],
      share: null,
    },
    {
      role: "Violet accent",
      colours: [lit, "#6f06c9", "#7614ca"],
      share: mean("accent"),
    },
    {
      role: "Violet trim on dark cloth (lightened)",
      colours: [trim],
      share: mean("accentTrim"),
    },
    {
      role: "Violet effects",
      colours: ["#46247c", "#7b36c9", "#b06bf2", "#dcc4ff"],
      share: null,
    },
    {
      role: "Player plates",
      colours: plates.map(([, colour]) => colour),
      share: null,
    },
    {
      role: "Human crimson and gold",
      colours: ["#b0282e", "#e2b63f"],
      share: null,
    },
  ];
  const rowHeight = 44;
  const width = 760;
  const height = swatches.length * rowHeight + 16;
  const body = swatches
    .map((swatch, index) => {
      const top = 8 + index * rowHeight;
      const boxes = swatch.colours
        .map(
          (colour, at) =>
            `<rect x="${300 + at * 74}" y="${top}" width="34" height="34" fill="${colour}" stroke="#0c0f10"/><text x="${300 + at * 74}" y="${top + 44 - 34 + 32}" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#cfd6cf" transform="translate(36,-12)">${colour}</text>`,
        )
        .join("");
      return `<text x="10" y="${top + 16}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#f4f1e8">${escapeXml(swatch.role)}</text>${
        swatch.share === null
          ? ""
          : `<text x="10" y="${top + 31}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#cfd6cf">${swatch.share}% of the eight sprites (mean)</text>`
      }${boxes}`;
    })
    .join("");
  const paletteFile = path.join(directory, "palette.png");
  await sharp(
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="rgb(29,36,38)"/>${body}</svg>`,
    ),
  )
    .png({ compressionLevel: 9 })
    .toFile(paletteFile);
  const paletteJson = path.join(directory, "palette.json");
  await writeFile(
    paletteJson,
    `${JSON.stringify({ bead: BEAD, swatches }, null, 2)}\n`,
  );
  return [paletteFile, paletteJson, readabilityFile];
}

// ------------------------------------------------------------ captures

interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connect(webSocketUrl: string): Promise<Connection> {
  const socket = new WebSocket(webSocketUrl);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP failed")), {
      once: true,
    });
  });
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(new Error(message.error.message ?? "CDP failed"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    result?: { value?: T };
    exceptionDetails?: { exception?: { description?: string }; text?: string };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function waitFor(
  connection: Connection,
  expression: string,
  attempts = 400,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (
      await evaluate<boolean>(connection, `Boolean(${expression})`).catch(
        () => false,
      )
    )
      return;
    await delay(50);
  }
  throw new Error(`Chrome timed out waiting for ${expression}`);
}

async function pressKey(connection: Connection, key: string): Promise<void> {
  for (const type of ["keyDown", "keyUp"] as const)
    await connection.send("Input.dispatchKeyEvent", {
      type,
      key,
      code: key,
      windowsVirtualKeyCode: key === "Enter" ? 13 : key === "Escape" ? 27 : 0,
    });
}

async function screenshot(
  connection: Connection,
  file: string,
): Promise<string> {
  await waitFor(
    connection,
    `Array.from(document.images).every((image) => image.complete)`,
  );
  await delay(900);
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data?: string };
  if (shot.data === undefined) throw new Error("Chrome returned no screenshot");
  await writeFile(file, Buffer.from(shot.data, "base64"));
  return file;
}

const BOARD = `document.querySelector('canvas.board-canvas-v7')`;
const SCENE = `globalThis.__UNDEAD_DIRECTION_SCENE__`;
const CLASSIC_LOOK_KEY = "pulpWars.ruleset7.boardClassicLook.v1";
const FACTIONS = ["UNDEAD", "ORIGINAL", "GOBLIN", "DINOSAUR"] as const;

async function zoomTo(
  connection: Connection,
  step: string,
  scene: boolean,
): Promise<void> {
  const canvas = scene ? `${SCENE}.canvas` : BOARD;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await evaluate<string | null>(
      connection,
      `${canvas}?.dataset.zoomStep ?? null`,
    );
    if (current === step) return;
    const zoomIn = Number(current) < Number(step);
    await evaluate(
      connection,
      scene
        ? `${SCENE}.host.zoom(${JSON.stringify(zoomIn ? "IN" : "OUT")})`
        : `(() => { const canvas = ${BOARD}; canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(zoomIn ? "+" : "-")}, bubbles: true })); })()`,
    );
  }
  throw new Error(`could not reach zoom ${step}`);
}

/** Reloads the page (default or classic look) and fills the setup form. */
async function setup(
  connection: Connection,
  url: string,
  classic: boolean,
): Promise<void> {
  await evaluate(connection, `globalThis.__UNDEAD_REVIEW_OLD__ = true`);
  await connection.send("Page.navigate", { url });
  await waitFor(
    connection,
    `globalThis.__UNDEAD_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); ${
      classic
        ? `localStorage.setItem(${JSON.stringify(CLASSIC_LOOK_KEY)}, JSON.stringify({ classic: true }));`
        : `localStorage.removeItem(${JSON.stringify(CLASSIC_LOOK_KEY)});`
    } globalThis.__UNDEAD_REVIEW_OLD__ = true; })()`,
  );
  await connection.send("Page.reload");
  await waitFor(
    connection,
    `globalThis.__UNDEAD_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  await evaluate(
    connection,
    `(() => { const change = (element, value) => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }; change(document.querySelector('#v7-ai-count'), '3'); change(document.querySelector('#v7-map-type'), 'SHOWCASE'); ${JSON.stringify(FACTIONS)}.forEach((faction, seat) => change(document.querySelector('#v7-faction-' + seat), faction)); return true; })()`,
  );
}

async function launch(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="launch"]').click()`,
  );
  await waitFor(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && ${BOARD}?.dataset.artSet === 'CHIBI'; })()`,
    900,
  );
  // Give the board's rasters time to settle.
  await delay(1500);
}

async function showScene(
  connection: Connection,
  options: string,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => { const previous = ${SCENE}; if (previous !== undefined) { previous.host.destroy(); delete ${SCENE}; } const scene = await import('/scripts/art/chibi/review-undead-direction-scene-v7.ts'); ${SCENE} = scene.showUndeadDirectionSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${options}); return true; })()`,
  );
  await waitFor(connection, `${SCENE} !== undefined`);
}

async function clearScene(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { ${SCENE}?.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
  );
}

async function clickButton(
  connection: Connection,
  label: string,
): Promise<void> {
  await evaluate(
    connection,
    `Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === ${JSON.stringify(label)})?.click()`,
  );
  await delay(500);
}

async function captures(directory: string, baseUrl: string): Promise<string[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error(
      "Set CHROME_PATH to a Chrome binary (or pass --skip-capture)",
    );
  const debugPort = 10_700 + (process.pid % 80);
  const profile = await mkdtemp(
    path.join(tmpdir(), "pulp-wars-undead-direction-review-"),
  );
  const url = new URL(baseUrl);
  url.searchParams.set("art", "chibi");
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const files: string[] = [];
  const shot = async (name: string): Promise<void> => {
    files.push(await screenshot(connection, path.join(directory, name)));
  };
  let connection: Connection;
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let attempt = 0; attempt < 150 && target === undefined; attempt += 1) {
      try {
        const response = await fetch(`http://localhost:${debugPort}/json/list`);
        const targets = (await response.json()) as {
          type: string;
          webSocketDebuggerUrl: string;
        }[];
        target = targets.find((candidate) => candidate.type === "page");
      } catch {
        // Chrome may not have opened its debugging port yet.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined)
      throw new Error("Chrome debugging target did not become ready");
    connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    const viewports = [
      { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
      { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
    ] as const;
    for (const viewport of viewports) {
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: viewport.mobile,
      });
      await setup(connection, url.href, false);
      // The setup screen with the Undead chosen for the first seat.
      await evaluate(
        connection,
        `document.querySelector('#v7-faction-0')?.scrollIntoView({ block: 'center' })`,
      );
      await shot(`setup-${viewport.name}.png`);
      await launch(connection);
      for (const step of ["1", "0.75"]) {
        await zoomTo(connection, step, false);
        await shot(`showcase-undead-${viewport.name}-zoom-${step}.png`);
      }
      if (viewport.name === "desktop") {
        // The board cursor starts on the capital: Enter selects the unit on
        // it, and its dock shows the new sprite; Enter again selects the
        // city, whose dock offers the units to train.
        await zoomTo(connection, "1", false);
        await evaluate(connection, `${BOARD}.focus()`);
        await pressKey(connection, "Enter");
        await waitFor(
          connection,
          `document.querySelector('.v7-selection-dock h2') !== null`,
        ).catch(() => undefined);
        await shot("showcase-undead-dock-desktop.png");
        await pressKey(connection, "Enter");
        await delay(500);
        await shot("showcase-undead-train-desktop.png");
        await pressKey(connection, "Escape");
        await clickButton(connection, "Tech");
        await shot("showcase-undead-tech-desktop.png");
        await pressKey(connection, "Escape");
        // Help sits in the compact menu.
        await evaluate(
          connection,
          `document.querySelector('.v7-compact-menu-toggle')?.click()`,
        );
        await delay(300);
        await clickButton(connection, "Help");
        await shot("showcase-undead-help-desktop.png");
        await pressKey(connection, "Escape");
      }
      for (const kind of ["FOUR", "MIXED"] as const) {
        await showScene(connection, `{ kind: '${kind}' }`);
        for (const step of ["1", "0.75"]) {
          await zoomTo(connection, step, true);
          await delay(700);
          await shot(
            `scene-${kind.toLowerCase()}-${viewport.name}-zoom-${step}.png`,
          );
        }
      }
      for (const [magic, name] of [
        ["RAISE_PREVIEW", "raise-preview"],
        ["WAIL_PREVIEW", "wail-preview"],
        ["CUES", "cues"],
        ["CUES_B", "cues-b"],
      ] as const) {
        await showScene(connection, `{ kind: 'MAGIC', magic: '${magic}' }`);
        for (const step of ["1", "0.75"]) {
          await zoomTo(connection, step, true);
          await delay(900);
          await shot(`scene-magic-${name}-${viewport.name}-zoom-${step}.png`);
        }
      }
      if (viewport.name === "desktop") {
        await showScene(connection, `{ kind: 'FOUR', classic: true }`);
        await zoomTo(connection, "1", true);
        await delay(700);
        await shot("scene-four-classic-desktop-zoom-1.png");
      }
      await clearScene(connection);
      if (viewport.name === "desktop") {
        // The same match in the classic look (the previous art).
        await setup(connection, url.href, true);
        await launch(connection);
        await zoomTo(connection, "1", false);
        await shot("showcase-undead-classic-desktop-zoom-1.png");
      }
    }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
  return files;
}

async function waitForServer(url: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await delay(150);
  }
  throw new Error(`Dev server at ${url} did not start`);
}

async function startDevServer(port: number): Promise<ChildProcess> {
  if (port === 6173)
    throw new Error("Port 6173 is the user's dev server; pick another");
  const server = spawn(
    path.join(ROOT, "node_modules/.bin/vite"),
    ["--host", "localhost", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", detached: true },
  );
  await waitForServer(`http://localhost:${port}/`);
  return server;
}

function stopDevServer(server: ChildProcess): void {
  if (server.pid === undefined) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

// ------------------------------------------------------------ main

async function main(): Promise<void> {
  const port = Number(option("--port") ?? "6501");
  const directory = reviewDirectory(ROOT, BATCH);
  await mkdir(directory, { recursive: true });
  const outputs = [
    ...(await sheets(directory)),
    ...(await measurements(directory)),
  ];
  let captureNote = "skipped (--skip-capture)";
  if (!process.argv.includes("--skip-capture")) {
    const given = option("--url");
    const server = given === undefined ? await startDevServer(port) : null;
    try {
      outputs.push(
        ...(await captures(directory, given ?? `http://localhost:${port}/`)),
      );
    } finally {
      if (server !== null) stopDevServer(server);
    }
    captureNote =
      "showcase-undead-*: a Showcase match (16 x 16) launched from the setup form with ?art=chibi in the default look, with an Undead viewer against Human, Goblin and Dinosaur; 'classic' is the same match with Settings > Developer tools > Classic look (previous art) ON. scene-*: the scenes of scripts/art/chibi/review-undead-direction-scene-v7.ts drawn by the real board host with the look the game draws.";
  }
  const images = await Promise.all(
    outputs
      .filter((file) => file.endsWith(".png"))
      .map(async (file) => {
        const bytes = await readFile(file);
        const meta = await sharp(bytes).metadata();
        return {
          file: posix(file),
          width: meta.width,
          height: meta.height,
          sha256: sha256(bytes),
        };
      }),
  );
  await writeFile(
    path.join(directory, "index.json"),
    `${JSON.stringify(
      {
        bead: BEAD,
        batch: BATCH,
        note: "DPR 1 masters; every enlargement is integer nearest-neighbour. The new units, cities and portraits have no owner area: they are drawn as authored for every player.",
        captures: captureNote,
        images,
      },
      null,
      2,
    )}\n`,
  );
  for (const image of images)
    console.log(`${image.file} ${image.width}x${image.height}`);
  console.log(`Undead direction review evidence: ${posix(directory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
