import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Map curiosities round-2 visual review (bead pulp_wars-737.16,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 34.1). On the hand-built
 * round-2 UI fixtures (tests/fixtures/v7-curiosities-round2-ui.ts) it
 * captures, in the live look and LEGACY, at desktop and phone widths: each
 * new kind on the board (the Downed Saucer and its guards, the Graveyard and
 * its Zombies, both gates, Bigfoot, the Wishing Well) with enlarged crops;
 * the threat overlays (a selected guard's camp, perimeter and reach, the
 * Zombies' wander area and reach, Bigfoot's habitat) and the provoke
 * markers on a Knight's Moves; a selected gate's partner; the gate Move
 * preview (the exit, the occupant shoved aside, and blocked); the Toss a
 * Coin command, the toss and its toast; a traversal; each new tile's and
 * unit's dock; and, in the live look, the Gallery's Curiosities tab.
 *
 * It never ends a turn and never runs an AI: every state is hand-built and
 * only the human's own Move and Toss a Coin are sent. It needs the Vite dev
 * server, because the fixture is imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-curiosities-round2-review-v7.ts http://localhost:6173/
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
type Look = "default" | "legacy";
type ScreenSize = "desktop" | "phone";
interface Coord {
  readonly x: number;
  readonly y: number;
}
type Fixture =
  | "round2SaucerUiFixtureV7"
  | "round2GraveyardUiFixtureV7"
  | "round2GateBlockedUiFixtureV7";

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "curiosities-round2-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-curiosities-round2-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_940 + (process.pid % 80);
const userData = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-curiosities-round2-ui-"),
);
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
const REVIEW = "globalThis.__ROUND2_REVIEW__";
const CLASSIC_KEY = "pulpWars.ruleset7.boardClassicLook.v1";

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const look of ["default", "legacy"] as const)
    for (const size of ["desktop", "phone"] as const) {
      const suffix = `${look}-${size}`;
      await viewport(connection, size);
      // The saucer board: every kind but the Graveyard.
      await mount(connection, look, "round2SaucerUiFixtureV7");
      let at = await coords(connection);
      evidence[`${suffix}Pieces`] = await pieces(connection);
      await zoomTo(connection, 80);
      for (const [name, where] of [
        ["saucer", at.camp],
        ["gate-a", at.gateA],
        ["gate-b", at.gateB],
        ["bigfoot", at.bigfoot],
        ["well", at.well],
      ] as const) {
        await frame(connection, where as Coord);
        await capture(connection, `board-${name}-${suffix}.png`);
        await crop(connection, `crop-${name}-${suffix}.png`, where as Coord);
      }
      // Threats: a selected guard (its camp, the saucer's perimeter and the
      // camp's reach), the camp centre, the Knight's provoked Moves, and
      // Bigfoot's habitat.
      const guards = at.guards as readonly Coord[];
      await activate(connection, guards[0] as Coord);
      evidence[`${suffix}GruntDock`] = await dockText(connection);
      await capture(connection, `threat-saucer-guard-${suffix}.png`);
      await click(connection, '[data-action="unit-help"]');
      await capture(connection, `dialog-grunt-${suffix}.png`);
      await click(connection, '[data-action="close-unit-help"]');
      await deselect(connection);
      await activate(connection, at.camp as Coord);
      evidence[`${suffix}SaucerDock`] = await dockText(connection);
      await capture(connection, `threat-saucer-centre-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.knight as Coord);
      await capture(connection, `threat-provoke-moves-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.bigfoot as Coord);
      evidence[`${suffix}BigfootDock`] = await dockText(connection);
      await capture(connection, `threat-bigfoot-habitat-${suffix}.png`);
      await click(connection, '[data-action="unit-help"]');
      await capture(connection, `dialog-bigfoot-${suffix}.png`);
      await click(connection, '[data-action="close-unit-help"]');
      await deselect(connection);
      // The gates: a selected gate marks its partner; the traveller's Move
      // onto it shows the exit and the occupant shoved aside.
      await zoomTo(connection, 60);
      await activate(connection, at.gateA as Coord);
      evidence[`${suffix}GateDock`] = await dockText(connection);
      await capture(connection, `gate-tile-${suffix}.png`);
      await focusOn(connection, at.gateA as Coord, at.gateB as Coord);
      await capture(connection, `gate-partner-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.traveller as Coord);
      await capture(connection, `gate-move-entry-${suffix}.png`);
      await focusOn(connection, at.traveller as Coord, at.gateB as Coord);
      await capture(connection, `gate-move-exit-${suffix}.png`);
      await deselect(connection);
      await zoomTo(connection, 80);
      // The Well: its tile dock, the pilgrim's Toss a Coin, the toss.
      await activate(connection, at.pilgrim as Coord);
      evidence[`${suffix}PilgrimDock`] = await dockText(connection);
      evidence[`${suffix}TossButton`] = await evaluate(
        connection,
        `document.querySelector('[data-action="command-toss_coin"]')?.getAttribute('title') ?? null`,
      );
      await capture(connection, `well-toss-button-${suffix}.png`);
      await click(connection, '[data-action="command-toss_coin"]');
      await delay(250);
      await capture(connection, `well-toss-effect-${suffix}.png`);
      await delay(1_200);
      evidence[`${suffix}TossNotice`] = await notice(connection);
      await capture(connection, `well-toss-after-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.well as Coord);
      evidence[`${suffix}WellDock`] = await dockText(connection);
      await deselect(connection);
      // A traversal: the traveller steps onto the gate; the occupant is
      // shoved aside and the traveller comes out of the other gate.
      await activate(connection, at.traveller as Coord);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.gateA)})`,
      );
      await delay(300);
      await capture(connection, `gate-traverse-${suffix}.png`);
      await delay(1_400);
      evidence[`${suffix}TraverseNotice`] = await notice(connection);
      await frame(connection, at.gateB as Coord);
      await capture(connection, `gate-traverse-after-${suffix}.png`);
      evidence[`${suffix}Traces`] = await evaluate(
        connection,
        `${REVIEW}.traces.map((trace) => trace.command.kind + ':' + trace.eventKinds.filter((kind) => /GATE|COIN/.test(kind)).join('+'))`,
      );
      // A blocked gate.
      await mount(connection, look, "round2GateBlockedUiFixtureV7");
      at = await coords(connection);
      await zoomTo(connection, 60);
      await activate(connection, at.traveller as Coord);
      await focusOn(connection, at.traveller as Coord, at.gateB as Coord);
      await capture(connection, `gate-blocked-exit-${suffix}.png`);
      await crop(
        connection,
        `crop-gate-blocked-exit-${suffix}.png`,
        at.gateB as Coord,
      );
      await deselect(connection);
      await activate(connection, at.traveller as Coord);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.gateA)})`,
      );
      await delay(1_500);
      evidence[`${suffix}BlockedNotice`] = await notice(connection);
      await capture(connection, `gate-blocked-after-${suffix}.png`);
      // The Graveyard board: the Zombies' wander area and reach.
      await mount(connection, look, "round2GraveyardUiFixtureV7");
      at = await coords(connection);
      await zoomTo(connection, 80);
      await frame(connection, at.camp as Coord);
      await capture(connection, `board-graveyard-${suffix}.png`);
      await crop(connection, `crop-graveyard-${suffix}.png`, at.camp as Coord);
      await activate(connection, (at.guards as readonly Coord[])[0] as Coord);
      evidence[`${suffix}ZombieDock`] = await dockText(connection);
      await capture(connection, `threat-graveyard-zombie-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.camp as Coord);
      evidence[`${suffix}GraveyardDock`] = await dockText(connection);
      await capture(connection, `graveyard-tile-${suffix}.png`);
      await deselect(connection);
    }
  // The Gallery's Curiosities tab (live look): both rows, Bigfoot and the
  // saucer's details.
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    await navigate(connection, url({ art: "chibi" }));
    await waitFor(
      connection,
      `document.querySelector('[data-v7-setup]') !== null`,
    );
    await click(connection, '[data-action="gallery"]');
    await waitFor(
      connection,
      `document.querySelector('[data-v7-gallery] .v7-gallery-table') !== null`,
    );
    await click(connection, '[data-action="gallery-tab-curiosities"]');
    await waitFor(
      connection,
      `document.querySelectorAll('.v7-gallery-curiosities .v7-gallery-tile').length === 10 && [...document.querySelectorAll('.v7-gallery-curiosities .v7-gallery-tile')].every((tile) => tile.dataset.state === 'ready')`,
    );
    await capture(connection, `gallery-curiosities-${size}.png`);
    for (const row of ["BIGFOOT", "DOWNED_SAUCER", "GATE", "WISHING_WELL"]) {
      await click(
        connection,
        `.v7-gallery-curiosities .v7-gallery-cell[data-row="${row}"]`,
      );
      await delay(600);
      await capture(
        connection,
        `gallery-${row.toLowerCase().replaceAll("_", "-")}-${size}.png`,
      );
      await click(connection, '[data-action="gallery-detail-close"]');
    }
  }
  for (const key of ["default-desktop", "legacy-phone"]) {
    const found = JSON.stringify(
      [...((evidence[`${key}Pieces`] as string[] | undefined) ?? [])].sort(),
    );
    const expected = JSON.stringify(
      [
        "CURIOSITY:DOWNED_SAUCER",
        "CURIOSITY:GATE",
        "CURIOSITY:GATE",
        "CURIOSITY:WISHING_WELL",
        "UNIT:MARTIAN:FIGHTER:provoked",
        "UNIT:MARTIAN:MARKSMAN:provoked",
        "UNIT:MARTIAN:GUARD:provoked",
        "UNIT:NEUTRAL_BIGFOOT",
      ].sort(),
    );
    if (found !== expected)
      throw new Error(`Unexpected round-2 pieces (${key}): ${found}`);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Curiosities round-2 UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

async function mount(
  connection: Connection,
  look: Look,
  fixture: Fixture,
): Promise<void> {
  const art = look === "legacy" ? "legacy" : "chibi";
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(connection, `localStorage.removeItem('${CLASSIC_KEY}')`);
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-curiosities-round2-ui.ts",
      fixture,
      artSet: art === "chibi" ? "CHIBI" : "LEGACY",
      global: "__ROUND2_REVIEW__",
      extras: "at: fixtures.ROUND2_UI_V7",
      settingsStorage: "localStorage",
    }),
    true,
  );
  await delay(1_500);
  // The first-steps coach would cover the board's top-left corner.
  await click(connection, '[data-action="first-step-dismiss"]');
}

async function pieces(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `(async () => {
      const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      return buildBoardRenderPlanV7(${REVIEW}.snapshotView(), [], { selection: null, selectedUnitId: null, selectedAchievement: null })
        .entries.filter((entry) => entry.kind === 'CURIOSITY' || entry.monster !== undefined)
        .map((entry) => entry.artSubject + (entry.monster?.provoked ? ':provoked' : ''));
    })()`,
    true,
  );
}

async function coords(
  connection: Connection,
): Promise<Record<string, Coord | readonly Coord[]>> {
  return (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord | readonly Coord[]
  >;
}

/** Selecting a cell frames it; Escape keeps the camera. */
async function frame(connection: Connection, at: Coord): Promise<void> {
  await activate(connection, at);
  await deselect(connection);
}

/**
 * Walks the keyboard focus from `from` to `to` (the camera follows it), so
 * a far cell such as a gate's exit comes into view while the selection
 * stays.
 */
async function focusOn(
  connection: Connection,
  from: Coord,
  to: Coord,
): Promise<void> {
  const names: string[] = [];
  for (let step = 0; step < Math.abs(to.x - from.x); step += 1)
    names.push(to.x > from.x ? "ArrowRight" : "ArrowLeft");
  for (let step = 0; step < Math.abs(to.y - from.y); step += 1)
    names.push(to.y > from.y ? "ArrowDown" : "ArrowUp");
  await keys(connection, names);
  await delay(600);
}

async function notice(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `({ toast: document.querySelector('[data-v7-region="toast"]')?.textContent ?? null, status: Array.from(document.querySelectorAll('[aria-live]')).map((node) => node.textContent).filter(Boolean) })`,
  );
}

async function click(connection: Connection, selector: string): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector(${JSON.stringify(selector)})?.click()`,
  );
  await delay(300);
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

/** Steps the zoom until a cell is `tile` CSS px wide (80: step 1). */
async function zoomTo(connection: Connection, tile: number): Promise<void> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = Number(
      await evaluate(
        connection,
        `document.querySelector('canvas.board-canvas-v7')?.dataset.tileCssPx ?? '0'`,
      ),
    );
    if (current === 0 || Math.abs(current - tile) < 1) return;
    await click(
      connection,
      current < tile ? '[data-action="zoom-in"]' : '[data-action="zoom-out"]',
    );
    await delay(300);
  }
}

/** A 3 x 3 cell crop round `at`, enlarged three times. */
async function crop(
  connection: Connection,
  name: string,
  at: Coord,
): Promise<void> {
  const clip = (await evaluate(
    connection,
    `(() => { const canvas = document.querySelector('canvas.board-canvas-v7'); const rect = canvas.getBoundingClientRect(); const centre = ${REVIEW}.boardHost.cellCentreCssPx(${JSON.stringify(at)}); const tile = Number(canvas.dataset.tileCssPx ?? '80'); return { x: Math.max(0, rect.left + centre.x - 1.5 * tile), y: Math.max(0, rect.top + centre.y - 1.7 * tile), width: 3 * tile, height: 3 * tile }; })()`,
  )) as { x: number; y: number; width: number; height: number };
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...clip, scale: 3 },
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  await writeFile(
    path.join(output.directory, name),
    Buffer.from(response.data, "base64"),
  );
}

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
  await keys(connection, ["ArrowDown", "ArrowUp"]);
  await delay(600);
}

async function dockText(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent), info: Array.from(dock.querySelectorAll('.v7-curiosity-info')).map((node) => node.textContent), actions: Array.from(dock.querySelectorAll('.v7-context-action')).map((node) => node.textContent) }; })()`,
  );
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
  for (const key of names)
    for (const type of ["rawKeyDown", "keyUp"] as const)
      await connection.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: codes[key],
      });
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
  await evaluate(connection, `globalThis.__ROUND2_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__ROUND2_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
