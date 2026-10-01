/**
 * Playtest round 3 art review evidence (bead pulp_wars-6gd.5): the
 * fireworks-style Goblin Rocket Cart, the grain-field Farm without owner
 * colour and the rocky Mountain ground.
 *
 *   npm run art:chibi-playtest3-review -- [--port 6351] [--skip-capture]
 *
 * Writes to art/pixellab/reviews/chibi-playtest-3-art/:
 *
 *   sheet-1x.png, sheet-x4.png  contact sheets at 1:1 and x4 nearest:
 *       the Rocket Cart on grass beside the other Goblin units and the
 *       Human Catapult (Coral), then in the key colour and the four player
 *       colours through the runtime mask recolour, its mask, and its
 *       portrait on the dock panel likewise; the Farm alone, a 3 x 3 block
 *       with a Windmill column, and next to grass; the rocky ground tile
 *       tiled 3 x 2, every Mountain and Mined Mountain master, and a range
 *       with Ore and Mines beside Grass, Forest and Shallow and Deep Water
 *   ingame-<scene>-<viewport>-zoom-<step>.png  the three scenes of
 *       scripts/art/chibi/review-playtest3-scene-v7.ts (rocket, farms,
 *       mountains) drawn by the real board host with ?art=chibi over a
 *       fresh match, on desktop (1440 x 900, DPR 1) and phone (390 x 844,
 *       DPR 3) at zoom 1 and 0.75
 *   index.json                  sizes, hashes and the capture notes
 *
 * Captures start Vite on --port (default 6351, never the user's 6173) and
 * use headless Chrome from CHROME_PATH. No PixelLab call is made.
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
  listBatches,
  loadBatchManifest,
  loadRecords,
  productionLayout,
  readRaster,
  sha256,
  type AssetRecord,
} from "./chibi/pipeline";

const ROOT = process.cwd();
const DIRECTORY = path.join(ROOT, "art/pixellab/reviews/chibi-playtest-3-art");
const TILE = 80;
const UP = 24;
const SCENES = ["ROCKET", "FARMS", "MOUNTAINS"] as const;
const OWNERS = Object.entries(RULESET7_PLAYER_COLORS) as [string, string][];
const CORAL = RULESET7_PLAYER_COLORS.CORAL;

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

/** Alpha-over blit at 1:1. */
function blit(
  target: Canvas,
  source: RgbaRaster,
  left: number,
  top: number,
): void {
  for (let y = 0; y < source.height; y += 1)
    for (let x = 0; x < source.width; x += 1) {
      const tx = left + x;
      const ty = top + y;
      if (tx < 0 || ty < 0 || tx >= target.width || ty >= target.height)
        continue;
      const s = (y * source.width + x) * 4;
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

/** Writes the canvas at an integer nearest-neighbour scale with labels. */
async function writeSheet(
  file: string,
  canvas: Canvas,
  labels: readonly Label[],
  scale: number,
): Promise<void> {
  const width = canvas.width * scale;
  const height = canvas.height * scale;
  const size = scale === 1 ? 10 : 22;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels
    .map(
      (label) =>
        `<text x="${label.left * scale}" y="${label.top * scale + size}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#f4f1e8">${escapeXml(label.text)}</text>`,
    )
    .join("")}</svg>`;
  const scaled = await sharp(Buffer.from(canvas.data), {
    raw: { width: canvas.width, height: canvas.height, channels: 4 },
  })
    .resize(width, height, { kernel: "nearest" })
    .png()
    .toBuffer();
  await sharp(scaled)
    .composite([{ input: Buffer.from(svg), left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}

// ------------------------------------------------------------ assets

interface Piece {
  readonly master: RgbaRaster;
  readonly mask: RgbaRaster | null;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly record: AssetRecord;
}

async function acceptedPieces(): Promise<Map<string, Piece>> {
  const pieces = new Map<string, Piece>();
  for (const batch of await listBatches(ROOT)) {
    const manifest = await loadBatchManifest(ROOT, batch);
    if (manifest.dryRun) continue;
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    for (const record of Object.values(records.assets)) {
      if (record.status !== "ACCEPTED") continue;
      pieces.set(record.id, {
        master: await readRaster(path.join(ROOT, record.master.path)),
        mask:
          record.mask === undefined
            ? null
            : await readRaster(path.join(ROOT, record.mask.path)),
        anchor: record.anchor,
        record,
      });
    }
  }
  return pieces;
}

// ------------------------------------------------------------ sheets

const PAPER = [32, 36, 44] as const;
const DOCK = [34, 32, 48] as const;

async function sheets(): Promise<string[]> {
  const pieces = await acceptedPieces();
  const get = (id: string): Piece => {
    const piece = pieces.get(id);
    if (piece === undefined) throw new Error(`${id} is not accepted`);
    return piece;
  };
  const owned = (id: string, colour: string | null): RgbaRaster => {
    const piece = get(id);
    return colour === null || piece.mask === null
      ? piece.master
      : recoloured(piece.master, piece.mask, colour);
  };
  const terrain = (id: string): RgbaRaster => get(id).master;
  const grass = (x: number, y: number): RgbaRaster =>
    terrain(`chibi-grass-${((((x * 31 + y * 17) % 3) + 3) % 3) + 1}`);
  // Mountain and Mined Mountain variants in the registry order.
  const mountain = (x: number, y: number, mined: boolean): string =>
    (((x * 31 + y * 17) % 2) + 2) % 2 === 0
      ? mined
        ? "chibi-mined-mountain-1"
        : "chibi-mountain-1"
      : mined
        ? "chibi-mined-mountain-2"
        : "chibi-mountain-3";

  const MARGIN = 12;
  const LABEL = 14;
  const canvas = blank(984, 1062, PAPER);
  const labels: Label[] = [];
  /** Draws a tile grid; cells are painted ground first, then pieces by row. */
  const grid = (
    left: number,
    top: number,
    rows: readonly (readonly {
      readonly ground: RgbaRaster;
      readonly pieces?: readonly {
        readonly raster: RgbaRaster;
        readonly anchor?: { readonly x: number; readonly y: number };
        readonly centred?: boolean;
      }[];
    }[])[],
  ): void => {
    rows.forEach((row, y) =>
      row.forEach((cell, x) =>
        blit(canvas, cell.ground, left + x * TILE, top + UP + y * TILE),
      ),
    );
    rows.forEach((row, y) =>
      row.forEach((cell, x) => {
        for (const piece of cell.pieces ?? []) {
          const anchor = piece.centred
            ? { x: piece.raster.width / 2, y: piece.raster.height / 2 }
            : (piece.anchor ?? {
                x: piece.raster.width / 2,
                y: piece.raster.height - TILE / 2,
              });
          blit(
            canvas,
            piece.raster,
            left + x * TILE + TILE / 2 - anchor.x,
            top + UP + y * TILE + TILE / 2 - anchor.y,
          );
        }
      }),
    );
  };
  const unitCell = (id: string, colour: string | null, x: number) => ({
    ground: grass(x, 0),
    pieces: [{ raster: owned(id, colour), anchor: get(id).anchor }],
  });

  // --- Rocket Cart
  let top = MARGIN;
  labels.push({
    text: "Rocket Cart (Coral) beside Wolf Rider, Goblin, Bomb Chucker, Orc Brute, Orc Warboss, Scrap Buggy, Troll and the Human Catapult",
    left: MARGIN,
    top,
  });
  top += LABEL;
  const roster = [
    "chibi-goblin-wolf-rider",
    "chibi-goblin-goblin",
    "chibi-goblin-rocket-cart",
    "chibi-goblin-bomb-chucker",
    "chibi-catapult",
    "chibi-goblin-rocket-cart",
    "chibi-goblin-orc-brute",
    "chibi-goblin-orc-warboss",
    "chibi-goblin-scrap-buggy",
    "chibi-goblin-troll",
    "chibi-goblin-rocket-cart",
    "chibi-fighter",
  ];
  grid(MARGIN, top, [
    roster.map((id, x) =>
      unitCell(id, x === 10 ? (OWNERS[1]?.[1] ?? CORAL) : CORAL, x),
    ),
  ]);
  top += UP + TILE + MARGIN;
  labels.push({
    text: `Rocket Cart: key colour, ${OWNERS.map(([name]) => name).join(", ")}, owner mask; portrait on the dock panel likewise`,
    left: MARGIN,
    top,
  });
  top += LABEL;
  const cart = "chibi-goblin-rocket-cart";
  grid(MARGIN, top, [
    [
      unitCell(cart, null, 0),
      ...OWNERS.map(([, colour], x) => unitCell(cart, colour, x + 1)),
      {
        ground: grass(5, 0),
        pieces: [
          {
            raster: maskPicture(get(cart).mask ?? get(cart).master),
            anchor: get(cart).anchor,
          },
        ],
      },
    ],
  ]);
  const portrait = "chibi-portrait-goblin-rocket-cart";
  const dockLeft = MARGIN + 6 * TILE + MARGIN;
  for (let y = 0; y < UP + TILE; y += 1)
    for (let x = 0; x < 6 * 56 + 8; x += 1) {
      const t = ((top + y) * canvas.width + dockLeft + x) * 4;
      canvas.data[t] = DOCK[0];
      canvas.data[t + 1] = DOCK[1];
      canvas.data[t + 2] = DOCK[2];
    }
  [null, ...OWNERS.map(([, colour]) => colour)].forEach((colour, index) =>
    blit(canvas, owned(portrait, colour), dockLeft + 8 + index * 56, top + 40),
  );
  blit(
    canvas,
    maskPicture(get(portrait).mask ?? get(portrait).master),
    dockLeft + 8 + 5 * 56,
    top + 40,
  );
  top += UP + TILE + MARGIN;

  // --- Farm
  labels.push({
    text: "Farm (no owner mask): alone, a 3 x 3 block with a Windmill column (Coral, Teal), a pair and Fertile Ground",
    left: MARGIN,
    top,
  });
  top += LABEL;
  const farm = {
    raster: get("chibi-farm").master,
    anchor: get("chibi-farm").anchor,
  };
  const windmill = (colour: string) => ({
    raster: owned("chibi-windmill", colour),
    anchor: get("chibi-windmill").anchor,
  });
  const wheat = {
    raster: get("chibi-fertile-ground").master,
    centred: true,
  };
  const plain = (x: number, y: number) => ({ ground: grass(x, y) });
  const field = (x: number, y: number) => ({
    ground: grass(x, y),
    pieces: [farm],
  });
  grid(MARGIN, top, [
    [
      plain(0, 0),
      plain(1, 0),
      field(2, 0),
      field(3, 0),
      field(4, 0),
      { ground: grass(5, 0), pieces: [windmill(CORAL)] },
      plain(6, 0),
      field(7, 0),
      field(8, 0),
      plain(9, 0),
      { ground: grass(10, 0), pieces: [wheat] },
      plain(11, 0),
    ],
    [
      plain(0, 1),
      field(1, 1),
      field(2, 1),
      field(3, 1),
      field(4, 1),
      field(5, 1),
      plain(6, 1),
      plain(7, 1),
      { ground: grass(8, 1), pieces: [windmill(OWNERS[1]?.[1] ?? CORAL)] },
      field(9, 1),
      plain(10, 1),
      field(11, 1),
    ],
    [
      plain(0, 2),
      plain(1, 2),
      field(2, 2),
      field(3, 2),
      field(4, 2),
      { ground: grass(5, 2), pieces: [windmill(CORAL)] },
      plain(6, 2),
      field(7, 2),
      plain(8, 2),
      field(9, 2),
      field(10, 2),
      field(11, 2),
    ],
  ]);
  top += UP + 3 * TILE + MARGIN;

  // --- Mountains
  labels.push({
    text: "Rocky ground tile 3 x 2; Mountain 1, Mountain 3, Mined Mountain 1 and 2 masters",
    left: MARGIN,
    top,
  });
  top += LABEL;
  const rock = terrain("chibi-mountain-ground-1");
  grid(MARGIN, top, [
    [{ ground: rock }, { ground: rock }, { ground: rock }],
    [{ ground: rock }, { ground: rock }, { ground: rock }],
  ]);
  [
    "chibi-mountain-1",
    "chibi-mountain-3",
    "chibi-mined-mountain-1",
    "chibi-mined-mountain-2",
  ].forEach((id, index) =>
    blit(
      canvas,
      get(id).master,
      MARGIN + (3 + index) * TILE + MARGIN * (index + 1),
      top + UP + TILE - 24,
    ),
  );
  top += UP + 2 * TILE + MARGIN;
  labels.push({
    text: "A Mountain range with Ore and Mines beside Grass, Forest, Shallow and Deep Water, with a Rocket Cart and a Fighter",
    left: MARGIN,
    top,
  });
  top += LABEL;
  const shallow = (x: number, y: number) => ({
    ground: terrain(
      `chibi-shallow-water-${((((x * 31 + y * 17) % 2) + 2) % 2) + 1}`,
    ),
  });
  const deep = (x: number, y: number) => ({
    ground: terrain(
      `chibi-deep-water-${((((x * 31 + y * 17) % 2) + 2) % 2) + 1}`,
    ),
  });
  const forest = (x: number, y: number) => {
    const id = `chibi-forest-${((((x * 31 + y * 17) % 2) + 2) % 2) + 1}`;
    return {
      ground: grass(x, y),
      pieces: [{ raster: bodyOf(id), anchor: get(id).anchor }],
    };
  };
  const bodies = new Map<string, RgbaRaster>();
  for (const id of [
    "chibi-forest-1",
    "chibi-forest-2",
    "chibi-mountain-1",
    "chibi-mountain-3",
    "chibi-mined-mountain-1",
    "chibi-mined-mountain-2",
  ])
    bodies.set(
      id,
      await readRaster(
        path.join(
          ROOT,
          get(id).record.master.path.replace(/\.png$/, ".body.png"),
        ),
      ),
    );
  function bodyOf(id: string): RgbaRaster {
    const body = bodies.get(id);
    if (body === undefined) throw new Error(`${id} has no body`);
    return body;
  }
  const ore = { raster: get("chibi-ore-2").master, centred: true };
  const peak = (x: number, y: number, kind: "PLAIN" | "ORE" | "MINE") => {
    const id = mountain(x, y, kind === "MINE");
    return {
      ground: rock,
      pieces: [
        { raster: bodyOf(id), anchor: get(id).anchor },
        ...(kind === "ORE" ? [ore] : []),
      ],
    };
  };
  const withUnit = (
    cell: { readonly ground: RgbaRaster },
    id: string,
    colour: string,
  ) => ({
    ground: cell.ground,
    pieces: [{ raster: owned(id, colour), anchor: get(id).anchor }],
  });
  grid(MARGIN, top, [
    [
      shallow(0, 0),
      shallow(1, 0),
      peak(2, 0, "PLAIN"),
      peak(3, 0, "ORE"),
      peak(4, 0, "PLAIN"),
      plain(5, 0),
      forest(6, 0),
      forest(7, 0),
      plain(8, 0),
      peak(9, 0, "MINE"),
      plain(10, 0),
      deep(11, 0),
    ],
    [
      deep(0, 1),
      peak(1, 1, "ORE"),
      peak(2, 1, "MINE"),
      peak(3, 1, "PLAIN"),
      peak(4, 1, "ORE"),
      forest(5, 1),
      plain(6, 1),
      withUnit(plain(7, 1), "chibi-goblin-rocket-cart", CORAL),
      peak(8, 1, "ORE"),
      peak(9, 1, "PLAIN"),
      shallow(10, 1),
      shallow(11, 1),
    ],
    [
      plain(0, 2),
      plain(1, 2),
      peak(2, 2, "PLAIN"),
      peak(3, 2, "MINE"),
      withUnit(plain(4, 2), "chibi-fighter", OWNERS[1]?.[1] ?? CORAL),
      plain(5, 2),
      forest(6, 2),
      peak(7, 2, "MINE"),
      peak(8, 2, "PLAIN"),
      peak(9, 2, "ORE"),
      plain(10, 2),
      shallow(11, 2),
    ],
  ]);

  await mkdir(DIRECTORY, { recursive: true });
  const files = [
    path.join(DIRECTORY, "sheet-1x.png"),
    path.join(DIRECTORY, "sheet-x4.png"),
  ];
  await writeSheet(files[0] ?? "", canvas, labels, 1);
  await writeSheet(files[1] ?? "", canvas, labels, 4);
  return files;
}

// ------------------------------------------------------------ captures

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  close(): void;
}

interface CaptureEvidence {
  readonly file: string;
  readonly scene: string;
  readonly viewport: string;
  readonly zoomStep: string | null;
  readonly tileCssPx: string | null;
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

async function captureScenes(
  connection: Connection,
  viewport: {
    readonly name: string;
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
  },
): Promise<CaptureEvidence[]> {
  const evidence: CaptureEvidence[] = [];
  for (const scene of SCENES) {
    await evaluate(
      connection,
      `(async () => { const module = await import('/scripts/art/chibi/review-playtest3-scene-v7.ts'); globalThis.__CHIBI_REVIEW_SCENE__ = module.showPlaytest3SceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(scene)}); return true; })()`,
    );
    for (const step of ["1", "0.75"] as const) {
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
      await waitFor(
        connection,
        `Array.from(document.images).every((image) => image.complete)`,
      );
      await delay(1200);
      const zoomStep = await evaluate<string | null>(
        connection,
        `globalThis.__CHIBI_REVIEW_SCENE__.canvas.dataset.zoomStep ?? null`,
      );
      if (zoomStep !== step)
        throw new Error(`scene could not reach zoom ${step}: ${zoomStep}`);
      const shot = (await connection.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: false,
      })) as { data?: string };
      if (shot.data === undefined)
        throw new Error("Chrome returned no screenshot");
      const file = path.join(
        DIRECTORY,
        `ingame-${scene.toLowerCase()}-${viewport.name}-zoom-${step}.png`,
      );
      await writeFile(file, Buffer.from(shot.data, "base64"));
      evidence.push({
        file: posix(file),
        scene,
        viewport: `${viewport.width}x${viewport.height} CSS at DPR ${viewport.dpr}`,
        zoomStep,
        tileCssPx: await evaluate<string | null>(
          connection,
          `globalThis.__CHIBI_REVIEW_SCENE__.canvas.dataset.tileCssPx ?? null`,
        ),
      });
    }
    await evaluate(
      connection,
      `(() => { globalThis.__CHIBI_REVIEW_SCENE__.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete globalThis.__CHIBI_REVIEW_SCENE__; return true; })()`,
    );
  }
  return evidence;
}

async function captureInGame(baseUrl: string): Promise<CaptureEvidence[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error(
      "Set CHROME_PATH to a Chrome binary (or pass --skip-capture)",
    );
  const debugPort = 10_400 + (process.pid % 80);
  const profile = await mkdtemp(
    path.join(tmpdir(), "pulp-wars-chibi-playtest3-"),
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
  const evidence: CaptureEvidence[] = [];
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
      await evaluate(connection, `globalThis.__CHIBI_REVIEW_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__CHIBI_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__CHIBI_REVIEW_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      // Any map will do: each scene rewrites the patch around the capital,
      // so the setup form's seed and other options are left as they are.
      await waitFor(
        connection,
        `globalThis.__CHIBI_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      await evaluate(
        connection,
        `document.querySelector('[data-action="launch"]').click()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      evidence.push(...(await captureScenes(connection, viewport)));
    }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
  return evidence;
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
  const files = await sheets();
  const skipCapture = process.argv.includes("--skip-capture");
  let captures: CaptureEvidence[];
  if (!skipCapture) {
    const port = Number.parseInt(option("--port") ?? "6351", 10);
    const server = await startDevServer(port);
    try {
      captures = await captureInGame(`http://localhost:${port}/`);
    } finally {
      stopDevServer(server);
    }
  } else {
    // Keep the checked-in captures listed when only the sheets are redrawn.
    try {
      const previous = JSON.parse(
        await readFile(path.join(DIRECTORY, "index.json"), "utf8"),
      ) as { captures?: CaptureEvidence[] };
      captures = previous.captures ?? [];
    } catch {
      captures = [];
    }
  }
  const described = async (file: string) => {
    const bytes = await readFile(path.join(ROOT, file));
    const metadata = await sharp(bytes).metadata();
    return {
      file,
      width: metadata.width,
      height: metadata.height,
      sha256: sha256(bytes),
    };
  };
  const pieces = await acceptedPieces();
  const assetIds = [
    "chibi-goblin-rocket-cart",
    "chibi-portrait-goblin-rocket-cart",
    "chibi-farm",
    "chibi-mountain-ground-1",
    "chibi-mountain-1",
    "chibi-mountain-3",
    "chibi-mined-mountain-1",
    "chibi-mined-mountain-2",
  ];
  const index = {
    bead: "pulp_wars-6gd.5",
    command: "npm run art:chibi-playtest3-review",
    assets: assetIds.map((id) => {
      const record = pieces.get(id)?.record;
      if (record === undefined) throw new Error(`${id} is not accepted`);
      return {
        id,
        recipe: record.recipe,
        candidate: record.candidate,
        master: record.master.path,
        masterSha256: record.master.sha256,
        anchor: record.anchor,
        ...(record.mask === undefined
          ? { ownerMask: null }
          : {
              ownerMask: record.mask.path,
              ownerCoverage: record.mask.qa.coverage,
              maskQa: record.mask.qa.status,
            }),
        ...(record.derivation.ground === undefined
          ? {}
          : { ground: record.derivation.ground.asset }),
      };
    }),
    sheets: await Promise.all(files.map((file) => described(posix(file)))),
    captures: await Promise.all(
      captures.map(async (capture) => ({
        ...capture,
        ...(await described(capture.file)),
      })),
    ),
    notes: [
      "Sheets use the runtime mask recolour (recolourOwnerPixelsV7) and the accepted masters, masks, anchors and body layers from the pipeline records.",
      "In-game captures are the synthetic scenes of scripts/art/chibi/review-playtest3-scene-v7.ts drawn by CanvasBoardHostV7 with ?art=chibi over a fresh match; each scene rewrites a 7 x 7 patch around the viewer's capital.",
    ],
  };
  await writeFile(
    path.join(DIRECTORY, "index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
  );
  console.log(
    `Wrote ${files.length} sheets and ${captures.length} captures to ${posix(DIRECTORY)}`,
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Playtest 3 review failed",
  );
  process.exitCode = 1;
});
