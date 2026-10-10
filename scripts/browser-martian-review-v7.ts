import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { prepareSmokeOutput } from "./browser-smoke-output";
import {
  controlCasingPixelsExpressionV7,
  martianFixtureMountExpressionV7,
  type MartianUiFixtureNameV7,
} from "./browser-martian-fixture-v7";

/**
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
  name: "martian-ui",
  archiveDirectory: "art/integration/reviews/ruleset7-martian-ui",
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
const SAVE_KEY = "pulpWars.save.v7r74.current";
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

  // Default-route setup: every seat offers the five factions.
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
          field.value = 'MARTIAN';
          field.dispatchEvent(new Event('change', { bubbles: true }));
          return Array.from(field.options).map((option) => option.textContent);
        })()`,
      );
      await capture(connection, `setup-martian-${size}.png`);
    }

  // Real Showcase launches: Martians against Humans, and the Martians
  // beside every other faction. Since pulp_wars-w5j.1 every player plays a
  // different faction, so the setup form can no longer launch the former
  // "four Martians" or "Martians against three Humans" scenes.
  if (want("showcase"))
    for (const [label, factions] of [
      ["showcase-martian", ["MARTIAN", "ORIGINAL"]],
      ["mixed-a", ["MARTIAN", "ORIGINAL", "UNDEAD", "GOBLIN"]],
      ["mixed-b", ["MARTIAN", "DINOSAUR", "UNDEAD", "ORIGINAL"]],
    ] as const)
      for (const size of ["desktop", "phone"] as const) {
        await viewport(connection, size);
        await launchShowcase(connection, factions);
        await capture(connection, `${label}-${size}-zoom-1.png`);
        await zoomOut(connection);
        await capture(connection, `${label}-${size}-zoom-0.75.png`);
        if (label === "showcase-martian") await showcaseTour(connection, size);
        await evaluate(connection, `localStorage.removeItem('${SAVE_KEY}')`);
      }

  if (want("fixtures"))
    for (const art of ["chibi", "legacy"] as const)
      for (const size of ["desktop", "phone"] as const)
        await fixtureTour(connection, art, size);

  if (want("control"))
    for (const size of ["desktop", "phone"] as const)
      await controlTour(connection, size);

  if (errors.length > 0)
    throw new Error(`Browser errors: ${errors.join("\n")}`);
  await writeFile(
    path.join(output.directory, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  await output.publish();
  console.log(`Martian UI review captured in ${output.directory}`);
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

/**
 * The Showcase as Martian: the capital's Grunt beamed down by the Saucer,
 * the Brain, the Mothership's targets, the dock, the tech tree and Help.
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
  // The capital's dock and city panel, reached by the keyboard (the
  // cursor starts on the capital).
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

async function zoomOut(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('[data-action="zoom-out"]')?.click()`,
  );
  await delay(500);
}

async function fixtureTour(
  connection: Connection,
  art: ArtSet,
  size: ScreenSize,
): Promise<void> {
  const suffix = `${art}-${size}`;
  await viewport(connection, size);
  await mount(connection, art, "martianUiFixtureV7");
  const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  // The board: Shields, Cooling, the controlled unit, flyers over land and water,
  // machines afloat.
  await focusCell(connection, at.brain as Coord);
  await capture(connection, `board-${suffix}-zoom-1.png`);
  if (art === "chibi") {
    await evaluate(connection, `${REVIEW}.boardHost.zoom('OUT')`);
    await delay(400);
    await capture(connection, `board-${suffix}-zoom-0.75.png`);
    await evaluate(connection, `${REVIEW}.boardHost.zoom('IN')`);
    await delay(400);
  }
  // Flyers and the machines afloat.
  await activate(connection, at.saucerAfloat as Coord);
  evidence[`${suffix}AfloatDock`] = await dockText(connection);
  await capture(connection, `afloat-saucer-${suffix}.png`);
  await deselect(connection);
  await activate(connection, at.tripodAfloat as Coord);
  await capture(connection, `afloat-tripod-${suffix}.png`);
  // Pierce: a hostile victim, then an own unit behind (friendly fire).
  await deselect(connection);
  await activate(connection, at.tripod as Coord);
  await keys(connection, ["ArrowRight", "ArrowDown"]);
  evidence[`${suffix}PierceCursor`] = await cursorText(connection);
  await capture(connection, `attack-pierce-${suffix}.png`);
  await keys(connection, ["ArrowLeft", "ArrowDown"]);
  evidence[`${suffix}PierceFriendlyCursor`] = await cursorText(connection);
  await capture(connection, `attack-pierce-friendly-${suffix}.png`);
  // The Ray Gunner on a fortified Guard (Disintegrator), the Cooling one.
  await deselect(connection);
  await activate(connection, at.rayGunner as Coord);
  await keys(connection, ["ArrowLeft", "ArrowLeft"]);
  evidence[`${suffix}RayCursor`] = await cursorText(connection);
  await capture(connection, `attack-ray-${suffix}.png`);
  await deselect(connection);
  await activate(connection, at.coolingGunner as Coord);
  evidence[`${suffix}CoolingDock`] = await dockText(connection);
  await capture(connection, `cooling-dock-${suffix}.png`);
  // The Shield Projector's Force Field.
  await deselect(connection);
  await activate(connection, at.projector as Coord);
  await capture(connection, `force-field-${suffix}.png`);
  // Beam Down: the passenger, then the tiles, then the arrival.
  await deselect(connection);
  await activate(connection, at.saucer as Coord);
  evidence[`${suffix}SaucerDock`] = await dockText(connection);
  await evaluate(
    connection,
    `document.querySelector('[data-action="martian-beam-down"]')?.click()`,
  );
  await delay(700);
  await capture(connection, `beam-down-passenger-${suffix}.png`);
  // Bead pulp_wars-9im: the passengers and the tiles are board targets
  // (the dock lists neither), read after each capture.
  evidence[`${suffix}BeamPassengers`] = await boardTargets(connection);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.capitalGrunt)})`,
  );
  await delay(700);
  await capture(connection, `beam-down-tiles-${suffix}.png`);
  evidence[`${suffix}BeamTiles`] = await boardTargets(connection);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify({ x: 7, y: 6 })})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'BEAM_DOWN')`,
  );
  await delay(1_200);
  evidence[`${suffix}AfterBeam`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `beam-down-after-${suffix}.png`);
  // Mind Control: the target, the reasons, the controlled unit it makes.
  await deselect(connection);
  await activate(connection, at.brain as Coord);
  evidence[`${suffix}BrainDock`] = await dockText(connection);
  await capture(connection, `brain-control-link-${suffix}.png`);
  await evaluate(
    connection,
    `document.querySelector('[data-action="martian-mind-control"]')?.click()`,
  );
  await delay(700);
  evidence[`${suffix}MindControlPanel`] = await evaluate(
    connection,
    `document.querySelector('[data-v7-martian-pick]')?.textContent ?? null`,
  );
  await capture(connection, `mind-control-pick-${suffix}.png`);
  // The targets are picked on the board: the weakened enemy is taken.
  evidence[`${suffix}MindControlTargets`] = await boardTargets(connection);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.weakTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'MIND_CONTROL')`,
  );
  await delay(1_200);
  evidence[`${suffix}AfterMindControl`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `mind-control-after-${suffix}.png`);
  await deselect(connection);
  await activate(connection, at.controlled as Coord);
  evidence[`${suffix}ControlledDock`] = await dockText(connection);
  await capture(connection, `controlled-dock-${suffix}.png`);
  // Tractor Beam: the pull destination of the focused target.
  await deselect(connection);
  await activate(connection, at.mothership as Coord);
  await evaluate(
    connection,
    `document.querySelector('[data-action="martian-tractor-beam"]')?.click()`,
  );
  await delay(600);
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7')?.focus()`,
  );
  await keys(connection, ["ArrowDown", "ArrowDown"]);
  evidence[`${suffix}TractorCursor`] = await cursorText(connection);
  await capture(connection, `tractor-beam-preview-${suffix}.png`);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.pullTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'TRACTOR_BEAM')`,
  );
  await delay(1_200);
  await capture(connection, `tractor-beam-after-${suffix}.png`);
  // A real full-power ray: the beam, then the Cooling glyph.
  await deselect(connection);
  await activate(connection, at.rayGunner as Coord);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(at.rayTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'ATTACK')`,
  );
  await delay(1_400);
  evidence[`${suffix}AfterRay`] = await evaluate(
    connection,
    `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
  );
  await capture(connection, `ray-after-${suffix}.png`);
  // The cues pinned mid-animation.
  await deselect(connection);
  await focusCell(connection, at.brain as Coord);
  await evaluate(
    connection,
    `${REVIEW}.boardHost.pinMartianFeedback([
      { effect: 'HEAT_RAY', from: ${JSON.stringify(at.tripod)}, cells: [${JSON.stringify(at.pierceTarget)}], pierce: ${JSON.stringify(at.pierceVictim)}, fullPower: true, progress: 0.45 },
      { effect: 'SHIELD_FLARE', from: ${JSON.stringify(at.healthyTarget)}, cells: [${JSON.stringify(at.brain)}], progress: 0.5 },
      { effect: 'BEAM_DOWN', from: ${JSON.stringify(at.saucer)}, cells: [${JSON.stringify({ x: 9, y: 6 })}], progress: 0.5 },
      { effect: 'TRACTOR_BEAM', from: ${JSON.stringify(at.mothership)}, cells: [${JSON.stringify({ x: 9, y: 4 })}], progress: 0.5 },
      { effect: 'MIND_CONTROL', from: ${JSON.stringify(at.brain)}, cells: [${JSON.stringify(at.weakTarget)}], progress: 0.5 },
      { effect: 'CONTROL_RELEASE', cells: [${JSON.stringify(at.controlled)}], progress: 0.4 },
    ])`,
  );
  await delay(300);
  await capture(connection, `effects-${suffix}.png`);
  await evaluate(connection, `${REVIEW}.boardHost.pinMartianFeedback([])`);
  // Help and the technology tree (Force Fields, Disintegrator).
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
  await capture(connection, `help-martian-${suffix}.png`);
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
  for (const tech of ["fortification", "explosives", "sawmilling"] as const) {
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
  // Two Martian seats: the Shield on the defender's side of a preview.
  await mount(connection, art, "martianDuelFixtureV7");
  const duel = (await evaluate(connection, `${REVIEW}.duel`)) as Record<
    string,
    Coord
  >;
  await activate(connection, duel.rayGunner as Coord);
  await keys(connection, ["ArrowDown", "ArrowDown"]);
  evidence[`${suffix}ShieldCursor`] = await cursorText(connection);
  await capture(connection, `attack-shield-${suffix}.png`);
  await deselect(connection);
  await activate(connection, duel.tripod as Coord);
  await keys(connection, ["ArrowRight"]);
  evidence[`${suffix}ShieldMeleeCursor`] = await cursorText(connection);
  await capture(connection, `attack-shield-melee-${suffix}.png`);
}

/**
 * The Mind Control revision (bead pulp_wars-b5f.3) in the default look: a
 * controlled unit of four kinds keeps its own sprite under the halo and the
 * brain chip, at zoom 1 and 0.75 (each with an enlarged crop); the control
 * link from the unit and from its Brain with their docks; the release cue
 * pinned at three moments; and the halo in high contrast.
 */
async function controlTour(
  connection: Connection,
  size: ScreenSize,
): Promise<void> {
  await viewport(connection, size);
  // A real Mind Control on the wounded Marksman: it stays itself, under
  // the halo (the casing pixels on the board canvas), with its badge.
  await mount(connection, "chibi", "martianUiFixtureV7");
  const start = (await evaluate(connection, `${REVIEW}.at`)) as Record<
    string,
    Coord
  >;
  const casingBefore = await evaluate(
    connection,
    controlCasingPixelsExpressionV7(start.weakTarget as Coord),
    true,
  );
  await activate(connection, start.brain as Coord);
  await evaluate(
    connection,
    `document.querySelector('[data-action="martian-mind-control"]')?.click()`,
  );
  await delay(500);
  await capture(connection, `mind-control-aim-${size}.png`);
  evidence[`control${size}Aim`] = {
    panel: await evaluate(
      connection,
      `document.querySelector('[data-v7-martian-pick]')?.textContent ?? null`,
    ),
    cursor: await cursorText(connection),
    // Bead pulp_wars-9im: the targets are on the board, not in the dock.
    board: await boardTargets(connection),
  };
  await evaluate(
    connection,
    `${REVIEW}.boardHost.activate(${JSON.stringify(start.weakTarget)})`,
  );
  await waitFor(
    connection,
    `${REVIEW}.traces.some((trace) => trace.command.kind === 'MIND_CONTROL')`,
  );
  await delay(1_400);
  evidence[`control${size}Taken`] = await evaluate(
    connection,
    `(async () => {
      const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const { factionColourShadesV7 } = await import('/src/render/canvas/faction-colours-v7.ts');
      const view = ${REVIEW}.snapshotView();
      const unit = view.units.find((candidate) => candidate.at.x === ${start.weakTarget?.x} && candidate.at.y === ${start.weakTarget?.y});
      const entry = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null }).entries.find((candidate) => candidate.key === 'unit:' + unit.id);
      return { notice: document.querySelector('#v7-live')?.textContent, owner: unit.ownerId === view.viewer.id, role: unit.role, artSubject: entry?.artSubject, controlled: entry?.martian?.controlled };
    })()`,
    true,
  );
  evidence[`control${size}CasingPixels`] = {
    before: casingBefore,
    after: await evaluate(
      connection,
      controlCasingPixelsExpressionV7(start.weakTarget as Coord),
      true,
    ),
  };
  await capture(connection, `mind-control-taken-${size}.png`);
  await cropHalo(
    connection,
    `mind-control-taken-${size}.png`,
    `mind-control-taken-${size}-x3.png`,
    start.weakTarget as Coord,
  );
  const kinds = [
    ["goblin", "martianControlGoblinFixtureV7"],
    ["knight", "martianControlKnightFixtureV7"],
    ["yeti", "martianControlYetiFixtureV7"],
    ["hammerer", "martianControlHammererFixtureV7"],
  ] as const;
  for (const [kind, fixture] of kinds) {
    await mount(connection, "chibi", fixture);
    const at = (await evaluate(connection, `${REVIEW}.at`)) as Record<
      string,
      Coord
    >;
    await focusCell(connection, at.controlled as Coord);
    await delay(300);
    evidence[`control${kind}${size}Plan`] = await evaluate(
      connection,
      `(async () => {
        const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
        const view = ${REVIEW}.snapshotView();
        const entry = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null })
          .entries.find((candidate) => candidate.kind === 'UNIT' && candidate.at.x === ${at.controlled?.x} && candidate.at.y === ${at.controlled?.y});
        return { label: entry?.label, artSubject: entry?.artSubject, controlled: entry?.martian?.controlled, ownerColor: entry?.ownerColor };
      })()`,
      true,
    );
    for (const zoom of ["1", "0.75"] as const) {
      if (zoom === "0.75") {
        await evaluate(connection, `${REVIEW}.boardHost.zoom('OUT')`);
        await delay(500);
      }
      const name = `control-${kind}-${size}-zoom-${zoom}`;
      await capture(connection, `${name}.png`);
      await cropHalo(
        connection,
        `${name}.png`,
        `${name}-x3.png`,
        at.controlled as Coord,
      );
    }
    await evaluate(connection, `${REVIEW}.boardHost.zoom('IN')`);
    await delay(400);
    if (kind !== "goblin") continue;
    // The link from the unit to its Brain, and from the Brain to it.
    await activate(connection, at.controlled as Coord);
    evidence[`control${size}UnitDock`] = await controlDockText(connection);
    await capture(connection, `control-link-from-unit-${size}.png`);
    await deselect(connection);
    await activate(connection, at.controller as Coord);
    evidence[`control${size}BrainDock`] = await controlDockText(connection);
    await capture(connection, `control-link-from-brain-${size}.png`);
    // The release: the Brain is disbanded, the Goblin goes home (no halo),
    // and the cue is pinned over it at three moments.
    await evaluate(
      connection,
      `document.querySelector('[data-action="command-disband"]')?.click()`,
    );
    await waitFor(
      connection,
      `${REVIEW}.traces.some((trace) => trace.command.kind === 'DISBAND')`,
    );
    await delay(1_400);
    evidence[`control${size}Released`] = await evaluate(
      connection,
      `({ notice: document.querySelector('#v7-live')?.textContent, events: ${REVIEW}.traces.at(-1).eventKinds })`,
    );
    await deselect(connection);
    await focusCell(connection, at.controlled as Coord);
    await capture(connection, `released-${size}.png`);
    await cropHalo(
      connection,
      `released-${size}.png`,
      `released-${size}-x3.png`,
      at.controlled as Coord,
    );
    for (const progress of [0.12, 0.4, 0.75]) {
      await evaluate(
        connection,
        `${REVIEW}.boardHost.pinMartianFeedback([{ effect: 'CONTROL_RELEASE', cells: [${JSON.stringify(at.controlled)}], progress: ${progress} }])`,
      );
      await delay(250);
      const name = `release-cue-${String(progress).replace(".", "")}-${size}`;
      await capture(connection, `${name}.png`);
      await cropHalo(
        connection,
        `${name}.png`,
        `${name}-x3.png`,
        at.controlled as Coord,
      );
    }
    await evaluate(connection, `${REVIEW}.boardHost.pinMartianFeedback([])`);
    // High contrast: white on black (on a fresh copy, still controlled).
    await mount(connection, "chibi", fixture);
    await openMenu(connection, "settings");
    await evaluate(
      connection,
      `document.querySelector('[data-action="high-contrast"]')?.click()`,
    );
    await delay(200);
    await evaluate(
      connection,
      `document.querySelector('[data-action="close-overlay"]')?.click()`,
    );
    await delay(400);
    await focusCell(connection, at.controlled as Coord);
    await capture(connection, `control-high-contrast-${size}.png`);
  }
}

/** The dock's control badge, Brain chip and owner line. */
async function controlDockText(connection: Connection): Promise<unknown> {
  return evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); if (dock === null) return null; const badge = dock.querySelector('[data-unit-status="mind-controlled"]'); const brain = dock.querySelector('[data-unit-status="controlled"]'); return { title: dock.querySelector('h2')?.textContent, badge: badge?.textContent ?? null, badgeTitle: badge?.getAttribute('title') ?? null, brain: brain?.textContent ?? null, portrait: brain?.querySelector('.v7-control-portrait')?.getAttribute('aria-label') ?? null, owner: dock.querySelector('.v7-identity-owner')?.textContent ?? null, chips: Array.from(dock.querySelectorAll('.v7-chip')).map((node) => node.textContent) }; })()`,
  );
}

/**
 * An enlarged (x3, nearest) crop of a capture around the cell `at` (the
 * unit and the space above its head, where the halo sits), located with the
 * board host's review accessor `cellCentreCssPx`.
 */
async function cropHalo(
  connection: Connection,
  source: string,
  target: string,
  at: Coord,
): Promise<void> {
  const { default: sharp } = await import("sharp");
  const place = (await evaluate(
    connection,
    `(() => { const canvas = document.querySelector('canvas.board-canvas-v7'); const box = canvas.getBoundingClientRect(); const point = ${REVIEW}.boardHost.cellCentreCssPx(${JSON.stringify(at)}); return { x: box.left + point.x, y: box.top + point.y, tile: Number(canvas.dataset.tileCssPx ?? '80'), ratio: globalThis.devicePixelRatio }; })()`,
  )) as {
    readonly x: number;
    readonly y: number;
    readonly tile: number;
    readonly ratio: number;
  };
  const file = path.join(output.directory, source);
  const { width: imageWidth = 0, height: imageHeight = 0 } =
    await sharp(file).metadata();
  const cell = place.tile * place.ratio;
  const width = Math.round(cell * 1.6);
  const height = Math.round(cell * 1.9);
  const x = Math.max(
    0,
    Math.min(imageWidth - width, Math.round(place.x * place.ratio - width / 2)),
  );
  const y = Math.max(
    0,
    Math.min(
      imageHeight - height,
      Math.round(place.y * place.ratio - cell * 1.15),
    ),
  );
  await sharp(file)
    .extract({ left: x, top: y, width, height })
    .resize(width * 3, height * 3, { kernel: "nearest" })
    .png()
    .toFile(path.join(output.directory, target));
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
  fixture: MartianUiFixtureNameV7,
): Promise<void> {
  await navigate(connection, url({ art }));
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
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
