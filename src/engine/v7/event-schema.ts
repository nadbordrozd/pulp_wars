import type {
  DomainEventV7,
  EventEnvelopeV7,
  PlayerEventEnvelopeV7,
  PlayerEventV7,
} from "./events";
import {
  ACHIEVEMENT_IDS_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  IMPROVEMENT_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type DomainEventKindV7,
  type ImprovementIdV7,
  type RewardIdV7,
  type UnitRoleIdV7,
} from "./types";
import {
  hasExactKeysV7,
  isDenseArrayV7,
  isNonNegativeSafeIntegerV7,
  isPositiveSafeIntegerV7,
  isSafeIntegerV7,
  parseCoordV7,
} from "./schema";

const FIELDS: Readonly<Record<DomainEventKindV7, readonly string[]>> = {
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
  FISH_HARVESTED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "cost",
    "permanentPopulationAdded",
  ],
  PEARLS_GATHERED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "cost",
    "coinsReceived",
    "coinDelta",
  ],
  PORT_BUILT: ["kind", "playerId", "cityId", "at", "cost", "populationAdded"],
  SHIPYARD_BUILT: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "cost",
    "populationAdded",
    "livePopulationTotal",
  ],
  PORT_BLOCKADE_CHANGED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "activeBefore",
    "activeAfter",
  ],
  SEA_NETWORK_CHANGED: [
    "kind",
    "playerId",
    "networkCityIdsBefore",
    "networkCityIdsAfter",
    "tradeCityIdsBefore",
    "tradeCityIdsAfter",
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
    "resourceRestored",
  ],
  FOREST_CLEARED: ["kind", "playerId", "cityId", "at", "coinDelta"],
  FOREST_REPLANTED: ["kind", "playerId", "cityId", "at", "coinDelta"],
  FOREST_CULTIVATED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "cost",
    "terrainBefore",
    "terrainAfter",
    "resourceBefore",
    "resourceAfter",
  ],
  MOUNTAIN_BLASTED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "cost",
    "terrainBefore",
    "terrainAfter",
    "resourceBefore",
    "resourceAfter",
  ],
  ROAD_BUILT: ["kind", "playerId", "cityId", "at", "cost"],
  FIELD_DEFENSE_BUILT: ["kind", "playerId", "unitId", "at", "cost"],
  FIELD_DEFENSE_DESTROYED: ["kind", "at", "reason"],
  LAND_GRANTED: ["kind", "playerId", "cityId", "cost", "tiles"],
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
  CITY_REWARD_CHOSEN: [
    "kind",
    "playerId",
    "cityId",
    "reachedLevel",
    "reward",
    "coinDelta",
  ],
  CITY_REWARD_AUTOMATICALLY_GRANTED: [
    "kind",
    "playerId",
    "cityId",
    "reachedLevel",
    "reward",
    "coins",
  ],
  CITY_TERRITORY_EXPANDED: ["kind", "playerId", "cityId", "tiles"],
  ACHIEVEMENT_UNLOCKED: ["kind", "playerId", "achievement"],
  MONUMENT_BUILT: [
    "kind",
    "playerId",
    "cityId",
    "achievement",
    "at",
    "populationAdded",
  ],
  UNIT_TRAINED: ["kind", "playerId", "cityId", "unitId", "role", "cost", "at"],
  NAVAL_UNIT_TRAINED: [
    "kind",
    "playerId",
    "cityId",
    "unitId",
    "role",
    "cost",
    "at",
    "dock",
    "discountSource",
  ],
  UNIT_EMBARKED: ["kind", "playerId", "unitId", "passengerRole", "from", "to"],
  UNIT_DISEMBARKED: [
    "kind",
    "playerId",
    "unitId",
    "passengerRole",
    "from",
    "to",
  ],
  UNIT_REWARD_GRANTED: [
    "kind",
    "playerId",
    "cityId",
    "reachedLevel",
    "unitId",
    "role",
  ],
  UNIT_SPAWN_DISPLACED: [
    "kind",
    "playerId",
    "cityId",
    "spawnedUnitId",
    "displacedUnitId",
    "from",
    "to",
  ],
  UNITS_RALLIED: ["kind", "captainId", "unitIds"],
  WOUNDED_TENDED: ["kind", "captainId", "results"],
  UNIT_PUSHED: ["kind", "sourceUnitId", "targetUnitId", "from", "to"],
  UNIT_MOVED: ["kind", "unitId", "path"],
  UNIT_MOVE_INTERRUPTED: ["kind", "unitId", "at", "reason"],
  TILES_REVEALED: ["kind", "playerId", "tiles"],
  COMBAT_RESOLVED: ["kind", "preview"],
  IMPROVEMENT_PILLAGED: [
    "kind",
    "playerId",
    "unitId",
    "cityId",
    "at",
    "improvement",
    "resourceRestored",
    "coinDelta",
  ],
  UNIT_DISBANDED: ["kind", "playerId", "unitId", "role", "coinDelta"],
  SPOILS_AWARDED: ["kind", "playerId", "cityId", "coins"],
  UNIT_RECOVERED: ["kind", "unitId", "amount", "automatic"],
  UNIT_WAITED: ["kind", "playerId", "unitId"],
  UNIT_PROMOTED: ["kind", "unitId", "maxHp"],
  UNIT_DIED: ["kind", "unitId", "cause"],
  CITY_CAPTURED: ["kind", "cityId", "from", "to"],
  TREASURE_CAPTURED: [
    "kind",
    "playerId",
    "unitId",
    "at",
    "requestedReward",
    "grantedReward",
    "coinDelta",
    "knightFallback",
    "spawnedUnitId",
    "spawnedAt",
    "homeCityId",
  ],
  PLAYER_ELIMINATED: ["kind", "playerId"],
  MATCH_ENDED: ["kind", "outcome"],
};

export function parseEventEnvelopeV7(
  input: unknown,
):
  | { readonly ok: true; readonly value: EventEnvelopeV7 }
  | { readonly ok: false; readonly field: string } {
  if (
    !hasExactKeysV7(input, ["commandIndex", "events", "format", "version"]) ||
    input.format !== "pulp-wars-events" ||
    input.version !== 7 ||
    !isNonNegativeSafeIntegerV7(input.commandIndex) ||
    !isDenseArrayV7(input.events)
  )
    return bad("envelope");
  const events: DomainEventV7[] = [];
  for (const candidate of input.events) {
    const parsed = parseEventV7(candidate);
    if (!parsed.ok) return parsed;
    events.push(parsed.value);
  }
  return {
    ok: true,
    value: {
      format: "pulp-wars-events",
      version: 7,
      commandIndex: input.commandIndex,
      events,
    },
  };
}

function parseProjectedMonumentBuilt(input: unknown): PlayerEventV7 | null {
  if (
    hasExactKeysV7(input, [
      "achievement",
      "at",
      "cityId",
      "kind",
      "playerId",
      "populationAdded",
      "visibility",
    ]) &&
    input.kind === "MONUMENT_BUILT" &&
    input.visibility === "FULL" &&
    id(input.playerId) &&
    id(input.cityId) &&
    ACHIEVEMENT_IDS_V7.includes(input.achievement as never) &&
    parseCoordV7(input.at) !== null &&
    input.populationAdded === 3
  )
    return input as PlayerEventV7;
  if (
    hasExactKeysV7(input, [
      "at",
      "cityId",
      "kind",
      "populationAdded",
      "visibility",
    ]) &&
    input.kind === "MONUMENT_BUILT" &&
    input.visibility === "BUILDING_ONLY" &&
    id(input.cityId) &&
    parseCoordV7(input.at) !== null &&
    input.populationAdded === 3
  )
    return input as PlayerEventV7;
  return null;
}

export function parsePlayerEventEnvelopeV7(
  input: unknown,
):
  | { readonly ok: true; readonly value: PlayerEventEnvelopeV7 }
  | { readonly ok: false; readonly field: string } {
  if (
    !hasExactKeysV7(input, [
      "commandIndex",
      "events",
      "format",
      "version",
      "viewerId",
    ]) ||
    input.format !== "pulp-wars-player-events" ||
    input.version !== 7 ||
    !isPositiveSafeIntegerV7(input.viewerId) ||
    !isNonNegativeSafeIntegerV7(input.commandIndex) ||
    !isDenseArrayV7(input.events)
  )
    return bad("envelope");
  const events: PlayerEventV7[] = [];
  for (const candidate of input.events) {
    const monument = parseProjectedMonumentBuilt(candidate);
    if (monument !== null) {
      events.push(monument);
      continue;
    }
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      !Array.isArray(candidate) &&
      (candidate as Record<string, unknown>).kind === "MONUMENT_BUILT"
    )
      return bad("MONUMENT_BUILT");
    const projectedRestoration = parseProjectedRestorationEvent(candidate);
    if (projectedRestoration !== null) {
      events.push(projectedRestoration);
      continue;
    }
    const presentation = parsePresentationEvent(candidate);
    if (presentation !== null) {
      events.push(presentation);
      continue;
    }
    const canonical = parseEventV7(candidate);
    if (!canonical.ok) return canonical;
    if (canonical.value.kind === "MONUMENT_BUILT") return bad("MONUMENT_BUILT");
    events.push(canonical.value);
  }
  return {
    ok: true,
    value: {
      format: "pulp-wars-player-events",
      version: 7,
      viewerId: input.viewerId as PlayerEventEnvelopeV7["viewerId"],
      commandIndex: input.commandIndex,
      events,
    },
  };
}

function parseProjectedRestorationEvent(input: unknown): PlayerEventV7 | null {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !("resourceRestored" in input) ||
    (input.resourceRestored !== "UNKNOWN_RESOURCE" &&
      input.resourceRestored !== null) ||
    !("kind" in input) ||
    (input.kind !== "ECONOMIC_BUILDING_REMOVED" &&
      input.kind !== "IMPROVEMENT_PILLAGED")
  )
    return null;
  const canonical = parseEventV7({
    ...input,
    resourceRestored: expectedRestoredResource(
      "improvement" in input ? (input.improvement as ImprovementIdV7) : null,
    ),
  });
  return canonical.ok ? (input as PlayerEventV7) : null;
}

function parsePresentationEvent(input: unknown): PlayerEventV7 | null {
  if (
    hasExactKeysV7(input, ["at", "kind", "reason", "unitId"]) &&
    input.kind === "UNIT_REVEALED" &&
    isPositiveSafeIntegerV7(input.unitId) &&
    parseCoordV7(input.at) !== null &&
    typeof input.reason === "string" &&
    input.reason.length > 0
  ) {
    return input as unknown as PlayerEventV7;
  }
  if (
    hasExactKeysV7(input, ["kind", "lastSeenAt", "unitId"]) &&
    input.kind === "UNIT_CONCEALED" &&
    isPositiveSafeIntegerV7(input.unitId) &&
    parseCoordV7(input.lastSeenAt) !== null
  ) {
    return input as unknown as PlayerEventV7;
  }
  return null;
}

export function parseEventV7(
  input: unknown,
):
  | { readonly ok: true; readonly value: DomainEventV7 }
  | { readonly ok: false; readonly field: string } {
  if (typeof input !== "object" || input === null || Array.isArray(input))
    return bad("event");
  const event = input as Record<string, unknown>;
  const kind = event.kind as DomainEventKindV7;
  if (
    !DOMAIN_EVENT_KIND_ORDER_V7.includes(kind) ||
    !hasExactKeysV7(event, FIELDS[kind] ?? [])
  )
    return bad("event.kind");
  return validPayload(kind, event)
    ? { ok: true, value: event as unknown as DomainEventV7 }
    : bad(kind);
}

function validPayload(
  kind: DomainEventKindV7,
  e: Record<string, unknown>,
): boolean {
  switch (kind) {
    case "TURN_STARTED":
      return id(e.playerId) && nn(e.coins);
    case "INCOME_AWARDED":
    case "INCOME_PREVIEWED":
      return id(e.playerId) && nn(e.totalCoins) && income(e.cities);
    case "TURN_ENDED":
    case "PLAYER_ELIMINATED":
      return id(e.playerId);
    case "TECH_RESEARCHED":
      return (
        id(e.playerId) &&
        TECHNOLOGY_IDS_V7.includes(e.tech as never) &&
        nn(e.cost)
      );
    case "FRUIT_HARVESTED":
    case "GAME_HUNTED":
    case "FISH_HARVESTED":
      return (
        playerCityAt(e) && e.cost === 2 && e.permanentPopulationAdded === 1
      );
    case "PEARLS_GATHERED":
      return (
        playerCityAt(e) &&
        e.cost === 2 &&
        e.coinsReceived === 4 &&
        e.coinDelta === 2
      );
    case "PORT_BUILT":
      return playerCityAt(e) && e.cost === 4 && e.populationAdded === 1;
    case "SHIPYARD_BUILT":
      return (
        playerCityAt(e) &&
        e.cost === 5 &&
        e.populationAdded === 1 &&
        e.livePopulationTotal === 2
      );
    case "PORT_BLOCKADE_CHANGED":
      return (
        playerCityAt(e) &&
        (e.activeBefore === null || typeof e.activeBefore === "boolean") &&
        (e.activeAfter === null || typeof e.activeAfter === "boolean") &&
        e.activeBefore !== e.activeAfter
      );
    case "SEA_NETWORK_CHANGED":
      return (
        id(e.playerId) &&
        [
          e.networkCityIdsBefore,
          e.networkCityIdsAfter,
          e.tradeCityIdsBefore,
          e.tradeCityIdsAfter,
        ].every(
          (values) =>
            isDenseArrayV7(values) &&
            values.every(id) &&
            values.every(
              (value, index) =>
                index === 0 || Number(values[index - 1]) < Number(value),
            ),
        )
      );
    case "ECONOMIC_BUILDING_BUILT":
      return (
        playerCityAt(e) &&
        IMPROVEMENT_IDS_V7.includes(e.improvement as never) &&
        e.improvement !== "MONUMENT" &&
        e.cost === improvementCost(e.improvement as ImprovementIdV7) &&
        [e.populationContribution, e.marketIncome].every(nn)
      );
    case "ECONOMIC_BUILDING_REMOVED":
      return (
        playerCityAt(e) &&
        IMPROVEMENT_IDS_V7.includes(e.improvement as never) &&
        [e.populationContributionRemoved, e.marketIncomeRemoved].every(nn) &&
        restoredResource(e.resourceRestored, e.improvement as ImprovementIdV7)
      );
    case "FOREST_CLEARED":
      return playerCityAt(e) && e.coinDelta === 1;
    case "FOREST_REPLANTED":
      return playerCityAt(e) && e.coinDelta === 0;
    case "FOREST_CULTIVATED":
      return (
        playerCityAt(e) &&
        e.cost === 4 &&
        e.terrainBefore === "FOREST" &&
        e.terrainAfter === "GRASS" &&
        e.resourceBefore === null &&
        e.resourceAfter === "FERTILE_GROUND"
      );
    case "MOUNTAIN_BLASTED":
      return (
        playerCityAt(e) &&
        e.cost === 3 &&
        e.terrainBefore === "MOUNTAIN" &&
        e.terrainAfter === "GRASS" &&
        e.resourceBefore === null &&
        e.resourceAfter === null
      );
    case "ROAD_BUILT":
      return (
        id(e.playerId) &&
        (e.cityId === null || id(e.cityId)) &&
        parseCoordV7(e.at) !== null &&
        e.cost === 2
      );
    case "FIELD_DEFENSE_BUILT":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        e.cost === 3
      );
    case "FIELD_DEFENSE_DESTROYED":
      return (
        parseCoordV7(e.at) !== null &&
        ["CATAPULT", "INSPIRED", "EXPLOSIVES", "OCCUPATION"].includes(
          e.reason as string,
        )
      );
    case "LAND_GRANTED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        e.cost === 6 &&
        Array.isArray(e.tiles) &&
        e.tiles.length > 0 &&
        sortedCoords(e.tiles)
      );
    case "CITY_ECONOMY_CHANGED":
      return (
        id(e.cityId) &&
        [
          e.economicBefore,
          e.economicAfter,
          e.marketBefore,
          e.marketAfter,
        ].every(nn) &&
        isSafeIntegerV7(e.populationBefore) &&
        isSafeIntegerV7(e.populationAfter)
      );
    case "CITY_LEVELED_UP":
      return id(e.cityId) && pos(e.level);
    case "CITY_REWARD_QUEUED":
      return (
        id(e.cityId) &&
        pos(e.reachedLevel) &&
        rewards(e.candidates, e.reachedLevel as number)
      );
    case "CITY_REWARD_CHOSEN":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        pos(e.reachedLevel) &&
        REWARD_IDS_V7.includes(e.reward as never) &&
        rewardMatches(e.reward as RewardIdV7, e.reachedLevel as number) &&
        e.coinDelta ===
          (e.reward === "STOCKPILE"
            ? 4
            : e.reward === "TREASURY"
              ? 12
              : e.reward === "TREASURY_8"
                ? 8
                : 0)
      );
    case "CITY_REWARD_AUTOMATICALLY_GRANTED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        pos(e.reachedLevel) &&
        (e.reachedLevel as number) >= 5 &&
        e.reward === "TREASURY" &&
        e.coins === 12
      );
    case "CITY_TERRITORY_EXPANDED":
      return id(e.playerId) && id(e.cityId) && sortedCoords(e.tiles);
    case "ACHIEVEMENT_UNLOCKED":
      return (
        id(e.playerId) && ACHIEVEMENT_IDS_V7.includes(e.achievement as never)
      );
    case "MONUMENT_BUILT":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        ACHIEVEMENT_IDS_V7.includes(e.achievement as never) &&
        parseCoordV7(e.at) !== null &&
        e.populationAdded === 3
      );
    case "UNIT_TRAINED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        (e.cost === trainingCost(e.role as UnitRoleIdV7) ||
          e.cost === Math.max(1, trainingCost(e.role as UnitRoleIdV7) - 1)) &&
        parseCoordV7(e.at) !== null
      );
    case "NAVAL_UNIT_TRAINED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        id(e.unitId) &&
        (e.role === "PATROL_BOAT" || e.role === "BATTLESHIP") &&
        (e.cost === trainingCost(e.role) ||
          e.cost === Math.max(1, trainingCost(e.role) - 2)) &&
        (e.dock === "PORT" || e.dock === "SHIPYARD") &&
        e.discountSource === (e.dock === "SHIPYARD" ? "SHIPYARD" : null) &&
        e.cost ===
          Math.max(1, trainingCost(e.role) - (e.dock === "SHIPYARD" ? 2 : 0)) &&
        parseCoordV7(e.at) !== null
      );
    case "UNIT_EMBARKED":
    case "UNIT_DISEMBARKED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.passengerRole as never) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "UNIT_REWARD_GRANTED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        pos(e.reachedLevel) &&
        id(e.unitId) &&
        ((e.reachedLevel === 3 && e.role === "FIGHTER") ||
          ((e.reachedLevel as number) >= 5 && e.role === "JUGGERNAUT"))
      );
    case "UNIT_SPAWN_DISPLACED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        id(e.spawnedUnitId) &&
        id(e.displacedUnitId) &&
        e.spawnedUnitId !== e.displacedUnitId &&
        parseCoordV7(e.from) !== null &&
        (e.to === null || parseCoordV7(e.to) !== null)
      );
    case "UNITS_RALLIED":
      return id(e.captainId) && orderedIds(e.unitIds);
    case "WOUNDED_TENDED":
      return id(e.captainId) && tendResults(e.results);
    case "UNIT_PUSHED":
      return (
        id(e.sourceUnitId) &&
        id(e.targetUnitId) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "UNIT_MOVED":
      return id(e.unitId) && coords(e.path);
    case "UNIT_MOVE_INTERRUPTED":
      return (
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        ["OCCUPIED", "ENGINEERING_REQUIRED", "ZOC"].includes(e.reason as string)
      );
    case "TILES_REVEALED":
      return id(e.playerId) && sortedCoords(e.tiles);
    case "COMBAT_RESOLVED":
      return combat(e.preview);
    case "IMPROVEMENT_PILLAGED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.cityId) &&
        parseCoordV7(e.at) !== null &&
        IMPROVEMENT_IDS_V7.includes(e.improvement as never) &&
        restoredResource(
          e.resourceRestored,
          e.improvement as ImprovementIdV7,
        ) &&
        e.coinDelta === 1
      );
    case "UNIT_DISBANDED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        e.role !== "JUGGERNAUT" &&
        e.coinDelta === Math.floor(trainingCost(e.role as UnitRoleIdV7) / 2)
      );
    case "SPOILS_AWARDED":
      return id(e.playerId) && id(e.cityId) && e.coins === 2;
    case "UNIT_RECOVERED":
      return id(e.unitId) && pos(e.amount) && typeof e.automatic === "boolean";
    case "UNIT_WAITED":
      return id(e.playerId) && id(e.unitId);
    case "UNIT_PROMOTED":
      return id(e.unitId) && pos(e.maxHp);
    case "UNIT_DIED":
      return (
        id(e.unitId) &&
        ["ATTACK", "SPLASH", "RETALIATION", "ELIMINATION"].includes(
          e.cause as string,
        )
      );
    case "CITY_CAPTURED":
      return id(e.cityId) && (e.from === null || id(e.from)) && id(e.to);
    case "TREASURE_CAPTURED":
      return treasure(e);
    case "MATCH_ENDED":
      return outcome(e.outcome);
  }
}

function combat(input: unknown): boolean {
  if (
    !hasExactKeysV7(input, [
      "advances",
      "attack2",
      "attackerDies",
      "attackerId",
      "breachApplied",
      "chargeApplied",
      "inspiredApplied",
      "inspiredConsumed",
      "damageToAttacker",
      "damageToDefender",
      "defense2",
      "defenseBonusDenominator",
      "defenseBonusNumerator",
      "fortificationLevel",
      "defenderDies",
      "attacksRemaining",
      "attacksUsed",
      "maximumRange",
      "minimumRange",
      "noRetaliationReason",
      "overrunAdvance",
      "overrunContinues",
      "push",
      "retaliation",
      "splash",
      "targetUnitId",
    ])
  )
    return false;
  return (
    id(input.attackerId) &&
    id(input.targetUnitId) &&
    [
      input.attack2,
      input.defense2,
      input.defenseBonusNumerator,
      input.defenseBonusDenominator,
      input.minimumRange,
      input.maximumRange,
    ].every(pos) &&
    isPositiveSafeIntegerV7(input.attacksUsed) &&
    (input.attacksRemaining === 0 || input.attacksRemaining === 1) &&
    input.overrunContinues === (input.attacksRemaining === 1) &&
    (!input.overrunContinues ||
      (input.overrunAdvance === true &&
        input.advances === true &&
        input.defenderDies === true &&
        input.attackerDies === false)) &&
    [input.damageToAttacker, input.damageToDefender].every(nn) &&
    nn(input.fortificationLevel) &&
    splash(input.splash) &&
    [
      input.chargeApplied,
      input.inspiredApplied,
      input.inspiredConsumed,
      input.breachApplied,
      input.defenderDies,
      input.attackerDies,
      input.retaliation,
      input.advances,
      input.overrunAdvance,
      input.overrunContinues,
    ].every((item) => typeof item === "boolean") &&
    ["WILL_PUSH", "BLOCKED", "UNKNOWN_BEHIND_FOG"].includes(
      input.push as string,
    ) &&
    (input.noRetaliationReason === null ||
      ["DEFENDER_DIED", "OUT_OF_RANGE"].includes(
        input.noRetaliationReason as string,
      ))
  );
}
function splash(input: unknown): boolean {
  if (!isDenseArrayV7(input)) return false;
  let previous: { x: number; y: number; unitId: number } | null = null;
  const ids = new Set<number>();
  for (const entry of input) {
    if (
      !hasExactKeysV7(entry, ["at", "damage", "dies", "unitId"]) ||
      !id(entry.unitId) ||
      !pos(entry.damage) ||
      typeof entry.dies !== "boolean"
    )
      return false;
    const at = parseCoordV7(entry.at);
    if (at === null || ids.has(entry.unitId as number)) return false;
    const current = { ...at, unitId: entry.unitId as number };
    if (
      previous !== null &&
      (current.y < previous.y ||
        (current.y === previous.y && current.x < previous.x) ||
        (current.y === previous.y &&
          current.x === previous.x &&
          current.unitId <= previous.unitId))
    )
      return false;
    ids.add(current.unitId);
    previous = current;
  }
  return true;
}
function treasure(e: Record<string, unknown>): boolean {
  const isCoins = e.grantedReward === "COINS";
  return (
    id(e.playerId) &&
    id(e.unitId) &&
    parseCoordV7(e.at) !== null &&
    (e.requestedReward === "COINS" || e.requestedReward === "KNIGHT") &&
    (isCoins || e.grantedReward === "KNIGHT") &&
    typeof e.knightFallback === "boolean" &&
    e.knightFallback === (e.requestedReward === "KNIGHT" && isCoins) &&
    e.coinDelta === (isCoins ? 5 : 0) &&
    (isCoins
      ? e.spawnedUnitId === null &&
        e.spawnedAt === null &&
        e.homeCityId === null
      : id(e.spawnedUnitId) &&
        parseCoordV7(e.spawnedAt) !== null &&
        id(e.homeCityId))
  );
}
function outcome(input: unknown): boolean {
  return (
    (hasExactKeysV7(input, ["kind", "winnerId"]) &&
      (input.kind === "VICTORY" || input.kind === "HEADLESS_VICTORY") &&
      id(input.winnerId)) ||
    (hasExactKeysV7(input, ["defeatedByPlayerId", "humanId", "kind"]) &&
      input.kind === "DEFEAT" &&
      id(input.humanId) &&
      id(input.defeatedByPlayerId))
  );
}
function playerCityAt(e: Record<string, unknown>): boolean {
  return id(e.playerId) && id(e.cityId) && parseCoordV7(e.at) !== null;
}
function income(input: unknown): boolean {
  if (!isDenseArrayV7(input)) return false;
  let prior = 0;
  return input.every(
    (item) =>
      hasExactKeysV7(item, ["cityId", "coins"]) &&
      id(item.cityId) &&
      item.cityId > prior &&
      nn(item.coins) &&
      ((prior = item.cityId), true),
  );
}
function coords(input: unknown): boolean {
  return (
    isDenseArrayV7(input) && input.every((item) => parseCoordV7(item) !== null)
  );
}
function sortedCoords(input: unknown): boolean {
  if (!isDenseArrayV7(input)) return false;
  let prior: { x: number; y: number } | null = null;
  return input.every((item) => {
    const at = parseCoordV7(item);
    if (
      at === null ||
      (prior !== null &&
        (at.y < prior.y || (at.y === prior.y && at.x <= prior.x)))
    )
      return false;
    prior = at;
    return true;
  });
}
function orderedIds(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  return input.every(
    (value, index) =>
      id(value) && (index === 0 || Number(input[index - 1]) < Number(value)),
  );
}
function tendResults(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  let prior = 0;
  for (const result of input) {
    if (
      !hasExactKeysV7(result, ["amount", "hpAfter", "unitId"]) ||
      !id(result.unitId) ||
      !pos(result.amount) ||
      Number(result.amount) > 2 ||
      !pos(result.hpAfter) ||
      Number(result.unitId) <= prior
    )
      return false;
    prior = Number(result.unitId);
  }
  return true;
}
function rewards(input: unknown, level: number): boolean {
  return (
    isDenseArrayV7(input) &&
    input.length === 2 &&
    REWARD_IDS_V7.indexOf(input[0] as never) >= 0 &&
    REWARD_IDS_V7.indexOf(input[1] as never) >
      REWARD_IDS_V7.indexOf(input[0] as never) &&
    rewardMatches(input[0] as RewardIdV7, level) &&
    rewardMatches(input[1] as RewardIdV7, level)
  );
}
function rewardMatches(reward: RewardIdV7, level: number): boolean {
  return level === 2
    ? reward === "SURVEY" || reward === "STOCKPILE"
    : level === 3
      ? reward === "WALLS" || reward === "MILITIA"
      : level === 4
        ? reward === "BOOM" || reward === "TREASURY_8"
        : level >= 5 && (reward === "JUGGERNAUT" || reward === "TREASURY");
}
function improvementCost(improvement: ImprovementIdV7): number {
  switch (improvement) {
    case "FARM":
    case "WINDMILL":
    case "SAWMILL":
      return 5;
    case "LUMBER_CAMP":
      return 3;
    case "MINE":
      return 5;
    case "FORGE":
      return 6;
    case "WORKSHOP":
      return 4;
    case "MARKET":
      return 6;
    case "MONUMENT":
      return 0;
    case "PORT":
      return 4;
    case "SHIPYARD":
      return 5;
  }
}
function trainingCost(role: UnitRoleIdV7): number {
  const costs: Readonly<Record<UnitRoleIdV7, number>> = {
    FIGHTER: 2,
    RAIDER: 4,
    MARKSMAN: 3,
    GUARD: 3,
    CAPTAIN: 5,
    CATAPULT: 8,
    KNIGHT: 9,
    JUGGERNAUT: 0,
    PATROL_BOAT: 5,
    BATTLESHIP: 16,
  };
  return costs[role];
}
function restoredResource(
  value: unknown,
  improvement: ImprovementIdV7,
): boolean {
  return value === expectedRestoredResource(improvement);
}
function expectedRestoredResource(
  improvement: ImprovementIdV7 | null,
): "FERTILE_GROUND" | "ORE" | null {
  return improvement === "FARM"
    ? "FERTILE_GROUND"
    : improvement === "MINE"
      ? "ORE"
      : null;
}
const id = isPositiveSafeIntegerV7;
const nn = isNonNegativeSafeIntegerV7;
const pos = isPositiveSafeIntegerV7;
function bad(field: string): { readonly ok: false; readonly field: string } {
  return { ok: false, field };
}
