import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The faded-buildings review (bead pulp_wars-2yc.61,
 * docs/art/BUILDING_FADE.md). Mounts the hand-filled boards of
 * scripts/building-fade-review-fixture-v7.ts (no match is played) in muted
 * headless Chrome at 1440 x 1000 and captures, for each fade
 * (`?building-fade=off|light|medium|strong`): the whole board seen by the
 * Human seat at the default zoom, and the Human, Cult, Dwarf and Candy
 * capitals' territories zoomed in twice. It also times a board draw (a
 * zoom step, which redraws synchronously) per fade into `timing.json`. It
 * needs the Vite dev server, because the fixture is served from `scripts`.
 *
 * Usage: tsx scripts/browser-building-fade-review-v7.ts http://localhost:6180/ --output-dir=<dir> [--fades=off,medium]
 */

interface DebugTarget {
  readonly type: string;
  readonly webSocketDebuggerUrl: string;
}
interface ProtocolMessage {
  readonly id?: number;
  readonly method?: string;
  readonly result?: unknown;
  readonly params?: unknown;
  readonly error?: { readonly message?: string };
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  onEvent(listener: (method: string, params: unknown) => void): void;
  close(): void;
}

const args = process.argv.slice(2);
const baseUrl = new URL(
  args.find((argument) => argument.startsWith("http")) ??
    "http://localhost:6180/",
);
const outputDirectory = args
  .find((argument) => argument.startsWith("--output-dir="))
  ?.slice("--output-dir=".length);
if (outputDirectory === undefined) throw new Error("Pass --output-dir=<dir>");
const fades = args
  .find((argument) => argument.startsWith("--fades="))
  ?.slice("--fades=".length)
  .split(",") ?? ["off", "light", "medium", "strong"];
const BOARDS = [
  ["human", "buildingFadeHumanBoardV7"],
  ["cult", "buildingFadeCultBoardV7"],
  ["dwarf", "buildingFadeDwarfBoardV7"],
  ["candy", "buildingFadeCandyBoardV7"],
] as const;
const REVIEW = "globalThis.__BUILDING_FADE_REVIEW__";
const chrome = process.env.CHROME_PATH;
if (chrome === undefined) throw new Error("Set CHROME_PATH");
await mkdir(outputDirectory, { recursive: true });
const port = 10_760 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-fade-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--mute-audio",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const errors: string[] = [];
const timing: Record<string, unknown> = {};

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const fade of fades) {
    await mount(connection, fade, "buildingFadeHumanBoardV7");
    await capture(connection, `board-${fade}.png`);
    timing[fade] = await drawTiming(connection);
    for (const [name, fixture] of BOARDS) {
      await mount(connection, fade, fixture);
      await zoomOnCapital(connection, 2);
      await capture(connection, `${name}-zoom-${fade}.png`);
    }
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(outputDirectory, "timing.json"),
    `${JSON.stringify(timing, null, 2)}\n`,
  );
  connection.close();
  console.log(`Building fade review captured in ${outputDirectory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** Mean and median of a zoom step's synchronous redraw, warm caches. */
async function drawTiming(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `(() => {
      const host = ${REVIEW}.boardHost;
      for (let n = 0; n < 10; n += 1) { host.zoom('IN'); host.zoom('OUT'); }
      const samples = [];
      for (let n = 0; n < 60; n += 1) {
        const start = performance.now();
        host.zoom(n % 2 === 0 ? 'IN' : 'OUT');
        samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      return { meanMs: Number(mean.toFixed(3)), medianMs: Number(samples[30].toFixed(3)), p90Ms: Number(samples[54].toFixed(3)) };
    })()`,
  );
}

/** Wheel-zooms in on the viewer's capital (the wheel zooms at the pointer). */
async function zoomOnCapital(
  connection: Connection,
  steps: number,
): Promise<void> {
  for (let step = 0; step < steps; step += 1) {
    const point = (await evaluate(
      connection,
      `(() => {
        const view = ${REVIEW}.snapshotView();
        const capital = view.cities.find((city) => city.isCapital && city.ownerId === view.viewer.id);
        const centre = ${REVIEW}.boardHost.cellCentreCssPx(capital.at);
        const box = document.querySelector('canvas.board-canvas-v7').getBoundingClientRect();
        return { x: box.left + centre.x, y: box.top + centre.y };
      })()`,
    )) as { readonly x: number; readonly y: number };
    await connection.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: point.x,
      y: point.y,
      deltaX: 0,
      deltaY: -120,
    });
    await delay(400);
  }
  await delay(600);
}

async function mount(
  connection: Connection,
  fade: string,
  fixture: string,
): Promise<void> {
  const next = new URL(baseUrl.href);
  next.search = "";
  // Developer mode (pulp_wars-5xki): the Gallery and every faction.
  next.searchParams.set("dev", "1");
  next.searchParams.set("art", "chibi");
  next.searchParams.set("building-fade", fade);
  await evaluate(connection, `globalThis.__FADE_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: next.href });
  await waitFor(
    connection,
    `globalThis.__FADE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/scripts/building-fade-review-fixture-v7.ts",
      fixture,
      global: "__BUILDING_FADE_REVIEW__",
      extras: "",
    }),
    true,
  );
  // The rasters load and the start camera settles.
  await delay(2_500);
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  await writeFile(
    path.join(outputDirectory as string, name),
    Buffer.from(response.data, "base64"),
  );
  console.log(`captured ${name}`);
}

async function evaluate(
  connection: Connection,
  expression: string,
  awaitPromise = false,
): Promise<unknown> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: unknown };
    readonly exceptionDetails?: unknown;
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result?.value;
}

async function waitFor(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      if ((await evaluate(connection, expression)) === true) return;
    } catch {
      // The page may be navigating.
    }
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function waitForTarget(): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const page = targets.find((candidate) => candidate.type === "page");
        if (page !== undefined) return page;
      }
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Chrome debugging target did not become ready");
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
    { resolve(value: unknown): void; reject(error: Error): void }
  >();
  const listeners = new Set<(method: string, params: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id !== undefined) {
      const request = pending.get(message.id);
      if (request === undefined) return;
      pending.delete(message.id);
      if (message.error !== undefined)
        request.reject(new Error(message.error.message ?? "CDP failed"));
      else request.resolve(message.result);
    } else if (message.method !== undefined)
      for (const listener of listeners)
        listener(message.method, message.params);
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
    onEvent(listener) {
      listeners.add(listener);
    },
    close: () => socket.close(),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
