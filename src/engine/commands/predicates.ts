import { captureEligibility } from "../capture/eligibility";
import { isExplored } from "../fog/exploration";
import type { PlayerId, UnitId } from "../model/ids";
import type {
  CityState,
  Coord,
  GameState,
  PlayerState,
  RewardId,
  TechId,
  UnitState,
  UnitType,
  CombatTargetRef,
  CardinalDirection,
} from "../model/types";
import { movementDistance, validateMovementPath } from "../movement/movement";
import {
  cityHasTrainingCapacity,
  cityGrowthWouldOverflow,
  isCityBesieged,
  playerIncome,
  totalIncome,
  technologyCost,
  technologyPrerequisitesMet,
  unitTypeIsUnlocked,
} from "../rules/economy";
import { effectiveUnitRule, requireRuleset } from "../rules/ruleset";
import { arePlayersAllied } from "../rules/relationships";
import {
  nearestViableCandifyCities,
  removalWouldDisconnectCity,
  territoryOwnerId,
} from "../territory/connectivity";
import { ruleError, type RuleError } from "./errors";
import type { Command } from "./types";

export type CommandEligibility =
  | { readonly legal: true }
  | { readonly legal: false; readonly error: RuleError };

const LEGAL: CommandEligibility = { legal: true };

export function commandEligibility(
  state: GameState,
  actor: PlayerId,
  command: Command,
): CommandEligibility {
  if (state.outcome !== null) return illegal(ruleError("MATCH_ENDED"));
  const activePlayer = state.turnOrder[state.activeSeatIndex];
  if (activePlayer !== actor) return illegal(ruleError("NOT_ACTIVE_PLAYER"));
  const player = state.players.find((candidate) => candidate.id === actor);
  if (player?.status !== "ACTIVE") {
    return illegal(ruleError("NOT_ACTIVE_PLAYER"));
  }
  if (
    state.pendingChoice !== null &&
    !(
      (state.pendingChoice.kind === "CITY_REWARD" &&
        command.kind === "CHOOSE_CITY_REWARD") ||
      (state.pendingChoice.kind === "CANDIFY_CITY" &&
        command.kind === "CHOOSE_CANDIFY_CITY")
    )
  ) {
    return illegal(
      ruleError("PENDING_CHOICE", { kind: state.pendingChoice.kind }),
    );
  }

  switch (command.kind) {
    case "RESEARCH":
      return researchEligibility(state, player, command.tech);
    case "HARVEST_FRUIT":
      return fruitEligibility(state, player, command.at);
    case "HUNT_ANIMAL":
      return animalEligibility(state, player, command.at);
    case "BUILD_LUMBER_MILL":
      return lumberMillEligibility(state, player, command.at);
    case "BUILD_MINE":
      return mineEligibility(state, player, command.at);
    case "CHOOSE_CITY_REWARD":
      return rewardEligibility(state, player, command.cityId, command.reward);
    case "CAPTURE": {
      const targetUnit = state.units.find(
        (candidate) => candidate.id === command.unitId && candidate.hp > 0,
      );
      if (targetUnit !== undefined && targetUnit.ownerId === player.id) {
        const city = state.cities.find((candidate) =>
          sameCoord(candidate.at, targetUnit.at),
        );
        if (
          city !== undefined &&
          arePlayersAllied(
            state.setup.aiMode,
            state.humanPlayerId,
            player.id,
            city.ownerId,
          )
        ) {
          return illegal(ruleError("TARGET_ALLIED"));
        }
      }
      const capture = captureEligibility(state, command.unitId);
      if (!capture.eligible) {
        return illegal(
          ruleError("CAPTURE_NOT_ELIGIBLE", { reason: capture.reason }),
        );
      }
      const unit = state.units.find(
        (candidate) => candidate.id === command.unitId,
      );
      if (
        unit === undefined ||
        unit.activation.moved ||
        unit.activation.attacked ||
        unit.activation.recovered ||
        unit.activation.captured
      ) {
        return illegal(
          ruleError("CAPTURE_NOT_ELIGIBLE", { reason: "UNIT_ALREADY_ACTED" }),
        );
      }
      return LEGAL;
    }
    case "TRAIN":
      return trainEligibility(state, player, command.cityId, command.unit);
    case "MOVE":
      return moveEligibility(
        state,
        player,
        command.unitId,
        command.path,
        false,
      );
    case "ESCAPE_MOVE":
      return moveEligibility(state, player, command.unitId, command.path, true);
    case "ATTACK":
      return attackEligibility(state, player, command.unitId, command.target);
    case "KAMIKAZE_ROLL":
      return rollEligibility(state, player, command.unitId, command.direction);
    case "BUILD_CHOCOLATE_WALL":
      return wallBuildEligibility(state, player, command.unitId, command.at);
    case "CANDIFY":
      return candifyEligibility(state, player, command.unitId);
    case "CHOOSE_CANDIFY_CITY":
      return candifyChoiceEligibility(
        state,
        player,
        command.unitId,
        command.cityId,
      );
    case "RECOVER":
      return recoverEligibility(state, player, command.unitId);
    case "WAIT":
      return waitEligibility(state, player, command.unitId);
    case "PROMOTE":
      return promotionEligibility(state, player, command.unitId);
    case "END_TURN":
      return endTurnEligibility(state, player);
  }
}

function endTurnEligibility(
  state: GameState,
  player: PlayerState,
): CommandEligibility {
  try {
    totalIncome(playerIncome(state, player.id));
    for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
      const index = (state.activeSeatIndex + offset) % state.turnOrder.length;
      const playerId = state.turnOrder[index];
      const next = state.players.find(
        (candidate) =>
          candidate.id === playerId && candidate.status === "ACTIVE",
      );
      if (next === undefined) continue;
      const income = totalIncome(playerIncome(state, next.id));
      if (!Number.isSafeInteger(next.stars + income)) {
        return illegal(ruleError("INTEGER_OVERFLOW", { playerId: next.id }));
      }
      break;
    }
  } catch (error) {
    if (error instanceof RangeError) {
      return illegal(ruleError("INTEGER_OVERFLOW", { playerId: player.id }));
    }
    throw error;
  }
  return LEGAL;
}

export function trainEligibility(
  state: GameState,
  player: PlayerState,
  cityId: CityState["id"],
  unitType: UnitType,
): CommandEligibility {
  const city = state.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return illegal(ruleError("CITY_NOT_FOUND"));
  if (city.ownerId !== player.id) return illegal(ruleError("CITY_NOT_OWNED"));
  if (isCityBesieged(state, city)) {
    return illegal(ruleError("CITY_BESIEGED", { cityId: city.id }));
  }
  if (
    state.pendingChoice?.kind === "CITY_REWARD" &&
    state.pendingChoice.cityId === city.id
  ) {
    return illegal(
      ruleError("PENDING_CHOICE", { kind: state.pendingChoice.kind }),
    );
  }
  if (!unitTypeIsUnlocked(player, unitType)) {
    return illegal(ruleError("UNIT_TYPE_LOCKED", { unit: unitType }));
  }
  if (!cityHasTrainingCapacity(state, city)) {
    return illegal(ruleError("CITY_CAPACITY_FULL", { cityId: city.id }));
  }
  if (state.units.some((unit) => unit.hp > 0 && sameCoord(unit.at, city.at))) {
    return illegal(ruleError("CITY_SPAWN_OCCUPIED", { cityId: city.id }));
  }
  if (state.chocolateWalls.some((wall) => sameCoord(wall.at, city.at))) {
    return illegal(ruleError("CITY_SPAWN_OCCUPIED", { cityId: city.id }));
  }
  const cost = requireRuleset(state.rulesetId).units[unitType].cost;
  return player.stars < cost
    ? illegal(ruleError("INSUFFICIENT_STARS", { cost }))
    : LEGAL;
}

export function moveEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
  path: readonly Coord[],
  escape: boolean,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  const unit = owned.unit;
  if (!unit.ready) return illegal(ruleError("UNIT_NOT_READY", { unitId }));
  if (escape) {
    const rule = effectiveUnitRule(state.rulesetId, player.faction, unit.type);
    if (
      !rule.abilities.includes("ESCAPE") ||
      !unit.activation.escapeAvailable
    ) {
      return illegal(
        ruleError("MOVEMENT_ILLEGAL", { reason: "ESCAPE_UNAVAILABLE" }),
      );
    }
  } else if (
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  ) {
    return illegal(ruleError("UNIT_ALREADY_ACTED", { unitId }));
  }
  const budget = escape
    ? 2
    : effectiveUnitRule(state.rulesetId, player.faction, unit.type).move;
  const pathResult = validateMovementPath(state, unit, path, budget);
  if (!pathResult.legal && pathResult.reason === "ALLY_TERRITORY_FORBIDDEN") {
    const at = firstAlliedPathStep(state, player.id, path);
    return illegal(
      ruleError(
        "ALLY_TERRITORY_FORBIDDEN",
        at === null ? {} : { at: { x: at.x, y: at.y } },
      ),
    );
  }
  return pathResult.legal
    ? LEGAL
    : illegal(ruleError("MOVEMENT_ILLEGAL", { reason: pathResult.reason }));
}

export function attackEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
  target: CombatTargetRef,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  const attacker = owned.unit;
  if (!attacker.ready) return illegal(ruleError("UNIT_NOT_READY", { unitId }));
  if (
    attacker.activation.attacked ||
    attacker.activation.recovered ||
    attacker.activation.captured ||
    attacker.activation.specialActed
  ) {
    return illegal(ruleError("UNIT_ALREADY_ACTED", { unitId }));
  }
  const rule = effectiveUnitRule(
    state.rulesetId,
    player.faction,
    attacker.type,
  );
  if (rule.attack === 0 || rule.range === 0) {
    return illegal(ruleError("ATTACK_NOT_LEGAL", { reason: "NO_ATTACK" }));
  }
  if (attacker.activation.moved && !rule.abilities.includes("DASH")) {
    return illegal(ruleError("ATTACK_NOT_LEGAL", { reason: "NO_DASH" }));
  }
  const defender =
    target.kind === "UNIT"
      ? state.units.find((unit) => unit.id === target.unitId && unit.hp > 0)
      : undefined;
  const wall =
    target.kind === "CHOCOLATE_WALL"
      ? state.chocolateWalls.find(
          (candidate) => candidate.id === target.wallId && candidate.hp > 0,
        )
      : undefined;
  const targetAt = defender?.at ?? wall?.at;
  if (targetAt === undefined) {
    return illegal(
      ruleError("ATTACK_NOT_LEGAL", { reason: "TARGET_NOT_FOUND" }),
    );
  }
  if (defender?.ownerId === player.id) {
    return illegal(
      ruleError("ATTACK_NOT_LEGAL", { reason: "TARGET_FRIENDLY" }),
    );
  }
  if (!isExplored(player.explored, targetAt)) {
    return illegal(
      ruleError("ATTACK_NOT_LEGAL", { reason: "TARGET_UNEXPLORED" }),
    );
  }
  if (
    defender !== undefined &&
    arePlayersAllied(
      state.setup.aiMode,
      state.humanPlayerId,
      player.id,
      defender.ownerId,
    )
  ) {
    return illegal(ruleError("TARGET_ALLIED"));
  }
  if (movementDistance(attacker.at, targetAt) > rule.range) {
    return illegal(ruleError("ATTACK_NOT_LEGAL", { reason: "OUT_OF_RANGE" }));
  }
  return LEGAL;
}

export function recoverEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  const unit = owned.unit;
  if (!unit.ready) return illegal(ruleError("UNIT_NOT_READY", { unitId }));
  if (
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  ) {
    return illegal(ruleError("UNIT_ALREADY_ACTED", { unitId }));
  }
  return unit.hp >= unit.maxHp
    ? illegal(ruleError("RECOVER_NOT_LEGAL", { reason: "FULL_HP" }))
    : LEGAL;
}

export function rollEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
  direction: CardinalDirection,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  const unit = owned.unit;
  if (!unit.ready) return illegal(ruleError("UNIT_NOT_READY", { unitId }));
  if (player.faction !== "CANDY" || unit.type !== "RIDER") {
    return illegal(ruleError("UNIT_TYPE_INVALID", { expected: "CANDY_DONUT" }));
  }
  if (
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  )
    return illegal(ruleError("UNIT_ALREADY_ACTED", { unitId }));
  const delta = directionDelta(direction);
  const adjacent = { x: unit.at.x + delta.x, y: unit.at.y + delta.y };
  return tileAt(state, adjacent) === undefined
    ? illegal(ruleError("ROLL_DIRECTION_INVALID", { direction }))
    : LEGAL;
}

export function wallBuildEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
  at: Coord,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  const unit = owned.unit;
  if (!unit.ready) return illegal(ruleError("UNIT_NOT_READY", { unitId }));
  if (player.faction !== "CANDY" || unit.type !== "DEFENDER") {
    return illegal(
      ruleError("UNIT_TYPE_INVALID", { expected: "CANDY_CHOCO_ENGINEER" }),
    );
  }
  if (
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  )
    return illegal(ruleError("UNIT_ALREADY_ACTED", { unitId }));
  const tile = tileAt(state, at);
  if (tile === undefined) return illegal(ruleError("TILE_NOT_FOUND"));
  if (!isExplored(player.explored, at))
    return illegal(ruleError("TILE_UNEXPLORED"));
  if (movementDistance(unit.at, at) !== 1) {
    return illegal(
      ruleError("WALL_TARGET_NOT_ADJACENT", { at: { x: at.x, y: at.y } }),
    );
  }
  if (
    tile.site !== null ||
    state.units.some(
      (candidate) => candidate.hp > 0 && sameCoord(candidate.at, at),
    ) ||
    state.chocolateWalls.some((wall) => sameCoord(wall.at, at))
  )
    return illegal(
      ruleError("WALL_INVALID_TILE", { at: { x: at.x, y: at.y } }),
    );
  const city = cityForTerritory(state, tile.territoryCityId);
  if (
    city !== null &&
    arePlayersAllied(
      state.setup.aiMode,
      state.humanPlayerId,
      player.id,
      city.ownerId,
    )
  )
    return illegal(
      ruleError("ALLY_TERRITORY_FORBIDDEN", { at: { x: at.x, y: at.y } }),
    );
  return player.stars < 1
    ? illegal(ruleError("INSUFFICIENT_STARS", { cost: 1 }))
    : LEGAL;
}

export function candifyEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  const unit = owned.unit;
  // A non-Dash Candy unit becomes non-ready after Move, but Candify's explicit
  // move-then-sacrifice exception remains available for that activation.
  if (!unit.ready && !unit.activation.moved)
    return illegal(ruleError("UNIT_NOT_READY", { unitId }));
  if (player.faction !== "CANDY")
    return illegal(ruleError("CANDY_FACTION_REQUIRED"));
  if (
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  )
    return illegal(ruleError("UNIT_ALREADY_ACTED", { unitId }));
  const tile = tileAt(state, unit.at);
  const previousOwnerId =
    tile === undefined ? null : territoryOwnerId(state, tile.territoryCityId);
  if (
    tile === undefined ||
    !isExplored(player.explored, unit.at) ||
    tile.site !== null ||
    previousOwnerId === player.id
  )
    return illegal(ruleError("CANDIFY_INVALID_TILE"));
  if (
    previousOwnerId !== null &&
    arePlayersAllied(
      state.setup.aiMode,
      state.humanPlayerId,
      player.id,
      previousOwnerId,
    )
  )
    return illegal(ruleError("TARGET_ALLIED"));
  if (
    tile.territoryCityId !== null &&
    previousOwnerId !== null &&
    previousOwnerId !== player.id &&
    removalWouldDisconnectCity(state, tile.territoryCityId, unit.at)
  )
    return illegal(ruleError("CANDIFY_WOULD_DISCONNECT"));
  return nearestViableCandifyCities(state, player.id, unit).length === 0
    ? illegal(ruleError("CANDIFY_NO_ADJACENT_CITY"))
    : LEGAL;
}

export function candifyChoiceEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
  cityId: CityState["id"],
): CommandEligibility {
  const pending = state.pendingChoice;
  if (
    pending === null ||
    pending.kind !== "CANDIFY_CITY" ||
    pending.unitId !== unitId
  )
    return illegal(ruleError("CANDIFY_CHOICE_INVALID"));
  const city = state.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return illegal(ruleError("CITY_NOT_FOUND"));
  if (city.ownerId !== player.id) return illegal(ruleError("CITY_NOT_OWNED"));
  return pending.candidateCityIds.includes(city.id)
    ? LEGAL
    : illegal(ruleError("CANDIFY_CITY_NOT_CANDIDATE"));
}

function directionDelta(direction: CardinalDirection): Coord {
  switch (direction) {
    case "NORTH":
      return { x: 0, y: -1 };
    case "EAST":
      return { x: 1, y: 0 };
    case "SOUTH":
      return { x: 0, y: 1 };
    case "WEST":
      return { x: -1, y: 0 };
  }
}

function tileAt(state: GameState, at: Coord) {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= state.board.width ||
    at.y >= state.board.height
  )
    return undefined;
  return state.board.tiles[at.y * state.board.width + at.x];
}

export function waitEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  return owned.unit.activation.handled
    ? illegal(ruleError("UNIT_ALREADY_HANDLED", { unitId }))
    : LEGAL;
}

export function promotionEligibility(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
): CommandEligibility {
  const owned = ownedUnit(state, player, unitId);
  if (!owned.legal) return owned;
  const rules = requireRuleset(state.rulesetId);
  return !owned.unit.veteran && owned.unit.kills >= rules.promotionKills
    ? LEGAL
    : illegal(ruleError("PROMOTION_NOT_ELIGIBLE", { unitId }));
}

export function researchEligibility(
  state: GameState,
  player: PlayerState,
  tech: TechId,
): CommandEligibility {
  const rule = requireRuleset(state.rulesetId).technologies.find(
    (candidate) => candidate.id === tech,
  );
  if (rule === undefined) {
    return illegal(ruleError("INVALID_COMMAND", { field: "RESEARCH.tech" }));
  }
  if (player.researchedTechs.includes(tech)) {
    return illegal(ruleError("TECH_ALREADY_RESEARCHED", { tech }));
  }
  if (!technologyPrerequisitesMet(player, tech)) {
    return illegal(ruleError("TECH_PREREQUISITE_MISSING", { tech }));
  }
  const cost = technologyCost(state, player.id, tech);
  if (player.stars < cost) {
    return illegal(ruleError("INSUFFICIENT_STARS", { cost }));
  }
  return LEGAL;
}

export function mineEligibility(
  state: GameState,
  player: PlayerState,
  at: { readonly x: number; readonly y: number },
): CommandEligibility {
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (tile === undefined) return illegal(ruleError("TILE_NOT_FOUND"));
  if (!isExplored(player.explored, at)) {
    return illegal(ruleError("TILE_UNEXPLORED"));
  }
  if (!player.researchedTechs.includes("MINING")) {
    return illegal(ruleError("MINING_REQUIRED"));
  }
  if (
    tile.terrain !== "MOUNTAIN" ||
    tile.resource !== "ORE" ||
    tile.improvement !== null
  ) {
    return illegal(ruleError("MINE_INVALID_TILE"));
  }
  const city = cityForTerritory(state, tile.territoryCityId);
  if (city === null || city.ownerId !== player.id) {
    return illegal(ruleError("TERRITORY_NOT_OWNED"));
  }
  if (isCityBesieged(state, city)) {
    return illegal(ruleError("CITY_BESIEGED", { cityId: city.id }));
  }
  if (
    cityGrowthWouldOverflow(
      city,
      requireRuleset(state.rulesetId).minePopulation,
    )
  )
    return illegal(ruleError("INTEGER_OVERFLOW", { cityId: city.id }));
  const cost = requireRuleset(state.rulesetId).mineCost;
  if (player.stars < cost) {
    return illegal(ruleError("INSUFFICIENT_STARS", { cost }));
  }
  return LEGAL;
}

export function fruitEligibility(
  state: GameState,
  player: PlayerState,
  at: { readonly x: number; readonly y: number },
): CommandEligibility {
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (tile === undefined) return illegal(ruleError("TILE_NOT_FOUND"));
  if (!isExplored(player.explored, at))
    return illegal(ruleError("TILE_UNEXPLORED"));
  if (!player.researchedTechs.includes("ORGANIZATION"))
    return illegal(ruleError("ORGANIZATION_REQUIRED"));
  if (
    tile.terrain !== "GRASS" ||
    tile.resource !== "FRUIT" ||
    tile.improvement !== null
  )
    return illegal(ruleError("FRUIT_INVALID_TILE"));
  const city = cityForTerritory(state, tile.territoryCityId);
  if (city === null || city.ownerId !== player.id)
    return illegal(ruleError("TERRITORY_NOT_OWNED"));
  if (isCityBesieged(state, city))
    return illegal(ruleError("CITY_BESIEGED", { cityId: city.id }));
  if (
    cityGrowthWouldOverflow(
      city,
      requireRuleset(state.rulesetId).fruitPopulation,
    )
  )
    return illegal(ruleError("INTEGER_OVERFLOW", { cityId: city.id }));
  const cost = requireRuleset(state.rulesetId).fruitCost;
  return player.stars < cost
    ? illegal(ruleError("INSUFFICIENT_STARS", { cost }))
    : LEGAL;
}

export function animalEligibility(
  state: GameState,
  player: PlayerState,
  at: Coord,
): CommandEligibility {
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (tile === undefined) return illegal(ruleError("TILE_NOT_FOUND"));
  if (!isExplored(player.explored, at))
    return illegal(ruleError("TILE_UNEXPLORED"));
  if (!player.researchedTechs.includes("HUNTING"))
    return illegal(ruleError("HUNTING_REQUIRED"));
  if (
    tile.terrain !== "FOREST" ||
    tile.resource !== "ANIMAL" ||
    tile.improvement !== null
  )
    return illegal(ruleError("ANIMAL_INVALID_TILE"));
  const city = cityForTerritory(state, tile.territoryCityId);
  if (city === null || city.ownerId !== player.id)
    return illegal(ruleError("TERRITORY_NOT_OWNED"));
  if (isCityBesieged(state, city))
    return illegal(ruleError("CITY_BESIEGED", { cityId: city.id }));
  const rules = requireRuleset(state.rulesetId);
  if (cityGrowthWouldOverflow(city, rules.animalPopulation))
    return illegal(ruleError("INTEGER_OVERFLOW", { cityId: city.id }));
  return player.stars < rules.animalCost
    ? illegal(ruleError("INSUFFICIENT_STARS", { cost: rules.animalCost }))
    : LEGAL;
}

export function lumberMillEligibility(
  state: GameState,
  player: PlayerState,
  at: Coord,
): CommandEligibility {
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  if (tile === undefined) return illegal(ruleError("TILE_NOT_FOUND"));
  if (!isExplored(player.explored, at))
    return illegal(ruleError("TILE_UNEXPLORED"));
  if (!player.researchedTechs.includes("FORESTRY"))
    return illegal(ruleError("FORESTRY_REQUIRED"));
  if (
    tile.terrain !== "FOREST" ||
    tile.resource !== null ||
    tile.improvement !== null
  )
    return illegal(ruleError("LUMBER_MILL_INVALID_TILE"));
  const city = cityForTerritory(state, tile.territoryCityId);
  if (city === null || city.ownerId !== player.id)
    return illegal(ruleError("TERRITORY_NOT_OWNED"));
  if (isCityBesieged(state, city))
    return illegal(ruleError("CITY_BESIEGED", { cityId: city.id }));
  const rules = requireRuleset(state.rulesetId);
  if (cityGrowthWouldOverflow(city, rules.lumberMillPopulation))
    return illegal(ruleError("INTEGER_OVERFLOW", { cityId: city.id }));
  return player.stars < rules.lumberMillCost
    ? illegal(ruleError("INSUFFICIENT_STARS", { cost: rules.lumberMillCost }))
    : LEGAL;
}

export function rewardEligibility(
  state: GameState,
  player: PlayerState,
  cityId: CityState["id"],
  reward: RewardId,
): CommandEligibility {
  const city = state.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return illegal(ruleError("CITY_NOT_FOUND"));
  if (city.ownerId !== player.id) return illegal(ruleError("CITY_NOT_OWNED"));
  if (
    state.pendingChoice === null ||
    state.pendingChoice.kind !== "CITY_REWARD" ||
    state.pendingChoice.cityId !== city.id
  ) {
    return illegal(ruleError("CITY_REWARD_INVALID", { reward }));
  }
  const pending = state.pendingChoice;
  const allowed = requireRuleset(state.rulesetId).cityLevels.find(
    (rule) => rule.level === pending.level,
  )?.rewards;
  if (allowed === undefined || !allowed.includes(reward)) {
    return illegal(ruleError("CITY_REWARD_INVALID", { reward }));
  }
  if (
    (pending.level === 2 && city.rewardLevel2 !== null) ||
    (pending.level === 3 && city.rewardLevel3 !== null)
  ) {
    return illegal(ruleError("CITY_REWARD_INVALID", { reward }));
  }
  if (isCityBesieged(state, city)) {
    return illegal(ruleError("CITY_BESIEGED", { cityId: city.id }));
  }
  return LEGAL;
}

function cityForTerritory(
  state: GameState,
  cityId: CityState["id"] | null,
): CityState | null {
  if (cityId === null) return null;
  return state.cities.find((city) => city.id === cityId) ?? null;
}

function illegal(error: RuleError): CommandEligibility {
  return { legal: false, error };
}

type OwnedUnitResult =
  | { readonly legal: true; readonly unit: UnitState }
  | { readonly legal: false; readonly error: RuleError };

function ownedUnit(
  state: GameState,
  player: PlayerState,
  unitId: UnitId,
): OwnedUnitResult {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined)
    return { legal: false, error: ruleError("UNIT_NOT_FOUND", { unitId }) };
  if (unit.ownerId !== player.id) {
    return { legal: false, error: ruleError("UNIT_NOT_OWNED", { unitId }) };
  }
  return { legal: true, unit };
}

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}

function firstAlliedPathStep(
  state: GameState,
  playerId: PlayerId,
  path: readonly Coord[],
): Coord | null {
  for (const at of path) {
    const tile = state.board.tiles[at.y * state.board.width + at.x];
    const city = state.cities.find(
      (candidate) => candidate.id === tile?.territoryCityId,
    );
    if (
      city !== undefined &&
      arePlayersAllied(
        state.setup.aiMode,
        state.humanPlayerId,
        playerId,
        city.ownerId,
      )
    ) {
      return at;
    }
  }
  return null;
}
