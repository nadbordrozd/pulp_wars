import {
  candifyWouldDuplicateSpecializedImprovementV6,
  canonicalJson,
  effectiveRoleRuleV6,
  queryTechnologyTreeV6,
  TECHNOLOGY_BRANCH_IDS_V6,
  type CommandV6,
  type DomainEventV6,
  type FactionIdV6,
  type MatchSetupV6,
  type PendingChoiceV6,
  type PlayerColorV6,
  type PlayerViewV6,
  type PublicTechnologyNodeV6,
  type RewardIdV6,
  type TechnologyId,
  type TechnologyUnlockV6,
  type UnitRoleId,
} from "../../engine/index";
import { ACCEPTED_ART_URLS } from "../../assets/generated-art-manifest";
import {
  commandArtIdV6,
  rewardArtIdV6,
  RULESET6_HUD_ART_IDS,
  technologyArtIdV6,
} from "../../assets/ruleset6-ui-art";
import type {
  Ruleset6BrowserController,
  Ruleset6BrowserSnapshot,
} from "../../app/v6-controller";
import { CanvasBoardHostV6, type BoardHostV6 } from "../canvas/board-host-v6";
import {
  EMPTY_BOARD_RENDER_INTERACTION_V6,
  selectionCoordV6,
  type BoardSelectionV6,
  type BoardTargetModeV6,
  type EconomicCommandV6,
  type MapCommandTargetV6,
} from "../canvas/render-plan-v6";
import { readyUnitIdsFromOfferedMovesV6 } from "./readiness-v6";
import {
  combatPresentationsFromEventsV6,
  type CombatPresentationV6,
} from "../canvas/combat-presentation-v6";
import { cityPopulationPresentationV6 } from "../city-population-presentation-v6";
import {
  technologyTreeLayoutV6,
  type TechnologyTreeLayoutNodeV6,
} from "./technology-tree-layout-v6";
import {
  selectionIdentityPresentationV6,
  type SelectionIdentityPresentationV6,
} from "./selection-identity-v6";

const BOARD_SIZES = [11, 14, 16, 20, 25] as const;
const COLORS: readonly PlayerColorV6[] = ["CORAL", "TEAL", "GOLD", "VIOLET"];
const FACTIONS: readonly FactionIdV6[] = ["ORIGINAL", "CANDY"];
const ECONOMIC_KINDS = new Set<CommandV6["kind"]>([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_QUARRY",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_STONEWORKS",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
]);

export interface Ruleset6SetupDraft {
  readonly aiCount: 1 | 2 | 3;
  readonly aiMode: "RIVAL" | "COOPERATIVE";
  readonly boardSize: (typeof BOARD_SIZES)[number];
  readonly seedText: string;
  readonly humanColor: PlayerColorV6;
  readonly factions: readonly FactionIdV6[];
}

export interface MountRuleset6AppOptions {
  readonly boardHost?: BoardHostV6;
  readonly prefersReducedMotion?: boolean;
  readonly prefersHighContrast?: boolean;
}

export type Ruleset6BrowserControllerPort = Pick<
  Ruleset6BrowserController,
  | "snapshot"
  | "subscribe"
  | "launch"
  | "resume"
  | "dispatch"
  | "progressAiTurns"
  | "restart"
  | "deleteStoredSave"
>;

type ActionSymbol =
  | {
      readonly kind: "RASTER";
      readonly assetId: string;
      readonly url: string;
    }
  | { readonly kind: "FALLBACK"; readonly value: string };

type Ruleset6Screen = "MATCH" | "TECH";

/**
 * Ruleset-6-only DOM composition. Gameplay data is limited to controller
 * snapshots and exact public commands; this layer never reconstructs legality.
 */
export class Ruleset6DomAppView {
  readonly #document: Document;
  readonly #root: HTMLElement;
  readonly #controller: Ruleset6BrowserControllerPort;
  readonly #boardHost: BoardHostV6;
  readonly #prefersReducedMotion: boolean;
  readonly #prefersHighContrast: boolean;
  #unsubscribe: (() => void) | null = null;
  #snapshot: Ruleset6BrowserSnapshot;
  #draft: Ruleset6SetupDraft = defaultDraft();
  #matchInstanceId = 0;
  #selection: BoardSelectionV6 | null = null;
  #targetMode: BoardTargetModeV6 | null = null;
  #commandChoices: readonly MapCommandTargetV6[] = [];
  #notice: string | null = null;
  #error: string | null = null;
  #screen: Ruleset6Screen = "MATCH";
  #selectedTechnology: TechnologyId | null = null;
  #pendingFocusSelector: string | null = null;
  #mandatoryChoiceKey: string | null = null;
  #mandatoryReturnFocusId: string | null = null;
  #restoreBoardFocus = false;
  #combatQueue: readonly CombatPresentationV6[] = [];
  #destroyed = false;

  constructor(
    documentRoot: Document,
    root: HTMLElement,
    controller: Ruleset6BrowserControllerPort,
    options: MountRuleset6AppOptions = {},
  ) {
    this.#document = documentRoot;
    this.#root = root;
    this.#controller = controller;
    this.#boardHost = options.boardHost ?? new CanvasBoardHostV6(documentRoot);
    this.#prefersReducedMotion =
      options.prefersReducedMotion ??
      documentRoot.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches ??
      false;
    this.#prefersHighContrast =
      options.prefersHighContrast ??
      documentRoot.defaultView?.matchMedia?.("(prefers-contrast: more)")
        .matches ??
      false;
    this.#root.dataset.contrast = this.#prefersHighContrast
      ? "high"
      : "standard";
    this.#snapshot = controller.snapshot();
    this.#document.addEventListener("keydown", this.#onKeyDown);
    this.#unsubscribe = controller.subscribe((snapshot) => {
      if (this.#destroyed) return;
      this.#snapshot = snapshot;
      this.#validatePresentation(snapshot.view);
      this.#render();
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#document.removeEventListener("keydown", this.#onKeyDown);
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#combatQueue = [];
    this.#boardHost.destroy();
    this.#root.replaceChildren();
  }

  boardScreenPoint(at: { readonly x: number; readonly y: number }) {
    return this.#boardHost.screenPoint(at);
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (this.#hasMandatoryChoice()) {
      if (event.key === "Tab") {
        this.#trapMandatoryChoiceFocus(event);
      } else if (
        event.key === "Escape" ||
        !(
          target instanceof Node &&
          this.#root
            .querySelector<HTMLElement>("[data-mandatory-choice]")
            ?.contains(target)
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    if (this.#combatQueue.length > 0) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (this.#screen === "TECH") {
      if (this.#selectedTechnology !== null) {
        if (event.key === "Escape") {
          this.#closeTechnologyDetail();
          event.preventDefault();
        } else if (event.key === "Tab") {
          this.#trapTechnologyDetailFocus(event);
        }
        return;
      }
      if (event.key === "Escape") {
        this.#closeTechnologyScreen();
        event.preventDefault();
      }
      return;
    }
    if (event.key === "Escape") {
      if (this.#commandChoices.length > 0) {
        this.#commandChoices = [];
        this.#render();
        event.preventDefault();
      } else if (this.#selection !== null || this.#targetMode !== null) {
        this.#resetPresentation();
        this.#render();
        event.preventDefault();
      }
      return;
    }
    if (event.key.toLowerCase() === "e" && this.#snapshot.phase === "ACTIVE") {
      const end = this.#snapshot.offeredCommands.find(
        (command) => command.kind === "END_TURN",
      );
      if (end !== undefined) {
        event.preventDefault();
        void this.#dispatch(end);
      }
    } else if (
      event.key.toLowerCase() === "t" &&
      this.#snapshot.view !== null &&
      this.#snapshot.phase === "ACTIVE"
    ) {
      event.preventDefault();
      this.#openTechnologyScreen();
    }
  };

  #render(): void {
    const previousFocusId =
      this.#document.activeElement instanceof HTMLElement &&
      this.#root.contains(this.#document.activeElement)
        ? this.#document.activeElement.dataset.focusId
        : undefined;
    this.#updateMandatoryFocus(previousFocusId);
    const shell = el(this.#document, "div", "v6-app-shell");
    shell.dataset.phase = this.#snapshot.phase.toLowerCase();
    shell.append(
      live(this.#document, "v6-live", this.#notice ?? "", "polite"),
      live(this.#document, "v6-alert", this.#error ?? "", "assertive"),
    );
    if (this.#snapshot.saveWarning !== null) {
      shell.append(
        banner(
          this.#document,
          `Save warning: ${this.#snapshot.saveWarning}`,
          "warning",
        ),
      );
    }
    if (this.#error !== null)
      shell.append(banner(this.#document, this.#error, "error"));

    switch (this.#snapshot.phase) {
      case "EMPTY":
        shell.append(this.#setupScreen(false));
        break;
      case "RESUMABLE":
        shell.append(this.#resumeScreen());
        break;
      case "RECOVERY":
        shell.append(this.#recoveryScreen());
        break;
      case "ACTIVE":
      case "COMPLETE":
      case "ERROR":
        if (this.#snapshot.view === null)
          shell.append(this.#setupScreen(false));
        else if (this.#screen === "TECH")
          shell.append(this.#technologyScreen(this.#snapshot.view));
        else shell.append(this.#matchScreen(this.#snapshot.view));
        break;
    }
    this.#root.replaceChildren(shell);
    if (
      this.#snapshot.view !== null &&
      this.#root.querySelector("[data-v6-board]") !== null
    ) {
      this.#mountBoard(this.#snapshot.view);
    } else {
      this.#boardHost.unmount();
    }
    const requestedFocus =
      this.#pendingFocusSelector === null
        ? null
        : this.#root.querySelector<HTMLElement>(this.#pendingFocusSelector);
    if (requestedFocus !== null) {
      requestedFocus.focus({ preventScroll: true });
      this.#pendingFocusSelector = null;
    } else if (
      this.#pendingFocusSelector !== null &&
      this.#hasMandatoryChoice()
    ) {
      this.#root
        .querySelector<HTMLElement>("[data-mandatory-choice]")
        ?.focus({ preventScroll: true });
    } else if (previousFocusId !== undefined) {
      this.#root
        .querySelector<HTMLElement>(
          `[data-focus-id="${cssEscape(previousFocusId)}"]`,
        )
        ?.focus({ preventScroll: true });
    }
    if (this.#restoreBoardFocus) {
      this.#restoreBoardFocus = false;
      this.#boardHost.focus();
    }
  }

  #setupScreen(replace: boolean): HTMLElement {
    const main = el(this.#document, "main", "v6-setup-screen");
    main.append(
      text(this.#document, "p", "Ruleset 6 · spatial economy", "v6-eyebrow"),
      text(this.#document, "h1", replace ? "Replace match" : "Start a new war"),
      text(
        this.#document,
        "p",
        "Choose the baseline Original tree or its Candy unit substitution, then develop cities directly on the map.",
        "v6-lede",
      ),
    );
    const form = el(this.#document, "form", "v6-setup-form");
    form.dataset.v6Setup = "true";
    form.append(
      selectField(
        this.#document,
        "AI opponents",
        "v6-ai-count",
        ["1", "2", "3"],
        String(this.#draft.aiCount),
      ),
      selectField(
        this.#document,
        "AI relationship",
        "v6-ai-mode",
        ["RIVAL", "COOPERATIVE"],
        this.#draft.aiMode,
      ),
      selectField(
        this.#document,
        "Board size",
        "v6-board-size",
        compatibleSizes(this.#draft.aiCount).map(String),
        String(this.#draft.boardSize),
      ),
      inputField(
        this.#document,
        "Seed (0–4294967295)",
        "v6-seed",
        this.#draft.seedText,
      ),
      selectField(
        this.#document,
        "Your color",
        "v6-color",
        COLORS,
        this.#draft.humanColor,
      ),
    );
    this.#draft.factions.forEach((faction, seat) => {
      form.append(
        selectField(
          this.#document,
          seat === 0 ? "Your faction" : `AI ${seat} faction`,
          `v6-faction-${seat}`,
          FACTIONS,
          faction,
        ),
      );
    });
    const submit = button(
      this.#document,
      replace ? "Replace saved match" : "Launch match",
      "primary-action",
    );
    submit.type = "submit";
    submit.dataset.action = replace ? "replace-launch" : "launch";
    submit.disabled = this.#snapshot.transitioning;
    form.append(submit);
    form.addEventListener("change", () => this.#readDraft(form));
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

  #resumeScreen(): HTMLElement {
    const main = el(this.#document, "main", "v6-resume-screen");
    const view = this.#snapshot.view;
    main.append(
      text(this.#document, "p", "Ruleset 6 save found", "v6-eyebrow"),
      text(this.#document, "h1", "Continue the campaign"),
      text(
        this.#document,
        "p",
        view === null
          ? "A valid saved match is ready."
          : `${title(view.viewer.faction)} · round ${view.round} · ${view.viewer.coins} Coins`,
        "v6-lede",
      ),
    );
    const actions = el(this.#document, "div", "v6-button-row");
    const resume = button(this.#document, "Resume match", "primary-action");
    resume.dataset.action = "resume";
    resume.onclick = () => void this.#resume();
    const replace = button(
      this.#document,
      "Set up replacement",
      "secondary-action",
    );
    replace.dataset.action = "show-replace";
    replace.onclick = () => {
      main.replaceWith(this.#setupScreen(true));
    };
    const remove = button(this.#document, "Delete save", "destructive");
    remove.dataset.action = "delete-save";
    remove.onclick = () => void this.#deleteSave();
    actions.append(resume, replace, remove);
    main.append(actions);
    return main;
  }

  #recoveryScreen(): HTMLElement {
    const main = el(this.#document, "main", "v6-recovery-screen");
    main.append(
      text(this.#document, "p", "Save recovery", "v6-eyebrow"),
      text(this.#document, "h1", "The saved match was preserved"),
      text(
        this.#document,
        "p",
        this.#snapshot.recovery?.diagnostic ?? "The save could not be opened.",
        "v6-lede",
      ),
      text(
        this.#document,
        "p",
        "Nothing was overwritten. Delete it explicitly before starting ruleset 6.",
      ),
    );
    const remove = button(
      this.#document,
      "Delete preserved save",
      "destructive",
    );
    remove.dataset.action = "delete-save";
    remove.onclick = () => void this.#deleteSave();
    main.append(remove);
    return main;
  }

  #matchScreen(view: PlayerViewV6): HTMLElement {
    const main = el(this.#document, "main", "v6-match-shell");
    const combatPresentation = this.#combatQueue[0] ?? null;
    const humanCanAct =
      canHumanAct(this.#snapshot) && combatPresentation === null;
    const mandatoryChoicePending = view.pendingChoices.length > 0;
    const ownCities = view.cities.filter(
      (city) => city.ownerId === view.viewer.id,
    );
    const ownUnits = view.units.filter(
      (unit) => unit.ownerId === view.viewer.id && unit.hp > 0,
    );
    const activePlayer = view.players.find(
      (player) => player.id === view.turnOrder[view.activeSeatIndex],
    );
    const hud = el(this.#document, "header", "v6-hud");
    hud.append(
      chip(this.#document, "Faction", title(view.viewer.faction)),
      chip(
        this.#document,
        "Coins",
        String(view.viewer.coins),
        RULESET6_HUD_ART_IDS.COIN,
      ),
      chip(this.#document, "Round", String(view.round)),
      chip(this.#document, "Cities", String(ownCities.length)),
      chip(this.#document, "Units", String(ownUnits.length)),
      chip(
        this.#document,
        "Turn",
        activePlayer?.controller === "HUMAN"
          ? "Yours"
          : `AI ${activePlayer?.seat ?? ""}`,
      ),
    );
    const menu = el(this.#document, "div", "v6-hud-actions");
    if (this.#snapshot.phase === "ACTIVE" && !mandatoryChoicePending) {
      const technology = button(
        this.#document,
        "Tech",
        "secondary-action v6-tech-navigation",
      );
      technology.dataset.action = "open-tech";
      technology.dataset.focusId = "open-tech";
      technology.ariaLabel = "Open Technology (T)";
      technology.disabled = combatPresentation !== null;
      technology.onclick = () => this.#openTechnologyScreen();
      menu.append(technology);
    }
    const zoomOut = button(this.#document, "−", "v6-icon-button");
    zoomOut.ariaLabel = "Zoom out";
    zoomOut.onclick = () => {
      if (!this.#hasMandatoryChoice()) this.#boardHost.zoom("OUT");
    };
    const zoomIn = button(this.#document, "+", "v6-icon-button");
    zoomIn.ariaLabel = "Zoom in";
    zoomIn.onclick = () => {
      if (!this.#hasMandatoryChoice()) this.#boardHost.zoom("IN");
    };
    const restart = button(this.#document, "Restart", "secondary-action");
    restart.dataset.action = "restart";
    restart.onclick = () => void this.#restart();
    const remove = button(this.#document, "Delete", "destructive");
    remove.dataset.action = "delete-save";
    remove.onclick = () => void this.#deleteSave();
    const end = this.#snapshot.offeredCommands.find(
      (command) => command.kind === "END_TURN",
    );
    if (end !== undefined && humanCanAct && !mandatoryChoicePending) {
      const endTurn = this.#actionButton(end, "End Turn", {
        symbol: { kind: "FALLBACK", value: "↻" },
        className: "v6-global-action",
      });
      endTurn.dataset.action = "end-turn";
      menu.append(endTurn);
    }
    if (
      combatPresentation !== null &&
      combatPresentation.actorController === "AI"
    ) {
      const fastForward = button(
        this.#document,
        "Fast Forward",
        "secondary-action",
      );
      fastForward.dataset.action = "fast-forward-combat";
      fastForward.onclick = () => {
        this.#combatQueue = [];
        this.#notice = "Combat presentation skipped.";
        this.#render();
      };
      menu.append(fastForward);
    }
    menu.append(zoomOut, zoomIn, restart, remove);
    hud.append(menu);

    const map = el(this.#document, "section", "v6-map-region");
    map.dataset.v6Board = "true";
    map.setAttribute("aria-label", "Battlefield map");

    const dock = el(this.#document, "aside", "v6-action-dock");
    dock.setAttribute("aria-label", "Available actions");
    if (this.#snapshot.phase === "COMPLETE") {
      dock.append(this.#resultPanel(view));
    } else if (this.#snapshot.phase === "ERROR") {
      dock.append(
        text(this.#document, "h2", "Match paused"),
        text(
          this.#document,
          "p",
          this.#snapshot.diagnostic ?? "The match encountered an error.",
        ),
      );
    } else if (combatPresentation !== null) {
      dock.append(
        text(this.#document, "h2", "Combat"),
        text(this.#document, "p", "Resolving the accepted attack…"),
      );
    } else if (!humanCanAct) {
      dock.append(
        text(this.#document, "h2", "AI turn"),
        text(
          this.#document,
          "p",
          this.#snapshot.transitioning
            ? "Thinking…"
            : "Advancing the other seats…",
        ),
      );
    } else {
      dock.append(this.#normalActionPanel(view));
    }
    if (this.#commandChoices.length > 0)
      dock.append(this.#commandChoiceDialog());
    main.append(hud, map);
    if (!mandatoryChoicePending) main.append(dock);
    if (mandatoryChoicePending) {
      hud.inert = true;
      map.inert = true;
      main.dataset.inputBlocked = "mandatory-choice";
      main.append(this.#mandatoryChoiceDialog(view));
    }
    return main;
  }

  #openTechnologyScreen(): void {
    if (
      this.#snapshot.phase !== "ACTIVE" ||
      this.#snapshot.view === null ||
      this.#hasMandatoryChoice()
    )
      return;
    this.#combatQueue = [];
    this.#screen = "TECH";
    this.#selectedTechnology = null;
    this.#pendingFocusSelector = '[data-focus-id="tech-back"]';
    this.#render();
  }

  #closeTechnologyScreen(): void {
    this.#screen = "MATCH";
    this.#selectedTechnology = null;
    this.#pendingFocusSelector = '[data-focus-id="open-tech"]';
    this.#render();
  }

  #technologyScreen(view: PlayerViewV6): HTMLElement {
    const tree = queryTechnologyTreeV6(view);
    const main = el(this.#document, "main", "v6-tech-screen");
    main.dataset.techScreen = "true";
    const content = el(this.#document, "div", "v6-tech-screen-content");
    if (this.#selectedTechnology !== null) content.inert = true;

    const header = el(this.#document, "header", "v6-tech-header");
    const back = button(
      this.#document,
      "← Back to match",
      "secondary-action v6-tech-back",
    );
    back.dataset.action = "close-tech";
    back.dataset.focusId = "tech-back";
    back.onclick = () => this.#closeTechnologyScreen();
    const heading = el(this.#document, "div", "v6-tech-heading");
    heading.append(
      text(
        this.#document,
        "p",
        `${title(tree.faction)} technology`,
        "v6-eyebrow",
      ),
      text(this.#document, "h1", "Technology"),
      text(
        this.#document,
        "p",
        `${view.viewer.coins} Coins · ${tree.id} · costs reflect ${tree.ownedCityCount} owned ${tree.ownedCityCount === 1 ? "city" : "cities"}`,
        "v6-tech-summary",
      ),
    );
    header.append(back, heading);

    const branchNavigation = el(
      this.#document,
      "label",
      "v6-tech-branch-navigation",
    );
    branchNavigation.append(
      text(this.#document, "span", "Jump to branch", "v6-tech-branch-label"),
    );
    const branchSelect = this.#document.createElement("select");
    branchSelect.ariaLabel = "Technology branch";
    for (const branch of TECHNOLOGY_BRANCH_IDS_V6) {
      const option = this.#document.createElement("option");
      option.value = branch;
      option.textContent = title(branch);
      branchSelect.append(option);
    }
    branchSelect.onchange = () => {
      const branch = this.#root.querySelector<HTMLElement>(
        `[data-tech-branch="${branchSelect.value}"]`,
      );
      branch?.scrollIntoView?.({ block: "start" });
    };
    branchNavigation.append(branchSelect);

    const overview = el(this.#document, "section", "v6-tech-overview");
    overview.setAttribute("aria-labelledby", "v6-tech-overview-heading");
    const overviewHeading = text(
      this.#document,
      "h2",
      "Five branches",
      "sr-only",
    );
    overviewHeading.id = "v6-tech-overview-heading";
    const relationshipSummary = text(
      this.#document,
      "p",
      tree.nodes
        .map((node) =>
          node.prerequisites.length === 0
            ? `${title(node.id)} is a root technology.`
            : `${title(node.id)} requires ${node.prerequisites.map(title).join(" and ")}.`,
        )
        .join(" "),
      "sr-only",
    );
    relationshipSummary.id = "v6-tech-relationships";
    const baselineRole = tree.roleBindings.FIGHTER.label;
    const baseline = text(
      this.#document,
      "p",
      `${baselineRole} is the baseline role; no technology is required. Gathering begins researched.`,
      "v6-tech-baseline",
    );

    const columns = el(this.#document, "div", "v6-tech-tree");
    columns.dataset.techTree = tree.id;
    columns.setAttribute("role", "tree");
    columns.setAttribute(
      "aria-label",
      `${title(tree.faction)} technology tree`,
    );
    columns.setAttribute("aria-describedby", relationshipSummary.id);
    for (const branchId of TECHNOLOGY_BRANCH_IDS_V6) {
      const branch = el(this.#document, "section", "v6-tech-branch");
      branch.dataset.techBranch = branchId;
      branch.setAttribute("role", "group");
      branch.setAttribute(
        "aria-labelledby",
        `v6-tech-branch-${branchId.toLowerCase()}`,
      );
      const branchHeading = text(
        this.#document,
        "h2",
        title(branchId),
        "v6-tech-branch-heading",
      );
      branchHeading.id = `v6-tech-branch-${branchId.toLowerCase()}`;
      const list = el(this.#document, "ol", "v6-tech-card-list");
      list.setAttribute("role", "group");
      const branchLayout = technologyTreeLayoutV6(
        tree.nodes.filter((candidate) => candidate.branch === branchId),
      );
      for (const [index, layoutNode] of branchLayout.entries()) {
        list.append(
          this.#technologyTreeItem(layoutNode, index + 1, branchLayout.length),
        );
      }
      branch.append(branchHeading, list);
      columns.append(branch);
    }
    overview.append(overviewHeading, relationshipSummary, baseline, columns);
    content.append(header, branchNavigation, overview);
    main.append(content);

    if (this.#selectedTechnology !== null) {
      const selected = tree.nodes.find(
        (node) => node.id === this.#selectedTechnology,
      );
      if (selected !== undefined) main.append(this.#technologyDetail(selected));
    }
    return main;
  }

  #technologyTreeItem(
    layoutNode: TechnologyTreeLayoutNodeV6,
    position: number,
    setSize: number,
  ): HTMLElement {
    const item = el(this.#document, "li", "v6-tech-card-item");
    item.dataset.tier = String(layoutNode.node.tier);
    if (layoutNode.parentId !== null)
      item.dataset.parentTech = layoutNode.parentId;
    item.append(this.#technologyCard(layoutNode.node, position, setSize));
    if (layoutNode.children.length > 0) {
      const children = el(this.#document, "ol", "v6-tech-children");
      children.setAttribute("role", "group");
      children.setAttribute(
        "aria-label",
        `Technologies unlocked by ${title(layoutNode.node.id)}`,
      );
      children.style.setProperty(
        "--v6-tech-child-count",
        String(layoutNode.children.length),
      );
      if (layoutNode.children.length > 1) children.classList.add("is-branched");
      for (const [index, child] of layoutNode.children.entries()) {
        children.append(
          this.#technologyTreeItem(
            child,
            index + 1,
            layoutNode.children.length,
          ),
        );
      }
      item.append(children);
    }
    return item;
  }

  #technologyCard(
    node: PublicTechnologyNodeV6,
    position: number,
    setSize: number,
  ): HTMLButtonElement {
    const offered = exactResearchCommand(
      this.#snapshot.offeredCommands,
      node.id,
    );
    const state = technologyState(
      node,
      offered !== undefined,
      this.#snapshot.view?.viewer.coins ?? 0,
    );
    const card = button(this.#document, "", `v6-tech-card ${state.kind}`);
    card.dataset.tech = node.id;
    card.dataset.state = state.kind;
    card.dataset.semanticStatus = state.label;
    card.dataset.focusId = `tech-${node.id.toLowerCase()}`;
    card.setAttribute("role", "treeitem");
    card.setAttribute("aria-level", String(node.tier));
    card.setAttribute("aria-posinset", String(position));
    card.setAttribute("aria-setsize", String(setSize));
    card.setAttribute("aria-haspopup", "dialog");
    card.setAttribute(
      "aria-expanded",
      String(this.#selectedTechnology === node.id),
    );
    const accessibleCost =
      node.state === "OWNED" ? "" : `, costs ${node.cost} Coins`;
    card.ariaLabel = `${title(node.id)}, ${title(node.branch)} branch, tier ${node.tier}${accessibleCost}, ${state.label}. Open details.`;
    const symbol = actionSymbolNode(
      this.#document,
      technologySymbol(
        node.id,
        this.#snapshot.view?.viewer.faction ?? "ORIGINAL",
      ),
    );
    symbol.classList.add("v6-tech-card-symbol");
    const copy = el(this.#document, "span", "v6-tech-card-copy");
    copy.append(
      text(this.#document, "strong", title(node.id), "v6-tech-card-name"),
    );
    if (node.state !== "OWNED") {
      copy.append(
        text(this.#document, "span", `${node.cost} Coins`, "v6-tech-card-cost"),
      );
    }
    card.append(symbol, copy);
    card.onclick = () => {
      this.#selectedTechnology = node.id;
      this.#pendingFocusSelector = '[data-focus-id="tech-detail"]';
      this.#render();
    };
    return card;
  }

  #technologyDetail(node: PublicTechnologyNodeV6): HTMLElement {
    const backdrop = el(this.#document, "div", "v6-tech-detail-backdrop");
    backdrop.onclick = (event) => {
      if (event.target === backdrop) this.#closeTechnologyDetail();
    };
    const detail = el(this.#document, "section", "v6-tech-detail");
    detail.dataset.techDetail = node.id;
    detail.dataset.focusId = "tech-detail";
    detail.tabIndex = -1;
    detail.setAttribute("role", "dialog");
    detail.setAttribute("aria-modal", "true");
    detail.setAttribute("aria-labelledby", "v6-tech-detail-heading");
    detail.setAttribute("aria-describedby", "v6-tech-detail-status");

    const close = button(
      this.#document,
      "Close",
      "secondary-action v6-tech-detail-close",
    );
    close.dataset.action = "close-tech-detail";
    close.onclick = () => this.#closeTechnologyDetail();
    const heading = text(
      this.#document,
      "h2",
      title(node.id),
      "v6-tech-detail-heading",
    );
    heading.id = "v6-tech-detail-heading";
    const offered = exactResearchCommand(
      this.#snapshot.offeredCommands,
      node.id,
    );
    const viewerCoins = this.#snapshot.view?.viewer.coins ?? 0;
    const state = technologyState(node, offered !== undefined, viewerCoins);
    const status = text(
      this.#document,
      "p",
      `${node.cost} Coins · ${state.label}`,
      `v6-tech-detail-status ${state.kind}`,
    );
    status.id = "v6-tech-detail-status";
    const facts = el(this.#document, "dl", "v6-tech-detail-facts");
    facts.append(
      text(this.#document, "dt", "Branch"),
      text(this.#document, "dd", `${title(node.branch)} · tier ${node.tier}`),
      text(this.#document, "dt", "Prerequisite"),
      text(
        this.#document,
        "dd",
        node.prerequisites.length === 0
          ? "None — root technology"
          : node.prerequisites.map(title).join(", "),
      ),
    );
    const unlockHeading = text(this.#document, "h3", "Exact unlocks");
    const unlocks = el(this.#document, "ul", "v6-tech-unlock-list");
    for (const effect of node.effects) {
      unlocks.append(
        text(
          this.#document,
          "li",
          technologyUnlockLabel(
            node,
            effect,
            this.#snapshot.view?.viewer.faction ?? "ORIGINAL",
          ),
        ),
      );
    }
    detail.append(close, heading, status, facts, unlockHeading, unlocks);
    if (offered !== undefined) {
      const research = this.#actionButton(
        offered,
        `Research ${title(node.id)} · ${node.cost} Coins`,
        {
          symbol: technologySymbol(
            node.id,
            this.#snapshot.view?.viewer.faction ?? "ORIGINAL",
          ),
          className: "v6-tech-research-action",
          accessibleLabel: `Research ${title(node.id)} for ${node.cost} Coins`,
        },
      );
      research.dataset.action = "research-tech";
      research.dataset.focusId = `research-${node.id.toLowerCase()}`;
      research.onclick = () => {
        this.#pendingFocusSelector = '[data-focus-id="tech-detail"]';
        void this.#dispatch(offered);
      };
      detail.append(research);
    }
    detail.append(
      text(
        this.#document,
        "p",
        `${viewerCoins} Coins available. Technology costs update with owned-city count.`,
        "v6-tech-cost-note",
      ),
    );
    backdrop.append(detail);
    return backdrop;
  }

  #closeTechnologyDetail(): void {
    const selected = this.#selectedTechnology;
    this.#selectedTechnology = null;
    if (selected !== null) {
      this.#pendingFocusSelector = `[data-focus-id="tech-${selected.toLowerCase()}"]`;
    }
    this.#render();
  }

  #trapTechnologyDetailFocus(event: KeyboardEvent): void {
    const detail = this.#root.querySelector<HTMLElement>("[data-tech-detail]");
    if (detail === null) return;
    const focusable = [
      ...detail.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ];
    if (focusable.length === 0) {
      detail.focus({ preventScroll: true });
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && this.#document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (
      !event.shiftKey &&
      (this.#document.activeElement === last ||
        this.#document.activeElement === detail ||
        !detail.contains(this.#document.activeElement))
    ) {
      first.focus();
      event.preventDefault();
    }
  }

  #mountBoard(view: PlayerViewV6): void {
    const container = this.#root.querySelector<HTMLElement>("[data-v6-board]");
    if (container === null) return;
    this.#boardHost.mount(container, {
      onSelection: (selection) => {
        if (this.#hasMandatoryChoice()) return;
        this.#selection = selection;
        this.#targetMode = null;
        this.#commandChoices = [];
        this.#render();
      },
      onInspect: (selection) => {
        if (this.#hasMandatoryChoice()) return;
        this.#selection = selection;
        this.#notice = describeSelection(view, selection);
        this.#render();
      },
      onCommandCandidates: (candidates) => {
        if (this.#hasMandatoryChoice()) return;
        const mapCandidates = candidates.filter(
          (candidate) =>
            candidate.command.kind !== "RESEARCH" &&
            candidate.command.kind !== "END_TURN",
        );
        const positional = mapCandidates.filter(
          (candidate) =>
            candidate.command.kind === "MOVE" ||
            candidate.command.kind === "ATTACK",
        );
        const exact =
          positional[0] === undefined ? mapCandidates : [positional[0]];
        if (exact.length === 1 && exact[0] !== undefined) {
          void this.#dispatch(exact[0].command);
        } else if (exact.length > 1) {
          this.#commandChoices = [...exact];
          this.#render();
        }
      },
      onZoom: (direction) => {
        if (this.#hasMandatoryChoice()) return;
        this.#notice = `Zoomed ${direction.toLowerCase()}.`;
      },
      onCancel: () => {
        if (this.#hasMandatoryChoice()) return;
        this.#targetMode = null;
        this.#commandChoices = [];
        this.#render();
      },
      onCombatPresentationComplete: (key) => {
        if (this.#combatQueue[0]?.key !== key) return;
        this.#combatQueue = this.#combatQueue.slice(1);
        this.#render();
      },
    });
    const combatPresentation = this.#combatQueue[0] ?? null;
    this.#boardHost.update({
      matchInstanceId: this.#matchInstanceId,
      view,
      interactive:
        canHumanAct(this.#snapshot) &&
        combatPresentation === null &&
        view.pendingChoices.length === 0,
      motion: this.#prefersReducedMotion ? "REDUCED" : "FULL",
      combatPresentation,
      interaction: {
        ...EMPTY_BOARD_RENDER_INTERACTION_V6,
        selection: this.#selection,
        targetMode: this.#targetMode,
        readyUnitIds: readyUnitIdsFromOfferedMovesV6(
          this.#snapshot.offeredCommands,
        ),
      },
    });
  }

  #normalActionPanel(view: PlayerViewV6): HTMLElement {
    const panel = el(this.#document, "div", "v6-action-panel");
    panel.append(this.#selectionIdentity(view));
    const selection = this.#selection;
    if (selection?.kind === "CITY") {
      const city = view.cities.find(
        (candidate) => candidate.id === selection.cityId,
      );
      if (city !== undefined) panel.append(this.#cityPopulationLayer(city));
    }
    const selected = selectedCommands(
      view,
      this.#snapshot.offeredCommands,
      this.#selection,
    );
    if (selected.length === 0) {
      panel.append(
        text(
          this.#document,
          "p",
          this.#selection === null
            ? "Select a unit, city, or tile to see its actions."
            : "No actions are available for this selection.",
          "v6-action-empty",
        ),
      );
    } else {
      panel.append(this.#contextCommandList(view, selected));
    }
    return panel;
  }

  #selectionIdentity(view: PlayerViewV6): HTMLElement {
    const presentation = selectionIdentityPresentationV6(view, this.#selection);
    const identity = el(this.#document, "section", "v6-selection-identity");
    identity.dataset.selectionKind = presentation.kind;
    identity.setAttribute("aria-label", presentation.accessibleLabel);

    const artwork = selectionIdentityArtworkNode(this.#document, presentation);
    const copy = el(this.#document, "span", "v6-selection-identity-copy");
    copy.append(
      text(
        this.#document,
        "h2",
        presentation.title,
        "v6-selection-identity-title",
      ),
    );
    if (presentation.detail !== null) {
      copy.append(
        text(
          this.#document,
          "span",
          presentation.detail,
          "v6-selection-identity-detail",
        ),
      );
    }
    identity.append(artwork, copy);
    return identity;
  }

  #cityPopulationLayer(city: PlayerViewV6["cities"][number]): HTMLElement {
    const presentation = cityPopulationPresentationV6(city);
    const wrapper = el(this.#document, "div", "v6-city-population-progress");
    wrapper.dataset.cityPopulation = String(city.id);
    wrapper.dataset.populationProgress = String(presentation.progress);
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", presentation.accessibleText);

    const squares = el(this.#document, "span", "v6-city-population-squares");
    squares.setAttribute("aria-hidden", "true");
    for (const [index, state] of presentation.squares.entries()) {
      const square = el(this.#document, "span", "v6-city-population-square");
      square.dataset.populationSquare = String(index + 1);
      square.dataset.state = state.toLowerCase();
      squares.append(square);
    }
    const copy =
      presentation.deficit > 0
        ? `${presentation.deficit} population deficit · replace before growth`
        : `${presentation.accumulated}/${presentation.required} to level ${presentation.nextLevel}`;
    wrapper.append(
      actionSymbolNode(
        this.#document,
        acceptedSymbol(
          presentation.deficit > 0
            ? RULESET6_HUD_ART_IDS.NEGATIVE_POPULATION
            : RULESET6_HUD_ART_IDS.POPULATION,
          presentation.deficit > 0 ? "!" : "●",
        ),
      ),
      squares,
      text(this.#document, "span", copy, "v6-city-population-copy"),
    );
    return wrapper;
  }

  #contextCommandList(
    view: PlayerViewV6,
    commands: readonly CommandV6[],
  ): HTMLElement {
    const list = el(this.#document, "div", "v6-command-list");
    list.setAttribute("aria-label", "Selection actions");
    for (const group of groupContextCommands(commands)) {
      const command = group[0];
      if (command === undefined) continue;
      const presentation = contextActionPresentation(view, command);
      const item = this.#actionButton(command, presentation.label, {
        symbol: presentation.symbol,
        ...(command.kind === "TRAIN" ? { className: "v6-train-action" } : {}),
        ...(presentation.accessibleLabel === undefined
          ? {}
          : { accessibleLabel: presentation.accessibleLabel }),
      });
      if (isMapTargetFamily(command)) {
        delete item.dataset.command;
        item.dataset.commandFamily = command.kind;
        item.onclick = () => this.#prepareCommandFamily(command);
      }
      list.append(item);
    }
    return list;
  }

  #actionButton(
    command: CommandV6,
    label: string,
    options: {
      readonly symbol: ActionSymbol;
      readonly className?: string;
      readonly accessibleLabel?: string;
    },
  ): HTMLButtonElement {
    const item = button(
      this.#document,
      "",
      `v6-command-button${options.className === undefined ? "" : ` ${options.className}`}`,
    );
    item.dataset.command = canonicalJson(command);
    item.dataset.commandKind = command.kind;
    item.disabled = this.#snapshot.transitioning;
    item.ariaLabel = options.accessibleLabel ?? label;
    item.append(
      actionSymbolNode(this.#document, options.symbol),
      text(this.#document, "span", label, "v6-command-label"),
    );
    item.onclick = () => this.#prepareOrDispatch(command);
    return item;
  }

  #prepareCommandFamily(command: CommandV6): void {
    this.#targetMode = null;
    if (
      command.kind === "KAMIKAZE_ROLL" ||
      command.kind === "BUILD_CHOCOLATE_WALL"
    ) {
      this.#selection = { kind: "UNIT", unitId: command.unitId };
      this.#targetMode = { kind: command.kind, unitId: command.unitId };
    }
    const view = this.#snapshot.view;
    if (view === null) return;
    this.#notice = `${contextActionPresentation(view, command).label}: choose a highlighted target on the map.`;
    this.#render();
  }

  #mandatoryChoiceDialog(view: PlayerViewV6): HTMLElement {
    const choice = view.pendingChoices[0];
    const backdrop = el(this.#document, "div", "v6-mandatory-backdrop");
    backdrop.dataset.mandatoryChoiceOverlay = "true";
    backdrop.onpointerdown = (event) => {
      if (event.target === backdrop) event.preventDefault();
    };

    const dialog = el(this.#document, "section", "v6-mandatory-dialog");
    dialog.dataset.mandatoryChoice = choice?.kind ?? "UNKNOWN";
    dialog.dataset.focusId = "mandatory-dialog";
    dialog.tabIndex = -1;
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "v6-mandatory-heading");
    dialog.setAttribute("aria-describedby", "v6-mandatory-context");
    dialog.append(
      text(
        this.#document,
        "p",
        `Choice 1 of ${view.pendingChoices.length}`,
        "v6-choice-position",
      ),
      text(this.#document, "p", "Required before play continues", "v6-eyebrow"),
    );
    const heading = text(this.#document, "h2", mandatoryChoiceHeading(choice));
    heading.id = "v6-mandatory-heading";
    const context = text(
      this.#document,
      "p",
      mandatoryChoiceContext(choice),
      "v6-mandatory-context",
    );
    context.id = "v6-mandatory-context";
    dialog.append(heading, context);

    const options = el(this.#document, "div", "v6-mandatory-options");
    options.setAttribute("role", "group");
    options.setAttribute("aria-label", "Required choices");
    if (choice?.kind === "CITY_REWARD") {
      for (const reward of choice.candidates) {
        options.append(this.#cityRewardOption(view, choice, reward));
      }
    } else if (choice?.kind === "CANDIFY_CITY") {
      for (const cityId of [...choice.candidateCityIds].sort(
        (left, right) => left - right,
      )) {
        options.append(this.#candifyCityOption(view, choice, cityId));
      }
    }
    dialog.append(options);
    backdrop.append(dialog);
    return backdrop;
  }

  #cityRewardOption(
    view: PlayerViewV6,
    choice: Extract<PendingChoiceV6, { readonly kind: "CITY_REWARD" }>,
    reward: RewardIdV6,
  ): HTMLElement {
    const command = this.#snapshot.offeredCommands.find(
      (
        candidate,
      ): candidate is Extract<
        CommandV6,
        { readonly kind: "CHOOSE_CITY_REWARD" }
      > =>
        candidate.kind === "CHOOSE_CITY_REWARD" &&
        candidate.cityId === choice.cityId &&
        candidate.reachedLevel === choice.reachedLevel &&
        candidate.reward === reward,
    );
    const presentation = rewardPresentation(view, reward);
    return this.#mandatoryOption(
      command,
      presentation.label,
      presentation.effect,
      presentation.symbol,
      command === undefined ? rewardUnavailableReason(reward) : undefined,
      `reward-${reward.toLowerCase()}`,
    );
  }

  #candifyCityOption(
    view: PlayerViewV6,
    choice: Extract<PendingChoiceV6, { readonly kind: "CANDIFY_CITY" }>,
    cityId: number,
  ): HTMLElement {
    const command = this.#snapshot.offeredCommands.find(
      (
        candidate,
      ): candidate is Extract<
        CommandV6,
        { readonly kind: "CHOOSE_CANDIFY_CITY" }
      > =>
        candidate.kind === "CHOOSE_CANDIFY_CITY" &&
        candidate.unitId === choice.unitId &&
        candidate.cityId === cityId,
    );
    const city = view.cities.find((candidate) => candidate.id === cityId);
    const label = city === undefined ? `City ${cityId}` : `City ${city.id}`;
    const effect =
      city === undefined
        ? "Assign this Candify action to the authoritative candidate city."
        : `Assign Candify to city ${city.id} at ${coordLabel(city.at)} · ${city.expanded ? "5 × 5 expanded" : "3 × 3"} footprint.`;
    const option = this.#mandatoryOption(
      command,
      label,
      effect,
      acceptedSymbol("ui-action-choose-candify-city", "⌂"),
      command === undefined
        ? candifyUnavailableReason(view, choice.unitId, cityId)
        : undefined,
      `candify-city-${cityId}`,
    );
    if (city !== undefined)
      option.append(candifyTerritoryPreview(this.#document, view, city));
    return option;
  }

  #mandatoryOption(
    command: CommandV6 | undefined,
    label: string,
    effect: string,
    symbol: ActionSymbol,
    unavailableReason: string | undefined,
    focusId: string,
  ): HTMLElement {
    const option =
      command === undefined
        ? el(this.#document, "div", "v6-mandatory-option is-unavailable")
        : button(this.#document, "", "v6-mandatory-option");
    option.dataset.choiceOption = focusId;
    option.append(actionSymbolNode(this.#document, symbol));
    const copy = el(this.#document, "span", "v6-mandatory-option-copy");
    copy.append(
      text(this.#document, "strong", label, "v6-mandatory-option-label"),
      text(this.#document, "span", effect, "v6-mandatory-option-effect"),
    );
    if (unavailableReason !== undefined) {
      option.setAttribute("role", "group");
      option.setAttribute("aria-disabled", "true");
      copy.append(
        text(
          this.#document,
          "span",
          unavailableReason,
          "v6-mandatory-unavailable",
        ),
      );
    }
    option.append(copy);
    if (command !== undefined && option instanceof HTMLButtonElement) {
      option.dataset.command = canonicalJson(command);
      option.dataset.commandKind = command.kind;
      option.dataset.mandatoryChoiceAction = "true";
      option.dataset.focusId = `mandatory-${focusId}`;
      option.disabled = this.#snapshot.transitioning;
      option.ariaLabel = `${label}. ${effect}`;
      option.onclick = () => void this.#dispatch(command);
    }
    return option;
  }

  #trapMandatoryChoiceFocus(event: KeyboardEvent): void {
    const dialog = this.#root.querySelector<HTMLElement>(
      "[data-mandatory-choice]",
    );
    if (dialog === null) return;
    const focusable = [
      ...dialog.querySelectorAll<HTMLElement>(
        "[data-mandatory-choice-action]:not([disabled])",
      ),
    ];
    if (focusable.length === 0) {
      dialog.focus({ preventScroll: true });
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && this.#document.activeElement === first) {
      last.focus();
      event.preventDefault();
    } else if (
      !event.shiftKey &&
      (this.#document.activeElement === last ||
        this.#document.activeElement === dialog ||
        !dialog.contains(this.#document.activeElement))
    ) {
      first.focus();
      event.preventDefault();
    }
  }

  #commandChoiceDialog(): HTMLElement {
    const dialog = el(this.#document, "section", "v6-command-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Choose exact map action");
    dialog.append(text(this.#document, "h2", "Choose an action"));
    for (const target of this.#commandChoices) {
      const item = this.#actionButton(
        target.command,
        commandLabel(target.command),
        { symbol: commandSymbol(target.command) },
      );
      item.onclick = () => void this.#dispatch(target.command);
      dialog.append(item);
    }
    const cancel = button(this.#document, "Cancel", "secondary-action");
    cancel.onclick = () => {
      this.#commandChoices = [];
      this.#render();
    };
    dialog.append(cancel);
    return dialog;
  }

  #resultPanel(view: PlayerViewV6): HTMLElement {
    const panel = el(this.#document, "div", "v6-result-panel");
    const won =
      view.outcome?.kind !== "DEFEAT" &&
      view.outcome?.winnerId === view.viewer.id;
    panel.append(
      text(this.#document, "p", "Final map · read only", "v6-eyebrow"),
      text(this.#document, "h2", won ? "Victory" : "Defeat"),
      text(
        this.#document,
        "p",
        `Round ${view.round} · ${view.viewer.coins} Coins · ${view.cities.filter((city) => city.ownerId === view.viewer.id).length} cities`,
      ),
    );
    const restart = button(
      this.#document,
      "Play this setup again",
      "primary-action",
    );
    restart.onclick = () => void this.#restart();
    panel.append(restart);
    return panel;
  }

  #prepareOrDispatch(command: CommandV6): void {
    if (
      this.#hasMandatoryChoice() &&
      command.kind !== "CHOOSE_CITY_REWARD" &&
      command.kind !== "CHOOSE_CANDIFY_CITY"
    ) {
      return;
    }
    void this.#dispatch(command);
  }

  async #dispatch(command: CommandV6): Promise<void> {
    if (
      this.#hasMandatoryChoice() &&
      command.kind !== "CHOOSE_CITY_REWARD" &&
      command.kind !== "CHOOSE_CANDIFY_CITY"
    ) {
      return;
    }
    if (!isStillOffered(this.#controller.snapshot(), command)) {
      this.#error =
        "That action is no longer offered. The action list was refreshed.";
      this.#render();
      return;
    }
    this.#error = null;
    this.#commandChoices = [];
    const result = await this.#controller.dispatch(command);
    if (this.#destroyed) return;
    if (!result.accepted) {
      this.#error = `Action rejected: ${result.reason}${result.error === undefined ? "" : ` (${result.error.code})`}.`;
      this.#render();
      return;
    }
    this.#enqueueCombatBoundaries([result.presentationBoundary]);
    this.#notice = `${commandLabel(command)} completed.`;
    this.#targetMode = null;
    this.#validatePresentation(this.#controller.snapshot().view);
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #progressAiIfNeeded(): Promise<void> {
    if (this.#destroyed) return;
    const snapshot = this.#controller.snapshot();
    if (snapshot.phase !== "ACTIVE" || snapshot.view === null) return;
    const active = snapshot.view.turnOrder[snapshot.view.activeSeatIndex];
    if (active === snapshot.view.viewer.id) return;
    this.#notice = "AI turns are progressing…";
    this.#render();
    const result = await this.#controller.progressAiTurns();
    if (this.#destroyed) return;
    if (!result.ok)
      this.#error = `AI progression stopped: ${result.diagnostic}`;
    else {
      this.#enqueueCombatBoundaries(result.presentationBoundaries);
      this.#notice = `AI completed ${result.acceptedCommands} action${result.acceptedCommands === 1 ? "" : "s"}. Your turn.`;
    }
    this.#render();
  }

  async #launch(setup: MatchSetupV6, replace: boolean): Promise<void> {
    this.#error = null;
    const result = await this.#controller.launch(setup, {
      replaceStoredMatch: replace,
    });
    if (this.#destroyed) return;
    if (!result.ok) {
      this.#error = result.diagnostic;
      this.#render();
      return;
    }
    this.#matchInstanceId += 1;
    this.#resetPresentation();
    this.#notice = `${title(setup.factions[0] ?? "ORIGINAL")} match launched.`;
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #resume(): Promise<void> {
    this.#error = null;
    const resumed = await this.#controller.resume();
    if (this.#destroyed) return;
    if (!resumed) {
      this.#error = "The saved match could not be resumed.";
      this.#render();
      return;
    }
    this.#matchInstanceId += 1;
    this.#resetPresentation();
    this.#notice = "Saved match resumed.";
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #restart(): Promise<void> {
    if (this.#hasMandatoryChoice()) return;
    this.#combatQueue = [];
    const result = await this.#controller.restart();
    if (this.#destroyed) return;
    if (!result.ok) {
      this.#error = result.diagnostic;
      this.#render();
      return;
    }
    this.#matchInstanceId += 1;
    this.#resetPresentation();
    this.#notice = "The match restarted from its original setup.";
    this.#render();
    await this.#progressAiIfNeeded();
  }

  async #deleteSave(): Promise<void> {
    if (this.#hasMandatoryChoice()) return;
    this.#combatQueue = [];
    const deleted = await this.#controller.deleteStoredSave();
    if (this.#destroyed) return;
    if (!deleted) {
      this.#error = "The saved match could not be deleted.";
      this.#render();
      return;
    }
    this.#matchInstanceId += 1;
    this.#resetPresentation();
    this.#notice = "Saved match deleted.";
    this.#render();
  }

  #readDraft(form: HTMLElement): void {
    const aiCount = Number(fieldValue(form, "v6-ai-count")) as 1 | 2 | 3;
    const factions = Array.from(
      { length: aiCount + 1 },
      (_, seat) =>
        (fieldValue(form, `v6-faction-${seat}`) ||
          (seat === 0 ? "ORIGINAL" : "CANDY")) as FactionIdV6,
    );
    const requested = Number(fieldValue(form, "v6-board-size"));
    const sizes = compatibleSizes(aiCount);
    const boardSize = sizes.includes(requested as (typeof BOARD_SIZES)[number])
      ? (requested as (typeof BOARD_SIZES)[number])
      : (sizes[0] ?? 16);
    this.#draft = {
      aiCount,
      aiMode: fieldValue(form, "v6-ai-mode") as "RIVAL" | "COOPERATIVE",
      boardSize,
      seedText: fieldValue(form, "v6-seed"),
      humanColor: fieldValue(form, "v6-color") as PlayerColorV6,
      factions,
    };
    if (form.querySelectorAll("[data-faction-seat]").length !== aiCount + 1)
      this.#render();
  }

  #validatePresentation(view: PlayerViewV6 | null): void {
    if (view === null) {
      this.#resetPresentation();
      return;
    }
    if (view.pendingChoices.length > 0) {
      this.#screen = "MATCH";
      this.#selectedTechnology = null;
      this.#selection = null;
      this.#targetMode = null;
      this.#commandChoices = [];
      return;
    }
    if (
      this.#selection !== null &&
      selectionCoordV6(view, this.#selection) === null
    )
      this.#selection = null;
    if (
      this.#commandChoices.some(
        (choice) => !isStillOffered(this.#snapshot, choice.command),
      )
    )
      this.#commandChoices = [];
  }

  #hasMandatoryChoice(): boolean {
    return (
      this.#snapshot.phase === "ACTIVE" &&
      this.#snapshot.view !== null &&
      this.#snapshot.view.pendingChoices.length > 0
    );
  }

  #updateMandatoryFocus(previousFocusId: string | undefined): void {
    const nextChoice = this.#hasMandatoryChoice()
      ? (this.#snapshot.view?.pendingChoices[0] ?? null)
      : null;
    const nextKey = nextChoice === null ? null : canonicalJson(nextChoice);
    if (nextKey !== null && this.#mandatoryChoiceKey === null) {
      this.#mandatoryReturnFocusId = previousFocusId ?? null;
      this.#pendingFocusSelector =
        "[data-mandatory-choice-action]:not([disabled])";
    } else if (
      nextKey !== null &&
      this.#mandatoryChoiceKey !== null &&
      nextKey !== this.#mandatoryChoiceKey
    ) {
      this.#pendingFocusSelector =
        "[data-mandatory-choice-action]:not([disabled])";
    } else if (nextKey === null && this.#mandatoryChoiceKey !== null) {
      if (this.#mandatoryReturnFocusId !== null) {
        this.#pendingFocusSelector = `[data-focus-id="${cssEscape(this.#mandatoryReturnFocusId)}"]`;
      } else {
        this.#pendingFocusSelector = null;
        this.#restoreBoardFocus = true;
      }
      this.#mandatoryReturnFocusId = null;
    }
    this.#mandatoryChoiceKey = nextKey;
  }

  #resetPresentation(): void {
    this.#selection = null;
    this.#targetMode = null;
    this.#commandChoices = [];
    this.#error = null;
    this.#screen = "MATCH";
    this.#selectedTechnology = null;
    this.#pendingFocusSelector = null;
    this.#combatQueue = [];
  }

  #enqueueCombatBoundaries(
    boundaries: readonly {
      readonly events: readonly DomainEventV6[];
      readonly beforeView: PlayerViewV6 | null;
      readonly afterView: PlayerViewV6 | null;
    }[],
  ): void {
    const motion = this.#prefersReducedMotion ? "REDUCED" : "FULL";
    const additions = boundaries.flatMap((boundary) =>
      boundary.beforeView === null
        ? []
        : combatPresentationsFromEventsV6(
            boundary.beforeView,
            boundary.events,
            boundary.afterView?.commandIndex ??
              boundary.beforeView.commandIndex + 1,
            motion,
          ),
    );
    if (additions.length === 0) return;
    this.#combatQueue = Object.freeze([...this.#combatQueue, ...additions]);
    this.#render();
  }
}

function exactResearchCommand(
  commands: readonly CommandV6[],
  technology: TechnologyId,
): Extract<CommandV6, { readonly kind: "RESEARCH" }> | undefined {
  return commands.find(
    (command): command is Extract<CommandV6, { readonly kind: "RESEARCH" }> =>
      command.kind === "RESEARCH" && command.tech === technology,
  );
}

function technologyState(
  node: PublicTechnologyNodeV6,
  researchOffered: boolean,
  viewerCoins: number,
): { readonly kind: string; readonly label: string } {
  if (node.state === "OWNED")
    return { kind: "researched", label: "Researched" };
  if (node.state === "BLOCKED") {
    return {
      kind: "unavailable",
      label: `Locked — research ${node.missingPrerequisites.map(title).join(", ")} first`,
    };
  }
  if (!node.affordable) {
    return {
      kind: "unavailable",
      label: `Need ${Math.max(0, node.cost - viewerCoins)} more Coins`,
    };
  }
  return researchOffered
    ? { kind: "available", label: "Available to research" }
    : {
        kind: "unavailable",
        label: "View only — research is not currently offered",
      };
}

function technologySymbol(
  technology: TechnologyId,
  faction: FactionIdV6,
): ActionSymbol {
  return acceptedSymbol(technologyArtIdV6(faction, technology), "?");
}

const TECHNOLOGY_COMMAND_UNLOCK_LABELS: Readonly<
  Record<
    Extract<TechnologyUnlockV6, { readonly kind: "COMMAND" }>["command"],
    string
  >
> = {
  HARVEST_FRUIT:
    "Harvest Fruit: pay 2 Coins on Grass with Fruit for +1 permanent population.",
  HUNT_GAME:
    "Hunt Game: pay 2 Coins on Forest with Game for +1 permanent population.",
  BUILD_FARM:
    "Build Farm: pay 5 Coins on Grass with Fertile Ground for +2 live population.",
  BUILD_LUMBER_CAMP:
    "Build Lumber Camp: pay 3 Coins on an empty Forest for +1 live population.",
  BUILD_MINE:
    "Build Mine: pay 5 Coins only on a Mountain with Ore for +2 live population.",
  BUILD_QUARRY:
    "Build Quarry: pay 4 Coins only on a Mountain with Stone for +1 live population.",
  BUILD_WINDMILL: "Build Windmill for 5 Coins beside a Farm.",
  BUILD_SAWMILL: "Build Sawmill for 5 Coins beside a Lumber Camp.",
  BUILD_FORGE: "Build Forge for 5 Coins.",
  BUILD_STONEWORKS: "Build Stoneworks for 5 Coins.",
  BUILD_WORKSHOP:
    "Build Workshop for 4 Coins beside at least two distinct basic improvement types.",
  BUILD_GRAND_WORKS:
    "Build Grand Works for 7 Coins beside at least three distinct processor types.",
  BUILD_MARKET:
    "Build Market for 7 Coins beside at least two distinct economic families.",
  CLEAR_FOREST:
    "Clear Forest: remove an empty Forest for no cost and gain exactly 1 Coin.",
  REPLANT_FOREST:
    "Replant Forest: pay 4 Coins to change an empty Grass tile to Forest.",
  BUILD_ROAD:
    "Build Road: pay 2 Coins on an owned non-settlement tile; it grants no population.",
  REDEVELOP:
    "Redevelop: remove one owned economic improvement for no cost or refund; terrain and Road remain.",
};

function technologyUnlockLabel(
  node: PublicTechnologyNodeV6,
  unlock: TechnologyUnlockV6,
  faction: FactionIdV6,
): string {
  switch (unlock.kind) {
    case "COMMAND":
      return TECHNOLOGY_COMMAND_UNLOCK_LABELS[unlock.command];
    case "RESOURCE_REVEAL":
      return `Reveals ${joinLabels(unlock.resources.map(title))} on explored tiles.`;
    case "UNIT_ROLE": {
      const role =
        node.unlockedRoleRules.find(
          (candidate) => candidate.role === unlock.role,
        ) ?? null;
      const label = role?.label ?? title(unlock.role);
      if (unlock.role === "RAIDER" && label === "Donut") {
        return "Unlocks Donut: costs 3 Coins and uses Kamikaze Roll, Candify, and Capture; it does not Attack or Charge.";
      }
      if (unlock.role === "RAIDER") {
        return "Unlocks Raider: costs 4 Coins and uses Attack, Capture, and Charge (+1 attack after moving).";
      }
      return `Unlocks the ${label} role${role?.cost === null || role?.cost === undefined ? "." : ` for ${role.cost} Coins.`}`;
    }
    case "ECONOMIC_FORMULA":
      return economicFormulaLabel(unlock);
    case "CONNECTED_FARM_VISUALS":
      return "Orthogonally connected same-city Farms merge visually; this never changes their value.";
    case "FOREST_MOVEMENT_FREEDOM":
      return `${joinLabels(unlock.roles.map((role) => nodeRoleLabel(node, role, faction)))} can cross Forest without ending movement.`;
    case "MOUNTAIN_MOVEMENT":
      return "Allows units to enter Mountain terrain.";
    case "HIGH_GROUND_VISION":
      return `Units on Mountain gain +${unlock.radiusBonus} sight radius.`;
    case "ROLE_SIGHT":
      return `${nodeRoleLabel(node, unlock.role, faction)} has sight radius ${unlock.radius}.`;
    case "ROAD_MOVEMENT":
      return "Road movement: an ordinary adjacent step costs 2 half-step points; a connected orthogonal Road/city-center step costs 1.";
    case "MARKET_CAPITAL_ROAD_BONUS":
      return `A Market beside a capital-connected friendly Road gains +${unlock.coins} Coin per turn, up to 5 total Market income.`;
    case "IGNORE_HOSTILE_ZOC":
      return `${joinLabels(unlock.roles.map((role) => nodeRoleLabel(node, role, faction)))} ignore hostile zones of control after Maneuver is researched.`;
    case "FRIENDLY_CITY_FORTIFICATION":
      return `${joinLabels(unlock.roles.map((role) => nodeRoleLabel(node, role, faction)))} receive ×${unlock.defenseNumerator / unlock.defenseDenominator} defense in friendly cities.`;
    case "MEDIC_HEAL":
      return `${nodeRoleLabel(node, "MEDIC", faction)} Heal restores ${unlock.amount} HP to an adjacent owned unit.`;
    case "FRIENDLY_IDLE_RECOVERY":
      return `Idle friendly recovery restores ${unlock.amount} HP.`;
  }
}

function economicFormulaLabel(
  unlock: Extract<TechnologyUnlockV6, { readonly kind: "ECONOMIC_FORMULA" }>,
): string {
  switch (unlock.formula) {
    case "CONNECTED_ORTHOGONAL_CLUSTER":
      return unlock.improvement === "WINDMILL"
        ? "Windmill formula: +1 live population per Farm in the touching orthogonally connected same-city cluster, capped at +8."
        : "Sawmill formula: +1 live population per Lumber Camp in the touching orthogonally connected same-city cluster, capped at +8.";
    case "ADJACENT_MINES":
      return "Forge formula: +2 live population per immediately adjacent same-city Mine.";
    case "ADJACENT_QUARRIES_AND_OPPOSITE_PAIRS":
      return "Stoneworks formula: +1 live population per adjacent same-city Quarry, plus +2 for each complete N/S, E/W, NE/SW, or NW/SE opposite pair.";
    case "DISTINCT_BASIC_TYPES":
      return "Workshop formula: +1 live population per distinct adjacent friendly Farm, Lumber Camp, Mine, or Quarry type, maximum +4.";
    case "DISTINCT_PROCESSOR_TYPES":
      return "Grand Works formula: +2 live population per distinct adjacent friendly Windmill, Sawmill, Forge, or Stoneworks type: +6 for three or +8 for four.";
    case "DISTINCT_ECONOMIC_FAMILIES":
      return "Market formula: +1 Coin per turn per distinct adjacent friendly Agriculture, Timber, Metal, or Stone family, maximum +4 before the Road bonus.";
  }
}

function nodeRoleLabel(
  node: PublicTechnologyNodeV6,
  role: UnitRoleId,
  faction: FactionIdV6,
): string {
  return (
    node.unlockedRoleRules.find((candidate) => candidate.role === role)
      ?.label ?? effectiveRoleRuleV6(faction, role).label
  );
}

function joinLabels(labels: readonly string[]): string {
  if (labels.length < 2) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")}, and ${labels.at(-1)}`;
}

function cssEscape(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function defaultDraft(): Ruleset6SetupDraft {
  return {
    aiCount: 1,
    aiMode: "RIVAL",
    boardSize: 11,
    seedText: "42",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "CANDY"],
  };
}

function compatibleSizes(
  aiCount: 1 | 2 | 3,
): readonly (typeof BOARD_SIZES)[number][] {
  const minimum = aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
  return BOARD_SIZES.filter((size) => size >= minimum);
}

function setupFromDraft(draft: Ruleset6SetupDraft): MatchSetupV6 | null {
  const seed = Number(draft.seedText.trim());
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffff_ffff) return null;
  return {
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed,
    width: draft.boardSize,
    height: draft.boardSize,
    aiCount: draft.aiCount,
    aiDifficulty: "NORMAL",
    aiMode: draft.aiMode,
    humanColor: draft.humanColor,
    factions: draft.factions,
  };
}

function canHumanAct(snapshot: Ruleset6BrowserSnapshot): boolean {
  if (
    snapshot.phase !== "ACTIVE" ||
    snapshot.transitioning ||
    snapshot.view === null
  )
    return false;
  return (
    snapshot.view.turnOrder[snapshot.view.activeSeatIndex] ===
    snapshot.view.viewer.id
  );
}

function selectedCommands(
  view: PlayerViewV6,
  commands: readonly CommandV6[],
  selection: BoardSelectionV6 | null,
): readonly CommandV6[] {
  if (selection === null) return [];
  return commands.filter((command) => {
    if (
      command.kind === "END_TURN" ||
      command.kind === "RESEARCH" ||
      command.kind === "MOVE" ||
      command.kind === "ATTACK"
    )
      return false;
    if (selection.kind === "UNIT") {
      const unit = view.units.find(
        (candidate) => candidate.id === selection.unitId,
      );
      return (
        unit?.ownerId === view.viewer.id &&
        "unitId" in command &&
        command.unitId === selection.unitId &&
        command.kind !== "CHOOSE_CANDIFY_CITY"
      );
    }
    if (selection.kind === "CITY") {
      const city = view.cities.find(
        (candidate) => candidate.id === selection.cityId,
      );
      return (
        city?.ownerId === view.viewer.id &&
        command.kind === "TRAIN" &&
        command.cityId === selection.cityId
      );
    }
    return (
      selection.kind === "TILE" &&
      isEconomicCommand(command) &&
      sameCoord(command.at, selection.at)
    );
  });
}

function isStillOffered(
  snapshot: Ruleset6BrowserSnapshot,
  command: CommandV6,
): boolean {
  const encoded = canonicalJson(command);
  return snapshot.offeredCommands.some(
    (candidate) => canonicalJson(candidate) === encoded,
  );
}

function isEconomicCommand(command: CommandV6): command is EconomicCommandV6 {
  return ECONOMIC_KINDS.has(command.kind);
}

function isMapTargetFamily(command: CommandV6): boolean {
  return (
    command.kind === "KAMIKAZE_ROLL" ||
    command.kind === "BUILD_CHOCOLATE_WALL" ||
    command.kind === "HEAL_ADJACENT"
  );
}

function groupContextCommands(
  commands: readonly CommandV6[],
): readonly (readonly CommandV6[])[] {
  const groups = new Map<string, CommandV6[]>();
  for (const command of commands) {
    const key = isMapTargetFamily(command)
      ? `family:${command.kind}`
      : canonicalJson(command);
    const group = groups.get(key) ?? [];
    group.push(command);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function contextActionPresentation(
  view: PlayerViewV6,
  command: CommandV6,
): {
  readonly label: string;
  readonly accessibleLabel?: string;
  readonly symbol: ActionSymbol;
} {
  if (command.kind === "TRAIN") {
    const city = view.cities.find(
      (candidate) => candidate.id === command.cityId,
    );
    const faction =
      view.players.find((player) => player.id === city?.ownerId)?.faction ??
      view.viewer.faction;
    const role = effectiveRoleRuleV6(faction, command.role);
    return {
      label: `${role.label} · ${role.cost ?? 0} Coins`,
      accessibleLabel: `Train ${role.label} for ${role.cost ?? 0} Coins`,
      symbol: commandSymbol(command, faction),
    };
  }
  if (command.kind === "CAPTURE") {
    const unit = view.units.find(
      (candidate) => candidate.id === command.unitId,
    );
    const tile =
      unit === undefined
        ? undefined
        : view.board.tiles.find(
            (candidate) =>
              candidate.at.x === unit.at.x && candidate.at.y === unit.at.y,
          );
    const site = tile?.explored === true ? tile.site : null;
    return {
      label: site === "VILLAGE" ? "Capture Village" : "Capture City",
      symbol: acceptedSymbol("building-village", "⚑"),
    };
  }
  const labels: Partial<Readonly<Record<CommandV6["kind"], string>>> = {
    KAMIKAZE_ROLL: "Roll",
    HEAL_ADJACENT: "Heal",
    RECOVER: "Recover",
    PROMOTE: "Promote",
    WAIT: "Wait",
    BUILD_CHOCOLATE_WALL: "Chocolate Wall",
    CANDIFY: "Candify",
  };
  return {
    label: labels[command.kind] ?? title(command.kind),
    symbol: commandSymbol(command, view.viewer.faction),
  };
}

function commandSymbol(
  command: CommandV6,
  faction: FactionIdV6 = "ORIGINAL",
): ActionSymbol {
  if (command.kind === "ATTACK") return acceptedSymbol("ui-attack", "⚔");
  if (command.kind === "MOVE") return fallbackSymbol("→");
  const assetId = commandArtIdV6(command, faction);
  return assetId === null ? fallbackSymbol("?") : acceptedSymbol(assetId, "?");
}

function mandatoryChoiceHeading(choice: PendingChoiceV6 | undefined): string {
  if (choice?.kind === "CITY_REWARD") {
    return `Choose a city reward — City ${choice.cityId} · Level ${choice.reachedLevel}`;
  }
  return "Choose city for Candify";
}

function mandatoryChoiceContext(choice: PendingChoiceV6 | undefined): string {
  if (choice?.kind === "CITY_REWARD") {
    return "Choose one irreversible reward. Required choices resolve in authoritative queue order.";
  }
  if (choice?.kind === "CANDIFY_CITY") {
    return `Choose a Candify city from the authoritative candidates for unit ${choice.unitId}.`;
  }
  return "Resolve this required choice before play continues.";
}

function rewardPresentation(
  view: PlayerViewV6,
  reward: RewardIdV6,
): {
  readonly label: string;
  readonly effect: string;
  readonly symbol: ActionSymbol;
} {
  const fighter = effectiveRoleRuleV6(view.viewer.faction, "FIGHTER").label;
  const juggernaut = effectiveRoleRuleV6(
    view.viewer.faction,
    "JUGGERNAUT",
  ).label;
  switch (reward) {
    case "SURVEY":
      return {
        label: "Survey",
        effect: "Reveal every tile within Chebyshev radius 3 now.",
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
    case "STOCKPILE":
      return {
        label: "Stockpile",
        effect: "+4 Coins now.",
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
    case "WALLS":
      return {
        label: "Walls",
        effect: "Permanently grants 4× eligible city defense.",
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
    case "MILITIA":
      return {
        label: "Militia",
        effect: `Grant one free ${fighter}, handled this turn.`,
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
    case "EXPAND":
      return {
        label: "Expand",
        effect: "Claim neutral tiles in the city's centered 5 × 5 footprint.",
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
    case "BOOM":
      return {
        label: "Boom",
        effect: "+3 permanent population; further rewards may join the queue.",
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
    case "JUGGERNAUT":
      return {
        label: juggernaut,
        effect: `Grant one free ${juggernaut}, handled this turn.`,
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
    case "TREASURY":
      return {
        label: "Treasury",
        effect: "+5 Coins now.",
        symbol: acceptedSymbol(rewardArtIdV6(view.viewer.faction, reward), "?"),
      };
  }
}

function rewardUnavailableReason(reward: RewardIdV6): string {
  return reward === "MILITIA" || reward === "JUGGERNAUT"
    ? "Unavailable — no traversable city tile is open for the reward unit."
    : "Unavailable — this reward is not currently offered by the authoritative rules.";
}

function candifyUnavailableReason(
  view: PlayerViewV6,
  unitId: number,
  cityId: number,
): string {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined || unit.hp <= 0) {
    return "Unavailable — the Candify unit is no longer available.";
  }
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined || city.ownerId !== view.viewer.id) {
    return "Unavailable — the candidate city is no longer available.";
  }
  const tile = view.board.tiles.find(
    (candidate) => candidate.at.x === unit.at.x && candidate.at.y === unit.at.y,
  );
  if (tile?.explored !== true) {
    return "Unavailable — the Candify target is not explored.";
  }
  if (
    candifyWouldDuplicateSpecializedImprovementV6(
      view.board.tiles,
      city.id,
      tile.improvement,
    )
  ) {
    return "Unavailable — this city already has the transferred one-per-city improvement.";
  }
  return "Unavailable — this city is not currently offered by the authoritative rules.";
}

function candifyTerritoryPreview(
  documentRoot: Document,
  view: PlayerViewV6,
  city: PlayerViewV6["cities"][number],
): HTMLElement {
  const size = city.expanded ? 5 : 3;
  const radius = city.expanded ? 2 : 1;
  const preview = el(documentRoot, "span", "v6-candify-territory-preview");
  preview.style.setProperty("--territory-size", String(size));
  let exploredAssigned = 0;
  for (let y = city.at.y - radius; y <= city.at.y + radius; y += 1) {
    for (let x = city.at.x - radius; x <= city.at.x + radius; x += 1) {
      const tile = view.board.tiles.find(
        (candidate) => candidate.at.x === x && candidate.at.y === y,
      );
      const cell = el(documentRoot, "span", "v6-candify-territory-cell");
      if (tile?.explored !== true) cell.classList.add("is-unexplored");
      else if (tile.territoryCityId === city.id) {
        cell.classList.add("is-assigned");
        exploredAssigned += 1;
      }
      if (x === city.at.x && y === city.at.y) cell.classList.add("is-center");
      preview.append(cell);
    }
  }
  preview.setAttribute("aria-hidden", "true");
  const wrapper = el(documentRoot, "span", "v6-candify-territory");
  wrapper.append(
    preview,
    text(
      documentRoot,
      "span",
      `${exploredAssigned} explored assigned territor${exploredAssigned === 1 ? "y tile" : "y tiles"}`,
      "v6-candify-territory-label",
    ),
  );
  return wrapper;
}

function acceptedSymbol(assetId: string, fallback: string): ActionSymbol {
  const url = ACCEPTED_ART_URLS[assetId];
  return url === undefined
    ? fallbackSymbol(fallback)
    : { kind: "RASTER", assetId, url };
}

function fallbackSymbol(value: string): ActionSymbol {
  return { kind: "FALLBACK", value };
}

function actionSymbolNode(
  documentRoot: Document,
  symbol: ActionSymbol,
): HTMLElement {
  const wrapper = el(documentRoot, "span", "v6-command-symbol");
  wrapper.setAttribute("aria-hidden", "true");
  if (symbol.kind === "RASTER") {
    const image = documentRoot.createElement("img");
    image.src = symbol.url;
    image.alt = "";
    image.decoding = "async";
    wrapper.dataset.symbolKind = "accepted-raster";
    wrapper.dataset.assetId = symbol.assetId;
    wrapper.append(image);
  } else {
    wrapper.dataset.symbolKind = "code-native-fallback";
    wrapper.textContent = symbol.value;
  }
  return wrapper;
}

function selectionIdentityArtworkNode(
  documentRoot: Document,
  presentation: SelectionIdentityPresentationV6,
): HTMLElement {
  const wrapper = el(documentRoot, "span", "v6-selection-identity-art");
  wrapper.setAttribute("aria-hidden", "true");
  const artwork = presentation.artwork;
  if (artwork?.status === "ACCEPTED") {
    const symbol = acceptedSymbol(artwork.assetId, "?");
    if (symbol.kind === "RASTER") {
      const image = documentRoot.createElement("img");
      image.src = symbol.url;
      image.alt = "";
      image.decoding = "async";
      wrapper.dataset.symbolKind = "accepted-raster";
      wrapper.dataset.assetId = artwork.assetId;
      wrapper.append(image);
      return wrapper;
    }
  }
  wrapper.dataset.symbolKind = "code-native-fallback";
  wrapper.textContent = artwork?.status === "PLACEHOLDER" ? artwork.label : "?";
  return wrapper;
}

function commandLabel(command: CommandV6): string {
  const name = title(command.kind);
  if (command.kind === "RESEARCH") return `Research ${title(command.tech)}`;
  if (command.kind === "TRAIN")
    return `Train ${title(command.role)} in city ${command.cityId}`;
  if (command.kind === "MOVE")
    return `${name} to ${coordLabel(command.path.at(-1))}`;
  if (command.kind === "ATTACK")
    return `${name} ${command.target.kind === "UNIT" ? `unit ${command.target.unitId}` : `wall ${command.target.wallId}`}`;
  if (command.kind === "HEAL_ADJACENT")
    return `Heal unit ${command.targetUnitId}`;
  if (command.kind === "KAMIKAZE_ROLL")
    return `Roll ${title(command.direction)}`;
  if (command.kind === "CHOOSE_CITY_REWARD")
    return `Choose ${title(command.reward)}`;
  if (command.kind === "CHOOSE_CANDIFY_CITY")
    return `Assign Candify to city ${command.cityId}`;
  if ("at" in command) return `${name} at ${coordLabel(command.at)}`;
  if ("unitId" in command) return `${name} · unit ${command.unitId}`;
  return name;
}

function describeSelection(
  view: PlayerViewV6,
  selection: BoardSelectionV6,
): string {
  return selectionIdentityPresentationV6(view, selection).accessibleLabel;
}

function sameCoord(
  left: { readonly x: number; readonly y: number } | undefined,
  right: { readonly x: number; readonly y: number },
): boolean {
  return left !== undefined && left.x === right.x && left.y === right.y;
}

function coordLabel(
  at: { readonly x: number; readonly y: number } | undefined,
): string {
  return at === undefined ? "unknown" : `${at.x + 1},${at.y + 1}`;
}

function title(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function fieldValue(root: HTMLElement, id: string): string {
  return (
    root.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)?.value ??
    ""
  );
}

function el(
  documentRoot: Document,
  tag: string,
  className?: string,
): HTMLElement {
  const node = documentRoot.createElement(tag);
  if (className !== undefined) node.className = className;
  return node;
}

function text(
  documentRoot: Document,
  tag: string,
  value: string,
  className?: string,
): HTMLElement {
  const node = el(documentRoot, tag, className);
  node.textContent = value;
  return node;
}

function button(
  documentRoot: Document,
  label: string,
  className: string,
): HTMLButtonElement {
  const node = documentRoot.createElement("button");
  node.type = "button";
  node.className = className;
  node.textContent = label;
  return node;
}

function chip(
  documentRoot: Document,
  label: string,
  value: string,
  assetId?: string,
): HTMLElement {
  const node = el(documentRoot, "div", "v6-hud-chip");
  if (assetId !== undefined) {
    const symbol = actionSymbolNode(documentRoot, acceptedSymbol(assetId, "?"));
    symbol.classList.add("v6-hud-chip-icon");
    node.append(symbol);
  }
  node.append(
    text(documentRoot, "span", label),
    text(documentRoot, "strong", value),
  );
  return node;
}

function banner(
  documentRoot: Document,
  value: string,
  kind: "warning" | "error",
): HTMLElement {
  const node = text(documentRoot, "div", value, `v6-banner v6-banner-${kind}`);
  node.setAttribute("role", kind === "error" ? "alert" : "status");
  return node;
}

function live(
  documentRoot: Document,
  id: string,
  value: string,
  politeness: "polite" | "assertive",
): HTMLElement {
  const node = text(documentRoot, "p", value, "sr-only");
  node.id = id;
  node.setAttribute("aria-live", politeness);
  return node;
}

function selectField(
  documentRoot: Document,
  label: string,
  id: string,
  values: readonly string[],
  selected: string,
): HTMLElement {
  const wrapper = el(documentRoot, "label", "v6-field");
  if (id.startsWith("v6-faction-")) wrapper.dataset.factionSeat = id;
  wrapper.append(text(documentRoot, "span", label));
  const select = documentRoot.createElement("select");
  select.id = id;
  select.name = id;
  for (const value of values) {
    const option = documentRoot.createElement("option");
    option.value = value;
    option.textContent = title(value);
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
): HTMLElement {
  const wrapper = el(documentRoot, "label", "v6-field");
  wrapper.append(text(documentRoot, "span", label));
  const input = documentRoot.createElement("input");
  input.id = id;
  input.name = id;
  input.inputMode = "numeric";
  input.autocomplete = "off";
  input.value = value;
  wrapper.append(input);
  return wrapper;
}
