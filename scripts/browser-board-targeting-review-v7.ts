import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import { ruleset7FixtureMountExpressionV7 } from "./browser-undead-fixture-v7";

/**
 * Board targeting visual review (bead pulp_wars-9im,
 * docs/ui/BOARD_TARGETING.md). On the faction UI fixtures, in the default
 * CHIBI look at desktop and phone widths, it captures the four target
 * highlight styles where they are used: a healer with Move, Attack and Help
 * marks together (nothing armed), an aimed Re-bake (Place), Mind Control
 * and Tractor Beam (Attack), Beam Down passengers (Help) and tiles (Place),
 * a Bolas on Snow (Attack), a Tunnel pick with its Hammerer (Move and
 * Help), a Bomb Run (Attack), an Assemble (Place), a Shaman's Egg (Help)
 * and the Help legend. For every aimed ability it records the aiming
 * panel's buttons and fails when the dock lists a target. It needs the Vite
 * dev server, because the fixtures are imported from `tests/fixtures`.
 *
 * Bead pulp_wars-621 adds the recipients of an area support (section 2.1):
 * a Captain's Tend Wounded at rest and with its button focused, a Rally
 * with its button focused, an Engineer's Repair, a Confectioner's Frosting
 * and a Shaman whose Egg is a target while its wounded Caveman is a mark.
 *
 * Usage: tsx scripts/browser-board-targeting-review-v7.ts
 *   http://localhost:6173/ [--output-dir=<new-dir>] [--only=<name-prefix>]
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
type ScreenSize = "desktop" | "phone";
interface Coord {
  readonly x: number;
  readonly y: number;
}
interface Shot {
  /** The capture's name (without the size and extension). */
  readonly name: string;
  readonly module: string;
  readonly fixture: string;
  /** The exported map of the fixture's coordinates. */
  readonly coords: string;
  /** The key of the unit to select. */
  readonly unit: string;
  /** The dock button that arms the ability; none shows the unarmed targets. */
  readonly action?: string;
  /** A board target to choose after arming (the next stage). */
  readonly then?: string;
  /**
   * A dock button to focus without pressing it (bead pulp_wars-621): an
   * area support's button, whose focus makes its recipients prominent.
   */
  readonly focus?: string;
  /** The highlight styles the capture is expected to show (for the reader). */
  readonly marks: readonly string[];
}

const SHOTS: readonly Shot[] = [
  {
    name: "healer-move-attack-heal",
    module: "/tests/fixtures/v7-candy-ui.ts",
    fixture: "candyHealerFixtureV7",
    coords: "CANDY_HEALER_V7",
    unit: "gunner",
    marks: ["ATTACK", "MOVE", "SUPPORT"],
  },
  {
    name: "rebake",
    module: "/tests/fixtures/v7-candy-ui.ts",
    fixture: "candyUiFixtureV7",
    coords: "CANDY_UI_V7",
    unit: "confectioner",
    action: "candy-rebake",
    marks: ["PLACE"],
  },
  {
    name: "mind-control",
    module: "/tests/fixtures/v7-martian-ui.ts",
    fixture: "martianUiFixtureV7",
    coords: "MARTIAN_UI_V7",
    unit: "brain",
    action: "martian-mind-control",
    marks: ["ATTACK"],
  },
  {
    name: "tractor-beam",
    module: "/tests/fixtures/v7-martian-ui.ts",
    fixture: "martianMobilityFixtureV7",
    coords: "MARTIAN_MOBILITY_V7",
    unit: "carrier",
    action: "martian-tractor-beam",
    marks: ["ATTACK", "SUPPORT"],
  },
  {
    name: "beam-down-passengers",
    module: "/tests/fixtures/v7-martian-ui.ts",
    fixture: "martianMobilityFixtureV7",
    coords: "MARTIAN_MOBILITY_V7",
    unit: "carrier",
    action: "martian-beam-down",
    marks: ["SUPPORT"],
  },
  {
    name: "beam-down-tiles",
    module: "/tests/fixtures/v7-martian-ui.ts",
    fixture: "martianMobilityFixtureV7",
    coords: "MARTIAN_MOBILITY_V7",
    unit: "carrier",
    action: "martian-beam-down",
    then: "pickUp",
    marks: ["PLACE"],
  },
  {
    name: "bolas-on-snow",
    module: "/tests/fixtures/v7-ice-folk-ui.ts",
    fixture: "iceFolkUiFixtureV7",
    coords: "ICE_FOLK_UI_V7",
    unit: "sled",
    action: "ice-folk-bolas",
    marks: ["ATTACK"],
  },
  {
    name: "tunnel-pick",
    module: "/tests/fixtures/v7-dwarf-ui.ts",
    fixture: "dwarfUiFixtureV7",
    coords: "DWARF_UI_V7",
    unit: "mole",
    action: "dwarf-tunnel",
    marks: ["MOVE", "SUPPORT"],
  },
  {
    name: "bomb-run",
    module: "/tests/fixtures/v7-dwarf-ui.ts",
    fixture: "dwarfUiFixtureV7",
    coords: "DWARF_UI_V7",
    unit: "gyrocopter",
    action: "dwarf-bomb-run",
    marks: ["ATTACK"],
  },
  {
    name: "assemble",
    module: "/tests/fixtures/v7-dwarf-ui.ts",
    fixture: "dwarfUiFixtureV7",
    coords: "DWARF_UI_V7",
    unit: "engineer",
    action: "dwarf-assemble",
    marks: ["PLACE"],
  },
  {
    name: "hatch",
    module: "/tests/fixtures/v7-dinosaur-ui.ts",
    fixture: "dinosaurShowcaseFixtureV7",
    coords: "DINOSAUR_SHOWCASE_V7",
    unit: "shaman",
    marks: ["MOVE", "SUPPORT"],
  },
  // The marks on the other grounds: Snow with a Forest and Mountains, and
  // the Undead gloam ground.
  {
    name: "ground-snow-forest-mountain",
    module: "/tests/fixtures/v7-ice-folk-ui.ts",
    fixture: "iceFolkUiFixtureV7",
    coords: "ICE_FOLK_UI_V7",
    unit: "sabretooth",
    marks: ["MOVE"],
  },
  {
    name: "ground-snow-attack",
    module: "/tests/fixtures/v7-ice-folk-ui.ts",
    fixture: "iceFolkUiFixtureV7",
    coords: "ICE_FOLK_UI_V7",
    unit: "witch",
    action: "ice-folk-cold-snap",
    marks: ["ATTACK"],
  },
  {
    name: "ground-gloam",
    module: "/tests/fixtures/v7-undead-ui.ts",
    fixture: "undeadShowcaseFixtureV7",
    coords: "UNDEAD_SHOWCASE_V7",
    unit: "zombie",
    marks: ["ATTACK", "MOVE"],
  },
  // Bead pulp_wars-621: the recipients of an area support (a broken Help
  // ring with the amount), quiet at rest and prominent with the button
  // focused. They are marks, not targets.
  {
    name: "area-heal-rest",
    module: "/tests/fixtures/v7-area-support-ui.ts",
    fixture: "humanTendFixtureV7",
    coords: "HUMAN_TEND_V7",
    unit: "captain",
    marks: ["MOVE", "AREA_SUPPORT_QUIET"],
  },
  {
    name: "area-heal-focused",
    module: "/tests/fixtures/v7-area-support-ui.ts",
    fixture: "humanTendFixtureV7",
    coords: "HUMAN_TEND_V7",
    unit: "captain",
    focus: "command-tend_wounded",
    marks: ["MOVE", "AREA_SUPPORT_PROMINENT"],
  },
  {
    name: "area-rally-focused",
    module: "/tests/fixtures/v7-area-support-ui.ts",
    fixture: "humanTendFixtureV7",
    coords: "HUMAN_TEND_V7",
    unit: "captain",
    focus: "command-rally",
    marks: ["MOVE", "AREA_SUPPORT_PROMINENT"],
  },
  {
    name: "area-repair-rest",
    module: "/tests/fixtures/v7-dwarf-ui.ts",
    fixture: "dwarfUiFixtureV7",
    coords: "DWARF_UI_V7",
    unit: "engineer",
    marks: ["MOVE", "AREA_SUPPORT_QUIET"],
  },
  {
    name: "area-frosting-focused",
    module: "/tests/fixtures/v7-candy-ui.ts",
    fixture: "candyUiFixtureV7",
    coords: "CANDY_UI_V7",
    unit: "confectioner",
    focus: "command-tend_wounded",
    marks: ["MOVE", "AREA_SUPPORT_PROMINENT"],
  },
  {
    name: "area-heal-beside-hatch",
    module: "/tests/fixtures/v7-area-support-ui.ts",
    fixture: "dinosaurTendFixtureV7",
    coords: "DINOSAUR_TEND_V7",
    unit: "shaman",
    marks: ["MOVE", "SUPPORT", "AREA_SUPPORT_QUIET"],
  },
];

/** `--only=<prefix>` keeps the captures whose name starts with it. */
const only = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length);

const baseUrl = new URL(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "board-targeting",
  archiveDirectory: "art/integration/reviews/ruleset7-board-targeting",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_960 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-targeting-"));
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
const REVIEW = "globalThis.__TARGETING_REVIEW__";

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
    await viewport(connection, size);
    for (const shot of SHOTS)
      if (only === undefined || shot.name.startsWith(only))
        await take(connection, shot, size);
    if (only === undefined) await helpLegend(connection, size);
  }
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify({ evidence, errors }, null, 2)}\n`,
  );
  if (errors.length > 0) throw new Error(errors.join("\n"));
  await output.publish();
  console.log(`Board targeting review: ${output.directory}`);
  connection.close();
} finally {
  browser.kill();
  await rm(userData, { recursive: true, force: true }).catch(() => undefined);
}

/** One capture: the unit selected, its ability armed, the marks on board. */
async function take(
  connection: Connection,
  shot: Shot,
  size: ScreenSize,
): Promise<void> {
  await mount(connection, shot);
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  const unit = at[shot.unit];
  if (unit === undefined) throw new Error(`${shot.name}: no ${shot.unit}`);
  await activate(connection, unit);
  if (shot.action !== undefined) {
    await waitFor(
      connection,
      `document.querySelector('[data-action="${shot.action}"]:not([aria-disabled="true"]):not(:disabled)') !== null`,
    );
    await evaluate(
      connection,
      `document.querySelector('[data-action="${shot.action}"]').click()`,
    );
    await waitFor(
      connection,
      `document.querySelector('.v7-selection-dock .v7-board-pick') !== null`,
    );
  }
  if (shot.then !== undefined) {
    const next = at[shot.then];
    if (next === undefined) throw new Error(`${shot.name}: no ${shot.then}`);
    await evaluate(
      connection,
      `${REVIEW}.boardHost.activate(${JSON.stringify(next)})`,
    );
  }
  if (shot.focus !== undefined) {
    await waitFor(
      connection,
      `document.querySelector('[data-action="${shot.focus}"][data-area-support="true"]') !== null`,
    );
    await evaluate(
      connection,
      `document.querySelector('[data-action="${shot.focus}"]').focus()`,
    );
  }
  await delay(900);
  const seen = (await evaluate(
    connection,
    `(() => {
      const panel = document.querySelector('.v7-selection-dock .v7-board-pick');
      const dock = document.querySelector('.v7-selection-dock');
      return {
        marks: ${JSON.stringify(shot.marks)},
        areaSupportButtons: dock === null ? [] : Array.from(dock.querySelectorAll('button[data-area-support="true"]')).map((node) => node.dataset.action ?? ''),
        focused: document.activeElement?.getAttribute('data-action') ?? null,
        panelButtons: panel === null ? null : Array.from(panel.querySelectorAll('button')).map((node) => node.dataset.action ?? ''),
        boardTargets: panel?.dataset.boardTargets ?? null,
        dockActions: dock === null ? [] : Array.from(dock.querySelectorAll('button')).map((node) => node.dataset.action ?? ''),
      };
    })()`,
  )) as {
    readonly panelButtons: readonly string[] | null;
    readonly dockActions: readonly string[];
  };
  evidence[`${shot.name}-${size}`] = seen;
  const listed = seen.dockActions.filter((action) =>
    /^(mind-control|tractor-beam|bolas|bomb-target|beam-passenger|sugar-toss|rebake|command-hatch|tunnel-passenger)-\d+$/.test(
      action,
    ),
  );
  if (listed.length > 0)
    errors.push(`${shot.name} ${size}: the dock lists ${listed.join(", ")}`);
  if (seen.panelButtons !== null && seen.panelButtons.length > 5)
    errors.push(`${shot.name} ${size}: ${seen.panelButtons.length} buttons`);
  await capture(connection, `${shot.name}-${size}.png`);
}

/** Help: the four marks with their names. */
async function helpLegend(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  const shot = SHOTS[0];
  if (shot === undefined) return;
  await mount(connection, shot);
  await evaluate(
    connection,
    `(() => { document.querySelector('[data-action="compact-menu"]')?.click(); document.querySelector('[data-action="help"]')?.click(); })()`,
  );
  await waitFor(
    connection,
    `document.querySelectorAll('.v7-target-legend-item').length === 4`,
  );
  evidence[`help-legend-${size}`] = await evaluate(
    connection,
    `Array.from(document.querySelectorAll('.v7-target-legend-item')).map((node) => node.getAttribute('aria-label'))`,
  );
  await evaluate(
    connection,
    `document.querySelector('.v7-target-legend')?.scrollIntoView({ block: 'center' })`,
  );
  await delay(300);
  await capture(connection, `help-legend-${size}.png`);
}

async function mount(connection: Connection, shot: Shot): Promise<void> {
  const next = new URL(baseUrl.href);
  next.search = "";
  next.searchParams.set("art", "chibi");
  await evaluate(connection, `globalThis.__TARGETING_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: next.href });
  await waitFor(
    connection,
    `globalThis.__TARGETING_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    ruleset7FixtureMountExpressionV7({
      module: shot.module,
      fixture: shot.fixture,
      artSet: "CHIBI",
      global: "__TARGETING_REVIEW__",
      extras: `at: fixtures.${shot.coords}`,
    }),
    true,
  );
  await delay(1_400);
}

async function activate(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  // A step of the cursor and back keeps the selected unit in view above
  // the dock (a phone starts on the capital).
  for (const key of at.y > 0
    ? ["ArrowUp", "ArrowDown"]
    : ["ArrowDown", "ArrowUp"])
    for (const type of ["rawKeyDown", "keyUp"] as const)
      await connection.send("Input.dispatchKeyEvent", {
        type,
        key,
        code: key,
        windowsVirtualKeyCode: key === "ArrowUp" ? 38 : 40,
      });
  await delay(600);
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
