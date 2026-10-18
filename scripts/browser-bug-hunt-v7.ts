/**
 * The browser bug hunt (bead pulp_wars-2yc.93): plays quick-start matches in
 * muted headless Chrome at a phone viewport with touch emulation, the
 * human seat driven through the real interface (touch taps on the board
 * and the End Turn button, the dock's own dispatch for everything else)
 * with the Normal AI's choice, or a random offered command at
 * `--random=<rate>`. After every command it asserts that the game is still
 * alive: no page error, the interface leaves its busy state, End Turn
 * advances the turn, Save & quit and Resume work when tried, one board
 * canvas with one set of pointer listeners, and a swipe pans the board by
 * the swipe's own distance. A failure dumps a screenshot, the spoiler debug
 * bundle (state and replay), the command log and the console.
 *
 * It PLAYS MATCHES: run it only when the user asks for simulations.
 *
 *   npx vite --host localhost --port 6271 --strictPort
 *   npx tsx scripts/browser-bug-hunt-v7.ts --base=http://localhost:6271/ \
 *     --matches=9 --rounds=30 --out=<new directory>
 *
 * Options: --factions=ORIGINAL,UNDEAD,... (rotated through the matches),
 * --maps=CONTINENTS,... --opponents=1..3 (rotated), --seed=<n>,
 * --random=<0..1>, --fidget=<0..1> (idle taps on tiles and dock buttons), --speed=NORMAL|FAST, --motion=FULL|REDUCED,
 * --save-quit-every=<human turns>, --headed.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

interface DebugTarget {
  readonly type: string;
  readonly url: string;
  readonly webSocketDebuggerUrl: string;
}
interface ProtocolMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: Record<string, unknown>;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  on(method: string, listener: (params: Record<string, unknown>) => void): void;
  close(): void;
}

const FACTIONS = [
  "ORIGINAL",
  "UNDEAD",
  "GOBLIN",
  "DINOSAUR",
  "MARTIAN",
  "ICE_FOLK",
  "DWARF",
  "CANDY",
  "CULT",
] as const;
const MAPS = ["CONTINENTS", "PANGEA", "ARCHIPELAGO", "DRY_LAND", "LAKES"];

const options = parseOptions(process.argv.slice(2));
const chrome =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 10_300 + (process.pid % 200);
const profile = await mkdtemp(path.join(tmpdir(), "pulp-wars-bug-hunt-"));
await mkdir(options.out, { recursive: true });
const browser = spawn(
  chrome,
  [
    ...(options.headed ? [] : ["--headless=new"]),
    "--mute-audio",
    "--autoplay-policy=user-gesture-required",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--window-size=390,844",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const PHONE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

/** Runs before any page script: no sound or music, counted listeners. */
const INIT_SCRIPT = `(() => {
  try {
    const keep = location.hash.includes('keep-save');
    for (const key of Object.keys(localStorage))
      if (!keep && key.startsWith('pulpWars.save.')) localStorage.removeItem(key);
    localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 }));
    localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 }));
    const settings = new URLSearchParams(location.search);
    localStorage.setItem('pulpWars.settings.v1', JSON.stringify({
      format: 'pulp-wars-settings', version: 1,
      settings: {
        uiScale: 1,
        motion: settings.get('hunt-motion') ?? 'FULL',
        animationSpeed: settings.get('hunt-speed') ?? 'NORMAL',
        highContrast: false,
      },
    }));
  } catch {}
  const errors = [];
  globalThis.__HUNT_ERRORS__ = errors;
  addEventListener('error', (event) => errors.push('error: ' + (event.error?.stack ?? event.message)));
  addEventListener('unhandledrejection', (event) => errors.push('unhandledrejection: ' + (event.reason?.stack ?? String(event.reason))));
  const consoleError = console.error.bind(console);
  console.error = (...args) => {
    errors.push('console.error: ' + args.map((arg) => arg?.stack ?? String(arg)).join(' '));
    consoleError(...args);
  };
  const listeners = new WeakMap();
  const canvases = new Set();
  globalThis.__HUNT_CANVASES__ = canvases;
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function (type, listener, opts) {
    if (this instanceof HTMLCanvasElement && typeof type === 'string' && type.startsWith('pointer')) {
      let set = listeners.get(this);
      if (set === undefined) { set = new Map(); listeners.set(this, set); canvases.add(this); }
      const entries = set.get(type) ?? new Set();
      entries.add(listener);
      set.set(type, entries);
    }
    return add.call(this, type, listener, opts);
  };
  EventTarget.prototype.removeEventListener = function (type, listener, opts) {
    if (this instanceof HTMLCanvasElement && typeof type === 'string')
      listeners.get(this)?.get(type)?.delete(listener);
    return remove.call(this, type, listener, opts);
  };
  globalThis.__HUNT_LISTENERS__ = () => [...canvases]
    .filter((canvas) => canvas.isConnected)
    .map((canvas) => ({
      className: canvas.className,
      pointerdown: listeners.get(canvas)?.get('pointerdown')?.size ?? 0,
      pointermove: listeners.get(canvas)?.get('pointermove')?.size ?? 0,
    }));
})();`;

/** Page-side helpers, installed after the app has booted. */
const HELPERS = `(() => {
  const app = globalThis.__PULP_WARS_APP__;
  const controller = app.controller;
  const view = app.view;
  const visible = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    const bounds = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return bounds.width > 0 && bounds.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  };
  const button = (selector) => {
    const found = [...document.querySelectorAll(selector)].find((candidate) => candidate instanceof HTMLButtonElement && visible(candidate));
    return found ?? null;
  };
  const centre = (element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  };
  let aiModule = null;
  globalThis.__HUNT__ = {
    state() {
      const snapshot = controller.snapshot();
      const v = snapshot.view;
      const end = button('[data-action="end-turn"]');
      return {
        phase: snapshot.phase,
        diagnostic: snapshot.diagnostic,
        round: v?.round ?? null,
        commandIndex: v?.commandIndex ?? null,
        humanTurn: v !== null && v.turnOrder[v.activeSeatIndex] === v.humanPlayerId,
        outcome: v?.outcome ?? null,
        pendingChoices: v?.pendingChoices.length ?? 0,
        offered: snapshot.offeredCommands.length,
        endTurnVisible: end !== null,
        endTurnEnabled: end !== null && !end.disabled,
        busy: view.busyStateForReview(),
        screen: document.querySelector('[data-v7-region="hud"]') !== null ? 'MATCH' : 'OTHER',
        alert: document.querySelector('#v7-alert')?.textContent ?? '',
        dialogs: [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].filter(visible).map((node) => node.className),
        errors: globalThis.__HUNT_ERRORS__.length,
        saveWarning: snapshot.saveWarning,
        listeners: globalThis.__HUNT_LISTENERS__(),
      };
    },
    errors(from) { return globalThis.__HUNT_ERRORS__.slice(from); },
    saveBytes() {
      try {
        const key = Object.keys(localStorage).find((name) => name.startsWith("pulpWars.save.v7"));
        return key === undefined ? 0 : (localStorage.getItem(key) ?? "").length;
      } catch {
        return -1;
      }
    },
    async choose(accepted, randomRate, randomValue, pickValue) {
      const choose = controller.normalCommandForReview === undefined ? (await (aiModule ??= import('/src/ai/index.ts'))).chooseNormalTurnCommandV7 : (view, count) => controller.normalCommandForReview(count);
      const snapshot = controller.snapshot();
      const offered = snapshot.offeredCommands;
      if (offered.length === 0) return null;
      if (randomValue < randomRate) {
        // A random offered command; END_TURN only rarely, so turns run long.
        const others = offered.filter((command) => command.kind !== 'END_TURN');
        const pool = others.length > 0 && pickValue > 0.08 ? others : offered;
        return pool[Math.floor(pickValue * 997) % pool.length];
      }
      try {
        return choose(snapshot.view, accepted) ?? offered.find((command) => command.kind === 'END_TURN') ?? offered[0];
      } catch (error) {
        globalThis.__HUNT_NOTES__ = String(error);
        return offered.find((command) => command.kind === 'END_TURN') ?? offered[0];
      }
    },
    unitAt(unitId) {
      return controller.snapshot().view?.units.find((unit) => unit.id === unitId)?.at ?? null;
    },
    tilePoint(at) {
      const canvas = document.querySelector('canvas.board-canvas-v7');
      if (canvas === null) return null;
      const bounds = canvas.getBoundingClientRect();
      const local = view.boardHostForReview.cellCentreCssPx(at);
      const point = { x: bounds.left + local.x, y: bounds.top + local.y };
      // Only a point on the board itself, clear of the HUD and the dock.
      const hit = document.elementFromPoint(point.x, point.y);
      return hit === canvas ? point : null;
    },
    boardCentre() {
      const canvas = document.querySelector('canvas.board-canvas-v7');
      return canvas === null ? null : centre(canvas);
    },
    buttonPoint(selector) {
      const found = button(selector);
      return found === null || found.disabled ? null : centre(found);
    },
    clickButton(selector) {
      const found = button(selector);
      if (found === null || found.disabled) return false;
      found.click();
      return true;
    },
    dispatch(command) {
      return view.dispatchForReview(command);
    },
    debugBundle() {
      const result = controller.exportDebugBundle({ acknowledgeHiddenInformation: true });
      return result.ok ? result.source : null;
    },
    /** A random explored tile's place on screen (a player's idle tap). */
    randomTilePoint(pick) {
      const v = controller.snapshot().view;
      const tiles = pick < 0.3 ? v.board.tiles.filter((tile) => !tile.explored) : v.board.tiles;
      for (let attempt = 0; attempt < 12; attempt += 1) {
        const tile = tiles[Math.floor(((pick * 7919 + attempt * 0.618) % 1) * tiles.length)];
        if (tile === undefined) continue;
        const point = this.tilePoint(tile.at);
        if (point !== null) return point;
      }
      return null;
    },
    /** The dock's and the HUD chips' visible enabled buttons. */
    looseButtons() {
      return [...document.querySelectorAll('.v7-selection-dock button, .v7-selection-dock [role="button"], .v7-hud-stats button')]
        .filter((candidate) => visible(candidate) && !candidate.disabled)
        .map((candidate) => ({ action: candidate.dataset.action ?? candidate.className, ...centre(candidate) }));
    },
    overlayClose() {
      return this.buttonPoint('[data-action="close-overlay"]') ??
        this.buttonPoint('[role="dialog"] [data-action^="close"]') ??
        this.buttonPoint('[role="dialog"] .close-button') ??
        this.buttonPoint('[data-action="dismiss-achievement"]');
    },
  };
  return true;
})()`;

interface PageState {
  readonly phase: string;
  readonly diagnostic: string | null;
  readonly round: number | null;
  readonly commandIndex: number | null;
  readonly humanTurn: boolean;
  readonly outcome: unknown;
  readonly pendingChoices: number;
  readonly offered: number;
  readonly endTurnVisible: boolean;
  readonly endTurnEnabled: boolean;
  readonly busy: Record<string, unknown>;
  readonly screen: string;
  readonly alert: string;
  readonly dialogs: readonly string[];
  readonly errors: number;
  readonly saveWarning: string | null;
  readonly listeners: readonly {
    readonly className: string;
    readonly pointerdown: number;
    readonly pointermove: number;
  }[];
}

interface Coord {
  readonly x: number;
  readonly y: number;
}
type Command = Record<string, unknown> & { readonly kind: string };

interface MatchReport {
  readonly index: number;
  readonly faction: string;
  readonly map: string;
  readonly opponents: number;
  readonly seed: number;
  rounds: number;
  humanCommands: number;
  uiTaps: number;
  dockDispatches: number;
  saveQuits: number;
  swipes: number;
  outcome: string;
  failures: string[];
  notes: string[];
  maxSaveBytes: number;
  pageErrors: string[];
  milliseconds: number;
}

let primaryFailure: unknown;
const reports: MatchReport[] = [];
try {
  const target = await waitForTarget(port);
  const connection = await connect(target.webSocketDebuggerUrl);
  const consoleLog: string[] = [];
  connection.on("Runtime.consoleAPICalled", (params) => {
    const args = (params.args as { value?: unknown; description?: string }[])
      .map((arg) => String(arg.value ?? arg.description ?? ""))
      .join(" ");
    consoleLog.push(`${String(params.type)}: ${args}`);
    if (consoleLog.length > 400) consoleLog.shift();
  });
  connection.on("Runtime.exceptionThrown", (params) => {
    const details = params.exceptionDetails as {
      exception?: { description?: string };
      text?: string;
    };
    consoleLog.push(
      `exception: ${details.exception?.description ?? details.text ?? ""}`,
    );
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    mobile: true,
  });
  await connection.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 5,
  });
  await connection.send("Emulation.setUserAgentOverride", {
    userAgent: PHONE_UA,
    platform: "Android",
  });
  await connection.send("Page.addScriptToEvaluateOnNewDocument", {
    source: INIT_SCRIPT,
  });
  let random = mulberry32(options.seed);
  for (let index = 0; index < options.matches; index += 1) {
    random = mulberry32(options.seed * 1009 + index);
    const faction =
      options.factions[index % options.factions.length] ?? "ORIGINAL";
    const map = options.maps[index % options.maps.length] ?? "CONTINENTS";
    const opponents = options.opponents[index % options.opponents.length] ?? 2;
    const seed = 1000 + options.seed * 100 + index;
    const report: MatchReport = {
      index,
      faction,
      map,
      opponents,
      seed,
      rounds: 0,
      humanCommands: 0,
      uiTaps: 0,
      dockDispatches: 0,
      saveQuits: 0,
      swipes: 0,
      outcome: "RUNNING",
      failures: [],
      notes: [],
      maxSaveBytes: 0,
      pageErrors: [],
      milliseconds: 0,
    };
    reports.push(report);
    const started = Date.now();
    consoleLog.length = 0;
    try {
      await playMatch(connection, report, random, consoleLog);
    } catch (error) {
      report.failures.push(`harness: ${errorMessage(error)}`);
      report.outcome = "HARNESS_ERROR";
      await dumpFailure(connection, report, "harness", consoleLog, []);
    }
    report.milliseconds = Date.now() - started;
    console.log(
      JSON.stringify({
        match: index,
        faction,
        map,
        opponents,
        rounds: report.rounds,
        humanCommands: report.humanCommands,
        uiTaps: report.uiTaps,
        outcome: report.outcome,
        failures: report.failures.length,
        pageErrors: report.pageErrors.length,
        notes: report.notes.length,
        maxSaveBytes: report.maxSaveBytes,
        seconds: Math.round(report.milliseconds / 1000),
      }),
    );
    await writeFile(
      path.join(options.out, "report.json"),
      `${JSON.stringify({ options, reports }, null, 2)}\n`,
    );
  }
  connection.close();
} catch (error) {
  primaryFailure = error;
} finally {
  await stopBrowser(browser);
  await rm(profile, {
    recursive: true,
    force: true,
    maxRetries: 6,
    retryDelay: 100,
  });
}
if (primaryFailure !== undefined) throw primaryFailure;
const failed = reports.filter(
  (report) => report.failures.length > 0 || report.pageErrors.length > 0,
);
console.log(
  JSON.stringify({
    matches: reports.length,
    failedMatches: failed.length,
    rounds: reports.reduce((sum, report) => sum + report.rounds, 0),
    humanCommands: reports.reduce(
      (sum, report) => sum + report.humanCommands,
      0,
    ),
    out: options.out,
  }),
);
process.exitCode = failed.length > 0 ? 1 : 0;

async function playMatch(
  connection: Connection,
  report: MatchReport,
  random: () => number,
  consoleLog: string[],
): Promise<void> {
  const url = new URL(options.base);
  url.searchParams.set("browser-smoke", "1");
  url.searchParams.set("hunt-speed", options.speed);
  url.searchParams.set("hunt-motion", options.motion);
  await connection.send("Page.navigate", { url: url.href });
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__?.view?.dispatchForReview !== undefined && document.querySelector('[data-action="new-game"]') !== null`,
    180_000,
  );
  await evaluate(connection, HELPERS);
  // The setup form, filled the way a player does.
  await evaluate(
    connection,
    `document.querySelector('[data-action="new-game"]').click()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('#v7-map-type') !== null`,
    10_000,
  );
  await evaluate(
    connection,
    `(() => {
      const set = (id, value) => {
        const field = document.querySelector('#' + id);
        if (!(field instanceof HTMLSelectElement || field instanceof HTMLInputElement)) return false;
        if (field instanceof HTMLSelectElement && ![...field.options].some((option) => option.value === value)) return false;
        field.value = value;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      };
      set('v7-map-type', ${JSON.stringify(report.map)});
      set('v7-ai-count', ${JSON.stringify(String(report.opponents))});
      set('v7-faction-0', ${JSON.stringify(report.faction)});
      document.querySelector('[data-action="seed-mode-seed"]')?.click();
      set('v7-seed', ${JSON.stringify(String(report.seed))});
      document.querySelector('[data-action="launch"]').click();
    })()`,
  );
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().phase === 'ACTIVE'`,
    20_000,
  );
  const launched = await evaluate<{ faction: string; map: string }>(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return { faction: v.viewer.faction, map: v.setup.mapType }; })()`,
  );
  if (launched.faction !== report.faction)
    report.failures.push(
      `setup: launched ${launched.faction} on ${launched.map}, wanted ${report.faction}`,
    );
  const commandLog: string[] = [];
  let errorsSeen = 0;
  let acceptedThisTurn = 0;
  let humanTurns = 0;
  let lastRound = -1;
  let pendingIndex: number | null = null;
  let stalls = 0;
  let dismissals = 0;
  let closeAttempts = 0;
  const deadline = Date.now() + options.matchMinutes * 60_000;
  for (;;) {
    if (Date.now() > deadline) {
      report.outcome = "TIME_LIMIT";
      return;
    }
    const state = await waitForSettled(connection, 90_000);
    const errors = await evaluate<string[]>(
      connection,
      `__HUNT__.errors(${errorsSeen})`,
    );
    if (errors.length > 0) {
      errorsSeen += errors.length;
      report.pageErrors.push(...errors);
      await dumpFailure(
        connection,
        report,
        "page-error",
        consoleLog,
        commandLog,
      );
    }
    if (state === null) {
      report.failures.push(
        `freeze: never settled after ${commandLog.at(-1) ?? "launch"}`,
      );
      report.outcome = "FROZEN";
      await dumpFailure(connection, report, "freeze", consoleLog, commandLog);
      return;
    }
    report.rounds = state.round ?? report.rounds;
    if (state.phase === "COMPLETE" || state.outcome !== null) {
      report.outcome = "COMPLETE";
      return;
    }
    if (state.phase === "ERROR") {
      report.failures.push(`controller error: ${state.diagnostic ?? ""}`);
      report.outcome = "ERROR";
      await dumpFailure(
        connection,
        report,
        "controller-error",
        consoleLog,
        commandLog,
      );
      return;
    }
    if (state.phase !== "ACTIVE") {
      report.failures.push(`unexpected phase ${state.phase}`);
      report.outcome = "UNEXPECTED_PHASE";
      await dumpFailure(connection, report, "phase", consoleLog, commandLog);
      return;
    }
    if ((state.round ?? 0) > options.rounds) {
      report.outcome = "ROUND_LIMIT";
      return;
    }
    // An achievement notice is closed the way a player does, with a tap.
    const notice = await evaluate<Coord | null>(
      connection,
      `__HUNT__.buttonPoint('[data-action="dismiss-achievement"]')`,
    );
    if (notice !== null) {
      await tap(connection, notice);
      commandLog.push("DISMISS_ACHIEVEMENT");
      dismissals += 1;
      if (dismissals > 12) {
        report.failures.push("achievement notice did not close");
        report.outcome = "NOTICE_STUCK";
        await dumpFailure(connection, report, "notice", consoleLog, commandLog);
        return;
      }
      await delay(150);
      continue;
    }
    dismissals = 0;
    if (state.dialogs.length > 0 && state.pendingChoices === 0) {
      // A help dialog or popover the idle taps opened: closed with its own
      // close button, as a player does, before the next command.
      commandLog.push(`DIALOGS ${state.dialogs.join(",")}`);
      const shut = await evaluate<Coord | null>(
        connection,
        `__HUNT__.overlayClose()`,
      );
      if (shut !== null) await tap(connection, shut);
      else await pressEscape(connection);
      closeAttempts += 1;
      if (closeAttempts > 6) {
        report.failures.push(
          `dialog would not close: ${state.dialogs.join(",")}`,
        );
        report.outcome = "DIALOG_STUCK";
        await dumpFailure(connection, report, "dialog", consoleLog, commandLog);
        return;
      }
      await delay(150);
      continue;
    }
    closeAttempts = 0;
    const listenerProblem = listenerFailure(state);
    if (listenerProblem !== null) {
      report.failures.push(`listeners: ${listenerProblem}`);
      await dumpFailure(
        connection,
        report,
        "listeners",
        consoleLog,
        commandLog,
      );
      report.outcome = "LISTENERS";
      return;
    }
    if (state.round !== lastRound) {
      lastRound = state.round ?? -1;
      report.maxSaveBytes = Math.max(
        report.maxSaveBytes,
        await evaluate<number>(connection, `__HUNT__.saveBytes()`),
      );
      if (
        state.saveWarning !== null &&
        !report.notes.some((note) => note.startsWith("save warning"))
      )
        report.notes.push(
          `save warning at round ${state.round}: ${state.saveWarning}`,
        );
      acceptedThisTurn = 0;
      humanTurns += 1;
      // A swipe moves the board by its own distance (not twice it).
      const swipe = await checkSwipe(connection, random());
      report.swipes += 1;
      if (swipe !== null) {
        report.failures.push(`swipe: ${swipe}`);
        await dumpFailure(connection, report, "swipe", consoleLog, commandLog);
      }
      if (
        options.saveQuitEvery > 0 &&
        humanTurns % options.saveQuitEvery === 0 &&
        state.pendingChoices === 0
      ) {
        const problem = await saveQuitAndResume(connection);
        report.saveQuits += 1;
        commandLog.push(`SAVE_QUIT_RESUME ${problem ?? "ok"}`);
        if (problem !== null) {
          report.failures.push(`save & quit: ${problem}`);
          report.outcome = "SAVE_QUIT";
          await dumpFailure(
            connection,
            report,
            "save-quit",
            consoleLog,
            commandLog,
          );
          return;
        }
        continue;
      }
    }
    if (pendingIndex !== null) {
      if ((state.commandIndex ?? 0) > pendingIndex) stalls = 0;
      else {
        stalls += 1;
        commandLog.push(`NOT_ACCEPTED (${stalls}) alert=${state.alert}`);
        if (stalls >= 3) {
          report.failures.push(
            `commands not accepted: ${commandLog.slice(-4).join(" | ")}`,
          );
          report.outcome = "NOT_ACCEPTED";
          await dumpFailure(
            connection,
            report,
            "not-accepted",
            consoleLog,
            commandLog,
          );
          return;
        }
      }
      pendingIndex = null;
      if (random() < 0.25) {
        // After a command: select a unit and swipe, as a player does.
        const swipe = await checkSwipe(connection, random());
        report.swipes += 1;
        if (swipe !== null) {
          report.failures.push(`swipe after a command: ${swipe}`);
          await dumpFailure(
            connection,
            report,
            "swipe",
            consoleLog,
            commandLog,
          );
        }
        continue;
      }
    }
    if (options.fidget > 0 && random() < options.fidget) {
      // A player's idle taps: a tile, then maybe a dock or HUD button
      // (details, a status chip, an action), then back to the board.
      const point = await evaluate<Coord | null>(
        connection,
        `__HUNT__.randomTilePoint(${random()})`,
      );
      if (point !== null) {
        await tap(connection, point);
        await delay(150);
      }
      if (random() < 0.6) {
        const loose = await evaluate<(Coord & { action: string })[]>(
          connection,
          `__HUNT__.looseButtons()`,
        );
        const chosen = loose[Math.floor(random() * loose.length)];
        if (chosen !== undefined) {
          await tap(connection, chosen);
          commandLog.push(`FIDGET tile+${chosen.action}`);
          await delay(200);
        }
      } else commandLog.push("FIDGET tile");
      for (let close = 0; close < 3; close += 1) {
        const shut = await evaluate<Coord | null>(
          connection,
          `__HUNT__.overlayClose()`,
        );
        const hud = await evaluate<boolean>(
          connection,
          `document.querySelector('[data-v7-region="hud"]') !== null`,
        );
        if (shut !== null) await tap(connection, shut);
        else if (!hud) await pressEscape(connection);
        else break;
        await delay(150);
      }
      continue;
    }
    const command = await evaluate<Command | null>(
      connection,
      stalls > 0
        ? `__HUNT__.choose(${acceptedThisTurn}, 1, 0, ${random()})`
        : `__HUNT__.choose(${acceptedThisTurn}, ${options.random}, ${random()}, ${random()})`,
    );
    if (command === null) {
      report.failures.push("no offered command on the human turn");
      report.outcome = "NO_COMMAND";
      await dumpFailure(
        connection,
        report,
        "no-command",
        consoleLog,
        commandLog,
      );
      return;
    }
    const before = state.commandIndex ?? 0;
    const how = await perform(connection, command, state);
    commandLog.push(`${how} ${JSON.stringify(command)}`);
    report.humanCommands += 1;
    if (how === "TAP") report.uiTaps += 1;
    else report.dockDispatches += 1;
    acceptedThisTurn += 1;
    if (command.kind !== "END_TURN") pendingIndex = before;
    if (command.kind === "END_TURN") {
      // The turn passes: the AI plays, then the human's next turn settles.
      const advanced = `(() => { const s = __HUNT__.state(); return s.commandIndex > ${before} || s.phase !== 'ACTIVE'; })()`;
      let passed = await waitForExpression(connection, advanced, 3_000).then(
        () => true,
        () => false,
      );
      if (passed && options.fidget > 0 && random() < options.fidget) {
        // While the rivals play: a swipe across the board and a tap on a
        // tile, as an impatient player does.
        const centre = await evaluate<Coord | null>(
          connection,
          `__HUNT__.boardCentre()`,
        );
        if (centre !== null) {
          await delay(Math.floor(random() * 600));
          await swipe(connection, centre, {
            x: centre.x + (random() - 0.5) * 200,
            y: centre.y + (random() - 0.5) * 200,
          });
          const point = await evaluate<Coord | null>(
            connection,
            `__HUNT__.randomTilePoint(${random()})`,
          );
          if (point !== null) await tap(connection, point);
          commandLog.push("FIDGET during the AI turn");
        }
      }
      if (!passed) {
        // A first tap a popover took (it closes on a tap outside) is noted;
        // a second tap must end the turn.
        const now = await evaluate<PageState>(connection, `__HUNT__.state()`);
        report.notes.push(
          `End Turn's first tap did not end the turn (round ${now.round}, dialogs ${now.dialogs.join(",") || "none"}, after ${commandLog.at(-2) ?? ""})`,
        );
        await perform(connection, command, now);
        passed = await waitForExpression(connection, advanced, 20_000).then(
          () => true,
          () => false,
        );
      }
      if (!passed) {
        report.failures.push("End Turn did not advance the turn");
        report.outcome = "END_TURN_DEAD";
        await dumpFailure(
          connection,
          report,
          "end-turn",
          consoleLog,
          commandLog,
        );
        return;
      }
      acceptedThisTurn = 0;
    }
  }
}

function listenerFailure(state: PageState): string | null {
  const boards = state.listeners.filter((entry) =>
    entry.className.includes("board-canvas-v7"),
  );
  if (state.screen !== "MATCH") return null;
  if (boards.length !== 1)
    return `${boards.length} board canvases connected: ${JSON.stringify(state.listeners)}`;
  const board = boards[0];
  if (
    board !== undefined &&
    (board.pointerdown !== 1 || board.pointermove !== 1)
  )
    return `board canvas listeners ${JSON.stringify(board)}`;
  return null;
}

/**
 * Waits until the interface is idle: the human may act (End Turn enabled or
 * a choice offered), or the match is over or broken. Null when it never is.
 */
async function waitForSettled(
  connection: Connection,
  timeout: number,
): Promise<PageState | null> {
  const end = Date.now() + timeout;
  let stableSince: number | null = null;
  while (Date.now() < end) {
    const state = await evaluate<PageState>(connection, `__HUNT__.state()`);
    const done =
      state.phase === "COMPLETE" ||
      state.phase === "ERROR" ||
      state.outcome !== null ||
      (state.phase === "ACTIVE" &&
        state.humanTurn &&
        !state.busy.presentationActive &&
        !state.busy.transitioning &&
        !state.busy.aiActive &&
        (state.endTurnEnabled || state.pendingChoices > 0));
    if (done) {
      stableSince ??= Date.now();
      if (Date.now() - stableSince >= 120) return state;
    } else stableSince = null;
    await delay(60);
  }
  return null;
}

/** Taps the board for a move or an attack; anything else goes through the dock's dispatch. */
async function perform(
  connection: Connection,
  command: Command,
  state: PageState,
): Promise<"TAP" | "DOCK" | "END_TURN_BUTTON"> {
  const before = state.commandIndex ?? 0;
  if (command.kind === "END_TURN") {
    const point = await evaluate<Coord | null>(
      connection,
      `__HUNT__.buttonPoint('[data-action="end-turn"]')`,
    );
    if (point !== null) {
      await tap(connection, point);
      // The Cultists' End Turn question.
      await delay(150);
      await evaluate(
        connection,
        `__HUNT__.clickButton('[data-action="end-turn-confirm"]')`,
      );
      return "END_TURN_BUTTON";
    }
  }
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    state.pendingChoices === 0
  ) {
    const unitId = command.unitId as string;
    const destination =
      command.kind === "MOVE"
        ? ((command.path as Coord[]).at(-1) ?? null)
        : await evaluate<Coord | null>(
            connection,
            `__HUNT__.unitAt(${JSON.stringify(command.targetUnitId)})`,
          );
    const from = await evaluate<Coord | null>(
      connection,
      `__HUNT__.unitAt(${JSON.stringify(unitId)})`,
    );
    const fromPoint =
      from === null
        ? null
        : await evaluate<Coord | null>(
            connection,
            `__HUNT__.tilePoint(${JSON.stringify(from)})`,
          );
    if (fromPoint !== null && destination !== null) {
      await tap(connection, fromPoint);
      await delay(120);
      const toPoint = await evaluate<Coord | null>(
        connection,
        `__HUNT__.tilePoint(${JSON.stringify(destination)})`,
      );
      if (toPoint !== null) {
        await tap(connection, toPoint);
        const advanced = await waitForExpression(
          connection,
          `__HUNT__.state().commandIndex > ${before}`,
          1_500,
        ).then(
          () => true,
          () => false,
        );
        if (advanced) return "TAP";
      }
    }
  }
  // The dock's own path (a tap may have opened a chooser: Escape-free, the
  // dispatch clears it). Wait for any settle a stray tap started first.
  const settled = await waitForSettled(connection, 30_000);
  if (settled !== null && (settled.commandIndex ?? 0) > before) return "TAP";
  await evaluate(
    connection,
    `void __HUNT__.dispatch(${JSON.stringify(command)})`,
  );
  return "DOCK";
}

/** A swipe of 80 px moves a tile 80 px on screen, within the camera's limits. */
async function checkSwipe(
  connection: Connection,
  selectPick: number | null = null,
): Promise<string | null> {
  const centre = await evaluate<Coord | null>(
    connection,
    `__HUNT__.boardCentre()`,
  );
  if (centre === null) return "no board";
  const probe = await evaluate<{ at: Coord; point: Coord } | null>(
    connection,
    `(() => {
      const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view;
      const host = globalThis.__PULP_WARS_APP__.view.boardHostForReview;
      const own = v.units.filter((unit) => unit.ownerId === v.viewer.id);
      const pick = ${selectPick === null ? "null" : String(selectPick)};
      const tile = (pick === null ? own[0] : own[Math.floor(pick * own.length)]) ?? v.cities[0];
      if (tile === undefined) return null;
      return { at: tile.at, point: host.cellCentreCssPx(tile.at) };
    })()`,
  );
  if (probe === null) return null;
  if (selectPick !== null) {
    // With the unit selected: its targets, badges and previews are drawn.
    const point = await evaluate<Coord | null>(
      connection,
      `__HUNT__.tilePoint(${JSON.stringify(probe.at)})`,
    );
    if (point !== null) {
      await tap(connection, point);
      await delay(150);
    }
    probe.point = await evaluate<Coord>(
      connection,
      `globalThis.__PULP_WARS_APP__.view.boardHostForReview.cellCentreCssPx(${JSON.stringify(probe.at)})`,
    );
  }
  const distance = 60;
  const result: Coord[] = [];
  for (const direction of [1, -1]) {
    await swipe(connection, centre, {
      x: centre.x + distance * direction,
      y: centre.y,
    });
    await delay(80);
    result.push(
      await evaluate<Coord>(
        connection,
        `globalThis.__PULP_WARS_APP__.view.boardHostForReview.cellCentreCssPx(${JSON.stringify(probe.at)})`,
      ),
    );
  }
  const first = result[0];
  if (first === undefined) return null;
  const moved = first.x - probe.point.x;
  // The camera's limits may clamp a swipe (less), never double it (more).
  if (Math.abs(moved) > distance * 1.3)
    return `a ${distance} px swipe moved the board ${Math.round(moved)} px`;
  return null;
}

async function saveQuitAndResume(
  connection: Connection,
): Promise<string | null> {
  const menu = await evaluate<Coord | null>(
    connection,
    `__HUNT__.buttonPoint('[data-action="compact-menu"]')`,
  );
  if (menu === null) return "no menu button";
  await tap(connection, menu);
  await delay(200);
  const quit = await evaluate<Coord | null>(
    connection,
    `__HUNT__.buttonPoint('[data-action="main-menu"]')`,
  );
  if (quit === null) return "no Save & quit in the menu";
  await tap(connection, quit);
  const saved = await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().phase === 'RESUMABLE' && document.querySelector('[data-action="resume"]') !== null`,
    10_000,
  ).then(
    () => true,
    () => false,
  );
  if (!saved) return "Save & quit did not reach the main menu";
  const resume = await evaluate<Coord | null>(
    connection,
    `__HUNT__.buttonPoint('[data-action="resume"]')`,
  );
  if (resume === null) return "no Resume button";
  await tap(connection, resume);
  const resumed = await waitForSettled(connection, 30_000);
  if (resumed === null || resumed.phase !== "ACTIVE")
    return "Resume did not bring the match back";
  return null;
}

async function dumpFailure(
  connection: Connection,
  report: MatchReport,
  label: string,
  consoleLog: readonly string[],
  commandLog: readonly string[],
): Promise<void> {
  const stem = path.join(
    options.out,
    `match-${report.index}-${report.faction}-${label}-${report.failures.length + report.pageErrors.length}`,
  );
  try {
    const shot = (await connection.send("Page.captureScreenshot", {
      format: "png",
    })) as { data: string };
    await writeFile(`${stem}.png`, Buffer.from(shot.data, "base64"));
  } catch {
    // A screenshot is evidence, not a requirement.
  }
  try {
    const bundle = await evaluate<string | null>(
      connection,
      `__HUNT__.debugBundle()`,
    );
    if (bundle !== null) await writeFile(`${stem}-debug.json`, bundle);
    const state = await evaluate<PageState>(connection, `__HUNT__.state()`);
    const errors = await evaluate<string[]>(connection, `__HUNT__.errors(0)`);
    await writeFile(
      `${stem}-log.json`,
      `${JSON.stringify({ report, state, errors, commandLog, consoleLog }, null, 2)}\n`,
    );
  } catch (error) {
    await writeFile(
      `${stem}-log.json`,
      JSON.stringify({
        error: errorMessage(error),
        page: await evaluate<string>(
          connection,
          `location.href + " " + document.documentElement.outerHTML.slice(0, 3000)`,
        ).catch((reason: unknown) => errorMessage(reason)),
        commandLog,
        consoleLog,
      }),
    );
  }
}

async function tap(connection: Connection, point: Coord): Promise<void> {
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: point.x, y: point.y }],
  });
  await delay(30);
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function pressEscape(connection: Connection): Promise<void> {
  for (const type of ["keyDown", "keyUp"])
    await connection.send("Input.dispatchKeyEvent", {
      type,
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
}

async function swipe(
  connection: Connection,
  from: Coord,
  to: Coord,
): Promise<void> {
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });
  const steps = 6;
  for (let step = 1; step <= steps; step += 1) {
    await delay(16);
    await connection.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        },
      ],
    });
  }
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

interface Options {
  readonly base: string;
  readonly out: string;
  readonly matches: number;
  readonly rounds: number;
  readonly seed: number;
  readonly random: number;
  readonly fidget: number;
  readonly speed: "NORMAL" | "FAST";
  readonly motion: "FULL" | "REDUCED";
  readonly factions: readonly string[];
  readonly maps: readonly string[];
  readonly opponents: readonly number[];
  readonly saveQuitEvery: number;
  readonly matchMinutes: number;
  readonly headed: boolean;
}

function parseOptions(args: readonly string[]): Options {
  const value = (name: string): string | undefined =>
    args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
  const list = (name: string, fallback: readonly string[]): readonly string[] =>
    value(name)?.split(",").filter(Boolean) ?? fallback;
  return {
    base: value("base") ?? "http://localhost:6271/",
    out:
      value("out") ??
      path.join(tmpdir(), `pulp-wars-bug-hunt-${Date.now().toString(36)}`),
    matches: Number(value("matches") ?? 9),
    rounds: Number(value("rounds") ?? 30),
    seed: Number(value("seed") ?? 1),
    random: Number(value("random") ?? 0),
    fidget: Number(value("fidget") ?? 0),
    speed: value("speed") === "NORMAL" ? "NORMAL" : "FAST",
    motion: value("motion") === "REDUCED" ? "REDUCED" : "FULL",
    factions: list("factions", FACTIONS),
    maps: list("maps", MAPS),
    opponents: list("opponents", ["2", "1", "3"]).map(Number),
    saveQuitEvery: Number(value("save-quit-every") ?? 4),
    matchMinutes: Number(value("match-minutes") ?? 25),
    headed: args.includes("--headed"),
  };
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const result = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    result?: { value?: unknown };
    exceptionDetails?: { exception?: { description?: string }; text?: string };
  };
  if (result.exceptionDetails !== undefined)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "evaluation failed",
    );
  return result.result?.value as T;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
  timeout: number,
): Promise<void> {
  const end = Date.now() + timeout;
  let last: unknown;
  while (Date.now() < end) {
    try {
      if ((await evaluate<boolean>(connection, expression)) === true) return;
    } catch (error) {
      last = error;
    }
    await delay(50);
  }
  throw new Error(
    `timed out: ${expression.slice(0, 120)}${last === undefined ? "" : ` (${errorMessage(last)})`}`,
  );
}

async function waitForTarget(debugPort: number): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      const targets = (await response.json()) as DebugTarget[];
      const page = targets.find((candidate) => candidate.type === "page");
      if (page !== undefined) return page;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Chrome debugging target did not become ready");
}

async function connect(url: string): Promise<Connection> {
  const socket = new WebSocket(url);
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
      resolve(value: unknown): void;
      reject(error: Error): void;
    }
  >();
  const listeners = new Map<
    string,
    ((params: Record<string, unknown>) => void)[]
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id === undefined) {
      if (message.method !== undefined)
        for (const listener of listeners.get(message.method) ?? [])
          listener(message.params ?? {});
      return;
    }
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(
        new Error(`${request.method}: ${message.error.message ?? "failed"}`),
      );
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { method, resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    on(method, listener) {
      listeners.set(method, [...(listeners.get(method) ?? []), listener]);
    },
    close: () => socket.close(),
  };
}

async function stopBrowser(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill();
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 3_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
