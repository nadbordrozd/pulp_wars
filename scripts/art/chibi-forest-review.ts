/**
 * Composed-forest review (bead pulp_wars-maw.3,
 * docs/art/COMPOSED_FORESTS.md): matching screenshots of the real game (the
 * Ruleset 7 app view and board host, live CHIBI look) with every Forest cell
 * as its single clump ("before") and with the composed forests ("after").
 * Same state, same camera, same turn.
 *
 *   npx vite --port 6191 --strictPort &
 *   CHROME_PATH=... npx tsx scripts/art/chibi-forest-review.ts <out-dir>
 *   CHROME_PATH=... npx tsx scripts/art/chibi-forest-review.ts <out-dir> mountains
 *
 * Writes pairN-before.png, pairN-after.png and pairN-side-by-side.png for
 * the six scenes of scripts/art/chibi/forest-review-scenes.ts. No PixelLab
 * call. FOREST_PAIRS=1,3 limits the run to those pairs.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const OUT = path.resolve(process.argv[2] ?? "forest-review");
/** `mountains` as the second argument reviews the mountain ranges. */
const MOUNTAINS = process.argv[3] === "mountains";
const BASE = process.env.FOREST_GAME_URL ?? "http://localhost:6191/";
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface Scene {
  readonly pair: number;
  readonly fixture: string;
  /**
   * Zoom-in steps from the camera the host frames the explored area with
   * (step 0.75 on this board and viewport): 1 gives zoom 1, 2 gives 1.5.
   */
  readonly zoomIn: 0 | 1 | 2;
  /** A mouse drag of the board after zooming, in CSS px (pans the camera). */
  readonly drag?: readonly [number, number];
}

/** The mountain-range scenes (bead pulp_wars-e9f). */
const MOUNTAIN_SCENES: readonly Scene[] = [
  { pair: 1, fixture: "sceneM1", zoomIn: 1 },
  { pair: 2, fixture: "sceneM2", zoomIn: 1 },
  { pair: 3, fixture: "sceneM3", zoomIn: 1, drag: [-70, -80] },
  { pair: 4, fixture: "sceneM4", zoomIn: 0 },
  { pair: 5, fixture: "sceneM5", zoomIn: 1, drag: [-70, -80] },
  // Drawn blocks (bead pulp_wars-2o7.1): 2 x 3, 3 x 2, a column, a row.
  { pair: 6, fixture: "sceneM6", zoomIn: 1, drag: [120, 300] },
];

const FOREST_SCENES: readonly Scene[] = [
  { pair: 1, fixture: "sceneA", zoomIn: 2, drag: [190, 280] },
  { pair: 2, fixture: "sceneB", zoomIn: 1 },
  { pair: 3, fixture: "sceneC", zoomIn: 2, drag: [60, 250] },
  { pair: 4, fixture: "sceneD", zoomIn: 0 },
  { pair: 5, fixture: "sceneE", zoomIn: 1, drag: [0, 150] },
  { pair: 6, fixture: "sceneF", zoomIn: 1, drag: [0, 150] },
];

/**
 * Replaces the running app with the real Ruleset 7 app view over a fixed
 * state (a read-only controller), with or without the composed forests.
 */
function mountExpression(fixture: string, composed: boolean): string {
  // The forest review compares the single clumps with the composed forests
  // (mountains as they are); the mountain review compares the single
  // mountains with the ranges (forests composed in both).
  const options = MOUNTAINS
    ? `{ composedMountains: ${composed} }`
    : `{ composedForests: ${composed} }`;
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const scenes = await import('/scripts/art/chibi/forest-review-scenes.ts');
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
      const boardHost = new CanvasBoardHostV7(document, ${options});
      const view = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
      globalThis.__FOREST_REVIEW__ = { boardHost, view };
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
  scene: Scene,
  composedForests: boolean,
  file: string,
): Promise<void> {
  const url = new URL(BASE);
  url.searchParams.set("art", "chibi");
  await evaluate(connection, `globalThis.__FOREST_OLD__ = true`).catch(
    () => undefined,
  );
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__FOREST_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(connection, mountExpression(scene.fixture, composedForests));
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(400);
  for (let step = 0; step < scene.zoomIn; step += 1)
    await evaluate(
      connection,
      `globalThis.__FOREST_REVIEW__.boardHost.zoom('IN')`,
    );
  if (scene.drag !== undefined) {
    const from = { x: 720, y: 520 };
    const mouse = (type: string, x: number, y: number): Promise<unknown> =>
      connection.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: "left",
        buttons: type === "mouseReleased" ? 0 : 1,
        clickCount: 1,
      });
    await mouse("mousePressed", from.x, from.y);
    for (let step = 1; step <= 10; step += 1)
      await mouse(
        "mouseMoved",
        from.x + (scene.drag[0] * step) / 10,
        from.y + (scene.drag[1] * step) / 10,
      );
    await mouse(
      "mouseReleased",
      from.x + scene.drag[0],
      from.y + scene.drag[1],
    );
  }
  // Art loads asynchronously and redraws the board.
  await delay(2500);
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  await writeFile(file, Buffer.from(result.data, "base64"));
  console.log(`wrote ${file}`);
}

async function sideBySide(
  before: string,
  after: string,
  out: string,
): Promise<void> {
  const meta = await sharp(before).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const gap = 12;
  const head = 36;
  const caption = (text: string): Buffer =>
    Buffer.from(
      `<svg width="200" height="${head}"><text x="6" y="25" font-family="Helvetica" font-weight="700" font-size="20" fill="#f2f2ee">${text}</text></svg>`,
    );
  await sharp({
    create: {
      width: width * 2 + gap,
      height: height + head,
      channels: 4,
      background: { r: 20, g: 24, b: 26, alpha: 1 },
    },
  })
    .composite([
      { input: caption("BEFORE"), left: 0, top: 0 },
      { input: caption("AFTER"), left: width + gap, top: 0 },
      { input: before, left: 0, top: head },
      { input: after, left: width + gap, top: head },
    ])
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

async function main(): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  await mkdir(OUT, { recursive: true });
  const port = 10_500 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "forest-game-"));
  const browser = spawn(
    chrome,
    [
      "--headless=new",
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
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    const only = process.env.FOREST_PAIRS?.split(",").map(Number);
    for (const scene of MOUNTAINS ? MOUNTAIN_SCENES : FOREST_SCENES) {
      if (only !== undefined && !only.includes(scene.pair)) continue;
      const before = path.join(OUT, `pair${scene.pair}-before.png`);
      const after = path.join(OUT, `pair${scene.pair}-after.png`);
      await capture(connection, scene, false, before);
      await capture(connection, scene, true, after);
      await sideBySide(
        before,
        after,
        path.join(OUT, `pair${scene.pair}-side-by-side.png`),
      );
    }
    connection.close();
  } finally {
    browser.kill();
  }
}

await main();
