import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
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

interface RemoteValue<T> {
  readonly result?: { readonly value?: T };
  readonly exceptionDetails?: {
    readonly text?: string;
    readonly exception?: { readonly description?: string };
  };
}

interface ReviewFixture {
  readonly unitId: number;
  readonly cityId: number;
  readonly tile: { readonly x: number; readonly y: number };
}

interface ForestUiFixture {
  readonly cityId: number;
  readonly animal: { readonly x: number; readonly y: number };
  readonly emptyForest: { readonly x: number; readonly y: number };
}

interface GeometryMetric {
  readonly css: readonly [number, number, number, number];
  readonly backing: readonly [number, number];
  readonly cameraPoints: readonly [
    { readonly x: number; readonly y: number },
    { readonly x: number; readonly y: number },
  ];
  readonly dock: null | {
    readonly kind: string;
    readonly top: number;
    readonly bottom: number;
    readonly height: number;
    readonly maxBlockSize: string;
    readonly overflowY: string;
  };
  readonly focusId: string | null;
  readonly minimumControl: readonly [number, number];
  readonly controlVerticalBounds: readonly [number, number];
  readonly bottomControlVerticalBounds: readonly [number, number];
  readonly viewport: readonly [number, number, number];
  readonly pageOverflow: readonly [number, number];
  readonly markerDomCount: number;
}

interface PulseMetric {
  readonly spriteChangedPixels: number;
  readonly steadyCueChangedPixels: number;
}

const baseUrl = process.argv[2] ?? "http://localhost:6173";
const reviewRoot = path.join(process.cwd(), "art/integration/reviews");
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/usr/bin/google-chrome");
const port = 9231;
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${path.join(tmpdir(), `pulp-wars-hud-${process.pid}`)}`,
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
  await waitForExpression(
    connection,
    `document.readyState === 'complete' && document.querySelector('.app-shell')?.dataset.route === 'hub'`,
  );

  const evidence: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    chrome: await evaluate<string>(connection, "navigator.userAgent"),
    contract:
      "Canvas CSS/backing/camera geometry is invariant across no/tile/unit/city docks; full motion pulses only the ready unit raster; reduced motion is pixel-static.",
  };

  await setViewport(connection, 1440, 1000, 1, false);
  console.log("Reviewing desktop docks…");
  const desktopFixture = await installFixture(connection, false);
  const desktop: Record<string, GeometryMetric> = {};
  desktop.none = await geometry(connection);
  await select(connection, `unit:${desktopFixture.unitId}`);
  desktop.unit = await geometry(connection);
  await capture(connection, "hud-readiness-pulse-desktop.png");
  await select(connection, `city:${desktopFixture.cityId}`);
  desktop.city = await geometry(connection);
  await capture(connection, "hud-stable-city-desktop.png");
  await select(
    connection,
    `coordinate:${desktopFixture.tile.x}:${desktopFixture.tile.y}`,
  );
  desktop.tile = await geometry(connection);
  await capture(connection, "hud-stable-tile-desktop.png");
  assertStableGeometry("desktop", desktop);
  assertNormalDockContracts("desktop", desktop);
  evidence.desktop = desktop;

  await setViewport(connection, 390, 844, 2, true);
  console.log("Reviewing 390x844 DPR2 docks…");
  const mobileFixture = await installFixture(connection, false);
  const mobile: Record<string, GeometryMetric> = {};
  mobile.none = await geometry(connection);
  await select(connection, `unit:${mobileFixture.unitId}`);
  mobile.unit = await geometry(connection);
  await capture(connection, "hud-readiness-pulse-mobile-390x844-dpr2.png");
  await select(connection, `city:${mobileFixture.cityId}`);
  mobile.city = await geometry(connection);
  await capture(connection, "hud-stable-city-mobile-390x844-dpr2.png");
  await select(
    connection,
    `coordinate:${mobileFixture.tile.x}:${mobileFixture.tile.y}`,
  );
  mobile.tile = await geometry(connection);
  await capture(connection, "hud-stable-tile-mobile-390x844-dpr2.png");
  assertStableGeometry("mobile", mobile);
  assertNormalDockContracts("mobile", mobile);
  evidence.mobile = mobile;

  await setViewport(connection, 320, 640, 1, true);
  console.log("Reviewing 320px accessibility fallback…");
  const accessibilityFixture = await installFixture(connection, false);
  const accessibility: Record<string, GeometryMetric> = {};
  accessibility.none = await geometry(connection);
  await select(
    connection,
    `coordinate:${accessibilityFixture.tile.x}:${accessibilityFixture.tile.y}`,
  );
  accessibility.tile = await geometry(connection);
  assertStableGeometry("accessibility-320", accessibility);
  if (accessibility.tile?.dock?.overflowY !== "auto")
    throw new Error("320px dock did not enable its bounded overflow fallback");
  evidence.accessibility320 = accessibility;
  await capture(connection, "hud-accessibility-tile-320x640.png");

  await setViewport(connection, 1440, 1000, 1, false);
  console.log("Reviewing full/reduced motion pixels…");
  const pulseFixture = await installFixture(connection, false);
  await select(connection, `unit:${pulseFixture.unitId}`);
  await storeCanvasBaseline(connection);
  await setReviewTimeAndRerender(connection, 800, "FULL");
  const pulse = await compareCanvasToBaseline(connection, pulseFixture.unitId);
  if (pulse.spriteChangedPixels < 50)
    throw new Error(
      `Ready sprite pulse was not visibly measurable (${pulse.spriteChangedPixels} changed pixels)`,
    );
  // Owner-cue antialias edge pixels blend against the raster underneath; the
  // cue draw itself remains at alpha 1 (covered exactly by renderer tests).
  if (pulse.steadyCueChangedPixels > 16)
    throw new Error(
      `Health/owner cue changed during pulse (${pulse.steadyCueChangedPixels} pixels)`,
    );
  evidence.fullMotionPulse = pulse;
  await capture(connection, "hud-readiness-pulse-midpoint-desktop.png");

  const reducedFixture = await installFixture(connection, true);
  await select(connection, `unit:${reducedFixture.unitId}`);
  await storeCanvasBaseline(connection);
  await setReviewTimeAndRerender(connection, 800, "REDUCED");
  const reduced = await compareWholeCanvasToBaseline(connection);
  const reducedGeometry = await geometry(connection);
  if (reduced.changedPixels !== 0)
    throw new Error(
      `Reduced motion changed ${reduced.changedPixels} Canvas pixels`,
    );
  if (!documentCueIsPresent(await selectedDockText(connection)))
    throw new Error("Reduced-motion unit dock lacks the Needs action cue");
  evidence.reducedMotion = { ...reduced, geometry: reducedGeometry };
  await capture(connection, "hud-readiness-reduced-motion-desktop.png");

  console.log("Reviewing Forest/Catapult UI integration…");
  await setViewport(connection, 1440, 1000, 1, false);
  const forestDesktopFixture = await installForestUiFixture(connection);
  const forestDesktopBaseline = await geometry(connection);
  await select(
    connection,
    `coordinate:${forestDesktopFixture.animal.x}:${forestDesktopFixture.animal.y}`,
  );
  const forestDesktopAnimal = await geometry(connection);
  await assertForestTileDock(connection, "Hunt Animal", "Animal");
  await capture(connection, "forest-animal-tile-dock-desktop.png");
  await select(connection, `city:${forestDesktopFixture.cityId}`);
  const forestDesktopCity = await geometry(connection);
  await assertCatapultTrainingDock(connection);
  await capture(connection, "catapult-training-city-dock-desktop.png");
  await openTech(connection);
  await selectTech(connection, "MATHEMATICS");
  await capture(connection, "forest-mathematics-tech-tree-desktop.png");
  assertStableGeometry("forest-ui-desktop", {
    none: forestDesktopBaseline,
    animal: forestDesktopAnimal,
    city: forestDesktopCity,
  });

  await setViewport(connection, 390, 844, 2, true);
  const forestMobileFixture = await installForestUiFixture(connection);
  const forestMobileBaseline = await geometry(connection);
  await select(
    connection,
    `coordinate:${forestMobileFixture.emptyForest.x}:${forestMobileFixture.emptyForest.y}`,
  );
  const forestMobileLumber = await geometry(connection);
  await assertForestTileDock(connection, "Build Lumber Mill", "Forest");
  await capture(connection, "forest-lumber-tile-dock-mobile-390x844-dpr2.png");
  await select(connection, `city:${forestMobileFixture.cityId}`);
  const forestMobileCity = await geometry(connection);
  await assertCatapultTrainingDock(connection);
  await capture(
    connection,
    "catapult-training-city-dock-mobile-390x844-dpr2.png",
  );
  await openTech(connection);
  await selectTech(connection, "MATHEMATICS");
  await capture(
    connection,
    "forest-mathematics-tech-tree-mobile-390x844-dpr2.png",
  );
  assertStableGeometry("forest-ui-mobile", {
    none: forestMobileBaseline,
    lumber: forestMobileLumber,
    city: forestMobileCity,
  });
  assertNormalDockContracts("forest-ui-mobile", {
    none: forestMobileBaseline,
    lumber: forestMobileLumber,
    city: forestMobileCity,
  });
  evidence.forestCatapultUi = {
    desktop: {
      baseline: forestDesktopBaseline,
      animal: forestDesktopAnimal,
      city: forestDesktopCity,
    },
    mobile390x844Dpr2: {
      baseline: forestMobileBaseline,
      lumber: forestMobileLumber,
      city: forestMobileCity,
    },
    captures: await captureEvidence([
      "forest-animal-tile-dock-desktop.png",
      "catapult-training-city-dock-desktop.png",
      "forest-mathematics-tech-tree-desktop.png",
      "forest-lumber-tile-dock-mobile-390x844-dpr2.png",
      "catapult-training-city-dock-mobile-390x844-dpr2.png",
      "forest-mathematics-tech-tree-mobile-390x844-dpr2.png",
    ]),
  };

  await mkdir(reviewRoot, { recursive: true });
  await writeFile(
    path.join(reviewRoot, "hud-readiness-review.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(`HUD/readiness Chrome evidence written to ${reviewRoot}`);
} finally {
  browser.kill();
}

function documentCueIsPresent(text: string): boolean {
  return text.includes("Needs action") && text.includes("HP");
}

async function installForestUiFixture(
  connection: Connection,
): Promise<ForestUiFixture> {
  const fixture = await evaluate<ForestUiFixture>(
    connection,
    `(async () => {
      const [{ bootstrapApp }, engine] = await Promise.all([
        import(${JSON.stringify(`${baseUrl}/src/app/bootstrap.ts`)}),
        import(${JSON.stringify(`${baseUrl}/src/engine/index.ts`)})
      ]);
      globalThis.__hudReviewApp?.destroy?.();
      localStorage.clear();
      const result = engine.createGame({
        rulesetId: engine.RULESET_ID,
        seed: 2,
        width: 11,
        height: 11,
        aiCount: 1,
        aiDifficulty: 'NORMAL',
        aiMode: 'RIVAL',
        humanColor: 'CORAL'
      });
      if (!result.ok) throw new Error(result.error.code);
      const human = result.state.players.find((player) => player.controller === 'HUMAN');
      const city = result.state.cities.find((candidate) => candidate.ownerId === human?.id);
      const unit = result.state.units.find((candidate) => candidate.ownerId === human?.id);
      const animal = result.state.board.tiles.find((tile) =>
        tile.territoryCityId === city?.id && tile.terrain === 'FOREST' && tile.resource === 'ANIMAL'
      );
      const emptyForest = result.state.board.tiles.find((tile) =>
        tile.territoryCityId === city?.id && tile.terrain === 'FOREST' && tile.resource === null && tile.improvement === null
      );
      const parking = result.state.board.tiles.find((tile) =>
        tile.territoryCityId === city?.id && tile.site === null &&
        tile.at.x !== animal?.at.x && tile.at.y !== animal?.at.y &&
        tile.at.x !== emptyForest?.at.x && tile.at.y !== emptyForest?.at.y
      );
      if (!human || !city || !unit || !animal || !emptyForest || !parking)
        throw new Error('Missing Forest UI fixture entities');
      const state = {
        ...result.state,
        activeSeatIndex: result.state.turnOrder.findIndex((id) => id === human.id),
        players: result.state.players.map((player) => player.id === human.id ? {
          ...player,
          stars: 30,
          researchedTechs: ['CLIMBING', 'RIDING', 'HUNTING', 'ORGANIZATION', 'MINING', 'FORESTRY', 'ARCHERY', 'STRATEGY', 'MATHEMATICS']
        } : player),
        units: result.state.units.map((candidate) => candidate.id === unit.id ? {
          ...candidate,
          at: parking.at
        } : candidate),
        pendingChoice: null,
        outcome: null
      };
      document.querySelector('#app')?.replaceChildren();
      globalThis.__hudReviewApp = bootstrapApp(document, {
        initialRoute: 'MATCH',
        initialMatch: state,
        aiStepDelayMs: 100000,
        prefersReducedMotion: false
      });
      return { cityId: city.id, animal: animal.at, emptyForest: emptyForest.at };
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'match' && document.querySelector('.board-canvas') instanceof HTMLCanvasElement`,
  );
  await settleImages(connection);
  await delay(100);
  return fixture;
}

async function assertForestTileDock(
  connection: Connection,
  action: "Hunt Animal" | "Build Lumber Mill",
  feature: "Animal" | "Forest",
): Promise<void> {
  const result = await evaluate<{
    readonly text: string;
    readonly actionCount: number;
    readonly modalCount: number;
  }>(
    connection,
    `(() => {
      const dock = document.querySelector('.tile-action-dock');
      if (!dock) throw new Error('Missing Forest tile dock');
      return {
        text: dock.textContent ?? '',
        actionCount: [...dock.querySelectorAll('button')].filter((button) => button.textContent?.includes(${JSON.stringify(action)})).length,
        modalCount: document.querySelectorAll('.modal-backdrop').length
      };
    })()`,
  );
  if (!result.text.includes(feature) || !result.text.includes(action))
    throw new Error(`${action} dock lacks its exact Forest facts/action`);
  if (result.actionCount !== 1 || result.modalCount !== 0)
    throw new Error(`${action} dock is ambiguous or modal`);
}

async function assertCatapultTrainingDock(
  connection: Connection,
): Promise<void> {
  const result = await evaluate<{
    readonly visibleText: string;
    readonly buttons: number;
    readonly catapultFallbackParts: number;
    readonly tileActions: number;
  }>(
    connection,
    `(() => {
      const dock = document.querySelector('.city-action-dock');
      const catapult = [...(dock?.querySelectorAll('.city-train-action') ?? [])].find((button) => button.textContent?.includes('Catapult'));
      if (!dock || !catapult) throw new Error('Missing Catapult training dock');
      return {
        visibleText: catapult.textContent ?? '',
        buttons: dock.querySelectorAll('.city-train-action').length,
        catapultFallbackParts: catapult.querySelectorAll('.city-command-art-catapult > span').length,
        tileActions: dock.querySelectorAll('.fruit-action, .animal-action, .lumber-action, .mine-action').length
      };
    })()`,
  );
  if (
    result.visibleText !== "Catapult★ 8" ||
    result.buttons !== 5 ||
    result.catapultFallbackParts !== 5 ||
    result.tileActions !== 0
  )
    throw new Error(
      `Catapult city dock contract failed: ${JSON.stringify(result)}`,
    );
}

async function openTech(connection: Connection): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      const button = document.querySelector('[data-focus-id="tech"]');
      if (!(button instanceof HTMLButtonElement)) throw new Error('Missing Tech control');
      button.click();
      return true;
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelectorAll('[role="treeitem"]').length === 9`,
  );
}

async function selectTech(
  connection: Connection,
  tech: "MATHEMATICS",
): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      const node = document.querySelector('[data-tech=${JSON.stringify(tech.toLowerCase())}]');
      if (!(node instanceof HTMLButtonElement)) throw new Error('Missing technology node');
      node.click();
      const detail = document.querySelector('.tech-detail');
      if (!detail?.textContent?.includes('Attack 4 reaches 3 tiles and defeats a full-health Warrior without a defense bonus in one hit'))
        throw new Error('Missing Mathematics details');
      return true;
    })()`,
  );
  await settleImages(connection);
  await delay(50);
}

async function captureEvidence(filenames: readonly string[]): Promise<
  readonly {
    readonly path: string;
    readonly bytes: number;
    readonly sha256: string;
  }[]
> {
  return Promise.all(
    filenames.map(async (filename) => {
      const data = await readFile(path.join(reviewRoot, filename));
      return {
        path: `art/integration/reviews/${filename}`,
        bytes: data.byteLength,
        sha256: createHash("sha256").update(data).digest("hex"),
      };
    }),
  );
}

async function installFixture(
  connection: Connection,
  reducedMotion: boolean,
): Promise<ReviewFixture> {
  const fixture = await evaluate<ReviewFixture>(
    connection,
    `(async () => {
      const [{ bootstrapApp }, engine] = await Promise.all([
        import(${JSON.stringify(`${baseUrl}/src/app/bootstrap.ts`)}),
        import(${JSON.stringify(`${baseUrl}/src/engine/index.ts`)})
      ]);
      globalThis.__hudReviewApp?.destroy?.();
      localStorage.clear();
      globalThis.__reviewNow = 0;
      Object.defineProperty(performance, 'now', {
        configurable: true,
        value: () => globalThis.__reviewNow
      });
      const result = engine.createGame(engine.DEMO_MATCH_SETUP);
      if (!result.ok) throw new Error(result.error.code);
      document.querySelector('#app')?.replaceChildren();
      globalThis.__hudReviewApp = bootstrapApp(document, {
        initialRoute: 'MATCH',
        initialMatch: result.state,
        aiStepDelayMs: 100000,
        prefersReducedMotion: ${String(reducedMotion)}
      });
      const snapshot = globalThis.__hudReviewApp.controller.snapshot();
      const view = snapshot.view;
      if (!view) throw new Error('Missing PlayerView');
      const unit = view.units.find((candidate) =>
        candidate.ownerId === view.viewer.id && !candidate.activation.handled
      );
      const city = view.cities.find((candidate) =>
        candidate.ownerId === view.viewer.id && candidate.rewardLevel2 !== null
      );
      const tile = view.board.tiles.find((candidate) =>
        candidate.explored && candidate.resource !== null &&
        !view.units.some((unitCandidate) =>
          unitCandidate.at.x === candidate.at.x && unitCandidate.at.y === candidate.at.y
        )
      ) ?? view.board.tiles.find((candidate) => candidate.explored);
      if (!unit || !city || !tile) throw new Error('Missing review entity');
      return { unitId: unit.id, cityId: city.id, tile: tile.at };
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === 'match' && document.querySelector('.board-canvas') instanceof HTMLCanvasElement`,
  );
  await settleImages(connection);
  await delay(100);
  return fixture;
}

async function select(connection: Connection, value: string): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      const select = document.querySelector("select[aria-label='Choose a map coordinate or object']");
      if (!(select instanceof HTMLSelectElement)) throw new Error('Missing map inspector');
      select.focus();
      select.value = ${JSON.stringify(value)};
      if (select.value !== ${JSON.stringify(value)}) throw new Error('Missing inspector option: ${value}');
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.unit-action-dock, .city-action-dock, .tile-action-dock') !== null`,
  );
  await settleImages(connection);
  await delay(50);
}

async function geometry(connection: Connection): Promise<GeometryMetric> {
  return evaluate<GeometryMetric>(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas');
      const app = globalThis.__hudReviewApp;
      const snapshot = app?.controller.snapshot();
      const city = snapshot?.view?.cities.find((candidate) => candidate.ownerId === snapshot.view.viewer.id);
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing geometry Canvas');
      if (!app) throw new Error('Missing geometry app');
      if (!snapshot?.view) throw new Error('Missing geometry PlayerView');
      if (!city) throw new Error('Missing geometry owned city');
      const second = { x: Math.min(snapshot.view.board.width - 1, city.at.x + 1), y: city.at.y };
      const firstPoint = app.view.boardScreenPoint(city.at);
      const secondPoint = app.view.boardScreenPoint(second);
      if (!firstPoint || !secondPoint) throw new Error('Missing projected points');
      const rect = canvas.getBoundingClientRect();
      const dock = document.querySelector('.unit-action-dock, .city-action-dock, .tile-action-dock');
      const dockStyle = dock ? getComputedStyle(dock) : null;
      const controls = [...document.querySelectorAll('.match-hud button, .match-actions button')]
        .map((button) => button.getBoundingClientRect());
      const bottomControls = [...document.querySelectorAll('.match-camera-actions button, .match-actions > .end-turn')]
        .map((button) => button.getBoundingClientRect());
      const minimumWidth = Math.min(...controls.map((control) => control.width));
      const minimumHeight = Math.min(...controls.map((control) => control.height));
      const doc = document.documentElement;
      return {
        css: [rect.left, rect.top, rect.width, rect.height],
        backing: [canvas.width, canvas.height],
        cameraPoints: [firstPoint, secondPoint],
        dock: dock && dockStyle ? {
          kind: dock.className,
          top: dock.getBoundingClientRect().top,
          bottom: dock.getBoundingClientRect().bottom,
          height: dock.getBoundingClientRect().height,
          maxBlockSize: dockStyle.maxBlockSize,
          overflowY: dockStyle.overflowY
        } : null,
        focusId: document.activeElement instanceof HTMLElement ? document.activeElement.dataset.focusId ?? null : null,
        minimumControl: [minimumWidth, minimumHeight],
        controlVerticalBounds: [
          Math.min(...controls.map((control) => control.top)),
          Math.max(...controls.map((control) => control.bottom))
        ],
        bottomControlVerticalBounds: [
          Math.min(...bottomControls.map((control) => control.top)),
          Math.max(...bottomControls.map((control) => control.bottom))
        ],
        viewport: [innerWidth, innerHeight, devicePixelRatio],
        pageOverflow: [doc.scrollWidth - innerWidth, doc.scrollHeight - innerHeight],
        markerDomCount: document.querySelectorAll('.readiness-halo, .readiness-badge, .wait-badge, [data-readiness-marker]').length
      };
    })()`,
  );
}

function assertStableGeometry(
  label: string,
  metrics: Record<string, GeometryMetric>,
): void {
  const baseline = metrics.none;
  if (baseline === undefined) throw new Error(`Missing ${label} baseline`);
  for (const [variant, metric] of Object.entries(metrics)) {
    if (
      JSON.stringify([metric.css, metric.backing, metric.cameraPoints]) !==
      JSON.stringify([baseline.css, baseline.backing, baseline.cameraPoints])
    )
      throw new Error(`${label} ${variant} changed Canvas/camera geometry`);
    if (metric.minimumControl[0] < 44 || metric.minimumControl[1] < 44)
      throw new Error(`${label} ${variant} has a sub-44px HUD control`);
    if (
      metric.controlVerticalBounds[0] < 0 ||
      metric.controlVerticalBounds[1] > metric.viewport[1] + 0.5
    )
      throw new Error(
        `${label} ${variant} has unreachable HUD controls (${metric.controlVerticalBounds.join("..")} in ${metric.viewport[1]}px)`,
      );
    if (metric.pageOverflow[0] > 0 || metric.pageOverflow[1] > 0)
      throw new Error(`${label} ${variant} created page overflow`);
    if (metric.markerDomCount !== 0)
      throw new Error(`${label} ${variant} rendered marker DOM`);
    if (variant !== "none" && metric.focusId !== "board")
      throw new Error(
        `${label} ${variant} did not preserve inspector focus (${metric.focusId ?? "none"})`,
      );
  }
}

function assertNormalDockContracts(
  label: string,
  metrics: Record<string, GeometryMetric>,
): void {
  for (const [variant, metric] of Object.entries(metrics)) {
    if (variant === "none") continue;
    if (metric.dock === null) throw new Error(`${label} ${variant} lacks dock`);
    if (metric.dock.overflowY !== "visible")
      throw new Error(`${label} ${variant} unexpectedly scrolls`);
    if (metric.dock.height > metric.viewport[1] * 0.45 + 0.5)
      throw new Error(`${label} ${variant} exceeds 45dvh`);
    if (
      label === "mobile" &&
      metric.dock.bottom > metric.bottomControlVerticalBounds[0] + 0.5
    )
      throw new Error(
        `${label} ${variant} dock overlaps bottom controls (${metric.dock.bottom} > ${metric.bottomControlVerticalBounds[0]})`,
      );
  }
}

async function storeCanvasBaseline(connection: Connection): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas');
      const context = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;
      if (!canvas || !context) throw new Error('Missing Canvas context');
      globalThis.__canvasBaseline = context.getImageData(0, 0, canvas.width, canvas.height);
      return true;
    })()`,
  );
}

async function setReviewTimeAndRerender(
  connection: Connection,
  time: number,
  motion: "FULL" | "REDUCED",
): Promise<void> {
  await evaluate<boolean>(
    connection,
    `(() => {
      globalThis.__reviewNow = ${time};
      globalThis.__hudReviewApp.controller.updateSettings({ motion: ${JSON.stringify(motion)} });
      return true;
    })()`,
  );
  await settleImages(connection);
  await delay(50);
}

async function compareCanvasToBaseline(
  connection: Connection,
  unitId: number,
): Promise<PulseMetric> {
  return evaluate<PulseMetric>(
    connection,
    `(() => {
      const app = globalThis.__hudReviewApp;
      const snapshot = app.controller.snapshot();
      const unit = snapshot.view.units.find((candidate) => candidate.id === ${unitId});
      const point = unit ? app.view.boardScreenPoint(unit.at) : null;
      const canvas = document.querySelector('.board-canvas');
      const context = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;
      const baseline = globalThis.__canvasBaseline;
      if (!canvas || !context || !baseline || !point) throw new Error('Missing pulse comparison source');
      const current = context.getImageData(0, 0, canvas.width, canvas.height);
      const ratio = canvas.width / canvas.getBoundingClientRect().width;
      const left = Math.max(0, Math.floor((point.x - 55) * ratio));
      const right = Math.min(canvas.width, Math.ceil((point.x + 55) * ratio));
      const top = Math.max(0, Math.floor((point.y - 112) * ratio));
      const bottom = Math.min(canvas.height, Math.ceil((point.y + 16) * ratio));
      let spriteChangedPixels = 0;
      let steadyCueChangedPixels = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const index = (y * canvas.width + x) * 4;
          const delta = Math.abs(current.data[index] - baseline.data[index]) +
            Math.abs(current.data[index + 1] - baseline.data[index + 1]) +
            Math.abs(current.data[index + 2] - baseline.data[index + 2]);
          if (delta > 8) spriteChangedPixels += 1;
          const red = baseline.data[index];
          const green = baseline.data[index + 1];
          const blue = baseline.data[index + 2];
          const cssX = x / ratio;
          const cssY = y / ratio;
          const inHealth = cssX >= point.x - 25 && cssX <= point.x + 25 &&
            cssY >= point.y && cssY <= point.y + 14;
          const inOwner = cssX >= point.x - 32 && cssX <= point.x - 8 &&
            cssY >= point.y - 14 && cssY <= point.y + 1;
          const isHealth = (green > 150 && green > red * 1.35) ||
            (red < 40 && green < 55 && blue < 60);
          const isOwner = red > 190 && red > green * 1.5 && red > blue * 1.25;
          if (((inHealth && isHealth) || (inOwner && isOwner)) && delta > 0) steadyCueChangedPixels += 1;
        }
      }
      return { spriteChangedPixels, steadyCueChangedPixels };
    })()`,
  );
}

async function compareWholeCanvasToBaseline(
  connection: Connection,
): Promise<{ readonly changedPixels: number }> {
  return evaluate<{ readonly changedPixels: number }>(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas');
      const context = canvas instanceof HTMLCanvasElement ? canvas.getContext('2d') : null;
      const baseline = globalThis.__canvasBaseline;
      if (!canvas || !context || !baseline) throw new Error('Missing reduced-motion comparison source');
      const current = context.getImageData(0, 0, canvas.width, canvas.height);
      let changedPixels = 0;
      for (let index = 0; index < current.data.length; index += 4) {
        if (current.data[index] !== baseline.data[index] ||
          current.data[index + 1] !== baseline.data[index + 1] ||
          current.data[index + 2] !== baseline.data[index + 2] ||
          current.data[index + 3] !== baseline.data[index + 3]) changedPixels += 1;
      }
      return { changedPixels };
    })()`,
  );
}

async function selectedDockText(connection: Connection): Promise<string> {
  return evaluate<string>(
    connection,
    `document.querySelector('.unit-action-dock')?.textContent ?? ''`,
  );
}

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly close: () => void;
};

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
      // Chrome has not opened its debugging endpoint yet.
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

async function evaluate<T>(
  connection: Connection,
  expression: string,
): Promise<T> {
  const response = (await connection.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })) as RemoteValue<T>;
  if (response.exceptionDetails !== undefined)
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Chrome evaluation failed",
    );
  if (response.result?.value === undefined)
    throw new Error("Chrome evaluation returned no value");
  return response.result.value;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate<boolean>(connection, `Boolean(${expression})`)) return;
    await delay(100);
  }
  throw new Error(`Chrome review timed out waiting for: ${expression}`);
}

async function settleImages(connection: Connection): Promise<void> {
  await evaluate<readonly unknown[]>(
    connection,
    `Promise.all([document.fonts.ready, ...[...document.images].map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => { image.addEventListener('load', resolve, { once: true }); image.addEventListener('error', resolve, { once: true }); }))])`,
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
    throw new Error(`Chrome did not return screenshot data for ${filename}`);
  await mkdir(reviewRoot, { recursive: true });
  await writeFile(
    path.join(reviewRoot, filename),
    Buffer.from(response.data, "base64"),
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
