// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type PlayerViewV7,
} from "../../src/engine/index";
import type { Ruleset7BrowserSnapshot } from "../../src/app/index";
import {
  CanvasBoardHostV7,
  type BoardHostCallbacksV7,
  type BoardHostModelV7,
  type BoardHostV7,
} from "../../src/render/canvas/board-host-v7";
import {
  boardMapTargetsV7,
  buildBoardRenderPlanV7,
  type BoardSelectionV7,
} from "../../src/render/canvas/board-renderer-v7";
import { tileActionPlanForSelectionV7 } from "../../src/render/canvas/tile-actions-v7";
import {
  Ruleset7DomAppView,
  type Ruleset7ControllerPortV7,
} from "../../src/render/dom/app-view-v7";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import { goblinArenaV7, seatIdV7 } from "../fixtures/v7-goblin-arena";
import { at, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * Building under a unit (`pulp_wars-og1r`): a player said he could not
 * build on a tile with a unit on it. The engine offers a building under an
 * own or allied unit (tests/unit/ruleset-v7-build-under-unit.test.ts); the
 * board reaches it with a tap on the unit's tile (the unit first, the tile
 * under it next), and a tap on the unit that is already selected (after
 * its Move, which resets the cycle) goes straight to the tile, so the build
 * buttons are one tap away. Under an enemy unit the tile dock offers no
 * build and says "Enemy on this tile".
 */

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});
afterEach(() => vi.restoreAllMocks());

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;

const FARM_TILE = at(9, 9);

function fertile(state: GameStateV7, where: CoordV7): GameStateV7 {
  return patchTileV7(state, where, {
    biome: "PLAINS",
    terrain: "GRASS",
    resource: "FERTILE_GROUND",
    improvement: null,
    road: false,
  });
}

/** Two seats; a Fighter of `seat` on Fertile Ground in seat 0's land. */
function twoSeats(seat: number): {
  readonly state: GameStateV7;
  readonly viewer: PlayerId;
  readonly at: CoordV7;
} {
  const state = fertile(
    goblinArenaV7(
      ["ORIGINAL", "ORIGINAL"],
      [{ seat, role: "FIGHTER", at: FARM_TILE }],
    ),
    FARM_TILE,
  );
  return { state, viewer: state.humanPlayerId, at: FARM_TILE };
}

/**
 * Three seats in a Cooperative match, seen by seat 1 (an AI seat allied to
 * seat 2): a Fighter of seat 2 on Fertile Ground in seat 1's land.
 */
function allied(): {
  readonly state: GameStateV7;
  readonly viewer: PlayerId;
  readonly at: CoordV7;
} {
  const factions = ["ORIGINAL", "ORIGINAL", "ORIGINAL"] as const;
  const options = { aiMode: "COOPERATIVE" as const, activeSeat: 1 };
  const probe = goblinArenaV7(factions, [], options);
  const capital = cityOfV7(probe, 1);
  const where = probe.board.tiles.find(
    (tile) =>
      tile.territoryCityId === capital.id &&
      tile.site === null &&
      tile.biome !== null &&
      !same(tile.at, capital.at),
  )?.at;
  if (where === undefined) throw new Error("no territory tile");
  const state = fertile(
    goblinArenaV7(factions, [{ seat: 2, role: "FIGHTER", at: where }], options),
    where,
  );
  return { state, viewer: seatIdV7(state, 1), at: where };
}

const fixtures = {
  own: () => twoSeats(0),
  allied,
  enemy: () => twoSeats(1),
} as const;

function snapshotOf(view: PlayerViewV7): Ruleset7BrowserSnapshot {
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
      maximumSliceMilliseconds: 0,
    },
  };
}

class FakeHost implements BoardHostV7 {
  callbacks: BoardHostCallbacksV7 | null = null;
  last: BoardHostModelV7 | null = null;
  mount(container: HTMLElement, callbacks: BoardHostCallbacksV7): void {
    this.callbacks = callbacks;
    container.append(document.createElement("canvas"));
  }
  update(model: BoardHostModelV7): void {
    this.last = model;
  }
  activate(): void {}
  quietTap(): void {}
  releaseCursor(): void {}
  zoom(): void {}
  focus(): void {}
  async presentBoundary(): Promise<void> {}
  finishPresentations(): void {}
  destroy(): void {}
}

function mountDom(view: PlayerViewV7) {
  const snapshot = snapshotOf(view);
  const host = new FakeHost();
  const root = document.querySelector<HTMLElement>("#app");
  if (root === null) throw new Error("#app missing");
  const app = new Ruleset7DomAppView(
    document,
    root,
    {
      snapshot: () => snapshot,
      subscribe: (listener: (value: Ruleset7BrowserSnapshot) => void) => {
        listener(snapshot);
        return () => undefined;
      },
      subscribeAcceptedBoundary: () => () => undefined,
    } as unknown as Ruleset7ControllerPortV7,
    { boardHost: host },
  );
  return { app, host };
}

const dock = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(".v7-selection-dock");

const farmButton = (): HTMLElement | null =>
  dock()?.querySelector<HTMLElement>('[data-action="command-build_farm"]') ??
  null;

describe("the tile dock under a unit (og1r)", () => {
  it.each([
    ["own", true],
    ["allied", true],
    ["enemy", false],
  ] as const)("under an %s unit offers the Farm: %s", (name, builds) => {
    const { state, viewer, at: where } = fixtures[name]();
    const view = viewForV7(state, viewer);
    const unit = view.units.find((item) => same(item.at, where));
    expect(unit).toBeDefined();
    const { app, host } = mountDom(view);
    // The first tap: the unit's dock, with no build in it.
    host.callbacks?.onSelection({ kind: "UNIT", unitId: unit?.id ?? 0 });
    expect(dock()?.dataset.selectionKind).toBe("unit");
    expect(farmButton()).toBeNull();
    // The tile under it.
    host.callbacks?.onSelection({ kind: "TILE", at: where });
    expect(dock()?.dataset.selectionKind).toBe("tile");
    expect(farmButton() !== null).toBe(builds);
    expect(
      dock()?.querySelector('[data-disabled-reason="enemy-on-tile"]') !== null,
    ).toBe(!builds);
    app.destroy();
  });
});

describe("the board under a unit (og1r)", () => {
  function rig(view: PlayerViewV7) {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const container = document.createElement("div");
    Object.defineProperty(container, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 600,
        left: 0,
        top: 0,
        right: 800,
        bottom: 600,
      }),
    });
    document.body.append(container);
    const host = new CanvasBoardHostV7(document);
    const selections = vi.fn<(selection: BoardSelectionV7 | null) => void>();
    const commands = vi.fn();
    host.mount(container, { onSelection: selections, onCommand: commands });
    const offered = queryPlayerCommandsV7(view);
    const update = (
      selection: BoardSelectionV7 | null,
      commandIndex = view.commandIndex,
    ) =>
      host.update({
        matchInstanceId: 1,
        view: { ...view, commandIndex },
        offeredCommands: offered,
        interactive: true,
        motion: "REDUCED",
        animationSpeed: "FAST",
        presentationPaused: false,
        highContrast: false,
        interaction: {
          selection,
          selectedUnitId: selection?.kind === "UNIT" ? selection.unitId : null,
          selectedAchievement: null,
        },
      });
    const last = () => selections.mock.calls.at(-1)?.[0];
    return { host, update, last, commands, offered };
  }

  it.each(["own", "allied", "enemy"] as const)(
    "reaches the tile under an %s unit, in one tap once the unit is selected",
    (name) => {
      const { state, viewer, at: where } = fixtures[name]();
      const view = viewForV7(state, viewer);
      const unit = view.units.find((item) => same(item.at, where));
      if (unit === undefined) throw new Error("no unit");
      const { host, update, last, commands } = rig(view);
      const unitSelection = { kind: "UNIT" as const, unitId: unit.id };
      // Nothing selected: the unit first, then the tile under it.
      update(null);
      host.activate(where);
      expect(last()).toEqual(unitSelection);
      update(unitSelection);
      host.activate(where);
      expect(last()).toEqual({ kind: "TILE", at: where });
      // The unit is selected and a command was accepted (its Move), which
      // resets the cycle: one tap goes to the tile, the next to the unit.
      update(unitSelection, view.commandIndex + 1);
      host.activate(where);
      expect(last()).toEqual({ kind: "TILE", at: where });
      update({ kind: "TILE", at: where }, view.commandIndex + 1);
      host.activate(where);
      expect(last()).toEqual(unitSelection);
      // No tap on the unit's tile is taken for a command.
      expect(commands).not.toHaveBeenCalled();
      host.destroy();
    },
  );

  it("never marks or badges the selected own unit's tile, and boxes the tile when it is selected", () => {
    const { state, viewer, at: where } = fixtures.own();
    const view = viewForV7(state, viewer);
    const unit = view.units.find((item) => same(item.at, where));
    if (unit === undefined) throw new Error("no unit");
    const offered = queryPlayerCommandsV7(view);
    const interaction = {
      selection: { kind: "UNIT" as const, unitId: unit.id },
      selectedUnitId: unit.id,
      selectedAchievement: null,
    };
    expect(
      boardMapTargetsV7(view, offered, interaction).some((target) =>
        same(target.at, where),
      ),
    ).toBe(false);
    expect(
      tileActionPlanForSelectionV7(view, offered, unit.id)?.tiles.some((tile) =>
        same(tile.at, where),
      ) ?? false,
    ).toBe(false);
    const plan = buildBoardRenderPlanV7(view, offered, {
      selection: { kind: "TILE", at: where },
      selectedUnitId: null,
      selectedAchievement: null,
    });
    expect(
      plan.entries.some(
        (entry) => entry.kind === "SELECTION" && same(entry.at, where),
      ),
    ).toBe(true);
  });
});
