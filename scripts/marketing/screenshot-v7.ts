import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import { MARKETING_SCENE_V7 } from "../../tests/fixtures/v7-marketing-scene";
import {
  MARKETING_TAKE2_V7,
  MARKETING_TAKE3_V7,
} from "../../tests/fixtures/v7-marketing-takes";
import { ruleset7FixtureMountExpressionV7 } from "../browser-undead-fixture-v7";

/**
 * Marketing screenshots (beads pulp_wars-mxwn, pulp_wars-n3lv): the
 * three-way war of `tests/fixtures/v7-marketing-scene.ts` (the Martians,
 * the player, against the Undead and the Dinosaurs in round 19, on the
 * generator's Pangea board of seed 24) mounted in the real game UI (the
 * chibi art set, the current HUD) and captured in muted headless Chrome
 * with the game's sound and music off. Nothing is simulated: no AI turn
 * runs and no command is sent. The landscape and portrait shots select the
 * Tripod, so its moves and its attack on a Raptor (with the preview) show
 * on the board and the unit dock is open; the close-up selects nothing. It
 * needs the Vite dev server, because the scene is imported from
 * `tests/fixtures`.
 *
 * Usage:
 *   tsx scripts/marketing/screenshot-v7.ts http://localhost:6173/
 *     [--out=<dir>] (default art/marketing) [--only=1920x1080,...]
 *     [--keep-raw] (also the uncropped DPR-2 captures)
 *   Framing experiments: [--select=x,y|none] [--centre=x,y] [--zoom=<steps>]
 *     [--css=<width>x<height>]
 *
 * Each shot is captured at devicePixelRatio 2 and scaled down (Lanczos) to
 * its target size, which keeps the pixel art crisp and the HUD text sharp.
 * The first-steps coach is off and no developer option is on, so no
 * tutorial cue or developer chip shows.
 */

interface Shot {
  /** File name stem in the output directory. */
  readonly name: string;
  /** The CSS viewport the game lays out in. */
  readonly css: { readonly width: number; readonly height: number };
  /** The phone layout (touch, mobile viewport). */
  readonly mobile: boolean;
  /** The final image size. */
  readonly out: { readonly width: number; readonly height: number };
  /**
   * The board point to put at the centre of the viewport, in tile
   * coordinates of tile centres; fractional tiles are fine.
   */
  readonly centre: { readonly x: number; readonly y: number };
  /**
   * Zoom steps from the layout's default zoom (0.75 at these widths):
   * positive in, negative out.
   */
  readonly zoom: number;
  /** The unit to select (its tile), or null for none. */
  readonly select: { readonly x: number; readonly y: number } | null;
  /**
   * Without a selection: a CSS point outside the crop to tap (then Escape),
   * which takes the board's cursor box off the capital (default none).
   */
  readonly letGo?: { readonly x: number; readonly y: number };
  /** A crop of the capture, in CSS px, before scaling (default none). */
  readonly crop?: {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

type SceneId = "v2" | "take2" | "take3";

/** How long the title screen's intro takes to settle. */
const TITLE_SETTLE_MILLISECONDS = 6_000;

/** A scene: the fixture the browser mounts and the shots taken of it. */
interface Scene {
  /** The fixture module, as the dev server serves it. */
  readonly module: string;
  /** The state function the module exports. */
  readonly fixture: string;
  readonly shots: readonly Shot[];
}

const PREFIX = "pulp-wars-martians-vs-undead-dinosaurs";

const SCENES: Readonly<Record<SceneId, Scene>> = {
  // v2 (pulp_wars-n3lv): Pangea seed 24, the Tripod's strike on a Raptor.
  v2: {
    module: "/tests/fixtures/v7-marketing-scene.ts",
    fixture: "marketingSceneStateV7",
    shots: [
      // Landscape for posts: zoom 1 (80 px tiles), all five cities, the
      // front in the middle, the fog's ragged edge in the east and
      // south-west.
      {
        name: `${PREFIX}-1920x1080`,
        css: { width: 1600, height: 900 },
        mobile: false,
        out: { width: 1920, height: 1080 },
        centre: { x: 9.5, y: 10.6 },
        zoom: 1,
        select: MARKETING_SCENE_V7.tripod,
      },
      // Portrait (4:5) for Instagram-style posts at zoom 0.75: four cities
      // (the harbour is off the west edge), the board from fog to fog.
      {
        name: `${PREFIX}-1080x1350`,
        css: { width: 900, height: 1125 },
        mobile: false,
        out: { width: 1080, height: 1350 },
        centre: { x: 9.5, y: 10.3 },
        zoom: 0,
        select: MARKETING_SCENE_V7.tripod,
      },
      // A close-up of the front line at zoom 1.5, below the HUD, nothing
      // selected (so no dock): the link-card size.
      {
        name: `${PREFIX}-1200x675`,
        css: { width: 1600, height: 900 },
        mobile: false,
        out: { width: 1200, height: 675 },
        centre: { x: 10.3, y: 10.5 },
        zoom: 2,
        select: null,
        letGo: { x: 1590, y: 450 },
        crop: { left: 80, top: 70, width: 1440, height: 810 },
      },
    ],
  },
  // Take 2 (pulp_wars-vbi9): Lakes seed 13, the siege of the Undead city
  // across the isthmus, a Saucer's strike on a Skeleton.
  take2: {
    module: "/tests/fixtures/v7-marketing-takes.ts",
    fixture: "marketingTake2StateV7",
    shots: [
      {
        name: `${PREFIX}-take2-1920x1080`,
        css: { width: 1600, height: 900 },
        mobile: false,
        out: { width: 1920, height: 1080 },
        centre: { x: 10.3, y: 8.4 },
        zoom: 1,
        select: MARKETING_TAKE2_V7.saucer,
      },
      {
        name: `${PREFIX}-take2-1200x675`,
        css: { width: 1600, height: 900 },
        mobile: false,
        out: { width: 1200, height: 675 },
        centre: { x: 12.2, y: 6.3 },
        zoom: 2,
        select: null,
        letGo: { x: 1595, y: 450 },
        crop: { left: 0, top: 70, width: 1440, height: 810 },
      },
    ],
  },
  // Take 3 (pulp_wars-vbi9): Continents seed 14, see the fixture.
  take3: {
    module: "/tests/fixtures/v7-marketing-takes.ts",
    fixture: "marketingTake3StateV7",
    shots: [
      {
        name: `${PREFIX}-take3-1920x1080`,
        css: { width: 1600, height: 900 },
        mobile: false,
        out: { width: 1920, height: 1080 },
        centre: { x: 10.5, y: 5.8 },
        zoom: 1,
        select: MARKETING_TAKE3_V7.selected,
      },
      {
        name: `${PREFIX}-take3-1200x675`,
        css: { width: 1600, height: 900 },
        mobile: false,
        out: { width: 1200, height: 675 },
        centre: { x: 13.5, y: 4.7 },
        zoom: 2,
        select: null,
        letGo: { x: 1595, y: 450 },
        crop: { left: 0, top: 70, width: 1440, height: 810 },
      },
    ],
  },
};

/**
 * The title screen (pulp_wars-vbi9): the main menu as a new player first
 * sees it, on fresh storage (no save to resume, no online room), sound and
 * music off.
 */
const TITLE_SHOTS: readonly Shot[] = [
  {
    name: "pulp-wars-title-screen-1920x1080",
    css: { width: 1600, height: 900 },
    mobile: false,
    out: { width: 1920, height: 1080 },
    centre: { x: 0, y: 0 },
    zoom: 0,
    select: null,
  },
  {
    name: "pulp-wars-title-screen-1080x1350",
    css: { width: 864, height: 1080 },
    mobile: false,
    out: { width: 1080, height: 1350 },
    centre: { x: 0, y: 0 },
    zoom: 0,
    select: null,
  },
  {
    name: "pulp-wars-title-screen-1200x675",
    css: { width: 1600, height: 900 },
    mobile: false,
    out: { width: 1200, height: 675 },
    centre: { x: 0, y: 0 },
    zoom: 0,
    select: null,
  },
];

const DPR = 2;
const args = process.argv.slice(2);
const baseUrl = new URL(
  args.find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const outDirectory = path.resolve(
  args.find((argument) => argument.startsWith("--out="))?.slice(6) ??
    "art/marketing",
);
const only = args
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length)
  .split(",");
/** `--scene=v2,take2,take3,title` or `--scene=all` (default v2). */
const sceneArgument =
  args
    .find((argument) => argument.startsWith("--scene="))
    ?.slice("--scene=".length) ?? "v2";
const scenes: readonly (SceneId | "title")[] =
  sceneArgument === "all"
    ? ["v2", "take2", "take3", "title"]
    : sceneArgument.split(",").map((part) => {
        if (
          part !== "v2" &&
          part !== "take2" &&
          part !== "take3" &&
          part !== "title"
        )
          throw new Error(`Unknown scene ${part}`);
        return part;
      });
/** `--select=x,y` or `--select=none`: try another selection. */
const selectArgument = args
  .find((argument) => argument.startsWith("--select="))
  ?.slice("--select=".length);
const selectOverride =
  selectArgument === undefined
    ? undefined
    : selectArgument === "none"
      ? null
      : {
          x: Number(selectArgument.split(",")[0]),
          y: Number(selectArgument.split(",")[1]),
        };
/** `--centre=x,y`: try another framing. */
const centreArgument = args
  .find((argument) => argument.startsWith("--centre="))
  ?.slice("--centre=".length);
const centreOverride =
  centreArgument === undefined
    ? undefined
    : {
        x: Number(centreArgument.split(",")[0]),
        y: Number(centreArgument.split(",")[1]),
      };
/** `--zoom=<steps>` and `--css=<width>x<height>`: try another scale. */
const zoomArgument = args
  .find((argument) => argument.startsWith("--zoom="))
  ?.slice("--zoom=".length);
const zoomOverride =
  zoomArgument === undefined ? undefined : Number(zoomArgument);
const cssArgument = args
  .find((argument) => argument.startsWith("--css="))
  ?.slice("--css=".length);
const cssOverride =
  cssArgument === undefined
    ? undefined
    : {
        width: Number(cssArgument.split("x")[0]),
        height: Number(cssArgument.split("x")[1]),
      };
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : process.platform === "win32"
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      : "google-chrome");
const GLOBAL = "globalThis.__MARKETING_SHOT__";

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

await mkdir(outDirectory, { recursive: true });
const port = 10_900 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-marketing-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--mute-audio",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--force-color-profile=srgb",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "--window-size=1440,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const errors: string[] = [];

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  const wanted = (shot: Shot): boolean =>
    only === undefined || only.some((part) => shot.name.includes(part));
  for (const id of scenes) {
    if (id === "title") {
      for (const shot of TITLE_SHOTS.filter(wanted))
        await captureTitle(connection, shot);
      continue;
    }
    const scene = SCENES[id];
    for (const shot of scene.shots.filter(wanted))
      await captureShot(connection, scene, shot);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  connection.close();
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/**
 * The title screen: fresh storage (no save, no online room, no developer
 * option), sound and music off, the main menu after its intro has played.
 */
async function captureTitle(connection: Connection, shot: Shot): Promise<void> {
  const css = cssOverride ?? shot.css;
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: css.width,
    height: css.height,
    deviceScaleFactor: DPR,
    mobile: shot.mobile,
  });
  await navigate(connection, baseUrl.href);
  await evaluate(
    connection,
    `(() => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 }));
      localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 }));
    })()`,
  );
  await navigate(connection, baseUrl.href);
  await waitFor(connection, `globalThis.__PULP_WARS_APP__ !== undefined`);
  await delay(TITLE_SETTLE_MILLISECONDS);
  await save(connection, shot);
}

async function captureShot(
  connection: Connection,
  scene: Scene,
  shot: Shot,
): Promise<void> {
  const css = cssOverride ?? shot.css;
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: css.width,
    height: css.height,
    deviceScaleFactor: DPR,
    mobile: shot.mobile,
  });
  await connection.send("Emulation.setTouchEmulationEnabled", {
    enabled: shot.mobile,
  });
  await navigate(connection, baseUrl.href);
  await waitFor(connection, `globalThis.__PULP_WARS_APP__ !== undefined`);
  // The game's sound and music stay off (Chrome is muted too), and the
  // first-steps coach is off, as for a player past their first games.
  await evaluate(
    connection,
    `(async () => {
      localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 }));
      localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 }));
      const steps = await import('/src/render/first-steps-v7.ts');
      localStorage.setItem(steps.FIRST_STEPS_STORAGE_KEY_V7, steps.serializeFirstStepsProgressV7(steps.setFirstStepsEnabledV7(false)));
    })()`,
    true,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: scene.module,
      fixture: scene.fixture,
      global: "__MARKETING_SHOT__",
      extras: "",
      settingsStorage: "localStorage",
    }),
    true,
  );
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(1_500);
  const zoom = zoomOverride ?? shot.zoom;
  for (let step = 0; step < Math.abs(zoom); step += 1) {
    await evaluate(
      connection,
      `${GLOBAL}.boardHost.zoom('${zoom > 0 ? "IN" : "OUT"}')`,
    );
    await delay(400);
  }
  console.log(
    `${shot.name}: tile ${String(
      await evaluate(
        connection,
        `(() => { const host = ${GLOBAL}.boardHost; return host.cellCentreCssPx({ x: 1, y: 0 }).x - host.cellCentreCssPx({ x: 0, y: 0 }).x; })()`,
      ),
    )} CSS px`,
  );
  // Select the shot's unit: its moves and attack targets on the board, the
  // unit dock open.
  const select = selectOverride ?? shot.select;
  if (select !== null) {
    await evaluate(
      connection,
      `(() => { const host = ${GLOBAL}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(select)}); })()`,
    );
    await delay(800);
  }
  await frame(connection, shot);
  if (shot.letGo !== undefined) {
    // A tap outside the crop moves the cursor there, as a player's tap
    // would, so no cursor box sits on the capital; Escape then closes the
    // tapped tile's dock.
    await drag(connection, shot.letGo, shot.letGo);
    await delay(600);
    await evaluate(
      connection,
      `(() => { for (let index = 0; index < 3; index += 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); })()`,
    );
    await delay(900);
  }
  await delay(1_200);
  await save(connection, shot);
}

/** Captures the page and writes the shot, cropped and scaled. */
async function save(connection: Connection, shot: Shot): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  const raw = Buffer.from(response.data, "base64");
  const rawPath = path.join(outDirectory, `${shot.name}@raw.png`);
  if (args.includes("--keep-raw")) await writeFile(rawPath, raw);
  let image = sharp(raw);
  if (shot.crop !== undefined)
    image = image.extract({
      left: shot.crop.left * DPR,
      top: shot.crop.top * DPR,
      width: shot.crop.width * DPR,
      height: shot.crop.height * DPR,
    });
  const file = path.join(outDirectory, `${shot.name}.png`);
  await image
    .resize(shot.out.width, shot.out.height, {
      fit: "fill",
      kernel: "lanczos3",
    })
    .png({ compressionLevel: 9 })
    .toFile(file);
  console.log(`wrote ${file}`);
}

/**
 * Pans the board so the shot's centre tile sits in the middle of the
 * viewport: a mouse drag on the canvas by the distance between the tile's
 * current centre and the viewport's.
 */
async function frame(connection: Connection, shotInput: Shot): Promise<void> {
  const shot = { ...shotInput, centre: centreOverride ?? shotInput.centre };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const at = (await evaluate(
      connection,
      `(() => { const host = ${GLOBAL}.boardHost; const a = host.cellCentreCssPx({ x: ${Math.floor(shot.centre.x)}, y: ${Math.floor(shot.centre.y)} }); const b = host.cellCentreCssPx({ x: ${Math.floor(shot.centre.x) + 1}, y: ${Math.floor(shot.centre.y) + 1} }); const rect = document.querySelector('canvas.board-canvas-v7').getBoundingClientRect(); return { x: a.x + (b.x - a.x) * ${shot.centre.x % 1} + rect.left, y: a.y + (b.y - a.y) * ${shot.centre.y % 1} + rect.top }; })()`,
    )) as { readonly x: number; readonly y: number };
    const width = (await evaluate(connection, `innerWidth`)) as number;
    const height = (await evaluate(connection, `innerHeight`)) as number;
    const dx = width / 2 - at.x;
    const dy = height / 2 - at.y;
    // A drag of 6 px or less is a tap on a tile (which would select it),
    // so a small remainder is left alone.
    if (Math.hypot(dx, dy) < 12) return;
    // Drag from a point clear of the HUD and the dock.
    const from = {
      x: Math.min(Math.max(width / 2 - dx / 2, 40), width - 40),
      y: Math.min(Math.max(height * 0.4 - dy / 2, 90), height * 0.7),
    };
    await drag(connection, from, { x: from.x + dx, y: from.y + dy });
    await delay(500);
  }
}

async function drag(
  connection: Connection,
  from: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
): Promise<void> {
  await connection.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: from.x,
    y: from.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  const steps = 12;
  for (let step = 1; step <= steps; step += 1)
    await connection.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps,
      button: "left",
      buttons: 1,
    });
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: to.x,
    y: to.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(connection, `globalThis.__MARKETING_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__MARKETING_PRIOR__ !== true && document.readyState === 'complete'`,
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
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if ((await evaluate(connection, expression)) === true) return;
    } catch {
      // The page may be navigating.
    }
    await delay(100);
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
