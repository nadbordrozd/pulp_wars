import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Blocked actions visual review (bead pulp_wars-2yc.36,
 * docs/ui/SCREEN_FLOW.md "Blocked actions"). On the blocked action
 * fixtures it captures, at 1600x1000: a Fruit the player cannot pay for, a
 * city with affordable and unaffordable units, a Game Forest that needs a
 * technology, a full city, a unit that has acted and a Fruit outside the
 * borders; and at 390x844 the city docks. It records every dock control
 * with its state and fails when a dock overflows its width. It needs the
 * Vite dev server, because the fixtures are imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-blocked-actions-review-v7.ts
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
type ScreenSize = "desktop" | "phone";
type Place =
  | "capital"
  | "fruit"
  | "game"
  | "fertile"
  | "forest"
  | "unit"
  | "second"
  | "neutralFruit";
interface Scene {
  readonly name: string;
  readonly fixture: string;
  readonly place: Place;
  readonly sizes: readonly ScreenSize[];
}

const SCENES: readonly Scene[] = [
  {
    name: "fruit-no-coins",
    fixture: "blockedPoorTileFixtureV7",
    place: "fruit",
    sizes: ["desktop", "phone"],
  },
  {
    name: "forest-no-coins",
    fixture: "blockedPoorTileFixtureV7",
    place: "forest",
    sizes: ["desktop"],
  },
  {
    name: "city-some-affordable",
    fixture: "blockedPoorCityFixtureV7",
    place: "capital",
    sizes: ["desktop", "phone"],
  },
  {
    name: "game-needs-technology",
    fixture: "blockedNeedsTechFixtureV7",
    place: "game",
    sizes: ["desktop"],
  },
  {
    name: "city-full",
    fixture: "blockedFullCityFixtureV7",
    place: "capital",
    sizes: ["desktop", "phone"],
  },
  {
    name: "unit-done",
    fixture: "blockedFullCityFixtureV7",
    place: "unit",
    sizes: ["desktop"],
  },
  {
    name: "unit-fortify-no-coins",
    fixture: "blockedPoorUnitFixtureV7",
    place: "second",
    sizes: ["desktop"],
  },
  {
    name: "fruit-outside-borders",
    fixture: "blockedPoorTileFixtureV7",
    place: "neutralFruit",
    sizes: ["desktop"],
  },
  {
    name: "goblin-city-nine-units",
    fixture: "blockedGoblinCityFixtureV7",
    place: "capital",
    sizes: ["desktop", "phone"],
  },
  {
    name: "dinosaur-city-eggs",
    fixture: "blockedDinosaurCityFixtureV7",
    place: "capital",
    sizes: ["desktop", "phone"],
  },
];

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "blocked-actions",
  archiveDirectory: "art/integration/reviews/ruleset7-blocked-actions",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_860 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-blocked-ui-"));
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
    "--window-size=1600,1000",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const errors: string[] = [];
const evidence: Record<string, unknown> = {};
const REVIEW = "globalThis.__BLOCKED_REVIEW__";

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  for (const scene of SCENES)
    for (const size of scene.sizes) {
      await viewport(connection, size);
      await mount(connection, scene.fixture);
      await evaluate(
        connection,
        `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${REVIEW}.at[${JSON.stringify(scene.place)}]); })()`,
      );
      await waitFor(
        connection,
        `document.querySelector('.v7-selection-dock') !== null`,
      );
      await delay(900);
      const facts = (await evaluate(
        connection,
        `(() => {
          const dock = document.querySelector('.v7-selection-dock');
          const box = dock.getBoundingClientRect();
          return {
            title: dock.querySelector('h2')?.textContent,
            controls: Array.from(dock.querySelectorAll('.v7-context-action, .v7-train-action')).map((node) => ({
              action: node.dataset.action,
              label: node.getAttribute('aria-label') ?? node.textContent,
              blocked: node.dataset.disabledReason ?? null,
              tooltip: node.title,
            })),
            chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent),
            pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
            dockOverflow: dock.scrollWidth - dock.clientWidth,
            widest: Math.max(0, ...Array.from(dock.querySelectorAll('.v7-context-actions > *')).map((node) => Math.ceil(node.getBoundingClientRect().right - box.right))),
          };
        })()`,
      )) as {
        readonly pageOverflow: number;
        readonly dockOverflow: number;
        readonly widest: number;
      };
      evidence[`${scene.name}-${size}`] = facts;
      if (facts.pageOverflow > 0 || facts.dockOverflow > 0 || facts.widest > 0)
        throw new Error(
          `${scene.name} at ${size} overflows: ${JSON.stringify(facts)}`,
        );
      await capture(connection, `${scene.name}-${size}.png`);
    }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Blocked actions review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

async function mount(connection: Connection, fixture: string): Promise<void> {
  const next = new URL(baseUrl.href);
  next.search = "";
  next.searchParams.set("art", "chibi");
  await evaluate(connection, `globalThis.__BLOCKED_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: next.href });
  await waitFor(
    connection,
    `globalThis.__BLOCKED_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-blocked-actions.ts",
      fixture,
      artSet: "CHIBI",
      global: "__BLOCKED_REVIEW__",
      extras: "at: fixtures.BLOCKED_ACTIONS_UI_V7",
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
  await connection.send(
    "Emulation.setDeviceMetricsOverride",
    size === "desktop"
      ? { width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false }
      : { width: 390, height: 844, deviceScaleFactor: 2, mobile: true },
  );
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
