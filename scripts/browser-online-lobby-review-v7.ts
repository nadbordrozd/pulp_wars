import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

/**
 * Online lobby browser check (bead pulp_wars-eqc6.2). Two tabs of one
 * headless Chrome (muted, the game's sound and music off) play each other
 * on the two-tab local transport of the development server, with no
 * network: the host opens Play online and hosts, the guest opens the share
 * link and joins with one tap (typing a name), changes its faction, the
 * host opens Settings and adds AI seats, and starts. A third tab tries
 * Join with code (an unknown code, then the full lobby). Each step is
 * captured at desktop (1280 x 800) and phone (390 x 844) widths. No match
 * is played: the run ends at the hand-off ("Game on!").
 *
 * Usage: tsx scripts/browser-online-lobby-review-v7.ts http://localhost:6173/
 *   [--output-dir=<dir>]
 * `CHROME_PATH` names the browser (the macOS Chrome by default).
 */

interface DebugTarget {
  readonly id: string;
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

const args = process.argv.slice(2);
const base = args.find((argument) => !argument.startsWith("--"));
if (base === undefined) throw new Error("Pass the dev server's address.");
const outputDirectory =
  args
    .find((argument) => argument.startsWith("--output-dir="))
    ?.slice("--output-dir=".length) ??
  (await mkdtemp(path.join(tmpdir(), "pulp-wars-online-lobby-")));
await mkdir(outputDirectory, { recursive: true });
const chrome =
  process.env.CHROME_PATH ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].find((candidate) => existsSync(candidate)) ??
  "google-chrome";
const port = 11_220 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-online-ui-"));
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
    "--window-size=1280,800",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const errors: string[] = [];
const shots: string[] = [];

const DESKTOP = { width: 1280, height: 800, mobile: false, scale: 1 };
const PHONE = { width: 390, height: 844, mobile: true, scale: 2 };

try {
  await waitForTarget();
  const host = await openTab();
  // The game's sound and music stay off; the host has a saved name and the
  // guest none (the storage is the origin's, shared by the tabs).
  await host.send("Page.navigate", { url: base });
  await waitFor(host, "document.readyState === 'complete'");
  await evaluate(
    host,
    `localStorage.clear();
     localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 }));
     localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 }));
     localStorage.setItem('pulpWars.online.name.v1', 'Ada');
     sessionStorage.clear();`,
  );
  await reload(host);
  await setSize(host, DESKTOP);
  await waitFor(
    host,
    `!!document.querySelector('[data-action="play-online"]')`,
  );
  await capture(host, "01-host-menu-desktop");
  await click(host, "play-online");
  await waitFor(
    host,
    `document.querySelector('.v7-online')?.dataset.screen === 'home'`,
  );
  await capture(host, "02-host-play-online-desktop");
  await setSize(host, PHONE);
  await capture(host, "03-host-play-online-phone");
  await setSize(host, DESKTOP);
  await click(host, "online-host");
  await waitFor(
    host,
    `document.querySelector('.v7-online')?.dataset.screen === 'lobby'`,
  );
  const code = (await evaluate(
    host,
    `document.querySelector('.v7-online-code').textContent`,
  )) as string;
  const link = (await evaluate(
    host,
    `document.querySelector('.v7-online-link').dataset.link`,
  )) as string;
  await capture(host, "04-host-lobby-waiting-desktop");
  await click(host, "online-copy-link");
  await delay(200);
  await capture(host, "05-host-lobby-copied-desktop");

  // The guest: a new tab opening the share link, no name saved.
  await evaluate(host, `localStorage.removeItem('pulpWars.online.name.v1')`);
  const guest = await openTab();
  await setSize(guest, DESKTOP);
  await guest.send("Page.navigate", { url: link });
  await waitFor(
    guest,
    `document.querySelector('.v7-online')?.dataset.screen === 'preview'`,
  );
  await capture(guest, "06-guest-link-preview-desktop");
  await setSize(guest, PHONE);
  await capture(guest, "07-guest-link-preview-phone");
  await evaluate(
    guest,
    `(() => { const field = document.querySelector('#v7-online-name'); field.value = 'Bob'; field.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await click(guest, "online-join-lobby");
  await waitFor(
    guest,
    `document.querySelector('.v7-online')?.dataset.screen === 'lobby'`,
  );
  await choose(guest, "v7-online-pick", "GOBLIN");
  await waitFor(
    host,
    `document.querySelector('.v7-online-seat[data-seat="1"]')?.dataset.pick === 'GOBLIN'`,
    100,
  );
  await capture(guest, "08-guest-lobby-phone");
  await setSize(guest, DESKTOP);
  await capture(guest, "09-guest-lobby-desktop");
  await capture(host, "10-host-lobby-guest-seated-desktop");
  await click(host, "online-settings");
  await click(host, "online-ai-2");
  await waitFor(
    guest,
    `document.querySelectorAll('.v7-online-seat[data-ai="true"]').length === 2`,
    100,
  );
  await capture(host, "11-host-lobby-settings-desktop");
  await setSize(host, PHONE);
  await capture(host, "12-host-lobby-settings-phone", true);
  await capture(guest, "13-guest-lobby-live-settings-desktop");

  // A third player: Join with code.
  const third = await openTab();
  await setSize(third, PHONE);
  await third.send("Page.navigate", { url: base });
  await waitFor(
    third,
    `!!document.querySelector('[data-action="play-online"]')`,
  );
  await click(third, "play-online");
  await waitFor(
    third,
    `document.querySelector('.v7-online')?.dataset.screen === 'home'`,
  );
  await evaluate(
    third,
    `(() => { const field = document.querySelector('#v7-online-name'); if (field) field.value = 'Cy'; const code = document.querySelector('#v7-online-code'); code.value = 'zz zzz'; code.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await capture(third, "14-third-join-with-code-phone");
  await click(third, "online-join");
  await waitFor(
    third,
    `document.querySelector('.v7-online-message')?.dataset.code === 'NOT_FOUND'`,
  );
  await capture(third, "15-third-error-not-found-phone");
  await evaluate(
    third,
    `(() => { const code = document.querySelector('#v7-online-code'); code.value = ${JSON.stringify(link)}; code.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
  await click(third, "online-join");
  await waitFor(
    third,
    `document.querySelector('.v7-online-message')?.dataset.code === 'SEAT_TAKEN'`,
  );
  await capture(third, "16-third-error-seat-taken-phone");

  // Start: both tabs reach the hand-off.
  await setSize(host, DESKTOP);
  await click(host, "online-start");
  await waitFor(
    host,
    `document.querySelector('.v7-online')?.dataset.screen === 'started'`,
    150,
  );
  await waitFor(
    guest,
    `document.querySelector('.v7-online')?.dataset.screen === 'started'`,
    150,
  );
  await capture(host, "17-host-started-desktop");
  await capture(guest, "18-guest-started-desktop");
  const summary = {
    code,
    link,
    shots,
    errors,
  };
  await writeFile(
    path.join(outputDirectory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  if (errors.length > 0) process.exitCode = 1;
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true }).catch(() => undefined);
}

// ---------------------------------------------------------------------

async function openTab(): Promise<Connection> {
  const created = await fetch(`http://localhost:${port}/json/new?about:blank`, {
    method: "PUT",
  });
  const target = (await created.json()) as DebugTarget;
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params).slice(0, 600));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  return connection;
}

async function reload(connection: Connection): Promise<void> {
  await evaluate(connection, `globalThis.__ONLINE_REVIEW_PRIOR__ = true`);
  await connection.send("Page.reload", {});
  await waitFor(
    connection,
    `globalThis.__ONLINE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
}

async function setSize(
  connection: Connection,
  size: typeof DESKTOP | typeof PHONE,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: size.width,
    height: size.height,
    deviceScaleFactor: size.scale,
    mobile: size.mobile,
  });
  await delay(300);
}

async function click(connection: Connection, action: string): Promise<void> {
  const clicked = await evaluate(
    connection,
    `(() => { const node = document.querySelector('[data-action="${action}"]'); if (!node || node.disabled) return false; node.click(); return true; })()`,
  );
  if (clicked !== true) throw new Error(`Could not press ${action}`);
  await delay(150);
}

async function choose(
  connection: Connection,
  id: string,
  value: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const select = document.getElementById(${JSON.stringify(id)}); select.value = ${JSON.stringify(value)}; select.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  );
  await delay(150);
}

async function capture(
  connection: Connection,
  name: string,
  full = false,
): Promise<void> {
  await delay(250);
  let clip: object | undefined;
  if (full) {
    const metrics = (await connection.send("Page.getLayoutMetrics")) as {
      readonly cssContentSize: {
        readonly width: number;
        readonly height: number;
      };
    };
    clip = {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: Math.min(metrics.cssContentSize.height, 4_000),
      scale: 1,
    };
  }
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    ...(clip === undefined ? {} : { clip, captureBeyondViewport: true }),
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  const file = path.join(outputDirectory, `${name}.png`);
  await writeFile(file, Buffer.from(response.data, "base64"));
  shots.push(file);
}

async function evaluate(
  connection: Connection,
  expression: string,
): Promise<unknown> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: unknown };
    readonly exceptionDetails?: unknown;
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(JSON.stringify(response.exceptionDetails).slice(0, 800));
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

async function waitForTarget(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/list`);
      if (response.ok) return;
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
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out`));
        }, 30_000);
        pending.set(id, {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
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
