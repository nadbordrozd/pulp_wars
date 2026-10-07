import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  AFFLICTION_HUMAN_MARKERS_V7,
  afflictionEvidenceExpressionV7,
  undeadFixtureMountExpressionV7,
  type UndeadUiFixtureNameV7,
} from "./browser-undead-fixture-v7";

/**
 * Revision 13 Undead UI visual review (pulp_wars-vkq.8). It captures the
 * default-route per-seat faction setup and the Undead showcase fixture (Wail, Raise Dead,
 * Devour, Lich splash, Lifesteal, Infect, Restless, Graves) in the LEGACY and
 * CHIBI art sets at desktop and phone widths. It needs the Vite dev server,
 * because the showcase fixture is imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-undead-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>]
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
  name: "undead-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-undead-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_400 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-undead-ui-"));
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

  // Default-route setup with per-seat faction choice (pulp_wars-vkq.16).
  await viewport(connection, "desktop");
  await navigate(connection, url({ art: "legacy" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null`,
  );
  evidence.defaultSetupHasFactions = await evaluate(
    connection,
    `document.querySelector('[data-v7-factions]') !== null`,
  );
  if (evidence.defaultSetupHasFactions !== true)
    throw new Error("Default setup does not offer faction choice");
  evidence.factionSetup = await evaluate(
    connection,
    `(() => {
      const count = document.querySelector('#v7-ai-count');
      count.value = '2';
      count.dispatchEvent(new Event('change', { bubbles: true }));
      const second = document.querySelector('#v7-faction-0');
      second.value = 'UNDEAD';
      second.dispatchEvent(new Event('change', { bubbles: true }));
      return Array.from(document.querySelectorAll('[data-v7-factions] label')).map((label) => label.textContent);
    })()`,
  );
  await capture(connection, "setup-undead-desktop.png");
  await viewport(connection, "phone");
  await capture(connection, "setup-undead-phone.png");

  for (const art of ["legacy", "chibi"] as const) {
    await viewport(connection, "desktop");
    await mountShowcase(connection, art);
    const at = (await evaluate(
      connection,
      `globalThis.__UNDEAD_REVIEW__.at`,
    )) as Record<string, Coord>;
    await activate(connection, at.banshee as Coord);
    evidence[`${art}WailButton`] = await evaluate(
      connection,
      `document.querySelector('[data-action="command-wail"]')?.getAttribute('aria-label') ?? null`,
    );
    await capture(connection, `showcase-${art}-wail-desktop.png`);
    await activate(connection, at.necromancer as Coord);
    evidence[`${art}NecromancerActions`] = await evaluate(
      connection,
      `Array.from(document.querySelectorAll('.v7-selection-dock .v7-action-label')).map((node) => node.textContent)`,
    );
    await capture(connection, `showcase-${art}-raise-dead-desktop.png`);
    await activate(connection, at.ghoul as Coord);
    await capture(connection, `showcase-${art}-devour-desktop.png`);
    await activate(connection, at.restlessSkeleton as Coord);
    await capture(connection, `showcase-${art}-restless-desktop.png`);
    await activate(connection, at.lich as Coord);
    await keys(connection, ["ArrowLeft", "ArrowLeft"]);
    await capture(connection, `showcase-${art}-lich-splash-desktop.png`);
    await activate(connection, at.vampire as Coord);
    await capture(connection, `showcase-${art}-lifesteal-desktop.png`);
    await activate(connection, at.zombie as Coord);
    await capture(connection, `showcase-${art}-infect-desktop.png`);
    await viewport(connection, "phone");
    await mountShowcase(connection, art);
    await activate(connection, at.banshee as Coord);
    await capture(connection, `showcase-${art}-wail-phone.png`);
    await viewport(connection, "desktop");
    await mountShowcase(connection, art);
    await activate(connection, at.banshee as Coord);
    await evaluate(
      connection,
      `document.querySelector('[data-action="command-wail"]').click()`,
    );
    await waitFor(
      connection,
      `globalThis.__UNDEAD_REVIEW__.traces.some((trace) => trace.eventKinds.includes('WAIL_RESOLVED')) && document.querySelector('.v7-toast')?.textContent?.includes('wailed') === true`,
    );
    await delay(900);
    evidence[`${art}AfterWail`] = await evaluate(
      connection,
      `({ notice: document.querySelector('#v7-live')?.textContent, events: globalThis.__UNDEAD_REVIEW__.traces.at(-1).eventKinds })`,
    );
    await capture(connection, `showcase-${art}-after-wail-desktop.png`);
  }
  // Revision 14 (pulp_wars-vkq.19): Plague and Bitten markers, chips,
  // Disband explanation, Tend cures, and the revision-14 attack previews.
  for (const art of ["legacy", "chibi"] as const) {
    await viewport(connection, "desktop");
    await mountShowcase(connection, art, "afflictionHumanFixtureV7");
    const human = (await evaluate(
      connection,
      `globalThis.__UNDEAD_REVIEW__.afflictions.human`,
    )) as Record<string, Coord>;
    await activate(connection, human.plaguedWarrior as Coord);
    const warrior = (await evaluate(
      connection,
      afflictionEvidenceExpressionV7(),
      true,
    )) as {
      readonly markers: readonly string[];
      readonly chips: readonly string[];
      readonly disband: string | null;
      readonly disbandDisabled: string | null;
    };
    evidence[`${art}PlaguedWarrior`] = warrior;
    if (
      JSON.stringify(warrior.markers) !==
        JSON.stringify(AFFLICTION_HUMAN_MARKERS_V7) ||
      warrior.chips.length !== 1 ||
      !warrior.chips[0]?.startsWith(
        "Plague · 3 turns. Plague from Player 2's Lich",
      ) ||
      warrior.disband !== "Disband unavailable. Plagued units can't Disband." ||
      warrior.disbandDisabled !== "true"
    )
      throw new Error(`Plague dock missing: ${JSON.stringify(warrior)}`);
    await capture(connection, `affliction-${art}-plagued-desktop.png`);
    await activate(connection, human.doublyAfflicted as Coord);
    await capture(connection, `affliction-${art}-doubly-desktop.png`);
    await evaluate(
      connection,
      `document.querySelector('[data-action="unit-help"]')?.click()`,
    );
    await delay(300);
    evidence[`${art}DoublyHelp`] = await evaluate(
      connection,
      `Array.from(document.querySelectorAll('.v7-unit-help-dialog .v7-tactical-state')).map((node) => node.textContent)`,
    );
    await capture(connection, `affliction-${art}-doubly-help-desktop.png`);
    await evaluate(
      connection,
      `document.querySelector('[data-action="close-unit-help"]')?.click()`,
    );
    await delay(300);
    // The smallest zoom (CHIBI step 0.75) is where the markers must still read.
    for (let step = 0; step < 4; step += 1)
      await evaluate(
        connection,
        `document.querySelector('[data-action="zoom-out"]')?.click()`,
      );
    await delay(500);
    evidence[`${art}MinimumZoom`] = await evaluate(
      connection,
      `({ tile: document.querySelector('canvas.board-canvas-v7')?.dataset.tileCssPx ?? null, step: document.querySelector('canvas.board-canvas-v7')?.dataset.zoomStep ?? null })`,
    );
    await capture(connection, `affliction-${art}-minimum-zoom-desktop.png`);
    await activate(connection, human.captain as Coord);
    const tend = await evaluate(
      connection,
      `document.querySelector('[data-action="command-tend_wounded"]')?.getAttribute('aria-label') ?? null`,
    );
    evidence[`${art}TendButton`] = tend;
    if (typeof tend !== "string" || !tend.includes("cures Plague"))
      throw new Error(`Tend cure preview missing: ${String(tend)}`);
    await capture(connection, `affliction-${art}-tend-desktop.png`);
    await activate(connection, human.knight as Coord);
    await capture(connection, `affliction-${art}-bitten-attack-desktop.png`);
    await viewport(connection, "phone");
    await mountShowcase(connection, art, "afflictionHumanFixtureV7");
    await activate(connection, human.doublyAfflicted as Coord);
    await capture(connection, `affliction-${art}-doubly-phone.png`);
    await viewport(connection, "desktop");
    await mountShowcase(connection, art, "afflictionUndeadFixtureV7");
    const undead = (await evaluate(
      connection,
      `globalThis.__UNDEAD_REVIEW__.afflictions.undead`,
    )) as Record<string, Coord>;
    await activate(connection, undead.lich as Coord);
    await keys(connection, ["ArrowLeft", "ArrowLeft"]);
    evidence[`${art}LichCursor`] = await evaluate(
      connection,
      `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null`,
    );
    await capture(connection, `affliction-${art}-lich-plague-desktop.png`);
    await activate(connection, undead.zombie as Coord);
    await capture(connection, `affliction-${art}-zombie-bite-desktop.png`);
    await activate(connection, undead.vampire as Coord);
    await capture(connection, `affliction-${art}-vampire-desktop.png`);
    await activate(connection, undead.banshee as Coord);
    evidence[`${art}BittenWail`] = await evaluate(
      connection,
      `document.querySelector('[data-action="command-wail"]')?.getAttribute('aria-label') ?? null`,
    );
    await capture(connection, `affliction-${art}-wail-bitten-desktop.png`);
    await activate(connection, undead.skeleton as Coord);
    await capture(connection, `affliction-${art}-skeleton-bitten-desktop.png`);
    await viewport(connection, "phone");
    await mountShowcase(connection, art, "afflictionUndeadFixtureV7");
    await activate(connection, undead.lich as Coord);
    await capture(connection, `affliction-${art}-lich-phone.png`);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Undead UI review captured in ${output.directory}`);
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

async function mountShowcase(
  connection: Connection,
  art: ArtSet,
  fixture: UndeadUiFixtureNameV7 = "undeadShowcaseFixtureV7",
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    undeadFixtureMountExpressionV7(
      fixture,
      art === "chibi" ? "CHIBI" : "LEGACY",
    ),
    true,
  );
  await delay(1_200);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { globalThis.__UNDEAD_REVIEW__.boardHost.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
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
  await evaluate(connection, `globalThis.__UNDEAD_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__UNDEAD_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
