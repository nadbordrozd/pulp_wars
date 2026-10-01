import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  goblinFixtureMountExpressionV7,
  type GoblinUiFixtureNameV7,
} from "./browser-goblin-fixture-v7";

/**
 * Revision 17 Goblin UI visual review (pulp_wars-0ao.5). It captures the
 * default-route setup with a Goblin seat, the Kaboom! preview with friendly
 * fire and a chain, the armed confirmation, the explosion effect
 * mid-animation, a Bomb Chucker's friendly splash with Gang Up, the Troll
 * regeneration cue (pinned mid-animation), a Human
 * attack whose death-blast chain hits its own units, the Goblin unit docks
 * and `?` details, WAAAGH!, Warrens, Plunder and Help, in the CHIBI and
 * LEGACY art sets at desktop and phone widths. It needs the Vite dev
 * server, because the fixtures are imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-goblin-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>]
 */

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
type ArtSet = "legacy" | "chibi";
interface Coord {
  readonly x: number;
  readonly y: number;
}

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "goblin-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-goblin-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_480 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-goblin-ui-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
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

  // Default-route setup: every seat offers Human, Undead and Goblin.
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    await navigate(connection, url({}));
    await waitFor(
      connection,
      `document.querySelector('[data-v7-setup]') !== null`,
    );
    evidence.setupOptions = await evaluate(
      connection,
      `(() => {
        const field = document.querySelector('#v7-faction-0');
        field.value = 'GOBLIN';
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return Array.from(field.options).map((option) => option.textContent);
      })()`,
    );
    await capture(connection, `setup-goblin-${size}.png`);
  }

  for (const art of ["chibi", "legacy"] as const) {
    for (const size of ["desktop", "phone"] as const) {
      const suffix = `${art}-${size}`;
      await viewport(connection, size);
      await mount(connection, art, "goblinShowcaseFixtureV7");
      const at = (await evaluate(
        connection,
        `globalThis.__GOBLIN_REVIEW__.showcase`,
      )) as Record<string, Coord>;
      // The Kaboom! button previews the blast; arming asks to confirm.
      await activate(connection, at.kaboom as Coord);
      evidence[`${suffix}KaboomButton`] = await evaluate(
        connection,
        `document.querySelector('[data-action="command-kaboom"]')?.getAttribute('aria-label') ?? null`,
      );
      await evaluate(
        connection,
        `document.querySelector('[data-action="command-kaboom"]').click()`,
      );
      await waitFor(
        connection,
        `document.querySelector('[data-v7-kaboom="armed"]') !== null`,
      );
      await delay(500);
      evidence[`${suffix}KaboomPanel`] = await evaluate(
        connection,
        `Array.from(document.querySelectorAll('.v7-kaboom-preview p, .v7-kaboom-preview li')).map((node) => node.textContent)`,
      );
      await capture(connection, `kaboom-armed-${suffix}.png`);
      // The explosion cue frozen mid-animation (review pin), then wave 2.
      await evaluate(
        connection,
        `globalThis.__GOBLIN_REVIEW__.boardHost.pinExplosionFeedback([{ wave: 1, progress: 0.4, blasts: [{ at: ${JSON.stringify(at.kaboom)}, kind: 'KABOOM', hits: [${JSON.stringify(at.ownGoblin)}, ${JSON.stringify(at.enemyFighter)}, ${JSON.stringify(at.rocketCart)}, ${JSON.stringify(at.enemyRaider)}] }] }])`,
      );
      await delay(200);
      await capture(connection, `explosion-wave1-${suffix}.png`);
      await evaluate(
        connection,
        `globalThis.__GOBLIN_REVIEW__.boardHost.pinExplosionFeedback([{ wave: 2, progress: 0.7, blasts: [{ at: ${JSON.stringify(at.rocketCart)}, kind: 'DEATH', hits: [${JSON.stringify(at.enemyMarksman)}] }] }])`,
      );
      await delay(200);
      await capture(connection, `explosion-wave2-late-${suffix}.png`);
      await evaluate(
        connection,
        `globalThis.__GOBLIN_REVIEW__.boardHost.pinExplosionFeedback([])`,
      );
      // The real Kaboom!: confirm, catch the burst mid-animation, then the
      // settled log and toast.
      await evaluate(
        connection,
        `document.querySelector('[data-action="confirm-kaboom"]').click()`,
      );
      await waitFor(
        connection,
        `document.querySelector('canvas.board-effects-canvas-v7')?.dataset.explosionWave !== undefined`,
        60,
        10,
      );
      await delay(120);
      await capture(connection, `kaboom-live-${suffix}.png`);
      await waitFor(
        connection,
        `globalThis.__GOBLIN_REVIEW__.traces.some((trace) => trace.eventKinds.includes('EXPLOSION_RESOLVED')) && (document.querySelector('#v7-live')?.textContent ?? '').includes('blew up')`,
      );
      await delay(1_200);
      await dismissAchievements(connection);
      evidence[`${suffix}AfterKaboom`] = await evaluate(
        connection,
        `({ notice: document.querySelector('#v7-live')?.textContent, events: globalThis.__GOBLIN_REVIEW__.traces.at(-1).eventKinds })`,
      );
      await capture(connection, `kaboom-after-${suffix}.png`);
      // Bomb Chucker: Gang Up and the friendly bomb splash on its target.
      await activate(connection, at.bombChucker as Coord);
      await keys(connection, ["ArrowRight", "ArrowRight"]);
      evidence[`${suffix}BombCursor`] = await evaluate(
        connection,
        `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null`,
      );
      await capture(connection, `bomb-splash-${suffix}.png`);
      await activate(connection, at.bombChucker as Coord);
      await capture(connection, `dock-bomb-chucker-${suffix}.png`);
      // Troll regeneration (pulp_wars-0ao.12): the heal ring and "+4"
      // frozen mid-cue on the selected Troll.
      await activate(connection, at.troll as Coord);
      await evaluate(
        connection,
        `(() => { const troll = globalThis.__GOBLIN_REVIEW__.snapshotView().units.find((unit) => unit.at.x === ${at.troll?.x} && unit.at.y === ${at.troll?.y}); globalThis.__GOBLIN_REVIEW__.boardHost.pinSupportFeedback([{ effect: 'REGENERATE', actor: { unitId: troll.id, at: troll.at, amount: 4 }, recipients: [], progress: 0.35 }]); })()`,
      );
      await delay(200);
      await capture(connection, `troll-regen-${suffix}.png`);
      await evaluate(
        connection,
        `globalThis.__GOBLIN_REVIEW__.boardHost.pinSupportFeedback([])`,
      );
      if (size === "desktop") {
        await activate(connection, at.troll as Coord);
        await evaluate(
          connection,
          `document.querySelector('[data-action="unit-help"]')?.click()`,
        );
        await delay(300);
        evidence[`${suffix}TrollHelp`] = await evaluate(
          connection,
          `Array.from(document.querySelectorAll('.v7-unit-help-dialog .v7-unit-ability')).map((node) => node.textContent)`,
        );
        await capture(connection, `troll-help-${suffix}.png`);
        await evaluate(
          connection,
          `document.querySelector('[data-action="close-unit-help"]')?.click()`,
        );
        await activate(connection, at.warboss as Coord);
        evidence[`${suffix}WarbossActions`] = await evaluate(
          connection,
          `Array.from(document.querySelectorAll('.v7-selection-dock .v7-action-label')).map((node) => node.textContent)`,
        );
        await capture(connection, `waaagh-${suffix}.png`);
        await activate(connection, at.scrapBuggy as Coord);
        await capture(connection, `dock-scrap-buggy-${suffix}.png`);
        await activate(connection, { x: 8, y: 8 });
        evidence[`${suffix}City`] = await evaluate(
          connection,
          `document.querySelector('[data-stat="units"]')?.textContent ?? null`,
        );
        await capture(connection, `city-warrens-${suffix}.png`);
        await evaluate(
          connection,
          `document.querySelector('[data-action="tech"]')?.click()`,
        );
        await delay(400);
        await evaluate(
          connection,
          `document.querySelector('[data-action="tech-commerce"]')?.click()`,
        );
        await delay(400);
        evidence[`${suffix}Plunder`] = await evaluate(
          connection,
          `document.querySelector('.v7-tech-detail')?.textContent ?? null`,
        );
        await capture(connection, `tech-plunder-${suffix}.png`);
        await evaluate(
          connection,
          `document.querySelector('[data-action="close-overlay"]')?.click()`,
        );
        await delay(300);
        await evaluate(
          connection,
          `document.querySelector('[data-action="compact-menu"]')?.click()`,
        );
        await delay(200);
        await evaluate(
          connection,
          `document.querySelector('[data-action="help"]')?.click()`,
        );
        await delay(400);
        evidence[`${suffix}Help`] = await evaluate(
          connection,
          `Array.from(document.querySelectorAll('.v7-help-goblin li')).map((node) => node.textContent)`,
        );
        await capture(connection, `help-goblin-${suffix}.png`);
      }
      // A Human attack whose kill sets off a Goblin death-blast chain.
      await mount(connection, art, "goblinAttackChainFixtureV7");
      const chain = (await evaluate(
        connection,
        `globalThis.__GOBLIN_REVIEW__.attackChain`,
      )) as Record<string, Coord>;
      await activate(connection, chain.attacker as Coord);
      await keys(connection, ["ArrowRight"]);
      evidence[`${suffix}ChainCursor`] = await evaluate(
        connection,
        `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null`,
      );
      await capture(connection, `attack-chain-${suffix}.png`);
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
  console.log(`Goblin UI review captured in ${output.directory}`);
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
  art: ArtSet,
  fixture: GoblinUiFixtureNameV7,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    goblinFixtureMountExpressionV7(
      fixture,
      art === "chibi" ? "CHIBI" : "LEGACY",
    ),
    true,
  );
  await delay(1_200);
}

/** Closes any achievement notice a fixture command unlocked. */
async function dismissAchievements(connection: Connection): Promise<void> {
  for (let index = 0; index < 4; index += 1) {
    const dismissed = await evaluate(
      connection,
      `(() => { const button = document.querySelector('[data-action="dismiss-achievement"]'); button?.click(); return button !== null; })()`,
    );
    if (dismissed !== true) return;
    await delay(300);
  }
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = globalThis.__GOBLIN_REVIEW__.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
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
  await evaluate(connection, `globalThis.__GOBLIN_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__GOBLIN_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
