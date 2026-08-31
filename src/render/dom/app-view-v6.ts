import {
  canonicalJson,
  queryTechnologyTreeV6,
  type CommandV6,
  type EconomicPreviewResultV6,
  type FactionIdV6,
  type MatchSetupV6,
  type PlayerColorV6,
  type PlayerViewV6,
} from "../../engine/index";
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
  type EconomicPreviewSelectionV6,
  type MapCommandTargetV6,
} from "../canvas/render-plan-v6";

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
  | "economicPreview"
>;

/**
 * Ruleset-6-only DOM composition. Gameplay data is limited to controller
 * snapshots and exact public commands; this layer never reconstructs legality.
 */
export class Ruleset6DomAppView {
  readonly #document: Document;
  readonly #root: HTMLElement;
  readonly #controller: Ruleset6BrowserControllerPort;
  readonly #boardHost: BoardHostV6;
  #unsubscribe: (() => void) | null = null;
  #snapshot: Ruleset6BrowserSnapshot;
  #draft: Ruleset6SetupDraft = defaultDraft();
  #matchInstanceId = 0;
  #selection: BoardSelectionV6 | null = null;
  #targetMode: BoardTargetModeV6 | null = null;
  #economicPreview: EconomicPreviewSelectionV6 | null = null;
  #preparedCommand: CommandV6 | null = null;
  #commandChoices: readonly MapCommandTargetV6[] = [];
  #notice: string | null = null;
  #error: string | null = null;
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
    this.#boardHost.destroy();
    this.#root.replaceChildren();
  }

  boardScreenPoint(at: { readonly x: number; readonly y: number }) {
    return this.#boardHost.screenPoint(at);
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    ) {
      return;
    }
    if (event.key === "Escape") {
      if (this.#commandChoices.length > 0) {
        this.#commandChoices = [];
        this.#render();
        event.preventDefault();
      } else if (
        this.#selection !== null ||
        this.#targetMode !== null ||
        this.#economicPreview !== null
      ) {
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
      this.#snapshot.phase === "ACTIVE"
    ) {
      const tree =
        this.#root.querySelector<HTMLDetailsElement>("[data-tech-tree]");
      if (tree !== null) {
        tree.open = true;
        tree.querySelector<HTMLElement>("summary")?.focus();
        event.preventDefault();
      }
    }
  };

  #render(): void {
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
        else shell.append(this.#matchScreen(this.#snapshot.view));
        break;
    }
    this.#root.replaceChildren(shell);
    if (
      this.#snapshot.view !== null &&
      this.#root.querySelector("[data-v6-board]") !== null
    ) {
      this.#mountBoard(this.#snapshot.view);
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
    const humanCanAct = canHumanAct(this.#snapshot);
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
      chip(this.#document, "Coins", String(view.viewer.coins)),
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
    const zoomOut = button(this.#document, "−", "v6-icon-button");
    zoomOut.ariaLabel = "Zoom out";
    zoomOut.onclick = () => this.#boardHost.zoom("OUT");
    const zoomIn = button(this.#document, "+", "v6-icon-button");
    zoomIn.ariaLabel = "Zoom in";
    zoomIn.onclick = () => this.#boardHost.zoom("IN");
    const restart = button(this.#document, "Restart", "secondary-action");
    restart.dataset.action = "restart";
    restart.onclick = () => void this.#restart();
    const remove = button(this.#document, "Delete", "destructive");
    remove.dataset.action = "delete-save";
    remove.onclick = () => void this.#deleteSave();
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
    } else if (view.pendingChoices.length > 0) {
      dock.append(this.#mandatoryChoicePanel(view));
    } else {
      dock.append(this.#normalActionPanel(view));
    }
    if (this.#commandChoices.length > 0)
      dock.append(this.#commandChoiceDialog());
    main.append(hud, map, dock);
    return main;
  }

  #mountBoard(view: PlayerViewV6): void {
    const container = this.#root.querySelector<HTMLElement>("[data-v6-board]");
    if (container === null) return;
    this.#boardHost.mount(container, {
      onSelection: (selection) => {
        this.#selection = selection;
        this.#targetMode = null;
        this.#economicPreview = null;
        this.#preparedCommand = null;
        this.#commandChoices = [];
        this.#render();
      },
      onInspect: (selection) => {
        this.#selection = selection;
        this.#notice = describeSelection(view, selection);
        this.#render();
      },
      onCommandCandidates: (candidates) => {
        if (candidates.length === 1 && candidates[0] !== undefined) {
          void this.#dispatch(candidates[0].command);
        } else if (candidates.length > 1) {
          this.#commandChoices = [...candidates];
          this.#render();
        }
      },
      onZoom: (direction) => {
        this.#notice = `Zoomed ${direction.toLowerCase()}.`;
      },
      onCancel: () => {
        this.#targetMode = null;
        this.#economicPreview = null;
        this.#preparedCommand = null;
        this.#commandChoices = [];
        this.#render();
      },
    });
    this.#boardHost.update({
      matchInstanceId: this.#matchInstanceId,
      view,
      interactive: canHumanAct(this.#snapshot),
      interaction: {
        ...EMPTY_BOARD_RENDER_INTERACTION_V6,
        selection: this.#selection,
        targetMode: this.#targetMode,
        economicPreview: this.#economicPreview,
      },
    });
  }

  #normalActionPanel(view: PlayerViewV6): HTMLElement {
    const panel = el(this.#document, "div", "v6-action-panel");
    panel.append(
      text(this.#document, "h2", selectionHeading(view, this.#selection)),
    );
    if (this.#preparedCommand !== null) {
      const prepared = el(this.#document, "section", "v6-prepared-action");
      prepared.append(
        text(this.#document, "h3", "Prepared action"),
        text(
          this.#document,
          "p",
          this.#economicPreview === null
            ? commandLabel(this.#preparedCommand)
            : previewLabel(this.#economicPreview.result),
        ),
      );
      const confirm = button(
        this.#document,
        `Confirm ${commandLabel(this.#preparedCommand)}`,
        "primary-action",
      );
      confirm.dataset.confirmPrepared = "true";
      const command = this.#preparedCommand;
      confirm.onclick = () => void this.#dispatch(command);
      prepared.append(confirm);
      panel.append(prepared);
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
          "Select a unit, city, or highlighted tile. Every legal action is also available below.",
        ),
      );
    } else {
      panel.append(this.#commandList(selected, "Selection actions"));
    }
    panel.append(this.#technologyPanel(view));
    const all = el(this.#document, "details", "v6-all-actions");
    const summary = text(
      this.#document,
      "summary",
      `All offered actions (${this.#snapshot.offeredCommands.length})`,
    );
    all.append(
      summary,
      this.#commandList(
        this.#snapshot.offeredCommands,
        "All exact offered commands",
      ),
    );
    panel.append(all);
    return panel;
  }

  #technologyPanel(view: PlayerViewV6): HTMLElement {
    const details = el(this.#document, "details", "v6-tech-panel");
    details.dataset.techTree = "true";
    details.append(text(this.#document, "summary", "Technology tree (T)"));
    const tree = queryTechnologyTreeV6(view);
    const branches = new Map<string, typeof tree.nodes>();
    for (const node of tree.nodes) {
      const values = branches.get(node.branch) ?? [];
      branches.set(node.branch, [...values, node]);
    }
    for (const [branch, nodes] of branches) {
      const section = el(this.#document, "section", "v6-tech-branch");
      section.append(text(this.#document, "h3", title(branch)));
      const list = el(this.#document, "div", "v6-tech-list");
      for (const node of nodes) {
        const command = this.#snapshot.offeredCommands.find(
          (
            candidate,
          ): candidate is Extract<CommandV6, { readonly kind: "RESEARCH" }> =>
            candidate.kind === "RESEARCH" && candidate.tech === node.id,
        );
        const item = button(
          this.#document,
          `${title(node.id)} · ${node.cost} Coins · ${title(node.state)}`,
          `v6-tech-node v6-tech-${node.state.toLowerCase()}`,
        );
        item.dataset.tech = node.id;
        item.disabled = command === undefined;
        item.title =
          node.effects.map(describeUnlock).join("; ") || "Starting technology";
        if (command !== undefined)
          item.onclick = () => void this.#dispatch(command);
        list.append(item);
      }
      section.append(list);
      details.append(section);
    }
    return details;
  }

  #commandList(commands: readonly CommandV6[], label: string): HTMLElement {
    const list = el(this.#document, "div", "v6-command-list");
    list.setAttribute("aria-label", label);
    for (const command of commands) {
      const item = button(
        this.#document,
        commandLabel(command),
        command.kind === "END_TURN" ? "primary-action" : "v6-command-button",
      );
      item.dataset.command = canonicalJson(command);
      item.dataset.commandKind = command.kind;
      item.disabled = this.#snapshot.transitioning;
      item.onclick = () => this.#prepareOrDispatch(command);
      list.append(item);
    }
    return list;
  }

  #mandatoryChoicePanel(view: PlayerViewV6): HTMLElement {
    const panel = el(this.#document, "div", "v6-choice-panel");
    const choice = view.pendingChoices[0];
    panel.append(
      text(this.#document, "p", "Required before play continues", "v6-eyebrow"),
      text(
        this.#document,
        "h2",
        choice?.kind === "CITY_REWARD"
          ? "Choose a city reward"
          : "Choose a Candify city",
      ),
    );
    const commands = this.#snapshot.offeredCommands.filter(
      (command) =>
        command.kind === "CHOOSE_CITY_REWARD" ||
        command.kind === "CHOOSE_CANDIFY_CITY",
    );
    panel.append(this.#commandList(commands, "Mandatory choices"));
    return panel;
  }

  #commandChoiceDialog(): HTMLElement {
    const dialog = el(this.#document, "section", "v6-command-dialog");
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Choose exact map action");
    dialog.append(text(this.#document, "h2", "Choose an action"));
    for (const target of this.#commandChoices) {
      const item = button(
        this.#document,
        commandLabel(target.command),
        "v6-command-button",
      );
      item.dataset.command = canonicalJson(target.command);
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
    if (command.kind === "KAMIKAZE_ROLL") {
      this.#selection = { kind: "UNIT", unitId: command.unitId };
      this.#targetMode = { kind: command.kind, unitId: command.unitId };
      this.#economicPreview = null;
      this.#preparedCommand = command;
      this.#notice = "Choose an exact roll direction on the map.";
      this.#render();
      return;
    }
    if (command.kind === "BUILD_CHOCOLATE_WALL") {
      this.#selection = { kind: "UNIT", unitId: command.unitId };
      this.#targetMode = { kind: command.kind, unitId: command.unitId };
      this.#economicPreview = null;
      this.#preparedCommand = command;
      this.#notice = "Choose an exact wall tile on the map.";
      this.#render();
      return;
    }
    if (isEconomicCommand(command)) {
      const preview = this.#controller.economicPreview(command);
      this.#selection = { kind: "TILE", at: command.at };
      this.#economicPreview = { command, result: preview };
      this.#targetMode = null;
      this.#preparedCommand = command;
      this.#notice = previewLabel(preview);
      this.#render();
      return;
    }
    void this.#dispatch(command);
  }

  async #dispatch(command: CommandV6): Promise<void> {
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
    this.#notice = `${commandLabel(command)} completed.`;
    this.#targetMode = null;
    this.#economicPreview = null;
    this.#preparedCommand = null;
    this.#validatePresentation(this.#controller.snapshot().view);
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
    else
      this.#notice = `AI completed ${result.acceptedCommands} action${result.acceptedCommands === 1 ? "" : "s"}. Your turn.`;
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
    if (
      this.#selection !== null &&
      selectionCoordV6(view, this.#selection) === null
    )
      this.#selection = null;
    if (
      this.#economicPreview !== null &&
      !isStillOffered(this.#snapshot, this.#economicPreview.command)
    )
      this.#economicPreview = null;
    if (
      this.#preparedCommand !== null &&
      !isStillOffered(this.#snapshot, this.#preparedCommand)
    )
      this.#preparedCommand = null;
    if (
      this.#commandChoices.some(
        (choice) => !isStillOffered(this.#snapshot, choice.command),
      )
    )
      this.#commandChoices = [];
  }

  #resetPresentation(): void {
    this.#selection = null;
    this.#targetMode = null;
    this.#economicPreview = null;
    this.#preparedCommand = null;
    this.#commandChoices = [];
    this.#error = null;
  }
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
  if (selection === null)
    return commands.filter((command) => command.kind === "END_TURN");
  return commands.filter((command) => {
    if (command.kind === "END_TURN" || command.kind === "RESEARCH") return true;
    if (selection.kind === "UNIT")
      return "unitId" in command && command.unitId === selection.unitId;
    if (selection.kind === "CITY")
      return "cityId" in command && command.cityId === selection.cityId;
    if (selection.kind === "WALL") {
      return (
        command.kind === "ATTACK" &&
        command.target.kind === "CHOCOLATE_WALL" &&
        command.target.wallId === selection.wallId
      );
    }
    if ("at" in command) return sameCoord(command.at, selection.at);
    if (command.kind === "MOVE")
      return sameCoord(command.path.at(-1), selection.at);
    if (command.kind === "ATTACK") {
      const target = command.target;
      const entity =
        target.kind === "UNIT"
          ? view.units.find((unit) => unit.id === target.unitId)
          : view.chocolateWalls.find((wall) => wall.id === target.wallId);
      return entity !== undefined && sameCoord(entity.at, selection.at);
    }
    return false;
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

function previewLabel(result: EconomicPreviewResultV6): string {
  if (!result.ok) return "This economic action is no longer offered.";
  const population = result.preview.populationDeltaByCity
    .map((entry) => `${entry.delta >= 0 ? "+" : ""}${entry.delta} population`)
    .join(", ");
  const income = result.preview.coinIncomeDeltaByCity
    .map((entry) => `${entry.delta >= 0 ? "+" : ""}${entry.delta} income`)
    .join(", ");
  return [`Cost ${result.preview.cost} Coins`, population, income]
    .filter(Boolean)
    .join(" · ");
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

function selectionHeading(
  view: PlayerViewV6,
  selection: BoardSelectionV6 | null,
): string {
  if (selection === null) return "Choose an action";
  if (selection.kind === "TILE") return `Tile ${coordLabel(selection.at)}`;
  if (selection.kind === "UNIT") {
    const unit = view.units.find(
      (candidate) => candidate.id === selection.unitId,
    );
    return unit === undefined
      ? "Unit"
      : `${title(unit.role)} · ${unit.hp}/${unit.maxHp} HP`;
  }
  if (selection.kind === "CITY") {
    const city = view.cities.find(
      (candidate) => candidate.id === selection.cityId,
    );
    return city === undefined
      ? "City"
      : `City level ${city.level} · ${city.population}/${city.level + 1} population`;
  }
  const wall = view.chocolateWalls.find(
    (candidate) => candidate.id === selection.wallId,
  );
  return wall === undefined
    ? "Chocolate wall"
    : `Chocolate wall · ${wall.hp} HP`;
}

function describeSelection(
  view: PlayerViewV6,
  selection: BoardSelectionV6,
): string {
  return `${selectionHeading(view, selection)} selected.`;
}

function describeUnlock(
  unlock: ReturnType<
    typeof queryTechnologyTreeV6
  >["nodes"][number]["effects"][number],
): string {
  if (unlock.kind === "COMMAND") return `Unlocks ${title(unlock.command)}`;
  if (unlock.kind === "UNIT_ROLE") return `Unlocks ${title(unlock.role)}`;
  if (unlock.kind === "RESOURCE_REVEAL")
    return `Reveals ${unlock.resources.map(title).join(", ")}`;
  return title(unlock.kind);
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
): HTMLElement {
  const node = el(documentRoot, "div", "v6-hud-chip");
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
