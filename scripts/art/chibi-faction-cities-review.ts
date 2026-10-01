/**
 * Faction city review evidence (bead pulp_wars-6gd.6):
 *
 *   npm run art:chibi-faction-cities-review -- [--port 6361] [--skip-capture]
 *   npm run art:chibi-faction-cities-review -- --preview cities-undead:undead-city-1-a,...
 *       --out DIR
 *
 * Writes to art/pixellab/reviews/chibi-faction-cities/:
 *
 *   cities-1x.png        City 1-3 (rows) of the Human, Undead and Goblin sets
 *   cities-x4.png        side by side on grass, each in the four player
 *                        colours (Coral, Teal, Gold, Violet) through the
 *                        runtime mask recolour; at 1:1 and x4 nearest
 *   garrison-1x.png      per tier and faction: the key colour, the owner
 *   garrison-x4.png      mask (x4 only), and the city with its faction's
 *                        standard unit and then its large unit garrisoned at
 *                        the runtime's 0.75 size in the cell's front-right
 *   ingame-cities-*.png  the synthetic scene of
 *                        scripts/art/chibi/review-cities-v7.ts drawn by the
 *                        real board host with ?art=chibi: a column of level
 *                        1, 2 and 3 cities per faction (Human, Undead and
 *                        Goblin on desktop; Undead and Goblin on the phone)
 *                        with territory borders, garrisons, a capital crown
 *                        and a City Wall badge, at zoom 1 and 0.75
 *   match-*.png          a fresh match as an Undead and as a Goblin viewer
 *                        (seed 67, ?art=chibi): the capital with its starting
 *                        unit inside, and the city dock, on desktop and phone
 *   index.json           sizes, hashes, owner coverage and the capture notes
 *
 * `--preview` is the sampling aid: it lays raw candidates of generated
 * recipes (batch:recipe[:candidate]) out the same way (key colour, the four
 * player colours through the automatically extracted mask, the mask, a
 * garrison and the Human city of the same tier) and prints the mask QA, so a
 * candidate is judged at 1:1 and x4 before it is accepted. It writes
 * preview-1x.png and preview-x4.png to --out, a scratch directory outside
 * the checked-in evidence.
 *
 * Captures start Vite on --port (default 6361, never the user's 6173) and use
 * headless Chrome from CHROME_PATH. No PixelLab call is made.
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
import {
  extractOwnerMask,
  maskToRgba,
  ownerMaskQa,
  type RgbaRaster,
} from "./chibi/owner-mask";
import {
  CHIBI_PATHS,
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
  sha256,
} from "./chibi/pipeline";
import { candidateCell, cropRaster } from "./chibi/raster";

const ROOT = process.cwd();
const TILE = 80;
const REVIEW = "chibi-faction-cities";
const TIERS = [1, 2, 3] as const;
const FACTIONS = [
  {
    name: "Human",
    batch: null,
    city: (tier: number) => `chibi-city-${tier}`,
    unit: "chibi-fighter",
    large: "chibi-knight",
  },
  {
    name: "Undead",
    batch: "cities-undead",
    city: (tier: number) => `chibi-undead-city-${tier}`,
    unit: "chibi-undead-skeleton",
    large: "chibi-undead-vampire",
  },
  {
    name: "Goblin",
    batch: "cities-goblin",
    city: (tier: number) => `chibi-goblin-city-${tier}`,
    unit: "chibi-goblin-goblin",
    large: "chibi-goblin-scrap-buggy",
  },
] as const;

const OWNERS = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
const KEY = "#d8262c";
// The runtime's garrison placement (src/render/canvas/chibi-geometry-v7.ts):
// 0.75 of the unit, canvas bottom on the cell bottom, right edge 46 world
// units (of 128 per cell) right of the cell centre.
const GARRISON_SCALE = 0.75;
const GARRISON_RIGHT = TILE / 2 + (46 / 128) * TILE;

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

function posix(file: string): string {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

// ------------------------------------------------------------ rasters

interface Canvas {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}

function blank(
  width: number,
  height: number,
  rgb: readonly [number, number, number],
): Canvas {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = rgb[0];
    data[index * 4 + 1] = rgb[1];
    data[index * 4 + 2] = rgb[2];
    data[index * 4 + 3] = 255;
  }
  return { width, height, data };
}

/**
 * Alpha-over blit, nearest-neighbour: `scale` target pixels per source
 * pixel (a fraction for the garrisoned unit, as the runtime draws it).
 */
function blit(
  target: Canvas,
  source: RgbaRaster,
  left: number,
  top: number,
  scale: number,
): void {
  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);
  const originX = Math.floor(left);
  const originY = Math.round(top);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) {
      const tx = originX + x;
      const ty = originY + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const sx = Math.min(source.width - 1, Math.floor((x + 0.5) / scale));
      const sy = Math.min(source.height - 1, Math.floor((y + 0.5) / scale));
      const s = (sy * source.width + sx) * 4;
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

function recoloured(
  raster: RgbaRaster,
  mask: RgbaRaster,
  colour: string,
): RgbaRaster {
  const owner = parseHexColourV7(colour);
  if (owner === null) throw new Error(colour);
  return {
    width: raster.width,
    height: raster.height,
    data: recolourOwnerPixelsV7({
      pixels: new Uint8ClampedArray(raster.data),
      width: raster.width,
      height: raster.height,
      mask: new Uint8ClampedArray(mask.data),
      maskWidth: mask.width,
      maskHeight: mask.height,
      owner,
    }),
  };
}

/** The mask as a key-red silhouette on transparency. */
function maskPicture(mask: RgbaRaster): RgbaRaster {
  const data = new Uint8Array(mask.data.length);
  for (let index = 0; index < mask.width * mask.height; index += 1)
    if ((mask.data[index * 4 + 3] ?? 0) >= 128) {
      data[index * 4] = 0xd8;
      data[index * 4 + 1] = 0x26;
      data[index * 4 + 2] = 0x2c;
      data[index * 4 + 3] = 255;
    }
  return { width: mask.width, height: mask.height, data };
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
}

async function writeSheet(
  file: string,
  canvas: Canvas,
  labels: readonly Label[],
): Promise<void> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}">${labels
    .map(
      (label) =>
        `<text x="${label.left}" y="${label.top + 15}" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#f4f1e8">${escapeXml(label.text)}</text>`,
    )
    .join("")}</svg>`;
  await sharp(Buffer.from(canvas.data), {
    raw: { width: canvas.width, height: canvas.height, channels: 4 },
  })
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}

// ------------------------------------------------------------ sheets

interface Piece {
  readonly master: RgbaRaster;
  readonly mask: RgbaRaster;
}

const CELL_W = 104;
const CELL_H = 112;
const GAP = 6;
const LABEL_H = 22;
const PAPER: [number, number, number] = [30, 33, 40];

/**
 * One board cell at scale k: the grass tile, the bottom-centred settlement
 * and, optionally, a unit garrisoned on it as the runtime places it.
 */
function boardCell(
  grass: RgbaRaster,
  city: RgbaRaster,
  k: number,
  unit?: RgbaRaster,
): Canvas {
  const out = blank(CELL_W * k, CELL_H * k, [52, 58, 66]);
  const tileLeft = ((CELL_W - TILE) / 2) * k;
  const tileTop = (CELL_H - TILE) * k;
  blit(out, grass, tileLeft, tileTop, k);
  blit(
    out,
    city,
    tileLeft + ((TILE - city.width) / 2) * k,
    tileTop + (TILE - city.height) * k,
    k,
  );
  if (unit !== undefined)
    blit(
      out,
      unit,
      tileLeft + (GARRISON_RIGHT - unit.width * GARRISON_SCALE) * k,
      tileTop + (TILE - unit.height * GARRISON_SCALE) * k,
      k * GARRISON_SCALE,
    );
  return out;
}

async function sheet(
  file: string,
  title: string,
  columns: readonly string[],
  rows: readonly {
    readonly label: string;
    readonly cells: readonly (Canvas | null)[];
  }[],
  k: number,
): Promise<void> {
  const cellW = CELL_W * k;
  const cellH = CELL_H * k;
  const rowHeight = LABEL_H + cellH + GAP;
  const canvas = blank(
    GAP + columns.length * (cellW + GAP),
    LABEL_H * 2 + rows.length * rowHeight,
    PAPER,
  );
  const labels: Label[] = [{ text: title, left: GAP, top: 2 }];
  columns.forEach((name, column) =>
    labels.push({
      text: name,
      left: GAP + column * (cellW + GAP),
      top: LABEL_H,
    }),
  );
  for (const [row, entry] of rows.entries()) {
    const top = LABEL_H * 2 + row * rowHeight;
    labels.push({ text: entry.label, left: GAP, top });
    for (const [column, cell] of entry.cells.entries())
      if (cell !== null)
        blit(canvas, cell, GAP + column * (cellW + GAP), top + LABEL_H, 1);
  }
  await writeSheet(file, canvas, labels);
}

async function publicPiece(directory: string, id: string): Promise<Piece> {
  const base = path.join(ROOT, "public/assets/chibi", directory, id);
  return {
    master: await readRaster(`${base}.png`),
    mask: await readRaster(`${base}.mask.png`),
  };
}

function ownerName(name: string): string {
  return name.charAt(0) + name.slice(1).toLowerCase();
}

interface CoverageNote {
  readonly asset: string;
  readonly width: number;
  readonly height: number;
  readonly ownerCoverage: number | null;
}

async function sheets(directory: string): Promise<{
  readonly files: string[];
  readonly coverage: CoverageNote[];
}> {
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const coverage: CoverageNote[] = [];
  const set: {
    readonly name: string;
    readonly cities: Piece[];
    readonly unit: Piece;
    readonly large: Piece;
  }[] = [];
  for (const faction of FACTIONS) {
    const records =
      faction.batch === null
        ? null
        : (
            await loadRecords(
              productionLayout(ROOT, faction.batch),
              faction.batch,
            )
          ).assets;
    const cities: Piece[] = [];
    for (const tier of TIERS) {
      const id = faction.city(tier);
      const record = records?.[id];
      if (records !== null && record?.status !== "ACCEPTED")
        throw new Error(`${id} has no accepted record`);
      const city = await publicPiece("settlements", id);
      cities.push(city);
      coverage.push({
        asset: id,
        width: city.master.width,
        height: city.master.height,
        ownerCoverage: record?.mask?.qa.coverage ?? null,
      });
    }
    set.push({
      name: faction.name,
      cities,
      unit: await publicPiece("units", faction.unit),
      large: await publicPiece("units", faction.large),
    });
  }
  const files: string[] = [];
  for (const k of [1, 4]) {
    const suffix = k === 1 ? "1x" : "x4";
    const scale = k === 1 ? "1:1" : "x4";
    const citiesFile = path.join(directory, `cities-${suffix}.png`);
    await sheet(
      citiesFile,
      `City 1-3 of the Human, Undead and Goblin sets at ${scale}, four player colours (runtime mask recolour)`,
      set.flatMap((faction) =>
        OWNERS.map(([owner]) => `${faction.name} ${ownerName(owner)}`),
      ),
      TIERS.map((tier, index) => ({
        label: `City ${tier}`,
        cells: set.flatMap((faction) =>
          OWNERS.map(([, colour]) => {
            const city = faction.cities[index];
            return city === undefined
              ? null
              : boardCell(grass, recoloured(city.master, city.mask, colour), k);
          }),
        ),
      })),
      k,
    );
    const garrisonFile = path.join(directory, `garrison-${suffix}.png`);
    const perFaction = [
      "key colour",
      ...(k > 1 ? ["mask"] : []),
      "+ standard unit",
      "+ large unit",
    ];
    await sheet(
      garrisonFile,
      `Key colour${k > 1 ? ", owner mask" : ""} and garrisons (unit at 0.75 in the front-right, Teal owner) at ${scale}`,
      set.flatMap((faction) =>
        perFaction.map((column) => `${faction.name} ${column}`),
      ),
      TIERS.map((tier, index) => ({
        label: `City ${tier}`,
        cells: set.flatMap((faction) => {
          const city = faction.cities[index];
          if (city === undefined) return perFaction.map(() => null);
          const teal = RULESET7_PLAYER_COLORS.TEAL;
          const owned = recoloured(city.master, city.mask, teal);
          return [
            boardCell(grass, city.master, k),
            ...(k > 1 ? [boardCell(grass, maskPicture(city.mask), k)] : []),
            boardCell(
              grass,
              owned,
              k,
              recoloured(faction.unit.master, faction.unit.mask, teal),
            ),
            boardCell(
              grass,
              owned,
              k,
              recoloured(faction.large.master, faction.large.mask, teal),
            ),
          ];
        }),
      })),
      k,
    );
    files.push(citiesFile, garrisonFile);
  }
  return { files, coverage };
}

// ------------------------------------------------------------ preview

/** Raw candidates of generated recipes, laid out for review before accept. */
async function preview(specs: readonly string[], out: string): Promise<void> {
  await mkdir(out, { recursive: true });
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const fighter = await publicPiece("units", "chibi-fighter");
  const unit = recoloured(
    fighter.master,
    fighter.mask,
    RULESET7_PLAYER_COLORS.TEAL,
  );
  const columns = [
    "key colour",
    ...OWNERS.map(([owner]) => ownerName(owner)),
    "mask",
    "Teal + garrison",
    "Human, same tier",
  ];
  const rows: {
    label: string;
    pieces: (RgbaRaster | null)[];
    unit: boolean[];
  }[] = [];
  for (const spec of specs) {
    const [batch, recipeId, candidateText] = spec.split(":");
    if (batch === undefined || recipeId === undefined)
      throw new Error(`--preview wants batch:recipe[:candidate], got ${spec}`);
    const manifest = await loadBatchManifest(ROOT, batch);
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    const recipe = manifest.recipes.find((entry) => entry.id === recipeId);
    const record = records.recipes[recipeId];
    if (
      recipe === undefined ||
      record?.rawSheet === undefined ||
      record.candidateSize === undefined
    )
      throw new Error(`${spec}: no generated record`);
    const asset = manifest.assets.find((entry) => entry.id === recipe.asset);
    const tier = Number(asset?.subject.slice(-1) ?? "1");
    const human = await publicPiece("settlements", `chibi-city-${tier}`);
    const sheetRaster = await readRaster(path.join(ROOT, record.rawSheet));
    const count = record.candidateCount ?? 1;
    const wanted =
      candidateText === undefined
        ? Array.from({ length: count }, (_, index) => index)
        : [Number(candidateText)];
    for (const index of wanted) {
      const cell = candidateCell(index, count, record.candidateSize);
      const raster = cropRaster(sheetRaster, {
        ...cell,
        width: record.candidateSize.width,
        height: record.candidateSize.height,
      });
      const { mask } = extractOwnerMask(raster);
      const qa = ownerMaskQa(raster, mask, { owned: true });
      const maskRaster: RgbaRaster = {
        width: mask.width,
        height: mask.height,
        data: maskToRgba(mask),
      };
      // Opaque bounding box: how much of the canvas and the tile it fills.
      let minX = raster.width;
      let maxX = -1;
      let minY = raster.height;
      let maxY = -1;
      for (let y = 0; y < raster.height; y += 1)
        for (let x = 0; x < raster.width; x += 1)
          if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) {
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
          }
      const label = `${recipeId}#${index}: ${raster.width} x ${raster.height}, opaque box x ${minX}-${maxX} y ${minY}-${maxY}, owner ${(qa.coverage * 100).toFixed(1)}%, red-brown ${qa.redBrownPixels}, QA ${qa.status}${qa.failures.length === 0 ? "" : ` (${qa.failures.map((failure) => failure.code).join(", ")})`}`;
      console.log(label);
      rows.push({
        label,
        pieces: [
          raster,
          ...OWNERS.map(([, colour]) => recoloured(raster, maskRaster, colour)),
          maskPicture(maskRaster),
          recoloured(raster, maskRaster, RULESET7_PLAYER_COLORS.TEAL),
          recoloured(human.master, human.mask, RULESET7_PLAYER_COLORS.TEAL),
        ],
        unit: [false, false, false, false, false, false, true, true],
      });
    }
  }
  for (const k of [1, 4]) {
    const file = path.join(out, `preview-${k === 1 ? "1x" : "x4"}.png`);
    await sheet(
      file,
      `Raw candidates at ${k === 1 ? "1:1" : "x4"} (automatic mask; key ${KEY})`,
      columns,
      rows.map((row) => ({
        label: k === 1 ? (row.label.split(":")[0] ?? "") : row.label,
        cells: row.pieces.map((piece, column) =>
          piece === null
            ? null
            : boardCell(
                grass,
                piece,
                k,
                row.unit[column] === true ? unit : undefined,
              ),
        ),
      })),
      k,
    );
    console.log(posix(file));
  }
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
      windowsVirtualKeyCode: key === "Enter" ? 13 : 0,
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
  await delay(800);
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data?: string };
  if (shot.data === undefined) throw new Error("Chrome returned no screenshot");
  await writeFile(file, Buffer.from(shot.data, "base64"));
  return file;
}

const BOARD = `document.querySelector('canvas.board-canvas-v7')`;
const SCENE = `document.querySelector('[data-chibi-review-scene] canvas.board-canvas-v7')`;

async function zoomTo(
  connection: Connection,
  canvas: string,
  step: string,
): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await evaluate<string | null>(
      connection,
      `${canvas}?.dataset.zoomStep ?? null`,
    );
    if (current === step) return;
    const key = Number(current) < Number(step) ? "+" : "-";
    await evaluate(
      connection,
      `(() => { const canvas = ${canvas}; canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true })); })()`,
    );
  }
  throw new Error(`could not reach zoom ${step}`);
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
] as const;

/** A fresh match (seed 67, ?art=chibi) with the given seat factions. */
async function startMatch(
  connection: Connection,
  url: URL,
  factions: readonly string[],
): Promise<void> {
  await evaluate(connection, `globalThis.__CITY_REVIEW_OLD__ = true`);
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__CITY_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__CITY_REVIEW_OLD__ = true; })()`,
  );
  await connection.send("Page.reload");
  await waitFor(
    connection,
    `globalThis.__CITY_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  // The setup form re-renders on change: set each field, then wait.
  const fields: [string, string][] = [
    ["#v7-seed", "67"],
    ...factions.map((faction, seat): [string, string] => [
      `#v7-faction-${seat}`,
      faction,
    ]),
  ];
  for (const [selector, value] of fields) {
    await waitFor(connection, `document.querySelector('${selector}')`);
    await evaluate(
      connection,
      `(() => { const field = document.querySelector('${selector}'); field.value = '${value}'; field.dispatchEvent(new Event('change', { bubbles: true })); })()`,
    );
    await waitFor(
      connection,
      `document.querySelector('${selector}')?.value === '${value}'`,
    );
  }
  await evaluate(
    connection,
    `document.querySelector('[data-action="launch"]').click()`,
  );
  await waitFor(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && v?.viewer.faction === '${factions[0] ?? "ORIGINAL"}' && ${BOARD}?.dataset.artSet === 'CHIBI'; })()`,
    900,
  );
}

async function captures(directory: string, baseUrl: string): Promise<string[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error(
      "Set CHROME_PATH to a Chrome binary (or pass --skip-capture)",
    );
  const debugPort = 10_500 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-city-review-"));
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
      for (const [viewer, rival] of [
        ["UNDEAD", "GOBLIN"],
        ["GOBLIN", "UNDEAD"],
      ] as const) {
        await startMatch(connection, url, [viewer, rival]);
        const name = viewer.toLowerCase();
        await zoomTo(connection, BOARD, "1");
        files.push(
          await screenshot(
            connection,
            path.join(directory, `match-${name}-${viewport.name}.png`),
          ),
        );
        // Step the starting unit off the capital and select the city: the
        // dock shows the faction's City 1 at portrait size.
        await evaluate(
          connection,
          `(async () => { const app = globalThis.__PULP_WARS_APP__; const s = app.controller.snapshot(); const v = s.view; const capital = v.cities.find((city) => city.ownerId === v.viewer.id && city.isCapital); const unit = v.units.find((candidate) => candidate.ownerId === v.viewer.id && candidate.at.x === capital.at.x && candidate.at.y === capital.at.y); const move = unit === undefined ? undefined : s.offeredCommands.find((command) => command.kind === 'MOVE' && command.unitId === unit.id); if (move !== undefined) await app.controller.dispatch(move); })()`,
        );
        await waitFor(
          connection,
          `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); return !s.transitioning && s.offeredCommands.some((command) => command.kind === 'TRAIN'); })()`,
        );
        await delay(600);
        await evaluate(connection, `${BOARD}.focus()`);
        await pressKey(connection, "Enter");
        await waitFor(
          connection,
          `document.querySelector('.v7-selection-dock [data-chibi-subject="CITY:${viewer}:1"]') !== null`,
        );
        files.push(
          await screenshot(
            connection,
            path.join(
              directory,
              `match-${name}-city-dock-${viewport.name}.png`,
            ),
          ),
        );
        await pressKey(connection, "Escape");
      }
      // The synthetic scene over the last match's live view.
      // A phone at zoom 1 is under five tiles wide: it shows the Undead and
      // Goblin column pairs; the desktop adds the Human pair on the left.
      const factions =
        viewport.name === "phone"
          ? ["UNDEAD", "GOBLIN"]
          : ["ORIGINAL", "UNDEAD", "GOBLIN"];
      await evaluate(
        connection,
        `(async () => { const scene = await import('/scripts/art/chibi/review-cities-v7.ts'); globalThis.__CHIBI_REVIEW_SCENE__ = scene.showChibiCitiesReviewV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(factions)}); return true; })()`,
      );
      await waitFor(connection, `${SCENE} !== null`);
      for (const step of ["1", "0.75"]) {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const current = await evaluate<string | null>(
            connection,
            `globalThis.__CHIBI_REVIEW_SCENE__.canvas.dataset.zoomStep ?? null`,
          );
          if (current === step) break;
          await evaluate(
            connection,
            `globalThis.__CHIBI_REVIEW_SCENE__.host.zoom(${JSON.stringify(Number(current) < Number(step) ? "IN" : "OUT")})`,
          );
        }
        await delay(600);
        files.push(
          await screenshot(
            connection,
            path.join(
              directory,
              `ingame-cities-${viewport.name}-zoom-${step}.png`,
            ),
          ),
        );
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
  const directory = path.join(ROOT, CHIBI_PATHS.reviews, REVIEW);
  const previewSpecs = option("--preview");
  if (previewSpecs !== undefined) {
    const out = option("--out");
    if (out === undefined)
      throw new Error("--preview needs --out, a scratch directory");
    await preview(previewSpecs.split(",").filter(Boolean), out);
    return;
  }
  const port = Number(option("--port") ?? "6361");
  const skipCapture = process.argv.includes("--skip-capture");
  await mkdir(directory, { recursive: true });
  const { files: outputs, coverage } = await sheets(directory);
  let captureNote = "skipped (--skip-capture)";
  if (!skipCapture) {
    const server = await startDevServer(port);
    try {
      outputs.push(...(await captures(directory, `http://localhost:${port}/`)));
    } finally {
      stopDevServer(server);
    }
    captureNote =
      "match-*: fresh matches (seed 67) as an Undead and as a Goblin viewer, captured from the running game with ?art=chibi. ingame-cities-*: the synthetic scene of scripts/art/chibi/review-cities-v7.ts drawn by the real board host.";
  }
  const images = await Promise.all(
    outputs.map(async (file) => {
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
        bead: "pulp_wars-6gd.6",
        batches: ["1", "cities-undead", "cities-goblin"],
        owners: Object.fromEntries(OWNERS),
        note: "DPR 1 masters; every enlargement is integer nearest-neighbour. Owner colours use the runtime mask recolour. A garrisoned unit is drawn at 0.75 with its right edge at the population pip column, as the board renderer places it.",
        cities: coverage,
        captures: captureNote,
        images,
      },
      null,
      2,
    )}\n`,
  );
  for (const image of images)
    console.log(`${image.file} ${image.width}x${image.height}`);
  console.log(`Faction city review evidence: ${posix(directory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
