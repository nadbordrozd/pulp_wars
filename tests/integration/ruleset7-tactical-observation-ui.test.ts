// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  type CommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type GameStateV7,
  type PlayerViewV7,
  type PublicBlackoutStatusV7,
} from "../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../src/app/index";
import type {
  BoardHostCallbacksV7,
  BoardHostModelV7,
  BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { blackoutPublicFixtureV7 } from "../fixtures/ruleset7-tactical-ui";
import { checkedV7, initialV7 } from "../fixtures/v7-builders";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("Ruleset 7 tactical observation-safe UI", () => {
  it("keeps CITY_ONLY Blackout source and exact income suppression absent", () => {
    const fixture = blackoutPublicFixtureV7();
    const city = required(
      fixture.view.cities.find(
        (candidate) => candidate.ownerId !== fixture.view.viewer.id,
      ),
    );
    const cityOnly: PublicBlackoutStatusV7 = {
      visibility: "CITY_ONLY",
      cityId: city.id,
      phase: "ACTIVE",
    };
    const source = required(
      fixture.view.units.find(
        (unit) => unit.ownerId === fixture.view.viewer.id,
      ),
    );
    const view: PlayerViewV7 = {
      ...fixture.view,
      cities: fixture.view.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, blackout: cityOnly }
          : candidate,
      ),
      blackoutStatuses: [cityOnly],
    };
    const ui = renderSelection(view, [], { kind: "CITY", cityId: city.id });
    expect(ui.text).toContain(
      "City-only status · source and exact suppression remain private.",
    );
    expect(ui.text).toContain("income suppression capped at 3 Coins");
    expect(ui.text).not.toContain("2 Coins suppressed");
    expect(ui.text).not.toContain(`source ${source.id}`);
    ui.app.destroy();
  });

  it("distinguishes all public Blackout phases and recovery booleans without coupling timers", () => {
    const fixture = blackoutPublicFixtureV7();
    const city = required(fixture.view.cities[0]);
    const cases: readonly [PublicBlackoutStatusV7, string][] = [
      [
        {
          visibility: "FULL",
          cityId: city.id,
          phase: "PENDING",
          sourceUnitId: null,
          suppressedCoins: null,
          unaffectedTurnStarted: null,
        },
        "activates at this city's next owner Start Turn",
      ],
      [
        {
          visibility: "FULL",
          cityId: city.id,
          phase: "ACTIVE",
          sourceUnitId: null,
          suppressedCoins: 2,
          unaffectedTurnStarted: null,
        },
        "2 Coins suppressed this turn (cap 3)",
      ],
      [
        {
          visibility: "FULL",
          cityId: city.id,
          phase: "RECOVERY",
          sourceUnitId: null,
          suppressedCoins: null,
          unaffectedTurnStarted: false,
        },
        "unaffected owner turn started: no",
      ],
      [
        {
          visibility: "FULL",
          cityId: city.id,
          phase: "RECOVERY",
          sourceUnitId: null,
          suppressedCoins: null,
          unaffectedTurnStarted: true,
        },
        "unaffected owner turn started: yes",
      ],
    ];
    for (const [status, expected] of cases) {
      document.body.innerHTML = '<div id="app"></div>';
      const view: PlayerViewV7 = {
        ...fixture.view,
        cities: fixture.view.cities.map((candidate) =>
          candidate.id === city.id
            ? { ...candidate, blackout: status }
            : candidate,
        ),
        blackoutStatuses: [status],
      };
      const ui = renderSelection(view, [], { kind: "CITY", cityId: city.id });
      expect(ui.text).toContain(expected);
      ui.app.destroy();
    }
  });

  it("renders equal output and animation for equal observations from distinct hidden authorities", () => {
    const [authorityA, authorityB] = hiddenAuthorityPair();
    const viewA = viewForV7(authorityA, authorityA.humanPlayerId);
    const viewB = viewForV7(authorityB, authorityB.humanPlayerId);
    const offeredA = queryPlayerCommandsV7(viewA);
    const offeredB = queryPlayerCommandsV7(viewB);
    expect(viewA).toEqual(viewB);
    expect(offeredA).toEqual(offeredB);
    const wait = offeredA.find((command) => command.kind === "WAIT");
    if (wait?.kind !== "WAIT") throw new Error("Hidden-world Wait missing");
    const acceptedA = applyCommandV7(
      authorityA,
      authorityA.humanPlayerId,
      wait,
    );
    const acceptedB = applyCommandV7(
      authorityB,
      authorityB.humanPlayerId,
      wait,
    );
    if (!acceptedA.accepted || !acceptedB.accepted)
      throw new Error("Hidden-world Wait rejected");
    const afterA = viewForV7(acceptedA.state, authorityA.humanPlayerId);
    const afterB = viewForV7(acceptedB.state, authorityB.humanPlayerId);
    const eventsA = projectEventsV7(
      authorityA,
      acceptedA.state,
      authorityA.humanPlayerId,
      acceptedA.events,
    );
    const eventsB = projectEventsV7(
      authorityB,
      acceptedB.state,
      authorityB.humanPlayerId,
      acceptedB.events,
    );
    expect(afterA).toEqual(afterB);
    expect(eventsA).toEqual(eventsB);
    const owned = required(
      viewA.units.find((unit) => unit.ownerId === viewA.viewer.id),
    );
    const first = renderSelection(viewA, offeredA, {
      kind: "UNIT",
      unitId: owned.id,
    });
    const firstText = first.text;
    const firstPlan = first.plan;
    first.app.destroy();
    document.body.innerHTML = '<div id="app"></div>';
    const second = renderSelection(viewB, offeredB, {
      kind: "UNIT",
      unitId: owned.id,
    });
    expect(second.text).toBe(firstText);
    expect(second.plan).toEqual(firstPlan);
    expect(corePresentationPlanV7(viewA, eventsA, afterA)).toEqual(
      corePresentationPlanV7(viewB, eventsB, afterB),
    );
    second.app.destroy();
  });
});

function renderSelection(
  view: PlayerViewV7,
  offeredCommands: readonly CommandV7[],
  selection: Parameters<BoardHostCallbacksV7["onSelection"]>[0],
): {
  readonly app: Ruleset7DomAppView;
  readonly text: string;
  readonly plan: ReturnType<typeof buildBoardRenderPlanV7>;
} {
  const controller = new SnapshotController(view, offeredCommands);
  const host = new ObservationBoardHost();
  const root = required(document.querySelector<HTMLElement>("#app"));
  const app = new Ruleset7DomAppView(document, root, controller, {
    boardHost: host,
    settingsStorage: null,
  });
  host.callbacks?.onSelection(selection);
  const model = required(host.model);
  return {
    app,
    text: root.textContent ?? "",
    plan: buildBoardRenderPlanV7(
      model.view,
      model.offeredCommands,
      model.interaction,
    ),
  };
}

class SnapshotController implements Ruleset7ControllerPortV7 {
  #snapshot: Ruleset7BrowserSnapshot;
  readonly #subscribers = new Set<
    (snapshot: Ruleset7BrowserSnapshot) => void
  >();
  constructor(view: PlayerViewV7, offeredCommands: readonly CommandV7[]) {
    this.#snapshot = {
      phase: "ACTIVE",
      view,
      offeredCommands,
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
        maximumSliceMilliseconds: 0,
      },
    };
  }
  snapshot(): Ruleset7BrowserSnapshot {
    return this.#snapshot;
  }
  subscribe(
    subscriber: (snapshot: Ruleset7BrowserSnapshot) => void,
  ): () => void {
    this.#subscribers.add(subscriber);
    subscriber(this.#snapshot);
    return () => this.#subscribers.delete(subscriber);
  }
  update(view: PlayerViewV7, offeredCommands: readonly CommandV7[] = []): void {
    this.#snapshot = { ...this.#snapshot, view, offeredCommands };
    for (const subscriber of this.#subscribers) subscriber(this.#snapshot);
  }
  subscribeAcceptedBoundary(): () => void {
    return () => {};
  }
  readonly dispatch: Ruleset7ControllerPortV7["dispatch"] = vi.fn(async () => ({
    accepted: false as const,
    reason: "NOT_OFFERED" as const,
  }));
  readonly launch: Ruleset7ControllerPortV7["launch"] = vi.fn(async () => ({
    ok: false as const,
    code: "INVALID_SETUP" as const,
    diagnostic: "Observation fixture is already active",
  }));
  readonly resume: Ruleset7ControllerPortV7["resume"] = vi.fn(
    async () => false,
  );
  readonly returnToMenu: Ruleset7ControllerPortV7["returnToMenu"] = vi.fn(
    async () => false,
  );
  readonly progressAiTurns: Ruleset7ControllerPortV7["progressAiTurns"] = vi.fn(
    async () => ({
      ok: false as const,
      cancelled: true,
      acceptedCommands: 0,
      diagnostic: "Observation fixture has no AI runner",
    }),
  );
  readonly restart: Ruleset7ControllerPortV7["restart"] = vi.fn(async () => ({
    ok: false as const,
    code: "CONTROLLER_DESTROYED" as const,
    diagnostic: "Observation fixture restart disabled",
  }));
  readonly deleteStoredSave: Ruleset7ControllerPortV7["deleteStoredSave"] =
    vi.fn(async () => false);
  readonly setFastForward: Ruleset7ControllerPortV7["setFastForward"] = vi.fn();
  readonly exportSafeLog: Ruleset7ControllerPortV7["exportSafeLog"] = vi.fn(
    () => null,
  );
  readonly exportDebugBundle: Ruleset7ControllerPortV7["exportDebugBundle"] =
    vi.fn(() => ({ ok: false as const, reason: "NO_ACTIVE_MATCH" as const }));
}

function hiddenAuthorityPair(): readonly [GameStateV7, GameStateV7] {
  const base = initialV7(1777);
  const viewer = base.humanPlayerId;
  const humanUnit = required(
    base.units.find((unit) => unit.ownerId === viewer),
  );
  const hostile = required(base.units.find((unit) => unit.ownerId !== viewer));
  const visible = new Set(
    viewForV7(base, viewer)
      .board.tiles.filter((tile) => tile.explored)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  const hidden = base.board.tiles
    .map((tile) => tile.at)
    .filter(
      (at) =>
        !visible.has(`${at.x},${at.y}`) &&
        Math.max(
          Math.abs(at.x - humanUnit.at.x),
          Math.abs(at.y - humanUnit.at.y),
        ) > 3 &&
        !base.cities.some((city) => same(city.at, at)) &&
        !base.treasureChests.some((chest) => same(chest, at)),
    );
  const [saboteurA, scoutA, saboteurB, scoutB] = hidden;
  if (
    saboteurA === undefined ||
    scoutA === undefined ||
    saboteurB === undefined ||
    scoutB === undefined
  )
    throw new Error("Hidden authority coordinates missing");
  const world = (
    saboteurAt: typeof saboteurA,
    scoutAt: typeof scoutA,
  ): GameStateV7 =>
    checkedV7({
      ...base,
      nextEntityId: base.nextEntityId + 1,
      units: [
        ...base.units.filter((unit) => unit.id !== hostile.id),
        {
          ...hostile,
          role: "SABOTEUR" as const,
          at: saboteurAt,
          hp: 10,
          maxHp: 10,
          blackoutEligibleRound: 1,
        },
        {
          ...hostile,
          id: unitId(base.nextEntityId),
          role: "SCOUT" as const,
          at: scoutAt,
          hp: 10,
          maxHp: 10,
          homeCityId: null,
          blackoutEligibleRound: null,
        },
      ].sort((left, right) => left.id - right.id),
    });
  return [world(saboteurA, scoutA), world(saboteurB, scoutB)];
}

function same(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}

class ObservationBoardHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  model: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.model = model;
  }
  activate(): void {}
  zoom(): void {}
  focus(): void {}
  destroy(): void {}
}

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new Error("Required tactical observation fixture value missing");
  return value;
}
