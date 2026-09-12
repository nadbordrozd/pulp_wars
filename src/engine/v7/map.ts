import { deepFreeze } from "../model/freeze";
import { allocateCityId, allocateUnitId, playerId } from "../model/ids";
import { nextBounded, nextUint32, randomState } from "../random/random";
import { canonicalHash } from "../replay/canonical";
import { ORIGINAL_BASELINE_V4_TREE, RULESET_7 } from "../rules/ruleset-v7";
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
export const MAP_GENERATION_REVISION_V7 = "REGIONAL_BIOMES_V1" as const;
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
  | "CAPITAL_SCORE";
export interface MapGenerationAttemptV7 {
  readonly attempt: number;
  readonly initialRandomState: number;
  readonly resourceRandomState: number;
  readonly finalRandomState: number;
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
  readonly regionByKey: ReadonlyMap<string, number>;
  readonly seeds: readonly CoordV7[];
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
      resourceDrawCount: candidate.resourceDrawCount,
      failures,
    });
    if (failures.length === 0) {
      const treasure = placeTreasureChestsV6(
        candidate.board as never,
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
  const assignment = shuffle(capitals, random);
  random = assignment.random;
  const turnOrder = shuffle(
    Array.from({ length: setup.aiCount + 1 }, (_, seat) => seat),
    random,
  );
  random = turnOrder.random;
  const sites = new Map<string, TileStateV7["site"]>();
  for (const at of capitals) sites.set(key(at), "CAPITAL");
  for (const at of villages) sites.set(key(at), "VILLAGE");
  const coords = allCoords(setup.width, setup.height);
  const nonSettlements = coords.filter((at) => !sites.has(key(at)));
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
  const regions = assignRegionsV7(coords, seeds);
  const biomes = new Map<string, BiomeIdV7>();
  for (const at of coords) {
    const region = regions.get(key(at)) as number;
    biomes.set(key(at), labels.values[region] as BiomeIdV7);
  }
  const base = new Map<string, TerrainIdV7>();
  for (const at of coords)
    if (sites.has(key(at))) base.set(key(at), "GRASS");
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
  for (const at of coords)
    if (sites.has(key(at))) resources.set(key(at), null);
    else {
      const draw = nextUint32(random);
      random = draw.random;
      resources.set(
        key(at),
        resourceForBiomeTerrainV7(
          biomes.get(key(at)) as BiomeIdV7,
          terrains.get(key(at)) as TerrainIdV7,
          draw.value,
        ),
      );
    }
  const tiles = coords.map((at): TileStateV7 => ({
    at,
    biome: biomes.get(key(at)) as BiomeIdV7,
    terrain: terrains.get(key(at)) as TerrainIdV7,
    resource: resources.get(key(at)) ?? null,
    improvement: null,
    road: false,
    site: sites.get(key(at)) ?? null,
    territoryCityId: null,
  }));
  const board: BoardStateV7 = {
    width: setup.width,
    height: setup.height,
    tiles,
  };
  applySettlementFloorsV7(
    board,
    [...capitals, ...villages].sort(compareCoords),
    rank,
  );
  return {
    board,
    capitals: [...capitals].sort(compareCoords),
    villages: [...villages].sort(compareCoords),
    capitalAssignments: assignment.values,
    turnOrderSeats: turnOrder.values,
    random,
    resourceRandomState,
    resourceDrawCount: nonSettlements.length,
    regionByKey: regions,
    seeds,
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
    RESOURCE_IDS_V7.some(
      (resource) => !board.tiles.some((tile) => tile.resource === resource),
    )
  )
    failures.push("RESOURCE_GLOBAL_PRESENCE");
  if (
    TERRAIN_IDS_V7.some(
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
    saboteurExposures: [],
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
    factionTreeId: "ORIGINAL_BASELINE_V4",
    status: "ACTIVE",
    coins: RULESET_7.startingCoins,
    researchedTechs: ORIGINAL_BASELINE_V4_TREE.startingTechIds,
    explored: [],
    spoilsClaimedCityIds: [],
    achievementEntitlements: [
      { achievement: "ENGINEER", unlocked: false, spent: false },
      { achievement: "MUSTER", unlocked: false, spent: false },
    ],
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
      rewards: [],
      blackout: null,
    });
    const unit = allocateUnitId(nextEntityId);
    nextEntityId = unit.nextEntityId;
    units.push({
      id: unit.id,
      ownerId: player.id,
      homeCityId: city.id,
      role: "FIGHTER",
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
        healed: false,
        recovered: false,
        captured: false,
        handled: false,
        specialActed: false,
      },
      blackoutEligibleRound: null,
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
