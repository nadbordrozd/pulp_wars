import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

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
  close(): void;
}

interface Coord {
  readonly x: number;
  readonly y: number;
}

const keyCodes = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
  Enter: 13,
  Escape: 27,
  Home: 36,
  KeyA: 65,
  Tab: 9,
} as const;

const baseUrl =
  process.argv.find((argument) => argument.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const outputRoot = path.join(
  process.cwd(),
  "art/integration/reviews/ruleset7-core-ui",
);
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_100 + (process.pid % 80);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-v7-core-${process.pid}`
  : path.join(process.env.TMPDIR ?? "/tmp", `pulp-wars-v7-core-${process.pid}`);
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
    "--window-size=1024,768",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  await mkdir(outputRoot, { recursive: true });
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Runtime.evaluate", {
    expression: "localStorage.clear()",
  });
  await connection.send("Page.reload");
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null`,
  );
  await click(connection, "#v7-seed");
  await key(connection, "a", "KeyA", 2);
  await connection.send("Input.insertText", { text: "20" });
  await click(connection, '[data-action="launch"]');
  await waitFor(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId; })()`,
  );
  await viewport(connection, 1024, 768, 1);
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelectorAll('.v7-unit-stats dt').length === 6`,
  );
  await assertCapitalArtVisible(connection);
  await assertActionVisible(connection, '[data-action="end-turn"]');
  await assertLayout(connection, "1024 unit dock");
  await waitForImages(connection);
  await capture(connection, "core-1024-unit-dock.png");
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.textContent?.includes('Assigned units') === true`,
  );
  await assertActionVisible(connection, '[data-action="end-turn"]');
  await waitForImages(connection);
  await capture(connection, "core-1024-city-dock.png");
  await click(connection, '[data-action="tech"]');
  await waitFor(
    connection,
    `document.querySelectorAll('.v7-tech-card').length === 25 && document.querySelectorAll('.v7-tech-edge').length === 20`,
  );
  await assertLayout(connection, "1024 Tech");
  await waitForImages(connection);
  await capture(connection, "core-1024-tech.png");
  await click(connection, '[data-action="close-overlay"]');

  const resources = await evaluate<{
    readonly game: Coord;
    readonly fertile: Coord;
    readonly capital: Coord;
  }>(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const capital = v.cities.find((city) => city.ownerId === v.viewer.id && city.isCapital)?.at; const game = v.board.tiles.find((tile) => tile.explored && tile.resource === 'GAME')?.at; const fertile = v.board.tiles.find((tile) => tile.explored && tile.resource === 'FERTILE_GROUND')?.at; if (!capital || !game || !fertile) throw new Error('Game/Fertile/capital public framing fixture missing'); return { capital, game, fertile }; })()`,
  );
  let cursor = resources.capital;
  await key(connection, "Escape", "Escape");
  cursor = await moveCursor(connection, cursor, resources.game);
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.textContent?.includes('Game') === true`,
  );
  await viewport(connection, 390, 844, 2);
  await assertLayout(connection, "390 DPR2 Game dock");
  await waitForImages(connection);
  await capture(connection, "core-390-dpr2-game-dock.png");

  await touch(connection, '[data-action="compact-menu"]');
  await waitFor(
    connection,
    `document.querySelector('[data-action="compact-menu"]')?.getAttribute('aria-expanded') === 'true'`,
  );
  await touch(connection, '[data-action="settings"]');
  await waitFor(connection, `document.querySelector('#v7-motion') !== null`);
  await touch(connection, '[data-action="close-overlay"]');
  await touch(connection, '[data-action="close-dock"]');
  cursor = await moveCursor(connection, cursor, resources.fertile);
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.textContent?.includes('Fertile ground') === true`,
  );
  await viewport(connection, 320, 720, 1);
  await assertLayout(connection, "320 Fertile dock");
  await waitForImages(connection);
  await capture(connection, "core-320-fertile-dock.png");

  await assertActionVisible(connection, '[data-action="compact-menu"]');
  await touch(connection, '[data-action="compact-menu"]');
  await waitFor(
    connection,
    `document.querySelector('[data-action="compact-menu"]')?.getAttribute('aria-expanded') === 'true'`,
  );
  await assertActionVisible(connection, '[data-action="tech"]');
  await touch(connection, '[data-action="tech"]');
  await waitFor(
    connection,
    `document.querySelectorAll('.v7-tech-card').length === 25 && document.querySelectorAll('.v7-tech-edge').length === 20`,
  );
  await viewport(connection, 600, 780, 1);
  await assertLayout(connection, "600 Tech");
  await waitForImages(connection);
  await capture(connection, "core-600-tech.png");
  await click(connection, '[data-action="close-overlay"]');
  await click(connection, '[data-action="settings"]');
  await click(connection, '[data-action="high-contrast"]');
  await selectOption(connection, "#v7-motion", 1);
  await selectOption(connection, "#v7-ui-scale", 3);
  await waitFor(
    connection,
    `(() => { const close = document.querySelector('[data-action="close-overlay"]'); return document.querySelector('.v7-app-shell')?.dataset.contrast === 'high' && document.querySelector('#v7-motion')?.value === 'REDUCED' && document.querySelector('#v7-ui-scale')?.value === '2' && close instanceof HTMLButtonElement && close.getBoundingClientRect().height + 1 >= close.scrollHeight; })()`,
  );
  await assertLayout(connection, "200 percent Settings");
  await capture(connection, "core-600-zoom200-high-contrast-reduced.png");
  await click(connection, '[data-action="close-overlay"]');
  await key(connection, "Escape", "Escape");

  for (let harvested = 0; harvested < 2; harvested += 1) {
    const command = await evaluate<Coord>(
      connection,
      `(() => { const c = globalThis.__PULP_WARS_APP__.controller.snapshot().offeredCommands.find((candidate) => candidate.kind === 'HARVEST_FRUIT'); if (!c) throw new Error('Harvest command missing'); return c.at; })()`,
    );
    cursor = await moveCursor(connection, cursor, command);
    await key(connection, "Enter", "Enter");
    await waitFor(
      connection,
      `document.querySelector('[data-action="command-harvest_fruit"]') !== null`,
    );
    const priorIndex = await evaluate<number>(
      connection,
      `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
    );
    await click(connection, '[data-action="command-harvest_fruit"]');
    await waitFor(
      connection,
      `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex > ${priorIndex}`,
    );
    if (harvested === 0)
      await waitFor(
        connection,
        `document.activeElement?.classList?.contains('board-canvas-v7') === true && document.querySelector('[data-action="end-turn"]:not(:disabled)') !== null`,
      );
  }
  await waitFor(
    connection,
    `(() => { const modal = document.querySelector('[data-mandatory-choice]'); const first = modal?.querySelector('button:not(:disabled)'); return modal !== null && first !== null && modal.contains(document.activeElement); })()`,
  );
  await assertLayout(connection, "mandatory reward");
  await waitForImages(connection);
  await capture(connection, "core-600-mandatory-reward.png");
  const coinsBeforeReward = await evaluate<number>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.viewer.coins`,
  );
  await click(connection, '[data-action="reward-stockpile"]');
  await waitFor(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return v.pendingChoices.length === 0 && v.viewer.coins === ${coinsBeforeReward + 4} && document.activeElement?.classList?.contains('board-canvas-v7') === true; })()`,
  );
  await capture(connection, "core-600-reward-resolved.png");
  const evidence = await evaluate<unknown>(
    connection,
    `(() => ({ route: location.search, phase: globalThis.__PULP_WARS_APP__.controller.snapshot().phase, commandIndex: globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex, coins: globalThis.__PULP_WARS_APP__.controller.snapshot().view.viewer.coins, pendingChoices: globalThis.__PULP_WARS_APP__.controller.snapshot().view.pendingChoices.length, selectedIdentityArt: document.querySelector('.v7-identity img')?.dataset.assetId ?? null, focusedClass: document.activeElement?.className ?? null }))()`,
  );
  connection.close();
  console.log(
    `Ruleset-7 core UI Chrome review passed with real pointer/keyboard input: ${JSON.stringify(evidence)}. Screenshots: ${outputRoot}`,
  );
} finally {
  browser.kill();
}

async function viewport(
  connection: Connection,
  width: number,
  height: number,
  dpr: number,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: width <= 390,
  });
  await delay(100);
}

async function assertLayout(
  connection: Connection,
  label: string,
): Promise<void> {
  const result = await evaluate<{
    readonly clientWidth: number;
    readonly scrollWidth: number;
    readonly minimumTargetWidth: number;
    readonly minimumTargetHeight: number;
    readonly clippedContainers: readonly string[];
  }>(
    connection,
    `(() => { const targets = Array.from(document.querySelectorAll('button:not(:disabled), input, select')).filter((node) => node.getBoundingClientRect().width > 0); const containers = Array.from(document.querySelectorAll('.v7-overlay, .v7-selection-dock, .v7-tech-graph, .v7-tech-screen')).filter((node) => node.getBoundingClientRect().width > 0); return { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, minimumTargetWidth: Math.min(...targets.map((node) => node.getBoundingClientRect().width)), minimumTargetHeight: Math.min(...targets.map((node) => node.getBoundingClientRect().height)), clippedContainers: containers.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.className) }; })()`,
  );
  if (
    result.scrollWidth > result.clientWidth ||
    result.minimumTargetWidth < 44 ||
    result.minimumTargetHeight < 44 ||
    result.clippedContainers.length > 0
  )
    throw new Error(`${label} layout failed: ${JSON.stringify(result)}`);
}

async function assertActionVisible(
  connection: Connection,
  selector: string,
): Promise<void> {
  const result = await evaluate<{
    readonly visible: boolean;
    readonly disabled: boolean | null;
    readonly rect: object | null;
    readonly hit: string | null;
    readonly viewport: object;
    readonly scale: string | null;
  }>(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); const shell = document.querySelector('.v7-app-shell'); if (!(node instanceof HTMLButtonElement)) return { visible: false, disabled: null, rect: null, hit: null, viewport: { innerWidth, innerHeight }, scale: shell instanceof HTMLElement ? shell.style.getPropertyValue('--ui-scale') : null }; const rect = node.getBoundingClientRect(); const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2); return { visible: !node.disabled && (hit === node || (hit instanceof Node && node.contains(hit))), disabled: node.disabled, rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height }, hit: hit instanceof HTMLElement ? hit.tagName + '.' + hit.className : null, viewport: { innerWidth, innerHeight }, scale: shell instanceof HTMLElement ? shell.style.getPropertyValue('--ui-scale') : null }; })()`,
  );
  if (!result.visible)
    throw new Error(
      `${selector} is not visibly actionable: ${JSON.stringify(result)}`,
    );
}

async function assertCapitalArtVisible(connection: Connection): Promise<void> {
  const sample = await evaluate<{
    readonly artPixels: number;
    readonly width: number;
    readonly height: number;
  }>(
    connection,
    `(() => { const canvas = document.querySelector('.board-canvas-v7'); if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas missing'); const context = canvas.getContext('2d'); if (!context) throw new Error('Canvas context missing'); const dpr = devicePixelRatio; const width = Math.min(canvas.width, Math.round(160 * dpr)); const height = Math.min(canvas.height, Math.round(160 * dpr)); const left = Math.max(0, Math.round(canvas.width / 2 - width / 2)); const top = Math.max(0, Math.round(canvas.height * 0.55 - height / 2)); const pixels = context.getImageData(left, top, width, height).data; let artPixels = 0; for (let index = 0; index < pixels.length; index += 4) { const red = pixels[index]; const green = pixels[index + 1]; const blue = pixels[index + 2]; if (Math.max(red, green, blue) > 100 && Math.max(red, green, blue) - Math.min(red, green, blue) > 15) artPixels += 1; } return { artPixels, width, height }; })()`,
  );
  if (sample.artPixels < sample.width * sample.height * 0.15)
    throw new Error(
      `Accepted capital-region art is not visibly rendered: ${JSON.stringify(sample)}`,
    );
}

async function waitForImages(connection: Connection): Promise<void> {
  await waitFor(
    connection,
    `Array.from(document.querySelectorAll('img')).every((image) => image.complete && image.naturalWidth > 0)`,
  );
}

async function moveCursor(
  connection: Connection,
  from: Coord,
  to: Coord,
): Promise<Coord> {
  const horizontal =
    to.x < from.x ? ["ArrowLeft", "ArrowLeft"] : ["ArrowRight", "ArrowRight"];
  for (let index = 0; index < Math.abs(to.x - from.x); index += 1)
    await key(connection, horizontal[0], horizontal[1]);
  const vertical =
    to.y < from.y ? ["ArrowUp", "ArrowUp"] : ["ArrowDown", "ArrowDown"];
  for (let index = 0; index < Math.abs(to.y - from.y); index += 1)
    await key(connection, vertical[0], vertical[1]);
  return to;
}

async function selectOption(
  connection: Connection,
  selector: string,
  downCount: number,
): Promise<void> {
  await click(connection, selector);
  await key(connection, "Home", "Home");
  for (let index = 0; index < downCount; index += 1)
    await key(connection, "ArrowDown", "ArrowDown");
  await key(connection, "Enter", "Enter");
}

async function click(connection: Connection, selector: string): Promise<void> {
  const point = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); node.scrollIntoView({ block: 'center', inline: 'center' }); const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`,
  );
  await clickPoint(connection, point.x, point.y);
}

async function clickPoint(
  connection: Connection,
  x: number,
  y: number,
): Promise<void> {
  await connection.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x,
    y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function touch(connection: Connection, selector: string): Promise<void> {
  const point = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`,
  );
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function key(
  connection: Connection,
  keyValue: string,
  code: string,
  modifiers = 0,
): Promise<void> {
  const keyCode = keyCodes[code as keyof typeof keyCodes];
  if (keyCode === undefined) throw new Error(`Missing key code ${code}`);
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: keyValue,
    code,
    modifiers,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    modifiers,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(
    path.join(outputRoot, name),
    Buffer.from(response.data, "base64"),
  );
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
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: {
      readonly exception?: { readonly description?: string };
      readonly text?: string;
    };
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
): Promise<void> {
  for (let attempt = 0; attempt < 300; attempt += 1) {
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

async function waitForTarget(
  debugPort: number,
  expectedUrl: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const target = targets.find(
          (candidate) =>
            candidate.type === "page" && candidate.url.startsWith(expectedUrl),
        );
        if (target !== undefined) return target;
      }
    } catch {
      // Chrome may not have opened its debugging port yet.
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
    {
      readonly method: string;
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
    }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(
        new Error(
          `${request.method}: ${message.error.message ?? "CDP failed"}`,
        ),
      );
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { method, resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
