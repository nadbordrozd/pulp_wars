import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Compact unit card review (bead pulp_wars-2yc.86, docs/ui/SCREEN_FLOW.md
 * "Compact unit card"). On the unit card fixture it captures, at desktop
 * 1440x900, phone 390x844 and phone 320x640: a plain own unit, a unit
 * with statuses with its Inspired chip's popover open, the details view,
 * an enemy unit, a city, and the Promotion pips (bead pulp_wars-2yc.106:
 * two of three kills, their popover, a rival with three). It records each
 * dock's height and fails when a dock or the page overflows its width. No
 * match is played. It needs the
 * Vite dev server, because the fixture is imported from `tests/fixtures`;
 * Chrome runs headless with `--mute-audio`.
 *
 * Usage: tsx scripts/browser-unit-card-review-v7.ts
 *   http://localhost:6173/ [--output-dir=<new-dir>]
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
interface ScreenSize {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly mobile: boolean;
}
type Place = "plain" | "inspired" | "enemy" | "capital";
interface Scene {
  readonly name: string;
  readonly place: Place;
  /** A browser expression run after the dock opens. */
  readonly then?: string;
  /** What to wait for after `then`. */
  readonly waitFor?: string;
  /** The fixture function (default `unitCardFixtureV7`). */
  readonly fixture?: string;
}

const SIZES: readonly ScreenSize[] = [
  { name: "d1440", width: 1440, height: 900, mobile: false },
  { name: "p390", width: 390, height: 844, mobile: true },
  { name: "p320", width: 320, height: 640, mobile: true },
];
const SCENES: readonly Scene[] = [
  { name: "plain-unit", place: "plain" },
  {
    name: "status-unit-popover",
    place: "inspired",
    then: `document.querySelector('.v7-selection-dock [data-unit-status="inspired"]')?.click()`,
    waitFor: `document.querySelector('.v7-status-popover') !== null || globalThis.__UNIT_CARD_BEFORE__ === true`,
  },
  {
    name: "details",
    place: "inspired",
    then: `document.querySelector('.v7-selection-dock [data-action="unit-help"]')?.click()`,
    waitFor: `document.querySelector('.v7-unit-help-dialog') !== null`,
  },
  { name: "enemy-unit", place: "enemy" },
  { name: "city", place: "capital" },
  // Bead pulp_wars-2yc.106: the Promotion pips, two of three kills, their
  // popover, and a rival waiting for its Promotion.
  {
    name: "promotion-pips",
    place: "plain",
    fixture: "unitCardPromotionFixtureV7",
  },
  {
    name: "promotion-popover",
    place: "plain",
    fixture: "unitCardPromotionFixtureV7",
    then: `document.querySelector('.v7-selection-dock [data-unit-status="promotion"]')?.click()`,
    waitFor: `document.querySelector('.v7-status-popover') !== null || globalThis.__UNIT_CARD_BEFORE__ === true`,
  },
  {
    name: "promotion-enemy",
    place: "enemy",
    fixture: "unitCardPromotionFixtureV7",
  },
];

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const before = process.argv.includes("--before");
const output = await prepareSmokeOutput({
  args: process.argv.slice(2).filter((argument) => argument !== "--before"),
  name: "unit-card",
  archiveDirectory: "art/integration/reviews/ruleset7-unit-card",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_940 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-unit-card-"));
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
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const errors: string[] = [];
const evidence: Record<string, unknown> = {};
const REVIEW = "globalThis.__UNIT_CARD_REVIEW__";

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const size of SIZES)
    for (const scene of SCENES) {
      await viewport(connection, size);
      await mount(connection, scene.fixture ?? "unitCardFixtureV7");
      await evaluate(
        connection,
        `(() => { globalThis.__UNIT_CARD_BEFORE__ = ${String(before)}; const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${REVIEW}.at[${JSON.stringify(scene.place)}]); })()`,
      );
      await waitFor(
        connection,
        `document.querySelector('.v7-selection-dock') !== null`,
      );
      await delay(700);
      if (scene.then !== undefined) {
        await evaluate(connection, scene.then);
        if (scene.waitFor !== undefined)
          await waitFor(connection, scene.waitFor);
        await delay(400);
      }
      const facts = (await evaluate(
        connection,
        `(() => {
          const dock = document.querySelector('.v7-selection-dock');
          const box = dock.getBoundingClientRect();
          const popover = document.querySelector('.v7-status-popover');
          const dialog = document.querySelector('.v7-unit-help-dialog');
          return {
            title: dock.querySelector('h2')?.textContent,
            dockHeight: Math.round(box.height),
            dockWidth: Math.round(box.width),
            chips: Array.from(dock.querySelectorAll('[data-unit-status]')).map((node) => node.textContent.trim()),
            actions: Array.from(dock.querySelectorAll('.v7-context-action, .v7-train-action')).map((node) => node.dataset.action),
            popover: popover?.textContent ?? null,
            dialog: dialog === null ? null : Math.round(dialog.getBoundingClientRect().height),
            actionRow: (() => {
              const row = dock.querySelector(':scope > .v7-context-actions');
              return row === null ? null : { width: Math.round(row.clientWidth), scrolls: row.scrollWidth > row.clientWidth + 1 };
            })(),
            parts: Object.fromEntries(['.v7-identity-art', '.v7-identity-head', '.v7-promotion-pips', ':scope > .v7-context-actions'].map((selector) => {
              const part = dock.querySelector(selector);
              const rect = part?.getBoundingClientRect();
              return [selector, rect === undefined ? null : [Math.round(rect.width), Math.round(rect.height)]];
            })),
            pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
            dockOverflow: dock.scrollWidth - dock.clientWidth,
          };
        })()`,
      )) as { readonly pageOverflow: number; readonly dockOverflow: number };
      evidence[`${scene.name}-${size.name}`] = facts;
      if (facts.pageOverflow > 0 || facts.dockOverflow > 0)
        throw new Error(
          `${scene.name} at ${size.name} overflows: ${JSON.stringify(facts)}`,
        );
      await capture(connection, `${scene.name}-${size.name}.png`);
    }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Unit card review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

async function mount(connection: Connection, fixture: string): Promise<void> {
  const next = new URL(baseUrl.href);
  next.search = "";
  next.searchParams.set("art", "chibi");
  await evaluate(connection, `globalThis.__UNIT_CARD_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: next.href });
  await waitFor(
    connection,
    `globalThis.__UNIT_CARD_PRIOR__ !== true && document.readyState === 'complete'`,
  );
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-unit-card.ts",
      fixture,
      global: "__UNIT_CARD_REVIEW__",
      extras: "at: fixtures.UNIT_CARD_UI_V7",
    }),
    true,
  );
  await waitFor(
    connection,
    `${REVIEW}?.boardHost !== undefined && document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(1_200);
}

async function viewport(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: size.width,
    height: size.height,
    deviceScaleFactor: size.mobile ? 2 : 1,
    mobile: size.mobile,
  });
  await delay(300);
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
