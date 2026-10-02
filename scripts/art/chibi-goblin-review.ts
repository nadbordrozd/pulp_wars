/**
 * Goblin art review evidence (bead pulp_wars-0ao.8; since bead
 * pulp_wars-3tq.9 the live look draws the Goblin production art of batch
 * `direction-goblin`, so every in-game capture here shows it, and the
 * sheets show it beside the classic, player-coloured sprites):
 *
 *   npm run art:chibi-goblin-review -- [--port 6301] [--skip-capture]
 *       [--skip-batch-review]
 *
 * Writes to art/pixellab/reviews/chibi-batch-goblin/:
 *
 *   (the batch review)       `npm run art:chibi-batch-review -- --batch
 *                            goblin`: sheet-1x/x4, phone and desktop mocks,
 *                            ingame-* and the ingame-scene-* roster of the
 *                            eight Goblin units for a Goblin viewer and rival
 *                            (scripts/art/chibi/review-scene-v7.ts), and
 *                            index.json; skipped with --skip-batch-review
 *   faction-units-1x.png     every Goblin unit on grass at 1:1: the live
 *                            sprite (fixed colours, the same for every
 *                            player) beside the live Human unit and the
 *                            Undead unit (Coral) of the same role, then the
 *                            classic sprite in the key colour and for the
 *                            four player colours (Coral, Teal, Gold, Violet)
 *                            through the runtime mask recolour
 *   faction-units-x4.png     the same at x4 nearest, plus the classic
 *                            sprite's owner mask
 *   faction-portraits-1x.png the PORTRAIT:GOBLIN:<ROLE> busts (live: batch
 *   faction-portraits-x4.png direction-goblin; classic: batch 5-goblin) on
 *                            the dark dock panel, likewise
 *   goblin-match-*.png       a fresh Goblin-vs-Undead match with ?art=chibi
 *                            (seed 67): the board at zoom 1 and 0.75 on
 *                            desktop and phone, and on desktop the unit dock
 *                            of the starting Goblin, the capital's training
 *                            dock (after that Goblin steps off) and the
 *                            technology tree, which show the Goblin portraits
 *   goblin-index.json        sizes, hashes and the capture notes
 *
 * Captures start Vite on --port (default 6301, never the user's 6173) and use
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
const BATCH = "goblin";
const PORTRAIT_BATCH = "5-goblin";
/** The live look's Goblin and Human art (beads pulp_wars-3tq.9 and .5). */
const LIVE_BATCH = "direction-goblin";
const LIVE_HUMAN_BATCH = "direction-human";
const TILE = 80;

const ROLES = [
  ["FIGHTER", "Goblin", "fighter", "undead-skeleton"],
  ["RAIDER", "Wolf Rider", "raider", "undead-ghoul"],
  ["MARKSMAN", "Bomb Chucker", "marksman", "undead-banshee"],
  ["GUARD", "Orc Brute", "guard", "undead-zombie"],
  ["CAPTAIN", "Orc Warboss", "captain", "undead-necromancer"],
  ["CATAPULT", "Rocket Cart", "catapult", "undead-lich"],
  ["KNIGHT", "Scrap Buggy", "knight", "undead-vampire"],
  ["JUGGERNAUT", "Troll", "juggernaut", "undead-abomination"],
] as const;

const OWNERS = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];

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

/** Anchors of earlier batches' units (batch-2 Humans, the Undead). */
async function knownAnchors(): Promise<Map<string, Point>> {
  const anchors = new Map<string, Point>();
  for (const batch of [
    "1",
    "2",
    "undead",
    BATCH,
    LIVE_BATCH,
    LIVE_HUMAN_BATCH,
  ]) {
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
  if (record?.status !== "ACCEPTED" || record.mask === undefined)
    throw new Error(`${id} has no accepted, masked record`);
  return record;
}

const CELL_W = 104;
const CELL_H = 112;
const GAP = 6;
const LABEL_H = 22;
const PAPER: [number, number, number] = [30, 33, 40];
const DOCK: [number, number, number] = [34, 32, 48];

/** One board cell: the grass tile with the piece on its anchor. */
function boardCell(grass: RgbaRaster, item: RgbaRaster, at: Point, k: number) {
  const out = blank(CELL_W * k, CELL_H * k, [52, 58, 66]);
  const tileLeft = ((CELL_W - TILE) / 2) * k;
  const tileTop = (CELL_H - TILE) * k;
  blit(out, grass, tileLeft, tileTop, k);
  blit(
    out,
    item,
    tileLeft + (TILE / 2 - at.x) * k,
    tileTop + (TILE / 2 - at.y) * k,
    k,
  );
  return out;
}

/** One dock cell: the portrait centred on the dark dock panel. */
function dockCell(item: RgbaRaster, k: number) {
  const size = 72;
  const out = blank(size * k, size * k, DOCK);
  blit(
    out,
    item,
    ((size - item.width) / 2) * k,
    ((size - item.height) / 2) * k,
    k,
  );
  return out;
}

async function factionSheet(
  file: string,
  title: string,
  rows: readonly {
    readonly label: string;
    /** The live Human sprite: fixed colours, drawn as authored. */
    readonly human: { readonly master: RgbaRaster; readonly anchor: Point };
    readonly undead: Piece;
    /** The live Goblin sprite: fixed colours, drawn as authored. */
    readonly live: { readonly master: RgbaRaster; readonly anchor: Point };
    /** The classic Goblin sprite with its owner mask. */
    readonly goblin: Piece;
  }[],
  k: number,
  cell: (item: RgbaRaster, at: Point, k: number) => Canvas,
): Promise<void> {
  const columns = [
    "Human live",
    "Undead",
    "Goblin live",
    "Classic key",
    ...OWNERS.map(([name]) => name.charAt(0) + name.slice(1).toLowerCase()),
    ...(k > 1 ? ["Mask"] : []),
  ];
  const sample = cell(
    rows[0]?.goblin.master ?? blank(1, 1, PAPER),
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
  for (const [row, entry] of rows.entries()) {
    const top = LABEL_H * 2 + row * rowHeight;
    labels.push({ text: entry.label, left: GAP, top });
    const coral = RULESET7_PLAYER_COLORS.CORAL;
    const items: [RgbaRaster, Point][] = [
      [entry.human.master, entry.human.anchor],
      [
        recoloured(entry.undead.master, entry.undead.mask, coral),
        entry.undead.anchor,
      ],
      [entry.live.master, entry.live.anchor],
      [entry.goblin.master, entry.goblin.anchor],
      ...OWNERS.map(([, colour]): [RgbaRaster, Point] => [
        recoloured(entry.goblin.master, entry.goblin.mask, colour),
        entry.goblin.anchor,
      ]),
      ...(k > 1
        ? [
            [maskPicture(entry.goblin.mask), entry.goblin.anchor] as [
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
}

async function sheets(directory: string): Promise<string[]> {
  const anchors = await knownAnchors();
  const units = (await loadRecords(productionLayout(ROOT, BATCH), BATCH))
    .assets;
  const portraits = (
    await loadRecords(productionLayout(ROOT, PORTRAIT_BATCH), PORTRAIT_BATCH)
  ).assets;
  const manifest = await loadBatchManifest(ROOT, BATCH);
  const portraitManifest = await loadBatchManifest(ROOT, PORTRAIT_BATCH);
  const liveRecords = (
    await loadRecords(productionLayout(ROOT, LIVE_BATCH), LIVE_BATCH)
  ).assets;
  const liveHumanRecords = (
    await loadRecords(
      productionLayout(ROOT, LIVE_HUMAN_BATCH),
      LIVE_HUMAN_BATCH,
    )
  ).assets;
  /** An accepted fixed-colour sprite of the live look, on its anchor. */
  const livePiece = async (
    records: Readonly<Record<string, AssetRecord>>,
    id: string,
    anchor?: Point,
  ): Promise<{ readonly master: RgbaRaster; readonly anchor: Point }> => {
    const record = records[id];
    if (record?.status !== "ACCEPTED" || record.mask !== undefined)
      throw new Error(`${id} has no accepted, fixed-colour record`);
    const raster = await readRaster(path.join(ROOT, record.master.path));
    return {
      master: raster,
      anchor: anchor ??
        anchors.get(id) ?? { x: raster.width / 2, y: raster.height - TILE / 2 },
    };
  };
  const grass = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-grass-1.png"),
  );
  const unitRows = [];
  const portraitRows = [];
  for (const [role, name, human, undead] of ROLES) {
    const unitSpec = manifest.assets.find(
      (asset) => asset.subject === `UNIT:GOBLIN:${role}`,
    );
    const portraitSpec = portraitManifest.assets.find(
      (asset) => asset.subject === `PORTRAIT:GOBLIN:${role}`,
    );
    if (unitSpec === undefined || portraitSpec === undefined)
      throw new Error(`no Goblin ${role} asset`);
    const unit = accepted(units, unitSpec.id);
    const bust = accepted(portraits, portraitSpec.id);
    const unitPath = (id: string) => `public/assets/chibi/units/chibi-${id}`;
    const portraitPath = (id: string) =>
      `public/assets/chibi/portraits/chibi-portrait-${id}`;
    const slug = unitSpec.id.replace(/^chibi-goblin-/, "");
    unitRows.push({
      label: `${name} (${role}, ${unit.master.width} x ${unit.master.height}; classic owner area ${((unit.mask?.qa.coverage ?? 0) * 100).toFixed(1)}%)`,
      human: await livePiece(liveHumanRecords, `chibi-direction-${human}`),
      live: await livePiece(liveRecords, `chibi-direction-goblin-${slug}`),
      undead: await piece(
        `${unitPath(undead)}.png`,
        `${unitPath(undead)}.mask.png`,
        anchors.get(`chibi-${undead}`),
      ),
      goblin: await piece(
        unit.master.path,
        unit.mask?.path ?? "",
        anchors.get(unitSpec.id),
      ),
    });
    portraitRows.push({
      label: `${name} portrait (classic owner area ${((bust.mask?.qa.coverage ?? 0) * 100).toFixed(1)}%, mask ${bust.mask?.source ?? "?"})`,
      human: await livePiece(
        liveHumanRecords,
        `chibi-direction-portrait-${human}`,
        { x: 24, y: 24 },
      ),
      live: await livePiece(
        liveRecords,
        `chibi-direction-portrait-goblin-${slug}`,
        { x: 24, y: 24 },
      ),
      undead: await piece(
        `${portraitPath(undead)}.png`,
        `${portraitPath(undead)}.mask.png`,
        { x: 24, y: 24 },
      ),
      goblin: await piece(bust.master.path, bust.mask?.path ?? "", {
        x: 24,
        y: 24,
      }),
    });
  }
  const files: string[] = [];
  const board = (item: RgbaRaster, at: Point, k: number) =>
    boardCell(grass, item, at, k);
  const dock = (item: RgbaRaster, _at: Point, k: number) => dockCell(item, k);
  for (const k of [1, 4]) {
    const suffix = k === 1 ? "1x" : "x4";
    const unitsFile = path.join(directory, `faction-units-${suffix}.png`);
    await factionSheet(
      unitsFile,
      `Goblin units at ${k === 1 ? "1:1" : "x4"} (live look, then the classic sprite per player; Undead: Coral)`,
      unitRows,
      k,
      board,
    );
    const portraitsFile = path.join(
      directory,
      `faction-portraits-${suffix}.png`,
    );
    await factionSheet(
      portraitsFile,
      `Goblin portraits at ${k === 1 ? "1:1" : "x4"} (live look, then the classic bust per player; Undead: Coral)`,
      portraitRows,
      k,
      dock,
    );
    files.push(unitsFile, portraitsFile);
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

async function zoomTo(connection: Connection, step: string): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await evaluate<string | null>(
      connection,
      `document.querySelector('canvas.board-canvas-v7')?.dataset.zoomStep ?? null`,
    );
    if (current === step) return;
    const key = Number(current) < Number(step) ? "+" : "-";
    await evaluate(
      connection,
      `(() => { const canvas = document.querySelector('canvas.board-canvas-v7'); canvas.focus(); canvas.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true })); })()`,
    );
  }
  throw new Error(`could not reach zoom ${step}`);
}

/** A fresh Goblin (seat 0) vs Undead (seat 1) match, seed 67, ?art=chibi. */
async function captureMatch(
  directory: string,
  baseUrl: string,
): Promise<string[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error(
      "Set CHROME_PATH to a Chrome binary (or pass --skip-capture)",
    );
  const debugPort = 10_400 + (process.pid % 80);
  const profile = await mkdtemp(
    path.join(tmpdir(), "pulp-wars-goblin-review-"),
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
      await evaluate(connection, `globalThis.__GOBLIN_REVIEW_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__GOBLIN_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__GOBLIN_REVIEW_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__GOBLIN_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      // Setup defaults to "New map"; a fixed seed needs "Use seed" first.
      await evaluate(
        connection,
        `document.querySelector('[data-action="seed-mode-seed"]')?.click()`,
      );
      // The setup form re-renders on change: set each field, then wait.
      for (const [selector, value] of [
        ["#v7-seed", "67"],
        ["#v7-faction-0", "GOBLIN"],
        ["#v7-faction-1", "UNDEAD"],
      ] as const) {
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
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && v?.viewer.faction === 'GOBLIN' && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      for (const step of ["1", "0.75"]) {
        await zoomTo(connection, step);
        files.push(
          await screenshot(
            connection,
            path.join(
              directory,
              `goblin-match-${viewport.name}-zoom-${step}.png`,
            ),
          ),
        );
      }
      if (viewport.name !== "desktop") continue;
      // The board cursor starts on the capital: Enter selects its Goblin
      // (the unit dock shows its map sprite).
      await zoomTo(connection, "1");
      await evaluate(
        connection,
        `document.querySelector('canvas.board-canvas-v7').focus()`,
      );
      await pressKey(connection, "Enter");
      await waitFor(
        connection,
        `document.querySelector('.v7-selection-dock h2')?.textContent === 'Goblin'`,
      );
      files.push(
        await screenshot(
          connection,
          path.join(directory, "goblin-match-unit-dock-desktop.png"),
        ),
      );
      await pressKey(connection, "Escape");
      // Move the capital's Goblin off the city, so the city dock offers the
      // training buttons with the PORTRAIT:GOBLIN:<ROLE> busts.
      await evaluate(
        connection,
        `(async () => { const app = globalThis.__PULP_WARS_APP__; const s = app.controller.snapshot(); const v = s.view; const capital = v.cities.find((city) => city.ownerId === v.viewer.id && city.isCapital); const unit = v.units.find((candidate) => candidate.ownerId === v.viewer.id && candidate.at.x === capital.at.x && candidate.at.y === capital.at.y); const move = unit === undefined ? undefined : s.offeredCommands.find((command) => command.kind === 'MOVE' && command.unitId === unit.id); if (move !== undefined) await app.controller.dispatch(move); })()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); return !s.transitioning && s.offeredCommands.some((command) => command.kind === 'TRAIN'); })()`,
      );
      await delay(600);
      await evaluate(
        connection,
        `document.querySelector('canvas.board-canvas-v7').focus()`,
      );
      await pressKey(connection, "Enter");
      await waitFor(
        connection,
        `document.querySelector('.v7-selection-dock [data-action^="command-train"]') !== null`,
      ).catch(() => undefined);
      files.push(
        await screenshot(
          connection,
          path.join(directory, "goblin-match-city-dock-desktop.png"),
        ),
      );
      await pressKey(connection, "Escape");
      // The technology tree: Administration, Marksmanship and Scouting show
      // the Goblin portraits, Drill and Chivalry the Goblin map sprites.
      await evaluate(
        connection,
        `Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Tech')?.click()`,
      );
      await delay(400);
      files.push(
        await screenshot(
          connection,
          path.join(directory, "goblin-match-tech-desktop.png"),
        ),
      );
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

async function runBatchReview(port: number, skipCapture: boolean) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      path.join(ROOT, "node_modules/.bin/tsx"),
      [
        "scripts/art/chibi-batch-review.ts",
        "--batch",
        BATCH,
        "--port",
        String(port),
        ...(skipCapture ? ["--skip-capture"] : []),
      ],
      { cwd: ROOT, stdio: "inherit" },
    );
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`chibi batch review exited with ${String(code)}`)),
    );
  });
}

// ------------------------------------------------------------ main

async function main(): Promise<void> {
  const port = Number(option("--port") ?? "6301");
  const skipCapture = process.argv.includes("--skip-capture");
  if (!process.argv.includes("--skip-batch-review"))
    await runBatchReview(port, skipCapture);
  const directory = reviewDirectory(ROOT, BATCH);
  await mkdir(directory, { recursive: true });
  const outputs = await sheets(directory);
  let captureNote = "skipped (--skip-capture)";
  if (!skipCapture) {
    const server = await startDevServer(port);
    try {
      outputs.push(
        ...(await captureMatch(directory, `http://localhost:${port}/`)),
      );
    } finally {
      stopDevServer(server);
    }
    captureNote =
      "A fresh Goblin (seat 0) vs Undead (seat 1) match, seed 67, captured from the running game with ?art=chibi in the default look: the Goblin production art of bead pulp_wars-3tq.9.";
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
    path.join(directory, "goblin-index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-0ao.8",
        liveBead: "pulp_wars-3tq.9",
        batches: [BATCH, PORTRAIT_BATCH, LIVE_BATCH],
        owners: Object.fromEntries(OWNERS),
        note: "DPR 1 masters; every enlargement is integer nearest-neighbour. The live Goblin and Human sprites have fixed colours and are drawn as authored for every player; the classic Goblin sprites (the developer option Classic look) use the runtime mask recolour.",
        captures: captureNote,
        images,
      },
      null,
      2,
    )}\n`,
  );
  for (const image of images)
    console.log(`${image.file} ${image.width}x${image.height}`);
  console.log(`Goblin review evidence: ${posix(directory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
