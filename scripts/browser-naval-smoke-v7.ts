import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareSmokeOutput } from "./browser-smoke-output";

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
  close(): void;
}

const output = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "ruleset7-naval-browser",
  archiveDirectory: "art/integration/reviews/ruleset7-naval-browser",
});
const baseUrl = new URL(
  process.argv.find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
baseUrl.searchParams.set("browser-smoke", "1");
const chrome =
  process.env.CHROME_PATH ??
  "/Users/nadbor/.local/opt/chrome-headless-153/chrome-headless-shell-mac-x64/chrome-headless-shell";
const port = 10_100 + (process.pid % 100);
const profile = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-naval-browser-profile-"),
);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,1000",
    baseUrl.href,
  ],
  { stdio: "ignore" },
);

try {
  const target = await waitForTarget(port, baseUrl.origin);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-map-type') !== null && globalThis.__PULP_WARS_APP__?.controller !== undefined`,
  );
  const functional = await evaluate<Record<string, unknown>>(
    connection,
    `(async () => {
      const controller = globalThis.__PULP_WARS_APP__.controller;
      const mapTypes = ['DRY_LAND', 'PANGEA', 'CONTINENTS', 'ARCHIPELAGO', 'LAKES'];
      const select = document.querySelector('#v7-map-type');
      const setupOptions = Array.from(select.options, (option) => option.value);
      const defaultMapType = select.value;
      const launched = [];
      const waitFor = async (predicate, label) => {
        for (let attempt = 0; attempt < 2_000; attempt += 1) {
          if (predicate()) return;
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error('timed out: ' + label + ' ' + JSON.stringify({
          phase: controller.snapshot().phase,
          activeSeatIndex: controller.snapshot().view?.activeSeatIndex,
          activePlayer: controller.snapshot().view?.turnOrder[controller.snapshot().view?.activeSeatIndex ?? 0],
          humanPlayerId: controller.snapshot().view?.humanPlayerId,
          round: controller.snapshot().view?.round,
          ai: controller.snapshot().ai,
          alert: document.querySelector('#v7-alert')?.textContent,
        }));
      };
      const click = (selector) => {
        const target = document.querySelector(selector);
        if (!(target instanceof HTMLButtonElement))
          throw new Error('button missing: ' + selector);
        target.click();
      };
      for (const [index, mapType] of mapTypes.entries()) {
        if (index > 0) {
          click('[data-action="show-replace"]');
          await waitFor(() => document.querySelector('#v7-map-type') !== null, 'replace setup');
        }
        const mapTypeSelect = document.querySelector('#v7-map-type');
        if (!(mapTypeSelect instanceof HTMLSelectElement))
          throw new Error('map type select missing');
        mapTypeSelect.value = mapType;
        mapTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        click('[data-action="launch"]');
        await waitFor(
          () => controller.snapshot().phase === 'ACTIVE' && controller.snapshot().view?.setup.mapType === mapType,
          'launch ' + mapType,
        );
        launched.push(mapType);
        click('[data-action="main-menu"]');
        await waitFor(
          () => controller.snapshot().phase === 'RESUMABLE' && document.querySelector('[data-action="show-replace"]') !== null,
          'main menu ' + mapType,
        );
      }
      click('[data-action="resume"]');
      await waitFor(
        () => controller.snapshot().phase === 'ACTIVE' && document.querySelector('[data-action="end-turn"]') !== null,
        'resume',
      );
      const resumedMapType = controller.snapshot().view.setup.mapType;
      click('[data-action="end-turn"]');
      await waitFor(
        () => {
          const snapshot = controller.snapshot();
          return snapshot.view?.turnOrder[snapshot.view.activeSeatIndex] === snapshot.view?.humanPlayerId && !snapshot.ai.active && snapshot.ai.acceptedCommands > 0;
        },
        'normal AI return',
      );
      const boundary = controller.snapshot();
      return {
        setupOptions, defaultMapType, launched, resumedMapType,
        humanBoundary: boundary.view.viewer.id === boundary.view.humanPlayerId && !boundary.ai.active,
      };
    })()`,
  );
  if (
    functional.defaultMapType !== "CONTINENTS" ||
    functional.humanBoundary !== true
  )
    throw new Error(`Naval browser flow failed: ${JSON.stringify(functional)}`);

  const mountedUi = await captureMountedUiEvidence(
    connection,
    output.directory,
  );

  for (const size of [11, 25] as const) {
    await mountVisual(connection, size);
    for (const dpr of [1, 2] as const) {
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1000,
        deviceScaleFactor: dpr,
        mobile: false,
      });
      for (const zoom of ["min", "normal", "max"] as const) {
        await evaluate(
          connection,
          `(() => {
            const visual = globalThis.__NAVAL_VISUAL__;
            visual.remount();
            const count = ${JSON.stringify(zoom)} === 'min' ? 12 : ${JSON.stringify(zoom)} === 'max' ? -12 : 0;
            for (let index = 0; index < Math.abs(count); index += 1) {
              if (count > 0) visual.host.zoom('OUT');
              else document.querySelector('.board-canvas-v7')?.dispatchEvent(new WheelEvent('wheel', {
                deltaY: -1,
                clientX: ${size} === 25 ? 930 : 960,
                clientY: ${size} === 25 ? 750 : 600,
                bubbles: true,
                cancelable: true,
              }));
            }
          })()`,
        );
        await delay(500);
        await capture(
          connection,
          `naval-${size}-${zoom}-dpr${dpr}.png`,
          output.directory,
        );
      }
      await evaluate(
        connection,
        `(() => {
          globalThis.__NAVAL_VISUAL__.remount();
          globalThis.__NAVAL_VISUAL__.setFog(true);
        })()`,
      );
      await delay(300);
      await capture(
        connection,
        `naval-${size}-fog-dpr${dpr}.png`,
        output.directory,
      );
      await evaluate(connection, `globalThis.__NAVAL_VISUAL__.setFog(false)`);
    }
  }
  await writeFile(
    path.join(output.directory, "report.json"),
    `${JSON.stringify(
      {
        status: "PASS",
        functional,
        mountedUi,
        visuals: {
          boards: [11, 25],
          zooms: ["min", "normal", "max"],
          dpr: [1, 2],
          fog: true,
          selected: true,
          blockaded: true,
          allOwnerColorsOn25: true,
        },
      },
      null,
      2,
    )}\n`,
  );
  await output.publish();
  console.log(
    JSON.stringify({ status: "PASS", directory: output.directory, functional }),
  );
  connection.close();
} finally {
  browser.kill();
  await rm(profile, { recursive: true, force: true });
}

async function captureMountedUiEvidence(
  connection: Connection,
  directory: string,
): Promise<Record<string, unknown>> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  const installed = await evaluate<{
    readonly portAt: { readonly x: number; readonly y: number };
    readonly landUnitId: number;
  }>(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const fixtureModule = await import('/tests/fixtures/v7-naval-builders.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      globalThis.__NAVAL_DOM__?.destroy?.();
      const fixture = fixtureModule.withPortV7(9001);
      let state = fixture.state;
      const landUnit = state.units.find((unit) => unit.ownerId === state.humanPlayerId);
      if (!landUnit) throw new Error('human fixture unit missing');
      const subscribers = new Set();
      const boundarySubscribers = new Set();
      const traces = [];
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return {
          phase: 'ACTIVE', view,
          offeredCommands: engine.queryPlayerCommandsV7(view),
          savedAt: null, hasStoredSave: false, recovery: null,
          saveWarning: null, diagnostic: null, transitioning: false, ai,
        };
      };
      const emit = () => {
        const next = snapshot();
        for (const subscriber of subscribers) subscriber(next);
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
        subscribeAcceptedBoundary(subscriber) { boundarySubscribers.add(subscriber); return () => boundarySubscribers.delete(subscriber); },
        async dispatch(command) {
          const beforeState = state;
          const beforeView = engine.viewForV7(beforeState, beforeState.humanPlayerId);
          const applied = engine.applyCommandV7(beforeState, beforeState.humanPlayerId, command);
          if (!applied.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: applied.error };
          state = applied.state;
          const afterView = engine.viewForV7(state, state.humanPlayerId);
          const playerEvents = engine.projectEventsV7(beforeState, state, state.humanPlayerId, applied.events);
          const result = { accepted: true, beforeView, afterView, playerEvents };
          traces.push({ command, eventKinds: playerEvents.events.map((event) => event.kind) });
          const boundary = { actor: 'HUMAN', beforeView, afterView, playerEvents };
          for (const subscriber of boundarySubscribers) subscriber(boundary);
          emit();
          return result;
        },
        async launch() { throw new Error('fixture launch unavailable'); },
        async resume() { return true; },
        async returnToMenu() { return false; },
        async progressAiTurns() { return { ok: true, acceptedCommands: 0, playerEventBatches: [], view: snapshot().view, policySlices: 0, maximumSliceMilliseconds: 0 }; },
        async restart() { return { ok: false }; },
        async deleteStoredSave() { return true; },
        setFastForward() {},
        exportSafeLog() { return { ok: true, filename: 'fixture.json', source: '{}' }; },
        exportDebugBundle() { return { ok: false, reason: 'NO_ACTIVE_MATCH' }; },
      };
      const root = document.querySelector('#app');
      if (!(root instanceof HTMLElement)) throw new Error('app root missing');
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, root, controller, { boardHost, settingsStorage: null });
      const readyActivation = { moved: false, movedPathLength: 0, attacked: false, attacksUsed: 0, healed: false, recovered: false, captured: false, handled: false, specialActed: false };
      globalThis.__NAVAL_DOM__ = {
        boardHost, traces, snapshot,
        replaceState(next) { state = next; emit(); },
        makeEmbarkedReady() {
          state = {
            ...state,
            units: state.units.map((unit) => unit.id === landUnit.id ? { ...unit, activation: readyActivation } : unit),
          };
          emit();
          const next = snapshot();
          const landing = next.offeredCommands.find((command) => command.kind === 'DISEMBARK' && command.unitId === landUnit.id);
          if (!landing) throw new Error('landing command missing');
          return landing.at;
        },
        reset() {
          state = fixture.state;
          traces.length = 0;
          boardHost.resetInspectionCycle?.();
          emit();
        },
        destroy() { view.destroy(); },
      };
      return { portAt: fixture.portAt, landUnitId: landUnit.id };
    })()`,
  );
  await delay(500);

  await evaluate(
    connection,
    `globalThis.__NAVAL_DOM__.boardHost.activate(${JSON.stringify(installed.portAt)})`,
  );
  await delay(200);
  await capture(connection, "naval-port-dock.png", directory);
  const portDock = await evaluate<Record<string, unknown>>(
    connection,
    `(() => {
      const dock = document.querySelector('.v7-selection-dock');
      const train = Array.from(document.querySelectorAll('.v7-train-action')).find((button) => button.getAttribute('aria-label')?.includes('Patrol Boat'));
      if (!(dock instanceof HTMLElement) || !(train instanceof HTMLButtonElement))
        throw new Error('selected Port recruit dock missing');
      return {
        text: dock.textContent,
        populationIcons: dock.querySelectorAll('[data-asset-id="ui-hud-population"]').length,
        coinIcons: train.querySelectorAll('[data-asset-id="ui-hud-gold-coin-v7"]').length,
        ariaLabel: train.getAttribute('aria-label'),
      };
    })()`,
  );
  await evaluate(
    connection,
    `document.querySelector('[data-action="tech"]').click()`,
  );
  await delay(150);
  await evaluate(
    connection,
    `(() => {
      document.querySelector('[data-action="tech-shorecraft"]').click();
      document.querySelector('[data-tech-branch="NAVAL"]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    })()`,
  );
  await delay(200);
  await capture(connection, "naval-tech-help.png", directory);
  await evaluate(
    connection,
    `(() => {
      const branchSelect = document.querySelector('.v7-tech-branch-select');
      if (!(branchSelect instanceof HTMLSelectElement))
        throw new Error('technology branch selector missing');
      branchSelect.value = 'NAVAL';
      branchSelect.dispatchEvent(new Event('change', { bubbles: true }));
      const overlay = document.querySelector('.v7-overlay');
      if (!(overlay instanceof HTMLElement)) throw new Error('technology overlay missing');
      overlay.scrollLeft = overlay.scrollWidth - overlay.clientWidth;
      overlay.scrollTop = 0;
    })()`,
  );
  await delay(150);
  const branchAccess = await evaluate<Record<string, unknown>>(
    connection,
    `(() => {
      const overlay = document.querySelector('.v7-overlay');
      const branch = document.querySelector('[data-tech-branch="NAVAL"]');
      if (!(overlay instanceof HTMLElement) || !(branch instanceof HTMLElement))
        throw new Error('naval technology branch missing');
      const viewport = overlay.getBoundingClientRect();
      const cards = Array.from(branch.querySelectorAll('.v7-tech-card'));
      const visibleCards = cards.filter((card) => {
        const bounds = card.getBoundingClientRect();
        return bounds.left >= viewport.left && bounds.right <= viewport.right;
      });
      if (cards.length !== 3 || visibleCards.length !== 3)
        throw new Error('all three Naval cards are not horizontally accessible');
      return {
        selectedBranch: document.querySelector('.v7-tech-branch-select')?.value,
        cards: cards.length,
        fullyVisibleCards: visibleCards.length,
        overflowOwner: 'v7-overlay',
        scrollLeft: overlay.scrollLeft,
        scrollRange: overlay.scrollWidth - overlay.clientWidth,
      };
    })()`,
  );
  await capture(connection, "naval-tech-branch.png", directory);
  const tech = await evaluate<Record<string, unknown>>(
    connection,
    `(() => {
      const detail = document.querySelector('.v7-tech-detail');
      const branch = document.querySelector('[data-tech-branch="NAVAL"]');
      if (!(detail instanceof HTMLElement) || !(branch instanceof HTMLElement))
        throw new Error('naval technology branch missing');
      return {
        branchCards: branch.querySelectorAll('.v7-tech-card').length,
        waterRuleBullets: detail.querySelectorAll('.v7-tech-water-rules li').length,
        coinIcons: detail.querySelectorAll('[data-asset-id="ui-hud-gold-coin-v7"]').length,
        populationIcons: detail.querySelectorAll('[data-asset-id="ui-hud-population"]').length,
        text: detail.textContent,
      };
    })()`,
  );
  await evaluate(
    connection,
    `document.querySelector('[data-action="close-overlay"]').click()`,
  );
  await delay(100);
  await evaluate(
    connection,
    `(() => {
      globalThis.__NAVAL_DOM__.boardHost.resetInspectionCycle?.();
      globalThis.__NAVAL_DOM__.boardHost.activate(${JSON.stringify(installed.portAt)});
      const train = Array.from(document.querySelectorAll('.v7-train-action')).find((button) => button.getAttribute('aria-label')?.includes('Patrol Boat'));
      if (!(train instanceof HTMLButtonElement)) throw new Error('Patrol Boat action missing');
      train.click();
    })()`,
  );
  await waitForExpression(
    connection,
    `globalThis.__NAVAL_DOM__.traces.length === 1`,
  );
  const trained = await evaluate<Record<string, unknown>>(
    connection,
    `globalThis.__NAVAL_DOM__.traces[0]`,
  );

  await evaluate(connection, `globalThis.__NAVAL_DOM__.reset()`);
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="end-turn"]') instanceof HTMLButtonElement && !document.querySelector('[data-action="end-turn"]').disabled`,
  );
  // The fixture state remains private to the harness. Select the known unit by
  // asking the public view for its visible location.
  await evaluate(
    connection,
    `(() => {
      const unit = globalThis.__NAVAL_DOM__.snapshot?.()?.view?.units?.find((candidate) => candidate.id === ${installed.landUnitId});
      if (!unit) throw new Error('fixture unit missing');
      globalThis.__NAVAL_DOM__.boardHost.activate(unit.at);
      if (document.querySelector('[data-action="command-embark"]') !== null)
        throw new Error('obsolete standalone Embark action present');
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock[data-selection-kind="unit"]') !== null`,
  );
  await evaluate(
    connection,
    `(() => {
      const unit = globalThis.__NAVAL_DOM__.snapshot().view.units.find((candidate) => candidate.id === ${installed.landUnitId});
      if (!unit) throw new Error('fixture unit missing after selection');
      const autoembark = globalThis.__NAVAL_DOM__.snapshot().offeredCommands.find((command) => {
        if (command.kind !== 'MOVE' || command.unitId !== unit.id) return false;
        const destination = command.path[command.path.length - 1];
        return destination?.x === ${installed.portAt.x} && destination?.y === ${installed.portAt.y};
      });
      if (!autoembark) throw new Error('Port autoembark MOVE missing');
      globalThis.__NAVAL_DOM__.boardHost.activate(${JSON.stringify(installed.portAt)});
    })()`,
  );
  await waitForExpression(
    connection,
    `globalThis.__NAVAL_DOM__.traces.length === 1`,
  );
  await evaluate(
    connection,
    `(() => {
      const trace = globalThis.__NAVAL_DOM__.traces[0];
      if (trace?.command?.kind !== 'MOVE' || !trace.eventKinds.includes('UNIT_EMBARKED'))
        throw new Error('Port autoembark did not accept MOVE with UNIT_EMBARKED');
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="end-turn"]') instanceof HTMLButtonElement && !document.querySelector('[data-action="end-turn"]').disabled`,
  );
  await evaluate(
    connection,
    `(() => {
      for (let count = 0; count < 10; count += 1) {
        const dismiss = document.querySelector('[data-action="dismiss-achievement"]');
        if (!(dismiss instanceof HTMLButtonElement)) return;
        dismiss.click();
      }
      throw new Error('achievement notices did not drain');
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('[data-v7-region="achievement-notice"]') === null`,
  );
  const landingAt = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `globalThis.__NAVAL_DOM__.makeEmbarkedReady()`,
  );
  await evaluate(
    connection,
    `(() => {
      globalThis.__NAVAL_DOM__.boardHost.resetInspectionCycle?.();
      globalThis.__NAVAL_DOM__.boardHost.activate(${JSON.stringify(installed.portAt)});
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock[data-selection-kind="unit"]')?.textContent.includes('Embarked Transport') === true`,
  );
  await evaluate(
    connection,
    `(() => {
      for (let count = 0; count < 10; count += 1) {
        const dismiss = document.querySelector('[data-action="dismiss-achievement"]');
        if (!(dismiss instanceof HTMLButtonElement)) return;
        dismiss.click();
      }
      throw new Error('achievement notices did not drain before transport help');
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('[data-v7-region="achievement-notice"]') === null`,
  );
  await delay(100);
  const helpOpened = await evaluate<boolean>(
    connection,
    `(() => {
      const help = document.querySelector('[data-action="unit-help"]');
      if (!(help instanceof HTMLButtonElement)) throw new Error('transport help missing');
      help.click();
      return document.querySelector('[data-v7-region="unit-help"][aria-modal="true"]') !== null;
    })()`,
  );
  if (!helpOpened) throw new Error("Transport help did not open");
  await capture(connection, "naval-transport-dock.png", directory);
  const transportDock = await evaluate<Record<string, unknown>>(
    connection,
    `(() => {
      const dock = document.querySelector('.v7-selection-dock');
      if (!(dock instanceof HTMLElement) || !dock.textContent.includes('Embarked Transport'))
        throw new Error('transport dock missing');
      return {
        text: dock.textContent,
        passenger: dock.querySelector('.v7-transport-passenger')?.textContent,
      };
    })()`,
  );
  await evaluate(
    connection,
    `document.querySelector('[data-action="close-unit-help"]')?.click()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.v7-unit-help-dialog[aria-modal="true"]') === null`,
  );
  await evaluate(
    connection,
    `globalThis.__NAVAL_DOM__.boardHost.activate(${JSON.stringify(landingAt)})`,
  );
  await waitForExpression(
    connection,
    `globalThis.__NAVAL_DOM__.traces.length === 2`,
  );
  const actions = await evaluate<readonly Record<string, unknown>[]>(
    connection,
    `(() => {
      const traces = globalThis.__NAVAL_DOM__.traces;
      const landing = traces[1];
      if (landing?.command?.kind !== 'DISEMBARK' || !landing.eventKinds.includes('UNIT_DISEMBARKED'))
        throw new Error('landing action missing');
      return traces;
    })()`,
  );
  return {
    portDock,
    tech: { ...tech, branchAccess },
    trained,
    transportDock,
    actions,
    landingAt,
  };
}

async function mountVisual(
  connection: Connection,
  size: 11 | 25,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      const aiCount = ${size} === 11 ? 1 : 3;
      const setup = {
        rulesetId: 'pulp-wars-poc-7r8', mapGenerationRevision: 'REGIONAL_BIOMES_NAVAL_V2', seed: 42,
        width: ${size}, height: ${size}, aiCount, aiDifficulty: 'NORMAL', aiMode: 'RIVAL',
        humanColor: 'CORAL', factions: Array.from({ length: aiCount + 1 }, () => 'ORIGINAL'), mapType: 'ARCHIPELAGO',
      };
      const created = engine.createPlayableGameV7(setup);
      if (!created.ok) throw new Error(created.error.code);
      const state = {
        ...created.state,
        players: created.state.players.map((player) => player.id === created.state.humanPlayerId ? {
          ...player, explored: created.state.board.tiles.map((tile) => tile.at),
        } : player),
      };
      const source = engine.viewForV7(state, state.humanPlayerId);
      const water = source.board.tiles.filter((tile) => tile.explored && tile.biome === null);
      if (water.length < 8) throw new Error('visual water missing');
      const ownCity = source.cities.find((city) => city.ownerId === source.viewer.id);
      const hostileCity = source.cities.find((city) => city.ownerId !== source.viewer.id) ?? ownCity;
      const waterByKey = new Map(water.map((tile) => [tile.at.x + ',' + tile.at.y, tile]));
      const neighbors = (tile) => {
        const result = [];
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue;
            const next = waterByKey.get((tile.at.x + dx) + ',' + (tile.at.y + dy));
            if (next) result.push(next);
          }
        return result;
      };
      const focusAt = { x: ${size} === 25 ? 6 : 5, y: ${size} === 25 ? 5 : 4 };
      const anchor = [...water].sort((left, right) => {
        const leftDistance = Math.max(Math.abs(left.at.x - focusAt.x), Math.abs(left.at.y - focusAt.y));
        const rightDistance = Math.max(Math.abs(right.at.x - focusAt.x), Math.abs(right.at.y - focusAt.y));
        const leftSparse = neighbors(left).length < aiCount + 1 ? 100 : 0;
        const rightSparse = neighbors(right).length < aiCount + 1 ? 100 : 0;
        return leftSparse + leftDistance - (rightSparse + rightDistance) || neighbors(right).length - neighbors(left).length;
      })[0];
      const cluster = [];
      const queued = [anchor];
      const seen = new Set();
      while (queued.length > 0 && cluster.length < 8) {
        const tile = queued.shift();
        const key = tile.at.x + ',' + tile.at.y;
        if (seen.has(key)) continue;
        seen.add(key); cluster.push(tile);
        queued.push(...neighbors(tile).sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x));
      }
      if (cluster.length < aiCount + 2) throw new Error('visual fleet cluster missing');
      const ownedCoast = cluster[1];
      const hostilePort = cluster[2];
      const ready = { moved: false, movedPathLength: 0, attacked: false, attacksUsed: 0, healed: false, recovered: false, captured: false, handled: false, specialActed: false };
      const roles = ['BATTLESHIP', 'PATROL_BOAT', 'FIGHTER', 'PATROL_BOAT'];
      const forms = ['NAVAL', 'NAVAL', 'EMBARKED', 'NAVAL'];
      const positions = [anchor, ownedCoast, cluster[3], cluster[4] ?? hostilePort];
      const units = state.units.slice(0, aiCount + 1).map((unit, index) => ({
        id: unit.id, ownerId: unit.ownerId, homeCityId: unit.homeCityId,
        role: roles[index], form: forms[index], at: positions[index].at,
        hp: roles[index] === 'BATTLESHIP' ? 25 : 10,
        maxHp: roles[index] === 'BATTLESHIP' ? 25 : 10,
        kills: index, veteran: index === 0, captureEligible: false,
        activation: ready,
      }));
      if (units[1]) units[1] = { ...units[1], at: ownedCoast.at };
      const fullView = {
        ...source,
        board: {
          ...source.board,
          tiles: source.board.tiles.map((tile) => {
            if (!tile.explored) return tile;
            if (tile.at.x === ownedCoast.at.x && tile.at.y === ownedCoast.at.y)
              return { ...tile, biome: null, terrain: 'SHALLOW_WATER', resource: null, improvement: 'PORT', territoryCityId: ownCity.id, territoryOwnerId: source.viewer.id };
            if (tile.at.x === hostilePort.at.x && tile.at.y === hostilePort.at.y)
              return { ...tile, biome: null, terrain: 'SHALLOW_WATER', resource: 'PEARLS', improvement: 'PORT', territoryCityId: hostileCity.id, territoryOwnerId: hostileCity.ownerId };
            if (cluster[5] && tile.at.x === cluster[5].at.x && tile.at.y === cluster[5].at.y)
              return { ...tile, biome: null, terrain: 'SHALLOW_WATER', resource: 'FISH', improvement: null };
            return tile;
          }),
        },
        units,
        naval: {
          ownedPorts: [{ at: ownedCoast.at, cityId: ownCity.id, status: 'BLOCKADED' }],
          tradeCityIds: [], networkCityIds: [ownCity.id], networkRoads: [],
          seaRoutes: [{ fromCityId: ownCity.id, toCityId: hostileCity.id, path: [ownedCoast.at, anchor.at, hostilePort.at] }],
          recoverableNavalUnitIds: [units[0].id],
        },
      };
      let view = fullView;
      const root = document.createElement('main');
      root.style.cssText = 'position:fixed;inset:0;background:#172331;padding:24px;box-sizing:border-box';
      const board = document.createElement('section');
      board.style.cssText = 'width:1392px;height:952px;overflow:hidden;border:2px solid #f6ddb0;border-radius:12px';
      root.append(board); document.body.replaceChildren(root);
      let host;
      const render = () => host.update({
        matchInstanceId: 'naval-${size}', view, offeredCommands: [], interactive: true,
        interaction: { selection: { kind: 'UNIT', unitId: units[0].id }, selectedUnitId: units[0].id, selectedAchievement: null },
        motion: 'REDUCED', animationSpeed: 'NORMAL', presentationPaused: false, highContrast: false,
      });
      const remount = () => {
        host?.destroy(); board.replaceChildren(); host = new CanvasBoardHostV7(document);
        host.mount(board, { onSelection() {}, onCommand() {} }); render();
        globalThis.__NAVAL_VISUAL__.host = host;
      };
      globalThis.__NAVAL_VISUAL__ = {
        host: null, remount,
        setFog(enabled) {
          view = enabled
            ? {
                ...fullView,
                board: { ...fullView.board, tiles: fullView.board.tiles.map((tile, index) => index % 5 === 0 ? { at: tile.at, explored: false, diplomaticBlock: null } : tile) },
                naval: { ...fullView.naval, seaRoutes: [] },
              }
            : fullView;
          render();
        },
      };
      remount();
      return { size: ${size}, units: units.length, water: water.length };
    })()`,
  );
  await delay(800);
}

async function capture(
  connection: Connection,
  name: string,
  directory: string,
): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(
    path.join(directory, name),
    Buffer.from(response.data, "base64"),
  );
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: unknown;
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      `Browser evaluation failed: ${JSON.stringify(response.exceptionDetails)}`,
    );
  return response.result?.value as T;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (await evaluate<boolean>(connection, expression)) return;
    await delay(50);
  }
  throw new Error(`Timed out: ${expression}`);
}

async function waitForTarget(
  port: number,
  origin: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/list`);
      const targets = (await response.json()) as readonly DebugTarget[];
      const target = targets.find(
        (candidate) =>
          candidate.type === "page" && candidate.url.startsWith(origin),
      );
      if (target !== undefined) return target;
    } catch {
      // Chrome may not have opened its debugging socket yet.
    }
    await delay(100);
  }
  throw new Error("Chrome target unavailable");
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
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id === undefined) return;
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
    close: () => socket.close(),
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
