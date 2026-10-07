/**
 * Before and after of a look switch (beads pulp_wars-2yc.5 and
 * pulp_wars-2yc.8): screenshots of the real game (the Ruleset 7 app view
 * and board host, live CHIBI look) over the scenes of a review module,
 * once with the switch's query parameter set to 0 ("before") and once
 * without it ("after"). Same state, same camera.
 *
 *   npx vite --port 6593 --strictPort &
 *   CHROME_PATH=... SWITCH_GAME_URL=http://localhost:6593/ \
 *     npx tsx scripts/art/look-switch-review.ts <scenes-module> <out-dir>
 *
 * The module (a path from the repository root, such as
 * scripts/art/coast-sand/review-scenes.ts) exports `SWITCH_PARAMETER`,
 * `REVIEW_SHOTS` and the scene functions the shots name. For each shot
 * the script writes `<name>-before.png`, `<name>-after.png` and
 * `<name>-pair.png` (the shot's part of both pages side by side, and under
 * it the shot's `zoom` rectangle of both enlarged 3x). No PixelLab call.
 *
 * A scenes module that serves several switches is run once per switch with
 * `SWITCH_PARAMETER` in the environment (it overrides the module's);
 * `SWITCH_AFTER_VALUE` gives the "after" side a value other than the
 * default (a variant such as `water-blend=gradient`), and
 * `SWITCH_FIXED_QUERY` (`a=0&b=0`) holds other switches the same on both
 * sides.
 *
 * For a change that has no switch, `SWITCH_BEFORE_URL` names a second
 * server for the "before" side: a checkout of the commit before the change,
 * with the scenes module copied to the same path.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp, { type OverlayOptions } from "sharp";

export interface LookSwitchShot {
  readonly name: string;
  /** The name of a scene function the module exports. */
  readonly scene: string;
  readonly zoomIn: 0 | 1 | 2;
  /** A mouse drag of the board after zooming, in CSS px. */
  readonly drag?: readonly [number, number];
  /** The part of the 1440 x 900 page shown in the pair (default: the board). */
  readonly crop?: readonly [number, number, number, number];
  /** A rectangle of the page shown again at 3x. */
  readonly zoom?: readonly [number, number, number, number];
  /** The page size (default 1440 x 900); a whole large map needs more. */
  readonly size?: readonly [number, number];
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Replaces the running app with the app view over a fixed state. */
function mountExpression(module: string, scene: string): string {
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const scenes = await import(${JSON.stringify(`/${module}`)});
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      const state = scenes[${JSON.stringify(scene)}]();
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
      globalThis.__SWITCH_REVIEW__ = { boardHost, view };
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
  base: string,
  module: string,
  parameter: string,
  shot: LookSwitchShot,
  on: boolean,
  file: string,
): Promise<void> {
  const url = new URL(base);
  url.searchParams.set("art", "chibi");
  if (!on) url.searchParams.set(parameter, "0");
  else if (process.env.SWITCH_AFTER_VALUE !== undefined)
    url.searchParams.set(parameter, process.env.SWITCH_AFTER_VALUE);
  // Further switches held the same on both sides, as a query string.
  for (const [name, value] of new URLSearchParams(
    process.env.SWITCH_FIXED_QUERY ?? "",
  ))
    url.searchParams.set(name, value);
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: shot.size?.[0] ?? 1440,
    height: shot.size?.[1] ?? 900,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await evaluate(connection, `globalThis.__SWITCH_OLD__ = true`).catch(
    () => undefined,
  );
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__SWITCH_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(connection, mountExpression(module, shot.scene));
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(400);
  for (let step = 0; step < shot.zoomIn; step += 1)
    await evaluate(
      connection,
      `globalThis.__SWITCH_REVIEW__.boardHost.zoom('IN')`,
    );
  if (shot.drag !== undefined) {
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
        from.x + (shot.drag[0] * step) / 10,
        from.y + (shot.drag[1] * step) / 10,
      );
    await mouse("mouseReleased", from.x + shot.drag[0], from.y + shot.drag[1]);
  }
  // Art loads asynchronously and redraws the board.
  await delay(2500);
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  await writeFile(file, Buffer.from(result.data, "base64"));
  console.log(`wrote ${file}`);
}

async function pair(
  shot: LookSwitchShot,
  before: string,
  after: string,
  out: string,
): Promise<void> {
  const crop = shot.crop ?? [
    0,
    60,
    shot.size?.[0] ?? 1440,
    (shot.size?.[1] ?? 900) - 60,
  ];
  const cut = (
    file: string,
    box: readonly [number, number, number, number],
    scale: number,
  ): Promise<Buffer> =>
    sharp(file)
      .extract({ left: box[0], top: box[1], width: box[2], height: box[3] })
      .resize(box[2] * scale, box[3] * scale, { kernel: "nearest" })
      .png()
      .toBuffer();
  const label = (text: string): Buffer =>
    Buffer.from(
      `<svg width="300" height="30"><text x="0" y="21" font-family="Helvetica" font-weight="700" font-size="18" fill="#f2f2ee">${text}</text></svg>`,
    );
  const gap = 12;
  const head = 32;
  const zoomHeight = shot.zoom === undefined ? 0 : shot.zoom[3] * 3 + gap;
  const zoomWidth = shot.zoom === undefined ? 0 : shot.zoom[2] * 3;
  const column = Math.max(crop[2], zoomWidth);
  const composites: OverlayOptions[] = [
    { input: label("BEFORE"), left: 0, top: 0 },
    { input: label("AFTER"), left: column + gap, top: 0 },
    { input: await cut(before, crop, 1), left: 0, top: head },
    { input: await cut(after, crop, 1), left: column + gap, top: head },
  ];
  if (shot.zoom !== undefined) {
    composites.push({
      input: await cut(before, shot.zoom, 3),
      left: 0,
      top: head + crop[3] + gap,
    });
    composites.push({
      input: await cut(after, shot.zoom, 3),
      left: column + gap,
      top: head + crop[3] + gap,
    });
  }
  await sharp({
    create: {
      width: column * 2 + gap,
      height: head + crop[3] + zoomHeight,
      channels: 4,
      background: { r: 20, g: 24, b: 26, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(out);
  console.log(`wrote ${out}`);
}

async function main(): Promise<void> {
  const [module, outArgument] = process.argv.slice(2);
  if (module === undefined || outArgument === undefined)
    throw new Error("usage: look-switch-review.ts <scenes-module> <out-dir>");
  const out = path.resolve(outArgument);
  const base = process.env.SWITCH_GAME_URL ?? "http://localhost:6593/";
  // A change without a switch: "before" is another server (a checkout of
  // the commit before it, with the scenes module copied in).
  const beforeBase = process.env.SWITCH_BEFORE_URL ?? base;
  const loaded = (await import(pathToFileURL(path.resolve(module)).href)) as {
    readonly SWITCH_PARAMETER: string;
    readonly REVIEW_SHOTS: readonly LookSwitchShot[];
  };
  const parameter = process.env.SWITCH_PARAMETER ?? loaded.SWITCH_PARAMETER;
  const shots = loaded.REVIEW_SHOTS;
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  await mkdir(out, { recursive: true });
  const port = 10_500 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "switch-game-"));
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
    const only = process.env.SWITCH_SHOTS?.split(",");
    for (const shot of shots) {
      if (only !== undefined && !only.includes(shot.name)) continue;
      const before = path.join(out, `${shot.name}-before.png`);
      const after = path.join(out, `${shot.name}-after.png`);
      await capture(
        connection,
        beforeBase,
        module,
        parameter,
        shot,
        false,
        before,
      );
      await capture(connection, base, module, parameter, shot, true, after);
      await pair(shot, before, after, path.join(out, `${shot.name}-pair.png`));
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
