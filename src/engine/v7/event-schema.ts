import type {
  DomainEventV7,
  EventEnvelopeV7,
  PlayerEventEnvelopeV7,
  PlayerEventV7,
} from "./events";
import {
  DOMAIN_EVENT_KIND_ORDER_V7,
  DEFECTION_CANCELLATION_REASON_ORDER_V7,
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
  ECONOMIC_BUILDING_BUILT: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "improvement",
    "cost",
    "populationContribution",
    "marketIncome",
    "capacityDelta",
  ],
  ECONOMIC_BUILDING_REMOVED: [
    "kind",
    "playerId",
    "cityId",
    "at",
    "improvement",
    "populationContributionRemoved",
    "marketIncomeRemoved",
    "capacityDelta",
    "resourceRestored",
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
  CITY_REWARD_CHOSEN: [
    "kind",
    "playerId",
    "cityId",
    "reachedLevel",
    "reward",
    "coinDelta",
  ],
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
  UNIT_PURSUED: ["kind", "unitId", "path", "from", "to"],
  UNIT_MOVE_INTERRUPTED: ["kind", "unitId", "at", "reason"],
  TILES_REVEALED: ["kind", "playerId", "tiles"],
  COMBAT_RESOLVED: ["kind", "preview"],
  PURSUIT_OPENED: ["kind", "unitId", "attacksUsed", "attacksRemaining"],
  PURSUIT_ENDED: ["kind", "unitId", "attacksUsed", "reason"],
  DEFECTION_OFFERED: [
    "kind",
    "markId",
    "sourceUnitId",
    "targetUnitId",
    "initiatingPlayerId",
    "targetOwnerId",
    "reservedHomeCityId",
    "offeredAtCommandIndex",
  ],
  DEFECTION_ARMED: [
    "kind",
    "markId",
    "sourceUnitId",
    "targetUnitId",
    "targetOwnerId",
  ],
  DEFECTION_CANCELLED: ["kind", "markId", "reason"],
  DEFECTION_RESOLVED: [
    "kind",
    "markId",
    "sourceUnitId",
    "targetUnitId",
    "fromPlayerId",
    "toPlayerId",
    "homeCityId",
    "at",
  ],
  SABOTEUR_EXPOSED: ["kind", "unitId", "anchorPlayerId", "reason"],
  BLACKOUT_PLANTED: [
    "kind",
    "cityId",
    "sourceUnitId",
    "sourceOwnerId",
    "targetOwnerId",
    "actionRound",
    "eligibleRound",
  ],
  BLACKOUT_ACTIVATED: ["kind", "cityId", "ownerId", "suppressedCoins"],
  BLACKOUT_RECOVERY_STARTED: ["kind", "cityId", "ownerId", "reason"],
  BLACKOUT_RECOVERY_COMPLETED: ["kind", "cityId", "ownerId"],
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
  CITY_REWARD_AUTOMATICALLY_GRANTED: [
    "kind",
    "playerId",
    "cityId",
    "reachedLevel",
    "reward",
    "coins",
  ],
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
    "heavyFallback",
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
    input.resourceRestored !== "UNKNOWN_RESOURCE" ||
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
  if (
    hasExactKeysV7(input, ["kind", "phase", "unitId"]) &&
    input.kind === "DEFECTION_ENDPOINT_STATUS" &&
    isPositiveSafeIntegerV7(input.unitId) &&
    (input.phase === "WAITING_FOR_REPLY" || input.phase === "ARMED")
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
      return (
        playerCityAt(e) && e.cost === 2 && e.permanentPopulationAdded === 1
      );
    case "ECONOMIC_BUILDING_BUILT":
      return (
        playerCityAt(e) &&
        IMPROVEMENT_IDS_V7.includes(e.improvement as never) &&
        e.cost === improvementCost(e.improvement as ImprovementIdV7) &&
        [e.populationContribution, e.marketIncome].every(nn) &&
        e.capacityDelta === (e.improvement === "BARRACKS" ? 2 : 0)
      );
    case "ECONOMIC_BUILDING_REMOVED":
      return (
        playerCityAt(e) &&
        IMPROVEMENT_IDS_V7.includes(e.improvement as never) &&
        [e.populationContributionRemoved, e.marketIncomeRemoved].every(nn) &&
        e.capacityDelta === (e.improvement === "BARRACKS" ? -2 : 0) &&
        restoredResource(e.resourceRestored, e.improvement as ImprovementIdV7)
      );
    case "FOREST_CLEARED":
      return playerCityAt(e) && e.coinDelta === 1;
    case "FOREST_REPLANTED":
      return playerCityAt(e) && e.coinDelta === 0;
    case "ROAD_BUILT":
      return playerCityAt(e) && e.cost === 2;
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
          (e.reward === "STOCKPILE" ? 4 : e.reward === "TREASURY" ? 12 : 0)
      );
    case "CITY_TERRITORY_EXPANDED":
      return id(e.playerId) && id(e.cityId) && sortedCoords(e.tiles);
    case "UNIT_TRAINED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        e.cost === trainingCost(e.role as UnitRoleIdV7) &&
        parseCoordV7(e.at) !== null
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
    case "UNIT_HEALED":
      return (
        id(e.medicId) && id(e.targetUnitId) && pos(e.amount) && pos(e.hpAfter)
      );
    case "UNIT_PUSHED":
      return (
        id(e.sourceUnitId) &&
        id(e.targetUnitId) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "UNIT_MOVED":
      return id(e.unitId) && coords(e.path);
    case "UNIT_PURSUED":
      return (
        id(e.unitId) &&
        coords(e.path) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "UNIT_MOVE_INTERRUPTED":
      return (
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        ["OCCUPIED", "SURVEYING_REQUIRED", "ZOC"].includes(e.reason as string)
      );
    case "TILES_REVEALED":
      return id(e.playerId) && sortedCoords(e.tiles);
    case "COMBAT_RESOLVED":
      return combat(e.preview);
    case "PURSUIT_OPENED":
      return (
        id(e.unitId) &&
        (e.attacksUsed === 1 || e.attacksUsed === 2) &&
        e.attacksRemaining === 3 - e.attacksUsed
      );
    case "PURSUIT_ENDED":
      return (
        id(e.unitId) &&
        [1, 2, 3].includes(e.attacksUsed as number) &&
        [
          "NONLETHAL",
          "THIRD_ATTACK",
          "ATTACKER_DIED",
          "EXPLICIT_END",
          "STATE_CANCELLED",
        ].includes(e.reason as string)
      );
    case "DEFECTION_OFFERED":
      return (
        [
          e.markId,
          e.sourceUnitId,
          e.targetUnitId,
          e.initiatingPlayerId,
          e.targetOwnerId,
          e.reservedHomeCityId,
        ].every(id) && nn(e.offeredAtCommandIndex)
      );
    case "DEFECTION_ARMED":
      return [e.markId, e.sourceUnitId, e.targetUnitId, e.targetOwnerId].every(
        id,
      );
    case "DEFECTION_CANCELLED":
      return (
        id(e.markId) &&
        DEFECTION_CANCELLATION_REASON_ORDER_V7.includes(e.reason as never)
      );
    case "DEFECTION_RESOLVED":
      return (
        [
          e.markId,
          e.sourceUnitId,
          e.targetUnitId,
          e.fromPlayerId,
          e.toPlayerId,
          e.homeCityId,
        ].every(id) && parseCoordV7(e.at) !== null
      );
    case "SABOTEUR_EXPOSED":
      return (
        id(e.unitId) &&
        id(e.anchorPlayerId) &&
        (e.reason === "ATTACK" || e.reason === "BLACKOUT")
      );
    case "BLACKOUT_PLANTED":
      return (
        [
          e.cityId,
          e.sourceUnitId,
          e.sourceOwnerId,
          e.targetOwnerId,
          e.actionRound,
          e.eligibleRound,
        ].every(id) &&
        (e.eligibleRound as number) === (e.actionRound as number) + 3
      );
    case "BLACKOUT_ACTIVATED":
      return (
        id(e.cityId) &&
        id(e.ownerId) &&
        nn(e.suppressedCoins) &&
        (e.suppressedCoins as number) <= 3
      );
    case "BLACKOUT_RECOVERY_STARTED":
      return (
        id(e.cityId) &&
        id(e.ownerId) &&
        (e.reason === "AFFECTED_TURN_ENDED" || e.reason === "CITY_CAPTURED")
      );
    case "BLACKOUT_RECOVERY_COMPLETED":
      return id(e.cityId) && id(e.ownerId);
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
    case "CITY_REWARD_AUTOMATICALLY_GRANTED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        pos(e.reachedLevel) &&
        (e.reachedLevel as number) >= 5 &&
        e.reward === "TREASURY" &&
        e.coins === 12
      );
    case "UNIT_RECOVERED":
      return id(e.unitId) && pos(e.amount) && typeof e.automatic === "boolean";
    case "UNIT_WAITED":
      return id(e.playerId) && id(e.unitId);
    case "UNIT_PROMOTED":
      return id(e.unitId) && pos(e.maxHp);
    case "UNIT_DIED":
      return (
        id(e.unitId) &&
        ["ATTACK", "RETALIATION", "ELIMINATION"].includes(e.cause as string)
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
      "damageToAttacker",
      "damageToDefender",
      "defense2",
      "defenseBonusDenominator",
      "defenseBonusNumerator",
      "defenderDies",
      "maximumRange",
      "minimumRange",
      "noRetaliationReason",
      "pursuitWillOpen",
      "push",
      "retaliation",
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
    [input.damageToAttacker, input.damageToDefender].every(nn) &&
    [
      input.chargeApplied,
      input.breachApplied,
      input.defenderDies,
      input.attackerDies,
      input.retaliation,
      input.advances,
      input.pursuitWillOpen,
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
function treasure(e: Record<string, unknown>): boolean {
  const isCoins = e.grantedReward === "COINS";
  return (
    id(e.playerId) &&
    id(e.unitId) &&
    parseCoordV7(e.at) !== null &&
    (e.requestedReward === "COINS" || e.requestedReward === "HEAVY") &&
    (isCoins || e.grantedReward === "HEAVY") &&
    typeof e.heavyFallback === "boolean" &&
    e.heavyFallback === (e.requestedReward === "HEAVY" && isCoins) &&
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
        ? reward === "EXPAND" || reward === "BOOM"
        : level >= 5 && (reward === "JUGGERNAUT" || reward === "TREASURY");
}
function improvementCost(improvement: ImprovementIdV7): number {
  switch (improvement) {
    case "FARM":
    case "WINDMILL":
    case "SAWMILL":
    case "QUARRY":
      return 5;
    case "LUMBER_CAMP":
      return 3;
    case "MINE":
    case "FORGE":
    case "STONEWORKS":
      return 6;
    case "WORKSHOP":
    case "BARRACKS":
      return 4;
    case "GRAND_WORKS":
    case "MARKET":
      return 7;
  }
}
function trainingCost(role: UnitRoleIdV7): number {
  const costs: Readonly<Record<UnitRoleIdV7, number>> = {
    FIGHTER: 2,
    SCOUT: 4,
    ENVOY: 6,
    MARKSMAN: 3,
    GUARD: 3,
    RAIDER: 4,
    MEDIC: 4,
    CATAPULT: 8,
    SABOTEUR: 6,
    HEAVY: 7,
    LANCER: 9,
    BREACHER: 6,
    JUGGERNAUT: 0,
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
): "FERTILE_GROUND" | "ORE" | "STONE" | null {
  return improvement === "FARM"
    ? "FERTILE_GROUND"
    : improvement === "MINE"
      ? "ORE"
      : improvement === "QUARRY"
        ? "STONE"
        : null;
}
const id = isPositiveSafeIntegerV7;
const nn = isNonNegativeSafeIntegerV7;
const pos = isPositiveSafeIntegerV7;
function bad(field: string): { readonly ok: false; readonly field: string } {
  return { ok: false, field };
}
