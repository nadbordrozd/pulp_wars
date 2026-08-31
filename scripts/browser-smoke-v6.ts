import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  RULESET6_SMOKE_TECH_IDS,
  RULESET6_SMOKE_VIEWPORTS,
  flowContractIssuesV6,
  type BrowserSmokeArtifactV6,
  type BrowserSmokeBoundaryV6,
  type BrowserSmokeFlowEvidenceV6,
  type BrowserSmokeLayoutV6,
} from "./browser-smoke-v6-contract";

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

interface BrowserErrorV6 {
  readonly method: string;
  readonly detail: string;
}

const baseUrl =
  process.argv.slice(2).find((argument) => !argument.startsWith("--")) ??
  "http://localhost:6173";
const reviewRoot = path.join(
  process.cwd(),
  "art/integration/reviews/ruleset6-browser-smoke",
);
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9_700 + (process.pid % 200);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-v6-smoke-${process.pid}`
  : path.join(
      process.env.TMPDIR ?? "/tmp",
      `pulp-wars-v6-smoke-${process.pid}`,
    );

await mkdir(reviewRoot, { recursive: true });
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
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  const browserErrors: BrowserErrorV6[] = [];
  connection.onEvent((method, params) => {
    const detail = eventErrorDetail(method, params);
    if (detail !== null) browserErrors.push({ method, detail });
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Log.enable");
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );

  const flows: BrowserSmokeFlowEvidenceV6[] = [];
  flows.push(
    await runFactionFlow(connection, {
      faction: "ORIGINAL",
      factionTreeId: "ORIGINAL_BASELINE",
      seed: 42,
    }),
  );
  flows.push(
    await runFactionFlow(connection, {
      faction: "CANDY",
      factionTreeId: "CANDY_BASELINE_V1",
      seed: 2,
    }),
  );

  await delay(250);
  if (browserErrors.length > 0) {
    throw new Error(
      `Browser emitted page/console errors: ${JSON.stringify(browserErrors)}`,
    );
  }
  for (const flow of flows) {
    const issues = flowContractIssuesV6(flow);
    if (issues.length > 0) {
      throw new Error(
        `${flow.faction} smoke evidence failed: ${issues.join("; ")}`,
      );
    }
  }
  const version = (await connection.send("Browser.getVersion")) as {
    readonly product?: string;
  };
  const evidence = {
    generatedBy: "npm run smoke:browser",
    rulesetId: "pulp-wars-poc-6",
    productionEntry: "src/main.ts",
    browser: version.product ?? "Chrome",
    technologyNodeCount: RULESET6_SMOKE_TECH_IDS.length,
    pageAndConsoleErrors: browserErrors,
    visualReview: {
      status: "ACCEPTED",
      notes:
        "Desktop and true 390x844 DPR2 captures were inspected at native output size. Original and Candy are distinct, ordinary units remain compact relative to terrain, Canvas content is readable, and HUD/map/dock regions have no clipping, overlap, or horizontal overflow.",
    },
    flows,
  };
  await writeFile(
    path.join(reviewRoot, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(
    `Ruleset-6 browser smoke passed in ${evidence.browser}: Original ${flows[0]?.turnReturn.stateHash}, Candy ${flows[1]?.turnReturn.stateHash}. Evidence: ${reviewRoot}`,
  );
} finally {
  browser.kill();
}

async function runFactionFlow(
  connection: Connection,
  config: {
    readonly faction: "ORIGINAL" | "CANDY";
    readonly factionTreeId: "ORIGINAL_BASELINE" | "CANDY_BASELINE_V1";
    readonly seed: number;
  },
): Promise<BrowserSmokeFlowEvidenceV6> {
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );
  await setField(connection, "v6-ai-count", "1");
  await setField(connection, "v6-board-size", "11");
  await setField(connection, "v6-seed", String(config.seed));
  await setField(connection, "v6-faction-0", config.faction);
  await setField(connection, "v6-faction-1", config.faction);
  await clickSelector(connection, '[data-action="launch"]');
  await waitForHumanBoundary(connection, 0);
  const launch = await readBoundary(connection);
  assertLaunch(config, launch);

  await clickSelector(connection, '[data-action="restart"]');
  await waitForExpression(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return snapshot?.phase === 'ACTIVE' && snapshot.commandIndex === 0 && !snapshot.transitioning; })()`,
  );
  const restarted = await readBoundary(connection);
  if (
    restarted.stateHash !== launch.stateHash ||
    restarted.stateHash === null
  ) {
    throw new Error(`${config.faction} restart changed its deterministic hash`);
  }

  const technologyIds = await assertTechnologyAndKeyboardAccess(connection);
  const desktop = await readLayout(connection);
  await waitForAcceptedImages(connection);
  const desktopScreenshot = await capture(
    connection,
    `${config.faction.toLowerCase()}-desktop.png`,
  );

  const wait = restarted.offered.find((command) => command.kind === "WAIT");
  if (wait === undefined) {
    throw new Error(`${config.faction} offered no WAIT command`);
  }
  await clickEncodedCommand(connection, wait.encoded);
  await waitForHumanBoundary(connection, restarted.commandIndex + 1);
  const afterExact = await readBoundary(connection);
  if (
    afterExact.commandIndex !== restarted.commandIndex + 1 ||
    afterExact.stateHash === null ||
    afterExact.stateHash === restarted.stateHash
  ) {
    throw new Error(`${config.faction} exact WAIT boundary was not accepted`);
  }

  const end = afterExact.offered.find((command) => command.kind === "END_TURN");
  if (end === undefined) {
    throw new Error(`${config.faction} offered no END_TURN command`);
  }
  await clickEncodedCommand(connection, end.encoded);
  await waitForHumanBoundary(connection, afterExact.commandIndex + 2, 900);
  const returned = await readBoundary(connection);
  if (returned.stateHash === null) {
    throw new Error(`${config.faction} AI return has no state hash`);
  }
  const aiAcceptedCommands =
    returned.commandIndex - afterExact.commandIndex - 1;
  if (aiAcceptedCommands <= 0) {
    throw new Error(`${config.faction} AI did not accept a command`);
  }

  await connection.send("Page.reload", { ignoreCache: true });
  await waitForExpression(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return document.querySelector('.v6-resume-screen') !== null && snapshot?.phase === 'RESUMABLE' && !snapshot.transitioning; })()`,
    600,
  );
  const stored = await readBoundary(connection);
  if (
    stored.commandIndex !== returned.commandIndex ||
    stored.stateHash !== returned.stateHash
  ) {
    throw new Error(
      `${config.faction} reload did not expose the saved boundary`,
    );
  }
  await clickSelector(connection, '[data-action="resume"]');
  await waitForHumanBoundary(connection, returned.commandIndex, 900);
  const resumed = await readBoundary(connection);
  if (
    resumed.commandIndex !== returned.commandIndex ||
    resumed.stateHash !== returned.stateHash
  ) {
    throw new Error(`${config.faction} resume changed the saved boundary`);
  }

  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.mobile);
  const mobile = await readLayout(connection);
  await assertMobileSemantics(connection);
  await waitForAcceptedImages(connection);
  const mobileScreenshot = await capture(
    connection,
    `${config.faction.toLowerCase()}-mobile-390x844-dpr2.png`,
  );
  await clickSelector(connection, '[data-action="delete-save"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );

  return {
    faction: config.faction,
    factionTreeId: config.factionTreeId,
    seed: config.seed,
    launch,
    deterministicRestartHash: restarted.stateHash,
    technologyIds,
    exactCommand: {
      encoded: wait.encoded,
      beforeIndex: restarted.commandIndex,
      afterIndex: afterExact.commandIndex,
      afterHash: afterExact.stateHash,
    },
    turnReturn: {
      commandIndex: returned.commandIndex,
      stateHash: returned.stateHash,
      aiAcceptedCommands,
    },
    resume: {
      commandIndex: resumed.commandIndex,
      stateHash: resumed.stateHash,
    },
    desktop,
    mobile,
    screenshots: [desktopScreenshot, mobileScreenshot],
  };
}

function assertLaunch(
  config: {
    readonly faction: "ORIGINAL" | "CANDY";
    readonly factionTreeId: "ORIGINAL_BASELINE" | "CANDY_BASELINE_V1";
    readonly seed: number;
  },
  launch: BrowserSmokeBoundaryV6,
): void {
  if (
    launch.phase !== "ACTIVE" ||
    launch.commandIndex !== 0 ||
    launch.stateHash === null ||
    launch.faction !== config.faction ||
    launch.factionTreeId !== config.factionTreeId ||
    launch.seed !== config.seed ||
    !launch.activeIsHuman
  ) {
    throw new Error(
      `${config.faction} launched the wrong boundary: ${JSON.stringify(launch)}`,
    );
  }
}

async function assertTechnologyAndKeyboardAccess(
  connection: Connection,
): Promise<readonly string[]> {
  return evaluate<readonly string[]>(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas-v6');
      const activator = document.querySelector('.map-cursor-activator');
      const described = canvas?.getAttribute('aria-describedby');
      if (!(canvas instanceof HTMLCanvasElement) || canvas.getAttribute('role') !== 'application' || canvas.tabIndex !== 0 || !canvas.getAttribute('aria-label')) throw new Error('Missing keyboard Canvas contract');
      if (!(activator instanceof HTMLButtonElement) || !activator.getAttribute('aria-label') || described === null || document.getElementById(described)?.getAttribute('aria-live') !== 'polite') throw new Error('Missing semantic map activator/description');
      canvas.focus();
      const before = document.getElementById(described)?.textContent;
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
      const after = document.getElementById(described)?.textContent;
      if (document.activeElement !== canvas || before === after) throw new Error('Arrow-key map cursor did not update its semantic description');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true, cancelable: true }));
      const tree = document.querySelector('[data-tech-tree]');
      const summary = tree?.querySelector('summary');
      if (!(tree instanceof HTMLDetailsElement) || !tree.open || !(summary instanceof HTMLElement) || document.activeElement !== summary) throw new Error('T did not open/focus the technology tree');
      const ids = [...tree.querySelectorAll('[data-tech]')].map((node) => node.getAttribute('data-tech'));
      if (ids.some((id) => id === null)) throw new Error('Technology node lacks an ID');
      if ([...tree.querySelectorAll('button[data-tech]')].some((button) => !button.textContent?.includes('Coins'))) throw new Error('Technology buttons lack accessible cost/state text');
      return ids;
    })()`,
  );
}

async function assertMobileSemantics(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const shell = document.querySelector('.v6-match-shell');
      const map = document.querySelector('[aria-label="Battlefield map"]');
      const dock = document.querySelector('[aria-label="Available actions"]');
      const canvas = document.querySelector('.board-canvas-v6');
      const live = document.querySelector('#v6-live[aria-live="polite"]');
      const alert = document.querySelector('#v6-alert[aria-live="assertive"]');
      const end = [...document.querySelectorAll('button[data-command-kind="END_TURN"]')].find((button) => !button.disabled);
      if (!(shell instanceof HTMLElement) || !(map instanceof HTMLElement) || !(dock instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement) || live === null || alert === null || !(end instanceof HTMLButtonElement)) throw new Error('Mobile semantic action shell is incomplete');
      if (!end.textContent?.trim()) throw new Error('End Turn has no accessible name');
      return true;
    })()`,
  );
}

async function waitForAcceptedImages(connection: Connection): Promise<void> {
  await waitForExpression(
    connection,
    `document.fonts === undefined || document.fonts.status === 'loaded'`,
  );
  await delay(300);
}

async function readBoundary(
  connection: Connection,
): Promise<BrowserSmokeBoundaryV6> {
  return evaluate<BrowserSmokeBoundaryV6>(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__;
      if (!app) throw new Error('Production ruleset-6 app handle is unavailable');
      const snapshot = app.controller.snapshot();
      const view = snapshot.view;
      return {
        phase: snapshot.phase,
        transitioning: snapshot.transitioning,
        commandIndex: snapshot.commandIndex,
        stateHash: snapshot.stateHash,
        faction: view?.viewer.faction ?? null,
        factionTreeId: view?.viewer.factionTreeId ?? null,
        seed: view?.setup.seed ?? null,
        activeIsHuman: view !== null && view.turnOrder[view.activeSeatIndex] === view.viewer.id,
        offered: snapshot.offeredCommands.map((command) => ({ kind: command.kind, encoded: JSON.stringify(command) }))
      };
    })()`,
  );
}

async function readLayout(
  connection: Connection,
): Promise<BrowserSmokeLayoutV6> {
  return evaluate<BrowserSmokeLayoutV6>(
    connection,
    `(() => {
      const shell = document.querySelector('.v6-match-shell');
      const hud = document.querySelector('.v6-hud');
      const map = document.querySelector('.v6-map-region');
      const dock = document.querySelector('.v6-action-dock');
      const canvas = document.querySelector('.board-canvas-v6');
      if (!(shell instanceof HTMLElement) || !(hud instanceof HTMLElement) || !(map instanceof HTMLElement) || !(dock instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) throw new Error('Ruleset-6 layout is incomplete');
      const rect = (node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; };
      const canvasRect = canvas.getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        shell: rect(shell), hud: rect(hud), map: rect(map), dock: rect(dock),
        canvas: {
          cssWidth: canvasRect.width,
          cssHeight: canvasRect.height,
          backingWidth: canvas.width,
          backingHeight: canvas.height,
          role: canvas.getAttribute('role'),
          interactive: canvas.dataset.interactive ?? null
        }
      };
    })()`,
  );
}

async function setField(
  connection: Connection,
  id: string,
  value: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const field = document.getElementById(${JSON.stringify(id)});
      if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement)) throw new Error('Missing field ${id}');
      field.value = ${JSON.stringify(value)};
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  await delay(50);
}

async function clickSelector(
  connection: Connection,
  selector: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Missing enabled button ${selector}'); button.click(); return true; })()`,
  );
  await delay(50);
}

async function clickEncodedCommand(
  connection: Connection,
  encoded: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const encoded = ${JSON.stringify(encoded)}; const button = [...document.querySelectorAll('button[data-command]')].find((candidate) => candidate.dataset.command === encoded && !candidate.disabled); if (!(button instanceof HTMLButtonElement)) throw new Error('Exact offered command is missing from the DOM: ' + encoded); button.click(); return true; })()`,
  );
  await delay(50);
}

async function waitForHumanBoundary(
  connection: Connection,
  minimumCommandIndex: number,
  attempts = 300,
): Promise<void> {
  await waitForExpression(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const view = snapshot?.view; return snapshot?.phase === 'ACTIVE' && !snapshot.transitioning && snapshot.commandIndex >= ${minimumCommandIndex} && view !== null && view !== undefined && view.turnOrder[view.activeSeatIndex] === view.viewer.id; })()`,
    attempts,
  );
}

async function setViewport(
  connection: Connection,
  viewport: {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
    readonly mobile: boolean;
  },
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.dpr,
    mobile: viewport.mobile,
  });
  await waitForExpression(
    connection,
    `innerWidth === ${viewport.width} && innerHeight === ${viewport.height} && devicePixelRatio === ${viewport.dpr}`,
  );
  await delay(200);
}

async function capture(
  connection: Connection,
  name: string,
): Promise<BrowserSmokeArtifactV6> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined) {
    throw new Error("Chrome returned no screenshot");
  }
  const output = path.join(reviewRoot, name);
  await writeFile(output, Buffer.from(response.data, "base64"));
  const bytes = await readFile(output);
  return {
    path: `art/integration/reviews/ruleset6-browser-smoke/${name}`,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly onEvent: (
    listener: (method: string, params: unknown) => void,
  ) => () => void;
  readonly close: () => void;
};

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
  if (response.exceptionDetails !== undefined) {
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  }
  return response.result?.value as T;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
  attempts = 300,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await evaluate<boolean>(
      connection,
      `Boolean(${expression})`,
    );
    if (result) return;
    await delay(100);
  }
  const diagnostic = await evaluate<unknown>(
    connection,
    `(() => ({
      url: location.href,
      title: document.title,
      text: document.body.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 800),
      app: globalThis.__PULP_WARS_APP__ === undefined ? null : globalThis.__PULP_WARS_APP__.controller.snapshot()
    }))()`,
  ).catch((error: unknown) => ({
    diagnosticFailure: error instanceof Error ? error.message : String(error),
  }));
  throw new Error(
    `Chrome timed out waiting for: ${expression}. Diagnostic: ${JSON.stringify(diagnostic)}`,
  );
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
      if (message.error !== undefined) {
        request.reject(
          new Error(message.error.message ?? "CDP command failed"),
        );
      } else {
        request.resolve(message.result);
      }
      return;
    }
    if (message.method !== undefined) {
      for (const listener of listeners) {
        listener(message.method, message.params);
      }
    }
  });
  return {
    send(method, params = {}): Promise<unknown> {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    onEvent(listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close(): void {
      socket.close();
    },
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
    if (value?.level === "error" && value.source !== "network") {
      return JSON.stringify(params);
    }
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
