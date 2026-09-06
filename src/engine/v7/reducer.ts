import { allocateCityId, allocateUnitId, type PlayerId } from "../model/ids";
import { deepFreeze } from "../model/freeze";
import type { JsonValue } from "../replay/canonical";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  ORIGINAL_BASELINE_V2_TREE,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
  technologyResearchCostV7,
  type BasicEconomicCommandKindV7,
  type SpatialEconomicCommandKindV7,
} from "../rules/ruleset-v7";
import { hasExactKeysV7 } from "./schema";
import { parseCommandV7, type CommandV7 } from "./commands";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
  economyEventsV7,
  growthEventsV7,
  isCityBesiegedV7,
  marketIncomeForCityV7,
  playerIncomeV7,
  recomputeLiveEconomyV7,
  reservedCapacityCountV7,
  startTurnEconomyV7,
  type CityEconomyChangeV7,
} from "./economy";
import type { DomainEventV7 } from "./events";
import { createInitialMapStateV7 } from "./map";
import { parseGameStateV7 } from "./state-schema";
import {
  adjacentTilesV7,
  spatialContributionAtV7,
  tileAtV7,
} from "./spatial-economy";
import {
  TECHNOLOGY_IDS_V7,
  type CityStateV7,
  type CoordV7,
  type DefectionCancellationReasonV7,
  type DefectionMarkV7,
  type GameStateV7,
  type MatchSetupV7,
  type PendingChoiceV7,
  type PlayerStateV7,
  type PopulationContributionV7,
  type TileStateV7,
  type UnitStateV7,
} from "./types";

export type RuleErrorCodeV7 =
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
  | "CITY_BLACKED_OUT"
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
  | "CITY_SPAWN_OCCUPIED"
  | "CITY_CAPACITY_FULL"
  | "UNIT_NOT_FOUND"
  | "UNIT_NOT_OWNED"
  | "UNIT_ALREADY_ACTED"
  | "UNIT_ROLE_INVALID"
  | "CAPTURE_NOT_ELIGIBLE"
  | "TARGET_ALLIED"
  | "PILLAGE_INVALID_TARGET"
  | "PURSUIT_MUST_END";
export interface RuleErrorV7 {
  readonly code: RuleErrorCodeV7;
  readonly params: Readonly<Record<string, JsonValue>>;
}
export type ApplyCommandResultV7 =
  | {
      readonly accepted: true;
      readonly state: GameStateV7;
      readonly events: readonly DomainEventV7[];
    }
  | {
      readonly accepted: false;
      readonly state: GameStateV7;
      readonly events: readonly [];
      readonly error: RuleErrorV7;
    };
export type CreatePlayableGameResultV7 =
  | {
      readonly ok: true;
      readonly state: GameStateV7;
      readonly events: readonly DomainEventV7[];
      readonly mapAttempt: number;
    }
  | Extract<ReturnType<typeof createInitialMapStateV7>, { readonly ok: false }>;

const BASIC_KINDS = new Set<string>(Object.keys(BASIC_ECONOMIC_ACTIONS_V7));
const SPATIAL_KINDS = new Set<string>(Object.keys(SPATIAL_ECONOMIC_ACTIONS_V7));

export function createPlayableGameV7(
  setup: MatchSetupV7,
): CreatePlayableGameResultV7 {
  const created = createInitialMapStateV7(setup);
  if (!created.ok) return created;
  const activeId = created.state.turnOrder[created.state.activeSeatIndex];
  const player = created.state.players.find((item) => item.id === activeId);
  if (player === undefined)
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  try {
    const started = startTurnEconomyV7(created.state, player);
    return {
      ok: true,
      state: checked(started.state),
      events: started.events,
      mapAttempt: created.mapAttempt,
    };
  } catch {
    return { ok: false, error: { code: "INVALID_SETUP", params: {} } };
  }
}

export function applyCommandV7(
  stateInput: GameStateV7,
  actor: PlayerId,
  input: CommandV7,
): ApplyCommandResultV7 {
  const state = parseGameStateV7(stateInput);
  if (state === null) return rejected(stateInput, "INVALID_STATE");
  const unknown = exactUnknownResearchTech(input);
  if (unknown !== null) {
    const common = commonError(state, actor, {
      kind: "RESEARCH",
      tech: "GATHERING",
    });
    return common === null
      ? rejected(stateInput, "TECH_NOT_FOUND", { tech: unknown })
      : rejected(stateInput, common.code, common.params);
  }
  const parsed = parseCommandV7(input);
  if (!parsed.ok) return rejected(stateInput, "INVALID_COMMAND");
  const command = parsed.value;
  const common = commonError(state, actor, command);
  if (common !== null) return rejected(stateInput, common.code, common.params);
  if (command.kind === "RESEARCH")
    return applyResearch(stateInput, state, actor, command.tech);
  if (BASIC_KINDS.has(command.kind))
    return applyBasic(
      stateInput,
      state,
      actor,
      command as Extract<CommandV7, { at: CoordV7 }>,
    );
  if (SPATIAL_KINDS.has(command.kind))
    return applySpatial(
      stateInput,
      state,
      actor,
      command as Extract<CommandV7, { at: CoordV7 }>,
    );
  if (
    ["CLEAR_FOREST", "REPLANT_FOREST", "BUILD_ROAD", "REDEVELOP"].includes(
      command.kind,
    )
  )
    return applyInfrastructure(
      stateInput,
      state,
      actor,
      command as Extract<CommandV7, { at: CoordV7 }>,
    );
  if (command.kind === "TRAIN")
    return applyTrain(stateInput, state, actor, command);
  if (command.kind === "CHOOSE_CITY_REWARD")
    return applyReward(stateInput, state, actor, command);
  if (command.kind === "CAPTURE")
    return applyCapture(stateInput, state, actor, command.unitId);
  if (command.kind === "PILLAGE")
    return applyPillage(stateInput, state, actor, command.unitId);
  if (command.kind === "DISBAND")
    return applyDisband(stateInput, state, actor, command.unitId);
  if (command.kind === "END_TURN")
    return applyEndTurn(stateInput, state, actor);
  return rejected(stateInput, "COMMAND_NOT_IMPLEMENTED", {
    kind: command.kind,
  });
}

function applyResearch(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  tech: (typeof TECHNOLOGY_IDS_V7)[number],
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const node = ORIGINAL_BASELINE_V2_TREE.nodes.find((item) => item.id === tech);
  if (node === undefined) return rejected(original, "TECH_NOT_FOUND", { tech });
  if (player.researchedTechs.includes(tech))
    return rejected(original, "TECH_ALREADY_RESEARCHED", { tech });
  const missing = node.prerequisites.find(
    (item) => !player.researchedTechs.includes(item),
  );
  if (missing !== undefined)
    return rejected(original, "TECH_PREREQUISITE_MISSING", {
      tech,
      prerequisite: missing,
    });
  try {
    const cityCount = state.cities.filter(
      (city) => city.ownerId === actor,
    ).length;
    const cost = technologyResearchCostV7(node.tier, cityCount);
    if (player.coins < cost)
      return rejected(original, "INSUFFICIENT_COINS", { cost });
    const commandIndex = nextSafe(state.commandIndex);
    const researchedTechs = TECHNOLOGY_IDS_V7.filter(
      (item) => player.researchedTechs.includes(item) || item === tech,
    );
    return accepted(
      checked({
        ...state,
        commandIndex,
        players: state.players.map((item) =>
          item.id === actor
            ? { ...item, coins: item.coins - cost, researchedTechs }
            : item,
        ),
      }),
      [{ kind: "TECH_RESEARCHED", playerId: actor, tech, cost }],
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyBasic(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { at: CoordV7 }>,
): ApplyCommandResultV7 {
  const kind = command.kind as BasicEconomicCommandKindV7;
  const rule = BASIC_ECONOMIC_ACTIONS_V7[kind];
  const validation = validateTileContext(
    state,
    actor,
    command.at,
    rule.technology,
    kind,
    (tile) =>
      tile.site === null &&
      tile.terrain === rule.terrain &&
      tile.resource === rule.resource &&
      tile.improvement === null,
  );
  if (!validation.ok)
    return rejected(original, validation.code, validation.params);
  const { player, tile, city } = validation;
  if (player.coins < rule.cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  try {
    const contribution: PopulationContributionV7 = {
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
              improvement: requireValue(rule.improvement),
              at: command.at,
            },
    };
    const board = replaceTile(state, command.at, {
      ...tile,
      resource: null,
      improvement: rule.improvement,
    });
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      [...state.populationContributions, contribution],
    );
    const next = checked({
      ...state,
      nextEntityId: nextSafe(state.nextEntityId),
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: debit(state.players, actor, rule.cost),
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    const fact: DomainEventV7 =
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
            improvement: requireValue(rule.improvement),
            cost: rule.cost,
            populationContribution: rule.population,
            marketIncome: 0,
            capacityDelta: 0,
          };
    return accepted(next, [fact, ...economyAndGrowth(recalculation.changes)]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applySpatial(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { at: CoordV7 }>,
): ApplyCommandResultV7 {
  const kind = command.kind as SpatialEconomicCommandKindV7;
  const rule = SPATIAL_ECONOMIC_ACTIONS_V7[kind];
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at))
    return rejected(original, "TILE_UNEXPLORED");
  if (!player.researchedTechs.includes(rule.technology))
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (tile.site !== null || tile.resource !== null || tile.improvement !== null)
    return rejected(original, "INVALID_TILE", { action: kind });
  const city = state.cities.find((item) => item.id === tile.territoryCityId);
  if (city === undefined || city.ownerId !== actor)
    return rejected(original, "TERRITORY_NOT_OWNED");
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (city.blackout?.phase === "ACTIVE")
    return rejected(original, "CITY_BLACKED_OUT");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  if (
    state.board.tiles.some(
      (item) =>
        item.territoryCityId === city.id &&
        item.improvement === rule.improvement,
    )
  )
    return rejected(original, "CITY_BUILDING_LIMIT", {
      improvement: rule.improvement,
    });
  const board = replaceTile(state, command.at, {
    ...tile,
    improvement: rule.improvement,
  });
  const evaluation = spatialContributionAtV7(
    { board, cities: state.cities },
    command.at,
    rule.improvement,
  );
  const barracksAdjacent =
    rule.improvement !== "BARRACKS" ||
    adjacentTilesV7(state.board, city.at).some((item) =>
      same(item.at, command.at),
    );
  if (!barracksAdjacent || evaluation.placementCount < rule.placementMinimum)
    return rejected(original, "PLACEMENT_REQUIREMENT_UNMET", {
      improvement: rule.improvement,
      required: rule.improvement === "BARRACKS" ? 1 : rule.placementMinimum,
      count: barracksAdjacent ? evaluation.placementCount : 0,
    });
  if (player.coins < rule.cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  try {
    let nextEntityId = state.nextEntityId;
    let contributions = state.populationContributions;
    if (rule.improvement !== "MARKET" && rule.improvement !== "BARRACKS") {
      contributions = [
        ...contributions,
        {
          id: nextEntityId,
          cityId: city.id,
          category: "LIVE",
          amount: evaluation.population,
          source: {
            kind: "IMPROVEMENT",
            improvement: rule.improvement,
            at: command.at,
          },
        },
      ];
      nextEntityId = nextSafe(nextEntityId);
    }
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      contributions,
    );
    const next = checked({
      ...state,
      nextEntityId,
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: debit(state.players, actor, rule.cost),
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    return accepted(next, [
      {
        kind: "ECONOMIC_BUILDING_BUILT",
        playerId: actor,
        cityId: city.id,
        at: command.at,
        improvement: rule.improvement,
        cost: rule.cost,
        populationContribution: evaluation.population,
        marketIncome: evaluation.marketIncome,
        capacityDelta: rule.improvement === "BARRACKS" ? 1 : 0,
      },
      ...economyAndGrowth(recalculation.changes),
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyInfrastructure(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { at: CoordV7 }>,
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at))
    return rejected(original, "TILE_UNEXPLORED");
  const tech =
    command.kind === "CLEAR_FOREST"
      ? "FORESTRY"
      : command.kind === "REPLANT_FOREST"
        ? "FIELDCRAFT"
        : command.kind === "BUILD_ROAD"
          ? "ROADS"
          : "GRAND_WORKS";
  if (!player.researchedTechs.includes(tech))
    return rejected(original, "TECH_REQUIRED", { tech });
  const forestValid =
    tile.site === null &&
    tile.resource === null &&
    tile.improvement === null &&
    ((command.kind === "CLEAR_FOREST" && tile.terrain === "FOREST") ||
      (command.kind === "REPLANT_FOREST" && tile.terrain === "GRASS"));
  if (
    (command.kind === "CLEAR_FOREST" || command.kind === "REPLANT_FOREST") &&
    !forestValid
  )
    return rejected(original, "FOREST_ACTION_INVALID_TILE", {
      action: command.kind,
    });
  if (command.kind === "BUILD_ROAD" && (tile.site !== null || tile.road))
    return rejected(original, "INVALID_TILE", { action: command.kind });
  if (command.kind === "REDEVELOP" && tile.improvement === null)
    return rejected(original, "REDEVELOP_INVALID_TARGET");
  const city = state.cities.find((item) => item.id === tile.territoryCityId);
  if (city === undefined || city.ownerId !== actor)
    return rejected(original, "TERRITORY_NOT_OWNED");
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (city.blackout?.phase === "ACTIVE")
    return rejected(original, "CITY_BLACKED_OUT");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  const cost =
    command.kind === "BUILD_ROAD"
      ? 2
      : command.kind === "REPLANT_FOREST"
        ? 4
        : 0;
  if (player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  try {
    const removed = command.kind === "REDEVELOP" ? tile.improvement : null;
    const removedContribution =
      removed === null || removed === "MARKET" || removed === "BARRACKS"
        ? undefined
        : state.populationContributions.find(
            (item) =>
              item.source.kind === "IMPROVEMENT" &&
              same(item.source.at, command.at),
          );
    if (
      removed !== null &&
      removed !== "MARKET" &&
      removed !== "BARRACKS" &&
      removedContribution === undefined
    )
      return rejected(original, "INVALID_STATE");
    const marketRemoved =
      removed === "MARKET" ? marketIncomeForCityV7(state, city) : 0;
    const board = replaceTile(state, command.at, {
      ...tile,
      terrain:
        command.kind === "CLEAR_FOREST"
          ? "GRASS"
          : command.kind === "REPLANT_FOREST"
            ? "FOREST"
            : tile.terrain,
      road: command.kind === "BUILD_ROAD" ? true : tile.road,
      improvement: command.kind === "REDEVELOP" ? null : tile.improvement,
    });
    const contributions =
      removedContribution === undefined
        ? state.populationContributions
        : state.populationContributions.filter(
            (item) => item.id !== removedContribution.id,
          );
    let cancellation = {
      marks: state.defectionMarks,
      events: [] as readonly DomainEventV7[],
    };
    if (removed === "BARRACKS")
      cancellation = revalidateReservations(
        { ...state, board, defectionMarks: state.defectionMarks },
        "CAPACITY_LOST",
      );
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      contributions,
    );
    const coins = player.coins + (command.kind === "CLEAR_FOREST" ? 1 : -cost);
    if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
    const next = checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: state.players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      ),
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      defectionMarks: cancellation.marks,
      pendingChoices: [
        ...state.pendingChoices,
        ...recalculation.pendingChoices,
      ],
    });
    const fact: DomainEventV7 =
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
                improvement: requireValue(removed),
                populationContributionRemoved: removedContribution?.amount ?? 0,
                marketIncomeRemoved: marketRemoved,
                capacityDelta: removed === "BARRACKS" ? -1 : 0,
              };
    return accepted(next, [
      fact,
      ...cancellation.events,
      ...economyAndGrowth(recalculation.changes),
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyTrain(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "TRAIN" }>,
): ApplyCommandResultV7 {
  const city = state.cities.find((item) => item.id === command.cityId);
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  if (isCityBesiegedV7(state, city))
    return rejected(original, "CITY_BESIEGED", { cityId: city.id });
  if (city.blackout?.phase === "ACTIVE")
    return rejected(original, "CITY_BLACKED_OUT", { cityId: city.id });
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING", { cityId: city.id });
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV7(command.role);
  if (rule.cost === null)
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  if (
    rule.technology !== null &&
    !player.researchedTechs.includes(rule.technology)
  )
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (state.units.some((unit) => unit.hp > 0 && same(unit.at, city.at)))
    return rejected(original, "CITY_SPAWN_OCCUPIED", { cityId: city.id });
  if (
    assignedUnitCountV7(state, city.id) +
      reservedCapacityCountV7(state, city.id) >=
    cityUnitCapacityV7(state, city)
  )
    return rejected(original, "CITY_CAPACITY_FULL", { cityId: city.id });
  if (player.coins < rule.cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  try {
    const allocation = allocateUnitId(state.nextEntityId);
    const trained: UnitStateV7 = {
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
      blackoutEligibleRound: command.role === "SABOTEUR" ? 1 : null,
    };
    return accepted(
      checked({
        ...state,
        nextEntityId: allocation.nextEntityId,
        commandIndex: nextSafe(state.commandIndex),
        players: debit(state.players, actor, rule.cost),
        units: [...state.units, trained],
      }),
      [
        {
          kind: "UNIT_TRAINED",
          playerId: actor,
          cityId: city.id,
          unitId: trained.id,
          role: trained.role,
          cost: rule.cost,
          at: trained.at,
        },
      ],
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyReward(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }>,
): ApplyCommandResultV7 {
  const head = state.pendingChoices[0];
  if (head?.kind !== "CITY_REWARD" || head.cityId !== command.cityId)
    return rejected(original, "PENDING_CHOICE", { kind: head?.kind ?? "NONE" });
  const city = state.cities.find((item) => item.id === command.cityId);
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  if (
    city.level < command.reachedLevel ||
    head.reachedLevel !== command.reachedLevel ||
    city.rewards.some((item) => item.reachedLevel === command.reachedLevel) ||
    !head.candidates.includes(command.reward)
  )
    return rejected(original, "CITY_REWARD_MISMATCH", {
      reachedLevel: command.reachedLevel,
      reward: command.reward,
    });
  const unitRole =
    command.reward === "MILITIA"
      ? "FIGHTER"
      : command.reward === "JUGGERNAUT"
        ? "JUGGERNAUT"
        : null;
  const placement = unitRole === null ? null : rewardPlacement(state, city);
  if (unitRole !== null && placement === null)
    return rejected(original, "NO_REWARD_UNIT_PLACEMENT");
  try {
    let nextEntityId = state.nextEntityId;
    let players = state.players;
    let board = state.board;
    let cities: readonly CityStateV7[] = state.cities;
    let units = state.units;
    let contributions = state.populationContributions;
    let choices: readonly PendingChoiceV7[] = state.pendingChoices.slice(1);
    const events: DomainEventV7[] = [
      {
        kind: "CITY_REWARD_CHOSEN",
        playerId: actor,
        cityId: city.id,
        reachedLevel: command.reachedLevel,
        reward: command.reward,
      },
    ];
    const rewarded = {
      ...city,
      expanded: city.expanded || command.reward === "EXPAND",
      rewards: [
        ...city.rewards,
        { reachedLevel: command.reachedLevel, reward: command.reward },
      ],
    };
    cities = cities.map((item) => (item.id === city.id ? rewarded : item));
    if (command.reward === "SURVEY") {
      const reveal = revealRadius(state, actor, city.at, 3);
      players = setExplored(players, actor, reveal.explored);
      if (reveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: actor,
          tiles: reveal.revealed,
        });
    } else if (
      command.reward === "STOCKPILE" ||
      command.reward === "TREASURY"
    ) {
      const amount = command.reward === "STOCKPILE" ? 4 : 5;
      const coins = requirePlayer(state, actor).coins + amount;
      if (!Number.isSafeInteger(coins))
        throw new RangeError("INTEGER_OVERFLOW");
      players = players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      );
    } else if (command.reward === "EXPAND") {
      const claimed: CoordV7[] = [];
      board = {
        ...board,
        tiles: board.tiles.map((tile) => {
          if (
            tile.territoryCityId === null &&
            chebyshev(tile.at, city.at) <= 2
          ) {
            claimed.push(tile.at);
            return { ...tile, territoryCityId: city.id };
          }
          return tile;
        }),
      };
      claimed.sort(compareCoords);
      const known = new Set(requirePlayer(state, actor).explored.map(key));
      const revealed = claimed.filter((at) => !known.has(key(at)));
      players = setExplored(
        players,
        actor,
        [...requirePlayer(state, actor).explored, ...revealed].sort(
          compareCoords,
        ),
      );
      events.push({
        kind: "CITY_TERRITORY_EXPANDED",
        playerId: actor,
        cityId: city.id,
        tiles: claimed,
      });
      if (revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: actor,
          tiles: revealed,
        });
    } else if (command.reward === "BOOM") {
      contributions = [
        ...contributions,
        {
          id: nextEntityId,
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
      nextEntityId = nextSafe(nextEntityId);
      const recalc = recomputeLiveEconomyV7(
        state,
        { board, cities },
        contributions,
      );
      cities = recalc.cities;
      contributions = recalc.populationContributions;
      choices = [...recalc.pendingChoices, ...choices];
      events.push(...economyAndGrowth(recalc.changes));
    } else if (unitRole !== null && placement !== null) {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rule = effectiveRoleRuleV7(unitRole);
      const created: UnitStateV7 = {
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
        activation: exhaustedActivation(),
        blackoutEligibleRound: null,
      };
      units = [...units, created];
      events.push({
        kind: "UNIT_REWARD_GRANTED",
        playerId: actor,
        cityId: city.id,
        reachedLevel: command.reachedLevel,
        unitId: created.id,
        role: unitRole,
      });
    }
    const cancellation = revalidateReservations(
      { ...state, board, cities, units, defectionMarks: state.defectionMarks },
      "CAPACITY_LOST",
    );
    events.push(...cancellation.events);
    return accepted(
      checked({
        ...state,
        nextEntityId,
        commandIndex: nextSafe(state.commandIndex),
        players,
        board,
        cities,
        units,
        populationContributions: contributions,
        pendingChoices: choices,
        defectionMarks: cancellation.marks,
      }),
      events,
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyPillage(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const player = requirePlayer(state, actor);
  if (!player.researchedTechs.includes("EXPLOSIVES"))
    return rejected(original, "TECH_REQUIRED", { tech: "EXPLOSIVES" });
  const { unit } = actorCheck;
  if (primaryUsed(unit) || unit.activation.pursuitPhase !== "NONE")
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  const tile = tileAtV7(state.board, unit.at);
  const city = state.cities.find((item) => item.id === tile?.territoryCityId);
  if (
    tile?.improvement === null ||
    tile?.improvement === undefined ||
    city === undefined ||
    !arePlayersHostileV7(state, actor, city.ownerId)
  )
    return rejected(original, "PILLAGE_INVALID_TARGET");
  try {
    const improvement = tile.improvement;
    const contribution =
      improvement === "MARKET" || improvement === "BARRACKS"
        ? undefined
        : state.populationContributions.find(
            (item) =>
              item.source.kind === "IMPROVEMENT" &&
              same(item.source.at, tile.at),
          );
    if (
      improvement !== "MARKET" &&
      improvement !== "BARRACKS" &&
      contribution === undefined
    )
      return rejected(original, "INVALID_STATE");
    const board = replaceTile(state, tile.at, { ...tile, improvement: null });
    const contributions =
      contribution === undefined
        ? state.populationContributions
        : state.populationContributions.filter(
            (item) => item.id !== contribution.id,
          );
    const coins = player.coins + 1;
    if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
    const cancellation =
      improvement === "BARRACKS"
        ? revalidateReservations(
            { ...state, board, defectionMarks: state.defectionMarks },
            "CAPACITY_LOST",
          )
        : {
            marks: state.defectionMarks,
            events: [] as readonly DomainEventV7[],
          };
    const recalc = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      contributions,
    );
    const units = state.units.map((item) =>
      item.id === unit.id
        ? {
            ...item,
            activation: {
              ...item.activation,
              specialActed: true,
              handled: true,
            },
          }
        : item,
    );
    const next = checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: state.players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      ),
      cities: recalc.cities,
      populationContributions: recalc.populationContributions,
      units,
      defectionMarks: cancellation.marks,
      pendingChoices: [...state.pendingChoices, ...recalc.pendingChoices],
    });
    return accepted(next, [
      {
        kind: "IMPROVEMENT_PILLAGED",
        playerId: actor,
        unitId: unit.id,
        cityId: city.id,
        at: tile.at,
        improvement,
        coinDelta: 1,
      },
      ...cancellation.events,
      ...economyAndGrowth(recalc.changes),
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyDisband(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const player = requirePlayer(state, actor);
  if (!player.researchedTechs.includes("RECOVERY"))
    return rejected(original, "TECH_REQUIRED", { tech: "RECOVERY" });
  const rule = effectiveRoleRuleV7(actorCheck.unit.role);
  if (rule.cost === null)
    return rejected(original, "UNIT_ROLE_INVALID", {
      role: actorCheck.unit.role,
    });
  if (
    primaryUsed(actorCheck.unit) ||
    actorCheck.unit.activation.pursuitPhase !== "NONE"
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  const refund = Math.floor(rule.cost / 2);
  try {
    const coins = player.coins + refund;
    if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
    const units = state.units.filter((item) => item.id !== unitId);
    const removedMarks = removeMarksForUnit(state.defectionMarks, unitId);
    const afterRemoval = {
      ...state,
      units,
      defectionMarks: removedMarks.marks,
      saboteurExposures: state.saboteurExposures.filter(
        (item) => item.unitId !== unitId,
      ),
    };
    const capacity = revalidateReservations(afterRemoval, "CAPACITY_LOST");
    const next = checked({
      ...afterRemoval,
      commandIndex: nextSafe(state.commandIndex),
      players: state.players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      ),
      defectionMarks: capacity.marks,
    });
    return accepted(next, [
      {
        kind: "UNIT_DISBANDED",
        playerId: actor,
        unitId,
        role: actorCheck.unit.role,
        coinDelta: refund,
      },
      ...removedMarks.events,
      ...capacity.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyCapture(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const unit = state.units.find((item) => item.id === unitId);
  if (unit === undefined || unit.hp <= 0)
    return rejected(original, "UNIT_NOT_FOUND", { unitId });
  if (unit.ownerId !== actor)
    return rejected(original, "UNIT_NOT_OWNED", { unitId });
  const occupied = state.cities.find((city) => same(city.at, unit.at));
  if (
    occupied !== undefined &&
    arePlayersAlliedV7(state, actor, occupied.ownerId)
  )
    return rejected(original, "TARGET_ALLIED");
  const tile = tileAtV7(state.board, unit.at);
  const hostile =
    occupied !== undefined &&
    arePlayersHostileV7(state, actor, occupied.ownerId)
      ? occupied
      : undefined;
  const village = occupied === undefined && tile?.site === "VILLAGE";
  const canCapture = effectiveRoleRuleV7(unit.role).abilities.includes(
    "CAPTURE",
  );
  if (
    (!village && hostile === undefined) ||
    !canCapture ||
    state.units.some(
      (item) => item.id !== unit.id && item.hp > 0 && same(item.at, unit.at),
    ) ||
    unit.activation.moved ||
    primaryUsed(unit) ||
    !unit.captureEligible ||
    unit.activation.pursuitPhase !== "NONE"
  )
    return rejected(original, "CAPTURE_NOT_ELIGIBLE", { reason: "NOT_READY" });
  const player = requirePlayer(state, actor);
  const spoils =
    hostile !== undefined &&
    player.researchedTechs.includes("DRILL") &&
    !player.spoilsClaimedCityIds.includes(hostile.id);
  if (spoils && !Number.isSafeInteger(player.coins + 2))
    return rejected(original, "INTEGER_OVERFLOW");
  try {
    let nextEntityId = state.nextEntityId;
    let board = state.board;
    let cities: readonly CityStateV7[];
    let captured: CityStateV7;
    const formerOwner = hostile?.ownerId ?? null;
    if (hostile === undefined) {
      const allocation = allocateCityId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      captured = {
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
        blackout: null,
      };
      cities = [...state.cities, captured].sort((a, b) => a.id - b.id);
      board = {
        ...board,
        tiles: board.tiles.map((item) =>
          same(item.at, unit.at)
            ? { ...item, site: "CITY", territoryCityId: captured.id }
            : chebyshev(item.at, unit.at) <= 1 && item.territoryCityId === null
              ? { ...item, territoryCityId: captured.id }
              : item,
        ),
      };
    } else {
      captured = {
        ...hostile,
        ownerId: actor,
        blackout:
          hostile.blackout === null
            ? null
            : {
                phase: "RECOVERY",
                recoveryOwnerId: actor,
                unaffectedTurnStarted: false,
              },
      };
      cities = state.cities.map((item) =>
        item.id === captured.id ? captured : item,
      );
    }
    let units = state.units.map((item) =>
      item.id === unit.id
        ? {
            ...item,
            homeCityId: captured.id,
            captureEligible: false,
            activation: { ...item.activation, captured: true, handled: true },
          }
        : formerOwner !== null && item.homeCityId === captured.id
          ? { ...item, homeCityId: null }
          : item,
    );
    let players: readonly PlayerStateV7[] = state.players.map((item) =>
      item.id === actor && spoils
        ? {
            ...item,
            coins: item.coins + 2,
            spoilsClaimedCityIds: [
              ...item.spoilsClaimedCityIds,
              captured.id,
            ].sort((a, b) => a - b),
          }
        : item,
    );
    let choices = state.pendingChoices;
    let contributions = state.populationContributions;
    let marks = state.defectionMarks;
    const events: DomainEventV7[] = [
      {
        kind: "CITY_CAPTURED",
        cityId: captured.id,
        from: formerOwner,
        to: actor,
      },
    ];
    if (hostile?.blackout !== null && hostile?.blackout !== undefined)
      events.push({
        kind: "BLACKOUT_RECOVERY_STARTED",
        cityId: captured.id,
        ownerId: actor,
        reason: "CITY_CAPTURED",
      });
    const captureMarks = revalidateReservations(
      { ...state, board, cities, units, defectionMarks: marks },
      "RESERVED_CITY_LOST",
    );
    marks = captureMarks.marks;
    events.push(...captureMarks.events);
    if (spoils)
      events.push({
        kind: "SPOILS_AWARDED",
        playerId: actor,
        cityId: captured.id,
        coins: 2,
      });
    const reveal = revealRadius(
      { ...state, board, cities } as GameStateV7,
      actor,
      captured.at,
      unitSightRadius(state, actor, unit),
    );
    if (reveal.revealed.length) {
      players = setExplored(players, actor, reveal.explored);
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    }
    const recalc = recomputeLiveEconomyV7(
      state,
      { board, cities },
      contributions,
    );
    cities = recalc.cities;
    contributions = recalc.populationContributions;
    choices = [...choices, ...recalc.pendingChoices];
    events.push(...economyAndGrowth(recalc.changes));
    if (
      formerOwner !== null &&
      !cities.some((item) => item.ownerId === formerOwner)
    ) {
      const removed = units
        .filter((item) => item.ownerId === formerOwner)
        .sort((a, b) => a.id - b.id);
      units = units.filter((item) => item.ownerId !== formerOwner);
      players = players.map((item) =>
        item.id === formerOwner ? { ...item, status: "ELIMINATED" } : item,
      );
      choices = choices.filter((choice) =>
        cities.some((item) => item.id === choice.cityId),
      );
      const removal = removeMarksForPlayer(marks, formerOwner);
      marks = removal.marks;
      events.push(
        ...removed.map((item): DomainEventV7 => ({
          kind: "UNIT_DIED",
          unitId: item.id,
          cause: "ELIMINATION",
        })),
        ...removal.events,
        { kind: "PLAYER_ELIMINATED", playerId: formerOwner },
      );
    }
    const active = players.filter((item) => item.status === "ACTIVE");
    let outcome = state.outcome;
    if (
      players.find((item) => item.id === state.humanPlayerId)?.status ===
      "ELIMINATED"
    )
      outcome = {
        kind: "DEFEAT",
        humanId: state.humanPlayerId,
        defeatedByPlayerId: actor,
      };
    else if (active.length === 1 && active[0]?.id === state.humanPlayerId)
      outcome = { kind: "VICTORY", winnerId: state.humanPlayerId };
    if (outcome !== null) events.push({ kind: "MATCH_ENDED", outcome });
    return accepted(
      checked({
        ...state,
        nextEntityId,
        commandIndex: nextSafe(state.commandIndex),
        board,
        players,
        cities,
        units,
        populationContributions: contributions,
        pendingChoices: choices,
        defectionMarks: marks,
        saboteurExposures: state.saboteurExposures.filter(
          (entry) =>
            units.some((item) => item.id === entry.unitId) &&
            players.find((item) => item.id === entry.anchorPlayerId)?.status ===
              "ACTIVE",
        ),
        outcome,
      }),
      events,
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyEndTurn(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
): ApplyCommandResultV7 {
  if (
    state.units.some(
      (unit) =>
        unit.ownerId === actor && unit.activation.pursuitPhase !== "NONE",
    )
  )
    return rejected(original, "PURSUIT_MUST_END");
  if (
    state.defectionMarks.length > 0 ||
    state.cities.some((city) => city.blackout !== null) ||
    state.saboteurExposures.length > 0
  )
    return rejected(original, "COMMAND_NOT_IMPLEMENTED", {
      kind: "END_TURN_STATE_MACHINES",
    });
  try {
    const current = requirePlayer(state, actor);
    const preview = playerIncomeV7(state, actor);
    const recovery = recoverIdleUnits(state, current);
    const nextIndex = nextActiveSeat(state);
    if (nextIndex === null) return rejected(original, "INVALID_STATE");
    const nextPlayer = state.players.find(
      (item) => item.id === state.turnOrder[nextIndex],
    );
    if (nextPlayer === undefined) return rejected(original, "INVALID_STATE");
    const round =
      nextIndex <= state.activeSeatIndex ? nextSafe(state.round) : state.round;
    const started = startTurnEconomyV7(
      { ...recovery.state, activeSeatIndex: nextIndex, round },
      nextPlayer,
    );
    return accepted(
      checked({ ...started.state, commandIndex: nextSafe(state.commandIndex) }),
      [
        ...recovery.events,
        {
          kind: "INCOME_PREVIEWED",
          playerId: actor,
          totalCoins: preview.totalCoins,
          cities: preview.cities,
        },
        { kind: "TURN_ENDED", playerId: actor },
        ...started.events,
      ],
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function validateTileContext(
  state: GameStateV7,
  actor: PlayerId,
  at: CoordV7,
  technology: (typeof TECHNOLOGY_IDS_V7)[number],
  action: string,
  matches: (tile: TileStateV7) => boolean,
):
  | { ok: true; player: PlayerStateV7; tile: TileStateV7; city: CityStateV7 }
  | { ok: false; code: RuleErrorCodeV7; params: Record<string, JsonValue> } {
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, at);
  if (tile === undefined)
    return { ok: false, code: "TILE_NOT_FOUND", params: {} };
  if (!isExplored(player, at))
    return { ok: false, code: "TILE_UNEXPLORED", params: {} };
  if (!player.researchedTechs.includes(technology))
    return { ok: false, code: "TECH_REQUIRED", params: { tech: technology } };
  if (!matches(tile))
    return { ok: false, code: "INVALID_TILE", params: { action } };
  const city = state.cities.find((item) => item.id === tile.territoryCityId);
  if (city === undefined || city.ownerId !== actor)
    return { ok: false, code: "TERRITORY_NOT_OWNED", params: {} };
  if (isCityBesiegedV7(state, city))
    return { ok: false, code: "CITY_BESIEGED", params: {} };
  if (city.blackout?.phase === "ACTIVE")
    return { ok: false, code: "CITY_BLACKED_OUT", params: {} };
  if (hasCityChoice(state, city.id))
    return { ok: false, code: "CITY_REWARD_PENDING", params: {} };
  return { ok: true, player, tile, city };
}

function validateUnitActor(
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
):
  | { ok: true; unit: UnitStateV7 }
  | { ok: false; code: RuleErrorCodeV7; params: Record<string, JsonValue> } {
  const unit = state.units.find((item) => item.id === unitId);
  if (unit === undefined || unit.hp <= 0)
    return { ok: false, code: "UNIT_NOT_FOUND", params: { unitId } };
  if (unit.ownerId !== actor)
    return { ok: false, code: "UNIT_NOT_OWNED", params: { unitId } };
  return { ok: true, unit };
}
function primaryUsed(unit: UnitStateV7): boolean {
  return (
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

function revalidateReservations(
  state: GameStateV7,
  capacityReason: DefectionCancellationReasonV7,
): {
  readonly marks: readonly DefectionMarkV7[];
  readonly events: readonly DomainEventV7[];
} {
  const kept: DefectionMarkV7[] = [];
  const events: DomainEventV7[] = [];
  const reserved = new Map<number, number>();
  for (const mark of [...state.defectionMarks].sort((a, b) => a.id - b.id)) {
    const source = state.units.find((unit) => unit.id === mark.sourceUnitId);
    const target = state.units.find((unit) => unit.id === mark.targetUnitId);
    const city = state.cities.find(
      (item) => item.id === mark.reservedHomeCityId,
    );
    let reason: DefectionCancellationReasonV7 | null = null;
    if (source === undefined) reason = "SOURCE_MISSING";
    else if (target === undefined) reason = "TARGET_MISSING";
    else if (source.ownerId !== mark.initiatingPlayerId)
      reason = "SOURCE_OWNER_CHANGED";
    else if (target.ownerId !== mark.recordedTargetOwnerId)
      reason = "TARGET_OWNER_CHANGED";
    else if (
      !arePlayersHostileV7(
        state,
        mark.initiatingPlayerId,
        mark.recordedTargetOwnerId,
      )
    )
      reason = "RELATIONSHIP_CHANGED";
    else if (chebyshev(source.at, target.at) > 2) reason = "OUT_OF_RANGE";
    else if (city?.ownerId !== mark.initiatingPlayerId)
      reason = "RESERVED_CITY_LOST";
    else {
      const used =
        assignedUnitCountV7(state, city.id) + (reserved.get(city.id) ?? 0);
      if (used >= cityUnitCapacityV7(state, city)) reason = capacityReason;
    }
    if (reason === null) {
      kept.push(mark);
      reserved.set(
        mark.reservedHomeCityId,
        (reserved.get(mark.reservedHomeCityId) ?? 0) + 1,
      );
    } else
      events.push({ kind: "DEFECTION_CANCELLED", markId: mark.id, reason });
  }
  return { marks: kept, events };
}
function removeMarksForUnit(
  marks: readonly DefectionMarkV7[],
  unitId: UnitStateV7["id"],
): { marks: readonly DefectionMarkV7[]; events: readonly DomainEventV7[] } {
  const events = marks
    .filter(
      (mark) => mark.sourceUnitId === unitId || mark.targetUnitId === unitId,
    )
    .map((mark): DomainEventV7 => ({
      kind: "DEFECTION_CANCELLED",
      markId: mark.id,
      reason:
        mark.sourceUnitId === unitId ? "SOURCE_MISSING" : "TARGET_MISSING",
    }));
  return {
    marks: marks.filter(
      (mark) => mark.sourceUnitId !== unitId && mark.targetUnitId !== unitId,
    ),
    events,
  };
}
function removeMarksForPlayer(
  marks: readonly DefectionMarkV7[],
  playerId: PlayerId,
): { marks: readonly DefectionMarkV7[]; events: readonly DomainEventV7[] } {
  const removed = marks.filter(
    (mark) =>
      mark.initiatingPlayerId === playerId ||
      mark.recordedTargetOwnerId === playerId,
  );
  return {
    marks: marks.filter((mark) => !removed.includes(mark)),
    events: removed.map((mark): DomainEventV7 => ({
      kind: "DEFECTION_CANCELLED",
      markId: mark.id,
      reason:
        mark.initiatingPlayerId === playerId
          ? "INITIATOR_ELIMINATED"
          : "TARGET_OWNER_ELIMINATED",
    })),
  };
}

function recoverIdleUnits(
  state: GameStateV7,
  player: PlayerStateV7,
): { state: GameStateV7; events: readonly DomainEventV7[] } {
  const recovery6 = player.researchedTechs.includes("RECOVERY");
  const items = state.units
    .filter(
      (unit) =>
        unit.ownerId === player.id &&
        unit.hp > 0 &&
        unit.hp < unit.maxHp &&
        !unit.activation.moved &&
        !primaryUsed(unit),
    )
    .sort((a, b) => a.id - b.id)
    .map((unit) => {
      const tile = tileAtV7(state.board, unit.at);
      const city = state.cities.find(
        (item) => item.id === tile?.territoryCityId,
      );
      const friendly = city?.ownerId === player.id;
      const amount = Math.min(
        friendly && recovery6 ? 6 : friendly ? 4 : 2,
        unit.maxHp - unit.hp,
      );
      return { unitId: unit.id, amount };
    });
  return {
    state: {
      ...state,
      units: state.units.map((unit) => {
        const item = items.find((candidate) => candidate.unitId === unit.id);
        return item === undefined
          ? unit
          : { ...unit, hp: unit.hp + item.amount };
      }),
    },
    events: items.map((item): DomainEventV7 => ({
      kind: "UNIT_RECOVERED",
      unitId: item.unitId,
      amount: item.amount,
      automatic: true,
    })),
  };
}

function commonError(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
): RuleErrorV7 | null {
  if (state.outcome !== null) return error("MATCH_ENDED");
  const player = state.players.find((item) => item.id === actor);
  if (player?.status === "ELIMINATED") return error("PLAYER_ELIMINATED");
  if (player === undefined || state.turnOrder[state.activeSeatIndex] !== actor)
    return error("NOT_ACTIVE_PLAYER");
  const head = state.pendingChoices[0];
  if (head !== undefined && command.kind !== "CHOOSE_CITY_REWARD")
    return error("PENDING_CHOICE", { kind: head.kind });
  return null;
}
function exactUnknownResearchTech(command: unknown): string | null {
  return hasExactKeysV7(command, ["kind", "tech"]) &&
    command.kind === "RESEARCH" &&
    typeof command.tech === "string" &&
    !TECHNOLOGY_IDS_V7.includes(command.tech as never)
    ? command.tech
    : null;
}
function rewardPlacement(
  state: GameStateV7,
  city: CityStateV7,
): CoordV7 | null {
  const player = requirePlayer(state, city.ownerId);
  return (
    state.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === city.id &&
          (tile.terrain !== "MOUNTAIN" ||
            player.researchedTechs.includes("SURVEYING")) &&
          !state.units.some((unit) => unit.hp > 0 && same(unit.at, tile.at)),
      )
      .sort(
        (a, b) =>
          chebyshev(a.at, city.at) - chebyshev(b.at, city.at) ||
          compareCoords(a.at, b.at),
      )[0]?.at ?? null
  );
}
function unitSightRadius(
  state: GameStateV7,
  ownerId: PlayerId,
  unit: UnitStateV7,
): number {
  const capabilities = technologyCapabilitiesV7(
    requirePlayer(state, ownerId).researchedTechs,
  );
  const base = Math.max(
    effectiveRoleRuleV7(unit.role).sightRadius,
    capabilities.roleSightRadius[unit.role] ?? 0,
  );
  const tile = tileAtV7(state.board, unit.at);
  return (
    base +
    (tile?.terrain === "MOUNTAIN"
      ? capabilities.highGroundVisionRadiusBonus
      : 0)
  );
}
function revealRadius(
  state: GameStateV7,
  playerId: PlayerId,
  center: CoordV7,
  radius: number,
): { explored: readonly CoordV7[]; revealed: readonly CoordV7[] } {
  const player = requirePlayer(state, playerId);
  const known = new Set(player.explored.map(key));
  const explored = [...player.explored];
  const revealed: CoordV7[] = [];
  for (
    let y = Math.max(0, center.y - radius);
    y <= Math.min(state.board.height - 1, center.y + radius);
    y += 1
  )
    for (
      let x = Math.max(0, center.x - radius);
      x <= Math.min(state.board.width - 1, center.x + radius);
      x += 1
    )
      if (!known.has(key({ x, y }))) {
        explored.push({ x, y });
        revealed.push({ x, y });
      }
  return {
    explored: explored.sort(compareCoords),
    revealed: revealed.sort(compareCoords),
  };
}
function nextActiveSeat(state: GameStateV7): number | null {
  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const index = (state.activeSeatIndex + offset) % state.turnOrder.length;
    if (
      state.players.some(
        (player) =>
          player.id === state.turnOrder[index] && player.status === "ACTIVE",
      )
    )
      return index;
  }
  return null;
}
function economyAndGrowth(
  changes: readonly CityEconomyChangeV7[],
): readonly DomainEventV7[] {
  return changes.flatMap((change) => [
    ...economyEventsV7([change]),
    ...growthEventsV7([change]),
  ]);
}
function exhaustedActivation(): UnitStateV7["activation"] {
  return {
    moved: true,
    movedPathLength: 0,
    attacked: true,
    attacksUsed: 1,
    pursuitPhase: "NONE",
    healed: true,
    recovered: true,
    captured: true,
    handled: true,
    specialActed: true,
  };
}
function replaceTile(
  state: GameStateV7,
  at: CoordV7,
  replacement: TileStateV7,
): GameStateV7["board"] {
  return {
    ...state.board,
    tiles: state.board.tiles.map((tile) =>
      same(tile.at, at) ? replacement : tile,
    ),
  };
}
function debit(
  players: readonly PlayerStateV7[],
  actor: PlayerId,
  cost: number,
): readonly PlayerStateV7[] {
  return players.map((player) =>
    player.id === actor ? { ...player, coins: player.coins - cost } : player,
  );
}
function setExplored(
  players: readonly PlayerStateV7[],
  actor: PlayerId,
  explored: readonly CoordV7[],
): readonly PlayerStateV7[] {
  return players.map((player) =>
    player.id === actor ? { ...player, explored } : player,
  );
}
function hasCityChoice(state: GameStateV7, cityId: CityStateV7["id"]): boolean {
  return state.pendingChoices.some((choice) => choice.cityId === cityId);
}
function requirePlayer(state: GameStateV7, actor: PlayerId): PlayerStateV7 {
  const player = state.players.find((item) => item.id === actor);
  if (player === undefined) throw new RangeError("INVALID_STATE");
  return player;
}
function requireValue<T>(value: T | null): T {
  if (value === null) throw new RangeError("INVALID_STATE");
  return value;
}
function isExplored(player: PlayerStateV7, at: CoordV7): boolean {
  return player.explored.some((item) => same(item, at));
}
function checked(state: GameStateV7): GameStateV7 {
  const result = parseGameStateV7(state);
  if (result === null) throw new RangeError("INVALID_STATE");
  return result;
}
function nextSafe(value: number): number {
  const result = value + 1;
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}
function accepted(
  state: GameStateV7,
  events: readonly DomainEventV7[],
): ApplyCommandResultV7 {
  return { accepted: true, state: deepFreeze(state), events };
}
function rejected(
  state: GameStateV7,
  code: RuleErrorCodeV7,
  params: Readonly<Record<string, JsonValue>> = {},
): ApplyCommandResultV7 {
  return { accepted: false, state, events: [], error: { code, params } };
}
function arithmeticFailure(
  state: GameStateV7,
  cause: unknown,
): ApplyCommandResultV7 {
  return cause instanceof RangeError && cause.message === "INTEGER_OVERFLOW"
    ? rejected(state, "INTEGER_OVERFLOW")
    : rejected(state, "INVALID_STATE");
}
function error(
  code: RuleErrorCodeV7,
  params: Readonly<Record<string, JsonValue>> = {},
): RuleErrorV7 {
  return { code, params };
}
const same = (a: CoordV7, b: CoordV7): boolean => a.x === b.x && a.y === b.y;
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const compareCoords = (a: CoordV7, b: CoordV7): number =>
  a.y - b.y || a.x - b.x;
const key = (at: CoordV7): string => `${at.y},${at.x}`;
