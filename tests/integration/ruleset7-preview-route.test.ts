// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  bootstrapRuleset7App,
  selectBrowserRulesetRoute,
  type Ruleset7AiProgressScheduler,
  type Ruleset7PolicyWork,
} from "../../src/app/index";
import {
  queryPlayerCommandsV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import type { NormalAiDecisionV7 } from "../../src/ai/index";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

describe("Ruleset 7 temporary preview route", () => {
  it("keeps default and exact v6 compatibility routing while rejecting unsupported nonempty values", () => {
    expect(selectBrowserRulesetRoute("", true)).toEqual({
      kind: "RULESET_6",
    });
    expect(selectBrowserRulesetRoute("?ruleset=", true)).toEqual({
      kind: "RULESET_6",
    });
    expect(selectBrowserRulesetRoute("?ruleset=6", true)).toEqual({
      kind: "RULESET_6",
    });
    expect(selectBrowserRulesetRoute("?ruleset=7", true)).toEqual({
      kind: "RULESET_7_PREVIEW",
    });
    expect(selectBrowserRulesetRoute("?legacy-v5=1", true)).toEqual({
      kind: "LEGACY_V5",
    });
    expect(selectBrowserRulesetRoute("?legacy-v5=1", false)).toEqual({
      kind: "RULESET_6",
    });
    expect(selectBrowserRulesetRoute("?ruleset=8", true)).toEqual({
      kind: "UNSUPPORTED",
      value: "8",
    });
    expect(selectBrowserRulesetRoute("?ruleset=7&ruleset=6", true)).toEqual({
      kind: "UNSUPPORTED",
      value: "7,6",
    });
  });

  it("launches a fixed-Original human-first setup without replacing controls on field changes", async () => {
    const safeDownload = vi.fn();
    const debugDownload = vi.fn();
    const app = bootstrapRuleset7App(document, {
      storage: null,
      createAiPolicyWork: immediateEndTurnWork,
      downloadSafeLog: safeDownload,
      downloadDebugBundle: debugDownload,
      diagnosticNow: () => "2026-09-08T12:34:56.789Z",
    });
    expect(document.body.textContent).toContain(
      "temporary integration preview",
    );
    expect(document.body.textContent).toContain("Original-only");
    expect(document.body.textContent).not.toContain("CANDY");

    const count = requiredSelect("v7-ai-count");
    const launch = requiredButton('[data-action="launch"]');
    count.focus();
    count.value = "3";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.activeElement).toBe(count);
    expect(requiredButton('[data-action="launch"]')).toBe(launch);
    expect(selectValues("v7-board-size")).toEqual(["16", "20", "25"]);
    expect(document.body.textContent).toContain("4 fixed Original seats");

    count.value = "1";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    const seed = requiredInput("v7-seed");
    seed.value = "2";
    seed.dispatchEvent(new Event("change", { bubbles: true }));
    expect(requiredButton('[data-action="launch"]')).toBe(launch);
    launch.click();
    await waitUntil(() => app.controller.snapshot().phase === "ACTIVE");
    expect(app.controller.snapshot().view?.setup).toMatchObject({
      seed: 2,
      factions: ["ORIGINAL", "ORIGINAL"],
    });
    expect(document.body.textContent).toContain(
      "canonical Start Turn boundary",
    );

    requiredButton('[data-action="export-safe-log"]').click();
    expect(safeDownload).toHaveBeenCalledOnce();
    expect(JSON.parse(safeDownload.mock.calls[0]?.[0] ?? "{}")).toMatchObject({
      log: { classification: "PLAYER_SAFE" },
    });
    expect(document.querySelector("#v7-live")?.textContent).toContain(
      "Player-safe",
    );
    requiredButton('[data-action="export-debug-with-spoilers"]').click();
    expect(debugDownload).toHaveBeenCalledOnce();
    expect(
      requiredButton('[data-action="export-debug-with-spoilers"]').ariaLabel,
    ).toContain("hidden map and units");
    expect(debugDownload.mock.calls[0]?.[1]).toContain("with-spoilers");
    app.destroy();
  });

  it("keeps Fast Forward and Restart controls stable across policy slices", async () => {
    const scheduler = manualScheduler();
    const app = bootstrapRuleset7App(document, {
      storage: null,
      aiProgressScheduler: scheduler.schedule,
      createAiPolicyWork: (view) => {
        let first = true;
        return {
          runSlice() {
            if (first) {
              first = false;
              return null;
            }
            return endTurnDecision(view);
          },
        };
      },
    });
    requiredInput("v7-seed").value = "0";
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => app.controller.snapshot().ai.active);
    const fast = requiredButton('[data-action="fast-forward"]');
    const restart = requiredButton('[data-action="restart"]');
    fast.focus();
    fast.click();
    expect(document.activeElement).toBe(fast);
    expect(requiredButton('[data-action="fast-forward"]')).toBe(fast);
    expect(fast.textContent).toContain("enabled");

    restart.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    scheduler.runNext();
    await Promise.resolve();
    expect(requiredButton('[data-action="restart"]')).toBe(restart);
    restart.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    restart.click();
    await waitUntil(
      () =>
        app.controller.snapshot().view?.commandIndex === 0 &&
        scheduler.activeCount() === 1,
    );
    expect(restart.isConnected).toBe(false);
    expect(document.body.textContent).toContain("Restart");
    app.destroy();
  });

  it("keeps replacement editing active after select changes and shows AI errors", async () => {
    window.localStorage.setItem(
      "pulpWars.save.v7r2.current",
      "{ incompatible-but-preserved",
    );
    const recovery = bootstrapRuleset7App(document, {
      storage: window.localStorage,
    });
    expect(document.body.textContent).toContain("Preserved Ruleset 7 save");
    recovery.destroy();

    window.localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    const first = bootstrapRuleset7App(document, {
      storage: window.localStorage,
      createAiPolicyWork: immediateEndTurnWork,
    });
    requiredInput("v7-seed").value = "2";
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => first.controller.snapshot().phase === "ACTIVE");
    first.controller.flushPersistence();
    first.destroy();

    document.body.innerHTML = '<div id="app"></div>';
    const resumed = bootstrapRuleset7App(document, {
      storage: window.localStorage,
    });
    expect(resumed.controller.snapshot().phase).toBe("RESUMABLE");
    requiredButton('[data-action="show-replace"]').click();
    const count = requiredSelect("v7-ai-count");
    count.value = "2";
    count.dispatchEvent(new Event("change", { bubbles: true }));
    expect(document.querySelector("[data-v7-setup]")).not.toBeNull();
    expect(document.body.textContent).toContain("Replace this Ruleset 7 save");
    resumed.destroy();

    window.localStorage.clear();
    document.body.innerHTML = '<div id="app"></div>';
    const scheduler = manualScheduler();
    const errored = bootstrapRuleset7App(document, {
      storage: null,
      aiProgressScheduler: scheduler.schedule,
      createAiPolicyWork: () => ({
        runSlice() {
          throw new Error("synthetic public policy failure");
        },
      }),
    });
    requiredInput("v7-seed").value = "0";
    requiredButton('[data-action="launch"]').click();
    await waitUntil(() => scheduler.activeCount() === 1);
    scheduler.runNext();
    await waitUntil(() => errored.controller.snapshot().phase === "ERROR");
    await Promise.resolve();
    expect(document.body.textContent).toContain("Match paused");
    expect(document.body.textContent).toContain(
      "synthetic public policy failure",
    );
    errored.destroy();
  });
});

function immediateEndTurnWork(view: PlayerViewV7): Ruleset7PolicyWork {
  return { runSlice: () => endTurnDecision(view) };
}

function endTurnDecision(view: PlayerViewV7): NormalAiDecisionV7 {
  const command = queryPlayerCommandsV7(view).find(
    (candidate) => candidate.kind === "END_TURN",
  );
  if (command === undefined) throw new Error("END_TURN missing");
  return {
    difficulty: "NORMAL",
    candidates: [
      {
        command,
        score: {
          priority: 0,
          strategicValue: 0,
          immediateValue: 0,
          futureValue: 0,
          safetyValue: 0,
          objectiveValue: 0,
          deterministicTieBreak: [0, 0, 0, 0, 0],
        },
        tuple: [0],
      },
    ],
    command,
    pursuitNodesSearched: 0,
    prngDraws: 0,
  };
}

function manualScheduler(): {
  readonly schedule: Ruleset7AiProgressScheduler;
  activeCount(): number;
  runNext(): void;
} {
  const entries: { readonly task: () => void; cancelled: boolean }[] = [];
  return {
    schedule(task) {
      const entry = { task, cancelled: false };
      entries.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    activeCount: () => entries.filter((entry) => !entry.cancelled).length,
    runNext() {
      const entry = entries.find((candidate) => !candidate.cancelled);
      if (entry === undefined) throw new Error("callback missing");
      entry.cancelled = true;
      entry.task();
    },
  };
}

function requiredButton(selector: string): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(selector);
  if (button === null) throw new Error(`button missing: ${selector}`);
  return button;
}

function requiredInput(id: string): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>(`#${id}`);
  if (input === null) throw new Error(`input missing: ${id}`);
  return input;
}

function requiredSelect(id: string): HTMLSelectElement {
  const select = document.querySelector<HTMLSelectElement>(`#${id}`);
  if (select === null) throw new Error(`select missing: ${id}`);
  return select;
}

function selectValues(id: string): readonly string[] {
  return Array.from(requiredSelect(id).options, (option) => option.value);
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (predicate()) return;
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("timed out");
}
