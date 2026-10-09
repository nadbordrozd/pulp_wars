import type {
  DomainEventV7,
  EventEnvelopeV7,
  PlayerEventEnvelopeV7,
  PlayerEventV7,
} from "./events";
import {
  ASSEMBLE_COST_V7,
  BARRICADE_COST_V7,
  BARRICADE_HP_V7,
  BLASTING_ERUPTION_DAMAGE_V7,
  DIVE_BOMB_DAMAGE_V7,
  HEAVY_TRACTOR_PULL_V7,
  ICE_CRUSH_DAMAGE_V7,
  LAND_GRANT_COST_PER_TILE_V7,
  LAND_GRANT_MINIMUM_COST_V7,
  MONUMENT_POPULATION_V7,
  REWARD_UNIT_LEVEL_V7,
  cityRewardCandidatesV7,
  cityRewardRecordMatchesLevelV7,
  landGrantCostV7,
  REPAIR_MACHINE_V7,
  SHIELD_CAP_V7,
  SNOW_COVER_V7,
  MIND_CONTROL_HP_V7,
  PEPPERMINT_DAMAGE_V7,
  SUGAR_TOSS_HEAL_V7,
  effectiveRoleRuleV7,
  rebakeHpV7,
  rebakePriceV7,
  hireCostV7,
  BLAST_MOUNTAIN_DAMAGE_V7,
  BLAST_MOUNTAIN_COST_V7,
  BREAK_OFF_UNITS_V7,
  CRUSH_DAMAGE_V7,
  DIGEST_DAMAGE_V7,
  STOMP_DAMAGE_V7,
  SWALLOW_MAX_HP_V7,
  TRAMPLE_DAMAGE_V7,
  CITY_REWARD_COINS_V7,
  PILLAGE_COINS_V7,
  PLUNDER_COINS_V7,
} from "../rules/ruleset-v7";
import {
  ACHIEVEMENT_IDS_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  IMPROVEMENT_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  isNavalRoleV7,
  type DomainEventKindV7,
  type ImprovementIdV7,
  type NavalRoleIdV7,
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
import {
  FOUNTAIN_HEAL_V7,
  MONSTER_REGENERATION_V7,
  NEUTRAL_BOUNTIES_V7,
  WELL_COINS_V7,
  WELL_OUTCOMES_V7,
  WRECK_COINS_V7,
} from "./curiosities";

const FIELDS: Readonly<Record<DomainEventKindV7, readonly string[]>> = {
  TURN_STARTED: ["kind", "playerId", "coins"],
  PLAGUE_DAMAGED: ["kind", "playerId", "results"],
  PLAGUE_SPREAD: ["kind", "playerId", "results"],
  PLAGUE_EXPIRED: ["kind", "playerId", "unitIds"],
  WINDMILL_HEALING_RESOLVED: ["kind", "playerId", "cityId", "at", "results"],
  FOUNTAIN_HEALED: ["kind", "playerId", "unitId", "at", "amount", "hpAfter"],
  UNITS_REGENERATED: ["kind", "playerId", "results"],
  MONSTER_REGENERATED: ["kind", "unitId", "amount", "hpAfter"],
  SHIELDS_RECHARGED: ["kind", "playerId", "results"],
  INCOME_AWARDED: ["kind", "playerId", "totalCoins", "cities"],
  INCOME_PREVIEWED: ["kind", "playerId", "totalCoins", "cities"],
  TURN_ENDED: ["kind", "playerId"],
  NEUTRAL_TURN_STARTED: ["kind", "round"],
  NEUTRAL_TURN_ENDED: ["kind", "round"],
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
  // Dwarf crowd control (`pulp_wars-w49.33`).
  BARRICADE_BUILT: ["kind", "playerId", "unitId", "at", "cost"],
  BARRICADE_REPAIRED: ["kind", "playerId", "unitId", "at", "amount", "hpAfter"],
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
  UNIT_ASSEMBLED: [
    "kind",
    "playerId",
    "unitId",
    "assembledUnitId",
    "at",
    "cityId",
    "cost",
  ],
  UNIT_REBAKED: [
    "kind",
    "playerId",
    "unitId",
    "rebakedUnitId",
    "role",
    "at",
    "cityId",
    "cost",
    "hp",
  ],
  UNITS_CRASHED: ["kind", "playerId", "crashedUnitIds", "sparedUnitIds"],
  CRUMBS_STALE: ["kind", "playerId", "tiles"],
  UNIT_SUGAR_RUSHED: ["kind", "playerId", "unitId", "move"],
  SUGAR_TOSSED: [
    "kind",
    "playerId",
    "unitId",
    "targetUnitId",
    "amount",
    "hpAfter",
  ],
  CRUMBS_EATEN: [
    "kind",
    "playerId",
    "at",
    "role",
    "unitId",
    "damage",
    "shieldDamage",
    "dies",
  ],
  CRUMBS_LEFT: ["kind", "playerId", "at", "role"],
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
  EGG_LAID: [
    "kind",
    "playerId",
    "cityId",
    "unitId",
    "role",
    "cost",
    "at",
    "hp",
    "turnsRemaining",
  ],
  EGG_HATCHED: [
    "kind",
    "playerId",
    "unitId",
    "role",
    "at",
    "cause",
    "sourceUnitId",
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
  UNIT_BEAMED: ["kind", "playerId", "unitId", "passengerUnitId", "from", "to"],
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
  UNITS_CHILLED: ["kind", "playerId", "sourceUnitId", "source", "results"],
  // The naval branch, the frozen sea (sections 8.4, 8.5, and 8.9).
  WATER_FROZEN: ["kind", "playerId", "unitId", "tiles", "icebound"],
  ICE_MELTED: ["kind", "tiles", "freed"],
  UNITS_CRUSHED: ["kind", "playerId", "results"],
  WOUNDED_TENDED: ["kind", "captainId", "results"],
  DEAD_RAISED: ["kind", "playerId", "unitId", "results"],
  GRAVE_DEVOURED: ["kind", "playerId", "unitId", "at", "amount", "hpAfter"],
  UNIT_PUSHED: ["kind", "sourceUnitId", "targetUnitId", "from", "to"],
  UNIT_PULLED: ["kind", "sourceUnitId", "targetUnitId", "from", "to", "path"],
  UNIT_TUNNELLED: [
    "kind",
    "playerId",
    "unitId",
    "from",
    "to",
    "riderUnitId",
    "riderFrom",
    "riderTo",
  ],
  UNIT_SURFACED: [
    "kind",
    "playerId",
    "unitId",
    "at",
    "riderUnitId",
    "riderAt",
    "eruptionDamage",
    "results",
  ],
  UNIT_MOVED: ["kind", "unitId", "path"],
  // Map curiosities round 2 (section 28.4).
  GATE_DISPLACED: ["kind", "unitId", "from", "to"],
  GATE_TRAVERSED: ["kind", "playerId", "unitId", "from", "to"],
  GATE_BLOCKED: ["kind", "playerId", "unitId", "at"],
  UNIT_MOVE_INTERRUPTED: ["kind", "unitId", "at", "reason"],
  TILES_REVEALED: ["kind", "playerId", "tiles"],
  COMBAT_RESOLVED: ["kind", "preview"],
  UNIT_BOMBED: [
    "kind",
    "playerId",
    "unitId",
    "from",
    "to",
    "targetUnitId",
    "at",
    "damage",
    "shieldDamage",
    "killed",
  ],
  WAIL_RESOLVED: ["kind", "playerId", "unitId", "at", "results"],
  WHIRL_RESOLVED: ["kind", "playerId", "unitId", "at", "results"],
  BARRICADE_ATTACKED: [
    "kind",
    "playerId",
    "unitId",
    "at",
    "ownerId",
    "damage",
    "hpAfter",
    "destroyed",
  ],
  EXPLOSION_RESOLVED: [
    "kind",
    "playerId",
    "unitId",
    "role",
    "at",
    "cause",
    "wave",
    "damage",
    "results",
  ],
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
  PLUNDER_AWARDED: ["kind", "playerId", "kills", "coins"],
  MONSTER_BOUNTY_AWARDED: ["kind", "playerId", "unitId", "coins"],
  UNIT_RECOVERED: ["kind", "unitId", "amount", "automatic"],
  UNIT_WAITED: ["kind", "playerId", "unitId"],
  // Map curiosities round 2 (section 30.2).
  COIN_TOSSED: [
    "kind",
    "playerId",
    "unitId",
    "at",
    "outcome",
    "coinsGained",
    "hpAfter",
  ],
  SHRINE_CLAIMED: ["kind", "playerId", "unitId", "at"],
  UNIT_PROMOTED: ["kind", "unitId", "maxHp"],
  UNIT_GREW: ["kind", "unitId", "stage", "maxHp", "hp"],
  UNIT_DIED: ["kind", "unitId", "cause"],
  // The giants' signatures (docs/product/RULESET_7_GIANTS.md section 8).
  UNIT_CRUSHED: [
    "kind",
    "playerId",
    "sourceUnitId",
    "targetUnitId",
    "damage",
    "shieldDamage",
    "dies",
    "blockerUnitId",
    "blockerDamage",
    "blockerShieldDamage",
    "blockerDies",
  ],
  UNIT_SWALLOWED: [
    "kind",
    "playerId",
    "unitId",
    "victimUnitId",
    "victimOwnerId",
    "role",
    "hp",
  ],
  UNIT_DIGESTED: [
    "kind",
    "playerId",
    "unitId",
    "victimUnitId",
    "amount",
    "hpAfter",
    "healed",
  ],
  UNIT_REGURGITATED: [
    "kind",
    "playerId",
    "unitId",
    "victimUnitId",
    "zombieUnitId",
    "at",
  ],
  SWALLOWED_UNIT_RELEASED: [
    "kind",
    "playerId",
    "unitId",
    "holderUnitId",
    "at",
    "hp",
  ],
  GOBLIN_TOSSED: [
    "kind",
    "playerId",
    "unitId",
    "passengerUnitId",
    "from",
    "to",
  ],
  THUNDER_STOMP: ["kind", "playerId", "unitId", "results", "fieldDefenses"],
  UNITS_TRAMPLED: ["kind", "playerId", "unitId", "results"],
  WALLS_DESTROYED: ["kind", "cityId", "byUnitId"],
  GIANT_BROKE_OFF: [
    "kind",
    "playerId",
    "unitId",
    "newUnitIds",
    "tiles",
    "cityId",
    "hp",
  ],
  UNIT_INFECTED: [
    "kind",
    "playerId",
    "sourceUnitId",
    "victimUnitId",
    "unitId",
    "at",
    "homeCityId",
  ],
  UNIT_MIND_CONTROLLED: [
    "kind",
    "playerId",
    "unitId",
    "targetUnitId",
    "targetOwnerId",
    "targetRole",
    "at",
    "hp",
  ],
  SHIP_BOARDED: [
    "kind",
    "playerId",
    "unitId",
    "targetUnitId",
    "fromPlayerId",
    "at",
    "hp",
  ],
  UNIT_RELEASED: [
    "kind",
    "unitId",
    "brainUnitId",
    "fromPlayerId",
    "toPlayerId",
    "at",
  ],
  BITTEN_UNIT_RISEN: [
    "kind",
    "playerId",
    "victimUnitId",
    "unitId",
    "at",
    "homeCityId",
  ],
  WIGHT_RISEN: ["kind", "playerId", "unitId", "at", "hp"],
  GRAVE_CREATED: ["kind", "at"],
  PLAGUE_CLEARED: ["kind", "unitIds"],
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
  WRECK_SALVAGED: ["kind", "playerId", "unitId", "at", "coins"],
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
    input.populationAdded === MONUMENT_POPULATION_V7
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
    input.populationAdded === MONUMENT_POPULATION_V7
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
    const projectedCultivation = parseProjectedCultivationEvent(candidate);
    if (projectedCultivation !== null) {
      events.push(projectedCultivation);
      continue;
    }
    const projectedRestoration = parseProjectedRestorationEvent(candidate);
    if (projectedRestoration !== null) {
      events.push(projectedRestoration);
      continue;
    }
    const projectedEgg = parseProjectedEggLaid(candidate);
    if (projectedEgg !== null) {
      events.push(projectedEgg);
      continue;
    }
    const projectedRaise = parseProjectedDeadRaised(candidate);
    if (projectedRaise !== null) {
      events.push(projectedRaise);
      continue;
    }
    const projectedChill = parseProjectedUnitsChilled(candidate);
    if (projectedChill !== null) {
      events.push(projectedChill);
      continue;
    }
    // The frozen sea: a Freeze by a unit the viewer cannot see.
    const projectedFreeze = parseProjectedWaterFrozen(candidate);
    if (projectedFreeze !== null) {
      events.push(projectedFreeze);
      continue;
    }
    // The Dwarf revision (section 13.11): hidden tunnel tiles and a hidden
    // surfacing Mole.
    const projectedTunnel = parseProjectedUnitTunnelled(candidate);
    if (projectedTunnel !== null) {
      events.push(projectedTunnel);
      continue;
    }
    const projectedSurface = parseProjectedUnitSurfaced(candidate);
    if (projectedSurface !== null) {
      events.push(projectedSurface);
      continue;
    }
    // The Candy revision (section 12.14): a hidden eater, and a Crash whose
    // units the viewer cannot all see.
    const projectedCandy = parseProjectedCandyEvent(candidate);
    if (projectedCandy !== null) {
      events.push(projectedCandy);
      continue;
    }
    const presentation = parsePresentationEvent(candidate);
    if (presentation !== null) {
      events.push(presentation);
      continue;
    }
    const splashDamage = parseProjectedSplashDamage(candidate);
    if (splashDamage !== null) {
      events.push(splashDamage);
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

/** A viewer without Gathering sees cultivated Fertile Ground masked. */
function parseProjectedCultivationEvent(input: unknown): PlayerEventV7 | null {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !("kind" in input) ||
    input.kind !== "FOREST_CULTIVATED" ||
    !("resourceAfter" in input) ||
    input.resourceAfter !== null
  )
    return null;
  const canonical = parseEventV7({ ...input, resourceAfter: "FERTILE_GROUND" });
  return canonical.ok ? (input as PlayerEventV7) : null;
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

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 12.14):
 * `CRUMBS_EATEN` projected to a viewer that cannot see the eater (the eater
 * and its bite are null).
 */
function parseProjectedCandyEvent(input: unknown): PlayerEventV7 | null {
  return hasExactKeysV7(input, FIELDS.CRUMBS_EATEN) &&
    input.kind === "CRUMBS_EATEN" &&
    id(input.playerId) &&
    parseCoordV7(input.at) !== null &&
    UNIT_ROLE_IDS_V7.includes(input.role as never) &&
    input.unitId === null &&
    input.damage === null &&
    input.shieldDamage === null &&
    input.dies === null
    ? (input as unknown as PlayerEventV7)
    : null;
}

/** Revision 19: a viewer other than the owner sees `EGG_LAID` without cost. */
function parseProjectedEggLaid(input: unknown): PlayerEventV7 | null {
  if (
    typeof input !== "object" ||
    input === null ||
    Array.isArray(input) ||
    !("kind" in input) ||
    input.kind !== "EGG_LAID" ||
    !("cost" in input) ||
    input.cost !== null
  )
    return null;
  const canonical = parseEventV7({ ...input, cost: 1 });
  return canonical.ok ? (input as PlayerEventV7) : null;
}

/**
 * Revision 13: a viewer who sees the Necromancer but none of the raised
 * Skeletons receives DEAD_RAISED with empty results.
 */
function parseProjectedDeadRaised(input: unknown): PlayerEventV7 | null {
  return hasExactKeysV7(input, FIELDS.DEAD_RAISED) &&
    input.kind === "DEAD_RAISED" &&
    id(input.playerId) &&
    id(input.unitId) &&
    isDenseArrayV7(input.results) &&
    input.results.length === 0
    ? (input as unknown as PlayerEventV7)
    : null;
}

/**
 * Hidden-source splash or Wail damage to the viewer's own units (Battleship
 * and Lich splash, revision 13 Wail). Wail entries may carry 0 damage.
 */
function parseProjectedSplashDamage(input: unknown): PlayerEventV7 | null {
  return hasExactKeysV7(input, ["kind", "splash"]) &&
    input.kind === "COMBAT_SPLASH_DAMAGE" &&
    isDenseArrayV7(input.splash) &&
    input.splash.length > 0 &&
    splashEntries(input.splash, true)
    ? (input as unknown as PlayerEventV7)
    : null;
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
    case "PLAGUE_DAMAGED":
      return (
        id(e.playerId) &&
        plagueEntries(e.results) &&
        (e.results as readonly { damage: number }[]).length > 0 &&
        (e.results as readonly { damage: number }[]).every(
          (entry) => entry.damage <= 2,
        )
      );
    case "PLAGUE_SPREAD":
      return id(e.playerId) && spreadResults(e.results);
    case "PLAGUE_EXPIRED":
      return id(e.playerId) && orderedIds(e.unitIds);
    case "WINDMILL_HEALING_RESOLVED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        parseCoordV7(e.at) !== null &&
        healingResults(e.results)
      );
    // Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 5).
    case "FOUNTAIN_HEALED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        pos(e.amount) &&
        (e.amount as number) <= FOUNTAIN_HEAL_V7 &&
        pos(e.hpAfter) &&
        (e.hpAfter as number) > (e.amount as number)
      );
    case "UNITS_REGENERATED":
      return id(e.playerId) && healingResults(e.results);
    // Map curiosities (section 8.5).
    case "MONSTER_REGENERATED":
      return (
        id(e.unitId) &&
        pos(e.amount) &&
        (e.amount as number) <= MONSTER_REGENERATION_V7 &&
        pos(e.hpAfter) &&
        (e.hpAfter as number) > (e.amount as number)
      );
    case "NEUTRAL_TURN_STARTED":
    case "NEUTRAL_TURN_ENDED":
      return pos(e.round);
    case "SHIELDS_RECHARGED":
      return id(e.playerId) && shieldResults(e.results);
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
      // The naval branch section 5.4: 2 for an owner with Harbours.
      return (
        playerCityAt(e) &&
        e.cost === 4 &&
        (e.populationAdded === 1 || e.populationAdded === 2)
      );
    case "SHIPYARD_BUILT":
      return (
        playerCityAt(e) &&
        e.cost === 5 &&
        e.populationAdded === 1 &&
        (e.livePopulationTotal === 2 || e.livePopulationTotal === 3)
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
        id(e.playerId) &&
        // Tuning 3: null outside the blasting player's territory.
        (e.cityId === null || id(e.cityId)) &&
        parseCoordV7(e.at) !== null &&
        e.cost === BLAST_MOUNTAIN_COST_V7 &&
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
    case "BARRICADE_BUILT":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        e.cost === BARRICADE_COST_V7
      );
    case "BARRICADE_REPAIRED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        pos(e.amount) &&
        Number(e.amount) <= REPAIR_MACHINE_V7 &&
        pos(e.hpAfter) &&
        Number(e.hpAfter) <= BARRICADE_HP_V7 &&
        Number(e.amount) < Number(e.hpAfter)
      );
    case "FIELD_DEFENSE_DESTROYED":
      return (
        parseCoordV7(e.at) !== null &&
        [
          "CATAPULT",
          "INSPIRED",
          "EXPLOSIVES",
          "OCCUPATION",
          "EXPLOSION",
          "TRAMPLE",
          // The Dwarf revision: a surfacing Mole's undermining.
          "UNDERMINED",
          // The giants' signatures: a Thunder Stomp and a Siege Hammer.
          "STOMP",
          "SIEGE_HAMMER",
        ].includes(e.reason as string)
      );
    case "LAND_GRANTED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        // Tuning 1 (7r46): 2 Coins per explored claimed tile, at least 6.
        isSafeIntegerV7(e.cost) &&
        (e.cost as number) >= LAND_GRANT_MINIMUM_COST_V7 &&
        Array.isArray(e.tiles) &&
        e.tiles.length > 0 &&
        (e.cost as number) <= landGrantCostV7(e.tiles.length) &&
        (e.cost === LAND_GRANT_MINIMUM_COST_V7 ||
          (e.cost as number) % LAND_GRANT_COST_PER_TILE_V7 === 0) &&
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
          (e.reward === "STOCKPILE" ||
          e.reward === "TREASURY" ||
          e.reward === "TREASURY_6"
            ? CITY_REWARD_COINS_V7[e.reward]
            : 0)
      );
    case "CITY_REWARD_AUTOMATICALLY_GRANTED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        pos(e.reachedLevel) &&
        (e.reachedLevel as number) >= 5 &&
        e.reward === "TREASURY" &&
        e.coins === CITY_REWARD_COINS_V7.TREASURY
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
        e.populationAdded === MONUMENT_POPULATION_V7
      );
    case "UNIT_TRAINED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        // Tuning 3 (`pulp_wars-w49.3`): a unit hired at a Market costs
        // `hireCostV7` of its training price (the Forge discount first).
        trainingCosts(e.role as UnitRoleIdV7).some((cost) =>
          [cost, Math.max(1, cost - 1)].some(
            (price) => e.cost === price || e.cost === hireCostV7(price),
          ),
        ) &&
        parseCoordV7(e.at) !== null
      );
    case "UNIT_ASSEMBLED":
      // The Dwarf revision (section 9.2): 4 Coins, 3 with Arms Industry.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.assembledUnitId) &&
        e.unitId !== e.assembledUnitId &&
        id(e.cityId) &&
        parseCoordV7(e.at) !== null &&
        (e.cost === ASSEMBLE_COST_V7 || e.cost === ASSEMBLE_COST_V7 - 1)
      );
    // The Candy revision (docs/product/RULESET_7_CANDY.md section 13).
    case "UNIT_REBAKED":
      // Section 6.4: the price and the HP are the role's (no discount).
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.rebakedUnitId) &&
        e.unitId !== e.rebakedUnitId &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        parseCoordV7(e.at) !== null &&
        id(e.cityId) &&
        rebakePriceV7(e.role as UnitRoleIdV7) !== null &&
        e.cost === rebakePriceV7(e.role as UnitRoleIdV7) &&
        e.hp === rebakeHpV7(e.role as UnitRoleIdV7)
      );
    case "UNITS_CRASHED":
      // Section 5.3: at least one unit, and no unit in both lists.
      return (
        id(e.playerId) &&
        ascendingIds(e.crashedUnitIds) &&
        ascendingIds(e.sparedUnitIds) &&
        (e.crashedUnitIds as readonly unknown[]).length +
          (e.sparedUnitIds as readonly unknown[]).length >
          0 &&
        !(e.crashedUnitIds as readonly unknown[]).some((unitId) =>
          (e.sparedUnitIds as readonly unknown[]).includes(unitId),
        )
      );
    case "CRUMBS_STALE":
      return (
        id(e.playerId) &&
        sortedCoords(e.tiles) &&
        (e.tiles as readonly unknown[]).length > 0
      );
    case "UNIT_SUGAR_RUSHED":
      // Section 5.1: the Rushed Move is the role's Move plus 1 (2 to 4).
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        (e.move === 2 || e.move === 3 || e.move === 4)
      );
    case "SUGAR_TOSSED":
      // Section 9: a heal of 1 to `SUGAR_TOSS_HEAL_V7`.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.targetUnitId) &&
        e.unitId !== e.targetUnitId &&
        pos(e.amount) &&
        Number(e.amount) <= SUGAR_TOSS_HEAL_V7 &&
        pos(e.hpAfter) &&
        Number(e.amount) < Number(e.hpAfter)
      );
    case "CRUMBS_EATEN":
      // Section 6.3: the fixed Peppermint Surprise, split between HP and a
      // Shield; a death needs HP damage.
      return (
        id(e.playerId) &&
        parseCoordV7(e.at) !== null &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        id(e.unitId) &&
        nn(e.damage) &&
        nn(e.shieldDamage) &&
        Number(e.shieldDamage) <= SHIELD_CAP_V7 &&
        Number(e.damage) + Number(e.shieldDamage) <= PEPPERMINT_DAMAGE_V7 &&
        typeof e.dies === "boolean" &&
        (e.dies !== true || Number(e.damage) >= 1)
      );
    case "CRUMBS_LEFT":
      return (
        id(e.playerId) &&
        parseCoordV7(e.at) !== null &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        rebakePriceV7(e.role as UnitRoleIdV7) !== null
      );
    case "NAVAL_UNIT_TRAINED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        id(e.unitId) &&
        isNavalRoleV7(e.role) &&
        (e.cost === trainingCost(e.role) ||
          e.cost === Math.max(1, trainingCost(e.role) - 2)) &&
        (e.dock === "PORT" || e.dock === "SHIPYARD") &&
        e.discountSource === (e.dock === "SHIPYARD" ? "SHIPYARD" : null) &&
        e.cost ===
          Math.max(1, trainingCost(e.role) - (e.dock === "SHIPYARD" ? 2 : 0)) &&
        parseCoordV7(e.at) !== null
      );
    case "EGG_LAID":
      // Revision 19: an Egg has 6 or 10 HP. Revision 20: at most four turns
      // to hatch (the T-Rex).
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        pos(e.cost) &&
        parseCoordV7(e.at) !== null &&
        (e.hp === 6 || e.hp === 10) &&
        (e.turnsRemaining === 1 ||
          e.turnsRemaining === 2 ||
          e.turnsRemaining === 3 ||
          e.turnsRemaining === 4)
      );
    case "EGG_HATCHED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        parseCoordV7(e.at) !== null &&
        ((e.cause === "TIME" && e.sourceUnitId === null) ||
          (e.cause === "SHAMAN" &&
            id(e.sourceUnitId) &&
            e.sourceUnitId !== e.unitId))
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
    case "UNIT_BEAMED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.passengerUnitId) &&
        e.unitId !== e.passengerUnitId &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "UNIT_REWARD_GRANTED":
      return (
        id(e.playerId) &&
        id(e.cityId) &&
        pos(e.reachedLevel) &&
        id(e.unitId) &&
        // The reward ladder rework (`pulp_wars-zypi`): the Militia unit at
        // level 2 and the Scouts unit at level 3 (level 3 and level 2
        // before it), and the giant at level 5 or later.
        (((e.reachedLevel === 2 || e.reachedLevel === 3) &&
          (e.role === "FIGHTER" || e.role === "RAIDER")) ||
          ((e.reachedLevel as number) >= REWARD_UNIT_LEVEL_V7 &&
            e.role === "JUGGERNAUT"))
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
    case "UNITS_CHILLED":
      // The Ice Folk revision (section 11): the source is never a target and
      // every result is an applied Chill (`turnsLeft` 2).
      // The frozen sea (naval branch section 8.8): Black Ice has no source
      // unit, and every other source has one.
      return (
        id(e.playerId) &&
        (e.source === "BLACK_ICE"
          ? e.sourceUnitId === null
          : id(e.sourceUnitId)) &&
        chillSource(e.source) &&
        chillResults(e.results, e.sourceUnitId)
      );
    case "WATER_FROZEN":
      // The frozen sea (section 8.4): at least one tile, in (y, x) order;
      // the newly icebound units in unit-ID order, never the actor.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        sortedCoords(e.tiles) &&
        (e.tiles as readonly unknown[]).length > 0 &&
        ascendingIds(e.icebound) &&
        !(e.icebound as readonly unknown[]).includes(e.unitId)
      );
    case "ICE_MELTED":
      // Section 8.5: at least one tile; the freed units in unit-ID order.
      return (
        sortedCoords(e.tiles) &&
        (e.tiles as readonly unknown[]).length > 0 &&
        ascendingIds(e.freed)
      );
    case "UNITS_CRUSHED":
      // Section 8.9: the fixed crush, split between HP and a Shield.
      return id(e.playerId) && crushResults(e.results);
    case "WOUNDED_TENDED":
      return id(e.captainId) && tendResults(e.results);
    case "DEAD_RAISED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        raisedResults(e.results, e.unitId) &&
        (e.results as readonly unknown[]).length > 0
      );
    case "GRAVE_DEVOURED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        nn(e.amount) &&
        pos(e.hpAfter) &&
        Number(e.amount) < Number(e.hpAfter)
      );
    case "UNIT_PUSHED":
      return (
        id(e.sourceUnitId) &&
        id(e.targetUnitId) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "UNIT_PULLED":
      return (
        id(e.sourceUnitId) &&
        id(e.targetUnitId) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null &&
        pulledPath(e.from, e.to, e.path)
      );
    case "UNIT_TUNNELLED":
      return tunnelled(e, false);
    case "UNIT_SURFACED":
      return surfaced(e, false);
    case "UNIT_MOVED":
      return id(e.unitId) && coords(e.path);
    // Map curiosities round 2 (section 28.4).
    case "GATE_DISPLACED":
      return (
        id(e.unitId) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "GATE_TRAVERSED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "GATE_BLOCKED":
      return id(e.playerId) && id(e.unitId) && parseCoordV7(e.at) !== null;
    case "UNIT_MOVE_INTERRUPTED":
      return (
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        [
          "OCCUPIED",
          "ENGINEERING_REQUIRED",
          "ZOC",
          "SETTLEMENT_FORBIDDEN",
          "SNOW",
          // The Dwarf revision: a hidden mound on the last tile of a Move.
          "MOUND",
          // Dwarf crowd control: a Barricade the mover did not know of.
          "BARRICADE",
          // The frozen sea: ice a slipping unit had not known before.
          "ICE",
        ].includes(e.reason as string)
      );
    case "TILES_REVEALED":
      return id(e.playerId) && sortedCoords(e.tiles);
    case "COMBAT_RESOLVED":
      return combat(e.preview);
    case "UNIT_BOMBED":
      // The Dwarf revision (section 6.3): a bomb of at most 5 (Dive), split
      // between HP and a Shield; a kill needs HP damage.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.targetUnitId) &&
        e.unitId !== e.targetUnitId &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null &&
        parseCoordV7(e.at) !== null &&
        nn(e.damage) &&
        nn(e.shieldDamage) &&
        Number(e.shieldDamage) <= SHIELD_CAP_V7 &&
        Number(e.damage) + Number(e.shieldDamage) <= DIVE_BOMB_DAMAGE_V7 &&
        typeof e.killed === "boolean" &&
        (e.killed !== true || Number(e.damage) > 0)
      );
    case "WAIL_RESOLVED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        splashEntries(e.results, true)
      );
    // Dwarf crowd control (`pulp_wars-w49.33`): a Whirl hits at least one
    // unit next to the Whirligig, never itself.
    case "WHIRL_RESOLVED": {
      const at = parseCoordV7(e.at);
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        at !== null &&
        splashEntries(e.results, true) &&
        (
          e.results as readonly {
            unitId: number;
            at: { x: number; y: number };
          }[]
        ).length > 0 &&
        (
          e.results as readonly {
            unitId: number;
            at: { x: number; y: number };
          }[]
        ).every(
          (entry) =>
            entry.unitId !== e.unitId &&
            Math.max(
              Math.abs(entry.at.x - at.x),
              Math.abs(entry.at.y - at.y),
            ) <= 1,
        )
      );
    }
    case "BARRICADE_ATTACKED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.ownerId) &&
        e.playerId !== e.ownerId &&
        parseCoordV7(e.at) !== null &&
        nn(e.damage) &&
        Number(e.damage) <= BARRICADE_HP_V7 &&
        nn(e.hpAfter) &&
        Number(e.hpAfter) + Number(e.damage) <= BARRICADE_HP_V7 &&
        e.destroyed === (e.hpAfter === 0)
      );
    case "EXPLOSION_RESOLVED":
      // Revision 17: the results never name the exploder and lie in its
      // 3 × 3 blast area; each hit deals at most the blast damage.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        parseCoordV7(e.at) !== null &&
        (e.cause === "KABOOM" || e.cause === "DEATH" || e.cause === "BLAST") &&
        pos(e.wave) &&
        (e.cause === "DEATH" || e.wave === 1) &&
        (e.cause !== "BLAST" || e.damage === BLAST_MOUNTAIN_DAMAGE_V7) &&
        pos(e.damage) &&
        splashEntries(e.results, false) &&
        (
          e.results as readonly {
            unitId: number;
            at: { x: number; y: number };
            damage: number;
            shieldDamage: number;
          }[]
        ).every(
          (entry) =>
            entry.unitId !== e.unitId &&
            entry.damage + entry.shieldDamage <= (e.damage as number) &&
            Math.max(
              Math.abs(entry.at.x - (e.at as { x: number }).x),
              Math.abs(entry.at.y - (e.at as { y: number }).y),
            ) <= 1,
        )
      );
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
        e.coinDelta === PILLAGE_COINS_V7
      );
    case "UNIT_DISBANDED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        e.role !== "JUGGERNAUT" &&
        trainingCosts(e.role as UnitRoleIdV7).some(
          (cost) => e.coinDelta === Math.floor(cost / 2),
        )
      );
    case "SPOILS_AWARDED":
      return id(e.playerId) && id(e.cityId) && e.coins === 2;
    case "PLUNDER_AWARDED":
      return (
        id(e.playerId) &&
        pos(e.kills) &&
        typeof e.kills === "number" &&
        e.coins === PLUNDER_COINS_V7 * e.kills
      );
    // Map curiosities (section 8.7).
    case "MONSTER_BOUNTY_AWARDED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        Object.values(NEUTRAL_BOUNTIES_V7).includes(e.coins as number)
      );
    case "UNIT_RECOVERED":
      return id(e.unitId) && pos(e.amount) && typeof e.automatic === "boolean";
    case "UNIT_WAITED":
      return id(e.playerId) && id(e.unitId);
    // Map curiosities round 2 (section 30.2).
    case "COIN_TOSSED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        WELL_OUTCOMES_V7.includes(
          e.outcome as (typeof WELL_OUTCOMES_V7)[number],
        ) &&
        e.coinsGained === (e.outcome === "COINS" ? WELL_COINS_V7 : 0) &&
        pos(e.hpAfter)
      );
    // Map curiosities (section 6).
    case "SHRINE_CLAIMED":
      return id(e.playerId) && id(e.unitId) && parseCoordV7(e.at) !== null;
    case "UNIT_PROMOTED":
      return id(e.unitId) && pos(e.maxHp);
    case "UNIT_GREW":
      return (
        id(e.unitId) &&
        (e.stage === 1 || e.stage === 2) &&
        pos(e.maxHp) &&
        // Revision 20 section 5: growing fully heals.
        e.hp === e.maxHp
      );
    case "UNIT_DIED":
      return (
        id(e.unitId) &&
        [
          "ATTACK",
          "SPLASH",
          "RETALIATION",
          "ELIMINATION",
          "WAIL",
          "PLAGUE",
          "KABOOM",
          "EXPLOSION",
          "CITY_CAPTURED",
          "BRAIN_LOST",
          "SHATTER",
          // The Dwarf revision: a bomb and an eruption.
          "BOMB",
          "ERUPTION",
          // The Candy revision: a Peppermint Surprise.
          "PEPPERMINT",
          // The frozen sea: an icebound unit crushed by the ice.
          "CRUSHED",
          // The giants' signatures (section 6.0, G5).
          "CRUSH",
          "STOMP",
          "TRAMPLE",
          "DIGESTED",
        ].includes(e.cause as string)
      );
    // The giants' signatures (docs/product/RULESET_7_GIANTS.md section 8).
    case "UNIT_CRUSHED":
      // Section 6.1: each hit is at most the crush damage, split between HP
      // and a Shield; no blocker (or a hidden one) is all zero.
      return (
        id(e.playerId) &&
        id(e.sourceUnitId) &&
        id(e.targetUnitId) &&
        e.sourceUnitId !== e.targetUnitId &&
        fixedHit(e.damage, e.shieldDamage, e.dies, CRUSH_DAMAGE_V7) &&
        (e.blockerUnitId === null
          ? e.blockerDamage === 0 &&
            e.blockerShieldDamage === 0 &&
            e.blockerDies === false
          : id(e.blockerUnitId) &&
            e.blockerUnitId !== e.sourceUnitId &&
            e.blockerUnitId !== e.targetUnitId &&
            fixedHit(
              e.blockerDamage,
              e.blockerShieldDamage,
              e.blockerDies,
              CRUSH_DAMAGE_V7,
            ))
      );
    case "UNIT_SWALLOWED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.victimUnitId) &&
        e.unitId !== e.victimUnitId &&
        id(e.victimOwnerId) &&
        e.victimOwnerId !== e.playerId &&
        UNIT_ROLE_IDS_V7.includes(e.role as never) &&
        e.role !== "JUGGERNAUT" &&
        pos(e.hp) &&
        (e.hp as number) <= SWALLOW_MAX_HP_V7
      );
    case "UNIT_DIGESTED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.victimUnitId) &&
        e.unitId !== e.victimUnitId &&
        pos(e.amount) &&
        (e.amount as number) <= DIGEST_DAMAGE_V7 &&
        nn(e.hpAfter) &&
        nn(e.healed) &&
        (e.healed as number) <= (e.amount as number)
      );
    case "UNIT_REGURGITATED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.victimUnitId) &&
        e.unitId !== e.victimUnitId &&
        (e.zombieUnitId === null
          ? e.at === null
          : id(e.zombieUnitId) &&
            e.zombieUnitId !== e.unitId &&
            e.zombieUnitId !== e.victimUnitId &&
            parseCoordV7(e.at) !== null)
      );
    case "SWALLOWED_UNIT_RELEASED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.holderUnitId) &&
        e.unitId !== e.holderUnitId &&
        parseCoordV7(e.at) !== null &&
        pos(e.hp)
      );
    case "GOBLIN_TOSSED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.passengerUnitId) &&
        e.unitId !== e.passengerUnitId &&
        parseCoordV7(e.from) !== null &&
        parseCoordV7(e.to) !== null
      );
    case "THUNDER_STOMP":
      // Section 6.4: every hit is at most the Stomp damage, never on the
      // Brontosaurus, and lies next to no further than one tile from it.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        splashEntries(e.results, false) &&
        (
          e.results as readonly {
            unitId: number;
            damage: number;
            shieldDamage: number;
          }[]
        ).every(
          (entry) =>
            entry.unitId !== e.unitId &&
            entry.damage + entry.shieldDamage <= STOMP_DAMAGE_V7,
        ) &&
        sortedCoords(e.fieldDefenses)
      );
    case "UNITS_TRAMPLED":
      // Section 6.5: the units stepped over, in path order (not sorted).
      return id(e.playerId) && id(e.unitId) && trampleResults(e);
    case "WALLS_DESTROYED":
      return id(e.cityId) && id(e.byUnitId);
    case "GIANT_BROKE_OFF": {
      // The user's change of 2026-10-09: two Gingerbread Men, with new
      // ascending IDs, on two distinct tiles in (y, x) order, each with a
      // Toffee Trooper's full HP.
      if (
        !isDenseArrayV7(e.newUnitIds) ||
        e.newUnitIds.length !== BREAK_OFF_UNITS_V7 ||
        !isDenseArrayV7(e.tiles) ||
        e.tiles.length !== BREAK_OFF_UNITS_V7
      )
        return false;
      const [firstId, secondId] = e.newUnitIds;
      const first = parseCoordV7(e.tiles[0]);
      const second = parseCoordV7(e.tiles[1]);
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(firstId) &&
        id(secondId) &&
        (firstId as number) < (secondId as number) &&
        e.unitId !== firstId &&
        e.unitId !== secondId &&
        first !== null &&
        second !== null &&
        (first.y < second.y || (first.y === second.y && first.x < second.x)) &&
        id(e.cityId) &&
        isPositiveSafeIntegerV7(e.hp)
      );
    }
    case "UNIT_MIND_CONTROLLED":
      // The Mind Control revision (section 3): the target keeps its ID and
      // has 1 to `MIND_CONTROL_HP_V7` HP.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.targetUnitId) &&
        id(e.targetOwnerId) &&
        e.targetOwnerId !== e.playerId &&
        UNIT_ROLE_IDS_V7.includes(e.targetRole as never) &&
        e.targetRole !== "JUGGERNAUT" &&
        e.unitId !== e.targetUnitId &&
        parseCoordV7(e.at) !== null &&
        pos(e.hp) &&
        (e.hp as number) <= MIND_CONTROL_HP_V7
      );
    case "SHIP_BOARDED":
      // The naval branch (section 4.2): the prize keeps its ID and is
      // patched up to at least 1 HP above a boarding line of 0.
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        id(e.targetUnitId) &&
        id(e.fromPlayerId) &&
        e.fromPlayerId !== e.playerId &&
        e.unitId !== e.targetUnitId &&
        parseCoordV7(e.at) !== null &&
        pos(e.hp)
      );
    case "UNIT_RELEASED":
      // The Mind Control revision (section 4.2).
      return (
        id(e.unitId) &&
        id(e.brainUnitId) &&
        e.unitId !== e.brainUnitId &&
        id(e.fromPlayerId) &&
        id(e.toPlayerId) &&
        e.fromPlayerId !== e.toPlayerId &&
        parseCoordV7(e.at) !== null
      );
    case "UNIT_INFECTED":
      return (
        id(e.playerId) &&
        id(e.sourceUnitId) &&
        id(e.victimUnitId) &&
        id(e.unitId) &&
        new Set([e.sourceUnitId, e.victimUnitId, e.unitId]).size === 3 &&
        parseCoordV7(e.at) !== null &&
        (e.homeCityId === null || id(e.homeCityId))
      );
    case "BITTEN_UNIT_RISEN":
      return (
        id(e.playerId) &&
        id(e.victimUnitId) &&
        id(e.unitId) &&
        e.victimUnitId !== e.unitId &&
        parseCoordV7(e.at) !== null &&
        (e.homeCityId === null || id(e.homeCityId))
      );
    case "WIGHT_RISEN":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        isPositiveSafeIntegerV7(e.hp)
      );
    case "GRAVE_CREATED":
      return parseCoordV7(e.at) !== null;
    case "PLAGUE_CLEARED":
      return orderedIds(e.unitIds);
    case "CITY_CAPTURED":
      return id(e.cityId) && (e.from === null || id(e.from)) && id(e.to);
    case "TREASURE_CAPTURED":
      return treasure(e);
    // Map curiosities (section 7).
    case "WRECK_SALVAGED":
      return (
        id(e.playerId) &&
        id(e.unitId) &&
        parseCoordV7(e.at) !== null &&
        e.coins === WRECK_COINS_V7
      );
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
      "attackerHeal",
      "attackerId",
      "attackerInfected",
      "attackerBitten",
      "attackerBittenRises",
      "defenderBitten",
      "defenderBittenRises",
      "plagued",
      "breachApplied",
      "chargeApplied",
      "inspiredApplied",
      "inspiredConsumed",
      "gangUp",
      "damageToAttacker",
      "damageToDefender",
      "defense2",
      "defenseBonusDenominator",
      "defenseBonusNumerator",
      "fortificationLevel",
      "defenderDies",
      "defenderHeal",
      "defenderInfected",
      "attacksRemaining",
      "attacksUsed",
      "maximumRange",
      "minimumRange",
      "noRetaliationReason",
      "overrunAdvance",
      "overrunContinues",
      "escapeAvailable",
      "push",
      "retaliation",
      "splash",
      "targetUnitId",
      "runUp",
      "fortificationIgnored",
      "acid",
      "defenderArmoured",
      "attackerArmoured",
      "rayPower",
      "coolingApplied",
      "defenderShieldDamage",
      "attackerShieldDamage",
      "shatters",
      "coldBloodApplied",
      "rockfallApplied",
      "plantedApplied",
      "blizzardHalved",
      "snowCover",
      "sweep",
      "hiddenBlizzardPossible",
      "dugIn",
      "unflinchingApplied",
      "platedApplied",
      "sugarRushApplied",
      "splatApplied",
      "bounce",
      "bounceTo",
      "ram",
      "torpedo",
      "iceCover",
      "icebound",
      "shockDamage",
      "crackApplied",
      "frostbiteApplied",
      "crush",
      "crushDamage",
      "collisionDamage",
      "siegeHammer",
      "wallsDestroyed",
      "glacialSmash",
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
    (input.gangUp === 0 || input.gangUp === 1 || input.gangUp === 2) &&
    // Revision 20: the Charge! run-up and the fortification levels removed
    // by Charge! (up to 4 since tuning 4, when a Field Defense became two
    // levels; 3 before) or Wallbreaker (2); Acid reports none.
    (input.runUp === 0 || input.runUp === 1 || input.runUp === 2) &&
    (input.fortificationIgnored === 0 ||
      input.fortificationIgnored === 1 ||
      input.fortificationIgnored === 2 ||
      input.fortificationIgnored === 3 ||
      input.fortificationIgnored === 4) &&
    (input.acid !== true || input.fortificationIgnored === 0) &&
    // Revision 19: the Acid and Armoured flags.
    [input.acid, input.defenderArmoured, input.attackerArmoured].every(
      (item) => typeof item === "boolean",
    ) &&
    (input.acid !== true ||
      (input.fortificationLevel === 0 &&
        input.defenseBonusNumerator === 1 &&
        input.defenseBonusDenominator === 1)) &&
    // The Martian revision: an Armoured hit of at least 1 is HP or Shield.
    (input.defenderArmoured !== true ||
      Number(input.damageToDefender) + Number(input.defenderShieldDamage) >=
        1) &&
    (input.attackerArmoured !== true ||
      Number(input.damageToAttacker) + Number(input.attackerShieldDamage) >=
        1) &&
    // The Martian revision: ray power, Cooling, and absorbed Shield damage.
    (input.rayPower === "FULL" ||
      input.rayPower === "HALF" ||
      input.rayPower === "NONE") &&
    // The Martian pass (`pulp_wars-w49.14`, 7r52): a full-power ray with
    // Heat Sinks leaves no Cooling; nothing but a full-power ray does.
    typeof input.coolingApplied === "boolean" &&
    (input.coolingApplied !== true || input.rayPower === "FULL") &&
    [input.defenderShieldDamage, input.attackerShieldDamage].every(
      (item) => nn(item) && Number(item) <= SHIELD_CAP_V7,
    ) &&
    // The ninth unit (`pulp_wars-w49.17`, 7r55): a Shock Field hits the
    // attacker (its Shield first) with or without a retaliation, never for
    // more than the attacker takes; a Crack needs a surviving target and
    // Frostbite a surviving attacker.
    nn(input.shockDamage) &&
    Number(input.shockDamage) <=
      Number(input.damageToAttacker) + Number(input.attackerShieldDamage) &&
    typeof input.crackApplied === "boolean" &&
    typeof input.frostbiteApplied === "boolean" &&
    (input.crackApplied !== true || input.defenderDies === false) &&
    (input.frostbiteApplied !== true || input.attackerDies === false) &&
    (input.attackerShieldDamage === 0 ||
      input.retaliation === true ||
      Number(input.shockDamage) > 0) &&
    // The Ice Folk revision (section 11): a Shatter kills the defender with
    // no retaliation; a Rockfall is a ranged attack; Snow cover is a cover.
    [
      input.shatters,
      input.coldBloodApplied,
      input.rockfallApplied,
      input.plantedApplied,
      input.blizzardHalved,
      input.snowCover,
      input.sweep,
      input.hiddenBlizzardPossible,
    ].every((item) => typeof item === "boolean") &&
    (input.shatters !== true ||
      (input.defenderDies === true &&
        input.retaliation === false &&
        (input.attackerDies === false || Number(input.shockDamage) > 0))) &&
    // `pulp_wars-1wy.3`: Snow cover is `SNOW_COVER_V7` (x 1.25).
    (input.snowCover !== true ||
      (input.defenseBonusNumerator === SNOW_COVER_V7.numerator &&
        input.defenseBonusDenominator === SNOW_COVER_V7.denominator &&
        input.fortificationLevel === 0)) &&
    (input.attacksRemaining === 0 || input.attacksRemaining === 1) &&
    // The Dwarf revision (section 7.3): an unmoved Clockwork Gunner's first
    // shot also leaves one attack (`attacksRemaining` 1 with no Overrun).
    (!input.overrunContinues || input.attacksRemaining === 1) &&
    [input.dugIn, input.unflinchingApplied, input.platedApplied].every(
      (item) => typeof item === "boolean",
    ) &&
    (!input.overrunContinues ||
      (input.overrunAdvance === true &&
        input.advances === true &&
        input.defenderDies === true &&
        input.attackerDies === false)) &&
    [input.damageToAttacker, input.damageToDefender].every(nn) &&
    nn(input.fortificationLevel) &&
    // Revision 13: Lifesteal heals only a survivor; Infect converts a death.
    nn(input.attackerHeal) &&
    nn(input.defenderHeal) &&
    (input.attackerHeal === 0 || input.attackerDies === false) &&
    (input.defenderHeal === 0 || input.defenderDies === false) &&
    typeof input.attackerInfected === "boolean" &&
    typeof input.defenderInfected === "boolean" &&
    (!input.attackerInfected || input.attackerDies === true) &&
    (!input.defenderInfected || input.defenderDies === true) &&
    (!input.defenderInfected || input.advances === false) &&
    // Revision 14: bites mark survivors; a bitten death rises (no advance);
    // Plague marks distinct survivors only.
    [
      input.attackerBitten,
      input.defenderBitten,
      input.attackerBittenRises,
      input.defenderBittenRises,
    ].every((item) => typeof item === "boolean") &&
    (!input.attackerBitten || input.attackerDies === false) &&
    (!input.defenderBitten || input.defenderDies === false) &&
    (!input.attackerBittenRises ||
      (input.attackerDies === true && input.attackerInfected === false)) &&
    (!input.defenderBittenRises ||
      (input.defenderDies === true &&
        input.defenderInfected === false &&
        input.advances === false)) &&
    uniqueIds(input.plagued) &&
    (!(input.plagued as readonly unknown[]).includes(input.targetUnitId) ||
      input.defenderDies === false) &&
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
      input.escapeAvailable,
    ].every((item) => typeof item === "boolean") &&
    (input.escapeAvailable !== true || input.attackerDies === false) &&
    !(input.escapeAvailable === true && input.overrunContinues === true) &&
    ["WILL_PUSH", "BLOCKED", "UNKNOWN_BEHIND_FOG"].includes(
      input.push as string,
    ) &&
    (input.noRetaliationReason === null ||
      [
        "DEFENDER_DIED",
        "OUT_OF_RANGE",
        "UNANSWERED",
        "SPLATTED",
        "ICEBOUND",
      ].includes(input.noRetaliationReason as string)) &&
    // The Candy revision (section 13): a Splatted defender survives and
    // does not retaliate; the Rush bonus is on a first attack and never
    // with Charge or Inspired; a Splat needs a surviving target; a Bounce
    // needs both units alive, and names its tile exactly when it happens.
    (input.noRetaliationReason !== "SPLATTED" ||
      (input.retaliation === false && input.defenderDies === false)) &&
    typeof input.sugarRushApplied === "boolean" &&
    typeof input.splatApplied === "boolean" &&
    (input.sugarRushApplied !== true ||
      (input.chargeApplied === false &&
        input.inspiredApplied === false &&
        input.attacksUsed === 1)) &&
    (input.splatApplied !== true || input.defenderDies === false) &&
    ["NONE", "WILL_BOUNCE", "BLOCKED", "UNKNOWN_BEHIND_FOG"].includes(
      input.bounce as string,
    ) &&
    (input.bounce === "WILL_BOUNCE"
      ? parseCoordV7(input.bounceTo) !== null
      : input.bounceTo === null) &&
    (input.bounce === "NONE" ||
      (input.defenderDies === false && input.attackerDies === false)) &&
    // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md sections 4.1
    // and 5.3): a Ram is a ship's first attack (never with Charge), and a
    // torpedo is never answered; a ship is never both.
    typeof input.ram === "boolean" &&
    typeof input.torpedo === "boolean" &&
    (input.ram !== true ||
      (input.chargeApplied === false && input.torpedo === false)) &&
    (input.torpedo !== true ||
      (input.retaliation === false &&
        input.attackerDies === false &&
        input.noRetaliationReason !== "OUT_OF_RANGE" &&
        input.noRetaliationReason !== "SPLATTED" &&
        input.noRetaliationReason !== "ICEBOUND")) &&
    // The frozen sea (naval branch sections 8.9 and 8.10): an icebound
    // defender never retaliates and is never rammed or pushed; ice cover is
    // a cover, so the defense bonus is not 1.
    typeof input.iceCover === "boolean" &&
    typeof input.icebound === "boolean" &&
    (input.icebound !== true ||
      (input.retaliation === false &&
        input.attackerDies === false &&
        input.ram === false &&
        input.push !== "WILL_PUSH" &&
        input.iceCover === false)) &&
    (input.noRetaliationReason !== "ICEBOUND" || input.icebound === true) &&
    (input.iceCover !== true ||
      (input.snowCover === false &&
        input.defenseBonusNumerator === SNOW_COVER_V7.numerator &&
        input.defenseBonusDenominator === SNOW_COVER_V7.denominator &&
        input.fortificationLevel === 0)) &&
    // The giants' signatures (RULESET_7_GIANTS.md sections 6.1, 6.6, and
    // 6.7): a crush needs a surviving target that is not pushed; a Glacial
    // Smash is a Shatter.
    ["NONE", "WILL_CRUSH", "UNKNOWN_BEHIND_FOG"].includes(
      input.crush as string,
    ) &&
    nn(input.crushDamage) &&
    nn(input.collisionDamage) &&
    Number(input.crushDamage) <= CRUSH_DAMAGE_V7 &&
    Number(input.collisionDamage) <= CRUSH_DAMAGE_V7 &&
    (input.crush !== "NONE" ||
      (input.crushDamage === 0 && input.collisionDamage === 0)) &&
    (input.crush === "NONE" ||
      (input.defenderDies === false && input.push !== "WILL_PUSH")) &&
    typeof input.siegeHammer === "boolean" &&
    typeof input.wallsDestroyed === "boolean" &&
    typeof input.glacialSmash === "boolean" &&
    (input.wallsDestroyed !== true || input.siegeHammer === true) &&
    (input.glacialSmash !== true || input.shatters === true)
  );
}
function splash(input: unknown): boolean {
  return splashEntries(input, false);
}
/**
 * The giants' signatures: one fixed hit of at most `maximum`, split between
 * HP and a Shield, that kills only with HP damage.
 */
function fixedHit(
  damage: unknown,
  shieldDamage: unknown,
  dies: unknown,
  maximum: number,
): boolean {
  return (
    nn(damage) &&
    nn(shieldDamage) &&
    typeof dies === "boolean" &&
    Number(damage) + Number(shieldDamage) <= maximum &&
    (!dies || Number(damage) > 0)
  );
}
/**
 * Section 6.5 `UNITS_TRAMPLED`: non-empty splash-shaped results in path
 * order, unique units, never the Colossus, each at most the trample.
 */
function trampleResults(e: Record<string, unknown>): boolean {
  const results = e.results;
  if (!isDenseArrayV7(results) || results.length === 0) return false;
  const seen = new Set<number>();
  for (const entry of results) {
    if (
      !hasExactKeysV7(entry, [
        "at",
        "damage",
        "dies",
        "shieldDamage",
        "unitId",
      ]) ||
      !id(entry.unitId) ||
      entry.unitId === e.unitId ||
      seen.has(entry.unitId as number) ||
      parseCoordV7(entry.at) === null ||
      !fixedHit(entry.damage, entry.shieldDamage, entry.dies, TRAMPLE_DAMAGE_V7)
    )
      return false;
    seen.add(entry.unitId as number);
  }
  return true;
}
/**
 * The Dwarf revision (section 5.1) `UNIT_TUNNELLED`: the rider fields are
 * all null or all set; a projection (`projected`) may hide `from` and `to`.
 */
function tunnelled(e: Record<string, unknown>, projected: boolean): boolean {
  const coord = (value: unknown): boolean =>
    parseCoordV7(value) !== null || (projected && value === null);
  const rider =
    (e.riderUnitId === null && e.riderFrom === null && e.riderTo === null) ||
    (id(e.riderUnitId) &&
      e.riderUnitId !== e.unitId &&
      coord(e.riderFrom) &&
      coord(e.riderTo));
  return (
    id(e.playerId) && id(e.unitId) && coord(e.from) && coord(e.to) && rider
  );
}
/**
 * The Dwarf revision (section 5.4) `UNIT_SURFACED`: an eruption of 1 to 3;
 * results splash-shaped, each hit at most the eruption, never the Mole or
 * its rider. A projection (`projected`) may hide the Mole and its tile.
 */
function surfaced(e: Record<string, unknown>, projected: boolean): boolean {
  if (
    !id(e.playerId) ||
    !(id(e.unitId) || (projected && e.unitId === null)) ||
    !(parseCoordV7(e.at) !== null || (projected && e.at === null)) ||
    !(
      (e.riderUnitId === null && e.riderAt === null) ||
      (id(e.riderUnitId) &&
        e.riderUnitId !== e.unitId &&
        parseCoordV7(e.riderAt) !== null) ||
      (projected && id(e.riderUnitId) && e.riderAt === null)
    ) ||
    !pos(e.eruptionDamage) ||
    Number(e.eruptionDamage) > BLASTING_ERUPTION_DAMAGE_V7 ||
    !splashEntries(e.results, true)
  )
    return false;
  return (
    e.results as readonly {
      unitId: number;
      damage: number;
      shieldDamage: number;
    }[]
  ).every(
    (entry) =>
      entry.unitId !== e.unitId &&
      entry.unitId !== e.riderUnitId &&
      entry.damage + entry.shieldDamage <= (e.eruptionDamage as number),
  );
}
/** The Dwarf revision: a projected `UNIT_TUNNELLED` with hidden tiles. */
function parseProjectedUnitTunnelled(input: unknown): PlayerEventV7 | null {
  return hasExactKeysV7(input, FIELDS.UNIT_TUNNELLED) &&
    input.kind === "UNIT_TUNNELLED" &&
    (input.from === null ||
      input.to === null ||
      input.riderFrom === null ||
      input.riderTo === null) &&
    tunnelled(input, true)
    ? (input as unknown as PlayerEventV7)
    : null;
}
/** The Dwarf revision: a projected `UNIT_SURFACED` with a hidden Mole. */
function parseProjectedUnitSurfaced(input: unknown): PlayerEventV7 | null {
  return hasExactKeysV7(input, FIELDS.UNIT_SURFACED) &&
    input.kind === "UNIT_SURFACED" &&
    (input.unitId === null || input.at === null || input.riderAt === null) &&
    surfaced(input, true)
    ? (input as unknown as PlayerEventV7)
    : null;
}
/** Revision 14 Plague damage entries: Plague bypasses Shields. */
function plagueEntries(input: unknown): boolean {
  return splashShapedEntries(input, false, false);
}
/**
 * Splash-shaped entries sorted by (y, x, unitId) with unique units. Wail
 * results may carry 0 damage; a death always needs positive damage. The
 * Martian revision: each entry carries `shieldDamage` (what the victim's
 * Shield absorbed), and a hit whose HP damage is 0 is valid when its Shield
 * damage is positive.
 */
function splashEntries(input: unknown, zeroDamage: boolean): boolean {
  return splashShapedEntries(input, zeroDamage, true);
}
function splashShapedEntries(
  input: unknown,
  zeroDamage: boolean,
  shielded: boolean,
): boolean {
  if (!isDenseArrayV7(input)) return false;
  let previous: { x: number; y: number; unitId: number } | null = null;
  const ids = new Set<number>();
  for (const entry of input) {
    if (
      !hasExactKeysV7(
        entry,
        shielded
          ? ["at", "damage", "dies", "shieldDamage", "unitId"]
          : ["at", "damage", "dies", "unitId"],
      ) ||
      !id(entry.unitId) ||
      (shielded &&
        (!nn(entry.shieldDamage) ||
          Number(entry.shieldDamage) > SHIELD_CAP_V7)) ||
      !(zeroDamage || (shielded && Number(entry.shieldDamage) > 0)
        ? nn(entry.damage)
        : pos(entry.damage)) ||
      typeof entry.dies !== "boolean" ||
      (entry.dies && entry.damage === 0)
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
  // Score and modes (docs/product/RULESET_7_SCORE_AND_STARS.md section
  // 4.2): a result decided by the score adds `decidedBy` and the ranking.
  if (
    typeof input === "object" &&
    input !== null &&
    Object.prototype.hasOwnProperty.call(input, "decidedBy")
  ) {
    const { decidedBy, ranking, ...rest } = input as {
      readonly decidedBy?: unknown;
      readonly ranking?: unknown;
    };
    return (
      decidedBy === "SCORE" &&
      isDenseArrayV7(ranking) &&
      ranking.length > 0 &&
      ranking.every(id) &&
      new Set(ranking).size === ranking.length &&
      (rest as { readonly kind?: unknown }).kind !== "HEADLESS_VICTORY" &&
      outcome(rest)
    );
  }
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
/**
 * The Martian balance revision (`pulp_wars-1wy.3`): the path of a pull: one
 * to `HEAVY_TRACTOR_PULL_V7` tiles, each next to the one before (the first
 * next to `from`), ending on `to`.
 */
function pulledPath(from: unknown, to: unknown, input: unknown): boolean {
  if (
    !isDenseArrayV7(input) ||
    input.length < 1 ||
    input.length > HEAVY_TRACTOR_PULL_V7
  )
    return false;
  let prior = parseCoordV7(from);
  const end = parseCoordV7(to);
  for (const item of input) {
    const at = parseCoordV7(item);
    if (
      at === null ||
      prior === null ||
      Math.max(Math.abs(at.x - prior.x), Math.abs(at.y - prior.y)) !== 1
    )
      return false;
    prior = at;
  }
  return (
    prior !== null && end !== null && prior.x === end.x && prior.y === end.y
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
/** Distinct unit IDs in any order; may be empty. */
function uniqueIds(input: unknown): boolean {
  return (
    isDenseArrayV7(input) &&
    input.every(id) &&
    new Set(input).size === input.length
  );
}
/** Revision 14 spread entries: non-empty, sorted by (y, x, id), unique. */
function spreadResults(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  let previous: { x: number; y: number; unitId: number } | null = null;
  for (const entry of input) {
    if (!hasExactKeysV7(entry, ["at", "unitId"]) || !id(entry.unitId))
      return false;
    const at = parseCoordV7(entry.at);
    if (at === null) return false;
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
    previous = current;
  }
  return true;
}
function orderedIds(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  return input.every(
    (value, index) =>
      id(value) && (index === 0 || Number(input[index - 1]) < Number(value)),
  );
}
/** Unit IDs in strictly ascending order; may be empty (the Candy revision). */
function ascendingIds(input: unknown): boolean {
  return (
    isDenseArrayV7(input) &&
    input.every(
      (value, index) =>
        id(value) && (index === 0 || Number(input[index - 1]) < Number(value)),
    )
  );
}
/**
 * The frozen sea (naval branch section 8.9) `UNITS_CRUSHED` results:
 * non-empty, in strictly increasing unit-ID order; each a hit of 1 to
 * `ICE_CRUSH_DAMAGE_V7` split between HP and a Shield.
 */
function crushResults(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  let prior = 0;
  for (const result of input) {
    if (
      !hasExactKeysV7(result, [
        "damage",
        "hpAfter",
        "shieldDamage",
        "unitId",
      ]) ||
      !id(result.unitId) ||
      !nn(result.damage) ||
      !nn(result.shieldDamage) ||
      !nn(result.hpAfter) ||
      Number(result.shieldDamage) > SHIELD_CAP_V7 ||
      Number(result.damage) + Number(result.shieldDamage) < 1 ||
      Number(result.damage) + Number(result.shieldDamage) >
        ICE_CRUSH_DAMAGE_V7 ||
      Number(result.unitId) <= prior
    )
      return false;
    prior = Number(result.unitId);
  }
  return true;
}
/** The Ice Folk revision: the source of a `UNITS_CHILLED`. */
function chillSource(input: unknown): boolean {
  return (
    input === "BOLAS" ||
    input === "COLD_SNAP" ||
    input === "COLD_AURA" ||
    // The frozen sea (naval branch section 8.8): Black Ice.
    input === "BLACK_ICE" ||
    // The ninth unit (`pulp_wars-w49.17`, 7r55): a Musk Ox's Frostbite.
    input === "FROSTBITE" ||
    // The giants' signatures (section 6.6): a Frost Giant's shards.
    input === "SHARDS"
  );
}
/**
 * The Ice Folk revision `UNITS_CHILLED` results: non-empty, in strictly
 * increasing unit-ID order, never the source, each an applied Chill entry
 * (`turnsLeft` 2, `sluggish` a boolean).
 */
function chillResults(input: unknown, sourceUnitId: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  let prior = 0;
  for (const result of input) {
    if (
      !hasExactKeysV7(result, ["sluggish", "turnsLeft", "unitId"]) ||
      !id(result.unitId) ||
      result.unitId === sourceUnitId ||
      typeof result.sluggish !== "boolean" ||
      result.turnsLeft !== 2 ||
      Number(result.unitId) <= prior
    )
      return false;
    prior = Number(result.unitId);
  }
  return true;
}
/**
 * The Ice Folk revision (section 6.5): `UNITS_CHILLED` projected to a viewer
 * that owns a target but cannot see the source (`sourceUnitId` null).
 */
function parseProjectedUnitsChilled(input: unknown): PlayerEventV7 | null {
  return hasExactKeysV7(input, FIELDS.UNITS_CHILLED) &&
    input.kind === "UNITS_CHILLED" &&
    input.sourceUnitId === null &&
    id(input.playerId) &&
    chillSource(input.source) &&
    chillResults(input.results, null)
    ? (input as unknown as PlayerEventV7)
    : null;
}
/**
 * The frozen sea (naval branch section 12): `WATER_FROZEN` projected to a
 * viewer that explored a frozen tile but cannot see the freezing unit
 * (`unitId` null).
 */
function parseProjectedWaterFrozen(input: unknown): PlayerEventV7 | null {
  return hasExactKeysV7(input, FIELDS.WATER_FROZEN) &&
    input.kind === "WATER_FROZEN" &&
    input.unitId === null &&
    id(input.playerId) &&
    sortedCoords(input.tiles) &&
    (input.tiles as readonly unknown[]).length > 0 &&
    ascendingIds(input.icebound)
    ? (input as unknown as PlayerEventV7)
    : null;
}
/**
 * Tend results: revision 14 may tend a full-HP unit (amount 0) only when it
 * cures Plague or Bitten (and the Ice Folk revision: Chill).
 */
function tendResults(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  let prior = 0;
  for (const result of input) {
    if (
      !hasExactKeysV7(result, [
        "amount",
        "curedBitten",
        "curedChill",
        "curedPlague",
        "hpAfter",
        "unitId",
      ]) ||
      !id(result.unitId) ||
      !nn(result.amount) ||
      // The Dwarf revision (section 9.1): Repair heals a machine 4.
      Number(result.amount) > REPAIR_MACHINE_V7 ||
      typeof result.curedPlague !== "boolean" ||
      typeof result.curedBitten !== "boolean" ||
      // The Ice Folk revision section 10.5: Tend Wounded cures Chill.
      typeof result.curedChill !== "boolean" ||
      (result.amount === 0 &&
        !result.curedPlague &&
        !result.curedBitten &&
        !result.curedChill) ||
      !pos(result.hpAfter) ||
      Number(result.unitId) <= prior
    )
      return false;
    prior = Number(result.unitId);
  }
  return true;
}
/**
 * Raise Dead results: new Skeletons in strictly increasing (y, x) Grave order
 * and strictly increasing unit IDs, none of them the raising Necromancer.
 * Emptiness is checked by the caller: a projection may filter every entry.
 */
function raisedResults(input: unknown, raiserId: unknown): boolean {
  if (!isDenseArrayV7(input)) return false;
  let priorId = 0;
  let prior: { readonly x: number; readonly y: number } | null = null;
  for (const result of input) {
    if (!hasExactKeysV7(result, ["at", "unitId"]) || !id(result.unitId))
      return false;
    const at = parseCoordV7(result.at);
    if (
      at === null ||
      result.unitId === raiserId ||
      Number(result.unitId) <= priorId ||
      (prior !== null && (at.y - prior.y || at.x - prior.x) <= 0)
    )
      return false;
    priorId = Number(result.unitId);
    prior = at;
  }
  return true;
}
/**
 * The Martian revision `SHIELDS_RECHARGED` results: non-empty, in strictly
 * increasing unit-ID order, each with a Shield from 1 to 4.
 */
function shieldResults(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  let prior = 0;
  for (const result of input) {
    if (
      !hasExactKeysV7(result, ["shield", "unitId"]) ||
      !id(result.unitId) ||
      !pos(result.shield) ||
      Number(result.shield) > SHIELD_CAP_V7 ||
      Number(result.unitId) <= prior
    )
      return false;
    prior = Number(result.unitId);
  }
  return true;
}
function healingResults(input: unknown): boolean {
  if (!isDenseArrayV7(input) || input.length === 0) return false;
  let prior = 0;
  for (const result of input) {
    if (
      !hasExactKeysV7(result, ["amount", "hpAfter", "unitId"]) ||
      !id(result.unitId) ||
      !pos(result.amount) ||
      Number(result.amount) > 6 ||
      !pos(result.hpAfter) ||
      Number(result.unitId) <= prior
    )
      return false;
    prior = Number(result.unitId);
  }
  return true;
}
// The reward ladder rework (`pulp_wars-zypi`): a queued choice lists the
// current candidates (`rewardCandidatesForLevelV7`); a chosen reward may
// be one of the ladder before it, as a city's reward record may.
function rewards(input: unknown, level: number): boolean {
  const list = cityRewardCandidatesV7(level);
  return (
    list !== null &&
    isDenseArrayV7(input) &&
    list.join() === (input as unknown[]).join()
  );
}
function rewardMatches(reward: RewardIdV7, level: number): boolean {
  return cityRewardRecordMatchesLevelV7(reward, level);
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
/**
 * A ship's training cost. Every faction registers the same ships (the naval
 * branch section 7: no faction rule applies to a boat), so the Human
 * registration is every seat's.
 */
function trainingCost(role: NavalRoleIdV7): number {
  return effectiveRoleRuleV7(role, "ORIGINAL").cost ?? 0;
}
/**
 * Context-free event parsing cannot see the owner's faction, so a land
 * training or Disband amount is accepted when it matches the role's cost in
 * any registered faction (revision 13: the Ghoul costs 3, the Raider 4).
 */
function trainingCosts(role: UnitRoleIdV7): readonly number[] {
  return FACTION_IDS_V7.map(
    (faction) => effectiveRoleRuleV7(role, faction).cost ?? 0,
  );
}
function restoredResource(
  value: unknown,
  improvement: ImprovementIdV7,
): boolean {
  // Revision 12: removal re-exposes the kept resource. Farm and Mine always
  // hide theirs; other buildings and Monuments may hide masked Fertile Ground.
  return (
    value === expectedRestoredResource(improvement) ||
    (value === "FERTILE_GROUND" &&
      improvement !== "MINE" &&
      improvement !== "LUMBER_CAMP" &&
      improvement !== "PORT" &&
      improvement !== "SHIPYARD")
  );
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
