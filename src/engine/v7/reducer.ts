import {
  allocateCityId,
  allocateUnitId,
  type PlayerId,
  type UnitId,
} from "../model/ids";
import { deepFreeze } from "../model/freeze";
import { nextBounded } from "../random/random";
import type { JsonValue } from "../replay/canonical";
import {
  MONSTER_BOUNTY_V7,
  MONSTER_REGENERATION_V7,
  monsterAttackChoiceV7,
  monsterEntryV7,
  monsterStepsV7,
  monsterWanderV7,
  prunedMonstersV7,
  resolveCuriosityClaimV7,
  withMonsterProvocationsV7,
} from "./curiosities";
import { forbiddenTechnologiesV7 } from "./forbidden-technologies";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_LIMIT_V7,
  ORIGINAL_BASELINE_V5_TREE,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  attackIsTorpedoV7,
  boardedHpV7,
  dockPopulationV7,
  unitIsSubmergedV7,
  canEnterTerrainV7,
  effectiveRoleRuleV7,
  flyerMayStandOnSiteV7,
  factionUnlocksRoleV7,
  isIceAtV7,
  unitIsIceboundV7,
  unitFliesV7,
  unitIsMountainBornV7,
  unitMovementModeV7,
  EMBARKED_LANDING_MAX_SPENT_V7,
  embarkedMovementSpentV7,
  factionRulesV7,
  isEggLaidRoleV7,
  isMindControlledV7,
  isRallyTargetV7,
  ownerResearchedTechsV7,
  technologyCapabilitiesV7,
  seatRoleMechanicsV7,
  unitCapabilitiesV7,
  unitFactionV7,
  unitGrowsV7,
  PROMOTION_HP_V7,
  PROMOTION_KILLS_V7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  isResourceRevealedV7,
  playerTechnologyResearchCostV7,
  primaryActionBlockedAfterMoveV7,
  sluggishUnitMovedV7,
  kaboomReadyV7,
  BLAST_MOUNTAIN_POPULATION_V7,
  BOOM_POPULATION_V7,
  CITY_REWARD_COINS_V7,
  MONUMENT_POPULATION_V7,
  landGrantCostV7,
  treasureUnitRoleForRoundV7,
  type BasicEconomicCommandKindV7,
  type SpatialEconomicCommandKindV7,
  hireCostV7,
  HIRE_EXTRA_CAPACITY_V7,
  BLAST_MOUNTAIN_COST_V7,
  PILLAGE_COINS_V7,
} from "../rules/ruleset-v7";
import { hasExactKeysV7 } from "./schema";
import {
  freezeSetV7,
  resolveBlackIceV7,
  resolveIceCrushV7,
  resolveThawV7,
  unitFreezesRingV7,
  withFrozenV7,
} from "./ice";
import {
  attackMaximumRangeV7,
  canBeChilledV7,
  chillCountdownV7,
  coldSnapTargetsV7,
  isChilledV7,
  isIceFolkLandUnitV7,
  prunedIceFolkV7,
  resolveColdAuraV7,
  unitAvoidsForeignSitesV7,
  unitsChilledEventV7,
  withChillAppliedV7,
  withChillCuredV7,
  withinBolasRangeV7,
} from "./ice-folk";
import {
  ACHIEVEMENT_REQUIRED_TECH_V7,
  ENGINEER_MILL_OUTPUT_V7,
  LAND_BARON_CITIES_V7,
  MUSTER_KINDS_V7,
  SEA_DOG_SHIPS_V7,
  explorerTilesRequiredV7,
  SLAYER_KILLS_V7,
  revision21AchievementCountsV7,
} from "./achievements";
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
  harbourPopulationForV7,
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
import {
  bounceStateV7,
  attackBreachesV7,
  calculateCombatPreviewV7,
  pushedDestinationV7,
  tractorBeamTargetTechnologyV7,
} from "./combat";
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
  RAISE_DEAD_SKELETON_HP_V7,
  raiseDeadGravesV7,
  recordCombatDeathV7,
  recordCrumbsV7,
  withoutGravesV7,
} from "./graves";
import { grownUnitV7 } from "./growth";
import { recordInfectionV7 } from "./infect";
import {
  prunedNinthUnitV7,
  wightRisingRuleV7,
  withNinthUnitTurnEndedV7,
  withSortedUnitIdV7,
  withWightGravesV7,
} from "./ninth-unit";
import {
  biteOfV7,
  plagueClearedEventsV7,
  prunedAfflictionsV7,
  recordBittenRisingV7,
  withBittenV7,
  withPlaguedV7,
} from "./afflictions";
import { boardTargetBlockV7 } from "./naval-branch";
import { resolveStartTurnPlagueV7 } from "./plague";
import {
  isExplodingUnitV7,
  resolveStateExplosionChainV7,
  blastSetterV7,
  type CreditedDeathV7,
  type ExplosionCauseV7,
} from "./explosions";
import {
  MILITIA_FIGHTERS_V7,
  createInitialMapStateV7,
  type CreateInitialMapStateResultV7,
  SURVEY_RAIDERS_V7,
} from "./map";
import {
  beamDownCarrierReadyV7,
  beamDownDestinationLegalV7,
  beamDownPassengerLegalV7,
  beamedActivationV7,
  controlledByBrainV7,
  coolingStepV7,
  isCoolingV7,
  mindControlCooldownStepV7,
  mindControlTargetBlockV7,
  prunedMartianV7,
  rechargeShieldsAtEndTurnV7,
  rechargeShieldsV7,
  releaseControlledV7,
  tractorBeamActorReadyV7,
  tractorBeamPathV7,
  tractorBeamRuleV7,
  tractorBeamStepLegalV7,
  tractorBeamTargetBlockV7,
  unitHeldByCityWallsV7,
  withFiredRayV7,
  withFullShieldsV7,
  withShieldDamageV7,
} from "./martian";
import { unitSightRadiusAtV7, validateMovementPathV7 } from "./movement";
import { isUnitVisibleToPlayerV7 } from "./observation";
import { parseGameStateV7 } from "./state-schema";
import { wailResultEntriesV7, wailTargetsV7 } from "./wail";
import { isRiftTerrainV7, noRisingAtV7 } from "./rift";
import { allOwnedUnitsV7, barricadesOfV7, tileOccupiedV7 } from "./units";
import {
  applyAssembleV7,
  applyBombRunV7,
  applyTunnelV7,
  prunedDwarfV7,
  resolveStartTurnSurfacingV7,
  type DwarfReducerKitV7,
} from "./dwarf-reducer";
import {
  applyAttackBarricadeV7,
  applyBuildBarricadeV7,
  applyWhirlV7,
  barricadeRepairsV7,
  withBarricadesRepairedV7,
} from "./dwarf-crowd-control";
import { twinShotReadyV7, unitIsMachineV7 } from "./dwarf";
import {
  applyRebakeV7,
  applySugarRushV7,
  applySugarTossV7,
  prunedCandyV7,
  resolveCandyEndTurnV7,
  resolveCrumbsEatingV7,
  withCrumbsLeftV7,
} from "./candy-reducer";
import {
  overrunKindV7,
  overrunMayContinueV7,
  unitIsCrashedV7,
  withUnitIdV7,
} from "./candy";
import { unitIsConstructV7 } from "./afflictions";
import {
  recoverEligibleV7,
  recoveryGainV7,
  restlessOutsideOwnTerritoryV7,
  type RecoveryFactsV7,
} from "./recovery";
import { spatialContributionAtV7, tileAtV7 } from "./spatial-economy";
import {
  NEUTRAL_OWNER_ID_V7,
  TECHNOLOGY_IDS_V7,
  isAfloatFormV7,
  isNavalRoleV7,
  isNeutralOwnerV7,
  type AchievementIdV7,
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
  // Revision 19: an illegal Hatch (`EMBARKED`, `NO_EGG`, `LAID_THIS_TURN`)
  // and a unit command other than Disband naming an Egg.
  | "HATCH_NOT_LEGAL"
  | "UNIT_IS_EGG"
  // The Martian revision: an illegal Beam Down (`EMBARKED`, `MOVED`,
  // `NO_PASSENGER`), Mind Control (`EMBARKED`, `COOLDOWN`, `CONTROL_LIMIT`,
  // `TARGET_IMMUNE`, `OUT_OF_RANGE`, `TARGET_HEALTHY`), or Tractor Beam
  // (`EMBARKED`, `TARGET_IMMUNE`, `OUT_OF_RANGE`, `BLOCKED`).
  | "BEAM_DOWN_NOT_LEGAL"
  | "MIND_CONTROL_NOT_LEGAL"
  | "TRACTOR_BEAM_NOT_LEGAL"
  // The Ice Folk revision: an illegal Bolas (`EMBARKED`, `TARGET_IMMUNE`,
  // `OUT_OF_RANGE`) or Cold Snap (`EMBARKED`, `NO_TARGET`).
  | "BOLAS_NOT_LEGAL"
  | "COLD_SNAP_NOT_LEGAL"
  // The Dwarf revision: an illegal Tunnel (`EMBARKED`, `SURFACED`,
  // `DESTINATION`, `RIDER`, `RIDER_DESTINATION`), bombing run (`EMBARKED`,
  // `SLUGGISH`, `OUT_OF_RANGE`, `ALREADY_BOMBED`, `LANDING`), or Assemble
  // (`EMBARKED`, `NO_HOME`).
  | "TUNNEL_NOT_LEGAL"
  | "BOMB_RUN_NOT_LEGAL"
  | "ASSEMBLE_NOT_LEGAL"
  // Dwarf crowd control (`pulp_wars-w49.33`): an illegal Whirl
  // (`EMBARKED`, `NO_TARGET`) or Barricade (`EMBARKED`, `CAP`).
  | "WHIRL_NOT_LEGAL"
  | "BARRICADE_NOT_LEGAL"
  // The Candy revision: a primary action or a Sugar Rush of a Crashed unit
  // (`UNIT_CRASHED { unitId }`), an illegal Sugar Rush (`EMBARKED`,
  // `RUSHED`), Re-bake (`EMBARKED`, `NO_HOME`, `NO_CRUMBS`, `TILE`), or
  // Sugar Toss (`EMBARKED`, `OUT_OF_RANGE`, `ALREADY_TOSSED`).
  | "UNIT_CRASHED"
  | "SUGAR_RUSH_NOT_LEGAL"
  | "REBAKE_NOT_LEGAL"
  | "SUGAR_TOSS_NOT_LEGAL"
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.2):
  // an illegal Board (`NOT_A_SHIP`, `TARGET_IMMUNE`, `OUT_OF_RANGE`,
  // `TARGET_HEALTHY`). A torpedo at a land unit is `ATTACK_NOT_LEGAL` with
  // the reason `NOT_AFLOAT` (section 5.3).
  | "BOARD_NOT_LEGAL"
  // The frozen sea (section 8.4): an illegal Freeze (`OUT_OF_RANGE`,
  // `NO_TARGET`). An icebound unit's Attack is `ATTACK_NOT_LEGAL`, its
  // Board `BOARD_NOT_LEGAL`, and its Move `MOVEMENT_ILLEGAL`, each with the
  // reason `ICEBOUND` (section 8.9).
  | "FREEZE_NOT_LEGAL";
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
    // The Martian revision section 5.2: the first Start Turn recharges
    // Shields under the Force Field rule like any Start Turn (a Showcase).
    const started = startTurnEconomyV7(
      resetTurnUnits(created.state, player.id),
      player,
      true,
      (next) => rechargeShieldsV7(next, player.id),
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
  const applied = applyCommandCoreV7(stateInput, actor, input);
  if (!applied.accepted) return applied;
  // The Candy revision section 6.1: the Crumbs the command's deaths left.
  // The ninth unit (`pulp_wars-w49.17`, 7r55): and the Graves its Wight
  // deaths left (Rise Again), folded from the events the same way.
  const core = withWightGravesResultV7(
    stateInput,
    withCrumbsLeftResultV7(applied),
  );
  const result = revealReleasedUnitsV7(core);
  // The Mind Control revision section 5.4: every command that releases a
  // unit joins the blockade and sea-network recompute list.
  const navalMayChange =
    navalFactsMayChangeV7(stateInput, input) || result !== core;
  // (`result !== core` only when a unit was released; the Crumbs fold above
  // changes no unit, city, or tile.)
  const naval = navalMayChange
    ? navalTransitionEventsV7(stateInput, result.state)
    : [];
  // Revision 14 section 3.5: a Lich that left the board cures its Plague.
  const cleared = plagueClearedEventsV7(stateInput, result.state);
  if (!navalMayChange && cleared.length === 0)
    return withMonsterProvocationsResultV7(result);
  return withMonsterProvocationsResultV7({
    ...result,
    events: [...result.events, ...naval, ...cleared],
  });
}

/**
 * Map curiosities (section 8.4): every unit on the board that damaged a
 * Monster in the command joins its `provokedBy`. In an `END_TURN` with a
 * neutral turn only the events after `NEUTRAL_TURN_ENDED` count (the list
 * is cleared at the end of the neutral turn, so a retaliation in the
 * Monster's own attack provokes nothing). Returns `result` itself when no
 * Monster was damaged.
 */
function withMonsterProvocationsResultV7(
  result: Extract<ApplyCommandResultV7, { readonly accepted: true }>,
): Extract<ApplyCommandResultV7, { readonly accepted: true }> {
  if (result.state.monsters.length === 0) return result;
  let start = 0;
  result.events.forEach((event, index) => {
    if (event.kind === "NEUTRAL_TURN_ENDED") start = index + 1;
  });
  const state = withMonsterProvocationsV7(
    result.state,
    result.events.slice(start),
  );
  if (state === result.state) return result;
  const next = accepted(checked(state), result.events);
  if (!next.accepted) throw new RangeError("INVALID_STATE");
  return next;
}

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 6.1): folds
 * the `CRUMBS_LEFT` events of an accepted command into `crumbs`, in the
 * order of their deaths (later Crumbs replace earlier ones on a tile). The
 * death sites only record the event (`recordCrumbsV7`); nothing reads
 * Crumbs left earlier in the same command, because eating, Re-bake, and the
 * End Turn countdown all come before any death of their command. Returns
 * `result` itself when the command left no Crumbs.
 */
function withCrumbsLeftResultV7(
  result: Extract<ApplyCommandResultV7, { readonly accepted: true }>,
): Extract<ApplyCommandResultV7, { readonly accepted: true }> {
  if (!result.events.some((event) => event.kind === "CRUMBS_LEFT"))
    return result;
  const state = withCrumbsLeftV7(result.state, result.events);
  const next = accepted(checked(state), result.events);
  if (!next.accepted) throw new RangeError("INVALID_STATE");
  return next;
}

/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55): Rise Again. Folds the Graves
 * the command's Wight deaths left into `ninthUnit.wightGraves`
 * (`withWightGravesV7`); nothing reads a Grave marked earlier in the same
 * command. Returns `result` itself when the command marked no Grave.
 */
function withWightGravesResultV7(
  before: GameStateV7,
  result: Extract<ApplyCommandResultV7, { readonly accepted: true }>,
): Extract<ApplyCommandResultV7, { readonly accepted: true }> {
  if (!result.events.some((event) => event.kind === "GRAVE_CREATED"))
    return result;
  const state = withWightGravesV7(before, result.state, result.events);
  if (state === result.state) return result;
  const next = accepted(checked(state), result.events);
  if (!next.accepted) throw new RangeError("INVALID_STATE");
  return next;
}

/**
 * The Mind Control revision (section 4.2): each released unit reveals its
 * sight for its (original) owner where it stands at the end of the command;
 * the `TILES_REVEALED` follows its `UNIT_RELEASED`. A unit that left the
 * board or burrowed later in the command reveals nothing. Returns `result`
 * itself when the command released no unit.
 */
function revealReleasedUnitsV7(
  result: Extract<ApplyCommandResultV7, { readonly accepted: true }>,
): Extract<ApplyCommandResultV7, { readonly accepted: true }> {
  if (!result.events.some((event) => event.kind === "UNIT_RELEASED"))
    return result;
  let state = result.state;
  const events: DomainEventV7[] = [];
  for (const event of result.events) {
    events.push(event);
    if (event.kind !== "UNIT_RELEASED") continue;
    const unit = state.units.find(
      (candidate) =>
        candidate.id === event.unitId &&
        candidate.hp > 0 &&
        candidate.ownerId === event.toPlayerId,
    );
    if (unit === undefined) continue;
    const reveal = revealRadius(
      state,
      event.toPlayerId,
      unit.at,
      unitSightRadiusAtV7(state, unit),
    );
    if (reveal.revealed.length === 0) continue;
    state = {
      ...state,
      players: setExplored(state.players, event.toPlayerId, reveal.explored),
    };
    events.push({
      kind: "TILES_REVEALED",
      playerId: event.toPlayerId,
      tiles: reveal.revealed,
    });
  }
  if (state === result.state) return { ...result, events };
  const next = accepted(checked(state), events);
  if (!next.accepted) throw new RangeError("INVALID_STATE");
  return next;
}

function navalFactsMayChangeV7(
  state: GameStateV7,
  command: CommandV7,
): boolean {
  // The Martian revision section 10.7: a Mind Control or a Tractor Beam can
  // lift a blockade, and so can a Disband of a Brain whose embarked
  // controlled unit was a blockader and is released (the Mind Control
  // revision section 5.4; only a state with controlled units).
  if (command.kind === "MIND_CONTROL" || command.kind === "TRACTOR_BEAM")
    return true;
  // The naval branch section 4.2: a prize standing on its former owner's
  // dock now blockades it (and one taken off an own dock lifts a blockade).
  if (command.kind === "BOARD") return true;
  // The Dwarf revision section 6.3: a bomb can kill an embarked blockader,
  // and a self-launch can start a blockade.
  if (command.kind === "BOMB_RUN") return true;
  if (command.kind === "DISBAND")
    return (
      Array.isArray(state.mindControlled) && state.mindControlled.length > 0
    );
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
    // Dwarf crowd control (`pulp_wars-w49.33`): a Whirl can kill an
    // embarked blockader, like a Wail.
    "WHIRL",
    // Revision 17 section 6.7: an exploding blockader lifts its blockade, and
    // END_TURN reports blockades lifted by Start Turn Plague and chains.
    "KABOOM",
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
  // The Dwarf revision section 5.3: a burrowed unit spent its turn
  // underground; every command naming it is refused.
  if (
    "unitId" in command &&
    state.burrowed.some(
      (entry) =>
        entry.unit.id === command.unitId && entry.unit.ownerId === actor,
    )
  )
    return rejected(stateInput, "UNIT_ALREADY_HANDLED", {
      unitId: command.unitId,
    });
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
  if (command.kind === "BLAST_MOUNTAIN")
    return applyBlastMountain(stateInput, state, actor, command.at);
  if (
    [
      "CLEAR_FOREST",
      "REPLANT_FOREST",
      "CULTIVATE_FOREST",
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
  if (command.kind === "HIRE")
    return applyHire(stateInput, state, actor, command);
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
    return huntedAfterAttackV7(
      state,
      command,
      applyAttack(stateInput, state, actor, command),
    );
  if (command.kind === "BOARD")
    return applyBoard(stateInput, state, actor, command);
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
  if (command.kind === "BEAM_DOWN")
    return applyBeamDown(stateInput, state, actor, command);
  if (command.kind === "MIND_CONTROL")
    return applyMindControl(stateInput, state, actor, command);
  if (command.kind === "TRACTOR_BEAM")
    return applyTractorBeam(stateInput, state, actor, command);
  if (command.kind === "THROW_BOLAS")
    return applyThrowBolas(stateInput, state, actor, command);
  if (command.kind === "COLD_SNAP")
    return applyColdSnap(stateInput, state, actor, command.unitId);
  if (command.kind === "FREEZE")
    return applyFreeze(stateInput, state, actor, command);
  if (command.kind === "TUNNEL")
    return applyTunnelV7(DWARF_KIT_V7, stateInput, state, actor, command);
  if (command.kind === "BOMB_RUN")
    return applyBombRunV7(DWARF_KIT_V7, stateInput, state, actor, command);
  if (command.kind === "ASSEMBLE")
    return applyAssembleV7(DWARF_KIT_V7, stateInput, state, actor, command);
  if (command.kind === "WHIRL")
    return applyWhirlV7(DWARF_KIT_V7, stateInput, state, actor, command);
  if (command.kind === "BUILD_BARRICADE")
    return applyBuildBarricadeV7(
      DWARF_KIT_V7,
      stateInput,
      state,
      actor,
      command,
    );
  if (command.kind === "ATTACK_BARRICADE")
    return applyAttackBarricadeV7(
      DWARF_KIT_V7,
      stateInput,
      state,
      actor,
      command,
    );
  if (command.kind === "SUGAR_RUSH")
    return applySugarRushV7(DWARF_KIT_V7, stateInput, state, actor, command);
  if (command.kind === "REBAKE")
    return applyRebakeV7(DWARF_KIT_V7, stateInput, state, actor, command);
  if (command.kind === "SUGAR_TOSS")
    return applySugarTossV7(DWARF_KIT_V7, stateInput, state, actor, command);
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
  // Forbidden technologies (docs/product/CAMPAIGN.md section 2.3): the Dry
  // Land Naval branch and a mission's list, from the one source.
  const forbidden = forbiddenTechnologiesV7(state.setup).get(tech);
  if (forbidden !== undefined)
    return rejected(original, "TECH_REQUIRED", { tech, reason: forbidden });
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
    // The economy rejig (`pulp_wars-w49.16`, 7r54): the price grows with
    // the cities the player owns now, not with its technologies.
    const cost = playerTechnologyResearchCostV7(
      node.tier,
      player.researchedTechs.length,
      state.cities.filter((city) => city.ownerId === actor).length,
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
    (tile.biome === null &&
      (command.kind !== "REDEVELOP" ||
        (tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD"))) ||
    // The Rift (RULESET_7_RIFT.md section 3): nothing is built on a Rift.
    isRiftTerrainV7(tile.terrain)
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
    isRiftTerrainV7(tile.terrain) ||
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
      amount: MONUMENT_POPULATION_V7,
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
        populationAdded: MONUMENT_POPULATION_V7,
      },
      ...economyAndGrowth(recalculation.changes),
      ...settlement.events,
      ...achievements.events,
    ]);
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

/**
 * Whether `actor` may blast the Mountain tile `tile` as far as its place
 * goes (tuning 3, `pulp_wars-w49.3`): a tile of its own territory, or a
 * tile outside it, not in an ally's territory, next to one of its land-form
 * units.
 */
function blastPlaceV7(
  state: GameStateV7,
  actor: PlayerId,
  tile: TileStateV7,
): { readonly city: CityStateV7 | null } | null {
  const city =
    state.cities.find((item) => item.id === tile.territoryCityId) ?? null;
  if (city?.ownerId === actor) return { city };
  if (city !== null && arePlayersAlliedV7(state, actor, city.ownerId))
    return null;
  return state.units.some(
    (unit) =>
      unit.hp > 0 &&
      unit.ownerId === actor &&
      unit.form === "LAND" &&
      chebyshev(unit.at, tile.at) === 1,
  )
    ? { city: null }
    : null;
}

/**
 * Explosives, Blast Mountain. Tuning 1: the Mountain (and its Ore) becomes
 * Grass and, in the player's own territory, the tile's city gains permanent
 * population. Tuning 3 (`pulp_wars-w49.3`): it is also a weapon. It may be
 * set off on a Mountain outside the player's territory next to one of its
 * land-form units, and it explodes: every unit on the tile and on the eight
 * tiles around it, friend and foe, takes `BLAST_MOUNTAIN_DAMAGE_V7` as an
 * explosion of cause `BLAST` (Shields first, Armoured less, Field Defense in
 * the area destroyed, exploding units it kills chain on), credited to the
 * blasting player. Then Plunder, rising reveals, and the ordinary economy,
 * reward-settlement, and achievement tail, as after a Kaboom.
 */
function applyBlastMountain(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  at: CoordV7,
): ApplyCommandResultV7 {
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, at);
  if (tile === undefined) return rejected(original, "TILE_NOT_FOUND");
  if (!isExplored(player, at)) return rejected(original, "TILE_UNEXPLORED");
  if (!player.researchedTechs.includes("EXPLOSIVES"))
    return rejected(original, "TECH_REQUIRED", { tech: "EXPLOSIVES" });
  if (
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): an Ore Mountain may be blasted
    // (the Ore is lost); an improvement still blocks it.
    tile.terrain !== "MOUNTAIN" ||
    tile.site !== null ||
    (tile.resource !== null && tile.resource !== "ORE") ||
    tile.improvement !== null ||
    tile.fieldDefense
  )
    return rejected(original, "INVALID_TILE", { action: "BLAST_MOUNTAIN" });
  const place = blastPlaceV7(state, actor, tile);
  if (place === null) return rejected(original, "TERRITORY_NOT_OWNED");
  const city = place.city;
  if (city !== null && isCityBesiegedV7(state, city))
    return rejected(original, "CITY_BESIEGED");
  if (city !== null && hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING");
  const cost = BLAST_MOUNTAIN_COST_V7;
  if (player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  if (state.commandIndex >= Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  try {
    const board = replaceTile(state, at, {
      ...tile,
      terrain: "GRASS",
      resource: null,
    });
    // The charge: a fresh ID that names no unit, so the chain hits every
    // unit in the area, the one on the tile included.
    const charge = allocateUnitId(state.nextEntityId);
    let nextEntityId = charge.nextEntityId;
    const contributions: readonly PopulationContributionV7[] =
      city === null
        ? state.populationContributions
        : [
            ...state.populationContributions,
            {
              id: nextEntityId,
              cityId: city.id,
              category: "PERMANENT",
              amount: BLAST_MOUNTAIN_POPULATION_V7,
              source: {
                kind: "RESOURCE_ACTION",
                action: "BLAST_MOUNTAIN",
                at,
              },
            },
          ];
    if (city !== null) nextEntityId = nextSafe(nextEntityId);
    const events: DomainEventV7[] = [
      {
        kind: "MOUNTAIN_BLASTED",
        playerId: actor,
        cityId: city?.id ?? null,
        at,
        cost,
        terrainBefore: "MOUNTAIN",
        terrainAfter: "GRASS",
        resourceBefore: null,
        resourceAfter: null,
      },
    ];
    const chain = resolveStateExplosionChainV7(
      state,
      {
        units: state.units,
        board,
        graves: state.graves,
        nextEntityId,
        bitten: state.bitten,
        shields: state.shields,
        mindControlled: state.mindControlled,
        burrowed: state.burrowed,
      },
      [
        {
          unit: {
            id: charge.id,
            ownerId: actor,
            homeCityId: null,
            role: "FIGHTER",
            form: "LAND",
            at,
            hp: 0,
            maxHp: 1,
            kills: 0,
            veteran: false,
            captureEligible: false,
            activation: exhaustedActivation(),
          },
          cause: "BLAST",
          // Tuning 5 (`pulp_wars-w49.4`): the unit that sets the charge
          // is not hit.
          spared: blastSetterV7(state.units, actor, at)?.id,
        },
      ],
      events,
    );
    const units = [...chain.units];
    const plunder = plunderAwardsV7(state, state.players, chain.credits);
    events.push(...plunder.events);
    let players = debit(plunder.players, actor, cost);
    for (const risen of chain.risings) {
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
      contributions,
    );
    events.push(...economyAndGrowth(economy.changes));
    const settlement = settleCityRewardsV7(
      {
        ...state,
        board: chain.board,
        commandIndex: nextSafe(state.commandIndex),
        nextEntityId: chain.nextEntityId,
        players,
        cities: economy.cities,
        units,
        graves: chain.graves,
        shields: chain.shields,
        mindControlled: chain.mindControlled,
        burrowed: chain.burrowed,
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
      isRiftTerrainV7(tile.terrain) ||
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
    // Tuning 1 (`pulp_wars-w49.3`, 7r46): an Ore Mountain may be blasted
    // (the Ore is lost); an improvement still blocks it.
    (tile.terrain !== "MOUNTAIN" ||
      tile.site !== null ||
      (tile.resource !== null && tile.resource !== "ORE") ||
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
            : command.kind === "REPLANT_FOREST" ||
                command.kind === "BLAST_MOUNTAIN"
              ? null
              : tile.resource,
    });
    // Tuning 1 (7r46): a Blast gives the tile's city permanent population.
    const blasted = command.kind === "BLAST_MOUNTAIN" && city !== undefined;
    const contributions: readonly PopulationContributionV7[] = blasted
      ? [
          ...state.populationContributions,
          {
            id: state.nextEntityId,
            cityId: city.id,
            category: "PERMANENT",
            amount: BLAST_MOUNTAIN_POPULATION_V7,
            source: {
              kind: "RESOURCE_ACTION",
              action: "BLAST_MOUNTAIN",
              at: command.at,
            },
          },
        ]
      : removedContribution === undefined
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
      nextEntityId: blasted ? nextSafe(state.nextEntityId) : state.nextEntityId,
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
            : command.kind === "CULTIVATE_FOREST"
              ? {
                  kind: "FOREST_CULTIVATED",
                  playerId: actor,
                  cityId: requireValue(city).id,
                  at: command.at,
                  cost,
                  terrainBefore: "FOREST",
                  terrainAfter: "GRASS",
                  resourceBefore: null,
                  resourceAfter: "FERTILE_GROUND",
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
    // The frozen sea (naval branch section 8.3): no Port on ice.
    isIceAtV7(state, at) ||
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
    // The naval branch section 5.4: a Port gives 2 with Harbours.
    const portPopulation = dockPopulationV7(
      "PORT",
      harbourPopulationForV7(state.players, actor),
    ) as 1 | 2;
    const contribution: PopulationContributionV7 = {
      id: state.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: portPopulation,
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
        populationAdded: portPopulation,
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
        // The naval branch section 5.4: a Shipyard gives 3 with Harbours.
        livePopulationTotal: dockPopulationV7(
          "SHIPYARD",
          harbourPopulationForV7(state.players, actor),
        ) as 2 | 3,
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
  // The frozen sea (naval branch section 8.11): a tree that unlocks no ship
  // (the Ice Folk's) never trains one, whatever the seat researched.
  if (!factionUnlocksRoleV7(player.faction, command.role))
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
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
      seatRoleMechanicsV7(state, actor, command.role).capacitySlots >
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

/**
 * Tuning 3 (`pulp_wars-w49.3`): Commerce, a Market hires. A land unit the
 * player can train appears, with every action spent, on an empty Market
 * tile of the own city, homed to it, for `hireCostV7` of its training
 * price there. It does not use the city action, and the city may hold
 * `HIRE_EXTRA_CAPACITY_V7` units above its capacity through it.
 */
function applyHire(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "HIRE" }>,
): ApplyCommandResultV7 {
  const city = state.cities.find((item) => item.id === command.cityId);
  if (city === undefined) return rejected(original, "CITY_NOT_FOUND");
  if (city.ownerId !== actor) return rejected(original, "CITY_NOT_OWNED");
  const player = requirePlayer(state, actor);
  if (
    !technologyCapabilitiesV7(
      player.researchedTechs,
      player.faction,
    ).commands.includes("HIRE")
  )
    return rejected(original, "TECH_REQUIRED", { tech: "COMMERCE" });
  const tile = tileAtV7(state.board, command.at);
  if (tile?.territoryCityId !== city.id || tile.improvement !== "MARKET")
    return rejected(original, "INVALID_TILE", { action: "HIRE" });
  if (isCityBesiegedV7(state, city))
    return rejected(original, "CITY_BESIEGED", { cityId: city.id });
  if (hasCityChoice(state, city.id))
    return rejected(original, "CITY_REWARD_PENDING", { cityId: city.id });
  const rule = effectiveRoleRuleV7(command.role, player.faction);
  // The Dinosaur pass (`pulp_wars-w49.15`, 7r53): an egg-laid role is hired
  // too; the dinosaur arrives hatched, as a reward or a treasure unit does.
  if (isNavalRoleV7(command.role) || rule.cost === null)
    return rejected(original, "UNIT_ROLE_INVALID", { role: command.role });
  if (
    rule.technology !== null &&
    !player.researchedTechs.includes(rule.technology)
  )
    return rejected(original, "TECH_REQUIRED", { tech: rule.technology });
  if (state.units.some((unit) => unit.hp > 0 && same(unit.at, command.at)))
    return rejected(original, "CITY_SPAWN_OCCUPIED", { cityId: city.id });
  if (
    assignedUnitCountV7(state, city.id) +
      seatRoleMechanicsV7(state, actor, command.role).capacitySlots >
    cityUnitCapacityV7(state, city) + HIRE_EXTRA_CAPACITY_V7
  )
    return rejected(original, "CITY_CAPACITY_FULL", { cityId: city.id });
  const forgeActive = state.board.tiles.some(
    (item) =>
      item.territoryCityId === city.id &&
      item.improvement === "FORGE" &&
      spatialContributionAtV7(state, item.at, "FORGE").population > 0,
  );
  const cost = hireCostV7(Math.max(1, rule.cost - (forgeActive ? 1 : 0)));
  if (player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost });
  if (
    state.nextEntityId >= Number.MAX_SAFE_INTEGER ||
    state.commandIndex >= Number.MAX_SAFE_INTEGER
  )
    return rejected(original, "INTEGER_OVERFLOW");
  try {
    const allocation = allocateUnitId(state.nextEntityId);
    const hired: UnitStateV7 = {
      id: allocation.id,
      ownerId: actor,
      homeCityId: city.id,
      role: command.role,
      form: "LAND",
      at: command.at,
      hp: rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: exhaustedActivation(),
    };
    const placed: GameStateV7 = {
      ...state,
      nextEntityId: allocation.nextEntityId,
      commandIndex: nextSafe(state.commandIndex),
      players: debit(state.players, actor, cost),
      units: [...state.units, hired],
      // The Martian revision: a new unit starts with its full Shield.
      shields: withFullShieldsV7(state, state.shields, [hired]),
    };
    const reveal = revealRadius(
      placed,
      actor,
      hired.at,
      unitSightRadiusAtV7(placed, hired),
    );
    const staged: GameStateV7 = {
      ...placed,
      players: setExplored(placed.players, actor, reveal.explored),
    };
    const achievements = evaluateAchievementsV7(staged, actor);
    return accepted(checked(achievements.state), [
      {
        kind: "UNIT_TRAINED",
        playerId: actor,
        cityId: city.id,
        unitId: hired.id,
        role: hired.role,
        cost,
        at: hired.at,
      },
      ...(reveal.revealed.length > 0
        ? [
            {
              kind: "TILES_REVEALED" as const,
              playerId: actor,
              tiles: reveal.revealed,
            },
          ]
        : []),
      ...achievements.events,
    ]);
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
  // The Martian revision: the landing tile goes through the shared
  // `canEnterTerrainV7` with the unit's land-form movement mode (a machine
  // lands on a Mountain without Engineering).
  const landingMode = unitMovementModeV7(state, unit);
  if (
    unit.form !== "EMBARKED" ||
    unit.activation.handled ||
    // Revision 16: landing spends one of the embarked unit's two points.
    embarkedMovementSpentV7(unit.activation) > EMBARKED_LANDING_MAX_SPENT_V7 ||
    chebyshev(unit.at, command.at) !== 1 ||
    tile === undefined ||
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: landingMode,
      afloat: false,
      engineering: player.researchedTechs.includes("ENGINEERING"),
      navigation: player.researchedTechs.includes("NAVIGATION"),
      // The Ice Folk revision section 7.1: the unit lands in land form.
      mountainBorn: unitIsMountainBornV7(state, {
        id: unit.id,
        ownerId: unit.ownerId,
        role: unit.role,
      }),
      // The frozen sea (naval branch section 8.3): a transport may land on
      // adjacent ice (an icebound one too: the crew climbs out).
      ice: isIceAtV7(state, command.at),
    }) ||
    (territoryOwner !== undefined &&
      territoryOwner !== actor &&
      arePlayersAlliedV7(state, actor, territoryOwner)) ||
    // The Dwarf revision section 5.3: the occupancy predicate.
    tileOccupiedV7(state, command.at)
  )
    return rejected(original, "MOVEMENT_ILLEGAL");
  // The Martian revision section 7.2: a flyer cannot land on a neutral
  // village center or on the center of a city it does not own (the Ice Folk
  // revision section 7.7: nor can a Sabretooth).
  if (
    unitAvoidsForeignSitesV7(state, {
      id: unit.id,
      ownerId: unit.ownerId,
      role: unit.role,
    }) &&
    !flyerMayStandOnSiteV7(
      tile.site,
      state.cities.find((city) => same(city.at, command.at))?.ownerId ?? null,
      actor,
    )
  )
    return rejected(original, "MOVEMENT_ILLEGAL", {
      reason: "SETTLEMENT_FORBIDDEN",
    });
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
    // The Martian revision: a flyer is not on the ground and never
    // destroys Field Defense by entering a tile.
    const occupiesHostileDefense =
      tile.fieldDefense &&
      landingMode !== "FLY" &&
      territoryOwner !== undefined &&
      territoryOwner !== actor &&
      arePlayersHostileV7(state, actor, territoryOwner);
    const board = occupiesHostileDefense
      ? replaceTile(state, command.at, { ...tile, fieldDefense: false })
      : state.board;
    // The Candy revision section 6.3: a hostile ground unit that lands on
    // Crumbs eats them, after the landing's own events and before the
    // economy tail.
    const eatingEvents: DomainEventV7[] = [];
    const landedState = resolveCrumbsEatingV7(
      DWARF_KIT_V7,
      {
        ...state,
        board,
        commandIndex: nextSafe(state.commandIndex),
        players,
        units: movedUnits,
        shields: withFullShieldsV7(
          state,
          state.shields,
          treasure?.spawnedUnit == null ? [] : [treasure.spawnedUnit],
        ),
        random: treasure?.random ?? state.random,
        nextEntityId: treasure?.nextEntityId ?? state.nextEntityId,
        treasureChests: treasure?.treasureChests ?? state.treasureChests,
      },
      unit.id,
      eatingEvents,
    );
    const economy = recomputeLiveEconomyV7(
      state,
      {
        board: landedState.board,
        cities: landedState.cities,
        units: landedState.units,
      },
      landedState.populationContributions,
    );
    const staged: GameStateV7 = {
      ...landedState,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
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
      ...eatingEvents,
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
  if (isNavalRoleV7(command.role))
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
      seatRoleMechanicsV7(state, actor, command.role).capacitySlots >
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
      burrowed: spawn.burrowed,
      // The Martian revision: a trained unit starts with its full Shield.
      shields: withFullShieldsV7(state, state.shields, [trained]),
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
      seatRoleMechanicsV7(state, actor, command.role).capacitySlots >
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
    primaryActionBlockedAfterMoveV7(state, shaman)
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
 * The Martian revision `BEAM_DOWN` (section 8.1; the balance revision
 * `pulp_wars-1wy.3`, RULESET_7_BALANCE_MARTIAN_ICE.md section 5.1): a
 * primary action of a carrier (the Saucer and the Mothership), which may
 * have moved. It moves one own land-form, one-slot, non-flying unit that
 * was not beamed this turn and stands on or next to an own city center, or
 * within `BEAM_DOWN_PICKUP_RANGE_V7` of the carrier, to a tile next to the
 * carrier; the passenger then counts as having moved. The legality checks
 * run in the section's fixed order, through the predicates the public
 * command query shares; the first failure is the (atomic) rejection.
 */
function applyBeamDown(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "BEAM_DOWN" }>,
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const saucer = actorCheck.unit;
  if (!unitRoleRuleV7(state, saucer).abilities.includes("BEAM_DOWN"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: saucer.role });
  // Row 3 (the carrier may have moved; a sluggish carrier that moved may
  // not act), shared with the public command query.
  if (!beamDownCarrierReadyV7(state, saucer))
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: saucer.id });
  if (saucer.form !== "LAND")
    return rejected(original, "BEAM_DOWN_NOT_LEGAL", { reason: "EMBARKED" });
  // Row 6, shared with the public command query.
  const ownCenters = state.cities
    .filter((city) => city.ownerId === actor)
    .map((city) => city.at);
  const passenger = state.units.find(
    (unit) =>
      unit.id === command.passengerUnitId &&
      beamDownPassengerLegalV7(
        state,
        saucer,
        unit,
        ownCenters,
        state.beamedThisTurn,
      ),
  );
  if (passenger === undefined)
    return rejected(original, "BEAM_DOWN_NOT_LEGAL", {
      reason: "NO_PASSENGER",
    });
  const player = requirePlayer(state, actor);
  const tile = tileAtV7(state.board, command.to);
  const territoryOwner =
    tile === undefined
      ? undefined
      : state.cities.find((city) => city.id === tile.territoryCityId)?.ownerId;
  // Row 7, shared with the public command query. A Rift (pulp_wars-9s0.5)
  // is never a Beam Down destination: every passenger is a non-flyer, and
  // `canEnterTerrainV7` keeps them off it.
  if (
    tile === undefined ||
    !beamDownDestinationLegalV7(
      state,
      saucer,
      passenger,
      {
        engineering: player.researchedTechs.includes("ENGINEERING"),
        navigation: player.researchedTechs.includes("NAVIGATION"),
      },
      command.to,
      {
        explored: isExplored(player, command.to),
        site: tile.site,
        terrain: tile.terrain,
        ice: isIceAtV7(state, command.to),
        // The Dwarf revision section 5.3: the occupancy predicate.
        occupied: tileOccupiedV7(state, command.to),
        chest: state.treasureChests.some((chest) => same(chest, command.to)),
        alliedTerritory:
          territoryOwner !== undefined &&
          arePlayersAlliedV7(state, actor, territoryOwner),
      },
    )
  )
    return rejected(original, "INVALID_TILE", { action: "BEAM_DOWN" });
  try {
    const from = passenger.at;
    const to = { x: command.to.x, y: command.to.y };
    // The disembarkation rule: Field Defense in hostile territory is
    // destroyed by the unit that lands on it.
    const occupiesHostileDefense =
      tile.fieldDefense &&
      territoryOwner !== undefined &&
      arePlayersHostileV7(state, actor, territoryOwner);
    const board = occupiesHostileDefense
      ? replaceTile(state, to, { ...tile, fieldDefense: false })
      : state.board;
    const units = state.units.map((unit) =>
      unit.id === passenger.id
        ? {
            ...unit,
            at: to,
            captureEligible: false,
            // The balance revision section 5.1: the passenger counts as
            // having moved (it may still attack, at half power for a ray),
            // not as exhausted.
            activation: beamedActivationV7(unit.activation),
          }
        : unit.id === saucer.id
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                specialActed: true,
                handled: true,
              },
            }
          : unit,
    );
    const beamed = requireValue(units.find((unit) => unit.id === passenger.id));
    const sightState = { ...state, board, units } as GameStateV7;
    const reveal = revealRadius(
      sightState,
      actor,
      to,
      unitSightRadiusAtV7(sightState, beamed),
    );
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_BEAMED",
        playerId: actor,
        unitId: saucer.id,
        passengerUnitId: passenger.id,
        from,
        to,
      },
    ];
    if (occupiesHostileDefense)
      events.push({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: to,
        reason: "OCCUPATION",
      });
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    const staged = graveActionTail(
      {
        ...state,
        board,
        commandIndex: nextSafe(state.commandIndex),
        players: setExplored(state.players, actor, reveal.explored),
        units,
        // Once per turn per passenger (no chain teleports).
        beamedThisTurn: [...state.beamedThisTurn, passenger.id].sort(
          (left, right) => left - right,
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
 * The Mind Control revision `MIND_CONTROL` (docs/product/RULESET_7_MIND_CONTROL.md
 * section 3): a primary action of a Brain that is not itself controlled and
 * controls fewer than `MIND_CONTROL_LIMIT_V7` units. A visible, hostile,
 * wounded land-form one-slot unit with at most `MIND_CONTROL_HP_V7` HP
 * within `MIND_CONTROL_RANGE_V7`, not on a settlement site or a Rift, not a
 * construct, and not already controlled, comes under the actor's control:
 * it keeps its ID, role, kind, HP, kills, statuses, form, and tile; its
 * home is cleared (its old city's slot frees), it is not capture-eligible,
 * and it is exhausted. A controlled Brain's own units are released.
 */
function applyMindControl(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "MIND_CONTROL" }>,
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const brain = actorCheck.unit;
  // Row 1: a controlled Brain has no Mind Control (its role rule drops it,
  // `MIND_CONTROLLED_LOST_ABILITIES_V7`), so it is `UNIT_ROLE_INVALID`.
  if (!unitRoleRuleV7(state, brain).abilities.includes("MIND_CONTROL"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: brain.role });
  if (
    brain.activation.overrunActive ||
    primaryUsed(brain) ||
    primaryActionBlockedAfterMoveV7(state, brain)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: brain.id });
  if (brain.form !== "LAND")
    return rejected(original, "MIND_CONTROL_NOT_LEGAL", { reason: "EMBARKED" });
  if (state.mindControlCooldowns.some((entry) => entry.unitId === brain.id))
    return rejected(original, "MIND_CONTROL_NOT_LEGAL", { reason: "COOLDOWN" });
  if (
    controlledByBrainV7(state.mindControlled, brain.id).length >=
    MIND_CONTROL_LIMIT_V7
  )
    return rejected(original, "MIND_CONTROL_NOT_LEGAL", {
      reason: "CONTROL_LIMIT",
    });
  const target = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  if (target === undefined || !isUnitVisibleToPlayerV7(state, actor, target))
    return rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (!arePlayersHostileV7(state, actor, target.ownerId))
    return rejected(original, "TARGET_ALLIED");
  // The per-target conditions (immunity, already controlled, range, HP,
  // wounded) are shared with the public command query
  // (`mindControlTargetBlockV7`).
  const block = mindControlTargetBlockV7(
    state,
    brain,
    target,
    tileAtV7(state.board, target.at),
  );
  if (block !== null)
    return rejected(original, "MIND_CONTROL_NOT_LEGAL", { reason: block });
  try {
    const controlled: UnitStateV7 = {
      ...target,
      ownerId: actor,
      homeCityId: null,
      captureEligible: false,
      activation: exhaustedActivation(),
    };
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_MIND_CONTROLLED",
        playerId: actor,
        unitId: brain.id,
        targetUnitId: target.id,
        targetOwnerId: target.ownerId,
        targetRole: target.role,
        at: { x: target.at.x, y: target.at.y },
        hp: target.hp,
      },
    ];
    // The target is not removed: no UNIT_DIED, Grave, rising, blast,
    // credit, growth, or Plunder; every status entry stays on its ID.
    const entries = [
      ...state.mindControlled,
      {
        unitId: target.id,
        brainUnitId: brain.id,
        originalOwnerId: target.ownerId,
      },
    ].sort((left, right) => left.unitId - right.unitId);
    const changed = state.units.map((unit) =>
      unit.id === brain.id
        ? {
            ...unit,
            activation: {
              ...unit.activation,
              specialActed: true,
              handled: true,
            },
          }
        : unit.id === target.id
          ? controlled
          : unit,
    );
    // Section 3 step 3: when the target is a Brain (duplicate Martian
    // seats only), the units it controlled are released.
    const release = releaseControlledV7(
      changed,
      state.burrowed,
      entries,
      state.players,
      events,
    );
    const units = [...release.units].sort((left, right) => left.id - right.id);
    const mindControlled = release.mindControlled;
    const sightState = { ...state, units, mindControlled } as GameStateV7;
    const reveal = revealRadius(
      sightState,
      actor,
      controlled.at,
      unitSightRadiusAtV7(sightState, controlled),
    );
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    const staged = graveActionTail(
      {
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        players: setExplored(state.players, actor, reveal.explored),
        units,
        burrowed: release.burrowed,
        mindControlled,
        mindControlCooldowns: [
          ...state.mindControlCooldowns,
          { unitId: brain.id, turnsRemaining: MIND_CONTROL_COOLDOWN_TURNS_V7 },
        ].sort((left, right) => left.unitId - right.unitId),
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
 * The Martian revision `TRACTOR_BEAM` (section 8.4; the balance revision
 * `pulp_wars-1wy.3`, RULESET_7_BALANCE_MARTIAN_ICE.md sections 5.2 and
 * 5.3), the mirror of Push. The Saucer's is a primary action: a visible own
 * or hostile unit exactly `TRACTOR_BEAM_RANGE_V7` tiles away (not an Egg, a
 * `JUGGERNAUT`-role unit, or a two-slot unit) is pulled one tile toward it.
 * The Mothership's Heavy Tractor Beam is free once a turn (it may have
 * moved and used its primary action), reaches 2 to
 * `HEAVY_TRACTOR_RANGE_V7`, and pulls up to `HEAVY_TRACTOR_PULL_V7` tiles,
 * stopping next to the Mothership or at the first tile that fails. Every
 * step passes the Push conditions, is explored by the actor, and holds no
 * treasure chest. It deals no damage and changes nothing on any tile. The
 * rule, the readiness, the target test, the step test, and the path are the
 * functions the public command query uses.
 */
function applyTractorBeam(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "TRACTOR_BEAM" }>,
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const mothership = actorCheck.unit;
  const rule = tractorBeamRuleV7(state, mothership);
  if (rule === null)
    return rejected(original, "UNIT_ROLE_INVALID", { role: mothership.role });
  if (
    !tractorBeamActorReadyV7(state, mothership, rule, state.tractorUsedThisTurn)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: mothership.id });
  if (mothership.form !== "LAND")
    return rejected(original, "TRACTOR_BEAM_NOT_LEGAL", { reason: "EMBARKED" });
  const target = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  if (target === undefined || !isUnitVisibleToPlayerV7(state, actor, target))
    return rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (arePlayersAlliedV7(state, actor, target.ownerId))
    return rejected(original, "TARGET_ALLIED");
  const block = tractorBeamTargetBlockV7(
    state,
    rule,
    mothership,
    target,
    unitHeldByCityWallsV7(state.cities, target),
  );
  if (block !== null)
    return rejected(original, "TRACTOR_BEAM_NOT_LEGAL", { reason: block });
  const player = requirePlayer(state, actor);
  // The technology the pull assumes for the target is read once, from the
  // tile it stands on before the pull.
  const technology = tractorBeamTargetTechnologyV7(
    target.ownerId === actor,
    player.researchedTechs,
    tileAtV7(state.board, target.at)?.terrain,
  );
  const path = tractorBeamPathV7(rule, mothership.at, target.at, (step) => {
    const tile = tileAtV7(state.board, step);
    if (tile === undefined) return false;
    const territoryOwner =
      tile.territoryCityId === null
        ? undefined
        : state.cities.find((city) => city.id === tile.territoryCityId)
            ?.ownerId;
    return tractorBeamStepLegalV7(state, target, technology, {
      explored: isExplored(player, step),
      site: tile.site,
      terrain: tile.terrain,
      ice: isIceAtV7(state, step),
      // The Dwarf revision section 5.3: the occupancy predicate.
      occupied: tileOccupiedV7(state, step, target.id),
      chest: state.treasureChests.some((chest) => same(chest, step)),
      alliedTerritory:
        territoryOwner !== undefined &&
        arePlayersAlliedV7(state, target.ownerId, territoryOwner),
    });
  });
  const to = path.at(-1);
  if (to === undefined)
    return rejected(original, "TRACTOR_BEAM_NOT_LEGAL", { reason: "BLOCKED" });
  try {
    const from = target.at;
    const units = state.units.map((unit) =>
      unit.id === target.id
        ? { ...unit, at: to, captureEligible: false }
        : unit.id === mothership.id && !rule.free
          ? {
              ...unit,
              activation: {
                ...unit.activation,
                specialActed: true,
                handled: true,
              },
            }
          : unit,
    );
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_PULLED",
        sourceUnitId: mothership.id,
        targetUnitId: target.id,
        from,
        to,
        path,
      },
    ];
    let players = state.players;
    // The pulled unit reveals its sight from the destination for its owner:
    // an own target for the actor, and (the Martian pass, `pulp_wars-w49.14`,
    // 7r52) a hostile target for the player it belongs to, as a pushed unit
    // does (it explores with its ordinary sight radius from the tile it is
    // pulled to). A neutral unit has no owner to reveal for.
    if (!isNeutralOwnerV7(target.ownerId)) {
      const pulled = requireValue(units.find((unit) => unit.id === target.id));
      const sightState = { ...state, units } as GameStateV7;
      const reveal = revealRadius(
        sightState,
        target.ownerId,
        to,
        unitSightRadiusAtV7(sightState, pulled),
      );
      players = setExplored(players, target.ownerId, reveal.explored);
      if (reveal.revealed.length > 0)
        events.push({
          kind: "TILES_REVEALED",
          playerId: target.ownerId,
          tiles: reveal.revealed,
        });
    }
    const staged = graveActionTail(
      {
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        players,
        units,
        // The Heavy Tractor Beam is free once a turn: the per-turn fact.
        tractorUsedThisTurn: rule.free
          ? [...state.tractorUsedThisTurn, mothership.id].sort(
              (left, right) => left - right,
            )
          : state.tractorUsedThisTurn,
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
 * The Ice Folk revision (section 7.3): `THROW_BOLAS`. Rejections in the
 * order of the section's table; the result applies Chill to the target, and
 * the Sled has used its primary action.
 */
function applyThrowBolas(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "THROW_BOLAS" }>,
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const sled = actorCheck.unit;
  if (!unitRoleRuleV7(state, sled).abilities.includes("BOLAS"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: sled.role });
  if (
    sled.activation.overrunActive ||
    primaryUsed(sled) ||
    primaryActionBlockedAfterMoveV7(state, sled)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: sled.id });
  if (sled.form !== "LAND")
    return rejected(original, "BOLAS_NOT_LEGAL", { reason: "EMBARKED" });
  const target = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  if (target === undefined || !isUnitVisibleToPlayerV7(state, actor, target))
    return rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (!arePlayersHostileV7(state, actor, target.ownerId))
    return rejected(original, "TARGET_ALLIED");
  if (!canBeChilledV7(state, actor, target))
    return rejected(original, "BOLAS_NOT_LEGAL", { reason: "TARGET_IMMUNE" });
  if (!withinBolasRangeV7(sled.at, target.at))
    return rejected(original, "BOLAS_NOT_LEGAL", { reason: "OUT_OF_RANGE" });
  try {
    const applied = withChillAppliedV7(state.chilled, [target.id]);
    return accepted(
      checked({
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        chilled: applied.chilled,
        units: state.units.map((unit) =>
          unit.id === sled.id
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
      }),
      [unitsChilledEventV7(actor, sled.id, "BOLAS", applied.results)],
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

/**
 * The Ice Folk revision (section 6.4): `COLD_SNAP`. The Witch applies Chill
 * to every unit she can Chill that her owner sees within 2 tiles, and has
 * used her primary action.
 */
function applyColdSnap(
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
  const witch = actorCheck.unit;
  if (!unitRoleRuleV7(state, witch).abilities.includes("COLD_SNAP"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: witch.role });
  if (
    witch.activation.overrunActive ||
    primaryUsed(witch) ||
    primaryActionBlockedAfterMoveV7(state, witch)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: witch.id });
  if (witch.form !== "LAND")
    return rejected(original, "COLD_SNAP_NOT_LEGAL", { reason: "EMBARKED" });
  const targets = coldSnapTargetsV7(
    state,
    witch,
    state.units.filter((unit) => isUnitVisibleToPlayerV7(state, actor, unit)),
  );
  if (targets.length === 0)
    return rejected(original, "COLD_SNAP_NOT_LEGAL", { reason: "NO_TARGET" });
  try {
    const applied = withChillAppliedV7(
      state.chilled,
      targets.map((unit) => unit.id),
    );
    return accepted(
      checked({
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        chilled: applied.chilled,
        units: state.units.map((unit) =>
          unit.id === witch.id
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
      }),
      [unitsChilledEventV7(actor, witch.id, "COLD_SNAP", applied.results)],
    );
  } catch (cause) {
    return arithmeticFailure(original, cause);
  }
}

/**
 * The naval branch, the frozen sea
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.4): `FREEZE`. An Ice
 * Folk land unit turns the water next to it to ice: two tiles out in a
 * straight line from `at` (the Ice Witch: every tile around her, with `at`
 * her own tile). It is a primary action, not an Attack, and costs no Coins.
 * Every tile of the freeze set gets (or refreshes) an entry owned by the
 * actor, and with Icebound a hostile afloat unit on a frozen tile is locked
 * in the ice. A Freeze moves no unit and touches no dock.
 */
function applyFreeze(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "FREEZE" }>,
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const unit = actorCheck.unit;
  if (
    unit.form !== "LAND" ||
    !unitRoleRuleV7(state, unit).abilities.includes("FREEZE")
  )
    return rejected(original, "UNIT_ROLE_INVALID", { role: unit.role });
  const player = requirePlayer(state, actor);
  // A unit-level unlock (the Mind Control revision section 5.2): the
  // controller's research through the unit's kind's tree.
  const capabilities = unitCapabilitiesV7(state, unit, player.researchedTechs);
  if (capabilities.freezeWater === "NONE")
    return rejected(original, "TECH_REQUIRED", { tech: "SHORECRAFT" });
  if (
    unit.activation.overrunActive ||
    primaryUsed(unit) ||
    primaryActionBlockedAfterMoveV7(state, unit)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: unit.id });
  const ring = unitFreezesRingV7(state, unit);
  if (ring ? !same(command.at, unit.at) : chebyshev(command.at, unit.at) !== 1)
    return rejected(original, "FREEZE_NOT_LEGAL", { reason: "OUT_OF_RANGE" });
  const frozen = freezeSetV7({
    from: unit.at,
    at: command.at,
    ring,
    freezeWater: capabilities.freezeWater,
    icebound: capabilities.icebound,
    tileAt: (at) => {
      const tile = tileAtV7(state.board, at);
      if (tile === undefined) return undefined;
      const occupant = state.units.find(
        (candidate) => candidate.hp > 0 && same(candidate.at, at),
      );
      return {
        explored: isExplored(player, at),
        terrain: tile.terrain,
        improvement: tile.improvement,
        ice: isIceAtV7(state, at),
        unit:
          occupant === undefined
            ? null
            : {
                id: occupant.id,
                form: occupant.form,
                hostile: arePlayersHostileV7(state, actor, occupant.ownerId),
              },
      };
    },
  });
  if (frozen.tiles.length === 0)
    return rejected(original, "FREEZE_NOT_LEGAL", { reason: "NO_TARGET" });
  try {
    return accepted(
      checked({
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        ice: withFrozenV7(
          state.ice,
          frozen.tiles,
          actor,
          capabilities.iceTurns,
        ),
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
      }),
      [
        {
          kind: "WATER_FROZEN",
          playerId: actor,
          unitId: unit.id,
          tiles: frozen.tiles,
          icebound: frozen.icebound,
        },
      ],
    );
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
  // Tuning 4 (`pulp_wars-w49.3`): a Land Grant claims only the neutral
  // tiles its owner has explored, and charges for each of them (2 Coins a
  // tile, at least 6). Unexplored tiles stay neutral, so neither the price
  // nor the claim depends on hidden tiles. (Tuning 1 claimed them free.)
  const exploredKeys = new Set(player.explored.map(key));
  const claimed = state.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === null &&
        exploredKeys.has(key(tile.at)) &&
        Math.abs(tile.at.x - city.at.x) <= 2 &&
        Math.abs(tile.at.y - city.at.y) <= 2,
    )
    .map((tile) => tile.at)
    .sort(compareCoords);
  if (claimed.length === 0)
    return rejected(original, "INVALID_TILE", { action: "LAND_GRANT" });
  const cost = landGrantCostV7(claimed.length);
  if (player.coins < cost)
    return rejected(original, "INSUFFICIENT_COINS", { cost });
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
        debit(state.players, actor, cost),
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
        cost,
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
  // Tuning 4 (`pulp_wars-w49.3`): a Human Survey ("Scouts") also grants a
  // Raider. Every reward unit is granted whether or not its city has a free
  // unit slot (a level reward is never lost to a full city); it uses a slot
  // from then on.
  const unitRole =
    command.reward === "MILITIA"
      ? "FIGHTER"
      : command.reward === "JUGGERNAUT"
        ? "JUGGERNAUT"
        : command.reward === "SURVEY" &&
            SURVEY_RAIDERS_V7[requirePlayer(state, actor).faction] === 1
          ? "RAIDER"
          : null;
  try {
    let nextEntityId = state.nextEntityId;
    let players = state.players;
    const board = state.board;
    let cities: readonly CityStateV7[] = state.cities;
    let units = state.units;
    let burrowed = state.burrowed;
    let shields = state.shields;
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
          command.reward === "STOCKPILE" ||
          command.reward === "TREASURY" ||
          command.reward === "TREASURY_6"
            ? CITY_REWARD_COINS_V7[command.reward]
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
      command.reward === "TREASURY_6"
    ) {
      const amount = CITY_REWARD_COINS_V7[command.reward];
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
          amount: BOOM_POPULATION_V7,
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
    }
    // Tuning 4: Barracks is its record alone (`cityBarracksV7` reads it).
    if (unitRole !== null) {
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
      burrowed = spawn.burrowed;
      // The Martian revision: a reward unit arrives at its full Shield.
      shields = withFullShieldsV7(state, shields, [created]);
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
              created,
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
        shields = withFullShieldsV7(state, shields, [companion]);
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
        burrowed,
        shields,
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
  // The Martian revision section 7.3: a land-form walker or flyer whose
  // Move ends (or is stopped or interrupted) on a water tile self-launches:
  // it embarks there with the ordinary result of embarking. No Port needed.
  const movementMode =
    unit.form === "LAND" ? unitMovementModeV7(state, unit) : "GROUND";
  // The frozen sea (naval branch section 10): a machine that ends its Move
  // on ice stands there (no self-launch).
  const selfLaunches =
    movementMode !== "GROUND" &&
    validation.traversedPath.length > 0 &&
    destinationTile?.biome === null &&
    !isIceAtV7(state, validation.destination);
  const embarks = autoEmbarks || selfLaunches;
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
            form: embarks ? ("EMBARKED" as const) : candidate.form,
            captureEligible: false,
            activation: embarks
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
    // Map curiosities (RULESET_7_MAP_CURIOSITIES.md sections 6 and 7): a
    // unit that ends a Move on a Shrine or a Wreck (having moved onto it)
    // claims it, read from its state after the Move (its form included).
    const moved = units.find((candidate) => candidate.id === unit.id);
    const claim =
      moved === undefined ||
      validation.traversedPath.length === 0 ||
      state.curiosities.length === 0
        ? null
        : resolveCuriosityClaimV7(
            { ...state, players, units },
            actor,
            moved,
            validation.destination,
          );
    if (claim !== null) {
      players = claim.state.players;
      units = [...claim.state.units];
    }
    const events: DomainEventV7[] = [];
    // The Martian revision: a flyer never destroys Field Defense by
    // entering a tile (it is not on the ground).
    const occupiesHostileDefense =
      unit.form === "LAND" &&
      !embarks &&
      movementMode !== "FLY" &&
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
    if (embarks)
      events.push({
        kind: "UNIT_EMBARKED",
        playerId: actor,
        unitId: unit.id,
        passengerRole: unit.role,
        from: validation.traversedPath.at(-2) ?? unit.at,
        to: validation.destination,
      });
    if (treasure !== null) events.push(treasure.event);
    if (claim !== null) events.push(...claim.events);
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
      shields: withFullShieldsV7(
        state,
        state.shields,
        treasure?.spawnedUnit == null ? [] : [treasure.spawnedUnit],
      ),
      random: treasure?.random ?? state.random,
      nextEntityId: treasure?.nextEntityId ?? state.nextEntityId,
      treasureChests: treasure?.treasureChests ?? state.treasureChests,
      curiosities: claim?.state.curiosities ?? state.curiosities,
    };
    // The Candy revision section 6.3: a hostile ground unit that ended its
    // Move (an interrupted or an Escape Move included) on Crumbs eats them,
    // right after the Move's own events and before the economy tail.
    if (validation.traversedPath.length > 0)
      staged = resolveCrumbsEatingV7(DWARF_KIT_V7, staged, unit.id, events);
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
  // Tuning 1 (`pulp_wars-w49.3`, 7r46): before round 15 a chest never gives
  // a unit of a tier 3 technology; the seat's `RAIDER`-role unit appears
  // instead (the PRNG draw is unchanged).
  const treasureRole = treasureUnitRoleForRoundV7(
    requirePlayer(state, actor).faction,
    state.round,
  );
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
  // The treasure unit is not created yet: role-level reads of the seat.
  const mechanics = seatRoleMechanicsV7(state, actor, role);
  const slots = mechanics.capacitySlots;
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
  // The Martian revision: the treasure unit's own movement mode decides
  // (a Saucer may be placed on a Mountain), through `canEnterTerrainV7`.
  const movementMode = mechanics.movementMode;
  for (const city of cities)
    for (const candidate of adjacentCoords(state, at)) {
      const tile = tileAtV7(state.board, candidate);
      if (
        tile === undefined ||
        tile.site !== null ||
        !canEnterTerrainV7({
          terrain: tile.terrain,
          movementMode,
          afloat: false,
          engineering: player.researchedTechs.includes("ENGINEERING"),
          navigation: player.researchedTechs.includes("NAVIGATION"),
          mountainBorn: mechanics.mountainBorn,
          // The frozen sea: no treasure unit is placed on ice.
          ice: false,
        }) ||
        // The Dwarf revision section 5.3: the occupancy predicate.
        tileOccupiedV7(state, candidate) ||
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

/**
 * The Dinosaur pass, correction (`pulp_wars-w49.15`, 7r53): after an
 * accepted `ATTACK` by a hatched dinosaur (a land-form unit that grows),
 * its target, when it is still on the board and not the attacker's
 * owner's, is hunted for the rest of the turn: a Caveman's Pack Hunt
 * applies against it wherever it stands (`huntedThisTurn`).
 */
function huntedAfterAttackV7(
  before: GameStateV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  result: ApplyCommandResultV7,
): ApplyCommandResultV7 {
  if (!result.accepted) return result;
  const attacker = before.units.find((unit) => unit.id === command.unitId);
  const hunter =
    attacker !== undefined &&
    attacker.form === "LAND" &&
    unitGrowsV7(before, attacker);
  if (!hunter) return result;
  const target = result.state.units.find(
    (unit) => unit.id === command.targetUnitId,
  );
  if (
    target === undefined ||
    target.hp <= 0 ||
    target.ownerId === attacker.ownerId ||
    result.state.huntedThisTurn.includes(target.id) ||
    result.state.turnOrder[result.state.activeSeatIndex] !== attacker.ownerId
  )
    return result;
  return {
    ...result,
    state: checked({
      ...result.state,
      huntedThisTurn: [...result.state.huntedThisTurn, target.id].sort(
        (left, right) => left - right,
      ),
    }),
  };
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
  // The frozen sea (naval branch section 8.9): an icebound ship is frozen
  // solid and cannot attack.
  if (unitIsIceboundV7(state, attacker))
    return rejected(original, "ATTACK_NOT_LEGAL", { reason: "ICEBOUND" });
  const rule = unitRoleRuleV7(state, attacker);
  // The Dwarf revision section 6.1: a Gyrocopter has no ordinary attack.
  if (rule.abilities.includes("BOMB_RUN") && !rule.abilities.includes("ATTACK"))
    return rejected(original, "UNIT_ROLE_INVALID", { role: attacker.role });
  // The Candy revision section 5.3: a Crashed unit has no primary action.
  if (unitIsCrashedV7(state, attacker.id))
    return rejected(original, "UNIT_CRASHED", { unitId: attacker.id });
  // The Dwarf revision section 7.3: an unmoved Clockwork Gunner's second
  // shot.
  const twinShot = twinShotReadyV7(state, attacker);
  if (
    (!attacker.activation.overrunActive &&
      !twinShot &&
      primaryUsed(attacker)) ||
    (!attacker.activation.overrunActive &&
      !twinShot &&
      attacker.activation.attacksUsed >= 1) ||
    (primaryActionBlockedAfterMoveV7(state, attacker) &&
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
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 5.3):
  // a torpedo targets only units afloat.
  if (attackIsTorpedoV7(state, attacker) && !isAfloatFormV7(defender.form))
    return rejected(original, "ATTACK_NOT_LEGAL", { reason: "NOT_AFLOAT" });
  const distance = chebyshev(attacker.at, defender.at);
  // The Ice Folk revision section 7.2: a Yeti on a Mountain reaches 2. The
  // naval branch section 5.2: a submerged Submarine is attacked only from
  // an adjacent tile.
  if (
    distance < rule.minimumRange ||
    distance >
      attackMaximumRangeV7(
        state,
        attacker,
        tileAtV7(state.board, attacker.at)?.terrain,
      ) ||
    (distance > 1 && unitIsSubmergedV7(state, defender))
  )
    return rejected(original, "TARGET_OUT_OF_RANGE");
  try {
    const exchange = resolveAttackExchangeV7(
      state,
      actor,
      attacker,
      defender,
      rule,
      distance,
    );
    const events = [...exchange.events];
    const settlement = settleCityRewardsV7(
      { ...exchange.state, commandIndex: nextSafe(state.commandIndex) },
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
 * The naval branch `BOARD` (docs/product/RULESET_7_NAVAL_BRANCH.md section
 * 4.2): a ship next to a hostile ship at a third of its maximum HP or less
 * captures it. It is a primary action, not an Attack, and costs no Coins.
 * The prize keeps its ID, role, maximum HP, kills, `veteran`, tile, and
 * every status entry; it becomes the actor's (so its kind follows its new
 * owner), an orphan (`homeCityId` null), exhausted, and patched up to one
 * HP above its boarding line. It is not a kill: no credit, Slayer, Plunder,
 * Grave, or growth.
 */
function applyBoard(
  original: GameStateV7,
  state: GameStateV7,
  actor: PlayerId,
  command: Extract<CommandV7, { kind: "BOARD" }>,
): ApplyCommandResultV7 {
  if (state.commandIndex === Number.MAX_SAFE_INTEGER)
    return rejected(original, "INTEGER_OVERFLOW");
  const actorCheck = validateUnitActor(state, actor, command.unitId);
  if (!actorCheck.ok)
    return rejected(original, actorCheck.code, actorCheck.params);
  const boarder = actorCheck.unit;
  if (boarder.form !== "NAVAL")
    return rejected(original, "BOARD_NOT_LEGAL", { reason: "NOT_A_SHIP" });
  if (
    !unitCapabilitiesV7(
      state,
      boarder,
      ownerResearchedTechsV7(state, boarder.ownerId),
    ).boarding
  )
    return rejected(original, "TECH_REQUIRED", { tech: "SEAMANSHIP" });
  if (
    boarder.activation.overrunActive ||
    primaryUsed(boarder) ||
    primaryActionBlockedAfterMoveV7(state, boarder)
  )
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId: boarder.id });
  // The frozen sea (naval branch section 4.2 row 4a): an icebound ship
  // cannot board (an icebound target may be boarded, and stays icebound).
  if (unitIsIceboundV7(state, boarder))
    return rejected(original, "BOARD_NOT_LEGAL", { reason: "ICEBOUND" });
  const target = state.units.find(
    (unit) => unit.id === command.targetUnitId && unit.hp > 0,
  );
  if (target === undefined || !isUnitVisibleToPlayerV7(state, actor, target))
    return rejected(original, "TARGET_NOT_FOUND", {
      targetUnitId: command.targetUnitId,
    });
  if (!arePlayersHostileV7(state, actor, target.ownerId))
    return rejected(original, "TARGET_ALLIED");
  const block = boardTargetBlockV7(
    boarder,
    target,
    tileAtV7(state.board, target.at)?.terrain,
    ownerResearchedTechsV7(state, actor).includes("NAVIGATION"),
  );
  if (block !== null)
    return rejected(original, "BOARD_NOT_LEGAL", { reason: block });
  try {
    const prize: UnitStateV7 = {
      ...target,
      ownerId: actor,
      homeCityId: null,
      hp: boardedHpV7(target.maxHp),
      captureEligible: false,
      activation: exhaustedActivation(),
    };
    const events: DomainEventV7[] = [
      {
        kind: "SHIP_BOARDED",
        playerId: actor,
        unitId: boarder.id,
        targetUnitId: target.id,
        fromPlayerId: target.ownerId,
        at: { x: target.at.x, y: target.at.y },
        hp: prize.hp,
      },
    ];
    const units = state.units.map((unit) =>
      unit.id === boarder.id
        ? {
            ...unit,
            activation: {
              ...unit.activation,
              specialActed: true,
              handled: true,
            },
          }
        : unit.id === target.id
          ? prize
          : unit,
    );
    const sightState = { ...state, units } as GameStateV7;
    const reveal = revealRadius(
      sightState,
      actor,
      prize.at,
      unitSightRadiusAtV7(sightState, prize),
    );
    if (reveal.revealed.length > 0)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
    const staged = graveActionTail(
      {
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        players: setExplored(state.players, actor, reveal.explored),
        units,
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
 * The resolution of one `ATTACK` exchange after its validation (current
 * rules section 13), shared by the `ATTACK` command and the Monster's
 * attack in the neutral turn (map curiosities section 8.4): damage both
 * ways, retaliation, splash, statuses, kill credit, deaths, Graves,
 * risings, releases, the advance and the Push, death-blast chains, Plunder
 * and the Monster bounty, reveals, and the live economy. It returns the
 * state before the city-reward settlement, the achievements, and the
 * command index (the caller's), with the events in order. `actor` is the
 * attacker's owner; for the Monster it is `NEUTRAL_OWNER_ID_V7`, which has
 * no technology, explores nothing, and is credited nothing.
 */
function resolveAttackExchangeV7(
  state: GameStateV7,
  actor: PlayerId,
  attacker: UnitStateV7,
  defender: UnitStateV7,
  rule: ReturnType<typeof unitRoleRuleV7>,
  distance: number,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const calculated = calculateCombatPreviewV7(state, attacker.id, defender.id);
  const destinationTile = tileAtV7(state.board, defender.at);
  // The advance enters the defender's tile through the shared
  // `canEnterTerrainV7` (a striding Colossus needs no Engineering). Map
  // curiosities (section 8.3): the neutral Monster never advances.
  const canAdvance =
    calculated.advances &&
    !isNeutralOwnerV7(actor) &&
    isExplored(requirePlayer(state, actor), defender.at) &&
    destinationTile !== undefined &&
    ((destinationTile.terrain !== "MOUNTAIN" &&
      !isRiftTerrainV7(destinationTile.terrain)) ||
      canEnterTerrainV7({
        terrain: destinationTile.terrain,
        movementMode: unitMovementModeV7(state, attacker),
        afloat: false,
        engineering: requirePlayer(state, actor).researchedTechs.includes(
          "ENGINEERING",
        ),
        navigation: false,
        mountainBorn: unitIsMountainBornV7(state, attacker),
        // Only a Mountain or a Rift reaches here (an advance onto ice is
        // an advance onto water terrain, admitted above).
        ice: false,
      }));
  // The Candy revision section 8: the Bounce is read after the advance, so
  // an advance the resolution refuses is refused for the Bounce too.
  const preview =
    canAdvance === calculated.advances
      ? calculated
      : {
          ...calculated,
          advances: canAdvance,
          ...bounceStateV7(state, attacker, defender, {
            distance,
            attackerDies: calculated.attackerDies,
            defenderDies: calculated.defenderDies,
            advances: canAdvance,
            pushed: calculated.push === "WILL_PUSH",
          }),
        };
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
      // The Dwarf revision section 8: a Hammerer's or a Mole's advance
      // counts as moving (Dig In).
      moved:
        attacker.activation.moved ||
        (preview.advances && unitRoleMechanicsV7(state, attacker).digsIn),
      attacked: true,
      attacksUsed,
      inspired: false,
      overrunActive: false,
      escapeAvailable: preview.escapeAvailable,
      // The Dwarf revision section 7.3: a Gunner with a second shot left
      // still awaits orders.
      handled: !preview.escapeAvailable && preview.attacksRemaining === 0,
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
  // The ninth unit (7r55): the role mechanic `demolishesFieldDefense` (the
  // `CATAPULT` role of every faction, and the Triceratops in the heavy
  // slot); the reason literal stays `CATAPULT`.
  const defenseReason = destinationTile?.fieldDefense
    ? unitRoleMechanicsV7(state, attacker).demolishesFieldDefense
      ? "CATAPULT"
      : // The Ice Folk revision section 7.5: Trample, whatever survives.
        attacker.form === "LAND" &&
          unitRoleMechanicsV7(state, attacker).tramplesFieldDefense
        ? "TRAMPLE"
        : preview.inspiredApplied && distance === 1 && !preview.attackerDies
          ? "INSPIRED"
          : // Tuning 1 Breach (7r46): whether or not the attacker survives.
            attackBreachesV7(
                state,
                attacker,
                distance,
                ownerResearchedTechsV7(state, actor),
              )
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
    cause: "ATTACK" | "SPLASH" | "RETALIATION" | "SHATTER",
  ): void => {
    const bite = biteOfV7(state, victim.id);
    // The Rift (RULESET_7_RIFT.md section 4): nothing rises on a Rift.
    if (
      bite === undefined ||
      victim.form !== "LAND" ||
      noRisingAtV7(state.board, victim.at)
    ) {
      // The Ice Folk revision section 5.5: a shattered unit leaves no
      // Grave (the Candy revision section 12.6: it leaves its Crumbs).
      if (cause === "SHATTER") {
        events.push({ kind: "UNIT_DIED", unitId: victim.id, cause });
        recordCrumbsV7(state, victim, cause, events);
      } else graves = recordCombatDeathV7(state, graves, victim, cause, events);
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
  else if (preview.defenderDies)
    died(defender, preview.shatters ? "SHATTER" : "ATTACK");
  for (const splash of preview.splash)
    if (splash.dies)
      died(
        requireValue(state.units.find((unit) => unit.id === splash.unitId)),
        "SPLASH",
      );
  if (preview.attackerInfected) infect(defender, attacker, "RETALIATION");
  else if (preview.attackerDies) died(attacker, "RETALIATION");
  // The Mind Control revision section 4.2: the controlled units of a Brain
  // that just left the board are released right after its death events
  // and before the advance, the Push, and any chain.
  const release = releaseControlledV7(
    units,
    state.burrowed,
    state.mindControlled,
    state.players,
    events,
  );
  units = [...release.units];
  // Sections 5.3 and 6.2: the Shields the exchange spent, and the Cooling
  // a full-power ray starts.
  const shields = withShieldDamageV7(
    state.shields,
    new Map([
      [defender.id, preview.defenderShieldDamage],
      [attacker.id, preview.attackerShieldDamage],
      ...preview.splash.map(
        (entry) => [entry.unitId, entry.shieldDamage] as const,
      ),
    ]),
  );
  const cooling =
    preview.coolingApplied && !preview.attackerDies
      ? withFiredRayV7(state.cooling, attacker.id)
      : state.cooling;
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
  // Revision 20 section 2.3: the Push, then the advance (after a kill) or
  // the follow (a Charge! after a Push). Only a Charge! emits both.
  if (pushDestination !== null)
    events.push({
      kind: "UNIT_PUSHED",
      sourceUnitId: attacker.id,
      targetUnitId: defender.id,
      from: defender.at,
      to: pushDestination,
    });
  if (preview.advances)
    events.push({
      kind: "UNIT_MOVED",
      unitId: attacker.id,
      path: [defender.at],
    });
  // The Candy revision section 7: a Pie Launcher's surviving target is
  // Splatted for the rest of the active seat's turn.
  const splattedThisTurn = preview.splatApplied
    ? withUnitIdV7(state.splattedThisTurn, defender.id)
    : state.splattedThisTurn;
  // The ninth unit (7r55): the Thagomizer Cracks a surviving target for the
  // rest of the active seat's turn; Frostbite Chills a surviving attacker of
  // a Musk Ox.
  const ninthUnit = preview.crackApplied
    ? {
        ...state.ninthUnit,
        crackedThisTurn: withSortedUnitIdV7(
          state.ninthUnit.crackedThisTurn,
          defender.id,
        ),
      }
    : state.ninthUnit;
  let chilled = state.chilled;
  if (preview.frostbiteApplied) {
    const applied = withChillAppliedV7(state.chilled, [attacker.id]);
    chilled = applied.chilled;
    events.push(
      unitsChilledEventV7(
        defender.ownerId,
        defender.id,
        "FROSTBITE",
        applied.results,
      ),
    );
  }
  // The Candy revision section 8: the Bounce, after the Push, the advance,
  // and the Charge! follow and before any death-blast chain. It is not a
  // Move: the attacker keeps its activation and reveals its sight.
  let bouncePlayers = visiblePlayers;
  if (preview.bounce === "WILL_BOUNCE" && preview.bounceTo !== null) {
    const bounceTo = preview.bounceTo;
    const bounced = requireValue(units.find((unit) => unit.id === attacker.id));
    events.push({
      kind: "UNIT_PUSHED",
      sourceUnitId: defender.id,
      targetUnitId: attacker.id,
      from: bounced.at,
      to: bounceTo,
    });
    attackerAfter = { ...bounced, at: bounceTo };
    units = units.map((unit) =>
      unit.id === attacker.id ? attackerAfter : unit,
    );
    const bounceState = {
      ...state,
      board,
      players: visiblePlayers,
      units,
    } as GameStateV7;
    const reveal = revealRadius(
      bounceState,
      actor,
      bounceTo,
      unitSightRadiusAtV7(bounceState, attackerAfter),
    );
    bouncePlayers = setExplored(visiblePlayers, actor, reveal.explored);
    if (reveal.revealed.length)
      events.push({
        kind: "TILES_REVEALED",
        playerId: actor,
        tiles: reveal.revealed,
      });
  }
  // Revision 17 section 6.7: the exploding units among the defender, the
  // splash victims, and the attacker explode after the attack's deaths,
  // risings, advance, and Push; Overrun (Ram) is evaluated afterwards.
  const initialExplosions: {
    readonly unit: UnitStateV7;
    readonly cause: ExplosionCauseV7;
  }[] = [];
  // The Ice Folk revision section 5.5: a shattered unit never explodes.
  if (
    preview.defenderDies &&
    !preview.shatters &&
    isExplodingUnitV7(state, defender)
  )
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
    {
      units,
      board,
      graves,
      nextEntityId,
      bitten,
      shields,
      mindControlled: release.mindControlled,
      burrowed: release.burrowed,
    },
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
  // The Candy revision section 5.4: a Rushed Chocolate Bunny's Sugar Frenzy is
  // an Overrun capped at `SUGAR_FRENZY_MAX_CONTINUATIONS_V7` continuations.
  const overrunKind = overrunKindV7(state, attacker, rule);
  const overrunContinues =
    overrunMayContinueV7(overrunKind, attacksUsed) &&
    preview.advances &&
    !preview.attackerDies &&
    survivor !== undefined &&
    // The Mind Control revision: a controlled attacker released by the
    // chain is no longer the actor's.
    survivor.ownerId === actor &&
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
    attacksRemaining:
      overrunContinues || preview.attacksRemaining === 1 ? 1 : 0,
    overrunAdvance: overrunKind !== null && preview.advances,
    overrunContinues,
  };
  events.unshift({ kind: "COMBAT_RESOLVED", preview: finalPreview });
  // Revision 17 Plunder (sections 6.8 and 7.4): the attacker's owner is
  // credited with the defender and splash deaths, the defender's owner with
  // a retaliation death, and each exploding unit's owner with its blast's
  // deaths; a victim that rises still counts as killed.
  const plunder = plunderAwardsV7(state, bouncePlayers, [
    ...(preview.defenderDies
      ? [
          {
            creditedId: attacker.ownerId,
            victimOwnerId: defender.ownerId,
            victimUnitId: defender.id,
          },
        ]
      : []),
    ...preview.splash.flatMap((entry) =>
      entry.dies
        ? [
            {
              creditedId: attacker.ownerId,
              victimOwnerId: requireValue(
                state.units.find((unit) => unit.id === entry.unitId),
              ).ownerId,
              victimUnitId: entry.unitId,
            },
          ]
        : [],
    ),
    ...(preview.attackerDies
      ? [
          {
            creditedId: defender.ownerId,
            victimOwnerId: attacker.ownerId,
            victimUnitId: attacker.id,
          },
        ]
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
  return {
    state: {
      ...state,
      board,
      nextEntityId,
      players,
      cities: economy.cities,
      units,
      burrowed: chain.burrowed,
      mindControlled: chain.mindControlled,
      graves,
      plagued,
      bitten,
      shields: chain.shields,
      cooling,
      splattedThisTurn,
      ninthUnit,
      chilled,
      populationContributions: economy.populationContributions,
    },
    events,
  };
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
  // The Candy revision section 5.3: a Crashed Confectioner cannot Frost.
  if (unitIsCrashedV7(state, captain.id))
    return rejected(original, "UNIT_CRASHED", { unitId });
  if (primaryUsed(captain) || primaryActionBlockedAfterMoveV7(state, captain))
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
  // The Martian pass, correction: a Brain commands every second turn.
  const rallyCools = unitRoleMechanicsV7(state, result.captain).rallyCools;
  if (rallyCools && isCoolingV7(state.cooling, result.captain.id))
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  // Revision 13 Frenzy eligibility: Rally targets also need ATTACK, which
  // every Human non-support, non-siege land role has. Goblin explosions and
  // Berserk (`pulp_wars-w49.35`): the Orc Warboss's Berserk reaches radius 2
  // and every own land-form unit that has not moved and is not Berserk yet.
  const targets = state.units
    .filter((unit) => isRallyTargetV7(state, result.captain, unit))
    .sort((a, b) => a.id - b.id);
  if (targets.length === 0) return rejected(original, "HEAL_TARGET_NOT_FOUND");
  const ids = new Set(targets.map((unit) => unit.id));
  const berserk =
    unitRoleMechanicsV7(state, result.captain).rallyEffect === "BERSERK";
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      berserkThisTurn: berserk
        ? [...state.berserkThisTurn, ...ids].sort((a, b) => a - b)
        : state.berserkThisTurn,
      cooling: rallyCools
        ? withFiredRayV7(state.cooling, result.captain.id)
        : state.cooling,
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
          : ids.has(unit.id) && !berserk
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
  // plagued or bitten unit is a target even at full HP. The Ice Folk
  // revision section 10.5: it cures Chill too (the entry becomes thawing).
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
          bittenIds.has(unit.id) ||
          isChilledV7(state.chilled, unit.id)) &&
        !unit.activation.tendedThisTurn &&
        chebyshev(result.captain.at, unit.at) === 1,
    )
    .sort((a, b) => a.id - b.id);
  // Dwarf crowd control (`pulp_wars-w49.33`): an Engineer's Repair also
  // mends the damaged own Barricades next to it, like a machine.
  const repairs = barricadeRepairsV7(
    state,
    barricadesOfV7(state),
    result.captain,
  );
  if (targets.length === 0 && repairs.length === 0)
    return rejected(original, "HEAL_TARGET_NOT_FOUND");
  // The Dwarf revision section 9.1: an Engineer's Repair heals a machine 4.
  const machineHeal = unitRoleMechanicsV7(
    state,
    result.captain,
  ).repairMachineHeal;
  // The Dinosaur pass, correction: a Shaman heals a hatched dinosaur 4.
  const growingHeal = unitRoleMechanicsV7(
    state,
    result.captain,
  ).tendGrowingHeal;
  const amounts = new Map(
    targets.map(
      (unit) =>
        [
          unit.id,
          Math.min(
            machineHeal !== null && unitIsMachineV7(state, unit)
              ? machineHeal
              : growingHeal !== null && unitGrowsV7(state, unit)
                ? growingHeal
                : 2,
            unit.maxHp - unit.hp,
          ),
        ] as const,
    ),
  );
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      plagued: state.plagued.filter((entry) => !amounts.has(entry.unitId)),
      bitten: state.bitten.filter((entry) => !amounts.has(entry.unitId)),
      chilled: targets.reduce(
        (chilled, unit) => withChillCuredV7(chilled, unit.id),
        state.chilled,
      ),
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
      barricades: withBarricadesRepairedV7(barricadesOfV7(state), repairs),
    }),
    [
      ...(targets.length === 0
        ? []
        : [
            {
              kind: "WOUNDED_TENDED" as const,
              captainId: result.captain.id,
              results: targets.map((unit) => ({
                unitId: unit.id,
                amount: amounts.get(unit.id) ?? 0,
                hpAfter: unit.hp + (amounts.get(unit.id) ?? 0),
                curedPlague: plaguedIds.has(unit.id),
                curedBitten: bittenIds.has(unit.id),
                curedChill: isChilledV7(state.chilled, unit.id),
              })),
            },
          ]),
      ...repairs.map((repair) => ({
        kind: "BARRICADE_REPAIRED" as const,
        playerId: actor,
        unitId: result.captain.id,
        at: repair.at,
        amount: repair.amount,
        hpAfter: repair.hpAfter,
      })),
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
    primaryActionBlockedAfterMoveV7(state, unit)
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
 * Revision 13 Raise Dead (section 6.2): every eligible Grave within
 * `RAISE_DEAD_RADIUS_V7` (the Undead pass, correction: 2 tiles, 1 before)
 * becomes an exhausted 5-HP Skeleton rising with no home city (it fills no
 * unit slot), in (y, x) order with consecutive unit IDs.
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
  // The Dwarf revision section 5.3: a Grave under a mound cannot be raised
  // (every burrowed record stands on its mound tile).
  // The Undead pass, correction (`pulp_wars-w49.13`): Raise Dead reaches
  // two tiles, and only Graves on tiles the raiser's owner has explored
  // (the public view lists exactly those, and every unit on an explored
  // tile is visible, so the public preview and this agree exactly).
  const raiser = requirePlayer(state, actor);
  const graves = raiseDeadGravesV7(
    state.graves.filter((grave) => isExplored(raiser, grave)),
    allOwnedUnitsV7(state),
    necromancer.at,
  );
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
        // The Undead pass, correction (`pulp_wars-w49.13`): a raised
        // Skeleton has no home city, so it fills no unit slot.
        homeCityId: null,
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
  // The Candy revision section 5.3: a Crashed unit has no primary action
  // (it still recovers idle at End Turn).
  if (unitIsCrashedV7(state, unit.id))
    return rejected(original, "UNIT_CRASHED", { unitId });
  if (primaryUsed(unit) || unit.activation.moved)
    return rejected(original, "UNIT_ALREADY_ACTED", { unitId });
  // The Dwarf revision section 7.2: clockwork never mends itself.
  if (unitIsConstructV7(state, unit))
    return rejected(original, "RECOVER_NOT_LEGAL", { reason: "CONSTRUCT" });
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
  const amount = recoveryGainV7(recoveryFacts(state, unit));
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
  // Revision 19: a Dinosaur unit grows instead and is never promoted. The
  // Mind Control revision section 4.1: a controlled unit is promoted by its
  // kind's rules like any own unit.
  if (
    unit.form === "EMBARKED" ||
    unit.veteran ||
    unit.kills < PROMOTION_KILLS_V7 ||
    unitGrowsV7(state, unit)
  )
    return rejected(original, "PROMOTION_NOT_ELIGIBLE", { unitId });
  // Revision 20 section 5: a promotion fully heals (`hp` is the new maximum).
  const maxHp = unit.maxHp + PROMOTION_HP_V7;
  if (
    !Number.isSafeInteger(maxHp) ||
    state.commandIndex >= Number.MAX_SAFE_INTEGER
  )
    return rejected(original, "INTEGER_OVERFLOW");
  return accepted(
    checked({
      ...state,
      commandIndex: nextSafe(state.commandIndex),
      units: state.units.map((candidate) =>
        candidate.id === unitId
          ? { ...candidate, veteran: true, maxHp, hp: maxHp }
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
  // The Martian revision section 7.2: a flyer cannot Pillage.
  if (
    unit.form !== "LAND" ||
    unit.role === "JUGGERNAUT" ||
    unitFliesV7(state, unit)
  )
    return rejected(original, "PILLAGE_INVALID_TARGET");
  // The Candy revision section 5.3: a Crashed unit has no primary action.
  if (unitIsCrashedV7(state, unit.id))
    return rejected(original, "UNIT_CRASHED", { unitId });
  if (primaryUsed(unit) || sluggishUnitMovedV7(state, unit))
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
    // Tuning 4 (`pulp_wars-w49.3`): a Pillage pays `PILLAGE_COINS_V7` (1
    // before), and a unit with Escape (the Raider) keeps its one Move
    // after it, as after an attack.
    const coins = player.coins + PILLAGE_COINS_V7;
    if (!Number.isSafeInteger(coins)) throw new RangeError("INTEGER_OVERFLOW");
    const recalc = recomputeLiveEconomyV7(
      state,
      { board, cities: state.cities },
      contributions,
    );
    const escapes =
      unitRoleRuleV7(state, unit).abilities.includes("ESCAPE") &&
      !unit.activation.escapeAvailable &&
      !unit.activation.attacked;
    const units = state.units.map((item) =>
      item.id === unit.id
        ? {
            ...item,
            activation: {
              ...item.activation,
              specialActed: true,
              escapeAvailable: escapes,
              handled: !escapes,
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
        coinDelta: PILLAGE_COINS_V7,
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
    isRiftTerrainV7(tile.terrain) ||
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
      // Tuning 1 (`pulp_wars-w49.3`, 7r46): building no longer uses the
      // unit's turn. The unit keeps its Move and its primary action; it
      // still must not have moved or acted before building.
      players: debit(state.players, actor, 3),
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
  // The Martian pass, correction (`pulp_wars-w49.14`): `DISBAND` on a
  // mind-controlled unit is **Release**: it returns to its owner where it
  // stands (exhausted, as when its Brain is lost) and pays no Coins; with
  // its owner out of the game it is removed. The Brain is free to take
  // another unit once its cooldown is over. Needs no technology and no
  // unused action. (A tester's 3-HP Swordsman blocked a Brain for six
  // rounds.)
  if (isMindControlledV7(state, unitId)) {
    const events: DomainEventV7[] = [];
    const release = releaseControlledV7(
      state.units,
      state.burrowed,
      state.mindControlled,
      state.players,
      events,
      unitId,
    );
    return accepted(
      checked({
        ...state,
        commandIndex: nextSafe(state.commandIndex),
        units: release.units,
        burrowed: release.burrowed,
        mindControlled: release.mindControlled,
      }),
      events,
    );
  }
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
    const events: DomainEventV7[] = [
      {
        kind: "UNIT_DISBANDED",
        playerId: actor,
        unitId,
        role: actorCheck.unit.role,
        coinDelta: refund,
      },
    ];
    // The Mind Control revision section 4.2: disbanding a Brain releases
    // its controlled unit.
    const release = releaseControlledV7(
      state.units.filter((item) => item.id !== unitId),
      state.burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    const afterRemoval = {
      ...state,
      units: release.units,
      burrowed: release.burrowed,
      mindControlled: release.mindControlled,
    };
    const next = checked({
      ...afterRemoval,
      commandIndex: nextSafe(state.commandIndex),
      players: state.players.map((item) =>
        item.id === actor ? { ...item, coins } : item,
      ),
    });
    return accepted(next, events);
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
  // The Candy revision section 5.3: a Crashed unit cannot capture.
  if (unitIsCrashedV7(state, unit.id))
    return rejected(original, "UNIT_CRASHED", { unitId });
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
              // The Mind Control revision section 4.1: a controlled unit
              // stays homeless, even after a capture it makes.
              homeCityId: isMindControlledV7(state, item.id)
                ? null
                : captured.id,
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
    // The Dwarf revision section 5.5: a burrowed unit homed to the captured
    // city is orphaned like any unit.
    let burrowed: GameStateV7["burrowed"] = state.burrowed.map((entry) =>
      formerOwner !== null && entry.unit.homeCityId === captured.id
        ? { ...entry, unit: { ...entry.unit, homeCityId: null } }
        : entry,
    );
    // The Mind Control revision section 4.3: before an eliminated seat's
    // units are removed, its controlled units are released (to a living
    // original owner, else removed with `BRAIN_LOST`).
    const releaseEvents: DomainEventV7[] = [];
    let mindControlled = state.mindControlled;
    if (eliminatesFormerOwner && mindControlled.length > 0) {
      // Its Brains leave first: every unit of the seat except the ones it
      // controls is taken out for the release test.
      const controlledIds = new Set(
        mindControlled.map((entry) => entry.unitId),
      );
      const release = releaseControlledV7(
        units.filter(
          (item) => item.ownerId !== formerOwner || controlledIds.has(item.id),
        ),
        burrowed,
        mindControlled,
        players,
        releaseEvents,
      );
      const releasedById = new Map(
        release.released.map((item) => [item.id, item] as const),
      );
      const removedIds = new Set(release.removed.map((item) => item.id));
      units = units
        .filter((item) => !removedIds.has(item.id))
        .map((item) => releasedById.get(item.id) ?? item);
      burrowed = release.burrowed;
      mindControlled = release.mindControlled;
    }
    // The Dwarf revision section 5.2: every unit of an eliminated seat dies
    // with it, burrowed units included (an all-units read).
    const eliminatedUnits = eliminatesFormerOwner
      ? [...allOwnedUnitsV7({ units, burrowed }, formerOwner)].sort(
          (a, b) => a.id - b.id,
        )
      : [];
    if (eliminatesFormerOwner) {
      units = units.filter((item) => item.ownerId !== formerOwner);
      burrowed = burrowed.filter((entry) => entry.unit.ownerId !== formerOwner);
    }
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
      // Revision 21 Conqueror: this CAPTURE took another player's city.
      // The economy rejig (7r54): a city founded as a capital, and not the
      // captor's own first capital taken back.
      formerOwner !== null &&
        captured.isCapital &&
        state.players.find((item) => item.id === actor)
          ?.originalCapitalCityId !== captured.id,
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
        ...releaseEvents,
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
        burrowed,
        mindControlled,
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
    const expiredUnits: GameStateV7 = {
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
    // The Martian revision: the Cooling step (section 6.2), then the Force
    // Fields recharge (section 5.5), after idle recovery and the expiry of
    // Inspired and Overrun and before the income preview.
    const cooled = coolingStepV7(expiredUnits, actor);
    const fields = rechargeShieldsAtEndTurnV7(cooled, actor);
    // The Ice Folk revision section 5.4: the Chill countdown of the
    // player's units, after the Force Fields recharge (no event).
    // The Dwarf revision (sections 5.4 and 6.3): the per-turn lists of the
    // active seat are emptied after the Chill countdown.
    const chillCounted = chillCountdownV7(fields.state, actor);
    // The frozen sea (naval branch section 8.5): the thaw, after the Chill
    // countdown and before the income preview.
    const thaw = resolveThawV7(chillCounted, actor);
    const counted = thaw.state;
    // The Martian balance revision (`pulp_wars-1wy.3`): so are the beamed
    // passengers and the used free Tractor Beams.
    const emptied =
      counted.surfacedThisTurn.length === 0 &&
      counted.bombedThisTurn.length === 0 &&
      counted.beamedThisTurn.length === 0 &&
      counted.tractorUsedThisTurn.length === 0 &&
      counted.huntedThisTurn.length === 0 &&
      counted.berserkThisTurn.length === 0
        ? counted
        : {
            ...counted,
            surfacedThisTurn: [],
            bombedThisTurn: [],
            beamedThisTurn: [],
            tractorUsedThisTurn: [],
            // The Dinosaur pass, correction: the hunted units (Pack Hunt).
            huntedThisTurn: [],
            // Goblin explosions and Berserk (`pulp_wars-w49.35`): Berserk
            // lasts until the end of the turn.
            berserkThisTurn: [],
          };
    // The Candy revision section 10: the Crash, the Crumbs countdown, and
    // the emptied Splat and Toss lists, after the Dwarf per-turn lists and
    // before the income preview (and any neutral turn).
    const candy = resolveCandyEndTurnV7(emptied, actor);
    // The ninth unit (7r55): the Cracked units and the struck pairs of the
    // turn are emptied with the other per-turn lists.
    const expired = withNinthUnitTurnEndedV7(candy.state);
    const preview = playerIncomeV7(expired, actor);
    const nextIndex = nextActiveSeat(state);
    if (nextIndex === null) return rejected(original, "INVALID_STATE");
    const nextPlayer = state.players.find(
      (item) => item.id === state.turnOrder[nextIndex],
    );
    if (nextPlayer === undefined) return rejected(original, "INVALID_STATE");
    const round =
      nextIndex <= state.activeSeatIndex ? nextSafe(state.round) : state.round;
    // Map curiosities (section 8.5): the neutral turn follows the last
    // seat's turn of the round, before the next round's first Start Turn.
    // A match without a Monster has none.
    const neutral =
      nextIndex <= state.activeSeatIndex && expired.monsters.length > 0
        ? resolveNeutralTurnV7(expired, state.round)
        : null;
    const advanced = resetTurnUnits(
      {
        ...(neutral?.state ?? expired),
        activeSeatIndex: nextIndex,
        round,
      },
      nextPlayer.id,
    );
    // Revision 19 section 6.4: the hatch step runs after Plague and any
    // chain it started, and before Windmill healing.
    // The Martian revision section 5.2: Mind Control cooldowns, then the
    // Shield recharge, run after the reset and before Plague.
    const started = startTurnEconomyV7(advanced, nextPlayer, false, (reset) => {
      const recharge = rechargeShieldsV7(
        mindControlCooldownStepV7(reset, nextPlayer.id),
        nextPlayer.id,
      );
      // The Ice Folk revision section 7.8: the Cold Aura runs after the
      // Shield recharge and before Plague.
      const coldAura = resolveColdAuraV7(recharge.state, nextPlayer.id);
      // The frozen sea (naval branch section 9): Black Ice, then the crush,
      // after the Cold Aura and before Plague.
      const frozen = resolveStartTurnIceV7(coldAura.state, nextPlayer.id);
      const aura =
        frozen.events.length === 0
          ? coldAura
          : {
              state: frozen.state,
              events: [...coldAura.events, ...frozen.events],
            };
      // The Dwarf revision section 5.4: the burrowed Moles surface after the
      // Shield recharge (and the Cold Aura) and before Plague.
      const surfacing = resolveStartTurnSurfacingV7(
        DWARF_KIT_V7,
        aura.state,
        nextPlayer.id,
      );
      const next = surfacing.state;
      const plague = resolveStartTurnPlagueAndChainV7(next, nextPlayer.id);
      const hatched = resolveStartTurnHatchV7(plague.state, nextPlayer.id);
      // The ninth unit (7r55): Rise Again, after the hatch step and before
      // Windmill healing.
      const risen = resolveStartTurnRiseAgainV7(hatched.state, nextPlayer.id);
      const hatch =
        risen.events.length === 0 && risen.state === hatched.state
          ? hatched
          : {
              state: risen.state,
              events: [...hatched.events, ...risen.events],
            };
      const afflicted =
        hatch.events.length === 0 && hatch.state === plague.state
          ? plague
          : { state: hatch.state, events: [...plague.events, ...hatch.events] };
      const before = [...recharge.events, ...aura.events, ...surfacing.events];
      return before.length === 0
        ? afflicted
        : {
            state: afflicted.state,
            events: [...before, ...afflicted.events],
          };
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
        ...fields.events,
        ...thaw.events,
        ...candy.events,
        {
          kind: "INCOME_PREVIEWED",
          playerId: actor,
          totalCoins: preview.totalCoins,
          cities: preview.cities,
        },
        { kind: "TURN_ENDED", playerId: actor },
        ...(neutral?.events ?? []),
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

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 8.5):
 * the neutral turn after the last seat's turn of `round`, inside the
 * `END_TURN` that wraps the round. Each Monster on the board, in unit-ID
 * order, has its activation reset and then attacks the weakest provoker it
 * can reach (stepping first when it must) or wanders (the stateless draw);
 * each attack is resolved with the ordinary exchange before the next
 * Monster acts. Then each surviving Monster regenerates and its
 * `provokedBy` is cleared. The caller adds the blockade and sea-network
 * events of the whole `END_TURN`.
 */
function resolveNeutralTurnV7(
  state: GameStateV7,
  round: number,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const events: DomainEventV7[] = [{ kind: "NEUTRAL_TURN_STARTED", round }];
  let current = state;
  const replace = (unit: UnitStateV7): void => {
    current = {
      ...current,
      units: current.units.map((candidate) =>
        candidate.id === unit.id ? unit : candidate,
      ),
    };
  };
  for (const { unitId } of state.monsters) {
    const entry = monsterEntryV7(current, unitId);
    const found = current.units.find(
      (unit) => unit.id === unitId && unit.hp > 0,
    );
    if (entry === undefined || found === undefined) continue;
    // Step 2: reset its activation.
    let monster: UnitStateV7 = { ...found, activation: freshActivationV7() };
    replace(monster);
    const facts = {
      board: current.board,
      units: current.units,
      burrowed: current.burrowed,
      barricades: barricadesOfV7(current),
      treasureChests: current.treasureChests,
    };
    const choice = monsterAttackChoiceV7(facts, monster, entry);
    if (choice === null) {
      // Section 8.4: no reachable provoker; wander one step or stay.
      const to = monsterWanderV7(
        current.setup.seed,
        round,
        monster.id,
        monsterStepsV7(facts, monster, entry.home),
      );
      monster = {
        ...monster,
        at: to ?? monster.at,
        activation: {
          ...monster.activation,
          moved: to !== null,
          movedPathLength: to === null ? 0 : 1,
          handled: true,
        },
      };
      replace(monster);
      if (to !== null)
        events.push({ kind: "UNIT_MOVED", unitId: monster.id, path: [to] });
      continue;
    }
    if (choice.step !== null) {
      monster = {
        ...monster,
        at: choice.step,
        activation: { ...monster.activation, moved: true, movedPathLength: 1 },
      };
      replace(monster);
      events.push({
        kind: "UNIT_MOVED",
        unitId: monster.id,
        path: [choice.step],
      });
    }
    const target = requireValue(
      current.units.find((unit) => unit.id === choice.target.id),
    );
    const exchange = resolveAttackExchangeV7(
      current,
      NEUTRAL_OWNER_ID_V7,
      monster,
      target,
      unitRoleRuleV7(current, monster),
      chebyshev(monster.at, target.at),
    );
    current = exchange.state;
    events.push(...exchange.events);
  }
  // Step 3: regeneration and the cleared provocation list.
  const pruned = prunedMonstersV7(current);
  const regenerated = new Map<number, number>();
  for (const entry of pruned.monsters) {
    const unit = requireValue(
      pruned.units.find((candidate) => candidate.id === entry.unitId),
    );
    const amount = Math.min(MONSTER_REGENERATION_V7, unit.maxHp - unit.hp);
    if (amount <= 0) continue;
    regenerated.set(unit.id, unit.hp + amount);
    events.push({
      kind: "MONSTER_REGENERATED",
      unitId: unit.id,
      amount,
      hpAfter: unit.hp + amount,
    });
  }
  current = {
    ...pruned,
    units: pruned.units.map((unit) => {
      const hp = regenerated.get(unit.id);
      return hp === undefined ? unit : { ...unit, hp };
    }),
    monsters: pruned.monsters.map((entry) =>
      entry.provokedBy.length === 0 ? entry : { ...entry, provokedBy: [] },
    ),
  };
  events.push({ kind: "NEUTRAL_TURN_ENDED", round });
  return { state: current, events };
}

/**
 * The ninth unit (`pulp_wars-w49.17`, 7r55,
 * docs/product/RULESET_7_NINTH_UNIT.md): Rise Again at the Start Turn of
 * `playerId`. Each Grave marked for that seat, in (y, x) order, that no
 * unit (and no mound) stands on becomes a Wight of the seat at
 * `WIGHT_RISE_AGAIN_HP_V7`: a rising with no home city (it fills no unit
 * slot), no kills, not veteran, and a fresh activation (it acts this turn,
 * like an Egg that hatches at a Start Turn). The Grave and its mark are
 * removed and the Wight joins `risenWights`, so it does not rise again. A
 * Grave something stands on keeps its mark for a later Start Turn. One
 * `WIGHT_RISEN` per Wight, then one `TILES_REVEALED` for the step.
 */
function resolveStartTurnRiseAgainV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const marked = state.ninthUnit.wightGraves.filter(
    (entry) => entry.ownerId === playerId,
  );
  if (marked.length === 0) return { state, events: [] };
  const rule = wightRisingRuleV7(state, playerId);
  if (rule === null) return { state, events: [] };
  const events: DomainEventV7[] = [];
  const revealed: CoordV7[] = [];
  let current = state;
  for (const entry of marked) {
    if (
      !current.graves.some((grave) => same(grave, entry.at)) ||
      tileOccupiedV7(current, entry.at)
    )
      continue;
    const allocation = allocateUnitId(current.nextEntityId);
    const wight: UnitStateV7 = {
      id: allocation.id,
      ownerId: playerId,
      homeCityId: null,
      role: "SWORDSMAN",
      form: "LAND",
      at: { x: entry.at.x, y: entry.at.y },
      hp: rule.hp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: freshActivationV7(),
    };
    current = {
      ...current,
      nextEntityId: allocation.nextEntityId,
      units: [...current.units, wight],
      graves: withoutGravesV7(current.graves, [entry.at]),
      ninthUnit: {
        ...current.ninthUnit,
        wightGraves: current.ninthUnit.wightGraves.filter(
          (candidate) => !same(candidate.at, entry.at),
        ),
        risenWights: withSortedUnitIdV7(
          current.ninthUnit.risenWights,
          wight.id,
        ),
      },
    };
    events.push({
      kind: "WIGHT_RISEN",
      playerId,
      unitId: wight.id,
      at: wight.at,
      hp: wight.hp,
    });
    const reveal = revealRadius(
      current,
      playerId,
      wight.at,
      unitSightRadiusAtV7(current, wight),
    );
    current = {
      ...current,
      players: setExplored(current.players, playerId, reveal.explored),
    };
    revealed.push(...reveal.revealed);
  }
  if (events.length === 0) return { state, events: [] };
  if (revealed.length > 0)
    events.push({
      kind: "TILES_REVEALED",
      playerId,
      tiles: uniqueCoords(revealed),
    });
  // A unit standing on a tile can change the live economy of the city that
  // owns it; a Raise Dead recomputes it too.
  const economy = recomputeLiveEconomyV7(
    current,
    { board: current.board, cities: current.cities, units: current.units },
    current.populationContributions,
  );
  events.push(...economyAndGrowth(economy.changes));
  return {
    state: {
      ...current,
      cities: economy.cities,
      populationContributions: economy.populationContributions,
    },
    events,
  };
}

/** A unit activation with nothing done yet (a Start Turn reset). */
function freshActivationV7(): UnitStateV7["activation"] {
  return {
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
  };
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
  if (primaryUsed(banshee) || primaryActionBlockedAfterMoveV7(state, banshee))
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
      // Revision 14 section 4.3: a bitten land-form victim rises instead
      // (never on a Rift).
      const bite = biteOfV7(state, victim.id);
      if (
        bite === undefined ||
        victim.form !== "LAND" ||
        noRisingAtV7(state.board, victim.at)
      ) {
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
    // The Mind Control revision section 4.2: a Brain killed by the Wail
    // releases its controlled unit; the Martian revision: the Wail strips
    // the Shields it hit (section 5.3).
    const release = releaseControlledV7(
      units,
      state.burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    units = [...release.units];
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
        shields: withShieldDamageV7(
          state.shields,
          new Map(
            targets.map((entry) => [entry.unitId, entry.shieldDamage] as const),
          ),
        ),
        mindControlled: release.mindControlled,
        burrowed: release.burrowed,
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
    // Map curiosities (section 8.7): the Banshee's owner is credited with a
    // Monster the Wail kills (its bounty). Other Wail kills stay uncredited
    // (an Undead seat never has Plunder).
    const plunder = plunderAwardsV7(state, state.players, [
      ...targets.flatMap((entry) => {
        const victim = requireValue(
          state.units.find((unit) => unit.id === entry.unitId),
        );
        return entry.dies && isNeutralOwnerV7(victim.ownerId)
          ? [
              {
                creditedId: actor,
                victimOwnerId: victim.ownerId,
                victimUnitId: victim.id,
              },
            ]
          : [];
      }),
      ...chain.credits,
    ]);
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
        shields: chain.shields,
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
 * used a primary action (it may have moved; the Goblin pass, 7r50: a Scrap
 * Buggy may have attacked, `kaboomReadyV7`) dies (`UNIT_DIED` cause `KABOOM`,
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
  if (
    !kaboomReadyV7(
      exploder.activation,
      unitRoleMechanicsV7(state, exploder).kaboomAfterAttack,
    ) ||
    sluggishUnitMovedV7(state, exploder)
  )
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
      {
        units,
        board: state.board,
        graves,
        nextEntityId,
        bitten: state.bitten,
        shields: state.shields,
        mindControlled: state.mindControlled,
        burrowed: state.burrowed,
      },
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
        shields: chain.shields,
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
/**
 * The frozen sea (docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.8 and
 * 8.9) at the Start Turn of `playerId`: Black Ice, then the crush. A crushed
 * unit is a death afloat: no credit and no Grave. A crushed Brain (an
 * embarked one) releases its controlled unit right after its death, an
 * embarked exploding unit explodes on its tile, and the live economy is
 * recomputed (a crushed unit may have besieged a city).
 */
function resolveStartTurnIceV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  if (state.ice.length === 0) return { state, events: [] };
  const blackIce = resolveBlackIceV7(state, playerId);
  const crush = resolveIceCrushV7(blackIce.state, playerId);
  if (crush.events.length === 0) return blackIce;
  const events: DomainEventV7[] = [...blackIce.events, ...crush.events];
  if (crush.dead.length === 0) return { state: crush.state, events };
  const release = releaseControlledV7(
    crush.state.units,
    crush.state.burrowed,
    crush.state.mindControlled,
    crush.state.players,
    events,
  );
  const released: GameStateV7 = {
    ...crush.state,
    units: [...release.units],
    burrowed: release.burrowed,
    mindControlled: release.mindControlled,
  };
  const economy = recomputeLiveEconomyV7(
    blackIce.state,
    { board: released.board, cities: released.cities, units: released.units },
    released.populationContributions,
  );
  events.push(...economyAndGrowth(economy.changes));
  return withDeathBlastChainV7(
    blackIce.state,
    {
      state: {
        ...released,
        cities: economy.cities,
        populationContributions: economy.populationContributions,
      },
      events,
    },
    "CRUSHED",
  );
}

function resolveStartTurnPlagueAndChainV7(
  state: GameStateV7,
  playerId: PlayerId,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  return withDeathBlastChainV7(
    state,
    resolveStartTurnPlagueV7(state, playerId),
    "PLAGUE",
  );
}

/**
 * Revision 17 section 6.7: the death blasts of the exploding units a Start
 * Turn step killed (`UNIT_DIED` with `cause` in `result.events`, read from
 * `state`, the state before the step), with the chain they start, its
 * Plunder, risings, and the live economy. Returns `result` itself when no
 * exploding unit died.
 */
function withDeathBlastChainV7(
  state: GameStateV7,
  result: {
    readonly state: GameStateV7;
    readonly events: readonly DomainEventV7[];
  },
  cause: "PLAGUE" | "CRUSHED",
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const plague = result;
  const initial = plague.events.flatMap((event) => {
    if (event.kind !== "UNIT_DIED" || event.cause !== cause) return [];
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
      shields: after.shields,
      mindControlled: after.mindControlled,
      burrowed: after.burrowed,
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
      shields: chain.shields,
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
  const bounties: { readonly playerId: PlayerId; readonly unitId: UnitId }[] =
    [];
  for (const death of deaths) {
    // Map curiosities (section 8.7): kills by the neutral Monster are
    // credited to no player.
    if (isNeutralOwnerV7(death.creditedId)) continue;
    const credited = requirePlayer(state, death.creditedId);
    if (isNeutralOwnerV7(death.victimOwnerId))
      bounties.push({ playerId: death.creditedId, unitId: death.victimUnitId });
    if (
      technologyCapabilitiesV7(credited.researchedTechs, credited.faction)
        .plunderCoins > 0 &&
      arePlayersHostileV7(state, death.creditedId, death.victimOwnerId)
    )
      kills.set(death.creditedId, (kills.get(death.creditedId) ?? 0) + 1);
  }
  if (kills.size === 0 && bounties.length === 0) return { players, events: [] };
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
  // Map curiosities (section 8.7): the bounty, right after Plunder.
  for (const bounty of bounties) {
    next = next.map((item) =>
      item.id === bounty.playerId
        ? { ...item, coins: nextSafeBy(item.coins, MONSTER_BOUNTY_V7) }
        : item,
    );
    events.push({
      kind: "MONSTER_BOUNTY_AWARDED",
      playerId: bounty.playerId,
      unitId: bounty.unitId,
      coins: MONSTER_BOUNTY_V7,
    });
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
  // Section 10: exactly the units a `RECOVER` is offered for now (the shared
  // predicate `recoverEligibleV7`): an Egg, an embarked unit, a construct, a
  // Restless unit outside own territory, and a ship away from a Port are
  // skipped, with no HP change and no event.
  const items = state.units
    .filter((unit) => unit.ownerId === player.id)
    .map((unit) => ({ unit, facts: recoveryFacts(state, unit) }))
    .filter(({ facts }) => recoverEligibleV7(facts))
    .sort((a, b) => a.unit.id - b.unit.id)
    .map(({ unit, facts }) => ({
      unitId: unit.id,
      amount: recoveryGainV7(facts),
    }));
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

/** The authoritative Recover facts of a player's unit (section 10). */
function recoveryFacts(state: GameStateV7, unit: UnitStateV7): RecoveryFactsV7 {
  const ownTerritory = inOwnTerritory(state, unit);
  return {
    form: unit.form,
    hp: unit.hp,
    maxHp: unit.maxHp,
    activation: unit.activation,
    construct: unitIsConstructV7(state, unit),
    restless: factionRulesV7(unitFactionV7(state, unit)).restless,
    inOwnTerritory: ownTerritory,
    byOwnActivePort:
      unit.form === "NAVAL" &&
      [unit.at, ...adjacentCoords(state, unit.at)].some((at) =>
        isActivePortV7(state, at, unit.ownerId),
      ),
    // The Ice Folk revision section 6.6: Deep Winter heals an Ice Folk land
    // unit 6 in its owner's territory (the Mind Control revision: a
    // unit-level unlock, the controller's research through the kind's tree).
    deepWinter:
      ownTerritory &&
      isIceFolkLandUnitV7(state, unit) &&
      unitCapabilitiesV7(
        state,
        unit,
        requirePlayer(state, unit.ownerId).researchedTechs,
      ).deepWinter,
  };
}

function inOwnTerritory(state: GameStateV7, unit: UnitStateV7): boolean {
  const tile = tileAtV7(state.board, unit.at);
  const city = state.cities.find((item) => item.id === tile?.territoryCityId);
  return city?.ownerId === unit.ownerId;
}

/**
 * Revision 13 Restless: a land-form unit of a Restless kind (Undead)
 * recovers only in its owner's (its controller's) territory.
 */
function restlessOutsideOwnTerritory(
  state: GameStateV7,
  unit: UnitStateV7,
): boolean {
  return restlessOutsideOwnTerritoryV7({
    form: unit.form,
    restless: factionRulesV7(unitFactionV7(state, unit)).restless,
    inOwnTerritory: inOwnTerritory(state, unit),
  });
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
      const candidates = rewardCandidatesForLevelV7(reachedLevel, city.rewards);
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
 * order that is land, enterable by `unit` (the shared `canEnterTerrainV7`:
 * a Mountain needs its owner's Engineering unless it strides or flies), has
 * no treasure chest and no unit, and is not an ally's territory. The Martian
 * revision: a flyer is never displaced onto a settlement center it cannot
 * stand on.
 */
function rewardDisplacementCellV7(
  state: GameStateV7,
  unit: Pick<UnitStateV7, "id" | "ownerId" | "role">,
  center: CoordV7,
  allowed: (at: CoordV7) => boolean = () => true,
): CoordV7 | null {
  const ownerId = unit.ownerId;
  const owner = requirePlayer(state, ownerId);
  const movementMode = unitMovementModeV7(state, unit);
  return (
    adjacentCoords(state, center).find((at) => {
      const tile = tileAtV7(state.board, at);
      if (tile === undefined || tile.biome === null || !allowed(at))
        return false;
      if (state.treasureChests.some((chest) => same(chest, at))) return false;
      if (
        !canEnterTerrainV7({
          terrain: tile.terrain,
          movementMode,
          afloat: false,
          engineering: owner.researchedTechs.includes("ENGINEERING"),
          navigation: owner.researchedTechs.includes("NAVIGATION"),
          mountainBorn: unitIsMountainBornV7(state, unit),
          // A displacement tile is land (its biome is not null).
          ice: false,
        })
      )
        return false;
      if (
        unitAvoidsForeignSitesV7(state, unit) &&
        !flyerMayStandOnSiteV7(
          tile.site,
          state.cities.find((city) => same(city.at, at))?.ownerId ?? null,
          ownerId,
        )
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
      // The Dwarf revision section 5.3: the occupancy predicate.
      return !tileOccupiedV7(state, at);
    }) ?? null
  );
}

/**
 * Tuning 6 (`pulp_wars-w49.6`): where a reward unit appears when its
 * city's center is occupied: a free tile next to the center that the unit
 * may stand on (the reward displacement predicate), one of the city's own
 * territory before any other, in (y, x) order. Null when there is none.
 */
function rewardArrivalCellV7(
  state: GameStateV7,
  unit: Pick<UnitStateV7, "id" | "ownerId" | "role">,
  city: CityStateV7,
): CoordV7 | null {
  const free = (own: boolean): CoordV7 | null =>
    rewardDisplacementCellV7(state, unit, city.at, (at) =>
      own ? tileAtV7(state.board, at)?.territoryCityId === city.id : true,
    );
  return free(true) ?? free(false);
}

function resolveCityCenterSpawnV7(
  state: GameStateV7,
  actor: PlayerId,
  city: CityStateV7,
  spawned: UnitStateV7,
): {
  readonly players: readonly PlayerStateV7[];
  readonly units: readonly UnitStateV7[];
  readonly burrowed: GameStateV7["burrowed"];
  readonly events: readonly DomainEventV7[];
} {
  const occupant = state.units.find(
    (unit) => unit.hp > 0 && same(unit.at, city.at),
  );
  // Tuning 6 (`pulp_wars-w49.6`, `pulp-wars-poc-7r49`): the unit on the
  // center stays. A reward unit that finds the center occupied appears on
  // a free tile next to it (`rewardArrivalCellV7`); it used to take the
  // center and push the garrison to the first free cell in (y, x) order,
  // which put a wounded garrison in the open without its owner choosing.
  // Only when no tile next to the center is free does the old rule apply.
  const beside =
    occupant === undefined ? null : rewardArrivalCellV7(state, spawned, city);
  if (beside !== null) spawned = { ...spawned, at: beside };
  const displaces = occupant !== undefined && beside === null;
  const destination = displaces
    ? rewardDisplacementCellV7(state, occupant, city.at)
    : null;
  const displaced =
    !displaces || destination === null
      ? null
      : { ...occupant, at: destination, captureEligible: false };
  let units = state.units
    .filter(
      (unit) => !displaces || unit.id !== occupant.id || displaced !== null,
    )
    .map((unit) => (unit.id === displaced?.id ? displaced : unit));
  units = [...units, spawned];
  let players = state.players;
  const events: DomainEventV7[] = [];
  if (displaces)
    events.push({
      kind: "UNIT_SPAWN_DISPLACED",
      playerId: actor,
      cityId: city.id,
      spawnedUnitId: spawned.id,
      displacedUnitId: occupant.id,
      from: city.at,
      to: destination,
    });
  // The Mind Control revision section 4.2: a Brain removed by displacement
  // releases its controlled unit.
  let burrowed = state.burrowed;
  if (displaces && displaced === null) {
    const release = releaseControlledV7(
      units,
      burrowed,
      state.mindControlled,
      state.players,
      events,
    );
    units = [...release.units];
    burrowed = release.burrowed;
  }
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
  return { players, units, burrowed, events };
}
function evaluateAchievementsV7(
  state: GameStateV7,
  playerId: PlayerId,
  capturedHostileCity = false,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (player?.status !== "ACTIVE") return { state, events: [] };
  const engineer = state.populationContributions.some(
    (contribution) =>
      contribution.category === "LIVE" &&
      contribution.amount >= ENGINEER_MILL_OUTPUT_V7 &&
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
  // Revision 21: Land Baron, Sea Dog, and Slayer are read from the state;
  // Conqueror has no stored counter and completes only in the accepted
  // CAPTURE of a city owned by another player (`capturedHostileCity`).
  const counts = revision21AchievementCountsV7(state, playerId);
  const qualifies: Readonly<Record<AchievementIdV7, boolean>> = {
    EXPLORER: player.explored.length >= explorerTilesRequiredV7(state.board),
    ENGINEER: engineer,
    MUSTER: trainableRoles.size >= MUSTER_KINDS_V7,
    CONQUEROR: capturedHostileCity,
    LAND_BARON: counts.LAND_BARON >= LAND_BARON_CITIES_V7,
    SEA_DOG: counts.SEA_DOG >= SEA_DOG_SHIPS_V7,
    SLAYER: counts.SLAYER >= SLAYER_KILLS_V7,
  };
  const unlocked = player.achievementEntitlements.filter((entitlement) => {
    const requiredTech = ACHIEVEMENT_REQUIRED_TECH_V7[entitlement.achievement];
    return (
      !entitlement.unlocked &&
      (requiredTech === null ||
        player.researchedTechs.includes(requiredTech)) &&
      qualifies[entitlement.achievement]
    );
  });
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
  // The Mind Control revision: the unit's own Sight under its kind, with
  // the Fieldcraft and high-ground unlocks read through the kind's tree.
  const owner = requirePlayer(state, ownerId);
  const capabilities = unitCapabilitiesV7(state, unit, owner.researchedTechs);
  const base = Math.max(
    unitRoleRuleV7(state, unit).sightRadius,
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
  // Revision 19: drop the countdowns of Eggs that left the board. The
  // Martian revision: drop the Shield, Cooling, controlled, and cooldown entries
  // of units that left the board.
  // The Ice Folk revision: drop the Chill entries of units that left it.
  // The Dwarf revision: drop the per-turn entries of units that left the
  // board.
  // Map curiosities: drop the entries of Monsters that left the board and
  // the provokers no longer on it.
  // The Candy revision: drop the Rush, Splat, and Toss entries of units that
  // left the board and the Crumbs of a seat that left the game.
  // The ninth unit (7r55): drop the marked Graves whose Grave is gone and
  // the Cracked, struck, and risen entries of units that left the board.
  const result = parseGameStateV7(
    prunedNinthUnitV7(
      prunedCandyV7(
        prunedMonstersV7(
          prunedDwarfV7(
            prunedIceFolkV7(
              prunedMartianV7(prunedEggsV7(prunedAfflictionsV7(state))),
            ),
          ),
        ),
      ),
    ),
  );
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
/**
 * The Dwarf revision: the reducer helpers the Dwarf commands and the Start
 * Turn surfacing (src/engine/v7/dwarf-reducer.ts) share with every other
 * command, so their results follow the same tails and validation.
 */
const DWARF_KIT_V7: DwarfReducerKitV7 = {
  accepted,
  rejected,
  checked,
  arithmeticFailure,
  validateUnitActor,
  primaryUsed,
  exhaustedActivation,
  revealRadius,
  setExplored,
  debit,
  replaceTile,
  requirePlayer,
  nextSafe,
  graveActionTail,
  plunderAwards: plunderAwardsV7,
  economyAndGrowth,
  uniqueCoords,
};
const same = (a: CoordV7, b: CoordV7): boolean => a.x === b.x && a.y === b.y;
const chebyshev = (a: CoordV7, b: CoordV7): number =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
const compareCoords = (a: CoordV7, b: CoordV7): number =>
  a.y - b.y || a.x - b.x;
const key = (at: CoordV7): string => `${at.y},${at.x}`;
