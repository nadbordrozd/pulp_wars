/**
 * Screenshots of the Gallery's Terrain tab (bead pulp_wars-2yc.48): the
 * menu's Gallery, its Terrain tab, the whole table, at a desktop and a
 * phone width. The Chrome it starts is headless and muted. No PixelLab
 * call, no match.
 *
 *   npx vite --host localhost --port 6593 --strictPort &
 *   CHROME_PATH=... npx tsx scripts/art/faction-grounds/gallery-capture.ts \
 *     <out-dir> <name> [http://localhost:6593/]
 *
 * Writes `<name>-desktop.png` and `<name>-phone.png`.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  close(): void;
}

async function connect(url: string): Promise<Connection> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP failed")), {
      once: true,
    });
  });
  let next = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(new Error(message.error.message ?? "CDP error"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = next;
      next += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => socket.close(),
  };
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as { result?: { value?: T }; exceptionDetails?: { text?: string } };
  if (response.exceptionDetails !== undefined)
    throw new Error(response.exceptionDetails.text ?? "evaluate failed");
  return response.result?.value as T;
}

async function waitFor(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (
      await evaluate<boolean>(connection, `Boolean(${expression})`).catch(
        () => false,
      )
    )
      return;
    await delay(50);
  }
  throw new Error(`timed out waiting for ${expression}`);
}

const click = (connection: Connection, action: string): Promise<boolean> =>
  evaluate(
    connection,
    `(() => { document.querySelector('[data-action="${action}"]').click(); return true; })()`,
  );

async function main(): Promise<void> {
  const [outArgument, name, base = "http://localhost:6593/"] =
    process.argv.slice(2);
  if (outArgument === undefined || name === undefined)
    throw new Error("usage: gallery-capture.ts <out-dir> <name> [url]");
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  const out = path.resolve(outArgument);
  await mkdir(out, { recursive: true });
  const port = 10_600 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "gallery-terrain-"));
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--mute-audio",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let attempt = 0; attempt < 150 && target === undefined; attempt += 1) {
      try {
        const targets = (await (
          await fetch(`http://localhost:${port}/json/list`)
        ).json()) as { type: string; webSocketDebuggerUrl: string }[];
        target = targets.find((item) => item.type === "page");
      } catch {
        // Chrome is still starting.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined) throw new Error("Chrome did not start");
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    for (const [viewport, width, height] of [
      ["desktop", 1440, 900],
      ["phone", 390, 844],
    ] as const) {
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await connection.send("Page.navigate", { url: base });
      await waitFor(
        connection,
        `document.readyState === 'complete' && document.querySelector('[data-action="gallery"]') !== null`,
      );
      await click(connection, "gallery");
      await waitFor(
        connection,
        `document.querySelector('[data-v7-gallery] .v7-gallery-table') !== null`,
      );
      await click(connection, "gallery-tab-terrain");
      await waitFor(
        connection,
        `document.querySelectorAll('.v7-gallery-tile').length > 0 && [...document.querySelectorAll('.v7-gallery-tile')].every((tile) => tile.dataset.state === 'ready')`,
      );
      await delay(800);
      // The whole table, not the first screen of it.
      const metrics = (await connection.send("Page.getLayoutMetrics")) as {
        cssContentSize: { width: number; height: number };
      };
      const result = (await connection.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: {
          x: 0,
          y: 0,
          width,
          height: Math.ceil(metrics.cssContentSize.height),
          scale: 1,
        },
      })) as { data: string };
      const file = path.join(out, `${name}-${viewport}.png`);
      await writeFile(file, Buffer.from(result.data, "base64"));
      console.log(`wrote ${file}`);
    }
    connection.close();
  } finally {
    browser.kill();
  }
}

await main();
