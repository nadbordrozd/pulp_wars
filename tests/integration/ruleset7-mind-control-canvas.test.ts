// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  CanvasBoardHostV7,
  type BoardHostModelV7,
} from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import {
  MARTIAN_UI_V7,
  martianUiFieldV7,
  martianUiFixtureV7,
} from "../fixtures/v7-martian-ui";

/**
 * The Mind Control revision (bead pulp_wars-b5f.3) on the real board host:
 * the cursor says a controlled unit's own name and who controls it, and
 * the halo's pulse clock and calm redraw run only while a controlled unit
 * is visible in full motion.
 */
const AT = MARTIAN_UI_V7;

afterEach(() => vi.restoreAllMocks());

function rig(
  state: GameStateV7,
  motion: BoardHostModelV7["motion"],
  offered = true,
) {
  let now = 1_000;
  const pulses: (number | undefined)[] = [];
  const timers: number[] = [];
  vi.spyOn(window.performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  vi.spyOn(window, "setTimeout").mockImplementation(((
    _callback: () => void,
    delay?: number,
  ) => {
    timers.push(delay ?? 0);
    return timers.length;
  }) as unknown as typeof window.setTimeout);
  const context = new Proxy(
    {},
    {
      get: (target, key) =>
        key in target ? Reflect.get(target, key) : () => undefined,
      set: (target, key, value) => Reflect.set(target, key, value),
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as CanvasRenderingContext2D,
  );
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input) => {
    pulses.push(input.controlPulseTimeMs);
  });
  const container = document.createElement("div");
  document.body.replaceChildren(container);
  vi.spyOn(container, "getBoundingClientRect").mockReturnValue({
    width: 800,
    height: 600,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    toJSON: () => ({}),
  });
  const view: PlayerViewV7 = viewForV7(state, state.humanPlayerId);
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  host.update({
    matchInstanceId: 1,
    view,
    // Without offered commands no unit is ready, so no ready-cue frames.
    offeredCommands: offered ? queryPlayerCommandsV7(view) : [],
    interactive: true,
    motion,
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  });
  return {
    host,
    pulses,
    timers,
    advance: (milliseconds: number) => {
      now += milliseconds;
    },
    description: (): string =>
      document.querySelector('[id^="ruleset7-map-cursor-"]')?.textContent ?? "",
  };
}

describe("Mind Control on the board host", () => {
  it("names a controlled unit by its own kind and says who controls it", () => {
    for (const [enemy, name] of [
      ["ICE_FOLK", "Ice Folk Yeti"],
      ["DWARF", "Dwarf Hammerer"],
      ["GOBLIN", "Goblin Goblin"],
      ["ORIGINAL", "Fighter"],
    ] as const) {
      const board = rig(martianUiFixtureV7(enemy), "REDUCED");
      board.host.activate(AT.controlled);
      expect(board.description(), enemy).toContain(`${name}, 4 of `);
      expect(board.description(), enemy).toContain(
        "Mind-controlled by your Brain",
      );
      board.host.activate(AT.controller);
      expect(board.description(), enemy).toContain("Martian Brain, ");
      expect(board.description(), enemy).not.toContain("Mind-controlled");
      board.host.destroy();
    }
  });

  it("pulses the halo only in full motion, with a calm redraw while one is visible", () => {
    const full = rig(martianUiFixtureV7(), "FULL", false);
    expect(full.pulses.at(-1)).toBe(1_000);
    expect(full.timers).toContain(66);
    full.host.destroy();
    const reduced = rig(martianUiFixtureV7(), "REDUCED", false);
    expect(reduced.pulses.at(-1)).toBe(0);
    expect(reduced.timers).not.toContain(66);
    reduced.host.destroy();
    // No controlled unit (and no Blizzard): no ambient redraw.
    const free = rig(
      martianUiFieldV7([
        { seat: 0, role: "CAPTAIN", at: AT.controller },
        { seat: 1, role: "FIGHTER", at: AT.controlled, hp: 4 },
      ]),
      "FULL",
      false,
    );
    expect(free.timers).not.toContain(66);
    free.host.destroy();
  });
});
