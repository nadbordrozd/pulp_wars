import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";

/**
 * The reinforcement banner's visual review (bead pulp_wars-hmyk.18,
 * docs/product/CAMPAIGN.md section 10.3). On the hidden fixture mission
 * `TEST_WAVES` it captures, at desktop and phone widths: the scouts'
 * heads-up that begins your round 2 turn, the allied Undead wave (with its
 * own story line) after your End Turn, and the enemy Goblin wave after the
 * Undead's, each with an enlarged crop of the banner.
 *
 * It never runs an AI: the page's controller applies End Turn for whichever
 * seat is active (a scripted turn of nobody's choosing), and nothing else.
 * The browser is muted and the game's sound and music are off. It needs the
 * Vite dev server.
 *
 * Usage: tsx scripts/browser-wave-banner-review-v7.ts http://localhost:6173/
 *   [--output-dir=<new-dir>]
 */

interface DebugTarget {
  readonly type: string;
  readonly url: string;
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
type ScreenSize = "desktop" | "phone";

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "wave-banner",
  archiveDirectory: "art/integration/reviews/ruleset7-wave-banner",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 11_240 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-wave-banner-"));
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
const REVIEW = "globalThis.__WAVE_REVIEW__";

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
    await mount(connection);
    // The Goblins end round 1: your round 2 turn begins with the heads-up.
    await endTurn(connection);
    await waitForBanner(connection, "heads-up");
    await delay(600);
    evidence[`${size}HeadsUp`] = await banner(connection);
    await capture(connection, `heads-up-${size}.png`);
    await cropBanner(connection, `crop-heads-up-${size}.png`);
    await dismiss(connection);
    // Your End Turn: the Undead's turn begins with their wave.
    await endTurn(connection);
    await waitForBanner(connection, "arrival");
    await delay(700);
    evidence[`${size}Ally`] = await banner(connection);
    await capture(connection, `ally-wave-${size}.png`);
    await cropBanner(connection, `crop-ally-wave-${size}.png`);
    await dismiss(connection);
    // The Undead end their turn: the Goblins' wave.
    await endTurn(connection);
    await waitForBanner(connection, "arrival");
    await delay(700);
    evidence[`${size}Enemy`] = await banner(connection);
    await capture(connection, `enemy-wave-${size}.png`);
    await cropBanner(connection, `crop-enemy-wave-${size}.png`);
    evidence[`${size}Sounds`] = await evaluate(
      connection,
      `${REVIEW}.view.audio.log.map((entry) => entry.id + ':' + entry.outcome)`,
    );
  }
  for (const size of ["desktop", "phone"]) {
    const ally = JSON.stringify(evidence[`${size}Ally`]);
    const enemy = JSON.stringify(evidence[`${size}Enemy`]);
    if (!ally.includes("Allied reinforcements!"))
      throw new Error(`No allied banner (${size}): ${ally}`);
    if (!enemy.includes("Enemy reinforcements!"))
      throw new Error(`No enemy banner (${size}): ${enemy}`);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Wave banner review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/**
 * Mounts `TEST_WAVES` at the Goblins' round 1 turn with a controller that
 * ends the active seat's turn and hands the boundary to the view.
 */
async function mount(connection: Connection): Promise<void> {
  await navigate(connection, baseUrl.href);
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(() => { localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 })); localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 })); })()`,
  );
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      ${REVIEW}?.view?.destroy?.();
      const mission = engine.missionByIdV7('TEST_WAVES');
      const created = engine.createPlayableGameV7(engine.missionMatchSetupV7(mission, 'ORIGINAL'));
      let state = created.state;
      const apply = (actor) => {
        const applied = engine.applyCommandV7(state, actor, { kind: 'END_TURN' });
        if (!applied.accepted) throw new Error(applied.error.code);
        return applied;
      };
      for (let index = 0; index < 2; index += 1) state = apply(state.turnOrder[state.activeSeatIndex]).state;
      const subscribers = new Set();
      const boundarySubscribers = new Set();
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const step = (actor) => {
        const beforeState = state;
        const beforeView = engine.viewForV7(beforeState, beforeState.humanPlayerId);
        const applied = apply(actor);
        state = applied.state;
        const afterView = engine.viewForV7(state, state.humanPlayerId);
        const playerEvents = engine.projectEventsV7(beforeState, state, state.humanPlayerId, applied.events);
        const boundary = { actor: actor === state.humanPlayerId ? 'HUMAN' : 'AI', beforeView, afterView, playerEvents };
        for (const subscriber of boundarySubscribers) subscriber(boundary);
        const next = snapshot();
        for (const subscriber of subscribers) subscriber(next);
        return { accepted: true, beforeView, afterView, playerEvents };
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
        subscribeAcceptedBoundary(subscriber) { boundarySubscribers.add(subscriber); return () => boundarySubscribers.delete(subscriber); },
        async dispatch(command) {
          if (command.kind !== 'END_TURN') return { accepted: false, reason: 'ENGINE_REJECTED', error: { code: 'REVIEW' } };
          return step(state.humanPlayerId);
        },
        async launch() { throw new Error('review launch unavailable'); },
        async resume() { return true; },
        async returnToMenu() { return false; },
        async progressAiTurns() { return { ok: false, cancelled: true, acceptedCommands: 0, diagnostic: 'review' }; },
        async restart() { return { ok: false, code: 'CONTROLLER_DESTROYED', diagnostic: 'review' }; },
        async deleteStoredSave() { return false; },
        setFastForward() {},
        exportSafeLog() { return null; },
        exportDebugBundle() { return { ok: false, reason: 'NO_ACTIVE_MATCH' }; },
      };
      const root = document.querySelector('#app');
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, root, controller, { boardHost, settingsStorage: localStorage });
      globalThis.__WAVE_REVIEW__ = { boardHost, view, endTurn: () => step(state.turnOrder[state.activeSeatIndex]) };
    })()`,
    true,
  );
  await delay(1_500);
  // The first-steps coach would cover the board's top-left corner.
  await evaluate(
    connection,
    `document.querySelector('[data-action="first-step-dismiss"]')?.click()`,
  );
  await delay(300);
}

async function endTurn(connection: Connection): Promise<void> {
  await evaluate(connection, `${REVIEW}.endTurn()`);
}

async function waitForBanner(
  connection: Connection,
  kind: "arrival" | "heads-up",
): Promise<void> {
  await waitFor(
    connection,
    `document.querySelector('[data-v7-region="wave-banner"][data-kind="${kind}"]') !== null`,
  );
}

async function banner(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `(() => { const node = document.querySelector('[data-v7-region="wave-banner"]'); if (node === null) return null; const rect = node.getBoundingClientRect(); return { side: node.dataset.side, kind: node.dataset.kind, text: [...node.querySelectorAll('p')].map((p) => p.textContent), box: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)], viewport: [innerWidth, innerHeight], scrollWidth: document.documentElement.scrollWidth }; })()`,
  );
}

async function dismiss(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-v7-region="wave-banner"]')?.click()`,
  );
  await delay(300);
}

/** The banner enlarged twice, with a margin. */
async function cropBanner(connection: Connection, name: string): Promise<void> {
  const clip = (await evaluate(
    connection,
    `(() => { const rect = document.querySelector('[data-v7-region="wave-banner"]').getBoundingClientRect(); return { x: Math.max(0, rect.left - 12), y: Math.max(0, rect.top - 12), width: rect.width + 24, height: rect.height + 24 }; })()`,
  )) as { x: number; y: number; width: number; height: number };
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...clip, scale: 2 },
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  await writeFile(
    path.join(output.directory, name),
    Buffer.from(response.data, "base64"),
  );
}

async function viewport(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await connection.send(
    "Emulation.setDeviceMetricsOverride",
    size === "desktop"
      ? { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }
      : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  );
  await delay(300);
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(connection, `globalThis.__WAVE_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__WAVE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
