import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

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
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

const outputFlag = process.argv.find((value) => value.startsWith("--output="));
const outputIndex = process.argv.indexOf("--output");
const outputRoot = path.resolve(
  outputFlag?.slice(9) ??
    (outputIndex >= 0 ? process.argv[outputIndex + 1] : undefined) ??
    path.join(tmpdir(), `pulp-wars-city-buff-review-${process.pid}`),
);
const baseUrl =
  process.argv.find((value) => value.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to the review headless browser");
const profile = await mkdtemp(
  path.join(tmpdir(), "pulp-wars-city-buff-browser-"),
);
const port = 10_860 + (process.pid % 100);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "--window-size=1440,900",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  await mkdir(outputRoot).catch(async (error: unknown) => {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "EEXIST"
    )
      throw error;
    if ((await readdir(outputRoot)).length > 0)
      throw new Error(`Review output directory is not empty: ${outputRoot}`);
  });
  const target = await waitForTarget(port, new URL(baseUrl).origin);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await waitFor(
    connection,
    "document.querySelector('[data-v7-setup]') && globalThis.__PULP_WARS_APP__?.controller",
  );
  await evaluate(
    connection,
    "document.querySelector('[data-action=launch]').click()",
  );
  await waitFor(
    connection,
    "globalThis.__PULP_WARS_APP__?.controller.snapshot().view?.units.length >= 1",
  );
  const evidence = await evaluate<Record<string, unknown>>(
    connection,
    `(async () => {
      const { buildBoardRenderPlanV7, createBoardImageResolverV7, drawBoardV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const source = globalThis.__PULP_WARS_APP__.controller;
      const original = source.snapshot();
      const raw = original.view;
      const baseCity = raw.cities[0], secondBaseCity = raw.cities[1] ?? raw.cities[0];
      const firstUnit = raw.units[0];
      if (!baseCity || !secondBaseCity || !firstUnit) throw new Error('Review fixture missing');
      const secondUnit = raw.units[1] ?? { ...firstUnit, id: firstUnit.id + 10000 };
      const positions = {
        emptyForge: { x: 0, y: 1 }, forge: { x: 1, y: 1 }, forest: { x: 2, y: 1 },
        populatedCity: { x: 3, y: 1 }, emptyCity: { x: 4, y: 1 }, inspired: { x: 5, y: 1 }, normal: { x: 6, y: 1 },
      };
      const key = at => at.x + ',' + at.y;
      const targetKeys = new Set(Object.values(positions).map(key));
      const populatedCity = { ...baseCity, id: baseCity.id, at: positions.populatedCity, ownerId: raw.viewer.id, level: 3, population: 2 };
      const emptyCity = { ...secondBaseCity, id: secondBaseCity.id === baseCity.id ? baseCity.id + 10000 : secondBaseCity.id, at: positions.emptyCity, ownerId: raw.viewer.id, level: 2, population: 0, isCapital: false };
      const units = [
        { ...firstUnit, at: positions.inspired, form: 'LAND', activation: { ...firstUnit.activation, inspired: true, attacksUsed: 0 } },
        { ...secondUnit, at: positions.normal, form: 'LAND', activation: { ...secondUnit.activation, inspired: false, attacksUsed: 0 } },
      ];
      const firstStats = raw.unitStats.find(stats => stats.unitId === firstUnit.id);
      const secondStats = raw.unitStats.find(stats => stats.unitId === secondUnit.id) ?? (firstStats ? { ...firstStats, unitId: secondUnit.id } : undefined);
      if (!firstStats || !secondStats) throw new Error('Review stats missing');
      const inspiredStats = {
        ...firstStats,
        statuses: ['Inspired: +1 next Attack'],
        stats: firstStats.stats.map(stat => stat.id === 'ATTACK' ? { ...stat, modifiers: [...stat.modifiers, { value: { numerator: 2, denominator: 2 }, source: 'INSPIRED', sourceLabel: 'Inspired', description: 'Captain Rally adds 1 Attack to the next attack this turn.' }] } : stat),
      };
      const view = {
        ...raw,
        cities: [populatedCity, emptyCity],
        units,
        unitStats: [inspiredStats, { ...secondStats, statuses: [] }],
        improvementValues: [
          { at: positions.emptyForge, improvement: 'FORGE', level: 0, measure: 'POPULATION', contributingTiles: [] },
          { at: positions.forge, improvement: 'FORGE', level: 3, measure: 'POPULATION', contributingTiles: [] },
        ],
        treasureChests: [],
        board: {
          ...raw.board,
          tiles: raw.board.tiles.map(tile => {
            const at = tile.at;
            if (!targetKeys.has(key(at))) return { ...tile, explored: true, resource: null, improvement: null, site: null, road: false };
            const forestForge = key(at) === key(positions.emptyForge) || key(at) === key(positions.forge);
            const ordinaryForest = key(at) === key(positions.forest);
            const cityId = key(at) === key(positions.populatedCity) ? populatedCity.id : key(at) === key(positions.emptyCity) ? emptyCity.id : null;
            return { ...tile, explored: true, biome: forestForge || ordinaryForest ? 'WOODLAND' : 'PLAINS', terrain: forestForge || ordinaryForest ? 'FOREST' : 'GRASS', resource: null, improvement: forestForge ? 'FORGE' : null, site: null, road: false, territoryCityId: cityId, territoryOwnerId: raw.viewer.id };
          }),
        },
      };
      const fullPlan = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null });
      const plan = { ...fullPlan, entries: fullPlan.entries.filter(entry => targetKeys.has(key(entry.at))) };
      const terrainByCell = Object.fromEntries(plan.entries.filter(entry => entry.kind === 'TERRAIN').map(entry => [key(entry.at), entry.assetId]));
      if (!terrainByCell[key(positions.emptyForge)]?.includes('grass') || !terrainByCell[key(positions.forge)]?.includes('grass') || !terrainByCell[key(positions.forest)]?.includes('forest')) throw new Error('Forest Forge canopy contract failed');
      const statuses = plan.entries.filter(entry => entry.kind === 'STATUS');
      if (statuses.length !== 1 || statuses[0].statusId !== 'ui-status-inspired' || key(statuses[0].at) !== key(positions.inspired)) throw new Error('Inspired marker contract failed');
      const assetIds = [...new Set(plan.entries.map(entry => entry.assetId).filter(Boolean))];
      let checkImages = () => {};
      const resolver = createBoardImageResolverV7(document, () => checkImages());
      await new Promise((resolve, reject) => {
        const deadline = performance.now() + 5000;
        checkImages = () => {
          const ready = assetIds.every(id => resolver.resolve(id) !== null) && assetIds.filter(id => id.includes('forest') || id.includes('mountain')).every(id => resolver.resolveTerrainGround(id) !== null);
          if (ready) resolve(); else if (performance.now() > deadline) reject(new Error('Review images timed out')); else setTimeout(checkImages, 25);
        };
        for (const id of assetIds) { resolver.resolve(id); resolver.resolveTerrainGround(id); }
        checkImages();
      });
      const snapshot = { ...original, phase: 'ACTIVE', view, offeredCommands: [] };
      const host = { callbacks: null, model: null, mount(_container, callbacks) { this.callbacks = callbacks; }, update(model) { this.model = model; }, presentBoundary: async () => {}, finishPresentations() {}, resetInspectionCycle() {}, zoom() {}, focus() {}, destroy() {} };
      const appPort = { snapshot: () => snapshot, subscribe(listener) { listener(snapshot); return () => {}; }, subscribeAcceptedBoundary() { return () => {}; }, launch: source.launch.bind(source), resume: source.resume.bind(source), returnToMenu: source.returnToMenu.bind(source), dispatch: async () => ({ accepted: false, reason: 'REVIEW_ONLY' }), progressAiTurns: source.progressAiTurns.bind(source), restart: source.restart.bind(source), deleteStoredSave: source.deleteStoredSave.bind(source), setFastForward: source.setFastForward.bind(source), exportSafeLog: source.exportSafeLog.bind(source), exportDebugBundle: source.exportDebugBundle.bind(source) };
      document.querySelector('#app').style.display = 'none';
      const root = document.createElement('div'); root.id = 'city-buff-review'; document.body.append(root);
      const app = new Ruleset7DomAppView(document, root, appPort, { boardHost: host, settingsStorage: null });
      host.callbacks.onSelection({ kind: 'CITY', cityId: populatedCity.id });
      const canvas = document.createElement('canvas'); canvas.width = 1320; canvas.height = 420; canvas.style.cssText = 'position:fixed;z-index:20;left:60px;top:72px;width:1320px;height:420px;border:2px solid #f8f2df;background:#173632'; document.body.append(canvas);
      drawBoardV7({ context: canvas.getContext('2d'), viewport: { width: 1320, height: 420 }, devicePixelRatio: 1, camera: { offsetX: 130, offsetY: 185, zoom: 0.625 }, plan, images: resolver });
      const banner = document.createElement('div'); banner.style.cssText = 'position:fixed;z-index:21;left:60px;top:20px;color:#fff;background:#171722;padding:8px 12px;font:700 17px system-ui'; banner.textContent = 'City, Forge & Rally review · native gameplay zoom 0.625'; document.body.append(banner);
      const labels = [['0-output Forge on Forest',0],['3-pop Forge on Forest',1],['ordinary Forest',2],['city 2 / 4',3],['city 0 / 3',4],['Inspired',5],['unbuffed',6]];
      for (const [label, x] of labels) { const node=document.createElement('span'); node.textContent=label; node.style.cssText='position:fixed;z-index:21;top:370px;width:78px;text-align:center;color:#fff;background:#101718cc;padding:3px;font:11px system-ui;left:'+(90 + Number(x)*80)+'px'; document.body.append(node); }
      globalThis.__CITY_BUFF_REVIEW__ = { app, host, positions };
      const cityPips = [...root.querySelectorAll('.v7-population-pip')].map(pip => pip.dataset.state ?? 'empty');
      if (JSON.stringify(cityPips) !== JSON.stringify(['filled','filled','empty','empty'])) throw new Error('City dock pip contract failed: ' + JSON.stringify(cityPips));
      return { source: 'PRODUCTION_RENDER_PLAN_CANVAS_AND_DOM_SYNTHETIC_PUBLIC_VIEW', zoom: 0.625, terrainByCell, statusKeys: statuses.map(entry => entry.key), cityPips, populationValues: plan.entries.filter(entry => entry.kind === 'VALUE').map(entry => ({ at: entry.at, value: entry.value, label: entry.label })) };
    })()`,
  );
  await capture(connection, path.join(outputRoot, "city-forge-native.png"));
  const selected = await evaluate<Record<string, unknown>>(
    connection,
    `(() => { const review=globalThis.__CITY_BUFF_REVIEW__; const unit=review.host.model.view.units.find(candidate => candidate.at.x === review.positions.inspired.x && candidate.at.y === review.positions.inspired.y); review.host.callbacks.onSelection({ kind: 'UNIT', unitId: unit.id }); const cue=document.querySelector('#city-buff-review [data-unit-status="inspired"]'); const modifier=[...document.querySelectorAll('#city-buff-review .v7-stat-modifier')].find(node => node.getAttribute('aria-label')?.includes('Captain Rally')); return { unitId: unit.id, cueText: cue?.textContent ?? null, cueLabel: cue?.getAttribute('aria-label') ?? null, modifierLabel: modifier?.getAttribute('aria-label') ?? null }; })()`,
  );
  if (
    selected.cueText !== "Inspired" ||
    selected.cueLabel !== "Inspired status" ||
    !String(selected.modifierLabel).includes("next attack this turn")
  )
    throw new Error(
      `Accessible Inspired selection failed: ${JSON.stringify(selected)}`,
    );
  await capture(
    connection,
    path.join(outputRoot, "inspired-selected-native.png"),
  );
  await sharp(path.join(outputRoot, "city-forge-native.png"))
    .resize(2880, 1800, { kernel: "nearest" })
    .png()
    .toFile(path.join(outputRoot, "city-forge-enlarged-2x.png"));
  await writeFile(
    path.join(outputRoot, "evidence.json"),
    `${JSON.stringify({ status: "PASS", viewport: { width: 1440, height: 900, deviceScaleFactor: 1 }, ...evidence, selected, screenshots: ["city-forge-native.png", "city-forge-enlarged-2x.png", "inspired-selected-native.png"] }, null, 2)}\n`,
  );
  connection.close();
  console.log(`Ruleset-7 city/buff browser review passed: ${outputRoot}`);
} finally {
  browser.kill();
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}

async function capture(connection: Connection, output: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(output, Buffer.from(response.data, "base64"));
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
    readonly exceptionDetails?: {
      readonly exception?: { readonly description?: string };
      readonly text?: string;
    };
  };
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function waitFor(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    if (
      await evaluate<boolean>(connection, `Boolean(${expression})`).catch(
        () => false,
      )
    )
      return;
    await delay(50);
  }
  throw new Error(`Chrome timed out waiting for ${expression}`);
}

async function waitForTarget(
  debugPort: number,
  expectedOrigin: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const found = targets.find(
          (candidate) =>
            candidate.type === "page" &&
            candidate.url.startsWith(expectedOrigin),
        );
        if (found !== undefined) return found;
      }
    } catch {
      /* Browser startup. */
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
      readonly method: string;
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
      request.reject(
        new Error(
          `${request.method}: ${message.error.message ?? "CDP failed"}`,
        ),
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
    close() {
      socket.close();
    },
  };
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
