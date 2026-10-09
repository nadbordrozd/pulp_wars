import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";

/**
 * Score and modes, leaderboard and end of match review (`pulp_wars-kaw6.3`,
 * docs/product/RULESET_7_SCORE_AND_STARS.md section 8). On the hand-built
 * states of tests/fixtures/v7-score-ui.ts (no match is played) it captures,
 * at desktop (1440 x 1000) and phone (390 x 844) widths in the CHIBI art
 * set: the Domination leaderboard, its own breakdown open, the Perfection
 * top bar and leaderboard at round 12 of 30, the Domination victory with its
 * grade and a breakdown open (the human's, and the Undead's with its
 * penalty capped), the Perfection victory and defeat decided by score, and
 * a flawless victory with the glow. It needs the Vite dev server, because the fixtures are imported
 * from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-score-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>]
 */

interface DebugTarget {
  readonly type: string;
  readonly webSocketDebuggerUrl: string;
}
interface ProtocolMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  onEvent(listener: (method: string, params: unknown) => void): void;
  close(): void;
}
type Size = "desktop" | "phone";

const args = process.argv.slice(2);
const baseUrl = new URL(
  args.find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args,
  name: "score-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-score-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_640 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-score-ui-"));
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
const evidence: Record<string, unknown> = {};

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    // Domination, mid-match: the leaderboard, then the own breakdown.
    await mount(connection, "scoreDominationLiveFixtureV7");
    await openLeaderboard(connection);
    await record(connection, `${size}DominationLeaderboard`);
    await capture(connection, `leaderboard-domination-${size}.png`);
    await clickViewerScore(connection);
    await record(connection, `${size}DominationBreakdown`);
    await capture(connection, `breakdown-domination-${size}.png`);
    // Perfection at round 12 of 30: the top bar, then the leaderboard.
    await mount(connection, "scorePerfectionLiveFixtureV7");
    await record(connection, `${size}PerfectionHud`);
    await capture(connection, `hud-perfection-${size}.png`);
    await openLeaderboard(connection);
    await clickViewerScore(connection);
    await record(connection, `${size}PerfectionLeaderboard`);
    await capture(connection, `leaderboard-perfection-${size}.png`);
    // The end of match: Domination victory, Perfection victory and defeat.
    for (const [fixture, name] of [
      ["scoreDominationVictoryFixtureV7", "end-domination-victory"],
      ["scorePerfectionVictoryFixtureV7", "end-perfection-victory"],
      ["scorePerfectionDefeatFixtureV7", "end-perfection-defeat"],
      ["scoreFlawlessVictoryFixtureV7", "end-flawless-victory"],
    ] as const) {
      await mount(connection, fixture);
      await record(connection, `${size}:${name}`);
      await capture(connection, `${name}-${size}.png`);
      await evaluate(
        connection,
        `document.querySelector('.v7-results .v7-result-seat[data-viewer="true"] [data-action^="score-breakdown-"]')?.click()`,
      );
      await delay(500);
      await capture(connection, `${name}-breakdown-${size}.png`);
    }
    // Everyone's breakdown after the end: the Undead's, its penalty capped.
    await mount(connection, "scoreDominationVictoryFixtureV7");
    await click(connection, "score-breakdown-1");
    await record(connection, `${size}:end-domination-undead-cap`);
    await capture(connection, `end-domination-undead-cap-${size}.png`);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Score UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** The visible score text: HUD round, rows, breakdown, verdict, grade. */
async function record(connection: Connection, key: string): Promise<void> {
  evidence[key] = await evaluate(
    connection,
    `({
      hudRound: document.querySelector('.v7-hud-round')?.textContent ?? null,
      lede: document.querySelector('.v7-screen-lede')?.textContent ?? null,
      rounds: document.querySelector('[data-v7-region="score-rounds"]')?.textContent ?? null,
      rows: Array.from(document.querySelectorAll('.v7-leaderboard-row, .v7-result-seat')).map((row) => (row.querySelector('.v7-leaderboard-name, .v7-result-seat-name')?.textContent ?? '') + ' = ' + (row.dataset.score ?? '')),
      breakdown: Array.from(document.querySelectorAll('[data-v7-region="score-breakdown"] .v7-score-line')).map((line) => line.textContent),
      verdict: document.querySelector('[data-v7-region="score-verdict"]')?.textContent ?? null,
      stars: document.querySelector('.v7-grade-stars')?.getAttribute('aria-label') ?? null,
      rating: document.querySelector('.v7-grade-rating')?.textContent ?? null,
      conditions: Array.from(document.querySelectorAll('.v7-grade-condition')).map((item) => item.dataset.met + ':' + item.textContent),
    })`,
  );
}

/**
 * Replaces the running app with a `Ruleset7DomAppView` over a fixture
 * controller (the shared fixture mount of the other reviews, with the
 * phase following the state's outcome so a finished state shows the end of
 * match).
 */
async function mount(connection: Connection, fixture: string): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const fixtures = await import('/tests/fixtures/v7-score-ui.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      globalThis.__SCORE_REVIEW__?.view?.destroy?.();
      const state = fixtures[${JSON.stringify(fixture)}]();
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return { phase: state.outcome === null ? 'ACTIVE' : 'COMPLETE', view, offeredCommands: state.outcome === null ? engine.queryPlayerCommandsV7(view) : [], savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscriber(snapshot()); return () => {}; },
        subscribeAcceptedBoundary() { return () => {}; },
        async dispatch() { return { accepted: false, reason: 'ENGINE_REJECTED', error: { code: 'FIXTURE' } }; },
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
      const root = document.querySelector('#app');
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, root, controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
      globalThis.__SCORE_REVIEW__ = { boardHost, view };
    })()`,
    true,
  );
  await delay(1_200);
}

/** The leaderboard, opened from the match menu. */
async function openLeaderboard(connection: Connection): Promise<void> {
  await click(connection, "compact-menu");
  await click(connection, "leaderboard");
  await waitFor(
    connection,
    `document.querySelector('.v7-leaderboard') !== null`,
  );
}

async function clickViewerScore(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('.v7-leaderboard-row[data-viewer="true"] [data-action^="score-breakdown-"]')?.click()`,
  );
  await delay(500);
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function click(connection: Connection, action: string): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="${action}"]')?.click()`,
  );
  await delay(500);
}

async function viewport(connection: Connection, size: Size): Promise<void> {
  await connection.send(
    "Emulation.setDeviceMetricsOverride",
    size === "desktop"
      ? { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }
      : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  );
  await delay(300);
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(connection, `globalThis.__SCORE_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__SCORE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  await writeFile(
    path.join(output.directory, name),
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
  attempts = 150,
  intervalMilliseconds = 100,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if ((await evaluate(connection, expression)) === true) return;
    } catch {
      // The page may be navigating.
    }
    await delay(intervalMilliseconds);
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
