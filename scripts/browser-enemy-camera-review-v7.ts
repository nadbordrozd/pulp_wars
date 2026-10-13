import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

interface DebugTarget {
  readonly type: string;
  readonly url: string;
  readonly webSocketDebuggerUrl: string;
}
interface ProtocolMessage {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

/**
 * Calm playback review (bead pulp_wars-2yc.49): the real board host in
 * muted headless Chrome plays a hand-built list of another player's moves
 * (no match is played): a cluster of moves in one corner, then one far
 * away. The presentation clock is stepped 16 ms at a time and the camera
 * is recorded at every frame into `trace.json`, with screenshots of the
 * cluster, the glide and the far move. It fails unless the camera moves
 * only in its two glides and every step starts after its glide has ended.
 *
 *   CHROME_PATH=... tsx scripts/browser-enemy-camera-review-v7.ts \
 *     http://localhost:<port>/?ruleset=7 --output=<dir> [--phone]
 */
const baseUrl =
  process.argv.find((arg) => arg.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const outputRoot = path.resolve(
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
    "/tmp/pulp-wars-calm-playback-review",
);
const phone = process.argv.includes("--phone");
const viewport = phone
  ? { width: 390, height: 844 }
  : { width: 1280, height: 900 };
/** The smallest tile the review plays at, so the board does not fit. */
const minimumTileCssPx = phone ? 80 : 150;
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to the review headless browser");
const port = 10500 + (process.pid % 100);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--mute-audio",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.env.TMPDIR ?? "/tmp", `pulp-wars-camera-${process.pid}`)}`,
    `--window-size=${viewport.width},${viewport.height}`,
    baseUrl,
  ],
  { stdio: "ignore" },
);

interface Sample {
  readonly t: number;
  readonly boundary: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly tileCssPx: number;
  /** The steps announced so far in this boundary (a step has started). */
  readonly started: number;
  readonly done: boolean;
}

/** The units of the hand-built view: four in a cluster and one far away. */
const UNITS = [
  { id: 201, at: { x: 2, y: 2 } },
  { id: 202, at: { x: 3, y: 4 } },
  { id: 203, at: { x: 2, y: 5 } },
  { id: 204, at: { x: 4, y: 3 } },
  { id: 205, at: { x: 8, y: 9 } },
];
/**
 * One boundary each: the unit and the tiles it enters. The cluster keeps
 * to three columns, which fit the comfort zone at phone width too.
 */
const MOVES = [
  {
    unitId: 201,
    path: [
      { x: 3, y: 2 },
      { x: 4, y: 2 },
    ],
  },
  { unitId: 202, path: [{ x: 3, y: 5 }] },
  {
    unitId: 203,
    path: [
      { x: 2, y: 4 },
      { x: 2, y: 3 },
    ],
  },
  { unitId: 204, path: [{ x: 4, y: 4 }] },
  { unitId: 201, path: [{ x: 4, y: 3 }] },
  {
    unitId: 205,
    path: [
      { x: 9, y: 9 },
      { x: 9, y: 10 },
    ],
  },
  { unitId: 205, path: [{ x: 8, y: 10 }] },
];
/** The first boundary of the unit far away. */
const FAR = 5;

try {
  await mkdir(outputRoot, { recursive: true });
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    ...viewport,
    deviceScaleFactor: 1,
    mobile: phone,
  });
  await waitFor(connection, "document.querySelector('#app') !== null");
  await evaluate(
    connection,
    `(async () => {
    globalThis.__PULP_WARS_APP__?.destroy?.();
    const { enemyCameraFixtureV7 } = await import('/tests/fixtures/ruleset7-enemy-camera.ts');
    const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
    // The board alone: the app's own screens are taken off the page.
    const root = document.createElement('div');
    document.body.replaceChildren(root);
    root.style.cssText = 'position:fixed;inset:0;width:${viewport.width}px;height:${viewport.height}px';
    let now = 0, nextFrame = 1, done = true, started = 0, boundary = -1;
    const frames = new Map();
    window.requestAnimationFrame = (callback) => { const id = nextFrame++; frames.set(id, callback); return id; };
    window.cancelAnimationFrame = (id) => frames.delete(id);
    Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
    const fixture = enemyCameraFixtureV7('visible-move');
    const unit = fixture.before.units[0];
    const UNITS = ${JSON.stringify(UNITS)};
    const MOVES = ${JSON.stringify(MOVES)};
    // The hand-built list: one boundary a move, each on the view before it.
    const views = [{ ...fixture.before, units: UNITS.map((entry) => ({ ...unit, ...entry })) }];
    const boundaries = MOVES.map((move, index) => {
      const before = views[index];
      const after = { ...before, units: before.units.map((entry) => entry.id === move.unitId ? { ...entry, at: move.path.at(-1) } : entry) };
      views.push(after);
      return { before, after, events: { ...fixture.events, commandIndex: fixture.events.commandIndex + index, events: [{ kind: 'UNIT_MOVED', unitId: move.unitId, path: move.path }] } };
    });
    const host = new CanvasBoardHostV7(document);
    host.mount(root, { onSelection: () => {}, onCommand: () => {} });
    const viewer = fixture.before.viewer.id;
    const model = (view, own) => ({ matchInstanceId: 'calm-playback', view: own ? { ...view, activeSeatIndex: view.turnOrder.indexOf(viewer) } : view, offeredCommands: [], interactive: false, motion: 'FULL', animationSpeed: 'NORMAL', presentationPaused: false, highContrast: false, interaction: { selection: null, selectedUnitId: null, selectedAchievement: null } });
    // The zoom is the player's, set in the player's own turn.
    host.update(model(views[0], true));
    const tile = () => host.cellCentreCssPx({ x: 1, y: 0 }).x - host.cellCentreCssPx({ x: 0, y: 0 }).x;
    for (let i = 0; i < 4 && tile() < ${minimumTileCssPx}; i++) host.zoom('IN');
    host.update(model(views[0], false));
    host.setPresentationStepListener(() => { started += 1; });
    const sample = () => { const origin = host.cellCentreCssPx({ x: 0, y: 0 }); return { t: now, boundary, offsetX: origin.x, offsetY: origin.y, tileCssPx: tile(), started, done }; };
    globalThis.__CAMERA_REVIEW__ = {
      sample,
      // The AI thinks for a moment between two commands.
      think: (milliseconds) => { now += milliseconds; },
      start: (index, queued) => {
        boundary = index; started = 0; done = false;
        const next = boundaries[index];
        host.presentBoundary(next.before, next.after, next.events, { upcoming: boundaries.slice(index + 1, index + 1 + queued) }).then(() => { done = true; host.update(model(next.after, false)); });
      },
      frame: async (milliseconds) => {
        now += milliseconds; const pending = [...frames.values()]; frames.clear();
        pending.forEach(callback => callback(now));
        for (let i = 0; i < 8; i++) await Promise.resolve();
        return sample();
      },
      destroy: () => host.destroy(),
    };
  })()`,
  );
  // Asset loading stays real; only the animation clock is controlled.
  await delay(1500);
  const trace: Sample[] = [];
  const marks: { readonly name: string; readonly t: number }[] = [];
  const shot = async (name: string, t: number): Promise<void> => {
    await capture(connection, name);
    marks.push({ name, t });
  };
  let last = await evaluate<Sample>(connection, "__CAMERA_REVIEW__.sample()");
  trace.push(last);
  await shot("0-before.png", last.t);
  let glideShot = false;
  for (const [index] of MOVES.entries()) {
    // Two boundaries are queued behind the first of the cluster, none
    // behind the others: the AI plays as it thinks.
    await evaluate(
      connection,
      `__CAMERA_REVIEW__.start(${index}, ${index === 0 ? 2 : 0})`,
    );
    const from = last;
    let startedBefore = 0;
    for (let frame = 0; frame < 400; frame += 1) {
      const next = await evaluate<Sample>(
        connection,
        "__CAMERA_REVIEW__.frame(16)",
      );
      const moved =
        next.offsetX !== last.offsetX || next.offsetY !== last.offsetY;
      // The move starts only after the camera has settled.
      assert(
        !(moved && startedBefore > 0),
        `Boundary ${index}: the camera moved after its step started`,
      );
      if (
        index === FAR &&
        !glideShot &&
        Math.hypot(next.offsetX - from.offsetX, next.offsetY - from.offsetY) >
          200
      ) {
        glideShot = true;
        await shot("2-glide-to-far-move.png", next.t);
      }
      trace.push(next);
      last = next;
      startedBefore = next.started;
      if (next.done) break;
    }
    assert(last.done, `Boundary ${index} did not finish`);
    const glided =
      last.offsetX !== from.offsetX || last.offsetY !== from.offsetY;
    // One glide to the cluster, one to the far move, and no other.
    assert(
      glided === (index === 0 || index === FAR),
      `Boundary ${index}: the camera ${glided ? "moved" : "did not move"}`,
    );
    if (index === 3) await shot("1-cluster-still.png", last.t);
    if (index === FAR) await shot("3-far-move.png", last.t);
    await evaluate(connection, "__CAMERA_REVIEW__.think(60)");
  }
  assert(glideShot, "The glide to the far move was never captured");
  const framesWithCameraMotion = trace.filter(
    (entry, index) =>
      index > 0 &&
      (entry.offsetX !== trace[index - 1]?.offsetX ||
        entry.offsetY !== trace[index - 1]?.offsetY),
  ).length;
  await writeFile(
    path.join(outputRoot, "trace.json"),
    `${JSON.stringify({
      setup:
        "HAND_BUILT_EVENT_LIST on the enemy-camera fixture's board; no match played",
      renderer:
        "CanvasBoardHostV7 with real Canvas/assets and a presentation clock stepped 16 ms a frame",
      viewport: { ...viewport, dpr: 1 },
      tileCssPx: last.tileCssPx,
      units: UNITS,
      moves: MOVES,
      farMoveBoundary: FAR,
      screenshots: marks,
      frames: trace.length,
      framesWithCameraMotion,
      totalMs: last.t,
      columns: ["t", "boundary", "offsetX", "offsetY", "stepsStarted", "done"],
      trace: trace.map((entry) => [
        entry.t,
        entry.boundary,
        Math.round(entry.offsetX * 100) / 100,
        Math.round(entry.offsetY * 100) / 100,
        entry.started,
        entry.done ? 1 : 0,
      ]),
    })}\n`,
  );
  await evaluate(connection, "__CAMERA_REVIEW__.destroy()");
  connection.close();
  console.log(`Calm playback browser review passed: ${outputRoot}`);
} finally {
  browser.kill();
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(
    path.join(outputRoot, name),
    Buffer.from(response.data, "base64"),
  );
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
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: {
      readonly exception?: { readonly description?: string };
      readonly text?: string;
    };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
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
  throw new Error(`Chrome timed out waiting for ${expression}`);
}
async function waitForTarget(
  debugPort: number,
  expectedUrl: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const found = targets.find(
          (candidate) =>
            candidate.type === "page" && candidate.url.startsWith(expectedUrl),
        );
        if (found !== undefined) return found;
      }
    } catch {
      /* Chrome startup */
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
    {
      readonly method: string;
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
    }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(
        new Error(
          `${request.method}: ${message.error.message ?? "CDP failed"}`,
        ),
      );
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { method, resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
