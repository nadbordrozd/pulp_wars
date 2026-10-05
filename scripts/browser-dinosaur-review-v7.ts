import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  dinosaurFixtureMountExpressionV7,
  type DinosaurUiFixtureNameV7,
} from "./browser-dinosaur-fixture-v7";

/**
 * Revision 19 Dinosaur UI visual review (pulp_wars-c87.4). It captures the
 * default-route setup with a Dinosaur seat; a Showcase launch with a
 * Dinosaur seat (the slot capacity, the Lay Egg cards, nest-tile picking,
 * Eggs with countdowns, and the Triceratops of the real board); and, on
 * the Dinosaur UI fixtures, the Charge! attack preview, the Shaman's
 * Hatch, Egg docks, growth chevrons and scale, Acid and Armoured previews,
 * the death-blast warning of a Charge kill, enemy Eggs as attack targets, the Lay
 * Egg reasons, the cues pinned mid-animation, and Help, in the CHIBI and
 * LEGACY art sets at desktop and phone widths. It needs the Vite dev
 * server, because the fixtures are imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-dinosaur-review-v7.ts http://localhost:6173/ [--output-dir=<new-dir>]
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
  name: "dinosaur-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-dinosaur-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_580 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-dinosaur-ui-"));
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
const REVIEW = "globalThis.__DINOSAUR_REVIEW__";
const SAVE_KEY = "pulpWars.save.v7r46.current";

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");

  // Default-route setup: every seat offers Human, Undead, Goblin, Dinosaur.
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    await navigate(connection, url({ art: "chibi" }));
    await evaluate(connection, `localStorage.removeItem('${SAVE_KEY}')`);
    await navigate(connection, url({ art: "chibi" }));
    await waitFor(
      connection,
      `document.querySelector('[data-v7-setup]') !== null`,
    );
    evidence.setupOptions = await evaluate(
      connection,
      `(() => {
        const field = document.querySelector('#v7-faction-0');
        field.value = 'DINOSAUR';
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return Array.from(field.options).map((option) => option.textContent);
      })()`,
    );
    await capture(connection, `setup-dinosaur-${size}.png`);
  }

  // A real Showcase launch with a Dinosaur seat and three Human opponents.
  for (const size of ["desktop", "phone"] as const) {
    await viewport(connection, size);
    await showcase(connection, size);
  }

  for (const art of ["chibi", "legacy"] as const) {
    for (const size of ["desktop", "phone"] as const) {
      const suffix = `${art}-${size}`;
      await viewport(connection, size);
      await mount(connection, art, "dinosaurShowcaseFixtureV7");
      const at = (await evaluate(connection, `${REVIEW}.showcase`)) as Record<
        string,
        Coord
      >;
      // Growth chevrons and Eggs with countdowns, nothing selected.
      await focusCell(connection, at.bigRaptor as Coord);
      await capture(connection, `board-growth-eggs-${suffix}.png`);
      // Charge! (revision 20): the unmoved Triceratops has Move targets
      // only; after a two-tile Move its dock shows the run-up and the attack
      // preview says "Charge +2" and that it pushes back.
      await activate(connection, at.triceratops as Coord);
      evidence[`${suffix}ChargeUnmovedStatuses`] = await evaluate(
        connection,
        `Array.from(document.querySelectorAll('.v7-selection-dock .v7-unit-status-cues .v7-chip')).map((node) => node.textContent)`,
      );
      await capture(connection, `charge-unmoved-${suffix}.png`);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.chargeFrom)})`,
      );
      await waitFor(
        connection,
        `${REVIEW}.traces.some((trace) => trace.command.kind === 'MOVE')`,
      );
      await delay(1_000);
      await activate(connection, at.chargeFrom as Coord);
      evidence[`${suffix}ChargeStatuses`] = await evaluate(
        connection,
        `Array.from(document.querySelectorAll('.v7-selection-dock .v7-unit-status-cues .v7-chip')).map((node) => node.textContent)`,
      );
      await keys(connection, ["ArrowRight"]);
      evidence[`${suffix}ChargeCursor`] = await cursorText(connection);
      await capture(connection, `charge-target-${suffix}.png`);
      // The Shaman's Hatch: the hatchable Egg is a target, the new one not.
      await activate(connection, at.shaman as Coord);
      evidence[`${suffix}ShamanActions`] = await evaluate(
        connection,
        `Array.from(document.querySelectorAll('.v7-selection-dock .v7-context-action')).map((node) => node.getAttribute('aria-label') ?? node.textContent)`,
      );
      await capture(connection, `hatch-preview-${suffix}.png`);
      // Egg docks: a counting Egg and a damaged one.
      await deselect(connection);
      await activate(connection, at.tRexEgg as Coord);
      evidence[`${suffix}EggDock`] = await dockText(connection);
      await capture(connection, `egg-dock-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.damagedEgg as Coord);
      await capture(connection, `egg-damaged-dock-${suffix}.png`);
      // Growth: Alpha and Big docks.
      await deselect(connection);
      await activate(connection, at.alphaTRex as Coord);
      evidence[`${suffix}AlphaDock`] = await dockText(connection);
      await capture(connection, `growth-alpha-dock-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.bigRaptor as Coord);
      await capture(connection, `growth-big-dock-${suffix}.png`);
      // Acid and Armoured in attack previews.
      await deselect(connection);
      await activate(connection, at.spitter as Coord);
      await keys(connection, ["ArrowLeft", "ArrowLeft"]);
      evidence[`${suffix}AcidCursor`] = await cursorText(connection);
      await capture(connection, `acid-preview-${suffix}.png`);
      await deselect(connection);
      await activate(connection, at.ankylosaurus as Coord);
      await keys(connection, ["ArrowRight"]);
      evidence[`${suffix}OwnArmourCursor`] = await cursorText(connection);
      await capture(connection, `armoured-own-preview-${suffix}.png`);
      if (size === "desktop") {
        await deselect(connection);
        await activate(connection, at.alphaTRex as Coord);
        await evaluate(
          connection,
          `document.querySelector('[data-action="unit-help"]')?.click()`,
        );
        await delay(300);
        evidence[`${suffix}AlphaHelp`] = await evaluate(
          connection,
          `Array.from(document.querySelectorAll('.v7-unit-help-dialog .v7-unit-ability')).map((node) => node.textContent)`,
        );
        await capture(connection, `growth-alpha-help-${suffix}.png`);
        await evaluate(
          connection,
          `document.querySelector('[data-action="close-unit-help"]')?.click()`,
        );
      }
      // Help: one sentence per Dinosaur rule.
      await deselect(connection);
      await evaluate(
        connection,
        `document.querySelector('[data-action="compact-menu"]')?.click()`,
      );
      await delay(200);
      await evaluate(
        connection,
        `document.querySelector('[data-action="help"]')?.click()`,
      );
      await delay(400);
      evidence[`${suffix}Help`] = await evaluate(
        connection,
        `Array.from(document.querySelectorAll('.v7-help-dinosaur li')).map((node) => node.textContent)`,
      );
      await evaluate(
        connection,
        `document.querySelector('.v7-help-dinosaur')?.previousElementSibling?.scrollIntoView({ block: 'start' })`,
      );
      await delay(200);
      await capture(connection, `help-dinosaur-${suffix}.png`);
      await evaluate(
        connection,
        `document.querySelector('[data-action="close-overlay"]')?.click()`,
      );
      await delay(300);
      // Technology tree (revision 20): Nesting and Wallbreaker with their
      // unlock text.
      await evaluate(
        connection,
        `document.querySelector('[data-action="tech"]')?.click()`,
      );
      await delay(400);
      for (const tech of ["fortification", "explosives"] as const) {
        await evaluate(
          connection,
          `document.querySelector('[data-action="tech-${tech}"]')?.click()`,
        );
        await delay(300);
        evidence[`${suffix}Tech${tech}`] = await evaluate(
          connection,
          `({ name: document.querySelector('[data-action="tech-${tech}"] .v7-tech-name')?.textContent, unlocks: Array.from(document.querySelectorAll('.v7-tech-unlocks li')).map((node) => node.textContent) })`,
        );
        await capture(connection, `tech-${tech}-${suffix}.png`);
      }
      await evaluate(
        connection,
        `(document.querySelector('[data-action="close-tech-detail"]')?.click(), document.querySelector('[data-action="close-overlay"]')?.click())`,
      );
      await delay(300);
      // The cues pinned mid-animation: Charge hit star, hatch chips, Egg
      // destroyed, the Shaman's call.
      await focusCell(connection, at.chargeFrom as Coord);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.pinDinosaurFeedback([
          { effect: 'CHARGE_HIT', cells: [${JSON.stringify(at.pushTarget)}], progress: 0.3 },
          { effect: 'ACID_HIT', cells: [${JSON.stringify(at.killTarget)}], progress: 0.4 },
          { effect: 'EGG_DESTROYED', cells: [${JSON.stringify(at.diagonalTarget)}], progress: 0.45 },
        ])`,
      );
      await delay(200);
      await capture(connection, `effects-charge-${suffix}.png`);
      await focusCell(connection, at.shaman as Coord);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.pinDinosaurFeedback([
          { effect: 'HATCH_CALL', cells: [${JSON.stringify(at.tRexEgg)}], from: ${JSON.stringify(at.shaman)}, progress: 0.6 },
          { effect: 'HATCH', cells: [${JSON.stringify(at.newEgg)}], progress: 0.3 },
          { effect: 'HATCH', cells: [${JSON.stringify(at.damagedEgg)}], progress: 0.7 },
        ])`,
      );
      await delay(200);
      await capture(connection, `effects-hatch-${suffix}.png`);
      await evaluate(connection, `${REVIEW}.boardHost.pinDinosaurFeedback([])`);
      // The real Charge on the Guard: pushed back, the Triceratops follows.
      await activate(connection, at.chargeFrom as Coord);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(at.pushTarget)})`,
      );
      await waitFor(
        connection,
        `${REVIEW}.traces.some((trace) => trace.command.kind === 'ATTACK')`,
      );
      await delay(1_400);
      evidence[`${suffix}AfterCharge`] = await evaluate(
        connection,
        `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
      );
      await capture(connection, `charge-after-${suffix}.png`);
      // The real Hatch: the T-Rex appears at once, exhausted.
      await deselect(connection);
      await activate(connection, at.shaman as Coord);
      await evaluate(
        connection,
        `document.querySelector('[data-action^="command-hatch"]')?.click()`,
      );
      await waitFor(
        connection,
        `${REVIEW}.traces.some((trace) => trace.command.kind === 'HATCH')`,
      );
      await delay(1_400);
      evidence[`${suffix}AfterHatch`] = await evaluate(
        connection,
        `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
      );
      await capture(connection, `hatch-after-${suffix}.png`);

      // A Charge kill that sets off a death-blast chain warns on its target.
      await mount(connection, art, "dinosaurBlastFixtureV7");
      const blast = (await evaluate(connection, `${REVIEW}.blast`)) as Record<
        string,
        Coord
      >;
      await activate(connection, blast.triceratops as Coord);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify(blast.chargeFrom)})`,
      );
      await waitFor(
        connection,
        `${REVIEW}.traces.some((trace) => trace.command.kind === 'MOVE')`,
      );
      await delay(1_000);
      await activate(connection, blast.chargeFrom as Coord);
      // The Bomb Chucker stands south-east of the tile it is charged from.
      await keys(connection, ["ArrowRight", "ArrowDown"]);
      evidence[`${suffix}ChargeBlastCursor`] = await cursorText(connection);
      await capture(connection, `charge-blast-warning-${suffix}.png`);

      // Enemy Eggs are attack targets; an Armoured defender.
      await mount(connection, art, "dinosaurEnemyFixtureV7");
      const enemy = (await evaluate(connection, `${REVIEW}.enemy`)) as Record<
        string,
        Coord
      >;
      await activate(connection, enemy.fighter as Coord);
      await capture(connection, `enemy-eggs-targets-${suffix}.png`);
      await deselect(connection);
      await activate(connection, enemy.tRexEgg as Coord);
      evidence[`${suffix}EnemyEggDock`] = await dockText(connection);
      await capture(connection, `enemy-egg-dock-${suffix}.png`);
      await deselect(connection);
      await activate(connection, enemy.knight as Coord);
      await keys(connection, ["ArrowRight"]);
      evidence[`${suffix}ArmouredCursor`] = await cursorText(connection);
      await capture(connection, `armoured-preview-${suffix}.png`);

      // Lay Egg: cards with their reasons, nest-tile picking, the laid Egg.
      await mount(connection, art, "dinosaurCityTightFixtureV7");
      const city = (await evaluate(connection, `${REVIEW}.city`)) as Record<
        string,
        Coord
      >;
      await activate(connection, city.capital as Coord);
      evidence[`${suffix}TightCards`] = await evaluate(
        connection,
        `Array.from(document.querySelectorAll('.v7-lay-egg-action')).map((node) => node.getAttribute('aria-label'))`,
      );
      await capture(connection, `city-panel-reasons-${suffix}.png`);
      await mount(connection, art, "dinosaurCityFixtureV7");
      await activate(connection, city.capital as Coord);
      evidence[`${suffix}CityCapacity`] = await evaluate(
        connection,
        `document.querySelector('[data-stat="units"]')?.textContent ?? null`,
      );
      await capture(connection, `city-panel-${suffix}.png`);
      await evaluate(
        connection,
        `document.querySelector('[data-action="lay-egg-knight"]')?.click()`,
      );
      await waitFor(
        connection,
        `document.querySelector('[data-v7-lay-egg="picking"]') !== null`,
      );
      await delay(600);
      evidence[`${suffix}NestTiles`] = await evaluate(
        connection,
        `document.querySelector('[data-v7-lay-egg="picking"]')?.dataset.nestTiles ?? null`,
      );
      await capture(connection, `nest-picking-${suffix}.png`);
      await evaluate(
        connection,
        `${REVIEW}.boardHost.activate(${JSON.stringify({ x: 7, y: 7 })})`,
      );
      await waitFor(
        connection,
        `${REVIEW}.traces.some((trace) => trace.command.kind === 'LAY_EGG')`,
      );
      await delay(900);
      evidence[`${suffix}AfterLay`] = await evaluate(
        connection,
        `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
      );
      await capture(connection, `egg-laid-${suffix}.png`);
    }
  }
  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Dinosaur UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/**
 * The production Showcase with a Dinosaur seat and three Human opponents:
 * the capital over capacity, North's Lay Egg cards, nest-tile picking, two
 * Eggs with countdowns, and the Triceratops's turn-1 lane.
 */
async function showcase(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await navigate(connection, url({ art: "chibi" }));
  await evaluate(connection, `localStorage.removeItem('${SAVE_KEY}')`);
  await navigate(connection, url({ art: "chibi" }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    `(() => {
      const set = (id, value) => {
        const field = document.querySelector(id);
        field.value = value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      set('#v7-ai-count', '3');
      set('#v7-map-type', 'SHOWCASE');
      set('#v7-faction-0', 'DINOSAUR');
      document.querySelector('[data-action="launch"]').click();
    })()`,
  );
  const humanTurn = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId; })()`;
  await waitFor(connection, humanTurn, 600);
  await delay(1_500);
  await capture(connection, `showcase-launch-${size}.png`);
  const focus = async (): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector('canvas.board-canvas-v7').focus()`,
    );
  };
  // The cursor starts on the capital (2, 7), under the Caveman: the second
  // Enter selects the city, which is over capacity (8 of 7 slots).
  await focus();
  await keys(connection, ["Enter", "Enter"]);
  await delay(500);
  evidence[`showcase${size}Capital`] = await evaluate(
    connection,
    `({ slots: document.querySelector('[data-stat="units"]')?.textContent, cards: Array.from(document.querySelectorAll('.v7-lay-egg-action')).map((node) => node.getAttribute('aria-label')) })`,
  );
  await capture(connection, `showcase-capital-panel-${size}.png`);
  // North (2, 3): every Egg can be laid.
  await focus();
  await keys(connection, ["ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp", "Enter"]);
  await delay(500);
  evidence[`showcase${size}North`] = await evaluate(
    connection,
    `({ slots: document.querySelector('[data-stat="units"]')?.textContent, cards: Array.from(document.querySelectorAll('.v7-lay-egg-action')).map((node) => node.getAttribute('aria-label')) })`,
  );
  await capture(connection, `showcase-city-panel-${size}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-action="lay-egg-knight"]').click()`,
  );
  await waitFor(
    connection,
    `document.querySelector('[data-v7-lay-egg="picking"]') !== null`,
  );
  await delay(700);
  await capture(connection, `showcase-nest-picking-${size}.png`);
  await focus();
  await keys(connection, ["ArrowUp", "Enter"]);
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.eggs.length === 1`,
  );
  await delay(900);
  // Coast (2, 11): a Raptor Egg on the Road tile north of it.
  await focus();
  await keys(connection, [
    "Escape",
    ...Array.from({ length: 9 }, () => "ArrowDown"),
    "Enter",
  ]);
  await delay(500);
  await evaluate(
    connection,
    `document.querySelector('[data-action="lay-egg-raider"]').click()`,
  );
  await waitFor(
    connection,
    `document.querySelector('[data-v7-lay-egg="picking"]') !== null`,
  );
  await focus();
  await keys(connection, ["ArrowUp", "Enter"]);
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.eggs.length === 2`,
  );
  await delay(900);
  await keys(connection, ["Escape"]);
  await delay(300);
  evidence[`showcase${size}Eggs`] = await evaluate(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.eggs`,
  );
  await capture(connection, `showcase-eggs-${size}.png`);
  // The Triceratops (2, 9), one tile north of that Egg: its dock (no
  // Stampede control in revision 20).
  await focus();
  await keys(connection, ["ArrowUp", "Enter"]);
  await delay(800);
  evidence[`showcase${size}TriceratopsActions`] = await evaluate(
    connection,
    `Array.from(document.querySelectorAll('.v7-selection-dock .v7-action-label')).map((node) => node.textContent)`,
  );
  await capture(connection, `showcase-triceratops-${size}.png`);
  await evaluate(connection, `localStorage.removeItem('${SAVE_KEY}')`);
}

function url(params: Record<string, string>): string {
  const next = new URL(baseUrl.href);
  next.search = "";
  for (const [key, value] of Object.entries(params))
    next.searchParams.set(key, value);
  return next.href;
}

async function mount(
  connection: Connection,
  art: ArtSet,
  fixture: DinosaurUiFixtureNameV7,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    dinosaurFixtureMountExpressionV7(
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

/** Moves the keyboard cursor near `at` without selecting anything. */
async function focusCell(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(400);
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
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent), info: dock.querySelector('.v7-egg-info')?.textContent ?? null, actions: Array.from(dock.querySelectorAll('.v7-action-label')).map((node) => node.textContent) }; })()`,
  );
}

async function keys(
  connection: Connection,
  names: readonly string[],
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
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
  await evaluate(connection, `globalThis.__DINOSAUR_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__DINOSAUR_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
