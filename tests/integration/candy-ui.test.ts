// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapApp, type BootstrappedApp } from "../../src/app/bootstrap";
import { wallId, type Coord, type GameState } from "../../src/engine/index";
import type {
  BoardHost,
  BoardHostCallbacks,
  BoardHostModel,
  BoardSelection,
} from "../../src/render/canvas/board-host";
import { spatialCommandAt } from "../../src/render/canvas/board-host";
import type { Point } from "../../src/render/canvas/geometry";
import { gameStateBuilder, setupBuilder } from "../fixtures/builders";

let app: BootstrappedApp | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  app?.destroy();
  app = null;
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
});

describe("Candy map-first DOM", () => {
  it("shows faction-correct Donut actions and dispatches one target activation", () => {
    const { state, actor, adjacent } = candyState("RIDER");
    const board = new CandyBoardHost();
    app = bootstrapApp(document, {
      initialRoute: "MATCH",
      initialMatch: state,
      boardHost: board,
      storage: null,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    board.select({ kind: "UNIT", unitId: actor.id });
    const dock = document.querySelector<HTMLElement>(".unit-action-dock");
    expect(dock?.textContent).toContain("Donut");
    expect(dock?.textContent).toContain("Attack0");
    expect(dock?.textContent).toContain("Move1");
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    const roll = button("Roll");
    expect(roll.getAttribute("aria-label")).toContain("map edge");
    expect(
      roll.querySelector<HTMLImageElement>(".unit-action-art")?.src,
    ).toContain("/assets/pixellab/ui/action-kamikaze-roll.png");
    roll.click();
    expect(board.latest()?.targetMode).toEqual({
      kind: "ROLL",
      unitId: actor.id,
    });
    board.activate(adjacent);
    expect(app.controller.snapshot().match?.commandIndex).toBe(
      state.commandIndex + 1,
    );
    expect(app.controller.snapshot().candyPresentation?.kind).toBe(
      "DONUT_ROLL",
    );
  });

  it("shows Choco Engineer Wall and Candify controls without a backdrop", () => {
    const { state, actor } = candyState("DEFENDER", 10);
    const board = new CandyBoardHost();
    app = bootstrapApp(document, {
      initialRoute: "MATCH",
      initialMatch: state,
      boardHost: board,
      storage: null,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    board.select({ kind: "UNIT", unitId: actor.id });
    expect(document.querySelector(".unit-action-dock")?.textContent).toContain(
      "Choco Engineer",
    );
    expect(
      button("Chocolate Wall · 1★").querySelector(".unit-action-art"),
    ).not.toBeNull();
    expect(button("Candify").getAttribute("aria-label")).toContain("sacrifice");
    expect(document.querySelector(".modal-backdrop")).toBeNull();
    button("Chocolate Wall · 1★").click();
    expect(board.latest()?.targetMode).toEqual({
      kind: "BUILD_WALL",
      unitId: actor.id,
    });
  });

  it("inspects a Wall as a structure and renders the mandatory Candify chooser", () => {
    const fixture = candyState("WARRIOR");
    const humanCities = fixture.state.cities.map((city) => ({
      ...city,
      ownerId: fixture.state.humanPlayerId,
    }));
    const wall = {
      id: wallId(fixture.state.nextEntityId),
      ownerId: fixture.state.humanPlayerId,
      at: { x: 0, y: 0 },
      hp: 6,
    };
    const state: GameState = {
      ...fixture.state,
      nextEntityId: fixture.state.nextEntityId + 1,
      cities: humanCities,
      chocolateWalls: [wall],
      pendingChoice: {
        kind: "CANDIFY_CITY",
        unitId: fixture.actor.id,
        candidateCityIds: humanCities.map((city) => city.id),
      },
    };
    const board = new CandyBoardHost();
    app = bootstrapApp(document, {
      initialRoute: "MATCH",
      initialMatch: state,
      boardHost: board,
      storage: null,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    const dialog = document.querySelector<HTMLElement>("[data-modal]");
    expect(dialog?.textContent).toContain("Choose city for Candify");
    expect(dialog?.querySelector(".reward-choice-art")).not.toBeNull();
    expect(dialog?.querySelector("button[aria-label='Close']")).toBeNull();

    // Clear the synthetic pending choice only for standalone wall inspection.
    app.destroy();
    app = null;
    const inspectable = { ...state, pendingChoice: null };
    app = bootstrapApp(document, {
      initialRoute: "MATCH",
      initialMatch: inspectable,
      boardHost: board,
      storage: null,
      aiStepDelayMs: 100_000,
      prefersReducedMotion: true,
    });
    board.select({ kind: "WALL", wallId: wall.id });
    const dock = document.querySelector<HTMLElement>(".wall-action-dock");
    expect(dock?.textContent).toContain("6/10 HP");
    expect(dock?.textContent).toContain("No retaliation");
    expect(document.querySelector(".modal-backdrop")).toBeNull();
  });
});

class CandyBoardHost implements BoardHost {
  readonly updates: BoardHostModel[] = [];
  #callbacks: BoardHostCallbacks | null = null;

  mount(_container: HTMLElement, callbacks: BoardHostCallbacks): void {
    this.#callbacks = callbacks;
  }

  update(model: BoardHostModel): void {
    this.updates.push(model);
  }

  activate(at: Coord): void {
    const model = this.latest();
    if (model?.selected?.kind !== "UNIT") return;
    const command = spatialCommandAt(
      model.view,
      model.selected.unitId,
      at,
      model.targetMode ?? null,
    );
    if (command !== null) this.#callbacks?.onCommand(command);
  }

  resetActivationCycle(): void {}
  zoom(): void {}
  focus(): void {}
  screenPoint(): Point | null {
    return null;
  }
  destroy(): void {}
  select(selection: BoardSelection): void {
    this.#callbacks?.onSelection(selection);
  }
  latest(): BoardHostModel | undefined {
    return this.updates.at(-1);
  }
}

function candyState(
  type: "WARRIOR" | "DEFENDER" | "RIDER",
  stars = 0,
): {
  readonly state: GameState;
  readonly actor: GameState["units"][number];
  readonly adjacent: Coord;
} {
  const base = gameStateBuilder(
    setupBuilder({ factions: ["CANDY", "ORIGINAL"] }),
  );
  const actorSource = base.units.find(
    (unit) => unit.ownerId === base.humanPlayerId,
  );
  const enemySource = base.units.find(
    (unit) => unit.ownerId !== base.humanPlayerId,
  );
  const city = base.cities.find(
    (candidate) => candidate.ownerId === base.humanPlayerId,
  );
  if (
    actorSource === undefined ||
    enemySource === undefined ||
    city === undefined
  )
    throw new Error("Missing Candy DOM fixture");
  const actor = {
    ...actorSource,
    type,
    at: { x: city.at.x - 2, y: city.at.y },
    ready: true,
    activation: {
      moved: false,
      attacked: false,
      recovered: false,
      captured: false,
      handled: false,
      escapeAvailable: false,
      specialActed: false,
    },
  };
  const adjacent = { x: actor.at.x + 1, y: actor.at.y };
  const enemy = { ...enemySource, at: adjacent };
  return {
    actor,
    adjacent,
    state: {
      ...base,
      activeSeatIndex: base.turnOrder.indexOf(base.humanPlayerId),
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              stars,
              explored: base.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
      units: [actor, enemy],
      chocolateWalls: [],
    },
  };
}

function button(label: string): HTMLButtonElement {
  const found = [
    ...document.querySelectorAll<HTMLButtonElement>("button"),
  ].find((candidate) => candidate.textContent?.trim() === label);
  if (found === undefined) throw new Error(`Missing button: ${label}`);
  return found;
}
