import { describe, expect, it } from "vitest";
import { viewForV7, type PlayerViewV7 } from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  selectsFogV7,
  type BoardSelectionV7,
} from "../../src/render/canvas/board-renderer-v7";
import { FOG_PALETTES_V7 } from "../../src/render/canvas/fog-of-war-v7";
import {
  FOG_PUFF_RASTER_V7,
  FOG_PUFF_V7,
  createFogPuffClockV7,
  fogPuffAtV7,
  fogPuffColoursV7,
  fogPuffDurationMsV7,
  fogPuffEnabledV7,
  fogPuffPixelsV7,
  fogPuffWispsV7,
} from "../../src/render/canvas/fog-puff-v7";
import { initialV7 } from "../fixtures/v7-builders";

/**
 * Bead pulp_wars-2yc.77: a tap on an unexplored tile draws no selection
 * box (nor the map cursor resting there); the fog puff plays instead.
 */

function fogAndGround(): {
  view: PlayerViewV7;
  fog: { x: number; y: number };
  ground: { x: number; y: number };
} {
  const state = initialV7(71);
  const view = viewForV7(state, state.humanPlayerId);
  const occupied = (at: { x: number; y: number }) =>
    view.units.some((unit) => unit.at.x === at.x && unit.at.y === at.y) ||
    view.cities.some((city) => city.at.x === at.x && city.at.y === at.y);
  const fog = view.board.tiles.find((tile) => !tile.explored)?.at;
  const ground = view.board.tiles.find(
    (tile) => tile.explored && !occupied(tile.at),
  )?.at;
  if (fog === undefined || ground === undefined)
    throw new Error("fixture needs fog and explored ground");
  return { view, fog, ground };
}

function kindsAt(
  view: PlayerViewV7,
  selection: BoardSelectionV7,
  cursor: { x: number; y: number } | null,
): string[] {
  return buildBoardRenderPlanV7(view, [], {
    selection,
    selectedUnitId: null,
    selectedAchievement: null,
    cursor,
  })
    .entries.filter(
      (entry) => entry.kind === "SELECTION" || entry.kind === "CURSOR",
    )
    .map((entry) => `${entry.kind}:${entry.at.x},${entry.at.y}`);
}

describe("Fog puff: no box on the fog", () => {
  it("draws no selection box and no resting cursor on a selected fog tile", () => {
    const { view, fog } = fogAndGround();
    const selection = { kind: "TILE", at: fog } as const;
    expect(selectsFogV7(view, selection)).toBe(true);
    expect(kindsAt(view, selection, fog)).toEqual([]);
  });

  it("keeps the cursor once it moves off the tapped fog tile", () => {
    const { view, fog, ground } = fogAndGround();
    expect(kindsAt(view, { kind: "TILE", at: fog }, ground)).toEqual([
      `CURSOR:${ground.x},${ground.y}`,
    ]);
  });

  it("keeps the box and the cursor on an explored tile", () => {
    const { view, ground } = fogAndGround();
    const selection = { kind: "TILE", at: ground } as const;
    expect(selectsFogV7(view, selection)).toBe(false);
    expect(kindsAt(view, selection, ground).sort()).toEqual([
      `CURSOR:${ground.x},${ground.y}`,
      `SELECTION:${ground.x},${ground.y}`,
    ]);
  });

  it("treats a unit, a city or no selection as no fog tap", () => {
    const { view } = fogAndGround();
    const unit = view.units[0];
    const city = view.cities[0];
    if (unit === undefined || city === undefined) throw new Error("fixture");
    expect(selectsFogV7(view, null)).toBe(false);
    expect(selectsFogV7(view, { kind: "UNIT", unitId: unit.id })).toBe(false);
    expect(selectsFogV7(view, { kind: "CITY", cityId: city.id })).toBe(false);
    expect(selectsFogV7(view, { kind: "TILE", at: { x: -1, y: 0 } })).toBe(
      false,
    );
  });
});

describe("Fog puff: the animation", () => {
  const at = { x: 4, y: 5 };

  it("is empty before and after, and stirs in between", () => {
    expect(fogPuffWispsV7(at, 0)).toEqual([]);
    expect(fogPuffWispsV7(at, 1)).toEqual([]);
    for (const progress of [0.05, 0.2, 0.5, 0.8, 0.95])
      expect(fogPuffWispsV7(at, progress).length).toBeGreaterThan(0);
    // The same for the same cell, time and tap.
    expect(fogPuffWispsV7(at, 0.4, 2)).toEqual(fogPuffWispsV7(at, 0.4, 2));
  });

  it("swells, rises and fades", () => {
    const top = (progress: number) =>
      Math.min(
        ...fogPuffWispsV7(at, progress).flatMap((wisp) =>
          wisp.lobes.map((lobe) => lobe.y - lobe.r),
        ),
      );
    expect(top(0.6)).toBeLessThan(top(0.1));
    const alpha = (progress: number) =>
      Math.max(...fogPuffWispsV7(at, progress).map((wisp) => wisp.alpha));
    expect(alpha(0.3)).toBe(1);
    expect(alpha(0.95)).toBeLessThan(0.2);
  });

  it("stays inside its raster", () => {
    for (let step = 1; step < 40; step += 1)
      for (const wisp of fogPuffWispsV7(at, step / 40, step))
        for (const lobe of wisp.lobes) {
          expect(lobe.x - lobe.r).toBeGreaterThan(-FOG_PUFF_RASTER_V7.x);
          expect(lobe.y - lobe.r).toBeGreaterThan(-FOG_PUFF_RASTER_V7.y);
          expect(lobe.x + lobe.r).toBeLessThan(
            FOG_PUFF_RASTER_V7.width - FOG_PUFF_RASTER_V7.x,
          );
          expect(lobe.y + lobe.r).toBeLessThan(
            FOG_PUFF_RASTER_V7.height - FOG_PUFF_RASTER_V7.y,
          );
        }
  });

  it("paints the cloud's colours, lit from the bottom left, and nothing else", () => {
    const colours = fogPuffColoursV7("dusk");
    const pixels = fogPuffPixelsV7(fogPuffWispsV7(at, 0.25), colours);
    const seen = new Set<string>();
    let opaque = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index + 3] === 0) continue;
      if (pixels[index + 3] === 255) opaque += 1;
      seen.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
    }
    expect(opaque).toBeGreaterThan(500);
    const allowed = new Set(
      [colours.body, colours.lit, colours.shade, colours.cast].map((rgb) =>
        rgb.join(","),
      ),
    );
    for (const colour of seen) expect(allowed.has(colour)).toBe(true);
    expect(seen.has(colours.lit.join(","))).toBe(true);
    expect(colours.shade).toEqual(FOG_PALETTES_V7.dusk.puff);
    // Nothing at all once it is over.
    expect(fogPuffPixelsV7(fogPuffWispsV7(at, 1), colours).some(Boolean)).toBe(
      false,
    );
  });

  it("lasts 0.8 s (0.6 s fast) and starts again on a new tap", () => {
    expect(fogPuffDurationMsV7("NORMAL")).toBe(800);
    expect(fogPuffDurationMsV7("FAST")).toBe(600);
    const clock = createFogPuffClockV7();
    expect(clock.frame(0, 800, false)).toBeNull();
    clock.start(at, 1000);
    expect(clock.frame(1400, 800, false)?.progress).toBeCloseTo(0.5, 5);
    expect(clock.active(1400, 800, false)).toBe(true);
    clock.start({ x: 2, y: 2 }, 1500);
    const restarted = clock.frame(1580, 800, false);
    expect(restarted?.at).toEqual({ x: 2, y: 2 });
    expect(restarted?.progress).toBeCloseTo(0.1, 5);
    expect(clock.frame(2300, 800, false)).toBeNull();
    expect(clock.active(2300, 800, false)).toBe(false);
    clock.start(at, 3000);
    clock.reset();
    expect(clock.frame(3100, 800, false)).toBeNull();
  });

  it("holds one still, fainter frame with reduced motion", () => {
    const first = fogPuffAtV7(at, 0, 800, true);
    const later = fogPuffAtV7(at, FOG_PUFF_V7.reducedHoldMs - 1, 800, true);
    expect(first).toEqual(later);
    expect(first?.alphaScale).toBe(FOG_PUFF_V7.reducedAlpha);
    expect(fogPuffAtV7(at, FOG_PUFF_V7.reducedHoldMs, 800, true)).toBeNull();
  });

  it("can be switched off with ?fog-puff=0", () => {
    expect(fogPuffEnabledV7("")).toBe(true);
    expect(fogPuffEnabledV7("?fog-puff=0")).toBe(false);
    expect(fogPuffEnabledV7("?fog-puff=off")).toBe(false);
    expect(fogPuffEnabledV7("?fog-puff=1")).toBe(true);
  });
});
