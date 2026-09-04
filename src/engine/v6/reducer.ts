import {
  allocateCityId,
  allocateUnitId,
  allocateWallId,
  type PlayerId,
} from "../model/ids";
import type { JsonValue } from "../replay/canonical";
import {
  BASIC_ECONOMIC_ACTIONS_V6,
  SPATIAL_ECONOMIC_ACTIONS_V6,
  effectiveRoleRuleV6,
  getFactionTechnologyTreeV6,
  technologyResearchCostV6,
  type BasicEconomicCommandKindV6,
  type SpatialEconomicCommandKindV6,
} from "../rules/ruleset-v6";
import { deepFreeze } from "../model/freeze";
import { nextBounded } from "../random/random";
import { hasExactKeysV6, parseCommandV6, type CommandV6 } from "./commands";
import {
  cityFootprintContainsV6,
  nearestViableCandifyCitiesV6,
  removalWouldDisconnectCityV6,
  territoryOwnerIdV6,
} from "./candy";
import { calculateCombatPreviewV6, pushedDestinationV6 } from "./combat";
import {
  assignedUnitCountV6,
  arePlayersAlliedV6,
  arePlayersHostileV6,
  cityUnitCapacityV6,
  endTurnRecoveryV6,
  isCityBesiegedV6,
  playerIncomeV6,
  recoveryAmountV6,
  recomputeLiveEconomyV6,
  startTurnV6,
  type CityEconomyRecalculationV6,
} from "./economy";
import type { DomainEventV6 } from "./events";
import { createInitialMapStateV6 } from "./map";
import { validateMovementPathV6 } from "./movement";
import { parseGameStateV6 } from "./state-schema";
import { spatialContributionAtV6 } from "./spatial-economy";
import { TECHNOLOGY_IDS } from "./types";
import type {
  CityStateV6,
  CoordV6,
  GameStateV6,
  MatchSetupV6,
  PlayerStateV6,
  PopulationContributionV6,
  TileStateV6,
  TechnologyId,
  CardinalDirectionV6,
  UnitStateV6,
} from "./types";

export type RuleErrorCodeV6 =
  | "INVALID_SETUP"
  | "INVALID_STATE"
  | "INVALID_COMMAND"
  | "COMMAND_NOT_IMPLEMENTED"
  | "MATCH_ENDED"
  | "PLAYER_ELIMINATED"
  | "NOT_ACTIVE_PLAYER"
  | "PENDING_CHOICE"
  | "TILE_NOT_FOUND"
  | "TILE_UNEXPLORED"
  | "TECH_REQUIRED"
  | "INVALID_TILE"
  | "FOREST_ACTION_INVALID_TILE"
  | "REDEVELOP_INVALID_TARGET"
  | "TERRITORY_NOT_OWNED"
  | "CITY_BESIEGED"
  | "CITY_REWARD_PENDING"
  | "CITY_BUILDING_LIMIT"
  | "PLACEMENT_REQUIREMENT_UNMET"
  | "TECH_NOT_FOUND"
  | "TECH_ALREADY_RESEARCHED"
  | "TECH_PREREQUISITE_MISSING"
  | "INSUFFICIENT_COINS"
  | "INTEGER_OVERFLOW"
  | "CITY_NOT_FOUND"
  | "CITY_NOT_OWNED"
  | "CITY_REWARD_MISMATCH"
  | "NO_REWARD_UNIT_PLACEMENT"
  | "UNIT_NOT_FOUND"
  | "UNIT_NOT_OWNED"
  | "UNIT_ALREADY_ACTED"
  | "UNIT_ALREADY_HANDLED"
  | "UNIT_ROLE_INVALID"
  | "HEAL_TARGET_NOT_FOUND"
  | "HEAL_TARGET_NOT_OWNED"
  | "HEAL_TARGET_NOT_ADJACENT"
  | "HEAL_TARGET_FULL"
  | "RECOVER_NOT_LEGAL"
  | "PROMOTION_NOT_ELIGIBLE"
  | "ATTACK_NOT_LEGAL"
  | "CITY_SPAWN_OCCUPIED"
  | "CITY_CAPACITY_FULL"
  | "MOVEMENT_ILLEGAL"
  | "CAPTURE_NOT_ELIGIBLE"
  | "TARGET_ALLIED"
  | "UNIT_TYPE_INVALID"
  | "ROLL_DIRECTION_INVALID"
  | "WALL_TARGET_NOT_ADJACENT"
  | "WALL_INVALID_TILE"
  | "ALLY_TERRITORY_FORBIDDEN"
  | "CANDY_FACTION_REQUIRED"
  | "CANDIFY_INVALID_TILE"
  | "CANDIFY_OUTSIDE_FOOTPRINT"
  | "CANDIFY_NO_ADJACENT_CITY"
  | "CANDIFY_WOULD_DISCONNECT"
  | "CANDIFY_CHOICE_INVALID"
  | "CANDIFY_CITY_NOT_CANDIDATE";

export interface RuleErrorV6 {
  readonly code: RuleErrorCodeV6;
  readonly params: Readonly<Record<string, JsonValue>>;
}

export type ApplyCommandResultV6 =
  | {
      readonly accepted: true;
      readonly state: GameStateV6;
      readonly events: readonly DomainEventV6[];
    }
  | {
      readonly accepted: false;
      readonly state: GameStateV6;
      readonly events: readonly [];
      readonly error: RuleErrorV6;
    };

export type CreatePlayableGameResultV6 =
  | {
      readonly ok: true;
      readonly state: GameStateV6;
      readonly events: readonly DomainEventV6[];
      readonly mapAttempt: number;
    }
  | Extract<ReturnType<typeof createInitialMapStateV6>, { readonly ok: false }>;

const BASIC_COMMANDS = new Set<CommandV6["kind"]>(
  Object.keys(BASIC_ECONOMIC_ACTIONS_V6) as BasicEconomicCommandKindV6[],
);
const SPATIAL_COMMANDS = new Set<CommandV6["kind"]>(
  Object.keys(SPATIAL_ECONOMIC_ACTIONS_V6) as SpatialEconomicCommandKindV6[],
);
type InfrastructureCommandV6 = Extract<CommandV6, { readonly at: CoordV6 }> & {
  readonly kind: "CLEAR_FOREST" | "REPLANT_FOREST" | "BUILD_ROAD" | "REDEVELOP";
};

/** Creates the mapped state and awards the ordinary first Start Turn income. */
export function createPlayableGameV6(
  setup: MatchSetupV6,
): CreatePlayableGameResultV6 {
  const created = createInitialMapStateV6(setup);
  if (!created.ok) return created;
  const activeId = created.state.turnOrder[created.state.activeSeatIndex];
  const player = created.state.players.find(
    (candidate) => candidate.id === activeId,
  );
  if (player === undefined) {
    return {
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    };
  }
  try {
    const started = startTurnV6(created.state, player);
    return {
      ok: true,
      state: checkedState(started.state),
      events: started.events,
      mapAttempt: created.mapAttempt,
    };
  } catch {
    return {
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    };
  }
}

export function applyCommandV6(
  state: GameStateV6,
  actor: PlayerId,
  commandInput: CommandV6,
): ApplyCommandResultV6 {
  const canonicalState = parseGameStateV6(state);
  if (canonicalState === null) return rejected(state, "INVALID_STATE");
  const unknownResearchTech = exactUnknownResearchTech(commandInput);
  if (unknownResearchTech !== null) {
    const common = commonError(canonicalState, actor, {
      kind: "RESEARCH",
      tech: "GATHERING",
    });
    return common === null
      ? rejected(state, "TECH_NOT_FOUND", { tech: unknownResearchTech })
      : rejected(state, common.code, common.params);
  }
  const parsedCommand = parseCommandV6(commandInput);
  if (!parsedCommand.ok) return rejected(state, "INVALID_COMMAND");
  const command = parsedCommand.value;
  const common = commonError(canonicalState, actor, command);
  if (common !== null) return rejected(state, common.code, common.params);
  if (command.kind === "RESEARCH") {
    return applyResearchCommand(state, canonicalState, actor, command.tech);
  }
  if (BASIC_COMMANDS.has(command.kind)) {
    return applyBasicEconomicCommand(
      state,
      canonicalState,
      actor,
      command as Extract<CommandV6, { readonly at: CoordV6 }>,
    );
  }
  if (SPATIAL_COMMANDS.has(command.kind)) {
    return applySpatialEconomicCommand(
      state,
      canonicalState,
      actor,
      command as Extract<CommandV6, { readonly at: CoordV6 }>,
    );
  }
  if (
    command.kind === "CLEAR_FOREST" ||
    command.kind === "REPLANT_FOREST" ||
    command.kind === "BUILD_ROAD" ||
    command.kind === "REDEVELOP"
  ) {
    return applyInfrastructureCommand(
      state,
      canonicalState,
      actor,
      command as InfrastructureCommandV6,
    );
  }
  if (command.kind === "CHOOSE_CITY_REWARD") {
    return applyCityRewardCommand(state, canonicalState, actor, command);
  }
  if (command.kind === "TRAIN") {
    return applyTrainCommand(state, canonicalState, actor, command);
  }
  if (command.kind === "MOVE") {
    return applyMoveCommand(state, canonicalState, actor, command);
  }
  if (command.kind === "ATTACK") {
    return applyAttackCommand(state, canonicalState, actor, command);
  }
  if (command.kind === "KAMIKAZE_ROLL") {
    return applyKamikazeRollCommand(state, canonicalState, actor, command);
  }
  if (command.kind === "HEAL_ADJACENT") {
    return applyHealCommand(state, canonicalState, actor, command);
  }
  if (command.kind === "RECOVER") {
    return applyRecoverCommand(state, canonicalState, actor, command.unitId);
  }
  if (command.kind === "PROMOTE") {
    return applyPromoteCommand(state, canonicalState, actor, command.unitId);
  }
  if (command.kind === "WAIT") {
    return applyWaitCommand(state, canonicalState, actor, command.unitId);
  }
  if (command.kind === "BUILD_CHOCOLATE_WALL") {
    return applyBuildChocolateWallCommand(
      state,
      canonicalState,
      actor,
      command,
    );
  }
  if (command.kind === "CANDIFY") {
    return applyCandifyCommand(state, canonicalState, actor, command.unitId);
  }
  if (command.kind === "CHOOSE_CANDIFY_CITY") {
    return applyChooseCandifyCityCommand(state, canonicalState, actor, command);
  }
  if (command.kind === "END_TURN") {
    return applyEndTurn(state, canonicalState, actor);
  }
  if (command.kind === "CAPTURE") {
    return applyCapture(state, canonicalState, actor, command.unitId);
  }
  return rejected(state, "COMMAND_NOT_IMPLEMENTED", { kind: command.kind });
}

function applyResearchCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  tech: TechnologyId,
): ApplyCommandResultV6 {
  const player = requirePlayer(state, actor);
  const tree = getFactionTechnologyTreeV6(player.factionTreeId);
  if (tree === undefined || tree.faction !== player.faction) {
    return rejected(original, "INVALID_STATE");
  }
  const node = tree.nodes.find((candidate) => candidate.id === tech);
  if (node === undefined) {
    return rejected(original, "TECH_NOT_FOUND", { tech });
  }
  if (player.researchedTechs.includes(tech)) {
    return rejected(original, "TECH_ALREADY_RESEARCHED", { tech });
  }
  const missing = node.prerequisites.find(
    (prerequisite) => !player.researchedTechs.includes(prerequisite),
  );
  if (missing !== undefined) {
    return rejected(original, "TECH_PREREQUISITE_MISSING", {
      tech,
      prerequisite: missing,
    });
  }
  const ownedCityCount = state.cities.filter(
    (city) => city.ownerId === actor,
  ).length;
  let cost: number;
  try {
    cost = technologyResearchCostV6(node.tier, ownedCityCount);
  } catch {
    return rejected(original, "INTEGER_OVERFLOW");
  }
  if (player.coins < cost) {
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  }
  const commandIndex = state.commandIndex + 1;
  if (!Number.isSafeInteger(commandIndex)) {
    return rejected(original, "INTEGER_OVERFLOW");
  }
  const researchedTechs = [...player.researchedTechs, tech].sort(
    (left, right) =>
      TECHNOLOGY_IDS.indexOf(left) - TECHNOLOGY_IDS.indexOf(right),
  );
  const players = state.players.map((candidate) =>
    candidate.id === actor
      ? { ...candidate, coins: candidate.coins - cost, researchedTechs }
      : candidate,
  );
  try {
    const nextState = checkedState({ ...state, commandIndex, players });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [{ kind: "TECH_RESEARCHED", playerId: actor, tech, cost }],
    };
  } catch (cause) {
    if (cause instanceof RangeError) return rejected(original, "INVALID_STATE");
    throw cause;
  }
}

function applyBasicEconomicCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly at: CoordV6 }>,
): ApplyCommandResultV6 {
  const kind = command.kind as BasicEconomicCommandKindV6;
  const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
  const player = requirePlayer(state, actor);
  const tile = tileAt(state, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at))
    return rejected(original, "TILE_UNEXPLORED");
  if (!player.researchedTechs.includes(rule.technology)) {
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  }
  if (!tileMatchesRule(tile, rule)) {
    return rejected(original, "INVALID_TILE", { action: kind });
  }
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined || city.ownerId !== actor) {
    return rejected(original, "TERRITORY_NOT_OWNED");
  }
  if (isCityBesiegedV6(state, city)) return rejected(original, "CITY_BESIEGED");
  if (
    state.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  ) {
    return rejected(original, "CITY_REWARD_PENDING");
  }
  if (player.coins < rule.cost) {
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  }

  try {
    const contribution: PopulationContributionV6 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: rule.populationCategory,
      amount: rule.population,
      source:
        rule.populationCategory === "PERMANENT"
          ? {
              kind: "RESOURCE_ACTION",
              action: kind as "HARVEST_FRUIT" | "HUNT_GAME",
              at: command.at,
            }
          : {
              kind: "IMPROVEMENT",
              improvement: requireImprovement(rule.improvement),
              at: command.at,
            },
    };
    const nextEntityId = state.nextEntityId + 1;
    const commandIndex = state.commandIndex + 1;
    if (
      !Number.isSafeInteger(nextEntityId) ||
      !Number.isSafeInteger(commandIndex)
    ) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const updatedTile: TileStateV6 = {
      ...tile,
      resource: null,
      improvement: rule.improvement,
    };
    const board = {
      ...state.board,
      tiles: state.board.tiles.map((candidate) =>
        sameCoord(candidate.at, command.at) ? updatedTile : candidate,
      ),
    };
    const players = state.players.map((candidate) =>
      candidate.id === actor
        ? { ...candidate, coins: candidate.coins - rule.cost }
        : candidate,
    );
    const recalculation = recomputeLiveEconomyV6(
      state,
      { board, cities: state.cities },
      [...state.populationContributions, contribution],
    );
    const nextState = checkedState({
      ...state,
      nextEntityId,
      commandIndex,
      board,
      players,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    const fact: DomainEventV6 =
      rule.populationCategory === "PERMANENT"
        ? {
            kind: kind === "HARVEST_FRUIT" ? "FRUIT_HARVESTED" : "GAME_HUNTED",
            playerId: actor,
            cityId: city.id,
            at: command.at,
            cost: 2,
            permanentPopulationAdded: 1,
          }
        : {
            kind: "ECONOMIC_BUILDING_BUILT",
            playerId: actor,
            cityId: city.id,
            at: command.at,
            improvement: requireImprovement(rule.improvement),
            cost: rule.cost,
            populationContribution: rule.population,
            marketIncome: 0,
          };
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        fact,
        ...economyEvents(recalculation.changes),
        ...growthEventsForChanges(recalculation.changes),
      ],
    };
  } catch (error) {
    if (error instanceof RangeError && error.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    throw error;
  }
}

function applySpatialEconomicCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly at: CoordV6 }>,
): ApplyCommandResultV6 {
  const kind = command.kind as SpatialEconomicCommandKindV6;
  const rule = SPATIAL_ECONOMIC_ACTIONS_V6[kind];
  const player = requirePlayer(state, actor);
  const tile = tileAt(state, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at)) {
    return rejected(original, "TILE_UNEXPLORED");
  }
  if (!player.researchedTechs.includes(rule.technology)) {
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  }
  if (
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null
  ) {
    return rejected(original, "INVALID_TILE", { action: kind });
  }
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined || city.ownerId !== actor) {
    return rejected(original, "TERRITORY_NOT_OWNED");
  }
  if (isCityBesiegedV6(state, city)) return rejected(original, "CITY_BESIEGED");
  if (
    state.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  ) {
    return rejected(original, "CITY_REWARD_PENDING");
  }
  if (
    state.board.tiles.some(
      (candidate) =>
        candidate.territoryCityId === city.id &&
        candidate.improvement === rule.improvement,
    )
  ) {
    return rejected(original, "CITY_BUILDING_LIMIT", {
      improvement: rule.improvement,
    });
  }

  const updatedTile: TileStateV6 = {
    ...tile,
    improvement: rule.improvement,
  };
  const board = {
    ...state.board,
    tiles: state.board.tiles.map((candidate) =>
      sameCoord(candidate.at, command.at) ? updatedTile : candidate,
    ),
  };
  const finalGraph = { board, cities: state.cities };
  const evaluation = spatialContributionAtV6(
    finalGraph,
    command.at,
    rule.improvement,
  );
  if (evaluation.placementCount < rule.placementMinimum) {
    return rejected(original, "PLACEMENT_REQUIREMENT_UNMET", {
      improvement: rule.improvement,
      required: rule.placementMinimum,
      count: evaluation.placementCount,
    });
  }
  if (player.coins < rule.cost) {
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  }

  try {
    const nextEntityId = state.nextEntityId + 1;
    const commandIndex = state.commandIndex + 1;
    if (
      !Number.isSafeInteger(nextEntityId) ||
      !Number.isSafeInteger(commandIndex)
    ) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const contribution: PopulationContributionV6 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: evaluation.population,
      source: {
        kind: "IMPROVEMENT",
        improvement: rule.improvement,
        at: command.at,
      },
    };
    const recalculation = recomputeLiveEconomyV6(state, finalGraph, [
      ...state.populationContributions,
      contribution,
    ]);
    const players = state.players.map((candidate) =>
      candidate.id === actor
        ? { ...candidate, coins: candidate.coins - rule.cost }
        : candidate,
    );
    const nextState = checkedState({
      ...state,
      nextEntityId,
      commandIndex,
      board,
      players,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    const ownContribution = recalculation.populationContributions.find(
      (candidate) => candidate.id === contribution.id,
    );
    if (ownContribution === undefined) throw new RangeError("INVALID_STATE");
    const fact: DomainEventV6 = {
      kind: "ECONOMIC_BUILDING_BUILT",
      playerId: actor,
      cityId: city.id,
      at: command.at,
      improvement: rule.improvement,
      cost: rule.cost,
      populationContribution: ownContribution.amount,
      marketIncome: evaluation.marketIncome,
    };
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        fact,
        ...economyEvents(recalculation.changes),
        ...growthEventsForChanges(recalculation.changes),
      ],
    };
  } catch (error) {
    if (error instanceof RangeError && error.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    if (error instanceof RangeError && error.message === "INVALID_STATE") {
      return rejected(original, "INVALID_STATE");
    }
    throw error;
  }
}

function applyInfrastructureCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: InfrastructureCommandV6,
): ApplyCommandResultV6 {
  const player = requirePlayer(state, actor);
  const tile = tileAt(state, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at)) {
    return rejected(original, "TILE_UNEXPLORED");
  }
  const technology =
    command.kind === "CLEAR_FOREST"
      ? "FORESTRY"
      : command.kind === "REPLANT_FOREST"
        ? "FIELDCRAFT"
        : command.kind === "BUILD_ROAD"
          ? "ROADS"
          : "GRAND_WORKS";
  if (!player.researchedTechs.includes(technology)) {
    return rejected(original, "TECH_REQUIRED", { tech: technology });
  }
  const forestValid =
    tile.site === null &&
    tile.resource === null &&
    tile.improvement === null &&
    ((command.kind === "CLEAR_FOREST" && tile.terrain === "FOREST") ||
      (command.kind === "REPLANT_FOREST" && tile.terrain === "GRASS"));
  if (
    (command.kind === "CLEAR_FOREST" || command.kind === "REPLANT_FOREST") &&
    !forestValid
  ) {
    return rejected(original, "FOREST_ACTION_INVALID_TILE", {
      action: command.kind,
    });
  }
  if (command.kind === "BUILD_ROAD" && (tile.site !== null || tile.road)) {
    return rejected(original, "INVALID_TILE", { action: command.kind });
  }
  if (command.kind === "REDEVELOP" && tile.improvement === null) {
    return rejected(original, "REDEVELOP_INVALID_TARGET");
  }
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined || city.ownerId !== actor) {
    return rejected(original, "TERRITORY_NOT_OWNED");
  }
  if (isCityBesiegedV6(state, city)) return rejected(original, "CITY_BESIEGED");
  if (
    state.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  ) {
    return rejected(original, "CITY_REWARD_PENDING");
  }
  const cost =
    command.kind === "BUILD_ROAD"
      ? 2
      : command.kind === "REPLANT_FOREST"
        ? 4
        : 0;
  if (player.coins < cost) {
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  }

  try {
    const commandIndex = state.commandIndex + 1;
    const coinDelta = command.kind === "CLEAR_FOREST" ? 1 : -cost;
    const nextCoins = player.coins + coinDelta;
    if (
      !Number.isSafeInteger(commandIndex) ||
      !Number.isSafeInteger(nextCoins)
    ) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const removed = command.kind === "REDEVELOP" ? tile.improvement : null;
    const removedContribution =
      removed === null
        ? undefined
        : state.populationContributions.find(
            (contribution) =>
              contribution.source.kind === "IMPROVEMENT" &&
              sameCoord(contribution.source.at, command.at),
          );
    if (removed !== null && removedContribution === undefined) {
      return rejected(original, "INVALID_STATE");
    }
    const removedMarket =
      removed === "MARKET"
        ? spatialContributionAtV6(state, command.at, "MARKET").marketIncome
        : 0;
    const updatedTile: TileStateV6 = {
      ...tile,
      terrain:
        command.kind === "CLEAR_FOREST"
          ? "GRASS"
          : command.kind === "REPLANT_FOREST"
            ? "FOREST"
            : tile.terrain,
      road: command.kind === "BUILD_ROAD" ? true : tile.road,
      improvement: command.kind === "REDEVELOP" ? null : tile.improvement,
    };
    const board = {
      ...state.board,
      tiles: state.board.tiles.map((candidate) =>
        sameCoord(candidate.at, command.at) ? updatedTile : candidate,
      ),
    };
    const contributions =
      removedContribution === undefined
        ? state.populationContributions
        : state.populationContributions.filter(
            (contribution) => contribution.id !== removedContribution.id,
          );
    const recalculation = recomputeLiveEconomyV6(
      state,
      { board, cities: state.cities },
      contributions,
    );
    const players = state.players.map((candidate) =>
      candidate.id === actor ? { ...candidate, coins: nextCoins } : candidate,
    );
    const nextState = checkedState({
      ...state,
      commandIndex,
      board,
      players,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    const fact: DomainEventV6 =
      command.kind === "BUILD_ROAD"
        ? {
            kind: "ROAD_BUILT",
            playerId: actor,
            cityId: city.id,
            at: command.at,
            cost: 2,
          }
        : command.kind === "CLEAR_FOREST"
          ? {
              kind: "FOREST_CLEARED",
              playerId: actor,
              cityId: city.id,
              at: command.at,
              coinDelta: 1,
            }
          : command.kind === "REPLANT_FOREST"
            ? {
                kind: "FOREST_REPLANTED",
                playerId: actor,
                cityId: city.id,
                at: command.at,
                coinDelta: 0,
              }
            : {
                kind: "ECONOMIC_BUILDING_REMOVED",
                playerId: actor,
                cityId: city.id,
                at: command.at,
                improvement: requireImprovement(removed),
                populationContributionRemoved: removedContribution?.amount ?? 0,
                marketIncomeRemoved: removedMarket,
              };
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        fact,
        ...economyEvents(recalculation.changes),
        ...growthEventsForChanges(recalculation.changes),
      ],
    };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    if (cause instanceof RangeError) return rejected(original, "INVALID_STATE");
    throw cause;
  }
}

function applyCityRewardCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "CHOOSE_CITY_REWARD" }>,
): ApplyCommandResultV6 {
  const head = state.pendingChoices[0];
  if (head?.kind !== "CITY_REWARD" || head.cityId !== command.cityId) {
    return rejected(original, "PENDING_CHOICE", {
      kind: head?.kind ?? "NONE",
    });
  }
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  if (
    city.level < command.reachedLevel ||
    head.reachedLevel !== command.reachedLevel ||
    city.rewards.some(
      (record) => record.reachedLevel === command.reachedLevel,
    ) ||
    !head.candidates.includes(command.reward)
  ) {
    return rejected(original, "CITY_REWARD_MISMATCH", {
      reachedLevel: command.reachedLevel,
      reward: command.reward,
    });
  }
  const unitRole =
    command.reward === "MILITIA"
      ? "FIGHTER"
      : command.reward === "JUGGERNAUT"
        ? "JUGGERNAUT"
        : null;
  const placement =
    unitRole === null ? null : rewardUnitPlacementV6(state, city);
  if (unitRole !== null && placement === null) {
    return rejected(original, "NO_REWARD_UNIT_PLACEMENT");
  }

  try {
    let nextEntityId = state.nextEntityId;
    let players = state.players;
    let board = state.board;
    let cities = state.cities;
    let units = state.units;
    let contributions = state.populationContributions;
    let pendingChoices = state.pendingChoices.slice(1);
    const events: DomainEventV6[] = [
      {
        kind: "CITY_REWARD_CHOSEN",
        playerId: actor,
        cityId: city.id,
        reachedLevel: command.reachedLevel,
        reward: command.reward,
      },
    ];
    const rewardedCity: CityStateV6 = {
      ...city,
      expanded: city.expanded || command.reward === "EXPAND",
      rewards: [
        ...city.rewards,
        { reachedLevel: command.reachedLevel, reward: command.reward },
      ],
    };
    cities = cities.map((candidate) =>
      candidate.id === city.id ? rewardedCity : candidate,
    );

    if (command.reward === "SURVEY") {
      const reveal = revealRadius(state, actor, city.at, 3);
      players = players.map((candidate) =>
        candidate.id === actor
          ? { ...candidate, explored: reveal.explored }
          : candidate,
      );
      if (reveal.revealed.length > 0) {
        events.push({
          kind: "TILES_REVEALED",
          playerId: actor,
          tiles: reveal.revealed,
        });
      }
    } else if (
      command.reward === "STOCKPILE" ||
      command.reward === "TREASURY"
    ) {
      const amount = command.reward === "STOCKPILE" ? 4 : 5;
      const balance = requirePlayer(state, actor).coins + amount;
      if (!Number.isSafeInteger(balance))
        throw new RangeError("INTEGER_OVERFLOW");
      players = players.map((candidate) =>
        candidate.id === actor ? { ...candidate, coins: balance } : candidate,
      );
    } else if (command.reward === "EXPAND") {
      const claimed: CoordV6[] = [];
      board = {
        ...board,
        tiles: board.tiles.map((tile) => {
          if (
            tile.territoryCityId === null &&
            Math.max(
              Math.abs(tile.at.x - city.at.x),
              Math.abs(tile.at.y - city.at.y),
            ) <= 2
          ) {
            claimed.push(tile.at);
            return { ...tile, territoryCityId: city.id };
          }
          return tile;
        }),
      };
      claimed.sort(compareCoords);
      events.push({
        kind: "CITY_TERRITORY_EXPANDED",
        playerId: actor,
        cityId: city.id,
        tiles: claimed,
      });
    } else if (command.reward === "BOOM") {
      const allocationId = nextEntityId;
      nextEntityId += 1;
      if (!Number.isSafeInteger(nextEntityId)) {
        throw new RangeError("INTEGER_OVERFLOW");
      }
      contributions = [
        ...contributions,
        {
          id: allocationId,
          cityId: city.id,
          category: "PERMANENT",
          amount: 3,
          source: {
            kind: "CITY_REWARD",
            reward: "BOOM",
            reachedLevel: 4,
            at: city.at,
          },
        },
      ];
      const recalculation = recomputeLiveEconomyV6(
        state,
        { board, cities },
        contributions,
      );
      cities = recalculation.cities;
      contributions = recalculation.populationContributions;
      pendingChoices = [...recalculation.pendingChoices, ...pendingChoices];
      events.push(
        ...economyEvents(recalculation.changes),
        ...growthEventsForChanges(recalculation.changes),
      );
    } else if (unitRole !== null && placement !== null) {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rule = effectiveRoleRuleV6(
        requirePlayer(state, actor).faction,
        unitRole,
      );
      units = [
        ...units,
        {
          id: allocation.id,
          ownerId: actor,
          homeCityId: city.id,
          role: unitRole,
          at: placement,
          hp: rule.maxHp,
          maxHp: rule.maxHp,
          kills: 0,
          veteran: false,
          captureEligible: false,
          activation: {
            moved: true,
            movedPathLength: 0,
            attacked: true,
            healed: true,
            recovered: true,
            captured: true,
            handled: true,
            specialActed: true,
          },
        },
      ];
      events.push({
        kind: "UNIT_REWARD_GRANTED",
        playerId: actor,
        cityId: city.id,
        reachedLevel: command.reachedLevel,
        unitId: allocation.id,
        role: unitRole,
      });
    }

    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex)) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const nextState = checkedState({
      ...state,
      nextEntityId,
      commandIndex,
      players,
      board,
      cities,
      units,
      populationContributions: contributions,
      pendingChoices,
    });
    return { accepted: true, state: deepFreeze(nextState), events };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    if (cause instanceof RangeError) return rejected(original, "INVALID_STATE");
    throw cause;
  }
}

function applyTrainCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "TRAIN" }>,
): ApplyCommandResultV6 {
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  if (isCityBesiegedV6(state, city)) {
    return rejected(original, "CITY_BESIEGED", { cityId: city.id });
  }
  if (
    state.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  ) {
    return rejected(original, "CITY_REWARD_PENDING", { cityId: city.id });
  }
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV6(player.faction, command.role);
  if (rule.cost === null) {
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  }
  const cost = rule.cost;
  if (
    rule.technology !== null &&
    !player.researchedTechs.includes(rule.technology)
  ) {
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  }
  if (
    state.units.some((unit) => unit.hp > 0 && sameCoord(unit.at, city.at)) ||
    state.chocolateWalls.some((wall) => sameCoord(wall.at, city.at))
  ) {
    return rejected(original, "CITY_SPAWN_OCCUPIED", { cityId: city.id });
  }
  if (assignedUnitCountV6(state, city.id) >= cityUnitCapacityV6(city)) {
    return rejected(original, "CITY_CAPACITY_FULL", { cityId: city.id });
  }
  if (player.coins < cost) {
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  }
  try {
    const allocation = allocateUnitId(state.nextEntityId);
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex)) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const trained: UnitStateV6 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: city.id,
      role: command.role,
      at: city.at,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: exhaustedActivation(),
    };
    const nextState = checkedState({
      ...state,
      nextEntityId: allocation.nextEntityId,
      commandIndex,
      players: state.players.map((candidate) =>
        candidate.id === actor
          ? { ...candidate, coins: candidate.coins - cost }
          : candidate,
      ),
      units: [...state.units, trained],
    });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        {
          kind: "UNIT_TRAINED",
          playerId: actor,
          cityId: city.id,
          unitId: trained.id,
          role: trained.role,
          cost,
          at: trained.at,
        },
      ],
    };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    return rejected(original, "INVALID_STATE");
  }
}

function applyAttackCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "ATTACK" }>,
): ApplyCommandResultV6 {
  const attacker = state.units.find(
    (candidate) => candidate.id === command.unitId && candidate.hp > 0,
  );
  if (attacker === undefined) {
    return rejected(original, "UNIT_NOT_FOUND", { unitId: command.unitId });
  }
  if (attacker.ownerId !== actor) {
    return rejected(original, "UNIT_NOT_OWNED", { unitId: command.unitId });
  }
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV6(player.faction, attacker.role);
  if (
    attacker.activation.attacked ||
    attacker.activation.healed ||
    attacker.activation.recovered ||
    attacker.activation.captured ||
    attacker.activation.specialActed ||
    (attacker.activation.moved && !rule.mayUsePrimaryActionAfterMove)
  ) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: attacker.id });
  }
  if (
    !rule.abilities.includes("ATTACK") ||
    rule.attack2 <= 0 ||
    rule.range <= 0
  ) {
    return rejected(original, "ATTACK_NOT_LEGAL", { reason: "NO_ATTACK" });
  }
  const target = command.target;
  const defender =
    target.kind === "UNIT"
      ? state.units.find(
          (candidate) => candidate.id === target.unitId && candidate.hp > 0,
        )
      : undefined;
  const wall =
    target.kind === "CHOCOLATE_WALL"
      ? state.chocolateWalls.find(
          (candidate) => candidate.id === target.wallId && candidate.hp > 0,
        )
      : undefined;
  const targetAt = defender?.at ?? wall?.at;
  if (targetAt === undefined) {
    return rejected(original, "ATTACK_NOT_LEGAL", {
      reason: "TARGET_NOT_FOUND",
    });
  }
  if (defender?.ownerId === actor) {
    return rejected(original, "ATTACK_NOT_LEGAL", {
      reason: "TARGET_FRIENDLY",
    });
  }
  if (!isExplored(player, targetAt)) {
    return rejected(original, "ATTACK_NOT_LEGAL", {
      reason: "TARGET_UNEXPLORED",
    });
  }
  if (
    defender !== undefined &&
    arePlayersAlliedV6(state, actor, defender.ownerId)
  ) {
    return rejected(original, "TARGET_ALLIED");
  }
  if (chebyshev(attacker.at, targetAt) > rule.range) {
    return rejected(original, "ATTACK_NOT_LEGAL", { reason: "OUT_OF_RANGE" });
  }

  try {
    const preview = calculateCombatPreviewV6(
      state,
      attacker.id,
      command.target,
    );
    const nextAttackerKills =
      attacker.kills + (defender !== undefined && preview.defenderDies ? 1 : 0);
    const commandIndex = state.commandIndex + 1;
    if (
      !Number.isSafeInteger(commandIndex) ||
      !Number.isSafeInteger(nextAttackerKills)
    ) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const pushDestination =
      preview.push === "WILL_PUSH" && defender !== undefined
        ? pushedDestinationV6(state, attacker, defender)
        : null;
    const attackerAfter: UnitStateV6 = {
      ...attacker,
      at: preview.advances ? targetAt : attacker.at,
      hp: attacker.hp - preview.damageToAttacker,
      kills: nextAttackerKills,
      captureEligible: false,
      activation: {
        ...attacker.activation,
        attacked: true,
        handled: true,
      },
    };
    const defenderAfter =
      defender === undefined
        ? undefined
        : {
            ...defender,
            at: pushDestination ?? defender.at,
            hp: defender.hp - preview.damageToDefender,
            kills: defender.kills + (preview.attackerDies ? 1 : 0),
            captureEligible:
              pushDestination === null ? defender.captureEligible : false,
          };
    if (
      defenderAfter !== undefined &&
      !Number.isSafeInteger(defenderAfter.kills)
    ) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const units = state.units
      .map((unit) =>
        unit.id === attacker.id
          ? attackerAfter
          : defenderAfter !== undefined && unit.id === defenderAfter.id
            ? defenderAfter
            : unit,
      )
      .filter((unit) => unit.hp > 0);
    let chocolateWalls = state.chocolateWalls;
    if (wall !== undefined) {
      chocolateWalls = preview.defenderDies
        ? state.chocolateWalls.filter((candidate) => candidate.id !== wall.id)
        : state.chocolateWalls.map((candidate) =>
            candidate.id === wall.id
              ? { ...candidate, hp: candidate.hp - preview.damageToDefender }
              : candidate,
          );
    }
    const events: DomainEventV6[] = [{ kind: "COMBAT_RESOLVED", preview }];
    if (preview.defenderDies && defender !== undefined) {
      events.push({ kind: "UNIT_DIED", unitId: defender.id, cause: "ATTACK" });
    }
    if (wall !== undefined && preview.defenderDies) {
      events.push({
        kind: "CHOCOLATE_WALL_DESTROYED",
        wallId: wall.id,
        ownerId: wall.ownerId,
        at: wall.at,
        cause: "ATTACK",
      });
    }
    if (preview.attackerDies) {
      events.push({
        kind: "UNIT_DIED",
        unitId: attacker.id,
        cause: "RETALIATION",
      });
    }
    let players = state.players;
    if (preview.advances) {
      events.push({
        kind: "UNIT_MOVED",
        unitId: attacker.id,
        path: [targetAt],
      });
      const sight =
        rule.sightRadius +
        (tileAt(state, targetAt)?.terrain === "MOUNTAIN" &&
        player.researchedTechs.includes("SURVEYING")
          ? 1
          : 0);
      const reveal = revealRadius(state, actor, targetAt, sight);
      players = state.players.map((candidate) =>
        candidate.id === actor
          ? { ...candidate, explored: reveal.explored }
          : candidate,
      );
      if (reveal.revealed.length > 0) {
        events.push({
          kind: "TILES_REVEALED",
          playerId: actor,
          tiles: reveal.revealed,
        });
      }
    }
    if (pushDestination !== null && defender !== undefined) {
      events.push({
        kind: "UNIT_PUSHED",
        sourceUnitId: attacker.id,
        targetUnitId: defender.id,
        from: defender.at,
        to: pushDestination,
      });
    }
    const nextState = checkedState({
      ...state,
      commandIndex,
      players,
      units,
      chocolateWalls,
    });
    return { accepted: true, state: deepFreeze(nextState), events };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    return rejected(original, "INVALID_STATE");
  }
}

function applyKamikazeRollCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "KAMIKAZE_ROLL" }>,
): ApplyCommandResultV6 {
  const roller = state.units.find(
    (candidate) => candidate.id === command.unitId && candidate.hp > 0,
  );
  if (roller === undefined) {
    return rejected(original, "UNIT_NOT_FOUND", { unitId: command.unitId });
  }
  if (roller.ownerId !== actor) {
    return rejected(original, "UNIT_NOT_OWNED", { unitId: command.unitId });
  }
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV6(player.faction, roller.role);
  if (
    player.faction !== "CANDY" ||
    roller.role !== "RAIDER" ||
    !rule.abilities.includes("KAMIKAZE_ROLL")
  ) {
    return rejected(original, "UNIT_TYPE_INVALID", {
      expected: "CANDY_DONUT",
    });
  }
  if (
    roller.activation.moved ||
    roller.activation.attacked ||
    roller.activation.healed ||
    roller.activation.recovered ||
    roller.activation.captured ||
    roller.activation.specialActed
  ) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: roller.id });
  }
  const delta = directionDelta(command.direction);
  const first = { x: roller.at.x + delta.x, y: roller.at.y + delta.y };
  if (tileAt(state, first) === undefined) {
    return rejected(original, "ROLL_DIRECTION_INVALID", {
      direction: command.direction,
    });
  }

  try {
    const path: CoordV6[] = [];
    for (
      let at = first;
      at.x >= 0 &&
      at.y >= 0 &&
      at.x < state.board.width &&
      at.y < state.board.height;
      at = { x: at.x + delta.x, y: at.y + delta.y }
    ) {
      path.push(at);
    }
    let units = [...state.units];
    let chocolateWalls = [...state.chocolateWalls];
    const explored = [...player.explored];
    const events: DomainEventV6[] = [];
    for (const at of path) {
      events.push({ kind: "DONUT_ROLL_STEP", unitId: roller.id, at });
      if (!explored.some((known) => sameCoord(known, at))) {
        explored.push(at);
        explored.sort(compareCoords);
        events.push({ kind: "TILES_REVEALED", playerId: actor, tiles: [at] });
      }
      const victim = units.find(
        (candidate) =>
          candidate.id !== roller.id &&
          candidate.hp > 0 &&
          sameCoord(candidate.at, at),
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
            ? units.filter((candidate) => candidate.id !== victim.id)
            : units.map((candidate) =>
                candidate.id === victim.id
                  ? { ...candidate, hp: hpAfter }
                  : candidate,
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
      const wall = chocolateWalls.find((candidate) =>
        sameCoord(candidate.at, at),
      );
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
        chocolateWalls =
          hpAfter === 0
            ? chocolateWalls.filter((candidate) => candidate.id !== wall.id)
            : chocolateWalls.map((candidate) =>
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
    units = units.filter((candidate) => candidate.id !== roller.id);
    events.push({
      kind: "UNIT_DIED",
      unitId: roller.id,
      cause: "KAMIKAZE_ROLL_SELF",
    });
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex)) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const nextState = checkedState({
      ...state,
      commandIndex,
      units,
      chocolateWalls,
      players: state.players.map((candidate) =>
        candidate.id === actor ? { ...candidate, explored } : candidate,
      ),
    });
    return { accepted: true, state: deepFreeze(nextState), events };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    return rejected(original, "INVALID_STATE");
  }
}

function applyBuildChocolateWallCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "BUILD_CHOCOLATE_WALL" }>,
): ApplyCommandResultV6 {
  const unit = state.units.find(
    (candidate) => candidate.id === command.unitId && candidate.hp > 0,
  );
  if (unit === undefined) {
    return rejected(original, "UNIT_NOT_FOUND", { unitId: command.unitId });
  }
  if (unit.ownerId !== actor) {
    return rejected(original, "UNIT_NOT_OWNED", { unitId: command.unitId });
  }
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV6(player.faction, unit.role);
  if (
    player.faction !== "CANDY" ||
    unit.role !== "GUARD" ||
    !rule.abilities.includes("BUILD_CHOCOLATE_WALL")
  ) {
    return rejected(original, "UNIT_TYPE_INVALID", {
      expected: "CANDY_CHOCO_ENGINEER",
    });
  }
  if (unit.activation.moved || activationHasTerminalAction(unit)) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
  }
  const tile = tileAt(state, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at)) {
    return rejected(original, "TILE_UNEXPLORED");
  }
  if (chebyshev(unit.at, command.at) !== 1) {
    return rejected(original, "WALL_TARGET_NOT_ADJACENT", {
      at: { x: command.at.x, y: command.at.y },
    });
  }
  if (
    tile.site !== null ||
    state.treasureChests.some((chest) => sameCoord(chest, command.at)) ||
    state.units.some(
      (candidate) => candidate.hp > 0 && sameCoord(candidate.at, command.at),
    ) ||
    state.chocolateWalls.some((wall) => sameCoord(wall.at, command.at))
  ) {
    return rejected(original, "WALL_INVALID_TILE", {
      at: { x: command.at.x, y: command.at.y },
    });
  }
  const territoryOwner = territoryOwnerIdV6(state, tile.territoryCityId);
  if (
    territoryOwner !== null &&
    arePlayersAlliedV6(state, actor, territoryOwner)
  ) {
    return rejected(original, "ALLY_TERRITORY_FORBIDDEN", {
      at: { x: command.at.x, y: command.at.y },
    });
  }
  if (player.coins < 1) {
    return rejected(original, "INSUFFICIENT_COINS", { cost: 1 });
  }
  try {
    const allocation = allocateWallId(state.nextEntityId);
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex)) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const nextState = checkedState({
      ...state,
      nextEntityId: allocation.nextEntityId,
      commandIndex,
      players: state.players.map((candidate) =>
        candidate.id === actor
          ? { ...candidate, coins: candidate.coins - 1 }
          : candidate,
      ),
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              captureEligible: false,
              activation: {
                ...candidate.activation,
                handled: true,
                specialActed: true,
              },
            }
          : candidate,
      ),
      chocolateWalls: [
        ...state.chocolateWalls,
        { id: allocation.id, ownerId: actor, at: command.at, hp: 10 },
      ],
    });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        {
          kind: "CHOCOLATE_WALL_BUILT",
          playerId: actor,
          unitId: unit.id,
          wallId: allocation.id,
          at: command.at,
          cost: 1,
          hp: 10,
        },
      ],
    };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    return rejected(original, "INVALID_STATE");
  }
}

function applyCandifyCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  unitId: UnitStateV6["id"],
): ApplyCommandResultV6 {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined) {
    return rejected(original, "UNIT_NOT_FOUND", { unitId });
  }
  if (unit.ownerId !== actor) {
    return rejected(original, "UNIT_NOT_OWNED", { unitId });
  }
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV6(player.faction, unit.role);
  if (player.faction !== "CANDY" || !rule.abilities.includes("CANDIFY")) {
    return rejected(original, "CANDY_FACTION_REQUIRED");
  }
  if (activationHasTerminalAction(unit)) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
  }
  const tile = tileAt(state, unit.at);
  const previousOwnerId =
    tile === undefined ? null : territoryOwnerIdV6(state, tile.territoryCityId);
  if (
    tile === undefined ||
    !isExplored(player, unit.at) ||
    tile.site !== null ||
    previousOwnerId === actor
  ) {
    return rejected(original, "CANDIFY_INVALID_TILE");
  }
  if (
    !state.cities.some(
      (city) =>
        city.ownerId === actor && cityFootprintContainsV6(city, unit.at),
    )
  ) {
    return rejected(original, "CANDIFY_OUTSIDE_FOOTPRINT");
  }
  if (
    previousOwnerId !== null &&
    arePlayersAlliedV6(state, actor, previousOwnerId)
  ) {
    return rejected(original, "TARGET_ALLIED");
  }
  if (
    tile.territoryCityId !== null &&
    previousOwnerId !== null &&
    removalWouldDisconnectCityV6(state, tile.territoryCityId, unit.at)
  ) {
    return rejected(original, "CANDIFY_WOULD_DISCONNECT");
  }
  const candidates = nearestViableCandifyCitiesV6(state, actor, unit);
  if (candidates.length === 0) {
    return rejected(original, "CANDIFY_NO_ADJACENT_CITY");
  }
  if (candidates.length > 1) {
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex)) {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    const candidateCityIds = candidates.map((city) => city.id);
    try {
      const nextState = checkedState({
        ...state,
        commandIndex,
        pendingChoices: [
          ...state.pendingChoices,
          { kind: "CANDIFY_CITY" as const, unitId: unit.id, candidateCityIds },
        ],
      });
      return {
        accepted: true,
        state: deepFreeze(nextState),
        events: [
          {
            kind: "CANDIFY_CITY_CHOICE_REQUIRED",
            playerId: actor,
            unitId: unit.id,
            candidateCityIds,
          },
        ],
      };
    } catch {
      return rejected(original, "INVALID_STATE");
    }
  }
  const city = candidates[0];
  return city === undefined
    ? rejected(original, "INVALID_STATE")
    : resolveCandifyV6(
        original,
        state,
        actor,
        unit,
        city,
        state.pendingChoices,
      );
}

function applyChooseCandifyCityCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "CHOOSE_CANDIFY_CITY" }>,
): ApplyCommandResultV6 {
  const head = state.pendingChoices[0];
  if (head?.kind !== "CANDIFY_CITY" || head.unitId !== command.unitId) {
    return rejected(original, "CANDIFY_CHOICE_INVALID");
  }
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  if (!head.candidateCityIds.includes(city.id)) {
    return rejected(original, "CANDIFY_CITY_NOT_CANDIDATE");
  }
  const unit = state.units.find(
    (candidate) => candidate.id === command.unitId && candidate.hp > 0,
  );
  if (unit === undefined || unit.ownerId !== actor) {
    return rejected(original, "CANDIFY_CHOICE_INVALID");
  }
  if (
    !nearestViableCandifyCitiesV6(state, actor, unit).some(
      (candidate) => candidate.id === city.id,
    )
  ) {
    return rejected(original, "CANDIFY_CITY_NOT_CANDIDATE");
  }
  return resolveCandifyV6(
    original,
    state,
    actor,
    unit,
    city,
    state.pendingChoices.slice(1),
  );
}

function resolveCandifyV6(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  unit: UnitStateV6,
  city: CityStateV6,
  remainingChoices: readonly GameStateV6["pendingChoices"][number][],
): ApplyCommandResultV6 {
  const tile = tileAt(state, unit.at);
  if (tile === undefined) return rejected(original, "INVALID_STATE");
  const previousCityId = tile.territoryCityId;
  const previousOwnerId = territoryOwnerIdV6(state, previousCityId);
  try {
    const board = {
      ...state.board,
      tiles: state.board.tiles.map((candidate) =>
        sameCoord(candidate.at, unit.at)
          ? { ...candidate, territoryCityId: city.id }
          : candidate,
      ),
    };
    const recalculation = recomputeLiveEconomyV6(
      state,
      { board, cities: state.cities },
      state.populationContributions,
    );
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex)) {
      throw new RangeError("INTEGER_OVERFLOW");
    }
    const nextState = checkedState({
      ...state,
      commandIndex,
      board,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      units: state.units.filter((candidate) => candidate.id !== unit.id),
      pendingChoices: [...remainingChoices, ...recalculation.pendingChoices],
    });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        { kind: "UNIT_DIED", unitId: unit.id, cause: "CANDIFY" },
        {
          kind: "TILE_CANDIFIED",
          playerId: actor,
          unitId: unit.id,
          cityId: city.id,
          at: unit.at,
          previousCityId,
          previousOwnerId,
        },
        ...economyEvents(recalculation.changes),
        ...growthEventsForChanges(recalculation.changes),
      ],
    };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    return rejected(original, "INVALID_STATE");
  }
}

function applyHealCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "HEAL_ADJACENT" }>,
): ApplyCommandResultV6 {
  const medic = state.units.find(
    (candidate) => candidate.id === command.unitId && candidate.hp > 0,
  );
  if (medic === undefined) {
    return rejected(original, "UNIT_NOT_FOUND", { unitId: command.unitId });
  }
  if (medic.ownerId !== actor) {
    return rejected(original, "UNIT_NOT_OWNED", { unitId: command.unitId });
  }
  const rule = effectiveRoleRuleV6(
    requirePlayer(state, actor).faction,
    medic.role,
  );
  if (!rule.abilities.includes("HEAL_ADJACENT")) {
    return rejected(original, "UNIT_ROLE_INVALID", { role: medic.role });
  }
  if (
    medic.activation.attacked ||
    medic.activation.healed ||
    medic.activation.recovered ||
    medic.activation.captured ||
    medic.activation.specialActed ||
    (medic.activation.moved && !rule.mayUsePrimaryActionAfterMove)
  ) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: medic.id });
  }
  const target = state.units.find(
    (candidate) => candidate.id === command.targetUnitId && candidate.hp > 0,
  );
  if (target === undefined) {
    return rejected(original, "HEAL_TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  }
  if (target.ownerId !== actor) {
    return rejected(original, "HEAL_TARGET_NOT_OWNED", {
      targetUnitId: target.id,
    });
  }
  if (target.id === medic.id || chebyshev(medic.at, target.at) !== 1) {
    return rejected(original, "HEAL_TARGET_NOT_ADJACENT", {
      targetUnitId: target.id,
    });
  }
  if (target.hp >= target.maxHp) {
    return rejected(original, "HEAL_TARGET_FULL", { targetUnitId: target.id });
  }
  const intended = requirePlayer(state, actor).researchedTechs.includes(
    "RECOVERY",
  )
    ? 6
    : 4;
  const amount = Math.min(intended, target.maxHp - target.hp);
  const commandIndex = state.commandIndex + 1;
  if (!Number.isSafeInteger(commandIndex)) {
    return rejected(original, "INTEGER_OVERFLOW");
  }
  try {
    const units = state.units.map((candidate) =>
      candidate.id === medic.id
        ? {
            ...candidate,
            activation: {
              ...candidate.activation,
              healed: true,
              handled: true,
            },
          }
        : candidate.id === target.id
          ? { ...candidate, hp: candidate.hp + amount }
          : candidate,
    );
    const nextState = checkedState({ ...state, commandIndex, units });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        {
          kind: "UNIT_HEALED",
          medicId: medic.id,
          targetUnitId: target.id,
          amount,
          hpAfter: target.hp + amount,
        },
      ],
    };
  } catch {
    return rejected(original, "INVALID_STATE");
  }
}

function applyRecoverCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  unitId: UnitStateV6["id"],
): ApplyCommandResultV6 {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined)
    return rejected(original, "UNIT_NOT_FOUND", { unitId });
  if (unit.ownerId !== actor)
    return rejected(original, "UNIT_NOT_OWNED", { unitId });
  if (activationHasTerminalAction(unit) || unit.activation.moved) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  }
  if (unit.hp >= unit.maxHp) {
    return rejected(original, "RECOVER_NOT_LEGAL", { reason: "FULL_HP" });
  }
  const amount = Math.min(recoveryAmountV6(state, unit), unit.maxHp - unit.hp);
  const commandIndex = state.commandIndex + 1;
  if (!Number.isSafeInteger(commandIndex))
    return rejected(original, "INTEGER_OVERFLOW");
  try {
    const units = state.units.map((candidate) =>
      candidate.id === unit.id
        ? {
            ...candidate,
            hp: candidate.hp + amount,
            activation: {
              ...candidate.activation,
              recovered: true,
              handled: true,
            },
          }
        : candidate,
    );
    const nextState = checkedState({ ...state, commandIndex, units });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [{ kind: "UNIT_RECOVERED", unitId, amount, automatic: false }],
    };
  } catch {
    return rejected(original, "INVALID_STATE");
  }
}

function applyPromoteCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  unitId: UnitStateV6["id"],
): ApplyCommandResultV6 {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined)
    return rejected(original, "UNIT_NOT_FOUND", { unitId });
  if (unit.ownerId !== actor)
    return rejected(original, "UNIT_NOT_OWNED", { unitId });
  if (unit.veteran || unit.kills < 3) {
    return rejected(original, "PROMOTION_NOT_ELIGIBLE", { unitId });
  }
  const maxHp = unit.maxHp + 5;
  const commandIndex = state.commandIndex + 1;
  if (!Number.isSafeInteger(maxHp) || !Number.isSafeInteger(commandIndex)) {
    return rejected(original, "INTEGER_OVERFLOW");
  }
  try {
    const units = state.units.map((candidate) =>
      candidate.id === unit.id
        ? { ...candidate, hp: maxHp, maxHp, veteran: true }
        : candidate,
    );
    const nextState = checkedState({ ...state, commandIndex, units });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [{ kind: "UNIT_PROMOTED", unitId, maxHp }],
    };
  } catch {
    return rejected(original, "INVALID_STATE");
  }
}

function applyWaitCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  unitId: UnitStateV6["id"],
): ApplyCommandResultV6 {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined)
    return rejected(original, "UNIT_NOT_FOUND", { unitId });
  if (unit.ownerId !== actor)
    return rejected(original, "UNIT_NOT_OWNED", { unitId });
  if (unit.activation.handled) {
    return rejected(original, "UNIT_ALREADY_HANDLED", { unitId });
  }
  const commandIndex = state.commandIndex + 1;
  if (!Number.isSafeInteger(commandIndex))
    return rejected(original, "INTEGER_OVERFLOW");
  try {
    const units = state.units.map((candidate) =>
      candidate.id === unit.id
        ? {
            ...candidate,
            activation: { ...candidate.activation, handled: true },
          }
        : candidate,
    );
    const nextState = checkedState({ ...state, commandIndex, units });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [{ kind: "UNIT_WAITED", playerId: actor, unitId }],
    };
  } catch {
    return rejected(original, "INVALID_STATE");
  }
}

function applyMoveCommand(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  command: Extract<CommandV6, { readonly kind: "MOVE" }>,
): ApplyCommandResultV6 {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined || unit.hp <= 0) {
    return rejected(original, "UNIT_NOT_FOUND", { unitId: command.unitId });
  }
  if (unit.ownerId !== actor) {
    return rejected(original, "UNIT_NOT_OWNED", { unitId: command.unitId });
  }
  if (
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  ) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: command.unitId });
  }
  const validation = validateMovementPathV6(state, unit, command.path);
  if (!validation.legal) {
    return rejected(original, "MOVEMENT_ILLEGAL", {
      reason: validation.reason,
    });
  }
  try {
    const treasure = resolveTreasureCaptureV6(
      state,
      actor,
      unit,
      validation.destination,
    );
    const players = (treasure?.players ?? state.players).map((candidate) =>
      candidate.id === actor
        ? { ...candidate, explored: validation.explored }
        : candidate,
    );
    const units = state.units.map((candidate) =>
      candidate.id === unit.id
        ? {
            ...candidate,
            at: validation.destination,
            captureEligible: false,
            activation: {
              ...candidate.activation,
              moved: true,
              movedPathLength: validation.traversedPath.length,
              handled: true,
            },
          }
        : candidate,
    );
    if (treasure?.spawnedUnit !== null && treasure?.spawnedUnit !== undefined) {
      units.push(treasure.spawnedUnit);
    }
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex))
      throw new RangeError("INTEGER_OVERFLOW");
    const nextState = checkedState({
      ...state,
      commandIndex,
      players,
      units,
      random: treasure?.random ?? state.random,
      nextEntityId: treasure?.nextEntityId ?? state.nextEntityId,
      treasureChests: treasure?.treasureChests ?? state.treasureChests,
    });
    const events: DomainEventV6[] = [];
    if (validation.traversedPath.length > 0) {
      events.push({
        kind: "UNIT_MOVED",
        unitId: unit.id,
        path: validation.traversedPath,
      });
    }
    if (treasure !== null) events.push(treasure.event);
    if (validation.interruption !== null) {
      events.push({
        kind: "UNIT_MOVE_INTERRUPTED",
        unitId: unit.id,
        at: validation.interruption.at,
        reason: validation.interruption.reason,
      });
    }
    if (validation.revealed.length > 0) {
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: validation.revealed,
      });
    }
    return { accepted: true, state: deepFreeze(nextState), events };
  } catch (cause) {
    if (cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    return rejected(original, "INVALID_STATE");
  }
}

interface TreasureCaptureResolutionV6 {
  readonly players: readonly PlayerStateV6[];
  readonly random: GameStateV6["random"];
  readonly nextEntityId: number;
  readonly treasureChests: readonly CoordV6[];
  readonly spawnedUnit: UnitStateV6 | null;
  readonly event: Extract<
    DomainEventV6,
    { readonly kind: "TREASURE_CAPTURED" }
  >;
}

function resolveTreasureCaptureV6(
  state: GameStateV6,
  actor: PlayerId,
  capturingUnit: UnitStateV6,
  at: CoordV6,
): TreasureCaptureResolutionV6 | null {
  if (!state.treasureChests.some((candidate) => sameCoord(candidate, at))) {
    return null;
  }
  const draw = nextBounded(state.random, 2);
  const requestedReward = draw.value === 0 ? "COINS" : "HEAVY";
  const heavyPlacement =
    requestedReward === "HEAVY"
      ? treasureHeavyPlacementV6(state, actor, capturingUnit, at)
      : null;
  if (heavyPlacement !== null) {
    const allocation = allocateUnitId(state.nextEntityId);
    const rule = effectiveRoleRuleV6(
      requirePlayer(state, actor).faction,
      "HEAVY",
    );
    const spawnedUnit: UnitStateV6 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: heavyPlacement.homeCityId,
      role: "HEAVY",
      at: heavyPlacement.at,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: exhaustedActivation(),
    };
    return {
      players: state.players,
      random: draw.random,
      nextEntityId: allocation.nextEntityId,
      treasureChests: state.treasureChests.filter(
        (candidate) => !sameCoord(candidate, at),
      ),
      spawnedUnit,
      event: {
        kind: "TREASURE_CAPTURED",
        playerId: actor,
        unitId: capturingUnit.id,
        at,
        requestedReward,
        grantedReward: "HEAVY",
        coinDelta: 0,
        heavyFallback: false,
        spawnedUnitId: spawnedUnit.id,
        spawnedAt: spawnedUnit.at,
        homeCityId: spawnedUnit.homeCityId,
      },
    };
  }
  const player = requirePlayer(state, actor);
  const coins = player.coins + 5;
  if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
  return {
    players: state.players.map((candidate) =>
      candidate.id === actor ? { ...candidate, coins } : candidate,
    ),
    random: draw.random,
    nextEntityId: state.nextEntityId,
    treasureChests: state.treasureChests.filter(
      (candidate) => !sameCoord(candidate, at),
    ),
    spawnedUnit: null,
    event: {
      kind: "TREASURE_CAPTURED",
      playerId: actor,
      unitId: capturingUnit.id,
      at,
      requestedReward,
      grantedReward: "COINS",
      coinDelta: 5,
      heavyFallback: requestedReward === "HEAVY",
      spawnedUnitId: null,
      spawnedAt: null,
      homeCityId: null,
    },
  };
}

function treasureHeavyPlacementV6(
  state: GameStateV6,
  actor: PlayerId,
  capturingUnit: UnitStateV6,
  at: CoordV6,
): { readonly at: CoordV6; readonly homeCityId: CityStateV6["id"] } | null {
  const cities = state.cities
    .filter(
      (city) =>
        city.ownerId === actor &&
        assignedUnitCountV6(state, city.id) < cityUnitCapacityV6(city),
    )
    .sort((left, right) => {
      const leftHome = left.id === capturingUnit.homeCityId ? 0 : 1;
      const rightHome = right.id === capturingUnit.homeCityId ? 0 : 1;
      return leftHome - rightHome || left.id - right.id;
    });
  const player = requirePlayer(state, actor);
  for (const city of cities) {
    const adjacent: CoordV6[] = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx !== 0 || dy !== 0) adjacent.push({ x: at.x + dx, y: at.y + dy });
      }
    }
    for (const candidate of adjacent.sort(compareCoords)) {
      const tile = tileAt(state, candidate);
      if (
        tile === undefined ||
        (tile.terrain === "MOUNTAIN" &&
          !player.researchedTechs.includes("SURVEYING")) ||
        state.units.some(
          (unit) => unit.hp > 0 && sameCoord(unit.at, candidate),
        ) ||
        state.chocolateWalls.some((wall) => sameCoord(wall.at, candidate)) ||
        state.treasureChests.some((chest) => sameCoord(chest, candidate)) ||
        (tile.territoryCityId !== null &&
          arePlayersAlliedV6(
            state,
            actor,
            state.cities.find((owner) => owner.id === tile.territoryCityId)
              ?.ownerId ?? actor,
          ))
      ) {
        continue;
      }
      return { at: candidate, homeCityId: city.id };
    }
  }
  return null;
}

function applyEndTurn(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
): ApplyCommandResultV6 {
  const current = requirePlayer(state, actor);
  const preview = playerIncomeV6(state, actor);
  const recovered = endTurnRecoveryV6(state, current);
  const nextIndex = nextActiveSeatIndex(state);
  if (nextIndex === null) return rejected(original, "INVALID_STATE");
  const nextId = state.turnOrder[nextIndex];
  const nextPlayer = state.players.find((player) => player.id === nextId);
  if (nextPlayer === undefined) return rejected(original, "INVALID_STATE");
  try {
    const advanced: GameStateV6 = {
      ...recovered.state,
      activeSeatIndex: nextIndex,
      round: nextIndex <= state.activeSeatIndex ? state.round + 1 : state.round,
    };
    if (!Number.isSafeInteger(advanced.round))
      throw new RangeError("INTEGER_OVERFLOW");
    const started = startTurnV6(advanced, nextPlayer);
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex))
      throw new RangeError("INTEGER_OVERFLOW");
    const nextState = checkedState({ ...started.state, commandIndex });
    return {
      accepted: true,
      state: deepFreeze(nextState),
      events: [
        ...recovered.events,
        {
          kind: "INCOME_PREVIEWED",
          playerId: current.id,
          totalCoins: preview.totalCoins,
          cities: preview.cities,
        },
        { kind: "TURN_ENDED", playerId: current.id },
        ...started.events,
      ],
    };
  } catch (error) {
    if (error instanceof RangeError && error.message === "INTEGER_OVERFLOW") {
      return rejected(original, "INTEGER_OVERFLOW");
    }
    throw error;
  }
}

function applyCapture(
  original: GameStateV6,
  state: GameStateV6,
  actor: PlayerId,
  unitId: UnitStateV6["id"],
): ApplyCommandResultV6 {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined || unit.hp <= 0) {
    return rejected(original, "UNIT_NOT_FOUND", { unitId });
  }
  if (unit.ownerId !== actor) {
    return rejected(original, "UNIT_NOT_OWNED", { unitId });
  }
  const occupiedCity = state.cities.find((city) => sameCoord(city.at, unit.at));
  if (
    occupiedCity !== undefined &&
    arePlayersAlliedV6(state, actor, occupiedCity.ownerId)
  ) {
    return rejected(original, "TARGET_ALLIED");
  }
  const targetTile = tileAt(state, unit.at);
  const hostileCity =
    occupiedCity !== undefined &&
    arePlayersHostileV6(state, actor, occupiedCity.ownerId)
      ? occupiedCity
      : undefined;
  const village = occupiedCity === undefined && targetTile?.site === "VILLAGE";
  const role = effectiveRoleRuleV6(
    requirePlayer(state, actor).faction,
    unit.role,
  );
  if (
    (hostileCity === undefined && !village) ||
    !role.abilities.includes("CAPTURE") ||
    state.units.some(
      (candidate) =>
        candidate.id !== unit.id &&
        candidate.hp > 0 &&
        sameCoord(candidate.at, unit.at),
    ) ||
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed ||
    !unit.captureEligible
  ) {
    return rejected(original, "CAPTURE_NOT_ELIGIBLE", { reason: "NOT_READY" });
  }

  try {
    let nextEntityId = state.nextEntityId;
    let board = state.board;
    let cities: readonly CityStateV6[];
    let capturedCity: CityStateV6;
    let formerOwner: PlayerId | null;
    if (hostileCity === undefined) {
      const allocation = allocateCityId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      capturedCity = {
        id: allocation.id,
        ownerId: actor,
        at: unit.at,
        level: 1,
        permanentPopulation: 0,
        economicPopulation: 0,
        population: 0,
        isCapital: false,
        expanded: false,
        rewards: [],
      };
      formerOwner = null;
      cities = [...state.cities, capturedCity];
      board = {
        ...state.board,
        tiles: state.board.tiles.map((tile) => {
          const inFootprint =
            Math.max(
              Math.abs(tile.at.x - unit.at.x),
              Math.abs(tile.at.y - unit.at.y),
            ) <= 1;
          if (sameCoord(tile.at, unit.at)) {
            return {
              ...tile,
              site: "CITY" as const,
              territoryCityId: capturedCity.id,
            };
          }
          return inFootprint && tile.territoryCityId === null
            ? { ...tile, territoryCityId: capturedCity.id }
            : tile;
        }),
      };
    } else {
      formerOwner = hostileCity.ownerId;
      capturedCity = { ...hostileCity, ownerId: actor };
      cities = state.cities.map((city) =>
        city.id === capturedCity.id ? capturedCity : city,
      );
    }
    let units = state.units.map((candidate) => {
      if (candidate.id === unit.id) {
        return {
          ...candidate,
          homeCityId: capturedCity.id,
          captureEligible: false,
          activation: {
            ...candidate.activation,
            captured: true,
            handled: true,
          },
        };
      }
      return formerOwner !== null && candidate.homeCityId === capturedCity.id
        ? { ...candidate, homeCityId: null }
        : candidate;
    });
    let players = state.players;
    let pendingChoices = state.pendingChoices;
    let populationContributions = state.populationContributions;
    const events: DomainEventV6[] = [
      {
        kind: "CITY_CAPTURED",
        cityId: capturedCity.id,
        from: formerOwner,
        to: actor,
      },
    ];
    const reveal = revealRadiusOne(state, actor, capturedCity.at);
    if (reveal.revealed.length > 0) {
      players = players.map((player) =>
        player.id === actor ? { ...player, explored: reveal.explored } : player,
      );
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    }
    const recalculation = recomputeLiveEconomyV6(
      state,
      { board, cities },
      populationContributions,
    );
    cities = recalculation.cities;
    populationContributions = recalculation.populationContributions;
    pendingChoices = [...pendingChoices, ...recalculation.pendingChoices];
    events.push(
      ...economyEvents(recalculation.changes),
      ...growthEventsForChanges(recalculation.changes),
    );
    if (
      formerOwner !== null &&
      !cities.some((city) => city.ownerId === formerOwner)
    ) {
      const removed = units
        .filter((candidate) => candidate.ownerId === formerOwner)
        .sort((left, right) => left.id - right.id);
      units = units.filter((candidate) => candidate.ownerId !== formerOwner);
      players = players.map((player) =>
        player.id === formerOwner
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      );
      pendingChoices = pendingChoices.filter((choice) =>
        choice.kind === "CITY_REWARD"
          ? cities.some((city) => city.id === choice.cityId)
          : units.some((candidate) => candidate.id === choice.unitId),
      );
      events.push(
        ...removed.map((candidate): DomainEventV6 => ({
          kind: "UNIT_DIED",
          unitId: candidate.id,
          cause: "ELIMINATION",
        })),
      );
      events.push({ kind: "PLAYER_ELIMINATED", playerId: formerOwner });
    }
    const activePlayers = players.filter(
      (player) => player.status === "ACTIVE",
    );
    let outcome = state.outcome;
    if (
      players.find((player) => player.id === state.humanPlayerId)?.status ===
      "ELIMINATED"
    ) {
      outcome = {
        kind: "DEFEAT",
        humanId: state.humanPlayerId,
        defeatedByPlayerId: actor,
      };
    } else if (
      activePlayers.length === 1 &&
      activePlayers[0]?.id === state.humanPlayerId
    ) {
      outcome = { kind: "VICTORY", winnerId: state.humanPlayerId };
    }
    if (outcome !== null) events.push({ kind: "MATCH_ENDED", outcome });
    const commandIndex = state.commandIndex + 1;
    if (!Number.isSafeInteger(commandIndex))
      throw new RangeError("INTEGER_OVERFLOW");
    const nextState = checkedState({
      ...state,
      nextEntityId,
      commandIndex,
      board,
      players,
      cities,
      units,
      populationContributions,
      pendingChoices,
      outcome,
    });
    return { accepted: true, state: deepFreeze(nextState), events };
  } catch (error) {
    if (error instanceof RangeError)
      return rejected(original, "INTEGER_OVERFLOW");
    throw error;
  }
}

function commonError(
  state: GameStateV6,
  actor: PlayerId,
  command: CommandV6,
): RuleErrorV6 | null {
  if (state.outcome !== null) return error("MATCH_ENDED");
  const player = state.players.find((candidate) => candidate.id === actor);
  if (player?.status === "ELIMINATED") return error("PLAYER_ELIMINATED");
  if (
    state.turnOrder[state.activeSeatIndex] !== actor ||
    player === undefined
  ) {
    return error("NOT_ACTIVE_PLAYER");
  }
  const head = state.pendingChoices[0];
  const resolvesHead =
    (head?.kind === "CITY_REWARD" && command.kind === "CHOOSE_CITY_REWARD") ||
    (head?.kind === "CANDIFY_CITY" && command.kind === "CHOOSE_CANDIFY_CITY");
  if (head !== undefined && !resolvesHead) {
    return error("PENDING_CHOICE", {
      kind: head.kind,
    });
  }
  return null;
}

function exactUnknownResearchTech(command: unknown): string | null {
  return hasExactKeysV6(command, ["kind", "tech"]) &&
    command.kind === "RESEARCH" &&
    typeof command.tech === "string" &&
    !TECHNOLOGY_IDS.includes(command.tech as TechnologyId)
    ? command.tech
    : null;
}

function tileMatchesRule(
  tile: TileStateV6,
  rule: (typeof BASIC_ECONOMIC_ACTIONS_V6)[BasicEconomicCommandKindV6],
): boolean {
  return (
    tile.site === null &&
    tile.terrain === rule.terrain &&
    tile.resource === rule.resource &&
    tile.improvement === null
  );
}

function economyEvents(
  changes: readonly CityEconomyRecalculationV6[],
): readonly DomainEventV6[] {
  return changes.map((change) => ({
    kind: "CITY_ECONOMY_CHANGED",
    cityId: change.cityId,
    economicBefore: change.before.economicPopulation,
    economicAfter: change.after.economicPopulation,
    populationBefore: change.before.population,
    populationAfter: change.after.population,
    marketBefore: change.marketBefore,
    marketAfter: change.marketAfter,
  }));
}

function growthEventsForChanges(
  changes: readonly CityEconomyRecalculationV6[],
): readonly DomainEventV6[] {
  return changes.flatMap((change) =>
    change.reachedLevels.flatMap((level): readonly DomainEventV6[] => {
      const candidates =
        level === 2
          ? (["SURVEY", "STOCKPILE"] as const)
          : level === 3
            ? (["WALLS", "MILITIA"] as const)
            : level === 4
              ? (["EXPAND", "BOOM"] as const)
              : (["JUGGERNAUT", "TREASURY"] as const);
      return [
        { kind: "CITY_LEVELED_UP", cityId: change.cityId, level },
        {
          kind: "CITY_REWARD_QUEUED",
          cityId: change.cityId,
          reachedLevel: level,
          candidates,
        },
      ];
    }),
  );
}

function nextActiveSeatIndex(state: GameStateV6): number | null {
  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const index = (state.activeSeatIndex + offset) % state.turnOrder.length;
    const id = state.turnOrder[index];
    if (
      state.players.some(
        (player) => player.id === id && player.status === "ACTIVE",
      )
    ) {
      return index;
    }
  }
  return null;
}

function revealRadiusOne(
  state: GameStateV6,
  playerId: PlayerId,
  center: CoordV6,
): {
  readonly explored: readonly CoordV6[];
  readonly revealed: readonly CoordV6[];
} {
  return revealRadius(state, playerId, center, 1);
}

function revealRadius(
  state: GameStateV6,
  playerId: PlayerId,
  center: CoordV6,
  radius: number,
): {
  readonly explored: readonly CoordV6[];
  readonly revealed: readonly CoordV6[];
} {
  const player = requirePlayer(state, playerId);
  const prior = new Set(player.explored.map(coordKey));
  const explored = [...player.explored];
  const revealed: CoordV6[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(state.board.height - 1, center.y + radius);
    y += 1
  ) {
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(state.board.width - 1, center.x + radius);
      x += 1
    ) {
      const at = { x, y };
      if (!prior.has(coordKey(at))) {
        explored.push(at);
        revealed.push(at);
      }
    }
  }
  explored.sort(compareCoords);
  revealed.sort(compareCoords);
  return { explored, revealed };
}

function rewardUnitPlacementV6(
  state: GameStateV6,
  city: CityStateV6,
): CoordV6 | null {
  const player = requirePlayer(state, city.ownerId);
  const candidates = state.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === city.id &&
        (tile.terrain !== "MOUNTAIN" ||
          player.researchedTechs.includes("SURVEYING")) &&
        !state.units.some(
          (unit) => unit.hp > 0 && sameCoord(unit.at, tile.at),
        ) &&
        !state.chocolateWalls.some((wall) => sameCoord(wall.at, tile.at)),
    )
    .sort((left, right) => {
      const leftDistance = Math.max(
        Math.abs(left.at.x - city.at.x),
        Math.abs(left.at.y - city.at.y),
      );
      const rightDistance = Math.max(
        Math.abs(right.at.x - city.at.x),
        Math.abs(right.at.y - city.at.y),
      );
      return leftDistance - rightDistance || compareCoords(left.at, right.at);
    });
  return candidates[0]?.at ?? null;
}

function tileAt(state: GameStateV6, at: CoordV6): TileStateV6 | undefined {
  if (
    at.x < 0 ||
    at.y < 0 ||
    at.x >= state.board.width ||
    at.y >= state.board.height
  ) {
    return undefined;
  }
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  return tile !== undefined && sameCoord(tile.at, at) ? tile : undefined;
}

function requirePlayer(state: GameStateV6, id: PlayerId): PlayerStateV6 {
  const player = state.players.find((candidate) => candidate.id === id);
  if (player === undefined) throw new RangeError("Player disappeared");
  return player;
}

function requireImprovement<T>(value: T | null): T {
  if (value === null) throw new RangeError("Improvement disappeared");
  return value;
}

function isExplored(player: PlayerStateV6, at: CoordV6): boolean {
  return player.explored.some((candidate) => sameCoord(candidate, at));
}

function checkedState(state: GameStateV6): GameStateV6 {
  const parsed = parseGameStateV6(state);
  if (parsed === null) throw new RangeError("INVALID_STATE");
  return parsed;
}

function rejected(
  state: GameStateV6,
  code: RuleErrorCodeV6,
  params: Readonly<Record<string, JsonValue>> = {},
): ApplyCommandResultV6 {
  return { accepted: false, state, events: [], error: { code, params } };
}

function error(
  code: RuleErrorCodeV6,
  params: Readonly<Record<string, JsonValue>> = {},
): RuleErrorV6 {
  return { code, params };
}

function coordKey(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function compareCoords(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function chebyshev(left: CoordV6, right: CoordV6): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function directionDelta(direction: CardinalDirectionV6): CoordV6 {
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

function activationHasTerminalAction(unit: UnitStateV6): boolean {
  return (
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

function exhaustedActivation(): UnitStateV6["activation"] {
  return {
    moved: true,
    movedPathLength: 0,
    attacked: true,
    healed: true,
    recovered: true,
    captured: true,
    handled: true,
    specialActed: true,
  };
}
