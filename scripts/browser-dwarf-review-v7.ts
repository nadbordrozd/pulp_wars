import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  dwarfFixtureMountExpressionV7,
  type DwarfUiFixtureNameV7,
} from "./browser-dwarf-fixture-v7";

/**
 * Dwarf UI visual review (bead pulp_wars-78i.6). It captures the
 * default-route setup with a Dwarf seat; real Showcase launches (the
 * Dwarves beside the Undead, Goblins and Dinosaurs, and beside the Humans,
 * Martians and Ice Folk: all six other factions) at zoom steps 1 and 0.75,
 * with the Showcase Mole's Tunnel; and, on the Dwarf UI fixtures, a mound
 * next to enemies with its eruption ring (selected and hovered), the
 * eruption frame by frame and a real one, the Tunnel with its forecast and
 * its passenger, a Bomb Run with its targets, landings and result,
 * Assemble, Repair, Dig In units, the Gunner's two-shot preview, Knockback
 * (and a blocked one with Blasting Charges), the Steam Tank's Plated and a
 * dug-in Hammerer from the other side, the docks, Help, the technology
 * tree, the Dwarf fleet at sea and the Classic look, in the CHIBI art set
 * (the default look; the board scenes also in LEGACY) at desktop and phone
 * widths. It needs the Vite dev server, because the fixtures are imported
 * from `tests/fixtures`. The `polish` part (bead pulp_wars-78i.9) captures
 * the passenger-first Tunnel step by step and the Dig In earthwork on ready
 * and spent units.
 *
 * Usage: tsx scripts/browser-dwarf-review-v7.ts http://localhost:6173/
 *   [--output-dir=<new-dir>] [--only=setup,showcase,fixtures,legacy,polish]
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
  name: "dwarf-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-dwarf-ui",
});
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_840 + (process.pid % 80);
const userData = await mkdtemp(path.join(tmpdir(), "pulp-wars-dwarf-ui-"));
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
const REVIEW = "globalThis.__DWARF_REVIEW__";
const SAVE_KEY = "pulpWars.save.v7r66.current";
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

  // Default-route setup: every seat offers the seven factions.
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
          field.value = 'DWARF';
          field.dispatchEvent(new Event('change', { bubbles: true }));
          return Array.from(field.options).map((option) => option.textContent);
        })()`,
      );
      await capture(connection, `setup-dwarf-${size}.png`);
    }

  // Real Showcase launches: the Dwarves beside the other six factions
  // (three per launch, every player a different faction).
  if (want("showcase"))
    for (const [label, factions] of [
      ["showcase-dwarf", ["DWARF", "UNDEAD", "GOBLIN", "DINOSAUR"]],
      ["mixed", ["DWARF", "ORIGINAL", "MARTIAN", "ICE_FOLK"]],
    ] as const)
      for (const size of ["desktop", "phone"] as const) {
        await viewport(connection, size);
        await launchShowcase(connection, factions);
        await zoomStep(connection, 1);
        await capture(connection, `${label}-${size}-zoom-1.png`);
        await zoomStep(connection, 0.75);
        await capture(connection, `${label}-${size}-zoom-0.75.png`);
        await zoomStep(connection, 1);
        if (label === "showcase-dwarf") await showcaseTour(connection, size);
        await evaluate(connection, `localStorage.removeItem('${SAVE_KEY}')`);
      }

  if (want("fixtures"))
    for (const size of ["desktop", "phone"] as const)
      await fixtureTour(connection, "chibi", size);
  if (want("legacy"))
    for (const size of ["desktop", "phone"] as const)
      await boardTour(connection, "legacy", size);
  if (want("polish"))
    for (const size of ["desktop", "phone"] as const)
      await polishTour(connection, size);

  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Dwarf UI review captured in ${output.directory}`);
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
  evidence[`launched-${factions.join("-")}`] = await evaluate(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.setup.factions`,
  );
}

/**
 * The Showcase as Dwarves: the capital's dug-in Hammerer, the city panel,
 * and the Steam Mole's Tunnel (the destinations and a forecast).
 */
async function showcaseTour(
  connection: Connection,
  size: "desktop" | "phone",
): Promise<void> {
  const units = (await evaluate(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return v.units.filter((unit) => unit.ownerId === v.viewer.id).map((unit) => ({ id: unit.id, role: unit.role, at: unit.at })); })()`,
  )) as readonly { id: number; role: string; at: Coord }[];
  evidence[`showcase${size}Units`] = units;
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
  const mole = units.find((unit) => unit.role === "GUARD");
  if (mole === undefined) return;
  // Select the Mole through the board: the cursor starts on the capital.
  const capital = (await evaluate(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return v.cities.find((city) => city.ownerId === v.viewer.id && city.isCapital).at; })()`,
  )) as Coord;
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7').focus()`,
  );
  const moves: string[] = [];
  for (let dx = mole.at.x - capital.x; dx !== 0; dx -= Math.sign(dx))
    moves.push(dx > 0 ? "ArrowRight" : "ArrowLeft");
  for (let dy = mole.at.y - capital.y; dy !== 0; dy -= Math.sign(dy))
    moves.push(dy > 0 ? "ArrowDown" : "ArrowUp");
  await keys(connection, [...moves, "Enter"]);
  await delay(500);
  await evaluate(
    connection,
    `document.querySelector('[data-action="dwarf-tunnel"]')?.click()`,
  );
  await delay(800);
  await capture(connection, `showcase-tunnel-pick-${size}.png`);
  // Bead pulp_wars-9im: the destinations and the Hammerers that can ride
  // are board targets (the dock lists neither), read after the capture.
  evidence[`showcase${size}TunnelPanel`] = await boardTargets(connection);
  await deselect(connection);
}

/**
 * Bead pulp_wars-78i.9: the passenger-first Tunnel and the Dig In
 * earthwork. On the Dwarf UI fixture: Tunnel pressed (the Hammerer
 * seated, its rope and badge, the destinations on the board), a destination
 * focused (the Mole's and the Hammerer's ghosts), chosen (the solid tile,
 * the other landings as dots, the confirmation), the Hammerer moved to a
 * dot, and the dig. On the Dig In fixture: two Hammerers that can ride
 * (re-seat, unseat), then the earthwork on ready and spent units. Board
 * scenes at zoom steps 1 and 0.75.
 */
async function polishTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await viewport(connection, size);
  await mount(connection, "chibi", "dwarfUiFixtureV7");
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  const panel = async (name: string): Promise<void> => {
    evidence[`polish-${size}-${name}`] = await evaluate(
      connection,
      `(() => { const panel = document.querySelector('[data-v7-dwarf-pick]'); return panel === null ? null : { boardTargets: Number(panel.dataset.boardTargets ?? '0'), riding: Array.from(panel.querySelectorAll('.v7-dwarf-passenger')).map((node) => node.getAttribute('aria-label')), buttons: Array.from(panel.querySelectorAll('button')).map((node) => node.getAttribute('aria-label') ?? node.textContent), name: panel.getAttribute('aria-label'), text: Array.from(panel.querySelectorAll('p')).map((node) => node.textContent) }; })()`,
    );
  };
  const both = async (name: string): Promise<void> => {
    await zoomStep(connection, 1);
    await capture(connection, `polish-${name}-${size}-zoom-1.png`);
    await zoomStep(connection, 0.75);
    await capture(connection, `polish-${name}-${size}-zoom-0.75.png`);
    await zoomStep(connection, 1);
  };
  await zoomStep(connection, 1);
  await activate(connection, at.mole as Coord);
  await evaluate(
    connection,
    `document.querySelector('[data-action="dwarf-tunnel"]')?.click()`,
  );
  await delay(800);
  await panel("1-passenger");
  await both("tunnel-1-passenger");
  // Focus the erupting destination three tiles west: the ghosts.
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  await keys(connection, ["ArrowLeft", "ArrowLeft", "ArrowLeft"]);
  evidence[`polish-${size}-2-focus-cursor`] = await cursorText(connection);
  await capture(connection, `polish-tunnel-2-focus-${size}-zoom-1.png`);
  // Choose it: the solid tile, the dots, the confirmation.
  await keys(connection, ["Enter"]);
  await delay(600);
  await panel("3-chosen");
  await both("tunnel-3-chosen");
  // Move the Hammerer to a dot next to the destination, with the keyboard:
  // Tab steps through the aimed targets (bead pulp_wars-b5f.8; the dock
  // names no tile) until a dot's description, then Enter.
  const to = at.tunnelTo as Coord;
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  const tabbed: unknown[] = [];
  let dot = false;
  for (let step = 0; step < 48 && !dot; step += 1) {
    await keys(connection, ["Tab"]);
    const described = await cursorText(connection);
    tabbed.push(described);
    dot = String(described).startsWith("The Hammerer lands here instead");
  }
  evidence[`polish-${size}-4-dot`] = { dot, tabbed: tabbed.slice(0, 6) };
  if (dot) {
    await keys(connection, ["Enter"]);
    await delay(600);
    await panel("4-dot");
    await capture(connection, `polish-tunnel-4-dot-${size}-zoom-1.png`);
  }
  // Dig: tap the chosen destination again.
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(to)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'TUNNEL')`,
  );
  evidence[`polish-${size}-5-command`] = await evaluate(
    connection,
    `${REVIEW}.traces.find((trace) => trace.command.kind === 'TUNNEL').command`,
  );
  await delay(250);
  await capture(connection, `polish-tunnel-5-dig-${size}-zoom-1.png`);
  await delay(1_200);
  await deselect(connection);
  // Two Hammerers that can ride: re-seat, then unseat.
  await mount(connection, "chibi", "dwarfDigInFixtureV7");
  const digIn = (await evaluate(connection, `${REVIEW}.digIn`)) as Record<
    string,
    Coord
  >;
  await zoomStep(connection, 1);
  await activate(connection, digIn.readyMole as Coord);
  await evaluate(
    connection,
    `document.querySelector('[data-action="dwarf-tunnel"]')?.click()`,
  );
  await delay(800);
  await panel("6-two-riders");
  await both("tunnel-6-two-riders");
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(digIn.readyHammerer)})`,
  );
  await delay(600);
  await panel("7-reseated");
  await capture(connection, `polish-tunnel-7-reseated-${size}-zoom-1.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(digIn.readyHammerer)})`,
  );
  await delay(600);
  await panel("8-alone");
  await capture(connection, `polish-tunnel-8-alone-${size}-zoom-1.png`);
  await deselect(connection);
  await deselect(connection);
  // The Dig In earthwork on ready and spent units.
  await mount(connection, "chibi", "dwarfDigInFixtureV7");
  await focusCell(connection, digIn.movedHammerer as Coord);
  await deselect(connection);
  for (const step of [1, 0.75]) {
    await zoomStep(connection, step);
    await capture(connection, `polish-dig-in-${size}-zoom-${step}.png`);
  }
  await zoomStep(connection, 1);
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

/** The board scenes alone: mounds, Dig In, markers (LEGACY and CHIBI). */
async function boardTour(
  connection: Connection,
  art: ArtSet,
  size: ScreenSize,
): Promise<void> {
  const suffix = `${art}-${size}`;
  await viewport(connection, size);
  await mount(connection, art, "dwarfUiFixtureV7");
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  await focusCell(connection, at.gunner as Coord);
  await deselect(connection);
  if (art === "chibi") await zoomStep(connection, 1);
  await capture(connection, `board-${suffix}-zoom-1.png`);
  if (art === "chibi") {
    await zoomStep(connection, 0.75);
    await capture(connection, `board-${suffix}-zoom-0.75.png`);
    await zoomStep(connection, 1);
  }
  // A mound next to enemies: hovered (the cursor), then selected, with its
  // eruption ring and the dock's information.
  await focusCell(connection, at.mound as Coord);
  evidence[`${suffix}MoundCursor`] = await cursorText(connection);
  await capture(connection, `mound-hover-${suffix}.png`);
  await activate(connection, at.mound as Coord);
  evidence[`${suffix}MoundDock`] = await evaluate(
    connection,
    `document.querySelector('.v7-dwarf-mound')?.getAttribute('aria-label') ?? null`,
  );
  await capture(connection, `mound-selected-${suffix}.png`);
  await deselect(connection);
  // Dig In by the capital: two dug in, one that moved.
  await focusCell(connection, { x: 8, y: 8 });
  await deselect(connection);
  await capture(connection, `dug-in-${suffix}.png`);
}

async function fixtureTour(
  connection: Connection,
  art: ArtSet,
  size: ScreenSize,
): Promise<void> {
  const suffix = `${art}-${size}`;
  await boardTour(connection, art, size);
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  // Docks: a dug-in Hammerer, one that moved, the Gunner, the Steam Tank.
  for (const [name, cell] of [
    ["dug-in-hammerer", at.dugInHammerer],
    ["moved-hammerer", at.movedHammerer],
    ["gunner", at.gunner],
    ["tank", at.woundedTank],
    ["gyrocopter", at.gyrocopter],
    ["titan", at.titan],
  ] as const) {
    await activate(connection, cell as Coord);
    evidence[`${suffix}Dock-${name}`] = await dockText(connection);
    await capture(connection, `dock-${name}-${suffix}.png`);
    await deselect(connection);
  }
  // The Gunner's two-shot preview on the enemy Captain.
  await activate(connection, at.gunner as Coord);
  await keys(connection, ["ArrowLeft", "ArrowLeft", "ArrowUp"]);
  evidence[`${suffix}GunnerCursor`] = await cursorText(connection);
  await capture(connection, `attack-gunner-two-shots-${suffix}.png`);
  await deselect(connection);
  // Knockback: a Guard knocked back, then a blocked one (Blasting Charges
  // ignore its Field Defense).
  await activate(connection, at.cannon as Coord);
  await keys(connection, ["ArrowLeft", "ArrowLeft"]);
  evidence[`${suffix}KnockbackCursor`] = await cursorText(connection);
  await capture(connection, `attack-knockback-${suffix}.png`);
  await keys(connection, ["ArrowLeft", "ArrowDown"]);
  evidence[`${suffix}KnockbackBlockedCursor`] = await cursorText(connection);
  await capture(connection, `attack-knockback-blocked-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.knockTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'ATTACK')`,
  );
  await delay(1_400);
  evidence[`${suffix}AfterKnockback`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `knockback-after-${suffix}.png`);
  await deselect(connection);
  // Repair: the Engineer's targets and its button, then the sparks.
  await activate(connection, at.engineer as Coord);
  evidence[`${suffix}EngineerDock`] = await dockText(connection);
  await capture(connection, `repair-targets-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-action="command-tend_wounded"]')?.click()`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'TEND_WOUNDED')`,
  );
  await delay(200);
  await capture(connection, `repair-sparks-${suffix}.png`);
  await delay(1_000);
  evidence[`${suffix}AfterRepair`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await deselect(connection);
  // Tunnel: the destinations, the forecast on a focused one, the chosen
  // destination with its seated Hammerer, the dig, and the mounds after.
  await activate(connection, at.mole as Coord);
  await evaluate(
    connection,
    `document.querySelector('[data-action="dwarf-tunnel"]')?.click()`,
  );
  await delay(700);
  evidence[`${suffix}TunnelPanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-dwarf-pick]')?.textContent ?? null`,
  );
  await capture(connection, `tunnel-pick-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  await keys(connection, ["ArrowLeft", "ArrowLeft", "ArrowLeft"]);
  evidence[`${suffix}TunnelCursor`] = await cursorText(connection);
  await capture(connection, `tunnel-forecast-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.tunnelTo)})`,
  );
  await delay(700);
  evidence[`${suffix}RiderPanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-dwarf-pick]')?.textContent ?? null`,
  );
  await capture(connection, `tunnel-rider-prompt-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-v7-dwarf-pick] [data-action="tunnel-confirm"]')?.click()`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'TUNNEL')`,
  );
  await delay(250);
  await capture(connection, `tunnel-dive-${suffix}.png`);
  await delay(1_200);
  evidence[`${suffix}AfterTunnel`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await deselect(connection);
  await focusCell(connection, at.tunnelTo as Coord);
  await capture(connection, `tunnel-after-${suffix}.png`);
  // Bomb Run: the targets, the landings with their threat, the result.
  await activate(connection, at.gyrocopter as Coord);
  await evaluate(
    connection,
    `document.querySelector('[data-action="dwarf-bomb-run"]')?.click()`,
  );
  await delay(700);
  evidence[`${suffix}BombPanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-dwarf-pick]')?.textContent ?? null`,
  );
  await capture(connection, `bomb-targets-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.bombTarget)})`,
  );
  await delay(700);
  evidence[`${suffix}LandingPanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-dwarf-pick]')?.textContent ?? null`,
  );
  await capture(connection, `bomb-landings-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify({ x: 1, y: 1 })})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'BOMB_RUN')`,
  );
  await delay(550);
  await capture(connection, `bomb-blast-${suffix}.png`);
  await delay(1_200);
  evidence[`${suffix}AfterBomb`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await activate(connection, at.bombTarget as Coord);
  evidence[`${suffix}BombedDock`] = await dockText(connection);
  await capture(connection, `bomb-after-${suffix}.png`);
  await deselect(connection);
  // Assemble (a fresh board: the Engineer repaired above).
  await mount(connection, art, "dwarfUiFixtureV7");
  await activate(connection, at.engineer as Coord);
  await evaluate(
    connection,
    `document.querySelector('[data-action="dwarf-assemble"]')?.click()`,
  );
  await delay(700);
  evidence[`${suffix}AssemblePanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-dwarf-pick]')?.textContent ?? null`,
  );
  await capture(connection, `assemble-pick-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify({ x: 10, y: 5 })})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'ASSEMBLE')`,
  );
  await delay(260);
  await capture(connection, `assemble-steam-${suffix}.png`);
  await delay(1_000);
  evidence[`${suffix}AfterAssemble`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await deselect(connection);
  // The eruption, frame by frame on the surfacing (the mound, the burst,
  // the ring, the dust), then a real one.
  await mount(connection, art, "dwarfEruptionAfterFixtureV7");
  await focusCell(connection, at.mound as Coord);
  for (const [frame, progress] of [
    ["1-shake", 0.06],
    ["2-burst", 0.2],
    ["3-ring", 0.36],
    ["4-peak", 0.5],
    ["5-dust", 0.85],
  ] as const) {
    await evaluate(
      connection,
      `(async () => {
        const engine = await import('/src/engine/index.ts');
        const fixtures = await import('/tests/fixtures/v7-dwarf-ui.ts');
        const before = fixtures.dwarfEruptionBeforeFixtureV7();
        ${REVIEW}.boardHost.pinDwarfFeedback([{ effect: 'ERUPTION', cells: [${JSON.stringify(at.mound)}], progress: ${progress} }], engine.viewForV7(before, before.humanPlayerId));
      })()`,
      true,
    );
    await delay(250);
    await capture(connection, `eruption-${frame}-${suffix}.png`);
  }
  // The other cues pinned mid-animation.
  await evaluate(
    connection,
    `${REVIEW}.boardHost.pinDwarfFeedback([
      { effect: 'TUNNEL', cells: [${JSON.stringify(at.mole)}, ${JSON.stringify(at.tunnelTo)}], progress: 0.45 },
      { effect: 'BOMB', cells: [${JSON.stringify(at.bombTarget)}], from: { x: 1, y: 1 }, progress: 0.45 },
      { effect: 'ASSEMBLE', cells: [{ x: 10, y: 5 }], progress: 0.5 },
      { effect: 'REPAIR', cells: [${JSON.stringify(at.woundedTank)}, ${JSON.stringify(at.woundedHammerer)}], progress: 0.5 },
      { effect: 'KNOCKBACK', cells: [${JSON.stringify(at.knockTo)}], progress: 0.4 },
    ])`,
  );
  await delay(300);
  await capture(connection, `effects-${suffix}.png`);
  await evaluate(connection, `${REVIEW}.boardHost.pinDwarfFeedback([])`);
  // A real surfacing: the enemy's End Turn starts the Dwarf turn.
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const fixtures = await import('/tests/fixtures/v7-dwarf-ui.ts');
      const before = fixtures.dwarfEruptionBeforeFixtureV7();
      const active = before.turnOrder[before.activeSeatIndex];
      const result = engine.applyCommandV7(before, active, { kind: 'END_TURN' });
      const viewer = before.humanPlayerId;
      const envelope = engine.projectEventsV7(before, result.state, viewer, result.events);
      globalThis.__DWARF_ERUPTION_EVENTS__ = envelope.events.map((event) => event.kind);
      void ${REVIEW}.boardHost.presentBoundary(engine.viewForV7(before, viewer), engine.viewForV7(result.state, viewer), envelope);
    })()`,
    true,
  );
  // Frames of the real presentation (the camera frames the mound first);
  // the overlay's data attributes name the cue on screen.
  for (const frame of [1, 2, 3, 4]) {
    await delay(220);
    evidence[`${suffix}EruptionFrame${frame}`] = await evaluate(
      connection,
      `document.querySelector('canvas[data-dwarf-effect]')?.dataset.dwarfEffect ?? null`,
    );
    await capture(connection, `eruption-real-${frame}-${suffix}.png`);
  }
  await delay(1_400);
  evidence[`${suffix}EruptionEvents`] = await evaluate(
    connection,
    `globalThis.__DWARF_ERUPTION_EVENTS__ ?? null`,
  );
  await capture(connection, `eruption-after-${suffix}.png`);
  // The other side: a Human viewer against the Dwarves.
  await mount(connection, art, "dwarfVictimFixtureV7");
  const victim = (await evaluate(connection, `${REVIEW}.victim`)) as Record<
    string,
    Coord
  >;
  // The Human Catapult on the Steam Tank: "Plated: at most 4".
  await activate(connection, victim.catapult as Coord);
  await keys(connection, ["ArrowUp", "ArrowUp", "ArrowUp"]);
  evidence[`${suffix}PlatedCursor`] = await cursorText(connection);
  await capture(connection, `attack-plated-${suffix}.png`);
  await deselect(connection);
  // The Human Fighter on the dug-in Hammerer: "Dug in".
  await activate(connection, victim.fighter as Coord);
  await keys(connection, ["ArrowLeft", "ArrowDown"]);
  evidence[`${suffix}DugInCursor`] = await cursorText(connection);
  await capture(connection, `attack-dug-in-${suffix}.png`);
  await deselect(connection);
  // An enemy mound: "surfaces at the start of Player 2's next turn".
  await activate(connection, victim.mound as Coord);
  evidence[`${suffix}EnemyMound`] = await evaluate(
    connection,
    `document.querySelector('.v7-dwarf-mound')?.getAttribute('aria-label') ?? null`,
  );
  await capture(connection, `enemy-mound-${suffix}.png`);
  await deselect(connection);
  // The Dwarf fleet at sea.
  await mount(connection, art, "dwarfFleetFixtureV7");
  const fleet = (await evaluate(connection, `${REVIEW}.fleet`)) as Record<
    string,
    Coord
  >;
  await focusCell(connection, fleet.transport as Coord);
  await deselect(connection);
  await zoomStep(connection, 1);
  await capture(connection, `fleet-${suffix}-zoom-1.png`);
  await zoomStep(connection, 0.75);
  await capture(connection, `fleet-${suffix}-zoom-0.75.png`);
  await zoomStep(connection, 1);
  // Help and the technology tree (Dig In, Blasting Charges).
  await mount(connection, art, "dwarfUiFixtureV7");
  await openMenu(connection, "help");
  evidence[`${suffix}Help`] = await evaluate(
    connection,
    `Array.from(document.querySelectorAll('.v7-help h3')).map((node) => node.textContent)`,
  );
  await evaluate(
    connection,
    `document.querySelector('.v7-help')?.scrollIntoView({ block: 'start' })`,
  );
  await delay(200);
  await capture(connection, `help-dwarf-${suffix}.png`);
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
    "marksmanship",
    "raiding",
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
  // The Classic look (developer setting): the Human stand-ins with the cog
  // badge and the code-drawn mound.
  await mount(connection, art, "dwarfUiFixtureV7");
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
  await focusCell(connection, at.gunner as Coord);
  await deselect(connection);
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
  fixture: DwarfUiFixtureNameV7,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(
    connection,
    dwarfFixtureMountExpressionV7(
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
    `(() => { const dock = document.querySelector('.v7-selection-dock'); return dock === null ? null : { title: dock.querySelector('h2')?.textContent, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent), info: Array.from(dock.querySelectorAll('[data-dwarf-info]')).map((node) => node.textContent), actions: Array.from(dock.querySelectorAll('.v7-action-label')).map((node) => node.textContent), disabled: Array.from(dock.querySelectorAll('[aria-disabled="true"]')).map((node) => node.getAttribute('aria-label')) }; })()`,
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
  await evaluate(connection, `globalThis.__DWARF_REVIEW_PRIOR__ = true`);
  await connection.send("Page.navigate", { url: href });
  await waitFor(
    connection,
    `globalThis.__DWARF_REVIEW_PRIOR__ !== true && document.readyState === 'complete'`,
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
