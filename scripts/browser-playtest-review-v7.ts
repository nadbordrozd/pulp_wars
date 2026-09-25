import { spawn, type ChildProcess } from "node:child_process";
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
    path.join(tmpdir(), `pulp-wars-playtest-review-${process.pid}`),
);
const baseUrl =
  process.argv.find((value) => value.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to the review headless browser");
await mkdir(output);
const profile = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-playtest-browser-"),
);
const port = 12_500 + (process.pid % 300);
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
let primaryFailure: unknown;
let cleanupFailure: unknown;

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
      const { buildBoardRenderPlanV7, createBoardImageResolverV7, drawBoardV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const { allTechsV7, checkedV7, exploredAllV7, initialV7 } = await import('/tests/fixtures/v7-builders.ts');
      const { applyCommandV7, effectiveRoleRuleV7, projectEventsV7, queryPlayerCommandsV7, viewForV7 } = await import('/src/engine/index.ts');
      const source = globalThis.__PULP_WARS_APP__.controller;
      const originalSnapshot = source.snapshot();
      const same = (a, b) => a.x === b.x && a.y === b.y;
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      document.querySelector('#app').style.display = 'none';
      const mountState = (id, initial) => {
        let current = initial;
        let lastEvents = [];
        let lastBoundary = null;
        const snapshotListeners = new Set(), boundaryListeners = new Set();
        let view = viewForV7(current, current.humanPlayerId);
        let snapshot = { ...originalSnapshot, phase: 'ACTIVE', view, offeredCommands: queryPlayerCommandsV7(view), transitioning: false };
        const root = document.createElement('div');
        root.id = id;
        Object.assign(root.style, { position: 'fixed', inset: '0', background: '#173632' });
        document.body.append(root);
        const refresh = () => {
          view = viewForV7(current, current.humanPlayerId);
          snapshot = { ...snapshot, view, offeredCommands: queryPlayerCommandsV7(view) };
          for (const listener of snapshotListeners) listener(snapshot);
        };
        const port = {
          snapshot: () => snapshot,
          subscribe(listener) { snapshotListeners.add(listener); listener(snapshot); return () => snapshotListeners.delete(listener); },
          subscribeAcceptedBoundary(listener) { boundaryListeners.add(listener); return () => boundaryListeners.delete(listener); },
          launch: source.launch.bind(source), resume: source.resume.bind(source), returnToMenu: source.returnToMenu.bind(source),
          async dispatch(command) {
            if (!snapshot.offeredCommands.some((candidate) => JSON.stringify(candidate) === JSON.stringify(command))) return { accepted: false, reason: 'NOT_OFFERED' };
            const beforeState = current, beforeView = viewForV7(beforeState, beforeState.humanPlayerId);
            const result = applyCommandV7(beforeState, beforeState.humanPlayerId, command);
            if (!result.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: result.error };
            current = result.state;
            lastEvents = result.events;
            const afterView = viewForV7(current, current.humanPlayerId);
            const playerEvents = projectEventsV7(beforeState, current, current.humanPlayerId, result.events);
            lastBoundary = { actor: 'HUMAN', beforeView, afterView, playerEvents };
            for (const listener of boundaryListeners) listener(lastBoundary);
            refresh();
            return { accepted: true, beforeView, afterView, playerEvents };
          },
          progressAiTurns: source.progressAiTurns.bind(source), restart: source.restart.bind(source), deleteStoredSave: source.deleteStoredSave.bind(source), setFastForward: source.setFastForward.bind(source), exportSafeLog: source.exportSafeLog.bind(source), exportDebugBundle: source.exportDebugBundle.bind(source),
        };
        const host = new CanvasBoardHostV7(document);
        let callbacks = null;
        const originalMount = host.mount.bind(host);
        host.mount = (container, next) => { callbacks = next; originalMount(container, next); };
        const app = new Ruleset7DomAppView(document, root, port, { boardHost: host, settingsStorage: null });
        const button = (selector) => {
          const value = root.querySelector(selector);
          if (!(value instanceof HTMLButtonElement)) throw new Error('Missing real button ' + selector);
          const rect = value.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) throw new Error('Zero-size button ' + selector);
          return value;
        };
        return { root, host, app, select: (selection) => callbacks.onSelection(selection), button, state: () => current, events: () => lastEvents, boundary: () => lastBoundary };
      };

      const base = exploredAllV7(allTechsV7(initialV7(55103)));
      const actor = base.humanPlayerId;
      const city = base.cities.find((candidate) => candidate.ownerId === actor);
      const baseUnit = base.units.find((unit) => unit.ownerId === actor);
      if (!city || !baseUnit) throw new Error('playtest fixture owner data missing');
      const captainRule = effectiveRoleRuleV7('CAPTAIN');
      const fighterRule = effectiveRoleRuleV7('FIGHTER');
      const cleanActivation = { ...baseUnit.activation, moved: false, attacked: false, handled: false, specialActed: false, inspired: false, tendedThisTurn: false, attacksUsed: 0, overrunActive: false };
      const layerCoords = [{ x: 4, y: 4 }, { x: 5, y: 5 }, { x: 5, y: 4 }, { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 4 }];
      const layerKeys = new Set(layerCoords.map((at) => at.x + ',' + at.y));
      const captainId = base.nextEntityId;
      const layerState = {
        ...base,
        nextEntityId: captainId + 1,
        units: [...base.units.filter((unit) => !layerKeys.has(unit.at.x + ',' + unit.at.y) && unit.ownerId !== actor), { ...baseUnit, id: captainId, role: 'CAPTAIN', at: layerCoords[5], hp: captainRule.maxHp, maxHp: captainRule.maxHp, activation: cleanActivation }].sort((a, b) => a.id - b.id),
        players: base.players.map((player) => player.id === actor ? { ...player, explored: player.explored.filter((at) => !same(at, { x: 7, y: 7 })) } : player),
        board: { ...base.board, tiles: base.board.tiles.map((tile) => {
          if (same(tile.at, layerCoords[0]) || same(tile.at, layerCoords[1])) return { ...tile, biome: 'WOODLAND', terrain: 'FOREST', resource: null, improvement: null, road: true, site: null };
          if (same(tile.at, layerCoords[2])) return { ...tile, biome: 'PLAINS', terrain: 'GRASS', resource: 'FRUIT', improvement: null, road: true, site: null };
          if (same(tile.at, layerCoords[3])) return { ...tile, biome: 'HIGHLANDS', terrain: 'MOUNTAIN', resource: 'ORE', improvement: 'MINE', road: true, site: null };
          if (same(tile.at, layerCoords[4])) return { ...tile, biome: 'PLAINS', terrain: 'GRASS', resource: null, improvement: 'FARM', road: true, site: null };
          if (same(tile.at, layerCoords[5])) return { ...tile, biome: 'PLAINS', terrain: 'GRASS', resource: null, improvement: null, road: true, site: null };
          if (same(tile.at, city.at)) return { ...tile, road: true };
          return tile;
        }) },
      };
      const layerReview = mountState('playtest-layer-review', layerState);
      layerReview.select({ kind: 'TILE', at: layerCoords[0] });
      layerReview.host.zoom('IN');

      const cultivateTile = base.board.tiles.find((tile) => tile.territoryCityId === city.id && tile.site === null && !base.units.some((unit) => same(unit.at, tile.at)));
      if (!cultivateTile) throw new Error('cultivate tile missing');
      const cultivateState = checkedV7({ ...base, board: { ...base.board, tiles: base.board.tiles.map((tile) => same(tile.at, cultivateTile.at) ? { ...tile, biome: 'WOODLAND', terrain: 'FOREST', resource: null, improvement: null, road: true, site: null } : tile) } });
      const cultivateReview = mountState('playtest-cultivate-review', cultivateState);
      cultivateReview.root.style.display = 'none';
      cultivateReview.select({ kind: 'TILE', at: cultivateTile.at });

      const supportAt = { x: 4, y: 4 }, firstAt = { x: 5, y: 4 }, secondAt = { x: 4, y: 5 };
      const supportKeys = new Set([supportAt, firstAt, secondAt].map((at) => at.x + ',' + at.y));
      const recipientA = captainId + 1, recipientB = captainId + 2;
      const supportState = checkedV7({
        ...base,
        nextEntityId: recipientB + 1,
        treasureChests: base.treasureChests.filter((at) => !supportKeys.has(at.x + ',' + at.y)),
        units: [
          ...base.units.filter((unit) => unit.ownerId !== actor && !supportKeys.has(unit.at.x + ',' + unit.at.y)),
          { ...baseUnit, id: captainId, ownerId: actor, homeCityId: city.id, role: 'CAPTAIN', at: supportAt, hp: captainRule.maxHp, maxHp: captainRule.maxHp, activation: cleanActivation },
          { ...baseUnit, id: recipientA, ownerId: actor, homeCityId: city.id, role: 'FIGHTER', at: firstAt, hp: fighterRule.maxHp, maxHp: fighterRule.maxHp, activation: { ...cleanActivation, handled: true } },
          { ...baseUnit, id: recipientB, ownerId: actor, homeCityId: city.id, role: 'FIGHTER', at: secondAt, hp: fighterRule.maxHp - 3, maxHp: fighterRule.maxHp, activation: { ...cleanActivation, handled: true } },
        ].sort((a, b) => a.id - b.id),
        board: { ...base.board, tiles: base.board.tiles.map((tile) => supportKeys.has(tile.at.x + ',' + tile.at.y) ? { ...tile, biome: 'PLAINS', terrain: 'GRASS', resource: null, improvement: null, site: null } : tile) },
      });
      const rallyReview = mountState('playtest-rally-review', supportState);
      rallyReview.root.style.display = 'none'; rallyReview.select({ kind: 'UNIT', unitId: captainId });
      const tendReview = mountState('playtest-tend-review', supportState);
      tendReview.root.style.display = 'none'; tendReview.select({ kind: 'UNIT', unitId: captainId });

      const techReview = mountState('playtest-tech-review', base);
      techReview.button('[data-action="tech"]').click();
      techReview.root.style.display = 'none';

      const landBase = exploredAllV7(allTechsV7(initialV7(55104)));
      const landActor = landBase.humanPlayerId, landCity = landBase.cities.find((candidate) => candidate.ownerId === landActor), landUnit = landBase.units.find((unit) => unit.ownerId === landActor);
      if (!landCity || !landUnit) throw new Error('Land Grant fixture missing');
      const around = (at) => { const result = []; for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) if (dx !== 0 || dy !== 0) result.push({ x: at.x + dx, y: at.y + dy }); return result; };
      const tileAt = (sourceState, at) => sourceState.board.tiles.find((tile) => same(tile.at, at));
      const landAt = landBase.board.tiles.map((tile) => tile.at).find((at) => at.x > 0 && at.y > 0 && at.x < landBase.board.width - 1 && at.y < landBase.board.height - 1 && [at, ...around(at)].every((position) => tileAt(landBase, position)?.site === null));
      if (!landAt) throw new Error('Land Grant footprint missing');
      const camps = around(landAt), campKeys = new Set(camps.map((at) => at.y + ',' + at.x));
      const live = camps.map((at, index) => ({ id: landBase.nextEntityId + index, cityId: landCity.id, category: 'LIVE', amount: 1, source: { kind: 'IMPROVEMENT', improvement: 'LUMBER_CAMP', at } }));
      const permanent = camps.slice(0, 5).map((at, index) => ({ id: landBase.nextEntityId + live.length + index, cityId: landCity.id, category: 'PERMANENT', amount: 1, source: { kind: 'RESOURCE_ACTION', action: 'HARVEST_FRUIT', at } }));
      const assignedStart = landBase.nextEntityId + live.length + permanent.length;
      const assigned = [landAt, ...camps.slice(0, 5)].map((at, index) => ({ ...landUnit, id: assignedStart + index, ownerId: landActor, homeCityId: landCity.id, role: 'FIGHTER', at, hp: 10, maxHp: 10, activation: { ...landUnit.activation } }));
      const landState = checkedV7({ ...landBase, nextEntityId: assignedStart + assigned.length, treasureChests: [], units: assigned, players: landBase.players.map((player) => player.id === landActor ? { ...player, coins: 100 } : player), board: { ...landBase.board, tiles: landBase.board.tiles.map((tile) => same(tile.at, landAt) || campKeys.has(tile.at.y + ',' + tile.at.x) ? { ...tile, biome: 'WOODLAND', terrain: 'FOREST', resource: null, improvement: campKeys.has(tile.at.y + ',' + tile.at.x) ? 'LUMBER_CAMP' : null, road: false, site: null, territoryCityId: landCity.id } : tile) }, cities: landBase.cities.map((candidate) => candidate.id === landCity.id ? { ...candidate, level: 4, permanentPopulation: 5, economicPopulation: 8, population: 4, landGrantUsed: false, rewards: [{ reachedLevel: 2, reward: 'STOCKPILE' }, { reachedLevel: 3, reward: 'WALLS' }, { reachedLevel: 4, reward: 'TREASURY_8' }] } : candidate), populationContributions: [...live, ...permanent] });
      const landReview = mountState('playtest-land-review', landState);
      landReview.root.style.display = 'none'; landReview.select({ kind: 'CITY', cityId: landCity.id });

      const layerView = viewForV7(layerState, actor);
      const noRoadView = { ...layerView, board: { ...layerView.board, tiles: layerView.board.tiles.map((tile) => tile.explored ? { ...tile, road: false } : tile) } };
      const interaction = { selection: { kind: 'TILE', at: layerCoords[0] }, selectedUnitId: null, selectedAchievement: null };
      const roadPlan = buildBoardRenderPlanV7(layerView, [], interaction), noRoadPlan = buildBoardRenderPlanV7(noRoadView, [], interaction);
      let resolverRedraws = 0;
      const resolver = createBoardImageResolverV7(document, () => { resolverRedraws += 1; });
      const tallIds = ['terrain-ruleset7-original-forest-1', 'terrain-ruleset7-original-forest-2', 'terrain-ruleset7-original-forest-3', 'terrain-ruleset7-original-forest-4', 'terrain-ruleset7-revision3-mountain-1', 'terrain-ruleset7-revision3-mountain-2', 'terrain-ruleset7-revision3-mountain-3'];
      const assetIds = [...new Set([...roadPlan.entries, ...noRoadPlan.entries].map((entry) => entry.assetId).filter(Boolean))];
      for (const id of [...assetIds, ...tallIds]) { resolver.resolve(id); resolver.resolveTerrainGround?.(id); resolver.resolveRaisedTerrain?.(id); }
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const ready = assetIds.every((id) => resolver.resolve(id) !== null) && tallIds.every((id) => resolver.resolveTerrainGround?.(id) && resolver.resolveRaisedTerrain?.(id));
        if (ready) break;
        await sleep(25);
      }
      if (!tallIds.every((id) => resolver.resolveRaisedTerrain?.(id))) throw new Error('all tall terrain variants did not isolate');
      const reconstructionDifferences = {};
      for (const id of tallIds) {
        const sourceImage = resolver.resolve(id), groundImage = resolver.resolveTerrainGround(id), raisedImage = resolver.resolveRaisedTerrain(id);
        const expected = document.createElement('canvas'), reconstructed = document.createElement('canvas');
        expected.width = reconstructed.width = 256; expected.height = reconstructed.height = 384;
        expected.getContext('2d').drawImage(sourceImage, 0, 0, 256, 384);
        const reconstructedContext = reconstructed.getContext('2d');
        reconstructedContext.drawImage(groundImage, 0, 128, 256, 256);
        reconstructedContext.drawImage(raisedImage, 0, 0, 256, 384);
        const expectedPixels = expected.getContext('2d').getImageData(0, 0, 256, 384).data, reconstructedPixels = reconstructedContext.getImageData(0, 0, 256, 384).data;
        let differences = 0;
        for (let index = 0; index < expectedPixels.length; index += 4) if (expectedPixels[index] !== reconstructedPixels[index] || expectedPixels[index + 1] !== reconstructedPixels[index + 1] || expectedPixels[index + 2] !== reconstructedPixels[index + 2] || expectedPixels[index + 3] !== reconstructedPixels[index + 3]) differences += 1;
        reconstructionDifferences[id] = differences;
      }
      const viewport = { width: 1100, height: 820 }, camera = { offsetX: 180, offsetY: 150, zoom: 0.9 };
      const render = (plan) => { const canvas = document.createElement('canvas'); canvas.width = viewport.width; canvas.height = viewport.height; const context = canvas.getContext('2d'); drawBoardV7({ context, viewport, devicePixelRatio: 1, camera, plan, images: resolver, reducedMotion: true }); return canvas; };
      const roadCanvas = render(roadPlan), cachedCanvas = render(roadPlan), noRoadCanvas = render(noRoadPlan);
      const roadOnly = render({ version: 7, targets: [], entries: roadPlan.entries.filter((entry) => entry.kind === 'ROAD' || entry.kind === 'ROAD_JOIN') });
      const blank = render({ version: 7, targets: [], entries: [] });
      const pixels = (canvas) => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      const roadPixels = pixels(roadCanvas), cachedPixels = pixels(cachedCanvas), noRoadPixels = pixels(noRoadCanvas), maskPixels = pixels(roadOnly), blankPixels = pixels(blank);
      const namedCells = { forest: layerCoords[0], fruit: layerCoords[2], mine: layerCoords[3], farm: layerCoords[4], unit: layerCoords[5], city: city.at };
      const cellPixels = Object.fromEntries(Object.keys(namedCells).map((key) => [key, { visible: 0, protected: 0 }]));
      let visibleRoadPixels = 0, protectedRoadPixels = 0, outsideRoadDifferences = 0, cachedDifferences = 0;
      for (let index = 0; index < roadPixels.length; index += 4) {
        const differs = (left, right) => left[index] !== right[index] || left[index + 1] !== right[index + 1] || left[index + 2] !== right[index + 2] || left[index + 3] !== right[index + 3];
        const inRoad = differs(maskPixels, blankPixels), finalDiff = differs(roadPixels, noRoadPixels);
        if (inRoad && finalDiff) visibleRoadPixels += 1;
        if (inRoad && !finalDiff) protectedRoadPixels += 1;
        if (!inRoad && finalDiff) outsideRoadDifferences += 1;
        if (differs(roadPixels, cachedPixels)) cachedDifferences += 1;
        if (inRoad) {
          const pixel = index / 4, pixelX = pixel % viewport.width, pixelY = Math.floor(pixel / viewport.width);
          for (const [key, at] of Object.entries(namedCells)) {
            const centerX = camera.offsetX + at.x * 128 * camera.zoom, centerY = camera.offsetY + at.y * 128 * camera.zoom, half = 64 * camera.zoom;
            if (pixelX >= centerX - half && pixelX < centerX + half && pixelY >= centerY - half && pixelY < centerY + half) cellPixels[key][finalDiff ? 'visible' : 'protected'] += 1;
          }
        }
      }
      globalThis.__PLAYTEST_REVIEW__ = { layerReview, cultivateReview, rallyReview, tendReview, techReview, landReview, captainId, recipientA, recipientB };
      return {
        canvas: true,
        layer: { roadEntries: roadPlan.entries.filter((entry) => entry.kind === 'ROAD').length, joins: roadPlan.entries.filter((entry) => entry.kind === 'ROAD_JOIN').length, fog: roadPlan.entries.filter((entry) => entry.kind === 'FOG').length, visibleRoadPixels, protectedRoadPixels, outsideRoadDifferences, cachedDifferences, resolverRedraws, tallVariants: tallIds.length, cellPixels, reconstructionDifferences },
        cultivateAt: cultivateTile.at,
      };
    })()`,
  );

  const showOnly = async (key: string): Promise<void> => {
    await evaluate(
      connection,
      `(() => { const scenes = globalThis.__PLAYTEST_REVIEW__; for (const value of Object.values(scenes)) if (value?.root instanceof HTMLElement) value.root.style.display = 'none'; scenes[${JSON.stringify(key)}].root.style.display = ''; })()`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
  };
  const capture = async (name: string): Promise<void> => {
    const result = (await connection.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    })) as { data?: string };
    if (!result.data) throw new Error("Chrome returned no screenshot");
    await writeFile(
      path.join(output, name),
      Buffer.from(result.data, "base64"),
    );
  };

  await showOnly("layerReview");
  await capture("playtest-road-layering.png");
  await showOnly("landReview");
  const land = await evaluate<Record<string, unknown>>(
    connection,
    `(() => { const scene = globalThis.__PLAYTEST_REVIEW__.landReview, button = scene.button('[data-action="command-land_grant"]'), chip = button.querySelector('.v7-economy-chip.is-cost'); return { label: button.getAttribute('aria-label'), cost: chip?.textContent, rect: button.getBoundingClientRect().toJSON() }; })()`,
  );
  await capture("playtest-land-grant-cost.png");
  await evaluate(
    connection,
    `globalThis.__PLAYTEST_REVIEW__.landReview.button('[data-action="command-land_grant"]').click()`,
  );
  await waitFor(
    connection,
    `globalThis.__PLAYTEST_REVIEW__.landReview.events().some((event) => event.kind === 'LAND_GRANTED')`,
  );

  await showOnly("cultivateReview");
  const cultivate = await evaluate<Record<string, unknown>>(
    connection,
    `(() => { const scene = globalThis.__PLAYTEST_REVIEW__.cultivateReview, button = scene.button('[data-action="command-cultivate_forest"]'); return { label: button.querySelector('.v7-action-label')?.textContent, title: button.title, description: button.getAttribute('aria-description'), rect: button.getBoundingClientRect().toJSON() }; })()`,
  );
  await capture("playtest-clear-for-farming.png");
  await evaluate(
    connection,
    `globalThis.__PLAYTEST_REVIEW__.cultivateReview.button('[data-action="command-cultivate_forest"]').click()`,
  );
  await waitFor(
    connection,
    `globalThis.__PLAYTEST_REVIEW__.cultivateReview.events().some((event) => event.kind === 'FOREST_CULTIVATED')`,
  );

  await showOnly("techReview");
  const technology = await evaluate<readonly Record<string, unknown>[]>(
    connection,
    `(() => ['gathering','hunting','administration','scouting','raiding'].map((id) => { const card = document.querySelector('#playtest-tech-review [data-action="tech-' + id + '"]'), frame = card?.querySelector('.v7-tech-art'), image = frame?.querySelector('img'); const a = frame?.getBoundingClientRect(), b = image?.getBoundingClientRect(); return { id, assetId: image?.dataset.assetId, frameMode: frame?.dataset.frameMode, frame: a?.toJSON(), image: b?.toJSON(), visibleInside: Boolean(a && b && Math.max(a.left,b.left) < Math.min(a.right,b.right) && Math.max(a.top,b.top) < Math.min(a.bottom,b.bottom)) }; }))()`,
  );
  await capture("playtest-captain-tech-icons.png");

  const supportEvidence: Record<string, unknown> = {};
  for (const [key, action, effect, filename] of [
    [
      "rallyReview",
      "command-rally",
      "RALLY",
      "playtest-rally-mid-animation.png",
    ],
    [
      "tendReview",
      "command-tend_wounded",
      "TEND",
      "playtest-tend-mid-animation.png",
    ],
  ] as const) {
    await showOnly(key);
    const actionRect = await evaluate<Record<string, unknown>>(
      connection,
      `globalThis.__PLAYTEST_REVIEW__[${JSON.stringify(key)}].button('[data-action="${action}"]').getBoundingClientRect().toJSON()`,
    );
    await evaluate(
      connection,
      `globalThis.__PLAYTEST_REVIEW__[${JSON.stringify(key)}].button('[data-action="${action}"]').click()`,
    );
    await waitFor(
      connection,
      `(() => { const canvas = document.querySelector('#playtest-${effect === "RALLY" ? "rally" : "tend"}-review .board-effects-canvas-v7'); return canvas?.dataset.supportEffect === '${effect}' && Number(canvas.dataset.supportProgress) >= 0.3; })()`,
    );
    const mid = await evaluate<Record<string, unknown>>(
      connection,
      `(async () => { const scene = globalThis.__PLAYTEST_REVIEW__[${JSON.stringify(key)}], overlay = scene.root.querySelector('.board-effects-canvas-v7'), main = scene.root.querySelector('.board-canvas-v7'); const bytes = new TextEncoder().encode(main.toDataURL()), digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (value) => value.toString(16).padStart(2, '0')).join(''); return { effect: overlay.dataset.supportEffect, progress: Number(overlay.dataset.supportProgress), recipients: Number(overlay.dataset.supportRecipients), overlayRect: overlay.getBoundingClientRect().toJSON(), mainHash: digest, events: scene.events().map((event) => event.kind), actionRect: ${JSON.stringify(actionRect)} }; })()`,
    );
    await capture(filename);
    await evaluate(
      connection,
      `globalThis.__PLAYTEST_REVIEW__[${JSON.stringify(key)}].host.finishPresentations()`,
    );
    await waitFor(
      connection,
      `document.querySelector('#playtest-${effect === "RALLY" ? "rally" : "tend"}-review .board-effects-canvas-v7')?.dataset.supportEffect === undefined`,
    );
    const after = await evaluate<Record<string, unknown>>(
      connection,
      `(async () => { const scene = globalThis.__PLAYTEST_REVIEW__[${JSON.stringify(key)}], main = scene.root.querySelector('.board-canvas-v7'); const bytes = new TextEncoder().encode(main.toDataURL()), digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (value) => value.toString(16).padStart(2, '0')).join(''); return { mainHash: digest, overlayCleared: scene.root.querySelector('.board-effects-canvas-v7').dataset.supportEffect === undefined }; })()`,
    );
    supportEvidence[effect] = {
      ...mid,
      ...after,
      stableCamera: mid.mainHash === after.mainHash,
    };
  }

  const reduced = await evaluate<Record<string, unknown>>(
    connection,
    `(async () => { const scene = globalThis.__PLAYTEST_REVIEW__.rallyReview, boundary = scene.boundary(); if (!boundary) throw new Error('accepted Rally boundary missing'); const root = document.createElement('div'); Object.assign(root.style, { position: 'fixed', left: '-1000px', width: '640px', height: '480px' }); document.body.append(root); const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts'); const host = new CanvasBoardHostV7(document); host.mount(root, { onSelection() {}, onCommand() {} }); host.update({ matchInstanceId: 99, view: boundary.afterView, offeredCommands: [], interaction: { selection: null, selectedUnitId: null, selectedAchievement: null }, interactive: false, motion: 'REDUCED', animationSpeed: 'NORMAL', presentationPaused: false, highContrast: false }); const pending = host.presentBoundary(boundary.beforeView, boundary.afterView, boundary.playerEvents); let seen = false; for (let index = 0; index < 20; index += 1) { if (root.querySelector('.board-effects-canvas-v7')?.dataset.supportEffect === 'RALLY') { seen = true; break; } await new Promise((resolve) => setTimeout(resolve, 5)); } host.finishPresentations(); await pending; const cleared = root.querySelector('.board-effects-canvas-v7')?.dataset.supportEffect === undefined; host.destroy(); root.remove(); return { seen, cleared }; })()`,
  );

  const layer = setup.layer as {
    readonly roadEntries: number;
    readonly joins: number;
    readonly fog: number;
    readonly visibleRoadPixels: number;
    readonly protectedRoadPixels: number;
    readonly outsideRoadDifferences: number;
    readonly cachedDifferences: number;
    readonly tallVariants: number;
    readonly cellPixels: Readonly<
      Record<string, { readonly visible: number; readonly protected: number }>
    >;
    readonly reconstructionDifferences: Readonly<Record<string, number>>;
  };
  assert(
    layer.roadEntries >= 3 && layer.joins >= 1 && layer.fog >= 1,
    `layer plan incomplete: ${JSON.stringify(layer)}`,
  );
  assert(
    layer.visibleRoadPixels > 0 && layer.protectedRoadPixels > 0,
    `road/body pixels missing: ${JSON.stringify(layer)}`,
  );
  assert(
    layer.outsideRoadDifferences === 0 &&
      layer.cachedDifferences === 0 &&
      layer.tallVariants === 7 &&
      Object.values(layer.reconstructionDifferences).every(
        (differences) => differences === 0,
      ),
    `terrain reconstruction/cache mismatch: ${JSON.stringify(layer)}`,
  );
  assert(
    ["forest", "fruit", "mine", "farm", "unit", "city"].every((key) => {
      const pixels = layer.cellPixels[key];
      return pixels !== undefined && pixels.protected > 0;
    }),
    `per-object Road layering failed: ${JSON.stringify(layer.cellPixels)}`,
  );
  assert(
    land.label === "Land grant for 6 Coins" && land.cost === "6",
    `Land Grant evidence failed: ${JSON.stringify(land)}`,
  );
  assert(
    cultivate.label === "Clear for farming" &&
      String(cultivate.title).includes("Fertile Ground"),
    `cultivate evidence failed: ${JSON.stringify(cultivate)}`,
  );
  const techById = Object.fromEntries(
    technology.map((entry) => [entry.id, entry]),
  );
  assert(
    techById.administration?.assetId === "portrait-original-captain-v7r10" &&
      techById.scouting?.assetId === "portrait-original-raider" &&
      techById.raiding?.assetId === "ui-action-pillage",
    `technology mapping failed: ${JSON.stringify(technology)}`,
  );
  assert(
    ["gathering", "hunting", "administration"].every(
      (id) =>
        techById[id]?.frameMode === "visible-alpha" &&
        techById[id]?.visibleInside === true,
    ),
    `technology bounds failed: ${JSON.stringify(technology)}`,
  );
  assert(
    Object.entries(supportEvidence).every(([effect, value]) => {
      const evidence = value as Record<string, unknown>;
      const rect = evidence.overlayRect as Record<string, number>;
      return (
        evidence.recipients === (effect === "RALLY" ? 2 : 1) &&
        Number(evidence.progress) >= 0.3 &&
        evidence.overlayCleared === true &&
        evidence.stableCamera === true &&
        rect.width > 0 &&
        rect.height > 0
      );
    }),
    `support evidence failed: ${JSON.stringify(supportEvidence)}`,
  );
  assert(
    reduced.seen === true && reduced.cleared === true,
    `reduced support failed: ${JSON.stringify(reduced)}`,
  );

  const screenshots = [
    "playtest-road-layering.png",
    "playtest-land-grant-cost.png",
    "playtest-clear-for-farming.png",
    "playtest-captain-tech-icons.png",
    "playtest-rally-mid-animation.png",
    "playtest-tend-mid-animation.png",
  ];
  const evidence = {
    status: "PASS",
    source: "REAL_REDUCER_PUBLIC_BOUNDARY_DOM_CANVAS",
    setup,
    land,
    cultivate,
    technology,
    support: supportEvidence,
    reduced,
    screenshots,
  };
  await writeFile(
    path.join(output, "playtest-runtime.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  process.stdout.write(`Ruleset 7 playtest browser review passed: ${output}\n`);
} catch (error) {
  primaryFailure = error;
} finally {
  try {
    await stopBrowser(browser);
    await rm(profile, {
      recursive: true,
      force: true,
      maxRetries: 6,
      retryDelay: 100,
    });
  } catch (error) {
    cleanupFailure = error;
  }
}
if (primaryFailure !== undefined) {
  if (cleanupFailure !== undefined)
    console.error(
      `Playtest browser cleanup also failed: ${errorMessage(cleanupFailure)}`,
    );
  throw primaryFailure;
}
if (cleanupFailure !== undefined) throw cleanupFailure;

async function stopBrowser(browser: ChildProcess): Promise<void> {
  if (browser.exitCode !== null || browser.signalCode !== null) return;
  browser.kill();
  if (await waitForBrowserExit(browser, 2_000)) return;
  browser.kill("SIGKILL");
  if (!(await waitForBrowserExit(browser, 2_000)))
    throw new Error("Chrome did not exit after SIGKILL");
}

async function waitForBrowserExit(
  browser: ChildProcess,
  timeoutMilliseconds: number,
): Promise<boolean> {
  if (browser.exitCode !== null || browser.signalCode !== null) return true;
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      browser.off("exit", exited);
      resolve(browser.exitCode !== null || browser.signalCode !== null);
    }, timeoutMilliseconds);
    const exited = (): void => {
      clearTimeout(timeout);
      resolve(true);
    };
    browser.once("exit", exited);
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function waitTarget(port: number, origin: string): Promise<Target> {
  for (let index = 0; index < 200; index += 1) {
    try {
      const targets = (await (
        await fetch(`http://localhost:${port}/json`)
      ).json()) as Target[];
      const target = targets.find(
        (value) => value.type === "page" && value.url.startsWith(origin),
      );
      if (target) return target;
    } catch {
      // Chrome may still be starting.
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
  for (let index = 0; index < 400; index += 1) {
    if (await evaluate<boolean>(connection, `Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Browser condition timed out: ${expression}`);
}
