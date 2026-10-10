import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The Vampire and Banshee rework, interface review (`pulp_wars-iqhp`). It
 * mounts hand-built states (tests/fixtures/v7-vampire-banshee-ui.ts; no AI
 * turn is played) in the default CHIBI look and captures, at desktop
 * (1440 x 1000) and phone (390 x 844) size: the Vampire's Bat Escape reach
 * with a focused flight over a unit, the Feast preview and the Feast
 * prompt, the Wail preview with Terror, the Terror marker and chip, the
 * "Won't strike back (Terror)" attack preview, the Ethereal reach, and a
 * frame of the bat swirl. It needs the Vite dev server, because the
 * fixtures are imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-vampire-banshee-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>]
 */

type VampireBansheeFixtureName =
  | "vampireBatEscapeFixtureV7"
  | "vampireFeastSetupFixtureV7"
  | "vampireFeastFixtureV7"
  | "bansheeWailFixtureV7"
  | "bansheeTerrorFixtureV7"
  | "bansheeEtherealFixtureV7";

interface DebugTarget {
  readonly type: string;
  readonly url: string;
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

/** One capture: a fixture, the unit to select, then cursor keys. */
interface Shot {
  readonly name: string;
  readonly fixture: VampireBansheeFixtureName;
  readonly select: (at: Record<string, Record<string, Coord>>) => Coord;
  readonly keys: readonly string[];
  /** An expression that must be true once the shot is set up. */
  readonly check: string;
}

const SHOTS: readonly Shot[] = [
  {
    name: "bat-escape-reach",
    fixture: "vampireBatEscapeFixtureV7",
    select: (at) => at.escape?.vampire as Coord,
    // The cursor on a landing past the Guard: its flight passes over it.
    keys: ["ArrowRight", "ArrowRight", "ArrowDown"],
    check: `document.querySelector('[data-landing-marker="bat-escape"]') !== null`,
  },
  {
    name: "feast-preview",
    fixture: "vampireFeastSetupFixtureV7",
    select: (at) => at.feast?.vampire as Coord,
    keys: ["ArrowRight"],
    check: `true`,
  },
  {
    name: "feast-prompt",
    fixture: "vampireFeastFixtureV7",
    select: (at) => at.feast?.victim as Coord,
    keys: ["ArrowDown"],
    check: `document.querySelector('[data-v7-feast="prompt"]') !== null`,
  },
  {
    name: "wail-terror-preview",
    fixture: "bansheeWailFixtureV7",
    select: (at) => at.wail?.banshee as Coord,
    keys: [],
    check: `document.querySelector('[data-action="command-wail"]')?.getAttribute('aria-label')?.includes('terrified') === true`,
  },
  {
    name: "terror-marker",
    fixture: "bansheeTerrorFixtureV7",
    select: (at) => at.wail?.survivor as Coord,
    keys: [],
    check: `document.querySelector('[data-unit-status="terror"]') !== null`,
  },
  {
    name: "terror-no-strike-back",
    fixture: "bansheeTerrorFixtureV7",
    select: (at) => at.wail?.skeleton as Coord,
    keys: ["ArrowLeft", "ArrowUp"],
    check: `true`,
  },
  {
    name: "ethereal-reach",
    fixture: "bansheeEtherealFixtureV7",
    select: (at) => at.ethereal?.banshee as Coord,
    keys: ["ArrowRight", "ArrowRight"],
    check: `document.querySelector('[data-landing-marker="ethereal"]') !== null`,
  },
];

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "vampire-banshee-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-vampire-banshee-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_480 + (process.pid % 80);
const userData = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-vampire-banshee-ui-"),
);
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

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const size of ["desktop", "phone"] as const)
    for (const shot of SHOTS) {
      await viewport(connection, size);
      await mount(connection, shot.fixture);
      const at = (await evaluate(
        connection,
        `globalThis.__VAMPIRE_BANSHEE_REVIEW__.at`,
      )) as Record<string, Record<string, Coord>>;
      // The pointer leaves the board, so the keyboard cursor is the
      // previewed target.
      await connection.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: 2,
        y: size === "desktop" ? 995 : 840,
      });
      await activate(connection, shot.select(at));
      if (shot.keys.length > 0) await keys(connection, shot.keys);
      await delay(400);
      if ((await evaluate(connection, shot.check)) !== true)
        throw new Error(`${shot.name} (${size}) check failed: ${shot.check}`);
      evidence[`${shot.name}-${size}`] = await evaluate(
        connection,
        `({
          cursor: document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null,
          chips: Array.from(document.querySelectorAll('.v7-selection-dock [data-unit-status]')).map((node) => node.textContent),
          prompt: document.querySelector('[data-v7-feast="prompt"]')?.textContent ?? null,
          legend: Array.from(document.querySelectorAll('.v7-selection-dock [data-landing-marker]')).map((node) => node.textContent),
          wail: document.querySelector('[data-action="command-wail"]')?.getAttribute('aria-label') ?? null,
        })`,
      );
      await capture(connection, `${shot.name}-${size}.png`);
    }
  // The same flight, hovered with the pointer (desktop: the landing's tile
  // centre on the default camera).
  await viewport(connection, "desktop");
  await mount(connection, "vampireBatEscapeFixtureV7");
  {
    const at = (await evaluate(
      connection,
      `globalThis.__VAMPIRE_BANSHEE_REVIEW__.at`,
    )) as Record<string, Record<string, Coord>>;
    await activate(connection, at.escape?.vampire as Coord);
    const point = (await evaluate(
      connection,
      `(() => { const canvas = document.querySelector('canvas.board-canvas-v7'); const rect = canvas.getBoundingClientRect(); return { left: rect.left, top: rect.top }; })()`,
    )) as { readonly left: number; readonly top: number };
    evidence.canvasOrigin = point;
    await connection.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: 880,
      y: 380,
    });
    await delay(400);
    await capture(connection, "bat-escape-hover-desktop.png");
  }
  // A frame of the bat swirl: the Vampire flies to a landing past the Guard.
  await viewport(connection, "desktop");
  await mount(connection, "vampireBatEscapeFixtureV7");
  const at = (await evaluate(
    connection,
    `globalThis.__VAMPIRE_BANSHEE_REVIEW__.at`,
  )) as Record<string, Record<string, Coord>>;
  const vampire = at.escape?.vampire as Coord;
  await activate(connection, vampire);
  await evaluate(
    connection,
    `globalThis.__VAMPIRE_BANSHEE_REVIEW__.boardHost.activate(${JSON.stringify({ x: vampire.x + 2, y: vampire.y + 1 })})`,
  );
  await delay(40);
  await capture(connection, "bat-swirl-cue-desktop.png");
  await delay(120);
  await capture(connection, "bat-swirl-cue-late-desktop.png");
  await delay(2_000);
  evidence.batSwirlEvents = await evaluate(
    connection,
    `globalThis.__VAMPIRE_BANSHEE_REVIEW__.traces.map((trace) => trace.eventKinds)`,
  );
  // The three cues frame by frame (progress 0.15, 0.5 = reduced motion,
  // 0.85) on a grass ground at the CHIBI zoom: the bat swirl, the Feast and
  // the Terror. Drawn by the shipped drawing code on a plain canvas.
  await evaluate(
    connection,
    `(async () => {
      const { drawSupportFeedbackV7 } = await import('/src/render/canvas/support-presentation-v7.ts');
      document.body.innerHTML = '';
      const canvas = document.createElement('canvas');
      canvas.width = 900; canvas.height = 600;
      canvas.style.cssText = 'position:fixed;left:0;top:0;width:900px;height:600px;z-index:99';
      document.body.append(canvas);
      const context = canvas.getContext('2d');
      context.fillStyle = '#7cb24a';
      context.fillRect(0, 0, 900, 600);
      const zoom = 0.625;
      const cell = 128 * zoom;
      // Grid cell (x, y) is drawn at offset + (x, y) * cell.
      const effects = [
        { effect: 'BAT_SWIRL', actor: { unitId: 1, at: { x: 0, y: 1 } }, recipients: [{ unitId: 1, at: { x: 2, y: 1 } }] },
        { effect: 'FEAST', actor: { unitId: 1, at: { x: 1, y: 1 }, amount: 8 }, recipients: [] },
        { effect: 'TERROR', actor: { unitId: 2, at: { x: 0, y: 1 } }, recipients: [{ unitId: 3, at: { x: 1, y: 1 } }] },
      ];
      effects.forEach((cue, row) => {
        [0.15, 0.5, 0.85].forEach((progress, column) => {
          const camera = { offsetX: 60 + column * 290, offsetY: 150 + row * 190 - cell, zoom };
          drawSupportFeedbackV7(context, camera, { ...cue, progress }, false);
        });
      });
    })()`,
    true,
  );
  await delay(200);
  {
    const response = (await connection.send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 900, height: 600, scale: 1 },
    })) as { readonly data?: string };
    if (response.data === undefined) throw new Error("No cue sheet data");
    await writeFile(
      path.join(output.directory, "cue-sheet-desktop.png"),
      Buffer.from(response.data, "base64"),
    );
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Vampire and Banshee UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function mount(
  connection: Connection,
  fixture: VampireBansheeFixtureName,
): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-vampire-banshee-ui.ts",
      fixture,
      artSet: "CHIBI",
      global: "__VAMPIRE_BANSHEE_REVIEW__",
      extras: "at: fixtures.VAMPIRE_BANSHEE_UI_V7",
    }),
    true,
  );
  await delay(1_200);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { globalThis.__VAMPIRE_BANSHEE_REVIEW__.boardHost.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  // A keyboard round trip keeps the selected cell and its neighbours
  // on screen below the HUD without changing the selection.
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(600);
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
  };
  for (const key of names) {
    for (const type of ["rawKeyDown", "keyUp"] as const)
      await connection.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: codes[key],
      });
  }
  await delay(400);
}

async function viewport(
  connection: Connection,
  size: "desktop" | "phone",
): Promise<void> {
  await connection.send(
    "Emulation.setDeviceMetricsOverride",
    size === "desktop"
      ? { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }
      : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  );
  await delay(300);
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(
    connection,
    `globalThis.__VAMPIRE_BANSHEE_REVIEW_PRIOR__ = true`,
  );
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__VAMPIRE_BANSHEE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  await writeFile(
    path.join(output.directory, name),
    Buffer.from(response.data, "base64"),
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
