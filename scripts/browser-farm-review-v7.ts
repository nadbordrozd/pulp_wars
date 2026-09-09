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
interface Coord {
  readonly x: number;
  readonly y: number;
}

const baseUrl =
  process.argv.find((argument) => argument.startsWith("http")) ??
  "http://localhost:6173/?ruleset=7";
const outputRoot = path.join(
  process.cwd(),
  "art/integration/reviews/ruleset7-farms",
);
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_440 + (process.pid % 80);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-v7-farm-${process.pid}`
  : path.join(process.env.TMPDIR ?? "/tmp", `pulp-wars-v7-farm-${process.pid}`);
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
  await evaluate(connection, "try { localStorage.clear(); } catch {} ");
  await connection.send("Page.reload");
  await waitFor(connection, `document.querySelector('[data-v7-setup]')`);
  await setValue(connection, "#v7-seed", "1");
  await click(connection, '[data-action="launch"]');
  await waitForHuman(connection);
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().offeredCommands.length > 0`,
  );

  const first = await reachNaturalFarm(connection, null);
  const firstPointer = await pointerSelect(connection, first.farm);
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.textContent?.includes('Farm')`,
  );
  await assertSelectedFarmIdentity(connection);
  await capture(connection, "natural-single-selected.png");

  await key(connection, "Escape", "Escape");
  const second = await reachNaturalFarm(connection, first.farm);
  assert(
    Math.abs(second.farm.x - first.farm.x) +
      Math.abs(second.farm.y - first.farm.y) ===
      1,
    "Second natural Farm is not cardinally adjacent",
  );
  const firstPairedPointer = await pointerSelect(connection, first.farm);
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.textContent?.includes('Farm')`,
  );
  await key(connection, "Escape", "Escape");
  const secondPointer = await pointerSelect(connection, second.farm);
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.textContent?.includes('Farm')`,
  );
  await capture(connection, "natural-pair-selected.png");
  await evaluate(
    connection,
    `globalThis.__farmNaturalEvidence = ${JSON.stringify({
      first,
      second,
      firstPointer,
      firstPairedPointer,
      secondPointer,
    })}`,
  );

  await key(connection, "Escape", "Escape");
  await installSyntheticReview(connection);
  await viewport(connection, 1280, 900, 1);
  await capture(connection, "synthetic-complex-layouts-dpr1.png");
  await viewport(connection, 1280, 900, 2);
  await evaluate(connection, `globalThis.__drawFarmReview(2)`);
  await capture(connection, "synthetic-complex-layouts-dpr2.png");
  const evidence = await evaluate(
    connection,
    `({ natural: globalThis.__farmNaturalEvidence, synthetic: globalThis.__farmReviewEvidence })`,
  );
  await writeFile(
    path.join(outputRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  console.log(`Ruleset 7 Farm browser evidence: ${outputRoot}`);
  connection.close();
} finally {
  browser.kill();
}

async function reachNaturalFarm(
  connection: Connection,
  adjacentTo: Coord | null,
): Promise<{ readonly capital: Coord; readonly farm: Coord }> {
  const result = await evaluate<{
    readonly capital: Coord;
    readonly farm: Coord;
    readonly accepted: boolean;
    readonly reason?: string;
  }>(
    connection,
    `(async () => {
      const controller = globalThis.__PULP_WARS_APP__.controller;
      const settle = async (label) => { for (let attempt = 0; attempt < 240; attempt += 1) { const next = controller.snapshot(); if (!next.ai.active && !next.transitioning && next.offeredCommands.length > 0) return; await new Promise((resolve) => setTimeout(resolve, 25)); } throw new Error(label + ' did not settle within 6 seconds'); };
      for (let step = 0; step < 80; step += 1) {
        let snapshot = controller.snapshot();
        const research = snapshot.offeredCommands.find((command) => command.kind === 'RESEARCH' && command.tech === 'FARMING') ?? snapshot.offeredCommands.find((command) => command.kind === 'RESEARCH' && command.tech === 'GATHERING');
        if (research) { const result = await controller.dispatch(research); if (!result.accepted) throw new Error('Natural prerequisite research rejected'); await settle('Natural research presentation'); snapshot = controller.snapshot(); }
        const candidates = snapshot.offeredCommands.filter((command) => command.kind === 'BUILD_FARM');
        const adjacent = ${JSON.stringify(adjacentTo)};
        const command = adjacent === null ? (snapshot.view.viewer.coins >= 10 ? candidates[0] : undefined) : candidates.find((candidate) => Math.abs(candidate.at.x - adjacent.x) + Math.abs(candidate.at.y - adjacent.y) === 1);
        if (command) {
          const capital = snapshot.view.cities.find((city) => city.ownerId === snapshot.view.viewer.id && city.isCapital)?.at;
          if (!capital) throw new Error('Natural capital missing');
          const dispatched = await controller.dispatch(command);
          if (dispatched.accepted) {
            await settle('Natural Farm build presentation');
            const reward = controller.snapshot().offeredCommands.find((candidate) => candidate.kind === 'CHOOSE_CITY_REWARD');
            if (reward) { const rewarded = await controller.dispatch(reward); if (!rewarded.accepted) throw new Error('Natural city reward rejected'); await settle('Natural city reward presentation'); }
          }
          return { capital, farm: command.at, accepted: dispatched.accepted, reason: dispatched.reason };
        }
        const progress = snapshot.offeredCommands.find((command) => command.kind === 'CHOOSE_CITY_REWARD') ?? snapshot.offeredCommands.find((command) => command.kind === 'HARVEST_FRUIT') ?? snapshot.offeredCommands.find((command) => command.kind === 'WAIT') ?? snapshot.offeredCommands.find((command) => command.kind === 'END_TURN');
        if (!progress) throw new Error('No legal natural Farm progression command: ' + snapshot.offeredCommands.map((command) => command.kind + ('tech' in command ? ':' + command.tech : '')).join(','));
        const progressed = await controller.dispatch(progress);
        if (!progressed.accepted) throw new Error('Natural progression command rejected');
        if (progress.kind === 'END_TURN') {
          const ai = await Promise.race([controller.progressAiTurns(), new Promise((_, reject) => setTimeout(() => reject(new Error('Natural AI progression exceeded 8 seconds')), 8000))]);
          if (!ai.ok) throw new Error('Natural AI progression failed: ' + ai.diagnostic);
        }
        await settle('Natural progression presentation');
      }
      throw new Error('No natural Farm command found within bounded legal progression');
    })()`,
  );
  assert(result.accepted, `Natural BUILD_FARM rejected: ${result.reason}`);
  return result;
}

async function assertSelectedFarmIdentity(
  connection: Connection,
): Promise<void> {
  const result = await evaluate<{
    readonly width: number;
    readonly height: number;
    readonly src: string;
  }>(
    connection,
    `(() => { const image = document.querySelector('.v7-selection-dock img[data-asset-id="building-ruleset7-farm-single"]'); if (!(image instanceof HTMLImageElement)) throw new Error('v7 Farm identity image missing'); const rect = image.closest('.v7-art-frame')?.getBoundingClientRect(); if (!rect) throw new Error('Farm identity frame missing'); return { width: rect.width, height: rect.height, src: image.currentSrc }; })()`,
  );
  assert(
    result.width === 112 && result.height === 130,
    `Farm identity is not 112x130: ${JSON.stringify(result)}`,
  );
  assert(
    result.src.includes("farm-single"),
    `Farm identity source mismatch: ${result.src}`,
  );
  await waitFor(
    connection,
    `(() => { const image = document.querySelector('.v7-selection-dock img[data-asset-id="building-ruleset7-farm-single"]'); return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0; })()`,
  );
}

async function installSyntheticReview(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const { ACCEPTED_ART_URLS } = await import('/src/assets/generated-art-manifest.ts');
      const { buildBoardRenderPlanV7, drawBoardV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const base = globalThis.__PULP_WARS_APP__.controller.snapshot().view;
      const layouts = {
        ISOLATED: [[1,1]], HORIZONTAL: [[1,1],[2,1]], VERTICAL: [[1,1],[1,2]],
        L: [[1,1],[2,1],[1,2]], T: [[1,1],[2,1],[3,1],[2,2]],
        '2x2': [[1,1],[2,1],[1,2],[2,2]], ODD_LONG: [[1,1],[2,1],[3,1],[4,1],[5,1]],
      };
      const overlay = document.createElement('main');
      overlay.id = 'farm-browser-review';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#18302e;color:#f6efdc;padding:18px;font:16px system-ui;overflow:hidden';
      overlay.innerHTML = '<h1 style="margin:0 0 4px;font:700 24px Georgia">RULESET 7 FARM · SYNTHETIC PRESENTATION-ONLY COMPLEX LAYOUT REVIEW</h1><p style="margin:0 0 12px;color:#cbd8cf">Runtime buildBoardRenderPlanV7 · independently cropped cells · no economic-state mutation</p><section style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px"></section>';
      const section = overlay.querySelector('section');
      const evidence = { label: 'SYNTHETIC_PRESENTATION_ONLY', renderer: 'drawBoardV7', layouts: {}, renderedDprs: [], acceptedIds: [] };
      const records = [];
      for (const [name, cells] of Object.entries(layouts)) {
        const keys = new Set(cells.map(([x,y]) => x + ',' + y));
        const view = { ...base, board: { ...base.board, tiles: base.board.tiles.map((tile) => {
          const key = tile.at.x + ',' + tile.at.y;
          if (!keys.has(key)) return tile.explored && tile.improvement === 'FARM' ? { ...tile, improvement: null } : tile;
          return { ...tile, explored: true, terrain: 'GRASS', resource: null, improvement: 'FARM', road: name === '2x2' && key === '1,1', territoryCityId: 1 };
        }) }, units: name === '2x2' ? [{ ...base.units.find((unit) => unit.ownerId === base.viewer.id), at: { x: 1, y: 1 } }] : [] };
        const plan = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null });
        const farms = plan.entries.filter((entry) => entry.kind === 'IMPROVEMENT' && keys.has(entry.at.x + ',' + entry.at.y));
        if (farms.length !== cells.length) throw new Error(name + ' has missing/double Farm entries');
        const entries = plan.entries.filter((entry) => keys.has(entry.at.x + ',' + entry.at.y) && ['TERRAIN','IMPROVEMENT','ROAD','UNIT'].includes(entry.kind));
        if (name === '2x2') { const farmIndex = entries.findIndex((entry) => entry.kind === 'IMPROVEMENT' && entry.at.x === 1 && entry.at.y === 1); const roadIndex = entries.findIndex((entry) => entry.kind === 'ROAD' && entry.at.x === 1 && entry.at.y === 1); if (!(farmIndex >= 0 && roadIndex > farmIndex && entries[farmIndex].layer === 1.5 && entries[roadIndex].layer === 2)) throw new Error('Farm/Road runtime layer contract failed'); }
        const card = document.createElement('article');
        card.style.cssText = 'background:#24413d;border:2px solid #57756b;border-radius:8px;padding:8px';
        card.innerHTML = '<strong>' + name + '</strong><canvas width="288" height="216" style="display:block;width:288px;height:216px;margin-top:6px"></canvas>';
        section.append(card);
        const canvas = card.querySelector('canvas');
        const images = new Map();
        for (const entry of entries) if (entry.assetId && !images.has(entry.assetId)) { const image = new Image(); image.src = ACCEPTED_ART_URLS[entry.assetId]; await image.decode(); images.set(entry.assetId, image); }
        const minX = Math.min(...cells.map(([x]) => x)); const minY = Math.min(...cells.map(([,y]) => y));
        records.push({ canvas, entries, images, minX, minY });
        evidence.layouts[name] = farms.map(({ at, assetId, sourceCrop, farmPartner }) => ({ at, assetId, sourceCrop, farmPartner }));
        evidence.acceptedIds.push(...farms.map(({ assetId }) => assetId));
      }
      evidence.acceptedIds = [...new Set(evidence.acceptedIds)].sort();
      globalThis.__drawFarmReview = async (dpr) => { for (const record of records) { record.canvas.width = 288 * dpr; record.canvas.height = 216 * dpr; record.canvas.style.width = '288px'; record.canvas.style.height = '216px'; const context = record.canvas.getContext('2d'); drawBoardV7({ context, viewport: { width: 288, height: 216 }, devicePixelRatio: dpr, camera: { offsetX: 34 - record.minX * 52, offsetY: 34 - record.minY * 52, zoom: 52 / 128 }, plan: { version: 7, entries: record.entries, targets: [] }, images: { resolve: (id) => record.images.get(id) ?? null } }); } evidence.renderedDprs.push(dpr); };
      globalThis.__farmReviewEvidence = evidence;
      document.body.append(overlay);
      await globalThis.__drawFarmReview(1);
    })()`,
  );
  await waitFor(
    connection,
    `document.querySelector('#farm-browser-review canvas')`,
  );
}

async function pointerSelect(
  connection: Connection,
  at: Coord,
): Promise<{ readonly point: Coord; readonly picked: Coord }> {
  const target = await evaluate<{
    readonly point: Coord;
    readonly picked: Coord;
  }>(
    connection,
    `(async () => { const geometry = await import('/src/render/canvas/geometry.ts'); const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const canvas = document.querySelector('.board-canvas-v7'); if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Board canvas missing'); const rect = canvas.getBoundingClientRect(); const viewport = { width: rect.width, height: rect.height }; const capital = view.cities.find((city) => city.ownerId === view.viewer.id && city.isCapital)?.at ?? view.cities[0]?.at ?? { x: 0, y: 0 }; const fitted = geometry.fitCamera(view.board, viewport); const camera = geometry.centerCameraOn(fitted, geometry.projectGrid(capital), viewport); const local = geometry.worldToScreen(geometry.projectGrid(${JSON.stringify(at)}), camera); const picked = geometry.pickGridTile(local, camera, view.board); if (!picked || picked.x !== ${at.x} || picked.y !== ${at.y}) throw new Error('Pointer round trip mismatch'); const point = { x: rect.left + local.x, y: rect.top + local.y }; if (document.elementFromPoint(point.x, point.y) !== canvas) throw new Error('Pointer target obstructed by ' + document.elementFromPoint(point.x, point.y)?.className); return { point, picked }; })()`,
  );
  for (const [type, buttons] of [
    ["mousePressed", 1],
    ["mouseReleased", 0],
  ] as const)
    await connection.send("Input.dispatchMouseEvent", {
      type,
      x: target.point.x,
      y: target.point.y,
      button: "left",
      buttons,
      clickCount: 1,
    });
  return target;
}

async function waitForHuman(connection: Connection): Promise<void> {
  await waitFor(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const view = snapshot?.view; return snapshot?.phase === 'ACTIVE' && !snapshot.ai.active && view?.turnOrder[view.activeSeatIndex] === view?.humanPlayerId; })()`,
  );
}
async function viewport(
  connection: Connection,
  width: number,
  height: number,
  dpr: number,
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: dpr,
    mobile: false,
  });
  await delay(100);
}
async function setValue(
  connection: Connection,
  selector: string,
  value: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLInputElement)) throw new Error('Input missing'); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('input', { bubbles: true })); })()`,
  );
}
async function click(connection: Connection, selector: string): Promise<void> {
  await evaluate(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing selector'); node.click(); })()`,
  );
}
async function key(
  connection: Connection,
  keyValue: string,
  code: string,
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    Enter: 13,
    Escape: 27,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
  };
  const keyCode = codes[code];
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
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
        pending.set(id, { method, resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
