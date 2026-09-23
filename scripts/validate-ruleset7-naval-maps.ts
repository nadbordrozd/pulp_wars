import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import {
  RULESET_7_ID,
  canonicalMapRandomHashV7,
  generateInitialMapV7,
  type CoordV7,
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
const dryParity = JSON.parse(
  readFileSync(
    new URL(
      "../docs/validation/RULESET_7_DRY_LAND_PARITY.json",
      import.meta.url,
    ),
    "utf8",
  ),
) as Record<string, string>;
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
          mapType,
          mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V1" as const,
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
        if (mapType === "DRY_LAND")
          assert.equal(
            canonicalMapRandomHashV7(first.map),
            dryParity[`${width}/${aiCount}/${seed}`],
            `DRY_LAND parity ${width}/${aiCount}/${seed}`,
          );
        validate(first.map.board.tiles, width, mapType, aiCount + 1);
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
console.log(
  JSON.stringify({ cases, exactRepeats: cases, mapTypes, status: "PASS" }),
);

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
  const bounds =
    mapType === "PANGEA"
      ? [0.68, 0.76]
      : mapType === "CONTINENTS"
        ? [0.5, 0.62]
        : mapType === "ARCHIPELAGO"
          ? [0.34, 0.46]
          : [0.72, 0.84];
  assert(land.length >= Math.ceil((bounds[0] ?? 0) * tiles.length));
  assert(land.length <= Math.floor((bounds[1] ?? 1) * tiles.length));
  const landKeys = new Set(land.map((tile) => key(tile.at)));
  for (const tile of water) {
    const coastal = neighbors(width, tile.at).some((at) =>
      landKeys.has(key(at)),
    );
    assert.equal(tile.terrain, coastal ? "SHALLOW_WATER" : "DEEP_WATER");
    if (tile.resource === "FISH") assert.equal(tile.terrain, "SHALLOW_WATER");
  }
  assert(
    water.filter((tile) => tile.terrain === "SHALLOW_WATER").length >=
      Math.ceil(water.length * 0.4),
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
