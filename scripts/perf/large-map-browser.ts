/**
 * Large-map browser profile (bead `pulp_wars-2yc.79`,
 * docs/architecture/PERFORMANCE.md). Loads a FIXED save (written by
 * `large-map-harness.ts save`) into a muted headless Chrome against a
 * running dev server, resumes it and measures the board:
 *
 * - idle: frame intervals, time spent in animation-frame callbacks and full
 *   board draws while the human's turn waits for input;
 * - pan and zoom: the same while the camera is dragged and wheeled;
 * - playback (`--playback`): one round of AI turns after End Turn, until
 *   the human's turn comes back (single AI turns from a fixed state; no
 *   match is played);
 * - a CPU profile of each phase and a reduced-motion screenshot of the
 *   resumed board (for pixel comparison before and after a change).
 *
 * Usage: tsx scripts/perf/large-map-browser.ts --save <file> --out <dir>
 *   [--url http://localhost:6191/] [--dpr 1|2] [--playback] [--tag name]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { SAVE_STORAGE_KEY_V7 } from "../../src/engine/index";
import {
  launchSmokeBrowser,
  navigateSmokePage,
} from "../browser-smoke-startup";

function argument(name: string, fallback?: string): string {
  const index = process.argv.indexOf(name);
  const value = index < 0 ? fallback : process.argv[index + 1];
  if (value === undefined) throw new Error(`${name} is required`);
  return value;
}

const chrome = process.env.CHROME_PATH;
if (chrome === undefined) throw new Error("Set CHROME_PATH to Chrome.");
const url = argument("--url", "http://localhost:6191/");
const savePath = argument("--save");
const outDir = argument("--out");
const tag = argument("--tag", path.basename(savePath, ".save.json"));
const dpr = Number(argument("--dpr", "1"));
const playback = process.argv.includes("--playback");
const reduced = process.argv.includes("--reduced");
const zoomOut = Number(argument("--zoom-out", "0"));
const save = await readFile(savePath, "utf8");
await mkdir(outDir, { recursive: true });
const port = 12_000 + (process.pid % 1_000);
const browser = await launchSmokeBrowser({
  chrome,
  port,
  args: [
    "--headless=new",
    "--mute-audio",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(outDir, `chrome-profile-${process.pid}`)}`,
    "--window-size=1440,1000",
  ],
});
const connection = browser.connection;

async function evaluate<T>(expression: string): Promise<T> {
  const result = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: {
      readonly text: string;
      readonly exception?: { readonly description?: string };
    };
  };
  if (result.exceptionDetails !== undefined)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text,
    );
  return result.result?.value as T;
}

async function waitFor(expression: string, timeoutMs = 60_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!(await evaluate<boolean>(`!!(${expression})`))) {
    if (Date.now() > deadline) throw new Error(`Timed out: ${expression}`);
    await delay(100);
  }
}

async function screenshot(name: string): Promise<void> {
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { readonly data: string };
  await writeFile(path.join(outDir, name), Buffer.from(shot.data, "base64"));
}

async function mouse(
  type: "mousePressed" | "mouseMoved" | "mouseReleased",
  x: number,
  y: number,
  buttons: number,
): Promise<void> {
  await connection.send("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    button: type === "mouseMoved" ? (buttons ? "left" : "none") : "left",
    buttons,
    clickCount: type === "mouseMoved" ? 0 : 1,
  });
}

interface PhaseStats {
  readonly phase: string;
  readonly wallMs: number;
  readonly frames: number;
  readonly frameIntervalMs: Summary;
  readonly rafCallbackMs: Summary;
  readonly rafBusyPerFrameMs: Summary;
  readonly fullDraws: number;
  readonly framesWithMultipleDraws: number;
  readonly longTasks: number;
  readonly longTaskMs: number;
  readonly maxLongTaskMs: number;
}
interface Summary {
  readonly n: number;
  readonly mean: number;
  readonly median: number;
  readonly p95: number;
  readonly max: number;
}
function summarize(values: readonly number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b);
  const total = sorted.reduce((sum, value) => sum + value, 0);
  const round = (value: number): number => Math.round(value * 100) / 100;
  return {
    n: sorted.length,
    mean: round(sorted.length === 0 ? 0 : total / sorted.length),
    median: round(sorted[Math.floor(sorted.length * 0.5)] ?? 0),
    p95: round(sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0),
    max: round(sorted.at(-1) ?? 0),
  };
}

async function phase(
  name: string,
  run: () => Promise<void>,
): Promise<PhaseStats> {
  await connection.send("Profiler.start");
  await evaluate("__perf.reset()");
  const started = Date.now();
  await run();
  const raw = await evaluate<{
    frames: number[];
    callbacks: number[];
    busy: number[];
    draws: number[];
    longTasks: number[];
  }>("__perf.snapshot()");
  const wallMs = Date.now() - started;
  const profile = (await connection.send("Profiler.stop")) as {
    readonly profile: unknown;
  };
  await writeFile(
    path.join(outDir, `${tag}-${name}.cpuprofile`),
    JSON.stringify(profile.profile),
  );
  return {
    phase: name,
    wallMs,
    frames: raw.frames.length,
    frameIntervalMs: summarize(raw.frames),
    rafCallbackMs: summarize(raw.callbacks),
    rafBusyPerFrameMs: summarize(raw.busy),
    fullDraws: raw.draws.reduce((sum, value) => sum + value, 0),
    framesWithMultipleDraws: raw.draws.filter((value) => value > 1).length,
    longTasks: raw.longTasks.length,
    longTaskMs: Math.round(
      raw.longTasks.reduce((sum, value) => sum + value, 0),
    ),
    maxLongTaskMs: Math.round(Math.max(0, ...raw.longTasks)),
  };
}

// Before any page script: the save, and the frame instrumentation. A full
// board draw clears the whole board canvas first (drawBoardV7 with
// `clear`), so full-viewport clearRect calls on a mounted canvas count
// draws; draws are bucketed by the animation frame they precede.
const instrumentation = `
if (location.origin === ${JSON.stringify(new URL(url).origin)}) {
  try { localStorage.setItem(${JSON.stringify(SAVE_STORAGE_KEY_V7)}, ${JSON.stringify(save)}); } catch {}
}
globalThis.__perf = (() => {
  const state = { frames: [], callbacks: [], busy: [], draws: [], longTasks: [], drawsNow: 0, busyNow: 0, last: null };
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (fn) => raf((t) => {
    const s = performance.now();
    try { fn(t); } finally {
      const d = performance.now() - s;
      state.callbacks.push(d);
      state.busyNow += d;
    }
  });
  const tick = (t) => {
    if (state.last !== null) {
      state.frames.push(t - state.last);
      state.draws.push(state.drawsNow);
      state.busy.push(state.busyNow);
    }
    state.drawsNow = 0;
    state.busyNow = 0;
    state.last = t;
    raf(tick);
  };
  raf(tick);
  const clearRect = CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect = function (x, y, w, h) {
    const canvas = this.canvas;
    if (canvas instanceof HTMLCanvasElement && canvas.isConnected && canvas.classList.contains("board-canvas-v7") && x === 0 && y === 0 && w * (window.devicePixelRatio || 1) >= canvas.width - 1 && h * (window.devicePixelRatio || 1) >= canvas.height - 1)
      state.drawsNow += 1;
    return clearRect.call(this, x, y, w, h);
  };
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) state.longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: false });
  } catch {}
  return {
    reset() { state.frames = []; state.callbacks = []; state.busy = []; state.draws = []; state.longTasks = []; state.last = null; state.drawsNow = 0; state.busyNow = 0; },
    snapshot() { return { frames: state.frames, callbacks: state.callbacks, busy: state.busy, draws: state.draws, longTasks: state.longTasks }; },
  };
})();
`;

const results: PhaseStats[] = [];
try {
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Profiler.enable");
  await connection.send("Profiler.setSamplingInterval", { interval: 200 });
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: dpr,
    mobile: false,
  });
  // `--reduced`: the resumed board in reduced motion, a still frame to
  // compare pixel for pixel, and nothing else. Otherwise full motion.
  await connection.send("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: reduced ? "reduce" : "no-preference",
      },
    ],
  });
  await connection.send("Page.addScriptToEvaluateOnNewDocument", {
    source: instrumentation,
  });
  const loadStarted = Date.now();
  await navigateSmokePage(connection, url);
  await waitFor('document.querySelector("[data-action=resume]")');
  await evaluate('document.querySelector("[data-action=resume]").click()');
  await waitFor('document.querySelector("canvas")');
  await waitFor('document.querySelector("[data-action=end-turn]")');
  const resumeMs = Date.now() - loadStarted;
  await delay(4_000);
  const box = await evaluate<{ x: number; y: number; w: number; h: number }>(
    '(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()',
  );
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  // `--zoom-out <n>`: the camera wheeled out n steps first (more of a large
  // board on screen).
  for (let step = 0; step < zoomOut; step += 1) {
    await connection.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: cx,
      y: cy,
      deltaX: 0,
      deltaY: 240,
    });
    await delay(300);
  }
  if (zoomOut > 0) await delay(1_500);
  if (reduced) {
    await screenshot(`${tag}-reduced-motion.png`);
    process.stdout.write(`${JSON.stringify({ tag, dpr, resumeMs })}\n`);
    browser.close();
    process.exit(0);
  }
  await screenshot(`${tag}-full-motion.png`);
  results.push(await phase("idle", () => delay(5_000)));
  results.push(
    await phase("pan", async () => {
      for (let sweep = 0; sweep < 3; sweep += 1) {
        await mouse("mousePressed", cx, cy, 1);
        for (let step = 1; step <= 40; step += 1) {
          const dx = Math.sin((step / 40) * Math.PI * 2) * 300;
          const dy = Math.cos((step / 40) * Math.PI * 2) * 200 - 200;
          await mouse("mouseMoved", cx + dx, cy + dy, 1);
          await delay(16);
        }
        await mouse("mouseReleased", cx, cy, 0);
        await delay(100);
      }
    }),
  );
  results.push(
    await phase("zoom", async () => {
      for (const deltaY of [-240, -240, 240, 240, 240, -240]) {
        await connection.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x: cx,
          y: cy,
          deltaX: 0,
          deltaY,
        });
        await delay(400);
      }
    }),
  );
  if (playback)
    results.push(
      await phase("playback", async () => {
        await evaluate(
          'document.querySelector("[data-action=end-turn]").click()',
        );
        await delay(300);
        // An End Turn with units still to move asks first.
        await evaluate(
          '(() => { const confirm = document.querySelector("[data-action=end-turn-confirm], [data-action=confirm-end-turn]"); if (confirm) confirm.click(); })()',
        );
        await waitFor(
          "__PULP_WARS_APP__.controller.snapshot().ai.active",
          10_000,
        );
        await waitFor(
          '!__PULP_WARS_APP__.controller.snapshot().ai.active && document.querySelector("[data-action=end-turn]")',
          600_000,
        );
      }),
    );
  await screenshot(`${tag}-after.png`);
  // Equivalence: the human's view where the measurement ends (after the
  // playback round, when run), as a digest of its JSON.
  const finalView = await evaluate<string>(`(async () => {
    const view = __PULP_WARS_APP__.controller.snapshot().view;
    const bytes = new TextEncoder().encode(JSON.stringify(view));
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
    return "round " + view.round + " command " + view.commandIndex + " " + Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
  })()`);
  const report = { tag, dpr, resumeMs, finalView, phases: results };
  await writeFile(
    path.join(outDir, `${tag}-report.json`),
    JSON.stringify(report, null, 2),
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  browser.close();
}
