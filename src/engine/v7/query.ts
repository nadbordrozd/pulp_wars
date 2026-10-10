import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  ASSEMBLE_COST_V7,
  OFFERING_FAVOUR_V7,
  OFFERING_POPULATION_V7,
  BARRICADE_CAP_V7,
  BARRICADE_COST_V7,
  BARRICADE_HP_V7,
  BREAK_OFF_UNITS_V7,
  DIGEST_DAMAGE_V7,
  NEUTRAL_KIND_V7,
  BASIC_ECONOMIC_ACTIONS_V7,
  BOMB_LANDING_RANGE_V7,
  BOMB_RANGE_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  TECHNOLOGY_BRANCH_IDS_V7,
  EMBARKED_LANDING_MAX_SPENT_V7,
  effectiveRoleRuleV7,
  embarkedMovementSpentV7,
  factionRulesV7,
  factionTreeV7,
  technologyCapabilitiesV7,
  EGG_DEFENSE2_V7,
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_LIMIT_V7,
  PROMOTION_KILLS_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  REBAKE_OVER_CAPACITY_V7,
  rebakeHpV7,
  rebakePriceV7,
  armouredDamageV7,
  unitIsBlastProofV7,
  RAM_BONUS2_V7,
  attackIsRamV7,
  attackIsTorpedoV7,
  boardedHpV7,
  dockPopulationV7,
  unitIsSubmergedV7,
  isIceAtV7,
  unitIsIceboundV7,
  coverBonusV7,
  terrainGivesCoverV7,
  attackIgnoresCityWallsV7,
  attackPlaguesV7,
  rayOverheatsV7,
  attackIsChargeV7,
  canEnterTerrainV7,
  chargeRunUpAttack2V7,
  flyerMayStandOnSiteV7,
  factionUnlocksRoleV7,
  isEggLaidRoleV7,
  isMindControlledV7,
  seatRoleMechanicsV7,
  seatRoleRuleV7,
  unitCapabilitiesV7,
  unitCapacitySlotsV7,
  unitFactionV7,
  unitFliesV7,
  unitGrowsV7,
  unitIsMountainBornV7,
  unitIsFrozenV7,
  STAMPEDE_DAMAGE_V7,
  STAMPEDE_RANGE_V7,
  unitMayEnterMountainV7,
  primaryActionBlockedAfterMoveV7,
  kaboomReadyV7,
  unitMovementModeV7,
  unitIsSummonedV7,
  CULT_SUMMONED_ROLE_RULES_V7,
  unitRoleMechanicsV7,
  isRangedRoleRuleV7,
  unitRoleRuleV7,
  unitTakesCoverV7,
  cityUnitCapacityForV7,
  isRallyTargetV7,
  isResourceRevealedV7,
  platedCapAppliesV7,
  playerTechnologyResearchCostV7,
  technologyResearchCostV7,
  BLAST_MOUNTAIN_POPULATION_V7,
  LAND_TRADE_INCOME_COINS_V7,
  MONUMENT_POPULATION_V7,
  landGrantCostV7,
  type BasicEconomicCommandKindV7,
  type EffectiveRoleRuleV7,
  type MovementModeV7,
  type SpatialEconomicCommandKindV7,
  type TechnologyBranchIdV7,
  type TechnologyCapabilitiesV7,
  type TechnologyUnlockV7,
  hireCostV7,
  HIRE_EXTRA_CAPACITY_V7,
  BLAST_MOUNTAIN_COST_V7,
  cityBarracksV7,
  cityEconomicMiracleIncomeV7,
  FIELD_DEFENSE_FORTIFICATION_LEVELS_V7,
} from "../rules/ruleset-v7";
import {
  attackGrantsEscapeV7,
  attackIsBouncedV7,
  bounceDestinationV7,
  candyActionRejectionV7,
  crumbsAtV7,
  overrunKindV7,
  peppermintHitV7,
  standsByOwnCenterV7,
  sugarRushAttack2V7,
  sugarRushPhaseV7,
  sugarRushRejectionV7,
  sugarTossAmountV7,
  sugarTossTargetRejectionV7,
  unitEatsCrumbsV7,
  unitIsCrashedV7,
  unitIsSplattedV7,
  withSugarRushV7,
} from "./candy";
import {
  attack2AfterToothacheV7,
  candyExchangeStatusesV7,
  rebakePlacementCandidatesV7,
  rebakeSourcesV7,
  ricochetEntryV7,
  thumpEntriesV7,
  topUpAmountV7,
  topUpTargetRejectionV7,
  unitHasToothacheV7,
  unitIsAfflictedForTopUpV7,
  unitIsStuckV7,
  unitThumpDamageV7,
} from "./candy-abilities";
import { compareCommandsV7, type CommandV7 } from "./commands";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
  assignedUnitCountV7,
  cityLevelIncomeV7,
  cityUnitCapacityV7,
  cooperativeAlliesV7,
  marketCoinsV7,
  rewardCandidatesForLevelV7,
} from "./economy";
import { forbiddenTechnologiesV7 } from "./forbidden-technologies";
import { raiseDeadGravesV7 } from "./graves";
import { applyCommandV7 } from "./reducer";
import {
  BITTEN_RISING_HP_V7,
  afflictionCombatEffectsV7,
  unitIsConstructV7,
  unitTakesStatusV7,
} from "./afflictions";
import { eruptionResultsV7, tunnelReachV7 } from "./dwarf-reducer";
import {
  attackAllowanceV7,
  attackIsUnflinchingV7,
  attackKnocksBackV7,
  cannonIgnoresFortificationV7,
  knockbackDestinationV7,
  publicUnitIsDugInV7,
  roleRetaliatesV7,
  twinShotReadyV7,
} from "./dwarf";
import {
  blastAreaV7,
  blastSetterV7,
  isExplodingUnitV7,
  resolveExplosionChainV7,
  type BlastUnitV7,
  type ExplosionCauseV7,
} from "./explosions";
import { INFECT_RISING_HP_V7 } from "./infect";
import {
  attackFeastsV7,
  feastHealV7,
  feastReadyV7,
  unitIsTerrifiedV7,
  wailTerrifiedIdsV7,
} from "./vampire-banshee";
import { boardTargetBlockV7 } from "./naval-branch";
import {
  advanceSiteAllowedV7,
  attackFortificationV7,
  attackHasAcidV7,
  attackHasPierceV7,
  attackSplatAppliesV7,
  noRetaliationReasonV7,
  attackBreachesV7,
  calculateCombatPreviewV7,
  retaliationDamageV7,
  collateralEntryV7,
  gangUpBonusV7,
  packHuntAttack2V7,
  ramShoveTileOpenV7,
  sweepEntryV7,
  tractorBeamTargetTechnologyV7,
  undeadCombatEffectsV7,
  type CombatOptionsV7,
} from "./combat";
import {
  attackMaximumRangeV7,
  attackShattersV7,
  unitAvoidsForeignSitesV7,
  blizzardHalvedDamageV7,
  blizzardProtectsV7,
  canBeFrozenV7,
  coldSnapTargetsV7,
  frozenTurnsForV7,
  frozenUnitNamedV7,
  hiddenBlizzardPossibleV7,
  isFrozenV7,
  isIceFolkLandUnitV7,
  matchHasIceFolkV7,
  sweepFlankTilesV7,
  unitOwnerIsIceFolkV7,
  withinBolasRangeV7,
  withinFrostBoltRangeV7,
} from "./ice-folk";
import { freezeSetV7, unitFreezesRingV7, type FreezeSetV7 } from "./ice";
import {
  absorbHitV7,
  forceFieldHoldsV7,
  isCoolingV7,
  beamDownCarrierReadyV7,
  beamDownDestinationLegalV7,
  beamDownPassengerLegalV7,
  controlledByBrainV7,
  mindControlTargetBlockV7,
  pierceTileV7,
  rayPowerV7,
  shieldOfV7,
  tractorBeamActorReadyV7,
  tractorBeamPathV7,
  tractorBeamRuleV7,
  tractorBeamStepLegalV7,
  tractorBeamTargetBlockV7,
  unitHeldByCityWallsV7,
  type PlacementTileFactsV7,
  type TractorBeamRuleV7,
} from "./martian";
import {
  recoverEligibleV7,
  recoveryGainV7,
  type RecoveryFactsV7,
} from "./recovery";
import {
  attackCracksV7,
  attackIsFrostbittenV7,
  crackedDefense2V7,
  shockFieldDamageV7,
  unitDefense2AtDistanceV7,
  unitIsCrackedV7,
  unitIsImmovableV7,
} from "./ninth-unit";
import {
  barricadeAttackerRejectionV7,
  barricadeCapReachedV7,
  barricadeDamageV7,
  barricadeRepairsV7,
  barricadeTileFactsLegalV7,
  standingBarricadesV7,
  unitWhirlsV7,
} from "./dwarf-crowd-control";
import { noRisingAtV7, riftAtV7 } from "./rift";
import { grownHpV7 } from "./growth";
import {
  attackCrushDamageV7,
  attackSiegeHammerV7,
  breakOffActorRejectionV7,
  breakOffTileLegalV7,
  crushBehindTileV7,
  crushStateV7,
  defenderCrushableV7,
  fixedSignatureHitV7,
  giantSignatureV7,
  glacialSmashThresholdV7,
  breakOffTrooperHpV7,
  ringTilesV7,
  siegeHammerRazedCityV7,
  stompRejectionV7,
  stompResultsV7,
  swallowRejectionV7,
  swallowedByV7,
  tossActorRejectionV7,
  tossCandidateTilesV7,
  tossDestinationLegalV7,
  tossPassengerLegalV7,
  type GiantTileFactsV7,
} from "./giants";
import {
  favourOfV7,
  isRobedCultistV7,
  offeringRejectionV7,
  sacrificeFavourV7,
  sacrificeRejectionV7,
  seizeFavourV7,
  seizeHolderV7,
  seizeRejectionV7,
} from "./cult";
import {
  anchorRejectionV7,
  beholdRejectionV7,
  booDestinationV7,
  booRejectionV7,
  booVictimsV7,
  channelRejectionV7,
  daemonControlV7,
  holdingStrandsV7,
  summonHelperLegalV7,
  summonRejectionV7,
} from "./cult-channel";
import { laidEggHpV7, laidEggTurnsV7, publicNestTilesV7 } from "./eggs";
import {
  stampedeActorRejectionV7,
  stampedeLineV7,
  stampedePathLegalV7,
  stampedeTilesV7,
  type StampedeTileFactsV7,
} from "./stampede";
import type {
  CombatPreviewV7,
  CombatSplashEntryV7,
  DomainEventV7,
} from "./events";
import { reachablePlayerMovementPathsV7, unitOverstridesV7 } from "./movement";
import {
  spatialContributionAtV7,
  spatialPlacementCountV7,
  tileAtV7,
  type EconomyGraphV7,
  type EconomicFamilyV7,
  type OppositePairAxisV7,
} from "./spatial-economy";
import {
  COMMAND_KIND_ORDER_V7,
  ACHIEVEMENT_IDS_V7,
  NAVAL_ROLE_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  cityOfferedPopulationV7,
  isAfloatFormV7,
  isNavalRoleV7,
  isNeutralOwnerV7,
  type BoardStateV7,
  type CoordV7,
  type FactionIdV7,
  type FactionTreeIdV7,
  type NeutralBreedV7,
  type AchievementEntitlementV7,
  type AchievementIdV7,
  type GameStateV7,
  type ImprovementIdV7,
  type TechnologyIdV7,
  type SummonedRoleIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { publicUnitStatsV7, type PublicUnitStatsV7 } from "./unit-stats";
import {
  allOwnedUnitsV7,
  barricadeAtV7,
  barricadesOfV7,
  moundAtV7,
  publicUnitHasTerrainCoverV7,
  tileOccupiedV7,
} from "./units";
import {
  BIGFOOT_ALERT_RADIUS_V7,
  BIGFOOT_CURIOSITY_DISTANCE_V7,
  BIGFOOT_HABITAT_RADIUS_V7,
  MONSTER_HOME_RADIUS_V7,
  gateAtV7,
  gateDisplacementTileV7,
  monsterAreaV7,
} from "./curiosities";
import {
  viewForV7,
  type PlayerTileViewV7,
  type PlayerViewV7,
  type PublicUnitV7,
} from "./view";
import {
  WAIL_RADIUS_V7,
  publicWailLeavesGraveV7,
  publicWailTargetsV7,
  type WailPreviewV7,
} from "./wail";

export type PublicTechnologyStateV7 =
  "OWNED" | "AVAILABLE" | "BLOCKED" | "DISABLED";
export interface PublicTechnologyNodeV7 {
  readonly id: TechnologyIdV7;
  readonly branch: TechnologyBranchIdV7;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechnologyIdV7[];
  readonly missingPrerequisites: readonly TechnologyIdV7[];
  readonly state: PublicTechnologyStateV7;
  readonly cost: number;
  readonly affordable: boolean;
  readonly effects: readonly TechnologyUnlockV7[];
  readonly unlockedRoleRules: readonly EffectiveRoleRuleV7[];
}
export interface PublicTechnologyTreeV7 {
  readonly id: FactionTreeIdV7;
  readonly faction: FactionIdV7;
  readonly ownedCityCount: number;
  readonly branches: typeof TECHNOLOGY_BRANCH_IDS_V7;
  readonly nodes: readonly PublicTechnologyNodeV7[];
  readonly roleBindings: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
}

export function queryTechnologyTreeV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): PublicTechnologyTreeV7 {
  const view = asView(input, viewerId);
  const player = view.viewer;
  const ownedCityCount = view.cities.filter(
    (city) => city.ownerId === player.id,
  ).length;
  if (ownedCityCount < 1) throw new RangeError("Technology requires a city");
  const owned = new Set(player.researchedTechs);
  // Revision 13: the tree, unlock effects, and role labels are the viewer's
  // own faction registration.
  const tree = factionTreeV7(player.faction);
  // Forbidden technologies (docs/product/CAMPAIGN.md section 2.3): the Dry
  // Land Naval branch and a mission's list are DISABLED, never offered.
  const forbidden = forbiddenTechnologiesV7(view.setup);
  return {
    id: tree.id,
    faction: tree.faction,
    ownedCityCount,
    branches: TECHNOLOGY_BRANCH_IDS_V7,
    nodes: tree.nodes.map((node) => {
      const missingPrerequisites = node.prerequisites.filter(
        (tech) => !owned.has(tech),
      );
      const nodeState: PublicTechnologyStateV7 =
        forbidden.has(node.id) && !owned.has(node.id)
          ? "DISABLED"
          : owned.has(node.id)
            ? "OWNED"
            : missingPrerequisites.length === 0
              ? "AVAILABLE"
              : "BLOCKED";
      // The free opener applies only to researchable offers; a forbidden
      // (Dry Land Naval or mission) node keeps its ordinary cost.
      const cost =
        nodeState === "DISABLED"
          ? technologyResearchCostV7(node.tier, ownedCityCount)
          : playerTechnologyResearchCostV7(
              node.tier,
              player.researchedTechs.length,
              ownedCityCount,
            );
      return {
        id: node.id,
        branch: node.branch,
        tier: node.tier,
        prerequisites: node.prerequisites,
        missingPrerequisites,
        state: nodeState,
        cost,
        affordable: nodeState === "AVAILABLE" && player.coins >= cost,
        effects: node.unlocks,
        unlockedRoleRules: node.unlockedRoles.map(
          (roleId) => tree.roleRules[roleId],
        ),
      };
    }),
    roleBindings: tree.roleRules,
  };
}

export function queryTechnologyCapabilitiesV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): TechnologyCapabilitiesV7 {
  const viewer = asView(input, viewerId).viewer;
  return technologyCapabilitiesV7(viewer.researchedTechs, viewer.faction);
}

const BASIC_KINDS = Object.keys(
  BASIC_ECONOMIC_ACTIONS_V7,
) as BasicEconomicCommandKindV7[];
const SPATIAL_KINDS = Object.keys(
  SPATIAL_ECONOMIC_ACTIONS_V7,
) as SpatialEconomicCommandKindV7[];
const TILE_KINDS = [
  ...BASIC_KINDS,
  ...SPATIAL_KINDS,
  "GATHER_PEARLS",
  "BUILD_PORT",
  "BUILD_SHIPYARD",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "CULTIVATE_FOREST",
  "BLAST_MOUNTAIN",
  "BUILD_ROAD",
  "REDEVELOP",
] as const;
const COMMAND_CACHE = new WeakMap<PlayerViewV7, readonly CommandV7[]>();

/** PlayerView-only enumeration for the implemented v7 slice. */
export function queryPlayerCommandsV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): readonly CommandV7[] {
  const view = asView(input, viewerId);
  const cached = COMMAND_CACHE.get(view);
  if (cached !== undefined) return cached;
  const work = createPublicCommandWorkV7(view);
  return requiredPublicCommandWorkResultV7(
    work.advance(Number.MAX_SAFE_INTEGER),
  );
}

export interface PublicCommandWorkProgressV7 {
  readonly done: boolean;
  readonly operations: number;
  readonly commands: readonly CommandV7[] | null;
}
export interface PublicCommandWorkV7 {
  advance(maxOperations: number): PublicCommandWorkProgressV7;
}

/** Resumable exact command enumeration; one operation handles one tile, city, or unit. */
export function createPublicCommandWorkV7(
  view: PlayerViewV7,
): PublicCommandWorkV7 {
  return new IncrementalPublicCommandWorkV7(view);
}

class IncrementalPublicCommandWorkV7 implements PublicCommandWorkV7 {
  private readonly candidates: CommandV7[] = [];
  private unlocked: ReadonlySet<CommandV7["kind"]> = new Set();
  private phase: "TILES" | "CITIES" | "UNITS" | "DONE" = "TILES";
  private index = 0;
  private commands: readonly CommandV7[] | null = null;

  constructor(private readonly view: PlayerViewV7) {
    const cached = COMMAND_CACHE.get(view);
    if (cached !== undefined) {
      this.commands = cached;
      this.phase = "DONE";
      return;
    }
    const player = view.viewer;
    if (
      view.outcome !== null ||
      player.status !== "ACTIVE" ||
      view.turnOrder[view.activeSeatIndex] !== player.id
    ) {
      this.finish([]);
      return;
    }
    const head = view.pendingChoices[0];
    if (head !== undefined) {
      this.finish(
        head.candidates.map((reward): CommandV7 => ({
          kind: "CHOOSE_CITY_REWARD",
          cityId: head.cityId,
          reachedLevel: head.reachedLevel,
          reward,
        })),
      );
      return;
    }
    this.unlocked = new Set(queryTechnologyCapabilitiesV7(view).commands);
    for (const node of queryTechnologyTreeV7(view).nodes)
      if (node.state === "AVAILABLE" && node.affordable)
        this.candidates.push({ kind: "RESEARCH", tech: node.id });
  }

  advance(maxOperations: number): PublicCommandWorkProgressV7 {
    if (!Number.isSafeInteger(maxOperations) || maxOperations <= 0)
      throw new RangeError("maxOperations must be a positive safe integer");
    let operations = 0;
    while (operations < maxOperations && this.phase !== "DONE") {
      if (this.phase === "TILES") {
        const tile = this.view.board.tiles[this.index];
        if (tile === undefined) {
          this.phase = "CITIES";
          this.index = 0;
          continue;
        }
        appendPublicTileCommandsV7(
          this.view,
          tile,
          this.unlocked,
          this.candidates,
        );
      } else if (this.phase === "CITIES") {
        const city = this.view.cities[this.index];
        if (city === undefined) {
          this.phase = "UNITS";
          this.index = 0;
          continue;
        }
        appendPublicCityCommandsV7(this.view, city, this.candidates);
      } else {
        const unit = this.view.units[this.index];
        if (unit === undefined) {
          this.candidates.push({ kind: "END_TURN" });
          this.finish(this.candidates);
          continue;
        }
        appendOfferedUnitCommandsV7(this.view, unit, this.candidates);
      }
      this.index += 1;
      operations += 1;
    }
    return {
      done: this.phase === "DONE",
      operations,
      commands: this.commands,
    };
  }

  private finish(commands: readonly CommandV7[]): void {
    this.commands = store(this.view, [...commands].sort(compareCommandsV7));
    this.phase = "DONE";
  }
}

function requiredPublicCommandWorkResultV7(
  progress: PublicCommandWorkProgressV7,
): readonly CommandV7[] {
  if (!progress.done || progress.commands === null)
    throw new RangeError("Public command work did not drain");
  return progress.commands;
}

function appendPublicTileCommandsV7(
  view: PlayerViewV7,
  tile: PlayerTileViewV7,
  unlocked: ReadonlySet<CommandV7["kind"]>,
  candidates: CommandV7[],
): void {
  if (!tile.explored) return;
  for (const kind of TILE_KINDS)
    if (publicTileCommandLegal(view, tile, kind, unlocked))
      candidates.push({ kind, at: tile.at } as CommandV7);
  const monumentCity = view.cities.find(
    (city) => city.id === tile.territoryCityId,
  );
  if (
    monumentCity?.ownerId === view.viewer.id &&
    !publicCityBesieged(view, monumentCity.at) &&
    publicCityDevelopmentFootprintKnown(view, monumentCity) &&
    !view.pendingChoices.some((choice) => choice.cityId === monumentCity.id) &&
    tile.biome !== null &&
    tile.terrain !== "RIFT" &&
    (tile.terrain !== "MOUNTAIN" ||
      view.viewer.researchedTechs.includes("ENGINEERING")) &&
    !view.treasureChests.some((chest) => same(chest, tile.at)) &&
    tile.site === null &&
    tile.resource === null &&
    tile.improvement === null &&
    !cityHasImprovement(view, monumentCity.id, "MONUMENT")
  )
    for (const entitlement of view.viewer.achievementEntitlements)
      if (entitlement.unlocked && !entitlement.spent)
        candidates.push({
          kind: "BUILD_MONUMENT",
          achievement: entitlement.achievement,
          at: tile.at,
        });
}

/**
 * Tuning 3 (`pulp_wars-w49.3`): the `HIRE` offers of an own, unbesieged
 * city: with Commerce, each empty Market tile of the city, each land role
 * the viewer can train and pay at `hireCostV7`, while the city holds at
 * most `HIRE_EXTRA_CAPACITY_V7` units above its capacity afterwards. The
 * city action is not needed.
 */
function appendPublicHireCommandsV7(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
  candidates: CommandV7[],
): void {
  const player = view.viewer;
  if (
    !technologyCapabilitiesV7(
      player.researchedTechs,
      player.faction,
    ).commands.includes("HIRE") ||
    view.pendingChoices.some((choice) => choice.cityId === city.id)
  )
    return;
  const markets = view.board.tiles.filter(
    (tile) =>
      tile.explored &&
      tile.improvement === "MARKET" &&
      tile.territoryCityId === city.id &&
      !view.units.some((unit) => same(unit.at, tile.at)),
  );
  if (markets.length === 0) return;
  const capacity =
    cityUnitCapacityForV7(
      city.level,
      player.researchedTechs,
      player.faction,
      cityBarracksV7(city),
    ) + HIRE_EXTRA_CAPACITY_V7;
  const assigned =
    allOwnedUnitsV7(view, player.id)
      .filter((unit) => unit.homeCityId === city.id)
      .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0) +
    publicSwallowedSlotsV7(view, city.id);
  for (const role of UNIT_ROLE_IDS_V7) {
    const cost = publicHireCostV7(view, city.id, role);
    if (
      cost !== null &&
      cost <= player.coins &&
      assigned + seatRoleMechanicsV7(view, player.id, role).capacitySlots <=
        capacity
    )
      for (const market of markets)
        candidates.push({ kind: "HIRE", cityId: city.id, at: market.at, role });
  }
}

/**
 * Tuning 3: what hiring `role` costs the viewer in its city `cityId`
 * (`hireCostV7` of the training price there, the Forge discount first), or
 * null for a role it cannot hire (a ship, an egg-laid or reward-only role,
 * or one whose technology it lacks). Public information of the viewer.
 */
export function publicHireCostV7(
  view: PlayerViewV7,
  cityId: CityId,
  role: UnitRoleIdV7,
): number | null {
  const player = view.viewer;
  const rule = effectiveRoleRuleV7(role, player.faction);
  // The Dinosaur pass (`pulp_wars-w49.15`, 7r53): an egg-laid role is
  // hired too (the dinosaur arrives hatched).
  if (
    isNavalRoleV7(role) ||
    rule.cost === null ||
    (rule.technology !== null &&
      !player.researchedTechs.includes(rule.technology))
  )
    return null;
  const forgeDiscount = view.improvementValues.some((value) => {
    if (value.improvement !== "FORGE" || value.level <= 0) return false;
    const tile = tileAtView(view, value.at);
    return tile?.explored === true && tile.territoryCityId === cityId;
  });
  return hireCostV7(Math.max(1, rule.cost - (forgeDiscount ? 1 : 0)));
}

function appendPublicCityCommandsV7(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
  candidates: CommandV7[],
): void {
  const player = view.viewer;
  if (city.ownerId !== player.id || publicCityBesieged(view, city.at)) return;
  appendPublicHireCommandsV7(view, city, candidates);
  if (city.cityActionAvailable !== true) return;
  // The Cultists (docs/product/RULESET_7_CULTISTS.md section 5.3): the
  // Offering, offered exactly when the reducer accepts it (the shared
  // legality predicate; the city is the viewer's and not besieged here).
  if (
    offeringRejectionV7(
      player,
      city,
      false,
      view.pendingChoices.some((choice) => choice.cityId === city.id),
    ) === null
  )
    candidates.push({ kind: "OFFERING", cityId: city.id });
  const centerBlocked = view.units.some((unit) => same(unit.at, city.at));
  const capacity = cityUnitCapacityForV7(
    city.level,
    player.researchedTechs,
    player.faction,
    cityBarracksV7(city),
  );
  // Revision 19 section 5.1: used slots are a sum (own units are always
  // visible to their owner, with their home city). The Dwarf revision: own
  // burrowed units keep their slots (every own mound is explored).
  const assigned =
    allOwnedUnitsV7(view, player.id)
      .filter((unit) => unit.homeCityId === city.id)
      .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0) +
    publicSwallowedSlotsV7(view, city.id);
  // A role-level read: the unit to train is the seat's own role.
  const fits = (role: UnitRoleIdV7): boolean =>
    assigned + seatRoleMechanicsV7(view, player.id, role).capacitySlots <=
    capacity;
  if (
    player.researchedTechs.includes("PLANNING") &&
    city.level >= 3 &&
    !city.landGrantUsed &&
    !view.pendingChoices.some((choice) => choice.cityId === city.id) &&
    // An explored cell is neutral only when it has no public territory owner:
    // the view hides the city ID of territory whose city center is still
    // unexplored, but always shows that territory's owner. Tuning 1 (7r46):
    // the cost counts exactly those cells, so it is exact from the view.
    publicLandGrantTilesV7(view, city).length > 0 &&
    player.coins >= landGrantCostV7(publicLandGrantTilesV7(view, city).length)
  )
    candidates.push({ kind: "LAND_GRANT", cityId: city.id });
  const forgeDiscount = view.improvementValues.some(
    (value) =>
      value.improvement === "FORGE" &&
      value.level > 0 &&
      (() => {
        const tile = tileAtView(view, value.at);
        return tile?.explored === true && tile.territoryCityId === city.id;
      })(),
  );
  // Revision 19 section 6.3: an egg-laid role is never trained. Its owner
  // lays it on a nest tile of the city; laying does not need an empty center.
  const nestTiles = UNIT_ROLE_IDS_V7.some((role) =>
    isEggLaidRoleV7(role, player.faction),
  )
    ? publicNestTilesV7(view, city)
    : [];
  for (const role of UNIT_ROLE_IDS_V7) {
    const rule = effectiveRoleRuleV7(role, player.faction);
    if (isEggLaidRoleV7(role, player.faction)) {
      if (
        fits(role) &&
        rule.cost !== null &&
        Math.max(1, rule.cost - (forgeDiscount ? 1 : 0)) <= player.coins &&
        (rule.technology === null ||
          player.researchedTechs.includes(rule.technology))
      )
        for (const at of nestTiles)
          candidates.push({ kind: "LAY_EGG", cityId: city.id, role, at });
      continue;
    }
    if (
      !centerBlocked &&
      fits(role) &&
      !isNavalRoleV7(role) &&
      rule.cost !== null &&
      // The Forge discount never lowers a cost below 1 (revision 17: the
      // 1-Coin Goblin stays at 1), exactly as the reducer charges it.
      Math.max(1, rule.cost - (forgeDiscount ? 1 : 0)) <= player.coins &&
      (rule.technology === null ||
        player.researchedTechs.includes(rule.technology))
    )
      candidates.push({ kind: "TRAIN", cityId: city.id, role });
  }
  for (const role of NAVAL_ROLE_IDS_V7) {
    const rule = effectiveRoleRuleV7(role, player.faction);
    if (
      fits(role) &&
      rule.cost !== null &&
      // The frozen sea (naval branch section 8.11): a tree that unlocks no
      // ship (the Ice Folk's) is never offered one.
      factionUnlocksRoleV7(player.faction, role) &&
      (rule.technology === null ||
        player.researchedTechs.includes(rule.technology))
    )
      for (const port of view.board.tiles)
        if (
          publicActiveOwnedPort(view, port, player.id) &&
          port.explored &&
          port.territoryCityId === city.id &&
          !view.units.some((unit) => same(unit.at, port.at)) &&
          rule.cost - (port.improvement === "SHIPYARD" ? 2 : 0) <= player.coins
        )
          candidates.push({
            kind: "TRAIN_NAVAL",
            cityId: city.id,
            at: port.at,
            role,
          });
  }
}

/**
 * Public landing tiles for an own embarked unit standing at `from`: adjacent,
 * explored land, enterable (Mountain needs Engineering), outside formal
 * allied territory, and with no visible occupant.
 */
function publicLandingTilesV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  from: CoordV7,
): PlayerTileViewV7[] {
  const player = view.viewer;
  // The Martian revision: the landing tile goes through the shared
  // `canEnterTerrainV7` with the unit's land-form movement mode, and a
  // flyer never lands on a settlement center it does not own.
  const movementMode = unitMovementModeV7(view, unit);
  return adjacentPublicTiles(view, from).filter(
    (tile) =>
      tile.explored &&
      canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode,
        afloat: false,
        engineering: player.researchedTechs.includes("ENGINEERING"),
        navigation: player.researchedTechs.includes("NAVIGATION"),
        // The Ice Folk revision section 7.1: the unit lands in land form.
        mountainBorn: unitIsMountainBornV7(view, {
          id: unit.id,
          ownerId: unit.ownerId,
          role: unit.role,
        }),
        // The frozen sea: a transport may land on adjacent ice.
        ice: isIceAtV7(view, tile.at),
      }) &&
      // The Ice Folk revision section 7.7: nor does a Sabretooth.
      (!unitAvoidsForeignSitesV7(view, {
        id: unit.id,
        ownerId: unit.ownerId,
        role: unit.role,
      }) ||
        flyerMayStandOnSiteV7(
          tile.site,
          view.cities.find((city) => same(city.at, tile.at))?.ownerId ?? null,
          unit.ownerId,
        )) &&
      (tile.territoryOwnerId === null ||
        tile.territoryOwnerId === player.id ||
        !publicAllied(view, player.id, tile.territoryOwnerId)) &&
      // The Dwarf revision section 5.3: the occupancy predicate.
      !tileOccupiedV7(view, tile.at, unit.id),
  );
}

export interface PublicLandingAfterMoveV7 {
  /** The land cell the unit would land on. */
  readonly at: CoordV7;
  /** The one-cell Move to the intermediate water cell. */
  readonly move: Extract<CommandV7, { kind: "MOVE" }>;
  /** The landing sent after the Move reaches that cell. */
  readonly disembark: Extract<CommandV7, { kind: "DISEMBARK" }>;
}

export interface PublicLandingPreviewV7 {
  readonly unitId: UnitId;
  /** Offered `DISEMBARK` cells ("Land now"), in `(y, x)` order. */
  readonly direct: readonly CoordV7[];
  /** Cells reached by one water step then landing, in `(y, x)` order. */
  readonly afterMove: readonly PublicLandingAfterMoveV7[];
}

/**
 * Revision 16 landing preview (section 5.4) for an own embarked unit. Direct
 * cells are the offered `DISEMBARK` targets. While the unit has not moved,
 * `afterMove` adds each other legal landing cell adjacent to an offered
 * one-cell Move destination; its intermediate water cell is the first such
 * destination in `(y, x)` order. Null for any other unit.
 */
export function queryLandingPreviewV7(
  view: PlayerViewV7,
  unitId: UnitId,
  commands: readonly CommandV7[] = queryPlayerCommandsV7(view),
): PublicLandingPreviewV7 | null {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (
    unit === undefined ||
    unit.ownerId !== view.viewer.id ||
    unit.form !== "EMBARKED"
  )
    return null;
  const byCoord = (left: CoordV7, right: CoordV7) =>
    left.y - right.y || left.x - right.x;
  const direct = commands
    .flatMap((command) =>
      command.kind === "DISEMBARK" && command.unitId === unitId
        ? [command.at]
        : [],
    )
    .sort(byCoord);
  const afterMove = new Map<string, PublicLandingAfterMoveV7>();
  // A one-cell Move spends one point; landing then spends the other.
  if (!unit.activation.moved) {
    const moves = commands
      .flatMap((command) =>
        command.kind === "MOVE" &&
        command.unitId === unitId &&
        command.path.length === 1
          ? [command]
          : [],
      )
      .sort((left, right) =>
        byCoord(left.path[0] as CoordV7, right.path[0] as CoordV7),
      );
    const directKeys = new Set(direct.map((at) => `${at.x},${at.y}`));
    for (const move of moves) {
      const via = move.path[0] as CoordV7;
      for (const tile of publicLandingTilesV7(view, unit, via)) {
        const key = `${tile.at.x},${tile.at.y}`;
        if (directKeys.has(key) || afterMove.has(key)) continue;
        afterMove.set(key, {
          at: tile.at,
          move,
          disembark: { kind: "DISEMBARK", unitId, at: tile.at },
        });
      }
    }
  }
  return {
    unitId,
    direct,
    afterMove: [...afterMove.values()].sort((left, right) =>
      byCoord(left.at, right.at),
    ),
  };
}

/**
 * The unit commands of `unit`. Ice Folk Freeze (`pulp_wars-w49.37`, section
 * 21.3): every command that names an own Frozen unit (other than Promote,
 * Disband, and Wait), or tosses or carries one, is withheld, exactly as
 * the reducer refuses it (`UNIT_FROZEN`).
 */
function appendOfferedUnitCommandsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  candidates: CommandV7[],
): void {
  const start = candidates.length;
  appendPublicUnitCommandsV7(view, unit, candidates);
  // A retained view captured before Ice Folk Freeze has no `frozen` list.
  const lookup: { readonly frozen?: readonly unknown[] } = view;
  if ((lookup.frozen?.length ?? 0) === 0 || candidates.length === start) return;
  const kept = candidates
    .splice(start)
    .filter(
      (command) => frozenUnitNamedV7(view, view.viewer.id, command) === null,
    );
  candidates.push(...kept);
}

function appendPublicUnitCommandsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  candidates: CommandV7[],
): void {
  const player = view.viewer;
  if (unit.ownerId !== player.id) return;
  // Revision 19 section 6.2: an Egg accepts no unit command except Disband
  // (with Administration, on any turn).
  if (unit.form === "EGG") {
    if (player.researchedTechs.includes("ADMINISTRATION"))
      candidates.push({ kind: "DISBAND", unitId: unit.id });
    return;
  }
  const overrun = unit.activation.overrunActive;
  if (
    !overrun &&
    unit.form === "EMBARKED" &&
    !unit.activation.handled &&
    // Revision 16: landing needs one of the two embarked points left.
    embarkedMovementSpentV7(unit.activation) <= EMBARKED_LANDING_MAX_SPENT_V7
  )
    for (const tile of publicLandingTilesV7(view, unit, unit.at))
      candidates.push({ kind: "DISEMBARK", unitId: unit.id, at: tile.at });
  if (
    unit.activation.escapeAvailable ||
    (!overrun && !unit.activation.moved && !primaryUsedForQuery(unit))
  )
    for (const reachable of reachablePlayerMovementPathsV7(view, unit))
      candidates.push({ kind: "MOVE", unitId: unit.id, path: reachable.path });
  const rule = unitRoleRuleV7(view, unit);
  // The Candy revision section 5.3: a Crashed unit has no primary action
  // (it may still Move, Wait, Promote, Disband, embark, and land).
  const crashed = unitIsCrashedV7(view, unit.id);
  const primaryReady =
    !crashed &&
    !primaryUsedForQuery(unit) &&
    !primaryActionBlockedAfterMoveV7(view, unit);
  // The Dwarf revision section 7.3: an unmoved Clockwork Gunner's second
  // shot.
  const attackReady =
    unit.form !== "EMBARKED" &&
    !crashed &&
    // The frozen sea (naval branch section 8.9): an icebound ship cannot
    // attack.
    !unitIsIceboundV7(view, unit) &&
    (primaryReady ||
      unit.activation.overrunActive ||
      twinShotReadyV7(view, unit) ||
      // The Vampire and Banshee rework (`pulp_wars-ty6i`): the Feast attack.
      feastReadyV7(view, unit));
  // The Candy revision: Sugar Rush, Re-bake, and Sugar Toss, each offered
  // exactly when the reducer accepts it (the shared legality predicates).
  if (sugarRushRejectionV7(view, unit) === null)
    candidates.push({ kind: "SUGAR_RUSH", unitId: unit.id });
  if (candyActionRejectionV7(view, unit, "REBAKE") === null)
    for (const option of publicRebakeFactsV7(view, unit)?.options ?? [])
      candidates.push({
        kind: "REBAKE",
        unitId: unit.id,
        from: option.from,
        at: option.at,
      });
  // The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 8.2): Top-Up.
  if (candyActionRejectionV7(view, unit, "TOP_UP") === null)
    for (const target of publicTopUpTargetsV7(view, unit))
      candidates.push({
        kind: "TOP_UP",
        unitId: unit.id,
        targetUnitId: target.id,
      });
  if (candyActionRejectionV7(view, unit, "SUGAR_TOSS") === null)
    for (const target of publicSugarTossTargetsV7(view, unit))
      candidates.push({
        kind: "SUGAR_TOSS",
        unitId: unit.id,
        targetUnitId: target.id,
      });
  // The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6).
  appendPublicGiantCommandsV7(view, unit, candidates);
  // The Cultists (docs/product/RULESET_7_CULTISTS.md section 5).
  appendPublicCultCommandsV7(view, unit, candidates);
  // The Ice Folk revision section 7.2: a Yeti on a Mountain reaches 2.
  const attackRange = publicAttackMaximumRangeV7(view, unit);
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md sections 5.2
  // and 5.3): a torpedo is offered only at units afloat, and no attack on a
  // submerged Submarine from 2 or more tiles.
  const torpedo = attackIsTorpedoV7(view, unit);
  for (const target of view.units) {
    const distance = chebyshev(unit.at, target.at);
    if (
      attackReady &&
      rule.abilities.includes("ATTACK") &&
      publicHostile(view, player.id, target.ownerId) &&
      distance >= rule.minimumRange &&
      distance <= attackRange &&
      (!torpedo || isAfloatFormV7(target.form)) &&
      (distance <= 1 || !unitIsSubmergedV7(view, target))
    )
      candidates.push({
        kind: "ATTACK",
        unitId: unit.id,
        targetUnitId: target.id,
      });
  }
  // The naval branch section 4.2: Board, for every legal pair.
  for (const target of publicBoardTargetsV7(view, unit))
    candidates.push({
      kind: "BOARD",
      unitId: unit.id,
      targetUnitId: target.id,
    });
  // The Martian revision: Beam Down (a carrier, after its Move too), Mind
  // Control, and the Tractor Beam, each offered exactly for its legal
  // targets. `pulp_wars-1wy.3`: the carrier and puller readiness are the
  // reducer's own predicates; the Heavy Tractor Beam is offered after the
  // Mothership's Move and after its primary action, once a turn.
  if (unit.form === "LAND") {
    if (
      rule.abilities.includes("BEAM_DOWN") &&
      beamDownCarrierReadyV7(view, unit)
    )
      for (const passenger of publicBeamDownPassengersV7(view, unit))
        for (const to of publicBeamDownDestinationsV7(view, unit, passenger))
          candidates.push({
            kind: "BEAM_DOWN",
            unitId: unit.id,
            passengerUnitId: passenger.id,
            to,
          });
    if (
      !overrun &&
      !primaryUsedForQuery(unit) &&
      !primaryActionBlockedAfterMoveV7(view, unit) &&
      rule.abilities.includes("MIND_CONTROL")
    )
      for (const target of publicMindControlTargetsV7(view, unit))
        candidates.push({
          kind: "MIND_CONTROL",
          unitId: unit.id,
          targetUnitId: target.id,
        });
    const tractor = tractorBeamRuleV7(view, unit);
    if (
      tractor !== null &&
      tractorBeamActorReadyV7(view, unit, tractor, view.tractorUsedThisTurn)
    )
      for (const target of publicTractorBeamTargetsV7(view, unit, tractor))
        candidates.push({
          kind: "TRACTOR_BEAM",
          unitId: unit.id,
          targetUnitId: target.id,
        });
  }
  // The Ice Folk revision: the Sled's Bolas (every legal target, in
  // target-ID order) and the Ice Witch's Cold Snap (with a target). Ice
  // Folk Freeze (`pulp_wars-w49.37`): her Frost Bolt (every legal target)
  // and the unmoved Mammoth's Stampede (every open path end).
  if (!overrun && primaryReady && unit.form === "LAND") {
    if (rule.abilities.includes("BOLAS"))
      for (const target of publicSingleFreezeTargetsV7(
        view,
        unit,
        withinBolasRangeV7,
      ))
        candidates.push({
          kind: "THROW_BOLAS",
          unitId: unit.id,
          targetUnitId: target.id,
        });
    if (
      rule.abilities.includes("COLD_SNAP") &&
      coldSnapTargetsV7(view, unit, view.units).length > 0
    )
      candidates.push({ kind: "COLD_SNAP", unitId: unit.id });
    if (rule.abilities.includes("FROST_BOLT"))
      for (const target of publicSingleFreezeTargetsV7(
        view,
        unit,
        withinFrostBoltRangeV7,
      ))
        candidates.push({
          kind: "FROST_BOLT",
          unitId: unit.id,
          targetUnitId: target.id,
        });
    if (stampedeActorRejectionV7(view, unit) === null)
      for (const at of publicStampedeTargetsV7(view, unit))
        candidates.push({ kind: "STAMPEDE", unitId: unit.id, at });
    // The frozen sea (naval branch section 8.4): Freeze, for every `at`
    // with a non-empty freeze set (one for the Ice Witch: her own tile).
    if (rule.abilities.includes("FREEZE"))
      for (const at of publicFreezeTargetsV7(view, unit))
        candidates.push({ kind: "FREEZE", unitId: unit.id, at });
  }
  // The Dwarf revision: the Steam Mole's Tunnel, the Gyrocopter's bombing
  // run, and the Engineer's Assemble, each offered exactly when legal.
  if (!overrun && unit.form === "LAND") {
    if (
      rule.abilities.includes("TUNNEL") &&
      !unit.activation.moved &&
      !primaryUsedForQuery(unit) &&
      !view.surfacedThisTurn.includes(unit.id)
    )
      candidates.push(...publicTunnelCommandsV7(view, unit));
    if (
      rule.abilities.includes("BOMB_RUN") &&
      !unit.activation.moved &&
      !primaryUsedForQuery(unit) &&
      !unitIsFrozenV7(view, unit)
    )
      for (const target of publicBombTargetsV7(view, unit))
        for (const to of publicBombLandingsV7(view, unit, target))
          candidates.push({
            kind: "BOMB_RUN",
            unitId: unit.id,
            targetUnitId: target.id,
            to,
          });
    if (rule.abilities.includes("ASSEMBLE") && primaryReady)
      for (const to of publicAssembleTilesV7(view, unit))
        candidates.push({ kind: "ASSEMBLE", unitId: unit.id, to });
    // Dwarf crowd control (`pulp_wars-w49.33`): the Whirligig's Whirl (with
    // a target) and the Engineer's Barricade (below the cap, with the
    // Coins), each offered exactly when legal.
    if (
      primaryReady &&
      unit.activation.attacksUsed === 0 &&
      unitWhirlsV7(view, unit) &&
      publicWhirlTargetsV7(view, unit).length > 0
    )
      candidates.push({ kind: "WHIRL", unitId: unit.id });
    if (rule.abilities.includes("BARRICADE") && primaryReady)
      for (const to of publicBarricadeTilesV7(view, unit))
        candidates.push({ kind: "BUILD_BARRICADE", unitId: unit.id, to });
  }
  // Dwarf crowd control: an attack on every hostile Barricade in range on
  // an explored tile, by any unit that could make an ordinary attack now.
  const barricades = barricadesOfV7(view);
  if (
    barricades.length > 0 &&
    barricadeAttackerRejectionV7(view, unit, primaryUsedForQuery(unit)) === null
  )
    for (const barricade of barricades) {
      const distance = chebyshev(unit.at, barricade.at);
      if (
        publicHostile(view, player.id, barricade.ownerId) &&
        distance >= rule.minimumRange &&
        distance <= attackRange
      )
        candidates.push({
          kind: "ATTACK_BARRICADE",
          unitId: unit.id,
          at: { x: barricade.at.x, y: barricade.at.y },
        });
    }
  // Revision 19 Hatch: every adjacent own Egg laid on an earlier turn.
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("HATCH")
  )
    for (const egg of publicHatchTargetsV7(view, unit))
      candidates.push({ kind: "HATCH", unitId: unit.id, eggUnitId: egg.id });
  // Revision 13 Wail: offered exactly when at least one visible target exists.
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("WAIL") &&
    publicWailTargetsV7(view, unit).length > 0
  )
    candidates.push({ kind: "WAIL", unitId: unit.id });
  // Revision 17 Kaboom: any goblin-crewed land-form unit that has not used a
  // primary action, after a Move too, with or without a unit in the area.
  // The Goblin pass (7r50): Crash, a Scrap Buggy also after its attacks.
  if (
    kaboomReadyV7(
      unit.activation,
      unitRoleMechanicsV7(view, unit).kaboomAfterAttack,
    ) &&
    !unitIsFrozenV7(view, unit) &&
    unit.form === "LAND" &&
    rule.abilities.includes("KABOOM")
  )
    candidates.push({ kind: "KABOOM", unitId: unit.id });
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("RALLY") &&
    // The Martian pass, correction: a Cooling Brain cannot command.
    !(
      unitRoleMechanicsV7(view, unit).rallyCools &&
      isCoolingV7(view.cooling, unit.id)
    ) &&
    view.units.some((target) => isRallyTargetV7(view, unit, target))
  )
    candidates.push({ kind: "RALLY", unitId: unit.id });
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("TEND_WOUNDED") &&
    (publicTendTargetsV7(view, unit).length > 0 ||
      // Dwarf crowd control: an Engineer's Repair of an own Barricade.
      barricadeRepairsV7(view, barricadesOfV7(view), unit).length > 0)
  )
    candidates.push({ kind: "TEND_WOUNDED", unitId: unit.id });
  // Revision 13 Grave actions (sections 6.2 and 6.3), offered exactly when
  // legal from the viewer's explored Graves and visible units.
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("RAISE_DEAD") &&
    raiseDeadGravesV7(view.graves, allOwnedUnitsV7(view), unit.at).length > 0
  )
    candidates.push({ kind: "RAISE_DEAD", unitId: unit.id });
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("DEVOUR") &&
    view.graves.some((grave) => same(grave, unit.at))
  )
    candidates.push({ kind: "DEVOUR", unitId: unit.id });
  if (overrun) return;
  // Map curiosities round 2 (section 30.1): a toss at the Wishing Well,
  // offered exactly when the reducer accepts it.
  if (
    primaryReady &&
    unit.form === "LAND" &&
    // The Cultists (section 13.1): a daemon never tosses a Coin.
    !unitIsSummonedV7(unit) &&
    view.curiosities.some(
      (curiosity) =>
        curiosity.kind === "WISHING_WELL" &&
        same(curiosity.at, unit.at) &&
        !curiosity.tossedBy.includes(player.id),
    ) &&
    player.coins >= 1
  )
    candidates.push({ kind: "TOSS_COIN", unitId: unit.id });
  // Section 10: the predicate End Turn idle recovery uses. The Candy
  // revision: a Crashed unit recovers idle at End Turn but cannot `RECOVER`.
  if (!crashed && recoverEligibleV7(publicRecoveryFactsV7(view, unit)))
    candidates.push({ kind: "RECOVER", unitId: unit.id });
  if (
    !crashed &&
    !unit.activation.moved &&
    !primaryUsedForQuery(unit) &&
    unit.captureEligible &&
    publicCaptureTarget(view, unit.at)
  )
    candidates.push({ kind: "CAPTURE", unitId: unit.id });
  // Revision 19: a Dinosaur unit grows instead and is never promoted. The
  // Mind Control revision: a controlled unit is promoted like any own unit
  // but never Disbands; the Martian revision: a flyer cannot Pillage.
  const controlled = isMindControlledV7(view, unit.id);
  if (
    unit.form !== "EMBARKED" &&
    unit.kills >= PROMOTION_KILLS_V7 &&
    !unit.veteran &&
    !unitGrowsV7(view, unit) &&
    // The Cultists (section 4.2): a summoned unit is never promoted.
    !unitIsSummonedV7(unit)
  )
    candidates.push({ kind: "PROMOTE", unitId: unit.id });
  const tile = tileAtView(view, unit.at);
  if (
    player.researchedTechs.includes("RAIDING") &&
    unit.form === "LAND" &&
    unit.role !== "JUGGERNAUT" &&
    !unitFliesV7(view, unit) &&
    !crashed &&
    !primaryUsedForQuery(unit) &&
    !unitIsFrozenV7(view, unit) &&
    tile?.explored === true &&
    tile.improvement !== null &&
    tile.territoryOwnerId !== null &&
    publicHostile(view, player.id, tile.territoryOwnerId)
  )
    candidates.push({ kind: "PILLAGE", unitId: unit.id });
  // Revision 14: plagued and bitten units cannot Disband.
  if (
    player.researchedTechs.includes("ADMINISTRATION") &&
    !primaryUsedForQuery(unit) &&
    unit.form === "LAND" &&
    unit.role !== "JUGGERNAUT" &&
    // The Cultists (section 4.2): a summoned unit is never disbanded (it
    // has no printed cost, like a reward giant).
    !unitIsSummonedV7(unit) &&
    !controlled &&
    !view.plagued.some((entry) => entry.unitId === unit.id) &&
    !view.bitten.some((entry) => entry.unitId === unit.id)
  )
    candidates.push({ kind: "DISBAND", unitId: unit.id });
  // The Martian pass, correction: Disband on a controlled unit is Release.
  if (controlled && unit.form === "LAND")
    candidates.push({ kind: "DISBAND", unitId: unit.id });
  if (
    !unit.activation.moved &&
    !primaryUsedForQuery(unit) &&
    unit.form === "LAND" &&
    // Revision 17: the Goblin Goblin cannot build Field Defense.
    unitRoleMechanicsV7(view, unit).buildsFieldDefense &&
    player.researchedTechs.includes("FORTIFICATION") &&
    tile?.explored === true &&
    tile.biome !== null &&
    tile.terrain !== "RIFT" &&
    tile.territoryOwnerId === player.id &&
    !tile.fieldDefense &&
    player.coins >= 3
  )
    candidates.push({ kind: "BUILD_FIELD_DEFENSE", unitId: unit.id });
  if (!unit.activation.handled)
    candidates.push({ kind: "WAIT", unitId: unit.id });
}

/**
 * The Cultists (docs/product/RULESET_7_CULTISTS.md sections 5.1 and 5.2): a
 * Summoner's Sacrifice and Seize, each offered for every victim the reducer
 * accepts (the shared legality predicates of src/engine/v7/cult.ts). Every
 * unit on an explored tile is visible, HP and afflictions are public, and
 * the holder is an own unit, so the offer is exact.
 */
function appendPublicCultCommandsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  candidates: CommandV7[],
): void {
  if (unit.ownerId !== view.viewer.id) return;
  const abilities = unitRoleRuleV7(view, unit).abilities;
  if (abilities.includes("SACRIFICE"))
    for (const victim of view.units)
      if (sacrificeRejectionV7(view, unit, victim) === null)
        candidates.push({
          kind: "SACRIFICE",
          unitId: unit.id,
          victimUnitId: victim.id,
        });
  if (abilities.includes("SEIZE"))
    for (const victim of view.units)
      if (seizeRejectionV7(view, view.units, unit, victim) === null)
        candidates.push({
          kind: "SEIZE",
          unitId: unit.id,
          victimUnitId: victim.id,
        });
  // The channel (`pulp_wars-mch9.5`, sections 6.1, 6.2, 8.1, 8.4, and 8.5),
  // each offered exactly when the reducer accepts it (the shared legality
  // predicates of src/engine/v7/cult-channel.ts): Favour and the strands of
  // own cultists are in the view, and every unit beside an own unit is
  // visible.
  if (abilities.includes("SUMMON")) {
    const favour = favourOfV7(view, view.viewer.id);
    const facts = publicGiantTileFactsV7(view);
    const tiles = ringTilesV7(view.board.width, view.board.height, unit.at);
    for (const helper of view.units)
      if (summonHelperLegalV7(view, unit, helper))
        for (const at of tiles)
          if (summonRejectionV7(view, facts, favour, unit, helper, at) === null)
            candidates.push({
              kind: "SUMMON",
              unitId: unit.id,
              helperUnitId: helper.id,
              at,
            });
  }
  if (abilities.includes("CHANNEL"))
    for (const daemon of view.units)
      if (
        daemon.ownerId === unit.ownerId &&
        channelRejectionV7(view, unit, daemon) === null
      )
        candidates.push({
          kind: "CHANNEL",
          unitId: unit.id,
          daemonUnitId: daemon.id,
        });
  if (abilities.includes("BEHOLD") && beholdRejectionV7(view, unit) === null)
    candidates.push({ kind: "BEHOLD", unitId: unit.id });
  if (abilities.includes("ANCHOR"))
    for (const cultist of view.units)
      if (
        cultist.ownerId === unit.ownerId &&
        anchorRejectionV7(view, unit, cultist) === null
      )
        candidates.push({
          kind: "ANCHOR",
          unitId: unit.id,
          cultistUnitId: cultist.id,
        });
  if (
    abilities.includes("BOO") &&
    booRejectionV7(view, view.units, unit) === null
  )
    candidates.push({ kind: "BOO", unitId: unit.id });
}

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.2): the
 * slots the viewer's own held victims take in its city `cityId` (a victim
 * still counts for its home city's unit limit; the viewer knows its own).
 */
function publicSwallowedSlotsV7(view: PlayerViewV7, cityId: CityId): number {
  let used = 0;
  for (const entry of view.giants.swallowed)
    if (
      entry.unit.ownerId === view.viewer.id &&
      entry.unit.homeCityId === cityId
    )
      used += unitCapacitySlotsV7(view, entry.unit);
  return used;
}

/**
 * The giants' signatures (section 6): the tile facts of the viewer's
 * placement rules (Goblin Toss and Break Off). Every unit and mound on an
 * explored tile is visible, so the offer equals the reducer's legality.
 */
function publicGiantTileFactsV7(view: PlayerViewV7): GiantTileFactsV7 {
  return {
    tile: (at) => {
      const tile = tileAtView(view, at);
      return tile?.explored === true
        ? {
            terrain: tile.terrain,
            biome: tile.biome,
            site: tile.site,
            fieldDefense: tile.fieldDefense,
            territoryOwnerId: tile.territoryOwnerId,
          }
        : undefined;
    },
    occupied: (at) => tileOccupiedV7(view, at),
    chest: (at) => view.treasureChests.some((chest) => same(chest, at)),
    curiosity: (at) => view.curiosities.some((item) => same(item.at, at)),
    ice: (at) => isIceAtV7(view, at),
    allied: (left, right) => publicAllied(view, left, right),
  };
}

/**
 * The giants' signatures (section 6): Swallow, Goblin Toss, Thunder Stomp,
 * and Break Off, each offered exactly when the reducer accepts it (the
 * shared legality predicates of src/engine/v7/giants.ts).
 */
function appendPublicGiantCommandsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  candidates: CommandV7[],
): void {
  const signature = giantSignatureV7(view, unit);
  if (signature === null || unit.ownerId !== view.viewer.id) return;
  if (signature === "SWALLOW") {
    for (const target of view.units)
      if (
        swallowRejectionV7(view, view.giants.swallowed, unit, target) === null
      )
        candidates.push({
          kind: "SWALLOW",
          unitId: unit.id,
          targetUnitId: target.id,
        });
    return;
  }
  if (signature === "TOSS") {
    if (tossActorRejectionV7(view, unit) !== null) return;
    const facts = publicGiantTileFactsV7(view);
    const tiles = tossCandidateTilesV7(
      view.board.width,
      view.board.height,
      unit.at,
      unitRoleMechanicsV7(view, unit).tossRange,
    ).filter((at) =>
      tossDestinationLegalV7(
        view,
        facts,
        unit,
        view.viewer.researchedTechs,
        at,
      ),
    );
    for (const passenger of view.units)
      if (tossPassengerLegalV7(view, unit, passenger))
        for (const at of tiles)
          candidates.push({
            kind: "TOSS",
            unitId: unit.id,
            passengerUnitId: passenger.id,
            at,
          });
    return;
  }
  if (signature === "STOMP") {
    if (stompRejectionV7(view, unit) === null)
      candidates.push({ kind: "STOMP", unitId: unit.id });
    return;
  }
  if (signature === "BREAK_OFF") {
    const home = view.cities.find((city) => city.id === unit.homeCityId);
    if (breakOffActorRejectionV7(view, unit, home?.ownerId ?? null) !== null)
      return;
    if (home === undefined) return;
    // Every pair of legal tiles, in (y, x) order (the user's change of
    // 2026-10-09: two Gingerbread Men; no slot is needed).
    const facts = publicGiantTileFactsV7(view);
    const tiles = ringTilesV7(
      view.board.width,
      view.board.height,
      unit.at,
    ).filter((at) =>
      breakOffTileLegalV7(view, facts, unit, view.viewer.researchedTechs, at),
    );
    for (let first = 0; first < tiles.length; first += 1)
      for (let second = first + 1; second < tiles.length; second += 1) {
        const left = tiles[first];
        const right = tiles[second];
        if (left !== undefined && right !== undefined)
          candidates.push({
            kind: "BREAK_OFF",
            unitId: unit.id,
            tiles: [left, right],
          });
      }
  }
}

/** A unit's movement mode and Mountain-born, through its kind. */
/**
 * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.2): the
 * visible hostile ships an own ship may `BOARD` now, in view order: exactly
 * the targets the reducer accepts (the actor rows 2 to 4, then the shared
 * `boardTargetBlockV7`). Every unit on an explored tile is visible, and HP
 * and maximum HP are public, so the offer is exact.
 */
function publicBoardTargetsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): PlayerViewV7["units"] {
  if (
    unit.ownerId !== view.viewer.id ||
    unit.form !== "NAVAL" ||
    !unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).boarding ||
    unit.activation.overrunActive ||
    primaryUsedForQuery(unit) ||
    primaryActionBlockedAfterMoveV7(view, unit) ||
    // The frozen sea (section 4.2 row 4a): an icebound ship cannot board.
    unitIsIceboundV7(view, unit)
  )
    return [];
  const navigation = view.viewer.researchedTechs.includes("NAVIGATION");
  return view.units.filter((target) => {
    if (!publicHostile(view, view.viewer.id, target.ownerId)) return false;
    // Row 10: a prize on Deep Water needs the viewer's Navigation (a visible
    // unit stands on an explored tile).
    const tile = tileAtView(view, target.at);
    return (
      boardTargetBlockV7(
        unit,
        target,
        tile?.explored === true ? tile.terrain : undefined,
        navigation,
      ) === null
    );
  });
}

/**
 * The naval branch, the frozen sea
 * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.4): the freeze set of a
 * Freeze by the viewer's land unit `unit` aimed at `at`, from the public
 * view. Every tile it reads must be explored by the viewer, every unit on an
 * explored tile is visible, and the ice on explored tiles is public, so it
 * equals the reducer's set.
 */
function publicFreezeSetV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  at: CoordV7,
): FreezeSetV7 {
  const capabilities = unitCapabilitiesV7(
    view,
    unit,
    view.viewer.researchedTechs,
  );
  return freezeSetV7({
    from: unit.at,
    at,
    ring: unitFreezesRingV7(view, unit),
    freezeWater: capabilities.freezeWater,
    icebound: capabilities.icebound,
    tileAt: (target) => {
      const tile = tileAtView(view, target);
      if (tile === undefined) return undefined;
      if (!tile.explored)
        return {
          explored: false,
          terrain: "GRASS",
          improvement: null,
          ice: false,
          unit: null,
        };
      const occupant = view.units.find(
        (candidate) => candidate.hp > 0 && same(candidate.at, target),
      );
      return {
        explored: true,
        terrain: tile.terrain,
        improvement: tile.improvement,
        ice: isIceAtV7(view, target),
        unit:
          occupant === undefined
            ? null
            : {
                id: occupant.id,
                form: occupant.form,
                hostile: publicHostile(view, view.viewer.id, occupant.ownerId),
              },
      };
    },
  });
}

/**
 * Section 8.4: the `at` of every `FREEZE` the viewer's land unit may make
 * now, in (y, x) order: its own tile for the Ice Witch, otherwise each of
 * the eight tiles around it, each with a non-empty freeze set. The caller
 * has checked the actor rows (the role's `FREEZE`, land form, and that the
 * unit may use a primary action); Rime is checked here.
 */
function publicFreezeTargetsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): readonly CoordV7[] {
  if (
    unit.ownerId !== view.viewer.id ||
    unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).freezeWater ===
      "NONE"
  )
    return [];
  const candidates = unitFreezesRingV7(view, unit)
    ? [unit.at]
    : adjacentPublicTiles(view, unit.at).map((tile) => tile.at);
  return candidates.filter(
    (at) => publicFreezeSetV7(view, unit, at).tiles.length > 0,
  );
}

/**
 * Section 8.4: the exact result of an offered `FREEZE`: every tile that
 * becomes (or stays) ice, the ones of them that were already ice and are
 * refreshed, the afloat units locked in the ice, the countdown every tile
 * of the set gets (`turns`: the actor's `iceTurns`, in its owner's turns),
 * and the tiles of the set in the actor's owner's territory (`permanent`,
 * in the order of `tiles`): that ice does not count down while the
 * territory is the owner's (section 8.5).
 */
export interface FreezePreviewV7 {
  readonly unitId: UnitId;
  readonly tiles: readonly CoordV7[];
  readonly refreshed: readonly CoordV7[];
  readonly icebound: readonly UnitId[];
  readonly turns: number;
  readonly permanent: readonly CoordV7[];
}

/**
 * Section 8.4: the preview of `FREEZE` by the viewer's unit `unitId` aimed
 * at `at`, or null unless that command is offered.
 */
export function previewFreezeV7(
  view: PlayerViewV7,
  unitId: UnitId,
  at: CoordV7,
): FreezePreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "FREEZE" &&
        command.unitId === unitId &&
        same(command.at, at),
    )
  )
    return null;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return null;
  const frozen = publicFreezeSetV7(view, unit, at);
  return {
    unitId,
    tiles: frozen.tiles,
    refreshed: frozen.refreshed,
    icebound: frozen.icebound,
    turns: unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).iceTurns,
    // An offered Freeze is the viewer's own unit's, and every tile of the
    // set is explored, so its territory owner is public.
    permanent: frozen.tiles.filter((target) => {
      const tile = tileAtView(view, target);
      return tile?.explored === true && tile.territoryOwnerId === unit.ownerId;
    }),
  };
}

/**
 * The naval branch (section 4.2): the exact result of an offered `BOARD`.
 * The prize keeps its ID, role, maximum HP, kills, and tile, belongs to the
 * viewer afterwards, and has `hpAfter` HP.
 */
export interface BoardPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  readonly fromPlayerId: PlayerId;
  readonly hpAfter: number;
}

/**
 * The naval branch (section 4.2): the preview of `BOARD` by the viewer's
 * ship `unitId` on `targetUnitId`, or null unless that command is offered.
 */
export function previewBoardV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): BoardPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "BOARD" &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return null;
  return {
    unitId,
    targetUnitId,
    fromPlayerId: target.ownerId,
    hpAfter: boardedHpV7(target.maxHp),
  };
}

function unitMobilityV7(
  view: PlayerViewV7,
  unit: Pick<PublicUnitV7, "id" | "ownerId" | "role">,
): { readonly movementMode: MovementModeV7; readonly mountainBorn: boolean } {
  return {
    movementMode: unitMovementModeV7(view, unit),
    mountainBorn: unitIsMountainBornV7(view, unit),
  };
}

/**
 * The Dwarf revision section 5.1: whether `at` is a tunnel tile for a unit
 * with `mobility` (its movement mode and Mountain-born, resolved by the
 * caller: a unit's through its kind, a Gunner to assemble through the
 * seat) in the viewer's view (exact: every unit and mound on an explored
 * tile is visible, and the unit is the viewer's own).
 */
function publicTunnelTileV7(
  view: PlayerViewV7,
  mobility: {
    readonly movementMode: MovementModeV7;
    readonly mountainBorn: boolean;
  },
  at: CoordV7,
): boolean {
  const tile = tileAtView(view, at);
  return (
    tile?.explored === true &&
    tile.biome !== null &&
    tile.terrain !== "RIFT" &&
    tile.site === null &&
    // Map curiosities round 2 (section 28.2): never a gate.
    gateAtV7(view.curiosities, at) === null &&
    canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: mobility.movementMode,
      afloat: false,
      engineering: view.viewer.researchedTechs.includes("ENGINEERING"),
      navigation: false,
      mountainBorn: mobility.mountainBorn,
      ice: false,
    }) &&
    !tileOccupiedV7(view, at) &&
    !view.treasureChests.some((chest) => same(chest, at)) &&
    !(
      tile.territoryOwnerId !== null &&
      publicAllied(view, view.viewer.id, tile.territoryOwnerId)
    )
  );
}

/**
 * The Dwarf revision section 5.1: every legal `TUNNEL` of an own ready Mole,
 * one per destination and rider tile plus the rider-less entry (the Beam
 * Down precedent), in `compareCommandsV7` order.
 */
function publicTunnelCommandsV7(
  view: PlayerViewV7,
  mole: PublicUnitV7,
): readonly CommandV7[] {
  const range = unitRoleMechanicsV7(view, mole).tunnelRange;
  const reach = tunnelReachV7(
    view.board,
    (at) => {
      const tile = tileAtView(view, at);
      return tile?.explored === true && tile.biome !== null;
    },
    mole.at,
    range,
  );
  // The Mind Control revision section 5.3: a controlled Mole tunnels alone
  // (and a controlled unit never rides: its role rule drops RIDES_TUNNEL).
  const riders = view.units
    .filter(
      (rider) =>
        rider.id !== mole.id &&
        !isMindControlledV7(view, mole.id) &&
        rider.ownerId === mole.ownerId &&
        rider.hp > 0 &&
        rider.form === "LAND" &&
        unitRoleRuleV7(view, rider).abilities.includes("RIDES_TUNNEL") &&
        chebyshev(rider.at, mole.at) === 1 &&
        !rider.activation.moved &&
        !rider.activation.overrunActive &&
        !primaryUsedForQuery(rider) &&
        !view.surfacedThisTurn.includes(rider.id),
    )
    .sort((left, right) => left.id - right.id);
  const commands: CommandV7[] = [];
  for (const to of [...reach.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  )) {
    if (!publicTunnelTileV7(view, unitMobilityV7(view, mole), to)) continue;
    commands.push({ kind: "TUNNEL", unitId: mole.id, to, rider: null });
    for (const rider of riders)
      for (const tile of adjacentPublicTiles(view, to))
        if (publicTunnelTileV7(view, unitMobilityV7(view, rider), tile.at))
          commands.push({
            kind: "TUNNEL",
            unitId: mole.id,
            to,
            rider: { unitId: rider.id, to: tile.at },
          });
  }
  return commands;
}

/**
 * The Dwarf revision section 6.2 rows 6 to 9: the targets of an own ready
 * Gyrocopter: visible hostile units within `BOMB_RANGE_V7` not bombed this
 * turn, in unit-ID order.
 */
function publicBombTargetsV7(
  view: PlayerViewV7,
  gyro: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units
    .filter(
      (target) =>
        target.hp > 0 &&
        target.id !== gyro.id &&
        publicHostile(view, gyro.ownerId, target.ownerId) &&
        chebyshev(target.at, gyro.at) <= BOMB_RANGE_V7 &&
        !view.bombedThisTurn.includes(target.id),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * The Dwarf revision section 6.2 row 10: the landings of a bombing run on
 * `target`, in (y, x) order: within `BOMB_LANDING_RANGE_V7` (2; Dwarf crowd
 * control, `pulp_wars-w49.33`) of the target, strictly farther from the
 * Gyrocopter, explored, no treasure chest, and an offered Move destination
 * of the Gyrocopter.
 */
function publicBombLandingsV7(
  view: PlayerViewV7,
  gyro: PublicUnitV7,
  target: PublicUnitV7,
): readonly CoordV7[] {
  return reachablePlayerMovementPathsV7(view, gyro)
    .map((path) => path.destination)
    .filter((at) => {
      const tile = tileAtView(view, at);
      return (
        tile?.explored === true &&
        chebyshev(at, target.at) <= BOMB_LANDING_RANGE_V7 &&
        chebyshev(at, gyro.at) > chebyshev(target.at, gyro.at) &&
        !view.treasureChests.some((chest) => same(chest, at))
      );
    })
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

/**
 * The Dwarf revision section 9.2: the legal Assemble tiles of an own ready
 * Engineer (Marksmanship, a home city of the viewer with a free slot, the
 * Coins), in (y, x) order; empty when any condition but the tile fails.
 */
function publicAssembleTilesV7(
  view: PlayerViewV7,
  engineer: PublicUnitV7,
): readonly CoordV7[] {
  const facts = publicAssembleFactsV7(view, engineer);
  if (facts === null || facts.unavailableReason !== null) return [];
  return facts.tiles;
}

/** The Dwarf revision section 9.2: the public facts of an Assemble. */
function publicAssembleFactsV7(
  view: PlayerViewV7,
  engineer: PublicUnitV7,
): {
  readonly cityId: CityId | null;
  readonly cost: number;
  readonly usedSlots: number;
  readonly capacity: number;
  readonly tiles: readonly CoordV7[];
  readonly unavailableReason:
    | "TECH_REQUIRED"
    | "NO_HOME"
    | "CITY_CAPACITY_FULL"
    | "INSUFFICIENT_COINS"
    | "INVALID_TILE"
    | null;
} | null {
  if (engineer.ownerId !== view.viewer.id) return null;
  const player = view.viewer;
  const home = view.cities.find(
    (city) => city.id === engineer.homeCityId && city.ownerId === player.id,
  );
  // The Gunner is not built yet: a role-level read of the viewer's seat.
  const gunner = seatRoleMechanicsV7(view, player.id, "MARKSMAN");
  const gunnerMobility = {
    movementMode: gunner.movementMode,
    mountainBorn: gunner.mountainBorn,
  };
  const tiles = adjacentPublicTiles(view, engineer.at)
    .filter((tile) => publicTunnelTileV7(view, gunnerMobility, tile.at))
    .map((tile) => tile.at)
    .sort((left, right) => left.y - right.y || left.x - right.x);
  const capacity =
    home === undefined
      ? 0
      : cityUnitCapacityForV7(
          home.level,
          player.researchedTechs,
          player.faction,
          cityBarracksV7(home),
        );
  const usedSlots =
    home === undefined
      ? 0
      : allOwnedUnitsV7(view, player.id)
          .filter((unit) => unit.homeCityId === home.id)
          .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0) +
        publicSwallowedSlotsV7(view, home.id);
  const forge =
    home !== undefined &&
    view.improvementValues.some((value) => {
      if (value.improvement !== "FORGE" || value.level <= 0) return false;
      const tile = tileAtView(view, value.at);
      return tile?.explored === true && tile.territoryCityId === home.id;
    });
  const cost = Math.max(1, ASSEMBLE_COST_V7 - (forge ? 1 : 0));
  const slots = gunner.capacitySlots;
  return {
    cityId: home?.id ?? null,
    cost,
    usedSlots,
    capacity,
    tiles,
    unavailableReason: !technologyCapabilitiesV7(
      player.researchedTechs,
      player.faction,
    ).assemble
      ? "TECH_REQUIRED"
      : home === undefined
        ? "NO_HOME"
        : usedSlots + slots > capacity
          ? "CITY_CAPACITY_FULL"
          : player.coins < cost
            ? "INSUFFICIENT_COINS"
            : tiles.length === 0
              ? "INVALID_TILE"
              : null,
  };
}

/** The Dwarf revision (section 14): the preview of an offered Tunnel. */
export interface TunnelPreviewV7 {
  readonly unitId: UnitId;
  readonly to: CoordV7;
  readonly riderUnitId: UnitId | null;
  readonly riderTo: CoordV7 | null;
  /** The viewer's eruption (2, or 3 with Blasting Charges). */
  readonly eruptionDamage: number;
  /**
   * The eruption is a forecast on the current board: the targets may move
   * before the Mole surfaces at its owner's next Start Turn.
   */
  readonly projected: true;
  /** The visible hostile ground units around `to`, in (y, x, id) order. */
  readonly eruptionTargets: readonly CombatSplashEntryV7[];
  /** The explored tiles whose Field Defense the surfacing undermines. */
  readonly undermines: readonly CoordV7[];
}

/**
 * The Dwarf revision (section 14): null unless that `TUNNEL` is offered;
 * the eruption as if it happened on the current board (`projected`).
 */
export function previewTunnelV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "TUNNEL" }>,
): TunnelPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (candidate) =>
        candidate.kind === "TUNNEL" && sameTunnelV7(candidate, command),
    )
  )
    return null;
  // The Mind Control revision section 5.2: the eruption damage is the
  // Mole's unit-level unlock.
  const mole = view.units.find((unit) => unit.id === command.unitId);
  if (mole === undefined) return null;
  const eruptionDamage = unitCapabilitiesV7(
    view,
    mole,
    view.viewer.researchedTechs,
  ).eruptionDamage;
  const undermines: CoordV7[] = [];
  for (let y = command.to.y - 1; y <= command.to.y + 1; y += 1)
    for (let x = command.to.x - 1; x <= command.to.x + 1; x += 1) {
      const tile = tileAtView(view, { x, y });
      if (tile?.explored === true && tile.fieldDefense)
        undermines.push({ x, y });
    }
  return {
    unitId: command.unitId,
    to: command.to,
    riderUnitId: command.rider?.unitId ?? null,
    riderTo: command.rider?.to ?? null,
    eruptionDamage,
    projected: true,
    eruptionTargets: eruptionResultsV7(
      view,
      view.viewer.id,
      command.to,
      eruptionDamage,
      view.units,
      (unitId) => shieldOfV7(view.shields, unitId),
    ),
    undermines,
  };
}

function sameTunnelV7(
  left: Extract<CommandV7, { kind: "TUNNEL" }>,
  right: Extract<CommandV7, { kind: "TUNNEL" }>,
): boolean {
  return (
    left.unitId === right.unitId &&
    same(left.to, right.to) &&
    (left.rider === null
      ? right.rider === null
      : right.rider !== null &&
        left.rider.unitId === right.rider.unitId &&
        same(left.rider.to, right.rider.to))
  );
}

/** The Dwarf revision (section 14): the preview of an offered bombing run. */
export interface BombRunPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  readonly to: CoordV7;
  /** HP damage of the bomb (exact: fixed damage on a visible target). */
  readonly damage: number;
  /** What the target's Shield absorbs. */
  readonly shieldDamage: number;
  readonly kills: boolean;
  /** The death blasts of a killed exploding target (the Gyrocopter beside). */
  readonly blast: readonly ExplosionPreviewV7[];
  /**
   * An estimate of the damage the visible enemies could deal the Gyrocopter
   * at `to` on their next turn: the sum, over every visible hostile unit
   * whose threatened tiles (`queryThreatenedTilesV7`) include `to`, of one
   * full-strength hit on it (a Gyrocopter enemy: its public bomb), capped
   * at the Gyrocopter's HP.
   */
  readonly landingThreat: number;
}

/** The Dwarf revision (section 14): null unless that `BOMB_RUN` is offered. */
export function previewBombRunV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "BOMB_RUN" }>,
): BombRunPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (candidate) =>
        candidate.kind === "BOMB_RUN" &&
        candidate.unitId === command.unitId &&
        candidate.targetUnitId === command.targetUnitId &&
        same(candidate.to, command.to),
    )
  )
    return null;
  const gyro = view.units.find((unit) => unit.id === command.unitId);
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  if (gyro === undefined || target === undefined) return null;
  // The Mind Control revision section 5.2: the Gyrocopter's unit-level
  // unlock.
  const bombDamage = unitCapabilitiesV7(
    view,
    gyro,
    view.viewer.researchedTechs,
  ).bombDamage;
  const hit = absorbHitV7(
    shieldOfV7(view.shields, target.id),
    target.hp,
    armouredDamageV7(view, target, bombDamage),
  );
  const kills = hit.hpDamage >= target.hp;
  let blast: readonly ExplosionPreviewV7[] = [];
  if (kills && isExplodingUnitV7(view, target)) {
    const sim = createPublicChainSimulationV7(view);
    const units = view.units
      .filter((unit) => unit.id !== target.id)
      .map((unit) =>
        unit.id === gyro.id
          ? { ...sim.blastUnit(unit), at: command.to }
          : sim.blastUnit(unit),
      );
    const rising = sim.rise(sim.blastUnit(target));
    if (rising !== null) units.push(rising);
    blast = sim.run(
      sim.collapse(units),
      [{ unit: { ...sim.blastUnit(target), hp: 0 }, cause: "DEATH" }],
      false,
      [],
      new Map([[target.id, hit.shieldDamage]]),
    ).explosions;
  }
  return {
    unitId: gyro.id,
    targetUnitId: target.id,
    to: command.to,
    damage: hit.hpDamage,
    shieldDamage: hit.shieldDamage,
    kills,
    blast,
    landingThreat: publicLandingThreatV7(view, gyro, command.to),
  };
}

/** See {@link BombRunPreviewV7.landingThreat}. */
function publicLandingThreatV7(
  view: PlayerViewV7,
  gyro: PublicUnitV7,
  at: CoordV7,
): number {
  const gyroRule = unitRoleRuleV7(view, gyro);
  let total = 0;
  for (const enemy of view.units) {
    if (
      enemy.hp <= 0 ||
      enemy.form === "EGG" ||
      !publicHostile(view, gyro.ownerId, enemy.ownerId) ||
      !queryThreatenedTilesV7(view, enemy.id).some((tile) => same(tile, at))
    )
      continue;
    const rule = unitRoleRuleV7(view, enemy);
    if (rule.abilities.includes("BOMB_RUN")) {
      const stats = view.unitStats.find((entry) => entry.unitId === enemy.id);
      total += stats?.dwarf?.bombDamage ?? 0;
      continue;
    }
    if (!rule.abilities.includes("ATTACK") || rule.attack2 <= 0) continue;
    const attack = BigInt(rule.attack2) * BigInt(enemy.hp);
    const attackDenominator = 2n * BigInt(enemy.maxHp);
    const defense = BigInt(gyroRule.defense2) * BigInt(gyro.hp);
    const defenseDenominator = 2n * BigInt(gyro.maxHp);
    const attackOnCommon = attack * defenseDenominator;
    const totalForce = attackOnCommon + defense * attackDenominator;
    if (totalForce <= 0n) continue;
    total += roundHalfUpPublic(
      attackOnCommon * BigInt(rule.attack2) * 9n,
      totalForce * 4n,
    );
  }
  return Math.min(total, gyro.hp);
}

/** The Dwarf revision (section 14): the preview of an Engineer's Assemble. */
export interface AssemblePreviewV7 {
  readonly unitId: UnitId;
  readonly cost: number;
  readonly cityId: CityId;
  readonly usedSlots: number;
  readonly capacity: number;
  /** The offered tiles in (y, x) order. */
  readonly tiles: readonly CoordV7[];
}

/** The Dwarf revision (section 14): null unless `ASSEMBLE` is offered. */
export function previewAssembleV7(
  view: PlayerViewV7,
  unitId: UnitId,
): AssemblePreviewV7 | null {
  const tiles = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "ASSEMBLE" && command.unitId === unitId
      ? [command.to]
      : [],
  );
  const engineer = view.units.find((unit) => unit.id === unitId);
  if (tiles.length === 0 || engineer === undefined) return null;
  const facts = publicAssembleFactsV7(view, engineer);
  if (facts === null || facts.cityId === null) return null;
  return {
    unitId,
    cost: facts.cost,
    cityId: facts.cityId,
    usedSlots: facts.usedSlots,
    capacity: facts.capacity,
    tiles,
  };
}

/**
 * The Dwarf revision (section 16.1): why an own Engineer cannot Assemble
 * now (for the UI's disabled reason), or null when it can; null for any
 * other unit.
 */
export function queryAssembleUnavailableReasonV7(
  view: PlayerViewV7,
  unitId: UnitId,
):
  | "TECH_REQUIRED"
  | "NO_HOME"
  | "CITY_CAPACITY_FULL"
  | "INSUFFICIENT_COINS"
  | "INVALID_TILE"
  | null {
  const engineer = view.units.find((unit) => unit.id === unitId);
  if (
    engineer === undefined ||
    !unitRoleRuleV7(view, engineer).abilities.includes("ASSEMBLE")
  )
    return null;
  return publicAssembleFactsV7(view, engineer)?.unavailableReason ?? null;
}

// ------------------------------------------- Dwarf crowd control ---

/**
 * Dwarf crowd control (`pulp_wars-w49.33`): the units an own Whirligig's
 * Whirl hits, in (y, x, id) order: every visible unit within 1 that is
 * hostile to the viewer (exactly the reducer's targets: each must be
 * visible to the Whirligig's owner).
 */
function publicWhirlTargetsV7(
  view: PlayerViewV7,
  whirligig: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units
    .filter(
      (unit) =>
        unit.hp > 0 &&
        unit.id !== whirligig.id &&
        chebyshev(unit.at, whirligig.at) <= 1 &&
        publicHostile(view, whirligig.ownerId, unit.ownerId),
    )
    .sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    );
}

/** Dwarf crowd control: the preview of an offered Whirl. */
export interface WhirlPreviewV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  /**
   * Every target in (y, x, id) order with the ordinary attack's damage on
   * it (`damage` is HP damage, `shieldDamage` what its Shield absorbs).
   */
  readonly targets: readonly CombatSplashEntryV7[];
  readonly kills: number;
  /**
   * False only when the public combat preview of a target is not exact (a
   * hidden Witch's Blizzard may change its cover), as for an `ATTACK`.
   */
  readonly exact: boolean;
}

/**
 * Dwarf crowd control: null unless `WHIRL` is offered for `unitId`;
 * otherwise each target's ordinary attack from the public combat preview,
 * so the preview equals the resolution (nothing strikes back).
 */
export function previewWhirlV7(
  view: PlayerViewV7,
  unitId: UnitId,
): WhirlPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "WHIRL" && command.unitId === unitId,
    )
  )
    return null;
  const whirligig = view.units.find((unit) => unit.id === unitId);
  if (whirligig === undefined) return null;
  let exact = true;
  const targets: CombatSplashEntryV7[] = [];
  for (const target of publicWhirlTargetsV7(view, whirligig)) {
    const hit = publicCombatPreview(view, whirligig.id, target.id, {
      ignoreShatter: true,
    });
    if (hit === null) {
      exact = false;
      continue;
    }
    if (hit.hiddenBlizzardPossible) exact = false;
    targets.push({
      unitId: target.id,
      at: { x: target.at.x, y: target.at.y },
      damage: hit.damageToDefender,
      dies: hit.damageToDefender >= target.hp,
      shieldDamage: hit.defenderShieldDamage,
    });
  }
  return {
    unitId,
    at: { x: whirligig.at.x, y: whirligig.at.y },
    targets,
    kills: targets.filter((entry) => entry.dies).length,
    exact,
  };
}

/**
 * Dwarf crowd control: the legal Barricade tiles of an own ready Engineer
 * in (y, x) order (empty below the Coins or at the cap). Every tile around
 * an own unit is explored, and every unit, mound, and Barricade on an
 * explored tile is in the view, so the tiles are the reducer's.
 */
function publicBarricadeTilesV7(
  view: PlayerViewV7,
  engineer: PublicUnitV7,
): readonly CoordV7[] {
  if (
    engineer.ownerId !== view.viewer.id ||
    engineer.form !== "LAND" ||
    barricadeCapReachedV7(view, view.viewer.id) ||
    view.viewer.coins < BARRICADE_COST_V7
  )
    return [];
  return adjacentPublicTiles(view, engineer.at)
    .filter((tile) =>
      barricadeTileFactsLegalV7(
        {
          explored: tile.explored,
          land: tile.explored && tile.biome !== null,
          rift: tile.explored && tile.terrain === "RIFT",
          site: tile.explored && tile.site !== null,
          occupied: tileOccupiedV7(view, tile.at),
          chest: view.treasureChests.some((chest) => same(chest, tile.at)),
          curiosity: view.curiosities.some((entry) => same(entry.at, tile.at)),
          grave: view.graves.some((grave) => same(grave, tile.at)),
        },
        chebyshev(engineer.at, tile.at),
      ),
    )
    .map((tile) => tile.at)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

/** Dwarf crowd control: the preview of an Engineer's Barricade. */
export interface BuildBarricadePreviewV7 {
  readonly unitId: UnitId;
  readonly cost: number;
  readonly hp: number;
  /** The viewer's standing Barricades and the cap. */
  readonly standing: number;
  readonly cap: number;
  /** The offered tiles in (y, x) order. */
  readonly tiles: readonly CoordV7[];
}

/** Dwarf crowd control: null unless `BUILD_BARRICADE` is offered. */
export function previewBuildBarricadeV7(
  view: PlayerViewV7,
  unitId: UnitId,
): BuildBarricadePreviewV7 | null {
  const tiles = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "BUILD_BARRICADE" && command.unitId === unitId
      ? [command.to]
      : [],
  );
  if (tiles.length === 0) return null;
  return {
    unitId,
    cost: BARRICADE_COST_V7,
    hp: BARRICADE_HP_V7,
    standing: standingBarricadesV7(view, view.viewer.id),
    cap: BARRICADE_CAP_V7,
    tiles,
  };
}

/**
 * Dwarf crowd control: why an own Engineer cannot build a Barricade now
 * (for the UI's disabled reason), or null when it can; null for any other
 * unit.
 */
export function queryBarricadeUnavailableReasonV7(
  view: PlayerViewV7,
  unitId: UnitId,
):
  | "ALREADY_ACTED"
  | "EMBARKED"
  | "CAP"
  | "INSUFFICIENT_COINS"
  | "INVALID_TILE"
  | null {
  const engineer = view.units.find((unit) => unit.id === unitId);
  if (
    engineer === undefined ||
    engineer.ownerId !== view.viewer.id ||
    !unitRoleRuleV7(view, engineer).abilities.includes("BARRICADE")
  )
    return null;
  if (
    engineer.activation.overrunActive ||
    primaryUsedForQuery(engineer) ||
    primaryActionBlockedAfterMoveV7(view, engineer)
  )
    return "ALREADY_ACTED";
  if (engineer.form !== "LAND") return "EMBARKED";
  if (barricadeCapReachedV7(view, view.viewer.id)) return "CAP";
  if (view.viewer.coins < BARRICADE_COST_V7) return "INSUFFICIENT_COINS";
  return publicBarricadeTilesV7(view, engineer).length === 0
    ? "INVALID_TILE"
    : null;
}

/** Dwarf crowd control: the preview of an attack on a Barricade. */
export interface AttackBarricadePreviewV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly ownerId: PlayerId;
  readonly damage: number;
  readonly hpAfter: number;
  readonly destroys: boolean;
}

/**
 * Dwarf crowd control: null unless that `ATTACK_BARRICADE` is offered; the
 * exact damage (the attacker's public HP and role Attack, the Barricade's
 * public HP).
 */
export function previewAttackBarricadeV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "ATTACK_BARRICADE" }>,
): AttackBarricadePreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (candidate) =>
        candidate.kind === "ATTACK_BARRICADE" &&
        candidate.unitId === command.unitId &&
        same(candidate.at, command.at),
    )
  )
    return null;
  const attacker = view.units.find((unit) => unit.id === command.unitId);
  const barricade = barricadeAtV7(view, command.at);
  if (attacker === undefined || barricade === undefined) return null;
  const damage = barricadeDamageV7({
    attack2: unitRoleRuleV7(view, attacker).attack2,
    attackerHp: attacker.hp,
    attackerMaxHp: attacker.maxHp,
    unflinching:
      attacker.form === "LAND" &&
      unitRoleMechanicsV7(view, attacker).unflinchingAttack,
    barricadeHp: barricade.hp,
  });
  return {
    unitId: attacker.id,
    at: { x: barricade.at.x, y: barricade.at.y },
    ownerId: barricade.ownerId,
    damage,
    hpAfter: barricade.hp - damage,
    destroys: damage >= barricade.hp,
  };
}

// ------------------------------------------------- The Candy revision ---

/**
 * One Re-bake a Confectioner may make now (section 6.4, as the Candy
 * redesign, docs/product/RULESET_7_CANDY_REDESIGN.md section 8.1, changed
 * it): the Crumbs it scoops on `from` and the tile `at` next to it where
 * the copy appears.
 */
export interface RebakeOptionV7 {
  readonly from: CoordV7;
  readonly at: CoordV7;
  readonly role: UnitRoleIdV7;
  readonly cost: number;
  readonly hp: number;
}

/**
 * The Candy redesign (section 8.1, absorbing the "why not" query of
 * `pulp_wars-jdb.9`): the first reason the viewer's Confectioner cannot
 * Re-bake now, in the order of the legality table: Crashed, its action
 * spent (or a sluggish Move), embarked, no home city, no own Crumbs within
 * 2, no free tile next to it for any of them, the home city one over its
 * capacity already, or the Coins. `NOT_YOUR_TURN` when no command is
 * offered at all (another seat's turn, a pending reward, the match over).
 */
export type RebakeBlockerV7 =
  | "NOT_YOUR_TURN"
  | "CRASHED"
  | "ACTED"
  | "EMBARKED"
  | "NO_HOME"
  | "NO_CRUMBS"
  | "TILE"
  | "CITY_CAPACITY_FULL"
  | "INSUFFICIENT_COINS";

/**
 * The Candy revision (docs/product/RULESET_7_CANDY.md section 6.4, rows 6 to
 * 10), as the Candy redesign (section 8.1) changed them: the public facts
 * of a Re-bake by the viewer's ready Confectioner: its home city with its
 * slots, every legal (Crumbs, placement) pair in (from, at) (y, x) order,
 * and the first row that failed when there is none. Null without a home
 * city the viewer owns. Own Crumbs lie on explored tiles, every tile around
 * an own unit is explored, and units, mounds, Barricades, chests, and
 * curiosities on explored tiles are in the view, so the facts equal the
 * reducer's.
 */
function publicRebakeFactsV7(
  view: PlayerViewV7,
  confectioner: PublicUnitV7,
): {
  readonly cityId: CityId;
  readonly usedSlots: number;
  readonly capacity: number;
  readonly options: readonly RebakeOptionV7[];
  readonly blocker: RebakeBlockerV7 | null;
} | null {
  const player = view.viewer;
  if (confectioner.ownerId !== player.id) return null;
  const home = view.cities.find(
    (city) => city.id === confectioner.homeCityId && city.ownerId === player.id,
  );
  if (home === undefined) return null;
  const capacity = cityUnitCapacityForV7(
    home.level,
    player.researchedTechs,
    player.faction,
    cityBarracksV7(home),
  );
  const usedSlots =
    allOwnedUnitsV7(view, player.id)
      .filter((unit) => unit.homeCityId === home.id)
      .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0) +
    publicSwallowedSlotsV7(view, home.id);
  const sources = rebakeSourcesV7(view.crumbs, player.id, confectioner.at);
  const options: RebakeOptionV7[] = [];
  let anyTile = false;
  let anyRoom = false;
  for (const crumbs of sources) {
    const cost = rebakePriceV7(crumbs.role);
    if (cost === null) continue;
    // The unit is not built yet: a role-level read of the viewer's seat.
    const mechanics = seatRoleMechanicsV7(view, player.id, crumbs.role);
    for (const at of rebakePlacementCandidatesV7(view.board, confectioner.at)) {
      const tile = tileAtView(view, at);
      if (
        tile?.explored !== true ||
        tileOccupiedV7(view, at) ||
        view.treasureChests.some((chest) => same(chest, at)) ||
        view.curiosities.some((curiosity) => same(curiosity.at, at)) ||
        !canEnterTerrainV7({
          terrain: tile.terrain,
          movementMode: mechanics.movementMode,
          afloat: false,
          engineering: player.researchedTechs.includes("ENGINEERING"),
          navigation: player.researchedTechs.includes("NAVIGATION"),
          mountainBorn: mechanics.mountainBorn,
          ice: false,
        }) ||
        (tile.territoryOwnerId !== null &&
          tile.territoryOwnerId !== player.id &&
          publicAllied(view, player.id, tile.territoryOwnerId))
      )
        continue;
      anyTile = true;
      if (
        usedSlots + mechanics.capacitySlots >
        capacity + REBAKE_OVER_CAPACITY_V7
      )
        continue;
      anyRoom = true;
      if (player.coins < cost) continue;
      options.push({
        from: { x: crumbs.at.x, y: crumbs.at.y },
        at,
        role: crumbs.role,
        cost,
        hp: rebakeHpV7(crumbs.role),
      });
    }
  }
  return {
    cityId: home.id,
    usedSlots,
    capacity,
    options,
    blocker:
      options.length > 0
        ? null
        : sources.length === 0
          ? "NO_CRUMBS"
          : !anyTile
            ? "TILE"
            : !anyRoom
              ? "CITY_CAPACITY_FULL"
              : "INSUFFICIENT_COINS",
  };
}

/** The Candy revision (section 13): the preview of a Confectioner's Re-bake. */
export interface RebakePreviewV7 {
  readonly unitId: UnitId;
  readonly cityId: CityId;
  readonly usedSlots: number;
  readonly capacity: number;
  /**
   * The Candy redesign (section 8.1): the most units the home city may hold
   * through a Re-bake (`capacity + REBAKE_OVER_CAPACITY_V7`).
   */
  readonly rebakeCapacity: number;
  /**
   * The offered (Crumbs, placement) pairs in (from, at) (y, x) order, each
   * with its price and HP.
   */
  readonly options: readonly RebakeOptionV7[];
}

/** The Candy revision (section 13): null unless a `REBAKE` is offered. */
export function previewRebakeV7(
  view: PlayerViewV7,
  unitId: UnitId,
): RebakePreviewV7 | null {
  const offered = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "REBAKE" && command.unitId === unitId ? [command] : [],
  );
  const confectioner = view.units.find((unit) => unit.id === unitId);
  if (offered.length === 0 || confectioner === undefined) return null;
  const facts = publicRebakeFactsV7(view, confectioner);
  if (facts === null) return null;
  return {
    unitId,
    cityId: facts.cityId,
    usedSlots: facts.usedSlots,
    capacity: facts.capacity,
    rebakeCapacity: facts.capacity + REBAKE_OVER_CAPACITY_V7,
    options: facts.options.filter((option) =>
      offered.some(
        (command) =>
          same(command.from, option.from) && same(command.at, option.at),
      ),
    ),
  };
}

/**
 * The Candy redesign (section 8.1; the "why not" query of
 * `pulp_wars-jdb.9`): why the viewer's own Confectioner `unitId` has no
 * offered `REBAKE`, or null when it has one or is not an own unit whose
 * role has `REBAKE`.
 */
export function queryRebakeBlockerV7(
  view: PlayerViewV7,
  unitId: UnitId,
): RebakeBlockerV7 | null {
  const unit = view.units.find(
    (candidate) =>
      candidate.id === unitId && candidate.ownerId === view.viewer.id,
  );
  if (
    unit === undefined ||
    !unitRoleRuleV7(view, unit).abilities.includes("REBAKE")
  )
    return null;
  if (
    queryPlayerCommandsV7(view).some(
      (command) => command.kind === "REBAKE" && command.unitId === unitId,
    )
  )
    return null;
  if (!publicCommandOfferingAllowedV7(view)) return "NOT_YOUR_TURN";
  switch (candyActionRejectionV7(view, unit, "REBAKE")) {
    case "ROLE":
      return null;
    case "CRASHED":
      return "CRASHED";
    case "ACTED":
      return "ACTED";
    case "EMBARKED":
      return "EMBARKED";
    case null:
      break;
  }
  return publicRebakeFactsV7(view, unit)?.blocker ?? "NO_HOME";
}

/**
 * The Candy redesign (section 8.2, rows 6 to 8): the legal Top-Up targets of
 * the viewer's ready Confectioner, in unit-ID order (own units are always
 * visible, and their statuses are public, so the list equals the
 * reducer's).
 */
function publicTopUpTargetsV7(
  view: PlayerViewV7,
  confectioner: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units
    .filter(
      (target) =>
        topUpTargetRejectionV7(
          view,
          confectioner,
          target,
          unitIsAfflictedForTopUpV7(view, target.id),
        ) === null,
    )
    .sort((left, right) => left.id - right.id);
}

/** The Candy redesign (section 8.2): the preview of a Confectioner's Top-Up. */
export interface TopUpPreviewV7 {
  readonly unitId: UnitId;
  /** The offered targets in unit-ID order, each with what it gets. */
  readonly targets: readonly {
    readonly unitId: UnitId;
    readonly crashEnded: boolean;
    readonly amount: number;
    readonly hpAfter: number;
    readonly cured: boolean;
  }[];
}

/** The Candy redesign (section 8.2): null unless a `TOP_UP` is offered. */
export function previewTopUpV7(
  view: PlayerViewV7,
  unitId: UnitId,
): TopUpPreviewV7 | null {
  const offered = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "TOP_UP" && command.unitId === unitId
      ? [command.targetUnitId]
      : [],
  );
  if (offered.length === 0) return null;
  return {
    unitId,
    targets: offered.flatMap((targetUnitId) => {
      const target = view.units.find((unit) => unit.id === targetUnitId);
      if (target === undefined) return [];
      const amount = topUpAmountV7(target);
      return [
        {
          unitId: target.id,
          crashEnded: unitIsCrashedV7(view, target.id),
          amount,
          hpAfter: target.hp + amount,
          cured:
            unitIsAfflictedForTopUpV7(view, target.id) ||
            unitIsStuckV7(view, target.id) ||
            unitHasToothacheV7(view, target.id),
        },
      ];
    }),
  };
}

/**
 * The Candy revision (section 9, rows 6 to 10): the legal Sugar Toss targets
 * of the viewer's ready Gunner, in unit-ID order (own units are always
 * visible, so the list equals the reducer's).
 */
function publicSugarTossTargetsV7(
  view: PlayerViewV7,
  gunner: PublicUnitV7,
): readonly PublicUnitV7[] {
  return view.units
    .filter(
      (target) =>
        sugarTossTargetRejectionV7(gunner, target, view.tossedThisTurn) ===
        null,
    )
    .sort((left, right) => left.id - right.id);
}

/** The Candy revision (section 13): the preview of a Gunner's Sugar Toss. */
export interface SugarTossPreviewV7 {
  readonly unitId: UnitId;
  /** The offered targets in unit-ID order, each with its heal. */
  readonly targets: readonly {
    readonly unitId: UnitId;
    readonly amount: number;
    readonly hpAfter: number;
  }[];
}

/** The Candy revision (section 13): null unless a `SUGAR_TOSS` is offered. */
export function previewSugarTossV7(
  view: PlayerViewV7,
  unitId: UnitId,
): SugarTossPreviewV7 | null {
  const offered = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "SUGAR_TOSS" && command.unitId === unitId
      ? [command.targetUnitId]
      : [],
  );
  if (offered.length === 0) return null;
  return {
    unitId,
    targets: offered.flatMap((targetUnitId) => {
      const target = view.units.find((unit) => unit.id === targetUnitId);
      if (target === undefined) return [];
      const amount = sugarTossAmountV7(target);
      return [{ unitId: target.id, amount, hpAfter: target.hp + amount }];
    }),
  };
}

/** The Candy revision (section 13): the preview of a Sugar Rush. */
export interface SugarRushPreviewV7 {
  readonly unitId: UnitId;
  /** The Rushed Move (the role's Move plus 1). */
  readonly move: number;
  /** The destinations of the unit's Move if it Rushes, in (y, x) order. */
  readonly destinations: readonly CoordV7[];
  /** Those it cannot reach without the Rush. */
  readonly newDestinations: readonly CoordV7[];
  /**
   * Home Sweet Home would spare the unit where it stands now (the viewer
   * has the capability and the unit is on or next to an own city center).
   */
  readonly homeSweetHome: boolean;
}

/**
 * The Candy revision (section 13): null unless `SUGAR_RUSH` is offered for
 * the unit; the movement query with the Rushed budget.
 */
export function previewSugarRushV7(
  view: PlayerViewV7,
  unitId: UnitId,
): SugarRushPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "SUGAR_RUSH" && command.unitId === unitId,
    )
  )
    return null;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return null;
  const plain = reachablePlayerMovementPathsV7(view, unit).map(
    (path) => path.destination,
  );
  const destinations = reachablePlayerMovementPathsV7(
    viewWithRushV7(view, unitId),
    unit,
  ).map((path) => path.destination);
  return {
    unitId,
    move: unitRoleRuleV7(view, unit).move + SUGAR_RUSH_MOVE_BONUS_V7,
    destinations,
    newDestinations: destinations.filter(
      (at) => !plain.some((known) => same(known, at)),
    ),
    homeSweetHome: publicHomeSweetHomeSparesV7(view, unit),
  };
}

/** `view` with `unitId` Rushed (for the Rushed movement query). */
function viewWithRushV7(view: PlayerViewV7, unitId: UnitId): PlayerViewV7 {
  return sugarRushPhaseV7(view, unitId) === "RUSHED"
    ? view
    : { ...view, sugarRush: withSugarRushV7(view.sugarRush, unitId, "RUSHED") };
}

/**
 * The Candy revision (section 5.3) from a public view: whether Home Sweet
 * Home would spare the visible unit where it stands: its owner's capability
 * is public in its `candy` stats block, and so are the city centers the
 * viewer has explored.
 */
function publicHomeSweetHomeSparesV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  return (
    view.unitStats.find((stats) => stats.unitId === unit.id)?.candy
      ?.homeSweetHome === true && standsByOwnCenterV7(view.cities, unit)
  );
}

/** The Candy revision (section 13): the preview of eating Crumbs. */
export interface CrumbsEatPreviewV7 {
  readonly at: CoordV7;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  /** HP the Peppermint Surprise takes (0 without it). */
  readonly damage: number;
  readonly shieldDamage: number;
  readonly dies: boolean;
}

/**
 * The Candy revision (section 13): null unless a `MOVE` or a `DISEMBARK` of
 * the viewer's unit to `to` is offered and would eat Crumbs there; else the
 * exact Peppermint Surprise (the Crumbs' public `bite`).
 */
export function previewCrumbsEatV7(
  view: PlayerViewV7,
  unitId: UnitId,
  to: CoordV7,
): CrumbsEatPreviewV7 | null {
  const crumbs = crumbsAtV7(view, to);
  const unit = view.units.find(
    (candidate) =>
      candidate.id === unitId && candidate.ownerId === view.viewer.id,
  );
  if (crumbs === undefined || unit === undefined) return null;
  const tile = tileAtView(view, to);
  // A Move that ends by embarking leaves the unit afloat; Crumbs lie on
  // land, so the unit is in land form after an offered Move or landing.
  if (tile?.explored !== true || tile.biome === null) return null;
  if (
    !unitEatsCrumbsV7(
      view,
      { ...unit, form: "LAND" },
      crumbs.ownerId,
      (left, right) => publicHostile(view, left, right),
    ) ||
    !queryPlayerCommandsV7(view).some(
      (command) =>
        (command.kind === "MOVE" &&
          command.unitId === unitId &&
          same(command.path.at(-1) ?? { x: -1, y: -1 }, to)) ||
        (command.kind === "DISEMBARK" &&
          command.unitId === unitId &&
          same(command.at, to)),
    )
  )
    return null;
  const hit = peppermintHitV7(
    view,
    { ...unit, form: "LAND" },
    shieldOfV7(view.shields, unit.id),
    crumbs.bite,
  );
  return {
    at: crumbs.at,
    ownerId: crumbs.ownerId,
    role: crumbs.role,
    damage: hit.damage,
    shieldDamage: hit.shieldDamage,
    dies: hit.dies,
  };
}

/**
 * Revision 19 Hatch targets of an own Shaman, from the public view: the own
 * Eggs on the eight tiles around it that were not laid this turn, in unit-ID
 * order. Own units and their countdowns are always visible.
 */
function publicHatchTargetsV7(
  view: PlayerViewV7,
  shaman: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  return view.units
    .filter(
      (egg) =>
        egg.hp > 0 &&
        egg.ownerId === shaman.ownerId &&
        egg.form === "EGG" &&
        chebyshev(egg.at, shaman.at) === 1 &&
        view.eggs.some(
          (entry) => entry.unitId === egg.id && !entry.laidThisTurn,
        ),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * The Martian revision section 8.1 row 6 (`pulp_wars-1wy.3`): the passengers
 * an own carrier may beam, in unit-ID order: the reducer's own test
 * (`beamDownPassengerLegalV7`): other own living land-form one-slot
 * non-flying units, not beamed this turn, standing on or next to the center
 * of an own city or within `BEAM_DOWN_PICKUP_RANGE_V7` of the carrier. Own
 * units, own cities, and the own entries of `beamedThisTurn` are always
 * visible to their owner.
 */
function publicBeamDownPassengersV7(
  view: PlayerViewV7,
  saucer: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  const centers = view.cities
    .filter((city) => city.ownerId === saucer.ownerId)
    .map((city) => city.at);
  return view.units
    .filter((unit) =>
      beamDownPassengerLegalV7(
        view,
        saucer,
        unit,
        centers,
        view.beamedThisTurn,
      ),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * The placement facts of a public tile for a Beam Down or a pull, or
 * undefined off the board. `alliedTo` is the player whose alliance with the
 * tile's territory owner blocks the placement; `exceptUnitId` is the moved
 * unit. An unexplored tile reports `explored: false`, which fails every
 * placement.
 */
function publicPlacementFactsV7(
  view: PlayerViewV7,
  at: CoordV7,
  alliedTo: PlayerId,
  exceptUnitId?: UnitId,
): PlacementTileFactsV7 | undefined {
  const tile = tileAtView(view, at);
  if (tile === undefined) return undefined;
  if (!tile.explored)
    return {
      explored: false,
      site: null,
      terrain: "GRASS",
      ice: false,
      occupied: false,
      chest: false,
      alliedTerritory: false,
    };
  return {
    explored: true,
    site: tile.site,
    terrain: tile.terrain,
    ice: isIceAtV7(view, at),
    // The Dwarf revision section 5.3: the occupancy predicate.
    occupied: tileOccupiedV7(view, at, exceptUnitId),
    chest: view.treasureChests.some((chest) => same(chest, at)),
    alliedTerritory:
      tile.territoryOwnerId !== null &&
      publicAllied(view, alliedTo, tile.territoryOwnerId),
  };
}

/**
 * Section 8.1 row 7: the legal Beam Down tiles of `passenger` around the
 * carrier, in (y, x) order, by the reducer's own test
 * (`beamDownDestinationLegalV7`): land, with no unit and no treasure chest,
 * not a settlement site, not in territory allied to the actor, and
 * enterable by the passenger. Every tile around an own carrier is explored.
 */
function publicBeamDownDestinationsV7(
  view: PlayerViewV7,
  saucer: PlayerViewV7["units"][number],
  passenger: PlayerViewV7["units"][number],
): readonly CoordV7[] {
  const player = view.viewer;
  const technology = {
    engineering: player.researchedTechs.includes("ENGINEERING"),
    navigation: player.researchedTechs.includes("NAVIGATION"),
  };
  return adjacentPublicTiles(view, saucer.at)
    .filter((tile) =>
      beamDownDestinationLegalV7(
        view,
        saucer,
        passenger,
        technology,
        tile.at,
        publicPlacementFactsV7(view, tile.at, player.id),
      ),
    )
    .map((tile) => tile.at)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

/**
 * The Mind Control revision (section 3): the legal Mind Control targets of
 * an own Brain that is ready (land form, no primary action used): none
 * while it has a cooldown entry or controls `MIND_CONTROL_LIMIT_V7` units
 * (its controlled units are its owner's, so the view lists them all);
 * otherwise every visible hostile unit that `mindControlTargetBlockV7` (the
 * reducer's own per-target check) accepts: land-form, one-slot under its
 * kind, non-`JUGGERNAUT`, not a construct, not already controlled, within
 * range, wounded with at most `MIND_CONTROL_HP_V7` HP, and not on a
 * settlement site or a Rift.
 */
function publicMindControlTargetsV7(
  view: PlayerViewV7,
  brain: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  if (
    view.mindControlCooldowns.some((entry) => entry.unitId === brain.id) ||
    controlledByBrainV7(view.mindControlled, brain.id).length >=
      MIND_CONTROL_LIMIT_V7
  )
    return [];
  return view.units
    .filter((target) => {
      const tile = tileAtView(view, target.at);
      return (
        target.hp > 0 &&
        publicHostile(view, brain.ownerId, target.ownerId) &&
        tile?.explored === true &&
        // The per-target conditions the reducer enforces, shared with it.
        mindControlTargetBlockV7(view, brain, target, tile) === null
      );
    })
    .sort((left, right) => left.id - right.id);
}

/**
 * Section 8.4 (`pulp_wars-1wy.3`): the tiles an own puller's Tractor Beam
 * would pull `target` across (the last is where it ends), or null when the
 * pull is illegal. It is the reducer's own rule on the view: the target is
 * visible, own or hostile, within the rule's reach, not an Egg, a
 * `JUGGERNAUT`-role unit, or a two-slot unit (`tractorBeamTargetBlockV7`),
 * and each step passes the Push conditions, is explored by the actor, and
 * holds no treasure chest (`tractorBeamStepLegalV7`, `tractorBeamPathV7`).
 * Every unit on an explored tile is visible, so the path is exact.
 */
function publicTractorBeamPathV7(
  view: PlayerViewV7,
  mothership: PlayerViewV7["units"][number],
  target: PlayerViewV7["units"][number],
  rule: TractorBeamRuleV7,
): readonly CoordV7[] | null {
  if (
    target.hp <= 0 ||
    publicAllied(view, mothership.ownerId, target.ownerId) ||
    tractorBeamTargetBlockV7(
      view,
      rule,
      mothership,
      target,
      unitHeldByCityWallsV7(view.cities, target),
    ) !== null
  )
    return null;
  // The technology the pull assumes for the target is read once, from the
  // tile it stands on before the pull.
  const technology = tractorBeamTargetTechnologyV7(
    target.ownerId === view.viewer.id,
    view.viewer.researchedTechs,
    (() => {
      const from = tileAtView(view, target.at);
      return from?.explored === true ? from.terrain : undefined;
    })(),
  );
  const path = tractorBeamPathV7(rule, mothership.at, target.at, (step) =>
    tractorBeamStepLegalV7(
      view,
      target,
      technology,
      publicPlacementFactsV7(view, step, target.ownerId, target.id),
    ),
  );
  return path.length === 0 ? null : path;
}

/**
 * The tiles a Tractor Beam by own unit `unitId` on `targetUnitId` would
 * cross (the last is where the target ends), from the view alone, or null
 * when the unit has no Tractor Beam or the target is illegal. It does not
 * test whether the puller may still act this turn: for a `TRACTOR_BEAM`
 * that `queryPlayerCommandsV7` offers it is the path of
 * `previewTractorBeamV7` without the full command query.
 */
export function queryTractorBeamPathV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): readonly CoordV7[] | null {
  const puller = view.units.find((unit) => unit.id === unitId);
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (
    puller === undefined ||
    target === undefined ||
    puller.ownerId !== view.viewer.id ||
    puller.id === target.id
  )
    return null;
  const rule = tractorBeamRuleV7(view, puller);
  return rule === null
    ? null
    : publicTractorBeamPathV7(view, puller, target, rule);
}

/** The legal Tractor Beam targets of an own puller, in unit-ID order. */
function publicTractorBeamTargetsV7(
  view: PlayerViewV7,
  mothership: PlayerViewV7["units"][number],
  rule: TractorBeamRuleV7,
): readonly PlayerViewV7["units"][number][] {
  return view.units
    .filter(
      (target) =>
        target.id !== mothership.id &&
        publicTractorBeamPathV7(view, mothership, target, rule) !== null,
    )
    .sort((left, right) => left.id - right.id);
}

/** The Martian revision section 11: the preview of an offered Beam Down. */
export interface BeamDownPreviewV7 {
  readonly unitId: UnitId;
  readonly passengerUnitId: UnitId;
  /** The passenger's tile now. */
  readonly from: CoordV7;
  /** The legal destination tiles in (y, x) order. */
  readonly destinations: readonly CoordV7[];
  /** The destinations whose Field Defense the landing would destroy. */
  readonly fieldDefenseDestroyed: readonly CoordV7[];
}

/**
 * Null unless a `BEAM_DOWN` with that Saucer and passenger is offered;
 * otherwise exact (every tile around an own Saucer is explored).
 */
export function previewBeamDownV7(
  view: PlayerViewV7,
  unitId: UnitId,
  passengerUnitId: UnitId,
): BeamDownPreviewV7 | null {
  const destinations = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "BEAM_DOWN" &&
    command.unitId === unitId &&
    command.passengerUnitId === passengerUnitId
      ? [command.to]
      : [],
  );
  const passenger = view.units.find((unit) => unit.id === passengerUnitId);
  if (destinations.length === 0 || passenger === undefined) return null;
  return {
    unitId,
    passengerUnitId,
    from: passenger.at,
    destinations,
    fieldDefenseDestroyed: destinations.filter((at) => {
      const tile = tileAtView(view, at);
      return (
        tile?.explored === true &&
        tile.fieldDefense &&
        tile.territoryOwnerId !== null &&
        publicHostile(view, view.viewer.id, tile.territoryOwnerId)
      );
    }),
  };
}

/**
 * The Mind Control revision (sections 3 and 6): the preview of an offered
 * Mind Control. The target keeps its ID, kind, role, HP, and tile; it goes
 * back to `originalOwnerId` if the Brain is lost.
 */
export interface MindControlPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  /** The target's tile, where it stays. */
  readonly at: CoordV7;
  /** The target's owner now: its owner again when it is released. */
  readonly originalOwnerId: PlayerId;
  readonly role: UnitRoleIdV7;
  /** The target's kind (`unitFactionV7`), which it keeps. */
  readonly faction: FactionIdV7;
  readonly hp: number;
  readonly maxHp: number;
  /** The units the Brain controls afterwards, and the limit. */
  readonly controlledAfter: number;
  readonly controlLimit: number;
  /** The cooldown the Mind Control starts. */
  readonly cooldownTurns: number;
  /**
   * Visible units released because the target is their Brain (duplicate
   * Martian seats only).
   */
  readonly releasedUnitIds: readonly UnitId[];
}

/** Null unless that `MIND_CONTROL` is offered; otherwise exact. */
export function previewMindControlV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): MindControlPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "MIND_CONTROL" &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return null;
  // Map curiosities (section 8.6): the neutral Monster is never a target.
  const faction = unitFactionV7(view, target);
  if (faction === NEUTRAL_KIND_V7) return null;
  return {
    unitId,
    targetUnitId,
    at: target.at,
    originalOwnerId: target.ownerId,
    role: target.role,
    faction,
    hp: target.hp,
    maxHp: target.maxHp,
    controlledAfter:
      controlledByBrainV7(view.mindControlled, unitId).length + 1,
    controlLimit: MIND_CONTROL_LIMIT_V7,
    cooldownTurns: MIND_CONTROL_COOLDOWN_TURNS_V7,
    releasedUnitIds: controlledByBrainV7(view.mindControlled, targetUnitId),
  };
}

/** The Martian revision section 11: the preview of an offered Tractor Beam. */
export interface TractorBeamPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  readonly from: CoordV7;
  /** The tile the target ends on (the last tile of `path`). */
  readonly to: CoordV7;
  /**
   * The tiles the target crosses, in order: one, or two for a Heavy Tractor
   * Beam (`pulp_wars-1wy.3`). Equals `UNIT_PULLED.path`.
   */
  readonly path: readonly CoordV7[];
  /** Fortification levels the target has on `from` and not on `to`. */
  readonly fortificationLost: number;
  /** The city whose center the pull empties of a unit not besieging it. */
  readonly emptiesCenterOfCityId: CityId | null;
  /** The city whose siege the pull lifts (the target besieges it). */
  readonly liftsSiegeOfCityId: CityId | null;
}

/** Null unless that `TRACTOR_BEAM` is offered; otherwise exact. */
export function previewTractorBeamV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): TractorBeamPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "TRACTOR_BEAM" &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const mothership = view.units.find((unit) => unit.id === unitId);
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (mothership === undefined || target === undefined) return null;
  const rule = tractorBeamRuleV7(view, mothership);
  if (rule === null) return null;
  const path = publicTractorBeamPathV7(view, mothership, target, rule);
  const to = path?.at(-1);
  if (path === null || to === undefined) return null;
  const fortification = (at: CoordV7): number => {
    const tile = tileAtView(view, at);
    return unitTakesCoverV7(view, target) &&
      tile?.explored === true &&
      tile.territoryOwnerId === target.ownerId
      ? (tile.fortificationLevel ?? 0)
      : 0;
  };
  const city = view.cities.find((candidate) => same(candidate.at, target.at));
  const besieges =
    city !== undefined && publicHostile(view, target.ownerId, city.ownerId);
  return {
    unitId,
    targetUnitId,
    from: target.at,
    to,
    path,
    fortificationLost: Math.max(
      0,
      fortification(target.at) - fortification(to),
    ),
    emptiesCenterOfCityId: city !== undefined && !besieges ? city.id : null,
    liftsSiegeOfCityId: city !== undefined && besieges ? city.id : null,
  };
}

function publicTendTargetsV7(
  view: PlayerViewV7,
  captain: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  const plagued = new Set(view.plagued.map((entry) => entry.unitId));
  const bitten = new Set(view.bitten.map((entry) => entry.unitId));
  return view.units
    .filter(
      (target) =>
        target.ownerId === captain.ownerId &&
        target.form === "LAND" &&
        target.id !== captain.id &&
        (target.hp < target.maxHp ||
          plagued.has(target.id) ||
          bitten.has(target.id) ||
          // Ice Folk Freeze (`pulp_wars-w49.37`): Tend Wounded thaws.
          isFrozenV7(view.frozen, target.id)) &&
        !target.activation.tendedThisTurn &&
        chebyshev(captain.at, target.at) === 1,
    )
    .sort((left, right) => left.id - right.id);
}

/** Revision 14 Tend Wounded preview: heals and cures, in unit-ID order. */
export interface TendWoundedPreviewV7 {
  readonly results: readonly {
    readonly unitId: UnitId;
    readonly amount: number;
    readonly hpAfter: number;
    readonly curedPlague: boolean;
    readonly curedBitten: boolean;
    /** Ice Folk Freeze (`pulp_wars-w49.37`): the target was Frozen and thaws. */
    readonly curedFrozen: boolean;
  }[];
  /**
   * Dwarf crowd control (`pulp_wars-w49.33`): an Engineer's Repair of the
   * damaged own Barricades next to it, in (y, x) order (empty otherwise).
   */
  readonly barricades: readonly {
    readonly at: CoordV7;
    readonly amount: number;
    readonly hpAfter: number;
  }[];
}

/**
 * Exact Tend Wounded preview: null unless the command is offered. Every
 * target is an own unit, so the preview equals the resolution.
 */
export function previewTendWoundedV7(
  view: PlayerViewV7,
  unitId: UnitId,
): TendWoundedPreviewV7 | null;
export function previewTendWoundedV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): TendWoundedPreviewV7 | null;
export function previewTendWoundedV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): TendWoundedPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "TEND_WOUNDED" && command.unitId === unitId,
    )
  )
    return null;
  const captain = view.units.find((unit) => unit.id === unitId);
  if (captain === undefined) return null;
  const plagued = new Set(view.plagued.map((entry) => entry.unitId));
  const bitten = new Set(view.bitten.map((entry) => entry.unitId));
  // The Dwarf revision section 9.1: an Engineer's Repair heals a machine
  // by its `repairMachineHeal` (4), as the reducer does; every other unit 2.
  const machineHeal = unitRoleMechanicsV7(view, captain).repairMachineHeal;
  // The Dinosaur pass, correction: a Shaman heals a hatched dinosaur 4.
  const growingHeal = unitRoleMechanicsV7(view, captain).tendGrowingHeal;
  return {
    results: publicTendTargetsV7(view, captain).map((target) => {
      const amount = Math.min(
        machineHeal !== null &&
          unitRoleMechanicsV7(view, target).repairsAsMachine
          ? machineHeal
          : growingHeal !== null && unitGrowsV7(view, target)
            ? growingHeal
            : 2,
        target.maxHp - target.hp,
      );
      return {
        unitId: target.id,
        amount,
        hpAfter: target.hp + amount,
        curedPlague: plagued.has(target.id),
        curedBitten: bitten.has(target.id),
        curedFrozen: isFrozenV7(view.frozen, target.id),
      };
    }),
    barricades: barricadeRepairsV7(view, barricadesOfV7(view), captain),
  };
}

/**
 * The Ice Folk revision section 21.9 (and Ice Folk Freeze, section 21.6):
 * the legal targets of an own Sled's Bolas or Ice Witch's Frost Bolt (land
 * form, primary action ready): every visible hostile unit that can be
 * Frozen within the reach (Chebyshev 1 to 2), in unit-ID order.
 */
function publicSingleFreezeTargetsV7(
  view: PlayerViewV7,
  source: PlayerViewV7["units"][number],
  inRange: (from: CoordV7, to: CoordV7) => boolean,
): readonly PlayerViewV7["units"][number][] {
  return view.units
    .filter(
      (target) =>
        target.id !== source.id &&
        canBeFrozenV7(view, source.ownerId, target) &&
        inRange(source.at, target.at),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * The preview of an offered Bolas or Frost Bolt (Ice Folk Freeze,
 * `pulp_wars-w49.37`).
 */
export interface BolasPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  /** The target is already Frozen (the freeze is renewed). */
  readonly alreadyFrozen: boolean;
  /** The target's `turnsLeft` after the freeze. */
  readonly turnsLeft: number;
  /**
   * The viewer's own units whose currently offered attack on the target
   * would shatter it once it is Frozen, in unit-ID order.
   */
  readonly shatterSetups: readonly UnitId[];
}
/** The preview of an offered Frost Bolt (the Bolas preview's shape). */
export type FrostBoltPreviewV7 = BolasPreviewV7;

/** Null unless that `THROW_BOLAS` is offered; otherwise exact. */
export function previewBolasV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): BolasPreviewV7 | null {
  return previewSingleFreezeV7(view, "THROW_BOLAS", unitId, targetUnitId);
}

/** Null unless that `FROST_BOLT` is offered; otherwise exact. */
export function previewFrostBoltV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): FrostBoltPreviewV7 | null {
  return previewSingleFreezeV7(view, "FROST_BOLT", unitId, targetUnitId);
}

function previewSingleFreezeV7(
  view: PlayerViewV7,
  kind: "THROW_BOLAS" | "FROST_BOLT",
  unitId: UnitId,
  targetUnitId: UnitId,
): BolasPreviewV7 | null {
  const commands = queryPlayerCommandsV7(view);
  if (
    !commands.some(
      (command) =>
        command.kind === kind &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return null;
  const shatterSetups = commands
    .flatMap((command) =>
      command.kind === "ATTACK" &&
      command.targetUnitId === targetUnitId &&
      command.unitId !== unitId &&
      queryCombatPreviewV7(view, command.unitId, targetUnitId, {
        assumeTargetFrozen: true,
      })?.shatters === true
        ? [command.unitId]
        : [],
    )
    .sort((left, right) => left - right);
  const prior = view.frozen.find((entry) => entry.unitId === targetUnitId);
  const turns = frozenTurnsForV7(view, target.ownerId);
  return {
    unitId,
    targetUnitId,
    alreadyFrozen: prior !== undefined,
    turnsLeft: prior === undefined ? turns : Math.max(prior.turnsLeft, turns),
    shatterSetups: [...new Set(shatterSetups)],
  };
}

/** The Ice Folk revision section 11: the preview of an offered Cold Snap. */
export interface ColdSnapPreviewV7 {
  readonly unitId: UnitId;
  readonly targets: readonly {
    readonly unitId: UnitId;
    /** Ice Folk Freeze: the target is already Frozen (renewed). */
    readonly alreadyFrozen: boolean;
  }[];
}

/** Null unless that `COLD_SNAP` is offered; otherwise exact (visible targets). */
export function previewColdSnapV7(
  view: PlayerViewV7,
  unitId: UnitId,
): ColdSnapPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "COLD_SNAP" && command.unitId === unitId,
    )
  )
    return null;
  const witch = view.units.find((unit) => unit.id === unitId);
  if (witch === undefined) return null;
  return {
    unitId,
    targets: coldSnapTargetsV7(view, witch, view.units).map((target) => ({
      unitId: target.id,
      alreadyFrozen: isFrozenV7(view.frozen, target.id),
    })),
  };
}

/**
 * Ice Folk Freeze (`pulp_wars-w49.37`, section 21.18): the `at` of every
 * offered Stampede of an own unmoved Mammoth: each tile 1 to 3 tiles away
 * in the eight directions whose path is open as the viewer knows it, in
 * (y, x) order.
 */
function publicStampedeTargetsV7(
  view: PlayerViewV7,
  mammoth: PlayerViewV7["units"][number],
): readonly CoordV7[] {
  const facts = publicStampedeFactsV7(view);
  const targets: CoordV7[] = [];
  for (let dy = -STAMPEDE_RANGE_V7; dy <= STAMPEDE_RANGE_V7; dy += 1)
    for (let dx = -STAMPEDE_RANGE_V7; dx <= STAMPEDE_RANGE_V7; dx += 1) {
      const at = { x: mammoth.at.x + dx, y: mammoth.at.y + dy };
      if (
        stampedeLineV7(mammoth.at, at) !== null &&
        stampedePathLegalV7(
          view,
          facts,
          mammoth,
          view.viewer.researchedTechs,
          at,
        )
      )
        targets.push(at);
    }
  return targets.sort((left, right) => left.y - right.y || left.x - right.x);
}

/** The public path facts of the viewer (explored tiles, visible units). */
function publicStampedeFactsV7(view: PlayerViewV7): StampedeTileFactsV7 {
  return {
    tile: (at) => {
      const tile = tileAtView(view, at);
      return tile === undefined || !tile.explored ? undefined : tile;
    },
    ice: (at) => isIceAtV7(view, at),
    chest: (at) => view.treasureChests.some((chest) => same(chest, at)),
    structure: (at) =>
      moundAtV7(view, at) !== undefined ||
      barricadeAtV7(view, at) !== undefined,
    friendly: (at) =>
      view.units.some(
        (unit) =>
          same(unit.at, at) &&
          !publicHostile(view, view.viewer.id, unit.ownerId),
      ),
  };
}

/**
 * Ice Folk Freeze (section 21.18): the preview of an offered Stampede, as
 * the viewer knows it: the tiles up to `at`, and each visible hostile unit
 * on them with the fixed hit it would take. The shoves and the stop are
 * resolved on the canonical state (a unit that cannot be shoved stops the
 * Mammoth before it), so the preview lists the hits of an unobstructed
 * charge.
 */
export interface StampedePreviewV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly path: readonly CoordV7[];
  readonly hits: readonly CombatSplashEntryV7[];
}

/** Null unless that `STAMPEDE` is offered. */
export function previewStampedeV7(
  view: PlayerViewV7,
  unitId: UnitId,
  at: CoordV7,
): StampedePreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "STAMPEDE" &&
        command.unitId === unitId &&
        same(command.at, at),
    )
  )
    return null;
  const mammoth = view.units.find((unit) => unit.id === unitId);
  const line = mammoth === undefined ? null : stampedeLineV7(mammoth.at, at);
  if (mammoth === undefined || line === null) return null;
  const path = stampedeTilesV7(mammoth.at, line);
  const hits: CombatSplashEntryV7[] = [];
  for (const step of path)
    for (const unit of view.units)
      if (
        same(unit.at, step) &&
        publicHostile(view, view.viewer.id, unit.ownerId)
      )
        hits.push(
          fixedSignatureHitV7(
            view,
            unit,
            shieldOfV7(view.shields, unit.id),
            STAMPEDE_DAMAGE_V7,
          ),
        );
  return { unitId, at: { x: at.x, y: at.y }, path, hits };
}

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 8): the
 * preview of an offered Swallow: the victim and how many of the
 * Abomination's Start Turns digest it (`DIGEST_DAMAGE_V7` each).
 */
export interface SwallowPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  readonly targetOwnerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly hp: number;
  /** The digest that kills it (it rises as a Zombie then). */
  readonly digestedAfterTurns: number;
}

/** Section 6.2: null unless that `SWALLOW` is offered; equals the result. */
export function previewSwallowV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): SwallowPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "SWALLOW" &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return null;
  return {
    unitId,
    targetUnitId,
    targetOwnerId: target.ownerId,
    role: target.role,
    hp: target.hp,
    digestedAfterTurns: Math.ceil(target.hp / DIGEST_DAMAGE_V7),
  };
}

/**
 * The Cultists (docs/product/RULESET_7_CULTISTS.md sections 5.1 and 5.2):
 * the preview of an offered Sacrifice or Seizure: the victim, what it pays,
 * and the Favour the viewer has afterwards. A Seizure is a kill credited to
 * the Summoner and names the robed cultist that holds the victim down.
 */
export interface SacrificePreviewV7 {
  readonly unitId: UnitId;
  readonly victimUnitId: UnitId;
  readonly victimOwnerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  /** The Favour gained: the victim's value. */
  readonly favour: number;
  readonly favourAfter: number;
}
export interface SeizePreviewV7 extends SacrificePreviewV7 {
  /** The own robed cultist next to the victim that holds it down. */
  readonly holderUnitId: UnitId;
}

/** Section 5.1: null unless that `SACRIFICE` is offered; equals the result. */
export function previewSacrificeV7(
  view: PlayerViewV7,
  unitId: UnitId,
  victimUnitId: UnitId,
): SacrificePreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "SACRIFICE" &&
        command.unitId === unitId &&
        command.victimUnitId === victimUnitId,
    )
  )
    return null;
  const victim = view.units.find((unit) => unit.id === victimUnitId);
  if (victim === undefined) return null;
  const favour = sacrificeFavourV7(view, victim);
  return {
    unitId,
    victimUnitId,
    victimOwnerId: victim.ownerId,
    role: victim.role,
    at: { x: victim.at.x, y: victim.at.y },
    favour,
    favourAfter: favourOfV7(view, view.viewer.id) + favour,
  };
}

/** Section 5.2: null unless that `SEIZE` is offered; equals the result. */
export function previewSeizeV7(
  view: PlayerViewV7,
  unitId: UnitId,
  victimUnitId: UnitId,
): SeizePreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "SEIZE" &&
        command.unitId === unitId &&
        command.victimUnitId === victimUnitId,
    )
  )
    return null;
  const summoner = view.units.find((unit) => unit.id === unitId);
  const victim = view.units.find((unit) => unit.id === victimUnitId);
  const holder =
    summoner === undefined || victim === undefined
      ? undefined
      : seizeHolderV7(view, view.units, summoner, victim);
  if (victim === undefined || holder === undefined) return null;
  const favour = seizeFavourV7(view, victim);
  return {
    unitId,
    victimUnitId,
    victimOwnerId: victim.ownerId,
    role: victim.role,
    at: { x: victim.at.x, y: victim.at.y },
    favour,
    favourAfter: favourOfV7(view, view.viewer.id) + favour,
    holderUnitId: holder.id,
  };
}

/**
 * The Cultists (section 5.3): the preview of an offered Offering: the
 * population the city gives up and has afterwards, and the Favour.
 */
export interface OfferingPreviewV7 {
  readonly cityId: CityId;
  /** `OFFERING_POPULATION_V7`. */
  readonly population: number;
  readonly populationAfter: number;
  /** `OFFERING_FAVOUR_V7`. */
  readonly favour: number;
  readonly favourAfter: number;
}

/** Section 5.3: null unless that `OFFERING` is offered; equals the result. */
export function previewOfferingV7(
  view: PlayerViewV7,
  cityId: CityId,
): OfferingPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "OFFERING" && command.cityId === cityId,
    )
  )
    return null;
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return null;
  return {
    cityId,
    population: OFFERING_POPULATION_V7,
    populationAfter: city.population - OFFERING_POPULATION_V7,
    favour: OFFERING_FAVOUR_V7,
    favourAfter: favourOfV7(view, view.viewer.id) + OFFERING_FAVOUR_V7,
  };
}

/**
 * The Cultists (`pulp_wars-mch9.5`, section 6.1): the preview of an offered
 * Summon: what it costs, the Horror that arrives, and the two strands it
 * starts with against its Control.
 */
export interface SummonPreviewV7 {
  readonly unitId: UnitId;
  readonly helperUnitId: UnitId;
  readonly at: CoordV7;
  readonly role: SummonedRoleIdV7;
  /** The Horror's Hit Points (full). */
  readonly hp: number;
  /** The Favour spent. */
  readonly favour: number;
  readonly favourAfter: number;
  readonly control: number;
  /** The strands the summoning leaves on the Horror (the two summoners'). */
  readonly strands: number;
}

/** Section 6.1: null unless that `SUMMON` is offered; equals the result. */
export function previewSummonV7(
  view: PlayerViewV7,
  unitId: UnitId,
  helperUnitId: UnitId,
  at: CoordV7,
): SummonPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "SUMMON" &&
        command.unitId === unitId &&
        command.helperUnitId === helperUnitId &&
        same(command.at, at),
    )
  )
    return null;
  const registration = CULT_SUMMONED_ROLE_RULES_V7.HORROR;
  const favour = registration.favourCost ?? 0;
  return {
    unitId,
    helperUnitId,
    at: { x: at.x, y: at.y },
    role: "HORROR",
    hp: registration.maxHp,
    favour,
    favourAfter: favourOfV7(view, view.viewer.id) - favour,
    control: registration.control ?? 0,
    strands: 2,
  };
}

/**
 * The Cultists (section 6.2): the preview of an offered Channel: the
 * daemon's Control and its holding strands as the board stands, before and
 * after this strand, and whether it would stay bound if its seat's Start
 * Turn check ran on this board. (Strands can still break before the check.)
 */
export interface ChannelPreviewV7 {
  readonly unitId: UnitId;
  readonly daemonUnitId: UnitId;
  readonly role: SummonedRoleIdV7;
  readonly control: number;
  readonly strandsBefore: number;
  readonly strandsAfter: number;
  /** `strandsAfter >= control`. */
  readonly holds: boolean;
}

/** Section 6.2: null unless that `CHANNEL` is offered; equals the result. */
export function previewChannelV7(
  view: PlayerViewV7,
  unitId: UnitId,
  daemonUnitId: UnitId,
): ChannelPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "CHANNEL" &&
        command.unitId === unitId &&
        command.daemonUnitId === daemonUnitId,
    )
  )
    return null;
  const daemon = view.units.find((unit) => unit.id === daemonUnitId);
  if (daemon?.summoned === undefined) return null;
  const control = daemonControlV7(daemon);
  const strandsBefore = holdingStrandsV7(view, view.units, daemon);
  const strandsAfter = holdingStrandsV7(
    {
      ...view,
      cult: {
        ...view.cult,
        strands: [
          ...view.cult.strands.filter(
            (strand) => strand.cultistUnitId !== unitId,
          ),
          { cultistUnitId: unitId, daemonUnitId },
        ],
      },
    },
    view.units,
    daemon,
  );
  return {
    unitId,
    daemonUnitId,
    role: daemon.summoned,
    control,
    strandsBefore,
    strandsAfter,
    holds: strandsAfter >= control,
  };
}

/**
 * The Cultists (section 8.4): the preview of an offered Anchor: the daemon
 * the gripped cultist channels, and its holding strands before and after
 * the grip (the cultist's strand counts three while the grip holds).
 */
export interface AnchorPreviewV7 {
  readonly unitId: UnitId;
  readonly cultistUnitId: UnitId;
  readonly daemonUnitId: UnitId;
  readonly control: number;
  readonly strandsBefore: number;
  readonly strandsAfter: number;
  readonly holds: boolean;
}

/** Section 8.4: null unless that `ANCHOR` is offered; equals the result. */
export function previewAnchorV7(
  view: PlayerViewV7,
  unitId: UnitId,
  cultistUnitId: UnitId,
): AnchorPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "ANCHOR" &&
        command.unitId === unitId &&
        command.cultistUnitId === cultistUnitId,
    )
  )
    return null;
  const daemonUnitId = view.cult.strands.find(
    (strand) => strand.cultistUnitId === cultistUnitId,
  )?.daemonUnitId;
  const daemon = view.units.find((unit) => unit.id === daemonUnitId);
  if (daemon === undefined) return null;
  const control = daemonControlV7(daemon);
  const strandsAfter = holdingStrandsV7(
    {
      ...view,
      cult: {
        ...view.cult,
        grips: [...view.cult.grips, { thingUnitId: unitId, cultistUnitId }],
      },
    },
    view.units,
    daemon,
  );
  return {
    unitId,
    cultistUnitId,
    daemonUnitId: daemon.id,
    control,
    strandsBefore: holdingStrandsV7(view, view.units, daemon),
    strandsAfter,
    holds: strandsAfter >= control,
  };
}

/**
 * The Cultists (section 8.1): the preview of an offered Behold!: the own
 * robed cultists on the eight tiles around the Idol Bearer now, which keep
 * their strands when they lose Hit Points while the idol is raised.
 */
export interface BeholdPreviewV7 {
  readonly unitId: UnitId;
  readonly wardedUnitIds: readonly UnitId[];
}

/** Section 8.1: null unless that `BEHOLD` is offered. */
export function previewBeholdV7(
  view: PlayerViewV7,
  unitId: UnitId,
): BeholdPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "BEHOLD" && command.unitId === unitId,
    )
  )
    return null;
  const bearer = view.units.find((unit) => unit.id === unitId);
  if (bearer === undefined) return null;
  return {
    unitId,
    wardedUnitIds: view.units
      .filter(
        (unit) =>
          unit.id !== bearer.id &&
          unit.ownerId === bearer.ownerId &&
          chebyshev(unit.at, bearer.at) === 1 &&
          isRobedCultistV7(view, unit),
      )
      .map((unit) => unit.id),
  };
}

/**
 * The Cultists (section 8.5): the preview of an offered Boo!: every unit it
 * reaches, in the order they jump, with where each lands. A jump is exact
 * except where another player's private technology decides it (a hostile
 * unit scared onto a Mountain) or the tile behind is unexplored: `UNKNOWN`,
 * which the preview counts as staying for the units after it.
 */
export interface BooPreviewEntryV7 {
  readonly unitId: UnitId;
  readonly ownerId: PlayerId;
  readonly from: CoordV7;
  readonly outcome: "JUMPS" | "STAYS" | "UNKNOWN";
  /** The tile one step directly away from the Horror. */
  readonly to: CoordV7;
  /** It holds a strand the viewer sees, which a jump breaks. */
  readonly holdsStrand: boolean;
}
export interface BooPreviewV7 {
  readonly unitId: UnitId;
  readonly results: readonly BooPreviewEntryV7[];
}

/** Section 8.5: null unless that `BOO` is offered. */
export function previewBooV7(
  view: PlayerViewV7,
  unitId: UnitId,
): BooPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "BOO" && command.unitId === unitId,
    )
  )
    return null;
  const horror = view.units.find((unit) => unit.id === unitId);
  if (horror === undefined) return null;
  let units = view.units;
  const results: BooPreviewEntryV7[] = [];
  for (const victim of booVictimsV7(view, view.units, horror)) {
    const to = booDestinationV7(horror.at, victim.at);
    const outcome = publicBooJumpV7(
      units === view.units ? view : { ...view, units },
      victim,
      to,
    );
    results.push({
      unitId: victim.id,
      ownerId: victim.ownerId,
      from: { x: victim.at.x, y: victim.at.y },
      outcome,
      to,
      holdsStrand: view.cult.strands.some(
        (strand) => strand.cultistUnitId === victim.id,
      ),
    });
    if (outcome === "JUMPS")
      units = units.map((unit) =>
        unit.id === victim.id ? { ...unit, at: to } : unit,
      );
  }
  return { unitId, results };
}

/**
 * The Cultists (section 8.5): the public mirror of the Push conditions
 * (`displacementDestinationLegalV7`) for a land-form unit a Boo! scares
 * onto `to`: on the board, not a settlement site, land or ice, enterable by
 * the unit, empty, and not in territory allied to it. Every unit and mound
 * on an explored tile is visible.
 */
function publicBooJumpV7(
  view: PlayerViewV7,
  victim: PlayerViewV7["units"][number],
  to: CoordV7,
): BooPreviewEntryV7["outcome"] {
  if (unitIsImmovableV7(view, victim)) return "STAYS";
  const tile = tileAtView(view, to);
  if (tile === undefined) return "STAYS";
  if (!tile.explored) return "UNKNOWN";
  const ice = isIceAtV7(view, to);
  if (
    tile.site !== null ||
    (tile.biome === null && !ice) ||
    tileOccupiedV7(view, to, victim.id) ||
    (tile.territoryOwnerId !== null &&
      publicAllied(view, victim.ownerId, tile.territoryOwnerId))
  )
    return "STAYS";
  if (
    tile.terrain === "RIFT" &&
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(view, victim),
      afloat: false,
      engineering: false,
      navigation: false,
      mountainBorn: false,
      ice: false,
    })
  )
    return "STAYS";
  if (tile.terrain === "MOUNTAIN") {
    if (
      !unitMayEnterMountainV7(view, victim, false) &&
      victim.ownerId !== view.viewer.id
    )
      return "UNKNOWN";
    if (
      !unitMayEnterMountainV7(
        view,
        victim,
        view.viewer.researchedTechs.includes("ENGINEERING"),
      )
    )
      return "STAYS";
  }
  return "JUMPS";
}

/** Section 6.3: the preview of an offered Goblin Toss. */
export interface TossPreviewV7 {
  readonly unitId: UnitId;
  readonly passengerUnitId: UnitId;
  readonly from: CoordV7;
  readonly to: CoordV7;
  /** A hostile Field Defense on the landing tile is destroyed. */
  readonly fieldDefenseDestroyed: boolean;
  /** The Goblin may still Kaboom or attack after landing. */
  readonly passengerMayAct: boolean;
}

/** Section 6.3: null unless that `TOSS` is offered; equals the result. */
export function previewTossV7(
  view: PlayerViewV7,
  unitId: UnitId,
  passengerUnitId: UnitId,
  to: CoordV7,
): TossPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "TOSS" &&
        command.unitId === unitId &&
        command.passengerUnitId === passengerUnitId &&
        same(command.at, to),
    )
  )
    return null;
  const passenger = view.units.find((unit) => unit.id === passengerUnitId);
  const tile = tileAtView(view, to);
  if (passenger === undefined || tile?.explored !== true) return null;
  const thrown = {
    ...passenger,
    at: to,
    activation: { ...passenger.activation, moved: true },
  };
  return {
    unitId,
    passengerUnitId,
    from: passenger.at,
    to,
    fieldDefenseDestroyed:
      tile.fieldDefense &&
      tile.territoryOwnerId !== null &&
      tile.territoryOwnerId !== view.viewer.id &&
      publicHostile(view, view.viewer.id, tile.territoryOwnerId),
    passengerMayAct:
      !unitIsCrashedV7(view, passenger.id) &&
      !primaryUsedForQuery(thrown) &&
      !primaryActionBlockedAfterMoveV7(view, thrown),
  };
}

/** Section 6.4: the preview of an offered Thunder Stomp (exact). */
export interface StompPreviewV7 {
  readonly unitId: UnitId;
  readonly results: readonly CombatSplashEntryV7[];
  readonly fieldDefenses: readonly CoordV7[];
}

/** Section 6.4: null unless `STOMP` is offered for the unit. */
export function previewStompV7(
  view: PlayerViewV7,
  unitId: UnitId,
): StompPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "STOMP" && command.unitId === unitId,
    )
  )
    return null;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return null;
  return {
    unitId,
    results: stompResultsV7(view, view.shields, view.units, unit),
    fieldDefenses: ringTilesV7(
      view.board.width,
      view.board.height,
      unit.at,
    ).filter((at) => {
      const tile = tileAtView(view, at);
      return tile?.explored === true && tile.fieldDefense;
    }),
  };
}

/** Section 6.8: the preview of an offered Break Off. */
export interface BreakOffPreviewV7 {
  readonly unitId: UnitId;
  readonly cityId: CityId;
  /** The Giant's HP after it spends `BREAK_OFF_HP_V7`. */
  readonly hpAfter: number;
  /** Each new Gingerbread Man's HP (a Toffee Trooper's maximum). */
  readonly trooperHp: number;
  /** How many Gingerbread Men one Break Off makes (`BREAK_OFF_UNITS_V7`). */
  readonly count: number;
  /** Every tile some offered pair uses, in (y, x) order. */
  readonly tiles: readonly CoordV7[];
}

/** Section 6.8: null unless a `BREAK_OFF` is offered for the unit. */
export function previewBreakOffV7(
  view: PlayerViewV7,
  unitId: UnitId,
): BreakOffPreviewV7 | null {
  const used = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "BREAK_OFF" && command.unitId === unitId
      ? command.tiles
      : [],
  );
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (used.length === 0 || unit === undefined || unit.homeCityId === null)
    return null;
  const tiles = [
    ...new Map(used.map((at) => [`${at.x},${at.y}`, at])).values(),
  ].sort((left, right) => left.y - right.y || left.x - right.x);
  return {
    unitId,
    cityId: unit.homeCityId,
    hpAfter: unit.hp - unitRoleMechanicsV7(view, unit).breakOffHp,
    trooperHp: breakOffTrooperHpV7(view, view.viewer.id),
    count: BREAK_OFF_UNITS_V7,
    tiles,
  };
}

/**
 * Section 6.5: the trample of an offered Overstride `MOVE` of the viewer's
 * Colossus along `path`: each hostile ground unit or Egg on a tile the path
 * passes (entered and left) takes the fixed trample damage, in path order.
 * Exact: a Move never passes an unexplored tile, and every unit on an
 * explored tile is visible. Null unless the `MOVE` is offered; empty for a
 * unit without Overstride.
 */
export function previewTrampleV7(
  view: PlayerViewV7,
  unitId: UnitId,
  path: readonly CoordV7[],
): readonly CombatSplashEntryV7[] | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "MOVE" &&
        command.unitId === unitId &&
        command.path.length === path.length &&
        command.path.every((at, index) => {
          const step = path[index];
          return step !== undefined && same(at, step);
        }),
    )
  )
    return null;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined || !unitOverstridesV7(view, unit)) return [];
  const damage = unitRoleMechanicsV7(view, unit).trampleDamage;
  const results: CombatSplashEntryV7[] = [];
  for (const at of path.slice(0, -1)) {
    const victim = view.units.find(
      (candidate) =>
        candidate.hp > 0 &&
        candidate.id !== unit.id &&
        same(candidate.at, at) &&
        (candidate.form === "LAND" || candidate.form === "EGG") &&
        !unitFliesV7(view, candidate) &&
        publicHostile(view, unit.ownerId, candidate.ownerId),
    );
    if (
      victim === undefined ||
      results.some((entry) => entry.unitId === victim.id)
    )
      continue;
    results.push(
      fixedSignatureHitV7(
        view,
        victim,
        shieldOfV7(view.shields, victim.id),
        damage,
      ),
    );
  }
  return results;
}

function publicActiveOwnedPort(
  view: PlayerViewV7,
  tile: PlayerTileViewV7,
  ownerId: PlayerId,
): boolean {
  return (
    tile.explored &&
    (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
    tile.territoryOwnerId === ownerId &&
    !view.units.some(
      (unit) =>
        same(unit.at, tile.at) &&
        isAfloatFormV7(unit.form) &&
        publicHostile(view, ownerId, unit.ownerId),
    )
  );
}

/**
 * Tuning 1 (`pulp_wars-w49.3`, 7r46): the explored neutral cells of a
 * city's 5 x 5 footprint, which a Land Grant claims and pays for (2 Coins
 * each, at least 6). Unexplored neutral cells are claimed too and are free,
 * so this list and the cost are exact from the owner's view.
 */
function publicLandGrantTilesV7(
  view: PlayerViewV7,
  city: { readonly at: CoordV7 },
): readonly CoordV7[] {
  return view.board.tiles
    .filter(
      (tile) =>
        Math.abs(tile.at.x - city.at.x) <= 2 &&
        Math.abs(tile.at.y - city.at.y) <= 2 &&
        tile.explored &&
        tile.territoryCityId === null &&
        tile.territoryOwnerId === null,
    )
    .map((tile) => tile.at);
}

/** The exact public preview of an offered `LAND_GRANT` (tuning 1, 7r46). */
export interface LandGrantPreviewV7 {
  readonly cityId: CityId;
  /** 2 Coins per tile of `tiles`, at least 6. */
  readonly cost: number;
  /** The explored neutral tiles the grant claims, in (y, x) order. */
  readonly tiles: readonly CoordV7[];
}

/**
 * The cost and the explored tiles of a Land Grant the public command query
 * offers for `cityId`, or null when it is not offered.
 */
export function queryLandGrantPreviewV7(
  view: PlayerViewV7,
  cityId: CityId,
): LandGrantPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "LAND_GRANT" && command.cityId === cityId,
    )
  )
    return null;
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return null;
  const tiles = [...publicLandGrantTilesV7(view, city)].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
  return { cityId, cost: landGrantCostV7(tiles.length), tiles };
}

/**
 * Tuning 4 (`pulp_wars-w49.3`): the price and tiles of the Land Grant
 * `cityId` could take, whether or not the viewer can pay for it now (so the
 * offer stays visible while it is too dear), or null when the city has none
 * (no Planning, below level 3, already used, or no explored neutral tile).
 */
export function publicLandGrantPriceV7(
  view: PlayerViewV7,
  cityId: CityId,
): LandGrantPreviewV7 | null {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (
    city === undefined ||
    city.ownerId !== view.viewer.id ||
    !view.viewer.researchedTechs.includes("PLANNING") ||
    city.level < 3 ||
    city.landGrantUsed
  )
    return null;
  const tiles = [...publicLandGrantTilesV7(view, city)].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
  return tiles.length === 0
    ? null
    : { cityId, cost: landGrantCostV7(tiles.length), tiles };
}

export interface MonumentPreviewV7 {
  readonly achievement: AchievementIdV7;
  readonly entitlement: AchievementEntitlementV7;
  readonly at: CoordV7;
  readonly cityId: CityId;
  readonly cityHasMonument: false;
  readonly onePerCityAvailable: true;
  readonly populationAdded: 3;
  readonly levelsReached: readonly number[];
  readonly rewardWork: readonly Extract<
    DomainEventV7,
    {
      kind: "CITY_REWARD_AUTOMATICALLY_GRANTED" | "CITY_REWARD_QUEUED";
    }
  >[];
  readonly lostEmptyTile: true;
  readonly complete: true;
}

export type MonumentPreviewResultV7 =
  | { readonly ok: true; readonly preview: MonumentPreviewV7 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

export function previewMonumentV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrCommand: PlayerId | Extract<CommandV7, { kind: "BUILD_MONUMENT" }>,
  maybeCommand?: Extract<CommandV7, { kind: "BUILD_MONUMENT" }>,
): MonumentPreviewResultV7 {
  const view =
    maybeCommand === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrCommand as PlayerId);
  const command =
    maybeCommand ??
    (viewerOrCommand as Extract<CommandV7, { kind: "BUILD_MONUMENT" }>);
  const offered = queryPlayerCommandsV7(view).some(
    (candidate) =>
      candidate.kind === "BUILD_MONUMENT" &&
      candidate.achievement === command.achievement &&
      same(candidate.at, command.at),
  );
  if (!offered) return { ok: false, error: "NOT_OFFERED" };
  const tile = tileAtView(view, command.at);
  const entitlement = view.viewer.achievementEntitlements.find(
    (item) => item.achievement === command.achievement,
  );
  if (
    tile?.explored !== true ||
    tile.territoryCityId === null ||
    entitlement === undefined
  )
    return { ok: false, error: "NOT_OFFERED" };
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined) return { ok: false, error: "NOT_OFFERED" };
  const levelsReached: number[] = [];
  // The Cultists: what the city gave up in Offerings does not come back.
  const total =
    city.permanentPopulation +
    city.economicPopulation +
    MONUMENT_POPULATION_V7 -
    cityOfferedPopulationV7(city);
  if (!Number.isSafeInteger(total)) return { ok: false, error: "NOT_OFFERED" };
  let level = city.level;
  while (total - growthSpentForPreview(level) >= level + 1) {
    level += 1;
    levelsReached.push(level);
  }
  const rewardWork: Extract<
    DomainEventV7,
    { kind: "CITY_REWARD_AUTOMATICALLY_GRANTED" | "CITY_REWARD_QUEUED" }
  >[] = [];
  for (const reachedLevel of levelsReached) {
    rewardWork.push({
      kind: "CITY_REWARD_QUEUED",
      cityId: city.id,
      reachedLevel,
      candidates: rewardCandidatesForLevelV7(reachedLevel),
    });
    break;
  }
  return {
    ok: true,
    preview: {
      achievement: command.achievement,
      entitlement,
      at: command.at,
      cityId: tile.territoryCityId,
      cityHasMonument: false,
      onePerCityAvailable: true,
      populationAdded: MONUMENT_POPULATION_V7,
      levelsReached,
      rewardWork,
      lostEmptyTile: true,
      complete: true,
    },
  };
}

function growthSpentForPreview(level: number): number {
  const result = (level * (level + 1)) / 2 - 1;
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}

/**
 * Observation-safe exact preview for an offered Wail (revision 13 section
 * 6.6). Every Wail target is visible to its actor, so the preview equals the
 * resolution and cannot name a hidden unit.
 */
export function previewWailV7(
  view: PlayerViewV7,
  unitId: UnitId,
): WailPreviewV7 | null;
export function previewWailV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): WailPreviewV7 | null;
export function previewWailV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): WailPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "WAIL" && command.unitId === unitId,
    )
  )
    return null;
  const banshee = view.units.find((unit) => unit.id === unitId);
  if (banshee === undefined) return null;
  const targets = publicWailTargetsV7(view, banshee);
  const terrified = wailTerrifiedIdsV7(
    view,
    banshee,
    targets,
    (targetId) => view.units.find((unit) => unit.id === targetId)?.ownerId,
  );
  return {
    unitId,
    at: banshee.at,
    attack2: unitRoleRuleV7(view, banshee).attack2,
    targets: targets.map((target) => {
      const unit = view.units.find(
        (candidate) => candidate.id === target.unitId,
      );
      // Revision 14: a bitten land-form victim rises instead of a Grave.
      const bittenRises =
        target.dies &&
        unit !== undefined &&
        unit.form === "LAND" &&
        // The Rift (RULESET_7_RIFT.md section 4): nothing rises on a Rift.
        !noRisingAtV7(view.board, unit.at) &&
        view.bitten.some((entry) => entry.unitId === target.unitId);
      return {
        ...target,
        leavesGrave:
          target.dies &&
          !bittenRises &&
          unit !== undefined &&
          publicWailLeavesGraveV7(view, unit),
        bittenRises,
        // The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror.
        terror: terrified.includes(target.unitId),
      };
    }),
  };
}

/**
 * The public combat preview: the canonical preview shape plus, exactly when
 * the target is a visible Monster (map curiosities section 10.4),
 * `monsterRetaliates`: whether the attacker, where it stands after this
 * attack, will be in the Monster's reach on its next turn (false when
 * either dies).
 */
export type PublicCombatPreviewV7 = CombatPreviewV7 & {
  readonly monsterRetaliates?: boolean;
};

/**
 * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 10.4;
 * round 2, section 32.5): the public facts of a visible neutral unit.
 */
export interface MonsterPreviewV7 {
  readonly unitId: UnitId;
  /** Round 2: the unit's breed. */
  readonly breed: NeutralBreedV7;
  /** Its lair, its camp centre, or Bigfoot's home. */
  readonly home: CoordV7;
  /**
   * Where it may ever stand, as far as the viewer has explored it: the
   * Spider's area (the explored tiles within 2 of home of a terrain it may
   * stand on, not a settlement site, and 3 or more from every known
   * settlement center, whoever stands there now); a guard's camp area
   * (the same, never the centre); Bigfoot's habitat (explored Forest within
   * 4 of home, 3 or more from every known centre and curiosity tile).
   */
  readonly area: readonly CoordV7[];
  /**
   * The tiles where a unit provokes it: the Spider's neighbours; a saucer
   * guard's camp perimeter (within 2 of the saucer) plus the tiles next to
   * each visible guard of the camp; a Zombie's reach; Bigfoot's tiles within
   * 3 (standing there makes it flee).
   */
  readonly provokeTiles: readonly CoordV7[];
  /**
   * Every tile it could attack on its next turn after at most one step (an
   * unexplored tile of its area counts as a possible step); empty for
   * Bigfoot.
   */
  readonly reachTiles: readonly CoordV7[];
  /** The visible provokers now (for Bigfoot: the units that make it flee). */
  readonly provokers: readonly UnitId[];
  /** The weakest visible provoker in reach (lowest HP, then ID), or null. */
  readonly likelyTarget: UnitId | null;
  /**
   * False when an unexplored tile lies within 1 + its range of it (2 for
   * the Spider) or, for Bigfoot, within 3: a hidden unit there could change
   * its choice.
   */
  readonly exact: boolean;
}

/**
 * Map curiosities (section 10.4; round 2, section 32.5): the preview of the
 * visible neutral unit `unitId`, or null when the viewer cannot see it. It
 * reads only the public view; its target choice mirrors the neutral turn
 * (sections 8.4 and 25.4) over the visible provokers.
 */
export function previewMonsterV7(
  view: PlayerViewV7,
  unitId: UnitId,
): MonsterPreviewV7 | null {
  const entry = view.monsters.find((candidate) => candidate.unitId === unitId);
  const monster = view.units.find((unit) => unit.id === unitId && unit.hp > 0);
  if (entry === undefined || monster === undefined) return null;
  const breed = entry.breed;
  const onBoard = (at: CoordV7): boolean =>
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < view.board.width &&
    at.y < view.board.height;
  const centers = view.board.tiles.filter(
    (tile) => tile.explored && tile.site !== null,
  );
  const within = (center: CoordV7, radius: number): CoordV7[] => {
    const result: CoordV7[] = [];
    for (let y = center.y - radius; y <= center.y + radius; y += 1)
      for (let x = center.x - radius; x <= center.x + radius; x += 1) {
        const at = { x, y };
        if (onBoard(at)) result.push(at);
      }
    return result;
  };
  const neighbours = (at: CoordV7): CoordV7[] =>
    within(at, 1).filter((near) => !same(near, at));
  const curiosityTiles = [
    ...view.curiosities.map((curiosity) => curiosity.at),
    ...view.monsters
      .filter((other) => other.breed === "GIANT_SPIDER")
      .map((other) => other.home),
  ];
  // Whether the unit may stand on `at` by terrain and position: true,
  // false, or null when the tile is unexplored.
  const standableTerrain = (at: CoordV7): boolean | null => {
    if (!onBoard(at)) return false;
    if (breed === "BIGFOOT") {
      if (chebyshev(at, entry.home) > BIGFOOT_HABITAT_RADIUS_V7) return false;
      const tile = tileAtView(view, at);
      if (tile?.explored !== true) return null;
      return (
        tile.terrain === "FOREST" &&
        !centers.some((center) => chebyshev(center.at, at) < 3) &&
        !curiosityTiles.some(
          (other) => chebyshev(other, at) < BIGFOOT_CURIOSITY_DISTANCE_V7,
        )
      );
    }
    if (
      chebyshev(at, entry.home) > MONSTER_HOME_RADIUS_V7 ||
      (breed !== "GIANT_SPIDER" && same(at, entry.home))
    )
      return false;
    const tile = tileAtView(view, at);
    if (tile?.explored !== true) return null;
    return (
      tile.site === null &&
      (tile.terrain === "GRASS" ||
        tile.terrain === "FOREST" ||
        tile.terrain === "MOUNTAIN") &&
      !centers.some((center) => chebyshev(center.at, at) < 3)
    );
  };
  const areaSource =
    breed === "BIGFOOT"
      ? within(entry.home, BIGFOOT_HABITAT_RADIUS_V7)
      : monsterAreaV7(view.board, entry.home);
  const area = areaSource.filter((at) => standableTerrain(at) === true);
  // A known step: standable and free of visible units, mounds, and chests.
  // An unexplored tile of the area may be a step too.
  const steps = neighbours(monster.at).filter((at) => {
    const standable = standableTerrain(at);
    if (standable === null) return true;
    return (
      standable &&
      !tileOccupiedV7(view, at) &&
      !view.treasureChests.some((chest) => same(chest, at))
    );
  });
  const hostile = view.units.filter(
    (unit) =>
      unit.hp > 0 && unit.id !== monster.id && !isNeutralOwnerV7(unit.ownerId),
  );
  if (breed === "BIGFOOT") {
    const provokeTiles = within(monster.at, BIGFOOT_ALERT_RADIUS_V7).filter(
      (at) => !same(at, monster.at),
    );
    return {
      unitId,
      breed,
      home: entry.home,
      area,
      provokeTiles,
      reachTiles: [],
      provokers: hostile
        .filter(
          (unit) => chebyshev(unit.at, monster.at) <= BIGFOOT_ALERT_RADIUS_V7,
        )
        .map((unit) => unit.id),
      likelyTarget: null,
      exact: view.board.tiles.every(
        (tile) =>
          tile.explored ||
          chebyshev(tile.at, monster.at) > BIGFOOT_ALERT_RADIUS_V7,
      ),
    };
  }
  const rule = unitRoleRuleV7(view, monster);
  const inRange = (from: CoordV7, at: CoordV7): boolean => {
    const distance = chebyshev(from, at);
    return distance >= rule.minimumRange && distance <= rule.range;
  };
  const origins = [monster.at, ...steps];
  const reach = new Map<string, CoordV7>();
  for (const origin of origins)
    for (const at of within(origin, rule.range))
      if (!same(at, monster.at) && inRange(origin, at))
        reach.set(`${at.y},${at.x}`, at);
  const reachTiles = [...reach.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
  // Section 25.4: a saucer's provocation (the perimeter, next to a guard of
  // the camp, or a hurt to one of them); a Graveyard's (every unit).
  const campGuards =
    breed === "GIANT_SPIDER"
      ? []
      : view.monsters.filter(
          (other) =>
            other.breed !== "GIANT_SPIDER" &&
            other.breed !== "BIGFOOT" &&
            same(other.home, entry.home),
        );
  const campGuardUnits = view.units.filter((unit) =>
    campGuards.some((other) => other.unitId === unit.id),
  );
  const graveyard = breed === "ZOMBIE";
  const provokeKeys = new Map<string, CoordV7>();
  if (breed === "GIANT_SPIDER")
    for (const at of neighbours(monster.at))
      provokeKeys.set(curiosityKeyV7(at), at);
  else if (graveyard)
    for (const at of reachTiles) provokeKeys.set(curiosityKeyV7(at), at);
  else {
    for (const at of within(entry.home, MONSTER_HOME_RADIUS_V7))
      provokeKeys.set(curiosityKeyV7(at), at);
    for (const guard of campGuardUnits)
      for (const at of neighbours(guard.at))
        provokeKeys.set(curiosityKeyV7(at), at);
  }
  const provokeTiles = [...provokeKeys.values()].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
  const provokers = hostile.filter((unit) =>
    breed === "GIANT_SPIDER"
      ? chebyshev(unit.at, monster.at) === 1 ||
        entry.provokedBy.includes(unit.id)
      : graveyard ||
        chebyshev(unit.at, entry.home) <= MONSTER_HOME_RADIUS_V7 ||
        campGuardUnits.some((guard) => chebyshev(guard.at, unit.at) === 1) ||
        campGuards.some((other) => other.provokedBy.includes(unit.id)),
  );
  // Naval branch section 5.2: a submerged Submarine is hit only from next
  // to it.
  const reachable = (unit: PublicUnitV7): boolean =>
    origins.some(
      (origin) =>
        inRange(origin, unit.at) &&
        (chebyshev(origin, unit.at) <= 1 || !unitIsSubmergedV7(view, unit)),
    );
  const likely = provokers
    .filter(reachable)
    .sort((left, right) => left.hp - right.hp || left.id - right.id)[0];
  const exactRadius = breed === "GIANT_SPIDER" ? 2 : 1 + rule.range;
  const exact = view.board.tiles.every(
    (tile) => tile.explored || chebyshev(tile.at, monster.at) > exactRadius,
  );
  return {
    unitId,
    breed,
    home: entry.home,
    area,
    provokeTiles,
    reachTiles,
    provokers: provokers.map((unit) => unit.id),
    likelyTarget: likely?.id ?? null,
    exact,
  };
}

/**
 * Map curiosities round 2 (section 32.5): what stepping the own unit
 * `unitId` onto the visible gate `gateAt` would do: `exit` (its partner),
 * `displaces` (the visible occupant of the exit, or null), `displaceTo` (the
 * tile that occupant is shoved to by section 28.3, or null), and `blocked`
 * (the exit is occupied with no free tile around it). Null when `gateAt` is
 * not a gate the viewer knows or the unit is not the viewer's. The partner
 * is explored with its gate, so the occupant is always visible.
 */
export interface GatePreviewV7 {
  readonly gate: CoordV7;
  readonly exit: CoordV7;
  readonly displaces: UnitId | null;
  readonly displaceTo: CoordV7 | null;
  readonly blocked: boolean;
  /**
   * False only when a foreign occupant's private Engineering could change
   * `displaceTo` (a Mountain earlier in the clockwise order).
   */
  readonly exact: boolean;
}

export function previewGateV7(
  view: PlayerViewV7,
  unitId: UnitId,
  gateAt: CoordV7,
): GatePreviewV7 | null {
  const unit = view.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  const gate = gateAtV7(view.curiosities, gateAt);
  if (unit === undefined || unit.ownerId !== view.viewer.id || gate === null)
    return null;
  const exit = gate.partner;
  const occupant = view.units.find(
    (candidate) =>
      candidate.id !== unit.id && candidate.hp > 0 && same(candidate.at, exit),
  );
  if (occupant === undefined)
    return {
      gate: gate.at,
      exit,
      displaces: null,
      displaceTo: null,
      blocked: false,
      exact: true,
    };
  // The occupant's terrain rule: a foreign seat's Engineering is private,
  // so the tile is computed with and without it (`exact` false when they
  // differ; `displaceTo` then assumes none).
  const own = occupant.ownerId === view.viewer.id;
  const ownTechs = own ? view.viewer.researchedTechs : [];
  const movementMode = unitMovementModeV7(view, occupant);
  const mountainBorn = unitIsMountainBornV7(view, occupant);
  const tileFor = (engineering: boolean): CoordV7 | null =>
    gateDisplacementTileV7(
      {
        // The whole view, so the occupancy predicate sees every list it
        // reads (units, mounds, and any later blocker such as a Barricade).
        ...view,
        board: {
          width: view.board.width,
          height: view.board.height,
          tiles: view.board.tiles as unknown as BoardStateV7["tiles"],
        },
      },
      exit,
      occupant.id,
      (at) => {
        const tile = tileAtView(view, at);
        return (
          tile?.explored === true &&
          canEnterTerrainV7({
            terrain: tile.terrain,
            movementMode,
            afloat: false,
            engineering,
            navigation: ownTechs.includes("NAVIGATION"),
            mountainBorn,
            ice: isIceAtV7(view, at),
          })
        );
      },
    );
  const displaceTo = tileFor(
    own && unitCapabilitiesV7(view, occupant, ownTechs).mountainMovement,
  );
  const withEngineering = own ? displaceTo : tileFor(true);
  return {
    gate: gate.at,
    exit,
    displaces: occupant.id,
    displaceTo,
    blocked: displaceTo === null,
    exact:
      (displaceTo === null) === (withEngineering === null) &&
      (displaceTo === null ||
        withEngineering === null ||
        same(displaceTo, withEngineering)),
  };
}

/**
 * Map curiosities round 2 (section 32.5): the movement query's gate marks:
 * every offered `MOVE` destination of the own unit `unitId` that is a gate,
 * with its exit and its gate preview, in (y, x) order of the gates.
 */
export function queryGateDestinationsV7(
  view: PlayerViewV7,
  unitId: UnitId,
): readonly GatePreviewV7[] {
  if (!view.curiosities.some((curiosity) => curiosity.kind === "GATE"))
    return [];
  const destinations = new Map<string, CoordV7>();
  for (const command of queryPlayerCommandsV7(view))
    if (command.kind === "MOVE" && command.unitId === unitId) {
      const at = command.path.at(-1);
      if (at !== undefined && gateAtV7(view.curiosities, at) !== null)
        destinations.set(curiosityKeyV7(at), at);
    }
  return [...destinations.values()]
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .flatMap((at) => {
      const preview = previewGateV7(view, unitId, at);
      return preview === null ? [] : [preview];
    });
}

/**
 * Observation-safe exact preview for an offered attack. The Ice Folk
 * revision: `options.assumeTargetChilled` evaluates the attack as if the
 * target had a Chill entry (section 11).
 */
export function queryCombatPreviewV7(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options?: CombatOptionsV7,
): PublicCombatPreviewV7 | null;
export function queryCombatPreviewV7(
  state: GameStateV7,
  viewerId: PlayerId,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options?: CombatOptionsV7,
): PublicCombatPreviewV7 | null;
export function queryCombatPreviewV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrAttacker: PlayerId | UnitId,
  attackerOrTarget: UnitId,
  maybeTarget?: UnitId | CombatOptionsV7,
  maybeOptions?: CombatOptionsV7,
): PublicCombatPreviewV7 | null {
  const stateForm = typeof maybeTarget === "number";
  const view = stateForm
    ? asView(input, viewerOrAttacker as PlayerId)
    : (input as PlayerViewV7);
  const attackerId = stateForm
    ? attackerOrTarget
    : (viewerOrAttacker as UnitId);
  const targetUnitId = stateForm ? (maybeTarget as UnitId) : attackerOrTarget;
  const options = stateForm
    ? (maybeOptions ?? {})
    : ((maybeTarget as CombatOptionsV7 | undefined) ?? {});
  if (!publicCommandOfferingAllowedV7(view)) return null;
  const preview = publicCombatPreview(view, attackerId, targetUnitId, options);
  // Map curiosities (section 10.4): an attack on a visible Monster says
  // whether the attacker will be in its reach on its next turn.
  if (
    preview === null ||
    !view.monsters.some((entry) => entry.unitId === targetUnitId)
  )
    return preview;
  const attacker = view.units.find((unit) => unit.id === attackerId);
  // Round 2 (section 32.5): a guard answers through any guard of its camp
  // (the attack makes the attacker a provoker of the camp); Bigfoot never.
  const entry = view.monsters.find((other) => other.unitId === targetUnitId);
  const answering =
    entry === undefined || entry.breed === "BIGFOOT"
      ? []
      : entry.breed === "GIANT_SPIDER"
        ? [entry]
        : view.monsters.filter(
            (other) =>
              other.breed !== "GIANT_SPIDER" &&
              other.breed !== "BIGFOOT" &&
              same(other.home, entry.home),
          );
  const reach = answering.flatMap(
    (other) => previewMonsterV7(view, other.unitId)?.reachTiles ?? [],
  );
  return {
    ...preview,
    monsterRetaliates:
      attacker !== undefined &&
      !preview.defenderDies &&
      !preview.attackerDies &&
      reach.some((at) => same(at, attacker.at)),
  };
}

/**
 * Revision 17 public explosion preview entry. `unitId` is null for a Zombie
 * that rises during the previewed command (its ID does not exist yet).
 * `friendly` means owned by the viewer or an ally.
 */
export interface ExplosionPreviewResultV7 {
  readonly unitId: UnitId | null;
  readonly ownerId: PlayerId;
  readonly at: CoordV7;
  /** HP damage. */
  readonly damage: number;
  readonly dies: boolean;
  readonly friendly: boolean;
  /** The Martian revision: what the victim's Shield absorbs of the blast. */
  readonly shieldDamage: number;
}

/** One previewed explosion of a chain, in resolution order. */
export interface ExplosionPreviewV7 {
  readonly unitId: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly cause: ExplosionCauseV7;
  readonly wave: number;
  readonly damage: number;
  readonly results: readonly ExplosionPreviewResultV7[];
  readonly fieldDefenseDestroyed: readonly CoordV7[];
}

/**
 * Totals over every previewed explosion relative to the viewer (friendly is
 * own or allied; the Kaboom unit itself is never a result). `plunderCoins`
 * is the viewer's Plunder from its own units' blasts (0 without Plunder).
 */
export interface ExplosionPreviewTotalsV7 {
  readonly hostileDamage: number;
  readonly hostileKills: number;
  readonly friendlyDamage: number;
  readonly friendlyKills: number;
  readonly plunderCoins: number;
}

export interface ExplosionChainPreviewV7 {
  readonly explosions: readonly ExplosionPreviewV7[];
  readonly totals: ExplosionPreviewTotalsV7;
  readonly friendlyFire: boolean;
  /**
   * True when a previewed blast area (or, for an attack, the splash ring
   * or an unknown Push destination the chain depends on) includes a cell the
   * viewer has not explored; otherwise the preview equals the resolution.
   */
  readonly touchesUnexplored: boolean;
}

export interface KaboomPreviewV7 extends ExplosionChainPreviewV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
}

export interface AttackExplosionsPreviewV7 extends ExplosionChainPreviewV7 {
  readonly attackerId: UnitId;
  readonly targetUnitId: UnitId;
}

/**
 * Revision 17 section 9 Kaboom preview: null unless `KABOOM` is offered;
 * otherwise the chain the Kaboom sets off, computed from the viewer's visible
 * units only. The first blast is always exact (its owner explored the whole
 * area); with `touchesUnexplored: false` the whole preview is exact.
 */
export function previewKaboomV7(
  view: PlayerViewV7,
  unitId: UnitId,
): KaboomPreviewV7 | null;
export function previewKaboomV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): KaboomPreviewV7 | null;
export function previewKaboomV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): KaboomPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "KABOOM" && command.unitId === unitId,
    )
  )
    return null;
  const exploder = view.units.find((unit) => unit.id === unitId);
  if (exploder === undefined) return null;
  const simulation = createPublicChainSimulationV7(view);
  const units = view.units
    .filter((unit) => unit.id !== exploder.id)
    .map(simulation.blastUnit);
  // Death first, then the bang: a Bitten Kaboom unit rises on its tile.
  const rising = simulation.rise(simulation.blastUnit(exploder));
  if (rising !== null) units.push(rising);
  return {
    unitId,
    at: exploder.at,
    ...simulation.run(units, [
      { unit: simulation.blastUnit(exploder), cause: "KABOOM" },
    ]),
  };
}

/** Tuning 3: the previewed explosion of an offered Blast Mountain. */
export interface BlastMountainPreviewV7 extends ExplosionChainPreviewV7 {
  readonly at: CoordV7;
  /**
   * Tuning 5 (`pulp_wars-w49.4`): the viewer's unit that sets the charge
   * and is not hit (`blastSetterV7`), or null.
   */
  readonly setterUnitId: UnitId | null;
}

/**
 * Tuning 3 (`pulp_wars-w49.3`): the explosion an offered `BLAST_MOUNTAIN` on
 * `at` would set off, computed from the viewer's visible units like a
 * Kaboom preview: every unit on the tile and around it takes
 * `BLAST_MOUNTAIN_DAMAGE_V7`, and exploding units it kills chain on. Null
 * when the command is not offered. The explosion's `unitId` is the charge's
 * provisional ID (0); the resolution allocates a fresh one.
 */
export function previewBlastMountainV7(
  view: PlayerViewV7,
  at: CoordV7,
): BlastMountainPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "BLAST_MOUNTAIN" && same(command.at, at),
    )
  )
    return null;
  const simulation = createPublicChainSimulationV7(view);
  const units = view.units.map(simulation.blastUnit);
  // The viewer's own units are always visible, so the setter is exact.
  const setter = blastSetterV7(units, view.viewer.id, at);
  return {
    at,
    setterUnitId: setter?.id ?? null,
    ...simulation.run(units, [
      {
        unit: {
          id: 0 as UnitId,
          ownerId: view.viewer.id,
          role: "FIGHTER",
          form: "LAND",
          at,
          hp: 0,
        },
        cause: "BLAST",
        spared: setter?.id,
      },
    ]),
  };
}

/**
 * Revision 17 section 9: the death blasts an offered attack would set off
 * (the exploding units among the defender, the splash victims, and the
 * attacker, after the attack's deaths, risings, advance, and Push), or an
 * empty chain; null when the attack is not offered. Public information only.
 */
export function previewAttackExplosionsV7(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
): AttackExplosionsPreviewV7 | null;
export function previewAttackExplosionsV7(
  state: GameStateV7,
  viewerId: PlayerId,
  attackerId: UnitId,
  targetUnitId: UnitId,
): AttackExplosionsPreviewV7 | null;
export function previewAttackExplosionsV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrAttacker: PlayerId | UnitId,
  attackerOrTarget: UnitId,
  maybeTarget?: UnitId,
): AttackExplosionsPreviewV7 | null {
  const view =
    maybeTarget === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrAttacker as PlayerId);
  const attackerId =
    maybeTarget === undefined ? (viewerOrAttacker as UnitId) : attackerOrTarget;
  const targetUnitId = maybeTarget ?? attackerOrTarget;
  if (!publicCommandOfferingAllowedV7(view)) return null;
  const preview = publicCombatPreviewCore(view, attackerId, targetUnitId);
  if (preview === null) return null;
  const chain = publicAttackChainV7(view, preview);
  return { attackerId, targetUnitId, ...chain.preview };
}

/** Revision 13 Raise Dead preview: the Graves that rise, in (y, x) order. */
export interface RaiseDeadPreviewV7 {
  readonly graves: readonly CoordV7[];
}

/**
 * Observation-safe exact Raise Dead preview (section 6.2): null unless the
 * command is offered. A raiser's neighbours are always explored by its
 * owner, so the preview equals the resolution.
 */
export function previewRaiseDeadV7(
  view: PlayerViewV7,
  unitId: UnitId,
): RaiseDeadPreviewV7 | null;
export function previewRaiseDeadV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): RaiseDeadPreviewV7 | null;
export function previewRaiseDeadV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): RaiseDeadPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  const unit = offeredGraveActor(view, "RAISE_DEAD", unitId);
  return unit === null
    ? null
    : {
        graves: raiseDeadGravesV7(view.graves, allOwnedUnitsV7(view), unit.at),
      };
}

/** Revision 13 Devour preview; `amount` may be 0. */
export interface DevourPreviewV7 {
  readonly at: CoordV7;
  readonly amount: number;
  readonly hpAfter: number;
}

/**
 * Exact Devour preview (section 6.3): null unless the command is offered. The
 * Ghoul and its tile are its owner's, so the preview equals the resolution.
 */
export function previewDevourV7(
  view: PlayerViewV7,
  unitId: UnitId,
): DevourPreviewV7 | null;
export function previewDevourV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): DevourPreviewV7 | null;
export function previewDevourV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): DevourPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  const unit = offeredGraveActor(view, "DEVOUR", unitId);
  return unit === null
    ? null
    : { at: unit.at, amount: unit.maxHp - unit.hp, hpAfter: unit.maxHp };
}

function offeredGraveActor(
  view: PlayerViewV7,
  kind: "RAISE_DEAD" | "DEVOUR",
  unitId: UnitId,
): PlayerViewV7["units"][number] | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === kind && command.unitId === unitId,
    )
  )
    return null;
  return view.units.find((unit) => unit.id === unitId) ?? null;
}

/** Revision 19 section 10: the laying preview of one role in one city. */
export interface LayEggPreviewV7 {
  readonly cityId: CityId;
  readonly role: UnitRoleIdV7;
  /** Printed cost minus the Arms Industry discount (minimum 1). */
  readonly cost: number;
  readonly slots: number;
  readonly usedSlots: number;
  readonly capacity: number;
  /** HP of the Egg (6, or 10 with Nesting). */
  readonly hp: number;
  /** Owner Start Turns until the Egg hatches. */
  readonly turnsToHatch: number;
  /** The legal nest tiles in (y, x) order. */
  readonly nestTiles: readonly CoordV7[];
  /** The rejection that applies with any tile, or null. */
  readonly unavailableReason:
    | "CITY_ACTION_SPENT"
    | "CITY_BESIEGED"
    | "CITY_REWARD_PENDING"
    | "TECH_REQUIRED"
    | "INVALID_TILE"
    | "CITY_CAPACITY_FULL"
    | "INSUFFICIENT_COINS"
    | null;
}

/**
 * Revision 19 `LAY_EGG` preview (section 10) for the viewer's own city and
 * an egg-laid role of the viewer's registration; null otherwise. The
 * unavailable reason follows the legality order of section 6.3. It is the
 * hatch-timing preview for a new Egg.
 */
export function previewLayEggV7(
  view: PlayerViewV7,
  cityId: CityId,
  role: UnitRoleIdV7,
): LayEggPreviewV7 | null {
  const player = view.viewer;
  const city = view.cities.find(
    (candidate) => candidate.id === cityId && candidate.ownerId === player.id,
  );
  const turnsToHatch = laidEggTurnsV7(
    role,
    player.researchedTechs,
    player.faction,
  );
  const rule = effectiveRoleRuleV7(role, player.faction);
  if (city === undefined || turnsToHatch === null || rule.cost === null)
    return null;
  const forgeDiscount = view.improvementValues.some((value) => {
    if (value.improvement !== "FORGE" || value.level <= 0) return false;
    const tile = tileAtView(view, value.at);
    return tile?.explored === true && tile.territoryCityId === city.id;
  });
  const cost = Math.max(1, rule.cost - (forgeDiscount ? 1 : 0));
  const slots = seatRoleMechanicsV7(view, player.id, role).capacitySlots;
  const usedSlots =
    allOwnedUnitsV7(view, player.id)
      .filter((unit) => unit.homeCityId === city.id)
      .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0) +
    publicSwallowedSlotsV7(view, city.id);
  const capacity = cityUnitCapacityForV7(
    city.level,
    player.researchedTechs,
    player.faction,
    cityBarracksV7(city),
  );
  const nestTiles = publicNestTilesV7(view, city);
  return {
    cityId,
    role,
    cost,
    slots,
    usedSlots,
    capacity,
    hp: laidEggHpV7(player.researchedTechs, player.faction),
    turnsToHatch,
    nestTiles,
    unavailableReason:
      city.cityActionAvailable !== true
        ? "CITY_ACTION_SPENT"
        : publicCityBesieged(view, city.at)
          ? "CITY_BESIEGED"
          : view.pendingChoices.some((choice) => choice.cityId === city.id)
            ? "CITY_REWARD_PENDING"
            : rule.technology !== null &&
                !player.researchedTechs.includes(rule.technology)
              ? "TECH_REQUIRED"
              : nestTiles.length === 0
                ? "INVALID_TILE"
                : usedSlots + slots > capacity
                  ? "CITY_CAPACITY_FULL"
                  : player.coins < cost
                    ? "INSUFFICIENT_COINS"
                    : null,
  };
}

/** Revision 19 section 10: the preview of an offered Shaman Hatch. */
export interface HatchPreviewV7 {
  readonly unitId: UnitId;
  readonly eggUnitId: UnitId;
  /** The role of the unit that appears (exhausted for this turn). */
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  /** The hatchling's HP: its role's full HP. */
  readonly hp: number;
  /** The Egg's remaining countdown, which the Hatch saves. */
  readonly turnsSaved: number;
}

/** Revision 19: null unless `HATCH` is offered; it equals the resolution. */
export function previewHatchV7(
  view: PlayerViewV7,
  unitId: UnitId,
  eggUnitId: UnitId,
): HatchPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "HATCH" &&
        command.unitId === unitId &&
        command.eggUnitId === eggUnitId,
    )
  )
    return null;
  const egg = view.units.find((unit) => unit.id === eggUnitId);
  const entry = view.eggs.find((candidate) => candidate.unitId === eggUnitId);
  if (egg === undefined || entry === undefined) return null;
  return {
    unitId,
    eggUnitId,
    role: egg.role,
    at: egg.at,
    hp: unitRoleRuleV7(view, egg).maxHp,
    turnsSaved: entry.turnsRemaining,
  };
}

/**
 * Canonical combat estimate. Revision 20: `plannedPathLength` is the run-up
 * of an attack after a planned Move of that many tiles (Charge!); without it
 * the unit's current `movedPathLength` applies.
 */
export function estimateCombatV7(
  state: GameStateV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  plannedPathLength?: number,
  options: CombatOptionsV7 = {},
): CombatPreviewV7 | null {
  const attacker = state.units.find(
    (unit) => unit.id === attackerId && unit.hp > 0,
  );
  const target = state.units.find(
    (unit) => unit.id === targetUnitId && unit.hp > 0,
  );
  if (attacker === undefined || target === undefined) return null;
  const rule = unitRoleRuleV7(state, attacker);
  const distance = Math.max(
    Math.abs(attacker.at.x - target.at.x),
    Math.abs(attacker.at.y - target.at.y),
  );
  // Revision 19: an Egg never attacks (it may be the target).
  if (
    attacker.form === "EMBARKED" ||
    attacker.form === "EGG" ||
    !rule.abilities.includes("ATTACK") ||
    distance < rule.minimumRange ||
    distance >
      attackMaximumRangeV7(
        state,
        attacker,
        tileAtV7(state.board, attacker.at)?.terrain,
      ) ||
    // The naval branch (sections 5.2 and 5.3): a torpedo targets only
    // units afloat, and a submerged Submarine is attacked only from an
    // adjacent tile.
    (attackIsTorpedoV7(state, attacker) && !isAfloatFormV7(target.form)) ||
    (distance > 1 && unitIsSubmergedV7(state, target)) ||
    // The frozen sea (section 8.9): an icebound ship cannot attack.
    unitIsIceboundV7(state, attacker)
  )
    return null;
  return calculateCombatPreviewV7(
    state,
    attackerId,
    targetUnitId,
    plannedPathLength,
    options,
  );
}

export function queryUnitStatsV7(
  input: GameStateV7 | PlayerViewV7,
  unitId: UnitId,
  viewerId?: PlayerId,
): PublicUnitStatsV7 | null {
  if ("leaderboard" in input)
    return input.unitStats.find((stats) => stats.unitId === unitId) ?? null;
  if (viewerId !== undefined) {
    const view = viewForV7(input, viewerId);
    return view.unitStats.find((stats) => stats.unitId === unitId) ?? null;
  }
  const unit = input.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  return unit === undefined ? null : publicUnitStatsV7(input, unit);
}

export type PublicSelectionV7 =
  | {
      readonly kind: "UNIT";
      readonly unit: PlayerViewV7["units"][number];
      readonly stats: PublicUnitStatsV7;
    }
  | { readonly kind: "CITY"; readonly city: PlayerViewV7["cities"][number] }
  | { readonly kind: "TILE"; readonly tile: PlayerTileViewV7 };

/** Selection lookup cannot name an entity omitted from PlayerView. */
export function queryPublicSelectionV7(
  view: PlayerViewV7,
  at: CoordV7,
): PublicSelectionV7 {
  const unit = view.units.find((candidate) => same(candidate.at, at));
  if (unit !== undefined) {
    const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
    if (stats === undefined) throw new RangeError("Visible unit stats missing");
    return { kind: "UNIT", unit, stats };
  }
  const city = view.cities.find((candidate) => same(candidate.at, at));
  if (city !== undefined) return { kind: "CITY", city };
  const tile = tileAtView(view, at);
  if (tile === undefined) throw new RangeError("Tile missing");
  return { kind: "TILE", tile };
}

export interface AiReadyCommandV7 {
  readonly command: CommandV7;
  readonly tuple: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

/**
 * Observation-safe deterministic candidate substrate. The policy bead fills
 * the first six scores; this boundary freezes only public tie-break fields.
 */
export function queryAiReadyCommandsV7(
  view: PlayerViewV7,
): readonly AiReadyCommandV7[] {
  return queryPlayerCommandsV7(view).map((command) => {
    const target = publicCommandTarget(view, command);
    const primary =
      "unitId" in command
        ? command.unitId
        : "cityId" in command
          ? command.cityId
          : 0;
    const content =
      command.kind === "RESEARCH"
        ? TECHNOLOGY_IDS_V7.indexOf(command.tech)
        : command.kind === "TRAIN" ||
            command.kind === "LAY_EGG" ||
            command.kind === "HIRE"
          ? UNIT_ROLE_IDS_V7.indexOf(command.role)
          : command.kind === "CHOOSE_CITY_REWARD"
            ? REWARD_IDS_V7.indexOf(command.reward)
            : command.kind === "BUILD_MONUMENT"
              ? ACHIEVEMENT_IDS_V7.indexOf(command.achievement)
              : "targetUnitId" in command
                ? command.targetUnitId
                : command.kind === "HATCH"
                  ? command.eggUnitId
                  : command.kind === "BEAM_DOWN" || command.kind === "TOSS"
                    ? command.passengerUnitId
                    : 0;
    return {
      command,
      tuple: [
        0,
        0,
        0,
        0,
        0,
        0,
        -COMMAND_KIND_ORDER_V7.indexOf(command.kind),
        -target.y,
        -target.x,
        -primary,
        -content,
      ],
    };
  });
}

/** Geometry-safe threat envelope for movement plus attack range. */
export function queryThreatenedTilesV7(
  input: GameStateV7 | PlayerViewV7,
  unitId: UnitId,
  viewerId?: PlayerId,
): readonly CoordV7[] {
  const view =
    "leaderboard" in input
      ? input
      : viewForV7(input, viewerId ?? input.humanPlayerId);
  const unit = view.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  // The Dwarf revision section 14: a mound's eruption ring and surfacing
  // reach (Move 1 and an attack): the tiles within 2 of its tile.
  const mound = view.burrowed.find((entry) => entry.unit.id === unitId);
  if (unit === undefined && mound !== undefined)
    return tilesWithinV7(view, mound.unit.at, 1, 2);
  // Revision 19 section 6.2: an Egg threatens nothing.
  if (unit === undefined || unit.form === "EGG") return [];
  // Map curiosities (section 10.4): a Monster threatens exactly its
  // provoke tiles (a unit there is attacked unless something weaker is in
  // reach); standing in its reach without provoking it is safe.
  // Round 2 (section 32.5): a guard threatens its provoke tiles within its
  // reach; Bigfoot threatens nothing.
  if (isNeutralOwnerV7(unit.ownerId)) {
    const preview = previewMonsterV7(view, unit.id);
    if (preview === null || preview.breed === "BIGFOOT") return [];
    if (preview.breed === "GIANT_SPIDER") return preview.provokeTiles;
    return preview.provokeTiles.filter((at) =>
      preview.reachTiles.some((tile) => same(tile, at)),
    );
  }
  // The frozen sea (naval branch section 8.9): an icebound unit cannot
  // move or attack, so it threatens nothing.
  if (unitIsIceboundV7(view, unit)) return [];
  // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen unit cannot move or act
  // on its owner's next turn, so it threatens nothing.
  if (unitIsFrozenV7(view, unit)) return [];
  const rule = unitRoleRuleV7(view, unit);
  // The Candy revision section 13: a Crashed unit has no attack reach, nor
  // has a Rushed one (it will be Crashed on its next turn) unless Home Sweet
  // Home spares it where it stands; every other Candy unit that could Rush
  // threatens its Rushed reach (Move + 1).
  const rushPhase = sugarRushPhaseV7(view, unit.id);
  if (
    rushPhase === "CRASHED" ||
    (rushPhase === "RUSHED" && !publicHomeSweetHomeSparesV7(view, unit))
  )
    return [];
  const reachView =
    unit.form === "LAND" && rule.abilities.includes("SUGAR_RUSH")
      ? viewWithRushV7(view, unit.id)
      : view;
  // The Dwarf revision section 14: a Gyrocopter's bombing reach (no
  // ordinary attack): every tile within 2 of its tile.
  if (
    unit.form === "LAND" &&
    rule.abilities.includes("BOMB_RUN") &&
    !rule.abilities.includes("ATTACK")
  )
    return tilesWithinV7(view, unit.at, 1, BOMB_RANGE_V7);
  // Revision 13: a Banshee threatens Chebyshev 1-2 around each reachable tile.
  const wail = rule.abilities.includes("WAIL");
  // Revision 17: a goblin-crewed land unit may Kaboom after moving, so it
  // also threatens every tile within Chebyshev 1 of a tile it can reach.
  const kaboom = unit.form === "LAND" && rule.abilities.includes("KABOOM");
  // `pulp_wars-0ao.15`: landing ends the activation, so an embarked unit has
  // no same-turn Kaboom reach from its landing cells.
  if (!rule.abilities.includes("ATTACK") && !wail) return [];
  const minimumRange = kaboom ? 0 : wail ? 1 : rule.minimumRange;
  const maximumRange = wail ? WAIL_RADIUS_V7 : rule.range;
  // The Martian revision: a land-form machine that ends a Move on water
  // self-launches and cannot attack from there, so its water destinations
  // are not attack origins.
  const machine =
    unit.form === "LAND" && unitMovementModeV7(view, unit) !== "GROUND";
  // The Ice Folk revision section 11: the reach includes Glide on known
  // Snow, Mountain-born paths, and Prowl (the public movement query), and a
  // Yeti reaches 2 from every Mountain origin (Rockfall).
  const origins = [
    unit.at,
    ...reachablePlayerMovementPathsV7(reachView, unit)
      .map((path) => path.destination)
      .filter((at) => {
        if (!machine) return true;
        const tile = tileAtView(view, at);
        // The frozen sea: a machine that ends on ice stands there.
        return (
          tile?.explored !== true || tile.biome !== null || isIceAtV7(view, at)
        );
      }),
  ];
  const rangeFrom = (origin: CoordV7): number => {
    if (wail) return maximumRange;
    const tile = tileAtView(view, origin);
    return attackMaximumRangeV7(
      view,
      unit,
      tile?.explored === true ? tile.terrain : undefined,
    );
  };
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md sections 5.2
  // and 5.3): a Submarine threatens only units afloat, so never an explored
  // land tile; and an attack reaches a tile that holds a visible submerged
  // Submarine of another owner only from an adjacent tile (a Wail is not an
  // attack and keeps its reach).
  const torpedo = attackIsTorpedoV7(view, unit);
  const submergedKeys = wail
    ? new Set<string>()
    : new Set(
        view.units
          .filter(
            (candidate) =>
              candidate.hp > 0 &&
              candidate.ownerId !== unit.ownerId &&
              unitIsSubmergedV7(view, candidate),
          )
          .map((candidate) => `${candidate.at.y},${candidate.at.x}`),
      );
  const direct = view.board.tiles
    .filter(
      (tile) =>
        !torpedo ||
        !tile.explored ||
        tile.terrain === "SHALLOW_WATER" ||
        tile.terrain === "DEEP_WATER",
    )
    .map((tile) => tile.at)
    .filter((at) => {
      const cap = submergedKeys.has(`${at.y},${at.x}`) ? 1 : Infinity;
      return origins.some((origin) => {
        const distance = Math.max(
          Math.abs(origin.x - at.x),
          Math.abs(origin.y - at.y),
        );
        return (
          distance >= minimumRange &&
          distance <= Math.min(cap, rangeFrom(origin))
        );
      });
    });
  return [
    ...new Map(direct.map((at) => [`${at.y},${at.x}`, at])).values(),
  ].sort((a, b) => a.y - b.y || a.x - b.x);
}

/** The board tiles at Chebyshev distance `minimum` to `maximum`, in (y, x). */
function tilesWithinV7(
  view: PlayerViewV7,
  center: CoordV7,
  minimum: number,
  maximum: number,
): readonly CoordV7[] {
  return view.board.tiles
    .map((tile) => tile.at)
    .filter((at) => {
      const distance = chebyshev(at, center);
      return distance >= minimum && distance <= maximum;
    })
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

function primaryUsedForQuery(unit: Pick<UnitStateV7, "activation">): boolean {
  return (
    unit.activation.attacked ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

export interface CityValueDeltaV7 {
  readonly cityId: CityId;
  readonly delta: number;
}
export interface EconomicPreviewV7 {
  readonly at: CoordV7;
  readonly cost: number;
  readonly ownerCityId: CityId | null;
  readonly populationDeltaByCity: readonly CityValueDeltaV7[];
  readonly coinIncomeDeltaByCity: readonly CityValueDeltaV7[];
  readonly resultingContribution: number;
  readonly outputTransitions: readonly EconomicOutputTransitionV7[];
  readonly resourceRestored:
    "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null;
  readonly levelsReached: readonly number[];
  readonly distinctTypes: readonly ImprovementIdV7[];
  readonly distinctFamilies: readonly EconomicFamilyV7[];
  readonly contributingTiles: readonly CoordV7[];
  readonly oppositePairAxes: readonly OppositePairAxisV7[];
  readonly capitalRoadConnected: boolean;
  readonly buildingLimitReached: false;
  readonly complete: true;
}
export interface EconomicOutputTransitionV7 {
  readonly at: CoordV7;
  readonly improvement: ImprovementIdV7;
  readonly measure: "POPULATION" | "COIN_INCOME";
  readonly before: number;
  readonly after: number;
  readonly change: "CREATED" | "REMOVED" | "OUTAGE" | "RESUMED" | "CHANGED";
}
export type EconomicPreviewResultV7 =
  | { readonly ok: true; readonly preview: EconomicPreviewV7 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

export function previewEconomicV7(
  view: PlayerViewV7,
  command: CommandV7,
): EconomicPreviewResultV7;
export function previewEconomicV7(
  state: GameStateV7,
  viewerId: PlayerId,
  command: CommandV7,
): EconomicPreviewResultV7;
export function previewEconomicV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrCommand: PlayerId | CommandV7,
  maybeCommand?: CommandV7,
): EconomicPreviewResultV7 {
  const view =
    maybeCommand === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrCommand as PlayerId);
  const command = maybeCommand ?? (viewerOrCommand as CommandV7);
  let cachedForView = PUBLIC_ECONOMIC_PREVIEWS.get(view);
  if (cachedForView === undefined) {
    cachedForView = new Map();
    PUBLIC_ECONOMIC_PREVIEWS.set(view, cachedForView);
  }
  const cacheKey = JSON.stringify(command);
  const cached = cachedForView.get(cacheKey);
  if (cached !== undefined) return cached;
  if (
    "at" in command &&
    TILE_KINDS.includes(command.kind as never) &&
    queryPlayerCommandsV7(view).some(
      (candidate) =>
        candidate.kind === command.kind &&
        "at" in candidate &&
        same(candidate.at, command.at),
    )
  ) {
    const reuseKey = publicEconomicPreviewFactKeyV7(view);
    const reused = PUBLIC_ECONOMIC_PREVIEW_REUSE.get(reuseKey)?.get(cacheKey);
    if (reused !== undefined) {
      const result = cloneEconomicPreviewResultV7(reused);
      cachedForView.set(cacheKey, result);
      return result;
    }
  }
  const result = calculatePublicEconomicPreviewV7(view, command);
  cachedForView.set(cacheKey, result);
  if (result.ok) {
    const reuseKey = publicEconomicPreviewFactKeyV7(view);
    let byCommand = PUBLIC_ECONOMIC_PREVIEW_REUSE.get(reuseKey);
    if (byCommand === undefined) {
      byCommand = new Map();
      PUBLIC_ECONOMIC_PREVIEW_REUSE.set(reuseKey, byCommand);
      if (PUBLIC_ECONOMIC_PREVIEW_REUSE.size > PUBLIC_PLANNING_REUSE_LIMIT) {
        const oldest = PUBLIC_ECONOMIC_PREVIEW_REUSE.keys().next().value;
        if (oldest !== undefined) PUBLIC_ECONOMIC_PREVIEW_REUSE.delete(oldest);
      }
    }
    byCommand.set(cacheKey, cloneEconomicPreviewResultV7(result));
    if (byCommand.size > 64) {
      const oldest = byCommand.keys().next().value;
      if (oldest !== undefined) byCommand.delete(oldest);
    }
  }
  return result;
}

function cloneEconomicPreviewResultV7(
  value: EconomicPreviewResultV7,
): EconomicPreviewResultV7 {
  return JSON.parse(JSON.stringify(value)) as EconomicPreviewResultV7;
}

function calculatePublicEconomicPreviewV7(
  view: PlayerViewV7,
  command: CommandV7,
): EconomicPreviewResultV7 {
  if (!("at" in command) || !TILE_KINDS.includes(command.kind as never))
    return { ok: false, error: "NOT_OFFERED" };
  const offered = queryPlayerCommandsV7(view).some(
    (candidate) =>
      candidate.kind === command.kind &&
      "at" in candidate &&
      same(candidate.at, command.at),
  );
  if (!offered || !publicEconomicPreviewExact(view, command))
    return { ok: false, error: "NOT_OFFERED" };
  const tile = tileAtView(view, command.at);
  const neutralRoad =
    command.kind === "BUILD_ROAD" &&
    tile?.explored === true &&
    tile.territoryCityId === null &&
    tile.territoryOwnerId === null;
  // Tuning 4 (`pulp_wars-w49.3`): a Blast Mountain outside the viewer's
  // territory has an exact preview too: its price and no city change.
  const foreignBlast =
    command.kind === "BLAST_MOUNTAIN" &&
    tile?.explored === true &&
    tile.territoryOwnerId !== view.viewer.id;
  if (
    tile?.explored !== true ||
    (tile.territoryCityId === null && !neutralRoad && !foreignBlast)
  )
    return { ok: false, error: "NOT_OFFERED" };
  const city = foreignBlast
    ? undefined
    : view.cities.find((candidate) => candidate.id === tile.territoryCityId);
  if (city === undefined && !neutralRoad && !foreignBlast)
    return { ok: false, error: "NOT_OFFERED" };
  const beforeGraph = publicEconomyGraph(view);
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[command.kind as BasicEconomicCommandKindV7];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[command.kind as SpatialEconomicCommandKindV7];
  const improvement =
    command.kind === "BUILD_PORT"
      ? ("PORT" as const)
      : command.kind === "BUILD_SHIPYARD"
        ? ("SHIPYARD" as const)
        : (basic?.improvement ?? spatial?.improvement ?? null);
  const cost =
    basic?.cost ??
    spatial?.cost ??
    (command.kind === "GATHER_PEARLS"
      ? 2
      : command.kind === "BUILD_PORT"
        ? 4
        : command.kind === "BUILD_SHIPYARD"
          ? 5
          : command.kind === "BUILD_ROAD"
            ? 2
            : command.kind === "REPLANT_FOREST"
              ? 4
              : command.kind === "CULTIVATE_FOREST"
                ? 4
                : command.kind === "BLAST_MOUNTAIN"
                  ? 3
                  : 0);
  const afterGraph = graphAfterTileCommandV7(view, beforeGraph, command, tile);
  if (afterGraph === null) return { ok: false, error: "NOT_OFFERED" };
  const evaluation =
    improvement !== null && improvement !== "PORT" && improvement !== "SHIPYARD"
      ? spatialContributionAtV7(afterGraph, command.at, improvement)
      : null;
  try {
    const populationDeltaByCity: CityValueDeltaV7[] = [];
    const coinIncomeDeltaByCity: CityValueDeltaV7[] = [];
    const levelsReached: number[] = [];
    const changesLiveGraph = economicCommandChangesLiveGraphV7(command.kind);
    for (const candidate of view.cities
      .filter((value) => value.ownerId === view.viewer.id)
      .sort((left, right) => left.id - right.id)) {
      // Tuning 1 (7r46): a Blast gives its city permanent population.
      const permanentDelta =
        candidate.id !== city?.id
          ? 0
          : basic?.populationCategory === "PERMANENT"
            ? basic.population
            : command.kind === "BLAST_MOUNTAIN"
              ? BLAST_MOUNTAIN_POPULATION_V7
              : 0;
      const liveDelta = changesLiveGraph
        ? liveTotalForCityV7(afterGraph, candidate.id) -
          liveTotalForCityV7(beforeGraph, candidate.id)
        : 0;
      const delta = permanentDelta + liveDelta;
      const growth = resolvePublicCityGrowthV7(
        candidate,
        candidate.permanentPopulation + permanentDelta,
        candidate.economicPopulation + liveDelta,
      );
      const incomeDelta = changesLiveGraph
        ? publicCityIncomeV7(
            view,
            growth.city,
            marketForCityV7(afterGraph, candidate.id),
            Number(
              publicGraphNavalConnectivityV7(afterGraph).landTrade.has(
                candidate.id,
              ),
            ) *
              LAND_TRADE_INCOME_COINS_V7 +
              Number(
                publicGraphNavalConnectivityV7(afterGraph).seaTrade.has(
                  candidate.id,
                ),
              ),
          ) -
          publicCityIncomeV7(
            view,
            candidate,
            marketForCityV7(beforeGraph, candidate.id),
            Number(
              publicGraphNavalConnectivityV7(beforeGraph).landTrade.has(
                candidate.id,
              ),
            ) *
              LAND_TRADE_INCOME_COINS_V7 +
              Number(
                publicGraphNavalConnectivityV7(beforeGraph).seaTrade.has(
                  candidate.id,
                ),
              ),
          )
        : exactIncomeDeltaWithUnchangedMarketV7(view, candidate, growth.city);
      if (incomeDelta === null) throw new RangeError("PUBLIC_GRAPH_AMBIGUOUS");
      if (delta !== 0)
        populationDeltaByCity.push({ cityId: candidate.id, delta });
      if (incomeDelta !== 0)
        coinIncomeDeltaByCity.push({
          cityId: candidate.id,
          delta: incomeDelta,
        });
      levelsReached.push(...growth.reachedLevels);
    }
    const immediateCoins = command.kind === "CLEAR_FOREST" ? 1 : 0;
    const coinsAfterAutomaticRewards =
      BigInt(view.viewer.coins) - BigInt(cost) + BigInt(immediateCoins);
    if (coinsAfterAutomaticRewards > BigInt(Number.MAX_SAFE_INTEGER))
      throw new RangeError("INTEGER_OVERFLOW");
    return {
      ok: true,
      preview: {
        at: command.at,
        cost,
        ownerCityId: foreignBlast ? null : tile.territoryCityId,
        populationDeltaByCity,
        coinIncomeDeltaByCity,
        resultingContribution:
          command.kind === "BUILD_PORT"
            ? // The naval branch section 5.4: 2 with the viewer's Harbours.
              publicDockPopulationV7(afterGraph, "PORT")
            : (evaluation?.population ??
              basic?.population ??
              (command.kind === "BLAST_MOUNTAIN" && !foreignBlast
                ? BLAST_MOUNTAIN_POPULATION_V7
                : 0)),
        outputTransitions: economicOutputTransitionsV7(
          view,
          beforeGraph,
          afterGraph,
        ),
        resourceRestored:
          command.kind === "REDEVELOP"
            ? publicRestoredResourceV7(view, tile.terrain, tile.improvement)
            : null,
        levelsReached,
        distinctTypes:
          evaluation?.distinctTypes ??
          (improvement === null ? [] : [improvement]),
        distinctFamilies: evaluation?.distinctFamilies ?? [],
        contributingTiles:
          evaluation?.contributingTiles ??
          (basic !== undefined ? [command.at] : []),
        oppositePairAxes: evaluation?.oppositePairAxes ?? [],
        capitalRoadConnected:
          (improvement === "MARKET" || command.kind === "BUILD_ROAD") &&
          publicGraphNeighborCoordsV7(afterGraph, command.at).some((at) =>
            publicGraphNavalConnectivityV7(afterGraph).roadKeys.has(
              coordKeyV7(at),
            ),
          ),
        buildingLimitReached: false,
        complete: true,
      },
    };
  } catch {
    return { ok: false, error: "NOT_OFFERED" };
  }
}

function publicEconomicPreviewExact(
  view: PlayerViewV7,
  command: Extract<CommandV7, { at: CoordV7 }>,
): boolean {
  const tile = tileAtView(view, command.at);
  const neutralRoad =
    command.kind === "BUILD_ROAD" &&
    tile?.explored === true &&
    tile.territoryCityId === null &&
    tile.territoryOwnerId === null;
  // Tuning 4: a Blast Mountain outside the viewer's territory changes none
  // of its cities, so its preview (the price) is always exact.
  if (
    tile?.explored === true &&
    command.kind === "BLAST_MOUNTAIN" &&
    tile.territoryOwnerId !== view.viewer.id
  )
    return true;
  if (
    tile?.explored !== true ||
    (tile.territoryCityId === null && !neutralRoad)
  )
    return false;
  if (neutralRoad && !view.board.tiles.every((candidate) => candidate.explored))
    return false;
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined && !neutralRoad) return false;
  // A changed improvement can affect adjacent same-owner processors and other
  // adjacent same-owner buildings across city borders. Every
  // tile in every owned city footprint must therefore be public before a
  // canonical reducer result can be reported as an exact public preview.
  const changesImprovementGraph =
    command.kind === "REDEVELOP" ||
    command.kind === "BUILD_ROAD" ||
    command.kind === "BUILD_FARM" ||
    command.kind === "BUILD_LUMBER_CAMP" ||
    command.kind === "BUILD_MINE" ||
    command.kind in SPATIAL_ECONOMIC_ACTIONS_V7;
  const ownedCities = view.cities.filter(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  const publicOwnedCityCount = view.leaderboard.find(
    (entry) => entry.isViewer,
  )?.cityCount;
  if (
    changesImprovementGraph &&
    (publicOwnedCityCount !== ownedCities.length ||
      ownedCities.some(
        (candidate) => !publicCityDevelopmentFootprintKnown(view, candidate),
      ))
  )
    return false;

  return true;
}

function economicCommandChangesLiveGraphV7(kind: CommandV7["kind"]): boolean {
  return (
    kind === "BUILD_FARM" ||
    kind === "BUILD_LUMBER_CAMP" ||
    kind === "BUILD_MINE" ||
    kind === "BUILD_PORT" ||
    kind === "BUILD_SHIPYARD" ||
    kind === "BUILD_ROAD" ||
    kind === "REDEVELOP" ||
    kind === "CULTIVATE_FOREST" ||
    kind === "BLAST_MOUNTAIN" ||
    kind in SPATIAL_ECONOMIC_ACTIONS_V7
  );
}

type PublicEconomyGraphTileV7 = EconomyGraphV7["board"]["tiles"][number] & {
  readonly explored: boolean;
  readonly terrain:
    Extract<PlayerTileViewV7, { explored: true }>["terrain"] | null;
  readonly resource:
    Extract<PlayerTileViewV7, { explored: true }>["resource"] | null;
  readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
  readonly territoryOwnerId: PlayerId | null;
};
type PublicEconomyGraphV7 = {
  readonly board: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly PublicEconomyGraphTileV7[];
  };
  readonly cities: PlayerViewV7["cities"];
  readonly ownerId: PlayerId;
  readonly originalCapitalCityId: CityId;
  readonly researchedTechs: PlayerViewV7["viewer"]["researchedTechs"];
  /** Revision 17: the viewer's faction resolves its technology capabilities. */
  readonly faction: PlayerViewV7["viewer"]["faction"];
  readonly activePortKeys: ReadonlySet<string>;
  readonly resolvedPendingCityIds: ReadonlySet<CityId>;
  readonly remainingMonumentEntitlements: number;
  /** Exact predecessor when this graph mutation cannot alter trade connectivity. */
  readonly connectivitySource?: PublicEconomyGraphV7 | undefined;
};

const PUBLIC_ECONOMY_GRAPHS = new WeakMap<PlayerViewV7, PublicEconomyGraphV7>();
const PUBLIC_ECONOMIC_PREVIEWS = new WeakMap<
  PlayerViewV7,
  Map<string, EconomicPreviewResultV7>
>();
const PUBLIC_SPATIAL_SCORES = new WeakMap<PlayerViewV7, Map<string, number>>();
const PUBLIC_SPATIAL_BASELINES = new WeakMap<PlayerViewV7, number>();
const PUBLIC_REDEVELOPMENT_CHANGES = new WeakMap<
  PlayerViewV7,
  Map<string, boolean>
>();
const PUBLIC_PLANNED_IMPROVEMENTS = new WeakMap<
  PlayerViewV7,
  Map<string, PublicPlannedImprovementV7 | null>
>();
const PUBLIC_ECONOMIC_POTENTIALS = new WeakMap<
  PlayerViewV7,
  readonly PublicEconomicPotentialV7[]
>();
const PUBLIC_PLANNING_FACT_KEYS = new WeakMap<PlayerViewV7, string>();
const PUBLIC_ECONOMIC_PREVIEW_FACT_KEYS = new WeakMap<PlayerViewV7, string>();
const PUBLIC_PLANNING_REUSE_LIMIT = 24;
interface PublicPlanningReuseEntryV7 {
  readonly potentials: readonly PublicEconomicPotentialV7[];
  readonly scores: ReadonlyMap<string, number>;
  readonly redevelopmentChanges: ReadonlyMap<string, boolean>;
}
const PUBLIC_PLANNING_REUSE = new Map<string, PublicPlanningReuseEntryV7>();
const PUBLIC_ECONOMIC_PREVIEW_REUSE = new Map<
  string,
  Map<string, EconomicPreviewResultV7>
>();
const PUBLIC_CITY_BESIEGED = new WeakMap<PlayerViewV7, Map<string, boolean>>();
const PUBLIC_CITY_DEVELOPMENT_FOOTPRINT_KNOWN = new WeakMap<
  PlayerViewV7,
  Map<CityId, boolean>
>();
const PUBLIC_GRAPH_TOTALS = new WeakMap<
  PublicEconomyGraphV7,
  Map<
    PlayerId,
    { readonly population: number; readonly recurringCoins: number }
  >
>();
const PUBLIC_GRAPH_NAVAL_CONNECTIVITY = new WeakMap<
  PublicEconomyGraphV7,
  {
    readonly network: ReadonlySet<CityId>;
    readonly landTrade: ReadonlySet<CityId>;
    readonly seaTrade: ReadonlySet<CityId>;
    readonly roadKeys: ReadonlySet<string>;
  }
>();

/**
 * Collision-free structural key for every public fact read by economic graph,
 * placement, spatial-score, and preview calculations. Dynamic unit details
 * are deliberately reduced to the two facts those calculations observe:
 * hostile city occupation and hostile naval occupation. No authority state is
 * available at this boundary.
 */
function publicPlanningFactKeyV7(view: PlayerViewV7): string {
  const existing = PUBLIC_PLANNING_FACT_KEYS.get(view);
  if (existing !== undefined) return existing;
  const work = createPublicPlanningFactKeyWorkV7(view);
  for (;;) {
    const progress = work.next();
    if (progress.done) return progress.value;
  }
}

function* createPublicPlanningFactKeyWorkV7(
  view: PlayerViewV7,
): Generator<void, string> {
  const tiles: unknown[] = [];
  for (const tile of view.board.tiles) {
    // Concealed tile fields are deliberately discarded at the public boundary.
    tiles.push(
      tile.explored
        ? {
            at: tile.at,
            explored: true,
            terrain: tile.terrain,
            resource: tile.resource,
            improvement: tile.improvement,
            road: tile.road,
            site: tile.site,
            territoryCityId: tile.territoryCityId,
            territoryOwnerId: tile.territoryOwnerId,
          }
        : { at: tile.at, explored: false },
    );
    yield;
  }
  const cities: unknown[] = [];
  const ownedCityKeys = new Set<string>();
  for (const city of view.cities) {
    cities.push({
      id: city.id,
      ownerId: city.ownerId,
      at: city.at,
      level: city.level,
      permanentPopulation: city.permanentPopulation,
      economicPopulation: city.economicPopulation,
      population: city.population,
      expanded: city.expanded,
      landGrantUsed: city.landGrantUsed,
      isCapital: city.isCapital,
    });
    if (city.ownerId === view.viewer.id) ownedCityKeys.add(coordKeyV7(city.at));
    yield;
  }
  const besiegingUnits: unknown[] = [];
  const hostileNavalUnits: unknown[] = [];
  for (const unit of view.units) {
    if (
      unit.hp > 0 &&
      publicHostile(view, view.viewer.id, unit.ownerId) &&
      ownedCityKeys.has(coordKeyV7(unit.at))
    )
      besiegingUnits.push([unit.ownerId, unit.at.x, unit.at.y]);
    if (
      isAfloatFormV7(unit.form) &&
      publicHostile(view, view.viewer.id, unit.ownerId)
    )
      hostileNavalUnits.push([unit.ownerId, unit.form, unit.at.x, unit.at.y]);
    yield;
  }
  const key = JSON.stringify({
    setupAiMode: view.setup.aiMode,
    humanPlayerId: view.humanPlayerId,
    board: {
      width: view.board.width,
      height: view.board.height,
      tiles,
    },
    cities,
    viewer: {
      id: view.viewer.id,
      originalCapitalCityId: view.viewer.originalCapitalCityId,
      researchedTechs: view.viewer.researchedTechs,
      faction: view.viewer.faction,
      achievementEntitlements: view.viewer.achievementEntitlements,
    },
    pendingChoices: view.pendingChoices,
    treasureChests: view.treasureChests,
    viewerCityCount: view.leaderboard.find((entry) => entry.isViewer)
      ?.cityCount,
    naval: {
      ownedPorts: view.naval.ownedPorts,
    },
    besiegingUnits,
    hostileNavalUnits,
  });
  PUBLIC_PLANNING_FACT_KEYS.set(view, key);
  return key;
}

function publicEconomicPreviewFactKeyV7(view: PlayerViewV7): string {
  const cached = PUBLIC_ECONOMIC_PREVIEW_FACT_KEYS.get(view);
  if (cached !== undefined) return cached;
  const key = JSON.stringify({
    planning: publicPlanningFactKeyV7(view),
    coins: view.viewer.coins,
    cities: view.cities,
    improvementValues: view.improvementValues,
    landTradeCityIds: view.naval.landTradeCityIds,
    seaTradeCityIds: view.naval.seaTradeCityIds,
  });
  PUBLIC_ECONOMIC_PREVIEW_FACT_KEYS.set(view, key);
  return key;
}

function planningReuseEntryV7(
  key: string,
): PublicPlanningReuseEntryV7 | undefined {
  const entry = PUBLIC_PLANNING_REUSE.get(key);
  if (entry !== undefined) {
    PUBLIC_PLANNING_REUSE.delete(key);
    PUBLIC_PLANNING_REUSE.set(key, entry);
  }
  return entry;
}

function retainPlanningReuseEntryV7(
  key: string,
  entry: PublicPlanningReuseEntryV7,
): void {
  PUBLIC_PLANNING_REUSE.delete(key);
  PUBLIC_PLANNING_REUSE.set(key, entry);
  if (PUBLIC_PLANNING_REUSE.size > PUBLIC_PLANNING_REUSE_LIMIT) {
    const oldest = PUBLIC_PLANNING_REUSE.keys().next().value;
    if (oldest !== undefined) PUBLIC_PLANNING_REUSE.delete(oldest);
  }
}

function publicEconomyGraph(view: PlayerViewV7): PublicEconomyGraphV7 {
  const cached = PUBLIC_ECONOMY_GRAPHS.get(view);
  if (cached !== undefined) return cached;
  const graph: PublicEconomyGraphV7 = {
    board: {
      width: view.board.width,
      height: view.board.height,
      tiles: view.board.tiles.map((tile): PublicEconomyGraphTileV7 =>
        tile.explored
          ? {
              at: tile.at,
              explored: true,
              terrain: tile.terrain,
              resource: tile.resource,
              improvement: tile.improvement,
              road: tile.road,
              site: tile.site,
              territoryCityId: tile.territoryCityId,
              territoryOwnerId: tile.territoryOwnerId,
            }
          : {
              at: tile.at,
              explored: false,
              terrain: null,
              resource: null,
              improvement: null,
              road: false,
              site: null,
              territoryCityId: null,
              territoryOwnerId: null,
            },
      ),
    },
    cities: view.cities,
    ownerId: view.viewer.id,
    originalCapitalCityId: view.viewer.originalCapitalCityId,
    researchedTechs: view.viewer.researchedTechs,
    faction: view.viewer.faction,
    activePortKeys: new Set(
      view.naval.ownedPorts
        .filter((port) => port.status === "ACTIVE")
        .map((port) => coordKeyV7(port.at)),
    ),
    resolvedPendingCityIds: new Set(),
    remainingMonumentEntitlements: view.viewer.achievementEntitlements.filter(
      (entitlement) => entitlement.unlocked && !entitlement.spent,
    ).length,
  };
  PUBLIC_ECONOMY_GRAPHS.set(view, graph);
  return graph;
}

function replacePublicGraphTileV7(
  graph: PublicEconomyGraphV7,
  at: CoordV7,
  replacement: Partial<PublicEconomyGraphTileV7>,
): PublicEconomyGraphV7 {
  // Parsed boards, and therefore PlayerView boards, are canonical row-major
  // arrays; spatial-economy and the rest of the engine share this invariant.
  const index = at.y * graph.board.width + at.x;
  const current = graph.board.tiles[index];
  if (current === undefined || !same(current.at, at)) return graph;
  const tiles = graph.board.tiles.slice();
  tiles[index] = { ...current, ...replacement, at: current.at };
  return {
    ...graph,
    board: {
      ...graph.board,
      tiles,
    },
    connectivitySource: graph,
  };
}

function graphAfterTileCommandV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  command: Extract<CommandV7, { at: CoordV7 }>,
  tile = graph.board.tiles.find((candidate) => same(candidate.at, command.at)),
): PublicEconomyGraphV7 | null {
  if (tile === undefined || !tile.explored) return null;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[command.kind as BasicEconomicCommandKindV7];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[command.kind as SpatialEconomicCommandKindV7];
  if (basic !== undefined)
    return replacePublicGraphTileV7(graph, command.at, {
      resource: projectedResourceAfterMutationV7(view, tile.terrain, null),
      improvement:
        command.kind === "HARVEST_FISH" &&
        (tile.improvement === "PORT" || tile.improvement === "SHIPYARD")
          ? tile.improvement
          : basic.improvement,
    });
  if (command.kind === "GATHER_PEARLS")
    return replacePublicGraphTileV7(graph, command.at, { resource: null });
  if (command.kind === "BUILD_PORT") {
    const next = replacePublicGraphTileV7(graph, command.at, {
      improvement: "PORT",
    });
    const blockaded = view.units.some(
      (unit) =>
        isAfloatFormV7(unit.form) &&
        same(unit.at, command.at) &&
        publicHostile(view, view.viewer.id, unit.ownerId),
    );
    return {
      ...next,
      activePortKeys: blockaded
        ? graph.activePortKeys
        : new Set([...graph.activePortKeys, coordKeyV7(command.at)]),
      connectivitySource: blockaded ? graph : undefined,
    };
  }
  if (command.kind === "BUILD_SHIPYARD")
    return replacePublicGraphTileV7(graph, command.at, {
      improvement: "SHIPYARD",
    });
  if (spatial !== undefined)
    return replacePublicGraphTileV7(graph, command.at, {
      improvement: spatial.improvement,
    });
  if (command.kind === "CLEAR_FOREST")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "GRASS",
      resource: projectedResourceAfterMutationV7(view, "GRASS", null),
    });
  if (command.kind === "REPLANT_FOREST")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "FOREST",
      resource: projectedResourceAfterMutationV7(view, "FOREST", null),
    });
  if (command.kind === "CULTIVATE_FOREST")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "GRASS",
      resource: projectedResourceAfterMutationV7(
        view,
        "GRASS",
        "FERTILE_GROUND",
      ),
    });
  if (command.kind === "BLAST_MOUNTAIN")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "GRASS",
      resource: null,
    });
  if (command.kind === "BUILD_ROAD")
    return {
      ...replacePublicGraphTileV7(graph, command.at, { road: true }),
      connectivitySource: undefined,
    };
  if (command.kind === "REDEVELOP") {
    const next = replacePublicGraphTileV7(graph, command.at, {
      improvement: null,
      resource:
        tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
          ? tile.resource
          : publicRestoredResourceV7(view, tile.terrain, tile.improvement),
    });
    if (tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD")
      return next;
    const activePortKeys = new Set(graph.activePortKeys);
    activePortKeys.delete(coordKeyV7(command.at));
    return { ...next, activePortKeys, connectivitySource: undefined };
  }
  return null;
}

/**
 * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 5.4): the
 * population of an active dock of the graph's owner (the viewer), with its
 * own Harbours capability; the shared `dockPopulationV7`.
 */
function publicDockPopulationV7(
  graph: PublicEconomyGraphV7,
  improvement: "PORT" | "SHIPYARD",
): number {
  return dockPopulationV7(
    improvement,
    technologyCapabilitiesV7(graph.researchedTechs, graph.faction)
      .harbourPopulation,
  );
}

function liveTotalForCityV7(
  graph: PublicEconomyGraphV7,
  cityId: CityId,
): number {
  const improvementPopulation = graph.board.tiles
    .filter(
      (tile) => tile.territoryCityId === cityId && tile.improvement !== null,
    )
    .reduce((total, tile) => {
      const improvement = tile.improvement;
      if (improvement === null) return total;
      const value =
        total +
        (improvement === "PORT" || improvement === "SHIPYARD"
          ? graph.activePortKeys.has(coordKeyV7(tile.at))
            ? publicDockPopulationV7(graph, improvement)
            : 0
          : spatialContributionAtV7(graph, tile.at, improvement).population);
      if (!Number.isSafeInteger(value))
        throw new RangeError("INTEGER_OVERFLOW");
      return value;
    }, 0);
  const connectivity = publicGraphNavalConnectivityV7(graph);
  const connectedOtherCities = [...connectivity.network].filter(
    (candidate) => candidate !== graph.originalCapitalCityId,
  );
  const roadPopulation =
    cityId === graph.originalCapitalCityId
      ? connectedOtherCities.length
      : Number(connectedOtherCities.includes(cityId));
  const total = improvementPopulation + roadPopulation;
  if (!Number.isSafeInteger(total)) throw new RangeError("INTEGER_OVERFLOW");
  return total;
}

function marketForCityV7(graph: PublicEconomyGraphV7, cityId: CityId): number {
  return graph.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === cityId && tile.improvement === "MARKET",
    )
    .reduce((total, tile) => {
      const evaluation = spatialContributionAtV7(graph, tile.at, "MARKET");
      const value = total + marketCoinsV7(evaluation.marketIncome);
      if (!Number.isSafeInteger(value))
        throw new RangeError("INTEGER_OVERFLOW");
      return value;
    }, 0);
}

function publicGraphNavalConnectivityV7(graph: PublicEconomyGraphV7): {
  readonly network: ReadonlySet<CityId>;
  readonly landTrade: ReadonlySet<CityId>;
  readonly seaTrade: ReadonlySet<CityId>;
  readonly roadKeys: ReadonlySet<string>;
} {
  const cached = PUBLIC_GRAPH_NAVAL_CONNECTIVITY.get(graph);
  if (cached !== undefined) return cached;
  if (graph.connectivitySource !== undefined) {
    const inherited = publicGraphNavalConnectivityV7(graph.connectivitySource);
    PUBLIC_GRAPH_NAVAL_CONNECTIVITY.set(graph, inherited);
    return inherited;
  }
  const ownedCities = graph.cities.filter(
    (city) => city.ownerId === graph.ownerId,
  );
  const ownedIds = new Set(ownedCities.map((city) => city.id));
  const legalWater = new Set(
    graph.board.tiles
      .filter(
        (tile) =>
          tile.explored &&
          tile.terrain !== null &&
          (tile.terrain === "SHALLOW_WATER" ||
            (tile.terrain === "DEEP_WATER" &&
              graph.researchedTechs.includes("NAVIGATION"))),
      )
      .map((tile) => coordKeyV7(tile.at)),
  );
  const ports = graph.researchedTechs.includes("NAVIGATION")
    ? graph.board.tiles.filter(
        (tile) =>
          (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
          tile.territoryCityId !== null &&
          ownedIds.has(tile.territoryCityId) &&
          graph.activePortKeys.has(coordKeyV7(tile.at)) &&
          legalWater.has(coordKeyV7(tile.at)),
      )
    : [];
  const seaEdges = new Map<CityId, Set<CityId>>();
  const edges = new Map<CityId, Set<CityId>>();
  const connect = (
    target: Map<CityId, Set<CityId>>,
    left: CityId,
    right: CityId,
  ) => {
    const values = target.get(left) ?? new Set<CityId>();
    values.add(right);
    target.set(left, values);
  };
  const portsByCoordinate = new Map(
    ports.map((port) => [coordKeyV7(port.at), port] as const),
  );
  for (const from of ports) {
    const fromCityId = from.territoryCityId;
    if (fromCityId === null) continue;
    const queue = [from.at];
    const distance = new Map<string, number>([[coordKeyV7(from.at), 0]]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) break;
      const currentDistance = distance.get(coordKeyV7(current));
      if (currentDistance === undefined) continue;
      const destination = portsByCoordinate.get(coordKeyV7(current));
      const destinationCityId = destination?.territoryCityId ?? null;
      if (destinationCityId !== null && destinationCityId !== fromCityId) {
        connect(seaEdges, fromCityId, destinationCityId);
      }
      if (currentDistance >= 5) continue;
      for (const near of publicGraphNeighborCoordsV7(graph, current)) {
        const nearKey = coordKeyV7(near);
        if (legalWater.has(nearKey) && !distance.has(nearKey)) {
          distance.set(nearKey, currentDistance + 1);
          queue.push(near);
        }
      }
    }
  }
  const cityAt = new Map(
    ownedCities.map((city) => [coordKeyV7(city.at), city.id] as const),
  );
  // A Road is usable on a neutral or own-territory tile (section 9.1). The
  // view hides the city ID of territory whose city center is still unexplored
  // but always shows its owner, so a tile is neutral only when both are null.
  const roads = new Set(
    graph.board.tiles
      .filter(
        (tile) =>
          tile.road &&
          graph.researchedTechs.includes("ROADS") &&
          (tile.territoryCityId === null
            ? tile.territoryOwnerId === null
            : ownedIds.has(tile.territoryCityId)),
      )
      .map((tile) => coordKeyV7(tile.at)),
  );
  if (graph.researchedTechs.includes("ROADS"))
    for (const at of cityAt.keys()) roads.add(at);
  const roadComponents: {
    readonly keys: ReadonlySet<string>;
    readonly cityIds: readonly CityId[];
  }[] = [];
  for (const component of publicGraphComponentsV7(graph, roads)) {
    const cityIds = [...component]
      .map((at) => cityAt.get(at))
      .filter((id): id is CityId => id !== undefined);
    for (const left of cityIds)
      for (const right of cityIds)
        if (left !== right) connect(edges, left, right);
    roadComponents.push({ keys: component, cityIds });
  }
  const originalCapital = ownedCities.find(
    (city) => city.id === graph.originalCapitalCityId,
  );
  const roots = originalCapital === undefined ? [] : [originalCapital.id];
  const network = new Set<CityId>(roots);
  const queue = [...roots];
  for (let index = 0; index < queue.length; index += 1) {
    const cityId = queue[index];
    if (cityId === undefined) break;
    for (const next of edges.get(cityId) ?? [])
      if (!network.has(next)) {
        network.add(next);
        queue.push(next);
      }
  }
  // Revision 17: land trade is a technology capability of the viewer's tree.
  const landTrade =
    technologyCapabilitiesV7(graph.researchedTechs, graph.faction)
      .landTradeIncomeCoins > 0
      ? // Tuning 3 (`pulp_wars-w49.3`): every own city of a Road component
        // that holds two or more of them, the first capital included.
        new Set(
          roadComponents.flatMap((component) =>
            new Set(component.cityIds).size >= 2 ? component.cityIds : [],
          ),
        )
      : new Set<CityId>();
  const seaTrade = new Set(
    ownedCities
      .map((city) => city.id)
      .filter(
        (cityId) =>
          !roots.includes(cityId) && (seaEdges.get(cityId)?.size ?? 0) > 0,
      ),
  );
  const roadKeys = new Set<string>();
  for (const component of roadComponents)
    if (component.cityIds.some((cityId) => network.has(cityId)))
      for (const at of component.keys) roadKeys.add(at);
  const result = { network, landTrade, seaTrade, roadKeys };
  PUBLIC_GRAPH_NAVAL_CONNECTIVITY.set(graph, result);
  return result;
}

function publicGraphNeighborCoordsV7(
  graph: PublicEconomyGraphV7,
  at: CoordV7,
): readonly CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1)
      if (
        (x !== at.x || y !== at.y) &&
        x >= 0 &&
        y >= 0 &&
        x < graph.board.width &&
        y < graph.board.height
      )
        result.push({ x, y });
  return result;
}

function publicGraphComponentsV7(
  graph: PublicEconomyGraphV7,
  available: ReadonlySet<string>,
): readonly ReadonlySet<string>[] {
  const left = new Set(available);
  const result: Set<string>[] = [];
  while (left.size > 0) {
    const first = left.values().next().value as string;
    const [y, x] = first.split(",").map(Number);
    if (x === undefined || y === undefined)
      throw new RangeError("INVALID_STATE");
    const queue = [{ x, y }];
    const component = new Set<string>();
    left.delete(first);
    for (let index = 0; index < queue.length; index += 1) {
      const at = queue[index];
      if (at === undefined) break;
      component.add(coordKeyV7(at));
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const near = { x: at.x + dx, y: at.y + dy };
          if (
            near.x >= 0 &&
            near.y >= 0 &&
            near.x < graph.board.width &&
            near.y < graph.board.height &&
            left.delete(coordKeyV7(near))
          )
            queue.push(near);
        }
    }
    result.push(component);
  }
  return result;
}

function resolvePublicCityGrowthV7(
  city: PlayerViewV7["cities"][number],
  permanentPopulation: number,
  economicPopulation: number,
) {
  // The Cultists (RULESET_7_CULTISTS.md section 5.3): what the city gave
  // up in Offerings (public) is gone from its population, as in
  // `resolveCityGrowthV7`.
  const total =
    permanentPopulation + economicPopulation - cityOfferedPopulationV7(city);
  if (
    !Number.isSafeInteger(permanentPopulation) ||
    permanentPopulation < 0 ||
    !Number.isSafeInteger(economicPopulation) ||
    economicPopulation < 0 ||
    !Number.isSafeInteger(total)
  )
    throw new RangeError("INTEGER_OVERFLOW");
  let level = city.level;
  const reachedLevels: number[] = [];
  while (total - growthSpentForPreview(level) >= level + 1) {
    level += 1;
    if (!Number.isSafeInteger(level)) throw new RangeError("INTEGER_OVERFLOW");
    reachedLevels.push(level);
  }
  const population = total - growthSpentForPreview(level);
  if (!Number.isSafeInteger(population))
    throw new RangeError("INTEGER_OVERFLOW");
  return {
    city: {
      ...city,
      level,
      permanentPopulation,
      economicPopulation,
      population,
    },
    reachedLevels,
  };
}

function publicCityIncomeV7(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
  market: number,
  tradeBonuses = Number(view.naval.landTradeCityIds.includes(city.id)) *
    LAND_TRADE_INCOME_COINS_V7 +
    Number(view.naval.seaTradeCityIds.includes(city.id)),
): number {
  if (publicCityBesieged(view, city.at)) return 0;
  const result = Math.max(
    1,
    cityLevelIncomeV7(city.level) +
      (city.isCapital ? 1 : 0) +
      // `pulp_wars-zypi`: the city's Economic Miracle rewards.
      cityEconomicMiracleIncomeV7(city) +
      tradeBonuses +
      market +
      Math.min(0, city.population),
  );
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}

function exactIncomeDeltaWithUnchangedMarketV7(
  view: PlayerViewV7,
  before: PlayerViewV7["cities"][number],
  after: PlayerViewV7["cities"][number],
): number | null {
  if (before.level === after.level && before.population === after.population)
    return 0;
  const knownMarket = exactVisibleMarketIncomeV7(view, before.id);
  if (knownMarket !== null)
    return (
      publicCityIncomeV7(view, after, knownMarket) -
      publicCityIncomeV7(view, before, knownMarket)
    );
  const possible = new Set<number>();
  for (let market = 0; market <= 8; market += 1)
    possible.add(
      publicCityIncomeV7(view, after, market) -
        publicCityIncomeV7(view, before, market),
    );
  const only = [...possible][0];
  return possible.size === 1 && only !== undefined ? only : null;
}

function exactVisibleMarketIncomeV7(
  view: PlayerViewV7,
  cityId: CityId,
): number | null {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return null;
  const market = view.improvementValues.find((value) => {
    if (value.improvement !== "MARKET" || value.measure !== "COIN_INCOME")
      return false;
    const tile = tileAtView(view, value.at);
    return tile?.explored === true && tile.territoryCityId === cityId;
  });
  if (market !== undefined) return market.level;
  if (publicPlanningGraphExact(view))
    return marketForCityV7(publicEconomyGraph(view), cityId);
  return publicCityDevelopmentFootprintKnown(view, city) ? 0 : null;
}

function publicRestoredResourceV7(
  view: PlayerViewV7,
  terrain: PublicEconomyGraphTileV7["terrain"],
  improvement: ImprovementIdV7 | null,
): EconomicPreviewV7["resourceRestored"] {
  const restored =
    improvement === "FARM"
      ? "FERTILE_GROUND"
      : improvement === "MINE"
        ? "ORE"
        : null;
  return projectedResourceAfterMutationV7(view, terrain, restored);
}

function projectedResourceAfterMutationV7(
  view: PlayerViewV7,
  terrain: PublicEconomyGraphTileV7["terrain"],
  resource: "FERTILE_GROUND" | "ORE" | null,
): EconomicPreviewV7["resourceRestored"] {
  if (terrain === null) return null;
  if (
    resource !== null &&
    !isResourceRevealedV7(resource, view.viewer.researchedTechs)
  )
    return null;
  if (terrain === "FOREST") return resource;
  return resource;
}

function economicOutputTransitionsV7(
  view: PlayerViewV7,
  before: PublicEconomyGraphV7,
  after: PublicEconomyGraphV7,
): readonly EconomicOutputTransitionV7[] {
  const outputAt = (graph: PublicEconomyGraphV7, at: CoordV7) => {
    const tile = graph.board.tiles.find((candidate) => same(candidate.at, at));
    if (
      tile?.improvement === null ||
      tile?.improvement === undefined ||
      tile.territoryOwnerId !== view.viewer.id
    )
      return null;
    const evaluation = spatialContributionAtV7(
      graph,
      tile.at,
      tile.improvement,
    );
    return {
      improvement: tile.improvement,
      measure:
        tile.improvement === "MARKET"
          ? ("COIN_INCOME" as const)
          : ("POPULATION" as const),
      value:
        tile.improvement === "MARKET"
          ? marketCoinsV7(evaluation.marketIncome)
          : evaluation.population,
    };
  };
  return before.board.tiles
    .map((tile) => {
      const prior = outputAt(before, tile.at);
      const next = outputAt(after, tile.at);
      if (
        prior?.improvement === next?.improvement &&
        prior?.measure === next?.measure &&
        prior?.value === next?.value
      )
        return null;
      const improvement = next?.improvement ?? prior?.improvement;
      const measure = next?.measure ?? prior?.measure;
      if (improvement === undefined || measure === undefined) return null;
      const beforeValue = prior?.value ?? 0;
      const afterValue = next?.value ?? 0;
      return {
        at: tile.at,
        improvement,
        measure,
        before: beforeValue,
        after: afterValue,
        change:
          prior === null
            ? ("CREATED" as const)
            : next === null
              ? ("REMOVED" as const)
              : beforeValue > 0 && afterValue === 0
                ? ("OUTAGE" as const)
                : beforeValue === 0 && afterValue > 0
                  ? ("RESUMED" as const)
                  : ("CHANGED" as const),
      };
    })
    .filter((value) => value !== null)
    .sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
}

const ECONOMIC_POTENTIAL_KINDS_V7 = [
  ...(Object.keys(BASIC_ECONOMIC_ACTIONS_V7) as BasicEconomicCommandKindV7[]),
  ...(Object.keys(
    SPATIAL_ECONOMIC_ACTIONS_V7,
  ) as SpatialEconomicCommandKindV7[]),
  "BUILD_MONUMENT",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
] as const;
type PublicEconomicPotentialKindV7 =
  (typeof ECONOMIC_POTENTIAL_KINDS_V7)[number];
interface PublicPlacementV7 {
  readonly cityId: CityId;
  readonly at: CoordV7;
  readonly kind: PublicEconomicPotentialKindV7;
}
export interface PublicEconomicPotentialV7 {
  readonly command: PublicEconomicPotentialKindV7;
  readonly targets: number;
  readonly bestSpatialScore: number;
}

export interface PublicSpatialPlanScoreV7 {
  readonly command: CommandV7;
  readonly score: number;
}
export interface PublicPlanningWorkResultV7 {
  readonly potentials: readonly PublicEconomicPotentialV7[];
  readonly scores: readonly PublicSpatialPlanScoreV7[];
}
export interface PublicPlanningWorkProgressV7 {
  readonly done: boolean;
  readonly operations: number;
  readonly result: PublicPlanningWorkResultV7 | null;
}
export interface PublicPlanningWorkV7 {
  advance(maxOperations: number): PublicPlanningWorkProgressV7;
}

/** Known legal public placement potential with only Coin/technology gates removed. */
export function queryPublicEconomicPotentialsV7(
  view: PlayerViewV7,
): readonly PublicEconomicPotentialV7[] {
  const cached = PUBLIC_ECONOMIC_POTENTIALS.get(view);
  if (cached !== undefined) return cached;
  const graph = publicEconomyGraph(view);
  const placements = publicPlanningGraphExact(view)
    ? enumeratePublicPlacementsIgnoringGatesV7(view, graph)
    : [];
  const result = ECONOMIC_POTENTIAL_KINDS_V7.map((command) => {
    const matching = placements.filter(
      (placement) => placement.kind === command,
    );
    return {
      command,
      targets: matching.length,
      bestSpatialScore: matching.reduce(
        (best, placement) =>
          Math.max(best, scorePublicPlacementV7(view, graph, placement)),
        0,
      ),
    };
  });
  PUBLIC_ECONOMIC_POTENTIALS.set(view, result);
  return result;
}

/**
 * Incremental form of public economic-potential preparation and spatial
 * scoring. Each operation evaluates at most one board tile or one placement;
 * callers choose the integer operation budget and wall time never affects the
 * result.
 */
export function createPublicPlanningWorkV7(
  view: PlayerViewV7,
  candidates: readonly CommandV7[],
): PublicPlanningWorkV7 {
  return new IncrementalPublicPlanningWorkV7(view, candidates);
}

/** Deterministic one-step per-city public spatial reservation score. */
export function scorePublicSpatialPlanV7(
  view: PlayerViewV7,
  candidate: CommandV7,
): number {
  let cachedForView = PUBLIC_SPATIAL_SCORES.get(view);
  if (cachedForView === undefined) {
    cachedForView = new Map();
    PUBLIC_SPATIAL_SCORES.set(view, cachedForView);
  }
  const cacheKey = JSON.stringify(candidate);
  const cached = cachedForView.get(cacheKey);
  if (cached !== undefined) return cached;
  if (!publicPlanningGraphExact(view)) {
    cachedForView.set(cacheKey, 0);
    return 0;
  }
  const before = publicEconomyGraph(view);
  const after = graphAfterPublicCandidateV7(view, before, candidate);
  const result =
    after === null
      ? 0
      : bestPublicNextPlacementTotalV7(view, after) -
        publicSpatialBaselineV7(view, before);
  cachedForView.set(cacheKey, result);
  return result;
}

/** Whether the public one-step spatial plan replaces an improvement with a different result. */
export function queryPublicRedevelopmentChangesImprovementV7(
  view: PlayerViewV7,
  candidate: { readonly kind: "REDEVELOP"; readonly at: CoordV7 },
): boolean {
  const key = JSON.stringify(candidate);
  const cached = PUBLIC_REDEVELOPMENT_CHANGES.get(view)?.get(key);
  if (cached !== undefined) return cached;
  if (!publicPlanningGraphExact(view)) return false;
  const before = publicEconomyGraph(view);
  const after = graphAfterPublicCandidateV7(view, before, candidate);
  if (after === null) return false;
  const replacement = enumeratePublicPlacementsIgnoringGatesV7(view, after)
    .filter(
      (placement) =>
        same(placement.at, candidate.at) &&
        publicPlacementImprovementV7(placement) !== null,
    )
    .map((placement) => ({
      placement,
      score: scorePublicPlacementV7(view, after, placement),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        comparePublicPlacementV7(left.placement, right.placement),
    )[0];
  return redevelopmentChangesImprovementV7(
    view,
    before,
    after,
    candidate,
    replacement?.score !== undefined && replacement.score > 0
      ? replacement.placement
      : undefined,
  );
}

/** The public one-step plan's best improvement placement at one target. */
export interface PublicPlannedImprovementV7 {
  /** The command that would build it (Coin and technology gates ignored). */
  readonly kind: CommandV7["kind"];
  readonly improvement: ImprovementIdV7;
  readonly score: number;
}

/**
 * pulp_wars-9s0.9: the improvement the public one-step plan would place at
 * `at`, under the same gate-ignoring placement enumeration and score as
 * `scorePublicSpatialPlanV7`. `CURRENT` reads the board as it is (an empty
 * target); `AFTER_REDEVELOP` first removes the target's improvement, exactly
 * as a Redevelop candidate is planned. Null when the plan is not exact or no
 * improvement placement there scores above zero. Roads and terrain changes
 * are not improvements and are never returned.
 */
export function queryPublicPlannedImprovementV7(
  view: PlayerViewV7,
  at: CoordV7,
  mode: "CURRENT" | "AFTER_REDEVELOP",
): PublicPlannedImprovementV7 | null {
  let cachedForView = PUBLIC_PLANNED_IMPROVEMENTS.get(view);
  if (cachedForView === undefined) {
    cachedForView = new Map();
    PUBLIC_PLANNED_IMPROVEMENTS.set(view, cachedForView);
  }
  const key = `${mode}:${coordKeyV7(at)}`;
  const cached = cachedForView.get(key);
  if (cached !== undefined) return cached;
  const result = plannedImprovementAtV7(view, at, mode);
  cachedForView.set(key, result);
  return result;
}

function plannedImprovementAtV7(
  view: PlayerViewV7,
  at: CoordV7,
  mode: "CURRENT" | "AFTER_REDEVELOP",
): PublicPlannedImprovementV7 | null {
  if (!publicPlanningGraphExact(view)) return null;
  const before = publicEconomyGraph(view);
  const graph =
    mode === "AFTER_REDEVELOP"
      ? graphAfterPublicCandidateV7(view, before, { kind: "REDEVELOP", at })
      : before;
  if (graph === null) return null;
  const tile = graph.board.tiles.find((candidate) => same(candidate.at, at));
  if (tile === undefined) return null;
  const enumeration = createPublicPlacementEnumerationV7(view, graph);
  appendPublicPlacementsForTileV7(enumeration, tile);
  const best = enumeration.placements
    .filter(
      (placement) =>
        same(placement.at, at) &&
        publicPlacementImprovementV7(placement) !== null,
    )
    .map((placement) => ({
      placement,
      score: scorePublicPlacementV7(view, graph, placement),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        comparePublicPlacementV7(left.placement, right.placement),
    )[0];
  if (best === undefined || best.score <= 0) return null;
  const improvement = publicPlacementImprovementV7(best.placement);
  if (improvement === null) return null;
  return { kind: best.placement.kind, improvement, score: best.score };
}

export interface PublicRedevelopmentChangePossibilityV7 {
  readonly candidate: {
    readonly kind: "REDEVELOP";
    readonly at: CoordV7;
  };
  /**
   * False is a proof that the existing exact redevelopment query is false.
   * True is conservative and means the exact planner must decide.
   */
  readonly mayChangeImprovement: boolean;
}

export interface PublicRedevelopmentPossibilityWorkProgressV7 {
  readonly done: boolean;
  readonly operations: number;
  readonly result: readonly PublicRedevelopmentChangePossibilityV7[] | null;
}

export interface PublicRedevelopmentPossibilityWorkV7 {
  /** Exact maximum number of bounded work units this instance can consume. */
  readonly operationCeiling: number;
  advance(maxOperations: number): PublicRedevelopmentPossibilityWorkProgressV7;
}

/**
 * Creates a public-only, resumable necessary-condition filter for Redevelop.
 * One operation consumes at most one public record or one candidate; candidate
 * evaluation checks a fixed number of placement kinds and adjacent cells.
 */
export function createPublicRedevelopmentPossibilityWorkV7(
  view: PlayerViewV7,
  candidates: readonly {
    readonly kind: "REDEVELOP";
    readonly at: CoordV7;
  }[],
): PublicRedevelopmentPossibilityWorkV7 {
  return new IncrementalPublicRedevelopmentPossibilityWorkV7(view, candidates);
}

class IncrementalPublicRedevelopmentPossibilityWorkV7 implements PublicRedevelopmentPossibilityWorkV7 {
  readonly operationCeiling: number;
  private phase:
    | "TILES"
    | "UNITS"
    | "CHOICES"
    | "TREASURES"
    | "ENTITLEMENTS"
    | "LEADERBOARD"
    | "CITIES"
    | "CANDIDATES"
    | "DONE" = "TILES";
  private index = 0;
  private graph: PublicEconomyGraphV7 | null = null;
  private readonly graphTiles: PublicEconomyGraphTileV7[] = [];
  private readonly unexploredKeys = new Set<string>();
  private readonly hostileUnitKeys = new Set<string>();
  private readonly pendingCityIds = new Set<CityId>();
  private readonly treasureKeys = new Set<string>();
  private readonly cityImprovementKeys = new Set<string>();
  private readonly developmentAllowedCityIds = new Set<CityId>();
  private readonly cityById = new Map<
    CityId,
    PublicEconomyGraphV7["cities"][number]
  >();
  private remainingMonumentEntitlements = 0;
  private publicOwnedCityCount: number | null = null;
  private ownedCityCount = 0;
  private footprintExact = true;
  private readonly values: PublicRedevelopmentChangePossibilityV7[] = [];
  private completed: readonly PublicRedevelopmentChangePossibilityV7[] | null =
    null;

  constructor(
    private readonly view: PlayerViewV7,
    private readonly candidates: readonly {
      readonly kind: "REDEVELOP";
      readonly at: CoordV7;
    }[],
  ) {
    this.operationCeiling =
      view.board.tiles.length +
      view.units.length +
      view.pendingChoices.length +
      view.treasureChests.length +
      view.viewer.achievementEntitlements.length +
      view.leaderboard.length +
      view.cities.length +
      candidates.length;
  }

  advance(maxOperations: number): PublicRedevelopmentPossibilityWorkProgressV7 {
    if (!Number.isSafeInteger(maxOperations) || maxOperations <= 0)
      throw new RangeError("maxOperations must be a positive safe integer");
    let operations = 0;
    while (operations < maxOperations && this.phase !== "DONE") {
      if (this.advanceOne()) operations += 1;
    }
    return {
      done: this.phase === "DONE",
      operations,
      result: this.completed,
    };
  }

  private advanceOne(): boolean {
    if (this.phase === "TILES") {
      const tile = this.view.board.tiles[this.index];
      if (tile === undefined) {
        this.phase = "UNITS";
        this.index = 0;
        return false;
      }
      const graphTile: PublicEconomyGraphTileV7 = tile.explored
        ? {
            at: tile.at,
            explored: true,
            terrain: tile.terrain,
            resource: tile.resource,
            improvement: tile.improvement,
            road: tile.road,
            site: tile.site,
            territoryCityId: tile.territoryCityId,
            territoryOwnerId: tile.territoryOwnerId,
          }
        : {
            at: tile.at,
            explored: false,
            terrain: null,
            resource: null,
            improvement: null,
            road: false,
            site: null,
            territoryCityId: null,
            territoryOwnerId: null,
          };
      this.graphTiles.push(graphTile);
      if (!tile.explored) this.unexploredKeys.add(coordKeyV7(tile.at));
      if (graphTile.territoryCityId !== null && graphTile.improvement !== null)
        this.cityImprovementKeys.add(
          `${graphTile.territoryCityId}:${graphTile.improvement}`,
        );
      this.index += 1;
      return true;
    }
    if (this.phase === "UNITS") {
      const unit = this.view.units[this.index];
      if (unit === undefined) {
        this.phase = "CHOICES";
        this.index = 0;
        return false;
      }
      if (
        unit.hp > 0 &&
        publicHostile(this.view, this.view.viewer.id, unit.ownerId)
      )
        this.hostileUnitKeys.add(coordKeyV7(unit.at));
      this.index += 1;
      return true;
    }
    if (this.phase === "CHOICES") {
      const choice = this.view.pendingChoices[this.index];
      if (choice === undefined) {
        this.phase = "TREASURES";
        this.index = 0;
        return false;
      }
      this.pendingCityIds.add(choice.cityId);
      this.index += 1;
      return true;
    }
    if (this.phase === "TREASURES") {
      const treasure = this.view.treasureChests[this.index];
      if (treasure === undefined) {
        this.phase = "ENTITLEMENTS";
        this.index = 0;
        return false;
      }
      this.treasureKeys.add(coordKeyV7(treasure));
      this.index += 1;
      return true;
    }
    if (this.phase === "ENTITLEMENTS") {
      const entitlement = this.view.viewer.achievementEntitlements[this.index];
      if (entitlement === undefined) {
        this.phase = "LEADERBOARD";
        this.index = 0;
        return false;
      }
      if (entitlement.unlocked && !entitlement.spent)
        this.remainingMonumentEntitlements += 1;
      this.index += 1;
      return true;
    }
    if (this.phase === "LEADERBOARD") {
      const entry = this.view.leaderboard[this.index];
      if (entry === undefined) {
        this.phase = "CITIES";
        this.index = 0;
        return false;
      }
      if (entry.isViewer) this.publicOwnedCityCount = entry.cityCount;
      this.index += 1;
      return true;
    }
    if (this.phase === "CITIES") {
      const city = this.view.cities[this.index];
      if (city === undefined) {
        this.graph = {
          board: {
            width: this.view.board.width,
            height: this.view.board.height,
            tiles: this.graphTiles,
          },
          cities: this.view.cities,
          ownerId: this.view.viewer.id,
          originalCapitalCityId: this.view.viewer.originalCapitalCityId,
          researchedTechs: this.view.viewer.researchedTechs,
          faction: this.view.viewer.faction,
          activePortKeys: new Set(),
          resolvedPendingCityIds: new Set(),
          remainingMonumentEntitlements: this.remainingMonumentEntitlements,
        };
        this.phase = "CANDIDATES";
        this.index = 0;
        return false;
      }
      this.cityById.set(city.id, city);
      if (city.ownerId === this.view.viewer.id) {
        this.ownedCityCount += 1;
        const radius = city.expanded || city.landGrantUsed ? 2 : 1;
        for (let y = city.at.y - radius; y <= city.at.y + radius; y += 1)
          for (let x = city.at.x - radius; x <= city.at.x + radius; x += 1)
            if (
              x >= 0 &&
              y >= 0 &&
              x < this.view.board.width &&
              y < this.view.board.height &&
              this.unexploredKeys.has(coordKeyV7({ x, y }))
            )
              this.footprintExact = false;
        if (
          !this.hostileUnitKeys.has(coordKeyV7(city.at)) &&
          !this.pendingCityIds.has(city.id)
        )
          this.developmentAllowedCityIds.add(city.id);
      }
      this.index += 1;
      return true;
    }
    if (this.phase === "CANDIDATES") {
      const candidate = this.candidates[this.index];
      if (candidate === undefined) {
        this.completed = this.values;
        this.phase = "DONE";
        return false;
      }
      this.values.push({
        candidate,
        mayChangeImprovement: this.mayChangeImprovement(candidate),
      });
      this.index += 1;
      return true;
    }
    return false;
  }

  private mayChangeImprovement(candidate: {
    readonly kind: "REDEVELOP";
    readonly at: CoordV7;
  }): boolean {
    const graph = this.graph;
    if (
      graph === null ||
      !this.footprintExact ||
      this.publicOwnedCityCount !== this.ownedCityCount
    )
      return true;
    const index = candidate.at.y * graph.board.width + candidate.at.x;
    const tile = graph.board.tiles[index];
    if (
      tile === undefined ||
      !same(tile.at, candidate.at) ||
      !tile.explored ||
      (tile.improvement !== "FARM" &&
        tile.improvement !== "LUMBER_CAMP" &&
        tile.improvement !== "MINE")
    )
      return true;
    const current = tile.improvement;
    const afterTile: PublicEconomyGraphTileV7 = {
      ...tile,
      improvement: null,
      resource: publicRestoredResourceV7(
        this.view,
        tile.terrain,
        tile.improvement,
      ),
    };
    const enumeration: PublicPlacementEnumerationV7 = {
      view: this.view,
      graph,
      placements: [],
      placementsByCity: new Map(),
      entitlementsAvailable: this.remainingMonumentEntitlements > 0,
      treasureKeys: this.treasureKeys,
      cityImprovementKeys: this.cityImprovementKeys,
      developmentAllowedCityIds: this.developmentAllowedCityIds,
      cityById: this.cityById,
    };
    appendPublicPlacementsForTileV7(enumeration, afterTile);
    const replacements = enumeration.placements
      .map(publicPlacementImprovementV7)
      .filter((improvement) => improvement !== null);
    // A valid same-basic rebuild has a strictly positive exact placement
    // score: Farm/Mine restore two fixed population and Camp restores one,
    // while every affected adjacent processor or Market term is monotone and
    // the score has no cost term. If no same rebuild exists, the exact query's
    // undefined-replacement edge returns true, so this proof must also do so.
    // Placement adjacency excludes its center, making the original graph's
    // neighbors equivalent to the graph after removing this target.
    return (
      !replacements.includes(current) ||
      replacements.some((improvement) => improvement !== current)
    );
  }
}

function publicPlanningGraphExact(view: PlayerViewV7): boolean {
  const ownedCities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  );
  return (
    view.leaderboard.find((entry) => entry.isViewer)?.cityCount ===
      ownedCities.length &&
    ownedCities.every((city) => publicCityDevelopmentFootprintKnown(view, city))
  );
}

function publicSpatialBaselineV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): number {
  const cached = PUBLIC_SPATIAL_BASELINES.get(view);
  if (cached !== undefined) return cached;
  const score = bestPublicNextPlacementTotalV7(view, graph);
  PUBLIC_SPATIAL_BASELINES.set(view, score);
  return score;
}

function graphAfterPublicCandidateV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  candidate: CommandV7,
): PublicEconomyGraphV7 | null {
  if (candidate.kind === "CHOOSE_CITY_REWARD") {
    const city = view.cities.find(
      (value) =>
        value.id === candidate.cityId && value.ownerId === view.viewer.id,
    );
    if (city === undefined) return null;
    const resolvedPendingCityIds = new Set(graph.resolvedPendingCityIds);
    resolvedPendingCityIds.add(city.id);
    return { ...graph, resolvedPendingCityIds };
  }
  if (candidate.kind === "BUILD_MONUMENT") {
    const tile = graph.board.tiles.find((value) =>
      same(value.at, candidate.at),
    );
    if (
      tile?.explored !== true ||
      (tile.terrain === "MOUNTAIN" &&
        !view.viewer.researchedTechs.includes("ENGINEERING"))
    )
      return null;
    return {
      ...replacePublicGraphTileV7(graph, candidate.at, {
        improvement: "MONUMENT",
      }),
      remainingMonumentEntitlements: Math.max(
        0,
        graph.remainingMonumentEntitlements - 1,
      ),
    };
  }
  if (!("at" in candidate)) return null;
  return graphAfterTileCommandV7(view, graph, candidate);
}

function bestPublicNextPlacementTotalV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): number {
  const placements = enumeratePublicPlacementsIgnoringGatesV7(view, graph);
  const reservedTargets = new Set<string>();
  let remainingMonumentEntitlements = graph.remainingMonumentEntitlements;
  let total = 0;
  for (const city of graph.cities
    .filter((value) => value.ownerId === view.viewer.id)
    .sort((left, right) => left.id - right.id)) {
    const best = placements
      .filter(
        (placement) =>
          placement.cityId === city.id &&
          (placement.kind !== "BUILD_MONUMENT" ||
            remainingMonumentEntitlements > 0) &&
          !reservedTargets.has(coordKeyV7(placement.at)),
      )
      .map((placement) => ({
        placement,
        score: scorePublicPlacementV7(view, graph, placement),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          potentialKindOrdinalV7(left.placement.kind) -
            potentialKindOrdinalV7(right.placement.kind) ||
          left.placement.at.y - right.placement.at.y ||
          left.placement.at.x - right.placement.at.x,
      )[0];
    if (best !== undefined && best.score > 0) {
      total += best.score;
      if (!Number.isSafeInteger(total))
        throw new RangeError("INTEGER_OVERFLOW");
      reservedTargets.add(coordKeyV7(best.placement.at));
      if (best.placement.kind === "BUILD_MONUMENT")
        remainingMonumentEntitlements -= 1;
    }
  }
  return total;
}

function redevelopmentChangesImprovementV7(
  view: PlayerViewV7,
  before: PublicEconomyGraphV7,
  after: PublicEconomyGraphV7,
  candidate: { readonly kind: "REDEVELOP"; readonly at: CoordV7 },
  replacement: PublicPlacementV7 | undefined,
): boolean {
  const current = before.board.tiles.find((tile) =>
    same(tile.at, candidate.at),
  )?.improvement;
  if (current === undefined || current === null) return false;
  if (replacement === undefined) return true;
  const replaced = graphAfterPublicCandidateV7(view, after, {
    kind: replacement.kind,
    at: replacement.at,
  } as CommandV7);
  const next = replaced?.board.tiles.find((tile) =>
    same(tile.at, candidate.at),
  )?.improvement;
  return next !== current;
}

function publicPlacementImprovementV7(
  placement: PublicPlacementV7,
): ImprovementIdV7 | null {
  if (placement.kind === "BUILD_MONUMENT") return "MONUMENT";
  return (
    BASIC_ECONOMIC_ACTIONS_V7[placement.kind as BasicEconomicCommandKindV7]
      ?.improvement ??
    SPATIAL_ECONOMIC_ACTIONS_V7[placement.kind as SpatialEconomicCommandKindV7]
      ?.improvement ??
    null
  );
}

function enumeratePublicPlacementsIgnoringGatesV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): readonly PublicPlacementV7[] {
  const enumeration = createPublicPlacementEnumerationV7(view, graph);
  for (const tile of graph.board.tiles) {
    appendPublicPlacementsForTileV7(enumeration, tile);
  }
  return enumeration.placements;
}

interface PublicPlacementEnumerationV7 {
  readonly view: PlayerViewV7;
  readonly graph: PublicEconomyGraphV7;
  readonly placements: PublicPlacementV7[];
  readonly placementsByCity: Map<CityId, PublicPlacementV7[]>;
  readonly entitlementsAvailable: boolean;
  readonly treasureKeys: ReadonlySet<string>;
  readonly cityImprovementKeys: ReadonlySet<string>;
  readonly developmentAllowedCityIds?: ReadonlySet<CityId>;
  readonly cityById: ReadonlyMap<
    CityId,
    PublicEconomyGraphV7["cities"][number]
  >;
}

function createPublicPlacementEnumerationV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): PublicPlacementEnumerationV7 {
  return {
    view,
    graph,
    placements: [],
    placementsByCity: new Map(),
    entitlementsAvailable: graph.remainingMonumentEntitlements > 0,
    treasureKeys: new Set(view.treasureChests.map(coordKeyV7)),
    cityImprovementKeys: new Set(
      graph.board.tiles.flatMap((tile) =>
        tile.territoryCityId === null || tile.improvement === null
          ? []
          : [`${tile.territoryCityId}:${tile.improvement}`],
      ),
    ),
    cityById: new Map(graph.cities.map((city) => [city.id, city] as const)),
  };
}

function appendPublicPlacementsForTileV7(
  enumeration: PublicPlacementEnumerationV7,
  tile: PublicEconomyGraphTileV7,
): void {
  const {
    view,
    graph,
    placements,
    entitlementsAvailable,
    treasureKeys,
    cityImprovementKeys,
    developmentAllowedCityIds,
  } = enumeration;
  const beforeLength = placements.length;
  // The Rift (RULESET_7_RIFT.md section 3): nothing is built on a Rift.
  if (tile.terrain === "RIFT") return;
  if (
    tile.explored &&
    tile.territoryOwnerId === null &&
    tile.territoryCityId === null &&
    tile.terrain !== null &&
    tile.site === null &&
    !tile.road
  ) {
    const capitalId = view.viewer.originalCapitalCityId;
    const placement = {
      cityId: capitalId,
      at: tile.at,
      kind: "BUILD_ROAD",
    } as const;
    placements.push(placement);
    let capitalPlacements = enumeration.placementsByCity.get(capitalId);
    if (capitalPlacements === undefined) {
      capitalPlacements = [];
      enumeration.placementsByCity.set(capitalId, capitalPlacements);
    }
    capitalPlacements.push(placement);
    return;
  }
  if (
    !tile.explored ||
    tile.territoryOwnerId !== view.viewer.id ||
    tile.territoryCityId === null ||
    !(
      developmentAllowedCityIds?.has(tile.territoryCityId) ??
      publicCityAllowsDevelopmentV7(view, graph, tile.territoryCityId)
    )
  )
    return;
  {
    for (const kind of Object.keys(
      BASIC_ECONOMIC_ACTIONS_V7,
    ) as BasicEconomicCommandKindV7[]) {
      const rule = BASIC_ECONOMIC_ACTIONS_V7[kind];
      if (
        tile.site === null &&
        tile.terrain === rule.terrain &&
        tile.resource === rule.resource &&
        tile.improvement === null &&
        !treasureKeys.has(coordKeyV7(tile.at))
      )
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
    }
    for (const kind of Object.keys(
      SPATIAL_ECONOMIC_ACTIONS_V7,
    ) as SpatialEconomicCommandKindV7[]) {
      const rule = SPATIAL_ECONOMIC_ACTIONS_V7[kind];
      if (
        (tile.terrain === "MOUNTAIN" &&
          !view.viewer.researchedTechs.includes("ENGINEERING")) ||
        tile.site !== null ||
        tile.resource !== null ||
        tile.improvement !== null ||
        treasureKeys.has(coordKeyV7(tile.at)) ||
        cityImprovementKeys.has(`${tile.territoryCityId}:${rule.improvement}`)
      )
        continue;
      if (
        spatialPlacementCountV7(
          graph,
          tile.at,
          rule.improvement,
          enumeration.cityById,
        ) >= rule.placementMinimum
      )
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
    }
    if (
      entitlementsAvailable &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("ENGINEERING")) &&
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      !treasureKeys.has(coordKeyV7(tile.at)) &&
      !cityImprovementKeys.has(`${tile.territoryCityId}:MONUMENT`)
    )
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "BUILD_MONUMENT",
      });
    if (
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      tile.terrain === "FOREST"
    )
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "CLEAR_FOREST",
      });
    if (
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      tile.terrain === "GRASS"
    )
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "REPLANT_FOREST",
      });
    if (tile.site === null && !tile.road)
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "BUILD_ROAD",
      });
    if (tile.improvement !== null)
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "REDEVELOP",
      });
  }
  if (placements.length > beforeLength) {
    let cityPlacements = enumeration.placementsByCity.get(tile.territoryCityId);
    if (cityPlacements === undefined) {
      cityPlacements = [];
      enumeration.placementsByCity.set(tile.territoryCityId, cityPlacements);
    }
    cityPlacements.push(...placements.slice(beforeLength));
  }
}

interface IncrementalBestSelectionV7 {
  readonly graph: PublicEconomyGraphV7;
  readonly placementsByCity: ReadonlyMap<CityId, readonly PublicPlacementV7[]>;
  readonly knownScores: ReadonlyMap<PublicPlacementV7, number> | null;
  readonly cities: readonly PublicEconomyGraphV7["cities"][number][];
  readonly reservedTargets: Set<string>;
  readonly bestByTarget: Map<
    string,
    { readonly placement: PublicPlacementV7; readonly score: number }
  >;
  cityIndex: number;
  placementIndex: number;
  remainingMonumentEntitlements: number;
  total: number;
  best: {
    readonly placement: PublicPlacementV7;
    readonly score: number;
  } | null;
}

function createIncrementalBestSelectionV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  placementsByCity: ReadonlyMap<CityId, readonly PublicPlacementV7[]>,
  knownScores: ReadonlyMap<PublicPlacementV7, number> | null = null,
): IncrementalBestSelectionV7 {
  return {
    graph,
    placementsByCity,
    knownScores,
    cities: graph.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .sort((left, right) => left.id - right.id),
    reservedTargets: new Set(),
    bestByTarget: new Map(),
    cityIndex: 0,
    placementIndex: 0,
    remainingMonumentEntitlements: graph.remainingMonumentEntitlements,
    total: 0,
    best: null,
  };
}

function advanceIncrementalBestSelectionV7(
  view: PlayerViewV7,
  selection: IncrementalBestSelectionV7,
): boolean {
  while (selection.cityIndex < selection.cities.length) {
    const city = selection.cities[selection.cityIndex];
    if (city === undefined) break;
    const placements = selection.placementsByCity.get(city.id) ?? [];
    const placement = placements[selection.placementIndex];
    if (placement !== undefined) {
      selection.placementIndex += 1;
      const score =
        selection.knownScores?.get(placement) ??
        scorePublicPlacementV7(view, selection.graph, placement);
      if (publicPlacementImprovementV7(placement) !== null) {
        const targetKey = coordKeyV7(placement.at);
        const targetBest = selection.bestByTarget.get(targetKey);
        if (
          targetBest === undefined ||
          score > targetBest.score ||
          (score === targetBest.score &&
            comparePublicPlacementV7(placement, targetBest.placement) < 0)
        )
          selection.bestByTarget.set(targetKey, { placement, score });
      }
      if (
        (placement.kind === "BUILD_MONUMENT" &&
          selection.remainingMonumentEntitlements <= 0) ||
        selection.reservedTargets.has(coordKeyV7(placement.at))
      )
        return true;
      if (
        selection.best === null ||
        score > selection.best.score ||
        (score === selection.best.score &&
          comparePublicPlacementV7(placement, selection.best.placement) < 0)
      )
        selection.best = { placement, score };
      return true;
    }
    if (selection.best !== null && selection.best.score > 0) {
      selection.total += selection.best.score;
      if (!Number.isSafeInteger(selection.total))
        throw new RangeError("INTEGER_OVERFLOW");
      selection.reservedTargets.add(coordKeyV7(selection.best.placement.at));
      if (selection.best.placement.kind === "BUILD_MONUMENT")
        selection.remainingMonumentEntitlements -= 1;
    }
    selection.cityIndex += 1;
    selection.placementIndex = 0;
    selection.best = null;
  }
  return false;
}

function comparePublicPlacementV7(
  left: PublicPlacementV7,
  right: PublicPlacementV7,
): number {
  return (
    potentialKindOrdinalV7(left.kind) - potentialKindOrdinalV7(right.kind) ||
    left.at.y - right.at.y ||
    left.at.x - right.at.x
  );
}

class IncrementalPublicPlanningWorkV7 implements PublicPlanningWorkV7 {
  private readonly graph: PublicEconomyGraphV7;
  private readonly factKeyWork: Generator<void, string>;
  private factKey: string | null = null;
  private reuseEntry: PublicPlanningReuseEntryV7 | null = null;
  private readonly candidates: readonly CommandV7[];
  private readonly exact: boolean;
  private phase:
    | "REUSE_FACT_SCAN"
    | "REUSE_RECONSTRUCTION"
    | "BASE_ENUMERATION"
    | "BASE_SCORING"
    | "BASE_SELECTION"
    | "CANDIDATE_START"
    | "CANDIDATE_ENUMERATION"
    | "CANDIDATE_SELECTION"
    | "DONE" = "REUSE_FACT_SCAN";
  private enumeration: PublicPlacementEnumerationV7;
  private tileIndex = 0;
  private placementIndex = 0;
  private candidateIndex = 0;
  private selection: IncrementalBestSelectionV7 | null = null;
  private readonly baseScores = new Map<PublicPlacementV7, number>();
  private readonly potentialStats = new Map<
    PublicEconomicPotentialKindV7,
    { targets: number; bestSpatialScore: number }
  >();
  private readonly scores: PublicSpatialPlanScoreV7[] = [];
  private baseline = 0;
  private completed: PublicPlanningWorkResultV7 | null = null;

  constructor(
    private readonly view: PlayerViewV7,
    candidates: readonly CommandV7[],
  ) {
    this.candidates = [...candidates];
    this.graph = publicEconomyGraph(view);
    this.factKeyWork = createPublicPlanningFactKeyWorkV7(view);
    this.exact = publicPlanningGraphExact(view);
    this.enumeration = createPublicPlacementEnumerationV7(view, this.graph);
    for (const kind of ECONOMIC_POTENTIAL_KINDS_V7)
      this.potentialStats.set(kind, { targets: 0, bestSpatialScore: 0 });
  }

  advance(maxOperations: number): PublicPlanningWorkProgressV7 {
    if (!Number.isSafeInteger(maxOperations) || maxOperations <= 0)
      throw new RangeError("maxOperations must be a positive safe integer");
    let operations = 0;
    while (operations < maxOperations && this.phase !== "DONE") {
      if (this.advanceOne()) operations += 1;
    }
    return {
      done: this.phase === "DONE",
      operations,
      result: this.completed,
    };
  }

  private advanceOne(): boolean {
    if (this.phase === "REUSE_FACT_SCAN") {
      const progress = this.factKeyWork.next();
      if (!progress.done) return true;
      this.factKey = progress.value;
      this.reuseEntry = planningReuseEntryV7(progress.value) ?? null;
      this.phase =
        this.reuseEntry === null
          ? this.exact
            ? "BASE_ENUMERATION"
            : "CANDIDATE_START"
          : "REUSE_RECONSTRUCTION";
      return true;
    }
    if (this.phase === "REUSE_RECONSTRUCTION") {
      const candidate = this.candidates[this.candidateIndex];
      if (candidate === undefined) {
        this.finishReuse();
        return false;
      }
      const cacheKey = JSON.stringify(candidate);
      const reusedScore = this.reuseEntry?.scores.get(cacheKey);
      if (
        reusedScore === undefined &&
        publicPlanningCandidateMayAffectGraphV7(candidate)
      ) {
        this.reuseEntry = null;
        this.scores.length = 0;
        this.candidateIndex = 0;
        PUBLIC_SPATIAL_SCORES.delete(this.view);
        this.phase = this.exact ? "BASE_ENUMERATION" : "CANDIDATE_START";
        return true;
      }
      this.recordCandidateScore(candidate, reusedScore ?? 0);
      this.candidateIndex += 1;
      return true;
    }
    if (this.phase === "BASE_ENUMERATION") {
      const tile = this.graph.board.tiles[this.tileIndex];
      if (tile !== undefined) {
        appendPublicPlacementsForTileV7(this.enumeration, tile);
        this.tileIndex += 1;
        return true;
      }
      this.phase = "BASE_SCORING";
      this.placementIndex = 0;
      return false;
    }
    if (this.phase === "BASE_SCORING") {
      const placement = this.enumeration.placements[this.placementIndex];
      if (placement !== undefined) {
        const score = scorePublicPlacementV7(this.view, this.graph, placement);
        this.baseScores.set(placement, score);
        const stats = this.potentialStats.get(placement.kind);
        if (stats !== undefined) {
          stats.targets += 1;
          stats.bestSpatialScore = Math.max(stats.bestSpatialScore, score);
        }
        this.placementIndex += 1;
        return true;
      }
      this.selection = createIncrementalBestSelectionV7(
        this.view,
        this.graph,
        this.enumeration.placementsByCity,
        this.baseScores,
      );
      this.phase = "BASE_SELECTION";
      return false;
    }
    if (this.phase === "BASE_SELECTION") {
      if (
        this.selection !== null &&
        advanceIncrementalBestSelectionV7(this.view, this.selection)
      )
        return true;
      this.baseline = this.selection?.total ?? 0;
      PUBLIC_SPATIAL_BASELINES.set(this.view, this.baseline);
      this.selection = null;
      this.phase = "CANDIDATE_START";
      return false;
    }
    if (this.phase === "CANDIDATE_START") {
      const candidate = this.candidates[this.candidateIndex];
      if (candidate === undefined) {
        this.finish();
        return false;
      }
      const after = this.exact
        ? graphAfterPublicCandidateV7(this.view, this.graph, candidate)
        : null;
      if (after === null) {
        this.recordCandidateScore(candidate, 0);
        this.candidateIndex += 1;
        return true;
      }
      this.enumeration = createPublicPlacementEnumerationV7(this.view, after);
      this.tileIndex = 0;
      this.phase = "CANDIDATE_ENUMERATION";
      return true;
    }
    if (this.phase === "CANDIDATE_ENUMERATION") {
      const tile = this.enumeration.graph.board.tiles[this.tileIndex];
      if (tile !== undefined) {
        appendPublicPlacementsForTileV7(this.enumeration, tile);
        this.tileIndex += 1;
        return true;
      }
      this.selection = createIncrementalBestSelectionV7(
        this.view,
        this.enumeration.graph,
        this.enumeration.placementsByCity,
      );
      this.phase = "CANDIDATE_SELECTION";
      return false;
    }
    if (this.phase === "CANDIDATE_SELECTION") {
      if (
        this.selection !== null &&
        advanceIncrementalBestSelectionV7(this.view, this.selection)
      )
        return true;
      const candidate = this.candidates[this.candidateIndex];
      if (candidate !== undefined) {
        this.recordCandidateScore(
          candidate,
          (this.selection?.total ?? 0) - this.baseline,
        );
        if (candidate.kind === "REDEVELOP" && this.selection !== null) {
          let cached = PUBLIC_REDEVELOPMENT_CHANGES.get(this.view);
          if (cached === undefined) {
            cached = new Map();
            PUBLIC_REDEVELOPMENT_CHANGES.set(this.view, cached);
          }
          const best = this.selection.bestByTarget.get(
            coordKeyV7(candidate.at),
          );
          cached.set(
            JSON.stringify(candidate),
            redevelopmentChangesImprovementV7(
              this.view,
              this.graph,
              this.selection.graph,
              { kind: "REDEVELOP", at: candidate.at },
              best !== undefined && best.score > 0 ? best.placement : undefined,
            ),
          );
        }
      }
      this.selection = null;
      this.candidateIndex += 1;
      this.phase = "CANDIDATE_START";
      return false;
    }
    return false;
  }

  private recordCandidateScore(command: CommandV7, score: number): void {
    this.scores.push({ command, score });
    let cached = PUBLIC_SPATIAL_SCORES.get(this.view);
    if (cached === undefined) {
      cached = new Map();
      PUBLIC_SPATIAL_SCORES.set(this.view, cached);
    }
    cached.set(JSON.stringify(command), score);
  }

  private finish(): void {
    const potentials = ECONOMIC_POTENTIAL_KINDS_V7.map((command) => ({
      command,
      ...(this.potentialStats.get(command) ?? {
        targets: 0,
        bestSpatialScore: 0,
      }),
    }));
    PUBLIC_ECONOMIC_POTENTIALS.set(this.view, potentials);
    this.completed = { potentials, scores: this.scores };
    if (this.factKey === null)
      throw new RangeError("Public planning fact scan did not complete");
    retainPlanningReuseEntryV7(this.factKey, {
      potentials: potentials.map((potential) => ({ ...potential })),
      scores: new Map(
        this.scores.map(({ command, score }) => [
          JSON.stringify(command),
          score,
        ]),
      ),
      redevelopmentChanges: new Map(
        PUBLIC_REDEVELOPMENT_CHANGES.get(this.view) ?? [],
      ),
    });
    this.phase = "DONE";
  }

  private finishReuse(): void {
    const reused = this.reuseEntry;
    if (reused === null)
      throw new RangeError("Public planning reuse entry was lost");
    const potentials = reused.potentials.map((potential) => ({ ...potential }));
    PUBLIC_ECONOMIC_POTENTIALS.set(this.view, potentials);
    PUBLIC_REDEVELOPMENT_CHANGES.set(
      this.view,
      new Map(reused.redevelopmentChanges),
    );
    this.completed = { potentials, scores: this.scores };
    this.phase = "DONE";
  }
}

function publicPlanningCandidateMayAffectGraphV7(
  candidate: CommandV7,
): boolean {
  return (
    candidate.kind === "CHOOSE_CITY_REWARD" ||
    candidate.kind === "GATHER_PEARLS" ||
    candidate.kind === "BUILD_PORT" ||
    candidate.kind === "BUILD_SHIPYARD" ||
    candidate.kind === "CULTIVATE_FOREST" ||
    candidate.kind === "BLAST_MOUNTAIN" ||
    ECONOMIC_POTENTIAL_KINDS_V7.includes(candidate.kind as never)
  );
}

function scorePublicPlacementV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  placement: PublicPlacementV7,
): number {
  const tile = graph.board.tiles.find((candidate) =>
    same(candidate.at, placement.at),
  );
  if (tile === undefined) return 0;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[placement.kind as BasicEconomicCommandKindV7];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[placement.kind as SpatialEconomicCommandKindV7];
  const after =
    placement.kind === "BUILD_MONUMENT"
      ? replacePublicGraphTileV7(graph, placement.at, {
          improvement: "MONUMENT",
        })
      : graphAfterTileCommandV7(view, graph, {
          kind: placement.kind as Exclude<
            PublicEconomicPotentialKindV7,
            "BUILD_MONUMENT"
          >,
          at: placement.at,
        } as Extract<CommandV7, { at: CoordV7 }>);
  if (after === null) return 0;
  const beforeTotals = publicGraphTotalsV7(graph, view.viewer.id);
  const afterTotals = publicGraphTotalsAfterSingleTileChangeV7(
    graph,
    after,
    view.viewer.id,
    placement.at,
  );
  const permanentPopulation =
    basic?.populationCategory === "PERMANENT" ? basic.population : 0;
  const populationDelta =
    permanentPopulation + afterTotals.population - beforeTotals.population;
  const recurringCoinDelta =
    afterTotals.recurringCoins - beforeTotals.recurringCoins;
  const improvement =
    placement.kind === "BUILD_MONUMENT"
      ? "MONUMENT"
      : (basic?.improvement ?? spatial?.improvement ?? null);
  const evaluation =
    improvement === null
      ? null
      : spatialContributionAtV7(after, placement.at, improvement);
  return (
    8 * populationDelta +
    18 * recurringCoinDelta +
    2 * (evaluation?.contributingTiles.length ?? 0) +
    3 *
      Math.max(
        evaluation?.distinctTypes.length ?? 0,
        evaluation?.distinctFamilies.length ?? 0,
      ) +
    4 * (evaluation?.oppositePairAxes.length ?? 0) +
    (placement.kind === "BUILD_ROAD" && recurringCoinDelta > 0 ? 4 : 0)
  );
}

function publicGraphTotalsV7(
  graph: PublicEconomyGraphV7,
  ownerId: PlayerId,
): { readonly population: number; readonly recurringCoins: number } {
  let byOwner = PUBLIC_GRAPH_TOTALS.get(graph);
  if (byOwner === undefined) {
    byOwner = new Map();
    PUBLIC_GRAPH_TOTALS.set(graph, byOwner);
  }
  const cached = byOwner.get(ownerId);
  if (cached !== undefined) return cached;
  const ownedCityIds = new Set(
    graph.cities
      .filter((city) => city.ownerId === ownerId)
      .map((city) => city.id),
  );
  let population = 0;
  for (const tile of graph.board.tiles)
    if (
      tile.improvement !== null &&
      tile.territoryCityId !== null &&
      ownedCityIds.has(tile.territoryCityId)
    ) {
      population +=
        tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
          ? Number(graph.activePortKeys.has(coordKeyV7(tile.at))) *
            publicDockPopulationV7(graph, tile.improvement)
          : spatialContributionAtV7(graph, tile.at, tile.improvement)
              .population;
      if (!Number.isSafeInteger(population))
        throw new RangeError("INTEGER_OVERFLOW");
    }
  if (!Number.isSafeInteger(population))
    throw new RangeError("INTEGER_OVERFLOW");
  let recurringCoins = 0;
  for (const city of graph.cities)
    if (city.ownerId === ownerId) {
      recurringCoins += marketForCityV7(graph, city.id);
      if (!Number.isSafeInteger(recurringCoins))
        throw new RangeError("INTEGER_OVERFLOW");
    }
  const totals = { population, recurringCoins };
  byOwner.set(ownerId, totals);
  return totals;
}

const GRAPH_DEPENDENT_IMPROVEMENTS_V7: ReadonlySet<ImprovementIdV7> = new Set([
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "MARKET",
]);

/** Exact total update for the one-coordinate mutations used by placement scoring. */
function publicGraphTotalsAfterSingleTileChangeV7(
  before: PublicEconomyGraphV7,
  after: PublicEconomyGraphV7,
  ownerId: PlayerId,
  changedAt: CoordV7,
): { readonly population: number; readonly recurringCoins: number } {
  const totals = publicGraphTotalsV7(before, ownerId);
  // These totals contain only improvement population and Market income, not
  // road population or trade sets. Every graph-dependent improvement reads
  // only its eight neighbors, so a one-tile mutation has no distant outputs.
  const affectedKeys = new Set([coordKeyV7(changedAt)]);
  for (let y = changedAt.y - 1; y <= changedAt.y + 1; y += 1)
    for (let x = changedAt.x - 1; x <= changedAt.x + 1; x += 1)
      for (const graph of [before, after]) {
        const tile = graph.board.tiles[y * graph.board.width + x];
        if (
          tile !== undefined &&
          tile.at.x === x &&
          tile.at.y === y &&
          tile.improvement !== null &&
          GRAPH_DEPENDENT_IMPROVEMENTS_V7.has(tile.improvement)
        )
          affectedKeys.add(coordKeyV7(tile.at));
      }
  let population = totals.population;
  let recurringCoins = totals.recurringCoins;
  for (const tileKey of affectedKeys) {
    const index =
      Number(tileKey.split(",")[0]) * before.board.width +
      Number(tileKey.split(",")[1]);
    const beforeTile = before.board.tiles[index];
    const afterTile = after.board.tiles[index];
    if (beforeTile === undefined || afterTile === undefined) continue;
    const prior = publicTileGraphOutputV7(before, beforeTile, ownerId);
    const next = publicTileGraphOutputV7(after, afterTile, ownerId);
    population += next.population - prior.population;
    recurringCoins += next.recurringCoins - prior.recurringCoins;
    if (
      !Number.isSafeInteger(population) ||
      !Number.isSafeInteger(recurringCoins)
    )
      throw new RangeError("INTEGER_OVERFLOW");
  }
  return { population, recurringCoins };
}

function publicTileGraphOutputV7(
  graph: PublicEconomyGraphV7,
  tile: PublicEconomyGraphTileV7,
  ownerId: PlayerId,
): { readonly population: number; readonly recurringCoins: number } {
  if (
    tile.improvement === null ||
    tile.territoryCityId === null ||
    graph.cities.find((city) => city.id === tile.territoryCityId)?.ownerId !==
      ownerId
  )
    return { population: 0, recurringCoins: 0 };
  const contribution = spatialContributionAtV7(
    graph,
    tile.at,
    tile.improvement,
  );
  return {
    population:
      tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
        ? Number(graph.activePortKeys.has(coordKeyV7(tile.at))) *
          publicDockPopulationV7(graph, tile.improvement)
        : contribution.population,
    recurringCoins:
      tile.improvement === "MARKET"
        ? marketCoinsV7(contribution.marketIncome)
        : contribution.marketIncome,
  };
}

function publicCityAllowsDevelopmentV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  cityId: CityId,
): boolean {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  return (
    city?.ownerId === view.viewer.id &&
    !publicCityBesieged(view, city.at) &&
    (!view.pendingChoices.some((choice) => choice.cityId === city.id) ||
      graph.resolvedPendingCityIds.has(city.id))
  );
}

function potentialKindOrdinalV7(kind: PublicEconomicPotentialKindV7): number {
  return ECONOMIC_POTENTIAL_KINDS_V7.indexOf(kind);
}

function coordKeyV7(at: CoordV7): string {
  return `${at.y},${at.x}`;
}

export function previewCityCapacityV7(
  state: GameStateV7,
  cityId: CityId,
): {
  readonly cityId: CityId;
  readonly capacity: number;
  readonly assigned: number;
  readonly available: number;
  readonly overCapacity: number;
  /**
   * Revision 19: the capacity slots of each role the city's owner can
   * produce (a role with a cost in its registration), in role order.
   */
  readonly roleSlots: readonly {
    readonly role: UnitRoleIdV7;
    readonly slots: number;
  }[];
} | null {
  const city = state.cities.find((item) => item.id === cityId);
  if (city === undefined) return null;
  const capacity = cityUnitCapacityV7(state, city);
  // Revision 19 section 5.1: `assigned` is the used-slot sum.
  const assigned = assignedUnitCountV7(state, cityId);
  return {
    cityId,
    capacity,
    assigned,
    available: Math.max(0, capacity - assigned),
    overCapacity: Math.max(0, assigned - capacity),
    roleSlots: UNIT_ROLE_IDS_V7.filter(
      (role) => seatRoleRuleV7(state, city.ownerId, role).cost !== null,
    ).map((role) => ({
      role,
      slots: seatRoleMechanicsV7(state, city.ownerId, role).capacitySlots,
    })),
  };
}

export function previewDisbandV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): {
  readonly unitId: UnitId;
  readonly refund: number;
  readonly homeCityId: CityId | null;
  readonly complete: true;
} | null {
  const unit = state.units.find((item) => item.id === unitId);
  if (unit === undefined || unit.ownerId !== viewerId) return null;
  const result = applyCommandV7(state, viewerId, { kind: "DISBAND", unitId });
  if (!result.accepted) return null;
  const event = result.events.find((item) => item.kind === "UNIT_DISBANDED");
  return event?.kind === "UNIT_DISBANDED"
    ? {
        unitId,
        refund: event.coinDelta,
        homeCityId: unit.homeCityId,
        complete: true,
      }
    : null;
}
export function previewPillageV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly cityId: CityId;
  readonly improvement: ImprovementIdV7;
  readonly coinDelta: 1;
  readonly resourceRestored:
    "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null;
  readonly complete: true;
} | null {
  const result = applyCommandV7(state, viewerId, { kind: "PILLAGE", unitId });
  if (!result.accepted) return null;
  const event = result.events.find(
    (item) => item.kind === "IMPROVEMENT_PILLAGED",
  );
  const afterTile =
    event?.kind === "IMPROVEMENT_PILLAGED"
      ? viewForV7(result.state, viewerId).board.tiles[
          event.at.y * result.state.board.width + event.at.x
        ]
      : undefined;
  return event?.kind === "IMPROVEMENT_PILLAGED"
    ? {
        unitId,
        at: event.at,
        cityId: event.cityId,
        improvement: event.improvement,
        coinDelta: 1,
        resourceRestored:
          afterTile?.explored === true
            ? projectedRestoredResource(afterTile.resource)
            : null,
        complete: true,
      }
    : null;
}
export function previewCaptureSpoilsV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): {
  readonly unitId: UnitId;
  readonly cityId: CityId;
  readonly coins: 0 | 2;
  readonly firstHostileCapture: boolean;
  readonly complete: true;
} | null {
  const result = applyCommandV7(state, viewerId, { kind: "CAPTURE", unitId });
  if (!result.accepted) return null;
  const capture = result.events.find((item) => item.kind === "CITY_CAPTURED");
  if (capture?.kind !== "CITY_CAPTURED") return null;
  const spoils = result.events.some((item) => item.kind === "SPOILS_AWARDED");
  return {
    unitId,
    cityId: capture.cityId,
    coins: spoils ? 2 : 0,
    firstHostileCapture: capture.from !== null && spoils,
    complete: true,
  };
}

function store(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
): readonly CommandV7[] {
  COMMAND_CACHE.set(view, commands);
  return commands;
}

function publicCommandOfferingAllowedV7(view: PlayerViewV7): boolean {
  if (
    view.outcome !== null ||
    view.viewer.status !== "ACTIVE" ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    view.pendingChoices.length > 0
  )
    return false;
  return true;
}

function asView(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): PlayerViewV7 {
  if ("leaderboard" in input) return input;
  if (viewerId === undefined)
    throw new RangeError("A viewer is required for authoritative state");
  return viewForV7(input, viewerId);
}

/**
 * Section 10: the Recover facts of one of the viewer's own units, from the
 * `PlayerView` alone. Own units stand on explored tiles, so the public
 * territory owner is exact (Restless is a body rule of the unit's kind, the
 * Mind Control revision), and Deep Winter is the viewer's own research.
 */
function publicRecoveryFactsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): RecoveryFactsV7 {
  const tile = tileAtView(view, unit.at);
  const inOwnTerritory =
    tile?.explored === true && tile.territoryOwnerId === unit.ownerId;
  return {
    form: unit.form,
    hp: unit.hp,
    maxHp: unit.maxHp,
    activation: unit.activation,
    construct: unitIsConstructV7(view, unit),
    restless: factionRulesV7(unitFactionV7(view, unit)).restless,
    inOwnTerritory,
    byOwnActivePort:
      unit.form === "NAVAL" &&
      [tile, ...adjacentPublicTiles(view, unit.at)].some(
        (candidate) =>
          candidate !== undefined &&
          publicActiveOwnedPort(view, candidate, unit.ownerId),
      ),
    deepWinter:
      inOwnTerritory &&
      isIceFolkLandUnitV7(view, unit) &&
      unitCapabilitiesV7(view, unit, view.viewer.researchedTechs).deepWinter,
  };
}

/** One unit End Turn would heal, and by how much. */
export interface IdleRecoveryV7 {
  readonly unitId: UnitId;
  readonly amount: number;
}

/**
 * Section 10 idle recovery, previewed: the viewer's own units that recover
 * by themselves if the viewer ends the turn now, in unit-ID order, each with
 * the HP it regains. These are exactly the units a `RECOVER` is offered for
 * (the shared predicate `recoverEligibleV7`), with the amount End Turn
 * applies. Empty whenever the viewer is offered no command.
 */
export function queryIdleRecoveryV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): readonly IdleRecoveryV7[] {
  const view = asView(input, viewerId);
  if (!publicCommandOfferingAllowedV7(view)) return [];
  return view.units
    .filter((unit) => unit.ownerId === view.viewer.id)
    .map((unit) => ({ unit, facts: publicRecoveryFactsV7(view, unit) }))
    .filter(({ facts }) => recoverEligibleV7(facts))
    .map(({ unit, facts }) => ({
      unitId: unit.id,
      amount: recoveryGainV7(facts),
    }))
    .sort((left, right) => left.unitId - right.unitId);
}

function tileAtView(view: PlayerViewV7, at: CoordV7) {
  if (
    !Number.isSafeInteger(at.x) ||
    !Number.isSafeInteger(at.y) ||
    at.x < 0 ||
    at.y < 0 ||
    at.x >= view.board.width ||
    at.y >= view.board.height
  )
    return undefined;
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  return tile?.at.x === at.x && tile.at.y === at.y ? tile : undefined;
}

function publicHostile(
  view: PlayerViewV7,
  left: PlayerId,
  right: PlayerId,
): boolean {
  if (left === right) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    left === view.humanPlayerId ||
    right === view.humanPlayerId
  );
}

function publicCityBesieged(view: PlayerViewV7, at: CoordV7): boolean {
  let byCity = PUBLIC_CITY_BESIEGED.get(view);
  if (byCity === undefined) {
    byCity = new Map();
    PUBLIC_CITY_BESIEGED.set(view, byCity);
  }
  const cityKey = coordKeyV7(at);
  const cached = byCity.get(cityKey);
  if (cached !== undefined) return cached;
  const besieged = view.units.some(
    (unit) =>
      unit.hp > 0 &&
      publicHostile(view, view.viewer.id, unit.ownerId) &&
      same(unit.at, at),
  );
  byCity.set(cityKey, besieged);
  return besieged;
}

function publicCityDevelopmentFootprintKnown(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): boolean {
  let byCity = PUBLIC_CITY_DEVELOPMENT_FOOTPRINT_KNOWN.get(view);
  if (byCity === undefined) {
    byCity = new Map();
    PUBLIC_CITY_DEVELOPMENT_FOOTPRINT_KNOWN.set(view, byCity);
  }
  const cached = byCity.get(city.id);
  if (cached !== undefined) return cached;
  const radius = city.expanded || city.landGrantUsed ? 2 : 1;
  let known = true;
  for (let y = city.at.y - radius; y <= city.at.y + radius && known; y += 1)
    for (let x = city.at.x - radius; x <= city.at.x + radius; x += 1) {
      if (x < 0 || y < 0 || x >= view.board.width || y >= view.board.height)
        continue;
      if (tileAtView(view, { x, y })?.explored !== true) {
        known = false;
        break;
      }
    }
  byCity.set(city.id, known);
  return known;
}

function publicCaptureTarget(view: PlayerViewV7, at: CoordV7): boolean {
  const tile = tileAtView(view, at);
  if (tile?.explored !== true) return false;
  if (tile.site === "VILLAGE" && tile.territoryOwnerId === null) return true;
  const city = view.cities.find((candidate) => same(candidate.at, at));
  return (
    city !== undefined &&
    publicHostile(view, view.viewer.id, city.ownerId) &&
    !view.units.some(
      (unit) =>
        unit.ownerId !== view.viewer.id && unit.hp > 0 && same(unit.at, at),
    )
  );
}

function projectedRestoredResource(
  resource: Extract<PlayerTileViewV7, { explored: true }>["resource"],
): "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null {
  return resource === "FERTILE_GROUND" ||
    resource === "ORE" ||
    resource === "UNKNOWN_RESOURCE"
    ? resource
    : null;
}

function cityHasImprovement(
  view: PlayerViewV7,
  cityId: CityId,
  improvement: ImprovementIdV7,
): boolean {
  return view.board.tiles.some(
    (tile) =>
      tile.explored &&
      tile.territoryCityId === cityId &&
      tile.improvement === improvement,
  );
}

function publicTileCommandLegal(
  view: PlayerViewV7,
  tile: Extract<PlayerTileViewV7, { explored: true }>,
  kind: (typeof TILE_KINDS)[number],
  unlocked: ReadonlySet<string>,
): boolean {
  if (!unlocked.has(kind)) return false;
  // The Rift (RULESET_7_RIFT.md section 3): no tile command targets a Rift.
  if (tile.terrain === "RIFT") return false;
  if (
    tile.biome === null &&
    !["HARVEST_FISH", "GATHER_PEARLS", "BUILD_PORT", "BUILD_SHIPYARD"].includes(
      kind,
    ) &&
    (kind !== "REDEVELOP" ||
      (tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD"))
  )
    return false;
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  const neutralRoad =
    kind === "BUILD_ROAD" &&
    tile.territoryCityId === null &&
    tile.territoryOwnerId === null;
  // Tuning 3 (`pulp_wars-w49.3`): a Mountain outside the viewer's territory
  // (and outside an ally's) may be blasted next to one of its land units.
  if (kind === "BLAST_MOUNTAIN" && tile.territoryOwnerId !== view.viewer.id)
    return (
      (tile.territoryOwnerId === null ||
        !publicAllied(view, view.viewer.id, tile.territoryOwnerId)) &&
      view.units.some(
        (unit) =>
          unit.ownerId === view.viewer.id &&
          unit.form === "LAND" &&
          chebyshev(unit.at, tile.at) === 1,
      ) &&
      publicBlastTileLegalV7(view, tile)
    );
  if (
    (!neutralRoad && city?.ownerId !== view.viewer.id) ||
    (city !== undefined && publicCityBesieged(view, city.at)) ||
    (city !== undefined &&
      view.pendingChoices.some((choice) => choice.cityId === city.id))
  )
    return false;
  if (neutralRoad)
    return (
      view.viewer.coins >= 2 &&
      tile.biome !== null &&
      tile.site === null &&
      !tile.road &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("ENGINEERING"))
    );
  if (city === undefined) return false;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[kind as keyof typeof BASIC_ECONOMIC_ACTIONS_V7];
  if (basic !== undefined)
    return (
      view.viewer.coins >= basic.cost &&
      !view.treasureChests.some((chest) => same(chest, tile.at)) &&
      tile.site === null &&
      tile.terrain === basic.terrain &&
      tile.resource === basic.resource &&
      (kind === "HARVEST_FISH"
        ? tile.improvement === null ||
          ((tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
            publicActiveOwnedPort(view, tile, view.viewer.id))
        : tile.improvement === null)
    );
  if (kind === "GATHER_PEARLS")
    return (
      view.viewer.coins >= 2 &&
      tile.resource === "PEARLS" &&
      (tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER") &&
      (tile.terrain !== "DEEP_WATER" ||
        view.viewer.researchedTechs.includes("NAVIGATION")) &&
      ((tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD") ||
        publicActiveOwnedPort(view, tile, view.viewer.id))
    );
  if (kind === "BUILD_PORT")
    return (
      view.viewer.coins >= 4 &&
      tile.terrain === "SHALLOW_WATER" &&
      // The frozen sea (naval branch section 8.3): no Port on ice.
      !isIceAtV7(view, tile.at) &&
      tile.improvement === null &&
      tile.site === null &&
      !tile.road &&
      adjacentPublicTiles(view, tile.at).some(
        (near) =>
          near.explored &&
          near.biome !== null &&
          near.territoryCityId === city.id,
      )
    );
  if (kind === "BUILD_SHIPYARD")
    return (
      view.viewer.coins >= 5 &&
      view.viewer.researchedTechs.includes("NAVAL_ENGINEERING") &&
      tile.improvement === "PORT" &&
      publicActiveOwnedPort(view, tile, view.viewer.id) &&
      publicCityDevelopmentFootprintKnown(view, city) &&
      !cityHasImprovement(view, city.id, "SHIPYARD")
    );
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[
      kind as keyof typeof SPATIAL_ECONOMIC_ACTIONS_V7
    ];
  if (spatial !== undefined) {
    if (
      view.viewer.coins < spatial.cost ||
      !publicCityDevelopmentFootprintKnown(view, city) ||
      view.treasureChests.some((chest) => same(chest, tile.at)) ||
      tile.site !== null ||
      (tile.terrain === "MOUNTAIN" &&
        !view.viewer.researchedTechs.includes("ENGINEERING")) ||
      tile.resource !== null ||
      tile.improvement !== null ||
      cityHasImprovement(view, city.id, spatial.improvement)
    )
      return false;
    // The economy rejig (`pulp_wars-w49.16`, 7r54): a Windmill, Sawmill,
    // Forge, or Workshop counts every contributor of the viewer next to
    // it, on any of its cities' land, shared or not, so the placement
    // needs only one of them (the viewer's own tiles are always known).
    if (
      kind === "BUILD_WINDMILL" ||
      kind === "BUILD_SAWMILL" ||
      kind === "BUILD_FORGE" ||
      kind === "BUILD_WORKSHOP"
    )
      return (
        spatialContributionAtV7(
          publicEconomyGraph(view),
          tile.at,
          spatial.improvement,
        ).placementCount >= spatial.placementMinimum
      );
    // Tuning 1 (7r46): a contributor counts for one Market, so the
    // placement needs a contributor that would count for this one. A
    // contributor of this city always does; one of another city only when
    // no Market next to it comes first, which is exact only when every
    // tile around it is explored.
    if (kind === "BUILD_MARKET") {
      const support = spatialContributionAtV7(
        publicEconomyGraph(view),
        tile.at,
        spatial.improvement,
      );
      return (
        support.placementCount >= spatial.placementMinimum &&
        support.contributingTiles.some((at) => {
          const contributor = tileAtView(view, at);
          return (
            contributor?.explored === true &&
            (contributor.territoryCityId === city.id ||
              adjacentPublicTiles(view, at).every((near) => near.explored))
          );
        })
      );
    }
    return true;
  }
  if (kind === "CLEAR_FOREST")
    return (
      tile.site === null &&
      tile.terrain === "FOREST" &&
      tile.resource === null &&
      tile.improvement === null
    );
  if (kind === "REPLANT_FOREST")
    return (
      view.viewer.coins >= 4 &&
      tile.site === null &&
      tile.terrain === "GRASS" &&
      tile.resource === null &&
      tile.improvement === null
    );
  if (kind === "CULTIVATE_FOREST")
    return (
      view.viewer.coins >= 4 &&
      tile.site === null &&
      tile.terrain === "FOREST" &&
      tile.resource === null &&
      tile.improvement === null
    );
  if (kind === "BLAST_MOUNTAIN") return publicBlastTileLegalV7(view, tile);
  if (kind === "BUILD_ROAD")
    return (
      view.viewer.coins >= 2 &&
      tile.biome !== null &&
      tile.site === null &&
      !tile.road &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("ENGINEERING"))
    );
  return (
    kind === "REDEVELOP" &&
    tile.improvement !== null &&
    ((tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD") ||
      !view.units.some((unit) => same(unit.at, tile.at)))
  );
}

/** The tile and Coin conditions of a Blast Mountain, wherever it lies. */
function publicBlastTileLegalV7(
  view: PlayerViewV7,
  tile: Extract<PlayerTileViewV7, { explored: true }>,
): boolean {
  return (
    view.viewer.coins >= BLAST_MOUNTAIN_COST_V7 &&
    tile.site === null &&
    tile.terrain === "MOUNTAIN" &&
    // Tuning 1 (7r46): an Ore Mountain may be blasted.
    (tile.resource === null || tile.resource === "ORE") &&
    tile.improvement === null &&
    !tile.fieldDefense
  );
}

function adjacentPublicTiles(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerTileViewV7[] {
  const result: PlayerTileViewV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1) {
      if (x === at.x && y === at.y) continue;
      const tile = tileAtView(view, { x, y });
      if (tile !== undefined) result.push(tile);
    }
  return result;
}

function publicCombatPreviewCore(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options: CombatOptionsV7 = {},
): CombatPreviewV7 | null {
  const attacker = view.units.find(
    (unit) => unit.id === attackerId && unit.ownerId === view.viewer.id,
  );
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (
    attacker === undefined ||
    target === undefined ||
    !publicHostile(view, attacker.ownerId, target.ownerId)
  )
    return null;
  const attackerRule = unitRoleRuleV7(view, attacker);
  const defenderRule = unitRoleRuleV7(view, target);
  const attackerMechanics = unitRoleMechanicsV7(view, attacker);
  const distance = chebyshev(attacker.at, target.at);
  // The Dwarf revision section 7.3: an unmoved Clockwork Gunner's second
  // shot.
  // The Vampire and Banshee rework (`pulp_wars-ty6i`): the Feast attack.
  const twinShot =
    twinShotReadyV7(view, attacker) || feastReadyV7(view, attacker);
  const attackReady =
    !primaryUsedForQuery(attacker) ||
    attacker.activation.overrunActive ||
    twinShot;
  if (
    attacker.form === "EMBARKED" ||
    attacker.form === "EGG" ||
    !attackerRule.abilities.includes("ATTACK") ||
    // The Candy revision section 5.3: a Crashed unit cannot attack.
    unitIsCrashedV7(view, attacker.id) ||
    !attackReady ||
    (!attacker.activation.overrunActive &&
      !twinShot &&
      attacker.activation.attacksUsed >= 1) ||
    primaryActionBlockedAfterMoveV7(view, attacker) ||
    distance < attackerRule.minimumRange ||
    distance > publicAttackMaximumRangeV7(view, attacker) ||
    // The frozen sea (naval branch section 8.9): an icebound ship cannot
    // attack.
    unitIsIceboundV7(view, attacker)
  )
    return null;
  // The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md sections 5.2
  // and 5.3): a torpedo targets only units afloat, and a submerged
  // Submarine is attacked only from an adjacent tile.
  const torpedo = attackIsTorpedoV7(view, attacker);
  if (
    (torpedo && !isAfloatFormV7(target.form)) ||
    (distance > 1 && unitIsSubmergedV7(view, target))
  )
    return null;
  // Section 4.1: a Patrol Boat that moved this turn rams a target afloat.
  const ram = attackIsRamV7(
    view,
    attacker,
    target,
    distance,
    view.viewer.researchedTechs,
  );
  const attackStats = view.unitStats.find(
    (stats) => stats.unitId === attacker.id,
  );
  const defenseStats = view.unitStats.find(
    (stats) => stats.unitId === target.id,
  );
  if (attackStats === undefined || defenseStats === undefined) return null;
  const attack = attackStats.stats.find((stat) => stat.id === "ATTACK");
  const defense = defenseStats.stats.find((stat) => stat.id === "DEFENSE");
  if (attack === undefined || defense === undefined) return null;
  if (defense.visibility === "BASE_ONLY") return null;
  // Revision 17 Gang Up counts only the viewer's own (always visible) units.
  const gangUp = gangUpBonusV7(view, view.units, attacker, target);
  // Revision 20 Charge!: the run-up is already in the public Attack total
  // (the `RUN_UP` modifier); it is reported separately as `runUp`.
  const charge = attackIsChargeV7(view, attacker);
  const runUpAttack2 = chargeRunUpAttack2V7(
    view,
    attacker,
    view.viewer.researchedTechs,
  );
  // The Ice Folk revision (section 8, step 1): Planted is already in the
  // public Attack total (the `PLANTED` modifier); a Rockfall replaces the
  // role Attack, and Cold Blood is added against a Frozen target.
  const attackerMechanics0 = unitRoleMechanicsV7(view, attacker);
  const attackerLand = attacker.form === "LAND";
  const targetFrozen =
    target.form === "LAND" &&
    (options.assumeTargetFrozen === true || isFrozenV7(view.frozen, target.id));
  const rockfallApplied =
    attackerLand && attackerMechanics0.rockfallAttack2 > 0 && distance === 2;
  const coldBloodApplied =
    attackerLand && attackerMechanics0.coldBloodBonus2 > 0 && targetFrozen;
  const plantedApplied = attack.modifiers.some(
    (modifier) => modifier.source === "PLANTED",
  );
  // The Undead pass, correction (`pulp_wars-w49.13`): Carrion.
  const carrionApplied =
    attackerLand &&
    attackerMechanics0.carrionBonus2 > 0 &&
    (view.bitten.some((entry) => entry.unitId === target.id) ||
      view.plagued.some((entry) => entry.unitId === target.id));
  const chargeApplied =
    attackerRule.abilities.includes("CHARGE") &&
    view.viewer.researchedTechs.includes("RAIDING") &&
    attacker.activation.moved &&
    attacker.activation.movedPathLength >= 2 &&
    attacker.activation.attacksUsed === 0;
  const inspiredApplied =
    attacker.activation.inspired && attacker.activation.attacksUsed === 0;
  // The Candy revision section 5.2: the Rush bonus of a Rushed attacker is
  // already in the public Attack total (the `SUGAR_RUSH` modifier); the
  // estimate option `assumeSugarRush` adds it for a unit that could Rush.
  const assumeRushed = options.assumeSugarRush === true;
  const rushInStats = attack.modifiers.some(
    (modifier) => modifier.source === "SUGAR_RUSH",
  );
  const assumedRush2 = rushInStats
    ? 0
    : sugarRushAttack2V7(view, attacker, {
        chargeApplied,
        inspiredApplied,
        assumeRushed,
      });
  // The Candy redesign (RULESET_7_CANDY_REDESIGN.md section 6.2): the
  // attacker's own Toothache (public on a visible unit), after every other
  // modifier; it is not in the public Attack total.
  const toothacheAttack = unitHasToothacheV7(view, attacker.id);
  const attack2BeforeToothache =
    rationalToHalfUnits(attack.total) +
    assumedRush2 +
    (ram ? RAM_BONUS2_V7 : 0) +
    gangUp * 2 +
    (rockfallApplied
      ? attackerMechanics0.rockfallAttack2 - attackerRule.attack2
      : 0) +
    (coldBloodApplied ? attackerMechanics0.coldBloodBonus2 : 0) +
    (carrionApplied ? attackerMechanics0.carrionBonus2 : 0) +
    // The Dinosaur pass (7r53): Pack Hunt (own units are always visible).
    packHuntAttack2V7(view, view.units, attacker, target, view.huntedThisTurn);
  const attack2 = attack2AfterToothacheV7(
    attack2BeforeToothache,
    toothacheAttack,
  );
  // The Martian revision section 6.1: the halving of a half-power ray is
  // already in the public Attack total (the `HALF_POWER` modifier).
  const rayPower = rayPowerV7(
    view,
    view.cooling,
    attacker,
    attacker.activation.moved,
  );
  const targetTile = tileAtView(view, target.at);
  if (targetTile?.explored !== true) return null;
  // Revision 19 Acid: a land-form Spitter's attack ignores the defender's
  // cover and fortification.
  const acid = attackHasAcidV7(attackerRule, attacker);
  // Revision 20: Charge! removes every fortification level and Wallbreaker
  // the City Walls levels. The public tile level is Walls plus Field Defense.
  // The Martian revision: a walker or flyer has no fortification or cover.
  const targetTakesCover = unitTakesCoverV7(view, target);
  const tileFortification =
    targetTakesCover && targetTile.territoryOwnerId === target.ownerId
      ? (targetTile.fortificationLevel ?? 0)
      : 0;
  const tileFieldDefense = Math.min(
    tileFortification,
    targetTile.fieldDefense ? FIELD_DEFENSE_FORTIFICATION_LEVELS_V7 : 0,
  );
  // The Dwarf revision section 8: Dig In is one level in the Field Defense
  // part (never added to Field Defense), read from the target's public
  // stats (its owner's technologies are private).
  const dugIn = targetTakesCover && publicUnitIsDugInV7(view, target.id);
  const breach = attackBreachesV7(
    view,
    attacker,
    distance,
    view.viewer.researchedTechs,
  );
  // The giants' signatures (RULESET_7_GIANTS.md section 6.7): Siege Hammer.
  const siegeHammer = attackSiegeHammerV7(view, attacker, distance);
  const { fortificationLevel, fortificationIgnored } = attackFortificationV7(
    {
      walls: tileFortification - tileFieldDefense,
      fieldDefense: Math.max(tileFieldDefense, dugIn ? 1 : 0),
    },
    {
      acid,
      charge,
      ignoresCityWalls: attackIgnoresCityWallsV7(
        view,
        attacker,
        view.viewer.researchedTechs,
      ),
      // The Martian revision section 6.5: the Disintegrator.
      disintegrator:
        rayPower !== "NONE" &&
        unitCapabilitiesV7(view, attacker, view.viewer.researchedTechs)
          .raysIgnoreFortification,
      // The Ice Folk revision section 7.6: Boulders.
      boulders: attackerLand && attackerMechanics0.ignoresFortification,
      // The Dwarf revision section 10.1: a Blasting Steam Cannon.
      blasting: cannonIgnoresFortificationV7(
        view,
        attacker,
        view.viewer.researchedTechs,
      ),
      // Tuning 1 Breach: a melee attack of an owner with Explosives.
      breach,
      siegeHammer,
    },
  );
  // Revision 19 section 6.2: an Egg defends with a fixed 1.
  const defense2 =
    target.form === "EMBARKED"
      ? 2
      : target.form === "EGG"
        ? EGG_DEFENSE2_V7
        : // Tuning 5: the Human Guard is open to ranged attacks. The ninth
          // unit (7r55): a Cracked unit has 1 less Defense (the public
          // `crackedThisTurn` of a visible unit).
          unitDefense2AtDistanceV7(
            view,
            target,
            defenderRule,
            unitRoleMechanicsV7(view, target),
            distance,
          ) +
          fortificationLevel * 2;
  // The Ice Folk revision section 6.2: Snow cover from the public Snow flag
  // (a hidden Witch's Blizzard is not known; `hiddenBlizzardPossible`).
  // `pulp_wars-1wy.3`: Snow cover is x 1.25 and yields to the x 1.5 of a
  // Forest or Mountain (the shared `coverBonusV7`).
  // Tuning 3 (`pulp_wars-w49.3`): Forest cover needs the target owner's
  // Forestry, which is private; the target's public Defense breakdown says
  // whether the terrain cover applies.
  const terrainCover =
    !acid &&
    targetTakesCover &&
    terrainGivesCoverV7(
      targetTile.terrain,
      publicUnitHasTerrainCoverV7(view, target.id),
    );
  const snowCover =
    !acid &&
    targetTakesCover &&
    !terrainCover &&
    targetTile.snow === true &&
    tileFortification === 0 &&
    unitOwnerIsIceFolkV7(view, target);
  // The frozen sea (naval branch section 8.10): Glacier's cover on ice,
  // read from the target's public stats (its owner's technologies are
  // private; the stats already hold the unit's fortification).
  const iceCover = !acid && defenseStats.iceFolk?.iceCover === true;
  // Section 8.9: an icebound defender never retaliates.
  const defenderIcebound = unitIsIceboundV7(view, target);
  const bonus = coverBonusV7(terrainCover, snowCover || iceCover);
  const breachApplied = breach && fortificationIgnored > 0;
  const applied = bonus;
  // The Dwarf revision section 7.1: Unflinching (a construct's attack).
  const unflinching = attackIsUnflinchingV7(view, attacker);
  const attackForceNumerator =
    BigInt(attack2) * BigInt(unflinching ? attacker.maxHp : attacker.hp);
  const attackForceDenominator = 2n * BigInt(attacker.maxHp);
  const defenseForceNumerator =
    BigInt(defense2) * BigInt(target.hp) * BigInt(applied.numerator);
  const defenseForceDenominator =
    2n * BigInt(target.maxHp) * BigInt(applied.denominator);
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const total = attackOnCommon + defenseOnCommon;
  if (total <= 0n) return null;
  // Revision 19 Armoured: the reduction applies before the cap at HP.
  const rawDefenderDamage = roundHalfUpPublic(
    attackOnCommon * BigInt(attack2) * 9n,
    total * 4n,
  );
  // The Ice Folk revision section 6.3: the halving of a visible Witch's
  // Blizzard (her seat's units only).
  const blizzardHalved =
    distance >= 2 && blizzardProtectsV7(view, publicWitchesV7(view), target);
  const formulaDefenderDamage = blizzardHalved
    ? blizzardHalvedDamageV7(rawDefenderDamage)
    : rawDefenderDamage;
  // The Martian revision section 5.3: the Shield absorbs the hit first.
  const defenderShield = shieldOfV7(view.shields, target.id);
  // The Martian pass, correction: a whole Force Field holds one attack.
  const defenderHit = absorbHitV7(
    defenderShield,
    target.hp,
    armouredDamageV7(view, target, formulaDefenderDamage),
    forceFieldHoldsV7(view, target, defenderShield),
  );
  // The Ice Folk revision section 5.5: the viewer's own threshold (the
  // Mind Control revision: through the attacker's kind's tree). The giants'
  // signatures (section 6.6): the Frost Giant's Glacial Smash threshold.
  const glacialThreshold = glacialSmashThresholdV7(view, attacker, distance);
  const shatters = attackShattersV7({
    attackerIceFolk: isIceFolkLandUnitV7(view, attacker),
    distance,
    defenderFrozen: targetFrozen,
    defender: target,
    hpAfterHit: target.hp - defenderHit.hpDamage,
    threshold:
      glacialThreshold ??
      unitCapabilitiesV7(view, attacker, view.viewer.researchedTechs)
        .shatterThreshold,
  });
  const damageToDefender = shatters ? target.hp : defenderHit.hpDamage;
  const defenderShieldDamage = defenderHit.shieldDamage;
  const hitOnDefender = defenderHit.hpDamage + defenderShieldDamage;
  const defenderArmoured =
    !forceFieldHoldsV7(view, target, defenderShield) &&
    hitOnDefender < Math.min(target.hp + defenderShield, formulaDefenderDamage);
  const defenderDies = damageToDefender >= target.hp;
  // Revision 14 (V1): an UNANSWERED attacker draws no retaliation. The
  // naval branch section 5.3: neither does a torpedo.
  const unanswered = attackerRule.abilities.includes("UNANSWERED") || torpedo;
  // Revision 19: an Egg never retaliates. The Dwarf revision section 6.1:
  // a Gyrocopter retaliates too.
  // Ice Folk Freeze (`pulp_wars-w49.37`): a Frozen defender never
  // retaliates.
  const wouldRetaliate =
    !defenderDies &&
    !unanswered &&
    !defenderIcebound &&
    !targetFrozen &&
    target.form !== "EMBARKED" &&
    target.form !== "EGG" &&
    roleRetaliatesV7(defenderRule) &&
    defenderRule.attack2 > 0 &&
    distance >= defenderRule.minimumRange &&
    distance <= defenderRule.range;
  // The Candy revision section 7: a Splatted unit does not strike back (the
  // public `splattedThisTurn` of a visible unit).
  const splatted = unitIsSplattedV7(view, target.id);
  // The Vampire and Banshee rework (`pulp_wars-ty6i`): Terror (the public
  // `terrorThisTurn` of a visible unit).
  const terrified = unitIsTerrifiedV7(view, target.id);
  const retaliation = wouldRetaliate && !splatted && !terrified;
  // Section 13.2 (tuning 1, 7r46): the retaliation uses the defender's base
  // Defense, without fortification and cover, exactly as canonical
  // resolution does (the shared `retaliationDamageV7`).
  const retaliationFormula = retaliationDamageV7({
    attackForceNumerator,
    attackForceDenominator,
    // The ninth unit (7r55): a Cracked defender strikes back with 1 less
    // Defense too.
    defense2: unitIsCrackedV7(view, target.id)
      ? crackedDefense2V7(defenderRule.defense2)
      : defenderRule.defense2,
    hp: target.hp,
    maxHp: target.maxHp,
  });
  const rawAttackerDamage = retaliation ? retaliationFormula : 0;
  const attackerShield = shieldOfV7(view.shields, attacker.id);
  const attackerHit = absorbHitV7(
    attackerShield,
    attacker.hp,
    armouredDamageV7(view, attacker, rawAttackerDamage),
  );
  // The ninth unit (7r55): the Shock Field of a Shielded Shock Trooper
  // attacked from the next tile (Shields are public on visible units), as
  // canonical resolution computes it.
  const shockRaw = shockFieldDamageV7(view, target, defenderShield, distance);
  const shockHit =
    shockRaw > 0
      ? absorbHitV7(
          attackerShield - attackerHit.shieldDamage,
          attacker.hp - attackerHit.hpDamage,
          armouredDamageV7(view, attacker, shockRaw),
        )
      : { shieldDamage: 0, hpDamage: 0 };
  const shockDamage = shockHit.hpDamage + shockHit.shieldDamage;
  const damageToAttacker = attackerHit.hpDamage + shockHit.hpDamage;
  const attackerShieldDamage = attackerHit.shieldDamage + shockHit.shieldDamage;
  const attackerArmoured =
    attackerHit.hpDamage + attackerHit.shieldDamage <
    Math.min(attacker.hp + attackerShield, rawAttackerDamage);
  const attackerDies = damageToAttacker >= attacker.hp;
  // Revision 17: the Bomb Chucker's bomb (splash target mode `ALL`) lists
  // visible own and allied units too.
  // The Martian revision: splash and Pierce are computed from the whole hit
  // on the primary target; each visible victim's own Shield absorbs first.
  const splashVictims = attackerMechanics.splash
    ? view.units.filter(
        (unit) =>
          unit.hp > 0 &&
          unit.id !== target.id &&
          unit.id !== attacker.id &&
          chebyshev(unit.at, target.at) === 1 &&
          // The Goblin pass (7r50): a Blast-proof unit is not splashed.
          !unitIsBlastProofV7(view, unit) &&
          (attackerMechanics.splashTargets === "ALL" ||
            publicHostile(view, attacker.ownerId, unit.ownerId)),
      )
    : [];
  // Section 6.4 Pierce: the visible unit directly behind the target, of any
  // owner (a hidden one is hit by the resolution only).
  const pierceAt = attackHasPierceV7(attackerRule, attacker)
    ? pierceTileV7(attacker.at, target.at)
    : null;
  const pierced =
    pierceAt === null
      ? undefined
      : view.units.find(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== attacker.id &&
            unit.id !== target.id &&
            same(unit.at, pierceAt) &&
            !splashVictims.some((victim) => victim.id === unit.id),
        );
  // The Ice Folk revision section 7.5 Sweep: the Mammoth's neighbours are
  // always explored by its owner, so the flank victims are exact.
  const sweep = attackerLand && attackerMechanics0.sweepDamage > 0;
  const sweepTiles = sweep ? sweepFlankTilesV7(attacker.at, target.at) : [];
  const byPosition = <U extends { readonly id: number; readonly at: CoordV7 }>(
    units: readonly U[],
  ): U[] =>
    [...units].sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    );
  const splash = sweep
    ? byPosition(
        view.units.filter(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== target.id &&
            unit.id !== attacker.id &&
            sweepTiles.some((at) => same(at, unit.at)) &&
            publicHostile(view, attacker.ownerId, unit.ownerId),
        ),
      ).map((unit) =>
        sweepEntryV7(
          view,
          unit,
          shieldOfV7(view.shields, unit.id),
          attackerMechanics0.sweepDamage,
        ),
      )
    : byPosition([
        ...splashVictims,
        ...(pierced === undefined ? [] : [pierced]),
      ]).map((unit) =>
        collateralEntryV7(
          view,
          unit,
          shieldOfV7(view.shields, unit.id),
          hitOnDefender,
        ),
      );
  // Revision 14 Plague and Bitten from the public statuses of visible units.
  const afflictions = afflictionCombatEffectsV7({
    roster: view,
    attacker,
    defender: target,
    attackerRule,
    attackerPlagues: attackPlaguesV7(
      view,
      attacker,
      attackerRule,
      view.viewer.researchedTechs,
    ),
    defenderRule,
    damageToDefender,
    damageToAttacker,
    defenderShieldDamage,
    attackerDies,
    defenderDies,
    attackerOnRift: noRisingAtV7(view.board, attacker.at),
    defenderOnRift: noRisingAtV7(view.board, target.at),
    splash,
    splashUnit: (unitId) => view.units.find((unit) => unit.id === unitId),
    plaguedUnitIds: new Set(view.plagued.map((entry) => entry.unitId)),
    bittenUnitIds: new Set(view.bitten.map((entry) => entry.unitId)),
    eggUnitIds: new Set(
      view.units.filter((unit) => unit.form === "EGG").map((unit) => unit.id),
    ),
  });
  // The Dwarf revision section 10.1: a Steam Cannon's Knockback.
  // The naval branch section 4.1: a ram's shove is the Push step of a Ram.
  const push = attackKnocksBackV7(view, attacker)
    ? publicKnockbackState(view, attacker, target, !defenderDies)
    : ram
      ? publicRamShoveState(view, attacker, target, !defenderDies)
      : publicPushState(
          view,
          attacker,
          target,
          !defenderDies && distance === 1,
        );
  // Revision 19 section 6.7: a melee attacker that destroys an Egg advances
  // like after killing a land unit. Revision 20: a Charge! also follows a
  // pushed target into the tile it vacated.
  const advances =
    ((defenderDies && !afflictions.defenderBittenRises) ||
      (charge && push === "WILL_PUSH")) &&
    !attackerDies &&
    distance === 1 &&
    attackerMechanics.advancesAfterKill &&
    // Tuning 2 (7r47): a ranged unit never advances, also from distance 1.
    !isRangedRoleRuleV7(attackerRule) &&
    attacker.form === "LAND" &&
    (target.form === "LAND" || target.form === "EGG") &&
    // The Rift (RULESET_7_RIFT.md section 4): never onto a Rift.
    !riftAtV7(view.board, target.at) &&
    publicAdvanceDestinationLegal(view, attacker, target.at) &&
    // The Ice Folk revision section 7.7: never onto a foreign center.
    advanceSiteAllowedV7(
      view,
      attacker,
      targetTile.site,
      view.cities.find((city) => same(city.at, target.at))?.ownerId ?? null,
    ) &&
    // The giants' signatures (section 6.2): a dying Abomination's victim is
    // released on its tile (a visible holder's victim is public).
    swallowedByV7(view.giants.swallowed, target.id) === undefined;
  const nextAttacks = attacker.activation.attacksUsed + 1;
  // The Candy redesign (section 6.1): no Candy unit has Overrun.
  const overrunKind = overrunKindV7(attackerRule);
  // The Candy revision section 8: the Bounce, after the Push and the follow.
  const bounced = publicBounceStateV7(view, attacker, target, {
    distance,
    attackerDies,
    defenderDies,
    advances,
    push,
  });
  const overrunContinues =
    overrunKind !== null &&
    advances &&
    view.units.some(
      (unit) =>
        unit.id !== attacker.id &&
        unit.id !== target.id &&
        unit.hp > 0 &&
        publicHostile(view, attacker.ownerId, unit.ownerId) &&
        chebyshev(target.at, unit.at) === 1,
    );
  // Revision 13 Lifesteal and Infect from the visible attacker and target.
  // Map curiosities (section 8.6): a neutral Monster never rises either.
  const undead = undeadCombatEffectsV7({
    attacker: { ...attacker, construct: unitIsConstructV7(view, attacker) },
    defender: {
      ...target,
      construct: unitIsConstructV7(view, target) || !unitTakesStatusV7(target),
    },
    attackerRule,
    defenderRule,
    damageToDefender,
    damageToAttacker,
    attackerDies,
    defenderDies,
    attackerOnRift: noRisingAtV7(view.board, attacker.at),
    defenderOnRift: noRisingAtV7(view.board, target.at),
  });
  const frostbitten = attackIsFrostbittenV7(
    view,
    attacker,
    target,
    distance,
    attackerDies,
  );
  // The Vampire and Banshee rework (`pulp_wars-ty6i`): Feast, from the
  // visible attacker and target, as the canonical preview computes it.
  const feast = attackFeastsV7(view, attacker, {
    defenderDies,
    attackerDies,
    frostbitten,
  });
  return {
    attackerId,
    targetUnitId,
    attack2,
    defense2,
    minimumRange: attackerRule.minimumRange,
    maximumRange: publicAttackMaximumRangeV7(view, attacker),
    chargeApplied,
    inspiredApplied,
    inspiredConsumed: attacker.activation.inspired,
    gangUp,
    breachApplied,
    defenseBonusNumerator: applied.numerator,
    defenseBonusDenominator: applied.denominator,
    fortificationLevel,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    retaliation,
    noRetaliationReason: noRetaliationReasonV7({
      defenderDies,
      retaliates: retaliation,
      unanswered,
      icebound: defenderIcebound,
      frozen: targetFrozen,
      splatted: wouldRetaliate && splatted,
      terrified: wouldRetaliate && !splatted && terrified,
    }),
    advances,
    push,
    attacksUsed: nextAttacks,
    // The Dwarf revision section 7.3: an unmoved Gunner's first shot. The
    // Vampire and Banshee rework: a first attack that Feasts.
    attacksRemaining:
      overrunContinues ||
      (!attackerDies && attackAllowanceV7(view, attacker) > nextAttacks) ||
      (feast && nextAttacks === 1)
        ? 1
        : 0,
    overrunAdvance: overrunKind !== null && advances,
    overrunContinues,
    // The Candy redesign (section 6.1): no Candy unit has Escape. Ice Folk
    // Freeze (`pulp_wars-w49.37`): an attacker Frozen by Frostbite is not.
    escapeAvailable:
      attackGrantsEscapeV7(attacker, attackerRule) &&
      !attackerDies &&
      !frostbitten,
    splash,
    ...undead,
    // The Vampire and Banshee rework: Feast heals to the maximum HP.
    attackerHeal: feast
      ? feastHealV7(attacker, damageToAttacker)
      : undead.attackerHeal,
    feast,
    ...afflictions,
    runUp: runUpAttack2 / 2,
    fortificationIgnored,
    acid,
    defenderArmoured,
    attackerArmoured,
    rayPower,
    // The Martian pass (`pulp_wars-w49.14`, 7r52): not with Heat Sinks (a
    // viewer's own Ray Gunner; another player's research is not public, so
    // its ray is read as overheating).
    coolingApplied:
      rayPower === "FULL" &&
      (attacker.ownerId !== view.viewer.id ||
        rayOverheatsV7(view, attacker, view.viewer.researchedTechs)),
    defenderShieldDamage,
    attackerShieldDamage,
    shatters,
    coldBloodApplied,
    rockfallApplied,
    plantedApplied,
    blizzardHalved,
    snowCover,
    sweep,
    // Section 10.10: a hidden Witch next to an Ice Folk defender may change
    // its cover and halve a ranged hit.
    hiddenBlizzardPossible: hiddenBlizzardPossibleV7(view, target),
    dugIn,
    unflinchingApplied: unflinching,
    platedApplied:
      platedCapAppliesV7(view, target, formulaDefenderDamage) ||
      (retaliation && platedCapAppliesV7(view, attacker, retaliationFormula)),
    sugarRushApplied: rushInStats || assumedRush2 > 0,
    splatApplied: attackSplatAppliesV7(view, attacker, target, defenderDies),
    ...bounced,
    ram,
    torpedo,
    iceCover,
    icebound: defenderIcebound,
    shockDamage,
    crackApplied: attackCracksV7(view, attacker, target, defenderDies),
    frostbiteApplied: frostbitten,
    ...publicCrushPreviewV7(view, attacker, target, distance, push, {
      defenderDies,
      hpAfter: grownHpV7(
        view,
        target,
        target.kills,
        target.kills + (attackerDies ? 1 : 0),
        target.hp -
          damageToDefender +
          lifestealOfDefenderV7(
            defenderRule,
            damageToDefender,
            damageToAttacker,
            target,
            defenderDies,
          ),
      ),
      shieldAfter: defenderShield - defenderShieldDamage,
    }),
    siegeHammer,
    wallsDestroyed:
      siegeHammer &&
      siegeHammerRazedCityV7(
        view.cities,
        (ownerId) => publicHostile(view, attacker.ownerId, ownerId),
        target.at,
      ) !== undefined,
    glacialSmash: shatters && glacialThreshold !== null,
    ...publicCandyAttackEffectsV7(view, attacker, target, {
      distance,
      retaliates: retaliation,
      attackerDies,
      defenderDies,
      hitOnDefender: damageToDefender + defenderShieldDamage,
      bounce: bounced.bounce,
      attackerAt: advances
        ? target.at
        : bounced.bounce === "WILL_BOUNCE" && bounced.bounceTo !== null
          ? bounced.bounceTo
          : attacker.at,
      toothacheAttack,
    }),
  };
}

/**
 * The Candy redesign (docs/product/RULESET_7_CANDY_REDESIGN.md sections 6.2,
 * 7.1, 7.3, 7.7, and 7.8): the public Candy part of an own attacker's
 * preview, mirroring the canonical one: the statuses from the public
 * stats, the Ricochet on the visible units (the canonical candidates are
 * the units the attacker's owner sees), and the Thump around the
 * attacker's tile after its advance or Bounce. With an unknown Bounce, or
 * an advance next to an unexplored tile, the Thump lists the visible units
 * and says `thumpUncertain`.
 */
function publicCandyAttackEffectsV7(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  target: PlayerViewV7["units"][number],
  facts: {
    readonly distance: number;
    readonly retaliates: boolean;
    readonly attackerDies: boolean;
    readonly defenderDies: boolean;
    readonly hitOnDefender: number;
    readonly bounce: CombatPreviewV7["bounce"];
    readonly attackerAt: CoordV7;
    readonly toothacheAttack: boolean;
  },
): Pick<
  CombatPreviewV7,
  | "stuckApplied"
  | "toothacheApplied"
  | "toothacheAttack"
  | "ricochet"
  | "thump"
  | "thumpUncertain"
> {
  const statuses = candyExchangeStatusesV7(view, attacker, target, {
    distance: facts.distance,
    retaliates: facts.retaliates,
    attackerRemains: !facts.attackerDies,
    defenderRemains: !facts.defenderDies,
  });
  const hostile = view.units.filter(
    (unit) =>
      unit.hp > 0 && publicHostile(view, attacker.ownerId, unit.ownerId),
  );
  const shieldOf = (unitId: UnitId): number => shieldOfV7(view.shields, unitId);
  const ricochet = ricochetEntryV7(
    view,
    attacker,
    target,
    facts.distance,
    facts.hitOnDefender,
    hostile,
    shieldOf,
  );
  const thumps = !facts.attackerDies && unitThumpDamageV7(view, attacker) > 0;
  const thump = thumps
    ? thumpEntriesV7(
        view,
        attacker,
        facts.attackerAt,
        target.id,
        hostile,
        shieldOf,
      )
    : [];
  return {
    ...statuses,
    toothacheAttack: facts.toothacheAttack,
    ricochet:
      ricochet === null
        ? null
        : {
            unitId: ricochet.unitId,
            damage: ricochet.damage,
            shieldDamage: ricochet.shieldDamage,
            dies: ricochet.dies,
          },
    thump: thump.map((entry) => ({
      unitId: entry.unitId,
      damage: entry.damage,
      shieldDamage: entry.shieldDamage,
      dies: entry.dies,
    })),
    // An unknown Bounce, or an advance next to tiles the viewer has not
    // explored (a hidden unit there is thumped too).
    thumpUncertain:
      thumps &&
      (facts.bounce === "UNKNOWN_BEHIND_FOG" ||
        adjacentPublicTiles(view, facts.attackerAt).some(
          (tile) => !tile.explored,
        )),
  };
}

/**
 * The giants' signatures (docs/product/RULESET_7_GIANTS.md section 6.1): the
 * public Crushing Shove part of an own attacker's preview. The target is
 * crushed whatever lies behind it (a Push into fog never happens); the
 * collision is known only when the tile behind is explored (every unit on
 * an explored tile is visible), so it is 0 with `UNKNOWN_BEHIND_FOG`.
 */
function publicCrushPreviewV7(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  target: PlayerViewV7["units"][number],
  distance: number,
  push: CombatPreviewV7["push"],
  after: {
    readonly defenderDies: boolean;
    readonly hpAfter: number;
    readonly shieldAfter: number;
  },
): Pick<CombatPreviewV7, "crush" | "crushDamage" | "collisionDamage"> {
  const damage = attackCrushDamageV7(view, attacker, distance);
  const crush = crushStateV7(
    damage,
    defenderCrushableV7(view, target),
    after.defenderDies,
    push,
  );
  if (crush === "NONE") return { crush, crushDamage: 0, collisionDamage: 0 };
  const hit = fixedSignatureHitV7(
    view,
    { ...target, hp: after.hpAfter },
    Math.max(0, after.shieldAfter),
    damage,
  );
  const behind = crushBehindTileV7(attacker.at, target.at);
  const blocker =
    tileAtView(view, behind)?.explored === true
      ? view.units.find(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== target.id &&
            unit.id !== attacker.id &&
            same(unit.at, behind) &&
            publicHostile(view, attacker.ownerId, unit.ownerId),
        )
      : undefined;
  return {
    crush,
    crushDamage: hit.damage,
    collisionDamage:
      blocker === undefined
        ? 0
        : fixedSignatureHitV7(
            view,
            blocker,
            shieldOfV7(view.shields, blocker.id),
            damage,
          ).damage,
  };
}

/** Revision 13 Lifesteal of a surviving retaliating Vampire defender. */
function lifestealOfDefenderV7(
  rule: ReturnType<typeof unitRoleRuleV7>,
  damageTaken: number,
  damageDealt: number,
  unit: { readonly hp: number; readonly maxHp: number },
  dies: boolean,
): number {
  if (dies || damageDealt <= 0 || !rule.abilities.includes("LIFESTEAL"))
    return 0;
  return Math.max(
    0,
    Math.min(damageDealt, unit.maxHp - (unit.hp - damageTaken)),
  );
}

/**
 * The naval branch (docs/product/RULESET_7_NAVAL_BRANCH.md section 4.1): the
 * public shove of an own Patrol Boat's Ram, mirroring
 * `ramShoveDestinationV7`. The tile behind the target must be explored by
 * the viewer, and every unit on an explored tile is visible; the Deep Water
 * rule reads the target's own tile, never its owner's technologies. So the
 * result is exact: `WILL_PUSH` or `BLOCKED`, never unknown.
 */
function publicRamShoveState(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  defender: PlayerViewV7["units"][number],
  survives: boolean,
): CombatPreviewV7["push"] {
  if (!survives) return "BLOCKED";
  const behind = {
    x: defender.at.x + Math.sign(defender.at.x - attacker.at.x),
    y: defender.at.y + Math.sign(defender.at.y - attacker.at.y),
  };
  const tile = tileAtView(view, behind);
  const targetTile = tileAtView(view, defender.at);
  return tile?.explored === true &&
    ramShoveTileOpenV7(
      tile,
      targetTile?.explored === true ? targetTile.terrain : undefined,
      tileOccupiedV7(view, behind, defender.id),
      isIceAtV7(view, behind),
    )
    ? "WILL_PUSH"
    : "BLOCKED";
}

/**
 * The Candy revision (section 8): the public Bounce of an own attacker,
 * mirroring `bounceStateV7`: the destination is next to the attacker, which
 * is the viewer's own unit, so the tile is explored, every unit, mound, and
 * chest on it is visible, and the technologies are the viewer's; the result
 * is exact. `UNKNOWN_BEHIND_FOG` only when the tile is not explored (an
 * estimate from a tile the unit does not stand on) or when the Charge! push
 * that decides the attacker's position is itself unknown.
 */
function publicBounceStateV7(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  defender: PlayerViewV7["units"][number],
  facts: {
    readonly distance: number;
    readonly attackerDies: boolean;
    readonly defenderDies: boolean;
    readonly advances: boolean;
    readonly push: CombatPreviewV7["push"];
  },
): Pick<CombatPreviewV7, "bounce" | "bounceTo"> {
  const none = { bounce: "NONE", bounceTo: null } as const;
  if (!attackIsBouncedV7(view, attacker, defender, facts)) return none;
  const behind = {
    x: defender.at.x * 2 - attacker.at.x,
    y: defender.at.y * 2 - attacker.at.y,
  };
  // An unknown Charge! push leaves the attacker's position unknown, unless
  // the tile behind the defender is unexplored: the resolution then never
  // pushes (the Push needs the attacker's owner to have explored it).
  if (
    facts.push === "UNKNOWN_BEHIND_FOG" &&
    attackIsChargeV7(view, attacker) &&
    tileAtView(view, behind)?.explored === true
  )
    return { bounce: "UNKNOWN_BEHIND_FOG", bounceTo: null };
  const defenderAt = facts.push === "WILL_PUSH" ? behind : defender.at;
  const attackerAt = facts.advances ? defender.at : attacker.at;
  if (chebyshev(attackerAt, defenderAt) !== 1) return none;
  const destination = bounceDestinationV7(attackerAt, defenderAt);
  const tile = tileAtView(view, destination);
  if (tile === undefined) return { bounce: "BLOCKED", bounceTo: null };
  if (!tile.explored) return { bounce: "UNKNOWN_BEHIND_FOG", bounceTo: null };
  const legal =
    tile.site === null &&
    canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(view, attacker),
      afloat: isAfloatFormV7(attacker.form),
      engineering: view.viewer.researchedTechs.includes("ENGINEERING"),
      navigation: view.viewer.researchedTechs.includes("NAVIGATION"),
      mountainBorn: unitIsMountainBornV7(view, attacker),
      // The frozen sea: a land-form attacker may be bounced onto ice.
      ice: isIceAtV7(view, destination),
    }) &&
    !tileOccupiedV7(view, destination, attacker.id) &&
    !(
      tile.territoryOwnerId !== null &&
      publicAllied(view, attacker.ownerId, tile.territoryOwnerId)
    ) &&
    !view.treasureChests.some((chest) => same(chest, destination));
  return legal
    ? { bounce: "WILL_BOUNCE", bounceTo: destination }
    : { bounce: "BLOCKED", bounceTo: null };
}

/** The land-form Ice Witches a view can see (section 6.5). */
function publicWitchesV7(
  view: PlayerViewV7,
): readonly PlayerViewV7["units"][number][] {
  if (!matchHasIceFolkV7(view)) return [];
  return view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.form === "LAND" &&
      unitRoleRuleV7(view, unit).abilities.includes("BLIZZARD"),
  );
}

/**
 * Section 7.2: a unit's attack range from the public view (Rockfall: 2 for
 * a land-form Yeti on an explored Mountain).
 */
function publicAttackMaximumRangeV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): number {
  const tile = tileAtView(view, unit.at);
  return attackMaximumRangeV7(
    view,
    unit,
    tile?.explored === true ? tile.terrain : undefined,
  );
}

/**
 * The public combat preview. Revision 17 section 6.7: when the attack sets
 * off a chain, the Overrun (Ram) continuation is evaluated after it.
 */
function publicCombatPreview(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options: CombatOptionsV7 = {},
): CombatPreviewV7 | null {
  const preview = publicCombatPreviewCore(
    view,
    attackerId,
    targetUnitId,
    options,
  );
  if (preview === null || !preview.overrunAdvance) return preview;
  const chain = publicAttackChainV7(view, preview);
  if (chain.preview.explosions.length === 0) return preview;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return preview;
  // The Candy redesign (section 6.1): only a role's own Overrun continues.
  const attackerUnit = view.units.find((unit) => unit.id === attackerId);
  const mayContinue =
    attackerUnit !== undefined &&
    overrunKindV7(unitRoleRuleV7(view, attackerUnit)) !== null;
  const overrunContinues =
    mayContinue &&
    chain.units.some((unit) => unit.id === attackerId) &&
    chain.units.some(
      (unit) =>
        unit.id !== attackerId &&
        unit.hp > 0 &&
        publicHostile(view, view.viewer.id, unit.ownerId) &&
        chebyshev(target.at, unit.at) === 1,
    );
  return {
    ...preview,
    overrunContinues,
    attacksRemaining: overrunContinues ? 1 : 0,
  };
}

interface PublicChainSimulationV7 {
  readonly blastUnit: (unit: PlayerViewV7["units"][number]) => BlastUnitV7;
  /** Records that the attack bites `unitId` for `biterId` (revision 14). */
  readonly bite: (unitId: UnitId, biterId: PlayerId) => void;
  /** The Bitten rising a land-form death leaves, or null. */
  readonly rise: (victim: BlastUnitV7) => BlastUnitV7 | null;
  /** The Infect rising of a land-form victim killed by `killerId`'s Zombie. */
  readonly infect: (victim: BlastUnitV7, killerId: PlayerId) => BlastUnitV7;
  readonly run: (
    units: readonly BlastUnitV7[],
    initial: readonly {
      readonly unit: BlastUnitV7;
      readonly cause: ExplosionCauseV7;
      readonly spared?: UnitId | undefined;
    }[],
    dependsOnUnexplored?: boolean,
    /** Field Defense the previewed command removed before the chain. */
    clearedFieldDefense?: readonly CoordV7[],
    /** The Martian revision: Shields the previewed command already spent. */
    shieldDamage?: ReadonlyMap<UnitId, number>,
  ) => ExplosionChainPreviewV7 & { readonly units: readonly BlastUnitV7[] };
  /**
   * The Mind Control revision section 4.2: `units` after the release of the
   * visible controlled units whose (visible) Brain is no longer among them:
   * back to a living original owner, or removed.
   */
  readonly collapse: (units: readonly BlastUnitV7[]) => BlastUnitV7[];
}

/**
 * Revision 17 public chain simulation over the viewer's visible units with
 * the canonical chain resolver. Risings get provisional negative IDs that
 * the preview reports as null.
 */
function createPublicChainSimulationV7(
  view: PlayerViewV7,
): PublicChainSimulationV7 {
  let provisional = 0;
  const bites = new Map(
    view.bitten.map((entry) => [entry.unitId, entry.biterPlayerId] as const),
  );
  const owners = new Map<UnitId, PlayerId>(
    view.units.map((unit) => [unit.id, unit.ownerId] as const),
  );
  const rising = (at: CoordV7, ownerId: PlayerId, hp: number): BlastUnitV7 => {
    provisional -= 1;
    const id = provisional as UnitId;
    owners.set(id, ownerId);
    // A rising is its seat's own `GUARD` (a role-level read).
    const rule = seatRoleRuleV7(view, ownerId, "GUARD");
    return {
      id,
      ownerId,
      role: "GUARD",
      form: "LAND",
      at: { x: at.x, y: at.y },
      hp: Math.min(hp, rule.maxHp),
    };
  };
  const rise = (victim: BlastUnitV7): BlastUnitV7 | null => {
    const biterId = bites.get(victim.id);
    return biterId === undefined || victim.form !== "LAND"
      ? null
      : rising(victim.at, biterId, BITTEN_RISING_HP_V7);
  };
  // The controlled units the viewer sees with their Brain (one whose Brain
  // is hidden cannot be seen to be released): each goes back to a living
  // original owner, or is removed when that owner was eliminated.
  const releasing = (
    units: readonly BlastUnitV7[],
  ): {
    readonly removed: readonly UnitId[];
    readonly released: readonly BlastUnitV7[];
  } => {
    if (view.mindControlled.length === 0) return { removed: [], released: [] };
    const byId = new Map(units.map((unit) => [unit.id, unit] as const));
    const removed: UnitId[] = [];
    const released: BlastUnitV7[] = [];
    for (const entry of view.mindControlled) {
      const unit = byId.get(entry.unitId);
      if (
        entry.brainUnitId === null ||
        unit === undefined ||
        unit.ownerId === entry.originalOwnerId
      )
        continue;
      const brain = byId.get(entry.brainUnitId);
      if (brain !== undefined && brain.ownerId === unit.ownerId) continue;
      const original = view.players.find(
        (player) => player.id === entry.originalOwnerId,
      );
      if (original?.status === "ACTIVE") {
        owners.set(unit.id, entry.originalOwnerId);
        released.push({ ...unit, ownerId: entry.originalOwnerId });
      } else removed.push(unit.id);
    }
    return { removed, released };
  };
  return {
    collapse: (units) => {
      const release = releasing(units);
      const released = new Map(
        release.released.map((unit) => [unit.id, unit] as const),
      );
      return units
        .filter((unit) => !release.removed.includes(unit.id))
        .map((unit) => released.get(unit.id) ?? unit);
    },
    blastUnit: (unit) => ({
      id: unit.id,
      ownerId: unit.ownerId,
      role: unit.role,
      form: unit.form,
      at: unit.at,
      hp: unit.hp,
      ...(unit.summoned === undefined ? {} : { summoned: unit.summoned }),
    }),
    bite: (unitId, biterId) => {
      bites.set(unitId, biterId);
    },
    rise,
    infect: (victim, killerId) =>
      rising(victim.at, killerId, INFECT_RISING_HP_V7),
    run: (
      units,
      initial,
      dependsOnUnexplored = false,
      clearedFieldDefense = [],
      shieldDamage = new Map(),
    ) => {
      const chain = resolveExplosionChainV7<BlastUnitV7>({
        roster: view,
        width: view.board.width,
        height: view.board.height,
        units,
        initial,
        shields:
          view.shields.length === 0
            ? undefined
            : new Map(
                view.shields.map((entry) => [
                  entry.unitId,
                  Math.max(
                    0,
                    entry.shield - (shieldDamage.get(entry.unitId) ?? 0),
                  ),
                ]),
              ),
        onRelease: view.mindControlled.length === 0 ? undefined : releasing,
        fieldDefense: (at) => {
          if (clearedFieldDefense.some((cleared) => same(at, cleared)))
            return false;
          const tile = tileAtView(view, at);
          return tile?.explored === true && tile.fieldDefense;
        },
        onDeath: (victim) => rise(victim),
      });
      const viewerId = view.viewer.id;
      const plunderCoins = technologyCapabilitiesV7(
        view.viewer.researchedTechs,
        view.viewer.faction,
      ).plunderCoins;
      const totals = {
        hostileDamage: 0,
        hostileKills: 0,
        friendlyDamage: 0,
        friendlyKills: 0,
        plunderCoins: 0,
      };
      let touchesUnexplored = dependsOnUnexplored;
      const explosions = chain.explosions.map(
        (explosion): ExplosionPreviewV7 => {
          if (
            blastAreaV7(explosion.at, view.board.width, view.board.height).some(
              (at) => tileAtView(view, at)?.explored !== true,
            )
          )
            touchesUnexplored = true;
          return {
            unitId: explosion.unitId,
            ownerId: explosion.ownerId,
            role: explosion.role,
            at: explosion.at,
            cause: explosion.cause,
            wave: explosion.wave,
            damage: explosion.damage,
            fieldDefenseDestroyed: explosion.fieldDefenseDestroyed,
            results: explosion.results.map((entry) => {
              const ownerId = owners.get(entry.unitId);
              if (ownerId === undefined) throw new RangeError("INVALID_STATE");
              const friendly =
                ownerId === viewerId ||
                arePlayersAlliedV7(view, viewerId, ownerId);
              if (friendly) {
                totals.friendlyDamage += entry.damage;
                if (entry.dies) totals.friendlyKills += 1;
              } else if (arePlayersHostileV7(view, viewerId, ownerId)) {
                totals.hostileDamage += entry.damage;
                if (entry.dies) {
                  totals.hostileKills += 1;
                  if (explosion.ownerId === viewerId)
                    totals.plunderCoins += plunderCoins;
                }
              }
              return {
                unitId: entry.unitId < 0 ? null : entry.unitId,
                ownerId,
                at: entry.at,
                damage: entry.damage,
                dies: entry.dies,
                friendly,
                shieldDamage: entry.shieldDamage,
              };
            }),
          };
        },
      );
      return {
        units: chain.units,
        explosions,
        totals,
        friendlyFire: totals.friendlyDamage > 0,
        touchesUnexplored,
      };
    },
  };
}

/**
 * Revision 17: the public board after an attack's damage, deaths, risings,
 * advance, and Push, and the chain its exploding victims set off (sections
 * 6.3 and 6.7), mirroring canonical resolution.
 */
function publicAttackChainV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
): {
  readonly preview: ExplosionChainPreviewV7;
  readonly units: readonly BlastUnitV7[];
} {
  const sim = createPublicChainSimulationV7(view);
  const attackerUnit = view.units.find(
    (unit) => unit.id === preview.attackerId,
  );
  const targetUnit = view.units.find(
    (unit) => unit.id === preview.targetUnitId,
  );
  if (attackerUnit === undefined || targetUnit === undefined)
    throw new RangeError("INVALID_STATE");
  const attacker = sim.blastUnit(attackerUnit);
  const target = sim.blastUnit(targetUnit);
  const splash = new Map(
    preview.splash.map((entry) => [entry.unitId, entry] as const),
  );
  const units: BlastUnitV7[] = [];
  const risings: BlastUnitV7[] = [];
  const initial: { unit: BlastUnitV7; cause: ExplosionCauseV7 }[] = [];
  if (preview.defenderBitten) sim.bite(target.id, attacker.ownerId);
  if (preview.attackerBitten) sim.bite(attacker.id, target.ownerId);
  // Deaths in canonical order: defender, splash victims, attacker.
  if (preview.defenderDies) {
    const rising = preview.defenderInfected
      ? sim.infect(target, attacker.ownerId)
      : sim.rise(target);
    if (rising !== null) risings.push(rising);
    // The Ice Folk revision section 5.5: a shattered unit never explodes.
    if (isExplodingUnitV7(view, target) && !preview.shatters)
      initial.push({ unit: target, cause: "DEATH" });
  }
  for (const unit of view.units) {
    if (unit.id === attacker.id || unit.id === target.id) continue;
    const entry = splash.get(unit.id);
    const blast = sim.blastUnit(unit);
    if (entry === undefined) units.push(blast);
    else if (!entry.dies) units.push({ ...blast, hp: blast.hp - entry.damage });
  }
  for (const entry of preview.splash) {
    if (!entry.dies) continue;
    const victim = view.units.find((unit) => unit.id === entry.unitId);
    if (victim === undefined) throw new RangeError("INVALID_STATE");
    const blast = sim.blastUnit(victim);
    const rising = sim.rise(blast);
    if (rising !== null) risings.push(rising);
    if (isExplodingUnitV7(view, blast))
      initial.push({ unit: blast, cause: "DEATH" });
  }
  if (preview.attackerDies) {
    const rising = preview.attackerInfected
      ? sim.infect(attacker, target.ownerId)
      : sim.rise(attacker);
    if (rising !== null) risings.push(rising);
    if (isExplodingUnitV7(view, attacker))
      initial.push({ unit: attacker, cause: "DEATH" });
  } else
    // Revision 19 Grow: a surviving Dinosaur attacker grows before the
    // chain (the defender and every hostile splash death count). Revision
    // 20: growing fully heals, and a Charge! follows a pushed target
    // (`advances`).
    units.push({
      ...attacker,
      // The Candy revision section 8: a bounced attacker stands one tile
      // back when the chain resolves.
      at:
        preview.bounce === "WILL_BOUNCE" && preview.bounceTo !== null
          ? preview.bounceTo
          : preview.advances
            ? target.at
            : attacker.at,
      hp: grownHpV7(
        view,
        attackerUnit,
        attackerUnit.kills,
        attackerUnit.kills +
          (preview.defenderDies ? 1 : 0) +
          preview.splash.filter((entry) => {
            const victim = view.units.find((unit) => unit.id === entry.unitId);
            return (
              entry.dies &&
              victim !== undefined &&
              publicHostile(view, attackerUnit.ownerId, victim.ownerId)
            );
          }).length,
        attacker.hp - preview.damageToAttacker + preview.attackerHeal,
      ),
    });
  if (!preview.defenderDies)
    units.push({
      ...target,
      at:
        preview.push === "WILL_PUSH"
          ? attackKnocksBackV7(view, attackerUnit)
            ? knockbackDestinationV7(attacker.at, target.at)
            : {
                x: target.at.x * 2 - attacker.at.x,
                y: target.at.y * 2 - attacker.at.y,
              }
          : target.at,
      hp: grownHpV7(
        view,
        targetUnit,
        targetUnit.kills,
        targetUnit.kills + (preview.attackerDies ? 1 : 0),
        target.hp - preview.damageToDefender + preview.defenderHeal,
      ),
    });
  units.push(...risings);
  // The Martian revision section 10.8: a Pierce whose tile behind the target
  // is unexplored may hit a hidden unit.
  const pierceAt = attackHasPierceV7(
    unitRoleRuleV7(view, attackerUnit),
    attackerUnit,
  )
    ? pierceTileV7(attacker.at, target.at)
    : null;
  const pierceTile = pierceAt === null ? undefined : tileAtView(view, pierceAt);
  const splashRingUnexplored =
    (unitRoleMechanicsV7(view, attackerUnit).splash &&
      blastAreaV7(target.at, view.board.width, view.board.height).some(
        (at) => tileAtView(view, at)?.explored !== true,
      )) ||
    (pierceTile !== undefined && !pierceTile.explored);
  // The attack's primary Field Defense rules (CATAPULT, INSPIRED,
  // EXPLOSIVES, OCCUPATION) resolve before the chain, as canonically.
  const targetTile = tileAtView(view, target.at);
  const distance = chebyshev(attacker.at, target.at);
  const primaryDefenseLost =
    targetTile?.explored === true &&
    targetTile.fieldDefense &&
    // The ninth unit (7r55): the role mechanic (the `CATAPULT` role of
    // every faction, and the Triceratops in the heavy slot).
    (unitRoleMechanicsV7(view, attackerUnit).demolishesFieldDefense ||
      // The Ice Folk revision section 7.5: Trample.
      preview.sweep ||
      (preview.inspiredApplied && distance === 1 && !preview.attackerDies) ||
      // Tuning 1 Breach (7r46): whether or not the attacker survives.
      attackBreachesV7(
        view,
        attackerUnit,
        distance,
        view.viewer.researchedTechs,
      ) ||
      preview.advances);
  const chain = sim.run(
    // The controlled units of a Brain the attack removed are released before
    // the chain.
    sim.collapse(units),
    initial,
    splashRingUnexplored ||
      (initial.length > 0 && preview.push === "UNKNOWN_BEHIND_FOG"),
    primaryDefenseLost ? [target.at] : [],
    new Map([
      [target.id, preview.defenderShieldDamage],
      [attacker.id, preview.attackerShieldDamage],
      ...preview.splash.map(
        (entry) => [entry.unitId, entry.shieldDamage] as const,
      ),
    ]),
  );
  const { units: after, ...chainPreview } = chain;
  return { preview: chainPreview, units: after };
}

function publicAdvanceDestinationLegal(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  at: CoordV7,
): boolean {
  const tile = tileAtView(view, at);
  // The advance goes through the shared `canEnterTerrainV7` (a striding
  // Colossus enters a Mountain without Engineering).
  return (
    tile?.explored === true &&
    ((tile.terrain !== "MOUNTAIN" && tile.terrain !== "RIFT") ||
      canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode: unitMovementModeV7(view, attacker),
        afloat: false,
        engineering: view.viewer.researchedTechs.includes("ENGINEERING"),
        navigation: false,
        mountainBorn: unitIsMountainBornV7(view, attacker),
        ice: false,
      }))
  );
}

function publicPushState(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  defender: PlayerViewV7["units"][number],
  survivesMelee: boolean,
): CombatPreviewV7["push"] {
  // Revision 19 section 6.2: an Egg is never pushed. Revision 20: a Charge!
  // pushes like a `PUSH` attacker.
  // Map curiosities (section 8.6): nothing moves the neutral Monster.
  if (
    !survivesMelee ||
    defender.form === "EGG" ||
    isNeutralOwnerV7(defender.ownerId) ||
    // The ninth unit (7r55): Rock Hard, nothing moves a Jawbreaker.
    unitIsImmovableV7(view, defender) ||
    (!unitRoleRuleV7(view, attacker).abilities.includes("PUSH") &&
      !attackIsChargeV7(view, attacker))
  )
    return "BLOCKED";
  const behind = {
    x: defender.at.x * 2 - attacker.at.x,
    y: defender.at.y * 2 - attacker.at.y,
  };
  const tile = tileAtView(view, behind);
  if (tile === undefined) return "BLOCKED";
  if (!tile.explored) return "UNKNOWN_BEHIND_FOG";
  // The frozen sea (naval branch section 8.9): nothing moves an icebound
  // unit, whatever is behind it (exact: the ice under a visible unit is
  // public).
  if (unitIsIceboundV7(view, defender)) return "BLOCKED";
  // Revision 20: a Charge! reads the explored tile as resolution does (every
  // unit on an explored tile is visible), so its Push and follow preview is
  // exact; the Juggernaut-role Push keeps its historical detection rule.
  if (!attackIsChargeV7(view, attacker) && !publicDetectionCovers(view, behind))
    return "UNKNOWN_BEHIND_FOG";
  // The frozen sea (naval branch sections 8.3 and 8.9): ice is ground for
  // a land-form unit and closed to a unit afloat, and nothing moves an
  // icebound unit (the ice on an explored tile is public).
  if (unitIsIceboundV7(view, defender)) return "BLOCKED";
  const ice = isIceAtV7(view, behind);
  const water = tile.biome === null && !ice;
  if (
    (defender.form === "LAND" && water) ||
    (defender.form !== "LAND" && !water)
  )
    return "BLOCKED";
  if (
    tile.site !== null ||
    // The Dwarf revision section 5.3: the occupancy predicate.
    tileOccupiedV7(view, behind, defender.id) ||
    (tile.territoryOwnerId !== null &&
      publicAllied(view, defender.ownerId, tile.territoryOwnerId))
  )
    return "BLOCKED";
  // The Rift (RULESET_7_RIFT.md section 4): only a flyer is pushed onto a
  // Rift (the shared `canEnterTerrainV7`; movement modes are public).
  if (
    tile.terrain === "RIFT" &&
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(view, defender),
      afloat: false,
      engineering: false,
      navigation: false,
      mountainBorn: false,
      ice: false,
    })
  )
    return "BLOCKED";
  // The Martian revision: a walker or flyer is pushed onto a Mountain
  // whatever its owner has researched (the shared `canEnterTerrainV7`); the
  // Ice Folk revision section 7.1: so is a Mountain-born unit.
  const strides = unitMayEnterMountainV7(view, defender, false);
  if (
    tile.terrain === "MOUNTAIN" &&
    !strides &&
    defender.ownerId !== view.viewer.id
  )
    return "UNKNOWN_BEHIND_FOG";
  if (
    tile.terrain === "MOUNTAIN" &&
    !unitMayEnterMountainV7(
      view,
      defender,
      view.viewer.researchedTechs.includes("ENGINEERING"),
    )
  )
    return "BLOCKED";
  if (tile.terrain === "DEEP_WATER" && !ice) {
    if (defender.ownerId !== view.viewer.id) return "UNKNOWN_BEHIND_FOG";
    if (!view.viewer.researchedTechs.includes("NAVIGATION")) return "BLOCKED";
  }
  return "WILL_PUSH";
}

/**
 * The Dwarf revision section 10.1: the public Knockback of an own Steam
 * Cannon's attack, mirroring {@link knockbackStateV7}: every unit and mound
 * on an explored tile is visible, so the result is exact except where the
 * target owner's private technologies decide (a hostile target pushed onto
 * a Mountain or Deep Water: `UNKNOWN_BEHIND_FOG`).
 */
function publicKnockbackState(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  defender: PlayerViewV7["units"][number],
  survives: boolean,
): CombatPreviewV7["push"] {
  if (
    !survives ||
    defender.form === "EGG" ||
    defender.role === "JUGGERNAUT" ||
    // Map curiosities round 2 (section 31): nor a neutral unit.
    isNeutralOwnerV7(defender.ownerId) ||
    unitCapacitySlotsV7(view, defender) !== 1 ||
    // The ninth unit (7r55): Rock Hard.
    unitIsImmovableV7(view, defender)
  )
    return "BLOCKED";
  const behind = knockbackDestinationV7(attacker.at, defender.at);
  const tile = tileAtView(view, behind);
  if (tile === undefined) return "BLOCKED";
  if (!tile.explored) return "UNKNOWN_BEHIND_FOG";
  // The frozen sea (naval branch sections 8.3 and 8.9): ice is ground for
  // a land-form unit and closed to a unit afloat, and nothing moves an
  // icebound unit (the ice on an explored tile is public).
  if (unitIsIceboundV7(view, defender)) return "BLOCKED";
  const ice = isIceAtV7(view, behind);
  const water = tile.biome === null && !ice;
  if (
    isAfloatFormV7(defender.form) !== water ||
    tile.site !== null ||
    tileOccupiedV7(view, behind, defender.id) ||
    view.treasureChests.some((chest) => same(chest, behind)) ||
    (tile.territoryOwnerId !== null &&
      publicAllied(view, defender.ownerId, tile.territoryOwnerId))
  )
    return "BLOCKED";
  if (
    tile.terrain === "RIFT" &&
    !canEnterTerrainV7({
      terrain: tile.terrain,
      movementMode: unitMovementModeV7(view, defender),
      afloat: false,
      engineering: false,
      navigation: false,
      mountainBorn: false,
      ice: false,
    })
  )
    return "BLOCKED";
  if (tile.terrain === "MOUNTAIN") {
    if (
      !unitMayEnterMountainV7(view, defender, false) &&
      defender.ownerId !== view.viewer.id
    )
      return "UNKNOWN_BEHIND_FOG";
    if (
      !unitMayEnterMountainV7(
        view,
        defender,
        view.viewer.researchedTechs.includes("ENGINEERING"),
      )
    )
      return "BLOCKED";
  }
  if (tile.terrain === "DEEP_WATER" && !ice) {
    if (defender.ownerId !== view.viewer.id) return "UNKNOWN_BEHIND_FOG";
    if (!view.viewer.researchedTechs.includes("NAVIGATION")) return "BLOCKED";
  }
  return "WILL_PUSH";
}

function publicDetectionCovers(view: PlayerViewV7, at: CoordV7): boolean {
  return (
    view.cities.some(
      (city) => city.ownerId === view.viewer.id && chebyshev(city.at, at) <= 1,
    ) ||
    view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        // Revision 19: an Egg has Sight 0 and detects nothing.
        unit.form !== "EGG" &&
        chebyshev(unit.at, at) <=
          (unit.form === "LAND" && unit.role === "RAIDER" ? 2 : 1),
    )
  );
}

function publicAllied(
  view: PlayerViewV7,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return cooperativeAlliesV7(
    view.setup.aiMode,
    view.humanPlayerId,
    left,
    right,
  );
}

function rationalToHalfUnits(value: {
  numerator: number;
  denominator: number;
}): number {
  const result = (value.numerator * 2) / value.denominator;
  if (!Number.isInteger(result)) throw new RangeError("Non-half-unit stat");
  return result;
}

function roundHalfUpPublic(numerator: bigint, denominator: bigint): number {
  return Number((2n * numerator + denominator) / (2n * denominator));
}

function publicCommandTarget(view: PlayerViewV7, command: CommandV7): CoordV7 {
  if ("at" in command) return command.at;
  if (
    command.kind === "BEAM_DOWN" ||
    command.kind === "TUNNEL" ||
    command.kind === "BOMB_RUN" ||
    command.kind === "ASSEMBLE" ||
    command.kind === "BUILD_BARRICADE"
  )
    return command.to;
  if ("path" in command) return command.path.at(-1) ?? { x: -1, y: -1 };
  if ("targetUnitId" in command)
    return (
      view.units.find((unit) => unit.id === command.targetUnitId)?.at ?? {
        x: -1,
        y: -1,
      }
    );
  if ("cityId" in command)
    return (
      view.cities.find((city) => city.id === command.cityId)?.at ?? {
        x: -1,
        y: -1,
      }
    );
  return { x: -1, y: -1 };
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const curiosityKeyV7 = (at: CoordV7): string => `${at.y},${at.x}`;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
