import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import { RULESET_7_ID } from "../src/engine/index";

if ((RULESET_7_ID as string) !== "pulp-wars-poc-7r2")
  throw new Error(
    `This tactical browser review is archived for pulp-wars-poc-7r2 and cannot run against ${RULESET_7_ID}; use a separately approved revision-3 review instead of overwriting historical evidence`,
  );

interface DebugTarget {
  readonly type: string;
  readonly url: string;
  readonly webSocketDebuggerUrl: string;
}
interface ProtocolMessage {
  readonly id?: number;
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
  Home: 36,
  Minus: 189,
} as const;
const baseUrl =
  process.argv.find((argument) => argument.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const outputRoot = path.join(
  process.cwd(),
  "art/integration/reviews/ruleset7-tactical-ui",
);
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_220 + (process.pid % 80);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-v7-tactical-${process.pid}`
  : path.join(
      process.env.TMPDIR ?? "/tmp",
      `pulp-wars-v7-tactical-${process.pid}`,
    );
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
  await waitFor(connection, `document.querySelector('#app') !== null`);

  await mountFixture(connection, "pursuit");
  await viewport(connection, 1024, 768, 1);
  const pursuit = await evaluate<{
    readonly source: Coord;
    readonly destination: Coord;
    readonly path: readonly Coord[];
  }>(
    connection,
    `(() => { const s = __TACTICAL_REVIEW__.controller.snapshot(); const v = s.view; const c = s.offeredCommands.find((x) => x.kind === 'PURSUE' && x.path.length === 2); const source = c && v.units.find((x) => x.id === c.unitId)?.at; if (!c || !source) throw new Error('Pursuit review path missing'); __TACTICAL_REVIEW__.host.activate(source); return { source, destination: c.path.at(-1), path: c.path }; })()`,
  );
  await evaluate(connection, `__TACTICAL_REVIEW__.host.focus()`);
  await moveCursor(connection, pursuit.source, pursuit.destination);
  await waitFor(
    connection,
    `document.querySelector('.board-canvas-v7 + .sr-only')?.textContent?.includes('Pursue 2 cells') === true`,
  );
  const pursuitCursorText = await evaluate<string>(
    connection,
    `document.querySelector('.board-canvas-v7 + .sr-only')?.textContent ?? ''`,
  );
  await assertLayout(connection, "1024 Pursuit");
  await framePublicEndpoints(connection, pursuit.destination, pursuit.source);
  await waitForImages(connection);
  await capture(connection, "tactical-pursuit-identity-1024-dpr1.png");
  await revealTacticalState(connection, "pursuit");
  await framePublicEndpoints(
    connection,
    pursuit.destination,
    pursuit.source,
    false,
  );
  await waitForImages(connection);
  await capture(connection, "tactical-pursuit-1024-dpr1.png");

  await mountFixture(connection, "reward");
  await viewport(connection, 1024, 768, 1);
  await waitFor(
    connection,
    `document.querySelector('[data-v7-region="mandatory-reward"]') !== null && __TACTICAL_REVIEW__.controller.snapshot().offeredCommands.every((x) => x.kind === 'CHOOSE_CITY_REWARD')`,
  );
  await click(connection, '[data-action="reward-survey"]');
  await waitFor(
    connection,
    `__TACTICAL_REVIEW__.accepted.some((x) => x.kind === 'CHOOSE_CITY_REWARD') && __TACTICAL_REVIEW__.controller.snapshot().offeredCommands.some((x) => x.kind === 'END_PURSUIT') && document.querySelector('[data-tactical-state="pursuit"]') !== null`,
  );
  const rewardPursuit = await evaluate<{
    readonly accepted: readonly string[];
    readonly offeredAfterReward: readonly string[];
    readonly statusText: string;
  }>(
    connection,
    `(() => ({ accepted: __TACTICAL_REVIEW__.accepted.map((x) => x.kind), offeredAfterReward: __TACTICAL_REVIEW__.controller.snapshot().offeredCommands.map((x) => x.kind), statusText: document.querySelector('[data-tactical-state="pursuit"]')?.textContent ?? '' }))()`,
  );
  await waitForImages(connection);
  await capture(connection, "tactical-reward-pursuit-1024-dpr1.png");

  await mountFixture(connection, "defection");
  await viewport(connection, 390, 844, 2);
  const defection = await evaluate<{
    readonly source: Coord;
    readonly target: Coord;
  }>(
    connection,
    `(() => { const r = __TACTICAL_REVIEW__; const v = r.controller.snapshot().view; const source = v.units.find((x) => x.ownerId === v.viewer.id && x.role === 'ENVOY'); const target = v.units.find((x) => x.ownerId !== v.viewer.id); if (!source || !target) throw new Error('Defection endpoints missing'); r.host.activate(source.at); return { source: source.at, target: target.at }; })()`,
  );
  await click(connection, '[data-action="defection"]');
  await key(connection, "ArrowRight", "ArrowRight");
  await key(connection, "ArrowRight", "ArrowRight");
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('[data-v7-region="defection-home-city-choice"]') !== null`,
  );
  await assertLayout(connection, "390 DPR2 Defection choice");
  await waitForImages(connection);
  await capture(connection, "tactical-defection-choice-390-dpr2.png");
  await click(connection, '[data-action^="defection-city-"]');
  await waitFor(
    connection,
    `__TACTICAL_REVIEW__.accepted.some((x) => x.kind === 'OFFER_DEFECTION') && document.querySelector('[data-tactical-state="defection"]') !== null`,
  );
  await framePublicEndpoints(connection, defection.target, defection.source);
  await revealTacticalState(connection, "defection");
  await assertTacticalStateVisible(connection, "defection");
  await capture(connection, "tactical-defection-status-390-dpr2.png");

  await mountFixture(connection, "blackout");
  await viewport(connection, 320, 720, 1);
  await evaluate(
    connection,
    `(() => { const r = __TACTICAL_REVIEW__; const v = r.controller.snapshot().view; const u = v.units.find((x) => x.ownerId === v.viewer.id && x.role === 'SABOTEUR'); if (!u) throw new Error('Saboteur missing'); r.host.activate(u.at); })()`,
  );
  await touch(connection, '[data-action="blackout"]');
  await waitFor(
    connection,
    `__TACTICAL_REVIEW__.accepted.some((x) => x.kind === 'BLACKOUT_CITY')`,
  );
  await delay(400);
  const blackoutCity = await evaluate<Coord>(
    connection,
    `(() => { const r = __TACTICAL_REVIEW__; const s = r.controller.snapshot(); const id = s.view.blackoutStatuses[0]?.cityId; const city = s.view.cities.find((x) => x.id === id); if (!city) throw new Error('Blackout city missing'); r.host.activate(city.at); return city.at; })()`,
  );
  await waitFor(
    connection,
    `document.querySelector('[data-tactical-state="blackout"]') !== null`,
  );
  await refreshFocusedEndpoint(connection, blackoutCity);
  await revealTacticalState(connection, "blackout");
  await assertTacticalStateVisible(connection, "blackout");
  await assertLayout(connection, "320 Blackout status");
  await waitForImages(connection);
  await capture(connection, "tactical-blackout-status-320-dpr1.png");

  await viewport(connection, 600, 780, 1);
  await click(connection, '[data-action="settings"]');
  await click(connection, '[data-action="high-contrast"]');
  await selectOption(connection, "#v7-motion", 1);
  await selectOption(connection, "#v7-ui-scale", 3);
  await waitFor(
    connection,
    `document.querySelector('.v7-app-shell')?.dataset.contrast === 'high' && document.querySelector('#v7-motion')?.value === 'REDUCED' && document.querySelector('#v7-ui-scale')?.value === '2'`,
  );
  await click(connection, '[data-action="close-overlay"]');
  await assertLayout(connection, "600 200 percent high contrast Blackout");
  await capture(
    connection,
    "tactical-blackout-600-zoom200-high-contrast-reduced.png",
  );

  const evidence = await evaluate<unknown>(
    connection,
    `(() => ({ fixtureLabel: __TACTICAL_REVIEW__.fixtureLabel, controllerBoundary: 'STRICT_OFFERED_COMMANDS_REAL_ENGINE_APPLY_PROJECTED_EVENTS', accepted: __TACTICAL_REVIEW__.accepted, publicStatus: __TACTICAL_REVIEW__.controller.snapshot().view.blackoutStatuses, route: location.search }))()`,
  );
  const evidenceJson = await format(
    JSON.stringify({
      setup: "ENGINE_APPLIED_SYNTHETIC_FIXTURE",
      note: "Not a natural campaign. Test-owned strict controller exposes public snapshots/offered commands/projected accepted events only.",
      pursuitPath: pursuit.path,
      pursuitCursorText,
      rewardPursuitPrecedence: rewardPursuit,
      browserEvidence: evidence,
      screenshots: [
        "tactical-pursuit-identity-1024-dpr1.png",
        "tactical-pursuit-1024-dpr1.png",
        "tactical-reward-pursuit-1024-dpr1.png",
        "tactical-defection-choice-390-dpr2.png",
        "tactical-defection-status-390-dpr2.png",
        "tactical-blackout-status-320-dpr1.png",
        "tactical-blackout-600-zoom200-high-contrast-reduced.png",
      ],
    }),
    { parser: "json" },
  );
  await writeFile(path.join(outputRoot, "evidence.json"), evidenceJson);
  connection.close();
  console.log(
    `Ruleset-7 tactical UI Chrome review passed for strict synthetic fixtures: ${JSON.stringify(evidence)}. Evidence: ${outputRoot}`,
  );
} finally {
  browser.kill();
}

async function mountFixture(
  connection: Connection,
  kind: "pursuit" | "reward" | "defection" | "blackout",
): Promise<void> {
  const fixtureFunction =
    kind === "pursuit"
      ? "pursuitPublicFixtureV7"
      : kind === "reward"
        ? "pursuitRewardPublicFixtureV7"
        : kind === "defection"
          ? "defectionPublicFixtureV7"
          : "blackoutPublicFixtureV7";
  await evaluate(
    connection,
    `(async () => {
      globalThis.__PULP_WARS_APP__?.destroy?.();
      globalThis.__TACTICAL_REVIEW__?.app?.destroy?.();
      const fixtures = await import('/tests/fixtures/ruleset7-tactical-ui.ts');
      const engine = await import('/src/engine/index.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      const fixture = fixtures.${fixtureFunction}(${kind === "defection" ? "true" : ""});
      let state = fixture.state;
      const accepted = [];
      const snapshots = new Set();
      const boundaries = new Set();
      const snapshotOf = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai: { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 } };
      };
      let snapshot = snapshotOf();
      const controller = {
        snapshot: () => snapshot,
        subscribe: (fn) => { snapshots.add(fn); fn(snapshot); return () => snapshots.delete(fn); },
        subscribeAcceptedBoundary: (fn) => { boundaries.add(fn); return () => boundaries.delete(fn); },
        dispatch: async (command) => {
          if (!snapshot.offeredCommands.some((candidate) => JSON.stringify(candidate) === JSON.stringify(command))) return { accepted: false, reason: 'NOT_OFFERED' };
          const beforeState = state;
          const beforeView = snapshot.view;
          const result = engine.applyCommandV7(beforeState, beforeState.humanPlayerId, command);
          if (!result.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: result.error };
          accepted.push(command);
          state = result.state;
          const afterView = engine.viewForV7(state, state.humanPlayerId);
          const playerEvents = engine.projectEventsV7(beforeState, state, state.humanPlayerId, result.events);
          snapshot = snapshotOf();
          const boundary = { actor: 'HUMAN', beforeView, afterView, playerEvents };
          boundaries.forEach((fn) => fn(boundary));
          snapshots.forEach((fn) => fn(snapshot));
          return { accepted: true, beforeView, afterView, playerEvents };
        },
        launch: async () => ({ ok: false, code: 'INVALID_SETUP', diagnostic: 'Fixture active' }),
        resume: async () => false,
        returnToMenu: async () => false,
        progressAiTurns: async () => ({ ok: false, cancelled: true, acceptedCommands: 0, diagnostic: 'Fixture has no AI runner' }),
        restart: async () => ({ ok: false, code: 'CONTROLLER_DESTROYED', diagnostic: 'Fixture restart disabled' }),
        deleteStoredSave: async () => false,
        setFastForward: () => {},
        exportSafeLog: () => null,
        exportDebugBundle: () => ({ ok: false, reason: 'NO_ACTIVE_MATCH' }),
      };
      const host = new CanvasBoardHostV7(document);
      const app = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost: host, settingsStorage: null });
      globalThis.__TACTICAL_REVIEW__ = { app, controller, host, accepted, fixtureLabel: fixture.label };
      return { label: fixture.label, commands: snapshot.offeredCommands.map((command) => command.kind) };
    })()`,
  );
  await waitFor(
    connection,
    `globalThis.__TACTICAL_REVIEW__?.fixtureLabel === 'ENGINE_APPLIED_SYNTHETIC_FIXTURE'`,
  );
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
    readonly minimumTargetHeight: number;
    readonly directDockOverlaps: readonly string[];
    readonly visibleMapHeight: number;
  }>(
    connection,
    `(() => { const targets = Array.from(document.querySelectorAll('button:not(:disabled), input, select')).filter((node) => node.getBoundingClientRect().height > 0); const dock = document.querySelector('.v7-selection-dock'); const hud = document.querySelector('.v7-match-hud'); const children = dock ? Array.from(dock.children).filter((node) => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0; }) : []; const overlaps = []; for (let left = 0; left < children.length; left += 1) for (let right = left + 1; right < children.length; right += 1) { const a = children[left].getBoundingClientRect(); const b = children[right].getBoundingClientRect(); if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) overlaps.push(children[left].className + ' / ' + children[right].className); } const dockTop = dock?.getBoundingClientRect().top ?? innerHeight; const hudBottom = hud?.getBoundingClientRect().bottom ?? 0; return { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, minimumTargetHeight: Math.min(...targets.map((node) => node.getBoundingClientRect().height)), directDockOverlaps: overlaps, visibleMapHeight: dockTop - hudBottom }; })()`,
  );
  if (
    result.scrollWidth > result.clientWidth ||
    result.minimumTargetHeight < 44 ||
    result.directDockOverlaps.length > 0 ||
    result.visibleMapHeight < 120
  )
    throw new Error(`${label} layout failed: ${JSON.stringify(result)}`);
}

async function revealTacticalState(
  connection: Connection,
  state: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); const node = document.querySelector('[data-tactical-state=${JSON.stringify(state)}]'); if (!(dock instanceof HTMLElement) || !(node instanceof HTMLElement)) throw new Error('Missing tactical state ${state}'); dock.scrollTop = Math.max(0, node.offsetTop - 12); })()`,
  );
  await delay(80);
}

async function assertTacticalStateVisible(
  connection: Connection,
  state: string,
): Promise<void> {
  const visible = await evaluate<boolean>(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); const node = document.querySelector('[data-tactical-state=${JSON.stringify(state)}]'); if (!(dock instanceof HTMLElement) || !(node instanceof HTMLElement)) return false; const d = dock.getBoundingClientRect(); const n = node.getBoundingClientRect(); const top = Math.max(d.top, n.top, 0); const bottom = Math.min(d.bottom, n.bottom, innerHeight); return bottom - top >= Math.min(44, n.height); })()`,
  );
  if (!visible)
    throw new Error(`${state} tactical state is not viewport-visible`);
}

async function moveCursor(
  connection: Connection,
  from: Coord,
  to: Coord,
): Promise<void> {
  const horizontal = to.x < from.x ? "ArrowLeft" : "ArrowRight";
  for (let index = 0; index < Math.abs(to.x - from.x); index += 1)
    await key(connection, horizontal, horizontal);
  const vertical = to.y < from.y ? "ArrowUp" : "ArrowDown";
  for (let index = 0; index < Math.abs(to.y - from.y); index += 1)
    await key(connection, vertical, vertical);
}

async function framePublicEndpoints(
  connection: Connection,
  focused: Coord,
  counterpart: Coord,
  zoomOut = true,
): Promise<void> {
  await evaluate(connection, `__TACTICAL_REVIEW__.host.focus()`);
  if (zoomOut) await key(connection, "-", "Minus");
  await moveCursor(connection, focused, counterpart);
  await moveCursor(connection, counterpart, focused);
  await delay(80);
}

async function refreshFocusedEndpoint(
  connection: Connection,
  focused: Coord,
): Promise<void> {
  const neighbor =
    focused.x > 0
      ? { x: focused.x - 1, y: focused.y }
      : { x: focused.x + 1, y: focused.y };
  await framePublicEndpoints(connection, focused, neighbor);
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
  await connection.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function touch(connection: Connection, selector: string): Promise<void> {
  const point = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); node.scrollIntoView({ block: 'center' }); const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`,
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
  code: keyof typeof keyCodes,
): Promise<void> {
  const keyCode = keyCodes[code];
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

async function waitForImages(connection: Connection): Promise<void> {
  await waitFor(
    connection,
    `Array.from(document.querySelectorAll('img')).every((image) => image.complete && image.naturalWidth > 0)`,
  );
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

async function evaluate<T = unknown>(
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
      request.reject(new Error(message.error.message ?? "CDP failed"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
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
