import { deepFreeze } from "../model/freeze";
import { allocateCityId, allocateUnitId, cityId, playerId } from "../model/ids";
import { nextBounded, nextUint32, randomState } from "../random/random";
import { canonicalHash } from "../replay/canonical";
import {
  NEUTRAL_MONSTER_ROLE_RULE_V7,
  RULESET_7,
  effectiveRoleRuleV7,
  factionTreeV7,
} from "../rules/ruleset-v7";
import { placeTreasureChestsV6 } from "../v6/map";
import { initialAchievementEntitlementsV7 } from "./achievements";
import { withFullShieldsV7 } from "./martian";
import { MONSTER_HP_V7, placeCuriositiesV7 } from "./curiosities";
import { placeRiftsV7 } from "./rift";
import {
  missionBoardV7,
  missionCapitalsV7,
  missionInitialStateV7,
  missionTreasureChestsV7,
} from "./missions/build";
import { missionDefinitionV7 } from "./missions/index";
import { validateMatchSetupV7, type MatchSetupErrorV7 } from "./setup";
import {
  createShowcaseEntitiesV7,
  showcaseBoardV7,
  showcaseCapitalsV7,
} from "./showcase";
import { parseGameStateV7 } from "./state-schema";
import {
  BIOME_IDS_V7,
  NEUTRAL_OWNER_ID_V7,
  RESOURCE_IDS_V7,
  RULESET_7_ID,
  TERRAIN_IDS_V7,
  type MonsterStateV7,
  type AiCountV7,
  type BiomeIdV7,
  type BoardStateV7,
  type CityStateV7,
  type CoordV7,
  type CuriosityV7,
  type GameStateV7,
  type FactionIdV7,
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
  | "CAPITAL_SEA_ESCAPE"
  | "CAPITAL_GROWTH"
  | "COAST_RING";

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
  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 4),
   * sorted by (y, x): empty unless the setup's `curiosities` is true, the
   * map is generated, and the rules are `CURIOSITIES`.
   */
  readonly curiosities: readonly CuriosityV7[];
  /**
   * Map curiosities (section 4, `pulp_wars-737.3`): the Giant Spider's home
   * when placement drew a Monster (boards 16 and up), else null. The initial
   * state creates the Monster there after every other initial entity.
   */
  readonly monsterHome: CoordV7 | null;
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
        // `DUPLICATE_FACTION`: docs/product/RULESET_7_UNIQUE_FACTIONS.md.
        | MatchSetupErrorV7
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
// Revision 14 (VL): one more neutral village in every setup than revision 13
// (3/4/6, 13/12/11, 20/19/18), except two Archipelago setups that keep their
// revision-13 count because the extra village fails map acceptance: 11 x 11
// one-AI (3; 20% of seeds fail with 4) and 16 x 16 three-AI (6; 0.7% of seeds
// 0-999 fail with 7).
const STANDARD: Readonly<Record<AiCountV7, number>> = { 1: 4, 2: 5, 3: 7 };
const LARGE: Readonly<Record<AiCountV7, number>> = { 1: 14, 2: 13, 3: 12 };
const HUGE: Readonly<Record<AiCountV7, number>> = { 1: 21, 2: 20, 3: 19 };
const SMALL_ARCHIPELAGO_VILLAGES_V7 = 3;
const CROWDED_ARCHIPELAGO_VILLAGES_V7 = 6;
/** Revision 16: Shallow Water is at least this share of a naval map's water. */
export const SHALLOW_WATER_MINIMUM_SHARE_V7 = 0.25;
const REVISION_15_SHALLOW_WATER_MINIMUM_SHARE_V7 = 0.4;
/** Revision 16: a growth-ready capital ring holds this many of one kind. */
export const CAPITAL_GROWTH_MINIMUM_V7 = 2;

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
  const validated = validateMatchSetupV7(input);
  if (!validated.ok) return validated;
  const setup = validated.setup;
  if (setup.mapType === "SHOWCASE") return showcaseMapV7(setup);
  if (setup.mapType === "MISSION") return missionMapV7(setup);
  return generateMapWithVillageCountV7(
    setup,
    villageCount(setup),
    "CURIOSITIES",
  );
}

/**
 * The authored mission board as a "generated" map
 * (docs/product/CAMPAIGN.md section 2.2): like the Showcase, no PRNG draw is
 * consumed, no generation invariant applies, turn order is seat order, and
 * the single attempt is attempt 1. The board carries the authored tiles and
 * settlement sites but no territory.
 */
function missionMapV7(setup: MatchSetupV7): GenerateMapResultV7 {
  const mission =
    setup.mission === undefined ? null : missionDefinitionV7(setup.mission);
  if (mission === null)
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  const capitals = missionCapitalsV7(mission);
  return {
    ok: true,
    map: deepFreeze({
      board: missionBoardV7(mission),
      capitals,
      villages: [...mission.villages].sort(
        (left, right) => left.y - right.y || left.x - right.x,
      ),
      capitalAssignments: capitals,
      turnOrderSeats: capitals.map((_, seat) => seat),
      treasureChests: missionTreasureChestsV7(mission),
      curiosities: [],
      monsterHome: null,
      random: randomState(mission.seed),
      attempt: 1,
      attempts: [],
      regionSizes: [],
    }),
  };
}

/**
 * Revision 18 section 5: the fixed Showcase board as a "generated" map. No
 * PRNG draw is consumed, no generation invariant applies, turn order is seat
 * order, and the single attempt is reported as attempt 1. The board carries
 * the developed tiles and settlement sites but no territory.
 */
function showcaseMapV7(setup: MatchSetupV7): GenerateMapResultV7 {
  const capitals = showcaseCapitalsV7(setup);
  return {
    ok: true,
    map: deepFreeze({
      board: showcaseBoardV7(setup),
      capitals,
      villages: [],
      capitalAssignments: capitals,
      turnOrderSeats: capitals.map((_, seat) => seat),
      treasureChests: [],
      curiosities: [],
      monsterHome: null,
      random: randomState(setup.seed),
      attempt: 1,
      attempts: [],
      regionSizes: [],
    }),
  };
}

/**
 * Generation rules a parity call reproduces. `CURIOSITIES` is the current
 * generator: the `RIFTS` generator followed, when the setup's `curiosities`
 * is true, by curiosity placement
 * (docs/product/RULESET_7_MAP_CURIOSITIES.md section 4) on its accepted
 * board. Curiosity placement draws only from its own stream and changes no
 * tile, so every `CURIOSITIES` map has exactly the board, capitals,
 * villages, chests, turn order, and match PRNG state of its `RIFTS` map;
 * only `curiosities` differs (empty under `RIFTS` and with the option off).
 * `RIFTS` is the generator before the curiosities:
 * the `PANGEA_COAST_RING` generator followed by Rift placement
 * (docs/product/RULESET_7_RIFT.md section 5) on its accepted board. Rift
 * placement draws only from its own stream and changes only the terrain of
 * the Rift tiles, so a `RIFTS` map without a Rift (every 11 x 11 and
 * 14 x 14 map, and the 16, 20, and 25 maps whose draw or sites give none)
 * is byte-identical to its `PANGEA_COAST_RING` map. `PANGEA_COAST_RING` is
 * the generator before the Rift: the `REVISION_16` generator except that a
 * Pangea keeps its land off the board's edge ring, with
 * {@link pangeaLandCountV7} land
 * cells, and must pass the `COAST_RING` invariant; every other map type is
 * byte-identical under the two. `REVISION_16` is the generator before the
 * coast ring (Pangea land on 72% of the board, edge cells included).
 * `REVISION_15` is the revision-14/15 generator: eight-neighbour Shallow
 * Water, the 40% Shallow minimum, and no capital growth floor or
 * `CAPITAL_GROWTH` invariant.
 */
export type MapGenerationRulesV7 =
  "REVISION_15" | "REVISION_16" | "PANGEA_COAST_RING" | "RIFTS" | "CURIOSITIES";

/**
 * Whether `rules` keep the Pangea coast ring (`PANGEA_COAST_RING`, `RIFTS`,
 * `CURIOSITIES`).
 */
function coastRingRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "PANGEA_COAST_RING" ||
    rules === "RIFTS" ||
    rules === "CURIOSITIES"
  );
}

/**
 * Pangea land cells under the coast ring: 72% of the board, capped at 90% of
 * the interior (the board without its edge ring) so that small boards keep
 * some water inside the ring: 72 of 121 cells on 11 x 11, 129 of 196 on
 * 14 x 14, 176 of 256 on 16 x 16, and 72% (288 and 450) on 20 and 25.
 */
export function pangeaLandCountV7(width: number, height: number): number {
  return Math.min(
    Math.floor(width * height * 0.72),
    Math.floor((width - 2) * (height - 2) * 0.9),
  );
}

/**
 * Parity and fixture support only; no rule path calls it. The generator with
 * an explicit neutral-village count and generation rules. With the revision-13
 * count of a setup (3/4/6, 13/12/11, or 20/19/18) and `REVISION_15` rules it
 * reproduces the revision-13 board, treasures, and turn order byte for byte,
 * which lets tests hold a map fixed while the rules change.
 */
export function generateInitialMapWithVillageCountV7(
  input: unknown,
  villages: number,
  rules: MapGenerationRulesV7 = "CURIOSITIES",
): GenerateMapResultV7 {
  const validated = validateMatchSetupV7(input);
  if (!validated.ok) return validated;
  const setup = validated.setup;
  if (
    // The fixed Showcase and the authored mission boards have no generator
    // and no village count.
    setup.mapType === "SHOWCASE" ||
    setup.mapType === "MISSION" ||
    !Number.isSafeInteger(villages) ||
    villages < 0 ||
    (rules !== "REVISION_15" &&
      rules !== "REVISION_16" &&
      rules !== "PANGEA_COAST_RING" &&
      rules !== "RIFTS" &&
      rules !== "CURIOSITIES")
  )
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  return generateMapWithVillageCountV7(setup, villages, rules);
}

function generateMapWithVillageCountV7(
  setup: MatchSetupV7,
  villages: number,
  rules: MapGenerationRulesV7,
): GenerateMapResultV7 {
  let random = randomState(setup.seed);
  let lastFailure: MapInvariantCodeV7 = "TILE_LAYOUT";
  const attempts: MapGenerationAttemptV7[] = [];
  for (let attempt = 1; attempt <= 256; attempt += 1) {
    const initialRandomState = random.state;
    const candidate = generateCandidate(setup, random, villages, rules);
    random = candidate.random;
    const failures = validate(candidate, setup, villages, rules);
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
      // RULESET_7_RIFT.md section 5: the Rifts go on the accepted board,
      // after the treasure chests, from their own stream.
      const board =
        rules === "RIFTS" || rules === "CURIOSITIES"
          ? placeRiftsV7(setup.seed, {
              board: candidate.board,
              capitals: candidate.capitals,
              villages: candidate.villages,
              treasureChests: treasure.treasureChests,
            }).board
          : candidate.board;
      // RULESET_7_MAP_CURIOSITIES.md section 4: the curiosities go on the
      // accepted board after the Rifts, from their own stream, only with
      // the option on; they never change a tile.
      const placement =
        rules === "CURIOSITIES" && setup.curiosities
          ? placeCuriositiesV7(setup.seed, {
              board,
              mapType: setup.mapType,
              capitals: candidate.capitals,
              villages: candidate.villages,
              treasureChests: treasure.treasureChests,
            })
          : { curiosities: [], monsterHome: null };
      const curiosities = placement.curiosities;
      const monsterHome = placement.monsterHome;
      return {
        ok: true,
        map: deepFreeze({
          board,
          capitals: candidate.capitals,
          villages: candidate.villages,
          capitalAssignments: candidate.capitalAssignments,
          turnOrderSeats: candidate.turnOrderSeats,
          treasureChests: treasure.treasureChests,
          curiosities,
          monsterHome,
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
  villageTotal: number,
  rules: MapGenerationRulesV7,
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
    setup.mapType === "DRY_LAND"
      ? null
      : topologyMaskV7(setup, topologyDraws, rules);
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
  const villages = villageShuffle.values.slice(0, villageTotal);
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
        rules,
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
  // Revision 16 (section 3.3): the PRNG-free capital growth floor runs last,
  // after the settlement ring floors and the water resource draws, so every
  // invariant (capital fairness included) sees the floored board.
  if (!navalPlacementFailed && rules !== "REVISION_15")
    board = applyCapitalGrowthFloorV7(
      board,
      capitals,
      (at) => rank.get(key(at)) ?? 0,
      setup.mapType !== "DRY_LAND",
    );
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

/**
 * Revision 16 section 4.1: a water cell is Shallow Water if and only if one of
 * its four orthogonal on-board neighbours is land; water whose only land
 * contact is diagonal is Deep Water. Off-board cells never count.
 */
export function isShallowWaterV7(
  width: number,
  height: number,
  at: CoordV7,
  isLand: (at: CoordV7) => boolean,
): boolean {
  return neighbors4(width, height, at).some(isLand);
}

/** Growth resources on a capital's eight ring cells (revision 16 section 3.2). */
export interface CapitalGrowthCountsV7 {
  /** Fruit on Grass. */
  readonly fruit: number;
  /** Game on Forest. */
  readonly game: number;
  /** Fish on Shallow Water; always 0 when `naval` is false (Dry Land). */
  readonly fish: number;
}

/**
 * Revision 16 section 3.2: the growth resources of each kind on the capital's
 * eight ring cells. Fish counts only on naval (non-`DRY_LAND`) maps.
 */
export function capitalGrowthCountsV7(
  board: BoardStateV7,
  capital: CoordV7,
  naval: boolean,
): CapitalGrowthCountsV7 {
  let fruit = 0;
  let game = 0;
  let fish = 0;
  for (const at of neighbors8(board.width, board.height, capital)) {
    const tile = tileAt(board, at);
    if (tile === undefined) continue;
    if (tile.resource === "FRUIT" && tile.terrain === "GRASS") fruit += 1;
    else if (tile.resource === "GAME" && tile.terrain === "FOREST") game += 1;
    else if (
      naval &&
      tile.resource === "FISH" &&
      tile.terrain === "SHALLOW_WATER"
    )
      fish += 1;
  }
  return { fruit, game, fish };
}

/**
 * Revision 16 `CAPITAL_GROWTH`: the capital's ring holds at least two growth
 * resources of the same kind, so free research of that kind's technology and
 * two harvests (4 of the first turn's 7 Coins) reach level 2 on turn 1.
 */
export function capitalGrowthReadyV7(
  board: BoardStateV7,
  capital: CoordV7,
  naval: boolean,
): boolean {
  const counts = capitalGrowthCountsV7(board, capital, naval);
  return (
    Math.max(counts.fruit, counts.game, counts.fish) >=
    CAPITAL_GROWTH_MINIMUM_V7
  );
}

/**
 * Revision 16 section 3.3 growth floor: deterministic and PRNG-free. For each
 * capital in `(y, x)` order that is not growth-ready, place Fruit on empty
 * ring Grass or Game on empty ring Forest (no resource, site, or
 * improvement), choosing the feasible kind that needs fewer additions (a tie
 * picks Game for a `WOODLAND` capital, otherwise Fruit), on the eligible cells
 * of lowest `rank`. Terrain never changes, no resource is removed, and no
 * Fish, Pearls, Fertile Ground, or Ore is placed. A capital with no feasible
 * kind is left unchanged for `CAPITAL_GROWTH` to reject.
 */
export function applyCapitalGrowthFloorV7(
  board: BoardStateV7,
  capitals: readonly CoordV7[],
  rank: (at: CoordV7) => number,
  naval: boolean,
): BoardStateV7 {
  let tiles: TileStateV7[] | null = null;
  const current = (): BoardStateV7 =>
    tiles === null ? board : { ...board, tiles };
  for (const capital of [...capitals].sort(compareCoords)) {
    const counts = capitalGrowthCountsV7(current(), capital, naval);
    if (
      Math.max(counts.fruit, counts.game, counts.fish) >=
      CAPITAL_GROWTH_MINIMUM_V7
    )
      continue;
    const empty = neighbors8(board.width, board.height, capital)
      .map((at) => tileAt(current(), at) as TileStateV7)
      .filter(
        (tile) =>
          tile.biome !== null &&
          tile.resource === null &&
          tile.site === null &&
          tile.improvement === null,
      )
      .sort((a, b) => rank(a.at) - rank(b.at) || compareCoords(a.at, b.at));
    const woodland = tileAt(board, capital)?.biome === "WOODLAND";
    const choice = [
      {
        resource: "FRUIT" as const,
        need: CAPITAL_GROWTH_MINIMUM_V7 - counts.fruit,
        cells: empty.filter((tile) => tile.terrain === "GRASS"),
        preferred: !woodland,
      },
      {
        resource: "GAME" as const,
        need: CAPITAL_GROWTH_MINIMUM_V7 - counts.game,
        cells: empty.filter((tile) => tile.terrain === "FOREST"),
        preferred: woodland,
      },
    ]
      .filter((option) => option.cells.length >= option.need)
      .sort(
        (a, b) => a.need - b.need || Number(b.preferred) - Number(a.preferred),
      )[0];
    if (choice === undefined) continue;
    const next: TileStateV7[] = tiles ?? [...board.tiles];
    for (const tile of choice.cells.slice(0, choice.need))
      next[tile.at.y * board.width + tile.at.x] = {
        ...tile,
        resource: choice.resource,
      };
    tiles = next;
  }
  return current();
}

function validate(
  candidate: Candidate,
  setup: MatchSetupV7,
  villageTotal: number,
  rules: MapGenerationRulesV7,
): MapInvariantCodeV7[] {
  if (setup.mapType !== "DRY_LAND")
    return validateNavalCandidate(candidate, setup, villageTotal, rules);
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
  if (capitals.length !== setup.aiCount + 1 || villages.length !== villageTotal)
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
  if (
    rules !== "REVISION_15" &&
    capitals.some((capital) => !capitalGrowthReadyV7(board, capital.at, false))
  )
    failures.push("CAPITAL_GROWTH");
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
  rules: MapGenerationRulesV7,
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
      // Revision 16 (section 4.1): orthogonal land contact only; the
      // revision-15 parity rules keep the eight-neighbour test.
      const landAt = (at: CoordV7): boolean => land.has(key(at));
      const shallow =
        rules !== "REVISION_15"
          ? isShallowWaterV7(original.width, original.height, tile.at, landAt)
          : neighbors8(original.width, original.height, tile.at).some(landAt);
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
  rules: MapGenerationRulesV7,
): Set<string> {
  const { width, height, mapType } = setup;
  const land = new Set<string>();
  const add = (x: number, y: number) => land.add(key({ x, y }));
  if (mapType === "PANGEA") {
    // The coast ring (PANGEA_COAST_RING rules): no land on the board's edge
    // ring, so water surrounds the island. Filtering the edge cells out keeps
    // the jittered radial order of every interior cell.
    const ring = coastRingRulesV7(rules);
    const wanted = ring
      ? pangeaLandCountV7(width, height)
      : Math.floor(width * height * 0.72);
    for (const at of allCoords(width, height)
      .filter((at) => !ring || !onBoardEdgeV7(width, height, at))
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
  villageTotal: number,
  rules: MapGenerationRulesV7,
): MapInvariantCodeV7[] {
  const board = candidate.board;
  const failures: MapInvariantCodeV7[] = [];
  if (candidate.navalPlacementFailed) return ["SETTLEMENT_COUNT"];
  const shallowMinimumShare =
    rules !== "REVISION_15"
      ? SHALLOW_WATER_MINIMUM_SHARE_V7
      : REVISION_15_SHALLOW_WATER_MINIMUM_SHARE_V7;
  const land = board.tiles.filter((tile) => tile.biome !== null);
  const water = board.tiles.filter((tile) => tile.biome === null);
  const coastRing = setup.mapType === "PANGEA" && coastRingRulesV7(rules);
  const bounds =
    setup.mapType === "PANGEA"
      ? [0.68, 0.76]
      : setup.mapType === "CONTINENTS"
        ? [0.5, 0.62]
        : setup.mapType === "ARCHIPELAGO"
          ? [0.34, 0.46]
          : [0.72, 0.84];
  // The coast-ring Pangea has exactly its land count (59.5-72% of the board).
  if (
    coastRing
      ? land.length !== pangeaLandCountV7(board.width, board.height)
      : land.length < Math.ceil((bounds[0] ?? 0) * board.tiles.length) ||
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
  // Revision 16 (section 4.2): the Shallow minimum is 25% of water (was 40%,
  // sized for the eight-neighbour classification).
  if (
    water.filter((tile) => tile.terrain === "SHALLOW_WATER").length <
      Math.ceil(water.length * shallowMinimumShare) ||
    water.filter((tile) => tile.terrain === "DEEP_WATER").length <
      Math.max(4, Math.floor(water.length / 10))
  )
    failures.push("TERRAIN_GLOBAL_PRESENCE");
  if (
    board.tiles.filter((tile) => tile.site === "CAPITAL").length !==
      setup.aiCount + 1 ||
    board.tiles.filter((tile) => tile.site === "VILLAGE").length !==
      villageTotal
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
  if (
    rules !== "REVISION_15" &&
    capitalTiles.some(
      (capital) => !capitalGrowthReadyV7(board, capital.at, true),
    )
  )
    failures.push("CAPITAL_GROWTH");
  if (coastRing && !pangeaCoastRingV7(board)) failures.push("COAST_RING");
  return [...new Set(failures)];
}

/**
 * The Pangea coast ring (`COAST_RING`): no land cell is on the board's edge
 * ring, so Water surrounds the island, and a boat that may enter Shallow
 * Water only (Shorecraft) can sail all the way around the main landmass (the
 * largest eight-connected land component). Exactly: the Shallow Water cells
 * orthogonally adjacent to the main landmass lie in one eight-connected
 * Shallow Water component, and that component encloses the main landmass, so
 * no four-connected path from outside the board through cells outside the
 * component reaches it. Movement is eight-directional, so the enclosing
 * component contains a closed sailing loop around the island.
 */
export function pangeaCoastRingV7(board: BoardStateV7): boolean {
  const { width, height } = board;
  const coords = allCoords(width, height);
  if (
    coords.some(
      (at) =>
        onBoardEdgeV7(width, height, at) && tileAt(board, at)?.biome !== null,
    )
  )
    return false;
  const landKeys = new Set(
    board.tiles
      .filter((tile) => tile.biome !== null)
      .map((tile) => key(tile.at)),
  );
  const main = componentsOfMask(width, height, landKeys, true)[0];
  if (main === undefined) return false;
  const mainKeys = new Set(main.map(key));
  const shallow = (at: CoordV7): boolean =>
    tileAt(board, at)?.terrain === "SHALLOW_WATER";
  const coast = new Set<string>();
  for (const at of main)
    for (const near of neighbors4(width, height, at))
      if (shallow(near)) coast.add(key(near));
  const start = main
    .flatMap((at) => neighbors4(width, height, at))
    .find(shallow);
  if (start === undefined) return false;
  const loop = new Set([key(start)]);
  const queue = [start];
  for (let cursor = 0; cursor < queue.length; cursor += 1)
    for (const near of neighbors8(width, height, queue[cursor] as CoordV7))
      if (shallow(near) && !loop.has(key(near))) {
        loop.add(key(near));
        queue.push(near);
      }
  if ([...coast].some((cell) => !loop.has(cell))) return false;
  const outside = coords.filter(
    (at) => onBoardEdgeV7(width, height, at) && !loop.has(key(at)),
  );
  const reached = new Set(outside.map(key));
  for (let cursor = 0; cursor < outside.length; cursor += 1) {
    const at = outside[cursor] as CoordV7;
    if (mainKeys.has(key(at))) return false;
    for (const near of neighbors4(width, height, at))
      if (!loop.has(key(near)) && !reached.has(key(near))) {
        reached.add(key(near));
        outside.push(near);
      }
  }
  return true;
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
  return onBoardEdgeV7(board.width, board.height, at);
}

function onBoardEdgeV7(width: number, height: number, at: CoordV7): boolean {
  return at.x === 0 || at.y === 0 || at.x === width - 1 || at.y === height - 1;
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
  const validated = validateMatchSetupV7(input);
  if (!validated.ok) return validated;
  const setup = validated.setup;
  return initialMapStateFromV7(setup, generateInitialMapV7(setup));
}

/**
 * Parity and fixture support only (see
 * {@link generateInitialMapWithVillageCountV7}): the initial map state of a
 * setup generated with an explicit neutral-village count.
 */
export function createInitialMapStateWithVillageCountV7(
  input: unknown,
  villages: number,
  rules: MapGenerationRulesV7 = "CURIOSITIES",
): CreateInitialMapStateResultV7 {
  const validated = validateMatchSetupV7(input);
  if (!validated.ok) return validated;
  const setup = validated.setup;
  return initialMapStateFromV7(
    setup,
    generateInitialMapWithVillageCountV7(setup, villages, rules),
  );
}

function initialMapStateFromV7(
  setup: MatchSetupV7,
  generated: GenerateMapResultV7,
): CreateInitialMapStateResultV7 {
  if (!generated.ok) return generated;
  if (setup.mapType === "SHOWCASE") return showcaseInitialStateV7(setup);
  // docs/product/CAMPAIGN.md section 2.2: the authored mission state.
  if (setup.mapType === "MISSION")
    return { ok: true, state: missionInitialStateV7(setup), mapAttempt: 1 };
  const players = createPlayers(setup);
  const entities = createEntities(
    players,
    generated.map.capitalAssignments,
    generated.map.board,
    generated.map.treasureChests,
  );
  const board = assignTerritories(generated.map.board, entities.cities);
  // Map curiosities (section 3, `pulp_wars-737.3`): the Monster is created
  // after every other initial entity, so it takes the last initial entity
  // ID and shifts no other ID.
  const monster =
    generated.map.monsterHome === null
      ? null
      : createMonsterUnitV7(entities.nextEntityId, generated.map.monsterHome);
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
    nextEntityId: monster?.nextEntityId ?? entities.nextEntityId,
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
    units:
      monster === null ? entities.units : [...entities.units, monster.unit],
    treasureChests: generated.map.treasureChests,
    curiosities: generated.map.curiosities,
    monsters: monster === null ? [] : [monster.entry],
    graves: [],
    plagued: [],
    bitten: [],
    eggs: [],
    // The Martian revision: a starting Grunt has its full Shield.
    shields: withFullShieldsV7(
      { players: explored, mindControlled: [] },
      [],
      entities.units,
    ),
    cooling: [],
    mindControlled: [],
    mindControlCooldowns: [],
    chilled: [],
    burrowed: [],
    surfacedThisTurn: [],
    bombedThisTurn: [],
    beamedThisTurn: [],
    tractorUsedThisTurn: [],
    pendingChoices: [],
    outcome: null,
  });
  if (parseGameStateV7(state) === null)
    throw new Error("Internal v7 initial-state invariant failure");
  return { ok: true, state, mapAttempt: generated.map.attempt };
}
/**
 * Revision 18 section 5: the Showcase initial state. It is an ordinary
 * `GameStateV7` and must pass the full state schema, including the
 * population-ledger cross-checks.
 */
function showcaseInitialStateV7(
  setup: MatchSetupV7,
): CreateInitialMapStateResultV7 {
  const entities = createShowcaseEntitiesV7(
    setup,
    createPlayers(setup),
    freshStartActivation,
  );
  const state = deepFreeze<GameStateV7>({
    schemaVersion: 7,
    rulesetId: RULESET_7_ID,
    setup,
    random: randomState(setup.seed),
    humanPlayerId: entities.players[0]?.id ?? playerId(1),
    nextEntityId: entities.nextEntityId,
    commandIndex: 0,
    round: 1,
    activeSeatIndex: 0,
    turnOrder: entities.players.map((player) => player.id),
    board: entities.board,
    players: entities.players,
    cities: entities.cities,
    populationContributions: entities.populationContributions,
    units: entities.units,
    treasureChests: [],
    curiosities: [],
    monsters: [],
    graves: [],
    plagued: [],
    bitten: [],
    eggs: [],
    // The Martian revision: every Showcase unit starts at its full Shield.
    shields: withFullShieldsV7(
      { players: entities.players, mindControlled: [] },
      [],
      entities.units,
    ),
    cooling: [],
    mindControlled: [],
    mindControlCooldowns: [],
    chilled: [],
    burrowed: [],
    surfacedThisTurn: [],
    bombedThisTurn: [],
    beamedThisTurn: [],
    tractorUsedThisTurn: [],
    pendingChoices: [],
    outcome: null,
  });
  if (parseGameStateV7(state) === null)
    throw new Error("Internal v7 Showcase initial-state invariant failure");
  return { ok: true, state, mapAttempt: 1 };
}
function createPlayers(setup: MatchSetupV7): readonly PlayerStateV7[] {
  const colors = COLORS.filter((color) => color !== setup.humanColor);
  return Array.from({ length: setup.aiCount + 1 }, (_, seat) => {
    // Revision 13: each seat binds its setup faction and that faction's tree.
    const tree = factionTreeV7(setup.factions[seat] as FactionIdV7);
    return {
      id: playerId(seat + 1),
      seat,
      controller: seat === 0 ? "HUMAN" : "AI",
      color:
        seat === 0 ? setup.humanColor : (colors[seat - 1] as PlayerColorV7),
      faction: tree.faction,
      factionTreeId: tree.id,
      status: "ACTIVE",
      coins: RULESET_7.startingCoins,
      researchedTechs: tree.startingTechIds,
      explored: [],
      spoilsClaimedCityIds: [],
      achievementEntitlements: initialAchievementEntitlementsV7(),
      originalCapitalCityId: cityId(seat * 2 + 1),
    };
  });
}
/**
 * Revision 17 section 2.2: the number of starting `FIGHTER` units of a seat.
 * Every faction starts with one (`pulp_wars-0ao.7` tuned the Goblin seat's
 * two Goblins to one, within the section 14.1 bounds of 1–2). With 2, the
 * second Goblin is placed by `startingCompanionCellV7`.
 */
export const STARTING_FIGHTERS_V7: Readonly<Record<FactionIdV7, 1 | 2>> =
  deepFreeze({
    ORIGINAL: 1,
    UNDEAD: 1,
    GOBLIN: 1,
    DINOSAUR: 1,
    MARTIAN: 1,
    ICE_FOLK: 1,
    DWARF: 1,
  });

/**
 * Revision 17 section 8.9: the `FIGHTER` units of a level-3 Militia reward.
 * A Goblin Militia is two Goblins; every other faction's is one unit.
 */
export const MILITIA_FIGHTERS_V7: Readonly<Record<FactionIdV7, 1 | 2>> =
  deepFreeze({
    ORIGINAL: 1,
    UNDEAD: 1,
    GOBLIN: 2,
    DINOSAUR: 1,
    MARTIAN: 1,
    ICE_FOLK: 1,
    DWARF: 1,
  });

/**
 * Revision 17 section 2.2: the cell of a Goblin seat's second starting
 * Goblin: the first cell of the capital's eight-cell ring in (y, x) order
 * that is land, not Mountain, and has no unit and no treasure chest, or null
 * (the seat then starts with one Goblin and no compensation).
 */
export function startingCompanionCellV7(
  board: BoardStateV7,
  capital: CoordV7,
  occupied: readonly CoordV7[],
  treasureChests: readonly CoordV7[],
): CoordV7 | null {
  return (
    neighbors8(board.width, board.height, capital).find((candidate) => {
      const tile = board.tiles[candidate.y * board.width + candidate.x];
      return (
        tile !== undefined &&
        (tile.terrain === "GRASS" || tile.terrain === "FOREST") &&
        !occupied.some((at) => same(at, candidate)) &&
        !treasureChests.some((chest) => same(chest, candidate))
      );
    }) ?? null
  );
}

/**
 * Map curiosities (section 8, `pulp_wars-737.3`): the Giant Spider at its
 * home with the ID `nextEntityId`: owned by the neutral owner, no home city,
 * full HP, no kills, never veteran or capture-eligible, a fresh activation.
 */
function createMonsterUnitV7(
  nextEntityId: number,
  home: CoordV7,
): {
  readonly unit: UnitStateV7;
  readonly entry: MonsterStateV7;
  readonly nextEntityId: number;
} {
  const allocation = allocateUnitId(nextEntityId);
  return {
    unit: {
      id: allocation.id,
      ownerId: NEUTRAL_OWNER_ID_V7,
      homeCityId: null,
      role: NEUTRAL_MONSTER_ROLE_RULE_V7.role,
      form: "LAND",
      at: home,
      hp: MONSTER_HP_V7,
      maxHp: MONSTER_HP_V7,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: freshStartActivation(),
    },
    entry: { unitId: allocation.id, home, provokedBy: [] },
    nextEntityId: allocation.nextEntityId,
  };
}

function freshStartActivation(): UnitStateV7["activation"] {
  return {
    moved: false,
    movedPathLength: 0,
    attacked: false,
    attacksUsed: 0,
    tendedThisTurn: false,
    inspired: false,
    overrunActive: false,
    escapeAvailable: false,
    recovered: false,
    captured: false,
    handled: false,
    specialActed: false,
  };
}

function createEntities(
  players: readonly PlayerStateV7[],
  capitals: readonly CoordV7[],
  board: BoardStateV7,
  treasureChests: readonly CoordV7[],
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
      cityActionAvailable: false,
      rewards: [],
    });
    const unit = allocateUnitId(nextEntityId);
    nextEntityId = unit.nextEntityId;
    // The start unit is the owner's FIGHTER role (Fighter or Skeleton).
    const startRule = effectiveRoleRuleV7("FIGHTER", player.faction);
    units.push({
      id: unit.id,
      ownerId: player.id,
      homeCityId: city.id,
      role: "FIGHTER",
      form: "LAND",
      at,
      hp: startRule.maxHp,
      maxHp: startRule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: freshStartActivation(),
    });
  });
  // Revision 17: a Goblin seat's second Goblin is created after every seat's
  // first start unit (in seat order), so capital, city, and first-unit IDs
  // equal those of an all-Human setup. It stands on the first capital-ring
  // cell in (y, x) order that is land, not Mountain, and has no unit and no
  // treasure chest; without one the seat starts with one Goblin.
  players.forEach((player, index) => {
    if (STARTING_FIGHTERS_V7[player.faction] < 2) return;
    const capital = capitals[index] as CoordV7;
    const city = cities[index] as CityStateV7;
    const at = startingCompanionCellV7(
      board,
      capital,
      units.map((unit) => unit.at),
      treasureChests,
    );
    if (at === null) return;
    const unit = allocateUnitId(nextEntityId);
    nextEntityId = unit.nextEntityId;
    const startRule = effectiveRoleRuleV7("FIGHTER", player.faction);
    units.push({
      id: unit.id,
      ownerId: player.id,
      homeCityId: city.id,
      role: "FIGHTER",
      form: "LAND",
      at,
      hp: startRule.maxHp,
      maxHp: startRule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: freshStartActivation(),
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

/** Revision 14 neutral village count (current rules section 2.2). */
export function villageCountV7(setup: MatchSetupV7): number {
  return villageCount(setup);
}

function villageCount(setup: MatchSetupV7): number {
  if (setup.mapType === "ARCHIPELAGO" && setup.width === 11)
    return SMALL_ARCHIPELAGO_VILLAGES_V7;
  if (
    setup.mapType === "ARCHIPELAGO" &&
    setup.width === 16 &&
    setup.aiCount === 3
  )
    return CROWDED_ARCHIPELAGO_VILLAGES_V7;
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
