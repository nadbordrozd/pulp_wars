import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
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
interface Connection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

const baseUrl =
  process.argv.find((arg) => arg.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const outputRoot = path.resolve(
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ??
    "/tmp/pulp-wars-wly-review",
);
const focused = process.argv.includes("--focused");
const chrome = process.env.CHROME_PATH;
if (!chrome) throw new Error("Set CHROME_PATH to the review headless browser");
const port = 10600 + (process.pid % 100);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(process.env.TMPDIR ?? "/tmp", `pulp-wars-territory-${process.pid}`)}`,
    "--window-size=1920,1080",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  await mkdir(outputRoot, { recursive: true });
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await waitFor(connection, "document.querySelector('#app') !== null");
  await evaluate(
    connection,
    `(async () => {
    globalThis.__PULP_WARS_APP__?.destroy?.();
    const { territoryReviewFixtureV7 } = await import('/tests/fixtures/ruleset7-territory-review.ts');
    const { buildBoardRenderPlanV7, drawBoardV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
    const { ACCEPTED_ART_URLS } = await import('/src/assets/generated-art-manifest.ts');
    const view = territoryReviewFixtureV7();
    const city = view.cities[0], unit = view.units[0];
    const plans = Object.fromEntries(['ambient', 'city', 'unit'].map(mode => [mode, buildBoardRenderPlanV7(view, mode === 'unit' ? [{ kind: 'MOVE', unitId: unit.id, path: [{x:0,y:2}] }] : [], {
      selection: mode === 'city' ? {kind:'CITY', cityId:city.id} : mode === 'unit' ? {kind:'UNIT', unitId:unit.id} : null,
      selectedUnitId: mode === 'unit' ? unit.id : null, selectedAchievement:null,
    })]));
    const images = new Map();
    for (const plan of Object.values(plans)) for (const entry of plan.entries) if (entry.assetId && !images.has(entry.assetId)) {
      const image = new Image(); image.src = ACCEPTED_ART_URLS[entry.assetId]; await image.decode(); images.set(entry.assetId, image);
    }
    const root = document.querySelector('#app');
    root.style.cssText = 'position:fixed;inset:0;background:#142923;color:#f4efdc;font:16px system-ui;padding:20px;overflow:hidden;box-sizing:border-box';
    const edge = (context, camera, entry, yOffset = 0) => {
      const z = camera.zoom, x = camera.offsetX + entry.at.x * 128*z, y = camera.offsetY + entry.at.y * 128*z + yOffset*z, h = 64*z;
      const points = { NORTH:[x-h,y-h,x+h,y-h], EAST:[x+h,y-h,x+h,y+h], SOUTH:[x+h,y+h,x-h,y+h], WEST:[x-h,y+h,x-h,y-h] }[entry.edge];
      context.beginPath(); context.moveTo(points[0],points[1]); context.lineTo(points[2],points[3]); context.stroke();
    };
    // Comparison-only alternatives stay out of runtime. Dashed/final always uses
    // the actual renderer, with no monkeypatching or synthetic asset generation.
    const alternate = (context, camera, plan, treatment) => {
      const z = camera.zoom;
      context.save(); context.beginPath();
      for (const entry of plan.entries) if (entry.kind === 'TERRAIN') context.rect(camera.offsetX + (entry.at.x-.5)*128*z, camera.offsetY + (entry.at.y-.5)*128*z,128*z,128*z);
      context.clip();
      for (const entry of plan.entries) {
        if (entry.kind !== 'TERRITORY_BOUNDARY') continue;
        const potential = entry.boundaryStyle === 'POTENTIAL', city = entry.boundaryStyle === 'CITY';
        context.save();
        context.strokeStyle = potential ? '#fff6b0' : entry.ownerColor;
        context.lineWidth = (city ? 5 : 3)*z;
        context.setLineDash(potential ? [9*z,6*z] : []);
        if (treatment === 'current' || potential) edge(context,camera,entry);
        else {
          context.strokeStyle = '#243633'; context.lineWidth = 7*z; edge(context,camera,entry,-3);
          context.strokeStyle = entry.ownerColor; context.lineWidth = (city ? 5 : 3)*z; edge(context,camera,entry,-4);
          context.lineWidth = 3*z; context.setLineDash([3*z,29*z]); edge(context,camera,entry,0);
        }
        context.restore();
      }
      context.restore();
    };
    globalThis.__TERRITORY_REVIEW__ = {
      draw: (comparison, zoom, mode, dpr = 1) => {
        root.innerHTML = '<h1 style="font:700 23px/1.2 system-ui;max-width:none;width:auto;margin:0 0 6px">Territory boundaries · ' + (comparison ? 'candidate comparison' : 'public owner treatment') + '</h1><p style="margin:0 0 12px">Synthetic public presentation fixture · actual drawBoardV7 Canvas + accepted art · ' + mode + ' · ' + zoom + '× zoom · DPR ' + dpr + '</p><section style="display:flex;gap:14px"></section>';
        const variants = comparison ? ['current','dashed','fence'] : ['final'];
        const width = comparison ? 617 : 1400, height = comparison ? 920 : 864;
        for (const variant of variants) {
          const article = document.createElement('article'); article.innerHTML = '<h2 style="font-size:18px;margin:0 0 8px">' + ({current:'Current · 3 px continuous',dashed:'Thicker dash · dark casing',fence:'Subtle raised edge · short posts',final:'Final · alternating shared owners / selected city emphasis'}[variant]) + '</h2><canvas style="display:block;width:' + width + 'px;height:' + height + 'px"></canvas>';
          root.querySelector('section').append(article);
          const canvas = article.querySelector('canvas'); canvas.width=width*dpr; canvas.height=height*dpr;
          const context=canvas.getContext('2d'); const plan=plans[mode];
          const camera={zoom,offsetX:width/2-2.5*128*zoom,offsetY:height/2-2*128*zoom};
          drawBoardV7({context,viewport:{width,height},devicePixelRatio:dpr,camera,plan:variant === 'current' || variant === 'fence' ? {...plan,entries:plan.entries.filter(e => e.kind !== 'TERRITORY_BOUNDARY')} : plan,images:{resolve:id=>images.get(id)??null},reducedMotion:true});
          if(variant==='current'||variant==='fence') alternate(context,camera,plan,variant);
        }
        return { comparison,zoom,mode,dpr, canvas:{width,height}, ownerEdges:plans[mode].entries.filter(e=>e.boundaryStyle==='OWNER').length, cityEdges:plans[mode].entries.filter(e=>e.boundaryStyle==='CITY').length, potentialEdges:plans[mode].entries.filter(e=>e.boundaryStyle==='POTENTIAL').length };
      },
      pixelProbes: () => {
        const width=896,height=768,zoom=1,camera={zoom,offsetX:64,offsetY:64};
        const render = (boundaries, region) => {
          const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d');
          drawBoardV7({context,viewport:{width,height},devicePixelRatio:1,camera,plan:boundaries?plans.ambient:{...plans.ambient,entries:plans.ambient.entries.filter(e=>e.kind!=='TERRITORY_BOUNDARY')},images:{resolve:id=>images.get(id)??null},reducedMotion:true});
          return context.getImageData(region.x,region.y,region.width,region.height).data;
        };
        const regions = {fog:{x:640,y:0,width:128,height:256},road:{x:500,y:308,width:24,height:24},boundary:{x:124,y:198,width:8,height:100}};
        return Object.fromEntries(Object.entries(regions).map(([name,region]) => {
          const before=render(false,region),after=render(true,region); let different=0;
          for(let i=0;i<before.length;i++) if(before[i]!==after[i]) different++;
          if(name === 'boundary' ? different === 0 : different !== 0) throw new Error('Unexpected '+name+' boundary paint: '+different+' channel differences');
          return [name,{region,differentChannels:different}];
        }));
      },
    };
  })()`,
  );
  await evaluate(
    connection,
    `(async () => {
      const { exploredAllV7, initialV7, checkedV7 } = await import('/tests/fixtures/v7-builders.ts');
      const { withPortV7 } = await import('/tests/fixtures/v7-naval-builders.ts');
      const { applyCommandV7, projectEventsV7, queryPlayerCommandsV7, viewForV7 } = await import('/src/engine/index.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      const { fitCamera, centerCameraOn, projectGrid, worldToScreen } = await import('/src/render/canvas/geometry.ts');
      let state = exploredAllV7(initialV7(1532));
      const city = state.cities.find(candidate => candidate.ownerId === state.humanPlayerId);
      const unit = state.units.find(candidate => candidate.ownerId === state.humanPlayerId);
      const same = (left, right) => left.x === right.x && left.y === right.y;
      if (!city || !unit) throw new Error('Recruitment fixture missing');
      const empty = state.board.tiles.find(tile => tile.territoryCityId === city.id && tile.site === null && !same(tile.at, city.at) && !state.units.some(candidate => same(candidate.at, tile.at)) && !state.treasureChests.some(chest => same(chest, tile.at)));
      if (!empty) throw new Error('Recruitment empty tile missing');
      state = checkedV7({ ...state, players: state.players.map(player => player.id === state.humanPlayerId ? { ...player, coins: 100 } : player), units: state.units.map(candidate => candidate.id === unit.id ? { ...candidate, at: empty.at } : candidate) });
      const before = viewForV7(state, state.humanPlayerId);
      const train = queryPlayerCommandsV7(before).find(command => command.kind === 'TRAIN' && command.cityId === city.id);
      if (!train) throw new Error('Recruitment command missing');
      const recruited = applyCommandV7(state, state.humanPlayerId, train);
      if (!recruited.accepted) throw new Error('Recruitment rejected: ' + recruited.error.code);
      const portFixture = withPortV7(9001);
      const navalBefore = viewForV7(portFixture.state, portFixture.state.humanPlayerId);
      const navalTrain = queryPlayerCommandsV7(navalBefore).find(command => command.kind === 'TRAIN_NAVAL' && command.role === 'PATROL_BOAT' && same(command.at, portFixture.portAt));
      if (!navalTrain) throw new Error('Naval recruitment command missing');
      const navalRecruited = applyCommandV7(portFixture.state, portFixture.state.humanPlayerId, navalTrain);
      if (!navalRecruited.accepted) throw new Error('Naval recruitment rejected: ' + navalRecruited.error.code);
      const scenarios = {
        land: { label: 'Fighter', state, before, train, recruited },
        naval: { label: 'Patrol Boat', state: portFixture.state, before: navalBefore, train: navalTrain, recruited: navalRecruited },
      };
      const root = document.querySelector('#app');
      globalThis.__RECRUIT_REVIEW__ = async (scenario, motion, dpr) => {
        globalThis.__ACTIVE_RECRUIT_HOST__?.destroy();
        const fixture = scenarios[scenario];
        const { state: source, before, train, recruited, label } = fixture;
        const after = viewForV7(recruited.state, source.humanPlayerId);
        const envelope = projectEventsV7(source, recruited.state, source.humanPlayerId, recruited.events);
        const focusCity = before.cities.find(candidate => candidate.ownerId === before.viewer.id && candidate.isCapital) ?? before.cities[0];
        root.innerHTML = '<h1 style="font:700 23px/1.2 system-ui;margin:0 0 6px">Recruitment redraw stability · ' + scenario + ' · ' + motion + '</h1><p style="margin:0 0 12px">Actual CanvasBoardHostV7 · legal ' + label + ' recruitment · terrain probe sampled before, during, and after the accepted boundary · DPR ' + dpr + '</p><div data-recruit-host style="width:1400px;height:864px"></div>';
        const container = root.querySelector('[data-recruit-host]');
        const host = new CanvasBoardHostV7(document);
        globalThis.__ACTIVE_RECRUIT_HOST__ = host;
        host.mount(container, { onSelection() {}, onCommand() {} });
        const model = view => ({ matchInstanceId: 'recruit-review-' + scenario + '-' + motion, view, offeredCommands: [], interactive: false, motion, animationSpeed: 'NORMAL', presentationPaused: false, highContrast: false, interaction: { selection: null, selectedUnitId: null, selectedAchievement: null } });
        host.update(model(before));
        await new Promise(resolve => setTimeout(resolve, 500));
        const canvas = container.querySelector('canvas');
        const context = canvas.getContext('2d');
        const viewport = { width: 1400, height: 864 };
        const capital = focusCity.at;
        const camera = centerCameraOn(fitCamera(before.board, viewport), projectGrid(capital), viewport);
        const probe = before.board.tiles.map(tile => ({ tile, point: worldToScreen(projectGrid(tile.at), camera) })).find(({ tile, point }) => tile.explored && tile.resource === null && tile.improvement === null && tile.site === null && !before.units.some(candidate => same(candidate.at, tile.at)) && !before.treasureChests.some(chest => same(chest, tile.at)) && Math.max(Math.abs(tile.at.x - capital.x), Math.abs(tile.at.y - capital.y)) >= 2 && point.x >= 20 && point.x <= viewport.width - 20 && point.y >= 20 && point.y <= viewport.height - 20);
        if (!probe) throw new Error('Visible steady terrain probe tile missing');
        const sampleTile = probe.tile;
        const point = probe.point;
        const sample = () => [...context.getImageData(Math.round(point.x * dpr) - 4 * dpr, Math.round(point.y * dpr) - 4 * dpr, 9 * dpr, 9 * dpr).data];
        const differentChannels = (left, right) => left.reduce((count, value, index) => count + (value === right[index] ? 0 : 1), 0);
        const baseline = sample();
        host.update(model(after));
        const installed = sample();
        const nativeRequest = window.requestAnimationFrame;
        let presentationFrameRequests = 0;
        window.requestAnimationFrame = callback => { presentationFrameRequests += 1; return nativeRequest.call(window, callback); };
        const presentation = host.presentBoundary(before, after, envelope);
        const samples = [sample()];
        for (const delay of [16, 50, 100, 180]) { await new Promise(resolve => setTimeout(resolve, delay)); samples.push(sample()); }
        await presentation;
        window.requestAnimationFrame = nativeRequest;
        const terrainChanges = [differentChannels(baseline, installed), ...samples.map(candidate => differentChannels(installed, candidate))];
        if (presentationFrameRequests !== 0 || terrainChanges.some(count => count !== 0)) throw new Error('Recruitment redraw instability: frames=' + presentationFrameRequests + ' changes=' + terrainChanges.join(','));
        const result = { scenario, motion, dpr, command: train.kind, projectedKinds: envelope.events.map(event => event.kind), presentationFrameRequests, terrainProbe: { at: sampleTile.at, cssPoint: point, sampleCssSize: 9, differentChannels: terrainChanges }, unitCount: { before: before.units.length, after: after.units.length } };
        return result;
      };
    })()`,
  );
  const evidence: unknown[] = [];
  if (!focused) {
    for (const mode of ["ambient", "city", "unit"]) {
      for (const zoom of [0.625, 1]) {
        evidence.push(
          await evaluate(
            connection,
            `__TERRITORY_REVIEW__.draw(true,${zoom},${JSON.stringify(mode)})`,
          ),
        );
        await capture(connection, `comparison-${mode}-${zoom}.png`);
      }
    }
  }
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  for (const mode of focused ? ["city"] : ["ambient", "city", "unit"]) {
    for (const zoom of focused ? [1] : [0.625, 1, 1.75]) {
      evidence.push(
        await evaluate(
          connection,
          `__TERRITORY_REVIEW__.draw(false,${zoom},${JSON.stringify(mode)})`,
        ),
      );
      await capture(connection, `final-${mode}-${zoom}.png`);
    }
  }
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 2,
    mobile: false,
  });
  evidence.push(
    await evaluate(
      connection,
      `__TERRITORY_REVIEW__.draw(false,${focused ? 1 : 0.625},'city',2)`,
    ),
  );
  await capture(
    connection,
    focused ? "border-city-dpr2.png" : "final-city-0.625-dpr2.png",
  );
  const pixelProbes = await evaluate(
    connection,
    "__TERRITORY_REVIEW__.pixelProbes()",
  );
  const recruitmentEvidence: unknown[] = [];
  for (const dpr of [1, 2]) {
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: dpr,
      mobile: false,
    });
    for (const scenario of ["land", "naval"])
      for (const motion of ["FULL", "REDUCED"]) {
        recruitmentEvidence.push(
          await evaluate(
            connection,
            `__RECRUIT_REVIEW__(${JSON.stringify(scenario)},${JSON.stringify(motion)},${dpr})`,
          ),
        );
        await capture(
          connection,
          `recruit-${scenario}-${motion.toLowerCase()}-dpr${dpr}.png`,
        );
      }
  }
  await writeFile(
    path.join(outputRoot, "evidence.json"),
    `${JSON.stringify({ fixture: "SYNTHETIC_PUBLIC_PRESENTATION_ONLY plus legal recruitment boundary", renderer: "drawBoardV7 and CanvasBoardHostV7 in real browser with accepted art", evidence, pixelProbes, recruitmentEvidence }, null, 2)}\n`,
  );
  connection.close();
  console.log(`Territory browser review passed: ${outputRoot}`);
} finally {
  browser.kill();
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(
    path.join(outputRoot, name),
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
  expectedUrl: string,
): Promise<DebugTarget> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${debugPort}/json/list`);
      if (response.ok) {
        const targets = (await response.json()) as readonly DebugTarget[];
        const found = targets.find(
          (candidate) =>
            candidate.type === "page" && candidate.url.startsWith(expectedUrl),
        );
        if (found !== undefined) return found;
      }
    } catch {
      /* Chrome startup */
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
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(method + " timed out after 30 seconds"));
        }, 30000);
        pending.set(id, {
          method,
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
    close() {
      socket.close();
    },
  };
}
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
