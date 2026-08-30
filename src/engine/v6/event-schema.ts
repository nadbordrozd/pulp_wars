import {
  hasExactKeysV6,
  isDenseArrayV6,
  isNonNegativeSafeIntegerV6,
  isPositiveSafeIntegerV6,
  parseCoordV6,
} from "./commands";
import type { DomainEventV6, EventEnvelopeV6 } from "./events";
import {
  ECONOMIC_IMPROVEMENT_IDS,
  REWARD_IDS_V6,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  type EconomicImprovementId,
  type RewardIdV6,
  type TechnologyId,
  type UnitRoleId,
} from "./types";

export type EventParseResultV6 =
  | { readonly ok: true; readonly value: DomainEventV6 }
  | { readonly ok: false; readonly field: string };

const EVENT_FIELDS = {
  TURN_STARTED: ["kind", "playerId", "coins"],
  INCOME_AWARDED: ["kind", "playerId", "totalCoins", "cities"],
  INCOME_PREVIEWED: ["kind", "playerId", "totalCoins", "cities"],
  TURN_ENDED: ["kind", "playerId"],
  TECH_RESEARCHED: ["kind", "playerId", "tech", "cost"],
  FRUIT_HARVESTED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "cost",
    "permanentPopulationAdded",
  ],
  GAME_HUNTED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "cost",
    "permanentPopulationAdded",
  ],
  ECONOMIC_BUILDING_BUILT: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "improvement",
    "cost",
    "populationContribution",
    "marketIncome",
  ],
  ECONOMIC_BUILDING_REMOVED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "improvement",
    "populationContributionRemoved",
    "marketIncomeRemoved",
  ],
  FOREST_CLEARED: ["kind", "playerId", "cityId", "at", "coinDelta"],
  FOREST_REPLANTED: ["kind", "playerId", "cityId", "at", "coinDelta"],
  ROAD_BUILT: ["kind", "playerId", "cityId", "at", "cost"],
  CITY_ECONOMY_CHANGED: [
    "kind",
    "cityId",
    "economicBefore",
    "economicAfter",
    "populationBefore",
    "populationAfter",
    "marketBefore",
    "marketAfter",
  ],
  CITY_LEVELED_UP: ["kind", "cityId", "level"],
  CITY_REWARD_QUEUED: ["kind", "cityId", "reachedLevel", "candidates"],
  CITY_REWARD_CHOSEN: ["kind", "playerId", "cityId", "reachedLevel", "reward"],
  CITY_TERRITORY_EXPANDED: ["kind", "playerId", "cityId", "tiles"],
  UNIT_TRAINED: ["kind", "playerId", "cityId", "unitId", "role", "cost", "at"],
  UNIT_REWARD_GRANTED: [
    "kind",
    "playerId",
    "cityId",
    "reachedLevel",
    "unitId",
    "role",
  ],
  UNIT_HEALED: ["kind", "medicId", "targetUnitId", "amount", "hpAfter"],
  UNIT_PUSHED: ["kind", "sourceUnitId", "targetUnitId", "from", "to"],
  UNIT_MOVED: ["kind", "unitId", "path"],
  UNIT_MOVE_INTERRUPTED: ["kind", "unitId", "at", "reason"],
  TILES_REVEALED: ["kind", "playerId", "tiles"],
  COMBAT_RESOLVED: ["kind", "preview"],
  DONUT_ROLL_STEP: ["kind", "unitId", "at"],
  ROLL_DAMAGE_RESOLVED: [
    "kind",
    "sourceUnitId",
    "target",
    "at",
    "damage",
    "hpBefore",
    "hpAfter",
  ],
  CHOCOLATE_WALL_BUILT: [
    "kind",
    "playerId",
    "unitId",
    "wallId",
    "at",
    "cost",
    "hp",
  ],
  CHOCOLATE_WALL_DESTROYED: ["kind", "wallId", "ownerId", "at", "cause"],
  CANDIFY_CITY_CHOICE_REQUIRED: [
    "kind",
    "playerId",
    "unitId",
    "candidateCityIds",
  ],
  TILE_CANDIFIED: [
    "kind",
    "playerId",
    "unitId",
    "cityId",
    "at",
    "previousCityId",
    "previousOwnerId",
  ],
  UNIT_RECOVERED: ["kind", "unitId", "amount", "automatic"],
  UNIT_WAITED: ["kind", "playerId", "unitId"],
  UNIT_PROMOTED: ["kind", "unitId", "maxHp"],
  UNIT_DIED: ["kind", "unitId", "cause"],
  CITY_CAPTURED: ["kind", "cityId", "from", "to"],
  PLAYER_ELIMINATED: ["kind", "playerId"],
  MATCH_ENDED: ["kind", "outcome"],
} as const;

type EventKindV6 = keyof typeof EVENT_FIELDS;

export function parseEventEnvelopeV6(
  input: unknown,
):
  | { readonly ok: true; readonly value: EventEnvelopeV6 }
  | { readonly ok: false; readonly field: string } {
  if (
    !hasExactKeysV6(input, ["commandIndex", "events", "format", "version"]) ||
    input.format !== "pulp-wars-events" ||
    input.version !== 6 ||
    !isNonNegativeSafeIntegerV6(input.commandIndex) ||
    !isDenseArrayV6(input.events)
  ) {
    return { ok: false, field: "envelope" };
  }
  const events: DomainEventV6[] = [];
  for (const candidate of input.events) {
    const event = parseEventV6(candidate);
    if (!event.ok) return event;
    events.push(event.value);
  }
  return {
    ok: true,
    value: {
      format: "pulp-wars-events",
      version: 6,
      commandIndex: input.commandIndex,
      events,
    },
  };
}

export function parseEventV6(input: unknown): EventParseResultV6 {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    typeof (input as Record<string, unknown>).kind !== "string"
  ) {
    return invalid("event");
  }
  const record = input as Record<string, unknown>;
  const kind = record.kind as EventKindV6;
  const fields = EVENT_FIELDS[kind];
  if (fields === undefined || !hasExactKeysV6(record, fields))
    return invalid("event.kind");
  if (!eventPayloadIsValid(kind, record)) return invalid(kind);
  return { ok: true, value: record as unknown as DomainEventV6 };
}

function eventPayloadIsValid(
  kind: EventKindV6,
  event: Record<string, unknown>,
): boolean {
  switch (kind) {
    case "TURN_STARTED":
      return isId(event.playerId) && isNonNegativeSafeIntegerV6(event.coins);
    case "INCOME_AWARDED":
    case "INCOME_PREVIEWED":
      return (
        isId(event.playerId) &&
        isNonNegativeSafeIntegerV6(event.totalCoins) &&
        isIncomeEntries(event.cities)
      );
    case "TURN_ENDED":
    case "PLAYER_ELIMINATED":
      return isId(event.playerId);
    case "TECH_RESEARCHED":
      return (
        isId(event.playerId) &&
        TECHNOLOGY_IDS.includes(event.tech as TechnologyId) &&
        isNonNegativeSafeIntegerV6(event.cost)
      );
    case "FRUIT_HARVESTED":
    case "GAME_HUNTED":
      return (
        commonPlayerCityAt(event) &&
        event.cost === 2 &&
        event.permanentPopulationAdded === 1
      );
    case "ECONOMIC_BUILDING_BUILT":
      return (
        commonPlayerCityAt(event) &&
        isImprovement(event.improvement) &&
        event.cost ===
          improvementCost(event.improvement as EconomicImprovementId) &&
        isNonNegativeSafeIntegerV6(event.populationContribution) &&
        isNonNegativeSafeIntegerV6(event.marketIncome)
      );
    case "ECONOMIC_BUILDING_REMOVED":
      return (
        commonPlayerCityAt(event) &&
        isImprovement(event.improvement) &&
        isNonNegativeSafeIntegerV6(event.populationContributionRemoved) &&
        isNonNegativeSafeIntegerV6(event.marketIncomeRemoved)
      );
    case "FOREST_CLEARED":
      return commonPlayerCityAt(event) && event.coinDelta === 1;
    case "FOREST_REPLANTED":
      return commonPlayerCityAt(event) && event.coinDelta === 0;
    case "ROAD_BUILT":
      return commonPlayerCityAt(event) && event.cost === 2;
    case "CITY_ECONOMY_CHANGED":
      return (
        isId(event.cityId) &&
        isNonNegativeSafeIntegerV6(event.economicBefore) &&
        isNonNegativeSafeIntegerV6(event.economicAfter) &&
        isSafeInteger(event.populationBefore) &&
        isSafeInteger(event.populationAfter) &&
        isNonNegativeSafeIntegerV6(event.marketBefore) &&
        isNonNegativeSafeIntegerV6(event.marketAfter)
      );
    case "CITY_LEVELED_UP":
      return isId(event.cityId) && isPositiveSafeIntegerV6(event.level);
    case "CITY_REWARD_QUEUED":
      return (
        isId(event.cityId) &&
        isPositiveSafeIntegerV6(event.reachedLevel) &&
        isOrderedRewards(event.candidates) &&
        candidatesMatchLevel(
          event.candidates as readonly RewardIdV6[],
          event.reachedLevel,
        )
      );
    case "CITY_REWARD_CHOSEN":
      return (
        isId(event.playerId) &&
        isId(event.cityId) &&
        isPositiveSafeIntegerV6(event.reachedLevel) &&
        REWARD_IDS_V6.includes(event.reward as RewardIdV6) &&
        rewardMatchesLevel(event.reward as RewardIdV6, event.reachedLevel)
      );
    case "CITY_TERRITORY_EXPANDED":
      return (
        isId(event.playerId) &&
        isId(event.cityId) &&
        isSortedCoords(event.tiles)
      );
    case "UNIT_TRAINED":
      return (
        isId(event.playerId) &&
        isId(event.cityId) &&
        isId(event.unitId) &&
        isRole(event.role) &&
        isNonNegativeSafeIntegerV6(event.cost) &&
        parseCoordV6(event.at) !== null
      );
    case "UNIT_REWARD_GRANTED":
      return (
        isId(event.playerId) &&
        isId(event.cityId) &&
        isPositiveSafeIntegerV6(event.reachedLevel) &&
        isId(event.unitId) &&
        isRole(event.role) &&
        ((event.reachedLevel === 3 && event.role === "FIGHTER") ||
          (event.reachedLevel >= 5 && event.role === "JUGGERNAUT"))
      );
    case "UNIT_HEALED":
      return (
        isId(event.medicId) &&
        isId(event.targetUnitId) &&
        isPositiveSafeIntegerV6(event.amount) &&
        isPositiveSafeIntegerV6(event.hpAfter)
      );
    case "UNIT_PUSHED":
      return (
        isId(event.sourceUnitId) &&
        isId(event.targetUnitId) &&
        parseCoordV6(event.from) !== null &&
        parseCoordV6(event.to) !== null
      );
    case "UNIT_MOVED":
      return isId(event.unitId) && isCoordArray(event.path);
    case "UNIT_MOVE_INTERRUPTED":
      return (
        isId(event.unitId) &&
        parseCoordV6(event.at) !== null &&
        (event.reason === "OCCUPIED" ||
          event.reason === "SURVEYING_REQUIRED" ||
          event.reason === "ZOC")
      );
    case "TILES_REVEALED":
      return isId(event.playerId) && isSortedCoords(event.tiles);
    case "COMBAT_RESOLVED":
      return isCombatPreview(event.preview);
    case "DONUT_ROLL_STEP":
      return isId(event.unitId) && parseCoordV6(event.at) !== null;
    case "ROLL_DAMAGE_RESOLVED":
      return (
        isId(event.sourceUnitId) &&
        isCombatTarget(event.target) &&
        parseCoordV6(event.at) !== null &&
        [event.damage, event.hpBefore, event.hpAfter].every(
          isNonNegativeSafeIntegerV6,
        )
      );
    case "CHOCOLATE_WALL_BUILT":
      return (
        isId(event.playerId) &&
        isId(event.unitId) &&
        isId(event.wallId) &&
        parseCoordV6(event.at) !== null &&
        event.cost === 1 &&
        event.hp === 10
      );
    case "CHOCOLATE_WALL_DESTROYED":
      return (
        isId(event.wallId) &&
        isId(event.ownerId) &&
        parseCoordV6(event.at) !== null &&
        (event.cause === "ATTACK" || event.cause === "KAMIKAZE_ROLL")
      );
    case "CANDIFY_CITY_CHOICE_REQUIRED":
      return (
        isId(event.playerId) &&
        isId(event.unitId) &&
        isAscendingIds(event.candidateCityIds, true)
      );
    case "TILE_CANDIFIED":
      return (
        isId(event.playerId) &&
        isId(event.unitId) &&
        isId(event.cityId) &&
        parseCoordV6(event.at) !== null &&
        isNullableId(event.previousCityId) &&
        isNullableId(event.previousOwnerId)
      );
    case "UNIT_RECOVERED":
      return (
        isId(event.unitId) &&
        isPositiveSafeIntegerV6(event.amount) &&
        typeof event.automatic === "boolean"
      );
    case "UNIT_WAITED":
      return isId(event.playerId) && isId(event.unitId);
    case "UNIT_PROMOTED":
      return isId(event.unitId) && isPositiveSafeIntegerV6(event.maxHp);
    case "UNIT_DIED":
      return (
        isId(event.unitId) &&
        [
          "ATTACK",
          "RETALIATION",
          "ELIMINATION",
          "KAMIKAZE_ROLL",
          "KAMIKAZE_ROLL_SELF",
          "CANDIFY",
        ].includes(event.cause as string)
      );
    case "CITY_CAPTURED":
      return isId(event.cityId) && isNullableId(event.from) && isId(event.to);
    case "MATCH_ENDED":
      return isOutcome(event.outcome);
  }
}

function commonPlayerCityAt(event: Record<string, unknown>): boolean {
  return (
    isId(event.playerId) &&
    isId(event.cityId) &&
    parseCoordV6(event.at) !== null
  );
}

function isIncomeEntries(input: unknown): boolean {
  if (!isDenseArrayV6(input)) return false;
  let previous = 0;
  for (const candidate of input) {
    if (
      !hasExactKeysV6(candidate, ["cityId", "coins"]) ||
      !isId(candidate.cityId) ||
      candidate.cityId <= previous ||
      !isNonNegativeSafeIntegerV6(candidate.coins)
    )
      return false;
    previous = candidate.cityId;
  }
  return true;
}

function isCombatPreview(input: unknown): boolean {
  if (
    !hasExactKeysV6(input, [
      "advances",
      "attackerDies",
      "attackerId",
      "damageToAttacker",
      "damageToDefender",
      "defenderDies",
      "noRetaliationReason",
      "target",
    ])
  )
    return false;
  return (
    isId(input.attackerId) &&
    isCombatTarget(input.target) &&
    isNonNegativeSafeIntegerV6(input.damageToAttacker) &&
    isNonNegativeSafeIntegerV6(input.damageToDefender) &&
    typeof input.defenderDies === "boolean" &&
    typeof input.attackerDies === "boolean" &&
    typeof input.advances === "boolean" &&
    (input.noRetaliationReason === null ||
      [
        "DEFENDER_DIED",
        "OUT_OF_RANGE",
        "ATTACKER_UNEXPLORED",
        "STRUCTURE",
      ].includes(input.noRetaliationReason as string))
  );
}

function isCombatTarget(input: unknown): boolean {
  return (
    (hasExactKeysV6(input, ["kind", "unitId"]) &&
      input.kind === "UNIT" &&
      isId(input.unitId)) ||
    (hasExactKeysV6(input, ["kind", "wallId"]) &&
      input.kind === "CHOCOLATE_WALL" &&
      isId(input.wallId))
  );
}

function isOutcome(input: unknown): boolean {
  return (
    (hasExactKeysV6(input, ["kind", "winnerId"]) &&
      (input.kind === "VICTORY" || input.kind === "HEADLESS_VICTORY") &&
      isId(input.winnerId)) ||
    (hasExactKeysV6(input, ["kind", "humanId", "defeatedByPlayerId"]) &&
      input.kind === "DEFEAT" &&
      isId(input.humanId) &&
      isId(input.defeatedByPlayerId))
  );
}

function isCoordArray(input: unknown): boolean {
  return (
    isDenseArrayV6(input) &&
    input.every((candidate) => parseCoordV6(candidate) !== null)
  );
}

function isSortedCoords(input: unknown): boolean {
  if (!isDenseArrayV6(input)) return false;
  let previous: { readonly x: number; readonly y: number } | undefined;
  for (const candidate of input) {
    const at = parseCoordV6(candidate);
    if (
      at === null ||
      (previous !== undefined &&
        (previous.y > at.y || (previous.y === at.y && previous.x >= at.x)))
    )
      return false;
    previous = at;
  }
  return true;
}

function isOrderedRewards(input: unknown): boolean {
  if (!isDenseArrayV6(input) || input.length !== 2) return false;
  const first = REWARD_IDS_V6.indexOf(input[0] as RewardIdV6);
  const second = REWARD_IDS_V6.indexOf(input[1] as RewardIdV6);
  return first >= 0 && second > first;
}

function candidatesMatchLevel(
  rewards: readonly RewardIdV6[],
  level: unknown,
): boolean {
  if (!isPositiveSafeIntegerV6(level)) return false;
  const expected =
    level === 2
      ? (["SURVEY", "STOCKPILE"] as const)
      : level === 3
        ? (["WALLS", "MILITIA"] as const)
        : level === 4
          ? (["EXPAND", "BOOM"] as const)
          : level >= 5
            ? (["JUGGERNAUT", "TREASURY"] as const)
            : null;
  return (
    expected !== null &&
    rewards[0] === expected[0] &&
    rewards[1] === expected[1]
  );
}

function rewardMatchesLevel(reward: RewardIdV6, level: unknown): boolean {
  if (!isPositiveSafeIntegerV6(level)) return false;
  if (level === 2) return reward === "SURVEY" || reward === "STOCKPILE";
  if (level === 3) return reward === "WALLS" || reward === "MILITIA";
  if (level === 4) return reward === "EXPAND" || reward === "BOOM";
  return level >= 5 && (reward === "JUGGERNAUT" || reward === "TREASURY");
}

function improvementCost(improvement: EconomicImprovementId): number {
  switch (improvement) {
    case "FARM":
    case "MINE":
    case "WINDMILL":
    case "SAWMILL":
    case "FORGE":
    case "STONEWORKS":
      return 5;
    case "LUMBER_CAMP":
      return 3;
    case "QUARRY":
    case "WORKSHOP":
      return 4;
    case "GRAND_WORKS":
    case "MARKET":
      return 7;
  }
}

function isAscendingIds(input: unknown, nonempty = false): boolean {
  if (!isDenseArrayV6(input) || (nonempty && input.length === 0)) return false;
  let previous = 0;
  for (const candidate of input) {
    if (!isId(candidate) || candidate <= previous) return false;
    previous = candidate;
  }
  return true;
}

function isImprovement(input: unknown): input is EconomicImprovementId {
  return ECONOMIC_IMPROVEMENT_IDS.includes(input as EconomicImprovementId);
}

function isRole(input: unknown): input is UnitRoleId {
  return UNIT_ROLE_IDS.includes(input as UnitRoleId);
}

function isId(input: unknown): input is number {
  return isPositiveSafeIntegerV6(input);
}

function isNullableId(input: unknown): boolean {
  return input === null || isId(input);
}

function isSafeInteger(input: unknown): input is number {
  return typeof input === "number" && Number.isSafeInteger(input);
}

function invalid(field: string): EventParseResultV6 {
  return { ok: false, field };
}
