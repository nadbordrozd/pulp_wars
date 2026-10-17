/**
 * Captures the Cult's faction emblem (the Initiate's bust) where the game
 * shows it, for the review of the robed cultists' round 2 (bead
 * pulp_wars-mch9.54): the setup form with "Your faction" set to the
 * Cultists, and the Gallery's unit table. It opens the game in muted
 * headless Chrome against a running dev server and plays no match.
 *
 *   CHROME_PATH=… tsx scripts/art/cult-sprites-mch954/emblem-capture.ts \
 *     http://localhost:6191/ --out DIR
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

interface DebugTarget {
  readonly type: string;
  readonly webSocketDebuggerUrl: string;
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

const args = process.argv.slice(2);
const baseUrl = args.find((argument) => argument.startsWith("http"));
const outIndex = args.indexOf("--out");
const out = outIndex < 0 ? undefined : args[outIndex + 1];
if (baseUrl === undefined || out === undefined)
  throw new Error("usage: emblem-capture.ts <dev-server-url> --out DIR");
const chrome = process.env.CHROME_PATH;
if (chrome === undefined) throw new Error("CHROME_PATH is required");
const port = 11_340 + (process.pid % 60);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-cult-emblem-"));
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
    "--window-size=1280,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  await mkdir(out, { recursive: true });
  const connection = await connect(
    (await waitForTarget()).webSocketDebuggerUrl,
  );
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 2,
    mobile: false,
  });
  await connection.send("Page.navigate", { url: baseUrl });
  await waitFor(
    connection,
    `document.querySelector('[data-action="new-game"]') !== null`,
  );
  await evaluate(
    connection,
    `document.querySelector('[data-action="new-game"]').click()`,
  );
  await waitFor(connection, `document.querySelector('#v7-faction-0') !== null`);
  await evaluate(
    connection,
    `(() => { const field = document.querySelector('#v7-faction-0'); field.value = 'CULT'; field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  );
  await waitFor(
    connection,
    `document.querySelector('.v7-setup-seat[data-faction="CULT"] .v7-faction-emblem img, .v7-setup-seat[data-faction="CULT"] .v7-faction-emblem canvas') !== null`,
  );
  await delay(600);
  await capture(connection, path.join(out, "setup-form-emblem.png"));
  await connection.send("Page.navigate", { url: baseUrl });
  await waitFor(
    connection,
    `document.querySelector('[data-action="gallery"]') !== null`,
  );
  await evaluate(
    connection,
    `document.querySelector('[data-action="gallery"]').click()`,
  );
  await waitFor(
    connection,
    `document.querySelector('.v7-gallery-faction[data-faction="CULT"]') !== null`,
  );
  await evaluate(
    connection,
    `document.querySelector('.v7-gallery-faction[data-faction="CULT"]').scrollIntoView({ block: 'start', inline: 'center' })`,
  );
  await delay(800);
  await capture(connection, path.join(out, "gallery-cult.png"));
  connection.close();
  console.log(`wrote ${out}`);
} finally {
  browser.kill();
  await rm(userData, { recursive: true, force: true }).catch(() => undefined);
}

async function capture(connection: Connection, file: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  await writeFile(file, Buffer.from(response.data, "base64"));
}

async function evaluate(
  connection: Connection,
  expression: string,
): Promise<unknown> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
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
): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
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
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      readonly id?: number;
      readonly result?: unknown;
      readonly error?: { readonly message?: string };
    };
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(new Error(message.error.message ?? "CDP failed"));
    else request.resolve(message.result);
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
    close: () => socket.close(),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
