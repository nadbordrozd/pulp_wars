/**
 * Resource review (bead pulp_wars-2yc.16): screenshots of the real game (the
 * Ruleset 7 app view and board host, live CHIBI look) over the scenes of
 * scripts/art/chibi/resource-review-scenes.ts: Game on Forest in a
 * faction's forest and in the default Forest side by side, and Fish on
 * shallow and deep water.
 *
 *   npx vite --port 6741 --strictPort &
 *   CHROME_PATH=... npx tsx scripts/art/resource-review.ts <out-dir> [label]
 *
 * For every scene it writes `<label>-<scene>.png` (the board as framed by
 * the host, zoomed in once), `<label>-<scene>-forest-x3.png` and
 * `<label>-<scene>-fish-x3.png` (the wood and the sea of that screenshot
 * enlarged three times, nearest neighbour). No PixelLab call.
 * RESOURCE_SCENES=sceneHuman,sceneCandy limits the run.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve(process.argv[2] ?? "resource-review");
const LABEL = process.argv[3] ?? "review";
const BASE = process.env.RESOURCE_GAME_URL ?? "http://localhost:6741/";
const SCENES = ["sceneHuman", "sceneCandy", "sceneUndead", "sceneIceFolk"];
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Replaces the running app with the app view over a fixed state. */
function mountExpression(fixture: string): string {
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const scenes = await import('/scripts/art/chibi/resource-review-scenes.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      const state = scenes[${JSON.stringify(fixture)}]();
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscriber(snapshot()); return () => undefined; },
        subscribeAcceptedBoundary() { return () => undefined; },
        async dispatch() { return { accepted: false, reason: 'ENGINE_REJECTED', error: { code: 'FIXTURE', params: {} } }; },
        async launch() { throw new Error('fixture launch unavailable'); },
        async resume() { return true; },
        async returnToMenu() { return false; },
        async progressAiTurns() { return { ok: false, cancelled: true, acceptedCommands: 0, diagnostic: 'fixture' }; },
        async restart() { return { ok: false, code: 'CONTROLLER_DESTROYED', diagnostic: 'fixture' }; },
        async deleteStoredSave() { return false; },
        setFastForward() {},
        exportSafeLog() { return null; },
        exportDebugBundle() { return { ok: false, reason: 'NO_ACTIVE_MATCH' }; },
      };
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
      globalThis.__RESOURCE_REVIEW__ = { boardHost, view };
    })()`;
}

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
  })) as {
    result?: { value?: T };
    exceptionDetails?: { exception?: { description?: string }; text?: string };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "evaluate failed",
    );
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

async function capture(
  connection: Connection,
  fixture: string,
  file: string,
): Promise<void> {
  const url = new URL(BASE);
  url.searchParams.set("art", "chibi");
  await evaluate(connection, `globalThis.__RESOURCE_OLD__ = true`).catch(
    () => undefined,
  );
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__RESOURCE_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(connection, mountExpression(fixture));
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(400);
  await evaluate(
    connection,
    `globalThis.__RESOURCE_REVIEW__.boardHost.zoom('IN')`,
  );
  // Art loads asynchronously and redraws the board.
  await delay(2500);
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  await writeFile(file, Buffer.from(result.data, "base64"));
  console.log(`wrote ${file}`);
}

/** A region of a screenshot enlarged three times, nearest neighbour. */
async function enlarged(
  file: string,
  region: { left: number; top: number; width: number; height: number },
  out: string,
): Promise<void> {
  await sharp(file)
    .extract(region)
    .resize(region.width * 3, region.height * 3, { kernel: "nearest" })
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

async function main(): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  await mkdir(OUT, { recursive: true });
  const port = 10_600 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "resource-review-"));
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,1400",
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
        target = targets.find((t) => t.type === "page");
      } catch {
        // Chrome is still starting.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined) throw new Error("Chrome did not start");
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1400,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const only = process.env.RESOURCE_SCENES?.split(",");
    for (const scene of SCENES) {
      if (only !== undefined && !only.includes(scene)) continue;
      const name = scene.replace(/^scene/u, "").toLowerCase();
      const file = path.join(OUT, `${LABEL}-${name}.png`);
      await capture(connection, scene, file);
      const box = await evaluate<{
        left: number;
        top: number;
        width: number;
        height: number;
      }>(
        connection,
        `(() => { const r = document.querySelector('canvas.board-canvas-v7').getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; })()`,
      );
      // The wood is the upper two thirds of the board, the sea the rest.
      const left = Math.round(box.left + box.width * 0.2);
      const width = Math.round(box.width * 0.6);
      await enlarged(
        file,
        {
          left,
          top: Math.round(box.top),
          width,
          height: Math.round(box.height * 0.62),
        },
        path.join(OUT, `${LABEL}-${name}-forest-x3.png`),
      );
      await enlarged(
        file,
        {
          left,
          top: Math.round(box.top + box.height * 0.62),
          width,
          height: Math.round(box.height * 0.38),
        },
        path.join(OUT, `${LABEL}-${name}-fish-x3.png`),
      );
    }
    connection.close();
  } finally {
    browser.kill();
  }
}

await main();
