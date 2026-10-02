/**
 * Review evidence for the production art of the new visual direction (bead
 * pulp_wars-3tq.5, batch `direction-human`):
 *
 *   CHROME_PATH=... npm run art:chibi-direction-review -- [--port 6471] [--skip-capture]
 *
 * It writes art/pixellab/reviews/chibi-batch-direction-human/:
 *
 *   units-old-new-{1x,x4}.png        every Human unit, today's sprite beside
 *                                    the new one and the Undead, Goblin and
 *                                    Dinosaur unit of the same role
 *   units-zoom-0.75.png              the 1:1 sheet at zoom step 0.75
 *   portraits-old-new-{1x,x4}.png    every Human portrait, old and new, on
 *                                    the dock panel
 *   improvements-old-new-{1x,x4}.png the ten improvements, the Village and
 *                                    the Mine (today and toned)
 *   cities-{1x,x4}.png               City 1-3 old and new, with the pennant
 *                                    drawn at its recorded anchor
 *   farm-x4.png                      the Farm tile, and a 3 x 3 block with
 *                                    the cell boundaries marked
 *   showcase-{human,mixed}-{desktop,phone}-zoom-{1,0.75}.png
 *                                    a real Showcase match in the default
 *                                    look (bead pulp_wars-3tq.6): every seat
 *                                    Human, and Human, Undead, Goblin,
 *                                    Dinosaur
 *   showcase-human-today-desktop-zoom-1.png   the same match in the classic
 *                                    look (Settings > Developer tools >
 *                                    Classic look), the art before this batch
 *   showcase-human-{dock,tech}-desktop.png    the interface in the default look
 *   ingame-farms-{desktop,phone}-zoom-{1,0.75}.png
 *                                    the demo patch of
 *                                    scripts/art/visual-direction/scene.ts
 *                                    drawn by the real board host with the
 *                                    production art: a Farm block over
 *                                    straight and diagonal Roads, cities
 *                                    with pennants, units north of cities
 *   index.json                       sizes and hashes
 *
 * No PixelLab call is made. Captures start Vite on --port (never 6173).
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  DIRECTION_FLAG_ANCHORS_V7,
  RECOMMENDED_DIRECTION_V7,
  terrainPivotV7,
  tonePixelsV7,
} from "../../src/render/canvas/visual-direction-v7";
import {
  listBatches,
  loadBatchManifest,
  loadRecords,
  productionLayout,
  reviewDirectory,
  sha256,
} from "./chibi/pipeline";

const ROOT = process.cwd();
const BATCH = "direction-human";
const TILE = 80;

const ROLES = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "JUGGERNAUT",
] as const;

const IMPROVEMENTS = [
  ["Farm", "farm", "grass"],
  ["Lumber Camp", "lumber-camp", "grass"],
  ["Windmill", "windmill", "grass"],
  ["Sawmill", "sawmill", "grass"],
  ["Forge", "forge", "grass"],
  ["Workshop", "workshop", "grass"],
  ["Market", "market", "grass"],
  ["Monument", "monument", "grass"],
  ["Port", "port", "water"],
  ["Shipyard", "shipyard", "water"],
] as const;

const BACKGROUNDS = {
  grass: "rgb(137,183,91)",
  water: "rgb(143,211,222)",
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

// ------------------------------------------------------------ sheets

interface Cell {
  /** Repository-relative PNG, or raw pixels. */
  readonly image:
    | string
    | {
        readonly data: Buffer;
        readonly width: number;
        readonly height: number;
      };
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

async function pixels(image: Cell["image"]): Promise<{
  readonly png: Buffer;
  readonly width: number;
  readonly height: number;
}> {
  const source =
    typeof image === "string"
      ? sharp(path.join(ROOT, image))
      : sharp(image.data, {
          raw: { width: image.width, height: image.height, channels: 4 },
        });
  const { data, info } = await source
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    png: await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer(),
    width: info.width,
    height: info.height,
  };
}

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
      const art = await pixels(cell.image);
      const artLeft = left + Math.floor((box.width - art.width) / 2) * scale;
      const artTop = top + LABEL_HEIGHT + (box.height - art.height) * scale;
      composites.push({
        input: await sharp(art.png)
          .resize(art.width * scale, art.height * scale, { kernel: "nearest" })
          .png()
          .toBuffer(),
        left: artLeft,
        top: artTop,
      });
      if (cell.flag !== undefined) {
        // The code-drawn city pennant (17 x 11 master px) at its anchor.
        const x = artLeft + cell.flag.x * scale;
        const y = artTop + cell.flag.y * scale;
        const w = 17 * scale;
        const h = 11 * scale;
        overlays.push(
          cell.flag.pole > 0
            ? `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + cell.flag.pole * scale}" stroke="#4a3b2e" stroke-width="${2.6 * scale}"/>`
            : "",
          `<polygon points="${x},${y} ${x + w},${y} ${x + w * 0.72},${y + h / 2} ${x + w},${y + h} ${x},${y + h}" fill="#e35d5b" stroke="#662a29" stroke-width="${1.2 * scale}"/>`,
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

/** Master path of the accepted art of each subject, later batches winning. */
async function acceptedMasters(): Promise<Map<string, string>> {
  const masters = new Map<string, string>();
  for (const batch of await listBatches(ROOT)) {
    if (batch === BATCH) continue;
    const manifest = await loadBatchManifest(ROOT, batch);
    if (manifest.dryRun) continue;
    const records = await loadRecords(productionLayout(ROOT, batch), batch);
    for (const record of Object.values(records.assets))
      if (
        record.status === "ACCEPTED" &&
        existsSync(path.join(ROOT, record.master.path))
      )
        masters.set(record.subject, record.master.path);
  }
  return masters;
}

const slug = (role: string): string => role.toLowerCase().replaceAll("_", "-");

async function sheets(directory: string): Promise<string[]> {
  const others = await acceptedMasters();
  const records = await loadRecords(productionLayout(ROOT, BATCH), BATCH);
  const master = (id: string): string => {
    const record = records.assets[id];
    if (record?.status !== "ACCEPTED")
      throw new Error(`${id} has no accepted record`);
    return record.master.path;
  };
  const files: string[] = [];

  // Units: today, new, and the same role of the other three factions.
  const unitRows: Row[] = ROLES.map((role) => ({
    title: role[0] + role.slice(1).toLowerCase(),
    cells: [
      {
        image: `public/assets/chibi/units/chibi-${slug(role)}.png`,
        label: "today (key red)",
        background: "grass" as const,
      },
      {
        image: master(`chibi-direction-${slug(role)}`),
        label: "new (fixed colours)",
        background: "grass" as const,
      },
      ...(["UNDEAD", "GOBLIN", "DINOSAUR"] as const).flatMap((faction) => {
        const file = others.get(`UNIT:${faction}:${role}`);
        return file === undefined
          ? []
          : [
              {
                image: file,
                label: `${faction[0]}${faction.slice(1).toLowerCase()} (key red)`,
                background: "grass" as const,
              },
            ];
      }),
    ],
  }));
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
  // Zoom step 0.75 on a DPR 1 screen: the 1:1 sheet at three quarters.
  const meta = await sharp(units1x).metadata();
  const zoomFile = path.join(directory, "units-zoom-0.75.png");
  await sharp(units1x)
    .resize(Math.round((meta.width ?? 0) * 0.75), null, { kernel: "nearest" })
    .png({ compressionLevel: 9 })
    .toFile(zoomFile);
  files.push(zoomFile);

  // Portraits on the dock panel.
  const portraitRows: Row[] = ROLES.map((role) => ({
    title: role[0] + role.slice(1).toLowerCase(),
    cells: [
      {
        image: `public/assets/chibi/portraits/chibi-portrait-${slug(role)}.png`,
        label: "today",
        background: "panel" as const,
      },
      {
        image: master(`chibi-direction-portrait-${slug(role)}`),
        label: "new",
        background: "panel" as const,
      },
      {
        image: master(`chibi-direction-${slug(role)}`),
        label: "new map sprite",
        background: "grass" as const,
      },
    ],
  }));
  for (const scale of [1, 4])
    files.push(
      await writeGrid(
        path.join(
          directory,
          `portraits-old-new-${scale === 1 ? "1x" : "x4"}.png`,
        ),
        portraitRows,
        { width: 96, height: 108 },
        scale,
      ),
    );

  // Improvements, the Village and the Mine.
  const mine = "public/assets/chibi/terrain/chibi-mined-mountain-1.png";
  const mineRaster = await sharp(path.join(ROOT, mine))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const tonedMine = tonePixelsV7(
    new Uint8ClampedArray(mineRaster.data),
    mineRaster.info.width,
    mineRaster.info.height,
    { ...RECOMMENDED_DIRECTION_V7.terrain, scale: 100 },
    1,
    terrainPivotV7("TERRAIN:MINED_MOUNTAIN"),
  );
  const improvementRows: Row[] = [
    ...IMPROVEMENTS.map(([title, name, background]) => ({
      title,
      cells: [
        {
          image: `public/assets/chibi/buildings/chibi-${name}.png`,
          label: "today",
          background,
        },
        {
          image: master(`chibi-direction-${name}`),
          label: "new",
          background,
        },
      ],
    })),
    {
      title: "Village",
      cells: [
        {
          image: "public/assets/chibi/settlements/chibi-village.png",
          label: "today",
          background: "grass" as const,
        },
        {
          image: master("chibi-direction-village"),
          label: "new",
          background: "grass" as const,
        },
      ],
    },
    {
      title: "Mine",
      cells: [
        { image: mine, label: "today", background: "grass" as const },
        {
          image: {
            data: Buffer.from(tonedMine),
            width: mineRaster.info.width,
            height: mineRaster.info.height,
          },
          label: "new: terrain art, toned",
          background: "grass" as const,
        },
      ],
    },
  ];
  for (const scale of [1, 4])
    files.push(
      await writeGrid(
        path.join(
          directory,
          `improvements-old-new-${scale === 1 ? "1x" : "x4"}.png`,
        ),
        improvementRows,
        { width: 96, height: 104 },
        scale,
      ),
    );

  // Cities, three tiers, with the pennant at its recorded anchor.
  const cityRows: Row[] = ([1, 2, 3] as const).map((level) => {
    const id = `chibi-direction-city-${level}`;
    const flag = DIRECTION_FLAG_ANCHORS_V7[id];
    return {
      title: `City ${level}`,
      cells: [
        {
          image: `public/assets/chibi/settlements/chibi-city-${level}.png`,
          label: "today (key red)",
          background: "grass" as const,
        },
        { image: master(id), label: "new", background: "grass" as const },
        {
          image: master(id),
          label: "new, with the code-drawn pennant",
          background: "grass" as const,
          ...(flag === undefined ? {} : { flag }),
        },
      ],
    };
  });
  for (const scale of [1, 4])
    files.push(
      await writeGrid(
        path.join(directory, `cities-${scale === 1 ? "1x" : "x4"}.png`),
        cityRows,
        { width: 104, height: 104 },
        scale,
      ),
    );

  // The Farm: one tile, and a 3 x 3 block with the cell boundaries marked.
  const farm = await sharp(path.join(ROOT, master("chibi-direction-farm")))
    .png()
    .toBuffer();
  const scale = 4;
  const block = 3 * TILE * scale;
  const big = await sharp(farm)
    .resize(TILE * scale, TILE * scale, { kernel: "nearest" })
    .png()
    .toBuffer();
  const ticks: string[] = [];
  for (const edge of [1, 2])
    for (const side of [0, block - 6 * scale])
      ticks.push(
        `<rect x="${edge * TILE * scale - 1}" y="${side}" width="2" height="${6 * scale}" fill="#1d2426"/>`,
        `<rect x="${side}" y="${edge * TILE * scale - 1}" width="${6 * scale}" height="2" fill="#1d2426"/>`,
      );
  const farmFile = path.join(directory, "farm-x4.png");
  await sharp({
    create: {
      width: block + TILE * scale + 3 * GAP,
      height: block + 2 * GAP,
      channels: 4,
      background: BACKGROUNDS.panel,
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${block + TILE * scale + 3 * GAP}" height="${block + 2 * GAP}"><rect x="${GAP}" y="${GAP}" width="${TILE * scale}" height="${TILE * scale}" fill="${BACKGROUNDS.grass}"/><rect x="${TILE * scale + 2 * GAP}" y="${GAP}" width="${block}" height="${block}" fill="${BACKGROUNDS.grass}"/></svg>`,
        ),
        left: 0,
        top: 0,
      },
      { input: big, left: GAP, top: GAP },
      ...[0, 1, 2].flatMap((y) =>
        [0, 1, 2].map((x) => ({
          input: big,
          left: TILE * scale + 2 * GAP + x * TILE * scale,
          top: GAP + y * TILE * scale,
        })),
      ),
      {
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${block}" height="${block}">${ticks.join("")}</svg>`,
        ),
        left: TILE * scale + 2 * GAP,
        top: GAP,
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(farmFile);
  files.push(farmFile);
  return files;
}

// ------------------------------------------------------------ browser

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
  await delay(900);
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data?: string };
  if (shot.data === undefined) throw new Error("Chrome returned no screenshot");
  await writeFile(file, Buffer.from(shot.data, "base64"));
  return file;
}

const BOARD = `document.querySelector('canvas.board-canvas-v7')`;
const SCENE = `globalThis.__CHIBI_DIRECTION_SCENE__`;
const CLASSIC_LOOK_KEY = "pulpWars.ruleset7.boardClassicLook.v1";

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

const MATCHES = [
  {
    name: "human",
    factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL", "ORIGINAL"],
  },
  { name: "mixed", factions: ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"] },
] as const;

/**
 * Reloads the page in the default look, or in the classic look of the
 * developer option, and launches a Showcase match.
 */
async function launch(
  connection: Connection,
  url: string,
  factions: readonly string[],
  classic: boolean,
): Promise<void> {
  await evaluate(connection, `globalThis.__DIRECTION_REVIEW_OLD__ = true`);
  await connection.send("Page.navigate", { url });
  await waitFor(
    connection,
    `globalThis.__DIRECTION_REVIEW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); ${
      classic
        ? `localStorage.setItem(${JSON.stringify(CLASSIC_LOOK_KEY)}, JSON.stringify({ classic: true }));`
        : `localStorage.removeItem(${JSON.stringify(CLASSIC_LOOK_KEY)});`
    } globalThis.__DIRECTION_REVIEW_OLD__ = true; })()`,
  );
  await connection.send("Page.reload");
  await waitFor(
    connection,
    `globalThis.__DIRECTION_REVIEW_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  await evaluate(
    connection,
    `(() => { const change = (element, value) => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }; change(document.querySelector('#v7-ai-count'), '3'); change(document.querySelector('#v7-map-type'), 'SHOWCASE'); ${JSON.stringify(factions)}.forEach((faction, seat) => change(document.querySelector('#v7-faction-' + seat), faction)); document.querySelector('[data-action="launch"]').click(); return true; })()`,
  );
  await waitFor(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && ${BOARD}?.dataset.artSet === 'CHIBI'; })()`,
    900,
  );
  // Give the board's rasters time to settle.
  await delay(1500);
}

async function captures(directory: string, baseUrl: string): Promise<string[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error(
      "Set CHROME_PATH to a Chrome binary (or pass --skip-capture)",
    );
  const debugPort = 10_600 + (process.pid % 80);
  const profile = await mkdtemp(
    path.join(tmpdir(), "pulp-wars-direction-review-"),
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
      for (const match of MATCHES) {
        await launch(connection, url.href, match.factions, false);
        for (const step of ["1", "0.75"]) {
          await zoomTo(connection, step, false);
          files.push(
            await screenshot(
              connection,
              path.join(
                directory,
                `showcase-${match.name}-${viewport.name}-zoom-${step}.png`,
              ),
            ),
          );
        }
        if (match.name !== "human") continue;
        if (viewport.name === "desktop") {
          // The board cursor starts on the capital: Enter selects the unit
          // on it, and its dock shows the new portrait.
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
              path.join(directory, "showcase-human-dock-desktop.png"),
            ),
          );
          await pressKey(connection, "Escape");
          await evaluate(
            connection,
            `Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Tech')?.click()`,
          );
          await delay(500);
          files.push(
            await screenshot(
              connection,
              path.join(directory, "showcase-human-tech-desktop.png"),
            ),
          );
          await pressKey(connection, "Escape");
        }
        // The demo patch with the production art: a Farm block over
        // straight and diagonal Roads, cities with pennants, ships.
        await evaluate(
          connection,
          `(async () => { const scene = await import('/scripts/art/visual-direction/scene.ts'); const direction = await import('/src/render/canvas/visual-direction-v7.ts'); ${SCENE} = scene.showVisualDirectionSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, { kind: 'DEMO', direction: direction.LIVE_DIRECTION_V7, sampleSet: 'PRODUCTION' }); return true; })()`,
        );
        await waitFor(connection, `${SCENE} !== undefined`);
        for (const step of ["1", "0.75"]) {
          await zoomTo(connection, step, true);
          await delay(700);
          files.push(
            await screenshot(
              connection,
              path.join(
                directory,
                `ingame-farms-${viewport.name}-zoom-${step}.png`,
              ),
            ),
          );
        }
        await evaluate(
          connection,
          `(() => { ${SCENE}.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
        );
      }
      if (viewport.name === "desktop") {
        // The same all-Human match in the classic look (the previous art).
        await launch(connection, url.href, MATCHES[0].factions, true);
        await zoomTo(connection, "1", false);
        files.push(
          await screenshot(
            connection,
            path.join(directory, "showcase-human-today-desktop-zoom-1.png"),
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
  const port = Number(option("--port") ?? "6471");
  const directory = reviewDirectory(ROOT, BATCH);
  await mkdir(directory, { recursive: true });
  const outputs = await sheets(directory);
  let captureNote = "skipped (--skip-capture)";
  if (!process.argv.includes("--skip-capture")) {
    const server = await startDevServer(port);
    try {
      outputs.push(...(await captures(directory, `http://localhost:${port}/`)));
    } finally {
      stopDevServer(server);
    }
    captureNote =
      "showcase-*: a Showcase match (16 x 16, three rivals) launched from the setup form with ?art=chibi in the default look (the new visual direction, bead pulp_wars-3tq.6); 'human' is every seat Human, 'mixed' is Human, Undead, Goblin and Dinosaur; 'today' is the same all-Human match with Settings > Developer tools > Classic look (previous art) ON. ingame-farms-*: the DEMO patch of scripts/art/visual-direction/scene.ts drawn by the real board host with the live direction and the production art.";
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
        bead: "pulp_wars-3tq.5",
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
  console.log(`Direction review evidence: ${posix(directory)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
