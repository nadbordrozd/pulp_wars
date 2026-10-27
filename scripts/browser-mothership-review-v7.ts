import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import {
  MARTIAN_MASS_BEAM_PICK_V7,
  MARTIAN_MASS_BEAM_V7,
} from "../tests/fixtures/v7-martian-ui";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  martianFixtureMountExpressionV7,
  type MartianUiFixtureNameV7,
} from "./browser-martian-fixture-v7";

/**
 * The Mothership redesign's review (bead pulp_wars-ewpj): on the
 * `martianMassBeamFixtureV7` scene, at desktop and phone widths in the
 * CHIBI art set, the Mothership's dock with its Mass Beam Down button, the
 * aiming (the tiles in reach, the pick-up range, the "Beam" badges), the
 * chosen tile's landing preview, the beam-down columns of light mid-cue,
 * the strike force after landing, and a beamed Grunt's attack on arrival.
 * It needs the Vite dev server (the fixture is imported from
 * `tests/fixtures`). Built on the Martian UI review below.
 *
 * Usage: tsx scripts/browser-mothership-review-v7.ts http://localhost:6173/
 *   --output-dir=<new-dir> [--only=beam,passengers]
 *
 * `passengers` (bead pulp_wars-8vmy): the passengers picked on the board.
 *
 * Martian UI visual review (bead pulp_wars-t6s.4). It captures the
 * default-route setup with a Martian seat; real Showcase launches (the
 * Martians against Humans, and the Martians beside
 * every other faction) at zoom steps 1 and 0.75; and, on the Martian UI
 * fixtures, the board markers (Shield bars, Cooling, the control halo and
 * brain chip, flyers over land and water, machines afloat), the attack
 * previews (Shield, ray power, Pierce, friendly fire, the Disintegrator),
 * Beam Down targeting, Mind Control and the unit it takes, the Tractor Beam
 * preview, the Force Field, the cues pinned mid-animation, Help and the
 * technology tree, in the CHIBI (default look) and LEGACY art sets at
 * desktop and phone widths. The `control` part (the Mind Control revision,
 * bead pulp_wars-b5f.3) captures a controlled Goblin, Knight, Yeti and
 * Hammerer at zoom 1 and 0.75 (with enlarged crops), the control link from
 * the unit and from its Brain, their docks, the release cue at three
 * moments, and the halo in high contrast. It needs the Vite dev server,
 * because the fixtures are imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-martian-review-v7.ts http://localhost:6173/
 *   [--output-dir=<new-dir>] [--only=setup,showcase,fixtures,control]
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
type ScreenSize = "desktop" | "phone";
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
  name: "mothership-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-mothership-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_680 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-martian-ui-"));
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
const REVIEW = "globalThis.__MARTIAN_REVIEW__";
const parts = (
  process.argv
    .slice(2)
    .find((argument) => argument.startsWith("--only="))
    ?.slice("--only=".length) ?? "beam,passengers"
).split(",");

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
    if (parts.includes("beam")) await massBeamTour(connection, size);
    if (parts.includes("passengers")) await passengerTour(connection, size);
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Mothership review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** The Mass Beam Down, from the dock to the shot on arrival. */
async function massBeamTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  const at = MARTIAN_MASS_BEAM_V7;
  await viewport(connection, size);
  await mount(connection, "chibi", "martianMassBeamFixtureV7");
  await activate(connection, at.mothership);
  evidence[`${size}Dock`] = await dockText(connection);
  await capture(connection, `mass-beam-dock-${size}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-action="martian-mass-beam-down"]')?.click()`,
  );
  await delay(700);
  await capture(connection, `mass-beam-aim-${size}.png`);
  // Bead pulp_wars-9im: every tile is a board target; the dock lists none.
  evidence[`${size}Targets`] = await boardTargets(connection);
  evidence[`${size}Panel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-martian-pick]')?.textContent ?? null`,
  );
  // The first choice of the tile previews the landings.
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.target)})`,
  );
  await delay(700);
  await capture(connection, `mass-beam-preview-${size}.png`);
  evidence[`${size}Notice`] = await evaluate(
    connection,
    `document.querySelector('#v7-live')?.textContent ?? null`,
  );
  // Choosing it again beams (on the phone, the panel's confirm); the
  // columns of light are caught mid-cue.
  await evaluate(
    connection,
    size === "phone"
      ? `document.querySelector('[data-action="martian-mass-beam-confirm"]')?.click()`
      : `${REVIEW}.boardHost.activate(${JSON.stringify(at.target)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'MASS_BEAM_DOWN')`,
  );
  for (const frame of [0, 1, 2, 3]) {
    await capture(connection, `mass-beam-landing-${size}-${frame}.png`);
    await delay(110);
  }
  await delay(1_500);
  evidence[`${size}After`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `mass-beam-after-${size}.png`);
  // A beamed Grunt on the target tile shoots on arrival.
  await deselect(connection);
  await activate(connection, at.target);
  await capture(connection, `mass-beam-shot-${size}.png`);
}

/**
 * `pulp_wars-8vmy`: the passengers picked on the board, on the
 * `martianMassBeamPickFixtureV7` scene (four units under the Mothership):
 * the nearest three chosen, a fourth refused ("Up to 3"), one left behind
 * and the far Grunt taken, and the chosen tile's landing preview.
 */
async function passengerTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  const at = MARTIAN_MASS_BEAM_PICK_V7;
  await viewport(connection, size);
  await mount(connection, "chibi", "martianMassBeamPickFixtureV7");
  await activate(connection, at.mothership);
  await evaluate(
    connection,
    `document.querySelector('[data-action="martian-mass-beam-down"]')?.click()`,
  );
  await delay(700);
  const line = async (): Promise<unknown> =>
    evaluate(
      connection,
      `({ line: document.querySelector('.v7-mass-beam-count')?.textContent ?? null, notice: document.querySelector('#v7-live')?.textContent ?? null })`,
    );
  await capture(connection, `passengers-default-${size}.png`);
  evidence[`${size}PassengersDefault`] = await line();
  const tap = async (where: Coord, name: string): Promise<void> => {
    await evaluate(
      connection,
      `${REVIEW}.boardHost.activate(${JSON.stringify(where)})`,
    );
    await delay(600);
    await capture(connection, `passengers-${name}-${size}.png`);
    evidence[`${size}Passengers-${name}`] = await line();
  };
  // The far Grunt: refused while three are chosen.
  await tap(at.passengers[1], "full");
  // Leave the Grunt at (1, 4) behind, then take the far one.
  await tap(at.fourth, "left-behind");
  await tap(at.passengers[1], "taken");
  // The chosen tile previews the landing of the picked three.
  await tap(at.target, "preview");
  evidence[`${size}PassengersTargets`] = await boardTargets(connection);
  // Bead pulp_wars-2yc.109: the beamed unit's turn chip says it can still
  // attack.
  await evaluate(
    connection,
    `document.querySelector('[data-action="martian-mass-beam-confirm"]')?.click()`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'MASS_BEAM_DOWN')`,
  );
  await delay(2_000);
  await deselect(connection);
  await activate(connection, at.target);
  evidence[`${size}BeamedChip`] = await dockText(connection);
  await capture(connection, `beamed-chip-${size}.png`);
  await deselect(connection);
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  // Developer mode (pulp_wars-5xki): the Gallery and every faction.
  next.searchParams.set("dev", "1");
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function mount(
  connection: Connection,
  art: ArtSet,
  fixture: MartianUiFixtureNameV7,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  // The game's sound and music stay off in review runs (Chrome is muted
  // too).
  await evaluate(
    connection,
    `localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 })); localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 }))`,
  );
  await evaluate(
    connection,
    martianFixtureMountExpressionV7(
      fixture,
      art === "chibi" ? "CHIBI" : "LEGACY",
    ),
    true,
  );
  await delay(1_200);
}

/** Clears the selection (and any picking or armed state) with Escape. */
async function deselect(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { for (let index = 0; index < 3; index += 1) document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); })()`,
  );
  await delay(200);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  // A keyboard round trip keeps the selected cell and its neighbours
  // on screen below the HUD without changing the selection.
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(600);
}

/**
 * Bead pulp_wars-9im (docs/ui/BOARD_TARGETING.md): the aimed ability's
 * targets as the player meets them. The dock lists none, so they are read
 * from the board: the aiming panel's count, then each target's cursor
 * description, stepped with Tab in reading order. `listed` names any dock
 * button that is still one target's own (there must be none). It moves the
 * board cursor, so it is called after the stage's capture.
 */
async function boardTargets(connection: Connection): Promise<unknown> {
  const panel = (await evaluate(
    connection,
    `(() => { const panel = document.querySelector('.v7-selection-dock .v7-board-pick'); const dock = document.querySelector('.v7-selection-dock'); return { count: panel === null ? null : Number(panel.dataset.boardTargets ?? '0'), buttons: panel === null ? [] : Array.from(panel.querySelectorAll('button')).map((node) => node.dataset.action ?? ''), listed: dock === null ? [] : Array.from(dock.querySelectorAll('button')).map((node) => node.dataset.action ?? '').filter((action) => /^(mind-control|tractor-beam|bolas|bomb-target|beam-passenger|beam-tile|sugar-toss|rebake|command-hatch|tunnel-passenger|tunnel-to)-\\d+/.test(action)) }; })()`,
  )) as {
    readonly count: number | null;
    readonly buttons: readonly string[];
    readonly listed: readonly string[];
  };
  const onBoard = `document.activeElement === document.querySelector('canvas.board-canvas-v7')`;
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  const targets: unknown[] = [];
  for (let step = 0; step < (panel.count ?? 0); step += 1) {
    await keys(connection, ["Tab"]);
    // Past the last target Tab leaves the board for the dock.
    if ((await evaluate(connection, onBoard)) !== true) break;
    const text = await cursorText(connection);
    targets.push(text);
  }
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  if (panel.listed.length > 0)
    errors.push(`The dock lists targets: ${panel.listed.join(", ")}`);
  return { ...panel, targets };
}

async function cursorText(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? null`,
  );
}

async function dockText(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent), abilities: Array.from(dock.querySelectorAll('[data-martian-info]')).map((node) => node.textContent), actions: Array.from(dock.querySelectorAll('.v7-action-label')).map((node) => node.textContent) }; })()`,
  );
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    Tab: 9,
    Enter: 13,
    Escape: 27,
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
  size: ScreenSize,
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
  await evaluate(connection, `globalThis.__MARTIAN_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__MARTIAN_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
