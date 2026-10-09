import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * The giants' signatures, UI review (`pulp_wars-w49.32`,
 * docs/product/RULESET_7_GIANTS.md section 10). On the hand-built scenes of
 * tests/fixtures/v7-giants-ui.ts (no match is played) it captures, at
 * desktop (1440 x 1000) and phone (390 x 844) widths in the CHIBI art set:
 * each signature's button and its aiming on the board with the preview at
 * the focused target, the attack previews of Crushing Shove, Glacial Smash
 * and the Siege Hammer, the Overstride Move's trample, the Abomination's
 * card and belly badge, the razed Walls in the city panel, the Gingerbread
 * Men, the reward dialog's giant card, and every signature's cue pinned
 * mid-animation (`pinGiantFeedback`), with its reduced-motion frame. It
 * needs the Vite dev server, because the fixtures are imported from
 * `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-giants-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>] [--only=crush,toss]
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
  name: "giants-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-giants-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_560 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-giants-ui-"));
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
const REVIEW = "globalThis.__GIANTS_REVIEW__";

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    if (wanted("crush")) await crush(connection, size);
    if (wanted("swallow")) await swallow(connection, size);
    if (wanted("toss")) await toss(connection, size);
    if (wanted("stomp")) await stomp(connection, size);
    if (wanted("overstride")) await overstride(connection, size);
    if (wanted("glacial")) await glacial(connection, size);
    if (wanted("siege")) await siege(connection, size);
    if (wanted("breakoff")) await breakOff(connection, size);
    if (wanted("reward")) await reward(connection, size);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Giants UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

async function scene(
  connection: Connection,
  fixture: string,
): Promise<Record<string, Record<string, Coord>>> {
  await mount(connection, fixture);
  return (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Record<string, Coord>
  >;
}

/** The dock's buttons and aiming panel, and the cursor's description. */
async function record(connection: Connection, key: string): Promise<void> {
  evidence[key] = await evaluate(
    connection,
    `({
      actions: Array.from(document.querySelectorAll('.v7-selection-dock .v7-context-action, .v7-selection-dock [data-action^="command-"]')).map((node) => node.getAttribute('aria-label') ?? node.textContent),
      panel: document.querySelector('.v7-giant-pick')?.getAttribute('aria-label') ?? null,
      targets: document.querySelector('.v7-giant-pick')?.dataset.boardTargets ?? null,
      cursor: document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null,
      signature: document.querySelector('.v7-giant-signature')?.textContent ?? null,
      chips: Array.from(document.querySelectorAll('.v7-giant-chip')).map((node) => node.getAttribute('aria-label')),
    })`,
  );
}

/** Pins a giant cue (or clears it with null) and captures it. */
async function cue(
  connection: Connection,
  name: string,
  feedback: Record<string, unknown> | null,
  progresses: readonly number[],
  size: Size,
): Promise<void> {
  // The cue alone: nothing selected or aimed under it.
  await evaluate(
    connection,
    `(() => { document.querySelector('[data-action="giant-pick-cancel"]')?.click(); document.querySelector('[data-action="close-dock"]')?.click(); })()`,
  );
  await delay(400);
  for (const progress of progresses) {
    await evaluate(
      connection,
      `${REVIEW}.boardHost.pinGiantFeedback(${JSON.stringify(
        feedback === null ? [] : [{ ...feedback, progress }],
      )}, ${REVIEW}.snapshotView())`,
    );
    await delay(250);
    await capture(connection, `cue-${name}-p${progress}-${size}.png`);
  }
  await evaluate(connection, `${REVIEW}.boardHost.pinGiantFeedback([])`);
}

async function idAt(connection: Connection, at: Coord): Promise<number> {
  return (await evaluate(
    connection,
    `${REVIEW}.snapshotView().units.find((unit) => unit.at.x === ${at.x} && unit.at.y === ${at.y})?.id ?? -1`,
  )) as number;
}

async function crush(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsCrushFixtureV7")).crush;
  if (at === undefined) return;
  await activate(connection, at.juggernaut as Coord);
  await cursorTo(connection, at.juggernaut as Coord, at.blocked as Coord);
  await record(connection, `${size}CrushPreview`);
  await capture(connection, `crush-preview-${size}.png`);
  await cue(
    connection,
    "crush",
    {
      effect: "CRUSH",
      from: at.juggernaut,
      cells: [at.blocked, at.blocker],
      amounts: [3, 3],
      unitIds: [
        await idAt(connection, at.blocked as Coord),
        await idAt(connection, at.blocker as Coord),
      ],
    },
    [0.15, 0.32, 0.42, 0.7],
    size,
  );
}

async function swallow(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsSwallowFixtureV7")).swallow;
  if (at === undefined) return;
  await activate(connection, at.abomination as Coord);
  await record(connection, `${size}SwallowButton`);
  await capture(connection, `swallow-button-${size}.png`);
  await click(connection, "giant-swallow");
  await cursorTo(connection, at.abomination as Coord, at.knight as Coord);
  await record(connection, `${size}SwallowAim`);
  await capture(connection, `swallow-aim-${size}.png`);
  await cue(
    connection,
    "swallow",
    {
      effect: "SWALLOW",
      actorUnitId: await idAt(connection, at.abomination as Coord),
      from: at.abomination,
      cells: [at.knight],
      unitIds: [await idAt(connection, at.knight as Coord)],
    },
    [0.2, 0.48, 0.75],
    size,
  );
  // The Abomination holding the Knight: its card and its belly badge.
  const held = (await scene(connection, "giantsSwallowedFixtureV7")).swallow;
  if (held === undefined) return;
  await activate(connection, held.abomination as Coord);
  await record(connection, `${size}SwallowedCard`);
  await capture(connection, `swallowed-card-${size}.png`);
  await cue(
    connection,
    "digest",
    { effect: "DIGEST", from: held.abomination, cells: [], amounts: [4] },
    [0.45],
    size,
  );
  await cue(
    connection,
    "regurgitate",
    {
      effect: "REGURGITATE",
      from: held.abomination,
      cells: [held.knight],
    },
    [0.42, 0.7],
    size,
  );
}

async function toss(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsTossFixtureV7")).toss;
  if (at === undefined) return;
  await activate(connection, at.troll as Coord);
  await record(connection, `${size}TossButton`);
  await capture(connection, `toss-button-${size}.png`);
  await click(connection, "giant-toss");
  await record(connection, `${size}TossPassengers`);
  await capture(connection, `toss-passengers-${size}.png`);
  // Choosing the Goblin on the board moves on to its landing tiles.
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.goblin)})`,
  );
  await delay(500);
  await cursorTo(connection, at.goblin as Coord, at.landing as Coord);
  await record(connection, `${size}TossLanding`);
  await capture(connection, `toss-landing-${size}.png`);
  await cue(
    connection,
    "toss",
    {
      effect: "TOSS",
      actorUnitId: await idAt(connection, at.troll as Coord),
      from: at.troll,
      cells: [at.goblin, at.landing],
      unitIds: [await idAt(connection, at.goblin as Coord)],
    },
    [0.15, 0.42, 0.65, 0.85],
    size,
  );
}

async function stomp(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsStompFixtureV7")).stomp;
  if (at === undefined) return;
  await activate(connection, at.brontosaurus as Coord);
  await record(connection, `${size}StompButton`);
  await capture(connection, `stomp-button-${size}.png`);
  await click(connection, "giant-stomp");
  await record(connection, `${size}StompAim`);
  await capture(connection, `stomp-aim-${size}.png`);
  await cue(
    connection,
    "stomp",
    {
      effect: "STOMP",
      actorUnitId: await idAt(connection, at.brontosaurus as Coord),
      from: at.brontosaurus,
      cells: [at.knight, at.fighter, at.champion],
      amounts: [4, 4, 4],
      unitIds: [
        await idAt(connection, at.knight as Coord),
        await idAt(connection, at.fighter as Coord),
        await idAt(connection, at.champion as Coord),
      ],
    },
    [0.12, 0.3, 0.42, 0.7],
    size,
  );
}

async function overstride(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsOverstrideFixtureV7")).overstride;
  if (at === undefined) return;
  await activate(connection, at.colossus as Coord);
  await cursorTo(connection, at.colossus as Coord, at.beyond as Coord);
  await record(connection, `${size}OverstrideMove`);
  await capture(connection, `overstride-move-${size}.png`);
  await cue(
    connection,
    "trample",
    {
      effect: "TRAMPLE",
      from: at.beyond,
      cells: [at.fighter],
      amounts: [3],
      unitIds: [await idAt(connection, at.fighter as Coord)],
    },
    [0.2, 0.5, 0.8],
    size,
  );
}

async function glacial(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsGlacialFixtureV7")).glacial;
  if (at === undefined) return;
  await activate(connection, at.frostGiant as Coord);
  await cursorTo(connection, at.frostGiant as Coord, at.target as Coord);
  await record(connection, `${size}GlacialPreview`);
  await capture(connection, `glacial-preview-${size}.png`);
  const target = at.target as Coord;
  const ring: Coord[] = [];
  for (let dy = -1; dy <= 1; dy += 1)
    for (let dx = -1; dx <= 1; dx += 1)
      if (dx !== 0 || dy !== 0)
        ring.push({ x: target.x + dx, y: target.y + dy });
  await cue(
    connection,
    "shards",
    {
      effect: "SHARDS",
      from: target,
      cells: ring,
      marks: [at.shardFighter, at.shardKnight],
    },
    [0.2, 0.38, 0.75],
    size,
  );
}

async function siege(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsSiegeFixtureV7")).siege;
  if (at === undefined) return;
  await activate(connection, at.titan as Coord);
  await cursorTo(connection, at.titan as Coord, at.centre as Coord);
  await record(connection, `${size}SiegePreview`);
  await capture(connection, `siege-preview-${size}.png`);
  await cue(
    connection,
    "hammer",
    {
      effect: "HAMMER",
      from: at.titan,
      cells: [at.centre],
      walls: true,
      unitIds: [await idAt(connection, at.centre as Coord)],
    },
    [0.15, 0.32, 0.44, 0.7],
    size,
  );
  // The city panel before and after the Walls fall.
  await selectCity(connection, at.centre as Coord);
  await capture(connection, `city-walls-standing-${size}.png`);
  evidence[`${size}WallsStanding`] = await evaluate(
    connection,
    `document.querySelector('[data-stat="walls"]')?.textContent ?? null`,
  );
  await scene(connection, "giantsSiegeRazedFixtureV7");
  await selectCity(connection, at.centre as Coord);
  evidence[`${size}WallsRazed`] = await evaluate(
    connection,
    `({ text: document.querySelector('[data-stat="walls"]')?.textContent ?? null, title: document.querySelector('[data-stat="walls"]')?.getAttribute('title') ?? null })`,
  );
  await capture(connection, `city-walls-razed-${size}.png`);
}

async function breakOff(connection: Connection, size: Size): Promise<void> {
  const at = (await scene(connection, "giantsBreakOffFixtureV7")).breakOff;
  if (at === undefined) return;
  await activate(connection, at.giant as Coord);
  await record(connection, `${size}BreakOffButton`);
  await capture(connection, `breakoff-button-${size}.png`);
  await click(connection, "giant-break-off");
  await record(connection, `${size}BreakOffFirst`);
  await capture(connection, `breakoff-first-${size}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.first)})`,
  );
  await delay(500);
  await cursorTo(connection, at.first as Coord, at.second as Coord);
  await record(connection, `${size}BreakOffSecond`);
  await capture(connection, `breakoff-second-${size}.png`);
  await cue(
    connection,
    "breakoff",
    {
      effect: "BREAK_OFF",
      actorUnitId: await idAt(connection, at.giant as Coord),
      from: at.giant,
      cells: [at.first, at.second],
    },
    [0.18, 0.42, 0.62, 0.85],
    size,
  );
  // The two Gingerbread Men beside their Giant.
  await scene(connection, "giantsGingerbreadFixtureV7");
  await activate(connection, at.first as Coord);
  await record(connection, `${size}GingerbreadMan`);
  await capture(connection, `gingerbread-men-${size}.png`);
  if (size === "desktop") {
    await evaluate(
      connection,
      `${REVIEW}.boardHost.zoom('IN'); ${REVIEW}.boardHost.zoom('IN')`,
    );
    await delay(500);
    await capture(connection, `gingerbread-men-zoom-${size}.png`);
  }
}

async function reward(connection: Connection, size: Size): Promise<void> {
  await mount(connection, "giantsRewardFixtureV7");
  await delay(400);
  evidence[`${size}Reward`] = await evaluate(
    connection,
    `Array.from(document.querySelectorAll('[data-action^="reward-"], .v7-reward-card, [data-reward]')).map((node) => node.textContent)`,
  );
  await capture(connection, `reward-dialog-${size}.png`);
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function mount(connection: Connection, fixture: string): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-giants-ui.ts",
      fixture,
      artSet: "CHIBI",
      global: "__GIANTS_REVIEW__",
      extras: "at: fixtures.GIANTS_UI_V7",
    }),
    true,
  );
  await delay(1_200);
}

async function click(connection: Connection, action: string): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="${action}"]')?.click()`,
  );
  await delay(600);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(500);
}

/** The city panel of the city on `at` (its unit is selected first). */
async function selectCity(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { document.querySelector('[data-action="close-dock"]')?.click(); const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); host.activate(${JSON.stringify(at)}); })()`,
  );
  await delay(600);
}

/** Moves the keyboard cursor from `from` to `to` with the arrow keys. */
async function cursorTo(
  connection: Connection,
  from: Coord,
  to: Coord,
): Promise<void> {
  const names: string[] = [];
  for (let step = 0; step < Math.abs(to.x - from.x); step += 1)
    names.push(to.x > from.x ? "ArrowRight" : "ArrowLeft");
  for (let step = 0; step < Math.abs(to.y - from.y); step += 1)
    names.push(to.y > from.y ? "ArrowDown" : "ArrowUp");
  await keys(connection, names);
  await delay(300);
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
  for (const key of names)
    for (const type of ["rawKeyDown", "keyUp"] as const)
      await connection.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: codes[key],
      });
  await delay(300);
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
  await evaluate(connection, `globalThis.__GIANTS_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__GIANTS_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
  console.log(`captured ${name}`);
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
