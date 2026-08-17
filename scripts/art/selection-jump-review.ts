import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly close: () => void;
};

interface FixtureMetric {
  readonly stateHash: string;
  readonly commandIndex: number;
  readonly unitId: number;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly css: readonly [number, number];
  readonly backing: readonly [number, number];
  readonly dpr: number;
  readonly motion: "FULL" | "REDUCED";
}

const baseUrl = process.argv[2] ?? "http://localhost:6173";
const reviewRoot = path.join(
  process.cwd(),
  "art/integration/reviews/selection-jump",
);
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9257;
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-selection-jump-${process.pid}`
  : path.join(tmpdir(), `pulp-wars-selection-jump-${process.pid}`);

await mkdir(reviewRoot, { recursive: true });
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "--window-size=1440,1000",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await waitForExpression(
    connection,
    `document.readyState === 'complete' && document.querySelector('.app-shell')?.dataset.route === 'hub'`,
  );

  const evidence: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    chrome: await evaluate<string>(connection, "navigator.userAgent"),
    contract:
      "One selected-unit raster half-sine: 12 nominal CSS px at 120 ms and exact ground return at 240 ms; fixed anchor/cues/picking/camera/state/hash; Reduced schedules no motion and is pixel-static.",
  };

  await setViewport(connection, 1440, 1000, 1, false);
  const desktop = await installFixture(connection, "FULL");
  await setTimeAndDraw(connection, 120);
  const desktopNative = await metric(connection);
  assertStableFixture("desktop native", desktop, desktopNative);
  await capture(connection, "selection-jump-desktop-native.png");
  await zoom(connection);
  const desktopEnlarged = await metric(connection);
  assertStableFixture("desktop enlarged", desktop, desktopEnlarged, false);
  await capture(connection, "selection-jump-desktop-enlarged.png");
  evidence.desktop = { native: desktopNative, enlarged: desktopEnlarged };

  await setViewport(connection, 390, 844, 2, true);
  const mobile = await installFixture(connection, "FULL");
  await setTimeAndDraw(connection, 120);
  const mobileNative = await metric(connection);
  assertStableFixture("mobile native", mobile, mobileNative);
  await capture(connection, "selection-jump-mobile-dpr2-native.png");
  await zoom(connection);
  const mobileEnlarged = await metric(connection);
  assertStableFixture("mobile enlarged", mobile, mobileEnlarged, false);
  await capture(connection, "selection-jump-mobile-dpr2-enlarged.png");
  evidence.mobile390x844Dpr2 = {
    native: mobileNative,
    enlarged: mobileEnlarged,
  };

  await setViewport(connection, 1440, 1000, 1, false);
  const reduced = await installFixture(connection, "REDUCED");
  await storeCanvasBaseline(connection);
  await setTimeAndDraw(connection, 120);
  const reducedChangedPixels = await changedPixels(connection);
  if (reducedChangedPixels !== 0)
    throw new Error(
      `Reduced-motion selected frame changed ${reducedChangedPixels} pixels`,
    );
  const reducedMetric = await metric(connection);
  assertStableFixture("reduced", reduced, reducedMetric);
  await capture(connection, "selection-jump-reduced-motion-desktop.png");
  evidence.reducedMotion = {
    ...reducedMetric,
    changedPixels: reducedChangedPixels,
  };

  evidence.captures = await captureEvidence([
    "selection-jump-desktop-native.png",
    "selection-jump-desktop-enlarged.png",
    "selection-jump-mobile-dpr2-native.png",
    "selection-jump-mobile-dpr2-enlarged.png",
    "selection-jump-reduced-motion-desktop.png",
  ]);
  await writeFile(
    path.join(reviewRoot, "selection-jump-review.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(`Selection-jump Chrome evidence written to ${reviewRoot}`);
} finally {
  browser.kill();
}

async function installFixture(
  connection: Connection,
  motion: "FULL" | "REDUCED",
): Promise<FixtureMetric> {
  const fixture = await evaluate<FixtureMetric>(
    connection,
    `(async () => {
      const [engine, canvas] = await Promise.all([
        import(${JSON.stringify(`${baseUrl}/src/engine/index.ts`)}),
        import(${JSON.stringify(`${baseUrl}/src/render/canvas/board-host.ts`)})
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      globalThis.__selectionJumpReview?.host?.destroy?.();
      const result = engine.createGame(engine.DEMO_MATCH_SETUP);
      if (!result.ok) throw new Error(result.error.code);
      const human = result.state.players.find((player) => player.controller === 'HUMAN');
      const source = result.state.units.find((unit) => unit.ownerId === human?.id);
      const capital = result.state.cities.find((city) => city.ownerId === human?.id && city.isCapital);
      if (!human || !source || !capital) throw new Error('Missing selection-jump fixture unit');
      const explored = result.state.board.tiles.map((tile) => tile.at);
      const unit = {
        ...source,
        at: capital.at,
        activation: { ...source.activation, handled: true }
      };
      const state = {
        ...result.state,
        activeSeatIndex: result.state.turnOrder.indexOf(human.id),
        board: {
          ...result.state.board,
          tiles: result.state.board.tiles.map((tile) => ({
            ...tile,
            terrain: 'GRASS',
            resource: null,
            improvement: null,
            site: tile.at.x === capital.at.x && tile.at.y === capital.at.y ? 'CAPITAL' : null,
            territoryCenter: tile.territoryCityId === capital.id ? capital.at : null,
            territoryCityId: tile.territoryCityId === capital.id ? capital.id : null
          }))
        },
        players: result.state.players.map((player) => player.id === human.id ? { ...player, explored } : player),
        cities: [capital],
        units: [unit],
        pendingChoice: null,
        outcome: null
      };
      const view = engine.viewFor(state, human.id);
      document.querySelector('#app')?.replaceChildren();
      Object.assign(document.documentElement.style, { width: '100%', height: '100%', overflow: 'hidden' });
      Object.assign(document.body.style, { width: '100%', height: '100%', margin: '0', overflow: 'hidden', background: '#233b39' });
      const root = document.querySelector('#app');
      if (!root) throw new Error('Missing app root');
      Object.assign(root.style, { position: 'fixed', inset: '0', width: '100%', height: '100%' });
      const container = document.createElement('div');
      container.className = 'board-host';
      Object.assign(container.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
      root.append(container);
      globalThis.__selectionJumpNow = 0;
      Object.defineProperty(performance, 'now', {
        configurable: true,
        value: () => globalThis.__selectionJumpNow
      });
      let selected = null;
      const host = new canvas.CanvasBoardHost(document);
      const model = () => ({
        matchInstanceId: 73024,
        view,
        interactive: false,
        motion: ${JSON.stringify(motion)},
        animationSpeed: 'NORMAL',
        selected
      });
      host.mount(container, {
        onSelection(value) { selected = value; },
        onInspect() {},
        onCommand() { throw new Error('Review fixture dispatched a command'); },
        onZoom() {}
      });
      host.update(model());
      host.select({ kind: 'UNIT', unitId: unit.id });
      globalThis.__selectionJumpReview = { host, model, state, unitId: unit.id };
      const point = host.screenPoint(unit.at);
      const board = document.querySelector('.board-canvas');
      if (!point || !(board instanceof HTMLCanvasElement)) throw new Error('Missing review geometry');
      const rect = board.getBoundingClientRect();
      return {
        stateHash: engine.canonicalHash(state),
        commandIndex: state.commandIndex,
        unitId: unit.id,
        anchor: point,
        css: [rect.width, rect.height],
        backing: [board.width, board.height],
        dpr: devicePixelRatio,
        motion: ${JSON.stringify(motion)}
      };
    })()`,
    true,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.board-canvas') instanceof HTMLCanvasElement`,
  );
  await settleImages(connection);
  await evaluate<boolean>(
    connection,
    `(() => { globalThis.__selectionJumpReview.host.update(globalThis.__selectionJumpReview.model()); return true; })()`,
  );
  await delay(50);
  return fixture;
}

async function setTimeAndDraw(
  connection: Connection,
  elapsedMs: number,
): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      globalThis.__selectionJumpNow = ${elapsedMs};
      globalThis.__selectionJumpReview.host.update(globalThis.__selectionJumpReview.model());
      return true;
    })()`,
  );
  await delay(50);
}

async function zoom(connection: Connection): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      globalThis.__selectionJumpReview.host.zoom('IN');
      globalThis.__selectionJumpReview.host.zoom('IN');
      return true;
    })()`,
  );
  await delay(50);
}

async function metric(connection: Connection): Promise<FixtureMetric> {
  return evaluate<FixtureMetric>(
    connection,
    `(() => {
      const review = globalThis.__selectionJumpReview;
      const board = document.querySelector('.board-canvas');
      const point = review.host.screenPoint(review.state.units[0].at);
      if (!point || !(board instanceof HTMLCanvasElement)) throw new Error('Missing fixture metric');
      const rect = board.getBoundingClientRect();
      return {
        stateHash: globalThis.__selectionJumpEngineHash ?? '',
        commandIndex: review.state.commandIndex,
        unitId: review.unitId,
        anchor: point,
        css: [rect.width, rect.height],
        backing: [board.width, board.height],
        dpr: devicePixelRatio,
        motion: review.model().motion
      };
    })()`,
  ).then(async (value) => ({
    ...value,
    stateHash: await evaluate<string>(
      connection,
      `(async () => (await import(${JSON.stringify(`${baseUrl}/src/engine/index.ts`)})).canonicalHash(globalThis.__selectionJumpReview.state))()`,
      true,
    ),
  }));
}

function assertStableFixture(
  label: string,
  initial: FixtureMetric,
  current: FixtureMetric,
  requireAnchor = true,
): void {
  if (
    initial.stateHash !== current.stateHash ||
    initial.commandIndex !== current.commandIndex ||
    initial.unitId !== current.unitId
  )
    throw new Error(`${label} changed authoritative fixture state`);
  if (
    requireAnchor &&
    (initial.anchor.x !== current.anchor.x ||
      initial.anchor.y !== current.anchor.y)
  )
    throw new Error(`${label} moved the logical ground anchor`);
  if (
    current.backing[0] !== Math.round(current.css[0] * current.dpr) ||
    current.backing[1] !== Math.round(current.css[1] * current.dpr)
  )
    throw new Error(`${label} has incorrect CSS/backing/DPR geometry`);
}

async function storeCanvasBaseline(connection: Connection): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas');
      const context = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;
      if (!canvas || !context) throw new Error('Missing Canvas baseline');
      globalThis.__selectionJumpBaseline = context.getImageData(0, 0, canvas.width, canvas.height);
      return true;
    })()`,
  );
}

async function changedPixels(connection: Connection): Promise<number> {
  return evaluate<number>(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas');
      const context = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;
      const baseline = globalThis.__selectionJumpBaseline;
      if (!canvas || !context || !baseline) throw new Error('Missing Reduced comparison');
      const current = context.getImageData(0, 0, canvas.width, canvas.height);
      let changed = 0;
      for (let index = 0; index < current.data.length; index += 4) {
        if (current.data[index] !== baseline.data[index] ||
          current.data[index + 1] !== baseline.data[index + 1] ||
          current.data[index + 2] !== baseline.data[index + 2] ||
          current.data[index + 3] !== baseline.data[index + 3]) changed += 1;
      }
      return changed;
    })()`,
  );
}

async function captureEvidence(filenames: readonly string[]): Promise<
  readonly {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
  }[]
> {
  return Promise.all(
    filenames.map(async (filename) => {
      const data = await readFile(path.join(reviewRoot, filename));
      return {
        path: `art/integration/reviews/selection-jump/${filename}`,
        bytes: data.byteLength,
        sha256: createHash("sha256").update(data).digest("hex"),
      };
    }),
  );
}

async function settleImages(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `Promise.all([...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); })))`,
    true,
  );
  await delay(100);
}

async function setViewport(
  connection: Connection,
  width: number,
  height: number,
  deviceScaleFactor: number,
  mobile: boolean,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
}

async function capture(
  connection: Connection,
  filename: string,
): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  })) as { readonly data: string };
  await writeFile(
    path.join(reviewRoot, filename),
    Buffer.from(response.data, "base64"),
  );
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
  awaitPromise = false,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: {
      readonly exception?: { readonly description?: string };
    };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      if (await evaluate<boolean>(connection, `Boolean(${expression})`)) return;
    } catch {
      // Viewport replacement can briefly discard Chrome's execution context.
    }
    await delay(100);
  }
  throw new Error(`Chrome review timed out waiting for: ${expression}`);
}

async function waitForTarget(
  debugPort: number,
  expectedUrl: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const target = targets.find(
          (candidate) =>
            candidate.type === "page" && candidate.url.startsWith(expectedUrl),
        );
        if (target !== undefined) return target;
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
    {
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
      request.reject(new Error(message.error.message ?? "CDP command failed"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}): Promise<unknown> {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close(): void {
      socket.close();
    },
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
