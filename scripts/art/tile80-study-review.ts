/**
 * Demo images for the nonproduction tile-80 style test (bead pulp_wars-305).
 * Reads the eight accepted DPR 1 masters from
 * art/explorations/tile80-study-2026-09/accepted/ and writes deterministic
 * demo images to art/explorations/tile80-study-2026-09/demo/:
 *
 *   sprites-<style>.png   each sprite at 1:1 and x4 nearest, on a neutral
 *                         backdrop and on the style's grass, with owner B and
 *                         a 3x3 grass repeat
 *   phone-<style>.png     exact 1170x2532 phone screenshot mock (390x844 CSS
 *                         at DPR 3): tile 80 CSS = 240 device px, sprites x3
 *   phone-compare.png     both phone mocks side by side (2340x2532)
 *   desktop-<style>.png   1440x900 DPR 1 mock at tile 80, sprites 1:1
 *   index.json            sizes, hashes and owner-mask coverage
 *
 * Every enlargement is an integer nearest-neighbour upscale of the DPR 1
 * master; nothing is resampled otherwise. Owner B is a hue remap of the red
 * owner mask to teal. Needs no credentials and calls no provider.
 *
 * Usage: npm run art:tile80-study-review
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp, { type OverlayOptions } from "sharp";

const ROOT = process.cwd();
const STUDY = path.join(ROOT, "art/explorations/tile80-study-2026-09");
const ACCEPTED = path.join(STUDY, "accepted");
const DEMO = path.join(STUDY, "demo");

/** Base tile in CSS px at zoom 1, the normal play view. */
const TILE = 80;

type Kind = "fighter" | "marksman" | "city" | "grass";
type Owner = "A" | "B";

const KINDS: readonly Kind[] = ["city", "fighter", "marksman", "grass"];

const STYLES = [
  { id: "flat-shaded", label: "Flat-shaded (Pixflux)" },
  { id: "bold-chibi", label: "Bold chibi (Pixen)" },
] as const;

type StyleId = (typeof STYLES)[number]["id"];

interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

interface SpriteSet {
  readonly style: StyleId;
  readonly label: string;
  readonly sprites: Readonly<Record<Kind, Record<Owner, Raster>>>;
  readonly info: Readonly<
    Record<Kind, { file: string; sha256: string; ownerMaskShare: number }>
  >;
}

const PAPER = { r: 32, g: 36, b: 44, alpha: 1 };

function hsv(r: number, g: number, b: number): [number, number, number] {
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
  return [hue, max === 0 ? 0 : delta / max, max / 255];
}

function rgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

/** Same owner mask as the 2026-09 style study: saturated reds. */
function isOwnerRed(h: number, s: number, v: number): boolean {
  return (h <= 14 || h >= 340) && s >= 0.5 && v >= 0.3;
}

const OWNER_B_HUE = 178;

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function loadSet(style: StyleId, label: string): Promise<SpriteSet> {
  const sprites = {} as Record<Kind, Record<Owner, Raster>>;
  const info = {} as Record<
    Kind,
    { file: string; sha256: string; ownerMaskShare: number }
  >;
  for (const kind of KINDS) {
    const file = path.join(ACCEPTED, style, `${kind}-tile80-dpr1.png`);
    const bytes = await readFile(file);
    const { data, info: meta } = await sharp(bytes)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const teal = Buffer.from(data);
    let opaque = 0;
    let masked = 0;
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i + 3] ?? 0) === 0) continue;
      opaque += 1;
      const [h, s, v] = hsv(data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0);
      if (kind === "grass" || !isOwnerRed(h, s, v)) continue;
      masked += 1;
      const [r, g, b] = rgb(OWNER_B_HUE, s, v);
      teal[i] = r;
      teal[i + 1] = g;
      teal[i + 2] = b;
    }
    sprites[kind] = {
      A: { width: meta.width, height: meta.height, data },
      B: { width: meta.width, height: meta.height, data: teal },
    };
    info[kind] = {
      file: path.relative(ROOT, file).replaceAll("\\", "/"),
      sha256: sha256(bytes),
      ownerMaskShare: Number((masked / Math.max(1, opaque)).toFixed(3)),
    };
  }
  return { style, label, sprites, info };
}

/** Integer nearest-neighbour upscale to a PNG buffer. */
async function scaled(raster: Raster, k: number): Promise<Buffer> {
  return sharp(raster.data, {
    raw: { width: raster.width, height: raster.height, channels: 4 },
  })
    .resize(raster.width * k, raster.height * k, {
      kernel: sharp.kernel.nearest,
    })
    .png()
    .toBuffer();
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

interface Label {
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly size: number;
  readonly color?: string;
  readonly weight?: "normal" | "bold";
  readonly anchor?: "start" | "middle" | "end";
}

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly fill: string;
  readonly radius?: number;
}

function svgLayer(
  width: number,
  height: number,
  labels: readonly Label[],
  boxes: readonly Box[] = [],
): Buffer {
  const rects = boxes
    .map(
      (box) =>
        `<rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="${box.radius ?? 0}" fill="${box.fill}"/>`,
    )
    .join("");
  const texts = labels
    .map(
      (label) =>
        `<text x="${label.x}" y="${label.y}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size}" font-weight="${label.weight ?? "normal"}" fill="${label.color ?? "#f2f2f2"}" text-anchor="${label.anchor ?? "start"}">${escapeXml(label.text)}</text>`,
    )
    .join("");
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${rects}${texts}</svg>`,
  );
}

type Layer = OverlayOptions;

async function render(
  file: string,
  width: number,
  height: number,
  background: { r: number; g: number; b: number; alpha: number },
  layers: readonly Layer[],
): Promise<void> {
  await sharp({ create: { width, height, channels: 4, background } })
    .composite([...layers])
    .png({ compressionLevel: 9, palette: false })
    .toFile(file);
}

async function fillGrass(
  grass: Raster,
  k: number,
  area: { x: number; y: number; width: number; height: number },
  gridOrigin: { x: number; y: number },
): Promise<Layer[]> {
  let origin = gridOrigin;
  const size = TILE * k;
  // One big tiled strip keeps the composite count small.
  const tile = await scaled(grass, k);
  // Move the grid origin to the last tile corner at or before the area.
  const wrap = (a: number, o: number): number =>
    a - ((((a - o) % size) + size) % size);
  origin = { x: wrap(area.x, origin.x), y: wrap(area.y, origin.y) };
  const columns = Math.ceil((area.x + area.width - origin.x) / size) + 1;
  const rows = Math.ceil((area.y + area.height - origin.y) / size) + 1;
  const sheet = await sharp({
    create: {
      width: columns * size,
      height: rows * size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(
      Array.from({ length: columns * rows }, (_, index) => ({
        input: tile,
        left: (index % columns) * size,
        top: Math.floor(index / columns) * size,
      })),
    )
    .png()
    .toBuffer();
  const cropLeft = area.x - origin.x;
  const cropTop = area.y - origin.y;
  return [
    {
      input: await sharp(sheet)
        .extract({
          left: cropLeft,
          top: cropTop,
          width: area.width,
          height: area.height,
        })
        .png()
        .toBuffer(),
      left: area.x,
      top: area.y,
    },
  ];
}

/** Top-left of a sprite inside its tile: centred horizontally, bottom-aligned. */
function spriteOffset(raster: Raster): { x: number; y: number } {
  return { x: (TILE - raster.width) / 2, y: TILE - raster.height };
}

interface Piece {
  readonly kind: Exclude<Kind, "grass">;
  readonly owner: Owner;
  readonly col: number;
  readonly row: number;
}

/** A small skirmish: two cities and mixed Fighters and Marksmen. */
const SCENE: readonly Piece[] = [
  { kind: "city", owner: "B", col: 3, row: 1 },
  { kind: "marksman", owner: "B", col: 2, row: 1 },
  { kind: "fighter", owner: "B", col: 3, row: 2 },
  { kind: "marksman", owner: "B", col: 4, row: 2 },
  { kind: "fighter", owner: "B", col: 2, row: 3 },
  { kind: "fighter", owner: "A", col: 2, row: 4 },
  { kind: "marksman", owner: "A", col: 1, row: 4 },
  { kind: "fighter", owner: "A", col: 3, row: 5 },
  { kind: "marksman", owner: "B", col: 4, row: 4 },
  { kind: "city", owner: "A", col: 1, row: 6 },
  { kind: "fighter", owner: "A", col: 2, row: 6 },
  { kind: "marksman", owner: "A", col: 1, row: 7 },
];

async function scenePieces(
  set: SpriteSet,
  pieces: readonly Piece[],
  k: number,
  origin: { x: number; y: number },
): Promise<Layer[]> {
  const ordered = [...pieces].sort((a, b) => a.row - b.row || a.col - b.col);
  const layers: Layer[] = [];
  for (const piece of ordered) {
    const raster = set.sprites[piece.kind][piece.owner];
    const offset = spriteOffset(raster);
    layers.push({
      input: await scaled(raster, k),
      left: origin.x + (piece.col * TILE + offset.x) * k,
      top: origin.y + (piece.row * TILE + offset.y) * k,
    });
  }
  return layers;
}

async function spriteSheet(set: SpriteSet): Promise<string> {
  const cell = 360;
  const margin = 20;
  const width = margin * 2 + cell * 4;
  const rowTitle = 34;
  const rows = {
    title: 20,
    native: 90,
    x4: 90 + rowTitle + 110 + 20,
    x4grass: 0,
    x4b: 0,
    repeat: 0,
  };
  rows.x4grass = rows.x4 + rowTitle + 320 + 20;
  rows.x4b = rows.x4grass + rowTitle + 320 + 20;
  rows.repeat = rows.x4b + rowTitle + 320 + 30;
  const height = rows.repeat + rowTitle + 480 + margin;
  const labels: Label[] = [
    {
      x: margin,
      y: 48,
      text: `${set.label}: tile-80 style test sprites (DPR 1 masters)`,
      size: 28,
      weight: "bold",
    },
    {
      x: margin,
      y: 76,
      text: "Every enlargement is an integer nearest-neighbour upscale. Units sit bottom-centred in the 80x80 tile; the city is centred.",
      size: 17,
      color: "#c8ccd4",
    },
    {
      x: margin,
      y: rows.native + 24,
      text: "1:1 native pixels (zoom 1, DPR 1): on neutral, then on the style's grass",
      size: 19,
      weight: "bold",
    },
    {
      x: margin,
      y: rows.x4 + 24,
      text: "x4 nearest on neutral (owner A, red)",
      size: 19,
      weight: "bold",
    },
    {
      x: margin,
      y: rows.x4grass + 24,
      text: "x4 nearest on grass (owner A, red)",
      size: 19,
      weight: "bold",
    },
    {
      x: margin,
      y: rows.x4b + 24,
      text: "x4 nearest on grass (owner B, red mask remapped to teal)",
      size: 19,
      weight: "bold",
    },
    {
      x: margin,
      y: rows.repeat + 24,
      text: "Grass seam check: 3x3 repeat at 1:1 (240x240) and x2 nearest (480x480)",
      size: 19,
      weight: "bold",
    },
  ];
  const layers: Layer[] = [];
  const boxes: Box[] = [];
  const grass = set.sprites.grass.A;
  for (const [index, kind] of KINDS.entries()) {
    const x = margin + index * cell;
    const raster = set.sprites[kind].A;
    const offset = kind === "grass" ? { x: 0, y: 0 } : spriteOffset(raster);
    // Native row: neutral backdrop, then on grass.
    const nativeTop = rows.native + rowTitle;
    boxes.push({ x, y: nativeTop, width: 96, height: 96, fill: "#96a096" });
    layers.push({
      input: await scaled(raster, 1),
      left: x + 8 + offset.x,
      top: nativeTop + 8 + offset.y,
    });
    layers.push({
      input: await scaled(grass, 1),
      left: x + 110,
      top: nativeTop + 8,
    });
    if (kind !== "grass")
      layers.push({
        input: await scaled(raster, 1),
        left: x + 110 + offset.x,
        top: nativeTop + 8 + offset.y,
      });
    labels.push({
      x: x + 200,
      y: nativeTop + 40,
      text: kind,
      size: 20,
      weight: "bold",
    });
    labels.push({
      x: x + 200,
      y: nativeTop + 66,
      text: `${raster.width}x${raster.height} px`,
      size: 18,
      color: "#c8ccd4",
    });
    if (kind !== "grass")
      labels.push({
        x: x + 200,
        y: nativeTop + 90,
        text: `owner mask ${Math.round(set.info[kind].ownerMaskShare * 100)}%`,
        size: 16,
        color: "#9aa0aa",
      });
    // x4 neutral.
    const x4Top = rows.x4 + rowTitle;
    boxes.push({ x, y: x4Top, width: 320, height: 320, fill: "#96a096" });
    layers.push({
      input: await scaled(raster, 4),
      left: x + offset.x * 4,
      top: x4Top + offset.y * 4,
    });
    // x4 on grass, owners A and B.
    for (const [owner, top] of [
      ["A", rows.x4grass + rowTitle],
      ["B", rows.x4b + rowTitle],
    ] as const) {
      layers.push({ input: await scaled(grass, 4), left: x, top });
      if (kind !== "grass")
        layers.push({
          input: await scaled(set.sprites[kind][owner], 4),
          left: x + offset.x * 4,
          top: top + offset.y * 4,
        });
    }
  }
  const repeatTop = rows.repeat + rowTitle;
  layers.push(
    ...(await fillGrass(
      grass,
      1,
      { x: margin, y: repeatTop, width: 240, height: 240 },
      { x: margin, y: repeatTop },
    )),
    ...(await fillGrass(
      grass,
      2,
      { x: margin + 280, y: repeatTop, width: 480, height: 480 },
      { x: margin + 280, y: repeatTop },
    )),
  );
  const file = path.join(DEMO, `sprites-${set.style}.png`);
  await render(file, width, height, PAPER, [
    { input: svgLayer(width, height, [], boxes), left: 0, top: 0 },
    ...layers,
    { input: svgLayer(width, height, labels), left: 0, top: 0 },
  ]);
  return file;
}

interface Screen {
  readonly width: number;
  readonly height: number;
  /** Device pixels per CSS px, which is also the sprite upscale factor. */
  readonly dpr: number;
  readonly topHud: number;
  readonly bottomHud: number;
  /** Device-pixel position of scene tile (0, 0). */
  readonly origin: { x: number; y: number };
  readonly title: string;
  readonly scale: string;
}

async function mock(
  set: SpriteSet,
  screen: Screen,
  name: string,
): Promise<string> {
  const k = screen.dpr;
  const map = {
    x: 0,
    y: screen.topHud,
    width: screen.width,
    height: screen.height - screen.topHud - screen.bottomHud,
  };
  const pieces = await scenePieces(set, SCENE, k, screen.origin);
  // Pieces overlapping the HUD are clipped by drawing the HUD afterwards.
  const s = (css: number): number => css * k;
  const boxes: Box[] = [
    { x: 0, y: 0, width: screen.width, height: screen.topHud, fill: "#1c2029" },
    {
      x: 0,
      y: screen.height - screen.bottomHud,
      width: screen.width,
      height: screen.bottomHud,
      fill: "#1c2029",
    },
    {
      x: screen.width - s(128),
      y: screen.height - screen.bottomHud + s(12),
      width: s(116),
      height: screen.bottomHud - s(24),
      fill: "#e2b340",
      radius: s(8),
    },
    {
      x: s(12),
      y: screen.height - screen.bottomHud + s(12),
      width: s(92),
      height: screen.bottomHud - s(24),
      fill: "#343a48",
      radius: s(8),
    },
    {
      x: s(112),
      y: screen.height - screen.bottomHud + s(12),
      width: s(92),
      height: screen.bottomHud - s(24),
      fill: "#343a48",
      radius: s(8),
    },
  ];
  const hudText = screen.height - screen.bottomHud / 2 + s(6);
  const labels: Label[] = [
    {
      x: s(12),
      y: screen.topHud - s(52),
      text: "Turn 7   Stars 12 (+5)   Score 1 240",
      size: s(15),
      weight: "bold",
    },
    {
      x: s(12),
      y: screen.topHud - s(30),
      text: screen.title,
      size: s(12),
      weight: "bold",
      color: "#e2b340",
    },
    {
      x: s(12),
      y: screen.topHud - s(12),
      text: screen.scale,
      size: s(11),
      color: "#b8c0cc",
    },
    { x: s(58), y: hudText, text: "Tech", size: s(15), anchor: "middle" },
    { x: s(158), y: hudText, text: "Menu", size: s(15), anchor: "middle" },
    {
      x: screen.width - s(70),
      y: hudText,
      text: "End turn",
      size: s(15),
      weight: "bold",
      color: "#1c2029",
      anchor: "middle",
    },
  ];
  const file = path.join(DEMO, `${name}-${set.style}.png`);
  await render(file, screen.width, screen.height, PAPER, [
    ...(await fillGrass(set.sprites.grass.A, k, map, screen.origin)),
    ...pieces,
    {
      input: svgLayer(screen.width, screen.height, labels, boxes),
      left: 0,
      top: 0,
    },
  ]);
  return file;
}

async function main(): Promise<void> {
  await mkdir(DEMO, { recursive: true });
  const sets = await Promise.all(
    STYLES.map((style) => loadSet(style.id, style.label)),
  );
  const outputs: string[] = [];
  for (const set of sets) {
    outputs.push(await spriteSheet(set));
    // iPhone 13-15 class: 390x844 CSS at DPR 3. Tile 80 CSS = 240 device px.
    // Scene tile (0, 0) sits 0.4 tile left of the screen edge so the map
    // reads as scrolled, with four whole columns in view.
    outputs.push(
      await mock(
        set,
        {
          width: 1170,
          height: 2532,
          dpr: 3,
          topHud: 330,
          bottomHud: 270,
          origin: { x: -105, y: 150 },
          title: `${set.label}: phone, 390x844 CSS at DPR 3`,
          scale:
            "Tile 80 CSS = 240 px; sprites x3 nearest; 1 image px = 1 device px",
        },
        "phone",
      ),
    );
    outputs.push(
      await mock(
        set,
        {
          width: 1440,
          height: 900,
          dpr: 1,
          topHud: 110,
          bottomHud: 90,
          origin: { x: 480, y: 70 },
          title: `${set.label}: desktop, 1440x900 at DPR 1`,
          scale: "Tile 80 px; sprites 1:1 native DPR 1 masters",
        },
        "desktop",
      ),
    );
  }
  const [flat, chibi] = sets.map((set) =>
    path.join(DEMO, `phone-${set.style}.png`),
  );
  if (flat === undefined || chibi === undefined) throw new Error("no phones");
  const compare = path.join(DEMO, "phone-compare.png");
  await render(compare, 2340, 2532, PAPER, [
    { input: flat, left: 0, top: 0 },
    { input: chibi, left: 1170, top: 0 },
  ]);
  outputs.push(compare);
  const index = {
    bead: "pulp_wars-305",
    tileCssPx: TILE,
    note: "DPR 1 masters; demo enlargements are integer nearest-neighbour. Owner B remaps the red mask (hue <= 14 or >= 340, saturation >= 0.5, value >= 0.3) to hue 178.",
    styles: Object.fromEntries(
      sets.map((set) => [
        set.style,
        Object.fromEntries(
          KINDS.map((kind) => [
            kind,
            {
              ...set.info[kind],
              width: set.sprites[kind].A.width,
              height: set.sprites[kind].A.height,
            },
          ]),
        ),
      ]),
    ),
    demo: await Promise.all(
      outputs.map(async (file) => {
        const meta = await sharp(file).metadata();
        return {
          file: path.relative(ROOT, file).replaceAll("\\", "/"),
          width: meta.width,
          height: meta.height,
        };
      }),
    ),
  };
  await writeFile(
    path.join(DEMO, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  for (const entry of index.demo)
    console.log(`${entry.file} ${entry.width}x${entry.height}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
