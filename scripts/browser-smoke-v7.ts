import { prepareSmokeOutput } from "./browser-smoke-output";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { arch, cpus, loadavg, platform, release, tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { format } from "prettier";
import { browserReleaseRuntimeFingerprintV7 } from "./ruleset7-browser-release-fingerprint";
import {
  AFFLICTION_HUMAN_MARKERS_V7,
  afflictionEvidenceExpressionV7,
  undeadFixtureMountExpressionV7,
} from "./browser-undead-fixture-v7";
import {
  controlCasingPixelsExpressionV7,
  martianFixtureMountExpressionV7,
} from "./browser-martian-fixture-v7";
import {
  armFastForwardExpression,
  stableControlPointExpression,
} from "./browser-smoke-v7-controls";
import { probeCandyV7 } from "./browser-smoke-v7-candy";
import { probeCuriositiesV7 } from "./browser-smoke-v7-curiosities";
import { probeGalleryV7 } from "./browser-smoke-v7-gallery";
import { probeManySeatsV7 } from "./browser-smoke-v7-many-seats";
import { assertPreloadedV7 } from "./browser-smoke-v7-preload";
import { probeResearchPromptV7 } from "./browser-smoke-v7-research-prompt";
import { probeSoundV7 } from "./browser-smoke-v7-sound";
import {
  browserTimingModeV7,
  collectBrowserTimingV7,
  enforceBrowserTimingV7,
  validateColdPolicy,
  validatePreview,
  type ColdPolicyEvidenceV7,
  type PreviewEvidenceV7,
} from "./browser-smoke-v7-contract";
import {
  RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX,
  RULESET7_LATE_PUBLIC_VIEW_FIXTURE_URL,
} from "./ruleset-v7-late-public-view-contract";

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

interface BrowserErrorV7 {
  readonly method: string;
  readonly detail: string;
}

interface OutcomeEvidenceV7 {
  readonly outcome: "VICTORY" | "DEFEAT";
  readonly round: number;
  readonly commandIndex: number;
  readonly humanEndTurns: number;
  readonly humanRewardChoices: number;
  readonly policySlices: number;
}

type Connection = {
  readonly send: (method: string, params?: object) => Promise<unknown>;
  readonly onEvent: (
    listener: (method: string, params: unknown) => void,
  ) => () => void;
  readonly close: () => void;
};

/**
 * The setup's faction options in order, for every faction probe (the Martian
 * UI added the fifth, the Ice Folk UI, pulp_wars-7g3.6, the sixth, the Dwarf
 * UI, pulp_wars-78i.6, the seventh, and the Candy engine bead,
 * pulp_wars-jdb.3, the eighth).
 */
const FACTION_OPTIONS_V7 = [
  "Human",
  "Undead",
  "Goblin",
  "Dinosaur",
  "Martian",
  "Ice Folk",
  "Dwarf",
  "Candy",
] as const;
/**
 * Campaign progress (pulp_wars-68k.5, docs/product/CAMPAIGN.md section 4.1):
 * its own key, which the storage-isolation check seeds and expects to
 * survive the obsolete-save cleanup and Delete save.
 */
/** The setup form is open (the main menu's New game, pulp_wars-2yc.18). */
const SETUP_OPEN_V7 = `document.querySelector('[data-v7-front="setup"] .v7-front-panel .v7-setup-form') !== null && document.querySelector('.v7-main-menu') === null && document.querySelector('.v7-setup-form').closest('[hidden]') === null`;
const CAMPAIGN_KEY_V7 = "pulpWars.campaign.v1";
const SEEDED_CAMPAIGN_PROGRESS_V7 = JSON.stringify({
  format: "pulp-wars-campaign-progress",
  version: 1,
  completed: {
    FRONTIER_1: { firstWonAt: "2026-10-03T12:00:00.000Z", bestRounds: 12 },
  },
});
const timingMode = browserTimingModeV7(process.argv);
const deployed = process.argv.includes("--deployed");
const baseUrl = smokeUrl(
  process.argv.slice(2).find((argument) => argument.startsWith("http")) ??
    "http://localhost:6173/",
);
const smokeOutput = await prepareSmokeOutput({
  args: process.argv.slice(2),
  name: "v7",
  archiveDirectory: "art/integration/reviews/ruleset7-preview",
});
const reviewRoot = smokeOutput.directory;
const defaultWindowsChrome =
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe";
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : defaultWindowsChrome);
const port = 9_900 + (process.pid % 80);
let reloadDocumentSequence = 0;
const windowsChromeFromWsl =
  process.platform !== "win32" && chrome.endsWith(".exe");
const userDataFs = await mkdtemp(
  path.join(
    windowsChromeFromWsl ? "/mnt/c/Windows/Temp" : tmpdir(),
    "pulp-wars-v7-smoke-profile-",
  ),
);
const userData = windowsChromeFromWsl
  ? wslPathToWindows(userDataFs)
  : userDataFs;
const browser = spawn(
  chrome,
  [
    "--headless=new",
    "--mute-audio",
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
  const browserErrors: BrowserErrorV7[] = [];
  connection.onEvent((method, params) => {
    const detail = eventErrorDetail(method, params);
    if (detail !== null) browserErrors.push({ method, detail });
  });
  await connection.send("Page.enable");
  await connection.send("Runtime.enable");
  await connection.send("Log.enable");
  await waitForExpression(
    connection,
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__ !== undefined`,
  );

  await evaluate(
    connection,
    `(() => {
      localStorage.removeItem('pulpWars.save.v7r69.current');
      localStorage.setItem('pulpWars.save.v7.current', 'old-v7-bytes');
      localStorage.setItem('pulpWars.save.v7r2.current', 'old-v7r2-bytes');
      localStorage.setItem('pulpWars.save.v7r3.current', 'old-v7r3-bytes');
      localStorage.setItem('pulpWars.save.v7r4.current', 'old-v7r4-bytes');
      localStorage.setItem('pulpWars.save.v7r5.current', 'old-v7r5-bytes');
      localStorage.setItem('pulpWars.save.v7r6.current', 'old-v7r6-bytes');
      localStorage.setItem('pulpWars.save.v7r7.current', 'old-v7r7-bytes');
      localStorage.setItem('pulpWars.save.v7r8.current', 'old-v7r8-bytes');
      localStorage.setItem('pulpWars.save.v7r9.current', 'old-v7r9-bytes');
      localStorage.setItem('pulpWars.save.v7r10.current', 'old-v7r10-bytes');
      localStorage.setItem('pulpWars.save.v7r11.current', 'old-v7r11-bytes');
      localStorage.setItem('pulpWars.save.v7r12.current', 'old-v7r12-bytes');
      localStorage.setItem('pulpWars.save.v7r13.current', 'old-v7r13-bytes');
      localStorage.setItem('pulpWars.save.v7r14.current', 'old-v7r14-bytes');
      localStorage.setItem('pulpWars.save.v7r15.current', 'old-v7r15-bytes');
      localStorage.setItem('pulpWars.save.v7r16.current', 'old-v7r16-bytes');
      localStorage.setItem('pulpWars.save.v7r17.current', 'old-v7r17-bytes');
      localStorage.setItem('pulpWars.save.v7r18.current', 'old-v7r18-bytes');
      localStorage.setItem('pulpWars.save.v7r19.current', 'old-v7r19-bytes');
      localStorage.setItem('pulpWars.save.v7r20.current', 'old-v7r20-bytes');
      localStorage.setItem('pulpWars.save.v7r21.current', 'old-v7r21-bytes');
      localStorage.setItem('pulpWars.save.v7r22.current', 'old-v7r22-bytes');
      localStorage.setItem('pulpWars.save.v7r23.current', 'old-v7r23-bytes');
      localStorage.setItem('pulpWars.save.v7r24.current', 'old-v7r24-bytes');
      localStorage.setItem('pulpWars.save.v7r25.current', 'old-v7r25-bytes');
      localStorage.setItem('pulpWars.save.v7r26.current', 'old-v7r26-bytes');
      localStorage.setItem('pulpWars.save.v7r27.current', 'old-v7r27-bytes');
      localStorage.setItem('pulpWars.save.v7r28.current', 'old-v7r28-bytes');
      localStorage.setItem('pulpWars.save.v7r29.current', 'old-v7r29-bytes');
      localStorage.setItem('pulpWars.save.v7r30.current', 'old-v7r30-bytes');
      localStorage.setItem('pulpWars.save.v7r31.current', 'old-v7r31-bytes');
      localStorage.setItem('pulpWars.save.v7r32.current', 'old-v7r32-bytes');
      localStorage.setItem('pulpWars.save.v7r33.current', 'old-v7r33-bytes');
      localStorage.setItem('pulpWars.save.v7r34.current', 'old-v7r34-bytes');
      localStorage.setItem('pulpWars.save.v7r35.current', 'old-v7r35-bytes');
      localStorage.setItem('pulpWars.save.v7r36.current', 'old-v7r36-bytes');
      localStorage.setItem('pulpWars.save.v7r37.current', 'old-v7r37-bytes');
      localStorage.setItem('pulpWars.save.v7r38.current', 'old-v7r38-bytes');
      localStorage.setItem('pulpWars.save.v7r39.current', 'old-v7r39-bytes');
      localStorage.setItem('pulpWars.save.v7r40.current', 'old-v7r40-bytes');
      localStorage.setItem('pulpWars.save.v7r41.current', 'old-v7r41-bytes');
      localStorage.setItem('pulpWars.save.v7r42.current', 'old-v7r42-bytes');
      localStorage.setItem('pulpWars.save.v7r44.current', 'old-v7r44-bytes');
      localStorage.setItem('pulpWars.save.current', 'v6-bytes');
      localStorage.setItem('pulpWars.settings.v1', JSON.stringify({ format: 'pulp-wars-settings', version: 1, settings: { uiScale: 1, motion: 'REDUCED', animationSpeed: 'NORMAL', highContrast: false } }));
      localStorage.setItem('pulpWars.unrelated', 'unrelated-bytes');
      localStorage.setItem(${JSON.stringify(CAMPAIGN_KEY_V7)}, ${JSON.stringify(SEEDED_CAMPAIGN_PROGRESS_V7)});
    })()`,
  );
  await reloadAndWaitForFreshDocument(
    connection,
    "obsolete-save cleanup",
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller !== undefined`,
  );
  // The title screen (pulp_wars-2yc.18): the menu's buttons lie over the
  // scene, New game is selected, the arrow keys move and Enter opens the
  // setup form with focus on its way back.
  const titleScreen = await evaluate<{
    readonly actions: readonly string[];
    readonly focused: string | null;
    readonly overScene: boolean;
    readonly inside: boolean;
    readonly formHidden: boolean;
    readonly overflow: number;
  }>(
    connection,
    `(() => {
      const menu = document.querySelector('nav.v7-main-menu');
      const buttons = [...(menu?.querySelectorAll('button') ?? [])];
      const scene = document.querySelector('.v7-title-scene')?.getBoundingClientRect();
      const rects = buttons.map((button) => button.getBoundingClientRect());
      return {
        actions: buttons.map((button) => button.dataset.action ?? ''),
        focused: document.activeElement?.dataset?.action ?? null,
        overScene: scene !== undefined && scene.width >= innerWidth && scene.height >= innerHeight && rects.every((rect) => rect.left >= scene.left && rect.right <= scene.right && rect.top >= scene.top && rect.bottom <= scene.bottom),
        inside: rects.every((rect) => rect.width >= 200 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight),
        formHidden: document.querySelector('.v7-setup-form')?.closest('[hidden]') !== null && document.querySelector('.v7-front-panel') === null,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    })()`,
  );
  if (
    titleScreen.actions.join() !== "new-game,campaign,gallery,front-settings" ||
    titleScreen.focused !== "new-game" ||
    !titleScreen.overScene ||
    !titleScreen.inside ||
    !titleScreen.formHidden ||
    titleScreen.overflow > 0
  )
    throw new Error(
      `title screen is not a menu over the scene: ${JSON.stringify(titleScreen)}`,
    );
  await pressKey(connection, "ArrowDown", "ArrowDown");
  await pressKey(connection, "ArrowUp", "ArrowUp");
  await pressKey(connection, "ArrowUp", "ArrowUp");
  const wrapped = await evaluate<string | null>(
    connection,
    `document.activeElement?.dataset?.action ?? null`,
  );
  if (wrapped !== "front-settings")
    throw new Error(`menu arrow keys did not wrap to Settings: ${wrapped}`);
  await pressKey(connection, "Home", "Home");
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    text: "\r",
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
    `${SETUP_OPEN_V7} && document.activeElement?.dataset?.action === 'front-back'`,
  );
  await evaluate(
    connection,
    `(() => {
      const controller = globalThis.__PULP_WARS_APP__.controller;
      globalThis.__V7_COUNT_CONTROL__ = document.querySelector('#v7-ai-count');
      globalThis.__V7_SMOKE_TRACE__ = [];
      globalThis.__V7_HOST_TICKS__ = 0;
      globalThis.__V7_HOST_INTERVAL__ = setInterval(() => {
        globalThis.__V7_HOST_TICKS__ += 1;
      }, 0);
      controller.subscribe((snapshot) => {
        globalThis.__V7_SMOKE_TRACE__.push({
          phase: snapshot.phase,
          transitioning: snapshot.transitioning,
          commandIndex: snapshot.view?.commandIndex ?? -1,
          viewerId: snapshot.view?.viewer.id ?? null,
          activePlayerId: snapshot.view?.turnOrder[snapshot.view.activeSeatIndex] ?? null,
          humanCoins: snapshot.view?.viewer.coins ?? null,
          projectedViewerId: controller.exportSafeLog === undefined
            ? null
            : JSON.parse(controller.exportSafeLog()?.source ?? '{}').log?.eventBatches?.at(-1)?.viewerId ?? null,
          aiActive: snapshot.ai.active,
          fastForward: snapshot.ai.fastForward,
        });
      });
    })()`,
  );
  // The way back ("Menu") comes first in the reading order, then Opponents.
  await pressKey(connection, "Tab", "Tab");
  await typeSelectValue(connection, "#v7-ai-count", "2");
  await pressKey(connection, "Tab", "Tab");
  const focusAfterSelect = await evaluate<{
    readonly id: string | null;
    readonly sameCountControl: boolean;
  }>(
    connection,
    `({ id: document.activeElement?.id ?? null, sameCountControl: document.querySelector('#v7-ai-count') === globalThis.__V7_COUNT_CONTROL__ })`,
  );
  if (
    focusAfterSelect.id !== "v7-ai-mode" ||
    !focusAfterSelect.sameCountControl
  )
    throw new Error(
      `select change replaced keyboard focus/control: ${JSON.stringify(focusAfterSelect)}`,
    );
  await pressKey(connection, "Tab", "Tab", 8);
  await typeSelectValue(connection, "#v7-ai-count", "1");
  await pressKey(connection, "Tab", "Tab");
  await pressKey(connection, "Tab", "Tab");
  await typeSelectValue(connection, "#v7-board-size", "11");
  await replaceSeedInput(connection, "6");
  await launchWithFastForward(connection);
  await waitForExpression(
    connection,
    `(() => {
      const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot();
      const view = snapshot?.view;
      return snapshot?.phase === 'ACTIVE' && !snapshot.transitioning && !snapshot.ai.active && view?.commandIndex > 0 && view.turnOrder[view.activeSeatIndex] === view.humanPlayerId;
    })()`,
    900,
  );

  const preview = await evaluate<PreviewEvidenceV7>(
    connection,
    `(() => {
      clearInterval(globalThis.__V7_HOST_INTERVAL__);
      const controller = globalThis.__PULP_WARS_APP__.controller;
      const snapshot = controller.snapshot();
      const trace = globalThis.__V7_SMOKE_TRACE__;
      const initial = trace.find((entry) => entry.commandIndex === 0 && entry.viewerId !== null && !entry.transitioning);
      if (!initial) throw new Error('command-zero public trace missing');
      const view = snapshot.view;
      if (!view) throw new Error('returned public view missing');
      const save = JSON.parse(localStorage.getItem('pulpWars.save.v7r69.current') ?? 'null');
      const safe = JSON.parse(controller.exportSafeLog()?.source ?? 'null');
      const debug = controller.exportDebugBundle({ acknowledgeHiddenInformation: true });
      if (!debug.ok) throw new Error('spoiler debug export missing');
      return {
        initial: {
          viewerId: initial.viewerId,
          activePlayerId: initial.activePlayerId,
          humanCoins: initial.humanCoins,
          commandIndex: initial.commandIndex,
          projectedViewerId: initial.projectedViewerId,
        },
        returned: {
          viewerId: view.viewer.id,
          activePlayerId: view.turnOrder[view.activeSeatIndex],
          humanCoins: view.viewer.coins,
          commandIndex: view.commandIndex,
          policySlices: snapshot.ai.policySlices,
          maximumSliceMilliseconds: snapshot.ai.maximumSliceMilliseconds,
          fastForwardObserved: trace.some((entry) => entry.fastForward),
          hostTicks: globalThis.__V7_HOST_TICKS__,
        },
        persisted: {
          version: save?.version,
          rulesetId: save?.rulesetId,
          commandIndex: save?.commandIndex,
        },
        ordinaryBoundary: {
          controllerOwnProperties: Object.getOwnPropertyNames(controller),
          snapshotHasStateHash: Object.hasOwn(snapshot, 'stateHash'),
          snapshotHasReplay: Object.hasOwn(snapshot, 'replay'),
          publicPlayersLeakPrivateState: view.players.some((player) => 'coins' in player || 'researchedTechs' in player || 'achievementEntitlements' in player),
        },
        exports: {
          safeClassification: safe?.log?.classification,
          safeViewerId: safe?.log?.viewerId,
          debugClassification: debug.bundle.classification,
          debugWarning: debug.bundle.warning,
        },
      };
    })()`,
  );
  validatePreview(preview);
  if (!deployed) await capture(connection, "desktop-ai-return.png");

  const cold = deployed
    ? null
    : await evaluate<ColdPolicyEvidenceV7>(
        connection,
        `(async () => {
      const [{ NormalPolicyWorkV7 }, { upgradeRetainedPublicViewV7 }] = await Promise.all([
        import('/src/ai/index.ts'),
        import('/scripts/ruleset-v7-late-public-view-contract.ts'),
      ]);
      const response = await fetch(${JSON.stringify(RULESET7_LATE_PUBLIC_VIEW_FIXTURE_URL)}, { cache: 'no-store' });
      if (!response.ok) throw new Error('late public fixture unavailable');
      const retainedLandView = await response.json();
      const view = upgradeRetainedPublicViewV7(retainedLandView);
      const deepFreeze = (value) => {
        if (value && typeof value === 'object') {
          for (const child of Object.values(value)) deepFreeze(child);
          Object.freeze(value);
        }
        return value;
      };
      deepFreeze(view);
      const work = new NormalPolicyWorkV7(view);
      let callbacks = 0;
      let hostTicks = 0;
      let maximumCallbackMilliseconds = 0;
      let decision = null;
      const progress = document.querySelector('[data-v7-ai-progress]');
      const ordinaryProgressText = progress?.textContent ?? null;
      const heartbeat = setInterval(() => { hostTicks += 1; }, 0);
      const totalStarted = performance.now();
      await new Promise((resolve, reject) => {
        const advance = () => {
          const started = performance.now();
          try {
            decision = work.runSlice(4);
            callbacks += 1;
            if (progress) progress.textContent = 'Cold late-view policy slice ' + callbacks;
            maximumCallbackMilliseconds = Math.max(maximumCallbackMilliseconds, performance.now() - started);
            if (decision !== null) resolve();
            else setTimeout(advance, 0);
          } catch (error) {
            reject(error);
          }
        };
        setTimeout(advance, 0);
      });
      clearInterval(heartbeat);
      if (progress && ordinaryProgressText !== null) progress.textContent = ordinaryProgressText;
      return {
        commandIndex: view.commandIndex,
        callbacks,
        hostTicks,
        maximumCallbackMilliseconds,
        totalMilliseconds: performance.now() - totalStarted,
        decisionKind: decision?.command?.kind ?? null,
      };
    })()`,
        true,
      );
  if (cold !== null) validateColdPolicy(cold);
  const version = (await connection.send("Browser.getVersion")) as {
    readonly product?: string;
  };
  const timing = collectBrowserTimingV7(preview, cold);
  await writeFile(
    path.join(reviewRoot, "timing.json"),
    await format(
      JSON.stringify({
        schemaVersion: 1,
        recordedAt: new Date().toISOString(),
        mode: timingMode,
        browser: version.product ?? "Chrome",
        url: baseUrl,
        bundle: deployed ? "BUILT" : "DEVELOPMENT",
        machine: {
          platform: platform(),
          release: release(),
          architecture: arch(),
          cpu: cpus()[0]?.model ?? "unknown",
          logicalCpus: cpus().length,
          loadAverage: loadavg(),
        },
        ...timing,
        production: preview.returned,
        cold,
        note: "Callback wall times are host-dependent observations. Functional acceptance is separate; strict reference performance acceptance requires --performance or --archive-evidence.",
      }),
      { parser: "json" },
    ),
  );
  if (timing.status === "EXCEEDED")
    console.warn(
      `PERFORMANCE EXCEEDED: ${timing.budgetMilliseconds}ms callback budget; production ${timing.productionMaximumMilliseconds.toFixed(1)}ms, cold ${timing.coldMaximumMilliseconds === null ? "not measured" : `${timing.coldMaximumMilliseconds.toFixed(1)}ms`}. ${timingMode === "STRICT" ? "Strict performance acceptance will fail." : "Functional checks continue; this run does not pass performance acceptance."} Evidence: ${path.join(reviewRoot, "timing.json")}`,
    );

  const firstDebugHash = await evaluate<string>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.exportDebugBundle({ acknowledgeHiddenInformation: true }).bundle.payload.reproduction.save.stateHash`,
  );

  const beforeEndTurn = preview.returned.commandIndex;
  await touchClick(connection, '[data-action="end-turn"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.commandIndex > ${beforeEndTurn} && v.turnOrder[v.activeSeatIndex] === v.humanPlayerId; })()`,
    900,
  );
  const menuBoundary = await evaluate<{
    readonly commandIndex: number;
    readonly stateHash: string;
  }>(
    connection,
    `(() => { const controller = globalThis.__PULP_WARS_APP__.controller; return { commandIndex: controller.snapshot().view.commandIndex, stateHash: controller.exportDebugBundle({ acknowledgeHiddenInformation: true }).bundle.payload.reproduction.save.stateHash }; })()`,
  );
  await openCompactMenuItem(connection, "main-menu");
  await waitForExpression(
    connection,
    `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const panel = document.querySelector('.v7-front-screen'); const resume = document.querySelector('[data-action="resume"]'); if (snapshot?.phase !== 'RESUMABLE' || snapshot.view === null || !(panel instanceof HTMLElement) || !(resume instanceof HTMLButtonElement) || resume.disabled) return false; const rect = resume.getBoundingClientRect(); return panel.contains(resume) && resume.closest('nav.v7-main-menu') !== null && resume.querySelector('.v7-menu-button-label')?.textContent === 'Continue' && document.activeElement === resume && rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight; })()`,
  );
  const resumableBoundary = await evaluate<{
    readonly commandIndex: number;
    readonly stateHash: string;
  }>(
    connection,
    `(() => { const controller = globalThis.__PULP_WARS_APP__.controller; return { commandIndex: controller.snapshot().view.commandIndex, stateHash: controller.exportDebugBundle({ acknowledgeHiddenInformation: true }).bundle.payload.reproduction.save.stateHash }; })()`,
  );
  if (
    resumableBoundary.commandIndex !== menuBoundary.commandIndex ||
    resumableBoundary.stateHash !== menuBoundary.stateHash
  )
    throw new Error("Main menu changed the accepted boundary");
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && s.view?.commandIndex === ${menuBoundary.commandIndex} && s.view.turnOrder[s.view.activeSeatIndex] === s.view.humanPlayerId; })()`,
  );
  const resumedHash = await evaluate<string>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.exportDebugBundle({ acknowledgeHiddenInformation: true }).bundle.payload.reproduction.save.stateHash`,
  );
  if (resumedHash !== menuBoundary.stateHash)
    throw new Error("Resume changed the accepted boundary");

  await openCompactSettings(connection);
  await touchClick(connection, '[data-action="restart"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.commandIndex > 0 && v.turnOrder[v.activeSeatIndex] === v.humanPlayerId; })()`,
    900,
  );
  const restartedHash = await evaluate<string>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.exportDebugBundle({ acknowledgeHiddenInformation: true }).bundle.payload.reproduction.save.stateHash`,
  );
  if (restartedHash !== firstDebugHash)
    throw new Error("restart changed deterministic v7 state");

  const resumeIndex = await evaluate<number>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex`,
  );
  await reloadAndWaitForFreshDocument(
    connection,
    "resume persistence",
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && s.view?.commandIndex === ${resumeIndex}; })()`,
  );
  await openCompactSettings(connection);
  await touchClick(connection, '[data-action="delete-save"]');
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  const keys = await evaluate<{
    readonly current: string | null;
    readonly oldV7: string | null;
    readonly oldV7r2: string | null;
    readonly oldV7r3: string | null;
    readonly oldV7r4: string | null;
    readonly oldV7r5: string | null;
    readonly oldV7r6: string | null;
    readonly oldV7r7: string | null;
    readonly oldV7r8: string | null;
    readonly oldV7r9: string | null;
    readonly oldV7r10: string | null;
    readonly oldV7r11: string | null;
    readonly oldV7r12: string | null;
    readonly oldV7r13: string | null;
    readonly oldV7r14: string | null;
    readonly oldV7r15: string | null;
    readonly oldV7r16: string | null;
    readonly oldV7r17: string | null;
    readonly oldV7r18: string | null;
    readonly oldV7r19: string | null;
    readonly oldV7r20: string | null;
    readonly oldV7r21: string | null;
    readonly oldV7r22: string | null;
    readonly oldV7r23: string | null;
    readonly oldV7r24: string | null;
    readonly oldV7r25: string | null;
    readonly oldV7r26: string | null;
    readonly oldV7r27: string | null;
    readonly oldV7r28: string | null;
    readonly oldV7r29: string | null;
    readonly oldV7r30: string | null;
    readonly oldV7r31: string | null;
    readonly oldV7r32: string | null;
    readonly oldV7r33: string | null;
    readonly oldV7r34: string | null;
    readonly oldV7r35: string | null;
    readonly oldV7r36: string | null;
    readonly oldV7r37: string | null;
    readonly oldV7r38: string | null;
    readonly oldV7r39: string | null;
    readonly oldV7r40: string | null;
    readonly oldV7r41: string | null;
    readonly oldV7r42: string | null;
    readonly oldV7r44: string | null;
    readonly v6: string | null;
    readonly settings: string | null;
    readonly unrelated: string | null;
    readonly campaign: string | null;
  }>(
    connection,
    `({ campaign: localStorage.getItem(${JSON.stringify(CAMPAIGN_KEY_V7)}), current: localStorage.getItem('pulpWars.save.v7r69.current'), oldV7: localStorage.getItem('pulpWars.save.v7.current'), oldV7r2: localStorage.getItem('pulpWars.save.v7r2.current'), oldV7r3: localStorage.getItem('pulpWars.save.v7r3.current'), oldV7r4: localStorage.getItem('pulpWars.save.v7r4.current'), oldV7r5: localStorage.getItem('pulpWars.save.v7r5.current'), oldV7r6: localStorage.getItem('pulpWars.save.v7r6.current'), oldV7r7: localStorage.getItem('pulpWars.save.v7r7.current'), oldV7r8: localStorage.getItem('pulpWars.save.v7r8.current'), oldV7r9: localStorage.getItem('pulpWars.save.v7r9.current'), oldV7r10: localStorage.getItem('pulpWars.save.v7r10.current'), oldV7r11: localStorage.getItem('pulpWars.save.v7r11.current'), oldV7r12: localStorage.getItem('pulpWars.save.v7r12.current'), oldV7r13: localStorage.getItem('pulpWars.save.v7r13.current'), oldV7r14: localStorage.getItem('pulpWars.save.v7r14.current'), oldV7r15: localStorage.getItem('pulpWars.save.v7r15.current'), oldV7r16: localStorage.getItem('pulpWars.save.v7r16.current'), oldV7r17: localStorage.getItem('pulpWars.save.v7r17.current'), oldV7r18: localStorage.getItem('pulpWars.save.v7r18.current'), oldV7r19: localStorage.getItem('pulpWars.save.v7r19.current'), oldV7r20: localStorage.getItem('pulpWars.save.v7r20.current'), oldV7r21: localStorage.getItem('pulpWars.save.v7r21.current'), oldV7r22: localStorage.getItem('pulpWars.save.v7r22.current'), oldV7r23: localStorage.getItem('pulpWars.save.v7r23.current'), oldV7r24: localStorage.getItem('pulpWars.save.v7r24.current'), oldV7r25: localStorage.getItem('pulpWars.save.v7r25.current'), oldV7r26: localStorage.getItem('pulpWars.save.v7r26.current'), oldV7r27: localStorage.getItem('pulpWars.save.v7r27.current'), oldV7r28: localStorage.getItem('pulpWars.save.v7r28.current'), oldV7r29: localStorage.getItem('pulpWars.save.v7r29.current'), oldV7r30: localStorage.getItem('pulpWars.save.v7r30.current'), oldV7r31: localStorage.getItem('pulpWars.save.v7r31.current'), oldV7r32: localStorage.getItem('pulpWars.save.v7r32.current'), oldV7r33: localStorage.getItem('pulpWars.save.v7r33.current'), oldV7r34: localStorage.getItem('pulpWars.save.v7r34.current'), oldV7r35: localStorage.getItem('pulpWars.save.v7r35.current'), oldV7r36: localStorage.getItem('pulpWars.save.v7r36.current'), oldV7r37: localStorage.getItem('pulpWars.save.v7r37.current'), oldV7r38: localStorage.getItem('pulpWars.save.v7r38.current'), oldV7r39: localStorage.getItem('pulpWars.save.v7r39.current'), oldV7r40: localStorage.getItem('pulpWars.save.v7r40.current'), oldV7r41: localStorage.getItem('pulpWars.save.v7r41.current'), oldV7r42: localStorage.getItem('pulpWars.save.v7r42.current'), oldV7r44: localStorage.getItem('pulpWars.save.v7r44.current'), v6: localStorage.getItem('pulpWars.save.current'), settings: localStorage.getItem('pulpWars.settings.v1'), unrelated: localStorage.getItem('pulpWars.unrelated') })`,
  );
  if (
    keys.current !== null ||
    keys.oldV7 !== null ||
    keys.oldV7r2 !== null ||
    keys.oldV7r3 !== null ||
    keys.oldV7r4 !== null ||
    keys.oldV7r5 !== null ||
    keys.oldV7r6 !== null ||
    keys.oldV7r7 !== null ||
    keys.oldV7r8 !== null ||
    keys.oldV7r9 !== null ||
    keys.oldV7r10 !== null ||
    keys.oldV7r11 !== null ||
    keys.oldV7r12 !== null ||
    keys.oldV7r13 !== null ||
    keys.oldV7r14 !== null ||
    keys.oldV7r15 !== null ||
    keys.oldV7r16 !== null ||
    keys.oldV7r17 !== null ||
    keys.oldV7r18 !== null ||
    keys.oldV7r19 !== null ||
    keys.oldV7r20 !== null ||
    keys.oldV7r21 !== null ||
    keys.oldV7r22 !== null ||
    keys.oldV7r23 !== null ||
    keys.oldV7r24 !== null ||
    keys.oldV7r25 !== null ||
    keys.oldV7r26 !== null ||
    keys.oldV7r27 !== null ||
    keys.oldV7r28 !== null ||
    keys.oldV7r29 !== null ||
    keys.oldV7r30 !== null ||
    keys.oldV7r31 !== null ||
    keys.oldV7r32 !== null ||
    keys.oldV7r33 !== null ||
    keys.oldV7r34 !== null ||
    keys.oldV7r35 !== null ||
    keys.oldV7r36 !== null ||
    keys.oldV7r37 !== null ||
    keys.oldV7r38 !== null ||
    keys.oldV7r39 !== null ||
    keys.oldV7r40 !== null ||
    keys.oldV7r41 !== null ||
    keys.oldV7r42 !== null ||
    keys.oldV7r44 !== null ||
    keys.v6 !== "v6-bytes" ||
    JSON.parse(keys.settings ?? "null")?.settings?.motion !== "REDUCED" ||
    keys.unrelated !== "unrelated-bytes" ||
    // Campaign progress (pulp_wars-68k.5) is not a save: it survives the
    // obsolete-key cleanup and Delete save.
    keys.campaign !== SEEDED_CAMPAIGN_PROGRESS_V7
  )
    throw new Error(`route-owned delete failed: ${JSON.stringify(keys)}`);

  let outcome: OutcomeEvidenceV7 | null = null;
  let pendingReleaseEvidence: string | null = null;
  if (!deployed) {
    await openNewGame(connection);
    await replaceSeedInput(connection, "6");
    await launchWithFastForward(connection);
    outcome = await driveDefaultMatchToOutcome(connection);
    await waitForExpression(
      connection,
      `document.querySelector('[data-v7-region="results"]') !== null`,
    );
    // Bead pulp_wars-2yc.6: a whole match, in which every unit type that
    // was trained appeared for the first time, loaded no raster on demand.
    await assertPreloadedV7(
      { evaluate: (expression) => evaluate(connection, expression) },
      "the default match",
    );
    await capture(connection, "default-v7-outcome-desktop.png");
    // Bead pulp_wars-2yc.18: the end dialog offers Play again and Main
    // menu; Main menu clears the finished match and shows the title screen.
    const endActions = await evaluate<readonly string[]>(
      connection,
      `[...document.querySelectorAll('[data-v7-region="results"] button')].map((button) => \`\${button.dataset.action}:\${button.textContent}\`)`,
    );
    if (endActions.join() !== "restart:Play again,results-menu:Main menu")
      throw new Error(
        `end dialog actions are wrong: ${JSON.stringify(endActions)}`,
      );
    await pointerClick(connection, '[data-action="results-menu"]');
    await waitForExpression(
      connection,
      `(() => { const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return snapshot?.phase === 'EMPTY' && snapshot.view === null && localStorage.getItem('pulpWars.save.v7r69.current') === null && document.querySelector('.v7-match-root') === null && document.querySelector('[data-v7-region="results"]') === null && document.querySelector('nav.v7-main-menu [data-action="new-game"]') !== null && document.querySelector('[data-action="resume"]') === null && document.activeElement?.dataset?.action === 'new-game'; })()`,
    );
    const artifacts = {
      "desktop-ai-return.png": await fileSha256(
        path.join(reviewRoot, "desktop-ai-return.png"),
      ),
      "default-v7-outcome-desktop.png": await fileSha256(
        path.join(reviewRoot, "default-v7-outcome-desktop.png"),
      ),
    };
    pendingReleaseEvidence = await format(
      JSON.stringify({
        schemaVersion: 1,
        status: "PASS",
        acceptance:
          timingMode === "STRICT" ? "FUNCTIONAL_AND_TIMING" : "FUNCTIONAL",
        timing: { mode: timingMode, ...timing },
        rulesetId: "pulp-wars-poc-7r69",
        runtimeFingerprint: browserReleaseRuntimeFingerprintV7(process.cwd()),
        productionEntry: "src/main.ts",
        route: "DEFAULT_NO_RULESET_PARAMETER",
        controllerBoundary:
          "PUBLIC_SNAPSHOT_OFFERED_COMMANDS_AND_PRODUCTION_DOM_CONTROLS_ONLY",
        setup: {
          seed: 6,
          aiCount: 1,
          aiMode: "RIVAL",
          // pulp_wars-w5j.1: the distinct default factions.
          factions: ["ORIGINAL", "UNDEAD"],
        },
        outcome,
        persistence: {
          launch: true,
          restartSameHash: true,
          resumeSameCommandIndex: true,
          routeOwnedDelete: true,
          obsoleteV7KeysRemoved: true,
          v6KeyPreserved: true,
          settingsAndUnrelatedKeysPreserved: true,
          campaignProgressKeyPreserved: true,
        },
        compatibility: {
          explicitRuleset6OriginalAndCandy: true,
          unsupportedRouteTouchesNoStorage: true,
        },
        note: "Natural production match: the human used only offered End Turn and reward buttons while the shipped Normal AI played every non-human command.",
        artifacts,
      }),
      { parser: "json" },
    );
  }

  const chibi = await probeChibiArtSet(connection);
  const undead = await probeUndeadSetup(connection);
  const goblin = await probeGoblinMatch(connection);
  const dinosaur = await probeDinosaurMatch(connection);
  const martian = await probeMartianMatch(connection);
  const iceFolk = await probeIceFolkMatch(connection);
  const dwarf = await probeDwarfMatch(connection);
  // Bead pulp_wars-kaw6.4: a Perfection game started from the new-game
  // screen's mode toggle and tribe grid.
  const perfection = await probePerfectionStart(connection);
  // Bead pulp_wars-737.6: the map curiosities on their UI fixture (dev
  // server only; the Showcase probe then loads a fresh front screen).
  const curiosities = deployed
    ? "fixture skipped on the deployed bundle"
    : await probeCuriositiesV7({
        evaluate: (expression, awaitPromise) =>
          evaluate(connection, expression, awaitPromise),
        waitForExpression: (expression, attempts) =>
          waitForExpression(connection, expression, attempts),
        pointerClick: (selector) => pointerClick(connection, selector),
        capture: (name) => capture(connection, name),
      });
  // Bead pulp_wars-jdb.6: the Candy markers, the Sugar Rush and a Re-bake
  // on the Candy UI fixture (dev server only, like the curiosities).
  const candy = deployed
    ? "fixture skipped on the deployed bundle"
    : await probeCandyV7({
        evaluate: (expression, awaitPromise) =>
          evaluate(connection, expression, awaitPromise),
        waitForExpression: (expression, attempts) =>
          waitForExpression(connection, expression, attempts),
        pointerClick: (selector) => pointerClick(connection, selector),
        capture: (name) => capture(connection, name),
      });
  // Bead pulp_wars-gl1: the research prompt of a Fruit on its fixture (dev
  // server only, like the curiosities).
  const researchPrompt = deployed
    ? "fixture skipped on the deployed bundle"
    : await probeResearchPromptV7({
        evaluate: (expression, awaitPromise) =>
          evaluate(connection, expression, awaitPromise),
        waitForExpression: (expression, attempts) =>
          waitForExpression(connection, expression, attempts),
        pointerClick: (selector) => pointerClick(connection, selector),
        pressEscape: () => pressKey(connection, "Escape", "Escape"),
        capture: (name) => capture(connection, name),
      });
  // Bead pulp_wars-2yc.10: the sound toggle in Settings and the sounds an
  // attack asks for, on the Undead fixture (dev server only, likewise).
  const sound = deployed
    ? "fixture skipped on the deployed bundle"
    : await probeSoundV7({
        evaluate: (expression, awaitPromise) =>
          evaluate(connection, expression, awaitPromise),
        waitForExpression: (expression, attempts) =>
          waitForExpression(connection, expression, attempts),
        pointerClick: (selector) => pointerClick(connection, selector),
        pressEscape: () => pressKey(connection, "Escape", "Escape"),
        openCompactMenuItem: (action) =>
          openCompactMenuItem(connection, action),
        capture: (name) => capture(connection, name),
      });
  // Bead pulp_wars-2yc.6: the sound step's match and Settings (the sound
  // panel is drawn without rasters) loaded nothing on demand either.
  if (!deployed)
    await assertPreloadedV7(
      { evaluate: (expression) => evaluate(connection, expression) },
      "the sound step",
    );
  const showcase = await probeShowcaseMatch(connection);
  // Bead pulp_wars-ic8: the Gallery from the fresh front screen.
  const gallery = await probeGalleryV7({
    evaluate: (expression) => evaluate(connection, expression),
    waitForExpression: (expression, attempts) =>
      waitForExpression(connection, expression, attempts),
    pointerClick: (selector) => pointerClick(connection, selector),
    pressEscape: () => pressKey(connection, "Escape", "Escape"),
    capture: (name) => capture(connection, name),
  });
  // Bead pulp_wars-ykw.5: the most players on the smallest Dry Land board,
  // one End Turn at normal speed, from the fresh front screen the Gallery
  // probe returns to; it leaves a fresh front screen for the campaign.
  const manySeats = await probeManySeatsV7({
    evaluate: (expression, awaitPromise) =>
      evaluate(connection, expression, awaitPromise),
    waitForExpression: (expression, attempts) =>
      waitForExpression(connection, expression, attempts),
    pointerClick: (selector) => pointerClick(connection, selector),
    typeSelectKeys: (selector, keys, value) =>
      typeSelectKeys(connection, selector, keys, value),
    openCompactMenuItem: (action) => openCompactMenuItem(connection, action),
    capture: (name) => capture(connection, name),
  });
  // Bead pulp_wars-2yc.6: every faction has just been on the board for the
  // first time on this page (the seats' emblems, the units and cities of
  // the most players); none of their rasters was loaded on demand.
  const preload = await assertPreloadedV7(
    { evaluate: (expression) => evaluate(connection, expression) },
    "the many-players match",
  );
  const campaign = await probeCampaign(connection);
  await evaluate(
    connection,
    `localStorage.removeItem('pulpWars.save.current')`,
  );
  await pointerClick(connection, '[data-route="ruleset-6"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-v6-setup]') !== null`,
  );
  const explicitSix = await evaluate<{
    readonly hasOriginal: boolean;
    readonly hasCandy: boolean;
    readonly hasV7Preview: boolean;
  }>(
    connection,
    `(() => { const text = document.body.textContent ?? ''; return { hasOriginal: text.includes('Original'), hasCandy: text.includes('Candy'), hasV7Preview: document.querySelector('[data-v7-setup]') !== null }; })()`,
  );
  if (
    !explicitSix.hasOriginal ||
    !explicitSix.hasCandy ||
    explicitSix.hasV7Preview
  )
    throw new Error(
      `explicit ruleset-6 route failed: ${JSON.stringify(explicitSix)}`,
    );

  await connection.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `(() => {
      globalThis.__V7_UNSUPPORTED_STORAGE_CALLS__ = [];
      for (const method of ['getItem', 'setItem', 'removeItem']) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (...args) {
          globalThis.__V7_UNSUPPORTED_STORAGE_CALLS__.push({ method, key: String(args[0]) });
          return original.apply(this, args);
        };
      }
    })();`,
  });
  const unsupportedUrl = routeUrl(baseUrl, "?ruleset=8");
  await connection.send("Page.navigate", { url: unsupportedUrl });
  await waitForExpression(
    connection,
    `document.querySelector('[data-unsupported-ruleset="8"]') !== null`,
  );
  const unsupported = await evaluate<{
    readonly storageCalls: readonly unknown[];
    readonly appGlobalPresent: boolean;
    readonly diagnostic: string;
  }>(
    connection,
    `({ storageCalls: globalThis.__V7_UNSUPPORTED_STORAGE_CALLS__, appGlobalPresent: Object.hasOwn(globalThis, '__PULP_WARS_APP__'), diagnostic: document.body.textContent ?? '' })`,
  );
  if (
    unsupported.storageCalls.length !== 0 ||
    unsupported.appGlobalPresent ||
    !unsupported.diagnostic.includes("Unsupported ruleset")
  ) {
    throw new Error(
      `unsupported route bootstrap guard failed: ${JSON.stringify(unsupported)}`,
    );
  }

  await delay(200);
  if (browserErrors.length > 0)
    throw new Error(`browser emitted errors: ${JSON.stringify(browserErrors)}`);
  enforceBrowserTimingV7(timing, timingMode);
  if (pendingReleaseEvidence !== null)
    await writeFile(
      path.join(reviewRoot, "evidence.json"),
      pendingReleaseEvidence,
    );
  connection.close();
  await smokeOutput.publish();
  const coldSummary =
    cold === null
      ? "deployed production bundle (no source/test imports)"
      : `cold command-${RULESET7_LATE_PUBLIC_VIEW_COMMAND_INDEX} policy ${cold.callbacks} callbacks/${cold.hostTicks} host ticks/max ${cold.maximumCallbackMilliseconds.toFixed(1)}ms/${cold.totalMilliseconds.toFixed(1)}ms total`;
  const outcomeSummary =
    outcome === null
      ? "bounded launch/End Turn/resume compatibility probe"
      : `natural default match ${outcome.outcome} in round ${outcome.round}/${outcome.commandIndex} commands`;
  console.log(
    `Ruleset-7 browser functional smoke passed in ${version.product ?? "Chrome"}; timing ${timing.status} (${timingMode}, ${timing.budgetMilliseconds}ms budget): production AI ${preview.returned.commandIndex} commands/${preview.returned.policySlices} slices/max ${preview.returned.maximumSliceMilliseconds.toFixed(1)}ms; ${coldSummary}; ${outcomeSummary}; launch/resume/restart/delete, routing and four-key isolation passed; Perfection ${perfection}; research prompt ${researchPrompt}; sound ${sound}; Campaign ${campaign}; art sets ${chibi}; Undead setup ${undead}; Goblin ${goblin}; Dinosaur ${dinosaur}; Martian ${martian}; Ice Folk ${iceFolk}; Dwarf ${dwarf}; Showcase ${showcase}; Gallery ${gallery}. Candy ${candy}. Curiosities ${curiosities}. Many players ${manySeats}; asset preload ${preload}. Evidence: ${reviewRoot}`,
  );
} finally {
  try {
    await stopBrowser(browser);
  } finally {
    await rm(userDataFs, {
      force: true,
      recursive: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  }
}

/**
 * Default CHIBI art set: with fresh storage and no `art` parameter Ruleset 7
 * boots on the 80 px CHIBI cell with discrete zoom steps and paints accepted
 * chibi rasters without persisting a choice. `?art=legacy` selects and
 * persists the LEGACY opt-out, which a later parameterless load respects;
 * `?art=chibi` persists CHIBI again, and the probe then resets storage to the
 * default so later probes start fresh.
 */
async function probeChibiArtSet(connection: Connection): Promise<string> {
  const launchSelector = '[data-action="launch"]';
  const canvasSelector = "canvas.board-canvas-v7";
  const artKey = "pulpWars.ruleset7.artSet.v1";
  const saveKey = "pulpWars.save.v7r69.current";
  const artUrl = (value: string | null): string => {
    const url = new URL(baseUrl);
    if (value === null) url.searchParams.delete("art");
    else url.searchParams.set("art", value);
    return url.href;
  };
  const navigateFresh = async (
    url: string,
    readiness: string,
  ): Promise<void> => {
    await evaluate(connection, `globalThis.__V7_CHIBI_PRIOR_DOCUMENT__ = true`);
    await connection.send("Page.navigate", { url });
    await waitForExpression(
      connection,
      `globalThis.__V7_CHIBI_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  // Every fresh setup opens on "New map" with the seed field hidden; the art
  // probes launch that default, so each of their maps is a new random one.
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY' && document.querySelector('.v7-seed-choice')?.dataset.seedMode === 'new' && document.querySelector('#v7-seed')?.closest('label')?.hidden === true`;
  const activeWithArt = (artSet: string): string =>
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && document.querySelector(${JSON.stringify(canvasSelector)})?.dataset.artSet === ${JSON.stringify(artSet)}; })()`;
  const storedArt = (): Promise<string | null> =>
    evaluate<string | null>(
      connection,
      `localStorage.getItem(${JSON.stringify(artKey)})`,
    );

  // Fresh storage and no parameter: the CHIBI default, not persisted.
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)}); localStorage.removeItem(${JSON.stringify(artKey)})`,
  );
  await navigateFresh(artUrl(null), freshSetup);
  await openNewGame(connection);
  await pointerClick(connection, launchSelector);
  await waitForExpression(connection, activeWithArt("CHIBI"), 900);
  // Wait until accepted art has loaded and painted beyond the flat fills.
  await waitForExpression(
    connection,
    `(() => { const canvas = document.querySelector(${JSON.stringify(canvasSelector)}); const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data; const colours = new Set(); for (let i = 0; i < data.length; i += 4 * 61) colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]); return colours.size > 64; })()`,
  );
  const evidence = await evaluate<{
    readonly before: { readonly step?: string; readonly tile?: string };
    readonly after: { readonly step?: string; readonly tile?: string };
    readonly stored: string | null;
    readonly chibiDomArt: number;
  }>(
    connection,
    `(() => {
      const canvas = document.querySelector(${JSON.stringify(canvasSelector)});
      const read = () => ({ step: canvas.dataset.zoomStep, tile: canvas.dataset.tileCssPx });
      const before = read();
      canvas.focus();
      canvas.dispatchEvent(new KeyboardEvent('keydown', { key: '+', bubbles: true }));
      const after = read();
      return { before, after, stored: localStorage.getItem(${JSON.stringify(artKey)}), chibiDomArt: document.querySelectorAll('[data-art-set="chibi"]').length };
    })()`,
  );
  const next: Readonly<Record<string, string>> = {
    "0.75": "1",
    "1": "1.5",
  };
  const beforeStep = evidence.before.step ?? "";
  if (
    next[beforeStep] === undefined ||
    Number(evidence.before.tile) !== 80 * Number(beforeStep) ||
    evidence.after.step !== next[beforeStep] ||
    Number(evidence.after.tile) !== 80 * Number(evidence.after.step) ||
    evidence.stored !== null ||
    evidence.chibiDomArt === 0
  )
    throw new Error(
      `default CHIBI art set failed: ${JSON.stringify(evidence)}`,
    );

  // ?art=legacy selects and persists the LEGACY opt-out on the legacy cell.
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(artUrl("legacy"), freshSetup);
  await openNewGame(connection);
  await pointerClick(connection, launchSelector);
  await waitForExpression(connection, activeWithArt("LEGACY"), 900);
  const legacy = await evaluate<{
    readonly step?: string;
    readonly stored: string | null;
  }>(
    connection,
    `({ step: document.querySelector(${JSON.stringify(canvasSelector)}).dataset.zoomStep, stored: localStorage.getItem(${JSON.stringify(artKey)}) })`,
  );
  if (legacy.step !== undefined || legacy.stored !== "LEGACY")
    throw new Error(`?art=legacy opt-out failed: ${JSON.stringify(legacy)}`);

  // Without the parameter, the persisted LEGACY choice still applies.
  await navigateFresh(
    artUrl(null),
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(connection, activeWithArt("LEGACY"), 900);

  // ?art=chibi persists CHIBI again; then reset storage to the default.
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(
    artUrl("chibi"),
    `${freshSetup} && localStorage.getItem(${JSON.stringify(artKey)}) === 'CHIBI'`,
  );
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(artKey)})`,
  );
  if ((await storedArt()) !== null)
    throw new Error("art-set reset failed to clear the stored choice");
  return `default CHIBI zoom ${beforeStep}->${evidence.after.step} at ${evidence.after.tile}px cells with ${evidence.chibiDomArt} chibi DOM images, ?art=legacy persisted and resumed, ?art=chibi persisted, reset`;
}

/**
 * Undead in the default route (pulp_wars-vkq.16): setup always offers a
 * faction per seat with distinct defaults (pulp_wars-w5j.1: every player
 * plays a different faction, so the opponent's select disables the human's
 * faction), an Undead-vs-Human match starts from the production setup and
 * is played to its outcome, the save resumes on the default route,
 * and a replay-valid Undead save resumes to a human turn where the offered
 * Raise Dead command is selected from the keyboard and dispatched from its
 * dock button.
 */
async function probeUndeadSetup(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (
    url: string,
    readiness: string,
  ): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_UNDEAD_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url });
    await waitForExpression(
      connection,
      `globalThis.__V7_UNDEAD_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const saveKey = "pulpWars.save.v7r69.current";
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(
    defaultUrl(),
    `document.querySelector('[data-v7-factions]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  await openNewGame(connection);
  const labels = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('[data-v7-factions] label')).map((label) => label.firstChild?.textContent ?? '')`,
  );
  if (
    JSON.stringify(labels) !==
      JSON.stringify(["Your faction", "Player 2 faction"]) ||
    !(await evaluate<boolean>(
      connection,
      `JSON.stringify(Array.from(document.querySelectorAll('[data-v7-factions] select')).map((field) => field.value)) === '["ORIGINAL","UNDEAD"]' && document.querySelector('#v7-faction-1 option[value="ORIGINAL"]').disabled && !document.querySelector('#v7-faction-0 option[value="UNDEAD"]').disabled`,
    ))
  )
    throw new Error(`Unexpected faction fields: ${JSON.stringify(labels)}`);
  // The tribe grid (pulp_wars-kaw6.4) by keyboard: Undead is picked; the
  // opponent who played Undead switches to the free Human faction.
  await pickTribeV7(connection, "UNDEAD");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-faction-0')?.value === 'UNDEAD' && document.querySelector('#v7-faction-1')?.value === 'ORIGINAL' && document.querySelector('#v7-faction-1 option[value="UNDEAD"]').disabled`,
  );
  await capture(connection, "undead-setup-desktop.png");
  await replaceSeedInput(connection, "6");
  await launchWithFastForward(connection);
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId; })()`,
    900,
  );
  const started = await evaluate<{
    readonly factions: readonly string[];
    readonly viewer: string;
    readonly unitLabel: string | null;
  }>(
    connection,
    `(() => {
      const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view;
      const canvas = document.querySelector('canvas.board-canvas-v7');
      canvas.focus();
      return { factions: view.setup.factions, viewer: view.viewer.faction, unitLabel: null };
    })()`,
  );
  if (
    JSON.stringify(started.factions) !==
      JSON.stringify(["UNDEAD", "ORIGINAL"]) ||
    started.viewer !== "UNDEAD"
  )
    throw new Error(`Undead setup launch failed: ${JSON.stringify(started)}`);
  // The save resumes on a fresh default-route load and keeps its Undead seats.
  await navigateFresh(
    defaultUrl(),
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && JSON.stringify(s.view?.setup.factions) === '["UNDEAD","ORIGINAL"]'; })()`,
    900,
  );
  let outcome = "launch and resume";
  if (!deployed) {
    const result = await driveDefaultMatchToOutcome(connection);
    outcome = `Undead-vs-Human ${result.outcome} in round ${result.round}`;
    await capture(connection, "undead-outcome-desktop.png");
    const scripted = await evaluate<{
      readonly necromancerAt: { readonly x: number; readonly y: number };
      readonly cursorStart: { readonly x: number; readonly y: number };
    }>(
      connection,
      `(async () => {
        const fixtures = await import('/tests/fixtures/v7-undead-ui.ts');
        const save = fixtures.scriptedUndeadRaiseDeadSaveV7(new Date().toISOString());
        localStorage.setItem(${JSON.stringify(saveKey)}, save.source);
        return { necromancerAt: save.necromancerAt, cursorStart: save.cursorStart };
      })()`,
      true,
    );
    await navigateFresh(
      defaultUrl(),
      `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
    );
    await touchClick(connection, '[data-action="resume"]');
    await waitForExpression(
      connection,
      `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && s.offeredCommands.some((command) => command.kind === 'RAISE_DEAD'); })()`,
      900,
    );
    await evaluate(
      connection,
      `document.querySelector('canvas.board-canvas-v7').focus()`,
    );
    const dx = scripted.necromancerAt.x - scripted.cursorStart.x;
    const dy = scripted.necromancerAt.y - scripted.cursorStart.y;
    for (let step = 0; step < Math.abs(dx); step += 1)
      await pressKey(
        connection,
        dx > 0 ? "ArrowRight" : "ArrowLeft",
        dx > 0 ? "ArrowRight" : "ArrowLeft",
      );
    for (let step = 0; step < Math.abs(dy); step += 1)
      await pressKey(
        connection,
        dy > 0 ? "ArrowDown" : "ArrowUp",
        dy > 0 ? "ArrowDown" : "ArrowUp",
      );
    await pressKey(connection, "Enter", "Enter");
    await waitForExpression(
      connection,
      `document.querySelector('.v7-selection-dock h2')?.textContent === 'Necromancer' && document.querySelector('[data-action="command-raise_dead"]:not(:disabled)') !== null`,
    );
    const preview = await evaluate<{
      readonly label: string | null;
      readonly graves: number;
    }>(
      connection,
      `({ label: document.querySelector('[data-action="command-raise_dead"]').getAttribute('aria-label'), graves: globalThis.__PULP_WARS_APP__.controller.snapshot().view.graves.length })`,
    );
    if (
      !/^Raise Dead · \d+ Skeletons? rises? from adjacent Graves at 5 HP$/.test(
        preview.label ?? "",
      )
    )
      throw new Error(`Raise Dead preview missing: ${JSON.stringify(preview)}`);
    await capture(connection, "undead-raise-dead-preview-desktop.png");
    await pointerClick(connection, '[data-action="command-raise_dead"]');
    await waitForExpression(
      connection,
      `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && s.view.graves.length < ${preview.graves} && (document.querySelector('#v7-live')?.textContent ?? '').includes('raised'); })()`,
      300,
    );
    await capture(connection, "undead-raise-dead-result-desktop.png");
    outcome += `; resumed Raise Dead dispatched (${preview.label})`;
    outcome += `; ${await probeAfflictionFixture(connection, defaultUrl())}`;
  }
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(
    defaultUrl(),
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  return outcome;
}

/**
 * Revision 14 (pulp_wars-vkq.19): the Plague and Bitten fixture, mounted on
 * a fixture controller in both art sets, shows its board markers, the dock
 * chips with their explanations, and the explained Disband. The smoke stays
 * desktop-only; phone captures live in `review:ruleset7-undead-ui`. Dev
 * server only: the fixture comes from `tests/fixtures`.
 */
async function probeAfflictionFixture(
  connection: Connection,
  url: string,
): Promise<string> {
  const doubly = { x: 9, y: 7 };
  for (const artSet of ["LEGACY", "CHIBI"] as const) {
    await evaluate(connection, `globalThis.__V7_AFFLICTION_PRIOR__ = true`);
    await connection.send("Page.navigate", { url });
    await waitForExpression(
      connection,
      `globalThis.__V7_AFFLICTION_PRIOR__ !== true && document.readyState === 'complete' && globalThis.__PULP_WARS_APP__ !== undefined`,
    );
    await evaluate(
      connection,
      undeadFixtureMountExpressionV7("afflictionHumanFixtureV7", artSet),
      true,
    );
    await evaluate(
      connection,
      `(() => { globalThis.__UNDEAD_REVIEW__.boardHost.activate(${JSON.stringify(doubly)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
    );
    await waitForExpression(
      connection,
      `document.querySelectorAll('.v7-selection-dock .v7-affliction-chip').length === 2`,
    );
    const evidence = await evaluate<{
      readonly markers: readonly string[];
      readonly chips: readonly (string | null)[];
      readonly disband: string | null;
      readonly disbandDisabled: string | null;
    }>(connection, afflictionEvidenceExpressionV7(), true);
    if (
      JSON.stringify(evidence.markers) !==
        JSON.stringify(AFFLICTION_HUMAN_MARKERS_V7) ||
      !evidence.chips[0]?.startsWith(
        "Plague · 3 turns. Plague from Player 2's Lich",
      ) ||
      !evidence.chips[1]?.startsWith("Bitten. Bitten by Player 2's Zombie") ||
      evidence.disband !==
        "Disband unavailable. Plagued units can't Disband." ||
      evidence.disbandDisabled !== "true"
    )
      throw new Error(
        `${artSet} Plague/Bitten fixture evidence missing: ${JSON.stringify(evidence)}`,
      );
    await delay(400);
    await capture(connection, `affliction-${artSet.toLowerCase()}-desktop.png`);
  }
  await evaluate(
    connection,
    `(() => { globalThis.__UNDEAD_REVIEW__?.view?.destroy?.(); delete globalThis.__UNDEAD_REVIEW__; })()`,
  );
  return "Plague/Bitten fixture markers, chips and Disband explained in LEGACY and CHIBI";
}

/**
 * Revision 17 Goblins in the default route (pulp_wars-0ao.5): setup offers
 * Goblin for every seat, a Goblin-vs-Human match launches from the
 * production setup, the human's starting Goblin (on its capital) is selected
 * from the keyboard and blown up through the Kaboom! button, its armed
 * preview and the confirmation, and the save resumes with its Goblin seat on
 * a fresh default-route load. It uses no fixture, so it also runs against a
 * deployed bundle. The Kaboom damage is read from the page's own public unit
 * stats (not a literal), so tuning never breaks the probe; since
 * `pulp_wars-0ao.7` a seat starts with one Goblin, whose turn-1 blast
 * usually hits nobody, so a zero-hit preview ("Hits 0 units: ...") is
 * accepted as long as the summary, the confirmation, and the result run.
 */
async function probeGoblinMatch(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (
    url: string,
    readiness: string,
  ): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_GOBLIN_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url });
    await waitForExpression(
      connection,
      `globalThis.__V7_GOBLIN_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const saveKey = "pulpWars.save.v7r69.current";
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(
    defaultUrl(),
    `document.querySelector('[data-v7-factions]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  await openNewGame(connection);
  const options = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('#v7-faction-1 option')).map((option) => option.textContent ?? '')`,
  );
  if (JSON.stringify(options) !== JSON.stringify(FACTION_OPTIONS_V7))
    throw new Error(
      `Goblin faction option missing: ${JSON.stringify(options)}`,
    );
  // The tribe grid (pulp_wars-kaw6.4) by keyboard: Goblin is picked.
  await pickTribeV7(connection, "GOBLIN");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-faction-0')?.value === 'GOBLIN' && document.querySelector('#v7-faction-1')?.value === 'UNDEAD'`,
  );
  await capture(connection, "goblin-setup-desktop.png");
  await replaceSeedInput(connection, "6");
  await launchWithFastForward(connection);
  const humanTurn = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && v.pendingChoices.length === 0; })()`;
  await waitForExpression(connection, humanTurn, 900);
  const ownUnits = `globalThis.__PULP_WARS_APP__.controller.snapshot().view.units.filter((unit) => unit.ownerId === globalThis.__PULP_WARS_APP__.controller.snapshot().view.viewer.id).length`;
  const started = await evaluate<{
    readonly factions: readonly string[];
    readonly viewer: string;
    readonly units: number;
  }>(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return { factions: view.setup.factions, viewer: view.viewer.faction, units: ${ownUnits} }; })()`,
  );
  if (
    JSON.stringify(started.factions) !== JSON.stringify(["GOBLIN", "UNDEAD"]) ||
    started.viewer !== "GOBLIN" ||
    started.units < 1
  )
    throw new Error(`Goblin setup launch failed: ${JSON.stringify(started)}`);
  // The board cursor starts on the capital, where the first Goblin stands.
  await evaluate(
    connection,
    `document.querySelector('canvas.board-canvas-v7').focus()`,
  );
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Goblin' && document.querySelector('[data-action="command-kaboom"]:not(:disabled)') !== null`,
  );
  const button = await evaluate<{
    readonly label: string | null;
    readonly damage: number | null;
  }>(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const goblin = view.units.find((unit) => unit.ownerId === view.viewer.id && unit.role === 'FIGHTER'); const stats = view.unitStats.find((entry) => entry.unitId === goblin?.id); return { label: document.querySelector('[data-action="command-kaboom"]').getAttribute('aria-label'), damage: stats?.goblin?.kaboomDamage ?? null }; })()`,
  );
  if (
    button.damage === null ||
    !(button.label ?? "").startsWith(
      `Kaboom! · Blow up: ${button.damage} damage to every other unit in the 3×3 square, yours too. This unit dies. · Hits `,
    )
  )
    throw new Error(`Kaboom! preview missing: ${JSON.stringify(button)}`);
  await pointerClick(connection, '[data-action="command-kaboom"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-v7-kaboom="armed"]') !== null && document.querySelector('[data-action="confirm-kaboom"]:not(:disabled)') !== null && globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex >= 0`,
  );
  const summary = await evaluate<string>(
    connection,
    `document.querySelector('.v7-kaboom-summary')?.textContent ?? ''`,
  );
  if (!/^Hits \d+ units?: \d+ enemy, \d+ yours\. Kills \d+\.$/.test(summary))
    throw new Error(`Kaboom! summary missing: ${summary}`);
  await capture(connection, "goblin-kaboom-armed-desktop.png");
  await pointerClick(connection, '[data-action="confirm-kaboom"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && ${ownUnits} === ${started.units - 1} && (document.querySelector('#v7-live')?.textContent ?? '').includes('Your Goblin blew up'); })()`,
    300,
  );
  await capture(connection, "goblin-kaboom-result-desktop.png");
  // The save resumes on a fresh default-route load with its Goblin seat.
  await navigateFresh(
    defaultUrl(),
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && JSON.stringify(s.view?.setup.factions) === '["GOBLIN","UNDEAD"]' && ${ownUnits} === ${started.units - 1}; })()`,
    900,
  );
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(
    defaultUrl(),
    `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`,
  );
  return `Goblin-vs-Human launch, Kaboom! (${summary}) and resume`;
}

async function driveDefaultMatchToOutcome(
  connection: Connection,
): Promise<OutcomeEvidenceV7> {
  let humanEndTurns = 0;
  let humanRewardChoices = 0;
  for (let boundary = 0; boundary < 1_500; boundary += 1) {
    await waitForExpression(
      connection,
      `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; const actionable = document.querySelector('[data-mandatory-choice] button:not(:disabled), [data-action="end-turn"]:not(:disabled)') !== null; return s?.phase === 'COMPLETE' || (s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && actionable); })()`,
      1_800,
    );
    const state = await evaluate<{
      readonly phase: string;
      readonly commandIndex: number;
      readonly rewardAction: string | null;
      readonly endTurn: boolean;
    }>(
      connection,
      `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const reward = document.querySelector('[data-mandatory-choice] button:not(:disabled)'); const end = document.querySelector('[data-action="end-turn"]:not(:disabled)'); return { phase: s.phase, commandIndex: s.view?.commandIndex ?? -1, rewardAction: reward instanceof HTMLButtonElement ? reward.dataset.action ?? null : null, endTurn: end instanceof HTMLButtonElement }; })()`,
    );
    if (state.phase === "COMPLETE") {
      const result = await evaluate<OutcomeEvidenceV7>(
        connection,
        `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const v = s.view; if (!v?.outcome) throw new Error('Completed match has no public outcome'); return { outcome: v.outcome.kind, round: v.round, commandIndex: v.commandIndex, humanEndTurns: ${humanEndTurns}, humanRewardChoices: ${humanRewardChoices}, policySlices: s.ai.policySlices }; })()`,
      );
      if (
        result.commandIndex <= 0 ||
        result.round <= 0 ||
        result.humanEndTurns <= 0 ||
        result.policySlices <= 0
      )
        throw new Error(
          `Incomplete outcome evidence: ${JSON.stringify(result)}`,
        );
      return result;
    }
    if (state.rewardAction !== null) {
      await pointerClick(
        connection,
        `[data-action=${JSON.stringify(state.rewardAction)}]`,
      );
      humanRewardChoices += 1;
    } else if (state.endTurn) {
      await pointerClick(connection, '[data-action="end-turn"]');
      humanEndTurns += 1;
    } else {
      throw new Error(
        `Human turn exposed neither an offered reward nor End Turn: ${JSON.stringify(state)}`,
      );
    }
  }
  throw new Error("Default v7 browser match exceeded 1,500 human boundaries");
}

/**
 * Revision 19 Dinosaurs in the default route (pulp_wars-c87.4): setup offers
 * Dinosaur for every seat; a Showcase with a Dinosaur seat and three Human
 * opponents launches from the production setup (the only setup whose first
 * turn has lay-able Eggs and a Triceratops near an enemy: the neighbouring
 * strip's Captain stands three tiles east of it); the Triceratops moves two
 * tiles next to that Captain with the keyboard, shows its Charge! run-up in
 * the dock and "Charge +2" in the attack preview, and attacks (revision 20:
 * there is no Stampede command, lane or legend); North lays a Raptor Egg
 * through its Lay Egg card and a nest tile
 * picked on the board; one End Turn later the Egg has hatched into a Raptor;
 * and the save resumes with its Dinosaur seat on a fresh default-route load.
 * It uses no fixture, so it also runs against a deployed bundle.
 */
async function probeDinosaurMatch(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (readiness: string): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_DINOSAUR_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url: defaultUrl() });
    await waitForExpression(
      connection,
      `globalThis.__V7_DINOSAUR_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const typeahead = async (selector: string, letter: string): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector(${JSON.stringify(selector)}).focus()`,
    );
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: letter,
      code: `Key${letter}`,
      text: letter,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: letter,
      code: `Key${letter}`,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
  };
  const focusBoard = async (): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector('canvas.board-canvas-v7').focus()`,
    );
  };
  const arrows = async (dx: number, dy: number): Promise<void> => {
    const horizontal = dx < 0 ? "ArrowLeft" : "ArrowRight";
    const vertical = dy < 0 ? "ArrowUp" : "ArrowDown";
    for (let step = 0; step < Math.abs(dx); step += 1)
      await pressKey(connection, horizontal, horizontal);
    for (let step = 0; step < Math.abs(dy); step += 1)
      await pressKey(connection, vertical, vertical);
  };
  const saveKey = "pulpWars.save.v7r69.current";
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`;
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  await openNewGame(connection);
  const options = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('#v7-faction-1 option')).map((option) => option.textContent ?? '')`,
  );
  if (JSON.stringify(options) !== JSON.stringify(FACTION_OPTIONS_V7))
    throw new Error(
      `Dinosaur faction option missing: ${JSON.stringify(options)}`,
    );
  // Three opponents, the Showcase map, and a Dinosaur human seat, each
  // chosen by keyboard: the selects on their focused, closed fields, the
  // tribe on the grid (pulp_wars-kaw6.4).
  await evaluate(connection, `document.querySelector('#v7-ai-count').focus()`);
  await typeSelectValue(connection, "#v7-ai-count", "3");
  await typeahead("#v7-map-type", "S");
  await pickTribeV7(connection, "DINOSAUR");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-map-type')?.value === 'SHOWCASE' && document.querySelector('#v7-faction-0')?.value === 'DINOSAUR' && document.querySelectorAll('[data-v7-factions] select').length === 4 && document.querySelector('#v7-faction-3')?.value === 'ORIGINAL'`,
  );
  await capture(connection, "dinosaur-setup-desktop.png");
  await pointerClick(connection, '[data-action="launch"]');
  const settled = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && v.pendingChoices.length === 0 && document.querySelector('[data-action="end-turn"]:not(:disabled)') !== null; })()`;
  await waitForExpression(connection, settled, 900);
  interface DinosaurStartV7 {
    readonly factions: readonly string[];
    readonly viewer: string;
    readonly units: number;
    readonly eggs: number;
    readonly capital: { readonly x: number; readonly y: number };
    readonly north: { readonly x: number; readonly y: number };
    readonly triceratops: { readonly x: number; readonly y: number };
  }
  const started = await evaluate<DinosaurStartV7>(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const own = view.units.filter((unit) => unit.ownerId === view.viewer.id); const cities = view.cities.filter((city) => city.ownerId === view.viewer.id); return { factions: view.setup.factions, viewer: view.viewer.faction, units: own.length, eggs: view.eggs.length, capital: cities.find((city) => city.isCapital).at, north: cities.filter((city) => !city.isCapital).sort((a, b) => a.at.y - b.at.y)[0].at, triceratops: own.find((unit) => unit.role === 'SWORDSMAN').at }; })()`,
  );
  if (
    JSON.stringify(started.factions) !==
      JSON.stringify(["DINOSAUR", "UNDEAD", "GOBLIN", "ORIGINAL"]) ||
    started.viewer !== "DINOSAUR" ||
    started.units !== 12 ||
    started.eggs !== 0
  )
    throw new Error(`Dinosaur setup launch failed: ${JSON.stringify(started)}`);
  // Charge!: the board cursor starts on the capital; the Triceratops is
  // selected with Enter, moved two tiles east (over the own T-Rex) with
  // Enter on its Move target, and then attacks the Captain beside it.
  const selectedTriceratops = `document.querySelector('.v7-selection-dock h2')?.textContent === 'Triceratops'`;
  await focusBoard();
  await arrows(
    started.triceratops.x - started.capital.x,
    started.triceratops.y - started.capital.y,
  );
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(connection, selectedTriceratops);
  // Its unit info names Charge! (with the former Stampede icon).
  await evaluate<boolean>(
    connection,
    `(document.querySelector('[data-action="unit-help"]')?.click(), true)`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.v7-unit-help-dialog .v7-unit-ability[data-ability="charge"]') !== null`,
  );
  const chargeAbility = await evaluate<{
    readonly text: string;
    readonly stampedeControls: number;
  }>(
    connection,
    `({ text: document.querySelector('.v7-unit-ability[data-ability="charge"]')?.textContent ?? '', stampedeControls: document.querySelectorAll('[data-action*="stampede"], .v7-stampede-legend, [data-v7-stampede]').length })`,
  );
  // The unit glossary (bead pulp_wars-2yc.39): one plain sentence, with no
  // number (the run-up's amounts are on the Attack row when they apply).
  if (
    chargeAbility.text !==
      "Charge!Hits harder after moving. Ignores Walls and Field Defense, and shoves the target back." ||
    chargeAbility.stampedeControls !== 0
  )
    throw new Error(
      `Charge! unit info missing: ${JSON.stringify(chargeAbility)}`,
    );
  await evaluate<boolean>(
    connection,
    `(document.querySelector('[data-action="close-unit-help"]')?.click(), true)`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('.v7-unit-help-dialog') === null`,
  );
  const target = {
    x: started.triceratops.x + 3,
    y: started.triceratops.y,
  };
  await focusBoard();
  await arrows(2, 0);
  await pressKey(connection, "Enter", "Enter");
  const movedExpression = `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const unit = view.units.find((candidate) => candidate.ownerId === view.viewer.id && candidate.role === 'SWORDSMAN'); return view.commandIndex === 1 && unit.at.x === ${target.x - 1} && unit.at.y === ${target.y} && unit.activation.movedPathLength === 2; })()`;
  await waitForExpression(connection, `${movedExpression} && ${settled}`, 300);
  // The moved Triceratops stays (or is again) selected: its dock shows the
  // run-up status.
  if (!(await evaluate<boolean>(connection, selectedTriceratops))) {
    await focusBoard();
    await pressKey(connection, "Enter", "Enter");
  }
  await waitForExpression(
    connection,
    `${selectedTriceratops} && Array.from(document.querySelectorAll('.v7-selection-dock .v7-unit-status-cues .v7-chip')).some((chip) => /^Charge! \\+[\\d.]+ Attack$/.test(chip.textContent ?? ''))`,
  );
  await focusBoard();
  await arrows(1, 0);
  const chargePreview = await evaluate<string>(
    connection,
    `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? ''`,
  );
  const chargeLine = /Charge \+[\d.]+\./.exec(chargePreview)?.[0] ?? null;
  if (
    chargeLine === null ||
    !/Attack preview\. .*Primary damage \d+\./.test(chargePreview)
  )
    throw new Error(`Charge preview missing: ${chargePreview}`);
  await capture(connection, "dinosaur-charge-preview-desktop.png");
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex === 2 && ${settled}`,
    300,
  );
  const charged = await evaluate<{
    readonly attacked: boolean;
    readonly commands: readonly string[];
  }>(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const unit = view.units.find((candidate) => candidate.ownerId === view.viewer.id && candidate.role === 'SWORDSMAN'); return { attacked: unit?.activation.attacked === true, commands: globalThis.__PULP_WARS_APP__.controller.snapshot().offeredCommands.filter((command) => command.unitId === unit?.id).map((command) => command.kind) }; })()`,
  );
  if (!charged.attacked || charged.commands.includes("ATTACK"))
    throw new Error(`Charge did not resolve: ${JSON.stringify(charged)}`);
  // Lay Egg: select North, choose the Raptor card, and pick the first legal
  // nest tile on the board with the keyboard.
  const cursor = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return view.units.find((unit) => unit.ownerId === view.viewer.id && unit.role === 'SWORDSMAN').at; })()`,
  );
  await focusBoard();
  await arrows(started.north.x - target.x, 0);
  await arrows(0, started.north.y - target.y);
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock .v7-identity-kind')?.textContent === 'City' && document.querySelector('[data-stat="units"]')?.dataset.capacity === 'slots' && document.querySelector('[data-action="lay-egg-raider"]:not([aria-disabled="true"]):not(:disabled)') !== null`,
  );
  const slots = await evaluate<string>(
    connection,
    `document.querySelector('.v7-city-units')?.textContent ?? ''`,
  );
  if (!/^\d+\/\d+ slots$/.test(slots))
    throw new Error(`Dinosaur city slots missing: ${slots}`);
  await pointerClick(connection, '[data-action="lay-egg-raider"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-v7-lay-egg="picking"]')?.dataset.nestTiles !== undefined`,
  );
  const nest = await evaluate<{ readonly x: number; readonly y: number }>(
    connection,
    `(() => { const [x, y] = document.querySelector('[data-v7-lay-egg="picking"]').dataset.nestTiles.split(' ')[0].split(',').map(Number); return { x, y }; })()`,
  );
  await capture(connection, "dinosaur-nest-picking-desktop.png");
  await focusBoard();
  await arrows(nest.x - started.north.x, nest.y - started.north.y);
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `(document.querySelector('#v7-live')?.textContent ?? '').includes('You laid a Raptor Egg') && globalThis.__PULP_WARS_APP__.controller.snapshot().view.eggs.length === 1 && ${settled}`,
    300,
  );
  const egg = await evaluate<{
    readonly unitId: number;
    readonly turnsRemaining: number;
    readonly form: string;
    readonly role: string;
  }>(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const entry = view.eggs[0]; const unit = view.units.find((candidate) => candidate.id === entry.unitId); return { unitId: entry.unitId, turnsRemaining: entry.turnsRemaining, form: unit.form, role: unit.role }; })()`,
  );
  if (egg.form !== "EGG" || egg.role !== "RAIDER" || egg.turnsRemaining < 1)
    throw new Error(`Raptor Egg not laid: ${JSON.stringify(egg)}`);
  // End Turn once per turn of the Egg's countdown (the engine's number, so
  // a retuned hatch time needs no change here): the Normal AI plays three
  // seats and the Egg hatches at the human's Start Turn.
  const hatchRound = 1 + egg.turnsRemaining;
  for (let round = 2; round <= hatchRound; round += 1) {
    await evaluate(connection, armFastForwardExpression());
    try {
      await pointerClick(connection, '[data-action="end-turn"]');
      await waitForExpression(
        connection,
        `globalThis.__V7_FAST_FORWARD_CONTROL__?.status === 'ERROR' || (${settled} && globalThis.__PULP_WARS_APP__.controller.snapshot().view.round === ${round})`,
        1800,
      );
      const control = await evaluate<{
        status: string;
        detail: string | null;
      }>(connection, `globalThis.__V7_FAST_FORWARD_CONTROL__`);
      if (control.status === "ERROR")
        throw new Error(`Dinosaur End Turn failed: ${control.detail}`);
    } finally {
      await evaluate(
        connection,
        `globalThis.__V7_FAST_FORWARD_CONTROL_CANCEL__?.()`,
      );
    }
  }
  const hatchedExpression = `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const unit = view.units.find((candidate) => candidate.id === ${egg.unitId}); return { eggs: view.eggs.length, form: unit?.form ?? null, role: unit?.role ?? null, hp: unit?.hp ?? null, commandIndex: view.commandIndex, round: view.round }; })()`;
  interface DinosaurHatchedV7 {
    readonly eggs: number;
    readonly form: string | null;
    readonly role: string | null;
    readonly hp: number | null;
    readonly commandIndex: number;
    readonly round: number;
  }
  const hatched = await evaluate<DinosaurHatchedV7>(
    connection,
    hatchedExpression,
  );
  if (
    hatched.eggs !== 0 ||
    hatched.form !== "LAND" ||
    hatched.role !== "RAIDER" ||
    hatched.round !== hatchRound
  )
    throw new Error(`Raptor Egg did not hatch: ${JSON.stringify(hatched)}`);
  await capture(connection, "dinosaur-hatched-desktop.png");
  // The save resumes on a fresh default-route load with its Dinosaur seat.
  await navigateFresh(
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && JSON.stringify(s.view?.setup.factions) === '["DINOSAUR","UNDEAD","GOBLIN","ORIGINAL"]' && s.view.commandIndex === ${hatched.commandIndex}; })()`,
    900,
  );
  const resumed = await evaluate<DinosaurHatchedV7>(
    connection,
    hatchedExpression,
  );
  if (JSON.stringify(resumed) !== JSON.stringify(hatched))
    throw new Error(`Dinosaur save did not resume: ${JSON.stringify(resumed)}`);
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  return `Showcase launch as Dinosaur vs three Humans, Charge after a two-tile Move (${chargeLine} Triceratops on ${cursor.x},${cursor.y}), Raptor Egg laid on ${nest.x},${nest.y} (${slots} before), hatched in round ${hatched.round} with ${hatched.hp} HP, and resume`;
}

/**
 * Martians in the default route (pulp_wars-t6s.4): setup offers Martian for
 * every seat; a Showcase with a Martian seat and three Human opponents
 * launches from the production setup (its first turn has a full-power ray
 * in reach of the neighbouring strip and a Saucer next to the capital's
 * Grunt); the ray unit is selected with the keyboard, its dock shows "Full
 * power", the attack preview names the ray's power and the Cooling it
 * leaves, and it fires (the shooter is Cooling afterwards); the Saucer
 * beams the capital's Grunt down through its Beam Down button, the
 * passenger and tile picked on the board; and the save resumes with its
 * Martian seat on a fresh default-route load. It uses no fixture, so it
 * also runs against a deployed bundle.
 */
async function probeMartianMatch(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (readiness: string): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_MARTIAN_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url: defaultUrl() });
    await waitForExpression(
      connection,
      `globalThis.__V7_MARTIAN_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const typeahead = async (selector: string, letter: string): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector(${JSON.stringify(selector)}).focus()`,
    );
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: letter,
      code: `Key${letter}`,
      text: letter,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: letter,
      code: `Key${letter}`,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
  };
  const focusBoard = async (): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector('canvas.board-canvas-v7').focus()`,
    );
  };
  const arrows = async (dx: number, dy: number): Promise<void> => {
    const horizontal = dx < 0 ? "ArrowLeft" : "ArrowRight";
    const vertical = dy < 0 ? "ArrowUp" : "ArrowDown";
    for (let step = 0; step < Math.abs(dx); step += 1)
      await pressKey(connection, horizontal, horizontal);
    for (let step = 0; step < Math.abs(dy); step += 1)
      await pressKey(connection, vertical, vertical);
  };
  const saveKey = "pulpWars.save.v7r69.current";
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`;
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  await openNewGame(connection);
  const options = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('#v7-faction-1 option')).map((option) => option.textContent ?? '')`,
  );
  if (JSON.stringify(options) !== JSON.stringify(FACTION_OPTIONS_V7))
    throw new Error(
      `Martian faction option missing: ${JSON.stringify(options)}`,
    );
  // Three opponents, the Showcase map, and a Martian human seat, each
  // chosen by keyboard: the selects on their focused, closed fields, the
  // tribe on the grid (pulp_wars-kaw6.4).
  await evaluate(connection, `document.querySelector('#v7-ai-count').focus()`);
  await typeSelectValue(connection, "#v7-ai-count", "3");
  await typeahead("#v7-map-type", "S");
  await pickTribeV7(connection, "MARTIAN");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-map-type')?.value === 'SHOWCASE' && document.querySelector('#v7-faction-0')?.value === 'MARTIAN' && document.querySelectorAll('[data-v7-factions] select').length === 4 && document.querySelector('#v7-faction-3')?.value === 'DINOSAUR'`,
  );
  await pointerClick(connection, '[data-action="launch"]');
  const settled = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && v.pendingChoices.length === 0 && document.querySelector('[data-action="end-turn"]:not(:disabled)') !== null; })()`;
  await waitForExpression(connection, settled, 900);
  interface MartianStartV7 {
    readonly factions: readonly string[];
    readonly viewer: string;
    readonly shields: number;
    readonly capital: { readonly x: number; readonly y: number };
    readonly saucer: { readonly x: number; readonly y: number };
    readonly ray: {
      readonly unitId: number;
      readonly role: string;
      readonly at: { readonly x: number; readonly y: number };
      readonly target: { readonly x: number; readonly y: number };
    } | null;
  }
  // A ray is an Attack by an own Ray Gunner, Tripod or Colossus.
  const started = await evaluate<MartianStartV7>(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const view = s.view; const own = view.units.filter((unit) => unit.ownerId === view.viewer.id); const attack = s.offeredCommands.find((command) => command.kind === 'ATTACK' && ['MARKSMAN', 'CATAPULT', 'JUGGERNAUT'].includes(own.find((unit) => unit.id === command.unitId)?.role)); const shooter = attack === undefined ? undefined : own.find((unit) => unit.id === attack.unitId); const target = attack === undefined ? undefined : view.units.find((unit) => unit.id === attack.targetUnitId); return { factions: view.setup.factions, viewer: view.viewer.faction, shields: view.shields.length, capital: view.cities.find((city) => city.ownerId === view.viewer.id && city.isCapital).at, saucer: own.find((unit) => unit.role === 'RAIDER').at, ray: shooter === undefined || target === undefined ? null : { unitId: shooter.id, role: shooter.role, at: shooter.at, target: target.at } }; })()`,
  );
  if (
    JSON.stringify(started.factions) !==
      JSON.stringify(["MARTIAN", "UNDEAD", "GOBLIN", "DINOSAUR"]) ||
    started.viewer !== "MARTIAN" ||
    started.shields === 0 ||
    started.ray === null
  )
    throw new Error(`Martian setup launch failed: ${JSON.stringify(started)}`);
  const ray = started.ray;
  // The ray: the board cursor starts on the capital; the shooter is
  // selected with Enter, its dock says "Full power", and the cursor on its
  // target describes the preview.
  await focusBoard();
  await arrows(ray.at.x - started.capital.x, ray.at.y - started.capital.y);
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `Array.from(document.querySelectorAll('.v7-selection-dock [data-unit-status="ray-power"]')).some((chip) => chip.textContent === 'Full power')`,
  );
  await focusBoard();
  await arrows(ray.target.x - ray.at.x, ray.target.y - ray.at.y);
  const rayPreview = await evaluate<string>(
    connection,
    `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? ''`,
  );
  if (
    !/Attack preview\. .*Primary damage \d+\./.test(rayPreview) ||
    !rayPreview.includes("Full power") ||
    !rayPreview.includes("Leaves it Cooling next turn")
  )
    throw new Error(`Ray preview missing: ${rayPreview}`);
  await capture(connection, "martian-ray-preview-desktop.png");
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex === 1 && ${settled}`,
    300,
  );
  const cooling = await evaluate<boolean>(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.cooling.some((entry) => entry.unitId === ${ray.unitId} && entry.firedThisTurn)`,
  );
  if (!cooling) throw new Error("The full-power ray left no Cooling entry");
  // Beam Down: Escape clears the selection (the cursor stays on the ray's
  // target); the Saucer is selected, its Beam Down button aims, the
  // passenger is picked on the board with the arrow keys and Enter (bead
  // pulp_wars-9im: the dock lists no passengers), and the first tile on
  // the board with Tab and Enter (bead pulp_wars-b5f.8: the dock names no
  // tile).
  await focusBoard();
  await pressKey(connection, "Escape", "Escape");
  await arrows(
    started.saucer.x - ray.target.x,
    started.saucer.y - ray.target.y,
  );
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Saucer' && document.querySelector('[data-action="martian-beam-down"]:not([aria-disabled="true"]):not(:disabled)') !== null`,
  );
  await pointerClick(connection, '[data-action="martian-beam-down"]');
  await waitForExpression(
    connection,
    `Number(document.querySelector('[data-v7-martian-pick="beam_down"].v7-board-pick')?.dataset.boardTargets ?? '0') >= 1 && document.querySelector('[data-v7-martian-pick="beam_down"] [data-action^="beam-passenger-"]') === null`,
  );
  // `pulp_wars-1wy.3`: own units within two tiles of the Saucer are
  // passengers too, so the Grunt the probe follows is picked on its own
  // tile: the cursor walks from the Saucer to it.
  const beamPassenger = await evaluate<{
    readonly x: number;
    readonly y: number;
  } | null>(
    connection,
    `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const grunt = view.units.find((unit) => unit.ownerId === view.viewer.id && unit.role === 'FIGHTER'); return grunt?.at ?? null; })()`,
  );
  if (beamPassenger === null) throw new Error("Beam Down passenger missing");
  await focusBoard();
  await arrows(
    beamPassenger.x - started.saucer.x,
    beamPassenger.y - started.saucer.y,
  );
  await waitForExpression(
    connection,
    `(document.querySelector('[id^="ruleset7-map-cursor-"]')?.textContent ?? '').startsWith('Beam the ')`,
  );
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `(document.querySelector('[data-v7-martian-pick="beam_down"]')?.getAttribute('aria-label') ?? '').startsWith('Choose a tile next to the carrier') && document.querySelector('[data-v7-martian-pick="beam_down"] [data-action^="beam-tile-"]') === null`,
  );
  await capture(connection, "martian-beam-down-desktop.png");
  const beamPanelText = await evaluate<string>(
    connection,
    `document.querySelector('[data-v7-martian-pick="beam_down"]')?.textContent ?? ''`,
  );
  if (/\d+, ?\d+/.test(beamPanelText))
    throw new Error(`Beam Down dock names a tile: ${beamPanelText}`);
  await focusBoard();
  await pressKey(connection, "Tab", "Tab");
  await waitForExpression(
    connection,
    `(document.querySelector('[id^="ruleset7-map-cursor-"]')?.textContent ?? '').startsWith('Beam the ')`,
  );
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex === 2 && (document.querySelector('#v7-live')?.textContent ?? '').includes('Saucer beamed down a') && ${settled}`,
    300,
  );
  const beamedExpression = `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const grunt = view.units.find((unit) => unit.ownerId === view.viewer.id && unit.role === 'FIGHTER'); return { at: grunt?.at ?? null, exhausted: grunt?.activation.handled === true, commandIndex: view.commandIndex, cooling: view.cooling.length }; })()`;
  interface MartianBeamedV7 {
    readonly at: { readonly x: number; readonly y: number } | null;
    readonly exhausted: boolean;
    readonly commandIndex: number;
    readonly cooling: number;
  }
  const beamed = await evaluate<MartianBeamedV7>(connection, beamedExpression);
  if (
    beamed.at === null ||
    (beamed.at.x === started.capital.x && beamed.at.y === started.capital.y) ||
    Math.max(
      Math.abs(beamed.at.x - started.saucer.x),
      Math.abs(beamed.at.y - started.saucer.y),
    ) !== 1 ||
    !beamed.exhausted
  )
    throw new Error(`Beam Down did not resolve: ${JSON.stringify(beamed)}`);
  // The save resumes on a fresh default-route load with its Martian seat.
  await navigateFresh(
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && JSON.stringify(s.view?.setup.factions) === '["MARTIAN","UNDEAD","GOBLIN","DINOSAUR"]' && s.view.commandIndex === ${beamed.commandIndex}; })()`,
    900,
  );
  const resumed = await evaluate<MartianBeamedV7>(connection, beamedExpression);
  if (JSON.stringify(resumed) !== JSON.stringify(beamed))
    throw new Error(`Martian save did not resume: ${JSON.stringify(resumed)}`);
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  // The Mind Control revision (bead pulp_wars-b5f.3): no opening puts a
  // Brain beside a wounded enemy, so on the dev server the Martian UI
  // fixture is mounted for it.
  const mindControl = deployed
    ? "Mind Control fixture skipped on the deployed bundle"
    : await probeMindControlFixture(connection);
  await navigateFresh(freshSetup);
  return `Showcase launch as Martian vs three Humans, full-power ${ray.role === "JUGGERNAUT" ? "Colossus" : ray.role === "CATAPULT" ? "Tripod" : "Ray Gunner"} ray from ${ray.at.x},${ray.at.y} (Cooling after), Grunt beamed down to ${beamed.at.x},${beamed.at.y}, and resume; ${mindControl}`;
}

/**
 * The Mind Control revision (bead pulp_wars-b5f.3; dev server only, the
 * fixture comes from `tests/fixtures`): on the Martian UI fixture in the
 * default look, the Brain's Mind Control button aims, the dock's choice
 * takes the wounded enemy Ray Gunner stand-in (a Human Marksman), and the
 * unit stays itself: its own kind's sprite subject (never a Thrall), now
 * the viewer's, with the control halo drawn in the Martian faction colour's
 * dark casing on the board canvas and the brain badge "Controlled" in its
 * dock.
 */
async function probeMindControlFixture(
  connection: Connection,
): Promise<string> {
  const review = "globalThis.__MARTIAN_REVIEW__";
  await evaluate(
    connection,
    martianFixtureMountExpressionV7("martianUiFixtureV7", "CHIBI"),
    true,
  );
  await waitForExpression(
    connection,
    `${review}?.boardHost !== undefined && document.querySelector('canvas.board-canvas-v7') !== null`,
  );
  const at = await evaluate<{
    readonly brain: { readonly x: number; readonly y: number };
    readonly weakTarget: { readonly x: number; readonly y: number };
  }>(connection, `${review}.at`);
  const target = await evaluate<{
    readonly id: number;
    readonly role: string;
    readonly hp: number;
    readonly maxHp: number;
  }>(
    connection,
    `(() => { const unit = ${review}.snapshotView().units.find((candidate) => candidate.at.x === ${at.weakTarget.x} && candidate.at.y === ${at.weakTarget.y}); return { id: unit.id, role: unit.role, hp: unit.hp, maxHp: unit.maxHp }; })()`,
  );
  if (target.hp >= target.maxHp)
    throw new Error(
      `Mind Control target is not wounded: ${JSON.stringify(target)}`,
    );
  const casingBefore = await evaluate<number>(
    connection,
    controlCasingPixelsExpressionV7(at.weakTarget),
    true,
  );
  await evaluate(
    connection,
    `(() => { ${review}.boardHost.activate(${JSON.stringify(at.brain)}); document.querySelector('canvas.board-canvas-v7')?.focus(); })()`,
  );
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="martian-mind-control"]:not([aria-disabled="true"]):not(:disabled)') !== null`,
  );
  await pointerClick(connection, '[data-action="martian-mind-control"]');
  // Bead pulp_wars-9im: the target is picked on the board; the dock lists
  // no targets.
  await waitForExpression(
    connection,
    `Number(document.querySelector('[data-v7-martian-pick="mind_control"].v7-board-pick')?.dataset.boardTargets ?? '0') >= 1 && document.querySelector('[data-action^="mind-control-"]') === null`,
  );
  await evaluate(
    connection,
    `${review}.boardHost.activate(${JSON.stringify(at.weakTarget)})`,
  );
  await waitForExpression(
    connection,
    `${review}.traces.some((trace) => trace.command.kind === 'MIND_CONTROL' && trace.command.targetUnitId === ${target.id})`,
  );
  // Let the cue play out, then read the board plan and the canvas.
  await waitForExpression(
    connection,
    `(() => { const view = ${review}.snapshotView(); return view.mindControlled.some((entry) => entry.unitId === ${target.id}) && document.querySelector('canvas.board-canvas-v7')?.dataset.martianEffect === undefined; })()`,
  );
  await new Promise((resolve) => setTimeout(resolve, 600));
  interface ControlledEvidenceV7 {
    readonly owner: boolean;
    readonly role: string | null;
    readonly artSubject: string | null;
    readonly controlled: boolean;
  }
  const evidence = await evaluate<ControlledEvidenceV7>(
    connection,
    `(async () => {
      const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const view = ${review}.snapshotView();
      const unit = view.units.find((candidate) => candidate.id === ${target.id});
      const entry = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null }).entries.find((candidate) => candidate.key === 'unit:${target.id}');
      return { owner: unit?.ownerId === view.viewer.id, role: unit?.role ?? null, artSubject: entry?.artSubject ?? null, controlled: entry?.martian?.controlled === true };
    })()`,
    true,
  );
  // The halo's dark casing appears over the taken unit's own sprite.
  const casingAfter = await evaluate<number>(
    connection,
    controlCasingPixelsExpressionV7(at.weakTarget),
    true,
  );
  if (
    !evidence.owner ||
    evidence.role !== target.role ||
    evidence.artSubject !== `UNIT:${target.role}` ||
    !evidence.controlled ||
    casingAfter - casingBefore < 15
  )
    throw new Error(
      `Mind Control did not keep the unit with its control visual: ${JSON.stringify({ ...evidence, casingBefore, casingAfter })}`,
    );
  await evaluate(
    connection,
    `(() => { ${review}.boardHost.resetInspectionCycle(); ${review}.boardHost.activate(${JSON.stringify(at.weakTarget)}); })()`,
  );
  await waitForExpression(
    connection,
    `(document.querySelector('.v7-selection-dock [data-unit-status="mind-controlled"]')?.textContent ?? '').includes('Controlled')`,
  );
  await capture(connection, "martian-mind-control-desktop.png");
  await evaluate(
    connection,
    `(() => { ${review}?.view?.destroy?.(); delete globalThis.__MARTIAN_REVIEW__; })()`,
  );
  return `Mind Control took the wounded ${evidence.artSubject} (own sprite, halo casing pixels ${casingBefore} to ${casingAfter}, "Controlled" badge)`;
}

/**
 * The Ice Folk in the default route (pulp_wars-7g3.6): setup offers Ice Folk
 * for every seat; a Showcase with an Ice Folk seat and three Human opponents
 * launches from the production setup, its strip under Snow (the view's
 * flags; the cursor on the capital names what Snow does for the viewer);
 * the Sled is selected with the keyboard and moved, by a keyboard-chosen
 * offered Move, to a tile within Bolas reach of an enemy; its Bolas button
 * aims, the dock lists the targets with the preview's Frozen or Frosted hint,
 * and the throw leaves the target Frozen (a `frozen` entry, Ice Folk Freeze,
 * `pulp_wars-w49.37`); and the save resumes with its Ice Folk seat and the
 * Frozen unit on a fresh default-route
 * load. It uses no fixture, so it also runs against a deployed bundle.
 */
async function probeIceFolkMatch(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (readiness: string): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_ICE_FOLK_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url: defaultUrl() });
    await waitForExpression(
      connection,
      `globalThis.__V7_ICE_FOLK_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const typeahead = async (selector: string, letter: string): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector(${JSON.stringify(selector)}).focus()`,
    );
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: letter,
      code: `Key${letter}`,
      text: letter,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: letter,
      code: `Key${letter}`,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
  };
  const focusBoard = async (): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector('canvas.board-canvas-v7').focus()`,
    );
  };
  const arrows = async (dx: number, dy: number): Promise<void> => {
    const horizontal = dx < 0 ? "ArrowLeft" : "ArrowRight";
    const vertical = dy < 0 ? "ArrowUp" : "ArrowDown";
    for (let step = 0; step < Math.abs(dx); step += 1)
      await pressKey(connection, horizontal, horizontal);
    for (let step = 0; step < Math.abs(dy); step += 1)
      await pressKey(connection, vertical, vertical);
  };
  const cursorText = `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? ''`;
  const saveKey = "pulpWars.save.v7r69.current";
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`;
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  await openNewGame(connection);
  const options = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('#v7-faction-1 option')).map((option) => option.textContent ?? '')`,
  );
  if (JSON.stringify(options) !== JSON.stringify(FACTION_OPTIONS_V7))
    throw new Error(
      `Ice Folk faction option missing: ${JSON.stringify(options)}`,
    );
  // Three opponents, the Showcase map, and an Ice Folk human seat, each
  // chosen by keyboard: the selects on their focused, closed fields, the
  // tribe on the grid (pulp_wars-kaw6.4).
  await evaluate(connection, `document.querySelector('#v7-ai-count').focus()`);
  await typeSelectValue(connection, "#v7-ai-count", "3");
  await typeahead("#v7-map-type", "S");
  await pickTribeV7(connection, "ICE_FOLK");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-map-type')?.value === 'SHOWCASE' && document.querySelector('#v7-faction-0')?.value === 'ICE_FOLK' && document.querySelectorAll('[data-v7-factions] select').length === 4 && document.querySelector('#v7-faction-3')?.value === 'DINOSAUR'`,
  );
  await pointerClick(connection, '[data-action="launch"]');
  const settled = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && v.pendingChoices.length === 0 && document.querySelector('[data-action="end-turn"]:not(:disabled)') !== null; })()`;
  await waitForExpression(connection, settled, 900);
  interface IceFolkStartV7 {
    readonly factions: readonly string[];
    readonly viewer: string;
    readonly snow: number;
    readonly capital: { readonly x: number; readonly y: number };
    readonly sled: { readonly x: number; readonly y: number };
    /** An offered Move of the Sled that ends within Bolas reach of an enemy. */
    readonly to: { readonly x: number; readonly y: number } | null;
  }
  const started = await evaluate<IceFolkStartV7>(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const view = s.view; const sled = view.units.find((unit) => unit.ownerId === view.viewer.id && unit.role === 'RAIDER' && unit.form === 'LAND'); const enemies = view.units.filter((unit) => unit.ownerId !== view.viewer.id && unit.form === 'LAND'); const near = (at) => enemies.some((unit) => Math.max(Math.abs(unit.at.x - at.x), Math.abs(unit.at.y - at.y)) <= 2); const moves = s.offeredCommands.filter((command) => command.kind === 'MOVE' && command.unitId === sled.id).map((command) => command.path.at(-1)).filter((at) => near(at)).sort((left, right) => left.y - right.y || left.x - right.x); return { factions: view.setup.factions, viewer: view.viewer.faction, snow: view.board.tiles.filter((tile) => tile.explored && tile.snow === true).length, capital: view.cities.find((city) => city.ownerId === view.viewer.id && city.isCapital).at, sled: sled.at, to: moves[0] ?? null }; })()`,
  );
  if (
    JSON.stringify(started.factions) !==
      JSON.stringify(["ICE_FOLK", "UNDEAD", "GOBLIN", "DINOSAUR"]) ||
    started.viewer !== "ICE_FOLK" ||
    started.snow === 0 ||
    started.to === null
  )
    throw new Error(`Ice Folk setup launch failed: ${JSON.stringify(started)}`);
  const to = started.to;
  // The board cursor starts on the capital: its description names Snow.
  await focusBoard();
  const capitalText = await evaluate<string>(connection, cursorText);
  if (!capitalText.includes("Snow: your units move at half cost"))
    throw new Error(`Snow description missing: ${capitalText}`);
  // The Sled, selected with Enter, moves to a tile in Bolas reach.
  await arrows(
    started.sled.x - started.capital.x,
    started.sled.y - started.capital.y,
  );
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Sled'`,
  );
  await focusBoard();
  await arrows(to.x - started.sled.x, to.y - started.sled.y);
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex === 1 && ${settled}`,
    300,
  );
  // Escape clears the selection; Enter on the same cell selects the Sled.
  await focusBoard();
  await pressKey(connection, "Escape", "Escape");
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Sled' && document.querySelector('[data-action="ice-folk-bolas"]:not([aria-disabled="true"]):not(:disabled)') !== null`,
  );
  await pointerClick(connection, '[data-action="ice-folk-bolas"]');
  // Bead pulp_wars-9im: the Bolas targets are picked on the board (the
  // dock lists none): Tab steps to the first one in reading order, whose
  // description carries the hint, and Enter throws.
  await waitForExpression(
    connection,
    `Number(document.querySelector('[data-v7-ice-folk-pick="bolas"].v7-board-pick')?.dataset.boardTargets ?? '0') >= 1 && document.querySelector('[data-v7-ice-folk-pick="bolas"] [data-action^="bolas-"]') === null`,
  );
  const targetId = await evaluate<number>(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const targets = s.offeredCommands.filter((command) => command.kind === 'THROW_BOLAS').map((command) => s.view.units.find((unit) => unit.id === command.targetUnitId)).filter((unit) => unit !== undefined).sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x); return targets[0]?.id ?? -1; })()`,
  );
  await focusBoard();
  await pressKey(connection, "Tab", "Tab");
  await waitForExpression(
    connection,
    `(document.querySelector('[id^="ruleset7-map-cursor-"]')?.textContent ?? '').startsWith('Bolas: ')`,
  );
  const hint = await evaluate<string>(connection, cursorText);
  if (!/Will be (Frozen|Frosted)/.test(hint))
    throw new Error(`Bolas hint missing: ${hint}`);
  await capture(connection, "ice-folk-bolas-desktop.png");
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex === 2 && (document.querySelector('#v7-live')?.textContent ?? '').includes('Sled froze a') && ${settled}`,
    300,
  );
  const chilledExpression = `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const entry = view.frozen.find((item) => item.unitId === ${targetId}); return { entry: entry ?? null, commandIndex: view.commandIndex, factions: view.setup.factions }; })()`;
  interface IceFolkChilledV7 {
    readonly entry: {
      readonly unitId: number;
      readonly turnsLeft: number;
    } | null;
    readonly commandIndex: number;
    readonly factions: readonly string[];
  }
  const chilled = await evaluate<IceFolkChilledV7>(
    connection,
    chilledExpression,
  );
  if (chilled.entry === null || chilled.entry.turnsLeft < 1)
    throw new Error(`Bolas left no Frozen entry: ${JSON.stringify(chilled)}`);
  await capture(connection, "ice-folk-frozen-desktop.png");
  // The save resumes on a fresh default-route load with its Ice Folk seat
  // and the Frozen unit.
  await navigateFresh(
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && JSON.stringify(s.view?.setup.factions) === '["ICE_FOLK","UNDEAD","GOBLIN","DINOSAUR"]' && s.view.commandIndex === ${chilled.commandIndex}; })()`,
    900,
  );
  const resumed = await evaluate<IceFolkChilledV7>(
    connection,
    chilledExpression,
  );
  if (JSON.stringify(resumed) !== JSON.stringify(chilled))
    throw new Error(`Ice Folk save did not resume: ${JSON.stringify(resumed)}`);
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  return `Showcase launch as Ice Folk vs three Humans (${started.snow} Snow tiles), Sled moved to ${to.x},${to.y}, Bolas left the target Frozen, and resume`;
}

/**
 * The Dwarves in the default route (pulp_wars-78i.6): setup offers Dwarf
 * for every seat; a Showcase with a Dwarf seat and three opponents launches
 * from the production setup (the human's "D" typeahead passes Dinosaur,
 * whose seat then takes the freed Human); the Steam Mole is selected with
 * the keyboard, its Tunnel button aims, Tab on the board reaches an
 * erupting destination whose description carries the forecast ("Surface
 * next to ..., erupts for N"; no text names a tile), Enter chooses it, and
 * the tunnel leaves a mound on the chosen tile (`view.burrowed`); and the save
 * resumes with its Dwarf seat and the mound on a fresh default-route load.
 * It uses no fixture, so it also runs against a deployed bundle.
 */
async function probeDwarfMatch(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (readiness: string): Promise<void> => {
    await evaluate(connection, `globalThis.__V7_DWARF_PRIOR_DOCUMENT__ = true`);
    await connection.send("Page.navigate", { url: defaultUrl() });
    await waitForExpression(
      connection,
      `globalThis.__V7_DWARF_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const typeahead = async (selector: string, letter: string): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector(${JSON.stringify(selector)}).focus()`,
    );
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: letter,
      code: `Key${letter}`,
      text: letter,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: letter,
      code: `Key${letter}`,
      windowsVirtualKeyCode: letter.charCodeAt(0),
    });
  };
  const focusBoard = async (): Promise<void> => {
    await evaluate(
      connection,
      `document.querySelector('canvas.board-canvas-v7').focus()`,
    );
  };
  const arrows = async (dx: number, dy: number): Promise<void> => {
    const horizontal = dx < 0 ? "ArrowLeft" : "ArrowRight";
    const vertical = dy < 0 ? "ArrowUp" : "ArrowDown";
    for (let step = 0; step < Math.abs(dx); step += 1)
      await pressKey(connection, horizontal, horizontal);
    for (let step = 0; step < Math.abs(dy); step += 1)
      await pressKey(connection, vertical, vertical);
  };
  const saveKey = "pulpWars.save.v7r69.current";
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`;
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  await openNewGame(connection);
  const options = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('#v7-faction-1 option')).map((option) => option.textContent ?? '')`,
  );
  if (JSON.stringify(options) !== JSON.stringify(FACTION_OPTIONS_V7))
    throw new Error(`Dwarf faction option missing: ${JSON.stringify(options)}`);
  // Three opponents, the Showcase map, and a Dwarf human seat, each chosen
  // by keyboard (the tribe on the grid, pulp_wars-kaw6.4): Dinosaur first
  // (whose seat moves to the freed Human), then Dwarf.
  await evaluate(connection, `document.querySelector('#v7-ai-count').focus()`);
  await typeSelectValue(connection, "#v7-ai-count", "3");
  await typeahead("#v7-map-type", "S");
  await pickTribeV7(connection, "DINOSAUR");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-faction-0')?.value === 'DINOSAUR'`,
  );
  await pickTribeV7(connection, "DWARF");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-map-type')?.value === 'SHOWCASE' && document.querySelector('#v7-faction-0')?.value === 'DWARF' && document.querySelectorAll('[data-v7-factions] select').length === 4 && document.querySelector('#v7-faction-3')?.value === 'ORIGINAL'`,
  );
  await pointerClick(connection, '[data-action="launch"]');
  const settled = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && v.pendingChoices.length === 0 && document.querySelector('[data-action="end-turn"]:not(:disabled)') !== null; })()`;
  await waitForExpression(connection, settled, 900);
  interface DwarfStartV7 {
    readonly factions: readonly string[];
    readonly viewer: string;
    readonly capital: { readonly x: number; readonly y: number };
    readonly mole: {
      readonly id: number;
      readonly x: number;
      readonly y: number;
    };
    readonly tunnels: number;
  }
  const started = await evaluate<DwarfStartV7>(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const view = s.view; const mole = view.units.find((unit) => unit.ownerId === view.viewer.id && unit.role === 'GUARD' && unit.form === 'LAND'); return { factions: view.setup.factions, viewer: view.viewer.faction, capital: view.cities.find((city) => city.ownerId === view.viewer.id && city.isCapital).at, mole: { id: mole.id, x: mole.at.x, y: mole.at.y }, tunnels: s.offeredCommands.filter((command) => command.kind === 'TUNNEL' && command.unitId === mole.id).length }; })()`,
  );
  if (
    JSON.stringify(started.factions) !==
      JSON.stringify(["DWARF", "UNDEAD", "GOBLIN", "ORIGINAL"]) ||
    started.viewer !== "DWARF" ||
    started.tunnels === 0
  )
    throw new Error(`Dwarf setup launch failed: ${JSON.stringify(started)}`);
  // The Steam Mole, selected with Enter from the capital, aims its Tunnel.
  await focusBoard();
  await arrows(
    started.mole.x - started.capital.x,
    started.mole.y - started.capital.y,
  );
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `document.querySelector('.v7-selection-dock h2')?.textContent === 'Steam Mole' && document.querySelector('[data-action="dwarf-tunnel"]:not([aria-disabled="true"]):not(:disabled)') !== null`,
  );
  await pointerClick(connection, '[data-action="dwarf-tunnel"]');
  // The dock is the ability's head, who rides, the Alone toggle and Cancel; it
  // names no tile (bead pulp_wars-b5f.8). A destination is chosen on the
  // board: Tab steps through the aimed targets in reading order (the
  // offered destinations and the tiles of the Hammerers that can ride),
  // each described without coordinates, until an erupting one ("Surface
  // next to ..., erupts for N"); Enter chooses it and the dock's Tunnel (or
  // a second Enter) digs it.
  await waitForExpression(
    connection,
    `document.querySelector('[data-v7-dwarf-pick="tunnel"]')?.getAttribute('aria-label') === 'Choose where the Mole surfaces'`,
  );
  const tunnelDock = await evaluate<string>(
    connection,
    `document.querySelector('[data-v7-dwarf-pick="tunnel"]')?.textContent ?? ''`,
  );
  if (/\d+, ?\d+/.test(tunnelDock))
    throw new Error(`Tunnel dock names a tile: ${tunnelDock}`);
  const tunnelCells = await evaluate<
    readonly { readonly x: number; readonly y: number }[]
  >(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__.controller.snapshot(); const cells = new Map(); for (const command of s.offeredCommands) { if (command.kind !== 'TUNNEL' || command.unitId !== ${started.mole.id}) continue; cells.set(command.to.x + ',' + command.to.y, command.to); if (command.rider !== null) { const rider = s.view.units.find((unit) => unit.id === command.rider.unitId); if (rider !== undefined) cells.set(rider.at.x + ',' + rider.at.y, rider.at); } } return [...cells.values()].sort((left, right) => left.y - right.y || left.x - right.x); })()`,
  );
  const cursorDescription = `document.getElementById(document.querySelector('canvas.board-canvas-v7')?.getAttribute('aria-describedby') ?? '')?.textContent ?? ''`;
  await focusBoard();
  let forecast = "";
  let tabs = 0;
  while (tabs < tunnelCells.length && !forecast.startsWith("Surface next to")) {
    await pressKey(connection, "Tab", "Tab");
    tabs += 1;
    forecast = await evaluate<string>(connection, cursorDescription);
  }
  if (
    !forecast.startsWith("Surface next to") ||
    !/erupts for \d+/.test(forecast) ||
    /\d+, ?\d+/.test(forecast)
  )
    throw new Error(`Tunnel forecast missing: ${forecast}`);
  const destination = tunnelCells[tabs - 1];
  if (destination === undefined)
    throw new Error(`Tunnel destination missing after ${tabs} Tabs`);
  const [toX, toY] = [destination.x, destination.y];
  await capture(connection, "dwarf-tunnel-preview-desktop.png");
  await pressKey(connection, "Enter", "Enter");
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="tunnel-confirm"]') !== null || globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex === 1`,
  );
  if (
    await evaluate<boolean>(
      connection,
      `document.querySelector('[data-action="tunnel-confirm"]') !== null`,
    )
  )
    await pointerClick(connection, '[data-action="tunnel-confirm"]');
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__.controller.snapshot().view.commandIndex === 1 && (document.querySelector('#v7-live')?.textContent ?? '').includes('Steam Mole tunnelled') && ${settled}`,
    300,
  );
  const moundExpression = `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; const entry = view.burrowed.find((item) => item.unit.id === ${started.mole.id}); return { mound: entry === undefined ? null : { x: entry.unit.at.x, y: entry.unit.at.y, mole: entry.moleUnitId === null }, onBoard: view.units.some((unit) => unit.id === ${started.mole.id}), commandIndex: view.commandIndex, factions: view.setup.factions }; })()`;
  interface DwarfMoundV7 {
    readonly mound: {
      readonly x: number;
      readonly y: number;
      readonly mole: boolean;
    } | null;
    readonly onBoard: boolean;
    readonly commandIndex: number;
    readonly factions: readonly string[];
  }
  const burrowed = await evaluate<DwarfMoundV7>(connection, moundExpression);
  if (
    burrowed.mound === null ||
    burrowed.mound.x !== toX ||
    burrowed.mound.y !== toY ||
    !burrowed.mound.mole ||
    burrowed.onBoard
  )
    throw new Error(`Tunnel left no mound: ${JSON.stringify(burrowed)}`);
  await capture(connection, "dwarf-mound-desktop.png");
  // The save resumes on a fresh default-route load with its Dwarf seat and
  // the mound.
  await navigateFresh(
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE'`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && JSON.stringify(s.view?.setup.factions) === '["DWARF","UNDEAD","GOBLIN","ORIGINAL"]' && s.view.commandIndex === ${burrowed.commandIndex}; })()`,
    900,
  );
  const resumed = await evaluate<DwarfMoundV7>(connection, moundExpression);
  if (JSON.stringify(resumed) !== JSON.stringify(burrowed))
    throw new Error(`Dwarf save did not resume: ${JSON.stringify(resumed)}`);
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  return `Showcase launch as Dwarves vs Undead, Goblins and Humans, Steam Mole tunnelled to ${toX},${toY} with its eruption forecast, mound kept on resume`;
}

/**
 * Revision 18 Showcase (section 5): the last Map option forces 16 x 16 and
 * hides the seed control; the launched match starts on the human's turn with
 * ten own units, three own cities, every technology and the whole board
 * explored; one End Turn hands the board to the Normal AI and back; and the
 * save resumes on a fresh default-route load.
 */
async function probeShowcaseMatch(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (readiness: string): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_SHOWCASE_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url: defaultUrl() });
    await waitForExpression(
      connection,
      `globalThis.__V7_SHOWCASE_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const saveKey = "pulpWars.save.v7r69.current";
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`;
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  await openNewGame(connection);
  const options = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('#v7-map-type option')).map((option) => option.textContent ?? '')`,
  );
  if (options.at(-1) !== "Showcase" || options.length !== 6)
    throw new Error(`Showcase map option missing: ${JSON.stringify(options)}`);
  await evaluate(connection, `document.querySelector('#v7-map-type').focus()`);
  // Typeahead on the focused, closed select: "S" selects Showcase.
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "S",
    code: "KeyS",
    text: "S",
    windowsVirtualKeyCode: 83,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "S",
    code: "KeyS",
    windowsVirtualKeyCode: 83,
  });
  await waitForExpression(
    connection,
    `(() => { const size = document.querySelector('#v7-board-size'); return document.querySelector('#v7-map-type')?.value === 'SHOWCASE' && size?.disabled === true && size.value === '16' && size.options.length === 1 && document.querySelector('.v7-seed-choice')?.hidden === true && (document.querySelector('.v7-map-type-description')?.textContent ?? '').startsWith('A fixed demo map'); })()`,
  );
  await pointerClick(connection, '[data-action="launch"]');
  const humanTurn = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId && v.pendingChoices.length === 0; })()`;
  await waitForExpression(connection, humanTurn, 900);
  const counts = `(() => { const view = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return { mapType: view.setup.mapType, size: view.setup.width, commandIndex: view.commandIndex, round: view.round, units: view.units.filter((unit) => unit.ownerId === view.viewer.id).length, roles: new Set(view.units.filter((unit) => unit.ownerId === view.viewer.id).map((unit) => unit.role)).size, cities: view.cities.filter((city) => city.ownerId === view.viewer.id).length, technologies: view.viewer.researchedTechs.length, unexplored: view.board.tiles.filter((tile) => !tile.explored).length }; })()`;
  interface ShowcaseCountsV7 {
    readonly mapType: string;
    readonly size: number;
    readonly commandIndex: number;
    readonly round: number;
    readonly units: number;
    readonly roles: number;
    readonly cities: number;
    readonly technologies: number;
    readonly unexplored: number;
  }
  const started = await evaluate<ShowcaseCountsV7>(connection, counts);
  if (
    started.mapType !== "SHOWCASE" ||
    started.size !== 16 ||
    started.commandIndex !== 0 ||
    started.units !== 12 ||
    started.roles !== 12 ||
    started.cities !== 3 ||
    started.technologies !== 25 ||
    started.unexplored !== 0
  )
    throw new Error(`Showcase launch failed: ${JSON.stringify(started)}`);
  await capture(connection, "showcase-launch-desktop.png");
  // One End Turn: the Normal AI plays its developed seat and returns.
  await evaluate(connection, armFastForwardExpression());
  try {
    await pointerClick(connection, '[data-action="end-turn"]');
    await waitForExpression(
      connection,
      `globalThis.__V7_FAST_FORWARD_CONTROL__?.status === 'ERROR' || (${humanTurn} && globalThis.__PULP_WARS_APP__.controller.snapshot().view.round === 2)`,
      1800,
    );
    const control = await evaluate<{ status: string; detail: string | null }>(
      connection,
      `globalThis.__V7_FAST_FORWARD_CONTROL__`,
    );
    if (control.status === "ERROR")
      throw new Error(`Showcase End Turn failed: ${control.detail}`);
  } finally {
    await evaluate(
      connection,
      `globalThis.__V7_FAST_FORWARD_CONTROL_CANCEL__?.()`,
    );
  }
  const returned = await evaluate<ShowcaseCountsV7>(connection, counts);
  if (
    returned.round !== 2 ||
    returned.commandIndex < 2 ||
    returned.cities < 1 ||
    returned.technologies !== 25
  )
    throw new Error(`Showcase End Turn failed: ${JSON.stringify(returned)}`);
  // The save resumes on a fresh default-route load as a Showcase match.
  await navigateFresh(
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE' && (document.querySelector('.v7-resume-summary')?.textContent ?? '').endsWith('Showcase')`,
  );
  await touchClick(connection, '[data-action="resume"]');
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && s.view?.setup.mapType === 'SHOWCASE' && s.view.commandIndex === ${returned.commandIndex}; })()`,
    900,
  );
  await evaluate(
    connection,
    `localStorage.removeItem(${JSON.stringify(saveKey)})`,
  );
  await navigateFresh(freshSetup);
  return `launch with ${started.units} own units/${started.cities} cities/${started.technologies} technologies, End Turn to round ${returned.round} (${returned.commandIndex} commands) and resume`;
}

/**
 * The campaign (pulp_wars-68k.5, docs/product/CAMPAIGN.md section 7.3): the
 * main menu's Campaign opens it with mission 1 open and mission 2
 * locked; mission 1's briefing; Start puts the board on the human's turn;
 * Settings names the mission and a Naval node is unavailable in this
 * mission; the resume screen carries the mission label. On the development
 * server a replay-valid fixture save one command from victory (from
 * `tests/fixtures`) is resumed and won, which records progress and shows
 * the mission Victory dialog, whose Next mission opens mission 2's
 * briefing. Finally, with seeded progress, mission 4's briefing offers
 * exactly the unlocked factions.
 */
async function probeCampaign(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const navigateFresh = async (readiness: string): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_CAMPAIGN_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url: defaultUrl() });
    await waitForExpression(
      connection,
      `globalThis.__V7_CAMPAIGN_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${readiness})`,
    );
  };
  const saveKey = "pulpWars.save.v7r69.current";
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`;
  const humanTurn = `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); const v = s?.view; return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active && v?.turnOrder[v.activeSeatIndex] === v.humanPlayerId; })()`;
  const openCampaign = async (): Promise<void> => {
    await pointerClick(connection, '[data-action="campaign"]');
    await waitForExpression(
      connection,
      `document.querySelector('[data-v7-campaign] .v7-front-panel') !== null && document.querySelector('.v7-main-menu') === null && document.activeElement?.dataset?.action === 'front-back'`,
    );
  };
  await evaluate(
    connection,
    `(() => { localStorage.removeItem(${JSON.stringify(saveKey)}); localStorage.removeItem(${JSON.stringify(CAMPAIGN_KEY_V7)}); })()`,
  );
  await navigateFresh(freshSetup);
  await openCampaign();
  const list = await evaluate<readonly string[]>(
    connection,
    `Array.from(document.querySelectorAll('.v7-mission-card')).map((card) => card.getAttribute('aria-label'))`,
  );
  if (
    JSON.stringify(list) !==
    JSON.stringify([
      "Mission 1, Goblins at the Gate, open",
      "Mission 2, The Warrens, locked",
      "Mission 3, Green Tide, locked",
      "Mission 4, Bone Neck, locked",
    ])
  )
    throw new Error(`Campaign list failed: ${JSON.stringify(list)}`);
  await capture(connection, "campaign-list-desktop.png");
  await pointerClick(connection, '[data-action="mission-frontier_1"]');
  await waitForExpression(
    connection,
    `(() => { const briefing = document.querySelector('[data-v7-region="briefing"]'); return briefing?.dataset.missionId === 'FRONTIER_1' && document.activeElement?.id === 'v7-briefing-title' && briefing.querySelector('h2')?.textContent === 'Goblins at the Gate' && briefing.querySelector('.v7-briefing-objective')?.textContent === 'ObjectiveCapture every enemy city.' && briefing.querySelectorAll('.v7-briefing-hints li').length === 3; })()`,
  );
  await pointerClick(connection, '[data-action="campaign-start"]');
  await waitForExpression(
    connection,
    `${humanTurn} && (() => { const setup = globalThis.__PULP_WARS_APP__.controller.snapshot().view.setup; return setup.mapType === 'MISSION' && setup.mission?.id === 'FRONTIER_1' && document.querySelector('canvas.board-canvas-v7') !== null; })()`,
    900,
  );
  await openCompactSettings(connection);
  await waitForExpression(
    connection,
    `document.querySelector('.v7-mission-label')?.textContent === 'Mission: Goblins at the Gate' && document.querySelector('.v7-mission-objective')?.textContent === 'Objective: Capture every enemy city.' && document.querySelector('.v7-map-seed') === null`,
  );
  await pressKey(connection, "Escape", "Escape");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-motion') === null`,
  );
  await touchClick(connection, '[data-action="tech"]');
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="tech-shorecraft"]')?.getAttribute('aria-label') === 'Sailing, unavailable in this mission'`,
  );
  await pressKey(connection, "Escape", "Escape");
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="tech-shorecraft"]') === null`,
  );
  await openCompactMenuItem(connection, "main-menu");
  await waitForExpression(
    connection,
    `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE' && /^Mission 1 · Goblins at the Gate · Turn \\d+$/.test(document.querySelector('.v7-resume-summary')?.textContent ?? '')`,
  );
  let won = "win skipped on the deployed bundle";
  if (!deployed) {
    // A real, replay-valid FRONTIER_1 save one human command from victory.
    await evaluate(
      connection,
      `(async () => {
        const fixtures = await import('/tests/fixtures/v7-campaign-ui.ts');
        const save = fixtures.missionNearWinSaveV7(new Date().toISOString());
        localStorage.setItem(${JSON.stringify(saveKey)}, save.source);
      })()`,
      true,
    );
    await navigateFresh(
      `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'RESUMABLE' && (document.querySelector('.v7-resume-summary')?.textContent ?? '').startsWith('Mission 1 · Goblins at the Gate')`,
    );
    await touchClick(connection, '[data-action="resume"]');
    await waitForExpression(connection, humanTurn, 900);
    // The test hook: dispatch the offered winning command.
    const dispatched = await evaluate<boolean>(
      connection,
      `(async () => {
        const fixtures = await import('/tests/fixtures/v7-campaign-ui.ts');
        const command = fixtures.missionWinFixtureV7('FRONTIER_1').winningCommand;
        const result = await globalThis.__PULP_WARS_APP__.controller.dispatch(command);
        return result.accepted;
      })()`,
      true,
    );
    if (!dispatched) throw new Error("Campaign winning command was refused");
    // Achievement notices of the final capture come first.
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const shown = await evaluate<string>(
        connection,
        `document.querySelector('[data-v7-region="results"]') !== null ? 'results' : document.querySelector('[data-v7-region="achievement-notice"] button') !== null ? 'notice' : 'wait'`,
      );
      if (shown === "results") break;
      if (shown === "notice")
        await pointerClick(
          connection,
          '[data-v7-region="achievement-notice"] button',
        );
      await delay(150);
    }
    await waitForExpression(
      connection,
      `(() => { const dialog = document.querySelector('[data-v7-region="results"]'); return dialog?.dataset.outcome === 'victory' && dialog.dataset.missionId === 'FRONTIER_1' && dialog.querySelector('h2')?.textContent === 'Mission complete' && dialog.querySelector('[data-action="campaign-next"]') !== null; })()`,
    );
    const recorded = await evaluate<number | null>(
      connection,
      `JSON.parse(localStorage.getItem(${JSON.stringify(CAMPAIGN_KEY_V7)}) ?? 'null')?.completed?.FRONTIER_1?.bestRounds ?? null`,
    );
    if (recorded === null) throw new Error("Campaign win was not recorded");
    await capture(connection, "campaign-victory-desktop.png");
    await pointerClick(connection, '[data-action="campaign-next"]');
    await waitForExpression(
      connection,
      `globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY' && localStorage.getItem(${JSON.stringify(saveKey)}) === null && document.querySelector('[data-v7-region="briefing"]')?.dataset.missionId === 'FRONTIER_2'`,
    );
    won = `mission 1 won in ${recorded} turns, Next mission to the mission 2 briefing`;
  }
  // Seeded progress: mission 4 offers exactly the unlocked factions.
  await evaluate(
    connection,
    `localStorage.setItem(${JSON.stringify(CAMPAIGN_KEY_V7)}, ${JSON.stringify(
      JSON.stringify({
        format: "pulp-wars-campaign-progress",
        version: 1,
        completed: Object.fromEntries(
          ["FRONTIER_1", "FRONTIER_2", "FRONTIER_3"].map((id) => [
            id,
            { firstWonAt: "2026-10-03T12:00:00.000Z", bestRounds: 20 },
          ]),
        ),
      }),
    )})`,
  );
  await navigateFresh(freshSetup);
  await openCampaign();
  await pointerClick(connection, '[data-action="mission-frontier_4"]');
  await waitForExpression(
    connection,
    `JSON.stringify(Array.from(document.querySelectorAll('#v7-campaign-faction option')).map((option) => option.value)) === '["ORIGINAL","GOBLIN"]'`,
  );
  await evaluate(
    connection,
    `(() => { localStorage.removeItem(${JSON.stringify(saveKey)}); localStorage.removeItem(${JSON.stringify(CAMPAIGN_KEY_V7)}); })()`,
  );
  await navigateFresh(freshSetup);
  return `list, briefing, mission 1 start with mission Settings, unavailable Naval tree and resume label; ${won}; mission 4 offers Human and Goblin`;
}

async function fileSha256(filename: string): Promise<string> {
  return createHash("sha256")
    .update(await readFile(filename))
    .digest("hex");
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

async function waitForExpression(
  connection: Connection,
  expression: string,
  attempts = 300,
  intervalMilliseconds = 100,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const ready = await evaluate<boolean>(
      connection,
      `Boolean(${expression})`,
    ).catch(() => false);
    if (ready) return;
    await delay(intervalMilliseconds);
  }
  const diagnostic = await evaluate<unknown>(
    connection,
    `({ url: location.href, text: document.body.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 800), snapshot: globalThis.__PULP_WARS_APP__?.controller.snapshot() })`,
  ).catch((error: unknown) => ({
    diagnosticFailure: error instanceof Error ? error.message : String(error),
  }));
  throw new Error(
    `Chrome timed out waiting for ${expression}: ${JSON.stringify(diagnostic)}`,
  );
}

async function reloadAndWaitForFreshDocument(
  connection: Connection,
  stage: string,
  readinessExpression: string,
): Promise<void> {
  reloadDocumentSequence += 1;
  const marker = `__PULP_WARS_V7_RELOAD_${process.pid}_${reloadDocumentSequence}__`;
  const before = await evaluate<{
    readonly readyState: string;
    readonly timeOrigin: number;
  }>(
    connection,
    `(() => { globalThis[${JSON.stringify(marker)}] = true; return { readyState: document.readyState, timeOrigin: performance.timeOrigin }; })()`,
  );
  await connection.send("Page.reload", { ignoreCache: true });
  try {
    await waitForExpression(
      connection,
      `globalThis[${JSON.stringify(marker)}] !== true && performance.timeOrigin !== ${JSON.stringify(before.timeOrigin)} && document.readyState === 'complete' && Boolean(${readinessExpression})`,
    );
  } catch (error) {
    throw new Error(
      `${stage} did not reach a fresh Ruleset 7 document after reloading ${JSON.stringify(before)}: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

async function pointerClick(
  connection: Connection,
  selector: string,
): Promise<void> {
  const point = await elementCenter(connection, selector);
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

async function typeSelectValue(
  connection: Connection,
  selector: string,
  value: string,
): Promise<void> {
  // macOS native popups can acknowledge ArrowDown/Enter before committing or
  // releasing their mouse event. Trusted typeahead on the focused, closed
  // select exercises real keyboard selection without that native popup.
  const focused = await evaluate<boolean>(
    connection,
    `(() => { const select = document.querySelector(${JSON.stringify(selector)}); return select instanceof HTMLSelectElement && document.activeElement === select && !select.matches(':open'); })()`,
  );
  if (!focused)
    throw new Error(`Select is not focused and closed: ${selector}`);
  // A select that already holds the value is left alone: repeated
  // typeahead keys cycle through the matching options, away from it.
  // (Since pulp_wars-ykw.5 two players keep 11 x 11 when the opponent
  // count goes up and down again.)
  if (
    await evaluate<boolean>(
      connection,
      `document.querySelector(${JSON.stringify(selector)}).value === ${JSON.stringify(value)}`,
    )
  )
    return;
  for (const digit of value) {
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: digit,
      code: `Digit${digit}`,
      text: digit,
      windowsVirtualKeyCode: digit.charCodeAt(0),
    });
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: digit,
      code: `Digit${digit}`,
      windowsVirtualKeyCode: digit.charCodeAt(0),
    });
  }
  await waitForExpression(
    connection,
    `(() => { const select = document.querySelector(${JSON.stringify(selector)}); return select instanceof HTMLSelectElement && document.activeElement === select && !select.matches(':open') && select.value === ${JSON.stringify(value)}; })()`,
  );
}

/**
 * Trusted typeahead on a focused, closed select for any option text (the
 * many-players probe types an opponent count, "D" for Dry land and a
 * size); `value` is the option value the keys must select.
 */
async function typeSelectKeys(
  connection: Connection,
  selector: string,
  keys: string,
  value: string,
): Promise<void> {
  const focused = await evaluate<boolean>(
    connection,
    `(() => { const select = document.querySelector(${JSON.stringify(selector)}); return select instanceof HTMLSelectElement && document.activeElement === select && !select.matches(':open'); })()`,
  );
  if (!focused)
    throw new Error(`Select is not focused and closed: ${selector}`);
  for (const key of keys) {
    const upper = key.toUpperCase();
    const code = /\d/.test(key) ? `Digit${key}` : `Key${upper}`;
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key,
      code,
      text: key,
      windowsVirtualKeyCode: upper.charCodeAt(0),
    });
    await connection.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key,
      code,
      windowsVirtualKeyCode: upper.charCodeAt(0),
    });
  }
  await waitForExpression(
    connection,
    `(() => { const select = document.querySelector(${JSON.stringify(selector)}); return select instanceof HTMLSelectElement && !select.matches(':open') && select.value === ${JSON.stringify(value)}; })()`,
  );
}

/**
 * The front screen is the main menu: New game (a real click) opens the
 * setup form. Does nothing when the form is already open.
 */
async function openNewGame(connection: Connection): Promise<void> {
  const front = await evaluate<string>(
    connection,
    `document.querySelector('.v7-front-screen')?.dataset.v7Front ?? 'none'`,
  );
  if (front === "setup") return;
  if (front !== "menu")
    throw new Error(`New game needs the main menu, not: ${front}`);
  await pointerClick(connection, '[data-action="new-game"]');
  await waitForExpression(connection, SETUP_OPEN_V7);
}

async function launchWithFastForward(connection: Connection): Promise<void> {
  await evaluate(connection, armFastForwardExpression());
  try {
    await pointerClick(connection, '[data-action="launch"]');
    await waitForExpression(
      connection,
      `(() => {
      const evidence = globalThis.__V7_FAST_FORWARD_CONTROL__;
      const snapshot = globalThis.__PULP_WARS_APP__?.controller.snapshot();
      return evidence?.status === 'ERROR' || (snapshot?.phase === 'ACTIVE' && snapshot.view !== null && document.querySelector('[data-v7-setup]') === null && (evidence?.status === 'ACTIVATED' || evidence?.status === 'COMPLETED'));
    })()`,
      900,
      100,
    );
    const evidence = await evaluate<{ status: string; detail: string | null }>(
      connection,
      `globalThis.__V7_FAST_FORWARD_CONTROL__`,
    );
    if (evidence.status === "ERROR")
      throw new Error(`Launch/Fast Forward failed: ${evidence.detail}`);
  } finally {
    await evaluate(
      connection,
      `globalThis.__V7_FAST_FORWARD_CONTROL_CANCEL__?.()`,
    );
  }
}

async function touchClick(
  connection: Connection,
  selector: string,
): Promise<void> {
  const point = await elementCenter(connection, selector);
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [point],
  });
  await connection.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function openCompactSettings(connection: Connection): Promise<void> {
  await openCompactMenuItem(connection, "settings");
  await waitForExpression(
    connection,
    `document.querySelector('#v7-motion') !== null`,
  );
}

async function openCompactMenuItem(
  connection: Connection,
  action: string,
): Promise<void> {
  const selector = `[data-action="${action}"]`;
  const itemVisible = await evaluate<boolean>(
    connection,
    `(() => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!(node instanceof HTMLButtonElement)) return false;
      const rect = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    })()`,
  );
  if (!itemVisible) {
    await touchClick(connection, '[data-action="compact-menu"]');
    await waitForExpression(
      connection,
      `document.querySelector('[data-action="compact-menu"]')?.getAttribute('aria-expanded') === 'true'`,
    );
  }
  await touchClick(connection, selector);
}

async function elementCenter(
  connection: Connection,
  selector: string,
): Promise<{ readonly x: number; readonly y: number }> {
  return evaluate(connection, stableControlPointExpression(selector), true);
}

/**
 * Setup defaults to "New map" (a random seed per launch). The smoke needs
 * fixed maps, so it chooses "Use seed", which reveals the seed field.
 */
async function chooseUseSeed(connection: Connection): Promise<void> {
  await pointerClick(connection, '[data-action="seed-mode-seed"]');
  await waitForExpression(
    connection,
    `document.querySelector('.v7-seed-choice')?.dataset.seedMode === 'seed' && document.querySelector('[data-action="seed-mode-seed"]')?.getAttribute('aria-pressed') === 'true' && document.querySelector('#v7-seed')?.closest('label')?.hidden === false`,
  );
}

async function replaceSeedInput(
  connection: Connection,
  value: string,
): Promise<void> {
  await chooseUseSeed(connection);
  await pointerClick(connection, "#v7-seed");
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    commands: ["selectAll"],
  });
  await connection.send("Input.insertText", { text: value });
  const actual = await evaluate<string>(
    connection,
    `document.querySelector('#v7-seed')?.value`,
  );
  if (actual !== value)
    throw new Error(
      `Seed replacement failed: expected ${value}, got ${actual}`,
    );
}

async function pressKey(
  connection: Connection,
  key: string,
  code: string,
  modifiers = 0,
): Promise<void> {
  const virtualKeyCode = virtualKeyCodeFor(code);
  await connection.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key,
    code,
    modifiers,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  });
}

function virtualKeyCodeFor(code: string): number {
  const codePoint = {
    ArrowDown: 40,
    ArrowLeft: 37,
    ArrowRight: 39,
    ArrowUp: 38,
    Enter: 13,
    Escape: 27,
    Home: 36,
    KeyA: 65,
    Tab: 9,
  }[code];
  if (codePoint === undefined)
    throw new Error(`Missing virtual key code for ${code}`);
  return codePoint;
}

function wslPathToWindows(input: string): string {
  const match = /^\/mnt\/([a-z])\/(.*)$/i.exec(input);
  if (match?.[1] === undefined || match[2] === undefined)
    throw new Error(`Cannot convert WSL path for Chrome: ${input}`);
  return `${match[1].toUpperCase()}:\\${match[2].replaceAll("/", "\\")}`;
}

async function stopBrowser(
  browserProcess: ReturnType<typeof spawn>,
): Promise<void> {
  if (browserProcess.exitCode !== null || browserProcess.signalCode !== null)
    return;
  browserProcess.kill();
  if (await waitForProcessExit(browserProcess, 5_000)) return;
  browserProcess.kill("SIGKILL");
  await waitForProcessExit(browserProcess, 2_000);
}

function waitForProcessExit(
  browserProcess: ReturnType<typeof spawn>,
  timeoutMilliseconds: number,
): Promise<boolean> {
  if (browserProcess.exitCode !== null || browserProcess.signalCode !== null)
    return Promise.resolve(true);
  return new Promise((resolve) => {
    const finish = (exited: boolean) => {
      clearTimeout(timeout);
      browserProcess.off("exit", onExit);
      resolve(exited);
    };
    const onExit = () => finish(true);
    const timeout = setTimeout(() => finish(false), timeoutMilliseconds);
    browserProcess.once("exit", onExit);
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
    path.join(reviewRoot, name),
    Buffer.from(response.data, "base64"),
  );
}

function routeUrl(current: string, search: string): string {
  const url = new URL(current);
  url.search = search;
  return url.href;
}

function smokeUrl(input: string): string {
  const url = new URL(input);
  url.searchParams.delete("ruleset");
  url.searchParams.set("browser-smoke", "1");
  return url.href;
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
      if (message.error !== undefined)
        request.reject(
          new Error(
            `${request.method}: ${message.error.message ?? "CDP command failed"}`,
          ),
        );
      else request.resolve(message.result);
      return;
    }
    if (message.method !== undefined)
      for (const listener of listeners)
        listener(message.method, message.params);
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
    onEvent(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    close: () => socket.close(),
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
    if (value?.level === "error" && value.source !== "network")
      return JSON.stringify(params);
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

/**
 * Score and modes (pulp_wars-kaw6.4, RULESET_7_SCORE_AND_STARS.md sections
 * 4.2 and 7): the new-game screen starts in Domination; Perfection is chosen
 * on the mode toggle and a tribe on the grid, both by keyboard, and the
 * launched match's setup and score view are Perfection, 30 rounds. No turn
 * is played; the save and the remembered mode are cleared after.
 */
async function probePerfectionStart(connection: Connection): Promise<string> {
  const defaultUrl = (): string => {
    const url = new URL(baseUrl);
    url.searchParams.delete("art");
    return url.href;
  };
  const saveKey = "pulpWars.save.v7r69.current";
  const modeKey = "pulpWars.ruleset7.gameMode.v1";
  const freshSetup = `document.querySelector('[data-v7-setup]') !== null && globalThis.__PULP_WARS_APP__?.controller.snapshot().phase === 'EMPTY'`;
  const navigateFresh = async (): Promise<void> => {
    await evaluate(
      connection,
      `globalThis.__V7_PERFECTION_PRIOR_DOCUMENT__ = true`,
    );
    await connection.send("Page.navigate", { url: defaultUrl() });
    await waitForExpression(
      connection,
      `globalThis.__V7_PERFECTION_PRIOR_DOCUMENT__ !== true && document.readyState === 'complete' && Boolean(${freshSetup})`,
    );
  };
  const clearKeys = `(() => { localStorage.removeItem(${JSON.stringify(saveKey)}); localStorage.removeItem(${JSON.stringify(modeKey)}); return true; })()`;
  await evaluate(connection, clearKeys);
  await navigateFresh();
  await openNewGame(connection);
  await waitForExpression(
    connection,
    `document.querySelectorAll('.v7-tribe-card').length === 8 && document.querySelector('[data-action="game-mode-domination"]')?.getAttribute('aria-pressed') === 'true'`,
  );
  await evaluate(
    connection,
    `document.querySelector('[data-action="game-mode-perfection"]').focus()`,
  );
  await pressSpaceV7(connection);
  await waitForExpression(
    connection,
    `document.querySelector('[data-action="game-mode-perfection"]')?.getAttribute('aria-pressed') === 'true' && document.querySelector('.v7-game-mode-line')?.textContent === '30 rounds. The highest score wins.'`,
  );
  await pickTribeV7(connection, "MARTIAN");
  await capture(connection, "perfection-setup-desktop.png");
  await replaceSeedInput(connection, "6");
  await launchWithFastForward(connection);
  await waitForExpression(
    connection,
    `(() => { const s = globalThis.__PULP_WARS_APP__?.controller.snapshot(); return s?.phase === 'ACTIVE' && !s.transitioning && !s.ai.active; })()`,
    900,
  );
  const started = await evaluate<{
    readonly gameMode: string | null;
    readonly scoreMode: string | null;
    readonly roundLimit: number | null;
    readonly faction: string | null;
  }>(
    connection,
    `(() => { const v = globalThis.__PULP_WARS_APP__.controller.snapshot().view; return { gameMode: v?.setup.gameMode ?? null, scoreMode: v?.score.gameMode ?? null, roundLimit: v?.score.roundLimit ?? null, faction: v?.setup.factions[0] ?? null }; })()`,
  );
  if (
    started.gameMode !== "PERFECTION" ||
    started.scoreMode !== "PERFECTION" ||
    started.roundLimit !== 30 ||
    started.faction !== "MARTIAN"
  )
    throw new Error(`Perfection launch failed: ${JSON.stringify(started)}`);
  await capture(connection, "perfection-launch-desktop.png");
  await evaluate(connection, clearKeys);
  await navigateFresh();
  return "launched as Martians from the mode toggle and tribe grid, 30 rounds";
}

/**
 * Picks the human's tribe on the new-game grid by keyboard (pulp_wars-kaw6.4,
 * RULESET_7_SCORE_AND_STARS.md section 7): the grid's tab stop is focused,
 * the arrow keys move to the tribe's card, and Space picks it.
 */
async function pickTribeV7(
  connection: Connection,
  faction: string,
): Promise<void> {
  await evaluate(
    connection,
    `document.querySelector('.v7-tribe-card[tabindex="0"]').focus()`,
  );
  for (let step = 0; step < 8; step += 1) {
    const focused = await evaluate<string | null>(
      connection,
      `document.activeElement?.dataset?.faction ?? null`,
    );
    if (focused === faction) break;
    await pressKey(connection, "ArrowRight", "ArrowRight");
  }
  await pressSpaceV7(connection);
  await waitForExpression(
    connection,
    `document.querySelector('.v7-tribe-card[data-faction="${faction}"]')?.getAttribute('aria-checked') === 'true' && document.querySelector('#v7-faction-0')?.value === '${faction}'`,
  );
}

/** A trusted Space on the focused control (a button's keyboard click). */
async function pressSpaceV7(connection: Connection): Promise<void> {
  await connection.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: " ",
    code: "Space",
    text: " ",
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
}
