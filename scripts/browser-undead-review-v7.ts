import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";

/**
 * Revision 13 Undead UI visual review (pulp_wars-vkq.8). It captures the
 * `?undead=1` setup and the Undead showcase fixture (Wail, Raise Dead,
 * Devour, Lich splash, Lifesteal, Infect, Restless, Graves) in the LEGACY and
 * CHIBI art sets at desktop and phone widths. It needs the Vite dev server,
 * because the showcase fixture is imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-undead-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>]
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
type ArtSet = "legacy" | "chibi";
interface Coord {
  readonly x: number;
  readonly y: number;
}

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "undead-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-undead-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_400 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-undead-ui-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
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

  // Setup with and without the development flag.
  await viewport(connection, "desktop");
  await navigate(connection, url({ undead: "1", art: "legacy" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null`,
  );
  evidence.flaggedSetup = await evaluate(
    connection,
    `(() => {
      const count = document.querySelector('#v7-ai-count');
      count.value = '2';
      count.dispatchEvent(new Event('change', { bubbles: true }));
      const second = document.querySelector('#v7-faction-0');
      second.value = 'UNDEAD';
      second.dispatchEvent(new Event('change', { bubbles: true }));
      return Array.from(document.querySelectorAll('[data-v7-factions] label')).map((label) => label.textContent);
    })()`,
  );
  await capture(connection, "setup-undead-flag-desktop.png");
  await viewport(connection, "phone");
  await capture(connection, "setup-undead-flag-phone.png");
  await viewport(connection, "desktop");
  await navigate(connection, url({ art: "legacy" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null`,
  );
  evidence.defaultSetupHasFactions = await evaluate(
    connection,
    `document.querySelector('[data-v7-factions]') !== null`,
  );
  if (evidence.defaultSetupHasFactions !== false)
    throw new Error("Setup without ?undead=1 shows faction choice");

  for (const art of ["legacy", "chibi"] as const) {
    await viewport(connection, "desktop");
    await mountShowcase(connection, art);
    const at = (await evaluate(
      connection,
      `globalThis.__UNDEAD_REVIEW__.at`,
    )) as Record<string, Coord>;
    await activate(connection, at.banshee as Coord);
    evidence[`${art}WailButton`] = await evaluate(
      connection,
      `document.querySelector('[data-action="command-wail"]')?.getAttribute('aria-label') ?? null`,
    );
    await capture(connection, `showcase-${art}-wail-desktop.png`);
    await activate(connection, at.necromancer as Coord);
    evidence[`${art}NecromancerActions`] = await evaluate(
      connection,
      `Array.from(document.querySelectorAll('.v7-selection-dock .v7-action-label')).map((node) => node.textContent)`,
    );
    await capture(connection, `showcase-${art}-raise-dead-desktop.png`);
    await activate(connection, at.ghoul as Coord);
    await capture(connection, `showcase-${art}-devour-desktop.png`);
    await activate(connection, at.restlessSkeleton as Coord);
    await capture(connection, `showcase-${art}-restless-desktop.png`);
    await activate(connection, at.lich as Coord);
    await keys(connection, ["ArrowLeft", "ArrowLeft"]);
    await capture(connection, `showcase-${art}-lich-splash-desktop.png`);
    await activate(connection, at.vampire as Coord);
    await capture(connection, `showcase-${art}-lifesteal-desktop.png`);
    await activate(connection, at.zombie as Coord);
    await capture(connection, `showcase-${art}-infect-desktop.png`);
    await viewport(connection, "phone");
    await mountShowcase(connection, art);
    await activate(connection, at.banshee as Coord);
    await capture(connection, `showcase-${art}-wail-phone.png`);
    await viewport(connection, "desktop");
    await mountShowcase(connection, art);
    await activate(connection, at.banshee as Coord);
    await evaluate(
      connection,
      `document.querySelector('[data-action="command-wail"]').click()`,
    );
    await waitFor(
      connection,
      `globalThis.__UNDEAD_REVIEW__.traces.some((trace) => trace.eventKinds.includes('WAIL_RESOLVED')) && document.querySelector('.v7-toast')?.textContent?.includes('wailed') === true`,
    );
    await delay(900);
    evidence[`${art}AfterWail`] = await evaluate(
      connection,
      `({ notice: document.querySelector('#v7-live')?.textContent, events: globalThis.__UNDEAD_REVIEW__.traces.at(-1).eventKinds })`,
    );
    await capture(connection, `showcase-${art}-after-wail-desktop.png`);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Undead UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function mountShowcase(
  connection: Connection,
  art: ArtSet,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const fixtures = await import('/tests/fixtures/v7-undead-ui.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      let state = fixtures.undeadShowcaseFixtureV7();
      const subscribers = new Set();
      const boundarySubscribers = new Set();
      const traces = [];
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
        subscribeAcceptedBoundary(subscriber) { boundarySubscribers.add(subscriber); return () => boundarySubscribers.delete(subscriber); },
        async dispatch(command) {
          const beforeState = state;
          const beforeView = engine.viewForV7(beforeState, beforeState.humanPlayerId);
          const applied = engine.applyCommandV7(beforeState, beforeState.humanPlayerId, command);
          if (!applied.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: applied.error };
          state = applied.state;
          const afterView = engine.viewForV7(state, state.humanPlayerId);
          const playerEvents = engine.projectEventsV7(beforeState, state, state.humanPlayerId, applied.events);
          traces.push({ command, eventKinds: playerEvents.events.map((event) => event.kind) });
          const boundary = { actor: 'HUMAN', beforeView, afterView, playerEvents };
          for (const subscriber of boundarySubscribers) subscriber(boundary);
          const next = snapshot();
          for (const subscriber of subscribers) subscriber(next);
          return { accepted: true, beforeView, afterView, playerEvents };
        },
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
      const view = new Ruleset7DomAppView(document, root, controller, { boardHost, settingsStorage: null, artSet: ${JSON.stringify(art.toUpperCase())} });
      globalThis.__UNDEAD_REVIEW__ = { boardHost, traces, view, at: fixtures.UNDEAD_SHOWCASE_V7 };
    })()`,
    true,
  );
  await delay(1_200);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { globalThis.__UNDEAD_REVIEW__.boardHost.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  // A keyboard round trip keeps the selected cell and its neighbours
  // on screen below the HUD without changing the selection.
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(600);
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
  };
  for (const key of names) {
    for (const type of ["rawKeyDown", "keyUp"] as const)
      await connection.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: codes[key],
      });
  }
  await delay(400);
}

async function viewport(
  connection: Connection,
  size: "desktop" | "phone",
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
  await evaluate(connection, `globalThis.__UNDEAD_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__UNDEAD_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
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
