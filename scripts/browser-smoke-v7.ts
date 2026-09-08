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

interface BrowserErrorV7 {
  readonly method: string;
  readonly detail: string;
}

interface PreviewEvidenceV7 {
  readonly initial: {
    readonly viewerId: number;
    readonly activePlayerId: number;
    readonly humanCoins: number;
    readonly commandIndex: number;
    readonly projectedViewerId: number;
  };
  readonly returned: {
    readonly viewerId: number;
    readonly activePlayerId: number;
    readonly humanCoins: number;
    readonly commandIndex: number;
    readonly policySlices: number;
    readonly maximumSliceMilliseconds: number;
    readonly fastForwardObserved: boolean;
    readonly hostTicks: number;
  };
  readonly persisted: {
    readonly version: number;
    readonly rulesetId: string;
    readonly commandIndex: number;
  };
  readonly ordinaryBoundary: {
    readonly controllerOwnProperties: readonly string[];
    readonly snapshotHasStateHash: boolean;
    readonly snapshotHasReplay: boolean;
    readonly publicPlayersLeakPrivateState: boolean;
  };
  readonly exports: {
    readonly safeClassification: string;
    readonly safeViewerId: number;
    readonly debugClassification: string;
    readonly debugWarning: string;
  };
}

interface ColdPolicyEvidenceV7 {
  readonly commandIndex: number;
  readonly callbacks: number;
  readonly hostTicks: number;
  readonly maximumCallbackMilliseconds: number;
  readonly totalMilliseconds: number;
  readonly decisionKind: string | null;
}

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly onEvent: (
    listener: (method: string, params: unknown) => void,
  ) => () => void;
  readonly close: () => void;
};

const baseUrl =
  process.argv.slice(2).find((argument) => !argument.startsWith("--")) ??
  "http://localhost:6173/?ruleset=7";
const reviewRoot = path.join(
  process.cwd(),
  "art/integration/reviews/ruleset7-preview",
);
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9_900 + (process.pid % 80);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-v7-smoke-${process.pid}`
  : path.join(
      process.env.TMPDIR ?? "/tmp",
      `pulp-wars-v7-smoke-${process.pid}`,
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
    "--window-size=1440,1000",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  await mkdir(reviewRoot, { recursive: true });
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  const browserErrors: BrowserErrorV7[] = [];
  connection.onEvent((method, params) => {
    const detail = eventErrorDetail(method, params);
    if (detail !== null) browserErrors.push({ method, detail });
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Log.enable");
  await waitForExpression(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );

  await evaluate(
    connection,
    `(() => {
      localStorage.removeItem('pulpWars.save.v7r2.current');
      localStorage.setItem('pulpWars.save.v7.current', 'old-v7-bytes');
      localStorage.setItem('pulpWars.save.current', 'v6-bytes');
      const controller = globalThis.__PULP_WARS_APP__.controller;
      globalThis.__V7_COUNT_CONTROL__ = document.querySelector('#v7-ai-count');
      globalThis.__V7_SMOKE_TRACE__ = [];
      globalThis.__V7_HOST_TICKS__ = 0;
      globalThis.__V7_HOST_INTERVAL__ = setInterval(() => {
        globalThis.__V7_HOST_TICKS__ += 1;
      }, 0);
      controller.subscribe((snapshot) => {
        globalThis.__V7_SMOKE_TRACE__.push({
          phase: snapshot.phase,
          transitioning: snapshot.transitioning,
          commandIndex: snapshot.view?.commandIndex ?? -1,
          viewerId: snapshot.view?.viewer.id ?? null,
          activePlayerId: snapshot.view?.turnOrder[snapshot.view.activeSeatIndex] ?? null,
          humanCoins: snapshot.view?.viewer.coins ?? null,
          projectedViewerId: controller.exportSafeLog === undefined
            ? null
            : JSON.parse(controller.exportSafeLog()?.source ?? '{}').log?.eventBatches?.at(-1)?.viewerId ?? null,
          aiActive: snapshot.ai.active,
          fastForward: snapshot.ai.fastForward,
        });
      });
    })()`,
  );
  await pointerClick(connection, "#v7-ai-count");
  await pressKey(connection, "ArrowDown", "ArrowDown");
  await pressKey(connection, "Enter", "Enter");
  await pressKey(connection, "Tab", "Tab");
  const focusAfterSelect = await evaluate<{
    readonly id: string | null;
    readonly sameCountControl: boolean;
  }>(
    connection,
    `({ id: document.activeElement?.id ?? null, sameCountControl: document.querySelector('#v7-ai-count') === globalThis.__V7_COUNT_CONTROL__ })`,
  );
  if (
    focusAfterSelect.id !== "v7-ai-mode" ||
    !focusAfterSelect.sameCountControl
  )
    throw new Error(
      `select change replaced keyboard focus/control: ${JSON.stringify(focusAfterSelect)}`,
    );
  await pointerClick(connection, "#v7-ai-count");
  await pressKey(connection, "Home", "Home");
  await pressKey(connection, "Enter", "Enter");
  await pointerClick(connection, "#v7-seed");
  await pressKey(connection, "a", "KeyA", 2);
  await connection.send("Input.insertText", { text: "0" });
  await pointerClick(connection, '[data-action="launch"]');
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().ai.active === true`,
    900,
    10,
  );
  await pointerClick(connection, '[data-action="fast-forward"]');
  await waitForExpression(
    connection,
    `(() => {
      const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot();
      const view = snapshot?.view;
      return snapshot?.phase === 'ACTIVE' && !snapshot.transitioning && !snapshot.ai.active && view?.commandIndex > 0 && view.turnOrder[view.activeSeatIndex] === view.humanPlayerId;
    })()`,
    900,
  );

  const preview = await evaluate<PreviewEvidenceV7>(
    connection,
    `(() => {
      clearInterval(globalThis.__V7_HOST_INTERVAL__);
      const controller = globalThis.__PULP_WARS_APP__.controller;
      const snapshot = controller.snapshot();
      const trace = globalThis.__V7_SMOKE_TRACE__;
      const initial = trace.find((entry) => entry.commandIndex === 0 && entry.viewerId !== null && !entry.transitioning);
      if (!initial) throw new Error('command-zero public trace missing');
      const view = snapshot.view;
      if (!view) throw new Error('returned public view missing');
      const save = JSON.parse(localStorage.getItem('pulpWars.save.v7r2.current') ?? 'null');
      const safe = JSON.parse(controller.exportSafeLog()?.source ?? 'null');
      const debug = controller.exportDebugBundle({ acknowledgeHiddenInformation: true });
      if (!debug.ok) throw new Error('spoiler debug export missing');
      return {
        initial: {
          viewerId: initial.viewerId,
          activePlayerId: initial.activePlayerId,
          humanCoins: initial.humanCoins,
          commandIndex: initial.commandIndex,
          projectedViewerId: initial.projectedViewerId,
        },
        returned: {
          viewerId: view.viewer.id,
          activePlayerId: view.turnOrder[view.activeSeatIndex],
          humanCoins: view.viewer.coins,
          commandIndex: view.commandIndex,
          policySlices: snapshot.ai.policySlices,
          maximumSliceMilliseconds: snapshot.ai.maximumSliceMilliseconds,
          fastForwardObserved: trace.some((entry) => entry.fastForward),
          hostTicks: globalThis.__V7_HOST_TICKS__,
        },
        persisted: {
          version: save?.version,
          rulesetId: save?.rulesetId,
          commandIndex: save?.commandIndex,
        },
        ordinaryBoundary: {
          controllerOwnProperties: Object.getOwnPropertyNames(controller),
          snapshotHasStateHash: Object.hasOwn(snapshot, 'stateHash'),
          snapshotHasReplay: Object.hasOwn(snapshot, 'replay'),
          publicPlayersLeakPrivateState: view.players.some((player) => 'coins' in player || 'researchedTechs' in player || 'achievementEntitlements' in player),
        },
        exports: {
          safeClassification: safe?.log?.classification,
          safeViewerId: safe?.log?.viewerId,
          debugClassification: debug.bundle.classification,
          debugWarning: debug.bundle.warning,
        },
      };
    })()`,
  );
  validatePreview(preview);
  await capture(connection, "desktop-ai-return.png");

  const cold = await evaluate<ColdPolicyEvidenceV7>(
    connection,
    `(async () => {
      const [{ NormalPolicyWorkV7 }] = await Promise.all([
        import('/src/ai/index.ts'),
      ]);
      const response = await fetch('/tests/fixtures/ruleset-v7-late-public-view.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('late public fixture unavailable');
      const view = await response.json();
      const deepFreeze = (value) => {
        if (value && typeof value === 'object') {
          for (const child of Object.values(value)) deepFreeze(child);
          Object.freeze(value);
        }
        return value;
      };
      deepFreeze(view);
      const work = new NormalPolicyWorkV7(view);
      let callbacks = 0;
      let hostTicks = 0;
      let maximumCallbackMilliseconds = 0;
      let decision = null;
      const progress = document.querySelector('[data-v7-ai-progress]');
      const ordinaryProgressText = progress?.textContent ?? null;
      const heartbeat = setInterval(() => { hostTicks += 1; }, 0);
      const totalStarted = performance.now();
      await new Promise((resolve, reject) => {
        const advance = () => {
          const started = performance.now();
          try {
            decision = work.runSlice(4);
            callbacks += 1;
            if (progress) progress.textContent = 'Cold late-view policy slice ' + callbacks;
            maximumCallbackMilliseconds = Math.max(maximumCallbackMilliseconds, performance.now() - started);
            if (decision !== null) resolve();
            else setTimeout(advance, 0);
          } catch (error) {
            reject(error);
          }
        };
        setTimeout(advance, 0);
      });
      clearInterval(heartbeat);
      if (progress && ordinaryProgressText !== null) progress.textContent = ordinaryProgressText;
      return {
        commandIndex: view.commandIndex,
        callbacks,
        hostTicks,
        maximumCallbackMilliseconds,
        totalMilliseconds: performance.now() - totalStarted,
        decisionKind: decision?.command?.kind ?? null,
      };
    })()`,
    true,
  );
  validateColdPolicy(cold);

  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  const mobile = await evaluate<{
    readonly clientWidth: number;
    readonly scrollWidth: number;
    readonly minimumControlHeight: number;
  }>(
    connection,
    `(() => {
      const controls = Array.from(document.querySelectorAll('button, input, select'));
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        minimumControlHeight: Math.min(...controls.map((control) => control.getBoundingClientRect().height)),
      };
    })()`,
  );
  if (
    mobile.scrollWidth > mobile.clientWidth ||
    mobile.minimumControlHeight < 44
  ) {
    throw new Error(
      `mobile preview contract failed: ${JSON.stringify(mobile)}`,
    );
  }
  await capture(connection, "mobile-ai-return-390-dpr2.png");

  const firstDebugHash = await evaluate<string>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.exportDebugBundle({ acknowledgeHiddenInformation: true }).bundle.payload.reproduction.save.stateHash`,
  );
  await touchClick(connection, '[data-action="restart"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.commandIndex > 0 && v.turnOrder[v.activeSeatIndex] === v.humanPlayerId; })()`,
    900,
  );
  const restartedHash = await evaluate<string>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.exportDebugBundle({ acknowledgeHiddenInformation: true }).bundle.payload.reproduction.save.stateHash`,
  );
  if (restartedHash !== firstDebugHash)
    throw new Error("restart changed deterministic v7 state");

  const resumeIndex = await evaluate<number>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
  );
  await connection.send("Page.reload", { ignoreCache: true });
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && s.view?.commandIndex === ${resumeIndex}; })()`,
  );
  await touchClick(connection, '[data-action="delete-save"]');
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  const keys = await evaluate<{
    readonly current: string | null;
    readonly oldV7: string | null;
    readonly v6: string | null;
  }>(
    connection,
    `({ current: localStorage.getItem('pulpWars.save.v7r2.current'), oldV7: localStorage.getItem('pulpWars.save.v7.current'), v6: localStorage.getItem('pulpWars.save.current') })`,
  );
  if (
    keys.current !== null ||
    keys.oldV7 !== "old-v7-bytes" ||
    keys.v6 !== "v6-bytes"
  )
    throw new Error(`route-owned delete failed: ${JSON.stringify(keys)}`);

  await evaluate(
    connection,
    `localStorage.removeItem('pulpWars.save.current')`,
  );
  const explicitSixUrl = routeUrl(baseUrl, "?ruleset=6");
  await connection.send("Page.navigate", { url: explicitSixUrl });
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );
  const explicitSix = await evaluate<{
    readonly hasOriginal: boolean;
    readonly hasCandy: boolean;
    readonly hasV7Preview: boolean;
  }>(
    connection,
    `(() => { const text = document.body.textContent ?? ''; return { hasOriginal: text.includes('Original'), hasCandy: text.includes('Candy'), hasV7Preview: document.querySelector('[data-v7-setup]') !== null }; })()`,
  );
  if (
    !explicitSix.hasOriginal ||
    !explicitSix.hasCandy ||
    explicitSix.hasV7Preview
  )
    throw new Error(
      `explicit ruleset-6 route failed: ${JSON.stringify(explicitSix)}`,
    );

  await connection.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      globalThis.__V7_UNSUPPORTED_STORAGE_CALLS__ = [];
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) {
          globalThis.__V7_UNSUPPORTED_STORAGE_CALLS__.push({ method, key: String(args[0]) });
          return original.apply(this, args);
        };
      }
    })();`,
  });
  const unsupportedUrl = routeUrl(baseUrl, "?ruleset=8");
  await connection.send("Page.navigate", { url: unsupportedUrl });
  await waitForExpression(
    connection,
    `document.querySelector('[data-unsupported-ruleset="8"]') !== null`,
  );
  const unsupported = await evaluate<{
    readonly storageCalls: readonly unknown[];
    readonly appGlobalPresent: boolean;
    readonly diagnostic: string;
  }>(
    connection,
    `({ storageCalls: globalThis.__V7_UNSUPPORTED_STORAGE_CALLS__, appGlobalPresent: Object.hasOwn(globalThis, '__PULP_WARS_APP__'), diagnostic: document.body.textContent ?? '' })`,
  );
  if (
    unsupported.storageCalls.length !== 0 ||
    unsupported.appGlobalPresent ||
    !unsupported.diagnostic.includes("Unsupported ruleset")
  ) {
    throw new Error(
      `unsupported route bootstrap guard failed: ${JSON.stringify(unsupported)}`,
    );
  }

  await delay(200);
  if (browserErrors.length > 0)
    throw new Error(`browser emitted errors: ${JSON.stringify(browserErrors)}`);
  const version = (await connection.send("Browser.getVersion")) as {
    readonly product?: string;
  };
  connection.close();
  console.log(
    `Ruleset-7 preview smoke passed in ${version.product ?? "Chrome"}: production AI ${preview.returned.commandIndex} commands/${preview.returned.policySlices} slices/max ${preview.returned.maximumSliceMilliseconds.toFixed(1)}ms; cold command-1100 policy ${cold.callbacks} callbacks/${cold.hostTicks} host ticks/max ${cold.maximumCallbackMilliseconds.toFixed(1)}ms/${cold.totalMilliseconds.toFixed(1)}ms total; real pointer/keyboard/touch at desktop and mobile 390x844 DPR2; launch/resume/restart/delete, routing and three-key isolation passed. Screenshots: ${reviewRoot}`,
  );
} finally {
  browser.kill();
}

function validatePreview(evidence: PreviewEvidenceV7): void {
  if (
    evidence.initial.commandIndex !== 0 ||
    evidence.initial.viewerId !== 1 ||
    evidence.initial.activePlayerId !== 2 ||
    evidence.initial.humanCoins !== 5 ||
    evidence.initial.projectedViewerId !== 1
  )
    throw new Error(
      `initial boundary failed: ${JSON.stringify(evidence.initial)}`,
    );
  if (
    evidence.returned.viewerId !== 1 ||
    evidence.returned.activePlayerId !== 1 ||
    evidence.returned.humanCoins !== 7 ||
    evidence.returned.commandIndex < 1 ||
    evidence.returned.policySlices < evidence.returned.commandIndex ||
    evidence.returned.maximumSliceMilliseconds > 40 ||
    !evidence.returned.fastForwardObserved ||
    evidence.returned.hostTicks < 1
  )
    throw new Error(
      `production AI boundary failed: ${JSON.stringify(evidence.returned)}`,
    );
  if (
    evidence.persisted.version !== 7 ||
    evidence.persisted.rulesetId !== "pulp-wars-poc-7r2" ||
    evidence.persisted.commandIndex !== evidence.returned.commandIndex
  )
    throw new Error(
      `persisted boundary failed: ${JSON.stringify(evidence.persisted)}`,
    );
  if (
    evidence.ordinaryBoundary.controllerOwnProperties.length !== 0 ||
    evidence.ordinaryBoundary.snapshotHasStateHash ||
    evidence.ordinaryBoundary.snapshotHasReplay ||
    evidence.ordinaryBoundary.publicPlayersLeakPrivateState
  )
    throw new Error(
      `ordinary authority boundary failed: ${JSON.stringify(evidence.ordinaryBoundary)}`,
    );
  if (
    evidence.exports.safeClassification !== "PLAYER_SAFE" ||
    evidence.exports.safeViewerId !== 1 ||
    evidence.exports.debugClassification !== "OMNISCIENT" ||
    evidence.exports.debugWarning !== "INCLUDES_HIDDEN_MAP_AND_UNITS"
  )
    throw new Error(
      `export classification failed: ${JSON.stringify(evidence.exports)}`,
    );
}

function validateColdPolicy(evidence: ColdPolicyEvidenceV7): void {
  if (
    evidence.commandIndex !== 1100 ||
    evidence.callbacks < 2 ||
    evidence.hostTicks < 2 ||
    evidence.maximumCallbackMilliseconds > 40 ||
    evidence.decisionKind === null
  )
    throw new Error(
      `cold late-view responsiveness failed: ${JSON.stringify(evidence)}`,
    );
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
  awaitPromise = false,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise,
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

async function waitForExpression(
  connection: Connection,
  expression: string,
  attempts = 300,
  intervalMilliseconds = 100,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ready = await evaluate<boolean>(
      connection,
      `Boolean(${expression})`,
    ).catch(() => false);
    if (ready) return;
    await delay(intervalMilliseconds);
  }
  const diagnostic = await evaluate<unknown>(
    connection,
    `({ url: location.href, text: document.body.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 800), snapshot: globalThis.__PULP_WARS_APP__?.controller.snapshot() })`,
  ).catch((error: unknown) => ({
    diagnosticFailure: error instanceof Error ? error.message : String(error),
  }));
  throw new Error(
    `Chrome timed out waiting for ${expression}: ${JSON.stringify(diagnostic)}`,
  );
}

async function pointerClick(
  connection: Connection,
  selector: string,
): Promise<void> {
  const point = await elementCenter(connection, selector);
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

async function touchClick(
  connection: Connection,
  selector: string,
): Promise<void> {
  const point = await elementCenter(connection, selector);
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function elementCenter(
  connection: Connection,
  selector: string,
): Promise<{ readonly x: number; readonly y: number }> {
  return evaluate(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing interactive element: ${selector}'); node.scrollIntoView({ block: 'center', inline: 'center' }); const rect = node.getBoundingClientRect(); if (rect.width <= 0 || rect.height <= 0) throw new Error('Interactive element has no box: ${selector}'); const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; if (point.x < 0 || point.y < 0 || point.x > innerWidth || point.y > innerHeight) throw new Error('Interactive element is outside the viewport: ${selector}'); return point; })()`,
  );
}

async function pressKey(
  connection: Connection,
  key: string,
  code: string,
  modifiers = 0,
): Promise<void> {
  const virtualKeyCode = virtualKeyCodeFor(code);
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
}

function virtualKeyCodeFor(code: string): number {
  const codePoint = {
    ArrowDown: 40,
    Enter: 13,
    Home: 36,
    KeyA: 65,
    Tab: 9,
  }[code];
  if (codePoint === undefined)
    throw new Error(`Missing virtual key code for ${code}`);
  return codePoint;
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(
    path.join(reviewRoot, name),
    Buffer.from(response.data, "base64"),
  );
}

function routeUrl(current: string, search: string): string {
  const url = new URL(current);
  url.search = search;
  return url.href;
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
    {
      readonly method: string;
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
    }
  >();
  const listeners = new Set<(method: string, params: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id !== undefined) {
      const request = pending.get(message.id);
      if (request === undefined) return;
      pending.delete(message.id);
      if (message.error !== undefined)
        request.reject(
          new Error(
            `${request.method}: ${message.error.message ?? "CDP command failed"}`,
          ),
        );
      else request.resolve(message.result);
      return;
    }
    if (message.method !== undefined)
      for (const listener of listeners)
        listener(message.method, message.params);
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
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => socket.close(),
  };
}

function eventErrorDetail(method: string, params: unknown): string | null {
  if (method === "Runtime.exceptionThrown") return JSON.stringify(params);
  if (method === "Runtime.consoleAPICalled") {
    const value = asRecord(params);
    const type = typeof value?.type === "string" ? value.type : "";
    if (type === "error" || type === "assert") return JSON.stringify(params);
  }
  if (method === "Log.entryAdded") {
    const value = asRecord(asRecord(params)?.entry);
    if (value?.level === "error" && value.source !== "network")
      return JSON.stringify(params);
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
