/**
 * Interface (DOM) review scenes for chibi batch 5 (bead pulp_wars-67q.11).
 *
 * Loaded in the browser through the Vite dev server by
 * scripts/art/chibi-batch-review.ts: it mounts a second, real
 * Ruleset7DomAppView with ?art=chibi over the page, fed by a fixture arena
 * (every technology researched, plenty of Coins, a Human and an Undead seat)
 * and the real CanvasBoardHostV7, then opens one interface surface: a unit
 * dock, a city's training dock, the technology tree or a mandatory reward.
 * Nothing here is part of the game build.
 */
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type RewardIdV7,
} from "../../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../../src/app/index";
import {
  CanvasBoardHostV7,
  type BoardHostCallbacksV7,
  type BoardHostModelV7,
  type BoardHostV7,
} from "../../../src/render/canvas/board-host-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../../src/render/dom/app-view-v7";
import type { ArtSetV7 } from "../../../src/assets/chibi-art-v7";
import {
  UNDEAD_SHOWCASE_V7,
  undeadShowcaseFixtureV7,
  undeadUiArenaV7,
} from "../../../tests/fixtures/v7-undead-ui";

export type ChibiDomReviewSceneV7 =
  /** A Human viewer's Captain: map sprite, Rally, Disband, Wait. */
  | "HUMAN_UNIT"
  /** A Human viewer inspecting an Undead rival's Vampire. */
  | "UNDEAD_RIVAL_UNIT"
  /** An Undead viewer's Necromancer: Frenzy, Raise Dead. */
  | "UNDEAD_UNIT"
  /** A Human capital's training dock (portraits) and Land Grant. */
  | "HUMAN_TRAINING"
  /** An Undead capital's training dock. */
  | "UNDEAD_TRAINING"
  /** The technology tree with one card's detail open. */
  | "TECH"
  /** Mandatory rewards (Survey, City Wall), then coin and population. */
  | "REWARD"
  | "REWARD_ECONOMY"
  /** Undead unit rewards: Skeleton militia and Abomination portraits. */
  | "UNDEAD_REWARD";

export const CHIBI_DOM_REVIEW_SCENES_V7: readonly ChibiDomReviewSceneV7[] = [
  "HUMAN_UNIT",
  "UNDEAD_RIVAL_UNIT",
  "UNDEAD_UNIT",
  "HUMAN_TRAINING",
  "UNDEAD_TRAINING",
  "TECH",
  "REWARD",
  "REWARD_ECONOMY",
  "UNDEAD_REWARD",
];

const HUMAN_AT = {
  captain: { x: 7, y: 7 },
  fighter: { x: 9, y: 7 },
  knight: { x: 7, y: 9 },
  vampire: { x: 4, y: 7 },
  skeleton: { x: 3, y: 6 },
} as const;

/** Seat 0 (the viewer) is Human with a Captain; seat 1 is Undead. */
function humanArena(): GameStateV7 {
  return undeadUiArenaV7(
    [
      { seat: 0, role: "CAPTAIN", at: HUMAN_AT.captain },
      { seat: 0, role: "FIGHTER", at: HUMAN_AT.fighter },
      { seat: 0, role: "KNIGHT", at: HUMAN_AT.knight },
      { seat: 1, role: "KNIGHT", at: HUMAN_AT.vampire },
      { seat: 1, role: "FIGHTER", at: HUMAN_AT.skeleton },
    ],
    [],
    ["ORIGINAL", "UNDEAD"],
  );
}

function snapshotOf(state: GameStateV7): Ruleset7BrowserSnapshot {
  const view = viewForV7(state, state.humanPlayerId);
  return {
    phase: "ACTIVE",
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    savedAt: null,
    hasStoredSave: false,
    recovery: null,
    saveWarning: null,
    diagnostic: null,
    transitioning: false,
    ai: {
      active: false,
      fastForward: false,
      policySlices: 0,
      acceptedCommands: 0,
      lastSliceMilliseconds: 0,
    } as Ruleset7BrowserSnapshot["ai"],
  };
}

/** A pending level-up choice between the given rewards at the capital. */
function withReward(
  snapshot: Ruleset7BrowserSnapshot,
  rewards: readonly RewardIdV7[],
): Ruleset7BrowserSnapshot {
  const view = snapshot.view;
  if (view === null) return snapshot;
  const city = view.cities.find((entry) => entry.ownerId === view.viewer.id);
  if (city === undefined) return snapshot;
  return {
    ...snapshot,
    view: {
      ...view,
      pendingChoices: [
        {
          kind: "CITY_REWARD",
          cityId: city.id,
          reachedLevel: 3,
          candidates: [...rewards],
        },
      ],
    } as typeof view,
    offeredCommands: rewards.map((reward) => ({
      kind: "CHOOSE_CITY_REWARD" as const,
      cityId: city.id,
      reachedLevel: 3,
      reward,
    })),
  };
}

function port(snapshot: Ruleset7BrowserSnapshot): Ruleset7ControllerPortV7 {
  const rejected = async () => ({ ok: false }) as never;
  return {
    snapshot: () => snapshot,
    subscribe: (listener: (value: Ruleset7BrowserSnapshot) => void) => {
      listener(snapshot);
      return () => undefined;
    },
    subscribeAcceptedBoundary: () => () => undefined,
    launch: rejected,
    resume: rejected,
    returnToMenu: rejected,
    dispatch: async () =>
      ({ accepted: false, reason: "REVIEW_SCENE" }) as never,
    progressAiTurns: rejected,
    restart: rejected,
    deleteStoredSave: rejected,
    setFastForward: () => undefined,
    exportSafeLog: () => "",
    exportDebugBundle: () => "",
  } as unknown as Ruleset7ControllerPortV7;
}

/** The real board host, keeping its selection callback for the scene. */
class RecordingHost implements BoardHostV7 {
  readonly #host: CanvasBoardHostV7;
  callbacks: BoardHostCallbacksV7 | null = null;
  constructor(documentRoot: Document) {
    this.#host = new CanvasBoardHostV7(documentRoot);
  }
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    this.#host.mount(container, callbacks);
  }
  update(model: BoardHostModelV7): void {
    this.#host.update(model);
  }
  activate(at: CoordV7): void {
    this.#host.activate(at);
  }
  zoom(direction: "IN" | "OUT"): void {
    this.#host.zoom(direction);
  }
  focus(): void {
    this.#host.focus();
  }
  destroy(): void {
    this.#host.destroy();
  }
}

export interface ChibiDomReviewV7 {
  readonly scene: ChibiDomReviewSceneV7;
  destroy(): void;
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

export async function showChibiDomReviewV7(
  scene: ChibiDomReviewSceneV7,
  artSet: ArtSetV7 = "CHIBI",
): Promise<ChibiDomReviewV7> {
  const undeadViewer =
    scene === "UNDEAD_UNIT" ||
    scene === "UNDEAD_TRAINING" ||
    scene === "UNDEAD_REWARD";
  let snapshot = snapshotOf(
    scene === "UNDEAD_TRAINING" || scene === "UNDEAD_REWARD"
      ? // A fresh Undead capital with room to train (the showcase's is full).
        undeadUiArenaV7([{ seat: 0, role: "CAPTAIN", at: { x: 7, y: 7 } }])
      : scene === "HUMAN_TRAINING"
        ? // The Human arena's capital supports three units already.
          undeadUiArenaV7(
            [{ seat: 0, role: "CAPTAIN", at: { x: 7, y: 7 } }],
            [],
            ["ORIGINAL", "UNDEAD"],
          )
        : undeadViewer
          ? undeadShowcaseFixtureV7()
          : humanArena(),
  );
  if (scene === "REWARD") snapshot = withReward(snapshot, ["SURVEY", "WALLS"]);
  if (scene === "REWARD_ECONOMY")
    snapshot = withReward(snapshot, ["STOCKPILE", "BOOM"]);
  if (scene === "UNDEAD_REWARD")
    snapshot = withReward(snapshot, ["MILITIA", "JUGGERNAUT"]);
  const overlay = document.createElement("div");
  overlay.dataset.chibiDomReview = scene;
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:2147483000;overflow:auto;background:#171722";
  const root = document.createElement("div");
  overlay.append(root);
  document.body.append(overlay);
  const host = new RecordingHost(document);
  const app = new Ruleset7DomAppView(document, root, port(snapshot), {
    boardHost: host,
    settingsStorage: null,
    artSet,
  });
  await settle();
  const view = snapshot.view;
  const unitAt = (at: CoordV7) =>
    view?.units.find((unit) => unit.at.x === at.x && unit.at.y === at.y);
  const select = (
    selection: Parameters<BoardHostCallbacksV7["onSelection"]>[0],
  ) => host.callbacks?.onSelection(selection);
  const capital = view?.cities.find(
    (city) => city.ownerId === view.viewer.id && city.isCapital,
  );
  if (scene === "HUMAN_UNIT") {
    const unit = unitAt(HUMAN_AT.captain);
    if (unit !== undefined) select({ kind: "UNIT", unitId: unit.id });
  } else if (scene === "UNDEAD_RIVAL_UNIT") {
    const unit = unitAt(HUMAN_AT.vampire);
    if (unit !== undefined) select({ kind: "UNIT", unitId: unit.id });
  } else if (scene === "UNDEAD_UNIT") {
    const unit = unitAt(UNDEAD_SHOWCASE_V7.necromancer);
    if (unit !== undefined) select({ kind: "UNIT", unitId: unit.id });
  } else if (scene === "HUMAN_TRAINING" || scene === "UNDEAD_TRAINING") {
    if (capital !== undefined) select({ kind: "CITY", cityId: capital.id });
  } else if (scene === "TECH") {
    root.querySelector<HTMLElement>('[data-action="tech"]')?.click();
    await settle();
    root.querySelector<HTMLElement>('[data-action="tech-forestry"]')?.click();
  }
  await settle();
  return {
    scene,
    destroy() {
      app.destroy();
      overlay.remove();
    },
  };
}
