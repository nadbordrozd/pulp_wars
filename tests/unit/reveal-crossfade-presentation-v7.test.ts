import { describe, expect, it } from "vitest";
import type { PlayerViewV7 } from "../../src/engine/index";
import {
  visibilityCrossfadeFromV7,
  type CorePresentationStepV7,
} from "../../src/render/canvas/presentation-plan-v7";

/**
 * Bead pulp_wars-es7b: the view a reveal's crossfade fades from keeps the
 * view before for what the boundary reveals or hides, and shows every unit
 * that has already walked as the view after has it.
 */

type UnitView = PlayerViewV7["units"][number];

function unit(id: number, x: number, y: number): UnitView {
  return { id, at: { x, y } } as unknown as UnitView;
}

function view(units: readonly UnitView[]): PlayerViewV7 {
  return { units } as unknown as PlayerViewV7;
}

const walk = (unitId: number): CorePresentationStepV7 =>
  ({
    kind: "MOVE",
    unitId,
    path: [{ x: 0, y: 0 }],
    durationMs: 200,
  }) as unknown as CorePresentationStepV7;
const fade: CorePresentationStepV7 = {
  kind: "VISIBILITY_CROSSFADE",
  durationMs: 180,
};

describe("visibilityCrossfadeFromV7", () => {
  it("is the view before when no unit has walked yet", () => {
    const before = view([unit(1, 0, 0)]);
    const after = view([unit(1, 0, 1), unit(2, 3, 3)]);
    expect(visibilityCrossfadeFromV7([fade], 0, before, after)).toBe(before);
  });

  it("puts a walker at its end, keeps the revealed unit out and the rest as before", () => {
    const before = view([unit(1, 0, 0), unit(3, 5, 5), unit(4, 6, 6)]);
    const after = view([unit(1, 0, 1), unit(2, 3, 3), unit(3, 5, 5)]);
    const from = visibilityCrossfadeFromV7([walk(1), fade], 1, before, after);
    expect(from.units.map((shown) => [shown.id, shown.at])).toEqual([
      [1, { x: 0, y: 1 }],
      [3, { x: 5, y: 5 }],
      // Concealed by the boundary, it still fades out.
      [4, { x: 6, y: 6 }],
    ]);
  });

  it("drops a walker that left sight and adds one that walked into it", () => {
    const before = view([unit(1, 0, 0)]);
    const after = view([unit(2, 4, 4)]);
    const from = visibilityCrossfadeFromV7(
      [walk(1), walk(2), fade],
      2,
      before,
      after,
    );
    expect(from.units.map((shown) => shown.id)).toEqual([2]);
  });

  it("ignores walks that come after the crossfade", () => {
    const before = view([unit(1, 0, 0)]);
    const after = view([unit(1, 0, 1)]);
    expect(visibilityCrossfadeFromV7([fade, walk(1)], 0, before, after)).toBe(
      before,
    );
  });
});
