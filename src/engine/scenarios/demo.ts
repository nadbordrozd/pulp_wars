import { allocateCityId, allocateUnitId } from "../model/ids";
import { compareCoords, sortByEntityId } from "../model/order";
import type {
  CityState,
  Coord,
  GameState,
  MatchSetup,
  PlayerState,
  TechId,
  UnitState,
  UnitType,
} from "../model/types";
import { RULESET_ID } from "../model/types";
import {
  cityAssignedCountedUnitCount,
  cityAssignedExemptUnitCount,
  cityCapacity,
} from "../rules/economy";
import { requireRuleset } from "../rules/ruleset";

export const DEMO_MATCH_SEED = 0xdecafbad;
export const DEMO_OPENING_STARS = 30;
export const DEMO_MATCH_SETUP: MatchSetup = Object.freeze({
  rulesetId: RULESET_ID,
  seed: DEMO_MATCH_SEED,
  width: 25,
  height: 25,
  aiCount: 2,
  aiDifficulty: "NORMAL",
  aiMode: "RIVAL",
  humanColor: "CORAL",
  factions: Object.freeze(["ORIGINAL", "ORIGINAL", "ORIGINAL"] as const),
  scenario: "DEMO",
});

const DEMO_TECHS: readonly TechId[] = Object.freeze(
  requireRuleset(RULESET_ID).technologies.map((technology) => technology.id),
);
const DEMO_UNIT_TYPES: readonly UnitType[] = Object.freeze([
  "WARRIOR",
  "ARCHER",
  "DEFENDER",
  "RIDER",
]);
const FRESH_ACTIVATION: UnitState["activation"] = Object.freeze({
  moved: false,
  attacked: false,
  recovered: false,
  captured: false,
  handled: false,
  escapeAvailable: false,
  specialActed: false,
});

/**
 * Pure scenario specialization applied after ordinary seeded map/player/entity
 * creation and before the ordinary opening Start Turn. It consumes no random
 * draws and preserves every AI capital, unit, technology, star, and explored
 * tile produced by the standard path.
 */
export function applyDemoScenario(base: GameState): GameState {
  if (base.setup.scenario !== "DEMO") return base;
  const human = requireSingleHuman(base);
  const capital = requireHumanCapital(base, human);
  const village = [...base.board.tiles]
    .filter((tile) => tile.site === "VILLAGE")
    .sort(
      (left, right) =>
        chebyshevDistance(left.at, capital.at) -
          chebyshevDistance(right.at, capital.at) ||
        compareCoords(left.at, right.at),
    )[0];
  if (village === undefined)
    throw new RangeError("Demo scenario requires a neutral village");

  let nextEntityId = base.nextEntityId;
  const cityAllocation = allocateCityId(nextEntityId);
  nextEntityId = cityAllocation.nextEntityId;
  const convertedCity: CityState = {
    id: cityAllocation.id,
    ownerId: human.id,
    at: village.at,
    level: 3,
    population: 0,
    isCapital: false,
    rewardLevel2: "WORKSHOP",
    rewardLevel3: "CITY_WALL",
  };
  const developedCapital: CityState = {
    ...capital,
    level: 3,
    population: 0,
    rewardLevel2: "WORKSHOP",
    rewardLevel3: "CITY_WALL",
  };
  const cities = sortByEntityId([
    ...base.cities.map((city) =>
      city.id === capital.id ? developedCapital : city,
    ),
    convertedCity,
  ]) as readonly CityState[];
  const board = {
    ...base.board,
    tiles: base.board.tiles.map((tile) => {
      if (sameCoord(tile.at, village.at)) {
        return {
          ...tile,
          site: "CITY" as const,
          territoryCityId: convertedCity.id,
        };
      }
      if (
        tile.territoryCenter !== null &&
        sameCoord(tile.territoryCenter, village.at)
      ) {
        return { ...tile, territoryCityId: convertedCity.id };
      }
      return tile;
    }),
  };

  const existingHumanUnits = base.units.filter(
    (unit) => unit.ownerId === human.id,
  );
  const startingWarrior = existingHumanUnits[0];
  if (existingHumanUnits.length !== 1 || startingWarrior === undefined) {
    throw new RangeError("Demo scenario requires one ordinary human Warrior");
  }
  const demoUnits: UnitState[] = [];
  for (const [cityIndex, city] of [developedCapital, convertedCity].entries()) {
    const positions = demoUnitPositions(board, city.at);
    for (const [unitIndex, type] of DEMO_UNIT_TYPES.entries()) {
      const at = positions[unitIndex];
      if (at === undefined)
        throw new RangeError("Demo territory lacks four enterable unit tiles");
      const rule = requireRuleset(RULESET_ID).units[type];
      if (cityIndex === 0 && unitIndex === 0) {
        demoUnits.push({
          ...startingWarrior,
          homeCityId: city.id,
          type,
          at,
          hp: rule.maxHp,
          maxHp: rule.maxHp,
          kills: 0,
          veteran: false,
          ready: true,
          captureEligible: false,
          activation: FRESH_ACTIVATION,
        });
      } else {
        const unitAllocation = allocateUnitId(nextEntityId);
        nextEntityId = unitAllocation.nextEntityId;
        demoUnits.push({
          id: unitAllocation.id,
          ownerId: human.id,
          homeCityId: city.id,
          capacityExempt: false,
          type,
          at,
          hp: rule.maxHp,
          maxHp: rule.maxHp,
          kills: 0,
          veteran: false,
          ready: true,
          captureEligible: false,
          activation: FRESH_ACTIVATION,
        });
      }
    }
  }
  const units = sortByEntityId([
    ...base.units.filter((unit) => unit.ownerId !== human.id),
    ...demoUnits,
  ]) as readonly UnitState[];
  const developedIncome =
    developedCapital.level +
    1 +
    (developedCapital.rewardLevel2 === "WORKSHOP" ? 1 : 0) +
    convertedCity.level +
    (convertedCity.rewardLevel2 === "WORKSHOP" ? 1 : 0);
  const players = base.players.map((player): PlayerState =>
    player.id === human.id
      ? {
          ...player,
          stars: DEMO_OPENING_STARS - developedIncome,
          researchedTechs: DEMO_TECHS,
          explored: board.tiles.map((tile) => tile.at),
        }
      : player,
  );
  const humanOrderIndex = base.turnOrder.indexOf(human.id);
  if (humanOrderIndex < 0)
    throw new RangeError("Demo human is absent from turn order");
  const turnOrder = [
    ...base.turnOrder.slice(humanOrderIndex),
    ...base.turnOrder.slice(0, humanOrderIndex),
  ];
  return {
    ...base,
    nextEntityId,
    activeSeatIndex: 0,
    turnOrder,
    board,
    players,
    cities,
    units,
  };
}

/** Exact ready-to-play demo invariant check used by engine and headless tests. */
export function demoScenarioIssues(state: GameState): readonly string[] {
  const issues: string[] = [];
  if (!sameSetup(state.setup, DEMO_MATCH_SETUP)) issues.push("SETUP");
  const human = state.players.find((player) => player.controller === "HUMAN");
  if (human === undefined) return [...issues, "HUMAN"];
  if (state.activeSeatIndex !== 0 || state.turnOrder[0] !== human.id)
    issues.push("ACTIVE_HUMAN");
  if (human.stars !== DEMO_OPENING_STARS) issues.push("HUMAN_STARS");
  if (!sameStringArray(human.researchedTechs, DEMO_TECHS))
    issues.push("HUMAN_TECHS");
  if (
    human.explored.length !== state.board.tiles.length ||
    state.board.tiles.some(
      (tile, index) => !sameCoord(tile.at, human.explored[index] ?? BAD_COORD),
    )
  )
    issues.push("HUMAN_EXPLORATION");

  const humanCities = state.cities.filter((city) => city.ownerId === human.id);
  if (
    humanCities.length !== 2 ||
    humanCities.filter((city) => city.isCapital).length !== 1 ||
    humanCities.some(
      (city) =>
        city.level !== 3 ||
        city.population !== 0 ||
        city.rewardLevel2 !== "WORKSHOP" ||
        city.rewardLevel3 !== "CITY_WALL" ||
        cityCapacity(city) !== 3,
    )
  )
    issues.push("HUMAN_CITIES");
  const converted = humanCities.find((city) => !city.isCapital);
  if (
    converted === undefined ||
    state.board.tiles.find((tile) => sameCoord(tile.at, converted.at))?.site !==
      "CITY" ||
    state.board.tiles.some(
      (tile) =>
        tile.territoryCenter !== null &&
        sameCoord(tile.territoryCenter, converted.at) &&
        tile.territoryCityId !== converted.id,
    )
  )
    issues.push("CONVERTED_VILLAGE");

  const humanUnits = state.units.filter((unit) => unit.ownerId === human.id);
  const humanCapital = humanCities.find((city) => city.isCapital);
  const occupied = new Set<string>();
  if (
    humanUnits.length !== 8 ||
    DEMO_UNIT_TYPES.some(
      (type) => humanUnits.filter((unit) => unit.type === type).length !== 2,
    ) ||
    humanUnits.some((unit) => {
      const city = humanCities.find(
        (candidate) => candidate.id === unit.homeCityId,
      );
      const tile = state.board.tiles.find((candidate) =>
        sameCoord(candidate.at, unit.at),
      );
      const key = coordKey(unit.at);
      const invalid =
        city === undefined ||
        tile === undefined ||
        tile.territoryCityId !== city.id ||
        occupied.has(key) ||
        !unit.ready ||
        unit.captureEligible ||
        unit.hp !== unit.maxHp ||
        Object.values(unit.activation).some(Boolean);
      occupied.add(key);
      return invalid;
    }) ||
    humanCities.some(
      (city) =>
        humanUnits.filter((unit) => unit.homeCityId === city.id).length !== 4,
    ) ||
    humanCapital === undefined ||
    cityAssignedCountedUnitCount(state, humanCapital.id) !== 3 ||
    cityAssignedExemptUnitCount(state, humanCapital.id) !== 1 ||
    converted === undefined ||
    cityAssignedCountedUnitCount(state, converted.id) !== 4 ||
    cityAssignedExemptUnitCount(state, converted.id) !== 0
  )
    issues.push("HUMAN_UNITS");

  const aiPlayers = state.players.filter(
    (player) => player.controller === "AI",
  );
  if (
    aiPlayers.length !== 2 ||
    aiPlayers.some(
      (player) =>
        player.stars !== 5 ||
        player.researchedTechs.length !== 0 ||
        player.explored.length !== 25 ||
        state.cities.filter((city) => city.ownerId === player.id).length !==
          1 ||
        state.units.filter((unit) => unit.ownerId === player.id).length !== 1,
    )
  )
    issues.push("AI_PARITY");
  const ids = [...state.cities, ...state.units].map((entity) => entity.id);
  if (
    new Set(ids).size !== ids.length ||
    Math.max(...ids) >= state.nextEntityId ||
    state.commandIndex !== 0 ||
    state.round !== 1 ||
    state.pendingChoice !== null ||
    state.outcome !== null
  )
    issues.push("STATE_INTEGRITY");
  return issues;
}

function demoUnitPositions(
  board: GameState["board"],
  center: Coord,
): readonly Coord[] {
  return [
    center,
    ...board.tiles
      .filter(
        (tile) =>
          tile.territoryCenter !== null &&
          sameCoord(tile.territoryCenter, center) &&
          !sameCoord(tile.at, center),
      )
      .map((tile) => tile.at)
      .sort(compareCoords),
  ].slice(0, 4);
}

function requireSingleHuman(state: GameState): PlayerState {
  const humans = state.players.filter(
    (player) => player.controller === "HUMAN",
  );
  if (humans.length !== 1 || humans[0] === undefined)
    throw new RangeError("Demo scenario requires exactly one human");
  return humans[0];
}

function requireHumanCapital(state: GameState, human: PlayerState): CityState {
  const cities = state.cities.filter(
    (city) => city.ownerId === human.id && city.isCapital,
  );
  if (cities.length !== 1 || cities[0] === undefined)
    throw new RangeError("Demo scenario requires one human capital");
  return cities[0];
}

function chebyshevDistance(left: Coord, right: Coord): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function sameSetup(left: MatchSetup, right: MatchSetup): boolean {
  return (
    left.rulesetId === right.rulesetId &&
    left.seed === right.seed &&
    left.width === right.width &&
    left.height === right.height &&
    left.aiCount === right.aiCount &&
    left.aiDifficulty === right.aiDifficulty &&
    left.aiMode === right.aiMode &&
    left.humanColor === right.humanColor &&
    sameStringArray(left.factions, right.factions) &&
    left.scenario === right.scenario
  );
}

function sameStringArray(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}

function coordKey(coord: Coord): string {
  return `${coord.x},${coord.y}`;
}

const BAD_COORD: Coord = Object.freeze({ x: -1, y: -1 });
