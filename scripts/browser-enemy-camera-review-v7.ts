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

const baseUrl =
  process.argv.find((arg) => arg.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const outputRoot = path.resolve(
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
    "/tmp/pulp-wars-bud-review",
);
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to the review headless browser");
const port = 10500 + (process.pid % 100);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.env.TMPDIR ?? "/tmp", `pulp-wars-camera-${process.pid}`)}`,
    "--window-size=1280,900",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  await mkdir(outputRoot, { recursive: true });
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(connection, "document.querySelector('#app') !== null");
  await evaluate(
    connection,
    `(async () => {
    globalThis.__PULP_WARS_APP__?.destroy?.();
    const { enemyCameraFixtureV7 } = await import('/tests/fixtures/ruleset7-enemy-camera.ts');
    const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
    const root = document.querySelector('#app');
    root.style.cssText = 'position:fixed;inset:0;width:1280px;height:900px';
    let host, fixture, model, now = 0, nextFrame = 1, done = false;
    const frames = new Map();
    const fill = CanvasRenderingContext2D.prototype.fillRect;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    let fillIndex = 0, camera = null, unitAnchor = null;
    CanvasRenderingContext2D.prototype.clearRect = function(...args) {
      if (this.canvas.classList.contains('board-canvas-v7')) { fillIndex = 0; unitAnchor = null; }
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.fillRect = function(x, y, width, height) {
      if (this.canvas.classList.contains('board-canvas-v7')) {
        // First fill is the background; the next is the (0,0) ground tile.
        if (++fillIndex === 2) camera = { offsetX: x + width / 2, offsetY: y + height / 2, zoom: width / 128 };
        if (this.fillStyle === '#65d889') unitAnchor = { x: x + 24 * camera.zoom, y: y - 26 * camera.zoom };
      }
      return fill.call(this, x, y, width, height);
    };
    window.requestAnimationFrame = (callback) => { const id = nextFrame++; frames.set(id, callback); return id; };
    window.cancelAnimationFrame = (id) => frames.delete(id);
    Object.defineProperty(performance, 'now', { configurable: true, value: () => now });
    const frame = async (milliseconds) => {
      now += milliseconds; const pending = [...frames.values()]; frames.clear();
      pending.forEach(callback => callback(now));
      for (let i = 0; i < 8; i++) await Promise.resolve();
    };
    globalThis.__CAMERA_REVIEW__ = {
      mount: (scenario, motion = 'FULL') => {
        host?.destroy(); fixture = enemyCameraFixtureV7(scenario); done = false;
        host = new CanvasBoardHostV7(document);
        host.mount(root, { onSelection: () => {}, onCommand: () => {} });
        model = { matchInstanceId: scenario, view: fixture.after, offeredCommands: [], interactive: false, motion, animationSpeed: 'NORMAL', presentationPaused: false, highContrast: false, interaction: { selection: null, selectedUnitId: null, selectedAchievement: null } };
        host.update(model); host.zoom('IN');
      },
      start: () => { host.presentBoundary(fixture.before, fixture.after, fixture.events).then(() => { done = true; }); },
      frame,
      drain: async () => { for (let i = 0; i < 20 && !done; i++) await frame(1000); if (!done || frames.size) throw new Error('Camera presentation did not settle'); },
      sample: () => ({ camera, unitAnchor, done, pendingFrames: frames.size, at: fixture.at, events: fixture.events.events.map(event => event.kind) }),
      destroy: () => host.destroy(),
    };
  })()`,
  );
  const evidence: unknown[] = [];
  for (const scenario of [
    "visible-move",
    "visible-build",
    "hidden-move",
    "hidden-build",
    "cloaked-move",
    "mixed-move",
  ] as const) {
    await evaluate(
      connection,
      `__CAMERA_REVIEW__.mount(${JSON.stringify(scenario)})`,
    );
    // Asset loading stays real; only the animation clock is controlled.
    await delay(700);
    const before = await sample(connection);
    await evaluate(connection, "__CAMERA_REVIEW__.start()");
    await evaluate(
      connection,
      `__CAMERA_REVIEW__.frame(${scenario === "visible-move" ? 135 : 90})`,
    );
    const during = await sample(connection);
    if (scenario === "visible-move") {
      assert(
        during.unitAnchor !== null &&
          Math.abs(during.unitAnchor.x - 640) < 0.01 &&
          Math.abs(during.unitAnchor.y - 495) < 0.01,
        "Moving enemy was not drawn at the camera center",
      );
      assert(
        during.camera.zoom === before.camera.zoom,
        "Tracking changed zoom",
      );
    }
    await capture(connection, `${scenario}-during.png`);
    await evaluate(connection, "__CAMERA_REVIEW__.drain()");
    const after = await sample(connection);
    if (scenario.startsWith("hidden") || scenario === "cloaked-move") {
      assert(
        JSON.stringify(before.camera) === JSON.stringify(during.camera) &&
          JSON.stringify(before.camera) === JSON.stringify(after.camera),
        `${scenario} moved the camera`,
      );
      assert(
        during.done && during.pendingFrames === 0,
        `${scenario} introduced animation delay`,
      );
    } else {
      assert(
        Math.abs(
          after.camera.offsetX + after.at.x * 128 * after.camera.zoom - 640,
        ) < 0.01 &&
          Math.abs(
            after.camera.offsetY + after.at.y * 128 * after.camera.zoom - 495,
          ) < 0.01,
        `${scenario} did not finish centered`,
      );
    }
    await capture(connection, `${scenario}-after.png`);
    evidence.push({ scenario, before, during, after });
  }
  await writeFile(
    path.join(outputRoot, "evidence.json"),
    `${JSON.stringify({ setup: "ENGINE_APPLIED_SYNTHETIC_FIXTURE", renderer: "CanvasBoardHostV7 with real Canvas/assets and controlled presentation clock", viewport: { width: 1280, height: 900, dpr: 1 }, evidence }, null, 2)}\n`,
  );
  await evaluate(connection, "__CAMERA_REVIEW__.destroy()");
  connection.close();
  console.log(`Enemy camera browser review passed: ${outputRoot}`);
} finally {
  browser.kill();
}

async function sample(connection: Connection): Promise<{
  readonly camera: {
    readonly offsetX: number;
    readonly offsetY: number;
    readonly zoom: number;
  };
  readonly unitAnchor: { readonly x: number; readonly y: number } | null;
  readonly at: { readonly x: number; readonly y: number };
  readonly done: boolean;
  readonly pendingFrames: number;
}> {
  return evaluate(connection, "__CAMERA_REVIEW__.sample()");
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
