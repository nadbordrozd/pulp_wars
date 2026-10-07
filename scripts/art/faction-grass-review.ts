/**
 * Faction grass review (EXPERIMENT, bead pulp_wars-2o7.4,
 * docs/art/FACTION_GRASS.md): screenshots of the real game (the Ruleset 7
 * app view and board host, live CHIBI look) over the drawn scenes of
 * scripts/art/faction-grass/review-scenes.ts.
 *
 *   npx vite --port 6593 --strictPort &
 *   CHROME_PATH=... GRASS_GAME_URL=http://localhost:6593/ \
 *     npx tsx scripts/art/faction-grass-review.ts <out-dir>
 *
 * Writes one border scene per faction, the eight-seat overview, and the
 * Goblin, Undead and overview scenes again with `?faction-grass=0` (the
 * look before the experiment). GRASS_SHOTS=goblin,overview limits the run.
 * No PixelLab call.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const OUT = path.resolve(process.argv[2] ?? "faction-grass-review");
const BASE = process.env.GRASS_GAME_URL ?? "http://localhost:6593/";
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface Shot {
  readonly name: string;
  /** An expression over `scenes` (the review-scenes module). */
  readonly scene: string;
  readonly zoomIn: 0 | 1;
  /** False adds `?faction-grass=0`. */
  readonly grass: boolean;
  /** The page size; the whole 25 x 25 overview needs a large one. */
  readonly size?: readonly [number, number];
}

const FACTIONS = [
  "Undead",
  "Goblin",
  "Dinosaur",
  "Martian",
  "IceFolk",
  "Dwarf",
  "Candy",
] as const;

const OVERVIEW = [1760, 1700] as const;

const SHOTS: readonly Shot[] = [
  ...FACTIONS.map((faction) => ({
    name: faction.toLowerCase(),
    scene: `scenes.scene${faction}()`,
    zoomIn: 1 as const,
    grass: true,
  })),
  {
    name: "overview",
    scene: "scenes.overviewScene()",
    zoomIn: 0,
    grass: true,
    size: OVERVIEW,
  },
  {
    name: "goblin-off",
    scene: "scenes.sceneGoblin()",
    zoomIn: 1,
    grass: false,
  },
  {
    name: "undead-off",
    scene: "scenes.sceneUndead()",
    zoomIn: 1,
    grass: false,
  },
  {
    name: "overview-off",
    scene: "scenes.overviewScene()",
    zoomIn: 0,
    grass: false,
    size: OVERVIEW,
  },
];

/** Replaces the running app with the app view over a fixed state. */
function mountExpression(scene: string): string {
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const scenes = await import('/scripts/art/faction-grass/review-scenes.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      const state = ${scene};
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
      const boardHost = new CanvasBoardHostV7(document, {});
      const view = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
      globalThis.__GRASS_REVIEW__ = { boardHost, view };
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
  shot: Shot,
  file: string,
): Promise<void> {
  const url = new URL(BASE);
  url.searchParams.set("art", "chibi");
  if (!shot.grass) url.searchParams.set("faction-grass", "0");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: shot.size?.[0] ?? 1440,
    height: shot.size?.[1] ?? 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(connection, `globalThis.__GRASS_OLD__ = true`).catch(
    () => undefined,
  );
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__GRASS_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(connection, mountExpression(shot.scene));
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(400);
  for (let step = 0; step < shot.zoomIn; step += 1)
    await evaluate(
      connection,
      `globalThis.__GRASS_REVIEW__.boardHost.zoom('IN')`,
    );
  // Art loads asynchronously and redraws the board.
  await delay(2500);
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  await writeFile(file, Buffer.from(result.data, "base64"));
  console.log(`wrote ${file}`);
}

async function main(): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  await mkdir(OUT, { recursive: true });
  const port = 10_500 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "grass-game-"));
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
    const only = process.env.GRASS_SHOTS?.split(",");
    for (const shot of SHOTS) {
      if (only !== undefined && !only.includes(shot.name)) continue;
      await capture(connection, shot, path.join(OUT, `${shot.name}.png`));
    }
    connection.close();
  } finally {
    browser.kill();
  }
}

await main();
