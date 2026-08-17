import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

interface DebugTarget {
  readonly type: string;
  readonly url: string;
  readonly webSocketDebuggerUrl: string;
}

interface ProtocolMessage {
  readonly id?: number;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly close: () => void;
};

const baseUrl =
  process.argv.slice(2).find((argument) => !argument.startsWith("--")) ??
  "http://localhost:6173";
const forestCatapultOnly = process.argv.includes("--forest-catapult-only");
const reviewRoot = path.join(process.cwd(), "art/feedback/reviews");
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9237;
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-render-review-${process.pid}`
  : path.join(
      process.env.TMPDIR ?? "/tmp",
      `pulp-wars-render-review-${process.pid}`,
    );

await mkdir(reviewRoot, { recursive: true });
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "--window-size=1440,1000",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");

  await setViewport(connection, 1440, 1000, 1, false);
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'hub'`,
  );
  if (!forestCatapultOnly) {
    await renderFixture(connection, false);
    await waitForFixtureCanvas(connection, 1440, 1000, 1);
    await waitForAcceptedFixtureArt(connection);
    await delay(400);
    await capture(connection, "second-calibration-desktop.png");
    await renderFixture(connection, true);
    await waitForHealthFixtureArt(connection);
    await delay(400);
    await capture(connection, "health-cycle-desktop.png");
  }
  await renderForestCatapultProductionFixture(connection);
  await waitForFixtureCanvas(connection, 1440, 1000, 1);
  await waitForForestCatapultProduction(connection);
  await delay(400);
  await capture(connection, "forest-catapult-production-desktop-1440x1000.png");
  await renderCandyProductionFixture(connection);
  await waitForFixtureCanvas(connection, 1440, 1000, 1);
  await waitForCandyProduction(connection);
  await delay(400);
  await capture(connection, "candy-production-desktop-1440x1000.png");

  await setViewport(connection, 390, 844, 2, true);
  if (!forestCatapultOnly) {
    await renderFixture(connection, false);
    await waitForFixtureCanvas(connection, 390, 844, 2);
    await waitForAcceptedFixtureArt(connection);
    await delay(400);
    await capture(connection, "second-calibration-mobile-390-dpr2.png");
    await renderFixture(connection, true);
    await waitForHealthFixtureArt(connection);
    await delay(400);
    await capture(connection, "health-cycle-mobile-390x844-dpr2.png");
  }
  await renderForestCatapultProductionFixture(connection);
  await waitForFixtureCanvas(connection, 390, 844, 2);
  await waitForForestCatapultProduction(connection);
  await delay(400);
  await capture(
    connection,
    "forest-catapult-production-mobile-390x844-dpr2.png",
  );
  await renderCandyProductionFixture(connection);
  await waitForFixtureCanvas(connection, 390, 844, 2);
  await waitForCandyProduction(connection);
  await delay(400);
  await capture(connection, "candy-production-mobile-390x844-dpr2.png");

  const measurements = await evaluate<{
    readonly cssWidth: number;
    readonly cssHeight: number;
    readonly backingWidth: number;
    readonly backingHeight: number;
    readonly devicePixelRatio: number;
  }>(
    connection,
    `(() => { const canvas = document.querySelector('.board-canvas'); if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing review canvas'); const rect = canvas.getBoundingClientRect(); return { cssWidth: rect.width, cssHeight: rect.height, backingWidth: canvas.width, backingHeight: canvas.height, devicePixelRatio }; })()`,
  );
  console.log(
    `Rendering review screenshots written to ${reviewRoot}; mobile canvas ${JSON.stringify(measurements)}`,
  );
  await writeForestCatapultEvidence(measurements);
  await writeCandyProductionEvidence(measurements);
  connection.close();
} finally {
  browser.kill();
}

async function renderForestCatapultProductionFixture(
  connection: Connection,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [engine, canvas] = await Promise.all([
        import('/src/engine/index.ts'),
        import('/src/render/canvas/board-host.ts')
      ]);
      const result = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 72719, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', aiMode: 'RIVAL', humanColor: 'CORAL', factions: ['ORIGINAL', 'ORIGINAL'] });
      if (!result.ok) throw new Error(result.error.code);
      const human = result.state.players.find((player) => player.controller === 'HUMAN');
      const baseCity = result.state.cities.find((city) => city.ownerId === human?.id);
      const baseUnit = result.state.units.find((unit) => unit.ownerId === human?.id);
      if (!human || !baseCity || !baseUnit) throw new Error('Missing fallback fixture entities');
      const rules = engine.requireRuleset(result.state.rulesetId);
      const catapultRule = rules.units.CATAPULT;
      const explored = result.state.board.tiles
        .filter((tile) => tile.at.x < 9 && tile.at.y < 9)
        .map((tile) => tile.at);
      const forest = new Set([
        '2,2', '3,2', '4,2', '5,2', '6,2', '7,2', '8,2',
        '2,3', '4,3', '6,3', '8,3',
        '2,4', '3,4', '4,4', '5,4', '6,4', '7,4', '8,4',
        '2,5', '4,5', '6,5', '8,5',
        '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6'
      ]);
      const animals = new Set(['3,2', '7,2', '4,4', '8,5']);
      const mills = new Set(['2,3', '6,3', '5,6']);
      const catapultAt = { x: 5, y: 4 };
      const city = { ...baseCity, at: { x: 1, y: 1 }, level: 3, population: 2, isCapital: true };
      const catapult = {
        ...baseUnit,
        id: baseUnit.id + 401,
        homeCityId: city.id,
        type: 'CATAPULT',
        at: catapultAt,
        hp: catapultRule.maxHp,
        maxHp: catapultRule.maxHp,
        ready: true,
        activation: { moved: false, attacked: false, recovered: false, captured: false, handled: false, escapeAvailable: false }
      };
      const state = {
        ...result.state,
        nextEntityId: catapult.id + 1,
        activeSeatIndex: result.state.turnOrder.findIndex((id) => id === human.id),
        board: {
          ...result.state.board,
          tiles: result.state.board.tiles.map((tile) => {
            const key = tile.at.x + ',' + tile.at.y;
            const isCity = tile.at.x === city.at.x && tile.at.y === city.at.y;
            return {
              ...tile,
              terrain: forest.has(key) ? 'FOREST' : 'GRASS',
              resource: animals.has(key) ? 'ANIMAL' : null,
              improvement: mills.has(key) ? 'LUMBER_MILL' : null,
              site: isCity ? 'CAPITAL' : null,
              territoryCenter: isCity ? city.at : null,
              territoryCityId: isCity ? city.id : null
            };
          })
        },
        players: result.state.players.map((player) => player.id === human.id ? {
          ...player,
          explored,
          stars: 30,
          researchedTechs: ['CLIMBING', 'RIDING', 'HUNTING', 'ORGANIZATION', 'MINING', 'FORESTRY', 'ARCHERY', 'STRATEGY', 'MATHEMATICS']
        } : { ...player, status: 'ELIMINATED' }),
        cities: [city],
        units: [catapult],
        pendingChoice: null,
        outcome: null
      };
      const view = engine.viewFor(state, human.id);
      globalThis.__pulpRenderingReviewHost?.destroy?.();
      const root = document.querySelector('#app');
      if (!root) throw new Error('Missing app root');
      root.replaceChildren();
      Object.assign(document.documentElement.style, { width: '100%', height: '100%', overflow: 'hidden' });
      Object.assign(document.body.style, { width: '100%', height: '100%', margin: '0', overflow: 'hidden', background: '#233b39' });
      Object.assign(root.style, { position: 'fixed', inset: '0', width: '100%', height: '100%' });
      const container = document.createElement('div');
      container.className = 'board-host';
      Object.assign(container.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
      root.append(container);
      const host = new canvas.CanvasBoardHost(document);
      host.mount(container, {
        onSelection() {},
        onInspect() {},
        onCommand() { throw new Error('View-only review dispatched a command'); },
        onZoom() {}
      });
      host.update({ matchInstanceId: 72719, view, interactive: false, selected: null });
      globalThis.__pulpRenderingReviewHost = host;
      globalThis.__pulpForestCatapultProduction = {
        forestCount: view.board.tiles.filter((tile) => tile.terrain === 'FOREST').length,
        animalCount: view.board.tiles.filter((tile) => tile.resource === 'ANIMAL').length,
        lumberCount: view.board.tiles.filter((tile) => tile.improvement === 'LUMBER_MILL').length,
        catapultCount: view.units.filter((unit) => unit.type === 'CATAPULT').length,
        fogCount: view.board.tiles.filter((tile) => !tile.explored).length
      };
      return true;
    })()`,
    true,
  );
}

async function renderCandyProductionFixture(
  connection: Connection,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [engine, canvas] = await Promise.all([
        import('/src/engine/index.ts'),
        import('/src/render/canvas/board-host.ts')
      ]);
      const result = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 61826, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', aiMode: 'RIVAL', humanColor: 'CORAL', factions: ['CANDY', 'ORIGINAL'] });
      if (!result.ok) throw new Error(result.error.code);
      const human = result.state.players.find((player) => player.controller === 'HUMAN');
      const enemy = result.state.players.find((player) => player.controller === 'AI');
      const humanCityBase = result.state.cities.find((city) => city.ownerId === human?.id);
      const enemyCityBase = result.state.cities.find((city) => city.ownerId === enemy?.id);
      const humanUnitBase = result.state.units.find((unit) => unit.ownerId === human?.id);
      const enemyUnitBase = result.state.units.find((unit) => unit.ownerId === enemy?.id);
      if (!human || !enemy || !humanCityBase || !enemyCityBase || !humanUnitBase || !enemyUnitBase) throw new Error('Missing Candy fixture entities');
      const humanCity = { ...humanCityBase, at: { x: 1, y: 1 }, level: 4, population: 3, isCapital: true };
      const enemyCity = { ...enemyCityBase, at: { x: 9, y: 8 }, level: 3, population: 2, isCapital: true };
      const placements = [
        [human, humanCity, humanUnitBase, 9001, 'WARRIOR', 2, 2, 10],
        [human, humanCity, humanUnitBase, 9002, 'ARCHER', 4, 2, 7],
        [human, humanCity, humanUnitBase, 9003, 'DEFENDER', 6, 2, 15],
        [human, humanCity, humanUnitBase, 9004, 'RIDER', 8, 2, 10],
        [human, humanCity, humanUnitBase, 9005, 'CATAPULT', 5, 4, 10],
        [enemy, enemyCity, enemyUnitBase, 9011, 'WARRIOR', 2, 6, 10],
        [enemy, enemyCity, enemyUnitBase, 9012, 'ARCHER', 4, 6, 10],
        [enemy, enemyCity, enemyUnitBase, 9013, 'DEFENDER', 6, 6, 15],
        [enemy, enemyCity, enemyUnitBase, 9014, 'RIDER', 8, 6, 10],
        [enemy, enemyCity, enemyUnitBase, 9015, 'CATAPULT', 7, 4, 10]
      ];
      const units = placements.map(([owner, city, base, id, type, x, y, hp]) => ({
        ...base,
        id,
        ownerId: owner.id,
        homeCityId: city.id,
        capacityExempt: false,
        type,
        at: { x, y },
        hp,
        maxHp: hp,
        ready: owner.id === human.id,
        activation: { moved: false, attacked: false, recovered: false, captured: false, handled: false, escapeAvailable: false, specialActed: false }
      }));
      const walls = [
        { id: 9021, ownerId: human.id, at: { x: 3, y: 4 }, hp: 10 },
        { id: 9022, ownerId: human.id, at: { x: 4, y: 4 }, hp: 5 },
        { id: 9023, ownerId: human.id, at: { x: 6, y: 4 }, hp: 1 }
      ];
      const explored = result.state.board.tiles.filter((tile) => tile.at.x < 10).map((tile) => tile.at);
      const mountains = new Set(['3,3', '3,4', '3,5', '7,3', '7,5']);
      const forests = new Set(['4,3', '4,4', '4,5', '8,3', '8,4', '8,5']);
      const state = {
        ...result.state,
        nextEntityId: 9030,
        activeSeatIndex: result.state.turnOrder.findIndex((id) => id === human.id),
        board: {
          ...result.state.board,
          tiles: result.state.board.tiles.map((tile) => {
            const key = tile.at.x + ',' + tile.at.y;
            const city = tile.at.x === humanCity.at.x && tile.at.y === humanCity.at.y ? humanCity : tile.at.x === enemyCity.at.x && tile.at.y === enemyCity.at.y ? enemyCity : null;
            return {
              ...tile,
              terrain: mountains.has(key) ? 'MOUNTAIN' : forests.has(key) ? 'FOREST' : 'GRASS',
              resource: key === '6,4' ? 'FRUIT' : key === '3,4' ? 'ORE' : null,
              improvement: key === '4,4' ? 'LUMBER_MILL' : null,
              site: city ? 'CAPITAL' : null,
              territoryCenter: city?.at ?? null,
              territoryCityId: city?.id ?? null
            };
          })
        },
        players: result.state.players.map((player) => player.id === human.id ? {
          ...player,
          explored,
          stars: 30,
          researchedTechs: ['CLIMBING', 'RIDING', 'HUNTING', 'ORGANIZATION', 'MINING', 'FORESTRY', 'ARCHERY', 'STRATEGY', 'MATHEMATICS']
        } : { ...player, explored }),
        cities: [humanCity, enemyCity],
        units,
        chocolateWalls: walls,
        pendingChoice: null,
        outcome: null
      };
      const view = engine.viewFor(state, human.id);
      globalThis.__pulpRenderingReviewHost?.destroy?.();
      const root = document.querySelector('#app');
      if (!root) throw new Error('Missing app root');
      root.replaceChildren();
      Object.assign(document.documentElement.style, { width: '100%', height: '100%', overflow: 'hidden' });
      Object.assign(document.body.style, { width: '100%', height: '100%', margin: '0', overflow: 'hidden', background: '#233b39' });
      Object.assign(root.style, { position: 'fixed', inset: '0', width: '100%', height: '100%' });
      const container = document.createElement('div');
      container.className = 'board-host';
      Object.assign(container.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
      root.append(container);
      const host = new canvas.CanvasBoardHost(document);
      host.mount(container, {
        onSelection() {},
        onInspect() {},
        onCommand() { throw new Error('View-only Candy review dispatched a command'); },
        onZoom() {}
      });
      host.update({ matchInstanceId: 61826, view, interactive: false, selected: null });
      globalThis.__pulpRenderingReviewHost = host;
      globalThis.__pulpCandyProduction = {
        candyUnits: view.units.filter((unit) => view.players.find((player) => player.id === unit.ownerId)?.faction === 'CANDY').length,
        originalUnits: view.units.filter((unit) => view.players.find((player) => player.id === unit.ownerId)?.faction === 'ORIGINAL').length,
        walls: view.chocolateWalls.length,
        fogCount: view.board.tiles.filter((tile) => !tile.explored).length
      };
      return true;
    })()`,
    true,
  );
}

async function renderFixture(
  connection: Connection,
  includeHealthCycle: boolean,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [engine, canvas] = await Promise.all([
        import('/src/engine/index.ts'),
        import('/src/render/canvas/board-host.ts')
      ]);
      const result = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 6173, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', aiMode: 'RIVAL', humanColor: 'CORAL', factions: ['ORIGINAL', 'ORIGINAL'] });
      if (!result.ok) throw new Error(result.error.code);
      const human = result.state.players.find((player) => player.controller === 'HUMAN');
      const baseCity = result.state.cities.find((city) => city.ownerId === human?.id);
      const baseUnit = result.state.units.find((unit) => unit.ownerId === human?.id);
      const enemyUnit = result.state.units.find((unit) => unit.ownerId !== human?.id);
      if (!human || !baseCity || !baseUnit || !enemyUnit) throw new Error('Missing fixture entities');

      const explored = [];
      for (let y = 1; y <= 9; y += 1) {
        for (let x = 1; x <= 10; x += 1) explored.push({ x, y });
      }
      const villageAt = { x: 1, y: 1 };
      const cityFixtures = [
        { ...baseCity, at: { x: 3, y: 3 }, level: 1, population: 0, isCapital: false },
        { ...baseCity, id: baseCity.id + 101, at: { x: 5, y: 5 }, level: 2, population: 1, isCapital: false },
        { ...baseCity, id: baseCity.id + 102, at: { x: 7, y: 7 }, level: 3, population: 2, isCapital: true }
      ];
      const unitFixtures = ${includeHealthCycle ? "[\n        { ...baseUnit, at: cityFixtures[0].at, hp: baseUnit.maxHp, ready: true },\n        { ...enemyUnit, at: { x: 7, y: 5 }, hp: Math.max(1, enemyUnit.maxHp - 4), ready: false }\n      ]" : "[]"};
      const mountainKeys = new Set([
        '2,2', '4,2', '6,2', '8,2',
        '6,3', '8,3',
        '2,4', '4,4', '6,4', '8,4',
        '2,5', '8,5'
      ]);
      const state = {
        ...result.state,
        nextEntityId: baseCity.id + 200,
        activeSeatIndex: result.state.turnOrder.findIndex((id) => id === human.id),
        board: {
          ...result.state.board,
          tiles: result.state.board.tiles.map((tile) => {
            const key = tile.at.x + ',' + tile.at.y;
            const city = cityFixtures.find((candidate) => candidate.at.x === tile.at.x && candidate.at.y === tile.at.y);
            const isVillage = tile.at.x === villageAt.x && tile.at.y === villageAt.y;
            return {
              ...tile,
              terrain: mountainKeys.has(key) ? 'MOUNTAIN' : 'GRASS',
              resource: null,
              improvement: null,
              site: isVillage ? 'VILLAGE' : city ? (city.isCapital ? 'CAPITAL' : 'CITY') : null,
              territoryCenter: city?.at ?? null,
              territoryCityId: city?.id ?? null
            };
          })
        },
        players: result.state.players.map((player) => player.id === human.id ? {
          ...player,
          explored,
          stars: 20,
          researchedTechs: ['CLIMBING', 'RIDING', 'HUNTING', 'ORGANIZATION', 'MINING', 'ARCHERY', 'STRATEGY']
        } : { ...player, status: 'ELIMINATED' }),
        cities: cityFixtures,
        units: unitFixtures,
        pendingChoice: null,
        outcome: null
      };
      const view = engine.viewFor(state, human.id);

      globalThis.__pulpRenderingReviewHost?.destroy?.();
      const root = document.querySelector('#app');
      if (!root) throw new Error('Missing app root');
      root.replaceChildren();
      Object.assign(document.documentElement.style, { width: '100%', height: '100%', overflow: 'hidden' });
      Object.assign(document.body.style, { width: '100%', height: '100%', margin: '0', overflow: 'hidden', background: '#233b39' });
      Object.assign(root.style, { position: 'fixed', inset: '0', width: '100%', height: '100%' });
      const container = document.createElement('div');
      container.className = 'board-host';
      Object.assign(container.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
      root.append(container);
      const host = new canvas.CanvasBoardHost(document);
      let selected = null;
      const update = () => host.update({ matchInstanceId: 6173, view, interactive: false, selected });
      host.mount(container, {
        onSelection(selection) { selected = selection; update(); },
        onInspect() {},
        onCommand() { throw new Error('View-only review dispatched a command'); },
        onZoom() {}
      });
      update();
      if (${String(includeHealthCycle)}) {
        const friendly = unitFixtures[0];
        const enemy = unitFixtures[1];
        host.activate(friendly.at);
        if (selected?.kind !== 'UNIT' || selected.unitId !== friendly.id) throw new Error('First activation did not select friendly unit');
        host.activate(friendly.at);
        if (selected?.kind !== 'CITY' || selected.cityId !== cityFixtures[0].id) throw new Error('Second activation did not select underlying city');
        host.activate(friendly.at);
        if (selected?.kind !== 'UNIT' || selected.unitId !== friendly.id) throw new Error('Third activation did not return to friendly unit');
        host.activate(enemy.at);
        if (selected?.kind !== 'UNIT' || selected.unitId !== enemy.id) throw new Error('Different coordinate did not select enemy first');
        host.activate(friendly.at);
        if (selected?.kind !== 'UNIT' || selected.unitId !== friendly.id) throw new Error('Coordinate reset did not restart friendly unit first');
      }
      globalThis.__pulpRenderingReviewHost = host;
      return true;
    })()`,
    true,
  );
}

async function waitForHealthFixtureArt(connection: Connection): Promise<void> {
  const endings = [
    "/assets/pixellab/units/warrior.png",
    "/assets/pixellab/units/archer.png",
    "/assets/pixellab/units/defender.png",
    "/assets/pixellab/units/rider.png",
  ];
  await waitForExpression(
    connection,
    `(() => { const resources = performance.getEntriesByType('resource').map((entry) => entry.name); return ${JSON.stringify(endings)}.some((ending) => resources.some((name) => name.endsWith(ending))); })()`,
  );
}

async function waitForForestCatapultProduction(
  connection: Connection,
): Promise<void> {
  await waitForExpression(
    connection,
    `(() => {
      const fixture = globalThis.__pulpForestCatapultProduction;
      if (!fixture || fixture.forestCount !== 29 || fixture.animalCount !== 4 || fixture.lumberCount !== 3 || fixture.catapultCount !== 1 || fixture.fogCount !== 40) return false;
      const pending = [
        '/assets/pixellab/units/catapult.png',
        '/assets/pixellab/terrain/forest-1.png',
        '/assets/pixellab/terrain/forest-2.png',
        '/assets/pixellab/terrain/forest-3.png',
        '/assets/pixellab/terrain/forest-4.png',
        '/assets/pixellab/terrain/animal.png',
        '/assets/pixellab/buildings/lumber-mill.png'
      ];
      const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
      if (!pending.every((ending) => resources.some((name) => name.endsWith(ending)))) return false;
      const canvas = document.querySelector('.board-canvas');
      return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
    })()`,
  );
}

async function waitForCandyProduction(connection: Connection): Promise<void> {
  await waitForExpression(
    connection,
    `(() => {
      const fixture = globalThis.__pulpCandyProduction;
      if (!fixture || fixture.candyUnits !== 5 || fixture.originalUnits !== 5 || fixture.walls !== 3 || fixture.fogCount !== 11) return false;
      const pending = [
        '/assets/pixellab/units/candy-warrior.png',
        '/assets/pixellab/units/candy-gumball-guard.png',
        '/assets/pixellab/units/candy-choco-engineer.png',
        '/assets/pixellab/units/candy-donut.png',
        '/assets/pixellab/units/catapult.png',
        '/assets/pixellab/buildings/chocolate-wall.png'
      ];
      const resources = performance.getEntriesByType('resource').map((entry) => entry.name);
      if (!pending.every((ending) => resources.some((name) => name.endsWith(ending)))) return false;
      const canvas = document.querySelector('.board-canvas');
      return canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0;
    })()`,
  );
}

async function waitForAcceptedFixtureArt(
  connection: Connection,
): Promise<void> {
  const endings = [
    "/assets/pixellab/buildings/village.png",
    "/assets/pixellab/buildings/city-1.png",
    "/assets/pixellab/buildings/city-2.png",
    "/assets/pixellab/buildings/city-3.png",
    "/assets/pixellab/terrain/mountain-1.png",
    "/assets/pixellab/terrain/mountain-2.png",
    "/assets/pixellab/terrain/mountain-3.png",
  ];
  await waitForExpression(
    connection,
    `(() => { const resources = performance.getEntriesByType('resource').map((entry) => entry.name); return ${JSON.stringify(endings)}.every((ending) => resources.some((name) => name.endsWith(ending))); })()`,
  );
}

async function waitForFixtureCanvas(
  connection: Connection,
  width: number,
  height: number,
  devicePixelRatio: number,
): Promise<void> {
  await waitForExpression(
    connection,
    `(() => { const canvas = document.querySelector('.board-canvas'); const rect = canvas?.getBoundingClientRect(); return !document.querySelector('.app-shell') && canvas instanceof HTMLCanvasElement && rect?.width === ${width} && rect.height === ${height} && canvas.width === ${width * devicePixelRatio} && canvas.height === ${height * devicePixelRatio}; })()`,
  );
}

async function setViewport(
  connection: Connection,
  width: number,
  height: number,
  deviceScaleFactor: number,
  mobile: boolean,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor,
    mobile,
  });
}

async function capture(
  connection: Connection,
  filename: string,
): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error(`Chrome returned no screenshot data for ${filename}`);
  await writeFile(
    path.join(reviewRoot, filename),
    Buffer.from(response.data, "base64"),
  );
}

async function writeForestCatapultEvidence(measurements: {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly backingWidth: number;
  readonly backingHeight: number;
  readonly devicePixelRatio: number;
}): Promise<void> {
  const productionAssets = [
    ["terrain-forest-1", "public/assets/pixellab/terrain/forest-1.png"],
    ["terrain-forest-2", "public/assets/pixellab/terrain/forest-2.png"],
    ["terrain-forest-3", "public/assets/pixellab/terrain/forest-3.png"],
    ["terrain-forest-4", "public/assets/pixellab/terrain/forest-4.png"],
    ["terrain-animal", "public/assets/pixellab/terrain/animal.png"],
    [
      "building-lumber-mill",
      "public/assets/pixellab/buildings/lumber-mill.png",
    ],
    ["unit-catapult", "public/assets/pixellab/units/catapult.png"],
    ["ui-tech-forestry", "public/assets/pixellab/ui/tech-forestry.png"],
    ["ui-tech-mathematics", "public/assets/pixellab/ui/tech-mathematics.png"],
  ] as const;
  const acceptedAssets = [];
  for (const [id, assetPath] of productionAssets) {
    const data = await readFile(path.join(process.cwd(), assetPath));
    acceptedAssets.push({
      id,
      path: assetPath,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    });
  }
  const quarantinedSources = [
    {
      file: "terrain-forest-1-27ad54bbbddb.png",
      reason: "ground contacts ended 16 source pixels above y222",
    },
    {
      file: "terrain-forest-2-f2f9c52e2fab.png",
      reason: "duplicated Forest 1 and added a detached resource-like crown",
    },
    {
      file: "terrain-forest-2-3f9d20e3a0e6.png",
      reason: "strong low-wide silhouette but ground contacts ended at y199",
    },
    {
      file: "terrain-forest-2-56771fa745c8.png",
      reason: "duplicated Forest 1 and retained a resource-like minor crown",
    },
    {
      file: "terrain-forest-4-9b9dfb1ca381.png",
      reason: "duplicated Forest 2 instead of breaking map repetition",
    },
  ];
  const quarantinedAttempts = [];
  for (const attempt of quarantinedSources) {
    const quarantinePath = `art/pixellab/quarantine/${attempt.file}`;
    const data = await readFile(path.join(process.cwd(), quarantinePath));
    quarantinedAttempts.push({
      path: quarantinePath,
      reason: attempt.reason,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    });
  }
  const unwiredGenerationFailures = [
    {
      jobId: "1d8fd112-f088-441a-b711-dc539484a5a2",
      reason: "could not align ground contact to y222 within hard bounds",
    },
    {
      jobId: "96e02e25-0a89-4ceb-9353-6b4cfd86fe59",
      reason: "could not align ground contact to y222 within hard bounds",
    },
  ];
  const captures = [
    {
      path: "art/feedback/reviews/forest-catapult-production-desktop-1440x1000.png",
      viewport: { width: 1440, height: 1000, devicePixelRatio: 1 },
    },
    {
      path: "art/feedback/reviews/forest-catapult-production-mobile-390x844-dpr2.png",
      viewport: { width: 390, height: 844, devicePixelRatio: 2 },
    },
  ];
  const evidence = [];
  for (const capture of captures) {
    const data = await readFile(path.join(process.cwd(), capture.path));
    evidence.push({
      ...capture,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    });
  }
  await writeFile(
    path.join(reviewRoot, "forest-catapult-production-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        productionRasterStatus: "ACCEPTED_PIXELLAB",
        accepted: 9,
        acceptedAssets,
        quarantinedRejected: quarantinedAttempts.length,
        quarantinedAttempts,
        unwiredFailed: unwiredGenerationFailures.length,
        unwiredGenerationFailures,
        productionFixture: {
          forests: 29,
          animals: 4,
          lumberMills: 3,
          catapults: 1,
          fogTiles: 40,
        },
        mobileCanvas: measurements,
        evidence,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function writeCandyProductionEvidence(measurements: {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly backingWidth: number;
  readonly backingHeight: number;
  readonly devicePixelRatio: number;
}): Promise<void> {
  const ids = [
    "unit-candy-warrior",
    "unit-candy-gumball-guard",
    "unit-candy-choco-engineer",
    "unit-candy-donut",
    "building-chocolate-wall",
    "ui-faction-candy-badge",
    "ui-faction-candy-hero",
    "ui-action-kamikaze-roll",
    "ui-action-build-chocolate-wall",
    "ui-action-candify",
    "ui-action-choose-candify-city",
  ] as const;
  const generated = JSON.parse(
    await readFile(
      path.join(process.cwd(), "scripts/art/pixellab-generated.json"),
      "utf8",
    ),
  ) as {
    readonly records: Readonly<
      Record<
        string,
        {
          readonly status: string;
          readonly outputSha256?: string;
          readonly candidateSha256?: string;
          readonly rejectedAttempts?: readonly {
            readonly candidate: string;
            readonly candidateSha256?: string;
            readonly notes?: string;
          }[];
        }
      >
    >;
  };
  const manifest = JSON.parse(
    await readFile(
      path.join(process.cwd(), "scripts/art/pixellab-manifest.json"),
      "utf8",
    ),
  ) as {
    readonly recipes: readonly {
      readonly id: string;
      readonly output: string;
    }[];
  };
  const acceptedAssets = [];
  const quarantinedAttempts = [];
  for (const id of ids) {
    const recipe = manifest.recipes.find((candidate) => candidate.id === id);
    const record = generated.records[id];
    if (recipe === undefined || record?.status !== "ACCEPTED")
      throw new Error(`Candy evidence missing accepted asset ${id}`);
    const data = await readFile(path.join(process.cwd(), recipe.output));
    acceptedAssets.push({
      id,
      path: recipe.output,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    });
    for (const attempt of record.rejectedAttempts ?? []) {
      const data = await readFile(path.join(process.cwd(), attempt.candidate));
      quarantinedAttempts.push({
        id,
        path: attempt.candidate,
        reason: attempt.notes ?? "Rejected during visual review",
        sha256: createHash("sha256").update(data).digest("hex"),
        bytes: data.byteLength,
      });
    }
  }
  const captures = [
    {
      path: "art/feedback/reviews/candy-production-desktop-1440x1000.png",
      viewport: { width: 1440, height: 1000, devicePixelRatio: 1 },
    },
    {
      path: "art/feedback/reviews/candy-production-mobile-390x844-dpr2.png",
      viewport: { width: 390, height: 844, devicePixelRatio: 2 },
    },
  ];
  const evidence = [];
  for (const capture of captures) {
    const data = await readFile(path.join(process.cwd(), capture.path));
    evidence.push({
      ...capture,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    });
  }
  await writeFile(
    path.join(reviewRoot, "candy-production-evidence.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        productionRasterStatus: "ACCEPTED_PIXELLAB",
        accepted: acceptedAssets.length,
        acceptedAssets,
        quarantinedRejected: quarantinedAttempts.length,
        quarantinedAttempts,
        apiFailures: [],
        localPipelineFailures: [
          {
            id: "ui-action-candify",
            reason:
              "First submission was skipped because its not-yet-accepted style reference was unavailable; no PixelLab request was made.",
          },
        ],
        productionFixture: {
          candyUnits: 5,
          originalUnits: 5,
          chocolateWalls: 3,
          wallHpStates: [10, 5, 1],
          fogTiles: 11,
        },
        mobileCanvas: measurements,
        evidence,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function evaluate<T>(
  connection: Connection,
  expression: string,
  awaitPromise = false,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise,
    returnByValue: true,
  })) as {
    readonly result?: { readonly value?: T };
    readonly exceptionDetails?: {
      readonly exception?: { readonly description?: string };
    };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate<boolean>(connection, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`Chrome review timed out waiting for: ${expression}`);
}

async function waitForTarget(
  debugPort: number,
  expectedUrl: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const target = targets.find(
          (candidate) =>
            candidate.type === "page" && candidate.url.startsWith(expectedUrl),
        );
        if (target !== undefined) return target;
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
    {
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
    }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (request === undefined) return;
    pending.delete(message.id);
    if (message.error !== undefined)
      request.reject(new Error(message.error.message ?? "CDP command failed"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}): Promise<unknown> {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close(): void {
      socket.close();
    },
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
