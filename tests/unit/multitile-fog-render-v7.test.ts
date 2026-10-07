import { describe, expect, it } from "vitest";
import {
  MAP_GENERATION_REVISION_V7,
  RULESET_7_ID,
  createPlayableGameV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type MapTypeV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  buildBoardRenderPlanV7,
  type BoardRenderPlanEntryV7,
} from "../../src/render/canvas/board-renderer-v7";
import { FOREST_SHAPE_IDS_V7 } from "../../src/render/canvas/chibi-forest-packing-v7";
import { chibiMassifCellsV7 } from "../../src/render/canvas/chibi-massif-v7";
import { factionForestCellsV7 } from "../../src/render/canvas/faction-forests-v7";
import { riftPieceV7 } from "../../src/render/canvas/rift-presentation-v7";
import {
  compositionEntriesV7,
  terrainGhostsV7,
  terrainSkeletonOfBoardV7,
  terrainSkeletonOfRowsV7,
  terrainSkeletonOfViewV7,
  type TerrainSkeletonV7,
} from "../../src/render/canvas/terrain-at-fog-v7";
import {
  RIFT_FOG_MASKS_V7,
  RIFT_FOG_TERRAIN_V7,
  RIFT_FOG_V7,
  riftFogCellsV7,
  riftFogMaskNameV7,
  riftFogSceneV7,
} from "../fixtures/v7-rift-fog";
import {
  CELL,
  covered,
  paintBoard,
  paintsOn,
  terrainArt,
  type Paint,
} from "../fixtures/v7-terrain-board";

/**
 * pulp_wars-2yc.37 (docs/art/TERRAIN_AT_THE_FOG.md). The designer: "there
 * is a problem with terrain sprites that take up more than on tile but are
 * partially hidden. like the rift 3x1. If when only 1 tile is explored out
 * of the 3, the wrong part of the sprite is displayed."
 *
 * Whatever is explored of a piece of terrain that spans several cells,
 * each explored cell shows the part it shows when the whole is explored.
 */

const interaction = {
  selection: null,
  selectedUnitId: null,
  selectedAchievement: null,
} as const;

const key = (at: CoordV7): string => `${at.x},${at.y}`;

const planOf = (
  state: GameStateV7,
  skeleton: TerrainSkeletonV7 | null,
): BoardRenderPlanEntryV7[] => [
  ...buildBoardRenderPlanV7(
    viewForV7(state, state.humanPlayerId),
    [],
    interaction,
    { terrainSkeleton: () => skeleton },
  ).entries,
];

/** The Rift piece planned for each cell of `cells`, null where unexplored. */
const piecesOf = (
  entries: readonly BoardRenderPlanEntryV7[],
  cells: readonly CoordV7[],
): (string | null)[] =>
  cells.map(
    (at) =>
      entries.find(
        (entry) => entry.kind === "TERRAIN" && key(entry.at) === key(at),
      )?.riftPiece ?? null,
  );

const RIFTS = [
  ["horizontal", RIFT_FOG_V7.horizontal, ["H_WEST", "H_MIDDLE", "H_EAST"]],
  ["vertical", RIFT_FOG_V7.vertical, ["V_NORTH", "V_MIDDLE", "V_SOUTH"]],
] as const;

const SKELETON = terrainSkeletonOfRowsV7(RIFT_FOG_TERRAIN_V7);

describe("a Rift of which one, two or three cells are explored", () => {
  it("has the fixture's Rifts in its skeleton", () => {
    const state = riftFogSceneV7({ all: true });
    expect(SKELETON).toEqual(terrainSkeletonOfBoardV7(state.board));
    for (const [, cells] of RIFTS)
      for (const at of cells)
        expect(SKELETON.cells[at.y * SKELETON.width + at.x]).toBe("RIFT");
    expect(SKELETON.cells.filter((cell) => cell === "RIFT")).toHaveLength(6);
  });

  for (const [name, cells, whole] of RIFTS)
    for (const mask of RIFT_FOG_MASKS_V7)
      for (const halo of [false, true])
        it(`plans each explored cell its own third: ${name} ${riftFogMaskNameV7(mask)}${halo ? ", the ground beside it seen" : ""}`, () => {
          const state = riftFogSceneV7({
            explored: riftFogCellsV7(cells, mask),
            halo,
          });
          expect(piecesOf(planOf(state, SKELETON), cells)).toEqual(
            whole.map((piece, index) => (mask[index] === true ? piece : null)),
          );
          // The other Rift is not explored and is not planned at all.
          const other = name === "horizontal" ? RIFTS[1][1] : RIFTS[0][1];
          expect(piecesOf(planOf(state, SKELETON), other)).toEqual([
            null,
            null,
            null,
          ]);
        });

  it("showed another third, or the other orientation, when read from the explored cells alone", () => {
    // What was wrong: the same boards without the skeleton.
    const wrong: string[] = [];
    for (const [name, cells, whole] of RIFTS)
      for (const mask of RIFT_FOG_MASKS_V7)
        for (const halo of [false, true]) {
          const state = riftFogSceneV7({
            explored: riftFogCellsV7(cells, mask),
            halo,
          });
          const pieces = piecesOf(planOf(state, null), cells);
          if (
            pieces.some(
              (piece, index) => piece !== null && piece !== whole[index],
            )
          )
            wrong.push(`${name} ${riftFogMaskNameV7(mask)} ${halo}`);
        }
    // Every single cell and every pair, with nothing else seen.
    expect(wrong).toEqual(
      expect.arrayContaining([
        "horizontal 100 false",
        "horizontal 001 false",
        "horizontal 110 false",
        "horizontal 011 false",
        "horizontal 101 false",
        "vertical 100 false",
        "vertical 010 false",
        "vertical 001 false",
        "vertical 110 false",
        "vertical 011 false",
        "vertical 101 false",
      ]),
    );
  });

  it("is right at the corner of a unit's sight, where the explored cells alone cannot tell", () => {
    // A 3 x 3 sight whose south-west corner is the vertical Rift's north
    // end: Grass is seen north and east of it, nothing west or south.
    const sight: CoordV7[] = [];
    for (let y = 0; y <= 2; y += 1)
      for (let x = 10; x <= 12; x += 1) sight.push({ x, y });
    const state = riftFogSceneV7({ explored: sight });
    expect(piecesOf(planOf(state, SKELETON), RIFT_FOG_V7.vertical)).toEqual([
      "V_NORTH",
      null,
      null,
    ]);
    // Without the skeleton it is the east end of a horizontal Rift.
    expect(piecesOf(planOf(state, null), RIFT_FOG_V7.vertical)).toEqual([
      "H_EAST",
      null,
      null,
    ]);
  });

  it("does not follow what the unexplored cells hold", () => {
    // The skeleton is the map as it was made; nothing else of a hidden
    // cell is read. Every hidden tile is changed, and the plan is the same.
    const state = riftFogSceneV7({
      explored: [RIFT_FOG_V7.horizontal[0], RIFT_FOG_V7.vertical[2]],
    });
    const explored = new Set(
      state.players
        .find((player) => player.id === state.humanPlayerId)
        ?.explored.map(key),
    );
    const changed: GameStateV7 = {
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          explored.has(key(tile.at))
            ? tile
            : { ...tile, terrain: "GRASS" as const, road: true },
        ),
      },
    };
    expect(planOf(changed, SKELETON)).toEqual(planOf(state, SKELETON));
    expect(
      piecesOf(planOf(changed, SKELETON), [
        RIFT_FOG_V7.horizontal[0],
        RIFT_FOG_V7.vertical[2],
      ]),
    ).toEqual(["H_WEST", "V_SOUTH"]);
  });

  it("asks for the skeleton once, and only for a board with a Rift in sight", () => {
    let asked = 0;
    const skeleton = (): TerrainSkeletonV7 => {
      asked += 1;
      return SKELETON;
    };
    const none = riftFogSceneV7({ explored: [...RIFT_FOG_V7.ridge] });
    buildBoardRenderPlanV7(
      viewForV7(none, none.humanPlayerId),
      [],
      interaction,
      { terrainSkeleton: skeleton },
    );
    expect(asked).toBe(0);
    const some = riftFogSceneV7({
      explored: [RIFT_FOG_V7.horizontal[1], RIFT_FOG_V7.vertical[1]],
    });
    buildBoardRenderPlanV7(
      viewForV7(some, some.humanPlayerId),
      [],
      interaction,
      { terrainSkeleton: skeleton },
    );
    expect(asked).toBe(1);
    // All of it explored: nothing is hidden, nothing is asked.
    const all = riftFogSceneV7({ all: true });
    buildBoardRenderPlanV7(viewForV7(all, all.humanPlayerId), [], interaction, {
      terrainSkeleton: skeleton,
    });
    expect(asked).toBe(1);
  });

  it("ignores a skeleton of another size", () => {
    const state = riftFogSceneV7({ explored: [RIFT_FOG_V7.horizontal[0]] });
    expect(
      piecesOf(
        planOf(state, terrainSkeletonOfRowsV7(["xxx", "..."])),
        RIFT_FOG_V7.horizontal,
      ),
    ).toEqual(piecesOf(planOf(state, null), RIFT_FOG_V7.horizontal));
  });
});

describe("the Rift piece without a skeleton", () => {
  const board =
    (rift: readonly string[], fog: readonly string[]) =>
    (at: CoordV7): boolean | null =>
      fog.includes(key(at)) ? null : rift.includes(key(at));

  it("ends the crack where the ground beside it is seen", () => {
    // The west end at the corner of a unit's sight: Grass to the west and
    // the north, fog to the east and the south. It was drawn as a middle,
    // a crack running up to the edge of the Grass.
    expect(riftPieceV7({ x: 3, y: 2 }, board(["3,2"], ["4,2", "3,3"]))).toBe(
      "H_WEST",
    );
    expect(riftPieceV7({ x: 5, y: 2 }, board(["5,2"], ["4,2", "5,1"]))).toBe(
      "H_EAST",
    );
  });
});

// ---------------------------------------------------------------- drawing

const TERRAIN_KINDS = new Set(["TERRAIN", "FOG"]);
const isRift = (paint: Paint): boolean =>
  paint.image.url?.startsWith("rift-") === true;

/** What is painted of the Rift on a cell: the piece and where it lies. */
const riftOn = (paints: readonly Paint[], at: CoordV7): unknown[] =>
  paints
    .filter((paint) => isRift(paint) && paintsOn(paint, at.x, at.y))
    .map((paint) => [paint.image.url, covered(paint)]);

describe("drawing a Rift at the fog", () => {
  const art = terrainArt();
  const paintsOf = (state: GameStateV7): Paint[] =>
    paintBoard(
      planOf(state, SKELETON).filter((entry) => TERRAIN_KINDS.has(entry.kind)),
      { art },
    );
  const whole = paintsOf(riftFogSceneV7({ all: true }));

  it("draws each third on its own cell when all is explored", () => {
    for (const [, cells, pieces] of RIFTS)
      for (const [index, at] of cells.entries())
        expect(riftOn(whole, at)).toEqual([
          [
            `rift-${(pieces[index] as string).toLowerCase().replace("_", "-")}`,
            [{ x: at.x * CELL, y: at.y * CELL, width: CELL, height: CELL }],
          ],
        ]);
  });

  for (const [name, cells] of RIFTS)
    for (const mask of RIFT_FOG_MASKS_V7)
      it(`draws on each explored cell what it draws there when all is explored: ${name} ${riftFogMaskNameV7(mask)}`, () => {
        for (const halo of [false, true]) {
          const paints = paintsOf(
            riftFogSceneV7({ explored: riftFogCellsV7(cells, mask), halo }),
          );
          for (const [index, at] of cells.entries())
            expect(riftOn(paints, at), `${key(at)} halo ${halo}`).toEqual(
              mask[index] === true ? riftOn(whole, at) : [],
            );
          // Nothing of a Rift anywhere else.
          expect(paints.filter(isRift)).toHaveLength(
            mask.filter((seen) => seen).length,
          );
        }
      });
});

// ------------------------------------------------- every kind, real maps

const MASSIF_COUNTS = { low1: 8, low2: 7, tall1: 6, tall2: 6 };
const FOREST_VARIANTS = Object.fromEntries(
  FOREST_SHAPE_IDS_V7.map((shape) => [shape, shape.startsWith("L") ? 2 : 3]),
) as Record<(typeof FOREST_SHAPE_IDS_V7)[number], number>;
const allReady = () => ({ variants: FOREST_VARIANTS, clumps: 4 });

/** Kinds of entry that change how the Forest or Mountain under them packs. */
const FEATURES = new Set([
  "RESOURCE",
  "IMPROVEMENT",
  "SITE",
  "CITY",
  "TREASURE",
  "CURIOSITY",
  "GRAVE",
  "FIELD_DEFENSE",
]);

function generated(mapType: MapTypeV7, width: 16 | 20, seed: number) {
  const created = createPlayableGameV7({
    rulesetId: RULESET_7_ID,
    seed,
    width,
    height: width,
    aiCount: 2,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "ORIGINAL", "ORIGINAL"],
    allowDuplicateFactions: true,
    mapType,
    mapGenerationRevision: MAP_GENERATION_REVISION_V7,
    curiosities: true,
  });
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

const seeing = (
  state: GameStateV7,
  seen: (at: CoordV7) => boolean,
): PlayerViewV7 =>
  viewForV7(
    {
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? {
              ...player,
              explored: state.board.tiles.map((tile) => tile.at).filter(seen),
            }
          : player,
      ),
    },
    state.humanPlayerId,
  );

/** A fixed pseudo-random sequence. */
function sequence(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** What a unit's sight leaves explored: a few squares of 3 x 3 and 5 x 5. */
function sights(random: () => number, size: number): Set<string> {
  const seen = new Set<string>();
  const squares = 3 + Math.floor(random() * 12);
  for (let index = 0; index < squares; index += 1) {
    const cx = Math.floor(random() * size);
    const cy = Math.floor(random() * size);
    const radius = 1 + Math.floor(random() * 2);
    for (let y = cy - radius; y <= cy + radius; y += 1)
      for (let x = cx - radius; x <= cx + radius; x += 1)
        if (x >= 0 && y >= 0 && x < size && y < size) seen.add(`${x},${y}`);
  }
  return seen;
}

describe("multi-cell terrain of a generated map, half explored", () => {
  const MAPS = [
    ["PANGEA", 16, 5],
    ["CONTINENTS", 20, 2],
    ["DRY_LAND", 16, 4],
    ["PANGEA", 20, 5],
  ] as const;

  for (const [mapType, size, seed] of MAPS)
    it(`shows every explored cell its share of the whole map's pieces: ${mapType} ${size} seed ${seed}`, () => {
      const state = generated(mapType, size, seed);
      const everything = seeing(state, () => true);
      const skeleton = terrainSkeletonOfViewV7(everything);
      if (skeleton === null) throw new Error("no skeleton");
      expect(skeleton).toEqual(terrainSkeletonOfBoardV7(state.board));
      const wholePlan = buildBoardRenderPlanV7(everything, [], interaction);
      const riftTiles = state.board.tiles.filter(
        (tile) => tile.terrain === "RIFT",
      );
      expect(riftTiles).toHaveLength(3);
      const random = sequence(seed * 7919 + size);
      let rifts = 0;
      let mountains = 0;
      let forests = 0;
      for (let trial = 0; trial < 24; trial += 1) {
        // The odd trials see a part of the Rift for certain.
        const seen = sights(random, size);
        if (trial % 2 === 1) {
          const mask = RIFT_FOG_MASKS_V7[(trial >> 1) % 7] as readonly [
            boolean,
            boolean,
            boolean,
          ];
          for (const [index, tile] of riftTiles.entries())
            if (mask[index] === true) seen.add(key(tile.at));
            else seen.delete(key(tile.at));
        }
        const view = seeing(state, (at) => seen.has(key(at)));
        const partial = buildBoardRenderPlanV7(view, [], interaction, {
          terrainSkeleton: terrainSkeletonOfViewV7,
        });
        // The Rift: the piece of the whole map on every explored cell.
        for (const tile of riftTiles) {
          if (!seen.has(key(tile.at))) continue;
          rifts += 1;
          expect(piecesOf(partial.entries, [tile.at])).toEqual(
            piecesOf(wholePlan.entries, [tile.at]),
          );
        }
        // Forest and Mountain: the cover of the whole map, less what only
        // the game knows of the unexplored cells (docs: "When a cell still
        // changes"): a feature on a hidden cell is not read.
        const known = wholePlan.entries.filter(
          (entry) => !FEATURES.has(entry.kind) || seen.has(key(entry.at)),
        );
        const composed = compositionEntriesV7({
          entries: partial.entries,
          ghosts: terrainGhostsV7(view, skeleton),
        });
        const massifNow = chibiMassifCellsV7(composed, MASSIF_COUNTS, 1);
        const massifThen = chibiMassifCellsV7(known, MASSIF_COUNTS, 1);
        const forestNow = factionForestCellsV7(composed, allReady);
        const forestThen = factionForestCellsV7(known, allReady);
        for (const at of seen) {
          const mountain = massifThen.get(at);
          if (mountain !== undefined) {
            mountains += 1;
            expect(massifNow.get(at), `mountain ${at}`).toEqual(mountain);
          }
          const forest = forestThen.cells.get(at);
          if (forest !== undefined) {
            forests += 1;
            expect(forestNow.cells.get(at), `forest ${at}`).toEqual(forest);
          }
        }
      }
      expect(rifts).toBeGreaterThan(12);
      expect(mountains).toBeGreaterThan(40);
      expect(forests).toBeGreaterThan(100);
    });
});
