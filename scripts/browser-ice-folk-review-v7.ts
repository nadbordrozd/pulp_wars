import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  iceFolkFixtureMountExpressionV7,
  type IceFolkUiFixtureNameV7,
} from "./browser-ice-folk-fixture-v7";

/**
 * Ice Folk UI visual review (bead pulp_wars-7g3.6). It captures the
 * default-route setup with an Ice Folk seat; real Showcase launches (the Ice
 * Folk against Humans, and the Ice Folk beside every
 * other faction) at zoom steps 1 and 0.75; and, on the Ice Folk UI
 * fixtures, the Snow overlay over Grass, Forest, Mountain and Roads, the
 * Witch's Blizzard (over her own Snow and over enemy land), the Frosted and
 * Frozen markers with the HP Shatter window, the Bolas and Cold Snap
 * targeting, the attack previews (Shatter, Sweep, Boulders, Rockfall, Cold
 * Blood, the Blizzard's half damage), a Shatter frame by frame and a real
 * one, the Cold Snap, Bolas, Cold Aura and Sweep cues, the dock, Help and
 * the technology tree, in the CHIBI art set (the default look; the board
 * scenes also in LEGACY) at desktop and phone widths. It needs the Vite dev
 * server, because the fixtures are imported from `tests/fixtures`.
 *
 * Usage: tsx scripts/browser-ice-folk-review-v7.ts http://localhost:6173/
 *   [--output-dir=<new-dir>] [--only=setup,showcase,fixtures,legacy]
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
  name: "ice-folk-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-ice-folk-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_760 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-ice-folk-ui-"));
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
const REVIEW = "globalThis.__ICE_FOLK_REVIEW__";
const SAVE_KEY = "pulpWars.save.v7r40.current";
const only = process.argv
  .slice(2)
  .find((argument) => argument.startsWith("--only="))
  ?.slice("--only=".length);
const want = (part: string): boolean =>
  only === undefined || only.split(",").includes(part);

try {
  const target = await waitForTarget();
  const connection = await connect(target.webSocketDebuggerUrl);
  connection.onEvent((method, params) => {
    if (method === "Runtime.exceptionThrown")
      errors.push(JSON.stringify(params));
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");

  // Default-route setup: every seat offers the six factions.
  if (want("setup"))
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
          field.value = 'ICE_FOLK';
          field.dispatchEvent(new Event('change', { bubbles: true }));
          return Array.from(field.options).map((option) => option.textContent);
        })()`,
      );
      await capture(connection, `setup-ice-folk-${size}.png`);
    }

  // Real Showcase launches: the Ice Folk against Humans, and the Ice Folk
  // beside every other faction. Since pulp_wars-w5j.1 every player plays a
  // different faction, so the setup form can no longer launch the former
  // "four Ice Folk" or "Ice Folk against three Humans" scenes.
  if (want("showcase"))
    for (const [label, factions] of [
      ["showcase-ice-folk", ["ICE_FOLK", "ORIGINAL"]],
      ["mixed-a", ["ICE_FOLK", "ORIGINAL", "UNDEAD", "GOBLIN"]],
      ["mixed-b", ["ICE_FOLK", "DINOSAUR", "MARTIAN", "UNDEAD"]],
    ] as const)
      for (const size of ["desktop", "phone"] as const) {
        await viewport(connection, size);
        await launchShowcase(connection, factions);
        await zoomStep(connection, 1);
        await capture(connection, `${label}-${size}-zoom-1.png`);
        await zoomStep(connection, 0.75);
        await capture(connection, `${label}-${size}-zoom-0.75.png`);
        if (label === "showcase-ice-folk") await showcaseTour(connection, size);
        await evaluate(connection, `localStorage.removeItem('${SAVE_KEY}')`);
      }

  if (want("fixtures"))
    for (const size of ["desktop", "phone"] as const)
      await fixtureTour(connection, "chibi", size);
  if (want("legacy"))
    for (const size of ["desktop", "phone"] as const)
      await boardTour(connection, "legacy", size);

  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Ice Folk UI review captured in ${output.directory}`);
} finally {
  browser.kill();
  await delay(300);
  await rm(userData, { recursive: true, force: true, maxRetries: 5 });
}

/** A Showcase launch with the given seat factions, at the human's turn. */
async function launchShowcase(
  connection: Connection,
  factions: readonly string[],
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
      set('#v7-ai-count', '${factions.length - 1}');
      set('#v7-map-type', 'SHOWCASE');
      ${factions.map((faction, seat) => `set('#v7-faction-${seat}', '${faction}');`).join("\n      ")}
      document.querySelector('[data-action="launch"]').click();
    })()`,
  );
  const humanTurn = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId; })()`;
  await waitFor(connection, humanTurn, 600);
  await delay(1_500);
}

/** The Showcase as Ice Folk: the capital's dock and city panel. */
async function showcaseTour(
  connection: Connection,
  size: "desktop" | "phone",
): Promise<void> {
  evidence[`showcase${size}Units`] = await evaluate(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return v.units.filter((unit) => unit.ownerId === v.viewer.id).map((unit) => ({ id: unit.id, role: unit.role, at: unit.at })); })()`,
  );
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7').focus()`,
  );
  await keys(connection, ["Enter"]);
  await delay(600);
  evidence[`showcase${size}CapitalDock`] = await dockText(connection);
  await capture(connection, `showcase-capital-dock-${size}.png`);
  await keys(connection, ["Enter"]);
  await delay(600);
  await capture(connection, `showcase-city-panel-${size}.png`);
  await deselect(connection);
}

/** Zooms the CHIBI board to the given step with the zoom buttons. */
async function zoomStep(connection: Connection, step: number): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const current = Number(
      await evaluate(
        connection,
        `document.querySelector('canvas.board-canvas-v7')?.dataset.zoomStep ?? '1'`,
      ),
    );
    if (Math.abs(current - step) < 1e-6) break;
    await evaluate(
      connection,
      `document.querySelector('[data-action="${current < step ? "zoom-in" : "zoom-out"}"]')?.click()`,
    );
    await delay(400);
  }
  evidence[`zoomStep${step}`] = await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.dataset.zoomStep ?? null`,
  );
}

/** The board scenes alone: Snow, Blizzard, markers (LEGACY and CHIBI). */
async function boardTour(
  connection: Connection,
  art: ArtSet,
  size: ScreenSize,
): Promise<void> {
  const suffix = `${art}-${size}`;
  await viewport(connection, size);
  await mount(connection, art, "iceFolkUiFixtureV7");
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  await focusCell(connection, at.witch as Coord);
  if (art === "chibi") await zoomStep(connection, 1);
  await capture(connection, `board-${suffix}-zoom-1.png`);
  if (art === "chibi") {
    await zoomStep(connection, 0.75);
    await capture(connection, `board-${suffix}-zoom-0.75.png`);
    await zoomStep(connection, 1);
  }
  // The Snow over Forest, Mountain and Roads at home.
  await focusCell(connection, { x: 8, y: 9 });
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify({ x: 8, y: 10 })})`,
  );
  await delay(400);
  await deselect(connection);
  await capture(connection, `snow-home-${suffix}.png`);
  // The Witch's Blizzard over enemy land.
  await mount(connection, art, "iceFolkVictimFixtureV7");
  const victim = (await evaluate(connection, `${REVIEW}.victim`)) as Record<
    string,
    Coord
  >;
  await focusCell(connection, victim.witch as Coord);
  await capture(connection, `blizzard-enemy-land-${suffix}.png`);
}

async function fixtureTour(
  connection: Connection,
  art: ArtSet,
  size: ScreenSize,
): Promise<void> {
  const suffix = `${art}-${size}`;
  await boardTour(connection, art, size);
  // The other side: the Frozen Fighter that moved, the Blizzard's half
  // damage on a Yeti, and the Snow tile's description for a Human.
  const victim = (await evaluate(connection, `${REVIEW}.victim`)) as Record<
    string,
    Coord
  >;
  await activate(connection, victim.frozenFighter as Coord);
  evidence[`${suffix}FrozenDock`] = await dockText(connection);
  await capture(connection, `frozen-moved-dock-${suffix}.png`);
  await deselect(connection);
  await activate(connection, victim.marksman as Coord);
  await keys(connection, ["ArrowDown", "ArrowDown"]);
  evidence[`${suffix}BlizzardCursor`] = await cursorText(connection);
  await capture(connection, `attack-blizzard-half-${suffix}.png`);
  await deselect(connection);
  await activate(connection, victim.witch as Coord);
  evidence[`${suffix}EnemyWitchDock`] = await dockText(connection);
  await capture(connection, `enemy-witch-ring-${suffix}.png`);
  // The former two-Ice-Folk "mirror" capture is gone: every player plays a
  // different faction since pulp_wars-w5j.1, so no match has two Ice Folk
  // Snow territories (dropped in pulp_wars-w5j.3).

  await mount(connection, art, "iceFolkUiFixtureV7");
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  // Markers: the Frosted Fighter and the Frozen Guard, close up.
  await focusCell(connection, at.shatterTarget as Coord);
  await capture(connection, `markers-${suffix}.png`);
  // The dock of a Frosted enemy, of the Witch and of the Boulder Yeti.
  await activate(connection, at.shatterTarget as Coord);
  evidence[`${suffix}FrostedDock`] = await dockText(connection);
  await capture(connection, `frosted-dock-${suffix}.png`);
  await deselect(connection);
  await activate(connection, at.frozenEnemy as Coord);
  evidence[`${suffix}FrozenEnemyDock`] = await dockText(connection);
  await deselect(connection);
  await activate(connection, at.boulderYeti as Coord);
  evidence[`${suffix}BoulderDock`] = await dockText(connection);
  await capture(connection, `boulder-dock-${suffix}.png`);
  // Boulders on a fortified Guard (Ignores fortification, Planted).
  await keys(connection, ["ArrowLeft", "ArrowLeft"]);
  evidence[`${suffix}BoulderCursor`] = await cursorText(connection);
  await capture(connection, `attack-boulders-${suffix}.png`);
  await deselect(connection);
  // Rockfall from the Mountain.
  await activate(connection, at.rockfallYeti as Coord);
  await keys(connection, ["ArrowUp", "ArrowUp"]);
  evidence[`${suffix}RockfallCursor`] = await cursorText(connection);
  await capture(connection, `attack-rockfall-${suffix}.png`);
  await deselect(connection);
  // Cold Blood on the Frosted Fighter.
  await activate(connection, at.hunter as Coord);
  await keys(connection, ["ArrowLeft", "ArrowLeft", "ArrowDown"]);
  evidence[`${suffix}ColdBloodCursor`] = await cursorText(connection);
  await capture(connection, `attack-cold-blood-${suffix}.png`);
  await deselect(connection);
  // The Mammoth's Sweep preview (Tramples, the two flank victims).
  await activate(connection, at.mammoth as Coord);
  await keys(connection, ["ArrowUp"]);
  evidence[`${suffix}SweepCursor`] = await cursorText(connection);
  await capture(connection, `attack-sweep-${suffix}.png`);
  await deselect(connection);
  // The Yeti's Shatter preview.
  await activate(connection, at.yeti as Coord);
  await keys(connection, ["ArrowDown"]);
  evidence[`${suffix}ShatterCursor`] = await cursorText(connection);
  await capture(connection, `attack-shatter-${suffix}.png`);
  await deselect(connection);
  // Bolas: the button, the targets with their hints, a throw.
  await activate(connection, at.sled as Coord);
  evidence[`${suffix}SledDock`] = await dockText(connection);
  await evaluate(
    connection,
    `document.querySelector('[data-action="ice-folk-bolas"]')?.click()`,
  );
  await delay(700);
  evidence[`${suffix}BolasPanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-ice-folk-pick]')?.textContent ?? null`,
  );
  await capture(connection, `bolas-pick-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  await keys(connection, ["ArrowLeft", "ArrowLeft"]);
  evidence[`${suffix}BolasCursor`] = await cursorText(connection);
  await capture(connection, `bolas-hover-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.bolasTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'THROW_BOLAS')`,
  );
  await delay(1_200);
  evidence[`${suffix}AfterBolas`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `bolas-after-${suffix}.png`);
  // Cold Snap: the targets and the one confirm.
  await deselect(connection);
  await activate(connection, at.witch as Coord);
  evidence[`${suffix}WitchDock`] = await dockText(connection);
  await capture(connection, `witch-ring-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-action="ice-folk-cold-snap"]')?.click()`,
  );
  await delay(700);
  evidence[`${suffix}ColdSnapPanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-ice-folk-pick]')?.textContent ?? null`,
  );
  await capture(connection, `cold-snap-pick-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-action="cold-snap-cast"]')?.click()`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'COLD_SNAP')`,
  );
  await delay(1_400);
  evidence[`${suffix}AfterColdSnap`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `cold-snap-after-${suffix}.png`);
  // A Shatter, frame by frame (the casing, the cracks, the burst, the
  // shards), then a real one.
  await deselect(connection);
  await focusCell(connection, at.shatterTarget as Coord);
  const victimId = (await evaluate(
    connection,
    `${REVIEW}.snapshotView().units.find((unit) => unit.at.x === ${at.shatterTarget?.x} && unit.at.y === ${at.shatterTarget?.y})?.id`,
  )) as number;
  for (const [frame, progress] of [
    ["1-freeze", 0.08],
    ["2-crack", 0.19],
    ["3-burst", 0.3],
    ["4-shards", 0.55],
    ["5-melt", 0.85],
  ] as const) {
    await evaluate(
      connection,
      `${REVIEW}.boardHost.pinIceFolkFeedback([{ effect: 'SHATTER', unitId: ${victimId}, cells: [${JSON.stringify(at.shatterTarget)}], progress: ${progress} }])`,
    );
    await delay(250);
    await capture(connection, `shatter-${frame}-${suffix}.png`);
  }
  // The other cues pinned mid-animation.
  await evaluate(
    connection,
    `${REVIEW}.boardHost.pinIceFolkFeedback([
      { effect: 'COLD_SNAP', from: ${JSON.stringify(at.witch)}, cells: [${JSON.stringify(at.snapFrozen)}, ${JSON.stringify(at.snapFrosted)}], progress: 0.35 },
      { effect: 'BOLAS', from: ${JSON.stringify(at.sled)}, cells: [${JSON.stringify(at.bolasTarget)}], progress: 0.3 },
      { effect: 'SWEEP', from: ${JSON.stringify(at.mammoth)}, cells: [${JSON.stringify(at.sweepTarget)}], progress: 0.5 },
      { effect: 'COLD_AURA', from: ${JSON.stringify(at.giant)}, cells: [], progress: 0.25 },
    ])`,
  );
  await delay(300);
  await capture(connection, `effects-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.pinIceFolkFeedback([{ effect: 'COLD_SNAP', from: ${JSON.stringify(at.witch)}, cells: [${JSON.stringify(at.snapFrozen)}, ${JSON.stringify(at.snapFrosted)}], progress: 0.8 }])`,
  );
  await delay(300);
  await capture(connection, `effects-frost-hit-${suffix}.png`);
  await evaluate(connection, `${REVIEW}.boardHost.pinIceFolkFeedback([])`);
  // A real Shatter: the Yeti on the Frosted Fighter.
  await activate(connection, at.yeti as Coord);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.shatterTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'ATTACK')`,
  );
  await delay(1_600);
  evidence[`${suffix}AfterShatter`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `shatter-after-${suffix}.png`);
  // Help and the technology tree (Deep Winter, Brittle).
  await openMenu(connection, "help");
  evidence[`${suffix}Help`] = await evaluate(
    connection,
    `Array.from(document.querySelectorAll('.v7-help-ice-folk li')).map((node) => node.textContent)`,
  );
  await evaluate(
    connection,
    `document.querySelector('.v7-help-ice-folk')?.previousElementSibling?.scrollIntoView({ block: 'start' })`,
  );
  await delay(200);
  await capture(connection, `help-ice-folk-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-action="close-overlay"]')?.click()`,
  );
  await delay(300);
  await evaluate(
    connection,
    `document.querySelector('[data-action="tech"]')?.click()`,
  );
  await delay(400);
  await capture(connection, `tech-tree-${suffix}.png`);
  for (const tech of [
    "fortification",
    "explosives",
    "administration",
    "drill",
  ] as const) {
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
  // The Classic look (developer setting): the Human stand-ins with the
  // peak badge, and the same code-drawn Snow and markers.
  await mount(connection, art, "iceFolkUiFixtureV7");
  await openMenu(connection, "settings");
  await evaluate(
    connection,
    `document.querySelector('#v7-classic-look')?.click()`,
  );
  await delay(300);
  await evaluate(
    connection,
    `document.querySelector('[data-action="close-overlay"]')?.click()`,
  );
  await delay(900);
  await focusCell(connection, at.witch as Coord);
  await capture(connection, `board-classic-${size}.png`);
}

async function openMenu(connection: Connection, action: string): Promise<void> {
  await deselect(connection);
  await evaluate(
    connection,
    `document.querySelector('[data-action="compact-menu"]')?.click()`,
  );
  await delay(200);
  await evaluate(
    connection,
    `document.querySelector('[data-action="${action}"]')?.click()`,
  );
  await delay(400);
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
  fixture: IceFolkUiFixtureNameV7,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    iceFolkFixtureMountExpressionV7(
      fixture,
      art === "chibi" ? "CHIBI" : "LEGACY",
    ),
    true,
  );
  await delay(1_400);
}

/** Clears the selection (and any picking state) with Escape. */
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
  await keys(
    connection,
    at.y > 0 ? ["ArrowUp", "ArrowDown"] : ["ArrowDown", "ArrowUp"],
  );
  await delay(600);
}

/** Moves the keyboard cursor to `at` without selecting anything. */
async function focusCell(connection: Connection, at: Coord): Promise<void> {
  await evaluate(
    connection,
    `(() => { const host = ${REVIEW}.boardHost; host.resetInspectionCycle(); host.activate(${JSON.stringify(at)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await deselect(connection);
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
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
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent), info: Array.from(dock.querySelectorAll('[data-ice-folk-info]')).map((node) => node.textContent), actions: Array.from(dock.querySelectorAll('.v7-action-label')).map((node) => node.textContent), disabled: Array.from(dock.querySelectorAll('[aria-disabled="true"]')).map((node) => node.getAttribute('aria-label')) }; })()`,
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
  await evaluate(connection, `globalThis.__ICE_FOLK_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__ICE_FOLK_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
