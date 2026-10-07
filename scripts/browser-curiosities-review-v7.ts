import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Map curiosities visual review (bead pulp_wars-737.6,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 12). On the curiosities
 * UI fixture (tests/fixtures/v7-curiosities-ui.ts) it captures, in the
 * default look, the Classic look and LEGACY, at desktop and phone widths:
 * the board with every curiosity at zoom steps 1 and 0.75, the calm and the
 * provoked Spider, its dock and unit dialog with its area and reach, the
 * provoke warning on a Knight's Moves, the attack preview, each curiosity
 * tile's dock, the four effects pinned mid-animation, a Shrine claim, the
 * frames of a neutral turn, and Help. In the default look it also captures
 * the setup screen's checkbox and the Gallery's Curiosities tab. It needs
 * the Vite dev server, because the fixture is imported from
 * `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-curiosities-review-v7.ts http://localhost:6173/
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
type Look = "default" | "classic" | "legacy";
type ScreenSize = "desktop" | "phone";
interface Coord {
  readonly x: number;
  readonly y: number;
}
type Fixture =
  | "curiositiesUiFixtureV7"
  | "curiositiesWoundedSpiderFixtureV7"
  | "curiositiesCalmFixtureV7";

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "curiosities-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-curiosities-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_860 + (process.pid % 80);
const userData = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-curiosities-ui-"),
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
const REVIEW = "globalThis.__CURIOSITIES_REVIEW__";
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
  for (const look of ["default", "classic", "legacy"] as const)
    for (const size of ["desktop", "phone"] as const) {
      const suffix = `${look}-${size}`;
      await viewport(connection, size);
      // The calm Spider on its web.
      await mount(connection, look, "curiositiesCalmFixtureV7");
      let at = await coords(connection);
      await zoomTo(connection, 80);
      await frame(connection, at.spider as Coord);
      await capture(connection, `spider-idle-${suffix}.png`);
      await crop(
        connection,
        `crop-spider-idle-${suffix}.png`,
        at.spider as Coord,
      );
      // Every curiosity on the board; the Spider provoked.
      await mount(connection, look, "curiositiesWoundedSpiderFixtureV7");
      at = await coords(connection);
      evidence[`${suffix}Pieces`] = await evaluate(
        connection,
        `(async () => {
          const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
          return buildBoardRenderPlanV7(${REVIEW}.snapshotView(), [], { selection: null, selectedUnitId: null, selectedAchievement: null })
            .entries.filter((entry) => entry.kind === 'CURIOSITY' || entry.monster !== undefined)
            .map((entry) => entry.artSubject + (entry.monster?.provoked ? ':provoked' : ''));
        })()`,
        true,
      );
      for (const [zoom, tile] of [
        ["1", 80],
        ["0.75", 60],
      ] as const) {
        await zoomTo(connection, tile);
        await frame(connection, at.spider as Coord);
        await capture(connection, `board-${suffix}-zoom-${zoom}.png`);
        for (const [name, where] of [
          ["spider-provoked", at.spider],
          ["fountain", at.fountain],
          ["shrine", at.shrine],
          ["wreck", at.wreck],
        ] as const) {
          await frame(connection, where as Coord);
          await crop(
            connection,
            `crop-${name}-${suffix}-zoom-${zoom}.png`,
            where as Coord,
          );
        }
      }
      await zoomTo(connection, 80);
      // The Spider's dock: its area outlined, its reach shaded.
      await activate(connection, at.spider as Coord);
      evidence[`${suffix}SpiderDock`] = await dockText(connection);
      await capture(connection, `spider-dock-${suffix}.png`);
      await click(connection, '[data-action="unit-help"]');
      await capture(connection, `spider-dialog-${suffix}.png`);
      await click(connection, '[data-action="close-unit-help"]');
      await deselect(connection);
      // A Knight's Moves next to the Spider carry the provoked marker.
      await activate(connection, at.knight as Coord);
      await capture(connection, `provoke-warning-${suffix}.png`);
      await deselect(connection);
      // The attack preview says the spider will strike back.
      await activate(connection, at.bait as Coord);
      await capture(connection, `attack-preview-${suffix}.png`);
      await deselect(connection);
      // Each curiosity tile's dock.
      for (const [name, where] of [
        ["shrine", at.shrine],
        ["wreck", at.wreck],
      ] as const) {
        await activate(connection, where as Coord);
        evidence[`${suffix}${name}Dock`] = await dockText(connection);
        await capture(connection, `${name}-dock-${suffix}.png`);
        await deselect(connection);
      }
      // The four effects, pinned mid-animation.
      await frame(connection, at.knight as Coord);
      const pins = `${REVIEW}.boardHost.pinSupportFeedback([
          { effect: 'FOUNTAIN', actor: { unitId: null, at: ${JSON.stringify(at.fountain)}, amount: 7 }, recipients: [], progress: 0.45 },
          { effect: 'BLESSING', actor: { unitId: null, at: ${JSON.stringify(at.pilgrim)} }, recipients: [], progress: 0.45 },
          { effect: 'SALVAGE', actor: { unitId: null, at: ${JSON.stringify(at.knight)}, amount: 8 }, recipients: [], progress: 0.45 },
          { effect: 'BOUNTY', actor: { unitId: null, at: ${JSON.stringify(at.spider)}, amount: 10 }, recipients: [], progress: 0.45 },
        ])`;
      // The first draw starts the sprites' loads; the second draws them.
      await evaluate(connection, pins);
      await delay(700);
      await evaluate(connection, pins);
      await delay(200);
      await capture(connection, `effects-${suffix}.png`);
      for (const [name, where] of [
        ["fountain-heal", at.fountain],
        ["shrine-blessing", at.pilgrim],
        ["salvage-coins", at.knight],
        ["bounty", at.spider],
      ] as const)
        await crop(
          connection,
          `crop-effect-${name}-${suffix}.png`,
          where as Coord,
        );
      await evaluate(connection, `${REVIEW}.boardHost.pinSupportFeedback([])`);
      // A Shrine claim: the Fighter steps onto it and is Promoted.
      await activate(connection, at.pilgrim as Coord);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.shrine)})`,
      );
      await delay(450);
      await capture(connection, `shrine-claim-${suffix}.png`);
      await delay(1_200);
      evidence[`${suffix}ShrineNotice`] = await notice(connection);
      await deselect(connection);
      // The neutral turn: the Spider attacks, regenerates; the Fountain
      // heals the next seat's unit.
      await evaluate(
        connection,
        `document.querySelector('[data-action="end-turn"]')?.click()`,
      );
      for (const [index, wait] of [
        30, 60, 80, 120, 200, 300, 400, 500,
      ].entries()) {
        await delay(wait);
        await capture(connection, `neutral-turn-${suffix}-${index + 1}.png`);
      }
      await delay(1_500);
      evidence[`${suffix}NeutralNotice`] = await notice(connection);
      evidence[`${suffix}Traces`] = await evaluate(
        connection,
        `${REVIEW}.traces.map((trace) => trace.command.kind + ':' + trace.eventKinds.filter((kind) => /NEUTRAL|FOUNTAIN|SHRINE|MONSTER|WRECK/.test(kind)).join('+'))`,
      );
      await capture(connection, `neutral-turn-${suffix}-after.png`);
      // Help: the Curiosities section.
      await click(connection, '[data-action="compact-menu"]');
      await click(connection, '[data-action="help"]');
      await evaluate(
        connection,
        `document.querySelector('.v7-help-curiosities')?.scrollIntoView({ block: 'center' })`,
      );
      await delay(300);
      evidence[`${suffix}Help`] = await evaluate(
        connection,
        `Array.from(document.querySelectorAll('.v7-help-curiosities li')).map((node) => node.textContent)`,
      );
      await capture(connection, `help-${suffix}.png`);
    }
  // The setup screen's checkbox and the Gallery's Curiosities tab.
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    await navigate(connection, url({ art: "chibi" }));
    await waitFor(
      connection,
      `document.querySelector('[data-v7-setup]') !== null`,
    );
    await evaluate(
      connection,
      `document.querySelector('.v7-curiosities-choice')?.scrollIntoView({ block: 'center' })`,
    );
    await delay(300);
    evidence[`setup-${size}`] = await evaluate(
      connection,
      `(() => { const box = document.querySelector('#v7-curiosities').getBoundingClientRect(); const label = document.querySelector('.v7-curiosities-choice').getBoundingClientRect(); return { box: [Math.round(box.width), Math.round(box.height)], label: [Math.round(label.width), Math.round(label.height)], sameRow: box.top >= label.top && box.bottom <= label.bottom }; })()`,
    );
    await capture(connection, `setup-checkbox-${size}.png`);
    await click(connection, '[data-action="gallery"]');
    await waitFor(
      connection,
      `document.querySelector('[data-v7-gallery] .v7-gallery-table') !== null`,
    );
    await click(connection, '[data-action="gallery-tab-curiosities"]');
    await waitFor(
      connection,
      `document.querySelectorAll('.v7-gallery-curiosities .v7-gallery-tile').length === 5 && [...document.querySelectorAll('.v7-gallery-curiosities .v7-gallery-tile')].every((tile) => tile.dataset.state === 'ready')`,
    );
    await capture(connection, `gallery-curiosities-${size}.png`);
    await click(
      connection,
      '.v7-gallery-curiosities .v7-gallery-cell[data-row="SPIDER"]',
    );
    await delay(600);
    await capture(connection, `gallery-spider-${size}.png`);
    await click(connection, '[data-action="gallery-next-row"]');
    await click(connection, '[data-action="gallery-next-row"]');
    await delay(600);
    await capture(connection, `gallery-fountain-${size}.png`);
  }
  for (const key of ["default-desktop", "legacy-phone"]) {
    const pieces = JSON.stringify(
      [...((evidence[`${key}Pieces`] as string[] | undefined) ?? [])].sort(),
    );
    const expected = JSON.stringify(
      [
        "CURIOSITY:FOUNTAIN",
        "CURIOSITY:SHRINE",
        "CURIOSITY:WEB",
        "CURIOSITY:WRECK",
        "UNIT:MONSTER_GIANT_SPIDER:provoked",
      ].sort(),
    );
    if (pieces !== expected)
      throw new Error(`Unexpected curiosity pieces (${key}): ${pieces}`);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Curiosities UI review captured in ${output.directory}`);
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
  await evaluate(
    connection,
    look === "classic"
      ? `localStorage.setItem('${CLASSIC_KEY}', JSON.stringify({ classic: true }))`
      : `localStorage.removeItem('${CLASSIC_KEY}')`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-curiosities-ui.ts",
      fixture,
      artSet: art === "chibi" ? "CHIBI" : "LEGACY",
      global: "__CURIOSITIES_REVIEW__",
      extras: "at: fixtures.CURIOSITIES_UI_V7",
      settingsStorage: "localStorage",
    }),
    true,
  );
  await delay(1_500);
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
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent), info: Array.from(dock.querySelectorAll('.v7-curiosity-info, [data-curiosity-info]')).map((node) => node.textContent) }; })()`,
  );
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    ArrowUp: 38,
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
  await evaluate(connection, `globalThis.__CURIOSITIES_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__CURIOSITIES_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
