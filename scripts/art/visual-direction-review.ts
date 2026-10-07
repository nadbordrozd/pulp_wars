/**
 * Visual-direction test bench (bead pulp_wars-3tq.1): renders one busy,
 * deterministic four-player map (one faction per player: Human, Undead,
 * Goblin, Dinosaur; it was all-Human until bead pulp_wars-w5j.3, since
 * every player plays a different faction) through the real board host in
 * many rendering variants and writes comparison sheets and measurements.
 * Sheets checked in before bead pulp_wars-w5j.3 show the all-Human bench.
 *
 *   npm run art:visual-direction-review -- [--port 6451]
 *       [--variants today,recommended] [--viewports desktop,phone]
 *       [--zooms 1,0.75] [--captures DIR] [--out DIR] [--skip-capture]
 *
 * Captures (large, not checked in) go to --captures, by default
 * <tmp>/pulp-wars-visual-direction. Sheets go to --out, by default
 * art/explorations/visual-direction-2026-10/review:
 *
 *   before-after-<viewport>-zoom-<step>.png  today beside the recommended
 *       direction at 1:1 device pixels (the phone cropped to the board)
 *   factors-desktop.png          one lever changed at a time
 *   candidates-desktop.png, candidates-phone-zoom-0.75.png
 *   same-unit-phone-zoom-0.75.png  four players' Fighters (one per
 *       faction), as seen and under simulated deuteranopia and protanopia
 *   empty-map-desktop.png        the bare terrain and the map without units
 *   sample-units-x4.png          per unit, x4 nearest, in the key colour and
 *       the four player colours: A the production sprite, B the same sprite
 *       with its garment recoloured cream by code, C the exploration sample
 *       with a small accent mask (no capture needed)
 *   metrics.json                 the measurements quoted in the document
 *
 * With --demo (npm run art:visual-direction-demo-review, bead
 * pulp_wars-3tq.3) it writes the Human demo's evidence instead, to
 * art/explorations/human-demo-2026-10/review, from a Showcase with a Human
 * viewer against Undead, Goblin and Dinosaur seats:
 *
 *   before-after-busy-<viewport>-zoom-<step>.png      the busy bench
 *   before-after-showcase-<viewport>-zoom-<step>.png  the Showcase itself
 *   demo-scene-desktop.png        the demo patch (scene.ts, DEMO)
 *   building-style-candidates-x4.png  every building style sample tried
 *   building-styles-bench-desktop.png style A against style B on the bench
 *   buildings-old-new.png         each improvement and city, 1:1 and x4
 *   farm.png                      one Farm, a 3 x 3 block, Roads under it
 *   base-plates.png               the base variants on land and water
 *   same-unit-phone-zoom-0.75.png four players' units, colour-vision sims
 *
 * The scene and the variants are scripts/art/visual-direction/scene.ts and
 * variants.ts. Captures start Vite on --port (never the user's 6173) and
 * use headless Chrome from CHROME_PATH. No PixelLab call is made.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET7_PLAYER_COLORS,
  parseHexColourV7,
  recolourOwnerPixelsV7,
} from "../../src/render/canvas/owner-recolour-v7";
import { HUMAN_GARMENT_COLOUR_V7 } from "../../src/render/canvas/visual-direction-v7";
import {
  HUMAN_DEMO_VARIANTS_V7,
  VISUAL_DIRECTION_VARIANTS_V7,
  type VisualDirectionVariantV7,
} from "./visual-direction/variants";

const ROOT = process.cwd();
const DEMO_MODE = process.argv.includes("--demo");
const DEMO_EXPLORATION = "art/explorations/human-demo-2026-10";
const EXPLORATION = "art/explorations/visual-direction-2026-10";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const CAPTURES = path.resolve(
  option("--captures") ?? path.join(tmpdir(), "pulp-wars-visual-direction"),
);
const OUT = path.resolve(
  option("--out") ??
    path.join(DEMO_MODE ? DEMO_EXPLORATION : EXPLORATION, "review"),
);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
] as const;
type Viewport = (typeof VIEWPORTS)[number];
const ZOOMS = ["1", "0.75"] as const;
type Kind =
  "BUSY" | "NO_UNITS" | "EMPTY" | "MARKER" | "DEMO" | "DEMO_MARKER" | "LIVE";

function captureFile(
  variant: string,
  kind: Kind,
  viewport: string,
  zoom: string,
): string {
  return path.join(
    CAPTURES,
    `${variant}-${kind.toLowerCase()}-${viewport}-zoom-${zoom}.png`,
  );
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

interface CaptureJob {
  readonly variant: VisualDirectionVariantV7;
  readonly kind: Kind;
  readonly zooms: readonly string[];
  /** Omitted: every viewport. */
  readonly viewports?: readonly string[];
}

async function captureJobs(
  connection: Connection,
  viewport: Viewport,
  jobs: readonly CaptureJob[],
): Promise<void> {
  for (const job of jobs) {
    if (job.viewports !== undefined && !job.viewports.includes(viewport.name))
      continue;
    if (job.zooms.length === 0) continue;
    const options = {
      kind: job.kind,
      ...(job.variant.direction === undefined
        ? {}
        : {
            direction: job.variant.direction,
            sampleSet: job.variant.sampleSet ?? "STUDY",
          }),
    };
    await evaluate(
      connection,
      `(async () => { const module = await import('/scripts/art/visual-direction/scene.ts'); globalThis.__VD_SCENE__ = module.showVisualDirectionSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(options)}); return true; })()`,
    );
    for (const step of job.zooms) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const current = await evaluate<string | null>(
          connection,
          `globalThis.__VD_SCENE__.canvas.dataset.zoomStep ?? null`,
        );
        if (current === step) break;
        await evaluate(
          connection,
          `globalThis.__VD_SCENE__.host.zoom(${JSON.stringify(Number(current) < Number(step) ? "IN" : "OUT")})`,
        );
      }
      const zoomStep = await evaluate<string | null>(
        connection,
        `globalThis.__VD_SCENE__.canvas.dataset.zoomStep ?? null`,
      );
      if (zoomStep !== step)
        throw new Error(`scene could not reach zoom ${step}: ${zoomStep}`);
      await writeFile(
        captureFile(job.variant.id, job.kind, viewport.name, step),
        await settledScreenshot(connection),
      );
    }
    await evaluate(
      connection,
      `(() => { globalThis.__VD_SCENE__.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete globalThis.__VD_SCENE__; return true; })()`,
    );
    console.log(`captured ${job.variant.id} ${job.kind} ${viewport.name}`);
  }
}

async function captureAll(
  baseUrl: string,
  viewports: readonly Viewport[],
  jobs: readonly CaptureJob[],
): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const debugPort = 10_500 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-vd-"));
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
    for (const viewport of viewports) {
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: viewport.mobile,
      });
      await evaluate(connection, `globalThis.__VD_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__VD_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__VD_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__VD_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      // The fixed 16 x 16 Showcase board: the scene needs 13 x 11 cells and
      // rewrites the patch around the capital, whose cell never varies, so
      // every run frames the scene identically.
      await evaluate(
        connection,
        // The demo plays a Showcase with three rivals: a Human viewer
        // against the default Undead, Goblin and Dinosaur seats (every
        // player plays a different faction since bead pulp_wars-w5j.1; it
        // was an all-Human Showcase until bead pulp_wars-w5j.3).
        DEMO_MODE
          ? `(() => { const change = (element, value) => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })); }; change(document.querySelector('#v7-ai-count'), '3'); change(document.querySelector('#v7-map-type'), 'SHOWCASE'); change(document.querySelector('#v7-faction-0'), 'ORIGINAL'); document.querySelector('[data-action="launch"]').click(); return true; })()`
          : `(() => { const type = document.querySelector('#v7-map-type'); type.value = 'SHOWCASE'; type.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-action="launch"]').click(); return true; })()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      await captureJobs(
        connection,
        viewport,
        jobs.map((job) => ({
          ...job,
          // The unit-free map is only measured, on the desktop at zoom 1;
          // the marker pair locates the scene in every framing.
          zooms:
            DEMO_MODE || job.kind === "BUSY" || job.variant.id === "today"
              ? job.zooms
              : viewport.name === "desktop"
                ? ["1"]
                : [],
        })),
      );
    }
    connection.close();
  } finally {
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

// ------------------------------------------------------------ rasters

interface Raster {
  readonly width: number;
  readonly height: number;
  /** RGB, 3 bytes per pixel. */
  readonly data: Buffer;
}

async function loadRaster(file: string): Promise<Raster> {
  const { data, info } = await sharp(file)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}

const lumaOf = (raster: Raster, index: number): number =>
  0.299 * (raster.data[index * 3] ?? 0) +
  0.587 * (raster.data[index * 3 + 1] ?? 0) +
  0.114 * (raster.data[index * 3 + 2] ?? 0);

/** Sobel gradient magnitude of the luma, per pixel (0 on the border). */
function edges(raster: Raster): Float32Array {
  const { width, height } = raster;
  const luma = new Float32Array(width * height);
  for (let index = 0; index < luma.length; index += 1)
    luma[index] = lumaOf(raster, index);
  const out = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y += 1)
    for (let x = 1; x < width - 1; x += 1) {
      const at = (dx: number, dy: number): number =>
        luma[(y + dy) * width + x + dx] ?? 0;
      const gx =
        at(1, -1) +
        2 * at(1, 0) +
        at(1, 1) -
        at(-1, -1) -
        2 * at(-1, 0) -
        at(-1, 1);
      const gy =
        at(-1, 1) +
        2 * at(0, 1) +
        at(1, 1) -
        at(-1, -1) -
        2 * at(0, -1) -
        at(1, -1);
      out[y * width + x] = Math.hypot(gx, gy);
    }
  return out;
}

function saturated(raster: Raster, index: number): boolean {
  const r = raster.data[index * 3] ?? 0;
  const g = raster.data[index * 3 + 1] ?? 0;
  const b = raster.data[index * 3 + 2] ?? 0;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max >= 110 && max > 0 && (max - min) / max >= 0.55;
}

const PLAYER_RGB = Object.values(RULESET7_PLAYER_COLORS).map((hex) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255] as const;
});

/** A pixel in (a shade of) one of the four player colours. */
function playerColoured(raster: Raster, index: number): boolean {
  const r = raster.data[index * 3] ?? 0;
  const g = raster.data[index * 3 + 1] ?? 0;
  const b = raster.data[index * 3 + 2] ?? 0;
  const max = Math.max(r, g, b);
  if (max < 90) return false;
  return PLAYER_RGB.some(([pr, pg, pb]) => {
    // Compare chromaticity, so the recolour's shading still counts.
    const scale = max / Math.max(pr, pg, pb);
    return (
      Math.abs(r - pr * scale) +
        Math.abs(g - pg * scale) +
        Math.abs(b - pb * scale) <
      36
    );
  });
}

interface Metrics {
  /** Mean luma gradient of the map without units: how busy the backdrop is. */
  readonly backgroundEdgeDensity: number;
  /** Share of strongly saturated pixels in the map without units. */
  readonly backgroundSaturatedShare: number;
  /** Mean gradient on unit pixels divided by the backdrop's. */
  readonly unitToBackgroundEdgeRatio: number;
  /** Mean colour distance between unit pixels and the backdrop they cover. */
  readonly unitFigureGroundDistance: number;
  /** Player-coloured pixels on units and their markers, of all such pixels. */
  readonly playerColourOnUnitsShare: number;
  /** Player-coloured pixels in the map without units, per 1000 pixels. */
  readonly backgroundPlayerColourPerMille: number;
}

function measure(busy: Raster, noUnits: Raster): Metrics {
  const count = busy.width * busy.height;
  const unit = new Uint8Array(count);
  let distance = 0;
  let unitPixels = 0;
  for (let index = 0; index < count; index += 1) {
    const d =
      Math.abs((busy.data[index * 3] ?? 0) - (noUnits.data[index * 3] ?? 0)) +
      Math.abs(
        (busy.data[index * 3 + 1] ?? 0) - (noUnits.data[index * 3 + 1] ?? 0),
      ) +
      Math.abs(
        (busy.data[index * 3 + 2] ?? 0) - (noUnits.data[index * 3 + 2] ?? 0),
      );
    if (d > 24) {
      unit[index] = 1;
      distance += d / 3;
      unitPixels += 1;
    }
  }
  const backgroundEdges = edges(noUnits);
  const busyEdges = edges(busy);
  let backgroundEdgeSum = 0;
  let unitEdgeSum = 0;
  let backgroundSaturated = 0;
  let playerOnUnits = 0;
  let playerAll = 0;
  let playerBackground = 0;
  for (let index = 0; index < count; index += 1) {
    backgroundEdgeSum += backgroundEdges[index] ?? 0;
    if (saturated(noUnits, index)) backgroundSaturated += 1;
    if (playerColoured(noUnits, index)) playerBackground += 1;
    if (unit[index] === 1) unitEdgeSum += busyEdges[index] ?? 0;
    if (playerColoured(busy, index)) {
      playerAll += 1;
      if (unit[index] === 1) playerOnUnits += 1;
    }
  }
  const round = (value: number, digits = 3): number =>
    Number(value.toFixed(digits));
  const backgroundEdgeDensity = backgroundEdgeSum / count;
  return {
    backgroundEdgeDensity: round(backgroundEdgeDensity, 2),
    backgroundSaturatedShare: round(backgroundSaturated / count),
    unitToBackgroundEdgeRatio: round(
      unitPixels === 0 ? 0 : unitEdgeSum / unitPixels / backgroundEdgeDensity,
      2,
    ),
    unitFigureGroundDistance: round(
      unitPixels === 0 ? 0 : distance / unitPixels,
      1,
    ),
    playerColourOnUnitsShare: round(
      playerAll === 0 ? 0 : playerOnUnits / playerAll,
    ),
    backgroundPlayerColourPerMille: round((playerBackground / count) * 1000, 1),
  };
}

/**
 * Colour-vision-deficiency simulation (Machado, Oliveira and Fernandes 2009,
 * severity 1.0), applied in linear RGB.
 */
const CVD = {
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182,
    0.04294, 0.968881,
  ],
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882,
    -0.048116, 1.051998,
  ],
} as const;

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

function simulate(raster: Raster, kind: keyof typeof CVD): Raster {
  const m = CVD[kind];
  const data = Buffer.alloc(raster.data.length);
  for (let index = 0; index < raster.width * raster.height; index += 1) {
    const r = toLinear(raster.data[index * 3] ?? 0);
    const g = toLinear(raster.data[index * 3 + 1] ?? 0);
    const b = toLinear(raster.data[index * 3 + 2] ?? 0);
    data[index * 3] = toSrgb(m[0] * r + m[1] * g + m[2] * b);
    data[index * 3 + 1] = toSrgb(m[3] * r + m[4] * g + m[5] * b);
    data[index * 3 + 2] = toSrgb(m[6] * r + m[7] * g + m[8] * b);
  }
  return { width: raster.width, height: raster.height, data };
}

function crop(
  raster: Raster,
  box: { left: number; top: number; width: number; height: number },
): Raster {
  const left = Math.max(0, Math.min(raster.width - 1, Math.round(box.left)));
  const top = Math.max(0, Math.min(raster.height - 1, Math.round(box.top)));
  const width = Math.min(raster.width - left, Math.round(box.width));
  const height = Math.min(raster.height - top, Math.round(box.height));
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1)
    raster.data.copy(
      data,
      y * width * 3,
      ((top + y) * raster.width + left) * 3,
      ((top + y) * raster.width + left + width) * 3,
    );
  return { width, height, data };
}

interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * The centre of the scene's capital cell in device pixels: the middle of
 * the selection outline that the MARKER capture adds to the NO_UNITS one.
 */
async function capitalCentre(
  viewport: string,
  zoom: string,
  pair: readonly [Kind, Kind] = ["NO_UNITS", "MARKER"],
): Promise<Point> {
  const empty = await loadRaster(captureFile("today", pair[0], viewport, zoom));
  const marker = await loadRaster(
    captureFile("today", pair[1], viewport, zoom),
  );
  let left = empty.width;
  let right = -1;
  let top = empty.height;
  let bottom = -1;
  for (let y = 0; y < empty.height; y += 1)
    for (let x = 0; x < empty.width; x += 1) {
      const index = (y * empty.width + x) * 3;
      if (
        empty.data[index] === marker.data[index] &&
        empty.data[index + 1] === marker.data[index + 1] &&
        empty.data[index + 2] === marker.data[index + 2]
      )
        continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  if (right < 0) throw new Error(`no capital marker in ${viewport} ${zoom}`);
  return { x: (left + right + 1) / 2, y: (top + bottom + 1) / 2 };
}

/** A window of the capture centred on a point (clamped to the capture). */
function centred(
  raster: Raster,
  width: number,
  height: number,
  centre: Point,
): Raster {
  const boxWidth = Math.min(width, raster.width);
  const boxHeight = Math.min(height, raster.height);
  return crop(raster, {
    left: Math.max(
      0,
      Math.min(raster.width - boxWidth, centre.x - boxWidth / 2),
    ),
    top: Math.max(
      0,
      Math.min(raster.height - boxHeight, centre.y - boxHeight / 2),
    ),
    width: boxWidth,
    height: boxHeight,
  });
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

interface Panel {
  readonly label: string;
  readonly raster: Raster;
}

/** A labelled grid of equally sized panels; `scale` resizes every panel. */
async function writeGrid(
  file: string,
  panels: readonly Panel[],
  columns: number,
  scale = 1,
): Promise<void> {
  const first = panels[0];
  if (first === undefined) return;
  const cellWidth = Math.round(first.raster.width * scale);
  const cellHeight = Math.round(first.raster.height * scale);
  const gap = 12;
  const labelHeight = 30;
  const rows = Math.ceil(panels.length / columns);
  const width = columns * cellWidth + (columns + 1) * gap;
  const height = rows * (cellHeight + labelHeight + gap) + gap;
  const composites: { input: Buffer; left: number; top: number }[] = [];
  const labels: string[] = [];
  for (const [index, panel] of panels.entries()) {
    const left = gap + (index % columns) * (cellWidth + gap);
    const top =
      gap + Math.floor(index / columns) * (cellHeight + labelHeight + gap);
    composites.push({
      input: await sharp(panel.raster.data, {
        raw: {
          width: panel.raster.width,
          height: panel.raster.height,
          channels: 3,
        },
      })
        .resize(cellWidth, cellHeight, {
          kernel: scale >= 1 ? "nearest" : "lanczos3",
          fit: "fill",
        })
        .png()
        .toBuffer(),
      left,
      top: top + labelHeight,
    });
    labels.push(
      `<text x="${left}" y="${top + 21}" font-family="Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#f4f1e8">${escapeXml(panel.label)}</text>`,
    );
  }
  composites.push({
    input: Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${labels.join("")}</svg>`,
    ),
    left: 0,
    top: 0,
  });
  await sharp({
    create: { width, height, channels: 3, background: "#1c2426" },
  })
    .composite(composites)
    .png({ compressionLevel: 9, palette: true, colours: 256, dither: 0 })
    .toFile(file);
  console.log(`wrote ${path.relative(ROOT, file)}`);
}

// ------------------------------------------------------------ sheets

const FACTORS = VISUAL_DIRECTION_VARIANTS_V7.filter((variant) =>
  variant.id.startsWith("f-"),
);
const CANDIDATES = VISUAL_DIRECTION_VARIANTS_V7.filter(
  (variant) => variant.id.startsWith("c") || variant.id === "recommended",
);
const TODAY = VISUAL_DIRECTION_VARIANTS_V7.find(
  (variant) => variant.id === "today",
);

async function panel(
  variant: VisualDirectionVariantV7,
  viewport: Viewport,
  zoom: string,
  size?: { readonly width: number; readonly height: number },
  kind: Kind = "BUSY",
): Promise<Panel | null> {
  const file = captureFile(variant.id, kind, viewport.name, zoom);
  if (!existsSync(file)) return null;
  const raster = await loadRaster(file);
  return {
    label: variant.label,
    raster:
      size === undefined
        ? raster
        : centred(
            raster,
            size.width * viewport.dpr,
            size.height * viewport.dpr,
            await capitalCentre(viewport.name, zoom),
          ),
  };
}

const present = <T>(values: readonly (T | null)[]): T[] =>
  values.filter((value): value is T => value !== null);

/** An RGBA sprite with its owner mask recoloured, composited on grass. */
async function recolouredSprite(
  sprite: string,
  mask: string,
  colour: string | null,
  cell: { readonly width: number; readonly height: number },
): Promise<Raster> {
  const read = async (file: string) =>
    sharp(path.join(ROOT, file))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  const source = await read(sprite);
  const maskData = await read(mask);
  const owner = colour === null ? null : parseHexColourV7(colour);
  const pixels =
    owner === null
      ? new Uint8ClampedArray(source.data)
      : recolourOwnerPixelsV7({
          pixels: new Uint8ClampedArray(source.data),
          width: source.info.width,
          height: source.info.height,
          mask: new Uint8ClampedArray(maskData.data),
          maskWidth: maskData.info.width,
          maskHeight: maskData.info.height,
          owner,
        });
  const data = Buffer.alloc(cell.width * cell.height * 3);
  const grass = [137, 183, 91];
  const left = Math.floor((cell.width - source.info.width) / 2);
  const top = cell.height - source.info.height;
  for (let y = 0; y < cell.height; y += 1)
    for (let x = 0; x < cell.width; x += 1) {
      const sx = x - left;
      const sy = y - top;
      const inside =
        sx >= 0 && sy >= 0 && sx < source.info.width && sy < source.info.height;
      const offset = (sy * source.info.width + sx) * 4;
      const alpha = inside ? (pixels[offset + 3] ?? 0) / 255 : 0;
      for (let channel = 0; channel < 3; channel += 1)
        data[(y * cell.width + x) * 3 + channel] = Math.round(
          (inside ? (pixels[offset + channel] ?? 0) : 0) * alpha +
            (grass[channel] ?? 0) * (1 - alpha),
        );
    }
  return { width: cell.width, height: cell.height, data };
}

/** Production sprites beside the exploration samples, in every colour. */
async function sampleSheet(): Promise<void> {
  const cell = { width: 76, height: 92 };
  const colours: readonly (readonly [string, string | null])[] = [
    ["key", null],
    ...Object.entries(RULESET7_PLAYER_COLORS),
  ];
  const panels: Panel[] = [];
  for (const unit of ["fighter", "marksman", "knight"]) {
    const rows: readonly (readonly [string, string, string, boolean])[] = [
      [
        `${unit} A: production`,
        `public/assets/chibi/units/chibi-${unit}.png`,
        `public/assets/chibi/units/chibi-${unit}.mask.png`,
        false,
      ],
      [
        `${unit} B: cream`,
        `public/assets/chibi/units/chibi-${unit}.png`,
        `public/assets/chibi/units/chibi-${unit}.mask.png`,
        true,
      ],
      [
        `${unit} C: sample`,
        `${EXPLORATION}/assets/chibi-sample-accent-${unit}.png`,
        `${EXPLORATION}/assets/chibi-sample-accent-${unit}.mask.png`,
        false,
      ],
    ];
    for (const [label, sprite, mask, cream] of rows) {
      if (!existsSync(path.join(ROOT, sprite))) continue;
      for (const [name, colour] of colours)
        panels.push({
          label: name === "key" ? label : name.toLowerCase(),
          raster: await recolouredSprite(
            sprite,
            mask,
            cream ? HUMAN_GARMENT_COLOUR_V7 : colour,
            cell,
          ),
        });
    }
  }
  if (panels.length > 0)
    await writeGrid(path.join(OUT, "sample-units-x4.png"), panels, 5, 4);
}

async function compose(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  await sampleSheet();
  const [desktop, phone] = VIEWPORTS;
  const recommended = VISUAL_DIRECTION_VARIANTS_V7.find(
    (variant) => variant.id === "recommended",
  );
  if (TODAY === undefined || recommended === undefined)
    throw new Error("the today and recommended variants are required");
  for (const viewport of VIEWPORTS)
    for (const zoom of ZOOMS) {
      const size =
        viewport.name === "phone"
          ? { width: 390, height: 600 }
          : { width: 1120, height: 900 };
      const pair = present([
        await panel(TODAY, viewport, zoom, size),
        await panel(recommended, viewport, zoom, size),
      ]);
      if (pair.length === 2)
        await writeGrid(
          path.join(OUT, `before-after-${viewport.name}-zoom-${zoom}.png`),
          pair,
          2,
        );
    }
  const factorSize = { width: 560, height: 480 };
  const factors = present(
    await Promise.all(
      [TODAY, ...FACTORS].map((variant) =>
        panel(variant, desktop, "1", factorSize),
      ),
    ),
  );
  if (factors.length > 1)
    await writeGrid(path.join(OUT, "factors-desktop.png"), factors, 3);
  const candidates = present(
    await Promise.all(
      [TODAY, ...CANDIDATES].map((variant) =>
        panel(variant, desktop, "1", factorSize),
      ),
    ),
  );
  if (candidates.length > 1)
    await writeGrid(path.join(OUT, "candidates-desktop.png"), candidates, 3);
  const phoneSize = { width: 390, height: 520 };
  const phoneCandidates = present(
    await Promise.all(
      [TODAY, ...CANDIDATES].map((variant) =>
        panel(variant, phone, "0.75", phoneSize),
      ),
    ),
  );
  if (phoneCandidates.length > 1)
    await writeGrid(
      path.join(OUT, "candidates-phone-zoom-0.75.png"),
      phoneCandidates,
      3,
      0.5,
    );
  const hard = present([
    await panel(TODAY, phone, "0.75", phoneSize),
    await panel(recommended, phone, "0.75", phoneSize),
  ]);
  if (hard.length === 2)
    await writeGrid(
      path.join(OUT, "same-unit-phone-zoom-0.75.png"),
      (["normal", "deuteranopia", "protanopia"] as const).flatMap((vision) =>
        hard.map((entry) => ({
          label: `${entry.label} · ${vision}`,
          raster:
            vision === "normal" ? entry.raster : simulate(entry.raster, vision),
        })),
      ),
      2,
      2 / 3,
    );
  const empty = present([
    await panel(
      { ...TODAY, label: "Bare terrain" },
      desktop,
      "1",
      undefined,
      "EMPTY",
    ),
    await panel(
      { ...TODAY, label: "Today, without units" },
      desktop,
      "1",
      undefined,
      "NO_UNITS",
    ),
    await panel(
      { ...recommended, label: "Recommended, without units" },
      desktop,
      "1",
      undefined,
      "NO_UNITS",
    ),
  ]);
  if (empty.length > 0)
    await writeGrid(path.join(OUT, "empty-map-desktop.png"), empty, 1);
  const metrics: Record<string, Metrics & { readonly label: string }> = {};
  for (const variant of VISUAL_DIRECTION_VARIANTS_V7) {
    const busy = captureFile(variant.id, "BUSY", "desktop", "1");
    const noUnits = captureFile(variant.id, "NO_UNITS", "desktop", "1");
    if (!existsSync(busy) || !existsSync(noUnits)) continue;
    // The scene patch: 13 x 11 cells of 80 px around the capital.
    const board = { width: 13 * 80, height: 11 * 80 };
    const centre = await capitalCentre("desktop", "1");
    metrics[variant.id] = {
      label: variant.label,
      ...measure(
        centred(await loadRaster(busy), board.width, board.height, centre),
        centred(await loadRaster(noUnits), board.width, board.height, centre),
      ),
    };
  }
  await writeFile(
    path.join(OUT, "metrics.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-3tq.1",
        command: "npm run art:visual-direction-review",
        basis:
          "desktop 1440 x 900 at DPR 1, zoom 1, the 13 x 11 scene patch; unit pixels are those that differ between the scene with and without units",
        metrics,
      },
      null,
      2,
    )}\n`,
  );
  console.table(metrics, [
    "backgroundEdgeDensity",
    "backgroundSaturatedShare",
    "unitToBackgroundEdgeRatio",
    "unitFigureGroundDistance",
    "playerColourOnUnitsShare",
    "backgroundPlayerColourPerMille",
  ]);
}

// ------------------------------------------------------------ Human demo

const DEMO_VARIANT = (id: string): VisualDirectionVariantV7 => {
  const found = HUMAN_DEMO_VARIANTS_V7.find((variant) => variant.id === id);
  if (found === undefined) throw new Error(`unknown demo variant ${id}`);
  return found;
};

function demoJobs(zooms: readonly string[]): CaptureJob[] {
  if (TODAY === undefined) throw new Error("the today variant is required");
  const demo = DEMO_VARIANT("demo");
  const desktopOnly = { zooms: ["1"], viewports: ["desktop"] };
  return [
    ...[TODAY, demo].flatMap((variant) => [
      { variant, kind: "BUSY" as const, zooms },
      { variant, kind: "LIVE" as const, zooms },
      { variant, kind: "DEMO" as const, ...desktopOnly },
    ]),
    { variant: TODAY, kind: "NO_UNITS", zooms },
    { variant: TODAY, kind: "MARKER", zooms },
    { variant: TODAY, kind: "DEMO_MARKER", ...desktopOnly },
    ...["demo-style-a", "demo-style-b"].map((id) => ({
      variant: DEMO_VARIANT(id),
      kind: "BUSY" as const,
      ...desktopOnly,
    })),
    ...["demo-base-disc", "demo-base-ring", "demo-base-round"].map((id) => ({
      variant: DEMO_VARIANT(id),
      kind: "DEMO" as const,
      ...desktopOnly,
    })),
  ];
}

interface Rgba {
  readonly width: number;
  readonly height: number;
  readonly data: Buffer;
}

async function loadSprite(file: string): Promise<Rgba | null> {
  const full = path.join(ROOT, file);
  if (!existsSync(full)) return null;
  const { data, info } = await sharp(full)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data };
}

/** The first candidate of a raw candidate sheet (edits hold two). */
function firstCandidate(sheet: Rgba, width: number, height: number): Rgba {
  const data = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1)
    sheet.data.copy(
      data,
      y * width * 4,
      y * sheet.width * 4,
      (y * sheet.width + width) * 4,
    );
  return { width, height, data };
}

/** A sprite bottom-centred on a grass (or water) cell, as a panel raster. */
function onGround(
  sprite: Rgba | null,
  cell: { readonly width: number; readonly height: number },
  ground: readonly number[] = [137, 183, 91],
): Raster {
  const data = Buffer.alloc(cell.width * cell.height * 3);
  const left =
    sprite === null ? 0 : Math.floor((cell.width - sprite.width) / 2);
  const top = sprite === null ? 0 : cell.height - sprite.height;
  for (let y = 0; y < cell.height; y += 1)
    for (let x = 0; x < cell.width; x += 1) {
      const sx = x - left;
      const sy = y - top;
      const inside =
        sprite !== null &&
        sx >= 0 &&
        sy >= 0 &&
        sx < sprite.width &&
        sy < sprite.height;
      const offset = inside ? (sy * sprite.width + sx) * 4 : 0;
      const alpha = inside ? (sprite.data[offset + 3] ?? 0) / 255 : 0;
      for (let channel = 0; channel < 3; channel += 1)
        data[(y * cell.width + x) * 3 + channel] = Math.round(
          (inside ? (sprite.data[offset + channel] ?? 0) : 0) * alpha +
            (ground[channel] ?? 0) * (1 - alpha),
        );
    }
  return { width: cell.width, height: cell.height, data };
}

function enlarge(raster: Raster, factor: number): Raster {
  const width = raster.width * factor;
  const height = raster.height * factor;
  const data = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1)
      raster.data.copy(
        data,
        (y * width + x) * 3,
        (Math.floor(y / factor) * raster.width + Math.floor(x / factor)) * 3,
        (Math.floor(y / factor) * raster.width + Math.floor(x / factor)) * 3 +
          3,
      );
  return { width, height, data };
}

/** Rasters side by side on the sheet background, bottom-aligned. */
function beside(rasters: readonly Raster[], gap = 8): Raster {
  const width =
    rasters.reduce((sum, raster) => sum + raster.width, 0) +
    gap * (rasters.length - 1);
  const height = Math.max(...rasters.map((raster) => raster.height));
  const data = Buffer.alloc(width * height * 3);
  for (let index = 0; index < width * height; index += 1)
    data.set([28, 36, 38], index * 3);
  let left = 0;
  for (const raster of rasters) {
    for (let y = 0; y < raster.height; y += 1)
      raster.data.copy(
        data,
        ((height - raster.height + y) * width + left) * 3,
        y * raster.width * 3,
        (y + 1) * raster.width * 3,
      );
    left += raster.width + gap;
  }
  return { width, height, data };
}

const WATER = [143, 211, 222] as const;

/** Old and new sprite of every improvement and city tier, 1:1 and x4. */
async function buildingsSheet(): Promise<void> {
  const rows: readonly (readonly [string, string, string])[] = [
    ["Farm", "buildings/chibi-farm", "chibi-demo-farm"],
    ["Lumber Camp", "buildings/chibi-lumber-camp", "chibi-demo-lumber-camp"],
    ["Windmill", "buildings/chibi-windmill", "chibi-demo-windmill"],
    ["Sawmill", "buildings/chibi-sawmill", "chibi-demo-sawmill"],
    ["Forge", "buildings/chibi-forge", "chibi-demo-forge"],
    ["Workshop", "buildings/chibi-workshop", "chibi-demo-workshop"],
    ["Market", "buildings/chibi-market", "chibi-demo-market"],
    ["Monument", "buildings/chibi-monument", "chibi-demo-monument"],
    ["Port", "buildings/chibi-port", "chibi-demo-port"],
    ["Shipyard", "buildings/chibi-shipyard", "chibi-demo-shipyard"],
    ["City 1", "settlements/chibi-city-1", "chibi-demo-city-1"],
    ["City 2", "settlements/chibi-city-2", "chibi-demo-city-2"],
    ["City 3", "settlements/chibi-city-3", "chibi-demo-city-3"],
  ];
  const cell = { width: 96, height: 104 };
  const panels: Panel[] = [];
  for (const [label, old, fresh] of rows) {
    const ground = label === "Port" || label === "Shipyard" ? WATER : undefined;
    const before = onGround(
      await loadSprite(`public/assets/chibi/${old}.png`),
      cell,
      ground,
    );
    const after = onGround(
      await loadSprite(`${DEMO_EXPLORATION}/assets/${fresh}.png`),
      cell,
      ground,
    );
    panels.push({
      label: `${label}: old, new (1:1 and x4)`,
      raster: beside([before, after, enlarge(before, 4), enlarge(after, 4)]),
    });
  }
  await writeGrid(path.join(OUT, "buildings-old-new.png"), panels, 2);
}

/** Every building style sample tried, x4, with its verdict. */
async function styleCandidatesSheet(): Promise<void> {
  const cell = { width: 96, height: 96 };
  const entries: readonly (readonly [string, string, number, number])[] = [
    [
      "Today: Windmill",
      "public/assets/chibi/buildings/chibi-windmill.png",
      80,
      88,
    ],
    ["Today: Forge", "public/assets/chibi/buildings/chibi-forge.png", 80, 88],
    ["Today: Market", "public/assets/chibi/buildings/chibi-market.png", 80, 88],
    [
      "A soft chibi (Pixen, 80 x 88)",
      `${DEMO_EXPLORATION}/buildings-soft/raw/windmill-soft-a.png`,
      80,
      88,
    ],
    [
      "A soft chibi",
      `${DEMO_EXPLORATION}/buildings-soft/raw/forge-soft-a.png`,
      80,
      88,
    ],
    [
      "A soft chibi",
      `${DEMO_EXPLORATION}/buildings-soft/raw/market-soft-a.png`,
      80,
      88,
    ],
    [
      "B flat, small (Pixen, 64 px): chosen",
      `${DEMO_EXPLORATION}/buildings-flat/raw/windmill-flat-a.png`,
      64,
      72,
    ],
    [
      "B flat, small",
      `${DEMO_EXPLORATION}/buildings-flat/raw/forge-flat-a.png`,
      64,
      64,
    ],
    [
      "B flat, small",
      `${DEMO_EXPLORATION}/buildings-flat/raw/market-flat-a.png`,
      64,
      64,
    ],
    [
      "Rejected: Pixflux flat shading",
      `${DEMO_EXPLORATION}/buildings-flat/raw/windmill-flux-a.png`,
      64,
      72,
    ],
    [
      "Rejected: Pixflux flat shading",
      `${DEMO_EXPLORATION}/buildings-flat/raw/forge-flux-a.png`,
      64,
      64,
    ],
    [
      "Rejected: Pixflux flat shading",
      `${DEMO_EXPLORATION}/buildings-flat/raw/market-flux-a.png`,
      64,
      64,
    ],
    [
      "Rejected: Pixen lineless",
      `${DEMO_EXPLORATION}/buildings-flat/raw/windmill-flat-b.png`,
      64,
      72,
    ],
    [
      "Rejected: Pixflux lineless",
      `${DEMO_EXPLORATION}/buildings-flat/raw/forge-flux-b.png`,
      64,
      64,
    ],
    [
      "Not used: a flag in the art (key red)",
      `${DEMO_EXPLORATION}/buildings-flat/raw/port-b-a-flag.png`,
      72,
      72,
    ],
    [
      "Not used: a flag in the art (key red)",
      `${DEMO_EXPLORATION}/buildings-flat/raw/city-1-c-a-flag.png`,
      96,
      96,
    ],
  ];
  const panels: Panel[] = [];
  for (const [label, file, width, height] of entries) {
    const sheet = await loadSprite(file);
    if (sheet === null) continue;
    panels.push({
      label,
      raster: onGround(firstCandidate(sheet, width, height), cell),
    });
  }
  if (panels.length > 0)
    await writeGrid(
      path.join(OUT, "building-style-candidates-x4.png"),
      panels,
      3,
      4,
    );
}

/** A block of cells of the DEMO capture (desktop, zoom 1, 80 px cells). */
async function demoCells(
  variant: VisualDirectionVariantV7,
  cells: {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
  },
  label = variant.label,
): Promise<Panel | null> {
  const file = captureFile(variant.id, "DEMO", "desktop", "1");
  if (!existsSync(file)) return null;
  const centre = await capitalCentre("desktop", "1", ["DEMO", "DEMO_MARKER"]);
  // The capital is cell (5,4) of the patch.
  return {
    label,
    raster: crop(await loadRaster(file), {
      left: centre.x - 40 + (cells.x - 5) * 80,
      top: centre.y - 40 + (cells.y - 4) * 80,
      width: cells.w * 80,
      height: cells.h * 80,
    }),
  };
}

async function composeDemo(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  if (TODAY === undefined) throw new Error("the today variant is required");
  const demo = DEMO_VARIANT("demo");
  await styleCandidatesSheet();
  await buildingsSheet();
  const [, phone] = VIEWPORTS;
  for (const viewport of VIEWPORTS)
    for (const zoom of ZOOMS) {
      const size =
        viewport.name === "phone"
          ? { width: 390, height: 600 }
          : { width: 1120, height: 900 };
      const busy = present([
        await panel(TODAY, viewport, zoom, size),
        await panel(demo, viewport, zoom, size),
      ]);
      if (busy.length === 2)
        await writeGrid(
          path.join(OUT, `before-after-busy-${viewport.name}-zoom-${zoom}.png`),
          busy,
          2,
        );
      // The Showcase is the running match: the whole board view, cropped
      // about its middle to the same window.
      const live = async (
        variant: VisualDirectionVariantV7,
      ): Promise<Panel | null> => {
        const file = captureFile(variant.id, "LIVE", viewport.name, zoom);
        if (!existsSync(file)) return null;
        const raster = await loadRaster(file);
        return {
          label: `${variant.label} · Showcase, four factions`,
          raster: centred(
            raster,
            size.width * viewport.dpr,
            size.height * viewport.dpr,
            { x: raster.width / 2, y: raster.height / 2 },
          ),
        };
      };
      const showcase = present([await live(TODAY), await live(demo)]);
      if (showcase.length === 2)
        await writeGrid(
          path.join(
            OUT,
            `before-after-showcase-${viewport.name}-zoom-${zoom}.png`,
          ),
          showcase,
          2,
        );
    }
  const whole = { x: 0, y: 0, w: 11, h: 8 };
  const scene = present([
    await demoCells(TODAY, whole),
    await demoCells(demo, whole),
  ]);
  if (scene.length > 0)
    await writeGrid(path.join(OUT, "demo-scene-desktop.png"), scene, 1);
  // The Farm: one alone, the 3 x 3 block and the Roads under it.
  const farmCells = { x: 0, y: 0, w: 5, h: 4 };
  const farms = present([
    await demoCells(
      TODAY,
      farmCells,
      "Today: one Farm, a 3 x 3 block, Roads under it",
    ),
    await demoCells(
      demo,
      farmCells,
      "Demo: rows with gaps; the Roads stay visible",
    ),
  ]);
  const farmSprites: Panel[] = [];
  for (const [label, file] of [
    ["Today's Farm sprite", "public/assets/chibi/buildings/chibi-farm.png"],
    [
      "The demo's Farm sprite",
      `${DEMO_EXPLORATION}/assets/chibi-demo-farm.png`,
    ],
  ] as const)
    farmSprites.push({
      label: `${label}, x5`,
      raster: enlarge(
        onGround(await loadSprite(file), { width: 80, height: 80 }),
        5,
      ),
    });
  if (farms.length > 0)
    await writeGrid(path.join(OUT, "farm.png"), [...farms, ...farmSprites], 2);
  // Bases: the units north of the cities and beside them, and the ships.
  const land = { x: 4, y: 0, w: 6, h: 4 };
  const water = { x: 0, y: 6, w: 10, h: 2 };
  const bases: Panel[] = [];
  for (const id of [
    "demo-base-disc",
    "demo-base-ring",
    "demo",
    "demo-base-round",
  ]) {
    const variant =
      id === "demo" ? DEMO_VARIANT("demo-base-plate") : DEMO_VARIANT(id);
    const source = { ...variant, id };
    const landPanel = await demoCells(source, land);
    const waterPanel = await demoCells(source, water);
    if (landPanel === null || waterPanel === null) continue;
    bases.push({
      label: variant.label,
      raster: beside([landPanel.raster, waterPanel.raster]),
    });
  }
  if (bases.length > 0)
    await writeGrid(path.join(OUT, "base-plates.png"), bases, 1);
  const desktop = VIEWPORTS[0];
  const benchSize = { width: 720, height: 560 };
  const styles = present([
    await panel(TODAY, desktop, "1", benchSize),
    await panel(DEMO_VARIANT("demo-style-a"), desktop, "1", benchSize),
    await panel(DEMO_VARIANT("demo-style-b"), desktop, "1", benchSize),
  ]);
  if (styles.length === 3)
    await writeGrid(
      path.join(OUT, "building-styles-bench-desktop.png"),
      styles,
      3,
    );
  const phoneSize = { width: 390, height: 520 };
  const hard = present([
    await panel(TODAY, phone, "0.75", phoneSize),
    await panel(demo, phone, "0.75", phoneSize),
  ]);
  if (hard.length === 2)
    await writeGrid(
      path.join(OUT, "same-unit-phone-zoom-0.75.png"),
      (["normal", "deuteranopia", "protanopia"] as const).flatMap((vision) =>
        hard.map((entry) => ({
          label: `${entry.label} · ${vision}`,
          raster:
            vision === "normal" ? entry.raster : simulate(entry.raster, vision),
        })),
      ),
      2,
      2 / 3,
    );
}

async function main(): Promise<void> {
  await mkdir(CAPTURES, { recursive: true });
  if (DEMO_MODE) {
    const viewportNames = option("--viewports")?.split(",");
    const viewports = VIEWPORTS.filter(
      (viewport) =>
        viewportNames === undefined || viewportNames.includes(viewport.name),
    );
    if (!process.argv.includes("--skip-capture")) {
      const only = option("--variants")?.split(",");
      const jobs = demoJobs(option("--zooms")?.split(",") ?? [...ZOOMS]).filter(
        (job) => only === undefined || only.includes(job.variant.id),
      );
      const port = Number.parseInt(option("--port") ?? "6461", 10);
      const server = await startDevServer(port);
      try {
        await captureAll(`http://localhost:${port}/`, viewports, jobs);
      } finally {
        stopDevServer(server);
      }
    }
    await composeDemo();
    return;
  }
  const only = option("--variants")?.split(",");
  const variants = VISUAL_DIRECTION_VARIANTS_V7.filter(
    (variant) => only === undefined || only.includes(variant.id),
  );
  const viewportNames = option("--viewports")?.split(",");
  const viewports = VIEWPORTS.filter(
    (viewport) =>
      viewportNames === undefined || viewportNames.includes(viewport.name),
  );
  const zooms = option("--zooms")?.split(",") ?? [...ZOOMS];
  if (!process.argv.includes("--skip-capture")) {
    const jobs: CaptureJob[] = variants.flatMap((variant) => [
      { variant, kind: "BUSY" as const, zooms },
      { variant, kind: "NO_UNITS" as const, zooms },
      ...(variant.id === "today"
        ? [
            { variant, kind: "EMPTY" as const, zooms },
            { variant, kind: "MARKER" as const, zooms },
          ]
        : []),
    ]);
    const port = Number.parseInt(option("--port") ?? "6451", 10);
    const server = await startDevServer(port);
    try {
      await captureAll(`http://localhost:${port}/`, viewports, jobs);
    } finally {
      stopDevServer(server);
    }
  }
  await compose();
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Visual direction review failed",
  );
  process.exitCode = 1;
});
