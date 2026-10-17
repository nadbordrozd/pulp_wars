/**
 * The fog lift's cost on a large map (bead `pulp_wars-2yc.83`,
 * docs/architecture/PERFORMANCE.md). Loads a FIXED save (written by
 * `large-map-harness.ts save`) into a muted headless Chrome against a
 * running dev server and mounts the board over its state, the human's view
 * with the cells two and three away from their capital unexplored (about
 * forty cells). It then swaps in the state as it is, as an accepted command
 * would, so those cells are revealed at once (a save of an earlier ruleset
 * identity is drawn from its state as it is), and measures the frames of
 * that reveal: frame intervals, animation-frame callback time and long
 * tasks for 1.5 s, with the lift on and with `?fog-lift=0`. Then, with the
 * lift held (`pinFogLift`) at every 30 ms of it, the time of one overlay
 * frame alone. No command is played and no AI runs.
 *
 * Usage: tsx scripts/perf/fog-lift-browser.ts --save <file> --out <dir>
 *   [--url http://localhost:6191/] [--dpr 1|2] [--tag name]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
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

// The frame instrumentation of large-map-browser.ts, before any page script.
const instrumentation = `
globalThis.__perf = (() => {
  const state = { frames: [], callbacks: [], busy: [], longTasks: [], busyNow: 0, last: null };
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
    if (state.last !== null) { state.frames.push(t - state.last); state.busy.push(state.busyNow); }
    state.busyNow = 0;
    state.last = t;
    raf(tick);
  };
  raf(tick);
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) state.longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: false });
  } catch {}
  return {
    reset() { state.frames = []; state.callbacks = []; state.busy = []; state.longTasks = []; state.last = null; state.busyNow = 0; },
    snapshot() { return { frames: state.frames, callbacks: state.callbacks, busy: state.busy, longTasks: state.longTasks }; },
  };
})();
`;

/** Mounts the board over the save's state, the capital's ring at 2 and 3 hidden. */
const mount = `(async () => {
  const engine = await import('/src/engine/index.ts');
  const persistence = await import('/src/persistence/v7.ts');
  const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
  const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
  globalThis.__PULP_WARS_APP__?.destroy();
  const parsed = persistence.parseSaveV7(globalThis.__SAVE__);
  // A save of an earlier ruleset identity (its state unchanged in shape) is
  // drawn as it is: only the board is measured, no rule is played.
  const full = parsed.kind === 'VALID' ? parsed.save.state : { ...JSON.parse(globalThis.__SAVE__).state, rulesetId: engine.RULESET_7_ID };
  const human = full.humanPlayerId;
  const capital = full.cities.find((city) => city.ownerId === human && city.capital) ?? full.cities.find((city) => city.ownerId === human);
  const ring = (at) => Math.max(Math.abs(at.x - capital.at.x), Math.abs(at.y - capital.at.y));
  const hidden = { ...full, players: full.players.map((player) => player.id !== human ? player : { ...player, explored: player.explored.filter((at) => ring(at) < 2 || ring(at) > 3) }) };
  let state = hidden;
  const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
  const snapshot = () => {
    const view = engine.viewForV7(state, human);
    return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
  };
  const subscribers = new Set();
  const controller = {
    snapshot,
    subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
    subscribeAcceptedBoundary() { return () => undefined; },
    async dispatch() { return { accepted: false, reason: 'ENGINE_REJECTED', error: { code: 'FIXTURE', params: {} } }; },
    async launch() { throw new Error('fixture launch unavailable'); },
    async resume() { return true; },
    async returnToMenu() { return false; },
    async progressAiTurns() { return { ok: false, cancelled: true, acceptedCommands: 0, diagnostic: 'fixture' }; },
    async restart() { return { ok: false, code: 'CONTROLLER_DESTROYED', diagnostic: 'fixture' }; },
    async deleteStoredSave() { return false; },
    setFastForward() {},
    exportSafeLog() { return null; },
    exportDebugBundle() { return { ok: false, reason: 'NO_ACTIVE_MATCH' }; },
  };
  const boardHost = new CanvasBoardHostV7(document);
  const view = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
  const publish = (next) => {
    state = { ...next, commandIndex: state.commandIndex + 1 };
    const shown = snapshot();
    for (const subscriber of subscribers) subscriber(shown);
  };
  globalThis.fl = {
    boardHost,
    view,
    hidden: hidden.players.find((p) => p.id === human).explored.length,
    explored: full.players.find((p) => p.id === human).explored.length,
    reveal() { publish(full); },
    hide() { publish(hidden); },
    capital: capital.at,
  };
  return { hidden: globalThis.fl.explored - globalThis.fl.hidden };
})()`;

interface RevealStats {
  readonly mode: string;
  readonly revealedCells: number;
  readonly frameIntervalMs: Summary;
  readonly rafBusyPerFrameMs: Summary;
  readonly rafCallbackMs: Summary;
  readonly longTasks: number;
  readonly maxLongTaskMs: number;
  /** The task that swaps the state (the update and its first draws). */
  readonly revealTaskMs: number;
}

async function measure(mode: "on" | "off"): Promise<{
  reveal: RevealStats;
  overlayFrameMs: Summary | null;
}> {
  const target = new URL(url);
  target.searchParams.set("art", "chibi");
  if (mode === "off") target.searchParams.set("fog-lift", "0");
  await navigateSmokePage(connection, target.href);
  await waitFor("globalThis.__PULP_WARS_APP__ !== undefined");
  await evaluate(`globalThis.__SAVE__ = ${JSON.stringify(save)}; true`);
  const mounted = await evaluate<{ hidden: number }>(mount);
  await waitFor('document.querySelector("canvas.board-canvas-v7")');
  // Art loads, and the lift's frames are built in idle time.
  await delay(4_000);
  await evaluate("__perf.reset()");
  const revealTaskMs = await evaluate<number>(
    "(() => { const s = performance.now(); fl.reveal(); return performance.now() - s; })()",
  );
  await delay(1_500);
  const raw = await evaluate<{
    frames: number[];
    callbacks: number[];
    busy: number[];
    longTasks: number[];
  }>("__perf.snapshot()");
  const reveal: RevealStats = {
    mode,
    revealedCells: mounted.hidden,
    frameIntervalMs: summarize(raw.frames),
    rafBusyPerFrameMs: summarize(raw.busy),
    rafCallbackMs: summarize(raw.callbacks),
    longTasks: raw.longTasks.length,
    maxLongTaskMs: Math.round(Math.max(0, ...raw.longTasks)),
    revealTaskMs: Math.round(revealTaskMs * 100) / 100,
  };
  let overlayFrameMs: Summary | null = null;
  if (mode === "on") {
    // Hide and reveal again, then hold the lift at every 30 ms: each hold
    // is one overlay frame of all its cells.
    await evaluate("fl.hide()");
    await delay(300);
    await evaluate("fl.reveal(); fl.boardHost.pinFogLift(0); true");
    const times = await evaluate<number[]>(`(() => {
      const out = [];
      for (let ms = 0; ms <= 900; ms += 30) {
        const s = performance.now();
        fl.boardHost.pinFogLift(ms);
        out.push(performance.now() - s);
      }
      return out;
    })()`);
    overlayFrameMs = summarize(times);
    await evaluate("fl.boardHost.pinFogLift(300)");
    await delay(200);
    const shot = (await connection.send("Page.captureScreenshot", {
      format: "png",
    })) as { readonly data: string };
    await writeFile(
      path.join(outDir, `${tag}-dpr${dpr}-lift-300ms.png`),
      Buffer.from(shot.data, "base64"),
    );
    await evaluate("fl.boardHost.pinFogLift(null)");
  }
  return { reveal, overlayFrameMs };
}

try {
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: dpr,
    mobile: false,
  });
  await connection.send("Page.addScriptToEvaluateOnNewDocument", {
    source: instrumentation,
  });
  const on = await measure("on");
  const off = await measure("off");
  const report = {
    tag,
    dpr,
    on: on.reveal,
    off: off.reveal,
    overlayFrameMs: on.overlayFrameMs,
  };
  await writeFile(
    path.join(outDir, `${tag}-dpr${dpr}-fog-lift.json`),
    JSON.stringify(report, null, 2),
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} finally {
  browser.close();
}
