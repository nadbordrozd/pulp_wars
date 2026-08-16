import { ruleError, type RuleError } from "./commands/errors";
import { commandEligibility } from "./commands/predicates";
import {
  evaluateMatchOutcome,
  reduceAttack,
  reduceBuildLumberMill,
  reduceBuildMine,
  reduceHarvestFruit,
  reduceHuntAnimal,
  reduceCapture,
  reduceChooseCityReward,
  reduceMove,
  reducePromote,
  reduceRecover,
  reduceResearch,
  reduceTrain,
  reduceWait,
  type ReductionResult,
} from "./commands/reducers";
import type { Command, CommandSummary } from "./commands/types";
import type { DomainEvent } from "./events/types";
import { calculateCombatPreview } from "./combat/combat";
import type { CombatPreview } from "./events/types";
import { revealRadius } from "./fog/exploration";
import { generateInitialMap } from "./map/generation";
import { deepFreeze } from "./model/freeze";
import {
  allocateCityId,
  allocateUnitId,
  playerId,
  type PlayerId,
} from "./model/ids";
import {
  GAME_STATE_SCHEMA_VERSION,
  RULESET_ID,
  type CityState,
  type Coord,
  type GameState,
  type MatchSetup,
  type PlayerColor,
  type PlayerState,
  type UnitState,
} from "./model/types";
import { randomState, validateRandomState } from "./random/random";
import { reachableMovementPaths } from "./movement/movement";
import { getRuleset, requireRuleset } from "./rules/ruleset";
import { applyDemoScenario, demoScenarioIssues } from "./scenarios/demo";
import { endTurnLifecycle, startTurnLifecycle } from "./turns/lifecycle";

const UINT32_RANGE = 0x1_0000_0000;
const PLAYER_COLORS: readonly PlayerColor[] = [
  "CORAL",
  "TEAL",
  "GOLD",
  "VIOLET",
];

export type CreateResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly DomainEvent[];
    }
  | { readonly ok: false; readonly error: RuleError };

export type ApplyResult =
  | {
      readonly ok: true;
      readonly state: GameState;
      readonly events: readonly DomainEvent[];
    }
  | {
      readonly ok: false;
      readonly state: GameState;
      readonly error: RuleError;
    };

export type CombatPreviewResult =
  | { readonly ok: true; readonly preview: CombatPreview }
  | { readonly ok: false; readonly error: RuleError };

export function createGame(setup: MatchSetup): CreateResult {
  const setupError = validateSetup(setup);
  if (setupError !== null) {
    return { ok: false, error: setupError };
  }

  const generated = generateInitialMap(setup, randomState(setup.seed));
  if (!generated.ok) {
    return generated;
  }
  const random = generated.map.random;
  const basePlayers = createPlayers(setup);
  const capitalAssignments = generated.map.capitalAssignments;
  const turnOrder = generated.map.turnOrderSeats.map((seat) => {
    const player = basePlayers[seat];
    if (player === undefined) throw new RangeError("Turn seat disappeared");
    return player.id;
  });
  const createdEntities = createStartingEntities(
    basePlayers,
    capitalAssignments,
  );
  const board = {
    ...generated.map.board,
    tiles: generated.map.board.tiles.map((tile) => {
      if (tile.territoryCenter === null) return tile;
      const capital = createdEntities.cities.find((city) =>
        sameCoord(city.at, tile.territoryCenter as Coord),
      );
      return capital === undefined
        ? tile
        : { ...tile, territoryCityId: capital.id };
    }),
  };
  const players = basePlayers.map((player, index) => {
    const capital = capitalAssignments[index];
    if (capital === undefined) {
      throw new RangeError("Capital assignment missing for player");
    }
    return {
      ...player,
      explored: revealRadius(board, [], capital, 2).explored,
    };
  });
  let initialState: GameState = {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    rulesetId: setup.rulesetId,
    setup: { ...setup },
    random,
    humanPlayerId: basePlayers[0]?.id ?? playerId(1),
    nextEntityId: createdEntities.nextEntityId,
    commandIndex: 0,
    round: 1,
    activeSeatIndex: 0,
    turnOrder,
    board,
    players,
    cities: createdEntities.cities,
    units: createdEntities.units,
    pendingChoice: null,
    outcome: null,
  };
  if (setup.scenario === "DEMO") {
    try {
      initialState = applyDemoScenario(initialState);
    } catch {
      return {
        ok: false,
        error: ruleError("INVALID_STATE", { field: "demoScenario" }),
      };
    }
  }
  const firstPlayerId = initialState.turnOrder[initialState.activeSeatIndex];
  if (firstPlayerId === undefined) {
    return {
      ok: false,
      error: ruleError("INVALID_STATE", { field: "turnOrder" }),
    };
  }
  const started = startTurnLifecycle(initialState, firstPlayerId);
  if (
    setup.scenario === "DEMO" &&
    demoScenarioIssues(started.state).length > 0
  ) {
    return {
      ok: false,
      error: ruleError("INVALID_STATE", { field: "demoScenario" }),
    };
  }
  const state = deepFreeze<GameState>(started.state);
  const revealEvents: DomainEvent[] = started.state.players.map((player) => ({
    kind: "TILES_REVEALED",
    playerId: player.id,
    tiles: player.explored,
  }));
  return {
    ok: true,
    state,
    events: deepFreeze([...revealEvents, ...started.events]),
  };
}

export function applyCommand(state: GameState, command: Command): ApplyResult {
  const stateError = validateKernelState(state);
  if (stateError !== null) {
    return reject(state, stateError);
  }
  const activePlayerId = state.turnOrder[state.activeSeatIndex];
  if (activePlayerId === undefined) {
    return reject(
      state,
      ruleError("INVALID_STATE", { field: "activeSeatIndex" }),
    );
  }
  const eligibility = commandEligibility(state, activePlayerId, command);
  if (!eligibility.legal) return reject(state, eligibility.error);

  switch (command.kind) {
    case "RESEARCH":
      return acceptReduction(
        state,
        reduceResearch(state, activePlayerId, command),
      );
    case "HARVEST_FRUIT":
      return acceptReduction(
        state,
        reduceHarvestFruit(state, activePlayerId, command),
      );
    case "HUNT_ANIMAL":
      return acceptReduction(
        state,
        reduceHuntAnimal(state, activePlayerId, command),
      );
    case "BUILD_LUMBER_MILL":
      return acceptReduction(
        state,
        reduceBuildLumberMill(state, activePlayerId, command),
      );
    case "BUILD_MINE":
      return acceptReduction(
        state,
        reduceBuildMine(state, activePlayerId, command),
      );
    case "CHOOSE_CITY_REWARD":
      return acceptReduction(
        state,
        reduceChooseCityReward(state, activePlayerId, command),
      );
    case "CAPTURE":
      return acceptReduction(
        state,
        reduceCapture(state, activePlayerId, command),
      );
    case "TRAIN":
      return acceptReduction(
        state,
        reduceTrain(state, activePlayerId, command),
      );
    case "MOVE":
    case "ESCAPE_MOVE":
      return acceptReduction(state, reduceMove(state, activePlayerId, command));
    case "ATTACK":
      return acceptReduction(state, reduceAttack(state, command));
    case "RECOVER":
      return acceptReduction(state, reduceRecover(state, command));
    case "WAIT":
      return acceptReduction(state, reduceWait(state, activePlayerId, command));
    case "PROMOTE":
      return acceptReduction(state, reducePromote(state, command));
    case "END_TURN":
      return applyEndTurn(state, activePlayerId);
  }
}

export function previewCombat(
  state: GameState,
  attackerId: UnitState["id"],
  defenderId: UnitState["id"],
): CombatPreviewResult {
  const stateError = validateKernelState(state);
  if (stateError !== null) return { ok: false, error: stateError };
  const activePlayerId = state.turnOrder[state.activeSeatIndex];
  if (activePlayerId === undefined) {
    return {
      ok: false,
      error: ruleError("INVALID_STATE", { field: "activePlayer" }),
    };
  }
  const eligibility = commandEligibility(state, activePlayerId, {
    kind: "ATTACK",
    unitId: attackerId,
    targetId: defenderId,
  });
  if (!eligibility.legal) return { ok: false, error: eligibility.error };
  return {
    ok: true,
    preview: calculateCombatPreview(state, attackerId, defenderId),
  };
}

function applyEndTurn(state: GameState, activePlayerId: PlayerId): ApplyResult {
  const ended = endTurnLifecycle(state, activePlayerId);
  const outcome = evaluateMatchOutcome(ended.state);
  if (outcome !== null) {
    return acceptReduction(state, {
      state: { ...ended.state, outcome },
      events: [...ended.events, { kind: "MATCH_ENDED", outcome }],
    });
  }
  const nextTurn = findNextActiveSeat(ended.state);
  if (nextTurn === null) {
    return reject(
      state,
      ruleError("INVALID_STATE", { field: "activePlayers" }),
    );
  }
  const nextPlayerId = state.turnOrder[nextTurn.seatIndex];
  if (nextPlayerId === undefined) {
    return reject(
      state,
      ruleError("INVALID_STATE", { field: "activeSeatIndex" }),
    );
  }

  const advancedState: GameState = {
    ...ended.state,
    round: state.round + (nextTurn.wrapped ? 1 : 0),
    activeSeatIndex: nextTurn.seatIndex,
  };
  const started = startTurnLifecycle(advancedState, nextPlayerId);
  return acceptReduction(state, {
    state: started.state,
    events: [...ended.events, ...started.events],
  });
}

export function legalCommands(
  state: GameState,
  actor: PlayerId,
): readonly CommandSummary[] {
  const activePlayer = state.turnOrder[state.activeSeatIndex];
  if (state.outcome !== null || activePlayer !== actor) return [];
  const candidates: Command[] = [];
  if (state.pendingChoice !== null) {
    const rewards = requireRuleset(state.rulesetId).cityLevels.find(
      (level) => level.level === state.pendingChoice?.level,
    )?.rewards;
    for (const reward of rewards ?? []) {
      candidates.push({
        kind: "CHOOSE_CITY_REWARD",
        cityId: state.pendingChoice.cityId,
        reward,
      });
    }
  } else {
    const rules = requireRuleset(state.rulesetId);
    for (const tech of rules.technologies) {
      candidates.push({ kind: "RESEARCH", tech: tech.id });
    }
    for (const tile of state.board.tiles) {
      candidates.push({ kind: "HARVEST_FRUIT", at: tile.at });
      candidates.push({ kind: "HUNT_ANIMAL", at: tile.at });
      candidates.push({ kind: "BUILD_LUMBER_MILL", at: tile.at });
      candidates.push({ kind: "BUILD_MINE", at: tile.at });
    }
    for (const city of [...state.cities].sort(
      (left, right) => left.id - right.id,
    )) {
      if (city.ownerId !== actor) continue;
      for (const unitType of [
        "WARRIOR",
        "ARCHER",
        "DEFENDER",
        "RIDER",
        "CATAPULT",
      ] as const) {
        candidates.push({ kind: "TRAIN", cityId: city.id, unit: unitType });
      }
    }
    for (const unit of [...state.units].sort(
      (left, right) => left.id - right.id,
    )) {
      if (unit.ownerId === actor) {
        for (const reachable of reachableMovementPaths(
          state,
          unit,
          rules.units[unit.type].move,
        )) {
          candidates.push({
            kind: "MOVE",
            unitId: unit.id,
            path: reachable.path,
          });
        }
        for (const target of [...state.units].sort(
          (left, right) => left.id - right.id,
        )) {
          if (target.ownerId !== actor) {
            candidates.push({
              kind: "ATTACK",
              unitId: unit.id,
              targetId: target.id,
            });
          }
        }
        for (const reachable of reachableMovementPaths(state, unit, 2)) {
          candidates.push({
            kind: "ESCAPE_MOVE",
            unitId: unit.id,
            path: reachable.path,
          });
        }
        candidates.push({ kind: "RECOVER", unitId: unit.id });
        candidates.push({ kind: "WAIT", unitId: unit.id });
        candidates.push({ kind: "PROMOTE", unitId: unit.id });
        candidates.push({ kind: "CAPTURE", unitId: unit.id });
      }
    }
    candidates.push({ kind: "END_TURN" });
  }
  return deepFreeze(
    candidates
      .filter((command) => commandEligibility(state, actor, command).legal)
      .map((command) => ({ kind: command.kind, command })),
  );
}

export function validateSetup(setup: MatchSetup): RuleError | null {
  const keys = Object.keys(setup).sort();
  const expected = [
    "aiCount",
    "aiDifficulty",
    "aiMode",
    "height",
    "humanColor",
    "rulesetId",
    ...(setup.scenario === "DEMO" ? ["scenario"] : []),
    "seed",
    "width",
  ].sort();
  if (
    keys.length !== expected.length ||
    keys.some((key, index) => key !== expected[index])
  ) {
    return ruleError("INVALID_SETUP", { field: "fields" });
  }
  if (getRuleset(setup.rulesetId) === undefined) {
    return ruleError("RULESET_NOT_FOUND", { rulesetId: setup.rulesetId });
  }
  if (
    !Number.isInteger(setup.seed) ||
    setup.seed < 0 ||
    setup.seed >= UINT32_RANGE
  ) {
    return ruleError("INVALID_SETUP", { field: "seed" });
  }
  if (setup.aiCount !== 1 && setup.aiCount !== 2 && setup.aiCount !== 3) {
    return ruleError("INVALID_SETUP", { field: "aiCount" });
  }
  if (
    (setup.width !== 11 &&
      setup.width !== 14 &&
      setup.width !== 16 &&
      setup.width !== 20 &&
      setup.width !== 25) ||
    setup.height !== setup.width
  ) {
    return ruleError("INVALID_SETUP", { field: "dimensions" });
  }
  const minimumSize = setup.aiCount === 1 ? 11 : setup.aiCount === 2 ? 14 : 16;
  if (setup.width < minimumSize) {
    return ruleError("INVALID_SETUP", { field: "dimensionsForAiCount" });
  }
  if (setup.aiDifficulty !== "NORMAL") {
    return ruleError("INVALID_SETUP", { field: "aiDifficulty" });
  }
  if (setup.aiMode !== "RIVAL" && setup.aiMode !== "COOPERATIVE") {
    return ruleError("INVALID_SETUP", { field: "aiMode" });
  }
  if (!PLAYER_COLORS.includes(setup.humanColor)) {
    return ruleError("INVALID_SETUP", { field: "humanColor" });
  }
  if (
    setup.scenario !== undefined &&
    (setup.scenario !== "DEMO" ||
      setup.seed !== 0xdecafbad ||
      setup.width !== 25 ||
      setup.height !== 25 ||
      setup.aiCount !== 2 ||
      setup.aiMode !== "RIVAL" ||
      setup.humanColor !== "CORAL")
  ) {
    return ruleError("INVALID_SETUP", { field: "scenario" });
  }
  return null;
}

function createPlayers(setup: MatchSetup): readonly PlayerState[] {
  const aiColors = PLAYER_COLORS.filter((color) => color !== setup.humanColor);
  const count = setup.aiCount + 1;
  return Array.from({ length: count }, (_, seat): PlayerState => {
    const color = seat === 0 ? setup.humanColor : aiColors[seat - 1];
    if (color === undefined) {
      throw new RangeError("Not enough distinct player colors");
    }
    return {
      id: playerId(seat + 1),
      seat,
      controller: seat === 0 ? "HUMAN" : "AI",
      color,
      status: "ACTIVE",
      stars: requireRuleset(setup.rulesetId).startingStars,
      researchedTechs: [],
      explored: [],
    };
  });
}

function createStartingEntities(
  players: readonly PlayerState[],
  capitals: readonly Coord[],
): {
  readonly cities: readonly CityState[];
  readonly units: readonly UnitState[];
  readonly nextEntityId: number;
} {
  const cities: CityState[] = [];
  const units: UnitState[] = [];
  const warrior = requireRuleset(RULESET_ID).units.WARRIOR;
  let nextEntityId = 1;
  for (let index = 0; index < players.length; index += 1) {
    const player = players[index];
    const at = capitals[index];
    if (player === undefined || at === undefined) {
      throw new RangeError("Starting entity assignment is incomplete");
    }
    const cityAllocation = allocateCityId(nextEntityId);
    nextEntityId = cityAllocation.nextEntityId;
    const city: CityState = {
      id: cityAllocation.id,
      ownerId: player.id,
      at,
      level: 1,
      population: 0,
      isCapital: true,
      rewardLevel2: null,
      rewardLevel3: null,
    };
    cities.push(city);
    const unitAllocation = allocateUnitId(nextEntityId);
    nextEntityId = unitAllocation.nextEntityId;
    units.push({
      id: unitAllocation.id,
      ownerId: player.id,
      homeCityId: city.id,
      capacityExempt: true,
      type: "WARRIOR",
      at,
      hp: warrior.maxHp,
      maxHp: warrior.maxHp,
      kills: 0,
      veteran: false,
      ready: true,
      captureEligible: false,
      activation: {
        moved: false,
        attacked: false,
        recovered: false,
        captured: false,
        handled: false,
        escapeAvailable: false,
      },
    });
  }
  return { cities, units, nextEntityId };
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}

function validateKernelState(state: GameState): RuleError | null {
  if (validateSetup(state.setup) !== null) {
    return ruleError("INVALID_STATE", { field: "setup" });
  }
  if (
    state.schemaVersion !== GAME_STATE_SCHEMA_VERSION ||
    state.rulesetId !== state.setup.rulesetId ||
    getRuleset(state.rulesetId) === undefined
  ) {
    return ruleError("INVALID_STATE", { field: "version" });
  }
  if (
    !Number.isSafeInteger(state.nextEntityId) ||
    state.nextEntityId < 1 ||
    !Number.isSafeInteger(state.commandIndex) ||
    state.commandIndex < 0 ||
    !Number.isSafeInteger(state.round) ||
    state.round < 1 ||
    !Number.isSafeInteger(state.activeSeatIndex) ||
    state.activeSeatIndex < 0 ||
    state.activeSeatIndex >= state.turnOrder.length
  ) {
    return ruleError("INVALID_STATE", { field: "turn" });
  }
  if (
    state.players.some(
      (player) => !Number.isSafeInteger(player.stars) || player.stars < 0,
    )
  ) {
    return ruleError("INVALID_STATE", { field: "stars" });
  }
  if (
    state.cities.some(
      (city) =>
        !Number.isSafeInteger(city.level) ||
        city.level < 1 ||
        !Number.isSafeInteger(city.population) ||
        city.population < 0 ||
        city.population > city.level,
    )
  ) {
    return ruleError("INVALID_STATE", { field: "cities" });
  }
  const cityIds = new Set(state.cities.map((city) => city.id));
  if (
    state.units.some(
      (unit) =>
        typeof unit.capacityExempt !== "boolean" ||
        typeof unit.activation.handled !== "boolean" ||
        (unit.homeCityId !== null && !cityIds.has(unit.homeCityId)),
    )
  ) {
    return ruleError("INVALID_STATE", { field: "units" });
  }
  if (!state.players.some((player) => player.id === state.humanPlayerId)) {
    return ruleError("INVALID_STATE", { field: "humanPlayerId" });
  }
  if (
    state.board.tiles.some(
      (tile) =>
        (tile.resource === "FRUIT" &&
          (tile.terrain !== "GRASS" || tile.improvement !== null)) ||
        (tile.resource === "ORE" &&
          (tile.terrain !== "MOUNTAIN" || tile.improvement !== null)) ||
        (tile.resource === "ANIMAL" &&
          (tile.terrain !== "FOREST" || tile.improvement !== null)) ||
        (tile.improvement === "MINE" &&
          (tile.terrain !== "MOUNTAIN" || tile.resource !== null)) ||
        (tile.improvement === "LUMBER_MILL" &&
          (tile.terrain !== "FOREST" || tile.resource !== null)),
    )
  ) {
    return ruleError("INVALID_STATE", { field: "resources" });
  }
  const activePlayerId = state.turnOrder[state.activeSeatIndex];
  if (
    activePlayerId === undefined ||
    state.players.find((player) => player.id === activePlayerId)?.status !==
      "ACTIVE"
  ) {
    return ruleError("INVALID_STATE", { field: "activePlayer" });
  }
  try {
    validateRandomState(state.random);
  } catch {
    return ruleError("INVALID_STATE", { field: "random" });
  }
  return null;
}

function findNextActiveSeat(
  state: GameState,
): { readonly seatIndex: number; readonly wrapped: boolean } | null {
  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const candidateIndex =
      (state.activeSeatIndex + offset) % state.turnOrder.length;
    const candidateId = state.turnOrder[candidateIndex];
    const candidate = state.players.find((player) => player.id === candidateId);
    if (candidate?.status === "ACTIVE") {
      return {
        seatIndex: candidateIndex,
        wrapped: candidateIndex <= state.activeSeatIndex,
      };
    }
  }
  return null;
}

function reject(state: GameState, error: RuleError): ApplyResult {
  return { ok: false, state, error };
}

function acceptReduction(
  previousState: GameState,
  reduction: ReductionResult,
): ApplyResult {
  const state = deepFreeze<GameState>({
    ...reduction.state,
    commandIndex: previousState.commandIndex + 1,
  });
  return {
    ok: true,
    state,
    events: deepFreeze<readonly DomainEvent[]>(reduction.events),
  };
}
