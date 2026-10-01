/**
 * Dinosaur art review evidence (bead pulp_wars-c87.7):
 *
 *   npm run art:chibi-dinosaur-review -- [--port 6431] [--skip-capture]
 *
 * Writes to art/pixellab/reviews/chibi-batch-dinosaur/:
 *
 *   faction-units-1x.png      every Dinosaur unit on grass at 1:1 beside the
 *                             Human, Undead and Goblin unit of the same role
 *                             (all three in Coral), then the Dinosaur in the
 *                             key colour and for the four player colours
 *                             (Coral, Teal, Gold, Violet) through the runtime
 *                             mask recolour
 *   faction-units-x4.png      the same at x4 nearest, plus the owner mask
 *   faction-units-zoom-0.75.png  the 1:1 sheet at 0.75 (zoom step 0.75)
 *   faction-portraits-1x.png  the PORTRAIT:DINOSAUR:<ROLE> busts (batch
 *   faction-portraits-x4.png  5-dinosaur) on the dark dock panel, likewise
 *   cities-1x.png, -x4.png    City 1-3 of the Human, Undead, Goblin and
 *                             Dinosaur sets (batch cities-dinosaur)
 *   icons-1x.png, -x4.png     Lay Egg, Hatch, Stampede and War Drums beside
 *                             the existing command icons, on the dock panel
 *                             and on a light page
 *   egg-1x.png, -x4.png       the Egg (UNIT:DINOSAUR:EGG) on grass in the key
 *                             and player colours beside the Caveman and the
 *                             Raptor, with its mask at x4
 *   showcase-*.png            a Showcase match (16 x 16, a Dinosaur viewer
 *                             against a Human, an Undead and a Goblin seat)
 *                             with ?art=chibi: the board at zoom 1 and 0.75
 *                             on desktop and phone, and on desktop a unit
 *                             dock and the technology tree
 *   ingame-roster-*.png       the scene of
 *                             scripts/art/chibi/review-dinosaur-scene-v7.ts
 *                             drawn by the real board host: the eight units
 *                             and the Egg in the four player colours beside
 *                             the other three factions, at zoom 1 and 0.75
 *                             on desktop and phone
 *   dinosaur-index.json       sizes, hashes and the capture notes
 *
 * Captures start Vite on --port (default 6431, never the user's 6173) and use
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
import { type RgbaRaster } from "./chibi/owner-mask";
import {
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
  reviewDirectory,
  sha256,
  type AssetRecord,
} from "./chibi/pipeline";

const ROOT = process.cwd();
const BATCH = "dinosaur";
const PORTRAIT_BATCH = "5-dinosaur";
const CITY_BATCH = "cities-dinosaur";
const TILE = 80;

/** Role, Dinosaur name, and the Human, Undead and Goblin asset names. */
const ROLES = [
  ["FIGHTER", "Caveman", "fighter", "undead-skeleton", "goblin-goblin"],
  ["RAIDER", "Raptor", "raider", "undead-ghoul", "goblin-wolf-rider"],
  ["MARKSMAN", "Spitter", "marksman", "undead-banshee", "goblin-bomb-chucker"],
  ["GUARD", "Ankylosaurus", "guard", "undead-zombie", "goblin-orc-brute"],
  ["CAPTAIN", "Shaman", "captain", "undead-necromancer", "goblin-orc-warboss"],
  ["CATAPULT", "Triceratops", "catapult", "undead-lich", "goblin-rocket-cart"],
  ["KNIGHT", "T-Rex", "knight", "undead-vampire", "goblin-scrap-buggy"],
  [
    "JUGGERNAUT",
    "Brontosaurus",
    "juggernaut",
    "undead-abomination",
    "goblin-troll",
  ],
] as const;

const OWNERS = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
const OWNER_NAMES = OWNERS.map(
  ([name]) => name.charAt(0) + name.slice(1).toLowerCase(),
);

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

interface Point {
  readonly x: number;
  readonly y: number;
}

type Rgb = readonly [number, number, number];

function blank(width: number, height: number, rgb: Rgb): Canvas {
  const data = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = rgb[0];
    data[index * 4 + 1] = rgb[1];
    data[index * 4 + 2] = rgb[2];
    data[index * 4 + 3] = 255;
  }
  return { width, height, data };
}

/** Alpha-over blit with an integer nearest-neighbour scale. */
function blit(
  target: Canvas,
  source: RgbaRaster,
  left: number,
  top: number,
  scale: number,
): void {
  for (let y = 0; y < source.height * scale; y += 1)
    for (let x = 0; x < source.width * scale; x += 1) {
      const tx = left + x;
      const ty = top + y;
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
  readonly anchor: Point;
}

async function piece(
  master: string,
  mask: string,
  anchor: Point | undefined,
): Promise<Piece> {
  const raster = await readRaster(path.join(ROOT, master));
  return {
    master: raster,
    mask: await readRaster(path.join(ROOT, mask)),
    anchor: anchor ?? { x: raster.width / 2, y: raster.height - TILE / 2 },
  };
}

/** Anchors of every unit batch (Human, Undead, Goblin, Dinosaur). */
async function knownAnchors(): Promise<Map<string, Point>> {
  const anchors = new Map<string, Point>();
  for (const batch of ["1", "2", "undead", "goblin", BATCH]) {
    const manifest = await loadBatchManifest(ROOT, batch);
    for (const asset of manifest.assets)
      if (asset.anchor !== undefined) anchors.set(asset.id, asset.anchor);
  }
  return anchors;
}

function accepted(
  records: Readonly<Record<string, AssetRecord>>,
  id: string,
): AssetRecord {
  const record = records[id];
  if (record?.status !== "ACCEPTED")
    throw new Error(`${id} has no accepted record`);
  return record;
}

function coverage(record: AssetRecord): string {
  return `${((record.mask?.qa.coverage ?? 0) * 100).toFixed(1)}%`;
}

const GAP = 6;
const LABEL_H = 22;
const PAPER: Rgb = [30, 33, 40];
const DOCK: Rgb = [34, 32, 48];
const LIGHT: Rgb = [236, 232, 220];
const FRAME: Rgb = [52, 58, 66];

type CellMaker = (item: RgbaRaster, at: Point, k: number) => Canvas;

/** A board cell of the given size: the grass tile with the piece anchored. */
function boardCells(grass: RgbaRaster, width: number, height: number) {
  return (item: RgbaRaster, at: Point, k: number): Canvas => {
    const out = blank(width * k, height * k, FRAME);
    const tileLeft = ((width - TILE) / 2) * k;
    const tileTop = (height - TILE) * k;
    blit(out, grass, tileLeft, tileTop, k);
    blit(
      out,
      item,
      tileLeft + (TILE / 2 - at.x) * k,
      tileTop + (TILE / 2 - at.y) * k,
      k,
    );
    return out;
  };
}

/** A panel cell: the portrait or icon centred on a flat panel colour. */
function panelCells(colour: Rgb) {
  return (item: RgbaRaster, _at: Point, k: number): Canvas => {
    const size = 72;
    const out = blank(size * k, size * k, colour);
    blit(
      out,
      item,
      ((size - item.width) / 2) * k,
      ((size - item.height) / 2) * k,
      k,
    );
    return out;
  };
}

interface FactionRow {
  readonly label: string;
  /** Human, Undead and Goblin pieces, shown in Coral. */
  readonly others: readonly Piece[];
  readonly dinosaur: Piece;
}

/**
 * One row per subject: the other factions in Coral, then the Dinosaur piece
 * in the key colour and the four player colours, and its mask at x4.
 */
async function factionSheet(
  file: string,
  title: string,
  rows: readonly FactionRow[],
  k: number,
  cell: CellMaker,
  otherNames: readonly string[] = ["Human", "Undead", "Goblin"],
): Promise<Canvas> {
  const columns = [
    ...otherNames,
    "Key",
    ...OWNER_NAMES,
    ...(k > 1 ? ["Mask"] : []),
  ];
  const sample = cell(
    rows[0]?.dinosaur.master ?? blank(1, 1, PAPER),
    { x: 0, y: 0 },
    k,
  );
  const width = GAP + columns.length * (sample.width + GAP);
  const rowHeight = LABEL_H + sample.height + GAP;
  const canvas = blank(width, LABEL_H * 2 + rows.length * rowHeight, PAPER);
  const labels: Label[] = [{ text: title, left: GAP, top: 2 }];
  columns.forEach((name, column) =>
    labels.push({
      text: name,
      left: GAP + column * (sample.width + GAP),
      top: LABEL_H,
    }),
  );
  const coral = RULESET7_PLAYER_COLORS.CORAL;
  for (const [row, entry] of rows.entries()) {
    const top = LABEL_H * 2 + row * rowHeight;
    labels.push({ text: entry.label, left: GAP, top });
    const items: [RgbaRaster, Point][] = [
      ...entry.others.map((other): [RgbaRaster, Point] => [
        recoloured(other.master, other.mask, coral),
        other.anchor,
      ]),
      [entry.dinosaur.master, entry.dinosaur.anchor],
      ...OWNERS.map(([, colour]): [RgbaRaster, Point] => [
        recoloured(entry.dinosaur.master, entry.dinosaur.mask, colour),
        entry.dinosaur.anchor,
      ]),
      ...(k > 1
        ? [
            [maskPicture(entry.dinosaur.mask), entry.dinosaur.anchor] as [
              RgbaRaster,
              Point,
            ],
          ]
        : []),
    ];
    for (const [column, [item, at]] of items.entries())
      blit(
        canvas,
        cell(item, at, k),
        GAP + column * (sample.width + GAP),
        top + LABEL_H,
        1,
      );
  }
  await writeSheet(file, canvas, labels);
  return canvas;
}

/** Rows of unowned icons on the dock panel and on a light page. */
async function iconSheet(
  file: string,
  title: string,
  rows: readonly {
    readonly label: string;
    readonly icons: readonly (readonly [string, RgbaRaster])[];
  }[],
  k: number,
): Promise<void> {
  const cellSize = 72 * k;
  const widest = Math.max(...rows.map((row) => row.icons.length));
  const width = GAP + widest * (cellSize + GAP);
  const bandHeight = LABEL_H * 2 + cellSize + GAP;
  const canvas = blank(width, LABEL_H + rows.length * 2 * bandHeight, PAPER);
  const labels: Label[] = [{ text: title, left: GAP, top: 2 }];
  let top = LABEL_H;
  for (const row of rows)
    for (const [panelName, colour] of [
      ["dock panel", DOCK],
      ["light page", LIGHT],
    ] as const) {
      labels.push({ text: `${row.label} on the ${panelName}`, left: GAP, top });
      const cell = panelCells(colour);
      for (const [column, [name, icon]] of row.icons.entries()) {
        const left = GAP + column * (cellSize + GAP);
        labels.push({ text: name, left, top: top + LABEL_H });
        blit(canvas, cell(icon, { x: 0, y: 0 }, k), left, top + LABEL_H * 2, 1);
      }
      top += bandHeight;
    }
  await writeSheet(file, canvas, labels);
}

async function sheets(directory: string): Promise<string[]> {
  const anchors = await knownAnchors();
  const units = (await loadRecords(productionLayout(ROOT, BATCH), BATCH))
    .assets;
  const portraits = (
    await loadRecords(productionLayout(ROOT, PORTRAIT_BATCH), PORTRAIT_BATCH)
  ).assets;
  const cities = (
    await loadRecords(productionLayout(ROOT, CITY_BATCH), CITY_BATCH)
  ).assets;
  const manifest = await loadBatchManifest(ROOT, BATCH);
  const portraitManifest = await loadBatchManifest(ROOT, PORTRAIT_BATCH);
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const unitPath = (id: string) => `public/assets/chibi/units/chibi-${id}`;
  const portraitPath = (id: string) =>
    `public/assets/chibi/portraits/chibi-portrait-${id}`;
  const centre = { x: 24, y: 24 };
  const unitRows: FactionRow[] = [];
  const portraitRows: FactionRow[] = [];
  const dinosaurUnits = new Map<string, Piece>();
  for (const [role, name, ...others] of ROLES) {
    const unitSpec = manifest.assets.find(
      (asset) => asset.subject === `UNIT:DINOSAUR:${role}`,
    );
    const portraitSpec = portraitManifest.assets.find(
      (asset) => asset.subject === `PORTRAIT:DINOSAUR:${role}`,
    );
    if (unitSpec === undefined || portraitSpec === undefined)
      throw new Error(`no Dinosaur ${role} asset`);
    const unit = accepted(units, unitSpec.id);
    const bust = accepted(portraits, portraitSpec.id);
    const dinosaur = await piece(
      unit.master.path,
      unit.mask?.path ?? "",
      anchors.get(unitSpec.id),
    );
    dinosaurUnits.set(role, dinosaur);
    unitRows.push({
      label: `${name} (${role}, ${unit.master.width} x ${unit.master.height}, owner ${coverage(unit)})`,
      others: await Promise.all(
        others.map((id) =>
          piece(
            `${unitPath(id)}.png`,
            `${unitPath(id)}.mask.png`,
            anchors.get(`chibi-${id}`),
          ),
        ),
      ),
      dinosaur,
    });
    portraitRows.push({
      label: `${name} portrait (owner ${coverage(bust)}, mask ${bust.mask?.source ?? "?"})`,
      others: await Promise.all(
        others.map((id) =>
          piece(
            `${portraitPath(id)}.png`,
            `${portraitPath(id)}.mask.png`,
            centre,
          ),
        ),
      ),
      dinosaur: await piece(bust.master.path, bust.mask?.path ?? "", centre),
    });
  }
  const settlement = (id: string) =>
    `public/assets/chibi/settlements/chibi-${id}`;
  const cityRows: FactionRow[] = [];
  for (const level of [1, 2, 3]) {
    const record = accepted(cities, `chibi-dinosaur-city-${level}`);
    cityRows.push({
      label: `City ${level} (${record.master.width} x ${record.master.height}, owner ${coverage(record)})`,
      others: await Promise.all(
        [`city-${level}`, `undead-city-${level}`, `goblin-city-${level}`].map(
          (id) =>
            piece(
              `${settlement(id)}.png`,
              `${settlement(id)}.mask.png`,
              undefined,
            ),
        ),
      ),
      dinosaur: await piece(
        record.master.path,
        record.mask?.path ?? "",
        undefined,
      ),
    });
  }
  const egg = accepted(units, "chibi-dinosaur-egg");
  const caveman = dinosaurUnits.get("FIGHTER");
  const raptor = dinosaurUnits.get("RAIDER");
  if (caveman === undefined || raptor === undefined)
    throw new Error("no Caveman or Raptor");
  const eggRows: FactionRow[] = [
    {
      label: `Egg (UNIT:DINOSAUR:EGG, ${egg.master.width} x ${egg.master.height}, owner ${coverage(egg)}) beside the Caveman and the Raptor`,
      others: [caveman, raptor],
      dinosaur: await piece(egg.master.path, egg.mask?.path ?? "", undefined),
    },
  ];
  const icon = async (name: string): Promise<readonly [string, RgbaRaster]> => [
    name,
    await readRaster(
      path.join(
        ROOT,
        `public/assets/chibi/icons/chibi-icon-action-${name}.png`,
      ),
    ),
  ];
  const iconRows = [
    {
      label: "Dinosaur command icons",
      icons: await Promise.all(
        ["lay-egg", "hatch", "stampede", "dinosaur-rally"].map(icon),
      ),
    },
    {
      label: "Existing command icons",
      icons: await Promise.all(
        [
          "rally",
          "undead-rally",
          "goblin-rally",
          "kaboom",
          "tend-wounded",
          "raise-dead",
          "pillage",
          "recover",
        ].map(icon),
      ),
    },
  ];
  const files: string[] = [];
  const unitCell = boardCells(grass, 104, 112);
  const cityCell = boardCells(grass, 112, 124);
  const dock = panelCells(DOCK);
  for (const k of [1, 4]) {
    const suffix = k === 1 ? "1x" : "x4";
    const scale = k === 1 ? "1:1" : "x4";
    const unitsFile = path.join(directory, `faction-units-${suffix}.png`);
    const unitSheet = await factionSheet(
      unitsFile,
      `Dinosaur units at ${scale} (Human, Undead, Goblin: Coral)`,
      unitRows,
      k,
      unitCell,
    );
    files.push(unitsFile);
    if (k === 1) {
      // Zoom step 0.75: the runtime draws the same masters smoothed at 0.75.
      const zoomFile = path.join(directory, "faction-units-zoom-0.75.png");
      await sharp(Buffer.from(unitSheet.data), {
        raw: { width: unitSheet.width, height: unitSheet.height, channels: 4 },
      })
        .extract({
          left: 0,
          top: LABEL_H * 2,
          width: unitSheet.width,
          height: unitSheet.height - LABEL_H * 2,
        })
        .resize(Math.round(unitSheet.width * 0.75), null, { kernel: "cubic" })
        .png({ compressionLevel: 9 })
        .toFile(zoomFile);
      files.push(zoomFile);
    }
    const portraitsFile = path.join(
      directory,
      `faction-portraits-${suffix}.png`,
    );
    await factionSheet(
      portraitsFile,
      `Dinosaur portraits at ${scale} (Human, Undead, Goblin: Coral)`,
      portraitRows,
      k,
      dock,
    );
    const citiesFile = path.join(directory, `cities-${suffix}.png`);
    await factionSheet(
      citiesFile,
      `City 1-3 of the four factions at ${scale} (Human, Undead, Goblin: Coral)`,
      cityRows,
      k,
      cityCell,
    );
    const eggFile = path.join(directory, `egg-${suffix}.png`);
    await factionSheet(
      eggFile,
      `The Egg at ${scale} (the Caveman and the Raptor in Coral for scale)`,
      eggRows,
      k,
      unitCell,
      ["Caveman", "Raptor"],
    );
    const iconsFile = path.join(directory, `icons-${suffix}.png`);
    await iconSheet(
      iconsFile,
      `Dinosaur command icons at ${scale} beside the existing command icons`,
      iconRows,
      k,
    );
    files.push(portraitsFile, citiesFile, eggFile, iconsFile);
  }
  return files;
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
const SCENE = `globalThis.__CHIBI_REVIEW_SCENE__`;

/** Steps a board host to a zoom step: the live board by keys, the scene by its host. */
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

/**
 * The Showcase setup: a Dinosaur viewer against a Human, an Undead and a
 * Goblin seat. The setup form does not offer the Dinosaur faction until the
 * UI bead (pulp_wars-c87.4), so the match is launched through the controller.
 */
const SHOWCASE_SETUP = {
  rulesetId: "pulp-wars-poc-7r19",
  seed: 0,
  width: 16,
  height: 16,
  aiCount: 3,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: ["DINOSAUR", "ORIGINAL", "UNDEAD", "GOBLIN"],
  mapType: "SHOWCASE",
  mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
} as const;

async function captures(directory: string, baseUrl: string): Promise<string[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error(
      "Set CHROME_PATH to a Chrome binary (or pass --skip-capture)",
    );
  const debugPort = 10_500 + (process.pid % 80);
  const profile = await mkdtemp(
    path.join(tmpdir(), "pulp-wars-dinosaur-review-"),
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
      await evaluate(connection, `globalThis.__DINOSAUR_REVIEW_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__DINOSAUR_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__DINOSAUR_REVIEW_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__DINOSAUR_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      const launched = await evaluate<{ ok: boolean; diagnostic?: string }>(
        connection,
        `globalThis.__PULP_WARS_APP__.controller.launch(${JSON.stringify(SHOWCASE_SETUP)}, { replaceStoredMatch: true }).then((result) => ({ ok: result.ok, diagnostic: result.ok ? undefined : result.diagnostic }))`,
      );
      if (!launched.ok)
        throw new Error(
          `Showcase launch failed: ${launched.diagnostic ?? "unknown"}`,
        );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && v?.viewer.faction === 'DINOSAUR' && ${BOARD}?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      for (const step of ["1", "0.75"]) {
        await zoomTo(connection, step, false);
        files.push(
          await screenshot(
            connection,
            path.join(directory, `showcase-${viewport.name}-zoom-${step}.png`),
          ),
        );
      }
      if (viewport.name === "desktop") {
        // The board cursor starts on the capital: Enter selects the unit on
        // it (the unit dock shows its map sprite).
        await zoomTo(connection, "1", false);
        await evaluate(connection, `${BOARD}.focus()`);
        await pressKey(connection, "Enter");
        await waitFor(
          connection,
          `document.querySelector('.v7-selection-dock h2') !== null`,
        ).catch(() => undefined);
        files.push(
          await screenshot(
            connection,
            path.join(directory, "showcase-dock-desktop.png"),
          ),
        );
        await pressKey(connection, "Escape");
        // The technology tree: Scouting, Marksmanship and Administration show
        // the Dinosaur portraits, Drill and Chivalry the Dinosaur map sprites.
        await evaluate(
          connection,
          `Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Tech')?.click()`,
        );
        await delay(400);
        files.push(
          await screenshot(
            connection,
            path.join(directory, "showcase-tech-desktop.png"),
          ),
        );
        await pressKey(connection, "Escape");
      }
      // The synthetic roster over the live view. A phone at zoom 1 is under
      // five tiles wide: it shows the four Dinosaur columns; the desktop
      // adds the Human, Undead and Goblin columns.
      const columns = viewport.name === "phone" ? 4 : 7;
      await evaluate(
        connection,
        `(async () => { const scene = await import('/scripts/art/chibi/review-dinosaur-scene-v7.ts'); ${SCENE} = scene.showChibiDinosaurReviewV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${columns}); return true; })()`,
      );
      await waitFor(connection, `${SCENE} !== undefined`);
      for (const step of ["1", "0.75"]) {
        await zoomTo(connection, step, true);
        await delay(600);
        files.push(
          await screenshot(
            connection,
            path.join(
              directory,
              `ingame-roster-${viewport.name}-zoom-${step}.png`,
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
  const port = Number(option("--port") ?? "6431");
  const skipCapture = process.argv.includes("--skip-capture");
  const directory = reviewDirectory(ROOT, BATCH);
  await mkdir(directory, { recursive: true });
  const outputs = await sheets(directory);
  let captureNote = "skipped (--skip-capture)";
  if (!skipCapture) {
    const server = await startDevServer(port);
    try {
      outputs.push(...(await captures(directory, `http://localhost:${port}/`)));
    } finally {
      stopDevServer(server);
    }
    captureNote =
      "showcase-*: a Showcase match (16 x 16) with a Dinosaur viewer (seat 0) against a Human, an Undead and a Goblin seat, launched through the controller and captured from the running game with ?art=chibi. ingame-roster-*: the synthetic scene of scripts/art/chibi/review-dinosaur-scene-v7.ts drawn by the real board host.";
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
    path.join(directory, "dinosaur-index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-c87.7",
        batches: [BATCH, PORTRAIT_BATCH, CITY_BATCH],
        owners: Object.fromEntries(OWNERS),
        note: "DPR 1 masters; every enlargement is integer nearest-neighbour. Owner colours use the runtime mask recolour.",
        captures: captureNote,
        images,
      },
      null,
      2,
    )}\n`,
  );
  for (const image of images)
    console.log(`${image.file} ${image.width}x${image.height}`);
  console.log(`Dinosaur review evidence: ${posix(directory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
