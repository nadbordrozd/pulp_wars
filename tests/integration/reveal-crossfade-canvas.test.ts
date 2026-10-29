// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import { corePresentationPlanV7 } from "../../src/render/canvas/presentation-plan-v7";
import {
  COMBAT_JUICE_REVEAL_UI_V7,
  COMBAT_JUICE_REWARD_UI_V7,
  combatJuiceChestFixtureV7,
  combatJuiceRevealFixtureV7,
} from "../fixtures/v7-combat-juice-ui";
import { seatIdV7 } from "../fixtures/v7-goblin-arena";

/**
 * Bead pulp_wars-es7b: a move that also reveals a unit ends with the
 * reveal's crossfade, which faded from the view before the boundary and so
 * drew the walker faintly on its old tile as well as on its new one. On the
 * real board host (hand-built states; no match is played) the crossfade's
 * view before and its view after both draw the walker only at its end,
 * while the revealed unit still fades in.
 */

type DrawInput = Parameters<typeof renderer.drawBoardV7>[0];

let clock = 0;
let frames: FrameRequestCallback[] = [];

beforeEach(() => {
  document.body.innerHTML = "";
  clock = 1000;
  frames = [];
  vi.spyOn(window.performance, "now").mockImplementation(() => clock);
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    value: vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    }),
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface Drawn {
  readonly board: boolean;
  /** Where each unit of the drawn plan stands, by unit id. */
  readonly units: ReadonlyMap<number, CoordV7>;
}

function unitIdAt(state: GameStateV7, cell: CoordV7): number {
  const unit = state.units.find(
    (candidate) => candidate.at.x === cell.x && candidate.at.y === cell.y,
  );
  if (unit === undefined) throw new Error("no unit");
  return unit.id;
}

async function playMove(
  state: GameStateV7,
  seat: 0 | 1,
  from: CoordV7,
  to: CoordV7,
) {
  const moverId = unitIdAt(state, from);
  const result = applyCommandV7(state, seatIdV7(state, seat), {
    kind: "MOVE",
    unitId: moverId as never,
    path: [to],
  });
  if (!result.accepted) throw new Error(result.error.code);
  const viewer = state.humanPlayerId;
  const before = viewForV7(state, viewer);
  const after = viewForV7(result.state, viewer);
  const envelope = projectEventsV7(state, result.state, viewer, result.events);
  const kinds = corePresentationPlanV7(before, envelope, after).map(
    (step) => step.kind,
  );
  expect(kinds).toEqual(["MOVE", "VISIBILITY_CROSSFADE"]);
  const revealedIds = after.units
    .filter((unit) => !before.units.some((other) => other.id === unit.id))
    .map((unit) => unit.id);
  expect(revealedIds.length).toBeGreaterThan(0);

  let boardCanvas: HTMLCanvasElement | null = null;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      const target: Record<PropertyKey, unknown> = {
        canvas: this,
        globalAlpha: 1,
        drawImage: vi.fn(),
      };
      return new Proxy(target, {
        get: (object, key) => (key in object ? object[key] : vi.fn()),
        set: (object, key, value) => {
          object[key] = value;
          return true;
        },
      }) as unknown as CanvasRenderingContext2D;
    } as unknown as typeof HTMLCanvasElement.prototype.getContext,
  );
  const draws: Drawn[] = [];
  vi.spyOn(renderer, "drawBoardV7").mockImplementation((input: DrawInput) => {
    const units = new Map<number, CoordV7>();
    for (const entry of input.plan.entries)
      if (entry.kind === "UNIT" && entry.key.startsWith("unit:"))
        units.set(Number(entry.key.slice(5)), entry.at);
    draws.push({ board: input.context.canvas === boardCanvas, units });
  });
  const container = document.createElement("div");
  Object.defineProperty(container, "getBoundingClientRect", {
    value: () => ({
      width: 1024,
      height: 640,
      left: 0,
      top: 0,
      right: 1024,
      bottom: 640,
    }),
  });
  document.body.append(container);
  const host = new CanvasBoardHostV7(document, {
    terrainSkeleton: () => null,
  });
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  boardCanvas = container.querySelector("canvas.board-canvas-v7");
  if (boardCanvas === null) throw new Error("no board");
  host.update({
    matchInstanceId: 1,
    view: after,
    offeredCommands: [],
    interactive: false,
    motion: "FULL",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: null,
      selectedUnitId: null,
      selectedAchievement: null,
    },
  });
  const from0 = draws.length;
  let done = false;
  void host.presentBoundary(before, after, envelope).then(() => {
    done = true;
  });
  for (let count = 0; count < 400 && !done; count += 1) {
    const next = frames;
    frames = [];
    clock += 16;
    for (const callback of next) callback(clock);
    for (let flush = 0; flush < 8; flush += 1) await Promise.resolve();
  }
  expect(done).toBe(true);
  host.destroy();
  // A crossfade frame draws its view before on the board and its view
  // after on a layer of its own, laid over it.
  const played = draws.slice(from0);
  const fades = played.flatMap((drawn, index) => {
    const fadeFrom = played[index - 1];
    return !drawn.board && fadeFrom?.board === true
      ? [{ fadeFrom, fadeTo: drawn }]
      : [];
  });
  return { moverId, revealedIds, fades };
}

describe("The reveal crossfade after a move", () => {
  it("draws the walker only at its end while a plain move reveals a Goblin", async () => {
    const at = COMBAT_JUICE_REVEAL_UI_V7;
    const { moverId, revealedIds, fades } = await playMove(
      combatJuiceRevealFixtureV7(),
      0,
      at.mover,
      at.to,
    );
    expect(fades.length).toBeGreaterThan(0);
    for (const { fadeFrom, fadeTo } of fades) {
      // Never on the tile it walked from, in either view.
      expect(fadeFrom.units.get(moverId)).toEqual(at.to);
      expect(fadeTo.units.get(moverId)).toEqual(at.to);
      // The Goblin still fades in: absent before, there after.
      for (const id of revealedIds) {
        expect(fadeFrom.units.has(id)).toBe(false);
        expect(fadeTo.units.get(id)).toEqual(at.hidden);
      }
    }
  });

  it.each([
    ["the viewer's own", 0],
    ["an enemy's", 1],
  ] as const)(
    "draws %s chest opener only on the chest during the crossfade",
    async (_label, seat) => {
      const at = COMBAT_JUICE_REWARD_UI_V7;
      const { moverId, fades } = await playMove(
        combatJuiceChestFixtureV7(seat),
        seat,
        at.chestMover,
        at.chest,
      );
      expect(fades.length).toBeGreaterThan(0);
      for (const { fadeFrom, fadeTo } of fades) {
        expect(fadeFrom.units.get(moverId)).toEqual(at.chest);
        expect(fadeTo.units.get(moverId)).toEqual(at.chest);
      }
    },
  );
});
