import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
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

interface FixtureEvidence {
  readonly command: {
    readonly kind: "ATTACK";
    readonly unitId: number;
    readonly targetId: number;
  };
  readonly beforeCommandIndex: number;
  readonly afterCommandIndex: number;
  readonly beforeHash: string;
  readonly afterHash: string;
  readonly repeatHash: string;
  readonly eventsJson: string;
  readonly repeatEventsJson: string;
}

interface FrameEvidence {
  readonly phase: string;
  readonly motion: string;
  readonly css: readonly [number, number];
  readonly backing: readonly [number, number];
  readonly dpr: number;
  readonly touchPoints: number;
  readonly hash: string;
  readonly commandIndex: number;
}

const baseUrl = process.argv[2] ?? "http://localhost:6173";
const reviewRoot = path.join(process.cwd(), "art/integration/reviews/archer");
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9239;
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-archer-review-${process.pid}`
  : path.join(tmpdir(), `pulp-wars-archer-review-${process.pid}`);

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
  await waitForExpression(connection, "document.readyState === 'complete'");

  const evidence: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    chrome: await evaluate<string>(connection, "navigator.userAgent"),
    contract:
      "One manifest-attached Archer arrow: 280ms cubic-out flight, post-event state at impact, 100ms impact/reduced crossfade, deterministic command/events/hash.",
  };

  await setViewport(connection, 1440, 1000, 1, false);
  await delay(250);
  await waitForExpression(connection, "document.readyState === 'complete'");
  const desktopFixture = await installFixture(connection);
  evidence.fixture = desktopFixture;
  evidence.desktop = await captureSequence(
    connection,
    "desktop-1440x1000-dpr1",
    1440,
    1000,
    1,
  );

  await setViewport(connection, 390, 844, 2, true);
  await delay(250);
  await waitForExpression(connection, "document.readyState === 'complete'");
  const mobileFixture = await installFixture(connection);
  assertFixtureParity(desktopFixture, mobileFixture);
  evidence.mobile390x844Dpr2 = await captureSequence(
    connection,
    "mobile-390x844-dpr2",
    390,
    844,
    2,
  );

  await writeFile(
    path.join(reviewRoot, "archer-projectile-review.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(`Archer projectile Chrome evidence written to ${reviewRoot}`);
} finally {
  browser.kill();
}

async function installFixture(
  connection: Connection,
): Promise<FixtureEvidence> {
  const fixture = await evaluate<FixtureEvidence>(
    connection,
    `(async () => {
      const [engine, canvas] = await Promise.all([
        import(${JSON.stringify(`${baseUrl}/src/engine/index.ts`)}),
        import(${JSON.stringify(`${baseUrl}/src/render/canvas/board-host.ts`)})
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      globalThis.__archerReview?.host?.destroy?.();
      const created = engine.createGame({
        rulesetId: engine.RULESET_ID,
        mapGenerationRevision: engine.MAP_GENERATION_REVISION,
        seed: 0x6173,
        width: 11,
        height: 11,
        aiCount: 1,
        aiDifficulty: 'NORMAL',
        aiMode: 'RIVAL',
        humanColor: 'CORAL',
        factions: ['ORIGINAL', 'ORIGINAL']
      });
      if (!created.ok) throw new Error(created.error.code);
      const base = created.state;
      const human = base.players.find((player) => player.controller === 'HUMAN');
      const enemyPlayer = base.players.find((player) => player.controller === 'AI');
      const attacker = base.units.find((unit) => unit.ownerId === human?.id);
      const defender = base.units.find((unit) => unit.ownerId === enemyPlayer?.id);
      if (!human || !enemyPlayer || !attacker || !defender) throw new Error('Missing fixture combatants');
      const same = (left, right) => left.x === right.x && left.y === right.y;
      const target = base.board.tiles.find((tile) =>
        Math.max(Math.abs(tile.at.x - attacker.at.x), Math.abs(tile.at.y - attacker.at.y)) === 2 &&
        human.explored.some((at) => same(at, tile.at)) &&
        !base.cities.some((city) => same(city.at, tile.at))
      );
      if (!target) throw new Error('Missing range-two target');
      const state = {
        ...base,
        activeSeatIndex: base.turnOrder.indexOf(human.id),
        players: base.players.map((player) => ({
          ...player,
          explored: [...player.explored, ...[attacker.at, target.at].filter((at) =>
            !player.explored.some((known) => same(known, at))
          )]
        })),
        board: {
          ...base.board,
          tiles: base.board.tiles.map((tile) => same(tile.at, target.at)
            ? { ...tile, terrain: 'GRASS', resource: null, improvement: null }
            : tile)
        },
        units: base.units.map((unit) => unit.id === attacker.id
          ? {
              ...unit,
              type: 'ARCHER',
              ready: true,
              activation: {
                moved: false, attacked: false, recovered: false,
                captured: false, handled: false, escapeAvailable: false
              }
            }
          : unit.id === defender.id ? { ...unit, at: target.at } : unit)
      };
      const preView = engine.viewFor(state, human.id);
      const command = engine.queryPlayerCommands(preView)
        .map(({ command }) => command)
        .find((candidate) => candidate.kind === 'ATTACK' && candidate.unitId === attacker.id && candidate.targetId === defender.id);
      if (!command) throw new Error('Missing exact Archer attack');
      const resolved = engine.applyCommand(state, command);
      const repeated = engine.applyCommand(state, command);
      if (!resolved.ok || !repeated.ok) throw new Error('Archer attack rejected');
      const combat = resolved.events.find((event) => event.kind === 'COMBAT_RESOLVED');
      if (!combat) throw new Error('Missing combat event');
      const preAttacker = preView.units.find((unit) => unit.id === combat.preview.attackerId);
      const preDefender = preView.units.find((unit) => unit.id === combat.preview.defenderId);
      if (!preAttacker || !preDefender) throw new Error('Missing public render endpoint');
      const postView = engine.viewFor(resolved.state, human.id);
      const beforeHash = engine.canonicalHash(state);
      const afterHash = engine.canonicalHash(resolved.state);
      const repeatHash = engine.canonicalHash(repeated.state);
      const eventsJson = engine.canonicalJson(resolved.events);
      const repeatEventsJson = engine.canonicalJson(repeated.events);
      if (resolved.state.commandIndex !== state.commandIndex + 1) throw new Error('Command index did not increment exactly once');
      if (afterHash !== repeatHash || eventsJson !== repeatEventsJson) throw new Error('Repeated attack lost deterministic parity');

      document.querySelector('#app')?.replaceChildren();
      Object.assign(document.documentElement.style, { width: '100%', height: '100%', overflow: 'hidden' });
      Object.assign(document.body.style, { width: '100%', height: '100%', margin: '0', overflow: 'hidden', background: '#233b39' });
      const root = document.querySelector('#app');
      Object.assign(root.style, { position: 'fixed', inset: '0', width: '100%', height: '100%' });
      const container = document.createElement('div');
      container.className = 'board-host';
      Object.assign(container.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
      root.append(container);
      globalThis.__archerReviewNow = 0;
      Object.defineProperty(performance, 'now', { configurable: true, value: () => globalThis.__archerReviewNow });
      const host = new canvas.CanvasBoardHost(document);
      host.mount(container, { onSelection() {}, onInspect() {}, onCommand() {}, onZoom() {} });
      const basePresentation = {
        id: resolved.state.commandIndex,
        kind: 'ARCHER_ARROW',
        queueToken: 6173,
        commandIndex: resolved.state.commandIndex,
        phase: 'FLIGHT',
        phaseDurationMs: 280,
        phaseElapsedMs: 0,
        paused: false,
        motion: 'FULL',
        attacker: preAttacker,
        defender: preDefender,
        damageToDefender: combat.preview.damageToDefender,
        damageToAttacker: combat.preview.damageToAttacker,
        defenderDies: combat.preview.defenderDies,
        attackerDies: combat.preview.attackerDies,
        advances: combat.preview.advances
      };
      const update = (presentation) => host.update({
        matchInstanceId: 6173,
        view: postView,
        interactive: false,
        motion: presentation.motion,
        selected: null,
        combatPresentation: presentation
      });
      update(basePresentation);
      globalThis.__archerReview = { host, update, basePresentation, postView, afterHash };
      return {
        command,
        beforeCommandIndex: state.commandIndex,
        afterCommandIndex: resolved.state.commandIndex,
        beforeHash,
        afterHash,
        repeatHash,
        eventsJson,
        repeatEventsJson
      };
    })()`,
    true,
  );
  await waitForExpression(
    connection,
    "document.querySelector('.board-canvas') instanceof HTMLCanvasElement",
  );
  await waitForExpression(
    connection,
    `performance.getEntriesByType('resource').some((entry) => entry.name.endsWith('/assets/pixellab/units/archer.png'))`,
  );
  await delay(120);
  return fixture;
}

async function captureSequence(
  connection: Connection,
  prefix: string,
  width: number,
  height: number,
  dpr: number,
): Promise<Record<string, FrameEvidence>> {
  const frames: Record<string, FrameEvidence> = {};
  for (const frame of [
    { name: "contact", now: 0, phase: "FLIGHT", motion: "FULL", elapsed: 0 },
    {
      name: "flight-140ms",
      now: 140,
      phase: "FLIGHT",
      motion: "FULL",
      elapsed: 0,
    },
    { name: "impact", now: 280, phase: "IMPACT", motion: "FULL", elapsed: 0 },
    {
      name: "reduced-impact",
      now: 380,
      phase: "IMPACT",
      motion: "REDUCED",
      elapsed: 0,
    },
  ] as const) {
    await evaluate(
      connection,
      `(() => {
        const review = globalThis.__archerReview;
        globalThis.__archerReviewNow = ${frame.now};
        review.update({
          ...review.basePresentation,
          queueToken: ${frame.motion === "REDUCED" ? 6174 : 6173},
          phase: ${JSON.stringify(frame.phase)},
          phaseDurationMs: ${frame.phase === "FLIGHT" ? 280 : 100},
          phaseElapsedMs: ${frame.elapsed},
          motion: ${JSON.stringify(frame.motion)}
        });
      })()`,
    );
    await delay(30);
    frames[frame.name] = await frameEvidence(connection);
    const measured = frames[frame.name];
    if (
      measured === undefined ||
      measured.css[0] !== width ||
      measured.css[1] !== height ||
      measured.backing[0] !== width * dpr ||
      measured.backing[1] !== height * dpr ||
      measured.dpr !== dpr
    )
      throw new Error(
        `${prefix} ${frame.name} has wrong CSS/backing/DPR geometry`,
      );
    await capture(connection, `${prefix}-${frame.name}.png`);
  }
  return frames;
}

async function frameEvidence(connection: Connection): Promise<FrameEvidence> {
  return evaluate<FrameEvidence>(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas');
      const review = globalThis.__archerReview;
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing Canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        phase: canvas.dataset.combatPhase,
        motion: canvas.dataset.combatMotion,
        css: [rect.width, rect.height],
        backing: [canvas.width, canvas.height],
        dpr: devicePixelRatio,
        touchPoints: navigator.maxTouchPoints,
        hash: review.afterHash,
        commandIndex: review.postView.commandIndex
      };
    })()`,
  );
}

function assertFixtureParity(
  desktop: FixtureEvidence,
  mobile: FixtureEvidence,
): void {
  if (
    desktop.afterHash !== mobile.afterHash ||
    desktop.repeatHash !== desktop.afterHash ||
    mobile.repeatHash !== mobile.afterHash ||
    desktop.eventsJson !== mobile.eventsJson ||
    desktop.eventsJson !== desktop.repeatEventsJson ||
    mobile.eventsJson !== mobile.repeatEventsJson ||
    JSON.stringify(desktop.command) !== JSON.stringify(mobile.command)
  )
    throw new Error("Desktop/mobile command, event, or hash parity failed");
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
  });
  await connection.send("Emulation.setTouchEmulationEnabled", {
    enabled: mobile,
    maxTouchPoints: mobile ? 5 : 1,
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
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error(`Chrome returned no screenshot data for ${filename}`);
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
      // A viewport override may briefly replace Chrome's execution context.
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
