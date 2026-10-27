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
 * --random=<0..1>, --fidget=<0..1> (idle taps on tiles and dock buttons),
 * --speed=NORMAL|FAST, --motion=FULL|REDUCED,
 * --save-quit-every=<human turns>, --headed.
 *
 * Round 2 (bead pulp_wars-2yc.98): a presentation failure the guard
 * survived (its notice, its memory, its console line) fails the run, and
 * a resumed save's background history check must not report a mismatch.
 * --viewports=phone,small,tablet,desktop (rotated; phone 390x844 and small
 * 320x640 with touch, tablet 768x1024 with touch, desktop 1440x900 with a
 * mouse), --speeds=NORMAL,FAST,FF (FF: Fast and the fast-forward button on
 * every rival turn), --motions=FULL,REDUCED, --antics=<0..1> (per idle
 * moment: the tech screen and research, the unit card's chips and "?",
 * the match menu and its screens and settings, rotating the screen,
 * sending the page to the background and back, pinch or wheel zoom,
 * double taps), --campaign-every=<n> (every n-th match a campaign mission),
 * --front=<0..1> (Gallery, Settings or About from the main menu first).
 * Layout glitches (page overflow, End Turn off screen, the notice over End
 * Turn) are noted with a screenshot, not failed.
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

const PHONE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const TABLET_UA =
  "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

interface ViewportProfile {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly scale: number;
  readonly touch: boolean;
  readonly userAgent: string;
  readonly platform: string;
}
const VIEWPORTS: Readonly<Record<string, ViewportProfile>> = {
  phone: {
    name: "phone",
    width: 390,
    height: 844,
    scale: 3,
    touch: true,
    userAgent: PHONE_UA,
    platform: "Android",
  },
  small: {
    name: "small",
    width: 320,
    height: 640,
    scale: 2,
    touch: true,
    userAgent: PHONE_UA,
    platform: "Android",
  },
  tablet: {
    name: "tablet",
    width: 768,
    height: 1024,
    scale: 2,
    touch: true,
    userAgent: TABLET_UA,
    platform: "Android",
  },
  desktop: {
    name: "desktop",
    width: 1440,
    height: 900,
    scale: 1,
    touch: false,
    userAgent: DESKTOP_UA,
    platform: "MacIntel",
  },
};
/** The viewport now: taps are touches or mouse clicks by it. */
let viewport: ViewportProfile = VIEWPORTS.phone as ViewportProfile;
let landscape = false;
/** Page loads during a match (its error log and guard start again). */
let reloads = 0;

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
    "--window-size=1440,1024",
    "about:blank",
  ],
  { stdio: "ignore" },
);

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
    // Every campaign mission open (bead 2yc.98): the hunt plays any of
    // them. The testing cheat opens them all (pulp_wars-hmyk.22).
    if (settings.get('hunt-campaign') === '1')
      localStorage.setItem('pulpWars.campaignCheat', '1');
  } catch {}
  const errors = [];
  globalThis.__HUNT_ERRORS__ = errors;
  // The last clicks and keys, for a failure's log (bead 2yc.98).
  const inputs = [];
  globalThis.__HUNT_INPUTS__ = inputs;
  const noteInput = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    inputs.push(event.type + ' ' + (event.key ?? '') + ' ' + (target?.closest('[data-action]')?.dataset.action ?? target?.className ?? '') +
      (event.clientX === undefined ? '' : ' @' + Math.round(event.clientX) + ',' + Math.round(event.clientY)) + ' t=' + Math.round(performance.now()));
    if (inputs.length > 30) inputs.shift();
  };
  addEventListener('click', noteInput, true);
  addEventListener('keydown', noteInput, true);
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
  let guardModule = null;
  const findFailures = (value) => {
    if (value === null || typeof value !== 'object') return [];
    if (Array.isArray(value.presentationFailures)) return value.presentationFailures;
    for (const child of Object.values(value)) {
      const found = findFailures(child);
      if (found.length > 0) return found;
    }
    return [];
  };
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
      if (found === null || found.disabled) return null;
      // A player scrolls a list (the match menu) to reach its button.
      found.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      const point = centre(found);
      if (point.x < 0 || point.y < 0 || point.x > innerWidth || point.y > innerHeight) return null;
      // Only a button a finger can reach: not under another panel.
      const hit = document.elementFromPoint(point.x, point.y);
      return hit !== null && (hit === found || found.contains(hit)) ? point : null;
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
      const result = controller.exportDebugBundle({
        acknowledgeHiddenInformation: true,
        presentationFailures: view.presentationFailuresForReview?.().failures ?? [],
      });
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
    /**
     * What the presentation guard survived (bead 2yc.98): its count and
     * memory (the dev server's module, the one the game runs), else the
     * debug bundle's copy; and whether its notice is up.
     */
    async guard() {
      let count = null;
      let failures = null;
      if (typeof view.presentationFailuresForReview === 'function') {
        const read = view.presentationFailuresForReview();
        count = read.count;
        failures = read.failures;
      } else try {
        const guard = await (guardModule ??= import('/src/render/presentation-guard-v7.ts'));
        count = guard.presentationFailureCountV7();
        failures = guard.recentPresentationFailuresV7();
      } catch {
        try {
          const bundle = JSON.parse(this.debugBundle() ?? 'null');
          failures = JSON.stringify(bundle).includes('presentationFailures') ? findFailures(bundle) : [];
          count = failures.length;
        } catch { failures = []; count = 0; }
      }
      const notice = document.querySelector('[data-v7-region="failure-notice"]');
      return { count, failures, notice: notice !== null && visible(notice) };
    },
    /** The resumed save's background history check (bead 2yc.95). */
    historyCheck() {
      return typeof controller.savedHistoryCheck === 'function' ? controller.savedHistoryCheck() : null;
    },
    /** Layout glitches a player would see (bead 2yc.98), by kind. */
    layout() {
      const out = [];
      const width = innerWidth;
      const height = innerHeight;
      const doc = document.scrollingElement ?? document.documentElement;
      if (doc.scrollWidth > width + 1) out.push('page overflows sideways (' + doc.scrollWidth + ' > ' + width + ')');
      if (doc.scrollHeight > height + 1 && document.querySelector('[data-v7-region="hud"]') !== null) out.push('match page scrolls vertically (' + doc.scrollHeight + ' > ' + height + ')');
      const end = button('[data-action="end-turn"]');
      const rect = (node) => node.getBoundingClientRect();
      const inside = (b) => b.left >= -1 && b.top >= -1 && b.right <= width + 1 && b.bottom <= height + 1;
      const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
      if (end !== null && !inside(rect(end))) out.push('End Turn not fully on screen');
      const notice = document.querySelector('[data-v7-region="failure-notice"]');
      if (notice !== null && end !== null && visible(notice) && overlap(rect(notice), rect(end))) out.push('failure notice over End Turn');
      const hud = document.querySelector('[data-v7-region="hud"]');
      const dock = document.querySelector('.v7-selection-dock');
      if (dock instanceof HTMLElement && visible(dock)) {
        if (!inside(rect(dock))) out.push('dock not fully on screen');
        if (end !== null && overlap(rect(dock), rect(end))) out.push('dock over End Turn');
        if (hud instanceof HTMLElement && overlap(rect(dock), rect(hud))) out.push('dock over the HUD');
      }
      if (hud instanceof HTMLElement) {
        const parts = [...hud.querySelectorAll(':scope > *')].filter(visible);
        for (let i = 0; i < parts.length; i += 1)
          for (let j = i + 1; j < parts.length; j += 1)
            if (overlap(rect(parts[i]), rect(parts[j]))) out.push('HUD parts overlap: ' + parts[i].className + ' / ' + parts[j].className);
      }
      for (const dialog of [...document.querySelectorAll('[role="dialog"], [role="alertdialog"], .v7-status-popover, .v7-hud-menu, .v7-failure-notice')].filter(visible))
        if (!inside(rect(dialog))) out.push('dialog not fully on screen: ' + dialog.className);
      // A screen's close button under another panel.
      const closeButton = document.querySelector('[data-action="close-overlay"]');
      if (closeButton instanceof HTMLElement && visible(closeButton)) {
        const at = centre(closeButton);
        const hit = document.elementFromPoint(at.x, at.y);
        if (hit !== null && hit !== closeButton && !closeButton.contains(hit))
          out.push('screen close button covered: ' + (hit.closest('[class]')?.className ?? hit.nodeName));
      }
      // Text cut off in a button (its words wider than the button).
      for (const node of [...document.querySelectorAll('button')].filter(visible)) {
        if (node.scrollWidth > node.clientWidth + 2 && getComputedStyle(node).overflowX !== 'visible' && node.textContent.trim() !== '')
          out.push('button text cut off: ' + (node.dataset.action ?? node.textContent.trim().slice(0, 24)));
      }
      return out;
    },
    /** The page sent to the background or brought back (visibilitychange). */
    setHidden(hidden) {
      if (hidden) {
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      } else {
        delete document.visibilityState;
        delete document.hidden;
      }
      document.dispatchEvent(new Event('visibilitychange'));
      dispatchEvent(new PageTransitionEvent(hidden ? 'pagehide' : 'pageshow', { persisted: true }));
      return document.visibilityState;
    },
    /** Visible enabled buttons matching the CSS scope, with their places. */
    buttonsIn(scope) {
      return [...document.querySelectorAll(scope)]
        .filter((candidate) => visible(candidate) && !candidate.disabled)
        .map((candidate) => ({ action: candidate.dataset.action ?? candidate.className, ...centre(candidate) }))
        .filter((point) => point.x >= 0 && point.y >= 0 && point.x <= innerWidth && point.y <= innerHeight);
    },
    /** An own unit's tile on screen (or null). */
    ownUnitPoint(pick) {
      const v = controller.snapshot().view;
      const own = v.units.filter((unit) => unit.ownerId === v.viewer.id);
      for (let attempt = 0; attempt < own.length; attempt += 1) {
        const unit = own[(Math.floor(pick * own.length) + attempt) % own.length];
        const point = this.tilePoint(unit.at);
        if (point !== null) return point;
      }
      return null;
    },
    overlayClose() {
      return this.buttonPoint('[data-action="close-overlay"]') ??
        this.buttonPoint('[data-action="close-unit-help"]') ??
        this.buttonPoint('[data-action="close-tech-detail"]') ??
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
  readonly map: string;
  readonly opponents: number;
  readonly seed: number;
  readonly viewport: string;
  readonly speed: string;
  readonly motion: string;
  readonly mission: string | null;
  faction: string;
  /** What the guard survived (bead 2yc.98: each one is a failure). */
  presentationFailures: unknown[];
  /** Layout glitches seen (not failures): kind and where. */
  glitches: string[];
  glitchKinds: string[];
  /** How often each UI antic ran. */
  antics: Record<string, number>;
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
    const viewportName =
      options.viewports[index % options.viewports.length] ?? "phone";
    viewport = VIEWPORTS[viewportName] ?? (VIEWPORTS.phone as ViewportProfile);
    landscape = false;
    // Speeds and motions turn at their own pace, so the mixes vary.
    const speed =
      options.speeds[
        (index + Math.floor(index / options.viewports.length)) %
          options.speeds.length
      ] ?? "FAST";
    const motion =
      options.motions[Math.floor(index / 2) % options.motions.length] ?? "FULL";
    const mission =
      options.campaignEvery > 0 &&
      index % options.campaignEvery === options.campaignEvery - 1
        ? `HUMAN_${(Math.floor(index / options.campaignEvery) % 6) + 1}`
        : null;
    await applyViewport(connection);
    const report: MatchReport = {
      index,
      faction,
      map,
      opponents,
      seed,
      viewport: viewportName,
      speed,
      motion,
      mission,
      presentationFailures: [],
      glitches: [],
      glitchKinds: [],
      antics: {},
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
        faction: report.faction,
        mission: report.mission,
        map,
        opponents,
        viewport: report.viewport,
        speed: report.speed,
        motion: report.motion,
        rounds: report.rounds,
        humanCommands: report.humanCommands,
        uiTaps: report.uiTaps,
        outcome: report.outcome,
        failures: report.failures.length,
        pageErrors: report.pageErrors.length,
        notes: report.notes.length,
        presentationFailures: report.presentationFailures.length,
        glitches: report.glitches.length,
        antics: report.antics,
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
  (report) =>
    report.failures.length > 0 ||
    report.pageErrors.length > 0 ||
    report.presentationFailures.length > 0,
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
    presentationFailures: reports.reduce(
      (sum, report) => sum + report.presentationFailures.length,
      0,
    ),
    glitches: [...new Set(reports.flatMap((report) => report.glitches))],
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
  // Developer mode (pulp_wars-5xki): the Gallery and every faction.
  url.searchParams.set("dev", "1");
  url.searchParams.set(
    "hunt-speed",
    report.speed === "NORMAL" ? "NORMAL" : "FAST",
  );
  url.searchParams.set("hunt-motion", report.motion);
  if (report.mission !== null) url.searchParams.set("hunt-campaign", "1");
  await connection.send("Page.navigate", { url: url.href });
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__?.view?.dispatchForReview !== undefined && document.querySelector('[data-action="new-game"]') !== null`,
    180_000,
  );
  await evaluate(connection, HELPERS);
  if (random() < options.front) await frontAntic(connection, report, random);
  if (report.mission !== null) await launchMission(connection, report);
  else await launchQuickStart(connection, report);
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().phase === 'ACTIVE'`,
    20_000,
  );
  const launched = await evaluate<{ faction: string; map: string }>(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return { faction: v.viewer.faction, map: v.setup.mapType }; })()`,
  );
  if (report.mission !== null) report.faction = launched.faction;
  else if (launched.faction !== report.faction)
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
  let guardSeen = 0;
  let historyWatch: number | null = null;
  let roundAtEndTurn: number | null = null;
  let reloadsSeen = reloads;
  const deadline = Date.now() + options.matchMinutes * 60_000;
  for (;;) {
    if (Date.now() > deadline) {
      report.outcome = "TIME_LIMIT";
      return;
    }
    const state = await waitForSettled(connection, 90_000);
    if (reloads !== reloadsSeen) {
      // A new page: its own error log and guard memory.
      reloadsSeen = reloads;
      errorsSeen = 0;
      guardSeen = 0;
    }
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
    // Bead 2yc.98: what the presentation guard survived is a bug.
    const guard = await evaluate<{
      count: number | null;
      failures: unknown[] | null;
      notice: boolean;
    }>(connection, `__HUNT__.guard()`);
    const guardCount = guard.count ?? guard.failures?.length ?? 0;
    if (guardCount > guardSeen || (guard.notice && guardSeen === 0)) {
      const fresh = (guard.failures ?? []).slice(
        -Math.max(1, guardCount - guardSeen),
      );
      guardSeen = Math.max(guardSeen, guardCount, 1);
      report.presentationFailures.push(...fresh);
      report.failures.push(
        `presentation failure${guard.notice ? " (notice shown)" : ""}: ${fresh
          .map((record) => {
            const r = record as Record<string, unknown>;
            return `${String(r.where)} [${String(r.step)}] ${String(r.name)}: ${String(r.message)}`;
          })
          .join(" | ")}`,
      );
      await dumpFailure(
        connection,
        report,
        "presentation-failure",
        consoleLog,
        commandLog,
      );
    }
    // The notice is dismissed the way a player does.
    if (guard.notice)
      await tapIfThere(connection, '[data-action="dismiss-failure-notice"]');
    if (state === null) {
      report.failures.push(
        `freeze: never settled after ${commandLog.at(-1) ?? "launch"}`,
      );
      report.outcome = "FROZEN";
      await dumpFailure(connection, report, "freeze", consoleLog, commandLog);
      return;
    }
    report.rounds = state.round ?? report.rounds;
    if (historyWatch !== null) {
      // The resumed save's history check, replayed by a Web Worker.
      const check = await evaluate<{
        status: string;
        diagnostic: string | null;
      } | null>(connection, `__HUNT__.historyCheck()`);
      if (check === null || check.status === "VERIFIED") {
        if (check !== null) count(report, "history-verified");
        historyWatch = null;
      } else if (
        check.status === "MISMATCH" ||
        (check.status === "UNCHECKED" && check.diagnostic !== null)
      ) {
        report.failures.push(
          `saved history check ${check.status}: ${check.diagnostic ?? ""}`,
        );
        await dumpFailure(
          connection,
          report,
          "history",
          consoleLog,
          commandLog,
        );
        historyWatch = null;
      } else if (check.status !== "PENDING") {
        // NONE: resumed in the same page, from memory (nothing to check).
        if (check.status !== "NONE")
          report.notes.push(`saved history check ${check.status}`);
        else count(report, "resume-in-memory");
        historyWatch = null;
      } else if (Date.now() - historyWatch > 120_000) {
        report.notes.push("saved history check still PENDING after 2 min");
        historyWatch = null;
      }
    }
    if (
      roundAtEndTurn !== null &&
      state.humanTurn &&
      state.round !== null &&
      state.phase === "ACTIVE"
    ) {
      // One End Turn (even a double tap) ends one turn.
      if (state.round > roundAtEndTurn + 1) {
        report.failures.push(
          `a turn was skipped: End Turn in round ${roundAtEndTurn}, next human turn in round ${state.round} (after ${commandLog.slice(-3).join(" | ")})`,
        );
        await dumpFailure(
          connection,
          report,
          "turn-skipped",
          consoleLog,
          commandLog,
        );
      }
      roundAtEndTurn = null;
    }
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
    const glitches = await evaluate<string[]>(
      connection,
      `[...__HUNT__.layout(), ...(document.querySelector('.v7-hud-menu') !== null ? ['match menu left open after Escape and taps'] : [])]`,
    );
    await noteGlitches(
      connection,
      report,
      glitches,
      `round ${String(state.round)}, after ${commandLog.at(-1)?.slice(0, 80) ?? "launch"}`,
    );
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
        const problem = await saveQuitAndResume(connection, report, random);
        report.saveQuits += 1;
        historyWatch = Date.now();
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
    if (options.antics > 0 && random() < options.antics) {
      // Bead 2yc.98: more of the interface between commands.
      const antic = await humanAntic(connection, report, random);
      commandLog.push(`ANTIC ${antic}`);
      if (antic.startsWith("FAILED")) {
        report.failures.push(antic);
        await dumpFailure(connection, report, "antic", consoleLog, commandLog);
      }
      continue;
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
    const double = options.antics > 0 && random() < options.antics * 0.4;
    if (double) count(report, `double-tap:${command.kind}`);
    if (command.kind === "END_TURN") roundAtEndTurn = state.round;
    const how = await perform(connection, command, state, double);
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
      if (
        passed &&
        (report.speed === "FF" ||
          (options.antics > 0 && random() < options.antics * 0.3))
      ) {
        // The fast-forward button, tapped while the rivals play.
        const fast = await waitForExpression(
          connection,
          `__HUNT__.buttonPoint('[data-action="fast-forward"]') !== null`,
          1_500,
        ).then(
          () => true,
          () => false,
        );
        if (fast) {
          await delay(Math.floor(random() * 400));
          if (await tapIfThere(connection, '[data-action="fast-forward"]')) {
            count(report, "fast-forward");
            commandLog.push("FAST_FORWARD");
          }
        }
      }
      if (passed && options.antics > 0 && random() < options.antics) {
        const antic = await aiTurnAntic(connection, report, random);
        commandLog.push(`AI-TURN ANTIC ${antic}`);
      }
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

/** The setup form, filled the way a player does. */
async function launchQuickStart(
  connection: Connection,
  report: MatchReport,
): Promise<void> {
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
}

/** A campaign mission: Campaign, its card, Start mission (taps). */
async function launchMission(
  connection: Connection,
  report: MatchReport,
): Promise<void> {
  const mission = (report.mission ?? "HUMAN_1").toLowerCase();
  await tapButton(connection, '[data-action="campaign"]', 10_000);
  // The campaign map (pulp_wars-hmyk.3): the hunt's missions are the
  // Humans' (the Hollow Frontier was retired by pulp_wars-hmyk.22).
  await tapButton(connection, '[data-action="campaign-open-humans"]', 10_000);
  await tapButton(connection, `[data-action="mission-${mission}"]`, 10_000);
  // A choice of faction: the hunt's own when the mission offers it.
  await evaluate(
    connection,
    `(() => {
      const field = document.querySelector('.v7-briefing select');
      if (!(field instanceof HTMLSelectElement)) return false;
      if (![...field.options].some((option) => option.value === ${JSON.stringify(report.faction)})) return false;
      field.value = ${JSON.stringify(report.faction)};
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  await tapButton(connection, '[data-action="campaign-start"]', 10_000);
}

/** Waits for a visible, enabled button and taps it. */
async function tapButton(
  connection: Connection,
  selector: string,
  timeout: number,
): Promise<void> {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const point = await evaluate<Coord | null>(
      connection,
      `__HUNT__.buttonPoint(${JSON.stringify(selector)})`,
    );
    if (point !== null) {
      await tap(connection, point);
      await delay(250);
      return;
    }
    await delay(100);
  }
  throw new Error(`no button ${selector}`);
}

/** Taps a visible, enabled button now if there is one; reports whether. */
async function tapIfThere(
  connection: Connection,
  selector: string,
): Promise<boolean> {
  const point = await evaluate<Coord | null>(
    connection,
    `__HUNT__.buttonPoint(${JSON.stringify(selector)})`,
  );
  if (point === null) return false;
  await tap(connection, point);
  await delay(200);
  return true;
}

/** Gallery, Settings or About from the main menu, then back. */
async function frontAntic(
  connection: Connection,
  report: MatchReport,
  random: () => number,
): Promise<void> {
  const pick = random();
  const kind = pick < 0.5 ? "gallery" : pick < 0.8 ? "front-settings" : "about";
  count(report, `front:${kind}`);
  if (!(await tapIfThere(connection, `[data-action="${kind}"]`))) return;
  await delay(400);
  if (kind === "gallery") {
    // A few of the gallery's own buttons (filters, entries), then back.
    for (let step = 0; step < 4; step += 1) {
      const loose = await evaluate<(Coord & { action: string })[]>(
        connection,
        `[...document.querySelectorAll('main button, main [role="button"]')].filter((node) => {
          const b = node.getBoundingClientRect();
          const action = node.dataset.action ?? '';
          return b.width > 0 && b.height > 0 && !node.disabled && b.top >= 0 && b.bottom <= innerHeight &&
            !/sound|music|audio|play|back|tribe-stars-reset/.test(action + ' ' + node.className);
        }).map((node) => { const b = node.getBoundingClientRect(); return { action: node.dataset.action ?? node.className, x: b.left + b.width / 2, y: b.top + b.height / 2 }; })`,
      );
      const chosen = loose[Math.floor(random() * loose.length)];
      if (chosen === undefined) break;
      await tap(connection, chosen);
      await delay(300);
      await tapIfThere(connection, '[data-action="gallery-detail-close"]');
    }
    await tapIfThere(connection, '[data-action="gallery-back"]');
  } else if (kind === "front-settings") {
    await setSelect(connection, "v7-ui-scale", random() < 0.5 ? "1.25" : "1");
    await setSelect(connection, "v7-ui-scale", "1");
  }
  await tapIfThere(connection, '[data-action="front-back"]');
  await tapIfThere(connection, '[data-action="gallery-back"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="new-game"]') !== null`,
    10_000,
  );
}

async function setSelect(
  connection: Connection,
  id: string,
  value: string,
): Promise<boolean> {
  return evaluate<boolean>(
    connection,
    `(() => {
      const field = document.querySelector('#' + ${JSON.stringify(id)});
      if (!(field instanceof HTMLSelectElement)) return false;
      if (![...field.options].some((option) => option.value === ${JSON.stringify(value)})) return false;
      field.value = ${JSON.stringify(value)};
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
}

/** Notes each new kind of layout glitch once per match, with a screenshot. */
async function noteGlitches(
  connection: Connection,
  report: MatchReport,
  glitches: readonly string[],
  where: string,
): Promise<void> {
  for (const glitch of glitches) {
    const kind = glitch.replace(/\(.*\)|: .*/, "").trim();
    if (report.glitchKinds.includes(kind)) continue;
    report.glitchKinds.push(kind);
    report.glitches.push(
      `${glitch} [${viewport.name}${landscape ? " landscape" : ""}, ${where}]`,
    );
    await screenshot(
      connection,
      `match-${report.index}-${report.faction}-glitch-${report.glitchKinds.length}`,
    );
  }
}

/** Layout glitches with something open (a menu, a screen, a popover). */
async function checkOpenLayout(
  connection: Connection,
  report: MatchReport,
  where: string,
): Promise<void> {
  const glitches = await evaluate<string[]>(connection, `__HUNT__.layout()`);
  await noteGlitches(connection, report, glitches, where);
}

function count(report: MatchReport, antic: string): void {
  report.antics[antic] = (report.antics[antic] ?? 0) + 1;
}

function weighted<T extends string>(
  random: () => number,
  table: readonly (readonly [T, number])[],
): T {
  const total = table.reduce((sum, [, weight]) => sum + weight, 0);
  let pick = random() * total;
  for (const [name, weight] of table) {
    pick -= weight;
    if (pick <= 0) return name;
  }
  return (table[0] as readonly [T, number])[0];
}

/** Closes what is open (popover, dialog, overlay) the way a player does. */
async function closeEverything(connection: Connection): Promise<void> {
  for (let close = 0; close < 4; close += 1) {
    const shut = await evaluate<Coord | null>(
      connection,
      `__HUNT__.overlayClose()`,
    );
    const open = await evaluate<boolean>(
      connection,
      `document.querySelector('[data-v7-region="hud"]') === null || document.querySelector('.v7-status-popover') !== null || document.querySelector('.v7-hud-menu') !== null`,
    );
    if (shut !== null) await tap(connection, shut);
    else if (open) await pressEscape(connection);
    else break;
    await delay(200);
  }
}

/** One of the match screen's other controls, between commands. */
async function humanAntic(
  connection: Connection,
  report: MatchReport,
  random: () => number,
): Promise<string> {
  const kind = weighted(random, [
    ["tech", 3],
    ["card", 3],
    ["menu", 2],
    ["settings", 1],
    ["rotate", 1],
    ["background", 1],
    ["pinch", 1],
    ["double-tap-unit", 1],
  ] as const);
  count(report, kind);
  switch (kind) {
    case "tech": {
      if (!(await tapIfThere(connection, '[data-action="tech"]')))
        return "tech (no button)";
      await delay(400);
      await checkOpenLayout(connection, report, "tech screen open");
      if (random() < 0.3) {
        const zoom = await evaluate<(Coord & { action: string })[]>(
          connection,
          `__HUNT__.buttonsIn('[data-action^="tech-zoom"], [data-action="tech-fit"]')`,
        );
        const chosen = zoom[Math.floor(random() * zoom.length)];
        if (chosen !== undefined) await tap(connection, chosen);
        await delay(200);
      }
      const cards = await evaluate<(Coord & { action: string })[]>(
        connection,
        `__HUNT__.buttonsIn('.v7-tech-card')`,
      );
      const card = cards[Math.floor(random() * cards.length)];
      let researched = "";
      if (card !== undefined) {
        await tap(connection, card);
        await delay(300);
        if (random() < 0.6) {
          const research = await evaluate<(Coord & { action: string })[]>(
            connection,
            `__HUNT__.buttonsIn('.v7-tech-detail [data-action^="research-"]')`,
          );
          const first = research[0];
          if (first !== undefined) {
            await tap(connection, first);
            researched = ` research ${first.action}`;
            await delay(500);
          }
        }
      }
      await closeEverything(connection);
      return `tech ${card?.action ?? "-"}${researched}`;
    }
    case "card": {
      const point = await evaluate<Coord | null>(
        connection,
        `__HUNT__.ownUnitPoint(${random()})`,
      );
      if (point === null) return "card (no unit on screen)";
      await tap(connection, point);
      await delay(250);
      const chips = await evaluate<(Coord & { action: string })[]>(
        connection,
        `__HUNT__.buttonsIn('.v7-unit-status-cues [role="button"]')`,
      );
      const chip = chips[Math.floor(random() * chips.length)];
      if (chip !== undefined) {
        await tap(connection, chip);
        await delay(250);
        await checkOpenLayout(connection, report, `chip ${chip.action} open`);
        // Closed by its chip again or by a tap on the board.
        if (random() < 0.5) await tap(connection, chip);
        else {
          const tile = await evaluate<Coord | null>(
            connection,
            `__HUNT__.randomTilePoint(${random()})`,
          );
          if (tile !== null) await tap(connection, tile);
        }
        await delay(200);
      }
      let help = "";
      if (random() < 0.6) {
        await tap(connection, point);
        await delay(200);
        if (
          (await tapIfThere(connection, '[data-action="unit-help"]')) ||
          (await tapIfThere(connection, '[data-action="dock-details"]'))
        ) {
          help = " ?";
          await delay(300);
          await checkOpenLayout(connection, report, "unit details open");
        }
      }
      await closeEverything(connection);
      return `card ${chip?.action ?? "-"}${help}`;
    }
    case "menu": {
      if (!(await tapIfThere(connection, '[data-action="compact-menu"]')))
        return "menu (no button)";
      const screen = weighted(random, [
        ["leaderboard", 1],
        ["achievements", 1],
        ["help", 1],
        ["none", 1],
      ] as const);
      if (screen === "none") {
        await tapIfThere(connection, '[data-action="compact-menu"]');
        return "menu open+close";
      }
      await checkOpenLayout(connection, report, "match menu open");
      await tapIfThere(connection, `[data-action="${screen}"]`);
      await delay(400);
      await checkOpenLayout(connection, report, `menu ${screen} open`);
      await closeEverything(connection);
      return `menu ${screen}`;
    }
    case "settings": {
      if (!(await tapIfThere(connection, '[data-action="compact-menu"]')))
        return "settings (no menu)";
      if (!(await tapIfThere(connection, '[data-action="settings"]'))) {
        // The item is off while a choice is up: the menu is shut again.
        await closeEverything(connection);
        return "settings (no item)";
      }
      await delay(300);
      // Speed, motion, UI size or contrast changed, looked at, put back.
      const change = weighted(random, [
        ["v7-animation-speed", 2],
        ["v7-motion", 2],
        ["v7-ui-scale", 2],
        ["high-contrast", 1],
      ] as const);
      const speed = report.speed === "NORMAL" ? "NORMAL" : "FAST";
      if (change === "high-contrast") {
        await tapIfThere(connection, '[data-action="high-contrast"]');
        await delay(200);
        await tapIfThere(connection, '[data-action="high-contrast"]');
      } else if (change === "v7-ui-scale") {
        const scale = random() < 0.5 ? "1.5" : "2";
        await setSelect(connection, change, scale);
        await delay(400);
        // The UI at that size, with the match behind it.
        await closeEverything(connection);
        await delay(300);
        const glitches = await evaluate<string[]>(
          connection,
          `__HUNT__.layout()`,
        );
        if (glitches.length > 0) {
          report.glitches.push(
            `UI size ${scale}: ${glitches.join("; ")} [${viewport.name}]`,
          );
          await screenshot(
            connection,
            `match-${report.index}-${report.faction}-ui-scale-${scale}`,
          );
        }
        await tapIfThere(connection, '[data-action="compact-menu"]');
        await tapIfThere(connection, '[data-action="settings"]');
        await delay(300);
        await setSelect(connection, change, "1");
      } else {
        const other =
          change === "v7-motion"
            ? report.motion === "FULL"
              ? "REDUCED"
              : "FULL"
            : speed === "FAST"
              ? "NORMAL"
              : "FAST";
        await setSelect(connection, change, other);
        await delay(300);
        await setSelect(
          connection,
          change,
          change === "v7-motion" ? report.motion : speed,
        );
      }
      await delay(200);
      await closeEverything(connection);
      return `settings ${change}`;
    }
    case "rotate": {
      landscape = !landscape;
      await applyViewport(connection);
      await delay(600);
      return `rotate ${landscape ? "landscape" : "portrait"}`;
    }
    case "background": {
      const hold = 600 + Math.floor(random() * 2400);
      await background(connection, hold, random() < 0.3);
      return `background ${hold} ms`;
    }
    case "pinch": {
      const centre = await evaluate<Coord | null>(
        connection,
        `__HUNT__.boardCentre()`,
      );
      if (centre === null) return "pinch (no board)";
      const outward = random() < 0.5;
      await pinch(connection, centre, outward);
      await delay(250);
      const problem = await checkSwipe(connection, null);
      return problem === null
        ? `pinch ${outward ? "out" : "in"}`
        : `FAILED swipe after a pinch: ${problem}`;
    }
    case "double-tap-unit": {
      const point = await evaluate<Coord | null>(
        connection,
        `__HUNT__.ownUnitPoint(${random()})`,
      );
      if (point === null) return "double tap (no unit)";
      await doubleTap(connection, point);
      await delay(250);
      await closeEverything(connection);
      return "double tap a unit";
    }
  }
  return kind;
}

/** What an impatient player does while the rivals play. */
async function aiTurnAntic(
  connection: Connection,
  report: MatchReport,
  random: () => number,
): Promise<string> {
  const kind = weighted(random, [
    ["taps", 3],
    ["menu", 2],
    ["unit", 2],
    ["rotate", 1],
    ["background", 2],
    ["pinch", 1],
    ["tech", 1],
  ] as const);
  count(report, `ai-turn:${kind}`);
  await delay(Math.floor(random() * 500));
  switch (kind) {
    case "taps": {
      for (let index = 0; index < 5; index += 1) {
        const point = await evaluate<Coord | null>(
          connection,
          `__HUNT__.randomTilePoint(${random()})`,
        );
        if (point !== null) await tap(connection, point);
        await delay(60);
      }
      return "taps";
    }
    case "menu": {
      await tapIfThere(connection, '[data-action="compact-menu"]');
      await delay(300 + Math.floor(random() * 600));
      if (random() < 0.4) {
        await tapIfThere(connection, '[data-action="help"]');
        await delay(400);
      }
      await closeEverything(connection);
      return "menu";
    }
    case "unit": {
      const point = await evaluate<Coord | null>(
        connection,
        `__HUNT__.ownUnitPoint(${random()})`,
      );
      if (point !== null) {
        await tap(connection, point);
        await delay(200);
        const chips = await evaluate<(Coord & { action: string })[]>(
          connection,
          `__HUNT__.buttonsIn('.v7-unit-status-cues [role="button"]')`,
        );
        const chip = chips[0];
        if (chip !== undefined) await tap(connection, chip);
      }
      await delay(300);
      await closeEverything(connection);
      return "unit";
    }
    case "rotate": {
      landscape = !landscape;
      await applyViewport(connection);
      return `rotate ${landscape ? "landscape" : "portrait"}`;
    }
    case "background": {
      const hold = 800 + Math.floor(random() * 4000);
      await background(connection, hold, random() < 0.3);
      return `background ${hold} ms`;
    }
    case "pinch": {
      const centre = await evaluate<Coord | null>(
        connection,
        `__HUNT__.boardCentre()`,
      );
      if (centre !== null) await pinch(connection, centre, random() < 0.5);
      return "pinch";
    }
    case "tech": {
      await tapIfThere(connection, '[data-action="tech"]');
      await delay(500);
      await closeEverything(connection);
      return "tech";
    }
  }
  return kind;
}

/**
 * The page sent to the background for `hold` ms, as a phone does when the
 * player switches apps: another tab comes to the front, so the game's page
 * is really hidden (visibilitychange, no animation frames), then it comes
 * back. Now and then a page-only pagehide/pageshow pair is added.
 */
async function background(
  connection: Connection,
  hold: number,
  withPageHide = false,
): Promise<void> {
  if (withPageHide) await evaluate(connection, `__HUNT__.setHidden(true)`);
  const created = (await connection.send("Target.createTarget", {
    url: "about:blank",
  })) as { targetId: string };
  await delay(hold);
  await connection.send("Page.bringToFront");
  await connection
    .send("Target.closeTarget", { targetId: created.targetId })
    .catch(() => undefined);
  if (withPageHide) await evaluate(connection, `__HUNT__.setHidden(false)`);
  await delay(200);
}

async function screenshot(connection: Connection, name: string): Promise<void> {
  try {
    const shot = (await connection.send("Page.captureScreenshot", {
      format: "png",
    })) as { data: string };
    await writeFile(
      path.join(options.out, `${name}.png`),
      Buffer.from(shot.data, "base64"),
    );
  } catch {
    // Evidence, not a requirement.
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
  double = false,
): Promise<"TAP" | "DOCK" | "END_TURN_BUTTON"> {
  const before = state.commandIndex ?? 0;
  if (command.kind === "END_TURN") {
    const point = await evaluate<Coord | null>(
      connection,
      `__HUNT__.buttonPoint('[data-action="end-turn"]')`,
    );
    if (point !== null) {
      if (double) await doubleTap(connection, point);
      else await tap(connection, point);
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
        if (double) await doubleTap(connection, toPoint);
        else await tap(connection, toPoint);
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
  report: MatchReport,
  random: () => number,
): Promise<string | null> {
  const menu = await evaluate<Coord | null>(
    connection,
    `__HUNT__.buttonPoint('[data-action="compact-menu"]')`,
  );
  if (menu === null) return "no menu button";
  // A menu still open (a press outside closes it since bead 2yc.98) is
  // used as it is; the toggle would close it.
  if (
    !(await evaluate<boolean>(
      connection,
      `document.querySelector('.v7-hud-menu') !== null`,
    ))
  )
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
  if (random() < 0.5) {
    // Bead 2yc.98: the tab closed and opened again (a phone drops a
    // background tab), so Continue takes the fast-resume path of bead
    // 2yc.95 and its background history check.
    const url = new URL(options.base);
    url.searchParams.set("browser-smoke", "1");
    url.searchParams.set("dev", "1");
    url.searchParams.set(
      "hunt-speed",
      report.speed === "NORMAL" ? "NORMAL" : "FAST",
    );
    url.searchParams.set("hunt-motion", report.motion);
    url.hash = "keep-save";
    await connection.send("Page.navigate", { url: url.href });
    await waitForExpression(
      connection,
      `globalThis.__PULP_WARS_APP__?.view?.dispatchForReview !== undefined && document.querySelector('[data-action="resume"]') !== null`,
      120_000,
    );
    await evaluate(connection, HELPERS);
    reloads += 1;
    count(report, "reload-resume");
  }
  // Bead 2yc.98: the Gallery, Settings or About before Continue.
  if (random() < Math.max(options.front, 0.3))
    await frontAntic(connection, report, random);
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
    const inputs = await evaluate<string[]>(
      connection,
      `globalThis.__HUNT_INPUTS__ ?? []`,
    );
    await writeFile(
      `${stem}-log.json`,
      `${JSON.stringify({ report, state, errors, inputs, commandLog, consoleLog }, null, 2)}\n`,
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

/** The viewport now (and its turn when `landscape`), touch or mouse. */
async function applyViewport(connection: Connection): Promise<void> {
  // A phone or tablet turns; a desktop window is made smaller.
  const wide = landscape && viewport.touch;
  const narrow = landscape && !viewport.touch;
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: wide ? viewport.height : narrow ? 1024 : viewport.width,
    height: wide ? viewport.width : narrow ? 700 : viewport.height,
    deviceScaleFactor: viewport.scale,
    mobile: viewport.touch,
    screenOrientation: wide
      ? { type: "landscapePrimary", angle: 90 }
      : { type: "portraitPrimary", angle: 0 },
  });
  await connection.send("Emulation.setTouchEmulationEnabled", {
    enabled: viewport.touch,
    maxTouchPoints: 5,
  });
  await connection.send("Emulation.setUserAgentOverride", {
    userAgent: viewport.userAgent,
    platform: viewport.platform,
  });
}

async function tap(connection: Connection, point: Coord): Promise<void> {
  if (!viewport.touch) {
    await mouse(connection, "mouseMoved", point, 0);
    await mouse(connection, "mousePressed", point, 1);
    await delay(30);
    await mouse(connection, "mouseReleased", point, 0);
    return;
  }
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

async function mouse(
  connection: Connection,
  type: "mouseMoved" | "mousePressed" | "mouseReleased",
  point: Coord,
  buttons: number,
): Promise<void> {
  await connection.send("Input.dispatchMouseEvent", {
    type,
    x: point.x,
    y: point.y,
    button: type === "mouseMoved" && buttons === 0 ? "none" : "left",
    buttons,
    clickCount: type === "mouseMoved" ? 0 : 1,
  });
}

/** Two quick taps on one place (a double tap; or a double click). */
async function doubleTap(connection: Connection, point: Coord): Promise<void> {
  await tap(connection, point);
  await delay(40);
  await tap(connection, point);
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
  const steps = 6;
  if (!viewport.touch) {
    await mouse(connection, "mouseMoved", from, 0);
    await mouse(connection, "mousePressed", from, 1);
    for (let step = 1; step <= steps; step += 1) {
      await delay(16);
      await mouse(
        connection,
        "mouseMoved",
        {
          x: from.x + ((to.x - from.x) * step) / steps,
          y: from.y + ((to.y - from.y) * step) / steps,
        },
        1,
      );
    }
    await mouse(connection, "mouseReleased", to, 0);
    return;
  }
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: from.x, y: from.y }],
  });
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

/** A two-finger pinch about `centre` (or a mouse wheel on a desktop). */
async function pinch(
  connection: Connection,
  centre: Coord,
  outward: boolean,
): Promise<void> {
  if (!viewport.touch) {
    await connection.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: centre.x,
      y: centre.y,
      deltaX: 0,
      deltaY: outward ? -240 : 240,
    });
    return;
  }
  const from = outward ? 30 : 110;
  const to = outward ? 110 : 30;
  const steps = 8;
  const points = (gap: number) => [
    { x: centre.x - gap / 2, y: centre.y, id: 0 },
    { x: centre.x + gap / 2, y: centre.y, id: 1 },
  ];
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: points(from),
  });
  for (let step = 1; step <= steps; step += 1) {
    await delay(16);
    await connection.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: points(from + ((to - from) * step) / steps),
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
  readonly viewports: readonly string[];
  readonly speeds: readonly string[];
  readonly motions: readonly string[];
  readonly antics: number;
  readonly campaignEvery: number;
  readonly front: number;
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
    viewports: list("viewports", ["phone"]).filter(
      (name) => VIEWPORTS[name] !== undefined,
    ),
    speeds: list("speeds", [
      value("speed") === "NORMAL" ? "NORMAL" : "FAST",
    ]).filter((name) => ["NORMAL", "FAST", "FF"].includes(name)),
    motions: list("motions", [
      value("motion") === "REDUCED" ? "REDUCED" : "FULL",
    ]).filter((name) => ["FULL", "REDUCED"].includes(name)),
    antics: Number(value("antics") ?? 0),
    campaignEvery: Number(value("campaign-every") ?? 0),
    front: Number(value("front") ?? 0),
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
        // A reply that never comes is a harness error, not a silent hang.
        const timer = setTimeout(() => {
          if (!pending.has(id)) return;
          pending.delete(id);
          reject(new Error(`${method}: no reply in 120 s`));
        }, 120_000);
        pending.set(id, {
          method,
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        });
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
