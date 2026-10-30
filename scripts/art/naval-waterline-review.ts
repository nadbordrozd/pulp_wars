/**
 * Review evidence of the ships in the water (bead pulp_wars-oiu5,
 * src/render/canvas/naval-waterline-v7.ts): every faction's fleet (Patrol
 * Boat, Battleship and embarked transport) on Shallow and Deep Water,
 * drawn by the real board host (scene in
 * scripts/art/naval-waterline/scene.ts) whole as before (OFF) and sunk to
 * its waterline with the hull under it a ghost (GHOST, the live look).
 *
 *   tsx scripts/art/naval-waterline-review.ts --out DIR [--sprites]
 *     [--only GOBLIN,UNDEAD] [--port 6531]
 *
 * `--sprites` needs no browser: `sprites-x3.png` shows each ship master at
 * x3 on Shallow Water with its waterline (green, the keel row) and the row
 * that lands on it when sunk (red): everything under the red line goes
 * under the water. Otherwise it captures (muted headless Chrome with the
 * sound and music off, CHROME_PATH, a Vite dev server it starts on --port,
 * never 6173) and writes `all-factions-ghost.png`, one row per faction and
 * a pair of columns (before, ghost) per ship and water, each cell an x2
 * close-up, and per faction `scene-<faction>-{off,ghost}-1x.png` (the game
 * at zoom 1, DPR 1). Nothing is written under the project.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import type { FactionIdV7 } from "../../src/engine/index";
import {
  NAVAL_WATERLINE_SPECS_V7,
  navalWaterlineGeometryV7,
} from "../../src/render/canvas/naval-waterline-v7";
import { readRaster } from "./chibi/pipeline";

const ROOT = process.cwd();

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

/** The seafaring factions, the slug of their ship asset ids, their name. */
const FLEETS: readonly (readonly [FactionIdV7, string, string])[] = [
  ["ORIGINAL", "human", "Human"],
  ["UNDEAD", "undead", "Undead"],
  ["GOBLIN", "goblin", "Goblin"],
  ["DINOSAUR", "dinosaur", "Dinosaur"],
  ["MARTIAN", "martian", "Martian"],
  ["ICE_FOLK", "ice-folk", "Ice Folk"],
  ["DWARF", "dwarf", "Dwarf"],
  ["CANDY", "candy", "Candy"],
  ["CULT", "cult", "Cult"],
];
const SHIPS = ["patrol-boat", "battleship", "transport"] as const;

function fleets(): typeof FLEETS {
  const only = option("--only")?.split(",");
  return only === undefined
    ? FLEETS
    : FLEETS.filter(([faction]) => only.includes(faction));
}

// ------------------------------------------------------------ sprites

function lowestOpaqueRow(raster: {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;
}): number {
  for (let y = raster.height - 1; y >= 0; y -= 1)
    for (let x = 0; x < raster.width; x += 1)
      if ((raster.data[(y * raster.width + x) * 4 + 3] ?? 0) >= 128) return y;
  return raster.height - 1;
}

async function spritesSheet(out: string): Promise<void> {
  const scale = 3;
  const cell = { width: 96 * scale, height: 104 * scale + 22 };
  const water = await readRaster(
    path.join(ROOT, "public/assets/chibi/terrain/chibi-shallow-water-1.png"),
  );
  const tile = await sharp(Buffer.from(water.data), {
    raw: { width: water.width, height: water.height, channels: 4 },
  })
    .resize(96 * scale, 104 * scale, { kernel: "nearest" })
    .png()
    .toBuffer();
  const parts: { input: Buffer; left: number; top: number }[] = [];
  const list = fleets();
  for (const [row, [, slug]] of list.entries())
    for (const [column, ship] of SHIPS.entries()) {
      const id = `chibi-naval-${slug}-${ship}`;
      const file = path.join(ROOT, "public/assets/chibi/units", `${id}.png`);
      const raster = await readRaster(file);
      const spec = NAVAL_WATERLINE_SPECS_V7[id];
      const geometry =
        spec === undefined
          ? null
          : navalWaterlineGeometryV7(
              raster.width,
              raster.height,
              (x, y) => raster.data[(y * raster.width + x) * 4 + 3] ?? 0,
              spec,
            );
      const left = column * (cell.width + 8);
      const top = row * (cell.height + 8);
      const dx = Math.floor((96 - raster.width) / 2) * scale;
      const dy = (104 - raster.height) * scale;
      parts.push({ input: tile, left, top: top + 22 });
      parts.push({
        input: await sharp(file)
          .resize(raster.width * scale, raster.height * scale, {
            kernel: "nearest",
          })
          .png()
          .toBuffer(),
        left: left + dx,
        top: top + 22 + dy,
      });
      // Ticks every 2 rows above the keel (labelled every 4), for depths.
      const keel = geometry?.keel ?? lowestOpaqueRow(raster);
      const ticks = Array.from({ length: 13 }, (_, step) => step * 2)
        .map(
          (rows) =>
            `<rect x="${cell.width - (rows % 4 === 0 ? 14 : 8)}" y="${22 + dy + (keel - rows) * scale}" width="${rows % 4 === 0 ? 14 : 8}" height="1" fill="#ffffff"/>` +
            (rows % 4 === 0 && rows > 0
              ? `<text x="${cell.width - 34}" y="${26 + dy + (keel - rows) * scale}" font-family="Helvetica, Arial, sans-serif" font-size="11" fill="#1e2128">${rows}</text>`
              : ""),
        )
        .join("");
      const lines =
        ticks +
        (geometry === null
          ? ""
          : [
              ["#2ecc40", geometry.keel],
              ["#ff4136", geometry.keel - geometry.sinkRows],
            ]
              .map(
                ([colour, y]) =>
                  `<rect x="${dx}" y="${22 + dy + Number(y) * scale}" width="${raster.width * scale}" height="2" fill="${colour}"/>`,
              )
              .join(""));
      parts.push({
        input: Buffer.from(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${cell.width}" height="${cell.height}">${lines}<text x="2" y="16" font-family="Helvetica, Arial, sans-serif" font-size="14" font-weight="700" fill="#f4f1e8">${id.replace("chibi-naval-", "")} ${spec === undefined ? "(not listed)" : `sink ${spec.sinkRows}`}</text></svg>`,
        ),
        left,
        top,
      });
    }
  const width = SHIPS.length * (cell.width + 8);
  const height = list.length * (cell.height + 8);
  await sharp({
    create: { width, height, channels: 4, background: "#1e2128" },
  })
    .composite(parts)
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, "sprites-x3.png"));
  console.log("wrote sprites-x3.png");
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
  attempts = 600,
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

type WaterlineMode = "OFF" | "GHOST";

interface Capture {
  readonly faction: FactionIdV7;
  readonly mode: WaterlineMode;
  readonly png: Buffer;
  readonly cells: readonly { readonly x: number; readonly y: number }[];
}

const VIEWPORT = { width: 1600, height: 1000 };
const SCENE = "globalThis.__WATERLINE_SCENE__";
const MODES: readonly WaterlineMode[] = ["OFF", "GHOST"];

async function captureAll(baseUrl: string): Promise<Capture[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary");
  const captures: Capture[] = [];
  const debugPort = 11_000 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-waterline-"));
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
      `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
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
    await connection.send("Emulation.setDeviceMetricsOverride", {
      ...VIEWPORT,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluate(connection, `globalThis.__WL_OLD__ = true`);
    await connection.send("Page.navigate", { url: url.href });
    await waitFor(
      connection,
      `globalThis.__WL_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
    );
    // Fresh storage, the sound and the music off, then the Showcase board.
    await evaluate(
      connection,
      `(() => { localStorage.clear(); localStorage.setItem('pulpWars.settings.v1', JSON.stringify({ sound: false, music: false })); globalThis.__WL_OLD__ = true; })()`,
    );
    await connection.send("Page.reload");
    await waitFor(
      connection,
      `globalThis.__WL_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
    );
    await evaluate(
      connection,
      `(() => { const type = document.querySelector('#v7-map-type'); type.value = 'SHOWCASE'; type.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-action="launch"]').click(); return true; })()`,
    );
    await waitFor(
      connection,
      `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
      900,
    );
    for (const [faction] of fleets())
      for (const mode of MODES) {
        await evaluate(
          connection,
          `(async () => { const module = await import('/scripts/art/naval-waterline/scene.ts'); const live = globalThis.__PULP_WARS_APP__.controller.snapshot().view; ${SCENE} = { ...module.showWaterlineSceneV7(live, ${JSON.stringify({ faction, waterline: mode })}), ships: module.waterlineSceneShipCellsV7(live) }; return true; })()`,
        );
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const step = await evaluate<string | null>(
            connection,
            `${SCENE}.canvas.dataset.zoomStep ?? null`,
          );
          if (step === "1") break;
          await evaluate(
            connection,
            `${SCENE}.host.zoom(${JSON.stringify(Number(step) < 1 ? "IN" : "OUT")})`,
          );
        }
        const png = await settledScreenshot(connection);
        const cells = await evaluate<{ x: number; y: number }[]>(
          connection,
          `(() => { const rect = ${SCENE}.canvas.getBoundingClientRect(); return ${SCENE}.ships.map((at) => { const c = ${SCENE}.host.cellCentreCssPx(at); return { x: rect.left + c.x, y: rect.top + c.y }; }); })()`,
        );
        captures.push({ faction, mode, png, cells });
        console.log(`captured ${faction} ${mode}`);
        await evaluate(
          connection,
          `(() => { ${SCENE}.host.destroy(); document.querySelector('[data-waterline-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
        );
      }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
  return captures;
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

// ------------------------------------------------------------ sheets

function labelSvg(
  width: number,
  height: number,
  labels: readonly { text: string; x: number; y: number; size?: number }[],
): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels
      .map(
        (label) =>
          `<text x="${label.x}" y="${label.y}" font-family="Helvetica, Arial, sans-serif" font-size="${label.size ?? 16}" font-weight="700" fill="#f4f1e8">${label.text.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</text>`,
      )
      .join("")}</svg>`,
  );
}

async function crop(
  png: Buffer,
  window: { left: number; top: number; width: number; height: number },
  scale: number,
): Promise<Buffer> {
  const cropped = await sharp(png).extract(window).png().toBuffer();
  return scale === 1
    ? cropped
    : sharp(cropped)
        .resize(window.width * scale, window.height * scale, {
          kernel: "nearest",
        })
        .png()
        .toBuffer();
}

function sceneWindow(capture: Capture): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const xs = capture.cells.map((cell) => cell.x);
  const ys = capture.cells.map((cell) => cell.y);
  const left = Math.max(0, Math.round(Math.min(...xs) - 70));
  const top = Math.max(0, Math.round(Math.min(...ys) - 100));
  const right = Math.min(VIEWPORT.width, Math.round(Math.max(...xs) + 70));
  const bottom = Math.min(VIEWPORT.height, Math.round(Math.max(...ys) + 55));
  return { left, top, width: right - left, height: bottom - top };
}

/** A close-up of one ship cell: its sprite and the water round it. */
function shipWindow(cell: { x: number; y: number }): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  return {
    left: Math.round(cell.x - 56),
    top: Math.round(cell.y - 92),
    width: 112,
    height: 136,
  };
}

/** Scene ship order: the Shallow row (P, B, T), then the Deep row. */
const COLUMNS = [
  "Patrol Boat",
  "Battleship",
  "Transport",
  "Patrol Boat",
  "Battleship",
  "Transport",
] as const;

async function writeSheets(
  out: string,
  captures: readonly Capture[],
): Promise<void> {
  for (const capture of captures) {
    const name = `scene-${capture.faction.toLowerCase()}-${capture.mode.toLowerCase()}-1x.png`;
    await writeFile(
      path.join(out, name),
      await crop(capture.png, sceneWindow(capture), 1),
    );
  }
  const scale = 2;
  const cell = { width: 112 * scale, height: 136 * scale };
  const gap = 6;
  const pairGap = 18;
  const head = 64;
  const side = 110;
  const pair = cell.width * 2 + gap + pairGap;
  const list = fleets();
  const width = side + COLUMNS.length * pair;
  const height = head + list.length * (cell.height + gap);
  const parts: { input: Buffer; left: number; top: number }[] = [];
  for (const [row, [faction]] of list.entries())
    for (const [index, mode] of MODES.entries()) {
      const capture = captures.find(
        (entry) => entry.faction === faction && entry.mode === mode,
      );
      if (capture === undefined) continue;
      for (const [column, at] of capture.cells.entries())
        parts.push({
          input: await crop(capture.png, shipWindow(at), scale),
          left: side + column * pair + index * (cell.width + gap),
          top: head + row * (cell.height + gap),
        });
    }
  await sharp({
    create: { width, height, channels: 4, background: "#1e2128" },
  })
    .composite([
      ...parts,
      {
        input: labelSvg(width, height, [
          ...COLUMNS.map((text, column) => ({
            text: `${text}, ${column < 3 ? "Shallow" : "Deep"}`,
            x: side + column * pair + 4,
            y: 24,
            size: 16,
          })),
          ...COLUMNS.flatMap((_, column) =>
            ["Before", "Ghost waterline"].map((text, index) => ({
              text,
              x: side + column * pair + index * (cell.width + gap) + 4,
              y: 52,
              size: 13,
            })),
          ),
          ...list.map(([, , label], row) => ({
            text: label,
            x: 6,
            y: head + row * (cell.height + gap) + cell.height / 2,
            size: 16,
          })),
        ]),
        left: 0,
        top: 0,
      },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(out, "all-factions-ghost.png"));
  console.log("wrote all-factions-ghost.png");
}

async function main(): Promise<void> {
  const out = option("--out");
  if (out === undefined) throw new Error("--out DIR is required");
  const resolved = path.resolve(out);
  if (!path.relative(ROOT, resolved).startsWith(".."))
    throw new Error("--out must be outside the repository");
  await mkdir(resolved, { recursive: true });
  if (process.argv.includes("--sprites")) {
    await spritesSheet(resolved);
    return;
  }
  const port = Number.parseInt(option("--port") ?? "6531", 10);
  const server = await startDevServer(port);
  let captures: Capture[];
  try {
    captures = await captureAll(`http://localhost:${port}/`);
  } finally {
    stopDevServer(server);
  }
  await writeSheets(resolved, captures);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
