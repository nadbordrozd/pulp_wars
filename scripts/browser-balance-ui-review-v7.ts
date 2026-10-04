import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Visual review of the balance round's UI (bead pulp_wars-1wy.5, ruleset
 * `7r37`), at desktop and phone widths in the default look:
 *
 * - Beam Down, passenger first: the "Beam" badges and the carrier's
 *   pick-up range, the portrait buttons and the two hint chips, the tiles
 *   round the carrier, the arrival, the "Beamed" chip with the attack still
 *   offered, and the used carrier's disabled buttons;
 * - the Saucer's one-tile Tractor Beam and the Mothership's two-tile heavy
 *   one with their paths, the "Free" tag, and the "Beam used" chip;
 * - a Frozen carrier that moved;
 * - the Ice Folk Glide tiles inside the Snow and on its edge, with the
 *   Snow cover Defense term "+25%";
 * - the Gallery: a Mothership's heavy pull, a Saucer's beam-down-and-shoot
 *   and a Yeti's details.
 *
 * It needs the Vite dev server, because the fixtures are imported from
 * `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-balance-ui-review-v7.ts http://localhost:6173/
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
  name: "balance-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-balance-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_780 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-balance-ui-"));
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
const REVIEW = "globalThis.__BALANCE_REVIEW__";
const MARTIAN_FIXTURES = "/tests/fixtures/v7-martian-ui.ts";
const ICE_FOLK_FIXTURES = "/tests/fixtures/v7-ice-folk-ui.ts";

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
    await beamDownTour(connection, size);
    await tractorTour(connection, size);
    await frozenTour(connection, size);
    await glideTour(connection, size);
    await galleryTour(connection, size);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Balance UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** Beam Down: the passengers, the tiles, the arrival, and the chips. */
async function beamDownTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await mount(
    connection,
    MARTIAN_FIXTURES,
    "martianMobilityFixtureV7",
    "at: fixtures.MARTIAN_MOBILITY_V7",
  );
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  await activate(connection, required(at.carrier));
  evidence[`${size}SaucerDock`] = await dockText(connection);
  await capture(connection, `saucer-dock-${size}.png`);
  await click(connection, "martian-beam-down");
  await delay(900);
  evidence[`${size}BeamPassengers`] = await evaluate(
    connection,
    `({
      passengers: Array.from(document.querySelectorAll('.v7-beam-passenger')).map((node) => node.getAttribute('aria-label')),
      hint: Array.from(document.querySelectorAll('.v7-beam-hint-chip')).map((node) => node.textContent),
      panel: document.querySelector('[data-v7-martian-pick]')?.textContent ?? null,
    })`,
  );
  await capture(connection, `beam-down-passengers-${size}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.cityGrunt)})`,
  );
  await delay(900);
  await capture(connection, `beam-down-tiles-${size}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.lightPullTo)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'BEAM_DOWN')`,
  );
  await delay(1_300);
  await capture(connection, `beam-down-after-${size}.png`);
  // The beamed Grunt: "Beamed", an attack offered, no Move.
  await deselect(connection);
  await activate(connection, required(at.lightPullTo));
  evidence[`${size}BeamedDock`] = await dockText(connection);
  await capture(connection, `beamed-chip-${size}.png`);
  // The carrier used its action: both buttons name it.
  await deselect(connection);
  await activate(connection, required(at.carrier));
  evidence[`${size}UsedCarrierDock`] = await dockText(connection);
  await capture(connection, `carrier-used-${size}.png`);
}

/** Both Tractor Beams with their paths, and the spent heavy one. */
async function tractorTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await mount(
    connection,
    MARTIAN_FIXTURES,
    "martianMobilityFixtureV7",
    "at: fixtures.MARTIAN_MOBILITY_V7",
  );
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  await activate(connection, required(at.carrier));
  await click(connection, "martian-tractor-beam");
  await delay(700);
  await focusBoard(connection);
  await keys(connection, ["ArrowLeft", "ArrowLeft"]);
  evidence[`${size}SaucerPullCursor`] = await cursorText(connection);
  await capture(connection, `tractor-saucer-path-${size}.png`);
  await deselect(connection);
  await activate(connection, required(at.mothership));
  evidence[`${size}MothershipDock`] = await dockText(connection);
  await click(connection, "martian-tractor-beam");
  await delay(700);
  await focusBoard(connection);
  await keys(connection, ["ArrowDown", "ArrowDown", "ArrowDown"]);
  evidence[`${size}MothershipPullCursor`] = await cursorText(connection);
  await capture(connection, `tractor-mothership-path-${size}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.heavyTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'TRACTOR_BEAM')`,
  );
  await delay(1_400);
  evidence[`${size}HeavyPull`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await deselect(connection);
  await activate(connection, required(at.mothership));
  evidence[`${size}SpentMothershipDock`] = await dockText(connection);
  await capture(connection, `tractor-mothership-after-${size}.png`);
}

/** A Frozen Saucer that moved: the reason on its own buttons. */
async function frozenTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await mount(
    connection,
    ICE_FOLK_FIXTURES,
    "martianFrozenFixtureV7",
    "at: fixtures.MARTIAN_FROZEN_V7",
  );
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  await activate(connection, required(at.saucer));
  evidence[`${size}FrozenDock`] = await dockText(connection);
  await capture(connection, `frozen-carrier-${size}.png`);
}

/** Glide: the range inside the Snow and on its edge; Snow cover "+25%". */
async function glideTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await mount(
    connection,
    ICE_FOLK_FIXTURES,
    "iceFolkGlideFixtureV7",
    "at: fixtures.ICE_FOLK_GLIDE_V7",
  );
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  for (const place of ["inside", "edge", "outside"] as const) {
    await deselect(connection);
    await activate(connection, required(at[place]));
    evidence[`${size}Glide${place}`] = await evaluate(
      connection,
      `({
        defense: document.querySelector('.v7-selection-dock .v7-stat[data-stat="defense"]')?.textContent ?? null,
        legend: document.querySelector('[data-landing-marker="glide"]')?.textContent ?? null,
      })`,
    );
    await capture(connection, `glide-${place}-${size}.png`);
  }
}

/** The Gallery's Mothership pull, Saucer beam-down-and-shoot, and Yeti. */
async function galleryTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-action="gallery"]') !== null`,
  );
  await click(connection, "gallery");
  await waitFor(
    connection,
    `document.querySelector('[data-v7-gallery] .v7-gallery-table') !== null`,
  );
  for (const [row, faction, cue, name] of [
    ["KNIGHT", "MARTIAN", "tractor-beam", "mothership-pull"],
    ["RAIDER", "MARTIAN", "beam-down", "saucer-beam-and-shoot"],
    ["FIGHTER", "ICE_FOLK", null, "yeti"],
  ] as const) {
    await evaluate(
      connection,
      `document.querySelector('.v7-gallery-cell[data-row="${row}"][data-faction="${faction}"]')?.click()`,
    );
    await waitFor(
      connection,
      `document.querySelector('.v7-gallery-detail') !== null`,
    );
    await delay(600);
    if (cue !== null) {
      await click(connection, `gallery-cue-${cue}`);
      // Mid-cue: the cone over the pulled unit, or the column of light.
      await delay(cue === "tractor-beam" ? 700 : 750);
      await capture(connection, `gallery-${name}-playing-${size}.png`);
      if (cue === "beam-down") {
        await delay(650);
        await capture(connection, `gallery-${name}-shot-${size}.png`);
      }
      await waitFor(
        connection,
        `document.querySelector('.v7-gallery-demo')?.dataset.demoState === 'done'`,
      );
    } else await delay(1_500);
    evidence[`${size}Gallery${name}`] = await evaluate(
      connection,
      `({
        cues: Array.from(document.querySelectorAll('.v7-gallery-cue')).map((node) => node.dataset.cue),
        text: document.querySelector('.v7-gallery-detail')?.textContent ?? null,
      })`,
    );
    await capture(connection, `gallery-${name}-${size}.png`);
    await click(connection, "gallery-detail-close");
    await delay(300);
  }
}

function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture place missing");
  return value;
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
  module: string,
  fixture: string,
  extras: string,
): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module,
      fixture,
      artSet: "CHIBI",
      global: "__BALANCE_REVIEW__",
      extras,
    }),
    true,
  );
  await delay(1_200);
}

async function click(connection: Connection, action: string): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="${action}"]')?.click()`,
  );
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
  // A keyboard round trip keeps the selected cell and its neighbours on
  // screen below the HUD without changing the selection.
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(600);
}

async function focusBoard(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
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
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-identity .v7-chip')).map((node) => node.textContent), actions: Array.from(dock.querySelectorAll('.v7-context-action')).map((node) => ({ label: node.querySelector('.v7-action-label')?.textContent, tag: node.querySelector('.v7-action-tag')?.textContent ?? null, title: node.title, disabled: node.getAttribute('aria-disabled') === 'true' })) }; })()`,
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
  await evaluate(connection, `globalThis.__BALANCE_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__BALANCE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
