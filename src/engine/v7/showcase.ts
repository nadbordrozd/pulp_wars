import {
  allocateCityId,
  allocateUnitId,
  type CityId,
  type UnitId,
} from "../model/ids";
import {
  dockPopulationV7,
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
} from "../rules/ruleset-v7";
import {
  growthSpentV7,
  harbourPopulationForV7,
  roadPopulationForCityV7,
} from "./economy";
import { spatialContributionAtV7 } from "./spatial-economy";
import {
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  isNavalRoleV7,
  type AiCountV7,
  type BoardStateV7,
  type CityRewardRecordV7,
  type CityStateV7,
  type CoordV7,
  type IceTileV7,
  type ImprovementIdV7,
  type MatchSetupV7,
  type PlayerStateV7,
  type PopulationContributionV7,
  type ResourceIdV7,
  type TerrainIdV7,
  type TileStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";

/**
 * Revision 18 section 5: the fixed `SHOWCASE` setup. The board, cities,
 * population ledger, technologies, exploration, and units are a pure function
 * of the seat count and the seat factions; the seed is never drawn from.
 */
export const SHOWCASE_BOARD_SIZE_V7 = 16;
/** Rows `y = 0 … 11` are land; rows `12 … 15` are water. */
export const SHOWCASE_LAND_ROWS_V7 = 12;

export type ShowcaseCityKeyV7 = "CAPITAL" | "NORTH" | "COAST";

interface ShowcaseTileTemplateV7 {
  readonly dx: -1 | 0 | 1;
  readonly y: number;
  readonly terrain?: TerrainIdV7;
  readonly resource?: ResourceIdV7;
  readonly improvement?: ImprovementIdV7;
  readonly road?: true;
}

interface ShowcaseCityTemplateV7 {
  readonly key: ShowcaseCityKeyV7;
  readonly y: number;
  readonly level: number;
  readonly rewards: readonly CityRewardRecordV7[];
  readonly tiles: readonly ShowcaseTileTemplateV7[];
}

/** Section 5.3, in entity-ID order: the capital, then North, then Coast. */
export const SHOWCASE_CITY_TEMPLATES_V7: readonly ShowcaseCityTemplateV7[] =
  Object.freeze([
    {
      key: "CAPITAL",
      y: 7,
      level: 5,
      rewards: [
        { reachedLevel: 2, reward: "SURVEY" },
        { reachedLevel: 3, reward: "WALLS" },
        { reachedLevel: 4, reward: "BOOM" },
        { reachedLevel: 5, reward: "JUGGERNAUT" },
      ],
      tiles: [
        { dx: -1, y: 6, resource: "FERTILE_GROUND", improvement: "FARM" },
        { dx: 0, y: 6, road: true },
        { dx: 1, y: 6, resource: "FERTILE_GROUND", improvement: "FARM" },
        { dx: -1, y: 7, improvement: "WINDMILL" },
        { dx: 1, y: 7, improvement: "MARKET" },
        { dx: -1, y: 8, resource: "FERTILE_GROUND", improvement: "FARM" },
        { dx: 0, y: 8, road: true },
      ],
    },
    {
      key: "NORTH",
      y: 3,
      level: 4,
      rewards: [
        { reachedLevel: 2, reward: "SURVEY" },
        { reachedLevel: 3, reward: "WALLS" },
        { reachedLevel: 4, reward: "TREASURY_8" },
      ],
      tiles: [
        { dx: -1, y: 2, terrain: "FOREST", improvement: "LUMBER_CAMP" },
        {
          dx: 1,
          y: 2,
          terrain: "MOUNTAIN",
          resource: "ORE",
          improvement: "MINE",
        },
        { dx: -1, y: 3, improvement: "SAWMILL" },
        { dx: 1, y: 3, improvement: "FORGE" },
        { dx: -1, y: 4, terrain: "FOREST", improvement: "LUMBER_CAMP" },
        { dx: 0, y: 4, road: true },
        {
          dx: 1,
          y: 4,
          terrain: "MOUNTAIN",
          resource: "ORE",
          improvement: "MINE",
        },
      ],
    },
    {
      key: "COAST",
      y: 11,
      // The naval branch (`pulp_wars-5ti.2`,
      // docs/product/RULESET_7_NAVAL_BRANCH.md section 5.4): every
      // technology is researched, so Harbours adds 1 population to the Port
      // and to the Shipyard; under the ordinary ledger the Coast city is
      // then level 4 (it was 3), with the reward North took at that level.
      level: 4,
      rewards: [
        { reachedLevel: 2, reward: "SURVEY" },
        { reachedLevel: 3, reward: "WALLS" },
        { reachedLevel: 4, reward: "TREASURY_8" },
      ],
      tiles: [
        { dx: -1, y: 10, resource: "FERTILE_GROUND", improvement: "FARM" },
        { dx: 0, y: 10, road: true },
        { dx: 1, y: 10, terrain: "FOREST", resource: "GAME" },
        { dx: -1, y: 11, improvement: "WORKSHOP" },
        { dx: 1, y: 11, resource: "FRUIT" },
        { dx: -1, y: 12, improvement: "PORT" },
        { dx: 1, y: 12, improvement: "SHIPYARD" },
      ],
    },
  ]);

/** Neutral Road tiles that join the three centers of a strip. */
const NEUTRAL_ROAD_ROWS_V7 = [5, 9] as const;
/** The capital's one harvested Fruit tile (a permanent record), by `dx, y`. */
const CAPITAL_HARVEST_V7 = { dx: 1, y: 8 } as const;

/** Section 5.4: role, tile offset, and home city, in entity-ID order. */
export const SHOWCASE_UNIT_TEMPLATES_V7: readonly {
  readonly role: UnitRoleIdV7;
  readonly dx: -1 | 0 | 1;
  readonly y: number;
  readonly home: ShowcaseCityKeyV7;
}[] = Object.freeze([
  { role: "FIGHTER", dx: 0, y: 7, home: "CAPITAL" },
  { role: "RAIDER", dx: -1, y: 5, home: "NORTH" },
  { role: "MARKSMAN", dx: 0, y: 5, home: "NORTH" },
  { role: "GUARD", dx: 1, y: 5, home: "NORTH" },
  { role: "CAPTAIN", dx: -1, y: 9, home: "CAPITAL" },
  { role: "CATAPULT", dx: 0, y: 9, home: "CAPITAL" },
  { role: "KNIGHT", dx: 1, y: 9, home: "CAPITAL" },
  { role: "JUGGERNAUT", dx: 1, y: 8, home: "CAPITAL" },
  { role: "PATROL_BOAT", dx: 0, y: 12, home: "COAST" },
  { role: "BATTLESHIP", dx: 0, y: 13, home: "COAST" },
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 3.3):
  // one Submarine on the free Deep Water tile east of the Battleship.
  { role: "SUBMARINE", dx: 1, y: 13, home: "COAST" },
]);

/**
 * The center column of a seat's strip: seat 0 uses strip 0 and AI seat `i`
 * uses strip `3 - aiCount + i`, so the AI seats fill the strips farthest from
 * the human. Strip `k` has center column `4k + 2`.
 */
export function showcaseStripCenterXV7(
  seat: number,
  aiCount: AiCountV7,
): number {
  const strip = seat === 0 ? 0 : 3 - aiCount + seat;
  return 4 * strip + 2;
}

/** The capital centers by seat (also the generated-map `capitals`). */
export function showcaseCapitalsV7(setup: MatchSetupV7): readonly CoordV7[] {
  return Array.from({ length: setup.aiCount + 1 }, (_, seat) => ({
    x: showcaseStripCenterXV7(seat, setup.aiCount),
    y: 7,
  }));
}

/**
 * The Showcase board without territory: terrain, resources, improvements,
 * Roads, and settlement sites for the seated strips.
 */
export function showcaseBoardV7(setup: MatchSetupV7): BoardStateV7 {
  const size = SHOWCASE_BOARD_SIZE_V7;
  const tiles: TileStateV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) tiles.push(baseTile(x, y));
  const put = (at: CoordV7, change: Partial<TileStateV7>): void => {
    const index = at.y * size + at.x;
    tiles[index] = { ...(tiles[index] as TileStateV7), ...change };
  };
  for (let seat = 0; seat <= setup.aiCount; seat += 1) {
    const cx = showcaseStripCenterXV7(seat, setup.aiCount);
    for (const city of SHOWCASE_CITY_TEMPLATES_V7) {
      put(
        { x: cx, y: city.y },
        { site: city.key === "CAPITAL" ? "CAPITAL" : "CITY" },
      );
      for (const tile of city.tiles)
        put(
          { x: cx + tile.dx, y: tile.y },
          {
            ...(tile.terrain === undefined ? {} : { terrain: tile.terrain }),
            resource: tile.resource ?? null,
            improvement: tile.improvement ?? null,
            road: tile.road === true,
          },
        );
    }
    for (const y of NEUTRAL_ROAD_ROWS_V7) put({ x: cx, y }, { road: true });
  }
  return { width: size, height: size, tiles };
}

function baseTile(x: number, y: number): TileStateV7 {
  const at = { x, y };
  const blank = {
    at,
    improvement: null,
    road: false,
    fieldDefense: false,
    site: null,
    territoryCityId: null,
  } as const;
  if (y >= SHOWCASE_LAND_ROWS_V7) {
    const resource: ResourceIdV7 | null =
      x % 4 !== 0 ? null : y === 12 ? "FISH" : y === 14 ? "PEARLS" : null;
    return {
      ...blank,
      biome: null,
      terrain: y === SHOWCASE_LAND_ROWS_V7 ? "SHALLOW_WATER" : "DEEP_WATER",
      resource,
    };
  }
  if (y === 0)
    return x % 2 === 0
      ? {
          ...blank,
          biome: "PLAINS",
          terrain: "MOUNTAIN",
          resource: x % 4 === 0 ? "ORE" : null,
        }
      : {
          ...blank,
          biome: "PLAINS",
          terrain: "FOREST",
          resource: x % 4 === 1 ? "GAME" : null,
        };
  return {
    ...blank,
    biome: "PLAINS",
    terrain: "GRASS",
    resource:
      y !== 1
        ? null
        : x % 4 === 2
          ? "FRUIT"
          : x % 4 === 3
            ? "FERTILE_GROUND"
            : null,
  };
}

export interface ShowcaseEntitiesV7 {
  readonly board: BoardStateV7;
  readonly players: readonly PlayerStateV7[];
  readonly cities: readonly CityStateV7[];
  readonly populationContributions: readonly PopulationContributionV7[];
  readonly units: readonly UnitStateV7[];
  /** The frozen sea: the ice of the Ice Folk seats, sorted by (y, x). */
  readonly ice: readonly IceTileV7[];
  readonly nextEntityId: number;
}

/**
 * Everything the Showcase adds to an initial state. `players` are the
 * ordinary freshly created seats (5 Coins, locked achievements); they gain
 * every technology and the whole board as explored. Live amounts and Road
 * population come from the ordinary ledger rules, not from constants.
 */
export function createShowcaseEntitiesV7(
  setup: MatchSetupV7,
  basePlayers: readonly PlayerStateV7[],
  freshActivation: () => UnitStateV7["activation"],
): ShowcaseEntitiesV7 {
  const size = SHOWCASE_BOARD_SIZE_V7;
  const explored: CoordV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) explored.push({ x, y });
  const players = basePlayers.map((player) => ({
    ...player,
    researchedTechs: [...TECHNOLOGY_IDS_V7],
    explored,
  }));
  const centers = players.map((player) =>
    showcaseStripCenterXV7(player.seat, setup.aiCount),
  );
  let nextEntityId = 1;
  const cityIds: Record<ShowcaseCityKeyV7, CityId>[] = [];
  const fighterIds: UnitId[] = [];
  // Seat `s` keeps capital ID `2s + 1` and FIGHTER ID `2s + 2`.
  for (let seat = 0; seat < players.length; seat += 1) {
    const capital = allocateCityId(nextEntityId);
    const fighter = allocateUnitId(capital.nextEntityId);
    nextEntityId = fighter.nextEntityId;
    cityIds.push({ CAPITAL: capital.id, NORTH: capital.id, COAST: capital.id });
    fighterIds.push(fighter.id);
  }
  for (let seat = 0; seat < players.length; seat += 1) {
    const north = allocateCityId(nextEntityId);
    const coast = allocateCityId(north.nextEntityId);
    nextEntityId = coast.nextEntityId;
    cityIds[seat] = {
      CAPITAL: (cityIds[seat] as Record<ShowcaseCityKeyV7, CityId>).CAPITAL,
      NORTH: north.id,
      COAST: coast.id,
    };
  }
  // Territory: every city owns exactly its centered 3 x 3 footprint.
  const bare = showcaseBoardV7(setup);
  const territory = new Map<number, CityId>();
  players.forEach((_, seat) => {
    const cx = centers[seat] as number;
    for (const city of SHOWCASE_CITY_TEMPLATES_V7)
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1)
          territory.set(
            (city.y + dy) * size + cx + dx,
            (cityIds[seat] as Record<ShowcaseCityKeyV7, CityId>)[city.key],
          );
  });
  const board: BoardStateV7 = {
    ...bare,
    tiles: bare.tiles.map((tile, index) => ({
      ...tile,
      territoryCityId: territory.get(index) ?? null,
    })),
  };
  const draftCities: CityStateV7[] = [];
  players.forEach((player, seat) => {
    for (const city of SHOWCASE_CITY_TEMPLATES_V7)
      draftCities.push({
        id: (cityIds[seat] as Record<ShowcaseCityKeyV7, CityId>)[city.key],
        ownerId: player.id,
        at: { x: centers[seat] as number, y: city.y },
        level: city.level,
        permanentPopulation: 0,
        economicPopulation: 0,
        population: 0,
        isCapital: city.key === "CAPITAL",
        expanded: false,
        landGrantUsed: false,
        cityActionAvailable: false,
        rewards: city.rewards,
      });
  });
  draftCities.sort((left, right) => left.id - right.id);
  // Ledger records: per seat, per city (capital, North, Coast), permanent
  // records first, then live records in (y, x) tile order.
  const graph = { board, cities: draftCities };
  const populationContributions: PopulationContributionV7[] = [];
  players.forEach((player, seat) => {
    const cx = centers[seat] as number;
    for (const city of SHOWCASE_CITY_TEMPLATES_V7) {
      const id = (cityIds[seat] as Record<ShowcaseCityKeyV7, CityId>)[city.key];
      if (city.key === "CAPITAL") {
        populationContributions.push({
          id: nextEntityId,
          cityId: id,
          category: "PERMANENT",
          amount: 3,
          source: {
            kind: "CITY_REWARD",
            reward: "BOOM",
            reachedLevel: 4,
            at: { x: cx, y: city.y },
          },
        });
        nextEntityId += 1;
        populationContributions.push({
          id: nextEntityId,
          cityId: id,
          category: "PERMANENT",
          amount: 1,
          source: {
            kind: "RESOURCE_ACTION",
            action: "HARVEST_FRUIT",
            at: { x: cx + CAPITAL_HARVEST_V7.dx, y: CAPITAL_HARVEST_V7.y },
          },
        });
        nextEntityId += 1;
      }
      for (const tile of city.tiles) {
        if (tile.improvement === undefined || tile.improvement === "MARKET")
          continue;
        const at = { x: cx + tile.dx, y: tile.y };
        populationContributions.push({
          id: nextEntityId,
          cityId: id,
          category: "LIVE",
          // The naval branch section 5.4: every technology is researched,
          // so the docks give their Harbours population too.
          amount:
            tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
              ? dockPopulationV7(
                  tile.improvement,
                  harbourPopulationForV7(players, player.id),
                )
              : spatialContributionAtV7(graph, at, tile.improvement).population,
          source: { kind: "IMPROVEMENT", improvement: tile.improvement, at },
        });
        nextEntityId += 1;
      }
    }
  });
  const units: UnitStateV7[] = [];
  const unitFor = (
    seat: number,
    id: UnitId,
    template: (typeof SHOWCASE_UNIT_TEMPLATES_V7)[number],
  ): UnitStateV7 => {
    const player = players[seat] as PlayerStateV7;
    const rule = effectiveRoleRuleV7(template.role, player.faction);
    return {
      id,
      ownerId: player.id,
      homeCityId: (cityIds[seat] as Record<ShowcaseCityKeyV7, CityId>)[
        template.home
      ],
      role: template.role,
      form: isNavalRoleV7(template.role) ? "NAVAL" : "LAND",
      at: { x: (centers[seat] as number) + template.dx, y: template.y },
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: freshActivation(),
    };
  };
  players.forEach((_, seat) => {
    units.push(
      unitFor(
        seat,
        fighterIds[seat] as UnitId,
        SHOWCASE_UNIT_TEMPLATES_V7[0] as (typeof SHOWCASE_UNIT_TEMPLATES_V7)[number],
      ),
    );
  });
  // The naval branch, the frozen sea
  // (docs/product/RULESET_7_NAVAL_BRANCH.md section 3.3): an Ice Folk seat
  // has no ship. The water tiles where its boats would stand are its ice
  // instead, with the countdown of the ice it makes (every technology is
  // researched, so Glacier's); the one in its Coast territory is permanent.
  // The seat still takes the three entity IDs, so every other unit of the
  // Showcase keeps its ID whatever the factions.
  const ice: IceTileV7[] = [];
  players.forEach((player, seat) => {
    for (const template of SHOWCASE_UNIT_TEMPLATES_V7.slice(1)) {
      const unit = allocateUnitId(nextEntityId);
      nextEntityId = unit.nextEntityId;
      if (isNavalRoleV7(template.role) && player.faction === "ICE_FOLK") {
        ice.push({
          at: { x: (centers[seat] as number) + template.dx, y: template.y },
          ownerId: player.id,
          turnsLeft: technologyCapabilitiesV7(
            player.researchedTechs,
            player.faction,
          ).iceTurns,
        });
        continue;
      }
      units.push(unitFor(seat, unit.id, template));
    }
  });
  ice.sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
  if (
    SHOWCASE_UNIT_TEMPLATES_V7.length !== UNIT_ROLE_IDS_V7.length ||
    SHOWCASE_UNIT_TEMPLATES_V7.some(
      (template, index) => template.role !== UNIT_ROLE_IDS_V7[index],
    )
  )
    throw new RangeError("Showcase unit roles out of sync with the role list");
  // The ordinary ledger: stored totals plus Road population, then
  // `population = permanent + live - growthSpent(level)`.
  const roadGraph = {
    board,
    cities: draftCities,
    players,
    units,
    setup,
    humanPlayerId: (players[0] as PlayerStateV7).id,
  };
  const cities = draftCities.map((city) => {
    const entries = populationContributions.filter(
      (entry) => entry.cityId === city.id,
    );
    const total = (category: "PERMANENT" | "LIVE"): number =>
      entries
        .filter((entry) => entry.category === category)
        .reduce((sum, entry) => sum + entry.amount, 0);
    const permanentPopulation = total("PERMANENT");
    const economicPopulation =
      total("LIVE") + roadPopulationForCityV7(roadGraph, city);
    return {
      ...city,
      permanentPopulation,
      economicPopulation,
      population:
        permanentPopulation + economicPopulation - growthSpentV7(city.level),
    };
  });
  return {
    board,
    players,
    cities,
    populationContributions,
    units,
    ice,
    nextEntityId,
  };
}
