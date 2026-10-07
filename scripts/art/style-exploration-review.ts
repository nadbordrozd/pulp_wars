/**
 * Review boards for the nonproduction art-style exploration (bead
 * pulp_wars-73l.2). Builds deterministic comparison images from the accepted
 * style-study candidates, real production terrain and the current production
 * Fighter/city, using headless Chrome's canvas so every draw matches the
 * game's browser rendering.
 *
 * Rules: study sprites are drawn 1:1 at integer device pixels (no
 * resampling). Production terrain and production reference sprites are drawn
 * by the browser at displayScale x zoom x DPR exactly as the game does, which
 * resamples them (labelled on every board). Nearest-neighbour enlargements are
 * post-hoc inspection views and are labelled as such.
 *
 * Usage: npm run art:style-exploration-review  (needs CHROME_PATH or a
 * standard Chrome install; reads no credentials and calls no provider).
 */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET6_UNIT_ART_GEOMETRY,
  SETTLEMENT_ART_GEOMETRY,
  SQUARE_ART_GEOMETRY,
  anchoredDestinationRect,
  type SourceGeometry,
} from "../../src/render/canvas/board-art-geometry";
import { MIN_ZOOM, TILE_WIDTH } from "../../src/render/canvas/geometry";

const ROOT = process.cwd();
const STUDY = path.join(ROOT, "art/explorations/style-study-2026-09");
const REVIEW = path.join(STUDY, "review");
const MANIFEST = path.join(ROOT, "scripts/art/style-exploration-manifest.json");
const PRODUCTION = path.join(ROOT, "public/assets/pixellab");

type Subject = "fighter" | "city";
type Owner = "A" | "B";
/** Sprite variants: owner A (as generated), owner B (teal), S = silhouette. */
type Variant = Owner | "S";

interface View {
  readonly id: "z1-dpr1" | "z1-dpr2" | "z0625-dpr1" | "z0625-dpr2";
  readonly zoom: number;
  readonly dpr: number;
  readonly label: string;
}

const VIEWS: readonly View[] = [
  { id: "z1-dpr1", zoom: 1, dpr: 1, label: "zoom 1, DPR 1" },
  { id: "z1-dpr2", zoom: 1, dpr: 2, label: "zoom 1, DPR 2" },
  { id: "z0625-dpr1", zoom: MIN_ZOOM, dpr: 1, label: "zoom 0.625, DPR 1" },
  { id: "z0625-dpr2", zoom: MIN_ZOOM, dpr: 2, label: "zoom 0.625, DPR 2" },
];

interface ManifestStyle {
  readonly id: string;
  readonly label: string;
  readonly endpoint: string;
}

interface Manifest {
  readonly styles: readonly ManifestStyle[];
  readonly targets: readonly {
    readonly id: string;
    readonly subject: Subject;
    readonly size: { readonly width: number; readonly height: number };
    readonly view: string;
  }[];
}

interface StudyRecord {
  readonly id: string;
  readonly request: {
    readonly style: string;
    readonly subject: Subject;
    readonly target: string;
    readonly endpoint: string;
    readonly requestSize: { readonly width: number; readonly height: number };
  };
  readonly rawSheet?: string;
  readonly usageUsd?: number;
  readonly review?: { readonly status: string; readonly note: string };
  readonly output?: string;
}

/** Styles that PixelLab executed well enough to carry to every size. */
const ACCEPTED_STYLES = [
  "chunky-16bit",
  "hd-pixel",
  "bold-chibi",
  "flat-shaded",
  "tabletop-mini",
  "counter-token",
] as const;

/** Styles tried and dropped; their provider sheets form the dropped board. */
const DROPPED_SHEETS = [
  "flat-cartoon-fighter-z1-dpr1-a",
  "flat-cartoon-fighter-z1-dpr2-a",
  "vinyl-toy-fighter-z1-dpr1-a",
  "vinyl-toy-fighter-z1-dpr2-a",
  "vinyl-toy-fighter-z1-dpr1-pixen-probe",
  "storybook-ink-fighter-z1-dpr1-a",
  "storybook-ink-fighter-z1-dpr2-a",
  "storybook-ink-fighter-z1-dpr1-pixflux-probe",
  "die-cut-sticker-fighter-z1-dpr1-a",
  "die-cut-sticker-fighter-z1-dpr2-a",
  "soft-lineless-fighter-z1-dpr1-a",
  "soft-lineless-city-z1-dpr1-a",
] as const;

const TERRAIN = {
  grass1: "terrain-ruleset7/original-grass-1.png",
  grass2: "terrain-ruleset7/original-grass-2.png",
  grass3: "terrain-ruleset7/original-grass-3.png",
  forest: "terrain-ruleset7/original-forest-2.png",
  mountain: "terrain-ruleset7/revision3-mountain-1.png",
  water: "terrain-ruleset7/water-shallow.png",
} as const;

const REFERENCE = {
  fighter: "units/warrior.png",
  city1: "buildings/city-1.png",
  city2: "buildings/city-2.png",
} as const;

/** 4 x 2 map: terrain per cell plus the objects standing on it. */
const MAP: readonly {
  readonly col: number;
  readonly row: number;
  readonly terrain: keyof typeof TERRAIN;
  readonly city?: Owner;
  readonly fighter?: Owner;
}[] = [
  { col: 0, row: 0, terrain: "forest", fighter: "A" },
  { col: 1, row: 0, terrain: "grass1", city: "A" },
  { col: 2, row: 0, terrain: "grass2", fighter: "A" },
  { col: 3, row: 0, terrain: "mountain" },
  { col: 0, row: 1, terrain: "grass3", fighter: "B" },
  { col: 1, row: 1, terrain: "water" },
  { col: 2, row: 1, terrain: "grass1", city: "B", fighter: "B" },
  { col: 3, row: 1, terrain: "grass2", fighter: "B" },
];
const MAP_COLUMNS = 4;
const MAP_ROWS = 2;
/** Tall forest/mountain and city tops overflow upward into this margin. */
const TOP_MARGIN_TILES = 0.5;
/** CSS px below the cell centre where a fighter's painted feet rest. */
const FIGHTER_FOOT_Y = 34;

// ---------------------------------------------------------------- images

interface Sprite {
  readonly key: string;
  readonly png: Buffer;
  readonly width: number;
  readonly height: number;
  /** Last opaque row + 1 (painted bottom), in source pixels. */
  readonly paintedBottom: number;
  readonly ownerCoverage: number;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

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

/**
 * The owner-colour mask: saturated reds requested as the maskable team area.
 * Owner B remaps them to teal, preserving saturation and value (shading).
 */
function isOwnerRed(h: number, s: number, v: number): boolean {
  return (h <= 14 || h >= 340) && s >= 0.5 && v >= 0.3;
}

const OWNER_B_HUE = 178;

async function loadSprite(
  key: string,
  file: string,
  owner: Variant,
): Promise<Sprite> {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let opaque = 0;
  let masked = 0;
  let paintedBottom = 0;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 0;
    if (alpha < 16) continue;
    opaque += 1;
    const pixel = index / 4;
    paintedBottom = Math.max(paintedBottom, Math.floor(pixel / info.width) + 1);
    if (owner === "S") {
      data[index] = 24;
      data[index + 1] = 28;
      data[index + 2] = 30;
      data[index + 3] = 255;
      continue;
    }
    const [h, s, v] = hsv(
      data[index] ?? 0,
      data[index + 1] ?? 0,
      data[index + 2] ?? 0,
    );
    if (!isOwnerRed(h, s, v)) continue;
    masked += 1;
    if (owner === "B") {
      const [r, g, b] = rgb(OWNER_B_HUE, s, Math.min(1, v * 0.92));
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
    }
  }
  const png = await sharp(data, { raw: info }).png().toBuffer();
  return {
    key,
    png,
    width: info.width,
    height: info.height,
    paintedBottom,
    ownerCoverage: opaque === 0 ? 0 : masked / opaque,
  };
}

// ---------------------------------------------------------------- canvas ops

type Op =
  | {
      readonly kind: "image";
      readonly key: string;
      readonly dx: number;
      readonly dy: number;
      readonly dw?: number;
      readonly dh?: number;
      /** false = nearest neighbour; default browser smoothing otherwise. */
      readonly smooth?: boolean;
    }
  | {
      readonly kind: "rect";
      readonly x: number;
      readonly y: number;
      readonly w: number;
      readonly h: number;
      readonly fill: string;
    }
  | {
      readonly kind: "text";
      readonly x: number;
      readonly y: number;
      readonly text: string;
      readonly size: number;
      readonly fill?: string;
      readonly bold?: boolean;
    };

interface Board {
  readonly width: number;
  readonly height: number;
  readonly ops: Op[];
}

const BACKGROUND = "#1b2226";
const LABEL = "#e8eef0";
const MUTED = "#9fb0b6";

// ---------------------------------------------------------------- chrome

interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

function chromePath(): string {
  const candidates = [
    process.env.CHROME_PATH,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter((candidate): candidate is string => Boolean(candidate));
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined)
    throw new Error("Chrome not found; set CHROME_PATH to a Chrome binary");
  return found;
}

async function connect(url: string): Promise<Connection> {
  const socket = new WebSocket(url);
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
      request.reject(new Error(message.error.message ?? "CDP error"));
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

async function evaluate(
  connection: Connection,
  expression: string,
): Promise<unknown> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    result?: { value?: unknown };
    exceptionDetails?: { exception?: { description?: string } };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ?? "evaluate failed",
    );
  return response.result?.value;
}

const PAGE_SETUP = `
window.__images = new Map();
window.__load = async (entries) => {
  await Promise.all(entries.map(([key, url]) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => { window.__images.set(key, image); resolve(); };
    image.onerror = () => reject(new Error('image ' + key));
    image.src = url;
  })));
  return true;
};
window.__draw = (board) => {
  const canvas = document.createElement('canvas');
  canvas.width = board.width;
  canvas.height = board.height;
  const context = canvas.getContext('2d');
  context.fillStyle = '${BACKGROUND}';
  context.fillRect(0, 0, board.width, board.height);
  for (const op of board.ops) {
    if (op.kind === 'rect') {
      context.fillStyle = op.fill;
      context.fillRect(op.x, op.y, op.w, op.h);
    } else if (op.kind === 'text') {
      context.fillStyle = op.fill || '${LABEL}';
      context.font = (op.bold ? 'bold ' : '') + op.size + 'px sans-serif';
      context.textBaseline = 'top';
      context.fillText(op.text, op.x, op.y);
    } else {
      const image = window.__images.get(op.key);
      if (!image) throw new Error('missing image ' + op.key);
      // Game default: smoothing on with the browser's default quality.
      context.imageSmoothingEnabled = op.smooth !== false;
      if (op.dw === undefined) context.drawImage(image, op.dx, op.dy);
      else context.drawImage(image, op.dx, op.dy, op.dw, op.dh);
    }
  }
  return canvas.toDataURL('image/png');
};
true;
`;

// ---------------------------------------------------------------- geometry

interface Accepted {
  readonly style: string;
  readonly subject: Subject;
  readonly target: string;
  readonly recipe: string;
  readonly file: string;
  readonly endpoint: string;
  readonly requestSize: { readonly width: number; readonly height: number };
}

function key(
  style: string,
  subject: Subject,
  target: string,
  owner: Variant,
): string {
  return `${style}/${subject}/${target}/${owner}`;
}

/** Draw a production raster exactly as the renderer: browser-scaled. */
function drawProduction(
  ops: Op[],
  imageKey: string,
  geometry: SourceGeometry,
  centerX: number,
  centerY: number,
  view: View,
  offsetX: number,
  offsetY: number,
): void {
  const rect = anchoredDestinationRect(
    { x: centerX, y: centerY },
    view.zoom,
    geometry,
  );
  ops.push({
    kind: "image",
    key: imageKey,
    dx: offsetX + rect.x * view.dpr,
    dy: offsetY + rect.y * view.dpr,
    dw: rect.width * view.dpr,
    dh: rect.height * view.dpr,
  });
}

function terrainGeometry(terrain: keyof typeof TERRAIN): SourceGeometry {
  return terrain === "forest" || terrain === "mountain"
    ? SQUARE_ART_GEOMETRY.tallTerrain
    : SQUARE_ART_GEOMETRY.ground;
}

/** Native study sprite: 1:1 device pixels at integer positions. */
function drawNative(
  ops: Op[],
  sprite: Sprite,
  subject: Subject,
  cellLeft: number,
  cellTop: number,
  view: View,
): void {
  const tile = TILE_WIDTH * view.zoom * view.dpr;
  if (subject === "city") {
    ops.push({
      kind: "image",
      key: sprite.key,
      dx: Math.round(cellLeft + (tile - sprite.width) / 2),
      dy: Math.round(cellTop + (tile - sprite.height) / 2),
    });
    return;
  }
  const foot = cellTop + tile / 2 + FIGHTER_FOOT_Y * view.zoom * view.dpr;
  ops.push({
    kind: "image",
    key: sprite.key,
    dx: Math.round(cellLeft + (tile - sprite.width) / 2),
    dy: Math.round(foot - sprite.paintedBottom),
  });
}

function mapRow(
  ops: Op[],
  style: string | "production",
  view: View,
  originX: number,
  originY: number,
  sprites: ReadonlyMap<string, Sprite>,
): void {
  const tile = TILE_WIDTH * view.zoom * view.dpr;
  const top = originY + TOP_MARGIN_TILES * tile;
  const centre = (cell: { col: number; row: number }) => ({
    x: (cell.col + 0.5) * TILE_WIDTH,
    y: (cell.row + 0.5) * TILE_WIDTH,
  });
  // Ground pass, then per-row terrain bodies, cities and fighters.
  for (const cell of MAP) {
    if (terrainGeometry(cell.terrain) !== SQUARE_ART_GEOMETRY.ground) continue;
    const c = centre(cell);
    drawProduction(
      ops,
      `terrain/${cell.terrain}`,
      SQUARE_ART_GEOMETRY.ground,
      c.x * view.zoom,
      c.y * view.zoom,
      view,
      originX,
      top,
    );
  }
  for (let row = 0; row < MAP_ROWS; row += 1) {
    for (const cell of MAP.filter((entry) => entry.row === row)) {
      if (terrainGeometry(cell.terrain) === SQUARE_ART_GEOMETRY.ground)
        continue;
      const c = centre(cell);
      drawProduction(
        ops,
        `terrain/${cell.terrain}`,
        SQUARE_ART_GEOMETRY.tallTerrain,
        c.x * view.zoom,
        c.y * view.zoom,
        view,
        originX,
        top,
      );
    }
    for (const cell of MAP.filter((entry) => entry.row === row)) {
      const c = centre(cell);
      const cellLeft = originX + cell.col * tile;
      const cellTop = top + cell.row * tile;
      for (const subject of ["city", "fighter"] as const) {
        const owner = subject === "city" ? cell.city : cell.fighter;
        if (owner === undefined) continue;
        if (style === "production") {
          const geometry =
            subject === "fighter"
              ? RULESET6_UNIT_ART_GEOMETRY.standard
              : SETTLEMENT_ART_GEOMETRY.cities[1];
          drawProduction(
            ops,
            subject === "fighter" ? "reference/fighter" : "reference/city1",
            geometry,
            c.x * view.zoom,
            c.y * view.zoom,
            view,
            originX,
            top,
          );
          continue;
        }
        const sprite = sprites.get(key(style, subject, view.id, owner));
        if (sprite === undefined)
          throw new Error(`Missing ${style} ${subject} ${view.id}`);
        drawNative(ops, sprite, subject, cellLeft, cellTop, view);
      }
    }
  }
}

function mapBoard(
  view: View,
  styles: readonly ManifestStyle[],
  sprites: ReadonlyMap<string, Sprite>,
  sizes: ReadonlyMap<string, string>,
): Board {
  const d = view.dpr;
  const tile = TILE_WIDTH * view.zoom * d;
  const pad = 12 * d;
  const header = 58 * d;
  const label = 20 * d;
  const mapWidth = MAP_COLUMNS * tile;
  const mapHeight = (MAP_ROWS + TOP_MARGIN_TILES) * tile;
  const rowHeight = label + mapHeight + 3 * pad;
  const rows = [{ id: "production", label: "Current production" }, ...styles];
  const width = Math.max(mapWidth + 2 * pad, 820 * d);
  const ops: Op[] = [];
  ops.push(
    {
      kind: "text",
      x: pad,
      y: pad,
      size: 15 * d,
      bold: true,
      text: `Style study on production terrain — ${view.label} (tile ${TILE_WIDTH * view.zoom} CSS px = ${tile} device px)`,
    },
    {
      kind: "text",
      x: pad,
      y: pad + 20 * d,
      size: 11 * d,
      fill: MUTED,
      text: "Study sprites: native size, 1:1 device pixels, no resampling. Owner A red, owner B = red mask remapped to teal.",
    },
    {
      kind: "text",
      x: pad,
      y: pad + 34 * d,
      size: 11 * d,
      fill: MUTED,
      text: `Terrain and production reference: browser-scaled (smoothing on) at 0.5/0.25/0.3 × zoom × DPR${view.id === "z1-dpr2" ? " (terrain is 1:1 here)" : " — RESAMPLED"}.`,
    },
  );
  rows.forEach((row, index) => {
    const y = header + index * rowHeight;
    if (index > 0)
      ops.push({
        kind: "rect",
        x: 0,
        y: y - pad,
        w: width,
        h: d,
        fill: "#3b474d",
      });
    const size =
      row.id === "production"
        ? "browser-downscaled from 256x296 / 384x384 sources; no owner colour on the sprites"
        : `fighter ${sizes.get(`${row.id}/fighter/${view.id}`)}, city ${sizes.get(`${row.id}/city/${view.id}`)} native`;
    ops.push({
      kind: "text",
      x: pad,
      y: y + 3 * d,
      size: 12 * d,
      bold: true,
      text: `${row.label}  ·  ${size}`,
    });
    mapRow(ops, row.id, view, pad, y + label, sprites);
  });
  return { width, height: header + rows.length * rowHeight, ops };
}

// ---------------------------------------------------------------- main

async function main(): Promise<void> {
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8")) as Manifest;
  const records: StudyRecord[] = [];
  for (const file of (await readdir(path.join(STUDY, "records"))).sort())
    records.push(
      JSON.parse(
        await readFile(path.join(STUDY, "records", file), "utf8"),
      ) as StudyRecord,
    );
  const styles = ACCEPTED_STYLES.map((id) => {
    const style = manifest.styles.find((candidate) => candidate.id === id);
    if (style === undefined) throw new Error(`Unknown style ${id}`);
    return style;
  });

  const accepted: Accepted[] = [];
  for (const style of ACCEPTED_STYLES)
    for (const subject of ["fighter", "city"] as const)
      for (const view of VIEWS) {
        const record = records.find(
          (candidate) =>
            candidate.review?.status === "ACCEPTED" &&
            candidate.request.style === style &&
            candidate.request.subject === subject &&
            candidate.request.target === view.id,
        );
        if (record?.output === undefined)
          throw new Error(`No accepted ${style} ${subject} ${view.id}`);
        accepted.push({
          style,
          subject,
          target: view.id,
          recipe: record.id,
          file: record.output,
          endpoint: record.request.endpoint,
          requestSize: record.request.requestSize,
        });
      }

  const sprites = new Map<string, Sprite>();
  const sizes = new Map<string, string>();
  for (const entry of accepted)
    for (const owner of ["A", "B", "S"] as const) {
      const sprite = await loadSprite(
        key(entry.style, entry.subject, entry.target, owner),
        path.join(ROOT, entry.file),
        owner,
      );
      sprites.set(sprite.key, sprite);
      sizes.set(
        `${entry.style}/${entry.subject}/${entry.target}`,
        `${sprite.width}x${sprite.height}`,
      );
    }

  const images = new Map<string, Buffer>();
  for (const [name, file] of Object.entries(TERRAIN))
    images.set(`terrain/${name}`, await readFile(path.join(PRODUCTION, file)));
  for (const [name, file] of Object.entries(REFERENCE))
    images.set(
      `reference/${name}`,
      await readFile(path.join(PRODUCTION, file)),
    );
  for (const sprite of sprites.values()) images.set(sprite.key, sprite.png);
  for (const id of DROPPED_SHEETS) {
    const record = records.find((candidate) => candidate.id === id);
    if (record?.rawSheet === undefined) throw new Error(`No sheet for ${id}`);
    const sheet = await readFile(path.join(ROOT, record.rawSheet));
    const metadata = await sharp(sheet).metadata();
    droppedSizes.set(id, { width: metadata.width, height: metadata.height });
    images.set(`dropped/${id}`, sheet);
  }

  await rm(REVIEW, { recursive: true, force: true });
  await mkdir(REVIEW, { recursive: true });

  const port = 9_400 + (process.pid % 200);
  const userData = path.join(tmpdir(), `pulp-wars-style-review-${process.pid}`);
  const browser = spawn(
    chromePath(),
    [
      "--headless=new",
      "--mute-audio",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userData}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  const written: string[] = [];
  try {
    const connection = await connect(await pageTarget(port));
    await evaluate(connection, PAGE_SETUP);
    const entries = [...images].map(([name, bytes]) => [
      name,
      `data:image/png;base64,${bytes.toString("base64")}`,
    ]);
    for (let start = 0; start < entries.length; start += 40)
      await evaluate(
        connection,
        `window.__load(${JSON.stringify(entries.slice(start, start + 40))})`,
      );
    const render = async (name: string, board: Board): Promise<Buffer> => {
      const url = (await evaluate(
        connection,
        `window.__draw(${JSON.stringify(board)})`,
      )) as string;
      const png = await sharp(
        Buffer.from(url.slice(url.indexOf(",") + 1), "base64"),
      )
        .png({ compressionLevel: 9, palette: false })
        .toBuffer();
      await writeFile(path.join(REVIEW, name), png);
      written.push(name);
      return png;
    };
    const enlarge = async (
      name: string,
      source: Buffer,
      factor: number,
      crop?: { left: number; top: number; width: number; height: number },
    ) => {
      let image = sharp(source);
      let metadata = await image.metadata();
      if (crop !== undefined) {
        image = sharp(await image.extract(crop).png().toBuffer());
        metadata = await image.metadata();
      }
      await image
        .resize(metadata.width * factor, metadata.height * factor, {
          kernel: sharp.kernel.nearest,
        })
        .png({ compressionLevel: 9 })
        .toFile(path.join(REVIEW, name));
      written.push(name);
    };

    // 01-04: map boards at every view.
    const boards = new Map<string, Buffer>();
    for (const [index, view] of VIEWS.entries())
      boards.set(
        view.id,
        await render(
          `0${index + 1}-board-${view.id}.png`,
          mapBoard(view, styles, sprites, sizes),
        ),
      );
    // 05-06: inspection enlargements (nearest neighbour, post hoc).
    const zoomedOut = boards.get("z0625-dpr1");
    const standard = boards.get("z1-dpr1");
    if (zoomedOut === undefined || standard === undefined)
      throw new Error("missing boards");
    await enlarge("05-board-z0625-dpr1-enlarged3x.png", zoomedOut, 3);
    await enlarge("06-board-z1-dpr1-enlarged2x.png", standard, 2);

    await render("10-style-resolution-grid.png", gridBoard(styles, sprites));
    const grid = await readFile(
      path.join(REVIEW, "10-style-resolution-grid.png"),
    );
    await enlarge("11-style-resolution-grid-enlarged2x.png", grid, 2);
    const reference = await render(
      "12-production-reference-strip.png",
      referenceBoard(),
    );
    await enlarge(
      "12b-production-reference-strip-enlarged2x.png",
      reference,
      2,
    );
    await render(
      "13-dpr2-native-vs-nearest2x.png",
      nearestBoard(styles, sprites),
    );
    const downscale = await render(
      "14-z0625-native-vs-browser-downscale.png",
      downscaleBoard(styles, sprites),
    );
    await enlarge(
      "14b-z0625-native-vs-browser-downscale-enlarged3x.png",
      downscale,
      3,
    );
    const silhouettes = await render(
      "15-silhouettes-z0625-dpr1.png",
      silhouetteBoard(styles, sprites),
    );
    await enlarge("15b-silhouettes-z0625-dpr1-enlarged3x.png", silhouettes, 3);
    await render(
      "20-dropped-styles-provider-sheets.png",
      droppedBoard(records),
    );
    connection.close();
  } finally {
    browser.kill();
    await rm(userData, { recursive: true, force: true }).catch(() => undefined);
  }

  const index = {
    note: "Generated by npm run art:style-exploration-review. Nonproduction evidence for bead pulp_wars-73l.2.",
    views: VIEWS.map((view) => ({
      ...view,
      tileDevicePx: TILE_WIDTH * view.zoom * view.dpr,
    })),
    ownerMask:
      "Opaque pixels with hue <= 14 or >= 340 degrees, saturation >= 0.5 and value >= 0.3; owner B remaps hue to 178 degrees.",
    accepted: await Promise.all(
      accepted.map(async (entry) => {
        const sprite = sprites.get(
          key(entry.style, entry.subject, entry.target, "A"),
        );
        const target = manifest.targets.find(
          (candidate) =>
            candidate.id === entry.target &&
            candidate.subject === entry.subject,
        );
        return {
          ...entry,
          targetSize: target?.size,
          outputSize: { width: sprite?.width, height: sprite?.height },
          heightDelta:
            sprite === undefined || target === undefined
              ? null
              : sprite.height - target.size.height,
          ownerMaskCoverage: Number((sprite?.ownerCoverage ?? 0).toFixed(3)),
          sha256: sha256(await readFile(path.join(ROOT, entry.file))),
        };
      }),
    ),
    images: written.sort(),
  };
  await writeFile(
    path.join(REVIEW, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  console.log(
    `Style exploration review: ${written.length} images in ${path.relative(ROOT, REVIEW)}`,
  );

  // ------------------------------------------------------------ board builders

  function gridBoard(
    rows: readonly ManifestStyle[],
    all: ReadonlyMap<string, Sprite>,
  ): Board {
    const cells = [
      ...VIEWS.map((view) => ({ subject: "fighter" as const, view })),
      ...VIEWS.map((view) => ({ subject: "city" as const, view })),
    ].sort(
      (a, b) =>
        (a.subject === "fighter" ? 0 : 1) - (b.subject === "fighter" ? 0 : 1) ||
        size(a) - size(b),
    );
    function size(cell: { subject: Subject; view: View }): number {
      return cell.view.zoom * cell.view.dpr;
    }
    const pad = 10;
    const labelWidth = 190;
    const widths = cells.map((cell) =>
      cell.subject === "fighter"
        ? Math.max(Math.ceil(64 * size(cell)) + 8, 112)
        : Math.ceil(128 * size(cell)) + 8,
    );
    const rowHeight = 256 + 12;
    const header = 54;
    const ops: Op[] = [
      {
        kind: "text",
        x: pad,
        y: pad,
        size: 15,
        bold: true,
        text: "Style × resolution grid — every accepted sprite at native size (1:1), plus browser-scaled production reference",
      },
    ];
    let x = labelWidth;
    cells.forEach((cell, column) => {
      ops.push({
        kind: "text",
        x,
        y: 32,
        size: 11,
        fill: MUTED,
        text: `${cell.subject} ${cell.view.id}`,
      });
      x += widths[column] ?? 0;
    });
    const allRows = [
      { id: "production", label: "Current production" },
      ...rows,
    ];
    allRows.forEach((row, index) => {
      const y = header + index * rowHeight;
      ops.push({
        kind: "text",
        x: pad,
        y: y + 4,
        size: 12,
        bold: true,
        text: row.label.slice(0, 28),
      });
      let left = labelWidth;
      cells.forEach((cell, column) => {
        const width = widths[column] ?? 0;
        ops.push({
          kind: "rect",
          x: left,
          y,
          w: width - 8,
          h: 256,
          fill: "#8a9690",
        });
        if (row.id === "production") {
          const geometry =
            cell.subject === "fighter"
              ? RULESET6_UNIT_ART_GEOMETRY.standard
              : SETTLEMENT_ART_GEOMETRY.cities[1];
          const scale = geometry.displayScale * size(cell);
          ops.push({
            kind: "image",
            key:
              cell.subject === "fighter"
                ? "reference/fighter"
                : "reference/city1",
            dx: left,
            dy: y,
            dw: geometry.width * scale,
            dh: geometry.height * scale,
          });
        } else {
          const sprite = all.get(key(row.id, cell.subject, cell.view.id, "A"));
          if (sprite !== undefined)
            ops.push({ kind: "image", key: sprite.key, dx: left, dy: y });
        }
        left += width;
      });
    });
    return {
      width: x + pad,
      height: header + allRows.length * rowHeight,
      ops,
    };
  }

  function referenceBoard(): Board {
    const pad = 10;
    const ops: Op[] = [
      {
        kind: "text",
        x: pad,
        y: pad,
        size: 14,
        bold: true,
        text: "Current production reference: Fighter (units/warrior.png) and cities 1-2, browser-scaled on grass as the game draws them",
      },
    ];
    let x = pad;
    const top = 40;
    for (const view of VIEWS) {
      const tile = TILE_WIDTH * view.zoom * view.dpr;
      ops.push({
        kind: "text",
        x,
        y: top,
        size: 11,
        fill: MUTED,
        text: view.label,
      });
      const y = top + 18 + tile / 2;
      for (const [index, item] of (
        [
          ["reference/fighter", RULESET6_UNIT_ART_GEOMETRY.standard],
          ["reference/city1", SETTLEMENT_ART_GEOMETRY.cities[1]],
          ["reference/city2", SETTLEMENT_ART_GEOMETRY.cities[2]],
        ] as const
      ).entries()) {
        const cx = (index + 0.5) * TILE_WIDTH * view.zoom;
        const cy = 0.5 * TILE_WIDTH * view.zoom;
        drawProduction(
          ops,
          "terrain/grass1",
          SQUARE_ART_GEOMETRY.ground,
          cx,
          cy,
          view,
          x,
          y,
        );
        drawProduction(ops, item[0], item[1], cx, cy, view, x, y);
      }
      x += 3 * tile + 16;
    }
    return { width: x, height: top + 18 + 1.6 * 256 + pad, ops };
  }

  function nearestBoard(
    rows: readonly ManifestStyle[],
    all: ReadonlyMap<string, Sprite>,
  ): Board {
    const pad = 12;
    const tile = 256;
    const ops: Op[] = [
      {
        kind: "text",
        x: pad,
        y: pad,
        size: 15,
        bold: true,
        text: "DPR 2 at zoom 1: DPR 1 sprite doubled with nearest neighbour (left) vs separate native 2x generation (right), on grass",
      },
      {
        kind: "text",
        x: pad,
        y: pad + 20,
        size: 11,
        fill: MUTED,
        text: "Both are what a DPR 2 screen would show at zoom 1. Grass drawn 1:1 (256 px source at 0.5 x DPR 2).",
      },
    ];
    const header = 56;
    const rowHeight = tile + 26;
    rows.forEach((row, index) => {
      const y = header + index * rowHeight;
      ops.push({
        kind: "text",
        x: pad,
        y,
        size: 12,
        bold: true,
        text: `${row.label}: fighter NN2x | native · city NN2x | native`,
      });
      const cells: [Subject, "nn" | "native"][] = [
        ["fighter", "nn"],
        ["fighter", "native"],
        ["city", "nn"],
        ["city", "native"],
      ];
      cells.forEach(([subject, mode], column) => {
        const left = pad + column * (tile + 8);
        const top = y + 18;
        ops.push({ kind: "image", key: "terrain/grass1", dx: left, dy: top });
        const source = all.get(
          key(row.id, subject, mode === "nn" ? "z1-dpr1" : "z1-dpr2", "A"),
        );
        if (source === undefined) return;
        const factor = mode === "nn" ? 2 : 1;
        const width = source.width * factor;
        const bottom =
          subject === "fighter"
            ? top +
              tile / 2 +
              FIGHTER_FOOT_Y * 2 -
              source.paintedBottom * factor
            : top + (tile - source.height * factor) / 2;
        ops.push({
          kind: "image",
          key: source.key,
          dx: Math.round(left + (tile - width) / 2),
          dy: Math.round(bottom),
          dw: width,
          dh: source.height * factor,
          smooth: false,
        });
      });
    });
    return {
      width: pad + 4 * (tile + 8),
      height: header + rows.length * rowHeight,
      ops,
    };
  }

  function downscaleBoard(
    rows: readonly ManifestStyle[],
    all: ReadonlyMap<string, Sprite>,
  ): Board {
    const pad = 8;
    const tile = 80;
    const view = VIEWS[2];
    if (view === undefined) throw new Error("missing view");
    const ops: Op[] = [
      {
        kind: "text",
        x: pad,
        y: pad,
        size: 12,
        bold: true,
        text: "Zoom 0.625, DPR 1: zoom-1 sprite browser-downscaled x0.625 (RESAMPLED, left) vs native zoom-0.625 generation (right)",
      },
    ];
    const header = 30;
    const rowHeight = tile + 20;
    const allRows = [
      { id: "production", label: "Current production" },
      ...rows,
    ];
    allRows.forEach((row, index) => {
      const y = header + index * rowHeight;
      ops.push({
        kind: "text",
        x: pad,
        y,
        size: 11,
        bold: true,
        text: row.label,
      });
      const cells: [Subject, "down" | "native"][] = [
        ["fighter", "down"],
        ["fighter", "native"],
        ["city", "down"],
        ["city", "native"],
      ];
      cells.forEach(([subject, mode], column) => {
        const left = pad + column * (tile + 6);
        const top = y + 14;
        ops.push({
          kind: "image",
          key: "terrain/grass1",
          dx: left,
          dy: top,
          dw: tile,
          dh: tile,
        });
        if (row.id === "production") {
          if (mode === "native") return;
          drawProduction(
            ops,
            subject === "fighter" ? "reference/fighter" : "reference/city1",
            subject === "fighter"
              ? RULESET6_UNIT_ART_GEOMETRY.standard
              : SETTLEMENT_ART_GEOMETRY.cities[1],
            tile / 2,
            tile / 2,
            view,
            left,
            top,
          );
          return;
        }
        if (mode === "native") {
          const sprite = all.get(key(row.id, subject, "z0625-dpr1", "A"));
          if (sprite !== undefined)
            drawNative(ops, sprite, subject, left, top, view);
          return;
        }
        const large = all.get(key(row.id, subject, "z1-dpr1", "A"));
        if (large === undefined) return;
        const width = large.width * MIN_ZOOM;
        const height = large.height * MIN_ZOOM;
        ops.push({
          kind: "image",
          key: large.key,
          dx: left + (tile - width) / 2,
          dy:
            subject === "fighter"
              ? top +
                tile / 2 +
                FIGHTER_FOOT_Y * MIN_ZOOM -
                large.paintedBottom * MIN_ZOOM
              : top + (tile - height) / 2,
          dw: width,
          dh: height,
        });
      });
    });
    return {
      width: Math.max(pad + 4 * (tile + 6), 800),
      height: header + allRows.length * rowHeight,
      ops,
    };
  }

  function silhouetteBoard(
    rows: readonly ManifestStyle[],
    all: ReadonlyMap<string, Sprite>,
  ): Board {
    const pad = 8;
    const ops: Op[] = [
      {
        kind: "text",
        x: pad,
        y: pad,
        size: 12,
        bold: true,
        text: "Silhouettes at zoom 0.625, DPR 1 (native sprites, alpha only)",
      },
    ];
    const header = 30;
    const rowHeight = 100;
    rows.forEach((row, index) => {
      const y = header + index * rowHeight;
      ops.push({
        kind: "text",
        x: pad,
        y,
        size: 11,
        bold: true,
        text: row.label,
      });
      (["fighter", "city"] as const).forEach((subject, column) => {
        const sprite = all.get(key(row.id, subject, "z0625-dpr1", "S"));
        if (sprite === undefined) return;
        ops.push({
          kind: "rect",
          x: pad + column * 90,
          y: y + 14,
          w: 84,
          h: 84,
          fill: "#e9ecea",
        });
        ops.push({
          kind: "image",
          key: sprite.key,
          dx: pad + column * 90 + Math.round((84 - sprite.width) / 2),
          dy: y + 14 + Math.round((84 - sprite.height) / 2),
        });
      });
    });
    return { width: 380, height: header + rows.length * rowHeight, ops };
  }

  function droppedBoard(all: readonly StudyRecord[]): Board {
    const pad = 12;
    const ops: Op[] = [
      {
        kind: "text",
        x: pad,
        y: pad,
        size: 15,
        bold: true,
        text: "Dropped styles — complete provider sheets at native size (flat vector, vinyl toy, ink storybook, die-cut sticker, lineless)",
      },
    ];
    let y = 44;
    let width = 0;
    for (const id of DROPPED_SHEETS) {
      const record = all.find((candidate) => candidate.id === id);
      const image = images.get(`dropped/${id}`);
      if (record === undefined || image === undefined) continue;
      ops.push({ kind: "text", x: pad, y, size: 12, bold: true, text: id });
      ops.push({ kind: "image", key: `dropped/${id}`, dx: pad, dy: y + 18 });
      const dims = droppedSizes.get(id);
      if (dims === undefined) continue;
      width = Math.max(width, dims.width + 2 * pad, 900);
      y += dims.height + 30;
    }
    return { width, height: y, ops };
  }
}

const droppedSizes = new Map<string, { width: number; height: number }>();

async function pageTarget(port: number): Promise<string> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly {
          type: string;
          webSocketDebuggerUrl: string;
        }[];
        const page = targets.find((target) => target.type === "page");
        if (page !== undefined) return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Chrome debugging target did not become ready");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
