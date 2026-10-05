/**
 * Mountain style options on the real board (bead pulp_wars-2yc.1,
 * art/explorations/mountain-styles-2026-10/README.md). For today's look and
 * for each option of the run's options.json, screenshots of the real game
 * (the Ruleset 7 app view and board host, live CHIBI look) over three
 * scenes of scripts/art/chibi/forest-review-scenes.ts: drawn blocks of
 * Mountains (two by three and others), a mountain-heavy window, and a
 * capital with Mines and units on Mountains.
 *
 *   npx vite --port 6593 --strictPort &
 *   CHROME_PATH=... STYLES_GAME_URL=http://localhost:6593/ \
 *     npx tsx scripts/art/mountain-styles-review.ts <out-dir>
 *
 * Nothing is registered as art: while an option is shown, the browser's
 * requests for the massif pieces and the rocky ground are answered with
 * the option's derived files (scripts/art/mountain-styles.ts), and the
 * board's ground treatment (MASSIF_GROUND_V7) is set as the option says.
 * The game's source and `public/` are untouched.
 *
 * Writes `<scene>-<option>.png`, one `board-<option>.png` per option (the
 * option beside today's look, 1x, and the two-by-three block at 3x) and
 * `overview.png` (every option, every scene). No PixelLab call.
 *
 * The sun is at the bottom left (the user, 2026-10-05). Every board shows
 * a sun badge, a strip of a unit, a forest piece, a city and the mountains
 * side by side, and the lighting QA of every piece
 * (scripts/art/lighting-qa.ts); a sample lit from the right stops the run.
 * STYLES_ONLY=a-storybook limits the run; STYLES_COMPOSE=1 only rebuilds
 * the boards from the screenshots already in the directory.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import {
  currentLighting,
  deriveOptionWithLighting,
  loadMountainStyles,
  type MountainStyleOption,
  type PieceLighting,
} from "./mountain-styles";

const OUT = path.resolve(process.argv[2] ?? "mountain-styles-review");
const BASE = process.env.STYLES_GAME_URL ?? "http://localhost:6593/";
const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface Scene {
  readonly name: string;
  readonly title: string;
  readonly fixture: string;
  readonly drag?: readonly [number, number];
  /** The part of the 1440 x 900 page shown on the boards. */
  readonly crop: readonly [number, number, number, number];
}

const SCENES: readonly Scene[] = [
  {
    name: "blocks",
    title: "Blocks: 2 x 3, 3 x 2, a column, a row, a single",
    fixture: "sceneM6",
    drag: [120, 300],
    crop: [400, 275, 720, 560],
  },
  {
    name: "heavy",
    title: "A mountain-heavy area",
    fixture: "sceneM1",
    crop: [240, 180, 960, 642],
  },
  {
    name: "mines",
    title: "A capital with Mines and units on Mountains",
    fixture: "sceneM3",
    drag: [-70, -80],
    crop: [410, 165, 575, 570],
  },
];
/** The two-by-three block of the blocks scene, shown at 3x. */
const ZOOM = [455, 340, 210, 265] as const;

interface Look {
  readonly id: string;
  readonly label: string;
  readonly summary: string;
  readonly option: MountainStyleOption | null;
}

function mountExpression(
  fixture: string,
  massifGround: Readonly<Record<string, unknown>>,
): string {
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const scenes = await import('/scripts/art/chibi/forest-review-scenes.ts');
      const massif = await import('/src/render/canvas/chibi-massif-v7.ts');
      // Since the conversion (option D) the board has no ground treatment.
      if (massif.MASSIF_GROUND_V7 !== undefined)
        Object.assign(massif.MASSIF_GROUND_V7, ${JSON.stringify(massifGround)});
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
      const boardHost = new CanvasBoardHostV7(document, {});
      const view = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
      globalThis.__STYLES_REVIEW__ = { boardHost, view };
    })()`;
}

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  on(method: string, handler: (params: Record<string, unknown>) => void): void;
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
  const handlers = new Map<string, (params: Record<string, unknown>) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      method?: string;
      params?: Record<string, unknown>;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id === undefined) {
      if (message.method !== undefined)
        handlers.get(message.method)?.(message.params ?? {});
      return;
    }
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
    on: (method, handler) => void handlers.set(method, handler),
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
  look: Look,
  file: string,
): Promise<void> {
  const url = new URL(BASE);
  url.searchParams.set("art", "chibi");
  await evaluate(connection, `globalThis.__STYLES_OLD__ = true`).catch(
    () => undefined,
  );
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__STYLES_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    mountExpression(scene.fixture, look.option?.massifGround ?? {}),
  );
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(400);
  await evaluate(
    connection,
    `globalThis.__STYLES_REVIEW__.boardHost.zoom('IN')`,
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

// ------------------------------------------------------------------ boards

const INK = { r: 20, g: 24, b: 26, alpha: 1 };
const GRASS = { r: 138, g: 184, b: 92, alpha: 1 };

function text(
  value: string,
  width: number,
  size: number,
  weight = 400,
  fill = "#f2f2ee",
): Buffer {
  const escaped = value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return Buffer.from(
    `<svg width="${width}" height="${Math.round(size * 1.6)}"><text x="0" y="${Math.round(size * 1.15)}" font-family="Helvetica" font-weight="${weight}" font-size="${size}" fill="${fill}">${escaped}</text></svg>`,
  );
}

/**
 * The sun of the user's rule (2026-10-05): at the bottom left, its light
 * running up and to the right. `size` is the side of the square badge.
 */
function sunBadge(size: number): Buffer {
  const s = size;
  const cx = s * 0.26;
  const cy = s * 0.74;
  const r = s * 0.13;
  const rays = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2;
    return `<line x1="${cx + Math.cos(angle) * r * 1.35}" y1="${cy + Math.sin(angle) * r * 1.35}" x2="${cx + Math.cos(angle) * r * 1.9}" y2="${cy + Math.sin(angle) * r * 1.9}" stroke="#ffd84a" stroke-width="${s * 0.035}" stroke-linecap="round"/>`;
  }).join("");
  return Buffer.from(
    `<svg width="${s}" height="${s}"><rect width="${s}" height="${s}" rx="${s * 0.12}" fill="#14181a" fill-opacity="0.82"/>${rays}<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffd84a"/><line x1="${s * 0.44}" y1="${s * 0.56}" x2="${s * 0.8}" y2="${s * 0.2}" stroke="#ffd84a" stroke-width="${s * 0.05}" stroke-linecap="round"/><polygon points="${s * 0.86},${s * 0.14} ${s * 0.66},${s * 0.2} ${s * 0.8},${s * 0.34}" fill="#ffd84a"/></svg>`,
  );
}

/** Lines of at most `limit` characters, broken at spaces. */
function wrapped(value: string, limit: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of value.split(" ")) {
    if (line !== "" && line.length + word.length + 1 > limit) {
      lines.push(line);
      line = word;
    } else line = line === "" ? word : `${line} ${word}`;
  }
  if (line !== "") lines.push(line);
  return lines;
}

const shot = (scene: Scene, look: Look): string =>
  path.join(OUT, `${scene.name}-${look.id}.png`);
const pieceFile = (look: Look, kind: string): string =>
  path.join(OUT, `piece-${look.id}-${kind}.png`);
const lightingFile = (look: Look): string =>
  path.join(OUT, `lighting-${look.id}.json`);

async function cropOf(
  file: string,
  crop: readonly [number, number, number, number],
  scale = 1,
): Promise<Buffer> {
  return sharp(file)
    .extract({ left: crop[0], top: crop[1], width: crop[2], height: crop[3] })
    .resize(Math.round(crop[2] * scale), Math.round(crop[3] * scale), {
      kernel: scale >= 1 ? "nearest" : "lanczos3",
    })
    .png()
    .toBuffer();
}

const signed = (value: number): string =>
  `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;

/** What the lighting QA found for a look, in lines for a board. */
function lightingLines(
  pieces: readonly PieceLighting[],
  today: boolean,
): string[] {
  const left = pieces.filter((piece) => piece.verdict === "LEFT");
  const right = pieces.filter((piece) => piece.verdict === "RIGHT");
  const short = (piece: PieceLighting): string =>
    `${piece.source.replace(/^chibi-mountain-range-/, "").replace(/\.png$/, "")} ${signed(piece.lighting.faces)}`;
  const head = `Lighting QA (left half minus right half of every rock face, luma points; + is lit from the left): ${left.length} of ${pieces.length} ${today ? "pieces" : "distinct samples"} lit from the left, ${right.length} from the right.`;
  return today
    ? [
        head,
        right.length === 0
          ? "No piece is lit from the right."
          : `Lit from the right (the mirrored variants of the set): ${right.map(short).join(", ")}.`,
      ]
    : [head, pieces.map(short).join(", ")];
}

/**
 * A unit, a forest piece, a city, today's tall mountain and the look's, 3x
 * on Grass, with the sun: is the mountain lit like the rest?
 */
async function lightStrip(
  root: string,
  current: Look,
  look: Look,
): Promise<Buffer> {
  const k = 3;
  const files = [
    path.join(root, "public/assets/chibi/units/chibi-dinosaur-caveman.png"),
    path.join(root, "public/assets/chibi/forest/chibi-forest-piece-1x1-b.png"),
    path.join(root, "public/assets/chibi/settlements/chibi-city-1.png"),
    pieceFile(current, "tall1"),
    pieceFile(look, "low1"),
    pieceFile(look, "tall1"),
  ];
  const labels = [
    "a unit",
    "a forest piece",
    "a city",
    "today's mountain",
    "this option",
    "",
  ];
  const parts: OverlayOptions[] = [];
  const badge = 96;
  let x = badge + 28;
  let height = 0;
  const sized: { input: Buffer; width: number; height: number }[] = [];
  for (const file of files) {
    const trimmed = await sharp(file).trim({ threshold: 0 }).toBuffer();
    const meta = await sharp(trimmed).metadata();
    const width = (meta.width ?? 0) * k;
    const tall = (meta.height ?? 0) * k;
    sized.push({
      input: await sharp(trimmed)
        .resize(width, tall, { kernel: "nearest" })
        .toBuffer(),
      width,
      height: tall,
    });
    height = Math.max(height, tall);
  }
  for (const [index, image] of sized.entries()) {
    parts.push({
      input: image.input,
      left: x,
      top: 12 + height - image.height,
    });
    const label = labels[index] ?? "";
    if (label !== "")
      parts.push({
        input: text(label, 260, 15, 700, "#10210f"),
        left: x,
        top: 18 + height,
      });
    x += image.width + 28;
  }
  parts.push({ input: sunBadge(badge), left: 12, top: 12 + height - badge });
  return sharp({
    create: { width: x, height: height + 48, channels: 4, background: GRASS },
  })
    .composite(parts)
    .png()
    .toBuffer();
}

/** One option beside today's look: every scene at 1x, the block at 3x. */
async function board(
  root: string,
  current: Look,
  look: Look,
  notes: string[],
  lighting: ReadonlyMap<string, readonly PieceLighting[]>,
): Promise<void> {
  const pad = 20;
  const gap = 12;
  const columns = Math.max(...SCENES.map((scene) => scene.crop[2]));
  const width = pad * 2 + columns * 2 + gap;
  const composites: OverlayOptions[] = [];
  let y = pad;
  composites.push({
    input: text(look.label, width, 34, 700),
    left: pad,
    top: y,
  });
  y += 56;
  const lines = [
    ...wrapped(look.summary, 170),
    ...notes,
    ...lightingLines(lighting.get(look.id) ?? [], false).flatMap((line) =>
      wrapped(line, 170),
    ),
    ...lightingLines(lighting.get(current.id) ?? [], true).flatMap((line) =>
      wrapped(`Today: ${line}`, 170),
    ),
  ];
  for (const line of lines) {
    composites.push({ input: text(line, width, 17), left: pad, top: y });
    y += 26;
  }
  y += 10;
  composites.push({
    input: text(
      "The sun is in the south-west, at the bottom left: lit faces on the left, shadow faces on the right",
      width,
      20,
      700,
    ),
    left: pad,
    top: y,
  });
  y += 34;
  const strip = await lightStrip(root, current, look);
  composites.push({ input: strip, left: pad, top: y });
  y += ((await sharp(strip).metadata()).height ?? 0) + 24;
  const heading = (title: string): void => {
    composites.push({ input: text(title, width, 20, 700), left: pad, top: y });
    y += 34;
    composites.push({ input: text("TODAY", 300, 15, 700), left: pad, top: y });
    composites.push({
      input: text(look.label.toUpperCase(), 600, 15, 700),
      left: pad + columns + gap,
      top: y,
    });
    y += 24;
  };
  heading("The two-by-three block, enlarged 3x");
  const badge = sunBadge(72);
  for (const [index, side] of [current, look].entries()) {
    const left = pad + index * (columns + gap);
    composites.push({
      input: await cropOf(shot(SCENES[0] as Scene, side), ZOOM, 3),
      left,
      top: y,
    });
    composites.push({
      input: badge,
      left: left + 8,
      top: y + ZOOM[3] * 3 - 80,
    });
  }
  y += ZOOM[3] * 3 + 24;
  for (const scene of SCENES) {
    heading(`${scene.title} (1x)`);
    for (const [index, side] of [current, look].entries()) {
      const left = pad + index * (columns + gap);
      composites.push({
        input: await cropOf(shot(scene, side), scene.crop),
        left,
        top: y,
      });
      composites.push({
        input: sunBadge(48),
        left: left + 6,
        top: y + scene.crop[3] - 54,
      });
    }
    y += scene.crop[3] + 24;
  }
  const out = path.join(OUT, `board-${look.id}.png`);
  await sharp({
    create: { width, height: y + pad, channels: 4, background: INK },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

/** Every look in a column, every scene in a row, at 60%. */
async function overview(
  looks: readonly Look[],
  lighting: ReadonlyMap<string, readonly PieceLighting[]>,
): Promise<void> {
  const scale = 0.6;
  const pad = 20;
  const gap = 10;
  const column = Math.round(
    Math.max(...SCENES.map((scene) => scene.crop[2])) * scale,
  );
  const width = pad * 2 + looks.length * column + (looks.length - 1) * gap;
  const composites: OverlayOptions[] = [];
  let y = pad;
  composites.push({
    input: text(
      `Mountain styles, round 2: today and ${looks.length - 1} options, the sun at the bottom left`,
      width,
      30,
      700,
    ),
    left: pad,
    top: y,
  });
  composites.push({
    input: sunBadge(56),
    left: width - pad - 56,
    top: pad - 6,
  });
  y += 56;
  for (const [index, look] of looks.entries()) {
    const pieces = lighting.get(look.id) ?? [];
    const right = pieces.filter((piece) => piece.verdict === "RIGHT").length;
    composites.push({
      input: text(look.label, column, 19, 700),
      left: pad + index * (column + gap),
      top: y,
    });
    composites.push({
      input: text(
        `lit from the left: ${pieces.length - right} of ${pieces.length}${right > 0 ? `, from the right: ${right}` : ""}`,
        column,
        14,
        400,
        right > 0 ? "#ff9d8a" : "#b9e3a8",
      ),
      left: pad + index * (column + gap),
      top: y + 28,
    });
  }
  y += 58;
  for (const scene of SCENES) {
    for (const [index, look] of looks.entries())
      composites.push({
        input: await cropOf(shot(scene, look), scene.crop, scale),
        left: pad + index * (column + gap),
        top: y,
      });
    y += Math.round(scene.crop[3] * scale) + gap;
  }
  const out = path.join(OUT, "overview.png");
  await sharp({
    create: { width, height: y + pad, channels: 4, background: INK },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

/** The look's files, its sample pieces for the light strip and its QA. */
async function prepare(
  root: string,
  look: Look,
): Promise<ReadonlyMap<string, Buffer>> {
  const derived =
    look.option === null
      ? {
          files: new Map<string, Buffer>(),
          lighting: await currentLighting(root),
        }
      : await deriveOptionWithLighting(root, look.option);
  await writeFile(
    lightingFile(look),
    JSON.stringify(derived.lighting, null, 2),
  );
  for (const [kind, name] of [
    ["low1", "chibi-mountain-range-1x1-a.png"],
    ["tall1", "chibi-mountain-range-1x1-tall-a.png"],
    ["low2", "chibi-mountain-range-2x1-a.png"],
  ] as const)
    await writeFile(
      pieceFile(look, kind),
      derived.files.get(name) ??
        (await readFile(
          path.join(root, "public/assets/chibi/mountains", name),
        )),
    );
  return derived.files;
}

async function main(): Promise<void> {
  const root = process.cwd();
  await mkdir(OUT, { recursive: true });
  const styles = await loadMountainStyles(root);
  const current: Look = {
    id: "today",
    label: "Today",
    summary: "The massif set in the game now.",
    option: null,
  };
  const looks: Look[] = [
    current,
    ...styles.options.map((option) => ({
      id: option.id,
      label: option.label,
      summary: option.summary,
      option,
    })),
  ];
  const only = process.env.STYLES_ONLY?.split(",");
  if (process.env.STYLES_COMPOSE !== "1") {
    const chrome = process.env.CHROME_PATH;
    if (!chrome) throw new Error("Set CHROME_PATH");
    const port = 10_600 + (process.pid % 80);
    const profile = await mkdtemp(path.join(tmpdir(), "styles-game-"));
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
      for (
        let attempt = 0;
        attempt < 150 && target === undefined;
        attempt += 1
      ) {
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
      await connection.send("Network.enable");
      await connection.send("Network.setCacheDisabled", {
        cacheDisabled: true,
      });
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      // The option's files answer the board's requests for the massif set.
      let served: ReadonlyMap<string, Buffer> = new Map();
      connection.on("Fetch.requestPaused", (params) => {
        const requestId = params.requestId as string;
        const requested = (params.request as { url: string }).url;
        const name = path.basename(new URL(requested).pathname);
        const bytes = served.get(name);
        void (
          bytes === undefined
            ? connection.send("Fetch.continueRequest", { requestId })
            : connection.send("Fetch.fulfillRequest", {
                requestId,
                responseCode: 200,
                responseHeaders: [
                  { name: "Content-Type", value: "image/png" },
                  { name: "Cache-Control", value: "no-store" },
                ],
                body: bytes.toString("base64"),
              })
        ).catch(() => undefined);
      });
      await connection.send("Fetch.enable", {
        patterns: [
          { urlPattern: "*/assets/chibi/mountains/*" },
          { urlPattern: "*chibi-mountain-ground-1.png*" },
        ],
      });
      for (const look of looks) {
        if (only !== undefined && !only.includes(look.id)) continue;
        served = await prepare(root, look);
        for (const scene of SCENES)
          await capture(connection, scene, look, shot(scene, look));
      }
      connection.close();
    } finally {
      browser.kill();
    }
  }
  const byOption = await readFile(
    path.join(root, "art/explorations/mountain-styles-2026-10/notes.json"),
    "utf8",
  ).then(
    (value) => JSON.parse(value) as Record<string, string[]>,
    () => ({}) as Record<string, string[]>,
  );
  const lighting = new Map<string, readonly PieceLighting[]>();
  for (const look of looks)
    lighting.set(
      look.id,
      JSON.parse(await readFile(lightingFile(look), "utf8")) as PieceLighting[],
    );
  for (const look of looks.slice(1))
    await board(
      root,
      current,
      look,
      (byOption[look.id] ?? []).flatMap((note) => wrapped(note, 170)),
      lighting,
    );
  await overview(looks, lighting);
}

await main();
