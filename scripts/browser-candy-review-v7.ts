import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  candyFixtureMountExpressionV7,
  type CandyUiFixtureNameV7,
} from "./browser-candy-fixture-v7";

/**
 * Candy UI visual review (bead pulp_wars-jdb.6). On the Candy UI fixtures
 * it captures the board markers (Rushed with Home Sweet Home, the Sugar
 * Frenzy pips, Crashed, Splatted, the Crumbs), the armed Sugar Rush with
 * its sparkling reach, the Re-bake ghosts, the Sugar Toss targets, the
 * dock chips, the Bounce arrow and "Eats Crumbs" for the other side, the
 * Candy cues frozen mid-animation, Help and the technology tree, in the
 * CHIBI art set (the default look) at desktop and phone widths, and the
 * board once in LEGACY (the code-drawn markers). It needs the Vite dev
 * server, because the fixtures are imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-candy-review-v7.ts http://localhost:6173/
 *   [--output-dir=<new-dir>] [--only=board,abilities,victim,cues,menus,legacy]
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
type ScreenSize = "desktop" | "phone";
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
  name: "candy-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-candy-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_860 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-candy-ui-"));
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
const REVIEW = "globalThis.__CANDY_REVIEW__";
const only = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length);
const want = (part: string): boolean =>
  only === undefined || only.split(",").includes(part);

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
    if (want("board")) await boardTour(connection, "chibi", size);
    if (want("abilities")) await abilityTour(connection, size);
    if (want("victim")) await victimTour(connection, size);
    if (want("menus")) await menuTour(connection, size);
  }
  await viewport(connection, "desktop");
  if (want("cues")) await cueTour(connection);
  if (want("legacy")) await boardTour(connection, "legacy", "desktop");

  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify({ evidence, errors }, null, 2)}\n`,
  );
  // No player-facing text of the review names a tile.
  const texts = JSON.stringify(evidence);
  if (/\(\d+, ?\d+\)/.test(texts))
    errors.push("A captured text names a tile by its coordinates");
  if (errors.length > 0) throw new Error(errors.join("\n"));
  await output.publish();
  console.log(`Candy UI review: ${output.directory}`);
  connection.close();
} finally {
  browser.kill();
  await rm(userData, { recursive: true, force: true }).catch(() => undefined);
}

/** The board alone: every marker and the Crumbs. */
async function boardTour(
  connection: Connection,
  art: ArtSet,
  size: ScreenSize,
): Promise<void> {
  const suffix = `${art}-${size}`;
  await mount(connection, art, "candyUiFixtureV7");
  const at = await coords("at", connection);
  await focusCell(connection, at.rushedBear as Coord);
  await capture(connection, `board-${suffix}.png`);
  if (size !== "desktop") return;
  // The markers close up: the Rushed Donut at home, the Crashed
  // Marshmallow, the Splatted Guard, and the Crumbs by the Confectioner.
  for (const [name, cell] of [
    ["rushed-home", at.rushedDonut],
    ["crashed", at.crashed],
    ["splatted", at.splatted],
  ] as const) {
    await activate(connection, cell as Coord);
    evidence[`${suffix}-${name}-dock`] = await dockText(connection);
    await capture(connection, `marker-${name}-${suffix}.png`);
    await deselect(connection);
  }
  await activate(connection, at.rushedBear as Coord);
  evidence[`${suffix}-frenzy-dock`] = await dockText(connection);
  await capture(connection, `marker-frenzy-pips-${suffix}.png`);
  await deselect(connection);
}

/** Sugar Rush armed, Re-bake and Sugar Toss aimed. */
async function abilityTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await mount(connection, "chibi", "candyUiFixtureV7");
  const at = await coords("at", connection);
  for (const [name, cell, action] of [
    ["sugar-rush", at.gumdrop, "candy-sugar-rush"],
    ["rebake", at.confectioner, "candy-rebake"],
    ["sugar-toss", at.gunner, "candy-sugar-toss"],
  ] as const) {
    await activate(connection, cell as Coord);
    evidence[`${size}-${name}-dock`] = await dockText(connection);
    if (name === "rebake")
      await capture(connection, `dock-${name}-${size}.png`);
    await evaluate(
      connection,
      `document.querySelector('[data-action="${action}"]')?.click()`,
    );
    await delay(700);
    evidence[`${size}-${name}-panel`] = await evaluate(
      connection,
      `document.querySelector('[data-v7-candy-pick]')?.textContent ?? null`,
    );
    await capture(connection, `aim-${name}-${size}.png`);
    await deselect(connection);
  }
}

/** The other side: the Bounce arrow and "Eats Crumbs". */
async function victimTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await mount(connection, "chibi", "candyVictimFixtureV7");
  const victim = await coords("victim", connection);
  for (const [name, cell, keysToTarget] of [
    ["bounce", victim.fighter, ["ArrowRight"]],
    ["bounce-blocked", victim.knight, ["ArrowRight"]],
    ["eats-crumbs", victim.eater, ["ArrowLeft"]],
  ] as const) {
    await activate(connection, cell as Coord);
    await keys(connection, keysToTarget);
    evidence[`${size}-${name}-cursor`] = await cursorText(connection);
    await capture(connection, `victim-${name}-${size}.png`);
    await deselect(connection);
  }
}

/** Help and the technology tree of a Candy viewer. */
async function menuTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await mount(connection, "chibi", "candyUiFixtureV7");
  await evaluate(
    connection,
    `document.querySelector('[data-action="tech"]')?.click()`,
  );
  await delay(500);
  await evaluate(
    connection,
    `document.querySelector('[data-action="tech-fortification"]')?.click()`,
  );
  await delay(400);
  await capture(connection, `tech-home-sweet-home-${size}.png`);
  await mount(connection, "chibi", "candyUiFixtureV7");
  await evaluate(
    connection,
    `document.querySelector('[data-action="compact-menu"]')?.click()`,
  );
  await delay(200);
  await evaluate(
    connection,
    `document.querySelector('[data-action="help"]')?.click()`,
  );
  await delay(400);
  evidence[`${size}-help`] = await evaluate(
    connection,
    `Array.from(document.querySelectorAll('.v7-help h3')).map((node) => node.textContent)`,
  );
  await evaluate(
    connection,
    `document.querySelector('.v7-help')?.scrollIntoView({ block: 'center' })`,
  );
  await delay(200);
  await capture(connection, `help-candy-${size}.png`);
}

/** Every Candy cue, frozen at the frame reduced motion holds. */
async function cueTour(connection: Connection): Promise<void> {
  await mount(connection, "chibi", "candyUiFixtureV7");
  const at = await coords("at", connection);
  await focusCell(connection, at.rushedBear as Coord);
  await evaluate(
    connection,
    `(async () => {
      const effects = await import('/src/render/canvas/candy-effects-v7.ts');
      const at = ${REVIEW}.at;
      const cue = (effect, cells, extra = {}) => ({ effect, cells, progress: effects.candyReducedMotionProgressV7(effect), ...extra });
      ${REVIEW}.boardHost.pinCandyFeedback([
        cue('RUSH', [at.gumdrop]),
        cue('CRASH', [at.rushedBear]),
        cue('WAKE', [at.crashed]),
        cue('REBAKE', [at.crumbsBear], { from: at.confectioner }),
        { ...cue('SUGAR_TOSS', [at.tossNear], { from: at.gunner, amount: 2 }), progress: 0.4 },
        cue('SUGAR_TOSS', [at.tossFar], { from: at.gunner, amount: 1 }),
        cue('SPLAT', [at.splatted]),
        cue('BOUNCE', [at.rushTarget]),
        cue('PEPPERMINT', [at.crumbsGumdrop], { amount: 3 }),
      ]);
    })()`,
    true,
  );
  await delay(900);
  await capture(connection, "cues-chibi-desktop.png");
  await evaluate(
    connection,
    `(async () => {
      const at = ${REVIEW}.at;
      ${REVIEW}.boardHost.pinCandyFeedback([]);
      ${REVIEW}.boardHost.pinAttackFeedback([
        { effect: 'PIE_THROW', from: at.pieLauncher, to: at.pieTarget, progress: 0.4 },
        { effect: 'PIE_THROW', from: at.pieLauncher, to: at.splatted, progress: 0.72 },
        { effect: 'GUMBALL_SHOT', from: at.gunner, to: at.movedGumdrop, progress: 0.3 },
      ]);
    })()`,
    true,
  );
  await delay(900);
  await focusCell(connection, at.pieLauncher as Coord);
  await capture(connection, "cues-pie-gumball-chibi-desktop.png");
}

async function coords(
  key: "at" | "victim",
  connection: Connection,
): Promise<Record<string, Coord>> {
  return (await evaluate(connection, `${REVIEW}.${key}`)) as Record<
    string,
    Coord
  >;
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function mount(
  connection: Connection,
  art: ArtSet,
  fixture: CandyUiFixtureNameV7,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    candyFixtureMountExpressionV7(
      fixture,
      art === "chibi" ? "CHIBI" : "LEGACY",
    ),
    true,
  );
  await delay(1_400);
}

/** Clears the selection (and any picking state) with Escape. */
async function deselect(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { for (let index = 0; index < 3; index += 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); })()`,
  );
  await delay(200);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(600);
}

/** Moves the keyboard cursor to `at` without selecting anything. */
async function focusCell(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await deselect(connection);
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  await delay(400);
}

async function cursorText(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null`,
  );
}

async function dockText(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, portrait: dock.querySelector('img')?.getAttribute('src')?.slice(0, 120) ?? null, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent), tooltips: Array.from(dock.querySelectorAll('.v7-candy-chip')).map((node) => node.getAttribute('title')), actions: Array.from(dock.querySelectorAll('.v7-action-label')).map((node) => node.textContent), disabled: Array.from(dock.querySelectorAll('[aria-disabled="true"]')).map((node) => node.getAttribute('aria-label')) }; })()`,
  );
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    Enter: 13,
    Escape: 27,
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
  await evaluate(connection, `globalThis.__CANDY_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__CANDY_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
