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
const selectionOnly = process.argv.includes("--selection-only");
const outputArgument = process.argv.find((argument) =>
  argument.startsWith("--output="),
);
const outputRoot =
  outputArgument === undefined
    ? path.join(process.cwd(), "art/integration/reviews/ruleset7-ui-polish")
    : path.resolve(outputArgument.slice("--output=".length));
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe");
const port = 10_280 + (process.pid % 80);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-v7-ui-polish-${process.pid}`
  : path.join(
      process.env.TMPDIR ?? "/tmp",
      `pulp-wars-v7-ui-polish-${process.pid}`,
    );
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
  await connection.send("Runtime.evaluate", {
    expression: "localStorage.clear()",
  });
  await connection.send("Page.reload");
  await waitFor(
    connection,
    `document.querySelector('[data-v7-setup]') !== null`,
  );
  await viewport(connection, 1024, 768, 1);
  await setValue(connection, "#v7-seed", "20");
  await click(connection, '[data-action="launch"]');
  await waitForHuman(connection);

  if (selectionOnly) {
    await runSelectionReview(connection);
    browser.kill();
    process.exit(0);
  }
  const canvasBefore = await rect(connection, ".board-canvas-v7");
  await key(connection, "Enter", "Enter");
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.textContent?.includes('Assigned units') === true`,
  );
  const cityLayout1024 = await dockEvidence(connection);
  assert(
    Math.abs(cityLayout1024.width - 1024) <= 1 &&
      cityLayout1024.centerOffset < 2,
    `1024 city dock is not viewport-wide: ${JSON.stringify(cityLayout1024)}`,
  );
  assert(
    cityLayout1024.detailsGrouped &&
      cityLayout1024.closeWidth < 140 &&
      !cityLayout1024.identityDetailsOverlap,
    `city facts or Close control are not grouped: ${JSON.stringify(cityLayout1024)}`,
  );
  assertSameRect(canvasBefore, await rect(connection, ".board-canvas-v7"));
  const contours = await contourEvidence(connection);
  assert(
    contours.total > 0 &&
      contours.city > 0 &&
      contours.uniquePhysicalEdges === contours.total &&
      contours.allAnchorsExplored,
    `territory contour contract failed: ${JSON.stringify(contours)}`,
  );
  await capture(connection, "ui-polish-1024-city-contours.png");
  await viewport(connection, 1440, 1000, 1);
  const cityLayout = await dockEvidence(connection);
  await capture(connection, "ui-polish-1440-city-contours.png");
  const syntheticLayout = await evaluate<{
    readonly label: string;
    readonly layout: unknown;
  }>(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); const heading = dock?.querySelector('.v7-identity h2'); const sourceArt = dock?.querySelector('.v7-art-frame'); if (!(dock instanceof HTMLElement) || !(heading instanceof HTMLElement) || !(sourceArt instanceof HTMLImageElement)) throw new Error('Synthetic dock fixture missing'); heading.dataset.originalText = heading.textContent; heading.textContent = 'Capital stronghold with a long public identity'; const actions = document.createElement('div'); actions.className = 'v7-context-actions'; actions.dataset.syntheticLayout = 'true'; for (let index = 0; index < 4; index += 1) { const button = document.createElement('button'); button.type = 'button'; button.className = 'v7-context-action'; button.dataset.syntheticLayout = 'true'; const art = sourceArt.cloneNode(true); const label = document.createElement('span'); label.textContent = ['Recruit defender', 'Grow city', 'Build road', 'Inspect territory'][index]; button.append(art, label); actions.append(button); } dock.dataset.hasActions = 'true'; dock.insertBefore(actions, dock.querySelector('.close-button')); return { label: 'SYNTHETIC_LAYOUT_ONLY_REPRESENTATIVE_CARDS_NOT_LEGAL_COMMANDS', layout: { actionCount: actions.querySelectorAll('button').length, artCount: actions.querySelectorAll('.v7-art-frame').length } }; })()`,
  );
  const multipleActionLayout = await dockEvidence(connection);
  assert(
    Math.abs(multipleActionLayout.width - 1440) <= 1 &&
      multipleActionLayout.actionWidth === 176 &&
      !multipleActionLayout.identityDetailsOverlap,
    `synthetic multiple-action dock overlaps or separates content: ${JSON.stringify(multipleActionLayout)}`,
  );
  await capture(
    connection,
    "ui-polish-1440-city-long-identity-multiple-actions-synthetic.png",
  );
  await evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); const heading = dock?.querySelector('.v7-identity h2'); if (heading?.dataset.originalText) heading.textContent = heading.dataset.originalText; document.querySelectorAll('[data-synthetic-layout="true"]').forEach((node) => node.remove()); if (dock instanceof HTMLElement) dock.dataset.hasActions = 'false'; })()`,
  );
  await viewport(connection, 390, 844, 2);
  const mobileNoActionCity = await dockEvidence(connection);
  assert(
    mobileNoActionCity.width <= 390 &&
      mobileNoActionCity.centerOffset < 2 &&
      (await evaluate<boolean>(
        connection,
        `document.documentElement.scrollWidth <= document.documentElement.clientWidth`,
      )),
    `390 no-action city dock overflowed: ${JSON.stringify(mobileNoActionCity)}`,
  );
  await capture(connection, "ui-polish-390-city-no-action-dock-dpr2.png");
  await viewport(connection, 1440, 1000, 1);

  const locations = await evaluate<{
    readonly capital: Coord;
    readonly action: Coord;
  }>(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); const view = snapshot.view; const capital = view.cities.find((city) => city.ownerId === view.viewer.id && city.isCapital)?.at; const command = snapshot.offeredCommands.find((candidate) => candidate.kind === 'HARVEST_FRUIT'); if (!capital || !command) throw new Error('Natural capital/Harvest fixture missing'); return { capital, action: command.at }; })()`,
  );
  await key(connection, "Escape", "Escape");
  await moveCursor(connection, locations.capital, locations.action);
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('[data-action="command-harvest_fruit"]') !== null`,
  );
  await viewport(connection, 1920, 1080, 1);
  const canvasDesktop = await rect(connection, ".board-canvas-v7");
  const tileLayout = await dockEvidence(connection);
  assert(
    Math.abs(tileLayout.width - 1920) <= 1 &&
      tileLayout.centerOffset < 2 &&
      tileLayout.identityArtWidth === 112 &&
      tileLayout.identityArtHeight === 130 &&
      tileLayout.actionWidth === 176 &&
      !tileLayout.identityDetailsOverlap,
    `1920 tile identity/actions are not a coherent dock: ${JSON.stringify(tileLayout)}`,
  );
  assertSameRect(canvasDesktop, await rect(connection, ".board-canvas-v7"));
  await capture(connection, "ui-polish-1920-tile-action-dock.png");

  await click(connection, '[data-action="tech"]');
  await waitFor(
    connection,
    `document.querySelectorAll('.v7-tech-card').length === 21`,
  );
  const desktopTechAssets = await assertImagesDecoded(
    connection,
    ".v7-tech-card .v7-art-frame",
    21,
  );
  const desktopTech = await techEvidence(connection);
  assert(
    desktopTech.visibleHeadings === 4 &&
      desktopTech.uniqueHeadings === 4 &&
      desktopTech.visibleSelectors === 0 &&
      desktopTech.cardsContained &&
      desktopTech.overlayWidth <= 1440 &&
      desktopTech.closeWidth < 140,
    `desktop technology labels/modal failed: ${JSON.stringify(desktopTech)}`,
  );
  assertSameRect(canvasDesktop, await rect(connection, ".board-canvas-v7"));
  await capture(connection, "ui-polish-1920-tech-modal.png");
  await click(connection, '[data-action="close-overlay"]');
  await click(connection, '[data-action="settings"]');
  const settings = await overlayEvidence(connection);
  assert(
    settings.width <= 736 && settings.closeWidth < 140,
    `desktop Settings is not content bounded: ${JSON.stringify(settings)}`,
  );
  await capture(connection, "ui-polish-1920-settings-dialog.png");
  await click(connection, '[data-action="close-overlay"]');

  await viewport(connection, 390, 844, 2);
  await openCompactAction(connection, "tech");
  await waitFor(
    connection,
    `document.querySelectorAll('.v7-tech-card').length === 21`,
  );
  const mobileBefore = await techEvidence(connection);
  assert(
    mobileBefore.visibleSelectors === 1 && mobileBefore.cardsContained,
    `390 branch navigation is not available: ${JSON.stringify(mobileBefore)}`,
  );
  await selectOption(connection, ".v7-tech-branch-select", 3);
  await waitFor(
    connection,
    `(() => { const select = document.querySelector('.v7-tech-branch-select'); const branch = document.querySelector('[data-tech-branch="INDUSTRY_WARFARE"]'); const heading = branch?.querySelector('h3'); const overlay = document.querySelector('.v7-overlay'); if (document.activeElement !== select || select?.value !== 'INDUSTRY_WARFARE' || !heading || !overlay) return false; const h = heading.getBoundingClientRect(); const s = select.getBoundingClientRect(); const o = overlay.getBoundingClientRect(); const hit = document.elementFromPoint(h.left + h.width / 2, h.top + h.height / 2); return h.top >= s.bottom - 1 && h.bottom <= o.bottom + 1 && (hit === heading || heading.contains(hit)); })()`,
  );
  await assertLayout(connection, "390 mobile branch jump");
  await capture(connection, "ui-polish-390-tech-branch-select-dpr2.png");
  await click(connection, '[data-action="close-overlay"]');

  await viewport(connection, 320, 720, 1);
  await openCompactAction(connection, "settings");
  await selectValue(connection, "#v7-ui-scale", "2");
  await waitFor(
    connection,
    `document.querySelector('.v7-app-shell')?.dataset.uiScale === '2'`,
  );
  await assertLayout(connection, "320 UI scale 200 percent Settings");
  await capture(connection, "ui-polish-320-settings-ui-scale-200.png");
  await click(connection, '[data-action="close-overlay"]');
  const compactMatch = await compactMatchEvidence(connection);
  assert(
    compactMatch.mainMenuReachable &&
      compactMatch.endTurnReachable &&
      compactMatch.mapBand >= 44,
    `320 UI scale 200 percent match controls/map band failed: ${JSON.stringify(compactMatch)}`,
  );
  await assertLayout(connection, "320 UI scale 200 percent match");
  await capture(connection, "ui-polish-320-match-ui-scale-200.png");
  await viewport(connection, 1440, 1000, 1);

  const humanBoundary = await evaluate<number>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
  );
  await click(connection, '[data-action="main-menu"]');
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().phase === 'RESUMABLE'`,
  );
  assert(
    await evaluate<boolean>(
      connection,
      `document.querySelector('[data-action="resume"]') instanceof HTMLButtonElement`,
    ),
    "Main menu did not expose Resume",
  );
  await capture(connection, "ui-polish-1440-main-menu-resume.png");
  await click(connection, '[data-action="resume"]');
  await waitForHuman(connection);
  assert(
    (await evaluate<number>(
      connection,
      `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
    )) === humanBoundary,
    "Human Main menu/Resume changed the accepted boundary",
  );

  const pendingReward = await evaluate<{
    readonly commandIndex: number;
    readonly pending: number;
  }>(
    connection,
    `(async () => { const controller = globalThis.__PULP_WARS_APP__.controller; for (let step = 0; step < 3 && controller.snapshot().view.pendingChoices.length === 0; step += 1) { const command = controller.snapshot().offeredCommands.find((candidate) => candidate.kind === 'HARVEST_FRUIT'); if (!command) break; const result = await controller.dispatch(command); if (!result.accepted) throw new Error('Harvest rejected'); } const view = controller.snapshot().view; return { commandIndex: view.commandIndex, pending: view.pendingChoices.length }; })()`,
  );
  assert(pendingReward.pending === 1, "Natural pending reward was not reached");
  assert(
    await evaluate<boolean>(
      connection,
      `globalThis.__PULP_WARS_APP__.controller.returnToMenu()`,
    ),
    "Pending reward did not return safely to Main menu",
  );
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await click(connection, '[data-action="resume"]');
  await waitFor(
    connection,
    `document.querySelector('[data-mandatory-choice]') !== null`,
  );
  assert(
    (await evaluate<number>(
      connection,
      `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
    )) === pendingReward.commandIndex,
    "Pending reward Resume changed the accepted boundary",
  );
  await click(connection, "[data-mandatory-choice] button:not(:disabled)");
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.pendingChoices.length === 0`,
  );

  const aiBoundary = await evaluate<number>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
  );
  await click(connection, '[data-action="end-turn"]');
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().ai.active === true`,
  );
  await click(connection, '[data-action="main-menu"]');
  await waitFor(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().phase === 'RESUMABLE'`,
  );
  const aiSavedIndex = await evaluate<number>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
  );
  assert(
    aiSavedIndex > aiBoundary,
    "DOM End Turn/AI accepted prefix did not reach Main menu",
  );
  await click(connection, '[data-action="resume"]');
  await waitForHuman(connection);
  await assertLayout(connection, "1440 resumed after AI boundary");

  const evidence = {
    source: "PRODUCTION_CONTROLLER_AND_RENDER_PLAN",
    route: await evaluate<string>(connection, "location.search"),
    cityLayout1024,
    cityLayout,
    syntheticLayout: {
      ...syntheticLayout,
      measured: multipleActionLayout,
    },
    mobileNoActionCity,
    tileLayout,
    contours,
    desktopTech,
    desktopTechAssets,
    settings,
    mobileTech: {
      ...mobileBefore,
      focusedBranch: "INDUSTRY_WARFARE",
    },
    compactMatch,
    boundaries: {
      human: humanBoundary,
      pendingReward: pendingReward.commandIndex,
      aiBeforeMenu: aiBoundary,
      aiSavedPrefix: aiSavedIndex,
    },
    final: await evaluate<unknown>(
      connection,
      `(() => { const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); return { phase: snapshot.phase, commandIndex: snapshot.view.commandIndex, pendingChoices: snapshot.view.pendingChoices.length, aiActive: snapshot.ai.active, viewport: { width: innerWidth, height: innerHeight }, uiScale: document.querySelector('.v7-app-shell')?.dataset.uiScale }; })()`,
    ),
  };
  await writeFile(
    path.join(outputRoot, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(
    `Ruleset-7 UI polish Chrome review passed: ${JSON.stringify(evidence)}. Evidence: ${outputRoot}`,
  );
} finally {
  browser.kill();
}

async function runSelectionReview(connection: Connection): Promise<void> {
  await viewport(connection, 1440, 1000, 1);
  const canvas1440 = await rect(connection, ".board-canvas-v7");
  const movement = await evaluate<{
    readonly capital: Coord;
    readonly unit: Coord;
    readonly unitId: number;
    readonly targetCount: number;
    readonly edgeCount: number;
    readonly uniquePhysicalEdges: number;
  }>(
    connection,
    `(async () => { const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts'); const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); const view = snapshot.view; const owned = view.units.filter((unit) => unit.ownerId === view.viewer.id); const candidate = owned.map((unit) => ({ unit, moves: snapshot.offeredCommands.filter((command) => command.kind === 'MOVE' && command.unitId === unit.id) })).sort((left, right) => right.moves.length - left.moves.length)[0]; const capital = view.cities.find((city) => city.ownerId === view.viewer.id && city.isCapital); if (!candidate || !capital || candidate.moves.length < 2) throw new Error('Natural movement-range fixture missing'); const plan = buildBoardRenderPlanV7(view, snapshot.offeredCommands, { selection: { kind: 'UNIT', unitId: candidate.unit.id }, selectedUnitId: candidate.unit.id, selectedAchievement: null }); const targets = plan.entries.filter((entry) => entry.kind === 'TARGET'); const edgeKey = (entry, edge) => edge === 'NORTH' ? 'h:' + entry.at.x + ':' + entry.at.y : edge === 'SOUTH' ? 'h:' + entry.at.x + ':' + (entry.at.y + 1) : edge === 'WEST' ? 'v:' + entry.at.x + ':' + entry.at.y : 'v:' + (entry.at.x + 1) + ':' + entry.at.y; const edges = targets.flatMap((entry) => (entry.targetEdges || []).map((edge) => edgeKey(entry, edge))); return { capital: capital.at, unit: candidate.unit.at, unitId: candidate.unit.id, targetCount: plan.targets.length, edgeCount: edges.length, uniquePhysicalEdges: new Set(edges).size }; })()`,
  );
  assert(
    movement.targetCount >= 2 &&
      movement.edgeCount > 0 &&
      movement.edgeCount === movement.uniquePhysicalEdges,
    `movement physical-edge contract failed: ${JSON.stringify(movement)}`,
  );
  await moveCursor(connection, movement.capital, movement.unit);
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.dataset.selectionKind === 'unit'`,
  );
  const unitLayout = await selectionDockEvidence(connection);
  assertSelectionDock(unitLayout, 1440, "1440 unit");
  assert(
    unitLayout.height <= 300 && unitLayout.actionsBesideIdentity,
    `1440 unit dock is not compact and horizontal: ${JSON.stringify(unitLayout)}`,
  );
  assertSameRect(canvas1440, await rect(connection, ".board-canvas-v7"));
  await capture(connection, "selection-1440-unit-movement.png");

  const moved = await evaluate<{
    readonly capital: Coord;
    readonly beforeCommandIndex: number;
  }>(
    connection,
    `(async () => { const controller = globalThis.__PULP_WARS_APP__.controller; const before = controller.snapshot(); const capital = before.view.cities.find((city) => city.ownerId === before.view.viewer.id && city.isCapital); const occupant = before.view.units.find((unit) => capital && unit.ownerId === before.view.viewer.id && unit.at.x === capital.at.x && unit.at.y === capital.at.y); const move = occupant && before.offeredCommands.find((command) => command.kind === 'MOVE' && command.unitId === occupant.id); if (!capital || !move) throw new Error('Legal capital-clearing Move missing'); const result = await controller.dispatch(move); if (!result.accepted) throw new Error('Capital-clearing Move rejected'); return { capital: capital.at, beforeCommandIndex: before.view.commandIndex }; })()`,
  );
  await waitFor(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); return !snapshot.transitioning && snapshot.view.commandIndex > ${String(moved.beforeCommandIndex)}; })()`,
  );
  await click(connection, '[data-action="close-dock"]');
  await moveCursor(connection, movement.unit, moved.capital);
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.dataset.selectionKind === 'city' && document.querySelectorAll('.v7-train-action').length >= 1`,
  );
  await viewport(connection, 1920, 1080, 1);
  const canvas1920 = await rect(connection, ".board-canvas-v7");
  const city1920 = await selectionDockEvidence(connection);
  assertSelectionDock(city1920, 1920, "1920 city");
  assert(
    city1920.height <= 300 && city1920.actionsBesideIdentity,
    `1920 city dock is not compact and horizontal: ${JSON.stringify(city1920)}`,
  );
  await capture(connection, "selection-1920-city-actions.png");

  await viewport(connection, 390, 844, 2);
  const crowdedFixture = await evaluate<{
    readonly label: string;
    readonly naturalTrainActions: number;
    readonly syntheticActions: number;
  }>(
    connection,
    `(() => { const actions = document.querySelector('.v7-selection-dock > .v7-context-actions'); const source = actions?.querySelector('.v7-train-action'); if (!(actions instanceof HTMLElement) || !(source instanceof HTMLButtonElement)) throw new Error('Natural Train source missing'); const naturalTrainActions = actions.querySelectorAll('.v7-train-action').length; for (let index = 1; index <= 5; index += 1) { const synthetic = source.cloneNode(true); synthetic.className = 'v7-context-action'; synthetic.dataset.syntheticLayout = 'true'; synthetic.removeAttribute('data-action'); synthetic.setAttribute('aria-label', 'Synthetic overflow card ' + index); for (const child of synthetic.childNodes) if (child.nodeType === Node.TEXT_NODE) child.textContent = 'Synthetic overflow ' + index; synthetic.querySelector('.v7-command-economy')?.remove(); actions.append(synthetic); } return { label: 'SYNTHETIC_CROWDED_LAYOUT_ONLY_REAL_TRAIN_COUNT_REPORTED_SEPARATELY', naturalTrainActions, syntheticActions: 5 }; })()`,
  );
  const canvas390 = await rect(connection, ".board-canvas-v7");
  const city390Before = await selectionDockEvidence(connection);
  assertSelectionDock(city390Before, 390, "390 city");
  assert(
    city390Before.actionCount >= 2 &&
      city390Before.actionScrollWidth > city390Before.actionClientWidth &&
      Math.abs(
        city390Before.actionClientWidth - city390Before.dockInnerWidth,
      ) <= 1 &&
      city390Before.actionRowVisible,
    `390 natural Train row is not visibly scrollable: ${JSON.stringify(city390Before)}`,
  );
  const tabReach = await focusLastActionWithTab(connection);
  assert(
    tabReach.focusedLast && tabReach.lastVisible && tabReach.scrollLeft > 0,
    `Tab did not reveal the last action: ${JSON.stringify(tabReach)}`,
  );
  const wheelReach = await wheelActionRow(connection);
  assert(
    wheelReach.defaultPrevented && wheelReach.scrollLeft > 0,
    `pointer wheel did not scroll the action row: ${JSON.stringify(wheelReach)}`,
  );
  const touchReach = await swipeActionRow(connection);
  assert(
    touchReach.scrollLeft > 0,
    `touch swipe did not scroll the action row: ${JSON.stringify(touchReach)}`,
  );
  assertSameRect(canvas390, await rect(connection, ".board-canvas-v7"));
  await capture(connection, "selection-390-city-actions-dpr2.png");
  const trainBoundary = await evaluate<{
    readonly commandIndex: number;
    readonly unitCount: number;
    readonly action: string;
  }>(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); const action = document.querySelector('.v7-train-action'); if (!(action instanceof HTMLButtonElement) || action.disabled) throw new Error('Legal Train button missing'); return { commandIndex: snapshot.view.commandIndex, unitCount: snapshot.view.units.length, action: action.getAttribute('aria-label') || action.textContent || '' }; })()`,
  );
  await click(connection, ".v7-train-action");
  await waitFor(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); return snapshot.view.commandIndex === ${String(trainBoundary.commandIndex + 1)} && snapshot.view.units.length === ${String(trainBoundary.unitCount + 1)}; })()`,
  );

  const tileTarget = await evaluate<{
    readonly from: Coord;
    readonly at: Coord;
    readonly kind: string;
  }>(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); const city = snapshot.view.cities.find((candidate) => candidate.ownerId === snapshot.view.viewer.id && candidate.isCapital); const command = snapshot.offeredCommands.find((candidate) => 'at' in candidate && candidate.kind !== 'BUILD_MONUMENT'); if (!city || !command || !('at' in command)) throw new Error('Natural actionable tile missing'); return { from: city.at, at: command.at, kind: command.kind }; })()`,
  );
  await click(connection, '[data-action="close-dock"]');
  await moveCursor(connection, tileTarget.from, tileTarget.at);
  await key(connection, "Enter", "Enter");
  await waitFor(
    connection,
    `document.querySelector('.v7-selection-dock')?.dataset.selectionKind === 'tile' && document.querySelector('.v7-context-actions button') !== null`,
  );
  await viewport(connection, 320, 720, 1);
  await openCompactAction(connection, "settings");
  await selectValue(connection, "#v7-ui-scale", "2");
  await waitFor(
    connection,
    `document.querySelector('.v7-app-shell')?.dataset.uiScale === '2'`,
  );
  await click(connection, '[data-action="close-overlay"]');
  const canvas320 = await rect(connection, ".board-canvas-v7");
  const tile320 = await selectionDockEvidence(connection);
  assertSelectionDock(tile320, 320, "320 tile at 200% UI scale");
  assert(
    tile320.actionRowVisible &&
      Math.abs(tile320.actionClientWidth - tile320.dockInnerWidth) <= 1 &&
      tile320.dockTop >= tile320.hudBottom - 1 &&
      tile320.endTurnReachable,
    `320 action/HUD geometry failed: ${JSON.stringify(tile320)}`,
  );
  await capture(connection, "selection-320-tile-ui-scale-200.png");

  const evidence = {
    source: "PRODUCTION_SELECTION_UI_FOCUSED_REVIEW",
    movement,
    unitLayout,
    city1920,
    city390: {
      crowdedFixture,
      layout: city390Before,
      tabReach,
      wheelReach,
      touchReach,
    },
    legalTrainDispatch: trainBoundary.action,
    tile320: { command: tileTarget.kind, layout: tile320 },
    canvas: { canvas1440, canvas1920, canvas390, canvas320 },
  };
  await writeFile(
    path.join(outputRoot, "selection-evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(
    `Ruleset-7 focused selection review passed: ${JSON.stringify(evidence)}. Evidence: ${outputRoot}`,
  );
}

async function compactMatchEvidence(connection: Connection): Promise<{
  readonly mainMenuReachable: boolean;
  readonly endTurnReachable: boolean;
  readonly mapBand: number;
  readonly hudBottom: number;
  readonly dockTop: number;
  readonly boardTop: number;
  readonly boardBottom: number;
}> {
  return evaluate(
    connection,
    `(() => { const reachable = (selector) => { const node = document.querySelector(selector); if (!(node instanceof HTMLButtonElement)) return false; const rect = node.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight; }; const hud = document.querySelector('.v7-match-hud')?.getBoundingClientRect(); const dock = document.querySelector('.v7-selection-dock')?.getBoundingClientRect(); const board = document.querySelector('.v7-board-host')?.getBoundingClientRect(); return { mainMenuReachable: reachable('[data-action="main-menu"]'), endTurnReachable: reachable('[data-action="end-turn"]'), mapBand: hud && dock && board ? Math.max(0, Math.min(dock.top, board.bottom) - Math.max(hud.bottom, board.top)) : 0, hudBottom: hud?.bottom ?? 0, dockTop: dock?.top ?? 0, boardTop: board?.top ?? 0, boardBottom: board?.bottom ?? 0 }; })()`,
  );
}

async function contourEvidence(connection: Connection): Promise<{
  readonly total: number;
  readonly owner: number;
  readonly city: number;
  readonly potential: number;
  readonly uniquePhysicalEdges: number;
  readonly allAnchorsExplored: boolean;
}> {
  return evaluate(
    connection,
    `(async () => { const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts'); const snapshot = globalThis.__PULP_WARS_APP__.controller.snapshot(); const view = snapshot.view; const city = view.cities.find((candidate) => candidate.ownerId === view.viewer.id && candidate.isCapital); const plan = buildBoardRenderPlanV7(view, snapshot.offeredCommands, { selection: { kind: 'CITY', cityId: city.id }, selectedUnitId: null, selectedAchievement: null }); const boundaries = plan.entries.filter((entry) => entry.kind === 'TERRITORY_BOUNDARY'); const edgeKey = (entry) => entry.edge === 'NORTH' ? 'h:' + entry.at.x + ':' + entry.at.y : entry.edge === 'SOUTH' ? 'h:' + entry.at.x + ':' + (entry.at.y + 1) : entry.edge === 'WEST' ? 'v:' + entry.at.x + ':' + entry.at.y : 'v:' + (entry.at.x + 1) + ':' + entry.at.y; const explored = new Set(view.board.tiles.filter((tile) => tile.explored).map((tile) => tile.at.x + ',' + tile.at.y)); return { total: boundaries.length, owner: boundaries.filter((entry) => entry.boundaryStyle === 'OWNER').length, city: boundaries.filter((entry) => entry.boundaryStyle === 'CITY').length, potential: boundaries.filter((entry) => entry.boundaryStyle === 'POTENTIAL').length, uniquePhysicalEdges: new Set(boundaries.map(edgeKey)).size, allAnchorsExplored: boundaries.every((entry) => explored.has(entry.at.x + ',' + entry.at.y)) }; })()`,
  );
}

async function dockEvidence(connection: Connection): Promise<{
  readonly width: number;
  readonly centerOffset: number;
  readonly detailsGrouped: boolean;
  readonly closeWidth: number;
  readonly identityArtWidth: number;
  readonly identityArtHeight: number;
  readonly actionWidth: number;
  readonly identityToActions: number;
  readonly summaryToActions: number;
  readonly identityDetailsOverlap: boolean;
}> {
  return evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); const summary = dock?.querySelector('.v7-selection-summary'); const identity = dock?.querySelector('.v7-identity'); const art = dock?.querySelector('.v7-art-frame'); const details = dock?.querySelector('.v7-selection-details'); const actions = dock?.querySelector('.v7-context-actions'); const action = actions?.querySelector('button'); const close = dock?.querySelector('.close-button'); if (!(dock instanceof HTMLElement) || !(identity instanceof HTMLElement) || !(close instanceof HTMLElement)) throw new Error('Dock evidence missing'); const d = dock.getBoundingClientRect(); const s = summary?.getBoundingClientRect(); const i = identity.getBoundingClientRect(); const detailRect = details?.getBoundingClientRect(); const a = art?.getBoundingClientRect(); const group = actions?.getBoundingClientRect(); const button = action?.getBoundingClientRect(); return { width: d.width, centerOffset: Math.abs(d.left + d.width / 2 - innerWidth / 2), detailsGrouped: details instanceof HTMLElement && [...details.children].every((child) => child.tagName === 'P' || child.classList.contains('v7-tactical-status') || child.classList.contains('v7-context-actions')), closeWidth: close.getBoundingClientRect().width, identityArtWidth: a?.width ?? 0, identityArtHeight: a?.height ?? 0, actionWidth: button?.width ?? 0, identityToActions: group ? group.left - i.right : 0, summaryToActions: group && s ? group.left - s.right : 0, identityDetailsOverlap: Boolean(detailRect && detailRect.top < i.bottom - 1) }; })()`,
  );
}

interface SelectionDockEvidence {
  readonly width: number;
  readonly height: number;
  readonly left: number;
  readonly right: number;
  readonly dockTop: number;
  readonly dockInnerWidth: number;
  readonly hudBottom: number;
  readonly endTurnReachable: boolean;
  readonly closeReachable: boolean;
  readonly identityCloseOverlap: boolean;
  readonly actionsBesideIdentity: boolean;
  readonly identityArtWidth: number;
  readonly identityArtHeight: number;
  readonly actionCount: number;
  readonly actionWidth: number;
  readonly actionClientWidth: number;
  readonly actionScrollWidth: number;
  readonly actionClientHeight: number;
  readonly actionScrollHeight: number;
  readonly actionTopDelta: number;
  readonly actionRowVisible: boolean;
  readonly flexWrap: string;
  readonly overflowX: string;
  readonly overflowY: string;
  readonly touchAction: string;
  readonly pageClientWidth: number;
  readonly pageScrollWidth: number;
}

async function selectionDockEvidence(
  connection: Connection,
): Promise<SelectionDockEvidence> {
  return evaluate(
    connection,
    `(() => { const dock = document.querySelector('.v7-selection-dock'); const actions = dock?.querySelector(':scope > .v7-context-actions'); const close = dock?.querySelector(':scope > .close-button'); const identity = dock?.querySelector('.v7-identity'); const art = identity?.querySelector('.v7-art-frame'); const hud = document.querySelector('.v7-match-hud'); const endTurn = document.querySelector('[data-action="end-turn"]'); if (!(dock instanceof HTMLElement) || !(actions instanceof HTMLElement) || !(close instanceof HTMLElement) || !(identity instanceof HTMLElement) || !(art instanceof HTMLElement) || !(hud instanceof HTMLElement) || !(endTurn instanceof HTMLElement)) throw new Error('Selection dock evidence missing'); const d = dock.getBoundingClientRect(); const group = actions.getBoundingClientRect(); const closeRect = close.getBoundingClientRect(); const identityRect = identity.getBoundingClientRect(); const artRect = art.getBoundingClientRect(); const hudRect = hud.getBoundingClientRect(); const endTurnRect = endTurn.getBoundingClientRect(); const buttons = [...actions.querySelectorAll('button')]; const buttonRects = buttons.map((button) => button.getBoundingClientRect()); const style = getComputedStyle(actions); const dockStyle = getComputedStyle(dock); const overlaps = (left, right) => left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top; return { width: d.width, height: d.height, left: d.left, right: d.right, dockTop: d.top, dockInnerWidth: d.width - parseFloat(dockStyle.paddingLeft) - parseFloat(dockStyle.paddingRight), hudBottom: hudRect.bottom, endTurnReachable: endTurnRect.width >= 44 && endTurnRect.height >= 44 && endTurnRect.left >= 0 && endTurnRect.right <= innerWidth && endTurnRect.top >= 0 && endTurnRect.bottom <= innerHeight && !overlaps(endTurnRect, d), closeReachable: closeRect.width >= 44 && closeRect.height >= 44 && closeRect.left >= 0 && closeRect.right <= innerWidth && closeRect.top >= 0 && closeRect.bottom <= innerHeight, identityCloseOverlap: overlaps(identityRect, closeRect), actionsBesideIdentity: group.top < identityRect.bottom && group.bottom > identityRect.top, identityArtWidth: artRect.width, identityArtHeight: artRect.height, actionCount: buttons.length, actionWidth: buttonRects[0]?.width || 0, actionClientWidth: actions.clientWidth, actionScrollWidth: actions.scrollWidth, actionClientHeight: actions.clientHeight, actionScrollHeight: actions.scrollHeight, actionTopDelta: buttonRects.length === 0 ? 0 : Math.max(...buttonRects.map((rect) => Math.abs(rect.top - buttonRects[0].top))), actionRowVisible: group.width > 0 && group.height > 0 && group.top >= 0 && group.bottom <= innerHeight, flexWrap: style.flexWrap, overflowX: style.overflowX, overflowY: style.overflowY, touchAction: style.touchAction, pageClientWidth: document.documentElement.clientWidth, pageScrollWidth: document.documentElement.scrollWidth }; })()`,
  );
}

function assertSelectionDock(
  evidence: SelectionDockEvidence,
  viewportWidth: number,
  label: string,
): void {
  assert(
    Math.abs(evidence.width - viewportWidth) <= 1 &&
      Math.abs(evidence.left) <= 1 &&
      Math.abs(evidence.right - viewportWidth) <= 1 &&
      evidence.closeReachable &&
      !evidence.identityCloseOverlap &&
      evidence.identityArtWidth === 112 &&
      evidence.identityArtHeight === 130 &&
      evidence.actionCount > 0 &&
      evidence.actionWidth === 176 &&
      evidence.actionTopDelta <= 1 &&
      evidence.actionScrollHeight <= evidence.actionClientHeight + 1 &&
      evidence.actionRowVisible &&
      evidence.flexWrap === "nowrap" &&
      (evidence.overflowX === "auto" || evidence.overflowX === "scroll") &&
      evidence.overflowY === "hidden" &&
      evidence.touchAction === "pan-x" &&
      evidence.pageScrollWidth <= evidence.pageClientWidth,
    `${label} selection dock failed: ${JSON.stringify(evidence)}`,
  );
}

async function focusLastActionWithTab(connection: Connection): Promise<{
  readonly focusedLast: boolean;
  readonly lastVisible: boolean;
  readonly scrollLeft: number;
}> {
  const count = await evaluate<number>(
    connection,
    `(() => { const actions = document.querySelector('.v7-selection-dock > .v7-context-actions'); const buttons = [...(actions?.querySelectorAll('button') || [])]; if (!(actions instanceof HTMLElement) || buttons.length < 2 || !(buttons[0] instanceof HTMLButtonElement)) throw new Error('Crowded action row missing'); actions.scrollLeft = 0; buttons[0].focus(); return buttons.length; })()`,
  );
  for (let index = 1; index < count; index += 1)
    await key(connection, "Tab", "Tab");
  return evaluate(
    connection,
    `(() => { const actions = document.querySelector('.v7-selection-dock > .v7-context-actions'); const buttons = [...(actions?.querySelectorAll('button') || [])]; const last = buttons.at(-1); if (!(actions instanceof HTMLElement) || !(last instanceof HTMLButtonElement)) throw new Error('Last action missing'); const a = actions.getBoundingClientRect(); const b = last.getBoundingClientRect(); return { focusedLast: document.activeElement === last, lastVisible: b.left >= a.left - 1 && b.right <= a.right + 1, scrollLeft: actions.scrollLeft }; })()`,
  );
}

async function wheelActionRow(connection: Connection): Promise<{
  readonly defaultPrevented: boolean;
  readonly scrollLeft: number;
}> {
  return evaluate(
    connection,
    `(() => { const actions = document.querySelector('.v7-selection-dock > .v7-context-actions'); if (!(actions instanceof HTMLElement)) throw new Error('Action row missing'); actions.scrollLeft = 0; const event = new WheelEvent('wheel', { deltaY: 160, bubbles: true, cancelable: true }); actions.dispatchEvent(event); return { defaultPrevented: event.defaultPrevented, scrollLeft: actions.scrollLeft }; })()`,
  );
}

async function swipeActionRow(connection: Connection): Promise<{
  readonly scrollLeft: number;
}> {
  const points = await evaluate<{
    readonly start: { readonly x: number; readonly y: number };
    readonly middle: { readonly x: number; readonly y: number };
    readonly end: { readonly x: number; readonly y: number };
  }>(
    connection,
    `(() => { const actions = document.querySelector('.v7-selection-dock > .v7-context-actions'); if (!(actions instanceof HTMLElement)) throw new Error('Action row missing'); actions.scrollLeft = 0; const rect = actions.getBoundingClientRect(); const y = rect.top + Math.min(rect.height / 2, 80); return { start: { x: rect.right - 24, y }, middle: { x: rect.left + rect.width / 2, y }, end: { x: rect.left + 24, y } }; })()`,
  );
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [points.start],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [points.middle],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [points.end],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await delay(120);
  return evaluate(
    connection,
    `(() => { const actions = document.querySelector('.v7-selection-dock > .v7-context-actions'); if (!(actions instanceof HTMLElement)) throw new Error('Action row missing'); return { scrollLeft: actions.scrollLeft }; })()`,
  );
}

async function techEvidence(connection: Connection): Promise<{
  readonly visibleHeadings: number;
  readonly uniqueHeadings: number;
  readonly visibleSelectors: number;
  readonly cardsContained: boolean;
  readonly overlayWidth: number;
  readonly closeWidth: number;
}> {
  return evaluate(
    connection,
    `(() => { const visible = (node) => { const rect = node.getBoundingClientRect(); return getComputedStyle(node).display !== 'none' && rect.width > 0 && rect.height > 0; }; const headings = [...document.querySelectorAll('.v7-tech-branch > h3')].filter(visible); const selectors = [...document.querySelectorAll('.v7-tech-branch-select')].filter(visible); const overlay = document.querySelector('.v7-overlay'); const close = document.querySelector('[data-action="close-overlay"]'); const cards = [...document.querySelectorAll('.v7-tech-card')]; const cardsContained = cards.every((card) => { const bounds = card.getBoundingClientRect(); const art = card.querySelector('.v7-art-frame')?.getBoundingClientRect(); const label = card.querySelector('span:not(.v7-tech-cost):not(.v7-tech-check)')?.getBoundingClientRect(); return art && label && art.width === 112 && art.height === 130 && art.left >= bounds.left - 1 && art.right <= bounds.right + 1 && label.left >= bounds.left - 1 && label.right <= bounds.right + 1; }); return { visibleHeadings: headings.length, uniqueHeadings: new Set(headings.map((node) => node.textContent)).size, visibleSelectors: selectors.length, cardsContained, overlayWidth: overlay.getBoundingClientRect().width, closeWidth: close.getBoundingClientRect().width }; })()`,
  );
}

async function overlayEvidence(connection: Connection): Promise<{
  readonly width: number;
  readonly closeWidth: number;
}> {
  return evaluate(
    connection,
    `(() => { const overlay = document.querySelector('.v7-overlay'); const close = document.querySelector('[data-action="close-overlay"]'); return { width: overlay.getBoundingClientRect().width, closeWidth: close.getBoundingClientRect().width }; })()`,
  );
}

async function assertLayout(
  connection: Connection,
  label: string,
): Promise<void> {
  const result = await evaluate<{
    readonly clientWidth: number;
    readonly scrollWidth: number;
    readonly minimumTargetWidth: number;
    readonly minimumTargetHeight: number;
    readonly clipped: readonly string[];
  }>(
    connection,
    `(() => { const targets = [...document.querySelectorAll('button:not(:disabled), input, select')].filter((node) => node.getBoundingClientRect().width > 0); const containers = [...document.querySelectorAll('.v7-overlay, .v7-selection-dock, .v7-tech-graph, .v7-tech-screen')].filter((node) => node.getBoundingClientRect().width > 0); return { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, minimumTargetWidth: Math.min(...targets.map((node) => node.getBoundingClientRect().width)), minimumTargetHeight: Math.min(...targets.map((node) => node.getBoundingClientRect().height)), clipped: containers.filter((node) => node.scrollWidth > node.clientWidth + 1).map((node) => node.className) }; })()`,
  );
  assert(
    result.scrollWidth <= result.clientWidth &&
      result.minimumTargetWidth >= 44 &&
      result.minimumTargetHeight >= 44 &&
      result.clipped.length === 0,
    `${label} layout failed: ${JSON.stringify(result)}`,
  );
}

async function waitForHuman(connection: Connection): Promise<void> {
  await waitFor(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const view = snapshot?.view; return snapshot?.phase === 'ACTIVE' && !snapshot.ai.active && view?.turnOrder[view.activeSeatIndex] === view?.humanPlayerId; })()`,
  );
}

async function openCompactAction(
  connection: Connection,
  action: string,
): Promise<void> {
  const visible = await evaluate<boolean>(
    connection,
    `(() => { const node = document.querySelector('[data-action="${action}"]'); return node instanceof HTMLElement && node.getBoundingClientRect().width > 0; })()`,
  );
  if (!visible) await click(connection, '[data-action="compact-menu"]');
  await click(connection, `[data-action="${action}"]`);
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
    mobile: width <= 390,
  });
  await delay(120);
}

async function rect(
  connection: Connection,
  selector: string,
): Promise<{ readonly width: number; readonly height: number }> {
  return evaluate(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); const rect = node.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })()`,
  );
}

function assertSameRect(
  expected: { readonly width: number; readonly height: number },
  actual: { readonly width: number; readonly height: number },
): void {
  assert(
    expected.width === actual.width && expected.height === actual.height,
    `Canvas geometry changed: ${JSON.stringify({ expected, actual })}`,
  );
}

async function moveCursor(
  connection: Connection,
  from: Coord,
  to: Coord,
): Promise<void> {
  for (let index = 0; index < Math.abs(to.x - from.x); index += 1)
    await key(
      connection,
      to.x < from.x ? "ArrowLeft" : "ArrowRight",
      to.x < from.x ? "ArrowLeft" : "ArrowRight",
    );
  for (let index = 0; index < Math.abs(to.y - from.y); index += 1)
    await key(
      connection,
      to.y < from.y ? "ArrowUp" : "ArrowDown",
      to.y < from.y ? "ArrowUp" : "ArrowDown",
    );
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

async function selectValue(
  connection: Connection,
  selector: string,
  value: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLSelectElement)) throw new Error('Select missing'); node.value = ${JSON.stringify(value)}; node.dispatchEvent(new Event('change', { bubbles: true })); })()`,
  );
}

async function selectOption(
  connection: Connection,
  selector: string,
  downCount: number,
): Promise<void> {
  await click(connection, selector);
  await key(connection, "Home", "Home");
  for (let index = 0; index < downCount; index += 1)
    await key(connection, "ArrowDown", "ArrowDown");
  await key(connection, "Enter", "Enter");
}

async function click(connection: Connection, selector: string): Promise<void> {
  const point = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!(node instanceof HTMLElement)) throw new Error('Missing ${selector}'); node.scrollIntoView({ block: 'center', inline: 'center' }); const rect = node.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`,
  );
  await connection.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1,
  });
  await connection.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1,
  });
}

async function key(
  connection: Connection,
  keyValue: string,
  code: string,
): Promise<void> {
  const keyCode: Readonly<Record<string, number>> = {
    Tab: 9,
    Enter: 13,
    Escape: 27,
    ArrowLeft: 37,
    ArrowUp: 38,
    ArrowRight: 39,
    ArrowDown: 40,
    Home: 36,
  };
  const windowsVirtualKeyCode = keyCode[code];
  if (windowsVirtualKeyCode === undefined)
    throw new Error(`Unknown key ${code}`);
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: keyValue,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    windowsVirtualKeyCode,
    nativeVirtualKeyCode: windowsVirtualKeyCode,
  });
}

async function capture(connection: Connection, name: string): Promise<void> {
  await assertImagesDecoded(connection, "img", 0, true);
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

async function assertImagesDecoded(
  connection: Connection,
  selector: string,
  expectedCount: number,
  visibleOnly = false,
): Promise<{
  readonly count: number;
  readonly assetIds: readonly string[];
}> {
  const result = await evaluate<{
    readonly count: number;
    readonly assetIds: readonly string[];
    readonly broken: readonly string[];
  }>(
    connection,
    `(async () => { const intersectsViewport = (image) => { const rect = image.getBoundingClientRect(); const style = getComputedStyle(image); return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.bottom > 0 && rect.left < innerWidth && rect.top < innerHeight; }; const images = [...document.querySelectorAll(${JSON.stringify(selector)})].filter((node) => node instanceof HTMLImageElement && (${String(visibleOnly)} ? intersectsViewport(node) : true)); await Promise.all(images.map(async (image) => { try { await image.decode(); } catch { /* Report exact broken state below. */ } })); const broken = images.filter((image) => !image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0 || !image.currentSrc).map((image) => image.dataset.assetId ?? image.getAttribute('src') ?? '(missing source)'); return { count: images.length, assetIds: images.map((image) => image.dataset.assetId ?? '(unlabelled image)'), broken }; })()`,
  );
  if (
    (expectedCount > 0 && result.count !== expectedCount) ||
    result.broken.length > 0
  )
    throw new Error(
      `Image decode contract failed for ${selector}: ${JSON.stringify(result)}`,
    );
  return { count: result.count, assetIds: result.assetIds };
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
  for (let attempt = 0; attempt < 300; attempt += 1) {
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
        const target = targets.find(
          (candidate) =>
            candidate.type === "page" && candidate.url.startsWith(expectedUrl),
        );
        if (target !== undefined) return target;
      }
    } catch {
      // Chrome may not have opened its debugging port yet.
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
      const id = nextId;
      nextId += 1;
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
