/**
 * Shared browser expression for the Undead UI fixtures (dev server only,
 * because it imports `tests/fixtures`). It replaces the running app with a
 * `Ruleset7DomAppView` over a local fixture controller that applies human
 * commands through the engine and publishes their projected boundaries, and
 * exposes `globalThis.__UNDEAD_REVIEW__` ({ boardHost, traces, view, at,
 * afflictions, snapshotView }). Used by the Undead review script and the
 * Ruleset 7 browser smoke.
 */
export type UndeadUiFixtureNameV7 =
  | "undeadShowcaseFixtureV7"
  | "afflictionHumanFixtureV7"
  | "afflictionUndeadFixtureV7";

export function undeadFixtureMountExpressionV7(
  fixture: UndeadUiFixtureNameV7,
  artSet: "LEGACY" | "CHIBI",
): string {
  return ruleset7FixtureMountExpressionV7({
    module: "/tests/fixtures/v7-undead-ui.ts",
    fixture,
    artSet,
    global: "__UNDEAD_REVIEW__",
    extras:
      "at: fixtures.UNDEAD_SHOWCASE_V7, afflictions: fixtures.AFFLICTION_SHOWCASE_V7",
  });
}

/**
 * The shared fixture mount (Undead and, revision 17, Goblin UI fixtures):
 * replaces the running app with a `Ruleset7DomAppView` over a local fixture
 * controller and exposes `globalThis[global]` ({ boardHost, traces, view,
 * snapshotView, ...extras }).
 */
export function ruleset7FixtureMountExpressionV7(options: {
  readonly module: string;
  readonly fixture: string;
  readonly artSet: "LEGACY" | "CHIBI";
  readonly global: string;
  /** Object-literal members evaluated with `fixtures` in scope. */
  readonly extras: string;
  /**
   * The settings storage of the mounted view (default none). The Rift review
   * (bead pulp_wars-9s0.5) passes the page's localStorage so the developer
   * option "Classic look" stored there applies.
   */
  readonly settingsStorage?: "localStorage";
}): string {
  const global = JSON.stringify(options.global);
  return `(async () => {
      const engine = await import('/src/engine/index.ts');
      const fixtures = await import(${JSON.stringify(options.module)});
      const { Ruleset7DomAppView } = await import('/src/render/dom/app-view-v7.ts');
      const { CanvasBoardHostV7 } = await import('/src/render/canvas/board-host-v7.ts');
      globalThis.__PULP_WARS_APP__?.destroy();
      globalThis[${global}]?.view?.destroy?.();
      let state = fixtures[${JSON.stringify(options.fixture)}]();
      const subscribers = new Set();
      const boundarySubscribers = new Set();
      const traces = [];
      const ai = { active: false, fastForward: false, policySlices: 0, acceptedCommands: 0, lastSliceMilliseconds: 0, maximumSliceMilliseconds: 0 };
      const snapshot = () => {
        const view = engine.viewForV7(state, state.humanPlayerId);
        return { phase: 'ACTIVE', view, offeredCommands: engine.queryPlayerCommandsV7(view), savedAt: null, hasStoredSave: false, recovery: null, saveWarning: null, diagnostic: null, transitioning: false, ai };
      };
      const controller = {
        snapshot,
        subscribe(subscriber) { subscribers.add(subscriber); subscriber(snapshot()); return () => subscribers.delete(subscriber); },
        subscribeAcceptedBoundary(subscriber) { boundarySubscribers.add(subscriber); return () => boundarySubscribers.delete(subscriber); },
        async dispatch(command) {
          const beforeState = state;
          const beforeView = engine.viewForV7(beforeState, beforeState.humanPlayerId);
          const applied = engine.applyCommandV7(beforeState, beforeState.humanPlayerId, command);
          if (!applied.accepted) return { accepted: false, reason: 'ENGINE_REJECTED', error: applied.error };
          state = applied.state;
          const afterView = engine.viewForV7(state, state.humanPlayerId);
          const playerEvents = engine.projectEventsV7(beforeState, state, state.humanPlayerId, applied.events);
          traces.push({ command, eventKinds: playerEvents.events.map((event) => event.kind) });
          const boundary = { actor: 'HUMAN', beforeView, afterView, playerEvents };
          for (const subscriber of boundarySubscribers) subscriber(boundary);
          const next = snapshot();
          for (const subscriber of subscribers) subscriber(next);
          return { accepted: true, beforeView, afterView, playerEvents };
        },
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
      const root = document.querySelector('#app');
      const boardHost = new CanvasBoardHostV7(document);
      const view = new Ruleset7DomAppView(document, root, controller, { boardHost, settingsStorage: ${options.settingsStorage === "localStorage" ? "localStorage" : "null"}, artSet: ${JSON.stringify(options.artSet)} });
      globalThis[${global}] = { boardHost, traces, view, snapshotView: () => snapshot().view, ${options.extras} };
    })()`;
}

/**
 * Browser expression returning the affliction evidence of the mounted
 * fixture: the board plan's marker entries (`label:PLAGUE+BITTEN`) and the
 * selection dock's affliction chips and Disband explanation.
 */
export function afflictionEvidenceExpressionV7(): string {
  return `(async () => {
      const { buildBoardRenderPlanV7 } = await import('/src/render/canvas/board-renderer-v7.ts');
      const view = globalThis.__UNDEAD_REVIEW__.snapshotView();
      const markers = buildBoardRenderPlanV7(view, [], { selection: null, selectedUnitId: null, selectedAchievement: null })
        .entries.filter((entry) => entry.afflictions !== undefined)
        .map((entry) => entry.label + ':' + entry.afflictions.join('+'));
      const disband = document.querySelector('[data-action="affliction-disband"]');
      return {
        markers,
        chips: Array.from(document.querySelectorAll('.v7-selection-dock .v7-affliction-chip')).map((node) => node.getAttribute('aria-label')),
        disband: disband?.getAttribute('aria-label') ?? null,
        disbandDisabled: disband?.getAttribute('aria-disabled') ?? null,
      };
    })()`;
}

export const AFFLICTION_HUMAN_MARKERS_V7 = [
  "Fighter:PLAGUE",
  "Marksman:BITTEN",
  "Guard:PLAGUE+BITTEN",
] as const;
