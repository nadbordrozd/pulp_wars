/**
 * Screenshots of the real game for the victory-wave review (bead
 * pulp_wars-556y, docs/art/VICTORY_WAVE.md): the Ruleset 7 app view and
 * board host, live CHIBI look, over the hand-built states of
 * scripts/art/victory-wave/review-scenes.ts. No AI match is played and no
 * PixelLab call is made.
 *
 *   npx vite --port 6255 --strictPort &
 *   CHROME_PATH=... VICTORY_WAVE_URL=http://localhost:6255/ \
 *     npx tsx scripts/art/victory-wave/review.ts <out-dir>
 *
 * For each shot: the board a moment before the win (`<name>-before.png`),
 * the wave held at several times after its start (`<name>-<ms>.png`), and
 * the board in the winner's skin behind the Victory dialog once the wave
 * has landed (`<name>-dialog.png`). `<name>-strip.png` puts them side by
 * side. The `cost` shot writes the drawing time of every frame of a wave
 * over a 25 x 25 map of eight seats to `cost.json`.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import type { VictorySceneOptions } from "./review-scenes";

interface Shot {
  readonly name: string;
  readonly scene: Omit<VictorySceneOptions, "stage">;
  readonly page: "DESKTOP" | "PHONE";
  readonly reducedMotion?: boolean;
  /** The wave held at these times (ms after its start). */
  readonly frames: readonly number[];
  /** Measure the cost of the wave's frames instead of shooting them. */
  readonly cost?: boolean;
}

const WAVE_FRAMES = [120, 360, 600, 840, 1100] as const;

const SHOTS: readonly Shot[] = [
  ...(["DESKTOP", "PHONE"] as const).flatMap((page): Shot[] => [
    {
      name: `human-${page.toLowerCase()}`,
      scene: { faction: "ORIGINAL", rival: "UNDEAD", byScore: true },
      page,
      frames: WAVE_FRAMES,
    },
    {
      name: `martian-${page.toLowerCase()}`,
      scene: { faction: "MARTIAN", rival: "UNDEAD" },
      page,
      frames: WAVE_FRAMES,
    },
    {
      name: `candy-${page.toLowerCase()}`,
      scene: { faction: "CANDY", rival: "DINOSAUR" },
      page,
      frames: WAVE_FRAMES,
    },
    {
      name: `reduced-${page.toLowerCase()}`,
      scene: { faction: "MARTIAN", rival: "UNDEAD" },
      page,
      reducedMotion: true,
      frames: [0, 225, 440],
    },
    {
      name: `reduced-human-${page.toLowerCase()}`,
      scene: { faction: "ORIGINAL", rival: "UNDEAD", byScore: true },
      page,
      reducedMotion: true,
      frames: [0, 225, 440],
    },
  ]),
  // The other five factions' skins, on the desktop (the Ice Folk win by
  // the score, so a rival's land is seen under Snow).
  ...(
    [
      ["undead", "UNDEAD", "GOBLIN", false],
      ["goblin", "GOBLIN", "ORIGINAL", false],
      ["dinosaur", "DINOSAUR", "MARTIAN", false],
      ["dwarf", "DWARF", "CANDY", false],
      ["ice-folk", "ICE_FOLK", "UNDEAD", true],
    ] as const
  ).map(([name, faction, rival, byScore]): Shot => ({
    name: `${name}-desktop`,
    scene: { faction, rival, ...(byScore ? { byScore: true } : {}) },
    page: "DESKTOP",
    frames: WAVE_FRAMES,
  })),
  {
    name: "cost",
    scene: { faction: "CANDY", large: true },
    page: "DESKTOP",
    frames: [],
    cost: true,
  },
];

const PAGES = {
  DESKTOP: { width: 1440, height: 900, scale: 1, mobile: false },
  PHONE: { width: 390, height: 844, scale: 2, mobile: true },
} as const;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Replaces the running app with the app view over the scene, before the win. */
function mountExpression(scene: Shot["scene"]): string {
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const scenes = await import('/scripts/art/victory-wave/review-scenes.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      const options = ${JSON.stringify(scene)};
      let state = scenes.victoryScene({ ...options, stage: 'BEFORE' });
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        const over = state.outcome !== null;
        return { phase: over ? 'COMPLETE' : 'ACTIVE', view, offeredCommands: over ? [] : engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const subscribers = new Set();
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
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
        campaignProgress() { return { completed: [], lastWin: null }; },
      };
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
      globalThis.vw = {
        boardHost,
        view,
        /** The viewer wins, as the app sees an accepted winning command. */
        win() {
          state = scenes.victoryScene({ ...options, stage: 'WON' });
          const next = snapshot();
          for (const subscriber of subscribers) subscriber(next);
        },
      };
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
  attempts = 400,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
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

async function screenshot(connection: Connection, file: string): Promise<void> {
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  await writeFile(file, Buffer.from(result.data, "base64"));
  console.log(`wrote ${file}`);
}

const DIALOG = `document.querySelector('[data-v7-region="results"]') !== null`;

async function shoot(
  connection: Connection,
  base: string,
  out: string,
  shot: Shot,
): Promise<void> {
  const page = PAGES[shot.page];
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: page.width,
    height: page.height,
    deviceScaleFactor: page.scale,
    mobile: page.mobile,
  });
  await connection.send("Emulation.setEmulatedMedia", {
    features: [
      {
        name: "prefers-reduced-motion",
        value: shot.reducedMotion === true ? "reduce" : "no-preference",
      },
    ],
  });
  const url = new URL(base);
  url.searchParams.set("art", "chibi");
  await evaluate(connection, `globalThis.__VW_OLD__ = true`).catch(
    () => undefined,
  );
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__VW_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(connection, mountExpression(shot.scene));
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  // Art loads asynchronously and redraws the board.
  await delay(2600);
  if (shot.cost === true) {
    await writeFile(
      path.join(out, "cost.json"),
      JSON.stringify(await evaluate(connection, COST), null, 2),
    );
    console.log(`wrote ${path.join(out, "cost.json")}`);
    return;
  }
  await screenshot(connection, path.join(out, `${shot.name}-before.png`));
  // The win; the first frames are held so each shot is exact.
  await evaluate(
    connection,
    `globalThis.vw.win(); globalThis.vw.boardHost.pinVictoryWave(0)`,
  );
  const state = await evaluate<unknown>(
    connection,
    `globalThis.vw.boardHost.victoryWaveState()`,
  );
  await writeFile(
    path.join(out, `${shot.name}.json`),
    JSON.stringify(state, null, 2),
  );
  for (const ms of shot.frames) {
    await evaluate(connection, `globalThis.vw.boardHost.pinVictoryWave(${ms})`);
    await delay(150);
    await screenshot(
      connection,
      path.join(out, `${shot.name}-${String(ms).padStart(4, "0")}.png`),
    );
  }
  // Let it run: the dialog follows the wave.
  await evaluate(connection, `globalThis.vw.boardHost.pinVictoryWave(null)`);
  await waitFor(connection, DIALOG, 300);
  await delay(500);
  await screenshot(connection, path.join(out, `${shot.name}-dialog.png`));
  // And the board behind it, the dialog put aside for a look.
  await evaluate(
    connection,
    `document.querySelectorAll('[data-v7-region="results"], .v7-scrim, .v7-modal-scrim').forEach((element) => { element.style.visibility = 'hidden'; })`,
  );
  await delay(150);
  await screenshot(connection, path.join(out, `${shot.name}-after.png`));
}

/** Draws the whole wave frame by frame on the 25 x 25 map, timing each. */
const COST = `(async () => {
  const host = globalThis.vw.boardHost;
  const stats = (values) => { const sorted = [...values].sort((a, b) => a - b); return { frames: values.length, meanMs: +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2), p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(2), maxMs: +sorted[sorted.length - 1].toFixed(2) }; };
  const still = [];
  for (let i = 0; i < 30; i += 1) { const t = performance.now(); host.pinTerrainRipple(null); still.push(performance.now() - t); }
  globalThis.vw.win();
  host.pinVictoryWave(0);
  const wave = [];
  for (let ms = 0; ms <= 2600; ms += 16) { const t = performance.now(); host.pinVictoryWave(ms); wave.push(performance.now() - t); }
  const after = [];
  for (let i = 0; i < 30; i += 1) { const t = performance.now(); host.pinVictoryWave(5000); after.push(performance.now() - t); }
  const canvas = document.querySelector('canvas.board-canvas-v7');
  return { board: '25 x 25, eight seats, every cell explored', canvas: [canvas.width, canvas.height], state: host.victoryWaveState(), stillBoard: stats(still), duringWave: stats(wave), skinnedBoard: stats(after) };
})()`;

const label = (text: string, width: number): Buffer =>
  Buffer.from(
    `<svg width="${width}" height="30"><text x="2" y="21" font-family="Helvetica" font-weight="700" font-size="18" fill="#f2f2ee">${text}</text></svg>`,
  );

/** The shots of one name side by side, scaled to `height`. */
async function strip(out: string, shot: Shot): Promise<void> {
  const names = [
    "before",
    ...shot.frames.map((ms) => String(ms).padStart(4, "0")),
    "dialog",
    "after",
  ];
  const height = shot.page === "PHONE" ? 640 : 420;
  const tiles = await Promise.all(
    names.map(async (name) => {
      const image = sharp(path.join(out, `${shot.name}-${name}.png`)).resize({
        height,
        kernel: "lanczos3",
      });
      const buffer = await image.png().toBuffer();
      const meta = await sharp(buffer).metadata();
      return { name, buffer, width: meta.width ?? height };
    }),
  );
  const gap = 10;
  const composites: OverlayOptions[] = [];
  let left = 0;
  for (const tile of tiles) {
    composites.push({ input: label(tile.name, tile.width), left, top: 0 });
    composites.push({ input: tile.buffer, left, top: 32 });
    left += tile.width + gap;
  }
  await sharp({
    create: {
      width: left - gap,
      height: height + 32,
      channels: 4,
      background: { r: 20, g: 24, b: 26, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(out, `${shot.name}-strip.png`));
  console.log(`wrote ${path.join(out, `${shot.name}-strip.png`)}`);
}

async function main(): Promise<void> {
  const [outArgument] = process.argv.slice(2);
  if (outArgument === undefined) throw new Error("usage: review.ts <out-dir>");
  const out = path.resolve(outArgument);
  const base = process.env.VICTORY_WAVE_URL ?? "http://localhost:6255/";
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  await mkdir(out, { recursive: true });
  const port = 10_700 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "victory-wave-"));
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
    const only = process.env.VICTORY_WAVE_SHOTS?.split(",");
    for (const shot of SHOTS) {
      if (only !== undefined && !only.includes(shot.name)) continue;
      await shoot(connection, base, out, shot);
      if (shot.cost !== true) await strip(out, shot);
    }
    connection.close();
  } finally {
    browser.kill();
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
)
  await main();
