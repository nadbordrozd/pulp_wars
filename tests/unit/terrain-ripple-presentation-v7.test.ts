import { describe, expect, it } from "vitest";
import type { PlayerViewV7 } from "../../src/engine/index";
import {
  TERRAIN_RIPPLE_ENABLED_V7,
  TERRAIN_RIPPLE_V7,
  TILE_HOP_KINDS_V7,
  createTerrainRippleV7,
  terrainOwnershipChangesV7,
  terrainRippleEnabledV7,
  terrainRippleOrderV7,
  terrainRippleStepMsV7,
  tileHopLiftV7,
  tileHopLiftsV7,
  tileHopSwappedV7,
} from "../../src/render/canvas/terrain-ripple-v7";
import { chibiCameraZoom } from "../../src/render/canvas/chibi-geometry-v7";
import {
  CELL,
  paintBoard,
  terrainArt,
  terrainBoard,
} from "../fixtures/v7-terrain-board";

/**
 * pulp_wars-2yc.28 (docs/art/TERRITORY_RIPPLE.md): when territory changes
 * owner, its explored cells hop and take their new look one after another,
 * outward from their city.
 */

interface Entry {
  readonly key: string;
  readonly kind: string;
  readonly at: { readonly x: number; readonly y: number };
  readonly look: string;
}

/**
 * A 5 x 5 view. `owners` rows: a digit is the owner of a cell's territory,
 * "." no one; `hidden` rows mark unexplored cells with "?". City 7 stands
 * at (2, 2) and every owned cell is its land.
 */
function view(
  commandIndex: number,
  owners: readonly string[],
  hidden: readonly string[] = [],
): PlayerViewV7 {
  return {
    commandIndex,
    board: {
      width: 5,
      height: 5,
      tiles: owners.flatMap((row, y) =>
        [...row].map((mark, x) =>
          hidden[y]?.[x] === "?"
            ? { at: { x, y }, explored: false }
            : {
                at: { x, y },
                explored: true,
                territoryOwnerId: mark === "." ? null : Number(mark),
                territoryCityId: mark === "." ? null : 7,
              },
        ),
      ),
    },
    cities: [{ id: 7, at: { x: 2, y: 2 } }],
  } as unknown as PlayerViewV7;
}

/** The plan entries of a view: each cell's terrain, looking like its owner. */
function entriesOf(of: PlayerViewV7): Entry[] {
  return of.board.tiles.flatMap((tile): Entry[] =>
    tile.explored
      ? [
          {
            key: `terrain:${tile.at.x},${tile.at.y}`,
            kind: "TERRAIN",
            at: tile.at,
            look: String(tile.territoryOwnerId),
          },
          ...(tile.at.x === 2 && tile.at.y === 2
            ? [
                {
                  key: "city:7",
                  kind: "CITY",
                  at: tile.at,
                  look: `plate of ${String(tile.territoryOwnerId)}`,
                },
              ]
            : []),
          {
            key: `unit:${tile.at.x},${tile.at.y}`,
            kind: "UNIT",
            at: tile.at,
            look: String(tile.territoryOwnerId),
          },
        ]
      : [],
  );
}

const NONE = [".....", ".....", ".....", ".....", "....."];
const MINE = [".....", ".111.", ".111.", ".111.", "....."];
const THEIRS = [".....", ".222.", ".222.", ".222.", "....."];
const WIDE = ["11111", "11111", "11111", "11111", "11111"];

const ripple = () =>
  createTerrainRippleV7<Entry, { readonly entries: readonly Entry[] }>();
const planOf = (of: PlayerViewV7) => ({ entries: entriesOf(of) });
const looks = (
  plan: { readonly entries: readonly Entry[] },
  kind = "TERRAIN",
): string =>
  plan.entries
    .filter((entry) => entry.kind === kind)
    .map((entry) => entry.look)
    .join("");

const { hopMs, apex, stepMs } = TERRAIN_RIPPLE_V7;
const top = hopMs * apex;

describe("the ripple's switch", () => {
  it("is on by default and the query string overrides it", () => {
    expect(TERRAIN_RIPPLE_ENABLED_V7).toBe(true);
    expect(terrainRippleEnabledV7("")).toBe(true);
    expect(terrainRippleEnabledV7()).toBe(true);
    for (const off of ["0", "off", "false"])
      expect(terrainRippleEnabledV7(`?art=chibi&tile-hop=${off}`)).toBe(false);
    expect(terrainRippleEnabledV7("?tile-hop=1")).toBe(true);
    expect(terrainRippleEnabledV7("?tile-hop=what")).toBe(true);
  });
});

describe("the cells that change", () => {
  it("are the explored cells whose territory has another owner, row by row", () => {
    const groups = terrainOwnershipChangesV7(view(1, NONE), view(2, MINE));
    expect(groups).toHaveLength(1);
    expect(groups[0]?.cells).toHaveLength(9);
    // The user: "make them jump one in rows". The top row left to right,
    // then the next row, down the territory.
    expect(groups[0]?.cells.map((cell) => `${cell.x},${cell.y}`)).toEqual([
      "1,1",
      "2,1",
      "3,1",
      "1,2",
      "2,2",
      "3,2",
      "1,3",
      "2,3",
      "3,3",
    ]);
    // A capture: the same cells, now another owner's.
    expect(
      terrainOwnershipChangesV7(view(1, THEIRS), view(2, MINE))[0]?.cells,
    ).toHaveLength(9);
    // Land lost to no one changes the same way.
    const lost = terrainOwnershipChangesV7(view(1, MINE), view(2, NONE));
    expect(lost[0]?.cells).toHaveLength(9);
    expect(lost[0]?.cells[0]).toEqual({ x: 1, y: 1 });
    // Nothing changed: nothing ripples.
    expect(terrainOwnershipChangesV7(view(1, MINE), view(2, MINE))).toEqual([]);
  });

  it("leave out every cell that is, or was, unexplored", () => {
    const hidden = ["     ", " ??  ", "     ", "     ", "     "];
    const now = terrainOwnershipChangesV7(view(1, NONE), view(2, MINE, hidden));
    expect(now[0]?.cells.map((cell) => `${cell.x},${cell.y}`)).not.toContain(
      "1,1",
    );
    expect(now[0]?.cells).toHaveLength(7);
    // A cell explored only now was not seen to change.
    const before = terrainOwnershipChangesV7(
      view(1, NONE, hidden),
      view(2, MINE),
    );
    expect(before[0]?.cells).toHaveLength(7);
  });

  it("go in reading order whatever the territory's shape, the same every time", () => {
    const cells = Array.from({ length: 25 }, (_, index) => ({
      x: index % 5,
      y: Math.floor(index / 5),
    }));
    const order = terrainRippleOrderV7([...cells].reverse());
    expect(order).toEqual(cells);
    // A ragged territory: each row from its own left end.
    const ragged = [
      { x: 4, y: 2 },
      { x: 0, y: 3 },
      { x: 2, y: 1 },
      { x: 3, y: 2 },
      { x: 9, y: 1 },
    ];
    expect(terrainRippleOrderV7(ragged)).toEqual([
      { x: 2, y: 1 },
      { x: 9, y: 1 },
      { x: 3, y: 2 },
      { x: 4, y: 2 },
      { x: 0, y: 3 },
    ]);
    expect(terrainRippleOrderV7(ragged)).toEqual(terrainRippleOrderV7(ragged));
  });

  it("follow one another by 40 to 60 ms, faster only for a large territory", () => {
    expect(stepMs).toBeGreaterThanOrEqual(40);
    expect(stepMs).toBeLessThanOrEqual(60);
    expect(terrainRippleStepMsV7(1)).toBe(stepMs);
    expect(terrainRippleStepMsV7(9)).toBe(stepMs);
    // A normal city (3 x 3): the last cell starts within half a second
    // and has landed well inside a second.
    expect(8 * terrainRippleStepMsV7(9)).toBeLessThanOrEqual(500);
    expect(8 * terrainRippleStepMsV7(9) + hopMs).toBeLessThanOrEqual(700);
    // A city with a Land Grant (5 x 5): about a second.
    expect(24 * terrainRippleStepMsV7(25) + hopMs).toBeLessThanOrEqual(1150);
    // However many cells change, all of it stays under 1.2 s, and no two
    // cells ever start together.
    for (const count of [17, 40, 100, 400]) {
      const step = terrainRippleStepMsV7(count);
      expect(step).toBeGreaterThanOrEqual(TERRAIN_RIPPLE_V7.stepFloorMs);
      expect((count - 1) * step + hopMs).toBeLessThan(1200);
    }
    expect(terrainRippleStepMsV7(25)).toBeLessThan(stepMs);
    expect(terrainRippleStepMsV7(5000)).toBe(TERRAIN_RIPPLE_V7.stepFloorMs);
  });
});

describe("one hop", () => {
  it("rises fast, eases out to its top, and comes down again", () => {
    expect(tileHopLiftV7(-5)).toBe(0);
    expect(tileHopLiftV7(0)).toBe(0);
    expect(tileHopLiftV7(top)).toBeCloseTo(1);
    expect(tileHopLiftV7(hopMs)).toBe(0);
    expect(tileHopLiftV7(hopMs + 50)).toBe(0);
    // Ease out: more than half the height in the first half of the rise.
    expect(tileHopLiftV7(top / 2)).toBeGreaterThan(0.6);
    let last = 0;
    for (let ms = 1; ms <= top; ms += 4) {
      expect(tileHopLiftV7(ms)).toBeGreaterThanOrEqual(last);
      last = tileHopLiftV7(ms);
    }
    last = 1;
    for (let ms = top; ms <= hopMs; ms += 4) {
      expect(tileHopLiftV7(ms)).toBeLessThanOrEqual(last + 1e-9);
      last = tileHopLiftV7(ms);
    }
  });

  it("takes the new look at the top", () => {
    expect(tileHopSwappedV7(0)).toBe(false);
    expect(tileHopSwappedV7(top - 1)).toBe(false);
    expect(tileHopSwappedV7(top)).toBe(true);
    expect(tileHopSwappedV7(hopMs * 3)).toBe(true);
  });

  it("is a few pixels high, in whole device pixels", () => {
    const camera = { zoom: chibiCameraZoom(1), offsetX: 0, offsetY: 0 };
    const lifts = tileHopLiftsV7(
      [
        { at: { x: 1, y: 2 }, lift: 1 },
        { at: { x: 3, y: 2 }, lift: 0.5 },
        { at: { x: 4, y: 2 }, lift: 0 },
      ],
      camera,
      2,
    );
    expect(lifts.get("1,2")).toBe(7);
    expect(lifts.get("3,2")).toBe(3.5);
    expect(lifts.has("4,2")).toBe(false);
    expect(lifts.get("1,2") ?? 0).toBeGreaterThanOrEqual(3);
    expect(lifts.get("1,2") ?? 0).toBeLessThanOrEqual(8);
  });
});

describe("the ripple", () => {
  it("does nothing until the territory changes", () => {
    const state = ripple();
    const first = view(1, NONE);
    state.observe(first, "match", 0, true, entriesOf);
    expect(state.active(0)).toBe(false);
    const plan = planOf(first);
    expect(state.plan(plan, first, 0)).toBe(plan);
    expect(state.hops(0)).toEqual([]);
    // The same view again, and a later one with the same territory.
    state.observe(first, "match", 10, true, entriesOf);
    state.observe(view(2, NONE), "match", 20, true, entriesOf);
    expect(state.active(20)).toBe(false);
    expect(state.startedAtMs).toBeNull();
  });

  it("changes the cells one by one, each at the top of its hop", () => {
    const state = ripple();
    const before = view(1, THEIRS);
    const after = view(2, MINE);
    state.observe(before, "match", 0, true, entriesOf);
    state.observe(after, "match", 1000, true, entriesOf);
    expect(state.startedAtMs).toBe(1000);
    expect(state.active(1000)).toBe(true);
    const plan = planOf(after);
    // The game's plan already has every cell the new owner's.
    expect(looks(plan)).toBe(looks(planOf(after)));
    const changed = (ms: number): number =>
      [...looks(state.plan(plan, after, 1000 + ms))].filter(
        (look, index) => look !== looks(planOf(before))[index],
      ).length;
    // At the start every changing cell still shows its old look.
    expect(looks(state.plan(plan, after, 1000))).toBe(looks(planOf(before)));
    expect(changed(0)).toBe(0);
    // The first cell of the top row changes at the top of the first hop.
    expect(changed(top - 1)).toBe(0);
    expect(changed(top)).toBe(1);
    // Then one more cell every step.
    for (let index = 1; index < 9; index += 1) {
      expect(changed(top + index * stepMs - 1)).toBe(index);
      expect(changed(top + index * stepMs)).toBe(index + 1);
    }
    // The city on the fifth cell keeps its old entry (its look, and with
    // it its name plate's colour) until that cell's turn, and no longer.
    const city = (ms: number): string =>
      looks(state.plan(plan, after, 1000 + ms), "CITY");
    expect(city(0)).toBe("plate of 2");
    expect(city(top + 4 * stepMs - 1)).toBe("plate of 2");
    expect(city(top + 4 * stepMs)).toBe("plate of 1");
    // Done within a second, and then the plan is the game's own again.
    const end = 8 * stepMs + hopMs;
    expect(end).toBeLessThanOrEqual(1000);
    expect(state.plan(plan, after, 1000 + end)).toBe(plan);
    expect(state.active(1000 + end - 1)).toBe(true);
    expect(state.active(1000 + end)).toBe(false);
    // Only the look of the cell is held back: what stands on it is not.
    expect(looks(state.plan(plan, after, 1000), "UNIT")).toBe(
      looks(plan, "UNIT"),
    );
  });

  it("hops each cell as it changes, a few at a time", () => {
    const state = ripple();
    state.observe(view(1, NONE), "match", 0, true, entriesOf);
    state.observe(view(2, MINE), "match", 0, true, entriesOf);
    expect(state.hops(0)).toEqual([]);
    const first = state.hops(top);
    expect(first).toHaveLength(2);
    // The top row's left cell is at the top of its hop, the next rising.
    expect(first[0]?.at).toEqual({ x: 1, y: 1 });
    expect(first[1]?.at).toEqual({ x: 2, y: 1 });
    expect(first[0]?.lift).toBeCloseTo(1);
    let most = 0;
    const seen = new Set<string>();
    for (let ms = 0; ms <= 8 * stepMs + hopMs; ms += 5) {
      const hops = state.hops(ms);
      most = Math.max(most, hops.length);
      for (const hop of hops) {
        seen.add(`${hop.at.x},${hop.at.y}`);
        expect(hop.lift).toBeGreaterThan(0);
        expect(hop.lift).toBeLessThanOrEqual(1);
      }
    }
    expect(seen.size).toBe(9);
    expect(most).toBeLessThanOrEqual(Math.ceil(hopMs / stepMs));
    expect(state.hops(8 * stepMs + hopMs)).toEqual([]);
  });

  it("keeps the same plan object while the same cells wait", () => {
    const state = ripple();
    const after = view(2, MINE);
    state.observe(view(1, NONE), "match", 0, true, entriesOf);
    state.observe(after, "match", 0, true, entriesOf);
    const plan = planOf(after);
    const early = state.plan(plan, after, 1);
    expect(early).not.toBe(plan);
    expect(state.plan(plan, after, 2)).toBe(early);
    expect(state.plan(plan, after, top - 1)).toBe(early);
    expect(state.plan(plan, after, top)).not.toBe(early);
    // Another plan of the same view (a selection changed) is patched too.
    const other = planOf(after);
    expect(looks(state.plan(other, after, 1))).toBe(looks(early));
  });

  it("changes every cell at once for reduced motion", () => {
    const state = ripple();
    const after = view(2, MINE);
    state.observe(view(1, NONE), "match", 0, false, entriesOf);
    state.observe(after, "match", 0, false, entriesOf);
    expect(state.active(0)).toBe(false);
    const plan = planOf(after);
    expect(state.plan(plan, after, 0)).toBe(plan);
    expect(state.hops(top)).toEqual([]);
    // Motion turned off in the middle of a ripple ends it.
    const moving = ripple();
    moving.observe(view(1, NONE), "match", 0, true, entriesOf);
    moving.observe(after, "match", 0, true, entriesOf);
    expect(moving.active(10)).toBe(true);
    const later = view(3, WIDE);
    moving.observe(later, "match", 10, false, entriesOf);
    expect(moving.active(10)).toBe(false);
    const laterPlan = planOf(later);
    expect(moving.plan(laterPlan, later, 10)).toBe(laterPlan);
  });

  it("takes a second change in the middle of the first", () => {
    const state = ripple();
    const first = view(1, NONE);
    const second = view(2, MINE);
    const third = view(3, WIDE);
    state.observe(first, "match", 0, true, entriesOf);
    state.observe(second, "match", 0, true, entriesOf);
    // Half way: four cells are the new owner's, five still wait.
    const middle = top + 3 * stepMs;
    const secondPlan = planOf(second);
    expect(
      [...looks(state.plan(secondPlan, second, middle))].filter(
        (look) => look === "1",
      ),
    ).toHaveLength(4);
    // The border grows: sixteen more cells change, the nine do not.
    state.observe(third, "match", middle, true, entriesOf);
    const plan = planOf(third);
    const at = (ms: number): string => looks(state.plan(plan, third, ms));
    // No cell jumps back and none jumps ahead: the four stay changed, the
    // five still wait with the look they had, the new sixteen wait too.
    expect([...at(middle)].filter((look) => look === "1")).toHaveLength(4);
    let last = 4;
    for (let ms = middle; ms <= middle + 2000; ms += 7) {
      const now = [...at(ms)].filter((look) => look === "1").length;
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
    expect(last).toBe(25);
    expect(state.active(middle + 2000)).toBe(false);
    // A cell that changes again after it changed shows the look it had.
    const back = view(4, THEIRS);
    state.observe(back, "match", 5000, true, entriesOf);
    const backPlan = planOf(back);
    expect(looks(state.plan(backPlan, back, 5000))).toBe(looks(plan));
    expect(looks(state.plan(backPlan, back, 5000 + 3000))).toBe(
      looks(backPlan),
    );
  });

  it("ignores the older view of a presentation and starts over for another match", () => {
    const state = ripple();
    const before = view(5, NONE);
    const after = view(6, MINE);
    state.observe(before, "match", 0, true, entriesOf);
    state.observe(after, "match", 0, true, entriesOf);
    // A crossfade draws the older view beside the newer one every frame.
    state.observe(before, "match", 16, true, entriesOf);
    state.observe(after, "match", 16, true, entriesOf);
    expect(state.startedAtMs).toBe(0);
    // The older view is drawn as it is.
    const old = planOf(before);
    expect(state.plan(old, before, 16)).toBe(old);
    expect(looks(state.plan(planOf(after), after, 16))).toBe(looks(old));
    // Another match: no ripple from one board to the other.
    state.observe(view(1, WIDE), "other match", 20, true, entriesOf);
    expect(state.active(20)).toBe(false);
    state.reset();
    expect(state.startedAtMs).toBeNull();
  });
});

describe("a cell in the air on the board", () => {
  it("stretches the cell's ground and what grows on it up from its foot", () => {
    const art = terrainArt();
    const rows = ["ggg", "gFg", "ggg"];
    const entries = [
      ...terrainBoard(rows),
      {
        key: "unit:1",
        kind: "UNIT" as const,
        layer: 5,
        at: { x: 1, y: 1 },
        assetId: "unit",
      },
    ];
    const still = paintBoard(entries, { art, fog: false });
    expect(still.every((paint) => paint.scaleY === 1)).toBe(true);
    const lifted = paintBoard(entries, {
      art,
      fog: false,
      tileHops: [{ at: { x: 1, y: 1 }, lift: 1 }],
    });
    // The same images at the same places: only the transform differs.
    expect(lifted.map((paint) => [paint.image, paint.to])).toEqual(
      still.map((paint) => [paint.image, paint.to]),
    );
    const height = TERRAIN_RIPPLE_V7.height * CELL;
    const scaled = lifted.filter((paint) => paint.scaleY !== 1);
    expect(scaled.length).toBeGreaterThan(1);
    for (const paint of scaled) {
      // Stretched by the hop's height, about the cell's bottom edge
      // (y = 160): the foot stays where it is.
      expect(paint.scaleY).toBeCloseTo(1 + height / CELL);
      expect(2 * CELL * paint.scaleY + paint.shiftY).toBeCloseTo(2 * CELL);
      // Only the cell in the air, and never the unit standing on it.
      expect(paint.to.x).toBe(CELL);
      expect(paint.image.url).not.toBe("unit");
    }
    expect(lifted.some((paint) => paint.image.url === "unit")).toBe(true);
    expect(TILE_HOP_KINDS_V7.has("UNIT")).toBe(false);
    // A city's hop is the feedback animations': the two never add up.
    expect(TILE_HOP_KINDS_V7.has("CITY")).toBe(false);
    expect(TILE_HOP_KINDS_V7.has("TERRAIN")).toBe(true);
    // The ground of the eight cells round it does not move.
    expect(
      lifted.filter((paint) => paint.to.x !== CELL && paint.scaleY !== 1),
    ).toEqual([]);
  });
});
