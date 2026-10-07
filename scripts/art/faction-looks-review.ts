/**
 * Faction looks review (bead pulp_wars-w5j.3): the default (live) look
 * without the coloured base plates, where every player plays a different
 * faction and the faction's look says whose a unit is. It captures, in the
 * CHIBI art set at desktop (1440 x 900, DPR 1) and phone (390 x 844, DPR 3)
 * widths, at zoom steps 1 and 0.75:
 *
 *   showcase-{a,b}-<viewport>-zoom-<step>.png  a Showcase launched from the
 *       setup form with four different factions (a: Human, Undead, Goblin,
 *       Dinosaur; b: Martian, Ice Folk, Human, Goblin) at the human's first
 *       turn, every own unit ready
 *   contact-{a,b}-<viewport>-zoom-<step>.png   four factions' armies in
 *       contact (tests/fixtures/v7-faction-looks.ts; a: Human, Martian, Ice
 *       Folk, Dinosaur; b: Goblin, Undead, Dinosaur, Martian): the viewer's
 *       ready units, a spent one, damaged units of every seat, Shields (one
 *       dented), Frosted and Frozen units, a Big and an Alpha dinosaur, two
 *       Eggs (one damaged), flyers
 *   selected-{a,b}-<viewport>-zoom-1.png       the same with the viewer's
 *       ready Knight selected
 *   naval-{coast,mixed}-<viewport>-zoom-<step>.png  the six factions' ships
 *       at sea and docked (scripts/art/naval-factions/scene.ts), the
 *       viewer's ready, some damaged
 *   contact-a-classic-desktop-zoom-1.png       the Classic look (Settings >
 *       Developer tools), for comparison
 *
 * Usage: npm run art:faction-looks-review -- [--out DIR] [--port 6535]
 *   [--url http://localhost:PORT/] [--only=showcase,contact,naval,classic]
 *
 * Captures go to --out (default <tmp>/pulp-wars-faction-looks), written
 * after the browser closes. It starts Vite on --port (never the user's
 * 6173) unless --url is given, and uses headless Chrome from CHROME_PATH.
 * No PixelLab call is made.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { ruleset7FixtureMountExpressionV7 } from "../browser-undead-fixture-v7";

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
  option("--out") ?? path.join(tmpdir(), "pulp-wars-faction-looks"),
);
const ONLY = option("--only");
const want = (part: string): boolean =>
  ONLY === undefined || ONLY.split(",").includes(part);

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
] as const;
type Viewport = (typeof VIEWPORTS)[number];
const STEPS = [1, 0.75] as const;
const SHOWCASES = [
  ["a", ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"]],
  ["b", ["MARTIAN", "ICE_FOLK", "ORIGINAL", "GOBLIN"]],
] as const;
const MIXES = [
  ["a", "factionLooksMixAFixtureV7"],
  ["b", "factionLooksMixBFixtureV7"],
] as const;
const REVIEW = "globalThis.__FACTION_LOOKS__";
const SCENE = "globalThis.__FACTION_LOOKS_SCENE__";
const CLASSIC_KEY = "pulpWars.ruleset7.boardClassicLook.v1";
const FOCUS = { x: 9, y: 9 };
const SELECTED = { x: 9, y: 8 };

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  onEvent(listener: (method: string, params: unknown) => void): void;
  close(): void;
}

const shots: { name: string; png: Buffer }[] = [];
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

/** Screenshots until two in a row match, so every raster has loaded. */
async function capture(connection: Connection, name: string): Promise<void> {
  let previous = await screenshot(connection);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(350);
    const next = await screenshot(connection);
    if (attempt > 0 && next.equals(previous)) {
      previous = next;
      break;
    }
    previous = next;
  }
  shots.push({ name, png: previous });
  console.log(`captured ${name}`);
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    Escape: 27,
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

async function viewport(connection: Connection, size: Viewport): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: size.width,
    height: size.height,
    deviceScaleFactor: size.dpr,
    mobile: size.mobile,
  });
  await delay(300);
}

async function navigate(connection: Connection, href: string): Promise<void> {
  await evaluate(connection, `globalThis.__FACTION_LOOKS_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__FACTION_LOOKS_PRIOR__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
}

/** The app's zoom buttons until the board canvas is at `step`. */
async function zoomStep(connection: Connection, step: number): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const current = Number(
      await evaluate<string>(
        connection,
        `document.querySelector('canvas.board-canvas-v7')?.dataset.zoomStep ?? '1'`,
      ),
    );
    if (Math.abs(current - step) < 1e-6) return;
    await evaluate(
      connection,
      `document.querySelector('[data-action="${current < step ? "zoom-in" : "zoom-out"}"]')?.click()`,
    );
    await delay(400);
  }
  throw new Error(`the board could not reach zoom ${step}`);
}

/** Clears the selection (and any armed state) with Escape. */
async function deselect(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { for (let index = 0; index < 3; index += 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); })()`,
  );
  await delay(250);
}

/** Activates a cell of the mounted fixture; a keyboard round trip frames it. */
async function activate(
  connection: Connection,
  at: { readonly x: number; readonly y: number },
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await keys(connection, ["ArrowUp", "ArrowDown"]);
  await delay(500);
}

async function launchShowcase(
  connection: Connection,
  baseUrl: string,
  factions: readonly string[],
): Promise<void> {
  await navigate(connection, baseUrl);
  await evaluate(
    connection,
    `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); localStorage.removeItem('${CLASSIC_KEY}'); })()`,
  );
  await navigate(connection, baseUrl);
  await waitFor(
    connection,
    `document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  await evaluate(
    connection,
    `(() => {
      const set = (id, value) => {
        const field = document.querySelector(id);
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set('#v7-ai-count', '${factions.length - 1}');
      set('#v7-map-type', 'SHOWCASE');
      ${factions.map((faction, seat) => `set('#v7-faction-${seat}', '${faction}');`).join("\n      ")}
      document.querySelector('[data-action="launch"]').click();
    })()`,
  );
  await waitFor(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
    900,
  );
  // The setup form keeps every seat's faction distinct: check it played
  // the ones asked for.
  const played = await evaluate<string[]>(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return [...v.players].sort((a, b) => a.seat - b.seat).map((player) => player.faction); })()`,
  );
  if (played.join() !== factions.join())
    throw new Error(`Showcase played ${played.join()}, not ${factions.join()}`);
  await delay(1_200);
}

async function mountFixture(
  connection: Connection,
  baseUrl: string,
  fixture: string,
  classic: boolean,
): Promise<void> {
  await navigate(connection, baseUrl);
  await evaluate(
    connection,
    classic
      ? `localStorage.setItem('${CLASSIC_KEY}', JSON.stringify({ classic: true }))`
      : `localStorage.removeItem('${CLASSIC_KEY}')`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: "/tests/fixtures/v7-faction-looks.ts",
      fixture,
      artSet: "CHIBI",
      global: "__FACTION_LOOKS__",
      extras: "at: fixtures.FACTION_LOOKS_V7",
      settingsStorage: "localStorage",
    }),
  );
  await delay(1_200);
  // Frame the contact: select its empty middle cell, walk the cursor down
  // to the Eggs' row and back (the camera follows it), then clear it.
  await activate(connection, FOCUS);
  await keys(connection, ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown"]);
  await keys(connection, ["ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp"]);
  // And west to the Dinosaurs and back, for the phone's narrow view.
  await keys(connection, ["ArrowLeft", "ArrowLeft", "ArrowLeft"]);
  await keys(connection, ["ArrowRight", "ArrowRight"]);
  await deselect(connection);
}

async function captureAll(baseUrl: string): Promise<void> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary");
  const debugPort = 11_200 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-looks-"));
  const url = new URL(baseUrl);
  url.searchParams.set("art", "chibi");
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
      if (want("showcase") || want("naval"))
        for (const [label, factions] of SHOWCASES) {
          await launchShowcase(connection, url.href, factions);
          if (want("showcase"))
            for (const step of STEPS) {
              await zoomStep(connection, step);
              await capture(
                connection,
                `showcase-${label}-${size.name}-zoom-${step}.png`,
              );
            }
          if (label !== "a" || !want("naval")) continue;
          for (const scene of ["COAST", "MIXED"] as const) {
            await evaluate(
              connection,
              `(async () => { const module = await import('/scripts/art/naval-factions/scene.ts'); ${SCENE} = module.showNavalSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify({ kind: scene })}); return true; })()`,
            );
            for (const step of STEPS) {
              for (let attempt = 0; attempt < 6; attempt += 1) {
                const current = await evaluate<string | null>(
                  connection,
                  `${SCENE}.canvas.dataset.zoomStep ?? null`,
                );
                if (current === String(step)) break;
                await evaluate(
                  connection,
                  `${SCENE}.host.zoom(${JSON.stringify(Number(current) < step ? "IN" : "OUT")})`,
                );
              }
              await capture(
                connection,
                `naval-${scene.toLowerCase()}-${size.name}-zoom-${step}.png`,
              );
            }
            await evaluate(
              connection,
              `(() => { ${SCENE}.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
            );
          }
        }
      if (want("contact"))
        for (const [label, fixture] of MIXES) {
          await mountFixture(connection, url.href, fixture, false);
          for (const step of STEPS) {
            await zoomStep(connection, step);
            await capture(
              connection,
              `contact-${label}-${size.name}-zoom-${step}.png`,
            );
          }
          await zoomStep(connection, 1);
          await activate(connection, SELECTED);
          await capture(
            connection,
            `selected-${label}-${size.name}-zoom-1.png`,
          );
          await deselect(connection);
        }
      if (want("classic") && size.name === "desktop") {
        await mountFixture(
          connection,
          url.href,
          "factionLooksMixAFixtureV7",
          true,
        );
        await zoomStep(connection, 1);
        await capture(connection, "contact-a-classic-desktop-zoom-1.png");
        await evaluate(connection, `localStorage.removeItem('${CLASSIC_KEY}')`);
      }
    }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
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
  const port = Number.parseInt(option("--port") ?? "6535", 10);
  const given = option("--url");
  const server = given === undefined ? await startDevServer(port) : undefined;
  try {
    await captureAll(given ?? `http://localhost:${port}/`);
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
          bead: "pulp_wars-w5j.3",
          command: "npm run art:faction-looks-review",
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
