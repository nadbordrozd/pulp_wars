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

type PositionalCommandKind = "MOVE" | "ESCAPE_MOVE" | "ATTACK";
type ActivationChannel = "POINTER" | "TOUCH" | "KEYBOARD" | "SEMANTIC";

const captureReview = process.argv.includes("--capture-review");
const attackReview = process.argv.includes("--attack-review");
const growthReview = process.argv.includes("--growth-review");
const resourceReview = process.argv.includes("--resource-review");
const technologyReview = process.argv.includes("--technology-review");
const hugeReview = process.argv.includes("--huge-review");
const demoReview = process.argv.includes("--demo-review");
const tileDockReview = process.argv.includes("--tile-dock-review");
const activationReview = process.argv.includes("--activation-review");
const readinessReview = process.argv.includes("--readiness-review");
const cooperativeLargeReview = process.argv.includes(
  "--cooperative-large-review",
);
const baseUrl =
  process.argv.slice(2).find((argument) => !argument.startsWith("--")) ??
  "http://localhost:6173";
const reviewRoot = path.join(process.cwd(), "art/integration/reviews");
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9_200 + (process.pid % 500);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-smoke-${process.pid}`
  : path.join(process.env.TMPDIR ?? "/tmp", `pulp-wars-smoke-${process.pid}`);

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
  await desktopViewport(connection);
  await waitForRoute(connection, "hub");
  if (cooperativeLargeReview) {
    const review = await reviewCooperativeLarge(connection);
    const version = (await connection.send("Browser.getVersion")) as {
      readonly product?: string;
    };
    console.log(
      `Cooperative Large review passed in ${version.product ?? "Chrome"} at desktop and true 390x844 DPR2 mobile. Boundary ${review.commandIndex} ${review.stateHash}. Screenshots: ${reviewRoot}`,
    );
  } else if (readinessReview) {
    await reviewReadinessHalo(connection);
    const version = (await connection.send("Browser.getVersion")) as {
      readonly product?: string;
    };
    console.log(
      `Wait/readiness review passed in ${version.product ?? "Chrome"} at desktop, true 390x844 DPR2 mobile, and reduced motion. Screenshots: ${reviewRoot}`,
    );
  } else if (activationReview) {
    await reviewSingleActivationCommands(connection);
    const version = (await connection.send("Browser.getVersion")) as {
      readonly product?: string;
    };
    console.log(
      `Single-activation Move, Escape Move, and Attack review passed in ${version.product ?? "Chrome"} for pointer, touch, keyboard, and semantic activation at desktop and true 390x844 DPR2 mobile. Screenshots: ${reviewRoot}`,
    );
  } else if (tileDockReview) {
    await reviewTileDock(connection);
    const version = (await connection.send("Browser.getVersion")) as {
      readonly product?: string;
    };
    console.log(
      `Selected-tile dock review passed in ${version.product ?? "Chrome"} at desktop and true 390x844 DPR2 mobile. Screenshots: ${reviewRoot}`,
    );
  } else if (demoReview) {
    const review = await reviewDemoMatch(connection);
    const version = (await connection.send("Browser.getVersion")) as {
      readonly product?: string;
    };
    console.log(
      `Demo Match review passed in ${version.product ?? "Chrome"} at desktop and true 390x844 DPR2 mobile. Initial ${review.initialHash}; autosave boundary ${review.boundaryHash}. Screenshots: ${reviewRoot}`,
    );
  } else if (hugeReview) {
    await reviewHugeMap(connection);
    const version = (await connection.send("Browser.getVersion")) as {
      readonly product?: string;
    };
    console.log(
      `Huge-map review passed in ${version.product ?? "Chrome"} at desktop and true 390x844 DPR2 mobile. Screenshots: ${reviewRoot}`,
    );
  } else if (attackReview) {
    await reviewCombatAnimation(connection);
    console.log(
      `Combat animation review passed at desktop, 390px DPR2, and reduced motion. Screenshots: ${reviewRoot}`,
    );
  } else if (technologyReview) {
    await reviewTechnologyTree(connection);
    console.log(
      `Technology tree review passed at desktop and true 390x844 DPR2 mobile. Screenshots: ${reviewRoot}`,
    );
  } else if (resourceReview) {
    await reviewMixedResources(connection);
    await writeFruitProductionEvidence();
    console.log(
      `Mixed-resource review passed at desktop and true 390x844 DPR2 mobile. Screenshots: ${reviewRoot}`,
    );
  } else if (captureReview) {
    await reviewCaptureAction(connection);
    console.log(
      `Selected-unit action review passed at desktop and true 390x844 DPR2 mobile. Screenshots: ${reviewRoot}`,
    );
  } else if (growthReview) {
    await reviewCityGrowth(connection);
    console.log(
      `Selected-city dock review passed for rich-action, empty, level-4, and reward-pending states at desktop and true 390x844 DPR2 mobile. Screenshots: ${reviewRoot}`,
    );
  } else {
    const flows = [
      { aiCount: 1 as const, seed: 1 },
      { aiCount: 2 as const, seed: 0 },
      { aiCount: 3 as const, seed: 2 },
    ];
    const results: MatchSummary[] = [];
    for (const flow of flows) {
      await desktopViewport(connection);
      await startConquest(connection, flow.aiCount, flow.seed);
      await assertKeyboardAndSemantics(connection);

      const boundary = await drivePolicy(connection, 15);
      await connection.send("Page.reload", { ignoreCache: true });
      await waitForRoute(connection, "hub");
      // Inspect the loaded save while still on Hub. Resume intentionally starts
      // paced AI immediately when the saved boundary belongs to an AI seat.
      const resumed = await matchSummary(connection);
      if (
        resumed.commandIndex !== boundary.commandIndex ||
        resumed.stateHash !== boundary.stateHash
      ) {
        throw new Error(
          `${flow.aiCount}-AI reload did not resume the exact saved boundary: ${JSON.stringify({ boundary, resumed })}`,
        );
      }
      await clickButton(connection, "Resume Conquest");
      await waitForRoute(connection, "match");

      const completion = await drivePolicy(connection, 20_000);
      const result = combineSummaries(boundary, completion);
      if (
        result.outcome === null ||
        result.rewardChoices === 0 ||
        result.fastForwardUses === 0 ||
        result.aiProgressChecks === 0
      ) {
        throw new Error(
          `Incomplete ${flow.aiCount}-AI browser evidence: ${JSON.stringify(result)}`,
        );
      }
      await waitForRoute(connection, "result");
      await assertLoadedAssets(connection);
      await capture(connection, `result-${flow.aiCount}ai-desktop.png`);
      await clickButton(connection, "View Final Map");
      await waitForRoute(connection, "match");
      await capture(connection, `final-map-${flow.aiCount}ai-desktop.png`);
      await clickButton(connection, "Results");
      await waitForRoute(connection, "result");

      await mobileViewport(connection);
      await waitForNoHorizontalOverflow(connection);
      await assertResponsiveTargets(connection);
      await capture(connection, `result-${flow.aiCount}ai-mobile-390-dpr2.png`);
      await clickButton(connection, "Play Again");
      await clickButton(connection, "Play Again");
      await waitForRoute(connection, "match");
      const restarted = await matchSummary(connection);
      if (
        restarted.commandIndex !== 0 ||
        restarted.seed !== result.seed ||
        restarted.aiCount !== flow.aiCount
      ) {
        throw new Error(
          `${flow.aiCount}-AI Play Again did not recreate the setup at index zero`,
        );
      }
      assertCentered(await startClusterPosition(connection));
      await waitForNoHorizontalOverflow(connection);
      await assertResponsiveTargets(connection);
      await capture(
        connection,
        `restart-${flow.aiCount}ai-mobile-390-dpr2.png`,
      );
      results.push(result);

      await clickButton(connection, "Settings");
      await clickButton(connection, "Exit to Hub");
      await waitForRoute(connection, "hub");
    }
    console.log(
      `Browser smoke passed: ${results.map((result) => `${result.aiCount} AI ${result.outcome} in ${result.commandIndex} commands`).join("; ")}. Screenshots: ${reviewRoot}`,
    );
  }
  connection.close();
} finally {
  browser.kill();
}

async function reviewReadinessHalo(connection: Connection): Promise<void> {
  await desktopViewport(connection);
  await installReadinessFixture(connection, false);
  await assertReadinessFixture(connection, false);
  await capture(connection, "readiness-halo-desktop.png");

  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await assertReadinessFixture(connection, false);
  await capture(connection, "readiness-halo-mobile-390x844-dpr2.png");

  await evaluate(
    connection,
    `(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) throw new Error('Missing readiness focus target');
      active.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      if (document.querySelector('.unit-action-dock') !== null) throw new Error('Escape did not clear readiness selection');
      return true;
    })()`,
  );
  await capture(
    connection,
    "readiness-halo-unselected-mobile-390x844-dpr2.png",
  );
  await selectReadinessReviewUnit(connection);

  await clickButton(connection, "Wait");
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const app = globalThis.__PULP_WARS_APP__;
      const review = globalThis.__PULP_WARS_READINESS_REVIEW__;
      const snapshot = app?.controller.snapshot();
      if (!app || !review || !snapshot?.match || !snapshot.view) throw new Error('Missing post-Wait review state');
      const unit = snapshot.match.units.find((candidate) => candidate.id === review.unitId);
      if (!unit?.activation.handled || snapshot.match.commandIndex !== review.beforeIndex + 1) throw new Error('Wait did not set exactly one handled boundary');
      if ([...document.querySelectorAll('.unit-action-dock button')].some((button) => button.textContent?.trim() === 'Wait')) throw new Error('Repeat Wait remained visible');
      if (!document.querySelector('.unit-dock-state')?.textContent?.includes('Handled')) throw new Error('Handled dock text missing');
      const after = engine.queryPlayerCommands(snapshot.view).map(({ command }) => command).filter((command) => command.kind !== 'WAIT');
      if (JSON.stringify(after) !== JSON.stringify(review.otherCommands)) throw new Error('Wait changed another public command');
      if (app.controller.endTurnWarnings().includes('Units need attention')) throw new Error('Wait did not clear end-turn attention');
      return true;
    })()`,
    true,
  );
  await capture(connection, "readiness-waited-mobile-390x844-dpr2.png");

  await desktopViewport(connection);
  await installReadinessFixture(connection, true);
  await assertReadinessFixture(connection, true);
  await capture(connection, "readiness-halo-reduced-motion-desktop.png");
}

async function installReadinessFixture(
  connection: Connection,
  reducedMotion: boolean,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [{ bootstrapApp }, engine] = await Promise.all([
        import('/src/app/bootstrap.ts'),
        import('/src/engine/index.ts')
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      localStorage.clear();
      const created = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 1, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', aiMode: 'RIVAL', humanColor: 'CORAL' });
      if (!created.ok) throw new Error(created.error.code);
      const human = created.state.players.find((player) => player.controller === 'HUMAN');
      const unit = created.state.units.find((candidate) => candidate.ownerId === human?.id);
      if (!human || !unit) throw new Error('Missing readiness fixture');
      const occupied = new Set(created.state.units.filter((candidate) => candidate.id !== unit.id).map((candidate) => candidate.at.x + ',' + candidate.at.y));
      const reviewTile = [...created.state.board.tiles]
        .filter((tile) => tile.terrain === 'GRASS' && tile.resource === null && tile.site === null && !occupied.has(tile.at.x + ',' + tile.at.y))
        .sort((left, right) => {
          const leftDistance = Math.abs(left.at.x - 5) + Math.abs(left.at.y - 5);
          const rightDistance = Math.abs(right.at.x - 5) + Math.abs(right.at.y - 5);
          return leftDistance - rightDistance || left.at.y - right.at.y || left.at.x - right.at.x;
        })[0];
      if (!reviewTile) throw new Error('Missing open readiness review tile');
      const state = {
        ...created.state,
        activeSeatIndex: created.state.turnOrder.indexOf(human.id),
        players: created.state.players.map((player) => player.id === human.id ? { ...player, explored: created.state.board.tiles.map((tile) => tile.at) } : player),
        units: created.state.units.map((candidate) => candidate.id === unit.id ? { ...candidate, at: reviewTile.at, ready: true, activation: { moved: false, attacked: false, recovered: false, captured: false, handled: false, escapeAvailable: false } } : candidate)
      };
      const root = document.querySelector('#app');
      if (!(root instanceof HTMLElement)) throw new Error('Missing app root');
      root.replaceChildren();
      const app = bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: state, aiStepDelayMs: 100000, prefersReducedMotion: ${String(reducedMotion)} });
      Reflect.set(globalThis, '__PULP_WARS_APP__', app);
      const view = app.controller.snapshot().view;
      if (!view) throw new Error('Missing readiness PlayerView');
      const otherCommands = engine.queryPlayerCommands(view).map(({ command }) => command).filter((command) => command.kind !== 'WAIT');
      const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
      if (!(inspector instanceof HTMLSelectElement)) throw new Error('Missing semantic unit selector');
      inspector.value = 'unit:' + unit.id;
      inspector.dispatchEvent(new Event('change', { bubbles: true }));
      globalThis.__PULP_WARS_READINESS_REVIEW__ = { unitId: unit.id, beforeIndex: state.commandIndex, otherCommands };
      return true;
    })()`,
    true,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.unit-action-dock') !== null`,
  );
}

async function selectReadinessReviewUnit(
  connection: Connection,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const review = globalThis.__PULP_WARS_READINESS_REVIEW__;
      const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
      if (!review || !(inspector instanceof HTMLSelectElement)) throw new Error('Missing readiness semantic selector');
      inspector.value = 'unit:' + review.unitId;
      inspector.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.unit-action-dock') !== null`,
  );
}

async function assertReadinessFixture(
  connection: Connection,
  reducedMotion: boolean,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__;
      const snapshot = app?.controller.snapshot();
      const canvas = document.querySelector('.board-canvas');
      const dock = document.querySelector('.unit-action-dock');
      const wait = [...(dock?.querySelectorAll('button') ?? [])].find((button) => button.textContent?.trim() === 'Wait');
      if (!app || !snapshot?.view || !(canvas instanceof HTMLCanvasElement) || !(dock instanceof HTMLElement) || !(wait instanceof HTMLButtonElement)) throw new Error('Missing readiness Canvas/dock/Wait');
      if (!dock.textContent?.includes('Needs action') || dock.textContent.includes('✓')) throw new Error('Readiness text or removed tick contract failed');
      if (document.querySelector('[data-modal], .modal-backdrop') !== null || canvas.dataset.interactive !== 'true') throw new Error('Readiness selection blocked the map');
      if (snapshot.settings.motion !== ${JSON.stringify(reducedMotion ? "REDUCED" : "FULL")}) throw new Error('Wrong motion setting');
      if (!app.controller.endTurnWarnings().includes('Units need attention')) throw new Error('Missing handled-state end-turn attention');
      return true;
    })()`,
  );
}

interface DemoReviewResult {
  readonly initialHash: string;
  readonly boundaryHash: string;
}

async function reviewDemoMatch(
  connection: Connection,
): Promise<DemoReviewResult> {
  const initialHash =
    "05ee08426e7acda629d8dc06e15ebf135b3b3f2754c385ac9b9ff1ddf1de187d";
  await desktopViewport(connection);
  await evaluate(
    connection,
    `(() => { const card = document.querySelector('.demo-match-card'); const action = [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Demo Match'); if (!(card instanceof HTMLElement) || !(action instanceof HTMLButtonElement) || !card.textContent?.includes('Huge 25 × 25') || !card.textContent.includes('eight ready units')) throw new Error('Demo Match hub action or contents missing'); return true; })()`,
  );
  await capture(connection, "demo-hub-desktop.png");
  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await capture(connection, "demo-hub-mobile-390x844-dpr2.png");

  await desktopViewport(connection);
  await clickButton(connection, "Demo Match");
  await evaluate(
    connection,
    `(() => { const modal = document.querySelector('[data-modal]'); if (!(modal instanceof HTMLElement) || !modal.textContent?.includes('seed decafbad') || !modal.textContent.includes('two level-3 cities')) throw new Error('Demo confirmation summary missing'); return true; })()`,
  );
  await clickButton(connection, "Start Demo Match");
  await waitForRoute(connection, "match");
  await waitForExpression(
    connection,
    `JSON.parse(localStorage.getItem('pulpWars.save.current') ?? '{}').stateHash === ${JSON.stringify(initialHash)}`,
  );
  await assertExactDemoState(connection, initialHash);
  assertCentered(await startClusterPosition(connection));
  await assertLoadedAssets(connection);

  await activateDemoCapital(connection);
  await assertDemoDock(connection, "UNIT");
  await capture(connection, "demo-unit-dock-desktop.png");
  await activateDemoCapital(connection);
  await assertDemoDock(connection, "CITY");
  await capture(connection, "demo-city-dock-desktop.png");

  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await activateDemoCapital(connection);
  await assertDemoDock(connection, "UNIT");
  await capture(connection, "demo-unit-dock-mobile-390x844-dpr2.png");
  await activateDemoCapital(connection);
  await assertDemoDock(connection, "CITY");
  await waitForNoHorizontalOverflow(connection);
  await capture(connection, "demo-city-dock-mobile-390x844-dpr2.png");

  const boundaryHash = await evaluate<string>(
    connection,
    `(async () => { const engine = await import('/src/engine/index.ts'); const app = globalThis.__PULP_WARS_APP__; const snapshot = app?.controller.snapshot(); if (!app || !snapshot?.view) throw new Error('Missing Demo Match command surface'); const move = engine.queryPlayerCommands(snapshot.view).map(({ command }) => command).find((command) => command.kind === 'MOVE' && command.unitId === 2); if (!move || !app.controller.dispatch(move)) throw new Error('Demo movement command was not accepted'); await new Promise((resolve) => setTimeout(resolve, 50)); const next = app.controller.snapshot(); if (next.match?.commandIndex !== 1) throw new Error('Demo command index did not advance'); return engine.canonicalHash(next.match); })()`,
    true,
  );
  await waitForExpression(
    connection,
    `JSON.parse(localStorage.getItem('pulpWars.save.current') ?? '{}').commandIndex === 1 && JSON.parse(localStorage.getItem('pulpWars.save.current') ?? '{}').stateHash === ${JSON.stringify(boundaryHash)}`,
  );

  await connection.send("Page.reload", { ignoreCache: true });
  await waitForRoute(connection, "hub");
  await clickButton(connection, "Resume Conquest");
  await waitForRoute(connection, "match");
  const resumed = await matchSummary(connection);
  if (resumed.commandIndex !== 1 || resumed.stateHash !== boundaryHash) {
    throw new Error(`Demo reload mismatch: ${JSON.stringify(resumed)}`);
  }
  await desktopViewport(connection);
  await capture(connection, "demo-save-resume-desktop.png");
  await clickButton(connection, "Settings");
  await clickButton(connection, "Restart Same Match");
  await clickButton(connection, "Restart Match");
  await waitForRoute(connection, "match");
  await assertExactDemoState(connection, initialHash);
  assertCentered(await startClusterPosition(connection));
  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await capture(connection, "demo-restart-mobile-390x844-dpr2.png");
  return { initialHash, boundaryHash };
}

async function reviewSingleActivationCommands(
  connection: Connection,
): Promise<void> {
  await desktopViewport(connection);
  await installSingleActivationFixture(connection, "MOVE", false);
  await hoverSingleActivationTarget(connection);
  await capture(connection, "single-activation-move-path-desktop.png");
  await installSingleActivationFixture(connection, "ATTACK", false);
  await assertAttackPreviewContract(connection);
  await capture(connection, "single-activation-attack-preview-desktop.png");

  for (const channel of ["POINTER", "KEYBOARD"] as const) {
    for (const kind of ["MOVE", "ESCAPE_MOVE", "ATTACK"] as const) {
      await installSingleActivationFixture(connection, kind, false);
      await activateSingleCommand(connection, channel);
      await assertSingleActivationBoundary(connection, kind);
    }
  }

  await mobileViewport(connection);
  await installSingleActivationFixture(connection, "MOVE", true);
  await hoverSingleActivationTarget(connection);
  await assertTrueMobileDpr2(connection);
  await capture(
    connection,
    "single-activation-move-path-mobile-390x844-dpr2.png",
  );
  await installSingleActivationFixture(connection, "ATTACK", true);
  await assertAttackPreviewContract(connection);
  await assertTrueMobileDpr2(connection);
  await capture(
    connection,
    "single-activation-attack-preview-mobile-390x844-dpr2.png",
  );

  for (const channel of ["TOUCH", "SEMANTIC"] as const) {
    for (const kind of ["MOVE", "ESCAPE_MOVE", "ATTACK"] as const) {
      await installSingleActivationFixture(connection, kind, true);
      await activateSingleCommand(connection, channel);
      await assertSingleActivationBoundary(connection, kind);
    }
  }
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
}

async function installSingleActivationFixture(
  connection: Connection,
  kind: PositionalCommandKind,
  reducedMotion: boolean,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [{ bootstrapApp }, engine] = await Promise.all([
        import('/src/app/bootstrap.ts'),
        import('/src/engine/index.ts')
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      localStorage.clear();
      const created = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 1, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL', aiMode: 'RIVAL' });
      if (!created.ok) throw new Error(created.error.code);
      const human = created.state.players.find((player) => player.controller === 'HUMAN');
      const attacker = created.state.units.find((unit) => unit.ownerId === human?.id);
      const defender = created.state.units.find((unit) => unit.ownerId !== human?.id);
      if (!human || !attacker || !defender) throw new Error('Missing activation review units');
      const target = created.state.board.tiles.find((tile) =>
        Math.max(Math.abs(tile.at.x - attacker.at.x), Math.abs(tile.at.y - attacker.at.y)) === 1 &&
        !created.state.cities.some((city) => city.at.x === tile.at.x && city.at.y === tile.at.y) &&
        !created.state.units.some((unit) => unit.id !== defender.id && unit.at.x === tile.at.x && unit.at.y === tile.at.y)
      );
      if (!target) throw new Error('Missing adjacent activation target');
      const kind = ${JSON.stringify(kind)};
      const state = {
        ...created.state,
        activeSeatIndex: created.state.turnOrder.indexOf(human.id),
        players: created.state.players.map((player) => player.id === human.id ? { ...player, explored: created.state.board.tiles.map((tile) => tile.at) } : player),
        board: {
          ...created.state.board,
          tiles: created.state.board.tiles.map((tile) => tile.at.x === target.at.x && tile.at.y === target.at.y ? { ...tile, terrain: 'GRASS', resource: null, improvement: null } : tile)
        },
        units: created.state.units.map((unit) => {
          if (unit.id === attacker.id && kind === 'ESCAPE_MOVE') return { ...unit, type: 'RIDER', activation: { ...unit.activation, attacked: true, escapeAvailable: true } };
          if (unit.id === defender.id && kind === 'ATTACK') return { ...unit, at: target.at };
          return unit;
        })
      };
      const root = document.querySelector('#app');
      if (!(root instanceof HTMLElement)) throw new Error('Missing app root');
      root.replaceChildren();
      const app = bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: state, aiStepDelayMs: 100000, prefersReducedMotion: ${String(reducedMotion)}, combatPresentationDurationMs: 5000 });
      Reflect.set(globalThis, '__PULP_WARS_APP__', app);
      let view = app.controller.snapshot().view;
      if (!view) throw new Error('Missing activation PlayerView');
      const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
      if (!(inspector instanceof HTMLSelectElement)) throw new Error('Missing semantic activator');
      inspector.value = 'unit:' + attacker.id;
      inspector.dispatchEvent(new Event('change', { bubbles: true }));
      view = app.controller.snapshot().view;
      const command = engine.queryPlayerCommands(view).map(({ command }) => command).find((command) => {
        if (command.kind !== kind || command.unitId !== attacker.id) return false;
        if (command.kind === 'ATTACK') return command.targetId === defender.id;
        const at = command.path.at(-1);
        return at?.x === target.at.x && at?.y === target.at.y;
      });
      if (!command) throw new Error('Missing exact ' + kind + ' command');
      const result = engine.applyCommand(state, command);
      if (!result.ok) throw new Error(result.error.code);
      const option = [...document.querySelectorAll('option')].find((candidate) => candidate.value === 'coordinate:' + target.at.x + ':' + target.at.y);
      if (!(option instanceof HTMLOptionElement)) throw new Error('Missing exact semantic target option');
      globalThis.__PULP_WARS_ACTIVATION_REVIEW__ = {
        kind,
        attackerAt: attacker.at,
        target: target.at,
        beforeIndex: state.commandIndex,
        expectedHash: engine.canonicalHash(result.state),
        optionLabel: option.textContent ?? ''
      };
      return true;
    })()`,
    true,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.unit-action-dock') !== null`,
  );
}

async function hoverSingleActivationTarget(
  connection: Connection,
): Promise<void> {
  const point = await singleActivationScreenPoint(connection);
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: point.x,
    y: point.y,
  });
  await delay(30);
}

async function assertAttackPreviewContract(
  connection: Connection,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const review = globalThis.__PULP_WARS_ACTIVATION_REVIEW__;
      if (!review || review.kind !== 'ATTACK') throw new Error('Missing attack review');
      const label = review.optionLabel;
      if (!label.includes('Attack once') || !label.includes('defender damage') || !/defender (survives|defeated)/.test(label) || !label.includes('retaliation damage') || !/attacker (survives|defeated)/.test(label) || !/attacker (advances|does not advance)/.test(label)) throw new Error('Incomplete exact attack accessible name: ' + label);
      if (document.querySelector('[data-modal], .modal-backdrop') !== null) throw new Error('Attack preview opened a modal');
      return true;
    })()`,
  );
}

async function activateSingleCommand(
  connection: Connection,
  channel: ActivationChannel,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const review = globalThis.__PULP_WARS_ACTIVATION_REVIEW__; if (!review) throw new Error('Missing activation review'); review.channel = ${JSON.stringify(channel)}; return true; })()`,
  );
  if (channel === "SEMANTIC") {
    await evaluate(
      connection,
      `(() => {
        const review = globalThis.__PULP_WARS_ACTIVATION_REVIEW__;
        const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
        if (!review || !(inspector instanceof HTMLSelectElement)) throw new Error('Missing semantic review input');
        inspector.focus();
        inspector.value = 'coordinate:' + review.target.x + ':' + review.target.y;
        inspector.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`,
    );
  } else if (channel === "KEYBOARD") {
    await evaluate(
      connection,
      `(() => {
        const review = globalThis.__PULP_WARS_ACTIVATION_REVIEW__;
        const canvas = document.querySelector('.board-canvas');
        if (!review || !(canvas instanceof HTMLCanvasElement)) throw new Error('Missing keyboard review input');
        const dx = review.target.x - review.attackerAt.x;
        const dy = review.target.y - review.attackerAt.y;
        const diagonal = dx !== 0 && dy !== 0;
        const key = diagonal
          ? (dx === dy ? (dx > 0 ? 'ArrowDown' : 'ArrowUp') : (dx > 0 ? 'ArrowRight' : 'ArrowLeft'))
          : dx !== 0 ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft')
          : (dy > 0 ? 'ArrowDown' : 'ArrowUp');
        canvas.focus({ preventScroll: true });
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey: diagonal, bubbles: true, cancelable: true }));
        canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        return true;
      })()`,
    );
  } else {
    const point = await singleActivationScreenPoint(connection);
    if (channel === "POINTER") {
      await connection.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
      await connection.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: point.x,
        y: point.y,
        button: "left",
        clickCount: 1,
      });
    } else {
      await connection.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: point.x, y: point.y }],
      });
      await connection.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
  }
  await delay(40);
}

async function singleActivationScreenPoint(
  connection: Connection,
): Promise<{ readonly x: number; readonly y: number }> {
  return evaluate(
    connection,
    `(() => {
      const review = globalThis.__PULP_WARS_ACTIVATION_REVIEW__;
      const app = globalThis.__PULP_WARS_APP__;
      const canvas = document.querySelector('.board-canvas');
      const point = review && app?.view.boardScreenPoint(review.target);
      if (!review || !point || !(canvas instanceof HTMLCanvasElement)) throw new Error('Missing activation target geometry');
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + point.x, y: rect.top + point.y };
    })()`,
  );
}

async function assertSingleActivationBoundary(
  connection: Connection,
  kind: PositionalCommandKind,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const review = globalThis.__PULP_WARS_ACTIVATION_REVIEW__;
      const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot();
      if (!review || review.kind !== ${JSON.stringify(kind)} || !snapshot?.match) throw new Error('Missing accepted activation boundary');
      if (snapshot.match.commandIndex !== review.beforeIndex + 1 || engine.canonicalHash(snapshot.match) !== review.expectedHash) throw new Error('Single activation did not commit the exact expected boundary');
      if (snapshot.overlay.name !== 'NONE' || document.querySelector('[data-modal], .modal-backdrop') !== null) throw new Error('Positional activation created confirmation UI');
      if (${JSON.stringify(kind)} === 'ATTACK' && snapshot.combatPresentation === null) throw new Error('Accepted attack omitted combat presentation');
      if (review.channel === 'KEYBOARD' && document.activeElement !== document.querySelector('.board-canvas')) throw new Error('Keyboard command lost Canvas focus');
      if (review.channel === 'SEMANTIC' && document.activeElement !== document.querySelector('select[aria-label="Choose a map coordinate or object"]')) throw new Error('Semantic command lost inspector focus');
      const saved = JSON.parse(localStorage.getItem('pulpWars.save.current') ?? '{}');
      if (saved.commandIndex !== snapshot.match.commandIndex || saved.stateHash !== review.expectedHash) throw new Error('Accepted positional command was not autosaved exactly');
      return true;
    })()`,
    true,
  );
}

async function assertExactDemoState(
  connection: Connection,
  expectedHash: string,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => { const engine = await import('/src/engine/index.ts'); const persistence = await import('/src/persistence/index.ts'); const render = await import('/src/render/canvas/render-plan.ts'); const app = globalThis.__PULP_WARS_APP__; const snapshot = app?.controller.snapshot(); const state = snapshot?.match; const view = snapshot?.view; if (!app || !state || !view) throw new Error('Missing Demo Match state'); const issues = engine.demoScenarioIssues(state); if (issues.length > 0) throw new Error('Demo invariants failed: ' + issues.join(',')); const hash = engine.canonicalHash(state); if (hash !== ${JSON.stringify(expectedHash)}) throw new Error('Wrong Demo initial hash: ' + hash); const human = state.players.find((player) => player.controller === 'HUMAN'); const ais = state.players.filter((player) => player.controller === 'AI'); if (!human || human.stars !== 30 || human.explored.length !== 625 || human.researchedTechs.length !== 9 || ais.some((player) => player.stars !== 5 || player.explored.length !== 25 || player.researchedTechs.length !== 0)) throw new Error('Wrong player specialization'); const cities = state.cities.filter((city) => city.ownerId === human.id); const units = state.units.filter((unit) => unit.ownerId === human.id); if (JSON.stringify(cities.map((city) => [city.id, city.at.x, city.at.y, city.level, city.population, city.rewardLevel2, city.rewardLevel3])) !== JSON.stringify([[1,20,2,3,0,'WORKSHOP','CITY_WALL'],[7,17,2,3,0,'WORKSHOP','CITY_WALL']])) throw new Error('Wrong Demo cities'); if (JSON.stringify(units.map((unit) => [unit.id, unit.homeCityId, unit.type, unit.at.x, unit.at.y, unit.ready, unit.capacityExempt])) !== JSON.stringify([[2,1,'WARRIOR',20,2,true,true],[8,1,'ARCHER',19,1,true,false],[9,1,'DEFENDER',20,1,true,false],[10,1,'RIDER',21,1,true,false],[11,7,'WARRIOR',17,2,true,false],[12,7,'ARCHER',16,1,true,false],[13,7,'DEFENDER',17,1,true,false],[14,7,'RIDER',18,1,true,false]])) throw new Error('Wrong Demo units'); if (engine.cityAssignedCountedUnitCount(state, cities[0].id) !== 3 || engine.cityAssignedExemptUnitCount(state, cities[0].id) !== 1 || engine.cityAssignedCountedUnitCount(state, cities[1].id) !== 4 || engine.cityAssignedExemptUnitCount(state, cities[1].id) !== 0) throw new Error('Wrong Demo assigned-capacity counts'); for (const unit of units) { const targets = render.buildRenderPlan(view, { kind: 'UNIT', unitId: unit.id }, null).entries.filter((entry) => entry.kind === 'MOVE_TARGET'); if (targets.length === 0) throw new Error('Unit lacks movement highlights: ' + unit.id); } const loaded = persistence.parseSave(localStorage.getItem(persistence.SAVE_STORAGE_KEY) ?? ''); if (loaded.kind !== 'VALID' || loaded.save.stateHash !== hash || engine.canonicalHash(loaded.save.state) !== hash) throw new Error('Demo autosave hash mismatch'); if (document.querySelector('.board-canvas')?.getAttribute('data-interactive') !== 'true') throw new Error('Demo Canvas is not interactive'); return true; })()`,
    true,
  );
}

async function activateDemoCapital(connection: Connection): Promise<void> {
  const point = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const app = globalThis.__PULP_WARS_APP__; const canvas = document.querySelector('.board-canvas'); const point = app?.view.boardScreenPoint({ x: 20, y: 2 }); if (!app || !(canvas instanceof HTMLCanvasElement) || !point) throw new Error('Missing Demo capital activation target'); const rect = canvas.getBoundingClientRect(); return { x: rect.left + point.x, y: rect.top + point.y }; })()`,
  );
  await connection.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    clickCount: 1,
  });
  await delay(50);
}

async function assertDemoDock(
  connection: Connection,
  kind: "UNIT" | "CITY",
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const kind = ${JSON.stringify(kind)}; const unit = document.querySelector('.unit-action-dock'); const city = document.querySelector('.city-action-dock'); if (document.querySelector('.modal-backdrop') !== null) throw new Error('Demo dock created a blocking backdrop'); if (kind === 'UNIT') { if (!(unit instanceof HTMLElement) || city !== null || !unit.textContent?.includes('Warrior') || !unit.textContent.includes('Choose a highlighted tile to move')) throw new Error('Demo unit dock/cycle missing; unit=' + unit?.textContent + '; city=' + city?.textContent); } else if (!(city instanceof HTMLElement) || unit !== null || !city.textContent?.includes('City 1') || !city.textContent.includes('3/3') || !city.textContent.includes('Founders1') || !city.textContent.includes('Workshop · City Wall')) throw new Error('Demo city dock/cycle missing; unit=' + unit?.textContent + '; city=' + city?.textContent); const dock = kind === 'UNIT' ? unit : city; const required = [document.querySelector('.match-hud'), document.querySelector('[data-focus-id="zoom-out"]'), document.querySelector('[data-focus-id="zoom-in"]'), document.querySelector('[data-focus-id="end-turn"]')]; const rect = dock?.getBoundingClientRect(); if (!rect || rect.left < -0.5 || rect.right > innerWidth + 0.5 || rect.top < -0.5 || rect.bottom > innerHeight + 0.5) throw new Error('Demo dock escapes viewport'); if (scrollX !== 0 || scrollY !== 0 || required.some((control) => { const bounds = control?.getBoundingClientRect(); return !bounds || bounds.left < -0.5 || bounds.right > innerWidth + 0.5 || bounds.top < -0.5 || bounds.bottom > innerHeight + 0.5; })) throw new Error('Demo selection scrolled or displaced required controls'); return true; })()`,
  );
}

type TileDockReviewState =
  | "fruit"
  | "resource-consumed"
  | "mine"
  | "ordinary-mountain"
  | "fog-safe"
  | "city-separation";

async function reviewTileDock(connection: Connection): Promise<void> {
  const states: readonly TileDockReviewState[] = [
    "fruit",
    "resource-consumed",
    "mine",
    "ordinary-mountain",
    "fog-safe",
    "city-separation",
  ];
  for (const mobile of [false, true]) {
    if (mobile) await mobileViewport(connection);
    else await desktopViewport(connection);
    for (const state of states) {
      await installTileDockReviewFixture(connection, state);
      await assertTileDockReview(connection, state);
      if (mobile) {
        await waitForNoHorizontalOverflow(connection);
        await assertResponsiveTargets(connection);
        await assertTrueMobileDpr2(connection);
      }
      await capture(
        connection,
        `selected-tile-dock-${state}-${mobile ? "mobile-390x844-dpr2" : "desktop"}.png`,
      );
    }
  }
}

async function installTileDockReviewFixture(
  connection: Connection,
  reviewState: TileDockReviewState,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [{ bootstrapApp }, engine] = await Promise.all([
        import('/src/app/bootstrap.ts'),
        import('/src/engine/index.ts')
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      const created = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 1, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL', aiMode: 'RIVAL' });
      if (!created.ok) throw new Error(created.error.code);
      const human = created.state.players.find((player) => player.controller === 'HUMAN');
      const city = created.state.cities.find((candidate) => candidate.ownerId === human?.id && candidate.isCapital);
      const territoryTargets = created.state.board.tiles.filter((tile) => tile.territoryCityId === city?.id && tile.site === null).sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
      const fruitAt = territoryTargets[0]?.at;
      const oreAt = territoryTargets[1]?.at;
      const ordinaryAt = territoryTargets[2]?.at;
      const hidden = created.state.board.tiles.find((tile) => tile.terrain === 'GRASS' && tile.resource === null && tile.site === null && !created.state.cities.some((candidate) => candidate.at.x === tile.at.x && candidate.at.y === tile.at.y) && !created.state.units.some((candidate) => candidate.at.x === tile.at.x && candidate.at.y === tile.at.y));
      if (!human || !city || !fruitAt || !oreAt || !ordinaryAt || !hidden) throw new Error('Missing selected-tile review entities');
      const tiles = created.state.board.tiles.map((tile) => {
        if (tile.at.x === fruitAt.x && tile.at.y === fruitAt.y) return { ...tile, terrain: 'GRASS', resource: 'FRUIT', improvement: null };
        if (tile.at.x === oreAt.x && tile.at.y === oreAt.y) return { ...tile, terrain: 'MOUNTAIN', resource: 'ORE', improvement: null };
        if (tile.at.x === ordinaryAt.x && tile.at.y === ordinaryAt.y) return { ...tile, terrain: 'MOUNTAIN', resource: null, improvement: null };
        return tile;
      });
      const state = {
        ...created.state,
        board: { ...created.state.board, tiles },
        activeSeatIndex: created.state.turnOrder.indexOf(human.id),
        players: created.state.players.map((player) => player.id === human.id ? {
          ...player,
          stars: 20,
          researchedTechs: ['CLIMBING', 'MINING', 'ORGANIZATION'],
          explored: created.state.board.tiles.filter((tile) => tile.at.x !== hidden.at.x || tile.at.y !== hidden.at.y).map((tile) => tile.at)
        } : player)
      };
      const root = document.querySelector('#app');
      if (!(root instanceof HTMLElement)) throw new Error('Missing app root');
      root.replaceChildren();
      const app = bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: state, storage: null, aiStepDelayMs: 100000, prefersReducedMotion: true });
      Reflect.set(globalThis, '__PULP_WARS_APP__', app);
      const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
      if (!(inspector instanceof HTMLSelectElement)) throw new Error('Missing semantic coordinate activator');
      const stateName = ${JSON.stringify(reviewState)};
      const coords = { fruit: fruitAt, mine: oreAt, ordinary: ordinaryAt, fog: hidden.at };
      if (stateName === 'city-separation') inspector.value = 'city:' + city.id;
      else {
        const at = stateName === 'fruit' || stateName === 'resource-consumed' ? coords.fruit : stateName === 'mine' ? coords.mine : stateName === 'ordinary-mountain' ? coords.ordinary : coords.fog;
        inspector.value = 'coordinate:' + at.x + ':' + at.y;
      }
      inspector.dispatchEvent(new Event('change', { bubbles: true }));
      if (stateName === 'resource-consumed') {
        const harvest = document.querySelector('.tile-action-dock .fruit-action');
        if (!(harvest instanceof HTMLButtonElement)) throw new Error('Missing exact Harvest Fruit action');
        harvest.click();
      }
      globalThis.__PULP_WARS_TILE_DOCK_REVIEW__ = { stateName, cityId: city.id, coords };
      return true;
    })()`,
    true,
  );
  await waitForExpression(
    connection,
    reviewState === "city-separation"
      ? `document.querySelector('.city-action-dock') !== null`
      : `document.querySelector('.tile-action-dock') !== null`,
  );
}

async function assertTileDockReview(
  connection: Connection,
  reviewState: TileDockReviewState,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const stateName = ${JSON.stringify(reviewState)};
      const review = globalThis.__PULP_WARS_TILE_DOCK_REVIEW__;
      if (!review || review.stateName !== stateName) throw new Error('Wrong tile-dock fixture');
      const tile = document.querySelector('.tile-action-dock');
      const city = document.querySelector('.city-action-dock');
      const canvas = document.querySelector('.board-canvas');
      if (document.querySelector('[data-modal]') !== null || document.querySelector('.modal-backdrop') !== null) throw new Error('Tile/city selection opened a modal or backdrop');
      if (!(canvas instanceof HTMLCanvasElement) || canvas.dataset.interactive !== 'true' || canvas.getAttribute('aria-disabled') !== 'false') throw new Error('Canvas is not interactive behind the dock');
      const dock = stateName === 'city-separation' ? city : tile;
      if (!(dock instanceof HTMLElement)) throw new Error('Expected bottom dock is missing');
      if (stateName === 'city-separation') {
        if (tile !== null || dock.querySelector('.fruit-action, .animal-action, .lumber-action, .mine-action') !== null || !dock.textContent?.includes('City ' + review.cityId)) throw new Error('City dock contains tile-scoped resources');
      } else {
        if (city !== null || !dock.getAttribute('aria-labelledby')) throw new Error('Tile dock semantics or separation are incomplete');
        if (stateName === 'fruit' && (!(dock.querySelector('.fruit-action') instanceof HTMLButtonElement) || !dock.textContent?.includes('Fruit') || !dock.textContent.includes('★ 2 · +1 pop'))) throw new Error('Exact Harvest Fruit control is missing');
        if (stateName === 'resource-consumed' && (dock.querySelector('button') !== null || !dock.textContent?.includes('Grass · None') || dock.textContent.includes('Harvest Fruit'))) throw new Error('Consumed fruit did not refresh its selected tile');
        if (stateName === 'mine' && (!(dock.querySelector('.mine-action') instanceof HTMLButtonElement) || !dock.textContent?.includes('Ore vein') || !dock.textContent.includes('★ 5 · +2 pop'))) throw new Error('Exact Build Mine control is missing');
        if (stateName === 'ordinary-mountain' && (dock.querySelector('button') !== null || !dock.textContent?.includes('Mountain · no ore'))) throw new Error('Ordinary mountain implies a Mine action');
        if (stateName === 'fog-safe') {
          if (dock.querySelector('button') !== null || !dock.textContent?.includes('Unexplored') || /Grass|Forest|Mountain|Fruit|Animal|Ore|Lumber|Mine|Village|Player|City/.test(dock.textContent ?? '')) throw new Error('Unexplored tile leaked hidden facts');
        }
      }
      const rect = dock.getBoundingClientRect();
      if (rect.top < -0.5 || rect.left < -0.5 || rect.right > innerWidth + 0.5 || rect.bottom > innerHeight + 0.5 || dock.scrollHeight > dock.clientHeight || ['auto', 'scroll'].includes(getComputedStyle(dock).overflowY)) throw new Error('Bottom dock overflows or scrolls');
      const actions = [...dock.querySelectorAll('button')];
      if (actions.some((action) => action.getBoundingClientRect().height < 44 || action.getBoundingClientRect().width < 44)) throw new Error('Tile action is below 44 CSS px');
      const required = [document.querySelector('[data-focus-id="zoom-out"]'), document.querySelector('[data-focus-id="zoom-in"]'), document.querySelector('[data-focus-id="end-turn"]')];
      if (scrollX !== 0 || scrollY !== 0 || document.documentElement.scrollWidth > innerWidth || required.some((control) => { const bounds = control?.getBoundingClientRect(); return !bounds || bounds.left < -0.5 || bounds.right > innerWidth + 0.5 || bounds.top < -0.5 || bounds.bottom > innerHeight + 0.5; })) throw new Error('Dock displaced required controls or page');
      if (canvas.getBoundingClientRect().height < 180) throw new Error('Tile dock leaves too little visible map');
      return true;
    })()`,
  );
}

async function reviewHugeMap(connection: Connection): Promise<void> {
  await desktopViewport(connection);
  await clickButton(connection, "New Conquest");
  await clickButton(connection, "Choose Conquest");
  await selectRadio(connection, "ai-count", "3");
  await selectRadio(connection, "board-size", "25");
  await setSeed(connection, 0);
  await evaluate(
    connection,
    `(() => { const huge = document.querySelector('input[name="board-size"][value="25"]'); const auto = document.querySelector('input[name="board-size"][value="AUTO"]'); if (!(huge instanceof HTMLInputElement) || !(auto instanceof HTMLInputElement) || !huge.checked || auto.checked || !document.body.textContent?.includes('Resolved board: 25 × 25') || !document.body.textContent?.includes('Auto · 16 × 16')) throw new Error('Huge setup contract is not visible'); return true; })()`,
  );
  await capture(connection, "huge-setup-desktop.png");

  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await capture(connection, "huge-setup-mobile-390x844-dpr2.png");

  await desktopViewport(connection);
  await clickButton(connection, "Continue");
  await clickButton(connection, "Start Conquest");
  await clickFirstButton(connection, ["Confirm Start", "Replace Save & Start"]);
  await waitForRoute(connection, "match");
  const initial = await matchSummary(connection);
  if (initial.aiCount !== 3 || initial.seed !== 0 || initial.width !== 25) {
    throw new Error(`Started the wrong Huge setup: ${JSON.stringify(initial)}`);
  }
  const desktopStart = await startClusterPosition(connection);
  assertCentered(desktopStart);
  await assertLoadedAssets(connection);
  await capture(connection, "huge-initial-capital-desktop.png");

  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  const mobileStart = await startClusterPosition(connection);
  assertCentered(mobileStart);
  await capture(connection, "huge-initial-capital-mobile-390x844-dpr2.png");
  const mobileInteraction = await exerciseMapCamera(connection);
  await capture(connection, "huge-interaction-mobile-390x844-dpr2.png");

  await desktopViewport(connection);
  const desktopInteraction = await exerciseMapCamera(connection);
  await capture(connection, "huge-interaction-desktop.png");

  const boundary = await drivePolicy(connection, 2);
  await connection.send("Page.reload", { ignoreCache: true });
  await waitForRoute(connection, "hub");
  await clickButton(connection, "Resume Conquest");
  await waitForRoute(connection, "match");
  const resumed = await matchSummary(connection);
  if (
    resumed.commandIndex !== boundary.commandIndex ||
    resumed.stateHash !== boundary.stateHash ||
    resumed.width !== 25
  ) {
    throw new Error(
      `Huge reload did not resume the exact saved boundary: ${JSON.stringify({ boundary, resumed })}`,
    );
  }
  await capture(connection, "huge-save-resume-desktop.png");
  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await capture(connection, "huge-save-resume-mobile-390x844-dpr2.png");
  console.log(
    `Huge browser metrics: ${JSON.stringify({ desktopStart, mobileStart, desktopInteraction, mobileInteraction, resumedCommandIndex: resumed.commandIndex, resumedStateHash: resumed.stateHash })}`,
  );
}

async function reviewCooperativeLarge(
  connection: Connection,
): Promise<MatchSummary> {
  await desktopViewport(connection);
  await clickButton(connection, "New Conquest");
  await clickButton(connection, "Choose Conquest");
  await selectRadio(connection, "ai-count", "3");
  await selectRadio(connection, "ai-relations", "COOPERATIVE");
  await selectRadio(connection, "board-size", "20");
  await setSeed(connection, 0);
  await evaluate(
    connection,
    `(() => {
      const cooperative = document.querySelector('input[name="ai-relations"][value="COOPERATIVE"]');
      const rival = document.querySelector('input[name="ai-relations"][value="RIVAL"]');
      const large = document.querySelector('input[name="board-size"][value="20"]');
      const auto = document.querySelector('input[name="board-size"][value="AUTO"]');
      const text = document.body.textContent ?? '';
      if (!(cooperative instanceof HTMLInputElement) || !(rival instanceof HTMLInputElement) || !(large instanceof HTMLInputElement) || !(auto instanceof HTMLInputElement)) throw new Error('Missing Cooperative Large setup controls');
      if (!cooperative.checked || rival.checked || !large.checked || auto.checked) throw new Error('Cooperative Large setup selection was not retained');
      if (!text.includes('Cooperate against you') || !text.includes('Large · 20 × 20') || !text.includes('Resolved board: 20 × 20') || !text.includes('Auto · 16 × 16')) throw new Error('Cooperative Large setup contract is not visible');
      return true;
    })()`,
  );
  await capture(connection, "cooperative-large-setup-desktop.png");

  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await capture(connection, "cooperative-large-setup-mobile-390x844-dpr2.png");

  await desktopViewport(connection);
  await clickButton(connection, "Continue");
  await clickButton(connection, "Start Conquest");
  await evaluate(
    connection,
    `(() => { const text = document.querySelector('[role="dialog"]')?.textContent ?? ''; if (!text.includes('3 AI') || !text.includes('20 × 20') || !text.includes('Cooperate against you')) throw new Error('Confirmation omitted Cooperative Large identity'); return true; })()`,
  );
  await capture(connection, "cooperative-large-confirmation-desktop.png");
  await clickFirstButton(connection, ["Confirm Start", "Replace Save & Start"]);
  await waitForRoute(connection, "match");
  const initial = await evaluate<{
    readonly commandIndex: number;
    readonly stateHash: string;
    readonly aiMode: string;
    readonly width: number;
    readonly height: number;
    readonly aiCount: number;
    readonly settlements: number;
    readonly mountains: number;
    readonly forests: number;
    readonly animals: number;
  }>(
    connection,
    `(async () => {
      const engine = await import('/src/engine/index.ts');
      const app = globalThis.__PULP_WARS_APP__;
      const match = app?.controller.snapshot().match;
      if (!match) throw new Error('Missing Cooperative Large match');
      return {
        commandIndex: match.commandIndex,
        stateHash: engine.canonicalHash(match),
        aiMode: match.setup.aiMode,
        width: match.setup.width,
        height: match.setup.height,
        aiCount: match.setup.aiCount,
        settlements: match.board.tiles.filter((tile) => tile.site !== null).length,
        mountains: match.board.tiles.filter((tile) => tile.terrain === 'MOUNTAIN').length,
        forests: match.board.tiles.filter((tile) => tile.terrain === 'FOREST').length,
        animals: match.board.tiles.filter((tile) => tile.resource === 'ANIMAL').length
      };
    })()`,
    true,
  );
  // The first stored turn may belong to an AI, and real Chrome can accept more
  // than one paced command before CDP observes the route. Setup identity and
  // the later frozen save/resume boundary are the deterministic assertions.
  if (
    !Number.isSafeInteger(initial.commandIndex) ||
    initial.commandIndex < 0 ||
    initial.aiMode !== "COOPERATIVE" ||
    initial.width !== 20 ||
    initial.height !== 20 ||
    initial.aiCount !== 3 ||
    initial.settlements !== 20 ||
    initial.mountains !== 72 ||
    initial.forests !== 96 ||
    initial.animals < 1
  ) {
    throw new Error(
      `Started the wrong Cooperative Large setup: ${JSON.stringify(initial)}`,
    );
  }
  assertCentered(await startClusterPosition(connection));
  await assertLoadedAssets(connection);
  await capture(connection, "cooperative-large-match-desktop.png");
  const desktopInteraction = await exerciseMapCamera(connection);
  await capture(connection, "cooperative-large-camera-desktop.png");

  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  assertCentered(await startClusterPosition(connection));
  await capture(connection, "cooperative-large-match-mobile-390x844-dpr2.png");
  const mobileInteraction = await exerciseMapCamera(connection);
  await capture(connection, "cooperative-large-camera-mobile-390x844-dpr2.png");

  await desktopViewport(connection);
  const boundary = await drivePolicy(connection, 30);
  if (boundary.commandIndex < 30 || boundary.outcome !== null) {
    throw new Error(
      `Cooperative Large browser policy did not reach a live save boundary: ${JSON.stringify(boundary)}`,
    );
  }
  await connection.send("Page.reload", { ignoreCache: true });
  await waitForRoute(connection, "hub");
  const loaded = await matchSummary(connection);
  if (
    loaded.commandIndex !== boundary.commandIndex ||
    loaded.stateHash !== boundary.stateHash ||
    loaded.width !== 20 ||
    loaded.aiCount !== 3
  ) {
    throw new Error(
      `Cooperative Large reload did not preserve the saved boundary: ${JSON.stringify({ boundary, loaded })}`,
    );
  }
  await clickButton(connection, "Resume Conquest");
  await waitForRoute(connection, "match");
  const resumed = await matchSummary(connection);
  if (
    resumed.commandIndex !== boundary.commandIndex ||
    resumed.stateHash !== boundary.stateHash
  ) {
    throw new Error(
      `Cooperative Large resume changed the saved boundary: ${JSON.stringify({ boundary, resumed })}`,
    );
  }
  await capture(connection, "cooperative-large-save-resume-desktop.png");

  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await capture(
    connection,
    "cooperative-large-save-resume-mobile-390x844-dpr2.png",
  );
  console.log(
    `Cooperative Large browser metrics: ${JSON.stringify({ initial, desktopInteraction, mobileInteraction, boundary })}`,
  );
  return boundary;
}

async function selectRadio(
  connection: Connection,
  name: string,
  value: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const input = document.querySelector('input[name=${JSON.stringify(name)}][value=${JSON.stringify(value)}]'); if (!(input instanceof HTMLInputElement) || input.disabled) throw new Error('Missing enabled radio ${name}:${value}'); input.click(); return true; })()`,
  );
}

async function assertTrueMobileDpr2(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { if (innerWidth !== 390 || innerHeight !== 844 || devicePixelRatio !== 2) throw new Error('Viewport is not true 390x844 DPR2'); return true; })()`,
  );
  const hasCanvas = await evaluate<boolean>(
    connection,
    `document.querySelector('.board-canvas') instanceof HTMLCanvasElement`,
  );
  if (hasCanvas) {
    await waitForExpression(
      connection,
      `(() => { const canvas = document.querySelector('.board-canvas'); if (!(canvas instanceof HTMLCanvasElement)) return false; const rect = canvas.getBoundingClientRect(); return canvas.width === Math.round(rect.width * 2) && canvas.height === Math.round(rect.height * 2); })()`,
    );
  }
}

async function exerciseMapCamera(
  connection: Connection,
): Promise<{ readonly x: number; readonly y: number }> {
  const delta = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const app = globalThis.__PULP_WARS_APP__; const canvas = document.querySelector('.board-canvas'); const capital = app?.controller.snapshot().view?.cities.find((city) => city.ownerId === app.controller.snapshot().view.viewer.id && city.isCapital); if (!app || !(canvas instanceof HTMLCanvasElement) || !capital) throw new Error('Missing Huge map interaction surface'); const before = app.view.boardScreenPoint(capital.at); const rect = canvas.getBoundingClientRect(); const start = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; canvas.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 91, pointerType: 'mouse', clientX: start.x, clientY: start.y, bubbles: true })); canvas.dispatchEvent(new PointerEvent('pointermove', { pointerId: 91, pointerType: 'mouse', clientX: start.x, clientY: start.y + 36, bubbles: true })); canvas.dispatchEvent(new PointerEvent('pointerup', { pointerId: 91, pointerType: 'mouse', clientX: start.x, clientY: start.y + 36, bubbles: true })); canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: start.x, clientY: start.y, bubbles: true, cancelable: true })); const after = app.view.boardScreenPoint(capital.at); if (!before || !after) throw new Error('Capital projection disappeared during interaction'); return { x: after.x - before.x, y: after.y - before.y }; })()`,
  );
  if (Math.abs(delta.x) < 20 && Math.abs(delta.y) < 15) {
    throw new Error(`Huge map did not pan/zoom: ${JSON.stringify(delta)}`);
  }
  return delta;
}

async function reviewTechnologyTree(connection: Connection): Promise<void> {
  await desktopViewport(connection);
  await installTechnologyReviewFixture(connection);
  await clickButton(connection, "Tech");
  await waitForTechnologyIcons(connection);
  await assertTechnologyLayout(connection, null);
  await capture(connection, "second-technology-overview-desktop.png");

  await focusTechnologyNode(connection, "climbing");
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13,
    nativeVirtualKeyCode: 13,
  });
  await waitForExpression(
    connection,
    `document.querySelector('.tech-detail')?.dataset.tech === 'climbing'`,
  );
  await assertTechnologyLayout(connection, "climbing");
  await capture(connection, "second-technology-detail-desktop.png");

  await clickButton(connection, "Research Climbing · 5 stars");
  await waitForExpression(
    connection,
    `document.querySelector('.confirm-content') !== null`,
  );
  await clickButton(connection, "Cancel");
  await waitForExpression(
    connection,
    `document.querySelector('.tech-detail')?.dataset.tech === 'climbing' && document.activeElement?.dataset.focusId === 'tech-climbing'`,
  );
  await clickButton(connection, "Research Climbing · 5 stars");
  await clickButton(connection, "Confirm Research");
  await waitForExpression(
    connection,
    `document.querySelector('[data-tech="climbing"]')?.dataset.state === 'researched' && document.querySelector('[data-tech="mining"]')?.dataset.state === 'available'`,
  );
  await assertTechnologyLayout(connection, "climbing");

  await mobileViewport(connection);
  await installTechnologyReviewFixture(connection);
  await clickButton(connection, "Tech");
  await waitForTechnologyIcons(connection);
  await assertTechnologyLayout(connection, null);
  await capture(
    connection,
    "second-technology-overview-mobile-390x844-dpr2.png",
  );

  await focusTechnologyNode(connection, "archery");
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: " ",
    code: "Space",
    windowsVirtualKeyCode: 32,
    nativeVirtualKeyCode: 32,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: " ",
    code: "Space",
    windowsVirtualKeyCode: 32,
    nativeVirtualKeyCode: 32,
  });
  await waitForExpression(
    connection,
    `document.querySelector('.tech-detail')?.dataset.tech === 'archery'`,
  );
  await assertTechnologyLayout(connection, "archery");
  await capture(connection, "second-technology-detail-mobile-390x844-dpr2.png");
}

async function installTechnologyReviewFixture(
  connection: Connection,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [appModule, engine] = await Promise.all([
        import('/src/app/bootstrap.ts'),
        import('/src/engine/index.ts')
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      const created = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 6173, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL', aiMode: 'RIVAL' });
      if (!created.ok) throw new Error(created.error.code);
      const human = created.state.players.find((player) => player.controller === 'HUMAN');
      if (!human) throw new Error('Missing technology review human');
      const state = {
        ...created.state,
        activeSeatIndex: created.state.turnOrder.indexOf(human.id),
        players: created.state.players.map((player) => player.id === human.id
          ? { ...player, stars: 20, explored: created.state.board.tiles.map((tile) => tile.at) }
          : player)
      };
      const root = document.querySelector('#app');
      if (!(root instanceof HTMLElement)) throw new Error('Missing app root');
      const app = appModule.bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: state, storage: null, aiStepDelayMs: 100000, prefersReducedMotion: true });
      Reflect.set(globalThis, '__PULP_WARS_APP__', app);
      return true;
    })()`,
    true,
  );
  await waitForRoute(connection, "match");
}

async function waitForTechnologyIcons(connection: Connection): Promise<void> {
  await waitForExpression(
    connection,
    `(() => { const images = [...document.querySelectorAll('.tech-node-art:is(img)')]; return images.length === 5 && images.every((image) => image.complete && image.naturalWidth > 0); })()`,
  );
}

async function focusTechnologyNode(
  connection: Connection,
  tech: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const node = document.querySelector('[data-tech=${JSON.stringify(tech)}]'); if (!(node instanceof HTMLButtonElement)) throw new Error('Missing technology node: ${tech}'); node.focus({ preventScroll: true }); if (document.activeElement !== node) throw new Error('Could not focus technology node: ${tech}'); return true; })()`,
  );
}

async function assertTechnologyLayout(
  connection: Connection,
  detailTech: string | null,
): Promise<void> {
  await waitForNoHorizontalOverflow(connection);
  await evaluate(
    connection,
    `(() => {
      const modal = document.querySelector('.modal-tech');
      const content = document.querySelector('.tech-content');
      const tree = document.querySelector('[role="tree"]');
      const nodes = [...document.querySelectorAll('.tech-node')];
      const close = document.querySelector('.tech-content > .close-button');
      if (!(modal instanceof HTMLElement) || !(content instanceof HTMLElement) || !(tree instanceof HTMLElement) || !(close instanceof HTMLButtonElement)) throw new Error('Missing technology review surface');
      if (nodes.length !== 9 || tree.querySelectorAll('[role="group"]').length !== 4 || tree.querySelectorAll('.tech-connector').length !== 5) throw new Error('Technology graph structure changed');
      if (!tree.getAttribute('aria-describedby') || nodes.some((node) => !node.getAttribute('aria-label') || node.textContent?.includes('Train ') || node.textContent?.includes('Move onto'))) throw new Error('Technology overview is not symbol-only and accessible');
      const modalRect = modal.getBoundingClientRect();
      const contentRect = content.getBoundingClientRect();
      const closeRect = close.getBoundingClientRect();
      if (modalRect.left < -0.5 || modalRect.right > innerWidth + 0.5 || modalRect.top < -0.5 || modalRect.bottom > innerHeight + 0.5) throw new Error('Technology modal escapes viewport');
      if (scrollX !== 0 || scrollY !== 0) throw new Error('Technology view shifted the page viewport');
      if (modal.scrollTop !== 0 || content.scrollTop !== 0) throw new Error('Technology view shifted an internal viewport');
      if (modal.scrollHeight > modal.clientHeight + 1 || content.scrollHeight > content.clientHeight + 1 || document.documentElement.scrollHeight > document.documentElement.clientHeight + 1) throw new Error('Technology view requires scrolling');
      if (closeRect.top < 0 || closeRect.bottom > innerHeight || closeRect.width < 44 || closeRect.height < 44) throw new Error('Technology Close is unreachable');
      if (nodes.some((node) => { const rect = node.getBoundingClientRect(); return rect.width < 44 || rect.height < 44 || rect.left < 0 || rect.right > innerWidth; })) throw new Error('Technology node target is clipped or undersized');
      const roots = [...tree.querySelectorAll('.tech-branch > .tech-node:first-child')].map((node) => Math.round(node.getBoundingClientRect().left));
      if (new Set(roots).size !== 4) throw new Error('Technology roots are not four distinct visual columns');
      const expectedDetail = ${JSON.stringify(detailTech)};
      const detail = document.querySelector('.tech-detail');
      if (expectedDetail === null && detail !== null) throw new Error('Overview unexpectedly contains a detail card');
      if (expectedDetail !== null) {
        if (!(detail instanceof HTMLElement) || detail.dataset.tech !== expectedDetail) throw new Error('Wrong technology detail selected');
        const detailRect = detail.getBoundingClientRect();
        if (detailRect.left < 0 || detailRect.right > innerWidth || detailRect.bottom > innerHeight) throw new Error('Technology detail is clipped');
        const action = detail.querySelector('button');
        if (action instanceof HTMLButtonElement) {
          const actionRect = action.getBoundingClientRect();
          if (actionRect.bottom > innerHeight || actionRect.width < 44 || actionRect.height < 44) throw new Error('Technology research action is unreachable');
        }
      }
      return true;
    })()`,
  );
}

async function reviewCombatAnimation(connection: Connection): Promise<void> {
  await desktopViewport(connection);
  await installCombatReviewFixture(connection, false);
  await delay(220);
  await assertCombatReview(connection, "contact", "full");
  await capture(connection, "feedback-attack-contact-desktop.png");
  await waitForExpression(
    connection,
    `document.querySelector('.board-canvas')?.dataset.combatPhase === 'impact'`,
  );
  await delay(80);
  await assertCombatReview(connection, "impact", "full");
  await capture(connection, "feedback-attack-impact-desktop.png");

  await mobileViewport(connection);
  await installCombatReviewFixture(connection, false);
  await delay(220);
  await assertCombatReview(connection, "contact", "full");
  await capture(connection, "feedback-attack-contact-mobile-390-dpr2.png");
  await waitForNoHorizontalOverflow(connection);
  await waitForExpression(
    connection,
    `document.querySelector('.board-canvas')?.dataset.combatPhase === 'impact'`,
  );
  await delay(80);
  await assertCombatReview(connection, "impact", "full");
  await capture(connection, "feedback-attack-impact-mobile-390-dpr2.png");

  await installCombatReviewFixture(connection, true);
  await assertCombatReview(connection, "impact", "reduced");
  await waitForNoHorizontalOverflow(connection);
}

async function installCombatReviewFixture(
  connection: Connection,
  reducedMotion: boolean,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [appModule, engine] = await Promise.all([
        import('/src/app/bootstrap.ts'),
        import('/src/engine/index.ts')
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      const created = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 6173, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL', aiMode: 'RIVAL' });
      if (!created.ok) throw new Error(created.error.code);
      const human = created.state.players.find((player) => player.controller === 'HUMAN');
      const humanCity = created.state.cities.find((city) => city.ownerId === human?.id && city.isCapital);
      const attacker = created.state.units.find((unit) => unit.ownerId === human?.id);
      const defender = created.state.units.find((unit) => unit.ownerId !== human?.id);
      if (!human || !humanCity || !attacker || !defender) throw new Error('Missing combat review entities');
      const openNeighbors = created.state.board.tiles.filter((tile) => Math.max(Math.abs(tile.at.x - humanCity.at.x), Math.abs(tile.at.y - humanCity.at.y)) === 1 && !created.state.cities.some((city) => city.at.x === tile.at.x && city.at.y === tile.at.y));
      const attackerTile = openNeighbors.find((tile) => openNeighbors.some((other) => other !== tile && Math.max(Math.abs(other.at.x - tile.at.x), Math.abs(other.at.y - tile.at.y)) === 1));
      const defenderTile = attackerTile && openNeighbors.find((tile) => tile !== attackerTile && Math.max(Math.abs(tile.at.x - attackerTile.at.x), Math.abs(tile.at.y - attackerTile.at.y)) === 1);
      if (!attackerTile || !defenderTile) throw new Error('Missing centered combat review tiles');
      const state = {
        ...created.state,
        activeSeatIndex: created.state.turnOrder.indexOf(human.id),
        players: created.state.players.map((player) => ({ ...player, explored: created.state.board.tiles.map((tile) => tile.at) })),
        board: {
          ...created.state.board,
          tiles: created.state.board.tiles.map((tile) => {
            const isCombatTile = (tile.at.x === attackerTile.at.x && tile.at.y === attackerTile.at.y) || (tile.at.x === defenderTile.at.x && tile.at.y === defenderTile.at.y);
            return isCombatTile ? { ...tile, terrain: 'GRASS', resource: null, improvement: null } : tile;
          })
        },
        units: created.state.units.map((unit) => unit.id === attacker.id
          ? { ...unit, at: attackerTile.at, ready: true, activation: { moved: false, attacked: false, recovered: false, captured: false, handled: false, escapeAvailable: false } }
          : unit.id === defender.id
            ? { ...unit, at: defenderTile.at, ready: true, activation: { moved: false, attacked: false, recovered: false, captured: false, handled: false, escapeAvailable: false } }
            : unit)
      };
      const root = document.querySelector('#app');
      if (!(root instanceof HTMLElement)) throw new Error('Missing app root');
      const app = appModule.bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: state, storage: null, aiStepDelayMs: 100000, prefersReducedMotion: ${reducedMotion}, combatPresentationDurationMs: 1000 });
      Reflect.set(globalThis, '__PULP_WARS_APP__', app);
      const view = app.controller.snapshot().view;
      if (!view) throw new Error('Missing combat review view');
      const attack = engine.queryPlayerCommands(view).map(({ command }) => command).find((command) => command.kind === 'ATTACK' && command.unitId === attacker.id && command.targetId === defender.id);
      if (!attack) throw new Error('Missing combat review attack');
      const expected = engine.applyCommand(state, attack);
      if (!expected.ok) throw new Error(expected.error.code);
      const beforeIndex = state.commandIndex;
      if (!app.controller.dispatch(attack)) throw new Error('Combat review attack rejected');
      const snapshot = app.controller.snapshot();
      globalThis.__PULP_WARS_COMBAT_REVIEW__ = {
        expectedHash: engine.canonicalHash(expected.state),
        actualHash: engine.canonicalHash(snapshot.match),
        expectedIndex: beforeIndex + 1,
        actualIndex: snapshot.match?.commandIndex,
        secondCommandAccepted: app.controller.dispatch({ kind: 'END_TURN' })
      };
      return true;
    })()`,
    true,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.board-canvas')?.dataset.combatPhase !== undefined`,
  );
}

async function assertCombatReview(
  connection: Connection,
  phase: "contact" | "impact",
  motion: "full" | "reduced",
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const canvas = document.querySelector('.board-canvas');
      const review = globalThis.__PULP_WARS_COMBAT_REVIEW__;
      const polite = document.querySelector('#polite-live');
      if (!(canvas instanceof HTMLCanvasElement) || canvas.dataset.combatPhase !== ${JSON.stringify(phase)} || canvas.dataset.combatMotion !== ${JSON.stringify(motion)}) throw new Error('Wrong combat Canvas phase/motion: ' + JSON.stringify({ phase: canvas instanceof HTMLCanvasElement ? canvas.dataset.combatPhase : null, motion: canvas instanceof HTMLCanvasElement ? canvas.dataset.combatMotion : null, expectedPhase: ${JSON.stringify(phase)}, expectedMotion: ${JSON.stringify(motion)} }));
      if (!review || review.actualHash !== review.expectedHash || review.actualIndex !== review.expectedIndex || review.secondCommandAccepted !== false) throw new Error('Combat presentation changed or failed to lock the authoritative boundary');
      if (!polite?.textContent?.includes('dealt')) throw new Error('Missing accessible combat announcement');
      return true;
    })()`,
  );
}

async function reviewCaptureAction(connection: Connection): Promise<void> {
  await startConquest(connection, 1, 1);
  await evaluate(
    connection,
    `(async () => {
      const [ai, engine] = await Promise.all([
        import('/src/ai/index.ts'),
        import('/src/engine/index.ts')
      ]);
      const app = globalThis.__PULP_WARS_APP__;
      if (!app) throw new Error('Missing browser app handle');
      for (let iteration = 0; iteration < 10000; iteration += 1) {
        const snapshot = app.controller.snapshot();
        if (snapshot.match?.outcome) throw new Error('Match ended before a human capture opportunity');
        const view = snapshot.view;
        if (!view) throw new Error('Missing browser player view');
        const activeId = view.turnOrder[view.activeSeatIndex];
        const active = view.players.find((player) => player.id === activeId);
        if (active?.controller === 'AI') {
          app.controller.fastForwardAi();
          continue;
        }
        const commands = engine.queryPlayerCommands(view).map(({ command }) => command);
        const capture = commands.find((command) => command.kind === 'CAPTURE');
        if (capture) return { unitId: capture.unitId, commandIndex: snapshot.match.commandIndex };
        const decision = ai.chooseNormalCommand(view);
        if (decision.command?.kind === 'CHOOSE_CITY_REWARD') {
          app.controller.chooseReward(decision.command.cityId, decision.command.reward);
        } else if (!decision.command || !app.controller.dispatch(decision.command)) {
          throw new Error('Failed to drive browser policy to a capture opportunity');
        }
        while (app.controller.snapshot().combatPresentation !== null) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        if (iteration % 50 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      }
      throw new Error('No capture opportunity within browser review budget');
    })()`,
    true,
  );
  await assertCaptureAction(connection);
  await exerciseMapCamera(connection);
  await assertCaptureAction(connection);
  await capture(connection, "unit-action-dock-desktop.png");
  await mobileViewport(connection);
  await waitForNoHorizontalOverflow(connection);
  await assertResponsiveTargets(connection);
  await assertTrueMobileDpr2(connection);
  await assertCaptureAction(connection);
  await capture(connection, "unit-action-dock-mobile-390x844-dpr2.png");
}

async function assertCaptureAction(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__;
      if (!app) throw new Error('Missing browser app handle');
      const view = app.controller.snapshot().view;
      if (!view) throw new Error('Missing capture view');
      const selectedCapture = view.units.find((unit) => unit.ownerId === view.viewer.id && unit.captureEligible);
      if (!selectedCapture) throw new Error('Missing capture-eligible unit');
      const explored = view.board.tiles.find((tile) => tile.explored);
      if (!explored) throw new Error('Missing explored tile');
      const chooseDetail = (value) => {
        const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
        if (!(inspector instanceof HTMLSelectElement)) throw new Error('Missing map inspector');
        inspector.value = value;
        inspector.dispatchEvent(new Event('change', { bubbles: true }));
        const dock = document.querySelector('.tile-action-dock');
        const canvas = document.querySelector('.board-canvas');
        if (!(dock instanceof HTMLElement)) throw new Error('Tile dock did not open');
        if (document.querySelector('[data-modal], .modal-backdrop') !== null) throw new Error('Tile inspection opened a modal or backdrop');
        if (!(canvas instanceof HTMLCanvasElement) || canvas.dataset.interactive !== 'true' || canvas.getAttribute('aria-disabled') !== 'false') throw new Error('Tile inspection blocked the map');
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        if (document.querySelector('.tile-action-dock') !== null || !(document.activeElement instanceof HTMLCanvasElement) || !document.activeElement.matches('.board-canvas')) throw new Error('Escape did not clear tile inspection and restore Canvas focus');
      };
      chooseDetail('tile:' + explored.at.x + ':' + explored.at.y);
      if (document.querySelector('.unit-action-dock') !== null || document.querySelector('.capture-action') !== null) throw new Error('Capture leaked globally before unit selection');
      const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
      if (!(inspector instanceof HTMLSelectElement)) throw new Error('Missing map inspector');
      inspector.value = 'unit:' + selectedCapture.id;
      inspector.dispatchEvent(new Event('change', { bubbles: true }));
      const dock = document.querySelector('.unit-action-dock');
      const canvas = document.querySelector('.board-canvas');
      if (!(dock instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) throw new Error('Missing selected-unit dock or Canvas');
      if (document.querySelector('.modal-unit') !== null || document.querySelector('.modal-backdrop') !== null || document.querySelector('[data-modal]') !== null) throw new Error('Unit selection opened a modal/backdrop');
      if (canvas.dataset.interactive !== 'true' || canvas.getAttribute('aria-disabled') !== 'false') throw new Error('Unit selection blocked the map');
      if (!dock.textContent?.includes('Attack') || !dock.textContent.includes('Defense') || !dock.textContent.includes('Move') || !dock.textContent.includes('Range')) throw new Error('Selected unit stats are incomplete');
      const buttons = [...dock.querySelectorAll('.capture-action')];
      const button = buttons[0];
      if (buttons.length !== 1 || !(button instanceof HTMLButtonElement) || button.disabled || !/^Capture (Village|City)$/.test(button.textContent ?? '')) throw new Error('Missing one concise selected-unit Capture button');
      if ((button.textContent ?? '').includes(',') || (button.textContent ?? '').includes(' with ')) throw new Error('Selected capture label leaked coordinates or unit associations');
      if (document.querySelectorAll('.capture-action').length !== 1) throw new Error('Capture command leaked outside the selected-unit dock');
      button.focus();
      if (document.activeElement !== button) throw new Error('Selected Capture button cannot receive keyboard focus');
      const selectedModel = app.controller.snapshot();
      if (selectedModel.overlay.name !== 'NONE') throw new Error('Unit selection changed overlay state');
      const warnings = app.controller.endTurnWarnings();
      if (!warnings.includes('Units need attention') || !warnings.includes('A capture remains')) throw new Error('Capture warning categories are not derived from handled state and the offered command');
      return true;
    })()`,
  );
}

type GrowthReviewState =
  "rich-actions" | "empty" | "level-4" | "reward-pending";

async function reviewCityGrowth(connection: Connection): Promise<void> {
  for (const state of [
    "rich-actions",
    "empty",
    "level-4",
    "reward-pending",
  ] as const) {
    await desktopViewport(connection);
    await installGrowthReviewFixture(connection, state);
    await assertGrowthReview(connection, state);
    if (state === "rich-actions") await exerciseMapCamera(connection);
    await capture(
      connection,
      state === "level-4"
        ? "scalable-city-level4-desktop.png"
        : `selected-city-dock-${state}-desktop.png`,
    );

    await mobileViewport(connection);
    await installGrowthReviewFixture(connection, state);
    await assertGrowthReview(connection, state);
    await waitForNoHorizontalOverflow(connection);
    await assertResponsiveTargets(connection);
    if (state === "rich-actions") await exerciseMapCamera(connection);
    await capture(
      connection,
      state === "level-4"
        ? "scalable-city-level4-mobile-390x844-dpr2.png"
        : `selected-city-dock-${state}-mobile-390x844-dpr2.png`,
    );
  }
}

async function installGrowthReviewFixture(
  connection: Connection,
  reviewState: GrowthReviewState,
): Promise<void> {
  await evaluate(
    connection,
    `(async () => {
      const [{ bootstrapApp }, engine, cityAssets] = await Promise.all([
        import('/src/app/bootstrap.ts'),
        import('/src/engine/index.ts'),
        import('/src/render/canvas/pixellab-asset-bindings.ts')
      ]);
      globalThis.__PULP_WARS_APP__?.destroy?.();
      const created = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 6173, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL', aiMode: 'RIVAL' });
      if (!created.ok) throw new Error(created.error.code);
      const human = created.state.players.find((player) => player.controller === 'HUMAN');
      const city = created.state.cities.find((candidate) => candidate.ownerId === human?.id && candidate.isCapital);
      const homeUnit = created.state.units.find((unit) => unit.ownerId === human?.id && unit.homeCityId === city?.id);
      const openTile = created.state.board.tiles.find((tile) => tile.terrain === 'GRASS' && tile.site === null && !created.state.cities.some((candidate) => candidate.at.x === tile.at.x && candidate.at.y === tile.at.y) && !created.state.units.some((candidate) => candidate.at.x === tile.at.x && candidate.at.y === tile.at.y));
      if (!human || !city || !homeUnit || !openTile) throw new Error('Missing selected-city review entities');
      const stateName = ${JSON.stringify(reviewState)};
      const state = {
        ...created.state,
        activeSeatIndex: created.state.turnOrder.indexOf(human.id),
        players: created.state.players.map((player) => player.id === human.id ? {
          ...player,
          stars: stateName === 'rich-actions' ? 40 : player.stars,
          researchedTechs: stateName === 'rich-actions' ? ['CLIMBING', 'MINING', 'RIDING', 'HUNTING', 'ARCHERY', 'ORGANIZATION', 'STRATEGY'] : []
        } : player),
        cities: created.state.cities.map((candidate) => candidate.id === city.id ? {
          ...candidate,
          level: stateName === 'reward-pending' ? 2 : stateName === 'level-4' ? 4 : candidate.level,
          population: stateName === 'rich-actions' ? 1 : 0,
          rewardLevel2: stateName === 'reward-pending' ? null : candidate.rewardLevel2
        } : candidate),
        units: created.state.units.map((unit) => unit.id === homeUnit.id && (stateName === 'rich-actions' || stateName === 'level-4') ? { ...unit, at: openTile.at } : unit),
        pendingChoice: stateName === 'reward-pending'
          ? { kind: 'CITY_REWARD', cityId: city.id, level: 2 }
          : null
      };
      const root = document.querySelector('#app');
      if (!(root instanceof HTMLElement)) throw new Error('Missing app root');
      root.replaceChildren();
      const app = bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: state, storage: null, aiStepDelayMs: 100000, prefersReducedMotion: true });
      Reflect.set(globalThis, '__PULP_WARS_APP__', app);
      if (stateName !== 'reward-pending') {
        const inspector = document.querySelector('select[aria-label="Choose a map coordinate or object"]');
        if (!(inspector instanceof HTMLSelectElement)) throw new Error('Missing city inspector');
        inspector.value = 'city:' + city.id;
        inspector.dispatchEvent(new Event('change', { bubbles: true }));
      }
      globalThis.__PULP_WARS_GROWTH_REVIEW__ = { stateName, cityId: city.id };
      if (stateName === 'level-4' && cityAssets.cityArtLevel(4) !== 3) throw new Error('Level-4 city did not bind to the accepted level-3 raster');
      return true;
    })()`,
    true,
  );
  await waitForExpression(
    connection,
    reviewState === "reward-pending"
      ? `document.querySelector('.reward-content') !== null`
      : `document.querySelector('.city-action-dock') !== null`,
  );
}

async function assertGrowthReview(
  connection: Connection,
  reviewState: GrowthReviewState,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const stateName = ${JSON.stringify(reviewState)};
      const review = globalThis.__PULP_WARS_GROWTH_REVIEW__;
      if (!review || review.stateName !== stateName) throw new Error('Wrong city-growth fixture');
      const modal = document.querySelector('[data-modal]');
      if (stateName === 'reward-pending') {
        if (!(modal instanceof HTMLElement)) throw new Error('Missing city reward modal');
        if (modal.getAttribute('role') !== 'dialog' || modal.getAttribute('aria-modal') !== 'true') throw new Error('Reward choice is not a modal dialog');
        if (!modal.textContent?.includes("A resource action increased this city's population") || !modal.textContent.includes('cannot train units, harvest Fruit, hunt Animals, build a Lumber Mill or Mine, or End Turn') || modal.querySelectorAll('.reward-choice').length !== 2) throw new Error('Reward-pending consequences are incomplete');
        const rect = modal.getBoundingClientRect();
        if (rect.top < 0 || rect.left < 0 || rect.right > innerWidth || rect.bottom > innerHeight) throw new Error('Reward sheet extends outside the visual viewport');
        if (modal.scrollHeight > modal.clientHeight || document.documentElement.scrollHeight > innerHeight) throw new Error('Reward state requires scrolling');
      } else {
        const dock = document.querySelector('.city-action-dock');
        const canvas = document.querySelector('.board-canvas');
        if (modal !== null || document.querySelector('.modal-backdrop') !== null) throw new Error('City selection opened a modal/backdrop');
        if (!(dock instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement) || canvas.dataset.interactive !== 'true' || canvas.getAttribute('aria-disabled') !== 'false') throw new Error('Selected-city dock or interactive Canvas is missing');
        const progress = dock.querySelector('[role="progressbar"]');
        const expectedThreshold = stateName === 'level-4' ? '5' : '2';
        if (!dock.getAttribute('aria-labelledby') || progress?.getAttribute('aria-valuemax') !== expectedThreshold) throw new Error('Selected-city dock semantics are incomplete');
        if (dock.querySelectorAll('.city-dock-stat').length !== 6 || dock.textContent?.includes('Territory tiles') || dock.textContent?.includes('Requires') || /\\d+,\\s*\\d+/.test(dock.textContent ?? '')) throw new Error('City dock contains removed clutter');
        if (stateName === 'level-4') {
          if (!dock.textContent?.includes('Level4') || !dock.textContent.includes('Capacity0/4') || !dock.textContent.includes('Founders1')) throw new Error('Scalable level-4 stats are missing');
          if (globalThis.__PULP_WARS_APP__?.controller.snapshot().view?.cities.find((city) => city.id === review.cityId)?.level !== 4) throw new Error('Level-4 fixture was not preserved in PlayerView');
        }
        const disabled = [...dock.querySelectorAll('button:disabled')];
        if (disabled.length !== 0) throw new Error('City dock exposes disabled action clutter');
        if (stateName === 'empty') {
          if (dock.querySelectorAll('.city-dock-command').length !== 0 || dock.querySelectorAll('.city-dock-empty').length !== 1 || !dock.textContent?.includes('No training available.')) throw new Error('Empty city state is not concise');
        } else if (stateName === 'rich-actions') {
          const commands = [...dock.querySelectorAll('.city-dock-command')];
          const training = [...dock.querySelectorAll('.city-train-action')];
          if (commands.length !== 4 || dock.querySelectorAll('.fruit-action, .animal-action, .lumber-action, .mine-action').length !== 0 || training.length !== 4) throw new Error('City dock is not training-only');
          if (!commands.every((command) => command instanceof HTMLButtonElement && (command.getAttribute('aria-label') ?? '').length > 12)) throw new Error('A city action lacks an accessible name');
          if (!training.every((command) => command.childElementCount === 3 && !command.textContent?.includes('Train') && /^(Warrior|Rider|Archer|Defender)★ \\d+$/.test(command.textContent ?? '') && command.querySelector('img.city-command-art') instanceof HTMLImageElement && /^Train /.test(command.getAttribute('aria-label') ?? ''))) throw new Error('Training markup is not exactly art, bare name, and star cost');
          const first = commands[0];
          if (!(first instanceof HTMLButtonElement)) throw new Error('Missing city action');
          first.focus();
          if (document.activeElement !== first) throw new Error('City action cannot receive focus');
        }
        const rect = dock.getBoundingClientRect();
        if (rect.top < 0 || rect.left < 0 || rect.right > innerWidth || rect.bottom > innerHeight) throw new Error('City dock extends outside the visual viewport');
        if (dock.scrollHeight > dock.clientHeight || document.documentElement.scrollHeight > innerHeight) throw new Error('City dock requires scrolling');
        if (['auto', 'scroll'].includes(getComputedStyle(dock).overflowY)) throw new Error('City dock is internally scrollable');
        const requiredControls = [...document.querySelectorAll('.match-camera-actions button, .match-actions .end-turn')];
        if (requiredControls.length !== 3 || requiredControls.some((control) => { const controlRect = control.getBoundingClientRect(); return controlRect.top < 0 || controlRect.bottom > innerHeight || controlRect.left < 0 || controlRect.right > innerWidth; })) throw new Error('City dock displaced camera or End Turn controls outside the visual viewport');
        if (canvas.getBoundingClientRect().height < 180) throw new Error('City dock leaves too little visible map');
      }
      return true;
    })()`,
  );
}

async function reviewMixedResources(connection: Connection): Promise<void> {
  for (const mobile of [false, true]) {
    if (mobile) await mobileViewport(connection);
    else await desktopViewport(connection);
    await evaluate(
      connection,
      `(async () => {
        const [{ bootstrapApp }, engine] = await Promise.all([
          import('/src/app/bootstrap.ts'),
          import('/src/engine/index.ts')
        ]);
        globalThis.__PULP_WARS_APP__?.destroy?.();
      const created = engine.createGame({ rulesetId: engine.RULESET_ID, seed: 1, width: 11, height: 11, aiCount: 1, aiDifficulty: 'NORMAL', humanColor: 'CORAL', aiMode: 'RIVAL' });
        if (!created.ok) throw new Error(created.error.code);
        const human = created.state.players.find((player) => player.controller === 'HUMAN');
        const city = created.state.cities.find((candidate) => candidate.ownerId === human?.id && candidate.isCapital);
        if (!human || !city) throw new Error('Missing resource review city');
        const targets = created.state.board.tiles.filter((tile) => tile.territoryCityId === city.id && tile.site === null).sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
        const fruitAt = targets[0]?.at;
        const oreAt = targets[1]?.at;
        const animalAt = targets[2]?.at;
        const forestAt = targets[3]?.at;
        const occupiedFruitAt = targets[4]?.at;
        const humanUnit = created.state.units.find((unit) => unit.ownerId === human?.id);
        if (!fruitAt || !oreAt || !animalAt || !forestAt || !occupiedFruitAt || !humanUnit) throw new Error('Missing resource review targets');
        const tiles = created.state.board.tiles.map((tile) => {
          if (tile.at.x === fruitAt.x && tile.at.y === fruitAt.y) return { ...tile, terrain: 'GRASS', resource: 'FRUIT', improvement: null };
          if (tile.at.x === oreAt.x && tile.at.y === oreAt.y) return { ...tile, terrain: 'MOUNTAIN', resource: 'ORE', improvement: null };
          if (tile.at.x === animalAt.x && tile.at.y === animalAt.y) return { ...tile, terrain: 'FOREST', resource: 'ANIMAL', improvement: null };
          if (tile.at.x === forestAt.x && tile.at.y === forestAt.y) return { ...tile, terrain: 'FOREST', resource: null, improvement: null };
          if (tile.at.x === occupiedFruitAt.x && tile.at.y === occupiedFruitAt.y) return { ...tile, terrain: 'GRASS', resource: 'FRUIT', improvement: null };
          return tile;
        });
        const prepared = {
          ...created.state,
          board: { ...created.state.board, tiles },
          activeSeatIndex: created.state.turnOrder.indexOf(human.id),
          players: created.state.players.map((player) => player.id === human.id ? { ...player, stars: 20, researchedTechs: ['CLIMBING', 'HUNTING', 'ORGANIZATION', 'MINING', 'FORESTRY'], explored: created.state.board.tiles.filter((tile) => (tile.at.x < 9 && tile.at.y < 9) || tile.territoryCityId === city.id).map((tile) => tile.at) } : player),
          units: created.state.units.filter((unit) => unit.id === humanUnit.id).map((unit) => ({ ...unit, at: occupiedFruitAt }))
        };
        const mined = engine.applyCommand(prepared, { kind: 'BUILD_MINE', at: oreAt });
        if (!mined.ok) throw new Error(mined.error.code);
        const reviewed = mined.state.pendingChoice === null
          ? mined
          : engine.applyCommand(mined.state, { kind: 'CHOOSE_CITY_REWARD', cityId: city.id, reward: 'WORKSHOP' });
        if (!reviewed.ok) throw new Error(reviewed.error.code);
        const root = document.querySelector('#app');
        if (!(root instanceof HTMLElement)) throw new Error('Missing app root');
        root.replaceChildren();
        const app = bootstrapApp(document, { initialRoute: 'MATCH', initialMatch: reviewed.state, storage: null, aiStepDelayMs: 100000, prefersReducedMotion: true });
        Reflect.set(globalThis, '__PULP_WARS_APP__', app);
        const view = app.controller.snapshot().view;
        const territory = view?.board.tiles.filter((tile) => tile.explored && tile.territoryCityId === city.id) ?? [];
        const signature = {
          fruit: territory.filter((tile) => tile.resource === 'FRUIT').length,
          ore: territory.filter((tile) => tile.resource === 'ORE').length,
          animal: territory.filter((tile) => tile.resource === 'ANIMAL').length,
          emptyForest: territory.filter((tile) => tile.terrain === 'FOREST' && tile.resource === null && tile.improvement === null).length,
          mines: territory.filter((tile) => tile.improvement === 'MINE').length,
          fog: view?.board.tiles.filter((tile) => !tile.explored).length ?? 0,
          occupiedFruit: view?.units.some((unit) => unit.at.x === occupiedFruitAt.x && unit.at.y === occupiedFruitAt.y) && territory.some((tile) => tile.at.x === occupiedFruitAt.x && tile.at.y === occupiedFruitAt.y && tile.resource === 'FRUIT')
        };
        if (signature.fruit < 2 || signature.animal < 1 || signature.emptyForest < 1 || signature.mines < 1 || signature.fog < 1 || !signature.occupiedFruit) throw new Error('Wrong resource review signature: ' + JSON.stringify(signature));
        globalThis.__PULP_WARS_RESOURCE_REVIEW__ = signature;
        return true;
      })()`,
      true,
    );
    await waitForExpression(
      connection,
      `(() => { const signature = globalThis.__PULP_WARS_RESOURCE_REVIEW__; const resources = performance.getEntriesByType('resource').map((entry) => entry.name); return document.querySelector('.board-canvas') !== null && signature?.fruit >= 2 && signature?.occupiedFruit === true && signature?.fog > 0 && resources.some((name) => name.endsWith('/assets/pixellab/terrain/fruit.png')); })()`,
    );
    await waitForNoHorizontalOverflow(connection);
    if (mobile) {
      await assertResponsiveTargets(connection);
      await assertTrueMobileDpr2(connection);
    }
    await capture(
      connection,
      mobile ? "resources-v2-mobile-390-dpr2.png" : "resources-v2-desktop.png",
    );
  }
}

async function writeFruitProductionEvidence(): Promise<void> {
  const generated = JSON.parse(
    await readFile("scripts/art/pixellab-generated.json", "utf8"),
  ) as {
    readonly records: Readonly<
      Record<
        string,
        {
          readonly status: string;
          readonly candidate?: string;
          readonly candidateSha256?: string;
          readonly outputSha256?: string;
          readonly notes?: string;
        }
      >
    >;
  };
  const paths = [
    "public/assets/pixellab/terrain/fruit.png",
    "art/pixellab/reviews/fruit-iteration-review.png",
    "art/pixellab/reviews/fruit-repetition-review.png",
    "art/pixellab/reviews/map-review.png",
    "art/integration/reviews/resources-v2-desktop.png",
    "art/integration/reviews/resources-v2-mobile-390-dpr2.png",
  ] as const;
  const evidence = [];
  for (const assetPath of paths) {
    const data = await readFile(assetPath);
    evidence.push({
      path: assetPath,
      sha256: createHash("sha256").update(data).digest("hex"),
      bytes: data.byteLength,
    });
  }
  const attempts = [
    "terrain-fruit-attempt-1",
    "terrain-fruit-attempt-2",
    "terrain-fruit",
  ].map((id) => {
    const record = generated.records[id];
    return {
      id,
      status: record?.status,
      candidate: record?.candidate,
      candidateSha256: record?.candidateSha256,
      outputSha256: record?.outputSha256,
      notes: record?.notes,
    };
  });
  await writeFile(
    "art/feedback/reviews/fruit-production-evidence.json",
    `${JSON.stringify(
      {
        schemaVersion: 1,
        productionRasterStatus: "ACCEPTED_PIXELLAB",
        accepted: 1,
        rejected: 2,
        attempts,
        runtimeFixture: {
          fruitMarkersMinimum: 2,
          occupiedFruitDepthChecked: true,
          exploredFruitAgainstFogChecked: true,
          productionUrlLoaded: "/assets/pixellab/terrain/fruit.png",
        },
        viewports: [
          { width: 1440, height: 1000, devicePixelRatio: 1 },
          { width: 390, height: 844, devicePixelRatio: 2 },
        ],
        evidence,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

async function drivePolicy(
  connection: Connection,
  commandLimit: number,
): Promise<MatchSummary> {
  const expression = `(async () => {
    const [ai, engine] = await Promise.all([
      import('/src/ai/index.ts'),
      import('/src/engine/index.ts')
    ]);
    const app = globalThis.__PULP_WARS_APP__;
    if (!app) throw new Error('Missing browser app handle');
    const startingIndex = app.controller.snapshot().match?.commandIndex ?? 0;
    let iterations = 0;
    let rewardChoices = 0;
    let fastForwardUses = 0;
    let aiProgressChecks = 0;
    while (iterations < ${commandLimit}) {
      const snapshot = app.controller.snapshot();
      if (snapshot.match?.outcome) break;
      const view = snapshot.view;
      if (!view) throw new Error('Missing browser player view');
      const activeId = view.turnOrder[view.activeSeatIndex];
      const active = view.players.find((player) => player.id === activeId);
      if (active?.controller === 'AI') {
        const button = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === 'Fast Forward');
        const progress = document.querySelector('.ai-progress[role="status"]');
        if (!(button instanceof HTMLButtonElement) || progress === null) throw new Error('Missing AI pacing controls');
        aiProgressChecks += 1;
        fastForwardUses += 1;
        app.controller.fastForwardAi();
      } else {
        const decision = ai.chooseNormalCommand(view);
        if (decision.command?.kind === 'CHOOSE_CITY_REWARD') {
          const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
          const choices = document.querySelectorAll('.reward-choice');
          if (dialog === null || choices.length !== 2) throw new Error('Missing blocking reward dialog');
          rewardChoices += 1;
          app.controller.chooseReward(decision.command.cityId, decision.command.reward);
        } else if (!decision.command || !app.controller.dispatch(decision.command)) {
          throw new Error('Browser human-policy command failed: ' + JSON.stringify({ command: decision.command, route: app.controller.snapshot().route, overlay: app.controller.snapshot().overlay }));
        }
        while (app.controller.snapshot().combatPresentation !== null) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      }
      iterations += 1;
      if (iterations % 50 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
      if ((app.controller.snapshot().match?.commandIndex ?? 0) - startingIndex >= ${commandLimit}) break;
    }
    // Freeze a partial-match boundary before hashing and flushing. Without an
    // overlay, a scheduled paced-AI timer can legitimately accept another
    // command between the returned snapshot and Page.reload's beforeunload.
    if (!app.controller.snapshot().match?.outcome) {
      app.controller.openOverlay({ name: 'SETTINGS', from: 'MATCH' });
    }
    app.controller.flushPersistence();
    const snapshot = app.controller.snapshot();
    return {
      commandIndex: snapshot.match?.commandIndex ?? -1,
      stateHash: snapshot.match ? engine.canonicalHash(snapshot.match) : '',
      outcome: snapshot.match?.outcome?.kind ?? null,
      seed: snapshot.match?.setup.seed ?? -1,
      aiCount: snapshot.match?.setup.aiCount ?? -1,
      width: snapshot.match?.setup.width ?? -1,
      rewardChoices,
      fastForwardUses,
      aiProgressChecks
    };
  })()`;
  return evaluate<MatchSummary>(connection, expression, true);
}

interface MatchSummary {
  readonly commandIndex: number;
  readonly stateHash: string;
  readonly outcome: string | null;
  readonly seed: number;
  readonly aiCount: number;
  readonly width: number;
  readonly rewardChoices: number;
  readonly fastForwardUses: number;
  readonly aiProgressChecks: number;
}

interface StartClusterPosition {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

async function startClusterPosition(
  connection: Connection,
): Promise<StartClusterPosition> {
  return evaluate<StartClusterPosition>(
    connection,
    `(() => { const app = globalThis.__PULP_WARS_APP__; if (!app) throw new Error('Missing browser app handle'); const snapshot = app.controller.snapshot(); const capital = snapshot.view?.cities.find((city) => city.ownerId === snapshot.view.viewer.id && city.isCapital); const canvas = document.querySelector('.board-canvas'); if (!capital || !(canvas instanceof HTMLCanvasElement)) throw new Error('Missing human start cluster'); const point = app.view.boardScreenPoint(capital.at); if (!point) throw new Error('Missing board screen point'); const bounds = canvas.getBoundingClientRect(); return { x: point.x, y: point.y, width: bounds.width, height: bounds.height }; })()`,
  );
}

async function matchSummary(connection: Connection): Promise<MatchSummary> {
  return evaluate<MatchSummary>(
    connection,
    `(async () => { const engine = await import('/src/engine/index.ts'); const app = globalThis.__PULP_WARS_APP__; if (!app) throw new Error('Missing browser app handle'); const match = app.controller.snapshot().match; return { commandIndex: match?.commandIndex ?? -1, stateHash: match ? engine.canonicalHash(match) : '', outcome: match?.outcome?.kind ?? null, seed: match?.setup.seed ?? -1, aiCount: match?.setup.aiCount ?? -1, width: match?.setup.width ?? -1, rewardChoices: 0, fastForwardUses: 0, aiProgressChecks: 0 }; })()`,
    true,
  );
}

async function setSeed(connection: Connection, value: number): Promise<void> {
  await evaluate(
    connection,
    `(() => { const input = document.querySelector('#seed-input'); const app = globalThis.__PULP_WARS_APP__; if (!(input instanceof HTMLInputElement) || !app) throw new Error('Missing seed input/app'); input.value = ${JSON.stringify(value.toString(16).padStart(8, "0"))}; input.dispatchEvent(new Event('input', { bubbles: true })); app.controller.updateDraft({ resolvedSeed: ${value} }); return true; })()`,
  );
}

async function startConquest(
  connection: Connection,
  aiCount: 1 | 2 | 3,
  seed: number,
): Promise<void> {
  await clickButton(connection, "New Conquest");
  await clickButton(connection, "Choose Conquest");
  await evaluate(
    connection,
    `(() => { const input = document.querySelector('input[name="ai-count"][value="${aiCount}"]'); if (!(input instanceof HTMLInputElement)) throw new Error('Missing AI count ${aiCount}'); input.click(); return true; })()`,
  );
  await setSeed(connection, seed);
  await clickButton(connection, "Continue");
  await clickButton(connection, "Start Conquest");
  await clickFirstButton(connection, ["Confirm Start", "Replace Save & Start"]);
  await waitForRoute(connection, "match");
  const summary = await matchSummary(connection);
  if (summary.aiCount !== aiCount || summary.seed !== seed) {
    throw new Error(`Started the wrong ${aiCount}-AI browser setup`);
  }
}

function combineSummaries(
  first: MatchSummary,
  second: MatchSummary,
): MatchSummary {
  return {
    ...second,
    rewardChoices: first.rewardChoices + second.rewardChoices,
    fastForwardUses: first.fastForwardUses + second.fastForwardUses,
    aiProgressChecks: first.aiProgressChecks + second.aiProgressChecks,
  };
}

async function desktopViewport(connection: Connection): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
}

async function mobileViewport(connection: Connection): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
}

async function assertKeyboardAndSemantics(
  connection: Connection,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const canvas = document.querySelector('canvas[role="application"]');
      const inspector = document.querySelector('[aria-label="Accessible map inspection"]');
      const polite = document.querySelector('[aria-live="polite"]');
      const assertive = document.querySelector('[aria-live="assertive"]');
      if (!(canvas instanceof HTMLCanvasElement) || !canvas.getAttribute('aria-label') || inspector === null || polite === null || assertive === null) throw new Error('Missing semantic map/live-region contract');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true }));
      const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
      if (!(dialog instanceof HTMLElement) || document.activeElement !== dialog) throw new Error('Keyboard Tech dialog did not own focus');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      const returned = document.querySelector('[data-focus-id="tech"]');
      if (document.querySelector('[data-modal]') !== null || document.activeElement !== returned) throw new Error('Escape did not close and return focus');
      return true;
    })()`,
  );
}

async function assertLoadedAssets(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const broken = [...document.images].filter((image) => !image.complete || image.naturalWidth === 0);
      if (broken.length > 0) throw new Error('Broken runtime images: ' + broken.map((image) => image.src).join(','));
      return true;
    })()`,
  );
}

async function assertResponsiveTargets(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const root = document.documentElement;
      if (root.scrollWidth > root.clientWidth) throw new Error('Horizontal overflow at 390px');
      const undersized = [...document.querySelectorAll('button:not([hidden])')].filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
      });
      if (undersized.length > 0) throw new Error('Undersized visible buttons: ' + undersized.map((button) => button.textContent?.trim()).join(','));
      return true;
    })()`,
  );
}

function assertCentered(start: StartClusterPosition): void {
  if (
    start.x < 32 ||
    start.y < 32 ||
    start.x > start.width - 32 ||
    start.y > start.height - 32 ||
    Math.abs(start.x - start.width / 2) > start.width * 0.3 ||
    Math.abs(start.y - start.height / 2) > start.height * 0.3
  ) {
    throw new Error(
      `Play Again start cluster is not usefully centered: ${JSON.stringify(start)}`,
    );
  }
}

async function clickFirstButton(
  connection: Connection,
  labels: readonly string[],
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const labels = ${JSON.stringify(labels)}; const button = [...document.querySelectorAll('button')].find((item) => labels.includes(item.textContent?.trim() ?? '')); if (!(button instanceof HTMLButtonElement)) throw new Error('Missing one of: ' + labels.join(', ')); button.click(); return true; })()`,
  );
  await delay(50);
}

async function clickButton(
  connection: Connection,
  label: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const button = [...document.querySelectorAll('button')].reverse().find((item) => item.textContent?.trim() === ${JSON.stringify(label)}); if (!(button instanceof HTMLButtonElement)) throw new Error('Missing button: ${label}'); button.click(); return true; })()`,
  );
  await delay(50);
}

async function waitForRoute(
  connection: Connection,
  route: string,
): Promise<void> {
  await waitForExpression(
    connection,
    `document.querySelector('.app-shell')?.dataset.route === ${JSON.stringify(route)}`,
  );
}

async function waitForNoHorizontalOverflow(
  connection: Connection,
): Promise<void> {
  await waitForExpression(
    connection,
    `document.documentElement.scrollWidth <= document.documentElement.clientWidth`,
  );
}

async function capture(connection: Connection, name: string): Promise<void> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  await writeFile(
    path.join(reviewRoot, name),
    Buffer.from(response.data, "base64"),
  );
}

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly close: () => void;
};

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
  if (response.exceptionDetails !== undefined) {
    throw new Error(
      response.exceptionDetails.exception?.description ??
        "Browser evaluation failed",
    );
  }
  return response.result?.value as T;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
): Promise<void> {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const result = await evaluate<boolean>(
      connection,
      `Boolean(${expression})`,
    );
    if (result) return;
    await delay(100);
  }
  throw new Error(`Chrome timed out waiting for: ${expression}`);
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
