/**
 * AI turn latency in the browser (bead `pulp_wars-2yc.99`,
 * docs/architecture/PERFORMANCE.md "AI turns with big armies"). Loads a
 * FIXED save at the human seat's turn (written by `ai-turn-bench.ts
 * generate`) into muted headless Chrome against a running server, with the
 * game's sound and music off, resumes it, ends the turn and times each AI
 * seat's turn until the human's turn comes back (single AI turns from a
 * fixed state; no match is played):
 *
 * - wall time of each AI seat's turn and its accepted commands;
 * - the main thread's busy time and the policy's share (a CPU profile);
 * - with `--fast-forward`, the same with Fast Forward on (no playback wait,
 *   so the AI's own latency).
 *
 * Usage: tsx scripts/perf/ai-turn-browser.ts --save <file> --out <dir>
 *   [--url http://localhost:6191/] [--fast-forward] [--cpu-throttle n]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { SAVE_STORAGE_KEY_V7 } from "../../src/engine/index";
import {
  AUDIO_SETTINGS_STORAGE_KEY_V1,
  MUSIC_SETTINGS_STORAGE_KEY_V1,
} from "../../src/audio/audio-settings";
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
const fastForward = process.argv.includes("--fast-forward");
const throttle = Number(argument("--cpu-throttle", "1"));
const tag = `${path.basename(savePath, ".save.json")}${fastForward ? "-ff" : ""}${throttle > 1 ? `-x${throttle}` : ""}`;
const save = await readFile(savePath, "utf8");
await mkdir(outDir, { recursive: true });
const port = 13_000 + (process.pid % 1_000);
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
    if (Date.now() > deadline)
      throw new Error(
        `Timed out: ${expression}; page: ${await evaluate<string>(
          "(document.body?.innerText ?? '').slice(0, 400)",
        )}`,
      );
    await delay(100);
  }
}

const off = JSON.stringify({ enabled: false, volume: 0 });
const instrumentation = `
if (location.origin === ${JSON.stringify(new URL(url).origin)}) {
  try {
    localStorage.setItem(${JSON.stringify(SAVE_STORAGE_KEY_V7)}, ${JSON.stringify(save)});
    localStorage.setItem(${JSON.stringify(AUDIO_SETTINGS_STORAGE_KEY_V1)}, ${JSON.stringify(off)});
    localStorage.setItem(${JSON.stringify(MUSIC_SETTINGS_STORAGE_KEY_V1)}, ${JSON.stringify(off)});
  } catch {}
}
`;

// The seat timeline, sampled every 50 ms in the page.
const timeline = `
globalThis.__aiTimeline = (() => {
  const controller = __PULP_WARS_APP__.controller;
  const marks = [];
  let last = null;
  const started = performance.now();
  const sample = () => {
    const snapshot = controller.snapshot();
    const view = snapshot.view;
    const seat = view === null ? null : view.turnOrder[view.activeSeatIndex];
    const key = seat + ":" + snapshot.ai.active;
    if (key !== last) {
      marks.push({ t: performance.now() - started, seat, active: snapshot.ai.active, command: view?.commandIndex ?? null });
      last = key;
    }
  };
  const timer = setInterval(sample, 50);
  sample();
  const frames = [];
  let lastFrame = null;
  let stopped = false;
  const frame = (t) => {
    if (lastFrame !== null) frames.push(t - lastFrame);
    lastFrame = t;
    if (!stopped) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return { stop() { clearInterval(timer); stopped = true; sample(); return { marks, frames }; } };
})();
`;

try {
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Profiler.enable");
  await connection.send("Profiler.setSamplingInterval", { interval: 500 });
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await connection.send("Page.addScriptToEvaluateOnNewDocument", {
    source: instrumentation,
  });
  await navigateSmokePage(connection, url);
  await waitFor('document.querySelector("[data-action=resume]")');
  await evaluate('document.querySelector("[data-action=resume]").click()');
  await waitFor('document.querySelector("canvas")');
  await waitFor('document.querySelector("[data-action=end-turn]")');
  await delay(3_000);
  if (throttle > 1)
    await connection.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  if (fastForward)
    await evaluate("__PULP_WARS_APP__.controller.setFastForward(true)");
  await evaluate(timeline);
  await connection.send("Profiler.start");
  const started = Date.now();
  await evaluate('document.querySelector("[data-action=end-turn]").click()');
  await delay(300);
  await evaluate(
    '(() => { const confirm = document.querySelector("[data-action=end-turn-confirm], [data-action=confirm-end-turn]"); if (confirm) confirm.click(); })()',
  );
  await waitFor("__PULP_WARS_APP__.controller.snapshot().ai.active", 10_000);
  if (fastForward)
    await evaluate("__PULP_WARS_APP__.controller.setFastForward(true)");
  await waitFor(
    '!__PULP_WARS_APP__.controller.snapshot().ai.active && document.querySelector("[data-action=end-turn]")',
    900_000,
  );
  const wallMs = Date.now() - started;
  const { marks, frames } = await evaluate<{
    marks: {
      t: number;
      seat: number | null;
      active: boolean;
      command: number | null;
    }[];
    frames: number[];
  }>("__aiTimeline.stop()");
  const sortedFrames = [...frames].sort((a, b) => a - b);
  const profile = (await connection.send("Profiler.stop")) as {
    readonly profile: {
      readonly nodes: readonly {
        readonly id: number;
        readonly callFrame: { readonly functionName: string };
        readonly children?: readonly number[];
      }[];
      readonly samples: readonly number[];
      readonly timeDeltas: readonly number[];
    };
  };
  await writeFile(
    path.join(outDir, `${tag}.cpuprofile`),
    JSON.stringify(profile.profile),
  );
  // Busy time, and the time under the policy's work (runSlice).
  const nodes = new Map(profile.profile.nodes.map((node) => [node.id, node]));
  const parent = new Map<number, number>();
  for (const node of profile.profile.nodes)
    for (const child of node.children ?? []) parent.set(child, node.id);
  let idle = 0;
  let policy = 0;
  let total = 0;
  profile.profile.samples.forEach((id, index) => {
    const dt = (profile.profile.timeDeltas[index] ?? 0) / 1000;
    total += dt;
    const name = nodes.get(id)?.callFrame.functionName;
    if (name === "(idle)") idle += dt;
    for (
      let current: number | undefined = id;
      current !== undefined;
      current = parent.get(current)
    )
      if (nodes.get(current)?.callFrame.functionName === "runSlice") {
        policy += dt;
        break;
      }
  });
  const seats: { seat: number | null; ms: number; commands: number }[] = [];
  for (const [index, mark] of marks.entries()) {
    const next = marks[index + 1];
    if (next === undefined || !mark.active) continue;
    seats.push({
      seat: mark.seat,
      ms: Math.round(next.t - mark.t),
      commands: (next.command ?? 0) - (mark.command ?? 0),
    });
  }
  const report = {
    tag,
    wallMs,
    profiledMs: Math.round(total),
    busyMs: Math.round(total - idle),
    policyMs: Math.round(policy),
    frames: {
      count: frames.length,
      p95Ms: Math.round(
        sortedFrames[Math.ceil(sortedFrames.length * 0.95) - 1] ?? 0,
      ),
      maxMs: Math.round(sortedFrames.at(-1) ?? 0),
      over50Ms: frames.filter((ms) => ms > 50).length,
    },
    seats,
  };
  await writeFile(
    path.join(outDir, `${tag}-report.json`),
    JSON.stringify(report, null, 2),
  );
  process.stdout.write(`${JSON.stringify(report)}\n`);
} finally {
  browser.close();
}
