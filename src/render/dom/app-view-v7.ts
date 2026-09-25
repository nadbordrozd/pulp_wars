import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  RULESET7_IMPROVEMENT_ART_IDS,
  RULESET7_RESOURCE_ART_IDS,
  resourceMapArtIdV7,
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
  type MapTypeV7,
  type PlayerColorV7,
  type PlayerViewV7,
  type PublicTechnologyNodeV7,
  type TechnologyIdV7,
  type AchievementIdV7,
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
import type { TacticalSymbolTheme } from "../../assets/ruleset7-tactical-ui-symbols";
import {
  selectionIdentityArtworkLayoutV7,
  technologyArtworkLayoutV7,
} from "./selection-identity-v7";
import { uiIconV7, type UiIconIdV7 } from "./ui-icons-v7";

const BOARD_SIZES = [11, 14, 16, 20, 25] as const;
const COLORS: readonly PlayerColorV7[] = ["CORAL", "TEAL", "GOLD", "VIOLET"];
const MAP_TYPES: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
const AI_MODE_LABELS: Readonly<Record<string, string>> = {
  RIVAL: "Free-for-all",
  COOPERATIVE: "AIs allied",
};
const MAP_TYPE_LABELS: Readonly<Record<string, string>> = {
  DRY_LAND: "Dry land",
  PANGEA: "Pangea",
  CONTINENTS: "Continents",
  ARCHIPELAGO: "Archipelago",
  LAKES: "Lakes",
};
const BOARD_SIZE_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  BOARD_SIZES.map((size) => [String(size), `${size} × ${size}`]),
);
const COLOR_LABELS: Readonly<Record<string, string>> = {
  CORAL: "Coral",
  TEAL: "Teal",
  GOLD: "Gold",
  VIOLET: "Violet",
};
const NON_BUTTON_COMMANDS = new Set<CommandV7["kind"]>([
  "MOVE",
  "ATTACK",
  "DISEMBARK",
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
  readonly mapType: MapTypeV7;
}

type ScreenV7 =
  "MATCH" | "TECH" | "LEADERBOARD" | "ACHIEVEMENTS" | "SETTINGS" | "HELP";

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
    mapType: "CONTINENTS",
  };
  #selection: BoardSelectionV7 | null = null;
  #screen: ScreenV7 = "MATCH";
  #selectedTech: TechnologyIdV7 | null = null;
  #achievementNotices: AchievementIdV7[] = [];
  #achievementReturnAction: string | null = null;
  #selectedModifier: string | null = null;
  #selectedRecruitHelp: UnitRoleIdV7 | null = null;
  #selectedUnitHelpId: number | null = null;
  #unitHelpModal: HTMLElement | null = null;
  #cityActionScrollLeft: number | null = null;
  #clearCityActionScrollAfterRestore = false;
  #modalReturnAction: string | null = null;
  #compactMenuOpen = false;
  #notice = "";
  #error = "";
  #toast: {
    readonly id: number;
    readonly text: string;
    readonly kind: "info" | "error";
  } | null = null;
  #toastSequence = 0;
  #replacing = false;
  #matchInstance = 0;
  #presentationActive = false;
  #presentationQueue: {
    readonly matchInstance: number;
    readonly boundary: Ruleset7AcceptedBoundary;
  }[] = [];
  #presentationTail: Promise<void> = Promise.resolve();
  #humanDispatchPending = false;
  #humanDispatchSettling = false;
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
      if (this.#humanDispatchPending) return;
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
        if (modal.dataset.v7Region === "achievement-notice") {
          event.preventDefault();
          this.#dismissAchievementNotice();
        } else if (this.#selectedRecruitHelp !== null) {
          event.preventDefault();
          this.#closeRecruitHelp();
        } else if (this.#selectedUnitHelpId !== null) {
          event.preventDefault();
          this.#closeUnitHelp();
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
      if (this.#screen !== "MATCH") this.#screen = "MATCH";
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
    header.append(text(this.#document, "h1", "Pulp Wars"));
    return header;
  }

  #setup(replace: boolean): HTMLElement {
    const main = el(this.#document, "main", "v7-front-screen");
    main.dataset.v7Setup = "true";
    main.append(this.#brand());
    const form = el(this.#document, "form", "v7-setup-form");
    form.append(
      select(
        this.#document,
        "Opponents",
        "v7-ai-count",
        ["1", "2", "3"],
        String(this.#draft.aiCount),
      ),
      select(
        this.#document,
        "Mode",
        "v7-ai-mode",
        ["RIVAL", "COOPERATIVE"],
        this.#draft.aiMode,
        AI_MODE_LABELS,
      ),
      select(
        this.#document,
        "Size",
        "v7-board-size",
        compatibleSizes(this.#draft.aiCount).map(String),
        String(this.#draft.boardSize),
        BOARD_SIZE_LABELS,
      ),
      select(
        this.#document,
        "Map",
        "v7-map-type",
        MAP_TYPES,
        this.#draft.mapType,
        MAP_TYPE_LABELS,
      ),
      select(
        this.#document,
        "Color",
        "v7-color",
        COLORS,
        this.#draft.humanColor,
        COLOR_LABELS,
      ),
      input(this.#document, "Seed", "v7-seed", this.#draft.seedText),
      text(
        this.#document,
        "p",
        mapTypeDescriptionV7(this.#draft.mapType),
        "v7-map-type-description",
      ),
    );
    const launch = button(
      this.#document,
      replace ? "Start new game" : "Play",
      "launch",
      "primary-action v7-launch",
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
          BOARD_SIZE_LABELS,
        );
      const description = form.querySelector<HTMLElement>(
        ".v7-map-type-description",
      );
      if (description !== null)
        description.textContent = mapTypeDescriptionV7(this.#draft.mapType);
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#readDraft(form);
      const setup = setupFrom(this.#draft);
      if (setup === null) {
        this.#error = "Seed must be a whole number (0–4294967295).";
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
      text(this.#document, "h2", "Continue"),
      text(
        this.#document,
        "p",
        view === null
          ? "A saved game is waiting."
          : `Turn ${view.round} · ${view.viewer.coins} coins · ${MAP_TYPE_LABELS[view.setup.mapType] ?? title(view.setup.mapType)}`,
        "v7-resume-summary",
      ),
    );
    const actions = el(this.#document, "div", "button-row");
    const resume = button(this.#document, "Resume", "resume", "primary-action");
    resume.onclick = () => void this.#resumeMatch();
    const replace = button(this.#document, "New game", "show-replace");
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
      text(this.#document, "h2", "Save can't be loaded"),
      text(
        this.#document,
        "p",
        "This saved game can't be opened by this version.",
        "v7-recovery-summary",
      ),
    );
    const diagnostic = this.#snapshot.recovery?.diagnostic;
    if (diagnostic !== undefined) {
      const details = this.#document.createElement("details");
      details.className = "v7-recovery-details";
      details.append(
        text(this.#document, "summary", "Details"),
        text(this.#document, "p", diagnostic),
      );
      main.append(details);
    }
    const remove = button(
      this.#document,
      "Delete save",
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
    link.textContent = "Classic rules (Ruleset 6)";
    return link;
  }

  #renderStableMatch(view: PlayerViewV7): void {
    const showAchievementNotice =
      (this.#snapshot.phase === "ACTIVE" ||
        this.#snapshot.phase === "COMPLETE") &&
      view.pendingChoices.length === 0 &&
      this.#achievementNotices.length > 0;
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
          this.#selectedUnitHelpId = null;
          this.#cityActionScrollLeft = null;
          this.#clearCityActionScrollAfterRestore = false;
          this.#selectedModifier = null;
          this.#render();
        },
        onCommand: (target) => void this.#handleMapCommand(target),
      });
    }
    const liveNode = shell.querySelector<HTMLElement>("#v7-live");
    const alertNode = shell.querySelector<HTMLElement>("#v7-alert");
    if (liveNode !== null && liveNode.textContent !== this.#notice) {
      liveNode.replaceChildren();
      appendEconomyText(this.#document, liveNode, this.#notice);
    }
    if (alertNode !== null) alertNode.textContent = this.#error;
    const nextChildren: HTMLElement[] = [];
    this.#unitHelpModal = null;
    if (view.pendingChoices.length > 0) {
      this.#selectedRecruitHelp = null;
      this.#selectedUnitHelpId = null;
      this.#cityActionScrollLeft = null;
      this.#clearCityActionScrollAfterRestore = false;
    }
    const activeId = view.turnOrder[view.activeSeatIndex];
    const active = view.players.find((player) => player.id === activeId);
    const humanTurn = active?.controller === "HUMAN";
    const hud = el(this.#document, "header", "v7-match-hud");
    hud.dataset.v7Region = "hud";
    const projectedIncome = view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .reduce(
        (sum, city) => sum + (cityIncomeForViewerV7(view, city.id) ?? 0),
        0,
      );
    const stats = el(this.#document, "div", "v7-hud-stats");
    const economy = el(this.#document, "p", "v7-coins");
    const rate = el(this.#document, "span", "v7-income-rate");
    rate.textContent = `${projectedIncome >= 0 ? "+" : ""}${projectedIncome}`;
    rate.setAttribute(
      "aria-label",
      `Projected next-turn income ${projectedIncome} Coins`,
    );
    economy.append(
      economyIcon(this.#document, "coin"),
      text(
        this.#document,
        "span",
        String(view.viewer.coins),
        "v7-coin-balance",
      ),
      rate,
    );
    economy.setAttribute(
      "aria-label",
      `${view.viewer.coins} Coins. ${incomeDescription(view)}`,
    );
    economy.title = `Coins (+${projectedIncome} next turn)`;
    const round = text(
      this.#document,
      "p",
      `Turn ${view.round}`,
      "v7-hud-round",
    );
    const status = text(
      this.#document,
      "p",
      this.#snapshot.phase === "COMPLETE"
        ? "Game over"
        : humanTurn
          ? "Your turn"
          : `${playerName(active?.seat ?? 0)} is playing…`,
      "v7-turn-status",
    );
    status.dataset.v7AiProgress = "true";
    status.dataset.turn =
      this.#snapshot.phase === "COMPLETE"
        ? "done"
        : humanTurn
          ? "human"
          : "other";
    stats.append(economy, round, status);
    const nav = el(this.#document, "nav", "v7-hud-nav");
    nav.setAttribute("aria-label", "Game");
    nav.dataset.compactMenu = this.#compactMenuOpen ? "open" : "closed";
    const blocked = view.pendingChoices.length > 0;
    const tech = iconButton(this.#document, "tech", "Tech", "tech", true);
    tech.classList.add("v7-hud-tech");
    tech.onclick = () => {
      this.#compactMenuOpen = false;
      this.#open("TECH", "tech");
    };
    tech.disabled = blocked;
    const compactMenu = iconButton(
      this.#document,
      "menu",
      "Menu",
      "compact-menu",
    );
    compactMenu.classList.add("v7-compact-menu-toggle");
    compactMenu.setAttribute("aria-expanded", String(this.#compactMenuOpen));
    compactMenu.setAttribute("aria-controls", "v7-hud-menu");
    compactMenu.onclick = () => {
      this.#compactMenuOpen = !this.#compactMenuOpen;
      this.#pendingFocusAction = "compact-menu";
      this.#render();
    };
    nav.append(tech, compactMenu);
    if (this.#compactMenuOpen) {
      const menu = el(this.#document, "div", "v7-hud-menu");
      menu.id = "v7-hud-menu";
      for (const [label, screen, action] of [
        ["Leaderboard", "LEADERBOARD", "leaderboard"],
        ["Achievements", "ACHIEVEMENTS", "achievements"],
        ["Help", "HELP", "help"],
        ["Settings", "SETTINGS", "settings"],
      ] as const) {
        const item = button(this.#document, label, action, "v7-menu-item");
        item.onclick = () => {
          this.#compactMenuOpen = false;
          this.#open(screen, "compact-menu");
        };
        item.disabled = blocked;
        menu.append(item);
      }
      if (this.#snapshot.phase === "ACTIVE") {
        const mainMenu = button(
          this.#document,
          "Save & quit",
          "main-menu",
          "v7-menu-item v7-main-menu-action",
        );
        mainMenu.onclick = () => void this.#returnToMenu();
        menu.append(mainMenu);
      }
      nav.append(menu);
    }
    hud.append(stats, nav);
    const endTurn = this.#snapshot.offeredCommands.find(
      (candidate) => candidate.kind === "END_TURN",
    );
    if (endTurn !== undefined) {
      const end = button(
        this.#document,
        "End turn",
        "end-turn",
        "v7-hud-end-turn",
      );
      end.onclick = () => void this.#dispatch(endTurn);
      end.disabled = this.#localBusy() || blocked;
      nav.append(end);
    }
    nextChildren.push(hud);
    const zoom = el(this.#document, "div", "v7-zoom-controls");
    zoom.dataset.v7Region = "zoom";
    const zoomIn = iconButton(this.#document, "zoom-in", "Zoom in", "zoom-in");
    zoomIn.onclick = () => this.#boardHost.zoom("IN");
    const zoomOut = iconButton(
      this.#document,
      "zoom-out",
      "Zoom out",
      "zoom-out",
    );
    zoomOut.onclick = () => this.#boardHost.zoom("OUT");
    zoom.append(zoomIn, zoomOut);
    nextChildren.push(zoom);
    const toastMessage =
      this.#error !== ""
        ? { id: -1, text: this.#error, kind: "error" as const }
        : this.#toast;
    if (toastMessage !== null) {
      const toast = text(
        this.#document,
        "p",
        toastMessage.text,
        toastMessage.kind === "error" ? "v7-toast v7-toast-error" : "v7-toast",
      );
      toast.dataset.v7Region = "toast";
      toast.dataset.toastId = String(toastMessage.id);
      nextChildren.push(toast);
    }
    const dock =
      this.#selection === null ? null : this.#dock(view, this.#selection);
    if (dock !== null) {
      dock.dataset.v7Region = "dock";
      nextChildren.push(dock);
    }
    if (
      this.#unitHelpModal !== null &&
      !showAchievementNotice &&
      view.pendingChoices.length === 0
    )
      nextChildren.push(this.#unitHelpModal);
    if (this.#snapshot.ai.active) {
      const fast = iconButton(
        this.#document,
        "skip",
        "Skip",
        "fast-forward",
        true,
      );
      fast.classList.add("v7-fast-forward");
      fast.setAttribute("aria-label", "Fast forward opponent turns");
      if (this.#snapshot.ai.fastForward) fast.classList.add("is-active");
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
      view.pendingChoices.length === 0 &&
      !showAchievementNotice
    )
      nextChildren.push(this.#overlay(view));
    if (
      this.#snapshot.phase === "ACTIVE" &&
      this.#screen === "MATCH" &&
      this.#selectedRecruitHelp !== null &&
      view.pendingChoices.length === 0 &&
      !showAchievementNotice
    )
      nextChildren.push(this.#recruitHelp(this.#selectedRecruitHelp));
    if (view.pendingChoices[0] !== undefined)
      nextChildren.push(this.#reward(view));
    else if (showAchievementNotice)
      nextChildren.push(this.#achievementNotice());
    if (this.#snapshot.phase === "COMPLETE" && !showAchievementNotice)
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
    this.#boardHost.update(this.#boardModel(view));
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

  #boardModel(view: PlayerViewV7): Parameters<BoardHostV7["update"]>[0] {
    const activeId = view.turnOrder[view.activeSeatIndex];
    return {
      matchInstanceId: this.#matchInstance,
      view,
      offeredCommands: this.#snapshot.offeredCommands,
      interactive:
        this.#screen === "MATCH" &&
        activeId === view.humanPlayerId &&
        !this.#snapshot.transitioning &&
        !this.#presentationActive &&
        this.#achievementNotices.length === 0 &&
        view.pendingChoices.length === 0,
      motion: this.#motion,
      animationSpeed: this.#animationSpeed,
      presentationPaused: this.#screen === "SETTINGS",
      highContrast: this.#highContrast,
      interaction: {
        selection: this.#selection,
        selectedUnitId:
          this.#selection?.kind === "UNIT" ? this.#selection.unitId : null,
        selectedAchievement: null,
      },
    };
  }

  #dock(view: PlayerViewV7, selection: BoardSelectionV7): HTMLElement | null {
    const dock = el(this.#document, "section", "v7-selection-dock");
    dock.dataset.selectionKind = selection.kind.toLowerCase();
    dock.dataset.hasActions = "false";
    dock.setAttribute("aria-label", "Selected map object");
    const close = iconButton(this.#document, "close", "Close", "close-dock");
    close.classList.add("close-button");
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
      const roleRule = effectiveRoleRuleV7(unit.role);
      const roleLabel = roleRule.label;
      dock.append(
        identity(
          this.#document,
          unit.form === "EMBARKED"
            ? "unit-shared-embarked-transport"
            : RULESET7_UNIT_ART_IDS[unit.role],
          unit.form === "EMBARKED" ? `${roleLabel} (at sea)` : roleLabel,
          true,
        ),
      );
      if (unit.ownerId !== view.viewer.id) {
        const owner = view.players.find((player) => player.id === unit.ownerId);
        if (owner !== undefined)
          dock
            .querySelector(".v7-identity")
            ?.append(
              text(
                this.#document,
                "span",
                playerName(owner.seat),
                "v7-identity-owner",
              ),
            );
      }
      const identityColumn = dock.querySelector<HTMLElement>(".v7-identity");
      identityColumn?.append(
        text(
          this.#document,
          "span",
          title(roleRule.tacticalRole),
          "v7-tactical-role",
        ),
      );
      const unitHelp = button(this.#document, "", "unit-help", "v7-unit-help");
      unitHelp.append(text(this.#document, "span", "?", "v7-unit-help-glyph"));
      unitHelp.setAttribute("aria-label", `About ${roleLabel}`);
      unitHelp.title = `About ${roleLabel}`;
      unitHelp.onclick = () => {
        this.#selectedUnitHelpId = unit.id;
        this.#pendingFocusAction = null;
        this.#render();
      };
      identityColumn?.append(unitHelp);
      const unitDetails = el(this.#document, "div", "v7-unit-help-details");
      if (unit.form === "EMBARKED")
        unitDetails.append(
          text(
            this.#document,
            "p",
            effectiveRoleRuleV7(unit.role).abilities.includes("CAPTURE")
              ? "Carrying troops. Pick a highlighted shore tile to land."
              : "Carrying troops that can't capture. Pick a highlighted shore tile to land.",
            "v7-transport-passenger",
          ),
        );
      if (unit.role === "KNIGHT" && unit.activation.overrunActive) {
        const state = el(this.#document, "section", "v7-tactical-state");
        state.dataset.tacticalState = "overrun";
        state.append(text(this.#document, "strong", "Overrun: attack again"));
        unitDetails.append(state);
      }
      const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
      if (stats !== undefined) {
        if (stats.statuses.length > 0) {
          const cues = el(this.#document, "div", "v7-unit-status-cues");
          const statuses = el(this.#document, "div", "v7-unit-statuses");
          for (const status of stats.statuses) {
            const short = status.startsWith("Tended")
              ? "Tended"
              : (status.split(":", 1)[0] ?? status);
            const statusId = short.toLowerCase().replaceAll(" ", "-");
            const cue = text(this.#document, "span", short, "v7-chip");
            cue.dataset.unitStatus = statusId;
            cue.setAttribute("aria-label", `${short} status`);
            cues.append(cue);
            const chip = text(this.#document, "span", status, "v7-chip");
            chip.dataset.unitStatus = statusId;
            statuses.append(chip);
          }
          identityColumn?.append(cues);
          unitDetails.append(statuses);
        }
        const rows = el(this.#document, "dl", "v7-unit-stats");
        for (const stat of stats.stats) {
          const exact = stat.visibility !== "BASE_ONLY";
          const value = el(this.#document, "dd", "v7-stat-value");
          value.append(
            text(
              this.#document,
              "span",
              stat.id === "HP"
                ? `${unit.hp}/${unit.maxHp}`
                : stat.id === "RANGE" &&
                    stats.minimumRange !== stats.maximumRange
                  ? `${stats.minimumRange}–${stats.maximumRange}`
                  : formatValue(stat.base.value),
            ),
          );
          for (const [index, modifier] of (exact
            ? stat.modifiers
            : []
          ).entries()) {
            const modifierId = `${unit.id}-${stat.id}-${index}`;
            const term = button(
              this.#document,
              `+${formatValue(modifier.value)}`,
              `stat-${stat.id.toLowerCase()}-${index}`,
              "v7-stat-modifier",
            );
            term.setAttribute(
              "aria-label",
              `${modifier.sourceLabel}: ${modifier.description}`,
            );
            term.dataset.tooltip = modifier.sourceLabel;
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
          }
          if (!exact)
            value.append(text(this.#document, "span", "+?", "v7-stat-unknown"));
          const term = el(this.#document, "dt", "v7-stat-term");
          term.title = stat.label;
          term.append(
            uiIconV7(this.#document, STAT_ICONS[stat.id] ?? "info"),
            text(this.#document, "span", stat.label, "v7-sr-only"),
          );
          const row = el(this.#document, "div", "v7-stat");
          row.dataset.stat = stat.id.toLowerCase();
          row.title = stat.label;
          row.append(term, value);
          rows.append(row);
        }
        dock.append(rows);
        const abilities = el(this.#document, "div", "v7-abilities");
        for (const ability of stats.abilities) {
          const description = abilityDescription(
            ability,
            stats.minimumRange,
            stats.maximumRange,
          );
          if (description === null) continue;
          const entry = el(this.#document, "p", "v7-unit-ability");
          entry.append(
            text(this.#document, "strong", abilityName(ability)),
            text(this.#document, "span", description),
          );
          abilities.append(entry);
        }
        if (abilities.childElementCount > 0) unitDetails.append(abilities);
      }
      if (unit.activation.handled && unit.ownerId === view.viewer.id)
        dock.dataset.handled = "true";
      const actions = this.#commandButtons(
        (command) =>
          "unitId" in command &&
          command.unitId === unit.id &&
          !NON_BUTTON_COMMANDS.has(command.kind),
      );
      if (actions.querySelector("button") !== null) {
        dock.dataset.hasActions = "true";
        dock.append(actions);
      }
      if (this.#selectedUnitHelpId === unit.id) {
        const modal = el(this.#document, "section", "v7-unit-help-dialog");
        modal.setAttribute("role", "dialog");
        modal.setAttribute("aria-modal", "true");
        modal.setAttribute("aria-label", `${roleLabel} unit information`);
        modal.dataset.v7Region = "unit-help";
        const closeHelp = iconButton(
          this.#document,
          "close",
          "Close",
          "close-unit-help",
        );
        closeHelp.classList.add("close-button");
        closeHelp.onclick = () => this.#closeUnitHelp();
        const header = el(this.#document, "div", "v7-dialog-header");
        header.append(
          art(
            this.#document,
            unit.form === "EMBARKED"
              ? "unit-shared-embarked-transport"
              : RULESET7_UNIT_ART_IDS[unit.role],
            "",
          ),
          text(this.#document, "h2", roleLabel),
        );
        const statCopy = dock.querySelector(".v7-unit-stats")?.cloneNode(true);
        modal.append(closeHelp, header);
        if (statCopy instanceof HTMLElement) {
          for (const node of statCopy.querySelectorAll("button"))
            node.replaceWith(text(this.#document, "span", node.textContent));
          modal.append(statCopy);
        }
        modal.append(unitDetails);
        this.#unitHelpModal = modal;
      }
    } else if (selection.kind === "CITY") {
      const city = view.cities.find(
        (candidate) => candidate.id === selection.cityId,
      );
      if (city === undefined) return null;
      const owned = city.ownerId === view.viewer.id;
      dock.append(
        identity(
          this.#document,
          `building-city-${Math.max(1, Math.min(3, city.level))}`,
          city.isCapital ? "Capital" : "City",
          true,
        ),
      );
      const owner = view.players.find((player) => player.id === city.ownerId);
      if (!owned && owner !== undefined)
        dock
          .querySelector(".v7-identity")
          ?.append(
            text(
              this.#document,
              "span",
              playerName(owner.seat),
              "v7-identity-owner",
            ),
          );
      const details = el(this.#document, "dl", "v7-city-stats");
      const besieged = view.units.some(
        (unit) =>
          hostile(view, city.ownerId, unit.ownerId) && same(unit.at, city.at),
      );
      const level = el(this.#document, "div", "v7-city-stat");
      level.dataset.stat = "level";
      level.append(
        text(this.#document, "dt", "Level"),
        text(this.#document, "dd", String(city.level)),
      );
      const growth = el(this.#document, "div", "v7-city-stat");
      growth.dataset.stat = "population";
      growth.title = "Population until the next level";
      const growthValue = el(this.#document, "dd", "v7-population-value");
      growthValue.append(
        economyIcon(this.#document, "population"),
        populationMeter(this.#document, city.population, city.level + 1),
        text(
          this.#document,
          "span",
          `${city.population}/${city.level + 1}`,
          "v7-population-count",
        ),
      );
      growth.append(text(this.#document, "dt", "Population"), growthValue);
      details.append(level, growth);
      if (owned) {
        const assigned = view.units.filter(
          (unit) =>
            unit.ownerId === view.viewer.id && unit.homeCityId === city.id,
        ).length;
        const capacity =
          city.level +
          1 +
          (view.viewer.researchedTechs.includes("PLANNING") ? 1 : 0);
        const units = el(this.#document, "div", "v7-city-stat");
        units.dataset.stat = "units";
        units.title = "Units supported by this city";
        const unitsValue = el(this.#document, "dd", "v7-city-units");
        unitsValue.append(
          uiIconV7(this.#document, "units"),
          `${assigned}/${capacity}`,
        );
        units.append(text(this.#document, "dt", "Units"), unitsValue);
        const income = el(this.#document, "div", "v7-city-stat");
        income.dataset.stat = "income";
        income.title = "Coins per turn";
        const incomeValue = el(this.#document, "dd", "v7-city-income");
        incomeValue.append(
          economyIcon(this.#document, "coin"),
          `+${cityIncomeForViewerV7(view, city.id) ?? 0}`,
        );
        income.append(text(this.#document, "dt", "Income"), incomeValue);
        const cityAction = el(this.#document, "div", "v7-city-stat");
        cityAction.dataset.stat = "city-action";
        cityAction.title =
          "One shared city action covers land training, naval training, or Land Grant and resets at Start Turn";
        cityAction.append(
          text(this.#document, "dt", "City action"),
          text(
            this.#document,
            "dd",
            city.cityActionAvailable === true
              ? "Ready"
              : "Spent · resets next turn",
          ),
        );
        details.append(units, income, cityAction);
        for (const [kind, active] of [
          ["land", view.naval.landTradeCityIds.includes(city.id)],
          ["sea", view.naval.seaTradeCityIds.includes(city.id)],
        ] as const)
          if (active) {
            const trade = el(this.#document, "div", "v7-city-stat");
            trade.dataset.stat = `${kind}-trade`;
            trade.title = `${title(kind)} trade income`;
            const value = el(this.#document, "dd", "v7-city-income");
            value.append(economyIcon(this.#document, "coin"), "+1");
            trade.append(
              text(this.#document, "dt", `${title(kind)} trade`),
              value,
            );
            details.append(trade);
          }
        if (
          view.improvementValues.some(
            (value) =>
              value.improvement === "FORGE" &&
              value.level > 0 &&
              tileCity(view, value.at) === city.id,
          )
        ) {
          const discount = text(
            this.#document,
            "p",
            "Land units −1",
            "v7-chip",
          );
          discount.dataset.discount = "forge";
          discount.title =
            "Active Forge discounts land-unit training by 1 Coin";
          details.append(discount);
        }
      }
      if (besieged) {
        const siege = el(this.#document, "div", "v7-city-stat is-warning");
        siege.dataset.stat = "siege";
        siege.append(
          text(this.#document, "dt", "Status"),
          text(this.#document, "dd", "Besieged"),
        );
        details.append(siege);
      }
      dock.append(details);
      if (owned) {
        this.#appendCommandArea(
          dock,
          (command) =>
            (command.kind === "TRAIN" || command.kind === "LAND_GRANT") &&
            command.cityId === city.id,
        );
      }
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
              ? resourceMapArtIdV7(tile.resource, tile.at)
              : RULESET7_TERRAIN_ART_IDS[tile.terrain]
            : RULESET7_IMPROVEMENT_ART_IDS[tile.improvement];
        const name = title(
          tile.improvement ??
            (tile.resource !== "UNKNOWN_RESOURCE" ? tile.resource : null) ??
            (tile.road ? "ROAD" : tile.terrain),
        );
        const summary = el(this.#document, "div", "v7-selection-summary");
        summary.append(identity(this.#document, asset, name, true));
        const details = el(this.#document, "div", "v7-selection-details");
        if (tile.road && name !== "Road")
          details.append(text(this.#document, "p", "Road", "v7-chip"));
        if (
          tile.improvement !== null &&
          tile.resource !== null &&
          tile.resource !== "UNKNOWN_RESOURCE"
        ) {
          const resource = text(
            this.#document,
            "p",
            title(tile.resource),
            "v7-chip",
          );
          resource.dataset.underlyingResource = tile.resource.toLowerCase();
          details.append(resource);
        }
        const value = view.improvementValues.find((entry) =>
          same(entry.at, tile.at),
        );
        if (value !== undefined) {
          const chip = el(
            this.#document,
            "p",
            value.level === 0 ? "v7-chip is-idle" : "v7-chip",
          );
          chip.title =
            value.measure === "COIN_INCOME" ? "Coins per turn" : "Population";
          chip.append(
            economyIcon(
              this.#document,
              value.measure === "COIN_INCOME" ? "coin" : "population",
            ),
            `+${value.level}`,
          );
          chip.setAttribute(
            "aria-label",
            `${value.measure === "COIN_INCOME" ? "Income" : "Population"} +${value.level}${value.level === 0 ? ", idle" : ""}`,
          );
          details.append(chip);
        }
        if (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") {
          const port = view.naval.ownedPorts.find((candidate) =>
            same(candidate.at, tile.at),
          );
          if (port !== undefined) {
            details.append(
              text(
                this.#document,
                "p",
                port.status === "ACTIVE" ? "Active" : "Blockaded",
                `v7-chip v7-port-state state-${port.status.toLowerCase()}`,
              ),
            );
            if (view.naval.seaTradeCityIds.includes(port.cityId)) {
              const trade = el(this.#document, "p", "v7-chip");
              trade.title = "Sea trade";
              trade.append(economyIcon(this.#document, "coin"), "+1 trade");
              details.append(trade);
            }
          }
          if (tile.improvement === "SHIPYARD" && port?.status === "ACTIVE") {
            const discount = text(this.#document, "p", "Ships −2", "v7-chip");
            discount.dataset.discount = "shipyard";
            discount.title =
              "This Shipyard discounts naval-unit training here by 2 Coins";
            details.append(discount);
          }
          const portCity =
            port === undefined
              ? undefined
              : view.cities.find((city) => city.id === port.cityId);
          if (
            portCity?.ownerId === view.viewer.id &&
            portCity.cityActionAvailable === false
          ) {
            const spent = text(
              this.#document,
              "p",
              "City action spent · resets next turn",
              "v7-chip is-warning",
            );
            spent.dataset.disabledReason = "city-action-spent";
            spent.title =
              "Land training, naval training, and Land Grant share one city action";
            details.append(spent);
          }
        }
        const monumentSource = monumentSourceForViewerV7(view, tile.at);
        if (monumentSource !== null) {
          const source = el(this.#document, "p", "v7-monument-source v7-chip");
          source.append(
            createTacticalSymbolV7(
              this.#document,
              "ui-status-achievement-source-current-owner",
              this.#highContrast ? "HIGH_CONTRAST" : "DARK",
            ),
            text(this.#document, "span", `${title(monumentSource)} monument`),
          );
          details.append(source);
        }
        if (details.childElementCount > 0) summary.append(details);
        dock.append(summary);
        this.#appendCommandArea(
          dock,
          (command) => "at" in command && same(command.at, tile.at),
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
    for (const command of this.#snapshot.offeredCommands.filter(
      (candidate) =>
        predicate(candidate) && !NON_BUTTON_COMMANDS.has(candidate.kind),
    )) {
      const action = button(
        this.#document,
        "",
        command.kind === "BUILD_MONUMENT"
          ? `command-build_monument-${command.achievement.toLowerCase()}`
          : `command-${command.kind.toLowerCase()}`,
        command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL"
          ? "v7-train-action"
          : "v7-context-action",
      );
      action.append(
        text(this.#document, "span", commandLabel(command), "v7-action-label"),
      );
      action.title = commandLabel(command);
      if (command.kind === "CULTIVATE_FOREST") {
        action.title =
          "Clear for farming · Removes Forest and creates Fertile Ground";
        action.setAttribute(
          "aria-description",
          "Removes Forest and creates Fertile Ground.",
        );
      }
      const artId = commandArtIdV7(command);
      if (artId !== null) action.prepend(art(this.#document, artId, ""));
      if (command.kind === "BUILD_FIELD_DEFENSE")
        action.prepend(
          createTacticalSymbolV7(
            this.#document,
            "ui-action-field-defense",
            this.#tacticalTheme(),
          ),
        );
      if (command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL") {
        const rule = effectiveRoleRuleV7(command.role);
        const view = this.#snapshot.view;
        const cost =
          view === null
            ? (rule.cost ?? 0)
            : trainingCostForViewV7(view, command);
        action.setAttribute(
          "aria-label",
          `Train ${rule.label} for ${cost} Coins`,
        );
        action.append(economyChips(this.#document, { cost }));
      } else if (command.kind === "BUILD_MONUMENT") {
        action.setAttribute(
          "aria-label",
          `${commandLabel(command)} · free · population +3`,
        );
        action.append(economyChips(this.#document, { population: 3 }));
      } else if (command.kind === "BUILD_FIELD_DEFENSE") {
        const view = this.#snapshot.view;
        const unit = view?.units.find((item) => item.id === command.unitId);
        const tile = view?.board.tiles.find(
          (item) => unit !== undefined && same(item.at, unit.at),
        );
        const resultingLevel =
          tile?.explored === true ? (tile.fortificationLevel ?? 0) + 1 : 1;
        action.setAttribute(
          "aria-label",
          `Build Field Defense for 3 Coins · fortification level ${resultingLevel}`,
        );
        action.append(economyChips(this.#document, { cost: 3 }));
      } else if (command.kind === "LAND_GRANT") {
        action.setAttribute("aria-label", "Land grant for 6 Coins");
        action.append(economyChips(this.#document, { cost: 6 }));
      } else {
        const view = this.#snapshot.view;
        const preview = view === null ? null : previewEconomicV7(view, command);
        if (preview?.ok) {
          action.setAttribute(
            "aria-label",
            `${commandLabel(command)} · ${economicPreviewLabelV7(preview.preview)}`,
          );
          action.append(
            economyChips(this.#document, {
              cost: preview.preview.cost,
              population: preview.preview.populationDeltaByCity.reduce(
                (total, change) => total + change.delta,
                0,
              ),
              income: preview.preview.coinIncomeDeltaByCity.reduce(
                (total, change) => total + change.delta,
                0,
              ),
            }),
          );
        }
      }
      action.disabled = this.#localBusy();
      action.onclick = () => void this.#dispatch(command);
      if (command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL") {
        const card = el(this.#document, "div", "v7-train-card");
        const help = button(
          this.#document,
          "",
          `train-help-${command.role.toLowerCase()}`,
          "v7-train-help",
        );
        help.append(text(this.#document, "span", "?", "v7-train-help-glyph"));
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
    return actions;
  }

  #appendCommandArea(
    dock: HTMLElement,
    predicate: (command: CommandV7) => boolean,
  ): void {
    const actions = this.#commandButtons(predicate);
    if (actions.querySelector("button") !== null) {
      dock.dataset.hasActions = "true";
      dock.append(actions);
      return;
    }
  }

  async #handleMapCommand(target: MapCommandTargetV7): Promise<void> {
    const view = this.#snapshot.view;
    if (view === null) return;
    const command = target.command;
    await this.#dispatch(command);
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
    const close = iconButton(this.#document, "close", "Close", "close-overlay");
    close.classList.add("close-button");
    close.onclick = () => {
      this.#closeOverlay();
    };
    if (this.#screen === "TECH") overlay.append(this.#technology(view));
    else if (this.#screen === "LEADERBOARD")
      overlay.append(this.#leaderboard(view));
    else if (this.#screen === "ACHIEVEMENTS")
      overlay.append(this.#achievements(view));
    else if (this.#screen === "SETTINGS") overlay.append(this.#settings());
    else overlay.append(this.#help());
    overlay.prepend(close);
    return overlay;
  }

  #help(): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen v7-help");
    const tips = this.#document.createElement("ul");
    tips.className = "v7-help-tips";
    for (const tip of [
      "Select a unit, then a highlighted tile to move or attack.",
      "Select your city to train units.",
      "Select a tile in your land to harvest or build.",
      "Spend coins on technology to unlock more.",
      "Capture every enemy city to win.",
      "Move a land unit onto your port to put it to sea.",
    ])
      tips.append(text(this.#document, "li", tip));
    const keys = el(this.#document, "dl", "v7-help-keys");
    for (const [key, action] of [
      ["Arrows", "Move cursor"],
      ["Enter", "Select"],
      ["Esc", "Deselect"],
      ["E", "End turn"],
      ["T", "Technology"],
      ["G", "Leaderboard"],
      ["+ / −", "Zoom"],
    ] as const) {
      const row = el(this.#document, "div", "v7-help-key");
      row.append(
        text(this.#document, "dt", key),
        text(this.#document, "dd", action),
      );
      keys.append(row);
    }
    section.append(
      text(this.#document, "h2", "How to play"),
      tips,
      text(this.#document, "h3", "Keyboard"),
      keys,
    );
    return section;
  }

  #technology(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-tech-screen");
    const header = el(this.#document, "div", "v7-screen-header");
    const coins = el(this.#document, "p", "v7-coins v7-tech-coins");
    coins.append(
      economyIcon(this.#document, "coin"),
      text(this.#document, "span", String(view.viewer.coins)),
    );
    coins.setAttribute("aria-label", `${view.viewer.coins} Coins`);
    header.append(text(this.#document, "h2", "Technology"), coins);
    section.append(header);
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
      const laneId = `${branch.node.branch}:${branch.node.id}`;
      const branchId = `v7-tech-branch-${branch.node.branch.toLowerCase()}-${branch.node.id.toLowerCase()}`;
      column.id = branchId;
      column.dataset.techBranch = branch.node.branch;
      column.dataset.techLane = laneId;
      column.tabIndex = -1;
      const branchName =
        TECH_BRANCH_LABELS[branch.node.branch] ?? title(branch.node.branch);
      const heading = text(this.#document, "h3", branchName);
      heading.id = `${branchId}-heading`;
      column.setAttribute("aria-labelledby", heading.id);
      column.append(heading);
      appendTechNode(
        this.#document,
        column,
        branch,
        (node) => {
          this.#selectedTech = node.id;
          this.#pendingFocusAction = `research-${node.id.toLowerCase()}`;
          this.#render();
          queueMicrotask(() => {
            const detail =
              this.#root.querySelector<HTMLElement>(".v7-tech-detail");
            if (detail === null) return;
            detail.scrollIntoView?.({ block: "nearest" });
            if (this.#document.activeElement?.closest(".v7-tech-detail"))
              return;
            detail
              .querySelector<HTMLElement>(
                '[data-action^="research-"], [data-action="close-tech-detail"]',
              )
              ?.focus();
          });
        },
        this.#selectedTech,
      );
      const option = this.#document.createElement("option");
      option.value = laneId;
      option.textContent = branchName;
      branchSelect.append(option);
      graph.append(column);
    }
    branchSelect.onchange = () => {
      const column = graph.querySelector<HTMLElement>(
        `[data-tech-lane="${branchSelect.value}"]`,
      );
      column?.scrollIntoView?.({ block: "start" });
    };
    branches.append(branchSelect);
    section.append(branches, graph);
    const selected = tree.nodes.find((node) => node.id === this.#selectedTech);
    if (selected !== undefined) section.append(this.#techDetail(selected));
    return section;
  }

  #techDetail(node: PublicTechnologyNodeV7): HTMLElement {
    const detail = el(this.#document, "aside", "v7-tech-detail");
    detail.dataset.techState = node.state.toLowerCase();
    detail.setAttribute("aria-label", `${title(node.id)} details`);
    const close = iconButton(
      this.#document,
      "close",
      "Close",
      "close-tech-detail",
    );
    close.classList.add("close-button");
    close.onclick = () => {
      const id = node.id;
      this.#selectedTech = null;
      this.#pendingFocusAction = `tech-${id.toLowerCase()}`;
      this.#render();
    };
    const status =
      node.state === "OWNED"
        ? text(this.#document, "p", "Researched", "v7-tech-status is-owned")
        : node.state === "DISABLED"
          ? text(
              this.#document,
              "p",
              "Unavailable on Dry Land maps",
              "v7-tech-status is-locked",
            )
          : node.missingPrerequisites.length > 0
            ? text(
                this.#document,
                "p",
                `Requires ${node.missingPrerequisites.map(title).join(", ")}`,
                "v7-tech-status is-locked",
              )
            : node.affordable
              ? null
              : text(
                  this.#document,
                  "p",
                  `Need ${node.cost} Coins`,
                  "v7-tech-status is-short",
                );
    detail.append(
      close,
      identity(this.#document, RULESET7_TECH_ART_IDS[node.id], title(node.id)),
    );
    if (status !== null) detail.append(status);
    const unlocks = this.#document.createElement("ul");
    unlocks.className = "v7-tech-unlocks";
    for (const group of technologyEffectGroupsV7(node.effects))
      for (const item of group.items) {
        const entry = text(this.#document, "li", item);
        entry.dataset.effectGroup = group.id;
        unlocks.append(entry);
      }
    for (const note of navalTechnologyNotesV7(node.id))
      unlocks.append(text(this.#document, "li", note));
    const achievement = techAchievementV7(node.id);
    if (achievement !== null) {
      const entry = el(this.#document, "li", "v7-tech-achievement-note");
      entry.append(
        uiIconV7(this.#document, "trophy"),
        `${title(achievement)} achievement`,
      );
      unlocks.append(entry);
    }
    if (unlocks.childElementCount > 0) detail.append(unlocks);
    const command = this.#snapshot.offeredCommands.find(
      (candidate) =>
        candidate.kind === "RESEARCH" && candidate.tech === node.id,
    );
    if (command !== undefined) {
      const research = button(
        this.#document,
        "",
        `research-${node.id.toLowerCase()}`,
        "primary-action v7-research-action",
      );
      research.append(
        text(this.#document, "span", "Research"),
        economyChips(this.#document, { cost: node.cost }),
      );
      research.setAttribute(
        "aria-label",
        `Research ${title(node.id)} for ${node.cost} Coins`,
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
    const rule = effectiveRoleRuleV7(role);
    const modal = el(this.#document, "section", "v7-recruit-help");
    modal.dataset.v7Region = "recruit-help";
    modal.dataset.recruitRole = role;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", `${presentation.label} information`);
    const close = iconButton(
      this.#document,
      "close",
      "Close",
      "close-recruit-help",
    );
    close.classList.add("close-button");
    close.onclick = () => this.#closeRecruitHelp();
    const header = el(this.#document, "div", "v7-dialog-header");
    header.append(
      art(this.#document, RULESET7_UNIT_ART_IDS[role], ""),
      text(this.#document, "h2", presentation.label),
      economyChips(this.#document, { cost: rule.cost ?? 0 }),
    );
    modal.append(close, header);
    modal.append(
      text(this.#document, "p", title(rule.tacticalRole), "v7-tactical-role"),
    );
    const stats = el(this.#document, "dl", "v7-recruit-stats v7-unit-stats");
    for (const stat of presentation.stats) {
      const row = el(this.#document, "div", "v7-stat");
      row.title = stat.label;
      const term = el(this.#document, "dt", "v7-stat-term");
      term.append(
        uiIconV7(
          this.#document,
          STAT_ICONS[stat.label.toUpperCase()] ?? "info",
        ),
        text(this.#document, "span", stat.label, "v7-sr-only"),
      );
      row.append(term, text(this.#document, "dd", stat.value));
      stats.append(row);
    }
    modal.append(stats);
    const notes = [...presentation.abilities, ...presentation.restrictions];
    if (notes.length > 0) {
      const list = this.#document.createElement("ul");
      list.className = "v7-recruit-help-notes";
      for (const note of notes) list.append(text(this.#document, "li", note));
      modal.append(list);
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
        "Capture every enemy city to win.",
        "v7-screen-lede",
      ),
    );
    const list = this.#document.createElement("ol");
    list.className = "v7-leaderboard";
    for (const entry of view.leaderboard) {
      const row = el(this.#document, "li", "v7-leaderboard-row");
      row.dataset.color = entry.color.toLowerCase();
      row.dataset.status = entry.status.toLowerCase();
      if (entry.isViewer) row.dataset.viewer = "true";
      const name = el(this.#document, "span", "v7-leaderboard-name");
      name.append(
        el(this.#document, "span", "v7-player-swatch"),
        entry.isViewer
          ? `${playerName(entry.seat)} (you)`
          : playerName(entry.seat),
      );
      const cities = el(this.#document, "span", "v7-leaderboard-stat");
      cities.title = "Cities";
      cities.append(
        art(this.#document, "building-city-1", ""),
        String(entry.cityCount),
        text(this.#document, "span", " cities", "v7-sr-only"),
      );
      const units = el(this.#document, "span", "v7-leaderboard-stat");
      units.title = "Units";
      units.append(
        uiIconV7(this.#document, "units"),
        String(entry.livingUnitCount),
        text(this.#document, "span", " units", "v7-sr-only"),
      );
      row.append(name, cities, units);
      if (entry.status === "ELIMINATED")
        row.append(text(this.#document, "span", "Out", "v7-chip is-idle"));
      list.append(row);
    }
    section.append(list);
    return section;
  }

  #achievements(view: PlayerViewV7): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen");
    section.append(text(this.#document, "h2", "Achievements"));
    for (const achievement of ["EXPLORER", "ENGINEER", "MUSTER"] as const) {
      const entitlement = view.viewer.achievementEntitlements.find(
        (entry) => entry.achievement === achievement,
      );
      const progress = view.achievementProgress.find(
        (entry) => entry.achievement === achievement,
      );
      const card = el(this.#document, "section", "v7-achievement");
      const current =
        progress?.achievement === "EXPLORER"
          ? progress.currentExploredTiles
          : progress?.achievement === "ENGINEER"
            ? progress.currentMaximumOutput
            : progress?.achievement === "MUSTER"
              ? progress.currentDistinctTrainableRoles
              : 0;
      const required =
        progress?.achievement === "EXPLORER"
          ? progress.requiredExploredTiles
          : progress?.achievement === "ENGINEER"
            ? progress.requiredOutput
            : progress?.achievement === "MUSTER"
              ? progress.requiredDistinctTrainableRoles
              : achievement === "EXPLORER"
                ? 100
                : achievement === "ENGINEER"
                  ? 6
                  : 4;
      const tech =
        achievement === "EXPLORER"
          ? "SCOUTING"
          : achievement === "ENGINEER"
            ? "ENGINEERING"
            : "DRILL";
      const researched = view.viewer.researchedTechs.includes(tech);
      const state = entitlement?.spent
        ? "spent"
        : entitlement?.unlocked
          ? "complete"
          : researched
            ? "available"
            : "locked";
      card.dataset.state = state;
      const theme = this.#highContrast
        ? ("HIGH_CONTRAST" as const)
        : ("DARK" as const);
      const symbols = el(this.#document, "div", "v7-achievement-symbols");
      symbols.append(
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
      const meter = el(this.#document, "div", "v7-achievement-meter");
      const fill = el(this.#document, "span", "v7-achievement-fill");
      fill.style.width = `${Math.min(100, Math.round((current / Math.max(1, required)) * 100))}%`;
      meter.append(fill);
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", String(required));
      meter.setAttribute("aria-valuenow", String(Math.min(current, required)));
      card.append(
        symbols,
        text(this.#document, "h3", title(achievement)),
        text(
          this.#document,
          "p",
          achievement === "EXPLORER"
            ? "Explore 100 tiles."
            : achievement === "ENGINEER"
              ? "Get one building to 6 population."
              : "Field 4 different unit types.",
          "v7-achievement-goal",
        ),
        meter,
        text(
          this.#document,
          "p",
          state === "spent"
            ? "Monument built"
            : state === "complete"
              ? "Done! Build your monument."
              : state === "available"
                ? `${current} / ${required}`
                : `Needs ${title(tech)}`,
          "v7-achievement-status",
        ),
      );
      section.append(card);
    }
    return section;
  }

  #settings(): HTMLElement {
    const section = el(this.#document, "div", "v7-info-screen v7-settings");
    section.append(text(this.#document, "h2", "Settings"));
    const display = el(this.#document, "div", "v7-settings-grid");
    const motion = select(
      this.#document,
      "Motion",
      "v7-motion",
      ["FULL", "REDUCED"],
      this.#motion,
      { FULL: "Full", REDUCED: "Reduced" },
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
      { NORMAL: "Normal", FAST: "Fast" },
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
      "UI size",
      "v7-ui-scale",
      ["1", "1.25", "1.5", "2"],
      String(this.#uiScale),
      { "1": "100%", "1.25": "125%", "1.5": "150%", "2": "200%" },
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
      this.#highContrast ? "High contrast: on" : "High contrast: off",
      "high-contrast",
      "v7-toggle",
    );
    contrast.setAttribute("aria-pressed", String(this.#highContrast));
    contrast.onclick = () => {
      this.#highContrast = !this.#highContrast;
      this.#persistSettings();
      this.#render();
    };
    display.append(motion, speed, scale, contrast);
    const game = el(this.#document, "div", "button-row");
    const restart = button(this.#document, "Restart game", "restart");
    restart.onclick = () => void this.#restart();
    const remove = button(
      this.#document,
      "Delete save",
      "delete-save",
      "destructive",
    );
    remove.onclick = () => void this.#deleteSave();
    game.append(restart, remove);
    const developer = this.#document.createElement("details");
    developer.className = "v7-developer-tools";
    const safe = button(this.#document, "Export game log", "export-safe-log");
    safe.onclick = () => this.#exportSafeLog();
    const debug = button(
      this.#document,
      "Export debug bundle (reveals hidden map and units)",
      "export-debug-with-spoilers",
      "destructive",
    );
    debug.setAttribute(
      "aria-label",
      "Export debug bundle (includes hidden map and units; spoilers)",
    );
    debug.onclick = () => this.#exportDebug();
    const developerActions = el(this.#document, "div", "button-row");
    developerActions.append(safe, debug);
    developer.append(
      text(this.#document, "summary", "Developer tools"),
      developerActions,
    );
    section.append(display, game, developer);
    return section;
  }

  #reward(view: PlayerViewV7): HTMLElement {
    const choice = view.pendingChoices[0];
    const modal = el(this.#document, "section", "v7-mandatory-choice");
    modal.dataset.mandatoryChoice = "true";
    modal.setAttribute("role", "alertdialog");
    modal.setAttribute("aria-modal", "true");
    if (choice === undefined) return modal;
    const city = view.cities.find((entry) => entry.id === choice.cityId);
    modal.append(
      text(this.#document, "h2", `Level ${choice.reachedLevel}!`),
      text(
        this.#document,
        "p",
        `${city?.isCapital ? "Your capital" : "A city"} grew. Pick a reward.`,
        "v7-screen-lede",
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
      const [name, detail] = rewardLabel(reward);
      const action = button(
        this.#document,
        "",
        `reward-${reward.toLowerCase()}`,
        "v7-reward-action",
      );
      action.append(
        art(this.#document, rewardArtIdV7(reward), ""),
        text(this.#document, "strong", name),
        text(this.#document, "span", detail, "v7-reward-detail"),
      );
      action.setAttribute("aria-label", `${name}: ${detail}`);
      action.disabled = this.#localBusy();
      action.onclick = () => void this.#dispatch(command);
      modal.append(action);
    }
    modal.dataset.v7Region = "mandatory-reward";
    return modal;
  }

  #achievementNotice(): HTMLElement {
    const achievement = this.#achievementNotices[0];
    const modal = el(this.#document, "section", "v7-achievement-notice");
    modal.dataset.v7Region = "achievement-notice";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute(
      "aria-label",
      `${title(achievement ?? "ACHIEVEMENT")} achievement complete`,
    );
    if (achievement === undefined) return modal;
    const badge = el(this.#document, "div", "v7-achievement-badge");
    badge.append(uiIconV7(this.#document, "trophy"));
    modal.append(
      badge,
      text(this.#document, "h2", `${title(achievement)} achievement complete`),
      text(
        this.#document,
        "p",
        "You can now build a monument on one of your tiles.",
        "v7-screen-lede",
      ),
    );
    const close = button(
      this.#document,
      "Continue",
      "dismiss-achievement",
      "primary-action",
    );
    close.onclick = () => this.#dismissAchievementNotice();
    modal.append(close);
    return modal;
  }

  #dismissAchievementNotice(): void {
    this.#achievementNotices.shift();
    this.#render();
    if (
      this.#achievementNotices.length > 0 ||
      this.#snapshot.view?.pendingChoices.length
    )
      return;
    const action = this.#achievementReturnAction;
    this.#achievementReturnAction = null;
    queueMicrotask(() => {
      if (this.#destroyed) return;
      const target =
        action === null
          ? null
          : this.#root.querySelector<HTMLElement>(`[data-action="${action}"]`);
      if (target !== null) target.focus();
      else this.#queueBoardFocus();
    });
  }

  #results(view: PlayerViewV7): HTMLElement {
    const result = el(this.#document, "section", "v7-results");
    result.dataset.v7Region = "results";
    result.dataset.outcome =
      view.outcome?.kind === "VICTORY" ? "victory" : "defeat";
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
        `Turn ${view.round} · ${MAP_TYPE_LABELS[view.setup.mapType] ?? title(view.setup.mapType)} ${view.setup.width} × ${view.setup.height}`,
        "v7-screen-lede",
      ),
    );
    const actions = el(this.#document, "div", "button-row");
    const restart = button(
      this.#document,
      "Play again",
      "restart",
      "primary-action",
    );
    restart.onclick = () => void this.#restart();
    actions.append(restart);
    result.append(actions, this.#ruleset6Link());
    return result;
  }

  #errorPanel(): HTMLElement {
    const panel = el(this.#document, "section", "v7-results");
    panel.dataset.v7Region = "error";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.append(
      text(this.#document, "h2", "Game paused"),
      text(
        this.#document,
        "p",
        "Something went wrong. Your game is saved.",
        "v7-screen-lede",
      ),
    );
    const diagnostic = this.#snapshot.diagnostic;
    if (diagnostic !== null && diagnostic !== undefined) {
      const details = this.#document.createElement("details");
      details.className = "v7-recovery-details";
      details.append(
        text(this.#document, "summary", "Details"),
        text(this.#document, "p", diagnostic),
      );
      panel.append(details);
    }
    return panel;
  }

  #open(screen: ScreenV7, returnAction: string | null = null): void {
    if (this.#snapshot.view?.pendingChoices.length) return;
    this.#modalReturnAction = returnAction;
    if (screen === "TECH") this.#selectedTech = null;
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
      mapType: MAP_TYPES.includes(value(form, "v7-map-type") as MapTypeV7)
        ? (value(form, "v7-map-type") as MapTypeV7)
        : "CONTINENTS",
    };
  }
  async #launch(setup: MatchSetupV7, replace: boolean): Promise<void> {
    this.#cancelPresentations();
    this.#achievementNotices = [];
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
    this.#matchInstance += 1;
    this.#replacing = false;
    this.#selection = null;
    this.#notice = "Game started.";
    this.#render();
    await this.#progressAi();
    if (
      this.#screen === "MATCH" &&
      this.#snapshot.view?.pendingChoices.length === 0
    )
      this.#queueBoardFocus();
  }
  async #resumeMatch(): Promise<void> {
    this.#achievementNotices = [];
    const resumed = await this.#controller.resume();
    if (this.#destroyed) return;
    if (!resumed) this.#error = "The saved game couldn't be loaded.";
    else {
      this.#matchInstance += 1;
      this.#notice = "Game resumed.";
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
        "Couldn't save the game. Try again.";
      this.#render();
      await this.#progressAi();
      return;
    }
    this.#cancelPresentations();
    this.#achievementNotices = [];
    this.#selection = null;
    this.#screen = "MATCH";
    this.#compactMenuOpen = false;
    this.#notice = "Game saved.";
    this.#render();
  }
  async #dispatch(command: CommandV7): Promise<void> {
    if (this.#localBusy()) return;
    const restoreAction =
      command.kind === "RESEARCH" ? `tech-${command.tech.toLowerCase()}` : null;
    this.#presentationActive = true;
    this.#humanDispatchPending = true;
    let result: Awaited<ReturnType<Ruleset7ControllerPortV7["dispatch"]>>;
    try {
      result = await this.#controller.dispatch(command);
    } finally {
      this.#humanDispatchPending = false;
    }
    if (this.#destroyed) return;
    if (!result.accepted) {
      this.#presentationActive = false;
      this.#error = `Can't do that right now (${result.error?.code ?? result.reason}).`;
      this.#render();
      return;
    }
    this.#error = "";
    const special = specialBoundaryNoticeV7(
      result.playerEvents.events,
      result.afterView.viewer.id,
    );
    if (special !== null) this.#showToast(special);
    this.#notice = special ?? `${commandLabel(command)}.`;
    if (command.kind === "RESEARCH") this.#selectedTech = null;
    this.#pendingFocusAction = restoreAction;
    this.#humanDispatchSettling = true;
    const visibleMovement =
      command.kind === "MOVE" &&
      result.playerEvents.events.some((event) => event.kind === "UNIT_MOVED");
    if (visibleMovement && this.#matchRoot?.isConnected) {
      // Install the accepted public view before the slide. Rebuilding the HUD
      // here delays its first frame on a large board.
      this.#boardHost.update(this.#boardModel(result.afterView));
      const dock =
        this.#matchRoot.querySelector<HTMLElement>(".v7-selection-dock");
      if (dock !== null) {
        dock.replaceChildren(
          text(this.#document, "p", "Movement", "v7-movement-status"),
        );
        dock.setAttribute("aria-busy", "true");
      }
    } else this.#render();
    this.#drainPresentationQueue();
    await this.#presentationTail;
    if (this.#destroyed) {
      this.#humanDispatchSettling = false;
      return;
    }
    this.#presentationActive = false;
    this.#pendingFocusAction = restoreAction;
    this.#render();
    this.#humanDispatchSettling = false;
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
    else if (result.ok) this.#notice = "Your turn.";
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
      this.#notice = "Game restarted.";
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
      this.#notice = "Save deleted.";
    } else this.#error = "The save couldn't be deleted.";
    this.#render();
  }
  #exportSafeLog(): void {
    const result = this.#controller.exportSafeLog();
    if (result === null) return;
    this.#downloadSafeLog(result.source, result.filename);
    this.#notice = "Game log downloaded.";
    this.#render();
  }
  #exportDebug(): void {
    const result = this.#controller.exportDebugBundle({
      acknowledgeHiddenInformation: true,
    });
    if (!result.ok) return;
    this.#downloadDebugBundle(result.source, result.filename);
    this.#notice = "Debug bundle downloaded (contains spoilers).";
    this.#render();
  }
  #patchAiProgress(): void {
    const progress = this.#root.querySelector<HTMLElement>(
      "[data-v7-ai-progress]",
    );
    if (progress !== null) progress.textContent = this.#aiStatusText();
    const fast = this.#root.querySelector<HTMLButtonElement>(
      '[data-action="fast-forward"]',
    );
    if (fast !== null && this.#snapshot.ai.fastForward)
      fast.classList.add("is-active");
  }
  #aiStatusText(): string {
    const view = this.#snapshot.view;
    const active =
      view === null
        ? undefined
        : view.players.find(
            (player) => player.id === view.turnOrder[view.activeSeatIndex],
          );
    return `${playerName(active?.seat ?? 0)} is playing…`;
  }

  #queueBoundary(boundary: Ruleset7AcceptedBoundary): void {
    if (this.#destroyed) return;
    if (this.#achievementNotices.length === 0)
      this.#achievementReturnAction =
        this.#document.activeElement instanceof HTMLElement
          ? (this.#document.activeElement.dataset.action ?? null)
          : null;
    for (const event of boundary.playerEvents.events)
      if (
        event.kind === "ACHIEVEMENT_UNLOCKED" &&
        event.playerId === boundary.afterView.viewer.id
      )
        this.#achievementNotices.push(event.achievement);
    const special = specialBoundaryNoticeV7(
      boundary.playerEvents.events,
      boundary.afterView.viewer.id,
    );
    if (special !== null) {
      this.#notice = special;
      this.#showToast(special);
    }
    if (this.#snapshot.ai.fastForward) {
      this.#presentationQueue = [];
      return;
    }
    this.#presentationActive = true;
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
      }
    }
    if (this.#humanDispatchPending) return;
    this.#render();
    this.#drainPresentationQueue();
  }
  #drainPresentationQueue(): void {
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
        if (!this.#humanDispatchSettling) this.#render();
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

  #closeUnitHelp(): void {
    this.#selectedUnitHelpId = null;
    this.#pendingFocusAction = "unit-help";
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

  #showToast(message: string): void {
    this.#toastSequence += 1;
    const id = this.#toastSequence;
    this.#toast = { id, text: message, kind: "info" };
    this.#document.defaultView?.setTimeout(() => {
      if (this.#destroyed || this.#toast?.id !== id) return;
      this.#toast = null;
      this.#root
        .querySelector<HTMLElement>(`[data-toast-id="${id}"]`)
        ?.remove();
    }, 3200);
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
      key === "region:zoom" ||
      key === "region:toast" ||
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
  const artFrame = el(documentRoot, "span", "v7-tech-art");
  const assetId = RULESET7_TECH_ART_IDS[layout.node.id];
  const image = art(documentRoot, assetId, "");
  const artworkLayout = technologyArtworkLayoutV7(assetId);
  if (artworkLayout !== null) {
    artFrame.dataset.frameMode = "visible-alpha";
    image.style.left = `${artworkLayout.image.left}px`;
    image.style.top = `${artworkLayout.image.top}px`;
    image.style.width = `${artworkLayout.image.width}px`;
    image.style.height = `${artworkLayout.image.height}px`;
  }
  artFrame.append(image);
  card.append(
    artFrame,
    text(documentRoot, "span", title(layout.node.id), "v7-tech-name"),
  );
  const achievement = techAchievementV7(layout.node.id);
  if (achievement !== null) {
    const badge = el(documentRoot, "span", "v7-tech-achievement");
    badge.title = `${title(achievement)} achievement`;
    badge.append(uiIconV7(documentRoot, "trophy"));
    card.append(badge);
  }
  if (layout.node.state !== "OWNED") {
    const cost = el(documentRoot, "span", "v7-tech-cost");
    cost.append(String(layout.node.cost), economyIcon(documentRoot, "coin"));
    card.append(cost);
    card.setAttribute(
      "aria-label",
      `${title(layout.node.id)}, ${layout.node.cost} Coins${layout.node.state === "BLOCKED" ? ", locked" : ""}`,
    );
    if (layout.node.state === "DISABLED") {
      card.setAttribute("aria-disabled", "true");
      card.setAttribute(
        "aria-label",
        `${title(layout.node.id)}, unavailable on Dry Land maps`,
      );
    }
  } else {
    card.append(text(documentRoot, "span", "✓", "v7-tech-check"));
    card.setAttribute("aria-label", `${title(layout.node.id)}, researched`);
  }
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
  normalizePaintedSize = false,
): HTMLElement {
  const identity = el(documentRoot, "div", "v7-identity");
  const viewport = el(documentRoot, "span", "v7-identity-art");
  const image = art(documentRoot, assetId, "");
  const layout =
    normalizePaintedSize ||
    assetId === "terrain-square-original-fruit" ||
    assetId === "terrain-square-original-animal" ||
    assetId === RULESET7_IMPROVEMENT_ART_IDS.LUMBER_CAMP ||
    assetId === RULESET7_RESOURCE_ART_IDS.FERTILE_GROUND
      ? selectionIdentityArtworkLayoutV7(assetId)
      : null;
  if (layout !== null) {
    viewport.dataset.frameMode = "visible-alpha";
    image.style.left = `${layout.left}px`;
    image.style.top = `${layout.top}px`;
    image.style.width = `${layout.width}px`;
    image.style.height = `${layout.height}px`;
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
function mapTypeDescriptionV7(mapType: MapTypeV7): string {
  if (mapType === "DRY_LAND") return "All land, no sea.";
  if (mapType === "PANGEA") return "One big continent ringed by sea.";
  if (mapType === "CONTINENTS") return "Two or three large landmasses.";
  if (mapType === "ARCHIPELAGO") return "Everyone starts on their own island.";
  return "Mostly land, broken up by lakes.";
}
function setupFrom(draft: DraftV7): MatchSetupV7 | null {
  if (!/^\d+$/.test(draft.seedText)) return null;
  const seed = Number(draft.seedText);
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffff_ffff)
    return null;
  return {
    rulesetId: "pulp-wars-poc-7r11",
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
    mapType: draft.mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2",
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
      Number(view.naval.landTradeCityIds.includes(city.id)) +
      Number(view.naval.seaTradeCityIds.includes(city.id)) +
      market +
      Math.min(0, city.population),
  );
  return before;
}
function trainingCostForViewV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "TRAIN" | "TRAIN_NAVAL" }>,
): number {
  const base = effectiveRoleRuleV7(command.role).cost ?? 0;
  if (command.kind === "TRAIN_NAVAL") {
    const tile = view.board.tiles.find((candidate) =>
      same(candidate.at, command.at),
    );
    const shipyardActive = view.naval.ownedPorts.some(
      (port) => same(port.at, command.at) && port.status === "ACTIVE",
    );
    return Math.max(
      1,
      base -
        (tile?.explored === true &&
        tile.improvement === "SHIPYARD" &&
        shipyardActive
          ? 2
          : 0),
    );
  }
  const forge = view.improvementValues.some((value) => {
    if (value.improvement !== "FORGE" || value.level <= 0) return false;
    const tile = view.board.tiles.find((candidate) =>
      same(candidate.at, value.at),
    );
    return tile?.explored === true && tile.territoryCityId === command.cityId;
  });
  return Math.max(1, base - (forge ? 1 : 0));
}
function incomeDescription(view: PlayerViewV7): string {
  const cities = view.cities.filter((city) => city.ownerId === view.viewer.id);
  return `Next income ${cities.reduce((sum, city) => sum + (cityIncomeForViewerV7(view, city.id) ?? 0), 0)} from ${cities.length} cities, including capital, land trade, sea trade, Market, population deficit, and siege effects. Connected cities grow with Roads; Commerce earns trade and doubles Markets.`;
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
      return effect.command === "CULTIVATE_FOREST"
        ? "Clear for farming: removes Forest and creates Fertile Ground"
        : title(effect.command);
    case "UNIT_ROLE":
      return effectiveRoleRuleV7(effect.role).label;
    case "RESOURCE_REVEAL":
      return `Reveals ${effect.resources.map(title).join(" and ")}`;
    case "ECONOMIC_FORMULA":
      return economicFormulaV7(effect.improvement, effect.formula);
    case "CONNECTED_FARM_VISUALS":
      return "Neighboring farms join into one field";
    case "FOREST_MOVEMENT_FREEDOM":
      return `${effect.roles.map((role) => effectiveRoleRuleV7(role).label).join(" and ")} move freely through forest`;
    case "MOUNTAIN_MOVEMENT":
      return "Units can climb mountains";
    case "HIGH_GROUND_VISION":
      return "+1 sight on mountains";
    case "ROLE_SIGHT":
      return `${effectiveRoleRuleV7(effect.role).label} sight ${effect.radius}`;
    case "ROAD_MOVEMENT":
      return "Road edges cost half a movement point";
    case "OWNED_CITY_CAPACITY_BONUS":
      return `Cities support +${effect.capacity} unit`;
    case "ADJACENT_START_TURN_HEALING":
      return `Windmills heal adjacent units for ${effect.amount} HP at Start Turn`;
    case "ARMS_INDUSTRY_DISCOUNT":
      return `Forge training discount: ${effect.coins} Coin`;
    case "LAND_TRADE_INCOME":
      return `Road-linked cities: +${effect.coins} Coin`;
    case "LAND_ROAD_POPULATION":
      return `Road-linked cities: +${effect.amount} live population`;
    case "MARKET_INCOME_MULTIPLIER":
      return `Markets earn ${effect.multiplier}× income`;
    case "SEA_TRADE_INCOME":
      return `Sea-linked cities: +${effect.coins} Coin`;
    case "CAPTAIN_SUPPORT":
      return "Captains Rally or Tend nearby troops";
    case "OVERRUN":
      return "Knights advance after a kill and may attack again";
    case "CHARGE_BONUS":
      return `Raiders gain +${effect.attack} Attack after moving ${effect.minimumMove}+ cells`;
    case "MELEE_FIELD_DEMOLITION":
      return "Surviving melee attacks destroy Field Defense";
    case "NAVAL_TRAINING_DISCOUNT":
      return `Shipyards discount naval training by ${effect.coins} Coins`;
    case "FIRST_HOSTILE_CAPTURE_SPOILS":
      return `+${effect.coins} Coins for each city you capture`;
  }
}

function navalTechnologyNotesV7(
  technology: PublicTechnologyNodeV7["id"],
): readonly string[] {
  if (technology === "SHORECRAFT") return ["Board ships at active Ports"];
  if (technology === "NAVIGATION")
    return ["Ships can sail deep water", "Active Ports link sea trade"];
  if (technology === "NAVAL_ENGINEERING")
    return ["Battleship: long-range splash damage"];
  if (technology === "EXPLOSIVES")
    return ["Drill identifies resource-free mountains safe to Blast"];
  if (technology === "ROADS")
    return [
      "Usable Road and owned-city edges cost half movement",
      "Connected owned cities and the original capital each gain population",
    ];
  if (technology === "COMMERCE")
    return ["Connected cities earn trade", "Market income is doubled"];
  return [];
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
  return [`Train ${effectiveRoleRuleV7(roleId).label}`];
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
    case "ROAD_MOVEMENT":
      return "MOVEMENT_SIGHT";
    case "OWNED_CITY_CAPACITY_BONUS":
    case "ADJACENT_START_TURN_HEALING":
    case "ARMS_INDUSTRY_DISCOUNT":
    case "LAND_TRADE_INCOME":
    case "LAND_ROAD_POPULATION":
    case "MARKET_INCOME_MULTIPLIER":
    case "SEA_TRADE_INCOME":
    case "CAPTAIN_SUPPORT":
    case "OVERRUN":
    case "CHARGE_BONUS":
    case "MELEE_FIELD_DEMOLITION":
    case "NAVAL_TRAINING_DISCOUNT":
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
  const ship = roleId === "PATROL_BOAT" || roleId === "BATTLESHIP";
  if (!role.mayUsePrimaryActionAfterMove && role.minimumRange <= 1 && !ship)
    restrictions.push("Can't attack after moving.");
  if (!role.abilities.includes("CAPTURE") && !ship)
    restrictions.push("Can't capture.");
  if (ship) restrictions.push("Built at ports. Heals only near your ports.");
  if (roleId === "BATTLESHIP")
    restrictions.push(
      "Shots splash onto nearby enemies.",
      "Moves or fires each turn, not both.",
    );
  return {
    label: role.label,
    stats: [
      { label: "HP", value: String(role.maxHp) },
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
    abilities: role.abilities.flatMap((ability) => {
      const description = abilityDescription(
        ability,
        role.minimumRange,
        role.range,
      );
      return description === null
        ? []
        : [`${abilityName(ability)}: ${description}`];
    }),
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
): string | null {
  switch (ability) {
    case "ATTACK":
      return minimum > 1
        ? `Fires at range ${minimum}–${maximum}. Can't hit adjacent units or move and fire.`
        : null;
    case "CAPTURE":
      return "Can take villages and enemy cities.";
    case "CHARGE":
      return "With Raiding, +1 Attack on the first Attack after moving 2+ cells.";
    case "RALLY":
      return "Inspires adjacent friendly land troops except Captains and Catapults.";
    case "TEND_WOUNDED":
      return "Heals nearby wounded troops by 2.";
    case "OVERRUN":
      return "After a kill, advances and can attack another adjacent enemy.";
    case "PUSH":
      return "Knocks surviving targets back a tile.";
    default:
      return null;
  }
}
export function economicFormulaV7(
  improvement: string,
  formula: string,
): string {
  if (
    improvement === "WINDMILL" &&
    formula === "ADJACENT_FRIENDLY_CONTRIBUTORS"
  )
    return "Windmill: +1 per adjacent farm; heals adjacent owner units for 6 HP at Start Turn";
  if (improvement === "SAWMILL" && formula === "ADJACENT_FRIENDLY_CONTRIBUTORS")
    return "Sawmill: +1 per adjacent lumber camp";
  if (improvement === "FORGE" && formula === "ADJACENT_FRIENDLY_CONTRIBUTORS")
    return "Forge: +1 per adjacent mine";
  if (improvement === "WORKSHOP" && formula === "DISTINCT_BASIC_TYPES")
    return "Workshop: grows with varied neighbors";
  return "Market: coins from nearby industry";
}
export function monumentSourceForViewerV7(
  view: PlayerViewV7,
  at: CoordV7,
): AchievementIdV7 | null {
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
  const healing = events.filter(
    (event) => event.kind === "WINDMILL_HEALING_RESOLVED",
  );
  if (healing.length > 0)
    return healing
      .map(
        (event) =>
          `Windmill (${event.at.x}, ${event.at.y}) healed ${event.results
            .map((result) => `unit ${result.unitId} +${result.amount} HP`)
            .join(", ")}`,
      )
      .join(" · ");
  const treasury = events.find(
    (event) =>
      event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED" &&
      event.playerId === viewerId,
  );
  if (treasury?.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED")
    return `Treasury: +${treasury.coins} Coins`;
  const achievement = events.find(
    (event) =>
      event.kind === "ACHIEVEMENT_UNLOCKED" && event.playerId === viewerId,
  );
  return achievement?.kind === "ACHIEVEMENT_UNLOCKED"
    ? `${title(achievement.achievement)} achievement unlocked`
    : null;
}
function techAchievementV7(tech: TechnologyIdV7): AchievementIdV7 | null {
  if (tech === "SCOUTING") return "EXPLORER";
  if (tech === "ENGINEERING") return "ENGINEER";
  if (tech === "DRILL") return "MUSTER";
  return null;
}
function rewardLabel(reward: string): readonly [string, string] {
  if (reward === "SURVEY") return ["Survey", "Reveal the area"];
  if (reward === "STOCKPILE") return ["Stockpile", "+4 Coins"];
  if (reward === "WALLS") return ["Walls", "Stronger city defense"];
  if (reward === "MILITIA") return ["Militia", "A free Fighter"];
  if (reward === "BOOM") return ["Boom", "+3 population"];
  if (reward === "TREASURY_8") return ["Treasury", "+8 Coins"];
  if (reward === "JUGGERNAUT") return ["Juggernaut", "A giant unit"];
  if (reward === "TREASURY") return ["Treasury", "+12 Coins"];
  return [title(reward), ""];
}

const TECH_BRANCH_LABELS: Readonly<Record<string, string>> = {
  SETTLEMENT: "Settlement",
  WILDS: "Wilds",
  MOBILITY: "Mobility",
  INDUSTRY: "Industry",
  NAVAL: "Naval",
};
const COMMAND_LABELS: Partial<Record<CommandV7["kind"], string>> = {
  HARVEST_FRUIT: "Harvest",
  HUNT_GAME: "Hunt",
  HARVEST_FISH: "Fish",
  GATHER_PEARLS: "Pearls",
  BUILD_FARM: "Farm",
  BUILD_LUMBER_CAMP: "Lumber camp",
  BUILD_MINE: "Mine",
  BUILD_WINDMILL: "Windmill",
  BUILD_SAWMILL: "Sawmill",
  BUILD_FORGE: "Forge",
  BUILD_WORKSHOP: "Workshop",
  BUILD_MARKET: "Market",
  BUILD_PORT: "Port",
  BUILD_SHIPYARD: "Shipyard",
  CLEAR_FOREST: "Clear forest",
  REPLANT_FOREST: "Plant forest",
  CULTIVATE_FOREST: "Clear for farming",
  BLAST_MOUNTAIN: "Blast",
  BUILD_ROAD: "Road",
  REDEVELOP: "Redevelop",
  LAND_GRANT: "Land grant",
  BUILD_FIELD_DEFENSE: "Fortify",
};
function commandLabel(command: CommandV7): string {
  if (command.kind === "TRAIN" || command.kind === "TRAIN_NAVAL")
    return effectiveRoleRuleV7(command.role).label;
  if (command.kind === "BUILD_MONUMENT") return "Monument";
  return COMMAND_LABELS[command.kind] ?? title(command.kind);
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
  const changedPopulationCities = preview.populationDeltaByCity.filter(
    (change) => change.delta !== 0,
  ).length;
  const details = [
    `${preview.cost} Coins`,
    population === 0
      ? null
      : `population ${population > 0 ? "+" : ""}${population}${changedPopulationCities > 1 ? ` across ${changedPopulationCities} cities` : ""}`,
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
  appendEconomyText(documentRoot, node, valueText);
  return node;
}

function economyIcon(
  documentRoot: Document,
  kind: "coin" | "population",
): HTMLImageElement {
  const icon = documentRoot.createElement("img");
  icon.className = "v7-economy-icon";
  icon.src =
    ACCEPTED_ART_URLS[
      kind === "coin" ? "ui-hud-gold-coin-v7" : "ui-hud-population"
    ] ?? "";
  icon.alt = "";
  icon.setAttribute("aria-hidden", "true");
  icon.dataset.assetId =
    kind === "coin" ? "ui-hud-gold-coin-v7" : "ui-hud-population";
  return icon;
}

function appendEconomyText(
  documentRoot: Document,
  node: HTMLElement,
  valueText: string,
): void {
  if (!/\d/.test(valueText) || !/(coin|population|income)/i.test(valueText)) {
    node.textContent = valueText;
    return;
  }
  const amounts =
    /([+-]?\d+)\s+(Coins?|(?:permanent |live )?population)\b|\b(Population|population|Income|income)(\s+)([+-]?\d+)\b/g;
  let cursor = 0;
  for (const match of valueText.matchAll(amounts)) {
    const index = match.index ?? 0;
    node.append(valueText.slice(cursor, index));
    const amount = match[1];
    if (amount !== undefined) {
      const unit = match[2] ?? "";
      const token = el(documentRoot, "span", "v7-economy-value");
      token.append(
        amount,
        " ",
        economyIcon(
          documentRoot,
          unit.endsWith("population") ? "population" : "coin",
        ),
      );
      token.append(
        text(
          documentRoot,
          "span",
          unit,
          unit.endsWith("population") ? "" : "v7-sr-only",
        ),
      );
      node.append(token);
    } else {
      node.append(
        match[3] ?? "",
        match[4] ?? "",
        economyIcon(
          documentRoot,
          /income/i.test(match[3] ?? "") ? "coin" : "population",
        ),
        match[5] ?? "",
      );
    }
    cursor = index + match[0].length;
  }
  node.append(valueText.slice(cursor));
}
function button(
  documentRoot: Document,
  label: string,
  action: string,
  className = "",
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  appendEconomyText(documentRoot, node, label);
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
  labels: Readonly<Record<string, string>> = {},
): HTMLLabelElement {
  const label = documentRoot.createElement("label");
  label.textContent = labelText;
  const field = documentRoot.createElement("select");
  field.id = id;
  replaceOptions(documentRoot, field, values, selected, labels);
  label.append(field);
  return label;
}
function replaceOptions(
  documentRoot: Document,
  field: HTMLSelectElement,
  values: readonly string[],
  selected: string,
  labels: Readonly<Record<string, string>> = {},
): void {
  field.replaceChildren(
    ...values.map((entry) => {
      const option = documentRoot.createElement("option");
      option.value = entry;
      option.textContent = labels[entry] ?? entry;
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

function iconButton(
  documentRoot: Document,
  icon: UiIconIdV7,
  label: string,
  action: string,
  showLabel = false,
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  node.dataset.action = action;
  node.className = showLabel ? "v7-icon-button has-label" : "v7-icon-button";
  node.append(uiIconV7(documentRoot, icon));
  if (showLabel) node.append(text(documentRoot, "span", label));
  else node.setAttribute("aria-label", label);
  node.title = label;
  return node;
}

function playerName(seat: number): string {
  return `Player ${seat + 1}`;
}

const STAT_ICONS: Readonly<Record<string, UiIconIdV7>> = {
  HP: "hp",
  ATTACK: "attack",
  DEFENSE: "defense",
  MOVE: "move",
  RANGE: "range",
  SIGHT: "sight",
};

function economyChips(
  documentRoot: Document,
  values: {
    readonly cost?: number;
    readonly population?: number;
    readonly income?: number;
  },
): HTMLElement {
  const chips = el(documentRoot, "span", "v7-command-economy");
  const chip = (
    kind: "coin" | "population",
    value: string,
    className: string,
  ): void => {
    const node = el(documentRoot, "span", `v7-economy-chip ${className}`);
    node.append(value, economyIcon(documentRoot, kind));
    chips.append(node);
  };
  if (values.cost !== undefined)
    chip("coin", values.cost === 0 ? "Free" : String(values.cost), "is-cost");
  if (values.population !== undefined && values.population !== 0)
    chip(
      "population",
      `${values.population > 0 ? "+" : ""}${values.population}`,
      values.population > 0 ? "is-gain" : "is-loss",
    );
  if (values.income !== undefined && values.income !== 0)
    chip(
      "coin",
      `${values.income > 0 ? "+" : ""}${values.income}/t`,
      values.income > 0 ? "is-gain" : "is-loss",
    );
  return chips;
}

function populationMeter(
  documentRoot: Document,
  population: number,
  slots: number,
): HTMLElement {
  const meter = el(documentRoot, "span", "v7-population-meter");
  meter.setAttribute("aria-hidden", "true");
  for (let index = 0; index < Math.max(1, slots); index += 1) {
    const pip = el(documentRoot, "span", "v7-population-pip");
    if (population > 0 && index < population) pip.dataset.state = "filled";
    else if (population < 0 && index < -population)
      pip.dataset.state = "deficit";
    meter.append(pip);
  }
  return meter;
}

function abilityName(ability: string): string {
  if (ability === "TEND_WOUNDED") return "Tend";
  return title(ability);
}
