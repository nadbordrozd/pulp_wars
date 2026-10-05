import { describe, expect, it } from "vitest";
import {
  RULESET_7_ID,
  canonicalMapRandomHashV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  pangeaCoastRingV7,
  pangeaLandCountV7,
  revision14VillageCountV7,
  type AiCountV7,
  type BoardSizeV7,
  type BoardStateV7,
  type CoordV7,
  type MapTypeV7,
  type MatchSetupV7,
} from "../../src/engine/index";

const SHAPES = [
  [11, 1],
  [14, 1],
  [14, 2],
  [16, 1],
  [16, 2],
  [16, 3],
  [20, 1],
  [20, 2],
  [20, 3],
  [25, 1],
  [25, 2],
  [25, 3],
] as const;

function setup(
  mapType: MapTypeV7,
  width: BoardSizeV7,
  aiCount: AiCountV7,
  seed: number,
): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed,
    width,
    height: width,
    aiCount,
    aiDifficulty: "NORMAL" as const,
    aiMode: "RIVAL" as const,
    humanColor: "CORAL" as const,
    factions: Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const),
    allowDuplicateFactions: true,
    mapType,
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V3" as const,
    curiosities: false,
  };
}

const edge = (board: BoardStateV7, at: CoordV7): boolean =>
  at.x === 0 ||
  at.y === 0 ||
  at.x === board.width - 1 ||
  at.y === board.height - 1;

/**
 * An explicit sailing loop: walk the edge ring's water cells in order and
 * check each step is an eight-directional move between water cells. Every
 * edge cell is water, so the ring itself is a closed route around the island.
 */
function edgeRingLoop(board: BoardStateV7): CoordV7[] {
  const w = board.width;
  const h = board.height;
  const loop: CoordV7[] = [];
  for (let x = 0; x < w; x += 1) loop.push({ x, y: 0 });
  for (let y = 1; y < h; y += 1) loop.push({ x: w - 1, y });
  for (let x = w - 2; x >= 0; x -= 1) loop.push({ x, y: h - 1 });
  for (let y = h - 2; y >= 1; y -= 1) loop.push({ x: 0, y });
  return loop;
}

describe("Pangea coast ring", () => {
  it.each(SHAPES)(
    "%i x %i-AI Pangea keeps land off the edge ring and can be circumnavigated",
    (width, aiCount) => {
      for (let seed = 0; seed < 12; seed += 1) {
        const result = generateInitialMapV7(
          setup("PANGEA", width, aiCount, seed),
        );
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const board = result.map.board;
        const land = board.tiles.filter((tile) => tile.biome !== null);
        expect(land.length).toBe(pangeaLandCountV7(width, width));
        expect(
          board.tiles.filter((tile) => edge(board, tile.at) && tile.biome),
        ).toEqual([]);
        const loop = edgeRingLoop(board);
        expect(loop).toHaveLength(4 * (width - 1));
        loop.forEach((at, index) => {
          const next = loop[(index + 1) % loop.length] as CoordV7;
          expect(
            Math.max(Math.abs(at.x - next.x), Math.abs(at.y - next.y)),
          ).toBe(1);
          expect(board.tiles[at.y * width + at.x]?.biome).toBeNull();
        });
        // A Shorecraft boat (Shallow Water only) can sail around the island.
        expect(pangeaCoastRingV7(board)).toBe(true);
      }
    },
  );

  it("sizes the land to 72% of the board, capped at 90% of the interior", () => {
    expect(
      [11, 14, 16, 20, 25].map((width) => pangeaLandCountV7(width, width)),
    ).toEqual([72, 129, 176, 288, 450]);
  });

  it("rejects the pre-ring Pangea and a broken coast", () => {
    const old = generateInitialMapWithVillageCountV7(
      setup("PANGEA", 16, 3, 5),
      revision14VillageCountV7(setup("PANGEA", 16, 3, 5)),
      "REVISION_16",
    );
    expect(old.ok).toBe(true);
    if (!old.ok) return;
    // Pre-ring Pangea land reaches every side of the board.
    expect(pangeaCoastRingV7(old.map.board)).toBe(false);
    const current = generateInitialMapV7(setup("PANGEA", 16, 3, 5));
    expect(current.ok).toBe(true);
    if (!current.ok) return;
    const board = current.map.board;
    // A land bridge from the island to the edge breaks the ring.
    const bridge = board.tiles.map((tile) =>
      tile.at.x === 8 && tile.at.y <= 3
        ? {
            ...tile,
            biome: "PLAINS" as const,
            terrain: "GRASS" as const,
            resource: null,
          }
        : tile,
    );
    expect(pangeaCoastRingV7({ ...board, tiles: bridge })).toBe(false);
    // Deep Water cutting the coast leaves no Shallow loop around the island.
    const cut = board.tiles.map((tile) =>
      tile.biome === null && tile.at.x === 8
        ? { ...tile, terrain: "DEEP_WATER" as const }
        : tile,
    );
    expect(pangeaCoastRingV7({ ...board, tiles: cut })).toBe(false);
  });

  it("keeps the pre-ring Pangea reproducible under REVISION_16 rules", () => {
    // Hashes of the generator before the coast ring (commit ea75dae).
    const pins = [
      [
        11,
        1,
        71,
        "8772cbd9459a87dd24f0b6b3aaf8fb39c2ec2ecd06044b66f532245fe3d7b210",
      ],
      [
        16,
        3,
        5,
        "7894aa34b605917dba6f0161327b83a802128273dfe1feb269280fee4c5e5448",
      ],
      [
        25,
        2,
        9,
        "0396154ec56d758bbc9cd10d6fcadd5fc7c6930324a059b973ac69d02e408d5c",
      ],
    ] as const;
    for (const [width, aiCount, seed, hash] of pins) {
      const input = setup("PANGEA", width, aiCount, seed);
      const old = generateInitialMapWithVillageCountV7(
        input,
        revision14VillageCountV7(input),
        "REVISION_16",
      );
      expect(old.ok && canonicalMapRandomHashV7(old.map)).toBe(hash);
      const current = generateInitialMapV7(input);
      expect(current.ok && canonicalMapRandomHashV7(current.map)).not.toBe(
        hash,
      );
    }
  });

  it("leaves every other map type byte-identical", () => {
    // The coast-ring generator (`PANGEA_COAST_RING`, before the Rift of
    // `pulp_wars-9s0.5`) against the one before it.
    for (const mapType of [
      "DRY_LAND",
      "CONTINENTS",
      "ARCHIPELAGO",
      "LAKES",
    ] as const)
      for (const [width, aiCount] of SHAPES)
        for (const seed of [0, 1]) {
          const input = setup(mapType, width, aiCount, seed);
          expect(
            generateInitialMapWithVillageCountV7(
              input,
              revision14VillageCountV7(input),
              "PANGEA_COAST_RING",
            ),
          ).toEqual(
            generateInitialMapWithVillageCountV7(
              input,
              revision14VillageCountV7(input),
              "REVISION_16",
            ),
          );
        }
  }, 300_000);
});
