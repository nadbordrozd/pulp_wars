/**
 * Review evidence for the Dinosaur production art of the new visual
 * direction (bead pulp_wars-3tq.13, batch `direction-dinosaur`):
 *
 *   CHROME_PATH=... npm run art:chibi-dinosaur-direction-review -- [--port 6508] [--skip-capture]
 *
 * It writes art/pixellab/reviews/chibi-batch-direction-dinosaur/:
 *
 *   units-old-new-{1x,x4}.png      every Dinosaur unit: today's sprite in the
 *                                  key colour and for a Teal player, the new
 *                                  one on Grass, Forest, Mountain and beside
 *                                  Shallow and Deep Water, and the Human,
 *                                  Undead and Goblin unit of its role
 *   units-zoom-0.75.png            the 1:1 sheet at zoom step 0.75
 *   portraits-old-new-{1x,x4}.png  the eight portraits and the command
 *                                  icons, today and new, on the dock panel
 *   cities-{1x,x4}.png             City 1-3: today, new with the pennant at
 *                                  its recorded anchor, and the Human, Goblin
 *                                  and Undead city
 *   egg-old-new-{1x,x4}.png        the Egg: today in the key colour and for
 *                                  two players, and new on Grass, Forest and
 *                                  the dock panel beside the Caveman
 *   palette.{png,json}             the palette measured on the masters
 *   readability.json               colour differences and unit widths
 *   showcase-dinosaur-{desktop,phone}-zoom-{1,0.75}.png
 *                                  a real Showcase match with a Dinosaur
 *                                  viewer against Human, Undead and Goblin:
 *                                  all four converted factions
 *   showcase-dinosaur-classic-desktop-zoom-1.png   the mixed match with the
 *                                  Classic look developer option on
 *   showcase-dinosaur-{dock,lay,tech,help}-desktop.png
 *                                  the interface in the default look
 *   scene-mixed-{desktop,phone}-zoom-{1,0.75}.png,
 *   scene-mixed-classic-desktop-zoom-1.png
 *                                  the MIXED scene of
 *                                  scripts/art/chibi/review-dinosaur-direction-scene-v7.ts
 *                                  drawn by the real board host
 *
 * Since bead pulp_wars-w5j.3 the four-Dinosaur Showcase and the FOUR scene
 * (four Dinosaur players) are no longer captured: every player plays a
 * different faction (pulp_wars-w5j.1). Their earlier captures stay as
 * history.
 *   index.json                     sizes and hashes
 *
 * `--dinosaur-only` is accepted and changes nothing: this command writes
 * only the Dinosaur evidence. No PixelLab call is made. Captures start Vite
 * on --port (never 6173).
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
import { rgbToHsv } from "./chibi/owner-mask";
import {
  loadRecords,
  productionLayout,
  reviewDirectory,
  sha256,
} from "./chibi/pipeline";

const ROOT = process.cwd();
const BATCH = "direction-dinosaur";
const BEAD = "pulp_wars-3tq.13";

/** Title, file name, the Human, Undead and Goblin unit of the role. */
const UNITS = [
  ["Caveman", "caveman", "fighter", "skeleton", "goblin"],
  ["Raptor", "raptor", "raider", "ghoul", "wolf-rider"],
  ["Spitter", "spitter", "marksman", "banshee", "bomb-chucker"],
  ["Ankylosaurus", "ankylosaurus", "guard", "zombie", "orc-brute"],
  ["Shaman", "shaman", "captain", "necromancer", "orc-warboss"],
  ["Triceratops", "triceratops", "catapult", "lich", "rocket-cart"],
  ["T-Rex", "t-rex", "knight", "vampire", "scrap-buggy"],
  ["Brontosaurus", "brontosaurus", "juggernaut", "abomination", "troll"],
] as const;

/** Title, file name, and whether batch `direction-dinosaur` converts it. */
const ICONS = [
  ["Lay Egg", "lay-egg", true],
  ["Hatch", "hatch", true],
  ["Stampede", "stampede", true],
  ["War Drums", "dinosaur-rally", false],
] as const;

type Rgb = readonly [number, number, number];

const hex = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
const rgbOf = (colour: string): Rgb => [
  Number.parseInt(colour.slice(1, 3), 16),
  Number.parseInt(colour.slice(3, 5), 16),
  Number.parseInt(colour.slice(5, 7), 16),
];

/** Terrain colours measured by the direction studies (untoned rasters). */
const TERRAIN = {
  grass: "#89b75b",
  forest: "#769a51",
  forestDark: "#2d3a37",
  mountain: "#929ca9",
  mountainLightRock: "#d1dbe8",
  shallowWater: "#8fd3dc",
  deepWater: "#4277a5",
} as const;

const BACKGROUNDS = {
  grass: "rgb(137,183,91)",
  forest: "rgb(118,154,81)",
  mountain: "rgb(162,170,182)",
  shallow: "rgb(143,211,220)",
  deep: "rgb(66,119,165)",
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
        // here in the Teal player's colour.
        const x = artLeft + cell.flag.x * scale;
        const y = artTop + cell.flag.y * scale;
        const w = 17 * scale;
        const h = 11 * scale;
        overlays.push(
          cell.flag.pole > 0
            ? `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cell.flag.pole * scale}" stroke="#4a3b2e" stroke-width="${2.6 * scale}"/>`
            : "",
          `<polygon points="${x},${y} ${x + w},${y} ${x + w * 0.72},${y + h / 2} ${x + w},${y + h} ${x},${y + h}" fill="${RULESET7_PLAYER_COLORS.TEAL}" stroke="#14584f" stroke-width="${1.2 * scale}"/>`,
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
  const master = (id: string): string => {
    const record = records.assets[id];
    if (record?.status !== "ACCEPTED")
      throw new Error(`${id} has no accepted record`);
    return record.master.path;
  };
  const files: string[] = [];
  const units = "public/assets/chibi/units";

  const unitRows: Row[] = await Promise.all(
    UNITS.map(async ([title, name, human, undead, goblin]) => {
      const today = `${units}/chibi-dinosaur-${name}.png`;
      const fresh = master(`chibi-direction-dinosaur-${name}`);
      return {
        title,
        cells: [
          { image: today, label: "today (key red)", background: "grass" },
          {
            image: await recoloured(
              today,
              `${units}/chibi-dinosaur-${name}.mask.png`,
              RULESET7_PLAYER_COLORS.TEAL,
            ),
            label: "today, Teal player",
            background: "grass",
          },
          { image: fresh, label: "new (fixed colours)", background: "grass" },
          { image: fresh, label: "new, on Forest", background: "forest" },
          { image: fresh, label: "new, on Mountain", background: "mountain" },
          { image: fresh, label: "new, Shallow Water", background: "shallow" },
          { image: fresh, label: "new, Deep Water", background: "deep" },
          {
            image: `${units}/chibi-direction-${human}.png`,
            label: "Human of the role",
            background: "grass",
          },
          {
            image: `${units}/chibi-direction-undead-${undead}.png`,
            label: "Undead of the role",
            background: "grass",
          },
          {
            image: `${units}/chibi-direction-goblin-${goblin}.png`,
            label: "Goblin of the role",
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
    ...UNITS.map(([title, name, human, undead, goblin]) => ({
      title,
      cells: [
        {
          image: `${portraits}/chibi-portrait-dinosaur-${name}.png`,
          label: "today (key red)",
          background: "panel",
        },
        {
          image: master(`chibi-direction-portrait-dinosaur-${name}`),
          label: "new",
          background: "panel",
        },
        {
          image: master(`chibi-direction-dinosaur-${name}`),
          label: "the map sprite",
          background: "panel",
        },
        {
          image: `${portraits}/chibi-direction-portrait-${human}.png`,
          label: "Human",
          background: "panel",
        },
        {
          image: `${portraits}/chibi-direction-portrait-undead-${undead}.png`,
          label: "Undead",
          background: "panel",
        },
        {
          image: `${portraits}/chibi-direction-portrait-goblin-${goblin}.png`,
          label: "Goblin",
          background: "panel",
        },
      ] satisfies Cell[],
    })),
    ...ICONS.map(([title, name, converted]) => ({
      title: `${title} (icon)`,
      cells: [
        {
          image: `${icons}/chibi-icon-action-${name}.png`,
          label: converted ? "today" : "unchanged",
          background: "panel",
        },
        ...(converted
          ? [
              {
                image: master(`chibi-direction-icon-action-${name}`),
                label: "new",
                background: "panel",
              } satisfies Cell,
            ]
          : []),
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
        { width: 96, height: 108 },
        scale,
      ),
    );

  const settlements = "public/assets/chibi/settlements";
  const flag = (id: string): NonNullable<Cell["flag"]> => {
    const anchor = DIRECTION_FLAG_ANCHORS_V7[id];
    if (anchor === undefined) throw new Error(`${id} has no pennant anchor`);
    return anchor;
  };
  const cityRows: Row[] = await Promise.all(
    [1, 2, 3].map(async (level) => ({
      title: `City ${level}`,
      cells: [
        {
          image: `${settlements}/chibi-dinosaur-city-${level}.png`,
          label: "today (key red tents)",
          background: "grass",
        },
        {
          image: await recoloured(
            `${settlements}/chibi-dinosaur-city-${level}.png`,
            `${settlements}/chibi-dinosaur-city-${level}.mask.png`,
            RULESET7_PLAYER_COLORS.TEAL,
          ),
          label: "today, Teal player",
          background: "grass",
        },
        {
          image: master(`chibi-direction-dinosaur-city-${level}`),
          label: "new, as authored",
          background: "grass",
        },
        {
          image: master(`chibi-direction-dinosaur-city-${level}`),
          label: "new, with the pennant",
          background: "grass",
          flag: flag(`chibi-direction-dinosaur-city-${level}`),
        },
        {
          image: `${settlements}/chibi-direction-city-${level}.png`,
          label: "Human",
          background: "grass",
          flag: flag(`chibi-direction-city-${level}`),
        },
        {
          image: `${settlements}/chibi-direction-goblin-city-${level}.png`,
          label: "Goblin",
          background: "grass",
          flag: flag(`chibi-direction-goblin-city-${level}`),
        },
        {
          image: `${settlements}/chibi-direction-undead-city-${level}.png`,
          label: "Undead",
          background: "grass",
          flag: flag(`chibi-direction-undead-city-${level}`),
        },
      ] satisfies Cell[],
    })),
  );
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

  const egg = `${units}/chibi-dinosaur-egg.png`;
  const eggMask = `${units}/chibi-dinosaur-egg.mask.png`;
  const newEgg = master("chibi-direction-dinosaur-egg");
  const eggRows: Row[] = [
    {
      title: "Egg, today",
      cells: [
        { image: egg, label: "key red", background: "grass" },
        {
          image: await recoloured(egg, eggMask, RULESET7_PLAYER_COLORS.TEAL),
          label: "Teal player",
          background: "grass",
        },
        {
          image: await recoloured(egg, eggMask, RULESET7_PLAYER_COLORS.GOLD),
          label: "Gold player",
          background: "grass",
        },
        {
          image: `${units}/chibi-dinosaur-caveman.png`,
          label: "Caveman, today",
          background: "grass",
        },
      ],
    },
    {
      title: "Egg, new",
      cells: [
        { image: newEgg, label: "every player", background: "grass" },
        { image: newEgg, label: "on Forest", background: "forest" },
        { image: newEgg, label: "on the dock panel", background: "panel" },
        {
          image: master("chibi-direction-dinosaur-caveman"),
          label: "Caveman, new",
          background: "grass",
        },
      ],
    },
  ];
  for (const [suffix, scale] of [
    ["1x", 1],
    ["x4", 4],
  ] as const)
    files.push(
      await writeGrid(
        path.join(directory, `egg-old-new-${suffix}.png`),
        eggRows,
        { width: 64, height: 84 },
        scale,
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

type Material = "hide" | "navy" | "cream" | "accent" | "fur";
const MATERIALS: readonly Material[] = [
  "hide",
  "navy",
  "cream",
  "accent",
  "fur",
];

/**
 * Material of an opaque pixel of a new Dinosaur master, by colour: the
 * accent is the saturated red-orange band, hide a mid to light blue, navy a
 * dark blue, cream the pale warm tones (belly, jaws, claws, bone, and the
 * cavemen's light golden skin, which is the same colour family), fur the
 * duller tawny browns.
 */
function material(r: number, g: number, b: number): Material | null {
  const { hue, saturation, value } = rgbToHsv(r, g, b);
  if (hue >= 8 && hue <= 45 && saturation >= 0.75 && value >= 0.55)
    return "accent";
  if (hue >= 195 && hue <= 260 && saturation >= 0.35)
    return value >= 0.36 ? "hide" : value >= 0.1 ? "navy" : null;
  if (hue >= 25 && hue <= 60 && value >= 0.85 && saturation < 0.75)
    return "cream";
  if (
    hue >= 20 &&
    hue <= 50 &&
    saturation >= 0.3 &&
    saturation < 0.75 &&
    value >= 0.35 &&
    value < 0.85
  )
    return "fur";
  return null;
}

interface Measured {
  readonly opaque: number;
  readonly share: Readonly<Record<Material, number>>;
  readonly commonest: Readonly<Record<Material, string | null>>;
  readonly mean: Readonly<Record<Material, string | null>>;
  /** Mean hue of the accent pixels, in degrees. */
  readonly accentHue: number | null;
  readonly width: number;
  readonly footWidth: number;
}

function measure(raster: Raster): Measured {
  const counts = Object.fromEntries(
    MATERIALS.map((kind) => [kind, new Map<string, number>()]),
  ) as Record<Material, Map<string, number>>;
  const sums = Object.fromEntries(
    MATERIALS.map((kind) => [kind, [0, 0, 0, 0]]),
  ) as Record<Material, number[]>;
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
      const sum = sums[kind];
      sum[0] = (sum[0] ?? 0) + rgb[0];
      sum[1] = (sum[1] ?? 0) + rgb[1];
      sum[2] = (sum[2] ?? 0) + rgb[2];
      sum[3] = (sum[3] ?? 0) + 1;
    }
  const top = (kind: Material): string | null =>
    [...counts[kind].entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const mean = (kind: Material): string | null => {
    const [r = 0, g = 0, b = 0, n = 0] = sums[kind];
    return n === 0 ? null : hex([r / n, g / n, b / n]);
  };
  const accentMean = mean("accent");
  return {
    opaque,
    share: Object.fromEntries(
      MATERIALS.map((kind) => [
        kind,
        Math.round(((sums[kind][3] ?? 0) / Math.max(1, opaque)) * 1000) / 10,
      ]),
    ) as Record<Material, number>,
    commonest: Object.fromEntries(
      MATERIALS.map((kind) => [kind, top(kind)]),
    ) as Record<Material, string | null>,
    mean: Object.fromEntries(
      MATERIALS.map((kind) => [kind, mean(kind)]),
    ) as Record<Material, string | null>,
    accentHue:
      accentMean === null
        ? null
        : Math.round(rgbToHsv(...rgbOf(accentMean)).hue),
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

/** The six dinosaurs (hide, navy, cream, accent) and the two cavemen. */
const DINOSAURS = [
  "raptor",
  "spitter",
  "ankylosaurus",
  "triceratops",
  "t-rex",
  "brontosaurus",
] as const;

async function measurements(directory: string): Promise<string[]> {
  const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
  const perUnit: Record<string, unknown> = {};
  const byName = new Map<string, Measured>();
  for (const [title, name] of UNITS) {
    const record = records.assets[`chibi-direction-dinosaur-${name}`];
    if (record === undefined) throw new Error(`${name} is not accepted`);
    const raster = await load(record.master.path);
    const measured = measure(raster);
    byName.set(name, measured);
    const plate = plateWidth(raster);
    perUnit[title] = {
      master: record.master.path,
      recipe: `${record.recipe} (candidate ${record.candidate})`,
      opaquePixels: measured.opaque,
      sharePercent: measured.share,
      commonest: measured.commonest,
      mean: measured.mean,
      accentHueDegrees: measured.accentHue,
      widthPx: measured.width,
      feetWidthPx: measured.footWidth,
      plateWidthPx: plate,
      widerThanPlate: measured.width > plate,
      feetWiderThanPlate: measured.footWidth > plate,
    };
  }
  const need = (name: string): Measured => {
    const measured = byName.get(name);
    if (measured === undefined) throw new Error(name);
    return measured;
  };
  const colour = (value: string | null, what: string): string => {
    if (value === null) throw new Error(`no ${what} measured`);
    return value;
  };
  // The variant chosen by the user: the T-Rex of the study's F.
  const hideLit = colour(need("t-rex").commonest.hide, "hide");
  const hideShade = colour(need("raptor").commonest.hide, "hide shade");
  const navy = colour(need("t-rex").commonest.navy, "navy");
  const cream = colour(need("t-rex").commonest.cream, "cream");
  const accent = colour(need("raptor").commonest.accent, "accent");
  const accentLit = "#fe7500";
  const caveman = need("caveman");
  const fur = colour(caveman.commonest.fur, "fur");
  const furMean = colour(caveman.mean.fur, "fur mean");
  const skin = colour(caveman.commonest.cream, "skin");
  const shamanFur = colour(need("shaman").commonest.fur, "Shaman fur");
  const plates = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
  const plate = (name: string): string => {
    const found = plates.find(([key]) => key === name)?.[1];
    if (found === undefined) throw new Error(name);
    return found;
  };
  const goblin = {
    leather: "#955627",
    fireworksOrange: "#e86e0c",
    fireworksRed: "#e00c02",
    fireworksYellow: "#fec100",
  } as const;
  const hides = DINOSAURS.map((name) => ({
    unit: name,
    commonest: need(name).commonest.hide,
    mean: need(name).mean.hide,
    accentHueDegrees: need(name).accentHue,
  }));
  const readability = {
    bead: BEAD,
    note: "deltaE is CIE76 in L*a*b* (about 2 is just noticeable, 10 is clear at a glance, 20 and more are different colours); contrast is the WCAG luminance ratio (1 to 21). Terrain colours are those the direction studies measured on the untoned rasters. Materials are classified by colour on the accepted masters: cream holds the belly, jaws, claws and bone, and on the two cavemen their light golden skin. The plate width is that of drawDirectedUnitBaseV7.",
    accent: {
      note: "The red-orange PixelLab draws, kept as generated: no accent step in the pipeline. The mean hue of the accent pixels per sprite:",
      hueDegreesPerUnit: Object.fromEntries(
        UNITS.map(([title, name]) => [title, need(name).accentHue]),
      ),
      pairs: [
        pair("accent", accent, "Coral plate", plate("CORAL")),
        pair("accent", accent, "Gold plate", plate("GOLD")),
        pair("accent, lit", accentLit, "Coral plate", plate("CORAL")),
        pair("accent, lit", accentLit, "Gold plate", plate("GOLD")),
        pair("accent", accent, "Teal plate", plate("TEAL")),
        pair("accent", accent, "Violet plate", plate("VIOLET")),
        pair(
          "accent",
          accent,
          "Goblin fireworks orange",
          goblin.fireworksOrange,
        ),
        pair("accent", accent, "Goblin fireworks red", goblin.fireworksRed),
        pair(
          "accent",
          accent,
          "Goblin fireworks yellow",
          goblin.fireworksYellow,
        ),
        pair("accent", accent, "Goblin leather", goblin.leather),
        pair("accent", accent, "Grass", TERRAIN.grass),
        pair("accent", accent, "hide, lit", hideLit),
        pair("accent", accent, "navy", navy),
      ],
    },
    hide: {
      perDinosaur: hides,
      pairs: [
        pair("hide, lit", hideLit, "Grass", TERRAIN.grass),
        pair("hide, lit", hideLit, "Forest (mean)", TERRAIN.forest),
        pair("hide, lit", hideLit, "Shallow Water", TERRAIN.shallowWater),
        pair("hide, lit", hideLit, "Deep Water", TERRAIN.deepWater),
        pair("hide, lit", hideLit, "Mountain (mean)", TERRAIN.mountain),
        pair("hide, shade", hideShade, "Grass", TERRAIN.grass),
        pair("hide, shade", hideShade, "Shallow Water", TERRAIN.shallowWater),
        pair("hide, shade", hideShade, "Deep Water", TERRAIN.deepWater),
        pair("navy", navy, "Deep Water", TERRAIN.deepWater),
        pair("navy", navy, "Forest (dark tones)", TERRAIN.forestDark),
        pair("hide, lit", hideLit, "Teal plate", plate("TEAL")),
        pair("hide, lit", hideLit, "Violet plate", plate("VIOLET")),
        pair("hide, lit", hideLit, "navy", navy),
      ],
    },
    cream: [
      pair("cream", cream, "Grass", TERRAIN.grass),
      pair("cream", cream, "Mountain (mean)", TERRAIN.mountain),
      pair("cream", cream, "Mountain (light rock)", TERRAIN.mountainLightRock),
      pair("cream", cream, "hide, lit", hideLit),
    ],
    caveman: [
      pair("Caveman fur", fur, "Caveman skin", skin),
      pair("Caveman fur (mean)", furMean, "Caveman skin", skin),
      pair("Caveman fur", fur, "Goblin leather", goblin.leather),
      pair("Caveman fur", fur, "Gold plate", plate("GOLD")),
      pair("Caveman fur", fur, "Grass", TERRAIN.grass),
      pair("Caveman skin", skin, "Gold plate", plate("GOLD")),
      pair("Caveman skin", skin, "Grass", TERRAIN.grass),
      pair("Shaman fur", shamanFur, "Caveman skin", skin),
      pair("Shaman fur", shamanFur, "Gold plate", plate("GOLD")),
      pair("war paint", accent, "Caveman skin", skin),
    ],
    units: perUnit,
  };
  const readabilityFile = path.join(directory, "readability.json");
  await writeFile(readabilityFile, `${JSON.stringify(readability, null, 2)}\n`);

  const meanShare = (kind: Material, names: readonly string[]): number =>
    Math.round(
      (names.reduce((sum, name) => sum + need(name).share[kind], 0) /
        names.length) *
        10,
    ) / 10;
  const cavemen = ["caveman", "shaman"] as const;
  const swatches = [
    {
      role: "Hide, lit and shade",
      colours: [hideLit, hideShade, "#30608f", "#2f5595"],
      share: `${meanShare("hide", DINOSAURS)}% of the six dinosaurs (mean)`,
    },
    {
      role: "Navy (back, plates, frills)",
      colours: [navy, "#12173b", "#042651", "#2c2f5c"],
      share: `${meanShare("navy", DINOSAURS)}% of the six dinosaurs (mean)`,
    },
    {
      role: "Cream (belly, jaws, claws, bone)",
      colours: [cream, "#f7dda3", "#fdeea4"],
      share: `${meanShare("cream", DINOSAURS)}% of the six dinosaurs (mean)`,
    },
    {
      role: "Red-orange accent",
      colours: [accentLit, accent, "#fb5000", "#a82f00"],
      share: `${meanShare("accent", DINOSAURS)}% of the six dinosaurs, ${meanShare("accent", cavemen)}% of the cavemen`,
    },
    {
      role: "Tawny fur and its spots",
      colours: [fur, shamanFur, "#7c593b", "#371800"],
      share: `${meanShare("fur", cavemen)}% of the two cavemen (mean)`,
    },
    {
      role: "Caveman skin",
      colours: [skin, "#e59f4a"],
      share: null,
    },
    {
      role: "Egg shell and speckles",
      colours: ["#fff3cf", "#f5cb7f", "#fd8a00", "#cf6501"],
      share: null,
    },
    {
      role: "Player plates",
      colours: plates.map(([, value]) => value),
      share: null,
    },
    {
      role: "Shallow and Deep Water, Grass",
      colours: [TERRAIN.shallowWater, TERRAIN.deepWater, TERRAIN.grass],
      share: null,
    },
    {
      role: "Goblin leather and fireworks",
      colours: [
        goblin.leather,
        goblin.fireworksOrange,
        goblin.fireworksRed,
        goblin.fireworksYellow,
      ],
      share: null,
    },
    {
      role: "Human crimson and gold, Undead violet",
      colours: ["#b0282e", "#e2b63f", "#a221ee"],
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
          (value, at) =>
            `<rect x="${300 + at * 74}" y="${top}" width="34" height="34" fill="${value}" stroke="#0c0f10"/><text x="${300 + at * 74}" y="${top + 42}" font-family="Helvetica, Arial, sans-serif" font-size="9" fill="#cfd6cf" transform="translate(36,-12)">${value}</text>`,
        )
        .join("");
      return `<text x="10" y="${top + 16}" font-family="Helvetica, Arial, sans-serif" font-size="13" font-weight="700" fill="#f4f1e8">${escapeXml(swatch.role)}</text>${
        swatch.share === null
          ? ""
          : `<text x="10" y="${top + 31}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#cfd6cf">${escapeXml(swatch.share)}</text>`
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
const SCENE = `globalThis.__DINOSAUR_DIRECTION_SCENE__`;
const CLASSIC_LOOK_KEY = "pulpWars.ruleset7.boardClassicLook.v1";
const MIXED_FACTIONS = ["DINOSAUR", "ORIGINAL", "UNDEAD", "GOBLIN"] as const;

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
  factions: readonly string[] = MIXED_FACTIONS,
): Promise<void> {
  await evaluate(connection, `globalThis.__DINOSAUR_REVIEW_OLD__ = true`);
  await connection.send("Page.navigate", { url });
  await waitFor(
    connection,
    `globalThis.__DINOSAUR_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); ${
      classic
        ? `localStorage.setItem(${JSON.stringify(CLASSIC_LOOK_KEY)}, JSON.stringify({ classic: true }));`
        : `localStorage.removeItem(${JSON.stringify(CLASSIC_LOOK_KEY)});`
    } globalThis.__DINOSAUR_REVIEW_OLD__ = true; })()`,
  );
  await connection.send("Page.reload");
  await waitFor(
    connection,
    `globalThis.__DINOSAUR_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  await evaluate(
    connection,
    `(() => { const change = (element, value) => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }; change(document.querySelector('#v7-ai-count'), '3'); change(document.querySelector('#v7-map-type'), 'SHOWCASE'); ${JSON.stringify(factions)}.forEach((faction, seat) => change(document.querySelector('#v7-faction-' + seat), faction)); return true; })()`,
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
    `(async () => { const previous = ${SCENE}; if (previous !== undefined) { previous.host.destroy(); delete ${SCENE}; } const scene = await import('/scripts/art/chibi/review-dinosaur-direction-scene-v7.ts'); ${SCENE} = scene.showDinosaurDirectionSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${options}); return true; })()`,
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
  const debugPort = 10_780 + (process.pid % 80);
  const profile = await mkdtemp(
    path.join(tmpdir(), "pulp-wars-dinosaur-direction-review-"),
  );
  const url = new URL(baseUrl);
  url.searchParams.set("art", "chibi");
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--mute-audio",
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
      // A Dinosaur viewer against Human, Undead and Goblin: the four
      // converted factions on one board.
      await setup(connection, url.href, false);
      await launch(connection);
      for (const step of ["1", "0.75"]) {
        await zoomTo(connection, step, false);
        await shot(`showcase-dinosaur-${viewport.name}-zoom-${step}.png`);
      }
      if (viewport.name === "desktop") {
        // The board cursor starts on the capital: Enter selects the unit on
        // it, and its dock shows the new sprite; Enter again selects the
        // city, whose dock offers the Eggs to lay.
        await zoomTo(connection, "1", false);
        await evaluate(connection, `${BOARD}.focus()`);
        await pressKey(connection, "Enter");
        await waitFor(
          connection,
          `document.querySelector('.v7-selection-dock h2') !== null`,
        ).catch(() => undefined);
        await shot("showcase-dinosaur-dock-desktop.png");
        await pressKey(connection, "Enter");
        await delay(500);
        await shot("showcase-dinosaur-lay-desktop.png");
        await pressKey(connection, "Escape");
        await clickButton(connection, "Tech");
        await shot("showcase-dinosaur-tech-desktop.png");
        await pressKey(connection, "Escape");
        // Help sits in the compact menu.
        await evaluate(
          connection,
          `document.querySelector('.v7-compact-menu-toggle')?.click()`,
        );
        await delay(300);
        await clickButton(connection, "Help");
        await shot("showcase-dinosaur-help-desktop.png");
        await pressKey(connection, "Escape");
      }
      // The FOUR scene (four Dinosaur players) is no longer captured:
      // every player plays a different faction since bead pulp_wars-w5j.1
      // (dropped in pulp_wars-w5j.3).
      for (const kind of ["MIXED"] as const) {
        await showScene(connection, `{ kind: '${kind}' }`);
        for (const step of ["1", "0.75"]) {
          await zoomTo(connection, step, true);
          await delay(700);
          await shot(
            `scene-${kind.toLowerCase()}-${viewport.name}-zoom-${step}.png`,
          );
        }
      }
      if (viewport.name === "desktop") {
        await showScene(connection, `{ kind: 'MIXED', classic: true }`);
        await zoomTo(connection, "1", true);
        await delay(700);
        await shot("scene-mixed-classic-desktop-zoom-1.png");
      }
      await clearScene(connection);
      // The former "four Dinosaur seats" Showcase is gone: the setup form
      // keeps every seat's faction distinct (pulp_wars-w5j.1).
      if (viewport.name === "desktop") {
        // The mixed match in the classic look (the previous art).
        await setup(connection, url.href, true);
        await launch(connection);
        await zoomTo(connection, "1", false);
        await shot("showcase-dinosaur-classic-desktop-zoom-1.png");
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
  const port = Number(option("--port") ?? "6508");
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
      "showcase-dinosaur-*: a Showcase match (16 x 16) launched from the setup form with ?art=chibi in the default look, with a Dinosaur viewer against Human, Undead and Goblin (all four converted factions; the former four-Dinosaur match is gone, every player plays a different faction since pulp_wars-w5j.1); 'classic' is the mixed match with Settings > Developer tools > Classic look (previous art) ON. scene-*: the MIXED scene of scripts/art/chibi/review-dinosaur-direction-scene-v7.ts drawn by the real board host with the look the game draws (no base plates since pulp_wars-w5j.3), and in the Classic look.";
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
        note: "DPR 1 masters; every enlargement is integer nearest-neighbour. The new units, the Egg, cities and portraits have no owner area: they are drawn as authored for every player.",
        captures: captureNote,
        images,
      },
      null,
      2,
    )}\n`,
  );
  for (const image of images)
    console.log(`${image.file} ${image.width}x${image.height}`);
  console.log(`Dinosaur direction review evidence: ${posix(directory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
