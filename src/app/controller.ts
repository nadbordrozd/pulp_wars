import { chooseNormalCommand } from "../ai/index";
import {
  RULESET_ID,
  DEMO_MATCH_SETUP,
  appendReplayCommand,
  applyCommand,
  createReplay,
  createGame,
  playerIncome,
  queryPlayerCommands,
  seedFromText,
  totalIncome,
  viewFor,
  arePlayersHostile,
  type CityId,
  type Command,
  type DomainEvent,
  type FactionId,
  type GameState,
  type MatchSetup,
  type PlayerId,
  type ReplayFile,
  type RewardId,
  type TechId,
  type UnitId,
} from "../engine/index";
import {
  BrowserPersistence,
  type PersistenceScheduler,
  type SaveEnvelopeV5,
  type StorageAdapter,
} from "../persistence/index";
import type {
  AppRoute,
  AppSnapshot,
  BoardPreset,
  CombatPresentation,
  CandyPresentation,
  ConfirmationAction,
  MatchOverlay,
  MatchTallies,
  PlayerMatchTallies,
  SaveRecovery,
  SetupDraft,
  UiSettings,
} from "./types";
import {
  EMPTY_AI_TURN_BUDGET,
  beginAiTurnBudget,
  decideAiTurnBudget,
  recordAcceptedAiCommand,
  type AiTurnBudgetState,
} from "./ai-turn-budget";

export interface AppControllerOptions {
  readonly splashDurationMs?: number;
  readonly aiStepDelayMs?: number;
  readonly randomSeed?: () => number;
  readonly initialMatch?: GameState;
  readonly initialRoute?: AppRoute;
  readonly prefersReducedMotion?: boolean;
  readonly storage?: StorageAdapter | null;
  readonly persistenceNow?: () => string;
  readonly persistenceScheduler?: PersistenceScheduler;
  readonly chooseAiCommand?: typeof chooseNormalCommand;
  readonly initialReplay?: ReplayFile;
  /** Test/review override; production uses the documented speed timings. */
  readonly combatPresentationDurationMs?: number;
}

export const COMBAT_PRESENTATION_TIMING = {
  contactNormalMs: 180,
  impactNormalMs: 260,
  contactFastMs: 80,
  impactFastMs: 120,
  reducedImpactMs: 140,
  archerFlightMs: 280,
  archerImpactMs: 100,
} as const;

type Subscriber = (snapshot: AppSnapshot) => void;

const DEFAULT_DRAFT: SetupDraft = {
  aiCount: 1,
  aiMode: "RIVAL",
  boardPreset: "AUTO",
  seedText: "",
  resolvedSeed: null,
  humanColor: "CORAL",
  factions: Object.freeze(["ORIGINAL", "ORIGINAL"]),
};

export class AppController {
  readonly #subscribers = new Set<Subscriber>();
  readonly #randomSeed: () => number;
  readonly #aiStepDelayMs: number;
  readonly #chooseAiCommand: typeof chooseNormalCommand;
  readonly #combatPresentationDurationMs: number | null;
  readonly #persistence: BrowserPersistence | null;
  #route: AppRoute;
  #overlay: MatchOverlay = { name: "NONE" };
  #draft: SetupDraft = DEFAULT_DRAFT;
  #settings: UiSettings;
  #match: GameState | null;
  #matchInstanceId = 0;
  #replay: ReplayFile | null = null;
  #readOnlyFinalMap = false;
  #fastForwarding = false;
  #combatPresentation: CombatPresentation | null = null;
  #candyPresentation: CandyPresentation | null = null;
  #savedAt: string | null = null;
  #saveRecovery: SaveRecovery | null = null;
  #saveWarning: string | null = null;
  #notice: string | null = null;
  #announcement = "";
  #assertiveAnnouncement = "";
  #tallies: MatchTallies = {
    citiesCaptured: 0,
    unitsDefeated: 0,
    unitsLost: 0,
  };
  #playerTallies: readonly PlayerMatchTallies[] = [];
  #timer: ReturnType<typeof setTimeout> | null = null;
  #combatTimer: ReturnType<typeof setTimeout> | null = null;
  #combatGeneration = 0;
  #combatQueueToken = 0;
  #combatPhaseStartedAt = 0;
  #aiGeneration = 0;
  #aiTurnBudget: AiTurnBudgetState = EMPTY_AI_TURN_BUDGET;
  #destroyed = false;

  constructor(options: AppControllerOptions = {}) {
    this.#route = options.initialRoute ?? "SPLASH";
    this.#match = options.initialMatch ?? null;
    this.#randomSeed = options.randomSeed ?? browserRandomUint32;
    this.#aiStepDelayMs = options.aiStepDelayMs ?? 180;
    this.#chooseAiCommand = options.chooseAiCommand ?? chooseNormalCommand;
    this.#combatPresentationDurationMs =
      options.combatPresentationDurationMs === undefined
        ? null
        : Math.max(1, Math.round(options.combatPresentationDurationMs));
    this.#persistence =
      options.storage === undefined || options.storage === null
        ? null
        : new BrowserPersistence(options.storage, {
            ...(options.persistenceNow === undefined
              ? {}
              : { now: options.persistenceNow }),
            ...(options.persistenceScheduler === undefined
              ? {}
              : { schedule: options.persistenceScheduler }),
            onAsyncFailure: (diagnostic) => {
              this.#saveWarning = diagnostic;
              this.#emit();
            },
          });
    this.#settings = {
      uiScale: 1,
      motion: options.prefersReducedMotion === true ? "REDUCED" : "FULL",
      animationSpeed: "NORMAL",
      highContrast: false,
    };
    const loadedSettings = this.#persistence?.loadSettings();
    if (loadedSettings?.kind === "VALID") {
      this.#settings = loadedSettings.settings;
    } else if (loadedSettings !== undefined && loadedSettings.kind !== "NONE") {
      this.#saveWarning = loadedSettings.diagnostic;
    }
    if (this.#match === null) {
      const loaded = this.#persistence?.loadSave();
      if (loaded?.kind === "VALID") {
        this.#match = loaded.save.state;
        this.#replay = replayFromSave(loaded.save);
        this.#tallies = loaded.save.presentation.tallies;
        this.#playerTallies = loaded.save.presentation.playerTallies;
        this.#savedAt = loaded.save.savedAt;
      } else if (loaded !== undefined && loaded.kind !== "NONE") {
        this.#saveRecovery = {
          kind: loaded.kind,
          diagnostic: loaded.diagnostic,
        };
        this.#notice =
          "A saved match could not be loaded. It remains untouched until you choose what to do.";
      }
    } else {
      this.#replay = options.initialReplay ?? createReplay(this.#match.setup);
    }
    if (this.#match !== null) {
      this.#matchInstanceId = 1;
      if (this.#playerTallies.length === 0)
        this.#resetPlayerTallies(this.#match);
      if (this.#route === "MATCH") this.#syncRequiredOverlay();
    }
    if (this.#route === "SPLASH") {
      const duration =
        this.#settings.motion === "REDUCED"
          ? 0
          : (options.splashDurationMs ?? 350);
      this.#timer = setTimeout(() => {
        this.#timer = null;
        this.#route = "HUB";
        this.#announcement = "Pulp Wars ready.";
        this.#emit();
      }, duration);
    } else if (this.#route === "MATCH") {
      this.#scheduleAiIfNeeded();
    }
  }

  subscribe(subscriber: Subscriber): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.snapshot());
    return () => this.#subscribers.delete(subscriber);
  }

  snapshot(): AppSnapshot {
    return {
      route: this.#route,
      matchInstanceId: this.#matchInstanceId,
      overlay: this.#overlay,
      draft: this.#draft,
      settings: this.#settings,
      match: this.#match,
      view: this.#humanView(),
      readOnlyFinalMap: this.#readOnlyFinalMap,
      fastForwarding: this.#fastForwarding,
      combatPresentation: this.#combatPresentation,
      candyPresentation: this.#candyPresentation,
      hasStoredSave: this.#match !== null || this.#saveRecovery !== null,
      savedAt: this.#savedAt,
      saveRecovery: this.#saveRecovery,
      saveWarning: this.#saveWarning,
      notice: this.#notice,
      announcement: this.#announcement,
      assertiveAnnouncement: this.#assertiveAnnouncement,
      tallies: this.#tallies,
      playerTallies: this.#playerTallies,
      result: this.#match?.outcome ?? null,
    };
  }

  navigate(route: "HUB" | "MODE" | "SETUP" | "FACTION"): void {
    this.#cancelCombatPresentation();
    this.#route = route;
    this.#overlay = { name: "NONE" };
    this.#notice = null;
    this.#emit();
  }

  recoverUnsupportedRoute(): void {
    this.#route = "HUB";
    this.#overlay = { name: "NONE" };
    this.#notice =
      "That page is not part of this POC, so you were returned to the Hub.";
    this.#emit();
  }

  requestBack(): void {
    if (this.#overlay.name !== "NONE") {
      if (
        this.#overlay.name !== "REWARD" &&
        this.#overlay.name !== "CANDIFY_CITY"
      )
        this.closeOverlay();
      return;
    }
    if (this.#route === "MATCH") {
      this.openOverlay({ name: "SETTINGS", from: "MATCH" });
    } else if (this.#route === "FACTION") {
      this.navigate("SETUP");
    } else if (this.#route === "SETUP") {
      this.openConfirmation({ kind: "DISCARD_SETUP", destination: "MODE" });
    } else if (this.#route === "MODE") {
      this.navigate("HUB");
    } else {
      this.navigate("HUB");
    }
  }

  updateDraft(patch: Partial<SetupDraft>): void {
    const seedChanged = patch.seedText !== undefined;
    this.#draft = {
      ...this.#draft,
      ...patch,
      resolvedSeed: seedChanged
        ? null
        : (patch.resolvedSeed ?? this.#draft.resolvedSeed),
    };
    if (patch.aiCount !== undefined) {
      const seatCount = patch.aiCount + 1;
      this.#draft = {
        ...this.#draft,
        factions: Array.from(
          { length: seatCount },
          (_, seat) => this.#draft.factions[seat] ?? "ORIGINAL",
        ),
      };
    }
    const minimum = autoBoardSize(this.#draft.aiCount);
    if (
      this.#draft.boardPreset !== "AUTO" &&
      this.#draft.boardPreset < minimum
    ) {
      this.#draft = { ...this.#draft, boardPreset: "AUTO" };
    }
    this.#emit();
  }

  updateFaction(seat: number, faction: FactionId): void {
    if (
      !Number.isSafeInteger(seat) ||
      seat < 0 ||
      seat > this.#draft.aiCount ||
      (faction !== "ORIGINAL" && faction !== "CANDY")
    )
      return;
    this.#draft = {
      ...this.#draft,
      factions: this.#draft.factions.map((current, index) =>
        index === seat ? faction : current,
      ),
    };
    this.#announcement = `${seat === 0 ? "You" : `AI ${seat}`} selected ${faction === "ORIGINAL" ? "Original" : "Candy"}.`;
    this.#emit();
  }

  randomizeSeed(): void {
    const seed = this.#randomSeed() >>> 0;
    this.#draft = {
      ...this.#draft,
      seedText: seed.toString(16).padStart(8, "0"),
      resolvedSeed: seed,
    };
    this.#announcement = `Seed randomized to ${this.#draft.seedText}.`;
    this.#emit();
  }

  resolveDraftSeed(): number {
    if (this.#draft.resolvedSeed !== null) return this.#draft.resolvedSeed;
    if (this.#draft.seedText.length === 0) {
      this.randomizeSeed();
      return this.#draft.resolvedSeed ?? 0;
    }
    const seed = seedFromText(this.#draft.seedText);
    this.#draft = { ...this.#draft, resolvedSeed: seed };
    this.#emit();
    return seed;
  }

  requestStartMatch(): void {
    this.resolveDraftSeed();
    this.openConfirmation({ kind: "START_MATCH" });
  }

  requestDemoMatch(): void {
    this.openConfirmation({ kind: "START_DEMO" });
  }

  openOverlay(overlay: MatchOverlay): void {
    if (overlay.name === "SETTINGS") this.#pauseCombatPresentation();
    else this.#cancelCombatPresentation();
    this.#overlay = overlay;
    this.#cancelAiTimer();
    this.#emit();
  }

  closeOverlay(): void {
    if (
      this.#overlay.name === "REWARD" ||
      this.#overlay.name === "CANDIFY_CITY"
    )
      return;
    const resumeCombat = this.#overlay.name === "SETTINGS";
    this.#overlay = { name: "NONE" };
    if (resumeCombat) this.#resumeCombatPresentation();
    this.#emit();
    this.#scheduleAiIfNeeded();
  }

  openConfirmation(action: ConfirmationAction): void {
    this.openOverlay({ name: "CONFIRM", action });
  }

  cancelConfirmation(): void {
    if (
      this.#overlay.name === "CONFIRM" &&
      this.#overlay.action.kind === "RESEARCH"
    ) {
      this.#overlay = { name: "TECH" };
      this.#emit();
      return;
    }
    this.closeOverlay();
  }

  confirm(): void {
    if (this.#overlay.name !== "CONFIRM") return;
    const action = this.#overlay.action;
    switch (action.kind) {
      case "START_MATCH":
        this.#createResolvedMatch();
        break;
      case "START_DEMO":
        this.#createMatch(DEMO_MATCH_SETUP);
        break;
      case "RESEARCH":
        this.#overlay = { name: "NONE" };
        if (this.dispatch(action.command) && this.#match?.outcome === null) {
          this.#overlay = { name: "TECH" };
          this.#emit();
        }
        break;
      case "RESTART":
      case "PLAY_AGAIN":
        this.#restartMatch();
        break;
      case "DELETE_SAVE":
        this.#cancelAiTimer();
        {
          const result = this.#persistence?.deleteSave();
          if (result?.ok === false) {
            this.#saveWarning = result.diagnostic;
            this.#overlay = { name: "NONE" };
            this.#notice = "The saved match could not be deleted.";
            this.#emit();
            return;
          }
        }
        this.#match = null;
        this.#matchInstanceId = 0;
        this.#replay = null;
        this.#savedAt = null;
        this.#saveRecovery = null;
        this.#saveWarning = null;
        this.#route = "HUB";
        this.#overlay = { name: "NONE" };
        this.#notice = "Saved match deleted.";
        this.#emit();
        break;
      case "DISCARD_SETUP":
        this.#draft = DEFAULT_DRAFT;
        this.navigate(action.destination);
        break;
    }
  }

  requestCommand(command: Command): void {
    if (this.#combatPresentation !== null || this.#candyPresentation !== null)
      return;
    if (command.kind === "RESEARCH") {
      this.openConfirmation({ kind: "RESEARCH", command });
      return;
    }
    this.dispatch(command);
  }

  dispatch(command: Command): boolean {
    const match = this.#match;
    const humanView = this.#humanView();
    if (
      match === null ||
      humanView === null ||
      this.#route !== "MATCH" ||
      this.#readOnlyFinalMap ||
      this.#overlay.name !== "NONE" ||
      this.#combatPresentation !== null ||
      this.#candyPresentation !== null
    ) {
      return false;
    }
    const offered = queryPlayerCommands(humanView).some((summary) =>
      sameCommand(summary.command, command),
    );
    if (!offered) {
      this.#assertiveAnnouncement = "That action is no longer available.";
      this.#emit();
      return false;
    }
    return this.#apply(command);
  }

  chooseReward(cityId: CityId, reward: RewardId): void {
    const command = this.#findHumanCommand(
      (candidate) =>
        candidate.kind === "CHOOSE_CITY_REWARD" &&
        candidate.cityId === cityId &&
        candidate.reward === reward,
    );
    if (command !== null) {
      this.#overlay = { name: "NONE" };
      this.dispatch(command);
    }
  }

  chooseCandifyCity(unitId: UnitId, cityId: CityId): void {
    const command = this.#findHumanCommand(
      (candidate) =>
        candidate.kind === "CHOOSE_CANDIFY_CITY" &&
        candidate.unitId === unitId &&
        candidate.cityId === cityId,
    );
    if (command !== null) {
      this.#overlay = { name: "NONE" };
      this.dispatch(command);
    }
  }

  requestResearch(tech: TechId): void {
    const command = this.#findHumanCommand(
      (candidate) => candidate.kind === "RESEARCH" && candidate.tech === tech,
    );
    if (command !== null) this.requestCommand(command);
  }

  requestTrain(
    cityId: CityId,
    unit: "WARRIOR" | "ARCHER" | "DEFENDER" | "RIDER" | "CATAPULT",
  ): void {
    const command = this.#findHumanCommand(
      (candidate) =>
        candidate.kind === "TRAIN" &&
        candidate.cityId === cityId &&
        candidate.unit === unit,
    );
    if (command !== null) this.requestCommand(command);
  }

  requestMine(x: number, y: number): void {
    const command = this.#findHumanCommand(
      (candidate) =>
        candidate.kind === "BUILD_MINE" &&
        candidate.at.x === x &&
        candidate.at.y === y,
    );
    if (command !== null) this.requestCommand(command);
  }

  requestHarvestFruit(x: number, y: number): void {
    const command = this.#findHumanCommand(
      (candidate) =>
        candidate.kind === "HARVEST_FRUIT" &&
        candidate.at.x === x &&
        candidate.at.y === y,
    );
    if (command !== null) this.requestCommand(command);
  }

  fastForwardAi(): void {
    if (!this.#isAiTurn() || this.#overlay.name !== "NONE") return;
    this.#fastForwarding = true;
    this.#cancelAiTimer();
    this.#cancelCombatPresentation();
    let remaining = 512;
    while (this.#isAiTurn() && this.#match?.outcome === null && remaining > 0) {
      if (!this.#runAiCommand()) break;
      remaining -= 1;
    }
    this.#fastForwarding = false;
    if (remaining === 0 && this.#isAiTurn()) {
      this.#overlay = {
        name: "AI_ERROR",
        diagnostic: "AI presentation exceeded its safe command budget.",
      };
    }
    this.#emit();
    this.#scheduleAiIfNeeded();
  }

  retryAi(): void {
    if (this.#overlay.name !== "AI_ERROR") return;
    const loaded = this.#persistence?.loadSave();
    if (loaded?.kind === "VALID" && loaded.save.state.outcome === null) {
      this.#installSave(loaded.save);
      this.#route = "MATCH";
      this.#overlay = { name: "NONE" };
      this.#assertiveAnnouncement = "Restored the last saved command boundary.";
      this.#emit();
      this.#scheduleAiIfNeeded();
      return;
    }
    this.#saveWarning =
      loaded === undefined || loaded.kind === "NONE"
        ? "No valid autosave boundary is available for retry."
        : loaded.kind === "VALID"
          ? "The saved match has already ended."
          : loaded.diagnostic;
    this.#emit();
  }

  updateSettings(patch: Partial<UiSettings>): void {
    this.#settings = { ...this.#settings, ...patch };
    const result = this.#persistence?.writeSettings(this.#settings);
    this.#saveWarning = result?.ok === false ? result.diagnostic : null;
    this.#emit();
  }

  exitToHub(): void {
    this.#cancelAiTimer();
    this.#cancelCombatPresentation();
    this.flushPersistence();
    this.#overlay = { name: "NONE" };
    this.#route = "HUB";
    this.#notice = "Match saved in this browser.";
    this.#emit();
  }

  resumeMatch(): void {
    if (this.#match === null) return;
    this.#cancelCombatPresentation();
    this.#route = this.#match.outcome === null ? "MATCH" : "RESULT";
    this.#readOnlyFinalMap = false;
    this.#overlay = { name: "NONE" };
    if (this.#route === "MATCH") this.#syncRequiredOverlay();
    this.#emit();
    this.#scheduleAiIfNeeded();
  }

  inspectSaveRecovery(): void {
    if (this.#saveRecovery === null) return;
    this.openOverlay({
      name: "SAVE_RECOVERY",
      diagnostic: this.#saveRecovery.diagnostic,
    });
  }

  flushPersistence(): void {
    const result = this.#persistence?.flushSave();
    if (result?.ok === false) {
      this.#saveWarning = result.diagnostic;
      this.#emit();
    }
  }

  viewFinalMap(): void {
    if (this.#match?.outcome === null || this.#match === null) return;
    this.#cancelCombatPresentation();
    this.#route = "MATCH";
    this.#readOnlyFinalMap = true;
    this.#overlay = { name: "NONE" };
    this.#emit();
  }

  showResults(): void {
    if (this.#match?.outcome === null || this.#match === null) return;
    this.#cancelCombatPresentation();
    this.#route = "RESULT";
    this.#readOnlyFinalMap = false;
    this.#emit();
  }

  newConquestFromResult(): void {
    if (this.#match !== null) {
      this.#draft = {
        aiCount: this.#match.setup.aiCount,
        aiMode: this.#match.setup.aiMode,
        boardPreset: this.#match.setup.width,
        seedText: "",
        resolvedSeed: null,
        humanColor: this.#match.setup.humanColor,
        factions: [...this.#match.setup.factions],
      };
    }
    this.navigate("SETUP");
  }

  destroy(): void {
    this.flushPersistence();
    this.#destroyed = true;
    this.#cancelAiTimer();
    this.#cancelCombatPresentation();
    this.#persistence?.destroy();
    this.#subscribers.clear();
  }

  #createResolvedMatch(): void {
    const seed = this.resolveDraftSeed();
    const size = resolveBoardSize(this.#draft.aiCount, this.#draft.boardPreset);
    const setup: MatchSetup = {
      rulesetId: RULESET_ID,
      seed,
      width: size,
      height: size,
      aiCount: this.#draft.aiCount,
      aiDifficulty: "NORMAL",
      aiMode: this.#draft.aiMode,
      humanColor: this.#draft.humanColor,
      factions: [...this.#draft.factions],
    };
    this.#createMatch(setup);
  }

  #createMatch(setup: MatchSetup): void {
    this.#cancelCombatPresentation();
    const created = createGame(setup);
    if (!created.ok) {
      this.#route = "ERROR";
      this.#overlay = { name: "NONE" };
      this.#assertiveAnnouncement = `Match generation failed: ${created.error.code}.`;
      this.#emit();
      return;
    }
    this.#match = created.state;
    this.#aiTurnBudget = EMPTY_AI_TURN_BUDGET;
    this.#matchInstanceId += 1;
    this.#replay = createReplay(created.state.setup);
    this.#saveRecovery = null;
    this.#tallies = { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 };
    this.#resetPlayerTallies(created.state);
    this.#route = "MATCH";
    this.#overlay = { name: "NONE" };
    this.#readOnlyFinalMap = false;
    this.#notice = null;
    this.#consumeEvents(created.events);
    this.#saveCurrent(true);
    this.#emit();
    this.#scheduleAiIfNeeded();
  }

  #restartMatch(): void {
    this.#cancelCombatPresentation();
    const match = this.#match;
    if (match === null) return;
    const created = createGame(match.setup);
    if (!created.ok) {
      this.#route = "ERROR";
      this.#overlay = { name: "NONE" };
      this.#emit();
      return;
    }
    this.#match = created.state;
    this.#aiTurnBudget = EMPTY_AI_TURN_BUDGET;
    this.#matchInstanceId += 1;
    this.#replay = createReplay(created.state.setup);
    this.#saveRecovery = null;
    this.#tallies = { citiesCaptured: 0, unitsDefeated: 0, unitsLost: 0 };
    this.#resetPlayerTallies(created.state);
    this.#route = "MATCH";
    this.#overlay = { name: "NONE" };
    this.#readOnlyFinalMap = false;
    this.#consumeEvents(created.events);
    this.#saveCurrent(true);
    this.#emit();
    this.#scheduleAiIfNeeded();
  }

  #findHumanCommand(predicate: (command: Command) => boolean): Command | null {
    const view = this.#humanView();
    if (view === null) return null;
    return (
      queryPlayerCommands(view)
        .map(({ command }) => command)
        .find(predicate) ?? null
    );
  }

  #apply(command: Command): boolean {
    const match = this.#match;
    if (match === null) return false;
    const result = applyCommand(match, command);
    if (!result.ok) {
      this.#assertiveAnnouncement = `Action rejected: ${result.error.code}.`;
      this.#emit();
      return false;
    }
    const previousState = match;
    this.#match = result.state;
    try {
      this.#replay = appendReplayCommand(
        this.#replay ?? createReplay(result.state.setup),
        command,
        result.state,
      );
    } catch (error) {
      this.#route = "ERROR";
      this.#assertiveAnnouncement =
        error instanceof Error ? error.message : "Replay log update failed.";
      this.#emit();
      return false;
    }
    this.#consumeEvents(result.events, previousState);
    if (command.kind === "ATTACK" && !this.#fastForwarding) {
      this.#beginCombatPresentation(result.events, previousState);
    } else if (!this.#fastForwarding) {
      this.#beginCandyPresentation(command, result.events, previousState);
    }
    this.#syncRequiredOverlay();
    this.#saveCurrent(
      command.kind === "END_TURN" || result.state.outcome !== null,
    );
    if (result.state.outcome !== null) {
      this.#cancelAiTimer();
      if (this.#combatPresentation === null) {
        this.#route = "RESULT";
        this.#overlay = { name: "NONE" };
      }
    }
    this.#emit();
    this.#scheduleAiIfNeeded();
    return true;
  }

  #runAiCommand(): boolean {
    const match = this.#match;
    if (match === null || !this.#isAiTurn()) return false;
    const activeId = match.turnOrder[match.activeSeatIndex];
    if (activeId === undefined) return false;
    try {
      this.#aiTurnBudget = beginAiTurnBudget(this.#aiTurnBudget, activeId);
      const view = viewFor(match, activeId);
      const budgetDecision = decideAiTurnBudget(
        this.#aiTurnBudget,
        view.pendingChoice !== null,
      );
      if (budgetDecision === "EXCEEDED") {
        throw new Error("AI exceeded its 128-command turn budget");
      }
      const command =
        budgetDecision === "END_TURN"
          ? ({ kind: "END_TURN" } as const)
          : this.#chooseAiCommand(view).command;
      if (command === null) throw new Error("AI produced no command");
      const applied = this.#apply(command);
      if (applied) {
        this.#aiTurnBudget = recordAcceptedAiCommand(
          this.#aiTurnBudget,
          command.kind === "END_TURN",
        );
      }
      return applied;
    } catch (error) {
      this.#cancelAiTimer();
      this.flushPersistence();
      this.#overlay = {
        name: "AI_ERROR",
        diagnostic: error instanceof Error ? error.message : "Unknown AI error",
      };
      this.#assertiveAnnouncement = "AI turn stopped after an error.";
      this.#emit();
      return false;
    }
  }

  #scheduleAiIfNeeded(): void {
    if (
      this.#destroyed ||
      this.#timer !== null ||
      this.#fastForwarding ||
      this.#overlay.name !== "NONE" ||
      this.#combatPresentation !== null ||
      this.#candyPresentation !== null ||
      !this.#isAiTurn() ||
      this.#match?.outcome !== null
    )
      return;
    const delay =
      this.#settings.animationSpeed === "FAST" ? 20 : this.#aiStepDelayMs;
    const generation = this.#aiGeneration;
    this.#timer = setTimeout(() => {
      this.#timer = null;
      if (generation !== this.#aiGeneration || this.#destroyed) return;
      this.#runAiCommand();
    }, delay);
  }

  #cancelAiTimer(): void {
    this.#aiGeneration += 1;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
  }

  #syncRequiredOverlay(): void {
    const view = this.#humanView();
    const pending = view?.pendingChoice;
    if (pending?.kind === "CITY_REWARD") {
      this.#overlay = { name: "REWARD", cityId: pending.cityId };
    } else if (pending?.kind === "CANDIFY_CITY") {
      this.#overlay = {
        name: "CANDIFY_CITY",
        unitId: pending.unitId,
        candidateCityIds: pending.candidateCityIds,
      };
    } else if (
      this.#overlay.name === "REWARD" ||
      this.#overlay.name === "CANDIFY_CITY"
    ) {
      this.#overlay = { name: "NONE" };
    }
  }

  #saveCurrent(immediate: boolean): void {
    const match = this.#match;
    const replay = this.#replay;
    if (match === null || replay === null || this.#persistence === null) return;
    try {
      this.#savedAt = this.#persistence.queueSave({
        state: match,
        replay,
        tallies: this.#tallies,
        playerTallies: this.#playerTallies,
      });
      this.#saveWarning = null;
      if (immediate) {
        const result = this.#persistence.flushSave();
        if (!result.ok) this.#saveWarning = result.diagnostic;
      }
    } catch (error) {
      this.#saveWarning =
        error instanceof Error ? error.message : "Autosave preparation failed.";
    }
  }

  #installSave(save: SaveEnvelopeV5): void {
    this.#cancelAiTimer();
    this.#cancelCombatPresentation();
    this.#match = save.state;
    this.#aiTurnBudget = EMPTY_AI_TURN_BUDGET;
    this.#replay = replayFromSave(save);
    this.#tallies = save.presentation.tallies;
    this.#playerTallies = save.presentation.playerTallies;
    this.#savedAt = save.savedAt;
    this.#saveRecovery = null;
    this.#readOnlyFinalMap = false;
    this.#syncRequiredOverlay();
  }

  #consumeEvents(
    events: readonly DomainEvent[],
    previousState: GameState | null = null,
  ): void {
    const humanId = this.#humanId();
    const playerTallies = accumulatePlayerTallies(
      previousState,
      events,
      this.#playerTallies,
    );
    for (const event of events) {
      switch (event.kind) {
        case "CITY_CAPTURED":
          this.#assertiveAnnouncement = `City ${event.cityId} captured by Player ${event.to}.`;
          break;
        case "UNIT_DIED": {
          this.#assertiveAnnouncement = `Unit ${event.unitId} was defeated.`;
          break;
        }
        case "PLAYER_ELIMINATED":
          this.#assertiveAnnouncement = `Player ${event.playerId} eliminated.`;
          break;
        case "MATCH_ENDED":
          this.#assertiveAnnouncement =
            event.outcome.kind === "VICTORY" ? "Victory." : "Defeat.";
          break;
        case "TURN_STARTED":
          this.#announcement =
            event.playerId === humanId
              ? `Round ${this.#match?.round ?? 1}. Your turn.`
              : `Player ${event.playerId} is thinking.`;
          break;
        case "COMBAT_RESOLVED":
          this.#announcement = `Unit ${event.preview.attackerId} dealt ${event.preview.damageToDefender} damage to ${event.preview.target.kind === "UNIT" ? `Unit ${event.preview.target.unitId}` : `Chocolate Wall ${event.preview.target.wallId}`}${event.preview.damageToAttacker > 0 ? ` and took ${event.preview.damageToAttacker} retaliation damage` : ""}.`;
          break;
        case "MINE_BUILT":
          this.#announcement = `Mine built at ${event.at.x}, ${event.at.y}.`;
          break;
        case "FRUIT_HARVESTED":
          this.#announcement = `Fruit harvested at ${event.at.x}, ${event.at.y}. City ${event.cityId} gained 1 population.`;
          break;
        case "TECH_RESEARCHED":
          this.#announcement = `${titleCase(event.tech)} researched.`;
          break;
        case "UNIT_WAITED":
          this.#announcement = `Unit ${event.unitId} marked handled.`;
          break;
        case "CITY_REWARD_CHOSEN":
          this.#announcement = `${titleCase(event.reward)} chosen for City ${event.cityId}.`;
          break;
        case "TILE_CANDIFIED":
          this.#announcement = `Tile ${event.at.x}, ${event.at.y} joined City ${event.cityId}.`;
          break;
        default:
          break;
      }
    }
    this.#playerTallies = playerTallies;
    this.#tallies = resultTalliesForHuman(playerTallies, humanId);
  }

  #resetPlayerTallies(state: GameState): void {
    this.#playerTallies = state.players.map((player) => ({
      playerId: player.id,
      kills: state.units
        .filter((unit) => unit.ownerId === player.id)
        .reduce((total, unit) => total + unit.kills, 0),
      losses: 0,
      citiesCaptured: 0,
    }));
    const humanId = state.players.find(
      (player) => player.controller === "HUMAN",
    )?.id;
    this.#tallies = resultTalliesForHuman(this.#playerTallies, humanId ?? null);
  }

  #humanId(): PlayerId | null {
    return (
      this.#match?.players.find((player) => player.controller === "HUMAN")
        ?.id ?? null
    );
  }

  #humanView() {
    const match = this.#match;
    const humanId = this.#humanId();
    return match === null || humanId === null ? null : viewFor(match, humanId);
  }

  #isAiTurn(): boolean {
    const match = this.#match;
    if (match === null || match.outcome !== null) return false;
    const activeId = match.turnOrder[match.activeSeatIndex];
    return (
      match.players.find((player) => player.id === activeId)?.controller ===
      "AI"
    );
  }

  #beginCombatPresentation(
    events: readonly DomainEvent[],
    previousState: GameState,
  ): void {
    const combat = events.find((event) => event.kind === "COMBAT_RESOLVED");
    const humanId = this.#humanId();
    if (combat === undefined || humanId === null) return;
    const previousView = viewFor(previousState, humanId);
    if (combat.preview.target.kind !== "UNIT") {
      const wallId = combat.preview.target.wallId;
      const wall = previousView.chocolateWalls.find(
        (candidate) => candidate.id === wallId,
      );
      if (wall === undefined) return;
      const reduced = this.#settings.motion === "REDUCED";
      this.#combatQueueToken += 1;
      this.#candyPresentation = {
        id: this.#match?.commandIndex ?? previousState.commandIndex + 1,
        kind: "WALL_HIT",
        queueToken: this.#combatQueueToken,
        commandIndex:
          this.#match?.commandIndex ?? previousState.commandIndex + 1,
        durationMs: this.#combatPresentationDurationMs ?? (reduced ? 100 : 180),
        elapsedMs: 0,
        paused: false,
        motion: reduced ? "REDUCED" : "FULL",
        at: wall.at,
        actor:
          previousView.units.find(
            (unit) => unit.id === combat.preview.attackerId,
          ) ?? null,
        damage: combat.preview.damageToDefender,
        targetDies: combat.preview.defenderDies,
      };
      this.#combatPhaseStartedAt = Date.now();
      this.#scheduleCandyPresentation();
      return;
    }
    const defenderId = combat.preview.target.unitId;
    const defender = previousView.units.find((unit) => unit.id === defenderId);
    if (defender === undefined) return;
    const attacker =
      previousView.units.find(
        (unit) => unit.id === combat.preview.attackerId,
      ) ?? null;
    const archerArrow =
      previousState.units.find((unit) => unit.id === combat.preview.attackerId)
        ?.type === "ARCHER";
    // The arrow is valid only while both public render-snapshot endpoints
    // exist. Missing endpoints install the already-authoritative post frame.
    if (archerArrow && attacker === null) return;
    const reduced = this.#settings.motion === "REDUCED";
    const fast = this.#settings.animationSpeed === "FAST";
    this.#combatQueueToken += 1;
    this.#combatPresentation = {
      id: this.#match?.commandIndex ?? previousState.commandIndex + 1,
      kind: archerArrow ? "ARCHER_ARROW" : "STANDARD",
      projectile: archerArrow
        ? previousState.players.find(
            (player) => player.id === attacker?.ownerId,
          )?.faction === "CANDY"
          ? "GUMBALL"
          : "ARROW"
        : null,
      queueToken: this.#combatQueueToken,
      commandIndex: this.#match?.commandIndex ?? previousState.commandIndex + 1,
      phase: reduced ? "IMPACT" : archerArrow ? "FLIGHT" : "CONTACT",
      phaseDurationMs: reduced
        ? (this.#combatPresentationDurationMs ??
          (archerArrow
            ? COMBAT_PRESENTATION_TIMING.archerImpactMs
            : COMBAT_PRESENTATION_TIMING.reducedImpactMs))
        : archerArrow
          ? (this.#combatPresentationDurationMs ??
            COMBAT_PRESENTATION_TIMING.archerFlightMs)
          : fast
            ? (this.#combatPresentationDurationMs ??
              COMBAT_PRESENTATION_TIMING.contactFastMs)
            : (this.#combatPresentationDurationMs ??
              COMBAT_PRESENTATION_TIMING.contactNormalMs),
      motion: reduced ? "REDUCED" : "FULL",
      phaseElapsedMs: 0,
      paused: false,
      attacker,
      defender,
      damageToDefender: combat.preview.damageToDefender,
      damageToAttacker: combat.preview.damageToAttacker,
      defenderDies: combat.preview.defenderDies,
      attackerDies: combat.preview.attackerDies,
      advances: combat.preview.advances,
    };
    this.#combatPhaseStartedAt = Date.now();
    this.#scheduleCombatPhase();
  }

  #scheduleCombatPhase(): void {
    const presentation = this.#combatPresentation;
    if (presentation === null || presentation.paused) return;
    const generation = this.#combatGeneration;
    const remainingMs = Math.max(
      0,
      presentation.phaseDurationMs - presentation.phaseElapsedMs,
    );
    this.#combatTimer = setTimeout(() => {
      this.#combatTimer = null;
      if (
        this.#destroyed ||
        generation !== this.#combatGeneration ||
        this.#combatPresentation === null
      )
        return;
      if (
        this.#combatPresentation.phase === "CONTACT" ||
        this.#combatPresentation.phase === "FLIGHT"
      ) {
        const fast = this.#settings.animationSpeed === "FAST";
        this.#combatPresentation = {
          ...this.#combatPresentation,
          phase: "IMPACT",
          phaseDurationMs:
            this.#combatPresentationDurationMs ??
            (this.#combatPresentation.kind === "ARCHER_ARROW"
              ? COMBAT_PRESENTATION_TIMING.archerImpactMs
              : fast
                ? COMBAT_PRESENTATION_TIMING.impactFastMs
                : COMBAT_PRESENTATION_TIMING.impactNormalMs),
          phaseElapsedMs: 0,
        };
        this.#combatPhaseStartedAt = Date.now();
        this.#emit();
        this.#scheduleCombatPhase();
        return;
      }
      this.#combatPresentation = null;
      if (this.#match?.outcome !== null && this.#route === "MATCH") {
        this.#route = "RESULT";
        this.#overlay = { name: "NONE" };
      }
      this.#emit();
      this.#scheduleAiIfNeeded();
    }, remainingMs);
  }

  #pauseCombatPresentation(): void {
    const presentation = this.#combatPresentation;
    if (presentation === null || presentation.paused) {
      this.#pauseCandyPresentation();
      return;
    }
    const elapsedMs = Math.min(
      presentation.phaseDurationMs,
      presentation.phaseElapsedMs +
        Math.max(0, Date.now() - this.#combatPhaseStartedAt),
    );
    this.#combatGeneration += 1;
    if (this.#combatTimer !== null) clearTimeout(this.#combatTimer);
    this.#combatTimer = null;
    this.#combatPresentation = {
      ...presentation,
      phaseElapsedMs: elapsedMs,
      paused: true,
    };
    this.#pauseCandyPresentation();
  }

  #resumeCombatPresentation(): void {
    const presentation = this.#combatPresentation;
    if (presentation !== null && presentation.paused) {
      this.#combatPresentation = { ...presentation, paused: false };
      this.#combatPhaseStartedAt = Date.now();
      this.#scheduleCombatPhase();
    }
    this.#resumeCandyPresentation();
  }

  #cancelCombatPresentation(): void {
    this.#combatGeneration += 1;
    this.#combatQueueToken += 1;
    if (this.#combatTimer !== null) clearTimeout(this.#combatTimer);
    this.#combatTimer = null;
    this.#combatPresentation = null;
    this.#combatPhaseStartedAt = 0;
    this.#candyPresentation = null;
  }

  #beginCandyPresentation(
    command: Command,
    events: readonly DomainEvent[],
    previousState: GameState,
  ): void {
    if (
      command.kind !== "KAMIKAZE_ROLL" &&
      command.kind !== "BUILD_CHOCOLATE_WALL" &&
      !events.some((event) => event.kind === "TILE_CANDIFIED")
    )
      return;
    const humanId = this.#humanId();
    if (humanId === null) return;
    const previousView = viewFor(previousState, humanId);
    const reduced = this.#settings.motion === "REDUCED";
    const fast = this.#settings.animationSpeed === "FAST";
    this.#combatQueueToken += 1;
    const common = {
      id: this.#match?.commandIndex ?? previousState.commandIndex + 1,
      queueToken: this.#combatQueueToken,
      commandIndex: this.#match?.commandIndex ?? previousState.commandIndex + 1,
      elapsedMs: 0,
      paused: false,
      motion: reduced ? ("REDUCED" as const) : ("FULL" as const),
    };
    if (command.kind === "KAMIKAZE_ROLL") {
      const actor = previousView.units.find(
        (unit) => unit.id === command.unitId,
      );
      if (actor === undefined) return;
      const steps = events
        .filter((event) => event.kind === "DONUT_ROLL_STEP")
        .map((step) => {
          const hit = events.find(
            (event) =>
              event.kind === "ROLL_DAMAGE_RESOLVED" &&
              event.at.x === step.at.x &&
              event.at.y === step.at.y,
          );
          return {
            at: step.at,
            damage: hit?.kind === "ROLL_DAMAGE_RESOLVED" ? hit.damage : 0,
            targetKind:
              hit?.kind === "ROLL_DAMAGE_RESOLVED" ? hit.target.kind : null,
            targetId:
              hit?.kind !== "ROLL_DAMAGE_RESOLVED"
                ? null
                : hit.target.kind === "UNIT"
                  ? hit.target.unitId
                  : hit.target.wallId,
            targetDies:
              hit?.kind === "ROLL_DAMAGE_RESOLVED" && hit.hpAfter === 0,
          };
        });
      this.#candyPresentation = {
        ...common,
        kind: "DONUT_ROLL",
        durationMs:
          this.#combatPresentationDurationMs ??
          (reduced ? 100 : fast ? 100 : Math.min(900, steps.length * 90)),
        actor,
        steps,
      };
    } else if (command.kind === "BUILD_CHOCOLATE_WALL") {
      this.#candyPresentation = {
        ...common,
        kind: "WALL_BUILD",
        durationMs:
          this.#combatPresentationDurationMs ?? (reduced || fast ? 100 : 180),
        at: command.at,
        actor:
          previousView.units.find((unit) => unit.id === command.unitId) ?? null,
      };
    } else {
      const event = events.find(
        (candidate) => candidate.kind === "TILE_CANDIFIED",
      );
      if (event?.kind !== "TILE_CANDIFIED") return;
      this.#candyPresentation = {
        ...common,
        kind: "CANDIFY",
        durationMs:
          this.#combatPresentationDurationMs ?? (reduced || fast ? 100 : 240),
        at: event.at,
        actor:
          previousView.units.find((unit) => unit.id === event.unitId) ?? null,
      };
    }
    this.#combatPhaseStartedAt = Date.now();
    this.#scheduleCandyPresentation();
  }

  #scheduleCandyPresentation(): void {
    const presentation = this.#candyPresentation;
    if (presentation === null || presentation.paused) return;
    const generation = this.#combatGeneration;
    const remaining = Math.max(
      0,
      presentation.durationMs - presentation.elapsedMs,
    );
    this.#combatTimer = setTimeout(() => {
      this.#combatTimer = null;
      if (
        this.#destroyed ||
        generation !== this.#combatGeneration ||
        this.#candyPresentation === null
      )
        return;
      this.#candyPresentation = null;
      this.#emit();
      this.#scheduleAiIfNeeded();
    }, remaining);
  }

  #pauseCandyPresentation(): void {
    const presentation = this.#candyPresentation;
    if (presentation === null || presentation.paused) return;
    this.#combatGeneration += 1;
    if (this.#combatTimer !== null) clearTimeout(this.#combatTimer);
    this.#combatTimer = null;
    this.#candyPresentation = {
      ...presentation,
      elapsedMs: Math.min(
        presentation.durationMs,
        presentation.elapsedMs +
          Math.max(0, Date.now() - this.#combatPhaseStartedAt),
      ),
      paused: true,
    };
  }

  #resumeCandyPresentation(): void {
    const presentation = this.#candyPresentation;
    if (presentation === null || !presentation.paused) return;
    this.#candyPresentation = { ...presentation, paused: false };
    this.#combatPhaseStartedAt = Date.now();
    this.#scheduleCandyPresentation();
  }

  #emit(): void {
    if (this.#destroyed) return;
    const snapshot = this.snapshot();
    for (const subscriber of this.#subscribers) subscriber(snapshot);
  }
}

export function autoBoardSize(aiCount: 1 | 2 | 3): 11 | 14 | 16 {
  return aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16;
}

export function resolveBoardSize(
  aiCount: 1 | 2 | 3,
  preset: BoardPreset,
): 11 | 14 | 16 | 20 | 25 {
  return preset === "AUTO" ? autoBoardSize(aiCount) : preset;
}

export function nextIncome(state: GameState, playerId: PlayerId): number {
  return totalIncome(playerIncome(state, playerId));
}

function browserRandomUint32(): number {
  const values = new Uint32Array(1);
  globalThis.crypto.getRandomValues(values);
  return values[0] ?? 0;
}

function replayFromSave(save: SaveEnvelopeV5): ReplayFile {
  return {
    format: "pulp-wars-replay",
    version: 5,
    setup: save.setup,
    commands: save.acceptedCommands,
    checkpoints: [],
  };
}

function sameCommand(left: Command, right: Command): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

/**
 * End-turn presentation is based only on observation-safe offered commands.
 * Economy and turn-management commands have their own warning categories (or
 * no warning), while every command here gives a specific unit something useful
 * to do now.
 */
function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/**
 * Presentation tallies follow domain-event causality. Every removed unit is a
 * loss for its owner, including elimination cleanup. Only an ATTACK or
 * RETALIATION death paired to its combat preview awards a kill; cleanup never
 * does. Result totals are projected from these same per-player values.
 */
export function accumulatePlayerTallies(
  previousState: GameState | null,
  events: readonly DomainEvent[],
  initial: readonly PlayerMatchTallies[],
): readonly PlayerMatchTallies[] {
  let tallies = initial;
  for (const event of events) {
    if (event.kind === "CITY_CAPTURED") {
      tallies = incrementPlayerTally(tallies, event.to, "citiesCaptured");
      continue;
    }
    if (event.kind !== "UNIT_DIED") continue;
    const lostUnit = previousState?.units.find(
      (unit) => unit.id === event.unitId,
    );
    if (lostUnit !== undefined) {
      tallies = incrementPlayerTally(tallies, lostUnit.ownerId, "losses");
    }
    if (event.cause === "ELIMINATION") continue;
    if (event.cause === "KAMIKAZE_ROLL") {
      const roll = events.find(
        (candidate) =>
          candidate.kind === "ROLL_DAMAGE_RESOLVED" &&
          candidate.target.kind === "UNIT" &&
          candidate.target.unitId === event.unitId,
      );
      if (roll?.kind !== "ROLL_DAMAGE_RESOLVED") continue;
      const source = previousState?.units.find(
        (unit) => unit.id === roll.sourceUnitId,
      );
      if (
        source !== undefined &&
        lostUnit !== undefined &&
        previousState !== null &&
        arePlayersHostile(
          previousState.setup.aiMode,
          previousState.humanPlayerId,
          source.ownerId,
          lostUnit.ownerId,
        )
      ) {
        tallies = incrementPlayerTally(tallies, source.ownerId, "kills");
      }
      continue;
    }
    if (event.cause === "KAMIKAZE_ROLL_SELF" || event.cause === "CANDIFY")
      continue;
    const combat = events.find(
      (candidate) =>
        candidate.kind === "COMBAT_RESOLVED" &&
        candidate.preview.target.kind === "UNIT" &&
        (event.cause === "ATTACK"
          ? candidate.preview.target.unitId === event.unitId
          : candidate.preview.attackerId === event.unitId),
    );
    if (combat?.kind !== "COMBAT_RESOLVED") continue;
    const killerId =
      event.cause === "ATTACK"
        ? combat.preview.attackerId
        : combat.preview.target.kind === "UNIT"
          ? combat.preview.target.unitId
          : null;
    if (killerId === null) continue;
    const killer = previousState?.units.find((unit) => unit.id === killerId);
    if (killer !== undefined) {
      tallies = incrementPlayerTally(tallies, killer.ownerId, "kills");
    }
  }
  return tallies;
}

export function resultTalliesForHuman(
  tallies: readonly PlayerMatchTallies[],
  humanId: PlayerId | null,
): MatchTallies {
  const human = tallies.find((tally) => tally.playerId === humanId);
  return {
    citiesCaptured: human?.citiesCaptured ?? 0,
    unitsDefeated: human?.kills ?? 0,
    unitsLost: human?.losses ?? 0,
  };
}

function incrementPlayerTally(
  tallies: readonly PlayerMatchTallies[],
  playerId: PlayerId,
  field: "kills" | "losses" | "citiesCaptured",
): readonly PlayerMatchTallies[] {
  return tallies.map((tally) =>
    tally.playerId === playerId
      ? { ...tally, [field]: tally[field] + 1 }
      : tally,
  );
}
