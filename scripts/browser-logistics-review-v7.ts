import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

interface Target {
  readonly webSocketDebuggerUrl: string;
  readonly url: string;
  readonly type: string;
}
interface Reply {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

const outputFlag = process.argv.find((value) => value.startsWith("--output="));
const outputIndex = process.argv.indexOf("--output");
const output = path.resolve(
  outputFlag?.slice(9) ??
    (outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined) ??
    path.join(tmpdir(), `pulp-wars-logistics-review-${process.pid}`),
);
const baseUrl = "http://localhost:6173/?ruleset=7";
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to the review headless browser");
await mkdir(output);
const profile = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-logistics-browser-"),
);
const port = 13_100 + (process.pid % 300);
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
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  const target = await waitTarget(port, new URL(baseUrl).origin);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await waitFor(
    connection,
    "globalThis.__PULP_WARS_APP__?.controller !== undefined && document.querySelector('[data-v7-setup]') !== null",
  );
  const setup = await evaluate<Record<string, unknown>>(
    connection,
    `(async () => {
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const { ACCEPTED_ART_URLS } = await import('/src/assets/generated-art-manifest.ts');
      const { withPortV7 } = await import('/tests/fixtures/v7-naval-builders.ts');
      const { checkedV7, exploredAllV7, richV7 } = await import('/tests/fixtures/v7-builders.ts');
      const { applyCommandV7, projectEventsV7, queryPlayerCommandsV7, viewForV7 } = await import('/src/engine/index.ts');
      const source = globalThis.__PULP_WARS_APP__.controller;
      const originalSnapshot = source.snapshot();
      const same = (a, b) => a.x === b.x && a.y === b.y;
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const requiredWorldAssets = ['building-ruleset7-port-v7r11', 'terrain-ruleset7-resource-fish-v7r11', 'building-city-1', 'unit-original-fighter', 'unit-original-patrol-boat'];
      const worldAssetByUrl = new Map(requiredWorldAssets.map((id) => [new URL(ACCEPTED_ART_URLS[id], location.href).href, id]));
      const worldRenderHits = Object.fromEntries(requiredWorldAssets.map((id) => [id, 0]));
      const nativeDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(source, ...args) {
        if (source instanceof HTMLImageElement) {
          const id = worldAssetByUrl.get(source.currentSrc || source.src);
          if (id !== undefined) worldRenderHits[id] += 1;
        }
        return nativeDrawImage.call(this, source, ...args);
      };
      document.querySelector('#app').style.display = 'none';

      let fixture = withPortV7(77111);
      let current = exploredAllV7(richV7(fixture.state, 500));
      const portCityId = current.board.tiles.find((tile) => same(tile.at, fixture.portAt))?.territoryCityId;
      const fishAt = current.board.tiles.find((tile) => tile.territoryCityId === portCityId && tile.site === null && tile.improvement === null && !same(tile.at, fixture.portAt) && !current.units.some((unit) => same(unit.at, tile.at)))?.at;
      if (!fishAt) throw new Error('visible Fish review tile missing');
      current = checkedV7({
        ...current,
        treasureChests: current.treasureChests.filter((at) => !same(at, fishAt)),
        board: { ...current.board, tiles: current.board.tiles.map((tile) => same(tile.at, fixture.portAt) ? { ...tile, resource: 'FISH' } : same(tile.at, fishAt) ? { ...tile, biome: null, terrain: 'SHALLOW_WATER', resource: 'FISH', road: false, fieldDefense: false } : tile) },
      });
      let snapshotListeners = new Set(), boundaryListeners = new Set(), callbacks = null;
      let view = viewForV7(current, current.humanPlayerId);
      let snapshot = { ...originalSnapshot, phase: 'ACTIVE', view, offeredCommands: queryPlayerCommandsV7(view), transitioning: false };
      let accepted = null;
      const root = document.createElement('div');
      root.id = 'logistics-city-review';
      Object.assign(root.style, { position: 'fixed', inset: '0', background: '#173632' });
      document.body.append(root);
      const refresh = () => {
        view = viewForV7(current, current.humanPlayerId);
        snapshot = { ...snapshot, view, offeredCommands: queryPlayerCommandsV7(view) };
        for (const listener of snapshotListeners) listener(snapshot);
      };
      const reviewPort = {
        snapshot: () => snapshot,
        subscribe(listener) { snapshotListeners.add(listener); listener(snapshot); return () => snapshotListeners.delete(listener); },
        subscribeAcceptedBoundary(listener) { boundaryListeners.add(listener); return () => boundaryListeners.delete(listener); },
        launch: source.launch.bind(source), resume: source.resume.bind(source), returnToMenu: source.returnToMenu.bind(source),
        async dispatch(command) {
          const beforeState = current;
          const result = applyCommandV7(beforeState, beforeState.humanPlayerId, command);
          if (!result.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: result.error };
          current = result.state;
          const beforeView = viewForV7(beforeState, beforeState.humanPlayerId);
          const afterView = viewForV7(current, current.humanPlayerId);
          const playerEvents = projectEventsV7(beforeState, current, current.humanPlayerId, result.events);
          accepted = { command, events: result.events };
          for (const listener of boundaryListeners) listener({ actor: 'HUMAN', beforeView, afterView, playerEvents });
          refresh();
          return { accepted: true, beforeView, afterView, playerEvents };
        },
        progressAiTurns: source.progressAiTurns.bind(source), restart: source.restart.bind(source), deleteStoredSave: source.deleteStoredSave.bind(source), setFastForward: source.setFastForward.bind(source), exportSafeLog: source.exportSafeLog.bind(source), exportDebugBundle: source.exportDebugBundle.bind(source),
      };
      const host = new CanvasBoardHostV7(document);
      const originalMount = host.mount.bind(host);
      host.mount = (container, next) => { callbacks = next; originalMount(container, next); };
      const app = new Ruleset7DomAppView(document, root, reviewPort, { boardHost: host, settingsStorage: null });
      callbacks.onSelection({ kind: 'TILE', at: fixture.portAt });
      const beforeCity = current.cities.find((city) => city.ownerId === current.humanPlayerId);
      const beforePlan = buildBoardRenderPlanV7(view, snapshot.offeredCommands, { selection: { kind: 'TILE', at: fixture.portAt }, selectedUnitId: null, selectedAchievement: null });
      const train = root.querySelector('[data-action="command-train_naval"]');
      if (!(train instanceof HTMLButtonElement)) throw new Error('real naval training button missing');
      train.click();
      for (let attempt = 0; attempt < 100 && accepted === null; attempt += 1) await sleep(10);
      callbacks.onSelection({ kind: 'TILE', at: fixture.portAt });
      const afterCity = current.cities.find((city) => city.id === beforeCity.id);
      const spent = root.querySelector('[data-disabled-reason="city-action-spent"]');
      const afterPlan = buildBoardRenderPlanV7(view, snapshot.offeredCommands, { selection: { kind: 'TILE', at: fixture.portAt }, selectedUnitId: null, selectedAchievement: null });
      for (let attempt = 0; attempt < 200 && requiredWorldAssets.some((id) => worldRenderHits[id] === 0); attempt += 1) await sleep(10);
      if (requiredWorldAssets.some((id) => worldRenderHits[id] === 0)) throw new Error('world canvas did not render required decoded art: ' + JSON.stringify(worldRenderHits));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const ai = current.players.find((player) => player.id !== current.humanPlayerId);
      const aiCity = current.cities.find((city) => city.ownerId === ai.id);
      const aiUnit = current.units.find((unit) => unit.ownerId === ai.id);
      const windmillTile = current.board.tiles.find((tile) => aiCity && aiUnit && tile.site === null && tile.biome !== null && Math.max(Math.abs(tile.at.x - aiUnit.at.x), Math.abs(tile.at.y - aiUnit.at.y)) === 1 && tile.territoryCityId === aiCity.id);
      if (!ai || !aiCity || !aiUnit || !windmillTile) throw new Error('Windmill transition fixture missing');
      const healState = checkedV7({
        ...current,
        nextEntityId: current.nextEntityId + 1,
        treasureChests: current.treasureChests.filter((at) => !same(at, windmillTile.at)),
        units: current.units.map((unit) => unit.id === aiUnit.id ? { ...unit, hp: Math.max(1, unit.maxHp - 6) } : unit),
        board: { ...current.board, tiles: current.board.tiles.map((tile) => same(tile.at, windmillTile.at) ? { ...tile, terrain: 'GRASS', resource: null, improvement: 'WINDMILL', road: false, site: null, fieldDefense: false } : tile) },
        populationContributions: [...current.populationContributions, { id: current.nextEntityId, cityId: aiCity.id, category: 'LIVE', amount: 0, source: { kind: 'IMPROVEMENT', improvement: 'WINDMILL', at: windmillTile.at } }],
      });
      const ended = applyCommandV7(healState, healState.humanPlayerId, { kind: 'END_TURN' });
      if (!ended.accepted) throw new Error('accepted END_TURN transition rejected: ' + ended.error.code);
      const healingEvent = ended.events.find((event) => event.kind === 'WINDMILL_HEALING_RESOLVED');
      if (!healingEvent) throw new Error('accepted END_TURN emitted no Windmill healing');
      const beforeHeal = viewForV7(healState, ai.id);
      const afterHeal = viewForV7(ended.state, ai.id);
      const envelope = projectEventsV7(healState, ended.state, ai.id, ended.events);
      const healRoot = document.createElement('div');
      healRoot.id = 'logistics-healing-review';
      Object.assign(healRoot.style, { position: 'fixed', inset: '0', background: '#173632', display: 'none' });
      document.body.append(healRoot);
      const healHost = new CanvasBoardHostV7(document);
      healHost.mount(healRoot, { onSelection() {}, onCommand() {} });
      const healModel = { matchInstanceId: 2, view: afterHeal, offeredCommands: [], interaction: { selection: null, selectedUnitId: null, selectedAchievement: null }, interactive: false, motion: 'FULL', animationSpeed: 'NORMAL', presentationPaused: false, highContrast: false };
      healHost.update(healModel);
      const effectsCanvas = healRoot.querySelector('.board-effects-canvas-v7');
      let pauseAfter = null;
      const phaseObserver = new MutationObserver(() => {
        const progress = Number(effectsCanvas?.dataset.healingProgress ?? '-1');
        if (pauseAfter !== null && effectsCanvas?.dataset.healingPhase === pauseAfter && progress >= 0.35) {
          pauseAfter = null;
          healHost.update({ ...healModel, presentationPaused: true });
        }
      });
      phaseObserver.observe(effectsCanvas, { attributes: true, attributeFilter: ['data-healing-phase', 'data-healing-progress'] });
      globalThis.__LOGISTICS_REVIEW__ = {
        city: { root, host, app }, healing: { root: healRoot, host: healHost },
        startHealing() { root.style.display = 'none'; healRoot.style.display = ''; pauseAfter = 'SOURCES'; globalThis.__LOGISTICS_HEALING_DONE__ = healHost.presentBoundary(beforeHeal, afterHeal, envelope); },
        advanceHealing() { pauseAfter = 'RECIPIENTS'; healHost.update(healModel); },
        async finishHealing() { healHost.update(healModel); await globalThis.__LOGISTICS_HEALING_DONE__; phaseObserver.disconnect(); },
      };
      return {
        acceptedCommand: accepted?.command?.kind,
        beforeCityAction: beforeCity?.cityActionAvailable,
        afterCityAction: afterCity?.cityActionAvailable,
        spentReason: spent?.textContent,
        worldRenderHits,
        assetIds: [...new Set([...beforePlan.entries, ...afterPlan.entries].map((entry) => entry.assetId).filter(Boolean))],
        healingCommand: 'END_TURN',
        healingEvent,
      };
    })()`,
  );
  assert(
    setup.acceptedCommand === "TRAIN_NAVAL",
    "naval command was not accepted",
  );
  assert(
    setup.beforeCityAction === true && setup.afterCityAction === false,
    "city action transition failed",
  );
  assert(
    String(setup.spentReason).includes("City action spent"),
    "spent reason missing",
  );
  const assetIds = setup.assetIds as readonly string[];
  assert(
    assetIds.includes("building-ruleset7-port-v7r11"),
    "current Port art missing",
  );
  assert(
    assetIds.includes("terrain-ruleset7-resource-fish-v7r11"),
    "current Fish art missing",
  );
  assert(
    Object.values(setup.worldRenderHits as Record<string, number>).every(
      (hits) => hits > 0,
    ),
    "required current art was not rendered into the world canvas",
  );

  await capture(connection, path.join(output, "logistics-city-action-art.png"));
  await evaluate(connection, "globalThis.__LOGISTICS_REVIEW__.startHealing()");
  await waitFor(
    connection,
    "document.querySelector('#logistics-healing-review .board-effects-canvas-v7')?.dataset.healingPhase === 'SOURCES' && Number(document.querySelector('#logistics-healing-review .board-effects-canvas-v7')?.dataset.healingProgress) >= 0.3 && Number(document.querySelector('#logistics-healing-review .board-effects-canvas-v7')?.dataset.healingProgress) <= 0.85",
  );
  const sourcePhase = await evaluate<Record<string, string>>(
    connection,
    `(() => ({ ...document.querySelector('#logistics-healing-review .board-effects-canvas-v7').dataset }))()`,
  );
  await capture(
    connection,
    path.join(output, "logistics-windmill-source-phase.png"),
  );
  await evaluate(
    connection,
    "globalThis.__LOGISTICS_REVIEW__.advanceHealing()",
  );
  await waitFor(
    connection,
    "document.querySelector('#logistics-healing-review .board-effects-canvas-v7')?.dataset.healingPhase === 'RECIPIENTS' && Number(document.querySelector('#logistics-healing-review .board-effects-canvas-v7')?.dataset.healingProgress) >= 0.3 && Number(document.querySelector('#logistics-healing-review .board-effects-canvas-v7')?.dataset.healingProgress) <= 0.85",
  );
  const recipientPhase = await evaluate<Record<string, string>>(
    connection,
    `(() => ({ ...document.querySelector('#logistics-healing-review .board-effects-canvas-v7').dataset }))()`,
  );
  await capture(
    connection,
    path.join(output, "logistics-windmill-recipient-phase.png"),
  );
  await evaluate(connection, "globalThis.__LOGISTICS_REVIEW__.finishHealing()");
  assert(sourcePhase.healingSources === "1", "Windmill source phase missing");
  assert(
    recipientPhase.healingRecipients === "1",
    "Windmill recipient phase missing",
  );
  const evidence = {
    status: "PASS",
    source: "STRICT_ENGINE_ACCEPTED_COMMAND_PUBLIC_DOM",
    ...setup,
    sourcePhase,
    recipientPhase,
    screenshots: [
      "logistics-city-action-art.png",
      "logistics-windmill-source-phase.png",
      "logistics-windmill-recipient-phase.png",
    ],
  };
  await writeFile(
    path.join(output, "logistics-runtime.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  process.stdout.write(
    `Ruleset 7 logistics browser review passed: ${output}\n`,
  );
} finally {
  browser.kill();
  await rm(profile, { recursive: true, force: true });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function capture(
  connection: Connection,
  filename: string,
): Promise<void> {
  const screenshot = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { data?: string };
  if (!screenshot.data) throw new Error("Chrome returned no screenshot");
  await writeFile(filename, Buffer.from(screenshot.data, "base64"));
}
async function waitTarget(port: number, origin: string): Promise<Target> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const values = (await (
        await fetch(`http://localhost:${port}/json`)
      ).json()) as Target[];
      const found = values.find(
        (item) => item.type === "page" && item.url.startsWith(origin),
      );
      if (found) return found;
    } catch {
      // Chrome's debugging endpoint may not be ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("Chrome target timeout");
}
async function connect(url: string): Promise<Connection> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.onopen = () => resolve();
    socket.onerror = () => reject(new Error("Chrome websocket failed"));
  });
  let id = 0;
  const pending = new Map<
    number,
    { resolve(value: unknown): void; reject(reason: unknown): void }
  >();
  socket.onmessage = (event) => {
    const reply = JSON.parse(String(event.data)) as Reply;
    if (reply.id === undefined) return;
    const waiter = pending.get(reply.id);
    if (!waiter) return;
    pending.delete(reply.id);
    if (reply.error)
      waiter.reject(new Error(reply.error.message ?? "Chrome error"));
    else waiter.resolve(reply.result);
  };
  return {
    send(method, params = {}) {
      const next = ++id;
      return new Promise((resolve, reject) => {
        pending.set(next, { resolve, reject });
        socket.send(JSON.stringify({ id: next, method, params }));
      });
    },
    close() {
      socket.close();
    },
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
    result?: { value?: T };
    exceptionDetails?: { text?: string; exception?: { description?: string } };
  };
  if (result.exceptionDetails)
    throw new Error(
      result.exceptionDetails.exception?.description ??
        result.exceptionDetails.text ??
        "browser evaluation failed",
    );
  return result.result?.value as T;
}
async function waitFor(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (await evaluate<boolean>(connection, `Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Browser condition timed out: ${expression}`);
}
