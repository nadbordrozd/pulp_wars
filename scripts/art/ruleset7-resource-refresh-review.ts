import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { SQUARE_ART_GEOMETRY } from "../../src/render/canvas/board-art-geometry";

const root = process.cwd();
const output = await mkdtemp(path.join(os.tmpdir(), "pulp-wars-v7-resources-"));
const ids = [
  "building-ruleset7-resource-lumber-camp",
  "terrain-ruleset7-resource-fertile-ground",
  "terrain-ruleset7-original-fruit-pear",
  "terrain-ruleset7-original-fruit-plum",
  "terrain-ruleset7-original-game-deer",
  "terrain-ruleset7-original-game-fox",
] as const;
const source = JSON.parse(
  await readFile(path.join(root, "scripts/art/pixellab-manifest.json"), "utf8"),
) as {
  readonly recipes: readonly {
    readonly id: string;
    readonly output: string;
    readonly requestSize: { readonly width: number; readonly height: number };
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly anchor?: { readonly x: number; readonly y: number };
    readonly hardBounds: {
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
    };
  }[];
};
const generated = JSON.parse(
  await readFile(
    path.join(root, "scripts/art/pixellab-generated.json"),
    "utf8",
  ),
) as {
  readonly records: Readonly<
    Record<
      string,
      {
        readonly status: string;
        readonly candidate?: string;
        readonly outputSha256?: string;
        readonly candidateSha256?: string;
        readonly alphaBounds?: {
          readonly left: number;
          readonly top: number;
          readonly right: number;
          readonly bottom: number;
        };
      }
    >
  >;
};
const recipeById = new Map(source.recipes.map((recipe) => [recipe.id, recipe]));
const files = new Map<string, string>();
for (const id of ids) {
  const recipe = recipeById.get(id);
  const record = generated.records[id];
  if (
    recipe === undefined ||
    record === undefined ||
    !["ACCEPTED", "CANDIDATE"].includes(record.status)
  )
    throw new Error(`${id}: missing recipe or generated candidate`);
  const file = path.join(
    root,
    record.status === "ACCEPTED" ? recipe.output : (record.candidate ?? ""),
  );
  const data = await readFile(file);
  const digest = createHash("sha256").update(data).digest("hex");
  if (
    digest !==
    (record.status === "ACCEPTED"
      ? record.outputSha256
      : record.candidateSha256)
  )
    throw new Error(`${id}: file hash differs from generation record`);
  const info = await sharp(data).metadata();
  if (
    info.width !== recipe.outputSize.width ||
    info.height !== recipe.outputSize.height ||
    info.channels !== 4
  )
    throw new Error(`${id}: source size/alpha differs from recipe`);
  const bounds = record.alphaBounds;
  if (
    bounds === undefined ||
    bounds.left < recipe.hardBounds.left ||
    bounds.top < recipe.hardBounds.top ||
    bounds.right > recipe.hardBounds.right ||
    bounds.bottom > recipe.hardBounds.bottom
  )
    throw new Error(`${id}: painted bounds exceed hard bounds`);
  files.set(id, file);
}

function fileFor(id: string): string {
  const file = files.get(id);
  if (file === undefined)
    throw new Error(`${id}: missing reviewed source file`);
  return file;
}

const sourceSheet = await sharp({
  create: {
    width: 1420,
    height: ids.length * 340 + 52,
    channels: 4,
    background: "#173133",
  },
})
  .composite(
    (
      await Promise.all(
        ids.map(async (id, index) => {
          const file = fileFor(id);
          const isCamp = index === 0;
          const sourceBuffer = await sharp(file).trim().png().toBuffer();
          const natural = await sharp(sourceBuffer).metadata();
          const nativeWidth = Math.round(
            (natural.width ?? 0) * (isCamp ? 0.36 : 0.5),
          );
          const nativeHeight = Math.round(
            (natural.height ?? 0) * (isCamp ? 0.36 : 0.5),
          );
          const native = await sharp(sourceBuffer)
            .resize(nativeWidth, nativeHeight)
            .png()
            .toBuffer();
          const enlarged = await sharp(sourceBuffer)
            .resize({
              width: Math.round((natural.width ?? 0) * 1.3),
              height: Math.round((natural.height ?? 0) * 1.3),
              fit: "inside",
            })
            .png()
            .toBuffer();
          const minimum = await sharp(native)
            .resize(
              Math.max(1, Math.round(nativeWidth * 0.625)),
              Math.max(1, Math.round(nativeHeight * 0.625)),
            )
            .png()
            .toBuffer();
          const y = 52 + index * 340;
          return [
            {
              input: svg(
                `<text x="12" y="30" fill="#fff1c9" font-size="18" font-family="sans-serif">${id}</text>`,
                720,
                42,
              ),
              left: 10,
              top: y,
            },
            { input: native, left: 220, top: y + 45 },
            { input: enlarged, left: 490, top: y + 40 },
            { input: minimum, left: 1050, top: y + 55 },
          ];
        }),
      )
    ).flat(),
  )
  .png()
  .toBuffer();
await writeFile(path.join(output, "native-enlarged-minzoom.png"), sourceSheet);

const contexts: OverlayOptions[] = [];
for (const [i, id] of ids.entries()) {
  const normal = await mapContext(id, 128);
  const minimum = await mapContext(id, 80);
  const x = (i % 2) * 760;
  const y = Math.floor(i / 2) * 455;
  contexts.push({
    input: svg(
      `<text x="12" y="30" fill="#fff1c9" font-size="18" font-family="sans-serif">${id}</text>`,
      745,
      42,
    ),
    left: x + 6,
    top: y + 4,
  });
  contexts.push({ input: normal, left: x + 6, top: y + 50 });
  contexts.push({ input: minimum, left: x + 425, top: y + 75 });
}
const contextSheet = await sharp({
  create: { width: 1520, height: 1365, channels: 4, background: "#173133" },
})
  .composite(contexts)
  .png()
  .toBuffer();
await writeFile(path.join(output, "map-context-1x-minzoom.png"), contextSheet);
const evidence = ids.map((id) => ({
  id,
  recipe: recipeById.get(id),
  record: generated.records[id],
  source: path.relative(root, fileFor(id)),
}));
await writeFile(
  path.join(output, "review-evidence.json"),
  JSON.stringify(
    {
      schemaVersion: 1,
      geometry: SQUARE_ART_GEOMETRY,
      assets: evidence,
      files: ["native-enlarged-minzoom.png", "map-context-1x-minzoom.png"],
    },
    null,
    2,
  ) + "\n",
);
await captureBrowser(output);
console.log(output);

async function mapContext(id: string, cell: number): Promise<Buffer> {
  const overlays: OverlayOptions[] = [];
  const grassIds = [1, 2, 3];
  for (let y = 0; y < 3; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      const grass = `public/assets/pixellab/terrain-ruleset7/original-grass-${grassIds[(x + y) % 3]}.png`;
      overlays.push({
        input: await sharp(path.join(root, grass))
          .resize(cell, cell)
          .png()
          .toBuffer(),
        left: x * cell,
        top: y * cell,
      });
      if (y === 1 && x !== 1) {
        const forest = `public/assets/pixellab/terrain-ruleset7/original-forest-${x + 1}.png`;
        overlays.push({
          input: await sharp(path.join(root, forest))
            .resize(cell, Math.round(cell * 1.5))
            .png()
            .toBuffer(),
          left: x * cell,
          top: Math.round((y - 0.5) * cell),
        });
      }
    }
  }
  if (id.includes("game")) {
    const forest =
      "public/assets/pixellab/terrain-ruleset7/original-forest-3.png";
    overlays.push({
      input: await sharp(path.join(root, forest))
        .resize(cell, Math.round(cell * 1.5))
        .png()
        .toBuffer(),
      left: cell,
      top: Math.round(cell * 0.5),
    });
  }
  const isCamp = id.includes("lumber-camp");
  const geometry = isCamp
    ? SQUARE_ART_GEOMETRY.ruleset7LumberCamp
    : SQUARE_ART_GEOMETRY.resource;
  const factor = cell / 128;
  const displayWidth = Math.round(
    geometry.width * geometry.displayScale * factor,
  );
  const displayHeight = Math.round(
    geometry.height * geometry.displayScale * factor,
  );
  const left = Math.round(
    cell * 1.5 - geometry.anchor.x * geometry.displayScale * factor,
  );
  const top = Math.round(
    cell * 1.5 - geometry.anchor.y * geometry.displayScale * factor,
  );
  overlays.push({
    input: await sharp(fileFor(id))
      .resize(displayWidth, displayHeight)
      .png()
      .toBuffer(),
    left,
    top,
  });
  return sharp({
    create: {
      width: cell * 3,
      height: cell * 3,
      channels: 4,
      background: "#6f9255",
    },
  })
    .composite(overlays)
    .png()
    .toBuffer();
}

function svg(content: string, width: number, height: number): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${content}</svg>`,
  );
}

// This browser fixture builds an ordinary v7 render plan from a copied public
// view and paints it with the shipped Canvas renderer. It never mutates gameplay.
async function captureBrowser(outputDirectory: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  const { rm } = await import("node:fs/promises");
  const chrome = process.env.CHROME_PATH;
  if (!chrome)
    throw new Error("Set CHROME_PATH to a headless Chrome executable.");
  const port = 12_200 + (process.pid % 1_000);
  const userData = path.join(outputDirectory, "chrome-profile");
  const baseUrl =
    process.env.RESOURCE_REVIEW_BASE_URL ?? "http://localhost:6173/?ruleset=7";
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
      "--window-size=1440,1050",
      baseUrl,
    ],
    { stdio: "ignore" },
  );
  let connection: BrowserConnection | null = null;
  try {
    const target = await browserTarget(port, baseUrl);
    connection = await browserConnect(target);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await browserWait(
      connection,
      `document.querySelector('[data-v7-setup]') !== null`,
    );
    await browserEval(
      connection,
      `(() => { const input = document.querySelector('#v7-seed'); const launch = document.querySelector('[data-action="launch"]'); if (!(input instanceof HTMLInputElement) || !(launch instanceof HTMLButtonElement)) throw new Error('v7 setup unavailable'); input.value = '20'; input.dispatchEvent(new Event('input', { bubbles: true })); launch.click(); })()`,
    );
    await browserWait(
      connection,
      `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'ACTIVE'`,
    );
    const natural = await browserEval<{
      readonly capital: { readonly x: number; readonly y: number };
      readonly at: { readonly x: number; readonly y: number };
      readonly resource: string;
    }>(
      connection,
      `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const capital = view.cities.find(city => city.ownerId === view.viewer.id && city.isCapital)?.at; const tile = view.board.tiles.find(tile => tile.explored && tile.resource === 'FRUIT' && !view.units.some(unit => unit.at.x === tile.at.x && unit.at.y === tile.at.y)); if (!capital || !tile) throw new Error('Natural Fruit selection fixture unavailable'); return { capital, at: tile.at, resource: tile.resource }; })()`,
    );
    await browserKey(connection, "Escape");
    for (
      let x = natural.capital.x;
      x !== natural.at.x;
      x += Math.sign(natural.at.x - x)
    )
      await browserKey(
        connection,
        natural.at.x < x ? "ArrowLeft" : "ArrowRight",
      );
    for (
      let y = natural.capital.y;
      y !== natural.at.y;
      y += Math.sign(natural.at.y - y)
    )
      await browserKey(connection, natural.at.y < y ? "ArrowUp" : "ArrowDown");
    await browserKey(connection, "Enter");
    await browserWait(
      connection,
      `document.querySelector('.v7-selection-dock .v7-identity-art img')?.dataset.assetId !== undefined`,
    );
    const naturalSelection = await browserEval<{
      readonly expected: string;
      readonly actual: string;
    }>(
      connection,
      `(async () => { const { resourceMapArtIdV7 } = await import('/src/assets/ruleset7-ui-art.ts'); const expected = resourceMapArtIdV7(${JSON.stringify(natural.resource)}, ${JSON.stringify(natural.at)}); const actual = document.querySelector('.v7-selection-dock .v7-identity-art img')?.dataset.assetId; if (expected !== actual) throw new Error('Actual selected tile art differs from map variant: ' + expected + ' / ' + actual); return { expected, actual }; })()`,
    );
    await browserScreenshot(
      connection,
      path.join(outputDirectory, "browser-natural-selection.png"),
    );
    const evidence = await browserEval<{
      readonly resourcePairs: readonly {
        readonly resource: string;
        readonly at: { readonly x: number; readonly y: number };
        readonly mapAsset: string;
        readonly identityAsset: string;
      }[];
      readonly campAsset: string;
      readonly campHasUnit: boolean;
      readonly grassUnderCamp: boolean;
    }>(
      connection,
      `(async () => {
        const { buildBoardRenderPlanV7, drawBoardV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
        const { ACCEPTED_ART_URLS } = await import('/src/assets/generated-art-manifest.ts');
        const { resourceMapArtIdV7, RULESET7_IMPROVEMENT_ART_IDS } = await import('/src/assets/ruleset7-ui-art.ts');
        const { selectionIdentityArtworkLayoutV7 } = await import('/src/render/dom/selection-identity-v7.ts');
        const original = globalThis.__PULP_WARS_APP__.controller.snapshot().view;
        const template = original.board.tiles.find(tile => tile.explored);
        const unit = original.units.find(candidate => candidate.ownerId === original.viewer.id);
        if (!template || !unit) throw new Error('Browser review needs an explored tile and player unit');
        const positions = [
          { x: 1, y: 1, resource: 'FRUIT' },
          { x: 2, y: 1, resource: 'FRUIT' },
          { x: 3, y: 1, resource: 'FRUIT' },
          { x: 1, y: 2, resource: 'GAME' },
          { x: 2, y: 2, resource: 'GAME' },
          { x: 3, y: 2, resource: 'GAME' },
          { x: 4, y: 1, resource: 'FERTILE_GROUND' },
        ];
        const matching = (at) => positions.find(position => position.x === at.x && position.y === at.y);
        const tiles = [];
        for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
          const at = { x, y }, special = matching(at), camp = x === 4 && y === 2;
          tiles.push({ ...template, at, explored: true, biome: template.biome,
            terrain: camp || special?.resource === 'GAME' || (y === 2 && x < 5) ? 'FOREST' : 'GRASS',
            resource: special?.resource ?? null, improvement: camp ? 'LUMBER_CAMP' : null,
            road: false, site: null, territoryCityId: null, territoryOwnerId: null });
        }
        const view = { ...original, board: { ...original.board, width: 6, height: 4, tiles },
          cities: [], units: [{ ...unit, at: { x: 4, y: 2 } }], improvementValues: [], treasureChests: [] };
        const plan = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null });
        const resourcePairs = positions.map(position => {
          const at = { x: position.x, y: position.y };
          const mapAsset = plan.entries.find(entry => entry.key === 'resource:' + at.x + ',' + at.y)?.assetId;
          const identityAsset = resourceMapArtIdV7(position.resource, at);
          if (!mapAsset || mapAsset !== identityAsset) throw new Error('Map/identity asset mismatch at ' + at.x + ',' + at.y);
          if (!selectionIdentityArtworkLayoutV7(identityAsset)) throw new Error('Missing identity layout for ' + identityAsset);
          return { resource: position.resource, at, mapAsset, identityAsset };
        });
        const campAsset = plan.entries.find(entry => entry.key === 'improvement:4,2')?.assetId;
        const campHasUnit = plan.entries.some(entry => entry.kind === 'UNIT' && entry.at.x === 4 && entry.at.y === 2);
        const grassUnderCamp = plan.entries.some(entry => entry.key === 'terrain:4,2' && entry.assetId?.startsWith('terrain-ruleset7-original-grass'));
        if (campAsset !== RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP || !campHasUnit || !grassUnderCamp)
          throw new Error('Camp suppression/unit fixture failed');
        const required = ${JSON.stringify(ids)};
        const present = new Set(plan.entries.map(entry => entry.assetId));
        if (required.some(id => !present.has(id))) throw new Error('One or more refreshed assets absent from browser plan');
        const images = new Map();
        await Promise.all([...present].filter(Boolean).map(async id => {
          const url = ACCEPTED_ART_URLS[id];
          if (!url) return;
          const image = new Image(); image.src = url; await image.decode(); images.set(id, image);
        }));
        document.body.replaceChildren();
        document.body.style.cssText = 'margin:0;background:#173133;color:#fff1c9;font:16px sans-serif;overflow:hidden';
        const title = document.createElement('div'); title.textContent = 'Ruleset 7 resource refresh · actual Canvas renderer'; title.style.cssText = 'font:700 21px sans-serif;white-space:nowrap;margin:12px'; document.body.append(title);
        const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:12px;margin:12px'; document.body.append(row);
        const canvas = document.createElement('canvas'); canvas.width = 930; canvas.height = 620; canvas.style.cssText = 'width:930px;height:620px;border:2px solid #f4e6b8'; row.append(canvas);
        const identities = document.createElement('div'); identities.style.cssText = 'width:440px;display:grid;grid-template-columns:repeat(3,138px);gap:7px'; row.append(identities);
        for (const pair of [...resourcePairs, { resource: 'LUMBER_CAMP', at: { x: 4, y: 2 }, mapAsset: campAsset, identityAsset: campAsset }]) {
          const frame = selectionIdentityArtworkLayoutV7(pair.identityAsset);
          if (!frame) throw new Error('Missing selected-identity frame for ' + pair.identityAsset);
          const card = document.createElement('div'); card.style.cssText = 'height:185px;background:#284642;border:1px solid #e4d5ac;text-align:center';
          const label = document.createElement('div'); label.textContent = pair.resource + ' ' + pair.at.x + ',' + pair.at.y; label.style.cssText = 'font-size:12px;height:22px'; card.append(label);
          const viewport = document.createElement('div'); viewport.style.cssText = 'width:112px;height:130px;position:relative;margin:auto;background:#fff8df;overflow:hidden';
          const image = document.createElement('img'); image.src = ACCEPTED_ART_URLS[pair.identityAsset]; image.dataset.assetId = pair.identityAsset;
          image.style.cssText = 'position:absolute;left:' + frame.left + 'px;top:' + frame.top + 'px;width:' + frame.width + 'px;height:' + frame.height + 'px'; viewport.append(image); card.append(viewport);
          const idLabel = document.createElement('div'); idLabel.textContent = pair.identityAsset.replace('terrain-ruleset7-original-', ''); idLabel.style.cssText = 'font-size:9px;overflow:hidden'; card.append(idLabel); identities.append(card);
        }
        await Promise.all([...identities.querySelectorAll('img')].map(image => image.decode()));
        globalThis.__resourceReview = { draw(zoom) {
          drawBoardV7({ context: canvas.getContext('2d'), viewport: { width: 930, height: 620 }, devicePixelRatio: 1,
            camera: { offsetX: 155, offsetY: 120, zoom }, plan, images: { resolve: id => images.get(id) ?? null }, reducedMotion: true });
        }};
        globalThis.__resourceReview.draw(1);
        return { resourcePairs, campAsset, campHasUnit, grassUnderCamp };
      })()`,
    );
    await browserScreenshot(
      connection,
      path.join(outputDirectory, "browser-renderer-1x-selection.png"),
    );
    await browserEval(connection, `globalThis.__resourceReview.draw(0.625)`);
    await browserScreenshot(
      connection,
      path.join(outputDirectory, "browser-renderer-minzoom-selection.png"),
    );
    await writeFile(
      path.join(outputDirectory, "browser-evidence.json"),
      JSON.stringify({ naturalSelection, ...evidence }, null, 2) + "\n",
    );
  } finally {
    connection?.close();
    browser.kill();
    await rm(userData, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    }).catch(() => undefined);
  }
}

interface BrowserConnection {
  send(method: string, params?: object): Promise<unknown>;
  close(): void;
}

async function browserTarget(port: number, url: string): Promise<string> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/json/list`);
      const targets = (await response.json()) as readonly {
        readonly type: string;
        readonly url: string;
        readonly webSocketDebuggerUrl: string;
      }[];
      const target = targets.find(
        (entry) => entry.type === "page" && entry.url.startsWith(url),
      );
      if (target) return target.webSocketDebuggerUrl;
    } catch {
      /* Chrome is starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Resource-review Chrome target unavailable");
}

async function browserConnect(url: string): Promise<BrowserConnection> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener(
      "error",
      () => reject(new Error("Chrome connection failed")),
      { once: true },
    );
  });
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve(value: unknown): void; reject(error: Error): void }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id === undefined) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error)
      request.reject(new Error(message.error.message ?? "Chrome error"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function browserEval<T>(
  connection: BrowserConnection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    result?: { value?: T };
    exceptionDetails?: { exception?: { description?: string }; text?: string };
  };
  if (response.exceptionDetails)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  return response.result?.value as T;
}

async function browserWait(
  connection: BrowserConnection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (
      await browserEval<boolean>(connection, `Boolean(${expression})`).catch(
        () => false,
      )
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Browser review timed out: ${expression}`);
}

async function browserScreenshot(
  connection: BrowserConnection,
  file: string,
): Promise<void> {
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { data?: string };
  if (!result.data) throw new Error("Browser screenshot missing data");
  await writeFile(file, Buffer.from(result.data, "base64"));
}

async function browserKey(
  connection: BrowserConnection,
  key: string,
): Promise<void> {
  const codes: Readonly<Record<string, number>> = {
    Escape: 27,
    Enter: 13,
    ArrowLeft: 37,
    ArrowRight: 39,
    ArrowUp: 38,
    ArrowDown: 40,
  };
  const code = codes[key];
  if (code === undefined) throw new Error(`Unknown browser-review key: ${key}`);
  await connection.send("Input.dispatchKeyEvent", {
    type: key === "Enter" ? "keyDown" : "rawKeyDown",
    ...(key === "Enter" ? { text: "\r" } : {}),
    key,
    code: key,
    windowsVirtualKeyCode: code,
    nativeVirtualKeyCode: code,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code: key,
    windowsVirtualKeyCode: code,
    nativeVirtualKeyCode: code,
  });
}
