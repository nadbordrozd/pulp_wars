import { deepFreeze } from "../model/freeze";
import { allocateCityId, allocateUnitId, cityId, playerId } from "../model/ids";
import { nextBounded, nextUint32, randomState } from "../random/random";
import { canonicalHash } from "../replay/canonical";
import { ORIGINAL_BASELINE_V5_TREE, RULESET_7 } from "../rules/ruleset-v7";
import { placeTreasureChestsV6 } from "../v6/map";
import { parseMatchSetupV7 } from "./setup";
import { parseGameStateV7 } from "./state-schema";
import {
  BIOME_IDS_V7,
  RESOURCE_IDS_V7,
  RULESET_7_ID,
  TERRAIN_IDS_V7,
  type AiCountV7,
  type BiomeIdV7,
  type BoardStateV7,
  type CityStateV7,
  type CoordV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerColorV7,
  type PlayerStateV7,
  type RandomStateV7,
  type ResourceIdV7,
  type TerrainIdV7,
  type TileStateV7,
  type UnitStateV7,
} from "./types";

export const MAX_MAP_GENERATION_ATTEMPTS_V7 = 256;
export const MAP_GENERATION_REVISION_V7 = "REGIONAL_BIOMES_NAVAL_V2" as const;
export type MapInvariantCodeV7 =
  | "TILE_LAYOUT"
  | "SETTLEMENT_COUNT"
  | "SETTLEMENT_EMPTY_GRASS"
  | "SETTLEMENT_SPACING"
  | "CAPITAL_SPACING"
  | "BIOME_PRESENCE"
  | "REGION_COUNT"
  | "REGION_CONNECTIVITY"
  | "RESOURCE_TERRAIN"
  | "RESOURCE_GLOBAL_PRESENCE"
  | "TERRAIN_GLOBAL_PRESENCE"
  | "SETTLEMENT_OPPORTUNITY_MINIMUM"
  | "SETTLEMENT_FAMILY_MINIMUM"
  | "CAPITAL_GRASS_NEIGHBORS"
  | "CAPITALS_DISCONNECTED"
  | "CAPITAL_SCORE"
  | "NAVAL_TOPOLOGY"
  | "NAVAL_REACHABILITY"
  | "COASTAL_SETTLEMENT"
  | "CAPITAL_SEA_ESCAPE";

export interface MapGenerationAttemptV7 {
  readonly attempt: number;
  readonly initialRandomState: number;
  readonly resourceRandomState: number;
  readonly finalRandomState: number;
  readonly topologyDrawCount: number;
  readonly landResourceDrawCount: number;
  readonly waterResourceDrawCount: number;
  readonly resourceDrawCount: number;
  readonly failures: readonly MapInvariantCodeV7[];
}
export interface GeneratedMapV7 {
  readonly board: BoardStateV7;
  readonly capitals: readonly CoordV7[];
  readonly villages: readonly CoordV7[];
  readonly capitalAssignments: readonly CoordV7[];
  readonly turnOrderSeats: readonly number[];
  readonly treasureChests: readonly CoordV7[];
  readonly random: RandomStateV7;
  readonly attempt: number;
  readonly attempts: readonly MapGenerationAttemptV7[];
  /** Aggregate generated-region sizes; internal region identities stay out of game state. */
  readonly regionSizes: readonly number[];
}
export type GenerateMapResultV7 =
  | { readonly ok: true; readonly map: GeneratedMapV7 }
  | {
      readonly ok: false;
      readonly error:
        | {
            readonly code: "INVALID_SETUP";
            readonly params: Readonly<Record<string, never>>;
          }
        | {
            readonly code: "MAP_GENERATION_FAILED";
            readonly params: Readonly<{
              seed: number;
              width: number;
              height: number;
              attempts: 256;
              lastFailure: MapInvariantCodeV7;
            }>;
          };
    };
interface Candidate {
  readonly board: BoardStateV7;
  readonly capitals: readonly CoordV7[];
  readonly villages: readonly CoordV7[];
  readonly capitalAssignments: readonly CoordV7[];
  readonly turnOrderSeats: readonly number[];
  readonly random: RandomStateV7;
  readonly resourceRandomState: number;
  readonly resourceDrawCount: number;
  readonly topologyDrawCount: number;
  readonly landResourceDrawCount: number;
  readonly waterResourceDrawCount: number;
  readonly regionByKey: ReadonlyMap<string, number>;
  readonly seeds: readonly CoordV7[];
  readonly navalPlacementFailed: boolean;
}
const COLORS: readonly PlayerColorV7[] = ["CORAL", "TEAL", "GOLD", "VIOLET"];
const STANDARD: Readonly<Record<AiCountV7, number>> = { 1: 3, 2: 4, 3: 6 };
const LARGE: Readonly<Record<AiCountV7, number>> = { 1: 13, 2: 12, 3: 11 };
const HUGE: Readonly<Record<AiCountV7, number>> = { 1: 20, 2: 19, 3: 18 };

export function regionCountV7(width: number, height: number): number {
  return Math.max(3, Math.floor((width * height + 32) / 64));
}
export function terrainForBiomeV7(biome: BiomeIdV7, draw: number): TerrainIdV7 {
  uint32(draw);
  const weights =
    biome === "PLAINS" ? [68, 23] : biome === "WOODLAND" ? [32, 56] : [32, 23];
  return draw < threshold(weights[0] ?? 0)
    ? "GRASS"
    : draw < threshold((weights[0] ?? 0) + (weights[1] ?? 0))
      ? "FOREST"
      : "MOUNTAIN";
}
export function resourceForBiomeTerrainV7(
  biome: BiomeIdV7,
  terrain: TerrainIdV7,
  draw: number,
): ResourceIdV7 | null {
  uint32(draw);
  if (terrain === "GRASS") {
    const pair =
      biome === "PLAINS"
        ? [26, 24]
        : biome === "WOODLAND"
          ? [17, 13]
          : [12, 10];
    const fruit = pair[0] ?? 0;
    const fertile = pair[1] ?? 0;
    return draw < threshold(fruit)
      ? "FRUIT"
      : draw < threshold(fruit + fertile)
        ? "FERTILE_GROUND"
        : null;
  }
  if (terrain === "FOREST")
    return draw <
      threshold(biome === "PLAINS" ? 28 : biome === "WOODLAND" ? 48 : 30)
      ? "GAME"
      : null;
  return draw <
    threshold(biome === "PLAINS" ? 30 : biome === "WOODLAND" ? 38 : 68)
    ? "ORE"
    : null;
}

export function generateInitialMapV7(input: unknown): GenerateMapResultV7 {
  const setup = parseMatchSetupV7(input);
  if (setup === null)
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  let random = randomState(setup.seed);
  let lastFailure: MapInvariantCodeV7 = "TILE_LAYOUT";
  const attempts: MapGenerationAttemptV7[] = [];
  for (let attempt = 1; attempt <= 256; attempt += 1) {
    const initialRandomState = random.state;
    const candidate = generateCandidate(setup, random);
    random = candidate.random;
    const failures = validate(candidate, setup);
    attempts.push({
      attempt,
      initialRandomState,
      resourceRandomState: candidate.resourceRandomState,
      finalRandomState: random.state,
      topologyDrawCount: candidate.topologyDrawCount,
      landResourceDrawCount: candidate.landResourceDrawCount,
      waterResourceDrawCount: candidate.waterResourceDrawCount,
      resourceDrawCount: candidate.resourceDrawCount,
      failures,
    });
    if (failures.length === 0) {
      const treasure = placeTreasureChestsV6(
        (setup.mapType === "DRY_LAND"
          ? candidate.board
          : {
              ...candidate.board,
              tiles: candidate.board.tiles.map((tile) =>
                tile.biome === null ? { ...tile, terrain: "MOUNTAIN" } : tile,
              ),
            }) as never,
        candidate.capitals,
        random,
      );
      return {
        ok: true,
        map: deepFreeze({
          board: candidate.board,
          capitals: candidate.capitals,
          villages: candidate.villages,
          capitalAssignments: candidate.capitalAssignments,
          turnOrderSeats: candidate.turnOrderSeats,
          treasureChests: treasure.treasureChests,
          random: treasure.random,
          attempt,
          attempts,
          regionSizes: candidate.seeds.map(
            (_, region) =>
              candidate.board.tiles.filter(
                (tile) => candidate.regionByKey.get(key(tile.at)) === region,
              ).length,
          ),
        }),
      };
    }
    lastFailure = failures[0] ?? lastFailure;
  }
  return mapGenerationFailureV7(setup, lastFailure);
}

export function mapGenerationFailureV7(
  setup: MatchSetupV7,
  lastFailure: MapInvariantCodeV7,
): Extract<GenerateMapResultV7, { readonly ok: false }> {
  return {
    ok: false,
    error: {
      code: "MAP_GENERATION_FAILED",
      params: {
        seed: setup.seed,
        width: setup.width,
        height: setup.height,
        attempts: 256,
        lastFailure,
      },
    },
  };
}

function generateCandidate(
  setup: MatchSetupV7,
  initial: RandomStateV7,
): Candidate {
  let random = initial;
  const topologyDraws = new Map<string, number>();
  if (setup.mapType !== "DRY_LAND")
    for (const at of allCoords(setup.width, setup.height)) {
      const draw = nextUint32(random);
      random = draw.random;
      topologyDraws.set(key(at), draw.value);
    }
  const navalLand =
    setup.mapType === "DRY_LAND" ? null : topologyMaskV7(setup, topologyDraws);
  let offset = 0;
  if (setup.width === 16) {
    const draw = nextBounded(random, 3);
    offset = draw.value;
    random = draw.random;
  }
  const axis: number[] = [];
  for (let value = 2 + offset; value < setup.width - 2; value += 3)
    axis.push(value);
  const low = axis[0];
  const high = axis.at(-1);
  if (low === undefined || high === undefined)
    throw new RangeError("Missing settlement lattice");
  const corners = shuffle(
    [
      { x: low, y: low },
      { x: high, y: low },
      { x: low, y: high },
      { x: high, y: high },
    ],
    random,
  );
  random = corners.random;
  const capitals = corners.values.slice(0, setup.aiCount + 1);
  const capitalKeys = new Set(capitals.map(key));
  const candidates = axis
    .flatMap((y) => axis.map((x) => ({ x, y })))
    .filter((at) => !capitalKeys.has(key(at)))
    .sort(compareCoords);
  const villageShuffle = shuffle(candidates, random);
  random = villageShuffle.random;
  const villages = villageShuffle.values.slice(0, villageCount(setup));
  let assignment =
    setup.mapType === "DRY_LAND"
      ? shuffle(capitals, random)
      : { values: [...capitals], random };
  random = assignment.random;
  let turnOrder =
    setup.mapType === "DRY_LAND"
      ? shuffle(
          Array.from({ length: setup.aiCount + 1 }, (_, seat) => seat),
          random,
        )
      : {
          values: Array.from({ length: setup.aiCount + 1 }, (_, seat) => seat),
          random,
        };
  random = turnOrder.random;
  const sites = new Map<string, TileStateV7["site"]>();
  for (const at of capitals) sites.set(key(at), "CAPITAL");
  for (const at of villages) sites.set(key(at), "VILLAGE");
  const coords = allCoords(setup.width, setup.height);
  const fieldSites = setup.mapType === "DRY_LAND" ? sites : new Map();
  const nonSettlements = coords.filter(
    (at) =>
      !fieldSites.has(key(at)) &&
      (navalLand === null || navalLand.has(key(at))),
  );
  const ranked = shuffle(nonSettlements, random);
  random = ranked.random;
  const rank = new Map(ranked.values.map((at, index) => [key(at), index]));
  const seeds = selectRegionSeedsV7(
    nonSettlements,
    rank,
    regionCountV7(setup.width, setup.height),
  );
  const labels = shuffle(
    seeds.map((_, index) => BIOME_IDS_V7[index % 3] as BiomeIdV7),
    random,
  );
  random = labels.random;
  const fieldCoords = navalLand === null ? coords : nonSettlements;
  const regions = assignRegionsV7(fieldCoords, seeds);
  const biomes = new Map<string, BiomeIdV7>();
  for (const at of fieldCoords) {
    const region = regions.get(key(at)) as number;
    biomes.set(key(at), labels.values[region] as BiomeIdV7);
  }
  const base = new Map<string, TerrainIdV7>();
  for (const at of fieldCoords)
    if (fieldSites.has(key(at))) base.set(key(at), "GRASS");
    else {
      const draw = nextUint32(random);
      random = draw.random;
      base.set(
        key(at),
        terrainForBiomeV7(biomes.get(key(at)) as BiomeIdV7, draw.value),
      );
    }
  const terrains = cohereTerrainsV7(
    setup.width,
    setup.height,
    nonSettlements,
    regions,
    base,
  );
  const resourceRandomState = random.state;
  const resources = new Map<string, ResourceIdV7 | null>();
  const resourceDraws = new Map<string, number>();
  for (const at of fieldCoords)
    if (fieldSites.has(key(at))) resources.set(key(at), null);
    else {
      const draw = nextUint32(random);
      random = draw.random;
      resourceDraws.set(key(at), draw.value);
      resources.set(
        key(at),
        resourceForBiomeTerrainV7(
          biomes.get(key(at)) as BiomeIdV7,
          terrains.get(key(at)) as TerrainIdV7,
          draw.value,
        ),
      );
    }
  const tiles = coords.map((at): TileStateV7 =>
    navalLand !== null && !navalLand.has(key(at))
      ? {
          at,
          biome: null,
          terrain: "DEEP_WATER",
          resource: null,
          improvement: null,
          road: false,
          fieldDefense: false,
          site: null,
          territoryCityId: null,
        }
      : {
          at,
          biome: biomes.get(key(at)) as BiomeIdV7,
          terrain: terrains.get(key(at)) as TerrainIdV7,
          resource: resources.get(key(at)) ?? null,
          improvement: null,
          road: false,
          fieldDefense: false,
          site: fieldSites.get(key(at)) ?? null,
          territoryCityId: null,
        },
  );
  let board: BoardStateV7 = {
    width: setup.width,
    height: setup.height,
    tiles,
  };
  let navalPlacementFailed = false;
  if (setup.mapType === "DRY_LAND") {
    applySettlementFloorsV7(
      board,
      [...capitals, ...villages].sort(compareCoords),
      rank,
    );
  } else {
    try {
      if (navalLand === null) throw new RangeError("Missing naval mask");
      const naval = applyNavalTopologyV7(
        board,
        setup,
        capitals,
        villages,
        assignment.values,
        rank,
        navalLand,
      );
      board = naval.board;
      capitals.splice(0, capitals.length, ...naval.capitals);
      villages.splice(0, villages.length, ...naval.villages);
      const freshWaterResources = new Map<string, ResourceIdV7 | null>();
      for (const tile of board.tiles)
        if (tile.biome === null) {
          const draw = nextUint32(random);
          random = draw.random;
          freshWaterResources.set(
            key(tile.at),
            tile.terrain === "SHALLOW_WATER"
              ? draw.value < threshold(28)
                ? "FISH"
                : draw.value < threshold(38)
                  ? "PEARLS"
                  : null
              : draw.value < threshold(16)
                ? "PEARLS"
                : null,
          );
        }
      board = {
        ...board,
        tiles: board.tiles.map((tile) =>
          tile.biome === null
            ? {
                ...tile,
                resource: freshWaterResources.get(key(tile.at)) ?? null,
              }
            : tile,
        ),
      };
      assignment = shuffle([...naval.capitals].sort(compareCoords), random);
      random = assignment.random;
      turnOrder = shuffle(
        Array.from({ length: setup.aiCount + 1 }, (_, seat) => seat),
        random,
      );
      random = turnOrder.random;
    } catch {
      navalPlacementFailed = true;
      const waterCount = setup.width * setup.height - (navalLand?.size ?? 0);
      for (let index = 0; index < waterCount; index += 1)
        random = nextUint32(random).random;
      assignment = shuffle([...capitals].sort(compareCoords), random);
      random = assignment.random;
      turnOrder = shuffle(
        Array.from({ length: setup.aiCount + 1 }, (_, seat) => seat),
        random,
      );
      random = turnOrder.random;
    }
  }
  return {
    board,
    capitals: [...capitals].sort(compareCoords),
    villages: [...villages].sort(compareCoords),
    capitalAssignments: assignment.values,
    turnOrderSeats: turnOrder.values,
    random,
    resourceRandomState,
    topologyDrawCount:
      setup.mapType === "DRY_LAND" ? 0 : setup.width * setup.height,
    landResourceDrawCount: nonSettlements.length,
    waterResourceDrawCount:
      setup.mapType === "DRY_LAND"
        ? 0
        : board.tiles.filter((tile) => tile.biome === null).length,
    resourceDrawCount:
      nonSettlements.length +
      (setup.mapType === "DRY_LAND"
        ? 0
        : board.tiles.filter((tile) => tile.biome === null).length),
    regionByKey: regions,
    seeds,
    navalPlacementFailed,
  };
}

export function selectRegionSeedsV7(
  candidates: readonly CoordV7[],
  rank: ReadonlyMap<string, number>,
  count: number,
): readonly CoordV7[] {
  if (!Number.isSafeInteger(count) || count < 1 || count > candidates.length)
    throw new RangeError("Invalid region seed count");
  const seeds: CoordV7[] = [];
  const first = [...candidates].sort(
    (left, right) =>
      (rank.get(key(left)) ?? Infinity) - (rank.get(key(right)) ?? Infinity),
  )[0];
  while (seeds.length < count) {
    let next = seeds.length === 0 ? first : undefined;
    let bestDistance = -1;
    if (seeds.length > 0)
      for (const at of candidates) {
        const distance = Math.min(...seeds.map((seed) => chebyshev(at, seed)));
        if (
          distance > bestDistance ||
          (distance === bestDistance &&
            (rank.get(key(at)) ?? 0) <
              (next === undefined ? Infinity : (rank.get(key(next)) ?? 0)))
        ) {
          next = at;
          bestDistance = distance;
        }
      }
    if (next === undefined) throw new RangeError("Missing region seed");
    seeds.push(next);
  }
  return seeds;
}

export function assignRegionsV7(
  coords: readonly CoordV7[],
  seeds: readonly CoordV7[],
): ReadonlyMap<string, number> {
  if (seeds.length === 0) throw new RangeError("Missing region seed");
  const regions = new Map<string, number>();
  for (const at of coords) {
    let best = 0;
    for (let index = 1; index < seeds.length; index += 1)
      if (
        manhattan(at, seeds[index] as CoordV7) <
        manhattan(at, seeds[best] as CoordV7)
      )
        best = index;
    regions.set(key(at), best);
  }
  return regions;
}

export function cohereTerrainsV7(
  width: number,
  height: number,
  candidates: readonly CoordV7[],
  regions: ReadonlyMap<string, number>,
  base: ReadonlyMap<string, TerrainIdV7>,
): ReadonlyMap<string, TerrainIdV7> {
  const terrains = new Map(base);
  for (const at of candidates) {
    const counts = new Map<TerrainIdV7, number>(
      TERRAIN_IDS_V7.map((id) => [id, 0]),
    );
    for (const near of neighbors8(width, height, at))
      if (regions.get(key(near)) === regions.get(key(at))) {
        const value = base.get(key(near)) as TerrainIdV7;
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    const largest = Math.max(...counts.values());
    const own = base.get(key(at)) as TerrainIdV7;
    const winner =
      (counts.get(own) ?? 0) === largest
        ? own
        : (TERRAIN_IDS_V7.find((id) => counts.get(id) === largest) ?? own);
    if (largest >= 5) terrains.set(key(at), winner);
  }
  return terrains;
}

export function applySettlementFloorsV7(
  board: BoardStateV7,
  settlements: readonly CoordV7[],
  rank: ReadonlyMap<string, number>,
): void {
  for (const at of settlements) {
    const center = tileAt(board, at) as TileStateV7;
    const minimum =
      center.biome === "PLAINS"
        ? [2, 1, 0]
        : center.biome === "WOODLAND"
          ? [1, 2, 0]
          : [0, 1, 2];
    const ring = neighbors8(board.width, board.height, at);
    for (let target = 0; target < 3; target += 1)
      for (;;) {
        const counts = familyCounts(board, ring);
        if ((counts[target] ?? 0) >= (minimum[target] ?? 0)) break;
        const donor = ring
          .map((coord) => tileAt(board, coord) as TileStateV7)
          .filter((tile) => {
            if (tile.biome === null) return false;
            const family = familyOf(tile);
            return (
              family === null || (counts[family] ?? 0) > (minimum[family] ?? 0)
            );
          })
          .sort(
            (a, b) => (rank.get(key(a.at)) ?? 0) - (rank.get(key(b.at)) ?? 0),
          )[0];
        if (donor === undefined)
          throw new RangeError("Settlement floor lacks donor");
        const replacement =
          target === 0
            ? { terrain: "GRASS" as const, resource: "FERTILE_GROUND" as const }
            : target === 1
              ? { terrain: "FOREST" as const, resource: null }
              : { terrain: "MOUNTAIN" as const, resource: "ORE" as const };
        (board.tiles as TileStateV7[])[donor.at.y * board.width + donor.at.x] =
          { ...donor, ...replacement };
      }
  }
}

function validate(
  candidate: Candidate,
  setup: MatchSetupV7,
): MapInvariantCodeV7[] {
  if (setup.mapType !== "DRY_LAND")
    return validateNavalCandidate(candidate, setup);
  const board = candidate.board;
  const failures: MapInvariantCodeV7[] = [];
  const capitals = board.tiles.filter((tile) => tile.site === "CAPITAL");
  const villages = board.tiles.filter((tile) => tile.site === "VILLAGE");
  const settlements = [...capitals, ...villages];
  if (
    board.tiles.length !== board.width * board.height ||
    board.tiles.some(
      (tile, index) =>
        tile.at.x !== index % board.width ||
        tile.at.y !== Math.floor(index / board.width),
    )
  )
    failures.push("TILE_LAYOUT");
  if (
    capitals.length !== setup.aiCount + 1 ||
    villages.length !== villageCount(setup)
  )
    failures.push("SETTLEMENT_COUNT");
  if (
    settlements.some(
      (tile) =>
        tile.terrain !== "GRASS" ||
        tile.resource !== null ||
        tile.improvement !== null ||
        tile.road ||
        tile.at.x < 2 ||
        tile.at.y < 2 ||
        tile.at.x >= board.width - 2 ||
        tile.at.y >= board.height - 2,
    )
  )
    failures.push("SETTLEMENT_EMPTY_GRASS");
  if (
    pairTooClose(
      settlements.map((tile) => tile.at),
      3,
    )
  )
    failures.push("SETTLEMENT_SPACING");
  if (
    pairTooClose(
      capitals.map((tile) => tile.at),
      Math.floor(board.width / 2),
    )
  )
    failures.push("CAPITAL_SPACING");
  if (
    BIOME_IDS_V7.some(
      (biome) => !board.tiles.some((tile) => tile.biome === biome),
    )
  )
    failures.push("BIOME_PRESENCE");
  if (candidate.seeds.length !== regionCountV7(board.width, board.height))
    failures.push("REGION_COUNT");
  if (
    candidate.seeds.some(
      (seed, id) =>
        candidate.regionByKey.get(key(seed)) !== id ||
        !regionConnected(board, candidate.regionByKey, id, seed),
    )
  )
    failures.push("REGION_CONNECTIVITY");
  if (
    board.tiles.some((tile) =>
      tile.resource === "FRUIT" || tile.resource === "FERTILE_GROUND"
        ? tile.terrain !== "GRASS"
        : tile.resource === "GAME"
          ? tile.terrain !== "FOREST"
          : tile.resource === "ORE"
            ? tile.terrain !== "MOUNTAIN"
            : false,
    )
  )
    failures.push("RESOURCE_TERRAIN");
  if (
    RESOURCE_IDS_V7.slice(0, 4).some(
      (resource) => !board.tiles.some((tile) => tile.resource === resource),
    )
  )
    failures.push("RESOURCE_GLOBAL_PRESENCE");
  if (
    TERRAIN_IDS_V7.slice(0, 3).some(
      (terrain) => !board.tiles.some((tile) => tile.terrain === terrain),
    )
  )
    failures.push("TERRAIN_GLOBAL_PRESENCE");
  for (const settlement of settlements) {
    const ring = neighbors8(board.width, board.height, settlement.at).map(
      (at) => tileAt(board, at) as TileStateV7,
    );
    const families = new Set(
      ring.map(familyOf).filter((value) => value !== null),
    );
    if (ring.filter((tile) => familyOf(tile) !== null).length < 3)
      failures.push("SETTLEMENT_OPPORTUNITY_MINIMUM");
    if (families.size < 2) failures.push("SETTLEMENT_FAMILY_MINIMUM");
  }
  if (
    capitals.some(
      (capital) =>
        neighbors8(board.width, board.height, capital.at).filter(
          (at) => tileAt(board, at)?.terrain !== "MOUNTAIN",
        ).length < 4,
    )
  )
    failures.push("CAPITAL_GRASS_NEIGHBORS");
  if (
    !capitalsConnected(
      board,
      capitals.map((tile) => tile.at),
    )
  )
    failures.push("CAPITALS_DISCONNECTED");
  const scores = capitals.map((capital) => capitalScore(board, capital.at));
  if (
    scores.some((score) => score < 6 || score > 17) ||
    Math.max(...scores) - Math.min(...scores) > 5
  )
    failures.push("CAPITAL_SCORE");
  return [...new Set(failures)];
}

/**
 * The already materialized seeded mask is applied after the land-only regional
 * field and before fresh row-major water resource draws. Row-major rank is used
 * only for deterministic settlement selection.
 */
function applyNavalTopologyV7(
  original: BoardStateV7,
  setup: MatchSetupV7,
  oldCapitals: readonly CoordV7[],
  oldVillages: readonly CoordV7[],
  oldAssignments: readonly CoordV7[],
  rank: ReadonlyMap<string, number>,
  land: ReadonlySet<string>,
): {
  board: BoardStateV7;
  capitals: CoordV7[];
  villages: CoordV7[];
  capitalAssignments: CoordV7[];
} {
  const components = componentsOfMask(setup.width, setup.height, land, true);
  const settlementCount = oldCapitals.length + oldVillages.length;
  const candidates = allCoords(setup.width, setup.height)
    .filter(
      (at) =>
        land.has(key(at)) &&
        at.x >= 1 &&
        at.y >= 1 &&
        at.x < setup.width - 1 &&
        at.y < setup.height - 1 &&
        neighbors8(setup.width, setup.height, at).filter((near) =>
          land.has(key(near)),
        ).length >= 4,
    )
    .sort((a, b) => {
      const aScore = projectedCapitalScore(original, land, a);
      const bScore = projectedCapitalScore(original, land, b);
      return Math.abs(aScore - 9) - Math.abs(bScore - 9) || compareCoords(a, b);
    });
  const capitals: CoordV7[] = [];
  const requiredComponents =
    setup.mapType === "ARCHIPELAGO"
      ? oldCapitals.length
      : setup.mapType === "CONTINENTS"
        ? Math.min(2, oldCapitals.length)
        : 1;
  const componentByKey = new Map<string, number>();
  components.forEach((component, index) =>
    component.forEach((at) => componentByKey.set(key(at), index)),
  );
  const majorMinimum = Math.max(
    6,
    Math.floor((setup.width * setup.height) / 20),
  );
  const majorComponentIds = new Set(
    components
      .map((component, index) => ({ component, index }))
      .filter(({ component }) => component.length >= majorMinimum)
      .map(({ index }) => index),
  );
  const orderedCapitalCandidates = candidates.filter((at) => {
    const component = componentByKey.get(key(at));
    const score = projectedCapitalScore(original, land, at);
    return (
      component !== undefined &&
      majorComponentIds.has(component) &&
      score >= 4 &&
      score <= 17
    );
  });
  const findCapitals = (start: number): boolean => {
    if (capitals.length === oldCapitals.length) {
      const occupied = capitals.map((at) => componentByKey.get(key(at)));
      const scores = capitals.map((at) =>
        projectedCapitalScore(original, land, at),
      );
      return (
        new Set(occupied).size >= requiredComponents &&
        (setup.mapType !== "ARCHIPELAGO" ||
          new Set(occupied).size === capitals.length) &&
        Math.max(...scores) - Math.min(...scores) <= 5
      );
    }
    for (
      let index = start;
      index < orderedCapitalCandidates.length;
      index += 1
    ) {
      const at = orderedCapitalCandidates[index] as CoordV7;
      if (
        capitals.every(
          (other) => chebyshev(at, other) >= Math.floor(setup.width / 2),
        )
      ) {
        capitals.push(at);
        if (findCapitals(index + 1)) return true;
        capitals.pop();
      }
    }
    return false;
  };
  if (!findCapitals(0))
    throw new RangeError("Naval topology cannot place capitals");
  const settlements = [...capitals];
  const componentHasCoastalSettlement = (componentId: number): boolean =>
    settlements.some(
      (settlement) =>
        componentByKey.get(key(settlement)) === componentId &&
        neighbors8(setup.width, setup.height, settlement).some(
          (near) => !land.has(key(near)),
        ),
    );
  const requiredSettlementComponents =
    setup.mapType === "CONTINENTS" || setup.mapType === "ARCHIPELAGO"
      ? [...majorComponentIds].sort((a, b) => a - b)
      : [
          ...new Set(
            capitals
              .map((capital) => componentByKey.get(key(capital)))
              .filter((value): value is number => value !== undefined),
          ),
        ].sort((a, b) => a - b);
  for (const componentId of requiredSettlementComponents) {
    if (componentHasCoastalSettlement(componentId)) continue;
    const coastal = candidates
      .filter(
        (candidate) =>
          componentByKey.get(key(candidate)) === componentId &&
          neighbors8(setup.width, setup.height, candidate).some(
            (near) => !land.has(key(near)),
          ) &&
          settlements.every((other) => chebyshev(candidate, other) >= 3),
      )
      .sort(compareCoords)[0];
    if (coastal === undefined)
      throw new RangeError("Naval topology lacks coastal settlement");
    settlements.push(coastal);
  }
  const orderedVillageCandidates = [...candidates].sort((a, b) => {
    const aMissing = capitals.some(
      (capital) =>
        componentByKey.get(key(capital)) === componentByKey.get(key(a)),
    );
    const bMissing = capitals.some(
      (capital) =>
        componentByKey.get(key(capital)) === componentByKey.get(key(b)),
    );
    return Number(aMissing) - Number(bMissing) || compareCoords(a, b);
  });
  for (const candidate of orderedVillageCandidates) {
    if (settlements.length >= settlementCount) break;
    const component = componentByKey.get(key(candidate));
    if (
      component === undefined ||
      !requiredSettlementComponents.includes(component)
    )
      continue;
    const componentCount = settlements.filter(
      (other) => componentByKey.get(key(other)) === component,
    ).length;
    const componentLimit =
      setup.mapType === "CONTINENTS"
        ? Math.ceil((2 * settlementCount) / 3)
        : setup.mapType === "ARCHIPELAGO"
          ? Math.ceil(settlementCount / 2)
          : settlementCount;
    if (
      componentCount < componentLimit &&
      settlements.every((other) => chebyshev(candidate, other) >= 3)
    )
      settlements.push(candidate);
  }
  if (settlements.length !== settlementCount)
    throw new RangeError("Naval topology cannot place settlements");
  const sortedCapitals = [...capitals].sort(compareCoords);
  const villages = settlements.slice(capitals.length).sort(compareCoords);
  const oldSorted = [...oldCapitals].sort(compareCoords);
  const capitalAssignments = oldAssignments.map((at) => {
    const index = oldSorted.findIndex((candidate) => same(candidate, at));
    return sortedCapitals[index] as CoordV7;
  });
  const siteByKey = new Map<string, TileStateV7["site"]>();
  for (const at of sortedCapitals) siteByKey.set(key(at), "CAPITAL");
  for (const at of villages) siteByKey.set(key(at), "VILLAGE");
  const board: BoardStateV7 = {
    ...original,
    tiles: original.tiles.map((tile) => {
      const isLand = land.has(key(tile.at));
      const site = siteByKey.get(key(tile.at)) ?? null;
      if (isLand)
        return {
          ...tile,
          site,
          terrain: site === null ? tile.terrain : "GRASS",
          resource: site === null ? tile.resource : null,
        };
      const shallow = neighbors8(original.width, original.height, tile.at).some(
        (at) => land.has(key(at)),
      );
      const terrain: TerrainIdV7 = shallow ? "SHALLOW_WATER" : "DEEP_WATER";
      return { ...tile, biome: null, terrain, resource: null, site: null };
    }),
  };
  applySettlementFloorsV7(
    board,
    [...sortedCapitals, ...villages].sort(compareCoords),
    rank,
  );
  return { board, capitals: sortedCapitals, villages, capitalAssignments };
}

function projectedCapitalScore(
  board: BoardStateV7,
  land: ReadonlySet<string>,
  at: CoordV7,
): number {
  return neighbors8(board.width, board.height, at).reduce((sum, near) => {
    if (!land.has(key(near))) return sum;
    const tile = tileAt(board, near) as TileStateV7;
    return sum + opportunityScore(tile);
  }, 0);
}

function topologyMaskV7(
  setup: MatchSetupV7,
  draws: ReadonlyMap<string, number>,
): Set<string> {
  const { width, height, mapType } = setup;
  const land = new Set<string>();
  const add = (x: number, y: number) => land.add(key({ x, y }));
  if (mapType === "PANGEA") {
    const wanted = Math.floor(width * height * 0.72);
    for (const at of allCoords(width, height)
      .sort((a, b) => {
        const ax = (2 * a.x - width + 1) / width;
        const ay = (2 * a.y - height + 1) / height;
        const bx = (2 * b.x - width + 1) / width;
        const by = (2 * b.y - height + 1) / height;
        const aj = ((draws.get(key(a)) ?? 0) >>> 28) / 128;
        const bj = ((draws.get(key(b)) ?? 0) >>> 28) / 128;
        return (
          ax * ax + ay * ay + aj - (bx * bx + by * by + bj) ||
          compareCoords(a, b)
        );
      })
      .slice(0, wanted))
      add(at.x, at.y);
  } else if (mapType === "CONTINENTS" || mapType === "ARCHIPELAGO") {
    const count =
      mapType === "ARCHIPELAGO"
        ? setup.aiCount + 1
        : setup.aiCount === 1
          ? 2
          : 3;
    const share = mapType === "CONTINENTS" ? 0.56 : 0.4;
    const wanted = Math.round(width * height * share);
    const centers =
      count === 2
        ? [
            { x: 1, y: Math.floor(height / 2) },
            { x: width - 2, y: Math.floor(height / 2) },
          ]
        : count === 3
          ? [
              { x: 1, y: 1 },
              { x: width - 2, y: 1 },
              { x: Math.floor(width / 2), y: height - 2 },
            ]
          : [
              { x: 1, y: 1 },
              { x: width - 2, y: 1 },
              { x: 1, y: height - 2 },
              { x: width - 2, y: height - 2 },
            ];
    const weights =
      mapType === "CONTINENTS" && count === 3
        ? [1, 1, 2]
        : centers.map(() => 1);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    let allocated = 0;
    centers.forEach((center, index) => {
      const amount =
        index === centers.length - 1
          ? wanted - allocated
          : Math.floor((wanted * (weights[index] ?? 1)) / totalWeight);
      allocated += amount;
      const distance = (at: CoordV7): number =>
        mapType === "CONTINENTS" && count === 3 && index === 2
          ? Math.abs(at.y - center.y)
          : chebyshev(at, center);
      for (const at of allCoords(width, height)
        .filter(
          (candidate) =>
            !centers.some(
              (other, otherIndex) =>
                otherIndex !== index &&
                chebyshev(candidate, other) <= chebyshev(candidate, center) + 1,
            ),
        )
        .sort(
          (a, b) =>
            distance(a) +
              ((draws.get(key(a)) ?? 0) >>> 28) / 4 -
              (distance(b) + ((draws.get(key(b)) ?? 0) >>> 28) / 4) ||
            compareCoords(a, b),
        )
        .slice(0, amount))
        add(at.x, at.y);
    });
  } else if (mapType === "LAKES") {
    for (const at of allCoords(width, height)) add(at.x, at.y);
    const wantedWater = Math.ceil(width * height * 0.2);
    if (width === 11) {
      const variant = ((draws.get("0,0") ?? 0) >>> 30) & 3;
      for (const at of allCoords(width, height))
        if (smallLakeCell(at, variant)) land.delete(key(at));
      return land;
    }
    const centers = [
      { x: Math.floor(width / 4), y: Math.floor(height / 4) },
      { x: Math.floor((3 * width) / 4), y: Math.floor((3 * height) / 4) },
    ];
    centers.forEach((center, index) => {
      const amount =
        Math.floor(wantedWater / 2) + (index < wantedWater % 2 ? 1 : 0);
      const cells = allCoords(width, height)
        .filter(
          (at) =>
            at.x > 0 &&
            at.y > 0 &&
            at.x < width - 1 &&
            at.y < height - 1 &&
            !centers.some(
              (other, otherIndex) =>
                otherIndex !== index &&
                chebyshev(at, other) <= chebyshev(at, center) + 1,
            ),
        )
        .sort(
          (a, b) =>
            chebyshev(a, center) +
              ((draws.get(key(a)) ?? 0) >>> 28) / 8 -
              (chebyshev(b, center) + ((draws.get(key(b)) ?? 0) >>> 28) / 8) ||
            compareCoords(a, b),
        )
        .slice(0, amount);
      for (const at of cells) land.delete(key(at));
    });
  }
  return land;
}

function smallLakeCell(at: CoordV7, variant: number): boolean {
  const transformed =
    variant === 0
      ? at
      : variant === 1
        ? { x: 10 - at.x, y: at.y }
        : variant === 2
          ? { x: at.x, y: 10 - at.y }
          : { x: 10 - at.x, y: 10 - at.y };
  return (
    (transformed.x >= 1 &&
      transformed.x <= 4 &&
      transformed.y >= 1 &&
      transformed.y <= 4) ||
    (transformed.x >= 6 &&
      transformed.x <= 8 &&
      transformed.y >= 6 &&
      transformed.y <= 8)
  );
}

function validateNavalCandidate(
  candidate: Candidate,
  setup: MatchSetupV7,
): MapInvariantCodeV7[] {
  const board = candidate.board;
  const failures: MapInvariantCodeV7[] = [];
  if (candidate.navalPlacementFailed) return ["SETTLEMENT_COUNT"];
  const land = board.tiles.filter((tile) => tile.biome !== null);
  const water = board.tiles.filter((tile) => tile.biome === null);
  const bounds =
    setup.mapType === "PANGEA"
      ? [0.68, 0.76]
      : setup.mapType === "CONTINENTS"
        ? [0.5, 0.62]
        : setup.mapType === "ARCHIPELAGO"
          ? [0.34, 0.46]
          : [0.72, 0.84];
  if (
    land.length < Math.ceil((bounds[0] ?? 0) * board.tiles.length) ||
    land.length > Math.floor((bounds[1] ?? 1) * board.tiles.length)
  )
    failures.push("TILE_LAYOUT");
  if (
    water.some(
      (tile) =>
        tile.terrain !== "SHALLOW_WATER" && tile.terrain !== "DEEP_WATER",
    ) ||
    land.some(
      (tile) =>
        tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER",
    )
  )
    failures.push("TILE_LAYOUT");
  if (
    water.filter((tile) => tile.terrain === "SHALLOW_WATER").length <
      Math.ceil(water.length * 0.4) ||
    water.filter((tile) => tile.terrain === "DEEP_WATER").length <
      Math.max(4, Math.floor(water.length / 10))
  )
    failures.push("TERRAIN_GLOBAL_PRESENCE");
  if (
    board.tiles.filter((tile) => tile.site === "CAPITAL").length !==
      setup.aiCount + 1 ||
    board.tiles.filter((tile) => tile.site === "VILLAGE").length !==
      villageCount(setup)
  )
    failures.push("SETTLEMENT_COUNT");
  if (pairTooClose([...candidate.capitals, ...candidate.villages], 3))
    failures.push("SETTLEMENT_SPACING");
  if (pairTooClose(candidate.capitals, Math.floor(board.width / 2)))
    failures.push("CAPITAL_SPACING");
  const landKeys = new Set(land.map((tile) => key(tile.at)));
  const waterKeys = new Set(water.map((tile) => key(tile.at)));
  const landComponents = componentsOfMask(
    board.width,
    board.height,
    landKeys,
    true,
  );
  const waterComponents = componentsOfMask(
    board.width,
    board.height,
    waterKeys,
    true,
  );
  const majorMinimum = Math.max(6, Math.floor(board.tiles.length / 20));
  const major = landComponents.filter(
    (component) => component.length >= majorMinimum,
  );
  const landComponentByKey = componentIndex(landComponents);
  const settlementTiles = board.tiles.filter((tile) => tile.site !== null);
  const capitalTiles = board.tiles.filter((tile) => tile.site === "CAPITAL");
  const settlementsIn = (component: readonly CoordV7[]): number => {
    const keys = new Set(component.map(key));
    return settlementTiles.filter((tile) => keys.has(key(tile.at))).length;
  };
  const expectedMajor =
    setup.mapType === "CONTINENTS" ? (setup.aiCount === 1 ? 2 : 3) : undefined;
  if (
    (setup.mapType === "PANGEA" &&
      (major.length !== 1 ||
        major[0] === undefined ||
        major[0].length < Math.ceil(land.length * 0.9) ||
        settlementsIn(major[0]) !== settlementTiles.length)) ||
    (setup.mapType === "CONTINENTS" &&
      (major.length !== expectedMajor ||
        major.some((component) => settlementsIn(component) === 0) ||
        major.some(
          (component) =>
            settlementsIn(component) >
            Math.ceil((2 * settlementTiles.length) / 3),
        ) ||
        new Set(
          capitalTiles.map((tile) => landComponentByKey.get(key(tile.at))),
        ).size < 2)) ||
    (setup.mapType === "ARCHIPELAGO" &&
      (major.length < setup.aiCount + 1 ||
        major.length > 2 * (setup.aiCount + 1) + 2 ||
        major.some((component) => settlementsIn(component) === 0) ||
        major.some(
          (component) =>
            settlementsIn(component) > Math.ceil(settlementTiles.length / 2),
        ) ||
        new Set(
          capitalTiles.map((tile) => landComponentByKey.get(key(tile.at))),
        ).size !== capitalTiles.length)) ||
    (setup.mapType === "LAKES" &&
      waterComponents.filter(
        (component) =>
          component.length >= 4 &&
          component.every((at) => !isBoardEdge(board, at)),
      ).length < 2) ||
    (setup.mapType === "LAKES" &&
      waterComponents
        .filter((component) => component.every((at) => !isBoardEdge(board, at)))
        .reduce((sum, component) => sum + component.length, 0) <
        Math.ceil(water.length * 0.75))
  )
    failures.push("NAVAL_TOPOLOGY");
  if (
    waterComponents.some(
      (component) =>
        component.length === 1 ||
        (component.some((at) => tileAt(board, at)?.terrain === "DEEP_WATER") &&
          !component.some(
            (at) => tileAt(board, at)?.terrain === "SHALLOW_WATER",
          )),
    ) ||
    major.some(
      (component) => landingFrontier(board, component).land.size < 2,
    ) ||
    major.some(
      (component) => landingFrontier(board, component).shallow.size < 2,
    )
  )
    failures.push("NAVAL_TOPOLOGY");
  if (!settlementComponentNetworkConnected(board, landComponents))
    failures.push("NAVAL_REACHABILITY");
  if (
    [
      ...new Set(
        settlementTiles.map((tile) => landComponentByKey.get(key(tile.at))),
      ),
    ]
      .filter((value): value is number => value !== undefined)
      .some((componentId) => {
        const qualifying = settlementTiles
          .filter(
            (tile) => landComponentByKey.get(key(tile.at)) === componentId,
          )
          .filter((tile) =>
            neighbors8(board.width, board.height, tile.at).some((near) => {
              const port = tileAt(board, near);
              return (
                port?.terrain === "SHALLOW_WATER" &&
                port.improvement === null &&
                !port.road &&
                port.site === null
              );
            }),
          )
          .sort((left, right) => compareCoords(left.at, right.at));
        return qualifying.length === 0;
      })
  )
    failures.push("COASTAL_SETTLEMENT");
  const scores = capitalTiles.map((capital) => capitalScore(board, capital.at));
  if (
    scores.some((score) => score < 6 || score > 17) ||
    Math.max(...scores) - Math.min(...scores) > 5
  )
    failures.push("CAPITAL_SCORE");
  if (
    capitalTiles.some(
      (capital) =>
        !capitalEconomyFair(board, capital.at) ||
        (!hasUsefulLandExpansion(board, capital.at) &&
          !hasCapitalSeaEscape(board, capital.at, landComponentByKey)),
    )
  )
    failures.push("CAPITAL_SEA_ESCAPE");
  return [...new Set(failures)];
}

function componentIndex(
  components: readonly (readonly CoordV7[])[],
): ReadonlyMap<string, number> {
  const result = new Map<string, number>();
  components.forEach((component, index) =>
    component.forEach((at) => result.set(key(at), index)),
  );
  return result;
}

function isBoardEdge(board: BoardStateV7, at: CoordV7): boolean {
  return (
    at.x === 0 ||
    at.y === 0 ||
    at.x === board.width - 1 ||
    at.y === board.height - 1
  );
}

function landingFrontier(
  board: BoardStateV7,
  component: readonly CoordV7[],
): { land: Set<string>; shallow: Set<string> } {
  const land = new Set<string>();
  const shallow = new Set<string>();
  for (const at of component)
    if (isLegalLandingTile(board, at))
      for (const near of neighbors8(board.width, board.height, at))
        if (tileAt(board, near)?.terrain === "SHALLOW_WATER") {
          land.add(key(at));
          shallow.add(key(near));
        }
  return { land, shallow };
}

function isLegalLandingTile(board: BoardStateV7, at: CoordV7): boolean {
  const tile = tileAt(board, at);
  return (
    tile !== undefined &&
    tile.biome !== null &&
    tile.terrain !== "MOUNTAIN" &&
    tile.site === null
  );
}

function settlementComponentNetworkConnected(
  board: BoardStateV7,
  landComponents: readonly (readonly CoordV7[])[],
): boolean {
  const index = componentIndex(landComponents);
  const inhabited = new Set(
    board.tiles
      .filter((tile) => tile.site !== null)
      .map((tile) => index.get(key(tile.at)))
      .filter((value): value is number => value !== undefined),
  );
  if (inhabited.size <= 1) return true;
  const eligible = new Set<number>();
  const eligiblePortKeys = new Map<number, Set<string>>();
  for (const componentId of inhabited) {
    const settlements = board.tiles.filter(
      (tile) => tile.site !== null && index.get(key(tile.at)) === componentId,
    );
    const ports = new Set<string>();
    for (const settlement of settlements)
      for (const at of coordsInRadius(
        board.width,
        board.height,
        settlement.at,
        2,
      ))
        if (
          tileAt(board, at)?.terrain === "SHALLOW_WATER" &&
          neighbors8(board.width, board.height, at).some(
            (near) => index.get(key(near)) === componentId,
          )
        )
          ports.add(key(at));
    if (ports.size > 0) {
      eligible.add(componentId);
      eligiblePortKeys.set(componentId, ports);
    }
  }
  if (eligible.size !== inhabited.size) return false;
  const adjacency = new Map<number, Set<number>>();
  const waterKeys = new Set(
    board.tiles
      .filter((tile) => tile.biome === null)
      .map((tile) => key(tile.at)),
  );
  for (const water of componentsOfMask(
    board.width,
    board.height,
    waterKeys,
    true,
  )) {
    const waterSet = new Set(water.map(key));
    const touched = new Set<number>();
    for (const componentId of inhabited)
      if (
        [...(eligiblePortKeys.get(componentId) ?? [])].some((port) =>
          waterSet.has(port),
        )
      )
        touched.add(componentId);
    for (const left of touched)
      for (const right of touched)
        if (left !== right) {
          const edges = adjacency.get(left) ?? new Set<number>();
          edges.add(right);
          adjacency.set(left, edges);
        }
  }
  const first = inhabited.values().next().value as number;
  const seen = new Set([first]);
  const queue = [first];
  for (let cursor = 0; cursor < queue.length; cursor += 1)
    for (const next of adjacency.get(queue[cursor] as number) ?? [])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  return seen.size === inhabited.size;
}

function capitalEconomyFair(board: BoardStateV7, capital: CoordV7): boolean {
  const opportunities = neighbors8(board.width, board.height, capital)
    .map((at) => tileAt(board, at) as TileStateV7)
    .filter((tile) => opportunityScore(tile) > 0);
  const families = new Set(
    opportunities.map((tile) =>
      tile.resource === "FISH" || tile.resource === "PEARLS"
        ? "WATER"
        : familyOf(tile),
    ),
  );
  families.delete(null);
  return opportunities.length >= 3 && families.size >= 2;
}

function hasUsefulLandExpansion(
  board: BoardStateV7,
  capital: CoordV7,
): boolean {
  const destinations = new Set(
    board.tiles
      .filter((tile) => tile.site !== null && !same(tile.at, capital))
      .map((tile) => key(tile.at)),
  );
  const seen = new Set([key(capital)]);
  const queue = [{ at: capital, distance: 0 }];
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined) break;
    if (current.distance > 0 && destinations.has(key(current.at))) return true;
    if (current.distance >= board.width) continue;
    for (const near of neighbors8(board.width, board.height, current.at)) {
      const tile = tileAt(board, near);
      if (
        tile !== undefined &&
        tile.biome !== null &&
        tile.terrain !== "MOUNTAIN" &&
        !seen.has(key(near))
      ) {
        seen.add(key(near));
        queue.push({ at: near, distance: current.distance + 1 });
      }
    }
  }
  return false;
}

function hasCapitalSeaEscape(
  board: BoardStateV7,
  capital: CoordV7,
  componentByKey: ReadonlyMap<string, number>,
): boolean {
  const ownComponent = componentByKey.get(key(capital));
  const footprint = coordsInRadius(board.width, board.height, capital, 1);
  if (footprint.filter((at) => tileAt(board, at)?.biome !== null).length < 4)
    return false;
  const starts = footprint.filter(
    (at) =>
      tileAt(board, at)?.terrain === "SHALLOW_WATER" &&
      neighbors8(board.width, board.height, at).some(
        (near) => componentByKey.get(key(near)) === ownComponent,
      ),
  );
  if (starts.length === 0) return false;
  const targetLandings = new Set<string>();
  const targetComponents = new Set(
    board.tiles
      .filter(
        (tile) =>
          tile.site !== null &&
          componentByKey.get(key(tile.at)) !== ownComponent,
      )
      .map((tile) => componentByKey.get(key(tile.at)))
      .filter((value): value is number => value !== undefined),
  );
  for (const targetComponent of targetComponents) {
    const componentLandings = new Set<string>();
    const starts = board.tiles
      .filter(
        (tile) =>
          tile.site !== null &&
          componentByKey.get(key(tile.at)) === targetComponent,
      )
      .map((tile) => tile.at);
    const seen = new Set(starts.map(key));
    const queue = [...starts];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) break;
      if (
        isLegalLandingTile(board, current) &&
        neighbors8(board.width, board.height, current).some(
          (near) => tileAt(board, near)?.terrain === "SHALLOW_WATER",
        )
      )
        componentLandings.add(key(current));
      for (const near of neighbors8(board.width, board.height, current)) {
        const tile = tileAt(board, near);
        if (
          componentByKey.get(key(near)) === targetComponent &&
          tile?.terrain !== "MOUNTAIN" &&
          !seen.has(key(near))
        ) {
          seen.add(key(near));
          queue.push(near);
        }
      }
    }
    if (componentLandings.size >= 2)
      for (const landing of componentLandings) targetLandings.add(landing);
  }
  if (targetLandings.size < 2) return false;
  const seen = new Set(starts.map(key));
  const queue = starts.map((at) => ({ at, distance: 0 }));
  const maximum = Math.max(5, board.width - 2);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined) break;
    if (
      neighbors8(board.width, board.height, current.at).some((near) =>
        targetLandings.has(key(near)),
      )
    )
      return true;
    if (current.distance >= maximum) continue;
    for (const near of neighbors8(board.width, board.height, current.at))
      if (tileAt(board, near)?.biome === null && !seen.has(key(near))) {
        seen.add(key(near));
        queue.push({ at: near, distance: current.distance + 1 });
      }
  }
  return false;
}

function componentsOfMask(
  width: number,
  height: number,
  mask: ReadonlySet<string>,
  wanted: boolean,
): CoordV7[][] {
  const remaining = new Set(
    allCoords(width, height)
      .filter((at) => mask.has(key(at)) === wanted)
      .map(key),
  );
  const result: CoordV7[][] = [];
  while (remaining.size > 0) {
    const first = remaining.values().next().value as string;
    const [y, x] = first.split(",").map(Number);
    if (x === undefined || y === undefined)
      throw new RangeError("Invalid component coordinate");
    const queue: CoordV7[] = [{ x, y }];
    const component: CoordV7[] = [];
    remaining.delete(first);
    while (queue.length > 0) {
      const at = queue.shift() as CoordV7;
      component.push(at);
      for (const near of neighbors8(width, height, at))
        if (remaining.delete(key(near))) queue.push(near);
    }
    result.push(component.sort(compareCoords));
  }
  return result.sort((a, b) => {
    const left = a[0];
    const right = b[0];
    if (left === undefined || right === undefined)
      throw new RangeError("Empty component");
    return b.length - a.length || compareCoords(left, right);
  });
}

export type CreateInitialMapStateResultV7 =
  | {
      readonly ok: true;
      readonly state: GameStateV7;
      readonly mapAttempt: number;
    }
  | Extract<GenerateMapResultV7, { readonly ok: false }>;
export function createInitialMapStateV7(
  input: unknown,
): CreateInitialMapStateResultV7 {
  const setup = parseMatchSetupV7(input);
  if (setup === null)
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  const generated = generateInitialMapV7(setup);
  if (!generated.ok) return generated;
  const players = createPlayers(setup);
  const entities = createEntities(players, generated.map.capitalAssignments);
  const board = assignTerritories(generated.map.board, entities.cities);
  const explored = players.map((player, seat) => ({
    ...player,
    explored: coordsInRadius(
      board.width,
      board.height,
      generated.map.capitalAssignments[seat] as CoordV7,
      2,
    ),
  }));
  const state = deepFreeze<GameStateV7>({
    schemaVersion: 7,
    rulesetId: RULESET_7_ID,
    setup,
    random: generated.map.random,
    humanPlayerId: explored[0]?.id ?? playerId(1),
    nextEntityId: entities.nextEntityId,
    commandIndex: 0,
    round: 1,
    activeSeatIndex: 0,
    turnOrder: generated.map.turnOrderSeats.map(
      (seat) => (explored[seat] as PlayerStateV7).id,
    ),
    board,
    players: explored,
    cities: entities.cities,
    populationContributions: [],
    units: entities.units,
    treasureChests: generated.map.treasureChests,
    pendingChoices: [],
    outcome: null,
  });
  if (parseGameStateV7(state) === null)
    throw new Error("Internal v7 initial-state invariant failure");
  return { ok: true, state, mapAttempt: generated.map.attempt };
}
function createPlayers(setup: MatchSetupV7): readonly PlayerStateV7[] {
  const colors = COLORS.filter((color) => color !== setup.humanColor);
  return Array.from({ length: setup.aiCount + 1 }, (_, seat) => ({
    id: playerId(seat + 1),
    seat,
    controller: seat === 0 ? "HUMAN" : "AI",
    color: seat === 0 ? setup.humanColor : (colors[seat - 1] as PlayerColorV7),
    faction: "ORIGINAL",
    factionTreeId: "ORIGINAL_BASELINE_V5",
    status: "ACTIVE",
    coins: RULESET_7.startingCoins,
    researchedTechs: ORIGINAL_BASELINE_V5_TREE.startingTechIds,
    explored: [],
    spoilsClaimedCityIds: [],
    achievementEntitlements: [
      { achievement: "EXPLORER", unlocked: false, spent: false },
      { achievement: "ENGINEER", unlocked: false, spent: false },
      { achievement: "MUSTER", unlocked: false, spent: false },
    ],
    originalCapitalCityId: cityId(seat * 2 + 1),
  }));
}
function createEntities(
  players: readonly PlayerStateV7[],
  capitals: readonly CoordV7[],
) {
  const cities: CityStateV7[] = [];
  const units: UnitStateV7[] = [];
  let nextEntityId = 1;
  players.forEach((player, index) => {
    const at = capitals[index] as CoordV7;
    const city = allocateCityId(nextEntityId);
    nextEntityId = city.nextEntityId;
    cities.push({
      id: city.id,
      ownerId: player.id,
      at,
      level: 1,
      permanentPopulation: 0,
      economicPopulation: 0,
      population: 0,
      isCapital: true,
      expanded: false,
      landGrantUsed: false,
      rewards: [],
    });
    const unit = allocateUnitId(nextEntityId);
    nextEntityId = unit.nextEntityId;
    units.push({
      id: unit.id,
      ownerId: player.id,
      homeCityId: city.id,
      role: "FIGHTER",
      form: "LAND",
      at,
      hp: 10,
      maxHp: 10,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: {
        moved: false,
        movedPathLength: 0,
        attacked: false,
        attacksUsed: 0,
        tendedThisTurn: false,
        inspired: false,
        overrunActive: false,
        recovered: false,
        captured: false,
        handled: false,
        specialActed: false,
      },
    });
  });
  return { cities, units, nextEntityId };
}
function assignTerritories(
  board: BoardStateV7,
  cities: readonly CityStateV7[],
): BoardStateV7 {
  const assignments = new Map<string, CityStateV7["id"]>();
  for (const city of [...cities].sort((a, b) => a.id - b.id))
    for (const at of coordsInRadius(board.width, board.height, city.at, 1)) {
      if (assignments.has(key(at)))
        throw new RangeError("Overlapping territories");
      assignments.set(key(at), city.id);
    }
  return deepFreeze({
    ...board,
    tiles: board.tiles.map((tile) => ({
      ...tile,
      territoryCityId: assignments.get(key(tile.at)) ?? null,
    })),
  });
}
export function canonicalMapRandomHashV7(
  map: Pick<GeneratedMapV7, "board" | "treasureChests" | "random">,
): string {
  return canonicalHash({
    board: map.board,
    treasureChests: map.treasureChests,
    random: map.random,
  });
}

function villageCount(setup: MatchSetupV7): number {
  return setup.width === 25
    ? HUGE[setup.aiCount]
    : setup.width === 20
      ? LARGE[setup.aiCount]
      : STANDARD[setup.aiCount];
}
function threshold(percent: number): number {
  return Math.floor((percent * 0x1_0000_0000) / 100);
}
function uint32(value: number): void {
  if (!Number.isInteger(value) || value < 0 || value > 0xffff_ffff)
    throw new RangeError("draw must be uint32");
}
function shuffle<T>(
  values: readonly T[],
  initial: RandomStateV7,
): { values: T[]; random: RandomStateV7 } {
  const result = [...values];
  let random = initial;
  for (let index = result.length - 1; index > 0; index -= 1) {
    const draw = nextBounded(random, index + 1);
    random = draw.random;
    [result[index], result[draw.value]] = [
      result[draw.value] as T,
      result[index] as T,
    ];
  }
  return { values: result, random };
}
function allCoords(width: number, height: number): CoordV7[] {
  return Array.from({ length: width * height }, (_, index) => ({
    x: index % width,
    y: Math.floor(index / width),
  }));
}
function coordsInRadius(
  width: number,
  height: number,
  center: CoordV7,
  radius: number,
): CoordV7[] {
  const result: CoordV7[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(height - 1, center.y + radius);
    y += 1
  )
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(width - 1, center.x + radius);
      x += 1
    )
      result.push({ x, y });
  return result;
}
function neighbors8(width: number, height: number, center: CoordV7): CoordV7[] {
  return coordsInRadius(width, height, center, 1).filter(
    (at) => !same(at, center),
  );
}
function neighbors4(width: number, height: number, center: CoordV7): CoordV7[] {
  return [
    { x: center.x, y: center.y - 1 },
    { x: center.x + 1, y: center.y },
    { x: center.x, y: center.y + 1 },
    { x: center.x - 1, y: center.y },
  ].filter((at) => at.x >= 0 && at.y >= 0 && at.x < width && at.y < height);
}
function tileAt(board: BoardStateV7, at: CoordV7): TileStateV7 | undefined {
  return board.tiles[at.y * board.width + at.x];
}
function key(at: CoordV7): string {
  return `${at.y},${at.x}`;
}
function same(a: CoordV7, b: CoordV7): boolean {
  return a.x === b.x && a.y === b.y;
}
function compareCoords(a: CoordV7, b: CoordV7): number {
  return a.y - b.y || a.x - b.x;
}
function chebyshev(a: CoordV7, b: CoordV7): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
function manhattan(a: CoordV7, b: CoordV7): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}
function familyOf(tile: TileStateV7): 0 | 1 | 2 | null {
  return tile.resource === "FRUIT" || tile.resource === "FERTILE_GROUND"
    ? 0
    : tile.terrain === "FOREST"
      ? 1
      : tile.resource === "ORE"
        ? 2
        : null;
}
function familyCounts(board: BoardStateV7, ring: readonly CoordV7[]): number[] {
  const result = [0, 0, 0];
  for (const at of ring) {
    const family = familyOf(tileAt(board, at) as TileStateV7);
    if (family !== null) result[family] = (result[family] ?? 0) + 1;
  }
  return result;
}
function pairTooClose(values: readonly CoordV7[], minimum: number): boolean {
  return values.some((a, index) =>
    values.slice(index + 1).some((b) => chebyshev(a, b) < minimum),
  );
}
function regionConnected(
  board: BoardStateV7,
  regions: ReadonlyMap<string, number>,
  id: number,
  seed: CoordV7,
): boolean {
  const wanted = board.tiles.filter(
    (tile) => regions.get(key(tile.at)) === id,
  ).length;
  const seen = new Set([key(seed)]);
  const queue = [seed];
  for (let index = 0; index < queue.length; index += 1)
    for (const at of neighbors4(
      board.width,
      board.height,
      queue[index] as CoordV7,
    ))
      if (regions.get(key(at)) === id && !seen.has(key(at))) {
        seen.add(key(at));
        queue.push(at);
      }
  return seen.size === wanted;
}
function capitalsConnected(
  board: BoardStateV7,
  capitals: readonly CoordV7[],
): boolean {
  const first = capitals[0];
  if (first === undefined) return false;
  const seen = new Set([key(first)]);
  const queue = [first];
  for (let index = 0; index < queue.length; index += 1)
    for (const at of neighbors8(
      board.width,
      board.height,
      queue[index] as CoordV7,
    ))
      if (tileAt(board, at)?.terrain !== "MOUNTAIN" && !seen.has(key(at))) {
        seen.add(key(at));
        queue.push(at);
      }
  return capitals.every((at) => seen.has(key(at)));
}
function capitalScore(board: BoardStateV7, at: CoordV7): number {
  return neighbors8(board.width, board.height, at).reduce((sum, coord) => {
    const tile = tileAt(board, coord) as TileStateV7;
    return sum + opportunityScore(tile);
  }, 0);
}

function opportunityScore(tile: TileStateV7): number {
  return tile.resource === "FRUIT"
    ? 1
    : tile.resource === "FERTILE_GROUND"
      ? 2
      : tile.terrain === "FOREST"
        ? 2 + Number(tile.resource === "GAME")
        : tile.resource === "ORE"
          ? 2
          : tile.resource === "FISH" || tile.resource === "PEARLS"
            ? 1
            : 0;
}
