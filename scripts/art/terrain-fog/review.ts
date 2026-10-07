/**
 * Screenshots of the real game for the terrain-and-fog review (bead
 * pulp_wars-2yc.28, docs/art/TERRAIN_AT_THE_FOG.md): the Ruleset 7 app view
 * and board host, live CHIBI look, over the states of
 * scripts/art/terrain-fog/review-scenes.ts.
 *
 *   npx vite --port 6823 --strictPort &
 *   CHROME_PATH=... TERRAIN_FOG_URL=http://localhost:6823/ \
 *     npx tsx scripts/art/terrain-fog/review.ts <set> <out-dir>
 *
 * `<set>` is one of the shot lists below: `partial` (multi-cell terrain
 * half inside the fog), `skins` (a wood changing hands under each kind of
 * occupant), `palettes` (the fog's palettes) or `ripple` (a capture's
 * ripple, frame by frame). Each shot writes `<name>.png`; `palettes` and
 * `ripple` also write a labelled sheet. No PixelLab call.
 */
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import sharp, { type OverlayOptions } from "sharp";
import type { TerrainFogSceneOptions } from "./review-scenes";

interface Shot {
  readonly name: string;
  readonly scene: TerrainFogSceneOptions;
  readonly query?: string;
  readonly zoomIn?: 0 | 1 | 2;
  readonly drag?: readonly [number, number];
  /**
   * Run in the page after the board has settled: `tf.show(options)` swaps
   * the state as an accepted command would, `tf.boardHost` is the host.
   */
  readonly then?: string;
  /** Milliseconds to wait after `then` (default 600). */
  readonly settle?: number;
  /**
   * After `then`: the territory ripple held at each of these times (ms
   * after its start), one screenshot each, `<name>-<ms>.png`.
   */
  readonly frames?: readonly number[];
  /** After everything: an expression whose value is written to `<name>.cost.json`. */
  readonly measure?: string;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Replaces the running app with the app view over a review state. */
function mountExpression(scene: TerrainFogSceneOptions): string {
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const scenes = await import('/scripts/art/terrain-fog/review-scenes.ts');
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      const build = (options) => options.large === true ? scenes.terrainFogLargeScene(options) : scenes.terrainFogScene(options);
      const first = ${JSON.stringify(scene)};
      let state = build(first);
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const subscribers = new Set();
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
        subscribeAcceptedBoundary() { return () => undefined; },
        async dispatch() { return { accepted: false, reason: 'ENGINE_REJECTED', error: { code: 'FIXTURE', params: {} } }; },
        async launch() { throw new Error('fixture launch unavailable'); },
        async resume() { return true; },
        async returnToMenu() { return false; },
        async progressAiTurns() { return { ok: false, cancelled: true, acceptedCommands: 0, diagnostic: 'fixture' }; },
        async restart() { return { ok: false, code: 'CONTROLLER_DESTROYED', diagnostic: 'fixture' }; },
        async deleteStoredSave() { return false; },
        setFastForward() {},
        exportSafeLog() { return null; },
        exportDebugBundle() { return { ok: false, reason: 'NO_ACTIVE_MATCH' }; },
      };
      const { terrainSkeletonOfRowsV7, terrainAtFogEnabledV7 } = await import('/src/render/canvas/terrain-at-fog-v7.ts');
      // The review's map is built by hand: its skeleton is its own rows.
      const skeleton = terrainSkeletonOfRowsV7(scenes.TERRAIN_FOG_TERRAIN);
      // (A generated map has the skeleton of its own setup.)
      const boardHost = new CanvasBoardHostV7(document, first.large === true ? {} : { terrainSkeleton: () => (terrainAtFogEnabledV7() ? skeleton : null) });
      const view = new Ruleset7DomAppView(document, document.querySelector('#app'), controller, { boardHost, settingsStorage: null, artSet: 'CHIBI' });
      globalThis.tf = {
        boardHost,
        view,
        /** Swaps the state, as the app does after an accepted command. */
        show(options) {
          state = { ...build(options), commandIndex: state.commandIndex + 1 };
          const next = snapshot();
          for (const subscriber of subscribers) subscriber(next);
        },
        currentView: () => engine.viewForV7(state, state.humanPlayerId),
        /** Where the cells are on the page, and which are unexplored. */
        geometry() {
          const canvas = document.querySelector('canvas.board-canvas-v7').getBoundingClientRect();
          const first = boardHost.cellCentreCssPx({ x: 0, y: 0 });
          const next = boardHost.cellCentreCssPx({ x: 1, y: 1 });
          const view = engine.viewForV7(state, state.humanPlayerId);
          return {
            x: canvas.left + first.x,
            y: canvas.top + first.y,
            cell: next.x - first.x,
            cells: view.board.tiles.length,
            fog: view.board.tiles.filter((tile) => !tile.explored).map((tile) => [tile.at.x, tile.at.y]),
          };
        },
      };
    })()`;
}

interface Connection {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>;
  close(): void;
}

async function connect(url: string): Promise<Connection> {
  const socket = new WebSocket(url);
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("CDP failed")), {
      once: true,
    });
  });
  let next = 1;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
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
      request.reject(new Error(message.error.message ?? "CDP error"));
    else request.resolve(message.result);
  });
  return {
    send(method, params = {}) {
      const id = next;
      next += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close: () => socket.close(),
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
        "evaluate failed",
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
  throw new Error(`timed out waiting for ${expression}`);
}

const PAGE = [1440, 900] as const;

async function screenshot(connection: Connection, file: string): Promise<void> {
  const result = (await connection.send("Page.captureScreenshot", {
    format: "png",
  })) as { data: string };
  await writeFile(file, Buffer.from(result.data, "base64"));
  console.log(`wrote ${file}`);
}

async function open(
  connection: Connection,
  base: string,
  shot: Shot,
): Promise<void> {
  const url = new URL(base);
  url.searchParams.set("art", "chibi");
  // `TERRAIN_FOG_QUERY` adds switches to every shot (`fog-terrain=0`).
  for (const [name, value] of new URLSearchParams(
    process.env.TERRAIN_FOG_QUERY ?? "",
  ))
    url.searchParams.set(name, value);
  for (const [name, value] of new URLSearchParams(shot.query ?? ""))
    url.searchParams.set(name, value);
  await evaluate(connection, `globalThis.__TF_OLD__ = true`).catch(
    () => undefined,
  );
  await connection.send("Page.navigate", { url: url.href });
  await waitFor(
    connection,
    `globalThis.__TF_OLD__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
  );
  await evaluate(connection, mountExpression(shot.scene));
  await waitFor(
    connection,
    `document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  await delay(400);
  for (let step = 0; step < (shot.zoomIn ?? 0); step += 1)
    await evaluate(connection, `globalThis.tf.boardHost.zoom('IN')`);
  if (shot.drag !== undefined) {
    const from = { x: 720, y: 520 };
    const mouse = (type: string, x: number, y: number): Promise<unknown> =>
      connection.send("Input.dispatchMouseEvent", {
        type,
        x,
        y,
        button: "left",
        buttons: type === "mouseReleased" ? 0 : 1,
        clickCount: 1,
      });
    await mouse("mousePressed", from.x, from.y);
    for (let step = 1; step <= 10; step += 1)
      await mouse(
        "mouseMoved",
        from.x + (shot.drag[0] * step) / 10,
        from.y + (shot.drag[1] * step) / 10,
      );
    await mouse("mouseReleased", from.x + shot.drag[0], from.y + shot.drag[1]);
  }
  // Art loads asynchronously and redraws the board.
  await delay(2200);
  if (shot.then !== undefined) {
    await evaluate(connection, `(async () => { ${shot.then} })()`);
    await delay(shot.settle ?? 600);
  }
}

const label = (text: string, width = 420, size = 18): Buffer =>
  Buffer.from(
    `<svg width="${width}" height="${size + 12}"><text x="2" y="${size + 3}" font-family="Helvetica" font-weight="700" font-size="${size}" fill="#f2f2ee">${text}</text></svg>`,
  );

/** A grid of labelled crops of written shots. */
async function sheet(
  out: string,
  file: string,
  columns: number,
  cells: readonly {
    readonly title: string;
    readonly from: string;
    readonly box: readonly [number, number, number, number];
    readonly scale?: number;
  }[],
): Promise<void> {
  const gap = 12;
  const head = 32;
  const sizes = cells.map((cell) => ({
    width: cell.box[2] * (cell.scale ?? 1),
    height: cell.box[3] * (cell.scale ?? 1),
  }));
  const cellWidth = Math.max(...sizes.map((size) => size.width));
  const cellHeight = Math.max(...sizes.map((size) => size.height));
  const rows = Math.ceil(cells.length / columns);
  const composites: OverlayOptions[] = [];
  for (const [index, cell] of cells.entries()) {
    const left = (index % columns) * (cellWidth + gap);
    const top = Math.floor(index / columns) * (cellHeight + head + gap);
    const size = sizes[index] as { width: number; height: number };
    composites.push({ input: label(cell.title, cellWidth), left, top });
    composites.push({
      input: await sharp(path.join(out, `${cell.from}.png`))
        .extract({
          left: cell.box[0],
          top: cell.box[1],
          width: cell.box[2],
          height: cell.box[3],
        })
        .resize(size.width, size.height, {
          kernel: (cell.scale ?? 1) < 1 ? "lanczos3" : "nearest",
        })
        .png()
        .toBuffer(),
      left,
      top: top + head,
    });
  }
  await sharp({
    create: {
      width: columns * (cellWidth + gap) - gap,
      height: rows * (cellHeight + head + gap) - gap,
      channels: 4,
      background: { r: 20, g: 24, b: 26, alpha: 1 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(out, file));
  console.log(`wrote ${path.join(out, file)}`);
}

// ------------------------------------------------------------------- sets

/** Multi-cell terrain half inside the fog: the range, the wood, the bay. */
const PARTIAL: readonly Shot[] = [
  { name: "all", scene: { cut: "ALL" } },
  { name: "west-6", scene: { cut: { west: 6 } } },
  { name: "west-7", scene: { cut: { west: 7 } } },
  { name: "north-3", scene: { cut: { north: 3 } } },
  { name: "north-2", scene: { cut: { north: 2 } } },
  { name: "south-6", scene: { cut: { south: 6 } } },
  { name: "south-2", scene: { cut: { south: 2 } } },
  { name: "diagonal", scene: { cut: "DIAGONAL" } },
  {
    name: "west-6-near",
    scene: { cut: { west: 6 } },
    zoomIn: 2,
    drag: [260, 330],
  },
  {
    name: "west-7-near",
    scene: { cut: { west: 7 } },
    zoomIn: 2,
    drag: [260, 330],
  },
  { name: "all-near", scene: { cut: "ALL" }, zoomIn: 2, drag: [260, 330] },
  {
    name: "north-3-near",
    scene: { cut: { north: 3 } },
    zoomIn: 2,
    drag: [260, 330],
  },
  {
    name: "north-2-near",
    scene: { cut: { north: 2 } },
    zoomIn: 2,
    drag: [260, 330],
  },
  {
    name: "south-2-near",
    scene: { cut: { south: 2 } },
    zoomIn: 2,
    drag: [260, 330],
  },
  {
    name: "diagonal-near",
    scene: { cut: "DIAGONAL" },
    zoomIn: 2,
    drag: [260, 330],
  },
  // The wood, in every faction's skin.
  ...(
    [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "DWARF",
      "CANDY",
      "ICE_FOLK",
    ] as const
  ).flatMap((faction): Shot[] => [
    {
      name: `wood-${faction.toLowerCase()}-west-5`,
      scene: { faction, widened: true, cut: { west: 5 } },
      zoomIn: 2,
      drag: [420, -40],
    },
    {
      name: `wood-${faction.toLowerCase()}-south-6`,
      scene: { faction, widened: true, cut: { south: 6 } },
      zoomIn: 2,
      drag: [420, -40],
    },
  ]),
];

/**
 * A wood changing hands: `-fresh` is the board opened on the new owner,
 * `-switched` the board opened on the old owner and then given the new
 * one, as a capture does. The two must be the same picture.
 */
const SKINS: readonly Shot[] = (
  [
    ["ORIGINAL", "GOBLIN"],
    ["CANDY", "UNDEAD"],
    ["DINOSAUR", "MARTIAN"],
    ["DWARF", "CANDY"],
  ] as const
).flatMap(([faction, other]): Shot[] => {
  const scene = { faction, other, widened: true } as const;
  const name = `${faction.toLowerCase()}-to-${other.toLowerCase()}`;
  return [
    { name: `${name}-old`, scene, zoomIn: 1, drag: [200, -60] },
    {
      name: `${name}-fresh`,
      scene: { ...scene, owner: 1 },
      zoomIn: 1,
      drag: [200, -60],
    },
    {
      name: `${name}-switched`,
      scene,
      zoomIn: 1,
      drag: [200, -60],
      then: `globalThis.tf.show(${JSON.stringify({ ...scene, owner: 1 })});`,
      settle: 2500,
    },
    // The very next frame: no wait for art at all.
    {
      name: `${name}-switched-at-once`,
      scene,
      zoomIn: 1,
      drag: [200, -60],
      then: `globalThis.tf.show(${JSON.stringify({ ...scene, owner: 1 })});`,
      settle: 0,
    },
  ];
});

/** The fog's palettes over one scene, at normal zoom and zoomed in. */
const PALETTE_NAMES = [
  "slate",
  "dusk",
  "cumulus",
  "parchment",
  "midnight",
  "plum",
] as const;
const PALETTE_SCENE = { cut: { west: 6 } } as const;
const PALETTES: readonly Shot[] = PALETTE_NAMES.flatMap((name): Shot[] => [
  { name, scene: PALETTE_SCENE, query: `fog-style=${name}` },
  {
    name: `${name}-near`,
    scene: PALETTE_SCENE,
    query: `fog-style=${name}`,
    zoomIn: 2,
    drag: [330, -120],
  },
]);

/**
 * The same camera before and after the rest is explored: `<cut>` is the
 * board half in the fog, `<cut>-explored` the same board, opened the same
 * way and then shown the whole map. Away from where the cloud's edge was,
 * the two must be the same picture (scripts/art/terrain-fog/diff.ts).
 */
const STABLE_CUTS = [
  ["west-6", { west: 6 }],
  ["west-7", { west: 7 }],
  ["north-2", { north: 2 }],
  ["north-3", { north: 3 }],
  ["south-2", { south: 2 }],
  ["south-6", { south: 6 }],
  ["diagonal", "DIAGONAL"],
] as const;
const STABLE: readonly Shot[] = (["ORIGINAL", "CANDY"] as const).flatMap(
  (faction) =>
    STABLE_CUTS.flatMap(([name, cut]): Shot[] => {
      const scene = { faction, cut, widened: faction !== "ORIGINAL" };
      const base = {
        scene,
        zoomIn: 2 as const,
        drag: [260, 250] as const,
      };
      const prefix = faction === "ORIGINAL" ? name : `candy-${name}`;
      return [
        { name: prefix, ...base },
        {
          name: `${prefix}-explored`,
          ...base,
          then: `globalThis.tf.show(${JSON.stringify({ ...scene, cut: "ALL" })});`,
          settle: 1500,
        },
      ];
    }),
);

/**
 * A capture, frame by frame: the wood's city passes from the Undead to the
 * viewer (Candy), its cells hop row by row, and the ripple is held every
 * 100 ms (every 50 ms for the 3 x 3 city).
 */
const RIPPLE_FRAMES = [
  0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100,
];
/** Draws the ripple step by step and times every frame's drawing. */
const RIPPLE_COST_BODY = `
  const host = globalThis.tf.boardHost;
  const time = (ms) => { const from = performance.now(); host.pinTerrainRipple(ms); return performance.now() - from; };
  const stats = (list) => ({ frames: list.length, meanMs: +(list.reduce((a, b) => a + b, 0) / list.length).toFixed(2), maxMs: +Math.max(...list).toFixed(2) });
  for (let i = 0; i < 10; i += 1) time(60000);
  const still = []; for (let i = 0; i < 60; i += 1) still.push(time(60000));
  const ripple = []; for (let ms = 0; ms <= 1200; ms += 16) ripple.push(time(ms));
  host.pinTerrainRipple(null);
  const measured = { cells: globalThis.tf.geometry().cells, cellPx: globalThis.tf.geometry().cell, stillBoard: stats(still), duringRipple: stats(ripple) };
`;
const RIPPLE_COST = `${RIPPLE_COST_BODY}
  return measured;
`;
/**
 * The same, while Coins fly to the HUD and a city hops (the feedback
 * animations of bead pulp_wars-2yc.29): both at once.
 */
const RIPPLE_COST_WITH_FEEDBACK = `
  const feedback = globalThis.tf.boardHost.feedback;
  const view = globalThis.tf.currentView();
  const city = view.cities.find((item) => item.at.x === 7 && item.at.y === 9);
  const unit = view.units[0];
  // Population icons fly to the city, the city hops, a unit earns its
  // Promotion, and (in the HUD) the Coins count up.
  feedback.launch(feedback.hold({
    coins: [{ cause: "INCOME", at: { x: 10, y: 6 }, amount: 8 }],
    coinTotal: 8,
    population: [{
      cityId: city.id,
      cityAt: city.at,
      amount: 6,
      sources: [
        { at: { x: 4, y: 6 }, amount: 2 },
        { at: { x: 5, y: 7 }, amount: 2 },
        { at: { x: 7, y: 8 }, amount: 2 },
      ],
      leveledUp: true,
      meterBefore: { level: 1, population: 0 },
    }],
    promotionsEarned: [{ unitId: unit.id, at: unit.at, own: true }],
    promoted: [],
  }));
  feedback.territoryClick(view, { x: 10, y: 6 });
  const flying = feedback.snapshot();
  ${RIPPLE_COST_BODY}
  return { ...measured, feedbackAtStart: flying, feedbackAtEnd: feedback.snapshot() };
`;
const CITY_FRAMES = [
  0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650,
];
const RIPPLE: readonly Shot[] = [
  // A normal 3 x 3 city: nine cells, row by row, every 50 ms.
  {
    name: "city",
    scene: { faction: "CANDY", other: "UNDEAD", owner: 1 },
    zoomIn: 2,
    drag: [-40, -300],
    then: `globalThis.tf.show(${JSON.stringify({ faction: "CANDY", other: "UNDEAD", owner: 0 })}); globalThis.tf.boardHost.pinTerrainRipple(0);`,
    settle: 300,
    frames: CITY_FRAMES,
  },
  {
    name: "capture",
    scene: { faction: "CANDY", other: "UNDEAD", widened: true, owner: 1 },
    zoomIn: 1,
    drag: [200, -60],
    then: `globalThis.tf.show(${JSON.stringify({ faction: "CANDY", other: "UNDEAD", widened: true, owner: 0 })}); globalThis.tf.boardHost.pinTerrainRipple(0);`,
    settle: 300,
    frames: RIPPLE_FRAMES,
    measure: RIPPLE_COST,
  },
  // The same capture with the feedback animations running at the same time.
  {
    name: "capture-with-feedback",
    scene: { faction: "CANDY", other: "UNDEAD", widened: true, owner: 1 },
    zoomIn: 1,
    drag: [200, -60],
    then: `globalThis.tf.show(${JSON.stringify({ faction: "CANDY", other: "UNDEAD", widened: true, owner: 0 })}); globalThis.tf.boardHost.pinTerrainRipple(0);`,
    settle: 300,
    measure: RIPPLE_COST_WITH_FEEDBACK,
  },
  // The largest map, all of it in view: a capital and its land change hands.
  {
    name: "large",
    scene: { large: true },
    then: `globalThis.tf.show({ large: true, captured: true }); globalThis.tf.boardHost.pinTerrainRipple(0);`,
    settle: 300,
    frames: [300, 600],
    measure: RIPPLE_COST,
  },
];

const SETS: Readonly<Record<string, readonly Shot[]>> = {
  ripple: RIPPLE,
  partial: PARTIAL,
  skins: SKINS,
  palettes: PALETTES,
  stable: STABLE,
};

/** The labelled sheets of a set, made of its written shots. */
async function sheets(set: string, out: string): Promise<void> {
  if (set === "ripple") {
    await sheet(
      out,
      "city-strip.png",
      7,
      CITY_FRAMES.map((ms) => ({
        title: `${ms} ms`,
        from: `city-${String(ms).padStart(4, "0")}`,
        box: [420, 200, 600, 600] as const,
        scale: 0.4,
      })),
    );
    await sheet(
      out,
      "capture-strip.png",
      4,
      RIPPLE_FRAMES.map((ms) => ({
        title: `${ms} ms`,
        from: `capture-${String(ms).padStart(4, "0")}`,
        box: [500, 210, 600, 600] as const,
        scale: 0.6,
      })),
    );
  }
  if (set === "palettes") {
    const chosen = process.env.TERRAIN_FOG_CHOSEN ?? "";
    const title = (name: string): string =>
      `${name}${name === "slate" ? " (the old one)" : ""}${name === chosen ? "  (CHOSEN: the default)" : ""}`;
    await sheet(
      out,
      "palettes-sheet.png",
      3,
      PALETTE_NAMES.map((name) => ({
        title: title(name),
        from: name,
        box: [60, 60, 960, 840] as const,
        scale: 0.5,
      })),
    );
    await sheet(
      out,
      "palettes-near-sheet.png",
      3,
      PALETTE_NAMES.map((name) => ({
        title: title(name),
        from: `${name}-near`,
        box: [0, 60, 960, 840] as const,
        scale: 0.5,
      })),
    );
  }
}

async function main(): Promise<void> {
  const [set, outArgument] = process.argv.slice(2);
  const shots = set === undefined ? undefined : SETS[set];
  if (shots === undefined || outArgument === undefined)
    throw new Error(
      `usage: review.ts <${Object.keys(SETS).join("|")}> <out-dir>`,
    );
  const out = path.resolve(outArgument);
  const base = process.env.TERRAIN_FOG_URL ?? "http://localhost:6823/";
  const chrome = process.env.CHROME_PATH;
  if (!chrome) throw new Error("Set CHROME_PATH");
  await mkdir(out, { recursive: true });
  const port = 10_600 + (process.pid % 80);
  const profile = await mkdtemp(path.join(tmpdir(), "terrain-fog-"));
  const browser = spawn(
    chrome,
    [
      "--headless=new",
      "--mute-audio",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      `--window-size=${PAGE[0]},${PAGE[1]}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let target: { webSocketDebuggerUrl: string } | undefined;
    for (let attempt = 0; attempt < 150 && target === undefined; attempt += 1) {
      try {
        const targets = (await (
          await fetch(`http://localhost:${port}/json/list`)
        ).json()) as { type: string; webSocketDebuggerUrl: string }[];
        target = targets.find((t) => t.type === "page");
      } catch {
        // Chrome is still starting.
      }
      if (target === undefined) await delay(100);
    }
    if (target === undefined) throw new Error("Chrome did not start");
    const connection = await connect(target.webSocketDebuggerUrl);
    await connection.send("Page.enable");
    await connection.send("Runtime.enable");
    await connection.send("Emulation.setDeviceMetricsOverride", {
      width: PAGE[0],
      height: PAGE[1],
      deviceScaleFactor: 1,
      mobile: false,
    });
    const only = process.env.TERRAIN_FOG_SHOTS?.split(",");
    for (const shot of shots) {
      if (only !== undefined && !only.includes(shot.name)) continue;
      await open(connection, base, shot);
      await screenshot(connection, path.join(out, `${shot.name}.png`));
      for (const ms of shot.frames ?? []) {
        await evaluate(
          connection,
          `globalThis.tf.boardHost.pinTerrainRipple(${ms})`,
        );
        await delay(120);
        await screenshot(
          connection,
          path.join(out, `${shot.name}-${String(ms).padStart(4, "0")}.png`),
        );
      }
      if (shot.measure !== undefined)
        await writeFile(
          path.join(out, `${shot.name}.cost.json`),
          JSON.stringify(
            await evaluate(connection, `(async () => { ${shot.measure} })()`),
            null,
            2,
          ),
        );
      await writeFile(
        path.join(out, `${shot.name}.json`),
        JSON.stringify(await evaluate(connection, `globalThis.tf.geometry()`)),
      );
    }
    connection.close();
    await sheets(set as string, out);
  } finally {
    browser.kill();
  }
}

if (
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href
)
  await main();
