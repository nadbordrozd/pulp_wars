import { strict as assert } from "node:assert";
import { readFileSync, writeFileSync } from "node:fs";
import {
  RULESET_7_ID,
  canonicalHash,
  canonicalMapRandomHashV7,
  capitalGrowthReadyV7,
  generateInitialMapV7,
  generateInitialMapWithVillageCountV7,
  villageCountV7,
  type CoordV7,
  type GeneratedMapV7,
  type MapTypeV7,
} from "../src/engine/index";

const mapTypes: readonly MapTypeV7[] = [
  "DRY_LAND",
  "PANGEA",
  "CONTINENTS",
  "ARCHIPELAGO",
  "LAKES",
];
const setups = [
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
const coastlineHashes = new Map<string, Set<string>>();
// Dry Land parity pins the exact current DRY_LAND board, treasures, and
// post-generation PRNG state of every width/AI/seed cell (both relationship
// modes must agree). `--write` regenerates the file from the current
// generator after every other check passes; review its diff deliberately.
const dryParityPath = new URL(
  "../docs/validation/RULESET_7_DRY_LAND_PARITY.json",
  import.meta.url,
);
const writeDryParity = process.argv.includes("--write");
const dryParity = writeDryParity
  ? {}
  : (JSON.parse(readFileSync(dryParityPath, "utf8")) as Record<string, string>);
const dryParityActual: Record<string, string> = {};
let cases = 0;
for (const mapType of mapTypes)
  for (const [width, aiCount] of setups)
    for (const aiMode of ["RIVAL", "COOPERATIVE"] as const)
      for (let seed = 0; seed < 8; seed += 1) {
        const setup = {
          rulesetId: RULESET_7_ID,
          seed,
          width,
          height: width,
          aiCount,
          aiDifficulty: "NORMAL" as const,
          aiMode,
          humanColor: "CORAL" as const,
          factions: Array.from(
            { length: aiCount + 1 },
            () => "ORIGINAL" as const,
          ),
          // Human mirrors: the headless and test only mirror option
          // (docs/architecture/HEADLESS_SIMULATION.md).
          allowDuplicateFactions: true as const,
          mapType,
          mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2" as const,
        };
        const first = generateInitialMapV7(setup);
        const second = generateInitialMapV7(setup);
        assert(
          first.ok && second.ok,
          `${mapType}/${width}/${aiCount}/${aiMode}/${seed} failed`,
        );
        assert.equal(
          canonicalMapRandomHashV7(first.map),
          canonicalMapRandomHashV7(second.map),
        );
        assert.deepEqual(first.map, second.map);
        if (mapType === "DRY_LAND") {
          const parityKey = `${width}/${aiCount}/${seed}`;
          const parityHash = dryLandParityHash(first.map);
          assert.equal(
            parityHash,
            dryParityActual[parityKey] ?? parityHash,
            `DRY_LAND parity ${parityKey} differs between relationship modes`,
          );
          dryParityActual[parityKey] = parityHash;
          if (!writeDryParity)
            assert.equal(
              parityHash,
              dryParity[parityKey],
              `DRY_LAND parity ${parityKey}`,
            );
        }
        validate(first.map.board.tiles, width, mapType, aiCount + 1);
        // Revision 16: every capital is growth-ready (CAPITAL_GROWTH).
        for (const capital of first.map.capitals)
          assert(
            capitalGrowthReadyV7(
              first.map.board,
              capital,
              mapType !== "DRY_LAND",
            ),
            `${mapType}/${width}/${aiCount}/${seed} capital growth`,
          );
        const diversityKey = `${mapType}:${width}:${aiCount}`;
        const masks = coastlineHashes.get(diversityKey) ?? new Set<string>();
        masks.add(
          first.map.board.tiles
            .map((tile) => (tile.biome === null ? "W" : "L"))
            .join(""),
        );
        coastlineHashes.set(diversityKey, masks);
        cases += 1;
      }
for (const mapType of mapTypes.slice(1))
  for (const [width, aiCount] of setups)
    assert(
      (coastlineHashes.get(`${mapType}:${width}:${aiCount}`)?.size ?? 0) > 1,
      `${mapType}/${width}/${aiCount} coastline is seed invariant`,
    );
assert.equal(cases, 960);
// The Pangea coast ring across many more seeds: every size and AI count,
// seeds 8-63 (seeds 0-7 ran above), with the full naval validation.
let pangeaRingCases = 0;
for (const [width, aiCount] of setups)
  for (let seed = 8; seed < 64; seed += 1) {
    const generated = generateInitialMapV7({
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
      mapType: "PANGEA" as const,
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2" as const,
    });
    assert(generated.ok, `PANGEA/${width}/${aiCount}/${seed} failed`);
    validate(generated.map.board.tiles, width, "PANGEA", aiCount + 1);
    pangeaRingCases += 1;
  }
assert.equal(pangeaRingCases, setups.length * 56);
// The Rift (docs/product/RULESET_7_RIFT.md section 5) across every map
// type, size, and AI count, seeds 0-31, checked independently of the
// engine's placement rules against the same map generated without Rifts.
const riftCounts: Record<string, [number, number, number]> = {};
let riftCases = 0;
for (const mapType of mapTypes)
  for (const [width, aiCount] of setups)
    for (let seed = 0; seed < 32; seed += 1) {
      const setup = {
        rulesetId: RULESET_7_ID,
        seed,
        width,
        height: width,
        aiCount,
        aiDifficulty: "NORMAL" as const,
        aiMode: "RIVAL" as const,
        humanColor: "CORAL" as const,
        factions: Array.from(
          { length: aiCount + 1 },
          () => "ORIGINAL" as const,
        ),
        // Human mirrors: the headless and test only mirror option
        // (docs/architecture/HEADLESS_SIMULATION.md).
        allowDuplicateFactions: true as const,
        mapType,
        mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V2" as const,
      };
      const current = generateInitialMapV7(setup);
      const base = generateInitialMapWithVillageCountV7(
        setup,
        villageCountV7(setup),
        "PANGEA_COAST_RING",
      );
      assert(current.ok && base.ok, `${mapType}/${width}/${seed} failed`);
      const count = validateRifts(current.map, base.map, width);
      const label = `${mapType}/${width}`;
      const tally = (riftCounts[label] ??= [0, 0, 0]);
      tally[count] = (tally[count] ?? 0) + 1;
      if (width <= 14) assert.equal(count, 0, `${label}/${seed} has a Rift`);
      assert(count <= (width === 25 ? 2 : 1), `${label}/${seed} Rift count`);
      riftCases += 1;
    }
assert.equal(riftCases, mapTypes.length * setups.length * 32);
assert.equal(Object.keys(dryParityActual).length, setups.length * 8);
if (writeDryParity)
  writeFileSync(dryParityPath, `${JSON.stringify(dryParityActual, null, 2)}\n`);
else
  assert.deepEqual(
    Object.keys(dryParity).sort(),
    Object.keys(dryParityActual).sort(),
    "DRY_LAND parity file has missing or stale cells",
  );
console.log(
  JSON.stringify({
    cases,
    exactRepeats: cases,
    pangeaCoastRingCases: pangeaRingCases + setups.length * 16,
    riftCases,
    riftCounts,
    mapTypes,
    status: "PASS",
  }),
);

/**
 * The Rift rules, checked independently: only Rift tiles differ from the
 * map without Rifts (which was resource-free Grass, Forest, or Mountain),
 * every other generated fact is equal, each Rift is a straight 1 x 3 run off
 * the edge ring with only land around it, capitals are 3 or more and
 * villages 2 or more away, Rifts are 4 or more apart, no chest is on one,
 * and no land component (with or without Mountains) is split. Returns the
 * number of Rifts.
 */
function validateRifts(
  map: GeneratedMapV7,
  base: GeneratedMapV7,
  width: number,
): number {
  assert.deepEqual(map.capitals, base.capitals);
  assert.deepEqual(map.villages, base.villages);
  assert.deepEqual(map.treasureChests, base.treasureChests);
  assert.deepEqual(map.turnOrderSeats, base.turnOrderSeats);
  assert.deepEqual(map.random, base.random);
  const rift = new Set<string>();
  map.board.tiles.forEach((tile, index) => {
    const before = base.board.tiles[index];
    assert(before !== undefined);
    if (tile.terrain !== "RIFT") {
      assert.deepEqual(tile, before);
      return;
    }
    rift.add(key(tile.at));
    assert.deepEqual({ ...tile, terrain: before.terrain }, before);
    assert(["GRASS", "FOREST", "MOUNTAIN"].includes(before.terrain));
    assert.equal(before.resource, null);
  });
  if (rift.size === 0) {
    assert.deepEqual(map, base, "a map without a Rift is byte-identical");
    return 0;
  }
  const groups: CoordV7[][] = [];
  const seen = new Set<string>();
  for (const cell of rift) {
    if (seen.has(cell)) continue;
    const [y, x] = cell.split(",").map(Number) as [number, number];
    const group = [{ x, y }];
    seen.add(cell);
    for (let cursor = 0; cursor < group.length; cursor += 1)
      for (const near of orthogonalNeighbors(width, group[cursor] as CoordV7))
        if (rift.has(key(near)) && !seen.has(key(near))) {
          seen.add(key(near));
          group.push(near);
        }
    groups.push(group);
  }
  for (const group of groups) {
    assert.equal(group.length, 3, "a Rift is three tiles");
    const xs = new Set(group.map((at) => at.x));
    const ys = new Set(group.map((at) => at.y));
    assert(
      (xs.size === 1 && ys.size === 3) || (ys.size === 1 && xs.size === 3),
      "a Rift is a straight run",
    );
    for (const at of group) {
      assert(at.x > 0 && at.y > 0 && at.x < width - 1 && at.y < width - 1);
      for (const near of neighbors(width, at)) {
        const tile = map.board.tiles[near.y * width + near.x];
        assert(tile?.biome !== null, "a Rift touches water");
        if (tile?.terrain === "RIFT")
          assert(group.some((own) => key(own) === key(near)));
      }
      const chebyshev = (other: CoordV7) =>
        Math.max(Math.abs(other.x - at.x), Math.abs(other.y - at.y));
      assert(map.capitals.every((capital) => chebyshev(capital) >= 3));
      assert(map.villages.every((village) => chebyshev(village) >= 2));
      assert(map.treasureChests.every((chest) => key(chest) !== key(at)));
      for (const other of groups)
        if (other !== group)
          assert(other.every((there) => chebyshev(there) >= 4));
    }
  }
  for (const lowland of [false, true]) {
    const passable = (board: GeneratedMapV7["board"]) => (at: CoordV7) => {
      const tile = board.tiles[at.y * width + at.x];
      return (
        tile !== undefined &&
        tile.biome !== null &&
        tile.terrain !== "RIFT" &&
        (!lowland || tile.terrain !== "MOUNTAIN")
      );
    };
    const before = passable(base.board);
    const after = passable(map.board);
    const cells = base.board.tiles.map((tile) => tile.at).filter(before);
    const unvisited = new Set(cells.map(key));
    while (unvisited.size > 0) {
      const first = [...unvisited][0] as string;
      const [y, x] = first.split(",").map(Number) as [number, number];
      const component = flood(width, [{ x, y }], before, neighbors);
      for (const cell of component) unvisited.delete(cell);
      const remaining = [...component].filter((cell) => !rift.has(cell));
      const start = remaining[0];
      if (start === undefined) continue;
      const [sy, sx] = start.split(",").map(Number) as [number, number];
      const reached = flood(width, [{ x: sx, y: sy }], after, neighbors);
      assert(
        remaining.every((cell) => reached.has(cell)),
        `a Rift splits a land component (${lowland ? "lowland" : "land"})`,
      );
    }
  }
  return groups.length;
}

function dryLandParityHash(
  map: Parameters<typeof canonicalMapRandomHashV7>[0],
): string {
  return canonicalHash({
    board: {
      ...map.board,
      tiles: map.board.tiles.map((tile) => {
        const { fieldDefense, ...revision6Tile } = tile;
        assert.equal(
          fieldDefense,
          false,
          `DRY_LAND parity tile ${tile.at.x},${tile.at.y} has field defense`,
        );
        return revision6Tile;
      }),
    },
    treasureChests: map.treasureChests,
    random: map.random,
  });
}

function validate(
  tiles: readonly {
    readonly at: CoordV7;
    readonly biome: unknown;
    readonly terrain: string;
    readonly resource: string | null;
    readonly site: string | null;
  }[],
  width: number,
  mapType: MapTypeV7,
  players: number,
): void {
  assert.equal(tiles.length, width * width);
  const land = tiles.filter((tile) => tile.biome !== null);
  const water = tiles.filter((tile) => tile.biome === null);
  if (mapType === "DRY_LAND") {
    assert.equal(water.length, 0);
    assert(
      !tiles.some(
        (tile) => tile.resource === "FISH" || tile.resource === "PEARLS",
      ),
    );
    return;
  }
  // The Pangea coast ring: 72% of the board as land, capped at 90% of the
  // interior (the board without its edge ring): 59.5% to 72% of the board.
  if (mapType === "PANGEA")
    assert.equal(
      land.length,
      Math.min(
        Math.floor(width * width * 0.72),
        Math.floor((width - 2) * (width - 2) * 0.9),
      ),
    );
  const bounds =
    mapType === "PANGEA"
      ? [0.59, 0.76]
      : mapType === "CONTINENTS"
        ? [0.5, 0.62]
        : mapType === "ARCHIPELAGO"
          ? [0.34, 0.46]
          : [0.72, 0.84];
  assert(land.length >= Math.ceil((bounds[0] ?? 0) * tiles.length));
  assert(land.length <= Math.floor((bounds[1] ?? 1) * tiles.length));
  const landKeys = new Set(land.map((tile) => key(tile.at)));
  // Revision 16: Shallow iff an orthogonal neighbour is land; at least 25%.
  for (const tile of water) {
    const coastal = orthogonalNeighbors(width, tile.at).some((at) =>
      landKeys.has(key(at)),
    );
    assert.equal(tile.terrain, coastal ? "SHALLOW_WATER" : "DEEP_WATER");
    if (tile.resource === "FISH") assert.equal(tile.terrain, "SHALLOW_WATER");
  }
  assert(
    water.filter((tile) => tile.terrain === "SHALLOW_WATER").length >=
      Math.ceil(water.length * 0.25),
  );
  assert(
    water.filter((tile) => tile.terrain === "DEEP_WATER").length >=
      Math.max(4, Math.floor(water.length / 10)),
  );
  const landComponents = components(width, landKeys).filter(
    (component) =>
      component.length >= Math.max(6, Math.floor(tiles.length / 20)),
  );
  if (mapType === "PANGEA") assert.equal(landComponents.length, 1);
  if (mapType === "CONTINENTS")
    assert.equal(landComponents.length, players === 2 ? 2 : 3);
  if (mapType === "ARCHIPELAGO")
    assert(
      landComponents.length >= players &&
        landComponents.length <= 2 * players + 2,
    );
  if (mapType === "LAKES") {
    const waterComponents = components(
      width,
      new Set(water.map((tile) => key(tile.at))),
    );
    assert(
      waterComponents.filter(
        (component) =>
          component.length >= 4 &&
          component.every(
            (at) =>
              at.x > 0 && at.y > 0 && at.x < width - 1 && at.y < width - 1,
          ),
      ).length >= 2,
    );
    assert(
      waterComponents
        .filter((component) => component.every((at) => !edge(width, at)))
        .reduce((sum, component) => sum + component.length, 0) >=
        Math.ceil(water.length * 0.75),
    );
  }
  const allLandComponents = components(width, landKeys);
  const componentByKey = componentIndex(allLandComponents);
  const settlements = tiles.filter((tile) => tile.site !== null);
  const capitals = tiles.filter((tile) => tile.site === "CAPITAL");
  const settlementsIn = (component: readonly CoordV7[]): number => {
    const keys = new Set(component.map(key));
    return settlements.filter((tile) => keys.has(key(tile.at))).length;
  };
  if (mapType === "PANGEA") {
    const main = landComponents[0];
    assert(main !== undefined);
    assert(main.length >= Math.ceil(land.length * 0.9));
    assert.equal(settlementsIn(main), settlements.length);
    assertPangeaCoastRing(tiles, width, main, capitals);
  }
  if (mapType === "CONTINENTS") {
    assert(landComponents.every((component) => settlementsIn(component) > 0));
    assert(
      landComponents.every(
        (component) =>
          settlementsIn(component) <= Math.ceil((2 * settlements.length) / 3),
      ),
    );
    assert(
      new Set(capitals.map((tile) => componentByKey.get(key(tile.at)))).size >=
        2,
    );
  }
  if (mapType === "ARCHIPELAGO") {
    assert(landComponents.every((component) => settlementsIn(component) > 0));
    assert(
      landComponents.every(
        (component) =>
          settlementsIn(component) <= Math.ceil(settlements.length / 2),
      ),
    );
    assert.equal(
      new Set(capitals.map((tile) => componentByKey.get(key(tile.at)))).size,
      capitals.length,
    );
  }
  const waterComponents = components(
    width,
    new Set(water.map((tile) => key(tile.at))),
  );
  assert(
    waterComponents.every(
      (component) =>
        component.length > 1 &&
        (!component.some(
          (at) => tile(tiles, width, at)?.terrain === "DEEP_WATER",
        ) ||
          component.some(
            (at) => tile(tiles, width, at)?.terrain === "SHALLOW_WATER",
          )),
    ),
  );
  for (const component of landComponents) {
    const frontier = component.filter(
      (at) =>
        legalLanding(tiles, width, at) &&
        neighbors(width, at).some(
          (near) => tile(tiles, width, near)?.terrain === "SHALLOW_WATER",
        ),
    );
    const shallow = new Set(
      frontier.flatMap((at) =>
        neighbors(width, at)
          .filter(
            (near) => tile(tiles, width, near)?.terrain === "SHALLOW_WATER",
          )
          .map(key),
      ),
    );
    assert(frontier.length >= 2 && shallow.size >= 2);
  }
  assertSettlementWaterNetwork(
    tiles,
    width,
    allLandComponents,
    waterComponents,
  );
  const scores = capitals.map((capital) =>
    capitalScore(tiles, width, capital.at),
  );
  assert(scores.every((score) => score >= 6 && score <= 17));
  assert(Math.max(...scores) - Math.min(...scores) <= 5);
  for (const capital of capitals) {
    assert(capitalEconomy(tiles, width, capital.at));
    if (!usefulLandExpansion(tiles, width, capital.at))
      assert(capitalSeaEscape(tiles, width, capital.at, componentByKey));
  }
}
/**
 * The Pangea coast ring, checked independently of the engine's `COAST_RING`
 * invariant: (1) every edge cell is water, so the edge ring is a water loop a
 * Navigation boat can sail; (2) a Shorecraft boat (Shallow Water only, eight
 * directions) can sail all the way around the main landmass: the Shallow
 * cells orthogonally adjacent to it lie in one eight-connected Shallow
 * component, and no four-connected path from the board's outside through
 * cells outside that component reaches the landmass; (3) no capital is next
 * to an unreachable area: every water cell within two cells of a capital is
 * connected by water to the edge ring.
 */
function assertPangeaCoastRing(
  tiles: Parameters<typeof tile>[0],
  width: number,
  main: readonly CoordV7[],
  capitals: Parameters<typeof tile>[0],
): void {
  const isWater = (at: CoordV7): boolean => {
    const terrain = tile(tiles, width, at)?.terrain;
    return terrain === "SHALLOW_WATER" || terrain === "DEEP_WATER";
  };
  const edgeCells = tiles.filter((value) => edge(width, value.at));
  assert(
    edgeCells.every((value) => isWater(value.at)),
    "Pangea land on the edge ring",
  );
  const mainKeys = new Set(main.map(key));
  const shallow = (at: CoordV7): boolean =>
    tile(tiles, width, at)?.terrain === "SHALLOW_WATER";
  const coast = main.flatMap((at) =>
    orthogonalNeighbors(width, at).filter(shallow),
  );
  const start = coast[0];
  assert(start !== undefined, "Pangea without a coast");
  const loop = flood(width, [start], shallow, neighbors);
  assert(
    coast.every((at) => loop.has(key(at))),
    "Pangea coast split into separate Shallow Water bodies",
  );
  const outside = flood(
    width,
    edgeCells.map((value) => value.at).filter((at) => !loop.has(key(at))),
    (at) => !loop.has(key(at)),
    orthogonalNeighbors,
  );
  assert(
    [...outside].every((cell) => !mainKeys.has(cell)),
    "Pangea cannot be circumnavigated in Shallow Water",
  );
  const ring = flood(
    width,
    edgeCells.map((value) => value.at),
    isWater,
    neighbors,
  );
  for (const capital of capitals)
    for (const near of tiles)
      if (
        Math.max(
          Math.abs(near.at.x - capital.at.x),
          Math.abs(near.at.y - capital.at.y),
        ) <= 2 &&
        isWater(near.at)
      )
        assert(
          ring.has(key(near.at)),
          `Pangea capital ${capital.at.x},${capital.at.y} next to a landlocked lake`,
        );
}
function flood(
  width: number,
  starts: readonly CoordV7[],
  passable: (at: CoordV7) => boolean,
  step: (width: number, at: CoordV7) => CoordV7[],
): Set<string> {
  const seen = new Set(starts.map(key));
  const queue = [...starts];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    assert(current !== undefined);
    for (const near of step(width, current))
      if (passable(near) && !seen.has(key(near))) {
        seen.add(key(near));
        queue.push(near);
      }
  }
  return seen;
}
function components(width: number, keys: Set<string>): CoordV7[][] {
  const left = new Set(keys);
  const result: CoordV7[][] = [];
  while (left.size) {
    const value = left.values().next().value as string;
    const [y, x] = value.split(",").map(Number);
    assert(x !== undefined && y !== undefined);
    const queue = [{ x, y }];
    const part: CoordV7[] = [];
    left.delete(value);
    for (let i = 0; i < queue.length; i++) {
      const at = queue[i];
      assert(at !== undefined);
      part.push(at);
      for (const near of neighbors(width, at))
        if (left.delete(key(near))) queue.push(near);
    }
    result.push(part);
  }
  return result;
}

function componentIndex(
  parts: readonly (readonly CoordV7[])[],
): Map<string, number> {
  const result = new Map<string, number>();
  parts.forEach((part, index) =>
    part.forEach((at) => result.set(key(at), index)),
  );
  return result;
}
function tile(
  tiles: readonly {
    readonly at: CoordV7;
    readonly terrain: string;
    readonly resource: string | null;
    readonly site: string | null;
  }[],
  width: number,
  at: CoordV7,
) {
  return tiles[at.y * width + at.x];
}
function edge(width: number, at: CoordV7): boolean {
  return at.x === 0 || at.y === 0 || at.x === width - 1 || at.y === width - 1;
}
function legalLanding(
  tiles: Parameters<typeof tile>[0],
  width: number,
  at: CoordV7,
): boolean {
  const value = tile(tiles, width, at);
  return (
    value !== undefined &&
    value.terrain !== "SHALLOW_WATER" &&
    value.terrain !== "DEEP_WATER" &&
    value.terrain !== "MOUNTAIN" &&
    value.site === null
  );
}
function scoreOpportunity(value: {
  readonly terrain: string;
  readonly resource: string | null;
}): number {
  return value.resource === "FRUIT"
    ? 1
    : value.resource === "FERTILE_GROUND"
      ? 2
      : value.terrain === "FOREST"
        ? 2 + Number(value.resource === "GAME")
        : value.resource === "ORE"
          ? 2
          : value.resource === "FISH" || value.resource === "PEARLS"
            ? 1
            : 0;
}
function family(value: {
  readonly terrain: string;
  readonly resource: string | null;
}): string | null {
  if (value.resource === "FISH" || value.resource === "PEARLS") return "WATER";
  if (value.resource === "FRUIT" || value.resource === "FERTILE_GROUND")
    return "AGRICULTURE";
  if (value.terrain === "FOREST") return "TIMBER";
  if (value.resource === "ORE") return "METAL";
  return null;
}
function capitalScore(
  tiles: Parameters<typeof tile>[0],
  width: number,
  at: CoordV7,
): number {
  return neighbors(width, at).reduce((sum, near) => {
    const value = tile(tiles, width, near);
    assert(value !== undefined);
    return sum + scoreOpportunity(value);
  }, 0);
}
function capitalEconomy(
  tiles: Parameters<typeof tile>[0],
  width: number,
  at: CoordV7,
): boolean {
  const opportunities = neighbors(width, at)
    .map((near) => tile(tiles, width, near))
    .filter((value) => value !== undefined && scoreOpportunity(value) > 0);
  return (
    opportunities.length >= 3 &&
    new Set(opportunities.map(family).filter(Boolean)).size >= 2
  );
}
function usefulLandExpansion(
  tiles: Parameters<typeof tile>[0],
  width: number,
  at: CoordV7,
): boolean {
  const targets = new Set(
    tiles
      .filter((value) => value.site !== null && key(value.at) !== key(at))
      .map((value) => key(value.at)),
  );
  const seen = new Set([key(at)]);
  const queue = [{ at, distance: 0 }];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    assert(current !== undefined);
    if (current.distance > 0 && targets.has(key(current.at))) return true;
    if (current.distance >= width) continue;
    for (const near of neighbors(width, current.at)) {
      const value = tile(tiles, width, near);
      if (
        value !== undefined &&
        value.terrain !== "SHALLOW_WATER" &&
        value.terrain !== "DEEP_WATER" &&
        value.terrain !== "MOUNTAIN" &&
        !seen.has(key(near))
      ) {
        seen.add(key(near));
        queue.push({ at: near, distance: current.distance + 1 });
      }
    }
  }
  return false;
}
function capitalSeaEscape(
  tiles: Parameters<typeof tile>[0],
  width: number,
  at: CoordV7,
  componentByKey: ReadonlyMap<string, number>,
): boolean {
  const own = componentByKey.get(key(at));
  const footprint = [at, ...neighbors(width, at)];
  if (
    footprint.filter((near) => {
      const value = tile(tiles, width, near);
      return (
        value !== undefined &&
        value.terrain !== "SHALLOW_WATER" &&
        value.terrain !== "DEEP_WATER"
      );
    }).length < 4
  )
    return false;
  const starts = footprint.filter(
    (near) =>
      tile(tiles, width, near)?.terrain === "SHALLOW_WATER" &&
      neighbors(width, near).some(
        (land) => componentByKey.get(key(land)) === own,
      ),
  );
  if (starts.length === 0) return false;
  const targets = new Set<string>();
  const targetComponents = new Set(
    tiles
      .filter(
        (value) =>
          value.site !== null && componentByKey.get(key(value.at)) !== own,
      )
      .map((value) => componentByKey.get(key(value.at)))
      .filter((value): value is number => value !== undefined),
  );
  for (const component of targetComponents) {
    const startsOnLand = tiles
      .filter(
        (value) =>
          value.site !== null &&
          componentByKey.get(key(value.at)) === component,
      )
      .map((value) => value.at);
    const reached = new Set(startsOnLand.map(key));
    const landQueue = [...startsOnLand];
    const landings = new Set<string>();
    for (let cursor = 0; cursor < landQueue.length; cursor += 1) {
      const current = landQueue[cursor];
      assert(current !== undefined);
      if (
        legalLanding(tiles, width, current) &&
        neighbors(width, current).some(
          (water) => tile(tiles, width, water)?.terrain === "SHALLOW_WATER",
        )
      )
        landings.add(key(current));
      for (const near of neighbors(width, current)) {
        const value = tile(tiles, width, near);
        if (
          componentByKey.get(key(near)) === component &&
          value?.terrain !== "MOUNTAIN" &&
          !reached.has(key(near))
        ) {
          reached.add(key(near));
          landQueue.push(near);
        }
      }
    }
    if (landings.size >= 2)
      for (const landing of landings) targets.add(landing);
  }
  const seen = new Set(starts.map(key));
  const queue = starts.map((start) => ({ at: start, distance: 0 }));
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    assert(current !== undefined);
    if (neighbors(width, current.at).some((near) => targets.has(key(near))))
      return true;
    if (current.distance >= Math.max(5, width - 2)) continue;
    for (const near of neighbors(width, current.at)) {
      const terrain = tile(tiles, width, near)?.terrain;
      if (
        (terrain === "SHALLOW_WATER" || terrain === "DEEP_WATER") &&
        !seen.has(key(near))
      ) {
        seen.add(key(near));
        queue.push({ at: near, distance: current.distance + 1 });
      }
    }
  }
  return false;
}
function assertSettlementWaterNetwork(
  tiles: Parameters<typeof tile>[0],
  width: number,
  landParts: readonly (readonly CoordV7[])[],
  waterParts: readonly (readonly CoordV7[])[],
): void {
  const index = componentIndex(landParts);
  const inhabited = new Set(
    tiles
      .filter((value) => value.site !== null)
      .map((value) => index.get(key(value.at)))
      .filter((value): value is number => value !== undefined),
  );
  if (inhabited.size <= 1) return;
  const ports = new Map<number, Set<string>>();
  for (const component of inhabited) {
    const values = new Set<string>();
    for (const settlement of tiles.filter(
      (value) => value.site !== null && index.get(key(value.at)) === component,
    ))
      for (const candidate of tiles)
        if (
          Math.max(
            Math.abs(candidate.at.x - settlement.at.x),
            Math.abs(candidate.at.y - settlement.at.y),
          ) <= 2 &&
          candidate.terrain === "SHALLOW_WATER" &&
          neighbors(width, candidate.at).some(
            (land) => index.get(key(land)) === component,
          )
        )
          values.add(key(candidate.at));
    assert(values.size > 0);
    ports.set(component, values);
  }
  const edges = new Map<number, Set<number>>();
  for (const water of waterParts) {
    const waterKeys = new Set(water.map(key));
    const touched = new Set<number>();
    for (const component of inhabited)
      if ([...(ports.get(component) ?? [])].some((port) => waterKeys.has(port)))
        touched.add(component);
    for (const left of touched)
      for (const right of touched)
        if (left !== right) {
          const current = edges.get(left) ?? new Set<number>();
          current.add(right);
          edges.set(left, current);
        }
  }
  const first = inhabited.values().next().value;
  assert(first !== undefined);
  const seen = new Set([first]);
  const queue = [first];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    assert(current !== undefined);
    for (const next of edges.get(current) ?? [])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  }
  assert.equal(seen.size, inhabited.size);
}
function orthogonalNeighbors(width: number, at: CoordV7): CoordV7[] {
  return [
    { x: at.x, y: at.y - 1 },
    { x: at.x + 1, y: at.y },
    { x: at.x, y: at.y + 1 },
    { x: at.x - 1, y: at.y },
  ].filter(
    (near) => near.x >= 0 && near.y >= 0 && near.x < width && near.y < width,
  );
}

function neighbors(width: number, at: CoordV7): CoordV7[] {
  const out: CoordV7[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = at.x + dx,
        y = at.y + dy;
      if (x >= 0 && y >= 0 && x < width && y < width) out.push({ x, y });
    }
  return out;
}
function key(at: CoordV7): string {
  return `${at.y},${at.x}`;
}
