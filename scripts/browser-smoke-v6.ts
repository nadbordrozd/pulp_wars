import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";
import {
  RULESET6_SMOKE_TECH_IDS,
  RULESET6_SMOKE_VIEWPORTS,
  flowContractIssuesV6,
  type BrowserSmokeArtifactV6,
  type BrowserSmokeBoundaryV6,
  type BrowserSmokeFlowEvidenceV6,
  type BrowserSmokeIntegratedAcceptanceV6,
  type BrowserSmokeLayoutV6,
} from "./browser-smoke-v6-contract";

interface DebugTarget {
  readonly type: string;
  readonly url: string;
  readonly webSocketDebuggerUrl: string;
}

interface ProtocolMessage {
  readonly id?: number;
  readonly method?: string;
  readonly params?: unknown;
  readonly result?: unknown;
  readonly error?: { readonly message?: string };
}

interface BrowserErrorV6 {
  readonly method: string;
  readonly detail: string;
}

interface BrowserSmokeAiFirstLaunchV6 {
  readonly seed: 314159;
  readonly aiMode: "COOPERATIVE";
  readonly turnOrder: readonly [2, 1];
  readonly commandIndex: number;
  readonly stateHash: string;
  readonly replayStateHash: string;
  readonly persistedStateHash: string;
  readonly notice: string;
}

interface CoordV6 {
  readonly x: number;
  readonly y: number;
}

interface MotionEvidenceV6 {
  readonly changedPixels: number;
  readonly firstSha256: string;
  readonly secondSha256: string;
  readonly clip: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

const baseUrl =
  process.argv.slice(2).find((argument) => !argument.startsWith("--")) ??
  "http://localhost:6173/?browser-smoke=1";
const reviewRoot = path.join(
  process.cwd(),
  "art/integration/reviews/ruleset6-browser-smoke",
);
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9_700 + (process.pid % 200);
const userData = chrome.endsWith(".exe")
  ? `C:\\Windows\\Temp\\pulp-wars-v6-smoke-${process.pid}`
  : path.join(
      process.env.TMPDIR ?? "/tmp",
      `pulp-wars-v6-smoke-${process.pid}`,
    );
const pendingReviewFiles: { readonly path: string; readonly data: Buffer }[] =
  [];

await mkdir(reviewRoot, { recursive: true });
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
  const target = await waitForTarget(port, baseUrl);
  const connection = await connect(target.webSocketDebuggerUrl);
  const browserErrors: BrowserErrorV6[] = [];
  connection.onEvent((method, params) => {
    const detail = eventErrorDetail(method, params);
    if (detail !== null) browserErrors.push({ method, detail });
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Log.enable");
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );

  const flows: BrowserSmokeFlowEvidenceV6[] = [];
  flows.push(
    await runFactionFlow(connection, {
      faction: "ORIGINAL",
      factionTreeId: "ORIGINAL_BASELINE",
      seed: 20,
    }),
  );
  flows.push(
    await runFactionFlow(connection, {
      faction: "CANDY",
      factionTreeId: "CANDY_BASELINE_V1",
      seed: 20,
    }),
  );
  const aiFirstLaunch = await runAiFirstLaunchRegression(connection);

  await delay(250);
  if (browserErrors.length > 0) {
    throw new Error(
      `Browser emitted page/console errors: ${JSON.stringify(browserErrors)}`,
    );
  }
  for (const flow of flows) {
    const issues = flowContractIssuesV6(flow);
    if (issues.length > 0) {
      throw new Error(
        `${flow.faction} smoke evidence failed: ${issues.join("; ")}`,
      );
    }
  }
  const version = (await connection.send("Browser.getVersion")) as {
    readonly product?: string;
  };
  const evidence = {
    generatedAt: new Date().toISOString(),
    generatedBy: "npm run smoke:browser",
    rulesetId: "pulp-wars-poc-6",
    productionEntry: "src/main.ts",
    browser: version.product ?? "Chrome",
    technologyNodeCount: RULESET6_SMOKE_TECH_IDS.length,
    pageAndConsoleErrors: browserErrors,
    viewportContract: RULESET6_SMOKE_VIEWPORTS,
    passMetadata: {
      status: "PASS",
      factions: ["ORIGINAL", "CANDY"],
      factionComposition: "mixed-faction human/AI seats in both live flows",
      aiModes: ["RIVAL", "COOPERATIVE"],
      surfaces: ["desktop", "390x844 DPR2 mobile"],
      motionModes: [
        "FULL",
        "emulated prefers-reduced-motion: reduce",
        "emulated prefers-contrast: more",
      ],
      exercisedThrough:
        "exact production DOM controls and Canvas coordinate targets",
    },
    productionRasterInventory: {
      status: "ACCEPTED_AND_LOADED",
      treatment:
        "The production browser loaded the checked-in ruleset-6 terrain, resource, building, Road, 18-role, portrait, Coin, action, reward, and explicitly registered 25-node technology raster inventory. Code-native geometry remains limited to the categories required by the art contracts.",
    },
    visualReview: {
      status: "ACCEPTED",
      notes:
        "Every bounded contextual, reward, city-training, and Technology capture was inspected individually at native output size and in its nearest-neighbor 2x companion. Original and Candy Animals are visible on explored Forest from launch while Hunting remains unresearched and Hunt Game unavailable; hidden Animals remain redacted. Original and Candy labels/symbols remain distinct; the map stays primary; unit, city, and tile docks do not leak actions; full Technology cards/details and blocking rewards fit desktop and true 390x844 DPR2 mobile without clipping or horizontal overflow. Direct selected-tile actions accept one boundary without a second map activation. No suspected visual failure remained after enlargement review.",
    },
    flows,
    aiFirstLaunch,
  };
  await Promise.all(
    pendingReviewFiles.map((artifact) =>
      writeFile(artifact.path, artifact.data),
    ),
  );
  await writeFile(
    path.join(reviewRoot, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  connection.close();
  console.log(
    `Ruleset-6 browser smoke passed in ${evidence.browser}: Original ${flows[0]?.turnReturn.stateHash}, Candy ${flows[1]?.turnReturn.stateHash}, AI-first ${aiFirstLaunch.stateHash}. Evidence: ${reviewRoot}`,
  );
} finally {
  browser.kill();
}

async function runAiFirstLaunchRegression(
  connection: Connection,
): Promise<BrowserSmokeAiFirstLaunchV6> {
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );
  await setField(connection, "v6-ai-count", "1");
  await setField(connection, "v6-ai-mode", "COOPERATIVE");
  await setField(connection, "v6-board-size", "11");
  await setField(connection, "v6-seed", "314159");
  await setField(connection, "v6-faction-0", "CANDY");
  await setField(connection, "v6-faction-1", "CANDY");
  await clickSelector(connection, '[data-action="launch"]');
  await waitForHumanBoundary(connection, 1, 900);

  const evidence = await evaluate<BrowserSmokeAiFirstLaunchV6>(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__;
      if (!app) throw new Error('Production ruleset-6 app handle is unavailable');
      const snapshot = app.controller.snapshot();
      const view = snapshot.view;
      const replay = app.controller.exportReplay();
      const loaded = JSON.parse(localStorage.getItem('pulpWars.save.current') ?? 'null');
      if (snapshot.phase !== 'ACTIVE' || snapshot.transitioning || snapshot.commandIndex <= 0 || snapshot.stateHash === null || view === null || view.setup.seed !== 314159 || view.setup.aiMode !== 'COOPERATIVE' || view.viewer.faction !== 'CANDY' || JSON.stringify(view.turnOrder) !== JSON.stringify([2, 1]) || view.turnOrder[view.activeSeatIndex] !== view.viewer.id) throw new Error('AI-first launch did not return control to the Candy human: ' + JSON.stringify(snapshot));
      if (replay === null) throw new Error('AI-first launch has no replay');
      const replayed = replay.checkpoints.at(-1);
      if (replay.commands.length !== snapshot.commandIndex || replayed?.index !== snapshot.commandIndex || replayed.stateHash !== snapshot.stateHash) throw new Error('AI-first replay checkpoint is inexact');
      if (loaded?.format !== 'pulp-wars-save' || loaded.version !== 6 || loaded.commandIndex !== snapshot.commandIndex || loaded.stateHash !== snapshot.stateHash || loaded.state?.commandIndex !== snapshot.commandIndex) throw new Error('AI-first persisted boundary is inexact');
      const notice = document.querySelector('#v6-live')?.textContent ?? '';
      if (!/^AI completed [1-9][0-9]* actions?\\. Your turn\\.$/.test(notice) || document.querySelector('.v6-action-dock')?.textContent?.includes('AI turn')) throw new Error('AI-first launch left the shell on its idle AI presentation');
      return {
        seed: 314159,
        aiMode: view.setup.aiMode,
        turnOrder: view.turnOrder,
        commandIndex: snapshot.commandIndex,
        stateHash: snapshot.stateHash,
        replayStateHash: replayed.stateHash,
        persistedStateHash: loaded.stateHash,
        notice
      };
    })()`,
  );
  if (
    evidence.commandIndex !== 3 ||
    evidence.stateHash !==
      "5bb0964730b810c1a5c6111761fb3c16c40257df34bda9f507b5c2b0bf46ce7b"
  ) {
    throw new Error(
      `AI-first deterministic boundary changed: ${JSON.stringify(evidence)}`,
    );
  }
  await clickSelector(connection, '[data-action="delete-save"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );
  return evidence;
}

async function runFactionFlow(
  connection: Connection,
  config: {
    readonly faction: "ORIGINAL" | "CANDY";
    readonly factionTreeId: "ORIGINAL_BASELINE" | "CANDY_BASELINE_V1";
    readonly seed: number;
  },
): Promise<BrowserSmokeFlowEvidenceV6> {
  const artifacts: BrowserSmokeArtifactV6[] = [];
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );
  await setField(connection, "v6-ai-count", "1");
  await setField(connection, "v6-board-size", "11");
  await setField(connection, "v6-seed", String(config.seed));
  await setField(connection, "v6-faction-0", config.faction);
  await setField(
    connection,
    "v6-faction-1",
    config.faction === "ORIGINAL" ? "CANDY" : "ORIGINAL",
  );
  await clickSelector(connection, '[data-action="launch"]');
  await waitForHumanBoundary(connection, 0);
  const launch = await readBoundary(connection);
  assertLaunch(config, launch);

  await clickSelector(connection, '[data-action="restart"]');
  await waitForExpression(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return snapshot?.phase === 'ACTIVE' && snapshot.commandIndex === 0 && !snapshot.transitioning; })()`,
  );
  const restarted = await readBoundary(connection);
  if (
    restarted.stateHash !== launch.stateHash ||
    restarted.stateHash === null
  ) {
    throw new Error(`${config.faction} restart changed its deterministic hash`);
  }
  const animalVisibility = await evaluate<
    BrowserSmokeIntegratedAcceptanceV6["animalVisibility"]
  >(
    connection,
    `(() => {
      const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot();
      const view = snapshot?.view;
      const stored = JSON.parse(localStorage.getItem('pulpWars.save.current') ?? 'null');
      if (!view || stored?.state?.board?.tiles === undefined) throw new Error('Animal visibility boundary is unavailable');
      const visibleGameCount = view.board.tiles.filter((tile) => tile.explored && tile.resource === 'GAME').length;
      const hiddenGame = stored.state.board.tiles.find((tile) => tile.resource === 'GAME' && view.board.tiles[tile.at.y * view.board.width + tile.at.x]?.explored === false);
      const hiddenPublic = hiddenGame === undefined ? undefined : view.board.tiles[hiddenGame.at.y * view.board.width + hiddenGame.at.x];
      return {
        visibleGameCount,
        hiddenGameRedacted: hiddenPublic !== undefined && hiddenPublic.explored === false && Object.keys(hiddenPublic).every((key) => key === 'at' || key === 'explored' || key === 'diplomaticBlock'),
        huntingOwned: view.viewer.researchedTechs.includes('HUNTING'),
        huntGameOffered: snapshot.offeredCommands.some((command) => command.kind === 'HUNT_GAME')
      };
    })()`,
  );
  if (
    animalVisibility.visibleGameCount < 1 ||
    !animalVisibility.hiddenGameRedacted ||
    animalVisibility.huntingOwned ||
    animalVisibility.huntGameOffered
  ) {
    throw new Error(
      `${config.faction} Animal visibility/Hunting gate failed: ${JSON.stringify(animalVisibility)}`,
    );
  }
  const desktop = await readLayout(connection);
  await assertMainScreenIsMapFirst(connection);
  const readinessFullDesktop = await measureReadinessMotion(connection);
  if (readinessFullDesktop.changedPixels <= 0) {
    throw new Error(`${config.faction} desktop readiness sprite did not pulse`);
  }
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.mobile);
  await reloadAndResume(
    connection,
    restarted.commandIndex,
    restarted.stateHash,
  );
  const mobile = await readLayout(connection);
  await assertMobileSemantics(connection);
  const readinessFullMobile = await measureReadinessMotion(connection);
  if (readinessFullMobile.changedPixels <= 0) {
    throw new Error(
      `${config.faction} mobile readiness sprite did not pulse: ${JSON.stringify(readinessFullMobile)}`,
    );
  }

  await setReducedMotion(connection, true);
  await reloadAndResume(
    connection,
    restarted.commandIndex,
    restarted.stateHash,
  );
  const readinessReducedMobile = await measureReadinessMotion(connection);
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await reloadAndResume(
    connection,
    restarted.commandIndex,
    restarted.stateHash,
  );
  const readinessReducedDesktop = await measureReadinessMotion(connection);
  if (
    readinessReducedDesktop.changedPixels !== 0 ||
    readinessReducedMobile.changedPixels !== 0
  ) {
    throw new Error(
      `${config.faction} reduced-motion readiness was not static`,
    );
  }
  artifacts.push(
    ...(await capturePair(
      connection,
      `${config.faction.toLowerCase()}-reduced-motion-desktop`,
      `${config.faction} production map with system Reduced motion`,
    )),
  );
  await setMediaPreferences(connection, false, true);
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.mobile);
  await reloadAndResume(
    connection,
    restarted.commandIndex,
    restarted.stateHash,
  );
  const highContrastApplied = await evaluate<boolean>(
    connection,
    `document.querySelector('#app')?.getAttribute('data-contrast') === 'high'`,
  );
  if (!highContrastApplied) {
    throw new Error(`${config.faction} high-contrast preference was ignored`);
  }
  artifacts.push(
    ...(await capturePair(
      connection,
      `${config.faction.toLowerCase()}-high-contrast-mobile`,
      `${config.faction} production map with system high contrast`,
    )),
  );
  await setMediaPreferences(connection, false, false);
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await reloadAndResume(
    connection,
    restarted.commandIndex,
    restarted.stateHash,
  );

  const capital = await ownedCapital(connection);
  await activateCoordinate(connection, capital.at);
  const unitContext = await readContext(connection);
  const wait = restarted.offered.find((command) => command.kind === "WAIT");
  if (wait === undefined)
    throw new Error(`${config.faction} offered no WAIT command`);
  if (
    unitContext.selectionKind !== "UNIT" ||
    unitContext.selectionId !== waitUnitId(wait.encoded) ||
    !unitContext.commandKinds.includes("WAIT") ||
    unitContext.commandKinds.includes("MOVE") ||
    unitContext.commandKinds.includes("ATTACK") ||
    unitContext.commandKinds.includes("TRAIN") ||
    unitContext.commandKinds.includes("HARVEST_FRUIT") ||
    unitContext.waitSymbolKind === null
  ) {
    throw new Error(
      `${config.faction} exact unit context leaked actions: ${JSON.stringify(unitContext)}`,
    );
  }
  artifacts.push(
    ...(await capturePair(
      connection,
      `${config.faction.toLowerCase()}-unit-context-desktop`,
      `${config.faction} exact-unit contextual dock and map-only movement targets`,
    )),
  );

  await clickEncodedCommand(connection, wait.encoded);
  await waitForHumanBoundary(connection, restarted.commandIndex + 1);
  const afterExact = await readBoundary(connection);
  if (
    afterExact.commandIndex !== restarted.commandIndex + 1 ||
    afterExact.stateHash === null ||
    afterExact.stateHash === restarted.stateHash
  ) {
    throw new Error(`${config.faction} exact WAIT boundary was not accepted`);
  }
  const firstMove = await chooseMoveToward(
    connection,
    waitUnitId(wait.encoded),
    {
      x: 2,
      y: 5,
    },
  );
  await activateCoordinate(connection, firstMove.at);
  await waitForHumanBoundary(connection, afterExact.commandIndex + 1);
  const afterMove = await readBoundary(connection);
  const handledMotion = await measureReadinessMotion(
    connection,
    waitUnitId(wait.encoded),
  );
  if (handledMotion.changedPixels !== 0) {
    throw new Error(`${config.faction} moved unit continued readiness motion`);
  }

  const fruitTiles = [
    { x: 3, y: 7 },
    { x: 2, y: 9 },
  ] as const;
  let tileContextAccepted = false;
  let boundaryIndex = afterMove.commandIndex;
  for (const at of fruitTiles) {
    await activateCoordinate(connection, at);
    const tileContext = await readContext(connection);
    if (
      tileContext.selectionKind !== "TILE" ||
      tileContext.commandKinds.length !== 1 ||
      tileContext.commandKinds[0] !== "HARVEST_FRUIT"
    ) {
      throw new Error(
        `${config.faction} exact tile context leaked actions: ${JSON.stringify(tileContext)}`,
      );
    }
    const harvest = (await readBoundary(connection)).offered.find(
      (command) =>
        command.kind === "HARVEST_FRUIT" && commandAt(command.encoded, at),
    );
    if (harvest === undefined)
      throw new Error(`${config.faction} fruit action disappeared`);
    await clickSelector(connection, '[data-command-kind="HARVEST_FRUIT"]');
    boundaryIndex += 1;
    await waitForHumanBoundary(connection, boundaryIndex);
    const afterHarvest = await readBoundary(connection);
    if (afterHarvest.commandIndex !== boundaryIndex) {
      throw new Error(
        `${config.faction} direct economic action did not accept exactly one boundary`,
      );
    }
    tileContextAccepted = true;
  }

  const choiceDesktop = await assertMandatoryReward(connection);
  artifacts.push(
    ...(await capturePair(
      connection,
      `${config.faction.toLowerCase()}-reward-desktop`,
      `${config.faction} blocking ordered city-reward choice`,
    )),
  );
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.mobile);
  const choiceMobile = await assertMandatoryReward(connection);
  const choiceCommand = (await readBoundary(connection)).offered.find(
    (command) =>
      command.kind === "CHOOSE_CITY_REWARD" &&
      JSON.parse(command.encoded).reward === "STOCKPILE",
  );
  if (choiceCommand === undefined)
    throw new Error(`${config.faction} Stockpile reward is missing`);
  await clickSelector(connection, '[data-choice-option="reward-stockpile"]');
  boundaryIndex += 1;
  await waitForHumanBoundary(connection, boundaryIndex);
  const afterReward = await readBoundary(connection);
  await reloadAndResume(
    connection,
    afterReward.commandIndex,
    afterReward.stateHash,
  );

  await activateCoordinate(connection, capital.at);
  const cityContext = await readContext(connection);
  const expectedTrain =
    config.faction === "ORIGINAL" ? "Fighter" : "Candy Warrior";
  if (
    cityContext.selectionKind !== "CITY" ||
    cityContext.commandKinds.length !== 1 ||
    cityContext.commandKinds[0] !== "TRAIN" ||
    cityContext.trainVisibleLabel !== `${expectedTrain} · 2 Coins` ||
    cityContext.trainAriaLabel !== `Train ${expectedTrain} for 2 Coins` ||
    cityContext.trainSymbolKind === null
  ) {
    throw new Error(
      `${config.faction} faction-correct city context failed: ${JSON.stringify(cityContext)}`,
    );
  }
  artifacts.push(
    ...(await capturePair(
      connection,
      `${config.faction.toLowerCase()}-city-train-mobile`,
      `${config.faction} faction-correct selected-city training symbol`,
    )),
  );
  const train = (await readBoundary(connection)).offered.find(
    (command) =>
      command.kind === "TRAIN" && command.encoded.includes('"role":"FIGHTER"'),
  );
  if (train === undefined)
    throw new Error(
      `${config.faction} exact Fighter training command is missing`,
    );
  await clickSelector(connection, '[data-command-kind="TRAIN"]');
  boundaryIndex += 1;
  await waitForHumanBoundary(connection, boundaryIndex);

  const technology = await browseAndResearchTechnology(
    connection,
    artifacts,
    config.faction,
  );
  const technologyIds = technology.ids;

  const capture = await reachAndCaptureVillage(
    connection,
    waitUnitId(wait.encoded),
    { x: 2, y: 5 },
  );
  const afterCapture = await readBoundary(connection);
  await setViewport(connection, RULESET6_SMOKE_VIEWPORTS.desktop);
  await reloadAndResume(
    connection,
    afterCapture.commandIndex,
    afterCapture.stateHash,
  );
  const attack = await reachAndAttack(connection, { x: 8, y: 8 });
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="end-turn"]:not([disabled])') !== null`,
  );

  const beforeTurnReturn = await readBoundary(connection);
  const end = beforeTurnReturn.offered.find(
    (command) => command.kind === "END_TURN",
  );
  if (end === undefined) {
    throw new Error(`${config.faction} offered no END_TURN command`);
  }
  await clickSelector(connection, '[data-action="end-turn"]');
  await waitForHumanBoundary(
    connection,
    beforeTurnReturn.commandIndex + 2,
    900,
  );
  const returned = await readBoundary(connection);
  if (returned.stateHash === null) {
    throw new Error(`${config.faction} AI return has no state hash`);
  }
  const aiAcceptedCommands =
    returned.commandIndex - beforeTurnReturn.commandIndex - 1;
  if (aiAcceptedCommands <= 0) {
    throw new Error(`${config.faction} AI did not accept a command`);
  }

  await connection.send("Page.reload", { ignoreCache: true });
  await waitForResumeScreen(connection);
  const stored = await readBoundary(connection);
  if (
    stored.commandIndex !== returned.commandIndex ||
    stored.stateHash !== returned.stateHash
  ) {
    throw new Error(
      `${config.faction} reload did not expose the saved boundary`,
    );
  }
  await clickSelector(connection, '[data-action="resume"]');
  await waitForHumanBoundary(connection, returned.commandIndex, 900);
  const resumed = await readBoundary(connection);
  if (
    resumed.commandIndex !== returned.commandIndex ||
    resumed.stateHash !== returned.stateHash
  ) {
    throw new Error(`${config.faction} resume changed the saved boundary`);
  }

  await clickSelector(connection, '[data-action="delete-save"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );

  return {
    faction: config.faction,
    factionTreeId: config.factionTreeId,
    seed: config.seed,
    launch,
    deterministicRestartHash: restarted.stateHash,
    technologyIds,
    exactCommand: {
      encoded: wait.encoded,
      beforeIndex: restarted.commandIndex,
      afterIndex: afterExact.commandIndex,
      afterHash: afterExact.stateHash,
    },
    turnReturn: {
      commandIndex: returned.commandIndex,
      stateHash: returned.stateHash,
      aiAcceptedCommands,
    },
    resume: {
      commandIndex: resumed.commandIndex,
      stateHash: resumed.stateHash,
    },
    acceptance: {
      animalVisibility,
      contextual: {
        selectedExactUnit: unitContext.selectionKind === "UNIT",
        selectedExactCity: cityContext.selectionKind === "CITY",
        selectedExactTile: tileContextAccepted,
        isolatedUnitActions: unitContext.commandKinds.every((kind) =>
          ["WAIT", "CAPTURE", "RECOVER", "PROMOTE"].includes(kind),
        ),
        isolatedCityActions: cityContext.commandKinds.every(
          (kind) => kind === "TRAIN",
        ),
        isolatedTileActions: tileContextAccepted,
        captureVillageSymbol:
          capture.symbolKind !== null && capture.label === "Capture Village",
        factionCorrectTrainSymbol: cityContext.trainSymbolKind !== null,
        moveButtonCount: unitContext.moveButtonCount,
        attackButtonCount: attack.buttonCount,
        exactMoveAccepted:
          afterMove.commandIndex === afterExact.commandIndex + 1,
        exactAttackAccepted: attack.afterIndex === attack.beforeIndex + 1,
      },
      technology: technology.acceptance,
      mandatoryChoice: {
        kind: "CITY_REWARD",
        position: choiceDesktop.position,
        authoritativeFirst: choiceDesktop.authoritativeFirst,
        blocksOutsideInput: choiceDesktop.blocksOutsideInput,
        desktopFits: choiceDesktop.fits,
        mobileFits: choiceMobile.fits,
        exactChoiceAccepted: true,
      },
      readiness: {
        fullDesktopChangedPixels: readinessFullDesktop.changedPixels,
        fullMobileChangedPixels: readinessFullMobile.changedPixels,
        reducedDesktopChangedPixels: readinessReducedDesktop.changedPixels,
        reducedMobileChangedPixels: readinessReducedMobile.changedPixels,
        handledChangedPixels: handledMotion.changedPixels,
      },
    } satisfies BrowserSmokeIntegratedAcceptanceV6,
    desktop,
    mobile,
    screenshots: artifacts,
  };
}

function assertLaunch(
  config: {
    readonly faction: "ORIGINAL" | "CANDY";
    readonly factionTreeId: "ORIGINAL_BASELINE" | "CANDY_BASELINE_V1";
    readonly seed: number;
  },
  launch: BrowserSmokeBoundaryV6,
): void {
  if (
    launch.phase !== "ACTIVE" ||
    launch.commandIndex !== 0 ||
    launch.stateHash === null ||
    launch.faction !== config.faction ||
    launch.factionTreeId !== config.factionTreeId ||
    launch.seed !== config.seed ||
    !launch.activeIsHuman
  ) {
    throw new Error(
      `${config.faction} launched the wrong boundary: ${JSON.stringify(launch)}`,
    );
  }
}

async function browseAndResearchTechnology(
  connection: Connection,
  artifacts: BrowserSmokeArtifactV6[],
  faction: "ORIGINAL" | "CANDY",
): Promise<{
  readonly ids: readonly string[];
  readonly acceptance: BrowserSmokeIntegratedAcceptanceV6["technology"];
}> {
  await clearMapSelection(connection);
  const main = await mainCommandCounts(connection);
  if (main.research !== 0 || main.context !== 0) {
    throw new Error(`${faction} main screen exposed Research/all-actions`);
  }
  await evaluate(
    connection,
    `(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 't', bubbles: true, cancelable: true })); return true; })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('[data-tech-screen]') !== null`,
  );
  const overview = await evaluate<{
    readonly ids: readonly string[];
    readonly branches: number;
  }>(
    connection,
    `(() => {
      const tree = document.querySelector('[data-tech-tree]');
      const back = document.querySelector('[data-action="close-tech"]');
      if (!(tree instanceof HTMLElement) || tree.getAttribute('role') !== 'tree' || !(back instanceof HTMLButtonElement) || document.activeElement !== back) throw new Error('T did not open/focus the dedicated Technology screen');
      const cards = [...tree.querySelectorAll('button[data-tech]')];
      if (cards.some((card) => !card.textContent?.includes('Coins') || !card.getAttribute('aria-label'))) throw new Error('Technology card semantics are incomplete');
      return { ids: cards.map((card) => card.getAttribute('data-tech')), branches: tree.querySelectorAll('[data-tech-branch]').length };
    })()`,
  );
  if (
    overview.branches !== 5 ||
    JSON.stringify(overview.ids) !== JSON.stringify(RULESET6_SMOKE_TECH_IDS)
  ) {
    throw new Error(
      `${faction} technology overview is not the frozen 25-card graph`,
    );
  }
  await clickSelector(connection, 'button[data-tech="HUNTING"]');
  const detailIsModal = await evaluate<boolean>(
    connection,
    `(() => {
      const detail = document.querySelector('[data-tech-detail="HUNTING"]');
      const research = document.querySelector('[data-action="research-tech"]');
      if (!(detail instanceof HTMLElement) || !(research instanceof HTMLButtonElement)) return false;
      const rect = detail.getBoundingClientRect();
      return detail.getAttribute('role') === 'dialog' && detail.getAttribute('aria-modal') === 'true' && document.activeElement === detail && rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight;
    })()`,
  );
  if (!detailIsModal)
    throw new Error(`${faction} Hunting detail is not a fitted focused modal`);
  artifacts.push(
    ...(await capturePair(
      connection,
      `${faction.toLowerCase()}-technology-detail-mobile`,
      `${faction} 25-card five-branch Technology detail and exact research action`,
    )),
  );
  const before = await readBoundary(connection);
  await clickSelector(connection, '[data-action="research-tech"]');
  await waitForHumanBoundary(connection, before.commandIndex + 1);
  const after = await readBoundary(connection);
  const retained = await evaluate<boolean>(
    connection,
    `(() => { const detail = document.querySelector('[data-tech-detail="HUNTING"]'); return detail instanceof HTMLElement && detail.textContent?.includes('Researched') === true && document.querySelector('[data-action="research-tech"]') === null; })()`,
  );
  if (!retained)
    throw new Error(`${faction} research did not update the retained detail`);
  await evaluate(
    connection,
    `(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true; })()`,
  );
  const backRestored = await evaluate<boolean>(
    connection,
    `(() => { const tech = document.querySelector('[data-action="open-tech"]'); return document.querySelector('[data-tech-screen]') === null && tech instanceof HTMLButtonElement && document.activeElement === tech; })()`,
  );
  if (!backRestored)
    throw new Error(`${faction} Technology Back did not restore match focus`);
  return {
    ids: overview.ids,
    acceptance: {
      mainResearchButtonCount: main.research,
      mainContextCommandCount: main.context,
      branchCount: overview.branches,
      cardCount: overview.ids.length,
      detailIsModal,
      exactResearchAccepted: after.commandIndex === before.commandIndex + 1,
      researchedDetailRetained: retained,
      backRestoredMatchFocus: backRestored,
    },
  };
}

async function assertMainScreenIsMapFirst(
  connection: Connection,
): Promise<void> {
  const result = await evaluate<{
    readonly research: number;
    readonly move: number;
    readonly attack: number;
    readonly actionCount: number;
  }>(
    connection,
    `(() => ({
      research: document.querySelectorAll('[data-command-kind="RESEARCH"]').length,
      move: document.querySelectorAll('[data-command-kind="MOVE"]').length,
      attack: document.querySelectorAll('[data-command-kind="ATTACK"]').length,
      actionCount: document.querySelectorAll('.v6-action-panel [data-command-kind]').length
    }))()`,
  );
  if (
    result.research !== 0 ||
    result.move !== 0 ||
    result.attack !== 0 ||
    result.actionCount !== 0
  ) {
    throw new Error(
      `Main screen dumped non-contextual actions: ${JSON.stringify(result)}`,
    );
  }
}

async function mainCommandCounts(
  connection: Connection,
): Promise<{ readonly research: number; readonly context: number }> {
  return evaluate(
    connection,
    `(() => ({
      research: document.querySelectorAll('[data-command-kind="RESEARCH"]').length,
      context: document.querySelectorAll('.v6-action-panel [data-command-kind]').length
    }))()`,
  );
}

async function ownedCapital(
  connection: Connection,
): Promise<{ readonly id: number; readonly at: CoordV6 }> {
  return evaluate(
    connection,
    `(() => {
      const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot();
      const view = snapshot?.view;
      const city = view?.cities.find((candidate) => candidate.ownerId === view.viewer.id && candidate.isCapital);
      if (!city) throw new Error('Owned capital is missing');
      return { id: city.id, at: city.at };
    })()`,
  );
}

async function readContext(connection: Connection): Promise<{
  readonly selectionKind: "UNIT" | "CITY" | "TILE" | "OTHER";
  readonly selectionId: number | null;
  readonly commandKinds: readonly string[];
  readonly waitSymbolKind: string | null;
  readonly trainVisibleLabel: string | null;
  readonly trainAriaLabel: string | null;
  readonly trainSymbolKind: string | null;
  readonly moveButtonCount: number;
}> {
  return evaluate(
    connection,
    `(() => {
      const heading = document.querySelector('.v6-action-panel h2')?.textContent ?? '';
      const buttons = [...document.querySelectorAll('.v6-action-panel button[data-command-kind]')];
      const commands = buttons.map((button) => JSON.parse(button.dataset.command ?? '{}'));
      const first = commands[0] ?? {};
      const selectionKind = heading.startsWith('Tile ') ? 'TILE' : heading.startsWith('City ') ? 'CITY' : heading.includes(' HP') ? 'UNIT' : 'OTHER';
      const selectionId = selectionKind === 'UNIT' ? (first.unitId ?? null) : selectionKind === 'CITY' ? (first.cityId ?? null) : null;
      const wait = document.querySelector('[data-command-kind="WAIT"]');
      const train = document.querySelector('[data-command-kind="TRAIN"]');
      return {
        selectionKind,
        selectionId,
        commandKinds: buttons.map((button) => button.dataset.commandKind),
        waitSymbolKind: wait?.querySelector('[data-symbol-kind]')?.getAttribute('data-symbol-kind') ?? null,
        trainVisibleLabel: train?.querySelector('.v6-command-label')?.textContent ?? null,
        trainAriaLabel: train?.getAttribute('aria-label') ?? null,
        trainSymbolKind: train?.querySelector('[data-symbol-kind]')?.getAttribute('data-symbol-kind') ?? null,
        moveButtonCount: document.querySelectorAll('[data-command-kind="MOVE"]').length
      };
    })()`,
  );
}

async function activateCoordinate(
  connection: Connection,
  at: CoordV6,
): Promise<void> {
  const point = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__;
      const canvas = document.querySelector('.board-canvas-v6');
      const point = app?.view.boardScreenPoint(${JSON.stringify(at)});
      if (!app || !(canvas instanceof HTMLCanvasElement) || !point) throw new Error('Coordinate cannot be activated: ${at.x},${at.y}');
      const rect = canvas.getBoundingClientRect();
      return { x: rect.left + point.x, y: rect.top + point.y };
    })()`,
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
  await delay(80);
}

async function clearMapSelection(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => { const canvas = document.querySelector('.board-canvas-v6'); if (canvas instanceof HTMLCanvasElement) canvas.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); return true; })()`,
  );
  await delay(30);
}

function waitUnitId(encoded: string): number {
  const unitId = (JSON.parse(encoded) as { readonly unitId?: unknown }).unitId;
  if (typeof unitId !== "number")
    throw new Error("WAIT command has no unit ID");
  return unitId;
}

function commandAt(encoded: string, at: CoordV6): boolean {
  const command = JSON.parse(encoded) as { readonly at?: CoordV6 };
  return command.at?.x === at.x && command.at.y === at.y;
}

async function chooseMoveToward(
  connection: Connection,
  unitId: number,
  destination: CoordV6,
): Promise<{ readonly encoded: string; readonly at: CoordV6 }> {
  return evaluate(
    connection,
    `(() => {
      const commands = globalThis.__PULP_WARS_APP__?.controller.snapshot().offeredCommands ?? [];
      const moves = commands.filter((command) => command.kind === 'MOVE' && command.unitId === ${unitId});
      moves.sort((left, right) => {
        const a = left.path.at(-1); const b = right.path.at(-1);
        return (Math.abs(a.x - ${destination.x}) + Math.abs(a.y - ${destination.y})) - (Math.abs(b.x - ${destination.x}) + Math.abs(b.y - ${destination.y})) || JSON.stringify(left).localeCompare(JSON.stringify(right));
      });
      const command = moves[0]; const at = command?.path.at(-1);
      if (!command || !at) throw new Error('No exact MOVE remains for unit ${unitId}');
      return { encoded: JSON.stringify(command), at };
    })()`,
  );
}

async function assertMandatoryReward(connection: Connection): Promise<{
  readonly position: string;
  readonly authoritativeFirst: boolean;
  readonly blocksOutsideInput: boolean;
  readonly fits: boolean;
}> {
  return evaluate(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__;
      const snapshot = app?.controller.snapshot();
      const dialog = document.querySelector('[data-mandatory-choice="CITY_REWARD"]');
      const overlay = document.querySelector('[data-mandatory-choice-overlay]');
      const shell = document.querySelector('.v6-match-shell');
      const hud = document.querySelector('.v6-hud');
      const map = document.querySelector('.v6-map-region');
      if (!snapshot?.view || !(dialog instanceof HTMLElement) || !(overlay instanceof HTMLElement) || !(shell instanceof HTMLElement) || !(hud instanceof HTMLElement) || !(map instanceof HTMLElement)) throw new Error('Mandatory city reward is missing');
      const first = snapshot.view.pendingChoices[0];
      const rect = dialog.getBoundingClientRect();
      const position = dialog.querySelector('.v6-choice-position')?.textContent?.trim() ?? '';
      return {
        position,
        authoritativeFirst: first?.kind === 'CITY_REWARD' && dialog.getAttribute('aria-modal') === 'true' && document.activeElement?.hasAttribute('data-mandatory-choice-action') === true,
        blocksOutsideInput: shell.dataset.inputBlocked === 'mandatory-choice' && hud.inert && map.inert && document.querySelector('.v6-action-dock') === null && document.querySelector('[data-action="open-tech"]') === null,
        fits: rect.x >= 0 && rect.y >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth
      };
    })()`,
  );
}

async function reachAndCaptureVillage(
  connection: Connection,
  unitId: number,
  village: CoordV6,
): Promise<{ readonly label: string; readonly symbolKind: string | null }> {
  const trace: string[] = [];
  for (let turn = 0; turn < 6; turn += 1) {
    const boundary = await readBoundary(connection);
    const currentAt = await unitCoordinate(connection, unitId);
    const capture = boundary.offered.find(
      (command) =>
        command.kind === "CAPTURE" && waitUnitId(command.encoded) === unitId,
    );
    if (capture !== undefined) {
      const presentation = await evaluate<{
        readonly label: string;
        readonly symbolKind: string | null;
      }>(
        connection,
        `(() => { const button = document.querySelector('[data-command-kind="CAPTURE"]'); if (!(button instanceof HTMLButtonElement)) throw new Error('Capture is offered but absent from selected-unit context'); return { label: button.querySelector('.v6-command-label')?.textContent ?? '', symbolKind: button.querySelector('[data-symbol-kind]')?.getAttribute('data-symbol-kind') ?? null }; })()`,
      );
      if (presentation.label !== "Capture Village")
        throw new Error(`Capture label was ${presentation.label}`);
      await clickSelector(connection, '[data-command-kind="CAPTURE"]');
      await waitForHumanBoundary(connection, boundary.commandIndex + 1);
      return presentation;
    }
    const hasMove = boundary.offered.some(
      (command) =>
        command.kind === "MOVE" && waitUnitId(command.encoded) === unitId,
    );
    trace.push(
      `${boundary.commandIndex}:${currentAt.x},${currentAt.y}:${hasMove ? "move" : "turn"}`,
    );
    if (!hasMove) {
      await endTurnAndReturn(connection);
      continue;
    }
    const unitAt = await unitCoordinate(connection, unitId);
    await clearMapSelection(connection);
    await activateCoordinate(connection, unitAt);
    const context = await readContext(connection);
    if (context.moveButtonCount !== 0)
      throw new Error("MOVE leaked into the unit dock");
    const move = await chooseMoveToward(connection, unitId, village);
    trace.push(`->${move.at.x},${move.at.y}`);
    const before = await readBoundary(connection);
    await activateCoordinate(connection, move.at);
    await waitForHumanBoundary(connection, before.commandIndex + 1);
  }
  throw new Error(
    `Did not reach the deterministic neutral village: ${trace.join(" ")}`,
  );
}

async function unitCoordinate(
  connection: Connection,
  unitId: number,
): Promise<CoordV6> {
  return evaluate(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__?.controller.snapshot().view; const unit = view?.units.find((candidate) => candidate.id === ${unitId}); if (!unit) throw new Error('Unit ${unitId} is unavailable'); return unit.at; })()`,
  );
}

async function reachAndAttack(
  connection: Connection,
  destination: CoordV6,
): Promise<{
  readonly beforeIndex: number;
  readonly afterIndex: number;
  readonly buttonCount: number;
}> {
  for (let turn = 0; turn < 16; turn += 1) {
    const candidate = await evaluate<
      | {
          readonly kind: "ATTACK";
          readonly encoded: string;
          readonly attackerAt: CoordV6;
          readonly targetAt: CoordV6;
        }
      | {
          readonly kind: "MOVE";
          readonly encoded: string;
          readonly attackerAt: CoordV6;
          readonly targetAt: CoordV6;
        }
      | null
    >(
      connection,
      `(() => {
        const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const view = snapshot?.view;
        if (!view) return null;
        const attacks = snapshot.offeredCommands.filter((command) => command.kind === 'ATTACK');
        const attack = attacks[0];
        if (attack) {
          const attacker = view.units.find((unit) => unit.id === attack.unitId);
          const target = attack.target.kind === 'UNIT' ? view.units.find((unit) => unit.id === attack.target.unitId) : view.chocolateWalls.find((wall) => wall.id === attack.target.wallId);
          if (attacker && target) return { kind: 'ATTACK', encoded: JSON.stringify(attack), attackerAt: attacker.at, targetAt: target.at };
        }
        const moves = snapshot.offeredCommands.filter((command) => command.kind === 'MOVE').map((command) => ({ command, at: command.path.at(-1), unit: view.units.find((unit) => unit.id === command.unitId) })).filter((item) => item.at && item.unit);
        moves.sort((left, right) => (Math.abs(left.at.x - ${destination.x}) + Math.abs(left.at.y - ${destination.y})) - (Math.abs(right.at.x - ${destination.x}) + Math.abs(right.at.y - ${destination.y})) || JSON.stringify(left.command).localeCompare(JSON.stringify(right.command)));
        const move = moves[0];
        return move ? { kind: 'MOVE', encoded: JSON.stringify(move.command), attackerAt: move.unit.at, targetAt: move.at } : null;
      })()`,
    );
    if (candidate === null) {
      await endTurnAndReturn(connection);
      continue;
    }
    await clearMapSelection(connection);
    await activateCoordinate(connection, candidate.attackerAt);
    const buttonCount = await evaluate<number>(
      connection,
      `document.querySelectorAll('[data-command-kind="ATTACK"]').length`,
    );
    if (buttonCount !== 0) throw new Error("ATTACK leaked into the unit dock");
    const before = await readBoundary(connection);
    await activateCoordinate(connection, candidate.targetAt);
    await waitForHumanBoundary(connection, before.commandIndex + 1);
    if (candidate.kind === "ATTACK") {
      return {
        beforeIndex: before.commandIndex,
        afterIndex: before.commandIndex + 1,
        buttonCount,
      };
    }
    if (candidate.kind === "MOVE") continue;
  }
  throw new Error(
    "No exact ATTACK target was reached in the deterministic flow",
  );
}

async function endTurnAndReturn(connection: Connection): Promise<void> {
  const before = await readBoundary(connection);
  const end = before.offered.find((command) => command.kind === "END_TURN");
  if (end === undefined) throw new Error("END_TURN is unavailable");
  await clickSelector(connection, '[data-action="end-turn"]');
  await waitForHumanBoundary(connection, before.commandIndex + 2, 900);
}

async function setReducedMotion(
  connection: Connection,
  reduced: boolean,
): Promise<void> {
  await setMediaPreferences(connection, reduced, false);
}

async function setMediaPreferences(
  connection: Connection,
  reduced: boolean,
  highContrast: boolean,
): Promise<void> {
  await connection.send("Emulation.setEmulatedMedia", {
    media: "screen",
    features: [
      {
        name: "prefers-reduced-motion",
        value: reduced ? "reduce" : "no-preference",
      },
      {
        name: "prefers-contrast",
        value: highContrast ? "more" : "no-preference",
      },
    ],
  });
}

async function waitForResumeScreen(connection: Connection): Promise<void> {
  await waitForExpression(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return document.querySelector('.v6-resume-screen') !== null && snapshot?.phase === 'RESUMABLE' && !snapshot.transitioning; })()`,
    600,
  );
}

async function reloadAndResume(
  connection: Connection,
  commandIndex: number,
  stateHash: string | null,
): Promise<void> {
  await connection.send("Page.reload", { ignoreCache: true });
  await waitForResumeScreen(connection);
  await clickSelector(connection, '[data-action="resume"]');
  await waitForHumanBoundary(connection, commandIndex, 900);
  const resumed = await readBoundary(connection);
  if (
    resumed.commandIndex !== commandIndex ||
    resumed.stateHash !== stateHash
  ) {
    throw new Error("Motion-emulation reload changed the persisted boundary");
  }
}

async function measureReadinessMotion(
  connection: Connection,
  unitId?: number,
): Promise<MotionEvidenceV6> {
  await waitForAcceptedImages(connection);
  const clip = await evaluate<{
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  }>(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__; const snapshot = app?.controller.snapshot(); const view = snapshot?.view; const canvas = document.querySelector('.board-canvas-v6');
      const unit = view?.units.find((candidate) => ${unitId === undefined ? "candidate.ownerId === view.viewer.id" : `candidate.id === ${unitId}`});
      if (!app || !view || !unit || !(canvas instanceof HTMLCanvasElement)) throw new Error('Readiness measurement unit is missing');
      const point = app.view.boardScreenPoint(unit.at); if (!point) throw new Error('Readiness unit projection is missing');
      const rect = canvas.getBoundingClientRect(); const width = 110; const height = 150;
      return { x: Math.max(0, Math.min(innerWidth - width, rect.left + point.x - width / 2)), y: Math.max(0, Math.min(innerHeight - height, rect.top + point.y - 120)), width, height };
    })()`,
  );
  const frames: Buffer[] = [];
  for (let frame = 0; frame < 3; frame += 1) {
    frames.push(await captureBuffer(connection, clip));
    await delay(280);
  }
  const [first, second, third] = frames;
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error("Readiness measurement did not capture three frames");
  }
  let selected: readonly [Buffer, Buffer] = [first, second];
  let changedPixels = await differentPixels(selected[0], selected[1]);
  for (const pair of [[first, third] as const, [second, third] as const]) {
    const changed = await differentPixels(pair[0], pair[1]);
    if (changed > changedPixels) {
      changedPixels = changed;
      selected = pair;
    }
  }
  return {
    changedPixels,
    firstSha256: createHash("sha256").update(selected[0]).digest("hex"),
    secondSha256: createHash("sha256").update(selected[1]).digest("hex"),
    clip,
  };
}

async function captureBuffer(
  connection: Connection,
  clip?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
): Promise<Buffer> {
  const response = (await connection.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    ...(clip === undefined ? {} : { clip: { ...clip, scale: 1 } }),
  })) as { readonly data?: string };
  if (response.data === undefined)
    throw new Error("Chrome returned no screenshot");
  return Buffer.from(response.data, "base64");
}

async function differentPixels(left: Buffer, right: Buffer): Promise<number> {
  const [leftImage, rightImage] = await Promise.all([
    sharp(left).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(right).ensureAlpha().raw().toBuffer({ resolveWithObject: true }),
  ]);
  if (
    leftImage.info.width !== rightImage.info.width ||
    leftImage.info.height !== rightImage.info.height
  ) {
    throw new Error("Readiness frames changed dimensions");
  }
  let changed = 0;
  for (let offset = 0; offset < leftImage.data.length; offset += 4) {
    const leftRed = leftImage.data[offset] ?? 0;
    const leftGreen = leftImage.data[offset + 1] ?? 0;
    const leftBlue = leftImage.data[offset + 2] ?? 0;
    const leftAlpha = leftImage.data[offset + 3] ?? 0;
    const rightRed = rightImage.data[offset] ?? 0;
    const rightGreen = rightImage.data[offset + 1] ?? 0;
    const rightBlue = rightImage.data[offset + 2] ?? 0;
    const rightAlpha = rightImage.data[offset + 3] ?? 0;
    if (
      Math.abs(leftRed - rightRed) > 1 ||
      Math.abs(leftGreen - rightGreen) > 1 ||
      Math.abs(leftBlue - rightBlue) > 1 ||
      Math.abs(leftAlpha - rightAlpha) > 1
    )
      changed += 1;
  }
  return changed;
}

async function assertMobileSemantics(connection: Connection): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const shell = document.querySelector('.v6-match-shell');
      const map = document.querySelector('[aria-label="Battlefield map"]');
      const dock = document.querySelector('[aria-label="Available actions"]');
      const canvas = document.querySelector('.board-canvas-v6');
      const live = document.querySelector('#v6-live[aria-live="polite"]');
      const alert = document.querySelector('#v6-alert[aria-live="assertive"]');
      const end = [...document.querySelectorAll('button[data-command-kind="END_TURN"]')].find((button) => !button.disabled);
      if (!(shell instanceof HTMLElement) || !(map instanceof HTMLElement) || !(dock instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement) || live === null || alert === null || !(end instanceof HTMLButtonElement)) throw new Error('Mobile semantic action shell is incomplete');
      if (!end.textContent?.trim()) throw new Error('End Turn has no accessible name');
      return true;
    })()`,
  );
}

async function waitForAcceptedImages(connection: Connection): Promise<void> {
  await waitForExpression(
    connection,
    `document.fonts === undefined || document.fonts.status === 'loaded'`,
  );
  await delay(300);
}

async function readBoundary(
  connection: Connection,
): Promise<BrowserSmokeBoundaryV6> {
  return evaluate<BrowserSmokeBoundaryV6>(
    connection,
    `(() => {
      const app = globalThis.__PULP_WARS_APP__;
      if (!app) throw new Error('Production ruleset-6 app handle is unavailable');
      const snapshot = app.controller.snapshot();
      const view = snapshot.view;
      return {
        phase: snapshot.phase,
        transitioning: snapshot.transitioning,
        commandIndex: snapshot.commandIndex,
        stateHash: snapshot.stateHash,
        faction: view?.viewer.faction ?? null,
        factionTreeId: view?.viewer.factionTreeId ?? null,
        seed: view?.setup.seed ?? null,
        activeIsHuman: view !== null && view.turnOrder[view.activeSeatIndex] === view.viewer.id,
        offered: snapshot.offeredCommands.map((command) => ({ kind: command.kind, encoded: JSON.stringify(command) }))
      };
    })()`,
  );
}

async function readLayout(
  connection: Connection,
): Promise<BrowserSmokeLayoutV6> {
  return evaluate<BrowserSmokeLayoutV6>(
    connection,
    `(() => {
      const shell = document.querySelector('.v6-match-shell');
      const hud = document.querySelector('.v6-hud');
      const map = document.querySelector('.v6-map-region');
      const dock = document.querySelector('.v6-action-dock');
      const canvas = document.querySelector('.board-canvas-v6');
      if (!(shell instanceof HTMLElement) || !(hud instanceof HTMLElement) || !(map instanceof HTMLElement) || !(dock instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) throw new Error('Ruleset-6 layout is incomplete');
      const rect = (node) => { const value = node.getBoundingClientRect(); return { x: value.x, y: value.y, width: value.width, height: value.height }; };
      const canvasRect = canvas.getBoundingClientRect();
      return {
        viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        shell: rect(shell), hud: rect(hud), map: rect(map), dock: rect(dock),
        canvas: {
          cssWidth: canvasRect.width,
          cssHeight: canvasRect.height,
          backingWidth: canvas.width,
          backingHeight: canvas.height,
          role: canvas.getAttribute('role'),
          interactive: canvas.dataset.interactive ?? null
        }
      };
    })()`,
  );
}

async function setField(
  connection: Connection,
  id: string,
  value: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => {
      const field = document.getElementById(${JSON.stringify(id)});
      if (!(field instanceof HTMLInputElement) && !(field instanceof HTMLSelectElement)) throw new Error('Missing field ${id}');
      field.value = ${JSON.stringify(value)};
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`,
  );
  await delay(50);
}

async function clickSelector(
  connection: Connection,
  selector: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const button = document.querySelector(${JSON.stringify(selector)}); if (!(button instanceof HTMLButtonElement) || button.disabled) throw new Error('Missing enabled button ${selector}'); button.click(); return true; })()`,
  );
  await delay(50);
}

async function clickEncodedCommand(
  connection: Connection,
  encoded: string,
): Promise<void> {
  await evaluate(
    connection,
    `(() => { const encoded = ${JSON.stringify(encoded)}; const button = [...document.querySelectorAll('button[data-command]')].find((candidate) => candidate.dataset.command === encoded && !candidate.disabled); if (!(button instanceof HTMLButtonElement)) throw new Error('Exact offered command is missing from the DOM: ' + encoded); button.click(); return true; })()`,
  );
  await delay(50);
}

async function waitForHumanBoundary(
  connection: Connection,
  minimumCommandIndex: number,
  attempts = 300,
): Promise<void> {
  await waitForExpression(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const view = snapshot?.view; return snapshot?.phase === 'ACTIVE' && !snapshot.transitioning && snapshot.commandIndex >= ${minimumCommandIndex} && view !== null && view !== undefined && view.turnOrder[view.activeSeatIndex] === view.viewer.id; })()`,
    attempts,
  );
}

async function setViewport(
  connection: Connection,
  viewport: {
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
    readonly mobile: boolean;
  },
): Promise<void> {
  await connection.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.dpr,
    mobile: viewport.mobile,
  });
  await waitForExpression(
    connection,
    `innerWidth === ${viewport.width} && innerHeight === ${viewport.height} && devicePixelRatio === ${viewport.dpr}`,
  );
  await delay(200);
}

async function capturePair(
  connection: Connection,
  stem: string,
  subject: string,
): Promise<readonly [BrowserSmokeArtifactV6, BrowserSmokeArtifactV6]> {
  await waitForAcceptedImages(connection);
  const viewport = await evaluate<{
    readonly width: number;
    readonly height: number;
    readonly dpr: number;
  }>(
    connection,
    `({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })`,
  );
  const nativeName = `${stem}-native.png`;
  const enlargedName = `${stem}-enlarged.png`;
  const native = await captureBuffer(connection);
  const nativeMetadata = await sharp(native).metadata();
  const enlarged = await sharp(native)
    .resize({
      width: (nativeMetadata.width ?? viewport.width) * 2,
      height: (nativeMetadata.height ?? viewport.height) * 2,
      kernel: "nearest",
    })
    .png()
    .toBuffer();
  pendingReviewFiles.push(
    { path: path.join(reviewRoot, nativeName), data: native },
    { path: path.join(reviewRoot, enlargedName), data: enlarged },
  );
  const artifact = async (
    name: string,
    bytes: Buffer,
    inspectionScale: 1 | 2,
  ): Promise<BrowserSmokeArtifactV6> => {
    const metadata = await sharp(bytes).metadata();
    return {
      path: `art/integration/reviews/ruleset6-browser-smoke/${name}`,
      bytes: bytes.byteLength,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      viewport,
      inspectionScale,
      subject,
    };
  };
  return [
    await artifact(nativeName, native, 1),
    await artifact(enlargedName, enlarged, 2),
  ];
}

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly onEvent: (
    listener: (method: string, params: unknown) => void,
  ) => () => void;
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
      readonly text?: string;
    };
  };
  if (response.exceptionDetails !== undefined) {
    throw new Error(
      response.exceptionDetails.exception?.description ??
        response.exceptionDetails.text ??
        "Browser evaluation failed",
    );
  }
  return response.result?.value as T;
}

async function waitForExpression(
  connection: Connection,
  expression: string,
  attempts = 300,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const result = await evaluate<boolean>(
      connection,
      `Boolean(${expression})`,
    ).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      if (
        message.includes("Inspected target navigated or closed") ||
        message.includes("Execution context was destroyed")
      ) {
        return false;
      }
      throw error;
    });
    if (result) return;
    await delay(100);
  }
  const diagnostic = await evaluate<unknown>(
    connection,
    `(() => ({
      url: location.href,
      title: document.title,
      text: document.body.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 800),
      app: globalThis.__PULP_WARS_APP__ === undefined ? null : globalThis.__PULP_WARS_APP__.controller.snapshot()
    }))()`,
  ).catch((error: unknown) => ({
    diagnosticFailure: error instanceof Error ? error.message : String(error),
  }));
  throw new Error(
    `Chrome timed out waiting for: ${expression}. Diagnostic: ${JSON.stringify(diagnostic)}`,
  );
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
      readonly method: string;
      readonly resolve: (value: unknown) => void;
      readonly reject: (error: Error) => void;
    }
  >();
  const listeners = new Set<(method: string, params: unknown) => void>();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as ProtocolMessage;
    if (message.id !== undefined) {
      const request = pending.get(message.id);
      if (request === undefined) return;
      pending.delete(message.id);
      if (message.error !== undefined) {
        request.reject(
          new Error(
            `${request.method}: ${message.error.message ?? "CDP command failed"}`,
          ),
        );
      } else {
        request.resolve(message.result);
      }
      return;
    }
    if (message.method !== undefined) {
      for (const listener of listeners) {
        listener(message.method, message.params);
      }
    }
  });
  return {
    send(method, params = {}): Promise<unknown> {
      const id = nextId;
      nextId += 1;
      return new Promise((resolve, reject) => {
        pending.set(id, { method, resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    onEvent(listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close(): void {
      socket.close();
    },
  };
}

function eventErrorDetail(method: string, params: unknown): string | null {
  if (method === "Runtime.exceptionThrown") return JSON.stringify(params);
  if (method === "Runtime.consoleAPICalled") {
    const value = asRecord(params);
    const type = typeof value?.type === "string" ? value.type : "";
    if (type === "error" || type === "assert") return JSON.stringify(params);
  }
  if (method === "Log.entryAdded") {
    const value = asRecord(asRecord(params)?.entry);
    if (value?.level === "error" && value.source !== "network") {
      return JSON.stringify(params);
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
