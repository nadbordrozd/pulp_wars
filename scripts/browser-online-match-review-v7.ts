import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

/**
 * Online match browser check (bead pulp_wars-eqc6.3). Two tabs of one
 * headless Chrome (muted, the game's sound and music off) play each other
 * on the two-tab local transport of the development server, with no
 * network. Only hand-made commands are played, and only a few rounds:
 *
 * 1. Two humans, no AI: the host hosts, the guest joins by the link, the
 *    host starts; whoever opens researches a technology from the tree,
 *    then each ends turns for at most three rounds. Captured: my turn, the
 *    "is moving…" line on the other side (desktop and phone).
 * 2. The guest's tab reloads mid-game and resumes.
 * 3. The host forfeits (Forfeit, `pulp_wars-eqc6.5`): the guest sees
 *    Victory, "Ada forfeited.".
 * 4. Two humans and one AI seat: the humans end their turns and the
 *    host's tab plays the AI seat (at most two AI turns); the guest sees
 *    "AI 1 is moving…" and the AI's moves played back. The host forfeits.
 * 5. The end screen, Victory and Defeat, of a hand-built finished game
 *    (`openOnlineMatchForReview`; no match is played to its end).
 *
 * `--forfeit-history` (beads pulp_wars-eqc6.4 to eqc6.6) runs only this,
 * instead: two humans, at most two rounds of End turn; the Leaderboard
 * with the players' names; the side whose turn it is not forfeits (the
 * question, then Defeat on its side and Victory on the other); then both
 * tabs open Play online's Match history.
 *
 * Usage: tsx scripts/browser-online-match-review-v7.ts http://localhost:6173/
 *   [--output-dir=<dir>] [--forfeit-history]
 * `CHROME_PATH` names the browser (the macOS Chrome by default).
 */

interface DebugTarget {
  readonly id: string;
  readonly type: string;
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

const args = process.argv.slice(2);
const base = args.find((argument) => !argument.startsWith("--"));
if (base === undefined) throw new Error("Pass the dev server's address.");
const outputDirectory =
  args
    .find((argument) => argument.startsWith("--output-dir="))
    ?.slice("--output-dir=".length) ??
  (await mkdtemp(path.join(tmpdir(), "pulp-wars-online-match-")));
await mkdir(outputDirectory, { recursive: true });
const chrome =
  process.env.CHROME_PATH ??
  [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].find((candidate) => existsSync(candidate)) ??
  "google-chrome";
const port = 11_320 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-online-match-"));
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--mute-audio",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "--window-size=1280,800",
    "about:blank",
  ],
  { stdio: "ignore" },
);
const errors: string[] = [];
const shots: string[] = [];
const notes: string[] = [];

const DESKTOP = { width: 1280, height: 800, mobile: false, scale: 1 };
const PHONE = { width: 390, height: 844, mobile: true, scale: 2 };

const HUD = `!!document.querySelector('[data-v7-region="hud"] .v7-turn-status')`;
const MY_TURN = `!!document.querySelector('[data-action="end-turn"]:not(:disabled)')`;
const STATUS = `document.querySelector('.v7-turn-status')?.textContent ?? ''`;

try {
  await waitForTarget();
  const host = await openTab();
  await host.send("Page.navigate", { url: base });
  await waitFor(host, "document.readyState === 'complete'");
  await evaluate(
    host,
    `localStorage.clear();
     localStorage.setItem('pulpWars.audio.v1', JSON.stringify({ enabled: false, volume: 0 }));
     localStorage.setItem('pulpWars.music.v1', JSON.stringify({ enabled: false, volume: 0 }));
     localStorage.setItem('pulpWars.online.name.v1', 'Ada');
     sessionStorage.clear();`,
  );
  await reload(host);
  await setSize(host, DESKTOP);

  if (args.includes("--forfeit-history")) {
    await forfeitAndHistory(host);
    const summary = { shots, notes, errors };
    await writeFile(
      path.join(outputDirectory, "summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
    );
    console.log(JSON.stringify(summary, null, 2));
    // Done: close Chrome here, since nothing after this runs.
    browser.kill();
    await delay(300);
    await rm(userData, { recursive: true, force: true }).catch(() => undefined);
    process.exit(errors.length > 0 ? 1 : 0);
  }

  let guest: Connection | undefined;
  if (!args.includes("--only-ai")) guest = await twoHumans(host);

  // 4. One AI seat, driven by the host's tab.
  await evaluate(
    host,
    `localStorage.setItem('pulpWars.online.name.v1', 'Ada')`,
  );
  guest = (await hostAndJoin(host, 1, guest)).guest;
  let aiTurns = 0;
  let aiShot = false;
  const lines = new Set<string>();
  // The host's tab thinks slowly, so the AI's turn lasts long enough to be
  // seen (an AI's moves in the fog play back at once).
  await host.send("Emulation.setCPUThrottlingRate", { rate: 40 });
  for (let step = 0; step < 6 && aiTurns < 2; step += 1) {
    if (await isMyTurn(host)) {
      await front(host);
      await click(host, "end-turn");
    } else if (await isMyTurn(guest)) {
      await front(guest);
      await click(guest, "end-turn");
    }
    // Watch the guest's line until a human can move again.
    await front(guest);
    let sawAi = false;
    for (let poll = 0; poll < 300; poll += 1) {
      const line = (await evaluate(guest, STATUS)) as string;
      lines.add(line);
      if (line.startsWith("AI 1")) {
        sawAi = true;
        if (!aiShot) {
          aiShot = true;
          await capture(guest, "12-ai-moving-guest-desktop");
          await setSize(guest, PHONE);
          await capture(guest, "14-ai-moving-guest-phone");
          await setSize(guest, DESKTOP);
          await front(host);
          await capture(host, "13-ai-moving-host-desktop");
          await front(guest);
        }
      }
      if ((await isMyTurn(host)) || (await isMyTurn(guest))) break;
      await delay(50);
    }
    if (sawAi) aiTurns += 1;
    const where = `[document.querySelector('.v7-hud-round')?.textContent, document.querySelector('.v7-turn-strip-count')?.textContent, document.querySelector('.v7-turn-status')?.textContent].join(' | ')`;
    notes.push(
      `AI step ${step}: host ${(await evaluate(host, where)) as string}; guest ${(await evaluate(guest, where)) as string}`,
    );
  }
  await host.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  notes.push(`AI turns seen on the guest: ${aiTurns}`);
  notes.push(`guest lines: ${[...lines].join(" / ")}`);
  await forfeit(host);
  await front(guest);
  await waitFor(
    guest,
    `!!document.querySelector('[data-v7-region="online-result"][data-forfeit="true"]')`,
    200,
  );
  await click(guest, "results-menu");

  // 5. The end screen of a hand-built finished game.
  await front(host);
  for (const [winner, name] of [
    [1, "victory"],
    [2, "defeat"],
  ] as const) {
    await openFinished(host, winner);
    await waitFor(
      host,
      `!!document.querySelector('[data-v7-region="results"]')`,
      200,
    );
    await capture(host, `15-end-${name}-desktop`);
    await setSize(host, PHONE);
    await capture(host, `16-end-${name}-phone`);
    await setSize(host, DESKTOP);
    await click(host, "results-menu");
    await waitFor(host, `!!document.querySelector('.v7-main-menu')`);
  }

  const summary = { shots, notes, errors };
  await writeFile(
    path.join(outputDirectory, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
  );
  console.log(JSON.stringify(summary, null, 2));
  if (errors.length > 0) process.exitCode = 1;
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true }).catch(() => undefined);
}

// ---------------------------------------------------------------------

/** Steps 1 to 3: two humans, a few rounds, a reload, the host leaves. */
async function twoHumans(host: Connection): Promise<Connection> {
  // 1. Two humans, no AI.
  const first = await hostAndJoin(host, 0);
  const guest = first.guest;
  const [mover, other] = (await isMyTurn(host)) ? [host, guest] : [guest, host];
  await front(mover);
  await capture(mover, "01-my-turn-desktop");
  await research(mover);
  await capture(mover, "02-my-turn-after-research-desktop");
  await front(other);
  await capture(other, "03-opponent-moving-desktop");
  await setSize(other, PHONE);
  await capture(other, "04-opponent-moving-phone");
  await setSize(other, DESKTOP);
  // Up to three rounds of End turn, each side in turn.
  for (let turn = 0; turn < 5; turn += 1) {
    const tab = (await isMyTurn(host)) ? host : guest;
    const waiting = tab === host ? guest : host;
    await front(tab);
    await click(tab, "end-turn");
    await front(waiting);
    await waitFor(waiting, MY_TURN, 200);
    notes.push(
      `turn ${turn + 1}: ${tab === host ? "host" : "guest"} ended; now ${(await evaluate(waiting, STATUS)) as string}`,
    );
    if (turn === 0) {
      await capture(waiting, "05-your-turn-cue-desktop");
      await front(tab);
      await capture(tab, "06-other-side-moving-desktop");
      await setSize(tab, PHONE);
      await capture(tab, "07-other-side-moving-phone");
      await setSize(tab, DESKTOP);
    }
  }

  // 2. The guest's tab reloads and resumes.
  const before = (await evaluate(guest, STATUS)) as string;
  await front(guest);
  await reload(guest);
  await waitFor(guest, HUD, 300);
  await delay(800);
  notes.push(
    `guest reload: before "${before}", after "${(await evaluate(guest, STATUS)) as string}"`,
  );
  await capture(guest, "08-guest-resumed-after-reload-desktop");
  await setSize(guest, PHONE);
  await capture(guest, "09-guest-resumed-after-reload-phone");
  await setSize(guest, DESKTOP);

  // 3. The host forfeits; the guest wins.
  await forfeit(host);
  await front(guest);
  await waitFor(
    guest,
    `!!document.querySelector('[data-v7-region="online-result"][data-forfeit="true"]')`,
    200,
  );
  await capture(guest, "10-opponent-forfeited-desktop");
  await setSize(guest, PHONE);
  await capture(guest, "11-opponent-forfeited-phone");
  await setSize(guest, DESKTOP);
  await click(guest, "results-menu");
  await waitFor(guest, `!!document.querySelector('.v7-main-menu')`);

  return guest;
}

/**
 * `--forfeit-history`: names, a forfeit off-turn, both end screens, both
 * match histories. At most two rounds of End turn are played.
 */
async function forfeitAndHistory(host: Connection): Promise<void> {
  const { guest } = await hostAndJoin(host, 0);
  // Two rounds at most: each side ends its turn twice.
  for (let turn = 0; turn < 3; turn += 1) {
    const tab = (await isMyTurn(host)) ? host : guest;
    const waiting = tab === host ? guest : host;
    await front(tab);
    await click(tab, "end-turn");
    await front(waiting);
    await waitFor(waiting, MY_TURN, 200);
    notes.push(
      `turn ${turn + 1}: ${tab === host ? "host" : "guest"} ended; now ${(await evaluate(waiting, STATUS)) as string}`,
    );
  }
  const mover = (await isMyTurn(host)) ? host : guest;
  const other = mover === host ? guest : host;
  notes.push(`to move: ${mover === host ? "host (Ada)" : "guest (Bob)"}`);
  // The players' lists name the people (pulp_wars-eqc6.4).
  await front(mover);
  await click(mover, "compact-menu");
  await click(mover, "leaderboard");
  await capture(mover, "20-leaderboard-names-desktop");
  await setSize(mover, PHONE);
  await capture(mover, "21-leaderboard-names-phone");
  await setSize(mover, DESKTOP);
  notes.push(
    `leaderboard: ${(await evaluate(mover, `[...document.querySelectorAll('.v7-leaderboard-player')].map((node) => node.textContent).join(', ')`)) as string}`,
  );
  await evaluate(
    mover,
    `document.querySelector('[data-action="close-overlay"]')?.click()`,
  );
  await delay(300);
  // The side whose turn it is not forfeits (pulp_wars-eqc6.5).
  await front(other);
  await waitFor(other, `(${STATUS}).endsWith('is moving…')`, 100);
  await click(other, "compact-menu");
  await capture(other, "22-menu-forfeit-desktop");
  await click(other, "forfeit-online");
  await capture(other, "23-forfeit-question-desktop");
  await setSize(other, PHONE);
  await capture(other, "24-forfeit-question-phone");
  await setSize(other, DESKTOP);
  await click(other, "online-forfeit");
  await waitFor(
    other,
    `!!document.querySelector('[data-v7-region="results"]')`,
    200,
  );
  await capture(other, "25-forfeiter-defeat-desktop");
  await setSize(other, PHONE);
  await capture(other, "26-forfeiter-defeat-phone");
  await setSize(other, DESKTOP);
  await front(mover);
  await waitFor(
    mover,
    `!!document.querySelector('[data-v7-region="results"]')`,
    200,
  );
  await delay(1500);
  await capture(mover, "27-winner-victory-desktop");
  await setSize(mover, PHONE);
  await capture(mover, "28-winner-victory-phone");
  await setSize(mover, DESKTOP);
  for (const [tab, name] of [
    [other, "forfeiter"],
    [mover, "winner"],
  ] as const)
    notes.push(
      `${name}: ${(await evaluate(tab, `document.querySelector('[data-v7-region="results"] h2')?.textContent + ' / ' + document.querySelector('[data-v7-region="online-result"]')?.textContent`)) as string}`,
    );
  // Both tabs: the menu, then Play online's Match history (eqc6.6).
  let index = 29;
  for (const [tab, name] of [
    [other, "forfeiter"],
    [mover, "winner"],
  ] as const) {
    await front(tab);
    await click(tab, "results-menu");
    await waitFor(tab, `!!document.querySelector('.v7-main-menu')`, 200);
    await click(tab, "play-online");
    await waitFor(
      tab,
      `!!document.querySelector('[data-v7-region="online-history"] .v7-online-history-row')`,
      200,
    );
    await capture(tab, `${index}-history-${name}-desktop`);
    await setSize(tab, PHONE);
    await capture(tab, `${index + 1}-history-${name}-phone`, true);
    await setSize(tab, DESKTOP);
    index += 2;
    notes.push(
      `${name} history: ${(await evaluate(tab, `document.querySelector('[data-v7-region="online-history"]')?.innerText.replace(/\\s+/g, ' ')`)) as string}`,
    );
  }
}

/** Hosts a lobby with `aiSeats`, joins it in the guest tab, starts. */
async function hostAndJoin(
  host: Connection,
  aiSeats: number,
  existingGuest?: Connection,
): Promise<{ readonly guest: Connection }> {
  await front(host);
  await click(host, "play-online");
  await waitFor(
    host,
    `document.querySelector('.v7-online')?.dataset.screen === 'home'`,
  );
  await click(host, "online-host");
  await waitFor(
    host,
    `document.querySelector('.v7-online')?.dataset.screen === 'lobby'`,
  );
  if (aiSeats > 0) {
    await click(host, "online-settings");
    await click(host, `online-ai-${aiSeats}`);
  }
  const link = (await evaluate(
    host,
    `document.querySelector('.v7-online-link').dataset.link`,
  )) as string;
  // The guest's name is its own (the storage is shared by the tabs).
  await evaluate(host, `localStorage.removeItem('pulpWars.online.name.v1')`);
  const guest = existingGuest ?? (await openTab());
  await setSize(guest, DESKTOP);
  await front(guest);
  await guest.send("Page.navigate", { url: link });
  await waitFor(
    guest,
    `document.querySelector('.v7-online')?.dataset.screen === 'preview'`,
    200,
  );
  await evaluate(
    guest,
    `(() => { const field = document.querySelector('#v7-online-name'); if (field) { field.value = 'Bob'; field.dispatchEvent(new Event('input', { bubbles: true })); } })()`,
  );
  await click(guest, "online-join-lobby");
  await waitFor(
    guest,
    `document.querySelector('.v7-online')?.dataset.screen === 'lobby'`,
  );
  await front(host);
  await waitFor(
    host,
    `!document.querySelector('[data-action="online-start"]')?.disabled`,
    100,
  );
  await click(host, "online-start");
  await waitFor(host, HUD, 300);
  await front(guest);
  await waitFor(guest, HUD, 300);
  // Whoever opens can move once the board has its art.
  for (let attempt = 0; attempt < 300; attempt += 1) {
    if ((await isMyTurn(host)) || (await isMyTurn(guest))) break;
    await delay(100);
  }
  return { guest };
}

async function isMyTurn(connection: Connection): Promise<boolean> {
  return (await evaluate(connection, MY_TURN)) === true;
}

/** Researches the first technology the tree offers, if any. */
async function research(connection: Connection): Promise<void> {
  await click(connection, "tech");
  await delay(300);
  const done = await evaluate(
    connection,
    `(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const nodes = [...document.querySelectorAll('[data-v7-region="overlay-tech"] [data-action^="tech-"]')];
      for (const node of nodes) {
        node.click();
        await wait(150);
        const go = document.querySelector('[data-action^="research-"]:not(:disabled)');
        if (go) { const name = go.dataset.action; go.click(); return name; }
      }
      return null;
    })()`,
  );
  notes.push(`research: ${String(done)}`);
  await delay(600);
  await evaluate(
    connection,
    `document.querySelector('[data-action="close-overlay"]')?.click()`,
  );
  await delay(300);
}

/** Forfeit, after its question; then back to the menu from the Defeat. */
async function forfeit(connection: Connection): Promise<void> {
  await front(connection);
  await click(connection, "compact-menu");
  await click(connection, "forfeit-online");
  await capture(connection, `forfeit-question-${shots.length}`);
  await click(connection, "online-forfeit");
  await waitFor(
    connection,
    `!!document.querySelector('[data-v7-region="results"]')`,
    200,
  );
  await click(connection, "results-menu");
  await waitFor(connection, `!!document.querySelector('.v7-main-menu')`, 200);
}

/** A finished game, hand-built, shown through the review hook. */
async function openFinished(
  connection: Connection,
  winnerId: number,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const { OnlineMatchControllerV7 } = await import('/src/app/online-match-controller-v7.ts');
      const { buildOnlineSetupV7, defaultOnlineOptionsV7 } = await import('/src/online/match.ts');
      const { createPlayableGameV7 } = await import('/src/engine/v7/reducer.ts');
      const built = buildOnlineSetupV7({ ...defaultOnlineOptionsV7(4242, 1), mapType: 'DRY_LAND', width: 11 }, 'ORIGINAL', 'GOBLIN');
      if (!built.ok) throw new Error(built.code);
      const created = createPlayableGameV7(built.setup);
      if (!created.ok) throw new Error(created.error.code);
      const state = { ...created.state, round: 14, outcome: { kind: 'VICTORY', winnerId: ${winnerId} } };
      const client = {
        code: 'REVEW', uid: 'review', setup: state.setup, state, mySeat: 0,
        match: { status: 'FINISHED', seats: [{ seat: 0, name: 'Ada' }, { seat: 1, name: 'Bob' }] },
        desynced: false, forfeitedBy: null, pendingMoves: 0, canAct: false, aiTurn: false, activeSeat: 0,
        on: () => () => {}, start: () => {}, stop: () => {},
      };
      globalThis.__PULP_WARS_APP__.view.openOnlineMatchForReview(new OnlineMatchControllerV7({ client }));
      return true;
    })()`,
  );
}

async function front(connection: Connection): Promise<void> {
  await connection.send("Page.bringToFront");
  await delay(150);
}

async function openTab(): Promise<Connection> {
  const created = await fetch(`http://localhost:${port}/json/new?about:blank`, {
    method: "PUT",
  });
  const target = (await created.json()) as DebugTarget;
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params).slice(0, 600));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  return connection;
}

async function reload(connection: Connection): Promise<void> {
  await evaluate(connection, `globalThis.__ONLINE_REVIEW_PRIOR__ = true`);
  await connection.send("Page.reload", {});
  await waitFor(
    connection,
    `globalThis.__ONLINE_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
  );
}

async function setSize(
  connection: Connection,
  size: typeof DESKTOP | typeof PHONE,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: size.width,
    height: size.height,
    deviceScaleFactor: size.scale,
    mobile: size.mobile,
  });
  await delay(300);
}

async function click(connection: Connection, action: string): Promise<void> {
  const clicked = await evaluate(
    connection,
    `(() => { const node = document.querySelector('[data-action="${action}"]'); if (!node || node.disabled) return false; node.click(); return true; })()`,
  );
  if (clicked !== true) throw new Error(`Could not press ${action}`);
  await delay(150);
}

async function capture(
  connection: Connection,
  name: string,
  full = false,
): Promise<void> {
  await delay(250);
  let clip: object | undefined;
  if (full) {
    const metrics = (await connection.send("Page.getLayoutMetrics")) as {
      readonly cssContentSize: {
        readonly width: number;
        readonly height: number;
      };
    };
    clip = {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: Math.min(metrics.cssContentSize.height, 4_000),
      scale: 1,
    };
  }
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    ...(clip === undefined ? {} : { clip, captureBeyondViewport: true }),
  })) as { readonly data?: string };
  if (response.data === undefined) throw new Error("No screenshot data");
  const file = path.join(outputDirectory, `${name}.png`);
  await writeFile(file, Buffer.from(response.data, "base64"));
  shots.push(file);
}

async function evaluate(
  connection: Connection,
  expression: string,
): Promise<unknown> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: unknown };
    readonly exceptionDetails?: unknown;
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(JSON.stringify(response.exceptionDetails).slice(0, 800));
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

async function waitForTarget(): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/list`);
      if (response.ok) return;
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
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`${method} timed out`));
        }, 30_000);
        pending.set(id, {
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
    onEvent(listener) {
      listeners.add(listener);
    },
    close: () => socket.close(),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
