import { deepFreeze } from "../model/freeze";
import { allocateCityId, allocateUnitId, cityId, playerId } from "../model/ids";
import { nextBounded, nextUint32, randomState } from "../random/random";
import { canonicalHash } from "../replay/canonical";
import {
  NEUTRAL_ROLE_RULES_V7,
  RULESET_7,
  effectiveRoleRuleV7,
  factionTreeV7,
  startingFavourV7,
} from "../rules/ruleset-v7";
import { placeTreasureChestsV6 } from "./treasure-placement";
import { initialAchievementEntitlementsV7 } from "./achievements";
import { withFullShieldsV7 } from "./martian";
import {
  CURIOSITY_CAPITAL_DISTANCE_V7,
  CURIOSITY_CAPITAL_SPREAD_V7,
  placeCuriositiesV7,
  type NeutralPlacementV7,
} from "./curiosities";
import { placeRiftsV7 } from "./rift";
import {
  missionBoardV7,
  missionCapitalsV7,
  missionInitialStateV7,
  missionTreasureChestsV7,
} from "./missions/build";
import { missionDefinitionV7 } from "./missions/index";
import {
  CAPITAL_EDGE_MARGIN_V7,
  SETTLEMENT_SPACING_V7,
  VILLAGE_EDGE_MARGIN_V7,
  capitalSpacingV7,
  centralZoneEdgeDistanceV7,
  continentCapitalSplitV7,
  domainBandV7,
  domainsPerSideV7,
  lakeWaterCountV7,
  landmassLandCountV7,
  majorLandmassMinimumV7,
  pangeaLandCountV7,
  priorVillageCountV7,
  villageCountV7,
} from "./map-scale";
import { validateMatchSetupV7, type MatchSetupErrorV7 } from "./setup";
import {
  createShowcaseEntitiesV7,
  showcaseBoardV7,
  showcaseCapitalsV7,
} from "./showcase";
import { initialScoreLedgerV7 } from "./score";
import { parseGameStateV7 } from "./state-schema";
import {
  BIOME_IDS_V7,
  NEUTRAL_OWNER_ID_V7,
  PLAYER_COLORS_V7,
  RESOURCE_IDS_V7,
  RULESET_7_ID,
  TERRAIN_IDS_V7,
  emptyNinthUnitStateV7,
  emptyCultStateV7,
  emptyGiantsStateV7,
  aiHeadStartCoinsV7,
  type MonsterStateV7,
  type AiCountV7,
  type BiomeIdV7,
  type BoardStateV7,
  type CityStateV7,
  type CoordV7,
  type CuriosityV7,
  type CultStateV7,
  type GameStateV7,
  type FactionIdV7,
  type MapTypeV7,
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
  | "COAST_RING"
  // Map scale (docs/product/RULESET_7_MAP_SCALE.md section 5.3): the
  // candidate could not place every village of its density.
  | "VILLAGE_DENSITY"
  // Map scale section 4.4 items 3 and 4: the land or the villages nearest
  // each capital are too uneven.
  | "ROOM_BALANCE"
  | "VILLAGE_BALANCE";

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
   * The wild reserve (docs/product/RULESET_7_MAP_SCALE.md section 5.4), in
   * the order drawn: land tiles that every village keeps 3 or more from, so
   * a curiosity and a Rift stay possible on a village-dense board. They are
   * a generation fact only: no tile, state, or view records them. Empty on
   * the Showcase, a mission, a crowded board, and under the generation
   * rules before the village density.
   */
  readonly wildCentres: readonly CoordV7[];
  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 4),
   * sorted by (y, x): empty unless the setup's `curiosities` is true, the
   * map is generated, and the rules are `CURIOSITIES`.
   */
  readonly curiosities: readonly CuriosityV7[];
  /**
   * Map curiosities (section 4, `pulp_wars-737.3`; round 2, section 24.1):
   * the neutral units placement drew (the Giant Spider, a camp's guards,
   * Bigfoot), in placement order with a camp's guards in composition order.
   * The initial state creates them, in this order, after every other
   * initial entity.
   */
  readonly neutrals: readonly NeutralPlacementV7[];
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
  readonly wildCentres: readonly CoordV7[];
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
  /** Dry Land under the capital domains: the capital search found none. */
  readonly capitalPlacementFailed: boolean;
}
const COLORS: readonly PlayerColorV7[] = PLAYER_COLORS_V7;
// The fixed village table of revision 14 through `pulp-wars-poc-7r39`, kept
// for the parity rules only ({@link revision14VillageCountV7}); the current
// count follows the density ({@link villageCountV7}).
// Revision 14 (VL): one more neutral village in every setup than revision 13
// (3/4/6, 13/12/11, 20/19/18), except two Archipelago setups that keep their
// revision-13 count because the extra village fails map acceptance: 11 x 11
// one-AI (3; 20% of seeds fail with 4) and 16 x 16 three-AI (6; 0.7% of seeds
// 0-999 fail with 7).
const STANDARD: Readonly<Record<AiCountV7, number>> = { 1: 4, 2: 5, 3: 7 };
const LARGE: Readonly<Record<AiCountV7, number>> = { 1: 14, 2: 13, 3: 12 };
const HUGE: Readonly<Record<AiCountV7, number>> = { 1: 21, 2: 20, 3: 19 };
/**
 * The setups the generators before the capital domains accepted (two to
 * four seats, with at least 14 tiles a side for three and 16 for four): a
 * parity call under their rules refuses any other setup.
 */
function legacySeatSetupV7(setup: MatchSetupV7): boolean {
  return (
    setup.aiCount <= 3 &&
    setup.width >= (setup.aiCount === 1 ? 11 : setup.aiCount === 2 ? 14 : 16)
  );
}
const SMALL_ARCHIPELAGO_VILLAGES_V7 = 3;
const CROWDED_ARCHIPELAGO_VILLAGES_V7 = 6;
/** Map scale section 5.4: a wild centre is at least this far from the edge. */
export const WILD_CENTRE_EDGE_MARGIN_V7 = 2;
/** Map scale section 5.4: two wild centres are at least this far apart. */
export const WILD_CENTRE_SPACING_V7 = 6;
/**
 * Map scale section 5.4: every village keeps this far from a wild centre on
 * widths 11 and 14 ({@link wildCentreVillageDistanceV7}).
 */
export const WILD_CENTRE_VILLAGE_DISTANCE_V7 = 3;
/** The same on widths 16 and up, where a Giant Spider's lair may stand. */
export const WILD_CENTRE_LAIR_DISTANCE_V7 = 4;
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
    villageCountV7(setup),
    "NATURAL_WATER_CURIOSITIES",
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
      wildCentres: [],
      curiosities: [],
      neutrals: [],
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
      wildCentres: [],
      curiosities: [],
      neutrals: [],
      random: randomState(setup.seed),
      attempt: 1,
      attempts: [],
      regionSizes: [],
    }),
  };
}

/**
 * Generation rules a parity call reproduces. The three `NATURAL_WATER`
 * rules are the generator of `pulp_wars-ykw.8` (`pulp-wars-poc-7r87`,
 * docs/product/RULESET_7_MAP_SCALE.md section 5.8): the spread-villages
 * generator below except on Continents and Lakes. Continents landmasses
 * cover 46% of the board (56% before; {@link villageCountForRulesV7} gives
 * each rule its density), grow as noise-shaped blobs from inset spines
 * with a sea margin between them (up to four seats) and with nine seats in
 * neighbouring domains, and islets stand in the open sea; Lakes boards have
 * two to five noise-shaped lakes; and up to four seats every start has a
 * village within 5. Every other map type is byte-identical under the two.
 * `NATURAL_WATER` is that generator without Rifts or curiosities,
 * `NATURAL_WATER_RIFTS` adds Rift placement, and
 * `NATURAL_WATER_CURIOSITIES`, the current generator, adds curiosity
 * placement when the setup's `curiosities` is true.
 *
 * The three `SPREAD_VILLAGES`
 * rules are the generator of `pulp_wars-9s0.12` (`pulp-wars-poc-7r79`,
 * docs/product/RULESET_7_MAP_SCALE.md section 5.7): the many-seats
 * generator below except that no village is chosen by its place in
 * `(y, x)` order (`7r79` to `7r84`; mission boards baked then name them). On every water map the coastal settlement a landmass
 * needs is the legal coast tile of lowest tile rank (the first in `(y, x)`
 * order before), and on Continents and Archipelago the villages are the
 * sites of a full packing of the land kept in tile-rank order
 * ({@link spreadFillVillagesV7}; the `(y, x)` fill before, which left the
 * lower rows of every landmass empty). Neither draws from any stream. Dry
 * Land has neither step, so a Dry Land map is byte-identical under
 * `SPREAD_VILLAGES` and `CAPITAL_DOMAINS`. `SPREAD_VILLAGES` is that
 * generator without Rifts or curiosities, `SPREAD_VILLAGES_RIFTS` adds Rift
 * placement, and `SPREAD_VILLAGES_CURIOSITIES`, the `7r79` to `7r84`
 * generator, adds curiosity placement when the setup's `curiosities` is
 * true.
 *
 * The three `CAPITAL_DOMAINS`
 * rules are the many-seats generator of `pulp_wars-ykw.3`
 * (docs/product/RULESET_7_MAP_SCALE.md sections 3 and 4, map revision
 * `REGIONAL_BIOMES_NAVAL_V4`): the village-density generator below with
 * two to as many seats as there are factions; capitals drawn uniformly
 * inside domains (the four corner domains for up to four seats, the ring
 * of the 3 x 3 for five to eight) on Dry Land, Pangea, and Lakes, at least
 * `D(w, N)` apart, 2 or more from the edge, and outside the central zone;
 * Continents with two to four landmasses sized by the capitals they hold
 * and exactly that many capitals each; Archipelago with one island per
 * seat, on the ring slots from five seats; and the room and village balance
 * invariants. `CAPITAL_DOMAINS` is that generator without Rifts or
 * curiosities, `CAPITAL_DOMAINS_RIFTS` adds Rift placement, and
 * `CAPITAL_DOMAINS_CURIOSITIES`, the `7r42` to `7r78` generator, adds
 * curiosity placement when the setup's `curiosities` is true, exactly as for the
 * `VILLAGE_DENSITY` rules.
 *
 * The three `VILLAGE_DENSITY`
 * rules are the map scale generator of `pulp_wars-ykw.2`
 * (docs/product/RULESET_7_MAP_SCALE.md section 5, map revision
 * `REGIONAL_BIOMES_NAVAL_V3`, `pulp-wars-poc-7r40` and `7r41`; two to four
 * seats, capitals on the corners of the settlement lattice or by the naval
 * score order): the village count follows the density; on
 * Dry Land, Pangea, and Lakes the villages are packed lattice-first on
 * tiles 1 or more from the edge after the wild reserve; on Continents and
 * Archipelago they fill the land in `(y, x)` order with no reserve, each
 * Continents landmass capped at its share and the Archipelago home islands
 * getting equal villages; and `VILLAGE_DENSITY` is an invariant.
 * `VILLAGE_DENSITY` is that generator
 * with the Pangea coast ring and without Rifts or curiosities;
 * `VILLAGE_DENSITY_RIFTS` adds Rift placement; and
 * `VILLAGE_DENSITY_CURIOSITIES`, the `7r41` generator, adds curiosity
 * placement when the setup's `curiosities` is true. Rift and curiosity
 * placement are the same steps as under `RIFTS` and `CURIOSITIES`, so a
 * `VILLAGE_DENSITY_RIFTS` map without a Rift is byte-identical to its
 * `VILLAGE_DENSITY` map, and a `VILLAGE_DENSITY_CURIOSITIES` map differs
 * from its `VILLAGE_DENSITY_RIFTS` map only in `curiosities` and
 * `neutrals`.
 *
 * Every other rule reproduces a generator before the village density
 * (`pulp-wars-poc-7r39` and earlier, map revision
 * `REGIONAL_BIOMES_NAVAL_V2`): settlements on the pitch-3 lattice 2 from
 * the edge, with the village count the caller passes
 * ({@link revision14VillageCountV7} for the `7r39` boards). `CURIOSITIES`
 * is the `7r39` generator: the `RIFTS` generator followed, when the setup's
 * `curiosities` is true, by curiosity placement
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
export const MAP_GENERATION_RULES_V7 = Object.freeze([
  "REVISION_15",
  "REVISION_16",
  "PANGEA_COAST_RING",
  "RIFTS",
  "CURIOSITIES",
  "VILLAGE_DENSITY",
  "VILLAGE_DENSITY_RIFTS",
  "VILLAGE_DENSITY_CURIOSITIES",
  "CAPITAL_DOMAINS",
  "CAPITAL_DOMAINS_RIFTS",
  "CAPITAL_DOMAINS_CURIOSITIES",
  "SPREAD_VILLAGES",
  "SPREAD_VILLAGES_RIFTS",
  "SPREAD_VILLAGES_CURIOSITIES",
  "NATURAL_WATER",
  "NATURAL_WATER_RIFTS",
  "NATURAL_WATER_CURIOSITIES",
] as const);
export type MapGenerationRulesV7 = (typeof MAP_GENERATION_RULES_V7)[number];

/**
 * Whether `rules` choose no village by its place in `(y, x)` order
 * (`pulp-wars-poc-7r79`, map scale section 5.7).
 */
function spreadRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "SPREAD_VILLAGES" ||
    rules === "SPREAD_VILLAGES_RIFTS" ||
    rules === "SPREAD_VILLAGES_CURIOSITIES" ||
    naturalWaterRulesV7(rules)
  );
}

/**
 * Whether `rules` draw the natural water of `pulp_wars-ykw.8`
 * (`pulp-wars-poc-7r87`, map scale section 5.8): wider seas, smaller
 * landmasses, and islets on Continents, and noise-shaped lakes on Lakes.
 */
export function naturalWaterRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "NATURAL_WATER" ||
    rules === "NATURAL_WATER_RIFTS" ||
    rules === "NATURAL_WATER_CURIOSITIES"
  );
}

/**
 * Whether `rules` are the many-seats generator (map revision V4) or the
 * spread-villages generator built on it.
 */
function domainRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "CAPITAL_DOMAINS" ||
    rules === "CAPITAL_DOMAINS_RIFTS" ||
    rules === "CAPITAL_DOMAINS_CURIOSITIES" ||
    spreadRulesV7(rules)
  );
}

/**
 * Whether `rules` place villages by the density (map revisions V3 and V4:
 * the village-density rules and the many-seats rules built on them).
 */
function densityRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "VILLAGE_DENSITY" ||
    rules === "VILLAGE_DENSITY_RIFTS" ||
    rules === "VILLAGE_DENSITY_CURIOSITIES" ||
    domainRulesV7(rules)
  );
}

/**
 * Whether `rules` keep the Pangea coast ring (`PANGEA_COAST_RING`, `RIFTS`,
 * `CURIOSITIES`, and the village-density rules).
 */
function coastRingRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "PANGEA_COAST_RING" ||
    rules === "RIFTS" ||
    rules === "CURIOSITIES" ||
    densityRulesV7(rules)
  );
}

/** Whether `rules` place Rifts on the accepted board. */
function riftRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "RIFTS" ||
    rules === "CURIOSITIES" ||
    rules === "VILLAGE_DENSITY_RIFTS" ||
    rules === "VILLAGE_DENSITY_CURIOSITIES" ||
    rules === "CAPITAL_DOMAINS_RIFTS" ||
    rules === "CAPITAL_DOMAINS_CURIOSITIES" ||
    rules === "SPREAD_VILLAGES_RIFTS" ||
    rules === "SPREAD_VILLAGES_CURIOSITIES" ||
    rules === "NATURAL_WATER_RIFTS" ||
    rules === "NATURAL_WATER_CURIOSITIES"
  );
}

/** Whether `rules` place curiosities (when the setup's option is on). */
function curiosityRulesV7(rules: MapGenerationRulesV7): boolean {
  return (
    rules === "CURIOSITIES" ||
    rules === "VILLAGE_DENSITY_CURIOSITIES" ||
    rules === "CAPITAL_DOMAINS_CURIOSITIES" ||
    rules === "SPREAD_VILLAGES_CURIOSITIES" ||
    rules === "NATURAL_WATER_CURIOSITIES"
  );
}

/**
 * Parity and fixture support only; no rule path calls it. The generator with
 * an explicit neutral-village count and generation rules. With the revision-13
 * count of a setup (3/4/6, 13/12/11, or 20/19/18) and `REVISION_15` rules it
 * reproduces the revision-13 board, treasures, and turn order byte for byte,
 * and with {@link revision14VillageCountV7} and `CURIOSITIES` rules the
 * `pulp-wars-poc-7r39` map, which lets tests hold a map fixed while the
 * rules change. With {@link villageCountV7} and the default rules it is
 * {@link generateInitialMapV7}; with {@link villageCountV7} and
 * `VILLAGE_DENSITY_CURIOSITIES` it reproduces the `pulp-wars-poc-7r41` map
 * (map revision V3). The rules before the capital domains exist for two to
 * four seats on the widths they accepted (14 and up for three seats, 16 and
 * up for four): any other setup under them is `INVALID_SETUP`.
 */
export function generateInitialMapWithVillageCountV7(
  input: unknown,
  villages: number,
  rules: MapGenerationRulesV7 = "NATURAL_WATER_CURIOSITIES",
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
    !MAP_GENERATION_RULES_V7.includes(rules) ||
    (!domainRulesV7(rules) && !legacySeatSetupV7(setup))
  )
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  return generateMapWithVillageCountV7(setup, villages, rules);
}

/**
 * The neutral villages a parity call passes for `rules`
 * ({@link generateInitialMapWithVillageCountV7}): the density of the
 * natural-water rules ({@link villageCountV7}), or under the rules before
 * them the density of their 56% Continents ({@link priorVillageCountV7};
 * the same count on every other map type). The rules before the village
 * density take a count of their own ({@link revision14VillageCountV7}).
 */
export function villageCountForRulesV7(
  setup: MatchSetupV7,
  rules: MapGenerationRulesV7,
): number {
  return naturalWaterRulesV7(rules)
    ? villageCountV7(setup)
    : priorVillageCountV7(setup);
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
      const board = riftRulesV7(rules)
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
        curiosityRulesV7(rules) && setup.curiosities
          ? placeCuriositiesV7(setup.seed, {
              board,
              mapType: setup.mapType,
              capitals: candidate.capitals,
              villages: candidate.villages,
              treasureChests: treasure.treasureChests,
              factions: setup.factions,
            })
          : { curiosities: [], neutrals: [] };
      const curiosities = placement.curiosities;
      const neutrals = placement.neutrals;
      return {
        ok: true,
        map: deepFreeze({
          board,
          capitals: candidate.capitals,
          villages: candidate.villages,
          capitalAssignments: candidate.capitalAssignments,
          turnOrderSeats: candidate.turnOrderSeats,
          treasureChests: treasure.treasureChests,
          wildCentres: candidate.wildCentres,
          curiosities,
          neutrals,
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
  const density = densityRulesV7(rules);
  const domainRules = domainRulesV7(rules);
  const seats = setup.aiCount + 1;
  // Map scale section 4.2: the capital domains of this candidate, drawn
  // from the match stream after the topology draws and before the land
  // mask (an Archipelago of five or more seats centres its islands on
  // them). Null under the rules before them and where the landmasses take
  // their place ({@link capitalDomainMapV7}).
  let domains: readonly CapitalDomainV7[] | null = null;
  if (domainRules && capitalDomainMapV7(setup.mapType, seats)) {
    const drawn = drawCapitalDomainsV7(setup.width, seats, random);
    random = drawn.random;
    domains = drawn.domains;
  }
  const navalLand =
    setup.mapType === "DRY_LAND"
      ? null
      : topologyMaskV7(setup, topologyDraws, rules, domains);
  // Map scale section 5.3: on a water map the village-density generator
  // places every settlement on the land mask (in `applyNavalTopologyV7`), so
  // it draws no lattice here.
  const capitals: CoordV7[] = [];
  const villages: CoordV7[] = [];
  const wildCentres: CoordV7[] = [];
  let capitalPlacementFailed = false;
  // Map scale sections 5.3 and 5.4 on Dry Land: the wild reserve, then the
  // villages packed lattice-first, both from the match stream.
  const settleDryLand = (
    standing: readonly CoordV7[],
    stream: RandomStateV7,
  ): {
    readonly wildCentres: readonly CoordV7[];
    readonly villages: readonly CoordV7[];
    readonly random: RandomStateV7;
  } => {
    const wild = reserveWildCentresV7(
      setup.width,
      setup.height,
      standing,
      () => true,
      stream,
    );
    const partial = partialVillagesV7(rules, setup);
    let chosen: {
      readonly wildCentres: readonly CoordV7[];
      readonly villages: readonly CoordV7[];
      readonly random: RandomStateV7;
    } | null = null;
    // Section 5.6: where fewer villages may stand, the wild reserve gives
    // way first: its last centres are dropped one at a time while villages
    // are missing, and the reserve with the most villages stands (the
    // largest on a tie). Elsewhere the whole reserve always stands.
    for (let kept = wild.centres.length; kept >= 0; kept -= 1) {
      const centres = wild.centres.slice(0, kept);
      const packed = packVillagesV7(
        villageCandidatesV7(
          setup.width,
          setup.height,
          standing,
          centres,
          () => true,
        ),
        standing,
        villageTotal,
        // Section 4.4 item 4: under the capital domains every village keeps
        // the villages balanced between the capitals.
        domainRules
          ? (at, placed) => villageKeepsBalanceV7(() => 0, standing, placed, at)
          : () => true,
        partial,
        wild.random,
      );
      if (chosen === null || packed.villages.length > chosen.villages.length)
        chosen = { wildCentres: centres, ...packed };
      if (!partial || packed.villages.length >= villageTotal) break;
    }
    if (chosen === null) throw new RangeError("Missing village packing");
    return chosen;
  };
  if (!density || setup.mapType === "DRY_LAND") {
    const axis: number[] = [];
    if (domainRules) {
      // Map scale section 4.2: one capital per domain, a uniformly drawn
      // legal tile each, with backtracking over the domains in slot order.
      if (domains === null) throw new RangeError("Missing capital domains");
      const coords = allCoords(setup.width, setup.height);
      const legal = coords.filter((at) =>
        capitalTileLegalV7(setup.width, setup.height, seats, at),
      );
      const drawn = drawCapitalsV7(
        domains.map((domain) =>
          legal.filter((at) => inCapitalDomainV7(domain, at)),
        ),
        capitalSpacingV7(setup.width, seats),
        () => true,
        (found, stream) => {
          // Section 4.4 item 3: the search keeps only a room-balanced set.
          if (!roomBalancedV7(capitalSharesV7(() => 0, found, coords)))
            return null;
          const settled = settleDryLand(found, stream);
          return {
            missing: villageTotal - settled.villages.length,
            settled,
          };
        },
        random,
      );
      random = drawn.random;
      if (drawn.found === null) capitalPlacementFailed = true;
      else {
        capitals.push(...drawn.found.capitals);
        wildCentres.push(...drawn.found.settled.wildCentres);
        villages.push(...drawn.found.settled.villages);
        random = drawn.found.settled.random;
      }
    } else {
      let offset = 0;
      if (setup.width === 16) {
        const draw = nextBounded(random, 3);
        offset = draw.value;
        random = draw.random;
      }
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
      capitals.push(...corners.values.slice(0, setup.aiCount + 1));
    }
    if (domainRules) {
      // The capital search settled the wild reserve and the villages.
    } else if (density) {
      const settled = settleDryLand(capitals, random);
      wildCentres.push(...settled.wildCentres);
      villages.push(...settled.villages);
      random = settled.random;
    } else {
      const capitalKeys = new Set(capitals.map(key));
      const candidates = axis
        .flatMap((y) => axis.map((x) => ({ x, y })))
        .filter((at) => !capitalKeys.has(key(at)))
        .sort(compareCoords);
      const villageShuffle = shuffle(candidates, random);
      random = villageShuffle.random;
      villages.push(...villageShuffle.values.slice(0, villageTotal));
    }
  }
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
        density ? { villageTotal, random } : null,
        domains,
      );
      board = naval.board;
      // The village-density generator drew its wild reserve and its village
      // packing from the match stream inside the placement.
      random = naval.random ?? random;
      capitals.splice(0, capitals.length, ...naval.capitals);
      villages.splice(0, villages.length, ...naval.villages);
      wildCentres.splice(0, wildCentres.length, ...naval.wildCentres);
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
  const rankOf = (at: CoordV7): number => rank.get(key(at)) ?? 0;
  // Map scale section 4.4 item 2 (amended 2026-10-05): on Dry Land under the
  // capital domains the PRNG-free mountain floor runs before the growth
  // floor and the levelling after it.
  const navalMap = setup.mapType !== "DRY_LAND";
  const levelled =
    domainRules && !navalPlacementFailed && !capitalPlacementFailed;
  if (levelled && !navalMap)
    board = applyCapitalMountainFloorV7(board, capitals, rankOf);
  if (!navalPlacementFailed && rules !== "REVISION_15")
    board = applyCapitalGrowthFloorV7(board, capitals, rankOf, navalMap);
  if (levelled)
    board = applyCapitalLevellingV7(board, capitals, rankOf, navalMap);
  return {
    board,
    capitals: [...capitals].sort(compareCoords),
    villages: [...villages].sort(compareCoords),
    wildCentres,
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
    capitalPlacementFailed,
  };
}

/**
 * Map scale section 4.2: one domain of the board's `k x k` grid, as its
 * first and last column and row.
 */
export interface CapitalDomainV7 {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
}

/**
 * The eight ring domains of the 3 x 3 grid as (column, row) bands, clockwise
 * from the top-left corner (map scale section 4.2).
 */
const DOMAIN_RING_V7: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [2, 1],
  [2, 2],
  [1, 2],
  [0, 2],
  [0, 1],
];

/**
 * Whether the capitals of a map type and seat count are drawn inside the
 * domain grid (map scale section 4.2): always on Dry Land, Pangea, and
 * Lakes. On Continents the landmasses take the domains' place (each holds
 * exactly its share of the capitals, section 4.3), and on an Archipelago the
 * islands do (one capital each): up to four seats keep the landmass centres
 * of the earlier generators and draw no domain, and from five seats the
 * landmasses and islands stand on the drawn ring slots.
 */
export function capitalDomainMapV7(mapType: MapTypeV7, seats: number): boolean {
  return (
    mapType === "DRY_LAND" ||
    mapType === "PANGEA" ||
    mapType === "LAKES" ||
    ((mapType === "ARCHIPELAGO" || mapType === "CONTINENTS") && seats >= 5)
  );
}

/**
 * Map scale section 4.2: the domains of the seats, in slot order.
 *
 * - Two to four seats (`k = 2`): the four corner domains (top-left,
 *   top-right, bottom-left, bottom-right) in a seeded shuffle; the first
 *   `seats` are used.
 * - Five to eight seats (`k = 3`): ring slots
 *   `(round(j * 8 / N) + r) mod 8` for `j = 0 .. N - 1`, clockwise from the
 *   top-left corner, with a seeded rotation `r` (one draw, 0-7) and a seeded
 *   mirror (one draw; when 1 the ring runs anticlockwise). The centre domain
 *   stays empty.
 * - Nine and more seats: the `k x k` domains in a seeded shuffle; the first
 *   `seats` are used (all nine for nine seats).
 */
export function drawCapitalDomainsV7(
  width: number,
  seats: number,
  initial: RandomStateV7,
): {
  readonly domains: readonly CapitalDomainV7[];
  readonly random: RandomStateV7;
} {
  const k = domainsPerSideV7(seats);
  const domainAt = (column: number, row: number): CapitalDomainV7 => {
    const x = domainBandV7(width, k, column);
    const y = domainBandV7(width, k, row);
    return { x0: x.from, x1: x.to, y0: y.from, y1: y.to };
  };
  if (k === 3 && seats <= 8) {
    const rotation = nextBounded(initial, 8);
    const mirror = nextBounded(rotation.random, 2);
    return {
      domains: Array.from({ length: seats }, (_, seat) => {
        const slot = (Math.round((seat * 8) / seats) + rotation.value) % 8;
        const [column, row] = DOMAIN_RING_V7[
          mirror.value === 1 ? (8 - slot) % 8 : slot
        ] as readonly [number, number];
        return domainAt(column, row);
      }),
      random: mirror.random,
    };
  }
  const all: CapitalDomainV7[] = [];
  for (let row = 0; row < k; row += 1)
    for (let column = 0; column < k; column += 1)
      all.push(domainAt(column, row));
  const shuffled = shuffle(all, initial);
  return {
    domains: shuffled.values.slice(0, seats),
    random: shuffled.random,
  };
}

/** Whether `at` lies in `domain`. */
export function inCapitalDomainV7(
  domain: CapitalDomainV7,
  at: CoordV7,
): boolean {
  return (
    at.x >= domain.x0 &&
    at.x <= domain.x1 &&
    at.y >= domain.y0 &&
    at.y <= domain.y1
  );
}

/**
 * Map scale sections 4.1 and 4.2: whether a capital may stand on `at` as far
 * as the board's edge goes: 2 or more from it, and with at most 8 seats
 * outside the central zone (less than `floor(w / 3)` from it).
 */
export function capitalTileLegalV7(
  width: number,
  height: number,
  seats: number,
  at: CoordV7,
): boolean {
  const edge = Math.min(at.x, at.y, width - 1 - at.x, height - 1 - at.y);
  const zone = centralZoneEdgeDistanceV7(width, seats);
  return edge >= CAPITAL_EDGE_MARGIN_V7 && (zone === null || edge < zone);
}

/**
 * Under the capital domains a lake of a board 14 or more wide keeps this far
 * from the edge, which leaves a capital 2 from the edge its land.
 */
export const LAKE_EDGE_DISTANCE_V7 = 3;
/** The most placements one capital search tries before it gives up. */
const CAPITAL_SEARCH_BUDGET_V7 = 20000;
/** What testing one complete assignment costs of that budget. */
const CAPITAL_SEARCH_COMPLETE_COST_V7 = 50;
/** The most capital sets one search settles (wild reserve and villages). */
const CAPITAL_SEARCH_SETS_V7 = 12;

/**
 * Map scale section 4.2: one capital per slot, each a uniformly drawn legal
 * tile. Every slot's candidates (given in `(y, x)` order) are shuffled once
 * from the match stream, in slot order, whatever the search then does; the
 * search takes each slot's first shuffled candidate that is `spacing` or
 * more from every capital already placed and that `compatible` allows, and
 * backtracks over the slots in order when a later slot has none.
 *
 * Amended 2026-10-05 (section 5.5): a complete set is then settled by
 * `settle` from the stream after the shuffles (the wild reserve and the
 * villages, which draw the same stream whichever set is tried). `settle`
 * returns null for a set that cannot stand (room balance, a landmass
 * without a coast site) and otherwise how many villages are `missing`. The
 * first set with none missing wins; failing that, the set with the fewest
 * missing among the first {@link CAPITAL_SEARCH_SETS_V7} settled, the
 * earliest on a tie. Null when no set stands within the fixed budget of
 * placements; the stream state returned is the one after the shuffles
 * either way.
 */
function drawCapitalsV7<Settled>(
  slots: readonly (readonly CoordV7[])[],
  spacing: number,
  compatible: (placed: readonly CoordV7[], at: CoordV7) => boolean,
  settle: (
    capitals: readonly CoordV7[],
    random: RandomStateV7,
  ) => { readonly missing: number; readonly settled: Settled } | null,
  initial: RandomStateV7,
): {
  readonly found: {
    readonly capitals: readonly CoordV7[];
    readonly settled: Settled;
  } | null;
  readonly random: RandomStateV7;
} {
  let random = initial;
  const orders = slots.map((slot) => {
    const shuffled = shuffle(slot, random);
    random = shuffled.random;
    return shuffled.values;
  });
  // With many seats the spacing leaves each slot few tiles that any
  // assignment can use (eight ring capitals stand at almost fixed pitch), so
  // a candidate with no partner `spacing` away in some other slot is
  // dropped first, repeatedly, keeping the shuffled order.
  for (let changed = true; changed;) {
    changed = false;
    orders.forEach((order, slot) => {
      const kept = order.filter((at) =>
        orders.every(
          (other, otherSlot) =>
            otherSlot === slot ||
            other.some((partner) => chebyshev(at, partner) >= spacing),
        ),
      );
      if (kept.length !== order.length) {
        orders[slot] = kept;
        changed = true;
      }
    });
  }
  const after = random;
  const placed: CoordV7[] = [];
  let budget = CAPITAL_SEARCH_BUDGET_V7;
  let settledSets = 0;
  let best: {
    readonly capitals: readonly CoordV7[];
    readonly missing: number;
    readonly settled: Settled;
  } | null = null;
  // True once the search is over: a set with every village stands, or the
  // sets settled or the placements tried reached their fixed limits.
  const search = (slot: number): boolean => {
    if (slot === orders.length) {
      budget -= CAPITAL_SEARCH_COMPLETE_COST_V7;
      const result = settle(placed, after);
      if (result === null) return false;
      settledSets += 1;
      if (best === null || result.missing < best.missing)
        best = { capitals: [...placed], ...result };
      return result.missing <= 0 || settledSets >= CAPITAL_SEARCH_SETS_V7;
    }
    for (const at of orders[slot] as readonly CoordV7[]) {
      if (budget <= 0) return true;
      if (
        !placed.every((other) => chebyshev(at, other) >= spacing) ||
        !compatible(placed, at)
      )
        continue;
      budget -= 1;
      placed.push(at);
      if (search(slot + 1)) return true;
      placed.pop();
    }
    return false;
  };
  search(0);
  const found = best as {
    readonly capitals: readonly CoordV7[];
    readonly settled: Settled;
  } | null;
  return {
    found:
      found === null
        ? null
        : { capitals: found.capitals, settled: found.settled },
    random: after,
  };
}

/**
 * Map scale section 4.4 items 3 and 4: how many of `points` (land tiles)
 * count for each capital. A point counts for its nearest capital
 * (Chebyshev) on the same eight-connected landmass, split equally between
 * capitals at the same distance; a point on a landmass without a capital
 * counts for nobody.
 */
export function nearestCapitalSharesV7(
  board: BoardStateV7,
  capitals: readonly CoordV7[],
  points: readonly CoordV7[],
): readonly number[] {
  return capitalSharesV7(landmassOfV7(board), capitals, points);
}

/**
 * The landmass of each tile of a board: the index of its eight-connected
 * land component, undefined on water.
 */
function landmassOfV7(
  board: BoardStateV7,
): (at: CoordV7) => number | undefined {
  const landKeys = new Set(
    board.tiles
      .filter((tile) => tile.biome !== null)
      .map((tile) => key(tile.at)),
  );
  if (landKeys.size === board.tiles.length) return () => 0;
  const componentByKey = componentIndex(
    componentsOfMask(board.width, board.height, landKeys, true),
  );
  return (at) => componentByKey.get(key(at));
}

/** {@link nearestCapitalSharesV7} over a landmass function. */
function capitalSharesV7(
  landmassOf: (at: CoordV7) => number | undefined,
  capitals: readonly CoordV7[],
  points: readonly CoordV7[],
): number[] {
  const shares = capitals.map(() => 0);
  const capitalLandmasses = capitals.map(landmassOf);
  for (const at of points) {
    const landmass = landmassOf(at);
    if (landmass === undefined) continue;
    let nearest = Infinity;
    let winners: number[] = [];
    capitals.forEach((capital, index) => {
      if (capitalLandmasses[index] !== landmass) return;
      const distance = chebyshev(capital, at);
      if (distance < nearest) {
        nearest = distance;
        winners = [index];
      } else if (distance === nearest) winners.push(index);
    });
    for (const index of winners)
      shares[index] = (shares[index] ?? 0) + 1 / winners.length;
  }
  return shares;
}

/**
 * Map scale section 4.4 item 4 inside the village fill: whether one more
 * village on `at` keeps the villages balanced, given the villages `placed`
 * so far. The fill asks before every village, so a board whose fill
 * completes passes `VILLAGE_BALANCE` by construction.
 */
function villageKeepsBalanceV7(
  landmassOf: (at: CoordV7) => number | undefined,
  capitals: readonly CoordV7[],
  placed: readonly CoordV7[],
  at: CoordV7,
): boolean {
  return villageBalancedV7(
    capitalSharesV7(landmassOf, capitals, [...placed, at]),
  );
}

/** Map scale section 4.4 item 3: the land tiles that count for each capital. */
export function capitalRoomSharesV7(
  board: BoardStateV7,
  capitals: readonly CoordV7[],
): readonly number[] {
  return nearestCapitalSharesV7(
    board,
    capitals,
    board.tiles.filter((tile) => tile.biome !== null).map((tile) => tile.at),
  );
}

/**
 * Map scale section 4.4 item 3, room balance: the largest room share is at
 * most 1.5 times the smallest with up to 4 seats and 2.0 times with 5 or
 * more.
 */
export function roomBalancedV7(shares: readonly number[]): boolean {
  if (shares.length === 0) return false;
  const ratio = shares.length <= 4 ? 1.5 : 2;
  return Math.max(...shares) <= ratio * Math.min(...shares) + 1e-9;
}

/**
 * Map scale section 4.4 item 4, village balance: the largest village share
 * minus the smallest is at most `max(2, ceil(T / (2N)))`, `T` the villages
 * counted.
 */
export function villageBalancedV7(shares: readonly number[]): boolean {
  if (shares.length === 0) return false;
  const counted = shares.reduce((sum, share) => sum + share, 0);
  return (
    Math.max(...shares) - Math.min(...shares) <=
    Math.max(2, Math.ceil((counted - 1e-9) / (2 * shares.length))) + 1e-9
  );
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
 * two harvests (4 of the first turn's 5 Coins) reach level 2 on turn 1.
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

/** A capital's eight ring cells count at least this many that are not Mountain. */
export const CAPITAL_OPEN_NEIGHBOURS_V7 = 4;
/** The capital development score bounds and the most two capitals differ. */
export const CAPITAL_SCORE_MINIMUM_V7 = 6;
export const CAPITAL_SCORE_MAXIMUM_V7 = 17;
export const CAPITAL_SCORE_SPREAD_V7 = 5;

/**
 * Map scale section 4.4 item 2 (amended 2026-10-05), Dry Land under the
 * capital domains: the PRNG-free capital mountain floor. On Dry Land the
 * sites are fixed before the terrain is drawn, so with many capitals some
 * ring is almost always walled in. For each capital in `(y, x)` order with
 * fewer than four ring cells that are not Mountain, the Mountain ring cells
 * of lowest `rank` (those without Ore first) become empty Grass until four
 * are open. A capital that already has four is unchanged.
 */
export function applyCapitalMountainFloorV7(
  board: BoardStateV7,
  capitals: readonly CoordV7[],
  rank: (at: CoordV7) => number,
): BoardStateV7 {
  const tiles = [...board.tiles];
  const current = (): BoardStateV7 => ({ ...board, tiles });
  for (const capital of [...capitals].sort(compareCoords)) {
    const ring = neighbors8(board.width, board.height, capital);
    for (;;) {
      const cells = ring.map((at) => tileAt(current(), at) as TileStateV7);
      const mountains = cells.filter((tile) => tile.terrain === "MOUNTAIN");
      if (cells.length - mountains.length >= CAPITAL_OPEN_NEIGHBOURS_V7) break;
      const opened = [...mountains].sort(
        (a, b) =>
          Number(a.resource !== null) - Number(b.resource !== null) ||
          rank(a.at) - rank(b.at) ||
          compareCoords(a.at, b.at),
      )[0];
      if (opened === undefined) break;
      tiles[opened.at.y * board.width + opened.at.x] = {
        ...opened,
        terrain: "GRASS",
        resource: null,
      };
    }
  }
  return current();
}

/**
 * Map scale section 4.4 item 2 (amended 2026-10-05), under the capital
 * domains: the PRNG-free capital levelling, after the settlement ring
 * floors, the Dry Land mountain floor, the water resources, and the growth
 * floor. With many capitals at almost fixed places the generator can no
 * longer pick capitals whose rings happen to be even, so it evens them. A
 * board whose capitals already pass `CAPITAL_GROWTH` and `CAPITAL_SCORE` is
 * unchanged. Only land ring cells without a site change; Water never does.
 * `naval` is true on every map type but Dry Land (Fish then counts for
 * growth, and the ring's economy is judged by the water-map rule).
 *
 * 1. Growth. A capital that the growth floor left without two growth
 *    resources of a kind has too little empty Grass and Forest. In `rank`
 *    order its empty ring Grass gains Fruit, then its ring Fertile Ground
 *    becomes Fruit, then its ring Mountain becomes Grass with Fruit, until
 *    two Fruit stand.
 * 2. Score. The band `[L, L + 5]` inside 6-17 that needs the fewest
 *    points of change is chosen (ties: the fewest points removed, then the
 *    lowest `L`). A capital below it gains, on its ring cells of lowest
 *    `rank`: Fruit on empty Grass or Game on empty Forest (1 point each),
 *    then Ore on an empty Mountain (2). A capital above it loses: Game from
 *    a Forest, Fruit from Grass, or Fertile Ground turned into Fruit (1
 *    point each), then Ore from a Mountain or an empty Forest turned into
 *    Grass (2). No step may leave the ring without two growth resources of
 *    a kind, with fewer than three developable cells, or with fewer than
 *    two resource families, and no step touches a site.
 *
 * A capital that cannot reach the band is left as far as it got for
 * `CAPITAL_SCORE` to reject.
 */
export function applyCapitalLevellingV7(
  board: BoardStateV7,
  capitals: readonly CoordV7[],
  rank: (at: CoordV7) => number,
  naval: boolean,
): BoardStateV7 {
  const tiles = [...board.tiles];
  const current = (): BoardStateV7 => ({ ...board, tiles });
  const put = (tile: TileStateV7): void => {
    tiles[tile.at.y * board.width + tile.at.x] = tile;
  };
  const ordered = [...capitals].sort(compareCoords);
  const ringOf = (capital: CoordV7): TileStateV7[] =>
    neighbors8(board.width, board.height, capital)
      .map((at) => tileAt(current(), at) as TileStateV7)
      .filter((tile) => tile.biome !== null && tile.site === null)
      .sort((a, b) => rank(a.at) - rank(b.at) || compareCoords(a.at, b.at));
  const ringSound = (capital: CoordV7): boolean => {
    if (!capitalGrowthReadyV7(current(), capital, naval)) return false;
    if (naval) return capitalEconomyFair(current(), capital);
    const ring = neighbors8(board.width, board.height, capital).map(
      (at) => tileAt(current(), at) as TileStateV7,
    );
    const families = ring.map(familyOf).filter((family) => family !== null);
    return families.length >= 3 && new Set(families).size >= 2;
  };
  for (const capital of ordered)
    for (const fruitful of [
      (tile: TileStateV7): boolean =>
        tile.terrain === "GRASS" && tile.resource === null,
      (tile: TileStateV7): boolean =>
        tile.terrain === "GRASS" && tile.resource === "FERTILE_GROUND",
      (tile: TileStateV7): boolean => tile.terrain === "MOUNTAIN",
    ])
      for (const tile of ringOf(capital)) {
        if (capitalGrowthReadyV7(current(), capital, naval)) break;
        if (fruitful(tile))
          put({ ...tile, terrain: "GRASS", resource: "FRUIT" });
      }
  const scores = (): number[] =>
    ordered.map((capital) => capitalScore(current(), capital));
  const first = scores();
  let floor = CAPITAL_SCORE_MINIMUM_V7;
  let best: readonly [number, number] | null = null;
  for (
    let low = CAPITAL_SCORE_MINIMUM_V7;
    low <= CAPITAL_SCORE_MAXIMUM_V7 - CAPITAL_SCORE_SPREAD_V7;
    low += 1
  ) {
    const removed = first.reduce(
      (sum, score) =>
        sum + Math.max(0, score - (low + CAPITAL_SCORE_SPREAD_V7)),
      0,
    );
    const total = first.reduce(
      (sum, score) => sum + Math.max(0, low - score),
      removed,
    );
    if (
      best === null ||
      total < best[0] ||
      (total === best[0] && removed < best[1])
    ) {
      best = [total, removed];
      floor = low;
    }
  }
  if (best === null || best[0] === 0) return current();
  type Step = { readonly tile: TileStateV7; readonly gain: number };
  const gains = (tile: TileStateV7): Step[] =>
    tile.resource !== null
      ? []
      : tile.terrain === "GRASS"
        ? [{ tile: { ...tile, resource: "FRUIT" }, gain: 1 }]
        : tile.terrain === "FOREST"
          ? [{ tile: { ...tile, resource: "GAME" }, gain: 1 }]
          : tile.terrain === "MOUNTAIN"
            ? [{ tile: { ...tile, resource: "ORE" }, gain: 2 }]
            : [];
  const losses = (tile: TileStateV7): Step[] =>
    tile.terrain === "FOREST" && tile.resource === "GAME"
      ? [{ tile: { ...tile, resource: null }, gain: -1 }]
      : tile.terrain === "GRASS" && tile.resource === "FRUIT"
        ? [{ tile: { ...tile, resource: null }, gain: -1 }]
        : tile.terrain === "GRASS" && tile.resource === "FERTILE_GROUND"
          ? [{ tile: { ...tile, resource: "FRUIT" }, gain: -1 }]
          : tile.terrain === "MOUNTAIN" && tile.resource === "ORE"
            ? [{ tile: { ...tile, resource: null }, gain: -2 }]
            : tile.terrain === "FOREST" && tile.resource === null
              ? [{ tile: { ...tile, terrain: "GRASS" }, gain: -2 }]
              : [];
  for (const capital of ordered)
    for (let guard = 0; guard < 32; guard += 1) {
      const score = capitalScore(current(), capital);
      const need =
        score < floor
          ? floor - score
          : score > floor + CAPITAL_SCORE_SPREAD_V7
            ? floor + CAPITAL_SCORE_SPREAD_V7 - score
            : 0;
      if (need === 0) break;
      // The smallest steps first, in rank order; a step that would break
      // the ring's other guarantees is skipped.
      const steps = ringOf(capital)
        .flatMap((tile) => (need > 0 ? gains(tile) : losses(tile)))
        .sort((a, b) => Math.abs(a.gain) - Math.abs(b.gain));
      let moved = false;
      for (const step of steps) {
        const before = tileAt(current(), step.tile.at) as TileStateV7;
        put(step.tile);
        if (ringSound(capital)) {
          moved = true;
          break;
        }
        put(before);
      }
      if (!moved) break;
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
  // Map scale section 4.2: the capital search found no assignment.
  if (candidate.capitalPlacementFailed) return ["CAPITAL_SPACING"];
  const board = candidate.board;
  const density = densityRulesV7(rules);
  const failures: MapInvariantCodeV7[] = [];
  const capitals = board.tiles.filter((tile) => tile.site === "CAPITAL");
  const villages = board.tiles.filter((tile) => tile.site === "VILLAGE");
  const settlements = [...capitals, ...villages];
  // Map scale section 5.3: a village may stand 1 from the edge (2 before).
  const villageMargin = density
    ? VILLAGE_EDGE_MARGIN_V7
    : CAPITAL_EDGE_MARGIN_V7;
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
    (!density && villages.length !== villageTotal)
  )
    failures.push("SETTLEMENT_COUNT");
  // Map scale section 5.3: the packing could not place every village.
  if (
    density &&
    (partialVillagesV7(rules, setup)
      ? villages.length > villageTotal
      : villages.length !== villageTotal)
  )
    failures.push("VILLAGE_DENSITY");
  if (
    settlements.some((tile) => {
      const margin =
        tile.site === "CAPITAL" ? CAPITAL_EDGE_MARGIN_V7 : villageMargin;
      return (
        tile.terrain !== "GRASS" ||
        tile.resource !== null ||
        tile.improvement !== null ||
        tile.road ||
        tile.at.x < margin ||
        tile.at.y < margin ||
        tile.at.x >= board.width - margin ||
        tile.at.y >= board.height - margin
      );
    })
  )
    failures.push("SETTLEMENT_EMPTY_GRASS");
  if (
    pairTooClose(
      settlements.map((tile) => tile.at),
      3,
    )
  )
    failures.push("SETTLEMENT_SPACING");
  failures.push(
    ...capitalLayoutFailuresV7(
      board,
      candidate.capitals,
      candidate.villages,
      rules,
    ),
  );
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
 * The capital layout invariants shared by every generated map type.
 * `CAPITAL_SPACING`: every two capitals are `floor(w / 2)` or more apart
 * under the rules before the capital domains; under them (map scale
 * sections 4.1 and 4.2) `D(w, N)` or more apart, 2 or more from the edge,
 * and outside the central zone. `ROOM_BALANCE` and `VILLAGE_BALANCE`
 * (section 4.4 items 3 and 4) exist only under the capital domains.
 */
function capitalLayoutFailuresV7(
  board: BoardStateV7,
  capitals: readonly CoordV7[],
  villages: readonly CoordV7[],
  rules: MapGenerationRulesV7,
): MapInvariantCodeV7[] {
  if (!domainRulesV7(rules))
    return pairTooClose(capitals, Math.floor(board.width / 2))
      ? ["CAPITAL_SPACING"]
      : [];
  const failures: MapInvariantCodeV7[] = [];
  const seats = capitals.length;
  if (
    pairTooClose(capitals, capitalSpacingV7(board.width, seats)) ||
    capitals.some(
      (at) => !capitalTileLegalV7(board.width, board.height, seats, at),
    )
  )
    failures.push("CAPITAL_SPACING");
  if (!roomBalancedV7(capitalRoomSharesV7(board, capitals)))
    failures.push("ROOM_BALANCE");
  if (!villageBalancedV7(nearestCapitalSharesV7(board, capitals, villages)))
    failures.push("VILLAGE_BALANCE");
  return failures;
}

/**
 * Map scale section 5.4: whether a map type has a wild reserve. Continents
 * and Archipelago have none: a land curiosity is never legal on a
 * one-capital landmass, and their islands have no room to spare.
 */
export function wildReserveMapTypeV7(mapType: MapTypeV7): boolean {
  return mapType === "DRY_LAND" || mapType === "PANGEA" || mapType === "LAKES";
}

/**
 * Map scale section 5.4: how far every village keeps from a wild centre: 3
 * ({@link WILD_CENTRE_VILLAGE_DISTANCE_V7}) on widths 11 and 14, and 4 on
 * widths 16 and up (`pulp_wars-ykw.7`), the boards that may have a Giant
 * Spider, whose lair needs 4 from every village
 * (`MONSTER_VILLAGE_DISTANCE_V7`): the reserve then leaves room for a lair
 * on its centre as well as for a Fountain, a Shrine, or a Rift.
 */
export function wildCentreVillageDistanceV7(width: number): number {
  return width >= 16
    ? WILD_CENTRE_LAIR_DISTANCE_V7
    : WILD_CENTRE_VILLAGE_DISTANCE_V7;
}

/** Map scale section 5.4: the wild centres a board reserves at most. */
export function wildReserveCountV7(width: number): number {
  return width >= 25 ? 3 : width >= 20 ? 2 : 1;
}

/**
 * Map scale section 5.4: whether `at` may be a wild centre, given the
 * capitals and the centres already reserved: a land tile 2 or more from the
 * edge, 5 or more from every capital with at most 4 between its farthest
 * and nearest capital (the curiosity rule), and 6 or more from every other
 * wild centre.
 */
export function wildCentreLegalV7(
  width: number,
  height: number,
  capitals: readonly CoordV7[],
  reserved: readonly CoordV7[],
  isLand: (at: CoordV7) => boolean,
  at: CoordV7,
): boolean {
  if (
    at.x < WILD_CENTRE_EDGE_MARGIN_V7 ||
    at.y < WILD_CENTRE_EDGE_MARGIN_V7 ||
    at.x >= width - WILD_CENTRE_EDGE_MARGIN_V7 ||
    at.y >= height - WILD_CENTRE_EDGE_MARGIN_V7 ||
    !isLand(at) ||
    capitals.length === 0
  )
    return false;
  const distances = capitals.map((capital) => chebyshev(capital, at));
  const nearest = Math.min(...distances);
  return (
    nearest >= CURIOSITY_CAPITAL_DISTANCE_V7 &&
    Math.max(...distances) - nearest <= CURIOSITY_CAPITAL_SPREAD_V7 &&
    reserved.every((other) => chebyshev(other, at) >= WILD_CENTRE_SPACING_V7)
  );
}

/**
 * Map scale section 5.4, the wild reserve: after the capitals and before the
 * villages, up to {@link wildReserveCountV7} wild centres, each drawn
 * uniformly from the legal tiles in `(y, x)` order (one `nextBounded` draw
 * of the match stream per centre). With no legal tile the reserve stops, and
 * draws nothing more: a crowded board gets fewer or none, and the reserve
 * never rejects a board. It runs whether or not the setup has curiosities,
 * on Dry Land, Pangea, and Lakes only ({@link wildReserveMapTypeV7}).
 */
function reserveWildCentresV7(
  width: number,
  height: number,
  capitals: readonly CoordV7[],
  isLand: (at: CoordV7) => boolean,
  initial: RandomStateV7,
): { readonly centres: readonly CoordV7[]; readonly random: RandomStateV7 } {
  const centres: CoordV7[] = [];
  let random = initial;
  const coords = allCoords(width, height);
  for (let index = 0; index < wildReserveCountV7(width); index += 1) {
    const legal = coords.filter((at) =>
      wildCentreLegalV7(width, height, capitals, centres, isLand, at),
    );
    if (legal.length === 0) break;
    const draw = nextBounded(random, legal.length);
    random = draw.random;
    centres.push(legal[draw.value] as CoordV7);
  }
  return { centres, random };
}

/**
 * Map scale section 5.3: the village candidates in `(y, x)` order: eligible
 * tiles 1 or more from the edge, 3 or more from every settlement already
 * standing, and 3 or more from every wild centre.
 */
function villageCandidatesV7(
  width: number,
  height: number,
  settlements: readonly CoordV7[],
  wildCentres: readonly CoordV7[],
  eligible: (at: CoordV7) => boolean,
): readonly CoordV7[] {
  return allCoords(width, height).filter(
    (at) =>
      at.x >= VILLAGE_EDGE_MARGIN_V7 &&
      at.y >= VILLAGE_EDGE_MARGIN_V7 &&
      at.x < width - VILLAGE_EDGE_MARGIN_V7 &&
      at.y < height - VILLAGE_EDGE_MARGIN_V7 &&
      eligible(at) &&
      settlements.every(
        (other) => chebyshev(at, other) >= SETTLEMENT_SPACING_V7,
      ) &&
      wildCentres.every(
        (centre) => chebyshev(at, centre) >= wildCentreVillageDistanceV7(width),
      ),
  );
}

/**
 * Whether a board may hold fewer villages than its density asks for (map
 * scale section 5.6, amended 2026-10-05): under the capital domains, every
 * setup that did not exist before them (five or more seats, three seats on
 * 11 x 11, four seats on 11 x 11 or 14 x 14). There the capitals' spacing
 * can leave no room for all `S - N` villages, so the board keeps the most
 * the fill could place, and the wild reserve gives way first. The setups of
 * the earlier generators keep their exact count.
 */
export function partialVillagesV7(
  rules: MapGenerationRulesV7,
  setup: MatchSetupV7,
): boolean {
  return domainRulesV7(rules) && !legacySeatSetupV7(setup);
}

/**
 * Map scale section 5.3: adds each candidate of `order`, in order, that
 * keeps 3 from every settlement and that `accepts` allows (the per-landmass
 * rule), until `count` villages stand. A candidate that `accepts` refuses
 * may be allowed later (an Archipelago home island waits for the others),
 * so the order is walked again until a walk adds nothing. Returns the
 * villages in the order placed, fewer than `count` when there is no room.
 */
function fillVillagesV7(
  order: readonly CoordV7[],
  settlements: readonly CoordV7[],
  count: number,
  accepts: (at: CoordV7, placed: readonly CoordV7[]) => boolean,
): readonly CoordV7[] {
  const standing = [...settlements];
  const villages: CoordV7[] = [];
  const taken = new Set<string>();
  for (let added = true; added && villages.length < count;) {
    added = false;
    for (const at of order) {
      if (villages.length >= count) break;
      if (
        taken.has(key(at)) ||
        !standing.every(
          (other) => chebyshev(at, other) >= SETTLEMENT_SPACING_V7,
        ) ||
        !accepts(at, villages)
      )
        continue;
      taken.add(key(at));
      standing.push(at);
      villages.push(at);
      added = true;
    }
  }
  return villages;
}

/**
 * Map scale section 5.3, the fill of Continents and Archipelago (no draw):
 * {@link fillVillagesV7} over the candidates in `(y, x)` order (row-major,
 * the fill before the village density); when that leaves villages
 * unplaced, the same fill in `(x, y)` order, then in each order reversed,
 * and the first scan that places `count` villages wins. When none does, the
 * row-major villages are returned and `VILLAGE_DENSITY` rejects the
 * candidate.
 */
function scanFillVillagesV7(
  candidates: readonly CoordV7[],
  settlements: readonly CoordV7[],
  count: number,
  accepts: (at: CoordV7, placed: readonly CoordV7[]) => boolean,
  partial: boolean,
): readonly CoordV7[] {
  const rows = [...candidates].sort(compareCoords);
  const columns = [...candidates].sort((a, b) => a.x - b.x || a.y - b.y);
  let first: readonly CoordV7[] | null = null;
  let most: readonly CoordV7[] = [];
  for (const order of [
    rows,
    columns,
    [...rows].reverse(),
    [...columns].reverse(),
  ]) {
    const villages = fillVillagesV7(order, settlements, count, accepts);
    if (villages.length >= count) return villages;
    first ??= villages;
    if (villages.length > most.length) most = villages;
  }
  return partial ? most : (first ?? []);
}

/**
 * Map scale section 5.7, the fill of Continents and Archipelago under the
 * spread-villages rules (no draw). The land is first packed in full: every
 * candidate that keeps 3 from every settlement, taken in a scan order,
 * whatever the count and the per-landmass rule; that is the tight packing
 * of {@link scanFillVillagesV7} carried to the far side of the land. The
 * villages are then those sites taken in `byRank` order (the seeded tile
 * rank) by {@link fillVillagesV7} with the per-landmass rule, until `count`
 * stand. The sites already keep the spacing, so which of them stand
 * depends on the rank and the rule alone, never on a row or a column.
 *
 * The four scans are `(y, x)` order, `(x, y)` order, and each reversed. A
 * packing leans one tile toward the side its scan starts from, so the
 * first scan is chosen by the seed: scan `rank mod 4` of the first
 * candidate in `(y, x)` order. The others follow in turn while villages are
 * unplaced, and the first scan that places `count` villages wins. When
 * none does, the first scan's villages are returned (the most any scan
 * placed where fewer may stand) and `VILLAGE_DENSITY` rejects the
 * candidate.
 */
function spreadFillVillagesV7(
  candidates: readonly CoordV7[],
  settlements: readonly CoordV7[],
  count: number,
  accepts: (at: CoordV7, placed: readonly CoordV7[]) => boolean,
  partial: boolean,
  rankOf: (at: CoordV7) => number,
): readonly CoordV7[] {
  const rows = [...candidates].sort(compareCoords);
  const columns = [...candidates].sort((a, b) => a.x - b.x || a.y - b.y);
  const scans = [rows, columns, [...rows].reverse(), [...columns].reverse()];
  const corner = rows[0];
  const start = corner === undefined ? 0 : rankOf(corner) % scans.length;
  let first: readonly CoordV7[] | null = null;
  let most: readonly CoordV7[] = [];
  for (let turn = 0; turn < scans.length; turn += 1) {
    const sites = fillVillagesV7(
      scans[(start + turn) % scans.length] ?? [],
      settlements,
      Number.POSITIVE_INFINITY,
      () => true,
    );
    const villages = fillVillagesV7(
      [...sites].sort((a, b) => rankOf(a) - rankOf(b) || compareCoords(a, b)),
      settlements,
      count,
      accepts,
    );
    if (villages.length >= count) return villages;
    first ??= villages;
    if (villages.length > most.length) most = villages;
  }
  return partial ? most : (first ?? []);
}

/**
 * Map scale section 5.3, the lattice packing of Dry Land, Pangea, and Lakes.
 * Draws the lattice phase `px` then `py` (each 0-2, match stream) and
 * shuffles the candidates once (match stream). A phase's order is the
 * shuffled candidates on its pitch-3 lattice (`x mod 3 = px` and
 * `y mod 3 = py`) followed by the other shuffled candidates, filled by
 * {@link fillVillagesV7}. The nine phases are tried in turn from the drawn
 * one (`px` advancing first, then `py`), and the first that places `count`
 * villages wins; the three draws are made whatever `count` is. When no
 * phase places them all, the drawn phase's villages are returned and the
 * `VILLAGE_DENSITY` invariant rejects the candidate.
 */
function packVillagesV7(
  candidates: readonly CoordV7[],
  settlements: readonly CoordV7[],
  count: number,
  accepts: (at: CoordV7, placed: readonly CoordV7[]) => boolean,
  partial: boolean,
  initial: RandomStateV7,
): { readonly villages: readonly CoordV7[]; readonly random: RandomStateV7 } {
  const phaseX = nextBounded(initial, 3);
  const phaseY = nextBounded(phaseX.random, 3);
  const shuffled = shuffle(candidates, phaseY.random);
  let drawn: readonly CoordV7[] | null = null;
  let most: readonly CoordV7[] = [];
  for (let shift = 0; shift < 9; shift += 1) {
    const px = (phaseX.value + (shift % 3)) % 3;
    const py = (phaseY.value + Math.floor(shift / 3)) % 3;
    const onLattice = (at: CoordV7): boolean =>
      at.x % 3 === px && at.y % 3 === py;
    const villages = fillVillagesV7(
      [
        ...shuffled.values.filter(onLattice),
        ...shuffled.values.filter((at) => !onLattice(at)),
      ],
      settlements,
      count,
      accepts,
    );
    if (villages.length >= count) return { villages, random: shuffled.random };
    drawn ??= villages;
    if (villages.length > most.length) most = villages;
  }
  return { villages: partial ? most : (drawn ?? []), random: shuffled.random };
}

/**
 * Map scale section 5.3, Continents: the most settlements a major landmass
 * of `size` land cells may hold: its share of the board's settlements by
 * land (among the major landmasses), rounded up.
 */
export function landmassSettlementCapV7(
  settlements: number,
  size: number,
  majorLand: number,
): number {
  return majorLand <= 0 ? 0 : Math.ceil((settlements * size) / majorLand);
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
  // The village-density generator (map scale section 5.3): the villages to
  // place and the match stream its wild reserve and packing draw from. Null
  // under the rules before it, which draw nothing here.
  density: {
    readonly villageTotal: number;
    readonly random: RandomStateV7;
  } | null,
  // Map scale section 4.2: the capital domains of Pangea, Lakes, and an
  // Archipelago of five or more seats under the many-seats rules, else null.
  domains: readonly CapitalDomainV7[] | null,
): {
  board: BoardStateV7;
  capitals: CoordV7[];
  villages: CoordV7[];
  wildCentres: readonly CoordV7[];
  capitalAssignments: CoordV7[];
  random: RandomStateV7 | null;
} {
  const components = componentsOfMask(setup.width, setup.height, land, true);
  const capitalCount = setup.aiCount + 1;
  const settlementCount =
    density === null
      ? oldCapitals.length + oldVillages.length
      : capitalCount + density.villageTotal;
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
      ? capitalCount
      : setup.mapType === "CONTINENTS"
        ? Math.min(2, capitalCount)
        : 1;
  const componentByKey = new Map<string, number>();
  components.forEach((component, index) =>
    component.forEach((at) => componentByKey.set(key(at), index)),
  );
  const domainRules = domainRulesV7(rules);
  const majorMinimum = domainRules
    ? majorLandmassMinimumV7(setup.width, setup.mapType, capitalCount)
    : Math.max(6, Math.floor((setup.width * setup.height) / 20));
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
    if (capitals.length === capitalCount) {
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
  const settlementKeys = new Set(candidates.map(key));
  /**
   * The settlements of a capital set: the wild reserve, the coastal
   * settlement every inhabited landmass needs, and the villages, drawn from
   * `afterCapitals` (null under the rules before the village density, which
   * draw nothing). Throws when a landmass has no coast site or, before the
   * density, when the villages do not fit.
   */
  const settle = (
    capitals: readonly CoordV7[],
    afterCapitals: RandomStateV7 | null,
  ): {
    readonly settlements: readonly CoordV7[];
    readonly wildCentres: readonly CoordV7[];
    readonly random: RandomStateV7 | null;
  } => {
    // Map scale section 5.4: the wild reserve (Pangea and Lakes; Continents
    // and Archipelago have none), after the capitals and before every
    // village (the required coastal settlements included).
    const wild =
      density === null || afterCapitals === null
        ? null
        : wildReserveMapTypeV7(setup.mapType)
          ? reserveWildCentresV7(
              setup.width,
              setup.height,
              capitals,
              (at) => land.has(key(at)),
              afterCapitals,
            )
          : { centres: [], random: afterCapitals };
    const partial = partialVillagesV7(rules, setup);
    // Section 5.6: where fewer villages may stand, the wild reserve gives
    // way first, as on Dry Land: its last centres are dropped one at a time
    // while villages are missing or a landmass has no coast site, and the
    // reserve with the most settlements stands (the largest on a tie).
    let chosen: ReturnType<typeof settleWith> | null = null;
    let failure: unknown = null;
    for (let kept = wild?.centres.length ?? 0; kept >= 0; kept -= 1) {
      try {
        const result = settleWith(
          capitals,
          wild,
          (wild?.centres ?? []).slice(0, kept),
        );
        if (
          chosen === null ||
          result.settlements.length > chosen.settlements.length
        )
          chosen = result;
        if (!partial || result.settlements.length >= settlementCount) break;
      } catch (error) {
        failure ??= error;
        if (!partial) break;
      }
    }
    if (chosen === null)
      throw failure ?? new RangeError("Naval topology cannot settle");
    return chosen;
  };
  const settleWith = (
    capitals: readonly CoordV7[],
    wild: {
      readonly centres: readonly CoordV7[];
      readonly random: RandomStateV7;
    } | null,
    wildCentres: readonly CoordV7[],
  ): {
    readonly settlements: readonly CoordV7[];
    readonly wildCentres: readonly CoordV7[];
    readonly random: RandomStateV7 | null;
  } => {
    const settlements = [...capitals];
    const partial = partialVillagesV7(rules, setup);
    const spread = spreadRulesV7(rules);
    const rankOf = (at: CoordV7): number => rank.get(key(at)) ?? 0;
    const byRank = (a: CoordV7, b: CoordV7): number =>
      rankOf(a) - rankOf(b) || compareCoords(a, b);
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
            settlements.every((other) => chebyshev(candidate, other) >= 3) &&
            wildCentres.every(
              (centre) =>
                chebyshev(candidate, centre) >=
                wildCentreVillageDistanceV7(setup.width),
            ),
        )
        // Map scale section 5.7: the coast tile of lowest tile rank (the
        // first in `(y, x)` order under the rules before it, which put it
        // on the top row of the landmass).
        .sort(spread ? byRank : compareCoords)[0];
      if (coastal === undefined)
        throw new RangeError("Naval topology lacks coastal settlement");
      settlements.push(coastal);
    }
    let random: RandomStateV7 | null = null;
    if (density === null || wild === null) {
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
      return { settlements, wildCentres, random };
    }
    // Map scale section 5.3: the villages of the density on the land mask
    // with the per-landmass rule: lattice-first packing on Pangea and Lakes,
    // the fill in `(y, x)` order (no draw) on Continents and Archipelago.
    // Too few villages is not thrown: the candidate keeps what it placed and
    // `VILLAGE_DENSITY` rejects it.
    const homeComponents = new Set(
      capitals
        .map((capital) => componentByKey.get(key(capital)))
        .filter((value): value is number => value !== undefined),
    );
    const majorLand = [...majorComponentIds].reduce(
      (sum, id) => sum + (components[id]?.length ?? 0),
      0,
    );
    const coastal = settlements.slice(capitals.length);
    const villagesOn = (
      component: number,
      placed: readonly CoordV7[],
    ): number =>
      [...coastal, ...placed].filter(
        (at) => componentByKey.get(key(at)) === component,
      ).length;
    const accepts = (at: CoordV7, placed: readonly CoordV7[]): boolean => {
      const component = componentByKey.get(key(at));
      if (component === undefined) return false;
      if (setup.mapType === "ARCHIPELAGO") {
        // Each home island gets the same number of villages (within 1): a
        // home island takes a village only while no other home island has
        // fewer. Every other island, major or minor, takes the rest.
        if (!homeComponents.has(component)) return true;
        const own = villagesOn(component, placed);
        return [...homeComponents].every(
          (other) => villagesOn(other, placed) >= own,
        );
      }
      if (!requiredSettlementComponents.includes(component)) return false;
      if (setup.mapType !== "CONTINENTS") return true;
      // Each landmass holds at most its share of the settlements, rounded
      // up.
      const capitalsHere = capitals.filter(
        (capital) => componentByKey.get(key(capital)) === component,
      ).length;
      return (
        capitalsHere + villagesOn(component, placed) <
        landmassSettlementCapV7(
          settlementCount,
          components[component]?.length ?? 0,
          majorLand,
        )
      );
    };
    const villageCandidates = villageCandidatesV7(
      setup.width,
      setup.height,
      settlements,
      wildCentres,
      (at) => settlementKeys.has(key(at)),
    );
    const missing = settlementCount - settlements.length;
    // Section 4.4 item 4: under the capital domains every village also
    // keeps the villages balanced between the capitals.
    const balanced = domainRules
      ? (at: CoordV7, placed: readonly CoordV7[]): boolean =>
          accepts(at, placed) &&
          villageKeepsBalanceV7(
            (point) => componentByKey.get(key(point)),
            capitals,
            [...coastal, ...placed],
            at,
          )
      : accepts;
    if (wildReserveMapTypeV7(setup.mapType)) {
      const packed = packVillagesV7(
        villageCandidates,
        settlements,
        missing,
        balanced,
        partial,
        wild.random,
      );
      random = packed.random;
      settlements.push(...packed.villages);
    } else {
      random = wild.random;
      settlements.push(
        ...(spread
          ? spreadFillVillagesV7(
              villageCandidates,
              settlements,
              missing,
              balanced,
              partial,
              rankOf,
            )
          : scanFillVillagesV7(
              villageCandidates,
              settlements,
              missing,
              balanced,
              partial,
            )),
      );
    }
    return { settlements, wildCentres, random };
  };
  let settled: ReturnType<typeof settle>;
  if (domainRules) {
    // Map scale sections 4.2 and 4.3: one capital per slot, each a
    // uniformly drawn legal tile (2 or more from the edge, outside the
    // central zone, on a major landmass with four land neighbours),
    // `D(w, N)` or more apart. A slot is a domain on Pangea and Lakes, an
    // island (the `N` largest) on an Archipelago, and one of a landmass's
    // capitals on Continents (the largest landmass holds the most). The
    // projected score of the rules before the capital domains (4-17, at
    // most 5 apart) is not asked: the capital levelling evens the rings
    // afterwards (section 4.4 item 2 as amended).
    if (density === null) throw new RangeError("Missing match stream");
    const legal = candidates
      .filter(
        (at) =>
          majorComponentIds.has(componentByKey.get(key(at)) ?? -1) &&
          capitalTileLegalV7(setup.width, setup.height, capitalCount, at),
      )
      .sort(compareCoords);
    const onComponent = (component: number): readonly CoordV7[] =>
      majorComponentIds.has(component)
        ? legal.filter((at) => componentByKey.get(key(at)) === component)
        : [];
    const split = continentCapitalSplitV7(capitalCount);
    // Continents: every landmass holds exactly its share of the capitals.
    const landmassesFull = (found: readonly CoordV7[]): boolean => {
      if (setup.mapType !== "CONTINENTS") return true;
      const held = split.map(() => 0);
      for (const capital of found) {
        const component = componentByKey.get(key(capital));
        if (component === undefined || component >= held.length) return false;
        held[component] = (held[component] ?? 0) + 1;
      }
      return [...held]
        .sort((a, b) => b - a)
        .every((count, index) => count === split[index]);
    };
    let slots: readonly (readonly CoordV7[])[];
    if (setup.mapType === "CONTINENTS" && domains === null)
      slots = split.flatMap((held, index) =>
        Array.from({ length: held }, () => onComponent(index)),
      );
    else if (setup.mapType === "ARCHIPELAGO")
      slots = Array.from({ length: capitalCount }, (_, index) =>
        onComponent(index),
      );
    else {
      if (domains === null) throw new RangeError("Missing capital domains");
      slots = domains.map((domain) =>
        legal.filter((at) => inCapitalDomainV7(domain, at)),
      );
    }
    const landCoords = allCoords(setup.width, setup.height).filter((at) =>
      land.has(key(at)),
    );
    const drawn = drawCapitalsV7(
      slots,
      capitalSpacingV7(setup.width, capitalCount),
      () => true,
      (found, stream) => {
        // Section 4.4 item 3: the search keeps only a room-balanced set.
        if (
          !landmassesFull(found) ||
          !roomBalancedV7(
            capitalSharesV7(
              (at) => componentByKey.get(key(at)),
              found,
              landCoords,
            ),
          )
        )
          return null;
        try {
          const result = settle(found, stream);
          return {
            missing: settlementCount - result.settlements.length,
            settled: result,
          };
        } catch {
          return null;
        }
      },
      density.random,
    );
    if (drawn.found === null)
      throw new RangeError("Naval topology cannot place capitals");
    capitals.push(...drawn.found.capitals);
    settled = drawn.found.settled;
  } else {
    if (!findCapitals(0))
      throw new RangeError("Naval topology cannot place capitals");
    settled = settle(capitals, density?.random ?? null);
  }
  const { settlements, wildCentres, random } = settled;
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
  return {
    board,
    capitals: sortedCapitals,
    villages,
    wildCentres,
    capitalAssignments,
    random,
  };
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
  domains: readonly CapitalDomainV7[] | null,
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
    const domainRules = domainRulesV7(rules);
    const seats = setup.aiCount + 1;
    // Map scale section 4.3: Continents has two landmasses for 2 seats,
    // three for 3 to 5, and four from 6 (two or three before the capital
    // domains); an Archipelago has one island per seat.
    const split = continentCapitalSplitV7(seats);
    const count =
      mapType === "ARCHIPELAGO"
        ? seats
        : domainRules
          ? split.length
          : setup.aiCount === 1
            ? 2
            : 3;
    // Map scale section 5.8: under the natural-water rules the Continents
    // landmasses grow from inset spines, round and noise-shaped, on 46% of
    // the board, with islets in the open sea afterwards.
    const natural = naturalWaterRulesV7(rules) && mapType === "CONTINENTS";
    const wanted = landmassLandCountV7(width, height, mapType, !natural);
    // From five seats (section 5.6, amended 2026-10-05) the land follows
    // the seats' ring domains: each domain has a centre, 2 or more from the
    // edge so that a capital's square fits around it; an Archipelago grows
    // one island around each, and Continents grows each landmass around the
    // line through the centres of the adjacent domains whose capitals it
    // holds ({@link continentDomainGroupsV7}). A corner landmass cannot
    // hold two capitals `D(w, N)` apart on any board under 24 tiles wide.
    const ring = domainRules && seats >= 5;
    const domainCentres = (domains ?? []).map((domain) => ({
      x: Math.min(
        width - 3,
        Math.max(2, Math.floor((domain.x0 + domain.x1) / 2)),
      ),
      y: Math.min(
        height - 3,
        Math.max(2, Math.floor((domain.y0 + domain.y1) / 2)),
      ),
    }));
    if (ring && domainCentres.length !== seats)
      throw new RangeError("Missing capital domains");
    // Each landmass grows around its spine: one centre, or from five seats
    // on Continents the tiles on the lines joining its domain centres.
    const spines: readonly (readonly CoordV7[])[] = ring
      ? mapType === "ARCHIPELAGO"
        ? domainCentres.map((centre) => [centre])
        : (naturalWaterRulesV7(rules) && seats === 9
            ? nineSeatContinentGroupsV7(width, domains ?? [])
            : continentDomainGroupsV7(seats)
          ).map((group) =>
            spineV7(group.map((slot) => domainCentres[slot] as CoordV7)),
          )
      : count === 2
        ? [
            [{ x: 1, y: Math.floor(height / 2) }],
            [{ x: width - 2, y: Math.floor(height / 2) }],
          ]
        : count === 3
          ? [
              [{ x: 1, y: 1 }],
              [{ x: width - 2, y: 1 }],
              [{ x: Math.floor(width / 2), y: height - 2 }],
            ]
          : [
              [{ x: 1, y: 1 }],
              [{ x: width - 2, y: 1 }],
              [{ x: 1, y: height - 2 }],
              [{ x: width - 2, y: height - 2 }],
            ];
    if (spines.length !== count) throw new RangeError("Missing island centres");
    const naturalSpines =
      natural && !ring
        ? naturalContinentSpinesV7(width, height, count)
        : spines;
    const reach = (at: CoordV7, spine: readonly CoordV7[]): number =>
      Math.min(...spine.map((point) => chebyshev(at, point)));
    // The land weights of the Continents landmasses are the capitals they
    // hold: up to four seats the bottom band of three takes the most
    // (1, 1, 2 for 4 seats as before the capital domains, 1, 1, 1 for 3),
    // and from five seats the groups come largest first.
    const weights =
      mapType !== "CONTINENTS"
        ? spines.map(() => 1)
        : !domainRules
          ? count === 3
            ? [1, 1, 2]
            : [1, 1]
          : !ring && count === 3
            ? [split[1] ?? 1, split[2] ?? 1, split[0] ?? 1]
            : [...split];
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    // From five seats the remainder of the land is spread one tile each
    // over the heaviest landmasses first; up to four seats the last
    // landmass takes it, as before the capital domains.
    const spread = domainRules && seats >= 5;
    const shares = weights.map((weight) =>
      Math.floor((wanted * weight) / totalWeight),
    );
    if (spread) {
      const order = weights
        .map((weight, index) => ({ weight, index }))
        .sort((a, b) => b.weight - a.weight || a.index - b.index);
      const left = wanted - shares.reduce((sum, value) => sum + value, 0);
      for (let extra = 0; extra < left; extra += 1) {
        const target = order[extra % order.length]?.index ?? 0;
        shares[target] = (shares[target] ?? 0) + 1;
      }
    }
    let allocated = 0;
    // Each landmass's cells, nearest its spine first.
    const grown: CoordV7[][] = [];
    if (natural) {
      const noise = smoothNoiseV7(width, height, draws);
      // Land a landmass has no room for (its side of the sea margin is
      // full) goes to the next, and what the last cannot take to the first
      // with room, so the land count stays exact.
      const amounts = naturalSpines.map((_, index) => {
        const amount =
          !spread && index === naturalSpines.length - 1
            ? wanted - allocated
            : (shares[index] ?? 0);
        allocated += amount;
        return amount;
      });
      const margin = ring
        ? null
        : continentSeaMarginV7(width, height, naturalSpines, amounts);
      let owed = 0;
      naturalSpines.forEach((_, index) => {
        const amount = (amounts[index] ?? 0) + owed;
        const cells = growNaturalLandmassV7(
          width,
          height,
          naturalSpines,
          index,
          amount,
          land,
          noise,
          margin,
        );
        owed = amount - cells.length;
        for (const at of cells) add(at.x, at.y);
        grown.push(cells);
      });
      for (let index = 0; owed > 0 && index < grown.length; index += 1) {
        const cells = grown[index] as CoordV7[];
        const more = growNaturalLandmassV7(
          width,
          height,
          naturalSpines,
          index,
          owed,
          land,
          noise,
          margin,
          cells,
        );
        owed -= more.length;
        for (const at of more) {
          add(at.x, at.y);
          cells.push(at);
        }
      }
    } else
      spines.forEach((spine, index) => {
        const amount =
          !spread && index === spines.length - 1
            ? wanted - allocated
            : (shares[index] ?? 0);
        allocated += amount;
        const center = spine[0] as CoordV7;
        const distance = (at: CoordV7): number =>
          !ring && mapType === "CONTINENTS" && count === 3 && index === 2
            ? Math.abs(at.y - center.y)
            : reach(at, spine);
        const cells: CoordV7[] = [];
        grown.push(cells);
        for (const at of allCoords(width, height)
          .filter(
            (candidate) =>
              !spines.some(
                (other, otherIndex) =>
                  otherIndex !== index &&
                  reach(candidate, other) <= reach(candidate, spine) + 1,
              ),
          )
          .sort(
            (a, b) =>
              distance(a) +
                ((draws.get(key(a)) ?? 0) >>> 28) / 4 -
                (distance(b) + ((draws.get(key(b)) ?? 0) >>> 28) / 4) ||
              compareCoords(a, b),
          )
          .slice(0, amount)) {
          add(at.x, at.y);
          cells.push(at);
        }
      });
    // Section 5.6 (amended 2026-10-05): under the capital domains a pond (a
    // Water cell with no Water neighbour, which `NAVAL_TOPOLOGY` refuses)
    // is filled, and the landmass it lies in gives up its outermost cell
    // instead, so the land count stays exact. Ponds are taken in `(y, x)`
    // order; the landmass is that of the pond's first land neighbour.
    if (domainRules) {
      const landmassOf = new Map<string, number>();
      grown.forEach((cells, index) =>
        cells.forEach((at) => landmassOf.set(key(at), index)),
      );
      for (let guard = 0; guard < width * height; guard += 1) {
        const pond = allCoords(width, height).find(
          (at) =>
            !land.has(key(at)) &&
            neighbors8(width, height, at).every((near) => land.has(key(near))),
        );
        if (pond === undefined) break;
        const owner = neighbors8(width, height, pond)
          .map((near) => landmassOf.get(key(near)))
          .find((value) => value !== undefined);
        const cells = owner === undefined ? undefined : grown[owner];
        const given = cells?.pop();
        if (owner === undefined || cells === undefined || given === undefined)
          break;
        land.delete(key(given));
        landmassOf.delete(key(given));
        land.add(key(pond));
        landmassOf.set(key(pond), owner);
        cells.unshift(pond);
      }
    }
    // Map scale section 5.8: tiny islets in the open sea, on top of the
    // landmasses' land.
    if (natural) placeIsletsV7(width, height, land, draws);
  } else if (mapType === "LAKES") {
    for (const at of allCoords(width, height)) add(at.x, at.y);
    const wantedWater = lakeWaterCountV7(width, height);
    // Map scale section 5.8: under the natural-water rules the lakes of
    // every width are noise-shaped blobs of varied size and count.
    if (naturalWaterRulesV7(rules)) {
      naturalLakesV7(width, height, wantedWater, land, draws);
      return land;
    }
    if (width === 11) {
      const variant = ((draws.get("0,0") ?? 0) >>> 30) & 3;
      for (const at of allCoords(width, height))
        if (smallLakeCell(at, variant)) land.delete(key(at));
      return land;
    }
    // Section 5.6 (amended 2026-10-05): under the capital domains the two
    // lakes of a board 14 or more wide are long lakes down the west and the
    // east side, 3 or more from the edge: each grows around a north-south
    // line one tile inside that limit, long enough for a lake three tiles
    // wide. Every corner and ring domain then keeps land for its capital 2
    // from the edge, and the middle of the board stays land for the wild
    // reserve. (The lakes of the earlier generators stood a quarter of the
    // way in from two opposite corners, on the corner domains.)
    const sides = domainRulesV7(rules);
    const inset = sides ? LAKE_EDGE_DISTANCE_V7 : 1;
    const half = (index: number): number =>
      Math.floor(wantedWater / 2) + (index < wantedWater % 2 ? 1 : 0);
    const lakeSpine = (index: number): readonly CoordV7[] => {
      const length = Math.min(
        height - 2 * inset,
        Math.max(1, Math.ceil(half(index) / 3) - 2),
      );
      const top = Math.floor((height - length) / 2);
      const x = index === 0 ? inset + 1 : width - inset - 2;
      return Array.from({ length }, (_, step) => ({ x, y: top + step }));
    };
    const centers: readonly (readonly CoordV7[])[] = sides
      ? [lakeSpine(0), lakeSpine(1)]
      : [
          [{ x: Math.floor(width / 4), y: Math.floor(height / 4) }],
          [
            {
              x: Math.floor((3 * width) / 4),
              y: Math.floor((3 * height) / 4),
            },
          ],
        ];
    const lakeJitter = sides ? 16 : 8;
    const lakeReach = (at: CoordV7, spine: readonly CoordV7[]): number =>
      Math.min(...spine.map((point) => chebyshev(at, point)));
    centers.forEach((center, index) => {
      const amount = half(index);
      const cells = allCoords(width, height)
        .filter(
          (at) =>
            at.x >= inset &&
            at.y >= inset &&
            at.x < width - inset &&
            at.y < height - inset &&
            !centers.some(
              (other, otherIndex) =>
                otherIndex !== index &&
                lakeReach(at, other) <= lakeReach(at, center) + 1,
            ),
        )
        .sort(
          (a, b) =>
            lakeReach(a, center) +
              ((draws.get(key(a)) ?? 0) >>> 28) / lakeJitter -
              (lakeReach(b, center) +
                ((draws.get(key(b)) ?? 0) >>> 28) / lakeJitter) ||
            compareCoords(a, b),
        )
        .slice(0, amount);
      for (const at of cells) land.delete(key(at));
    });
  }
  return land;
}

/**
 * Map scale section 5.6 (amended 2026-10-05): how the ring domains of five
 * or more Continents seats form landmasses, as lists of seat slots, the
 * largest first ({@link continentCapitalSplitV7}). The slots are taken in
 * ring order from the start that makes the groups tightest (the least ring
 * distance inside the groups; the lowest start on a tie), so that a
 * landmass holds the capitals of adjacent domains: with five seats on ring
 * slots 0, 2, 3, 5, and 6 the groups are slots (2, 3), (5, 6), and (0).
 */
export function continentDomainGroupsV7(
  seats: number,
): readonly (readonly number[])[] {
  const split = continentCapitalSplitV7(seats);
  const position = (seat: number): number => Math.round((seat * 8) / seats);
  let best: { readonly span: number; readonly groups: number[][] } | null =
    null;
  for (let start = 0; start < seats; start += 1) {
    const groups: number[][] = [];
    let cursor = start;
    let span = 0;
    for (const held of split) {
      const group: number[] = [];
      for (let member = 0; member < held; member += 1) {
        const seat = cursor % seats;
        if (member > 0) {
          const previous = group[member - 1] as number;
          span += (position(seat) - position(previous) + 8) % 8;
        }
        group.push(seat);
        cursor += 1;
      }
      groups.push(group);
    }
    if (best === null || span < best.span) best = { span, groups };
  }
  return best?.groups ?? [];
}

/**
 * Map scale section 5.8: the landmasses of a nine-seat Continents board
 * under the natural-water rules, as lists of seat slots, the largest first.
 * Nine seats take every domain of the 3 x 3 grid in a shuffled order
 * (section 4.2), so the ring grouping of {@link continentDomainGroupsV7}
 * joined domains that were not neighbours and drew landmasses across each
 * other. Here the groups follow the grid: one landmass along a side (three
 * capitals) and three along the columns that meet it (two each), turned a
 * quarter as many times as the grid index of slot 0's domain modulo 4.
 */
export function nineSeatContinentGroupsV7(
  width: number,
  domains: readonly CapitalDomainV7[],
): readonly (readonly number[])[] {
  const band = (from: number): number =>
    [0, 1, 2].find((index) => domainBandV7(width, 3, index).from === from) ?? 0;
  const cells = domains.map((domain) => ({
    column: band(domain.x0),
    row: band(domain.y0),
  }));
  const first = cells[0] ?? { column: 0, row: 0 };
  const turns = (first.row * 3 + first.column) % 4;
  // Rotation 0: the top row, then the left, middle, and right columns below
  // it; each quarter turn maps (column, row) to (2 - row, column).
  const turned = (column: number, row: number): readonly [number, number] => {
    let at: readonly [number, number] = [column, row];
    for (let turn = 0; turn < turns; turn += 1) at = [2 - at[1], at[0]];
    return at;
  };
  const pattern: readonly (readonly (readonly [number, number])[])[] = [
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 1],
      [0, 2],
    ],
    [
      [1, 1],
      [1, 2],
    ],
    [
      [2, 1],
      [2, 2],
    ],
  ];
  return pattern.map((group) =>
    group.flatMap(([column, row]) => {
      const [x, y] = turned(column, row);
      const slot = cells.findIndex(
        (cell) => cell.column === x && cell.row === y,
      );
      return slot < 0 ? [] : [slot];
    }),
  );
}

/**
 * The tiles on the straight lines joining `points` in order, each point
 * included (one tile per step of the longer axis).
 */
function spineV7(points: readonly CoordV7[]): readonly CoordV7[] {
  const spine: CoordV7[] = [];
  points.forEach((point, index) => {
    const previous = points[index - 1];
    if (previous === undefined) {
      spine.push(point);
      return;
    }
    const steps = chebyshev(previous, point);
    for (let step = 1; step <= steps; step += 1)
      spine.push({
        x: previous.x + Math.round(((point.x - previous.x) * step) / steps),
        y: previous.y + Math.round(((point.y - previous.y) * step) / steps),
      });
  });
  return spine;
}

/**
 * Map scale section 5.8 (`pulp_wars-ykw.8`, `pulp-wars-poc-7r87`): the
 * natural-water shapes of Continents and Lakes. Every draw comes from the
 * topology draws the mask already has (one per tile), so the match stream
 * is consumed exactly as before; the bits are split so that each use reads
 * its own: bits 0-15 order the islets and the lake centres, bits 16-19 a
 * lake's size and stretch or an islet's size, and bits 20-31 the noise.
 */
/** The water a Continents channel keeps, in tiles, per tile of width. */
export const CONTINENT_SEA_MARGIN_PER_WIDTH_V7 = 1 / 7;
/** The least channel margin of a Continents board. */
export const CONTINENT_SEA_MARGIN_MINIMUM_V7 = 2.9;
/** How far the noise pushes a Continents coast, in tiles. */
const CONTINENT_NOISE_TILES_V7 = 4.5;
/** The same for the landmasses of five or more seats (ring domains). */
const CONTINENT_RING_NOISE_TILES_V7 = 3;
/** How much a tile's score drops for each neighbour already grown. */
const GROWTH_COHESION_V7 = 0.3;
/** How far the noise pushes a lake shore, in tiles. */
const LAKE_NOISE_TILES_V7 = 3.5;
/**
 * Map scale section 5.8: on a natural-water Continents or Lakes board of up
 * to four seats, every start has a village this close (Chebyshev) ...
 */
export const NEAREST_VILLAGE_MAXIMUM_V7 = 5;
/** ... and the starts' nearest villages differ by at most this much. */
export const NEAREST_VILLAGE_SPREAD_V7 = 2;
/** One islet for this many tiles of open water (rounded). */
export const ISLET_WATER_PER_ISLET_V7 = 60;
/** An islet keeps this far (Chebyshev) from any other land. */
export const ISLET_CLEARANCE_V7 = 3;
/** The most tiles of one islet. */
export const ISLET_MAXIMUM_TILES_V7 = 3;

/**
 * The spines of two to four Continents landmasses up to four seats under
 * the natural-water rules: inset by a quarter of the board so that the sea
 * runs around the landmasses as well as between them. Two landmasses stand
 * on north-south lines down the west and the east quarter; three put two on
 * the top quarter corners and one on an east-west line along the bottom
 * quarter (the landmass with the most capitals); four stand on the four
 * quarter corners.
 */
function naturalContinentSpinesV7(
  width: number,
  height: number,
  count: number,
): readonly (readonly CoordV7[])[] {
  const qx = Math.floor((width - 1) / 4);
  const qy = Math.floor((height - 1) / 4);
  const east = width - 1 - qx;
  const south = height - 1 - qy;
  if (count === 2)
    return [
      spineV7([
        { x: qx, y: qy },
        { x: qx, y: south },
      ]),
      spineV7([
        { x: east, y: qy },
        { x: east, y: south },
      ]),
    ];
  if (count === 3)
    return [
      [{ x: qx, y: qy }],
      [{ x: east, y: qy }],
      spineV7([
        { x: qx, y: south },
        { x: east, y: south },
      ]),
    ];
  return [
    [{ x: qx, y: qy }],
    [{ x: east, y: qy }],
    [{ x: qx, y: south }],
    [{ x: east, y: south }],
  ];
}

/**
 * Shore noise over the board from the topology draws: a coarse field (the
 * mean of bits 20-31 of the draws within 2, which bends a whole coast) plus
 * a fine one at a third of its weight (the mean of bits 4-15 within 1,
 * which roughens it), each replaced by its rank so that it is uniform in
 * `[0, 1)`. The sum is in `[0, 4/3)`.
 */
function smoothNoiseV7(
  width: number,
  height: number,
  draws: ReadonlyMap<string, number>,
): ReadonlyMap<string, number> {
  const coarse = rankedMeansV7(width, height, draws, 20, 2);
  const fine = rankedMeansV7(width, height, draws, 4, 1);
  return new Map(
    allCoords(width, height).map((at) => [
      key(at),
      (coarse.get(key(at)) ?? 0) + (fine.get(key(at)) ?? 0) / 3,
    ]),
  );
}

/**
 * The 12 bits of every topology draw from `shift`, averaged over the tiles
 * within `radius` and replaced by their rank in `[0, 1)` (ties by
 * `(y, x)`).
 */
function rankedMeansV7(
  width: number,
  height: number,
  draws: ReadonlyMap<string, number>,
  shift: number,
  radius: number,
): ReadonlyMap<string, number> {
  const raw = (at: CoordV7): number =>
    ((draws.get(key(at)) ?? 0) >>> shift) & 0xfff;
  const means = allCoords(width, height).map((at) => {
    const around = coordsInRadius(width, height, at, radius);
    return {
      at,
      value: around.reduce((sum, near) => sum + raw(near), 0) / around.length,
    };
  });
  means.sort((a, b) => a.value - b.value || compareCoords(a.at, b.at));
  return new Map(
    means.map((entry, index) => [key(entry.at), index / means.length]),
  );
}

/** The Euclidean distance from `at` to the nearest point of `spine`. */
function euclideanReachV7(at: CoordV7, spine: readonly CoordV7[]): number {
  return Math.min(
    ...spine.map((point) =>
      Math.sqrt((at.x - point.x) ** 2 + (at.y - point.y) ** 2),
    ),
  );
}

/** How many tiles `at` is from the nearest board edge (0 on the edge). */
function edgeDistanceV7(width: number, height: number, at: CoordV7): number {
  return Math.min(at.x, at.y, width - 1 - at.x, height - 1 - at.y);
}

/**
 * Grows a region one tile at a time: the tile of lowest `score` less
 * {@link GROWTH_COHESION_V7} for each of its four neighbours already in the
 * region (so the region fills its bays rather than sending out one-tile
 * arms), then lowest `(y, x)`, among the allowed `seeds` and the allowed
 * four-neighbours of the region so far, until `amount` new tiles or no
 * allowed tile is left. `start` is a region already grown (its tiles are
 * not returned again). Every prefix of the returned order, with `start`,
 * is connected when the seeds are.
 */
function growRegionV7(
  width: number,
  height: number,
  seeds: readonly CoordV7[],
  amount: number,
  allowed: (at: CoordV7) => boolean,
  score: (at: CoordV7) => number,
  start: readonly CoordV7[] = [],
): CoordV7[] {
  const grown: CoordV7[] = [];
  const taken = new Set<string>(start.map(key));
  const frontier = new Map<string, { at: CoordV7; score: number }>();
  const offer = (at: CoordV7): void => {
    if (!taken.has(key(at)) && !frontier.has(key(at)) && allowed(at))
      frontier.set(key(at), { at, score: score(at) });
  };
  for (const seed of seeds) offer(seed);
  for (const at of start)
    for (const near of neighbors4(width, height, at)) offer(near);
  const effective = (entry: { at: CoordV7; score: number }): number =>
    entry.score -
    GROWTH_COHESION_V7 *
      neighbors4(width, height, entry.at).filter((near) => taken.has(key(near)))
        .length;
  while (grown.length < amount && frontier.size > 0) {
    let best: { at: CoordV7; score: number } | null = null;
    let bestScore = 0;
    for (const entry of frontier.values()) {
      const value = effective(entry);
      if (
        best === null ||
        value < bestScore ||
        (value === bestScore && compareCoords(entry.at, best.at) < 0)
      ) {
        best = entry;
        bestScore = value;
      }
    }
    if (best === null) break;
    frontier.delete(key(best.at));
    taken.add(key(best.at));
    grown.push(best.at);
    for (const near of neighbors4(width, height, best.at)) offer(near);
  }
  return grown;
}

/**
 * The sea margin of a natural-water Continents board up to four seats: the
 * widest of `max(2.9, w / 7)` less 0.3 at a time, down to 2, at which the
 * side of every landmass (the tiles nearer its spine than any other by more
 * than the margin) holds 1.2 times its land. A margin of 2.9 or more keeps
 * at least two Water tiles between two landmasses everywhere; 2 keeps one.
 */
function continentSeaMarginV7(
  width: number,
  height: number,
  spines: readonly (readonly CoordV7[])[],
  amounts: readonly number[],
): number {
  const widest = Math.max(
    CONTINENT_SEA_MARGIN_MINIMUM_V7,
    width * CONTINENT_SEA_MARGIN_PER_WIDTH_V7,
  );
  const coords = allCoords(width, height);
  for (let step = 0; widest - 0.3 * step > 1.5; step += 1) {
    const margin = widest - 0.3 * step;
    const fits = spines.every((own, index) => {
      const side = coords.filter((at) => {
        const reach = euclideanReachV7(at, own);
        return spines.every(
          (other, otherIndex) =>
            otherIndex === index ||
            euclideanReachV7(at, other) > reach + margin,
        );
      }).length;
      return side >= 1.2 * (amounts[index] ?? 0);
    });
    if (fits) return margin;
  }
  return 1.5;
}

/**
 * One Continents landmass under the natural-water rules: grown from its
 * spine's first tile over tiles nearer its own spine than any other by more
 * than the sea margin ({@link continentSeaMarginV7}; null from five seats,
 * where the channel rule of the many-seats generator stands), nearest first
 * by Euclidean distance to the spine, pushed up to 6 tiles (4 from five
 * seats) by the shore noise and away from the board's edge (2 on the edge,
 * 0.75 next to it). `start` is land the landmass already holds.
 */
function growNaturalLandmassV7(
  width: number,
  height: number,
  spines: readonly (readonly CoordV7[])[],
  index: number,
  amount: number,
  land: ReadonlySet<string>,
  noise: ReadonlyMap<string, number>,
  margin: number | null,
  start: readonly CoordV7[] = [],
): CoordV7[] {
  const own = spines[index] ?? [];
  const ring = margin === null;
  const amplitude = ring
    ? CONTINENT_RING_NOISE_TILES_V7
    : CONTINENT_NOISE_TILES_V7;
  const chebyshevReach = (at: CoordV7, spine: readonly CoordV7[]): number =>
    Math.min(...spine.map((point) => chebyshev(at, point)));
  // One seed, the spine's first point: the spine's other tiles cost
  // nothing but their noise, so the landmass runs along it, and it stays one
  // landmass (seeding every spine tile could grow two pieces).
  return growRegionV7(
    width,
    height,
    start.length > 0 ? [] : own.slice(0, 1),
    amount,
    (at) => {
      if (land.has(key(at))) return false;
      // From five seats the channel rule of the many-seats generator
      // stands (a tile is the landmass's only when every other spine is
      // more than 1 further, Chebyshev): the ring domains leave no room for
      // a wider margin, and with nine seats two spines may cross.
      if (ring)
        return spines.every(
          (other, otherIndex) =>
            otherIndex === index ||
            chebyshevReach(at, other) > chebyshevReach(at, own) + 1,
        );
      const reach = euclideanReachV7(at, own);
      return spines.every(
        (other, otherIndex) =>
          otherIndex === index ||
          euclideanReachV7(at, other) > reach + (margin ?? 0),
      );
    },
    (at) => {
      const edge = edgeDistanceV7(width, height, at);
      return (
        euclideanReachV7(at, own) +
        amplitude * (noise.get(key(at)) ?? 0) +
        (edge === 0 ? 2 : edge === 1 ? 0.75 : 0)
      );
    },
    start,
  );
}

/**
 * The islets of a natural-water Continents board, `round(water / 60)` of
 * them: in the order of the tiles' draws (bits 0-15), a Water tile 1 or
 * more from the board's edge with no land within 2 (open sea) starts an
 * islet of 1 to 3 tiles (bits 16-19), each further tile a four-neighbour
 * that keeps the same clearance from every other land. When the open sea
 * runs out first, a second pass in the same order takes tiles with no land
 * within 1 and at most 3 land tiles within 2. An islet therefore always has Water all round it and at least
 * one Water tile between it and any other land: it never joins a landmass,
 * never closes a channel or encloses a pond, and holds no settlement (a
 * site needs four land neighbours). Adds the islets to `land` and returns
 * them.
 */
function placeIsletsV7(
  width: number,
  height: number,
  land: Set<string>,
  draws: ReadonlyMap<string, number>,
): readonly (readonly CoordV7[])[] {
  const water = width * height - land.size;
  const wanted = Math.round(water / ISLET_WATER_PER_ISLET_V7);
  const order = (at: CoordV7): number => (draws.get(key(at)) ?? 0) & 0xffff;
  const inside = (at: CoordV7): boolean =>
    edgeDistanceV7(width, height, at) >= 1;
  const islets: CoordV7[][] = [];
  const starts = allCoords(width, height)
    .filter(inside)
    .sort((a, b) => order(a) - order(b) || compareCoords(a, b));
  for (const clearance of [ISLET_CLEARANCE_V7, ISLET_CLEARANCE_V7 - 1]) {
    const clear = (at: CoordV7, own: ReadonlySet<string>): boolean =>
      coordsInRadius(width, height, at, clearance - 1).every(
        (near) => !land.has(key(near)) || own.has(key(near)),
      );
    // The second pass keeps to open water all the same: at most 3 land
    // tiles within 2, so an islet does not sit in a bay as a stray piece of
    // coast.
    const open = (at: CoordV7): boolean =>
      coordsInRadius(width, height, at, 2).filter((near) => land.has(key(near)))
        .length <= 3;
    for (const start of starts) {
      if (islets.length >= wanted) return islets;
      if (!clear(start, new Set()) || !open(start)) continue;
      const size =
        1 +
        ((((draws.get(key(start)) ?? 0) >>> 16) & 0xf) %
          ISLET_MAXIMUM_TILES_V7);
      const islet = [start];
      const own = new Set([key(start)]);
      while (islet.length < size) {
        const next = islet
          .flatMap((at) => neighbors4(width, height, at))
          .filter((at) => !own.has(key(at)) && inside(at) && clear(at, own))
          .sort((a, b) => order(a) - order(b) || compareCoords(a, b))[0];
        if (next === undefined) break;
        islet.push(next);
        own.add(key(next));
      }
      for (const at of islet) land.add(key(at));
      islets.push(islet);
    }
  }
  return islets;
}

/** The lake counts a natural-water Lakes board draws from, by width. */
export function naturalLakeCountRangeV7(
  width: number,
): readonly [number, number] {
  return width <= 11
    ? [2, 2]
    : width <= 16
      ? [2, 3]
      : width <= 20
        ? [3, 4]
        : [3, 5];
}

/**
 * The eight directions of a lake's second lobe; the first four are also
 * the axes a lake may stretch along.
 */
const LAKE_DIRECTIONS_V7: readonly CoordV7[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];

/**
 * The lakes of a natural-water Lakes board (map scale section 5.8): the
 * Water count of {@link lakeWaterCountV7} split over two to five lakes
 * ({@link naturalLakeCountRangeV7}, drawn from the corner tile's bits
 * 16-19), each a connected blob grown from its own centre. The lakes keep
 * 3 from the board's edge (2 on 11 x 11), so a capital 2 from the edge
 * keeps its land, and 1 tile of land between each other. Centres are taken
 * in the order of their draws (bits 0-15) as far apart as the box allows;
 * each lake gets a share of the Water by a weight of 2 to 5 (bits 16-17,
 * at least 4 tiles), stretches along one of four axes by 1.4 or 2 (bits
 * 18-19), and grows nearest first by that stretched distance plus up to 2
 * tiles of smooth noise. Water a lake has no room for goes to the next.
 * Removes the lakes from `land`.
 */
function naturalLakesV7(
  width: number,
  height: number,
  wantedWater: number,
  land: Set<string>,
  draws: ReadonlyMap<string, number>,
): void {
  const inset = width <= 11 ? 2 : LAKE_EDGE_DISTANCE_V7;
  const draw = (at: CoordV7): number => draws.get(key(at)) ?? 0;
  const [fewest, most] = naturalLakeCountRangeV7(width);
  const count =
    fewest + (((draw({ x: 0, y: 0 }) >>> 16) & 0xf) % (most - fewest + 1));
  const inBox = (at: CoordV7, margin: number): boolean =>
    at.x >= inset + margin &&
    at.y >= inset + margin &&
    at.x <= width - 1 - inset - margin &&
    at.y <= height - 1 - inset - margin;
  const order = allCoords(width, height)
    .filter((at) => inBox(at, 1))
    .sort(
      (a, b) => (draw(a) & 0xffff) - (draw(b) & 0xffff) || compareCoords(a, b),
    );
  let centres: CoordV7[] = [];
  for (
    let spacing = Math.max(4, Math.floor((width - 2 * inset) / 2));
    spacing >= 4;
    spacing -= 1
  ) {
    centres = [];
    for (const at of order)
      if (
        centres.length < count &&
        centres.every((other) => chebyshev(at, other) >= spacing)
      )
        centres.push(at);
    if (centres.length >= count) break;
  }
  const weights = centres.map((at) => 2 + ((draw(at) >>> 16) & 3));
  const total = weights.reduce((sum, value) => sum + value, 0);
  const sizes = weights.map((weight) =>
    Math.floor((wantedWater * weight) / total),
  );
  for (
    let left = wantedWater - sizes.reduce((sum, value) => sum + value, 0),
      index = 0;
    left > 0;
    left -= 1, index += 1
  )
    sizes[index % sizes.length] = (sizes[index % sizes.length] ?? 0) + 1;
  for (let index = 0; index < sizes.length; index += 1)
    while ((sizes[index] ?? 0) < 4) {
      const largest = sizes.indexOf(Math.max(...sizes));
      sizes[largest] = (sizes[largest] ?? 0) - 1;
      sizes[index] = (sizes[index] ?? 0) + 1;
    }
  const noise = smoothNoiseV7(width, height, draws);
  const lakes: CoordV7[][] = centres.map(() => []);
  const lakeOf = new Map<string, number>();
  const grow = (index: number, extra: number): number => {
    const centre = centres[index] as CoordV7;
    const bits = draw(centre) >>> 16;
    const shapeBits = draw({ x: centre.x + 1, y: centre.y }) >>> 16;
    const axis = LAKE_DIRECTIONS_V7[(bits >>> 2) & 3] as CoordV7;
    const length = Math.sqrt(axis.x * axis.x + axis.y * axis.y);
    const stretch = (shapeBits & 0x8) === 0 ? 1.25 : 1.6;
    const towards = LAKE_DIRECTIONS_V7[shapeBits & 7] as CoordV7;
    const reach = Math.max(2, Math.round(Math.sqrt(sizes[index] ?? 4) / 2));
    const lobe = {
      x: centre.x + towards.x * reach,
      y: centre.y + towards.y * reach,
    };
    const ellipse = (from: CoordV7, at: CoordV7): number => {
      const dx = at.x - from.x;
      const dy = at.y - from.y;
      const along = (dx * axis.x + dy * axis.y) / length;
      const across = (dy * axis.x - dx * axis.y) / length;
      return Math.sqrt((along / stretch) ** 2 + across ** 2);
    };
    const lake = lakes[index] as CoordV7[];
    const cells = growRegionV7(
      width,
      height,
      lake.length > 0 ? [] : [centre],
      extra,
      (at) =>
        inBox(at, 0) &&
        land.has(key(at)) &&
        centres.every(
          (other, otherIndex) =>
            otherIndex === index || chebyshev(at, other) >= 2,
        ) &&
        coordsInRadius(width, height, at, 1).every((near) => {
          const other = lakeOf.get(key(near));
          return other === undefined || other === index;
        }),
      (at) =>
        Math.min(ellipse(centre, at), ellipse(lobe, at) + 1) +
        LAKE_NOISE_TILES_V7 * (noise.get(key(at)) ?? 0),
      lake,
    );
    for (const at of cells) {
      lakeOf.set(key(at), index);
      land.delete(key(at));
      lake.push(at);
    }
    return cells.length;
  };
  let owed = 0;
  sizes.forEach((size, index) => {
    owed += size - grow(index, size + owed);
  });
  for (let index = 0; owed > 0 && index < centres.length; index += 1)
    owed -= grow(index, owed);
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
  const density = densityRulesV7(rules);
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
        ? // Map scale section 5.8: 46% landmasses plus islets.
          naturalWaterRulesV7(rules)
          ? [0.4, 0.56]
          : [0.5, 0.62]
        : setup.mapType === "ARCHIPELAGO"
          ? [0.34, 0.46]
          : [0.72, 0.84];
  // The coast-ring Pangea has exactly its land count (59.5-72% of the board),
  // and so has a natural-water Lakes board (map scale section 5.8).
  if (
    coastRing
      ? land.length !== pangeaLandCountV7(board.width, board.height)
      : setup.mapType === "LAKES" && naturalWaterRulesV7(rules)
        ? land.length !==
          board.tiles.length - lakeWaterCountV7(board.width, board.height)
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
  const villageSites = board.tiles.filter(
    (tile) => tile.site === "VILLAGE",
  ).length;
  if (
    board.tiles.filter((tile) => tile.site === "CAPITAL").length !==
      setup.aiCount + 1 ||
    (!density && villageSites !== villageTotal)
  )
    failures.push("SETTLEMENT_COUNT");
  // Map scale section 5.3: the packing could not place every village.
  if (
    density &&
    (partialVillagesV7(rules, setup)
      ? villageSites > villageTotal
      : villageSites !== villageTotal)
  )
    failures.push("VILLAGE_DENSITY");
  if (pairTooClose([...candidate.capitals, ...candidate.villages], 3))
    failures.push("SETTLEMENT_SPACING");
  failures.push(
    ...capitalLayoutFailuresV7(
      board,
      candidate.capitals,
      candidate.villages,
      rules,
    ),
  );
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
  const domainRules = domainRulesV7(rules);
  const seats = setup.aiCount + 1;
  // Map scale section 4.3: the least land of a major landmass scales down
  // with the islands of an Archipelago of many seats.
  const majorMinimum = domainRules
    ? majorLandmassMinimumV7(board.width, setup.mapType, seats)
    : Math.max(6, Math.floor(board.tiles.length / 20));
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
  // Map scale section 4.3: two landmasses for 2 seats, three for 3 to 5,
  // four from 6 (two or three before the capital domains), each holding
  // exactly its share of the capitals (capitals on at least two before).
  const continentSplit = continentCapitalSplitV7(seats);
  const expectedMajor =
    setup.mapType !== "CONTINENTS"
      ? undefined
      : domainRules
        ? continentSplit.length
        : setup.aiCount === 1
          ? 2
          : 3;
  const capitalsPerMajor = major
    .map((component) => {
      const keys = new Set(component.map(key));
      return capitalTiles.filter((tile) => keys.has(key(tile.at))).length;
    })
    .sort((left, right) => right - left);
  const continentCapitalsWrong = domainRules
    ? capitalsPerMajor.length !== continentSplit.length ||
      capitalsPerMajor.some((count, index) => count !== continentSplit[index])
    : new Set(capitalTiles.map((tile) => landComponentByKey.get(key(tile.at))))
        .size < 2;
  // Map scale section 5.3: a Continents landmass holds at most its share of
  // the settlements by land, rounded up (two thirds before); the home
  // islands of an Archipelago hold the same number of villages, within 1
  // (half the settlements per island before).
  const majorLand = major.reduce((sum, component) => sum + component.length, 0);
  const continentOverfull = (component: readonly CoordV7[]): boolean =>
    settlementsIn(component) >
    (density
      ? landmassSettlementCapV7(
          settlementTiles.length,
          component.length,
          majorLand,
        )
      : Math.ceil((2 * settlementTiles.length) / 3));
  const homeIslandVillages = [
    ...new Set(
      capitalTiles.map((tile) => landComponentByKey.get(key(tile.at))),
    ),
  ].map(
    (componentId) =>
      settlementTiles.filter(
        (tile) =>
          tile.site === "VILLAGE" &&
          landComponentByKey.get(key(tile.at)) === componentId,
      ).length,
  );
  const islandsUneven = density
    ? Math.max(...homeIslandVillages) - Math.min(...homeIslandVillages) > 1
    : major.some(
        (component) =>
          settlementsIn(component) > Math.ceil(settlementTiles.length / 2),
      );
  if (
    (setup.mapType === "PANGEA" &&
      (major.length !== 1 ||
        major[0] === undefined ||
        major[0].length < Math.ceil(land.length * 0.9) ||
        settlementsIn(major[0]) !== settlementTiles.length)) ||
    (setup.mapType === "CONTINENTS" &&
      (major.length !== expectedMajor ||
        major.some((component) => settlementsIn(component) === 0) ||
        major.some(continentOverfull) ||
        continentCapitalsWrong)) ||
    (setup.mapType === "ARCHIPELAGO" &&
      (major.length < setup.aiCount + 1 ||
        major.length > 2 * (setup.aiCount + 1) + 2 ||
        major.some((component) => settlementsIn(component) === 0) ||
        islandsUneven ||
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
  // Map scale section 5.8: on a natural-water Continents or Lakes board of
  // up to four seats with a village for every seat, every start has a
  // village within 5 and no start's nearest village is more than 2 further
  // than another's (the spread fill of 7r79 held this by itself; the
  // smaller, longer landmasses of 7r87 sometimes do not).
  if (
    naturalWaterRulesV7(rules) &&
    (setup.mapType === "CONTINENTS" || setup.mapType === "LAKES") &&
    seats <= 4 &&
    candidate.villages.length >= seats
  ) {
    const nearest = candidate.capitals.map((capital) =>
      Math.min(
        ...candidate.villages.map((village) => chebyshev(capital, village)),
      ),
    );
    if (
      Math.max(...nearest) > NEAREST_VILLAGE_MAXIMUM_V7 ||
      Math.max(...nearest) - Math.min(...nearest) > NEAREST_VILLAGE_SPREAD_V7
    )
      failures.push("VILLAGE_BALANCE");
  }
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
  rules: MapGenerationRulesV7 = "NATURAL_WATER_CURIOSITIES",
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
  // Map curiosities (section 3, `pulp_wars-737.3`; round 2, section 24.1):
  // the neutral units are created after every other initial entity, in
  // placement order, so they take the last initial entity IDs and shift no
  // other ID.
  const neutral = createNeutralUnitsV7(
    entities.nextEntityId,
    generated.map.neutrals,
  );
  const explored = players.map((player, seat) => ({
    ...player,
    explored: coordsInRadius(
      board.width,
      board.height,
      generated.map.capitalAssignments[seat] as CoordV7,
      2,
    ),
  }));
  const draft: Omit<GameStateV7, "scoreLedger"> = {
    schemaVersion: 7,
    rulesetId: RULESET_7_ID,
    setup,
    random: generated.map.random,
    humanPlayerId: explored[0]?.id ?? playerId(1),
    nextEntityId: neutral.nextEntityId,
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
      neutral.units.length === 0
        ? entities.units
        : [...entities.units, ...neutral.units],
    treasureChests: generated.map.treasureChests,
    curiosities: generated.map.curiosities,
    // The frozen sea (naval branch section 8.3): no ice at the start.
    ice: [],
    monsters: neutral.entries,
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
    frozen: [],
    burrowed: [],
    surfacedThisTurn: [],
    bombedThisTurn: [],
    beamedThisTurn: [],
    tractorUsedThisTurn: [],
    // The Candy revision: the four Candy lists start empty.
    sugarRush: [],
    crumbs: [],
    splattedThisTurn: [],
    tossedThisTurn: [],
    stuck: [],
    toothache: [],
    glazedThisTurn: [],
    huntedThisTurn: [],
    berserkThisTurn: [],
    // The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror and Feast.
    terrorThisTurn: [],
    feastedThisTurn: [],
    ninthUnit: emptyNinthUnitStateV7(),
    barricades: [],
    giants: emptyGiantsStateV7(),
    cult: initialCultStateV7(explored),
    pendingChoices: [],
    outcome: null,
  };
  // Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section
  // 3.3): the ledger starts at 0 with the starting score as the peak.
  const state = deepFreeze<GameStateV7>({
    ...draft,
    scoreLedger: initialScoreLedgerV7(draft),
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
  const draft: Omit<GameStateV7, "scoreLedger"> = {
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
    // The frozen sea (naval branch section 3.3): an Ice Folk seat's ice.
    ice: entities.ice,
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
    frozen: [],
    burrowed: [],
    surfacedThisTurn: [],
    bombedThisTurn: [],
    beamedThisTurn: [],
    tractorUsedThisTurn: [],
    // The Candy revision: the four Candy lists start empty.
    sugarRush: [],
    crumbs: [],
    splattedThisTurn: [],
    tossedThisTurn: [],
    stuck: [],
    toothache: [],
    glazedThisTurn: [],
    huntedThisTurn: [],
    berserkThisTurn: [],
    // The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror and Feast.
    terrorThisTurn: [],
    feastedThisTurn: [],
    ninthUnit: emptyNinthUnitStateV7(),
    barricades: [],
    giants: emptyGiantsStateV7(),
    cult: initialCultStateV7(entities.players),
    pendingChoices: [],
    outcome: null,
  };
  // Score and modes (section 3.3): the Showcase's starting score is its peak.
  const state = deepFreeze<GameStateV7>({
    ...draft,
    scoreLedger: initialScoreLedgerV7(draft),
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
      // AI head start (`pulp_wars-w49.39`): every AI seat starts with the
      // setup's extra Coins; seat 0 never does.
      coins:
        RULESET_7.startingCoins + (seat === 0 ? 0 : aiHeadStartCoinsV7(setup)),
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
    CANDY: 1,
    // The Cultists (section 4.3): one Initiate on the capital.
    CULT: 1,
  });

/**
 * Revision 17 section 8.9: the `FIGHTER` units of a level-3 Militia reward.
 * A Goblin Militia is two Goblins; every other faction's is one unit.
 * (Tuning 3 tried two Fighters for the Humans; tuning 4 took it back after
 * play: two units in one level overran the unit limit.)
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
    CANDY: 1,
    // The Cultists (docs/product/RULESET_7_CULTISTS.md section 4.3): two
    // Initiates, the Goblin precedent (4 Coins of units against the 4-Coin
    // Stockpile).
    CULT: 2,
  });

/**
 * Tuning 4 (`pulp_wars-w49.3`): the `RAIDER`-role units the Survey
 * reward also grants ("Scouts": the survey and a free Raider, with no
 * technology needed). Human only at first; the other factions' Survey is
 * the survey alone until their passes. The Goblin pass (`pulp_wars-w49.12`,
 * 7r50): a Goblin Survey grants a Wolf Rider. The Undead pass
 * (`pulp_wars-w49.13`, 7r51): an Undead Survey grants a Ghoul. The Martian
 * pass (`pulp_wars-w49.14`, 7r52): a Martian Survey grants a Saucer. Step
 * two of the Ice Folk pass (`pulp_wars-w49.27`, 7r59): an Ice Folk Survey
 * grants a Sled.
 */
export const SURVEY_RAIDERS_V7: Readonly<Record<FactionIdV7, 0 | 1>> =
  deepFreeze({
    ORIGINAL: 1,
    UNDEAD: 1,
    GOBLIN: 1,
    DINOSAUR: 1,
    MARTIAN: 1,
    ICE_FOLK: 1,
    // The reward ladder rework (`pulp_wars-zypi`): every faction's Scouts
    // (a level-3 reward since then) grants its `RAIDER`-role unit, so the
    // Dwarves a Gyrocopter and the Candy a Donut Racer.
    DWARF: 1,
    CANDY: 1,
    // The Cultists (section 4.3): the reveal and a Familiar.
    CULT: 1,
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
 * Map curiosities (section 8, `pulp_wars-737.3`; round 2, section 24.1):
 * the neutral units of a placement with IDs from `nextEntityId` in order:
 * owned by the neutral owner, the role and maximum HP of their breed, no
 * home city, full HP, no kills, never veteran or capture-eligible, a fresh
 * activation, and an empty `provokedBy`.
 */
function createNeutralUnitsV7(
  nextEntityId: number,
  placements: readonly NeutralPlacementV7[],
): {
  readonly units: readonly UnitStateV7[];
  readonly entries: readonly MonsterStateV7[];
  readonly nextEntityId: number;
} {
  let next = nextEntityId;
  const units: UnitStateV7[] = [];
  const entries: MonsterStateV7[] = [];
  for (const placement of placements) {
    const allocation = allocateUnitId(next);
    next = allocation.nextEntityId;
    const rule = NEUTRAL_ROLE_RULES_V7[placement.breed];
    units.push({
      id: allocation.id,
      ownerId: NEUTRAL_OWNER_ID_V7,
      homeCityId: null,
      role: rule.role,
      form: "LAND",
      at: placement.at,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: freshStartActivation(),
    });
    entries.push({
      unitId: allocation.id,
      breed: placement.breed,
      home: placement.home,
      provokedBy: [],
    });
  }
  return { units, entries, nextEntityId: next };
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

/**
 * Parity and fixture support only: the fixed neutral village count of
 * revision 14 through `pulp-wars-poc-7r39` (4/5/7 on widths 11-16 by AI
 * count, 14/13/12 on 20, 21/20/19 on 25, with 3 on 11 x 11 Archipelago and
 * 6 on 16 x 16 Archipelago with three AI). With it and the `CURIOSITIES`
 * rules (or an earlier rule) {@link generateInitialMapWithVillageCountV7}
 * reproduces a board from before the village density.
 */
export function revision14VillageCountV7(setup: MatchSetupV7): number {
  if (setup.mapType === "ARCHIPELAGO" && setup.width === 11)
    return SMALL_ARCHIPELAGO_VILLAGES_V7;
  if (
    setup.mapType === "ARCHIPELAGO" &&
    setup.width === 16 &&
    setup.aiCount === 3
  )
    return CROWDED_ARCHIPELAGO_VILLAGES_V7;
  return (
    (setup.width === 25
      ? HUGE[setup.aiCount]
      : setup.width === 20
        ? LARGE[setup.aiCount]
        : STANDARD[setup.aiCount]) ?? 0
  );
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

/**
 * The Cult redesign (docs/product/RULESET_7_CULT_REDESIGN.md section 6,
 * `pulp_wars-mch9.31`): the Cult state of a new match (or Showcase): every
 * Cult seat starts with its starting Favour (2), every other list empty.
 */
function initialCultStateV7(
  players: readonly Pick<PlayerStateV7, "id" | "faction">[],
): CultStateV7 {
  return {
    ...emptyCultStateV7(),
    favour: players.flatMap((player) => {
      const favour = startingFavourV7(player.faction);
      return favour > 0 ? [{ playerId: player.id, favour }] : [];
    }),
  };
}
