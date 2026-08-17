import { capturableTargetForUnit } from "../capture/eligibility";
import type { Command } from "./types";
import type { DomainEvent } from "../events/types";
import {
  revealAfterUnitStepForPlayer,
  revealRadiusForPlayer,
} from "../fog/exploration";
import { calculateCombatPreview } from "../combat/combat";
import {
  allocateCityId,
  allocateUnitId,
  allocateWallId,
  type PlayerId,
} from "../model/ids";
import type {
  CardinalDirection,
  CityState,
  GameState,
  MatchOutcome,
  PendingChoice,
  UnitState,
} from "../model/types";
import { validateMovementPath } from "../movement/movement";
import { growCity, technologyCost } from "../rules/economy";
import { effectiveUnitRule, requireRuleset } from "../rules/ruleset";
import {
  nearestViableCandifyCities,
  territoryOwnerId,
} from "../territory/connectivity";

export interface ReductionResult {
  readonly state: GameState;
  readonly events: readonly DomainEvent[];
}

export function reduceResearch(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "RESEARCH" }>,
): ReductionResult {
  const cost = technologyCost(state, playerId, command.tech);
  const players = state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          stars: player.stars - cost,
          researchedTechs: [...player.researchedTechs, command.tech],
        }
      : player,
  );
  return {
    state: { ...state, players },
    events: [{ kind: "TECH_RESEARCHED", playerId, tech: command.tech, cost }],
  };
}

export function reduceTrain(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "TRAIN" }>,
): ReductionResult {
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (city === undefined)
    throw new RangeError("Validated training city disappeared");
  const rule = requireRuleset(state.rulesetId).units[command.unit];
  const allocation = allocateUnitId(state.nextEntityId);
  const trained: UnitState = {
    id: allocation.id,
    ownerId: playerId,
    homeCityId: city.id,
    capacityExempt: false,
    type: command.unit,
    at: city.at,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    ready: false,
    captureEligible: false,
    activation: {
      moved: false,
      attacked: false,
      recovered: false,
      captured: false,
      handled: true,
      escapeAvailable: false,
      specialActed: false,
    },
  };
  return {
    state: {
      ...state,
      nextEntityId: allocation.nextEntityId,
      players: state.players.map((player) =>
        player.id === playerId
          ? { ...player, stars: player.stars - rule.cost }
          : player,
      ),
      units: [...state.units, trained],
    },
    events: [
      {
        kind: "UNIT_TRAINED",
        playerId,
        cityId: city.id,
        unitId: trained.id,
        unit: trained.type,
        cost: rule.cost,
        at: trained.at,
      },
    ],
  };
}

export function reduceMove(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "MOVE" | "ESCAPE_MOVE" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined)
    throw new RangeError("Validated moving unit disappeared");
  const escape = command.kind === "ESCAPE_MOVE";
  const owner = state.players.find((player) => player.id === unit.ownerId);
  if (owner === undefined)
    throw new RangeError("Moving unit owner disappeared");
  const rule = effectiveUnitRule(state.rulesetId, owner.faction, unit.type);
  const movement = validateMovementPath(
    state,
    unit,
    command.path,
    escape ? 2 : rule.move,
  );
  if (!movement.legal)
    throw new RangeError("Validated movement path became illegal");
  const movedPath = movement.traversedPath.map((at) => ({ ...at }));
  const destination = movement.destination;
  const ready = escape ? false : rule.abilities.includes("DASH");
  const units = state.units.map((candidate) =>
    candidate.id === unit.id
      ? {
          ...candidate,
          at: destination,
          ready,
          captureEligible: false,
          activation: {
            ...candidate.activation,
            moved: true,
            handled: true,
            escapeAvailable: false,
          },
        }
      : candidate,
  );
  const players = state.players.map((player) =>
    player.id === playerId
      ? { ...player, explored: movement.explored }
      : player,
  );
  const events: DomainEvent[] = [];
  if (movedPath.length > 0) {
    events.push({ kind: "UNIT_MOVED", unitId: unit.id, path: movedPath });
  }
  if (movement.interruption !== null) {
    events.push({
      kind: "UNIT_MOVE_INTERRUPTED",
      unitId: unit.id,
      at: movement.interruption.at,
      reason: movement.interruption.reason,
    });
  }
  if (movement.revealed.length > 0) {
    events.push({ kind: "TILES_REVEALED", playerId, tiles: movement.revealed });
  }
  return { state: { ...state, players, units }, events };
}

export function reduceAttack(
  state: GameState,
  command: Extract<Command, { readonly kind: "ATTACK" }>,
): ReductionResult {
  const attacker = state.units.find((unit) => unit.id === command.unitId);
  const target = command.target;
  const defender =
    target.kind === "UNIT"
      ? state.units.find((unit) => unit.id === target.unitId)
      : undefined;
  const wall =
    target.kind === "CHOCOLATE_WALL"
      ? state.chocolateWalls.find((candidate) => candidate.id === target.wallId)
      : undefined;
  if (
    attacker === undefined ||
    (defender === undefined && wall === undefined)
  ) {
    throw new RangeError("Validated combatant disappeared");
  }
  const preview = calculateCombatPreview(state, attacker.id, command.target);
  const owner = state.players.find((player) => player.id === attacker.ownerId);
  if (owner === undefined) throw new RangeError("Attacker owner disappeared");
  const attackerRule = effectiveUnitRule(
    state.rulesetId,
    owner.faction,
    attacker.type,
  );
  const targetAt = defender?.at ?? wall?.at;
  if (targetAt === undefined) throw new RangeError("Combat target disappeared");
  const attackerAfter: UnitState = {
    ...attacker,
    at: preview.advances ? targetAt : attacker.at,
    hp: attacker.hp - preview.damageToAttacker,
    kills:
      attacker.kills + (defender !== undefined && preview.defenderDies ? 1 : 0),
    ready: attackerRule.abilities.includes("ESCAPE") && !preview.attackerDies,
    captureEligible: false,
    activation: {
      ...attacker.activation,
      attacked: true,
      handled: true,
      escapeAvailable:
        attackerRule.abilities.includes("ESCAPE") && !preview.attackerDies,
    },
  };
  const defenderAfter =
    defender === undefined
      ? undefined
      : {
          ...defender,
          hp: defender.hp - preview.damageToDefender,
          kills: defender.kills + (preview.attackerDies ? 1 : 0),
        };
  const units = state.units
    .map((unit) =>
      unit.id === attacker.id
        ? attackerAfter
        : defenderAfter !== undefined && unit.id === defenderAfter.id
          ? defenderAfter
          : unit,
    )
    .filter((unit) => unit.hp > 0);
  const events: DomainEvent[] = [{ kind: "COMBAT_RESOLVED", preview }];
  if (preview.defenderDies && defender !== undefined) {
    events.push({ kind: "UNIT_DIED", unitId: defender.id, cause: "ATTACK" });
  }
  let chocolateWalls = state.chocolateWalls;
  if (wall !== undefined) {
    chocolateWalls = preview.defenderDies
      ? state.chocolateWalls.filter((candidate) => candidate.id !== wall.id)
      : state.chocolateWalls.map((candidate) =>
          candidate.id === wall.id
            ? { ...candidate, hp: candidate.hp - preview.damageToDefender }
            : candidate,
        );
    if (preview.defenderDies) {
      events.push({
        kind: "CHOCOLATE_WALL_DESTROYED",
        wallId: wall.id,
        ownerId: wall.ownerId,
        at: wall.at,
        cause: "ATTACK",
      });
    }
  }
  if (preview.attackerDies) {
    events.push({
      kind: "UNIT_DIED",
      unitId: attacker.id,
      cause: "RETALIATION",
    });
  }
  if (preview.advances) {
    events.push({
      kind: "UNIT_MOVED",
      unitId: attacker.id,
      path: [targetAt],
    });
  }
  let players = state.players;
  if (preview.advances) {
    const player = state.players.find(
      (candidate) => candidate.id === attacker.ownerId,
    );
    if (player === undefined)
      throw new RangeError("Attacker owner disappeared");
    const reveal = revealAfterUnitStepForPlayer(
      state,
      player.id,
      player.explored,
      targetAt,
      {
        hasClimbing: player.researchedTechs.includes("CLIMBING"),
      },
    );
    players = state.players.map((candidate) =>
      candidate.id === player.id
        ? { ...candidate, explored: reveal.explored }
        : candidate,
    );
    if (reveal.revealed.length > 0) {
      events.push({
        kind: "TILES_REVEALED",
        playerId: player.id,
        tiles: reveal.revealed,
      });
    }
  }
  const stateAfterCombat: GameState = {
    ...state,
    players,
    units,
    chocolateWalls,
  };
  const outcome = evaluateMatchOutcome(stateAfterCombat);
  if (outcome !== null) events.push({ kind: "MATCH_ENDED", outcome });
  return {
    state:
      outcome === null ? stateAfterCombat : { ...stateAfterCombat, outcome },
    events,
  };
}

export function reduceKamikazeRoll(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "KAMIKAZE_ROLL" }>,
): ReductionResult {
  const roller = state.units.find((unit) => unit.id === command.unitId);
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (roller === undefined || player === undefined) {
    throw new RangeError("Validated Donut disappeared");
  }
  const delta = directionDelta(command.direction);
  const path: { x: number; y: number }[] = [];
  for (
    let at = { x: roller.at.x + delta.x, y: roller.at.y + delta.y };
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < state.board.width &&
    at.y < state.board.height;
    at = { x: at.x + delta.x, y: at.y + delta.y }
  )
    path.push(at);

  let units = [...state.units];
  let walls = [...state.chocolateWalls];
  const explored = [...player.explored];
  const events: DomainEvent[] = [];
  for (const at of path) {
    events.push({ kind: "DONUT_ROLL_STEP", unitId: roller.id, at });
    if (!explored.some((known) => sameCoord(known, at))) {
      explored.push(at);
      explored.sort((left, right) => left.y - right.y || left.x - right.x);
      events.push({ kind: "TILES_REVEALED", playerId, tiles: [at] });
    }
    const victim = units.find(
      (unit) => unit.id !== roller.id && unit.hp > 0 && sameCoord(unit.at, at),
    );
    if (victim !== undefined) {
      const damage = Math.min(10, victim.hp);
      const hpAfter = victim.hp - damage;
      events.push({
        kind: "ROLL_DAMAGE_RESOLVED",
        sourceUnitId: roller.id,
        target: { kind: "UNIT", unitId: victim.id },
        at,
        damage,
        hpBefore: victim.hp,
        hpAfter,
      });
      units =
        hpAfter === 0
          ? units.filter((unit) => unit.id !== victim.id)
          : units.map((unit) =>
              unit.id === victim.id ? { ...unit, hp: hpAfter } : unit,
            );
      if (hpAfter === 0) {
        events.push({
          kind: "UNIT_DIED",
          unitId: victim.id,
          cause: "KAMIKAZE_ROLL",
        });
      }
      continue;
    }
    const wall = walls.find((candidate) => sameCoord(candidate.at, at));
    if (wall !== undefined) {
      const damage = Math.min(10, wall.hp);
      const hpAfter = wall.hp - damage;
      events.push({
        kind: "ROLL_DAMAGE_RESOLVED",
        sourceUnitId: roller.id,
        target: { kind: "CHOCOLATE_WALL", wallId: wall.id },
        at,
        damage,
        hpBefore: wall.hp,
        hpAfter,
      });
      walls =
        hpAfter === 0
          ? walls.filter((candidate) => candidate.id !== wall.id)
          : walls.map((candidate) =>
              candidate.id === wall.id
                ? { ...candidate, hp: hpAfter }
                : candidate,
            );
      if (hpAfter === 0) {
        events.push({
          kind: "CHOCOLATE_WALL_DESTROYED",
          wallId: wall.id,
          ownerId: wall.ownerId,
          at,
          cause: "KAMIKAZE_ROLL",
        });
      }
    }
  }
  units = units.filter((unit) => unit.id !== roller.id);
  events.push({
    kind: "UNIT_DIED",
    unitId: roller.id,
    cause: "KAMIKAZE_ROLL_SELF",
  });
  const nextState: GameState = {
    ...state,
    units,
    chocolateWalls: walls,
    players: state.players.map((candidate) =>
      candidate.id === playerId ? { ...candidate, explored } : candidate,
    ),
  };
  const outcome = evaluateMatchOutcome(nextState);
  if (outcome !== null) events.push({ kind: "MATCH_ENDED", outcome });
  return {
    state: outcome === null ? nextState : { ...nextState, outcome },
    events,
  };
}

export function reduceBuildChocolateWall(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "BUILD_CHOCOLATE_WALL" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined)
    throw new RangeError("Validated Choco Engineer disappeared");
  const allocation = allocateWallId(state.nextEntityId);
  return {
    state: {
      ...state,
      nextEntityId: allocation.nextEntityId,
      players: state.players.map((player) =>
        player.id === playerId
          ? { ...player, stars: player.stars - 1 }
          : player,
      ),
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              ready: false,
              captureEligible: false,
              activation: {
                ...candidate.activation,
                handled: true,
                specialActed: true,
                escapeAvailable: false,
              },
            }
          : candidate,
      ),
      chocolateWalls: [
        ...state.chocolateWalls,
        { id: allocation.id, ownerId: playerId, at: command.at, hp: 10 },
      ],
    },
    events: [
      {
        kind: "CHOCOLATE_WALL_BUILT",
        playerId,
        unitId: unit.id,
        wallId: allocation.id,
        at: command.at,
        cost: 1,
        hp: 10,
      },
    ],
  };
}

export function reduceCandify(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "CANDIFY" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined)
    throw new RangeError("Validated Candy unit disappeared");
  const candidates = nearestViableCandifyCities(state, playerId, unit);
  if (candidates.length === 0)
    throw new RangeError("Validated Candify city disappeared");
  if (candidates.length > 1) {
    const candidateCityIds = candidates.map((city) => city.id);
    return {
      state: {
        ...state,
        pendingChoice: {
          kind: "CANDIFY_CITY",
          unitId: unit.id,
          candidateCityIds,
        },
      },
      events: [
        {
          kind: "CANDIFY_CITY_CHOICE_REQUIRED",
          playerId,
          unitId: unit.id,
          candidateCityIds,
        },
      ],
    };
  }
  const city = candidates[0];
  if (city === undefined)
    throw new RangeError("Validated Candify city missing");
  return resolveCandify(state, playerId, unit, city);
}

export function reduceChooseCandifyCity(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "CHOOSE_CANDIFY_CITY" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (unit === undefined || city === undefined)
    throw new RangeError("Validated Candify choice disappeared");
  return resolveCandify(
    { ...state, pendingChoice: null },
    playerId,
    unit,
    city,
  );
}

function resolveCandify(
  state: GameState,
  playerId: PlayerId,
  unit: UnitState,
  city: CityState,
): ReductionResult {
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, unit.at),
  );
  if (tile === undefined)
    throw new RangeError("Validated Candify tile disappeared");
  const previousCityId = tile.territoryCityId;
  const previousOwnerId = territoryOwnerId(state, previousCityId);
  const events: DomainEvent[] = [
    { kind: "UNIT_DIED", unitId: unit.id, cause: "CANDIFY" },
    {
      kind: "TILE_CANDIFIED",
      playerId,
      unitId: unit.id,
      cityId: city.id,
      at: unit.at,
      previousCityId,
      previousOwnerId,
    },
  ];
  const nextState: GameState = {
    ...state,
    units: state.units.filter((candidate) => candidate.id !== unit.id),
    board: {
      ...state.board,
      tiles: state.board.tiles.map((candidate) =>
        sameCoord(candidate.at, unit.at)
          ? {
              ...candidate,
              territoryCityId: city.id,
              territoryCenter: city.at,
            }
          : candidate,
      ),
    },
  };
  const outcome = evaluateMatchOutcome(nextState);
  if (outcome !== null) events.push({ kind: "MATCH_ENDED", outcome });
  return {
    state: outcome === null ? nextState : { ...nextState, outcome },
    events,
  };
}

function directionDelta(direction: CardinalDirection): {
  x: number;
  y: number;
} {
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

export function recoveryAmount(state: GameState, unit: UnitState): number {
  const tile = state.board.tiles[unit.at.y * state.board.width + unit.at.x];
  const city = state.cities.find(
    (candidate) => candidate.id === tile?.territoryCityId,
  );
  const rules = requireRuleset(state.rulesetId);
  return city?.ownerId === unit.ownerId
    ? rules.friendlyRecovery
    : rules.otherRecovery;
}

export function reduceRecover(
  state: GameState,
  command: Extract<Command, { readonly kind: "RECOVER" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined)
    throw new RangeError("Validated recovering unit disappeared");
  const amount = Math.min(recoveryAmount(state, unit), unit.maxHp - unit.hp);
  return {
    state: {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              hp: candidate.hp + amount,
              ready: false,
              activation: {
                ...candidate.activation,
                recovered: true,
                handled: true,
                escapeAvailable: false,
              },
            }
          : candidate,
      ),
    },
    events: [
      { kind: "UNIT_RECOVERED", unitId: unit.id, amount, automatic: false },
    ],
  };
}

export function reduceWait(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "WAIT" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined)
    throw new RangeError("Validated waiting unit disappeared");
  return {
    state: {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: { ...candidate.activation, handled: true },
            }
          : candidate,
      ),
    },
    events: [{ kind: "UNIT_WAITED", playerId, unitId: unit.id }],
  };
}

export function reducePromote(
  state: GameState,
  command: Extract<Command, { readonly kind: "PROMOTE" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined)
    throw new RangeError("Validated promoting unit disappeared");
  const maxHp = unit.maxHp + requireRuleset(state.rulesetId).promotionMaxHp;
  return {
    state: {
      ...state,
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? { ...candidate, hp: maxHp, maxHp, veteran: true }
          : candidate,
      ),
    },
    events: [{ kind: "UNIT_PROMOTED", unitId: unit.id, maxHp }],
  };
}

export function reduceBuildMine(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "BUILD_MINE" }>,
): ReductionResult {
  const ruleset = requireRuleset(state.rulesetId);
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, command.at),
  );
  const city = state.cities.find(
    (candidate) => candidate.id === tile?.territoryCityId,
  );
  if (tile === undefined || city === undefined) {
    throw new RangeError("Validated mine target disappeared");
  }
  const growth = growCity(city, ruleset.minePopulation);
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((candidate) =>
      sameCoord(candidate.at, command.at)
        ? { ...candidate, resource: null, improvement: "MINE" as const }
        : candidate,
    ),
  };
  const cities = state.cities.map((candidate) =>
    candidate.id === city.id ? growth.city : candidate,
  );
  const players = state.players.map((player) =>
    player.id === playerId
      ? { ...player, stars: player.stars - ruleset.mineCost }
      : player,
  );
  const pendingChoice =
    state.pendingChoice ?? pendingChoiceForCity(growth.city);
  const events: DomainEvent[] = [
    {
      kind: "MINE_BUILT",
      playerId,
      cityId: city.id,
      at: command.at,
      cost: ruleset.mineCost,
      populationAdded: ruleset.minePopulation,
    },
    ...growth.reachedLevels.map((level): DomainEvent => ({
      kind: "CITY_LEVELED_UP",
      cityId: city.id,
      level,
    })),
  ];
  return {
    state: { ...state, board, cities, players, pendingChoice },
    events,
  };
}

export function reduceHarvestFruit(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "HARVEST_FRUIT" }>,
): ReductionResult {
  const ruleset = requireRuleset(state.rulesetId);
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, command.at),
  );
  const city = state.cities.find(
    (candidate) => candidate.id === tile?.territoryCityId,
  );
  if (tile === undefined || city === undefined)
    throw new RangeError("Validated fruit target disappeared");
  const growth = growCity(city, ruleset.fruitPopulation);
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((candidate) =>
      sameCoord(candidate.at, command.at)
        ? { ...candidate, resource: null }
        : candidate,
    ),
  };
  const cities = state.cities.map((candidate) =>
    candidate.id === city.id ? growth.city : candidate,
  );
  const players = state.players.map((player) =>
    player.id === playerId
      ? { ...player, stars: player.stars - ruleset.fruitCost }
      : player,
  );
  const pendingChoice =
    state.pendingChoice ?? pendingChoiceForCity(growth.city);
  const events: DomainEvent[] = [
    {
      kind: "FRUIT_HARVESTED",
      playerId,
      cityId: city.id,
      at: command.at,
      cost: ruleset.fruitCost,
      populationAdded: ruleset.fruitPopulation,
    },
    ...growth.reachedLevels.map((level): DomainEvent => ({
      kind: "CITY_LEVELED_UP",
      cityId: city.id,
      level,
    })),
  ];
  return {
    state: { ...state, board, cities, players, pendingChoice },
    events,
  };
}

export function reduceHuntAnimal(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "HUNT_ANIMAL" }>,
): ReductionResult {
  const ruleset = requireRuleset(state.rulesetId);
  return reduceSinglePopulationTileAction(
    state,
    playerId,
    command.at,
    ruleset.animalCost,
    ruleset.animalPopulation,
    (tile) => ({ ...tile, resource: null }),
    (cityId) => ({
      kind: "ANIMAL_HUNTED",
      playerId,
      cityId,
      at: command.at,
      cost: ruleset.animalCost,
      populationAdded: ruleset.animalPopulation,
    }),
  );
}

export function reduceBuildLumberMill(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "BUILD_LUMBER_MILL" }>,
): ReductionResult {
  const ruleset = requireRuleset(state.rulesetId);
  return reduceSinglePopulationTileAction(
    state,
    playerId,
    command.at,
    ruleset.lumberMillCost,
    ruleset.lumberMillPopulation,
    (tile) => ({ ...tile, improvement: "LUMBER_MILL" as const }),
    (cityId) => ({
      kind: "LUMBER_MILL_BUILT",
      playerId,
      cityId,
      at: command.at,
      cost: ruleset.lumberMillCost,
      populationAdded: ruleset.lumberMillPopulation,
    }),
  );
}

function reduceSinglePopulationTileAction(
  state: GameState,
  playerId: PlayerId,
  at: { readonly x: number; readonly y: number },
  cost: number,
  population: number,
  updateTile: (
    tile: GameState["board"]["tiles"][number],
  ) => GameState["board"]["tiles"][number],
  makeEvent: (cityId: CityState["id"]) => DomainEvent,
): ReductionResult {
  const tile = state.board.tiles.find((candidate) =>
    sameCoord(candidate.at, at),
  );
  const city = state.cities.find(
    (candidate) => candidate.id === tile?.territoryCityId,
  );
  if (tile === undefined || city === undefined)
    throw new RangeError("Validated forest-economy target disappeared");
  const growth = growCity(city, population);
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((candidate) =>
      sameCoord(candidate.at, at) ? updateTile(candidate) : candidate,
    ),
  };
  const cities = state.cities.map((candidate) =>
    candidate.id === city.id ? growth.city : candidate,
  );
  const players = state.players.map((player) =>
    player.id === playerId ? { ...player, stars: player.stars - cost } : player,
  );
  const pendingChoice =
    state.pendingChoice ?? pendingChoiceForCity(growth.city);
  const events: DomainEvent[] = [
    makeEvent(city.id),
    ...growth.reachedLevels.map((level): DomainEvent => ({
      kind: "CITY_LEVELED_UP",
      cityId: city.id,
      level,
    })),
  ];
  return { state: { ...state, board, cities, players, pendingChoice }, events };
}

export function reduceChooseCityReward(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "CHOOSE_CITY_REWARD" }>,
): ReductionResult {
  const pending = state.pendingChoice;
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (
    pending === null ||
    pending.kind !== "CITY_REWARD" ||
    city === undefined
  ) {
    throw new RangeError("Validated reward target disappeared");
  }
  const rewardedCity: CityState =
    pending.level === 2
      ? {
          ...city,
          rewardLevel2: command.reward as "WORKSHOP" | "SURVEY",
        }
      : {
          ...city,
          rewardLevel3: command.reward as "RESOURCES" | "CITY_WALL",
        };
  let players = state.players;
  const starsAwarded =
    command.reward === "RESOURCES"
      ? requireRuleset(state.rulesetId).resourcesRewardStars
      : 0;
  if (starsAwarded > 0) {
    players = players.map((player) =>
      player.id === playerId
        ? { ...player, stars: player.stars + starsAwarded }
        : player,
    );
  }
  let revealEvent: DomainEvent | null = null;
  if (command.reward === "SURVEY") {
    players = players.map((player) => {
      if (player.id !== playerId) return player;
      const reveal = revealRadiusForPlayer(
        state,
        playerId,
        player.explored,
        city.at,
        requireRuleset(state.rulesetId).surveyRadius,
      );
      if (reveal.revealed.length > 0) {
        revealEvent = {
          kind: "TILES_REVEALED",
          playerId,
          tiles: reveal.revealed,
        };
      }
      return { ...player, explored: reveal.explored };
    });
  }
  const cities = state.cities.map((candidate) =>
    candidate.id === city.id ? rewardedCity : candidate,
  );
  const pendingChoice = pendingChoiceForCity(rewardedCity);
  const events: DomainEvent[] = [
    {
      kind: "CITY_REWARD_CHOSEN",
      playerId,
      cityId: city.id,
      level: pending.level,
      reward: command.reward,
      starsAwarded,
    },
  ];
  if (revealEvent !== null) events.push(revealEvent);
  return {
    state: { ...state, players, cities, pendingChoice },
    events,
  };
}

export function reduceCapture(
  state: GameState,
  playerId: PlayerId,
  command: Extract<Command, { readonly kind: "CAPTURE" }>,
): ReductionResult {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  const target =
    unit === undefined ? null : capturableTargetForUnit(state, unit);
  if (unit === undefined || target === null) {
    throw new RangeError("Validated capture target disappeared");
  }

  let nextEntityId = state.nextEntityId;
  let cities: readonly CityState[] = state.cities;
  let board = state.board;
  let capturedCity: CityState;
  let formerOwner: PlayerId | null;
  if (target.kind === "NEUTRAL_VILLAGE") {
    const allocation = allocateCityId(nextEntityId);
    nextEntityId = allocation.nextEntityId;
    capturedCity = {
      id: allocation.id,
      ownerId: playerId,
      at: target.at,
      level: 1,
      population: 0,
      isCapital: false,
      rewardLevel2: null,
      rewardLevel3: null,
    };
    formerOwner = null;
    cities = [...cities, capturedCity];
    board = {
      ...board,
      tiles: board.tiles.map((tile) =>
        tile.territoryCenter !== null &&
        sameCoord(tile.territoryCenter, target.at)
          ? {
              ...tile,
              site: sameCoord(tile.at, target.at) ? "CITY" : tile.site,
              territoryCityId: capturedCity.id,
            }
          : tile,
      ),
    };
  } else {
    const existing = cities.find((city) => city.id === target.cityId);
    if (existing === undefined) {
      throw new RangeError("Validated captured city disappeared");
    }
    formerOwner = existing.ownerId;
    capturedCity = { ...existing, ownerId: playerId };
    cities = cities.map((city) =>
      city.id === existing.id ? capturedCity : city,
    );
  }

  let units = state.units.map((candidate) => {
    if (candidate.id === unit.id) {
      return {
        ...candidate,
        homeCityId: capturedCity.id,
        ready: false,
        captureEligible: false,
        activation: {
          ...candidate.activation,
          captured: true,
          handled: true,
          escapeAvailable: false,
        },
      };
    }
    return formerOwner !== null &&
      candidate.hp > 0 &&
      candidate.homeCityId === capturedCity.id
      ? { ...candidate, homeCityId: null }
      : candidate;
  });
  let players = state.players;
  let pendingChoice = state.pendingChoice;
  const events: DomainEvent[] = [
    {
      kind: "CITY_CAPTURED",
      cityId: capturedCity.id,
      from: formerOwner,
      to: playerId,
    },
  ];

  const capturingPlayer = players.find((player) => player.id === playerId);
  if (capturingPlayer === undefined) {
    throw new RangeError("Validated capturing player disappeared");
  }
  const reveal = revealRadiusForPlayer(
    { ...state, board, cities },
    playerId,
    capturingPlayer.explored,
    capturedCity.at,
    requireRuleset(state.rulesetId).captureRevealRadius,
  );
  players = players.map((player) =>
    player.id === playerId ? { ...player, explored: reveal.explored } : player,
  );
  if (reveal.revealed.length > 0) {
    events.push({
      kind: "TILES_REVEALED",
      playerId,
      tiles: reveal.revealed,
    });
  }

  if (
    formerOwner !== null &&
    !cities.some((city) => city.ownerId === formerOwner)
  ) {
    const removedUnits = units
      .filter((candidate) => candidate.ownerId === formerOwner)
      .sort((left, right) => left.id - right.id);
    units = units.filter((candidate) => candidate.ownerId !== formerOwner);
    players = players.map((player) =>
      player.id === formerOwner ? { ...player, status: "ELIMINATED" } : player,
    );
    if (pendingChoice?.kind === "CITY_REWARD") {
      const rewardPending = pendingChoice;
      if (
        cities.some(
          (city) =>
            city.id === rewardPending.cityId && city.ownerId === formerOwner,
        )
      )
        pendingChoice = null;
    } else if (pendingChoice?.kind === "CANDIFY_CITY") {
      const candifyPending = pendingChoice;
      if (units.every((candidate) => candidate.id !== candifyPending.unitId))
        pendingChoice = null;
    }
    for (const removed of removedUnits) {
      events.push({
        kind: "UNIT_DIED",
        unitId: removed.id,
        cause: "ELIMINATION",
      });
    }
    events.push({ kind: "PLAYER_ELIMINATED", playerId: formerOwner });
  }

  const stateAfterCapture: GameState = {
    ...state,
    nextEntityId,
    board,
    players,
    cities,
    units,
    pendingChoice,
  };
  const outcome: MatchOutcome | null = evaluateMatchOutcome(
    stateAfterCapture,
    playerId,
  );
  if (outcome !== null) events.push({ kind: "MATCH_ENDED", outcome });
  return {
    state: { ...stateAfterCapture, outcome },
    events,
  };
}

export function pendingChoiceForCity(city: CityState): PendingChoice | null {
  if (city.level >= 2 && city.rewardLevel2 === null) {
    return { kind: "CITY_REWARD", cityId: city.id, level: 2 };
  }
  if (city.level >= 3 && city.rewardLevel3 === null) {
    return { kind: "CITY_REWARD", cityId: city.id, level: 3 };
  }
  return null;
}

export function evaluateMatchOutcome(
  state: GameState,
  defeatedByPlayerId?: PlayerId,
): MatchOutcome | null {
  const human = state.players.find((player) => player.controller === "HUMAN");
  if (human?.status === "ELIMINATED" && defeatedByPlayerId !== undefined) {
    return {
      kind: "DEFEAT",
      humanId: human.id,
      defeatedByPlayerId,
    };
  }
  const active = state.players.filter((player) => player.status === "ACTIVE");
  if (active.length !== 1) return null;
  const winner = active[0];
  if (winner === undefined) return null;
  if (human !== undefined) {
    return winner.id === human.id
      ? { kind: "VICTORY", winnerId: human.id }
      : null;
  }
  return { kind: "HEADLESS_VICTORY", winnerId: winner.id };
}

function sameCoord(
  left: { readonly x: number; readonly y: number },
  right: { readonly x: number; readonly y: number },
): boolean {
  return left.x === right.x && left.y === right.y;
}
