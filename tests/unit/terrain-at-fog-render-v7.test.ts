import { describe, expect, it } from "vitest";
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  viewForV7,
  type GameStateV7,
} from "../../src/engine/index";
import { buildBoardRenderPlanV7 } from "../../src/render/canvas/board-renderer-v7";
import { FOREST_SHAPE_IDS_V7 } from "../../src/render/canvas/chibi-forest-packing-v7";
import { chibiMassifCellsV7 } from "../../src/render/canvas/chibi-massif-v7";
import {
  FACTION_FOREST_IDS_V7,
  factionForestCellsV7,
  type FactionForestIdV7,
} from "../../src/render/canvas/faction-forests-v7";
import {
  GHOST_FOREST_FACTIONS_V7,
  TERRAIN_AT_FOG_ENABLED_V7,
  compositionEntriesV7,
  fogAtOfV7,
  fogShareRectsV7,
  terrainAtFogEnabledV7,
  terrainGhostsOfV7,
  terrainGhostsV7,
  terrainSkeletonFitsV7,
  terrainSkeletonOfRowsV7,
  terrainSkeletonOfSetupV7,
  terrainSkeletonOfViewV7,
} from "../../src/render/canvas/terrain-at-fog-v7";
import {
  CELL,
  covered,
  fogCells,
  ghostsOf,
  hide,
  paintBoard,
  paintsOn,
  terrainArt,
  terrainBoard,
  type Paint,
} from "../fixtures/v7-terrain-board";

/**
 * pulp_wars-2yc.28 (docs/art/TERRAIN_AT_THE_FOG.md): a massif and a
 * composed forest that lie half inside the fog. The cover of the pieces is
 * the cover of the whole map, nothing is painted on an unexplored cell,
 * and the cloud's edge is drawn over the cut.
 */

const interaction = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

function generated(): GameStateV7 {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed: 4242,
    width: 16,
    height: 16,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["GOBLIN", "ORIGINAL", "UNDEAD"],
    mapType: "CONTINENTS",
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: false,
  });
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

describe("the switch of the ghosts", () => {
  it("is on by default and the query string overrides it", () => {
    expect(TERRAIN_AT_FOG_ENABLED_V7).toBe(true);
    expect(terrainAtFogEnabledV7("")).toBe(true);
    expect(terrainAtFogEnabledV7()).toBe(true);
    for (const off of ["0", "off", "false"])
      expect(terrainAtFogEnabledV7(`?art=chibi&fog-terrain=${off}`)).toBe(
        false,
      );
    expect(terrainAtFogEnabledV7("?fog-terrain=1")).toBe(true);
    expect(terrainAtFogEnabledV7("?fog-terrain=what")).toBe(true);
  });
});

describe("the terrain skeleton", () => {
  it("is the map the match's own setup makes", () => {
    const state = generated();
    const skeleton = terrainSkeletonOfSetupV7(state.setup);
    if (skeleton === null) throw new Error("no skeleton");
    expect(skeleton.width).toBe(16);
    expect(skeleton.height).toBe(16);
    expect(skeleton.cells).toEqual(
      state.board.tiles.map((tile) =>
        tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN"
          ? tile.terrain
          : "OTHER",
      ),
    );
    expect(skeleton.cells).toContain("FOREST");
    expect(skeleton.cells).toContain("MOUNTAIN");
    const view = viewForV7(state, state.humanPlayerId);
    expect(terrainSkeletonFitsV7(skeleton, view)).toBe(true);
    expect(terrainSkeletonOfViewV7(view)).toEqual(skeleton);
    // Made once for a setup.
    expect(terrainSkeletonOfViewV7(view)).toBe(terrainSkeletonOfViewV7(view));
  });

  it("is refused for a board that is not the setup's map", () => {
    const state = generated();
    const other = {
      ...state,
      board: {
        ...state.board,
        // A state built by hand: every tile Forest.
        tiles: state.board.tiles.map((tile) => ({
          ...tile,
          terrain: "FOREST" as const,
        })),
      },
      setup: { ...state.setup },
    };
    const view = viewForV7(other, other.humanPlayerId);
    expect(terrainSkeletonOfViewV7(view)).toBeNull();
    expect(terrainGhostsOfV7(view, null)).toEqual([]);
    // A setup that makes no map at all.
    expect(
      terrainSkeletonOfSetupV7({ ...state.setup, width: 3 } as never),
    ).toBeNull();
    expect(
      terrainSkeletonFitsV7(terrainSkeletonOfRowsV7(["f^", ".."]), view),
    ).toBe(false);
  });

  it("reads rows of marks for the reviews and the tests", () => {
    expect(terrainSkeletonOfRowsV7(["f^.", "~~f"])).toEqual({
      width: 3,
      height: 2,
      cells: ["FOREST", "MOUNTAIN", "OTHER", "OTHER", "OTHER", "FOREST"],
    });
  });
});

describe("the ghosts", () => {
  it("are the unexplored Forest and Mountain of the skeleton and nothing else", () => {
    const state = generated();
    const view = viewForV7(state, state.humanPlayerId);
    const skeleton = terrainSkeletonOfViewV7(view);
    if (skeleton === null) throw new Error("no skeleton");
    const ghosts = terrainGhostsV7(view, skeleton);
    expect(ghosts.length).toBeGreaterThan(0);
    const explored = new Set(
      view.board.tiles
        .filter((tile) => tile.explored)
        .map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    const hidden = state.board.tiles.filter(
      (tile) =>
        !explored.has(`${tile.at.x},${tile.at.y}`) &&
        (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN"),
    );
    expect(ghosts.map((ghost) => ghost.at)).toEqual(
      hidden.map((tile) => tile.at),
    );
    for (const ghost of ghosts) {
      expect(explored.has(`${ghost.at.x},${ghost.at.y}`)).toBe(false);
      // The kind of ground the map was made with there, and no more: no
      // resource, improvement, site, owner, unit or road.
      expect(
        Object.keys(ghost)
          .filter((name) => name !== "factionForest")
          .sort(),
      ).toEqual(["artSubject", "at", "ghost", "key", "kind", "layer"]);
      expect(["TERRAIN:FOREST", "TERRAIN:MOUNTAIN"]).toContain(
        ghost.artSubject,
      );
    }
    expect(terrainGhostsOfV7(view, skeleton)).toBe(
      terrainGhostsOfV7(view, skeleton),
    );
  });

  it("do not follow what happens under the fog", () => {
    const state = generated();
    const view = viewForV7(state, state.humanPlayerId);
    const skeleton = terrainSkeletonOfViewV7(view);
    if (skeleton === null) throw new Error("no skeleton");
    const explored = new Set(
      view.board.tiles
        .filter((tile) => tile.explored)
        .map((tile) => `${tile.at.x},${tile.at.y}`),
    );
    // Every hidden tile is cleared, mined, built on and given away.
    const changed = {
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          explored.has(`${tile.at.x},${tile.at.y}`)
            ? tile
            : {
                ...tile,
                terrain: "GRASS" as const,
                resource: null,
                improvement: null,
                road: true,
              },
        ),
      },
    };
    const after = viewForV7(changed, changed.humanPlayerId);
    expect(terrainGhostsV7(after, skeleton)).toEqual(
      terrainGhostsV7(view, skeleton),
    );
  });

  it("take the territory of the explored ground beside them, up to a border", () => {
    const state = generated();
    const full = viewForV7(state, state.humanPlayerId);
    const skeleton = terrainSkeletonOfRowsV7(["fff", "fff", "fff"]);
    const tile = (x: number, y: number, explored: boolean, owner: unknown) =>
      explored
        ? {
            at: { x, y },
            explored: true as const,
            biome: null,
            terrain: "FOREST" as const,
            resource: null,
            improvement: null,
            road: false,
            fieldDefense: false,
            fortificationLevel: null,
            site: null,
            territoryCityId: null,
            territoryOwnerId: owner,
          }
        : { at: { x, y }, explored: false as const };
    const goblin = full.players.find((player) => player.faction === "GOBLIN");
    if (goblin === undefined) throw new Error("no Goblin seat");
    const view = (borders: readonly unknown[]) =>
      ({
        ...full,
        board: {
          width: 3,
          height: 3,
          // Only the middle cell is explored, and it is Goblin land.
          tiles: [0, 1, 2].flatMap((y) =>
            [0, 1, 2].map((x) => tile(x, y, x === 1 && y === 1, goblin.id)),
          ),
          territoryBorders: borders,
        },
      }) as unknown as typeof full;
    const open = terrainGhostsV7(view([]), skeleton);
    expect(open).toHaveLength(8);
    // Without a border the wood round it is the same faction's, two steps
    // out: the corners too.
    for (const ghost of open) expect(ghost.factionForest).toBe("GOBLIN");
    // A border on the cell's east edge: the cell east of it is not.
    const east = terrainGhostsV7(
      view([
        {
          at: { x: 1, y: 1 },
          edge: "EAST",
          ownerId: goblin.id,
          sharedOwnerIds: null,
          cityIds: [],
        },
      ]),
      skeleton,
    );
    const at = (x: number, y: number) =>
      east.find((ghost) => ghost.at.x === x && ghost.at.y === y);
    expect(at(2, 1)?.factionForest).toBeUndefined();
    expect(at(0, 1)?.factionForest).toBe("GOBLIN");
    expect(at(1, 0)?.factionForest).toBe("GOBLIN");
  });

  it("know the factions that have a forest of their own", () => {
    expect([...GHOST_FOREST_FACTIONS_V7].sort()).toEqual(
      [...FACTION_FOREST_IDS_V7].sort(),
    );
  });

  it("join a plan's entries for the packing, as one array a plan", () => {
    const entries = terrainBoard(["F?"]);
    const ghosts = ghostsOf(["FF"], [" ?"]);
    expect(compositionEntriesV7({ entries })).toBe(entries);
    expect(compositionEntriesV7({ entries, ghosts: [] })).toBe(entries);
    const joined = compositionEntriesV7({ entries, ghosts });
    expect(joined).toEqual([...entries, ...ghosts]);
    expect(compositionEntriesV7({ entries, ghosts })).toBe(joined);
  });
});

describe("the share of a piece over explored cells", () => {
  const fog = (cells: readonly string[]) => {
    const set = new Set(cells);
    return (x: number, y: number): boolean => set.has(`${x},${y}`);
  };
  const origin = { x: 4, y: 7 };

  it("is the whole piece where no cell under it is fog", () => {
    const rect = { x: 0, y: -24, width: 160, height: 104 };
    expect(fogShareRectsV7(origin, rect, null)).toBeNull();
    expect(fogShareRectsV7(origin, rect, undefined)).toBeNull();
    expect(fogShareRectsV7(origin, rect, fog(["9,9"]))).toBeNull();
    expect(fogShareRectsV7(origin, rect, fogAtOfV7([]))).toBeNull();
  });

  it("leaves out the cells that are fog, column by column and row by row", () => {
    // A ridge two cells wide whose east cell is fog.
    expect(
      fogShareRectsV7(
        origin,
        { x: 0, y: 0, width: 160, height: 80 },
        fog(["5,7"]),
      ),
    ).toEqual([{ x: 0, y: 0, width: 80, height: 80 }]);
    // A tall piece whose peaks rise 48 px over a fog cell.
    expect(
      fogShareRectsV7(
        origin,
        { x: 0, y: -48, width: 80, height: 128 },
        fog(["4,6"]),
      ),
    ).toEqual([{ x: 0, y: 0, width: 80, height: 80 }]);
    // A 2 x 2 piece with one explored cell, and a clump astride an edge.
    expect(
      fogShareRectsV7(
        origin,
        { x: 0, y: 0, width: 160, height: 160 },
        fog(["4,7", "5,7", "4,8"]),
      ),
    ).toEqual([{ x: 80, y: 80, width: 80, height: 80 }]);
    expect(
      fogShareRectsV7(
        origin,
        { x: 50, y: 10, width: 60, height: 70 },
        fog(["5,7"]),
      ),
    ).toEqual([{ x: 50, y: 10, width: 30, height: 70 }]);
    // A band of tree tops over a fog cell: nothing at all.
    expect(
      fogShareRectsV7(
        origin,
        { x: 0, y: -24, width: 80, height: 24 },
        fog(["4,6"]),
      ),
    ).toEqual([]);
    // Neighbouring explored cells of a row stay one rectangle.
    expect(
      fogShareRectsV7(
        origin,
        { x: 0, y: 0, width: 240, height: 80 },
        fog(["7,7", "9,9"]),
      ),
    ).toBeNull();
    expect(
      fogShareRectsV7(
        { x: 4, y: 7 },
        { x: 0, y: 0, width: 320, height: 80 },
        fog(["6,7"]),
      ),
    ).toEqual([
      { x: 0, y: 0, width: 160, height: 80 },
      { x: 240, y: 0, width: 80, height: 80 },
    ]);
  });

  it("reads a plan's FOG entries, and outside the map nothing is fog", () => {
    const fogAt = fogAtOfV7(terrainBoard(["?g", "g?"]));
    expect(fogAt(0, 0)).toBe(true);
    expect(fogAt(1, 1)).toBe(true);
    expect(fogAt(1, 0)).toBe(false);
    expect(fogAt(-1, 0)).toBe(false);
    expect(fogAt(0, -1)).toBe(false);
  });
});

// ------------------------------------------------------------ composition

const MASSIF_COUNTS = { low1: 8, low2: 7, tall1: 6, tall2: 6 };
const FOREST_VARIANTS = Object.fromEntries(
  FOREST_SHAPE_IDS_V7.map((shape) => [shape, shape.startsWith("L") ? 2 : 3]),
) as Record<(typeof FOREST_SHAPE_IDS_V7)[number], number>;
const allReady = () => ({ variants: FOREST_VARIANTS, clumps: 4 });

const RANGE = [
  "ggggggggg",
  "gMMMMMMMg",
  "gMMMMMMMg",
  "gMMMMMMMg",
  "ggggggggg",
  "gFFFFFFFg",
  "gFFFFFFFg",
  "gFFFFFFFg",
  "gFFFFFFFg",
  "ggggggggg",
];

/** Ways the fog can lie over RANGE: "?" hides a cell. */
const CUTS: Readonly<Record<string, readonly string[]>> = {
  west: RANGE.map(() => "????     "),
  "west, odd": RANGE.map(() => "???      "),
  east: RANGE.map(() => "      ???"),
  north: RANGE.map((_, y) => (y <= 1 || y === 5 ? "?????????" : "         ")),
  south: RANGE.map((_, y) => (y >= 3 && y !== 4 ? "?????????" : "         ")),
  ragged: RANGE.map((_, y) =>
    Array.from({ length: 9 }, (_, x) =>
      (x * 7 + y * 5) % 4 === 0 || x + y < 6 ? "?" : " ",
    ).join(""),
  ),
  "one cell": RANGE.map((_, y) => (y === 2 ? "   ?     " : "         ")),
};

describe("the cover of a half-explored range and wood", () => {
  for (const faction of [undefined, "CANDY", "UNDEAD"] as const)
    for (const [name, hidden] of Object.entries(CUTS))
      it(`is the whole map's cover: ${name}${faction === undefined ? "" : `, ${faction}`}`, () => {
        const whole = terrainBoard(RANGE, faction as FactionForestIdV7);
        const partial = compositionEntriesV7({
          entries: terrainBoard(hide(RANGE, hidden), faction),
          ghosts: ghostsOf(RANGE, hidden, faction),
        });
        // Every cell, explored or ghost, has the role it has on the whole
        // map: exploring the rest changes no piece, seam clump or band.
        expect(chibiMassifCellsV7(partial, MASSIF_COUNTS, 1), "massif").toEqual(
          chibiMassifCellsV7(whole, MASSIF_COUNTS, 1),
        );
        const now = factionForestCellsV7(partial, allReady);
        const then = factionForestCellsV7(whole, allReady);
        expect(now.cells, "forest").toEqual(then.cells);
        expect(now.sets).toEqual(then.sets);
      });

  it("changed with every cell explored when packed from explored cells alone", () => {
    // What the ghosts are for: without them the west cut re-packs.
    const whole = chibiMassifCellsV7(terrainBoard(RANGE), MASSIF_COUNTS, 1);
    const alone = chibiMassifCellsV7(
      terrainBoard(hide(RANGE, CUTS["west, odd"] as readonly string[])),
      MASSIF_COUNTS,
      1,
    );
    const changed = [...alone.entries()].filter(
      ([at, cell]) =>
        JSON.stringify(cell) !== JSON.stringify(whole.get(at) ?? null),
    );
    expect(changed.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------- drawing

const isFogArt = (paint: Paint): boolean => paint.image.of === "fog";
const isTrees = (paint: Paint): boolean =>
  paint.image.of === "forest" ||
  paint.image.of === "faction-forest" ||
  paint.image.of === "massif" ||
  paint.image.of === "clump";

describe("drawing at the fog", () => {
  for (const faction of [
    undefined,
    "UNDEAD",
    "GOBLIN",
    "DINOSAUR",
    "MARTIAN",
    "DWARF",
    "CANDY",
  ] as const)
    it(`paints nothing on an unexplored cell: ${faction ?? "the default Forest"}`, () => {
      const art = terrainArt();
      // Every cut for the default Forest and one faction's; two for the rest.
      const cuts = Object.entries(CUTS).filter(
        ([name]) =>
          faction === undefined ||
          faction === "CANDY" ||
          name === "ragged" ||
          name === "west, odd",
      );
      for (const [name, hidden] of cuts) {
        const rows = hide(RANGE, hidden);
        const fog = fogCells(rows);
        for (const ghosts of [ghostsOf(RANGE, hidden, faction), undefined]) {
          const paints = paintBoard(terrainBoard(rows, faction), {
            art,
            ...(ghosts === undefined ? {} : { ghosts }),
          });
          expect(paints.some(isTrees)).toBe(true);
          for (const paint of paints)
            for (const [x, y] of fog)
              expect(
                paintsOn(paint, x, y),
                `${name}: ${JSON.stringify(paint.image)} on fog cell ${x},${y}`,
              ).toBe(false);
        }
      }
    });

  it("draws a piece that runs into the fog inside a clip of its explored cells", () => {
    const hidden = CUTS["west, odd"] as readonly string[];
    const rows = hide(RANGE, hidden);
    const paints = paintBoard(terrainBoard(rows), {
      ghosts: ghostsOf(RANGE, hidden),
    });
    const clipped = paints.filter((paint) => paint.clip !== null);
    expect(clipped.length).toBeGreaterThan(0);
    for (const paint of clipped) {
      expect(isTrees(paint)).toBe(true);
      // The piece itself reaches past its clip: it is the whole piece of
      // the whole map, cut, not a smaller one.
      const area = covered(paint).reduce(
        (sum, rect) => sum + rect.width * rect.height,
        0,
      );
      expect(area).toBeLessThan(paint.to.width * paint.to.height);
      for (const rect of paint.clip ?? []) {
        // A clip is made of whole cells, or the part of the art in them.
        expect(rect.x % CELL === 0 || rect.x === paint.to.x).toBe(true);
      }
    }
    // Away from the fog nothing is clipped: the draws of the whole map.
    const whole = paintBoard(terrainBoard(RANGE));
    expect(whole.every((paint) => paint.clip === null)).toBe(true);
  });

  it("shows the explored cells the whole map's trees and rock, minus what the fog's edge hides", () => {
    let compared = 0;
    const art = terrainArt();
    for (const [name, hidden] of Object.entries(CUTS)) {
      const rows = hide(RANGE, hidden);
      const fog = new Set(fogCells(rows).map(([x, y]) => `${x},${y}`));
      const partial = paintBoard(terrainBoard(rows), {
        art,
        ghosts: ghostsOf(RANGE, hidden),
      });
      const whole = paintBoard(terrainBoard(RANGE), { art });
      // Cells at least one cell from the fog: the same paints in the same
      // order as on the whole map.
      const far = (x: number, y: number): boolean => {
        for (let dy = -1; dy <= 1; dy += 1)
          for (let dx = -1; dx <= 1; dx += 1)
            if (fog.has(`${x + dx},${y + dy}`)) return false;
        return true;
      };
      const on = (paints: readonly Paint[], x: number, y: number) =>
        paints
          .filter((paint) => !isFogArt(paint) && paintsOn(paint, x, y))
          .map((paint) => [paint.image, paint.to]);
      for (let y = 0; y < RANGE.length; y += 1)
        for (let x = 0; x < 9; x += 1) {
          if (!far(x, y)) continue;
          compared += 1;
          expect(on(partial, x, y), `${name} ${x},${y}`).toEqual(
            on(whole, x, y),
          );
        }
      // Beside the fog: the tree and rock bodies (drawn under the units)
      // are the whole map's too.
      const bodies = (paints: readonly Paint[], x: number, y: number) =>
        paints
          .filter(
            (paint) =>
              isTrees(paint) &&
              paint.to.height >= CELL &&
              paintsOn(paint, x, y),
          )
          .map((paint) => [paint.image, paint.to]);
      for (let y = 0; y < RANGE.length; y += 1)
        for (let x = 0; x < 9; x += 1)
          if (!fog.has(`${x},${y}`))
            expect(bodies(partial, x, y), `${name} bodies ${x},${y}`).toEqual(
              bodies(whole, x, y),
            );
    }
    expect(compared).toBeGreaterThan(100);
  });

  it("draws the cloud's edge again over the trees and rock beside the fog", () => {
    const hidden = CUTS.west as readonly string[];
    const rows = hide(RANGE, hidden);
    const paints = paintBoard(terrainBoard(rows), {
      ghosts: ghostsOf(RANGE, hidden),
    });
    // Column 4 is the first explored one: a Mountain cell and a Forest cell.
    for (const [x, y] of [
      [4, 2],
      [4, 6],
    ] as const) {
      const edges = paints
        .map((paint, index) => ({ paint, index }))
        .filter(
          ({ paint }) =>
            isFogArt(paint) &&
            paint.to.x === x * CELL &&
            paint.to.y === y * CELL,
        );
      // Once over the ground, once over the trees or the rock.
      expect(edges).toHaveLength(2);
      const lastBody = paints
        .map((paint, index) => ({ paint, index }))
        .filter(
          ({ paint }) =>
            isTrees(paint) && paint.to.height >= CELL && paintsOn(paint, x, y),
        )
        .at(-1);
      if (lastBody === undefined) throw new Error("no body");
      expect(edges[0]?.index ?? 0).toBeLessThan(lastBody.index);
      expect(edges[1]?.index ?? 0).toBeGreaterThan(lastBody.index);
    }
    // A Grass cell beside the fog has its edge once.
    expect(
      paints.filter(
        (paint) =>
          isFogArt(paint) && paint.to.x === 4 * CELL && paint.to.y === 4 * CELL,
      ),
    ).toHaveLength(1);
  });

  it("is the same picture for the same plan", () => {
    const hidden = CUTS.ragged as readonly string[];
    const rows = hide(RANGE, hidden);
    const art = terrainArt();
    const draw = () =>
      paintBoard(terrainBoard(rows, "CANDY"), {
        art,
        ghosts: ghostsOf(RANGE, hidden, "CANDY"),
      });
    expect(draw()).toEqual(draw());
  });
});

describe("the ghosts in a real plan", () => {
  it("are not entries: the fog, the grass and the coast do not see them", () => {
    const state = generated();
    const view = viewForV7(state, state.humanPlayerId);
    const plan = buildBoardRenderPlanV7(view, [], interaction);
    const ghosts = terrainGhostsOfV7(view, terrainSkeletonOfViewV7(view));
    const withGhosts = { ...plan, ghosts };
    expect(withGhosts.entries).toBe(plan.entries);
    const composed = compositionEntriesV7(withGhosts);
    expect(composed.length).toBe(plan.entries.length + ghosts.length);
    // Every unexplored cell still has its FOG entry and nothing else.
    const fogAt = fogAtOfV7(plan.entries);
    for (const ghost of ghosts) {
      expect(fogAt(ghost.at.x, ghost.at.y)).toBe(true);
      expect(
        plan.entries.filter(
          (entry) => entry.at.x === ghost.at.x && entry.at.y === ghost.at.y,
        ),
      ).toEqual([
        {
          key: `fog:${ghost.at.x},${ghost.at.y}`,
          kind: "FOG",
          layer: 0,
          at: ghost.at,
        },
      ]);
    }
  });
});
