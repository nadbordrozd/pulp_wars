import type {
  Ruleset7AcceptedBoundary,
  Ruleset7AiPacingGateV7,
  Ruleset7BrowserSnapshot,
  Ruleset7CampaignProgressV7,
  Ruleset7TribeStarsV7,
} from "../../app/v7-controller";
import type { Ruleset7ControllerPortV7 } from "./app-view-v7";

/**
 * The match screen's controller (`pulp_wars-eqc6.3`): the single-player
 * controller, or for the length of an online game the online one in its
 * place. The screen subscribes once; a switch hands it the other
 * controller's snapshot at once and its boundaries from then on, and moves
 * the calm-playback gate over. Campaign progress, tribe stars and the
 * developer switch are always the single-player controller's: an online
 * game never touches them.
 */
export class ControllerSwitchV7 implements Ruleset7ControllerPortV7 {
  readonly #base: Ruleset7ControllerPortV7;
  #active: Ruleset7ControllerPortV7;
  readonly #subscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  readonly #boundarySubscribers = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  #innerSnapshot: (() => void) | null = null;
  #innerBoundary: (() => void) | null = null;
  #gate: Ruleset7AiPacingGateV7 | null = null;

  readonly campaignProgress?: () => Ruleset7CampaignProgressV7;
  readonly resetCampaignProgress?: () => boolean;
  readonly setDeveloperMode?: (on: boolean) => void;
  readonly tribeStars?: () => Ruleset7TribeStarsV7;
  readonly resetTribeStars?: () => boolean;

  constructor(base: Ruleset7ControllerPortV7) {
    this.#base = base;
    this.#active = base;
    // The single-player controller's own, when it keeps them.
    const {
      campaignProgress,
      resetCampaignProgress,
      setDeveloperMode,
      tribeStars,
      resetTribeStars,
    } = base;
    if (campaignProgress !== undefined)
      this.campaignProgress = () => campaignProgress.call(base);
    if (resetCampaignProgress !== undefined)
      this.resetCampaignProgress = () => resetCampaignProgress.call(base);
    if (setDeveloperMode !== undefined)
      this.setDeveloperMode = (on) => setDeveloperMode.call(base, on);
    if (tribeStars !== undefined) this.tribeStars = () => tribeStars.call(base);
    if (resetTribeStars !== undefined)
      this.resetTribeStars = () => resetTribeStars.call(base);
  }

  /** The single-player controller. */
  get base(): Ruleset7ControllerPortV7 {
    return this.#base;
  }

  /** Whether another controller than the single-player one is in use. */
  get switched(): boolean {
    return this.#active !== this.#base;
  }

  /**
   * Puts `port` in use (null: the single-player controller again). The
   * subscribers hear its snapshot at once.
   */
  use(port: Ruleset7ControllerPortV7 | null): void {
    const next = port ?? this.#base;
    if (next === this.#active) return;
    this.#active.setAiPacingGate?.(null);
    this.#innerSnapshot?.();
    this.#innerSnapshot = null;
    this.#innerBoundary?.();
    this.#innerBoundary = null;
    this.#active = next;
    next.setAiPacingGate?.(this.#gate);
    this.#attach();
  }

  snapshot(): Ruleset7BrowserSnapshot {
    return this.#active.snapshot();
  }

  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    if (this.#innerSnapshot === null) this.#attach();
    else subscriber(this.#active.snapshot());
    return () => {
      this.#subscribers.delete(subscriber);
    };
  }

  subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#boundarySubscribers.add(subscriber);
    if (this.#innerBoundary === null) this.#attachBoundaries();
    return () => {
      this.#boundarySubscribers.delete(subscriber);
    };
  }

  launch: Ruleset7ControllerPortV7["launch"] = (setup, options) =>
    this.#active.launch(setup, options);
  resume: Ruleset7ControllerPortV7["resume"] = () => this.#active.resume();
  returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = () =>
    this.#active.returnToMenu();
  dispatch: Ruleset7ControllerPortV7["dispatch"] = (command) =>
    this.#active.dispatch(command);
  progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] = () =>
    this.#active.progressAiTurns();
  restart: Ruleset7ControllerPortV7["restart"] = () => this.#active.restart();
  deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] = () =>
    this.#active.deleteStoredSave();
  setFastForward: Ruleset7ControllerPortV7["setFastForward"] = (active) =>
    this.#active.setFastForward(active);
  exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = (input) =>
    this.#active.exportSafeLog(input);
  exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] = (input) =>
    this.#active.exportDebugBundle(input);

  setAiPacingGate(gate: Ruleset7AiPacingGateV7 | null): void {
    this.#gate = gate;
    this.#active.setAiPacingGate?.(gate);
  }

  #attach(): void {
    if (this.#subscribers.size > 0)
      this.#innerSnapshot = this.#active.subscribe((snapshot) => {
        for (const subscriber of [...this.#subscribers]) subscriber(snapshot);
      });
    if (this.#boundarySubscribers.size > 0) this.#attachBoundaries();
  }

  #attachBoundaries(): void {
    this.#innerBoundary?.();
    this.#innerBoundary = this.#active.subscribeAcceptedBoundary((boundary) => {
      for (const subscriber of [...this.#boundarySubscribers])
        subscriber(boundary);
    });
  }
}
