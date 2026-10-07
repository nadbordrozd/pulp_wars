// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import {
  buildBoardRenderPlanV7,
  drawBoardV7,
} from "../../src/render/canvas/board-renderer-v7";
import type { BoardFeedbackFrameV7 } from "../../src/render/canvas/feedback-canvas-v7";
import { exploredAllV7, initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.29 on the real board host and renderer: a click on a
 * tile inside a city's territory hops that city (a click that gives an
 * order does not), and the renderer asks the feedback frame for every
 * city's hop and meter and every unit's hop, state and marker.
 */
beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mountHost(view: PlayerViewV7, motion: "FULL" | "REDUCED" = "FULL") {
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
  const selections = vi.fn();
  const commands = vi.fn();
  host.mount(container, { onSelection: selections, onCommand: commands });
  const model = (patch: Partial<BoardHostModelV7> = {}): BoardHostModelV7 => ({
    matchInstanceId: 1,
    view,
    offeredCommands: queryPlayerCommandsV7(view),
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
    interactive: true,
    motion,
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    ...patch,
  });
  host.update(model());
  return { host, selections, commands, model };
}

describe("the city hop on a click inside its territory", () => {
  const state = exploredAllV7(initialV7());
  const view = viewForV7(state, state.humanPlayerId);
  const own = view.cities.find((city) => city.ownerId === view.viewer.id);
  const foreign = view.cities.find((city) => city.ownerId !== view.viewer.id);
  const occupied = new Set(
    view.units.map((unit) => `${unit.at.x},${unit.at.y}`),
  );
  const territoryTile = (cityId: number | undefined) =>
    view.board.tiles.find(
      (tile) =>
        tile.explored &&
        tile.territoryCityId === cityId &&
        tile.site === null &&
        !occupied.has(`${tile.at.x},${tile.at.y}`),
    );
  const wild = view.board.tiles.find(
    (tile) =>
      tile.explored &&
      tile.territoryCityId === null &&
      !occupied.has(`${tile.at.x},${tile.at.y}`),
  );

  it("hops the viewer's city for any tile of its territory and selects the tile", () => {
    const tile = territoryTile(own?.id);
    if (own === undefined || tile === undefined) throw new Error("fixture");
    const { host, selections } = mountHost(view);
    host.activate(tile.at);
    expect(selections).toHaveBeenCalledWith({ kind: "TILE", at: tile.at });
    expect(host.feedback.snapshot().cityHops).toEqual([own.id]);
    host.destroy();
  });

  it("hops another player's visible city, and the centre itself", () => {
    const tile = territoryTile(foreign?.id);
    if (foreign === undefined || tile === undefined) throw new Error("fixture");
    const { host } = mountHost(view);
    host.activate(tile.at);
    expect(host.feedback.snapshot().cityHops).toEqual([foreign.id]);
    host.feedback.finish();
    host.activate(foreign.at);
    expect(host.feedback.snapshot().cityHops).toEqual([foreign.id]);
    host.destroy();
  });

  it("hops nothing outside every territory, and nothing in reduced motion", () => {
    const tile = territoryTile(own?.id);
    if (wild === undefined || tile === undefined) throw new Error("fixture");
    const { host } = mountHost(view);
    host.activate(wild.at);
    expect(host.feedback.snapshot().cityHops).toEqual([]);
    host.destroy();
    const reduced = mountHost(view, "REDUCED");
    reduced.host.activate(tile.at);
    expect(reduced.host.feedback.snapshot().cityHops).toEqual([]);
    reduced.host.destroy();
  });

  it("gives an order without a hop when the click is a command", () => {
    const unit = view.units.find((item) => item.ownerId === view.viewer.id);
    if (unit === undefined) throw new Error("fixture");
    const { host, commands, model } = mountHost(view);
    host.update(
      model({
        interaction: {
          selection: { kind: "UNIT", unitId: unit.id },
          selectedUnitId: unit.id,
          selectedAchievement: null,
        },
      }),
    );
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: { kind: "UNIT", unitId: unit.id },
      selectedUnitId: unit.id,
      selectedAchievement: null,
    });
    const target = plan.targets.find((candidate) => {
      const tile = view.board.tiles.find(
        (item) => item.at.x === candidate.at.x && item.at.y === candidate.at.y,
      );
      return tile?.explored === true && tile.territoryCityId !== null;
    });
    if (target === undefined) throw new Error("no Move inside the territory");
    host.activate(target.at);
    expect(commands).toHaveBeenCalledTimes(1);
    expect(host.feedback.snapshot().cityHops).toEqual([]);
    host.destroy();
  });
});

describe("the renderer and the feedback frame", () => {
  it("asks for each city's hop and meter and each unit's hop, state and marker", () => {
    const state = exploredAllV7(initialV7());
    const view = viewForV7(state, state.humanPlayerId);
    const asked = {
      cityHop: new Set<number>(),
      cityMeter: new Set<number>(),
      unitHop: new Set<number>(),
      turnState: new Set<number>(),
      marker: new Set<number>(),
    };
    const feedback: BoardFeedbackFrameV7 = {
      cityHopCssPx: (id) => {
        asked.cityHop.add(id);
        return -4;
      },
      unitHopCssPx: (id) => {
        asked.unitHop.add(id);
        return 0;
      },
      cityMeter: (id) => {
        asked.cityMeter.add(id);
        return { level: 1, population: 1 };
      },
      turnState: (id) => {
        asked.turnState.add(id);
        return "FRESH";
      },
      promotionMarker: (id) => {
        asked.marker.add(id);
        return { own: true, scale: 1, bobCssPx: 0 };
      },
      pulse: 0.5,
      chevronBounceCssPx: -2,
    };
    const calls: string[] = [];
    const context = new Proxy(
      { canvas: { width: 800, height: 600 } },
      {
        get(target, key: string) {
          if (key in target) return (target as Record<string, unknown>)[key];
          if (key === "measureText") return () => ({ width: 10 });
          if (key === "createLinearGradient" || key === "createRadialGradient")
            return () => ({ addColorStop: () => undefined });
          if (key === "getImageData")
            return () => ({ data: new Uint8ClampedArray(4) });
          return () => {
            calls.push(key);
          };
        },
        set: () => true,
      },
    ) as unknown as CanvasRenderingContext2D;
    const plan = buildBoardRenderPlanV7(view, queryPlayerCommandsV7(view), {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    });
    const draw = (frame: BoardFeedbackFrameV7 | null): void =>
      drawBoardV7({
        context,
        viewport: { width: 800, height: 600 },
        devicePixelRatio: 1,
        camera: { offsetX: 0, offsetY: 0, zoom: 0.5 },
        plan,
        images: { resolve: () => null },
        feedback: frame,
      });
    draw(null);
    const plain = calls.length;
    calls.length = 0;
    draw(feedback);
    expect(asked.turnState).toEqual(new Set(view.units.map((unit) => unit.id)));
    expect(asked.marker).toEqual(new Set(view.units.map((unit) => unit.id)));
    expect(asked.cityMeter).toEqual(
      new Set(view.cities.map((city) => city.id)),
    );
    // Every unit shows a marker here (over the chevron), so more is drawn
    // than without the feedback frame.
    expect(calls.length).toBeGreaterThan(plain);
    expect(calls).toContain("arc");
  });
});
