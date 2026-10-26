import { describe, expect, it, vi } from "vitest";
import {
  drawBoardV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import {
  compareBoardPlanEntriesV7,
  movingUnitSlotV7,
  placeMovedUnitsV7,
} from "../../src/render/canvas/moving-unit-order-v7";
import { readyBoardArtV7 } from "../fixtures/v7-board-art";

/**
 * Bead pulp_wars-2yc.116: a unit drawn off its plan cell takes the draw
 * slot of the last cell it overlaps, so the Ore and Mountain of the cells
 * it slides over are drawn under it; the trees of the row in front still
 * cover its feet, and a lunging unit stays behind the defender.
 */

const terrain = (
  x: number,
  y: number,
  subject: "TERRAIN:GRASS" | "TERRAIN:MOUNTAIN" | "TERRAIN:FOREST",
): BoardRenderPlanEntryV7 => ({
  key: `terrain:${x},${y}`,
  kind: "TERRAIN",
  layer: 1,
  at: { x, y },
  assetId: `v7-${subject.toLowerCase().replace(":", "-")}-1`,
  artSubject: subject,
});

const ore = (x: number, y: number): BoardRenderPlanEntryV7 => ({
  key: `resource:${x},${y}`,
  kind: "RESOURCE",
  layer: 3,
  at: { x, y },
  assetId: "v7-resource-ore",
  artSubject: "RESOURCE:ORE",
});

const unit = (id: number, x: number, y: number): BoardRenderPlanEntryV7 => ({
  key: `unit:${id}`,
  kind: "UNIT",
  layer: 5,
  at: { x, y },
  assetId: "unit-original-fighter",
  artSubject: "UNIT:FIGHTER",
});

/** The ids of the images `drawBoardV7` draws for `entries`, in order. */
function drawnImages(entries: readonly BoardRenderPlanEntryV7[]): string[] {
  const drawn: string[] = [];
  const context = new Proxy(
    {},
    {
      get: (_target, key) => {
        if (key === "drawImage")
          return (image: { readonly id?: string }) => {
            if (image?.id !== undefined) drawn.push(image.id);
          };
        if (key === "measureText")
          return (text: string) => ({ width: text.length * 6 });
        if (key === "getTransform") return () => ({ a: 1, b: 0, c: 0, d: 1 });
        return vi.fn();
      },
    },
  ) as unknown as CanvasRenderingContext2D;
  drawBoardV7({
    context,
    viewport: { width: 400, height: 400 },
    devicePixelRatio: 1,
    camera: { offsetX: 100, offsetY: 60, zoom: 1 },
    plan: { version: 7, entries, targets: [] },
    chibiArt: readyBoardArtV7(),
  });
  return drawn;
}

/** A unit sliding down from (0, 0) onto an Ore Mountain at (0, 1). */
function slideOntoOre(progress: number) {
  const sorted = [
    terrain(0, 0, "TERRAIN:GRASS"),
    unit(1, 0, 0),
    terrain(0, 1, "TERRAIN:MOUNTAIN"),
    ore(0, 1),
    terrain(0, 2, "TERRAIN:FOREST"),
  ].sort(compareBoardPlanEntriesV7);
  // The host's frame: the unit's entry drawn at its slide's position.
  return sorted.map((entry) =>
    entry.key === "unit:1" ? { ...entry, at: { x: 0, y: progress } } : entry,
  );
}

describe("The draw slot of a unit off its cell", () => {
  it("is the last cell it overlaps", () => {
    expect(movingUnitSlotV7({ x: 3, y: 4 })).toEqual({ x: 3, y: 4 });
    expect(movingUnitSlotV7({ x: 3.2, y: 4 })).toEqual({ x: 4, y: 4 });
    expect(movingUnitSlotV7({ x: 2.6, y: 3.1 })).toEqual({ x: 3, y: 4 });
    // Interpolation error on a cell does not reach the next one.
    expect(movingUnitSlotV7({ x: 3 + 1e-9, y: 4 - 1e-9 })).toEqual({
      x: 3,
      y: 4,
    });
  });

  it("reproduces the glitch in plan order: the Ore of the cell below is drawn over the sliding unit", () => {
    const images = drawnImages(slideOntoOre(0.5));
    const unitAt = images.indexOf("UNIT:FIGHTER");
    expect(unitAt).toBeGreaterThanOrEqual(0);
    expect(images.indexOf("RESOURCE:ORE")).toBeGreaterThan(unitAt);
  });

  it("draws the sliding unit over the Mountain and Ore it overlaps, under the trees of the row in front", () => {
    for (const progress of [0.1, 0.5, 0.9]) {
      const images = drawnImages(
        placeMovedUnitsV7(slideOntoOre(progress), new Set(["unit:1"])),
      );
      const unitAt = images.indexOf("UNIT:FIGHTER");
      // Ground pass, then the foreground: the Mountain's rock over the row
      // behind, its Ore, the unit, then the Forest's tree top over the row
      // behind it, which still covers the unit's feet.
      expect(images).toEqual([
        "TERRAIN:GRASS",
        "TERRAIN:MOUNTAIN",
        "TERRAIN:FOREST",
        "TERRAIN:MOUNTAIN",
        "RESOURCE:ORE",
        "UNIT:FIGHTER",
        "TERRAIN:FOREST",
      ]);
      expect(unitAt).toBe(5);
    }
  });

  it("places a lunging unit after the defender's cell, before the defender", () => {
    const entries = [
      terrain(0, 0, "TERRAIN:GRASS"),
      unit(9, 0, 0.22),
      terrain(1, 0, "TERRAIN:GRASS"),
      terrain(0, 1, "TERRAIN:MOUNTAIN"),
      ore(0, 1),
      unit(2, 0, 1),
      terrain(1, 1, "TERRAIN:GRASS"),
      unit(3, 1, 1),
    ];
    expect(
      placeMovedUnitsV7(entries, new Set(["unit:9"])).map((entry) => entry.key),
    ).toEqual([
      "terrain:0,0",
      "terrain:1,0",
      "terrain:0,1",
      "resource:0,1",
      "unit:9",
      "unit:2",
      "terrain:1,1",
      "unit:3",
    ]);
  });

  it("keeps every other entry's order, the values last, and copies nothing with no moved unit", () => {
    const value: BoardRenderPlanEntryV7 = {
      key: "value:0,0",
      kind: "VALUE",
      layer: 6,
      at: { x: 0, y: 0 },
    };
    const entries = [
      terrain(0, 0, "TERRAIN:GRASS"),
      unit(4, 1, 0),
      unit(5, 0.5, 1.5),
      terrain(1, 0, "TERRAIN:GRASS"),
      terrain(0, 1, "TERRAIN:GRASS"),
      terrain(1, 1, "TERRAIN:GRASS"),
      terrain(0, 2, "TERRAIN:GRASS"),
      terrain(1, 2, "TERRAIN:GRASS"),
      value,
    ];
    expect(placeMovedUnitsV7(entries, new Set())).toBe(entries);
    expect(placeMovedUnitsV7(entries, new Set(["unit:7"]))).toBe(entries);
    expect(
      placeMovedUnitsV7(entries, new Set(["unit:4", "unit:5"])).map(
        (entry) => entry.key,
      ),
    ).toEqual([
      "terrain:0,0",
      "terrain:1,0",
      "unit:4",
      "terrain:0,1",
      "terrain:1,1",
      "terrain:0,2",
      "terrain:1,2",
      "unit:5",
      "value:0,0",
    ]);
  });
});
