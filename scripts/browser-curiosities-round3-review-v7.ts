import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Map curiosities round-3 visual review (bead pulp_wars-737.20,
 * docs/product/RULESET_7_CURIOSITIES_ROUND_3.md section 12.1;
 * docs/ui/BOARD_TARGETING.md section 3.10). On the hand-built round-3 UI
 * fixture (tests/fixtures/v7-curiosities-round3-ui.ts) it captures, in the
 * live look and LEGACY, at desktop and phone widths: each new kind on the
 * board (the Tesla Tower, the Moon Gun, the Gold Claim staked by an enemy,
 * the Lost Expedition) with enlarged crops; each tile's dock with its state
 * line; the Zap button, its armed targets with their damage, and a zap; the
 * Fire button, the Moon Gun's landings, and a shot; the Stake and Find
 * Moves and their outcome; and, in the live look, the Gallery's
 * Curiosities tab with the new row.
 *
 * It never ends a turn and never runs an AI: the state is hand-built and
 * only the human's own Zap, Fire and Moves are sent. The browser is muted
 * and the game's sound and music are off. It needs the Vite dev server,
 * because the fixture is imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-curiosities-round3-review-v7.ts http://localhost:6173/
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

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "curiosities-round3-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-curiosities-round3-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 11_040 + (process.pid % 80);
const userData = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-curiosities-round3-ui-"),
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
const REVIEW = "globalThis.__ROUND3_REVIEW__";
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
      await mount(connection, look);
      const at = await coords(connection);
      evidence[`${suffix}Pieces`] = await pieces(connection);
      await zoomTo(connection, 80);
      // Each kind on the board, with an enlarged crop.
      for (const [name, where] of [
        ["tesla-tower", at.tower],
        ["moon-gun", at.gun],
        ["gold-claim", at.claim],
        ["lost-expedition", at.expedition],
      ] as const) {
        await frame(connection, where);
        await capture(connection, `board-${name}-${suffix}.png`);
        await crop(connection, `crop-${name}-${suffix}.png`, where);
      }
      // The tile docks: the Claim and the Expedition (nobody on them), and
      // the Tower and the Gun (a second activation reaches the tile).
      for (const [name, where, twice] of [
        ["gold-claim", at.claim, false],
        ["lost-expedition", at.expedition, false],
        ["tesla-tower", at.tower, true],
        ["moon-gun", at.gun, true],
      ] as const) {
        await activate(connection, where, twice);
        evidence[`${suffix}TileDock:${name}`] = await dockText(connection);
        await capture(connection, `dock-${name}-${suffix}.png`);
        await deselect(connection);
      }
      // The Zap: the gunner's dock with the button, the armed targets with
      // their damage labels, and the zap on the wounded Fighter.
      await activate(connection, at.gunner);
      evidence[`${suffix}GunnerDock`] = await dockText(connection);
      evidence[`${suffix}ZapButton`] = await evaluate(
        connection,
        `document.querySelector('[data-action="curiosity-zap"]')?.getAttribute('title') ?? null`,
      );
      await capture(connection, `zap-button-${suffix}.png`);
      await click(connection, '[data-action="curiosity-zap"]');
      await delay(400);
      evidence[`${suffix}ZapPanel`] = await evaluate(
        connection,
        `document.querySelector('[data-v7-curiosity-pick]')?.textContent ?? null`,
      );
      await capture(connection, `zap-targets-${suffix}.png`);
      await crop(connection, `crop-zap-targets-${suffix}.png`, at.tower, 5);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.wounded)})`,
      );
      await delay(350);
      await capture(connection, `zap-effect-${suffix}.png`);
      await delay(1_400);
      evidence[`${suffix}ZapNotice`] = await notice(connection);
      await capture(connection, `zap-after-${suffix}.png`);
      await deselect(connection);
      // The Moon Gun: the Knight's Fire, its landings, and a shot.
      await zoomTo(connection, 60);
      await activate(connection, at.knight);
      evidence[`${suffix}KnightDock`] = await dockText(connection);
      await capture(connection, `fire-button-${suffix}.png`);
      await click(connection, '[data-action="curiosity-fire"]');
      await delay(400);
      evidence[`${suffix}FirePanel`] = await evaluate(
        connection,
        `document.querySelector('[data-v7-curiosity-pick]')?.dataset.curiosityTargets ?? null`,
      );
      await capture(connection, `fire-landings-${suffix}.png`);
      await crop(connection, `crop-fire-landings-${suffix}.png`, at.gun, 5);
      const landing = { x: at.gun.x + 4, y: at.gun.y + 3 };
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(landing)})`,
      );
      await delay(450);
      await capture(connection, `fire-flight-${suffix}.png`);
      await delay(1_500);
      evidence[`${suffix}FireNotice`] = await notice(connection);
      await capture(connection, `fire-after-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.gun);
      evidence[`${suffix}GunAfterDock`] = await dockText(connection);
      await deselect(connection);
      // The Stake and Find Moves, and their outcome.
      await zoomTo(connection, 80);
      await activate(connection, at.prospector);
      await capture(connection, `stake-move-${suffix}.png`);
      await crop(connection, `crop-stake-move-${suffix}.png`, at.claim);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.claim)})`,
      );
      await delay(1_400);
      evidence[`${suffix}StakeNotice`] = await notice(connection);
      await capture(connection, `stake-after-${suffix}.png`);
      await crop(connection, `crop-stake-after-${suffix}.png`, at.claim);
      await deselect(connection);
      await activate(connection, at.explorer);
      await capture(connection, `find-move-${suffix}.png`);
      await crop(connection, `crop-find-move-${suffix}.png`, at.expedition);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.expedition)})`,
      );
      await delay(350);
      await capture(connection, `find-effect-${suffix}.png`);
      await delay(1_400);
      evidence[`${suffix}FindNotice`] = await notice(connection);
      await capture(connection, `find-after-${suffix}.png`);
      await crop(connection, `crop-find-after-${suffix}.png`, at.expedition);
      await deselect(connection);
      evidence[`${suffix}Traces`] = await evaluate(
        connection,
        `${REVIEW}.traces.map((trace) => trace.command.kind + ':' + trace.eventKinds.filter((kind) => /TESLA|MOON|CLAIM|EXPEDITION/.test(kind)).join('+'))`,
      );
    }
  // The Gallery's Curiosities tab (live look): the third row and its
  // details.
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    await navigate(connection, url({ art: "chibi" }));
    await waitFor(
      connection,
      `document.querySelector('[data-v7-setup]') !== null`,
    );
    await muteGame(connection);
    await click(connection, '[data-action="gallery"]');
    await waitFor(
      connection,
      `document.querySelector('[data-v7-gallery] .v7-gallery-table') !== null`,
    );
    await click(connection, '[data-action="gallery-tab-curiosities"]');
    await waitFor(
      connection,
      `document.querySelectorAll('.v7-gallery-curiosities .v7-gallery-tile').length === 14 && [...document.querySelectorAll('.v7-gallery-curiosities .v7-gallery-tile')].every((tile) => tile.dataset.state === 'ready')`,
    );
    await evaluate(
      connection,
      `document.querySelector('.v7-gallery-curiosities .v7-gallery-cell[data-row="TESLA_TOWER"]')?.scrollIntoView({ block: 'center' })`,
    );
    await delay(300);
    await capture(connection, `gallery-curiosities-${size}.png`);
    for (const row of [
      "TESLA_TOWER",
      "MOON_GUN",
      "GOLD_CLAIM",
      "LOST_EXPEDITION",
    ]) {
      await click(
        connection,
        `.v7-gallery-curiosities .v7-gallery-cell[data-row="${row}"]`,
      );
      await delay(600);
      evidence[`gallery:${row}:${size}`] = await evaluate(
        connection,
        `document.querySelector('[data-v7-gallery-detail], .v7-gallery-detail')?.textContent ?? null`,
      );
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
        "CURIOSITY:GOLD_CLAIM",
        "CURIOSITY:LOST_EXPEDITION",
        "CURIOSITY:MOON_GUN",
        "CURIOSITY:TESLA_TOWER",
      ].sort(),
    );
    if (found !== expected)
      throw new Error(`Unexpected round-3 pieces (${key}): ${found}`);
  }
  for (const look of ["default", "legacy"])
    for (const size of ["desktop", "phone"]) {
      const traces = JSON.stringify(evidence[`${look}-${size}Traces`]);
      for (const kind of [
        "TESLA_ZAPPED",
        "MOON_GUN_FIRED",
        "GOLD_CLAIM_STAKED",
        "EXPEDITION_FOUND",
      ])
        if (!traces.includes(kind))
          throw new Error(`No ${kind} in the ${look} ${size} review`);
    }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Curiosities round-3 UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** The game's sound and music off (the browser is muted as well). */
async function muteGame(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 })); localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 })); })()`,
  );
}

async function mount(connection: Connection, look: Look): Promise<void> {
  const art = look === "legacy" ? "legacy" : "chibi";
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  // LEGACY is reviewed in the classic board look, where the round-3 kinds
  // are drawn as code markers (curiosity-canvas-v7.ts).
  await evaluate(
    connection,
    look === "legacy"
      ? `localStorage.setItem('${CLASSIC_KEY}', '{"classic":true}')`
      : `localStorage.removeItem('${CLASSIC_KEY}')`,
  );
  await muteGame(connection);
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-curiosities-round3-ui.ts",
      fixture: "round3UiFixtureV7",
      artSet: art === "chibi" ? "CHIBI" : "LEGACY",
      global: "__ROUND3_REVIEW__",
      extras: "at: fixtures.ROUND3_UI_V7",
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
        .entries.filter((entry) => entry.kind === 'CURIOSITY')
        .map((entry) => entry.artSubject);
    })()`,
    true,
  );
}

async function coords(connection: Connection): Promise<Record<string, Coord>> {
  return (await evaluate(connection, `${REVIEW}.at`)) as Record<string, Coord>;
}

/** Selecting a cell frames it; Escape keeps the camera. */
async function frame(connection: Connection, at: Coord): Promise<void> {
  await activate(connection, at);
  await deselect(connection);
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

/** A `cells` x `cells` crop round `at` (3 by default), enlarged three times. */
async function crop(
  connection: Connection,
  name: string,
  at: Coord,
  cells = 3,
): Promise<void> {
  const clip = (await evaluate(
    connection,
    `(() => { const canvas = document.querySelector('canvas.board-canvas-v7'); const rect = canvas.getBoundingClientRect(); const centre = ${REVIEW}.boardHost.cellCentreCssPx(${JSON.stringify(at)}); const tile = Number(canvas.dataset.tileCssPx ?? '80'); const cells = ${cells}; return { x: Math.max(0, rect.left + centre.x - (cells / 2) * tile), y: Math.max(0, rect.top + centre.y - (cells / 2 + 0.2) * tile), width: cells * tile, height: cells * tile }; })()`,
  )) as { x: number; y: number; width: number; height: number };
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    clip: { ...clip, scale: cells > 3 ? 2 : 3 },
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

/** Activates `at`; `twice` reaches the tile under a unit. */
async function activate(
  connection: Connection,
  at: Coord,
  twice = false,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); ${twice ? `host.activate(${JSON.stringify(at)});` : ""} document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
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
  await evaluate(connection, `globalThis.__ROUND3_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__ROUND3_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
