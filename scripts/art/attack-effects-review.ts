/**
 * Attack effects review (bead pulp_wars-b5f.5, docs/art/ATTACK_EFFECTS.md):
 * every attack cue of attack-effects-v7 drawn by the real board host over a
 * shooter and its target (scripts/art/attack-effects/scene.ts), pinned at
 * several points of its timeline. It captures, at desktop (1440 x 900,
 * DPR 1) and phone (390 x 844, DPR 3):
 *
 *   <effect>-<viewport>-zoom-<step>-p<progress>.png   the live look at zoom
 *       steps 1 and 0.75, at progress 0.15, 0.35, 0.5, 0.65 and 0.85
 *   <effect>-<viewport>-reduced.png                  the frame reduced
 *       motion holds (attackReducedMotionProgressV7), live look, zoom 1
 *   <effect>-<look>-desktop-p<progress>.png          the Classic look and
 *       LEGACY at the hit and in the burst
 *   contact-<viewport>-zoom-<step>.png               every effect (rows) at
 *       every progress (columns), cropped round the pair
 *   contact-<viewport>-zoom-<step>-x2.png            the same at 2x
 *
 * Usage: npm run art:attack-effects-review -- [--out DIR] [--port 6547]
 *   [--url http://localhost:PORT/] [--only=NECRO_BOLT,HARPOON]
 *
 * Captures go to --out (default <tmp>/pulp-wars-attack-effects), written
 * after the browser closes. It starts Vite on --port (never the user's
 * 6173) unless --url is given, and uses headless Chrome from CHROME_PATH.
 * No PixelLab call is made.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp, { type OverlayOptions } from "sharp";
import {
  ATTACK_EFFECT_IDS_V7,
  ATTACK_EFFECT_HIT_V7,
  attackReducedMotionProgressV7,
  type AttackEffectIdV7,
} from "../../src/render/canvas/attack-effects-v7";

const ROOT = process.cwd();

function option(name: string): string | undefined {
  const prefixed = process.argv.find((argument) =>
    argument.startsWith(`${name}=`),
  );
  if (prefixed !== undefined) return prefixed.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  const value = index < 0 ? undefined : process.argv[index + 1];
  return value === undefined || value.startsWith("--") ? undefined : value;
}

const OUT = path.resolve(
  option("--out") ?? path.join(tmpdir(), "pulp-wars-attack-effects"),
);
const ONLY = option("--only");
const EFFECTS = ATTACK_EFFECT_IDS_V7.filter(
  (effect) => ONLY === undefined || ONLY.split(",").includes(effect),
);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
] as const;
type Viewport = (typeof VIEWPORTS)[number];
const STEPS = [1, 0.75] as const;
const PROGRESS = [0.15, 0.35, 0.5, 0.65, 0.85] as const;
const SCENE = "globalThis.__ATTACK_EFFECTS_SCENE__";

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  onEvent(listener: (method: string, params: unknown) => void): void;
  close(): void;
}

interface Shot {
  readonly name: string;
  readonly png: Buffer;
}

const shots: Shot[] = [];
/** Crops for the contact sheets: viewport, zoom, effect, progress. */
const crops = new Map<string, Buffer>();
const errors: string[] = [];

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      method?: string;
      params?: unknown;
      result?: unknown;
      error?: { message?: string };
    };
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
        "Browser evaluation failed",
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
  throw new Error(`Chrome timed out waiting for ${expression}`);
}

async function screenshot(connection: Connection): Promise<Buffer> {
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { data?: string };
  if (shot.data === undefined) throw new Error("Chrome returned no screenshot");
  return Buffer.from(shot.data, "base64");
}

async function viewport(connection: Connection, size: Viewport): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: size.width,
    height: size.height,
    deviceScaleFactor: size.dpr,
    mobile: size.mobile,
  });
  await delay(300);
}

async function launchShowcase(
  connection: Connection,
  href: string,
): Promise<void> {
  const navigate = async (): Promise<void> => {
    await evaluate(connection, `globalThis.__ATTACK_EFFECTS_PRIOR__ = true`);
    await connection.send("Page.navigate", { url: href });
    await waitFor(
      connection,
      `globalThis.__ATTACK_EFFECTS_PRIOR__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
    );
  };
  // A saved match from an earlier launch would resume; clear it and reload.
  await navigate();
  await evaluate(
    connection,
    `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); })()`,
  );
  await navigate();
  await waitFor(
    connection,
    `document.querySelector('[data-action="launch"]') !== null`,
  );
  await evaluate(
    connection,
    `(() => {
      const set = (id, value) => {
        const field = document.querySelector(id);
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set('#v7-ai-count', '1');
      set('#v7-map-type', 'SHOWCASE');
      set('#v7-faction-0', 'ORIGINAL');
      set('#v7-faction-1', 'UNDEAD');
      document.querySelector('[data-action="launch"]').click();
    })()`,
  );
  await waitFor(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId; })()`,
    900,
  );
}

async function showScene(
  connection: Connection,
  look: "LIVE" | "CLASSIC" | "LEGACY",
  effect: AttackEffectIdV7,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => { const module = await import('/scripts/art/attack-effects/scene.ts'); ${SCENE}?.host.destroy(); ${SCENE} = module.showAttackEffectsSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify({ look, effect })}); return true; })()`,
  );
  // The unit rasters load on the first frames.
  await delay(900);
}

async function sceneZoom(connection: Connection, step: number): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = await evaluate<string | null>(
      connection,
      `${SCENE}.canvas.dataset.zoomStep ?? null`,
    );
    if (current === null || current === String(step)) return;
    await evaluate(
      connection,
      `${SCENE}.host.zoom(${JSON.stringify(Number(current) < step ? "IN" : "OUT")})`,
    );
    await delay(250);
  }
}

async function pin(
  connection: Connection,
  progress: number | null,
): Promise<void> {
  await evaluate(connection, `${SCENE}.pin(${JSON.stringify(progress)})`);
  await delay(120);
}

async function hideScene(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { ${SCENE}?.host.destroy(); document.querySelector('[data-attack-effects-scene]')?.remove(); delete ${SCENE}; return true; })()`,
  );
}

/** The centre band of a capture, where the camera frames the pair. */
async function cropPair(png: Buffer, size: Viewport): Promise<Buffer> {
  const width = Math.round(
    (size.name === "desktop" ? 560 : size.width) * size.dpr,
  );
  const height = Math.round(240 * size.dpr);
  const left = Math.round((size.width * size.dpr - width) / 2);
  const top = Math.round((size.height * size.dpr - height) / 2 - 20 * size.dpr);
  return sharp(png)
    .extract({ left, top, width, height })
    .resize(Math.round(width / size.dpr), Math.round(height / size.dpr), {
      kernel: "nearest",
    })
    .png()
    .toBuffer();
}

async function captureAll(baseUrl: string): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary");
  const debugPort = 11_400 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-attack-"));
  const chibi = new URL(baseUrl);
  chibi.searchParams.set("art", "chibi");
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--mute-audio",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
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
        const response = await fetch(`http://localhost:${debugPort}/json/list`);
        const targets = (await response.json()) as {
          type: string;
          webSocketDebuggerUrl: string;
        }[];
        target = targets.find((candidate) => candidate.type === "page");
      } catch {
        // Chrome may not have opened its debugging port yet.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined)
      throw new Error("Chrome debugging target did not become ready");
    const connection = await connect(target.webSocketDebuggerUrl);
    connection.onEvent((method, params) => {
      if (method === "Runtime.exceptionThrown")
        errors.push(JSON.stringify(params));
    });
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    for (const size of VIEWPORTS) {
      await viewport(connection, size);
      await launchShowcase(connection, chibi.href);
      for (const effect of EFFECTS) {
        const name = effect.toLowerCase().replaceAll("_", "-");
        await showScene(connection, "LIVE", effect);
        for (const step of STEPS) {
          await sceneZoom(connection, step);
          await pin(connection, null);
          await delay(400);
          for (const progress of PROGRESS) {
            await pin(connection, progress);
            const png = await screenshot(connection);
            const file = `${name}-${size.name}-zoom-${step}-p${progress}.png`;
            shots.push({ name: file, png });
            crops.set(
              `${size.name}|${step}|${effect}|${progress}`,
              await cropPair(png, size),
            );
            console.log(`captured ${file}`);
          }
        }
        await sceneZoom(connection, 1);
        await pin(connection, attackReducedMotionProgressV7(effect));
        shots.push({
          name: `${name}-${size.name}-reduced.png`,
          png: await screenshot(connection),
        });
        await hideScene(connection);
        if (size.name === "desktop")
          for (const look of ["CLASSIC", "LEGACY"] as const) {
            await showScene(connection, look, effect);
            await sceneZoom(connection, 1);
            for (const progress of [
              ATTACK_EFFECT_HIT_V7[effect] - 0.05,
              0.75,
            ]) {
              await pin(connection, progress);
              shots.push({
                name: `${name}-${look.toLowerCase()}-desktop-p${progress.toFixed(2)}.png`,
                png: await screenshot(connection),
              });
            }
            await hideScene(connection);
          }
      }
    }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** One contact sheet per viewport and zoom: effects down, progress across. */
async function contactSheets(): Promise<void> {
  for (const size of VIEWPORTS)
    for (const step of STEPS) {
      const first = crops.get(
        `${size.name}|${step}|${EFFECTS[0] ?? "NECRO_BOLT"}|${PROGRESS[0]}`,
      );
      if (first === undefined) continue;
      const meta = await sharp(first).metadata();
      const cellWidth = meta.width ?? 1;
      const cellHeight = meta.height ?? 1;
      const gap = 6;
      const label = 150;
      const overlays: OverlayOptions[] = [];
      EFFECTS.forEach((effect, row) => {
        overlays.push({
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${label}" height="${cellHeight}"><text x="8" y="${cellHeight / 2}" font-family="sans-serif" font-size="14" fill="#f4efe2">${effect}</text></svg>`,
          ),
          left: 0,
          top: row * (cellHeight + gap) + 24,
        });
        PROGRESS.forEach((progress, column) => {
          const crop = crops.get(`${size.name}|${step}|${effect}|${progress}`);
          if (crop !== undefined)
            overlays.push({
              input: crop,
              left: label + column * (cellWidth + gap),
              top: row * (cellHeight + gap) + 24,
            });
        });
      });
      PROGRESS.forEach((progress, column) =>
        overlays.push({
          input: Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth}" height="22"><text x="4" y="16" font-family="sans-serif" font-size="14" fill="#f4efe2">progress ${progress}</text></svg>`,
          ),
          left: label + column * (cellWidth + gap),
          top: 0,
        }),
      );
      const width = label + PROGRESS.length * (cellWidth + gap);
      const height = 24 + EFFECTS.length * (cellHeight + gap);
      const sheet = await sharp({
        create: { width, height, channels: 4, background: "#203332" },
      })
        .composite(overlays)
        .png()
        .toBuffer();
      const name = `contact-${size.name}-zoom-${step}`;
      shots.push({ name: `${name}.png`, png: sheet });
      shots.push({
        name: `${name}-x2.png`,
        png: await sharp(sheet)
          .resize(width * 2, height * 2, { kernel: "nearest" })
          .png()
          .toBuffer(),
      });
    }
}

async function waitForServer(url: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await delay(150);
  }
  throw new Error(`Dev server at ${url} did not start`);
}

async function startDevServer(port: number): Promise<ChildProcess> {
  if (port === 6173)
    throw new Error("Port 6173 is the user's dev server; pick another");
  const server = spawn(
    path.join(ROOT, "node_modules/.bin/vite"),
    ["--host", "localhost", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", detached: true },
  );
  await waitForServer(`http://localhost:${port}/`);
  return server;
}

function stopDevServer(server: ChildProcess): void {
  if (server.pid === undefined) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

async function main(): Promise<void> {
  const port = Number.parseInt(option("--port") ?? "6547", 10);
  const given = option("--url");
  const server = given === undefined ? await startDevServer(port) : undefined;
  try {
    await captureAll(given ?? `http://localhost:${port}/`);
    await contactSheets();
  } finally {
    if (server !== undefined) stopDevServer(server);
    // Written after the browser is done: a file written under the project
    // while the page is open makes the dev server reload it.
    await mkdir(OUT, { recursive: true });
    for (const shot of shots)
      await writeFile(path.join(OUT, shot.name), shot.png);
    await writeFile(
      path.join(OUT, "index.json"),
      `${JSON.stringify(
        {
          bead: "pulp_wars-b5f.5",
          command: "npm run art:attack-effects-review",
          files: shots.map((shot) => shot.name).sort(),
          errors,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`wrote ${shots.length} captures to ${OUT}`);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "review failed");
  process.exitCode = 1;
});
