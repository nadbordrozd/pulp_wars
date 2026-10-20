// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Ruleset7AcceptedBoundary } from "../../src/app/index";
import type { PresentationStepCueV7 } from "../../src/audio/index";
import {
  applyCommandV7,
  createPlayableGameV7,
  missionByIdV7,
  missionMatchSetupV7,
  projectEventsV7,
  viewForV7,
  type GameStateV7,
  type PlayerEventEnvelopeV7,
  type PlayerId,
  type PlayerViewV7,
} from "../../src/engine/index";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  Ruleset7DomAppView,
  WAVE_BANNER_MS_V7,
} from "../../src/render/dom/app-view-v7";
import {
  FixtureController,
  RecordingBoardHost,
  required,
  requiredElement,
  waitUntil,
} from "../fixtures/v7-dom-rig";

/**
 * The reinforcement banner in the match (`pulp_wars-hmyk.18`): a wave's
 * step shows one banner with its side, its sentence and its story line,
 * asks for its side's stinger, and goes at a tap; a boundary without a
 * wave shows none; the boundary that begins the player's turn shows the
 * scouts' heads-up of an announced wave. On the hidden fixture
 * `TEST_WAVES`, every seat only ending its turn.
 */

/** A host that announces the plan's steps, as the canvas host does. */
class AnnouncingBoardHost extends RecordingBoardHost {
  #listener: ((cue: PresentationStepCueV7) => void) | null = null;
  setPresentationStepListener(
    listener: ((cue: PresentationStepCueV7) => void) | null,
  ): void {
    this.#listener = listener;
  }
  override async presentBoundary(
    before?: PlayerViewV7,
    after?: PlayerViewV7,
    envelope?: PlayerEventEnvelopeV7,
  ): Promise<void> {
    if (before === undefined || after === undefined || envelope === undefined)
      return;
    for (const step of corePresentationPlanV7(before, envelope, after))
      this.#listener?.({ step, before, after, envelope, durationScale: 1 });
  }
}

/** A fixture controller that can also hand on another seat's boundary. */
class WaveController extends FixtureController {
  readonly #subscribers = new Set<
    (boundary: Ruleset7AcceptedBoundary) => void
  >();
  override subscribeAcceptedBoundary(
    subscriber: (boundary: Ruleset7AcceptedBoundary) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    const unsubscribe = super.subscribeAcceptedBoundary(subscriber);
    return () => {
      this.#subscribers.delete(subscriber);
      unsubscribe();
    };
  }
  emit(boundary: Ruleset7AcceptedBoundary): void {
    for (const subscriber of this.#subscribers) subscriber(boundary);
  }
}

function start(): GameStateV7 {
  const mission = required(missionByIdV7("TEST_WAVES"));
  const setup = required(missionMatchSetupV7(mission, "ORIGINAL"));
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

/** The active seat ends its turn: the state, and the boundary you see. */
function endTurn(state: GameStateV7): {
  readonly state: GameStateV7;
  readonly boundary: Ruleset7AcceptedBoundary;
} {
  const actor = state.turnOrder[state.activeSeatIndex] as PlayerId;
  const applied = applyCommandV7(state, actor, { kind: "END_TURN" });
  if (!applied.accepted) throw new Error(applied.error.code);
  return {
    state: applied.state,
    boundary: {
      actor: actor === state.humanPlayerId ? "HUMAN" : "AI",
      beforeView: viewForV7(state, state.humanPlayerId),
      afterView: viewForV7(applied.state, applied.state.humanPlayerId),
      playerEvents: projectEventsV7(
        state,
        applied.state,
        state.humanPlayerId,
        applied.events,
      ),
    },
  };
}

/** The state after `count` End Turns. */
function after(count: number): GameStateV7 {
  let state = start();
  for (let index = 0; index < count; index += 1) state = endTurn(state).state;
  return state;
}

let view: Ruleset7DomAppView | null = null;

function mount(state: GameStateV7): {
  readonly controller: WaveController;
  readonly app: Ruleset7DomAppView;
} {
  const controller = new WaveController(state);
  const app = new Ruleset7DomAppView(
    document,
    requiredElement<HTMLElement>("#app"),
    controller,
    { boardHost: new AnnouncingBoardHost() },
  );
  view = app;
  return { controller, app };
}

function banners(): HTMLElement[] {
  return [
    ...document.querySelectorAll<HTMLElement>('[data-v7-region="wave-banner"]'),
  ];
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  window.localStorage.clear();
});

afterEach(() => {
  view?.destroy();
  view = null;
});

describe("the reinforcement banner in a match", () => {
  it("shows one banner for a wave, with its side, sentence, line and stinger", async () => {
    // Round 2, your turn: your End Turn starts the Undead's turn and wave.
    const { controller, app } = mount(after(3));
    app.audio.clearLog();
    await controller.dispatch({ kind: "END_TURN" });
    await waitUntil(() => banners().length > 0);
    const found = banners();
    expect(found).toHaveLength(1);
    const banner = found[0] as HTMLElement;
    expect(banner.dataset.side).toBe("ally");
    expect(banner.dataset.kind).toBe("arrival");
    expect(banner.dataset.faction).toBe("UNDEAD");
    expect(banner.getAttribute("role")).toBe("status");
    expect(banner.querySelector(".v7-wave-banner-title")?.textContent).toBe(
      "Allied reinforcements!",
    );
    expect(banner.querySelector(".v7-wave-banner-text")?.textContent).toMatch(
      /^Two Undead warriors arrive near \S/,
    );
    expect(banner.querySelector(".v7-wave-banner-line")?.textContent).toBe(
      "“The dead are here. They apologise for the delay.”",
    );
    // It never takes the focus.
    expect(banner.contains(document.activeElement)).toBe(false);
    expect(app.audio.log.map((entry) => entry.id)).toContain("match.wave.ally");
    expect(app.audio.log.map((entry) => entry.id)).not.toContain(
      "match.wave.enemy",
    );
    // A tap takes it down.
    banner.click();
    expect(banners()).toEqual([]);
  });

  it("gives an enemy wave the enemy's side and stinger, and goes by itself", async () => {
    const { controller, app } = mount(after(3));
    const allied = endTurn(after(3));
    const enemy = endTurn(allied.state);
    app.audio.clearLog();
    controller.emit(enemy.boundary);
    await waitUntil(() => banners().length > 0);
    const banner = banners()[0] as HTMLElement;
    expect(banners()).toHaveLength(1);
    expect(banner.dataset.side).toBe("enemy");
    expect(banner.querySelector(".v7-wave-banner-title")?.textContent).toBe(
      "Enemy reinforcements!",
    );
    expect(banner.querySelector(".v7-wave-banner-text")?.textContent).toMatch(
      /^Three Goblin raiders arrive /,
    );
    expect(app.audio.log.map((entry) => entry.id)).toContain(
      "match.wave.enemy",
    );
    await new Promise((resolve) => setTimeout(resolve, WAVE_BANNER_MS_V7 + 50));
    expect(banners()).toEqual([]);
  }, 10_000);

  it("shows no banner for a boundary without a wave", async () => {
    // Round 1, your turn: nothing arrives.
    const { controller, app } = mount(start());
    app.audio.clearLog();
    await controller.dispatch({ kind: "END_TURN" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(banners()).toEqual([]);
    expect(
      app.audio.log.filter((entry) => entry.id.startsWith("match.wave")),
    ).toEqual([]);
  });

  it("shows the scouts' heads-up when the turn before an announced wave begins", async () => {
    // Round 1, the Goblins' End Turn begins your round 2 turn.
    const goblinsTurn = after(2);
    const { controller } = mount(goblinsTurn);
    controller.emit(endTurn(goblinsTurn).boundary);
    await waitUntil(() => banners().length > 0);
    const banner = banners()[0] as HTMLElement;
    expect(banners()).toHaveLength(1);
    expect(banner.dataset.kind).toBe("heads-up");
    expect(banner.dataset.side).toBe("enemy");
    expect(banner.querySelector(".v7-wave-banner-title")?.textContent).toBe(
      "Enemies approaching!",
    );
    expect(banner.querySelector(".v7-wave-banner-text")?.textContent).toBe(
      "Scouts report Goblins approaching from the north.",
    );
    expect(banner.querySelector(".v7-wave-banner-line")).toBeNull();
  });
});
