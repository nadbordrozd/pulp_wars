import { allocateCityId, allocateUnitId, type PlayerId } from "../model/ids";
import { deepFreeze } from "../model/freeze";
import { nextBounded } from "../random/random";
import type { JsonValue } from "../replay/canonical";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  ORIGINAL_BASELINE_V5_TREE,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  effectiveRoleRuleV7,
  EMBARKED_LANDING_MAX_SPENT_V7,
  embarkedMovementSpentV7,
  factionRulesV7,
  isEggLaidRoleV7,
  isRallyTargetV7,
  playerFactionV7,
  technologyCapabilitiesV7,
  unitCapacitySlotsV7,
  unitGrowsV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  isResourceRevealedV7,
  playerTechnologyResearchCostV7,
  type BasicEconomicCommandKindV7,
  type SpatialEconomicCommandKindV7,
} from "../rules/ruleset-v7";
import { hasExactKeysV7 } from "./schema";
import {
  hasAcceptedStateCertificateV7,
  registerAcceptedStateCertificateV7,
} from "./accepted-state-certificate";
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
  marketCoinsV7,
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
import {
  eggActivationV7,
  hatchEggV7,
  isNestTileV7,
  laidEggHpV7,
  laidEggTurnsV7,
  prunedEggsV7,
  resolveStartTurnHatchV7,
  withEggV7,
} from "./eggs";
import {
  isStampedeTargetFormV7,
  stampedeLaneV7,
  stateStampedeFactsV7,
} from "./stampede";
import {
  RAISE_DEAD_SKELETON_HP_V7,
  raiseDeadGravesV7,
  recordCombatDeathV7,
  withoutGravesV7,
} from "./graves";
import { grownUnitV7 } from "./growth";
import { recordInfectionV7 } from "./infect";
import {
  biteOfV7,
  plagueClearedEventsV7,
  prunedAfflictionsV7,
  recordBittenRisingV7,
  withBittenV7,
  withPlaguedV7,
} from "./afflictions";
import { resolveStartTurnPlagueV7 } from "./plague";
import {
  isExplodingUnitV7,
  resolveStateExplosionChainV7,
  type CreditedDeathV7,
  type ExplosionCauseV7,
} from "./explosions";
import {
  MILITIA_FIGHTERS_V7,
  createInitialMapStateV7,
  type CreateInitialMapStateResultV7,
} from "./map";
import { unitSightRadiusAtV7, validateMovementPathV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import { parseGameStateV7 } from "./state-schema";
import { wailResultEntriesV7, wailTargetsV7 } from "./wail";
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
  | "RAISE_DEAD_NOT_LEGAL"
  | "DEVOUR_NOT_LEGAL"
  | "PROMOTION_NOT_ELIGIBLE"
  | "UNIT_ALREADY_HANDLED"
  | "PILLAGE_INVALID_TARGET"
  | "WAIL_NOT_LEGAL"
  | "KABOOM_NOT_LEGAL"
  | "DISBAND_NOT_LEGAL"
  // Revision 19: an illegal Stampede (`MOVED`, `EMBARKED`, `NOT_IN_LANE`,
  // `LANE_BLOCKED`), an illegal Hatch (`EMBARKED`, `NO_EGG`,
  // `LAID_THIS_TURN`), and a unit command other than Disband naming an Egg.
  | "STAMPEDE_NOT_LEGAL"
  | "HATCH_NOT_LEGAL"
  | "UNIT_IS_EGG";
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
let strictInputValidationCountV7 = 0;
let certifiedInputReuseCountV7 = 0;
let checkedOutputValidationCountV7 = 0;

export interface ReducerValidationDiagnosticsV7 {
  readonly strictInputs: number;
  readonly certifiedInputs: number;
  readonly checkedOutputs: number;
}

/** Deterministic counters for the command-processing benchmark. */
export function reducerValidationDiagnosticsV7(): ReducerValidationDiagnosticsV7 {
  return {
    strictInputs: strictInputValidationCountV7,
    certifiedInputs: certifiedInputReuseCountV7,
    checkedOutputs: checkedOutputValidationCountV7,
  };
}

export function resetReducerValidationDiagnosticsV7(): void {
  strictInputValidationCountV7 = 0;
  certifiedInputReuseCountV7 = 0;
  checkedOutputValidationCountV7 = 0;
}

/**
 * Reports only states returned by this reducer at a completed accepted
 * boundary. Certificates are identity-bound and cannot be supplied by a
 * caller, so parsed external values continue through the strict parser.
 */
export function isAcceptedStateCertificateV7(state: GameStateV7): boolean {
  return hasAcceptedStateCertificateV7(state);
}

export function createPlayableGameV7(
  setup: MatchSetupV7,
): CreatePlayableGameResultV7 {
  return createPlayableGameFromMapStateV7(createInitialMapStateV7(setup));
}

/**
 * Starts the first turn on an already generated initial map state; used by
 * {@link createPlayableGameV7} and, for parity fixtures, with a map from
 * `createInitialMapStateWithVillageCountV7`.
 */
export function createPlayableGameFromMapStateV7(
  created: CreateInitialMapStateResultV7,
): CreatePlayableGameResultV7 {
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
  const naval = navalFactsMayChangeV7(input)
    ? navalTransitionEventsV7(stateInput, result.state)
    : [];
  // Revision 14 section 3.5: a Lich that left the board cures its Plague.
  const cleared = plagueClearedEventsV7(stateInput, result.state);
  if (!navalFactsMayChangeV7(input) && cleared.length === 0) return result;
  return {
    ...result,
    events: [...result.events, ...naval, ...cleared],
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
    "WAIL",
    // Revision 17 section 6.7: an exploding blockader lifts its blockade, and
    // END_TURN reports blockades lifted by Start Turn Plague and chains.
    "KABOOM",
    // Revision 19 section 7.4: a death-blast chain a Stampede sets off can
    // kill a blockader.
    "STAMPEDE",
    "END_TURN",
  ].includes(command.kind);
}

function applyCommandCoreV7(
  stateInput: GameStateV7,
  actor: PlayerId,
  input: CommandV7,
): ApplyCommandResultV7 {
  const certified = hasAcceptedStateCertificateV7(stateInput);
  if (certified) certifiedInputReuseCountV7 += 1;
  else strictInputValidationCountV7 += 1;
  const state = certified ? stateInput : parseGameStateV7(stateInput);
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
  // Revision 19 section 6.2: no unit command is legal for an Egg except
  // Disband. Unknown, dead, and foreign units keep the ordinary unit errors.
  if ("unitId" in command && command.kind !== "DISBAND") {
    const named = state.units.find(
      (unit) => unit.id === command.unitId && unit.hp > 0,
    );
    if (named !== undefined && named.ownerId === actor && named.form === "EGG")
      return rejected(stateInput, "UNIT_IS_EGG", { unitId: named.id });
  }
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
  if (command.kind === "RAISE_DEAD")
    return applyRaiseDead(stateInput, state, actor, command.unitId);
  if (command.kind === "DEVOUR")
    return applyDevour(stateInput, state, actor, command.unitId);
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
  if (command.kind === "WAIL")
    return applyWail(stateInput, state, actor, command.unitId);
  if (command.kind === "KABOOM")
    return applyKaboom(stateInput, state, actor, command.unitId);
  if (command.kind === "LAND_GRANT")
    return applyLandGrant(stateInput, state, actor, command.cityId);
  if (command.kind === "END_TURN")
    return applyEndTurn(stateInput, state, actor);
  if (command.kind === "LAY_EGG")
    return applyLayEgg(stateInput, state, actor, command);
  if (command.kind === "HATCH")
    return applyHatch(stateInput, state, actor, command);
  if (command.kind === "STAMPEDE")
    return applyStampede(stateInput, state, actor, command);
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
    const cost = playerTechnologyResearchCostV7(
      node.tier,
      cityCount,
      player.researchedTechs.length,
    );
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
    // Harvests consume their resource; Farm and Mine keep it underneath.
    const board = replaceTile(state, command.at, {
      ...tile,
      resource: rule.improvement === null ? null : tile.resource,
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
    observedResourceV7(player, tile) !== null ||
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
        ? marketCoinsV7(evaluation.marketIncome)
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
    observedResourceV7(player, tile) !== null ||
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
    observedResourceV7(player, tile) === null &&
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
    const resourceRestored =
      removed === null ? null : reexposedResourceV7(tile.resource, removed);
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
      // Redevelop leaves the kept resource in place. Replant is a terrain
      // transform, not an improvement: it drops masked Fertile Ground that
      // cannot exist on Forest (visible resources block it).
      resource:
        command.kind === "REDEVELOP"
          ? tile.resource
          : command.kind === "CULTIVATE_FOREST"
            ? "FERTILE_GROUND"
            : command.kind === "REPLANT_FOREST"
              ? null
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
  const rule = effectiveRoleRuleV7(command.role, player.faction);
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
  // Revision 19 section 5.1: used slots plus the role's slots must fit.
  if (
    assignedUnitCountV7(state, city.id) +
      unitCapacitySlotsV7(state, { ownerId: actor, role: command.role }) >
    cityUnitCapacityV7(state, city)
  )
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
    // Revision 16: landing spends one of the embarked unit's two points.
    embarkedMovementSpentV7(unit.activation) > EMBARKED_LANDING_MAX_SPENT_V7 ||
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
            // Revisions 6 and 16 (`pulp_wars-0ao.15`): landing ends the
            // activation for every faction, like embarking: no further Move,
            // primary action (Attack, Kaboom, Recover, specials), Pillage,
            // Field Defense, or Disband this turn. The water path length is
            // kept (embarked units are never Tended or Inspired).
            activation: {
              ...exhaustedActivation(),
              movedPathLength: candidate.activation.movedPathLength,
            },
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
  const rule = effectiveRoleRuleV7(command.role, player.faction);
  if (command.role === "PATROL_BOAT" || command.role === "BATTLESHIP")
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  // Revision 19 section 6.3: an egg-laid role is never trained; its owner
  // lays it with `LAY_EGG`.
  if (rule.cost === null || isEggLaidRoleV7(command.role, player.faction))
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  if (
    rule.technology !== null &&
    !player.researchedTechs.includes(rule.technology)
  )
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (state.units.some((unit) => unit.hp > 0 && same(unit.at, city.at)))
    return rejected(original, "CITY_SPAWN_OCCUPIED", { cityId: city.id });
  // Revision 19 section 5.1: used slots plus the role's slots must fit (a
  // 2-slot Dinosaur role needs two free slots).
  if (
    assignedUnitCountV7(state, city.id) +
      unitCapacitySlotsV7(state, { ownerId: actor, role: command.role }) >
    cityUnitCapacityV7(state, city)
  )
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

/**
 * Revision 19 `LAY_EGG` (section 6.3): a city action that lays an Egg of an
 * egg-laid role on a nest tile of the city. The legality checks run in the
 * section's fixed order; the first failure is the (atomic) rejection.
 */
function applyLayEgg(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "LAY_EGG" }>,
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
  const rule = effectiveRoleRuleV7(command.role, player.faction);
  const turnsRemaining = laidEggTurnsV7(
    command.role,
    player.researchedTechs,
    player.faction,
  );
  if (turnsRemaining === null || rule.cost === null)
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  if (
    rule.technology !== null &&
    !player.researchedTechs.includes(rule.technology)
  )
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (tileAtV7(state.board, command.at) === undefined)
    return rejected(original, "TILE_NOT_FOUND");
  if (!isNestTileV7(state, city, command.at))
    return rejected(original, "INVALID_TILE", { action: "LAY_EGG" });
  if (
    assignedUnitCountV7(state, city.id) +
      unitCapacitySlotsV7(state, { ownerId: actor, role: command.role }) >
    cityUnitCapacityV7(state, city)
  )
    return rejected(original, "CITY_CAPACITY_FULL", { cityId: city.id });
  // Arms Industry exactly as for land training; never the Shipyard discount.
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
    const hp = laidEggHpV7(player.researchedTechs, player.faction);
    const egg: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: city.id,
      role: command.role,
      form: "EGG",
      at: { x: command.at.x, y: command.at.y },
      hp,
      maxHp: hp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: eggActivationV7(),
    };
    // Laying reveals nothing, draws no PRNG value, and changes no economy.
    const staged: GameStateV7 = {
      ...state,
      nextEntityId: allocation.nextEntityId,
      commandIndex: nextSafe(state.commandIndex),
      players: debit(state.players, actor, cost),
      cities: state.cities.map((candidate) =>
        candidate.id === city.id
          ? { ...candidate, cityActionAvailable: false }
          : candidate,
      ),
      units: [...state.units, egg],
      eggs: withEggV7(state.eggs, {
        unitId: egg.id,
        turnsRemaining,
        laidThisTurn: true,
      }),
    };
    const achievements = evaluateAchievementsV7(staged, actor);
    return accepted(checked(achievements.state), [
      {
        kind: "EGG_LAID",
        playerId: actor,
        cityId: city.id,
        unitId: egg.id,
        role: egg.role,
        cost,
        at: egg.at,
        hp,
        turnsRemaining,
      },
      ...achievements.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

/**
 * Revision 19 Shaman `HATCH` (section 6.5): a primary action that hatches an
 * adjacent own Egg laid on an earlier turn at once; the hatchling is
 * exhausted for the rest of the turn.
 */
function applyHatch(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "HATCH" }>,
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const shaman = actorCheck.unit;
  const rule = unitRoleRuleV7(state, shaman);
  if (!rule.abilities.includes("HATCH"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: shaman.role });
  if (
    shaman.activation.overrunActive ||
    primaryUsed(shaman) ||
    (shaman.activation.moved && !rule.mayUsePrimaryActionAfterMove)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: shaman.id });
  if (shaman.form !== "LAND")
    return rejected(original, "HATCH_NOT_LEGAL", { reason: "EMBARKED" });
  const egg = state.units.find(
    (unit) =>
      unit.id === command.eggUnitId &&
      unit.hp > 0 &&
      unit.ownerId === actor &&
      unit.form === "EGG" &&
      chebyshev(unit.at, shaman.at) === 1,
  );
  const entry =
    egg === undefined
      ? undefined
      : state.eggs.find((candidate) => candidate.unitId === egg.id);
  if (egg === undefined || entry === undefined)
    return rejected(original, "HATCH_NOT_LEGAL", { reason: "NO_EGG" });
  if (entry.laidThisTurn)
    return rejected(original, "HATCH_NOT_LEGAL", { reason: "LAID_THIS_TURN" });
  try {
    const events: DomainEventV7[] = [];
    const hatched = hatchEggV7(
      state,
      egg.id,
      exhaustedActivation(),
      "SHAMAN",
      shaman.id,
      events,
    );
    if (hatched.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: uniqueCoords(hatched.revealed),
      });
    const staged = graveActionTail(
      {
        ...hatched.state,
        commandIndex: nextSafe(state.commandIndex),
        units: hatched.state.units.map((unit) =>
          unit.id === shaman.id
            ? {
                ...unit,
                activation: {
                  ...unit.activation,
                  specialActed: true,
                  handled: true,
                },
              }
            : unit,
        ),
      },
      actor,
      events,
    );
    return accepted(checked(staged), events);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

/**
 * Revision 19 `STAMPEDE` (section 7): a Triceratops that has not moved runs
 * one or two tiles along an open lane and hits the unit at its end, harder
 * the longer it ran, without retaliation. A survivor is pushed back and the
 * Triceratops follows; after a kill it advances. Every fact it reads is
 * explored by the actor, so it resolves completely or is rejected atomically.
 */
function applyStampede(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "STAMPEDE" }>,
): ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const attacker = actorCheck.unit;
  const rule = unitRoleRuleV7(state, attacker);
  if (!rule.abilities.includes("STAMPEDE"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: attacker.role });
  // A unit that moved or landed this turn reports `MOVED` (landing ends the
  // activation, so its primary action also reads as used).
  if (attacker.activation.moved)
    return rejected(original, "STAMPEDE_NOT_LEGAL", { reason: "MOVED" });
  if (primaryUsed(attacker) || attacker.activation.overrunActive)
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: attacker.id });
  if (attacker.form !== "LAND")
    return rejected(original, "STAMPEDE_NOT_LEGAL", { reason: "EMBARKED" });
  const target = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  if (target === undefined || !isUnitVisibleToPlayerV7(state, actor, target))
    return rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (
    target.ownerId === actor ||
    arePlayersAlliedV7(state, actor, target.ownerId)
  )
    return rejected(original, "TARGET_ALLIED");
  if (!isStampedeTargetFormV7(target.form))
    return rejected(original, "STAMPEDE_NOT_LEGAL", { reason: "NOT_IN_LANE" });
  const lane = stampedeLaneV7(
    stateStampedeFactsV7(state, actor),
    actor,
    attacker.at,
    target.at,
  );
  if (!lane.ok)
    return rejected(original, "STAMPEDE_NOT_LEGAL", { reason: lane.reason });
  try {
    const player = requirePlayer(state, actor);
    // 1. Run: reveal sight from every lane tile, as a Move does.
    let players = state.players;
    const actorRevealed: CoordV7[] = [];
    for (const step of lane.lane) {
      const sight = revealRadius(
        { ...state, players } as GameStateV7,
        actor,
        step,
        unitSightRadiusAtV7(state, attacker, tileAtV7(state.board, step)),
      );
      players = setExplored(players, actor, sight.explored);
      actorRevealed.push(...sight.revealed);
    }
    const standTile = tileAtV7(state.board, lane.standAt);
    const targetTile = tileAtV7(state.board, target.at);
    if (standTile === undefined || targetTile === undefined)
      throw new RangeError("INVALID_STATE");
    const standOwner = state.cities.find(
      (city) => city.id === standTile.territoryCityId,
    )?.ownerId;
    const standDefenseLost =
      standTile.fieldDefense &&
      standOwner !== undefined &&
      standOwner !== actor &&
      arePlayersHostileV7(state, actor, standOwner);
    // 2. Hit, from the stand tile. The Push is decided on the tiles the
    // actor had explored before the run, so the public preview is exact.
    const standing: UnitStateV7 = { ...attacker, at: lane.standAt };
    const ranState: GameStateV7 = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === attacker.id ? standing : unit,
      ),
    };
    const calculated = calculateCombatPreviewV7(
      ranState,
      attacker.id,
      target.id,
      { runTiles: lane.runTiles },
    );
    const canAdvance =
      calculated.advances &&
      (targetTile.terrain !== "MOUNTAIN" ||
        player.researchedTechs.includes("ENGINEERING"));
    const preview =
      canAdvance === calculated.advances
        ? calculated
        : { ...calculated, advances: canAdvance };
    const pushDestination =
      preview.push === "WILL_PUSH"
        ? pushedDestinationV7(ranState, standing, target)
        : null;
    const attackerKills = attacker.kills + (preview.defenderDies ? 1 : 0);
    if (!Number.isSafeInteger(attackerKills))
      throw new RangeError("INTEGER_OVERFLOW");
    const endsAt = preview.advances ? target.at : lane.standAt;
    let attackerAfter: UnitStateV7 = {
      ...attacker,
      at: endsAt,
      hp: attacker.hp - preview.damageToAttacker + preview.attackerHeal,
      kills: attackerKills,
      captureEligible: false,
      activation: {
        ...attacker.activation,
        moved: true,
        movedPathLength: lane.lane.length,
        attacked: true,
        attacksUsed: 1,
        inspired: false,
        overrunActive: false,
        escapeAvailable: false,
        handled: true,
      },
    };
    const defenderAfter: UnitStateV7 = {
      ...target,
      at: pushDestination ?? target.at,
      hp: target.hp - preview.damageToDefender + preview.defenderHeal,
      captureEligible:
        pushDestination === null ? target.captureEligible : false,
    };
    const growthEvents: DomainEventV7[] = [];
    attackerAfter = grownUnitV7(
      state,
      attacker.kills,
      attackerAfter,
      growthEvents,
    );
    let units = state.units
      .map((unit) =>
        unit.id === attacker.id
          ? attackerAfter
          : unit.id === target.id
            ? defenderAfter
            : unit,
      )
      .filter((unit) => unit.hp > 0);
    // 4. Field Defense on the target tile falls, whoever owns the tile and
    // whether or not the target survives.
    let board = state.board;
    if (standDefenseLost || targetTile.fieldDefense)
      board = {
        ...board,
        tiles: board.tiles.map((tile) =>
          (standDefenseLost && same(tile.at, lane.standAt)) ||
          (targetTile.fieldDefense && same(tile.at, target.at))
            ? { ...tile, fieldDefense: false }
            : tile,
        ),
      };
    const events: DomainEventV7[] = [
      { kind: "UNIT_MOVED", unitId: attacker.id, path: lane.lane },
    ];
    if (standDefenseLost)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: lane.standAt,
        reason: "OCCUPATION",
      });
    events.push({ kind: "COMBAT_RESOLVED", preview });
    if (targetTile.fieldDefense)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: target.at,
        reason: "CATAPULT",
      });
    // 5. Kill: the death, then its Grave or Bitten rising.
    let graves = state.graves;
    let nextEntityId = state.nextEntityId;
    const risings: UnitStateV7[] = [];
    if (preview.defenderDies) {
      const bite = biteOfV7(state, target.id);
      if (bite === undefined || target.form !== "LAND")
        graves = recordCombatDeathV7(state, graves, target, "ATTACK", events);
      else {
        const allocation = allocateUnitId(nextEntityId);
        nextEntityId = allocation.nextEntityId;
        const rising = recordBittenRisingV7(
          state,
          bite,
          target,
          "ATTACK",
          allocation.id,
          exhaustedActivation(),
          events,
        );
        risings.push(rising);
        units = [...units, rising];
      }
    }
    events.push(...growthEvents);
    // 6 and 7. Push, then the one-tile advance or follow.
    if (pushDestination !== null)
      events.push({
        kind: "UNIT_PUSHED",
        sourceUnitId: attacker.id,
        targetUnitId: target.id,
        from: target.at,
        to: pushDestination,
      });
    if (preview.advances)
      events.push({
        kind: "UNIT_MOVED",
        unitId: attacker.id,
        path: [target.at],
      });
    // 9. The death blast of a killed exploding target, after the advance.
    const chain = resolveStateExplosionChainV7(
      state,
      { units, board, graves, nextEntityId, bitten: state.bitten },
      preview.defenderDies && isExplodingUnitV7(state, target)
        ? [{ unit: target, cause: "DEATH" as const }]
        : [],
      events,
    );
    units = [...chain.units];
    board = chain.board;
    graves = chain.graves;
    nextEntityId = chain.nextEntityId;
    risings.push(...chain.risings);
    const plunder = plunderAwardsV7(state, players, [
      ...(preview.defenderDies
        ? [{ creditedId: actor, victimOwnerId: target.ownerId }]
        : []),
      ...chain.credits,
    ]);
    events.push(...plunder.events);
    players = plunder.players;
    // Reveals: the run and the Triceratops's final tile, then a pushed
    // target's new tile, then every rising.
    const finalReveal = revealRadius(
      { ...state, board, players, units } as GameStateV7,
      actor,
      endsAt,
      unitSightRadiusAtV7(
        { ...state, board, players, units } as GameStateV7,
        attackerAfter,
      ),
    );
    players = setExplored(players, actor, finalReveal.explored);
    actorRevealed.push(...finalReveal.revealed);
    if (actorRevealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: uniqueCoords(actorRevealed),
      });
    if (pushDestination !== null) {
      const pushedState = { ...state, board, players, units } as GameStateV7;
      const reveal = revealRadius(
        pushedState,
        target.ownerId,
        pushDestination,
        unitSightRadiusAtV7(pushedState, defenderAfter),
      );
      players = setExplored(players, target.ownerId, reveal.explored);
      if (reveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: target.ownerId,
          tiles: reveal.revealed,
        });
    }
    for (const risen of risings) {
      const risenState = { ...state, board, players, units } as GameStateV7;
      const reveal = revealRadius(
        risenState,
        risen.ownerId,
        risen.at,
        unitSightRadiusAtV7(risenState, risen),
      );
      players = setExplored(players, risen.ownerId, reveal.explored);
      if (reveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: risen.ownerId,
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
        nextEntityId,
        players,
        cities: economy.cities,
        units,
        graves,
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
      // Revision 13: MILITIA and JUGGERNAUT grant the owner's faction unit.
      const rule = effectiveRoleRuleV7(
        unitRole,
        requirePlayer(state, actor).faction,
      );
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
      // Revision 17 section 8.9: a Goblin Militia is two Goblins. The second
      // appears on the first adjacent cell in (y, x) order that the ordinary
      // reward displacement rule allows, or is not created.
      const militiaSize =
        command.reward === "MILITIA"
          ? MILITIA_FIGHTERS_V7[requirePlayer(state, actor).faction]
          : 1;
      const secondAt =
        militiaSize === 2
          ? rewardDisplacementCellV7(
              { ...state, players, cities, units },
              actor,
              city.at,
            )
          : null;
      if (secondAt !== null) {
        const second = allocateUnitId(nextEntityId);
        nextEntityId = second.nextEntityId;
        const companion: UnitStateV7 = {
          ...created,
          id: second.id,
          at: secondAt,
        };
        units = [...units, companion];
        events.push({
          kind: "UNIT_REWARD_GRANTED",
          playerId: actor,
          cityId: city.id,
          reachedLevel: command.reachedLevel,
          unitId: companion.id,
          role: unitRole,
        });
        const sightState = { ...state, players, units } as GameStateV7;
        const reveal = revealRadius(
          sightState,
          actor,
          companion.at,
          unitSightRadiusAtV7(sightState, companion),
        );
        players = setExplored(players, actor, reveal.explored);
        if (reveal.revealed.length > 0)
          events.push({
            kind: "TILES_REVEALED",
            playerId: actor,
            tiles: reveal.revealed,
          });
      }
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
  const escaping = unit.activation.escapeAvailable;
  if (!escaping && (unit.activation.moved || primaryUsed(unit))) {
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
              : escaping
                ? {
                    // Escape uses a fresh full Move budget but never grants or
                    // refreshes Charge: the pre-attack path length is kept.
                    ...candidate.activation,
                    moved: true,
                    escapeAvailable: false,
                    handled: true,
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
  // Revision 19 section 9.8: the treasure unit's role is a faction rule
  // (`KNIGHT`; `RAIDER`, the Raptor, for a Dinosaur seat). The serialized
  // reward literal stays `KNIGHT` for every faction.
  const treasureRole = factionRulesV7(
    requirePlayer(state, actor).faction,
  ).treasureUnitRole;
  const placement =
    requestedReward === "KNIGHT"
      ? treasureKnightPlacement(state, actor, mover, at, treasureRole)
      : null;
  if (placement !== null) {
    const allocation = allocateUnitId(state.nextEntityId);
    // Revision 13: the treasure unit is the actor's faction unit.
    const rule = effectiveRoleRuleV7(
      treasureRole,
      requirePlayer(state, actor).faction,
    );
    const spawnedUnit: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: placement.homeCityId,
      role: treasureRole,
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
  role: UnitStateV7["role"],
): { readonly at: CoordV7; readonly homeCityId: CityStateV7["id"] } | null {
  // Revision 19 section 5.1: the home city needs the treasure unit's slots.
  const slots = unitCapacitySlotsV7(state, { ownerId: actor, role });
  const cities = state.cities
    .filter(
      (city) =>
        city.ownerId === actor &&
        assignedUnitCountV7(state, city.id) + slots <=
          cityUnitCapacityV7(state, city),
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
  const rule = unitRoleRuleV7(state, attacker);
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
    // Revision 17 section 6.8: splash kills of own or allied units (the
    // Bomb Chucker's friendly fire) earn no promotion credit.
    const attackerKills =
      attacker.kills +
      (preview.defenderDies ? 1 : 0) +
      preview.splash.filter(
        (entry) =>
          entry.dies &&
          arePlayersHostileV7(
            state,
            actor,
            requireValue(state.units.find((unit) => unit.id === entry.unitId))
              .ownerId,
          ),
      ).length;
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
      // Revision 13 Lifesteal heals after both damages (0 unless a Vampire).
      hp: attacker.hp - preview.damageToAttacker + preview.attackerHeal,
      kills: attackerKills,
      captureEligible: false,
      activation: {
        ...attacker.activation,
        attacked: true,
        attacksUsed,
        inspired: false,
        overrunActive: false,
        escapeAvailable: preview.escapeAvailable,
        handled: !preview.escapeAvailable,
      },
    };
    let defenderAfter: UnitStateV7 = {
      ...defender,
      at: pushDestination ?? defender.at,
      hp: defender.hp - preview.damageToDefender + preview.defenderHeal,
      kills: defenderKills,
      captureEligible:
        pushDestination === null ? defender.captureEligible : false,
    };
    // Revision 19 Grow (section 5.2): a surviving Dinosaur unit grows at the
    // moment its kill is credited, after the exchange's damage and Lifesteal
    // and before the advance, the Push, and any chain reaction.
    const growthEvents: DomainEventV7[] = [];
    if (!preview.attackerDies)
      attackerAfter = grownUnitV7(
        state,
        attacker.kills,
        attackerAfter,
        growthEvents,
      );
    if (!preview.defenderDies)
      defenderAfter = grownUnitV7(
        state,
        defender.kills,
        defenderAfter,
        growthEvents,
      );
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
    let board =
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
    // Revision 17 section 6.7: COMBAT_RESOLVED states the Overrun (Ram)
    // continuation evaluated after any chain, so it is inserted below.
    const events: DomainEventV7[] = [];
    if (defenseReason !== null)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: defender.at,
        reason: defenseReason,
      });
    // Revision 13 section 6.8 step 7: each death in order (defender, splash
    // in (y, x, id) order, attacker) becomes an Infect rising when a Zombie
    // killed a land-form victim, or may otherwise leave a Grave on its death
    // tile before the attacker advances onto it.
    let graves = state.graves;
    let nextEntityId = state.nextEntityId;
    const risings: UnitStateV7[] = [];
    const infect = (
      source: UnitStateV7,
      victim: UnitStateV7,
      cause: "ATTACK" | "RETALIATION",
    ): void => {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordInfectionV7(
        state,
        source,
        victim,
        cause,
        allocation.id,
        exhaustedActivation(),
        events,
      );
      risings.push(rising);
      units = [...units, rising];
    };
    // Revision 14 section 4.3: a bitten land-form victim that Infect did not
    // convert rises as its biter's Zombie instead of leaving a Grave.
    const died = (
      victim: UnitStateV7,
      cause: "ATTACK" | "SPLASH" | "RETALIATION",
    ): void => {
      const bite = biteOfV7(state, victim.id);
      if (bite === undefined || victim.form !== "LAND") {
        graves = recordCombatDeathV7(state, graves, victim, cause, events);
        return;
      }
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordBittenRisingV7(
        state,
        bite,
        victim,
        cause,
        allocation.id,
        exhaustedActivation(),
        events,
      );
      risings.push(rising);
      units = [...units, rising];
    };
    if (preview.defenderInfected) infect(attacker, defender, "ATTACK");
    else if (preview.defenderDies) died(defender, "ATTACK");
    for (const splash of preview.splash)
      if (splash.dies)
        died(
          requireValue(state.units.find((unit) => unit.id === splash.unitId)),
          "SPLASH",
        );
    if (preview.attackerInfected) infect(defender, attacker, "RETALIATION");
    else if (preview.attackerDies) died(attacker, "RETALIATION");
    // Revision 14 sections 3.1 and 4.1: Plague and bites on the survivors.
    const plagued = withPlaguedV7(
      state.plagued,
      preview.plagued.map((unitId) => ({ unitId, sourceUnitId: attacker.id })),
    );
    let bitten = state.bitten;
    if (preview.defenderBitten)
      bitten = withBittenV7(bitten, {
        unitId: defender.id,
        biterPlayerId: attacker.ownerId,
        biterUnitId: attacker.id,
      });
    if (preview.attackerBitten)
      bitten = withBittenV7(bitten, {
        unitId: attacker.id,
        biterPlayerId: defender.ownerId,
        biterUnitId: defender.id,
      });
    events.push(...growthEvents);
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
    // Revision 17 section 6.7: the exploding units among the defender, the
    // splash victims, and the attacker explode after the attack's deaths,
    // risings, advance, and Push; Overrun (Ram) is evaluated afterwards.
    const initialExplosions: {
      readonly unit: UnitStateV7;
      readonly cause: ExplosionCauseV7;
    }[] = [];
    if (preview.defenderDies && isExplodingUnitV7(state, defender))
      initialExplosions.push({ unit: defender, cause: "DEATH" });
    for (const splash of preview.splash) {
      const victim = requireValue(
        state.units.find((unit) => unit.id === splash.unitId),
      );
      if (splash.dies && isExplodingUnitV7(state, victim))
        initialExplosions.push({ unit: victim, cause: "DEATH" });
    }
    if (preview.attackerDies && isExplodingUnitV7(state, attacker))
      initialExplosions.push({ unit: attacker, cause: "DEATH" });
    const chain = resolveStateExplosionChainV7(
      state,
      { units, board, graves, nextEntityId, bitten },
      initialExplosions,
      events,
    );
    units = [...chain.units];
    board = chain.board;
    graves = chain.graves;
    nextEntityId = chain.nextEntityId;
    risings.push(...chain.risings);
    const survivor = units.find((unit) => unit.id === attacker.id);
    const afterChainState = {
      ...visibleState,
      board,
      units,
    } as GameStateV7;
    const overrunContinues =
      rule.abilities.includes("OVERRUN") &&
      preview.advances &&
      !preview.attackerDies &&
      survivor !== undefined &&
      units.some(
        (candidate) =>
          candidate.id !== attacker.id &&
          candidate.hp > 0 &&
          arePlayersHostileV7(state, actor, candidate.ownerId) &&
          chebyshev(defender.at, candidate.at) === 1 &&
          isUnitVisibleToPlayerV7(afterChainState, actor, candidate),
      );
    if (overrunContinues && survivor !== undefined) {
      attackerAfter = {
        ...survivor,
        activation: {
          ...survivor.activation,
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
      overrunAdvance: rule.abilities.includes("OVERRUN") && preview.advances,
      overrunContinues,
    };
    events.unshift({ kind: "COMBAT_RESOLVED", preview: finalPreview });
    // Revision 17 Plunder (sections 6.8 and 7.4): the attacker's owner is
    // credited with the defender and splash deaths, the defender's owner with
    // a retaliation death, and each exploding unit's owner with its blast's
    // deaths; a victim that rises still counts as killed.
    const plunder = plunderAwardsV7(state, visiblePlayers, [
      ...(preview.defenderDies
        ? [{ creditedId: attacker.ownerId, victimOwnerId: defender.ownerId }]
        : []),
      ...preview.splash.flatMap((entry) =>
        entry.dies
          ? [
              {
                creditedId: attacker.ownerId,
                victimOwnerId: requireValue(
                  state.units.find((unit) => unit.id === entry.unitId),
                ).ownerId,
              },
            ]
          : [],
      ),
      ...(preview.attackerDies
        ? [{ creditedId: defender.ownerId, victimOwnerId: attacker.ownerId }]
        : []),
      ...chain.credits,
    ]);
    events.push(...plunder.events);
    let players = plunder.players;
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
    for (const risen of risings) {
      // Revision 13 section 5.4: a rising reveals its sight for its owner.
      const risenState = { ...state, board, players, units } as GameStateV7;
      const reveal = revealRadius(
        risenState,
        risen.ownerId,
        risen.at,
        unitSightRadiusAtV7(risenState, risen),
      );
      players = setExplored(players, risen.ownerId, reveal.explored);
      if (reveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: risen.ownerId,
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
        nextEntityId,
        players,
        cities: economy.cities,
        units,
        graves,
        plagued,
        bitten,
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
  const rule = unitRoleRuleV7(state, captain);
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
  // Revision 13 Frenzy eligibility: Rally targets also need ATTACK, which
  // every Human non-support, non-siege land role has. Revision 17 WAAAGH!
  // reaches radius 2 and includes support and siege roles.
  const targets = state.units
    .filter((unit) => isRallyTargetV7(state, result.captain, unit))
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
  // Revision 14 section 5: Tend Wounded also cures Plague and Bitten, so a
  // plagued or bitten unit is a target even at full HP.
  const plaguedIds = new Set(state.plagued.map((entry) => entry.unitId));
  const bittenIds = new Set(state.bitten.map((entry) => entry.unitId));
  const targets = state.units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.ownerId === actor &&
        unit.form === "LAND" &&
        unit.id !== result.captain.id &&
        (unit.hp < unit.maxHp ||
          plaguedIds.has(unit.id) ||
          bittenIds.has(unit.id)) &&
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
      plagued: state.plagued.filter((entry) => !amounts.has(entry.unitId)),
      bitten: state.bitten.filter((entry) => !amounts.has(entry.unitId)),
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
          curedPlague: plaguedIds.has(unit.id),
          curedBitten: bittenIds.has(unit.id),
        })),
      },
    ],
  );
}

/**
 * Revision 13 Grave-action legality shared by Raise Dead and Devour: the
 * actor's own living land unit with the ability that has not used its
 * primary action (it may have moved).
 */
function graveActionActor(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
  ability: "RAISE_DEAD" | "DEVOUR",
): { readonly unit: UnitStateV7 } | ApplyCommandResultV7 {
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const unit = actorCheck.unit;
  const rule = unitRoleRuleV7(state, unit);
  if (unit.form !== "LAND" || !rule.abilities.includes(ability))
    return rejected(original, "UNIT_ROLE_INVALID", { role: unit.role });
  if (
    unit.activation.overrunActive ||
    primaryUsed(unit) ||
    (unit.activation.moved && !rule.mayUsePrimaryActionAfterMove)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  return { unit };
}

/**
 * Economy, reward-settlement, and achievement tail of a Grave action. Risings
 * count for Muster; Graves and HP never change the live economy.
 */
function graveActionTail(
  staged: GameStateV7,
  actor: PlayerId,
  events: DomainEventV7[],
): GameStateV7 {
  const economy = recomputeLiveEconomyV7(
    staged,
    { board: staged.board, cities: staged.cities, units: staged.units },
    staged.populationContributions,
  );
  events.push(...economyAndGrowth(economy.changes));
  const settlement = settleCityRewardsV7(
    {
      ...staged,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    },
    actor,
  );
  events.push(...settlement.events);
  const achievements = evaluateAchievementsV7(settlement.state, actor);
  events.push(...achievements.events);
  return achievements.state;
}

/**
 * Revision 13 Raise Dead (section 6.2): every eligible adjacent Grave becomes
 * an exhausted 5-HP Skeleton rising homed to the Necromancer's home city, in
 * (y, x) order with consecutive unit IDs; capacity may be exceeded.
 */
function applyRaiseDead(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const result = graveActionActor(original, state, actor, unitId, "RAISE_DEAD");
  if ("accepted" in result) return result;
  const necromancer = result.unit;
  const graves = raiseDeadGravesV7(state.graves, state.units, necromancer.at);
  if (graves.length === 0)
    return rejected(original, "RAISE_DEAD_NOT_LEGAL", { reason: "NO_GRAVE" });
  try {
    const rule = effectiveRoleRuleV7(
      "FIGHTER",
      requirePlayer(state, actor).faction,
    );
    let nextEntityId = state.nextEntityId;
    const risen: UnitStateV7[] = [];
    for (const at of graves) {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      risen.push({
        id: allocation.id,
        ownerId: actor,
        homeCityId: necromancer.homeCityId,
        role: "FIGHTER",
        form: "LAND",
        at: { x: at.x, y: at.y },
        hp: Math.min(RAISE_DEAD_SKELETON_HP_V7, rule.maxHp),
        maxHp: rule.maxHp,
        kills: 0,
        veteran: false,
        captureEligible: false,
        activation: exhaustedActivation(),
      });
    }
    const units = [
      ...state.units.map((unit) =>
        unit.id === necromancer.id
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                specialActed: true,
                handled: true,
              },
            }
          : unit,
      ),
      ...risen,
    ];
    let players = state.players;
    const revealed: CoordV7[] = [];
    for (const skeleton of risen) {
      const visibleState = { ...state, players, units } as GameStateV7;
      const reveal = revealRadius(
        visibleState,
        actor,
        skeleton.at,
        unitSightRadiusAtV7(visibleState, skeleton),
      );
      players = setExplored(players, actor, reveal.explored);
      revealed.push(...reveal.revealed);
    }
    const events: DomainEventV7[] = [
      {
        kind: "DEAD_RAISED",
        playerId: actor,
        unitId: necromancer.id,
        results: risen.map((unit) => ({ unitId: unit.id, at: unit.at })),
      },
    ];
    if (revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: uniqueCoords(revealed),
      });
    const staged = graveActionTail(
      {
        ...state,
        nextEntityId,
        commandIndex: nextSafe(state.commandIndex),
        players,
        units,
        graves: withoutGravesV7(state.graves, graves),
      },
      actor,
      events,
    );
    return accepted(checked(staged), events);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

/**
 * Revision 13 Devour (section 6.3): a Ghoul on a Grave consumes it and heals
 * to full; legal at full HP. Terminal: the primary action is spent and the
 * Ghoul is handled.
 */
function applyDevour(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  const result = graveActionActor(original, state, actor, unitId, "DEVOUR");
  if ("accepted" in result) return result;
  const ghoul = result.unit;
  if (!state.graves.some((grave) => same(grave, ghoul.at)))
    return rejected(original, "DEVOUR_NOT_LEGAL", { reason: "NO_GRAVE" });
  try {
    const events: DomainEventV7[] = [
      {
        kind: "GRAVE_DEVOURED",
        playerId: actor,
        unitId: ghoul.id,
        at: ghoul.at,
        amount: ghoul.maxHp - ghoul.hp,
        hpAfter: ghoul.maxHp,
      },
    ];
    const staged = graveActionTail(
      {
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        units: state.units.map((unit) =>
          unit.id === ghoul.id
            ? {
                ...unit,
                hp: unit.maxHp,
                activation: {
                  ...unit.activation,
                  specialActed: true,
                  handled: true,
                },
              }
            : unit,
        ),
        graves: withoutGravesV7(state.graves, [ghoul.at]),
      },
      actor,
      events,
    );
    return accepted(checked(staged), events);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
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
  if (restlessOutsideOwnTerritory(state, unit))
    return rejected(original, "RECOVER_NOT_LEGAL", { reason: "RESTLESS" });
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
  // Revision 19: a Dinosaur unit grows instead and is never promoted.
  if (
    unit.form === "EMBARKED" ||
    unit.veteran ||
    unit.kills < 3 ||
    unitGrowsV7(state, unit)
  )
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
                escapeAvailable: false,
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
    const resourceRestored = reexposedResourceV7(tile.resource, improvement);
    const board = replaceTile(state, tile.at, {
      ...tile,
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
    // Revision 17: Fighter and Guard roles, except the Goblin Goblin.
    !unitRoleMechanicsV7(state, unit).buildsFieldDefense ||
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
  // Revision 19 section 6.7: an own Egg may be abandoned with Disband, for
  // half the printed cost of the role inside, on any turn (an Egg has no
  // primary action to have used).
  const egg = actorCheck.unit.form === "EGG";
  if (actorCheck.unit.form !== "LAND" && !egg)
    return rejected(original, "UNIT_ROLE_INVALID", {
      role: actorCheck.unit.role,
    });
  const player = requirePlayer(state, actor);
  if (!player.researchedTechs.includes("ADMINISTRATION"))
    return rejected(original, "TECH_REQUIRED", { tech: "ADMINISTRATION" });
  const rule = unitRoleRuleV7(state, actorCheck.unit);
  if (rule.cost === null)
    return rejected(original, "UNIT_ROLE_INVALID", {
      role: actorCheck.unit.role,
    });
  if (!egg && primaryUsed(actorCheck.unit))
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  // Revision 14 sections 3.6 and 4.5: afflicted units cannot Disband.
  if (state.plagued.some((entry) => entry.unitId === unitId))
    return rejected(original, "DISBAND_NOT_LEGAL", { reason: "PLAGUED" });
  if (state.bitten.some((entry) => entry.unitId === unitId))
    return rejected(original, "DISBAND_NOT_LEGAL", { reason: "BITTEN" });
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
  const canCapture = unitRoleRuleV7(state, unit).abilities.includes("CAPTURE");
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
    // Revision 19 section 6.7: every Egg homed to a captured city is
    // destroyed at once (an uncredited removal: no kill, Plunder, or Grave).
    const lostEggs =
      formerOwner === null
        ? []
        : state.units
            .filter(
              (item) =>
                item.hp > 0 &&
                item.form === "EGG" &&
                item.homeCityId === captured.id,
            )
            .sort((a, b) => a.id - b.id);
    let units = state.units
      .filter((item) => !lostEggs.some((egg) => egg.id === item.id))
      .map((item) =>
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
      ...lostEggs.map((egg): DomainEventV7 => ({
        kind: "UNIT_DIED",
        unitId: egg.id,
        cause: "CITY_CAPTURED",
      })),
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
                escapeAvailable: false,
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
    // Revision 19 section 6.4: the hatch step runs after Plague and any
    // chain it started, and before Windmill healing.
    const started = startTurnEconomyV7(advanced, nextPlayer, false, (next) => {
      const plague = resolveStartTurnPlagueAndChainV7(next, nextPlayer.id);
      const hatch = resolveStartTurnHatchV7(plague.state, nextPlayer.id);
      return hatch.events.length === 0 && hatch.state === plague.state
        ? plague
        : { state: hatch.state, events: [...plague.events, ...hatch.events] };
    });
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

/**
 * Revision 13 section 6.6: a Banshee primary action that damages every
 * visible hostile living unit within Chebyshev 2 simultaneously, with no
 * retaliation, advance, Push, Infect, or Field Defense destruction.
 */
function applyWail(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const banshee = actorCheck.unit;
  const rule = unitRoleRuleV7(state, banshee);
  if (banshee.form !== "LAND" || !rule.abilities.includes("WAIL"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: banshee.role });
  if (
    primaryUsed(banshee) ||
    (banshee.activation.moved && !rule.mayUsePrimaryActionAfterMove)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  try {
    const targets = wailTargetsV7(state, banshee);
    if (targets.length === 0)
      return rejected(original, "WAIL_NOT_LEGAL", { reason: "NO_TARGET" });
    const kills = banshee.kills + targets.filter((entry) => entry.dies).length;
    if (!Number.isSafeInteger(kills)) throw new RangeError("INTEGER_OVERFLOW");
    const damage = new Map(
      targets.map((entry) => [entry.unitId, entry.damage] as const),
    );
    let units = state.units
      .map((unit) =>
        unit.id === banshee.id
          ? {
              ...unit,
              kills,
              activation: {
                ...unit.activation,
                specialActed: true,
                handled: true,
              },
            }
          : damage.has(unit.id)
            ? { ...unit, hp: unit.hp - (damage.get(unit.id) ?? 0) }
            : unit,
      )
      .filter((unit) => unit.hp > 0);
    const events: DomainEventV7[] = [
      {
        kind: "WAIL_RESOLVED",
        playerId: actor,
        unitId: banshee.id,
        at: { x: banshee.at.x, y: banshee.at.y },
        results: wailResultEntriesV7(targets),
      },
    ];
    let graves = state.graves;
    let nextEntityId = state.nextEntityId;
    const risings: UnitStateV7[] = [];
    for (const entry of targets) {
      if (!entry.dies) continue;
      const victim = requireValue(
        state.units.find((unit) => unit.id === entry.unitId),
      );
      // Revision 14 section 4.3: a bitten land-form victim rises instead.
      const bite = biteOfV7(state, victim.id);
      if (bite === undefined || victim.form !== "LAND") {
        graves = recordCombatDeathV7(state, graves, victim, "WAIL", events);
        continue;
      }
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordBittenRisingV7(
        state,
        bite,
        victim,
        "WAIL",
        allocation.id,
        exhaustedActivation(),
        events,
      );
      risings.push(rising);
      units = [...units, rising];
    }
    // Revision 17 section 6.7: Wail kills of exploding units set off a chain,
    // then its Plunder (never for the Undead Banshee's owner).
    const chain = resolveStateExplosionChainV7(
      state,
      {
        units,
        board: state.board,
        graves,
        nextEntityId,
        bitten: state.bitten,
      },
      targets.flatMap((entry) => {
        const victim = requireValue(
          state.units.find((unit) => unit.id === entry.unitId),
        );
        return entry.dies && isExplodingUnitV7(state, victim)
          ? [{ unit: victim, cause: "DEATH" as const }]
          : [];
      }),
      events,
    );
    units = [...chain.units];
    graves = chain.graves;
    nextEntityId = chain.nextEntityId;
    risings.push(...chain.risings);
    const plunder = plunderAwardsV7(state, state.players, chain.credits);
    events.push(...plunder.events);
    let players = plunder.players;
    for (const risen of risings) {
      const risenState = {
        ...state,
        board: chain.board,
        players,
        units,
      } as GameStateV7;
      const reveal = revealRadius(
        risenState,
        risen.ownerId,
        risen.at,
        unitSightRadiusAtV7(risenState, risen),
      );
      players = setExplored(players, risen.ownerId, reveal.explored);
      if (reveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: risen.ownerId,
          tiles: reveal.revealed,
        });
    }
    const economy = recomputeLiveEconomyV7(
      state,
      { board: chain.board, cities: state.cities, units },
      state.populationContributions,
    );
    events.push(...economyAndGrowth(economy.changes));
    const settlement = settleCityRewardsV7(
      {
        ...state,
        board: chain.board,
        commandIndex: nextSafe(state.commandIndex),
        nextEntityId,
        players,
        cities: economy.cities,
        units,
        graves,
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

/**
 * Revision 17 section 6.2 Kaboom: a goblin-crewed land-form unit that has not
 * used a primary action (it may have moved) dies (`UNIT_DIED` cause `KABOOM`,
 * then its Grave or Bitten rising) and its explosion resolves as wave 1 of a
 * chain. No target is needed. Then Plunder, rising reveals, and the ordinary
 * economy, reward-settlement, and achievement tail (section 6.7).
 */
function applyKaboom(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  unitId: UnitStateV7["id"],
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const exploder = actorCheck.unit;
  if (!unitRoleRuleV7(state, exploder).abilities.includes("KABOOM"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: exploder.role });
  if (primaryUsed(exploder) || exploder.activation.overrunActive)
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  if (exploder.form !== "LAND")
    return rejected(original, "KABOOM_NOT_LEGAL", { reason: "EMBARKED" });
  try {
    const events: DomainEventV7[] = [];
    let units = state.units.filter((unit) => unit.id !== exploder.id);
    let graves = state.graves;
    let nextEntityId = state.nextEntityId;
    const risings: UnitStateV7[] = [];
    // "Death first, then the bang": the Kaboom unit's death and its Grave
    // or Bitten rising precede its explosion, so a rising on its tile is hit.
    const bite = biteOfV7(state, exploder.id);
    if (bite === undefined)
      graves = recordCombatDeathV7(state, graves, exploder, "KABOOM", events);
    else {
      const allocation = allocateUnitId(nextEntityId);
      nextEntityId = allocation.nextEntityId;
      const rising = recordBittenRisingV7(
        { players: state.players, units },
        bite,
        exploder,
        "KABOOM",
        allocation.id,
        exhaustedActivation(),
        events,
      );
      risings.push(rising);
      units = [...units, rising];
    }
    const chain = resolveStateExplosionChainV7(
      state,
      { units, board: state.board, graves, nextEntityId, bitten: state.bitten },
      [{ unit: exploder, cause: "KABOOM" }],
      events,
    );
    units = [...chain.units];
    graves = chain.graves;
    nextEntityId = chain.nextEntityId;
    risings.push(...chain.risings);
    const plunder = plunderAwardsV7(state, state.players, chain.credits);
    events.push(...plunder.events);
    let players = plunder.players;
    for (const risen of risings) {
      const risenState = {
        ...state,
        board: chain.board,
        players,
        units,
      } as GameStateV7;
      const reveal = revealRadius(
        risenState,
        risen.ownerId,
        risen.at,
        unitSightRadiusAtV7(risenState, risen),
      );
      players = setExplored(players, risen.ownerId, reveal.explored);
      if (reveal.revealed.length)
        events.push({
          kind: "TILES_REVEALED",
          playerId: risen.ownerId,
          tiles: reveal.revealed,
        });
    }
    const economy = recomputeLiveEconomyV7(
      state,
      { board: chain.board, cities: state.cities, units },
      state.populationContributions,
    );
    events.push(...economyAndGrowth(economy.changes));
    const settlement = settleCityRewardsV7(
      {
        ...state,
        board: chain.board,
        commandIndex: nextSafe(state.commandIndex),
        nextEntityId,
        players,
        cities: economy.cities,
        units,
        graves,
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

/**
 * Revision 17 Start Turn chain (section 6.7): after Plague steps 1-5, the
 * player's exploding units that Plague killed explode; then Plunder, the
 * chain's rising reveals, and the live economy when a unit died. Runs inside
 * the Start Turn before Windmill healing.
 */
function resolveStartTurnPlagueAndChainV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const plague = resolveStartTurnPlagueV7(state, playerId);
  const initial = plague.events.flatMap((event) => {
    if (event.kind !== "UNIT_DIED" || event.cause !== "PLAGUE") return [];
    const victim = requireValue(
      state.units.find((unit) => unit.id === event.unitId),
    );
    return isExplodingUnitV7(state, victim)
      ? [{ unit: { ...victim, hp: 0 }, cause: "DEATH" as const }]
      : [];
  });
  if (initial.length === 0) return plague;
  const after = plague.state;
  const events: DomainEventV7[] = [...plague.events];
  const chain = resolveStateExplosionChainV7(
    after,
    {
      units: after.units,
      board: after.board,
      graves: after.graves,
      nextEntityId: after.nextEntityId,
      bitten: after.bitten,
    },
    initial,
    events,
  );
  const plunder = plunderAwardsV7(after, after.players, chain.credits);
  events.push(...plunder.events);
  let players = plunder.players;
  for (const risen of chain.risings) {
    const risenState = {
      ...after,
      board: chain.board,
      players,
      units: chain.units,
    } as GameStateV7;
    const reveal = revealRadius(
      risenState,
      risen.ownerId,
      risen.at,
      unitSightRadiusAtV7(risenState, risen),
    );
    players = setExplored(players, risen.ownerId, reveal.explored);
    if (reveal.revealed.length)
      events.push({
        kind: "TILES_REVEALED",
        playerId: risen.ownerId,
        tiles: reveal.revealed,
      });
  }
  const economy = recomputeLiveEconomyV7(
    after,
    { board: chain.board, cities: after.cities, units: chain.units },
    after.populationContributions,
  );
  events.push(...economyAndGrowth(economy.changes));
  return {
    state: {
      ...after,
      board: chain.board,
      players,
      units: chain.units,
      graves: chain.graves,
      nextEntityId: chain.nextEntityId,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    },
    events,
  };
}

/**
 * Revision 17 Plunder: each credited death of a unit whose owner is hostile
 * to the credited player earns that player its `plunderCoins` (Goblin
 * Commerce). One `PLUNDER_AWARDED` per player with at least one plundered
 * kill, in player-ID order. Other factions never have Plunder.
 */
function plunderAwardsV7(
  state: GameStateV7,
  players: readonly PlayerStateV7[],
  deaths: readonly CreditedDeathV7[],
): {
  readonly players: readonly PlayerStateV7[];
  readonly events: readonly DomainEventV7[];
} {
  const kills = new Map<PlayerId, number>();
  for (const death of deaths) {
    const credited = requirePlayer(state, death.creditedId);
    if (
      technologyCapabilitiesV7(credited.researchedTechs, credited.faction)
        .plunderCoins > 0 &&
      arePlayersHostileV7(state, death.creditedId, death.victimOwnerId)
    )
      kills.set(death.creditedId, (kills.get(death.creditedId) ?? 0) + 1);
  }
  if (kills.size === 0) return { players, events: [] };
  const events: DomainEventV7[] = [];
  let next = players;
  for (const [playerId, count] of [...kills].sort(([a], [b]) => a - b)) {
    const player = requirePlayer(state, playerId);
    const coins =
      count *
      technologyCapabilitiesV7(player.researchedTechs, player.faction)
        .plunderCoins;
    next = next.map((item) =>
      item.id === playerId
        ? { ...item, coins: nextSafeBy(item.coins, coins) }
        : item,
    );
    events.push({ kind: "PLUNDER_AWARDED", playerId, kills: count, coins });
  }
  return { players: next, events };
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
        // Revision 19 section 6.2: idle recovery skips an Egg.
        unit.form !== "EGG" &&
        (unit.form !== "NAVAL" ||
          [unit.at, ...adjacentCoords(state, unit.at)].some((at) =>
            isActivePortV7(state, at, player.id),
          )) &&
        unit.hp > 0 &&
        unit.hp < unit.maxHp &&
        !unit.activation.moved &&
        !primaryUsed(unit) &&
        // Revision 13 Restless: no idle recovery and no event outside own
        // territory.
        !restlessOutsideOwnTerritory(state, unit),
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
  if (inOwnTerritory(state, unit)) return 4;
  return restlessOutsideOwnTerritory(state, unit) ? 0 : 2;
}

function inOwnTerritory(state: GameStateV7, unit: UnitStateV7): boolean {
  const tile = tileAtV7(state.board, unit.at);
  const city = state.cities.find((item) => item.id === tile?.territoryCityId);
  return city?.ownerId === unit.ownerId;
}

/**
 * Revision 13 Restless: a land-form unit of a Restless faction (Undead)
 * recovers only in its owner's territory.
 */
function restlessOutsideOwnTerritory(
  state: GameStateV7,
  unit: UnitStateV7,
): boolean {
  return (
    unit.form === "LAND" &&
    factionRulesV7(playerFactionV7(state, unit.ownerId)).restless &&
    !inOwnTerritory(state, unit)
  );
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
      // Revision 19 section 6.2: an Egg stays exhausted at Start Turn.
      if (unit.ownerId !== playerId || unit.form === "EGG") return unit;
      const city = state.cities.find((candidate) =>
        same(candidate.at, unit.at),
      );
      const tile = tileAtV7(state.board, unit.at);
      const captureEligible =
        unitRoleRuleV7(state, unit).abilities.includes("CAPTURE") &&
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
          escapeAvailable: false,
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

/**
 * The reward displacement rule: the first cell adjacent to `center` in (y, x)
 * order that is land, enterable by `ownerId` (Mountain needs Engineering),
 * has no treasure chest and no unit, and is not an ally's territory.
 */
function rewardDisplacementCellV7(
  state: GameStateV7,
  ownerId: PlayerId,
  center: CoordV7,
): CoordV7 | null {
  const owner = requirePlayer(state, ownerId);
  return (
    adjacentCoords(state, center).find((at) => {
      const tile = tileAtV7(state.board, at);
      if (tile === undefined || tile.biome === null) return false;
      if (state.treasureChests.some((chest) => same(chest, at))) return false;
      if (
        tile.terrain === "MOUNTAIN" &&
        !owner.researchedTechs.includes("ENGINEERING")
      )
        return false;
      const territoryOwner = state.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      )?.ownerId;
      if (
        territoryOwner !== undefined &&
        territoryOwner !== ownerId &&
        arePlayersAlliedV7(state, ownerId, territoryOwner)
      )
        return false;
      return !state.units.some((unit) => unit.hp > 0 && same(unit.at, at));
    }) ?? null
  );
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
  const destination =
    occupant === undefined
      ? null
      : rewardDisplacementCellV7(state, occupant.ownerId, city.at);
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
  // Revision 19 section 9.7: an Egg does not count for Muster until it
  // hatches.
  const trainableRoles = new Set(
    state.units.flatMap((unit) =>
      unit.ownerId === playerId &&
      unit.hp > 0 &&
      unit.form !== "EGG" &&
      unitRoleRuleV7(state, unit).cost !== null
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
  const owner = requirePlayer(state, ownerId);
  const capabilities = technologyCapabilitiesV7(
    owner.researchedTechs,
    owner.faction,
  );
  const base = Math.max(
    effectiveRoleRuleV7(unit.role, owner.faction).sightRadius,
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
/**
 * Revision 12 masks Fertile Ground until Gathering. Placement gates consider
 * only resources the actor can observe, so the public command query stays
 * exact without revealing a masked resource. An improvement placed over a
 * masked resource keeps it underneath; only the Replant Forest terrain
 * transform drops it.
 */
function observedResourceV7(
  player: PlayerStateV7,
  tile: TileStateV7,
): TileStateV7["resource"] {
  return tile.resource !== null &&
    isResourceRevealedV7(tile.resource, player.researchedTechs)
    ? tile.resource
    : null;
}
/**
 * The resource an improvement hid and its removal re-exposes. Port and
 * Shipyard never hide their Fish or Pearls, so they re-expose nothing.
 */
function reexposedResourceV7(
  resource: TileStateV7["resource"],
  improvement: NonNullable<TileStateV7["improvement"]>,
): "FERTILE_GROUND" | "ORE" | null {
  if (improvement === "PORT" || improvement === "SHIPYARD") return null;
  return resource === "FERTILE_GROUND" || resource === "ORE" ? resource : null;
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
    escapeAvailable: false,
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
  checkedOutputValidationCountV7 += 1;
  // Revision 14: drop afflictions of departed units, sources, and biters.
  // Revision 19: drop the countdowns of Eggs that left the board.
  const result = parseGameStateV7(prunedEggsV7(prunedAfflictionsV7(state)));
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
  registerAcceptedStateCertificateV7(frozen);
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
