import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
  RULESET7_TECH_ART_IDS,
  RULESET7_TERRAIN_ART_IDS,
  RULESET7_UNIT_ART_IDS,
  commandArtIdV7,
  rewardArtIdV7,
} from "../../assets/ruleset7-ui-art";
import type {
  Ruleset7AcceptedBoundary,
  Ruleset7BrowserController,
  Ruleset7BrowserSnapshot,
} from "../../app/v7-controller";
import {
  effectiveRoleRuleV7,
  previewEconomicV7,
  queryTechnologyTreeV7,
  type CommandV7,
  type CoordV7,
  type EconomicPreviewV7,
  type MatchSetupV7,
  type PlayerColorV7,
  type PlayerViewV7,
  type PublicTechnologyNodeV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../engine/index";
import { downloadJsonFile } from "../../app/browser-download";
import {
  SETTINGS_STORAGE_KEY,
  parseSettings,
  type StorageAdapter,
} from "../../persistence/index";
import { CanvasBoardHostV7, type BoardHostV7 } from "../canvas/board-host-v7";
import type { BoardSelectionV7 } from "../canvas/board-renderer-v7";
import type { MapCommandTargetV7 } from "../canvas/board-renderer-v7";
import { technologyTreeLayoutV7 } from "./technology-tree-layout-v7";
import { createTacticalSymbolV7 } from "./tactical-symbol-v7";
import type {
  Ruleset7TacticalUiSymbolId,
  TacticalSymbolTheme,
} from "../../assets/ruleset7-tactical-ui-symbols";
import { selectionIdentityArtworkLayoutV6 } from "./selection-identity-v6";
import {
  blackoutStatusTextV7,
  blackoutTargetsV7,
  playerLabelV7,
  type TacticalTargetModeV7,
} from "../tactical-presentation-v7";

const BOARD_SIZES = [11, 14, 16, 20, 25] as const;
const COLORS: readonly PlayerColorV7[] = ["CORAL", "TEAL", "GOLD", "VIOLET"];
const NON_BUTTON_COMMANDS = new Set<CommandV7["kind"]>([
  "MOVE",
  "ATTACK",
  "BLACKOUT_CITY",
  "RESEARCH",
  "CHOOSE_CITY_REWARD",
]);

export interface MountRuleset7AppOptions {
  readonly boardHost?: BoardHostV7;
  readonly downloadSafeLog?: (source: string, filename: string) => void;
  readonly downloadDebugBundle?: (source: string, filename: string) => void;
  readonly settingsStorage?: StorageAdapter | null;
  readonly startupNotice?: string;
}

export type Ruleset7ControllerPortV7 = Pick<
  Ruleset7BrowserController,
  | "snapshot"
  | "subscribe"
  | "subscribeAcceptedBoundary"
  | "launch"
  | "resume"
  | "returnToMenu"
  | "dispatch"
  | "progressAiTurns"
  | "restart"
  | "deleteStoredSave"
  | "setFastForward"
  | "exportSafeLog"
  | "exportDebugBundle"
>;

interface DraftV7 {
  readonly aiCount: 1 | 2 | 3;
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly boardSize: (typeof BOARD_SIZES)[number];
  readonly seedText: string;
  readonly humanColor: PlayerColorV7;
}

type ScreenV7 =
  | "MATCH"
  | "TECH"
  | "LEADERBOARD"
  | "STATS"
  | "ACHIEVEMENTS"
  | "SETTINGS"
  | "HELP";

/** DOM/Canvas composition whose only gameplay inputs are public snapshots and offered commands. */
export class Ruleset7DomAppView {
  readonly #document: Document;
  readonly #root: HTMLElement;
  readonly #controller: Ruleset7ControllerPortV7;
  readonly #boardHost: BoardHostV7;
  readonly #downloadSafeLog: (source: string, filename: string) => void;
  readonly #downloadDebugBundle: (source: string, filename: string) => void;
  readonly #settingsStorage: StorageAdapter | null;
  #snapshot: Ruleset7BrowserSnapshot;
  #unsubscribe: (() => void) | null = null;
  #unsubscribeAcceptedBoundary: (() => void) | null = null;
  #draft: DraftV7 = {
    aiCount: 1,
    aiMode: "RIVAL",
    boardSize: 11,
    seedText: "42",
    humanColor: "CORAL",
  };
  #selection: BoardSelectionV7 | null = null;
  #screen: ScreenV7 = "MATCH";
  #selectedTech: TechnologyIdV7 | null = null;
  #selectedAchievement: "ENGINEER" | "MUSTER" | null = null;
  #selectedAbility: string | null = null;
  #selectedModifier: string | null = null;
  #selectedRecruitHelp: UnitRoleIdV7 | null = null;
  #cityActionScrollLeft: number | null = null;
  #clearCityActionScrollAfterRestore = false;
  #tacticalTargetMode: TacticalTargetModeV7 | null = null;
  #modalReturnAction: string | null = null;
  #compactMenuOpen = false;
  #notice = "";
  #error = "";
  #replacing = false;
  #matchInstance = 0;
  #presentationActive = false;
  #presentationQueue: {
    readonly matchInstance: number;
    readonly boundary: Ruleset7AcceptedBoundary;
  }[] = [];
  #presentationTail: Promise<void> = Promise.resolve();
  #motion: "FULL" | "REDUCED";
  #animationSpeed: "NORMAL" | "FAST" = "NORMAL";
  #highContrast = false;
  #uiScale: 1 | 1.25 | 1.5 | 2 = 1;
  #pendingFocusAction: string | null = null;
  #matchShell: HTMLElement | null = null;
  #matchRoot: HTMLElement | null = null;
  #boardContainer: HTMLElement | null = null;
  #destroyed = false;

  constructor(
    documentRoot: Document,
    root: HTMLElement,
    controller: Ruleset7ControllerPortV7,
    options: MountRuleset7AppOptions = {},
  ) {
    this.#document = documentRoot;
    this.#root = root;
    this.#controller = controller;
    this.#boardHost = options.boardHost ?? new CanvasBoardHostV7(documentRoot);
    this.#downloadSafeLog =
      options.downloadSafeLog ??
      ((source, filename) => downloadJsonFile(documentRoot, source, filename));
    this.#downloadDebugBundle =
      options.downloadDebugBundle ??
      ((source, filename) => downloadJsonFile(documentRoot, source, filename));
    this.#settingsStorage = options.settingsStorage ?? null;
    this.#notice = options.startupNotice ?? "";
    this.#motion =
      documentRoot.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches === true
        ? "REDUCED"
        : "FULL";
    try {
      const storedSettings =
        this.#settingsStorage?.getItem(SETTINGS_STORAGE_KEY);
      if (storedSettings !== null && storedSettings !== undefined) {
        const parsed = parseSettings(storedSettings);
        if (parsed.kind === "VALID") {
          this.#uiScale = parsed.settings.uiScale;
          this.#motion = parsed.settings.motion;
          this.#animationSpeed = parsed.settings.animationSpeed;
          this.#highContrast = parsed.settings.highContrast;
        }
      }
    } catch {
      // Restricted storage must not prevent the public UI from mounting.
    }
    this.#snapshot = controller.snapshot();
    this.#document.addEventListener("keydown", this.#onKeyDown);
    this.#unsubscribeAcceptedBoundary = controller.subscribeAcceptedBoundary(
      (boundary) => this.#queueBoundary(boundary),
    );
    this.#unsubscribe = controller.subscribe((snapshot) => {
      if (this.#destroyed) return;
      const prior = this.#snapshot;
      this.#snapshot = snapshot;
      if (
        prior.ai.active &&
        snapshot.ai.active &&
        prior.view?.commandIndex === snapshot.view?.commandIndex
      )
        this.#patchAiProgress();
      else this.#render();
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#document.removeEventListener("keydown", this.#onKeyDown);
    this.#unsubscribe?.();
    this.#unsubscribeAcceptedBoundary?.();
    this.#unsubscribeAcceptedBoundary = null;
    this.#cancelPresentations();
    this.#boardHost.destroy();
    this.#root.replaceChildren();
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    const modal = this.#root.querySelector<HTMLElement>('[aria-modal="true"]');
    if (modal !== null) {
      if (event.key === "Tab") this.#trapModalFocus(event, modal);
      else if (event.key === "Escape") {
        if (this.#selectedRecruitHelp !== null) {
          event.preventDefault();
          this.#closeRecruitHelp();
        } else if (this.#screen !== "MATCH") {
          event.preventDefault();
          this.#closeOverlay();
        }
      }
      return;
    }
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      this.#boardHost.resetInspectionCycle?.();
      if (this.#tacticalTargetMode !== null) {
        this.#tacticalTargetMode = null;
        this.#notice = "Tactical targeting cancelled.";
      } else if (this.#screen !== "MATCH") this.#screen = "MATCH";
      else this.#selection = null;
      this.#render();
      this.#queueBoardFocus();
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "t") {
      event.preventDefault();
      this.#open("TECH");
    } else if (key === "g") {
      event.preventDefault();
      this.#open("LEADERBOARD");
    } else if (key === "?") {
      event.preventDefault();
      this.#open("HELP");
    } else if (key === "e") {
      const command = this.#snapshot.offeredCommands.find(
        (candidate) => candidate.kind === "END_TURN",
      );
      if (command !== undefined) {
        event.preventDefault();
        void this.#dispatch(command);
      }
    }
  };

  #render(): void {
    if (this.#destroyed) return;
    if (
      this.#snapshot.view !== null &&
      (this.#snapshot.phase === "ACTIVE" ||
        this.#snapshot.phase === "COMPLETE" ||
        this.#snapshot.phase === "ERROR")
    ) {
      this.#renderStableMatch(this.#snapshot.view);
      return;
    }
    if (this.#matchRoot !== null) this.#boardHost.destroy();
    this.#matchShell = null;
    this.#matchRoot = null;
    this.#boardContainer = null;
    const shell = el(this.#document, "div", "v7-app-shell");
    shell.dataset.phase = this.#snapshot.phase.toLowerCase();
    shell.append(
      live(this.#document, "v7-live", this.#notice, "polite"),
      live(this.#document, "v7-alert", this.#error, "assertive"),
    );
    if (this.#snapshot.saveWarning !== null)
      shell.append(
        text(
          this.#document,
          "p",
          `Save warning: ${this.#snapshot.saveWarning}`,
          "v7-warning",
        ),
      );
    if (this.#snapshot.phase === "EMPTY") shell.append(this.#setup(false));
    else if (this.#snapshot.phase === "RESUMABLE")
      shell.append(this.#replacing ? this.#setup(true) : this.#resume());
    else if (this.#snapshot.phase === "RECOVERY")
      shell.append(this.#recovery());
    else shell.append(this.#setup(false));
    this.#root.replaceChildren(shell);
  }

  #brand(): HTMLElement {
    const header = el(this.#document, "header", "v7-brand");
    header.append(
      text(this.#document, "p", "Pulp Wars · Ruleset 7", "eyebrow"),
      text(this.#document, "h1", "Conquest"),
    );
    return header;
  }

  #setup(replace: boolean): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen");
    main.dataset.v7Setup = "true";
    main.append(
      this.#brand(),
      text(
        this.#document,
        "p",
        "Original-only local conquest. Every action uses the Ruleset 7 public browser boundary.",
      ),
    );
    const form = el(this.#document, "form", "v7-setup-form");
    form.append(
      select(
        this.#document,
        "AI opponents",
        "v7-ai-count",
        ["1", "2", "3"],
        String(this.#draft.aiCount),
      ),
      select(
        this.#document,
        "AI relationship",
        "v7-ai-mode",
        ["RIVAL", "COOPERATIVE"],
        this.#draft.aiMode,
      ),
      select(
        this.#document,
        "Board size",
        "v7-board-size",
        compatibleSizes(this.#draft.aiCount).map(String),
        String(this.#draft.boardSize),
      ),
      input(
        this.#document,
        "Seed (0–4294967295)",
        "v7-seed",
        this.#draft.seedText,
      ),
      select(
        this.#document,
        "Your color",
        "v7-color",
        COLORS,
        this.#draft.humanColor,
      ),
      text(
        this.#document,
        "p",
        `${this.#draft.aiCount + 1} fixed Original seats · ORIGINAL_BASELINE_V4`,
        "v7-fixed-faction",
      ),
    );
    const launch = button(
      this.#document,
      replace ? "Replace this Ruleset 7 save" : "Start conquest",
      "launch",
      "primary-action",
    );
    launch.type = "submit";
    form.append(launch);
    form.addEventListener("change", () => {
      this.#readDraft(form);
      const size = form.querySelector<HTMLSelectElement>("#v7-board-size");
      if (size !== null)
        replaceOptions(
          this.#document,
          size,
          compatibleSizes(this.#draft.aiCount).map(String),
          String(this.#draft.boardSize),
        );
      const faction = form.querySelector(".v7-fixed-faction");
      if (faction !== null)
        faction.textContent = `${this.#draft.aiCount + 1} fixed Original seats · ORIGINAL_BASELINE_V4`;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#readDraft(form);
      const setup = setupFrom(this.#draft);
      if (setup === null) {
        this.#error = "Enter a whole-number seed from 0 to 4294967295.";
        this.#render();
        return;
      }
      void this.#launch(setup, replace);
    });
    main.append(form, this.#ruleset6Link());
    return main;
  }

  #resume(): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen");
    const view = this.#snapshot.view;
    main.append(
      this.#brand(),
      text(this.#document, "h2", "Continue conquest"),
      text(
        this.#document,
        "p",
        view === null
          ? "A route-owned Ruleset 7 save is ready."
          : `Round ${view.round} · ${view.viewer.coins} Coins`,
      ),
    );
    const actions = el(this.#document, "div", "button-row");
    const resume = button(this.#document, "Resume", "resume", "primary-action");
    resume.onclick = () => void this.#resumeMatch();
    const replace = button(this.#document, "Replace", "show-replace");
    replace.onclick = () => {
      this.#replacing = true;
      this.#render();
    };
    const remove = button(
      this.#document,
      "Delete",
      "delete-save",
      "destructive",
    );
    remove.onclick = () => void this.#deleteSave();
    actions.append(resume, replace, remove);
    main.append(actions, this.#ruleset6Link());
    return main;
  }

  #recovery(): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen");
    main.append(
      this.#brand(),
      text(this.#document, "h2", "Preserved Ruleset 7 save"),
      text(
        this.#document,
        "p",
        this.#snapshot.recovery?.diagnostic ??
          "This route-owned save cannot be loaded.",
      ),
    );
    const remove = button(
      this.#document,
      "Delete preserved v7 save",
      "delete-save",
      "destructive",
    );
    remove.onclick = () => void this.#deleteSave();
    main.append(remove, this.#ruleset6Link());
    return main;
  }

  #ruleset6Link(): HTMLAnchorElement {
    const link = this.#document.createElement("a");
    const params = new URLSearchParams({ ruleset: "6" });
    if (
      new URLSearchParams(this.#document.defaultView?.location.search).get(
        "browser-smoke",
      ) === "1"
    )
      params.set("browser-smoke", "1");
    link.className = "v7-compatibility-link";
    link.dataset.route = "ruleset-6";
    link.href = `?${params.toString()}`;
    link.textContent = "Play frozen Ruleset 6 · Original or Candy";
    return link;
  }

  #renderStableMatch(view: PlayerViewV7): void {
    let shell = this.#matchShell;
    let main = this.#matchRoot;
    let board = this.#boardContainer;
    if (
      shell === null ||
      main === null ||
      board === null ||
      !main.isConnected
    ) {
      shell = el(this.#document, "div", "v7-app-shell v7-match-shell");
      main = el(this.#document, "main", "v7-match-root");
      board = el(this.#document, "div", "v7-board-host");
      main.append(board);
      shell.append(
        live(this.#document, "v7-live", this.#notice, "polite"),
        live(this.#document, "v7-alert", this.#error, "assertive"),
        main,
      );
      this.#root.replaceChildren(shell);
      this.#matchShell = shell;
      this.#matchRoot = main;
      this.#boardContainer = board;
      this.#boardHost.mount(board, {
        onSelection: (selection) => {
          this.#selection = selection;
          this.#selectedRecruitHelp = null;
          this.#cityActionScrollLeft = null;
          this.#clearCityActionScrollAfterRestore = false;
          this.#tacticalTargetMode = null;
          this.#selectedAchievement = null;
          this.#selectedAbility = null;
          this.#selectedModifier = null;
          this.#render();
        },
        onCommand: (target) => void this.#handleMapCommand(target),
      });
    }
    const liveNode = shell.querySelector<HTMLElement>("#v7-live");
    const alertNode = shell.querySelector<HTMLElement>("#v7-alert");
    if (liveNode !== null) liveNode.textContent = this.#notice;
    if (alertNode !== null) alertNode.textContent = this.#error;
    const nextChildren: HTMLElement[] = [];
    if (view.pendingChoices.length > 0) {
      this.#tacticalTargetMode = null;
      this.#selectedRecruitHelp = null;
      this.#cityActionScrollLeft = null;
      this.#clearCityActionScrollAfterRestore = false;
    }
    const activeId = view.turnOrder[view.activeSeatIndex];
    const active = view.players.find((player) => player.id === activeId);
    const hud = el(this.#document, "header", "v7-match-hud");
    hud.dataset.v7Region = "hud";
    const titleBlock = el(this.#document, "div", "v7-hud-title");
    titleBlock.append(
      text(this.#document, "strong", `Player ${view.viewer.seat + 1}`),
      text(this.#document, "span", `Round ${view.round}`),
    );
    const economy = text(
      this.#document,
      "p",
      `${view.viewer.coins} Coins`,
      "v7-coins",
    );
    economy.setAttribute(
      "aria-label",
      `${view.viewer.coins} Coins. ${incomeDescription(view)}`,
    );
    const status = text(
      this.#document,
      "p",
      this.#snapshot.phase === "COMPLETE"
        ? "Match complete"
        : active?.controller === "HUMAN"
          ? "Your turn"
          : `Player ${(active?.seat ?? 0) + 1} is thinking…`,
      "v7-turn-status",
    );
    status.dataset.v7AiProgress = "true";
    const nav = el(this.#document, "nav", "v7-hud-nav");
    nav.dataset.compactMenu = this.#compactMenuOpen ? "open" : "closed";
    if (this.#snapshot.phase === "ACTIVE") {
      const mainMenu = button(
        this.#document,
        "Main menu",
        "main-menu",
        "hud-button v7-main-menu-action",
      );
      mainMenu.onclick = () => void this.#returnToMenu();
      nav.append(mainMenu);
    }
    for (const [label, screen, action] of [
      ["Tech", "TECH", "tech"],
      ["Leaderboard", "LEADERBOARD", "leaderboard"],
      ["Stats", "STATS", "stats"],
      ["Achievements", "ACHIEVEMENTS", "achievements"],
      ["Help", "HELP", "help"],
      ["Settings", "SETTINGS", "settings"],
    ] as const) {
      const secondary = action !== "tech" && action !== "leaderboard";
      const item = button(
        this.#document,
        label,
        action,
        secondary ? "hud-button v7-secondary-nav-action" : "hud-button",
      );
      item.onclick = () => {
        this.#compactMenuOpen = false;
        this.#open(screen, action);
      };
      item.disabled = view.pendingChoices.length > 0;
      nav.append(item);
    }
    const compactMenu = button(
      this.#document,
      "Menu",
      "compact-menu",
      "hud-button v7-compact-menu-toggle",
    );
    compactMenu.setAttribute("aria-expanded", String(this.#compactMenuOpen));
    compactMenu.onclick = () => {
      this.#compactMenuOpen = !this.#compactMenuOpen;
      this.#pendingFocusAction = "compact-menu";
      this.#render();
    };
    nav.append(compactMenu);
    const zoomIn = button(
      this.#document,
      "+",
      "zoom-in",
      "hud-button v7-secondary-nav-action",
    );
    zoomIn.setAttribute("aria-label", "Zoom in");
    zoomIn.onclick = () => this.#boardHost.zoom("IN");
    const zoomOut = button(
      this.#document,
      "−",
      "zoom-out",
      "hud-button v7-secondary-nav-action",
    );
    zoomOut.setAttribute("aria-label", "Zoom out");
    zoomOut.onclick = () => this.#boardHost.zoom("OUT");
    nav.append(zoomOut, zoomIn);
    hud.append(titleBlock, economy, status, nav);
    const endTurn = this.#snapshot.offeredCommands.find(
      (candidate) => candidate.kind === "END_TURN",
    );
    if (endTurn !== undefined) {
      const end = button(
        this.#document,
        "End Turn",
        "end-turn",
        "v7-hud-end-turn",
      );
      end.onclick = () => void this.#dispatch(endTurn);
      end.disabled = this.#localBusy() || view.pendingChoices.length > 0;
      nav.append(end);
    }
    nextChildren.push(hud);
    const message = this.#error || this.#notice;
    if (message)
      hud.append(
        text(
          this.#document,
          "p",
          message,
          this.#error ? "v7-hud-message v7-hud-error" : "v7-hud-message",
        ),
      );
    const dock =
      this.#selection === null ? null : this.#dock(view, this.#selection);
    if (dock !== null) {
      dock.dataset.v7Region = "dock";
      nextChildren.push(dock);
    }
    if (this.#snapshot.ai.active) {
      const fast = button(
        this.#document,
        this.#snapshot.ai.fastForward ? "Fast Forward enabled" : "Fast Forward",
        "fast-forward",
        "v7-fast-forward",
      );
      fast.onclick = () => {
        this.#cancelPresentations();
        this.#controller.setFastForward(true);
      };
      fast.dataset.v7Region = "fast-forward";
      nextChildren.push(fast);
    }
    if (
      this.#snapshot.phase === "ACTIVE" &&
      this.#screen !== "MATCH" &&
      view.pendingChoices.length === 0
    )
      nextChildren.push(this.#overlay(view));
    if (
      this.#snapshot.phase === "ACTIVE" &&
      this.#screen === "MATCH" &&
      this.#selectedRecruitHelp !== null &&
      view.pendingChoices.length === 0
    )
      nextChildren.push(this.#recruitHelp(this.#selectedRecruitHelp));
    if (view.pendingChoices[0] !== undefined)
      nextChildren.push(this.#reward(view));
    if (this.#snapshot.phase === "COMPLETE")
      nextChildren.push(this.#results(view));
    if (this.#snapshot.phase === "ERROR") nextChildren.push(this.#errorPanel());
    if (this.#snapshot.saveWarning !== null) {
      const warning = text(
        this.#document,
        "p",
        `Save warning: ${this.#snapshot.saveWarning}`,
        "v7-warning v7-match-warning",
      );
      warning.setAttribute("role", "status");
      warning.setAttribute("aria-live", "polite");
      warning.dataset.v7Region = "save-warning";
      nextChildren.push(warning);
    }
    reconcileMatchChildren(main, board, nextChildren);
    shell.dataset.contrast = this.#highContrast ? "high" : "standard";
    shell.dataset.uiScale = String(this.#uiScale);
    shell.style.setProperty("--ui-scale", String(this.#uiScale));
    this.#boardHost.update({
      matchInstanceId: this.#matchInstance,
      view,
      offeredCommands: this.#snapshot.offeredCommands,
      interactive:
        this.#screen === "MATCH" &&
        activeId === view.humanPlayerId &&
        !this.#snapshot.transitioning &&
        !this.#presentationActive &&
        view.pendingChoices.length === 0,
      motion: this.#motion,
      animationSpeed: this.#animationSpeed,
      presentationPaused: this.#screen === "SETTINGS",
      highContrast: this.#highContrast,
      interaction: {
        selection: this.#selection,
        selectedUnitId:
          this.#selection?.kind === "UNIT" ? this.#selection.unitId : null,
        selectedAchievement: this.#selectedAchievement,
        tacticalTargetMode: this.#tacticalTargetMode,
      },
    });
    this.#syncModalIsolation(main);
    const focusAction = this.#pendingFocusAction;
    this.#pendingFocusAction = null;
    if (focusAction !== null)
      queueMicrotask(() => {
        if (this.#destroyed) return;
        main
          .querySelector<HTMLButtonElement>(`[data-action="${focusAction}"]`)
          ?.focus();
      });
    if (this.#cityActionScrollLeft !== null) {
      const scrollLeft = this.#cityActionScrollLeft;
      const clearAfterRestore = this.#clearCityActionScrollAfterRestore;
      queueMicrotask(() => {
        if (this.#destroyed) return;
        const row = main.querySelector<HTMLElement>(
          '.v7-selection-dock[data-selection-kind="city"] > .v7-context-actions',
        );
        if (row !== null) row.scrollLeft = scrollLeft;
        if (clearAfterRestore) {
          this.#cityActionScrollLeft = null;
          this.#clearCityActionScrollAfterRestore = false;
        }
      });
    }
  }

  #dock(view: PlayerViewV7, selection: BoardSelectionV7): HTMLElement | null {
    const dock = el(this.#document, "section", "v7-selection-dock");
    dock.dataset.selectionKind = selection.kind.toLowerCase();
    dock.dataset.hasActions = "false";
    dock.setAttribute("aria-label", "Selected map object");
    const close = button(this.#document, "Close", "close-dock", "close-button");
    close.onclick = () => {
      this.#selection = null;
      this.#render();
      this.#queueBoardFocus();
    };
    if (selection.kind === "UNIT") {
      const unit = view.units.find(
        (candidate) => candidate.id === selection.unitId,
      );
      if (unit === undefined) return null;
      dock.append(
        identity(
          this.#document,
          RULESET7_UNIT_ART_IDS[unit.role],
          `${title(unit.role)} · ${unit.hp}/${unit.maxHp} HP`,
        ),
      );
      if (unit.role === "HORSE_ARCHER") {
        const state = el(this.#document, "section", "v7-tactical-state");
        state.dataset.tacticalState = "horse-archer";
        const unusedShots = Math.max(0, 2 - unit.activation.attacksUsed);
        const legalShots = this.#snapshot.offeredCommands.some(
          (command) => command.kind === "ATTACK" && command.unitId === unit.id,
        )
          ? unusedShots
          : 0;
        state.append(
          text(this.#document, "strong", "Two-shot activation"),
          text(
            this.#document,
            "span",
            `${unit.activation.attacksUsed} attacks used · ${unusedShots} unused · ${legalShots} currently legal`,
          ),
          text(
            this.#document,
            "span",
            unit.activation.attacksUsed === 1
              ? "Second shot remains available from this cell. This unit cannot move or use another action; other units remain available."
              : "May move before the first shot; never advances or captures.",
          ),
        );
        dock.append(state);
      }
      const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
      if (stats !== undefined) {
        const rows = el(this.#document, "dl", "v7-unit-stats");
        for (const stat of stats.stats) {
          const exact = stat.visibility !== "BASE_ONLY";
          const value = el(this.#document, "dd", "v7-stat-value");
          value.append(
            text(this.#document, "span", formatValue(stat.base.value)),
          );
          for (const [index, modifier] of (exact
            ? stat.modifiers
            : []
          ).entries()) {
            const modifierId = `${unit.id}-${stat.id}-${index}`;
            const term = button(
              this.#document,
              `+ ${formatValue(modifier.value)}`,
              `stat-${stat.id.toLowerCase()}-${index}`,
              "v7-stat-modifier",
            );
            term.setAttribute(
              "aria-label",
              `${modifier.sourceLabel}: ${modifier.description}`,
            );
            term.dataset.tooltip = modifier.description;
            term.setAttribute(
              "aria-expanded",
              String(this.#selectedModifier === modifierId),
            );
            term.onclick = () => {
              this.#selectedModifier =
                this.#selectedModifier === modifierId ? null : modifierId;
              this.#pendingFocusAction = `stat-${stat.id.toLowerCase()}-${index}`;
              this.#render();
            };
            value.append(term);
            if (this.#selectedModifier === modifierId) {
              const explanation = text(
                this.#document,
                "span",
                `${modifier.sourceLabel}: ${modifier.description}`,
                "v7-stat-modifier-detail",
              );
              explanation.setAttribute("role", "tooltip");
              value.append(explanation);
            }
          }
          if (!exact)
            value.append(
              text(
                this.#document,
                "span",
                "+ ? · position bonus unknown",
                "v7-stat-unknown",
              ),
            );
          rows.append(text(this.#document, "dt", stat.label), value);
        }
        dock.append(rows);
        const abilities = el(this.#document, "div", "v7-abilities");
        for (const ability of stats.abilities) {
          const tag = button(
            this.#document,
            title(ability),
            `ability-${ability.toLowerCase()}`,
            "v7-ability-tag",
          );
          tag.setAttribute(
            "aria-expanded",
            String(this.#selectedAbility === ability),
          );
          tag.onclick = () => {
            this.#selectedAbility =
              this.#selectedAbility === ability ? null : ability;
            this.#render();
          };
          abilities.append(tag);
        }
        dock.append(abilities);
        if (
          this.#selectedAbility !== null &&
          stats.abilities.includes(this.#selectedAbility)
        ) {
          const card = el(this.#document, "aside", "v7-ability-card");
          card.append(
            text(this.#document, "h3", title(this.#selectedAbility)),
            text(
              this.#document,
              "p",
              abilityDescription(
                this.#selectedAbility,
                stats.minimumRange,
                stats.maximumRange,
              ),
            ),
          );
          const closeAbility = button(
            this.#document,
            "Close ability details",
            "close-ability",
            "close-button",
          );
          closeAbility.onclick = () => {
            this.#selectedAbility = null;
            this.#render();
          };
          card.append(closeAbility);
          dock.append(card);
        }
      }
      dock.append(
        text(
          this.#document,
          "p",
          unit.activation.handled ? "Handled" : "Needs action",
          "v7-readiness-label",
        ),
      );
      const visibility = unit.visibility;
      if (visibility?.concealment !== undefined)
        dock.append(
          this.#statusRow(
            "ui-status-concealed",
            "Concealment capability · legal detection may still reveal this Saboteur",
          ),
        );
      if (visibility?.detection !== undefined)
        dock.append(
          this.#statusRow(
            "ui-status-detected",
            "Detected · reveal ends outside all legal detector range",
          ),
        );
      for (const exposure of visibility?.exposures ?? [])
        dock.append(
          this.#statusRow(
            "ui-status-exposed",
            `Exposed by ${title(exposure.reason)} until ${playerLabelV7(view, exposure.boundary.anchorPlayerId)}'s next accepted End Turn${exposure.boundary.round.known ? ` in round ${exposure.boundary.round.value}` : " (round cannot be represented safely)"}`,
          ),
        );
      if (unit.role === "SABOTEUR" && unit.ownerId === view.viewer.id) {
        const cooldown = this.#statusRow(
          "ui-status-blackout-cooldown",
          unit.blackoutEligibility.known
            ? view.round >= unit.blackoutEligibility.round
              ? `Blackout cooldown ready · eligible round ${unit.blackoutEligibility.round}; other action and detection rules still apply`
              : `Blackout cooldown · eligible round ${unit.blackoutEligibility.round}`
            : "Blackout eligibility unavailable",
        );
        dock.append(cooldown);
      }
      const actions = this.#commandButtons(
        (command) =>
          "unitId" in command &&
          command.unitId === unit.id &&
          !NON_BUTTON_COMMANDS.has(command.kind),
      );
      this.#appendTacticalActions(dock, actions, view, unit.id);
      if (actions.querySelector("button") !== null) {
        actions.querySelector("p")?.remove();
        dock.dataset.hasActions = "true";
      }
      dock.append(actions);
    } else if (selection.kind === "CITY") {
      const city = view.cities.find(
        (candidate) => candidate.id === selection.cityId,
      );
      if (city === undefined) return null;
      const summary = el(this.#document, "div", "v7-selection-summary");
      summary.append(
        identity(
          this.#document,
          `building-city-${Math.max(1, Math.min(3, city.level))}`,
          `${city.isCapital ? "Capital" : "City"} · level ${city.level}`,
        ),
      );
      const details = el(this.#document, "div", "v7-selection-details");
      const blackout = view.blackoutStatuses.find(
        (status) => status.cityId === city.id,
      );
      if (blackout !== undefined) {
        const status = this.#statusRow(
          blackout.phase === "PENDING"
            ? "ui-status-blackout-pending"
            : blackout.phase === "ACTIVE"
              ? "ui-status-blackout-active"
              : "ui-status-blackout-recovery",
          blackoutStatusTextV7(blackout),
        );
        status.dataset.tacticalState = "blackout";
        if (blackout.visibility === "CITY_ONLY")
          status.append(
            text(
              this.#document,
              "span",
              "City-only status · source and exact suppression remain private.",
            ),
          );
        details.append(status);
      }
      details.append(
        text(
          this.#document,
          "p",
          `Population ${city.population} / ${city.level + 1}${city.population < 0 ? ` · infrastructure lost; replace ${-city.population} population before growth` : ""}`,
        ),
      );
      if (city.ownerId === view.viewer.id) {
        const assigned = view.units.filter(
          (unit) =>
            unit.ownerId === view.viewer.id && unit.homeCityId === city.id,
        ).length;
        const capacity =
          city.level +
          1 +
          (view.viewer.researchedTechs.includes("FORTIFICATION") ? 1 : 0);
        details.append(
          text(this.#document, "p", `Assigned units ${assigned} / ${capacity}`),
          text(
            this.#document,
            "p",
            city.blackout === null
              ? `Next income ${cityIncomeForViewerV7(view, city.id) ?? "unknown"}`
              : `Blackout ${title(city.blackout.phase)} · next income ${cityIncomeForViewerV7(view, city.id) ?? "unknown"}`,
          ),
        );
      } else {
        const owner = view.players.find((player) => player.id === city.ownerId);
        details.append(
          text(
            this.#document,
            "p",
            `${owner === undefined ? "Observed" : `Player ${owner.seat + 1}`} city · private capacity and income unavailable`,
          ),
        );
      }
      summary.append(details);
      dock.append(summary);
      if (city.ownerId === view.viewer.id)
        this.#appendCommandArea(
          dock,
          details,
          (command) => command.kind === "TRAIN" && command.cityId === city.id,
        );
    } else {
      const tile = view.board.tiles.find((candidate) =>
        same(candidate.at, selection.at),
      );
      if (tile === undefined) return null;
      if (!tile.explored) dock.append(text(this.#document, "h2", "Unexplored"));
      else {
        const asset =
          tile.improvement === null
            ? tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE"
              ? RULESET7_RESOURCE_ART_IDS[tile.resource]
              : RULESET7_TERRAIN_ART_IDS[tile.terrain]
            : RULESET7_IMPROVEMENT_ART_IDS[tile.improvement];
        const name = `${title(tile.biome)} · ${title(tile.terrain)}`;
        const summary = el(this.#document, "div", "v7-selection-summary");
        summary.append(identity(this.#document, asset, name));
        const details = el(this.#document, "div", "v7-selection-details");
        details.append(
          text(
            this.#document,
            "p",
            tile.road ? "Road · explored territory" : "Explored territory",
          ),
        );
        if (tile.improvement !== null)
          details.append(text(this.#document, "p", title(tile.improvement)));
        else if (tile.resource !== null && tile.resource !== "UNKNOWN_RESOURCE")
          details.append(text(this.#document, "p", title(tile.resource)));
        const value = view.improvementValues.find((entry) =>
          same(entry.at, tile.at),
        );
        if (value !== undefined)
          details.append(
            text(
              this.#document,
              "p",
              `${title(value.measure)} ${value.level}${value.level === 0 ? " · offline" : ""}`,
            ),
          );
        const monumentSource = monumentSourceForViewerV7(view, tile.at);
        if (monumentSource !== null) {
          const source = el(this.#document, "p", "v7-monument-source");
          source.append(
            createTacticalSymbolV7(
              this.#document,
              "ui-status-achievement-source-current-owner",
              this.#highContrast ? "HIGH_CONTRAST" : "DARK",
            ),
            text(
              this.#document,
              "span",
              `${title(monumentSource)} Monument · source visible to the current city owner`,
            ),
          );
          details.append(source);
        }
        summary.append(details);
        dock.append(summary);
        this.#appendCommandArea(
          dock,
          details,
          (command) =>
            "at" in command &&
            same(command.at, tile.at) &&
            command.kind !== "BUILD_MONUMENT",
        );
      }
    }
    dock.append(close);
    return dock;
  }

  #commandButtons(predicate: (command: CommandV7) => boolean): HTMLElement {
    const actions = el(this.#document, "div", "v7-context-actions");
    actions.addEventListener("focusin", (event) => {
      if (!(event.target instanceof HTMLElement)) return;
      const rowBounds = actions.getBoundingClientRect();
      const actionBounds = event.target.getBoundingClientRect();
      if (actionBounds.right > rowBounds.right)
        actions.scrollLeft += actionBounds.right - rowBounds.right;
      else if (actionBounds.left < rowBounds.left)
        actions.scrollLeft -= rowBounds.left - actionBounds.left;
    });
    actions.addEventListener(
      "wheel",
      (event) => {
        if (
          event.ctrlKey ||
          actions.scrollWidth <= actions.clientWidth ||
          Math.abs(event.deltaY) <= Math.abs(event.deltaX)
        )
          return;
        event.preventDefault();
        actions.scrollLeft += event.deltaY;
      },
      { passive: false },
    );
    for (const command of this.#snapshot.offeredCommands.filter(predicate)) {
      const action = button(
        this.#document,
        commandLabel(command),
        `command-${command.kind.toLowerCase()}`,
        command.kind === "TRAIN" ? "v7-train-action" : "v7-context-action",
      );
      const artId = commandArtIdV7(command);
      if (artId !== null) action.prepend(art(this.#document, artId, ""));
      if (command.kind === "TRAIN") {
        const rule = effectiveRoleRuleV7(command.role);
        action.setAttribute(
          "aria-label",
          `Train ${rule.label} for ${rule.cost ?? 0} Coins`,
        );
        action.append(
          text(
            this.#document,
            "span",
            `${rule.cost ?? 0} Coins`,
            "v7-command-economy",
          ),
        );
      } else if (command.kind === "BUILD_MINE") {
        action.setAttribute(
          "aria-label",
          "Build Mine · 5 Coins · +2 population",
        );
        action.append(
          text(
            this.#document,
            "span",
            "5 Coins · +2 population",
            "v7-command-economy",
          ),
        );
      } else if (command.kind === "BUILD_FORGE") {
        action.setAttribute(
          "aria-label",
          "Build Forge · 6 Coins · +1 population per adjacent Mine (maximum 6)",
        );
        action.append(
          text(
            this.#document,
            "span",
            "6 Coins · +1 population per adjacent Mine (maximum 6)",
            "v7-command-economy",
          ),
        );
      } else {
        const view = this.#snapshot.view;
        const preview = view === null ? null : previewEconomicV7(view, command);
        if (preview?.ok)
          action.append(
            text(
              this.#document,
              "span",
              economicPreviewLabelV7(preview.preview),
              "v7-command-economy",
            ),
          );
      }
      action.disabled = this.#localBusy();
      action.onclick = () => void this.#dispatch(command);
      if (command.kind === "TRAIN") {
        const card = el(this.#document, "div", "v7-train-card");
        const help = button(
          this.#document,
          "?",
          `train-help-${command.role.toLowerCase()}`,
          "v7-train-help",
        );
        const label = effectiveRoleRuleV7(command.role).label;
        help.setAttribute("aria-label", `About ${label}`);
        help.disabled = this.#localBusy();
        help.onclick = () => {
          this.#selectedRecruitHelp = command.role;
          this.#cityActionScrollLeft = actions.scrollLeft;
          this.#clearCityActionScrollAfterRestore = false;
          this.#render();
        };
        card.append(action, help);
        actions.append(card);
      } else actions.append(action);
    }
    if (actions.childElementCount === 0)
      actions.append(
        text(this.#document, "p", "No direct action is currently offered."),
      );
    return actions;
  }

  #appendCommandArea(
    dock: HTMLElement,
    details: HTMLElement,
    predicate: (command: CommandV7) => boolean,
  ): void {
    const actions = this.#commandButtons(predicate);
    if (actions.querySelector("button") !== null) {
      dock.dataset.hasActions = "true";
      dock.append(actions);
      return;
    }
    details.append(...actions.childNodes);
  }

  #appendTacticalActions(
    dock: HTMLElement,
    actions: HTMLElement,
    view: PlayerViewV7,
    unitId: number,
  ): void {
    const blackouts = blackoutTargetsV7(
      view,
      this.#snapshot.offeredCommands,
      unitId,
    );
    const firstBlackout = blackouts[0];
    if (firstBlackout !== undefined) {
      const explanation = el(this.#document, "section", "v7-tactical-state");
      explanation.dataset.tacticalState = "blackout-preview";
      explanation.append(
        createTacticalSymbolV7(
          this.#document,
          "ui-status-blackout-pending",
          this.#tacticalTheme(),
        ),
        text(
          this.#document,
          "span",
          `Blackout becomes Active at the target city's next owner Start Turn. It denies up to 3 future Coins without predicting an exact amount and blocks that city's Train/development for the affected turn; rewards, unit actions and existing infrastructure remain available. Unit cooldown is independently eligible in round ${firstBlackout.preview.nextEligibleRound}; city recovery independently requires a complete unaffected owner turn. The planted city effect survives source death. City-center reveal alone does not block it; hostile-unit detection does.`,
        ),
      );
      dock.append(explanation);
      const action = button(
        this.#document,
        this.#tacticalTargetMode?.kind === "BLACKOUT"
          ? "Cancel Blackout targeting"
          : "Blackout",
        "blackout",
        "v7-context-action v7-tactical-action",
      );
      const artId = commandArtIdV7(firstBlackout.command);
      if (artId !== null) action.prepend(art(this.#document, artId, ""));
      action.disabled = this.#localBusy();
      action.setAttribute(
        "aria-pressed",
        String(this.#tacticalTargetMode?.kind === "BLACKOUT"),
      );
      action.onclick = () => {
        if (blackouts.length === 1) {
          void this.#dispatch(firstBlackout.command);
          return;
        }
        this.#tacticalTargetMode =
          this.#tacticalTargetMode?.kind === "BLACKOUT"
            ? null
            : { kind: "BLACKOUT", sourceUnitId: unitId };
        this.#notice =
          this.#tacticalTargetMode === null
            ? "Blackout targeting cancelled."
            : `Choose one of ${blackouts.length} highlighted adjacent cities. City-center reveal alone does not block Blackout; hostile-unit detection does.`;
        this.#render();
        this.#queueBoardFocus();
      };
      actions.append(action);
    }
  }

  async #handleMapCommand(target: MapCommandTargetV7): Promise<void> {
    const view = this.#snapshot.view;
    if (view === null) return;
    const command = target.command;
    if (target.family === "BLACKOUT") this.#tacticalTargetMode = null;
    await this.#dispatch(command);
  }

  #statusRow(id: Ruleset7TacticalUiSymbolId, label: string): HTMLElement {
    const row = el(this.#document, "p", "v7-unit-status v7-tactical-status");
    row.append(
      createTacticalSymbolV7(this.#document, id, this.#tacticalTheme()),
      text(this.#document, "span", label),
    );
    return row;
  }

  #tacticalTheme(): TacticalSymbolTheme {
    return this.#highContrast ? "HIGH_CONTRAST" : "DARK";
  }

  #overlay(view: PlayerViewV7): HTMLElement {
    const overlay = el(this.#document, "section", "v7-overlay");
    overlay.dataset.screen = this.#screen.toLowerCase();
    overlay.dataset.v7Region = `overlay-${this.#screen.toLowerCase()}`;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    const close = button(
      this.#document,
      "Close",
      "close-overlay",
      "close-button",
    );
    close.onclick = () => {
      this.#closeOverlay();
    };
    if (this.#screen === "TECH") overlay.append(this.#technology(view));
    else if (this.#screen === "LEADERBOARD")
      overlay.append(this.#leaderboard(view));
    else if (this.#screen === "STATS") overlay.append(this.#stats(view));
    else if (this.#screen === "ACHIEVEMENTS")
      overlay.append(this.#achievements(view));
    else if (this.#screen === "SETTINGS") overlay.append(this.#settings());
    else
      overlay.append(
        text(this.#document, "h2", "Help & controls"),
        text(
          this.#document,
          "p",
          "Select map objects directly. Move and Attack use highlighted cells. Arrow keys move the map cursor; Enter activates; T opens Tech; G opens Leaderboard; E ends the turn; plus and minus zoom.",
        ),
      );
    overlay.prepend(close);
    return overlay;
  }

  #technology(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-tech-screen");
    section.append(text(this.#document, "h2", "Technology"));
    const tree = queryTechnologyTreeV7(view);
    const layout = technologyTreeLayoutV7(tree.nodes);
    const branches = el(this.#document, "nav", "v7-tech-branch-selector");
    branches.setAttribute("aria-label", "Technology branches");
    const branchSelect = this.#document.createElement("select");
    branchSelect.className = "v7-tech-branch-select";
    branchSelect.dataset.action = "tech-branch-select";
    branchSelect.setAttribute("aria-label", "Jump to technology branch");
    const graph = el(this.#document, "div", "v7-tech-graph");
    graph.style.setProperty(
      "--v7-tech-total-leaves",
      String(layout.reduce((total, branch) => total + branch.leafCount, 0)),
    );
    for (const branch of layout) {
      const column = el(this.#document, "section", "v7-tech-branch");
      column.style.setProperty(
        "--v7-tech-branch-span",
        String(branch.leafCount),
      );
      const branchId = `v7-tech-branch-${branch.node.branch.toLowerCase()}`;
      column.id = branchId;
      column.dataset.techBranch = branch.node.branch;
      column.tabIndex = -1;
      const heading = text(this.#document, "h3", title(branch.node.branch));
      heading.id = `${branchId}-heading`;
      column.setAttribute("aria-labelledby", heading.id);
      column.append(heading);
      appendTechNode(
        this.#document,
        column,
        branch,
        (node) => {
          this.#selectedTech = node.id;
          this.#pendingFocusAction = `tech-${node.id.toLowerCase()}`;
          this.#render();
          queueMicrotask(() =>
            this.#root
              .querySelector<HTMLElement>(".v7-tech-detail")
              ?.scrollIntoView?.({ block: "nearest" }),
          );
        },
        this.#selectedTech,
      );
      const option = this.#document.createElement("option");
      option.value = branch.node.branch;
      option.textContent = title(branch.node.branch);
      branchSelect.append(option);
      graph.append(column);
    }
    branchSelect.onchange = () => {
      const column = graph.querySelector<HTMLElement>(
        `[data-tech-branch="${branchSelect.value}"]`,
      );
      column?.scrollIntoView?.({ block: "start" });
    };
    branches.append(branchSelect);
    section.append(branches, graph);
    const selected =
      tree.nodes.find((node) => node.id === this.#selectedTech) ??
      tree.nodes[0];
    if (selected !== undefined) section.append(this.#techDetail(selected));
    return section;
  }

  #techDetail(node: PublicTechnologyNodeV7): HTMLElement {
    const detail = el(this.#document, "aside", "v7-tech-detail");
    detail.append(
      identity(this.#document, RULESET7_TECH_ART_IDS[node.id], title(node.id)),
      text(
        this.#document,
        "p",
        node.state === "OWNED"
          ? "Researched"
          : `${node.cost} Coins · ${node.affordable ? "Available" : node.state === "BLOCKED" ? "Locked" : "Insufficient Coins"}`,
      ),
    );
    if (node.id === "ENGINEERING")
      detail.append(
        text(
          this.#document,
          "p",
          "Reveal Ore. Enter Mountains. Build Mines on Ore. Build Workshops. Units on Mountains gain +1 sight.",
        ),
      );
    const prerequisites = el(
      this.#document,
      "section",
      "v7-tech-detail-group v7-tech-prerequisites",
    );
    prerequisites.append(text(this.#document, "h3", "Prerequisites"));
    const prerequisiteList = this.#document.createElement("ul");
    if (node.prerequisites.length === 0)
      prerequisiteList.append(text(this.#document, "li", "None"));
    else
      for (const prerequisite of node.prerequisites)
        prerequisiteList.append(
          text(
            this.#document,
            "li",
            `${title(prerequisite)}${node.missingPrerequisites.includes(prerequisite) ? " · not yet researched" : " · researched"}`,
          ),
        );
    prerequisites.append(prerequisiteList);
    detail.append(prerequisites);
    for (const group of technologyEffectGroupsV7(node.effects)) {
      const section = el(
        this.#document,
        "section",
        "v7-tech-detail-group v7-tech-effect-group",
      );
      section.dataset.effectGroup = group.id;
      section.append(text(this.#document, "h3", group.label));
      const list = this.#document.createElement("ul");
      for (const item of group.items)
        list.append(text(this.#document, "li", item));
      section.append(list);
      detail.append(section);
    }
    const command = this.#snapshot.offeredCommands.find(
      (candidate) =>
        candidate.kind === "RESEARCH" && candidate.tech === node.id,
    );
    if (command !== undefined) {
      const research = button(
        this.#document,
        "Research",
        `research-${node.id.toLowerCase()}`,
        "primary-action",
      );
      research.onclick = () => {
        this.#pendingFocusAction = `tech-${node.id.toLowerCase()}`;
        void this.#dispatch(command);
      };
      research.disabled = this.#localBusy();
      detail.append(research);
    }
    return detail;
  }

  #recruitHelp(role: UnitRoleIdV7): HTMLElement {
    const presentation = recruitmentRolePresentationV7(role);
    const modal = el(this.#document, "section", "v7-recruit-help");
    modal.dataset.v7Region = "recruit-help";
    modal.dataset.recruitRole = role;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute(
      "aria-label",
      `${presentation.label} recruitment information`,
    );
    const close = button(
      this.#document,
      "Close",
      "close-recruit-help",
      "close-button",
    );
    close.onclick = () => this.#closeRecruitHelp();
    modal.append(
      close,
      identity(this.#document, RULESET7_UNIT_ART_IDS[role], presentation.label),
      text(
        this.#document,
        "p",
        "Recruitment reference · canonical base values only. Live damage, activation status, modifiers, and veteran state are intentionally omitted.",
        "v7-recruit-help-context",
      ),
    );
    const stats = el(this.#document, "dl", "v7-recruit-stats");
    for (const stat of presentation.stats)
      stats.append(
        text(this.#document, "dt", stat.label),
        text(this.#document, "dd", stat.value),
      );
    modal.append(stats);
    const abilities = el(this.#document, "section", "v7-recruit-help-group");
    abilities.append(text(this.#document, "h3", "Abilities"));
    const abilityList = this.#document.createElement("ul");
    for (const ability of presentation.abilities)
      abilityList.append(text(this.#document, "li", ability));
    abilities.append(abilityList);
    modal.append(abilities);
    if (presentation.restrictions.length > 0) {
      const restrictions = el(
        this.#document,
        "section",
        "v7-recruit-help-group",
      );
      restrictions.append(text(this.#document, "h3", "Restrictions"));
      const restrictionList = this.#document.createElement("ul");
      for (const restriction of presentation.restrictions)
        restrictionList.append(text(this.#document, "li", restriction));
      restrictions.append(restrictionList);
      modal.append(restrictions);
    }
    return modal;
  }

  #leaderboard(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen");
    section.append(
      text(this.#document, "h2", "Leaderboard"),
      text(
        this.#document,
        "p",
        "Capture all hostile cities before losing your last city.",
      ),
    );
    const list = this.#document.createElement("ol");
    for (const entry of view.leaderboard)
      list.append(
        text(
          this.#document,
          "li",
          `Player ${entry.seat + 1}${entry.isViewer ? " (you)" : ""} · ${entry.cityCount} cities · ${entry.livingUnitCount} units · ${title(entry.status)}`,
        ),
      );
    section.append(list);
    return section;
  }

  #stats(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen");
    const ownedCities = view.cities.filter(
      (city) => city.ownerId === view.viewer.id,
    );
    const ownedUnits = view.units.filter(
      (unit) => unit.ownerId === view.viewer.id,
    );
    section.append(
      text(this.#document, "h2", "Stats"),
      text(
        this.#document,
        "p",
        `Round ${view.round} · ${view.viewer.coins} Coins · ${ownedCities.length} cities · ${ownedUnits.length} units · ${view.viewer.researchedTechs.length} technologies`,
      ),
      text(
        this.#document,
        "p",
        "Opponent totals are limited to the public leaderboard; private economy and technology remain undisclosed.",
      ),
    );
    return section;
  }

  #achievements(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen");
    section.append(text(this.#document, "h2", "Achievements"));
    for (const achievement of ["ENGINEER", "MUSTER"] as const) {
      const entitlement = view.viewer.achievementEntitlements.find(
        (entry) => entry.achievement === achievement,
      );
      const progress = view.achievementProgress.find(
        (entry) => entry.achievement === achievement,
      );
      const card = el(this.#document, "section", "v7-achievement");
      const current =
        progress?.achievement === "ENGINEER"
          ? progress.currentMaximumOutput
          : progress?.achievement === "MUSTER"
            ? progress.currentDistinctTrainableRoles
            : 0;
      const required =
        progress?.achievement === "ENGINEER"
          ? progress.requiredOutput
          : progress?.achievement === "MUSTER"
            ? progress.requiredDistinctTrainableRoles
            : achievement === "ENGINEER"
              ? 6
              : 4;
      const symbols = el(this.#document, "div", "v7-achievement-symbols");
      const theme = this.#highContrast
        ? ("HIGH_CONTRAST" as const)
        : ("DARK" as const);
      symbols.append(
        createTacticalSymbolV7(
          this.#document,
          "ui-status-achievement-progress",
          theme,
        ),
        createTacticalSymbolV7(
          this.#document,
          entitlement?.spent
            ? "ui-status-achievement-entitlement-spent"
            : entitlement?.unlocked
              ? "ui-status-achievement-entitlement-unlocked"
              : "ui-status-achievement-entitlement-locked",
          theme,
        ),
      );
      card.append(
        symbols,
        text(this.#document, "h3", title(achievement)),
        text(
          this.#document,
          "p",
          achievement === "ENGINEER"
            ? "Own one live processor producing at least 6 population."
            : "Own four distinct trainable unit roles at once.",
        ),
        text(
          this.#document,
          "p",
          `${current} / ${required} · ${entitlement?.spent ? "Spent" : entitlement?.unlocked ? "Unlocked" : "Locked"}`,
        ),
      );
      if (entitlement?.unlocked && !entitlement.spent) {
        const place = button(
          this.#document,
          "Place Monument",
          `monument-${achievement.toLowerCase()}`,
        );
        place.onclick = () => {
          this.#selectedAchievement = achievement;
          this.#screen = "MATCH";
          this.#notice = `Choose a highlighted legal tile for the ${title(achievement)} Monument.`;
          this.#render();
        };
        card.append(place);
      }
      section.append(card);
    }
    return section;
  }

  #settings(): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen");
    section.append(text(this.#document, "h2", "Settings"));
    const motion = select(
      this.#document,
      "Motion",
      "v7-motion",
      ["FULL", "REDUCED"],
      this.#motion,
    );
    motion.querySelector("select")?.addEventListener("change", (event) => {
      this.#motion =
        (event.currentTarget as HTMLSelectElement).value === "REDUCED"
          ? "REDUCED"
          : "FULL";
      this.#persistSettings();
      this.#render();
    });
    const speed = select(
      this.#document,
      "Animation speed",
      "v7-animation-speed",
      ["NORMAL", "FAST"],
      this.#animationSpeed,
    );
    speed.querySelector("select")?.addEventListener("change", (event) => {
      this.#animationSpeed =
        (event.currentTarget as HTMLSelectElement).value === "FAST"
          ? "FAST"
          : "NORMAL";
      if (this.#animationSpeed === "FAST") this.#cancelPresentations();
      this.#persistSettings();
      this.#render();
    });
    const scale = select(
      this.#document,
      "UI scale",
      "v7-ui-scale",
      ["1", "1.25", "1.5", "2"],
      String(this.#uiScale),
    );
    scale.querySelector("select")?.addEventListener("change", (event) => {
      const value = Number((event.currentTarget as HTMLSelectElement).value);
      this.#uiScale =
        value === 1.25 || value === 1.5 || value === 2 ? value : 1;
      this.#persistSettings();
      this.#render();
    });
    const contrast = button(
      this.#document,
      this.#highContrast ? "High contrast on" : "High contrast off",
      "high-contrast",
    );
    contrast.setAttribute("aria-pressed", String(this.#highContrast));
    contrast.onclick = () => {
      this.#highContrast = !this.#highContrast;
      this.#persistSettings();
      this.#render();
    };
    const restart = button(this.#document, "Restart Same Match", "restart");
    restart.onclick = () => void this.#restart();
    const remove = button(
      this.#document,
      "Delete Save",
      "delete-save",
      "destructive",
    );
    remove.onclick = () => void this.#deleteSave();
    const safe = button(
      this.#document,
      "Export player-safe log",
      "export-safe-log",
    );
    safe.onclick = () => this.#exportSafeLog();
    const debug = button(
      this.#document,
      "Export debug bundle (includes hidden map and units)",
      "export-debug-with-spoilers",
      "destructive",
    );
    debug.setAttribute(
      "aria-label",
      "Export debug bundle (includes hidden map and units; spoilers)",
    );
    debug.onclick = () => this.#exportDebug();
    section.append(
      motion,
      speed,
      scale,
      contrast,
      restart,
      remove,
      safe,
      debug,
    );
    return section;
  }

  #reward(view: PlayerViewV7): HTMLElement {
    const choice = view.pendingChoices[0];
    const modal = el(this.#document, "section", "v7-mandatory-choice");
    modal.dataset.mandatoryChoice = "true";
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");
    if (choice === undefined) return modal;
    modal.append(
      text(
        this.#document,
        "h2",
        `Choose reward · level ${choice.reachedLevel}`,
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
      if (command === undefined) continue;
      const action = button(
        this.#document,
        rewardLabel(reward, choice.reachedLevel),
        `reward-${reward.toLowerCase()}`,
        "v7-reward-action",
      );
      action.prepend(art(this.#document, rewardArtIdV7(reward), ""));
      action.disabled = this.#localBusy();
      action.onclick = () => void this.#dispatch(command);
      modal.append(action);
    }
    modal.dataset.v7Region = "mandatory-reward";
    return modal;
  }

  #results(view: PlayerViewV7): HTMLElement {
    const result = el(this.#document, "section", "v7-results");
    result.dataset.v7Region = "results";
    result.setAttribute("role", "dialog");
    result.setAttribute("aria-modal", "true");
    result.append(
      text(
        this.#document,
        "h2",
        view.outcome?.kind === "VICTORY" ? "Victory" : "Defeat",
      ),
      text(
        this.#document,
        "p",
        `Round ${view.round} · seed ${view.setup.seed} · ${view.setup.width} × ${view.setup.height}`,
      ),
    );
    const restart = button(this.#document, "Play Again", "restart");
    restart.onclick = () => void this.#restart();
    result.append(restart, this.#ruleset6Link());
    return result;
  }

  #errorPanel(): HTMLElement {
    const panel = el(this.#document, "section", "v7-results");
    panel.dataset.v7Region = "error";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.append(
      text(this.#document, "h2", "Match paused"),
      text(
        this.#document,
        "p",
        this.#snapshot.diagnostic ?? "The match stopped safely.",
      ),
    );
    return panel;
  }

  #open(screen: ScreenV7, returnAction: string | null = null): void {
    if (this.#snapshot.view?.pendingChoices.length) return;
    this.#modalReturnAction = returnAction;
    this.#screen = screen;
    this.#render();
    queueMicrotask(() => {
      if (this.#destroyed) return;
      this.#root
        .querySelector<HTMLButtonElement>('[data-action="close-overlay"]')
        ?.focus();
    });
  }
  #readDraft(form: HTMLElement): void {
    const count = Number(value(form, "v7-ai-count"));
    const aiCount = count === 2 || count === 3 ? count : 1;
    const sizes = compatibleSizes(aiCount);
    const requested = Number(value(form, "v7-board-size"));
    this.#draft = {
      aiCount,
      aiMode:
        value(form, "v7-ai-mode") === "COOPERATIVE" ? "COOPERATIVE" : "RIVAL",
      boardSize: sizes.includes(requested as never)
        ? (requested as DraftV7["boardSize"])
        : (sizes[0] ?? 11),
      seedText: value(form, "v7-seed"),
      humanColor: COLORS.includes(value(form, "v7-color") as PlayerColorV7)
        ? (value(form, "v7-color") as PlayerColorV7)
        : "CORAL",
    };
  }
  async #launch(setup: MatchSetupV7, replace: boolean): Promise<void> {
    this.#cancelPresentations();
    this.#error = "";
    this.#tacticalTargetMode = null;
    const result = await this.#controller.launch(setup, {
      replaceStoredMatch: replace,
    });
    if (this.#destroyed) return;
    if (!result.ok) {
      this.#error = result.diagnostic;
      this.#render();
      return;
    }
    this.#matchInstance += 1;
    this.#selection = null;
    this.#notice = "Conquest launched at the canonical Start Turn boundary.";
    this.#render();
    await this.#progressAi();
    if (
      this.#screen === "MATCH" &&
      this.#snapshot.view?.pendingChoices.length === 0
    )
      this.#queueBoardFocus();
  }
  async #resumeMatch(): Promise<void> {
    const resumed = await this.#controller.resume();
    if (this.#destroyed) return;
    if (!resumed) this.#error = "The Ruleset 7 save could not be resumed.";
    else {
      this.#matchInstance += 1;
      this.#notice = "Ruleset 7 save resumed at its last accepted command.";
    }
    this.#render();
    await this.#progressAi();
  }
  async #returnToMenu(): Promise<void> {
    this.#error = "";
    const returned = await this.#controller.returnToMenu();
    if (this.#destroyed) return;
    if (!returned) {
      this.#error =
        this.#controller.snapshot().saveWarning ??
        "Main menu is unavailable until the current accepted boundary is saved. Retry Main menu.";
      this.#render();
      await this.#progressAi();
      return;
    }
    this.#cancelPresentations();
    this.#selection = null;
    this.#tacticalTargetMode = null;
    this.#screen = "MATCH";
    this.#compactMenuOpen = false;
    this.#notice =
      "Match saved at its last accepted command. Resume when ready.";
    this.#render();
  }
  async #dispatch(command: CommandV7): Promise<void> {
    if (this.#localBusy()) return;
    const restoreAction =
      command.kind === "RESEARCH" ? `tech-${command.tech.toLowerCase()}` : null;
    this.#presentationActive = true;
    this.#render();
    const result = await this.#controller.dispatch(command);
    if (this.#destroyed) return;
    if (!result.accepted) {
      this.#presentationActive = false;
      this.#error = `Action rejected: ${result.reason}${result.error === undefined ? "" : ` (${result.error.code})`}.`;
      this.#render();
      return;
    }
    this.#error = "";
    this.#tacticalTargetMode = null;
    this.#notice =
      specialBoundaryNoticeV7(
        result.playerEvents.events,
        result.afterView.viewer.id,
      ) ?? `${commandLabel(command)} accepted.`;
    if (command.kind === "RESEARCH") this.#selectedTech = command.tech;
    if (command.kind === "BUILD_MONUMENT") this.#selectedAchievement = null;
    this.#pendingFocusAction = restoreAction;
    this.#render();
    await this.#presentationTail;
    if (this.#destroyed) return;
    this.#presentationActive = false;
    this.#pendingFocusAction = restoreAction;
    this.#render();
    await this.#progressAi();
    if (this.#destroyed) return;
    if (
      restoreAction === null &&
      this.#screen === "MATCH" &&
      this.#snapshot.view?.pendingChoices.length === 0
    )
      this.#queueBoardFocus();
  }
  async #progressAi(): Promise<void> {
    if (this.#destroyed) return;
    const view = this.#controller.snapshot().view;
    if (
      view === null ||
      view.outcome !== null ||
      view.turnOrder[view.activeSeatIndex] === view.humanPlayerId
    )
      return;
    const result = await this.#controller.progressAiTurns();
    if (this.#destroyed) return;
    if (!result.ok && !result.cancelled) this.#error = result.diagnostic;
    else if (result.ok)
      this.#notice = `AI completed ${result.acceptedCommands} accepted actions.`;
    this.#render();
  }
  async #restart(): Promise<void> {
    this.#cancelPresentations();
    const result = await this.#controller.restart();
    if (this.#destroyed) return;
    if (!result.ok) this.#error = result.diagnostic;
    else {
      this.#matchInstance += 1;
      this.#selection = null;
      this.#screen = "MATCH";
      this.#notice =
        "Ruleset 7 match restarted from the identical setup and seed.";
    }
    this.#render();
    await this.#progressAi();
  }
  async #deleteSave(): Promise<void> {
    this.#cancelPresentations();
    const deleted = await this.#controller.deleteStoredSave();
    if (this.#destroyed) return;
    if (deleted) {
      this.#selection = null;
      this.#screen = "MATCH";
      this.#notice = "Only the Ruleset 7 revision-4 save was deleted.";
    } else this.#error = "The Ruleset 7 save could not be deleted.";
    this.#render();
  }
  #exportSafeLog(): void {
    const result = this.#controller.exportSafeLog();
    if (result === null) return;
    this.#downloadSafeLog(result.source, result.filename);
    this.#notice = "Player-safe projected log downloaded.";
    this.#render();
  }
  #exportDebug(): void {
    const result = this.#controller.exportDebugBundle({
      acknowledgeHiddenInformation: true,
    });
    if (!result.ok) return;
    this.#downloadDebugBundle(result.source, result.filename);
    this.#notice =
      "Spoiler-labelled omniscient debug bundle downloaded locally.";
    this.#render();
  }
  #patchAiProgress(): void {
    const progress = this.#root.querySelector<HTMLElement>(
      "[data-v7-ai-progress]",
    );
    if (progress !== null)
      progress.textContent = `AI thinking · ${this.#snapshot.ai.policySlices} scheduled slices`;
    const fast = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="fast-forward"]',
    );
    if (fast !== null && this.#snapshot.ai.fastForward)
      fast.textContent = "Fast Forward enabled";
  }
  #queueBoundary(boundary: Ruleset7AcceptedBoundary): void {
    if (this.#destroyed) return;
    this.#notice =
      specialBoundaryNoticeV7(
        boundary.playerEvents.events,
        boundary.afterView.viewer.id,
      ) ?? this.#notice;
    if (this.#snapshot.ai.fastForward) {
      this.#presentationQueue = [];
      return;
    }
    this.#presentationActive = true;
    this.#render();
    this.#presentationQueue.push({
      matchInstance: this.#matchInstance,
      boundary,
    });
    if (this.#presentationQueue.length > 12) {
      const latest = this.#presentationQueue.at(-1);
      this.#cancelPresentations();
      if (latest !== undefined) {
        this.#presentationQueue = [latest];
        this.#presentationActive = true;
        this.#render();
      }
    }
    this.#presentationTail = this.#presentationTail.then(async () => {
      while (!this.#destroyed && this.#presentationQueue.length > 0) {
        if (this.#snapshot.ai.fastForward) {
          this.#presentationQueue = [];
          break;
        }
        const next = this.#presentationQueue.shift();
        if (next === undefined) break;
        if (next.matchInstance !== this.#matchInstance) continue;
        await this.#boardHost.presentBoundary?.(
          next.boundary.beforeView,
          next.boundary.afterView,
          next.boundary.playerEvents,
        );
      }
      if (this.#presentationQueue.length === 0) {
        this.#presentationActive = false;
        this.#render();
      }
    });
  }
  #cancelPresentations(): void {
    this.#presentationQueue = [];
    this.#presentationActive = false;
    this.#boardHost.finishPresentations?.();
  }
  #persistSettings(): void {
    try {
      this.#settingsStorage?.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify({
          format: "pulp-wars-settings",
          version: 1,
          settings: {
            uiScale: this.#uiScale,
            motion: this.#motion,
            animationSpeed: this.#animationSpeed,
            highContrast: this.#highContrast,
          },
        }),
      );
    } catch {
      this.#error = "Settings could not be saved.";
    }
  }
  #trapModalFocus(event: KeyboardEvent, modal: HTMLElement): void {
    const controls = [
      ...modal.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (controls.length === 0) return;
    const first = controls[0];
    const last = controls.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && this.#document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.#document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  #closeOverlay(): void {
    const returnAction = this.#modalReturnAction;
    this.#modalReturnAction = null;
    this.#screen = "MATCH";
    this.#render();
    queueMicrotask(() => {
      if (this.#destroyed) return;
      if (returnAction === null) this.#boardHost.focus();
      else
        this.#root
          .querySelector<HTMLButtonElement>(`[data-action="${returnAction}"]`)
          ?.focus();
    });
  }

  #closeRecruitHelp(): void {
    const role = this.#selectedRecruitHelp;
    this.#selectedRecruitHelp = null;
    this.#pendingFocusAction =
      role === null ? null : `train-help-${role.toLowerCase()}`;
    this.#clearCityActionScrollAfterRestore = true;
    this.#render();
  }

  #syncModalIsolation(main: HTMLElement): void {
    const modal = main.querySelector<HTMLElement>('[aria-modal="true"]');
    for (const child of [...main.children]) {
      const element = child as HTMLElement;
      element.inert = modal !== null && element !== modal;
      if (element.inert) element.setAttribute("aria-hidden", "true");
      else element.removeAttribute("aria-hidden");
    }
    if (modal !== null && !modal.contains(this.#document.activeElement))
      queueMicrotask(() => {
        if (this.#destroyed) return;
        modal
          .querySelector<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])',
          )
          ?.focus();
      });
  }

  #queueBoardFocus(): void {
    queueMicrotask(() => {
      if (
        !this.#destroyed &&
        this.#screen === "MATCH" &&
        this.#root.querySelector('[aria-modal="true"]') === null
      )
        this.#boardHost.focus();
    });
  }

  #localBusy(): boolean {
    return (
      this.#presentationActive ||
      this.#snapshot.transitioning ||
      this.#snapshot.ai.active
    );
  }
}

function reconcileMatchChildren(
  parent: HTMLElement,
  board: HTMLElement,
  desired: readonly HTMLElement[],
): void {
  let cursor: ChildNode | null = board.nextSibling;
  const retained = new Set<ChildNode>();
  const desiredKeys = new Set(desired.map(stableElementKey));
  for (const next of desired) {
    const key = stableElementKey(next);
    const current = [...parent.children].find(
      (candidate): candidate is HTMLElement =>
        candidate instanceof HTMLElement &&
        candidate !== board &&
        !retained.has(candidate) &&
        stableElementKey(candidate) === key,
    );
    const preservesStaticControls =
      key === "region:hud" ||
      key === "region:overlay-settings" ||
      key === "action:fast-forward";
    const resolved =
      current === undefined || !preservesStaticControls
        ? next
        : reconcileElement(current, next);
    retained.add(resolved);
    while (
      cursor !== null &&
      cursor !== resolved &&
      cursor !== board &&
      !retained.has(cursor) &&
      (!(cursor instanceof HTMLElement) ||
        !desiredKeys.has(stableElementKey(cursor)))
    ) {
      const obsolete = cursor;
      cursor = cursor.nextSibling;
      obsolete.remove();
    }
    if (resolved !== cursor) parent.insertBefore(resolved, cursor);
    cursor = resolved.nextSibling;
  }
  for (const child of [...parent.children]) {
    if (child !== board && !retained.has(child as HTMLElement)) child.remove();
  }
}

function reconcileElement(
  current: HTMLElement,
  desired: HTMLElement,
): HTMLElement {
  if (current.tagName !== desired.tagName) return desired;
  for (const attribute of [...current.attributes]) {
    if (!desired.hasAttribute(attribute.name))
      current.removeAttribute(attribute.name);
  }
  for (const attribute of [...desired.attributes])
    current.setAttribute(attribute.name, attribute.value);
  current.onclick = desired.onclick;
  current.onchange = desired.onchange;
  current.oninput = desired.oninput;
  current.onkeydown = desired.onkeydown;
  if (
    current instanceof HTMLButtonElement &&
    desired instanceof HTMLButtonElement
  )
    current.disabled = desired.disabled;
  if (
    current instanceof HTMLInputElement &&
    desired instanceof HTMLInputElement
  ) {
    current.disabled = desired.disabled;
    current.checked = desired.checked;
    current.value = desired.value;
  }
  if (
    current instanceof HTMLSelectElement &&
    desired instanceof HTMLSelectElement
  ) {
    current.disabled = desired.disabled;
    current.value = desired.value;
  }
  reconcileElementChildren(current, desired);
  return current;
}

function reconcileElementChildren(
  current: HTMLElement,
  desired: HTMLElement,
): void {
  let cursor = current.firstChild;
  const retained = new Set<ChildNode>();
  for (const desiredChild of [...desired.childNodes]) {
    let resolved: ChildNode;
    if (desiredChild.nodeType === Node.TEXT_NODE) {
      const candidate =
        cursor?.nodeType === Node.TEXT_NODE && !retained.has(cursor)
          ? cursor
          : undefined;
      resolved = candidate ?? desiredChild;
      if (resolved.textContent !== desiredChild.textContent)
        resolved.textContent = desiredChild.textContent;
    } else if (desiredChild instanceof HTMLElement) {
      const key = stableElementKey(desiredChild);
      const candidate = [...current.children].find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement &&
          !retained.has(child) &&
          stableElementKey(child) === key,
      );
      resolved =
        candidate === undefined
          ? desiredChild
          : reconcileElement(candidate, desiredChild);
    } else resolved = desiredChild;
    retained.add(resolved);
    if (resolved !== cursor) current.insertBefore(resolved, cursor);
    cursor = resolved.nextSibling;
  }
  for (const child of [...current.childNodes])
    if (!retained.has(child)) child.remove();
}

function stableElementKey(element: Element): string {
  const action = element.getAttribute("data-action");
  if (action !== null) return `action:${action}`;
  const region = element.getAttribute("data-v7-region");
  if (region !== null) return `region:${region}`;
  if (element.id) return `id:${element.id}`;
  return `${element.tagName}:${element.className}`;
}

function appendTechNode(
  documentRoot: Document,
  parent: HTMLElement,
  layout: ReturnType<typeof technologyTreeLayoutV7>[number],
  choose: (node: PublicTechnologyNodeV7) => void,
  selected: TechnologyIdV7 | null,
): void {
  const node = el(documentRoot, "div", "v7-tech-node");
  const card = button(
    documentRoot,
    "",
    `tech-${layout.node.id.toLowerCase()}`,
    `v7-tech-card state-${layout.node.state.toLowerCase()}`,
  );
  card.dataset.selected = String(layout.node.id === selected);
  card.append(
    art(documentRoot, RULESET7_TECH_ART_IDS[layout.node.id], ""),
    text(documentRoot, "span", title(layout.node.id)),
  );
  if (layout.node.state !== "OWNED")
    card.append(
      text(documentRoot, "span", `${layout.node.cost} Coins`, "v7-tech-cost"),
    );
  else card.append(text(documentRoot, "span", "✓", "v7-tech-check"));
  card.onclick = () => choose(layout.node);
  node.append(card);
  if (layout.children.length > 0) {
    const children = el(documentRoot, "div", "v7-tech-children");
    children.style.setProperty("--v7-tech-leaves", String(layout.leafCount));
    if (layout.children.length === 1) children.classList.add("is-unary");
    for (const child of layout.children) {
      const edge = el(documentRoot, "div", "v7-tech-edge");
      edge.style.gridColumn = `span ${child.leafCount}`;
      edge.dataset.parentTech = layout.node.id;
      edge.dataset.childTech = child.node.id;
      appendTechNode(documentRoot, edge, child, choose, selected);
      children.append(edge);
    }
    node.append(children);
  }
  parent.append(node);
}
function identity(
  documentRoot: Document,
  assetId: string,
  label: string,
): HTMLElement {
  const identity = el(documentRoot, "div", "v7-identity");
  const viewport = el(documentRoot, "span", "v7-identity-art");
  const image = art(documentRoot, assetId, "");
  const bounds = V7_UI_VISIBLE_ALPHA_BOUNDS[assetId];
  if (bounds !== undefined) {
    const layout = selectionIdentityArtworkLayoutV6({
      mode: "VISIBLE_ALPHA",
      source: { width: 256, height: 384 },
      visibleBounds: bounds,
    });
    viewport.dataset.frameMode = "visible-alpha";
    image.style.left = `${layout.image.left}px`;
    image.style.top = `${layout.image.top}px`;
    image.style.width = `${layout.image.width}px`;
    image.style.height = `${layout.image.height}px`;
  }
  viewport.append(image);
  identity.append(viewport, text(documentRoot, "h2", label));
  return identity;
}
function art(
  documentRoot: Document,
  assetId: string,
  alt: string,
): HTMLImageElement {
  const image = documentRoot.createElement("img");
  image.className = "v7-art-frame";
  image.src = ACCEPTED_ART_URLS[assetId] ?? "";
  image.alt = alt;
  image.dataset.assetId = assetId;
  return image;
}
function compatibleSizes(aiCount: 1 | 2 | 3): readonly DraftV7["boardSize"][] {
  const minimum = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return BOARD_SIZES.filter((size) => size >= minimum);
}
function setupFrom(draft: DraftV7): MatchSetupV7 | null {
  if (!/^\d+$/.test(draft.seedText)) return null;
  const seed = Number(draft.seedText);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
    return null;
  return {
    rulesetId: "pulp-wars-poc-7r4",
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
    mapGenerationRevision: "REGIONAL_BIOMES_V1",
  };
}
export function cityIncomeForViewerV7(
  view: PlayerViewV7,
  cityId: number,
): number | null {
  const city = view.cities.find((entry) => entry.id === cityId);
  if (city === undefined || city.ownerId !== view.viewer.id) return null;
  const besieged = view.units.some(
    (unit) =>
      hostile(view, city.ownerId, unit.ownerId) && same(unit.at, city.at),
  );
  if (besieged) return 0;
  const market =
    view.improvementValues.find(
      (value) =>
        value.improvement === "MARKET" && tileCity(view, value.at) === city.id,
    )?.level ?? 0;
  const before = Math.max(
    1,
    city.level +
      (city.isCapital ? 1 : 0) +
      market +
      Math.min(0, city.population),
  );
  return city.blackout?.phase === "ACTIVE" ? Math.max(0, before - 3) : before;
}
function incomeDescription(view: PlayerViewV7): string {
  const cities = view.cities.filter((city) => city.ownerId === view.viewer.id);
  return `Next income ${cities.reduce((sum, city) => sum + (cityIncomeForViewerV7(view, city.id) ?? 0), 0)} from ${cities.length} cities, including capital, Market, population deficit, siege and Blackout effects.`;
}
function tileCity(view: PlayerViewV7, at: CoordV7): number | null {
  const tile = view.board.tiles.find((entry) => same(entry.at, at));
  return tile?.explored === true ? tile.territoryCityId : null;
}
function effectDescription(
  effect: PublicTechnologyNodeV7["effects"][number],
): string {
  switch (effect.kind) {
    case "COMMAND":
      return title(effect.command);
    case "UNIT_ROLE": {
      const role = effectiveRoleRuleV7(effect.role);
      return `Train ${role.label} · ${role.cost ?? 0} Coins · range ${role.minimumRange}–${role.range}`;
    }
    case "RESOURCE_REVEAL":
      return `Reveal ${effect.resources.map(title).join(" and ")}`;
    case "ECONOMIC_FORMULA":
      return economicFormulaV7(effect.improvement, effect.formula);
    case "CONNECTED_FARM_VISUALS":
      return "Orthogonally connected Farms share one field visual; each Farm remains +2 population.";
    case "FOREST_MOVEMENT_FREEDOM":
      return `${effect.roles.map(title).join(", ")} enter Forest at ordinary cost`;
    case "MOUNTAIN_MOVEMENT":
      return "Units may enter Mountains";
    case "HIGH_GROUND_VISION":
      return "+1 sight while on a Mountain";
    case "ROLE_SIGHT":
      return `${title(effect.role)} sight radius becomes ${effect.radius}`;
    case "SCOUT_DETECTION_RADIUS":
      return `Scout detects hostile Saboteurs within radius ${effect.radius}`;
    case "ROAD_MOVEMENT":
      return "Ordinary step costs 1; orthogonally connected Road step costs ½";
    case "MARKET_CAPITAL_ROAD_BONUS":
      return `Market connected to the capital adds +${effect.coins} Coin`;
    case "FRIENDLY_CITY_FORTIFICATION":
      return "Fighter and Guard receive ×2 defense in an owned unwalled city";
    case "OWNED_CITY_CAPACITY_BONUS":
      return `Every owned city gains +${effect.capacity} capacity`;
    case "MEDIC_HEAL":
      return `Medic heals ${effect.amount} HP`;
    case "FRIENDLY_IDLE_RECOVERY":
      return `Idle friendly recovery becomes ${effect.amount} HP`;
    case "FIRST_HOSTILE_CAPTURE_SPOILS":
      return `First hostile capture of each city awards +${effect.coins} Coins`;
  }
}

export interface TechnologyEffectGroupV7 {
  readonly id:
    | "UNITS"
    | "ACTIONS"
    | "BUILDINGS"
    | "VISIBILITY"
    | "MOVEMENT_SIGHT"
    | "PASSIVE_EFFECTS";
  readonly label: string;
  readonly items: readonly string[];
}

/** Keeps technology prose grouped directly by the structured unlock union. */
export function technologyEffectGroupsV7(
  effects: PublicTechnologyNodeV7["effects"],
): readonly TechnologyEffectGroupV7[] {
  const order: readonly TechnologyEffectGroupV7["id"][] = [
    "UNITS",
    "ACTIONS",
    "BUILDINGS",
    "VISIBILITY",
    "MOVEMENT_SIGHT",
    "PASSIVE_EFFECTS",
  ];
  const labels: Readonly<Record<TechnologyEffectGroupV7["id"], string>> = {
    UNITS: "Units",
    ACTIONS: "Actions",
    BUILDINGS: "Buildings",
    VISIBILITY: "Visibility",
    MOVEMENT_SIGHT: "Movement & sight",
    PASSIVE_EFFECTS: "Passive effects",
  };
  const grouped = new Map<TechnologyEffectGroupV7["id"], string[]>();
  for (const effect of effects) {
    const id = technologyEffectGroupIdV7(effect);
    const descriptions =
      effect.kind === "UNIT_ROLE"
        ? technologyRoleDescriptionsV7(effect.role)
        : [effectDescription(effect)];
    grouped.set(id, [...(grouped.get(id) ?? []), ...descriptions]);
  }
  return order.flatMap((id) => {
    const items = grouped.get(id);
    return items === undefined ? [] : [{ id, label: labels[id], items }];
  });
}

function technologyRoleDescriptionsV7(roleId: UnitRoleIdV7): readonly string[] {
  const role = effectiveRoleRuleV7(roleId);
  return [
    `Train ${role.label} · ${role.cost ?? 0} Coins`,
    ...role.abilities.map(
      (ability) =>
        `${title(ability)}: ${abilityDescription(ability, role.minimumRange, role.range)}`,
    ),
  ];
}

function technologyEffectGroupIdV7(
  effect: PublicTechnologyNodeV7["effects"][number],
): TechnologyEffectGroupV7["id"] {
  switch (effect.kind) {
    case "UNIT_ROLE":
      return "UNITS";
    case "COMMAND":
      return effect.command.startsWith("BUILD_") &&
        effect.command !== "BUILD_ROAD"
        ? "BUILDINGS"
        : "ACTIONS";
    case "ECONOMIC_FORMULA":
    case "CONNECTED_FARM_VISUALS":
      return "BUILDINGS";
    case "RESOURCE_REVEAL":
      return "VISIBILITY";
    case "FOREST_MOVEMENT_FREEDOM":
    case "MOUNTAIN_MOVEMENT":
    case "HIGH_GROUND_VISION":
    case "ROLE_SIGHT":
    case "SCOUT_DETECTION_RADIUS":
    case "ROAD_MOVEMENT":
      return "MOVEMENT_SIGHT";
    case "MARKET_CAPITAL_ROAD_BONUS":
    case "FRIENDLY_CITY_FORTIFICATION":
    case "OWNED_CITY_CAPACITY_BONUS":
    case "MEDIC_HEAL":
    case "FRIENDLY_IDLE_RECOVERY":
    case "FIRST_HOSTILE_CAPTURE_SPOILS":
      return "PASSIVE_EFFECTS";
  }
}

export interface RecruitmentRolePresentationV7 {
  readonly label: string;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly abilities: readonly string[];
  readonly restrictions: readonly string[];
}

/** Canonical base-role information only; it deliberately has no live-unit state. */
export function recruitmentRolePresentationV7(
  roleId: UnitRoleIdV7,
): RecruitmentRolePresentationV7 {
  const role = effectiveRoleRuleV7(roleId);
  const restrictions: string[] = [];
  if (!role.mayUsePrimaryActionAfterMove)
    restrictions.push("Cannot use its primary action after moving.");
  if (!role.abilities.includes("CAPTURE")) restrictions.push("Cannot Capture.");
  if (roleId === "CATAPULT" || roleId === "HORSE_ARCHER")
    restrictions.push("Never advances after a kill.");
  if (roleId === "MARKSMAN")
    restrictions.push("Does not advance after a ranged kill.");
  if (roleId === "SCOUT")
    restrictions.push(
      "Detects hostile Saboteurs within range 2. Fieldcraft removes Forest movement termination.",
    );
  if (roleId === "MARKSMAN")
    restrictions.push(
      "Fieldcraft raises Sight to 2 and removes Forest movement termination.",
    );
  if (roleId === "SABOTEUR")
    restrictions.push(
      "May Pillage without Explosives for 1 Coin; doing so is terminal and exposes the Saboteur to the affected owner and allies through that owner's next accepted End Turn.",
    );
  return {
    label: role.label,
    stats: [
      { label: "Max HP", value: String(role.maxHp) },
      { label: "Attack", value: formatHalfUnits(role.attack2) },
      { label: "Defense", value: formatHalfUnits(role.defense2) },
      { label: "Move", value: String(role.move) },
      {
        label: "Range",
        value:
          role.minimumRange === role.range
            ? String(role.range)
            : `${role.minimumRange}–${role.range}`,
      },
      { label: "Sight", value: String(role.sightRadius) },
    ],
    abilities: role.abilities.map(
      (ability) =>
        `${title(ability)}: ${abilityDescription(ability, role.minimumRange, role.range)}`,
    ),
    restrictions,
  };
}

function formatHalfUnits(value2: number): string {
  return String(value2 / 2);
}

function abilityDescription(
  ability: string,
  minimum: number,
  maximum: number,
): string {
  switch (ability) {
    case "ATTACK":
      return minimum > 1
        ? `Attack from range ${minimum}–${maximum}. This role cannot attack nearer than ${minimum} and cannot move and fire.`
        : `Attack an offered hostile target at range ${minimum}–${maximum}.`;
    case "CAPTURE":
      return "Remain on a neutral village or hostile city until your next Start Turn, then Capture when offered.";
    case "CHARGE":
      return "An ordinary move of at least two cells adds 1 Attack for this activation.";
    case "HEAL_ADJACENT":
      return "Heal an adjacent damaged friendly unit by the current Medicine or Recovery amount.";
    case "PUSH":
      return "A surviving adjacent defender is pushed one cell directly away when the public destination is legal.";
    case "BREACH":
      return "Adjacent attacks ignore the defender's terrain or city defense multiplier.";
    case "CONCEALMENT":
      return "Hidden from hostile viewers unless within range 1 of their unit or city, within range 2 of their Scout, or still exposed. The owner marker denotes the ability, not guaranteed invisibility.";
    case "BLACKOUT":
      return "Plant Blackout in an adjacent hostile city when offered. It suppresses up to 3 Coins and blocks Train and development for the affected turn. City-only detection reveals but does not block it; hostile-unit detection blocks it. The unit becomes eligible again at action round +3, while city recovery requires one complete unaffected owner turn.";
    case "DASH":
      return "May take its ordinary Move before its first Attack.";
    case "TWO_SHOTS":
      return "Up to 2 total attacks in this activation. Move only before firing. After the first shot, this unit cannot move or use another self action; other units and End Turn remain available. It cannot Capture and never advances.";
    default:
      return `${title(ability)} ability.`;
  }
}
export function economicFormulaV7(
  improvement: string,
  formula: string,
): string {
  if (improvement === "WINDMILL" && formula === "CONNECTED_ORTHOGONAL_CLUSTER")
    return "Windmill: +1 population per Farm in its touching orthogonal same-city cluster, cap 8; unsupported produces 0";
  if (improvement === "SAWMILL" && formula === "CONNECTED_ORTHOGONAL_CLUSTER")
    return "Sawmill: +1 population per Lumber Camp in its touching orthogonal same-city cluster, cap 8";
  if (improvement === "FORGE" && formula === "ADJACENT_MINES")
    return "Forge: +1 population per adjacent same-city Mine, maximum 6; placement requires at least one Mine and an unsupported Forge produces 0";
  if (improvement === "WORKSHOP" && formula === "DISTINCT_BASIC_TYPES")
    return "Workshop: 0 with no adjacent Farm, Camp, or Mine; otherwise +1 plus the number of distinct adjacent types, cap 4 population";
  if (improvement === "GRAND_WORKS" && formula === "DISTINCT_PROCESSOR_TYPES")
    return "Grand Works: 0 below two adjacent positive-output processor types; otherwise +4 plus +2 per qualifying type, cap 10 population";
  return "Market: +1 recurring Coin per adjacent Agriculture, Timber, or Metal family, including inactive processors, plus +1 for an adjacent capital-connected friendly Road; cap 4";
}
export function monumentSourceForViewerV7(
  view: PlayerViewV7,
  at: CoordV7,
): "ENGINEER" | "MUSTER" | null {
  const contribution = view.populationContributions.find(
    (candidate) =>
      candidate.source.kind === "MONUMENT" && same(candidate.source.at, at),
  );
  return contribution?.source.kind === "MONUMENT" &&
    contribution.source.visibility === "FULL"
    ? contribution.source.achievement
    : null;
}
function hostile(view: PlayerViewV7, left: number, right: number): boolean {
  if (left === right) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    left === view.humanPlayerId ||
    right === view.humanPlayerId
  );
}
export function specialBoundaryNoticeV7(
  events: Ruleset7AcceptedBoundary["playerEvents"]["events"],
  viewerId: number,
): string | null {
  const treasury = events.find(
    (event) =>
      event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED" &&
      event.playerId === viewerId,
  );
  if (treasury?.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED")
    return `Treasury automatically granted · +${treasury.coins} Coins.`;
  const achievement = events.find(
    (event) =>
      event.kind === "ACHIEVEMENT_UNLOCKED" && event.playerId === viewerId,
  );
  return achievement?.kind === "ACHIEVEMENT_UNLOCKED"
    ? `${title(achievement.achievement)} achievement unlocked.`
    : null;
}
function rewardLabel(reward: string, level: number): string {
  if (reward === "TREASURY") return "Treasury · +12 Coins";
  if (reward === "JUGGERNAUT") return "Juggernaut · reward unit";
  if (reward === "STOCKPILE") return "Stockpile · +4 Coins";
  if (reward === "BOOM") return "Boom · +3 permanent population";
  return `${title(reward)} · level ${level} reward`;
}
function commandLabel(command: CommandV7): string {
  if (command.kind === "TRAIN") return effectiveRoleRuleV7(command.role).label;
  if (command.kind === "BUILD_MINE") return "Build Mine";
  if (command.kind === "BUILD_FORGE") return "Build Forge";
  return title(command.kind);
}
function economicPreviewLabelV7(preview: EconomicPreviewV7): string {
  const population = preview.populationDeltaByCity.reduce(
    (total, change) => total + change.delta,
    0,
  );
  const income = preview.coinIncomeDeltaByCity.reduce(
    (total, change) => total + change.delta,
    0,
  );
  const details = [
    `${preview.cost} Coins`,
    population === 0
      ? null
      : `population ${population > 0 ? "+" : ""}${population}`,
    income === 0 ? null : `income ${income > 0 ? "+" : ""}${income}`,
  ].filter((detail): detail is string => detail !== null);
  return details.join(" · ");
}
function formatValue(value: {
  numerator: number;
  denominator: number;
}): string {
  return value.denominator === 1
    ? String(value.numerator)
    : String(value.numerator / value.denominator);
}
function same(a: CoordV7, b: CoordV7): boolean {
  return a.x === b.x && a.y === b.y;
}
function title(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}
const V7_UI_VISIBLE_ALPHA_BOUNDS: Readonly<
  Record<
    string,
    {
      readonly left: number;
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
    }
  >
> = {
  "terrain-square-original-animal": {
    left: 68,
    top: 220,
    right: 188,
    bottom: 324,
  },
  "terrain-square-fertile-ground": {
    left: 59,
    top: 250,
    right: 196,
    bottom: 324,
  },
};
function value(root: HTMLElement, id: string): string {
  return (
    root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ??
    ""
  );
}
function el(
  documentRoot: Document,
  tag: string,
  className: string,
): HTMLElement {
  const node = documentRoot.createElement(tag);
  node.className = className;
  return node;
}
function text(
  documentRoot: Document,
  tag: string,
  valueText: string,
  className = "",
): HTMLElement {
  const node = el(documentRoot, tag, className);
  node.textContent = valueText;
  return node;
}
function button(
  documentRoot: Document,
  label: string,
  action: string,
  className = "",
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  node.textContent = label;
  node.dataset.action = action;
  node.className = className;
  return node;
}
function live(
  documentRoot: Document,
  id: string,
  content: string,
  priority: "polite" | "assertive",
): HTMLElement {
  const node = text(documentRoot, "p", content, "v7-live");
  node.id = id;
  node.setAttribute("aria-live", priority);
  return node;
}
function select(
  documentRoot: Document,
  labelText: string,
  id: string,
  values: readonly string[],
  selected: string,
): HTMLLabelElement {
  const label = documentRoot.createElement("label");
  label.textContent = labelText;
  const field = documentRoot.createElement("select");
  field.id = id;
  replaceOptions(documentRoot, field, values, selected);
  label.append(field);
  return label;
}
function replaceOptions(
  documentRoot: Document,
  field: HTMLSelectElement,
  values: readonly string[],
  selected: string,
): void {
  field.replaceChildren(
    ...values.map((entry) => {
      const option = documentRoot.createElement("option");
      option.value = entry;
      option.textContent = entry;
      option.selected = entry === selected;
      return option;
    }),
  );
}
function input(
  documentRoot: Document,
  labelText: string,
  id: string,
  initial: string,
): HTMLLabelElement {
  const label = documentRoot.createElement("label");
  label.textContent = labelText;
  const field = documentRoot.createElement("input");
  field.id = id;
  field.inputMode = "numeric";
  field.value = initial;
  label.append(field);
  return label;
}
