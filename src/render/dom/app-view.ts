import {
  cityCapacity,
  publicTechnologyCost,
  publicUnitCost,
  queryPlayerCombatPreview,
  queryPlayerCommands,
  requireRuleset,
  type CityState,
  type Command,
  type Coord,
  type PlayerUnitView,
  type PlayerView,
  type TechId,
  type UnitType,
} from "../../engine/index";
import {
  autoBoardSize,
  nextIncome,
  resolveBoardSize,
} from "../../app/controller";
import type { AppController } from "../../app/controller";
import type {
  AppSnapshot,
  ConfirmationAction,
  MatchOverlay,
} from "../../app/types";
import {
  CanvasBoardHost,
  type BoardHost,
  type BoardSelection,
} from "../canvas/board-host";
import { accessibleCombatPreview } from "../canvas/combat-preview-label";
import type { Point } from "../canvas/geometry";
import {
  ACCEPTED_ART_URLS,
  FACTION_HERO_URL,
} from "../../assets/generated-art-manifest";

const TECH_DETAILS: Readonly<Record<TechId, string>> = {
  CLIMBING: "Move onto mountains and gain mountain vision.",
  RIDING: "Train Riders.",
  HUNTING: "Hunt Animals; makes Forestry and Archery available.",
  ORGANIZATION:
    "Harvest Fruit for 2 stars and +1 population; makes Strategy available.",
  MINING:
    "Build Mines for 5 stars only on explicit ore in your city territory. Each Mine adds +2 population immediately; ordinary mountains are not mineable.",
  FORESTRY: "Build Lumber Mills on empty Forest for 3 stars and +1 population.",
  ARCHERY: "Train Archers.",
  STRATEGY: "Train Defenders.",
  MATHEMATICS:
    "Train Catapults for 8 stars. Attack 4 reaches 3 tiles and defeats a full-health Warrior without a defense bonus in one hit.",
};

const TECH_FALLBACK_SYMBOLS: Readonly<Partial<Record<TechId, string>>> = {
  RIDING: "R",
  ARCHERY: "A",
  FORESTRY: "F",
  MATHEMATICS: "M",
};

export interface MountAppOptions {
  readonly boardHost?: BoardHost;
}

export class DomAppView {
  readonly #document: Document;
  readonly #root: HTMLElement;
  readonly #controller: AppController;
  readonly #boardHost: BoardHost;
  #unsubscribe: (() => void) | null = null;
  #selected: BoardSelection | null = null;
  #focusReturnId: string | null = null;
  #pendingFocusId: string | null = null;
  #selectedTech: TechId | null = null;
  #lastOverlayName = "NONE";
  #lastMatchInstanceId = 0;

  constructor(
    documentRoot: Document,
    root: HTMLElement,
    controller: AppController,
    options: MountAppOptions = {},
  ) {
    this.#document = documentRoot;
    this.#root = root;
    this.#controller = controller;
    this.#boardHost = options.boardHost ?? new CanvasBoardHost(documentRoot);
    this.#document.addEventListener("keydown", this.#onKeyDown);
    this.#unsubscribe = controller.subscribe((snapshot) =>
      this.#render(snapshot),
    );
  }

  destroy(): void {
    this.#document.removeEventListener("keydown", this.#onKeyDown);
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#boardHost.destroy();
  }

  boardScreenPoint(at: Coord): Point | null {
    return this.#boardHost.screenPoint(at);
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const snapshot = this.#controller.snapshot();
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLTextAreaElement
    )
      return;
    if (snapshot.overlay.name !== "NONE") {
      if (event.key === "Escape" && snapshot.overlay.name !== "REWARD") {
        event.preventDefault();
        this.#boardHost.resetActivationCycle();
        this.#controller.closeOverlay();
      } else if (event.key === "Tab") {
        this.#trapFocus(event);
      }
      return;
    }
    const key = event.key.toLowerCase();
    if (key === "escape") {
      event.preventDefault();
      if (this.#selected !== null) this.#clearBoardSelection();
      else {
        this.#boardHost.resetActivationCycle();
        this.#controller.requestBack();
      }
    } else if (key === "t" && snapshot.route === "MATCH") {
      event.preventDefault();
      this.#rememberFocus("tech");
      this.#controller.openOverlay({ name: "TECH" });
    } else if (key === "g" && snapshot.route === "MATCH") {
      event.preventDefault();
      this.#rememberFocus("stats");
      this.#controller.openOverlay({ name: "STATS" });
    } else if (key === "e" && snapshot.route === "MATCH") {
      event.preventDefault();
      const end = this.#legalCommands(snapshot.view).find(
        (command) => command.kind === "END_TURN",
      );
      if (end !== undefined) this.#controller.requestCommand(end);
    } else if (key === "?") {
      event.preventDefault();
      this.#rememberFocus("help");
      this.#controller.openOverlay({ name: "HELP" });
    } else if (
      (event.key === "+" || event.key === "-") &&
      snapshot.route === "MATCH"
    ) {
      event.preventDefault();
      this.#boardHost.zoom(event.key === "+" ? "IN" : "OUT");
    }
  };

  #render(snapshot: AppSnapshot): void {
    if (snapshot.matchInstanceId !== this.#lastMatchInstanceId) {
      this.#selected = null;
      this.#selectedTech = null;
      this.#lastMatchInstanceId = snapshot.matchInstanceId;
    }
    if (
      snapshot.route === "MATCH" &&
      snapshot.view !== null &&
      !selectionExists(snapshot.view, this.#selected)
    ) {
      this.#selected = null;
    }
    const activeFocusId =
      this.#document.activeElement instanceof HTMLElement &&
      this.#root.contains(this.#document.activeElement)
        ? this.#document.activeElement.dataset.focusId
        : undefined;
    if (
      activeFocusId !== undefined &&
      snapshot.overlay.name === this.#lastOverlayName &&
      this.#pendingFocusId === null
    ) {
      this.#pendingFocusId = activeFocusId;
    }
    this.#boardHost.destroy();
    this.#root.style.setProperty(
      "--ui-scale",
      String(snapshot.settings.uiScale),
    );
    this.#root.dataset.motion = snapshot.settings.motion.toLowerCase();
    this.#root.dataset.contrast = snapshot.settings.highContrast
      ? "high"
      : "normal";
    const shell = element(this.#document, "div", "app-shell");
    shell.dataset.route = snapshot.route.toLowerCase();
    if (snapshot.notice !== null) {
      shell.append(banner(this.#document, snapshot.notice));
    }
    if (snapshot.saveWarning !== null) {
      shell.append(
        banner(this.#document, `Save warning: ${snapshot.saveWarning}`),
      );
    }
    switch (snapshot.route) {
      case "SPLASH":
        shell.append(this.#splash());
        break;
      case "HUB":
        shell.append(this.#hub(snapshot));
        break;
      case "MODE":
        shell.append(this.#mode());
        break;
      case "SETUP":
        shell.append(this.#setup(snapshot));
        break;
      case "FACTION":
        shell.append(this.#faction(snapshot));
        break;
      case "MATCH":
        shell.append(this.#match(snapshot));
        break;
      case "RESULT":
        shell.append(this.#result(snapshot));
        break;
      case "ERROR":
        shell.append(this.#error());
        break;
    }
    shell.append(
      liveRegion(
        this.#document,
        "polite-live",
        snapshot.announcement,
        "polite",
      ),
      liveRegion(
        this.#document,
        "assertive-live",
        snapshot.assertiveAnnouncement,
        "assertive",
      ),
    );
    if (snapshot.overlay.name !== "NONE") shell.append(this.#overlay(snapshot));
    this.#root.replaceChildren(shell);
    if (snapshot.route === "MATCH" && snapshot.view !== null) {
      const host = this.#root.querySelector<HTMLElement>("[data-board-host]");
      if (host !== null) {
        this.#boardHost.mount(host, {
          onSelection: (selection) => this.#selectBoardEntity(selection),
          onInspect: (selection) => this.#inspectBoardEntity(selection),
          onCommand: (command) => this.#controller.requestCommand(command),
          onZoom: (direction) =>
            this.#announce(`Zoom ${direction.toLowerCase()} requested.`),
        });
        this.#boardHost.update({
          matchInstanceId: snapshot.matchInstanceId,
          view: snapshot.view,
          interactive: this.#humanCanAct(snapshot),
          motion: snapshot.settings.motion,
          selected: this.#selected,
          combatPresentation: snapshot.combatPresentation,
        });
      }
    }
    this.#restoreOrPlaceFocus(snapshot.overlay);
    this.#lastOverlayName = snapshot.overlay.name;
  }

  #splash(): HTMLElement {
    const main = screen(this.#document, "splash-screen", "Pulp Wars");
    const wordmark = element(this.#document, "div", "wordmark-burst");
    wordmark.setAttribute("aria-hidden", "true");
    wordmark.append(
      textElement(this.#document, "span", "PULP"),
      textElement(this.#document, "span", "WARS"),
    );
    main.append(
      wordmark,
      textElement(
        this.#document,
        "p",
        "Preparing the battlefield…",
        "loading-copy",
      ),
    );
    const progress = element(this.#document, "div", "loading-track");
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-label", "Loading Pulp Wars");
    main.append(progress);
    return main;
  }

  #hub(snapshot: AppSnapshot): HTMLElement {
    const main = screen(this.#document, "front-screen hub-screen", "Pulp Wars");
    main.append(
      textElement(
        this.#document,
        "p",
        "A tiny conquest with sharp edges and big hats.",
        "eyebrow",
      ),
    );
    const actions = element(this.#document, "div", "hub-actions");
    if (snapshot.saveRecovery !== null) {
      const recovery = element(this.#document, "aside", "save-recovery-banner");
      recovery.setAttribute("role", "alert");
      recovery.append(
        textElement(this.#document, "h2", "Saved match needs attention"),
        textElement(
          this.#document,
          "p",
          "The saved data was not loaded or deleted. Inspect it, delete it, or start a new match and confirm replacement.",
        ),
        actionButton(
          this.#document,
          "Inspect Details",
          () => this.#controller.inspectSaveRecovery(),
          "secondary-action",
          "inspect-save",
        ),
        actionButton(
          this.#document,
          "Delete Save",
          () => this.#controller.openConfirmation({ kind: "DELETE_SAVE" }),
          "secondary-action destructive",
          "recovery-delete",
        ),
      );
      actions.append(recovery);
    }
    if (snapshot.match !== null) {
      const primary = actionButton(
        this.#document,
        snapshot.match.outcome === null ? "Resume Conquest" : "View Result",
        () => this.#controller.resumeMatch(),
        "primary-action",
        "resume",
      );
      actions.append(primary);
      const meta = textElement(
        this.#document,
        "p",
        `Seed ${seedLabel(snapshot.match.setup.seed)} · Round ${snapshot.match.round} · ${snapshot.match.players.length} players${snapshot.savedAt === null ? "" : ` · saved ${formatSaveTime(snapshot.savedAt)}`}`,
        "save-meta",
      );
      actions.append(meta);
    }
    actions.append(
      actionButton(
        this.#document,
        "New Conquest",
        () => this.#controller.navigate("MODE"),
        snapshot.match === null ? "primary-action" : "secondary-action",
        "new-conquest",
      ),
    );
    const demo = element(this.#document, "section", "demo-match-card");
    demo.append(
      textElement(this.#document, "h2", "Demo Match"),
      textElement(
        this.#document,
        "p",
        "Huge 25 × 25 · two Normal AI · all nine technologies · two level-3 cities · eight ready units · fully explored.",
      ),
      actionButton(
        this.#document,
        "Demo Match",
        () => this.#controller.requestDemoMatch(),
        "secondary-action demo-match-action",
        "demo-match",
      ),
    );
    actions.append(demo);
    const row = element(this.#document, "div", "button-row");
    row.append(
      actionButton(
        this.#document,
        "Settings",
        () => this.#open({ name: "SETTINGS", from: "HUB" }, "hub-settings"),
        "secondary-action",
        "hub-settings",
      ),
      actionButton(
        this.#document,
        "About & Rules",
        () => this.#open({ name: "ABOUT" }, "about"),
        "secondary-action",
        "about",
      ),
    );
    actions.append(row);
    const omitted = element(this.#document, "aside", "scope-note");
    omitted.append(
      textElement(this.#document, "h2", "Local conquest"),
      textElement(
        this.#document,
        "p",
        "Multiplayer is not in this POC. There are no profiles, stores, leaderboards, or mystery locks.",
      ),
    );
    main.append(actions, omitted);
    return main;
  }

  #mode(): HTMLElement {
    const main = screen(this.#document, "front-screen", "Single Player");
    main.prepend(
      backButton(this.#document, () => this.#controller.navigate("HUB")),
    );
    const conquest = element(
      this.#document,
      "section",
      "mode-card selected-card",
    );
    conquest.append(
      textElement(this.#document, "p", "PLAYABLE", "card-kicker"),
      textElement(this.#document, "h2", "Conquest"),
      textElement(
        this.#document,
        "p",
        "Eliminate rivals by capturing all their cities. No turn limit. One to three Normal AI opponents.",
      ),
      actionButton(
        this.#document,
        "Choose Conquest",
        () => this.#controller.navigate("SETUP"),
        "primary-action",
        "choose-conquest",
      ),
    );
    const beyond = element(this.#document, "section", "omission-list");
    beyond.append(textElement(this.#document, "h2", "Beyond this POC"));
    for (const item of [
      ["Perfection", "Timed score play is not included."],
      ["Creative", "Sandbox controls are not included."],
      ["Boot Camp", "A separate tutorial campaign is not included."],
      ["Weekly Challenge", "Online recurring content is not included."],
    ] as const) {
      const row = element(this.#document, "div", "omission-row");
      row.append(
        textElement(this.#document, "strong", item[0]),
        textElement(this.#document, "span", item[1]),
      );
      beyond.append(row);
    }
    main.append(conquest, beyond);
    return main;
  }

  #setup(snapshot: AppSnapshot): HTMLElement {
    const main = screen(
      this.#document,
      "front-screen setup-screen",
      "Conquest Setup",
    );
    main.prepend(
      backButton(this.#document, () => this.#controller.requestBack()),
    );
    const form = element(this.#document, "form", "setup-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.#controller.navigate("FACTION");
    });
    form.append(
      this.#aiCountField(snapshot),
      this.#aiRelationsField(snapshot),
      this.#boardSizeField(snapshot),
    );
    const difficulty = element(this.#document, "div", "field-block");
    difficulty.append(
      textElement(this.#document, "h2", "Difficulty"),
      textElement(
        this.#document,
        "p",
        "Normal (POC)—same income and information rules.",
        "read-only-value",
      ),
    );
    form.append(
      difficulty,
      this.#seedField(snapshot),
      this.#colorField(snapshot),
    );
    form.append(
      actionButton(
        this.#document,
        "Continue",
        () => this.#controller.navigate("FACTION"),
        "primary-action",
        "continue",
      ),
    );
    main.append(form);
    return main;
  }

  #aiCountField(snapshot: AppSnapshot): HTMLElement {
    const fieldset = element(
      this.#document,
      "fieldset",
      "field-block segmented-field",
    );
    fieldset.append(textElement(this.#document, "legend", "AI opponents"));
    const row = element(this.#document, "div", "segmented-control");
    for (const count of [1, 2, 3] as const) {
      const label = element(this.#document, "label", "segment");
      const input = this.#document.createElement("input");
      input.type = "radio";
      input.name = "ai-count";
      input.value = String(count);
      input.checked = snapshot.draft.aiCount === count;
      input.addEventListener("change", () =>
        this.#controller.updateDraft({ aiCount: count }),
      );
      label.append(input, this.#document.createTextNode(String(count)));
      row.append(label);
    }
    fieldset.append(row);
    return fieldset;
  }

  #boardSizeField(snapshot: AppSnapshot): HTMLElement {
    const fieldset = element(this.#document, "fieldset", "field-block");
    fieldset.append(textElement(this.#document, "legend", "Board size"));
    const row = element(
      this.#document,
      "div",
      "segmented-control size-control",
    );
    const minimum = autoBoardSize(snapshot.draft.aiCount);
    for (const [value, labelText, size] of [
      ["AUTO", `Auto · ${minimum} × ${minimum}`, minimum],
      ["11", "Tiny · 11 × 11", 11],
      ["14", "Small · 14 × 14", 14],
      ["16", "Normal · 16 × 16", 16],
      ["20", "Large · 20 × 20", 20],
      ["25", "Huge · 25 × 25", 25],
    ] as const) {
      const label = element(this.#document, "label", "segment size-segment");
      const input = this.#document.createElement("input");
      input.type = "radio";
      input.name = "board-size";
      input.value = value;
      input.checked = String(snapshot.draft.boardPreset) === value;
      input.disabled = value !== "AUTO" && size < minimum;
      const preset = value === "AUTO" ? "AUTO" : size;
      input.addEventListener("change", () =>
        this.#controller.updateDraft({ boardPreset: preset }),
      );
      label.append(input, this.#document.createTextNode(labelText));
      if (input.disabled)
        label.title = `Requires at least ${minimum} × ${minimum} for ${snapshot.draft.aiCount} AI opponents.`;
      row.append(label);
    }
    fieldset.append(
      row,
      textElement(
        this.#document,
        "p",
        `Resolved board: ${resolveBoardSize(snapshot.draft.aiCount, snapshot.draft.boardPreset)} × ${resolveBoardSize(snapshot.draft.aiCount, snapshot.draft.boardPreset)}`,
        "field-help",
      ),
    );
    return fieldset;
  }

  #aiRelationsField(snapshot: AppSnapshot): HTMLElement {
    const fieldset = element(
      this.#document,
      "fieldset",
      "field-block segmented-field",
    );
    fieldset.append(textElement(this.#document, "legend", "AI relations"));
    const row = element(this.#document, "div", "segmented-control");
    for (const [value, labelText] of [
      ["RIVAL", "Rival"],
      ["COOPERATIVE", "Cooperate against you"],
    ] as const) {
      const label = element(this.#document, "label", "segment");
      const input = this.#document.createElement("input");
      input.type = "radio";
      input.name = "ai-relations";
      input.value = value;
      input.checked = snapshot.draft.aiMode === value;
      input.addEventListener("change", () =>
        this.#controller.updateDraft({ aiMode: value }),
      );
      label.append(input, this.#document.createTextNode(labelText));
      row.append(label);
    }
    fieldset.append(
      row,
      textElement(
        this.#document,
        "p",
        "Cooperative AI seats do not attack, enter, or newly explore one another’s territory. They remain independent and hostile to you.",
        "field-help",
      ),
    );
    return fieldset;
  }

  #seedField(snapshot: AppSnapshot): HTMLElement {
    const block = element(this.#document, "div", "field-block");
    const label = textElement(this.#document, "label", "Seed");
    label.htmlFor = "seed-input";
    const row = element(this.#document, "div", "input-action-row");
    const input = this.#document.createElement("input");
    input.id = "seed-input";
    input.name = "seed";
    input.maxLength = 64;
    input.value = snapshot.draft.seedText;
    input.placeholder = "Randomized when the match is confirmed";
    input.addEventListener("input", () =>
      this.#controller.updateDraft({ seedText: input.value }),
    );
    row.append(
      input,
      actionButton(
        this.#document,
        "Randomize",
        () => this.#controller.randomizeSeed(),
        "icon-action",
        "randomize",
      ),
      actionButton(
        this.#document,
        "Copy",
        () => void copyText(snapshot.draft.seedText),
        "icon-action",
        "copy-seed",
        snapshot.draft.seedText.length === 0,
      ),
    );
    block.append(
      label,
      row,
      textElement(
        this.#document,
        "p",
        snapshot.draft.seedText.length === 0
          ? "Empty: a random uint32 will be resolved before confirmation."
          : `Resolved simulation seed: ${snapshot.draft.resolvedSeed === null ? "after Continue" : snapshot.draft.resolvedSeed}`,
        "field-help",
      ),
    );
    return block;
  }

  #colorField(snapshot: AppSnapshot): HTMLElement {
    const fieldset = element(this.#document, "fieldset", "field-block");
    fieldset.append(textElement(this.#document, "legend", "Your color"));
    const row = element(this.#document, "div", "color-swatches");
    for (const color of ["CORAL", "TEAL", "GOLD", "VIOLET"] as const) {
      const label = element(
        this.#document,
        "label",
        `color-swatch color-${color.toLowerCase()}`,
      );
      const input = this.#document.createElement("input");
      input.type = "radio";
      input.name = "human-color";
      input.value = color;
      input.checked = snapshot.draft.humanColor === color;
      input.addEventListener("change", () =>
        this.#controller.updateDraft({ humanColor: color }),
      );
      label.append(
        input,
        textElement(
          this.#document,
          "span",
          `${title(color)} · Player 1 stripe`,
        ),
      );
      row.append(label);
    }
    fieldset.append(row);
    return fieldset;
  }

  #faction(snapshot: AppSnapshot): HTMLElement {
    const main = screen(
      this.#document,
      "front-screen faction-screen",
      "Choose Your Faction",
    );
    main.prepend(
      backButton(this.#document, () => this.#controller.navigate("SETUP")),
    );
    const card = element(
      this.#document,
      "article",
      `faction-card selected-card color-${snapshot.draft.humanColor.toLowerCase()}`,
    );
    card.setAttribute("aria-label", "POC Test Faction, selected");
    const hero = element(this.#document, "div", "faction-hero");
    hero.setAttribute("aria-hidden", "true");
    const fallback = element(this.#document, "div", "faction-hero-fallback");
    fallback.append(
      textElement(this.#document, "span", "⚔"),
      textElement(this.#document, "span", "✦"),
      textElement(this.#document, "span", "➳"),
    );
    if (FACTION_HERO_URL !== null) {
      const image = artImage(
        this.#document,
        FACTION_HERO_URL,
        "faction-hero-art",
        () => {
          hero.dataset.loaded = "true";
        },
      );
      hero.append(image);
    }
    hero.append(fallback);
    const details = element(this.#document, "div", "faction-details");
    details.append(
      textElement(
        this.#document,
        "p",
        "SELECTED · PLAYER 1 STRIPE",
        "card-kicker",
      ),
      textElement(this.#document, "h2", "POC Test Faction"),
      textElement(
        this.#document,
        "p",
        "Warrior · Archer · Defender · Rider · Catapult",
        "unit-roster",
      ),
      textElement(
        this.#document,
        "p",
        "No starting technology. Every seat uses identical rules.",
      ),
      actionButton(
        this.#document,
        "Start Conquest",
        () => this.#controller.requestStartMatch(),
        "primary-action",
        "start-conquest",
      ),
    );
    card.append(hero, details);
    main.append(card);
    return main;
  }

  #match(snapshot: AppSnapshot): HTMLElement {
    const view = snapshot.view;
    const match = snapshot.match;
    if (view === null || match === null)
      return this.#error("The match view is unavailable.");
    const main = element(this.#document, "main", "match-shell");
    const activeId = view.turnOrder[view.activeSeatIndex];
    const active = view.players.find((player) => player.id === activeId);
    const humanTurn =
      active?.controller === "HUMAN" && !snapshot.readOnlyFinalMap;
    const humanCanAct = humanTurn && snapshot.combatPresentation === null;
    const ownedCities = view.cities.filter(
      (city) => city.ownerId === view.viewer.id,
    );
    const ownedUnits = view.units.filter(
      (unit) => unit.ownerId === view.viewer.id,
    );
    const hud = element(this.#document, "header", "match-hud");
    hud.append(
      hudChip(
        this.#document,
        `Player 1 · ${title(view.viewer.color)} stripe`,
        "player-identity",
      ),
      hudChip(
        this.#document,
        `★ ${view.viewer.stars} (+${nextIncome(match, view.viewer.id)})`,
        "stars",
        ACCEPTED_ART_URLS["ui-star"],
      ),
      hudChip(
        this.#document,
        `Round ${view.round} · ${snapshot.readOnlyFinalMap ? "Final Map" : humanTurn ? "Your Turn" : `Player ${activeId ?? "?"} thinking`}`,
        "turn-status",
      ),
      hudChip(
        this.#document,
        `◆ ${ownedCities.length} cities · ● ${ownedUnits.length} units`,
        "counts",
      ),
    );
    const nav = element(this.#document, "nav", "hud-actions");
    nav.setAttribute("aria-label", "Match views");
    nav.append(
      actionButton(
        this.#document,
        "Settings",
        () => this.#open({ name: "SETTINGS", from: "MATCH" }, "settings"),
        "hud-button",
        "settings",
      ),
      actionButton(
        this.#document,
        "Stats",
        () => this.#open({ name: "STATS" }, "stats"),
        "hud-button",
        "stats",
      ),
      actionButton(
        this.#document,
        "Tech",
        () => this.#open({ name: "TECH" }, "tech"),
        "hud-button",
        "tech",
      ),
    );
    hud.append(nav);
    const stage = element(this.#document, "section", "board-stage");
    stage.setAttribute("aria-label", "Battlefield and selection controls");
    const boardHost = element(this.#document, "div", "board-host");
    boardHost.dataset.boardHost = "true";
    stage.append(boardHost, this.#boardInspectControls(view));
    const footer = element(this.#document, "footer", "match-actions");
    const cameraActions = element(
      this.#document,
      "div",
      "match-camera-actions",
    );
    cameraActions.append(
      actionButton(
        this.#document,
        "Zoom out",
        () => this.#boardHost.zoom("OUT"),
        "icon-action",
        "zoom-out",
      ),
      actionButton(
        this.#document,
        "Zoom in",
        () => this.#boardHost.zoom("IN"),
        "icon-action",
        "zoom-in",
      ),
    );
    footer.append(cameraActions);
    const selectedActions =
      this.#selectedUnitDock(snapshot, view) ??
      this.#selectedCityDock(snapshot, view) ??
      this.#selectedTileDock(snapshot, view);
    if (selectedActions !== null) footer.append(selectedActions);
    if (snapshot.readOnlyFinalMap) {
      footer.append(
        actionButton(
          this.#document,
          "Results",
          () => this.#controller.showResults(),
          "primary-action",
          "results",
        ),
      );
    } else if (!humanTurn) {
      const progress = element(this.#document, "div", "ai-progress");
      progress.setAttribute("role", "status");
      progress.append(
        textElement(
          this.#document,
          "span",
          `Player ${activeId ?? "?"} is thinking…`,
        ),
        element(this.#document, "span", "thinking-dots"),
      );
      footer.append(
        progress,
        actionButton(
          this.#document,
          snapshot.fastForwarding ? "Finishing…" : "Fast Forward",
          () => this.#controller.fastForwardAi(),
          "primary-action",
          "fast-forward",
        ),
      );
    } else {
      const legalCommands = this.#legalCommands(view);
      const end = legalCommands.find((command) => command.kind === "END_TURN");
      footer.append(
        actionButton(
          this.#document,
          "End Turn",
          () => {
            if (end !== undefined) this.#controller.requestCommand(end);
          },
          "end-turn",
          "end-turn",
          end === undefined || !humanCanAct,
        ),
      );
    }
    main.append(hud, stage, footer);
    return main;
  }

  #selectedUnitDock(
    snapshot: AppSnapshot,
    view: PlayerView,
  ): HTMLElement | null {
    const selected = this.#selected;
    if (selected?.kind !== "UNIT") return null;
    const unit = view.units.find(
      (candidate) => candidate.id === selected.unitId,
    );
    if (unit === undefined) return null;
    const owned = unit.ownerId === view.viewer.id;
    const rule = requireRuleset(view.rulesetId).units[unit.type];
    const commands = this.#legalCommands(view).filter(
      (command) => owned && "unitId" in command && command.unitId === unit.id,
    );
    const immediate = commands.filter(
      (
        command,
      ): command is Extract<
        Command,
        { readonly kind: "CAPTURE" | "RECOVER" | "PROMOTE" | "WAIT" }
      > =>
        command.kind === "CAPTURE" ||
        command.kind === "RECOVER" ||
        command.kind === "PROMOTE" ||
        command.kind === "WAIT",
    );
    const hasMove = commands.some((command) => command.kind === "MOVE");
    const hasEscape = commands.some(
      (command) => command.kind === "ESCAPE_MOVE",
    );
    const hasAttack = commands.some((command) => command.kind === "ATTACK");
    const panel = element(this.#document, "section", "unit-action-dock");
    panel.setAttribute("aria-label", `Selected ${title(unit.type)}`);
    const summary = element(this.#document, "div", "unit-dock-summary");
    summary.append(
      textElement(this.#document, "strong", title(unit.type)),
      textElement(
        this.#document,
        "span",
        `${unit.hp}/${unit.maxHp} HP · ${unitSelectionState(view, unit, commands.length)}`,
        "unit-dock-state",
      ),
    );
    const stats = element(this.#document, "dl", "unit-dock-stats");
    for (const [label, value] of [
      ["Attack", rule.attack],
      ["Defense", rule.defense],
      ["Move", rule.move],
      ["Range", rule.range],
    ] as const) {
      const stat = element(this.#document, "div");
      stat.append(
        textElement(this.#document, "dt", label),
        textElement(this.#document, "dd", String(value)),
      );
      stats.append(stat);
    }
    summary.append(stats);
    panel.append(summary);
    const buttons = element(this.#document, "div", "unit-dock-action-buttons");
    for (const command of immediate) {
      const label =
        command.kind === "CAPTURE"
          ? captureActionLabel(view, command)
          : title(command.kind);
      buttons.append(
        actionButton(
          this.#document,
          label,
          () => {
            this.#controller.requestCommand(command);
            this.#boardHost.focus();
          },
          command.kind === "CAPTURE"
            ? "primary-action unit-dock-action capture-action"
            : "context-action unit-dock-action",
          `unit-dock-${command.kind.toLowerCase()}`,
          !this.#humanCanAct(snapshot),
        ),
      );
    }
    if (buttons.childElementCount > 0) panel.append(buttons);
    const hints = [
      hasEscape ? "Choose a highlighted tile to escape." : null,
      hasMove ? "Choose a highlighted tile to move." : null,
      hasAttack ? "Choose a marked enemy to attack." : null,
    ].filter((hint): hint is string => hint !== null);
    if (hints.length > 0)
      panel.append(
        textElement(this.#document, "p", hints.join(" "), "unit-dock-hint"),
      );
    else if (immediate.length === 0)
      panel.append(
        textElement(
          this.#document,
          "p",
          "No actions available.",
          "unit-dock-hint",
        ),
      );
    return panel;
  }

  #selectedCityDock(
    snapshot: AppSnapshot,
    view: PlayerView,
  ): HTMLElement | null {
    const selected = this.#selected;
    if (selected?.kind !== "CITY") return null;
    const city = view.cities.find(
      (candidate) => candidate.id === selected.cityId,
    );
    if (city === undefined) return null;
    const owned = city.ownerId === view.viewer.id;
    const besieged = view.units.some(
      (unit) => unit.ownerId !== city.ownerId && sameCoord(unit.at, city.at),
    );
    const threshold = city.level + 1;
    const income = besieged
      ? 0
      : city.level +
        (city.isCapital ? 1 : 0) +
        (city.rewardLevel2 === "WORKSHOP" ? 1 : 0);
    const rewards = [
      city.rewardLevel2 === "WORKSHOP"
        ? "Workshop"
        : city.rewardLevel2 === "SURVEY"
          ? "Survey"
          : null,
      city.rewardLevel3 === "RESOURCES"
        ? "Resources"
        : city.rewardLevel3 === "CITY_WALL"
          ? "City Wall"
          : null,
    ].filter((reward): reward is string => reward !== null);
    const legal = this.#legalCommands(view);
    const trainCommands = legal.filter(
      (command): command is Extract<Command, { readonly kind: "TRAIN" }> =>
        owned && command.kind === "TRAIN" && command.cityId === city.id,
    );

    const panel = element(this.#document, "section", "city-action-dock");
    panel.tabIndex = -1;
    const heading = textElement(
      this.#document,
      "h2",
      `City ${city.id}`,
      "city-dock-title",
    );
    heading.id = `selected-city-${city.id}-title`;
    panel.setAttribute("aria-labelledby", heading.id);
    const summary = element(this.#document, "div", "city-dock-summary");
    summary.append(
      heading,
      textElement(
        this.#document,
        "p",
        `Player ${city.ownerId}${city.isCapital ? " · Capital" : ""}${besieged ? " · Besieged" : ""}`,
        `city-dock-state${besieged ? " city-besieged" : ""}`,
      ),
    );
    const stats = element(this.#document, "dl", "city-dock-stats");
    for (const [label, value, detail] of [
      ["Level", `${city.level}`, "Current city level"],
      [
        "Population",
        `${city.population}/${threshold}`,
        `${Math.max(0, threshold - city.population)} population to next level`,
      ],
      [
        "Income",
        `★ ${income}`,
        besieged ? "No income while besieged" : "Next turn city income",
      ],
      [
        "Capacity",
        owned
          ? `${city.assignedCounted ?? 0}/${cityCapacity(city)}`
          : `—/${cityCapacity(city)}`,
        owned
          ? "Non-exempt assigned units and training limit"
          : "Training limit; rival assignments are hidden",
      ],
      [
        "Founders",
        owned ? `${city.assignedExempt ?? 0}` : "—",
        owned
          ? "Assigned capacity-exempt founding units"
          : "Rival exemptions are hidden",
      ],
      [
        "Rewards",
        rewards.length === 0 ? "None" : rewards.join(" · "),
        "Chosen rewards",
      ],
    ] as const) {
      const stat = element(this.#document, "div", "city-dock-stat");
      stat.setAttribute("aria-label", `${label}: ${value}. ${detail}`);
      stat.append(
        textElement(this.#document, "dt", label),
        textElement(this.#document, "dd", value),
      );
      stats.append(stat);
    }
    summary.append(stats);
    if (Number.isSafeInteger(threshold)) {
      const meter = element(this.#document, "div", "city-dock-population");
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-label", `City ${city.id} population progress`);
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", String(threshold));
      meter.setAttribute("aria-valuenow", String(city.population));
      meter.setAttribute(
        "aria-valuetext",
        `${city.population} of ${threshold} population toward level ${city.level + 1}`,
      );
      const fill = element(this.#document, "span", "city-dock-population-fill");
      fill.style.width = `${threshold === 0 ? 0 : Math.min(100, (city.population / threshold) * 100)}%`;
      meter.append(fill);
      summary.append(meter);
    }
    panel.append(summary);

    const actions = element(this.#document, "div", "city-dock-actions");
    actions.setAttribute("aria-label", `City ${city.id} actions`);
    for (const command of trainCommands) {
      const unitLabel = title(command.unit);
      const cost = publicUnitCost(view, command.unit);
      const button = actionButton(
        this.#document,
        unitLabel,
        () => this.#controller.requestCommand(command),
        "city-dock-command city-train-action",
        `city-unit-${command.unit.toLowerCase()}`,
        !this.#humanCanAct(snapshot),
      );
      button.setAttribute(
        "aria-label",
        `Train ${unitLabel} in City ${city.id} for ${cost} stars`,
      );
      const unitArtUrl =
        ACCEPTED_ART_URLS[`unit-${command.unit.toLowerCase()}`];
      const unitArt =
        unitArtUrl === undefined
          ? codeNativeUnitArt(this.#document, command.unit)
          : artImage(this.#document, unitArtUrl, "city-command-art");
      unitArt.setAttribute("aria-hidden", "true");
      button.replaceChildren(
        unitArt,
        textElement(this.#document, "strong", unitLabel),
        textElement(this.#document, "span", `★ ${cost}`, "city-command-meta"),
      );
      actions.append(button);
    }
    if (actions.childElementCount > 0) panel.append(actions);
    else
      panel.append(
        textElement(
          this.#document,
          "p",
          "No training available.",
          "city-dock-empty",
        ),
      );
    return panel;
  }

  #selectedTileDock(
    snapshot: AppSnapshot,
    view: PlayerView,
  ): HTMLElement | null {
    const selected = this.#selected;
    if (selected?.kind !== "TILE") return null;
    const tile = view.board.tiles.find((candidate) =>
      sameCoord(candidate.at, selected.at),
    );
    if (tile === undefined) return null;

    const panel = element(this.#document, "section", "tile-action-dock");
    panel.tabIndex = -1;
    const heading = textElement(
      this.#document,
      "h2",
      `Tile ${tile.at.x}, ${tile.at.y}`,
      "tile-dock-title",
    );
    heading.id = `selected-tile-${tile.at.x}-${tile.at.y}-title`;
    panel.setAttribute("aria-labelledby", heading.id);
    if (!tile.explored) {
      panel.append(
        heading,
        textElement(this.#document, "p", "Unexplored", "tile-dock-unexplored"),
      );
      return panel;
    }

    const city = view.cities.find(
      (candidate) => candidate.id === tile.territoryCityId,
    );
    const cityOnTile = view.cities.find((candidate) =>
      sameCoord(candidate.at, tile.at),
    );
    const unit = view.units.find((candidate) =>
      sameCoord(candidate.at, tile.at),
    );
    const terrain =
      tile.terrain === "MOUNTAIN" &&
      tile.resource === null &&
      tile.improvement === null
        ? "Mountain · no ore"
        : title(tile.terrain);
    const feature =
      tile.improvement === "MINE"
        ? "Mine"
        : tile.improvement === "LUMBER_MILL"
          ? "Lumber Mill"
          : tile.resource === "ORE"
            ? "Ore vein"
            : tile.resource === "FRUIT"
              ? "Fruit"
              : tile.resource === "ANIMAL"
                ? "Animal"
                : tile.site === null
                  ? "None"
                  : title(tile.site);
    const territory =
      city === undefined
        ? tile.territoryCenter === null
          ? "Unclaimed"
          : "Neutral territory"
        : `${city.ownerId === view.viewer.id ? "Yours" : `Player ${city.ownerId}`} · City ${city.id}`;
    const occupants = [
      cityOnTile === undefined
        ? null
        : `City ${cityOnTile.id} · Player ${cityOnTile.ownerId}`,
      unit === undefined
        ? null
        : `${title(unit.type)} · Player ${unit.ownerId}`,
    ].filter((value): value is string => value !== null);
    const summary = element(this.#document, "div", "tile-dock-summary");
    summary.append(
      heading,
      textElement(
        this.#document,
        "p",
        `${terrain} · ${feature}`,
        "tile-dock-state",
      ),
    );
    const stats = element(this.#document, "dl", "tile-dock-stats");
    for (const [label, value] of [
      ["Territory", territory],
      ["Occupant", occupants.length === 0 ? "None" : occupants.join(" · ")],
      [
        "Movement",
        tile.terrain === "MOUNTAIN"
          ? "1 movement · ends move · Climbing required"
          : tile.terrain === "FOREST"
            ? "1 movement · ends move"
            : "1 movement",
      ],
      [
        "Defense",
        tile.terrain === "MOUNTAIN"
          ? "1.5×"
          : tile.terrain === "FOREST"
            ? "1.5× with Archery"
            : "1×",
      ],
    ] as const) {
      const stat = element(this.#document, "div", "tile-dock-stat");
      stat.append(
        textElement(this.#document, "dt", label),
        textElement(this.#document, "dd", value),
      );
      stats.append(stat);
    }
    summary.append(stats);
    panel.append(summary);

    const exactCommand = this.#legalCommands(view).find(
      (
        command,
      ): command is Extract<
        Command,
        {
          readonly kind:
            | "HARVEST_FRUIT"
            | "HUNT_ANIMAL"
            | "BUILD_LUMBER_MILL"
            | "BUILD_MINE";
        }
      > =>
        (command.kind === "HARVEST_FRUIT" ||
          command.kind === "HUNT_ANIMAL" ||
          command.kind === "BUILD_LUMBER_MILL" ||
          command.kind === "BUILD_MINE") &&
        sameCoord(command.at, tile.at),
    );
    const besieged =
      city !== undefined &&
      view.units.some(
        (candidate) =>
          candidate.ownerId !== city.ownerId &&
          sameCoord(candidate.at, city.at),
      );
    const actionKind =
      tile.resource === "FRUIT"
        ? "HARVEST_FRUIT"
        : tile.resource === "ANIMAL"
          ? "HUNT_ANIMAL"
          : tile.resource === "ORE" && tile.improvement === null
            ? "BUILD_MINE"
            : tile.terrain === "FOREST" &&
                tile.resource === null &&
                tile.improvement === null
              ? "BUILD_LUMBER_MILL"
              : null;
    if (actionKind !== null) {
      const rules = requireRuleset(view.rulesetId);
      const config =
        actionKind === "HARVEST_FRUIT"
          ? {
              noun: "fruit",
              label: "Harvest Fruit",
              symbol: "F",
              className: "fruit-action",
              focusId: "harvest-fruit",
              statusIdSuffix: "fruit",
              cost: rules.fruitCost,
              population: rules.fruitPopulation,
              status: this.#fruitStatus(
                snapshot,
                city ?? null,
                besieged,
                exactCommand?.kind === "HARVEST_FRUIT",
              ),
            }
          : actionKind === "HUNT_ANIMAL"
            ? {
                noun: "animal",
                label: "Hunt Animal",
                symbol: "H",
                className: "animal-action",
                focusId: "hunt-animal",
                statusIdSuffix: "animal",
                cost: rules.animalCost,
                population: rules.animalPopulation,
                status: this.#animalStatus(
                  snapshot,
                  city ?? null,
                  besieged,
                  exactCommand?.kind === "HUNT_ANIMAL",
                ),
              }
            : actionKind === "BUILD_LUMBER_MILL"
              ? {
                  noun: "forest",
                  label: "Build Lumber Mill",
                  symbol: "L",
                  className: "lumber-action",
                  focusId: "build-lumber-mill",
                  statusIdSuffix: "lumber",
                  cost: rules.lumberMillCost,
                  population: rules.lumberMillPopulation,
                  status: this.#lumberMillStatus(
                    snapshot,
                    city ?? null,
                    besieged,
                    exactCommand?.kind === "BUILD_LUMBER_MILL",
                  ),
                }
              : {
                  noun: "ore",
                  label: "Build Mine",
                  symbol: "M",
                  className: "mine-action",
                  focusId: "build-mine",
                  statusIdSuffix: "mine",
                  cost: rules.mineCost,
                  population: rules.minePopulation,
                  status: this.#mineStatus(
                    snapshot,
                    city ?? null,
                    false,
                    besieged,
                    exactCommand?.kind === "BUILD_MINE",
                  ),
                };
      const statusText = textElement(
        this.#document,
        "p",
        `${city === undefined ? `Unclaimed ${config.noun}` : `Grows City ${city.id}`}. ${config.status}`,
        "tile-resource-status",
      );
      statusText.id = `tile-${tile.at.x}-${tile.at.y}-${config.statusIdSuffix}-status`;
      panel.append(statusText);
      if (
        exactCommand !== undefined &&
        exactCommand.kind === actionKind &&
        this.#humanCanAct(snapshot)
      ) {
        const button = actionButton(
          this.#document,
          config.label,
          () => {
            this.#controller.requestCommand(exactCommand);
            this.#boardHost.focus();
          },
          `tile-resource-action ${config.className}`,
          config.focusId,
        );
        button.setAttribute(
          "aria-label",
          `${config.label} at ${tile.at.x}, ${tile.at.y} for ${config.cost} stars; adds ${config.population} population${city === undefined ? "" : ` to City ${city.id}`}`,
        );
        button.setAttribute("aria-describedby", statusText.id);
        button.replaceChildren(
          textElement(
            this.#document,
            "span",
            config.symbol,
            "tile-command-symbol",
          ),
          textElement(this.#document, "strong", config.label),
          textElement(
            this.#document,
            "span",
            `★ ${config.cost} · +${config.population} pop`,
            "tile-command-meta",
          ),
        );
        panel.append(button);
      }
    }
    return panel;
  }

  #boardInspectControls(view: PlayerView): HTMLElement {
    const controls = element(this.#document, "div", "board-inspector");
    controls.setAttribute("aria-label", "Accessible map inspection");
    controls.append(
      textElement(
        this.#document,
        "p",
        "Accessible map cursor",
        "inspector-label",
      ),
    );
    const select = this.#document.createElement("select");
    select.setAttribute("aria-label", "Choose a map coordinate or object");
    select.dataset.focusId = "map-inspector";
    const prompt = this.#document.createElement("option");
    prompt.value = "";
    prompt.textContent = "Inspect…";
    select.append(prompt);
    for (const unit of view.units)
      select.append(
        option(
          this.#document,
          `unit:${unit.id}`,
          `${title(unit.type)} · Player ${unit.ownerId} · ${unit.hp}/${unit.maxHp} HP · ${unit.activation.handled ? "Handled" : "Needs action"}`,
        ),
      );
    for (const city of view.cities)
      select.append(
        option(
          this.#document,
          `city:${city.id}`,
          `City ${city.id} · Player ${city.ownerId} · level ${city.level}`,
        ),
      );
    const explored = view.board.tiles.find((tile) => tile.explored);
    if (explored !== undefined)
      select.append(
        option(
          this.#document,
          `tile:${explored.at.x}:${explored.at.y}`,
          `Tile ${explored.at.x}, ${explored.at.y}`,
        ),
      );
    const commands = this.#legalCommands(view);
    for (const tile of view.board.tiles) {
      select.append(
        option(
          this.#document,
          `coordinate:${tile.at.x}:${tile.at.y}`,
          `Activate ${coordinateActivationLabel(view, tile.at, this.#selected, commands)}`,
        ),
      );
    }
    select.addEventListener("change", () => {
      const [kind, first, second] = select.value.split(":");
      if (kind === "unit" && first !== undefined)
        this.#selectBoardEntity({ kind: "UNIT", unitId: Number(first) });
      else if (kind === "city" && first !== undefined)
        this.#inspectBoardEntity({ kind: "CITY", cityId: Number(first) });
      else if (kind === "tile" && first !== undefined && second !== undefined)
        this.#inspectBoardEntity({
          kind: "TILE",
          at: { x: Number(first), y: Number(second) },
        });
      else if (
        kind === "coordinate" &&
        first !== undefined &&
        second !== undefined
      )
        this.#boardHost.activate({ x: Number(first), y: Number(second) });
    });
    controls.append(select);
    return controls;
  }

  #result(snapshot: AppSnapshot): HTMLElement {
    const outcome = snapshot.result;
    const match = snapshot.match;
    if (outcome === null || match === null)
      return this.#error("No authoritative result is available.");
    const victory = outcome.kind === "VICTORY";
    const main = screen(
      this.#document,
      `result-screen ${victory ? "victory" : "defeat"}`,
      victory ? "Victory" : "Defeat",
    );
    const summary = element(this.#document, "dl", "result-summary");
    const winner =
      outcome.kind === "DEFEAT" ? outcome.defeatedByPlayerId : outcome.winnerId;
    for (const [term, value] of [
      ["Winner", `Player ${winner}`],
      ["Rounds completed", String(match.round)],
      ["Seed", seedLabel(match.setup.seed)],
      ["Opponents", String(match.setup.aiCount)],
      ["Board", `${match.setup.width} × ${match.setup.height}`],
      ["Cities captured", String(snapshot.tallies.citiesCaptured)],
      [
        "Units defeated / lost",
        `${snapshot.tallies.unitsDefeated} / ${snapshot.tallies.unitsLost}`,
      ],
      [
        "Technologies",
        String(
          match.players.find((player) => player.controller === "HUMAN")
            ?.researchedTechs.length ?? 0,
        ),
      ],
    ] as const)
      summary.append(definition(this.#document, term, value));
    const tallyNote = textElement(
      this.#document,
      "p",
      "Defeated counts your combat kills. Lost counts every removed unit, including elimination cleanup.",
      "field-help",
    );
    const actions = element(this.#document, "div", "result-actions");
    actions.append(
      actionButton(
        this.#document,
        "Play Again",
        () => this.#controller.openConfirmation({ kind: "PLAY_AGAIN" }),
        "primary-action",
        "play-again",
      ),
      actionButton(
        this.#document,
        "New Conquest",
        () => this.#controller.newConquestFromResult(),
        "secondary-action",
        "result-new",
      ),
      actionButton(
        this.#document,
        "View Final Map",
        () => this.#controller.viewFinalMap(),
        "secondary-action",
        "final-map",
      ),
      actionButton(
        this.#document,
        "Return to Hub",
        () => this.#controller.exitToHub(),
        "secondary-action",
        "result-hub",
      ),
    );
    main.append(
      textElement(
        this.#document,
        "p",
        victory
          ? "The last rival banner has fallen."
          : "Your last city has been taken.",
        "result-deck",
      ),
      summary,
      tallyNote,
      actions,
    );
    return main;
  }

  #error(
    message = "Pulp Wars could not initialize the requested match.",
  ): HTMLElement {
    const main = screen(
      this.#document,
      "error-screen",
      "Something went sideways",
    );
    main.append(
      textElement(this.#document, "p", message),
      actionButton(
        this.#document,
        "Reload",
        () => this.#document.defaultView?.location.reload(),
        "primary-action",
        "reload",
      ),
      actionButton(
        this.#document,
        "Copy Diagnostic",
        () => void copyText(message),
        "secondary-action",
        "copy-diagnostic",
      ),
    );
    return main;
  }

  #overlay(snapshot: AppSnapshot): HTMLElement {
    const overlay = snapshot.overlay;
    if (overlay.name === "NONE")
      throw new Error("Cannot render an empty overlay");
    const backdrop = element(this.#document, "div", "modal-backdrop");
    const dialog = element(
      this.#document,
      "section",
      `modal modal-${overlay.name.toLowerCase()}`,
    );
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.tabIndex = -1;
    dialog.dataset.modal = "true";
    const content = this.#overlayContent(snapshot, overlay);
    dialog.append(content);
    backdrop.append(dialog);
    return backdrop;
  }

  #overlayContent(
    snapshot: AppSnapshot,
    overlay: Exclude<MatchOverlay, { readonly name: "NONE" }>,
  ): HTMLElement {
    switch (overlay.name) {
      case "ABOUT":
        return this.#simpleOverlay(
          "About & Rules",
          "Capture every rival city before losing your last city. Land maps contain Grass, Forest, Mountains, villages, Fruit, Animals, and ore veins. Organization harvests Fruit; Hunting hunts Animals; Forestry builds Lumber Mills on empty Forest; Mining builds Mines only on ore. Mathematics unlocks the range-3 Catapult.",
        );
      case "HELP":
        return this.#help();
      case "SETTINGS":
        return this.#settings(snapshot, overlay.from);
      case "STATS":
        return this.#stats(snapshot);
      case "TECH":
        return this.#tech(snapshot);
      case "REWARD":
        return this.#reward(snapshot, overlay.cityId);
      case "CONFIRM":
        return this.#confirmation(snapshot, overlay.action);
      case "SAVE_RECOVERY":
        return this.#saveRecovery(overlay.diagnostic);
      case "AI_ERROR":
        return this.#aiError(overlay.diagnostic);
    }
  }

  #simpleOverlay(titleText: string, body: string): HTMLElement {
    const article = element(this.#document, "article", "modal-content");
    article.append(
      textElement(this.#document, "h2", titleText),
      textElement(this.#document, "p", body),
      closeButton(this.#document, () => this.#controller.closeOverlay()),
    );
    return article;
  }

  #help(): HTMLElement {
    const article = element(this.#document, "article", "modal-content");
    article.append(textElement(this.#document, "h2", "Help & Controls"));
    const list = element(this.#document, "dl", "shortcut-list");
    for (const [key, action] of [
      ["Arrow / Shift+Arrow", "Move the logical map cursor"],
      ["Enter / Space", "Select or confirm"],
      ["T", "Technology"],
      ["G", "Stats"],
      ["E", "End Turn"],
      ["+ / −", "Zoom"],
      ["Escape", "Close or pause"],
      ["?", "Help"],
    ] as const)
      list.append(definition(this.#document, key, action));
    article.append(
      list,
      textElement(
        this.#document,
        "p",
        "Pointer and touch: tap to select, drag to pan, and use explicit zoom controls. No action requires double-click or hover.",
      ),
      textElement(
        this.#document,
        "p",
        "City growth uses the selected tile dock: Organization harvests Fruit for 2 stars and +1 population; Hunting hunts Animals for 2 stars and +1 population; Forestry builds Lumber Mills on empty Forest for 3 stars and +1 population; Climbing then Mining builds only on explicit ore for 5 stars and +2 population.",
      ),
      textElement(
        this.#document,
        "p",
        "Forest costs 1 movement and ends the move. Archery gives a defending unit on Forest 1.5× defense. Mathematics unlocks the Catapult: 8 stars, Attack 4, range 3, no attack after moving, and a one-hit defeat against a full-health Warrior without a defense bonus.",
      ),
      closeButton(this.#document, () => this.#controller.closeOverlay()),
    );
    return article;
  }

  #settings(snapshot: AppSnapshot, from: "HUB" | "MATCH"): HTMLElement {
    const article = element(
      this.#document,
      "article",
      "modal-content settings-content",
    );
    article.append(
      textElement(
        this.#document,
        "h2",
        from === "MATCH" ? "Paused · Settings" : "Settings",
      ),
    );
    const scale = labeledSelect(
      this.#document,
      "UI scale",
      "ui-scale",
      [
        ["1", "100%"],
        ["1.25", "125%"],
        ["1.5", "150%"],
        ["2", "200%"],
      ],
      String(snapshot.settings.uiScale),
      (value) =>
        this.#controller.updateSettings({
          uiScale: Number(value) as 1 | 1.25 | 1.5 | 2,
        }),
    );
    const motion = labeledSelect(
      this.#document,
      "Motion",
      "motion",
      [
        ["FULL", "Full"],
        ["REDUCED", "Reduced"],
      ],
      snapshot.settings.motion,
      (value) =>
        this.#controller.updateSettings({
          motion: value as "FULL" | "REDUCED",
        }),
    );
    const speed = labeledSelect(
      this.#document,
      "Animation speed",
      "animation-speed",
      [
        ["NORMAL", "Normal"],
        ["FAST", "Fast"],
      ],
      snapshot.settings.animationSpeed,
      (value) =>
        this.#controller.updateSettings({
          animationSpeed: value as "NORMAL" | "FAST",
        }),
    );
    const contrast = element(this.#document, "label", "toggle-row");
    const checkbox = this.#document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = snapshot.settings.highContrast;
    checkbox.addEventListener("change", () =>
      this.#controller.updateSettings({ highContrast: checkbox.checked }),
    );
    contrast.append(
      checkbox,
      this.#document.createTextNode("High-contrast map overlays"),
    );
    article.append(
      scale,
      motion,
      speed,
      contrast,
      actionButton(
        this.#document,
        "Help & Controls",
        () => this.#controller.openOverlay({ name: "HELP" }),
        "secondary-action",
        "settings-help",
      ),
    );
    if (from === "MATCH") {
      article.append(
        actionButton(
          this.#document,
          "Resume",
          () => this.#close(),
          "primary-action",
          "resume-settings",
        ),
        actionButton(
          this.#document,
          "Restart Same Match",
          () => this.#controller.openConfirmation({ kind: "RESTART" }),
          "secondary-action destructive",
          "restart",
        ),
        actionButton(
          this.#document,
          "Exit to Hub",
          () => this.#controller.exitToHub(),
          "secondary-action",
          "exit-hub",
        ),
        actionButton(
          this.#document,
          "Delete Save",
          () => this.#controller.openConfirmation({ kind: "DELETE_SAVE" }),
          "secondary-action destructive",
          "delete-save",
        ),
      );
    } else article.append(closeButton(this.#document, () => this.#close()));
    return article;
  }

  #stats(snapshot: AppSnapshot): HTMLElement {
    const view = snapshot.view;
    const match = snapshot.match;
    const article = element(
      this.#document,
      "article",
      "modal-content stats-content",
    );
    article.append(
      textElement(this.#document, "h2", "Game Stats"),
      ...(match === null
        ? []
        : [
            textElement(
              this.#document,
              "p",
              match.setup.aiMode === "COOPERATIVE"
                ? "Cooperative AI against you"
                : "Rival AI",
              "field-help",
            ),
          ]),
      textElement(
        this.#document,
        "p",
        "Capture all rival cities before losing your last city.",
        "objective",
      ),
      textElement(
        this.#document,
        "p",
        "Kills are combat defeats; losses include units removed during elimination cleanup.",
        "field-help",
      ),
    );
    if (view !== null && match !== null) {
      const list = element(this.#document, "div", "stats-list");
      const active = view.turnOrder[view.activeSeatIndex];
      for (const id of view.turnOrder) {
        const player = view.players.find((candidate) => candidate.id === id);
        if (player === undefined) continue;
        const cities = match.cities.filter((city) => city.ownerId === id);
        const units = match.units.filter((unit) => unit.ownerId === id);
        const tallies = snapshot.playerTallies.find(
          (candidate) => candidate.playerId === id,
        );
        const row = element(
          this.#document,
          "article",
          `stats-row color-${player.color.toLowerCase()}`,
        );
        row.append(
          textElement(
            this.#document,
            "h3",
            `Player ${id} · ${title(player.color)} ${player.controller === "HUMAN" ? "Human" : "Normal AI"}${id === active ? " · Current turn" : ""}`,
          ),
          textElement(
            this.#document,
            "p",
            `${player.status === "ACTIVE" ? "Active" : "Eliminated"} · ${cities.length} cities · ${cities.filter((city) => city.isCapital).length} capitals · ${units.length} units`,
          ),
          textElement(
            this.#document,
            "p",
            `${player.stars} stars · ${player.researchedTechs.length} technologies · ${tallies?.kills ?? 0} kills · ${tallies?.losses ?? 0} losses`,
          ),
          textElement(this.#document, "p", `Round ${view.round}`),
        );
        list.append(row);
      }
      article.append(list);
    }
    article.append(closeButton(this.#document, () => this.#close()));
    return article;
  }

  #tech(snapshot: AppSnapshot): HTMLElement {
    const view = snapshot.view;
    const article = element(
      this.#document,
      "article",
      "modal-content tech-content",
    );
    article.append(textElement(this.#document, "h2", "Technology"));
    if (view !== null) {
      const legal = this.#legalCommands(view);
      const technologies = requireRuleset(view.rulesetId).technologies;
      const relationshipSummary = textElement(
        this.#document,
        "p",
        "Technology dependencies: Climbing unlocks Mining. Riding has no child technology. Hunting unlocks Forestry and Archery; Forestry unlocks Mathematics. Organization unlocks Strategy. Warrior is available without technology.",
        "sr-only",
      );
      relationshipSummary.id = "tech-relationships";
      const overviewHeader = element(
        this.#document,
        "div",
        "tech-overview-header",
      );
      overviewHeader.append(
        textElement(
          this.#document,
          "p",
          "Choose a symbol for details",
          "tech-overview-instruction",
        ),
        techLegend(this.#document),
      );
      const tree = element(this.#document, "div", "tech-tree");
      tree.setAttribute("role", "tree");
      tree.setAttribute("aria-label", "Technology dependency tree");
      tree.setAttribute("aria-describedby", relationshipSummary.id);
      for (const rootTech of technologies.filter((tech) => tech.tier === 1)) {
        const descendants = technologies.filter((tech) =>
          tech.prerequisites.includes(rootTech.id),
        );
        const branch = element(this.#document, "div", "tech-branch");
        branch.setAttribute("role", "group");
        branch.setAttribute(
          "aria-label",
          descendants.length === 0
            ? `${title(rootTech.id)} branch; no dependent technology`
            : `${title(rootTech.id)} unlocks ${descendants.map((tech) => title(tech.id)).join(", ")}`,
        );
        branch.append(this.#techNode(snapshot, rootTech.id, legal));
        const appendDescendants = (parent: TechId): void => {
          for (const child of technologies.filter((tech) =>
            tech.prerequisites.includes(parent),
          )) {
            const connector = element(this.#document, "span", "tech-connector");
            connector.setAttribute("aria-hidden", "true");
            branch.append(connector, this.#techNode(snapshot, child.id, legal));
            appendDescendants(child.id);
          }
        };
        if (descendants.length > 0) {
          appendDescendants(rootTech.id);
        }
        tree.append(branch);
      }
      article.append(
        textElement(
          this.#document,
          "p",
          "Warrior · baseline unit, no technology required.",
          "baseline-unlock",
        ),
        relationshipSummary,
        overviewHeader,
        tree,
      );

      const selectedRule = technologies.find(
        (tech) => tech.id === this.#selectedTech,
      );
      if (selectedRule === undefined) {
        article.append(
          textElement(
            this.#document,
            "p",
            "Select any technology symbol to see its unlock, prerequisite, and research action.",
            "tech-detail-empty",
          ),
        );
      } else {
        const researched = view.viewer.researchedTechs.includes(
          selectedRule.id,
        );
        const command = legal.find(
          (candidate) =>
            candidate.kind === "RESEARCH" && candidate.tech === selectedRule.id,
        );
        const prerequisitesMet = selectedRule.prerequisites.every((required) =>
          view.viewer.researchedTechs.includes(required),
        );
        const cost = publicTechnologyCost(view, selectedRule.id);
        const state = researched
          ? "Researched"
          : command !== undefined
            ? "Available now"
            : !prerequisitesMet
              ? `Locked · research ${selectedRule.prerequisites.map(title).join(", ")} first`
              : view.viewer.stars < cost
                ? `Need ${cost - view.viewer.stars} more stars`
                : "View only";
        const detail = element(this.#document, "section", "tech-detail");
        detail.setAttribute("aria-labelledby", "tech-detail-heading");
        detail.dataset.tech = selectedRule.id.toLowerCase();
        const heading = textElement(
          this.#document,
          "h3",
          title(selectedRule.id),
          "tech-detail-title",
        );
        heading.id = "tech-detail-heading";
        const summary = facts(this.#document, [
          ["Unlock / effect", TECH_DETAILS[selectedRule.id]],
          [
            "Prerequisite",
            selectedRule.prerequisites.length === 0
              ? "None · root technology"
              : selectedRule.prerequisites.map(title).join(", "),
          ],
          ["Current cost", `${cost} stars`],
          ["Status", state],
        ]);
        summary.classList.add("tech-detail-facts");
        detail.append(heading, summary);
        if (command?.kind === "RESEARCH") {
          detail.append(
            actionButton(
              this.#document,
              `Research ${title(selectedRule.id)} · ${cost} stars`,
              () => this.#controller.requestCommand(command),
              "primary-action tech-research-action",
              `research-${selectedRule.id.toLowerCase()}`,
            ),
          );
        }
        detail.append(
          textElement(
            this.#document,
            "p",
            `${view.viewer.stars} stars available · technology costs rise with owned cities.`,
            "tech-cost-note",
          ),
        );
        article.append(detail);
      }
      if (!this.#viewerCanIssueMatchCommands(snapshot))
        article.append(
          textElement(
            this.#document,
            "p",
            "View only during AI presentation or after the match.",
            "view-only-note",
          ),
        );
    }
    article.append(closeButton(this.#document, () => this.#close()));
    return article;
  }

  #techNode(
    snapshot: AppSnapshot,
    techId: TechId,
    legal: readonly Command[],
  ): HTMLButtonElement {
    const view = snapshot.view;
    if (view === null)
      throw new Error("Technology node requires a player view");
    const tech = requireRuleset(view.rulesetId).technologies.find(
      (candidate) => candidate.id === techId,
    );
    if (tech === undefined) throw new Error(`Unknown technology ${techId}`);
    const researched = view.viewer.researchedTechs.includes(tech.id);
    const command = legal.find(
      (candidate) =>
        candidate.kind === "RESEARCH" && candidate.tech === tech.id,
    );
    const prereqMet = tech.prerequisites.every((required) =>
      view.viewer.researchedTechs.includes(required),
    );
    const cost = publicTechnologyCost(view, tech.id);
    const stateKind = researched
      ? "researched"
      : command !== undefined
        ? "available"
        : prereqMet && view.viewer.stars < cost
          ? "unaffordable"
          : "locked";
    const state = researched
      ? "researched"
      : command !== undefined
        ? "available to research"
        : !prereqMet
          ? `locked; requires ${tech.prerequisites.map(title).join(", ")}`
          : view.viewer.stars < cost
            ? `available after gaining ${cost - view.viewer.stars} more stars`
            : "view only";
    const node = element(
      this.#document,
      "button",
      `tech-node ${stateKind}${this.#selectedTech === tech.id ? " selected" : ""}`,
    );
    node.type = "button";
    node.dataset.focusId = `tech-${tech.id.toLowerCase()}`;
    node.dataset.tech = tech.id.toLowerCase();
    node.dataset.state = stateKind;
    node.setAttribute("role", "treeitem");
    node.setAttribute("aria-level", String(tech.tier));
    node.setAttribute("aria-selected", String(this.#selectedTech === tech.id));
    node.setAttribute(
      "aria-label",
      `${title(tech.id)}, tier ${tech.tier}, ${state}, costs ${cost} stars. Select for details.`,
    );
    node.addEventListener("click", () => {
      this.#selectedTech = tech.id;
      this.#pendingFocusId = `tech-${tech.id.toLowerCase()}`;
      this.#render(this.#controller.snapshot());
    });
    node.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (event.key === "Enter") node.click();
    });
    node.addEventListener("keyup", (event) => {
      if (event.key !== " ") return;
      event.preventDefault();
      node.click();
    });
    const iconUrl = ACCEPTED_ART_URLS[`ui-tech-${tech.id.toLowerCase()}`];
    const icon =
      iconUrl === undefined
        ? textElement(
            this.#document,
            "span",
            TECH_FALLBACK_SYMBOLS[tech.id] ?? title(tech.id).charAt(0),
            "tech-node-art tech-node-art-fallback",
          )
        : artImage(this.#document, iconUrl, "tech-node-art");
    icon.setAttribute("aria-hidden", "true");
    const stateMark = textElement(
      this.#document,
      "span",
      stateKind === "researched"
        ? "✓"
        : stateKind === "available"
          ? "!"
          : stateKind === "unaffordable"
            ? "−"
            : "×",
      "tech-state-mark",
    );
    stateMark.setAttribute("aria-hidden", "true");
    const price = textElement(
      this.#document,
      "span",
      `★ ${cost}`,
      "tech-node-cost",
    );
    price.setAttribute("aria-hidden", "true");
    node.append(icon, stateMark, price);
    return node;
  }

  #mineStatus(
    snapshot: AppSnapshot,
    city: Pick<CityState, "id" | "ownerId" | "level"> | null,
    mined: boolean,
    besieged: boolean,
    offered: boolean,
  ): string {
    const view = snapshot.view;
    const rules = view === null ? null : requireRuleset(view.rulesetId);
    if (mined) return "Mine already built";
    if (view === null || rules === null) return "Unavailable";
    if (snapshot.readOnlyFinalMap || view.outcome !== null)
      return "Final map · actions unavailable";
    if (view.pendingChoice !== null)
      return "Choose the pending city reward first";
    if (view.turnOrder[view.activeSeatIndex] !== view.viewer.id)
      return "Available only on your turn";
    const player = view.players.find(
      (candidate) => candidate.id === view.viewer.id,
    );
    if (offered)
      return `Available now · owned territory · Mining researched · ${player?.stars ?? 0} stars available`;
    if (city === null) return "No city controls this territory";
    if (city.ownerId !== view.viewer.id) return "Rival territory";
    if (!view.viewer.researchedTechs.includes("MINING"))
      return "Mining required";
    if (besieged) return "City is besieged";
    return `Need ${Math.max(0, rules.mineCost - (player?.stars ?? 0))} more stars`;
  }

  #fruitStatus(
    snapshot: AppSnapshot,
    city: Pick<CityState, "id" | "ownerId" | "level"> | null,
    besieged: boolean,
    offered: boolean,
  ): string {
    const view = snapshot.view;
    const rules = view === null ? null : requireRuleset(view.rulesetId);
    if (view === null || rules === null) return "Unavailable";
    if (snapshot.readOnlyFinalMap || view.outcome !== null)
      return "Final map · actions unavailable";
    if (view.pendingChoice !== null)
      return "Choose the pending city reward first";
    if (view.turnOrder[view.activeSeatIndex] !== view.viewer.id)
      return "Available only on your turn";
    const player = view.players.find(
      (candidate) => candidate.id === view.viewer.id,
    );
    if (offered)
      return `Available now · owned territory · Organization researched · ${player?.stars ?? 0} stars available`;
    if (city === null) return "No city controls this territory";
    if (city.ownerId !== view.viewer.id) return "Rival territory";
    if (!view.viewer.researchedTechs.includes("ORGANIZATION"))
      return "Organization required";
    if (besieged) return "City is besieged";
    return `Need ${Math.max(0, rules.fruitCost - (player?.stars ?? 0))} more stars`;
  }

  #animalStatus(
    snapshot: AppSnapshot,
    city: Pick<CityState, "id" | "ownerId" | "level"> | null,
    besieged: boolean,
    offered: boolean,
  ): string {
    const view = snapshot.view;
    const rules = view === null ? null : requireRuleset(view.rulesetId);
    if (view === null || rules === null) return "Unavailable";
    if (snapshot.readOnlyFinalMap || view.outcome !== null)
      return "Final map · actions unavailable";
    if (view.pendingChoice !== null)
      return "Choose the pending city reward first";
    if (view.turnOrder[view.activeSeatIndex] !== view.viewer.id)
      return "Available only on your turn";
    const player = view.players.find(
      (candidate) => candidate.id === view.viewer.id,
    );
    if (offered)
      return `Available now · owned territory · Hunting researched · ${player?.stars ?? 0} stars available`;
    if (city === null) return "No city controls this territory";
    if (city.ownerId !== view.viewer.id) return "Rival territory";
    if (!view.viewer.researchedTechs.includes("HUNTING"))
      return "Hunting required";
    if (besieged) return "City is besieged";
    return `Need ${Math.max(0, rules.animalCost - (player?.stars ?? 0))} more stars`;
  }

  #lumberMillStatus(
    snapshot: AppSnapshot,
    city: Pick<CityState, "id" | "ownerId" | "level"> | null,
    besieged: boolean,
    offered: boolean,
  ): string {
    const view = snapshot.view;
    const rules = view === null ? null : requireRuleset(view.rulesetId);
    if (view === null || rules === null) return "Unavailable";
    if (snapshot.readOnlyFinalMap || view.outcome !== null)
      return "Final map · actions unavailable";
    if (view.pendingChoice !== null)
      return "Choose the pending city reward first";
    if (view.turnOrder[view.activeSeatIndex] !== view.viewer.id)
      return "Available only on your turn";
    const player = view.players.find(
      (candidate) => candidate.id === view.viewer.id,
    );
    if (offered)
      return `Available now · owned territory · Forestry researched · ${player?.stars ?? 0} stars available`;
    if (city === null) return "No city controls this territory";
    if (city.ownerId !== view.viewer.id) return "Rival territory";
    if (!view.viewer.researchedTechs.includes("FORESTRY"))
      return "Forestry required";
    if (besieged) return "City is besieged";
    return `Need ${Math.max(0, rules.lumberMillCost - (player?.stars ?? 0))} more stars`;
  }

  #reward(snapshot: AppSnapshot, id: number): HTMLElement {
    const view = snapshot.view;
    const city = view?.cities.find((candidate) => candidate.id === id);
    const article = element(
      this.#document,
      "article",
      "modal-content reward-content",
    );
    article.append(
      textElement(
        this.#document,
        "h2",
        `${city === undefined ? "City" : `City ${city.id}`} reached level ${city?.level ?? ""}`,
      ),
      textElement(
        this.#document,
        "p",
        "A resource action increased this city's population, level, base income, and unit capacity. Choose one city reward to continue. This choice is required.",
      ),
    );
    const level = view?.pendingChoice?.level;
    if (city !== undefined && level !== undefined) {
      const nextThreshold = city.level + 1;
      article.append(
        facts(this.#document, [
          ["Level", `${level}`],
          ["Base income", `${level} stars each Start Turn before bonuses`],
          ["Unit capacity", `${level}`],
          [
            "Population",
            `${city.population} / ${nextThreshold} toward level ${city.level + 1}`,
          ],
        ]),
        textElement(
          this.#document,
          "p",
          "Until you choose, this city cannot train units, harvest Fruit, hunt Animals, build a Lumber Mill or Mine, or End Turn.",
          "reward-lock-note",
        ),
      );
    }
    const rewards =
      level === 2
        ? ([
            ["WORKSHOP", "Workshop", "+1 income each turn"],
            ["SURVEY", "Survey", "Reveal radius 3 now"],
          ] as const)
        : ([
            ["RESOURCES", "Resources", "+5 stars now"],
            ["CITY_WALL", "City Wall", "4× eligible city defense"],
          ] as const);
    for (const [reward, label, effect] of rewards) {
      const button = actionButton(
        this.#document,
        `${label} · ${effect}`,
        () => {
          if (city !== undefined)
            this.#controller.chooseReward(city.id, reward);
        },
        "reward-choice",
        `reward-${reward.toLowerCase()}`,
      );
      const iconUrl =
        ACCEPTED_ART_URLS[
          `ui-reward-${reward.toLowerCase().replaceAll("_", "-")}`
        ];
      if (iconUrl !== undefined) {
        const icon = artImage(this.#document, iconUrl, "reward-choice-art");
        icon.setAttribute("aria-hidden", "true");
        button.prepend(icon);
      }
      article.append(button);
    }
    return article;
  }

  #confirmation(
    snapshot: AppSnapshot,
    action: ConfirmationAction,
  ): HTMLElement {
    const article = element(
      this.#document,
      "article",
      "modal-content confirm-content",
    );
    const [heading, description, confirmLabel, destructive] = confirmationCopy(
      snapshot,
      action,
    );
    article.append(
      textElement(this.#document, "h2", heading),
      textElement(this.#document, "p", description),
    );
    if (action.kind === "END_TURN") {
      const list = element(this.#document, "ul", "warning-list");
      for (const warning of this.#controller.endTurnWarnings())
        list.append(textElement(this.#document, "li", warning));
      article.append(list);
    }
    const actions = element(this.#document, "div", "dialog-actions");
    actions.append(
      actionButton(
        this.#document,
        safeLabel(action),
        () => this.#controller.cancelConfirmation(),
        "secondary-action",
        "cancel-confirm",
      ),
      actionButton(
        this.#document,
        confirmLabel,
        () => this.#controller.confirm(),
        destructive ? "primary-action destructive" : "primary-action",
        "confirm-action",
      ),
    );
    article.append(actions);
    return article;
  }

  #aiError(diagnostic: string): HTMLElement {
    const article = element(this.#document, "article", "modal-content");
    article.append(
      textElement(this.#document, "h2", "AI turn stopped"),
      textElement(this.#document, "p", diagnostic),
      actionButton(
        this.#document,
        "Retry From Autosave",
        () => this.#controller.retryAi(),
        "primary-action",
        "retry-ai",
      ),
      actionButton(
        this.#document,
        "Return to Hub",
        () => this.#controller.exitToHub(),
        "secondary-action",
        "ai-hub",
      ),
    );
    return article;
  }

  #saveRecovery(diagnostic: string): HTMLElement {
    const article = element(this.#document, "article", "modal-content");
    article.append(
      textElement(this.#document, "h2", "Saved match details"),
      textElement(this.#document, "p", diagnostic),
      textElement(
        this.#document,
        "p",
        "Nothing was partially loaded. The original stored value remains untouched until deletion or confirmed replacement.",
      ),
      actionButton(
        this.#document,
        "Copy Diagnostic",
        () => void copyText(diagnostic),
        "secondary-action",
        "copy-save-diagnostic",
      ),
      closeButton(this.#document, () => this.#controller.closeOverlay()),
    );
    return article;
  }

  #legalCommands(view: PlayerView | null): readonly Command[] {
    return view === null
      ? []
      : queryPlayerCommands(view).map(({ command }) => command);
  }

  #humanCanAct(snapshot: AppSnapshot): boolean {
    const view = snapshot.view;
    if (
      view === null ||
      snapshot.readOnlyFinalMap ||
      snapshot.overlay.name !== "NONE" ||
      snapshot.combatPresentation !== null
    )
      return false;
    const active = view.turnOrder[view.activeSeatIndex];
    return active === view.viewer.id && view.outcome === null;
  }

  #viewerCanIssueMatchCommands(snapshot: AppSnapshot): boolean {
    const view = snapshot.view;
    if (
      view === null ||
      snapshot.route !== "MATCH" ||
      snapshot.readOnlyFinalMap ||
      snapshot.combatPresentation !== null
    )
      return false;
    const active = view.turnOrder[view.activeSeatIndex];
    return active === view.viewer.id && view.outcome === null;
  }

  #selectBoardEntity(selection: BoardSelection | null): void {
    this.#selected = selection;
    this.#render(this.#controller.snapshot());
    this.#boardHost.focus();
  }

  #inspectBoardEntity(selection: BoardSelection): void {
    this.#selected = selection;
    this.#render(this.#controller.snapshot());
    this.#boardHost.focus();
  }

  #clearBoardSelection(): void {
    this.#selected = null;
    this.#boardHost.resetActivationCycle();
    this.#render(this.#controller.snapshot());
    this.#boardHost.focus();
  }

  #open(overlay: MatchOverlay, focusId: string): void {
    this.#rememberFocus(focusId);
    this.#controller.openOverlay(overlay);
  }

  #close(): void {
    if (this.#controller.snapshot().overlay.name === "TECH")
      this.#selectedTech = null;
    this.#controller.closeOverlay();
  }

  #rememberFocus(id: string): void {
    this.#focusReturnId = id;
  }

  #restoreOrPlaceFocus(overlay: MatchOverlay): void {
    if (this.#pendingFocusId !== null) {
      this.#root
        .querySelector<HTMLElement>(`[data-focus-id="${this.#pendingFocusId}"]`)
        ?.focus({ preventScroll: true });
      this.#pendingFocusId = null;
    } else if (
      overlay.name === "TECH" &&
      this.#lastOverlayName !== "TECH" &&
      this.#selectedTech !== null
    ) {
      this.#root
        .querySelector<HTMLElement>(
          `[data-focus-id="tech-${this.#selectedTech.toLowerCase()}"]`,
        )
        ?.focus({ preventScroll: true });
    } else if (
      overlay.name !== "NONE" &&
      this.#lastOverlayName !== overlay.name
    ) {
      this.#root.querySelector<HTMLElement>("[data-modal]")?.focus();
    } else if (
      overlay.name === "NONE" &&
      this.#lastOverlayName === "CONFIRM" &&
      this.#selectedTech !== null
    ) {
      // Confirmed research briefly clears its overlay while the exact command
      // dispatches. The controller immediately restores Technology.
    } else if (overlay.name === "NONE" && this.#lastOverlayName !== "NONE") {
      const target =
        this.#focusReturnId === null
          ? null
          : this.#root.querySelector<HTMLElement>(
              `[data-focus-id="${this.#focusReturnId}"]`,
            );
      (
        target ?? this.#root.querySelector<HTMLElement>("[data-focus-id=board]")
      )?.focus();
      this.#focusReturnId = null;
    }
  }

  #trapFocus(event: KeyboardEvent): void {
    const modal = this.#root.querySelector<HTMLElement>("[data-modal]");
    if (modal === null) return;
    const focusable = [
      ...modal.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]',
      ),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (first === undefined || last === undefined) return;
    if (event.shiftKey && this.#document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && this.#document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  #announce(message: string): void {
    const live = this.#root.querySelector<HTMLElement>("#polite-live");
    if (live !== null) live.textContent = message;
  }
}

function element<K extends keyof HTMLElementTagNameMap>(
  documentRoot: Document,
  tag: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const item = documentRoot.createElement(tag);
  if (className !== undefined) item.className = className;
  return item;
}

function textElement<K extends keyof HTMLElementTagNameMap>(
  documentRoot: Document,
  tag: K,
  text: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const item = element(documentRoot, tag, className);
  item.textContent = text;
  return item;
}

function screen(
  documentRoot: Document,
  className: string,
  heading: string,
): HTMLElement {
  const main = element(documentRoot, "main", `screen ${className}`);
  main.append(textElement(documentRoot, "h1", heading));
  return main;
}

function actionButton(
  documentRoot: Document,
  label: string,
  action: () => void,
  className: string,
  focusId: string,
  disabled = false,
): HTMLButtonElement {
  const button = element(documentRoot, "button", className);
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.dataset.focusId = focusId;
  button.addEventListener("click", action);
  return button;
}

function backButton(
  documentRoot: Document,
  action: () => void,
): HTMLButtonElement {
  const button = actionButton(
    documentRoot,
    "Back",
    action,
    "back-button",
    "back",
  );
  button.setAttribute("aria-label", "Go back");
  return button;
}

function closeButton(
  documentRoot: Document,
  action: () => void,
): HTMLButtonElement {
  return actionButton(
    documentRoot,
    "Close",
    action,
    "close-button",
    "close-overlay",
  );
}

function banner(documentRoot: Document, message: string): HTMLElement {
  const item = textElement(documentRoot, "aside", message, "notice-banner");
  item.setAttribute("role", "status");
  return item;
}

function liveRegion(
  documentRoot: Document,
  id: string,
  message: string,
  politeness: "polite" | "assertive",
): HTMLElement {
  const item = textElement(documentRoot, "div", message, "sr-only");
  item.id = id;
  item.setAttribute("aria-live", politeness);
  item.setAttribute("aria-atomic", "true");
  return item;
}

function hudChip(
  documentRoot: Document,
  label: string,
  kind: string,
  iconUrl?: string,
): HTMLElement {
  const item = element(documentRoot, "div", "hud-chip");
  item.dataset.hud = kind;
  if (iconUrl !== undefined) {
    const icon = artImage(documentRoot, iconUrl, "hud-chip-art");
    icon.setAttribute("aria-hidden", "true");
    item.append(
      icon,
      textElement(documentRoot, "span", "★ ", "sr-only"),
      documentRoot.createTextNode(label.replace(/^★\s*/, "")),
    );
  } else {
    item.textContent = label;
  }
  return item;
}

function artImage(
  documentRoot: Document,
  source: string,
  className: string,
  onLoad?: () => void,
): HTMLImageElement {
  const image = element(documentRoot, "img", className);
  image.alt = "";
  image.decoding = "async";
  let settled = false;
  const markLoaded = (): void => {
    if (settled) return;
    settled = true;
    onLoad?.();
  };
  image.addEventListener("load", markLoaded);
  image.addEventListener("error", () => {
    settled = true;
    image.hidden = true;
  });
  image.src = source;
  if (image.complete && image.naturalWidth > 0) markLoaded();
  return image;
}

function codeNativeUnitArt(
  documentRoot: Document,
  type: UnitType,
): HTMLElement {
  const icon = element(
    documentRoot,
    "span",
    `city-command-art city-command-art-fallback city-command-art-${type.toLowerCase()}`,
  );
  if (type !== "CATAPULT") {
    icon.textContent = title(type).charAt(0);
    return icon;
  }
  icon.append(
    element(documentRoot, "span", "catapult-wheel catapult-wheel-left"),
    element(documentRoot, "span", "catapult-wheel catapult-wheel-right"),
    element(documentRoot, "span", "catapult-bed"),
    element(documentRoot, "span", "catapult-arm"),
    element(documentRoot, "span", "catapult-cup"),
  );
  return icon;
}

function option(
  documentRoot: Document,
  value: string,
  label: string,
): HTMLOptionElement {
  const item = documentRoot.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function definition(
  documentRoot: Document,
  term: string,
  value: string,
): DocumentFragment {
  const fragment = documentRoot.createDocumentFragment();
  fragment.append(
    textElement(documentRoot, "dt", term),
    textElement(documentRoot, "dd", value),
  );
  return fragment;
}

function facts(
  documentRoot: Document,
  entries: readonly (readonly [string, string])[],
): HTMLElement {
  const list = element(documentRoot, "dl", "facts-list");
  for (const [term, value] of entries)
    list.append(definition(documentRoot, term, value));
  return list;
}

function techLegend(documentRoot: Document): HTMLElement {
  const legend = element(documentRoot, "ul", "tech-legend");
  legend.setAttribute("aria-label", "Technology states");
  for (const [kind, mark, label] of [
    ["available", "!", "Ready"],
    ["unaffordable", "−", "Need stars"],
    ["locked", "×", "Locked"],
    ["researched", "✓", "Researched"],
  ] as const) {
    const item = element(documentRoot, "li", `tech-legend-${kind}`);
    item.append(
      textElement(documentRoot, "span", mark, "tech-legend-mark"),
      documentRoot.createTextNode(label),
    );
    legend.append(item);
  }
  return legend;
}

function labeledSelect(
  documentRoot: Document,
  labelText: string,
  id: string,
  values: readonly (readonly [string, string])[],
  selected: string,
  onChange: (value: string) => void,
): HTMLElement {
  const row = element(documentRoot, "label", "setting-row");
  row.htmlFor = id;
  row.append(textElement(documentRoot, "span", labelText));
  const select = documentRoot.createElement("select");
  select.id = id;
  for (const [value, label] of values)
    select.append(option(documentRoot, value, label));
  select.value = selected;
  select.addEventListener("change", () => onChange(select.value));
  row.append(select);
  return row;
}

function confirmationCopy(
  snapshot: AppSnapshot,
  action: ConfirmationAction,
): readonly [string, string, string, boolean] {
  switch (action.kind) {
    case "START_MATCH": {
      const seed = snapshot.draft.resolvedSeed ?? 0;
      const size = resolveBoardSize(
        snapshot.draft.aiCount,
        snapshot.draft.boardPreset,
      );
      return [
        snapshot.hasStoredSave ? "Replace current match?" : "Start Conquest?",
        `${snapshot.draft.aiCount} AI · ${size} × ${size} · Normal parity · ${snapshot.draft.aiMode === "COOPERATIVE" ? "Cooperate against you" : "Rival AI"} · seed ${seedLabel(seed)}.${snapshot.hasStoredSave ? " This replaces the current saved match." : ""}`,
        snapshot.hasStoredSave ? "Replace Save & Start" : "Confirm Start",
        snapshot.match?.outcome === null && snapshot.match !== null,
      ];
    }
    case "START_DEMO":
      return [
        snapshot.hasStoredSave ? "Replace current match?" : "Start Demo Match?",
        `Huge 25 × 25 · 2 Normal AI · Coral human · all technologies · two level-3 cities · eight ready units · full exploration · seed decafbad.${snapshot.hasStoredSave ? " This replaces the current saved match." : ""}`,
        snapshot.hasStoredSave
          ? "Replace Save & Start Demo"
          : "Start Demo Match",
        snapshot.match?.outcome === null && snapshot.match !== null,
      ];
    case "END_TURN":
      return [
        "End turn with opportunities remaining?",
        "The engine allows ending now, but these visible action categories remain.",
        "End Anyway",
        false,
      ];
    case "RESEARCH":
      return [
        "Research technology?",
        "Stars are spent immediately. Technology prices increase with owned cities.",
        "Confirm Research",
        false,
      ];
    case "RESTART":
      return [
        "Restart same match?",
        "Recreate the identical setup and seed. Current progress will be replaced.",
        "Restart Match",
        true,
      ];
    case "PLAY_AGAIN":
      return [
        "Play this match again?",
        "Recreate the identical setup and seed from the beginning.",
        "Play Again",
        true,
      ];
    case "DELETE_SAVE":
      return [
        "Delete current saved match?",
        "This removes the current saved match from this browser and returns to the Hub.",
        "Delete Save",
        true,
      ];
    case "DISCARD_SETUP":
      return [
        "Discard setup changes?",
        "Your current setup draft will be reset.",
        "Discard Changes",
        true,
      ];
  }
}

function safeLabel(action: ConfirmationAction): string {
  return action.kind === "END_TURN" ? "Keep Playing" : "Cancel";
}

function title(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function seedLabel(seed: number): string {
  return (seed >>> 0).toString(16).padStart(8, "0");
}

function formatSaveTime(savedAt: string): string {
  const timestamp = Date.parse(savedAt);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString()
    : savedAt;
}

function captureActionLabel(
  view: PlayerView,
  command: Extract<Command, { readonly kind: "CAPTURE" }>,
): string {
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const city =
    unit === undefined
      ? undefined
      : view.cities.find((candidate) => sameCoord(candidate.at, unit.at));
  return city === undefined ? "Capture Village" : "Capture City";
}

function unitSelectionState(
  view: PlayerView,
  unit: PlayerUnitView,
  commandCount: number,
): string {
  const owned = unit.ownerId === view.viewer.id;
  const rule = requireRuleset(view.rulesetId).units[unit.type];
  const owner = owned ? "You" : `Enemy · Player ${unit.ownerId}`;
  const activation = unit.activation.captured
    ? "Captured"
    : unit.activation.recovered
      ? "Recovered"
      : unit.activation.attacked
        ? unit.activation.escapeAvailable
          ? "Attacked · Escape available"
          : "Attacked"
        : unit.activation.moved
          ? rule.abilities.includes("DASH")
            ? "Moved"
            : "Moved · cannot attack (no Dash)"
          : unit.ready
            ? "Ready"
            : "Acted";
  return [
    owner,
    unit.veteran ? "Veteran" : null,
    unit.activation.handled ? "Handled" : "Needs action",
    activation,
    owned && commandCount === 0 ? "No actions available" : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ");
}

function selectionExists(
  view: PlayerView,
  selection: BoardSelection | null,
): boolean {
  if (selection === null) return true;
  if (selection.kind === "UNIT")
    return view.units.some((unit) => unit.id === selection.unitId);
  if (selection.kind === "CITY")
    return view.cities.some((city) => city.id === selection.cityId);
  return view.board.tiles.some((tile) => sameCoord(tile.at, selection.at));
}

function coordinateActivationLabel(
  view: PlayerView,
  at: Coord,
  selected: BoardSelection | null,
  commands: readonly Command[],
): string {
  const tile = view.board.tiles.find(
    (candidate) => candidate.at.x === at.x && candidate.at.y === at.y,
  );
  const unit = view.units.find((candidate) => sameCoord(candidate.at, at));
  const city = view.cities.find((candidate) => sameCoord(candidate.at, at));
  const occupants = [
    unit === undefined
      ? null
      : `${title(unit.type)} unit, Player ${unit.ownerId}, ${unit.hp}/${unit.maxHp} HP, ${unit.activation.handled ? "Handled" : "Needs action"}`,
    city === undefined
      ? null
      : `City ${city.id}, Player ${city.ownerId}, level ${city.level}`,
    tile?.explored === true && tile.site === "VILLAGE" && city === undefined
      ? "Village"
      : null,
  ].filter((value): value is string => value !== null);
  if (tile?.explored !== true) return `${at.x}, ${at.y} · Unexplored`;
  const feature =
    tile.improvement === "MINE"
      ? "Mine"
      : tile.improvement === "LUMBER_MILL"
        ? "Lumber Mill"
        : tile.resource === "FRUIT"
          ? "Fruit"
          : tile.resource === "ORE"
            ? "Ore"
            : tile.resource === "ANIMAL"
              ? "Animal"
              : tile.site === null
                ? "No resource or improvement"
                : title(tile.site);
  const territoryCity =
    tile.territoryCityId === null
      ? null
      : view.cities.find((candidate) => candidate.id === tile.territoryCityId);
  const territory =
    territoryCity === undefined || territoryCity === null
      ? tile.territoryCenter === null
        ? "Unclaimed"
        : "Neutral territory"
      : territoryCity.ownerId === view.viewer.id
        ? `Your City ${territoryCity.id} territory`
        : `Player ${territoryCity.ownerId} City ${territoryCity.id} territory`;
  const positionalAction = positionalCommandLabel(view, at, selected, commands);
  const tileAction = commands.find(
    (command) =>
      (command.kind === "HARVEST_FRUIT" ||
        command.kind === "HUNT_ANIMAL" ||
        command.kind === "BUILD_LUMBER_MILL" ||
        command.kind === "BUILD_MINE") &&
      sameCoord(command.at, at),
  );
  const tileActionLabel =
    tileAction?.kind === "HARVEST_FRUIT"
      ? "Harvest Fruit available"
      : tileAction?.kind === "HUNT_ANIMAL"
        ? "Hunt Animal available"
        : tileAction?.kind === "BUILD_LUMBER_MILL"
          ? "Build Lumber Mill available"
          : tileAction?.kind === "BUILD_MINE"
            ? "Build Mine available"
            : null;
  return [
    `${at.x}, ${at.y}`,
    title(tile.terrain),
    feature,
    territory,
    ...occupants,
    positionalAction,
    tileActionLabel,
  ]
    .filter((value): value is string => value !== null)
    .join(" · ");
}

function positionalCommandLabel(
  view: PlayerView,
  at: Coord,
  selected: BoardSelection | null,
  commands: readonly Command[],
): string | null {
  if (selected?.kind !== "UNIT") return null;
  const attack = commands.find((command) => {
    if (command.kind !== "ATTACK" || command.unitId !== selected.unitId)
      return false;
    const target = view.units.find((unit) => unit.id === command.targetId);
    return target !== undefined && sameCoord(target.at, at);
  });
  if (attack?.kind === "ATTACK") {
    const preview = queryPlayerCombatPreview(
      view,
      attack.unitId,
      attack.targetId,
    );
    return preview === null
      ? null
      : `Attack once: ${accessibleCombatPreview(preview)}`;
  }
  const movement = commands.find(
    (
      command,
    ): command is Extract<Command, { readonly kind: "MOVE" | "ESCAPE_MOVE" }> =>
      (command.kind === "MOVE" || command.kind === "ESCAPE_MOVE") &&
      command.unitId === selected.unitId &&
      sameCoord(command.path.at(-1) ?? { x: -1, y: -1 }, at),
  );
  if (movement === undefined) return null;
  return `${movement.kind === "MOVE" ? "Move" : "Escape move"} once by ${movement.path.map((step) => `${step.x},${step.y}`).join(" then ")}`;
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard !== undefined)
    await navigator.clipboard.writeText(value);
}
