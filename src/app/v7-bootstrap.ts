import type {
  CommandV7,
  MatchSetupV7,
  PlayerColorV7,
  PlayerViewV7,
} from "../engine/index";
import type { StorageAdapter } from "../persistence/index";
import { downloadJsonFile } from "./browser-download";
import {
  Ruleset7BrowserController,
  type Ruleset7BrowserControllerOptions,
  type Ruleset7BrowserSnapshot,
} from "./v7-controller";

const BOARD_SIZES = [11, 14, 16, 20, 25] as const;
const COLORS: readonly PlayerColorV7[] = ["CORAL", "TEAL", "GOLD", "VIOLET"];

export interface MountRuleset7PreviewOptions {
  readonly downloadSafeLog?: (source: string, filename: string) => void;
  readonly downloadDebugBundle?: (source: string, filename: string) => void;
}

export interface BootstrapRuleset7Options
  extends Ruleset7BrowserControllerOptions, MountRuleset7PreviewOptions {}

export interface BootstrappedRuleset7App {
  readonly controller: Ruleset7BrowserController;
  readonly view: Ruleset7PreviewView;
  destroy(): void;
}

interface PreviewDraftV7 {
  readonly aiCount: 1 | 2 | 3;
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly boardSize: (typeof BOARD_SIZES)[number];
  readonly seedText: string;
  readonly humanColor: PlayerColorV7;
}

/** Minimal public-only integration preview; complete tactical UI is bead 15/17. */
export class Ruleset7PreviewView {
  readonly #document: Document;
  readonly #root: HTMLElement;
  readonly #controller: Ruleset7BrowserController;
  readonly #downloadSafeLog: (source: string, filename: string) => void;
  readonly #downloadDebugBundle: (source: string, filename: string) => void;
  #snapshot: Ruleset7BrowserSnapshot;
  #unsubscribe: (() => void) | null = null;
  #draft: PreviewDraftV7 = {
    aiCount: 1,
    aiMode: "RIVAL",
    boardSize: 11,
    seedText: "42",
    humanColor: "CORAL",
  };
  #notice = "";
  #error = "";
  #replacing = false;
  #destroyed = false;

  constructor(
    documentRoot: Document,
    root: HTMLElement,
    controller: Ruleset7BrowserController,
    options: MountRuleset7PreviewOptions = {},
  ) {
    this.#document = documentRoot;
    this.#root = root;
    this.#controller = controller;
    this.#downloadSafeLog =
      options.downloadSafeLog ??
      ((source, filename) => downloadJsonFile(documentRoot, source, filename));
    this.#downloadDebugBundle =
      options.downloadDebugBundle ??
      ((source, filename) => downloadJsonFile(documentRoot, source, filename));
    this.#snapshot = controller.snapshot();
    this.#unsubscribe = controller.subscribe((snapshot) => {
      if (this.#destroyed) return;
      const prior = this.#snapshot;
      this.#snapshot = snapshot;
      if (prior.ai.active && snapshot.ai.active) this.#updateAiProgress();
      else this.#render();
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#root.replaceChildren();
  }

  #render(): void {
    const shell = element(this.#document, "div", "v7-preview-shell");
    shell.dataset.phase = this.#snapshot.phase.toLowerCase();
    shell.append(
      live(this.#document, "v7-live", this.#notice, "polite"),
      live(this.#document, "v7-alert", this.#error, "assertive"),
    );
    if (this.#snapshot.saveWarning !== null)
      shell.append(
        paragraph(
          this.#document,
          `Save warning: ${this.#snapshot.saveWarning}`,
          "v7-preview-warning",
        ),
      );
    if (this.#error !== "")
      shell.append(paragraph(this.#document, this.#error, "v7-preview-error"));
    if (this.#snapshot.phase === "EMPTY") shell.append(this.#setup(false));
    else if (this.#snapshot.phase === "RESUMABLE")
      shell.append(this.#replacing ? this.#setup(true) : this.#resume());
    else if (this.#snapshot.phase === "RECOVERY")
      shell.append(this.#recovery());
    else if (this.#snapshot.view !== null)
      shell.append(this.#match(this.#snapshot.view));
    else shell.append(this.#setup(false));
    this.#root.replaceChildren(shell);
  }

  #header(): HTMLElement {
    const header = element(this.#document, "header", "v7-preview-header");
    header.append(
      paragraph(
        this.#document,
        "Ruleset 7 revision 2 · temporary integration preview",
        "v7-preview-eyebrow",
      ),
      heading(this.#document, "Ruleset 7 public browser boundary"),
      paragraph(
        this.#document,
        "Original-only controller, persistence, projected events, and scheduled Normal AI. Full map art and tactical controls arrive in later integration beads.",
        "v7-preview-lede",
      ),
    );
    return header;
  }

  #setup(replace: boolean): HTMLElement {
    const main = element(this.#document, "main", "v7-preview-panel");
    main.dataset.v7Setup = "true";
    main.append(this.#header());
    const form = element(this.#document, "form", "v7-preview-form");
    form.append(
      selectField(
        this.#document,
        "AI opponents",
        "v7-ai-count",
        ["1", "2", "3"],
        String(this.#draft.aiCount),
      ),
      selectField(
        this.#document,
        "AI relationship",
        "v7-ai-mode",
        ["RIVAL", "COOPERATIVE"],
        this.#draft.aiMode,
      ),
      selectField(
        this.#document,
        "Board size",
        "v7-board-size",
        compatibleSizes(this.#draft.aiCount).map(String),
        String(this.#draft.boardSize),
      ),
      inputField(
        this.#document,
        "Seed (0–4294967295)",
        "v7-seed",
        this.#draft.seedText,
      ),
      selectField(
        this.#document,
        "Your color",
        "v7-color",
        COLORS,
        this.#draft.humanColor,
      ),
      fixedFactionSummary(this.#document, this.#draft.aiCount),
    );
    const launch = actionButton(
      this.#document,
      replace ? "Replace this Ruleset 7 save" : "Launch Ruleset 7 preview",
      "launch",
    );
    launch.type = "submit";
    launch.disabled = this.#snapshot.transitioning;
    form.append(launch);
    form.addEventListener("change", () => {
      this.#readDraft(form);
      this.#updateSetupForm(form);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#readDraft(form);
      const setup = setupFromDraft(this.#draft);
      if (setup === null) {
        this.#error = "Enter a whole-number seed from 0 to 4294967295.";
        this.#render();
        return;
      }
      void this.#launch(setup, replace);
    });
    main.append(form);
    return main;
  }

  #resume(): HTMLElement {
    const main = element(this.#document, "main", "v7-preview-panel");
    main.append(this.#header());
    const view = this.#snapshot.view;
    main.append(
      heading(this.#document, "Ruleset 7 save found", 2),
      paragraph(
        this.#document,
        view === null
          ? "A valid route-owned save is ready."
          : `Round ${view.round} · command ${view.commandIndex} · ${view.viewer.coins} Coins`,
      ),
    );
    const actions = element(this.#document, "div", "v7-preview-actions");
    const resume = actionButton(this.#document, "Resume", "resume");
    resume.onclick = () => void this.#resumeMatch();
    const replace = actionButton(
      this.#document,
      "Set up replacement",
      "show-replace",
    );
    replace.onclick = () => {
      this.#replacing = true;
      this.#render();
    };
    const remove = actionButton(
      this.#document,
      "Delete v7 save",
      "delete-save",
    );
    remove.onclick = () => void this.#deleteSave();
    actions.append(resume, replace, remove);
    main.append(actions);
    return main;
  }

  #recovery(): HTMLElement {
    const main = element(this.#document, "main", "v7-preview-panel");
    main.append(
      this.#header(),
      heading(this.#document, "Preserved Ruleset 7 save", 2),
      paragraph(
        this.#document,
        this.#snapshot.recovery?.diagnostic ?? "The save cannot be loaded.",
      ),
    );
    const remove = actionButton(
      this.#document,
      "Delete preserved v7 save",
      "delete-save",
    );
    remove.onclick = () => void this.#deleteSave();
    main.append(remove);
    return main;
  }

  #match(view: PlayerViewV7): HTMLElement {
    const main = element(this.#document, "main", "v7-preview-panel");
    main.append(this.#header());
    if (this.#snapshot.phase === "ERROR") {
      main.append(
        heading(this.#document, "Match paused", 2),
        paragraph(
          this.#document,
          this.#snapshot.diagnostic ?? "The Ruleset 7 preview stopped.",
          "v7-preview-error",
        ),
      );
    } else if (this.#snapshot.phase === "COMPLETE") {
      main.append(
        heading(this.#document, "Match complete", 2),
        paragraph(
          this.#document,
          view.outcome === null
            ? "The authoritative match ended."
            : `Authoritative outcome: ${view.outcome.kind}.`,
        ),
      );
    }
    const activeId = view.turnOrder[view.activeSeatIndex];
    const active = view.players.find((player) => player.id === activeId);
    const summary = element(this.#document, "dl", "v7-preview-summary");
    const summaryRows: readonly (readonly [string, string])[] = [
      ["Viewer", `Player ${view.viewer.seat + 1} · ${view.viewer.color}`],
      ["Faction", `${view.viewer.faction} · ${view.viewer.factionTreeId}`],
      ["Round", String(view.round)],
      ["Command", String(view.commandIndex)],
      ["Coins", String(view.viewer.coins)],
      [
        "Turn",
        active?.controller === "HUMAN"
          ? "Your turn"
          : `AI ${active?.seat ?? ""}`,
      ],
      ["Public cities", String(view.cities.length)],
      ["Visible units", String(view.units.length)],
    ];
    for (const [label, value] of summaryRows) {
      summary.append(
        elementWithText(this.#document, "dt", label),
        elementWithText(this.#document, "dd", value),
      );
    }
    main.append(summary);

    const ai = paragraph(
      this.#document,
      this.#snapshot.ai.active
        ? `AI thinking · ${this.#snapshot.ai.policySlices} scheduled slices · maximum observed ${this.#snapshot.ai.maximumSliceMilliseconds.toFixed(1)} ms`
        : `AI idle · last run ${this.#snapshot.ai.acceptedCommands} accepted commands`,
      "v7-preview-ai",
    );
    ai.dataset.v7AiProgress = "true";
    main.append(ai);

    const actions = element(this.#document, "div", "v7-preview-actions");
    const endTurn = this.#snapshot.offeredCommands.find(
      (command) => command.kind === "END_TURN",
    );
    if (endTurn !== undefined) {
      const button = actionButton(this.#document, "End Turn", "end-turn");
      button.onclick = () => void this.#dispatch(endTurn);
      actions.append(button);
    }
    if (activeId !== view.humanPlayerId && !this.#snapshot.ai.active) {
      const advance = actionButton(this.#document, "Advance AI", "advance-ai");
      advance.onclick = () => void this.#progressAiIfNeeded();
      actions.append(advance);
    }
    if (this.#snapshot.ai.active) {
      const fast = actionButton(
        this.#document,
        this.#snapshot.ai.fastForward ? "Fast Forward enabled" : "Fast Forward",
        "fast-forward",
      );
      fast.onclick = () => {
        this.#controller.setFastForward(true);
        this.#notice =
          "Fast Forward suppresses preview presentation; AI scheduling still yields.";
      };
      actions.append(fast);
    }
    const restart = actionButton(this.#document, "Restart", "restart");
    restart.onclick = () => void this.#restart();
    const remove = actionButton(
      this.#document,
      "Delete v7 save",
      "delete-save",
    );
    remove.onclick = () => void this.#deleteSave();
    const safeLog = actionButton(
      this.#document,
      "Export player-safe log",
      "export-safe-log",
    );
    safeLog.onclick = () => this.#exportSafeLog();
    const debug = actionButton(
      this.#document,
      "Export debug bundle (includes hidden map and units)",
      "export-debug-with-spoilers",
    );
    debug.setAttribute(
      "aria-label",
      "Export debug bundle (includes hidden map and units; spoilers)",
    );
    debug.onclick = () => this.#exportDebugBundle();
    actions.append(restart, remove, safeLog, debug);
    main.append(actions);

    const commandKinds = Array.from(
      new Set(this.#snapshot.offeredCommands.map((command) => command.kind)),
    );
    main.append(
      paragraph(
        this.#document,
        commandKinds.length === 0
          ? "No human commands are currently exposed."
          : `Public command kinds available: ${commandKinds.join(", ")}.`,
        "v7-preview-command-summary",
      ),
    );
    if (view.pendingChoices.length > 0) {
      const choice = view.pendingChoices[0];
      if (choice !== undefined) {
        const choices = element(this.#document, "section", "v7-preview-choice");
        choices.setAttribute("aria-label", "Mandatory city reward");
        choices.append(
          heading(
            this.#document,
            `Choose reward for city ${choice.cityId}, level ${choice.reachedLevel}`,
            2,
          ),
        );
        for (const reward of choice.candidates) {
          const command = this.#snapshot.offeredCommands.find(
            (candidate) =>
              candidate.kind === "CHOOSE_CITY_REWARD" &&
              candidate.cityId === choice.cityId &&
              candidate.reachedLevel === choice.reachedLevel &&
              candidate.reward === reward,
          );
          if (command !== undefined) {
            const button = actionButton(
              this.#document,
              reward,
              `reward-${reward.toLowerCase()}`,
            );
            button.onclick = () => void this.#dispatch(command);
            choices.append(button);
          }
        }
        main.append(choices);
      }
    }
    return main;
  }

  #readDraft(form: HTMLElement): void {
    const aiCount = Number(fieldValue(form, "v7-ai-count"));
    const priorCount = this.#draft.aiCount;
    const nextCount = aiCount === 2 || aiCount === 3 ? aiCount : 1;
    const sizes = compatibleSizes(nextCount);
    const requestedSize = Number(fieldValue(form, "v7-board-size"));
    this.#draft = {
      aiCount: nextCount,
      aiMode:
        fieldValue(form, "v7-ai-mode") === "COOPERATIVE"
          ? "COOPERATIVE"
          : "RIVAL",
      boardSize: sizes.includes(requestedSize as (typeof BOARD_SIZES)[number])
        ? (requestedSize as (typeof BOARD_SIZES)[number])
        : nextCount === priorCount
          ? this.#draft.boardSize
          : (sizes[0] ?? 11),
      seedText: fieldValue(form, "v7-seed"),
      humanColor: color(fieldValue(form, "v7-color")),
    };
  }

  #updateSetupForm(form: HTMLElement): void {
    const size = form.querySelector<HTMLSelectElement>("#v7-board-size");
    if (size !== null) {
      const selected = String(this.#draft.boardSize);
      size.replaceChildren(
        ...compatibleSizes(this.#draft.aiCount).map((value) => {
          const option = this.#document.createElement("option");
          option.value = String(value);
          option.textContent = String(value);
          option.selected = option.value === selected;
          return option;
        }),
      );
    }
    const faction = form.querySelector<HTMLElement>(
      ".v7-preview-fixed-faction",
    );
    if (faction !== null)
      faction.textContent = `${this.#draft.aiCount + 1} fixed Original seats · ORIGINAL_BASELINE_V3`;
  }

  async #launch(setup: MatchSetupV7, replace: boolean): Promise<void> {
    this.#error = "";
    const result = await this.#controller.launch(setup, {
      replaceStoredMatch: replace,
    });
    if (this.#destroyed) return;
    if (!result.ok) {
      this.#error = result.diagnostic;
      this.#render();
      return;
    }
    this.#replacing = false;
    this.#notice =
      "Ruleset 7 preview launched at the canonical Start Turn boundary.";
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #resumeMatch(): Promise<void> {
    this.#error = "";
    if (!(await this.#controller.resume())) {
      this.#error = "The Ruleset 7 save could not be resumed.";
      this.#render();
      return;
    }
    this.#notice = "Ruleset 7 save resumed at its last accepted command.";
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #dispatch(command: CommandV7): Promise<void> {
    this.#error = "";
    const result = await this.#controller.dispatch(command);
    if (this.#destroyed) return;
    if (!result.accepted) {
      this.#error = `Action rejected: ${result.reason}${result.error === undefined ? "" : ` (${result.error.code})`}.`;
      this.#render();
      return;
    }
    this.#notice = `${command.kind.replaceAll("_", " ")} accepted.`;
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #progressAiIfNeeded(): Promise<void> {
    if (this.#destroyed) return;
    const snapshot = this.#controller.snapshot();
    const view = snapshot.view;
    if (snapshot.phase !== "ACTIVE" || view === null) return;
    if (view.turnOrder[view.activeSeatIndex] === view.humanPlayerId) {
      this.#render();
      return;
    }
    const result = await this.#controller.progressAiTurns();
    if (this.#destroyed) return;
    if (!result.ok) {
      if (!result.cancelled) this.#error = result.diagnostic;
      this.#render();
      return;
    }
    this.#notice = `AI completed ${result.acceptedCommands} accepted command${result.acceptedCommands === 1 ? "" : "s"} across ${result.policySlices} scheduled slices.`;
    this.#render();
  }

  async #restart(): Promise<void> {
    this.#error = "";
    const result = await this.#controller.restart();
    if (this.#destroyed) return;
    if (!result.ok) {
      this.#error = result.diagnostic;
      this.#render();
      return;
    }
    this.#notice =
      "Ruleset 7 match restarted from the identical setup and seed.";
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #deleteSave(): Promise<void> {
    this.#error = "";
    if (!(await this.#controller.deleteStoredSave()))
      this.#error = "The Ruleset 7 save could not be deleted.";
    else this.#notice = "Only the Ruleset 7 revision-2 save was deleted.";
    this.#render();
  }

  #exportSafeLog(): void {
    const result = this.#controller.exportSafeLog();
    if (result === null) {
      this.#error = "No Ruleset 7 match is available to export.";
      this.#render();
      return;
    }
    this.#downloadSafeLog(result.source, result.filename);
    this.#notice = "Player-safe projected log downloaded.";
    this.#render();
  }

  #exportDebugBundle(): void {
    const result = this.#controller.exportDebugBundle({
      acknowledgeHiddenInformation: true,
    });
    if (!result.ok) {
      this.#error = "No Ruleset 7 match is available to export.";
      this.#render();
      return;
    }
    this.#downloadDebugBundle(result.source, result.filename);
    this.#notice =
      "Spoiler-labelled omniscient debug bundle downloaded locally.";
    this.#render();
  }

  #updateAiProgress(): void {
    const progress = this.#root.querySelector<HTMLElement>(
      "[data-v7-ai-progress]",
    );
    if (progress !== null) {
      progress.textContent = `AI thinking · ${this.#snapshot.ai.policySlices} scheduled slices · maximum observed ${this.#snapshot.ai.maximumSliceMilliseconds.toFixed(1)} ms`;
    }
    const fast = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="fast-forward"]',
    );
    if (fast !== null && this.#snapshot.ai.fastForward)
      fast.textContent = "Fast Forward enabled";
  }
}

export function bootstrapRuleset7App(
  documentRoot: Document,
  options: BootstrapRuleset7Options = {},
): BootstrappedRuleset7App {
  const root = documentRoot.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("Missing #app bootstrap element");
  const browser = documentRoot.defaultView;
  const storage =
    options.storage === undefined ? browserStorageV7(browser) : options.storage;
  const controller = new Ruleset7BrowserController({ ...options, storage });
  const view = new Ruleset7PreviewView(documentRoot, root, controller, options);
  const onVisibilityChange = (): void => {
    if (documentRoot.visibilityState === "hidden")
      controller.flushPersistence();
  };
  const onPageHide = (): void => {
    controller.flushPersistence();
  };
  documentRoot.addEventListener("visibilitychange", onVisibilityChange);
  browser?.addEventListener("pagehide", onPageHide);
  return {
    controller,
    view,
    destroy(): void {
      documentRoot.removeEventListener("visibilitychange", onVisibilityChange);
      browser?.removeEventListener("pagehide", onPageHide);
      controller.flushPersistence();
      view.destroy();
      controller.destroy();
    },
  };
}

function browserStorageV7(browser: Window | null): StorageAdapter | null {
  if (browser === null) return null;
  try {
    return browser.localStorage;
  } catch {
    return null;
  }
}

function compatibleSizes(
  aiCount: 1 | 2 | 3,
): readonly (typeof BOARD_SIZES)[number][] {
  const minimum = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return BOARD_SIZES.filter((size) => size >= minimum);
}

function setupFromDraft(draft: PreviewDraftV7): MatchSetupV7 | null {
  if (!/^\d+$/.test(draft.seedText)) return null;
  const seed = Number(draft.seedText);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
    return null;
  return {
    rulesetId: "pulp-wars-poc-7r2",
    seed,
    width: draft.boardSize,
    height: draft.boardSize,
    aiCount: draft.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: draft.aiMode,
    humanColor: draft.humanColor,
    factions: Array.from(
      { length: draft.aiCount + 1 },
      () => "ORIGINAL" as const,
    ),
    mapGenerationRevision: "SPATIAL_ECONOMY",
  };
}

function color(value: string): PlayerColorV7 {
  return COLORS.includes(value as PlayerColorV7)
    ? (value as PlayerColorV7)
    : "CORAL";
}

function fieldValue(root: HTMLElement, id: string): string {
  return (
    root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ??
    ""
  );
}

function element(
  documentRoot: Document,
  tag: string,
  className: string,
): HTMLElement {
  const node = documentRoot.createElement(tag);
  node.className = className;
  return node;
}

function elementWithText(
  documentRoot: Document,
  tag: string,
  value: string,
): HTMLElement {
  const node = documentRoot.createElement(tag);
  node.textContent = value;
  return node;
}

function paragraph(
  documentRoot: Document,
  value: string,
  className = "",
): HTMLParagraphElement {
  const node = documentRoot.createElement("p");
  node.className = className;
  node.textContent = value;
  return node;
}

function heading(
  documentRoot: Document,
  value: string,
  level: 1 | 2 = 1,
): HTMLHeadingElement {
  const node = documentRoot.createElement(level === 1 ? "h1" : "h2");
  node.textContent = value;
  return node;
}

function live(
  documentRoot: Document,
  id: string,
  value: string,
  priority: "polite" | "assertive",
): HTMLElement {
  const node = paragraph(documentRoot, value, "v7-preview-live");
  node.id = id;
  node.setAttribute("aria-live", priority);
  return node;
}

function actionButton(
  documentRoot: Document,
  value: string,
  action: string,
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  node.textContent = value;
  node.dataset.action = action;
  return node;
}

function selectField(
  documentRoot: Document,
  label: string,
  id: string,
  values: readonly string[],
  selected: string,
): HTMLLabelElement {
  const wrapper = documentRoot.createElement("label");
  wrapper.textContent = label;
  const select = documentRoot.createElement("select");
  select.id = id;
  for (const value of values) {
    const option = documentRoot.createElement("option");
    option.value = value;
    option.textContent = value;
    option.selected = value === selected;
    select.append(option);
  }
  wrapper.append(select);
  return wrapper;
}

function inputField(
  documentRoot: Document,
  label: string,
  id: string,
  value: string,
): HTMLLabelElement {
  const wrapper = documentRoot.createElement("label");
  wrapper.textContent = label;
  const input = documentRoot.createElement("input");
  input.id = id;
  input.inputMode = "numeric";
  input.value = value;
  wrapper.append(input);
  return wrapper;
}

function fixedFactionSummary(
  documentRoot: Document,
  aiCount: 1 | 2 | 3,
): HTMLParagraphElement {
  return paragraph(
    documentRoot,
    `${aiCount + 1} fixed Original seats · ORIGINAL_BASELINE_V3`,
    "v7-preview-fixed-faction",
  );
}
