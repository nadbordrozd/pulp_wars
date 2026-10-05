import { deepFreeze } from "../../model/freeze";
import {
  allocateCityId,
  allocateUnitId,
  cityId,
  playerId,
  unitId,
  type CityId,
  type UnitId,
} from "../../model/ids";
import { randomState } from "../../random/random";
import {
  ORIGINAL_BASELINE_V5_TREE,
  canEnterTerrainV7,
  dockPopulationV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  gravesEnabledV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
} from "../../rules/ruleset-v7";
import { initialAchievementEntitlementsV7 } from "../achievements";
import {
  growthSpentV7,
  harbourPopulationForV7,
  roadPopulationForCityV7,
} from "../economy";
import { withFullShieldsV7 } from "../martian";
import { spatialContributionAtV7 } from "../spatial-economy";
import { parseGameStateV7 } from "../state-schema";
import {
  IMPROVEMENT_IDS_V7,
  NAVAL_ROLE_IDS_V7,
  REWARD_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type BiomeIdV7,
  type BoardStateV7,
  type CityStateV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  PLAYER_COLORS_V7,
  type PlayerColorV7,
  type PlayerStateV7,
  type PopulationContributionV7,
  type ResourceIdV7,
  type RewardIdV7,
  type TerrainIdV7,
  type TileStateV7,
  type UnitStateV7,
} from "../types";
import { missionDefinitionV7, missionSeatFactionsV7 } from "./index";
import type { MissionDefinitionV7, MissionSeatV7, RectV7 } from "./types";

/**
 * The mission builder (docs/product/CAMPAIGN.md section 2.2): a pure,
 * PRNG-free function from a registered mission and its setup to an ordinary
 * initial `GameStateV7` that passes the full state schema, like the
 * Showcase. `createInitialMapStateV7` dispatches `MISSION` here and
 * `createPlayableGameV7` then runs the first Start Turn as for every match.
 *
 * A definition the builder cannot honour throws `MissionBuildErrorV7` with
 * the mission ID and the reason; tests build every registered mission (and
 * every faction choice) long before a release.
 */
export class MissionBuildErrorV7 extends Error {
  constructor(missionId: string, reason: string) {
    super(`Mission ${missionId}: ${reason}`);
    this.name = "MissionBuildErrorV7";
  }
}

const COLORS_V7: readonly PlayerColorV7[] = PLAYER_COLORS_V7;
const TERRAIN_LEGEND_V7: Readonly<Record<string, TerrainIdV7 | "WATER">> = {
  ".": "GRASS",
  f: "FOREST",
  "^": "MOUNTAIN",
  "~": "WATER",
  x: "RIFT",
};
const RESOURCE_LEGEND_V7: Readonly<Record<string, ResourceIdV7 | null>> = {
  ".": null,
  r: "FRUIT",
  e: "FERTILE_GROUND",
  g: "GAME",
  o: "ORE",
  s: "FISH",
  p: "PEARLS",
};
const BIOME_LEGEND_V7: Readonly<Record<string, BiomeIdV7>> = {
  P: "PLAINS",
  W: "WOODLAND",
  H: "HIGHLANDS",
};
const NAVAL_ROLES_V7 = new Set<string>(NAVAL_ROLE_IDS_V7);
/** The `BOOM` reward's permanent record (section 4.2 of the current rules). */
const BOOM_POPULATION_V7 = 3;

/**
 * The initial state of a validated `MISSION` setup: the registered mission
 * it names, built for the setup's faction choice.
 */
export function missionInitialStateV7(setup: MatchSetupV7): GameStateV7 {
  const mission =
    setup.mapType === "MISSION" && setup.mission !== undefined
      ? missionDefinitionV7(setup.mission)
      : null;
  if (mission === null)
    throw new RangeError("missionInitialStateV7 requires a MISSION setup");
  return buildMissionStateV7(mission, setup);
}

/**
 * The board of a mission without territory: terrain, biomes, resources,
 * improvements, Roads, Field Defenses, and the settlement sites.
 */
export function missionBoardV7(mission: MissionDefinitionV7): BoardStateV7 {
  validateMissionDefinitionV7(mission);
  return bareBoard(mission);
}

/** Every seat's capital, by seat (the generated-map `capitals`). */
export function missionCapitalsV7(
  mission: MissionDefinitionV7,
): readonly CoordV7[] {
  return mission.seats.map((seat) => (seat.cities[0] as { at: CoordV7 }).at);
}

/** The treasure chests of a mission, sorted by `(y, x)`. */
export function missionTreasureChestsV7(
  mission: MissionDefinitionV7,
): readonly CoordV7[] {
  return sortedCoords(mission.treasureChests ?? []);
}

/**
 * Builds `mission` for `setup` (whose `factions` must be a legal choice of
 * the mission's seats). Tests call it with unregistered definitions to check
 * the build-time validation; the game reaches it only through
 * {@link missionInitialStateV7}.
 */
export function buildMissionStateV7(
  mission: MissionDefinitionV7,
  setup: MatchSetupV7,
): GameStateV7 {
  const fail = (reason: string): never => {
    throw new MissionBuildErrorV7(mission.id, reason);
  };
  validateMissionDefinitionV7(mission);
  const size = mission.size;
  if (
    setup.width !== size ||
    setup.height !== size ||
    setup.factions.length !== mission.seats.length ||
    mission.seats.some(
      (seat, index) =>
        !missionSeatFactionsV7(seat).includes(
          setup.factions[index] as FactionIdV7,
        ),
    )
  )
    fail("the setup does not match the definition");
  if ((mission.graves ?? []).length > 0 && !gravesEnabledV7(setup))
    fail("Graves need an Undead seat");
  const bare = bareBoard(mission);
  const tileAt = (at: CoordV7): TileStateV7 =>
    bare.tiles[at.y * size + at.x] as TileStateV7;

  // Players: the ordinary freshly created seats with the definition's Coins,
  // technologies, and (below) exploration.
  const colors = COLORS_V7.filter((color) => color !== setup.humanColor);
  const basePlayers: PlayerStateV7[] = mission.seats.map((seat, index) => {
    const tree = factionTreeV7(setup.factions[index] as FactionIdV7);
    return {
      id: playerId(index + 1),
      seat: index,
      controller: index === 0 ? "HUMAN" : "AI",
      color:
        index === 0 ? setup.humanColor : (colors[index - 1] as PlayerColorV7),
      faction: tree.faction,
      factionTreeId: tree.id,
      status: "ACTIVE",
      coins: seat.coins,
      researchedTechs: TECHNOLOGY_IDS_V7.filter((tech) =>
        seat.technologies.includes(tech),
      ),
      explored: [],
      spoilsClaimedCityIds: [],
      achievementEntitlements: initialAchievementEntitlementsV7(),
      originalCapitalCityId: cityId(index * 2 + 1),
    };
  });

  // Entity IDs (the Showcase convention the state schema requires): seat `s`
  // has capital ID `2s + 1` and its first unit ID `2s + 2`; then every seat's
  // other cities, then the ledger, then every seat's other units.
  let nextEntityId = 1;
  const cityIdsBySeat: CityId[][] = [];
  const firstUnitIds: UnitId[] = [];
  for (let seat = 0; seat < mission.seats.length; seat += 1) {
    const capital = allocateCityId(nextEntityId);
    const unit = allocateUnitId(capital.nextEntityId);
    nextEntityId = unit.nextEntityId;
    cityIdsBySeat.push([capital.id]);
    firstUnitIds.push(unit.id);
  }
  mission.seats.forEach((seat, index) => {
    for (let city = 1; city < seat.cities.length; city += 1) {
      const allocated = allocateCityId(nextEntityId);
      nextEntityId = allocated.nextEntityId;
      (cityIdsBySeat[index] as CityId[]).push(allocated.id);
    }
  });

  // Territory: every city claims the neutral cells of its centered 3 x 3
  // footprint, in city-ID order; a city's own center must be its own.
  const draftCities: CityStateV7[] = [];
  mission.seats.forEach((seat, seatIndex) =>
    seat.cities.forEach((city, cityIndex) =>
      draftCities.push({
        id: (cityIdsBySeat[seatIndex] as CityId[])[cityIndex] as CityId,
        ownerId: (basePlayers[seatIndex] as PlayerStateV7).id,
        at: city.at,
        level: city.level,
        permanentPopulation: 0,
        economicPopulation: 0,
        population: 0,
        isCapital: cityIndex === 0,
        expanded: false,
        landGrantUsed: false,
        cityActionAvailable: false,
        rewards: city.rewards.map((reward, index) => ({
          reachedLevel: index + 2,
          reward,
        })),
      }),
    ),
  );
  draftCities.sort((left, right) => left.id - right.id);
  const territory = new Map<number, CityId>();
  for (const city of draftCities)
    for (let dy = -1; dy <= 1; dy += 1)
      for (let dx = -1; dx <= 1; dx += 1) {
        const index = (city.at.y + dy) * size + city.at.x + dx;
        if (!territory.has(index)) territory.set(index, city.id);
      }
  for (const city of draftCities)
    if (territory.get(city.at.y * size + city.at.x) !== city.id)
      fail(
        `the city at ${coordText(city.at)} lies in another city's footprint`,
      );
  const board: BoardStateV7 = {
    ...bare,
    tiles: bare.tiles.map((tile, index) => ({
      ...tile,
      territoryCityId: territory.get(index) ?? null,
    })),
  };
  for (const village of mission.villages)
    if (territory.has(village.y * size + village.x))
      fail(`the village at ${coordText(village)} lies in a city's territory`);
  for (const item of mission.improvements ?? [])
    if (!territory.has(item.at.y * size + item.at.x))
      fail(`the improvement at ${coordText(item.at)} lies outside territory`);

  // Exploration: every cell within `reveal.radius` of an own city, plus the
  // rectangles, clipped to the board.
  const players = basePlayers.map((player, seatIndex) => {
    const seat = mission.seats[seatIndex] as MissionSeatV7;
    const cells: CoordV7[] = [];
    for (const city of seat.cities)
      cells.push(...cellsInRect(size, aroundRect(city.at, seat.reveal.radius)));
    for (const rect of seat.reveal.rects ?? [])
      cells.push(...cellsInRect(size, rect));
    return { ...player, explored: sortedCoords(cells) };
  });

  // Units, homed as written, at full HP with a fresh activation. The first
  // unit of each seat keeps its reserved ID; the others are numbered after
  // the ledger (below), so they are placed with provisional IDs first.
  const chests = missionTreasureChestsV7(mission);
  const occupied = new Set<string>();
  const draftUnits: { readonly seat: number; readonly unit: UnitStateV7 }[] =
    [];
  mission.seats.forEach((seat, seatIndex) => {
    const player = players[seatIndex] as PlayerStateV7;
    seat.units.forEach((written, unitIndex) => {
      const at = written.at;
      if (!onBoard(size, at))
        fail(`a unit at ${coordText(at)} is off the board`);
      if (occupied.has(coordText(at))) fail(`two units share ${coordText(at)}`);
      occupied.add(coordText(at));
      if (chests.some((chest) => sameCoord(chest, at)))
        fail(`a unit stands on the treasure chest at ${coordText(at)}`);
      const home = written.home ?? 0;
      const homeId = (cityIdsBySeat[seatIndex] as CityId[])[home];
      if (!Number.isSafeInteger(home) || homeId === undefined)
        fail(`a unit at ${coordText(at)} has no home city ${String(home)}`);
      const tile = tileAt(at);
      const owner = draftCities.find(
        (city) => city.id === territory.get(at.y * size + at.x),
      );
      if (
        tile.site !== null &&
        tile.site !== "VILLAGE" &&
        owner !== undefined &&
        sameCoord(owner.at, at) &&
        owner.ownerId !== player.id
      )
        fail(`a unit stands on another seat's city at ${coordText(at)}`);
      if (
        (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
        owner !== undefined &&
        owner.ownerId !== player.id
      )
        fail(`a unit blockades another seat's dock at ${coordText(at)}`);
      const naval = NAVAL_ROLES_V7.has(written.role);
      // The frozen sea (naval branch section 8.11): the Ice Folk have no
      // ships.
      if (naval && player.faction === "ICE_FOLK")
        fail(`an Ice Folk seat has no ships (at ${coordText(at)})`);
      const mechanics = roleMechanicsV7(written.role, player.faction);
      const navigation = player.researchedTechs.includes("NAVIGATION");
      const standable = naval
        ? tile.terrain === "SHALLOW_WATER" ||
          (tile.terrain === "DEEP_WATER" && navigation)
        : canEnterTerrainV7({
            terrain: tile.terrain,
            movementMode: mechanics.movementMode,
            afloat: false,
            engineering: technologyCapabilitiesV7(
              player.researchedTechs,
              player.faction,
            ).mountainMovement,
            navigation,
            mountainBorn: mechanics.mountainBorn,
            ice: false,
          });
      if (!standable)
        fail(`the ${written.role} at ${coordText(at)} cannot stand there`);
      const rule = effectiveRoleRuleV7(written.role, player.faction);
      draftUnits.push({
        seat: seatIndex,
        unit: {
          id:
            unitIndex === 0
              ? (firstUnitIds[seatIndex] as UnitId)
              : unitId(1_000_000 + draftUnits.length),
          ownerId: player.id,
          homeCityId: homeId as CityId,
          role: written.role,
          form: naval ? "NAVAL" : "LAND",
          at,
          hp: rule.maxHp,
          maxHp: rule.maxHp,
          kills: 0,
          veteran: false,
          captureEligible: false,
          activation: freshActivationV7(),
        },
      });
    });
  });

  // The population ledger: live records from the improvements under the
  // ordinary spatial rules, then permanent records filled to exactly what
  // each city's level needs (`BOOM`, then `HARVEST_FRUIT` on empty Grass of
  // its own footprint in `(y, x)` order), so it starts at population 0 of
  // its level unless its live population alone is higher.
  const graph = { board, cities: draftCities };
  const roadGraph = {
    board,
    cities: draftCities,
    players,
    units: draftUnits.map((entry) => entry.unit),
    setup,
    humanPlayerId: (players[0] as PlayerStateV7).id,
  };
  const ledger: PopulationContributionV7[] = [];
  const settledCities = new Map<CityId, CityStateV7>();
  mission.seats.forEach((seat, seatIndex) =>
    seat.cities.forEach((written, cityIndex) => {
      const id = (cityIdsBySeat[seatIndex] as CityId[])[cityIndex] as CityId;
      const city = draftCities.find((item) => item.id === id) as CityStateV7;
      const live: PopulationContributionV7[] = [];
      for (const tile of board.tiles) {
        if (
          tile.territoryCityId !== id ||
          tile.improvement === null ||
          tile.improvement === "MARKET"
        )
          continue;
        live.push({
          id: 0,
          cityId: id,
          category: "LIVE",
          // The naval branch section 5.4: a seat that starts with the
          // capability has its Harbours population.
          amount:
            tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
              ? dockPopulationV7(
                  tile.improvement,
                  harbourPopulationForV7(players, city.ownerId),
                )
              : spatialContributionAtV7(graph, tile.at, tile.improvement)
                  .population,
          source: {
            kind: "IMPROVEMENT",
            improvement: tile.improvement,
            at: tile.at,
          },
        });
      }
      const economicPopulation =
        live.reduce((sum, entry) => sum + entry.amount, 0) +
        roadPopulationForCityV7(roadGraph, city);
      const boom = written.rewards[2] === "BOOM";
      const needed =
        growthSpentV7(written.level) -
        economicPopulation -
        (boom ? BOOM_POPULATION_V7 : 0);
      const harvested = board.tiles.filter(
        (tile) =>
          tile.territoryCityId === id &&
          tile.terrain === "GRASS" &&
          tile.site === null &&
          tile.resource === null &&
          tile.improvement === null,
      );
      if (harvested.length < needed)
        fail(
          `the city at ${coordText(written.at)} needs ${String(needed)} harvested Grass tiles and has ${String(harvested.length)}`,
        );
      const permanent: PopulationContributionV7[] = [
        ...(boom
          ? [
              {
                id: 0,
                cityId: id,
                category: "PERMANENT" as const,
                amount: BOOM_POPULATION_V7,
                source: {
                  kind: "CITY_REWARD" as const,
                  reward: "BOOM" as const,
                  reachedLevel: 4 as const,
                  at: written.at,
                },
              },
            ]
          : []),
        ...harvested
          .slice(0, Math.max(0, needed))
          .map((tile): PopulationContributionV7 => ({
            id: 0,
            cityId: id,
            category: "PERMANENT",
            amount: 1,
            source: {
              kind: "RESOURCE_ACTION",
              action: "HARVEST_FRUIT",
              at: tile.at,
            },
          })),
      ];
      const permanentPopulation = permanent.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      );
      const population =
        permanentPopulation + economicPopulation - growthSpentV7(written.level);
      if (population >= written.level + 1)
        fail(
          `the city at ${coordText(written.at)} has more live population than its level holds`,
        );
      for (const entry of [...permanent, ...live]) {
        ledger.push({ ...entry, id: nextEntityId });
        nextEntityId += 1;
      }
      settledCities.set(id, {
        ...city,
        permanentPopulation,
        economicPopulation,
        population,
      });
    }),
  );
  const cities = draftCities.map(
    (city) => settledCities.get(city.id) as CityStateV7,
  );

  // The other units, numbered after the ledger in seat order.
  const units: UnitStateV7[] = draftUnits
    .filter((entry) => firstUnitIds.includes(entry.unit.id))
    .map((entry) => entry.unit);
  for (let seat = 0; seat < mission.seats.length; seat += 1)
    for (const entry of draftUnits)
      if (entry.seat === seat && !firstUnitIds.includes(entry.unit.id)) {
        const allocated = allocateUnitId(nextEntityId);
        nextEntityId = allocated.nextEntityId;
        units.push({ ...entry.unit, id: allocated.id });
      }

  const state = deepFreeze<GameStateV7>({
    schemaVersion: 7,
    rulesetId: RULESET_7_ID,
    setup,
    random: randomState(mission.seed),
    humanPlayerId: (players[0] as PlayerStateV7).id,
    nextEntityId,
    commandIndex: 0,
    round: 1,
    activeSeatIndex: 0,
    turnOrder: players.map((player) => player.id),
    board,
    players,
    cities,
    populationContributions: ledger,
    units,
    treasureChests: chests,
    // RULESET_7_MAP_CURIOSITIES.md section 3: never on an authored board.
    curiosities: [],
    // The frozen sea: an authored board starts without ice.
    ice: [],
    monsters: [],
    graves: sortedCoords(mission.graves ?? []),
    plagued: [],
    bitten: [],
    eggs: [],
    // A Martian seat's units start at their full Shield.
    shields: withFullShieldsV7({ players, mindControlled: [] }, [], units),
    cooling: [],
    mindControlled: [],
    mindControlCooldowns: [],
    chilled: [],
    burrowed: [],
    surfacedThisTurn: [],
    bombedThisTurn: [],
    beamedThisTurn: [],
    tractorUsedThisTurn: [],
    // The Candy revision (section 12.10): the four Candy lists start empty.
    sugarRush: [],
    crumbs: [],
    splattedThisTurn: [],
    tossedThisTurn: [],
    pendingChoices: [],
    outcome: null,
  });
  if (parseGameStateV7(state) === null)
    fail("the built state does not pass the state schema");
  return state;
}

/**
 * The definition-level checks of section 2.2 that do not depend on the
 * faction choice: layer shapes and legends, cities, villages, the faction
 * choice, technologies, and forbidden-technology closure.
 */
export function validateMissionDefinitionV7(
  mission: MissionDefinitionV7,
): void {
  const fail = (reason: string): never => {
    throw new MissionBuildErrorV7(mission.id, reason);
  };
  const size = mission.size;
  if (!/^[A-Z][A-Z0-9_]*$/.test(mission.id))
    fail("the ID is not SCREAMING_SNAKE");
  if (!Number.isSafeInteger(mission.revision) || mission.revision < 1)
    fail("the revision is not a positive integer");
  if (size !== 11 && size !== 14 && size !== 16)
    fail("the size is not 11, 14, or 16");
  if (
    !Number.isSafeInteger(mission.seed) ||
    mission.seed < 0 ||
    mission.seed > 0xffffffff
  )
    fail("the seed is not a uint32");
  const layer = (
    name: string,
    rows: readonly string[] | undefined,
    legend: Readonly<Record<string, unknown>>,
  ): void => {
    if (rows === undefined) return;
    if (
      rows.length !== size ||
      rows.some(
        (row) =>
          row.length !== size ||
          [...row].some((char) => !Object.hasOwn(legend, char)),
      )
    )
      fail(
        `the ${name} layer is not ${String(size)} rows of ${String(size)} legend characters`,
      );
  };
  layer("terrain", mission.terrain, TERRAIN_LEGEND_V7);
  layer("resources", mission.resources, RESOURCE_LEGEND_V7);
  layer("biomes", mission.biomes, BIOME_LEGEND_V7);
  if (!Object.values(BIOME_LEGEND_V7).includes(mission.biome))
    fail("the default biome is unknown");
  const terrain = terrainGrid(mission);
  const at = (coord: CoordV7): TerrainIdV7 =>
    (terrain[coord.y] as TerrainIdV7[])[coord.x] as TerrainIdV7;
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const resource = RESOURCE_LEGEND_V7[
        (mission.resources[y] as string)[x] as string
      ] as ResourceIdV7 | null;
      if (resource !== null && !resourceFitsTerrain(resource, at({ x, y })))
        fail(`the resource at ${coordText({ x, y })} does not fit its terrain`);
    }
  const sites = new Set<string>();
  const siteFree = (coord: CoordV7, what: string): void => {
    if (!onBoard(size, coord))
      fail(`the ${what} at ${coordText(coord)} is off the board`);
    if (at(coord) !== "GRASS")
      fail(`the ${what} at ${coordText(coord)} is not on Grass`);
    if (resourceAt(mission, coord) !== null)
      fail(`the ${what} at ${coordText(coord)} has a resource`);
    if (sites.has(coordText(coord)))
      fail(`two settlements share ${coordText(coord)}`);
    sites.add(coordText(coord));
  };
  if (mission.aiMode !== "RIVAL" && mission.aiMode !== "COOPERATIVE")
    fail("the AI mode is unknown");
  if (mission.seats.length < 2 || mission.seats.length > 4)
    fail("a mission has 2–4 seats");
  for (const [index, seat] of mission.seats.entries()) {
    const factions = missionSeatFactionsV7(seat);
    if (typeof seat.faction !== "string" && index !== 0)
      fail("only seat 0 may offer a faction choice");
    if (factions.length === 0 || new Set(factions).size !== factions.length)
      fail(`seat ${String(index)} has an empty or repeated faction choice`);
    if (!Number.isSafeInteger(seat.coins) || seat.coins < 0)
      fail(`seat ${String(index)} has invalid Coins`);
    if (
      new Set(seat.technologies).size !== seat.technologies.length ||
      seat.technologies.some((tech) => !TECHNOLOGY_IDS_V7.includes(tech))
    )
      fail(`seat ${String(index)} has invalid technologies`);
    for (const tech of seat.technologies) {
      const node = ORIGINAL_BASELINE_V5_TREE.nodes.find(
        (item) => item.id === tech,
      );
      if (node?.prerequisites.some((item) => !seat.technologies.includes(item)))
        fail(`seat ${String(index)} knows ${tech} without its prerequisite`);
      if (mission.forbiddenTechnologies.includes(tech))
        fail(`seat ${String(index)} starts with the forbidden ${tech}`);
    }
    if (seat.cities.length === 0) fail(`seat ${String(index)} has no capital`);
    if (seat.units.length === 0) fail(`seat ${String(index)} has no unit`);
    if (seat.units.some((unit) => !UNIT_ROLE_IDS_V7.includes(unit.role)))
      fail(`seat ${String(index)} has an unknown unit role`);
    if (!Number.isSafeInteger(seat.reveal.radius) || seat.reveal.radius < 0)
      fail(`seat ${String(index)} has an invalid reveal radius`);
    for (const rect of seat.reveal.rects ?? [])
      if (
        ![rect.x0, rect.y0, rect.x1, rect.y1].every(Number.isSafeInteger) ||
        rect.x0 > rect.x1 ||
        rect.y0 > rect.y1
      )
        fail(`seat ${String(index)} has an invalid reveal rectangle`);
    for (const city of seat.cities) {
      siteFree(city.at, "city");
      if (
        city.at.x < 1 ||
        city.at.y < 1 ||
        city.at.x > size - 2 ||
        city.at.y > size - 2
      )
        fail(`the city at ${coordText(city.at)} is on the edge ring`);
      if (
        !Number.isSafeInteger(city.level) ||
        city.level < 1 ||
        city.rewards.length !== city.level - 1 ||
        city.rewards.some(
          (reward, rewardIndex) =>
            !REWARD_IDS_V7.includes(reward) ||
            !rewardFitsLevel(reward, rewardIndex + 2),
        )
      )
        fail(
          `the city at ${coordText(city.at)} has rewards that do not match its level`,
        );
    }
  }
  const [human, ...ai] = mission.seats;
  for (const faction of missionSeatFactionsV7(human as MissionSeatV7))
    if (ai.some((seat) => missionSeatFactionsV7(seat).includes(faction)))
      fail(`an AI seat plays ${faction}, which seat 0 may choose`);
  const aiFactions = ai.flatMap((seat) => missionSeatFactionsV7(seat));
  if (new Set(aiFactions).size !== aiFactions.length)
    fail("two seats play the same faction");
  for (const village of mission.villages) siteFree(village, "village");
  /** Land that is not a Rift (the Rift holds nothing). */
  const land = (coord: CoordV7, what: string): void => {
    if (!onBoard(size, coord))
      fail(`the ${what} at ${coordText(coord)} is off the board`);
    const terrainAt = at(coord);
    if (
      terrainAt === "SHALLOW_WATER" ||
      terrainAt === "DEEP_WATER" ||
      terrainAt === "RIFT"
    )
      fail(`the ${what} at ${coordText(coord)} is not on land`);
  };
  for (const road of mission.roads ?? []) {
    land(road, "Road");
    if (sites.has(coordText(road)))
      fail(`the Road at ${coordText(road)} is on a settlement`);
  }
  for (const item of mission.fieldDefenses ?? []) land(item, "Field Defense");
  for (const item of mission.improvements ?? []) {
    if (!onBoard(size, item.at))
      fail(`the improvement at ${coordText(item.at)} is off the board`);
    if (!IMPROVEMENT_IDS_V7.includes(item.improvement))
      fail(`the improvement at ${coordText(item.at)} is unknown`);
    if (sites.has(coordText(item.at)))
      fail(`the improvement at ${coordText(item.at)} is on a settlement`);
    if (
      !improvementFits(
        item.improvement,
        at(item.at),
        resourceAt(mission, item.at),
      )
    )
      fail(
        `the ${item.improvement} at ${coordText(item.at)} does not fit its tile`,
      );
  }
  const improved = (mission.improvements ?? []).map((item) =>
    coordText(item.at),
  );
  if (new Set(improved).size !== improved.length)
    fail("two improvements share a tile");
  for (const chest of mission.treasureChests ?? []) {
    land(chest, "treasure chest");
    if (
      at(chest) === "MOUNTAIN" ||
      sites.has(coordText(chest)) ||
      resourceAt(mission, chest) !== null ||
      improved.includes(coordText(chest))
    )
      fail(`the treasure chest at ${coordText(chest)} is not on a bare tile`);
  }
  for (const grave of mission.graves ?? []) {
    land(grave, "Grave");
    if (
      sites.has(coordText(grave)) ||
      (mission.treasureChests ?? []).some((chest) => sameCoord(chest, grave))
    )
      fail(
        `the Grave at ${coordText(grave)} is on a settlement or treasure chest`,
      );
  }
  if (mission.objective.kind !== "DOMINATION") fail("the objective is unknown");
  // Forbidden technologies: known IDs, closed under prerequisites, and the
  // whole Naval branch on a board without water.
  const forbidden = new Set(mission.forbiddenTechnologies);
  if (
    forbidden.size !== mission.forbiddenTechnologies.length ||
    mission.forbiddenTechnologies.some(
      (tech) => !TECHNOLOGY_IDS_V7.includes(tech),
    )
  )
    fail("the forbidden technologies are unknown or repeated");
  for (const node of ORIGINAL_BASELINE_V5_TREE.nodes)
    if (
      !forbidden.has(node.id) &&
      node.prerequisites.some((tech) => forbidden.has(tech))
    )
      fail(`${node.id} must be forbidden with its prerequisite`);
  const water = terrain.some((row) =>
    row.some((cell) => cell === "SHALLOW_WATER" || cell === "DEEP_WATER"),
  );
  if (
    !water &&
    ORIGINAL_BASELINE_V5_TREE.nodes.some(
      (node) => node.branch === "NAVAL" && !forbidden.has(node.id),
    )
  )
    fail("a board without water must forbid the whole Naval branch");
}

function bareBoard(mission: MissionDefinitionV7): BoardStateV7 {
  const size = mission.size;
  const terrain = terrainGrid(mission);
  const tiles: TileStateV7[] = [];
  const has = (list: readonly CoordV7[] | undefined, at: CoordV7): boolean =>
    (list ?? []).some((item) => sameCoord(item, at));
  const capitals = mission.seats.map((seat) => seat.cities[0]?.at);
  const cities = mission.seats.flatMap((seat) =>
    seat.cities.slice(1).map((city) => city.at),
  );
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) {
      const at = { x, y };
      const cell = (terrain[y] as TerrainIdV7[])[x] as TerrainIdV7;
      const water = cell === "SHALLOW_WATER" || cell === "DEEP_WATER";
      const biomeChar = mission.biomes?.[y]?.[x];
      const improvement =
        (mission.improvements ?? []).find((item) => sameCoord(item.at, at))
          ?.improvement ?? null;
      tiles.push({
        at,
        biome: water
          ? null
          : biomeChar === undefined
            ? mission.biome
            : (BIOME_LEGEND_V7[biomeChar] as BiomeIdV7),
        terrain: cell,
        resource: resourceAt(mission, at),
        improvement,
        road: has(mission.roads, at),
        fieldDefense: has(mission.fieldDefenses, at),
        site: capitals.some((item) => item !== undefined && sameCoord(item, at))
          ? "CAPITAL"
          : has(cities, at)
            ? "CITY"
            : has(mission.villages, at)
              ? "VILLAGE"
              : null,
        territoryCityId: null,
      });
    }
  return { width: size, height: size, tiles };
}

/**
 * The terrain of every tile; `~` water is Shallow when one of its four
 * orthogonal on-board neighbours is land, otherwise Deep (the map
 * generator's rule, `isShallowWaterV7`).
 */
function terrainGrid(mission: MissionDefinitionV7): TerrainIdV7[][] {
  const size = mission.size;
  const raw = (x: number, y: number): TerrainIdV7 | "WATER" | undefined =>
    x < 0 || y < 0 || x >= size || y >= size
      ? undefined
      : TERRAIN_LEGEND_V7[(mission.terrain[y] as string)[x] as string];
  const isLand = (x: number, y: number): boolean => {
    const cell = raw(x, y);
    return cell !== undefined && cell !== "WATER";
  };
  return Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x): TerrainIdV7 => {
      const cell = raw(x, y) as TerrainIdV7 | "WATER";
      if (cell !== "WATER") return cell;
      return isLand(x - 1, y) ||
        isLand(x + 1, y) ||
        isLand(x, y - 1) ||
        isLand(x, y + 1)
        ? "SHALLOW_WATER"
        : "DEEP_WATER";
    }),
  );
}

function resourceAt(
  mission: MissionDefinitionV7,
  at: CoordV7,
): ResourceIdV7 | null {
  return (
    RESOURCE_LEGEND_V7[(mission.resources[at.y] as string)[at.x] as string] ??
    null
  );
}

function resourceFitsTerrain(
  resource: ResourceIdV7,
  terrain: TerrainIdV7,
): boolean {
  return resource === "FRUIT" || resource === "FERTILE_GROUND"
    ? terrain === "GRASS"
    : resource === "GAME"
      ? terrain === "FOREST"
      : resource === "ORE"
        ? terrain === "MOUNTAIN"
        : resource === "FISH"
          ? terrain === "SHALLOW_WATER"
          : terrain === "SHALLOW_WATER" || terrain === "DEEP_WATER";
}

/** Revision 12: an improvement never removes the resource beneath it. */
function improvementFits(
  improvement: (typeof IMPROVEMENT_IDS_V7)[number],
  terrain: TerrainIdV7,
  resource: ResourceIdV7 | null,
): boolean {
  switch (improvement) {
    case "FARM":
      return terrain === "GRASS" && resource === "FERTILE_GROUND";
    case "MINE":
      return terrain === "MOUNTAIN" && resource === "ORE";
    case "LUMBER_CAMP":
      return terrain === "FOREST" && resource === null;
    case "PORT":
    case "SHIPYARD":
      return (
        terrain === "SHALLOW_WATER" &&
        (resource === null || resource === "FISH" || resource === "PEARLS")
      );
    default:
      return (
        terrain === "GRASS" &&
        (resource === null || resource === "FERTILE_GROUND")
      );
  }
}

function rewardFitsLevel(reward: RewardIdV7, level: number): boolean {
  return level === 2
    ? reward === "SURVEY" || reward === "STOCKPILE"
    : level === 3
      ? reward === "WALLS" || reward === "MILITIA"
      : level === 4
        ? reward === "BOOM" || reward === "TREASURY_6"
        : level >= 5 && (reward === "JUGGERNAUT" || reward === "TREASURY");
}

function freshActivationV7(): UnitStateV7["activation"] {
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

function aroundRect(center: CoordV7, radius: number): RectV7 {
  return {
    x0: center.x - radius,
    y0: center.y - radius,
    x1: center.x + radius,
    y1: center.y + radius,
  };
}

function cellsInRect(size: number, rect: RectV7): CoordV7[] {
  const cells: CoordV7[] = [];
  for (let y = Math.max(0, rect.y0); y <= Math.min(size - 1, rect.y1); y += 1)
    for (let x = Math.max(0, rect.x0); x <= Math.min(size - 1, rect.x1); x += 1)
      cells.push({ x, y });
  return cells;
}

function sortedCoords(coords: readonly CoordV7[]): CoordV7[] {
  const unique = new Map<string, CoordV7>();
  for (const coord of coords)
    unique.set(coordText(coord), { x: coord.x, y: coord.y });
  return [...unique.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
}

function onBoard(size: number, at: CoordV7): boolean {
  return (
    Number.isSafeInteger(at.x) &&
    Number.isSafeInteger(at.y) &&
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < size &&
    at.y < size
  );
}

function sameCoord(left: CoordV7, right: CoordV7): boolean {
  return left.x === right.x && left.y === right.y;
}

/** Engine diagnostics only (thrown at build time, never shown in the UI). */
function coordText(at: CoordV7): string {
  return `(${String(at.x)}, ${String(at.y)})`;
}
