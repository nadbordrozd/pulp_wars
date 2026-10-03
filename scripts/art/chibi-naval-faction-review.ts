/**
 * Review evidence of the faction-styled naval art (bead pulp_wars-w5j.2,
 * batches `naval-<faction>`, docs/art/NAVAL_FACTIONS.md).
 *
 *   npm run art:chibi-naval-faction-review
 *   npm run art:chibi-naval-faction-review -- --skip-capture
 *   npm run art:chibi-naval-faction-review -- --port 6530 --copy-to DIR
 *
 * Writes art/pixellab/reviews/chibi-batch-naval-factions/:
 *
 * - `naval-sheet-{x4,1x}.png` and `naval-sheet-zoom-0.75.png`: one row per
 *   naval sprite (the Patrol Boat, the Battleship and the embarked
 *   transport, each on Shallow and on Deep Water, and the two portraits on
 *   the dock panel); the columns are today's shared sprite through the
 *   runtime recolour for a Coral and a Teal player, then the Human, Undead,
 *   Goblin, Dinosaur, Martian and Ice Folk sprite;
 * - `readability.json`: each faction's ships against the two water colours
 *   and how far apart the six factions' ships are, measured on the masters;
 * - `scene-{coast,mixed}-{desktop,phone}-zoom-{1,0.75}.png`: the scenes of
 *   scripts/art/naval-factions/scene.ts drawn by the real board host in the
 *   live look **without base plates or rings**: each faction's ships on
 *   Shallow and Deep Water beside its coastal city, and the six fleets
 *   mixed;
 * - `index.json`.
 *
 * Captures start Vite on port 6530 unless `--port` says otherwise, need
 * CHROME_PATH, and are written after the browser closes (a file written
 * under the project while the page is open makes the dev server reload).
 * `--copy-to DIR` copies the key sheets and captures to DIR.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
// Type only: the manifest module builds its URLs from Vite's
// import.meta.env, which tsx does not provide, so this script finds the
// masters by their asset ids (a test checks ids and URLs agree).
import type { NavalArtRoleV7 } from "../../src/assets/chibi-naval-faction-art-manifest";
import type { FactionIdV7 } from "../../src/engine/index";
import {
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";
import { rgbToHsv, type RgbaRaster } from "./chibi/owner-mask";
import { readRaster } from "./chibi/pipeline";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "art/pixellab/reviews/chibi-batch-naval-factions");
type Rgb = readonly [number, number, number];

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

/** Faction, label and the slug of its batch and asset ids. */
const FACTIONS: readonly (readonly [FactionIdV7, string, string])[] = [
  ["ORIGINAL", "Human", "human"],
  ["UNDEAD", "Undead", "undead"],
  ["GOBLIN", "Goblin", "goblin"],
  ["DINOSAUR", "Dinosaur", "dinosaur"],
  ["MARTIAN", "Martian", "martian"],
  ["ICE_FOLK", "Ice Folk", "ice-folk"],
];
const ROLE_KEY: Readonly<Record<NavalArtRoleV7, string>> = {
  PATROL_BOAT: "patrol-boat",
  BATTLESHIP: "battleship",
  EMBARKED_TRANSPORT: "transport",
};

/** Each naval sprite: its role, kind, today's shared master, its label. */
const SPRITES: readonly {
  readonly role: NavalArtRoleV7;
  readonly kind: "UNIT" | "PORTRAIT";
  readonly today: string;
  readonly label: string;
}[] = [
  {
    role: "PATROL_BOAT",
    kind: "UNIT",
    today: "units/chibi-patrol-boat",
    label: "Patrol Boat",
  },
  {
    role: "BATTLESHIP",
    kind: "UNIT",
    today: "units/chibi-battleship",
    label: "Battleship",
  },
  {
    role: "EMBARKED_TRANSPORT",
    kind: "UNIT",
    today: "units/chibi-embarked-transport",
    label: "Transport",
  },
  {
    role: "PATROL_BOAT",
    kind: "PORTRAIT",
    today: "portraits/chibi-portrait-patrol-boat",
    label: "Patrol Boat portrait",
  },
  {
    role: "BATTLESHIP",
    kind: "PORTRAIT",
    today: "portraits/chibi-portrait-battleship",
    label: "Battleship portrait",
  },
];

const chibi = (file: string): string =>
  path.join(ROOT, "public/assets/chibi", `${file}.png`);

function navalFile(
  faction: FactionIdV7,
  role: NavalArtRoleV7,
  kind: "UNIT" | "PORTRAIT",
): string {
  const slug = FACTIONS.find(([id]) => id === faction)?.[2];
  if (slug === undefined) throw new Error(`no naval art for ${faction}`);
  return kind === "UNIT"
    ? chibi(`units/chibi-naval-${slug}-${ROLE_KEY[role]}`)
    : chibi(`portraits/chibi-naval-${slug}-portrait-${ROLE_KEY[role]}`);
}

// ------------------------------------------------------------ rasters

interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

const hexOf = (rgb: Rgb): string =>
  `#${rgb.map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;

function blank(width: number, height: number, rgb: Rgb): Canvas {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1)
    data.set([rgb[0], rgb[1], rgb[2], 255], index * 4);
  return { width, height, data };
}

/** Alpha-over blit with an integer nearest-neighbour scale. */
function blit(
  target: Canvas,
  source: RgbaRaster | Canvas,
  left: number,
  top: number,
  scale = 1,
): void {
  for (let y = 0; y < source.height * scale; y += 1)
    for (let x = 0; x < source.width * scale; x += 1) {
      const tx = Math.round(left) + x;
      const ty = Math.round(top) + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const s =
        (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      const alpha = (source.data[s + 3] ?? 0) / 255;
      if (alpha === 0) continue;
      const t = (ty * target.width + tx) * 4;
      for (let channel = 0; channel < 3; channel += 1)
        target.data[t + channel] = Math.round(
          (source.data[s + channel] ?? 0) * alpha +
            (target.data[t + channel] ?? 0) * (1 - alpha),
        );
    }
}

/** A tile repeated to fill `width` x `height`. */
function tiled(tile: RgbaRaster, width: number, height: number): Canvas {
  const canvas = blank(width, height, [0, 0, 0]);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const s = ((y % tile.height) * tile.width + (x % tile.width)) * 4;
      canvas.data.set(tile.data.subarray(s, s + 4), (y * width + x) * 4);
    }
  return canvas;
}

/** Today's shared sprite recoloured through its mask, as the runtime does. */
async function recoloured(today: string, colour: string): Promise<RgbaRaster> {
  const art = await readRaster(chibi(today));
  const mask = await readRaster(chibi(`${today}.mask`));
  const owner = parseHexColourV7(colour);
  if (owner === null) throw new Error(colour);
  return {
    width: art.width,
    height: art.height,
    data: new Uint8Array(
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

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

interface Label {
  readonly text: string;
  readonly left: number;
  readonly top: number;
  readonly size?: number;
}

const written: string[] = [];

async function writeSheet(
  name: string,
  canvas: Canvas,
  labels: readonly Label[],
): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">${labels
    .map(
      (label) =>
        `<text x="${label.left}" y="${label.top + (label.size ?? 14)}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size ?? 14}" font-weight="700" fill="#f4f1e8">${escapeXml(label.text)}</text>`,
    )
    .join("")}</svg>`;
  await sharp(Buffer.from(canvas.data), {
    raw: { width: canvas.width, height: canvas.height, channels: 4 },
  })
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name));
  written.push(name);
  console.log(`wrote ${name}`);
}

const PAPER: Rgb = [30, 33, 40];
/** The dock panel behind portraits in the interface. */
const PANEL: Rgb = [38, 44, 52];
const GAP = 8;

async function navalSheet(scale: number, name: string): Promise<void> {
  const shallow = await readRaster(chibi("terrain/chibi-shallow-water-1"));
  const deep = await readRaster(chibi("terrain/chibi-deep-water-1"));
  const columns = [
    { label: "Today, Coral", colour: RULESET7_PLAYER_COLORS.CORAL },
    { label: "Today, Teal", colour: RULESET7_PLAYER_COLORS.TEAL },
    ...FACTIONS.map(([, label]) => ({ label, colour: null })),
  ];
  const rows: {
    title: string;
    sprite: (typeof SPRITES)[number];
    ground: RgbaRaster | null;
  }[] = [];
  for (const sprite of SPRITES)
    if (sprite.kind === "UNIT") {
      rows.push({ title: `${sprite.label}, Shallow`, sprite, ground: shallow });
      rows.push({ title: `${sprite.label}, Deep`, sprite, ground: deep });
    } else rows.push({ title: sprite.label, sprite, ground: null });
  const cellW = 88 * scale + GAP;
  const titleW = scale >= 4 ? 260 : 190;
  const headerH = 26;
  const canvasHeight: Readonly<Record<NavalArtRoleV7, number>> = {
    PATROL_BOAT: 88,
    BATTLESHIP: 96,
    EMBARKED_TRANSPORT: 72,
  };
  const heights = rows.map(
    (row) =>
      (row.sprite.kind === "UNIT" ? canvasHeight[row.sprite.role] : 48) * scale,
  );
  const width = titleW + columns.length * cellW + GAP;
  const height =
    headerH + heights.reduce((sum, value) => sum + value + GAP, 0) + GAP;
  const canvas = blank(width, height, PAPER);
  const labels: Label[] = columns.map((column, index) => ({
    text: column.label,
    left: titleW + index * cellW,
    top: 4,
    size: scale >= 4 ? 16 : 12,
  }));
  let top = headerH;
  for (const [rowIndex, row] of rows.entries()) {
    const rowHeight = heights[rowIndex] ?? 0;
    labels.push({
      text: row.title,
      left: 8,
      top: top + rowHeight / 2 - 8,
      size: scale >= 4 ? 16 : 11,
    });
    for (const [index, column] of columns.entries()) {
      const sprite =
        column.colour === null
          ? await readRaster(
              navalFile(
                FACTIONS[index - 2]?.[0] ?? "ORIGINAL",
                row.sprite.role,
                row.sprite.kind,
              ),
            )
          : await recoloured(row.sprite.today, column.colour);
      const left = titleW + index * cellW;
      const ground =
        row.ground === null
          ? blank(sprite.width * scale, sprite.height * scale, PANEL)
          : tiled(row.ground, sprite.width * scale, sprite.height * scale);
      blit(canvas, ground, left, top);
      blit(canvas, sprite, left, top, scale);
    }
    top += rowHeight + GAP;
  }
  await writeSheet(name, canvas, labels);
}

// ------------------------------------------------------------ measurements

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
function lab(rgb: Rgb): readonly [number, number, number] {
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIE76: about 10 is clear at a glance, 20 and more are different colours. */
function deltaE(left: Rgb, right: Rgb): number {
  const a = lab(left);
  const b = lab(right);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const luminance = (rgb: Rgb): number =>
  0.2126 * toLinear(rgb[0]) +
  0.7152 * toLinear(rgb[1]) +
  0.0722 * toLinear(rgb[2]);

/** WCAG contrast ratio, 1 (none) to 21. */
function contrast(left: Rgb, right: Rgb): number {
  const [hi, lo] = [luminance(left), luminance(right)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Machado, Oliveira and Fernandes 2009, severity 1.0, in linear RGB. */
const DEUTERANOPIA = [
  0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182,
  0.04294, 0.968881,
] as const;

function deuteranope(rgb: Rgb): Rgb {
  const m = DEUTERANOPIA;
  const [r, g, b] = [toLinear(rgb[0]), toLinear(rgb[1]), toLinear(rgb[2])];
  return [
    toSrgb(m[0] * r + m[1] * g + m[2] * b),
    toSrgb(m[3] * r + m[4] * g + m[5] * b),
    toSrgb(m[6] * r + m[7] * g + m[8] * b),
  ];
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Opaque pixels darker than this are the outline and its near-black tones. */
const OUTLINE_VALUE = 0.14;

interface Swatch {
  readonly rgb: Rgb;
  readonly share: number;
}

/**
 * The colours of a sprite's body (opaque, not outline), binned to 4 bits a
 * channel and averaged per bin; the bins covering 90% of the body, largest
 * first.
 */
function swatches(raster: RgbaRaster): {
  readonly body: number;
  readonly outline: number;
  readonly swatches: readonly Swatch[];
  readonly mean: Rgb;
} {
  const bins = new Map<
    number,
    { n: number; r: number; g: number; b: number }
  >();
  let body = 0;
  let outline = 0;
  const sum = [0, 0, 0];
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const o = index * 4;
    if ((raster.data[o + 3] ?? 0) < 128) continue;
    const r = raster.data[o] ?? 0;
    const g = raster.data[o + 1] ?? 0;
    const b = raster.data[o + 2] ?? 0;
    if (rgbToHsv(r, g, b).value < OUTLINE_VALUE) {
      outline += 1;
      continue;
    }
    body += 1;
    sum[0] = (sum[0] ?? 0) + r;
    sum[1] = (sum[1] ?? 0) + g;
    sum[2] = (sum[2] ?? 0) + b;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    bin.n += 1;
    bin.r += r;
    bin.g += g;
    bin.b += b;
    bins.set(key, bin);
  }
  const sorted = [...bins.values()].sort((a, b) => b.n - a.n);
  const kept: Swatch[] = [];
  let covered = 0;
  for (const bin of sorted) {
    if (covered >= 0.9 * body) break;
    covered += bin.n;
    kept.push({
      rgb: [bin.r / bin.n, bin.g / bin.n, bin.b / bin.n],
      share: bin.n / body,
    });
  }
  return {
    body,
    outline,
    swatches: kept,
    mean: [
      (sum[0] ?? 0) / Math.max(1, body),
      (sum[1] ?? 0) / Math.max(1, body),
      (sum[2] ?? 0) / Math.max(1, body),
    ],
  };
}

/**
 * How far apart two sprites' colours are: each swatch of one to its
 * nearest swatch of the other, weighted by area, both ways, averaged.
 */
function paletteDistance(
  a: readonly Swatch[],
  b: readonly Swatch[],
  view: (rgb: Rgb) => Rgb = (rgb) => rgb,
): number {
  const one = (from: readonly Swatch[], to: readonly Swatch[]): number => {
    const total = from.reduce((sum, swatch) => sum + swatch.share, 0);
    return (
      from.reduce(
        (sum, swatch) =>
          sum +
          swatch.share *
            Math.min(
              ...to.map((other) => deltaE(view(swatch.rgb), view(other.rgb))),
            ),
        0,
      ) / Math.max(total, 1e-9)
    );
  };
  return (one(a, b) + one(b, a)) / 2;
}

/** Mean colour of a terrain tile. */
function meanColour(raster: RgbaRaster): Rgb {
  const sum = [0, 0, 0];
  const count = raster.width * raster.height;
  for (let index = 0; index < count; index += 1)
    for (let channel = 0; channel < 3; channel += 1)
      sum[channel] =
        (sum[channel] ?? 0) + (raster.data[index * 4 + channel] ?? 0);
  return [(sum[0] ?? 0) / count, (sum[1] ?? 0) / count, (sum[2] ?? 0) / count];
}

async function readability(): Promise<void> {
  const waters = {
    shallow: meanColour(
      await readRaster(chibi("terrain/chibi-shallow-water-1")),
    ),
    deep: meanColour(await readRaster(chibi("terrain/chibi-deep-water-1"))),
  };
  const units = SPRITES.filter((sprite) => sprite.kind === "UNIT");
  const measured = new Map<string, ReturnType<typeof swatches>>();
  const perFaction: Record<string, unknown>[] = [];
  for (const [faction, label] of FACTIONS) {
    const ships: Record<string, unknown>[] = [];
    for (const sprite of units) {
      const raster = await readRaster(navalFile(faction, sprite.role, "UNIT"));
      const measure = swatches(raster);
      measured.set(`${faction}:${sprite.role}`, measure);
      const water = Object.fromEntries(
        Object.entries(waters).map(([name, colour]) => {
          // Share of the body within 12 (CIE76) of the water: camouflage.
          const close = measure.swatches
            .filter((swatch) => deltaE(swatch.rgb, colour) < 12)
            .reduce((sum, swatch) => sum + swatch.share, 0);
          return [
            name,
            {
              bodyMeanDeltaE: round1(deltaE(measure.mean, colour)),
              bodyMeanContrast: round1(contrast(measure.mean, colour)),
              nearestSwatchDeltaE: round1(
                Math.min(
                  ...measure.swatches.map((swatch) =>
                    deltaE(swatch.rgb, colour),
                  ),
                ),
              ),
              bodyShareWithin12: round1(close * 100),
            },
          ];
        }),
      );
      ships.push({
        role: sprite.role,
        opaquePixels: measure.body + measure.outline,
        outlineShare: round1(
          (measure.outline / Math.max(1, measure.body + measure.outline)) * 100,
        ),
        bodyMean: hexOf(measure.mean),
        mainColours: measure.swatches
          .slice(0, 5)
          .map(
            (swatch) => `${hexOf(swatch.rgb)} ${round1(swatch.share * 100)}%`,
          ),
        water,
      });
    }
    perFaction.push({ faction, label, ships });
  }
  const distinct: Record<string, unknown> = {};
  let weakest: {
    pair: string;
    role: string;
    normal: number;
    deuteranopia: number;
  } | null = null;
  for (const sprite of units) {
    const matrix: Record<
      string,
      Record<string, { normal: number; deuteranopia: number }>
    > = {};
    for (const [a, aLabel] of FACTIONS) {
      matrix[aLabel] = {};
      for (const [b, bLabel] of FACTIONS) {
        if (a === b) continue;
        const left = measured.get(`${a}:${sprite.role}`)?.swatches ?? [];
        const right = measured.get(`${b}:${sprite.role}`)?.swatches ?? [];
        const entry = {
          normal: round1(paletteDistance(left, right)),
          deuteranopia: round1(paletteDistance(left, right, deuteranope)),
        };
        (matrix[aLabel] ?? {})[bLabel] = entry;
        if (a < b && (weakest === null || entry.normal < weakest.normal))
          weakest = {
            pair: `${aLabel} / ${bLabel}`,
            role: sprite.role,
            ...entry,
          };
      }
    }
    distinct[sprite.role] = matrix;
  }
  const json = {
    bead: "pulp_wars-w5j.2",
    measure:
      "CIE76 colour difference (about 10 is clear at a glance, 20 and more are different colours) and the WCAG luminance contrast. A sprite's body is its opaque pixels brighter than value 0.14 (the rest is the outline); its swatches are its colours binned to 4 bits a channel, the bins covering 90% of the body. Palette distance: each swatch of one sprite to the nearest swatch of the other, weighted by area, both ways, averaged; under deuteranopia (Machado 2009) as well.",
    water: {
      shallow: hexOf(waters.shallow),
      deep: hexOf(waters.deep),
      shallowToDeep: round1(deltaE(waters.shallow, waters.deep)),
    },
    factions: perFaction,
    distinguishability: distinct,
    weakestPair: weakest,
  };
  await writeFile(
    path.join(OUT, "readability.json"),
    `${JSON.stringify(json, null, 2)}\n`,
  );
  written.push("readability.json");
  console.log("wrote readability.json");
}

// ------------------------------------------------------------ browser

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
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
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      method: string;
    }
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
      request.reject(
        new Error(
          `${request.method}: ${message.error.message ?? "CDP failed"}`,
        ),
      );
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
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

async function screenshot(connection: Connection): Promise<Buffer> {
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { data?: string };
  if (shot.data === undefined) throw new Error("Chrome returned no screenshot");
  return Buffer.from(shot.data, "base64");
}

/** Screenshots until two in a row match, so every raster has loaded. */
async function settledScreenshot(connection: Connection): Promise<Buffer> {
  let previous = await screenshot(connection);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(350);
    const next = await screenshot(connection);
    if (attempt > 0 && next.equals(previous)) return next;
    previous = next;
  }
  return previous;
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
] as const;
const ZOOMS = ["1", "0.75"] as const;
const SCENES = ["COAST", "MIXED"] as const;
const SCENE = `globalThis.__NAVAL_SCENE__`;

async function captureAll(baseUrl: string): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const shots: { name: string; png: Buffer }[] = [];
  const debugPort = 10_900 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-naval-"));
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
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    for (const viewport of VIEWPORTS) {
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: viewport.mobile,
      });
      await evaluate(connection, `globalThis.__NS_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__NS_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__NS_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__NS_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      // The fixed 16 x 16 Showcase board: the scenes rewrite a 7 x 7 patch
      // around the capital.
      await evaluate(
        connection,
        `(() => { const type = document.querySelector('#v7-map-type'); type.value = 'SHOWCASE'; type.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-action="launch"]').click(); return true; })()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      for (const scene of SCENES) {
        await evaluate(
          connection,
          `(async () => { const module = await import('/scripts/art/naval-factions/scene.ts'); ${SCENE} = module.showNavalSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify({ kind: scene })}); return true; })()`,
        );
        for (const step of ZOOMS) {
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const current = await evaluate<string | null>(
              connection,
              `${SCENE}.canvas.dataset.zoomStep ?? null`,
            );
            if (current === step) break;
            await evaluate(
              connection,
              `${SCENE}.host.zoom(${JSON.stringify(Number(current) < Number(step) ? "IN" : "OUT")})`,
            );
          }
          const zoomStep = await evaluate<string | null>(
            connection,
            `${SCENE}.canvas.dataset.zoomStep ?? null`,
          );
          if (zoomStep !== step)
            throw new Error(`scene could not reach zoom ${step}: ${zoomStep}`);
          const name = `scene-${scene.toLowerCase()}-${viewport.name}-zoom-${step}.png`;
          shots.push({ name, png: await settledScreenshot(connection) });
          console.log(`captured ${name}`);
        }
        await evaluate(
          connection,
          `(() => { ${SCENE}.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
        );
      }
    }
    connection.close();
  } finally {
    // Written after the browser is done: a file written under the project
    // while the page is open makes the dev server reload it.
    for (const shot of shots) {
      await writeFile(path.join(OUT, shot.name), shot.png);
      written.push(shot.name);
    }
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
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

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await navalSheet(4, "naval-sheet-x4.png");
  await navalSheet(1, "naval-sheet-1x.png");
  // The 1:1 sheet at zoom step 0.75, resampled as the board does.
  const native = sharp(path.join(OUT, "naval-sheet-1x.png"));
  const { width = 0, height = 0 } = await native.metadata();
  await native
    .resize(Math.round(width * 0.75), Math.round(height * 0.75), {
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, "naval-sheet-zoom-0.75.png"));
  written.push("naval-sheet-zoom-0.75.png");
  await readability();
  if (!process.argv.includes("--skip-capture")) {
    const port = Number.parseInt(option("--port") ?? "6530", 10);
    const given = option("--url");
    const server = given === undefined ? await startDevServer(port) : undefined;
    try {
      await captureAll(given ?? `http://localhost:${port}/`);
    } finally {
      if (server !== undefined) stopDevServer(server);
    }
  }
  const files = [...new Set(written)].sort();
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-w5j.2",
        batches: [
          "naval-human",
          "naval-undead",
          "naval-goblin",
          "naval-dinosaur",
          "naval-martian",
          "naval-ice-folk",
        ],
        command: "npm run art:chibi-naval-faction-review",
        note: "The scene-* captures draw the live look without base plates or rings, with each faction's naval sprites registered under three of its land subjects (scripts/art/naval-factions/scene.ts): the art is not wired in yet.",
        files,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote index.json (${files.length} files)`);
  const copyTo = option("--copy-to");
  if (copyTo !== undefined && !copyTo.startsWith("--")) {
    await mkdir(copyTo, { recursive: true });
    for (const file of files.filter(
      (name) =>
        name.startsWith("naval-sheet") ||
        name === "readability.json" ||
        /^scene-(coast|mixed)-(desktop|phone)-zoom-1\.png$/.test(name) ||
        name === "scene-mixed-desktop-zoom-0.75.png",
    ))
      await copyFile(path.join(OUT, file), path.join(copyTo, file));
    console.log(`copied the key sheets to ${copyTo}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
