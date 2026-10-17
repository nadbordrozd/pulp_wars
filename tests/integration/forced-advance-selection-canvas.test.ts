// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCommandV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
} from "../../src/engine/index";
import { CanvasBoardHostV7 } from "../../src/render/canvas/board-host-v7";
import * as renderer from "../../src/render/canvas/board-renderer-v7";
import { martianUiFieldV7 } from "../fixtures/v7-martian-ui";

/**
 * Bead pulp_wars-2yc.84 (docs/ui/UI_REVIEW_2026_10.md "Possible bugs" 2):
 * after a kill with a forced advance, the selected Knight's box goes with
 * the Knight as it walks onto the victim's tile, instead of waiting there
 * before the Knight arrives. Hand-built arena, the human seat only.
 */
const KNIGHT: CoordV7 = { x: 3, y: 3 };
const VICTIM: CoordV7 = { x: 3, y: 2 };

afterEach(() => vi.restoreAllMocks());

function killWithAdvance() {
  const state = martianUiFieldV7(
    [
      { seat: 0, role: "KNIGHT", at: KNIGHT },
      { seat: 1, role: "FIGHTER", at: VICTIM, hp: 1 },
    ],
    { factions: ["ORIGINAL", "UNDEAD"], techs: { 0: [], 1: [] } },
  );
  const before = viewForV7(state, state.humanPlayerId);
  const knight = before.units.find(
    (unit) => unit.at.x === KNIGHT.x && unit.at.y === KNIGHT.y,
  );
  if (knight === undefined) throw new Error("fixture");
  const attack = queryPlayerCommandsV7(before).find(
    (command) => command.kind === "ATTACK" && command.unitId === knight.id,
  );
  if (attack === undefined) throw new Error("no attack offered");
  const applied = applyCommandV7(state, state.humanPlayerId, attack);
  if (!applied.accepted) throw new Error("attack rejected");
  const after = viewForV7(applied.state, state.humanPlayerId);
  const events = projectEventsV7(
    state,
    applied.state,
    state.humanPlayerId,
    applied.events,
  );
  return { before, after, events, knightId: knight.id };
}

function rig(unitId: number, view: ReturnType<typeof viewForV7>) {
  let now = 0;
  let nextFrame = 1;
  let plan: renderer.BoardRenderPlanV7 = {
    version: 7,
    entries: [],
    targets: [],
  };
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(window.performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
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
    plan = input.plan;
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
  const host = new CanvasBoardHostV7(document);
  host.mount(container, { onSelection: vi.fn(), onCommand: vi.fn() });
  host.update({
    matchInstanceId: 1,
    view,
    offeredCommands: [],
    interactive: false,
    motion: "FULL",
    animationSpeed: "NORMAL",
    presentationPaused: false,
    highContrast: false,
    interaction: {
      selection: { kind: "UNIT", unitId },
      selectedUnitId: unitId,
      selectedAchievement: null,
    },
  });
  const frame = async (milliseconds: number) => {
    now += milliseconds;
    const pending = [...frames.values()];
    frames.clear();
    for (const callback of pending) callback(now);
    for (let index = 0; index < 6; index++) await Promise.resolve();
  };
  return {
    host,
    frame,
    pending: () => frames.size,
    /** Where the box and the Knight are drawn this frame. */
    drawn: () => ({
      box: plan.entries.find((entry) => entry.kind === "SELECTION")?.at,
      unit: plan.entries.find((entry) => entry.key === `unit:${unitId}`)?.at,
    }),
  };
}

describe("the selection box during a forced advance", () => {
  it("goes with the Knight onto the victim's tile, never ahead of it", async () => {
    const boundary = killWithAdvance();
    expect(boundary.events.events.map((event) => event.kind)).toEqual(
      expect.arrayContaining(["UNIT_DIED", "UNIT_MOVED"]),
    );
    const test = rig(boundary.knightId, boundary.after);
    const done = test.host.presentBoundary(
      boundary.before,
      boundary.after,
      boundary.events,
    );
    const seen: { box: CoordV7; unit: CoordV7 }[] = [];
    for (let step = 0; step < 200; step += 1) {
      await test.frame(16);
      const { box, unit } = test.drawn();
      if (box !== undefined && unit !== undefined) seen.push({ box, unit });
    }
    for (let index = 0; index < 40 && test.pending() > 0; index++)
      await test.frame(1000);
    await done;
    // The Knight was drawn past its lunge (the advance played) ...
    const between = seen.filter(
      ({ unit }) => unit.y > VICTIM.y + 0.05 && unit.y < KNIGHT.y - 0.3,
    );
    expect(between.length).toBeGreaterThan(0);
    // ... and the box was never more than the lunge away from it.
    for (const { box, unit } of seen) {
      expect(Math.abs(box.x - unit.x)).toBeLessThanOrEqual(0.25);
      expect(Math.abs(box.y - unit.y)).toBeLessThanOrEqual(0.25);
    }
    // While it walked the box was where the Knight was drawn.
    for (const { box, unit } of between) expect(box).toEqual(unit);
    // Settled: both on the victim's tile.
    expect(test.drawn()).toEqual({ box: VICTIM, unit: VICTIM });
    test.host.destroy();
  });
});
