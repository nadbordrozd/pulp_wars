import { describe, expect, it } from "vitest";
import {
  BIOME_IDS_V7,
  RESOURCE_IDS_V7,
  TERRAIN_IDS_V7,
  applySettlementFloorsV7,
  assignRegionsV7,
  canonicalMapRandomHashV7,
  cohereTerrainsV7,
  generateInitialMapV7,
  mapGenerationFailureV7,
  parseGameStateV7,
  regionCountV7,
  resourceForBiomeTerrainV7,
  selectRegionSeedsV7,
  terrainForBiomeV7,
  type BoardStateV7,
  type CoordV7,
  type TerrainIdV7,
} from "../../src/engine/index";
import { initialV7, setupV7 } from "../fixtures/v7-builders";

const threshold = (percent: number) =>
  Math.floor((percent * 0x1_0000_0000) / 100);

describe("ruleset-7 revision-4 regional biome map", () => {
  it("uses exact integer categorical boundaries", () => {
    expect(terrainForBiomeV7("PLAINS", 0)).toBe("GRASS");
    expect(terrainForBiomeV7("PLAINS", threshold(68) - 1)).toBe("GRASS");
    expect(terrainForBiomeV7("PLAINS", threshold(68))).toBe("FOREST");
    expect(terrainForBiomeV7("PLAINS", threshold(91))).toBe("MOUNTAIN");
    expect(terrainForBiomeV7("PLAINS", 0xffff_ffff)).toBe("MOUNTAIN");
    expect(
      resourceForBiomeTerrainV7("HIGHLANDS", "MOUNTAIN", threshold(68) - 1),
    ).toBe("ORE");
    expect(
      resourceForBiomeTerrainV7("HIGHLANDS", "MOUNTAIN", threshold(68)),
    ).toBeNull();
    expect(resourceForBiomeTerrainV7("WOODLAND", "GRASS", threshold(17))).toBe(
      "FERTILE_GROUND",
    );
    expect(
      resourceForBiomeTerrainV7("WOODLAND", "GRASS", threshold(30)),
    ).toBeNull();
  });

  it("covers every biome terrain and resource threshold exactly", () => {
    const terrainWeights = {
      PLAINS: [68, 91],
      WOODLAND: [32, 88],
      HIGHLANDS: [32, 55],
    } as const;
    const grassWeights = {
      PLAINS: [26, 50],
      WOODLAND: [17, 30],
      HIGHLANDS: [12, 22],
    } as const;
    const forestWeights = { PLAINS: 28, WOODLAND: 48, HIGHLANDS: 30 } as const;
    const mountainWeights = {
      PLAINS: 30,
      WOODLAND: 38,
      HIGHLANDS: 68,
    } as const;
    for (const biome of BIOME_IDS_V7) {
      const [grassEnd, forestEnd] = terrainWeights[biome];
      expect(terrainForBiomeV7(biome, 0)).toBe("GRASS");
      expect(terrainForBiomeV7(biome, threshold(grassEnd) - 1)).toBe("GRASS");
      expect(terrainForBiomeV7(biome, threshold(grassEnd))).toBe("FOREST");
      expect(terrainForBiomeV7(biome, threshold(forestEnd) - 1)).toBe("FOREST");
      expect(terrainForBiomeV7(biome, threshold(forestEnd))).toBe("MOUNTAIN");
      expect(terrainForBiomeV7(biome, 0xffff_ffff)).toBe("MOUNTAIN");
      const [fruitEnd, fertileEnd] = grassWeights[biome];
      expect(resourceForBiomeTerrainV7(biome, "GRASS", 0)).toBe("FRUIT");
      expect(
        resourceForBiomeTerrainV7(biome, "GRASS", threshold(fruitEnd) - 1),
      ).toBe("FRUIT");
      expect(
        resourceForBiomeTerrainV7(biome, "GRASS", threshold(fruitEnd)),
      ).toBe("FERTILE_GROUND");
      expect(
        resourceForBiomeTerrainV7(biome, "GRASS", threshold(fertileEnd) - 1),
      ).toBe("FERTILE_GROUND");
      expect(
        resourceForBiomeTerrainV7(biome, "GRASS", threshold(fertileEnd)),
      ).toBeNull();
      expect(resourceForBiomeTerrainV7(biome, "GRASS", 0xffff_ffff)).toBeNull();
      for (const [terrain, end, resource] of [
        ["FOREST", forestWeights[biome], "GAME"],
        ["MOUNTAIN", mountainWeights[biome], "ORE"],
      ] as const) {
        expect(resourceForBiomeTerrainV7(biome, terrain, 0)).toBe(resource);
        expect(
          resourceForBiomeTerrainV7(biome, terrain, threshold(end) - 1),
        ).toBe(resource);
        expect(
          resourceForBiomeTerrainV7(biome, terrain, threshold(end)),
        ).toBeNull();
        expect(
          resourceForBiomeTerrainV7(biome, terrain, 0xffff_ffff),
        ).toBeNull();
      }
    }
  });

  it("is deterministic and enforces global and settlement invariants", () => {
    const first = generateInitialMapV7(setupV7(0, 3));
    const second = generateInitialMapV7(setupV7(0, 3));
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(canonicalMapRandomHashV7(first.map)).toBe(
      canonicalMapRandomHashV7(second.map),
    );
    expect(first.map).toEqual(second.map);
    expect(canonicalMapRandomHashV7(first.map)).toBe(
      "35b59252cbfa05ea40713b837db740e891cd220795f3d3d9e67a55ad446afae6",
    );
    expect(new Set(first.map.board.tiles.map((tile) => tile.biome))).toEqual(
      new Set(BIOME_IDS_V7),
    );
    expect(new Set(first.map.board.tiles.map((tile) => tile.terrain))).toEqual(
      new Set(TERRAIN_IDS_V7),
    );
    expect(
      new Set(first.map.board.tiles.flatMap((tile) => tile.resource ?? [])),
    ).toEqual(new Set(RESOURCE_IDS_V7));
    expect(first.map.capitals).toHaveLength(4);
    expect(first.map.villages).toHaveLength(6);
    expect([...first.map.turnOrderSeats].sort()).toEqual([0, 1, 2, 3]);
    const settlements = [...first.map.capitals, ...first.map.villages];
    expect(minimumChebyshevSpacing(settlements)).toBeGreaterThanOrEqual(3);
    expect(minimumChebyshevSpacing(first.map.capitals)).toBeGreaterThanOrEqual(
      8,
    );
    const capitalScores = first.map.capitals.map((at) =>
      scoreCapital(first.map.board, at),
    );
    expect(Math.min(...capitalScores)).toBeGreaterThanOrEqual(6);
    expect(Math.max(...capitalScores)).toBeLessThanOrEqual(17);
    expect(
      Math.max(...capitalScores) - Math.min(...capitalScores),
    ).toBeLessThanOrEqual(5);
    const firstCapital = first.map.capitals[0];
    if (firstCapital === undefined) throw new Error("capital missing");
    expect(passableReachSize(first.map.board, firstCapital)).toBeGreaterThan(0);
    expect(
      first.map.capitals.every((at) =>
        passableReach(first.map.board, firstCapital).has(key(at)),
      ),
    ).toBe(true);
    expect(first.map.regionSizes).toHaveLength(4);
    expect(first.map.regionSizes.reduce((sum, size) => sum + size, 0)).toBe(
      first.map.board.tiles.length,
    );
    expect(regionCountV7(11, 11)).toBe(3);
    expect(regionCountV7(16, 16)).toBe(4);
    expect(regionCountV7(25, 25)).toBe(10);
    for (const settlement of first.map.board.tiles.filter(
      (tile) => tile.site !== null,
    )) {
      const ring = first.map.board.tiles.filter(
        (tile) =>
          Math.max(
            Math.abs(tile.at.x - settlement.at.x),
            Math.abs(tile.at.y - settlement.at.y),
          ) === 1,
      );
      const families = new Set(
        ring.flatMap((tile) =>
          tile.resource === "FRUIT" || tile.resource === "FERTILE_GROUND"
            ? ["A"]
            : tile.terrain === "FOREST"
              ? ["T"]
              : tile.resource === "ORE"
                ? ["M"]
                : [],
        ),
      );
      expect(
        ring.filter(
          (tile) =>
            tile.resource === "FRUIT" ||
            tile.resource === "FERTILE_GROUND" ||
            tile.terrain === "FOREST" ||
            tile.resource === "ORE",
        ).length,
      ).toBeGreaterThanOrEqual(3);
      expect(families.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses rank for farthest-point ties and the earlier seed for Manhattan ties", () => {
    const candidates = [
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 3 },
      { x: 3, y: 3 },
    ] as const;
    const ranks = new Map([
      ["0,0", 0],
      ["0,3", 3],
      ["3,0", 2],
      ["3,3", 1],
    ]);
    expect(selectRegionSeedsV7(candidates, ranks, 3)).toEqual([
      { x: 0, y: 0 },
      { x: 3, y: 3 },
      { x: 0, y: 3 },
    ]);
    expect(
      assignRegionsV7(
        [{ x: 1, y: 0 }],
        [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
        ],
      ).get("0,1"),
    ).toBe(0);
  });

  it("creates exact four-way-connected Manhattan regions", () => {
    const coords = Array.from({ length: 15 }, (_, index) => ({
      x: index % 5,
      y: Math.floor(index / 5),
    }));
    const regions = assignRegionsV7(coords, [
      { x: 0, y: 1 },
      { x: 4, y: 1 },
    ]);
    expect(coords.map((at) => regions.get(key(at)))).toEqual([
      0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1,
    ]);
    for (const region of [0, 1])
      expect(fourWayRegionSize(coords, regions, region)).toBe(
        coords.filter((at) => regions.get(key(at)) === region).length,
      );
  });

  it("applies cohesion simultaneously without feeding an earlier edit back", () => {
    const coords = Array.from({ length: 12 }, (_, index) => ({
      x: index % 4,
      y: Math.floor(index / 4),
    }));
    const base = new Map<string, TerrainIdV7>(
      coords.map((at) => [key(at), "MOUNTAIN"]),
    );
    const first = { x: 1, y: 1 };
    const second = { x: 2, y: 1 };
    base.set(key(first), "GRASS");
    for (const at of [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ])
      base.set(key(at), "FOREST");
    const regions = new Map(coords.map((at) => [key(at), 0]));
    const cohesive = cohereTerrainsV7(4, 3, [first, second], regions, base);
    expect(cohesive.get(key(first))).toBe("FOREST");
    expect(cohesive.get(key(second))).toBe("MOUNTAIN");
    expect(base.get(key(first))).toBe("GRASS");
  });

  it("uses the lowest-rank eligible settlement-floor donor", () => {
    const center = { x: 1, y: 1 };
    const coords = Array.from({ length: 9 }, (_, index) => ({
      x: index % 3,
      y: Math.floor(index / 3),
    }));
    const board = {
      width: 3,
      height: 3,
      tiles: coords.map((at) => ({
        at,
        biome: "PLAINS" as const,
        terrain: "GRASS" as const,
        resource: at.x === 2 && at.y === 2 ? ("FERTILE_GROUND" as const) : null,
        improvement: null,
        road: false,
        site: at.x === 1 && at.y === 1 ? ("CAPITAL" as const) : null,
        territoryCityId: null,
      })),
    } as unknown as BoardStateV7;
    const rank = new Map(coords.map((at, index) => [key(at), index]));
    applySettlementFloorsV7(board, [center], rank);
    expect(board.tiles[0]).toMatchObject({
      terrain: "GRASS",
      resource: "FERTILE_GROUND",
    });
    expect(board.tiles[1]).toMatchObject({
      terrain: "FOREST",
      resource: null,
    });
  });

  it("continues the rejected PRNG stream without extra resource draws", () => {
    const generated = generateInitialMapV7(setupV7(1, 3));
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(generated.map.attempt).toBe(14);
    expect(generated.map.attempts).toHaveLength(14);
    const settlementCount =
      generated.map.capitals.length + generated.map.villages.length;
    for (const [index, attempt] of generated.map.attempts.entries()) {
      expect(attempt.attempt).toBe(index + 1);
      expect(attempt.resourceDrawCount).toBe(
        generated.map.board.tiles.length - settlementCount,
      );
      if (index > 0)
        expect(attempt.initialRandomState).toBe(
          generated.map.attempts[index - 1]?.finalRandomState,
        );
      expect(attempt.failures.length === 0).toBe(index === 13);
    }
  });

  it("freezes the attempt-256 terminal failure shape", () => {
    expect(mapGenerationFailureV7(setupV7(7, 2), "CAPITAL_SCORE")).toEqual({
      ok: false,
      error: {
        code: "MAP_GENERATION_FAILED",
        params: {
          seed: 7,
          width: 14,
          height: 14,
          attempts: 256,
          lastFailure: "CAPITAL_SCORE",
        },
      },
    });
  });

  it("strictly rejects missing or malformed biome and Ore state", () => {
    const state = initialV7(2);
    const missingBiome = structuredClone(state) as unknown as {
      board: { tiles: Record<string, unknown>[] };
    };
    delete missingBiome.board.tiles[0]?.biome;
    expect(parseGameStateV7(missingBiome)).toBeNull();

    const unknownBiome = structuredClone(state) as unknown as {
      board: { tiles: Record<string, unknown>[] };
    };
    if (unknownBiome.board.tiles[0] !== undefined)
      unknownBiome.board.tiles[0].biome = "TUNDRA";
    expect(parseGameStateV7(unknownBiome)).toBeNull();

    const wrongOreTerrain = structuredClone(state) as unknown as {
      board: { tiles: Record<string, unknown>[] };
    };
    if (wrongOreTerrain.board.tiles[0] !== undefined) {
      wrongOreTerrain.board.tiles[0].terrain = "GRASS";
      wrongOreTerrain.board.tiles[0].resource = "ORE";
      wrongOreTerrain.board.tiles[0].site = null;
      wrongOreTerrain.board.tiles[0].improvement = null;
      wrongOreTerrain.board.tiles[0].road = false;
    }
    expect(parseGameStateV7(wrongOreTerrain)).toBeNull();
  });
});

function key(at: CoordV7): string {
  return `${at.y},${at.x}`;
}

function fourWayRegionSize(
  coords: readonly CoordV7[],
  regions: ReadonlyMap<string, number>,
  region: number,
): number {
  const target = coords.filter((at) => regions.get(key(at)) === region);
  const pending = target.slice(0, 1);
  const visited = new Set(pending.map(key));
  while (pending.length > 0) {
    const at = pending.shift() as CoordV7;
    for (const near of target)
      if (
        Math.abs(near.x - at.x) + Math.abs(near.y - at.y) === 1 &&
        !visited.has(key(near))
      ) {
        visited.add(key(near));
        pending.push(near);
      }
  }
  return visited.size;
}

function minimumChebyshevSpacing(coords: readonly CoordV7[]): number {
  return Math.min(
    ...coords.flatMap((left, index) =>
      coords
        .slice(index + 1)
        .map((right) =>
          Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y)),
        ),
    ),
  );
}

function scoreCapital(board: BoardStateV7, at: CoordV7): number {
  return neighbors8(board, at).reduce((sum, near) => {
    const tile = board.tiles[near.y * board.width + near.x];
    if (tile === undefined) throw new Error("neighbor missing");
    return (
      sum +
      (tile.resource === "FRUIT"
        ? 1
        : tile.resource === "FERTILE_GROUND"
          ? 2
          : tile.terrain === "FOREST"
            ? 2 + Number(tile.resource === "GAME")
            : tile.resource === "ORE"
              ? 2
              : 0)
    );
  }, 0);
}

function passableReachSize(board: BoardStateV7, start: CoordV7): number {
  return passableReach(board, start).size;
}

function passableReach(
  board: BoardStateV7,
  start: CoordV7,
): ReadonlySet<string> {
  const seen = new Set([key(start)]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const at = queue[index];
    if (at === undefined) throw new Error("reach coordinate missing");
    for (const near of neighbors8(board, at))
      if (
        board.tiles[near.y * board.width + near.x]?.terrain !== "MOUNTAIN" &&
        !seen.has(key(near))
      ) {
        seen.add(key(near));
        queue.push(near);
      }
  }
  return seen;
}

function neighbors8(board: BoardStateV7, at: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (
    let y = Math.max(0, at.y - 1);
    y <= Math.min(board.height - 1, at.y + 1);
    y += 1
  )
    for (
      let x = Math.max(0, at.x - 1);
      x <= Math.min(board.width - 1, at.x + 1);
      x += 1
    )
      if (x !== at.x || y !== at.y) result.push({ x, y });
  return result;
}
