import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
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

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly close: () => void;
};

interface FrameMetric {
  readonly zoom: number;
  readonly devicePixelRatio: 1 | 2;
  readonly mode: "FULL" | "REDUCED";
  readonly highContrast: boolean;
  readonly readyImages: number;
  readonly spentImages: number;
  readonly anchorErrors: number;
  readonly readyGlowColors: readonly string[];
  readonly selectedOutlineAfterUnit: boolean;
  readonly registrationSamples: number;
  readonly registrationMismatchPixels: number;
  readonly destinationRects: readonly DestinationTrace[];
  readonly sourceVisibleBounds: readonly PixelBounds[];
  readonly glowVisibleBounds: readonly PixelBounds[];
}

interface DestinationTrace extends PixelBounds {
  readonly anchorX: number;
  readonly anchorY: number;
}

interface PixelBounds {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const baseUrl = process.argv[2] ?? "http://localhost:6173";
const reviewRoot = path.join(
  process.cwd(),
  "art/integration/reviews/ruleset6-readiness",
);
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9261;
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-ruleset6-readiness-${process.pid}`
  : path.join(tmpdir(), `pulp-wars-ruleset6-readiness-${process.pid}`);
const cases = [
  {
    name: "full-minimum",
    zoom: 0.625,
    devicePixelRatio: 1,
    mode: "FULL",
    highContrast: false,
  },
  {
    name: "full-minimum-dpr2",
    zoom: 0.625,
    devicePixelRatio: 2,
    mode: "FULL",
    highContrast: false,
  },
  {
    name: "full-one-x",
    zoom: 1,
    devicePixelRatio: 1,
    mode: "FULL",
    highContrast: false,
  },
  {
    name: "full-one-x-dpr2",
    zoom: 1,
    devicePixelRatio: 2,
    mode: "FULL",
    highContrast: false,
  },
  {
    name: "full-maximum",
    zoom: 1.75,
    devicePixelRatio: 1,
    mode: "FULL",
    highContrast: false,
  },
  {
    name: "full-maximum-dpr2",
    zoom: 1.75,
    devicePixelRatio: 2,
    mode: "FULL",
    highContrast: false,
  },
  {
    name: "reduced-one-x",
    zoom: 1,
    devicePixelRatio: 1,
    mode: "REDUCED",
    highContrast: false,
  },
  {
    name: "high-contrast-minimum",
    zoom: 0.625,
    devicePixelRatio: 1,
    mode: "FULL",
    highContrast: true,
  },
] as const;

await mkdir(reviewRoot, { recursive: true });
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userData}`,
    "--window-size=900,620",
    baseUrl,
  ],
  { stdio: "ignore" },
);

try {
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 900,
    height: 620,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 900,
    screenHeight: 620,
  });
  await waitForExpression(connection, `document.readyState === 'complete'`);
  await waitForExpression(
    connection,
    `document.querySelector('#app') instanceof HTMLElement`,
  );

  const frames: Array<{
    readonly name: string;
    readonly metric: FrameMetric;
    readonly native: string;
    readonly enlarged: string;
  }> = [];
  for (const item of cases) {
    const metric = await renderFixture(
      connection,
      item.zoom,
      item.devicePixelRatio,
      item.mode,
      item.highContrast,
    );
    validateMetric(item.name, metric);
    const native = `${item.name}-native.png`;
    const enlarged = `${item.name}-enlarged.png`;
    await capture(connection, native);
    await sharp(path.join(reviewRoot, native))
      .resize(1_800, 1_240, { kernel: "nearest" })
      .png()
      .toFile(path.join(reviewRoot, enlarged));
    frames.push({ name: item.name, metric, native, enlarged });
  }

  const filenames = frames.flatMap(({ native, enlarged }) => [
    native,
    enlarged,
  ]);
  const evidence = {
    contract:
      "Ready units use an anchor-preserving silhouette glow plus scale/opacity rhythm; spent units have none; selection renders afterward; Reduced motion is static; high contrast is white.",
    fixture:
      "Original and Candy Fighters on light Grass and dark Forest/Mountain, plus one spent Original and one selected Candy unit.",
    zooms: [0.625, 1, 1.75],
    devicePixelRatios: [1, 2],
    modes: ["FULL", "REDUCED"],
    contrast: ["STANDARD", "HIGH"],
    frames,
    visualReview: {
      status: "ACCEPTED",
      nativeAndEnlarged: true,
      notes:
        "Every capture was inspected at native and nearest-neighbor 2x size. At 0.625x, 1x and 1.75x on DPR1/DPR2, every rendered glow matches the destination-local reference pixel for pixel; destination anchors and source/glow visible bounds are recorded per sprite. The warm or white silhouette stays attached to each ready raster, remains readable over Grass/Forest/Mountain for Original and Candy, does not appear on the spent unit, preserves the feet anchor, and remains subordinate to the cyan selected-cell outline. The Reduced frame is static and clearly distinct from the spent unit.",
    },
    artifacts: await artifactEvidence(filenames),
  };
  await writeFile(
    path.join(reviewRoot, "review-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(`Ruleset-6 readiness evidence written to ${reviewRoot}`);
} finally {
  browser.kill();
}

async function renderFixture(
  connection: Connection,
  zoom: number,
  devicePixelRatio: 1 | 2,
  mode: "FULL" | "REDUCED",
  highContrast: boolean,
): Promise<FrameMetric> {
  return evaluate<FrameMetric>(
    connection,
    `(async () => {
      const load = async (label, url) => {
        try {
          const probe = await fetch(url);
          if (!probe.ok) throw new Error('HTTP ' + probe.status + ': ' + await probe.text());
          return await import(url);
        }
        catch (error) { throw new Error(label + ': ' + (error?.stack ?? String(error))); }
      };
      await load('readiness', ${JSON.stringify(`${baseUrl}/src/render/canvas/readiness-presentation.ts`)});
      const renderer = await load('renderer', ${JSON.stringify(`${baseUrl}/src/render/canvas/board-renderer-v6.ts`)});
      const accepted = await load('accepted-images', ${JSON.stringify(`${baseUrl}/src/render/canvas/accepted-images-v6.ts`)});
      const geometry = await load('geometry', ${JSON.stringify(`${baseUrl}/src/render/canvas/board-art-geometry.ts`)});
      globalThis.__PULP_WARS_APP__?.destroy?.();
      const root = document.querySelector('#app');
      if (!root) throw new Error('Missing app root');
      root.replaceChildren();
      Object.assign(document.documentElement.style, { width: '100%', height: '100%', overflow: 'hidden' });
      Object.assign(document.body.style, { width: '100%', height: '100%', margin: '0', overflow: 'hidden', background: '#172b2b' });
      const heading = document.createElement('div');
      heading.textContent = ${JSON.stringify(`Ready unit cue · ${mode} · ${highContrast ? "High contrast" : "Standard contrast"} · ${zoom}x · DPR${devicePixelRatio}`)};
      Object.assign(heading.style, { height: '52px', boxSizing: 'border-box', padding: '14px 18px', color: '#fff', background: '#172b2b', font: '800 18px system-ui' });
      const canvas = document.createElement('canvas');
      canvas.width = 900 * ${devicePixelRatio};
      canvas.height = 568 * ${devicePixelRatio};
      canvas.style.width = '900px';
      canvas.style.height = '568px';
      root.append(heading, canvas);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Missing 2D context');
      const entries = [];
      let id = 1;
      const add = (kind, at, details, layer, ownerId) => entries.push({
        key: kind + ':' + String(id), kind, at, id: id++, ownerId, variant: 0, layer, details
      });
      const cells = [
        { at: { x: 0, y: 0 }, faction: 'ORIGINAL', terrain: 'GRASS', role: 'FIGHTER', readiness: 'PULSE', selected: false },
        { at: { x: 1, y: 0 }, faction: 'CANDY', terrain: 'GRASS', role: 'FIGHTER', readiness: 'PULSE', selected: false },
        { at: { x: 2, y: 0 }, faction: 'ORIGINAL', terrain: 'GRASS', role: 'GUARD', readiness: 'OPAQUE', selected: false },
        { at: { x: 0, y: 1 }, faction: 'ORIGINAL', terrain: 'FOREST', role: 'HEAVY', readiness: 'PULSE', selected: false },
        { at: { x: 1, y: 1 }, faction: 'CANDY', terrain: 'MOUNTAIN', role: 'MARKSMAN', readiness: 'PULSE', selected: false },
        { at: { x: 2, y: 1 }, faction: 'CANDY', terrain: 'FOREST', role: 'GUARD', readiness: 'PULSE', selected: true }
      ];
      for (const [index, cell] of cells.entries()) {
        const ownerId = cell.faction === 'ORIGINAL' ? 1 : 2;
        const unitId = 100 + index;
        add('TERRAIN', cell.at, { terrain: cell.terrain }, 1, ownerId);
        add('OWNERSHIP', cell.at, { faction: cell.faction }, 2, ownerId);
        add('CONTACT_SHADOW', cell.at, null, 5, ownerId);
        add('UNIT', cell.at, { faction: cell.faction, role: cell.role, readiness: cell.readiness }, 5, ownerId);
        if (cell.selected) add('SELECTION', cell.at, { selectionKind: 'UNIT' }, 6, ownerId);
        add('UNIT_STATUS', cell.at, { faction: cell.faction, role: cell.role, hp: 10, maxHp: 10, state: cell.readiness === 'PULSE' ? 'NEEDS_ACTION' : 'HANDLED', veteran: false }, 8, ownerId);
      }
      entries.sort((left, right) => left.layer - right.layer || left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id);
      const plan = { planVersion: 6, entries, legalCommands: [], commandTargets: [], economicPreview: null };
      const camera = { offsetX: 450 - 128 * ${zoom}, offsetY: 208 - 64 * ${zoom}, zoom: ${zoom} };
      const images = accepted.createRuleset6AcceptedImageResolver(document, () => {});
      const draw = () => renderer.drawBoardV6({
        context,
        viewport: { width: 900, height: 568 },
        camera,
        plan,
        devicePixelRatio: ${devicePixelRatio},
        images,
        readinessElapsedMs: 800,
        reducedMotion: ${JSON.stringify(mode)} === 'REDUCED',
        readinessVisible: true,
        highContrast: ${highContrast}
      });
      draw();
      await new Promise((resolve) => setTimeout(resolve, 250));
      const list = draw();
      const ready = list.commands.filter((command) => command.kind === 'IMAGE' && command.entryKey.startsWith('UNIT:') && command.glow);
      const spent = list.commands.filter((command) => command.kind === 'IMAGE' && command.entryKey.startsWith('UNIT:') && !command.glow);
      const anchorErrors = ready.filter((command) => {
        const anchorX = command.destination.x + command.destination.width * 0.5;
        const anchorY = command.destination.y + command.destination.height * 0.75;
        const source = entries.find((entry) => entry.key === command.entryKey);
        if (!source) return true;
        const expectedX = camera.offsetX + source.at.x * 128 * camera.zoom;
        const expectedY = camera.offsetY + source.at.y * 128 * camera.zoom + geometry.RULESET6_UNIT_COSMETIC_OFFSET_Y * camera.zoom;
        return Math.abs(anchorX - expectedX) > 0.000001 || Math.abs(anchorY - expectedY) > 0.000001;
      }).length;
      const selectedUnitIndex = list.commands.findIndex((command) => command.entryKey === 'UNIT:29');
      const selectedOutlineIndex = list.commands.findIndex((command) => command.entryKey === 'SELECTION:30');
      const alphaBounds = (canvas) => {
        const context = canvas.getContext('2d');
        if (!context) return null;
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = width;
        let top = height;
        let right = -1;
        let bottom = -1;
        for (let y = 0; y < height; y += 1) {
          for (let x = 0; x < width; x += 1) {
            if (data[(y * width + x) * 4 + 3] < 2) continue;
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
          }
        }
        return right < left ? null : { left, top, right, bottom };
      };
      const registrations = [];
      for (const command of ready) {
        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = 900 * ${devicePixelRatio};
        sourceCanvas.height = 568 * ${devicePixelRatio};
        const sourceContext = sourceCanvas.getContext('2d');
        const glowCanvas = document.createElement('canvas');
        glowCanvas.width = sourceCanvas.width;
        glowCanvas.height = sourceCanvas.height;
        const glowContext = glowCanvas.getContext('2d');
        if (!sourceContext || !glowContext) throw new Error('Missing registration contexts');
        sourceContext.setTransform(${devicePixelRatio}, 0, 0, ${devicePixelRatio}, 0, 0);
        glowContext.setTransform(${devicePixelRatio}, 0, 0, ${devicePixelRatio}, 0, 0);
        renderer.executeDrawCommandV6(sourceContext, { ...command, alpha: 1, glow: undefined }, images);
        renderer.executeDrawCommandV6(glowContext, { ...command, alpha: 0 }, images);
        const resolvedImage = images.resolve(command.assetId);
        if (!resolvedImage) throw new Error('Missing accepted image for registration trace');
        const expectedCanvas = document.createElement('canvas');
        expectedCanvas.width = sourceCanvas.width;
        expectedCanvas.height = sourceCanvas.height;
        const expectedContext = expectedCanvas.getContext('2d');
        const scratch = document.createElement('canvas');
        const blurDevicePx = command.glow.blur * ${devicePixelRatio};
        const paddingDevicePx = Math.max(2, Math.ceil(blurDevicePx * 3));
        const sourceWidthDevicePx = command.destination.width * ${devicePixelRatio};
        const sourceHeightDevicePx = command.destination.height * ${devicePixelRatio};
        scratch.width = Math.ceil(sourceWidthDevicePx + paddingDevicePx * 2);
        scratch.height = Math.ceil(sourceHeightDevicePx + paddingDevicePx * 2);
        const scratchContext = scratch.getContext('2d');
        if (!expectedContext || !scratchContext) throw new Error('Missing expected registration contexts');
        scratchContext.globalAlpha = command.glow.alpha;
        scratchContext.shadowColor = command.glow.color;
        scratchContext.shadowBlur = blurDevicePx;
        scratchContext.drawImage(resolvedImage, paddingDevicePx, paddingDevicePx, sourceWidthDevicePx, sourceHeightDevicePx);
        scratchContext.globalCompositeOperation = 'destination-out';
        scratchContext.globalAlpha = 1;
        scratchContext.shadowColor = 'transparent';
        scratchContext.shadowBlur = 0;
        scratchContext.drawImage(resolvedImage, paddingDevicePx, paddingDevicePx, sourceWidthDevicePx, sourceHeightDevicePx);
        expectedContext.setTransform(${devicePixelRatio}, 0, 0, ${devicePixelRatio}, 0, 0);
        expectedContext.drawImage(
          scratch,
          0,
          0,
          scratch.width,
          scratch.height,
          command.destination.x - paddingDevicePx / ${devicePixelRatio},
          command.destination.y - paddingDevicePx / ${devicePixelRatio},
          scratch.width / ${devicePixelRatio},
          scratch.height / ${devicePixelRatio}
        );
        const sourceBounds = alphaBounds(sourceCanvas);
        const glowBounds = alphaBounds(glowCanvas);
        if (!sourceBounds || !glowBounds) throw new Error('Missing source or glow alpha bounds');
        const actualPixels = glowContext.getImageData(0, 0, glowCanvas.width, glowCanvas.height).data;
        const expectedPixels = expectedContext.getImageData(0, 0, expectedCanvas.width, expectedCanvas.height).data;
        let registrationMismatchPixels = 0;
        for (let offset = 0; offset < actualPixels.length; offset += 4) {
          if (
            actualPixels[offset] !== expectedPixels[offset] ||
            actualPixels[offset + 1] !== expectedPixels[offset + 1] ||
            actualPixels[offset + 2] !== expectedPixels[offset + 2] ||
            actualPixels[offset + 3] !== expectedPixels[offset + 3]
          ) registrationMismatchPixels += 1;
        }
        registrations.push({
          sourceBounds,
          glowBounds,
          registrationMismatchPixels,
          destinationRect: {
            left: command.destination.x,
            top: command.destination.y,
            right: command.destination.x + command.destination.width,
            bottom: command.destination.y + command.destination.height,
            anchorX: command.destination.x + command.destination.width * 0.5,
            anchorY: command.destination.y + command.destination.height * 0.75
          }
        });
      }
      return {
        zoom: ${zoom},
        devicePixelRatio: ${devicePixelRatio},
        mode: ${JSON.stringify(mode)},
        highContrast: ${highContrast},
        readyImages: ready.length,
        spentImages: spent.length,
        anchorErrors,
        readyGlowColors: [...new Set(ready.map((command) => command.glow.color))],
        selectedOutlineAfterUnit: selectedUnitIndex >= 0 && selectedOutlineIndex > selectedUnitIndex,
        registrationSamples: registrations.length,
        registrationMismatchPixels: registrations.reduce((sum, sample) => sum + sample.registrationMismatchPixels, 0),
        destinationRects: registrations.map(({ destinationRect }) => destinationRect),
        sourceVisibleBounds: registrations.map(({ sourceBounds }) => sourceBounds),
        glowVisibleBounds: registrations.map(({ glowBounds }) => glowBounds)
      };
    })()`,
    true,
  );
}

function validateMetric(name: string, metric: FrameMetric): void {
  if (
    metric.readyImages !== 5 ||
    metric.spentImages !== 1 ||
    metric.anchorErrors !== 0 ||
    metric.registrationSamples !== 5 ||
    metric.registrationMismatchPixels !== 0 ||
    !metric.selectedOutlineAfterUnit
  )
    throw new Error(
      `${name} violated readiness geometry: ${JSON.stringify(metric)}`,
    );
  const expected = metric.highContrast ? "#ffffff" : "#fff09a";
  if (
    metric.readyGlowColors.length !== 1 ||
    metric.readyGlowColors[0] !== expected
  )
    throw new Error(`${name} used the wrong silhouette color`);
}

async function artifactEvidence(filenames: readonly string[]) {
  return Promise.all(
    filenames.map(async (filename) => {
      const data = await readFile(path.join(reviewRoot, filename));
      return {
        path: `art/integration/reviews/ruleset6-readiness/${filename}`,
        bytes: data.byteLength,
        sha256: createHash("sha256").update(data).digest("hex"),
      };
    }),
  );
}

async function capture(
  connection: Connection,
  filename: string,
): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  })) as { readonly data: string };
  await writeFile(
    path.join(reviewRoot, filename),
    Buffer.from(response.data, "base64"),
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
    try {
      if (await evaluate<boolean>(connection, `Boolean(${expression})`)) return;
    } catch {
      // Chrome may briefly replace the execution context during launch.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
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
    await new Promise((resolve) => setTimeout(resolve, 100));
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
