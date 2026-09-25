import { allocateCityId, allocateUnitId, type PlayerId } from "../model/ids";
import { deepFreeze } from "../model/freeze";
import { nextBounded } from "../random/random";
import type { JsonValue } from "../replay/canonical";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  ORIGINAL_BASELINE_V5_TREE,
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
  isActivePortV7,
  combinedNetworkCityIdsV7,
  marketIncomeForCityV7,
  playerIncomeV7,
  recomputeLiveEconomyV7,
  rewardCandidatesForLevelV7,
  seaTradeCityIdsV7,
  startTurnEconomyV7,
  type CityEconomyChangeV7,
} from "./economy";
import type { DomainEventV7 } from "./events";
import { calculateCombatPreviewV7, pushedDestinationV7 } from "./combat";
import { createInitialMapStateV7 } from "./map";
import { unitSightRadiusAtV7, validateMovementPathV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import { parseGameStateV7 } from "./state-schema";
import { spatialContributionAtV7, tileAtV7 } from "./spatial-economy";
import {
  TECHNOLOGY_IDS_V7,
  type CityStateV7,
  type CoordV7,
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
  | "CITY_REWARD_PENDING"
  | "CITY_BUILDING_LIMIT"
  | "PLACEMENT_REQUIREMENT_UNMET"
  | "ACHIEVEMENT_NOT_UNLOCKED"
  | "ACHIEVEMENT_ENTITLEMENT_SPENT"
  | "TECH_NOT_FOUND"
  | "TECH_ALREADY_RESEARCHED"
  | "TECH_PREREQUISITE_MISSING"
  | "INSUFFICIENT_COINS"
  | "INTEGER_OVERFLOW"
  | "CITY_NOT_FOUND"
  | "CITY_NOT_OWNED"
  | "CITY_ACTION_SPENT"
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
  | "TARGET_NOT_FOUND"
  | "TARGET_OUT_OF_RANGE"
  | "ATTACK_NOT_LEGAL"
  | "MOVEMENT_ILLEGAL"
  | "INVALID_PATH"
  | "HEAL_TARGET_NOT_FOUND"
  | "HEAL_TARGET_NOT_OWNED"
  | "HEAL_TARGET_NOT_ADJACENT"
  | "HEAL_TARGET_FULL"
  | "RECOVER_NOT_LEGAL"
  | "PROMOTION_NOT_ELIGIBLE"
  | "UNIT_ALREADY_HANDLED"
  | "PILLAGE_INVALID_TARGET";
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
const acceptedStateCertificatesV7 = new WeakSet<object>();

/**
 * Reports only states returned by this reducer at a completed accepted
 * boundary. Certificates are identity-bound and cannot be supplied by a
 * caller, so parsed external values continue through the strict parser.
 */
export function isAcceptedStateCertificateV7(state: GameStateV7): boolean {
  return acceptedStateCertificatesV7.has(state);
}

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
    const started = startTurnEconomyV7(
      resetTurnUnits(created.state, player.id),
      player,
    );
    const achievements = evaluateAchievementsV7(started.state, player.id);
    return {
      ok: true,
      state: checked(achievements.state),
      events: [...started.events, ...achievements.events],
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
  const result = applyCommandCoreV7(stateInput, actor, input);
  if (!result.accepted) return result;
  if (!navalFactsMayChangeV7(input)) return result;
  return {
    ...result,
    events: [
      ...result.events,
      ...navalTransitionEventsV7(stateInput, result.state),
    ],
  };
}

function navalFactsMayChangeV7(command: CommandV7): boolean {
  if (command.kind === "RESEARCH")
    return (
      command.tech === "ROADS" ||
      command.tech === "SHORECRAFT" ||
      command.tech === "NAVIGATION"
    );
  if (command.kind === "LAND_GRANT") return true;
  return [
    "ATTACK",
    "BUILD_PORT",
    "BUILD_ROAD",
    "CAPTURE",
    "DISEMBARK",
    "MOVE",
    "REDEVELOP",
  ].includes(command.kind);
}

function applyCommandCoreV7(
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
  if (command.kind === "BUILD_MONUMENT")
    return applyMonument(stateInput, state, actor, command);
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
    [
      "CLEAR_FOREST",
      "REPLANT_FOREST",
      "CULTIVATE_FOREST",
      "BLAST_MOUNTAIN",
      "BUILD_ROAD",
      "REDEVELOP",
    ].includes(command.kind)
  )
    return applyInfrastructure(
      stateInput,
      state,
      actor,
      command as Extract<CommandV7, { at: CoordV7 }>,
    );
  if (command.kind === "TRAIN")
    return applyTrain(stateInput, state, actor, command);
  if (command.kind === "TRAIN_NAVAL")
    return applyTrainNaval(stateInput, state, actor, command);
  if (command.kind === "GATHER_PEARLS")
    return applyPearls(stateInput, state, actor, command.at);
  if (command.kind === "BUILD_PORT")
    return applyPort(stateInput, state, actor, command.at);
  if (command.kind === "BUILD_SHIPYARD")
    return applyShipyard(stateInput, state, actor, command.at);
  if (command.kind === "DISEMBARK")
    return applyDisembark(stateInput, state, actor, command);
  if (command.kind === "CHOOSE_CITY_REWARD")
    return applyReward(stateInput, state, actor, command);
  if (command.kind === "MOVE")
    return applyMove(stateInput, state, actor, command);
  if (command.kind === "ATTACK")
    return applyAttack(stateInput, state, actor, command);
  if (command.kind === "RALLY")
    return applyRally(stateInput, state, actor, command.unitId);
  if (command.kind === "TEND_WOUNDED")
    return applyTendWounded(stateInput, state, actor, command.unitId);
  if (command.kind === "RECOVER")
    return applyRecover(stateInput, state, actor, command.unitId);
  if (command.kind === "PROMOTE")
    return applyPromote(stateInput, state, actor, command.unitId);
  if (command.kind === "WAIT")
    return applyWait(stateInput, state, actor, command.unitId);
  if (command.kind === "CAPTURE")
    return applyCapture(stateInput, state, actor, command.unitId);
  if (command.kind === "PILLAGE")
    return applyPillage(stateInput, state, actor, command.unitId);
  if (command.kind === "DISBAND")
    return applyDisband(stateInput, state, actor, command.unitId);
  if (command.kind === "BUILD_FIELD_DEFENSE")
    return applyFieldDefense(stateInput, state, actor, command.unitId);
  if (command.kind === "LAND_GRANT")
    return applyLandGrant(stateInput, state, actor, command.cityId);
  if (command.kind === "END_TURN")
    return applyEndTurn(stateInput, state, actor);
  return rejected(stateInput, "INVALID_COMMAND");
}

function navalTransitionEventsV7(
  before: GameStateV7,
  after: GameStateV7,
): DomainEventV7[] {
  const events: DomainEventV7[] = [];
  const portCoords = new Map<string, CoordV7>();
  for (const state of [before, after])
    for (const tile of state.board.tiles)
      if (tile.improvement === "PORT" || tile.improvement === "SHIPYARD")
        portCoords.set(key(tile.at), tile.at);
  for (const at of [...portCoords.values()].sort(compareCoords)) {
    const beforeTile = tileAtV7(before.board, at);
    const afterTile = tileAtV7(after.board, at);
    const beforeCity = before.cities.find(
      (city) => city.id === beforeTile?.territoryCityId,
    );
    const afterCity = after.cities.find(
      (city) => city.id === afterTile?.territoryCityId,
    );
    const activeBefore =
      (beforeTile?.improvement === "PORT" ||
        beforeTile?.improvement === "SHIPYARD") &&
      beforeCity !== undefined
        ? isActivePortV7(before, at, beforeCity.ownerId)
        : null;
    const activeAfter =
      (afterTile?.improvement === "PORT" ||
        afterTile?.improvement === "SHIPYARD") &&
      afterCity !== undefined
        ? isActivePortV7(after, at, afterCity.ownerId)
        : null;
    if (activeBefore !== activeAfter) {
      const city = afterCity ?? beforeCity;
      if (city !== undefined)
        events.push({
          kind: "PORT_BLOCKADE_CHANGED",
          playerId: city.ownerId,
          cityId: city.id,
          at,
          activeBefore,
          activeAfter,
        });
    }
  }
  for (const player of after.players) {
    const beforeNetwork = sortedIds(
      combinedNetworkCityIdsV7(before, player.id),
    );
    const afterNetwork = sortedIds(combinedNetworkCityIdsV7(after, player.id));
    const beforeTrade = sortedIds(seaTradeCityIdsV7(before, player.id));
    const afterTrade = sortedIds(seaTradeCityIdsV7(after, player.id));
    if (
      canonicalIds(beforeNetwork) !== canonicalIds(afterNetwork) ||
      canonicalIds(beforeTrade) !== canonicalIds(afterTrade)
    )
      events.push({
        kind: "SEA_NETWORK_CHANGED",
        playerId: player.id,
        networkCityIdsBefore: beforeNetwork,
        networkCityIdsAfter: afterNetwork,
        tradeCityIdsBefore: beforeTrade,
        tradeCityIdsAfter: afterTrade,
      });
  }
  return events;
}

function sortedIds(
  values: ReadonlySet<CityStateV7["id"]>,
): CityStateV7["id"][] {
  return [...values].sort((left, right) => left - right);
}

function canonicalIds(values: readonly CityStateV7["id"][]): string {
  return values.join(",");
}

function applyResearch(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  tech: (typeof TECHNOLOGY_IDS_V7)[number],
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const node = ORIGINAL_BASELINE_V5_TREE.nodes.find((item) => item.id === tech);
  if (node === undefined) return rejected(original, "TECH_NOT_FOUND", { tech });
  if (state.setup.mapType === "DRY_LAND" && node.branch === "NAVAL")
    return rejected(original, "TECH_REQUIRED", { tech, reason: "DRY_LAND" });
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
    const researched: GameStateV7 = {
      ...state,
      commandIndex,
      players: state.players.map((item) =>
        item.id === actor
          ? { ...item, coins: item.coins - cost, researchedTechs }
          : item,
      ),
    };
    const recalculation = recomputeLiveEconomyV7(
      researched,
      researched,
      researched.populationContributions,
    );
    const staged: GameStateV7 = {
      ...researched,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    return accepted(checked(achievements.state), [
      { kind: "TECH_RESEARCHED", playerId: actor, tech, cost },
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
      ...achievements.events,
    ]);
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
      !state.treasureChests.some((chest) => same(chest, command.at)) &&
      tile.site === null &&
      tile.terrain === rule.terrain &&
      tile.resource === rule.resource &&
      (kind === "HARVEST_FISH"
        ? tile.improvement === null ||
          tile.improvement === "PORT" ||
          tile.improvement === "SHIPYARD"
        : tile.improvement === null),
  );
  if (!validation.ok)
    return rejected(original, validation.code, validation.params);
  const { player, tile, city } = validation;
  if (
    kind === "HARVEST_FISH" &&
    (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
    !isActivePortV7(state, command.at, actor)
  )
    return rejected(original, "INVALID_TILE", { action: kind });
  const cost = rule.cost;
  if (player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost });
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
              action: kind as "HARVEST_FRUIT" | "HUNT_GAME" | "HARVEST_FISH",
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
      improvement: rule.improvement ?? tile.improvement,
    });
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      [...state.populationContributions, contribution],
    );
    const staged: GameStateV7 = {
      ...state,
      nextEntityId: nextSafe(state.nextEntityId),
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: debit(state.players, actor, cost),
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    const next = checked(achievements.state);
    const fact: DomainEventV7 =
      rule.populationCategory === "PERMANENT"
        ? {
            kind:
              kind === "HARVEST_FRUIT"
                ? "FRUIT_HARVESTED"
                : kind === "HARVEST_FISH"
                  ? "FISH_HARVESTED"
                  : "GAME_HUNTED",
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
          };
    return accepted(next, [
      fact,
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
      ...achievements.events,
    ]);
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
  if (
    tile.biome === null &&
    (command.kind !== "REDEVELOP" ||
      (tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD"))
  )
    return rejected(original, "INVALID_TILE", { action: command.kind });
  if (!player.researchedTechs.includes(rule.technology))
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (
    tile.terrain === "MOUNTAIN" &&
    !player.researchedTechs.includes("ENGINEERING")
  )
    return rejected(original, "TECH_REQUIRED", { tech: "ENGINEERING" });
  if (
    state.treasureChests.some((chest) => same(chest, command.at)) ||
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null
  )
    return rejected(original, "INVALID_TILE", { action: kind });
  const city = state.cities.find((item) => item.id === tile.territoryCityId);
  if (city === undefined || city.ownerId !== actor)
    return rejected(original, "TERRITORY_NOT_OWNED");
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
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
  if (evaluation.placementCount < rule.placementMinimum)
    return rejected(original, "PLACEMENT_REQUIREMENT_UNMET", {
      improvement: rule.improvement,
      required: rule.placementMinimum,
      count: evaluation.placementCount,
    });
  if (player.coins < rule.cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost: rule.cost });
  try {
    let nextEntityId = state.nextEntityId;
    let contributions = state.populationContributions;
    if (rule.improvement !== "MARKET") {
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
    const staged: GameStateV7 = {
      ...state,
      nextEntityId,
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: debit(state.players, actor, rule.cost),
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    const next = checked(achievements.state);
    const marketIncome =
      rule.improvement === "MARKET"
        ? Math.min(4, evaluation.marketIncome) *
          technologyCapabilitiesV7(player.researchedTechs)
            .marketIncomeMultiplier
        : evaluation.marketIncome;
    return accepted(next, [
      {
        kind: "ECONOMIC_BUILDING_BUILT",
        playerId: actor,
        cityId: city.id,
        at: command.at,
        improvement: rule.improvement,
        cost: rule.cost,
        populationContribution: evaluation.population,
        marketIncome,
      },
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
      ...achievements.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyMonument(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "BUILD_MONUMENT" }>,
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, command.at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, command.at))
    return rejected(original, "TILE_UNEXPLORED");
  const city = state.cities.find((item) => item.id === tile.territoryCityId);
  if (city === undefined || city.ownerId !== actor)
    return rejected(original, "TERRITORY_NOT_OWNED");
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  if (
    state.board.tiles.some(
      (candidate) =>
        candidate.territoryCityId === city.id &&
        candidate.improvement === "MONUMENT",
    )
  )
    return rejected(original, "CITY_BUILDING_LIMIT", {
      improvement: "MONUMENT",
    });
  if (
    tile.terrain === "MOUNTAIN" &&
    !player.researchedTechs.includes("ENGINEERING")
  )
    return rejected(original, "TECH_REQUIRED", { tech: "ENGINEERING" });
  if (
    tile.biome === null ||
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null ||
    state.treasureChests.some((chest) => same(chest, command.at))
  )
    return rejected(original, "INVALID_TILE", { action: "BUILD_MONUMENT" });
  const entitlement = player.achievementEntitlements.find(
    (item) => item.achievement === command.achievement,
  );
  if (entitlement?.unlocked !== true)
    return rejected(original, "ACHIEVEMENT_NOT_UNLOCKED", {
      achievement: command.achievement,
    });
  if (entitlement.spent)
    return rejected(original, "ACHIEVEMENT_ENTITLEMENT_SPENT", {
      achievement: command.achievement,
    });
  try {
    const board = replaceTile(state, command.at, {
      ...tile,
      improvement: "MONUMENT",
    });
    const contribution: PopulationContributionV7 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: 3,
      source: {
        kind: "MONUMENT",
        achievement: command.achievement,
        at: command.at,
      },
    };
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      [...state.populationContributions, contribution],
    );
    const staged: GameStateV7 = {
      ...state,
      nextEntityId: nextSafe(state.nextEntityId),
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: state.players.map((candidate) =>
        candidate.id === actor
          ? {
              ...candidate,
              achievementEntitlements: candidate.achievementEntitlements.map(
                (item) =>
                  item.achievement === command.achievement
                    ? { ...item, spent: true }
                    : item,
              ),
            }
          : candidate,
      ),
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    return accepted(checked(achievements.state), [
      {
        kind: "MONUMENT_BUILT",
        playerId: actor,
        cityId: city.id,
        achievement: command.achievement,
        at: command.at,
        populationAdded: 3,
      },
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
      ...achievements.events,
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
        : command.kind === "CULTIVATE_FOREST"
          ? "CHIVALRY"
          : command.kind === "BLAST_MOUNTAIN"
            ? "EXPLOSIVES"
            : command.kind === "BUILD_ROAD"
              ? "ROADS"
              : "ENGINEERING";
  if (!player.researchedTechs.includes(tech))
    return rejected(original, "TECH_REQUIRED", { tech });
  const forestValid =
    tile.site === null &&
    tile.resource === null &&
    tile.improvement === null &&
    ((command.kind === "CLEAR_FOREST" && tile.terrain === "FOREST") ||
      (command.kind === "REPLANT_FOREST" && tile.terrain === "GRASS") ||
      (command.kind === "CULTIVATE_FOREST" && tile.terrain === "FOREST"));
  if (
    ["CLEAR_FOREST", "REPLANT_FOREST", "CULTIVATE_FOREST"].includes(
      command.kind,
    ) &&
    !forestValid
  )
    return rejected(original, "FOREST_ACTION_INVALID_TILE", {
      action: command.kind,
    });
  if (
    command.kind === "BUILD_ROAD" &&
    (tile.biome === null ||
      tile.site !== null ||
      tile.road ||
      (tile.terrain === "MOUNTAIN" &&
        !player.researchedTechs.includes("ENGINEERING")))
  )
    return rejected(original, "INVALID_TILE", { action: command.kind });
  if (command.kind === "REDEVELOP" && tile.improvement === null)
    return rejected(original, "REDEVELOP_INVALID_TARGET");
  if (
    command.kind === "REDEVELOP" &&
    (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
    state.units.some((unit) => unit.hp > 0 && same(unit.at, tile.at))
  )
    return rejected(original, "REDEVELOP_INVALID_TARGET");
  if (
    command.kind === "BLAST_MOUNTAIN" &&
    (tile.terrain !== "MOUNTAIN" ||
      tile.site !== null ||
      tile.resource !== null ||
      tile.improvement !== null ||
      tile.fieldDefense)
  )
    return rejected(original, "INVALID_TILE", { action: command.kind });
  const city = state.cities.find((item) => item.id === tile.territoryCityId);
  const neutralRoad = command.kind === "BUILD_ROAD" && city === undefined;
  if (!neutralRoad && (city === undefined || city.ownerId !== actor))
    return rejected(original, "TERRITORY_NOT_OWNED");
  if (city !== undefined && city.ownerId !== actor)
    return rejected(original, "TERRITORY_NOT_OWNED");
  if (city !== undefined && isCityBesiegedV7(state, city))
    return rejected(original, "CITY_BESIEGED");
  if (city !== undefined && hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  const cost =
    command.kind === "BUILD_ROAD"
      ? 2
      : command.kind === "REPLANT_FOREST"
        ? 4
        : command.kind === "CULTIVATE_FOREST"
          ? 4
          : command.kind === "BLAST_MOUNTAIN"
            ? 3
            : 0;
  if (player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  try {
    const removed = command.kind === "REDEVELOP" ? tile.improvement : null;
    const removedContribution =
      removed === null || removed === "MARKET"
        ? undefined
        : populationContributionAt(state, command.at);
    if (
      removed !== null &&
      removed !== "MARKET" &&
      removedContribution === undefined
    )
      return rejected(original, "INVALID_STATE");
    const marketRemoved =
      removed === "MARKET" && city !== undefined
        ? marketIncomeForCityV7(state, city)
        : 0;
    const resourceRestored = restoredResourceForImprovement(removed);
    const board = replaceTile(state, command.at, {
      ...tile,
      terrain:
        command.kind === "CLEAR_FOREST"
          ? "GRASS"
          : command.kind === "REPLANT_FOREST"
            ? "FOREST"
            : command.kind === "CULTIVATE_FOREST" ||
                command.kind === "BLAST_MOUNTAIN"
              ? "GRASS"
              : tile.terrain,
      road: command.kind === "BUILD_ROAD" ? true : tile.road,
      improvement: command.kind === "REDEVELOP" ? null : tile.improvement,
      resource:
        command.kind === "REDEVELOP"
          ? removed === "PORT" || removed === "SHIPYARD"
            ? tile.resource
            : resourceRestored
          : command.kind === "CULTIVATE_FOREST"
            ? "FERTILE_GROUND"
            : tile.resource,
    });
    const contributions =
      removedContribution === undefined
        ? state.populationContributions
        : state.populationContributions.filter(
            (item) => item.id !== removedContribution.id,
          );
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      contributions,
    );
    const coins = player.coins + (command.kind === "CLEAR_FOREST" ? 1 : -cost);
    if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
    const staged: GameStateV7 = {
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: state.players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      ),
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    const next = checked(achievements.state);
    const fact: DomainEventV7 =
      command.kind === "BUILD_ROAD"
        ? {
            kind: "ROAD_BUILT",
            playerId: actor,
            cityId: city?.id ?? null,
            at: command.at,
            cost: 2,
          }
        : command.kind === "CLEAR_FOREST"
          ? {
              kind: "FOREST_CLEARED",
              playerId: actor,
              cityId: requireValue(city).id,
              at: command.at,
              coinDelta: 1,
            }
          : command.kind === "REPLANT_FOREST"
            ? {
                kind: "FOREST_REPLANTED",
                playerId: actor,
                cityId: requireValue(city).id,
                at: command.at,
                coinDelta: 0,
              }
            : command.kind === "CULTIVATE_FOREST" ||
                command.kind === "BLAST_MOUNTAIN"
              ? {
                  kind:
                    command.kind === "CULTIVATE_FOREST"
                      ? "FOREST_CULTIVATED"
                      : "MOUNTAIN_BLASTED",
                  playerId: actor,
                  cityId: requireValue(city).id,
                  at: command.at,
                  cost,
                  terrainBefore:
                    command.kind === "CULTIVATE_FOREST" ? "FOREST" : "MOUNTAIN",
                  terrainAfter: "GRASS",
                  resourceBefore: null,
                  resourceAfter:
                    command.kind === "CULTIVATE_FOREST"
                      ? "FERTILE_GROUND"
                      : null,
                }
              : {
                  kind: "ECONOMIC_BUILDING_REMOVED",
                  playerId: actor,
                  cityId: requireValue(city).id,
                  at: command.at,
                  improvement: requireValue(removed),
                  populationContributionRemoved:
                    removedContribution?.amount ?? 0,
                  marketIncomeRemoved: marketRemoved,
                  resourceRestored,
                };
    return accepted(next, [
      fact,
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
      ...achievements.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyPearls(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  at: CoordV7,
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, at)) return rejected(original, "TILE_UNEXPLORED");
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city?.ownerId !== actor) return rejected(original, "TERRITORY_NOT_OWNED");
  const tech = "NAVIGATION";
  if (!player.researchedTechs.includes(tech))
    return rejected(original, "TECH_REQUIRED", { tech });
  if (
    tile.resource !== "PEARLS" ||
    (tile.terrain !== "SHALLOW_WATER" && tile.terrain !== "DEEP_WATER")
  )
    return rejected(original, "INVALID_TILE", { action: "GATHER_PEARLS" });
  if (
    (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
    !isActivePortV7(state, at, actor)
  )
    return rejected(original, "INVALID_TILE", { action: "GATHER_PEARLS" });
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  if (player.coins < 2)
    return rejected(original, "INSUFFICIENT_COINS", { cost: 2 });
  try {
    const next = checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      board: replaceTile(state, at, { ...tile, resource: null }),
      players: state.players.map((candidate) =>
        candidate.id === actor
          ? { ...candidate, coins: nextSafeBy(candidate.coins, 2) }
          : candidate,
      ),
    });
    return accepted(next, [
      {
        kind: "PEARLS_GATHERED",
        playerId: actor,
        cityId: city.id,
        at,
        cost: 2,
        coinsReceived: 4,
        coinDelta: 2,
      },
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyPort(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  at: CoordV7,
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, at)) return rejected(original, "TILE_UNEXPLORED");
  if (!player.researchedTechs.includes("SHORECRAFT"))
    return rejected(original, "TECH_REQUIRED", { tech: "SHORECRAFT" });
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city?.ownerId !== actor) return rejected(original, "TERRITORY_NOT_OWNED");
  const touchesLand = state.board.tiles.some(
    (candidate) =>
      candidate.territoryCityId === city.id &&
      candidate.biome !== null &&
      chebyshev(candidate.at, at) === 1,
  );
  if (
    tile.terrain !== "SHALLOW_WATER" ||
    tile.improvement !== null ||
    tile.site !== null ||
    tile.road ||
    !touchesLand
  )
    return rejected(original, "INVALID_TILE", { action: "BUILD_PORT" });
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  if (player.coins < 4)
    return rejected(original, "INSUFFICIENT_COINS", { cost: 4 });
  try {
    const board = replaceTile(state, at, { ...tile, improvement: "PORT" });
    const contribution: PopulationContributionV7 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: 1,
      source: { kind: "IMPROVEMENT", improvement: "PORT", at },
    };
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      [...state.populationContributions, contribution],
    );
    const staged: GameStateV7 = {
      ...state,
      board,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      players: debit(state.players, actor, 4),
      nextEntityId: nextSafe(state.nextEntityId),
      commandIndex: nextSafe(state.commandIndex),
    };
    const settlement = settleCityRewardsV7(staged, actor);
    return accepted(checked(settlement.state), [
      {
        kind: "PORT_BUILT",
        playerId: actor,
        cityId: city.id,
        at,
        cost: 4,
        populationAdded: 1,
      },
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyShipyard(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  at: CoordV7,
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, at)) return rejected(original, "TILE_UNEXPLORED");
  if (!player.researchedTechs.includes("NAVAL_ENGINEERING"))
    return rejected(original, "TECH_REQUIRED", { tech: "NAVAL_ENGINEERING" });
  const city = state.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city?.ownerId !== actor) return rejected(original, "TERRITORY_NOT_OWNED");
  if (tile.improvement !== "PORT" || !isActivePortV7(state, at, actor))
    return rejected(original, "INVALID_TILE", { action: "BUILD_SHIPYARD" });
  if (
    state.board.tiles.some(
      (candidate) =>
        candidate.territoryCityId === city.id &&
        candidate.improvement === "SHIPYARD",
    )
  )
    return rejected(original, "CITY_BUILDING_LIMIT");
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  if (player.coins < 5)
    return rejected(original, "INSUFFICIENT_COINS", { cost: 5 });
  try {
    const board = replaceTile(state, at, { ...tile, improvement: "SHIPYARD" });
    const contributions = state.populationContributions.map((entry) =>
      entry.source.kind === "IMPROVEMENT" && same(entry.source.at, at)
        ? {
            ...entry,
            source: { ...entry.source, improvement: "SHIPYARD" as const },
          }
        : entry,
    );
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      contributions,
    );
    const staged: GameStateV7 = {
      ...state,
      board,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      players: debit(state.players, actor, 5),
      commandIndex: nextSafe(state.commandIndex),
    };
    const settlement = settleCityRewardsV7(staged, actor);
    return accepted(checked(settlement.state), [
      {
        kind: "SHIPYARD_BUILT",
        playerId: actor,
        cityId: city.id,
        at,
        cost: 5,
        populationAdded: 1,
        livePopulationTotal: 2,
      },
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyTrainNaval(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "TRAIN_NAVAL" }>,
): ApplyCommandResultV7 {
  const city = state.cities.find(
    (candidate) => candidate.id === command.cityId,
  );
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  if (!city.cityActionAvailable)
    return rejected(original, "CITY_ACTION_SPENT", { cityId: city.id });
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV7(command.role);
  const tile = tileAtV7(state.board, command.at);
  if (
    tile?.territoryCityId !== city.id ||
    !isActivePortV7(state, command.at, actor)
  )
    return rejected(original, "INVALID_TILE", { action: "TRAIN_NAVAL" });
  if (state.units.some((unit) => unit.hp > 0 && same(unit.at, command.at)))
    return rejected(original, "CITY_SPAWN_OCCUPIED", { cityId: city.id });
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  if (
    rule.technology !== null &&
    !player.researchedTechs.includes(rule.technology)
  )
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (assignedUnitCountV7(state, city.id) >= cityUnitCapacityV7(state, city))
    return rejected(original, "CITY_CAPACITY_FULL", { cityId: city.id });
  const cost =
    rule.cost === null
      ? null
      : Math.max(1, rule.cost - (tile?.improvement === "SHIPYARD" ? 2 : 0));
  if (cost === null || player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost: cost ?? 0 });
  try {
    const allocation = allocateUnitId(state.nextEntityId);
    const trained: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: city.id,
      role: command.role,
      form: "NAVAL",
      at: command.at,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: exhaustedActivation(),
    };
    return accepted(
      checked({
        ...state,
        nextEntityId: allocation.nextEntityId,
        commandIndex: nextSafe(state.commandIndex),
        players: debit(state.players, actor, cost),
        cities: state.cities.map((candidate) =>
          candidate.id === city.id
            ? { ...candidate, cityActionAvailable: false }
            : candidate,
        ),
        units: [...state.units, trained],
      }),
      [
        {
          kind: "NAVAL_UNIT_TRAINED",
          playerId: actor,
          cityId: city.id,
          unitId: trained.id,
          role: command.role,
          cost,
          at: command.at,
          dock: tile.improvement === "SHIPYARD" ? "SHIPYARD" : "PORT",
          discountSource: tile.improvement === "SHIPYARD" ? "SHIPYARD" : null,
        },
      ],
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyDisembark(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "DISEMBARK" }>,
): ApplyCommandResultV7 {
  const unit = state.units.find((candidate) => candidate.id === command.unitId);
  if (unit === undefined) return rejected(original, "UNIT_NOT_FOUND");
  if (unit.ownerId !== actor) return rejected(original, "UNIT_NOT_OWNED");
  const tile = tileAtV7(state.board, command.at);
  const player = requirePlayer(state, actor);
  const territoryOwner = state.cities.find(
    (city) => city.id === tile?.territoryCityId,
  )?.ownerId;
  if (
    unit.form !== "EMBARKED" ||
    unit.activation.handled ||
    chebyshev(unit.at, command.at) !== 1 ||
    tile === undefined ||
    tile.biome === null ||
    (tile.terrain === "MOUNTAIN" &&
      !player.researchedTechs.includes("ENGINEERING")) ||
    (territoryOwner !== undefined &&
      territoryOwner !== actor &&
      arePlayersAlliedV7(state, actor, territoryOwner)) ||
    state.units.some(
      (candidate) => candidate.hp > 0 && same(candidate.at, command.at),
    )
  )
    return rejected(original, "MOVEMENT_ILLEGAL");
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  try {
    const from = unit.at;
    const treasure = resolveTreasure(state, actor, unit, command.at);
    let players = treasure?.players ?? state.players;
    let movedUnits = state.units.map((candidate) =>
      candidate.id === unit.id
        ? {
            ...candidate,
            at: command.at,
            form: "LAND" as const,
            captureEligible: false,
            activation: { ...candidate.activation, moved: true, handled: true },
          }
        : candidate,
    );
    const landed = movedUnits.find(
      (candidate) => candidate.id === unit.id,
    ) as UnitStateV7;
    const sight = revealRadius(
      { ...state, players, units: movedUnits },
      actor,
      command.at,
      unitSightRadiusAtV7({ ...state, players, units: movedUnits }, landed),
    );
    players = setExplored(players, actor, sight.explored);
    if (treasure?.spawnedUnit !== null && treasure?.spawnedUnit !== undefined) {
      movedUnits = [...movedUnits, treasure.spawnedUnit];
      const spawnedSight = revealRadius(
        { ...state, players, units: movedUnits } as GameStateV7,
        actor,
        treasure.spawnedUnit.at,
        unitSightRadiusAtV7(
          { ...state, players, units: movedUnits } as GameStateV7,
          treasure.spawnedUnit,
        ),
      );
      players = setExplored(players, actor, spawnedSight.explored);
      treasure.extraRevealed.push(...spawnedSight.revealed);
    }
    const occupiesHostileDefense =
      tile.fieldDefense &&
      territoryOwner !== undefined &&
      territoryOwner !== actor &&
      arePlayersHostileV7(state, actor, territoryOwner);
    const board = occupiesHostileDefense
      ? replaceTile(state, command.at, { ...tile, fieldDefense: false })
      : state.board;
    const economy = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities, units: movedUnits },
      state.populationContributions,
    );
    const staged: GameStateV7 = {
      ...state,
      board,
      commandIndex: nextSafe(state.commandIndex),
      players,
      units: movedUnits,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
      random: treasure?.random ?? state.random,
      nextEntityId: treasure?.nextEntityId ?? state.nextEntityId,
      treasureChests: treasure?.treasureChests ?? state.treasureChests,
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    const revealed = uniqueCoords([
      ...sight.revealed,
      ...(treasure?.extraRevealed ?? []),
    ]);
    return accepted(checked(achievements.state), [
      {
        kind: "UNIT_DISEMBARKED",
        playerId: actor,
        unitId: unit.id,
        passengerRole: unit.role,
        from,
        to: command.at,
      },
      ...(occupiesHostileDefense
        ? ([
            {
              kind: "FIELD_DEFENSE_DESTROYED",
              at: command.at,
              reason: "OCCUPATION",
            },
          ] as const)
        : []),
      ...(treasure === null ? [] : [treasure.event]),
      ...economyAndGrowth(economy.changes),
      ...settlement.events,
      ...achievements.events,
      ...(revealed.length > 0
        ? ([
            { kind: "TILES_REVEALED", playerId: actor, tiles: revealed },
          ] as const)
        : []),
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
  if (!city.cityActionAvailable)
    return rejected(original, "CITY_ACTION_SPENT", { cityId: city.id });
  if (isCityBesiegedV7(state, city))
    return rejected(original, "CITY_BESIEGED", { cityId: city.id });
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING", { cityId: city.id });
  const player = requirePlayer(state, actor);
  const rule = effectiveRoleRuleV7(command.role);
  if (command.role === "PATROL_BOAT" || command.role === "BATTLESHIP")
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  if (rule.cost === null)
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  if (
    rule.technology !== null &&
    !player.researchedTechs.includes(rule.technology)
  )
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (assignedUnitCountV7(state, city.id) >= cityUnitCapacityV7(state, city))
    return rejected(original, "CITY_CAPACITY_FULL", { cityId: city.id });
  const forgeActive = state.board.tiles.some(
    (tile) =>
      tile.territoryCityId === city.id &&
      tile.improvement === "FORGE" &&
      spatialContributionAtV7(state, tile.at, "FORGE").population > 0,
  );
  const cost = Math.max(1, rule.cost - (forgeActive ? 1 : 0));
  if (player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  if (
    state.nextEntityId >= Number.MAX_SAFE_INTEGER ||
    state.commandIndex >= Number.MAX_SAFE_INTEGER
  )
    return rejected(original, "INTEGER_OVERFLOW");
  try {
    const allocation = allocateUnitId(state.nextEntityId);
    const trained: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: city.id,
      role: command.role,
      form: "LAND",
      at: city.at,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: exhaustedActivation(),
    };
    const spawn = resolveCityCenterSpawnV7(state, actor, city, trained);
    const staged = {
      ...state,
      nextEntityId: allocation.nextEntityId,
      commandIndex: nextSafe(state.commandIndex),
      players: debit(spawn.players, actor, cost),
      cities: state.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, cityActionAvailable: false }
          : candidate,
      ),
      units: spawn.units,
    };
    const achievements = evaluateAchievementsV7(staged, actor);
    return accepted(checked(achievements.state), [
      {
        kind: "UNIT_TRAINED",
        playerId: actor,
        cityId: city.id,
        unitId: trained.id,
        role: trained.role,
        cost,
        at: trained.at,
      },
      ...spawn.events,
      ...achievements.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyLandGrant(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  cityId: CityStateV7["id"],
): ApplyCommandResultV7 {
  const city = state.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  if (!city.cityActionAvailable)
    return rejected(original, "CITY_ACTION_SPENT", { cityId: city.id });
  const player = requirePlayer(state, actor);
  if (!player.researchedTechs.includes("PLANNING"))
    return rejected(original, "TECH_REQUIRED", { tech: "PLANNING" });
  if (city.level < 3 || city.landGrantUsed)
    return rejected(original, "INVALID_TILE", { action: "LAND_GRANT" });
  if (isCityBesiegedV7(state, city)) return rejected(original, "CITY_BESIEGED");
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  if (player.coins < 6)
    return rejected(original, "INSUFFICIENT_COINS", { cost: 6 });
  const claimed = state.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === null &&
        Math.abs(tile.at.x - city.at.x) <= 2 &&
        Math.abs(tile.at.y - city.at.y) <= 2,
    )
    .map((tile) => tile.at)
    .sort(compareCoords);
  if (claimed.length === 0)
    return rejected(original, "INVALID_TILE", { action: "LAND_GRANT" });
  try {
    const claimKeys = new Set(claimed.map(key));
    const board = {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        claimKeys.has(key(tile.at))
          ? { ...tile, territoryCityId: city.id }
          : tile,
      ),
    };
    const known = new Set(player.explored.map(key));
    const revealed = claimed.filter((at) => !known.has(key(at)));
    const cities = state.cities.map((candidate) =>
      candidate.id === city.id
        ? {
            ...candidate,
            landGrantUsed: true,
            cityActionAvailable: false,
          }
        : candidate,
    );
    const recalculation = recomputeLiveEconomyV7(
      state,
      { board, cities },
      state.populationContributions,
    );
    const staged: GameStateV7 = {
      ...state,
      board,
      cities: recalculation.cities,
      populationContributions: recalculation.populationContributions,
      players: setExplored(
        debit(state.players, actor, 6),
        actor,
        [...player.explored, ...revealed].sort(compareCoords),
      ),
      commandIndex: nextSafe(state.commandIndex),
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    return accepted(checked(achievements.state), [
      {
        kind: "LAND_GRANTED",
        playerId: actor,
        cityId: city.id,
        cost: 6,
        tiles: claimed,
      },
      ...(revealed.length > 0
        ? [
            {
              kind: "TILES_REVEALED" as const,
              playerId: actor,
              tiles: revealed,
            },
          ]
        : []),
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
      ...achievements.events,
    ]);
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
  try {
    let nextEntityId = state.nextEntityId;
    let players = state.players;
    const board = state.board;
    let cities: readonly CityStateV7[] = state.cities;
    let units = state.units;
    let contributions = state.populationContributions;
    const choices: readonly PendingChoiceV7[] = state.pendingChoices.slice(1);
    const events: DomainEventV7[] = [
      {
        kind: "CITY_REWARD_CHOSEN",
        playerId: actor,
        cityId: city.id,
        reachedLevel: command.reachedLevel,
        reward: command.reward,
        coinDelta:
          command.reward === "STOCKPILE"
            ? 4
            : command.reward === "TREASURY"
              ? 12
              : command.reward === "TREASURY_8"
                ? 8
                : 0,
      },
    ];
    const rewarded = {
      ...city,
      expanded: city.expanded,
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
      command.reward === "TREASURY" ||
      command.reward === "TREASURY_8"
    ) {
      const amount =
        command.reward === "STOCKPILE"
          ? 4
          : command.reward === "TREASURY_8"
            ? 8
            : 12;
      const coins = requirePlayer(state, actor).coins + amount;
      if (!Number.isSafeInteger(coins))
        throw new RangeError("INTEGER_OVERFLOW");
      players = players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      );
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
      events.push(...economyAndGrowth(recalc.changes));
    } else if (unitRole !== null) {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rule = effectiveRoleRuleV7(unitRole);
      const created: UnitStateV7 = {
        id: allocation.id,
        ownerId: actor,
        homeCityId: city.id,
        role: unitRole,
        form: "LAND",
        at: city.at,
        hp: rule.maxHp,
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: exhaustedActivation(),
      };
      const spawn = resolveCityCenterSpawnV7(
        { ...state, players, cities, units },
        actor,
        city,
        created,
      );
      players = spawn.players;
      units = spawn.units;
      events.push({
        kind: "UNIT_REWARD_GRANTED",
        playerId: actor,
        cityId: city.id,
        reachedLevel: command.reachedLevel,
        unitId: created.id,
        role: unitRole,
      });
      events.push(...spawn.events);
    }
    const settlement = settleCityRewardsV7(
      {
        ...state,
        nextEntityId,
        players,
        board,
        cities,
        units,
        populationContributions: contributions,
        pendingChoices: choices,
      },
      actor,
    );
    events.push(...settlement.events);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    events.push(...achievements.events);
    return accepted(
      checked({
        ...achievements.state,
        commandIndex: nextSafe(state.commandIndex),
      }),
      events,
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyMove(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const { unit } = actorCheck;
  if (unit.activation.moved || primaryUsed(unit)) {
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
  }
  const validation = validateMovementPathV7(state, unit, command.path);
  if (!validation.legal)
    return rejected(original, "MOVEMENT_ILLEGAL", {
      reason: validation.reason,
    });
  const destinationTile = tileAtV7(state.board, validation.destination);
  const autoEmbarks =
    unit.form === "LAND" &&
    validation.interruption === null &&
    validation.traversedPath.length === command.path.length &&
    (destinationTile?.improvement === "PORT" ||
      destinationTile?.improvement === "SHIPYARD") &&
    destinationTile.territoryCityId !== null &&
    state.cities.some(
      (city) =>
        city.id === destinationTile.territoryCityId && city.ownerId === actor,
    ) &&
    isActivePortV7(state, validation.destination, actor);
  try {
    const treasure = resolveTreasure(
      state,
      actor,
      unit,
      validation.destination,
    );
    let players = treasure?.players ?? state.players;
    players = setExplored(players, actor, validation.explored);
    let units = state.units.map((candidate) =>
      candidate.id === unit.id
        ? {
            ...candidate,
            at: validation.destination,
            form: autoEmbarks ? ("EMBARKED" as const) : candidate.form,
            captureEligible: false,
            activation: autoEmbarks
              ? {
                  ...exhaustedActivation(),
                  movedPathLength: validation.traversedPath.length,
                }
              : {
                  ...candidate.activation,
                  moved: true,
                  movedPathLength: validation.traversedPath.length,
                  handled: unit.form === "EMBARKED" ? false : true,
                },
          }
        : candidate,
    );
    if (treasure?.spawnedUnit !== null && treasure?.spawnedUnit !== undefined) {
      units = [...units, treasure.spawnedUnit];
      const sight = revealRadius(
        { ...state, players, units } as GameStateV7,
        actor,
        treasure.spawnedUnit.at,
        unitSightRadiusAtV7(
          { ...state, players, units } as GameStateV7,
          treasure.spawnedUnit,
        ),
      );
      players = setExplored(players, actor, sight.explored);
      treasure.extraRevealed.push(...sight.revealed);
    }
    const events: DomainEventV7[] = [];
    const occupiesHostileDefense =
      unit.form === "LAND" &&
      !autoEmbarks &&
      destinationTile?.fieldDefense === true &&
      destinationTile.territoryCityId !== null &&
      state.cities.some(
        (city) =>
          city.id === destinationTile.territoryCityId &&
          city.ownerId !== actor &&
          arePlayersHostileV7(state, actor, city.ownerId),
      );
    const board =
      occupiesHostileDefense && destinationTile !== undefined
        ? replaceTile(state, validation.destination, {
            ...destinationTile,
            fieldDefense: false,
          })
        : state.board;
    if (occupiesHostileDefense)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: validation.destination,
        reason: "OCCUPATION",
      });
    if (validation.traversedPath.length > 0)
      events.push({
        kind: "UNIT_MOVED",
        unitId: unit.id,
        path: validation.traversedPath,
      });
    if (autoEmbarks)
      events.push({
        kind: "UNIT_EMBARKED",
        playerId: actor,
        unitId: unit.id,
        passengerRole: unit.role,
        from: validation.traversedPath.at(-2) ?? unit.at,
        to: validation.destination,
      });
    if (treasure !== null) events.push(treasure.event);
    if (validation.interruption !== null)
      events.push({
        kind: "UNIT_MOVE_INTERRUPTED",
        unitId: unit.id,
        at: validation.interruption.at,
        reason: validation.interruption.reason,
      });
    const revealed = uniqueCoords([
      ...validation.revealed,
      ...(treasure?.extraRevealed ?? []),
    ]);
    if (revealed.length > 0)
      events.push({ kind: "TILES_REVEALED", playerId: actor, tiles: revealed });
    let staged: GameStateV7 = {
      ...state,
      board,
      commandIndex: nextSafe(state.commandIndex),
      players,
      units,
      random: treasure?.random ?? state.random,
      nextEntityId: treasure?.nextEntityId ?? state.nextEntityId,
      treasureChests: treasure?.treasureChests ?? state.treasureChests,
    };
    const economy = recomputeLiveEconomyV7(
      state,
      { board: staged.board, cities: staged.cities, units: staged.units },
      staged.populationContributions,
    );
    staged = {
      ...staged,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    };
    events.push(...economyAndGrowth(economy.changes));
    const settlement = settleCityRewardsV7(staged, actor);
    events.push(...settlement.events);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    return accepted(checked(achievements.state), [
      ...events,
      ...achievements.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

interface TreasureResolutionV7 {
  readonly players: readonly PlayerStateV7[];
  readonly random: GameStateV7["random"];
  readonly nextEntityId: number;
  readonly treasureChests: readonly CoordV7[];
  readonly spawnedUnit: UnitStateV7 | null;
  readonly extraRevealed: CoordV7[];
  readonly event: Extract<DomainEventV7, { kind: "TREASURE_CAPTURED" }>;
}

function resolveTreasure(
  state: GameStateV7,
  actor: PlayerId,
  mover: UnitStateV7,
  at: CoordV7,
): TreasureResolutionV7 | null {
  if (!state.treasureChests.some((chest) => same(chest, at))) return null;
  const draw = nextBounded(state.random, 2);
  const requestedReward = draw.value === 0 ? "COINS" : "KNIGHT";
  const placement =
    requestedReward === "KNIGHT"
      ? treasureKnightPlacement(state, actor, mover, at)
      : null;
  if (placement !== null) {
    const allocation = allocateUnitId(state.nextEntityId);
    const rule = effectiveRoleRuleV7("KNIGHT");
    const spawnedUnit: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: placement.homeCityId,
      role: "KNIGHT",
      form: "LAND",
      at: placement.at,
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
      treasureChests: state.treasureChests.filter((chest) => !same(chest, at)),
      spawnedUnit,
      extraRevealed: [],
      event: {
        kind: "TREASURE_CAPTURED",
        playerId: actor,
        unitId: mover.id,
        at,
        requestedReward,
        grantedReward: "KNIGHT",
        coinDelta: 0,
        knightFallback: false,
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
    treasureChests: state.treasureChests.filter((chest) => !same(chest, at)),
    spawnedUnit: null,
    extraRevealed: [],
    event: {
      kind: "TREASURE_CAPTURED",
      playerId: actor,
      unitId: mover.id,
      at,
      requestedReward,
      grantedReward: "COINS",
      coinDelta: 5,
      knightFallback: requestedReward === "KNIGHT",
      spawnedUnitId: null,
      spawnedAt: null,
      homeCityId: null,
    },
  };
}

function treasureKnightPlacement(
  state: GameStateV7,
  actor: PlayerId,
  mover: UnitStateV7,
  at: CoordV7,
): { readonly at: CoordV7; readonly homeCityId: CityStateV7["id"] } | null {
  const cities = state.cities
    .filter(
      (city) =>
        city.ownerId === actor &&
        assignedUnitCountV7(state, city.id) < cityUnitCapacityV7(state, city),
    )
    .sort(
      (a, b) =>
        Number(b.id === mover.homeCityId) - Number(a.id === mover.homeCityId) ||
        a.id - b.id,
    );
  const player = requirePlayer(state, actor);
  for (const city of cities)
    for (const candidate of adjacentCoords(state, at)) {
      const tile = tileAtV7(state.board, candidate);
      if (
        tile === undefined ||
        tile.biome === null ||
        tile.site !== null ||
        (tile.terrain === "MOUNTAIN" &&
          !player.researchedTechs.includes("ENGINEERING")) ||
        state.units.some((unit) => unit.hp > 0 && same(unit.at, candidate)) ||
        state.treasureChests.some((chest) => same(chest, candidate))
      )
        continue;
      const territoryOwner = state.cities.find(
        (owner) => owner.id === tile.territoryCityId,
      )?.ownerId;
      if (
        territoryOwner !== undefined &&
        arePlayersAlliedV7(state, actor, territoryOwner)
      )
        continue;
      return { at: candidate, homeCityId: city.id };
    }
  return null;
}

function applyAttack(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const attacker = actorCheck.unit;
  if (attacker.form === "EMBARKED")
    return rejected(original, "ATTACK_NOT_LEGAL", { reason: "EMBARKED" });
  const rule = effectiveRoleRuleV7(attacker.role);
  if (
    (!attacker.activation.overrunActive && primaryUsed(attacker)) ||
    (!attacker.activation.overrunActive &&
      attacker.activation.attacksUsed >= 1) ||
    (attacker.activation.moved &&
      !rule.mayUsePrimaryActionAfterMove &&
      attacker.activation.attacksUsed === 0)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: attacker.id });
  if (!rule.abilities.includes("ATTACK") || rule.attack2 <= 0)
    return rejected(original, "ATTACK_NOT_LEGAL", { reason: "NO_ATTACK" });
  const defender = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  if (defender === undefined)
    return rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (!isUnitVisibleToPlayerV7(state, actor, defender))
    return rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (
    defender.ownerId === actor ||
    arePlayersAlliedV7(state, actor, defender.ownerId)
  )
    return rejected(original, "TARGET_ALLIED");
  const distance = chebyshev(attacker.at, defender.at);
  if (distance < rule.minimumRange || distance > rule.range)
    return rejected(original, "TARGET_OUT_OF_RANGE");
  try {
    const calculated = calculateCombatPreviewV7(
      state,
      attacker.id,
      defender.id,
    );
    const destinationTile = tileAtV7(state.board, defender.at);
    const canAdvance =
      calculated.advances &&
      isExplored(requirePlayer(state, actor), defender.at) &&
      destinationTile !== undefined &&
      (destinationTile.terrain !== "MOUNTAIN" ||
        requirePlayer(state, actor).researchedTechs.includes("ENGINEERING"));
    const preview =
      canAdvance === calculated.advances
        ? calculated
        : { ...calculated, advances: canAdvance };
    const attacksUsed = attacker.activation.attacksUsed + 1;
    const attackerKills =
      attacker.kills +
      (preview.defenderDies ? 1 : 0) +
      preview.splash.filter((entry) => entry.dies).length;
    const defenderKills = defender.kills + (preview.attackerDies ? 1 : 0);
    if (
      !Number.isSafeInteger(attacksUsed) ||
      !Number.isSafeInteger(attackerKills) ||
      !Number.isSafeInteger(defenderKills)
    )
      throw new RangeError("INTEGER_OVERFLOW");
    const pushDestination =
      preview.push === "WILL_PUSH"
        ? pushedDestinationV7(state, attacker, defender)
        : null;
    let attackerAfter: UnitStateV7 = {
      ...attacker,
      at: preview.advances ? defender.at : attacker.at,
      hp: attacker.hp - preview.damageToAttacker,
      kills: attackerKills,
      captureEligible: false,
      activation: {
        ...attacker.activation,
        attacked: true,
        attacksUsed,
        inspired: false,
        overrunActive: false,
        handled: true,
      },
    };
    const defenderAfter: UnitStateV7 = {
      ...defender,
      at: pushDestination ?? defender.at,
      hp: defender.hp - preview.damageToDefender,
      kills: defenderKills,
      captureEligible:
        pushDestination === null ? defender.captureEligible : false,
    };
    const splashDamage = new Map(
      preview.splash.map((entry) => [entry.unitId, entry.damage] as const),
    );
    let units = state.units
      .map((unit) =>
        unit.id === attacker.id
          ? attackerAfter
          : unit.id === defender.id
            ? defenderAfter
            : splashDamage.has(unit.id)
              ? { ...unit, hp: unit.hp - (splashDamage.get(unit.id) ?? 0) }
              : unit,
      )
      .filter((unit) => unit.hp > 0);
    const defenseReason = destinationTile?.fieldDefense
      ? attacker.role === "CATAPULT"
        ? "CATAPULT"
        : preview.inspiredApplied && distance === 1 && !preview.attackerDies
          ? "INSPIRED"
          : distance === 1 &&
              !preview.attackerDies &&
              attacker.form === "LAND" &&
              requirePlayer(state, actor).researchedTechs.includes("EXPLOSIVES")
            ? "EXPLOSIVES"
            : preview.advances
              ? "OCCUPATION"
              : null
      : null;
    const board =
      defenseReason === null || destinationTile === undefined
        ? state.board
        : replaceTile(state, defender.at, {
            ...destinationTile,
            fieldDefense: false,
          });
    const advanceReveal = preview.advances
      ? revealRadius(
          { ...state, board, units } as GameStateV7,
          actor,
          defender.at,
          unitSightRadiusAtV7(
            { ...state, board, units } as GameStateV7,
            attackerAfter,
          ),
        )
      : null;
    const visiblePlayers =
      advanceReveal === null
        ? state.players
        : setExplored(state.players, actor, advanceReveal.explored);
    const visibleState = {
      ...state,
      board,
      players: visiblePlayers,
      units,
    } as GameStateV7;
    const overrunContinues =
      attacker.role === "KNIGHT" &&
      preview.advances &&
      !preview.attackerDies &&
      units.some(
        (candidate) =>
          candidate.id !== attacker.id &&
          candidate.hp > 0 &&
          arePlayersHostileV7(state, actor, candidate.ownerId) &&
          chebyshev(defender.at, candidate.at) === 1 &&
          isUnitVisibleToPlayerV7(visibleState, actor, candidate),
      );
    if (overrunContinues) {
      attackerAfter = {
        ...attackerAfter,
        activation: {
          ...attackerAfter.activation,
          overrunActive: true,
          handled: false,
        },
      };
      units = units.map((unit) =>
        unit.id === attackerAfter.id ? attackerAfter : unit,
      );
    }
    const finalPreview = {
      ...preview,
      attacksRemaining: overrunContinues ? 1 : 0,
      overrunAdvance: attacker.role === "KNIGHT" && preview.advances,
      overrunContinues,
    };
    const events: DomainEventV7[] = [
      { kind: "COMBAT_RESOLVED", preview: finalPreview },
    ];
    if (defenseReason !== null)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: defender.at,
        reason: defenseReason,
      });
    if (preview.defenderDies)
      events.push({ kind: "UNIT_DIED", unitId: defender.id, cause: "ATTACK" });
    for (const splash of preview.splash)
      if (splash.dies)
        events.push({
          kind: "UNIT_DIED",
          unitId: splash.unitId,
          cause: "SPLASH",
        });
    if (preview.attackerDies)
      events.push({
        kind: "UNIT_DIED",
        unitId: attacker.id,
        cause: "RETALIATION",
      });
    if (preview.advances)
      events.push({
        kind: "UNIT_MOVED",
        unitId: attacker.id,
        path: [defender.at],
      });
    if (pushDestination !== null)
      events.push({
        kind: "UNIT_PUSHED",
        sourceUnitId: attacker.id,
        targetUnitId: defender.id,
        from: defender.at,
        to: pushDestination,
      });
    let players = visiblePlayers;
    if (preview.advances) {
      if (advanceReveal !== null && advanceReveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: actor,
          tiles: advanceReveal.revealed,
        });
    }
    if (pushDestination !== null) {
      const reveal = revealRadius(
        { ...state, board, players, units } as GameStateV7,
        defender.ownerId,
        pushDestination,
        unitSightRadiusAtV7(
          { ...state, board, players, units } as GameStateV7,
          defenderAfter,
        ),
      );
      players = setExplored(players, defender.ownerId, reveal.explored);
      if (reveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: defender.ownerId,
          tiles: reveal.revealed,
        });
    }
    const economy = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities, units },
      state.populationContributions,
    );
    events.push(...economyAndGrowth(economy.changes));
    const settlement = settleCityRewardsV7(
      {
        ...state,
        board,
        commandIndex: nextSafe(state.commandIndex),
        players,
        cities: economy.cities,
        units,
        populationContributions: economy.populationContributions,
      },
      actor,
    );
    events.push(...settlement.events);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    events.push(...achievements.events);
    return accepted(checked(achievements.state), events);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function supportCaptain(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
  ability: "RALLY" | "TEND_WOUNDED",
): { readonly captain: UnitStateV7 } | ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const captain = actorCheck.unit;
  const rule = effectiveRoleRuleV7(captain.role);
  if (captain.form !== "LAND" || !rule.abilities.includes(ability))
    return rejected(original, "UNIT_ROLE_INVALID", { role: captain.role });
  if (
    primaryUsed(captain) ||
    (captain.activation.moved && !rule.mayUsePrimaryActionAfterMove)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  return { captain };
}

function applyRally(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const result = supportCaptain(original, state, actor, unitId, "RALLY");
  if ("accepted" in result) return result;
  const targets = state.units
    .filter((unit) => {
      const tactical = effectiveRoleRuleV7(unit.role).tacticalRole;
      return (
        unit.hp > 0 &&
        unit.ownerId === actor &&
        unit.form === "LAND" &&
        unit.id !== result.captain.id &&
        !unit.activation.inspired &&
        tactical !== "SUPPORT" &&
        tactical !== "SIEGE" &&
        chebyshev(result.captain.at, unit.at) === 1
      );
    })
    .sort((a, b) => a.id - b.id);
  if (targets.length === 0) return rejected(original, "HEAL_TARGET_NOT_FOUND");
  const ids = new Set(targets.map((unit) => unit.id));
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      units: state.units.map((unit) =>
        unit.id === result.captain.id
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                specialActed: true,
                handled: true,
              },
            }
          : ids.has(unit.id)
            ? { ...unit, activation: { ...unit.activation, inspired: true } }
            : unit,
      ),
    }),
    [
      {
        kind: "UNITS_RALLIED",
        captainId: result.captain.id,
        unitIds: targets.map((unit) => unit.id),
      },
    ],
  );
}

function applyTendWounded(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const result = supportCaptain(original, state, actor, unitId, "TEND_WOUNDED");
  if ("accepted" in result) return result;
  const targets = state.units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.ownerId === actor &&
        unit.form === "LAND" &&
        unit.id !== result.captain.id &&
        unit.hp < unit.maxHp &&
        !unit.activation.tendedThisTurn &&
        chebyshev(result.captain.at, unit.at) === 1,
    )
    .sort((a, b) => a.id - b.id);
  if (targets.length === 0) return rejected(original, "HEAL_TARGET_NOT_FOUND");
  const amounts = new Map(
    targets.map(
      (unit) => [unit.id, Math.min(2, unit.maxHp - unit.hp)] as const,
    ),
  );
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      units: state.units.map((unit) =>
        unit.id === result.captain.id
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                specialActed: true,
                handled: true,
              },
            }
          : amounts.has(unit.id)
            ? {
                ...unit,
                hp: unit.hp + (amounts.get(unit.id) ?? 0),
                activation: { ...unit.activation, tendedThisTurn: true },
              }
            : unit,
      ),
    }),
    [
      {
        kind: "WOUNDED_TENDED",
        captainId: result.captain.id,
        results: targets.map((unit) => ({
          unitId: unit.id,
          amount: amounts.get(unit.id) ?? 0,
          hpAfter: unit.hp + (amounts.get(unit.id) ?? 0),
        })),
      },
    ],
  );
}

function applyRecover(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const unit = actorCheck.unit;
  if (primaryUsed(unit) || unit.activation.moved)
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  if (unit.hp >= unit.maxHp)
    return rejected(original, "RECOVER_NOT_LEGAL", { reason: "FULL_HP" });
  if (unit.form === "EMBARKED")
    return rejected(original, "RECOVER_NOT_LEGAL", { reason: "EMBARKED" });
  if (
    unit.form === "NAVAL" &&
    ![unit.at, ...adjacentCoords(state, unit.at)].some((at) =>
      isActivePortV7(state, at, actor),
    )
  )
    return rejected(original, "RECOVER_NOT_LEGAL", { reason: "NO_PORT" });
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const amount = Math.min(recoveryAmount(state, unit), unit.maxHp - unit.hp);
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      units: state.units.map((candidate) =>
        candidate.id === unitId
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
      ),
    }),
    [{ kind: "UNIT_RECOVERED", unitId, amount, automatic: false }],
  );
}

function applyPromote(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const unit = actorCheck.unit;
  if (unit.activation.overrunActive)
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  if (unit.form === "EMBARKED" || unit.veteran || unit.kills < 3)
    return rejected(original, "PROMOTION_NOT_ELIGIBLE", { unitId });
  const maxHp = unit.maxHp + 5;
  if (
    !Number.isSafeInteger(maxHp) ||
    !Number.isSafeInteger(unit.hp + 5) ||
    state.commandIndex >= Number.MAX_SAFE_INTEGER
  )
    return rejected(original, "INTEGER_OVERFLOW");
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      units: state.units.map((candidate) =>
        candidate.id === unitId
          ? { ...candidate, veteran: true, maxHp, hp: candidate.hp + 5 }
          : candidate,
      ),
    }),
    [{ kind: "UNIT_PROMOTED", unitId, maxHp }],
  );
}

function applyWait(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  if (actorCheck.unit.activation.overrunActive)
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  if (actorCheck.unit.activation.handled)
    return rejected(original, "UNIT_ALREADY_HANDLED", { unitId });
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      units: state.units.map((unit) =>
        unit.id === unitId
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                overrunActive: false,
                handled: true,
              },
            }
          : unit,
      ),
    }),
    [{ kind: "UNIT_WAITED", playerId: actor, unitId }],
  );
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
  const { unit } = actorCheck;
  if (unit.form !== "LAND" || unit.role === "JUGGERNAUT")
    return rejected(original, "PILLAGE_INVALID_TARGET");
  if (primaryUsed(unit))
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  const player = requirePlayer(state, actor);
  if (!player.researchedTechs.includes("RAIDING"))
    return rejected(original, "TECH_REQUIRED", { tech: "RAIDING" });
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
      improvement === "MARKET"
        ? undefined
        : populationContributionAt(state, tile.at);
    if (improvement !== "MARKET" && contribution === undefined)
      return rejected(original, "INVALID_STATE");
    const resourceRestored = restoredResourceForImprovement(improvement);
    const board = replaceTile(state, tile.at, {
      ...tile,
      resource: resourceRestored,
      improvement: null,
    });
    const contributions =
      contribution === undefined
        ? state.populationContributions
        : state.populationContributions.filter(
            (item) => item.id !== contribution.id,
          );
    const coins = player.coins + 1;
    if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
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
    const staged: GameStateV7 = {
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      board,
      players: state.players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      ),
      cities: recalc.cities,
      populationContributions: recalc.populationContributions,
      units,
    };
    const settlement = settleCityRewardsV7(staged, actor);
    const achievements = evaluateAchievementsV7(settlement.state, actor);
    const next = checked(achievements.state);
    return accepted(next, [
      {
        kind: "IMPROVEMENT_PILLAGED",
        playerId: actor,
        unitId: unit.id,
        cityId: city.id,
        at: tile.at,
        improvement,
        resourceRestored,
        coinDelta: 1,
      },
      ...economyAndGrowth(recalc.changes),
      ...settlement.events,
      ...achievements.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

function applyFieldDefense(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const unit = actorCheck.unit;
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, unit.at);
  const territory = state.cities.find(
    (city) => city.id === tile?.territoryCityId,
  );
  if (!player.researchedTechs.includes("FORTIFICATION"))
    return rejected(original, "TECH_REQUIRED", { tech: "FORTIFICATION" });
  if (
    unit.form !== "LAND" ||
    (unit.role !== "FIGHTER" && unit.role !== "GUARD") ||
    tile === undefined ||
    tile.biome === null ||
    territory?.ownerId !== actor ||
    !isExplored(player, unit.at) ||
    tile.fieldDefense
  )
    return rejected(original, "INVALID_TILE", {
      action: "BUILD_FIELD_DEFENSE",
    });
  if (primaryUsed(unit) || unit.activation.moved)
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  if (player.coins < 3)
    return rejected(original, "INSUFFICIENT_COINS", { cost: 3 });
  try {
    const next = checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      board: replaceTile(state, unit.at, { ...tile, fieldDefense: true }),
      players: debit(state.players, actor, 3),
      units: state.units.map((candidate) =>
        candidate.id === unit.id
          ? {
              ...candidate,
              activation: {
                ...candidate.activation,
                specialActed: true,
                handled: true,
              },
            }
          : candidate,
      ),
    });
    return accepted(next, [
      {
        kind: "FIELD_DEFENSE_BUILT",
        playerId: actor,
        unitId,
        at: unit.at,
        cost: 3,
      },
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
  if (actorCheck.unit.form !== "LAND")
    return rejected(original, "UNIT_ROLE_INVALID", {
      role: actorCheck.unit.role,
    });
  const player = requirePlayer(state, actor);
  if (!player.researchedTechs.includes("ADMINISTRATION"))
    return rejected(original, "TECH_REQUIRED", { tech: "ADMINISTRATION" });
  const rule = effectiveRoleRuleV7(actorCheck.unit.role);
  if (rule.cost === null)
    return rejected(original, "UNIT_ROLE_INVALID", {
      role: actorCheck.unit.role,
    });
  if (primaryUsed(actorCheck.unit))
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  const refund = Math.floor(rule.cost / 2);
  try {
    const coins = player.coins + refund;
    if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
    const units = state.units.filter((item) => item.id !== unitId);
    const afterRemoval = {
      ...state,
      units,
    };
    const next = checked({
      ...afterRemoval,
      commandIndex: nextSafe(state.commandIndex),
      players: state.players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      ),
    });
    return accepted(next, [
      {
        kind: "UNIT_DISBANDED",
        playerId: actor,
        unitId,
        role: actorCheck.unit.role,
        coinDelta: refund,
      },
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
    unit.form !== "LAND" ||
    state.units.some(
      (item) => item.id !== unit.id && item.hp > 0 && same(item.at, unit.at),
    ) ||
    unit.activation.moved ||
    primaryUsed(unit) ||
    !unit.captureEligible
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
        landGrantUsed: false,
        cityActionAvailable: false,
        rewards: [],
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
        cityActionAvailable: false,
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
    const eliminatesFormerOwner =
      formerOwner !== null &&
      !cities.some((item) => item.ownerId === formerOwner);
    const eliminatedUnits = eliminatesFormerOwner
      ? units
          .filter((item) => item.ownerId === formerOwner)
          .sort((a, b) => a.id - b.id)
      : [];
    if (eliminatesFormerOwner)
      units = units.filter((item) => item.ownerId !== formerOwner);
    const events: DomainEventV7[] = [
      {
        kind: "CITY_CAPTURED",
        cityId: captured.id,
        from: formerOwner,
        to: actor,
      },
    ];
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
      { board, cities, units },
      contributions,
    );
    cities = recalc.cities;
    contributions = recalc.populationContributions;
    events.push(...economyAndGrowth(recalc.changes));
    const settlement = settleCityRewardsV7(
      {
        ...state,
        board,
        players,
        cities,
        units,
        populationContributions: contributions,
        pendingChoices: choices,
      },
      actor,
    );
    players = settlement.state.players;
    cities = settlement.state.cities;
    choices = settlement.state.pendingChoices;
    events.push(...settlement.events);
    const achievements = evaluateAchievementsV7(
      {
        ...state,
        board,
        players,
        cities,
        units,
        populationContributions: contributions,
        pendingChoices: choices,
      },
      actor,
    );
    players = achievements.state.players;
    events.push(...achievements.events);
    if (eliminatesFormerOwner) {
      players = players.map((item) =>
        item.id === formerOwner ? { ...item, status: "ELIMINATED" } : item,
      );
      choices = choices.filter((choice) =>
        cities.some((item) => item.id === choice.cityId),
      );
      events.push(
        ...eliminatedUnits.map((item): DomainEventV7 => ({
          kind: "UNIT_DIED",
          unitId: item.id,
          cause: "ELIMINATION",
        })),
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
  try {
    const current = requirePlayer(state, actor);
    const recovery = recoverIdleUnits(state, current);
    const expired: GameStateV7 = {
      ...recovery.state,
      units: recovery.state.units.map((unit) =>
        unit.ownerId === actor
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                inspired: false,
                overrunActive: false,
                handled: true,
              },
            }
          : unit,
      ),
    };
    const preview = playerIncomeV7(expired, actor);
    const nextIndex = nextActiveSeat(state);
    if (nextIndex === null) return rejected(original, "INVALID_STATE");
    const nextPlayer = state.players.find(
      (item) => item.id === state.turnOrder[nextIndex],
    );
    if (nextPlayer === undefined) return rejected(original, "INVALID_STATE");
    const round =
      nextIndex <= state.activeSeatIndex ? nextSafe(state.round) : state.round;
    const advanced = resetTurnUnits(
      {
        ...expired,
        activeSeatIndex: nextIndex,
        round,
      },
      nextPlayer.id,
    );
    const started = startTurnEconomyV7(advanced, nextPlayer, false);
    const turnStarted = started.events[0];
    if (turnStarted === undefined) throw new RangeError("INVALID_STATE");
    const settlement = settleCityRewardsV7(started.state, nextPlayer.id);
    const achievements = evaluateAchievementsV7(
      settlement.state,
      nextPlayer.id,
    );
    return accepted(
      checked({
        ...achievements.state,
        commandIndex: nextSafe(state.commandIndex),
      }),
      [
        ...recovery.events,
        {
          kind: "INCOME_PREVIEWED",
          playerId: actor,
          totalCoins: preview.totalCoins,
          cities: preview.cities,
        },
        { kind: "TURN_ENDED", playerId: actor },
        turnStarted,
        ...started.events.slice(1),
        ...settlement.events,
        ...achievements.events,
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
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

function recoverIdleUnits(
  state: GameStateV7,
  player: PlayerStateV7,
): { state: GameStateV7; events: readonly DomainEventV7[] } {
  const items = state.units
    .filter(
      (unit) =>
        unit.ownerId === player.id &&
        unit.form !== "EMBARKED" &&
        (unit.form !== "NAVAL" ||
          [unit.at, ...adjacentCoords(state, unit.at)].some((at) =>
            isActivePortV7(state, at, player.id),
          )) &&
        unit.hp > 0 &&
        unit.hp < unit.maxHp &&
        !unit.activation.moved &&
        !primaryUsed(unit),
    )
    .sort((a, b) => a.id - b.id)
    .map((unit) => {
      const amount = Math.min(
        recoveryAmount(state, unit),
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

function recoveryAmount(state: GameStateV7, unit: UnitStateV7): number {
  if (unit.form === "NAVAL")
    return [unit.at, ...adjacentCoords(state, unit.at)].some((at) =>
      isActivePortV7(state, at, unit.ownerId),
    )
      ? 4
      : 0;
  if (unit.form === "EMBARKED") return 0;
  const tile = tileAtV7(state.board, unit.at);
  const city = state.cities.find((item) => item.id === tile?.territoryCityId);
  const friendly = city?.ownerId === unit.ownerId;
  return friendly ? 4 : 2;
}

function adjacentCoords(
  state: Pick<GameStateV7, "board">,
  center: CoordV7,
): readonly CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = center.y - 1; y <= center.y + 1; y += 1)
    for (let x = center.x - 1; x <= center.x + 1; x += 1) {
      const at = { x, y };
      if (!same(at, center) && tileAtV7(state.board, at) !== undefined)
        result.push(at);
    }
  return result.sort(compareCoords);
}

function uniqueCoords(values: readonly CoordV7[]): CoordV7[] {
  return [...new Map(values.map((at) => [key(at), at])).values()].sort(
    compareCoords,
  );
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
  if (head !== undefined)
    return command.kind === "CHOOSE_CITY_REWARD"
      ? null
      : error("PENDING_CHOICE", { kind: head.kind });
  return null;
}

function resetTurnUnits(state: GameStateV7, playerId: PlayerId): GameStateV7 {
  return {
    ...state,
    units: state.units.map((unit) => {
      if (unit.ownerId !== playerId) return unit;
      const city = state.cities.find((candidate) =>
        same(candidate.at, unit.at),
      );
      const tile = tileAtV7(state.board, unit.at);
      const captureEligible =
        effectiveRoleRuleV7(unit.role).abilities.includes("CAPTURE") &&
        (tile?.site === "VILLAGE" ||
          (city !== undefined &&
            arePlayersHostileV7(state, playerId, city.ownerId)));
      return {
        ...unit,
        captureEligible,
        activation: {
          moved: false,
          movedPathLength: 0,
          attacked: false,
          attacksUsed: 0,
          tendedThisTurn: false,
          inspired: false,
          overrunActive: false,
          recovered: false,
          captured: false,
          handled: false,
          specialActed: false,
        },
      };
    }),
  };
}
function exactUnknownResearchTech(command: unknown): string | null {
  return hasExactKeysV7(command, ["kind", "tech"]) &&
    command.kind === "RESEARCH" &&
    typeof command.tech === "string" &&
    !TECHNOLOGY_IDS_V7.includes(command.tech as never)
    ? command.tech
    : null;
}
function settleCityRewardsV7(
  state: GameStateV7,
  ownerId: PlayerId,
): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
} {
  if (state.pendingChoices.length > 0) return { state, events: [] };
  const players = state.players;
  const cities = state.cities;
  const events: DomainEventV7[] = [];
  for (const current of [...cities]
    .filter((city) => city.ownerId === ownerId)
    .sort((left, right) => left.id - right.id)) {
    for (
      let reachedLevel = 2;
      reachedLevel <= current.level;
      reachedLevel += 1
    ) {
      const city = cities.find((candidate) => candidate.id === current.id);
      if (city === undefined) throw new RangeError("INVALID_STATE");
      if (city.rewards.some((reward) => reward.reachedLevel === reachedLevel))
        continue;
      const candidates = rewardCandidatesForLevelV7(reachedLevel);
      const owner = players.find((player) => player.id === city.ownerId);
      if (owner?.status !== "ACTIVE") throw new RangeError("INVALID_STATE");
      const pendingChoices: readonly PendingChoiceV7[] = [
        { kind: "CITY_REWARD", cityId: city.id, reachedLevel, candidates },
      ];
      return {
        state: { ...state, players, cities, pendingChoices },
        events: [
          ...events,
          {
            kind: "CITY_REWARD_QUEUED",
            cityId: city.id,
            reachedLevel,
            candidates,
          },
        ],
      };
    }
  }
  return { state: { ...state, players, cities, pendingChoices: [] }, events };
}

function resolveCityCenterSpawnV7(
  state: GameStateV7,
  actor: PlayerId,
  city: CityStateV7,
  spawned: UnitStateV7,
): {
  readonly players: readonly PlayerStateV7[];
  readonly units: readonly UnitStateV7[];
  readonly events: readonly DomainEventV7[];
} {
  const occupant = state.units.find(
    (unit) => unit.hp > 0 && same(unit.at, city.at),
  );
  const occupantPlayer = requirePlayer(state, occupant?.ownerId ?? actor);
  const destination =
    occupant === undefined
      ? null
      : (adjacentCoords(state, city.at).find((at) => {
          const tile = tileAtV7(state.board, at);
          if (tile === undefined || tile.biome === null) return false;
          if (state.treasureChests.some((chest) => same(chest, at)))
            return false;
          if (
            tile.terrain === "MOUNTAIN" &&
            !occupantPlayer.researchedTechs.includes("ENGINEERING")
          )
            return false;
          const territoryOwner = state.cities.find(
            (candidate) => candidate.id === tile.territoryCityId,
          )?.ownerId;
          if (
            territoryOwner !== undefined &&
            territoryOwner !== occupant.ownerId &&
            arePlayersAlliedV7(state, occupant.ownerId, territoryOwner)
          )
            return false;
          return !state.units.some((unit) => unit.hp > 0 && same(unit.at, at));
        }) ?? null);
  const displaced =
    occupant === undefined || destination === null
      ? null
      : { ...occupant, at: destination, captureEligible: false };
  let units = state.units
    .filter((unit) => unit.id !== occupant?.id || displaced !== null)
    .map((unit) => (unit.id === displaced?.id ? displaced : unit));
  units = [...units, spawned];
  let players = state.players;
  const events: DomainEventV7[] = [];
  if (occupant !== undefined)
    events.push({
      kind: "UNIT_SPAWN_DISPLACED",
      playerId: actor,
      cityId: city.id,
      spawnedUnitId: spawned.id,
      displacedUnitId: occupant.id,
      from: city.at,
      to: destination,
    });
  const revealedByPlayer = new Map<PlayerId, CoordV7[]>();
  for (const unit of [spawned, ...(displaced === null ? [] : [displaced])]) {
    const visibleState = { ...state, players, units } as GameStateV7;
    const reveal = revealRadius(
      visibleState,
      unit.ownerId,
      unit.at,
      unitSightRadiusAtV7(visibleState, unit),
    );
    players = setExplored(players, unit.ownerId, reveal.explored);
    if (reveal.revealed.length > 0)
      revealedByPlayer.set(unit.ownerId, [
        ...(revealedByPlayer.get(unit.ownerId) ?? []),
        ...reveal.revealed,
      ]);
  }
  for (const [playerId, revealed] of [...revealedByPlayer].sort(
    ([left], [right]) => left - right,
  ))
    events.push({
      kind: "TILES_REVEALED",
      playerId,
      tiles: uniqueCoords(revealed),
    });
  return { players, units, events };
}
function evaluateAchievementsV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player?.status !== "ACTIVE") return { state, events: [] };
  const engineer = state.populationContributions.some(
    (contribution) =>
      contribution.category === "LIVE" &&
      contribution.amount >= 6 &&
      contribution.source.kind === "IMPROVEMENT" &&
      ["WINDMILL", "SAWMILL", "FORGE", "WORKSHOP"].includes(
        contribution.source.improvement,
      ) &&
      state.cities.some(
        (city) => city.id === contribution.cityId && city.ownerId === playerId,
      ),
  );
  const trainableRoles = new Set(
    state.units.flatMap((unit) =>
      unit.ownerId === playerId &&
      unit.hp > 0 &&
      effectiveRoleRuleV7(unit.role).cost !== null
        ? [unit.role]
        : [],
    ),
  );
  const qualifies = {
    EXPLORER: player.explored.length >= 100,
    ENGINEER: engineer,
    MUSTER: trainableRoles.size >= 4,
  } as const;
  const requiredTech = {
    EXPLORER: "SCOUTING",
    ENGINEER: "ENGINEERING",
    MUSTER: "DRILL",
  } as const;
  const unlocked = player.achievementEntitlements.filter(
    (entitlement) =>
      !entitlement.unlocked &&
      player.researchedTechs.includes(requiredTech[entitlement.achievement]) &&
      qualifies[entitlement.achievement],
  );
  if (unlocked.length === 0) return { state, events: [] };
  const unlockedIds = new Set(unlocked.map((item) => item.achievement));
  return {
    state: {
      ...state,
      players: state.players.map((candidate) =>
        candidate.id === playerId
          ? {
              ...candidate,
              achievementEntitlements: candidate.achievementEntitlements.map(
                (entitlement) =>
                  unlockedIds.has(entitlement.achievement)
                    ? { ...entitlement, unlocked: true }
                    : entitlement,
              ),
            }
          : candidate,
      ),
    },
    events: unlocked.map((entitlement) => ({
      kind: "ACHIEVEMENT_UNLOCKED" as const,
      playerId,
      achievement: entitlement.achievement,
    })),
  };
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
  return [...economyEventsV7(changes), ...growthEventsV7(changes)];
}
function restoredResourceForImprovement(
  improvement: TileStateV7["improvement"],
): "FERTILE_GROUND" | "ORE" | null {
  return improvement === "FARM"
    ? "FERTILE_GROUND"
    : improvement === "MINE"
      ? "ORE"
      : null;
}
function populationContributionAt(
  state: GameStateV7,
  at: CoordV7,
): PopulationContributionV7 | undefined {
  return state.populationContributions.find(
    (item) =>
      (item.source.kind === "IMPROVEMENT" || item.source.kind === "MONUMENT") &&
      same(item.source.at, at),
  );
}
function exhaustedActivation(): UnitStateV7["activation"] {
  return {
    moved: true,
    movedPathLength: 0,
    attacked: true,
    attacksUsed: 1,
    tendedThisTurn: false,
    inspired: false,
    overrunActive: false,
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
function requireValue<T>(value: T | null | undefined): T {
  if (value === null || value === undefined)
    throw new RangeError("INVALID_STATE");
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
function nextSafeBy(value: number, delta: number): number {
  const result = value + delta;
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}
function accepted(
  state: GameStateV7,
  events: readonly DomainEventV7[],
): ApplyCommandResultV7 {
  const frozen = deepFreeze(state);
  acceptedStateCertificatesV7.add(frozen);
  return { accepted: true, state: frozen, events };
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
