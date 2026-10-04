/**
 * Review evidence of the faction building study (bead pulp_wars-xdh.1,
 * docs/art/FACTION_BUILDINGS.md, exploration run
 * art/explorations/faction-buildings-2026-10/).
 *
 *   npm run art:faction-buildings-review
 *   npm run art:faction-buildings-review -- --skip-capture
 *   npm run art:faction-buildings-review -- --port 6540 --copy-to DIR
 *
 * Writes art/pixellab/reviews/faction-buildings-study/:
 *
 * - `buildings-{x3,1x}.png`: one row per sampled building (the Undead
 *   Graveyard, the Martian Solar Array, the Dwarf Mushroom Farm, the
 *   Dinosaur Grinding Stone): today's shared Human building on Grass, the
 *   accepted sample on its faction's ground (a Farm also as a 3 x 3 block),
 *   and the faction's City 2. A sample with no accepted master is drawn as
 *   a "PixelLab pending" plate.
 * - `grass-x2.png`: today's three Grass tiles and Forest, each Undead grass
 *   candidate's tiles and Forest, and for each a 6 x 3 field whose left half
 *   is today's Grass and right half the candidate, as at a territory edge.
 * - `scene-<faction>-<before|after>-<desktop|phone>-zoom-<1|0.75>.png`: the
 *   scenes of scripts/art/faction-buildings/scene.ts drawn by the real board
 *   host in the live look: the studied faction's city territory beside a
 *   Human one, today ("before") and with the proposal in the studied
 *   territory ("after"). Undead and Martian are always captured; Dinosaur,
 *   Ice Folk (under its Snow) and Dwarf once they have an accepted sample.
 * - `scene-undead-after-grass-<variant>-desktop-zoom-1.png`: the Undead
 *   scene with each other grass candidate.
 * - `before-after-contact.png`: every scene's before and after side by side
 *   (desktop at zoom 1 and phone at zoom 0.75), labelled.
 * - `index.json`.
 *
 * Captures start Vite on port 6540 unless `--port` says otherwise, need
 * CHROME_PATH (and `node` on the PATH for Vite), and are written after the
 * browser closes (a file written under the project while the page is open
 * makes the dev server reload). `--copy-to DIR` copies the key outputs.
 * No PixelLab call.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import sharp, { type OverlayOptions } from "sharp";
import type { FactionIdV7 } from "../../src/engine/index";
import {
  FACTION_BUILDING_CHANGES_V7,
  RECOMMENDED_UNDEAD_GRASS,
  type FactionBuildingChangeV7,
} from "./faction-buildings/proposal";
import {
  FACTION_BUILDINGS_RUN,
  UNDEAD_GRASS_VARIANTS,
  grassColourMap,
  undeadForestFile,
  undeadGrassFile,
} from "./faction-buildings/undead-grass";
import type { SceneBuildingV7, SceneGrassV7 } from "./faction-buildings/scene";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "art/pixellab/reviews/faction-buildings-study");
const written: string[] = [];

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index < 0 ? undefined : process.argv[index + 1];
}

const FACTION_LABEL: Readonly<Record<string, string>> = {
  ORIGINAL: "Human",
  UNDEAD: "Undead",
  GOBLIN: "Goblin",
  DINOSAUR: "Dinosaur",
  MARTIAN: "Martian",
  ICE_FOLK: "Ice Folk",
  DWARF: "Dwarf",
};
const CITY_SLUG: Readonly<Record<string, string>> = {
  UNDEAD: "undead",
  MARTIAN: "martian",
  DINOSAUR: "dinosaur",
  DWARF: "dwarf",
  ICE_FOLK: "ice-folk",
  GOBLIN: "goblin",
};
const TODAY_BUILDING: Readonly<Record<string, string>> = {
  FARM: "public/assets/chibi/buildings/chibi-direction-farm.png",
  WINDMILL: "public/assets/chibi/buildings/chibi-direction-windmill.png",
  SAWMILL: "public/assets/chibi/buildings/chibi-direction-sawmill.png",
};
const GRASS_TODAY = [1, 2, 3].map(
  (index) => `public/assets/chibi/terrain/chibi-grass-${index}.png`,
);
const FOREST_TODAY = "public/assets/chibi/terrain/chibi-forest-1.png";

// ------------------------------------------------------------ samples

interface AcceptedMaster {
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly recipe: string;
}

/** Accepted masters of the exploration run, by asset id. */
async function acceptedMasters(): Promise<Map<string, AcceptedMaster>> {
  const file = path.join(ROOT, FACTION_BUILDINGS_RUN, "records.json");
  const result = new Map<string, AcceptedMaster>();
  if (!existsSync(file)) return result;
  const records = JSON.parse(await readFile(file, "utf8")) as {
    assets?: Record<
      string,
      {
        status?: string;
        recipe?: string;
        master?: { path?: string; width?: number; height?: number };
      }
    >;
  };
  for (const [id, record] of Object.entries(records.assets ?? {}))
    if (
      record.status === "ACCEPTED" &&
      record.master?.path !== undefined &&
      existsSync(path.join(ROOT, record.master.path))
    )
      result.set(id, {
        path: record.master.path,
        width: record.master.width ?? 0,
        height: record.master.height ?? 0,
        recipe: record.recipe ?? "",
      });
  return result;
}

function sampled(): readonly FactionBuildingChangeV7[] {
  return FACTION_BUILDING_CHANGES_V7.filter(
    (change) => change.stage === "sample",
  );
}

/** The scene's proposed rasters of one faction (accepted samples only). */
function sceneBuildings(
  faction: FactionIdV7,
  masters: ReadonlyMap<string, AcceptedMaster>,
): SceneBuildingV7[] {
  const result: SceneBuildingV7[] = [];
  for (const change of sampled()) {
    if (change.faction !== faction || change.asset === undefined) continue;
    const master = masters.get(change.asset);
    if (master === undefined) continue;
    result.push({
      improvement: change.improvement,
      url: `/${master.path}`,
      width: master.width,
      height: master.height,
    });
  }
  return result;
}

function sceneGrass(variant: string): SceneGrassV7 {
  return {
    tiles: [1, 2, 3].map((index) => `/${undeadGrassFile(variant, index)}`),
    forests: [1, 2].map((index) => `/${undeadForestFile(variant, index)}`),
  };
}

// ------------------------------------------------------------ sheets

async function scaled(file: string, scale: number): Promise<Buffer> {
  const image = sharp(path.join(ROOT, file));
  const { width = 0, height = 0 } = await image.metadata();
  return image
    .resize(width * scale, height * scale, { kernel: "nearest" })
    .png()
    .toBuffer();
}

async function sizeOf(
  file: string,
): Promise<{ width: number; height: number }> {
  const { width = 0, height = 0 } = await sharp(
    path.join(ROOT, file),
  ).metadata();
  return { width, height };
}

function escapeXml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function label(text: string, width: number, height: number, size = 14): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="4" y="${Math.round(height * 0.7)}" font-family="Helvetica, Arial, sans-serif" font-size="${size}" fill="#f2efe6">${escapeXml(text)}</text></svg>`,
  );
}

function pendingPlate(width: number, height: number, text: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="#2b2f36" stroke="#9aa3ad" stroke-width="2" stroke-dasharray="6 4"/><text x="${width / 2}" y="${height / 2}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${Math.max(9, Math.round(width / 9))}" fill="#d7dbe0">${escapeXml(text)}</text></svg>`,
  );
}

/** A tile-sized ground (repeated tiles) with a sprite seated on it. */
async function onGround(
  ground: readonly string[],
  sprite: string | null,
  scale: number,
  cells: { columns: number; rows: number } = { columns: 1, rows: 1 },
  spriteEverywhere = false,
): Promise<Buffer> {
  const tile = 80 * scale;
  const composites: OverlayOptions[] = [];
  for (let row = 0; row < cells.rows; row += 1)
    for (let column = 0; column < cells.columns; column += 1) {
      const file = ground[(column * 31 + row * 17) % ground.length] ?? "";
      composites.push({
        input: await scaled(file, scale),
        left: column * tile,
        top: row * tile,
      });
      const here =
        sprite !== null &&
        (spriteEverywhere ||
          (row === Math.floor(cells.rows / 2) &&
            column === Math.floor(cells.columns / 2)));
      if (!here || sprite === null) continue;
      const size = await sizeOf(sprite);
      // Buildings are bottom-centred on the cell (anchor y = height - 40).
      composites.push({
        input: await scaled(sprite, scale),
        left: column * tile + Math.round(((80 - size.width) / 2) * scale),
        top: row * tile + Math.round((80 - size.height) * scale),
      });
    }
  return sharp({
    create: {
      width: tile * cells.columns,
      height: tile * cells.rows,
      channels: 4,
      background: "#000000",
    },
  })
    .composite(composites)
    .png()
    .toBuffer();
}

function factionGround(faction: FactionIdV7): readonly string[] {
  return faction === "UNDEAD"
    ? [1, 2, 3].map((index) => undeadGrassFile(RECOMMENDED_UNDEAD_GRASS, index))
    : GRASS_TODAY;
}

async function buildingsSheet(
  scale: number,
  name: string,
  masters: ReadonlyMap<string, AcceptedMaster>,
): Promise<void> {
  const tile = 80 * scale;
  const gap = 8 * scale;
  const header = 22 * Math.max(1, scale / 2);
  const columns = [
    { label: "Today", width: tile },
    { label: "Proposed", width: tile },
    { label: "Farms: today, 3 x 3", width: tile * 3 },
    { label: "Farms: proposed, 3 x 3", width: tile * 3 },
    { label: "City 2", width: tile + 16 * scale },
  ];
  const rows = sampled();
  const rowHeight = tile * 3 + header + gap;
  const width =
    columns.reduce((sum, column) => sum + column.width + gap, gap) + 220;
  const height = header + rows.length * rowHeight + gap;
  const composites: OverlayOptions[] = [];
  let x = 220 + gap;
  for (const column of columns) {
    composites.push({
      input: label(column.label, column.width, header, 13),
      left: x,
      top: 0,
    });
    x += column.width + gap;
  }
  for (const [index, change] of rows.entries()) {
    const top = header + index * rowHeight;
    const master =
      change.asset === undefined ? undefined : masters.get(change.asset);
    composites.push({
      input: label(
        `${FACTION_LABEL[change.faction] ?? change.faction}: ${title(change.improvement)} -> ${change.name}`,
        220,
        header,
        12,
      ),
      left: 4,
      top: top + header,
    });
    composites.push({
      input: label(
        master === undefined
          ? "sample: PixelLab pending"
          : `sample: ${master.recipe}`,
        220,
        header,
        11,
      ),
      left: 4,
      top: top + header * 2,
    });
    let left = 220 + gap;
    const today = TODAY_BUILDING[change.improvement] ?? null;
    composites.push({
      input: await onGround(GRASS_TODAY, today, scale),
      left,
      top: top + header,
    });
    left += tile + gap;
    const ground = factionGround(change.faction);
    composites.push({
      input:
        master === undefined
          ? pendingPlate(tile, tile, "PixelLab pending")
          : await onGround(ground, master.path, scale),
      left,
      top: top + header,
    });
    left += tile + gap;
    if (change.improvement === "FARM" && today !== null)
      composites.push({
        input: await onGround(
          GRASS_TODAY,
          today,
          scale,
          { columns: 3, rows: 3 },
          true,
        ),
        left,
        top: top + header,
      });
    left += tile * 3 + gap;
    if (change.improvement === "FARM")
      composites.push({
        input:
          master === undefined
            ? pendingPlate(tile * 3, tile * 3, "PixelLab pending")
            : await onGround(
                ground,
                master.path,
                scale,
                { columns: 3, rows: 3 },
                true,
              ),
        left,
        top: top + header,
      });
    left += tile * 3 + gap;
    const slug = CITY_SLUG[change.faction];
    if (slug !== undefined) {
      const city = `public/assets/chibi/settlements/chibi-direction-${slug}-city-2.png`;
      const size = await sizeOf(city);
      composites.push({
        input: await scaled(city, scale),
        left: left + Math.round(((96 - size.width) / 2) * scale),
        top: top + header + tile * 3 - size.height * scale,
      });
    }
  }
  await sharp({
    create: { width, height, channels: 4, background: "#1d2226" },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, name));
  written.push(name);
  console.log(`wrote ${name}`);
}

async function grassSheet(): Promise<void> {
  const scale = 2;
  const tile = 80 * scale;
  const gap = 12;
  const header = 24;
  const rows: { label: string; tiles: string[]; forest: string }[] = [
    { label: "Today", tiles: GRASS_TODAY, forest: FOREST_TODAY },
    ...UNDEAD_GRASS_VARIANTS.map((spec) => ({
      label: `${spec.label}${spec.id === RECOMMENDED_UNDEAD_GRASS ? " (recommended)" : ""}`,
      tiles: [1, 2, 3].map((index) => undeadGrassFile(spec.id, index)),
      forest: undeadForestFile(spec.id, 1),
    })),
  ];
  const fieldWidth = tile * 3;
  const width = gap + 4 * (tile + gap) + fieldWidth + gap;
  const rowHeight = header + 104 * scale + gap;
  const height = rows.length * rowHeight + gap;
  const composites: OverlayOptions[] = [];
  for (const [index, row] of rows.entries()) {
    const top = index * rowHeight;
    composites.push({
      input: label(row.label, width, header, 14),
      left: gap,
      top,
    });
    for (const [column, file] of row.tiles.entries())
      composites.push({
        input: await scaled(file, scale),
        left: gap + column * (tile + gap),
        top: top + header + 24 * scale,
      });
    composites.push({
      input: await scaled(row.forest, scale),
      left: gap + 3 * (tile + gap),
      top: top + header,
    });
    if (index === 0) continue;
    // A 6 x 3 field at x1 scale... drawn at half the sheet scale: today's
    // Grass on the left half, the candidate on the right, as at a border.
    const cells: Buffer[] = [];
    for (let y = 0; y < 3; y += 1)
      for (let x = 0; x < 6; x += 1) {
        const set = x < 3 ? GRASS_TODAY : row.tiles;
        cells.push(await scaled(set[(x * 31 + y * 17) % 3] ?? "", 1));
      }
    const field = await sharp({
      create: { width: 480, height: 240, channels: 4, background: "#000000" },
    })
      .composite(
        cells.map((input, cell) => ({
          input,
          left: (cell % 6) * 80,
          top: Math.floor(cell / 6) * 80,
        })),
      )
      .png()
      .toBuffer();
    composites.push({
      input: field,
      left: gap + 4 * (tile + gap),
      top: top + header,
    });
  }
  await sharp({
    create: { width, height, channels: 4, background: "#1d2226" },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, "grass-x2.png"));
  written.push("grass-x2.png");
  console.log("wrote grass-x2.png");
}

function title(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

// ------------------------------------------------------------ browser

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  close(): void;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
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
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      method: string;
    }
  >();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as {
      id?: number;
      result?: unknown;
      error?: { message?: string };
    };
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
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        socket.send(JSON.stringify({ id, method, params }));
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
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as {
    result?: { value?: T };
    exceptionDetails?: { exception?: { description?: string }; text?: string };
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
  attempts = 400,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
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

async function screenshot(connection: Connection): Promise<Buffer> {
  const shot = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { data?: string };
  if (shot.data === undefined) throw new Error("Chrome returned no screenshot");
  return Buffer.from(shot.data, "base64");
}

/** Screenshots until two in a row match, so every raster has loaded. */
async function settledScreenshot(connection: Connection): Promise<Buffer> {
  let previous = await screenshot(connection);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(350);
    const next = await screenshot(connection);
    if (attempt > 0 && next.equals(previous)) return next;
    previous = next;
  }
  return previous;
}

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900, dpr: 1, mobile: false },
  { name: "phone", width: 390, height: 844, dpr: 3, mobile: true },
] as const;
const ZOOMS = ["1", "0.75"] as const;
const SCENE = `globalThis.__FACTION_BUILDINGS_SCENE__`;

interface SceneCapture {
  readonly name: string;
  readonly faction: FactionIdV7;
  readonly after: boolean;
  readonly buildings: readonly SceneBuildingV7[];
  readonly grass: SceneGrassV7 | null;
  readonly viewports: readonly string[];
  readonly zooms: readonly string[];
}

function sceneCaptures(
  masters: ReadonlyMap<string, AcceptedMaster>,
): SceneCapture[] {
  const captures: SceneCapture[] = [];
  const factions: FactionIdV7[] = ["UNDEAD", "MARTIAN"];
  for (const extra of ["DINOSAUR", "ICE_FOLK", "DWARF"] as const)
    if (sceneBuildings(extra, masters).length > 0) factions.push(extra);
  for (const faction of factions)
    for (const after of [false, true])
      captures.push({
        name: `scene-${faction.toLowerCase()}-${after ? "after" : "before"}`,
        faction,
        after,
        buildings: after ? sceneBuildings(faction, masters) : [],
        grass:
          after && faction === "UNDEAD"
            ? sceneGrass(RECOMMENDED_UNDEAD_GRASS)
            : null,
        viewports: VIEWPORTS.map((viewport) => viewport.name),
        zooms: ZOOMS,
      });
  for (const spec of UNDEAD_GRASS_VARIANTS)
    if (spec.id !== RECOMMENDED_UNDEAD_GRASS)
      captures.push({
        name: `scene-undead-after-grass-${spec.id}`,
        faction: "UNDEAD",
        after: true,
        buildings: sceneBuildings("UNDEAD", masters),
        grass: sceneGrass(spec.id),
        viewports: ["desktop"],
        zooms: ["1"],
      });
  return captures;
}

async function captureAll(
  baseUrl: string,
  captures: readonly SceneCapture[],
): Promise<{ name: string; png: Buffer }[]> {
  const chrome = process.env.CHROME_PATH;
  if (chrome === undefined || chrome === "")
    throw new Error("Set CHROME_PATH to a Chrome binary (or --skip-capture)");
  const shots: { name: string; png: Buffer }[] = [];
  const debugPort = 11_200 + (process.pid % 80);
  const profile = await mkdtemp(
    path.join(tmpdir(), "pulp-wars-faction-buildings-"),
  );
  const url = new URL(baseUrl);
  url.searchParams.set("art", "chibi");
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profile}`,
      "--window-size=1440,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let attempt = 0; attempt < 150 && target === undefined; attempt += 1) {
      try {
        const response = await fetch(`http://localhost:${debugPort}/json/list`);
        const targets = (await response.json()) as {
          type: string;
          webSocketDebuggerUrl: string;
        }[];
        target = targets.find((candidate) => candidate.type === "page");
      } catch {
        // Chrome may not have opened its debugging port yet.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined)
      throw new Error("Chrome debugging target did not become ready");
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    for (const viewport of VIEWPORTS) {
      const wanted = captures.filter((capture) =>
        capture.viewports.includes(viewport.name),
      );
      if (wanted.length === 0) continue;
      await connection.send("Emulation.setDeviceMetricsOverride", {
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: viewport.dpr,
        mobile: viewport.mobile,
      });
      await evaluate(connection, `globalThis.__FB_OLD__ = true`);
      await connection.send("Page.navigate", { url: url.href });
      await waitFor(
        connection,
        `globalThis.__FB_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
      );
      await evaluate(
        connection,
        `(() => { for (const key of Object.keys(localStorage)) if (key.startsWith('pulpWars.save.')) localStorage.removeItem(key); globalThis.__FB_OLD__ = true; })()`,
      );
      await connection.send("Page.reload");
      await waitFor(
        connection,
        `globalThis.__FB_OLD__ !== true && document.readyState === 'complete' && document.querySelector('[data-action="launch"]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
      );
      // The fixed 16 x 16 Showcase board: the scenes rewrite an 8 x 6 patch
      // around the capital.
      await evaluate(
        connection,
        `(() => { const type = document.querySelector('#v7-map-type'); type.value = 'SHOWCASE'; type.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-action="launch"]').click(); return true; })()`,
      );
      await waitFor(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v?.humanPlayerId && document.querySelector('canvas.board-canvas-v7')?.dataset.artSet === 'CHIBI'; })()`,
        900,
      );
      for (const capture of wanted) {
        const options = {
          faction: capture.faction,
          after: capture.after,
          buildings: capture.buildings,
          grass: capture.grass,
        };
        await evaluate(
          connection,
          `(async () => { const module = await import('/scripts/art/faction-buildings/scene.ts'); ${SCENE} = module.showFactionBuildingsSceneV7(globalThis.__PULP_WARS_APP__.controller.snapshot().view, ${JSON.stringify(options)}); return true; })()`,
        );
        for (const step of capture.zooms) {
          for (let attempt = 0; attempt < 6; attempt += 1) {
            const current = await evaluate<string | null>(
              connection,
              `${SCENE}.canvas.dataset.zoomStep ?? null`,
            );
            if (current === step) break;
            await evaluate(
              connection,
              `${SCENE}.host.zoom(${JSON.stringify(Number(current) < Number(step) ? "IN" : "OUT")})`,
            );
          }
          const zoomStep = await evaluate<string | null>(
            connection,
            `${SCENE}.canvas.dataset.zoomStep ?? null`,
          );
          if (zoomStep !== step)
            throw new Error(`scene could not reach zoom ${step}: ${zoomStep}`);
          const name = `${capture.name}-${viewport.name}-zoom-${step}.png`;
          shots.push({ name, png: await settledScreenshot(connection) });
          console.log(`captured ${name}`);
        }
        await evaluate(
          connection,
          `(() => { ${SCENE}.host.destroy(); document.querySelector('[data-chibi-review-scene]')?.remove(); delete ${SCENE}; return true; })()`,
        );
      }
    }
    connection.close();
  } finally {
    browser.kill();
    await delay(300);
    await rm(profile, { recursive: true, force: true }).catch(() => undefined);
  }
  return shots;
}

/** The bounding box of bright pixels (luma > 100), padded by 24 px. */
async function litBox(
  png: Buffer,
): Promise<{ left: number; top: number; width: number; height: number }> {
  const { data, info } = await sharp(png)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1)
    for (let x = 0; x < info.width; x += 1) {
      const at = (y * info.width + x) * info.channels;
      const luma =
        0.299 * (data[at] ?? 0) +
        0.587 * (data[at + 1] ?? 0) +
        0.114 * (data[at + 2] ?? 0);
      if (luma <= 100) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  if (right < 0)
    return { left: 0, top: 0, width: info.width, height: info.height };
  const pad = 24;
  left = Math.max(0, left - pad);
  top = Math.max(0, top - pad);
  right = Math.min(info.width - 1, right + pad);
  bottom = Math.min(info.height - 1, bottom + pad);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

/** Before and after of every scene, side by side, labelled. */
async function contactSheet(
  shots: readonly { name: string; png: Buffer }[],
  captures: readonly SceneCapture[],
): Promise<void> {
  const byName = new Map(shots.map((shot) => [shot.name, shot.png]));
  const pairs: { label: string; before: Buffer; after: Buffer }[] = [];
  const factions = [
    ...new Set(
      captures
        .filter((capture) => !capture.name.includes("-grass-"))
        .map((capture) => capture.faction),
    ),
  ];
  for (const faction of factions)
    for (const [viewport, zoom, factor] of [
      ["desktop", "1", 0.5],
      ["phone", "0.75", 0.25],
    ] as const) {
      const slug = faction.toLowerCase();
      const before = byName.get(
        `scene-${slug}-before-${viewport}-zoom-${zoom}.png`,
      );
      const after = byName.get(
        `scene-${slug}-after-${viewport}-zoom-${zoom}.png`,
      );
      if (before === undefined || after === undefined) continue;
      // Both frames are cut to the before frame's lit board (the scene
      // patch; fog and the page around it are dark), so they line up.
      const box = await litBox(before);
      const shrink = async (png: Buffer) =>
        sharp(png)
          .extract(box)
          .resize(
            Math.round(box.width * factor * 1.6),
            Math.round(box.height * factor * 1.6),
            { kernel: "lanczos3" },
          )
          .png()
          .toBuffer();
      pairs.push({
        label: `${FACTION_LABEL[faction] ?? faction} territory (left) beside Human (right), ${viewport} zoom ${zoom}: today | proposal`,
        before: await shrink(before),
        after: await shrink(after),
      });
    }
  if (pairs.length === 0) return;
  const header = 26;
  const gap = 12;
  const rows: {
    top: number;
    height: number;
    pair: (typeof pairs)[number];
    width: number;
  }[] = [];
  let top = gap;
  let width = 0;
  for (const pair of pairs) {
    const a = await sharp(pair.before).metadata();
    const rowWidth = (a.width ?? 0) * 2 + gap * 3;
    width = Math.max(width, rowWidth);
    rows.push({
      top,
      height: header + (a.height ?? 0),
      pair,
      width: a.width ?? 0,
    });
    top += header + (a.height ?? 0) + gap;
  }
  const composites: OverlayOptions[] = [];
  for (const row of rows) {
    composites.push({
      input: label(row.pair.label, width, header, 15),
      left: gap,
      top: row.top,
    });
    composites.push({
      input: row.pair.before,
      left: gap,
      top: row.top + header,
    });
    composites.push({
      input: row.pair.after,
      left: gap * 2 + row.width,
      top: row.top + header,
    });
  }
  await sharp({
    create: { width, height: top, channels: 4, background: "#1d2226" },
  })
    .composite(composites)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, "before-after-contact.png"));
  written.push("before-after-contact.png");
  console.log("wrote before-after-contact.png");
}

async function waitForServer(url: string): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The dev server is still starting.
    }
    await delay(150);
  }
  throw new Error(`Dev server at ${url} did not start`);
}

async function startDevServer(port: number): Promise<ChildProcess> {
  if (port === 6173)
    throw new Error("Port 6173 is the user's dev server; pick another");
  const server = spawn(
    path.join(ROOT, "node_modules/.bin/vite"),
    ["--host", "localhost", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", detached: true },
  );
  await waitForServer(`http://localhost:${port}/`);
  return server;
}

function stopDevServer(server: ChildProcess): void {
  if (server.pid === undefined) return;
  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
}

async function main(): Promise<void> {
  await mkdir(OUT, { recursive: true });
  const masters = await acceptedMasters();
  await buildingsSheet(3, "buildings-x3.png", masters);
  await buildingsSheet(1, "buildings-1x.png", masters);
  await grassSheet();
  const captures = sceneCaptures(masters);
  if (!process.argv.includes("--skip-capture")) {
    const port = Number.parseInt(option("--port") ?? "6540", 10);
    const given = option("--url");
    const server = given === undefined ? await startDevServer(port) : undefined;
    let shots: { name: string; png: Buffer }[];
    try {
      shots = await captureAll(given ?? `http://localhost:${port}/`, captures);
    } finally {
      if (server !== undefined) stopDevServer(server);
    }
    // Written after the browser is done: a file written under the project
    // while the page is open makes the dev server reload it.
    for (const shot of shots) {
      await writeFile(path.join(OUT, shot.name), shot.png);
      written.push(shot.name);
    }
    await contactSheet(shots, captures);
  }
  const files = [...new Set(written)].sort();
  await writeFile(
    path.join(OUT, "index.json"),
    `${JSON.stringify(
      {
        bead: "pulp_wars-xdh.1",
        run: FACTION_BUILDINGS_RUN,
        command: "npm run art:faction-buildings-review",
        note: "A study: nothing is wired into the game. The scene-* captures draw the live look with the proposal applied per cell to the studied faction's territory only (scripts/art/faction-buildings/scene.ts). A sample without an accepted master is drawn as today's building in the scenes and as a 'PixelLab pending' plate in the sheets.",
        samples: Object.fromEntries(
          sampled().map((change) => [
            change.asset ?? change.name,
            masters.get(change.asset ?? "")?.recipe ?? "PixelLab pending",
          ]),
        ),
        undeadGrass: Object.fromEntries(
          UNDEAD_GRASS_VARIANTS.map((spec) => [
            spec.id,
            {
              label: spec.label,
              colours: Object.fromEntries(grassColourMap(spec)),
              recommended: spec.id === RECOMMENDED_UNDEAD_GRASS,
            },
          ]),
        ),
        files,
      },
      null,
      2,
    )}\n`,
  );
  console.log(`wrote index.json (${files.length} files)`);
  const copyTo = option("--copy-to");
  if (copyTo !== undefined && !copyTo.startsWith("--")) {
    await mkdir(copyTo, { recursive: true });
    for (const file of files.filter(
      (name) =>
        !name.endsWith(".json") &&
        (!name.startsWith("scene-") ||
          name.includes("zoom-1") ||
          name.includes("phone-zoom-0.75")),
    ))
      await copyFile(path.join(OUT, file), path.join(copyTo, file));
    await copyFile(
      path.join(OUT, "index.json"),
      path.join(copyTo, "index.json"),
    );
    console.log(`copied the key outputs to ${copyTo}`);
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? (error.stack ?? error.message) : "review failed",
  );
  process.exitCode = 1;
});
