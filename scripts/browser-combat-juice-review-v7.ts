import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { prepareSmokeOutput } from "./browser-smoke-output";

/**
 * Combat juice, UI review (bead pulp_wars-2yc.80, docs/ui/UI_REVIEW_2026_10.md
 * V1, V2, V3). On the hand-built scenes of tests/fixtures/v7-combat-juice-ui.ts
 * (no match is played; the human seat gives one command at a time, and the
 * Goblin turn is one command given for the Goblin seat and played back to
 * the human) it captures frame sequences at desktop (1440 x 1000) and phone
 * (390 x 844) widths, full and reduced motion: the Knight's kill (damage
 * number, death poof), the Fighter's hit on a Guard and its retaliation, training
 * a unit (spawn pop) and the Goblin Bomb Chucker's shot with its splash (the
 * enemy turn's playback). Bead pulp_wars-b9mc adds the same spawn pop for
 * the level-6 giant (its Guard pushed off the center first), a treasure
 * chest's unit, and a Goblin chest unit played back to the human. The page's clock and animation frames are
 * replaced by a stepped clock while a sequence plays, so each frame is
 * taken at an exact time. Each sequence is also laid out as one contact
 * sheet, cropped round the action and enlarged. Chrome runs headless and
 * muted. It needs the Vite dev server, because the fixtures are imported
 * from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-combat-juice-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>] [--only=kill,trade,train,enemy,reward,chest,enemy-chest]
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
type Size = "desktop" | "phone";
type Motion = "full" | "reduced";

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
  name: "combat-juice",
  archiveDirectory: "art/integration/reviews/ruleset7-combat-juice",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_640 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-juice-"));
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
const REVIEW = "globalThis.__JUICE_REVIEW__";
/** The stepped clock's frame, ms. */
const FRAME_MS = 40;

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const motion of ["full", "reduced"] as const) {
    await connection.send("Emulation.setEmulatedMedia", {
      features: [
        {
          name: "prefers-reduced-motion",
          value: motion === "reduced" ? "reduce" : "no-preference",
        },
      ],
    });
    for (const size of ["desktop", "phone"] as const) {
      await viewport(connection, size);
      if (wanted("kill")) await kill(connection, size, motion);
      if (wanted("trade")) await trade(connection, size, motion);
      if (wanted("train")) await train(connection, size, motion);
      if (wanted("enemy")) await enemy(connection, size, motion);
      if (wanted("reward")) await reward(connection, size, motion);
      if (wanted("chest")) await chest(connection, size, motion, 0);
      if (wanted("enemy-chest")) await chest(connection, size, motion, 1);
    }
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Combat juice review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

async function kill(
  connection: Connection,
  size: Size,
  motion: Motion,
): Promise<void> {
  const at = await mount(connection, "combatJuiceFixtureV7");
  await sequence(
    connection,
    `kill-${size}-${motion}`,
    [at.knight, at.knightVictim],
    `(() => { const view = ${REVIEW}.snapshotView(); const id = (at) => view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y).id; return ${REVIEW}.controller.dispatch({ kind: 'ATTACK', unitId: id(${JSON.stringify(at.knight)}), targetUnitId: id(${JSON.stringify(at.knightVictim)}) }); })()`,
    motion === "full" ? 30 : 22,
  );
}

async function trade(
  connection: Connection,
  size: Size,
  motion: Motion,
): Promise<void> {
  const at = await mount(connection, "combatJuiceFixtureV7");
  await sequence(
    connection,
    `trade-${size}-${motion}`,
    [at.fighter, at.goblinGuard],
    `(() => { const view = ${REVIEW}.snapshotView(); const id = (at) => view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y).id; return ${REVIEW}.controller.dispatch({ kind: 'ATTACK', unitId: id(${JSON.stringify(at.fighter)}), targetUnitId: id(${JSON.stringify(at.goblinGuard)}) }); })()`,
    motion === "full" ? 30 : 22,
  );
}

async function train(
  connection: Connection,
  size: Size,
  motion: Motion,
): Promise<void> {
  const at = await mount(connection, "combatJuiceFixtureV7");
  await sequence(
    connection,
    `train-${size}-${motion}`,
    [at.capital],
    `(() => { const view = ${REVIEW}.snapshotView(); const city = view.cities.find((candidate) => candidate.at.x === ${at.capital.x} && candidate.at.y === ${at.capital.y}); return ${REVIEW}.controller.dispatch({ kind: 'TRAIN', cityId: city.id, role: 'FIGHTER' }); })()`,
    motion === "full" ? 16 : 12,
  );
}

async function enemy(
  connection: Connection,
  size: Size,
  motion: Motion,
): Promise<void> {
  const at = await mount(connection, "combatJuiceEnemyTurnFixtureV7");
  await sequence(
    connection,
    `enemy-${size}-${motion}`,
    [at.bombChucker, at.bombTarget, at.bombSplash],
    `(() => { const view = ${REVIEW}.snapshotView(); const id = (at) => view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y).id; return ${REVIEW}.controller.dispatchAs(${REVIEW}.goblinId(), { kind: 'ATTACK', unitId: id(${JSON.stringify(at.bombChucker)}), targetUnitId: id(${JSON.stringify(at.bombTarget)}) }); })()`,
    motion === "full" ? 34 : 22,
  );
}

async function reward(
  connection: Connection,
  size: Size,
  motion: Motion,
): Promise<void> {
  const at = await mount(connection, "combatJuiceRewardFixtureV7");
  // The reward's chooser stays away while the board is dragged into place
  // (on a phone the drag would tap it): the choice comes back just before
  // the command.
  await evaluate(
    connection,
    `(() => { const held = ${REVIEW}.state(); ${REVIEW}.heldState = held; ${REVIEW}.rewardCommand = ${REVIEW}.fixtures.combatJuiceRewardCommandV7(held); ${REVIEW}.replaceState({ ...held, pendingChoices: [] }); return true; })()`,
  );
  await sequence(
    connection,
    `reward-${size}-${motion}`,
    [at.capital, at.pushedTo],
    `(${REVIEW}.replaceState(${REVIEW}.heldState), ${REVIEW}.controller.dispatch(${REVIEW}.rewardCommand).then((result) => { if (!result.accepted) throw new Error('reward rejected: ' + JSON.stringify(result.error)); }))`,
    motion === "full" ? 22 : 14,
  );
}

async function chest(
  connection: Connection,
  size: Size,
  motion: Motion,
  seat: 0 | 1,
): Promise<void> {
  const at = await mount(connection, "combatJuiceChestFixtureV7", seat);
  const name = seat === 0 ? "chest" : "enemy-chest";
  const dispatch =
    seat === 0
      ? `${REVIEW}.controller.dispatch`
      : `((command) => ${REVIEW}.controller.dispatchAs(${REVIEW}.goblinId(), command))`;
  await sequence(
    connection,
    `${name}-${size}-${motion}`,
    [at.chestMover, at.chest, { x: at.chest.x - 1, y: at.chestMover.y }],
    `(() => { const view = ${REVIEW}.snapshotView(); const id = (at) => view.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y).id; return ${dispatch}({ kind: 'MOVE', unitId: id(${JSON.stringify(at.chestMover)}), path: [${JSON.stringify(at.chest)}] }); })()`,
    motion === "full" ? 24 : 14,
  );
}

/**
 * Starts `command` on the stepped clock and captures a frame every
 * FRAME_MS, cropped round `cells`, then lays them out as one sheet.
 */
async function sequence(
  connection: Connection,
  name: string,
  cells: readonly Coord[],
  command: string,
  frames: number,
): Promise<void> {
  await centreOn(connection, cells);
  const clip = await clipAround(connection, cells);
  await evaluate(connection, clockInstall());
  await evaluate(connection, `(${command}, true)`);
  const shots: { readonly ms: number; readonly png: Buffer }[] = [];
  const counts: unknown[] = [];
  for (let frame = 0; frame < frames; frame += 1) {
    await evaluate(connection, `globalThis.__JUICE_CLOCK__.step(${FRAME_MS})`);
    // Promise continuations of the playback run between frames.
    await evaluate(
      connection,
      `new Promise((resolve) => setTimeout(resolve, 25))`,
      true,
    );
    const ms = (frame + 1) * FRAME_MS;
    counts.push(
      await evaluate(
        connection,
        `(() => { const canvas = document.querySelector('canvas.board-effects-canvas-v7'); return { ms: ${ms}, floats: canvas?.dataset.combatJuiceFloats ?? null, units: canvas?.dataset.combatJuiceUnits ?? null }; })()`,
      ),
    );
    shots.push({ ms, png: await captureClip(connection, clip) });
  }
  await evaluate(connection, clockUninstall());
  evidence[name] = counts;
  await writeSheet(name, shots, clip);
}

/** Replaces the page's clock and frames with ones the review steps. */
function clockInstall(): string {
  return `(() => {
  if (globalThis.__JUICE_CLOCK__ !== undefined) return;
  const realNow = performance.now.bind(performance);
  const realFrame = window.requestAnimationFrame.bind(window);
  const realCancel = window.cancelAnimationFrame.bind(window);
  const queue = new Map();
  let next = 1;
  const clock = {
    time: realNow(),
    step(ms) {
      clock.time += ms;
      const waiting = [...queue.values()];
      queue.clear();
      for (const callback of waiting) callback(clock.time);
    },
    restore() {
      performance.now = realNow;
      window.requestAnimationFrame = realFrame;
      window.cancelAnimationFrame = realCancel;
      for (const callback of queue.values()) realFrame(callback);
      queue.clear();
    },
  };
  performance.now = () => clock.time;
  window.requestAnimationFrame = (callback) => { const id = next; next += 1; queue.set(id, callback); return id; };
  window.cancelAnimationFrame = (id) => { queue.delete(id); };
  globalThis.__JUICE_CLOCK__ = clock;
})()`;
}
function clockUninstall(): string {
  return `(() => { globalThis.__JUICE_CLOCK__?.restore(); delete globalThis.__JUICE_CLOCK__; })()`;
}

interface Clip {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
}

/** Drags the board so the cells' middle sits in the middle of the page. */
async function centreOn(
  connection: Connection,
  cells: readonly Coord[],
): Promise<void> {
  const points = (await evaluate(
    connection,
    `(() => {
      const host = ${REVIEW}.boardHost;
      const rect = document.querySelector('canvas.board-canvas-v7').getBoundingClientRect();
      const points = ${JSON.stringify(cells)}.map((at) => host.cellCentreCssPx(at));
      const x = rect.left + points.reduce((sum, p) => sum + p.x, 0) / points.length;
      const y = rect.top + points.reduce((sum, p) => sum + p.y, 0) / points.length;
      return { from: { x: innerWidth / 2, y: innerHeight * 0.45 }, by: { x: innerWidth / 2 - x, y: innerHeight * 0.45 - y } };
    })()`,
  )) as {
    readonly from: Coord;
    readonly by: Coord;
  };
  if (Math.abs(points.by.x) < 4 && Math.abs(points.by.y) < 4) return;
  const mouse = (type: string, x: number, y: number) =>
    connection.send("Input.dispatchMouseEvent", {
      type,
      x,
      y,
      button: "left",
      buttons: type === "mouseReleased" ? 0 : 1,
      clickCount: 1,
    });
  await mouse("mousePressed", points.from.x, points.from.y);
  for (let step = 1; step <= 10; step += 1)
    await mouse(
      "mouseMoved",
      points.from.x + (points.by.x * step) / 10,
      points.from.y + (points.by.y * step) / 10,
    );
  await mouse(
    "mouseReleased",
    points.from.x + points.by.x,
    points.from.y + points.by.y,
  );
  await delay(500);
}

/** A square round the cells, in page CSS px, with a tile of margin. */
async function clipAround(
  connection: Connection,
  cells: readonly Coord[],
): Promise<Clip> {
  return (await evaluate(
    connection,
    `(() => {
      const host = ${REVIEW}.boardHost;
      const canvas = document.querySelector('canvas.board-canvas-v7');
      const rect = canvas.getBoundingClientRect();
      const points = ${JSON.stringify(cells)}.map((at) => host.cellCentreCssPx(at));
      const tile = Number(canvas.dataset.tileCssPx ?? 80);
      const left = Math.min(...points.map((p) => p.x)) - tile * 1.1;
      const right = Math.max(...points.map((p) => p.x)) + tile * 1.1;
      const top = Math.min(...points.map((p) => p.y)) - tile * 1.6;
      const bottom = Math.max(...points.map((p) => p.y)) + tile * 0.8;
      const x = Math.max(0, rect.left + left);
      const y = Math.max(0, rect.top + top);
      return { x, y, width: Math.min(innerWidth - x, right - left), height: Math.min(innerHeight - y, bottom - top), scale: 1 };
    })()`,
  )) as Clip;
}

async function captureClip(
  connection: Connection,
  clip: Clip,
): Promise<Buffer> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    clip,
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  return Buffer.from(response.data, "base64");
}

/** The frames side by side, six to a row, each enlarged twice. */
async function writeSheet(
  name: string,
  shots: readonly { readonly ms: number; readonly png: Buffer }[],
  clip: Clip,
): Promise<void> {
  const first = shots[0];
  if (first === undefined) return;
  const meta = await sharp(first.png).metadata();
  const width = (meta.width ?? Math.round(clip.width)) * 2;
  const height = (meta.height ?? Math.round(clip.height)) * 2;
  const label = 22;
  const columns = Math.min(6, shots.length);
  const rows = Math.ceil(shots.length / columns);
  const tiles = await Promise.all(
    shots.map(async (shot, index) => ({
      input: await sharp(shot.png)
        .resize(width, height, { kernel: "nearest" })
        .png()
        .toBuffer(),
      left: (index % columns) * width,
      top: Math.floor(index / columns) * (height + label) + label,
    })),
  );
  const labels = shots.map((shot, index) => ({
    input: Buffer.from(
      `<svg width="${width}" height="${label}"><rect width="100%" height="100%" fill="#1a1410"/><text x="6" y="16" font-family="sans-serif" font-size="14" fill="#f7efd8">${shot.ms} ms</text></svg>`,
    ),
    left: (index % columns) * width,
    top: Math.floor(index / columns) * (height + label),
  }));
  await sharp({
    create: {
      width: width * columns,
      height: (height + label) * rows,
      channels: 4,
      background: "#1a1410",
    },
  })
    .composite([...tiles, ...labels])
    .png()
    .toFile(path.join(output.directory, `${name}.png`));
  // The native-scale frames too, for a look at their own size.
  for (const shot of shots)
    await writeFile(
      path.join(
        output.directory,
        `${name}-${String(shot.ms).padStart(4, "0")}ms.png`,
      ),
      shot.png,
    );
  console.log(`captured ${name} (${shots.length} frames)`);
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  // Developer mode (pulp_wars-5xki): the Gallery and every faction.
  next.searchParams.set("dev", "1");
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

/**
 * Mounts a combat juice scene with a fixture controller (its dispatch for
 * the human seat, and `dispatchAs` for another seat, played back to the
 * human like an AI command). Returns the scene's cells.
 */
async function mount(
  connection: Connection,
  fixture: string,
  ...fixtureArgs: readonly unknown[]
): Promise<Record<string, Coord>> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const fixtures = await import('/tests/fixtures/v7-combat-juice-ui.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      globalThis.__JUICE_REVIEW__?.view?.destroy?.();
      let state = fixtures[${JSON.stringify(fixture)}](...${JSON.stringify(fixtureArgs)});
      const viewer = state.humanPlayerId;
      const subscribers = new Set();
      const boundarySubscribers = new Set();
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, viewer);
        return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const dispatchAs = async (actor, command) => {
        const beforeState = state;
        const beforeView = engine.viewForV7(beforeState, viewer);
        const applied = engine.applyCommandV7(beforeState, actor, command);
        if (!applied.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: applied.error };
        state = applied.state;
        const afterView = engine.viewForV7(state, viewer);
        const playerEvents = engine.projectEventsV7(beforeState, state, viewer, applied.events);
        const boundary = { actor: actor === viewer ? 'HUMAN' : 'AI', beforeView, afterView, playerEvents };
        for (const subscriber of boundarySubscribers) subscriber(boundary);
        const next = snapshot();
        for (const subscriber of subscribers) subscriber(next);
        return { accepted: true, beforeView, afterView, playerEvents };
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
        subscribeAcceptedBoundary(subscriber) { boundarySubscribers.add(subscriber); return () => boundarySubscribers.delete(subscriber); },
        dispatch: (command) => dispatchAs(viewer, command),
        dispatchAs,
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
      const root = document.querySelector('#app');
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, root, controller, { boardHost, settingsStorage: null });
      globalThis.__JUICE_REVIEW__ = {
        boardHost, view, controller, fixtures,
        at: { ...fixtures.COMBAT_JUICE_UI_V7, ...fixtures.COMBAT_JUICE_REWARD_UI_V7 },
        snapshotView: () => snapshot().view,
        state: () => state,
        // Shows another state (no command), as a subscriber would see it.
        replaceState(next) { state = next; const shown = snapshot(); for (const subscriber of subscribers) subscriber(shown); },
        goblinId: () => state.players.find((player) => player.id !== viewer).id,
      };
    })()`,
    true,
  );
  await delay(1_500);
  return (await evaluate(connection, `${REVIEW}.at`)) as Record<string, Coord>;
}

async function viewport(connection: Connection, size: Size): Promise<void> {
  await connection.send(
    "Emulation.setDeviceMetricsOverride",
    size === "desktop"
      ? { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }
      : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  );
  await delay(300);
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(connection, `globalThis.__JUICE_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__JUICE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
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
