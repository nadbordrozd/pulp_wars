import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

// Run before and after changing geometry. The served renderer owns all sizing.
const baseUrl = process.argv[2] ?? "http://localhost:6173/?ruleset=7";
const outputRoot = process.argv[3] ?? "/tmp/pulp-wars-opi-review/current";
const chrome = process.env.CHROME_PATH ?? "/usr/bin/google-chrome";
const port = 10540 + (process.pid % 80);
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/pulp-wars-treasure-${process.pid}`,
    "--window-size=1440,1100",
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
  await waitFor(connection, "document.querySelector('[data-v7-setup]')");
  await evaluate(
    connection,
    "document.querySelector('[data-action=launch]').click()",
  );
  await waitFor(
    connection,
    "globalThis.__PULP_WARS_APP__?.controller.snapshot().view?.units.length > 0",
  );
  await capture(connection, "live-shell.png");
  await evaluate(
    connection,
    `(async () => {
    const { ACCEPTED_ART_URLS } = await import('/src/assets/generated-art-manifest.ts');
    const { buildBoardRenderPlanV7, drawBoardV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
    const { SQUARE_ART_GEOMETRY } = await import('/src/render/canvas/board-art-geometry.ts');
    const { treasureCoverageV6 } = await import('/src/render/canvas/asset-coverage-v6.ts');
    const { pickGridTile } = await import('/src/render/canvas/geometry.ts');
    const base = globalThis.__PULP_WARS_APP__.controller.snapshot().view;
    const at = { x: 1, y: 1 };
    const view = { ...base, treasureChests: [at], cities: [], improvementValues: [], units: [{ ...base.units[0], at: { x: 2, y: 1 } }], board: { ...base.board, tiles: base.board.tiles.map(tile => ({ ...tile, explored: true, terrain: tile.at.x === 3 ? 'FOREST' : tile.at.x === 4 ? 'MOUNTAIN' : 'GRASS', resource: null, improvement: null, road: false, territoryCityId: null, site: null })) } };
    const plan = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null });
    const chest = plan.entries.find(entry => entry.kind === 'TREASURE');
    if (!chest || chest.layer !== 4) throw new Error('Live treasure coverage/layer missing');
    const images = new Map();
    const load = async id => { if (images.has(id)) return; const image = new Image(); image.src = ACCEPTED_ART_URLS[id]; await image.decode(); images.set(id, image); };
    const original = plan.entries.filter(entry => entry.at.x <= 4 && entry.at.y === 1 && ['TERRAIN','TREASURE','UNIT'].includes(entry.kind));
    const candy = original.map(entry => ({ ...entry, assetId: entry.kind === 'UNIT' ? 'unit-candy-fighter' : entry.kind === 'TERRAIN' && entry.assetId.includes('grass') ? 'terrain-square-candy-grass-1' : entry.kind === 'TERRAIN' && entry.assetId.includes('forest') ? 'terrain-square-candy-forest-1' : entry.assetId }));
    for (const entry of [...original, ...candy]) await load(entry.assetId);
    const url = ACCEPTED_ART_URLS[chest.assetId];
    const hash = async cache => [...new Uint8Array(await crypto.subtle.digest('SHA-256', await (await fetch(url, { cache })).arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
    const evidence = { renderer: 'drawBoardV7 with buildBoardRenderPlanV7', fixture: 'Presentation-only sparse scene derived from live public view', url, cachedSha256: await hash('force-cache'), freshSha256: await hash('reload'), sourceSize: { width: images.get(chest.assetId).naturalWidth, height: images.get(chest.assetId).naturalHeight }, geometry: SQUARE_ART_GEOMETRY.treasure, v6Geometry: treasureCoverageV6().geometry, samples: [] };
    const overlay = document.createElement('main');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#173632;color:#fff;padding:20px;font:18px system-ui';
    overlay.innerHTML = '<h1>Treasure · current runtime geometry</h1><p>Presentation-only sparse map · Original and Candy · pickup, fighter, Forest, Mountain</p>';
    document.body.append(overlay);
    globalThis.__drawTreasureReview = async (zoom, dpr) => {
      overlay.querySelectorAll('canvas, h2').forEach(node => node.remove());
      for (const [faction, entries] of [['Original', original], ['Candy', candy]]) {
        const heading = document.createElement('h2'); heading.textContent = faction + ' · zoom ' + zoom + ' · DPR ' + dpr; overlay.append(heading);
        const canvas = document.createElement('canvas'); canvas.width = 1320 * dpr; canvas.height = 340 * dpr; canvas.style.cssText = 'display:block;width:1320px;height:340px'; overlay.append(canvas);
        const camera = { offsetX: 132, offsetY: 280 - 128 * zoom, zoom };
        const args = { viewport: { width: 1320, height: 340 }, devicePixelRatio: dpr, camera, images: { resolve: id => images.get(id) ?? null } };
        drawBoardV7({ ...args, context: canvas.getContext('2d'), plan: { ...plan, entries } });
        const bounds = {};
        for (const kind of ['TREASURE', 'UNIT', 'TERRAIN']) {
          const entry = entries.find(candidate => candidate.kind === kind && (kind !== 'TERRAIN' || candidate.assetId.includes('forest')));
          const isolated = document.createElement('canvas'); isolated.width = canvas.width; isolated.height = canvas.height;
          const context = isolated.getContext('2d');
          drawBoardV7({ ...args, context, clear: false, plan: { ...plan, entries: [{ ...entry, ownerColor: undefined, hp: undefined, ready: false }] } });
          const pixels = context.getImageData(0, 0, isolated.width, isolated.height).data;
          let left = isolated.width, top = isolated.height, right = -1, bottom = -1;
          for (let y = 0; y < isolated.height; y++) for (let x = 0; x < isolated.width; x++) if (pixels[(y * isolated.width + x) * 4 + 3]) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
          bounds[kind] = { left: left / dpr, top: top / dpr, right: (right + 1) / dpr, bottom: (bottom + 1) / dpr, width: (right-left+1)/dpr, height: (bottom-top+1)/dpr };
        }
        const center = { x: camera.offsetX + 128 * zoom, y: camera.offsetY + 128 * zoom };
        const b = bounds.TREASURE;
        if (!(b.left >= center.x - 64 * zoom && b.right <= center.x + 64 * zoom && b.top >= center.y - 64 * zoom && b.bottom <= center.y + 64 * zoom)) throw new Error('Chest outside owning square');
        if (!(b.width < bounds.UNIT.width && b.height < bounds.UNIT.height && b.width < bounds.TERRAIN.width * 0.6)) throw new Error('Pickup scale hierarchy failed');
        for (const point of [center, { x: b.left + 1, y: b.top + 1 }, { x: b.right - 1, y: b.bottom - 1 }]) { const picked = pickGridTile(point, camera, view.board); if (picked?.x !== at.x || picked?.y !== at.y) throw new Error('Chest hit test mismatch'); }
        evidence.samples.push({ faction, zoom, dpr, bounds, tileCenter: center, pickChecks: 3 });
      }
    };
    globalThis.__treasureReviewEvidence = evidence;
  })()`,
  );
  for (const dpr of [1, 2]) {
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1100,
      deviceScaleFactor: dpr,
      mobile: false,
    });
    for (const zoom of [0.625, 1, 1.75]) {
      await evaluate(
        connection,
        `globalThis.__drawTreasureReview(${zoom}, ${dpr})`,
      );
      await capture(connection, `zoom-${zoom}-dpr${dpr}.png`);
    }
  }
  const evidence = await evaluate<{
    cachedSha256: string;
    freshSha256: string;
  }>(connection, "globalThis.__treasureReviewEvidence");
  const bytes = await readFile(
    "public/assets/pixellab/buildings-square/treasure-chest.png",
  );
  const sourceSha256 = createHash("sha256").update(bytes).digest("hex");
  assert(
    evidence.cachedSha256 === sourceSha256 &&
      evidence.freshSha256 === sourceSha256,
    "Browser asset bytes differ from production raster",
  );
  await sharp(bytes)
    .resize(512, 592, { kernel: "nearest" })
    .png()
    .toFile(path.join(outputRoot, "source-enlarged.png"));
  await sharp(path.join(outputRoot, "zoom-1-dpr1.png"))
    .resize(2880, 2200, { kernel: "nearest" })
    .png()
    .toFile(path.join(outputRoot, "zoom-1-enlarged.png"));
  await writeFile(
    path.join(outputRoot, "review-evidence.json"),
    JSON.stringify({ ...evidence, sourceSha256 }, null, 2) + "\n",
  );
  connection.close();
  console.log(`Treasure browser review: ${outputRoot}`);
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
