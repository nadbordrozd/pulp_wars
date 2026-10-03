import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Rift visual review (bead pulp_wars-9s0.5, docs/product/RULESET_7_RIFT.md
 * section 8). On the Rift UI fixture (a horizontal Rift with a Saucer over
 * it, a vertical Rift with a Mothership over it, Forest and Mountain beside
 * them) it captures the board at zoom steps 1 and 0.75, the Saucer's
 * movement reach over the crack, and the selected Rift tile's dock, in the
 * default look, the Classic look, and LEGACY, at desktop and phone widths.
 * It records the pieces the board planned and the dock text. It needs the
 * Vite dev server, because the fixture is imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-rift-review-v7.ts http://localhost:6173/
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

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "rift-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-rift-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_760 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-rift-ui-"));
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
const REVIEW = "globalThis.__RIFT_REVIEW__";
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
      await mount(connection, look);
      const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
        string,
        Coord | readonly Coord[]
      >;
      evidence[`${suffix}Pieces`] = await evaluate(
        connection,
        `(async () => {
          const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
          return buildBoardRenderPlanV7(${REVIEW}.snapshotView(), [], { selection: null, selectedUnitId: null, selectedAchievement: null })
            .entries.filter((entry) => entry.riftPiece !== undefined)
            .map((entry) => entry.at.x + ',' + entry.at.y + ':' + entry.artSubject);
        })()`,
        true,
      );
      // Selecting the Saucer frames the Rifts; Escape keeps the camera.
      await activate(connection, at.saucer as Coord);
      await deselect(connection);
      await capture(connection, `rift-board-${suffix}-zoom-1.png`);
      await zoomOut(connection);
      await capture(connection, `rift-board-${suffix}-zoom-0.75.png`);
      await zoomIn(connection);
      // The Saucer's reach over the crack.
      await activate(connection, at.saucer as Coord);
      evidence[`${suffix}SaucerDock`] = await dockText(connection);
      await capture(connection, `rift-saucer-reach-${suffix}.png`);
      await deselect(connection);
      // An empty Rift tile: the "Only flyers" chip.
      const empty = (at.horizontal as readonly Coord[])[2] as Coord;
      await activate(connection, empty);
      evidence[`${suffix}RiftDock`] = await dockText(connection);
      await capture(connection, `rift-tile-dock-${suffix}.png`);
      await deselect(connection);
    }
  const pieces = evidence["default-desktopPieces"];
  const expected = [
    "3,2:TERRAIN:RIFT_H_WEST",
    "4,2:TERRAIN:RIFT_H_MIDDLE",
    "5,2:TERRAIN:RIFT_H_EAST",
    "8,1:TERRAIN:RIFT_V_NORTH",
    "8,2:TERRAIN:RIFT_V_MIDDLE",
    "8,3:TERRAIN:RIFT_V_SOUTH",
  ];
  if (
    JSON.stringify([...((pieces as string[] | undefined) ?? [])].sort()) !==
    JSON.stringify(expected)
  )
    throw new Error(`Unexpected Rift pieces ${JSON.stringify(pieces)}`);
  const dock = JSON.stringify(evidence["default-desktopRiftDock"]);
  if (!dock.includes("Only flyers"))
    throw new Error(`The Rift dock lacks its chip: ${dock}`);
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Rift UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

async function mount(connection: Connection, look: Look): Promise<void> {
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
      module: "/tests/fixtures/v7-rift-ui.ts",
      fixture: "riftUiFixtureV7",
      artSet: art === "chibi" ? "CHIBI" : "LEGACY",
      global: "__RIFT_REVIEW__",
      extras: "at: fixtures.RIFT_UI_V7",
      settingsStorage: "localStorage",
    }),
    true,
  );
  await delay(1_500);
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function zoomOut(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="zoom-out"]')?.click()`,
  );
  await delay(500);
}

async function zoomIn(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="zoom-in"]')?.click()`,
  );
  await delay(500);
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
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent + (node.getAttribute('title') ? ' (' + node.getAttribute('title') + ')' : '')) }; })()`,
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
  await evaluate(connection, `globalThis.__RIFT_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__RIFT_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
