import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The Cult interface, UI review (bead `pulp_wars-mch9.17`,
 * docs/ui/BOARD_TARGETING.md section 3.7). The Cult is hidden from setup, so
 * this mounts the hand-built scenes of tests/fixtures/v7-cult-ui.ts (no
 * match is played) and captures, at desktop (1440 x 1000), phone (390 x 844)
 * and narrow phone (320 x 640) widths in the CHIBI art set: the Favour chip
 * in the HUD, the Summoner's Sacrifice and Seize buttons, each aimed on the
 * board with its marks and labels, the Offering in the city panel, the
 * leaderboard with a Cult seat's Favour (as the Cult player and as its
 * rival), the candles in flight after a Seizure, and the Cult's hue beside
 * the Plague chip and the owned-technology tint. `evidence.json` records
 * each capture's texts and whether anything overflows the viewport. It needs
 * the Vite dev server, because the fixtures are imported from
 * `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-cult-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>] [--only=hud,seize]
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
interface Coord {
  readonly x: number;
  readonly y: number;
}
type Size = "desktop" | "phone" | "narrow";

const SIZES: Readonly<
  Record<
    Size,
    {
      readonly width: number;
      readonly height: number;
      readonly deviceScaleFactor: number;
      readonly mobile: boolean;
    }
  >
> = {
  desktop: { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false },
  phone: { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  narrow: { width: 320, height: 640, deviceScaleFactor: 2, mobile: true },
};

const args = process.argv.slice(2);
const baseUrl = new URL(
  args.find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const only = args
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",");
const wanted = (scene: string): boolean =>
  only === undefined || only.includes(scene);
const output = await prepareSmokeOutput({
  args: args.filter((argument) => !argument.startsWith("--only=")),
  name: "cult-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-cult-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_660 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-cult-ui-"));
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
const REVIEW = "globalThis.__CULT_REVIEW__";
/** The Cult capital of the fixture field (tests/fixtures/v7-cult.ts). */
const CAPITAL: Coord = { x: 8, y: 8 };

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const size of ["desktop", "phone", "narrow"] as const) {
    await viewport(connection, size);
    if (wanted("hud")) await hud(connection, size);
    if (wanted("sacrifice")) await aim(connection, size, "sacrifice");
    if (wanted("seize")) await aim(connection, size, "seize");
    if (wanted("offering")) await offering(connection, size);
    if (wanted("leaderboard")) await leaderboard(connection, size);
    if (wanted("flight")) await flight(connection, size);
  }
  if (wanted("colour")) {
    await viewport(connection, "desktop");
    await colour(connection);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Cult UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** The page's texts of interest, and whether anything leaves the viewport. */
async function record(connection: Connection, key: string): Promise<void> {
  evidence[key] = await evaluate(
    connection,
    `(() => {
      const rect = (selector) => {
        const node = document.querySelector(selector);
        if (node === null) return null;
        const box = node.getBoundingClientRect();
        return { left: Math.round(box.left), right: Math.round(box.right), top: Math.round(box.top), bottom: Math.round(box.bottom) };
      };
      const outside = Array.from(document.querySelectorAll('.v7-match-hud *, .v7-selection-dock *, .v7-overlay *'))
        .filter((node) => { const box = node.getBoundingClientRect(); return box.width > 0 && (box.right > innerWidth + 0.5 || box.left < -0.5); })
        .map((node) => node.className?.toString?.() ?? node.tagName);
      return {
        viewport: [innerWidth, innerHeight],
        scrollWidth: document.documentElement.scrollWidth,
        overflowing: [...new Set(outside)],
        favour: document.querySelector('.v7-favour')?.getAttribute('aria-label') ?? null,
        favourShown: document.querySelector('.v7-favour-balance')?.textContent ?? null,
        favourRect: rect('.v7-favour'),
        coinsRect: rect('.v7-coins'),
        hudRows: new Set(Array.from(document.querySelectorAll('.v7-hud-stats > *')).map((node) => Math.round(node.getBoundingClientRect().top))).size,
        actions: Array.from(document.querySelectorAll('.v7-selection-dock .v7-context-action, .v7-selection-dock [data-action^="command-"]')).map((node) => node.getAttribute('aria-label') ?? node.textContent),
        chips: Array.from(document.querySelectorAll('.v7-selection-dock [data-cult="offering"] .v7-economy-chip')).map((node) => node.textContent),
        offeringRect: rect('.v7-selection-dock [data-cult="offering"]'),
        panel: document.querySelector('.v7-cult-pick')?.getAttribute('aria-label') ?? null,
        targets: document.querySelector('.v7-cult-pick')?.dataset.boardTargets ?? null,
        cursor: document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null,
        leaderboard: Array.from(document.querySelectorAll('.v7-leaderboard-row')).map((node) => node.textContent),
        notice: document.querySelector('#v7-live')?.textContent ?? null,
      };
    })()`,
  );
}

async function hud(connection: Connection, size: Size): Promise<void> {
  await mount(connection, "cultFavourUiFixtureV7");
  await record(connection, `${size}Hud`);
  await capture(connection, `hud-${size}.png`);
}

async function aim(
  connection: Connection,
  size: Size,
  kind: "sacrifice" | "seize",
): Promise<void> {
  const at = await mount(connection, "cultFavourUiFixtureV7");
  await activate(connection, at.summoner as Coord);
  if (kind === "sacrifice") {
    await record(connection, `${size}SummonerButtons`);
    await capture(connection, `summoner-buttons-${size}.png`);
  }
  await click(connection, `cult-${kind}`);
  // The keyboard's first target, so the cursor reads its sentence.
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Tab",
    code: "Tab",
    windowsVirtualKeyCode: 9,
  });
  await delay(500);
  await record(
    connection,
    `${size}${kind === "sacrifice" ? "Sacrifice" : "Seize"}Aim`,
  );
  await capture(connection, `${kind}-aim-${size}.png`);
  if (size === "desktop") {
    await evaluate(
      connection,
      `${REVIEW}.boardHost.zoom('IN'); ${REVIEW}.boardHost.zoom('IN')`,
    );
    await delay(600);
    await capture(connection, `${kind}-aim-zoom-${size}.png`);
  }
}

async function offering(connection: Connection, size: Size): Promise<void> {
  await mount(connection, "cultFavourUiFixtureV7");
  await selectCity(connection);
  await record(connection, `${size}Offering`);
  await capture(connection, `offering-${size}.png`);
  await click(connection, "command-offering");
  await delay(1_800);
  await record(connection, `${size}OfferingDone`);
  await capture(connection, `offering-done-${size}.png`);
}

async function leaderboard(connection: Connection, size: Size): Promise<void> {
  for (const [name, fixture] of [
    ["own", "cultFavourUiFixtureV7"],
    ["rival", "cultRivalUiFixtureV7"],
  ] as const) {
    await mount(connection, fixture);
    await evaluate(
      connection,
      `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', bubbles: true }))`,
    );
    await delay(700);
    await record(
      connection,
      `${size}Leaderboard${name === "own" ? "Own" : "Rival"}`,
    );
    await capture(connection, `leaderboard-${name}-${size}.png`);
  }
}

async function flight(connection: Connection, size: Size): Promise<void> {
  const at = await mount(connection, "cultFavourUiFixtureV7");
  await activate(connection, at.summoner as Coord);
  await click(connection, "cult-seize");
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.knight)})`,
  );
  // The candles are in the air between the victim's tile and the chip.
  for (const wait of [450, 450, 500]) {
    await delay(wait);
    evidence[`${size}Flight${Object.keys(evidence).length}`] = await evaluate(
      connection,
      `({ shown: document.querySelector('.v7-favour-balance')?.textContent ?? null, flying: Array.from(document.querySelectorAll('.v7-feedback-coin[data-purse="favour"]')).filter((node) => node.style.visibility === 'visible').length })`,
    );
    await capture(
      connection,
      `seize-flight-${Object.keys(evidence).length}-${size}.png`,
    );
  }
  await delay(2_500);
  await record(connection, `${size}FlightLanded`);
  await capture(connection, `seize-landed-${size}.png`);
}

/**
 * The Cult's hue beside its neighbours (docs/art/factions/CULT.md): the
 * Favour chip in emerald and in the fallback indigo, the Plague chip's
 * green and the owned-technology teal, as chips on the dock's plate.
 */
async function colour(connection: Connection): Promise<void> {
  await mount(connection, "cultFavourUiFixtureV7");
  await evaluate(
    connection,
    `(() => {
      const shell = document.querySelector('.v7-app-shell');
      const strip = document.createElement('div');
      strip.style.cssText = 'position:absolute;z-index:99;left:24px;top:120px;display:flex;gap:14px;align-items:center;padding:18px;background:var(--pw-dock);border:3px solid var(--pw-line);font:800 18px var(--pw-ui)';
      const chip = (label, ink, fill) => {
        const node = document.createElement('span');
        node.textContent = label;
        node.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border:2px solid var(--pw-line);border-radius:4px;color:' + ink + ';background:' + fill;
        const candle = document.querySelector('.v7-favour .v7-favour-icon')?.cloneNode(true);
        if (candle) { candle.style.color = ink; candle.style.width = '24px'; candle.style.height = '24px'; node.prepend(candle); }
        strip.append(node);
      };
      chip('12 emerald', 'var(--pw-emerald)', 'var(--pw-emerald-fill)');
      chip('12 indigo', '#2e3382', '#dcdff7');
      chip('Plague green', 'var(--pw-green)', 'var(--pw-green-fill)');
      chip('Owned teal', 'var(--pw-teal)', 'var(--pw-teal-fill)');
      chip('Gain', 'var(--pw-gain)', 'var(--pw-surface)');
      shell.append(strip);
    })()`,
  );
  await delay(300);
  await capture(connection, `colour-compare-desktop.png`);
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
  fixture: string,
): Promise<Record<string, Coord>> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-cult-ui.ts",
      fixture,
      artSet: "CHIBI",
      global: "__CULT_REVIEW__",
      extras: "at: fixtures.CULT_UI_V7",
    }),
    true,
  );
  await delay(1_200);
  return (await evaluate(connection, `${REVIEW}.at`)) as Record<string, Coord>;
}

async function click(connection: Connection, action: string): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="${action}"]')?.click()`,
  );
  await delay(600);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await delay(600);
}

/** The city panel of the Cult capital. */
async function selectCity(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(CAPITAL)}); })()`,
  );
  await delay(500);
  const kind = await evaluate(
    connection,
    `document.querySelector('.v7-selection-dock')?.dataset.selectionKind ?? null`,
  );
  if (kind !== "city") {
    await evaluate(
      connection,
      `${REVIEW}.boardHost.activate(${JSON.stringify(CAPITAL)})`,
    );
    await delay(500);
  }
}

async function viewport(connection: Connection, size: Size): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", SIZES[size]);
  await delay(300);
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(connection, `globalThis.__CULT_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__CULT_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
