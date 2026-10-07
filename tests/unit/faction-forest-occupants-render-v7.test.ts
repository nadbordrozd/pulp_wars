import { describe, expect, it } from "vitest";
import { FOREST_SHAPE_IDS_V7 } from "../../src/render/canvas/chibi-forest-packing-v7";
import {
  FACTION_FOREST_IDS_V7,
  FACTION_FOREST_STRIDE_V7,
  factionForestCellsOfV7,
  type FactionForestIdV7,
} from "../../src/render/canvas/faction-forests-v7";
import { factionGrassCellsV7 } from "../../src/render/canvas/faction-grass-v7";
import {
  CELL,
  paintBoard,
  paintsOn,
  terrainArt,
  terrainBoard,
  type Paint,
  type TerrainEntry,
} from "../fixtures/v7-terrain-board";

/**
 * pulp_wars-2yc.28: "forests don't always switch skin straight away when a
 * new faction takes over. I think it happens when something is standing on
 * the forest like an animal." A Forest cell with a Treasure, a curiosity,
 * a Grave, a Field Defense or a building is a clearing, and a clearing
 * drew the default clump whoever owned it. Now the trees of every Forest
 * cell follow the territory, in the frame the territory changes, whatever
 * stands on the cell.
 */

const WOOD = ["ggggg", "gFFFg", "gFFFg", "gFFFg", "ggggg"];

/** What stands on each Forest cell of WOOD, by "x,y". */
const OCCUPANTS: Readonly<Record<string, Partial<TerrainEntry> | null>> = {
  "1,1": null,
  "2,1": { kind: "RESOURCE", artSubject: "RESOURCE:GAME" },
  "3,1": { kind: "UNIT", artSubject: "UNIT:FIGHTER" },
  "1,2": { kind: "TREASURE", artSubject: "TREASURE" },
  "2,2": { kind: "CURIOSITY" },
  "3,2": { kind: "GRAVE", artSubject: "GRAVE" },
  "1,3": { kind: "FIELD_DEFENSE" },
  "2,3": { kind: "IMPROVEMENT", artSubject: "IMPROVEMENT:MONUMENT" },
  "3,3": { kind: "SITE", artSubject: "SITE:VILLAGE" },
};

function wood(faction: FactionForestIdV7 | undefined): TerrainEntry[] {
  return terrainBoard(WOOD, faction).flatMap((entry) => {
    const at = `${entry.at.x},${entry.at.y}`;
    const occupant = OCCUPANTS[at];
    return occupant === undefined || occupant === null
      ? [entry]
      : [
          entry,
          {
            key: `occupant:${at}`,
            layer: 4,
            at: entry.at,
            ...occupant,
          } as TerrainEntry,
        ];
  });
}

const setOf = (faction: FactionForestIdV7 | undefined): number =>
  faction === undefined ? 0 : FACTION_FOREST_IDS_V7.indexOf(faction) + 1;

describe("a wood changing hands under what stands on it", () => {
  const art = terrainArt();
  const forest = art.forest.resolve();
  const grass = art.grass.resolve();
  if (forest === null || grass === null) throw new Error("no art");

  /** The tree rasters a faction's cell may draw: pieces, bands, clumps. */
  const treesOf = (
    entries: readonly TerrainEntry[],
    at: string,
  ): Set<unknown> => {
    const cells = factionForestCellsOfV7(entries, forest, true);
    const cell = cells?.get(at);
    if (cell === undefined) throw new Error(`no forest cell ${at}`);
    const images = new Set<unknown>();
    for (const piece of [...(cells?.values() ?? [])].flatMap(
      (other) => other.bodies,
    ))
      for (const part of forest.body(piece.shape, piece.variant))
        images.add(part.image);
    for (const band of cell.bands)
      images.add(
        forest.band(
          band.piece.shape,
          band.piece.variant,
          band.column,
          band.row,
        ),
      );
    return images;
  };

  /** The footprint rasters of every piece of every set. */
  const pieces = new Set<unknown>();
  for (let set = 0; set <= FACTION_FOREST_IDS_V7.length; set += 1)
    for (const shape of FOREST_SHAPE_IDS_V7)
      for (let variant = 0; variant < 3; variant += 1)
        for (const part of forest.body(
          shape,
          set * FACTION_FOREST_STRIDE_V7 + variant,
        ))
          pieces.add(part.image);

  /** The trees painted on a cell: piece footprints and the default clump. */
  const trees = (paints: readonly Paint[], x: number, y: number): Paint[] =>
    paints.filter(
      (paint) =>
        (pieces.has(paint.image) || paint.image.of === "clump") &&
        paintsOn(paint, x, y),
    );

  for (const [from, to] of [
    ["GOBLIN", "CANDY"],
    [undefined, "UNDEAD"],
    ["MARTIAN", undefined],
    ["DWARF", "DINOSAUR"],
  ] as const)
    it(`wears the new owner's trees and grass on every cell at once: ${from ?? "no one"} to ${to ?? "no one"}`, () => {
      const before = wood(from);
      const after = wood(to);
      // Frame 1: the old owner. Frame 2, the very next draw: the new one.
      const first = paintBoard(before, { art });
      const second = paintBoard(after, { art });
      const cells = factionForestCellsOfV7(after, forest, true);
      const grassCells = factionGrassCellsV7(after);
      for (const at of Object.keys(OCCUPANTS)) {
        const [x = 0, y = 0] = at.split(",").map(Number);
        const what = OCCUPANTS[at]?.kind ?? "nothing";
        // The cell is packed in the new owner's set: no clearing keeps
        // the default clump.
        const cell = cells?.get(at);
        expect(cell, `${what} at ${at}`).toBeDefined();
        if (to !== undefined) expect(cell?.clearing, what).toBe(false);
        for (const piece of cell?.bodies ?? [])
          expect(
            Math.floor(piece.variant / FACTION_FOREST_STRIDE_V7),
            what,
          ).toBe(setOf(to));
        for (const band of cell?.bands ?? [])
          expect(
            Math.floor(band.piece.variant / FACTION_FOREST_STRIDE_V7),
            what,
          ).toBe(setOf(to));
        // What is painted on it: trees of the new set only.
        const now = trees(second, x, y);
        expect(now.length, `${what}: trees drawn`).toBeGreaterThan(0);
        const allowed = treesOf(after, at);
        const old = treesOf(before, at);
        for (const paint of now) {
          if (to !== undefined || paint.image.of !== "clump")
            expect(allowed.has(paint.image), `${what} at ${at}`).toBe(true);
          if (from !== to && (from !== undefined || to !== undefined))
            expect(
              old.has(paint.image) && !allowed.has(paint.image),
              `${what} at ${at}: an old tree`,
            ).toBe(false);
        }
        if (to !== undefined)
          // No default clump: the single clump of the Forest master.
          expect(now.some((paint) => paint.image.of === "clump")).toBe(false);
        // And the old owner's trees were there the frame before.
        const then = trees(first, x, y);
        expect(then.length).toBeGreaterThan(0);
        if (from !== undefined)
          expect(then.some((paint) => paint.image.of === "clump")).toBe(false);
        // The ground under them: the new owner's grass tile.
        const own = grassCells.get(at)?.own ?? null;
        const tile =
          own === null
            ? null
            : grass.tile(own, grassCells.get(at)?.variant ?? 0);
        const drawnGrass = second.filter(
          (paint) =>
            paint.image.of === "grass" &&
            paint.to.x === x * CELL &&
            paint.to.y === y * CELL,
        );
        if (tile !== null)
          expect(
            drawnGrass.some((paint) => paint.image === (tile as unknown)),
            `${what} at ${at}: the faction's grass`,
          ).toBe(true);
        // And the old owner's tile is gone from it.
        const oldCells = factionGrassCellsV7(before);
        const oldOwn = oldCells.get(at)?.own ?? null;
        const oldTile =
          oldOwn === null
            ? null
            : grass.tile(oldOwn, oldCells.get(at)?.variant ?? 0);
        if (oldTile !== null) {
          expect(
            first.some(
              (paint) =>
                paint.image === (oldTile as unknown) &&
                paint.to.x === x * CELL &&
                paint.to.y === y * CELL,
            ),
          ).toBe(true);
          expect(
            drawnGrass.some((paint) => paint.image === (oldTile as unknown)),
            `${what} at ${at}: the old grass`,
          ).toBe(false);
        }
      }
    });

  it("gives a clearing one single piece of the faction's set, with no seam clump and no glade", () => {
    const entries = wood("CANDY");
    const cells = factionForestCellsOfV7(entries, forest, true);
    for (const at of ["1,2", "2,2", "3,2", "1,3", "2,3", "3,3"]) {
      const cell = cells?.get(at);
      expect(cell?.bodies).toHaveLength(1);
      expect(cell?.bodies[0]?.shape).toBe("1x1");
      expect(cell?.bands).toHaveLength(1);
      expect(cell?.bands[0]?.piece).toBe(cell?.bodies[0]);
      expect(cell?.eastSeam).toBeNull();
      expect(cell?.northSeam).toBeNull();
      expect(cell?.glade).toBe(false);
    }
    // Game opens a glade and a unit changes nothing: packed cells.
    expect(cells?.get("2,1")?.glade).toBe(true);
    // The same piece for the same cell, every time.
    expect(factionForestCellsOfV7(wood("CANDY"), forest, true)).toEqual(cells);
  });

  it("keeps the default clump on a clearing of the default Forest", () => {
    const cells = factionForestCellsOfV7(wood(undefined), forest, true);
    for (const at of ["1,2", "2,2", "3,2", "1,3", "2,3", "3,3"])
      expect(cells?.get(at)?.clearing).toBe(true);
    const paints = paintBoard(wood(undefined), { art });
    expect(
      paints.some(
        (paint) => paint.image.of === "clump" && paintsOn(paint, 1, 2),
      ),
    ).toBe(true);
  });
});
