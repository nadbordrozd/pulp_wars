// @vitest-environment jsdom

// Bead pulp_wars-2yc.96: a failure the presentation guard survives shows
// the player a small notice, once per session, with "Copy details" (a
// plain-text report for the developer); the match menu gains "Copy error
// report" and the exports carry the failures. The real browser controller
// and DOM app view on the Showcase board, with a board host whose playback
// throws; no match is played (the human sends a Move or two).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Ruleset7BrowserController,
  type Ruleset7AiProgressScheduler,
} from "../../src/app/index";
import {
  RULESET_7_ID,
  distinctFactionsV7,
  type CommandV7,
  type MatchSetupV7,
} from "../../src/engine/index";
import type {
  BoardHostCallbacksV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { Ruleset7DomAppView } from "../../src/render/dom/app-view-v7";
import {
  notePresentationStepV7,
  resetPresentationFailureMemoryV7,
} from "../../src/render/presentation-guard-v7";
import {
  COPIED_LABEL_V7,
  COPY_FAILED_LABEL_V7,
  ERROR_REPORT_COPIED_V7,
  FAILURE_NOTICE_TEXT_V7,
} from "../../src/render/failure-report-v7";

const NOTICE = '[data-v7-region="failure-notice"]';

let written: string[] = [];

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
  resetPresentationFailureMemoryV7();
  vi.spyOn(console, "error").mockImplementation(() => {});
  written = [];
  setClipboard(async (text: string) => {
    written.push(text);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  setClipboard(undefined);
  Reflect.deleteProperty(document, "execCommand");
});

describe("the failure notice (pulp_wars-2yc.96)", () => {
  it("shows once per session, never disables End Turn, and is dismissible", async () => {
    const rig = await mountRig(new ThrowingBoardHost(3));
    expect(document.querySelector(NOTICE)).toBeNull();
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    const notice = document.querySelectorAll(NOTICE);
    expect(notice).toHaveLength(1);
    expect(notice[0]?.textContent).toContain(FAILURE_NOTICE_TEXT_V7);
    expect(notice[0]?.getAttribute("aria-modal")).toBeNull();
    expect(rig.endTurn()?.disabled).toBe(false);
    expect(rig.endTurn()?.isConnected).toBe(true);
    // A second failure: still one notice, kept across renders.
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    expect(document.querySelectorAll(NOTICE)).toHaveLength(1);
    expect(rig.endTurn()?.disabled).toBe(false);
    click('[data-action="dismiss-failure-notice"]');
    expect(document.querySelector(NOTICE)).toBeNull();
    // A later failure this session does not open it again.
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    expect(document.querySelector(NOTICE)).toBeNull();
    expect(rig.endTurn()?.disabled).toBe(false);
    rig.destroy();
  });

  it("copies a report with the error, stack, step, ruleset, build, screen and browser", async () => {
    const rig = await mountRig(new ThrowingBoardHost(1));
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    click('[data-action="copy-failure-details"]');
    await flush();
    expect(
      document.querySelector('[data-action="copy-failure-details"]')
        ?.textContent,
    ).toBe(COPIED_LABEL_V7);
    expect(written).toHaveLength(1);
    const report = written[0] ?? "";
    const lines = report.split("\n");
    expect(lines[0]).toBe("Pulp Wars error report");
    expect(report).toMatch(/^Time: \d{4}-\d{2}-\d{2}T/m);
    expect(report).toMatch(/^Build: 0\.1\.0/m);
    expect(report).toContain(`Ruleset: ${RULESET_7_ID}`);
    expect(report).toMatch(/^Screen: \d+x\d+ @\d+(\.\d+)?x$/m);
    expect(report).toContain(`Browser: ${navigator.userAgent}`);
    expect(report).toMatch(/^Failures this session: [1-9]\d*$/m);
    expect(report).toMatch(/^#1 .+ in a boundary's playback$/m);
    expect(report).toContain("Step: ATTACK");
    expect(report).toContain("Error: playback step failed");
    expect(report).toMatch(/^ {2}at /m);
    expect(report).toMatch(/^Recent: command MOVE > HUMAN events /m);
    // No save, no map.
    expect(report).not.toContain("stateHash");
    expect(report).not.toContain("tiles");
    rig.destroy();
  });

  it("falls back to the copy command, then to the report shown for copying by hand", async () => {
    setClipboard(undefined);
    let copyWorks = true;
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn(() => copyWorks),
    });
    const rig = await mountRig(new ThrowingBoardHost(1));
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    click('[data-action="copy-failure-details"]');
    await flush();
    const copy = document.querySelector('[data-action="copy-failure-details"]');
    expect(copy?.textContent).toBe(COPIED_LABEL_V7);
    expect(document.querySelector("textarea")).toBeNull();
    copyWorks = false;
    click('[data-action="copy-failure-details"]');
    await flush();
    expect(copy?.textContent).toBe(COPY_FAILED_LABEL_V7);
    const area = document.querySelector<HTMLTextAreaElement>(
      ".v7-failure-notice-report",
    );
    expect(area?.value).toContain("Pulp Wars error report");
    expect(rig.endTurn()?.disabled).toBe(false);
    rig.destroy();
  });

  it("adds Copy error report to the match menu only after a failure", async () => {
    const rig = await mountRig(new ThrowingBoardHost(1));
    click('[data-action="compact-menu"]');
    expect(document.querySelector('[data-action="main-menu"]')).not.toBeNull();
    expect(
      document.querySelector('[data-action="copy-error-report"]'),
    ).toBeNull();
    click('[data-action="compact-menu"]');
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    click('[data-action="compact-menu"]');
    click('[data-action="copy-error-report"]');
    await flush();
    expect(written).toHaveLength(1);
    expect(written[0]).toContain("in a boundary's playback");
    expect(document.querySelector(".v7-toast")?.textContent).toBe(
      ERROR_REPORT_COPIED_V7,
    );
    expect(rig.endTurn()?.disabled).toBe(false);
    rig.destroy();
  });

  it("puts the failures in the exported game log and debug bundle", async () => {
    const logs: string[] = [];
    const bundles: string[] = [];
    const rig = await mountRig(new ThrowingBoardHost(1), {
      downloadSafeLog: (source) => logs.push(source),
      downloadDebugBundle: (source) => bundles.push(source),
    });
    expect(await rig.view.dispatchForReview(rig.humanMove())).toBe(true);
    await flush();
    click('[data-action="compact-menu"]');
    click('[data-action="settings"]');
    click('[data-action="export-safe-log"]');
    click('[data-action="export-debug-with-spoilers"]');
    const log = JSON.parse(logs[0] ?? "{}") as {
      diagnostics: { presentationFailures: { where: string }[] };
    };
    expect(log.diagnostics.presentationFailures[0]?.where).toBe(
      "a boundary's playback",
    );
    const bundle = JSON.parse(bundles[0] ?? "{}") as {
      payload: { presentationFailures: { step: string }[] };
    };
    expect(bundle.payload.presentationFailures[0]?.step).toBe("ATTACK");
    rig.destroy();
  });
});

function setClipboard(
  writeText: ((text: string) => Promise<void>) | undefined,
): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: writeText === undefined ? undefined : { writeText },
  });
}

function click(selector: string): void {
  const target = document.querySelector<HTMLButtonElement>(selector);
  if (target === null) throw new Error(`missing ${selector}`);
  target.click();
}

interface Rig {
  readonly view: Ruleset7DomAppView;
  humanMove(): CommandV7;
  endTurn(): HTMLButtonElement | null;
  destroy(): void;
}

async function mountRig(
  host: ThrowingBoardHost,
  downloads: {
    readonly downloadSafeLog?: (source: string, filename: string) => void;
    readonly downloadDebugBundle?: (source: string, filename: string) => void;
  } = {},
): Promise<Rig> {
  const schedule: Ruleset7AiProgressScheduler = () => () => {};
  const controller = new Ruleset7BrowserController({
    aiProgressScheduler: schedule,
  });
  const launched = await controller.launch(showcaseSetup());
  if (!launched.ok) throw new Error(launched.diagnostic);
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app");
  const view = new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
    ...downloads,
  });
  await flush();
  return {
    view,
    humanMove() {
      const move = controller
        .snapshot()
        .offeredCommands.find((command) => command.kind === "MOVE");
      if (move === undefined) throw new Error("no Move offered");
      return move;
    },
    endTurn: () =>
      document.querySelector<HTMLButtonElement>('[data-action="end-turn"]'),
    destroy() {
      view.destroy();
      controller.destroy();
    },
  };
}

/** The Showcase board: every seat starts with its whole roster. */
function showcaseSetup(): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 0,
    width: 16,
    height: 16,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: distinctFactionsV7(2),
    mapType: "SHOWCASE",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * A board whose first `failures` playbacks throw in their ATTACK step (as
 * the real board names the step it announces).
 */
class ThrowingBoardHost implements BoardHostV7 {
  presented = 0;
  readonly #failures: number;
  constructor(failures: number) {
    this.#failures = failures;
  }
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    void callbacks;
    const canvas = container.ownerDocument.createElement("canvas");
    canvas.className = "board-canvas-v7";
    container.replaceChildren(canvas);
  }
  update(): void {}
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {
    this.presented += 1;
    notePresentationStepV7("ATTACK");
    if (this.presented <= this.#failures)
      throw new Error("playback step failed");
  }
  finishPresentations(): void {}
  destroy(): void {}
}

async function flush(): Promise<void> {
  for (let index = 0; index < 8; index += 1)
    await new Promise((resolve) => setTimeout(resolve, 0));
}
