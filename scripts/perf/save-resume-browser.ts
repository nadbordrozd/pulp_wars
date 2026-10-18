/**
 * How long a saved game takes to open in the browser (bead
 * `pulp_wars-2yc.95`, docs/architecture/PERFORMANCE.md). Plays nothing: it
 * puts a save into a fresh, muted headless Chrome's storage, opens the game
 * and stops at the main menu's Resume button (the save is loaded and
 * checked by then; resuming would start the AI's turn when one is due).
 *
 *   CHROME_PATH=... tsx scripts/perf/save-resume-browser.ts --save <file> \
 *     --out <dir> [--url http://localhost:6302/pulp_wars/] [--runs 3] \
 *     [--wait-ms 0]
 *
 * It prints, for each run: the time from navigation to the Resume button,
 * the longest main-thread task and the sum of long tasks until then, and,
 * after `--wait-ms` more, any save warning the menu shows (the saved-history
 * check's mismatch warning, for example).
 */
import { mkdir, readFile } from "node:fs/promises";
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
const url = argument("--url", "http://localhost:6302/pulp_wars/");
const savePath = argument("--save");
const outDir = argument("--out");
const runs = Number(argument("--runs", "3"));
const waitMs = Number(argument("--wait-ms", "0"));
const save = await readFile(savePath, "utf8");
await mkdir(outDir, { recursive: true });

const instrumentation = `
if (location.origin === ${JSON.stringify(new URL(url).origin)}) {
  try { localStorage.setItem(${JSON.stringify(SAVE_STORAGE_KEY_V7)}, ${JSON.stringify(save)}); } catch {}
}
globalThis.__longTasks = [];
try {
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) globalThis.__longTasks.push(entry.duration);
  }).observe({ type: "longtask", buffered: true });
} catch {}
`;

for (let run = 0; run < runs; run += 1) {
  const port = 12_000 + ((process.pid + run) % 1_000);
  const browser = await launchSmokeBrowser({
    chrome,
    port,
    args: [
      "--headless=new",
      "--mute-audio",
      "--no-first-run",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${path.join(outDir, `chrome-profile-${process.pid}-${run}`)}`,
      "--window-size=1440,1000",
    ],
  });
  const connection = browser.connection;
  const evaluate = async <T>(expression: string): Promise<T> => {
    // A long replay blocks the page's main thread for minutes; the probe
    // waits for it.
    const result = (await connection.send(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      { timeoutMs: 300_000 },
    )) as { readonly result?: { readonly value?: T } };
    return result.result?.value as T;
  };
  try {
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await connection.send("Page.addScriptToEvaluateOnNewDocument", {
      source: instrumentation,
    });
    const started = Date.now();
    await navigateSmokePage(connection, url, 120_000);
    const deadline = Date.now() + 300_000;
    while (
      !(await evaluate<boolean>(
        '!!document.querySelector("[data-action=resume]")',
      ))
    ) {
      if (Date.now() > deadline)
        throw new Error(
          `No Resume button: ${await evaluate<string>("document.body.innerText.slice(0, 600)")}`,
        );
      await delay(20);
    }
    const resumeButtonMs = Date.now() - started;
    const longTasks = await evaluate<number[]>("globalThis.__longTasks");
    if (waitMs > 0) await delay(waitMs);
    const warning = await evaluate<string | null>(
      'document.querySelector(".v7-warning")?.textContent ?? null',
    );
    process.stdout.write(
      `${JSON.stringify({
        save: path.basename(savePath),
        run,
        resumeButtonMs,
        maxLongTaskMs: Math.round(Math.max(0, ...longTasks)),
        longTaskMs: Math.round(longTasks.reduce((sum, item) => sum + item, 0)),
        warning,
      })}\n`,
    );
  } finally {
    browser.close();
  }
}
process.exit(0);
