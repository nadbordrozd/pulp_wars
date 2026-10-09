import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  BEAM_DOWN_PICKUP_RANGE_V7,
  EGG_DEFENSE2_V7,
  EGG_HP_V7,
  EMBARKED_LANDING_MAX_SPENT_V7,
  EMBARKED_MOVE_V7,
  GROWTH_HP_V7,
  GROWTH_KILLS_V7,
  BOLAS_RANGE_V7,
  COLD_SNAP_RANGE_V7,
  MIND_CONTROL_HP_V7,
  FORCE_FIELD_SHIELD_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_LIMIT_V7,
  armouredDamageV7,
  isMindControlledV7,
  effectiveRoleRuleV7,
  cityUnitCapacityForV7,
  HUMAN_ONLY_ROLES_V7,
  factionTreeV7,
  isRallyTargetV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  unitMovementModeV7,
  unitTakesCoverV7,
  unitAlphaAttack2V7,
  SNOW_COVER_V7,
  terrainGivesCoverV7,
  terrainStopsMoveV7,
  isIceAtV7,
  factionUnlocksRoleV7,
  unitIsIceboundV7,
  unitCapacitySlotsV7,
  unitIsMountainBornV7,
  unitIsSluggishV7,
  unitMayActAfterMoveV7,
  unitMayEnterMountainV7,
  unitRoleMechanicsV7,
  factionRulesV7,
  unitFactionV7,
  unitGrowsV7,
  unitIsBlastProofV7,
  roleDefense2AtDistanceV7,
  unitRoleRuleV7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  type BasicEconomicCommandKindV7,
  type EffectiveRoleRuleV7,
  type RoleMechanicsV7,
  type SpatialEconomicCommandKindV7,
  cityBarracksV7,
  CITY_REWARD_COINS_V7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { knockbackDestinationV7 } from "../engine/v7/dwarf";
import { crackedDefense2V7, unitIsCrackedV7 } from "../engine/v7/ninth-unit";
import { publicUnitHasTerrainCoverV7 } from "../engine/v7/units";
import { cooperativeAlliesV7, marketCoinsV7 } from "../engine/v7/economy";
import { forbiddenTechnologiesV7 } from "../engine/v7/forbidden-technologies";
import type { CombatPreviewV7 } from "../engine/v7/events";
import {
  blizzardHalvedDamageV7,
  blizzardProtectsV7,
  deepSnowStopsUnitV7,
  unitAvoidsForeignSitesV7,
  unitGlidesV7,
  unitIgnoresZocStopsV7,
  unitOwnerIsIceFolkV7,
} from "../engine/v7/ice-folk";
import { validatePlayerMovementPassagePathV7 } from "../engine/v7/movement";
import {
  createPublicCommandWorkV7,
  createPublicPlanningWorkV7,
  createPublicRedevelopmentPossibilityWorkV7,
  previewAttackExplosionsV7,
  previewAssembleV7,
  previewBombRunV7,
  previewEconomicV7,
  previewWhirlV7,
  previewKaboomV7,
  previewBlastMountainV7,
  previewMonumentV7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  queryPublicEconomicPotentialsV7,
  queryPublicPlannedImprovementV7,
  queryPublicRedevelopmentChangesImprovementV7,
  queryTechnologyTreeV7,
  scorePublicSpatialPlanV7,
  type PublicPlannedImprovementV7,
} from "../engine/v7/query";
import {
  COMMAND_KIND_ORDER_V7,
  NAVAL_ROLE_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  cityHasWallsV7,
  type CoordV7,
  type ImprovementIdV7,
  type NavalRoleIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import {
  spatialContributionAtV7,
  type EconomyGraphV7,
} from "../engine/v7/spatial-economy";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
import {
  ARMY_ALERT_RADIUS_V7,
  ARMY_APPROACH_PRIORITY_V7,
  ARMY_APPROACH_RADIUS_V7,
  ARMY_ENGAGE_PRIORITY_V7,
  ARMY_ESCORT_MAXIMUM_V7,
  ARMY_ESCORT_VALUE_V7,
  ARMY_FIRING_POSITION_PRIORITY_V7,
  ARMY_GARRISON_RADIUS_V7,
  ARMY_HUNT_ATTACK_PRIORITY_V7,
  ARMY_HUNT_MOVE_PRIORITY_V7,
  ARMY_HUNT_REACH_V7,
  ARMY_PRESSURE_RADIUS_V7,
  ARMY_RESEARCH_HOLD_TURNS_V7,
  ARMY_RESEARCH_PRIORITY_V7,
  ARMY_SUPPORT_RADIUS_V7,
  ARMY_TRAINING_PRIORITY_V7,
  ARMY_VACATE_PRIORITY_V7,
  ARMY_BREAKTHROUGH_MOVE_PRIORITY_V7,
  ARMY_CHEAP_GROWTH_COINS_V7,
  ARMY_COMING_RADIUS_V7,
  ARMY_COMMIT_ADVANCE_PRIORITY_V7,
  ARMY_COMMIT_FIRE_MOVE_PRIORITY_V7,
  ARMY_COMMIT_FIRE_PRIORITY_V7,
  ARMY_COMMIT_MELEE_MOVE_PRIORITY_V7,
  ARMY_COMMIT_MELEE_PRIORITY_V7,
  ARMY_DUE_RESEARCH_PRIORITY_V7,
  ARMY_EXPANSION_CITIES_V7,
  ARMY_FRAGILE_TARGET_VALUE_V7,
  ARMY_GANG_UP_STRENGTH_V7,
  ARMY_GROWTH_PRIORITY_V7,
  ARMY_LATE_VILLAGE_PRIORITY_V7,
  ARMY_NEAR_RADIUS_V7,
  ARMY_NEAR_THREAT_RADIUS_V7,
  ARMY_POSITION_LINK_V7,
  ARMY_POSITION_SPAN_V7,
  ARMY_PRESSED_RADIUS_V7,
  ARMY_RICH_ARMY_RATIO_V7,
  ARMY_CENTER_HOLDER_VALUE_MAXIMUM_V7,
  ARMY_CENTER_HOLDER_WORTH_V7,
  ARMY_LATE_RESEARCH_V7,
  ARMY_RETAKE_RADIUS_V7,
  ARMY_KNIGHT_SHY_MAXIMUM_V7,
  ARMY_VILLAGE_DELIVERY_PRIORITY_V7,
  ARMY_VILLAGE_FERRY_PRIORITY_V7,
  ARMY_VILLAGE_DELIVERY_GAIN_V7,
  ARMY_EMPTY_CENTER_PRIORITY_V7,
  ARMY_RANGED_ENEMY_UNITS_V7,
  ARMY_RETAKE_UNITS_V7,
  ARMY_BATTERY_PRIORITY_V7,
  ARMY_BATTERY_REACH_V7,
  ARMY_BOMBER_MELEE_COST_V7,
  ARMY_BOMBER_NEIGHBOUR_COST_V7,
  ARMY_CONTESTED_RADIUS_V7,
  ARMY_HELPLESS_GARRISON_DIVISOR_V7,
  ARMY_GARRISON_HIT_VALUE_V7,
  ARMY_MASSED_RANKS_V7,
  ARMY_CAPITAL_GROWTH_LEVEL_V7,
  ARMY_CAPITAL_GROWTH_VALUE_V7,
  ARMY_BOMB_FIRE_PRIORITY_V7,
  ARMY_BOMB_MOVE_PRIORITY_V7,
  ARMY_GARRISON_TRAINING_VALUE_V7,
  ARMY_PULL_BACK_PRIORITY_V7,
  ARMY_SPENT_ATTACK_PRIORITY_V7,
  ARMY_SIEGE_TARGET_VALUE_V7,
  ARMY_RICH_ARMY_V7,
  ARMY_RICH_INCOME_V7,
  ARMY_RICH_RESEARCH_ROUNDS_V7,
  ARMY_WAR_RESEARCH_SPARE_TURNS_V7,
  ARMY_RESEARCH_FLOOR_GATES_V7,
  ARMY_WAR_RESEARCH_ROUNDS_V7,
  ARMY_ALONE_RADIUS_V7,
  ARMY_COVERED_CENTER_SHOOTERS_V7,
  ARMY_RAID_PRIORITY_V7,
  ARMY_RALLY_PRIORITY_V7,
  ARMY_REGROUP_PRIORITY_V7,
  ARMY_RESEARCH_ROLES_V7,
  ARMY_ROADS_AFTER_ROLES_V7,
  ARMY_ROADS_CITIES_V7,
  ARMY_RETAKE_CENTER_PRIORITY_V7,
  ARMY_SPLASH_SPACING_VALUE_V7,
  ARMY_COVER_UNITS_V7,
  ARMY_STORM_FIRE_PRIORITY_V7,
  ARMY_STORM_PRIORITY_V7,
  ARMY_STORM_RADIUS_V7,
  ARMY_STORM_SHOOTER_RADIUS_V7,
  ARMY_STORM_UNITS_MAXIMUM_V7,
  ARMY_STORM_UNITS_V7,
  ARMY_TOPUP_TRAINING_PRIORITY_V7,
  ARMY_UNDUE_RESEARCH_PRIORITY_V7,
  ARMY_VILLAGE_PRIORITY_V7,
  ARMY_DEAR_UNIT_ARMY_V7,
  ARMY_FRAGILE_HOSTILES_V7,
  ARMY_REWARD_UNIT_COST_V7,
  ARMY_ZOMBIE_BITE_VALUE_V7,
  ARMY_ECONOMY_FORESTRY_WEIGHT_V7,
  ARMY_BANSHEE_APPROACH_PRIORITY_V7,
  ARMY_BANSHEE_APPROACH_RADIUS_V7,
  ARMY_CURE_TRAINING_VALUE_V7,
  ARMY_PESTILENCE_LICHES_V7,
  ARMY_FORCE_FIELDS_PROJECTORS_V7,
  ARMY_MARTIAN_HEAVY_CAP_COST_V7,
  ARMY_MARTIAN_STURDY_V7,
  armyMartianHeavyCappedV7,
  ARMY_DINOSAUR_ALONE_RADIUS_V7,
  ARMY_DINOSAUR_CENTER_FAST_RADIUS_V7,
  ARMY_DINOSAUR_CHARGER_REACH_V7,
  ARMY_DINOSAUR_CROWDED_FREE_SLOTS_V7,
  ARMY_DINOSAUR_CROWDED_UNITS_V7,
  ARMY_DINOSAUR_DEFENCE_RADIUS_V7,
  ARMY_DINOSAUR_DEFENDER_MAXIMUM_V7,
  ARMY_DINOSAUR_PACK_CAVEMEN_V7,
  ARMY_DINOSAUR_PACK_REACH_V7,
  ARMY_DINOSAUR_STURDY_V7,
  ARMY_DINOSAUR_CHARGER_ROLE_V7,
  ARMY_NESTING_DEFENDERS_V7,
  ARMY_WALLBREAKER_CHARGERS_V7,
  ARMY_CARRIER_KEEP_OUT_PRIORITY_V7,
  ARMY_STEP_BACK_PRIORITY_V7,
  ARMY_HEAT_SINKS_RAY_GUNNERS_V7,
  ARMY_SWAP_PRIORITY_V7,
  ARMY_VILLAGES_FIRST_DANGER_V7,
  ARMY_VILLAGES_FIRST_REACH_V7,
  ARMY_VILLAGES_FIRST_ROUNDS_V7,
  ARMY_UNDEAD_SPARE_UNITS_V7,
  ARMY_UNDEAD_WAR_RESEARCH_GRACE_V7,
  ARMY_UNDEAD_GROWTH_FIRST_TECHNOLOGIES_V7,
  ARMY_NECROMANCER_GRAVES_V7,
  ARMY_NECROMANCER_GRAVE_REACH_V7,
  ARMY_NECROMANCER_TRAINING_VALUE_V7,
  ARMY_RESEARCH_BEFORE_CAPTURE_PRIORITY_V7,
  armyAssaultModeV7,
  armyClassV7,
  armyShareClassV7,
  armyCountsV7,
  armyDinosaurDefenderCappedV7,
  armyIceFolkDefenderCappedV7,
  ARMY_ICE_FOLK_DEFENDER_CAP_COST_V7,
  ARMY_ICE_FOLK_STURDY_V7,
  ARMY_DWARF_STURDY_V7,
  armyPlayFactionV7,
  armyResearchDueV7,
  armyGarrisonYieldsToRangedV7,
  armyRoleScoreV7,
  armySharesV7,
  armyUnitStrengthV7,
  type ArmyAssaultModeV7,
  type ArmyCountsV7,
} from "./v7-army";
import {
  CAMPAIGN_FRONT_DEFENSE_RADIUS_V7,
  campaignHasWorkAtV7,
  campaignHoldsMoveV7,
  campaignPlanForPolicyV7,
  campaignRouteProgressV7,
  type CampaignJobV7,
  type CampaignPlanV7,
} from "./v7-campaign";
import {
  ENDGAME_APPROACH_PRIORITY_V7,
  ENDGAME_VACATE_PRIORITY_V7,
  endgamePlanForPolicyV7,
  endgameRouteDistanceV7,
  endgameTargetAtV7,
  endgameTargetDistanceV7,
  type EndgamePlanV7,
} from "./v7-endgame";
import {
  CHOKEPOINT_ATTACK_BIAS_V7,
  CHOKEPOINT_COMMIT_PRIORITY_V7,
  CHOKEPOINT_FIRE_PRIORITY_V7,
  CHOKEPOINT_LANE_PRIORITY_V7,
  CHOKEPOINT_ROTATE_PRIORITY_V7,
  CHOKEPOINT_SIEGE_TARGET_V7,
  CHOKEPOINT_TRAINING_BIAS_V7,
  chokepointApronBlockerV7,
  chokepointApronJammedV7,
  chokepointApronV7,
  chokepointAssaultV7,
  chokepointStrengthV7,
  chokepointFitV7,
  chokepointFocusV7,
  chokepointTargetsInRangeV7,
  chokepointPlaceAllowedV7,
  chokepointPlanForPolicyV7,
  chokepointShouldVacateV7,
  chokepointUnitClassV7,
  type ChokepointPlanV7,
} from "./v7-chokepoint";
import {
  CLEAN_BOMB_STRIKE_PRIORITY_V7,
  COIN_STRATEGIC_VALUE_V7,
  FRIENDLY_FIRE_TRADE_FACTOR_V7,
  FRIENDLY_SPLASH_PRIORITY_DEMOTION_V7,
  GANG_UP_KILL_SETUP_PRIORITY_V7,
  GANG_UP_SETUP_PRIORITY_V7,
  GANG_UP_STRIKE_PRIORITY_V7,
  GOBLIN_HORDE_TRAINING_BIAS_V7,
  GOBLIN_HORDE_TRAINING_MAXIMUM_V7,
  GOBLIN_BOMB_CHUCKER_TRAINING_BIAS_V7,
  GOBLIN_TRAINING_BIAS_V7,
  KABOOM_CAPTURE_PRIORITY_V7,
  KABOOM_CAPTURE_VALUE_V7,
  KABOOM_CHIP_MARGIN_V7,
  KABOOM_CHIP_PRIORITY_V7,
  KABOOM_CITY_SAVE_PRIORITY_V7,
  KABOOM_CITY_SAVE_VALUE_V7,
  KABOOM_DOOMED_PRIORITY_V7,
  KABOOM_KILL_PRIORITY_V7,
  KABOOM_MULTI_KILL_PRIORITY_V7,
  KABOOM_SETUP_PRIORITY_V7,
  KABOOM_CLUSTER_HITS_V7,
  WAAAGH_SETUP_PRIORITY_V7,
  deathBlastDamageV7,
  explosionChainValueV7,
  friendlyFireBomberV7,
  gangUpAttackerV7,
  gangUpForPolicyV7,
  gangUpHelperWeightV7,
  gangUpWithHelpersV7,
  goblinMatchForPolicyV7,
  hostileKaboomExposureV7,
  hypotheticalBlastV7,
  kaboomDamageV7,
  regenerationV7,
  type ExplosionChainValueV7,
} from "./v7-goblin";
import {
  ACID_TARGET_VALUE_V7,
  EGG_GUARD_PRIORITY_V7,
  EGG_SMASH_SETUP_PRIORITY_V7,
  GROWN_RETREAT_PRIORITY_V7,
  HATCH_APPROACH_PRIORITY_V7,
  CHARGE_APPROACH_PRIORITY_V7,
  CHARGE_BREAKER_PRIORITY_V7,
  CHARGE_CAPTURER_NEAR_VALUE_V7,
  CHARGE_FIELD_DEFENSE_VALUE_V7,
  CHARGE_PUSH_CENTER_PRIORITY_V7,
  CHARGE_PUSH_CENTER_VALUE_V7,
  CHARGE_RUN_UP_CHIP_PRIORITY_V7,
  CHARGE_RUN_UP_KILL_PRIORITY_V7,
  NESTING_EGG_VALUE_V7,
  NESTING_RESEARCH_PRIORITY_V7,
  NESTING_SLOT_VALUE_V7,
  WALLBREAKER_CHARGER_VALUE_V7,
  WALLBREAKER_RESEARCH_PRIORITY_V7,
  WALLBREAKER_WALLED_CITY_VALUE_V7,
  WOUNDED_DINOSAUR_KILL_DIVISOR_V7,
  SIGNATURE_RESEARCH_CITIES_V7,
  SIGNATURE_RESEARCH_PRIORITY_V7,
  SIGNATURE_ROLES_V7,
  armouredForPolicyV7,
  chosenLayEggCommandsV7,
  dinosaurMatchForPolicyV7,
  dinosaurProductionAdjustmentV7,
  eggProtectionValueV7,
  eggStatusV7,
  eggTargetBonusV7,
  eggUnitValueV7,
  growthKillValueV7,
  growthStageForPolicyV7,
  grownUnitPremiumV7,
  hatchScoreV7,
  layEggAdjustmentV7,
  layEggTurnsV7,
  chargeRunUpForPolicyV7,
  packHuntForPolicyV7,
  ignoresWallsForPolicyV7,
  linebreakerV7,
  policySiegeRuleV7,
  policyTacticalRoleV7,
  technologyWithUnlockV7,
} from "./v7-dinosaur";
import {
  COOLING_RAY_ATTACK_BONUS_V7,
  FORCE_FIELD_COVER_VALUE_V7,
  MARTIAN_ROUTINE_MOVE_PRIORITY_V7,
  MIND_CONTROL_APPROACH_PRIORITY_V7,
  MIND_CONTROL_ESCAPE_PRIORITY_V7,
  PROJECTOR_COVER_VALUE_V7,
  PSYCHIC_COMMAND_DEFERRED_PRIORITY_V7,
  RAY_KITE_PRIORITY_V7,
  RAY_WASTED_KILL_PRIORITY_V7,
  RANGED_STEP_BACK_PRIORITY_V7,
  RETALIATION_SHIELD_COST_V7,
  SAUCER_STAGING_DISTANCE_V7,
  SHIELDLESS_RETREAT_PRIORITY_V7,
  SHIELD_BREAK_PRIORITY_V7,
  SHIELD_BREAK_RANGED_PRIORITY_V7,
  SHIELD_BREAK_VALUE_V7,
  STRIPPED_SHIELD_VALUE_V7,
  CONTROLLED_CHIP_PRIORITY_V7,
  MIND_CONTROL_SETUP_PRIORITY_V7,
  MIND_CONTROL_FIRST_CEILING_V7,
  MIND_CONTROL_FOCUS_MINIMUM_VALUE_V7,
  MIND_CONTROL_PRIORITY_V7,
  MIND_CONTROL_FOCUS_PRIORITY_V7,
  MIND_CONTROL_VALUE_WEIGHT_V7,
  RAY_SIEGE_PRIORITY_V7,
  MOTHERSHIP_GUARD_PRIORITY_V7,
  MOTHERSHIP_PULL_RADIUS_V7,
  WASTED_FULL_RAY_COST_V7,
  CARRIER_RESCUE_MOVE_PRIORITY_V7,
  BEAM_DOWN_EXTRACT_PRIORITY_V7,
  HEAVY_PULL_RADIUS_V7,
  SAUCER_PULL_RADIUS_V7,
  SHOOTER_CONTACT_COST_V7,
  TRACTOR_CAPTURE_MOVE_PRIORITY_V7,
  mobilityPlayV7,
  primaryUsedForPolicyV7,
  pullCaptureMoveV7,
  beamDownScoreV7,
  isMothershipForPolicyV7,
  isSaucerForPolicyV7,
  enemyTurnShieldV7,
  fliesForPolicyV7,
  hasAbilityV7,
  hostileRayAttack2V7,
  isRayUnitV7,
  heldByCityWallsForPolicyV7,
  martianArmyCountsV7,
  martianFactsV7,
  martianMatchForPolicyV7,
  martianPolicyOptionsV7,
  martianProductionAdjustmentV7,
  martianResearchV7,
  martianRetainedValueV7,
  martianTargetBonusV7,
  mindControlExposedV7,
  mindControlPlayV7,
  mindControlScoreV7,
  mindControlValueV7,
  policyUnitFactionV7,
  readyHostileBrainsV7,
  shieldMaximumForPolicyV7,
  tractorBeamScoreV7,
  wholeHitV7,
  type MartianArmyCountsV7,
  type MartianFactsV7,
  type MartianPolicyToolsV7,
} from "./v7-martian";
import {
  BOULDER_FORTIFICATION_VALUE_V7,
  FLANK_SETUP_VALUE_V7,
  FRAGILE_SNOW_COST_V7,
  ICE_OBJECTIVE_SCALE_V7,
  ICE_ROUTINE_MOVE_PRIORITY_V7,
  MAMMOTH_CHIP_OFFSET_V7,
  MELEE_CHIP_OFFSET_V7,
  ROCKFALL_PEAK_OBJECTIVE_V7,
  SABRETOOTH_BACKLINE_VALUE_V7,
  SABRETOOTH_ISOLATED_VALUE_V7,
  SHATTER_ESCAPE_PRIORITY_V7,
  SHATTER_KILL_VALUE_V7,
  SHATTER_SETUP_PRIORITY_V7,
  BOLAS_SHATTER_PRIORITY_V7,
  SNOW_HUNTER_CHIP_OFFSET_V7,
  SNOW_OBJECTIVE_V7,
  TRAMPLE_VALUE_V7,
  WITCH_CHILL_REACH_V7,
  WITCH_ESCORT_OBJECTIVE_V7,
  WITCH_FOCUS_PRIORITY_V7,
  WITCH_FOCUS_RANGED_PRIORITY_V7,
  WITCH_KILL_PRIORITY_V7,
  WITCH_MOVE_PRIORITY_V7,
  bolasScoreV7,
  chilledForPolicyV7,
  coldSnapScoreV7,
  compareKeysV7,
  fragileOnSnowV7,
  hasAbilityForIceV7,
  iceFolkArmyCountsV7,
  iceFolkFactsV7,
  iceFolkMatchForPolicyV7,
  iceFolkProductionAdjustmentV7,
  iceFolkResearchV7,
  iceFolkTargetBonusV7,
  isIceFolkUnitForPolicyV7,
  shatterLethalV7,
  shatterableNextTurnV7,
  shatterThresholdForPolicyV7,
  witchMoveKeyV7,
  type IceFolkArmyCountsV7,
  type IceFolkFactsV7,
  type IceFolkPolicyToolsV7,
} from "./v7-ice-folk";
import {
  ASSEMBLE_FAR_HOME_V7,
  ASSEMBLE_VALUE_V7,
  DWARF_ROUTINE_MOVE_PRIORITY_V7,
  ERUPTION_ESCAPE_PRIORITY_V7,
  GUNNER_CHIP_OFFSET_V7,
  KNOCKBACK_CENTER_VALUE_V7,
  KNOCKBACK_FIELD_DEFENSE_VALUE_V7,
  KNOCKBACK_MELEE_VALUE_V7,
  MACHINE_REPAIR_MINIMUM_V7,
  MACHINE_REPAIR_PRIORITY_V7,
  RANGED_RING_COST_V7,
  RIDER_STAGING_VALUE_V7,
  DIG_IN_THREAT_RADIUS_V7,
  bombThreatAtV7,
  dwarfArmyCountsV7,
  dwarfFactsV7,
  dwarfMatchForPolicyV7,
  dwarfPolicyOptionsV7,
  dwarfProductionAdjustmentV7,
  dwarfResearchV7,
  dwarfTargetBonusV7,
  engineerMoveValueV7,
  eruptionAtV7,
  meleeUnitV7,
  onTheGroundV7,
  planAssemblesV7,
  planBombRunsV7,
  planTunnelsV7,
  repairValueV7,
  type DwarfArmyCountsV7,
  type DwarfFactsV7,
  type DwarfPolicyToolsV7,
  type PlannedDwarfCommandV7,
} from "./v7-dwarf";
import { ninthUnitMoveValueV7, ownWightGraveHeldV7 } from "./v7-ninth-unit";
import {
  BOUNCE_COST_V7,
  CANDY_ROUTINE_MOVE_PRIORITY_V7,
  CRASHED_TARGET_VALUE_V7,
  CRUMBS_EAT_OBJECTIVE_V7,
  HOME_SWEET_HOME_THREAT_RADIUS_V7,
  PIE_FIRST_OFFSET_V7,
  candyArmyCountsV7,
  candyMatchForPolicyV7,
  candyPolicyOptionsV7,
  candyProductionAdjustmentV7,
  candyResearchV7,
  crashedForPolicyV7,
  crashedMoveValueV7,
  eatsCrumbsWorthV7,
  planSugarRushV7,
  rebakeApproachValueV7,
  rebakeScoreV7,
  rushedMovePlanV7,
  splatSavedHpV7,
  sugarTossScoreV7,
  type CandyPolicyToolsV7,
  type RushPlanV7,
} from "./v7-candy";
import {
  MONSTER_BOUNTY_FOR_POLICY_V7,
  MONSTER_REGENERATION_FOR_POLICY_V7,
  MONSTER_STEP_AWAY_PRIORITY_V7,
  curiosityErrandMoveV7,
  curiosityFactsV7,
  monsterProvokedAtV7,
  monstersThreateningV7,
  planCuriosityErrandsV7,
  soleCityDefenderV7,
  type CuriosityErrandV7,
  type CuriosityFactsV7,
} from "./v7-curiosities";
import {
  directivePlanForViewV7,
  leashReadyCommandsV7,
  type DirectivePlanV7,
} from "./v7-directives";
import {
  normalOpeningResearchPendingV7,
  normalOpeningTechnologyV7,
} from "./v7-opening";
import {
  BITE_VALUE_V7,
  BITTEN_RISING_VALUE_V7,
  DEVOUR_MINIMUM_HEAL_V7,
  PLAGUE_EXPOSURE_COST_V7,
  PLAGUE_DURATION_TURNS_V7,
  PLAGUE_SOURCE_TARGET_VALUE_V7,
  PLAGUE_TURNS_WORTH_CURING_V7,
  RAISE_DEAD_SKELETON_VALUE_V7,
  TEND_BITTEN_CURE_VALUE_V7,
  TEND_PLAGUE_TURN_CURE_VALUE_V7,
  devourHealV7,
  healthyLivingNeighboursV7,
  isNewBiteV7,
  plagueApplicationValueV7,
  plagueSourceVictimsV7,
  plaguedNeighboursV7,
  publicAfflictionsV7,
  publicTendValueV7,
  raiseDeadGravesV7,
  type PublicAfflictionsV7,
  hasLivingHostileSeatV7,
  hostileNecromancersNearV7,
  inOwnTerritoryForPolicyV7,
  isBansheeV7,
  isGhoulV7,
  isGraveAtV7,
  isLivingOwnerV7,
  isNecromancerV7,
  isPrimaryUnusedV7,
  isLichV7,
  isLichRoleV7,
  isSplashAttackerV7,
  isVampireV7,
  isZombieV7,
  PLAGUE_HUNT_RADIUS_V7,
  firingGapV7,
  plaguingLichesV7,
  offeredWailSummaryV7,
  ownNecromancersNearV7,
  projectedWailSummaryV7,
  publicDeathLeavesGraveV7,
  publicIdleRecoveryV7,
  raisableGravesAtV7,
  raiseDeadCountV7,
  undeadMatchForPolicyV7,
  wailPriorityV7,
} from "./v7-undead";

export const NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7 = 128;

const PRESERVED_REDEVELOPMENT_IMPROVEMENTS_V7 = new Set<ImprovementIdV7>([
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "MARKET",
  "MONUMENT",
  "PORT",
  "SHIPYARD",
]);

export type NormalPolicyErrorCodeV7 =
  "MISSING_FACTION_REGISTRATION" | "MISSING_ROLE_MAPPING" | "NO_PUBLIC_COMMAND";

export class NormalPolicyErrorV7 extends Error {
  readonly code: NormalPolicyErrorCodeV7;

  constructor(code: NormalPolicyErrorCodeV7, message: string) {
    super(message);
    this.name = "NormalPolicyErrorV7";
    this.code = code;
  }
}

export interface AiScoreV7 {
  readonly priority: number;
  readonly strategicValue: number;
  readonly immediateValue: number;
  readonly futureValue: number;
  readonly safetyValue: number;
  readonly objectiveValue: number;
  readonly deterministicTieBreak: readonly [
    number,
    number,
    number,
    number,
    number,
  ];
}

export interface ScoredAiCandidateV7 {
  readonly command: CommandV7;
  readonly score: AiScoreV7;
  readonly tuple: readonly number[];
}

export interface NormalAiDecisionV7 {
  readonly difficulty: "NORMAL";
  readonly candidates: readonly ScoredAiCandidateV7[];
  readonly command: CommandV7 | null;
  readonly prngDraws: 0;
}

interface ThreatV7 {
  readonly cityId: CityId;
  readonly unitId: UnitId;
  readonly severity: 1 | 2 | 3;
}

interface PolicyContextV7 {
  readonly view: PlayerViewV7;
  /** Revision 13: a seat is Undead; all Undead heuristics are gated on it. */
  readonly undead: boolean;
  /** Revision 14: public Plague and Bitten statuses (empty without Undead). */
  readonly afflictions: PublicAfflictionsV7;
  /**
   * Revision 17 (`pulp_wars-0ao.6`): a seat is Goblin; all Goblin heuristics
   * are gated on it.
   */
  readonly goblin: boolean;
  /** Goblin matches: per-decision caches of public attack and danger facts. */
  readonly goblinAttackFacts: Map<string, GoblinAttackFactsV7>;
  readonly goblinDoomed: Map<UnitId, boolean>;
  /**
   * Revision 19 (`pulp_wars-c87.5`): a seat is Dinosaur; all Dinosaur
   * heuristics are gated on it.
   */
  readonly dinosaur: boolean;
  /** Dinosaur matches: per-decision public Egg facts. */
  dinosaurFacts: DinosaurFactsV7 | null;
  /**
   * The Martian revision (`pulp_wars-t6s.3`): a seat is Martian; all
   * Martian heuristics are gated on it.
   */
  readonly martian: boolean;
  /** Martian matches: per-decision public Martian facts and caches. */
  martianCache: MartianContextCacheV7 | null;
  /**
   * The Ice Folk revision (`pulp_wars-7g3.4`): a seat is Ice Folk; all Ice
   * Folk heuristics are gated on it.
   */
  readonly iceFolk: boolean;
  /** Ice Folk matches: per-decision public Ice Folk facts and caches. */
  iceFolkCache: IceFolkContextCacheV7 | null;
  /**
   * The Dwarf revision (`pulp_wars-78i.4`): a seat is Dwarf; all Dwarf
   * heuristics are gated on it (and on the switch of `src/ai/v7-dwarf.ts`).
   */
  readonly dwarf: boolean;
  /** Dwarf matches: per-decision public Dwarf facts and plans. */
  dwarfCache: DwarfContextCacheV7 | null;
  /**
   * The Candy revision (`pulp_wars-jdb.4`): a seat is Candy; all Candy
   * heuristics are gated on it (and on the switch of `src/ai/v7-candy.ts`).
   */
  readonly candy: boolean;
  /** Candy matches: per-decision public Candy plans. */
  candyCache: CandyContextCacheV7 | null;
  /** `pulp_wars-1mc`: public endgame siege targets, or null outside it. */
  readonly endgame: EndgamePlanV7 | null;
  /**
   * `pulp_wars-68k.6`: the single-file front the seat besieges
   * (`src/ai/v7-chokepoint.ts`), or null on every board without one.
   */
  readonly chokepoint: ChokepointPlanV7 | null;
  /** `pulp_wars-68k.6`: the focus of this turn's fire (cached). */
  chokepointFocus: PublicUnitV7 | null | undefined;
  /** `pulp_wars-68k.6`: the firing tiles the siege units claim (cached). */
  chokepointClaims: ReadonlySet<string> | null;
  /** `pulp_wars-68k.6`: the walks to the firing tiles (cached). */
  readonly chokepointSlotSteps: Map<string, Map<string, number>>;
  /** `pulp_wars-68k.6`: the firing tile of each own siege unit (cached). */
  readonly chokepointSlots: Map<
    UnitId,
    { readonly at: CoordV7; readonly gain: number } | null
  >;
  /**
   * Map curiosities (`pulp_wars-737.4`): the public curiosity facts, or null
   * when the view has no curiosity and no Monster; every curiosity
   * heuristic is gated on it (and on the switch of
   * `src/ai/v7-curiosities.ts`).
   */
  readonly curiosities: CuriosityFactsV7 | null;
  /** Curiosity matches: the errands (undefined until computed). */
  curiosityErrands: ReadonlyMap<UnitId, CuriosityErrandV7> | undefined;
  /**
   * Curiosity matches: the own units with an offered attack on a unit that
   * is not a Monster (undefined until computed).
   */
  curiosityOtherTargets: ReadonlySet<UnitId> | undefined;
  readonly commands: readonly CommandV7[];
  /**
   * `pulp_wars-68k.3`: the seat's active mission directive (null for NORMAL
   * and in every non-mission match). `commands` are already leashed.
   */
  readonly directive: DirectivePlanV7 | null;
  /**
   * Revision 16 (section 3.6 rule 2): a ready growth harvest of the level-1
   * original capital, which outranks research, training, and construction.
   */
  readonly openingGrowthHarvest: boolean;
  readonly threats: ThreatV7[];
  readonly threatenedTiles: ReadonlyMap<UnitId, ReadonlySet<string>>;
  naval: NavalPlanV7;
  tactical: TacticalPlanV7;
  /** `pulp_wars-9s0.1`: land production before the economy (cached). */
  warTraining: boolean | null;
  /** `pulp_wars-9s0.8`: the savings plan (undefined until computed). */
  savings: SavingsPlanV7 | null | undefined;
  /** `pulp_wars-9s0.8`: the hunt plans (undefined until computed). */
  hunts: readonly HuntPlanV7[] | undefined;
  /**
   * Tuning 5 (`pulp_wars-w49.4`, `src/ai/v7-army.ts`): the seat plays the
   * army rules (a Human, Undead, or Goblin seat).
   */
  readonly army: boolean;
  /** Army play: the seat is alert (cached). */
  armyAlert: boolean | null;
  /** Army play: the composition counts (cached). */
  armyCounts: ArmyCountsV7 | null;
  /** Army play: the research target (undefined until computed). */
  armyResearch: ArmyResearchTargetV7 | null | undefined;
  /** Army play: the composition score of each city's preferred training. */
  readonly armyTrainingScoreByCity: Map<CityId, number>;
  /** Army play: the visible hostile land units (cached). */
  armyHostiles: readonly PublicUnitV7[] | null;
  /** Army play: the own units with an offered attack (cached). */
  armyAttackers: ReadonlySet<UnitId> | null;
  /** Army play: the engagement of each own unit by destination (cached). */
  readonly armyEngagements: Map<UnitId, ReadonlyMap<string, ArmyEngagementV7>>;
  /** Tuning 6: the hostile positions and their modes (cached). */
  armyAssault: ArmyAssaultV7 | undefined;
  /** Tuning 6: hostile land units by distance to the own centers (cached). */
  armyThreatDistance: number | undefined;
  /** Tuning 6: the tiles a visible hostile splash attacker reaches (cached). */
  armySplashReach: ReadonlySet<string> | undefined;
  /** Tuning 6: the tiles a visible hostile ranged unit reaches (cached). */
  armyRangedReach: ReadonlyMap<string, number> | undefined;
  /** Tuning 6: the own centers with an enemy at the gates (cached). */
  armyPressedCenters: readonly CoordV7[] | undefined;
  /** Tuning 6: the units a committed assault focuses this turn (cached). */
  armyFocus: ReadonlySet<UnitId> | undefined;
  /** Tuning 7: the tiles a visible hostile melee unit reaches (cached). */
  armyMeleeReach: ReadonlyMap<string, number> | undefined;
  /** Tuning 7: the visible hostile units with Overrun (cached). */
  armyChainers: readonly PublicUnitV7[] | undefined;
  /** Tuning 8: the hostile centers being taken (cached). */
  armyStorm: ArmyStormsV7 | undefined;
  /** Tuning 8: the spent fast units (cached). */
  readonly armySpent: Map<UnitId, boolean>;
  /** Tuning 8: the seat is rich (cached). */
  armyRich: boolean | undefined;
  /** Correction pass: `armyWeakGarrisonV7` by hostile unit. */
  armyWeakGarrison: Map<UnitId, boolean>;
  /** Correction pass: `armyBatteryOverV7` by center. */
  armyBattery: Map<string, readonly PublicUnitV7[]>;
  /** Tuning 8: the Coins kept for the due technology (cached). */
  armyResearchFloor: number | undefined;
  /** Tuning 7: `visibleImmediateDamage` of a view unit on a tile (cached). */
  readonly dangerByUnitAndTile: Map<string, number>;
  /** Tuning 7: a city can train now (cached). */
  armyCanTrain: boolean | undefined;
  /** Tuning 7: an enemy army is in the field (cached). */
  armyWar: boolean | undefined;
  /** Tuning 7: growth that adds population is on offer (cached). */
  armyGrowthOffered: boolean | undefined;
  /** Tuning 7: the growth technology of a stalled seat (cached). */
  armyGrowthResearch:
    { readonly tech: TechnologyIdV7; readonly cost: number } | null | undefined;
  /** `pulp_wars-9s0.1`: embarked units with no way forward (cached). */
  readonly strandedTransports: Map<UnitId, boolean>;
  redevelopmentMayChangeImprovement: Map<string, boolean>;
  sharedCityContextPrepared: boolean;
  preferredSharedCityActionByCity: Map<CityId, CommandV7 | null>;
  durableScreenByCity: Map<CityId, boolean>;
  readonly lookup: PolicyLookupV7;
  readonly threatLookup: PublicThreatLookupV7;
}

interface PublicCombatFactsV7 {
  readonly attack2: number;
  readonly move: number;
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly abilities: readonly string[];
}

interface PolicyLookupV7 {
  readonly unitsById: Map<UnitId, PublicUnitV7>;
  readonly citiesById: Map<CityId, PlayerViewV7["cities"][number]>;
  readonly citiesByKey: Map<string, PlayerViewV7["cities"][number]>;
  readonly unitStatsById: Map<UnitId, PlayerViewV7["unitStats"][number]>;
  readonly moveDestinationsByUnit: Map<UnitId, CoordV7[]>;
  readonly moveDestinationKeysByUnit: Map<UnitId, Set<string>>;
  readonly emptyMoveUnitIds: Set<UnitId>;
  readonly combatFactsByUnitId: Map<
    UnitId,
    { readonly unit: PublicUnitV7; readonly facts: PublicCombatFactsV7 }
  >;
  readonly revealGainByRadiusAndKey: Map<string, number>;
  readonly visibleHostiles: PublicUnitV7[];
}

interface PublicThreatLookupV7 {
  readonly occupantsByKey: Map<string, PublicUnitV7[]>;
  readonly cityOwnersByKey: Map<string, PlayerId[]>;
  readonly engineeringOwnerIds: Set<PlayerId>;
}

interface RoadCorridorV7 {
  readonly targetCityId: CityId;
  readonly missingRoadKeys: readonly string[];
  readonly populationBenefit: 2;
  readonly commerceIncomeBenefit: 0 | 1;
  readonly movementShortening: number;
  readonly benefit: number;
}

interface TacticalPlanV7 {
  readonly objectiveByUnitId: ReadonlyMap<UnitId, CoordV7>;
  readonly roadCorridor: RoadCorridorV7 | null;
  readonly defenderReplacementActionKeys: ReadonlySet<string>;
  /**
   * `pulp_wars-9s0.1`: villages, exploration, and standing pressure on the
   * known enemy cities, by land route (`src/ai/v7-campaign.ts`).
   */
  readonly campaign: CampaignPlanV7 | null;
}

const NO_TACTICAL_PLAN_V7: TacticalPlanV7 = Object.freeze({
  objectiveByUnitId: new Map<UnitId, CoordV7>(),
  roadCorridor: null,
  defenderReplacementActionKeys: new Set<string>(),
  campaign: null,
});

export interface NormalPolicyWorkBoundsV7 {
  readonly boardCells: number;
  readonly units: number;
  readonly objectives: number;
  readonly candidateCeiling: number;
  readonly maximumMissingRoads: 8;
  readonly navalPathExpansionCeiling: number;
  readonly threatPathExpansionCeiling: number;
  readonly replacementPathValidationCeiling: number;
  readonly roadPathExpansionCeiling: number;
  readonly redevelopmentPossibilityOperationCeiling: number;
  readonly candidatePreparationOperationCeiling: number;
  readonly sharedCityContextOperationCeiling: number;
  readonly policyLookupPreparationOperationCeiling: number;
  readonly threatLookupPreparationOperationCeiling: number;
  readonly declaredMaximumWorkUnits: number;
}

export interface NormalPolicyPathDiagnosticsV7 {
  readonly navalPathExpansions: number;
  readonly threatPathExpansions: number;
  readonly replacementPathValidations: number;
  readonly roadPathExpansions: number;
}

export interface NormalPolicyWorkDiagnosticV7 {
  readonly workUnits: number;
  readonly phase: string;
  readonly actualCandidateCount: number;
  readonly plannedCandidateCount: number;
  readonly provenImpossibleRedevelopmentCount: number;
  readonly redevelopmentPossibilityOperations: number;
  readonly candidatePreparationOperations: number;
  readonly sharedCityContextOperations: number;
  readonly policyLookupPreparationOperations: number;
  readonly threatLookupPreparationOperations: number;
  readonly acceptedCandidateCount: number;
  readonly workUnitsByPhase: Readonly<Record<string, number>>;
  readonly pathWork: NormalPolicyPathDiagnosticsV7;
  readonly bounds: NormalPolicyWorkBoundsV7;
}

interface MutablePolicyPathDiagnosticsV7 {
  navalPathExpansions: number;
  threatPathExpansions: number;
  replacementPathValidations: number;
  roadPathExpansions: number;
}

interface NavalPlanV7 {
  readonly active: boolean;
  readonly target: CoordV7 | null;
  readonly frontier: readonly CoordV7[];
  readonly landing: readonly CoordV7[];
  readonly deepWaterRequired: boolean;
  readonly visibleNavalDanger: boolean;
  /**
   * The target can be walked to, but the public sea route is shorter by more
   * than three steps: the capture units bound for it go by sea.
   */
  readonly seaShortcut: boolean;
  /**
   * A visible capture unit of the viewer or an ally stands on the target:
   * the other transports wait off the coast until it is taken.
   */
  readonly holding: boolean;
  readonly reserveCoins: number;
  /** Landed capture units that still have a public objective on this landmass. */
  readonly retainLandedUnitIds: ReadonlySet<UnitId>;
  /** Canonical public water-route distance to the invasion/frontier goal. */
  readonly waterDistanceByKey: ReadonlyMap<string, number>;
  /** Same route with known Deep Water allowed, used to choose a future Port. */
  readonly prospectiveWaterDistanceByKey: ReadonlyMap<string, number>;
  /** Canonical public water-route distance for escort/defense ships. */
  readonly fleetDistanceByKey: ReadonlyMap<string, number>;
}

const NO_NAVAL_PLAN_V7: NavalPlanV7 = Object.freeze({
  active: false,
  target: null,
  frontier: [],
  landing: [],
  deepWaterRequired: false,
  visibleNavalDanger: false,
  seaShortcut: false,
  holding: false,
  reserveCoins: 0,
  retainLandedUnitIds: new Set<UnitId>(),
  waterDistanceByKey: new Map(),
  prospectiveWaterDistanceByKey: new Map(),
  fleetDistanceByKey: new Map(),
});

type AiReadyItemV7 = ReturnType<typeof queryAiReadyCommandsV7>[number];
/**
 * Revision 19: a land production command of a city: `TRAIN`, or for a
 * Dinosaur seat `LAY_EGG` on the nest tile the policy chose for that role.
 */
type LandProductionCommandV7 =
  | Extract<CommandV7, { kind: "TRAIN" }>
  | Extract<CommandV7, { kind: "LAY_EGG" }>;
type SharedCityCommandV7 =
  | LandProductionCommandV7
  | Extract<CommandV7, { kind: "TRAIN_NAVAL" }>
  | Extract<CommandV7, { kind: "LAND_GRANT" }>;

const THREATENED_ROLE_ORDER = [
  "GUARD",
  "SWORDSMAN",
  "FIGHTER",
  "CAPTAIN",
  "KNIGHT",
  "MARKSMAN",
  "RAIDER",
  "CATAPULT",
] as const satisfies readonly UnitRoleIdV7[];

const GENERAL_ROLE_ORDER = [
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "SWORDSMAN",
  "FIGHTER",
] as const satisfies readonly UnitRoleIdV7[];

export function chooseNormalCommandV7(view: PlayerViewV7): NormalAiDecisionV7 {
  const work = new NormalPolicyWorkV7(view, () => 0);
  const result = work.runSlice(Number.MAX_SAFE_INTEGER);
  if (result === null)
    throw new NormalPolicyErrorV7(
      "NO_PUBLIC_COMMAND",
      "Synchronous policy work did not drain",
    );
  return result;
}

export function scoreCommandV7(
  view: PlayerViewV7,
  command: CommandV7,
): AiScoreV7 {
  validatePolicyRegistration(view);
  const ready = queryAiReadyCommandsV7(view).find(
    (item) => JSON.stringify(item.command) === JSON.stringify(command),
  );
  const tie = ready?.tuple ?? fallbackTie(view, command);
  return drain(
    scoreCommandSteps(
      makeContext(
        view,
        queryAiReadyCommandsV7(view).map((item) => item.command),
      ),
      command,
      tie,
    ),
  );
}

export function compareCandidateBestFirstV7(
  left: ScoredAiCandidateV7,
  right: ScoredAiCandidateV7,
): number {
  for (
    let index = 0;
    index < Math.max(left.tuple.length, right.tuple.length);
    index += 1
  ) {
    const difference = (right.tuple[index] ?? 0) - (left.tuple[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * Incremental, deterministic policy work shared by headless and the browser.
 * Wall-clock time controls only yielding; it never enters a score or tie-break.
 */
export class NormalPolicyWorkV7 {
  private readonly commandWork: ReturnType<typeof createPublicCommandWorkV7>;
  private planningWork: ReturnType<typeof createPublicPlanningWorkV7> | null =
    null;
  private phase:
    | "COMMAND_PREPARATION"
    | "POLICY_LOOKUP_CONTEXT"
    | "PLANNING_PREPARATION"
    | "NAVAL_CONTEXT"
    | "THREAT_LOOKUP_CONTEXT"
    | "TACTICAL_CONTEXT"
    | "SHARED_CITY_CONTEXT"
    | "REDEVELOPMENT_CANDIDATES"
    | "REDEVELOPMENT_CONTEXT"
    | "REDEVELOPMENT_RESULTS"
    | "PLANNING_CANDIDATES"
    | "CONTEXT"
    | "SCORING" = "COMMAND_PREPARATION";
  private ready: ReturnType<typeof queryAiReadyCommandsV7> | null = null;
  private context: PolicyContextV7 | null = null;
  private visibleHostiles: readonly PublicUnitV7[] = [];
  private readonly scored: ScoredAiCandidateV7[] = [];
  private contextCursor = 0;
  private plannedCandidateCount = 0;
  private provenImpossibleRedevelopmentCount = 0;
  private redevelopmentPossibilityOperations = 0;
  private candidatePreparationOperations = 0;
  private sharedCityContextOperations = 0;
  private policyLookupPreparationOperations = 0;
  private threatLookupPreparationOperations = 0;
  private preparationCursor = 0;
  private readonly redevelopmentCandidates: {
    readonly kind: "REDEVELOP";
    readonly at: CoordV7;
  }[] = [];
  private redevelopmentResults: readonly {
    readonly candidate: {
      readonly kind: "REDEVELOP";
      readonly at: CoordV7;
    };
    readonly mayChangeImprovement: boolean;
  }[] = [];
  private readonly planningCandidates: CommandV7[] = [];
  private cursor = 0;
  private activeScore: Generator<void, AiScoreV7> | null = null;
  private activeItem: AiReadyItemV7 | null = null;
  private navalWork: Generator<void, NavalPlanV7> | null = null;
  private tacticalWork: Generator<void, TacticalPlanV7> | null = null;
  private sharedCityWork: Generator<void, void> | null = null;
  private policyLookupWork: Generator<void, void> | null = null;
  private threatLookupWork: Generator<void, void> | null = null;
  private redevelopmentWork: ReturnType<
    typeof createPublicRedevelopmentPossibilityWorkV7
  > | null = null;
  private threatWork: Generator<void, void> | null = null;
  private workUnits = 0;
  private readonly bounds: NormalPolicyWorkBoundsV7;
  private readonly workUnitsByPhase: Record<string, number> = {};
  private readonly pathWork: MutablePolicyPathDiagnosticsV7 = {
    navalPathExpansions: 0,
    threatPathExpansions: 0,
    replacementPathValidations: 0,
    roadPathExpansions: 0,
  };

  constructor(
    readonly view: PlayerViewV7,
    private readonly readClock: () => number = now,
  ) {
    validatePolicyRegistration(view);
    this.commandWork = createPublicCommandWorkV7(view);
    const objectives = publicObjectivesV7(view).length;
    const cells = view.board.width * view.board.height;
    const ownedCities = view.cities.filter(
      (city) => city.ownerId === view.viewer.id,
    ).length;
    const hostileUnits = view.units.filter((unit) =>
      isHostile(view, unit.ownerId),
    ).length;
    // Public command generation is bounded by per-unit destinations/actions,
    // per-cell economy commands, and shared city actions (including all docks).
    const candidates = Math.max(
      1,
      view.units.length * (cells * 4 + 24) + cells * 20 + ownedCities * 24,
    );
    const redevelopmentPossibilityOperationCeiling =
      cells +
      view.units.length +
      view.pendingChoices.length +
      view.treasureChests.length +
      view.viewer.achievementEntitlements.length +
      view.leaderboard.length +
      view.cities.length +
      candidates;
    const candidatePreparationOperationCeiling = candidates * 3 + 3;
    const sharedCityContextOperationCeiling =
      candidates +
      view.units.length +
      view.cities.length +
      view.board.tiles.length +
      view.improvementValues.length +
      hostileUnits * Math.max(1, ownedCities) +
      ownedCities *
        (cells + view.units.length * (candidates + 1) + candidates * 2 + 1);
    const policyLookupPreparationOperationCeiling =
      view.cities.length +
      view.units.length +
      view.unitStats.length +
      candidates +
      1;
    const threatLookupPreparationOperationCeiling =
      view.cities.length + view.units.length + 1;
    this.bounds = {
      boardCells: cells,
      units: view.units.length,
      objectives,
      candidateCeiling: candidates,
      maximumMissingRoads: 8,
      navalPathExpansionCeiling: cells * 6,
      threatPathExpansionCeiling: hostileUnits * cells,
      replacementPathValidationCeiling:
        candidates * Math.max(1, view.units.length) * cells * 8,
      roadPathExpansionCeiling: Math.max(1, ownedCities - 1) * cells * 8,
      redevelopmentPossibilityOperationCeiling,
      candidatePreparationOperationCeiling,
      sharedCityContextOperationCeiling,
      policyLookupPreparationOperationCeiling,
      threatLookupPreparationOperationCeiling,
      declaredMaximumWorkUnits:
        64 +
        redevelopmentPossibilityOperationCeiling +
        candidatePreparationOperationCeiling +
        sharedCityContextOperationCeiling +
        policyLookupPreparationOperationCeiling +
        threatLookupPreparationOperationCeiling +
        candidates * Math.max(64, view.units.length * 32) +
        view.units.length * Math.max(1, objectives) +
        view.units.length * cells * 2 +
        cells * 16,
    };
  }

  /** Advance by an exact deterministic operation budget; budget one does one unit. */
  advanceWork(maxWorkUnits: number): NormalAiDecisionV7 | null {
    if (!Number.isSafeInteger(maxWorkUnits) || maxWorkUnits <= 0)
      throw new RangeError("maxWorkUnits must be a positive safe integer");
    for (let index = 0; index < maxWorkUnits; index += 1) {
      const phase = this.phase;
      const result = this.advanceOneWorkUnit();
      this.workUnits += 1;
      this.workUnitsByPhase[phase] = (this.workUnitsByPhase[phase] ?? 0) + 1;
      if (this.workUnits > this.bounds.declaredMaximumWorkUnits)
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          `Policy exceeded declared work ceiling ${this.bounds.declaredMaximumWorkUnits}`,
        );
      this.assertPathWorkBounds();
      if (result !== null) return result;
    }
    return null;
  }

  diagnostic(): NormalPolicyWorkDiagnosticV7 {
    return {
      workUnits: this.workUnits,
      phase: this.phase,
      actualCandidateCount: this.ready?.length ?? 0,
      plannedCandidateCount: this.plannedCandidateCount,
      provenImpossibleRedevelopmentCount:
        this.provenImpossibleRedevelopmentCount,
      redevelopmentPossibilityOperations:
        this.redevelopmentPossibilityOperations,
      candidatePreparationOperations: this.candidatePreparationOperations,
      sharedCityContextOperations: this.sharedCityContextOperations,
      policyLookupPreparationOperations: this.policyLookupPreparationOperations,
      threatLookupPreparationOperations: this.threatLookupPreparationOperations,
      acceptedCandidateCount: this.scored.length,
      workUnitsByPhase: { ...this.workUnitsByPhase },
      pathWork: { ...this.pathWork },
      bounds: this.bounds,
    };
  }

  runSlice(maxMilliseconds = 8): NormalAiDecisionV7 | null {
    if (!Number.isFinite(maxMilliseconds) || maxMilliseconds <= 0)
      throw new RangeError("maxMilliseconds must be positive");
    const started = this.readClock();
    do {
      const result = this.advanceWork(1);
      if (result !== null) return result;
    } while (this.readClock() - started < maxMilliseconds);
    return null;
  }

  private advanceOneWorkUnit(): NormalAiDecisionV7 | null {
    if (this.phase === "COMMAND_PREPARATION") {
      const progress = this.commandWork.advance(1);
      if (!progress.done || progress.commands === null) return null;
      this.prepareContext();
      return null;
    }
    if (this.phase === "PLANNING_PREPARATION") {
      const progress = this.planningWork?.advance(1);
      if (progress?.done === true && progress.result !== null)
        this.phase = "SCORING";
      return null;
    }
    const context = this.context;
    const ready = this.ready;
    if (context === null || ready === null)
      throw new NormalPolicyErrorV7(
        "NO_PUBLIC_COMMAND",
        "Policy preparation lost its public context",
      );
    if (this.phase === "POLICY_LOOKUP_CONTEXT") {
      const step = this.policyLookupWork?.next();
      if (step === undefined)
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          "Policy lost its public lookup preparation work",
        );
      this.policyLookupPreparationOperations += 1;
      if (
        this.policyLookupPreparationOperations >
        this.bounds.policyLookupPreparationOperationCeiling
      )
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          `Policy exceeded declared public lookup preparation ceiling ${this.bounds.policyLookupPreparationOperationCeiling}`,
        );
      if (step.done) {
        this.visibleHostiles = context.lookup.visibleHostiles;
        this.navalWork = navalPlanWorkV7(
          this.view,
          context.commands,
          this.pathWork,
        );
        this.phase = "NAVAL_CONTEXT";
      }
      return null;
    }
    if (this.phase === "REDEVELOPMENT_CANDIDATES") {
      this.chargeCandidatePreparation();
      const command = context.commands[this.preparationCursor];
      if (command === undefined) {
        this.preparationCursor = 0;
        if (this.redevelopmentCandidates.length === 0) {
          this.phase = "PLANNING_CANDIDATES";
          return null;
        }
        this.redevelopmentWork = createPublicRedevelopmentPossibilityWorkV7(
          this.view,
          this.redevelopmentCandidates,
        );
        if (
          this.redevelopmentWork.operationCeiling >
          this.bounds.redevelopmentPossibilityOperationCeiling
        )
          throw new NormalPolicyErrorV7(
            "NO_PUBLIC_COMMAND",
            `Redevelopment possibility work declared ${this.redevelopmentWork.operationCeiling} operations above policy ceiling ${this.bounds.redevelopmentPossibilityOperationCeiling}`,
          );
        this.phase = "REDEVELOPMENT_CONTEXT";
        return null;
      }
      this.preparationCursor += 1;
      if (
        command.kind === "REDEVELOP" &&
        !preservesEstablishedImprovementV7(this.view, command.at)
      )
        this.redevelopmentCandidates.push({
          kind: "REDEVELOP",
          at: command.at,
        });
      return null;
    }
    if (this.phase === "REDEVELOPMENT_CONTEXT") {
      const progress = this.redevelopmentWork?.advance(1);
      if (progress === undefined)
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          "Policy lost its redevelopment possibility work",
        );
      this.redevelopmentPossibilityOperations += progress.operations;
      if (
        this.redevelopmentPossibilityOperations >
        this.bounds.redevelopmentPossibilityOperationCeiling
      )
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          `Policy exceeded declared redevelopment possibility ceiling ${this.bounds.redevelopmentPossibilityOperationCeiling}`,
        );
      if (progress.done) {
        if (progress.result === null)
          throw new NormalPolicyErrorV7(
            "NO_PUBLIC_COMMAND",
            "Redevelopment possibility work finished without a result",
          );
        this.redevelopmentResults = progress.result;
        this.preparationCursor = 0;
        this.phase = "REDEVELOPMENT_RESULTS";
      }
      return null;
    }
    if (this.phase === "REDEVELOPMENT_RESULTS") {
      this.chargeCandidatePreparation();
      const result = this.redevelopmentResults[this.preparationCursor];
      if (result === undefined) {
        this.preparationCursor = 0;
        this.phase = "PLANNING_CANDIDATES";
        return null;
      }
      this.preparationCursor += 1;
      context.redevelopmentMayChangeImprovement.set(
        coordKey(result.candidate.at),
        result.mayChangeImprovement,
      );
      if (!result.mayChangeImprovement)
        this.provenImpossibleRedevelopmentCount += 1;
      return null;
    }
    if (this.phase === "PLANNING_CANDIDATES") {
      this.chargeCandidatePreparation();
      const command = context.commands[this.preparationCursor];
      if (command === undefined) {
        this.plannedCandidateCount = this.planningCandidates.length;
        this.planningWork = createPublicPlanningWorkV7(
          this.view,
          this.planningCandidates,
        );
        this.phase = "PLANNING_PREPARATION";
        return null;
      }
      this.preparationCursor += 1;
      if (isPlanningCandidateV7(context, command))
        this.planningCandidates.push(command);
      return null;
    }
    if (this.phase === "NAVAL_CONTEXT") {
      const step = this.navalWork?.next();
      if (step?.done === true) {
        context.naval = step.value;
        this.threatLookupWork = publicThreatLookupWorkV7(
          context.view,
          context.threatLookup,
        );
        this.phase = "THREAT_LOOKUP_CONTEXT";
      }
      return null;
    }
    if (this.phase === "THREAT_LOOKUP_CONTEXT") {
      const step = this.threatLookupWork?.next();
      if (step === undefined)
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          "Policy lost its public threat lookup work",
        );
      this.threatLookupPreparationOperations += 1;
      if (
        this.threatLookupPreparationOperations >
        this.bounds.threatLookupPreparationOperationCeiling
      )
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          `Policy exceeded declared threat lookup preparation ceiling ${this.bounds.threatLookupPreparationOperationCeiling}`,
        );
      if (step.done) this.phase = "CONTEXT";
      return null;
    }
    if (this.phase === "TACTICAL_CONTEXT") {
      const step = this.tacticalWork?.next();
      if (step?.done === true) {
        context.tactical = step.value;
        this.sharedCityWork = sharedCityContextWorkV7(context);
        this.phase = "SHARED_CITY_CONTEXT";
      }
      return null;
    }
    if (this.phase === "SHARED_CITY_CONTEXT") {
      const step = this.sharedCityWork?.next();
      if (step === undefined)
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          "Policy lost its shared-city context work",
        );
      this.sharedCityContextOperations += 1;
      if (
        this.sharedCityContextOperations >
        this.bounds.sharedCityContextOperationCeiling
      )
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          `Policy exceeded declared shared-city context ceiling ${this.bounds.sharedCityContextOperationCeiling}`,
        );
      if (step.done) {
        this.preparationCursor = 0;
        this.phase = "REDEVELOPMENT_CANDIDATES";
      }
      return null;
    }
    const hostile = this.visibleHostiles[this.contextCursor];
    if (this.phase === "CONTEXT" && hostile !== undefined) {
      this.threatWork ??= addHostileThreatsWorkV7(
        context,
        hostile,
        this.pathWork,
      );
      const step = this.threatWork.next();
      if (step.done) {
        this.threatWork = null;
        this.contextCursor += 1;
      }
      return null;
    }
    if (this.phase === "CONTEXT") {
      this.tacticalWork = tacticalPlanWorkV7(context, this.pathWork);
      this.phase = "TACTICAL_CONTEXT";
      return null;
    }
    this.phase = "SCORING";
    if (this.activeScore === null) {
      const item = ready[this.cursor];
      if (item === undefined) return this.finish();
      this.cursor += 1;
      if (!isPolicyCandidate(context, item.command)) return null;
      this.activeItem = item;
      this.activeScore = scoreCommandSteps(context, item.command, item.tuple);
    }
    const step = this.activeScore.next();
    if (!step.done) return null;
    const item = this.activeItem;
    if (item === null)
      throw new NormalPolicyErrorV7(
        "NO_PUBLIC_COMMAND",
        "Policy work lost its candidate",
      );
    const score = step.value;
    if (score.priority >= 0)
      this.scored.push({
        command: item.command,
        score,
        tuple: scoreTuple(score),
      });
    this.activeScore = null;
    this.activeItem = null;
    return null;
  }

  private prepareContext(): void {
    // pulp_wars-68k.3: a mission directive leashes the ready commands (the
    // identity with NORMAL and in every non-mission match).
    const directive = directivePlanForViewV7(this.view);
    this.ready = leashReadyCommandsV7(
      this.view,
      directive,
      queryAiReadyCommandsV7(this.view),
    );
    if (this.ready.length > this.bounds.candidateCeiling)
      throw new NormalPolicyErrorV7(
        "NO_PUBLIC_COMMAND",
        `Policy generated ${this.ready.length} candidates above declared ceiling ${this.bounds.candidateCeiling}`,
      );
    this.context = bareContext(
      this.view,
      this.ready.map((item) => item.command),
      directive,
    );
    this.policyLookupWork = policyLookupWorkV7(this.context);
    this.phase = "POLICY_LOOKUP_CONTEXT";
  }

  private chargeCandidatePreparation(): void {
    this.candidatePreparationOperations += 1;
    if (
      this.candidatePreparationOperations >
      this.bounds.candidatePreparationOperationCeiling
    )
      throw new NormalPolicyErrorV7(
        "NO_PUBLIC_COMMAND",
        `Policy exceeded declared candidate preparation ceiling ${this.bounds.candidatePreparationOperationCeiling}`,
      );
  }

  private finish(): NormalAiDecisionV7 {
    const context = this.context;
    if (context === null)
      throw new NormalPolicyErrorV7(
        "NO_PUBLIC_COMMAND",
        "Policy finished without a public context",
      );
    this.scored.sort(compareCandidateBestFirstV7);
    return {
      difficulty: "NORMAL",
      candidates: this.scored,
      command: this.scored[0]?.command ?? null,
      prngDraws: 0,
    };
  }

  private assertPathWorkBounds(): void {
    const checks = [
      [
        this.pathWork.navalPathExpansions,
        this.bounds.navalPathExpansionCeiling,
        "naval path expansions",
      ],
      [
        this.pathWork.threatPathExpansions,
        this.bounds.threatPathExpansionCeiling,
        "threat path expansions",
      ],
      [
        this.pathWork.replacementPathValidations,
        this.bounds.replacementPathValidationCeiling,
        "replacement path validations",
      ],
      [
        this.pathWork.roadPathExpansions,
        this.bounds.roadPathExpansionCeiling,
        "road path expansions",
      ],
    ] as const;
    for (const [actual, ceiling, label] of checks)
      if (actual > ceiling)
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          `Policy exceeded declared ${label} ceiling ${ceiling}`,
        );
  }
}

export async function chooseNormalCommandYieldingV7(
  view: PlayerViewV7,
  yieldToHost: () => Promise<void> = () =>
    new Promise((resolve) => setTimeout(resolve, 0)),
  readClock: () => number = now,
): Promise<NormalAiDecisionV7> {
  const work = new NormalPolicyWorkV7(view, readClock);
  for (;;) {
    const result = work.runSlice(8);
    if (result !== null) return result;
    await yieldToHost();
  }
}

export class NormalTurnCommandCapErrorV7 extends Error {
  constructor() {
    super("Reward work and End Turn cannot drain within the turn cap");
    this.name = "NormalTurnCommandCapErrorV7";
  }
}

/** Exact conservative closure budget shared by headless and browser schedulers. */
export function normalTurnClosureSlotsV7(view: PlayerViewV7): number {
  const unrewardedLevels = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .reduce(
      (total, city) =>
        total + Math.max(0, city.level - 1 - city.rewards.length),
      0,
    );
  return unrewardedLevels + 1;
}

/** Select one command while preserving enough accepted slots to close the turn. */
export function chooseNormalTurnCommandV7(
  view: PlayerViewV7,
  commandsThisTurn: number,
  maxCommandsPerTurn = NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  decision = chooseNormalCommandV7(view),
): CommandV7 | null {
  const remaining = maxCommandsPerTurn - commandsThisTurn;
  const reserved = normalTurnClosureSlotsV7(view);
  if (reserved > remaining) throw new NormalTurnCommandCapErrorV7();
  const safe = decision.candidates.find(
    (candidate) =>
      reserved + mandatoryWorkDeltaV7(view, candidate.command) <= remaining - 1,
  );
  if (safe !== undefined) return safe.command;
  const closure = forcedClosureCommands(view, decision).find(
    (command) =>
      reserved + mandatoryWorkDeltaV7(view, command) <= remaining - 1,
  );
  if (closure === undefined) throw new NormalTurnCommandCapErrorV7();
  return closure;
}

function forcedClosureCommands(
  view: PlayerViewV7,
  decision: NormalAiDecisionV7,
): readonly CommandV7[] {
  if (view.pendingChoices.length > 0)
    return queryAiReadyCommandsV7(view).map((item) => item.command);
  return decision.command?.kind === "END_TURN"
    ? [decision.command]
    : [{ kind: "END_TURN" }];
}

function mandatoryWorkDeltaV7(view: PlayerViewV7, command: CommandV7): number {
  if (command.kind === "END_TURN") return -1;
  if (command.kind === "CHOOSE_CITY_REWARD") {
    if (command.reward !== "BOOM") return -1;
    const city = view.cities.find((item) => item.id === command.cityId);
    return city === undefined
      ? Number.POSITIVE_INFINITY
      : boomLevelsReached(city) - 1;
  }
  const economic = previewEconomicV7(view, command);
  if (economic.ok) return economic.preview.levelsReached.length;
  if (command.kind === "BUILD_MONUMENT") {
    const preview = previewMonumentV7(view, command);
    return preview.ok ? preview.preview.levelsReached.length : 0;
  }

  if (command.kind === "CAPTURE") {
    const actor = view.units.find((unit) => unit.id === command.unitId);
    const city = actor === undefined ? undefined : cityAt(view, actor.at);
    return city === undefined
      ? 0
      : Math.max(0, city.level - 1 - city.rewards.length);
  }
  return 0;
}

function boomLevelsReached(city: PlayerViewV7["cities"][number]): number {
  const total = city.permanentPopulation + city.economicPopulation + 3;
  if (!Number.isSafeInteger(total)) return Number.POSITIVE_INFINITY;
  let level = city.level;
  let reached = 0;
  for (;;) {
    const next = level + 1;
    if (!Number.isSafeInteger(next)) return Number.POSITIVE_INFINITY;
    const spent = (BigInt(next) * BigInt(next + 1)) / 2n - 1n;
    if (spent > BigInt(total)) return reached;
    level = next;
    reached += 1;
  }
}

function makeContext(
  view: PlayerViewV7,
  readyCommands: readonly CommandV7[],
): PolicyContextV7 {
  // pulp_wars-68k.3: the directive leash, exactly as in the work loop.
  const directive = directivePlanForViewV7(view);
  const commands =
    directive === null
      ? readyCommands
      : leashReadyCommandsV7(
          view,
          directive,
          readyCommands.map((command) => ({ command })),
        ).map((item) => item.command);
  const context = bareContext(view, commands, directive);
  drain(policyLookupWorkV7(context));
  context.naval = drain(navalPlanWorkV7(view, commands));
  drain(publicThreatLookupWorkV7(view, context.threatLookup));
  for (const unit of view.units)
    if (isHostile(view, unit.ownerId))
      drain(addHostileThreatsWorkV7(context, unit));
  context.tactical = drain(tacticalPlanWorkV7(context));
  drain(sharedCityContextWorkV7(context));
  return context;
}

function bareContext(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  directive: DirectivePlanV7 | null,
): PolicyContextV7 {
  const threatenedTiles = new Map<UnitId, ReadonlySet<string>>();
  const threats: ThreatV7[] = [];
  return {
    view,
    undead: undeadMatchForPolicyV7(view),
    afflictions: publicAfflictionsV7(view),
    goblin: goblinMatchForPolicyV7(view),
    goblinAttackFacts: new Map(),
    goblinDoomed: new Map(),
    dinosaur: dinosaurMatchForPolicyV7(view),
    dinosaurFacts: null,
    martian: martianMatchForPolicyV7(view),
    martianCache: null,
    iceFolk: iceFolkMatchForPolicyV7(view),
    iceFolkCache: null,
    dwarf: dwarfMatchForPolicyV7(view),
    dwarfCache: null,
    candy: candyMatchForPolicyV7(view),
    candyCache: null,
    endgame: endgamePlanForPolicyV7(view, (owner) => isHostile(view, owner)),
    chokepoint: chokepointPlanForPolicyV7(view, {
      isHostile: (owner) => isHostile(view, owner),
      isAllied: (owner) => publicPlayersAllied(view, view.viewer.id, owner),
    }),
    chokepointFocus: undefined,
    chokepointSlots: new Map(),
    chokepointClaims: null,
    chokepointSlotSteps: new Map(),
    curiosities: curiosityFactsV7(view),
    curiosityErrands: undefined,
    curiosityOtherTargets: undefined,
    commands,
    directive,
    openingGrowthHarvest: commands.some((command) =>
      openingGrowthHarvestV7(view, command),
    ),
    threats,
    threatenedTiles,
    naval: NO_NAVAL_PLAN_V7,
    tactical: NO_TACTICAL_PLAN_V7,
    warTraining: null,
    savings: undefined,
    hunts: undefined,
    army:
      armyPlayFactionV7(view.viewer.faction) &&
      view.players.every((player) => armyPlayFactionV7(player.faction)),
    armyAlert: null,
    armyCounts: null,
    armyResearch: undefined,
    armyHostiles: null,
    armyAttackers: null,
    armyTrainingScoreByCity: new Map(),
    armyEngagements: new Map(),
    armyAssault: undefined,
    armyThreatDistance: undefined,
    armySplashReach: undefined,
    armyRangedReach: undefined,
    armyPressedCenters: undefined,
    armyFocus: undefined,
    armyMeleeReach: undefined,
    armyChainers: undefined,
    armyStorm: undefined,
    armySpent: new Map(),
    armyRich: undefined,
    armyWeakGarrison: new Map(),
    armyBattery: new Map(),
    armyResearchFloor: undefined,
    dangerByUnitAndTile: new Map(),
    armyCanTrain: undefined,
    armyWar: undefined,
    armyGrowthOffered: undefined,
    armyGrowthResearch: undefined,
    strandedTransports: new Map(),
    redevelopmentMayChangeImprovement: new Map(),
    sharedCityContextPrepared: false,
    preferredSharedCityActionByCity: new Map(),
    durableScreenByCity: new Map(),
    lookup: {
      unitsById: new Map(),
      citiesById: new Map(),
      citiesByKey: new Map(),
      unitStatsById: new Map(),
      moveDestinationsByUnit: new Map(),
      moveDestinationKeysByUnit: new Map(),
      emptyMoveUnitIds: new Set(),
      combatFactsByUnitId: new Map(),
      revealGainByRadiusAndKey: new Map(),
      visibleHostiles: [],
    },
    threatLookup: {
      occupantsByKey: new Map(),
      cityOwnersByKey: new Map(),
      engineeringOwnerIds: new Set(
        view.viewer.researchedTechs.includes("ENGINEERING")
          ? [view.viewer.id]
          : [],
      ),
    },
  };
}

function* policyLookupWorkV7(context: PolicyContextV7): Generator<void, void> {
  const { view, lookup } = context;
  for (const city of view.cities) {
    lookup.citiesById.set(city.id, city);
    lookup.citiesByKey.set(coordKey(city.at), city);
    yield;
  }
  for (const unit of view.units) {
    lookup.unitsById.set(unit.id, unit);
    if (isHostile(view, unit.ownerId)) lookup.visibleHostiles.push(unit);
    yield;
  }
  for (const stats of view.unitStats) {
    lookup.unitStatsById.set(stats.unitId, stats);
    yield;
  }
  for (const command of context.commands) {
    if (command.kind === "MOVE") {
      const actualDestination = command.path.at(-1);
      if (actualDestination !== undefined) {
        const destinations =
          lookup.moveDestinationsByUnit.get(command.unitId) ?? [];
        destinations.push(actualDestination);
        lookup.moveDestinationsByUnit.set(command.unitId, destinations);
        const keys =
          lookup.moveDestinationKeysByUnit.get(command.unitId) ?? new Set();
        keys.add(coordKey(actualDestination));
        lookup.moveDestinationKeysByUnit.set(command.unitId, keys);
      } else lookup.emptyMoveUnitIds.add(command.unitId);
    }
    yield;
  }
}

function publicObjectivesV7(view: PlayerViewV7): readonly CoordV7[] {
  return [
    ...view.cities
      .filter((city) => isHostile(view, city.ownerId))
      .map((city) => city.at),
    ...view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .map((city) => city.at),
    ...view.board.tiles
      .filter(
        (tile) =>
          tile.explored &&
          tile.site === "VILLAGE" &&
          tile.territoryOwnerId === null,
      )
      .map((tile) => tile.at),
  ];
}

/** Public, bounded unit/objective comparisons and one canonical Road corridor. */
function* tacticalPlanWorkV7(
  context: PolicyContextV7,
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, TacticalPlanV7> {
  const { view, commands } = context;
  const objectives = publicObjectivesV7(view).filter(
    (at) =>
      !view.cities.some(
        (city) =>
          city.ownerId === view.viewer.id &&
          same(city.at, at) &&
          !threatenedCity(context, city.id),
      ),
  );
  const objectiveByUnitId = new Map<UnitId, CoordV7>();
  const reservations = new Map<string, number>();
  for (const unit of view.units.filter(
    (item) => item.ownerId === view.viewer.id,
  )) {
    let best: { at: CoordV7; score: number; key: string } | null = null;
    for (const objective of objectives) {
      const key = coordKey(objective);
      const hostileCity = view.cities.some(
        (city) => isHostile(view, city.ownerId) && same(city.at, objective),
      );
      const ownedThreatened = view.cities.some(
        (city) =>
          city.ownerId === view.viewer.id &&
          threatenedCity(context, city.id) &&
          same(city.at, objective),
      );
      // The policy's reading of the label (the Triceratops, the Mammoth, and
      // the Boulder Yeti are line units; every other rule keeps its label).
      const role = policyTacticalRoleV7(unitRoleRuleV7(view, unit));
      const moveDestinationKeys =
        context.lookup.moveDestinationKeysByUnit.get(unit.id) ?? new Set();
      const approachCells = neighbors8V7(view, objective).filter((at) =>
        moveDestinationKeys.has(coordKey(at)),
      ).length;
      const score =
        Number(hostileCity) * 30 +
        Number(ownedThreatened && role === "DEFENDER") * 28 +
        Number(hostileCity && ["SKIRMISHER", "BREAKTHROUGH"].includes(role)) *
          8 +
        approachCells * 3 -
        distance(unit.at, objective) * 4 -
        (reservations.get(key) ?? 0) * 12;
      if (
        best === null ||
        score > best.score ||
        (score === best.score && key < best.key)
      )
        best = { at: objective, score, key };
      yield;
    }
    if (best !== null) {
      objectiveByUnitId.set(unit.id, best.at);
      reservations.set(best.key, (reservations.get(best.key) ?? 0) + 1);
    }
  }
  const defenderReplacementActionKeys = new Set<string>();
  for (const command of commands) {
    if (command.kind !== "MOVE" && command.kind !== "ATTACK") continue;
    const actor = context.lookup.unitsById.get(command.unitId);
    const city =
      actor === undefined ? undefined : cityAt(view, actor.at, context.lookup);
    if (
      actor === undefined ||
      city === undefined ||
      city.ownerId !== view.viewer.id ||
      !threatenedCity(context, city.id)
    )
      continue;
    let projectedUnits: readonly PublicUnitV7[];
    if (command.kind === "MOVE") {
      const destination = command.path.at(-1);
      if (destination === undefined) continue;
      projectedUnits = view.units.map((unit) =>
        unit.id === actor.id ? { ...unit, at: destination } : unit,
      );
    } else {
      const preview = queryCombatPreviewV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      if (preview === null || (!preview.attackerDies && !preview.advances))
        continue;
      const target = context.lookup.unitsById.get(command.targetUnitId);
      projectedUnits = view.units.flatMap((unit) =>
        unit.id === command.targetUnitId && preview.defenderDies
          ? []
          : unit.id !== actor.id
            ? [unit]
            : preview.attackerDies
              ? []
              : [
                  {
                    ...unit,
                    at: target?.at ?? unit.at,
                    hp: Math.max(1, unit.hp - preview.damageToAttacker),
                    activation: {
                      ...unit.activation,
                      attacked: true,
                      attacksUsed: preview.attacksUsed,
                    },
                  },
                ],
      );
    }
    const projected: PlayerViewV7 = {
      ...view,
      units: projectedUnits,
      unitStats: view.unitStats.filter((stats) =>
        projectedUnits.some((unit) => unit.id === stats.unitId),
      ),
    };
    if (yield* hasReplacementPathWorkV7(projected, city.at, actor.id, pathWork))
      defenderReplacementActionKeys.add(policyCommandKeyV7(command));
    yield;
  }
  const roadCorridor = yield* roadCorridorWorkV7(view, commands, pathWork);
  // pulp_wars-9s0.1: every unit that is not defending a threatened own city
  // takes its campaign job (a village, the frontier, or a known enemy city)
  // and follows the land route to it.
  const ownCityKeys = new Set(
    view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .map((city) => coordKey(city.at)),
  );
  // Slots a wave can still wait for. With a naval plan active the policy
  // may hold land production back (a slot for the fleet, the Coin reserve),
  // so a wave then never waits for a unit that may not come.
  let freeLandSlots = 0;
  if (!context.naval.active)
    for (const city of view.cities)
      if (city.ownerId === view.viewer.id)
        freeLandSlots += Math.max(0, freeCapacity(view, city.id));
  const campaign = campaignPlanForPolicyV7(view, {
    freeLandSlots,
    seaTarget: context.naval.seaShortcut ? context.naval.target : null,
    isHostile: (ownerId) => isHostile(view, ownerId),
    isAllied: (ownerId) => publicPlayersAllied(view, view.viewer.id, ownerId),
    // The garrison of a threatened center and a defender walking to one
    // keep that objective; every other unit near home engages the invaders.
    keepsObjective: (unit) => {
      const objective = objectiveByUnitId.get(unit.id);
      if (objective === undefined || !ownCityKeys.has(coordKey(objective)))
        return false;
      return (
        same(unit.at, objective) ||
        policyTacticalRoleV7(unitRoleRuleV7(view, unit)) === "DEFENDER"
      );
    },
    // pulp_wars-68k.3: the plan side of a mission directive (absent for
    // NORMAL and in every non-mission match).
    ...(context.directive === null
      ? {}
      : { directive: context.directive.campaign }),
    // Tuning 7 (`pulp_wars-w49.10`): an army seat concentrates on one
    // neighbour, raids undefended cities, and expands with its fast units.
    ...(context.army
      ? {
          army: {
            holds: (unit: PublicUnitV7) =>
              view.cities.some(
                (city) =>
                  city.ownerId === view.viewer.id &&
                  distance(city.at, unit.at) <= ARMY_NEAR_THREAT_RADIUS_V7 &&
                  armyHostilesV7(context).some(
                    (hostile) =>
                      distance(hostile.at, city.at) <=
                        ARMY_NEAR_THREAT_RADIUS_V7 &&
                      // The holders of a hostile city three tiles from
                      // an own one are no enemy at the gates: the army in
                      // front of that city is a front, not a garrison (a
                      // seat with 40 units had one free unit).
                      !view.cities.some(
                        (other) =>
                          isHostile(view, other.ownerId) &&
                          distance(other.at, hostile.at) <=
                            CAMPAIGN_FRONT_DEFENSE_RADIUS_V7,
                      ),
                  ),
              ),
            slowMelee: (unit: PublicUnitV7) => armySlowMeleeV7(context, unit),
            strength: (unit: PublicUnitV7) => armyFieldStrengthV7(view, unit),
            // Tuning 8 (`pulp_wars-w49.11`): a front is sized against the
            // holders with their cover, brings its shooters to a
            // fortified city, and an expanding seat spreads its scouts.
            holdStrength: (unit: PublicUnitV7) =>
              Math.floor(
                (armyFieldStrengthV7(view, unit) *
                  armyCoverPercentV7(context, unit)) /
                  100,
              ),
            shoots: (unit: PublicUnitV7) =>
              publicCombatFacts(view, unit, context.lookup).maximumRange > 1,
            expanding: armyExpandingV7(context),
            // The Undead pass, correction: villages first.
            villagesFirst: armyVillagesFirstV7(context),
            // Correction pass: a seat with an active naval plan, or with
            // Shorecraft (it expands by sea), keeps the scouting it had:
            // its free units are for the Port.
            naval:
              context.naval.active ||
              view.viewer.researchedTechs.includes("SHORECRAFT"),
          },
        }
      : {}),
    // The Ice Folk revision: a wave of Mountain-born units routes over the
    // Mountains (no other seat has one).
    ...(view.viewer.faction === "ICE_FOLK"
      ? {
          mountainBorn: (unit: PublicUnitV7) =>
            unitIsMountainBornV7(view, unit),
        }
      : {}),
  });
  for (const [unitId, assignment] of campaign.assignmentByUnitId)
    objectiveByUnitId.set(unitId, assignment.at);
  return {
    objectiveByUnitId,
    roadCorridor,
    defenderReplacementActionKeys,
    campaign,
  };
}

function* hasReplacementPathWorkV7(
  view: PlayerViewV7,
  target: CoordV7,
  excluded: UnitId,
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, boolean> {
  for (const unit of view.units) {
    if (
      unit.id === excluded ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      unit.activation.moved ||
      unit.activation.attacked ||
      unit.activation.recovered ||
      unit.activation.captured ||
      unit.activation.specialActed ||
      unit.hp * 2 < unit.maxHp ||
      unitRoleRuleV7(view, unit).defense2 < 4
    )
      continue;
    // Revision 18: the replacement may pass through own units but cannot end
    // on one, so an own-occupied tile is expanded and never accepted.
    const ownOccupied = new Set(
      view.units.flatMap((other) =>
        other.id !== unit.id && other.hp > 0 && other.ownerId === unit.ownerId
          ? [coordKey(other.at)]
          : [],
      ),
    );
    const queue: CoordV7[][] = [[]];
    const best = new Map([[coordKey(unit.at), 0]]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const path = queue[cursor];
      if (path === undefined) break;
      const current = path.at(-1) ?? unit.at;
      for (const next of neighbors8V7(view, current)) {
        const candidate = [...path, next];
        const validation = validatePlayerMovementPassagePathV7(
          view,
          unit,
          candidate,
        );
        if (pathWork !== undefined) pathWork.replacementPathValidations += 1;
        yield;
        if (
          !validation.legal ||
          validation.traversedPath.length !== candidate.length
        )
          continue;
        const key = coordKey(next);
        if (
          (best.get(key) ?? Number.POSITIVE_INFINITY) <= validation.spentPoints2
        )
          continue;
        const passedOnly = ownOccupied.has(key);
        if (passedOnly && validation.stopped) continue;
        // The frozen sea: a prefix that ends where a slide continues is
        // not a legal Move end.
        if (
          !passedOnly &&
          validation.slideContinues === undefined &&
          same(next, target)
        )
          return true;
        best.set(key, validation.spentPoints2);
        if (!validation.stopped) queue.push(candidate);
      }
    }
  }
  return false;
}

function tileAtPublicV7(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["board"]["tiles"][number] {
  const tile = findPublicTileV7(view, at);
  if (tile === undefined)
    throw new Error(`Public tile missing at ${coordKey(at)}`);
  return tile;
}

function findPublicTileV7(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerViewV7["board"]["tiles"][number] | undefined {
  // Parsed Ruleset 7 boards, and therefore production PlayerViews, are
  // complete canonical row-major arrays. Keep the search fallback so focused
  // synthetic public views retain the previous lookup and error behavior.
  const indexed = view.board.tiles[at.y * view.board.width + at.x];
  if (indexed !== undefined && same(indexed.at, at)) return indexed;
  return view.board.tiles.find((candidate) => same(candidate.at, at));
}

function* publicThreatLookupWorkV7(
  view: PlayerViewV7,
  lookup: PublicThreatLookupV7,
): Generator<void, void> {
  for (const city of view.cities) {
    const owners = lookup.cityOwnersByKey.get(coordKey(city.at)) ?? [];
    owners.push(city.ownerId);
    lookup.cityOwnersByKey.set(coordKey(city.at), owners);
    yield;
  }
  for (const unit of view.units) {
    const occupants = lookup.occupantsByKey.get(coordKey(unit.at)) ?? [];
    occupants.push(unit);
    lookup.occupantsByKey.set(coordKey(unit.at), occupants);
    // A unit standing on a Mountain shows that its owner has Engineering,
    // unless it needs none: a Martian walker or flyer, or (the Ice Folk
    // revision, `pulp_wars-7g3.4`) a Mountain-born unit.
    if (
      unit.ownerId !== view.viewer.id &&
      !(
        unit.form === "LAND" &&
        (unitMovementModeV7(view, unit) !== "GROUND" ||
          unitIsMountainBornV7(view, unit))
      )
    ) {
      const tile = findPublicTileV7(view, unit.at);
      if (tile?.explored === true && tile.terrain === "MOUNTAIN")
        lookup.engineeringOwnerIds.add(unit.ownerId);
    }
    yield;
  }
}

function* roadCorridorWorkV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, RoadCorridorV7 | null> {
  const capital = view.cities.find(
    (city) =>
      city.ownerId === view.viewer.id &&
      city.id === view.viewer.originalCapitalCityId,
  );
  if (capital === undefined) return null;
  const roadCommandKeys = new Set(
    commands.flatMap((command) =>
      command.kind === "BUILD_ROAD" ? [coordKey(command.at)] : [],
    ),
  );
  const eligible = new Map(
    view.board.tiles.flatMap((tile) =>
      tile.explored &&
      tile.biome !== null &&
      // The Rift (RULESET_7_RIFT.md section 3): no Road on a Rift.
      tile.terrain !== "RIFT" &&
      (tile.territoryOwnerId === null ||
        tile.territoryOwnerId === view.viewer.id) &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("ENGINEERING"))
        ? [[coordKey(tile.at), tile] as const]
        : [],
    ),
  );
  const cityKeys = new Set(
    view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .map((city) => coordKey(city.at)),
  );
  const targets = view.cities
    .filter((city) => city.ownerId === view.viewer.id && city.id !== capital.id)
    .sort((left, right) => left.id - right.id);
  let selected: RoadCorridorV7 | null = null;
  for (const target of targets) {
    type Node = { at: CoordV7; missing: readonly string[]; steps: number };
    const queue: Node[] = [{ at: capital.at, missing: [], steps: 0 }];
    const best = new Map<string, number>([[coordKey(capital.at), 0]]);
    let found: Node | null = null;
    while (queue.length > 0) {
      queue.sort(
        (left, right) =>
          left.missing.length - right.missing.length ||
          left.steps - right.steps ||
          left.at.y - right.at.y ||
          left.at.x - right.at.x,
      );
      const current = queue.shift();
      if (current === undefined) break;
      if (pathWork !== undefined) pathWork.roadPathExpansions += 1;
      const currentCost = current.missing.length * 1_000 + current.steps;
      if ((best.get(coordKey(current.at)) ?? currentCost) < currentCost)
        continue;
      if (same(current.at, target.at)) {
        found = current;
        break;
      }
      for (const next of neighbors8V7(view, current.at)) {
        const key = coordKey(next);
        const tile = eligible.get(key);
        if (tile === undefined) continue;
        const existing = tile.road || cityKeys.has(key);
        if (!existing && !roadCommandKeys.has(key)) continue;
        const missing = existing ? current.missing : [...current.missing, key];
        if (missing.length > 8) continue;
        const cost = missing.length * 1_000 + current.steps + 1;
        if ((best.get(key) ?? Number.POSITIVE_INFINITY) <= cost) continue;
        best.set(key, cost);
        queue.push({ at: next, missing, steps: current.steps + 1 });
      }
      yield;
    }
    if (found === null || found.missing.length === 0) continue;
    const direct = distance(capital.at, target.at);
    // An unroaded direct route costs two half-points per step; the completed
    // corridor costs one. This conservative saving decreases as detours grow.
    const movementShortening = Math.max(0, direct * 2 - found.steps);
    // A new original-capital land connection contributes one live Population
    // at each endpoint. Commerce also publishes one recurring land-trade Coin
    // for the non-capital city; published Market income remains in city value.
    const populationBenefit = 2 as const;
    const commerceIncomeBenefit = Number(
      technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
        .landTradeIncomeCoins > 0,
    ) as 0 | 1;
    const benefit =
      populationBenefit * 4 +
      commerceIncomeBenefit * 6 +
      attributableCityIncome(view, target) * 3 +
      movementShortening;
    const candidate = {
      targetCityId: target.id,
      missingRoadKeys: found.missing,
      populationBenefit,
      commerceIncomeBenefit,
      movementShortening,
      benefit,
    };
    if (
      selected === null ||
      candidate.benefit > selected.benefit ||
      (candidate.benefit === selected.benefit &&
        candidate.missingRoadKeys.length < selected.missingRoadKeys.length) ||
      (candidate.benefit === selected.benefit &&
        candidate.missingRoadKeys.length === selected.missingRoadKeys.length &&
        candidate.targetCityId < selected.targetCityId)
    )
      selected = candidate;
  }
  return selected;
}

/** One bounded public-board pass per policy decision, advanced through work slices. */
function* navalPlanWorkV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, NavalPlanV7> {
  // pulp_wars-68k.3: no naval plan while Shorecraft is forbidden (the Dry
  // Land Naval branch, or a mission that forbids it; CAMPAIGN.md 2.3).
  if (forbiddenTechnologiesV7(view.setup).has("SHORECRAFT"))
    return NO_NAVAL_PLAN_V7;
  // The frozen sea engine (`pulp_wars-5ti.3`, RULESET_7_NAVAL_BRANCH.md
  // section 17): a seat whose tree unlocks no ship (the Ice Folk) has no
  // ship and cannot embark, so it has no naval plan: no Port for embarking,
  // no transport, no escort. It plays on its own landmass until the ice
  // plan of `pulp_wars-5ti.5`.
  if (
    !NAVAL_ROLE_IDS_V7.some((role) =>
      factionUnlocksRoleV7(view.viewer.faction, role),
    )
  )
    return NO_NAVAL_PLAN_V7;
  const tilesByKey = new Map(
    view.board.tiles.map((tile) => [coordKey(tile.at), tile]),
  );
  const land = view.board.tiles
    .filter(
      (tile) =>
        tile.explored &&
        tile.biome !== null &&
        // The Rift (RULESET_7_RIFT.md section 6): no ground route crosses it.
        tile.terrain !== "RIFT" &&
        !(
          tile.territoryOwnerId !== null &&
          tile.territoryOwnerId !== view.viewer.id &&
          publicPlayersAllied(view, view.viewer.id, tile.territoryOwnerId)
        ) &&
        (tile.terrain !== "MOUNTAIN" ||
          view.viewer.researchedTechs.includes("ENGINEERING")),
    )
    .sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
  const unassigned = new Set(land.map((tile) => coordKey(tile.at)));
  const componentByKey = new Map<string, number>();
  let component = 0;
  for (const seed of land) {
    const seedKey = coordKey(seed.at);
    if (!unassigned.delete(seedKey)) continue;
    const queue = [seed.at];
    for (let index = 0; index < queue.length; index += 1) {
      const at = queue[index];
      if (at === undefined) break;
      if (pathWork !== undefined) pathWork.navalPathExpansions += 1;
      componentByKey.set(coordKey(at), component);
      for (const neighbor of neighbors8V7(view, at)) {
        const key = coordKey(neighbor);
        if (!unassigned.delete(key)) continue;
        queue.push(neighbor);
      }
      yield;
    }
    component += 1;
  }
  const captureUnits = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      unitRoleRuleV7(view, unit).abilities.includes("CAPTURE"),
  );
  const visibleObjectiveClaimants = view.units.filter(
    (unit) =>
      unit.form === "LAND" &&
      publicPlayersAllied(view, view.viewer.id, unit.ownerId) &&
      unitRoleRuleV7(view, unit).abilities.includes("CAPTURE"),
  );
  const captureComponents = new Set(
    captureUnits.flatMap((unit) => {
      const id = componentByKey.get(coordKey(unit.at));
      return id === undefined ? [] : [id];
    }),
  );
  const objectives = [
    ...view.cities
      .filter((city) => isHostile(view, city.ownerId))
      .map((city) => ({ at: city.at, rank: 0 })),
    ...view.board.tiles
      .filter(
        (tile) =>
          tile.explored &&
          tile.site === "VILLAGE" &&
          tile.territoryOwnerId === null,
      )
      .map((tile) => ({ at: tile.at, rank: 1 })),
  ].sort(
    (left, right) =>
      left.rank - right.rank ||
      (captureUnits.length === 0
        ? 0
        : nearestDistance(
            left.at,
            captureUnits.map((unit) => unit.at),
          ) -
          nearestDistance(
            right.at,
            captureUnits.map((unit) => unit.at),
          )) ||
      left.at.y - right.at.y ||
      left.at.x - right.at.x,
  );
  const reachable = objectives.filter((objective) => {
    const id = componentByKey.get(coordKey(objective.at));
    return id !== undefined && captureComponents.has(id);
  });
  const overseas = objectives.filter((objective) => {
    const id = componentByKey.get(coordKey(objective.at));
    return id === undefined || !captureComponents.has(id);
  });
  const landFrontier = view.board.tiles.filter(
    (tile) =>
      !tile.explored &&
      neighbors8V7(view, tile.at).some((at) => {
        const adjacent = tilesByKey.get(coordKey(at));
        return adjacent?.explored === true && adjacent.biome !== null;
      }),
  );
  const captureReachableLandFrontier = landFrontier.filter((unknown) =>
    neighbors8V7(view, unknown.at).some((adjacent) => {
      const id = componentByKey.get(coordKey(adjacent));
      return id !== undefined && captureComponents.has(id);
    }),
  );
  const frontier = view.board.tiles
    .filter(
      (tile) =>
        !tile.explored &&
        neighbors8V7(view, tile.at).some((at) => {
          const adjacent = tilesByKey.get(coordKey(at));
          return adjacent?.explored === true && adjacent.biome === null;
        }),
    )
    .map((tile) => tile.at)
    .sort((left, right) => left.y - right.y || left.x - right.x);
  const objectiveComponents = new Set(
    objectives.flatMap((objective) => {
      const id = componentByKey.get(coordKey(objective.at));
      return id === undefined ? [] : [id];
    }),
  );
  for (const unknown of landFrontier)
    for (const adjacent of neighbors8V7(view, unknown.at)) {
      const id = componentByKey.get(coordKey(adjacent));
      if (id !== undefined) objectiveComponents.add(id);
    }
  const ownedCityComponents = new Set(
    view.cities.flatMap((city) => {
      if (city.ownerId !== view.viewer.id) return [];
      const id = componentByKey.get(coordKey(city.at));
      return id === undefined ? [] : [id];
    }),
  );
  const retainLandedUnitIds = new Set(
    captureUnits.flatMap((unit) => {
      const id = componentByKey.get(coordKey(unit.at));
      return id !== undefined &&
        objectiveComponents.has(id) &&
        !ownedCityComponents.has(id)
        ? [unit.id]
        : [];
    }),
  );
  const existingTransport = view.units.some(
    (unit) => unit.ownerId === view.viewer.id && unit.form === "EMBARKED",
  );
  const target = overseas[0]?.at ?? reachable[0]?.at ?? null;
  // pulp_wars-ykw.7: a landmass takes no more landings than it has work.
  // When the target is a neutral village on a landmass that already holds
  // as many of the viewer's and its allies' capturers as it has known
  // objectives (its uncaptured villages), the transports hold instead of
  // landing: on the
  // village-dense boards a whole army used to land for two or three
  // villages and re-embark, having done nothing, once the first units had
  // taken them.
  const targetComponentId =
    target === null ? undefined : componentByKey.get(coordKey(target));
  const targetIsVillage =
    target !== null && !view.cities.some((city) => same(city.at, target));
  const targetLandmassWork =
    targetComponentId === undefined
      ? 0
      : objectives.filter(
          (objective) =>
            componentByKey.get(coordKey(objective.at)) === targetComponentId,
        ).length;
  const targetLandmassClaimants =
    targetComponentId === undefined
      ? 0
      : visibleObjectiveClaimants.filter(
          (unit) => componentByKey.get(coordKey(unit.at)) === targetComponentId,
        ).length;
  const targetLandmassHasHostileCity =
    targetComponentId !== undefined &&
    view.cities.some(
      (city) =>
        isHostile(view, city.ownerId) &&
        componentByKey.get(coordKey(city.at)) === targetComponentId,
    );
  const targetLandmassSaturated =
    targetIsVillage &&
    !targetLandmassHasHostileCity &&
    targetLandmassClaimants > 0 &&
    targetLandmassClaimants >= targetLandmassWork;
  const targetHasCaptureUnit =
    target !== null &&
    (targetLandmassSaturated ||
      visibleObjectiveClaimants.some((unit) => same(unit.at, target)));
  const starts = [
    ...view.naval.ownedPorts
      .filter((port) => port.status === "ACTIVE")
      .map((port) => port.at),
    ...commands.flatMap((command) =>
      command.kind === "BUILD_PORT" ? [command.at] : [],
    ),
    ...view.board.tiles.flatMap((tile) =>
      publicFuturePortSurfaceV7(view, tile, tilesByKey) ? [tile.at] : [],
    ),
  ];
  const targetComponent =
    target === null ? undefined : componentByKey.get(coordKey(target));
  const targetComponentLand =
    targetComponent === undefined
      ? target === null
        ? []
        : [target]
      : land
          .filter(
            (tile) => componentByKey.get(coordKey(tile.at)) === targetComponent,
          )
          .map((tile) => tile.at);
  const targetLandDistances = yield* publicRouteDistancesV7(
    view,
    new Set(targetComponentLand.map(coordKey)),
    target === null ? [] : [target],
    pathWork,
  );
  const coastalTargetLand = targetComponentLand.filter((landAt) =>
    neighbors8V7(view, landAt).some((at) => {
      const tile = tilesByKey.get(coordKey(at));
      return tile?.explored === true && tile.biome === null;
    }),
  );
  const legalDisembarkKeys = new Set(
    commands.flatMap((command) =>
      command.kind === "DISEMBARK" ? [coordKey(command.at)] : [],
    ),
  );
  const closestCoastDistance = nearestRouteDistance(
    coastalTargetLand,
    targetLandDistances,
  );
  const targetLand =
    closestCoastDistance === null
      ? targetComponentLand
      : coastalTargetLand.filter(
          (at) =>
            targetLandDistances.get(coordKey(at)) === closestCoastDistance,
        );
  const legalTargetLand = coastalTargetLand.filter((at) => {
    const routeDistance = targetLandDistances.get(coordKey(at));
    return (
      legalDisembarkKeys.has(coordKey(at)) &&
      routeDistance !== undefined &&
      closestCoastDistance !== null &&
      routeDistance <= closestCoastDistance + 1
    );
  });
  const closestLegalLandingDistance = nearestRouteDistance(
    legalTargetLand,
    targetLandDistances,
  );
  const legalLandingLand =
    closestLegalLandingDistance === null
      ? []
      : legalTargetLand.filter(
          (at) =>
            targetLandDistances.get(coordKey(at)) ===
            closestLegalLandingDistance,
        );
  const landingLand = targetHasCaptureUnit
    ? []
    : target === null
      ? land
          .filter((tile) => {
            const id = componentByKey.get(coordKey(tile.at));
            return (
              id !== undefined &&
              !captureComponents.has(id) &&
              objectiveComponents.has(id) &&
              !ownedCityComponents.has(id)
            );
          })
          .map((tile) => tile.at)
      : legalLandingLand.length > 0
        ? legalLandingLand
        : targetLand;
  const landing = landingLand
    .filter((landAt) =>
      neighbors8V7(view, landAt).some((at) => {
        const tile = tilesByKey.get(coordKey(at));
        return tile?.explored === true && tile.biome === null;
      }),
    )
    .sort((left, right) => left.y - right.y || left.x - right.x);
  const routeGoals = [
    ...new Map(
      (target === null
        ? view.board.tiles.flatMap((tile) =>
            tile.explored &&
            tile.biome === null &&
            frontier.some((at) => distance(at, tile.at) === 1)
              ? [tile.at]
              : [],
          )
        : targetLand.flatMap((landAt) =>
            neighbors8V7(view, landAt).filter((at) => {
              const tile = tilesByKey.get(coordKey(at));
              return tile?.explored === true && tile.biome === null;
            }),
          )
      ).map((at) => [coordKey(at), at]),
    ).values(),
  ];
  const shallowDistances = yield* publicWaterRouteDistancesV7(
    view,
    routeGoals,
    false,
    pathWork,
  );
  const prospectiveWaterDistanceByKey = yield* publicWaterRouteDistancesV7(
    view,
    routeGoals,
    true,
    pathWork,
  );
  const shallowDistance = nearestRouteDistance(starts, shallowDistances);
  const anyWaterDistance = nearestRouteDistance(
    starts,
    prospectiveWaterDistanceByKey,
  );
  const captureLandDistance = yield* publicLandRouteDistanceV7(
    view,
    new Set(land.map((tile) => coordKey(tile.at))),
    captureUnits.map((unit) => unit.at),
    target === null ? [] : [target],
    pathWork,
  );
  const seaAdvantageous =
    target !== null &&
    overseas.length === 0 &&
    anyWaterDistance !== null &&
    captureLandDistance !== null &&
    anyWaterDistance + (closestCoastDistance ?? 0) + 3 < captureLandDistance;
  // Revision 19: an Egg stands on land; only naval and embarked units are
  // afloat.
  const visibleNavalDanger = view.units.some(
    (unit) => isHostile(view, unit.ownerId) && isAfloatV7(unit),
  );
  const ownedPortKeys = new Set(
    view.naval.ownedPorts.map((port) => coordKey(port.at)),
  );
  const visibleBlockaders = view.units
    .filter(
      (unit) =>
        isHostile(view, unit.ownerId) &&
        isAfloatV7(unit) &&
        ownedPortKeys.has(coordKey(unit.at)),
    )
    .map((unit) => unit.at);
  const visibleHostileFleet = view.units
    .filter((unit) => isHostile(view, unit.ownerId) && isAfloatV7(unit))
    .map((unit) => unit.at);
  const fleetGoals =
    visibleBlockaders.length > 0
      ? [...visibleBlockaders]
      : [...visibleHostileFleet];
  if (fleetGoals.length === 0)
    fleetGoals.push(
      ...view.units
        .filter(
          (unit) => unit.ownerId === view.viewer.id && unit.form === "EMBARKED",
        )
        .map((unit) => unit.at),
    );
  if (fleetGoals.length === 0)
    fleetGoals.push(
      ...view.board.tiles.flatMap((tile) =>
        tile.explored &&
        tile.improvement === "PORT" &&
        tile.territoryOwnerId !== null &&
        isHostile(view, tile.territoryOwnerId)
          ? [tile.at]
          : [],
      ),
    );
  const fleetDistanceByKey =
    fleetGoals.length === 0
      ? view.viewer.researchedTechs.includes("NAVIGATION")
        ? prospectiveWaterDistanceByKey
        : shallowDistances
      : yield* publicWaterRouteDistancesV7(
          view,
          fleetGoals,
          view.viewer.researchedTechs.includes("NAVIGATION"),
          pathWork,
        );
  const active =
    (overseas.length > 0 && reachable.length === 0) ||
    seaAdvantageous ||
    (objectives.length === 0 &&
      captureReachableLandFrontier.length === 0 &&
      frontier.length > 0) ||
    existingTransport ||
    visibleNavalDanger;
  if (!active) return NO_NAVAL_PLAN_V7;
  const deepWaterRequired =
    routeGoals.length > 0 &&
    anyWaterDistance !== null &&
    shallowDistance === null;
  const tree = queryTechnologyTreeV7(view);
  const researchCost = (tech: TechnologyIdV7): number =>
    tree.nodes.find((node) => node.id === tech)?.cost ?? 0;
  let reserveCoins = 0;
  if (!view.viewer.researchedTechs.includes("SHORECRAFT"))
    reserveCoins = researchCost("SHORECRAFT");
  else if (
    deepWaterRequired &&
    !view.viewer.researchedTechs.includes("NAVIGATION")
  )
    reserveCoins = researchCost("NAVIGATION");
  else if (view.naval.ownedPorts.every((port) => port.status !== "ACTIVE"))
    reserveCoins = 4;
  else if (
    visibleNavalDanger &&
    !view.units.some(
      (unit) => unit.ownerId === view.viewer.id && unit.role === "PATROL_BOAT",
    )
  )
    reserveCoins =
      effectiveRoleRuleV7("PATROL_BOAT", view.viewer.faction).cost ?? 5;
  return {
    active,
    target,
    frontier,
    landing,
    deepWaterRequired,
    visibleNavalDanger,
    seaShortcut: seaAdvantageous,
    holding: targetHasCaptureUnit,
    reserveCoins,
    retainLandedUnitIds,
    waterDistanceByKey: view.viewer.researchedTechs.includes("NAVIGATION")
      ? prospectiveWaterDistanceByKey
      : shallowDistances,
    prospectiveWaterDistanceByKey,
    fleetDistanceByKey,
  };
}

export function isPublicFuturePortSurfaceForPolicyV7(
  view: PlayerViewV7,
  at: CoordV7,
): boolean {
  const tilesByKey = new Map(
    view.board.tiles.map((tile) => [coordKey(tile.at), tile]),
  );
  const tile = tilesByKey.get(coordKey(at));
  return (
    tile !== undefined && publicFuturePortSurfaceV7(view, tile, tilesByKey)
  );
}

function publicFuturePortSurfaceV7(
  view: PlayerViewV7,
  tile: PlayerViewV7["board"]["tiles"][number],
  tilesByKey: ReadonlyMap<string, PlayerViewV7["board"]["tiles"][number]>,
): boolean {
  return (
    tile.explored &&
    tile.terrain === "SHALLOW_WATER" &&
    tile.territoryCityId !== null &&
    tile.improvement === null &&
    tile.site === null &&
    !tile.road &&
    view.cities.some(
      (city) =>
        city.id === tile.territoryCityId && city.ownerId === view.viewer.id,
    ) &&
    neighbors8V7(view, tile.at).some((at) => {
      const near = tilesByKey.get(coordKey(at));
      return (
        near?.explored === true &&
        near.biome !== null &&
        near.territoryCityId === tile.territoryCityId
      );
    })
  );
}

function* publicWaterRouteDistancesV7(
  view: PlayerViewV7,
  targets: readonly CoordV7[],
  allowDeep: boolean,
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, ReadonlyMap<string, number>> {
  if (targets.length === 0) return new Map();
  const water = new Set(
    view.board.tiles.flatMap((tile) =>
      tile.explored &&
      tile.biome === null &&
      (allowDeep || tile.terrain === "SHALLOW_WATER") &&
      !(
        tile.territoryOwnerId !== null &&
        tile.territoryOwnerId !== view.viewer.id &&
        publicPlayersAllied(view, view.viewer.id, tile.territoryOwnerId)
      )
        ? [coordKey(tile.at)]
        : [],
    ),
  );
  const distances = new Map<string, number>();
  const queue = targets
    .filter((at) => water.has(coordKey(at)))
    .map((at) => ({ at, steps: 0 }));
  for (const item of queue) distances.set(coordKey(item.at), 0);
  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item === undefined) break;
    if (pathWork !== undefined) pathWork.navalPathExpansions += 1;
    for (const next of neighbors8V7(view, item.at)) {
      const key = coordKey(next);
      if (!water.has(key) || distances.has(key)) continue;
      distances.set(key, item.steps + 1);
      queue.push({ at: next, steps: item.steps + 1 });
    }
    yield;
  }
  return distances;
}

function nearestRouteDistance(
  starts: readonly CoordV7[],
  distances: ReadonlyMap<string, number>,
): number | null {
  let best = Number.POSITIVE_INFINITY;
  for (const start of starts)
    best = Math.min(best, distances.get(coordKey(start)) ?? best);
  return Number.isFinite(best) ? best : null;
}

function* publicRouteDistancesV7(
  view: PlayerViewV7,
  passable: ReadonlySet<string>,
  targets: readonly CoordV7[],
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, ReadonlyMap<string, number>> {
  const distances = new Map<string, number>();
  const queue = targets
    .filter((at) => passable.has(coordKey(at)))
    .map((at) => ({ at, steps: 0 }));
  for (const item of queue) distances.set(coordKey(item.at), 0);
  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item === undefined) break;
    if (pathWork !== undefined) pathWork.navalPathExpansions += 1;
    for (const next of neighbors8V7(view, item.at)) {
      const key = coordKey(next);
      if (!passable.has(key) || distances.has(key)) continue;
      distances.set(key, item.steps + 1);
      queue.push({ at: next, steps: item.steps + 1 });
    }
    yield;
  }
  return distances;
}

function* publicLandRouteDistanceV7(
  view: PlayerViewV7,
  land: ReadonlySet<string>,
  starts: readonly CoordV7[],
  targets: readonly CoordV7[],
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, number | null> {
  if (starts.length === 0 || targets.length === 0) return null;
  const targetKeys = new Set(targets.map(coordKey));
  const seen = new Set<string>();
  const queue = starts
    .filter((at) => land.has(coordKey(at)))
    .map((at) => ({ at, steps: 0 }));
  for (const item of queue) seen.add(coordKey(item.at));
  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item === undefined) break;
    if (pathWork !== undefined) pathWork.navalPathExpansions += 1;
    if (targetKeys.has(coordKey(item.at))) return item.steps;
    for (const next of neighbors8V7(view, item.at)) {
      const key = coordKey(next);
      if (!land.has(key) || seen.has(key)) continue;
      seen.add(key);
      queue.push({ at: next, steps: item.steps + 1 });
    }
    yield;
  }
  return null;
}

function neighbors8V7(view: PlayerViewV7, at: CoordV7): readonly CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1)
      if (
        (x !== at.x || y !== at.y) &&
        x >= 0 &&
        y >= 0 &&
        x < view.board.width &&
        y < view.board.height
      )
        result.push({ x, y });
  return result;
}

function* addHostileThreatsWorkV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  pathWork?: MutablePolicyPathDiagnosticsV7,
): Generator<void, void> {
  const view = context.view;
  // Map curiosities (`pulp_wars-737.4`, section 11): a Monster threatens
  // exactly its provoke tiles and never a city (it never comes within 2 of
  // a center).
  const monster = context.curiosities?.monsterById.get(unit.id);
  if (monster !== undefined) {
    (context.threatenedTiles as Map<UnitId, ReadonlySet<string>>).set(
      unit.id,
      monster.provokeKeys,
    );
    return;
  }
  const reach = new Set(
    (yield* publicThreatenedTilesWorkV7(
      view,
      unit,
      context.threatLookup,
      pathWork,
      context.lookup,
    )).map(coordKey),
  );
  (context.threatenedTiles as Map<UnitId, ReadonlySet<string>>).set(
    unit.id,
    reach,
  );
  // The Ice Folk revision (`pulp_wars-7g3.4`): a unit's danger counts an
  // Ice Folk unit's Glide, but a city is threatened only by the reach it
  // has without Glide. Counting Glide here made every city near hostile
  // Snow threatened, and the policy then trained and held its units at home
  // instead of attacking (12 of 40 head-to-head games against 28; without
  // Glide in the city test, 21 of 40).
  const tiles =
    unit.form === "LAND" && unitGlidesV7(view, unit)
      ? new Set(
          (yield* publicThreatenedTilesWorkV7(
            view,
            unit,
            context.threatLookup,
            undefined,
            context.lookup,
            false,
          )).map(coordKey),
        )
      : reach;
  for (const city of view.cities.filter(
    (candidate) => candidate.ownerId === view.viewer.id,
  )) {
    const imminentCapture =
      unit.form === "LAND" &&
      unit.captureEligible &&
      unitRoleRuleV7(view, unit).abilities.includes("CAPTURE") &&
      same(unit.at, city.at);
    if (!tiles.has(coordKey(city.at)) && !imminentCapture) continue;
    context.threats.push({
      cityId: city.id,
      unitId: unit.id,
      severity:
        imminentCapture || same(unit.at, city.at)
          ? 3
          : distance(unit.at, city.at) <=
              publicCombatFacts(view, unit, context.lookup).maximumRange
            ? 2
            : 1,
    });
    yield;
  }
}

export function publicThreatenedTilesForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CoordV7[] {
  const lookup: PublicThreatLookupV7 = {
    occupantsByKey: new Map(),
    cityOwnersByKey: new Map(),
    engineeringOwnerIds: new Set(
      view.viewer.researchedTechs.includes("ENGINEERING")
        ? [view.viewer.id]
        : [],
    ),
  };
  drain(publicThreatLookupWorkV7(view, lookup));
  return drain(publicThreatenedTilesWorkV7(view, unit, lookup));
}

/**
 * `pulp_wars-68k.3`: the public facts of the naval plan at this decision
 * (inactive whenever Shorecraft is forbidden in the match).
 */
export function inspectNormalNavalPlanV7(view: PlayerViewV7): {
  readonly active: boolean;
  readonly target: CoordV7 | null;
  readonly seaShortcut: boolean;
  readonly reserveCoins: number;
} {
  const plan = drain(
    navalPlanWorkV7(
      view,
      queryAiReadyCommandsV7(view).map((item) => item.command),
    ),
  );
  return {
    active: plan.active,
    target: plan.target,
    seaShortcut: plan.seaShortcut,
    reserveCoins: plan.reserveCoins,
  };
}

/**
 * Tuning 6 (`pulp_wars-w49.6`): the army facts of one decision, for tests
 * and diagnostics: the assault mode of every own fighting unit that
 * belongs to a hostile position, the research target and whether it is
 * due, and the threat state of the own centers.
 */
export function inspectNormalArmyV7(view: PlayerViewV7): {
  readonly army: boolean;
  readonly modes: readonly {
    readonly unitId: UnitId;
    readonly mode: ArmyAssaultModeV7;
  }[];
  readonly research: {
    readonly tech: TechnologyIdV7;
    readonly cost: number;
    readonly due: boolean;
    /** Tuning 7: the unit the technology itself unlocks, or null. */
    readonly unlocks: UnitRoleIdV7 | null;
    /** Tuning 7: a growth technology of a seat at its unit limit. */
    readonly growth: boolean;
  } | null;
  readonly threatDistance: number;
  readonly pressed: boolean;
  readonly expanding: boolean;
  /** Tuning 7: an enemy army is in the field (`armyWarV7`). */
  readonly war: boolean;
  /**
   * Step two of the Undead pass (`pulp_wars-w49.24`): an Undead seat short
   * of units trains before it researches (`armyUndeadBodiesFirstV7`); false
   * for every other seat.
   */
  readonly bodiesFirst: boolean;
  /** Tuning 7: the positions, each with its weights. */
  readonly positions: readonly {
    readonly hostileIds: readonly UnitId[];
    readonly ownIds: readonly UnitId[];
    readonly mode: ArmyAssaultModeV7;
    readonly joined: boolean;
    readonly hostile: number;
    readonly near: number;
    readonly coming: number;
  }[];
} {
  const context = makeContext(
    view,
    queryAiReadyCommandsV7(view).map((item) => item.command),
  );
  const target = armyResearchTargetV7(context);
  return {
    army: context.army,
    modes: [...armyAssaultV7(context).positionByOwn]
      .map(([unitId, position]) => ({ unitId, mode: position.mode }))
      .sort((left, right) => left.unitId - right.unitId),
    research:
      target === null ? null : { ...target, due: armyResearchIsDueV7(context) },
    threatDistance: armyThreatDistanceV7(context),
    pressed: armyPressedV7(context),
    expanding: armyExpandingV7(context),
    war: armyWarV7(context),
    bodiesFirst: armyUndeadBodiesFirstV7(context),
    positions: [...new Set(armyAssaultV7(context).positionByHostile.values())]
      .map((position) => ({
        hostileIds: position.hostiles
          .map((unit) => unit.id)
          .sort((left, right) => left - right),
        ownIds: [...position.own].sort((left, right) => left - right),
        mode: position.mode,
        joined: position.joined,
        hostile: position.hostile,
        near: position.near,
        coming: position.coming,
      }))
      .sort(
        (left, right) => (left.hostileIds[0] ?? 0) - (right.hostileIds[0] ?? 0),
      ),
  };
}

export function inspectNormalTacticalFactsV7(view: PlayerViewV7): {
  readonly threats: readonly ThreatV7[];
  readonly objectiveByUnitId: readonly {
    readonly unitId: UnitId;
    readonly at: CoordV7;
  }[];
  readonly roadCorridor: RoadCorridorV7 | null;
  readonly defenderReplacementActionKeys: readonly string[];
  /** `pulp_wars-9s0.1`: the campaign jobs and the state of each target. */
  readonly campaign: {
    readonly atWar: boolean;
    readonly warTraining: boolean;
    readonly assignments: readonly {
      readonly unitId: UnitId;
      readonly job: CampaignJobV7;
      readonly at: CoordV7;
      readonly targetCityId: CityId | null;
      readonly raid?: true;
    }[];
    readonly targets: readonly {
      readonly cityId: CityId;
      readonly assigned: number;
      readonly home: number;
      readonly out: number;
      readonly needed: number;
      readonly push: boolean;
    }[];
  };
  /** `pulp_wars-9s0.8`: the savings goal, or null. */
  readonly savings: {
    readonly role: UnitRoleIdV7 | null;
    readonly tech: TechnologyIdV7 | null;
    readonly cost: number;
    readonly affordable: boolean;
  } | null;
  /** `pulp_wars-9s0.8`: the hunted units and their hunters. */
  readonly hunts: readonly {
    readonly targetUnitId: UnitId;
    readonly hunterUnitIds: readonly UnitId[];
  }[];
} {
  const context = makeContext(
    view,
    queryAiReadyCommandsV7(view).map((item) => item.command),
  );
  return {
    threats: context.threats,
    objectiveByUnitId: [...context.tactical.objectiveByUnitId].map(
      ([unitId, at]) => ({ unitId, at }),
    ),
    roadCorridor: context.tactical.roadCorridor,
    defenderReplacementActionKeys: [
      ...context.tactical.defenderReplacementActionKeys,
    ],
    campaign: {
      atWar: context.tactical.campaign?.atWar === true,
      warTraining: warTrainingFirstV7(context),
      assignments: [
        ...(context.tactical.campaign?.assignmentByUnitId ?? []),
      ].map(([unitId, assignment]) => ({
        unitId,
        job: assignment.job,
        at: assignment.at,
        targetCityId: assignment.targetCityId,
        // Tuning 7: a raid on an undefended city is marked.
        ...(assignment.raid === true ? { raid: true as const } : {}),
      })),
      targets: [...(context.tactical.campaign?.targetByCityId ?? [])].map(
        ([cityId, target]) => ({
          cityId,
          assigned: target.assigned,
          home: target.home,
          out: target.out,
          needed: target.needed,
          push: target.push,
        }),
      ),
    },
    savings: savingsPlanV7(context),
    hunts: huntPlansV7(context).map((plan) => ({
      targetUnitId: plan.target.id,
      hunterUnitIds: [...plan.hunters.keys()],
    })),
  };
}

/**
 * `pulp_wars-9s0.1`: the standing military share. While a hostile city is
 * known and fewer than two thirds of the seat's unit slots are filled, land
 * production comes before the economy (except a city level and the opening
 * growth harvest), so losses at the front are replaced first. Above that
 * share production keeps its old place after the economy.
 */
const WAR_TRAINING_PRIORITY_V7 = 1205;
const WAR_TRAINING_FILL_NUMERATOR_V7 = 2;
const WAR_TRAINING_FILL_DENOMINATOR_V7 = 3;

function warTrainingFirstV7(context: PolicyContextV7): boolean {
  if (context.warTraining !== null) return context.warTraining;
  const view = context.view;
  let result = false;
  if (context.tactical.campaign?.atWar === true) {
    let capacity = 0;
    const ownCityIds = new Set<CityId>();
    for (const city of view.cities) {
      if (city.ownerId !== view.viewer.id) continue;
      ownCityIds.add(city.id);
      capacity += cityUnitCapacityForV7(
        city.level,
        view.viewer.researchedTechs,
        view.viewer.faction,
        cityBarracksV7(city),
      );
    }
    let used = 0;
    for (const unit of view.units)
      if (
        unit.ownerId === view.viewer.id &&
        unit.homeCityId !== null &&
        ownCityIds.has(unit.homeCityId)
      )
        used += unitCapacitySlotsV7(view, unit);
    result =
      used * WAR_TRAINING_FILL_DENOMINATOR_V7 <
      capacity * WAR_TRAINING_FILL_NUMERATOR_V7;
  }
  context.warTraining = result;
  return result;
}

/**
 * `pulp_wars-9s0.8` savings plan. The policy spent every Coin as soon as it
 * had it: a freed slot took the cheapest unit, and the production value
 * (HP minus twice the cost) rated the Chivalry-tier unit at or below zero,
 * so Knights, Scrap Buggies, and T-Rex Eggs were never produced.
 *
 * While the seat is at war, no own city is threatened, and it fields at
 * least `SAVINGS_ARMY_MINIMUM_V7` attack-capable land units (the army is not
 * starved), it saves for one goal:
 *
 * - **the Chivalry-tier unit** (`KNIGHT` role) once researched, while it has
 *   fewer than `SAVINGS_GOAL_MAXIMUM_V7` of them and an own city has the
 *   slots for one; or
 * - **Chivalry itself**, once its prerequisites are researched.
 *
 * The goal is affordable now, or within `SAVINGS_TURNS_V7` turns of the
 * public city income; otherwise there is no plan. An affordable goal is
 * bought first (priority `SAVINGS_BUY_PRIORITY_V7`, and the goal unit wins its
 * city's production choice without the per-Coin penalty: the Coins were
 * set aside for it). An unaffordable one holds: other training waits, and
 * research and construction that would leave fewer Coins than the goal
 * costs wait, except a city level-up and the opening growth harvest.
 */
const SAVINGS_GOAL_ROLE_V7: UnitRoleIdV7 = "KNIGHT";
const SAVINGS_GOAL_MAXIMUM_V7 = 2;
/** `pulp_wars-68k.6`: the role a seat at a single-file front saves for. */
const CHOKEPOINT_SIEGE_ROLE_V7: UnitRoleIdV7 = "CATAPULT";
const SAVINGS_ARMY_MINIMUM_V7 = 3;
const SAVINGS_TURNS_V7 = 2;
const SAVINGS_BUY_PRIORITY_V7 = 1206;
/** The goal unit's production value bonus once it is offered. */
const SAVINGS_GOAL_VALUE_V7 = 30;
/** Spitters a Dinosaur seat at war lays before the bias stops. */
const SPITTER_TARGET_V7 = 2;
const SPITTER_BIAS_V7 = 16;

interface SavingsPlanV7 {
  readonly role: UnitRoleIdV7 | null;
  readonly tech: TechnologyIdV7 | null;
  readonly cost: number;
  /** The Coins cover the goal now: it is bought before other spending. */
  readonly affordable: boolean;
}

function savingsPlanV7(context: PolicyContextV7): SavingsPlanV7 | null {
  if (context.savings !== undefined) return context.savings;
  context.savings = computeSavingsPlanV7(context);
  return context.savings;
}

function computeSavingsPlanV7(context: PolicyContextV7): SavingsPlanV7 | null {
  const view = context.view;
  // Tuning 5 (`pulp_wars-w49.4`): an army seat trains every turn, so it
  // never holds training for a unit; it saves for the technology of its
  // next fighting role (construction that does not level a city waits
  // while that is at most two turns of income away). A single-file front
  // keeps its siege savings.
  if (context.army && context.chokepoint === null) {
    if (context.threats.length > 0 || context.openingGrowthHarvest) return null;
    const target = armyResearchTargetV7(context);
    // Tuning 6 (`pulp_wars-w49.6`): only while the technology is due;
    // otherwise the Coins go to growth first.
    if (target === null || !armyResearchIsDueV7(context)) return null;
    // Tuning 7: in the field the Coins go to units and growth first.
    if (armyWarV7(context) && !target.growth) return null;
    if (view.viewer.coins >= target.cost)
      return {
        role: null,
        tech: target.tech,
        cost: target.cost,
        affordable: true,
      };
    return view.viewer.coins + SAVINGS_TURNS_V7 * armyIncomeV7(context) >=
      target.cost
      ? { role: null, tech: target.tech, cost: target.cost, affordable: false }
      : null;
  }
  if (
    context.tactical.campaign?.atWar !== true ||
    context.threats.length > 0 ||
    context.openingGrowthHarvest
  )
    return null;
  const faction = view.viewer.faction;
  // pulp_wars-68k.6: at a single-file front the seat saves for its siege
  // unit (or the technology one step away) instead of the Chivalry tier.
  const siegeRule = effectiveRoleRuleV7(CHOKEPOINT_SIEGE_ROLE_V7, faction);
  const goalRole: UnitRoleIdV7 =
    chokepointSiegeShortfallV7(context) &&
    policySiegeRuleV7(siegeRule) &&
    // A siege unit the match forbids (a mission) is no goal.
    (siegeRule.technology === null ||
      view.viewer.researchedTechs.includes(siegeRule.technology) ||
      !forbiddenTechnologiesV7(view.setup).has(siegeRule.technology))
      ? CHOKEPOINT_SIEGE_ROLE_V7
      : SAVINGS_GOAL_ROLE_V7;
  const rule = effectiveRoleRuleV7(goalRole, faction);
  if (rule.cost === null) return null;
  let army = 0;
  let goals = 0;
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id) continue;
    if (unit.role === goalRole) goals += 1;
    else if (unit.form === "LAND") {
      const own = unitRoleRuleV7(view, unit);
      if (own.abilities.includes("ATTACK") && own.attack2 > 0) army += 1;
    }
  }
  if (army < SAVINGS_ARMY_MINIMUM_V7) return null;
  const ownCities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  );
  let role: UnitRoleIdV7 | null = null;
  let tech: TechnologyIdV7 | null = null;
  let cost: number;
  if (
    rule.technology === null ||
    view.viewer.researchedTechs.includes(rule.technology)
  ) {
    const slots = roleMechanicsV7(goalRole, faction).capacitySlots;
    if (
      goals >= SAVINGS_GOAL_MAXIMUM_V7 ||
      !ownCities.some((city) => freeCapacity(view, city.id) >= slots)
    )
      return null;
    role = goalRole;
    cost = rule.cost;
  } else {
    if (researchChain(view, rule.technology).length !== 1) return null;
    const node = queryTechnologyTreeV7(view).nodes.find(
      (item) => item.id === rule.technology,
    );
    if (node === undefined) return null;
    tech = rule.technology;
    cost = node.cost;
  }
  const coins = view.viewer.coins;
  if (coins >= cost) return { role, tech, cost, affordable: true };
  const income = ownCities.reduce(
    (total, city) => total + attributableCityIncome(view, city),
    0,
  );
  return coins + SAVINGS_TURNS_V7 * income >= cost
    ? { role, tech, cost, affordable: false }
    : null;
}

/**
 * Spending the savings plan holds back: a command that is not the goal and
 * would leave fewer Coins than the goal costs (`cost` is what it spends).
 */
function savingsHoldsV7(
  context: PolicyContextV7,
  command: CommandV7,
  cost: number,
): boolean {
  const plan = savingsPlanV7(context);
  if (plan === null || plan.affordable || cost <= 0) return false;
  if (command.kind === "RESEARCH" && command.tech === plan.tech) return false;
  return context.view.viewer.coins - cost < plan.cost;
}

/**
 * Tuning 5 (`pulp_wars-w49.4`): army play, the hooks of
 * `src/ai/v7-army.ts`. Every helper returns its neutral answer for a seat
 * that does not play the army rules (`context.army`).
 *
 * The visible hostile land units army play counts (never a Monster).
 */
function armyHostilesV7(context: PolicyContextV7): readonly PublicUnitV7[] {
  if (context.armyHostiles !== null) return context.armyHostiles;
  context.armyHostiles = context.lookup.visibleHostiles.filter(
    (unit) =>
      unit.form === "LAND" &&
      unit.hp > 0 &&
      context.curiosities?.monsterById.has(unit.id) !== true,
  );
  return context.armyHostiles;
}

/** An enemy city is known, or a hostile land unit is near an own center. */
function armyAlertV7(context: PolicyContextV7): boolean {
  if (!context.army || context.naval.active || context.openingGrowthHarvest)
    return false;
  if (context.armyAlert !== null) return context.armyAlert;
  const view = context.view;
  let result = context.tactical.campaign?.atWar === true;
  if (!result) {
    const hostiles = armyHostilesV7(context);
    result =
      hostiles.length > 0 &&
      view.cities.some(
        (city) =>
          city.ownerId === view.viewer.id &&
          hostiles.some(
            (unit) => distance(unit.at, city.at) <= ARMY_ALERT_RADIUS_V7,
          ),
      );
  }
  context.armyAlert = result;
  return result;
}

function armyCountsForContextV7(context: PolicyContextV7): ArmyCountsV7 {
  context.armyCounts ??= armyCountsV7(
    context.view,
    (unit) =>
      isHostile(context.view, unit.ownerId) &&
      context.curiosities?.monsterById.has(unit.id) !== true,
  );
  return context.armyCounts;
}

/** The army's next technology (`armyResearchTargetV7`). */
interface ArmyResearchTargetV7 {
  readonly tech: TechnologyIdV7;
  readonly cost: number;
  /**
   * Tuning 7: the unit the technology itself unlocks, when the chain is one
   * step long (null for a longer chain, Roads, Commerce, and growth).
   */
  readonly unlocks: UnitRoleIdV7 | null;
  /** Tuning 7: a growth technology of a seat stalled at its unit limit. */
  readonly growth: boolean;
}

/**
 * The technology an alert seat researches next: the first step of the
 * cheapest chain to a fighting role its tree unlocks and it cannot train
 * yet (line, defender, ranged, siege, or breakthrough; never a role the
 * match forbids, nor the Banshee against no living seat); once it has
 * those, the chain to its support role (the Captain, the Necromancer, the
 * Warboss). `cost` is that first step's price now.
 */
function armyResearchTargetV7(
  context: PolicyContextV7,
): ArmyResearchTargetV7 | null {
  if (context.armyResearch !== undefined) return context.armyResearch;
  type Target = ArmyResearchTargetV7;
  // Tuning 6 (`pulp_wars-w49.6`): from the first turn, not only while
  // alert, and unit by unit in the faction's own order
  // (`ARMY_RESEARCH_ROLES_V7`): its signature units first. With three
  // cities Roads comes after the first two units of the order, and
  // Commerce after the last.
  let chosen: Target | null = null;
  if (
    context.army &&
    !context.naval.active &&
    !normalOpeningResearchPendingV7(context.view)
  ) {
    const view = context.view;
    const faction = view.viewer.faction;
    const forbidden = forbiddenTechnologiesV7(view.setup);
    const uselessBanshee =
      faction === "UNDEAD" &&
      !hasLivingHostileSeatV7(view, (owner) => isHostile(view, owner));
    const toward = (
      technology: TechnologyIdV7,
      role: UnitRoleIdV7 | null = null,
    ): Target | null => {
      if (view.viewer.researchedTechs.includes(technology)) return null;
      const chain = researchChain(view, technology);
      const first = chain[0];
      return first === undefined || chain.some((tech) => forbidden.has(tech))
        ? null
        : {
            tech: first,
            cost: totalResearchCost(view, [first]),
            unlocks: chain.length === 1 ? role : null,
            growth: false,
          };
    };
    // Tuning 7 (`pulp_wars-w49.10`): a seat at its unit limit with no
    // growth left to buy researches the growth its land can use, once it
    // can train the first unit of its order (the Marksman, the Zombie, the
    // Bomb Chucker: a seat that put growth before every unit was overrun).
    const firstRole = (ARMY_RESEARCH_ROLES_V7[faction] ?? []).find((role) => {
      const rule = effectiveRoleRuleV7(role, faction);
      return (
        rule.technology !== null &&
        rule.cost !== null &&
        factionUnlocksRoleV7(faction, role) &&
        !(uselessBanshee && role === "MARKSMAN")
      );
    });
    const firstTechnology =
      firstRole === undefined
        ? null
        : effectiveRoleRuleV7(firstRole, faction).technology;
    const growth =
      firstTechnology === null ||
      view.viewer.researchedTechs.includes(firstTechnology) ||
      // Step two of the Undead pass: growth first.
      armyUndeadGrowthFirstV7(context)
        ? armyGrowthResearchV7(context)
        : null;
    if (growth !== null) chosen = { ...growth, unlocks: null, growth: true };
    // Tuning 8 (`pulp_wars-w49.11`): no Roads and no Commerce while an
    // enemy army is in the field (a lab attacker bought both in the middle
    // of its assault).
    const roads =
      !armyWarV7(context) &&
      view.cities.filter((city) => city.ownerId === view.viewer.id).length >=
        ARMY_ROADS_CITIES_V7;
    // The Dinosaur pass (`pulp_wars-w49.15`): a crowded Dinosaur seat
    // researches its slot technologies (`armyDinosaurCrowdedV7`), after the
    // growth its land can use: Nesting, and Planning (through
    // Administration, 24 Coins) once it can lay the Triceratops, the first
    // unit of two slots. (In the second run of the first diagnostic match
    // Planning before it put the Triceratops's technology back from round
    // 17 to round 22.)
    if (chosen === null && armyDinosaurCrowdedV7(context)) {
      const charger = effectiveRoleRuleV7(
        ARMY_DINOSAUR_CHARGER_ROLE_V7,
        faction,
      ).technology;
      const slots =
        toward("FORTIFICATION") ??
        (charger !== null && view.viewer.researchedTechs.includes(charger)
          ? toward("PLANNING")
          : null);
      if (slots !== null) chosen = { ...slots, growth: true };
    }
    // The Undead pass, correction: the cure first (`armyCureDueV7`).
    if (armyCureDueV7(context)) {
      const cure = effectiveRoleRuleV7("CAPTAIN", faction);
      if (cure.technology !== null && cure.cost !== null)
        chosen = toward(cure.technology, "CAPTAIN") ?? chosen;
    }
    // Step two of the Goblin pass (`pulp_wars-w49.23`): the Orc Brute
    // first once Knights or Raiders are in sight (`armyBlockerV7`).
    if (armyBlockerV7(context) !== "NO") {
      const blocker = effectiveRoleRuleV7("GUARD", faction);
      if (blocker.technology !== null)
        chosen = toward(blocker.technology, "GUARD") ?? chosen;
    }
    let unlocked = 0;
    const armyHostiles = armyHostilesV7(context);
    for (const role of armyMartianResearchRolesV7(context)) {
      if (chosen !== null) break;
      if (roads && unlocked === ARMY_ROADS_AFTER_ROLES_V7)
        chosen = toward("ROADS");
      if (chosen !== null) break;
      const rule = effectiveRoleRuleV7(role, faction);
      // The Undead pass, correction: Pestilence (the Liches' Plague) before
      // the last unit of the order, once the seat fields Liches.
      if (
        faction === "UNDEAD" &&
        role === "KNIGHT" &&
        view.units.filter(
          (unit) => unit.ownerId === view.viewer.id && isLichV7(view, unit),
        ).length >= ARMY_PESTILENCE_LICHES_V7
      )
        chosen = toward("EXPLOSIVES");
      if (chosen !== null) break;
      // The Martian pass (`pulp_wars-w49.14`): Force Fields (the Shield
      // Projectors' field) before the Tripod once the seat fields a
      // Projector, and Heat Sinks before the Mothership once it fields two
      // Ray Gunners.
      if (faction === "MARTIAN") {
        const fielded = (ability: "FORCE_FIELD" | "HEAT_RAY"): number =>
          view.units.filter(
            (unit) =>
              unit.ownerId === view.viewer.id &&
              unit.form === "LAND" &&
              unit.role ===
                (ability === "FORCE_FIELD" ? "GUARD" : "MARKSMAN") &&
              unitRoleRuleV7(view, unit).abilities.includes(ability),
          ).length;
        // The correction: before the Ray Gunner, not before the Tripod
        // (a seat with two Projectors from round 6 owned no Force Fields
        // in round 16, and the field is now also what a Knight's first
        // attack does not kill through).
        if (
          role === "MARKSMAN" &&
          fielded("FORCE_FIELD") >= ARMY_FORCE_FIELDS_PROJECTORS_V7
        )
          chosen = toward("FORTIFICATION");
        // Step two of the Martian pass (`pulp_wars-w49.25`): at the first
        // unit of the order after the Ray Gunner, not at the Mothership
        // (the last). A seat fielded five and six Ray Gunners from round
        // 17 to round 25 of two diagnostic matches without Heat Sinks:
        // every second ray at half power.
        else if (
          role !== "GUARD" &&
          role !== "MARKSMAN" &&
          fielded("HEAT_RAY") >= ARMY_HEAT_SINKS_RAY_GUNNERS_V7
        )
          chosen =
            toward("FIELDCRAFT") ??
            // Step two of the Martian pass (7r58): City Walls hold a
            // garrison against a Saucer's Tractor Beam, so the seat that
            // sees one behind Walls researches the Disintegrator (its
            // rays ignore Walls and Field Defense) once its Ray Gunners
            // have their Heat Sinks. (It was the last of the late
            // technologies, after every unit of the order.)
            (armyHostiles.some((unit) => heldByCityWallsForPolicyV7(view, unit))
              ? toward("EXPLOSIVES")
              : null);
      }
      if (chosen !== null) break;
      // The Dinosaur pass (`pulp_wars-w49.15`): Nesting (a unit slot in
      // every city, sturdier Eggs) before the Triceratops
      // once the seat fields an Ankylosaurus, and Wallbreaker (the second
      // tile of the run-up) before the T-Rex once it fields two
      // Triceratops.
      if (faction === "DINOSAUR") {
        const fielded = (wanted: UnitRoleIdV7): number =>
          view.units.filter(
            (unit) =>
              unit.ownerId === view.viewer.id &&
              unit.form === "LAND" &&
              unit.role === wanted,
          ).length;
        if (
          role === ARMY_DINOSAUR_CHARGER_ROLE_V7 &&
          fielded("GUARD") >= ARMY_NESTING_DEFENDERS_V7
        )
          chosen = toward("FORTIFICATION");
        // The correction: at the first unit of the order after the
        // Triceratops, not at the T-Rex (the last): a seat that fielded
        // Triceratops for fifteen rounds never came to it.
        else if (
          role !== "GUARD" &&
          role !== ARMY_DINOSAUR_CHARGER_ROLE_V7 &&
          fielded(ARMY_DINOSAUR_CHARGER_ROLE_V7) >= ARMY_WALLBREAKER_CHARGERS_V7
        )
          chosen = toward("EXPLOSIVES");
        // Planning (a unit slot in every city) before the T-Rex, which
        // fills two, once the Shaman's Administration is owned.
        if (
          chosen === null &&
          role === "KNIGHT" &&
          view.viewer.researchedTechs.includes("ADMINISTRATION")
        )
          chosen = toward("PLANNING");
      }
      if (chosen !== null) break;
      if (
        rule.technology === null ||
        rule.cost === null ||
        !factionUnlocksRoleV7(faction, role) ||
        (uselessBanshee && role === "MARKSMAN")
      )
        continue;
      chosen = toward(rule.technology, role);
      unlocked += 1;
    }
    if (chosen === null && roads)
      chosen = toward("ROADS") ?? toward("COMMERCE");
    // Correction pass (`pulp_wars-w49.11`): with every unit of its order
    // unlocked the clock of a seat at war goes on to the technologies an
    // army uses (a rich
    // Human seat bought nothing for nine rounds on 22 Coins a turn).
    if (armyWarV7(context)) {
      // Step two of the Ice Folk pass (`pulp_wars-w49.27`): an Ice Folk
      // seat's first is Brittle (a Shatter at 4 HP or fewer).
      if (chosen === null && faction === "ICE_FOLK")
        chosen = toward("EXPLOSIVES");
      // Step two of the Dwarf pass (`pulp_wars-w49.28`): a Dwarf seat's
      // first is Blasting Charges (eruptions of 3, Steam Cannons through
      // Walls, Field Defense, and Dig In, and the melee Breach).
      if (chosen === null && faction === "DWARF") chosen = toward("EXPLOSIVES");
      for (const technology of ARMY_LATE_RESEARCH_V7) {
        if (chosen !== null) break;
        chosen = toward(technology);
      }
    }
  }
  context.armyResearch = chosen;
  return context.armyResearch;
}

/**
 * Step two of the Martian pass (`pulp_wars-w49.25`,
 * docs/product/RULESET_7_TUNING_MARTIAN.md section 14): the order in which
 * a seat researches toward its units (`ARMY_RESEARCH_ROLES_V7`), and for a
 * Martian seat the Tripod before the Shock Trooper unless the enemy in
 * sight fights hand to hand: with `ARMY_RANGED_ENEMY_UNITS_V7` visible
 * hostile land units or more, at most half of them attacking from two
 * tiles or more, the Shock Trooper keeps its place (its Shock Field is for
 * units that strike from the next tile, and it is the body a Projector's
 * line has none of). Against shooters, and with no enemy in sight, the
 * Tripod is the unit that kills from two tiles. The two chains are two
 * technologies each.
 */
function armyMartianResearchRolesV7(
  context: PolicyContextV7,
): readonly UnitRoleIdV7[] {
  const view = context.view;
  const order = ARMY_RESEARCH_ROLES_V7[view.viewer.faction] ?? [];
  if (!armyMartianSeatV7(context)) return order;
  const hostiles = armyHostilesV7(context);
  const shooters = hostiles.filter(
    (unit) => publicCombatFacts(view, unit, context.lookup).maximumRange >= 2,
  ).length;
  const melee =
    hostiles.length >= ARMY_RANGED_ENEMY_UNITS_V7 &&
    shooters * 2 <= hostiles.length;
  // A chain that is begun is finished first (one of its two technologies
  // is owned, the other chain's is not), so that the enemy walking in and
  // out of sight does not buy half of each.
  const owns = (technology: TechnologyIdV7): boolean =>
    view.viewer.researchedTechs.includes(technology);
  const heavyBegun = owns("ENGINEERING") && !owns("METALLURGY");
  const siegeBegun = owns("FORESTRY") && !owns("SAWMILLING");
  if (heavyBegun !== siegeBegun ? heavyBegun : melee) return order;
  const heavy = order.indexOf("SWORDSMAN");
  const siege = order.indexOf("CATAPULT");
  if (heavy < 0 || siege < 0 || siege < heavy) return order;
  const swapped = order.slice();
  swapped[heavy] = "CATAPULT";
  swapped[siege] = "SWORDSMAN";
  return swapped;
}

/**
 * Tuning 6: the army's next technology is due (`armyResearchDueV7`): the
 * seat's city levels are worth more technologies than it owns.
 */
function armyResearchIsDueV7(context: PolicyContextV7): boolean {
  const view = context.view;
  // Tuning 7: the growth technology of a stalled seat is always due.
  if (armyResearchTargetV7(context)?.growth === true) return true;
  return armyResearchDueV7(
    view.cities.reduce(
      (total, city) =>
        city.ownerId === view.viewer.id ? total + city.level : total,
      0,
    ),
    armyTempoTechnologiesV7(view),
  );
}

/**
 * The Industry reshuffle (`pulp_wars-w49.21`, 7r56,
 * docs/product/RULESET_7_INDUSTRY_RESHUFFLE.md): the technologies a seat
 * owns as its research tempo counts them (the city-levels rule of
 * `armyResearchDueV7` and the war clock of `armyResearchClockDueV7`). The
 * root of Industry does not count. A defender costs two technologies since
 * the reshuffle (the root, then Fortification) where it cost one, so with
 * the root counted every unit of an order came one technology's worth of
 * city levels, or of rounds at war, later: an Undead seat bought the root
 * in round 3 and Fortification, for its first Zombie, in round 8.
 */
function armyTempoTechnologiesV7(view: PlayerViewV7): number {
  const owned = view.viewer.researchedTechs;
  return owned.length - Number(owned.includes("DRILL"));
}

/**
 * Tuning 6: growth that goes before training while no enemy is near: it
 * levels a city now, or costs at most `ARMY_CHEAP_GROWTH_COINS_V7` per
 * population (a harvest, a hunt).
 */
function armyCheapGrowthV7(preview: {
  readonly cost: number;
  readonly levelsReached: readonly unknown[];
  readonly populationDeltaByCity: readonly { readonly delta: number }[];
}): boolean {
  const population = sum(
    preview.populationDeltaByCity.map((item) => item.delta),
  );
  return (
    preview.levelsReached.length > 0 ||
    (population > 0 && preview.cost <= ARMY_CHEAP_GROWTH_COINS_V7 * population)
  );
}

/**
 * The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur army seat with
 * `ARMY_DINOSAUR_CROWDED_UNITS_V7` units or Eggs and no city with
 * `ARMY_DINOSAUR_CROWDED_FREE_SLOTS_V7` free unit slots (the room of a
 * Triceratops or a T-Rex).
 */
function armyDinosaurCrowdedV7(context: PolicyContextV7): boolean {
  const view = context.view;
  if (!context.army || view.viewer.faction !== "DINOSAUR") return false;
  const cities = view.cities.filter((city) => city.ownerId === view.viewer.id);
  return (
    cities.length > 0 &&
    view.units.filter((unit) => unit.ownerId === view.viewer.id).length >=
      ARMY_DINOSAUR_CROWDED_UNITS_V7 &&
    cities.every(
      (city) =>
        freeCapacity(view, city.id) < ARMY_DINOSAUR_CROWDED_FREE_SLOTS_V7,
    )
  );
}

/**
 * The Dinosaur pass, correction: a Dinosaur army seat lays no Ankylosaurus
 * beyond its cap (`armyDinosaurDefenderCappedV7`: a third of the army, and
 * the units it screens), nor beyond `ARMY_DINOSAUR_DEFENDER_MAXIMUM_V7`
 * while growth is on offer or its next technology is a growth technology.
 * The cap is a filter and not only a score: a city with its center held
 * can lay Eggs and train nothing, so the capped Ankylosaurus was its only
 * production and was laid all the same (the third diagnostic match: nine
 * Ankylosauruses of sixteen units). Without it the garrison steps aside
 * and the city trains a Caveman, or the Coins go to a technology.
 */
function armyDinosaurDefenderHeldV7(
  context: PolicyContextV7,
  command: { readonly role: UnitRoleIdV7 },
): boolean {
  const view = context.view;
  if (!context.army || view.viewer.faction !== "DINOSAUR") return false;
  if (
    armyShareClassV7(effectiveRoleRuleV7(command.role, "DINOSAUR")) !==
    "DEFENDER"
  )
    return false;
  const counts = armyCountsForContextV7(context);
  if (armyDinosaurDefenderCappedV7(counts)) return true;
  return (
    counts.byClass.DEFENDER >= ARMY_DINOSAUR_DEFENDER_MAXIMUM_V7 &&
    (armyGrowthOfferedV7(context) ||
      armyResearchTargetV7(context)?.growth === true)
  );
}

/**
 * The Dinosaur pass, correction: Wallbreaker (the second tile of the
 * run-up) is the army's own technology once the seat fields
 * `ARMY_WALLBREAKER_CHARGERS_V7` Triceratops: a war does not hold it and
 * the Coins are kept for it. (A seat with five Triceratops had it as its
 * target for six rounds of a war and bought units.)
 */
function armyWallbreakerDueV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): boolean {
  const view = context.view;
  if (!context.army || view.viewer.faction !== "DINOSAUR") return false;
  const target = armyResearchTargetV7(context);
  if (target === null || target.tech !== tech) return false;
  const chain = researchChain(view, "EXPLOSIVES");
  if (chain[0] !== tech) return false;
  return (
    view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        linebreakerV7(view, unit),
    ).length >= ARMY_WALLBREAKER_CHARGERS_V7
  );
}

/**
 * The Dinosaur pass, correction: while a visible hostile land unit that
 * moves two tiles or more or has Overrun is within
 * `ARMY_DINOSAUR_CENTER_FAST_RADIUS_V7` of an own center, a Dinosaur army
 * seat's unit on that center makes no Move off it but the step aside that
 * lets the city train (`armyVacatesCenterV7`: to the next tile) and no
 * attack that advances off it; and its Ankylosaurus on or beside that
 * center makes no Move to a tile that is not on or beside it.
 */
function armyDinosaurKeepsCenterV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  const view = context.view;
  if (!context.army || view.viewer.faction !== "DINOSAUR") return false;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (
    actor === undefined ||
    actor.ownerId !== view.viewer.id ||
    actor.form !== "LAND"
  )
    return false;
  const screen = armouredForPolicyV7(view, actor);
  const city = view.cities.find(
    (candidate) =>
      candidate.ownerId === view.viewer.id &&
      distance(candidate.at, actor.at) <= (screen ? 1 : 0),
  );
  if (city === undefined) return false;
  const fast = armyHostilesV7(context).some((unit) => {
    if (distance(unit.at, city.at) > ARMY_DINOSAUR_CENTER_FAST_RADIUS_V7)
      return false;
    const rule = unitRoleRuleV7(view, unit);
    return rule.move >= 2 || rule.abilities.includes("OVERRUN");
  });
  if (!fast) return false;
  const onCenter = same(actor.at, city.at);
  if (command.kind === "MOVE") {
    const to = command.path.at(-1);
    if (to === undefined) return false;
    if (onCenter) return !armyVacatesCenterV7(context, actor, to);
    return distance(to, city.at) > 1;
  }
  if (!onCenter) return false;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  return preview !== null && preview.advances;
}

/**
 * The Dinosaur pass, correction: whether an own Triceratops has the
 * support to commit against `target` (`ARMY_DINOSAUR_CHARGER_REACH_V7`).
 */
function armyChargeSupportedV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
): boolean {
  const view = context.view;
  let chargers = 0;
  let cavemen = 0;
  for (const unit of view.units) {
    if (
      unit.id === actor.id ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      unit.hp <= 0
    )
      continue;
    const gap = distance(unit.at, target.at);
    const rule = unitRoleRuleV7(view, unit);
    if (
      (rule.abilities.includes("LINEBREAKER") ||
        (rule.abilities.includes("OVERRUN") &&
          rule.abilities.includes("GROW"))) &&
      (unit.activation.attacked
        ? gap <= 2
        : gap <= ARMY_DINOSAUR_CHARGER_REACH_V7)
    )
      chargers += 1;
    else if (
      unitRoleMechanicsV7(view, unit).packHuntBonus2 > 0 &&
      gap <= ARMY_DINOSAUR_PACK_REACH_V7
    )
      cavemen += 1;
  }
  if (chargers >= 1 || cavemen >= ARMY_DINOSAUR_PACK_CAVEMEN_V7) return true;
  if (
    view.cities.some(
      (city) =>
        city.ownerId === view.viewer.id &&
        distance(city.at, target.at) <= ARMY_DINOSAUR_DEFENCE_RADIUS_V7,
    )
  )
    return true;
  return !armyHostilesV7(context).some(
    (unit) =>
      unit.id !== target.id &&
      distance(unit.at, target.at) <= ARMY_DINOSAUR_ALONE_RADIUS_V7,
  );
}

/**
 * The Dinosaur pass, correction: a Dinosaur army seat's Triceratops that
 * has not attacked makes no Move into contact with hostile land units none
 * of which it has the support to charge (`armyChargeSupportedV7`).
 */
function armyChargeHeldV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): boolean {
  const view = context.view;
  if (!context.army || view.viewer.faction !== "DINOSAUR") return false;
  const actor = context.lookup.unitsById.get(command.unitId);
  const to = command.path.at(-1);
  if (
    actor === undefined ||
    to === undefined ||
    actor.ownerId !== view.viewer.id ||
    actor.form !== "LAND" ||
    !linebreakerV7(view, actor)
  )
    return false;
  const contacts = armyHostilesV7(context).filter(
    (unit) => distance(unit.at, to) === 1,
  );
  if (contacts.length === 0) return false;
  // Already in contact where it stands: it is in the fight.
  if (armyHostilesV7(context).some((unit) => distance(unit.at, actor.at) === 1))
    return false;
  return !contacts.some((unit) => armyChargeSupportedV7(context, actor, unit));
}

/** Tuning 6: no hostile land unit is near an own center. */
function armyUnthreatenedV7(context: PolicyContextV7): boolean {
  return armyThreatDistanceV7(context) > ARMY_NEAR_THREAT_RADIUS_V7;
}

/**
 * Tuning 6: where an alert seat's training stands. With an enemy near, at a
 * single-file front, or with fewer than two thirds of the unit slots
 * filled (`warTrainingFirstV7`): before research and construction (tuning
 * 5). Otherwise the growth that adds population goes first and training
 * tops the army up after it.
 */
function armyTrainingPriorityV7(context: PolicyContextV7): number {
  return !armyUnthreatenedV7(context) ||
    // Tuning 7: also while an enemy army is in the field.
    armyWarV7(context) ||
    warTrainingFirstV7(context) ||
    context.chokepoint !== null ||
    // The first units are the ones that take the villages.
    armyExpandingV7(context) ||
    // Step two of the Undead pass: bodies first.
    armyUndeadBodiesFirstV7(context)
    ? ARMY_TRAINING_PRIORITY_V7
    : ARMY_TOPUP_TRAINING_PRIORITY_V7;
}

/**
 * Tuning 6: the seat trains like an alert one: it is alert, or it still
 * expands (fewer than `ARMY_EXPANSION_CITIES_V7` cities) and its opening
 * harvest is done.
 */
function armyTrainsFirstV7(context: PolicyContextV7): boolean {
  return (
    armyAlertV7(context) ||
    (context.army &&
      !context.naval.active &&
      !context.openingGrowthHarvest &&
      armyExpandingV7(context)) ||
    // Step two of the Undead pass: bodies first.
    armyUndeadBodiesFirstV7(context)
  );
}

/** The seat's public city income a turn. */
function armyIncomeV7(context: PolicyContextV7): number {
  return context.view.cities.reduce(
    (total, city) =>
      city.ownerId === context.view.viewer.id
        ? total + attributableCityIncome(context.view, city)
        : total,
    0,
  );
}

/**
 * Other research waits while the army's next technology is within
 * `ARMY_RESEARCH_HOLD_TURNS_V7` turns of income.
 */
function armyResearchHoldsV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): boolean {
  if (!context.army) return false;
  const target = armyResearchTargetV7(context);
  return (
    target !== null &&
    target.tech !== tech &&
    target.cost <=
      context.view.viewer.coins +
        ARMY_RESEARCH_HOLD_TURNS_V7 * armyIncomeV7(context)
  );
}

// ---------------------------------------------------------------------------
// The Undead pass, correction (`pulp_wars-w49.13`,
// docs/product/RULESET_7_TUNING_UNDEAD.md section 13).
// ---------------------------------------------------------------------------

/** An Undead seat of the army play. */
function armyUndeadSeatV7(context: PolicyContextV7): boolean {
  return context.army && context.view.viewer.faction === "UNDEAD";
}

/** A Martian seat of the army play. */
function armyMartianSeatV7(context: PolicyContextV7): boolean {
  return context.army && context.view.viewer.faction === "MARTIAN";
}

/**
 * Step two of the Martian pass (`pulp_wars-w49.25`,
 * docs/product/RULESET_7_TUNING_MARTIAN.md section 14): the seats that play
 * "bodies first" (`armyUndeadBodiesFirstV7`): an Undead seat and, since this
 * pass, a Martian one. Both have their defender two technologies away since
 * the Industry reshuffle and kept the Coins for it: a Martian seat trained
 * no unit from round 3 to round 9 of a hand-played game and of a diagnostic
 * match (three Grunts on four cities, with 31 Coins of research), and took
 * Stockpile in round 1 where the free Saucer of Scouts was offered. The
 * rules of step two of the Undead pass that are a seat's opening hold for
 * both: the units before the technology while it is short of them
 * (`armyUndeadShortOfUnitsV7`), the free unit of a city level, one growth
 * technology before the defender's two while no enemy is in sight
 * (`armyUndeadGrowthFirstV7`), the defender's technology with an enemy at
 * the gates (`armyDefenderResearchV7`), and a due technology before a
 * capture that would raise its price.
 */
function armyBodiesSeatV7(context: PolicyContextV7): boolean {
  return (
    armyUndeadSeatV7(context) ||
    armyMartianSeatV7(context) ||
    // Step two of the Dinosaur pass (`pulp_wars-w49.26`,
    // docs/product/RULESET_7_TUNING_DINOSAUR.md section 14): and a Dinosaur
    // seat. Its Ankylosaurus is two technologies away too (the root, then
    // Nesting): a seat with five cities bought Nesting, Farming, and
    // Engineering (43 Coins) in rounds 8 to 11 of a diagnostic match and
    // produced one Egg in those four rounds.
    armyDinosaurSeatV7(context) ||
    // Step two of the Ice Folk pass (`pulp_wars-w49.27`,
    // docs/product/RULESET_7_TUNING_ICE_FOLK.md): and an Ice Folk seat. Its
    // Musk Ox is two technologies away too (the root, then Deep Winter).
    armyIceFolkSeatV7(context) ||
    // Step two of the Dwarf pass (`pulp_wars-w49.28`,
    // docs/product/RULESET_7_TUNING_DWARF.md section 5): and a Dwarf seat.
    // Its Hammerers walk one tile a turn and take every village; its Steam
    // Mole is a technology away (Dig In).
    armyDwarfSeatV7(context)
  );
}

/** A Dinosaur seat of the army play. */
function armyDinosaurSeatV7(context: PolicyContextV7): boolean {
  return context.army && context.view.viewer.faction === "DINOSAUR";
}

/** An Ice Folk seat of the army play (`pulp_wars-w49.27`). */
function armyIceFolkSeatV7(context: PolicyContextV7): boolean {
  return context.army && context.view.viewer.faction === "ICE_FOLK";
}

/** A Dwarf seat of the army play (`pulp_wars-w49.28`). */
function armyDwarfSeatV7(context: PolicyContextV7): boolean {
  return context.army && context.view.viewer.faction === "DWARF";
}

// ---------------------------------------------------------------------------
// Step two of the Undead pass (`pulp_wars-w49.24`,
// docs/product/RULESET_7_TUNING_UNDEAD.md section 15). Since the Industry
// reshuffle the Zombie is two technologies away, and an Undead seat bought
// them before anything else: in two diagnostic matches it trained no unit
// from round 3 to round 9 (four cities and four units in round 9, with 39
// Coins of research), and its first Banshee came nine rounds after the
// Banshee's technology.
// ---------------------------------------------------------------------------

const ARMY_UNDEAD_CONTACT_CACHE_V7 = new WeakMap<PolicyContextV7, boolean>();

/**
 * Step two of the Undead pass: the seat has met an enemy: a hostile land
 * unit is visible within `ARMY_ALERT_RADIUS_V7` of one of its centers. (A
 * known enemy city alone is not contact: a scout finds one in round 6 that
 * sends nothing for ten rounds.)
 */
function armyUndeadContactV7(context: PolicyContextV7): boolean {
  const cached = ARMY_UNDEAD_CONTACT_CACHE_V7.get(context);
  if (cached !== undefined) return cached;
  const view = context.view;
  const hostiles = armyHostilesV7(context);
  const result =
    hostiles.length > 0 &&
    view.cities.some(
      (city) =>
        city.ownerId === view.viewer.id &&
        hostiles.some(
          (unit) => distance(unit.at, city.at) <= ARMY_ALERT_RADIUS_V7,
        ),
    );
  ARMY_UNDEAD_CONTACT_CACHE_V7.set(context, result);
  return result;
}

/**
 * Step two of the Undead pass: an Undead seat that fields fewer land units
 * than it owns cities and `ARMY_UNDEAD_SPARE_UNITS_V7` more. Such a seat
 * takes the free unit of a city level (the Ghoul of Scouts at level 2, the
 * Skeletons of Militia at level 3 of a city that is not threatened) and
 * trains before it researches (`armyUndeadBodiesFirstV7`).
 */
function armyUndeadShortOfUnitsV7(context: PolicyContextV7): boolean {
  if (
    // Step two of the Martian pass: and a Martian seat (`armyBodiesSeatV7`).
    !armyBodiesSeatV7(context) ||
    context.naval.active ||
    context.openingGrowthHarvest
  )
    return false;
  const view = context.view;
  let cities = 0;
  for (const city of view.cities)
    if (city.ownerId === view.viewer.id) cities += 1;
  // Step two of the Martian pass: a Martian seat counts the units that take
  // a village or hold a center (a Grunt, a Ray Gunner, a Projector, a Shock
  // Trooper). Its free Saucers are carriers: a seat with three Grunts and
  // four Saucers on four cities was not short of units by the plain count.
  const martian = armyMartianSeatV7(context);
  // Step two of the Dinosaur pass: a Dinosaur seat counts its Eggs as the
  // units inside (an Egg holds its unit slot from the turn it is laid, and
  // a seat that did not count them would lay until its Coins were gone),
  // and only the units that capture: a Triceratops, a Stegosaurus, and a
  // T-Rex take no village and hold no center.
  const dinosaur = armyDinosaurSeatV7(context);
  // Step two of the Ice Folk pass: an Ice Folk seat counts the units that
  // capture too: an Ice Witch, a Boulder Yeti, and a Sabretooth take no
  // village and hold no center.
  const iceFolk = armyIceFolkSeatV7(context);
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): a Dwarf seat counts the
  // units that capture too (a Gyrocopter, an Engineer, a Steam Cannon, a
  // Steam Tank, and a Whirligig take no village), and its burrowed ones (a
  // Mole and its rider underground keep their slots and surface next turn).
  const dwarf = armyDwarfSeatV7(context);
  let units = 0;
  for (const unit of dwarf
    ? [...view.units, ...view.burrowed.map((entry) => entry.unit)]
    : view.units)
    if (
      unit.ownerId === view.viewer.id &&
      (unit.form === "LAND" || (dinosaur && unit.form === "EGG")) &&
      (!(martian || dinosaur || iceFolk || dwarf) ||
        unitRoleRuleV7(view, unit).abilities.includes("CAPTURE"))
    )
      units += 1;
  return units < cities + ARMY_UNDEAD_SPARE_UNITS_V7;
}

const ARMY_UNDEAD_BODIES_CACHE_V7 = new WeakMap<PolicyContextV7, boolean>();

/**
 * Step two of the Undead pass: a seat at war whose research clock
 * (`armyResearchClockDueV7`) is a whole technology behind: the round has
 * reached the clock's rounds times the technologies owned and
 * `ARMY_UNDEAD_WAR_RESEARCH_GRACE_V7` more. Bodies first does not hold
 * then, so a seat that is short of units for a whole war still buys a
 * technology in every cycle of the clock, one cycle late, and no two in a
 * row.
 */
function armyUndeadResearchOverdueV7(context: PolicyContextV7): boolean {
  if (!armyWarV7(context)) return false;
  const target = armyResearchTargetV7(context);
  if (target === null) return false;
  const view = context.view;
  return (
    view.round >=
    armyResearchRoundsV7(context, target) *
      (armyTempoTechnologiesV7(view) + ARMY_UNDEAD_WAR_RESEARCH_GRACE_V7)
  );
}

/**
 * Step two of the Undead pass, bodies first: an Undead seat that fields
 * fewer land units than it owns cities and
 * `ARMY_UNDEAD_SPARE_UNITS_V7` more, with a city that has a free unit slot,
 * its action, and the Coins for a Skeleton. Such a seat trains before it
 * researches and keeps no Coins for a technology: the Skeletons take the
 * villages (every village is a unit slot and a Coin a turn). In a war too,
 * until its research clock is a whole technology behind
 * (`armyUndeadResearchOverdueV7`): a seat at war with fewer units than
 * that is not saved by three technologies in four rounds, and it is not
 * saved by Skeletons alone either. (In a diagnostic match against Goblins
 * a seat with five cities and six units bought Fortification, Hunting, and
 * Banshees in rounds 10 to 13 on the research clock, trained two units in
 * those four rounds, and was eliminated in round 22. With bodies first in
 * every round of a war the seat of tuning 8's recorded games bought no
 * ranged unit's technology by round 16.) With its units the research rules
 * are as they were: the growth technology and the Zombie's are bought
 * before the units, the Coins are kept, and a war has its research clock.
 */
function armyUndeadBodiesFirstV7(context: PolicyContextV7): boolean {
  const cached = ARMY_UNDEAD_BODIES_CACHE_V7.get(context);
  if (cached !== undefined) return cached;
  const view = context.view;
  const result =
    armyUndeadShortOfUnitsV7(context) &&
    view.viewer.coins >=
      (effectiveRoleRuleV7("FIGHTER", view.viewer.faction).cost ?? 0) &&
    view.cities.some(
      (city) =>
        city.ownerId === view.viewer.id &&
        city.cityActionAvailable !== false &&
        freeCapacity(view, city.id) > 0,
    ) &&
    !armyUndeadResearchOverdueV7(context);
  ARMY_UNDEAD_BODIES_CACHE_V7.set(context, result);
  return result;
}

/**
 * Step two of the Undead pass, growth first: an Undead seat that cannot
 * train the Zombie yet, has met no enemy (`armyUndeadContactV7`), and owns
 * no technology but its opener researches the one growth technology its
 * land can use (`armyEconomyFirstV7`: Hunting, Farming, or Forestry) before
 * the two technologies of the Zombie. With an enemy in sight of its cities
 * the Zombie comes first, as before.
 */
function armyUndeadGrowthFirstV7(context: PolicyContextV7): boolean {
  // Step two of the Martian pass: and a Martian seat (`armyBodiesSeatV7`):
  // the Shield Projector's two technologies wait for its growth technology
  // while no enemy is in sight of its cities.
  if (!armyBodiesSeatV7(context) || context.naval.active) return false;
  const view = context.view;
  const zombie = effectiveRoleRuleV7("GUARD", view.viewer.faction).technology;
  return (
    zombie !== null &&
    !view.viewer.researchedTechs.includes(zombie) &&
    armyTempoTechnologiesV7(view) <= ARMY_UNDEAD_GROWTH_FIRST_TECHNOLOGIES_V7 &&
    !armyUndeadContactV7(context)
  );
}

/**
 * The Martian pass (`pulp_wars-w49.14`): the seats whose opening takes the
 * villages first, buys one growth technology after the first unit of its
 * order, and garrisons a threatened center with its best unit: an Undead
 * seat and a Martian one. (A Martian seat fought at the enemy's villages
 * from round 7 with three Grunts, held three cities against five in round
 * 9, and its capital stood at level 2 for thirty rounds.)
 */
function armyOpeningSeatV7(context: PolicyContextV7): boolean {
  const faction = context.view.viewer.faction;
  // The Dinosaur pass (`pulp_wars-w49.15`): and a Dinosaur seat.
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): and an Ice Folk seat.
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): and a Dwarf seat.
  return (
    context.army &&
    (faction === "UNDEAD" ||
      faction === "MARTIAN" ||
      faction === "DINOSAUR" ||
      faction === "ICE_FOLK" ||
      faction === "DWARF")
  );
}

/**
 * The Martian pass, correction: the seats that take the villages first and
 * research one economy technology their land can use before their second
 * unit technology: the opening seats and the Human seat. (A Human seat one
 * on one stalled in four hand-played games: seven technologies in
 * twenty-five rounds; six in twenty-seven with an income of 9 Coins from
 * round 6 to round 20 and four cities at level 2; its first economy
 * technology came in round 12.)
 */
function armyEconomySeatV7(context: PolicyContextV7): boolean {
  return (
    armyOpeningSeatV7(context) ||
    (context.army && context.view.viewer.faction === "ORIGINAL")
  );
}

/**
 * The Martian pass, correction: the two seats its rules for the Coins of
 * the economy technology, growth at war, and an empty hostile center are
 * for: a Human and a Martian army seat. (An Undead and a Goblin seat keep
 * the policy their own passes were played with.)
 */
function armyCorrectionSeatV7(context: PolicyContextV7): boolean {
  const faction = context.view.viewer.faction;
  // The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur seat takes the
  // latest rules too.
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): and an Ice Folk seat.
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): and a Dwarf seat.
  return (
    context.army &&
    (faction === "ORIGINAL" ||
      faction === "MARTIAN" ||
      faction === "DINOSAUR" ||
      faction === "ICE_FOLK" ||
      faction === "DWARF")
  );
}

/**
 * The Dinosaur pass (`pulp_wars-w49.15`): a city's land production. A
 * Dinosaur city lays an Egg where another faction's trains (`LAY_EGG` is
 * offered to no other seat), and every army rule about training reads both.
 */
function armyProductionV7(
  command: CommandV7,
): command is Extract<CommandV7, { kind: "TRAIN" | "LAY_EGG" }> {
  return command.kind === "TRAIN" || command.kind === "LAY_EGG";
}

const ARMY_VILLAGES_FIRST_CACHE_V7 = new WeakMap<PolicyContextV7, boolean>();

/**
 * Villages first (`ARMY_VILLAGES_FIRST_ROUNDS_V7`): an Undead seat in its
 * first rounds that knows a free village in reach of an own center with
 * no hostile unit beside it.
 */
function armyVillagesFirstV7(context: PolicyContextV7): boolean {
  const cached = ARMY_VILLAGES_FIRST_CACHE_V7.get(context);
  if (cached !== undefined) return cached;
  const view = context.view;
  let result = false;
  if (
    armyEconomySeatV7(context) &&
    !context.naval.active &&
    view.round <= ARMY_VILLAGES_FIRST_ROUNDS_V7
  ) {
    const centers = view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .map((city) => city.at);
    const hostiles = armyHostilesV7(context);
    result = view.board.tiles.some(
      (tile) =>
        tile.explored &&
        tile.site === "VILLAGE" &&
        tile.territoryOwnerId === null &&
        centers.some(
          (center) => distance(center, tile.at) <= ARMY_VILLAGES_FIRST_REACH_V7,
        ) &&
        !hostiles.some(
          (unit) => distance(unit.at, tile.at) <= ARMY_VILLAGES_FIRST_DANGER_V7,
        ),
    );
  }
  ARMY_VILLAGES_FIRST_CACHE_V7.set(context, result);
  return result;
}

/**
 * Villages first, as a candidate filter, for the units that capture and
 * attack (a Skeleton, a Zombie, a Ghoul): no Move into a visible enemy's
 * reach outside the seat's own land (a Move onto a free village keeps its
 * own rule), and after a Move no attack on a unit outside its own land
 * that the attack does not kill. It does not walk up to a fight; a unit
 * that has not moved still strikes what stands beside it.
 */
function armyVillagesFirstHoldsV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (!armyVillagesFirstV7(context)) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  // (Land form only: a unit afloat follows the naval rules.)
  const capturer =
    actor !== undefined &&
    actor.form === "LAND" &&
    actor.ownerId === view.viewer.id &&
    unitRoleRuleV7(view, actor).abilities.includes("CAPTURE") &&
    unitRoleRuleV7(view, actor).abilities.includes("ATTACK");
  if (actor === undefined || !capturer) return false;
  if (command.kind === "ATTACK") {
    const target = context.lookup.unitsById.get(command.targetUnitId);
    if (
      target === undefined ||
      !actor.activation.moved ||
      inOwnTerritoryForPolicyV7(view, view.viewer.id, target.at)
    )
      return false;
    return (
      queryCombatPreviewV7(view, command.unitId, command.targetUnitId)
        ?.defenderDies !== true
    );
  }
  const to = command.path.at(-1);
  if (
    to === undefined ||
    inOwnTerritoryForPolicyV7(view, view.viewer.id, to) ||
    armyVillageMoveV7(context, actor, to)
  )
    return false;
  const danger = visibleImmediateDamage(view, actor, to, context);
  return (
    danger > 0 &&
    danger > visibleImmediateDamage(view, actor, actor.at, context)
  );
}

/**
 * Economy first: an Undead seat that can train the first unit of its order
 * and not yet the second, and owns no technology that builds population (a
 * Farm, a Lumber Camp, a Mine, a building), researches the growth its land
 * has the most use for before its second unit. (Its cities did not grow
 * for thirteen rounds on fertile ground and Forest while it bought Drill,
 * Hunting, and Marksmanship; Forestry in round 13 levelled two of them at
 * once.)
 */
function armyEconomyFirstV7(context: PolicyContextV7): boolean {
  if (!armyEconomySeatV7(context)) return false;
  const view = context.view;
  const faction = view.viewer.faction;
  const technologies = (ARMY_RESEARCH_ROLES_V7[faction] ?? []).flatMap(
    (role) => {
      const rule = effectiveRoleRuleV7(role, faction);
      return rule.technology === null ||
        rule.cost === null ||
        !factionUnlocksRoleV7(faction, role)
        ? []
        : [rule.technology];
    },
  );
  const [first, second] = technologies;
  if (
    first === undefined ||
    second === undefined ||
    // Step two of the Undead pass: an Undead seat that has met no enemy
    // buys its growth technology before the Zombie's two
    // (`armyUndeadGrowthFirstV7`).
    (!view.viewer.researchedTechs.includes(first) &&
      !armyUndeadGrowthFirstV7(context)) ||
    view.viewer.researchedTechs.includes(second)
  )
    return false;
  for (const kind of ARMY_GROWTH_KINDS_V7) {
    if (kind === "HARVEST_FRUIT" || kind === "HUNT_GAME") continue;
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Workshop is
    // at the root, which a seat buys on the way to its defender, and is
    // built only beside a Farm, a Lumber Camp, or a Mine: the root alone
    // builds no population.
    if (kind === "BUILD_WORKSHOP") continue;
    const technology =
      kind in BASIC_ECONOMIC_ACTIONS_V7
        ? BASIC_ECONOMIC_ACTIONS_V7[kind as BasicEconomicCommandKindV7]
            .technology
        : SPATIAL_ECONOMIC_ACTIONS_V7[kind as SpatialEconomicCommandKindV7]
            .technology;
    if (view.viewer.researchedTechs.includes(technology)) return false;
  }
  return true;
}

/**
 * Economy first, the purchase: `tech` is the growth technology of an Undead
 * seat's economy-first research (`armyEconomyFirstV7`) and no hostile land
 * unit stands at the gates of an own city (`armyAtTheGatesV7`).
 */
function armyEconomyResearchV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): boolean {
  if (!armyEconomyFirstV7(context)) return false;
  // Step two of the Undead pass: bodies first.
  if (armyUndeadBodiesFirstV7(context)) return false;
  const target = armyResearchTargetV7(context);
  if (target === null || !target.growth || target.tech !== tech) return false;
  const view = context.view;
  return !view.cities.some(
    (city) =>
      city.ownerId === view.viewer.id && armyAtTheGatesV7(context, city.id),
  );
}

/**
 * The Industry reshuffle (`pulp_wars-w49.21`, 7r56,
 * docs/product/RULESET_7_INDUSTRY_RESHUFFLE.md): `tech` is the last step to
 * the defender of a seat whose research order begins with its defender (an
 * Undead, Martian, or Dinosaur seat: the Zombie, the Shield Projector, the
 * Ankylosaurus), which is Fortification once the root is owned, and no
 * hostile land unit stands at the gates of an own city. Like the economy
 * technology of `armyEconomyFirstV7` it is bought as soon as the Coins are
 * there, before the units, and the Coins are kept for it
 * (`armyResearchFloorV7`). The defender cost one technology until 7r55 and
 * costs two now: an Undead seat that bought the root in round 3 trained
 * Skeletons with the Coins of four turns and had its first Zombie in round
 * 9.
 */
function armyDefenderResearchV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  if ((ARMY_RESEARCH_ROLES_V7[view.viewer.faction] ?? [])[0] !== "GUARD")
    return false;
  // Step two of the Undead pass: bodies first.
  if (armyUndeadBodiesFirstV7(context)) return false;
  const target = armyResearchTargetV7(context);
  if (target === null || target.unlocks !== "GUARD" || target.tech !== tech)
    return false;
  // Step two of the Undead pass (`pulp_wars-w49.24`): an Undead seat buys
  // the Zombie's technology with an enemy at its gates too. In a war on
  // seven cities some gate always has an enemy before it: a seat with the
  // root in round 8 fielded thirteen Skeletons against Goblin mobs and
  // bought Fortification in round 14. The city at whose gates the enemy
  // stands trains regardless of the Coins kept (`armyFloorHoldsTrainingV7`).
  // Step two of the Martian pass (`pulp_wars-w49.25`): a Martian seat too.
  // A Grunt trained onto a center two enemy units reach is dead in their
  // turn (8 HP and a Shield of 2: a Fighter's 5 and 5, a Skeleton's 3 and
  // 5); the Projector (12 HP, Shield 3) is what holds it.
  if (armyBodiesSeatV7(context)) return true;
  return !view.cities.some(
    (city) =>
      city.ownerId === view.viewer.id && armyAtTheGatesV7(context, city.id),
  );
}

/**
 * The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the same last step
 * for a seat that does not play the army policy (every seat of a match
 * with an Ice Folk, Dwarf, or Candy seat). `tech` is its defender's
 * technology and every technology before it is owned. Such a seat
 * researched toward its defender at 1,062 (the early role research of the
 * faction policies) or 1,060 (the next role), under its units (1,080) and
 * under every economic technology (1,160): with the defender two
 * technologies away, four seats of a 25-round diagnostic match (Ice Folk,
 * Dwarves, Candy, Martians) bought the root by round 13, then Farming,
 * Administration, and Engineering, and none bought Fortification. The
 * last step now has `DEFENDER_RESEARCH_PRIORITY_V7`, above the best
 * economic technology, and is bought when its Coins are there; the seat
 * does not save for it. The value of the unit it unlocks, or null.
 */
const DEFENDER_RESEARCH_PRIORITY_V7 = 1165;

function defenderLastStepResearchV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): number | null {
  if (context.army) return null;
  const view = context.view;
  const faction = view.viewer.faction;
  const rule = effectiveRoleRuleV7("GUARD", faction);
  if (
    rule.technology !== tech ||
    rule.cost === null ||
    !factionUnlocksRoleV7(faction, "GUARD")
  )
    return null;
  const chain = researchChain(view, tech);
  if (chain.length !== 1 || chain[0] !== tech) return null;
  return rule.maxHp + rule.attack2 + rule.defense2;
}

/** A unit that cannot attack a neighbour (a Banshee, a Lich). */
function armyHelplessRuleV7(
  rule: Pick<EffectiveRoleRuleV7, "abilities" | "minimumRange" | "attack2">,
): boolean {
  return (
    rule.minimumRange >= 2 ||
    !rule.abilities.includes("ATTACK") ||
    rule.attack2 <= 0
  );
}

/**
 * The garrison swap: on a threatened own center of an Undead seat stands a
 * unit that cannot attack a neighbour, and beside the center an own unit
 * that is the better garrison (HP times Defense) and can still move. The
 * step of the first off the center, to a tile next to it, is a Move worth
 * making: the second then steps on (`movesOntoThreatenedCity`). (A capital
 * fell with an 8-HP Banshee on its center and a Zombie beside it.)
 */
function armySwapsOutV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (command.kind !== "MOVE" || !armyOpeningSeatV7(context)) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  const to = command.path.at(-1);
  const helpless =
    actor !== undefined &&
    actor.form === "LAND" &&
    actor.ownerId === view.viewer.id &&
    armyHelplessRuleV7(unitRoleRuleV7(view, actor));
  if (actor === undefined || to === undefined || !helpless) return false;
  const city = context.lookup.citiesByKey.get(coordKey(actor.at));
  if (
    city === undefined ||
    city.ownerId !== view.viewer.id ||
    distance(to, city.at) !== 1 ||
    context.lookup.citiesByKey.has(coordKey(to)) ||
    !armyHostilesV7(context).some(
      (unit) => distance(unit.at, city.at) <= ARMY_GARRISON_RADIUS_V7,
    )
  )
    return false;
  const own = armyDefenderWorthV7(
    context,
    city.at,
    unitRoleRuleV7(view, actor),
    unitRoleMechanicsV7(view, actor),
    actor.hp,
  );
  return view.units.some(
    (unit) =>
      unit.id !== actor.id &&
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      distance(unit.at, city.at) === 1 &&
      !same(unit.at, to) &&
      !armyHelplessRuleV7(unitRoleRuleV7(view, unit)) &&
      context.commands.some(
        (other) => other.kind === "MOVE" && other.unitId === unit.id,
      ) &&
      armyDefenderWorthV7(
        context,
        city.at,
        unitRoleRuleV7(view, unit),
        unitRoleMechanicsV7(view, unit),
        unit.hp,
      ) > own,
  );
}

/**
 * The Human seat against Zombies: no attack from the next tile on a
 * full-HP unit that bites while an own unit can still attack the same
 * target this turn from two or more tiles: the shots first. (A Human seat
 * trained fourteen Knights and fed ten of them to full Zombies: bitten,
 * then killed, they rose.) Any army seat but an Undead one.
 */
function armyShootsBiterFirstV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (
    command.kind !== "ATTACK" ||
    !context.army ||
    !context.undead ||
    context.view.viewer.faction === "UNDEAD"
  )
    return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  const target = context.lookup.unitsById.get(command.targetUnitId);
  const besideFullBiter =
    actor !== undefined &&
    target !== undefined &&
    actor.form === "LAND" &&
    distance(actor.at, target.at) === 1 &&
    target.hp >= target.maxHp &&
    unitRoleRuleV7(view, target).abilities.includes("BITE");
  if (actor === undefined || target === undefined || !besideFullBiter)
    return false;
  return context.commands.some((other) => {
    if (
      other.kind !== "ATTACK" ||
      other.targetUnitId !== target.id ||
      other.unitId === actor.id
    )
      return false;
    const shooter = context.lookup.unitsById.get(other.unitId);
    return shooter !== undefined && distance(shooter.at, target.at) >= 2;
  });
}

/**
 * The cure is due: the seat has a Bitten unit, its own Captain-role unit
 * tends (the Human Captain), and it has no unit that tends on the board.
 * Then the Captain's technology is its next research and the Captain its
 * next unit. (Two Human seats with Bitten units on the board fielded no
 * Captain in two games.)
 */
function armyCureDueV7(context: PolicyContextV7): boolean {
  if (!context.army || !context.undead) return false;
  const view = context.view;
  const faction = view.viewer.faction;
  if (
    !effectiveRoleRuleV7("CAPTAIN", faction).abilities.includes("TEND_WOUNDED")
  )
    return false;
  const own = new Set<UnitId>();
  for (const unit of view.units)
    if (unit.ownerId === view.viewer.id) {
      if (unitRoleRuleV7(view, unit).abilities.includes("TEND_WOUNDED"))
        return false;
      own.add(unit.id);
    }
  return view.bitten.some((entry) => own.has(entry.unitId));
}

/**
 * The cure, the purchase: `tech` is the first step to the Captain's
 * technology of a seat whose cure is due (`armyCureDueV7`). It is bought as
 * soon as the Coins are there, before the units, also in a war (a Human
 * seat with seven Bitten Knights spent every Coin on more Knights for
 * fourteen rounds and owned no Captain).
 */
function armyCureResearchV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): boolean {
  if (!armyCureDueV7(context)) return false;
  const cure = effectiveRoleRuleV7("CAPTAIN", context.view.viewer.faction);
  return (
    cure.technology !== null &&
    !context.view.viewer.researchedTechs.includes(cure.technology) &&
    researchChain(context.view, cure.technology)[0] === tech
  );
}

/** Hostile fast melee units in sight that make the Orc Brute wanted. */
const ARMY_BLOCKER_FAST_HOSTILES_V7 = 2;

/**
 * Step two of the Goblin pass (`pulp_wars-w49.23`): the blocker. A Goblin
 * seat that cannot train its Orc Brute and can train the first unit of its
 * order (the Bomb Chucker) researches the Orc Brute's technology (the root,
 * then Fortification) next:
 *
 * - `URGENT` with a hostile land unit with Overrun in sight (a Knight, a
 *   Scrap Buggy): like the cure, the technology is bought as soon as the
 *   Coins are there, before the units, also in a war, and the Coins are
 *   kept for it (`armyBlockerResearchV7`);
 * - `WANTED` with two hostile melee units in sight that move two tiles or
 *   more (Raiders, Wolf Riders, Raptors): it is the next technology, on the
 *   seat's ordinary research tempo.
 *
 * The Orc Brute is third in the order, behind the Wolf Rider. A Knight
 * kills every other Goblin unit but the Ogre in one attack and rides on,
 * and a charging Raider every Bomb Chucker and Wolf Rider. In a hand-played
 * game no Orc Brute stood in a Goblin army by round 17 and three Knights
 * made nine kills in four rounds.
 */
function armyBlockerV7(context: PolicyContextV7): "NO" | "WANTED" | "URGENT" {
  if (!goblinMobSeatV7(context)) return "NO";
  const view = context.view;
  const faction = view.viewer.faction;
  const owned = view.viewer.researchedTechs;
  const guard = effectiveRoleRuleV7("GUARD", faction);
  if (
    guard.technology === null ||
    guard.cost === null ||
    !factionUnlocksRoleV7(faction, "GUARD") ||
    owned.includes(guard.technology)
  )
    return "NO";
  const first = (ARMY_RESEARCH_ROLES_V7[faction] ?? [])[0];
  const firstTechnology =
    first === undefined ? null : effectiveRoleRuleV7(first, faction).technology;
  if (firstTechnology !== null && !owned.includes(firstTechnology)) return "NO";
  let fast = 0;
  for (const unit of armyHostilesV7(context)) {
    if (unitRoleRuleV7(view, unit).abilities.includes("OVERRUN"))
      return "URGENT";
    const facts = publicCombatFacts(view, unit, context.lookup);
    if (
      facts.move >= 2 &&
      facts.maximumRange <= 1 &&
      facts.abilities.includes("ATTACK") &&
      facts.attack2 > 0
    )
      fast += 1;
  }
  return fast >= ARMY_BLOCKER_FAST_HOSTILES_V7 ? "WANTED" : "NO";
}

/**
 * The blocker, the purchase: `tech` is the first step to the Orc Brute's
 * technology of a seat whose blocker is urgent (`armyBlockerV7`).
 */
function armyBlockerResearchV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): boolean {
  if (armyBlockerV7(context) !== "URGENT") return false;
  const guard = effectiveRoleRuleV7("GUARD", context.view.viewer.faction);
  return (
    guard.technology !== null &&
    researchChain(context.view, guard.technology)[0] === tech
  );
}

/**
 * A step off an own center so that its city can train: the city has a free
 * slot and its action, the seat has the Coins for its basic unit, and the
 * step ends next to the center (never on another center). A hostile unit
 * near the center does not forbid it: the city trains in the same turn, so
 * the center is never left empty and the city has two defenders, where a
 * garrison that stays put can never be reinforced.
 */
function armyVacatesCenterV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (actor.form !== "LAND") return false;
  // Tuning 7 (`pulp_wars-w49.10`): also a seat with a naval plan, when no
  // city of it can train: two Undead seats of an Archipelago sat on their
  // centers with two land units each for a hundred rounds, at 700 Coins.
  if (
    !armyTrainsFirstV7(context) &&
    !(
      context.army &&
      context.naval.active &&
      !context.commands.some((command) => command.kind === "TRAIN")
    )
  )
    return false;
  const view = context.view;
  const city = context.lookup.citiesByKey.get(coordKey(actor.at));
  // The Dinosaur pass (`pulp_wars-w49.15`): a city that lays an Egg this
  // turn produces with its center held, so its garrison stays. (A city
  // whose Eggs the policy refuses, because the visible enemies would smash
  // them, lays none: its garrison steps aside like any army seat's and the
  // city trains a Caveman. In the first diagnostic lab match a front city
  // with four free slots produced nothing for ten rounds.)
  if (
    city !== undefined &&
    city.ownerId === view.viewer.id &&
    view.viewer.faction === "DINOSAUR" &&
    preferredSharedCityActionV7(context, city.id)?.kind === "LAY_EGG"
  )
    return false;
  return (
    city !== undefined &&
    city.ownerId === view.viewer.id &&
    distance(to, city.at) === 1 &&
    city.cityActionAvailable !== false &&
    freeCapacity(view, city.id) > 0 &&
    view.viewer.coins >=
      (effectiveRoleRuleV7("FIGHTER", view.viewer.faction).cost ?? 0) &&
    !context.lookup.citiesByKey.has(coordKey(to)) &&
    // Tuning 8 (`pulp_wars-w49.11`): on a threatened center the best
    // defender stays: the unit steps aside only when the seat can train a
    // garrison at least as good now (a Zombie left its walled last center
    // for a fresh Skeleton, the weaker garrison). Otherwise the city
    // trains nothing this turn.
    (!threatenedCity(context, city.id) ||
      armyGarrisonYieldsV7(context, city.at, actor))
  );
}

/** Tuning 8: see `armyVacatesCenterV7`. */
function armyGarrisonYieldsV7(
  context: PolicyContextV7,
  center: CoordV7,
  actor: PublicUnitV7,
): boolean {
  const view = context.view;
  const best = armyBestDefenderWorthV7(context, center);
  const own = armyDefenderWorthV7(
    context,
    center,
    unitRoleRuleV7(view, actor),
    unitRoleMechanicsV7(view, actor),
    actor.hp,
  );
  return best >= own;
}

/**
 * Tuning 8: what a unit is worth as the garrison of `center`: its HP times
 * its Defense, the Defense against attacks from two or more tiles when a
 * visible hostile ranged or siege unit reaches the center (the Human Guard
 * is open to them).
 */
function armyDefenderWorthV7(
  context: PolicyContextV7,
  center: CoordV7,
  rule: Pick<EffectiveRoleRuleV7, "defense2" | "minimumRange">,
  mechanics: Pick<RoleMechanicsV7, "rangedDefense2">,
  hp: number,
): number {
  // The Undead pass, correction: a Defense that is higher only against
  // shots (a Skeleton's Bones) counts as the unit's own: a center is
  // taken hand to hand, and the Zombie beside the Skeleton is the garrison.
  const hand = roleDefense2AtDistanceV7(rule, mechanics, 1);
  const worth =
    hp *
    ((armyRangedReachV7(context).get(coordKey(center)) ?? 0) > 0
      ? Math.min(hand, roleDefense2AtDistanceV7(rule, mechanics, 2))
      : hand);
  // Correction pass: a unit that cannot attack a neighbour (the Bomb
  // Chucker) neither strikes what walks up to the center nor hits back:
  // three of them died as garrisons without a throw.
  return rule.minimumRange >= 2
    ? Math.floor(worth / ARMY_HELPLESS_GARRISON_DIVISOR_V7)
    : worth;
}

/**
 * Correction pass: a center is contested when a hostile land unit that
 * fights hand to hand stands within `ARMY_CONTESTED_RADIUS_V7` tiles of it.
 */
function armyContestedCenterV7(
  context: PolicyContextV7,
  center: CoordV7,
): boolean {
  const view = context.view;
  return armyHostilesV7(context).some(
    (unit) =>
      distance(unit.at, center) <= ARMY_CONTESTED_RADIUS_V7 &&
      publicCombatFacts(view, unit, context.lookup).minimumRange <= 1 &&
      publicCombatFacts(view, unit, context.lookup).attack2 > 0,
  );
}

/**
 * Correction pass: training `role` in `cityId` would put a unit that
 * cannot attack a neighbour on a contested center while the seat can pay
 * for one that can.
 */
function armyHelplessGarrisonV7(
  context: PolicyContextV7,
  cityId: CityId,
  role: UnitRoleIdV7,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  const faction = view.viewer.faction;
  // The Undead pass, correction: for an Undead seat also a unit with no
  // attack of its own (the Banshee).
  const city = context.lookup.citiesById.get(cityId);
  // The Martian pass, correction: a Martian seat's garrison of a contested
  // center is a Shield Projector: until one stands on or beside the
  // center nothing else is trained there while a Projector can be, and
  // with one there no Ray Gunner, Brain, or Tripod while a Grunt can be.
  // (A Ray Gunner was trained onto a walled center beside open ground two
  // rounds running and died there to a Knight without firing.)
  const projectorNear =
    faction === "MARTIAN" &&
    city !== undefined &&
    view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        distance(unit.at, city.at) <= 1 &&
        unitRoleRuleV7(view, unit).abilities.includes("FORCE_FIELD"),
    );
  const helpless = (rule: EffectiveRoleRuleV7): boolean =>
    faction === "UNDEAD"
      ? armyHelplessRuleV7(rule)
      : faction === "MARTIAN"
        ? projectorNear
          ? armyClassV7(rule) !== "LINE" && armyClassV7(rule) !== "DEFENDER"
          : !rule.abilities.includes("FORCE_FIELD")
        : rule.minimumRange >= 2;
  if (!helpless(effectiveRoleRuleV7(role, faction))) return false;
  if (city === undefined || !armyContestedCenterV7(context, city.at))
    return false;
  return context.commands.some(
    (command) =>
      command.kind === "TRAIN" &&
      command.cityId === cityId &&
      !helpless(effectiveRoleRuleV7(command.role, faction)) &&
      armyClassV7(effectiveRoleRuleV7(command.role, faction)) !== null,
  );
}

/**
 * Correction pass: what a Move of a bomber that cannot attack a neighbour
 * costs for where it ends: beside a hostile unit that fights hand to hand
 * (it cannot throw at it and dies to it), and beside another such bomber
 * (their death blasts chain: three died in one turn).
 */
function armyBomberCrowdV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  if (!context.army || !context.goblin) return 0;
  const view = context.view;
  if (
    !friendlyFireBomberV7(view, actor) ||
    publicCombatFacts(view, actor, context.lookup).minimumRange < 2
  )
    return 0;
  let cost = 0;
  for (const unit of view.units) {
    if (unit.id === actor.id || distance(unit.at, to) !== 1) continue;
    if (unit.form === "LAND" && isHostile(view, unit.ownerId)) {
      const facts = publicCombatFacts(view, unit, context.lookup);
      if (facts.minimumRange <= 1 && facts.attack2 > 0)
        cost += ARMY_BOMBER_MELEE_COST_V7;
    } else if (
      unit.form === "LAND" &&
      unit.ownerId === view.viewer.id &&
      friendlyFireBomberV7(view, unit)
    )
      cost += ARMY_BOMBER_NEIGHBOUR_COST_V7;
  }
  return cost;
}

/**
 * Tuning 8: the garrison worth of the best own land unit next to `center`
 * (0 with none): what a unit trained onto the center should beat.
 */
function armyBesideCenterWorthV7(
  context: PolicyContextV7,
  center: CoordV7,
): number {
  const view = context.view;
  let best = 0;
  for (const unit of view.units)
    if (
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      distance(unit.at, center) === 1
    )
      best = Math.max(
        best,
        armyDefenderWorthV7(
          context,
          center,
          unitRoleRuleV7(view, unit),
          unitRoleMechanicsV7(view, unit),
          unit.hp,
        ),
      );
  return best;
}

/** Tuning 8: the best garrison the seat can train now for its Coins. */
function armyBestDefenderWorthV7(
  context: PolicyContextV7,
  center: CoordV7,
): number {
  const view = context.view;
  const faction = view.viewer.faction;
  let best = 0;
  for (const role of UNIT_ROLE_IDS_V7) {
    const rule = effectiveRoleRuleV7(role, faction);
    if (
      rule.cost === null ||
      rule.cost > view.viewer.coins ||
      armyClassV7(rule) === null ||
      !factionUnlocksRoleV7(faction, role) ||
      (rule.technology !== null &&
        !view.viewer.researchedTechs.includes(rule.technology))
    )
      continue;
    best = Math.max(
      best,
      armyDefenderWorthV7(
        context,
        center,
        rule,
        roleMechanicsV7(role, faction),
        rule.maxHp,
      ),
    );
  }
  return best;
}

/** The Move of `armyVacatesCenterV7`, as a command. */
function armyStepsAsideToTrainV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (command.kind !== "MOVE") return false;
  const actor = context.lookup.unitsById.get(command.unitId);
  const to = command.path.at(-1);
  return (
    actor !== undefined &&
    to !== undefined &&
    armyVacatesCenterV7(context, actor, to)
  );
}

/**
 * The garrison: the unit on an own center stays while a hostile land unit
 * is visible within `ARMY_GARRISON_RADIUS_V7`. It does not move (except the
 * step that lets the city train a second defender) and makes no attack that
 * kills it or takes it off the center while another such unit is near.
 */
function armyGarrisonHoldsV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (
    actor === undefined ||
    actor.form !== "LAND" ||
    actor.ownerId !== view.viewer.id
  )
    return false;
  const city = context.lookup.citiesByKey.get(coordKey(actor.at));
  if (city === undefined || city.ownerId !== view.viewer.id) return false;
  const near = armyHostilesV7(context).filter(
    (unit) => distance(unit.at, city.at) <= ARMY_GARRISON_RADIUS_V7,
  );
  if (near.length === 0) return false;
  // The tactical plan lets a threatened city's defender act when another
  // own unit can take its place this turn; so does the garrison rule.
  // Step two of the Undead pass (`pulp_wars-w49.24`): not for a Move of
  // the best garrison in reach (`armyBestGarrisonStaysV7`).
  if (
    context.tactical.defenderReplacementActionKeys.has(
      policyCommandKeyV7(command),
    ) &&
    !(
      command.kind === "MOVE" &&
      armyBestGarrisonStaysV7(context, city.at, actor)
    )
  )
    return false;
  if (command.kind === "MOVE") {
    const to = command.path.at(-1);
    return to === undefined || !armyVacatesCenterV7(context, actor, to);
  }
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  if (preview === null) return false;
  if (preview.attackerDies) return true;
  // Tuning 6 (`pulp_wars-w49.6`): a hit that does not kill waits while the
  // unit can still step aside for its city to train (an attack ends its
  // turn on the center, and the city then trains nothing).
  // Correction pass (`pulp_wars-w49.11`): not a hit that is clearly in its
  // favor (10 a point dealt, 8 a point taken): an Undead seat's walled
  // Zombie stood beside the player's Knight for a turn without the hit
  // that deals 6 for 2 and bites, and stepped aside for another Zombie.
  if (
    !preview.defenderDies &&
    !actor.activation.moved &&
    10 * preview.damageToDefender - 8 * preview.damageToAttacker <
      ARMY_GARRISON_HIT_VALUE_V7 &&
    (context.lookup.moveDestinationsByUnit.get(actor.id) ?? []).some((to) =>
      armyVacatesCenterV7(context, actor, to),
    )
  )
    return true;
  return (
    preview.advances && near.some((unit) => unit.id !== command.targetUnitId)
  );
}

/**
 * Step two of the Undead pass (`pulp_wars-w49.24`,
 * docs/product/RULESET_7_TUNING_UNDEAD.md section 15), for every army seat:
 * the unit on a threatened own center with a Field Defense is a better
 * garrison (HP times Defense, `armyDefenderWorthV7`) than every own land
 * unit beside the center. It then makes no Move off the center for another
 * unit to take its place; the step aside that lets the city train a
 * garrison at least as good (`armyVacatesCenterV7`) is still made. (An
 * Undead seat built a Field Defense under a Zombie on a village center and
 * walked the Zombie off it in the same turn, and a Skeleton stepped on; a
 * Human seat did the same twice in one game.)
 */
function armyBestGarrisonStaysV7(
  context: PolicyContextV7,
  center: CoordV7,
  actor: PublicUnitV7,
): boolean {
  const view = context.view;
  const tile = findPublicTileV7(view, center);
  return (
    tile?.explored === true &&
    tile.fieldDefense &&
    armyDefenderWorthV7(
      context,
      center,
      unitRoleRuleV7(view, actor),
      unitRoleMechanicsV7(view, actor),
      actor.hp,
    ) > armyBesideCenterWorthV7(context, center)
  );
}

/**
 * Step two of the Undead pass: an Undead army seat that can train a
 * Necromancer and fields none trains one in a city with
 * `ARMY_NECROMANCER_GRAVES_V7` free Graves (no unit on them) within
 * `ARMY_NECROMANCER_GRAVE_REACH_V7` tiles of its center: a Raise Dead of
 * three is 6 Coins of Skeletons for 5, with no unit slot. Not in a city
 * with an enemy at its gates. (A seat with Leadership from round 21 of a
 * diagnostic match trained none in a land with nine Graves: every city of
 * it was threatened, and a support unit loses 200 there.)
 */
function armyNecromancerDueV7(
  context: PolicyContextV7,
  cityId: CityId,
): boolean {
  if (!armyUndeadSeatV7(context)) return false;
  const view = context.view;
  const city = context.lookup.citiesById.get(cityId);
  if (city === undefined || armyAtTheGatesV7(context, cityId)) return false;
  if (
    view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        unitRoleRuleV7(view, unit).abilities.includes("RAISE_DEAD"),
    )
  )
    return false;
  let free = 0;
  for (const grave of view.graves)
    if (
      distance(grave, city.at) <= ARMY_NECROMANCER_GRAVE_REACH_V7 &&
      !(context.threatLookup.occupantsByKey.get(coordKey(grave)) ?? []).some(
        (unit) => same(unit.at, grave),
      )
    )
      free += 1;
  return free >= ARMY_NECROMANCER_GRAVES_V7;
}

/** What a unit's attack from a destination is worth (army play). */
interface ArmyEngagementV7 {
  readonly targetId: UnitId;
  /** 10 per HP dealt, 8 per HP taken, and a kill's value. */
  readonly value: number;
  readonly kills: boolean;
  /** Tuning 6: a ranged, siege, or support target of a fast or ranged unit. */
  readonly fragile: boolean;
  /** Tuning 6: the distance the attack is made from. */
  readonly range: number;
}

/** A ranged, siege, or support unit: what a breakthrough is for. */
function armyFragileV7(context: PolicyContextV7, unit: PublicUnitV7): boolean {
  const unitClass = armyClassV7(unitRoleRuleV7(context.view, unit));
  return (
    unitClass === "RANGED" || unitClass === "SIEGE" || unitClass === "SUPPORT"
  );
}

/**
 * A fast unit (Move 2 or more) or a ranged unit: it goes for the enemy's
 * ranged, siege, and support units first.
 */
function armyHuntsFragileV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
): boolean {
  if (!context.army) return false;
  const rule = unitRoleRuleV7(context.view, unit);
  return (
    armyClassV7(rule) === "RANGED" ||
    // Tuning 8: so does a siege unit (the defender's Catapults made most
    // of its kills and were never shot at).
    armyClassV7(rule) === "SIEGE" ||
    publicCombatFacts(context.view, unit, context.lookup).move >= 2
  );
}

/**
 * The retaliation a unit attacking from `attacker.at` at `range` would take
 * from `target`: the engine's formula on the target's base Defense and
 * present HP, none outside the target's own range.
 */
function armyRetaliationV7(
  context: PolicyContextV7,
  attacker: PublicUnitV7,
  target: PublicUnitV7,
  range: number,
): number {
  const view = context.view;
  const targetFacts = publicCombatFacts(view, target, context.lookup);
  if (
    range < targetFacts.minimumRange ||
    range > targetFacts.maximumRange ||
    targetFacts.attack2 <= 0
  )
    return 0;
  const facts = publicCombatFacts(view, attacker, context.lookup);
  if (!Number.isInteger(facts.attack2)) return 0;
  // The engine's retaliation formula (current rules section 13.2) on the
  // target's base Defense: force = Defense x HP / maximum HP on both sides.
  const defense2 = unitRoleRuleV7(view, target).defense2;
  const attackOnCommon =
    BigInt(facts.attack2) * BigInt(attacker.hp) * 2n * BigInt(target.maxHp);
  const defenseOnCommon =
    BigInt(defense2) * BigInt(target.hp) * 2n * BigInt(attacker.maxHp);
  const total = attackOnCommon + defenseOnCommon;
  if (total <= 0n) return 0;
  const numerator = defenseOnCommon * BigInt(defense2) * 9n;
  const denominator = total * 4n;
  return Math.min(
    attacker.hp,
    Number((2n * numerator + denominator) / (2n * denominator)),
  );
}

const NO_ARMY_ENGAGEMENTS_V7: ReadonlyMap<string, ArmyEngagementV7> = new Map();

/**
 * The Goblin pass, correction (`pulp_wars-w49.12`): whether a bomb of
 * `dealt` on `target` is worth its splash on the own and allied units
 * beside the target, by the measure of the attack's own harm test
 * (`goblinFriendlyFireRejectedV7`): it kills none of them, and the hit and
 * the splash on hostile units are worth at least twice the splash on them.
 * A Blast-proof unit is in no splash.
 */
function armyBombSplashAcceptedV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  dealt: number,
): boolean {
  const view = context.view;
  const splash = Math.max(1, Math.ceil(Math.min(dealt, target.hp) / 2));
  let friendly = 0;
  let hostile = hostileLossValueV7(context, target, dealt, dealt >= target.hp);
  for (const unit of view.units) {
    if (
      unit.id === actor.id ||
      unit.id === target.id ||
      distance(unit.at, target.at) !== 1 ||
      unitIsBlastProofV7(view, unit)
    )
      continue;
    const hit = Math.min(splash, unit.hp);
    if (friendlyOwnerV7(view, unit.ownerId)) {
      if (hit >= unit.hp) return false;
      friendly += friendlyLossValueV7(view, unit, hit, false);
    } else if (isHostile(view, unit.ownerId))
      hostile += hostileLossValueV7(context, unit, hit, hit >= unit.hp);
  }
  return hostile >= FRIENDLY_FIRE_TRADE_FACTOR_V7 * friendly;
}

/**
 * For each offered destination of a fresh own land unit, its best attack
 * from there on a visible hostile land unit, when that attack is an
 * acceptable exchange: a kill, or more dealt than taken by the measure of
 * the attack filter (10 per HP dealt against 8 per HP taken) without dying.
 */
function armyEngagementsForV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): ReadonlyMap<string, ArmyEngagementV7> {
  const cached = context.armyEngagements.get(actor.id);
  if (cached !== undefined) return cached;
  const view = context.view;
  let result = NO_ARMY_ENGAGEMENTS_V7;
  const hostiles = armyHostilesV7(context);
  if (
    hostiles.length > 0 &&
    actor.ownerId === view.viewer.id &&
    actor.form === "LAND" &&
    !actor.activation.moved &&
    primaryReadyForPolicyV7(actor)
  ) {
    const facts = publicCombatFacts(view, actor, context.lookup);
    if (facts.abilities.includes("ATTACK") && facts.attack2 > 0) {
      // Tuning 6: a committed unit takes an exchange that does not kill
      // it where the commitment accepts it (`armyCommitAcceptsV7`), and
      // a fast or ranged unit prefers the enemy's shooters.
      const committed = armyModeV7(context, actor) === "COMMIT";
      const hunter = armyHuntsFragileV7(context, actor);
      const bomber = context.goblin && friendlyFireBomberV7(view, actor);
      // The Martian pass (`pulp_wars-w49.14`): a Saucer finishes units, it
      // does not trade (`martianAttackRejectedV7`): only its kill is a
      // reason to fly in.
      const finisher = context.martian && isSaucerForPolicyV7(view, actor);
      const found = new Map<string, ArmyEngagementV7>();
      for (const to of context.lookup.moveDestinationsByUnit.get(actor.id) ??
        []) {
        const moved = { ...actor, at: to };
        let best: ArmyEngagementV7 | null = null;
        for (const target of hostiles) {
          const range = distance(to, target.at);
          if (range < facts.minimumRange || range > facts.maximumRange)
            continue;
          const dealt = publicProjectedDamageWithLookupV7(
            view,
            moved,
            target,
            target.at,
            {},
            context.lookup,
          );
          if (dealt <= 0) continue;
          const kills = dealt >= target.hp;
          if (finisher && !kills) continue;
          // Tuning 7: a bomb that would splash own units is no reason to
          // move (the Bomb Chucker walked up and then did not throw). The
          // Goblin pass, correction: unless the throw itself would be
          // accepted (`armyBombSplashAcceptedV7`): eight Bomb Chuckers
          // threw seven bombs in thirty rounds, because an own Goblin stood
          // beside every target by the time they came up.
          if (
            bomber &&
            !armyBombSplashAcceptedV7(context, actor, target, dealt)
          )
            continue;
          const taken = kills
            ? 0
            : armyRetaliationV7(context, moved, target, range);
          if (
            !kills &&
            (taken >= actor.hp ||
              (10 * dealt - 8 * taken <= 0 &&
                !(committed && armyCommitAcceptsV7(context, actor, target))))
          )
            continue;
          const fragile = hunter && armyFragileV7(context, target);
          const value =
            10 * dealt -
            8 * taken +
            (kills
              ? 20 + targetStrategicValue(view, target.id, context.lookup)
              : 0) +
            (fragile ? ARMY_FRAGILE_TARGET_VALUE_V7 : 0) +
            (fragile && armyClassV7(unitRoleRuleV7(view, target)) === "SIEGE"
              ? ARMY_SIEGE_TARGET_VALUE_V7
              : 0) +
            (committed && armyFocusV7(context).has(target.id)
              ? ARMY_FOCUS_TARGET_VALUE_V7
              : 0);
          if (
            best === null ||
            value > best.value ||
            (value === best.value && target.id < best.targetId)
          )
            best = { targetId: target.id, value, kills, fragile, range };
        }
        if (best !== null) found.set(coordKey(to), best);
      }
      result = found;
    }
  }
  context.armyEngagements.set(actor.id, result);
  return result;
}

/**
 * Whether a unit that ends on `to` has company: at least as many own
 * attack-capable land units within `ARMY_SUPPORT_RADIUS_V7` of it, itself
 * included, as visible hostile ones within `ARMY_PRESSURE_RADIUS_V7`.
 */
function armySupportedV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  const fights = (unit: PublicUnitV7): boolean => {
    const facts = publicCombatFacts(view, unit, context.lookup);
    return facts.abilities.includes("ATTACK") && facts.attack2 > 0;
  };
  let pressure = 0;
  for (const unit of armyHostilesV7(context))
    if (distance(unit.at, to) <= ARMY_PRESSURE_RADIUS_V7 && fights(unit))
      pressure += 1;
  if (pressure <= 1) return true;
  let support = 1;
  for (const unit of view.units)
    if (
      unit.id !== actor.id &&
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      distance(unit.at, to) <= ARMY_SUPPORT_RADIUS_V7 &&
      fights(unit)
    )
      support += 1;
  return support >= pressure;
}

/**
 * Step two of the Goblin pass (`pulp_wars-w49.23`): a Goblin seat's unit
 * whose attack takes Gang Up does not make a routine Move alone to a tile
 * where the visible enemies kill it. `armySupportedV7` counts a unit against
 * one enemy as supported, which is right for a Fighter and wrong for a 6-HP
 * Goblin that one attack kills: in a hand-played game single Goblins walked
 * up to two Fighters in four turns, attacked for 3, and died.
 *
 * Next to an enemy unit the company is `goblinContactCompanyV7`. Elsewhere
 * it is another own fighting land unit on a tile beside `to`, or one within
 * `ARMY_SUPPORT_RADIUS_V7` of it that has not moved, may attack after a
 * Move, and does not hold a center (it can still come along).
 */
function armyGoblinAloneV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  danger: number,
): boolean {
  if (!goblinMobSeatV7(context) || danger < actor.hp) return false;
  const view = context.view;
  if (!gangUpAttackerV7(view, actor)) return false;
  // (Onto an own center it is the garrison.)
  if (context.lookup.citiesByKey.get(coordKey(to))?.ownerId === view.viewer.id)
    return false;
  if (armyHostilesV7(context).some((unit) => distance(unit.at, to) === 1))
    return !goblinContactCompanyV7(context, actor, to);
  return !view.units.some((unit) => {
    if (
      unit.id === actor.id ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND"
    )
      return false;
    const gap = distance(unit.at, to);
    if (gap > ARMY_SUPPORT_RADIUS_V7) return false;
    const facts = publicCombatFacts(view, unit, context.lookup);
    // (A unit that fights hand to hand: a Bomb Chucker two tiles behind
    // is no company for the Goblin in front of it.)
    if (
      !facts.abilities.includes("ATTACK") ||
      facts.attack2 <= 0 ||
      facts.minimumRange > 1
    )
      return false;
    return (
      gap <= 1 ||
      (!unit.activation.moved &&
        unitMayActAfterMoveV7(view, unit) &&
        !context.lookup.citiesByKey.has(coordKey(unit.at)))
    );
  });
}

/**
 * Step two of the Goblin pass: whether a unit that ends its Move on `to`,
 * next to an enemy unit, has company there. For one of the enemy units it
 * would touch: another own unit already stands beside it (the attack has
 * Gang Up); or another own unit has that enemy in its range now; or
 * another own unit that has not moved, may attack after a Move, and does
 * not hold a center can still be offered a tile from which it has (a tile
 * beside the enemy for a unit that fights hand to hand, a tile at two for
 * a Bomb Chucker). The tile the mover leaves counts as such a tile: the
 * Goblins of a column stand on the firing tiles of the Bomb Chuckers
 * behind them.
 */
function goblinContactCompanyV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  for (const hostile of armyHostilesV7(context)) {
    if (distance(hostile.at, to) !== 1) continue;
    for (const unit of view.units) {
      if (
        unit.id === actor.id ||
        unit.ownerId !== view.viewer.id ||
        unit.form !== "LAND"
      )
        continue;
      const gap = distance(unit.at, hostile.at);
      if (gap === 1) return true;
      const facts = publicCombatFacts(view, unit, context.lookup);
      if (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0) continue;
      const reaches = (range: number): boolean =>
        range >= facts.minimumRange && range <= facts.maximumRange;
      if (reaches(gap) && primaryReadyForPolicyV7(unit)) return true;
      if (
        unit.activation.moved ||
        !unitMayActAfterMoveV7(view, unit) ||
        !primaryReadyForPolicyV7(unit) ||
        context.lookup.citiesByKey.has(coordKey(unit.at))
      )
        continue;
      if (
        distance(unit.at, actor.at) <= facts.move &&
        reaches(distance(actor.at, hostile.at))
      )
        return true;
      for (const at of context.lookup.moveDestinationsByUnit.get(unit.id) ?? [])
        if (!same(at, to) && reaches(distance(at, hostile.at))) return true;
    }
  }
  return false;
}

/**
 * Step two of the Goblin pass: a Goblin goes into contact with company. A
 * Move of a Goblin seat's melee unit whose attack takes Gang Up, that may
 * attack after it, and that has no Overrun (a Goblin, a Wolf Rider, an
 * Ogre) is not made when it ends next to an enemy unit from a tile next to
 * none, the visible enemies kill the unit there, and it has no company
 * (`goblinContactCompanyV7`). Whatever offers the Move: a committed position
 * sent its units into contact one a turn where only one tile was in reach,
 * and each struck alone for 3 and died. Exempt: a hunter's Move of a
 * combined kill, a Move after which the unit's own attack kills, a Move to a
 * Kaboom worth making (`kaboomSetupValueV7`), and a
 * Move onto a center or a village.
 */
function armyGoblinContactHeldV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): boolean {
  if (!goblinMobSeatV7(context)) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  const to = command.path.at(-1);
  if (
    actor === undefined ||
    to === undefined ||
    actor.ownerId !== view.viewer.id ||
    actor.form !== "LAND" ||
    !gangUpAttackerV7(view, actor) ||
    !unitMayActAfterMoveV7(view, actor)
  )
    return false;
  const facts = publicCombatFacts(view, actor, context.lookup);
  if (facts.maximumRange > 1 || facts.abilities.includes("OVERRUN"))
    return false;
  const hostiles = armyHostilesV7(context);
  if (
    !hostiles.some((unit) => distance(unit.at, to) === 1) ||
    hostiles.some((unit) => distance(unit.at, actor.at) === 1)
  )
    return false;
  const tile = findPublicTileV7(view, to);
  if (
    context.lookup.citiesByKey.has(coordKey(to)) ||
    (tile?.explored === true && tile.site !== null)
  )
    return false;
  if (visibleImmediateDamage(view, actor, to, context) < actor.hp) return false;
  const plan = huntOfV7(context, actor.id);
  if (
    plan !== undefined &&
    plan.hunters.get(actor.id) === false &&
    distance(to, plan.target.at) === 1
  )
    return false;
  if (armyEngagementsForV7(context, actor).get(coordKey(to))?.kills === true)
    return false;
  // (Nor the Move to a Kaboom worth making: it is why the unit goes.)
  if (kaboomSetupValueV7(context, actor, to) > 0) return false;
  return !goblinContactCompanyV7(context, actor, to);
}

/**
 * Step two of the Dinosaur pass (`pulp_wars-w49.26`,
 * docs/product/RULESET_7_TUNING_DINOSAUR.md section 14): a Dinosaur seat's
 * Caveman or Raptor goes into contact with company, as a Goblin does
 * (`armyGoblinContactHeldV7`). A Move of its melee unit that may attack after
 * it and has neither Charge! nor Rampage (a Caveman, a Raptor; a
 * Triceratops has `armyChargeHeldV7`) is not made when it ends next to an
 * enemy unit from a tile next to none, the visible enemies kill the unit
 * there, and it has no company (`dinosaurContactCompanyV7`).
 * In a hand-played game two Cavemen walked up alone in one turn, one beside
 * three Raiders and one beside two Fighters, struck for 7 and 5, and were
 * dead a turn later; the capital's garrison did the same twice. Exempt: a
 * hunter's Move of a combined kill, a Move after which the unit's own attack
 * kills, and a Move onto a center or a village.
 */
function armyDinosaurContactHeldV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): boolean {
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`,
  // docs/product/RULESET_7_TUNING_ICE_FOLK.md section 3): an Ice Folk
  // seat's Yeti, Sled, Mammoth, or Witch too (a Sabretooth has its own
  // rule). On the older policy two Yetis of a hand-played game walked up
  // alone to three Human units in rounds 9 and 10, struck once, and died.
  if (!armyDinosaurSeatV7(context) && !armyIceFolkSeatV7(context)) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  const to = command.path.at(-1);
  if (
    actor === undefined ||
    to === undefined ||
    actor.ownerId !== view.viewer.id ||
    actor.form !== "LAND" ||
    !unitMayActAfterMoveV7(view, actor)
  )
    return false;
  const facts = publicCombatFacts(view, actor, context.lookup);
  if (
    !facts.abilities.includes("ATTACK") ||
    facts.attack2 <= 0 ||
    facts.maximumRange > 1 ||
    facts.abilities.includes("OVERRUN") ||
    facts.abilities.includes("LINEBREAKER") ||
    facts.abilities.includes("PROWL")
  )
    return false;
  const hostiles = armyHostilesV7(context);
  if (
    !hostiles.some((unit) => distance(unit.at, to) === 1) ||
    hostiles.some((unit) => distance(unit.at, actor.at) === 1)
  )
    return false;
  const tile = findPublicTileV7(view, to);
  if (
    context.lookup.citiesByKey.has(coordKey(to)) ||
    (tile?.explored === true && tile.site !== null)
  )
    return false;
  if (visibleImmediateDamage(view, actor, to, context) < actor.hp) return false;
  const plan = huntOfV7(context, actor.id);
  if (
    plan !== undefined &&
    plan.hunters.get(actor.id) === false &&
    distance(to, plan.target.at) === 1
  )
    return false;
  if (armyEngagementsForV7(context, actor).get(coordKey(to))?.kills === true)
    return false;
  return !dinosaurContactCompanyV7(context, actor, to);
}

/**
 * Step two of the Dinosaur pass: whether a Dinosaur seat's unit that ends
 * its Move on `to`, next to an enemy unit, has company there. For one of
 * the enemy units it would touch: a hatched dinosaur of its own stands
 * beside that enemy and the mover has Pack Hunt (its blow has the +1 now);
 * or another own unit has that enemy in its range and its attack still to
 * make; or another own unit that has not moved, may attack after a Move,
 * has its attack, and does not hold a center can still be offered a tile
 * from which it has (the tile the mover leaves counts). A Goblin's company
 * (`goblinContactCompanyV7`) is any own unit beside the enemy, because it
 * gives Gang Up whatever it has done; a Caveman beside a Raider that has
 * struck already gives a second Caveman nothing, and on a recorded position
 * one walked up between a Knight and that Raider on its strength.
 */
function dinosaurContactCompanyV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  const pack = unitRoleMechanicsV7(view, actor).packHuntBonus2 > 0;
  for (const hostile of armyHostilesV7(context)) {
    if (distance(hostile.at, to) !== 1) continue;
    for (const unit of view.units) {
      if (
        unit.id === actor.id ||
        unit.ownerId !== view.viewer.id ||
        unit.form !== "LAND"
      )
        continue;
      const gap = distance(unit.at, hostile.at);
      if (pack && gap === 1 && unitGrowsV7(view, unit)) return true;
      const facts = publicCombatFacts(view, unit, context.lookup);
      if (
        !facts.abilities.includes("ATTACK") ||
        facts.attack2 <= 0 ||
        !primaryReadyForPolicyV7(unit)
      )
        continue;
      const reaches = (range: number): boolean =>
        range >= facts.minimumRange && range <= facts.maximumRange;
      if (reaches(gap)) return true;
      if (
        unit.activation.moved ||
        !unitMayActAfterMoveV7(view, unit) ||
        context.lookup.citiesByKey.has(coordKey(unit.at))
      )
        continue;
      if (
        distance(unit.at, actor.at) <= facts.move &&
        reaches(distance(actor.at, hostile.at))
      )
        return true;
      for (const at of context.lookup.moveDestinationsByUnit.get(unit.id) ?? [])
        if (!same(at, to) && reaches(distance(at, hostile.at))) return true;
    }
  }
  return false;
}

/**
 * Step two of the Ice Folk pass (`pulp_wars-w49.27`,
 * docs/product/RULESET_7_TUNING_ICE_FOLK.md section 3): an Ice Folk seat's
 * Snow Hunter or Boulder Yeti (a unit whose role shoots from two tiles)
 * does not walk out in front of its line, whatever offers the Move (a
 * combined kill too: in the lab a Boulder Yeti glided three tiles ahead of
 * the Mammoths in the first turn to open a kill nobody else could reach,
 * threw for 4, and was dead a turn later: 8 Coins). The Move is not made
 * when it ends on a tile a visible hostile melee unit can attack next turn
 * (`armyMeleeReachV7`) and no own line, defender, or breakthrough unit
 * stands nearer to the nearest enemy than that tile (`armyScreenedV7`),
 * nor when the visible enemy's blows on that tile add up to its HP,
 * screened or not. Exempt: a unit that stands in such a reach already (it
 * may step away),
 * the Move from which its shot kills, and the Move onto a center or a
 * village. The Martian seat's rule (`armyRayOutFrontV7`) holds routine
 * Moves only; an Ice Folk shooter glides two or three tiles on its Snow, so
 * a hunter's Move carries it as far out as a routine one.
 *
 * Nor does it, or an Ice Witch, move into the reach of a visible hostile
 * unit with Overrun from a tile outside it, screened or not: a Knight kills
 * each of them in one attack and rides on (`armyIceFolkChainReachV7`). On
 * its own Snow that reach ends one tile inside the Snow's edge (a Knight's
 * Move ends on the first Snow tile it enters).
 *
 * Step two of the Dwarf pass (`pulp_wars-w49.28`,
 * docs/product/RULESET_7_TUNING_DWARF.md section 5): a Dwarf seat's
 * Clockwork Gunner is held the same way (10 HP, Defense 1, and it never
 * heals by itself: only an Engineer's Repair mends it), and its Engineer as
 * the Ice Witch is (out of a chaining unit's reach). The Steam Cannon keeps
 * the siege rules (it does not shoot after a Move).
 */
function armyIceFolkShooterHeldV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): boolean {
  const dwarf = armyDwarfSeatV7(context);
  if (!armyIceFolkSeatV7(context) && !dwarf) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  const to = command.path.at(-1);
  if (
    actor === undefined ||
    to === undefined ||
    actor.ownerId !== view.viewer.id ||
    actor.form !== "LAND"
  )
    return false;
  const rule = unitRoleRuleV7(view, actor);
  const shooter = dwarf
    ? rule.abilities.includes("TWIN_SHOT")
    : rule.range >= 2;
  if (!shooter && !rule.abilities.includes(dwarf ? "ASSEMBLE" : "COLD_SNAP"))
    return false;
  if (
    context.lookup.citiesByKey.has(coordKey(to)) ||
    armyVillageMoveV7(context, actor, to)
  )
    return false;
  if (armyEngagementsForV7(context, actor).get(coordKey(to))?.kills === true)
    return false;
  if (
    armyIceFolkChainReachV7(context, to) &&
    !armyIceFolkChainReachV7(context, actor.at)
  )
    return true;
  if (!shooter) return false;
  // Nor onto a tile where the visible enemies kill it, from one where they
  // do not (a Boulder Yeti took a firing tile three tiles ahead of its
  // line, in the range of three Marksmen and a Catapult).
  if (
    visibleImmediateDamage(view, actor, to, context) >= actor.hp &&
    visibleImmediateDamage(view, actor, actor.at, context) < actor.hp
  )
    return true;
  const reach = armyMeleeReachV7(context);
  if (
    (reach.get(coordKey(to)) ?? 0) <= 0 ||
    (reach.get(coordKey(actor.at)) ?? 0) > 0
  )
    return false;
  return !armyScreenedV7(context, actor, to);
}

/**
 * Step two of the Ice Folk pass: whether a visible hostile unit with
 * Overrun can attack a unit on `at` next turn (the public threat lookup,
 * which stops another faction's ground unit at known Snow).
 */
function armyIceFolkChainReachV7(
  context: PolicyContextV7,
  at: CoordV7,
): boolean {
  const key = coordKey(at);
  return armyChainersV7(context).some(
    (unit) => context.threatenedTiles.get(unit.id)?.has(key) === true,
  );
}

/** The own units with an offered attack now. */
function armyOfferedAttackersV7(context: PolicyContextV7): ReadonlySet<UnitId> {
  if (context.armyAttackers !== null) return context.armyAttackers;
  const attackers = new Set<UnitId>();
  for (const command of context.commands)
    if (command.kind === "ATTACK") attackers.add(command.unitId);
  context.armyAttackers = attackers;
  return attackers;
}

/** Puts a ranged hunter's Move ahead of every melee hunter's. */
const ARMY_RANGED_FIRST_VALUE_V7 = 1000;

/** Combined kills an army seat plans in one decision, the dearest first. */
const ARMY_HUNT_TARGETS_V7 = 12;

/**
 * The targets army play adds to the hunts of `pulp_wars-9s0.8`: every
 * visible hostile land unit with an own land unit within
 * `ARMY_HUNT_REACH_V7`, the most valuable first.
 */
function armyHuntTargetsV7(
  context: PolicyContextV7,
  already: readonly PublicUnitV7[],
): readonly PublicUnitV7[] {
  if (!context.army) return [];
  const view = context.view;
  const own = view.units.filter(
    (unit) => unit.ownerId === view.viewer.id && unit.form === "LAND",
  );
  const assault = context.chokepoint === null ? armyAssaultV7(context) : null;
  return (
    armyHostilesV7(context)
      .filter(
        (target) =>
          !already.includes(target) &&
          own.some(
            (unit) => distance(unit.at, target.at) <= ARMY_HUNT_REACH_V7,
          ) &&
          // Tuning 8: the holders of a city the seat has not the numbers
          // for are left alone until it has (the front gate).
          // Step two of the Goblin pass: a Goblin seat still plans the
          // kill of such a holder by two or more units together
          // (`goblinMobHuntV7`; `huntPlansV7` takes no other plan for it).
          (goblinMobSeatV7(context) ||
            !armyHuntGatedV7(context, assault, target)),
      )
      .map((target) => ({
        target,
        value: targetStrategicValue(view, target.id, context.lookup),
      }))
      // A wounded unit first: the hits of this turn's earlier commands are
      // followed up before a new target is opened.
      .sort(
        (left, right) =>
          Number(right.target.hp < right.target.maxHp) -
            Number(left.target.hp < left.target.maxHp) ||
          right.value - left.value ||
          left.target.id - right.target.id,
      )
      .slice(0, ARMY_HUNT_TARGETS_V7)
      .map((entry) => entry.target)
  );
}

/**
 * Tuning 8 (`pulp_wars-w49.11`): a holder of a city the seat has not the
 * numbers for (the front gate): its position has mode `NONE`, holds a city,
 * and stands outside the seat's own territory; not a weak garrison.
 */
function armyHuntGatedV7(
  context: PolicyContextV7,
  assault: ArmyAssaultV7 | null,
  target: PublicUnitV7,
): boolean {
  const view = context.view;
  return (
    assault !== null &&
    !context.naval.active &&
    !armyWeakGarrisonV7(context, target) &&
    assault.positionByHostile.get(target.id)?.mode === "NONE" &&
    assault.positionByHostile.get(target.id)?.heldCity === true &&
    !inOwnTerritoryForPolicyV7(view, view.viewer.id, target.at)
  );
}

/** Routine Moves: exploration, the objective, pickets, and siege staging. */
const ARMY_ROUTINE_MOVE_MAXIMUM_V7 = 735;

/**
 * Army play for a land Move (`src/ai/v7-army.ts`): the step off a center
 * that lets its city train; the step onto a free village; the Move into an
 * acceptable exchange for a unit that may attack after it (not below half
 * its HP unless it kills, and not alone into lethal reach); the Move of a
 * unit that cannot (a siege unit) to a tile with a shot next turn that it
 * survives until then, when it has no shot now; and the routine Move that
 * would take a ranged, siege, or support unit into reach, or a melee unit
 * alone into heavy reach, which waits for the others.
 *
 * Tuning 6 (`pulp_wars-w49.6`): the assault. A unit of a committed
 * position takes every exchange that does not kill it (a fast unit that
 * reaches a ranged, siege, or support unit first, then the ranged units,
 * then the melee), closes in when it cannot attack this turn, and is not
 * held back by the reach it enters; a unit of a staging position waits
 * outside every visible enemy's reach. A Guard open to ranged attacks does
 * not step into the open under them, and a Move that ends next to own
 * units under a splash attacker costs strategic value.
 */
function armyMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const value = armyPlainMoveValueV7(context, actor, to, priority);
  // Step two of the Undead pass (`pulp_wars-w49.24`), for every army seat:
  // a unit on a Field Defense under a visible enemy's reach makes no
  // routine Move off it (`armyHoldsFieldDefenseV7`).
  return value.priority >= 0 &&
    value.priority <= ARMY_ROUTINE_MOVE_MAXIMUM_V7 &&
    armyHoldsFieldDefenseV7(context, actor, to)
    ? { priority: -1, strategic: 0 }
    : value;
}

/**
 * Step two of the Undead pass (`pulp_wars-w49.24`,
 * docs/product/RULESET_7_TUNING_UNDEAD.md section 15), for every army seat:
 * `actor` has not moved, stands on a Field Defense in its own land where a
 * visible enemy can hit it, and `to` is another tile. Such a unit keeps its
 * Move for an attack, a kill, a village, or the step that lets its city
 * train; an exploring, approaching, or regrouping Move waits. (Building a
 * Field Defense leaves the unit its Move, and a seat that had just paid 3
 * Coins for one walked the unit off it in the same turn: a Human Fighter in
 * the lab, an Undead Zombie and two Human units in hand-played games.)
 */
function armyHoldsFieldDefenseV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (!context.army || actor.form !== "LAND" || actor.activation.moved)
    return false;
  if (same(actor.at, to)) return false;
  const view = context.view;
  const tile = findPublicTileV7(view, actor.at);
  return (
    tile?.explored === true &&
    tile.fieldDefense &&
    tile.territoryOwnerId === view.viewer.id &&
    visibleImmediateDamage(view, actor, actor.at, context) > 0
  );
}

/**
 * Step two of the Martian pass (`pulp_wars-w49.25`,
 * docs/product/RULESET_7_TUNING_MARTIAN.md section 14): a Martian seat's
 * Tripod or Ray Gunner does not walk out in front of its line. `to` is a
 * tile a visible hostile melee unit can attack next turn (`meleeReach`),
 * no own line, defender, or breakthrough unit stands nearer to the nearest
 * enemy than `to` (`armyScreenedV7`), and the unit is not under such a
 * reach where it stands (then the step-back rules move it). A ray after a
 * Move is at half power, the machine has no cover, and a Tripod has
 * Defense 1: in the lab three Tripods walked two tiles ahead of their
 * Grunts in one turn, fired for 2, 4, and 5, and four of the seat's five
 * were dead after the Human turn that followed (36 Coins). Held back, the
 * unit fires at full power at what comes into its range. The Move from
 * which its shot kills, the Move onto a village or a center, and the hunt,
 * the storm, and the extraction (which come in above
 * `ARMY_ROUTINE_MOVE_MAXIMUM_V7`) are as before.
 */
function armyRayOutFrontV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  meleeReach: number,
): boolean {
  if (!armyMartianSeatV7(context) || meleeReach <= 0) return false;
  const view = context.view;
  if (!isRayUnitV7(view, actor)) return false;
  const unitClass = armyClassV7(unitRoleRuleV7(view, actor));
  if (unitClass !== "SIEGE" && unitClass !== "RANGED") return false;
  if ((armyMeleeReachV7(context).get(coordKey(actor.at)) ?? 0) > 0)
    return false;
  if (context.lookup.citiesByKey.has(coordKey(to))) return false;
  if (armyVillageMoveV7(context, actor, to)) return false;
  return !armyScreenedV7(context, actor, to);
}

function armyPlainMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const unchanged = { priority, strategic: 0 };
  if (!context.army || actor.form !== "LAND") return unchanged;
  const view = context.view;
  // The Undead pass, correction: the garrison swap (`armySwapsOutV7`).
  if (armySwapsOutV7(context, { kind: "MOVE", unitId: actor.id, path: [to] }))
    return {
      priority: Math.max(priority, ARMY_SWAP_PRIORITY_V7),
      // To the tile that keeps its Wail, then the safest.
      strategic:
        (isBansheeV7(view, actor) && isPrimaryUnusedV7(actor)
          ? projectedWailSummaryV7(view, actor, to, (unit) =>
              targetStrategicValue(view, unit.id, context.lookup),
            ).value
          : 0) -
        4 * visibleImmediateDamage(view, actor, to, context),
    };
  if (armyVacatesCenterV7(context, actor, to))
    return {
      // Just above the training it makes room for.
      priority: Math.max(
        priority,
        armyTrainingPriorityV7(context) === ARMY_TRAINING_PRIORITY_V7
          ? ARMY_VACATE_PRIORITY_V7
          : ARMY_TOPUP_TRAINING_PRIORITY_V7 + 1,
      ),
      strategic: armyGuardExposedV7(context, actor, to) ? 0 : 1,
    };
  if (
    armyVillageMoveV7(context, actor, to) &&
    visibleImmediateDamage(view, actor, to, context) < actor.hp &&
    // Tuning 7 (`pulp_wars-w49.10`): a slow melee unit (a Zombie) takes a
    // village only where no visible enemy can hit it: it stands there for
    // a turn and cannot strike back at what walks up.
    (!armySlowMeleeV7(context, actor) ||
      visibleImmediateDamage(view, actor, to, context) <= 0) &&
    // The Martian pass, correction: nor does a unit with Overrun (a
    // 9-Coin Knight) sit on a village in the enemy's reach: two did, with
    // nothing beside them, and were pulled into a Tripod's shot.
    (!unitRoleRuleV7(view, actor).abilities.includes("OVERRUN") ||
      visibleImmediateDamage(view, actor, to, context) <= 0)
  )
    return {
      priority: Math.max(
        priority,
        armyExpandingV7(context)
          ? ARMY_VILLAGE_PRIORITY_V7
          : ARMY_LATE_VILLAGE_PRIORITY_V7,
      ),
      strategic: 50,
    };
  if (armyHostilesV7(context).length === 0) return unchanged;
  // The garrison of a center with a hostile unit near goes nowhere on its
  // own account (the candidate filter holds it; where the tactical plan
  // lets it act because a replacement stands by, the old scores decide).
  const center = context.lookup.citiesByKey.get(coordKey(actor.at));
  if (
    center !== undefined &&
    center.ownerId === view.viewer.id &&
    armyHostilesV7(context).some(
      (unit) => distance(unit.at, center.at) <= ARMY_GARRISON_RADIUS_V7,
    )
  )
    return unchanged;
  const danger = visibleImmediateDamage(view, actor, to, context);
  const ownMode = armyModeV7(context, actor);
  // Tuning 8: the front gate (`armyGatedV7`).
  const gated =
    ownMode === "NONE" &&
    armyGatedV7(context, actor) &&
    !inOwnTerritoryForPolicyV7(view, view.viewer.id, to);
  let mode: ArmyAssaultModeV7 = gated ? "STAGE" : ownMode;
  const facts = publicCombatFacts(view, actor, context.lookup);
  const mayAct = unitMayActAfterMoveV7(view, actor);
  // Tuning 7: also the weak links of a kill chain keep apart.
  // The Goblin pass, correction: a defender stands beside its shooters.
  const spacing =
    armySplashSpacingV7(context, actor, to) +
    armyChainSpacingV7(context, actor, to) +
    armyBomberCrowdV7(context, actor, to) -
    armyEscortValueV7(context, actor, to);
  const meleeReach = armyMeleeReachV7(context).get(coordKey(to)) ?? 0;
  const slowMelee = armySlowMeleeV7(context, actor);
  const assignment = context.tactical.campaign?.assignmentByUnitId.get(
    actor.id,
  );
  const job = assignment?.job;
  // Tuning 7: a raider goes to its undefended city.
  const raid = assignment?.raid === true;
  // A unit sent to a village while the seat has few cities goes there: it
  // turns aside only for a kill.
  const errand = (job === "VILLAGE" && armyExpandingV7(context)) || raid;
  const engagement = armyEngagementsForV7(context, actor).get(coordKey(to));
  // Correction pass: the Move that attacks a weak garrison is a committed
  // one, whatever the position.
  if (engagement !== undefined) {
    const prey = context.lookup.unitsById.get(engagement.targetId);
    if (prey !== undefined && armyWeakGarrisonV7(context, prey))
      mode = "COMMIT";
  }
  // Step two of the Martian pass (`pulp_wars-w49.25`): a ray unit does not
  // walk out in front of its line (`armyRayOutFrontV7`).
  if (
    !same(actor.at, to) &&
    // (A hunt, a storm, and a step back come with their own priority.)
    priority <= ARMY_ROUTINE_MOVE_MAXIMUM_V7 &&
    engagement?.kills !== true &&
    armyRayOutFrontV7(context, actor, to, meleeReach)
  )
    return { priority: -1, strategic: 0 };
  // (Tuning 8: a spent fast unit moves in only for a kill; it pulls back.)
  if (
    engagement !== undefined &&
    (engagement.kills || !armySpentV7(context, actor))
  ) {
    if (
      mayAct &&
      facts.move >= 2 &&
      !gated &&
      armySiegeKillV7(context, actor, to)
    )
      return {
        priority: Math.max(priority, ARMY_BREAKTHROUGH_MOVE_PRIORITY_V7),
        strategic: engagement.value - danger - spacing,
      };
    // Correction pass: a bomber that moves and throws does so whenever a
    // step brings a target into its range, whatever the position weighs
    // (ten Bomb Chuckers made seven throws in a game: a seat on the
    // defensive "stages", and a staging unit enters no reach). It throws
    // from its own land whatever comes back, elsewhere when it lives.
    if (
      mayAct &&
      context.goblin &&
      engagement.range >= 2 &&
      !errand &&
      friendlyFireBomberV7(view, actor) &&
      (danger < actor.hp ||
        inOwnTerritoryForPolicyV7(view, view.viewer.id, to) ||
        armyLostAnywayV7(context, actor))
    )
      return {
        priority: Math.max(
          priority,
          mode === "COMMIT"
            ? ARMY_BOMB_MOVE_PRIORITY_V7
            : ARMY_COMMIT_FIRE_MOVE_PRIORITY_V7,
        ),
        strategic: engagement.value - 2 * danger - spacing,
      };
    if (mayAct) {
      if (mode === "COMMIT" && (engagement.kills || !errand))
        return {
          priority: Math.max(
            priority,
            // Tuning 8 (`pulp_wars-w49.11`): a bomb that splashes whatever
            // stands beside its target is thrown before the own units go
            // in (eleven Bomb Chuckers and Rocket Carts fired twice in six
            // rounds: by the time they came up, an own unit stood next to
            // every target).
            context.goblin &&
              engagement.range >= 2 &&
              friendlyFireBomberV7(view, actor)
              ? ARMY_BOMB_MOVE_PRIORITY_V7
              : engagement.fragile && facts.move >= 2
                ? ARMY_BREAKTHROUGH_MOVE_PRIORITY_V7
                : engagement.range >= 2
                  ? ARMY_COMMIT_FIRE_MOVE_PRIORITY_V7
                  : ARMY_COMMIT_MELEE_MOVE_PRIORITY_V7,
          ),
          strategic: engagement.value - 2 * danger - spacing,
        };
      if (
        (engagement.kills && !gated) ||
        (mode !== "STAGE" &&
          !errand &&
          actor.hp * 2 >= actor.maxHp &&
          (danger < actor.hp || armySupportedV7(context, actor, to)))
      )
        return {
          priority: Math.max(priority, ARMY_ENGAGE_PRIORITY_V7),
          strategic: engagement.value - 4 * danger - spacing,
        };
    } else if (
      facts.maximumRange > 1 &&
      // Tuning 7: committed, a siege unit takes a firing tile under the
      // enemy's fire, but not one a hostile melee unit can reach while
      // another exists (the cost below), and never one where a hostile
      // melee unit reaches it and the visible enemies can kill it.
      (danger < actor.hp || (mode === "COMMIT" && meleeReach === 0)) &&
      (mode !== "STAGE" || danger <= 0) &&
      !armyOfferedAttackersV7(context).has(actor.id)
    ) {
      const target = context.lookup.unitsById.get(engagement.targetId);
      return {
        // Committed, the siege units take their tiles before the melee
        // units close in.
        priority: Math.max(
          priority,
          mode === "COMMIT"
            ? ARMY_COMMIT_ADVANCE_PRIORITY_V7 + 5
            : ARMY_FIRING_POSITION_PRIORITY_V7,
        ),
        strategic:
          engagement.value -
          (mode === "COMMIT" ? 1 : 4) * danger -
          spacing -
          // Leapfrog: a tile one step inside the range keeps the shot when
          // the target steps back (four Liches moved to their full range
          // every turn and fired seven shots in ten rounds).
          (target !== undefined &&
          distance(to, target.at) < facts.maximumRange &&
          distance(to, target.at) >= facts.minimumRange
            ? -ARMY_DEEP_SHOT_VALUE_V7
            : 0) -
          (meleeReach > 0 ? ARMY_SIEGE_MELEE_COST_V7 : 0) -
          (context.lookup.citiesByKey.has(coordKey(to))
            ? ARMY_SIEGE_CENTER_COST_V7
            : 0) +
          (armyScreenedV7(context, actor, to) ? ARMY_SCREENED_VALUE_V7 : 0),
      };
    }
  }
  // The Martian pass, correction: a unit with Overrun does not ride ahead
  // of its line. Its Move without an attack that ends in the enemy's reach
  // outside its own land ends beside another own unit. (A Human seat fed
  // thirteen Knights to a firing line one or two at a time: three of the
  // sixteen it fielded ever attacked.)
  if (
    engagement === undefined &&
    // (A hunt and a storm have their own rules and groups.)
    priority <= ARMY_ROUTINE_MOVE_MAXIMUM_V7 &&
    facts.abilities.includes("OVERRUN") &&
    !same(actor.at, to) &&
    danger > 0 &&
    danger > visibleImmediateDamage(view, actor, actor.at, context) &&
    !inOwnTerritoryForPolicyV7(view, view.viewer.id, to) &&
    armyOwnNeighboursV7(context, actor, to) === 0
  )
    return { priority: -1, strategic: 0 };
  // Correction pass: the battery over a stormed center is answered first.
  const gun = errand ? null : armyBatteryTargetV7(context, actor);
  if (gun !== null && !same(actor.at, to)) {
    const from = distance(actor.at, gun.at);
    const next = distance(to, gun.at);
    const reach = Math.max(1, facts.maximumRange);
    const fragileUnit = armyFragileV7(context, actor);
    if (
      next < from &&
      next >= (facts.maximumRange > 1 ? Math.max(2, facts.minimumRange) : 1) &&
      from > reach &&
      // A siege or ranged unit does not walk under a hostile melee unit to
      // its death.
      (fragileUnit ? danger < actor.hp || meleeReach === 0 : true) &&
      // A fast unit goes with company, not one at a time.
      (facts.move < 2 ||
        armyOwnNeighboursV7(context, actor, to) > 0 ||
        armySupportedV7(context, actor, to))
    )
      return {
        // (One above the endgame's approach to the same center when that
        // is what moves the unit: the battery first there too.)
        priority:
          priority >= ENDGAME_APPROACH_PRIORITY_V7
            ? priority + 1
            : Math.max(priority, ARMY_BATTERY_PRIORITY_V7),
        strategic:
          10 * (from - next) +
          (next <= reach ? 20 : 0) -
          Math.floor(danger / 4) -
          spacing +
          2 * armyOwnNeighboursV7(context, actor, to),
      };
  }
  // Tuning 8: a stormer walks up to its center and stays within reach.
  // (Not while the battery is its objective.)
  if ((!errand || raid) && (gun === null || armyFragileV7(context, actor))) {
    const stormMove = armyStormMoveV7(context, actor, to, priority);
    if (stormMove !== null) return stormMove;
  }
  // The Martian pass, correction: toward a hostile center nobody stands
  // on, where the battery and the storm above have no Move for the unit.
  if (gun === null) {
    const emptyCenter = armyEmptyCenterMoveV7(context, actor, to, danger);
    if (emptyCenter !== null)
      return {
        priority: Math.max(priority, ARMY_EMPTY_CENTER_PRIORITY_V7),
        strategic: emptyCenter - spacing,
      };
  }
  // Tuning 7: a Banshee fights with its Wail, from two tiles.
  const wails = facts.abilities.includes("WAIL");
  // The Martian pass (`pulp_wars-w49.14`): a Saucer is a carrier and a
  // puller, not a fighting unit: it does not close in, approach, or rally
  // with the line (its own rules stage it, beam, pull, and extract).
  const fights =
    ((facts.abilities.includes("ATTACK") && facts.attack2 > 0) || wails) &&
    !(context.martian && isSaucerForPolicyV7(view, actor));
  const band = wails ? WAIL_THREAT_RADIUS_V7 : facts.maximumRange;
  // Tuning 7: a wounded unit beside other weak links, inside the reach of
  // a hostile unit with Overrun, steps to a tile with fewer of them when
  // it is no nearer to the enemy: before it recovers (930), so that it is
  // not the first link of a chain to the siege units.
  if (actor.hp * 2 <= actor.maxHp && !errand && !same(actor.at, to)) {
    const here = armyChainSpacingV7(context, actor, actor.at);
    if (here > 0) {
      const there = armyChainSpacingV7(context, actor, to);
      const nearest = armyNearestHostileV7(context, actor.at);
      if (
        there < here &&
        danger < actor.hp &&
        (nearest === null ||
          distance(to, nearest.at) >= distance(actor.at, nearest.at))
      )
        return {
          priority: Math.max(priority, ARMY_UNCHAIN_PRIORITY_V7),
          strategic: 4 * (here - there) - danger,
        };
    }
  }
  // Tuning 8: a spent fast unit (Move 2 or more, half HP or less) inside
  // the enemy's reach that has no kill pulls back out of it: wounded Scrap
  // Buggies and Knights stood beside the enemy's Marksmen after their
  // charge and died to single shots.
  if (!errand && !same(actor.at, to) && armySpentV7(context, actor)) {
    const here = visibleImmediateDamage(view, actor, actor.at, context);
    if (danger < here && danger < actor.hp)
      return {
        priority: Math.max(priority, ARMY_PULL_BACK_PRIORITY_V7),
        strategic:
          4 * (here - danger) +
          2 * armyOwnNeighboursV7(context, actor, to) -
          spacing,
      };
  }
  // Raid: onto a hostile improvement to Pillage it in the same turn.
  if (
    !errand &&
    // (Tuning 8: a stormer has a center to take.)
    !armyStormV7(context).byUnit.has(actor.id) &&
    danger < actor.hp &&
    view.viewer.researchedTechs.includes("RAIDING") &&
    primaryReadyForPolicyV7(actor) &&
    !same(actor.at, to)
  ) {
    const tile = findPublicTileV7(view, to);
    if (
      tile?.explored === true &&
      tile.improvement !== null &&
      tile.territoryOwnerId !== null &&
      isHostile(view, tile.territoryOwnerId)
    )
      return {
        priority: Math.max(priority, ARMY_RAID_PRIORITY_V7),
        strategic:
          12 * (visibleImprovementValueAt(view, to, context.lookup) ?? 1) -
          danger,
      };
  }
  const guardExposed =
    armyGuardExposedV7(context, actor, to) &&
    !armyGuardExposedV7(context, actor, actor.at);
  // Committed and without an attack from `to`: close in on the position.
  if (mode === "COMMIT" && fights && !errand && !guardExposed) {
    // (A Zombie closes in on the cheap infantry when there is some.)
    const unit =
      (armyZombieV7(context, actor)
        ? armyNearestPreyV7(context, actor.at)
        : null) ?? armyNearestOfPositionV7(context, actor);
    // Tuning 7: a slow melee unit marches on the enemy's center when one
    // is near: a unit that steps back from it gives the city up, so the
    // enemy must come to the block.
    const center = slowMelee
      ? armyNearestHostileCenterV7(
          context,
          actor.at,
          ARMY_SLOW_CENTER_RADIUS_V7,
        )
      : null;
    const target = center ?? unit?.at ?? null;
    if (target !== null) {
      const from = distance(actor.at, target);
      const next = distance(to, target);
      const fragileUnit =
        armyClassV7(unitRoleRuleV7(view, actor)) === "SIEGE" ||
        armyClassV7(unitRoleRuleV7(view, actor)) === "RANGED" ||
        armyClassV7(unitRoleRuleV7(view, actor)) === "SUPPORT";
      if (
        next < from &&
        (center !== null ? next >= 1 : next >= band) &&
        // (Toward the center, but never away from the enemy in front.)
        (center === null ||
          unit === null ||
          distance(to, unit.at) <= distance(actor.at, unit.at)) &&
        // Tuning 7: the whole position goes in together, so a melee unit
        // is not held by the reach it enters; a ranged, siege, or support
        // unit still does not walk to its death under a hostile melee unit.
        (fragileUnit ? danger < actor.hp || meleeReach === 0 : true) &&
        // The Undead pass: a Zombie goes in with company, never alone.
        !armyZombieAloneV7(context, actor, to, danger) &&
        // Step two of the Goblin pass: nor a Goblin to its death.
        !armyGoblinAloneV7(context, actor, to, danger)
      )
        return {
          priority: Math.max(priority, ARMY_COMMIT_ADVANCE_PRIORITY_V7),
          strategic:
            4 * (ARMY_COMING_RADIUS_V7 - next) -
            spacing -
            Math.floor(danger / 4) -
            armyZombieShyV7(context, actor, to) +
            (slowMelee
              ? ARMY_BLOCK_VALUE_V7 * armyOwnNeighboursV7(context, actor, to)
              : 0),
        };
    }
  }
  // Rally: with an enemy at the gates of an own center, a unit near that
  // center does not walk away from it, and comes next to it.
  let approach = 0;
  // Tuning 8: a unit on an errand of its own (a village, a chest, the
  // frontier, a raid) is not called back: a Goblin seat with an Undead
  // scout beside its second city kept every unit at home for ten rounds.
  const roaming =
    job === "VILLAGE" ||
    job === "CHEST" ||
    job === "EXPLORE" ||
    job === "RETURN" ||
    raid;
  if (fights && mode !== "COMMIT" && !roaming) {
    let home: CoordV7 | null = null;
    for (const at of armyPressedCentersV7(context))
      if (
        distance(actor.at, at) <= ARMY_NEAR_THREAT_RADIUS_V7 &&
        (home === null || distance(actor.at, at) < distance(actor.at, home))
      )
        home = at;
    if (home !== null) {
      const from = distance(actor.at, home);
      const next = distance(to, home);
      if (next > from && next > 2 && priority <= ARMY_ROUTINE_MOVE_MAXIMUM_V7)
        return { priority: -1, strategic: 0 };
      if (next < from && danger < actor.hp && !guardExposed) {
        priority = Math.max(priority, ARMY_RALLY_PRIORITY_V7);
        approach = next === 1 ? 3 : 1;
      }
    }
  }
  // Alone among enemies and with nothing to attack: back to the others.
  // (A scout too: its frontier lies behind the enemy.)
  const alone =
    ownMode === "NONE" &&
    fights &&
    (!roaming || job === "EXPLORE") &&
    armyAloneV7(context, actor);
  if (alone && approach === 0) {
    const friend = armyNearestFriendV7(context, actor);
    if (
      friend !== null &&
      armyWalkV7(to, friend) < armyWalkV7(actor.at, friend) &&
      danger < actor.hp
    )
      // Not held by the reach it crosses on the way out.
      return {
        priority: Math.max(priority, ARMY_REGROUP_PRIORITY_V7),
        strategic: -spacing,
      };
  }
  // Approach: toward the nearest visible hostile land unit. A staging unit
  // comes from farther and stops outside every reach.
  if (
    fights &&
    !alone &&
    !roaming &&
    approach === 0 &&
    actor.hp * 2 >= actor.maxHp
  ) {
    // A Zombie walks toward the cheap infantry when there is some.
    const target =
      (armyZombieV7(context, actor)
        ? armyNearestPreyV7(context, actor.at)
        : null) ?? armyNearestHostileV7(context, actor.at);
    if (target !== null) {
      const from = distance(actor.at, target.at);
      const next = distance(to, target.at);
      const radius =
        mode === "STAGE" ? ARMY_COMING_RADIUS_V7 : ARMY_APPROACH_RADIUS_V7;
      if (
        from <= radius &&
        next < from &&
        next >= band &&
        (mode !== "STAGE" || danger <= 0)
      ) {
        priority = Math.max(priority, ARMY_APPROACH_PRIORITY_V7);
        // Tuning 8: a Goblin seat's shooters take the front tiles of the
        // army that walks up (their bombs go first, and from two tiles).
        approach =
          1 + radius - next + (armyFrontShooterV7(context, actor) ? 3 : 0);
      }
    }
  }
  const moved = {
    priority,
    strategic: approach - spacing - armyZombieShyV7(context, actor, to),
  };
  if (priority < 0 || priority > ARMY_ROUTINE_MOVE_MAXIMUM_V7) return moved;
  if (guardExposed) return { priority: -1, strategic: 0 };
  // Staging: a unit that has arrived waits where it is; it does not walk
  // off on another errand while the others come up. Committed: a superior
  // army does not walk away from the position it attacks.
  if (mode !== "NONE" && approach === 0 && fights && !errand) {
    const target = armyNearestOfPositionV7(context, actor);
    if (
      target !== null &&
      (mode === "COMMIT" ||
        distance(actor.at, target.at) <= ARMY_NEAR_RADIUS_V7) &&
      // Tuning 8: a staged unit that has arrived stands still (it drifted
      // sideways along its march route while the others came up, and the
      // group went in strung out).
      (ownMode === "STAGE"
        ? distance(to, target.at) >= distance(actor.at, target.at)
        : distance(to, target.at) > distance(actor.at, target.at))
    )
      return { priority: -1, strategic: 0 };
  }
  if (danger <= 0) return moved;
  if (danger <= visibleImmediateDamage(view, actor, actor.at, context))
    return moved;
  const unitClass = armyClassV7(unitRoleRuleV7(view, actor));
  const fragile =
    unitClass === "RANGED" || unitClass === "SIEGE" || unitClass === "SUPPORT";
  // Committed: only a ranged, siege, or support unit still stays out of
  // lethal reach (tuning 7: where a hostile melee unit reaches it; the
  // enemy's shots alone do not stop a committed army).
  if (mode === "COMMIT")
    return (fragile && danger >= actor.hp && meleeReach > 0) ||
      // Step two of the Goblin pass: nor a Goblin alone to its death.
      (!fragile && armyGoblinAloneV7(context, actor, to, danger))
      ? { priority: -1, strategic: 0 }
      : moved;
  if (mode === "STAGE") return { priority: -1, strategic: 0 };
  // Tuning 7: a slow melee unit (a Zombie, an Orc Brute, a Guard) does not
  // walk into the enemy's reach outside its own land without a unit beside
  // it that can strike on arrival: alone it is shot before it ever attacks.
  if (
    slowMelee &&
    !armyStrikerNearV7(context, actor, to) &&
    !inOwnTerritoryForPolicyV7(view, view.viewer.id, to)
  )
    return { priority: -1, strategic: 0 };
  if (
    fragile
      ? danger >= actor.hp || !armyScreenedV7(context, actor, to)
      : danger * 2 >= actor.hp && !armySupportedV7(context, actor, to)
  )
    return { priority: -1, strategic: 0 };
  // Step two of the Goblin pass (`pulp_wars-w49.23`): not alone to its
  // death (`armyGoblinAloneV7`).
  if (!fragile && armyGoblinAloneV7(context, actor, to, danger))
    return { priority: -1, strategic: 0 };
  return moved;
}

/** The unit of an own unit's position nearest to it (then the lowest ID). */
function armyNearestOfPositionV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): PublicUnitV7 | null {
  const position = armyAssaultV7(context).positionByOwn.get(actor.id);
  let best: PublicUnitV7 | null = null;
  for (const unit of position?.hostiles ?? [])
    if (
      best === null ||
      distance(unit.at, actor.at) < distance(best.at, actor.at) ||
      (distance(unit.at, actor.at) === distance(best.at, actor.at) &&
        unit.id < best.id)
    )
      best = unit;
  return best;
}

/** The nearest visible hostile land unit (then the weakest, the lowest ID). */
function armyNearestHostileV7(
  context: PolicyContextV7,
  at: CoordV7,
): PublicUnitV7 | null {
  let best: PublicUnitV7 | null = null;
  for (const unit of armyHostilesV7(context))
    if (
      best === null ||
      distance(unit.at, at) < distance(best.at, at) ||
      (distance(unit.at, at) === distance(best.at, at) &&
        (unit.hp < best.hp || (unit.hp === best.hp && unit.id < best.id)))
    )
      best = unit;
  return best;
}

/**
 * Whether a ranged, siege, or support unit on `to` stands behind its own
 * line: an own melee unit (line, defender, or breakthrough) is nearer than
 * `to` to the hostile land unit nearest to `to`.
 */
function armyScreenedV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  const hostile = armyNearestHostileV7(context, to);
  if (hostile === null) return true;
  const gap = distance(to, hostile.at);
  return view.units.some((unit) => {
    if (
      unit.id === actor.id ||
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      distance(unit.at, hostile.at) >= gap
    )
      return false;
    const unitClass = armyClassV7(unitRoleRuleV7(view, unit));
    return (
      unitClass === "LINE" ||
      unitClass === "DEFENDER" ||
      unitClass === "BREAKTHROUGH"
    );
  });
}

// ---------------------------------------------------------------------------
// Tuning 6 (`pulp_wars-w49.6`, `src/ai/v7-army.ts`): the assault, the
// expansion, and the discipline rules. Every helper returns its neutral
// answer for a seat that does not play the army rules.
// ---------------------------------------------------------------------------

/** A group of visible hostile land units and what the seat does about it. */
interface ArmyPositionV7 {
  readonly hostiles: readonly PublicUnitV7[];
  readonly mode: ArmyAssaultModeV7;
  /**
   * The battle is joined: an own unit is in contact and a unit of the
   * position is wounded.
   */
  readonly joined: boolean;
  /** Tuning 7: the weights the mode was read from, and the own units. */
  readonly hostile: number;
  readonly near: number;
  readonly coming: number;
  readonly nearUnits: number;
  readonly own: readonly UnitId[];
  /**
   * Tuning 7: the fast units may go in: half of the position's slow units
   * can attack this turn (or have), an own unit is in contact, or the
   * position is on the move (`mobile`).
   */
  readonly ready: boolean;
  /**
   * Tuning 7: half of the position's units moved in their owner's last
   * turn (a unit's activation is public until its owner's next turn): it
   * is no prepared line but an army that steps back or comes on, and
   * waiting for the slow units would let it keep its distance for good.
   */
  readonly mobile: boolean;
  /** Tuning 7: the distance of the nearest slow unit to the position. */
  readonly slowGap: number;
  /**
   * Tuning 8 (`pulp_wars-w49.11`): a unit of the position stands within
   * `CAMPAIGN_FRONT_DEFENSE_RADIUS_V7` of a hostile city center: the
   * position holds a city.
   */
  readonly heldCity: boolean;
}

interface ArmyAssaultV7 {
  /** The position each own fighting unit (not a garrison) belongs to. */
  readonly positionByOwn: ReadonlyMap<UnitId, ArmyPositionV7>;
  readonly positionByHostile: ReadonlyMap<UnitId, ArmyPositionV7>;
}

const NO_ARMY_ASSAULT_V7: ArmyAssaultV7 = {
  positionByOwn: new Map(),
  positionByHostile: new Map(),
};

/**
 * What a unit weighs in an assault (`armyUnitStrengthV7`), a unit of a
 * kind with Gang Up half as much again (the Goblin pass, correction,
 * `pulp_wars-w49.12`): by price and HP alone fourteen Goblin units weighed
 * 216 against 287 for eight Human units in cover and stood in front of them
 * for five rounds, though two Goblins with Gang Up beat a Fighter and a
 * charging Wolf Rider with two helpers kills a Swordsman. A Bomb Chucker,
 * whose bomb gets no Gang Up, weighs what it costs.
 */
function armyFieldStrengthV7(view: PlayerViewV7, unit: PublicUnitV7): number {
  const strength = armyUnitStrengthV7(unitRoleRuleV7(view, unit), unit.hp);
  return unit.form === "LAND" &&
    factionRulesV7(unitFactionV7(view, unit)).gangUpMaximum > 0 &&
    unitRoleMechanicsV7(view, unit).gangUpLimit > 0
    ? Math.floor((strength * ARMY_GANG_UP_STRENGTH_V7) / 100)
    : strength;
}

/** A unit with an attack of its own, or a Wail. */
function armyFightsV7(context: PolicyContextV7, unit: PublicUnitV7): boolean {
  const facts = publicCombatFacts(context.view, unit, context.lookup);
  return (
    (facts.abilities.includes("ATTACK") && facts.attack2 > 0) ||
    facts.abilities.includes("WAIL")
  );
}

/**
 * How much harder a hostile unit is to remove where it stands, in percent:
 * half as much again behind Walls or on a Field Defense, a quarter on a
 * center without Walls, in a Forest, or on a Mountain.
 */
function armyCoverPercentV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
): number {
  const tile = findPublicTileV7(context.view, unit.at);
  if (tile?.explored !== true) return 100;
  const city = context.lookup.citiesByKey.get(coordKey(unit.at));
  if (tile.fieldDefense || (city !== undefined && cityHasWallsV7(city)))
    return 150;
  return city !== undefined ||
    tile.terrain === "FOREST" ||
    tile.terrain === "MOUNTAIN"
    ? 125
    : 100;
}

/** The unit stands on an own center (the garrison rules own it). */
function armyOnOwnCenterV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
): boolean {
  return (
    context.lookup.citiesByKey.get(coordKey(unit.at))?.ownerId ===
    context.view.viewer.id
  );
}

/**
 * The hostile positions and their modes (`src/ai/v7-army.ts`). One pass
 * over the visible hostile land units to link them, one over the own land
 * units to weigh them; nothing here depends on the order of the commands.
 */
function armyAssaultV7(context: PolicyContextV7): ArmyAssaultV7 {
  if (context.armyAssault !== undefined) return context.armyAssault;
  const view = context.view;
  const hostiles = context.army
    ? [...armyHostilesV7(context)].sort((left, right) => left.id - right.id)
    : [];
  if (hostiles.length === 0) {
    context.armyAssault = NO_ARMY_ASSAULT_V7;
    return NO_ARMY_ASSAULT_V7;
  }
  // Tuning 7 (`pulp_wars-w49.10`): the own fighting units off their
  // centers, and the hostile units by their distance to the nearest one.
  const fighters = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      unit.hp > 0 &&
      !armyOnOwnCenterV7(context, unit) &&
      armyFightsV7(context, unit),
  );
  const gapOf = new Map<UnitId, number>();
  for (const hostile of hostiles) {
    let gap = Number.POSITIVE_INFINITY;
    for (const unit of fighters)
      gap = Math.min(gap, distance(unit.at, hostile.at));
    gapOf.set(hostile.id, gap);
  }
  // A position is local: the units linked to its seed (the hostile unit
  // nearest to the own army) that stand within `ARMY_POSITION_SPAN_V7` of
  // it. The round-6 link was transitive without a bound, so a neighbour's
  // whole land was one position that no front ever outweighed.
  const seeds = [...hostiles].sort(
    (left, right) =>
      (gapOf.get(left.id) ?? 0) - (gapOf.get(right.id) ?? 0) ||
      left.id - right.id,
  );
  const groupOf = new Map<UnitId, number>();
  const groups: PublicUnitV7[][] = [];
  for (const seed of seeds) {
    if (groupOf.has(seed.id)) continue;
    const group = [seed];
    groupOf.set(seed.id, groups.length);
    for (let index = 0; index < group.length; index += 1) {
      const current = group[index] as PublicUnitV7;
      for (const other of hostiles)
        if (
          !groupOf.has(other.id) &&
          distance(other.at, current.at) <= ARMY_POSITION_LINK_V7 &&
          distance(other.at, seed.at) <= ARMY_POSITION_SPAN_V7
        ) {
          groupOf.set(other.id, groups.length);
          group.push(other);
        }
    }
    groups.push(group);
  }
  const totals = groups.map((group) => ({
    hostile: group.reduce(
      (total, unit) =>
        total +
        Math.floor(
          (armyFieldStrengthV7(view, unit) *
            armyCoverPercentV7(context, unit)) /
            100,
        ),
      0,
    ),
    hostileUnits: group.length,
    near: 0,
    nearUnits: 0,
    coming: 0,
    comingUnits: 0,
    contact: false,
    worn: false,
    slow: 0,
    slowReady: 0,
    slowGap: Number.POSITIVE_INFINITY,
    own: [] as UnitId[],
    // Tuning 8: each own unit's distance and weight (`massed` below).
    ranks: [] as { readonly gap: number; readonly strength: number }[],
    underFire: false,
  }));
  for (const unit of fighters) {
    let nearest: PublicUnitV7 | null = null;
    let gap = Number.POSITIVE_INFINITY;
    for (const hostile of hostiles) {
      const range = distance(hostile.at, unit.at);
      if (range < gap) {
        nearest = hostile;
        gap = range;
      }
    }
    if (nearest === null || gap > ARMY_COMING_RADIUS_V7) continue;
    const total = totals[groupOf.get(nearest.id) ?? -1];
    if (total === undefined) continue;
    const strength = armyFieldStrengthV7(view, unit);
    total.coming += strength;
    total.comingUnits += 1;
    if (gap <= ARMY_NEAR_RADIUS_V7) {
      total.near += strength;
      total.nearUnits += 1;
      if (unit.hp < unit.maxHp) total.worn = true;
    }
    if (gap <= 1) total.contact = true;
    if (
      gap <= ARMY_NEAR_RADIUS_V7 &&
      !total.underFire &&
      visibleImmediateDamage(view, unit, unit.at, context) > 0
    )
      total.underFire = true;
    total.own.push(unit.id);
    // (A unit on an errand of its own is not waited for.)
    const job = context.tactical.campaign?.assignmentByUnitId.get(unit.id);
    if (
      job === undefined ||
      (job.job !== "VILLAGE" &&
        job.job !== "CHEST" &&
        job.job !== "EXPLORE" &&
        job.job !== "RETURN" &&
        job.raid !== true)
    )
      total.ranks.push({
        // Where it stood when its turn began, as far as the public
        // activation tells (a unit that walked up this turn is not yet
        // "up": the army goes in at the start of a turn, not as each unit
        // arrives).
        gap:
          gap + (unit.activation.moved ? unit.activation.movedPathLength : 0),
        strength,
      });
    // Tuning 7: the slow units (Move 1) and how many of them attack this
    // turn (one that has attacked, one in range, or one that can still
    // move into range and attack): the fast units wait for them, so that
    // both land in the same turn.
    const facts = publicCombatFacts(view, unit, context.lookup);
    if (facts.move <= 1) {
      total.slow += 1;
      total.slowGap = Math.min(total.slowGap, gap);
      const range = facts.abilities.includes("WAIL")
        ? WAIL_THREAT_RADIUS_V7
        : facts.maximumRange;
      if (
        unit.activation.attacked ||
        gap <=
          range +
            (!unit.activation.moved && unitMayActAfterMoveV7(view, unit)
              ? facts.move
              : 0)
      )
        total.slowReady += 1;
    }
  }
  const positionByOwn = new Map<UnitId, ArmyPositionV7>();
  const positionByHostile = new Map<UnitId, ArmyPositionV7>();
  groups.forEach((group, index) => {
    const total = totals[index];
    if (total === undefined) return;
    // Tuning 7: the battle stays joined while a unit of the position is
    // wounded and an own unit has arrived, or an arrived own unit is
    // wounded: a defender that steps back a tile breaks the contact, not
    // the battle (round 6 asked for contact and so called the assault off).
    const joined =
      total.nearUnits > 0 &&
      (group.some((unit) => unit.hp < unit.maxHp) ||
        (total.contact && total.worn));
    const mobile =
      2 * group.filter((unit) => unit.activation.moved).length >= group.length;
    // Tuning 8 (`pulp_wars-w49.11`): the group goes in together. An army
    // that has the numbers commits only once it is massed: the battle is
    // joined, or half of the units coming stand within
    // `ARMY_MASSED_RANKS_V7` tiles of its foremost unit, or those that do
    // have the numbers by themselves. Until then it stages (walks up, stops
    // outside the enemy's reach): units came up two and three a turn and
    // were shot one after the other.
    let front = Number.POSITIVE_INFINITY;
    for (const rank of total.ranks) front = Math.min(front, rank.gap);
    let up = 0;
    let upUnits = 0;
    for (const rank of total.ranks)
      if (rank.gap <= front + ARMY_MASSED_RANKS_V7) {
        up += rank.strength;
        upUnits += 1;
      }
    const massed =
      joined ||
      total.contact ||
      // (An enemy on the move is no prepared position: it is chased. And
      // an army with a unit already inside the enemy's reach does not
      // wait there to be shot.)
      mobile ||
      total.underFire ||
      2 * upUnits >= total.ranks.length ||
      armyAssaultModeV7({
        hostile: total.hostile,
        near: up,
        coming: up,
        contact: false,
        hostileUnits: total.hostileUnits,
        nearUnits: upUnits,
        comingUnits: upUnits,
      }) === "COMMIT";
    const weighed = armyAssaultModeV7({ ...total, contact: joined });
    const position: ArmyPositionV7 = {
      hostiles: group,
      mode: weighed === "COMMIT" && !massed ? "STAGE" : weighed,
      joined,
      hostile: total.hostile,
      near: total.near,
      coming: total.coming,
      nearUnits: total.nearUnits,
      own: total.own,
      ready: mobile || total.contact || 2 * total.slowReady >= total.slow,
      mobile,
      slowGap: total.slowGap,
      heldCity: group.some((unit) =>
        view.cities.some(
          (city) =>
            isHostile(view, city.ownerId) &&
            distance(city.at, unit.at) <= CAMPAIGN_FRONT_DEFENSE_RADIUS_V7,
        ),
      ),
    };
    for (const unit of group) positionByHostile.set(unit.id, position);
    for (const id of total.own) positionByOwn.set(id, position);
  });
  context.armyAssault = { positionByOwn, positionByHostile };
  return context.armyAssault;
}

/**
 * The focus of a committed assault: the units of committed positions that
 * the committed units can together take half the HP from this turn. Each
 * own unit counts once, against the unit it can hurt most (the largest
 * share of its HP; then the lowest ID), from where it stands or after a
 * Move when it may attack after moving. A hit that would kill the attacker
 * without a kill is not counted.
 */
function armyFocusV7(context: PolicyContextV7): ReadonlySet<UnitId> {
  if (context.armyFocus !== undefined) return context.armyFocus;
  const view = context.view;
  const potential = new Map<UnitId, number>();
  const assault = armyAssaultV7(context);
  const offered = new Map<UnitId, UnitId[]>();
  for (const command of context.commands)
    if (command.kind === "ATTACK") {
      const list = offered.get(command.unitId) ?? [];
      list.push(command.targetUnitId);
      offered.set(command.unitId, list);
    }
  for (const [unitId, position] of assault.positionByOwn) {
    if (position.mode !== "COMMIT") continue;
    const unit = context.lookup.unitsById.get(unitId);
    if (unit === undefined || !primaryReadyForPolicyV7(unit)) continue;
    const facts = publicCombatFacts(view, unit, context.lookup);
    if (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0) continue;
    const moves =
      !unit.activation.moved && unitMayActAfterMoveV7(view, unit)
        ? (context.lookup.moveDestinationsByUnit.get(unit.id) ?? [])
        : [];
    const attacks = offered.get(unit.id) ?? [];
    let best: {
      readonly target: PublicUnitV7;
      readonly damage: number;
    } | null = null;
    for (const target of position.hostiles) {
      let damage = 0;
      if (attacks.includes(target.id)) {
        const preview = queryCombatPreviewV7(view, unit.id, target.id);
        if (preview !== null && (!preview.attackerDies || preview.defenderDies))
          damage = preview.damageToDefender;
      } else {
        const from = moves.find((to) => {
          const range = distance(to, target.at);
          return range >= facts.minimumRange && range <= facts.maximumRange;
        });
        if (from !== undefined) {
          const moved = { ...unit, at: from };
          const dealt = publicProjectedDamageWithLookupV7(
            view,
            moved,
            target,
            target.at,
            {},
            context.lookup,
          );
          if (
            dealt >= target.hp ||
            armyRetaliationV7(
              context,
              moved,
              target,
              distance(from, target.at),
            ) < unit.hp
          )
            damage = dealt;
        }
      }
      if (
        damage > 0 &&
        (best === null ||
          damage * best.target.hp > best.damage * target.hp ||
          (damage * best.target.hp === best.damage * target.hp &&
            target.id < best.target.id))
      )
        best = { target, damage };
    }
    if (best !== null)
      potential.set(
        best.target.id,
        (potential.get(best.target.id) ?? 0) + best.damage,
      );
  }
  const focus = new Set<UnitId>();
  for (const [targetId, damage] of potential) {
    const target = context.lookup.unitsById.get(targetId);
    if (target !== undefined && 2 * damage >= target.hp) focus.add(targetId);
  }
  context.armyFocus = focus;
  return focus;
}

/**
 * Whether a committed unit takes an exchange against `target` that it
 * would otherwise refuse: the battle is joined, the target is in this
 * turn's focus, or the unit will not live through the enemy's turn where
 * it stands anyway.
 */
function armyCommitAcceptsV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
): boolean {
  if (!context.army || context.chokepoint !== null) return false;
  const position = armyAssaultV7(context).positionByOwn.get(actor.id);
  if (position === undefined || position.mode !== "COMMIT") return false;
  return (
    position.joined ||
    armyFocusV7(context).has(target.id) ||
    visibleImmediateDamage(context.view, actor, actor.at, context) >= actor.hp
  );
}

/**
 * Tuning 7 (`pulp_wars-w49.10`): the tiles a visible hostile melee unit (no
 * attack from two or more tiles) can attack next turn, with how many of
 * them reach each.
 */
function armyMeleeReachV7(
  context: PolicyContextV7,
): ReadonlyMap<string, number> {
  if (context.armyMeleeReach !== undefined) return context.armyMeleeReach;
  const reach = new Map<string, number>();
  for (const unit of armyHostilesV7(context)) {
    const facts = publicCombatFacts(context.view, unit, context.lookup);
    if (
      !facts.abilities.includes("ATTACK") ||
      facts.attack2 <= 0 ||
      facts.maximumRange > 1
    )
      continue;
    for (const key of context.threatenedTiles.get(unit.id) ?? [])
      reach.set(key, (reach.get(key) ?? 0) + 1);
  }
  context.armyMeleeReach = reach;
  return reach;
}

/**
 * Tuning 7: a frontier center: a visible hostile melee unit stands within
 * one step of the reach from which it attacks the center (its Move and 2).
 */
function armyFrontCenterV7(context: PolicyContextV7, center: CoordV7): boolean {
  return armyHostilesV7(context).some((unit) => {
    const facts = publicCombatFacts(context.view, unit, context.lookup);
    return (
      facts.abilities.includes("ATTACK") &&
      facts.attack2 > 0 &&
      facts.maximumRange <= 1 &&
      distance(unit.at, center) <= facts.move + 2
    );
  });
}

/**
 * Tuning 7: a unit that cannot attack after it moved and fights hand to
 * hand (a Zombie, an Orc Brute, a Guard). Alone it never gets the first
 * blow: it advances with the units that can strike on arrival, as a block.
 */
function armySlowMeleeV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
): boolean {
  const facts = publicCombatFacts(context.view, unit, context.lookup);
  return (
    facts.abilities.includes("ATTACK") &&
    facts.attack2 > 0 &&
    facts.maximumRange <= 1 &&
    !unitMayActAfterMoveV7(context.view, unit)
  );
}

/** Tuning 7: an own unit that can strike on arrival stands within 2 of `to`. */
function armyStrikerNearV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  return view.units.some(
    (unit) =>
      unit.id !== actor.id &&
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      distance(unit.at, to) <= ARMY_SUPPORT_RADIUS_V7 &&
      unitMayActAfterMoveV7(view, unit) &&
      armyFightsV7(context, unit),
  );
}

/** Correction pass: `actor`'s attack from `to` kills a hostile siege unit. */
function armySiegeKillV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const engagement = armyEngagementsForV7(context, actor).get(coordKey(to));
  if (engagement === undefined || !engagement.kills) return false;
  const target = context.lookup.unitsById.get(engagement.targetId);
  return (
    target !== undefined &&
    armyClassV7(unitRoleRuleV7(context.view, target)) === "SIEGE"
  );
}

/**
 * Tuning 7: a fast unit (Move 2 or more) of a position the seat stages or
 * commits against does not enter the enemy's reach before the slow units
 * are one Move from their attack (`ArmyPositionV7.ready`): Knights, Scrap
 * Buggies, and Vampires arrived a turn ahead of the infantry and died for
 * it. A unit already under fire is free.
 */
function armyHoldsFastV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (!context.army || context.chokepoint !== null || actor.form !== "LAND")
    return false;
  if (actor.ownerId !== context.view.viewer.id) return false;
  const position = armyAssaultV7(context).positionByOwn.get(actor.id);
  if (position === undefined || position.mode === "NONE" || position.ready)
    return false;
  // Correction pass: the Move that kills a siege unit is what a fast unit
  // is for.
  if (armySiegeKillV7(context, actor, to)) return false;
  // A raider is on its own errand.
  if (
    context.tactical.campaign?.assignmentByUnitId.get(actor.id)?.raid === true
  )
    return false;
  const view = context.view;
  // Tuning 8: nor is the step onto a hostile center held, nor a stormer
  // of a center that is empty, held by an own unit, or being emptied.
  const goal = context.lookup.citiesByKey.get(coordKey(to));
  if (goal !== undefined && isHostile(view, goal.ownerId)) return false;
  const storm = armyStormV7(context).byUnit.get(actor.id);
  if (
    storm !== undefined &&
    (storm.held !== null || storm.garrison === null || storm.doomed)
  )
    return false;
  if (publicCombatFacts(view, actor, context.lookup).move < 2) return false;
  if (visibleImmediateDamage(view, actor, actor.at, context) > 0) return false;
  // Nor does it run ahead of the infantry it waits for (the held Knights
  // stood in the way of the Swordsmen).
  let here = Number.POSITIVE_INFINITY;
  let there = Number.POSITIVE_INFINITY;
  for (const unit of position.hostiles) {
    here = Math.min(here, distance(unit.at, actor.at));
    there = Math.min(there, distance(unit.at, to));
  }
  if (there < here && there < position.slowGap) return true;
  return visibleImmediateDamage(view, actor, to, context) > 0 || there <= 1;
}

/** Tuning 7: the nearest hostile city center within `radius` of `at`. */
function armyNearestHostileCenterV7(
  context: PolicyContextV7,
  at: CoordV7,
  radius: number,
): CoordV7 | null {
  const view = context.view;
  let best: PlayerViewV7["cities"][number] | null = null;
  for (const city of view.cities)
    if (
      isHostile(view, city.ownerId) &&
      distance(city.at, at) <= radius &&
      (best === null ||
        distance(city.at, at) < distance(best.at, at) ||
        (distance(city.at, at) === distance(best.at, at) && city.id < best.id))
    )
      best = city;
  return best?.at ?? null;
}

/** A wounded unit's step out of a kill chain: just above Recover (930). */
const ARMY_UNCHAIN_PRIORITY_V7 = 936;
/** Strategic cost of a weak own unit beside another inside a chain's reach. */
const ARMY_CHAIN_SPACING_VALUE_V7 = 8;
/** A unit with a line unit between it and the enemy's fast units: its gain. */
const ARMY_SCREENED_VALUE_V7 = 10;
/** A siege unit's tile that keeps its shot after the target steps back. */
const ARMY_DEEP_SHOT_VALUE_V7 = 8;
/** A siege unit's tile a hostile melee unit reaches: what it costs. */
const ARMY_SIEGE_MELEE_COST_V7 = 60;
/** A siege unit on a center: what it costs (a center is taken hand to hand). */
const ARMY_SIEGE_CENTER_COST_V7 = 25;
/** A slow melee unit beside its own: what each neighbour is worth. */
const ARMY_BLOCK_VALUE_V7 = 2;
/** A hostile center this close is where a slow unit goes. */
const ARMY_SLOW_CENTER_RADIUS_V7 = 6;

/** A weak link of a kill chain: at half HP or less, or a siege or ranged unit. */
function armyWeakLinkV7(context: PolicyContextV7, unit: PublicUnitV7): boolean {
  // The Martian pass, correction: a whole Force Field holds one attack
  // (the engine's `forceFieldHoldsV7`, from the public view: full HP and
  // a Shield of the field's 4, above the unit's own maximum).
  if (context.martian && unit.hp >= unit.maxHp) {
    const shield =
      context.view.shields.find((entry) => entry.unitId === unit.id)?.shield ??
      0;
    if (
      shield >= FORCE_FIELD_SHIELD_V7 &&
      shield > unitRoleMechanicsV7(context.view, unit).shield
    )
      return false;
  }
  if (unit.hp * 2 <= unit.maxHp) return true;
  const unitClass = armyClassV7(unitRoleRuleV7(context.view, unit));
  if (unitClass === "SIEGE" || unitClass === "RANGED") return true;
  // The Martian pass (`pulp_wars-w49.14`): every Martian unit a Knight
  // kills through its Shield (`ARMY_MARTIAN_STURDY_V7`).
  const shield = context.martian
    ? unitRoleMechanicsV7(context.view, unit).shield
    : 0;
  if (shield > 0 && unit.maxHp + shield < ARMY_MARTIAN_STURDY_V7) return true;
  // The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur unit a Knight's hit
  // kills at full HP (`ARMY_DINOSAUR_STURDY_V7`): a Caveman, a Shaman, a
  // Raptor that has not grown.
  if (
    context.dinosaur &&
    policyUnitFactionV7(context.view, unit) === "DINOSAUR" &&
    unit.maxHp < ARMY_DINOSAUR_STURDY_V7
  )
    return true;
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): an Ice Folk unit a
  // Knight's hit kills at full HP (`ARMY_ICE_FOLK_STURDY_V7`): every one
  // but the Musk Ox, the Mammoth, and the Frost Giant.
  if (
    context.iceFolk &&
    unit.form === "LAND" &&
    policyUnitFactionV7(context.view, unit) === "ICE_FOLK" &&
    unit.maxHp < ARMY_ICE_FOLK_STURDY_V7
  )
    return true;
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): a Dwarf unit a
  // Knight's hit kills at full HP (`ARMY_DWARF_STURDY_V7`): every one but
  // the Steam Mole, the Steam Tank, and the Brass Titan. (In the lab one
  // Knight killed a Hammerer, two Steam Cannons, the Engineer, and a
  // Clockwork Gunner in one ride, and was promoted.)
  return (
    context.dwarf &&
    unit.form === "LAND" &&
    policyUnitFactionV7(context.view, unit) === "DWARF" &&
    unit.maxHp < ARMY_DWARF_STURDY_V7
  );
}

/** The visible hostile land units that attack again after a kill (Overrun). */
function armyChainersV7(context: PolicyContextV7): readonly PublicUnitV7[] {
  if (context.armyChainers !== undefined) return context.armyChainers;
  context.armyChainers = armyHostilesV7(context).filter((unit) =>
    unitRoleRuleV7(context.view, unit).abilities.includes("OVERRUN"),
  );
  return context.armyChainers;
}

/**
 * Tuning 7: what a Move to `to` costs for a weak link that would stand
 * next to other weak links inside the reach of a hostile unit with Overrun
 * (the Knight's chain went from a wounded Swordsman through two Marksmen to
 * the Catapults, twice): `ARMY_CHAIN_SPACING_VALUE_V7` per weak neighbour.
 */
function armyChainSpacingV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  const chainers = armyChainersV7(context);
  if (chainers.length === 0 || !armyWeakLinkV7(context, actor)) return 0;
  const key = coordKey(to);
  const view = context.view;
  let inReach = false;
  for (const unit of chainers)
    if (
      distance(unit.at, to) <=
        publicCombatFacts(view, unit, context.lookup).move + 2 ||
      context.threatenedTiles.get(unit.id)?.has(key) === true
    ) {
      inReach = true;
      break;
    }
  if (!inReach) return 0;
  let weak = 0;
  for (const at of neighbors8V7(view, to))
    for (const unit of context.threatLookup.occupantsByKey.get(coordKey(at)) ??
      [])
      if (
        unit.id !== actor.id &&
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        armyWeakLinkV7(context, unit)
      )
        weak += 1;
  return weak * ARMY_CHAIN_SPACING_VALUE_V7;
}

/**
 * The Goblin pass, correction (`pulp_wars-w49.12`): what a Move to `to` is
 * worth to a Goblin seat's defender-class unit (an Orc Brute) for the
 * ranged, siege, and support units of its own it would stand beside:
 * `ARMY_ESCORT_VALUE_V7` each, at most `ARMY_ESCORT_MAXIMUM_V7`. Goblin
 * seats only: for every defender-class unit the rule slowed the Undead
 * attacker of `LAB_BREAKTHROUGH_UNDEAD` by a round. A unit
 * with Overrun kills a Bomb Chucker, a Rocket Cart, or a Warboss in one
 * attack and rides on; a defender in the row ends the chain (two Knights
 * killed seventeen Goblin units in one turn, with no Orc Brute among them).
 */
function armyEscortValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  const view = context.view;
  // The Martian pass (`pulp_wars-w49.14`): a Shield Projector stands beside
  // the firing line (every own shielded unit next to it counts: a Knight
  // kills a Grunt, a Ray Gunner, or a Brain in one attack and rides on, and
  // the Projector ends the chain; with Force Fields it covers them too).
  if (
    view.viewer.faction === "MARTIAN" &&
    unitRoleRuleV7(view, actor).abilities.includes("FORCE_FIELD")
  ) {
    let covered = 0;
    for (const at of neighbors8V7(view, to))
      for (const unit of context.threatLookup.occupantsByKey.get(
        coordKey(at),
      ) ?? [])
        if (
          unit.id !== actor.id &&
          unit.ownerId === view.viewer.id &&
          unit.form === "LAND" &&
          unitRoleMechanicsV7(view, unit).shield > 0
        )
          covered += 1;
    return Math.min(ARMY_ESCORT_MAXIMUM_V7, covered) * ARMY_ESCORT_VALUE_V7;
  }
  // The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur seat's Ankylosaurus
  // stands beside the units a Knight kills in one attack (Cavemen, Raptors
  // that have not grown, Spitters, the Shaman) and ends the ride.
  const dinosaur = view.viewer.faction === "DINOSAUR";
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): an Ice Folk seat's
  // Musk Ox, and its Mammoth, stand beside the units a Knight kills in one
  // attack (every other Ice Folk unit) and end the ride; a Knight that
  // strikes the Ox is Chilled.
  const iceFolk =
    view.viewer.faction === "ICE_FOLK" &&
    actor.maxHp >= ARMY_ICE_FOLK_STURDY_V7 &&
    actor.role !== "JUGGERNAUT";
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): a Dwarf seat's Steam
  // Mole, and its Steam Tank (Plated: no hit takes more than 4), stand
  // beside the units a Knight kills in one attack (every other Dwarf unit)
  // and end the ride.
  const dwarf =
    armyDwarfSeatV7(context) &&
    actor.maxHp >= ARMY_DWARF_STURDY_V7 &&
    actor.role !== "JUGGERNAUT";
  const sturdyEscort = iceFolk || dwarf;
  if (
    (view.viewer.faction !== "GOBLIN" && !dinosaur && !sturdyEscort) ||
    (!sturdyEscort && armyClassV7(unitRoleRuleV7(view, actor)) !== "DEFENDER")
  )
    return 0;
  let escorted = 0;
  for (const at of neighbors8V7(view, to))
    for (const unit of context.threatLookup.occupantsByKey.get(coordKey(at)) ??
      []) {
      if (
        unit.id === actor.id ||
        unit.ownerId !== view.viewer.id ||
        unit.form !== "LAND"
      )
        continue;
      const unitClass = armyClassV7(unitRoleRuleV7(view, unit));
      if (
        unitClass === "RANGED" ||
        unitClass === "SIEGE" ||
        unitClass === "SUPPORT" ||
        (dinosaur && unit.maxHp < ARMY_DINOSAUR_STURDY_V7) ||
        (iceFolk && unit.maxHp < ARMY_ICE_FOLK_STURDY_V7) ||
        (dwarf && unit.maxHp < ARMY_DWARF_STURDY_V7)
      )
        escorted += 1;
    }
  return Math.min(ARMY_ESCORT_MAXIMUM_V7, escorted) * ARMY_ESCORT_VALUE_V7;
}

/** The own land units next to `to` (the mover left out). */
function armyOwnNeighboursV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  const view = context.view;
  let count = 0;
  for (const at of neighbors8V7(view, to))
    for (const unit of context.threatLookup.occupantsByKey.get(coordKey(at)) ??
      [])
      if (
        unit.id !== actor.id &&
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND"
      )
        count += 1;
  return count;
}

/** The assault mode of the position an own unit belongs to. */
function armyModeV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): ArmyAssaultModeV7 {
  // A single-file front keeps its own siege (`src/ai/v7-chokepoint.ts`).
  if (!context.army || context.chokepoint !== null) return "NONE";
  return armyAssaultV7(context).positionByOwn.get(actor.id)?.mode ?? "NONE";
}

/**
 * Tuning 8 (`pulp_wars-w49.11`): the front gate. A position that holds a
 * hostile city and that the seat has not the numbers for (mode `NONE`) is
 * not fed: outside its own territory a unit treats it as a staging
 * position (it walks up and stops outside every reach, no Move in for an
 * exchange or a lone kill), and its units are no targets of a combined
 * kill. Round 7 sent lone Raiders at a held border city for nine rounds and
 * then five to seven units at a time of an army of forty.
 */
function armyGatedV7(context: PolicyContextV7, actor: PublicUnitV7): boolean {
  // Correction pass: never a seat whose naval plan is active. What it
  // lands arrives a unit or two at a time and never has "the numbers"; a
  // landed unit that waits outside every reach takes nothing (the natural
  // Continents match of `validate:ruleset7-naval-playable` landed nine
  // units and captured with none).
  if (!context.army || context.chokepoint !== null || context.naval.active)
    return false;
  const position = armyAssaultV7(context).positionByOwn.get(actor.id);
  return (
    position !== undefined && position.mode === "NONE" && position.heldCity
  );
}

/**
 * Correction pass (`pulp_wars-w49.11`): a weak garrison. A hostile unit at
 * half its HP or less on the center of a city without Walls, with
 * `ARMY_RETAKE_UNITS_V7` own fighting units within
 * `ARMY_RETAKE_RADIUS_V7` tiles of it. The group that stands there takes
 * the city, whatever the position as a whole weighs: a seat lost two
 * border cities to single wounded units with twelve of its units within
 * four tiles and did nothing, because the player's whole line was one
 * position it had not the numbers for.
 */
function armyWeakGarrisonV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
): boolean {
  if (!context.army) return false;
  const cached = context.armyWeakGarrison.get(target.id);
  if (cached !== undefined) return cached;
  const view = context.view;
  const city = context.lookup.citiesByKey.get(coordKey(target.at));
  let weak = false;
  if (
    city !== undefined &&
    target.form === "LAND" &&
    city.ownerId === target.ownerId &&
    isHostile(view, target.ownerId) &&
    target.hp * 2 <= target.maxHp &&
    !cityHasWallsV7(city)
  ) {
    let near = 0;
    for (const unit of view.units)
      if (
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        distance(unit.at, target.at) <= ARMY_RETAKE_RADIUS_V7 &&
        armyFightsV7(context, unit)
      )
        near += 1;
    weak = near >= ARMY_RETAKE_UNITS_V7;
  }
  context.armyWeakGarrison.set(target.id, weak);
  return weak;
}

/**
 * The distance from the nearest visible hostile land unit to the nearest
 * own center (infinite with none in sight).
 */
function armyThreatDistanceV7(context: PolicyContextV7): number {
  if (context.armyThreatDistance !== undefined)
    return context.armyThreatDistance;
  let result = Number.POSITIVE_INFINITY;
  if (context.army) {
    const view = context.view;
    for (const city of view.cities) {
      if (city.ownerId !== view.viewer.id) continue;
      for (const unit of armyHostilesV7(context))
        result = Math.min(result, distance(unit.at, city.at));
    }
  }
  context.armyThreatDistance = result;
  return result;
}

/**
 * Pressed: a hostile land unit within `ARMY_PRESSED_RADIUS_V7` of an own
 * center, or (tuning 7) an enemy army in the field (`armyWarV7`), while an
 * own city can still train this turn. Then nothing but units is bought: no
 * research, no construction.
 */
function armyPressedV7(context: PolicyContextV7): boolean {
  return (
    context.army &&
    !context.naval.active &&
    (armyThreatDistanceV7(context) <= ARMY_PRESSED_RADIUS_V7 ||
      armyWarV7(context)) &&
    armyCanTrainV7(context)
  );
}

/**
 * An own city can train now: a free slot, its action, and a training on
 * offer, or its own unit on the center that can still step aside for one.
 *
 * Tuning 7 (`pulp_wars-w49.10`): round 6 read "the center is free or its
 * unit has not moved", which was also true of a city with an enemy unit on
 * its center, and of one whose garrison had no tile to step to. Such a seat
 * was pressed for good: it bought no research and no growth and banked its
 * Coins (25 and 34 while it lost cities; 7 to 13 on two cities).
 */
function armyCanTrainV7(context: PolicyContextV7): boolean {
  if (context.armyCanTrain !== undefined) return context.armyCanTrain;
  const view = context.view;
  const offered = new Set<CityId>();
  for (const command of context.commands)
    if (armyProductionV7(command)) offered.add(command.cityId);
  context.armyCanTrain = view.cities.some((city) => {
    if (
      city.ownerId !== view.viewer.id ||
      city.cityActionAvailable === false ||
      freeCapacity(view, city.id) <= 0
    )
      return false;
    if (offered.has(city.id)) return true;
    return (
      context.threatLookup.occupantsByKey.get(coordKey(city.at)) ?? []
    ).some(
      (unit) =>
        same(unit.at, city.at) &&
        unit.ownerId === view.viewer.id &&
        !unit.activation.moved &&
        (context.lookup.moveDestinationsByUnit.get(unit.id) ?? []).some((to) =>
          armyVacatesCenterV7(context, unit, to),
        ),
    );
  });
  return context.armyCanTrain;
}

/** Tuning 7: every own city is at its unit limit. */
function armyAtLimitV7(context: PolicyContextV7): boolean {
  const view = context.view;
  return view.cities.every(
    (city) =>
      city.ownerId !== view.viewer.id || freeCapacity(view, city.id) <= 0,
  );
}

/**
 * Tuning 7: an enemy army is in the field: a hostile land unit within
 * `ARMY_NEAR_THREAT_RADIUS_V7` of an own center, or within
 * `ARMY_NEAR_RADIUS_V7` of an own fighting unit off its center (round 6
 * knew only the first, so an attacker far from home researched five
 * economy technologies in ten rounds of battle).
 */
function armyWarV7(context: PolicyContextV7): boolean {
  if (context.armyWar !== undefined) return context.armyWar;
  let war = false;
  if (context.army && !context.naval.active) {
    war = armyThreatDistanceV7(context) <= ARMY_NEAR_THREAT_RADIUS_V7;
    if (!war)
      for (const position of armyAssaultV7(context).positionByOwn.values())
        if (position.nearUnits > 0) {
          war = true;
          break;
        }
  }
  context.armyWar = war;
  return war;
}

/**
 * Tuning 8: growth that adds population to the seat's own first capital
 * while that capital is small: at level `ARMY_CAPITAL_GROWTH_LEVEL_V7` or
 * below, or below another own city.
 */
function armyCapitalGrowthV7(
  context: PolicyContextV7,
  deltas: readonly { readonly cityId: CityId; readonly delta: number }[],
): boolean {
  const view = context.view;
  const capital = context.lookup.citiesById.get(
    view.viewer.originalCapitalCityId as CityId,
  );
  if (capital === undefined || capital.ownerId !== view.viewer.id) return false;
  if (!deltas.some((item) => item.cityId === capital.id && item.delta > 0))
    return false;
  return (
    capital.level <= ARMY_CAPITAL_GROWTH_LEVEL_V7 ||
    view.cities.some(
      (city) => city.ownerId === view.viewer.id && city.level > capital.level,
    )
  );
}

/** The commands that add population to a city, or level one, for Coins. */
function armyGrowthOfferedV7(context: PolicyContextV7): boolean {
  if (context.armyGrowthOffered !== undefined) return context.armyGrowthOffered;
  let offered = false;
  for (const command of context.commands) {
    if (
      command.kind === "MOVE" ||
      command.kind === "ATTACK" ||
      command.kind === "TRAIN" ||
      command.kind === "RESEARCH" ||
      command.kind === "BUILD_ROAD"
    )
      continue;
    const economic = previewEconomicV7(context.view, command);
    if (
      economic.ok &&
      economic.preview.cost > 0 &&
      (economic.preview.levelsReached.length > 0 ||
        sum(economic.preview.populationDeltaByCity.map((item) => item.delta)) >
          0) &&
      !fillsReservedTargetV7(context.view, command)
    ) {
      offered = true;
      break;
    }
  }
  context.armyGrowthOffered = offered;
  return offered;
}

/** The growth a seat buys with population: what a stalled seat researches. */
const ARMY_GROWTH_KINDS_V7: readonly (
  BasicEconomicCommandKindV7 | SpatialEconomicCommandKindV7
)[] = Object.freeze([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_WORKSHOP",
  "BUILD_MARKET",
] as const);

/** The growth an Undead seat's economy-first research looks at. */
const ARMY_ECONOMY_FIRST_KINDS_V7: readonly string[] = Object.freeze([
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
]);

/**
 * Tuning 7 (`pulp_wars-w49.10`): the growth technology of a stalled seat.
 * Every city is at its unit limit and the technologies it owns leave
 * nothing on its land to buy population with: then the next technology is
 * the first step toward the growth action its land has the most use for
 * per Coin of research (a Farm or a Mine is 2 population, the rest 1).
 *
 * Round 6 researched only toward units. An Undead seat owned Gathering and
 * Hunting, had eaten its Fruit and Game, and stood at five units on two
 * cities from round 6 to round 12 while it bought Drill, Marksmanship, and
 * Scouting; its land had a Farm, two Lumber Camps, and four Mines to build.
 */
function armyGrowthResearchV7(
  context: PolicyContextV7,
): { readonly tech: TechnologyIdV7; readonly cost: number } | null {
  if (context.armyGrowthResearch !== undefined)
    return context.armyGrowthResearch;
  const view = context.view;
  let chosen: { readonly tech: TechnologyIdV7; readonly cost: number } | null =
    null;
  // Tuning 8 (`pulp_wars-w49.11`): also a seat at war that can train the
  // first `ARMY_ROADS_AFTER_ROLES_V7` units of its order: one growth
  // technology when its land has nothing to buy with what it owns.
  // Correction pass: a seat at its unit limit with an enemy within three
  // tiles of a center buys its next unit first (an Undead seat with the
  // player's units at its border bought Engineering for its Mines before
  // the Banshee); the one growth technology of a war still comes once the
  // first two units of the order are in, enemy or no enemy.
  const stalled =
    (armyAtLimitV7(context) &&
      armyThreatDistanceV7(context) > ARMY_PRESSED_RADIUS_V7) ||
    armyWarGrowthDueV7(context);
  // The Undead pass, correction: economy first (`armyEconomyFirstV7`),
  // and then of Hunting, Farming, and Forestry only: what its land shows
  // (Fruit and Game to take, a Farm, a Lumber Camp). The seat in the
  // diagnostic match bought Engineering for Mines at 5 Coins each and its
  // capital stayed at level 2 for ten more rounds.
  const economyFirst = armyEconomyFirstV7(context);
  for (const landOnly of economyFirst ? [true, false] : [false]) {
    if (chosen !== null || (!landOnly && !stalled)) break;
    const forbidden = forbiddenTechnologiesV7(view.setup);
    const technologyOf = (
      kind: (typeof ARMY_GROWTH_KINDS_V7)[number],
    ): TechnologyIdV7 =>
      kind in BASIC_ECONOMIC_ACTIONS_V7
        ? BASIC_ECONOMIC_ACTIONS_V7[kind as BasicEconomicCommandKindV7]
            .technology
        : SPATIAL_ECONOMIC_ACTIONS_V7[kind as SpatialEconomicCommandKindV7]
            .technology;
    let available = false;
    let best: {
      readonly tech: TechnologyIdV7;
      readonly gain: number;
      readonly cost: number;
    } | null = null;
    for (const potential of queryPublicEconomicPotentialsV7(view)) {
      const kind = ARMY_GROWTH_KINDS_V7.find(
        (item) => item === potential.command,
      );
      if (kind === undefined || potential.targets <= 0) continue;
      if (landOnly && !ARMY_ECONOMY_FIRST_KINDS_V7.includes(kind)) continue;
      const technology = technologyOf(kind);
      // (Fruit or Game left to take with a technology it owns is not the
      // economy technology, which builds population: a captured village's
      // Fruit put the research off for three rounds.)
      if (landOnly && view.viewer.researchedTechs.includes(technology))
        continue;
      if (view.viewer.researchedTechs.includes(technology)) {
        available = true;
        break;
      }
      const chain = researchChain(view, technology);
      const first = chain[0];
      if (first === undefined || chain.some((tech) => forbidden.has(tech)))
        continue;
      const gain =
        potential.targets *
        (kind in BASIC_ECONOMIC_ACTIONS_V7
          ? BASIC_ECONOMIC_ACTIONS_V7[kind as BasicEconomicCommandKindV7]
              .population
          : 1) *
        // Economy first: Forestry is also the first step to the Lich
        // (Sawmilling), so a Forest in the land counts threefold.
        (landOnly && kind === "BUILD_LUMBER_CAMP"
          ? ARMY_ECONOMY_FORESTRY_WEIGHT_V7
          : 1);
      const cost = totalResearchCost(view, chain);
      if (
        best === null ||
        gain * best.cost > best.gain * cost ||
        (gain * best.cost === best.gain * cost &&
          TECHNOLOGY_IDS_V7.indexOf(first) <
            TECHNOLOGY_IDS_V7.indexOf(best.tech))
      )
        best = { tech: first, gain, cost };
    }
    if (!available && best !== null)
      chosen = {
        tech: best.tech,
        cost: totalResearchCost(view, [best.tech]),
      };
  }
  context.armyGrowthResearch = chosen;
  return chosen;
}

/**
 * Tuning 7: research in the field. While an enemy army is in the field the
 * Coins go to units, then to growth; a technology is bought only when no
 * city can train and no growth is on offer, or when it is the one step to a
 * unit whose class the army has none of.
 */
function armyWarHoldsResearchV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): boolean {
  if (!armyWarV7(context)) return false;
  // Tuning 8 (`pulp_wars-w49.11`): in a war only the army's own technology
  // is a candidate (the next unit of its order, or the one growth
  // technology): never Roads, Commerce, Fieldcraft, or Fortification. And
  // that one is bought on the research clock, whatever the cities can
  // still train: "units before research" bought three technologies in
  // twenty-one rounds.
  const target = armyResearchTargetV7(context);
  // (With nothing of its own left to research, nothing to train, and no
  // growth on offer, the Coins may go to another technology: a lab attacker
  // above its unit limit stood on 84 Coins otherwise.)
  if (target === null)
    return armyCanTrainV7(context) || armyGrowthOfferedV7(context);
  if (target.tech !== tech) return true;
  // The Undead pass, correction: economy first is not held by a war, nor
  // is the cure.
  if (armyEconomyResearchV7(context, tech) || armyCureResearchV7(context, tech))
    return false;
  // Step two of the Goblin pass: nor is the urgent blocker (`armyBlockerV7`).
  if (armyBlockerResearchV7(context, tech)) return false;
  // The Industry reshuffle (7r56): nor is the defender's last step.
  if (armyDefenderResearchV7(context, tech)) return false;
  // The Dinosaur pass: nor is the slot technology of a crowded Dinosaur
  // seat (`armyDinosaurCrowdedV7`): it is what lets its Coins become units.
  if (target.growth && armyDinosaurCrowdedV7(context)) return false;
  // The correction: nor Wallbreaker for a seat with two Triceratops.
  if (armyWallbreakerDueV7(context, tech)) return false;
  // The Dinosaur pass: a Dinosaur seat lays one Egg a city a turn and its
  // big units fill its slots, so its Coins outrun its production; a
  // technology it can pay for and still lay the dearest Egg on offer is
  // bought (after the production of the turn, `ARMY_UNDUE_RESEARCH_PRIORITY_V7`).
  if (context.view.viewer.faction === "DINOSAUR") {
    let dearest = 0;
    for (const command of context.commands)
      if (armyProductionV7(command))
        dearest = Math.max(dearest, trainingCostV7(context.view, command));
    if (context.view.viewer.coins - target.cost >= dearest) return false;
  }
  if (armyResearchClockDueV7(context)) return false;
  if (!armyCanTrainV7(context) && !armyGrowthOfferedV7(context)) return false;
  if (target.unlocks === null) return true;
  const unitClass = armyShareClassV7(
    effectiveRoleRuleV7(target.unlocks, context.view.viewer.faction),
  );
  return (
    unitClass === null || armyCountsForContextV7(context).byClass[unitClass] > 0
  );
}

/**
 * Tuning 8 (`pulp_wars-w49.11`): a rich seat. Its income is at least
 * `ARMY_RICH_INCOME_V7`, or it fields `ARMY_RICH_ARMY_V7` units and half as
 * many again as the largest hostile seat (the public unit counts of the
 * leaderboard). It researches faster and saves for its technology.
 */
function armyRichV7(context: PolicyContextV7): boolean {
  if (context.armyRich !== undefined) return context.armyRich;
  const view = context.view;
  let rich = false;
  if (context.army) {
    rich = armyIncomeV7(context) >= ARMY_RICH_INCOME_V7;
    if (!rich) {
      let own = 0;
      let largest = 0;
      for (const entry of view.leaderboard) {
        if (entry.isViewer) own = entry.livingUnitCount;
        else if (entry.status === "ACTIVE" && isHostile(view, entry.playerId))
          largest = Math.max(largest, entry.livingUnitCount);
      }
      rich =
        own >= ARMY_RICH_ARMY_V7 &&
        100 * own >= ARMY_RICH_ARMY_RATIO_V7 * largest;
    }
  }
  context.armyRich = rich;
  return rich;
}

/**
 * Tuning 8: the rounds the research clock gives one technology: three, two
 * for a rich seat, and for a seat that earns little the turns its income
 * needs to pay the price plus one (so that one turn's income in every
 * cycle is left for units).
 */
function armyResearchRoundsV7(
  context: PolicyContextV7,
  target: ArmyResearchTargetV7,
): number {
  return armyRichV7(context)
    ? ARMY_RICH_RESEARCH_ROUNDS_V7
    : Math.max(
        ARMY_WAR_RESEARCH_ROUNDS_V7,
        Math.ceil(target.cost / Math.max(1, armyIncomeV7(context))) +
          ARMY_WAR_RESEARCH_SPARE_TURNS_V7,
      );
}

/**
 * Tuning 8: the research clock of a seat at war. One technology is due for
 * every `armyResearchRoundsV7` rounds played: the round has reached that
 * many times the technologies owned. So research never stops: a technology
 * bought early pays for the rounds after it, and a seat that is behind
 * buys the next one as soon as it has the Coins.
 */
function armyResearchClockDueV7(context: PolicyContextV7): boolean {
  if (!context.army) return false;
  const target = armyResearchTargetV7(context);
  if (target === null) return false;
  const view = context.view;
  return (
    view.round >=
    // (The Industry reshuffle, 7r56: the root does not count.)
    armyResearchRoundsV7(context, target) * armyTempoTechnologiesV7(view)
  );
}

/**
 * Tuning 8: the Coins a seat at war keeps for the technology its clock
 * says is due and it cannot pay yet: the price less one turn's income, so
 * that it can pay in its next turn. An enemy at the gates
 * changes nothing (correction pass: the floor was dropped with an enemy
 * within three tiles of a center, and a Goblin and an Undead seat under
 * pressure bought no technology for thirteen rounds); only a city with a
 * hostile unit within `ARMY_RESEARCH_FLOOR_GATES_V7` tiles of its center
 * trains regardless (`armyAtTheGatesV7`).
 */
function armyResearchFloorV7(context: PolicyContextV7): number {
  if (context.armyResearchFloor !== undefined) return context.armyResearchFloor;
  let floor = 0;
  // Step two of the Undead pass: bodies first keeps no Coins.
  if (armyUndeadBodiesFirstV7(context)) {
    context.armyResearchFloor = 0;
    return 0;
  }
  const target = armyResearchTargetV7(context);
  // The Martian pass, correction: also for the economy technology of
  // `armyEconomyFirstV7` (a seat with 4 Coins and 5 a turn trained a
  // 3-Coin unit every turn and bought its 9-Coin Forestry in round 8).
  if (
    (armyWarV7(context) && armyResearchClockDueV7(context)) ||
    (target !== null &&
      armyCorrectionSeatV7(context) &&
      armyEconomyResearchV7(context, target.tech)) ||
    // The Dinosaur pass, correction: and for Wallbreaker.
    (target !== null && armyWallbreakerDueV7(context, target.tech)) ||
    // The Industry reshuffle (7r56): and for the defender's last step.
    (target !== null && armyDefenderResearchV7(context, target.tech)) ||
    // Step two of the Goblin pass: and for the urgent blocker.
    (target !== null && armyBlockerResearchV7(context, target.tech))
  ) {
    if (target !== null && context.view.viewer.coins < target.cost)
      floor = Math.max(0, target.cost - armyIncomeV7(context));
    // Step two of the Dinosaur pass (`pulp_wars-w49.26`): a Dinosaur seat
    // that can pay for the due technology keeps its price until it is
    // bought. The Coins were kept only while they were short: a seat at war
    // came to its turn with 16 Coins and Spitters due at 15, laid an Egg in
    // a threatened city first (1260, above the technology's 1219), kept 5
    // of the 11 left, and stood there again a turn later: Hunting in round
    // 10 and Spitters in round 17 of a diagnostic match, with an Egg laid
    // in every one of those rounds. A city with an enemy at its gates
    // still lays regardless (`armyFloorHoldsTrainingV7`).
    // Only while that research is on offer, so that the Coins are never
    // kept for a purchase that cannot be made.
    else if (
      target !== null &&
      armyDinosaurSeatV7(context) &&
      context.commands.some(
        (offered) =>
          offered.kind === "RESEARCH" && offered.tech === target.tech,
      )
    )
      floor = target.cost;
  }
  context.armyResearchFloor = floor;
  return floor;
}

/**
 * Tuning 8: the Coins kept for the due technology (`armyResearchFloorV7`)
 * do not pay for this training. A city with an enemy at its gates trains
 * regardless (`armyAtTheGatesV7`).
 */
function armyFloorHoldsTrainingV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "TRAIN" | "LAY_EGG" }>,
): boolean {
  return (
    context.army &&
    !armyAtTheGatesV7(context, command.cityId) &&
    context.view.viewer.coins - trainingCostV7(context.view, command) <
      armyResearchFloorV7(context)
  );
}

/**
 * Step two of the Human pass (`pulp_wars-w49.22`,
 * docs/product/RULESET_7_TUNING_HUMAN.md section 17): a Human army seat
 * chooses a city's training among the units the kept Coins allow
 * (`armyFloorHoldsTrainingV7`). The choice was made among everything on
 * offer and the kept Coins were checked afterwards, so a city whose shares
 * wanted a 4-Coin Marksman that the floor did not allow trained nothing,
 * turn after turn, with a 2-Coin Fighter on offer and a free unit slot.
 */
function armyChoosesWithinFloorV7(context: PolicyContextV7): boolean {
  return context.army && context.view.viewer.faction === "ORIGINAL";
}

/** What a Field Defense costs (the reducer's `BUILD_FIELD_DEFENSE` price). */
const ARMY_FIELD_DEFENSE_COINS_V7 = 3;

/**
 * The Industry reshuffle (`pulp_wars-w49.21`, 7r56,
 * docs/product/RULESET_7_INDUSTRY_RESHUFFLE.md): an army seat builds no
 * Field Defense while it keeps Coins for its due technology
 * (`armyResearchFloorV7`), nor one that would leave it short of a technology
 * its war clock says is due and it can pay now. Fortification is on the way
 * to every defender, so a seat at war owns it early: an Undead seat with
 * the enemy at its border built a Field Defense in two turns of four, the
 * last with exactly the price of its due technology in hand, and did not
 * buy it.
 */
function armyFieldDefenseHeldV7(context: PolicyContextV7): boolean {
  if (!context.army) return false;
  if (armyResearchFloorV7(context) > 0) return true;
  const target = armyResearchTargetV7(context);
  return (
    target !== null &&
    armyWarV7(context) &&
    armyResearchClockDueV7(context) &&
    context.view.viewer.coins - ARMY_FIELD_DEFENSE_COINS_V7 < target.cost
  );
}

/**
 * The Undead pass (`pulp_wars-w49.13`,
 * docs/product/RULESET_7_TUNING_UNDEAD.md section 8): the Coins an Undead
 * seat keeps for the dear unit its army is short of. An Undead seat with
 * Sawmilling fielded Zombies and Skeletons for ten rounds: every turn its
 * cities spent the Coins on 3-Coin units before 8 had come together.
 *
 * The unit is the Lich, then the Vampire: unlocked, its class below its
 * share of the army (`armySharesV7`), and not affordable now but within one
 * turn's income. The Coins a city may spend leave the price reachable next
 * turn. It holds only a city where the dear unit itself would be trained:
 * not a threatened or frontier one (those train bodies), and never with an
 * enemy within `ARMY_PRESSED_RADIUS_V7` of an own center. 0 for every
 * other seat.
 */
function armyDearUnitFloorV7(context: PolicyContextV7, cityId: CityId): number {
  if (!context.army) return 0;
  const view = context.view;
  // The Martian pass (`pulp_wars-w49.14`): also a Martian seat, for the
  // Tripod and then the Mothership (its Grunts cost 3 Coins too).
  // The Dinosaur pass (`pulp_wars-w49.15`): and a Dinosaur seat, for the
  // Triceratops and then the T-Rex, in a city with the slots for it.
  const faction = view.viewer.faction;
  if (
    (faction !== "UNDEAD" && faction !== "MARTIAN" && faction !== "DINOSAUR") ||
    !armyAlertV7(context)
  )
    return 0;
  if (armyThreatDistanceV7(context) <= ARMY_PRESSED_RADIUS_V7) return 0;
  const city = context.lookup.citiesById.get(cityId);
  if (
    city === undefined ||
    threatenedCity(context, cityId) ||
    armyFrontCenterV7(context, city.at)
  )
    return 0;
  const counts = armyCountsForContextV7(context);
  if (counts.total < ARMY_DEAR_UNIT_ARMY_V7) return 0;
  const shares = armySharesV7(
    faction,
    counts.hostileFragile >= ARMY_FRAGILE_HOSTILES_V7,
  );
  const income = armyIncomeV7(context);
  for (const role of ["CATAPULT", "KNIGHT"] as const) {
    const rule = effectiveRoleRuleV7(role, faction);
    const unitClass = armyShareClassV7(rule);
    if (
      rule.cost === null ||
      rule.technology === null ||
      !view.viewer.researchedTechs.includes(rule.technology) ||
      (unitClass !== "SIEGE" && unitClass !== "BREAKTHROUGH") ||
      shares[unitClass] * (counts.total + 1) -
        100 * counts.byClass[unitClass] <=
        0 ||
      // A unit of two slots is waited for only where it fits.
      freeCapacity(view, cityId) < roleMechanicsV7(role, faction).capacitySlots
    )
      continue;
    // Affordable now: it is offered, and the composition takes it.
    if (view.viewer.coins >= rule.cost) return 0;
    if (view.viewer.coins + income >= rule.cost)
      return Math.max(0, rule.cost - income);
  }
  return 0;
}

/**
 * The Martian pass, correction (`pulp_wars-w49.14`): training `role` is
 * pointless against the visible enemy: the role's Defense is lower against
 * an attack from two or more tiles (the Human Guard: 1 instead of 3), at
 * least `ARMY_RANGED_ENEMY_UNITS_V7` hostile land units are visible, more
 * than half of them attack from two or more tiles, and the city can train
 * another unit of the army. (A Human seat trained twelve Guards against
 * Martians; every one died to two or three shots without touching a unit.)
 */
function armyOpenToRangedUselessV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "TRAIN" }>,
  offers: readonly CommandV7[] = context.commands,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  const faction = view.viewer.faction;
  const open = (role: UnitRoleIdV7): boolean => {
    const ranged = roleMechanicsV7(role, faction).rangedDefense2;
    return (
      ranged !== null && ranged < effectiveRoleRuleV7(role, faction).defense2
    );
  };
  if (!open(command.role)) return false;
  const hostiles = armyHostilesV7(context);
  if (hostiles.length < ARMY_RANGED_ENEMY_UNITS_V7) return false;
  const shooters = hostiles.filter(
    (unit) => publicCombatFacts(view, unit, context.lookup).maximumRange >= 2,
  ).length;
  if (shooters * 2 <= hostiles.length) return false;
  return offers.some(
    (other) =>
      other.kind === "TRAIN" &&
      other.cityId === command.cityId &&
      !open(other.role) &&
      armyClassV7(effectiveRoleRuleV7(other.role, faction)) !== null,
  );
}

/**
 * The Martian pass, correction: a pressed seat still buys the construction
 * that adds population in a city no enemy stands at the gates of, when it
 * leaves the Coins for every unit on offer. (Pressed by a firing
 * line two or three tiles from its cities, a Human seat built nothing for
 * fifteen rounds: four cities at level 2 and 9 Coins a turn from round 6
 * to round 20, three units trained a turn.)
 */
function armyWarGrowthBuysV7(
  context: PolicyContextV7,
  preview: {
    readonly cost: number;
    readonly populationDeltaByCity: readonly {
      readonly cityId: CityId;
      readonly delta: number;
    }[];
  },
): boolean {
  if (!armyCorrectionSeatV7(context)) return false;
  const grows = preview.populationDeltaByCity.filter((item) => item.delta > 0);
  if (grows.length === 0) return false;
  if (grows.some((item) => armyAtTheGatesV7(context, item.cityId)))
    return false;
  // The dearest training on offer: the growth never decides which unit
  // the seat can still train, so the order of the two does not matter.
  let dearest = 0;
  for (const command of context.commands)
    if (armyProductionV7(command))
      dearest = Math.max(dearest, trainingCostV7(context.view, command));
  return context.view.viewer.coins - preview.cost >= dearest;
}

/** Tuning 8: a hostile land unit stands this close to the city's center. */
function armyAtTheGatesV7(context: PolicyContextV7, cityId: CityId): boolean {
  const view = context.view;
  const city = context.lookup.citiesById.get(cityId);
  return (
    city !== undefined &&
    view.units.some(
      (unit) =>
        unit.form === "LAND" &&
        isHostile(view, unit.ownerId) &&
        distance(unit.at, city.at) <= ARMY_RESEARCH_FLOOR_GATES_V7,
    )
  );
}

/**
 * Tuning 8: a seat at war that can train the first
 * `ARMY_ROADS_AFTER_ROLES_V7` units of its order may research one growth
 * technology (`armyGrowthResearchV7`).
 */
function armyWarGrowthDueV7(context: PolicyContextV7): boolean {
  if (!armyWarV7(context)) return false;
  const view = context.view;
  const faction = view.viewer.faction;
  // One: not while it owns a technology that builds population (a Farm, a
  // Lumber Camp, a Mine, a building), whatever its land still offers.
  for (const kind of ARMY_GROWTH_KINDS_V7) {
    if (kind === "HARVEST_FRUIT" || kind === "HUNT_GAME") continue;
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): the Workshop is
    // at the root, which a seat buys on the way to its defender, and is
    // built only beside a Farm, a Lumber Camp, or a Mine: the root alone
    // builds no population.
    if (kind === "BUILD_WORKSHOP") continue;
    const technology =
      kind in BASIC_ECONOMIC_ACTIONS_V7
        ? BASIC_ECONOMIC_ACTIONS_V7[kind as BasicEconomicCommandKindV7]
            .technology
        : SPATIAL_ECONOMIC_ACTIONS_V7[kind as SpatialEconomicCommandKindV7]
            .technology;
    if (view.viewer.researchedTechs.includes(technology)) return false;
  }
  let unlocked = 0;
  for (const role of ARMY_RESEARCH_ROLES_V7[faction] ?? []) {
    const rule = effectiveRoleRuleV7(role, faction);
    if (
      rule.technology === null ||
      rule.cost === null ||
      !factionUnlocksRoleV7(faction, role)
    )
      continue;
    if (!view.viewer.researchedTechs.includes(rule.technology)) break;
    unlocked += 1;
    if (unlocked >= ARMY_ROADS_AFTER_ROLES_V7) return true;
  }
  return false;
}

/** The own centers with a hostile land unit within the pressed radius. */
function armyPressedCentersV7(context: PolicyContextV7): readonly CoordV7[] {
  if (context.armyPressedCenters !== undefined)
    return context.armyPressedCenters;
  const view = context.view;
  const centers: CoordV7[] = [];
  if (context.army)
    for (const city of view.cities)
      if (
        city.ownerId === view.viewer.id &&
        armyHostilesV7(context).some(
          (unit) => distance(unit.at, city.at) <= ARMY_PRESSED_RADIUS_V7,
        )
      )
        centers.push(city.at);
  context.armyPressedCenters = centers;
  return centers;
}

/**
 * Alone among enemies: outside the own territory, a hostile land unit
 * within `ARMY_NEAR_RADIUS_V7`, and no own fighting land unit within
 * `ARMY_ALONE_RADIUS_V7`.
 */
function armyAloneV7(context: PolicyContextV7, actor: PublicUnitV7): boolean {
  const view = context.view;
  const tile = findPublicTileV7(view, actor.at);
  if (tile?.explored === true && tile.territoryOwnerId === view.viewer.id)
    return false;
  if (
    !armyHostilesV7(context).some(
      (unit) => distance(unit.at, actor.at) <= ARMY_NEAR_RADIUS_V7,
    )
  )
    return false;
  return !view.units.some(
    (unit) =>
      unit.id !== actor.id &&
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      distance(unit.at, actor.at) <= ARMY_ALONE_RADIUS_V7 &&
      armyFightsV7(context, unit),
  );
}

/**
 * A measure of the way between two tiles that every step toward the goal
 * shortens: the distance first, then the sum of both offsets.
 */
function armyWalkV7(from: CoordV7, to: CoordV7): number {
  return (
    100 * distance(from, to) + Math.abs(from.x - to.x) + Math.abs(from.y - to.y)
  );
}

/** Where a unit alone among enemies goes back to: the nearest own unit. */
function armyNearestFriendV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): CoordV7 | null {
  const view = context.view;
  let best: CoordV7 | null = null;
  const consider = (at: CoordV7): void => {
    if (
      best === null ||
      distance(at, actor.at) < distance(best, actor.at) ||
      (distance(at, actor.at) === distance(best, actor.at) &&
        (at.y < best.y || (at.y === best.y && at.x < best.x)))
    )
      best = at;
  };
  for (const unit of view.units)
    if (
      unit.id !== actor.id &&
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      armyFightsV7(context, unit)
    )
      consider(unit.at);
  if (best === null)
    for (const city of view.cities)
      if (city.ownerId === view.viewer.id) consider(city.at);
  return best;
}

/**
 * A city does not train onto a center that two or more hostile ranged
 * units cover while another city of the seat can train this turn, unless
 * a hostile capturer can walk onto the center next turn: then it needs the
 * defender.
 */
function armyTrainsElsewhereV7(
  context: PolicyContextV7,
  cityId: CityId,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  const city = context.lookup.citiesById.get(cityId);
  if (city === undefined) return false;
  if (
    armyHostilesV7(context).some(
      (unit) =>
        unitRoleRuleV7(view, unit).abilities.includes("CAPTURE") &&
        distance(unit.at, city.at) <=
          publicCombatFacts(view, unit, context.lookup).move,
    )
  )
    return false;
  const reach = armyRangedReachV7(context);
  const covered = (at: CoordV7): boolean =>
    (reach.get(coordKey(at)) ?? 0) >= ARMY_COVERED_CENTER_SHOOTERS_V7;
  if (!covered(city.at)) return false;
  return context.commands.some((command) => {
    if (!armyProductionV7(command) || command.cityId === cityId) return false;
    const other = context.lookup.citiesById.get(command.cityId);
    return (
      other !== undefined &&
      other.ownerId === view.viewer.id &&
      !covered(other.at)
    );
  });
}

/** The tiles the visible hostile splash attackers can hit next turn. */
function armySplashReachV7(context: PolicyContextV7): ReadonlySet<string> {
  if (context.armySplashReach !== undefined) return context.armySplashReach;
  const reach = new Set<string>();
  for (const unit of armyHostilesV7(context))
    if (isSplashAttackerV7(context.view, unit))
      for (const key of context.threatenedTiles.get(unit.id) ?? [])
        reach.add(key);
  context.armySplashReach = reach;
  return reach;
}

/**
 * How many visible hostile ranged or siege units can hit each tile next
 * turn from two or more tiles away.
 */
function armyRangedReachV7(
  context: PolicyContextV7,
): ReadonlyMap<string, number> {
  if (context.armyRangedReach !== undefined) return context.armyRangedReach;
  const reach = new Map<string, number>();
  for (const unit of armyHostilesV7(context)) {
    const unitClass = armyClassV7(unitRoleRuleV7(context.view, unit));
    if (
      (unitClass !== "RANGED" && unitClass !== "SIEGE") ||
      publicCombatFacts(context.view, unit, context.lookup).maximumRange < 2
    )
      continue;
    for (const key of context.threatenedTiles.get(unit.id) ?? [])
      reach.set(key, (reach.get(key) ?? 0) + 1);
  }
  context.armyRangedReach = reach;
  return reach;
}

/**
 * Splash spacing: what a Move to `to` costs for standing next to own units
 * inside the reach of a hostile splash attacker.
 */
function armySplashSpacingV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  const reach = armySplashReachV7(context);
  if (reach.size === 0) return 0;
  const view = context.view;
  // The Goblin pass (7r50): a Blast-proof unit is in nobody's splash.
  if (unitIsBlastProofV7(view, actor)) return 0;
  let neighbours = 0;
  let exposed = reach.has(coordKey(to));
  for (const at of neighbors8V7(view, to))
    for (const unit of context.threatLookup.occupantsByKey.get(coordKey(at)) ??
      [])
      if (
        unit.id !== actor.id &&
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        !unitIsBlastProofV7(view, unit)
      ) {
        neighbours += 1;
        if (reach.has(coordKey(at))) exposed = true;
      }
  return exposed ? neighbours * ARMY_SPLASH_SPACING_VALUE_V7 : 0;
}

/**
 * A Guard open to ranged attacks (the Human Guard) does not end a Move in
 * the open inside the reach of a hostile ranged or siege unit: not on a
 * center, a Field Defense, a Mountain, or a Forest that covers it.
 */
function armyGuardExposedV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  // The Undead pass (`pulp_wars-w49.13`): only a ranged Defense below the
  // unit's own exposes it (a Skeleton's Bones is above).
  const rangedDefense2 = unitRoleMechanicsV7(view, actor).rangedDefense2;
  if (
    rangedDefense2 === null ||
    rangedDefense2 >= unitRoleRuleV7(view, actor).defense2
  )
    return false;
  if ((armyRangedReachV7(context).get(coordKey(to)) ?? 0) === 0) return false;
  const tile = findPublicTileV7(view, to);
  if (tile?.explored !== true) return true;
  return !(
    tile.fieldDefense ||
    tile.terrain === "MOUNTAIN" ||
    context.lookup.citiesByKey.has(coordKey(to)) ||
    (tile.terrain === "FOREST" &&
      view.viewer.researchedTechs.includes("FORESTRY"))
  );
}

/**
 * An attack the low-value filter would drop that an army seat makes anyway:
 * by a unit of a committed position, or on a unit standing on an own city
 * center. Never one that kills the attacker without a kill, deals nothing,
 * or that a faction rule rejects.
 */
function armyCommitAttackV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (actor === undefined || target === undefined || actor.form !== "LAND")
    return false;
  if (
    !armyCommitAcceptsV7(context, actor, target) &&
    !armyOnOwnCenterV7(context, target) &&
    !armyWeakGarrisonV7(context, target) &&
    // Tuning 8: nor is the attack of a unit that is lost anyway.
    !armyLostAnywayV7(context, actor)
  )
    return false;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  return (
    preview !== null &&
    preview.damageToDefender > 0 &&
    (!preview.attackerDies || preview.defenderDies) &&
    !attackFactionRejectedV7(context, command, actor, preview)
  );
}

/**
 * Tuning 6 attack values: an enemy on an own center is attacked before
 * anything but a capture; a fast or ranged unit prefers a ranged, siege,
 * or support target; a committed unit's hit that does not kill goes ahead
 * of every routine action, the shots from two or more tiles first (at the
 * anchors: a unit in cover or on a fortification, or a defender).
 */
function armyAttackValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  if (!context.army || actor.form !== "LAND" || target.form !== "LAND")
    return { priority, strategic: 0 };
  let strategic = 0;
  const survives = !preview.attackerDies || preview.defenderDies;
  if (survives && armyOnOwnCenterV7(context, target)) {
    priority = Math.max(priority, ARMY_RETAKE_CENTER_PRIORITY_V7);
    strategic += 40;
  }
  if (armyHuntsFragileV7(context, actor) && armyFragileV7(context, target))
    strategic +=
      ARMY_FRAGILE_TARGET_VALUE_V7 +
      (armyClassV7(unitRoleRuleV7(context.view, target)) === "SIEGE"
        ? ARMY_SIEGE_TARGET_VALUE_V7
        : 0);
  // Tuning 8: the shots that empty a center a stormer then steps onto go
  // first, as a kill with a capture to follow does.
  if (survives && distance(actor.at, target.at) >= 2) {
    const city = context.lookup.citiesByKey.get(coordKey(target.at));
    const storm =
      city === undefined ? undefined : armyStormV7(context).byCity.get(city.id);
    if (storm?.doomed === true && storm.garrison?.id === target.id) {
      priority = Math.max(priority, ARMY_STORM_FIRE_PRIORITY_V7);
      strategic += 40;
    }
  }
  // Tuning 8: a committed bomb with no own unit beside its target goes
  // before every own unit's Move (see `ARMY_BOMB_MOVE_PRIORITY_V7`).
  if (
    survives &&
    context.goblin &&
    preview.damageToDefender > 0 &&
    distance(actor.at, target.at) >= 2 &&
    friendlyFireBomberV7(context.view, actor) &&
    armyModeV7(context, actor) === "COMMIT" &&
    !context.view.units.some(
      (unit) =>
        unit.id !== actor.id &&
        unit.id !== target.id &&
        friendlyOwnerV7(context.view, unit.ownerId) &&
        distance(unit.at, target.at) <= 1,
    )
  )
    priority = Math.max(priority, ARMY_BOMB_FIRE_PRIORITY_V7);
  // Tuning 8: a spent fast unit that cannot kill pulls back instead.
  if (
    survives &&
    !preview.defenderDies &&
    priority < ARMY_RETAKE_CENTER_PRIORITY_V7 &&
    armySpentV7(context, actor)
  )
    priority = Math.min(priority, ARMY_SPENT_ATTACK_PRIORITY_V7);
  // A Zombie goes for cheap infantry: what it kills rises as a Zombie.
  if (armyZombieV7(context, actor) && armyZombiePreyV7(context, target))
    strategic += ARMY_ZOMBIE_PREY_VALUE_V7;
  // The Undead pass (`pulp_wars-w49.13`): a Zombie bites the dearest unit
  // in its reach: whoever kills a Bitten unit, it rises as a Zombie.
  if (
    armyZombieV7(context, actor) &&
    survives &&
    preview.defenderBitten &&
    isNewBiteV7(context.afflictions, target.id, actor.ownerId)
  )
    strategic +=
      ARMY_ZOMBIE_BITE_VALUE_V7 *
      (unitRoleRuleV7(context.view, target).cost ?? ARMY_REWARD_UNIT_COST_V7);
  if (
    survives &&
    !preview.defenderDies &&
    preview.damageToDefender > 0 &&
    (armyModeV7(context, actor) === "COMMIT" ||
      armyWeakGarrisonV7(context, target)) &&
    !armySpentV7(context, actor)
  ) {
    const shot = distance(actor.at, target.at) >= 2;
    if (armyWeakGarrisonV7(context, target)) strategic += 40;
    priority = Math.max(
      priority,
      shot ? ARMY_COMMIT_FIRE_PRIORITY_V7 : ARMY_COMMIT_MELEE_PRIORITY_V7,
    );
    if (
      shot &&
      (armyCoverPercentV7(context, target) > 100 ||
        armyClassV7(unitRoleRuleV7(context.view, target)) === "DEFENDER")
    )
      strategic += ARMY_ANCHOR_TARGET_VALUE_V7;
    // The hits go where the group's hits go.
    if (armyFocusV7(context).has(target.id))
      strategic += ARMY_FOCUS_TARGET_VALUE_V7;
  }
  return { priority, strategic };
}

/** A Zombie prefers cheap line infantry as a target by this much. */
const ARMY_ZOMBIE_PREY_VALUE_V7 = 12;
/** A Zombie's Move costs this per hostile ranged unit that reaches its end. */
const ARMY_ZOMBIE_SHY_VALUE_V7 = 5;
/** Line infantry at most this dear is a Zombie's prey. */
const ARMY_ZOMBIE_PREY_COST_V7 = 2;

/**
 * An own Undead unit with Infect and Bite (the Zombie) of an army seat. (The
 * Undead pass, `pulp_wars-w49.13`: the Abomination has Infect too and is no
 * Zombie; it attacks after moving.)
 */
function armyZombieV7(context: PolicyContextV7, unit: PublicUnitV7): boolean {
  return (
    context.army &&
    context.undead &&
    unit.ownerId === context.view.viewer.id &&
    isZombieV7(context.view, unit) &&
    unitRoleRuleV7(context.view, unit).abilities.includes("BITE")
  );
}

/**
 * The Undead pass (`pulp_wars-w49.13`): a Zombie advances together. Its
 * Move into the reach of a visible enemy ends beside an own unit that
 * fights hand to hand, or within two tiles of one that can strike on
 * arrival and has not moved yet (a Skeleton, a Ghoul, a Vampire); else it
 * waits for them. The candidate filter applies it to every Move of a
 * Zombie that raises the damage it can take, in its own land too. A
 * Zombie cannot attack after it moves, so alone it is shot or struck first:
 * an Undead seat lost twenty-two Zombies that walked up one at a time. It
 * applies to a committed army too.
 */
function armyZombieAloneV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  danger: number,
): boolean {
  if (!armyZombieV7(context, actor) || danger <= 0) return false;
  const view = context.view;
  // Correction: in its own land too (a Zombie stepped out alone beside
  // three enemy units next to its capital), except onto an own center.
  if (context.lookup.citiesByKey.get(coordKey(to))?.ownerId === view.viewer.id)
    return false;
  // Correction: the company is a unit that fights hand to hand (a Banshee
  // beside it is none), or a striker within two tiles that has not moved
  // yet this turn (it can still come along).
  return !view.units.some((unit) => {
    const other =
      unit.id !== actor.id &&
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND";
    if (!other) return false;
    const gap = distance(unit.at, to);
    if (gap > ARMY_SUPPORT_RADIUS_V7) return false;
    const facts = publicCombatFacts(view, unit, context.lookup);
    const melee =
      facts.abilities.includes("ATTACK") &&
      facts.attack2 > 0 &&
      facts.minimumRange <= 1 &&
      armyClassV7(unitRoleRuleV7(view, unit)) !== "SUPPORT";
    if (!melee) return false;
    // (The garrison of a center does not come along.)
    if (context.lookup.citiesByKey.has(coordKey(unit.at))) return false;
    return (
      gap <= 1 || (unitMayActAfterMoveV7(view, unit) && !unit.activation.moved)
    );
  });
}

/** Cheap hostile line infantry (a Fighter, a Skeleton, a Goblin). */
function armyZombiePreyV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
): boolean {
  const rule = unitRoleRuleV7(context.view, target);
  return (
    armyClassV7(rule) === "LINE" &&
    rule.cost !== null &&
    rule.cost <= ARMY_ZOMBIE_PREY_COST_V7
  );
}

/**
 * What a Zombie's Move to `to` costs: the hostile ranged and siege units
 * that reach `to`, less those that reach the tile it stands on: a tile out
 * of their reach is preferred, and where every tile is under the same fire
 * it still moves.
 */
function armyZombieShyV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): number {
  if (!armyZombieV7(context, actor)) return 0;
  const reach = armyRangedReachV7(context);
  return (
    ARMY_ZOMBIE_SHY_VALUE_V7 *
    ((reach.get(coordKey(to)) ?? 0) - (reach.get(coordKey(actor.at)) ?? 0))
  );
}

/** The nearest visible cheap hostile line infantry (then the lowest ID). */
function armyNearestPreyV7(
  context: PolicyContextV7,
  at: CoordV7,
): PublicUnitV7 | null {
  let best: PublicUnitV7 | null = null;
  for (const unit of armyHostilesV7(context))
    if (
      armyZombiePreyV7(context, unit) &&
      (best === null ||
        distance(unit.at, at) < distance(best.at, at) ||
        (distance(unit.at, at) === distance(best.at, at) && unit.id < best.id))
    )
      best = unit;
  return best;
}

/** A committed shot prefers a unit in cover or a defender by this much. */
const ARMY_ANCHOR_TARGET_VALUE_V7 = 12;
/** A committed unit prefers a unit in this turn's focus by this much. */
const ARMY_FOCUS_TARGET_VALUE_V7 = 15;

/**
 * Expansion: a free village a capturer can step onto now. With fewer than
 * `ARMY_EXPANSION_CITIES_V7` cities this goes before every fight; with
 * more it is still a Move worth making at once.
 */
function armyVillageMoveV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (!context.army || actor.form !== "LAND") return false;
  const view = context.view;
  if (!unitRoleRuleV7(view, actor).abilities.includes("CAPTURE")) return false;
  const tile = findPublicTileV7(view, to);
  return (
    tile?.explored === true &&
    tile.site === "VILLAGE" &&
    tile.territoryOwnerId === null &&
    !same(actor.at, to)
  );
}

/**
 * The Martian pass, correction (`pulp_wars-w49.14`): a hostile city whose
 * center no unit stands on, within `ARMY_RETAKE_RADIUS_V7` of a unit that
 * captures: its Move that ends nearer to that center, where the visible
 * enemies do not kill it, is worth ten a tile gained (and twenty more on
 * the center). Null otherwise. (A city's garrison died and its center
 * stood empty for a turn with two units two tiles away.)
 */
function armyEmptyCenterMoveV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  danger: number,
): number | null {
  if (
    !armyCorrectionSeatV7(context) ||
    same(actor.at, to) ||
    danger >= actor.hp
  )
    return null;
  const view = context.view;
  if (!unitRoleRuleV7(view, actor).abilities.includes("CAPTURE")) return null;
  let best: number | null = null;
  for (const city of view.cities) {
    if (!isHostile(view, city.ownerId)) continue;
    const from = distance(actor.at, city.at);
    const next = distance(to, city.at);
    if (from > ARMY_RETAKE_RADIUS_V7 || next >= from) continue;
    if (
      (context.threatLookup.occupantsByKey.get(coordKey(city.at)) ?? [])
        .length > 0
    )
      continue;
    const value = 10 * (from - next) + (next === 0 ? 20 : 0);
    if (best === null || value > best) best = value;
  }
  return best;
}

/** The own city count (expansion comes first below the threshold). */
function armyExpandingV7(context: PolicyContextV7): boolean {
  if (!context.army) return false;
  const view = context.view;
  return (
    view.cities.filter((city) => city.ownerId === view.viewer.id).length <
    ARMY_EXPANSION_CITIES_V7
  );
}

/**
 * The unit stands on a free village it will capture next turn: it does
 * not leave it (a capture needs the unit to start its turn there).
 */
function armyHoldsVillageV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (
    actor === undefined ||
    actor.form !== "LAND" ||
    actor.ownerId !== view.viewer.id ||
    !unitRoleRuleV7(view, actor).abilities.includes("CAPTURE")
  )
    return false;
  const tile = findPublicTileV7(view, actor.at);
  if (
    tile?.explored !== true ||
    tile.site !== "VILLAGE" ||
    tile.territoryOwnerId !== null
  )
    return false;
  // A unit the visible enemies would kill there may leave.
  if (visibleImmediateDamage(view, actor, actor.at, context) >= actor.hp)
    return false;
  if (command.kind === "MOVE") return true;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  return preview !== null && (preview.attackerDies || preview.advances);
}

// ---------------------------------------------------------------------------
// Tuning 8 (`pulp_wars-w49.11`, `src/ai/v7-army.ts`): capture what it
// reaches. In the hand play of round 7 a Raider stood on the player's city
// center twice and rode off with its Escape, and an enemy capital's center
// stood empty at the end of four AI turns with units one or two tiles away.
// ---------------------------------------------------------------------------

/** A hostile center the seat is taking (`armyStormV7`). */
interface ArmyStormV7 {
  readonly city: PlayerViewV7["cities"][number];
  /** The hostile unit on the center, or null. */
  readonly garrison: PublicUnitV7 | null;
  /** The shots on offer this turn kill the garrison. */
  readonly doomed: boolean;
  /** An own capturer stands on the center: it captures next turn. */
  readonly held: PublicUnitV7 | null;
  /** The own units told off for this center, the nearest first. */
  readonly stormers: readonly UnitId[];
}

interface ArmyStormsV7 {
  readonly byUnit: ReadonlyMap<UnitId, ArmyStormV7>;
  readonly byCity: ReadonlyMap<CityId, ArmyStormV7>;
}

const NO_ARMY_STORMS_V7: ArmyStormsV7 = {
  byUnit: new Map(),
  byCity: new Map(),
};

/**
 * Tuning 8: the hostile centers the seat is taking, and the units told off
 * for each. A center counts when an own capturer stands on it (it captures
 * next turn and the others cover it), when it is empty, when the shots on
 * offer kill its garrison this turn, or when the seat is committed against
 * the garrison's position. Its stormers are the `ARMY_STORM_UNITS_V7` own
 * capturers that need the fewest turns to reach it within
 * `ARMY_STORM_RADIUS_V7` (hand-to-hand units before ranged ones); for a
 * center an own unit holds, the nearest fighting units of any kind.
 */
function armyStormV7(context: PolicyContextV7): ArmyStormsV7 {
  if (context.armyStorm !== undefined) return context.armyStorm;
  const view = context.view;
  let result = NO_ARMY_STORMS_V7;
  if (context.army && context.chokepoint === null) {
    const byUnit = new Map<UnitId, ArmyStormV7>();
    const byCity = new Map<CityId, ArmyStormV7>();
    const own = view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id && unit.form === "LAND" && unit.hp > 0,
    );
    const cities = view.cities
      .filter((city) => isHostile(view, city.ownerId))
      .sort((left, right) => left.id - right.id);
    for (const city of cities) {
      const occupants =
        context.threatLookup.occupantsByKey.get(coordKey(city.at)) ?? [];
      const held =
        occupants.find(
          (unit) =>
            unit.ownerId === view.viewer.id &&
            unit.form === "LAND" &&
            canCaptureV7(view, unit),
        ) ?? null;
      const garrison =
        occupants.find(
          (unit) => unit.ownerId !== view.viewer.id && unit.hp > 0,
        ) ?? null;
      if (garrison !== null && !isHostile(view, garrison.ownerId)) continue;
      let shots = 0;
      if (garrison !== null)
        for (const command of context.commands) {
          if (command.kind !== "ATTACK" || command.targetUnitId !== garrison.id)
            continue;
          const shooter = context.lookup.unitsById.get(command.unitId);
          const preview = queryCombatPreviewV7(
            view,
            command.unitId,
            garrison.id,
          );
          if (
            shooter === undefined ||
            preview === null ||
            distance(shooter.at, garrison.at) < 2 ||
            attackFactionRejectedV7(context, command, shooter, preview)
          )
            continue;
          shots += preview.damageToDefender;
        }
      const doomed = garrison !== null && shots >= garrison.hp;
      if (held === null && garrison !== null && !doomed) continue;
      const candidates = own
        .filter(
          (unit) =>
            !byUnit.has(unit.id) &&
            unit.id !== held?.id &&
            distance(unit.at, city.at) <= ARMY_STORM_RADIUS_V7 &&
            !armyOnOwnCenterV7(context, unit) &&
            !isHostile(
              view,
              context.lookup.citiesByKey.get(coordKey(unit.at))?.ownerId ??
                view.viewer.id,
            ) &&
            (held !== null
              ? armyFightsV7(context, unit)
              : canCaptureV7(view, unit)),
        )
        .map((unit) => {
          const facts = publicCombatFacts(view, unit, context.lookup);
          return {
            unit,
            turns: Math.ceil(
              distance(unit.at, city.at) / Math.max(1, facts.move),
            ),
            ranged: Number(
              facts.maximumRange > 1 || facts.abilities.includes("WAIL"),
            ),
          };
        })
        .sort(
          (left, right) =>
            left.turns - right.turns ||
            left.ranged - right.ranged ||
            right.unit.hp - left.unit.hp ||
            left.unit.id - right.unit.id,
        )
        .slice(
          0,
          held !== null
            ? ARMY_COVER_UNITS_V7
            : // More bodies where the enemy's shooters cover the center: a
              // battery kills two stormers a turn.
              Math.min(
                ARMY_STORM_UNITS_MAXIMUM_V7,
                ARMY_STORM_UNITS_V7 +
                  Math.ceil(
                    armyHostilesV7(context).filter(
                      (unit) =>
                        distance(unit.at, city.at) <=
                          ARMY_STORM_SHOOTER_RADIUS_V7 &&
                        publicCombatFacts(view, unit, context.lookup)
                          .maximumRange > 1,
                    ).length / 2,
                  ),
              ),
        );
      if (candidates.length === 0 && held === null) continue;
      const storm: ArmyStormV7 = {
        city,
        garrison,
        doomed,
        held,
        stormers: candidates.map((entry) => entry.unit.id),
      };
      byCity.set(city.id, storm);
      for (const entry of candidates) byUnit.set(entry.unit.id, storm);
    }
    result = { byUnit, byCity };
  }
  context.armyStorm = result;
  return result;
}

/**
 * Correction pass (`pulp_wars-w49.11`): the battery over a hostile center:
 * the hostile siege units whose range covers it. In the hand play of round
 * 8 six units in a row stepped onto the player's capital inside the range
 * of two to four Catapults and were shot before they could capture, while
 * ten Knights were trained and none rode at the Catapults.
 */
function armyBatteryOverV7(
  context: PolicyContextV7,
  center: CoordV7,
): readonly PublicUnitV7[] {
  const key = coordKey(center);
  const cached = context.armyBattery.get(key);
  if (cached !== undefined) return cached;
  const view = context.view;
  const battery = armyHostilesV7(context).filter((unit) => {
    if (armyClassV7(unitRoleRuleV7(view, unit)) !== "SIEGE") return false;
    const facts = publicCombatFacts(view, unit, context.lookup);
    const range = distance(unit.at, center);
    return range >= facts.minimumRange && range <= facts.maximumRange;
  });
  context.armyBattery.set(key, battery);
  return battery;
}

/**
 * The Undead hand pass at `7r55` (`pulp_wars-w49.20`): for an Undead seat
 * the hostile ranged units whose shots reach a hostile center count as its
 * battery when no siege unit covers it. In a hand-played game an Undead
 * seat stepped a Zombie with 10 HP onto the player's emptied center in the
 * reach of two Marksmen, a Fighter, and a Raider (23 damage in sight), and
 * the next turn another: four died there without a capture. A unit that
 * shoots is never Bitten by the Zombie it kills, an Undead unit recovers
 * only in its own land, and a Zombie does not strike on arrival, so the
 * step buys nothing. Empty for every other seat: they storm as before.
 */
function armyUndeadShootersOverV7(
  context: PolicyContextV7,
  center: CoordV7,
): readonly PublicUnitV7[] {
  if (!armyUndeadSeatV7(context)) return [];
  const view = context.view;
  return armyHostilesV7(context).filter((unit) => {
    if (armyClassV7(unitRoleRuleV7(view, unit)) !== "RANGED") return false;
    const facts = publicCombatFacts(view, unit, context.lookup);
    const range = distance(unit.at, center);
    return (
      facts.abilities.includes("ATTACK") &&
      facts.attack2 > 0 &&
      range >= 2 &&
      range >= facts.minimumRange &&
      range <= facts.maximumRange
    );
  });
}

/**
 * Correction pass: the hostile center is deadly for `actor`: a battery
 * covers it, the visible enemies kill the unit there before its next turn
 * (a capture needs the unit to start its turn on the center), and an own
 * fighting unit stands within `ARMY_BATTERY_REACH_V7` tiles of a unit of
 * the battery (so the battery can be dealt with first). For an Undead seat
 * the ranged units that cover the center are a battery when no siege unit
 * does (`armyUndeadShootersOverV7`).
 */
function armyCenterDeadlyV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  center: CoordV7,
): boolean {
  if (!context.army || context.chokepoint !== null) return false;
  const siege = armyBatteryOverV7(context, center);
  // The Undead hand pass (`pulp_wars-w49.20`): for an Undead seat the
  // ranged units that cover the center are a battery too.
  const battery =
    siege.length > 0 ? siege : armyUndeadShootersOverV7(context, center);
  if (battery.length === 0) return false;
  const view = context.view;
  if (visibleImmediateDamage(view, actor, center, context) < actor.hp)
    return false;
  return view.units.some(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      armyFightsV7(context, unit) &&
      battery.some((gun) => distance(unit.at, gun.at) <= ARMY_BATTERY_REACH_V7),
  );
}

/**
 * Correction pass: the unit of a battery `actor` goes for instead of its
 * center or its position: the nearest hostile siege unit that covers a
 * center the seat storms (within `ARMY_BATTERY_REACH_V7` tiles of the
 * actor). A siege or ranged unit answers the battery whenever one shells a
 * stormed center (the seat's three Catapults killed the garrison every
 * turn from seven tiles and never moved to where they reached the
 * player's); any other unit when that center is deadly for it.
 */
function armyBatteryTargetV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): PublicUnitV7 | null {
  if (!context.army || context.chokepoint !== null) return null;
  const view = context.view;
  const unitClass = armyClassV7(unitRoleRuleV7(view, actor));
  const shooter = unitClass === "SIEGE" || unitClass === "RANGED";
  let best: PublicUnitV7 | null = null;
  for (const storm of armyStormV7(context).byCity.values()) {
    const battery = armyBatteryOverV7(context, storm.city.at);
    if (battery.length === 0) continue;
    if (!shooter && !armyCenterDeadlyV7(context, actor, storm.city.at))
      continue;
    for (const gun of battery) {
      const range = distance(actor.at, gun.at);
      if (range > ARMY_BATTERY_REACH_V7) continue;
      if (
        best === null ||
        range < distance(actor.at, best.at) ||
        (range === distance(actor.at, best.at) && gun.id < best.id)
      )
        best = gun;
    }
  }
  return best;
}

/**
 * Tuning 8: a spent fast unit: a breakthrough unit (Move 2 or more) at half
 * its HP or less, inside
 * the visible enemies' reach where it stands, with no kill on offer (an
 * attack or a Move and an attack), and a tile it can reach where it takes
 * less than its HP and less than here. It is not a unit on a center, not
 * a stormer, and not a unit whose attack heals it (the Vampire).
 */
function armySpentV7(context: PolicyContextV7, actor: PublicUnitV7): boolean {
  if (!context.army || context.chokepoint !== null) return false;
  const cached = context.armySpent.get(actor.id);
  if (cached !== undefined) return cached;
  const view = context.view;
  let spent = false;
  if (
    actor.ownerId === view.viewer.id &&
    actor.form === "LAND" &&
    actor.hp * 2 <= actor.maxHp &&
    !actor.activation.moved &&
    publicCombatFacts(view, actor, context.lookup).move >= 2 &&
    // The dear breakthrough unit (a Knight, a Scrap Buggy); a cheap
    // skirmisher stays in the fight, and so does a unit whose attack
    // heals it (the Vampire).
    armyClassV7(unitRoleRuleV7(view, actor)) === "BREAKTHROUGH" &&
    !unitRoleRuleV7(view, actor).abilities.includes("LIFESTEAL") &&
    !context.lookup.citiesByKey.has(coordKey(actor.at)) &&
    !armyStormV7(context).byUnit.has(actor.id)
  ) {
    const here = visibleImmediateDamage(view, actor, actor.at, context);
    if (here > 0) {
      let kill = false;
      for (const command of context.commands)
        if (
          command.kind === "ATTACK" &&
          command.unitId === actor.id &&
          queryCombatPreviewV7(view, actor.id, command.targetUnitId)
            ?.defenderDies === true
        ) {
          kill = true;
          break;
        }
      if (!kill)
        for (const engagement of armyEngagementsForV7(context, actor).values())
          if (engagement.kills) {
            kill = true;
            break;
          }
      spent =
        !kill &&
        (context.lookup.moveDestinationsByUnit.get(actor.id) ?? []).some(
          (to) => {
            const there = visibleImmediateDamage(view, actor, to, context);
            return there < here && there < actor.hp;
          },
        );
    }
  }
  context.armySpent.set(actor.id, spent);
  return spent;
}

/**
 * Tuning 8: a Goblin seat's own unit that attacks from two or more tiles
 * after a Move (the Bomb Chucker: range 2 exactly): it walks at the front
 * of the army, so that it is one step from its throw when the army goes in.
 */
function armyFrontShooterV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): boolean {
  return (
    context.goblin &&
    context.view.viewer.faction === "GOBLIN" &&
    publicCombatFacts(context.view, actor, context.lookup).maximumRange > 1 &&
    unitMayActAfterMoveV7(context.view, actor)
  );
}

/**
 * Tuning 8: a unit that is lost anyway: the visible enemies can kill it
 * where it stands. Its attack on a unit beside it is made whatever the
 * exchange (never one that kills it without a kill): an Undead seat's
 * Zombie stood beside a Guard and its Skeleton beside a Swordsman for a
 * whole turn without an attack, and both died in the next.
 */
function armyLostAnywayV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): boolean {
  return (
    context.army &&
    actor.ownerId === context.view.viewer.id &&
    actor.form === "LAND" &&
    visibleImmediateDamage(context.view, actor, actor.at, context) >= actor.hp
  );
}

/**
 * Tuning 8: a capturer standing on a hostile center stays until it has
 * captured (a capture needs the unit to start its turn there). It makes no
 * Move, whatever offers it (the Raider's Escape, a raid, a Pillage run, the
 * way back to its own units), and no attack that kills it or takes it off
 * the center.
 */
function armyHoldsCenterV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (!context.army) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (
    actor === undefined ||
    actor.ownerId !== view.viewer.id ||
    !canCaptureV7(view, actor)
  )
    return false;
  const city = context.lookup.citiesByKey.get(coordKey(actor.at));
  if (city === undefined || !isHostile(view, city.ownerId)) return false;
  if (command.kind === "MOVE") return true;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  return preview !== null && (preview.attackerDies || preview.advances);
}

/**
 * Tuning 8: while the shots on offer kill the garrison of a hostile center
 * this turn, a stormer that can step onto that center afterwards keeps its
 * Move for it: it makes no other Move and no attack on another unit until
 * the shots are fired. (The shots have the priority of a kill with a
 * capture to follow, the step onto an empty hostile center 1290.)
 */
function armyStormWaitsV7(
  context: PolicyContextV7,
  command: CommandV7,
): boolean {
  if (
    !context.army ||
    (command.kind !== "MOVE" &&
      command.kind !== "ATTACK" &&
      command.kind !== "RECOVER" &&
      command.kind !== "PILLAGE" &&
      command.kind !== "KABOOM")
  )
    return false;
  const storm = armyStormV7(context).byUnit.get(command.unitId);
  if (storm === undefined || !storm.doomed || storm.garrison === null)
    return false;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (actor === undefined || actor.activation.moved) return false;
  if (
    distance(actor.at, storm.city.at) >
    publicCombatFacts(context.view, actor, context.lookup).move
  )
    return false;
  // Only the first stormer in reach waits; the others fight on.
  const first = storm.stormers.find((id) => {
    const unit = context.lookup.unitsById.get(id);
    return (
      unit !== undefined &&
      !unit.activation.moved &&
      distance(unit.at, storm.city.at) <=
        publicCombatFacts(context.view, unit, context.lookup).move
    );
  });
  if (first !== actor.id) return false;
  return !(
    command.kind === "ATTACK" && command.targetUnitId === storm.garrison.id
  );
}

/**
 * Tuning 8: a stormer's Move. Outside one Move of its center it walks up
 * (not held by staging, nor by the reach it enters while the seat is
 * committed there); inside, it stays inside. A unit covering a center an
 * own unit holds comes next to it (a ranged unit to two tiles).
 */
function armyStormMoveV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } | null {
  const storm = armyStormV7(context).byUnit.get(actor.id);
  if (storm === undefined || same(actor.at, to)) return null;
  const view = context.view;
  const facts = publicCombatFacts(view, actor, context.lookup);
  const from = distance(actor.at, storm.city.at);
  const next = distance(to, storm.city.at);
  if (next === 0) return null;
  const ranged = facts.maximumRange > 1 || facts.abilities.includes("WAIL");
  const ring = storm.held !== null ? (ranged ? 2 : 1) : Math.max(1, facts.move);
  const danger = visibleImmediateDamage(view, actor, to, context);
  if (from <= ring) {
    // In place: no routine Move takes it out of reach of the center.
    return next > ring && priority <= ARMY_ROUTINE_MOVE_MAXIMUM_V7
      ? { priority: -1, strategic: 0 }
      : null;
  }
  if (next >= from || (storm.held !== null && next < ring)) return null;
  const committed =
    storm.held !== null ||
    storm.garrison === null ||
    storm.doomed ||
    armyModeV7(context, actor) === "COMMIT";
  if (danger >= actor.hp && !(committed && next <= ring)) return null;
  return {
    priority: Math.max(priority, ARMY_STORM_PRIORITY_V7),
    strategic:
      10 * (from - next) +
      (next <= ring ? 20 : 0) -
      Math.floor(danger / 2) -
      armySplashSpacingV7(context, actor, to) -
      armyChainSpacingV7(context, actor, to) -
      armyZombieShyV7(context, actor, to),
  };
}

function* publicThreatenedTilesWorkV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  lookup: PublicThreatLookupV7,
  pathWork?: MutablePolicyPathDiagnosticsV7,
  policyLookup?: PolicyLookupV7,
  withGlide = true,
): Generator<void, readonly CoordV7[]> {
  const rule = unitRoleRuleV7(view, unit);
  const facts = publicCombatFacts(view, unit, policyLookup);
  // `pulp_wars-0ao.15`: landing ends the activation, so an embarked
  // goblin-crewed unit has no same-turn Kaboom reach (revisions 6 and 16).
  // Revision 13: a hostile Banshee's Wail threatens a living viewer within
  // Chebyshev 2 of every tile it can reach (it may Wail after moving).
  const wail = publicWailThreatV7(view, unit);
  if (!wail && (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0))
    return [];
  // The frozen sea (`pulp_wars-5ti.3`): an icebound unit cannot move or
  // attack, so it threatens nothing.
  if (unitIsIceboundV7(view, unit)) return [];
  const minimumRange = wail ? 1 : facts.minimumRange;
  const maximumRange = wail ? WAIL_THREAT_RADIUS_V7 : facts.maximumRange;
  // Revision 17: a goblin-crewed land unit may Kaboom after any Move (even a
  // Rocket Cart), threatening every tile within Chebyshev 1 of a tile it can
  // reach. Only Goblin units have Kaboom, so other matches are unchanged.
  const kaboom = unit.form === "LAND" && rule.abilities.includes("KABOOM");
  // The Martian revision (`pulp_wars-t6s.3`): a flyer passes every unit,
  // ignores zone of control, and crosses Shallow Water; a walker strides
  // over Forest, Mountain, and Shallow Water. Both end only on land, and a
  // flyer never on a center it does not own. `GROUND` for every non-Martian
  // unit, so other matches are unchanged.
  const mode: "GROUND" | "STRIDE" | "FLY" =
    unit.form === "LAND" ? unitMovementModeV7(view, unit) : "GROUND";
  // The Ice Folk revision (`pulp_wars-7g3.4`): an Ice Folk unit Glides off
  // known Snow (half cost); another faction's ground unit is stopped by
  // known Snow (deep snow; Fieldcraft is assumed absent, as Forest freedom
  // is); a Sabretooth's Prowl ignores zones of control and it never ends on
  // a settlement center it does not own. Snow flags exist only in a match
  // with an Ice Folk seat, and the other facts only for Ice Folk units, so
  // other matches are unchanged. Rockfall from a Mountain a Yeti could
  // reach is left out: counting it lost the head-to-head (64 of 120 games
  // with it, 75 without); a Yeti on a Mountain keeps its published range.
  const glides = withGlide && unit.form === "LAND" && unitGlidesV7(view, unit);
  const deepSnow = deepSnowStopsUnitV7(view, unit, false);
  const prowls = unitIgnoresZocStopsV7(view, unit);
  const avoidsSites =
    mode === "GROUND" &&
    unit.form === "LAND" &&
    unitAvoidsForeignSitesV7(view, unit);
  const origins = new Map([[coordKey(unit.at), unit.at]]);
  if (
    unit.form !== "EMBARKED" &&
    (unitMayActAfterMoveV7(view, unit) || kaboom)
  ) {
    const queue = [{ at: unit.at, spent2: 0 }];
    const best = new Map([[coordKey(unit.at), 0]]);
    const settled = new Set<string>();
    while (queue.length > 0) {
      queue.sort(
        (left, right) =>
          left.spent2 - right.spent2 ||
          left.at.y - right.at.y ||
          left.at.x - right.at.x,
      );
      const current = queue.shift();
      if (current === undefined) break;
      const currentKey = coordKey(current.at);
      if (settled.has(currentKey) || best.get(currentKey) !== current.spent2)
        continue;
      settled.add(currentKey);
      if (pathWork !== undefined) pathWork.threatPathExpansions += 1;
      const priorTile = findPublicTileV7(view, current.at);
      const priorRoadNode =
        priorTile !== undefined &&
        publicRoadNodeForOwner(priorTile, unit.ownerId, lookup);
      for (const next of neighbors8V7(view, current.at)) {
        const tile = tileAtPublicV7(view, next);
        if (!publicMovementTilePossible(view, unit, tile, lookup)) continue;
        // Revision 18: a unit passes through the visible units of its own
        // owner, never another seat's, and cannot end on any unit.
        const occupants = (
          lookup.occupantsByKey.get(coordKey(tile.at)) ?? []
        ).filter(
          (occupant) => occupant.id !== unit.id && same(occupant.at, tile.at),
        );
        if (
          mode !== "FLY" &&
          occupants.some((occupant) => occupant.ownerId !== unit.ownerId)
        )
          continue;
        const passedOnly =
          occupants.length > 0 ||
          (mode !== "GROUND" &&
            !machineMayEndForThreatV7(view, unit, tile, mode)) ||
          (avoidsSites &&
            tile.explored &&
            tile.site !== null &&
            !view.cities.some(
              (city) => same(city.at, tile.at) && city.ownerId === unit.ownerId,
            ));
        // Revision 18: leaving a usable Road node costs half; the Forest and
        // Mountain stop is still waived only when both ends are Road nodes.
        const roadCost = unit.form === "LAND" && priorRoadNode;
        const roadEdge =
          roadCost && publicRoadNodeForOwner(tile, unit.ownerId, lookup);
        // `pulp_wars-1wy.3`: Glide is a step from Snow onto Snow.
        const glideCost =
          glides &&
          priorTile?.explored === true &&
          priorTile.snow === true &&
          tile.explored &&
          tile.snow === true;
        const spent2 = current.spent2 + (roadCost || glideCost ? 1 : 2);
        if (spent2 > facts.move * 2) continue;
        const key = coordKey(tile.at);
        if ((best.get(key) ?? Number.POSITIVE_INFINITY) <= spent2) continue;
        // The shared terrain-stop rule for a ground unit, with the policy's
        // historical assumption of no Forest freedom; the Ice Folk revision:
        // a Mountain-born unit is not stopped by a Mountain.
        const terrainStop =
          unit.form === "LAND" &&
          mode === "GROUND" &&
          tile.explored &&
          terrainStopsMoveV7({
            terrain: tile.terrain,
            movementMode: "GROUND",
            mountainBorn: unitIsMountainBornV7(view, unit),
            ignoresForest: false,
            roadEdge,
            // The frozen sea (`pulp_wars-5ti.3`, correctness only): known
            // ice is ground on which another faction's ground unit slips.
            // An Ice Folk unit's slide is left out of this estimate (it
            // walks the ice here); the ice rules of the policy are
            // `pulp_wars-5ti.5`.
            ice: isIceAtV7(view, tile.at),
            iceFolk: unitOwnerIsIceFolkV7(view, unit),
          });
        const snowStop =
          deepSnow && !roadEdge && tile.explored && tile.snow === true;
        const hostileZoc =
          mode !== "FLY" &&
          !prowls &&
          neighbors8V7(view, tile.at).some((adjacent) =>
            (lookup.occupantsByKey.get(coordKey(adjacent)) ?? []).some(
              (occupant) =>
                occupant.id !== unit.id &&
                occupant.hp > 0 &&
                occupant.form !== "EMBARKED" &&
                // Revision 19: an Egg projects no zone of control.
                occupant.form !== "EGG" &&
                occupant.ownerId !== unit.ownerId &&
                !publicPlayersAllied(view, unit.ownerId, occupant.ownerId) &&
                publicProjectsZocForThreatV7(view, occupant, unit, tile),
            ),
          );
        const stops = terrainStop || hostileZoc || snowStop;
        if (passedOnly && stops) continue;
        best.set(key, spent2);
        if (!passedOnly) origins.set(key, tile.at);
        if (!stops) queue.push({ at: tile.at, spent2 });
      }
      yield;
    }
  }
  const direct: CoordV7[] = [];
  for (const origin of origins.values()) {
    const attacks = unitMayActAfterMoveV7(view, unit) || same(origin, unit.at);
    for (let y = origin.y - maximumRange; y <= origin.y + maximumRange; y += 1)
      for (
        let x = origin.x - maximumRange;
        x <= origin.x + maximumRange;
        x += 1
      ) {
        if (x < 0 || y < 0 || x >= view.board.width || y >= view.board.height)
          continue;
        const at = { x, y };
        const range = distance(origin, at);
        if (
          (attacks && range >= minimumRange && range <= maximumRange) ||
          (kaboom && range <= 1)
        )
          direct.push(at);
      }
    yield;
  }
  return [...new Map(direct.map((at) => [coordKey(at), at])).values()];
}

const WAIL_THREAT_RADIUS_V7 = 2;

/** A visible hostile land Banshee threatens a living viewer (section 6.6). */
function publicWailThreatV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "LAND" &&
    unit.ownerId !== view.viewer.id &&
    isBansheeV7(view, unit) &&
    isLivingOwnerV7(view, view.viewer.id)
  );
}

/** Revision 19: naval and embarked units are afloat; an Egg is not. */
function isAfloatV7(unit: PublicUnitV7): boolean {
  return unit.form === "NAVAL" || unit.form === "EMBARKED";
}

function publicProjectsZocForThreatV7(
  view: PlayerViewV7,
  projector: PublicUnitV7,
  target: PublicUnitV7,
  tile: PlayerViewV7["board"]["tiles"][number],
): boolean {
  // Revision 19: an Egg projects no zone of control.
  if (projector.form === "EGG") return false;
  if (!tile.explored) return true;
  if (tile.biome !== null) return projector.form !== "NAVAL";
  if (projector.form === "NAVAL") return true;
  const rule = unitRoleRuleV7(view, projector);
  return (
    target.form !== "LAND" &&
    rule.abilities.includes("ATTACK") &&
    rule.minimumRange <= 1 &&
    rule.range >= 1
  );
}

function publicRoadNodeForOwner(
  tile: PlayerViewV7["board"]["tiles"][number],
  ownerId: PlayerId,
  lookup: PublicThreatLookupV7,
): boolean {
  if (!tile.explored || tile.biome === null) return false;
  const road =
    tile.road &&
    (tile.territoryOwnerId === null || tile.territoryOwnerId === ownerId);
  const city = (lookup.cityOwnersByKey.get(coordKey(tile.at)) ?? []).includes(
    ownerId,
  );
  return road || city;
}

function publicMovementTilePossible(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  tile: PlayerViewV7["board"]["tiles"][number],
  lookup: PublicThreatLookupV7,
): boolean {
  if (!tile.explored) return false;
  if (
    tile.territoryOwnerId !== null &&
    tile.territoryOwnerId !== unit.ownerId &&
    publicPlayersAllied(view, unit.ownerId, tile.territoryOwnerId)
  )
    return false;
  // The frozen sea (`pulp_wars-5ti.3`): known ice is ground for a land-form
  // unit and closed to a unit afloat.
  const ice = isIceAtV7(view, tile.at);
  if (unit.form === "LAND") {
    if (ice) return true;
    // The Martian revision: a walker or flyer enters a Mountain without
    // Engineering and crosses Shallow Water (Deep Water needs its owner's
    // private Navigation, so the estimate leaves it out).
    // The Rift (RULESET_7_RIFT.md section 4): flyers only.
    const mode = unitMovementModeV7(view, unit);
    if (mode !== "GROUND")
      return (
        (tile.biome !== null && (tile.terrain !== "RIFT" || mode === "FLY")) ||
        tile.terrain === "SHALLOW_WATER"
      );
    // The shared terrain-entry rule for a ground unit; the Ice Folk
    // revision: a Mountain-born unit enters a Mountain without Engineering.
    return (
      tile.biome !== null &&
      tile.terrain !== "RIFT" &&
      (tile.terrain !== "MOUNTAIN" ||
        unitMayEnterMountainV7(
          view,
          unit,
          lookup.engineeringOwnerIds.has(unit.ownerId),
          "GROUND",
        ))
    );
  }
  return tile.biome === null && !ice;
}

/**
 * The Martian revision: whether a walker or flyer can end a Move (and so
 * attack) on `tile`: land only (a Move that ends on water embarks), and a
 * flyer never on a settlement center it does not own.
 */
function machineMayEndForThreatV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  tile: PlayerViewV7["board"]["tiles"][number],
  mode: "GROUND" | "STRIDE" | "FLY",
): boolean {
  if (!tile.explored || tile.biome === null) return false;
  // The Rift (RULESET_7_RIFT.md section 4): only a flyer ends on a Rift.
  if (tile.terrain === "RIFT") return mode === "FLY";
  if (mode !== "FLY" || tile.site === null) return true;
  return view.cities.some(
    (city) => same(city.at, tile.at) && city.ownerId === unit.ownerId,
  );
}

function isPolicyCandidate(
  context: PolicyContextV7,
  command: CommandV7,
): boolean {
  if (command.kind === "WAIT") return false;
  // The giants' signatures engine (`pulp_wars-w49.30`,
  // RULESET_7_GIANTS.md section 8): until the AI bead (`pulp_wars-w49.31`)
  // the policy uses none of the four new commands; its giants keep
  // attacking (Crushing Shove, Overstride, Glacial Smash, and the Siege
  // Hammer act through the ordinary Move and Attack).
  if (
    command.kind === "SWALLOW" ||
    command.kind === "TOSS" ||
    command.kind === "STOMP" ||
    command.kind === "BREAK_OFF"
  )
    return false;
  // The frozen sea engine (`pulp_wars-5ti.3`, RULESET_7_NAVAL_BRANCH.md
  // section 17): until the ice plan of `pulp_wars-5ti.5` the policy Freezes
  // nothing. The command is offered only to an Ice Folk seat with Rime.
  if (command.kind === "FREEZE") return false;
  // The Candy revision (`pulp_wars-jdb.4`, RULESET_7_CANDY.md section 14):
  // a Rush only with a plan, and the one Re-bake and the one Toss per unit
  // the Candy rules chose (their scores reject the others). With a group
  // switched off the policy never asks for its command, like the ordinary
  // policy of `pulp_wars-jdb.3`. These commands are offered only in a match
  // with a Candy seat.
  if (command.kind === "SUGAR_RUSH")
    return candyRushPlanV7(context, command.unitId) !== null;
  if (command.kind === "REBAKE")
    return (
      candyPolicyOptionsV7().rebake &&
      candyUnitPlayV7(context, context.lookup.unitsById.get(command.unitId))
    );
  if (command.kind === "SUGAR_TOSS")
    return (
      candyPolicyOptionsV7().sugarToss &&
      candyUnitPlayV7(context, context.lookup.unitsById.get(command.unitId))
    );
  // The Dwarf revision (`pulp_wars-78i.4`): the large Tunnel, bombing-run,
  // and Assemble offer lists are pruned to the one command per unit the
  // Dwarf plans chose (without the Dwarf rules they score as no candidate).
  if (
    (command.kind === "TUNNEL" ||
      command.kind === "BOMB_RUN" ||
      command.kind === "ASSEMBLE") &&
    dwarfUnitPlayV7(context, context.lookup.unitsById.get(command.unitId))
  )
    return dwarfPlannedCommandV7(context, command) === command;
  if (command.kind === "BUILD_ROAD") {
    const corridor = context.tactical.roadCorridor;
    return (
      corridor !== null && corridor.missingRoadKeys[0] === coordKey(command.at)
    );
  }
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    leavesSoleThreatenedDefender(context, command) &&
    !defenderActionException(context, command) &&
    // Tuning 5 (`pulp_wars-w49.4`): the step beside the center that lets
    // the city train is no desertion; the trained unit takes the center.
    !armyStepsAsideToTrainV7(context, command) &&
    // The Undead pass, correction: nor the garrison swap.
    !armySwapsOutV7(context, command)
  )
    return false;
  // Tuning 5 (`pulp_wars-w49.4`): the garrison of a center stays.
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    armyGarrisonHoldsV7(context, command) &&
    !armySwapsOutV7(context, command)
  )
    return false;
  // The Undead pass, correction (`pulp_wars-w49.13`): villages first; a
  // Zombie moves with company; the shots before the melee on a biter.
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    (armyVillagesFirstHoldsV7(context, command) ||
      armyShootsBiterFirstV7(context, command))
  )
    return false;
  if (command.kind === "MOVE") {
    const zombie = context.lookup.unitsById.get(command.unitId);
    const end = command.path.at(-1);
    if (
      zombie !== undefined &&
      end !== undefined &&
      armyZombieV7(context, zombie) &&
      !armyVillageMoveV7(context, zombie, end)
    ) {
      const danger = visibleImmediateDamage(context.view, zombie, end, context);
      // A step that raises the damage it can take, or that puts more
      // hostile land units beside it.
      const beside = (at: CoordV7): number =>
        armyHostilesV7(context).filter((unit) => distance(unit.at, at) === 1)
          .length;
      if (
        (danger >
          visibleImmediateDamage(context.view, zombie, zombie.at, context) ||
          beside(end) > beside(zombie.at)) &&
        armyZombieAloneV7(context, zombie, end, danger)
      )
        return false;
    }
  }
  // Tuning 7 (`pulp_wars-w49.10`): the fast units wait for the infantry.
  if (command.kind === "MOVE") {
    const mover = context.lookup.unitsById.get(command.unitId);
    const end = command.path.at(-1);
    if (
      mover !== undefined &&
      end !== undefined &&
      armyHoldsFastV7(context, mover, end)
    )
      return false;
  }
  // Step two of the Goblin pass (`pulp_wars-w49.23`): a Goblin goes into
  // contact with company.
  if (command.kind === "MOVE" && armyGoblinContactHeldV7(context, command))
    return false;
  // Step two of the Dinosaur pass (`pulp_wars-w49.26`): and a Caveman or a
  // Raptor.
  if (command.kind === "MOVE" && armyDinosaurContactHeldV7(context, command))
    return false;
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): a Snow Hunter or a
  // Boulder Yeti does not walk out in front of its line. Step two of the
  // Dwarf pass (`pulp_wars-w49.28`): nor does a Clockwork Gunner.
  if (command.kind === "MOVE" && armyIceFolkShooterHeldV7(context, command))
    return false;
  // Tuning 6 (`pulp_wars-w49.6`): so does a unit on a village it will
  // capture next turn.
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    armyHoldsVillageV7(context, command)
  )
    return false;
  // Tuning 8 (`pulp_wars-w49.11`): and a capturer on a hostile center; a
  // stormer keeps its Move for the center the shots are emptying.
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    armyHoldsCenterV7(context, command)
  )
    return false;
  // The Dinosaur pass, correction: a Dinosaur seat's garrison under a fast
  // unit's eye, and its Triceratops without support.
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    armyDinosaurKeepsCenterV7(context, command)
  )
    return false;
  if (command.kind === "MOVE" && armyChargeHeldV7(context, command))
    return false;
  if (armyStormWaitsV7(context, command)) return false;
  // Correction pass: nor does a unit step onto a hostile center under a
  // battery that kills it there before it can capture.
  if (command.kind === "MOVE" && context.army) {
    const mover = context.lookup.unitsById.get(command.unitId);
    const end = command.path.at(-1);
    const goal =
      end === undefined
        ? undefined
        : context.lookup.citiesByKey.get(coordKey(end));
    if (
      mover !== undefined &&
      end !== undefined &&
      goal !== undefined &&
      mover.form === "LAND" &&
      isHostile(context.view, goal.ownerId) &&
      armyCenterDeadlyV7(context, mover, end)
    )
      return false;
  }
  // (Nor does it kill the garrison hand to hand and advance onto it.)
  if (command.kind === "ATTACK" && context.army) {
    const attacker = context.lookup.unitsById.get(command.unitId);
    const victim = context.lookup.unitsById.get(command.targetUnitId);
    const goal =
      victim === undefined
        ? undefined
        : context.lookup.citiesByKey.get(coordKey(victim.at));
    if (
      attacker !== undefined &&
      victim !== undefined &&
      goal !== undefined &&
      attacker.form === "LAND" &&
      isHostile(context.view, goal.ownerId) &&
      distance(attacker.at, victim.at) <= 1 &&
      armyCenterDeadlyV7(context, attacker, victim.at) &&
      queryCombatPreviewV7(context.view, command.unitId, command.targetUnitId)
        ?.advances === true
    )
      return false;
  }
  // Map curiosities (`pulp_wars-737.4`): the Spider and the Fountain.
  if (context.curiosities !== null && curiosityRejectsV7(context, command))
    return false;
  if (command.kind === "MOVE") {
    const actor = context.lookup.unitsById.get(command.unitId);
    const objective = context.tactical.objectiveByUnitId.get(command.unitId);
    const to = command.path.at(-1);
    if (
      actor !== undefined &&
      objective !== undefined &&
      to !== undefined &&
      // Revision 20: a Triceratops is a line unit, not a siege unit.
      policySiegeRuleV7(unitRoleRuleV7(context.view, actor)) &&
      distance(to, objective) >= 2 &&
      distance(to, objective) <= 3 &&
      !hasReachableScreenAtV7(context, actor, to) &&
      !endgameSiegeTileV7(context, actor, to) &&
      !chokepointSiegeSlotV7(context, actor, to)
    )
      return false;
    // pulp_wars-68k.6: the corridor of a single-file front.
    if (chokepointMoveRejectedV7(context, command)) return false;
  }
  // pulp_wars-68k.6: the fire on a single-file front goes to one holder.
  if (command.kind === "ATTACK" && chokepointOffFocusV7(context, command))
    return false;
  // Step two of the Goblin pass (`pulp_wars-w49.23`): the helpers first.
  if (command.kind === "ATTACK" && goblinMobWaitsV7(context, command))
    return false;
  // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the Stegosaurus,
  // then the dinosaurs, then the Cavemen.
  if (command.kind === "ATTACK" && dinosaurPackWaitsV7(context, command))
    return false;
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the Bolas, then the
  // shots from two tiles, then the blows that shatter.
  if (command.kind === "ATTACK" && iceFolkShatterWaitsV7(context, command))
    return false;
  if (command.kind === "ATTACK" && isLowValueAttackV7(context, command)) {
    // pulp_wars-9s0.8: a hunter's share of a planned kill is not low value.
    const hunt = huntOfV7(context, command.unitId);
    if (hunt?.target.id !== command.targetUnitId) {
      // Tuning 6 (`pulp_wars-w49.6`): nor is the attack of a committed
      // unit, or one on a unit standing on an own center.
      if (!armyCommitAttackV7(context, command)) return false;
    } else if (hunt.army) {
      // Tuning 5: an army plan excuses a poor exchange, never an attack a
      // faction rule rejects (friendly bomb splash, a fed Zombie, ...).
      const preview = queryCombatPreviewV7(
        context.view,
        command.unitId,
        command.targetUnitId,
      );
      const actor = context.lookup.unitsById.get(command.unitId);
      if (
        preview === null ||
        actor === undefined ||
        attackFactionRejectedV7(context, command, actor, preview)
      )
        return false;
    }
  }
  const autoembark = isAutoembarkMoveV7(context, command);
  if (autoembark && !context.naval.active) return false;
  // pulp_wars-ykw.7: the mirror of the endgame landing below: a capturer
  // that can walk to an endgame target does not board. Without it a unit
  // boarded to explore, was landed again for the endgame beside the tile it
  // had left, and boarded again, turn after turn.
  if (autoembark && endgameKeepsAshoreV7(context, command.unitId)) return false;
  // pulp_wars-9s0.1: a unit with a job it can walk to does not board.
  if (
    autoembark &&
    context.tactical.campaign?.assignmentByUnitId.has(command.unitId) === true
  )
    return false;
  if (autoembark && context.undead && fragileCargoV7(context, command.unitId))
    return false;
  if (command.kind === "DISEMBARK" && context.naval.active)
    return (
      context.naval.landing.some((at) => same(at, command.at)) ||
      endgameLandingValueV7(context, command) > 0 ||
      (strandedTransportV7(context, command.unitId) &&
        campaignHasWorkAtV7(context.tactical.campaign, command.at))
    );
  if (autoembark && context.naval.retainLandedUnitIds.has(command.unitId))
    return false;
  if (
    autoembark &&
    context.naval.visibleNavalDanger &&
    !context.view.units.some(
      (unit) =>
        unit.ownerId === context.view.viewer.id && unit.role === "PATROL_BOAT",
    )
  )
    return false;
  if (
    command.kind === "BUILD_PORT" &&
    context.naval.active &&
    context.view.naval.ownedPorts.every((port) => port.status !== "ACTIVE")
  ) {
    const reserved = reservedPortCommandV7(context);
    return reserved !== null && same(reserved.at, command.at);
  }
  if (command.kind === "RESEARCH" && context.naval.active) {
    const required = nextNavalTechnologyV7(context);
    const cost = queryTechnologyTreeV7(context.view).nodes.find(
      (node) => node.id === command.tech,
    )?.cost;
    if (
      command.tech !== required &&
      cost !== undefined &&
      context.view.viewer.coins - cost < context.naval.reserveCoins
    )
      return false;
  }
  // Tuning 5 (`pulp_wars-w49.4`): research toward the army's next role
  // first.
  if (
    command.kind === "RESEARCH" &&
    !normalOpeningResearchPendingV7(context.view) &&
    armyResearchHoldsV7(context, command.tech)
  )
    return false;
  // Tuning 6 (`pulp_wars-w49.6`): no research with an enemy at the gates
  // while a city can still train.
  if (
    command.kind === "RESEARCH" &&
    !normalOpeningResearchPendingV7(context.view) &&
    (armyWarV7(context)
      ? // Tuning 7 (`pulp_wars-w49.10`): in the field, units and growth
        // first; the one step to a missing unit class is the exception.
        armyWarHoldsResearchV7(context, command.tech)
      : armyPressedV7(context))
  )
    return false;
  // Tuning 6: no training onto a center under two or more hostile ranged
  // units while another city can train.
  if (
    armyProductionV7(command) &&
    armyTrainsElsewhereV7(context, command.cityId)
  )
    return false;
  // Correction pass: no Bomb Chucker as the garrison of a contested center
  // while another unit can be trained there.
  if (
    command.kind === "TRAIN" &&
    armyHelplessGarrisonV7(context, command.cityId, command.role)
  )
    return false;
  // Tuning 8 (`pulp_wars-w49.11`): the Coins kept for the due technology.
  if (armyProductionV7(command) && armyFloorHoldsTrainingV7(context, command))
    return false;
  // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): nor is a Field
  // Defense built out of them (`armyFieldDefenseHeldV7`).
  if (command.kind === "BUILD_FIELD_DEFENSE" && armyFieldDefenseHeldV7(context))
    return false;
  // The Dinosaur pass, correction: no eighth Ankylosaurus before growth.
  if (armyProductionV7(command) && armyDinosaurDefenderHeldV7(context, command))
    return false;
  // The Undead pass (`pulp_wars-w49.13`): the Coins kept for the dear unit
  // the army is short of (`armyDearUnitFloorV7`).
  if (
    armyProductionV7(command) &&
    context.view.viewer.coins - trainingCostV7(context.view, command) <
      armyDearUnitFloorV7(context, command.cityId)
  )
    return false;
  // pulp_wars-9s0.8: the savings plan holds research it cannot spare.
  if (
    command.kind === "RESEARCH" &&
    !normalOpeningResearchPendingV7(context.view) &&
    savingsHoldsV7(
      context,
      command,
      queryTechnologyTreeV7(context.view).nodes.find(
        (node) => node.id === command.tech,
      )?.cost ?? 0,
    )
  )
    return false;
  if (
    command.kind === "TRAIN" ||
    command.kind === "TRAIN_NAVAL" ||
    command.kind === "LAND_GRANT" ||
    command.kind === "LAY_EGG"
  )
    return preferredSharedCityActionV7(context, command.cityId) === command;
  // Tuning 3 (`pulp_wars-w49.3`): the Normal AI does not hire, and it
  // blasts a Mountain only as the economic action it was: in its own
  // territory, when the blast would hit none of its own or allied units.
  if (command.kind === "HIRE") return false;
  if (command.kind === "BLAST_MOUNTAIN") {
    const tile = findPublicTileV7(context.view, command.at);
    const blast = previewBlastMountainV7(context.view, command.at);
    if (
      tile?.explored !== true ||
      blast === null ||
      blast.totals.friendlyDamage > 0 ||
      (tile.territoryOwnerId !== context.view.viewer.id &&
        !chokepointBlastV7(context, command.at, blast.totals.hostileDamage))
    )
      return false;
  }
  // Revision 19: Hatch is scored by its public preview.
  if (command.kind === "HATCH") return true;
  if (command.kind === "CHOOSE_CITY_REWARD")
    return preferredReward(context, command) === command.reward;
  if (command.kind === "REDEVELOP") {
    // Public economic planning intentionally values placements without current
    // technology, Coin, or offer gates. Preserve established one-per-city
    // buildings rather than demolishing one for a speculative replacement and
    // rebuilding the same legal fallback. Ports retain their direct upgrade.
    if (preservesEstablishedImprovementV7(context.view, command.at))
      return false;
    if (
      context.redevelopmentMayChangeImprovement.get(coordKey(command.at)) ===
      false
    )
      return false;
    return (
      scorePublicSpatialPlanV7(context.view, command) > 0 &&
      queryPublicRedevelopmentChangesImprovementV7(context.view, {
        kind: "REDEVELOP",
        at: command.at,
      }) &&
      // pulp_wars-9s0.9: the plan's replacement must be buildable now.
      redevelopmentReplacementBuildableV7(context.view, command.at)
    );
  }
  // pulp_wars-9s0.9: never fill a target the plan reserves for a different
  // improvement the viewer can already build (the rebuild half of a
  // Redevelop/rebuild cycle).
  if (fillsReservedTargetV7(context.view, command)) return false;
  if (command.kind === "DISBAND") {
    // Revision 19: an Egg is abandoned only to free capacity in an emergency.
    const disbanded = context.lookup.unitsById.get(command.unitId);
    if (disbanded?.form === "EGG")
      return eggAbandonEmergencyV7(context, disbanded);
    // Correction pass (`pulp_wars-w49.11`): an army seat never disbands a
    // unit that stands next to an enemy unit or an enemy center (a 7-HP
    // Guard beside the player's capital was disbanded in the middle of
    // the assault).
    if (
      context.army &&
      disbanded !== undefined &&
      (context.view.units.some(
        (unit) =>
          isHostile(context.view, unit.ownerId) &&
          distance(unit.at, disbanded.at) <= 1,
      ) ||
        context.view.cities.some(
          (city) =>
            isHostile(context.view, city.ownerId) &&
            distance(city.at, disbanded.at) <= 1,
        ))
    )
      return false;
    return usefulDisband(context, command as DisbandCommandV7);
  }
  const economic = previewEconomicV7(context.view, command);
  // pulp_wars-9s0.8: the savings plan holds construction it cannot spare
  // (never a city level-up or the opening growth harvest).
  if (
    economic.ok &&
    economic.preview.levelsReached.length === 0 &&
    !openingGrowthHarvestV7(context.view, command) &&
    // Tuning 6 (`pulp_wars-w49.6`): nor the growth that costs at most 2
    // Coins per population.
    !(context.army && armyCheapGrowthV7(economic.preview)) &&
    // Tuning 7: nor the growth of a seat at its unit limit.
    !(
      context.army &&
      armyAtLimitV7(context) &&
      sum(economic.preview.populationDeltaByCity.map((item) => item.delta)) > 0
    ) &&
    savingsHoldsV7(context, command, economic.preview.cost)
  )
    return false;
  // Tuning 6: no construction with an enemy at the gates while a city can
  // still train (what costs nothing is still taken).
  if (
    economic.ok &&
    economic.preview.cost > 0 &&
    armyPressedV7(context) &&
    !armyWarGrowthBuysV7(context, economic.preview)
  )
    return false;
  // Tuning 8: nor with the Coins kept for the due technology (a city
  // level is still bought).
  if (
    economic.ok &&
    economic.preview.cost > 0 &&
    economic.preview.levelsReached.length === 0 &&
    context.army &&
    // Step two of the Martian pass (`pulp_wars-w49.25`): nor the opening
    // growth harvest of the level-1 capital (as for the savings plan,
    // above). A Martian seat whose first target is its growth technology
    // (`armyUndeadGrowthFirstV7`) kept its 5 Coins for it in round 1 and
    // harvested nothing; the two harvests are its city level and its
    // free Saucer.
    !openingGrowthHarvestV7(context.view, command) &&
    context.view.viewer.coins - economic.preview.cost <
      armyResearchFloorV7(context)
  )
    return false;
  if (
    context.naval.active &&
    economic.ok &&
    economic.preview.cost > 0 &&
    context.view.viewer.coins - economic.preview.cost <
      context.naval.reserveCoins &&
    command.kind !== "BUILD_PORT" &&
    command.kind !== "GATHER_PEARLS" &&
    // Revision 16 (section 3.6 rule 2): the naval Coin reserve never holds
    // back a growth harvest of the level-1 original capital.
    !openingGrowthHarvestV7(context.view, command)
  )
    return false;
  return true;
}

/**
 * Limit expensive public spatial planning to commands which can reach policy
 * scoring. These two exclusions are unconditional once the public tactical
 * corridor is known; the original ready list remains the scoring substrate.
 */
function isPlanningCandidateV7(
  context: PolicyContextV7,
  command: CommandV7,
): boolean {
  const nextRoadKey = context.tactical.roadCorridor?.missingRoadKeys[0] ?? null;
  if (command.kind === "BUILD_ROAD")
    return nextRoadKey !== null && coordKey(command.at) === nextRoadKey;
  if (command.kind === "REDEVELOP")
    return (
      !preservesEstablishedImprovementV7(context.view, command.at) &&
      context.redevelopmentMayChangeImprovement.get(coordKey(command.at)) !==
        false
    );
  return true;
}

/**
 * pulp_wars-9s0.9: the improvement a building command places, or null for a
 * command that places none (harvests, terrain changes, Roads, and the rest).
 */
function builtImprovementV7(command: CommandV7): ImprovementIdV7 | null {
  if (command.kind === "BUILD_MONUMENT") return "MONUMENT";
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[command.kind as BasicEconomicCommandKindV7];
  if (basic !== undefined) return basic.improvement;
  return (
    SPATIAL_ECONOMIC_ACTIONS_V7[command.kind as SpatialEconomicCommandKindV7]
      ?.improvement ?? null
  );
}

/**
 * pulp_wars-9s0.9: whether the viewer has the technology for a planned
 * placement and, when `coins` is set, the Coins for it. The public plan
 * ignores both gates; a Monument is offered to it only with an unspent
 * entitlement and costs nothing.
 */
function plannedImprovementBuildableV7(
  view: PlayerViewV7,
  planned: PublicPlannedImprovementV7,
  coins: boolean,
): boolean {
  if (planned.kind === "BUILD_MONUMENT") return true;
  const rule =
    BASIC_ECONOMIC_ACTIONS_V7[planned.kind as BasicEconomicCommandKindV7] ??
    SPATIAL_ECONOMIC_ACTIONS_V7[planned.kind as SpatialEconomicCommandKindV7];
  if (rule === undefined) return false;
  if (!view.viewer.researchedTechs.includes(rule.technology)) return false;
  return !coins || view.viewer.coins >= rule.cost;
}

/**
 * pulp_wars-9s0.9 (root cause of the Redevelop/rebuild cycle): a Redevelop's
 * positive future value comes from the plan's best replacement at the
 * target, which ignores technology and Coin gates. When that replacement
 * cannot be built now, the only legal follow-up is the old fallback (the
 * same Lumber Camp, Farm, or Mine), which restores the identical board, so
 * the Redevelop scored positive again on every repetition. A Redevelop is
 * therefore taken only when its replacement is researched and affordable
 * (Redevelop itself is free).
 */
function redevelopmentReplacementBuildableV7(
  view: PlayerViewV7,
  at: CoordV7,
): boolean {
  const planned = queryPublicPlannedImprovementV7(view, at, "AFTER_REDEVELOP");
  return planned !== null && plannedImprovementBuildableV7(view, planned, true);
}

/**
 * pulp_wars-9s0.9 (the undo/redo guard): a build is not a candidate when it
 * consumes the plan's reservation (negative future value) at a target the
 * plan reserves for a different improvement whose technology the viewer
 * already has. This is the same plan and target a Redevelop of the result
 * would read, so after a Redevelop the policy builds the planned replacement
 * or leaves the target empty; it never rebuilds what it just removed.
 */
function fillsReservedTargetV7(
  view: PlayerViewV7,
  command: CommandV7,
): boolean {
  if (!("at" in command)) return false;
  const built = builtImprovementV7(command);
  if (built === null) return false;
  if (scorePublicSpatialPlanV7(view, command) >= 0) return false;
  const planned = queryPublicPlannedImprovementV7(view, command.at, "CURRENT");
  return (
    planned !== null &&
    planned.improvement !== built &&
    plannedImprovementBuildableV7(view, planned, false)
  );
}

function preservesEstablishedImprovementV7(
  view: PlayerViewV7,
  at: CoordV7,
): boolean {
  const tile = tileAtPublicV7(view, at);
  const current = tile.explored ? tile.improvement : null;
  return (
    current !== null && PRESERVED_REDEVELOPMENT_IMPROVEMENTS_V7.has(current)
  );
}

/**
 * The attacks a faction's own rule rejects whatever the exchange: one that
 * feeds a Zombie, exposes a Vampire, splashes own units with a bomb, and
 * the Dinosaur, Martian, and Ice Folk rejections.
 */
function attackFactionRejectedV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): boolean {
  if (context.undead && feedsZombieV7(context, command, preview)) return true;
  if (
    context.undead &&
    vampireAttackExposedV7(context, command, actor, preview)
  )
    return true;
  if (context.goblin && goblinFriendlyFireRejectedV7(context, command, preview))
    return true;
  if (
    context.dinosaur &&
    dinosaurAttackRejectedV7(context, command, actor, preview)
  )
    return true;
  if (
    context.martian &&
    martianAttackRejectedV7(context, command, actor, preview)
  )
    return true;
  return (
    context.iceFolk && iceFolkAttackRejectedV7(context, command, actor, preview)
  );
}

function isLowValueAttackV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): boolean {
  const preview = queryCombatPreviewV7(
    context.view,
    command.unitId,
    command.targetUnitId,
  );
  const actor = context.lookup.unitsById.get(command.unitId);
  if (preview === null || actor === undefined) return true;
  if (attackFactionRejectedV7(context, command, actor, preview)) return true;
  const immediate =
    combatImmediateValue(preview, context.view) +
    (context.undead ? biteHarmAdjustmentV7(context, actor, preview) : 0);
  const harmful =
    (!preview.defenderDies && preview.attackerDies) ||
    (!preview.defenderDies && immediate <= 0);
  if (!harmful) return false;
  if (attackPurposeExceptionV7(context, command, preview)) return false;
  if (endgameCombinedKillV7(context, command, preview)) return false;
  // pulp_wars-68k.6: the head of a single-file front commits.
  if (chokepointCommitV7(context, command, preview)) return false;
  // The Martian revision: a hit that this turn's attacks complete into a
  // kill through the target's Shield.
  if (
    context.martian &&
    !preview.attackerDies &&
    martianShieldBreakExceptionV7(
      context,
      context.lookup.unitsById.get(command.targetUnitId),
      preview,
    )
  )
    return false;
  // The Ice Folk revision: a hit on a hostile Witch that this turn's attacks
  // complete into her death.
  if (
    context.iceFolk &&
    !preview.attackerDies &&
    iceFolkWitchFocusV7(
      context,
      context.lookup.unitsById.get(command.targetUnitId),
    )
  )
    return false;
  return true;
}

/**
 * Revision 13 Infect: an attack whose retaliation kills and infects the
 * attacker feeds the enemy a Zombie. Only a proven city save or a lethal
 * follow-up this turn excuses it (the sacrifice value exception does not).
 */
function feedsZombieV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): boolean {
  if (!preview.attackerInfected) return false;
  const facts = attackPurposeFactsV7(context, command, preview);
  return (
    !facts.savesCity &&
    !facts.opensLethalFollowUp &&
    !endgameCombinedKillV7(context, command, preview)
  );
}

/**
 * Revision 13 Infect exposure: a melee chip on a Zombie that leaves the
 * attacker where the wounded Zombie kills (and infects) it next turn. It is
 * penalized rather than forbidden, so sieges can still grind a Zombie down.
 */
function zombieChipExposureV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): boolean {
  if (
    preview.defenderDies ||
    preview.attackerDies ||
    actor.form !== "LAND" ||
    distance(actor.at, target.at) !== 1 ||
    !isZombieV7(context.view, target)
  )
    return false;
  const zombie = { ...target, hp: target.hp - preview.damageToDefender };
  const wounded = {
    ...actor,
    hp: Math.min(
      actor.maxHp,
      actor.hp - preview.damageToAttacker + preview.attackerHeal,
    ),
  };
  return (
    publicProjectedDamageWithLookupV7(
      context.view,
      zombie,
      wounded,
      actor.at,
      {},
      context.lookup,
    ) >= wounded.hp
  );
}

/**
 * Revision 13 attack adjustments, applied only in a match with an Undead
 * seat: Infect risings, ranged fire at Zombies, and Graves that feed a
 * Necromancer (own: good; hostile: bad unless an advance occupies the Grave).
 */
function undeadAttackValueV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): number {
  const view = context.view;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined) return 0;
  let value = 0;
  if (preview.defenderInfected) value += INFECT_RISING_VALUE_V7;
  if (preview.attackerInfected) value -= INFECT_RISING_VALUE_V7;
  if (isZombieV7(view, target) && distance(actor.at, target.at) >= 2)
    value += 6;
  if (zombieChipExposureV7(context, actor, target, preview))
    value -= INFECT_RISING_VALUE_V7;
  const undeadViewer = view.viewer.faction === "UNDEAD";
  const afflictions = context.afflictions;
  // Revision 14 Bitten: a new bite on a hostile unit may later rise for us;
  // our attacker bitten by a surviving Zombie may later rise for the enemy.
  if (
    preview.defenderBitten &&
    isNewBiteV7(afflictions, target.id, actor.ownerId)
  )
    value +=
      BITE_VALUE_V7 +
      Math.floor(targetStrategicValue(view, target.id, context.lookup) / 5);
  if (
    preview.attackerBitten &&
    isNewBiteV7(afflictions, actor.id, target.ownerId)
  )
    value -= biteExposureCostV7(context, actor);
  if (preview.defenderBittenRises)
    value += bittenRisingValueV7(context, afflictions.bitten.get(target.id));
  if (preview.attackerBittenRises)
    value += bittenRisingValueV7(context, afflictions.bitten.get(actor.id));
  for (const splash of preview.splash) {
    const unit = context.lookup.unitsById.get(splash.unitId);
    if (splash.dies && unit?.form === "LAND")
      value += bittenRisingValueV7(context, afflictions.bitten.get(unit.id));
  }
  // Revision 14 Plague: victims plus their healthy living neighbours.
  value += plagueApplicationValueV7(
    view,
    afflictions,
    preview.plagued,
    (owner) => isHostile(view, owner),
  ).value;
  if (
    preview.defenderDies &&
    !preview.defenderInfected &&
    !preview.defenderBittenRises &&
    !preview.advances &&
    publicDeathLeavesGraveV7(view, target)
  ) {
    if (undeadViewer && ownNecromancersNearV7(view, target.at).length > 0)
      value += 6;
    if (
      hostileNecromancersNearV7(view, target.at, (owner) =>
        isHostile(view, owner),
      ).some((unit) => unit.id !== target.id)
    )
      value -= 6;
  }
  if (undeadViewer)
    for (const splash of preview.splash) {
      const unit = context.lookup.unitsById.get(splash.unitId);
      if (
        splash.dies &&
        unit !== undefined &&
        !afflictions.bitten.has(unit.id) &&
        publicDeathLeavesGraveV7(view, unit)
      )
        value += 4;
    }
  return value;
}

/**
 * Revision 14 Bitten rising for a death whose recorded biter is `biter`: a
 * Zombie for the viewer or an ally is worth an Infect rising; one for a
 * hostile player costs as much.
 */
function bittenRisingValueV7(
  context: PolicyContextV7,
  biter: PlayerId | undefined,
): number {
  if (biter === undefined) return 0;
  return isHostile(context.view, biter)
    ? -BITTEN_RISING_VALUE_V7
    : BITTEN_RISING_VALUE_V7;
}

/**
 * Revision 14: a living attacker that survives a Zombie's retaliation is
 * bitten; if it later dies it rises for the enemy. Costlier for valuable
 * units; halved when an own Captain within 3 tiles can cure it.
 */
function biteExposureCostV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): number {
  const view = context.view;
  const cost = 8 + Math.floor(retainedUnitValue(view, actor) / 4);
  const curable = view.units.some(
    (unit) =>
      unit.ownerId === actor.ownerId &&
      unit.id !== actor.id &&
      distance(unit.at, actor.at) <= 3 &&
      unitRoleRuleV7(view, unit).abilities.includes("TEND_WOUNDED"),
  );
  return curable ? Math.floor(cost / 2) : cost;
}

/**
 * Revision 14 harm test adjustment (Undead matches): a Zombie's new bite
 * makes a trading attack worthwhile; a living attacker that would be bitten
 * by a chip on a Zombie needs to deal more to justify it.
 */
function biteHarmAdjustmentV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): number {
  if (preview.defenderDies || preview.attackerDies) return 0;
  const afflictions = context.afflictions;
  let adjustment = 0;
  if (
    preview.defenderBitten &&
    isNewBiteV7(afflictions, preview.targetUnitId, actor.ownerId)
  )
    adjustment += 2 * BITE_VALUE_V7;
  const target = context.lookup.unitsById.get(preview.targetUnitId);
  if (
    preview.attackerBitten &&
    target !== undefined &&
    isNewBiteV7(afflictions, actor.id, target.ownerId)
  )
    adjustment -= 2 * biteExposureCostV7(context, actor);
  return adjustment;
}

/** A 12-HP Zombie rising: Zombie cost 3 x 4 + 12 HP (10 HP and 22 until 7r56). */
const INFECT_RISING_VALUE_V7 = 24;

function attackPurposeExceptionV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): boolean {
  const facts = attackPurposeFactsV7(context, command, preview);
  return facts.savesCity || facts.opensLethalFollowUp || facts.higherResult;
}

export interface AttackPurposeFactsV7 {
  readonly savesCity: boolean;
  readonly opensLethalFollowUp: boolean;
  readonly higherResult: boolean;
}

function attackPurposeFactsV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): AttackPurposeFactsV7 {
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined)
    return {
      savesCity: false,
      opensLethalFollowUp: false,
      higherResult: false,
    };
  const savesCity = context.threats.some((threat) => {
    if (threat.unitId !== target.id) return false;
    const city = context.lookup.citiesById.get(threat.cityId);
    const defender =
      city === undefined
        ? undefined
        : context.threatLookup.occupantsByKey
            .get(coordKey(city.at))
            ?.find((unit) => unit.ownerId === context.view.viewer.id);
    if (city === undefined || defender === undefined) return false;
    const before = publicProjectedDamageWithLookupV7(
      context.view,
      target,
      defender,
      city.at,
      { maximumCharge: true },
      context.lookup,
    );
    const wounded = {
      ...target,
      hp: Math.max(1, target.hp - preview.damageToDefender),
    };
    const after = publicProjectedDamageForPolicyV7(
      projectPublicUnitForPolicyV7(context.view, target.id, wounded),
      wounded,
      defender,
      city.at,
      { maximumCharge: true },
    );
    return before >= defender.hp && after < defender.hp;
  });
  const opensLethalFollowUp = hasLethalAttackFollowUpV7(
    context,
    command,
    preview,
  );
  const actor = context.lookup.unitsById.get(command.unitId);
  const realizedTargetLoss = Math.floor(
    (targetStrategicValue(context.view, target.id, context.lookup) *
      Math.min(target.hp, preview.damageToDefender)) /
      target.hp,
  );
  const higherResult =
    actor !== undefined &&
    realizedTargetLoss > retainedUnitValue(context.view, actor) &&
    preview.damageToDefender > preview.damageToAttacker;
  return { savesCity, opensLethalFollowUp, higherResult };
}

export function inspectNormalAttackPurposeV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): AttackPurposeFactsV7 {
  const commands = queryAiReadyCommandsV7(view).map((item) => item.command);
  const context = makeContext(view, commands);
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  return preview === null
    ? {
        savesCity: false,
        opensLethalFollowUp: false,
        higherResult: false,
      }
    : attackPurposeFactsV7(context, command, preview);
}

function hasLethalAttackFollowUpV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): boolean {
  if (preview.defenderDies || preview.damageToDefender <= 0) return false;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined || target.hp <= preview.damageToDefender)
    return false;
  const projectedUnits = projectPublicUnitForPolicyV7(context.view, target.id, {
    hp: target.hp - preview.damageToDefender,
  });
  // The Martian revision: the first hit also takes the Shield it absorbed.
  const projected =
    preview.defenderShieldDamage > 0
      ? {
          ...projectedUnits,
          shields: projectedUnits.shields.flatMap((entry) =>
            entry.unitId !== target.id
              ? [entry]
              : entry.shield - preview.defenderShieldDamage > 0
                ? [
                    {
                      ...entry,
                      shield: entry.shield - preview.defenderShieldDamage,
                    },
                  ]
                : [],
          ),
        }
      : projectedUnits;
  return context.commands.some((candidate) => {
    if (
      candidate.kind !== "ATTACK" ||
      candidate.unitId === command.unitId ||
      candidate.targetUnitId !== command.targetUnitId
    )
      return false;
    return (
      queryCombatPreviewV7(projected, candidate.unitId, candidate.targetUnitId)
        ?.defenderDies === true
    );
  });
}

function* sharedCityContextWorkV7(
  context: PolicyContextV7,
): Generator<void, void> {
  if (context.sharedCityContextPrepared) return;
  const { view } = context;
  const sharedByCity = new Map<CityId, SharedCityCommandV7[]>();
  const landByCity = new Map<CityId, LandProductionCommandV7[]>();
  const navalByCity = new Map<
    CityId,
    Extract<CommandV7, { kind: "TRAIN_NAVAL" }>[]
  >();
  // Revision 19: one `LAY_EGG` per city and role, on the nest tile with the
  // least visible hostile reach (matches without a Dinosaur seat offer none,
  // so they are unchanged).
  const chosenEggs = chosenLayEggCommandsV7(view, context.commands, (at) =>
    nestDangerV7(context, at),
  );
  for (const command of context.commands) {
    if (command.kind === "LAY_EGG" && !chosenEggs.has(command)) {
      yield;
      continue;
    }
    if (
      command.kind === "TRAIN" ||
      command.kind === "TRAIN_NAVAL" ||
      command.kind === "LAND_GRANT" ||
      command.kind === "LAY_EGG"
    ) {
      const shared = sharedByCity.get(command.cityId) ?? [];
      shared.push(command);
      sharedByCity.set(command.cityId, shared);
      if (command.kind === "TRAIN" || command.kind === "LAY_EGG") {
        const land = landByCity.get(command.cityId) ?? [];
        land.push(command);
        landByCity.set(command.cityId, land);
      } else if (command.kind === "TRAIN_NAVAL") {
        const naval = navalByCity.get(command.cityId) ?? [];
        naval.push(command);
        navalByCity.set(command.cityId, naval);
      }
    }
    yield;
  }
  if (sharedByCity.size === 0) {
    context.sharedCityContextPrepared = true;
    return;
  }

  const citiesById = new Map<CityId, PlayerViewV7["cities"][number]>();
  const cityIdByKey = new Map<string, CityId>();
  for (const city of view.cities) {
    citiesById.set(city.id, city);
    cityIdByKey.set(coordKey(city.at), city.id);
    yield;
  }
  const improvementByKey = new Map<string, ImprovementIdV7 | null>();
  const territoryCityByKey = new Map<string, CityId | null>();
  for (const tile of view.board.tiles) {
    if (tile.explored) {
      improvementByKey.set(coordKey(tile.at), tile.improvement);
      territoryCityByKey.set(coordKey(tile.at), tile.territoryCityId);
    }
    yield;
  }
  const forgeCities = new Set<CityId>();
  for (const value of view.improvementValues) {
    if (value.improvement === "FORGE" && value.level > 0) {
      const cityId = territoryCityByKey.get(coordKey(value.at));
      if (cityId !== undefined && cityId !== null) forgeCities.add(cityId);
    }
    yield;
  }

  const ownedRoleCounts = new Map<UnitRoleIdV7, number>();
  const assignedByCity = new Map<CityId, number>();
  const ownedAt = new Set<string>();
  const centerGuardByCity = new Map<CityId, PublicUnitV7>();
  let hasLandCaptureUnit = false;
  let patrolBoats = 0;
  let battleships = 0;
  // The naval branch (`pulp_wars-5ti.2`): Submarines count as naval units
  // for the two-ship cap; the plan itself never asks for one (`5ti.4`).
  let submarines = 0;
  let transports = 0;
  let defendedLanding = false;
  for (const unit of view.units) {
    if (unit.ownerId === view.viewer.id) {
      ownedRoleCounts.set(unit.role, (ownedRoleCounts.get(unit.role) ?? 0) + 1);
      ownedAt.add(coordKey(unit.at));
      // Revision 19 section 5.1: used capacity is a slot sum (every role
      // of a Human, Undead, or Goblin seat uses one slot).
      if (unit.homeCityId !== null)
        assignedByCity.set(
          unit.homeCityId,
          (assignedByCity.get(unit.homeCityId) ?? 0) +
            unitCapacitySlotsV7(view, unit),
        );
      if (
        unit.form === "LAND" &&
        unitRoleRuleV7(view, unit).abilities.includes("CAPTURE")
      )
        hasLandCaptureUnit = true;
      if (unit.role === "PATROL_BOAT") patrolBoats += 1;
      if (unit.role === "BATTLESHIP") battleships += 1;
      if (unit.role === "SUBMARINE") submarines += 1;
      if (unit.form === "EMBARKED") transports += 1;
      const cityId = cityIdByKey.get(coordKey(unit.at));
      if (
        cityId !== undefined &&
        !centerGuardByCity.has(cityId) &&
        unit.role === "GUARD" &&
        unit.hp * 4 >= unit.maxHp * 3
      )
        centerGuardByCity.set(cityId, unit);
    } else if (
      context.naval.target !== null &&
      isHostile(view, unit.ownerId) &&
      unit.form === "LAND" &&
      distance(unit.at, context.naval.target) <= 2
    )
      defendedLanding = true;
    yield;
  }
  const undeadTraining = !context.undead
    ? null
    : view.viewer.faction === "UNDEAD"
      ? undeadTrainingAdjustmentsV7(view)
      : view.viewer.faction === "GOBLIN"
        ? null
        : livingTrainingAdjustmentsV7(view, context.afflictions);
  // Revision 17 (`pulp_wars-0ao.6`): the Goblin horde.
  const goblinTraining =
    context.goblin && view.viewer.faction === "GOBLIN"
      ? goblinTrainingAdjustmentsV7()
      : null;
  // The Undead pass, correction: the cure (`armyCureDueV7`).
  const cureDue = armyCureDueV7(context);
  const trainingAdjustment = (role: UnitRoleIdV7): number =>
    (undeadTraining?.get(role) ?? 0) +
    (goblinTraining?.get(role) ?? 0) +
    (cureDue &&
    effectiveRoleRuleV7(role, view.viewer.faction).abilities.includes(
      "TEND_WOUNDED",
    )
      ? ARMY_CURE_TRAINING_VALUE_V7
      : 0);
  // Revision 20: the screened-siege bonus is for a Catapult-role unit the
  // policy plays as siege (never the Triceratops, a line unit).
  const siegeRole = (role: UnitRoleIdV7): boolean =>
    role === "CATAPULT" &&
    policySiegeRuleV7(effectiveRoleRuleV7(role, view.viewer.faction));
  // Revision 17: the first Goblins of the horde do not pay the per-role
  // repetition cost of the preferred-role choice.
  const hordeAdjustment = (role: UnitRoleIdV7, count: number): number =>
    goblinTraining !== null && role === "FIGHTER"
      ? GOBLIN_HORDE_TRAINING_BIAS_V7 *
        Math.min(GOBLIN_HORDE_TRAINING_MAXIMUM_V7, count)
      : 0;
  // The Martian revision (`pulp_wars-t6s.3`): the Martian role values.
  const martianCounts =
    view.viewer.faction === "MARTIAN" ? martianArmyCountsV7(view) : null;
  const atWar = context.tactical.campaign?.atWar === true;
  const martianAdjustment = (
    role: UnitRoleIdV7,
    threatened: boolean,
    repetition: boolean,
  ) =>
    martianCounts === null
      ? 0
      : martianProductionAdjustmentV7(
          view,
          role,
          martianCounts,
          threatened,
          atWar,
          repetition,
        );
  // The Ice Folk revision (`pulp_wars-7g3.4`): the Ice Folk role values.
  const iceCounts =
    view.viewer.faction === "ICE_FOLK" ? iceFolkArmyCountsV7(view) : null;
  const iceAdjustment = (
    role: UnitRoleIdV7,
    threatened: boolean,
    repetition: boolean,
  ) =>
    iceCounts === null
      ? 0
      : iceFolkProductionAdjustmentV7(
          view,
          role,
          iceCounts,
          threatened,
          atWar,
          repetition,
        );
  // The Dwarf revision (`pulp_wars-78i.4`): the Dwarf role values.
  const dwarfCounts = dwarfPlayV7(context) ? dwarfArmyCountsV7(view) : null;
  const dwarfAdjustment = (
    role: UnitRoleIdV7,
    threatened: boolean,
    repetition: boolean,
  ) =>
    dwarfCounts === null
      ? 0
      : dwarfProductionAdjustmentV7(
          view,
          role,
          dwarfCounts,
          threatened,
          atWar,
          repetition,
        );
  // The Candy revision (`pulp_wars-jdb.4`): the Candy role values.
  const candyCounts =
    context.candy &&
    view.viewer.faction === "CANDY" &&
    candyPolicyOptionsV7().production
      ? candyArmyCountsV7(view)
      : null;
  const candyAdjustment = (role: UnitRoleIdV7, threatened: boolean) =>
    candyCounts === null
      ? 0
      : candyProductionAdjustmentV7(view, role, candyCounts, threatened);
  const endgameCaptureShortfall =
    context.endgame !== null &&
    endgameRoutedUnitsV7(context, (unit) => canCaptureV7(view, unit)) <
      ENDGAME_CAPTURER_TARGET_V7;
  const endgameSiegeShortfall =
    context.endgame !== null &&
    context.endgame.targets.length > 0 &&
    endgameRoutedUnitsV7(
      context,
      (unit) =>
        unit.form === "LAND" && policySiegeRuleV7(unitRoleRuleV7(view, unit)),
    ) < ENDGAME_SIEGE_TARGET_V7;
  const chokepointSiegeShortfall = chokepointSiegeShortfallV7(context);
  const threatenedCityIds = new Set<CityId>();
  for (const threat of context.threats) {
    threatenedCityIds.add(threat.cityId);
    yield;
  }
  // pulp_wars-9s0.8: the savings goal is valued for what it does (the Coins
  // were set aside for it), and while it is unaffordable other units wait.
  const savings = savingsPlanV7(context);
  const savingsRole = savings?.role ?? null;
  // pulp_wars-9s0.8: a Dinosaur seat at war lays Spitters (Acid ignores
  // cover and fortification) until it has two.
  const spitters = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unitRoleRuleV7(view, unit).abilities.includes("ACID"),
  ).length;
  const savingsValue = (role: UnitRoleIdV7): number =>
    (savingsRole === role
      ? 2 * (effectiveRoleRuleV7(role, view.viewer.faction).cost ?? 0) +
        SAVINGS_GOAL_VALUE_V7
      : 0) +
    (atWar &&
    spitters < SPITTER_TARGET_V7 &&
    effectiveRoleRuleV7(role, view.viewer.faction).abilities.includes("ACID")
      ? SPITTER_BIAS_V7
      : 0);

  const armyCounts =
    context.army && armyAlertV7(context)
      ? armyCountsForContextV7(context)
      : null;
  const withinFloor = armyChoosesWithinFloorV7(context);
  for (const [cityId, shared] of sharedByCity) {
    const city = citiesById.get(cityId);
    let neutral = 0;
    for (const tile of view.board.tiles) {
      if (
        city !== undefined &&
        tile.explored &&
        tile.territoryCityId === null &&
        tile.territoryOwnerId === null &&
        distance(tile.at, city.at) <= 2
      )
        neutral += 1;
      yield;
    }

    let durableScreen = false;
    for (const unit of view.units) {
      if (
        !durableScreen &&
        city !== undefined &&
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        unit.hp * 2 >= unit.maxHp &&
        unitRoleRuleV7(view, unit).defense2 >= 4
      ) {
        if (distance(unit.at, city.at) <= 1) durableScreen = true;
        else
          for (const destination of context.lookup.moveDestinationsByUnit.get(
            unit.id,
          ) ?? []) {
            if (distance(destination, city.at) <= 1) durableScreen = true;
            yield;
            if (durableScreen) break;
          }
      }
      yield;
    }
    context.durableScreenByCity.set(cityId, durableScreen);

    const threatened = threatenedCityIds.has(cityId);
    const landOrder = threatened ? THREATENED_ROLE_ORDER : GENERAL_ROLE_ORDER;
    let preferredLand: LandProductionCommandV7 | null = null;
    let preferredLandValue = Number.NEGATIVE_INFINITY;
    // Revision 14 (Undead matches): a fragile siege unit trained on a center
    // inside visible lethal reach dies before it acts (the vkq.18 Lich
    // feeding loop against Catapults); prefer anything else there.
    const siegeExposed =
      context.undead &&
      city !== undefined &&
      (landByCity.get(cityId) ?? []).some(
        (command) => command.role === "CATAPULT",
      ) &&
      freshUnitInLethalReachV7(context, city, "CATAPULT");
    // pulp_wars-vkq.21: likewise a Vampire (trained Vampires died before
    // or after one attack, and the policy trained the next one).
    const vampireExposed =
      context.undead &&
      view.viewer.faction === "UNDEAD" &&
      city !== undefined &&
      (landByCity.get(cityId) ?? []).some(
        (command) => command.role === "KNIGHT",
      ) &&
      freshUnitInLethalReachV7(context, city, "KNIGHT");
    // pulp_wars-1mc: a city on an endgame target's landmass trains
    // capturers while fewer than four, and siege units while fewer than
    // three, can route to a target.
    const endgameCity =
      city !== undefined &&
      context.endgame?.routeDistanceByKey.has(coordKey(city.at)) === true;
    const cityAdjustment = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, view.viewer.faction);
      return (
        (siegeExposed && role === "CATAPULT" && policySiegeRuleV7(rule)
          ? -40
          : 0) +
        (vampireExposed && role === "KNIGHT" ? -40 : 0) +
        (endgameCity &&
        ((endgameCaptureShortfall && rule.abilities.includes("CAPTURE")) ||
          (endgameSiegeShortfall && policySiegeRuleV7(rule)))
          ? ENDGAME_TRAINING_BIAS_V7
          : 0) +
        // pulp_wars-68k.6: a single-file front is breached by siege fire.
        (chokepointSiegeShortfall && policySiegeRuleV7(rule)
          ? CHOKEPOINT_TRAINING_BIAS_V7
          : 0) +
        // A breach needs units that hit: Attack counts at such a front.
        (context.chokepoint !== null && rule.range <= 1
          ? CHOKEPOINT_ATTACK_BIAS_V7 * rule.attack2
          : 0)
      );
    };
    const capacity =
      city === undefined
        ? 0
        : cityUnitCapacityForV7(
            city.level,
            view.viewer.researchedTechs,
            view.viewer.faction,
            cityBarracksV7(city),
          );
    const free =
      city === undefined ? 0 : capacity - (assignedByCity.get(cityId) ?? 0);
    const productionCity = { freeSlots: free, capacity, threatened };
    const needsCenterDefender =
      city !== undefined && threatened && !ownedAt.has(coordKey(city.at));
    // Revision 19 (Dinosaur seat only): an Egg is not laid where visible
    // enemies destroy it before it hatches, nor in a threatened city whose
    // empty center a trained unit could defend at once.
    const offersTrain = shared.some((command) => command.kind === "TRAIN");
    // The Dinosaur pass, correction: an army seat lays an Egg of two or
    // more turns only on a nest tile that no visible hostile attacker
    // reaches in those turns (its Moves and its range), or that an own
    // hatched unit stands next to (the garrison on the center, a unit
    // beside the nest). An unguarded city in reach lays one-turn Eggs and
    // trains Cavemen. (With no turn off for Nesting, an Egg is at risk
    // again; in a small map every nest is in a Knight's reach in four
    // turns, so reach alone would stop the laying.)
    const eggReached = (command: SharedCityCommandV7): boolean => {
      if (command.kind !== "LAY_EGG" || !context.army) return false;
      const turns = layEggTurnsV7(view, command.role);
      if (turns < 2) return false;
      if (
        view.units.some(
          (unit) =>
            unit.ownerId === view.viewer.id &&
            unit.form === "LAND" &&
            unit.hp > 0 &&
            distance(unit.at, command.at) <= 1,
        )
      )
        return false;
      return context.lookup.visibleHostiles.some((hostile) => {
        const facts = publicCombatFacts(view, hostile, context.lookup);
        return (
          facts.abilities.includes("ATTACK") &&
          facts.attack2 > 0 &&
          distance(hostile.at, command.at) <=
            facts.move * turns + facts.maximumRange
        );
      });
    };
    const eggBlocked = (command: SharedCityCommandV7): boolean =>
      command.kind === "LAY_EGG" &&
      ((needsCenterDefender && offersTrain) ||
        nestDangerV7(context, command.at) >= laidEggHpForPolicyV7(view) ||
        eggReached(command) ||
        // The correction: the capped Ankylosaurus is no production.
        armyDinosaurDefenderHeldV7(context, command));
    for (const command of landByCity.get(cityId) ?? []) {
      if (eggBlocked(command)) {
        yield;
        continue;
      }
      const count = ownedRoleCounts.get(command.role) ?? 0;
      const value =
        effectiveRoleRuleV7(command.role, view.viewer.faction).maxHp +
        Number(command.role === "GUARD" && threatened) * 20 +
        Number(siegeRole(command.role) && durableScreen) * 12 +
        20 * Number(count === 0) -
        2 * (effectiveRoleRuleV7(command.role, view.viewer.faction).cost ?? 0) -
        8 * count +
        trainingAdjustment(command.role) +
        hordeAdjustment(command.role, count) +
        cityAdjustment(command.role) +
        layEggAdjustmentV7(view, command, threatened) +
        dinosaurProductionAdjustmentV7(view, command, productionCity) +
        martianAdjustment(command.role, threatened, true) +
        iceAdjustment(command.role, threatened, true) +
        dwarfAdjustment(command.role, threatened, true) +
        candyAdjustment(command.role, threatened) +
        savingsValue(command.role);
      const order = landOrder as readonly UnitRoleIdV7[];
      if (
        preferredLand === null ||
        value > preferredLandValue ||
        (value === preferredLandValue &&
          order.indexOf(command.role) < order.indexOf(preferredLand.role))
      ) {
        preferredLand = command;
        preferredLandValue = value;
      }
      yield;
    }
    const naval = navalByCity.get(cityId) ?? [];
    let firstNaval: NavalRoleIdV7 | null = null;
    let offersPatrol = false;
    let offersBattleship = false;
    for (const command of naval) {
      firstNaval ??= command.role;
      if (command.role === "PATROL_BOAT") offersPatrol = true;
      if (command.role === "BATTLESHIP") offersBattleship = true;
      yield;
    }
    const preferredNaval =
      context.naval.visibleNavalDanger && patrolBoats === 0
        ? offersPatrol
          ? "PATROL_BOAT"
          : firstNaval
        : defendedLanding && offersBattleship && battleships === 0
          ? "BATTLESHIP"
          : transports > 0 && patrolBoats < transports && offersPatrol
            ? "PATROL_BOAT"
            : null;
    const centerGuard = centerGuardByCity.get(cityId);
    let best: SharedCityCommandV7 | null = null;
    let bestUtility = Number.NEGATIVE_INFINITY;
    let bestTie: readonly number[] = [];
    // Step two of the Human pass (`pulp_wars-w49.22`): a Human army seat
    // chooses among the units the kept Coins allow
    // (`armyChoosesWithinFloorV7`), and its garrison rule yields to a
    // ranged unit its army is short of (`armyGarrisonYieldsToRangedV7`),
    // except with an enemy at the gates of the city, where a body is
    // trained.
    const floorHolds = (command: SharedCityCommandV7): boolean =>
      withinFloor &&
      (command.kind === "TRAIN" || command.kind === "LAY_EGG") &&
      armyFloorHoldsTrainingV7(context, command);
    // Step two of the Goblin pass (`pulp_wars-w49.23`): the garrison rule
    // of a Goblin seat yields too (to a Bomb Chucker).
    // Step two of the Undead pass (`pulp_wars-w49.24`): and an Undead
    // seat's, to a Banshee or a Lich.
    const offersClass = (wanted: "RANGED" | "SIEGE"): boolean =>
      shared.some(
        (command) =>
          command.kind === "TRAIN" &&
          !floorHolds(command) &&
          armyShareClassV7(
            effectiveRoleRuleV7(command.role, view.viewer.faction),
          ) === wanted,
      );
    // Step two of the Ice Folk pass (`pulp_wars-w49.27`): and an Ice Folk
    // seat's, to a Snow Hunter.
    const garrisonYields =
      (withinFloor ||
        goblinMobSeatV7(context) ||
        armyUndeadSeatV7(context) ||
        armyIceFolkSeatV7(context) ||
        // Step two of the Dwarf pass (`pulp_wars-w49.28`): and a Dwarf
        // seat's, to a Clockwork Gunner.
        armyDwarfSeatV7(context)) &&
      armyCounts !== null &&
      !armyAtTheGatesV7(context, cityId) &&
      armyGarrisonYieldsToRangedV7(
        view.viewer.faction,
        armyCounts,
        offersClass("RANGED"),
        offersClass("SIEGE"),
      );
    const necromancerDue =
      armyCounts !== null &&
      shared.some(
        (command) =>
          command.kind === "TRAIN" &&
          effectiveRoleRuleV7(
            command.role,
            view.viewer.faction,
          ).abilities.includes("RAISE_DEAD"),
      ) &&
      armyNecromancerDueV7(context, cityId);
    for (const command of shared) {
      const cost = sharedTrainingCostV7(
        view,
        command,
        forgeCities,
        improvementByKey,
      );
      const worsens =
        command.kind === "TRAIN" &&
        threatened &&
        centerGuard !== undefined &&
        (effectiveRoleRuleV7(command.role, view.viewer.faction).defense2 <
          unitRoleRuleV7(view, centerGuard).defense2 ||
          effectiveRoleRuleV7(command.role, view.viewer.faction).maxHp <
            centerGuard.hp);
      const spendsReserve =
        command.kind !== "LAND_GRANT" &&
        context.naval.active &&
        view.viewer.coins - cost < context.naval.reserveCoins;
      const saving =
        savings !== null &&
        !savings.affordable &&
        !threatened &&
        // Tuning 5: an army seat's technology goal never holds training.
        !(context.army && savings.role === null) &&
        command.kind !== "LAND_GRANT" &&
        !(
          command.kind === "TRAIN_NAVAL" &&
          context.naval.visibleNavalDanger &&
          command.role === "PATROL_BOAT"
        );
      const eligible =
        !saving &&
        (command.kind === "LAND_GRANT" ||
          (command.kind === "TRAIN" || command.kind === "LAY_EGG"
            ? !(
                context.naval.active &&
                !threatened &&
                free <= 1 &&
                hasLandCaptureUnit
              ) &&
              (!spendsReserve || threatened) &&
              !worsens &&
              !floorHolds(command) &&
              // The Martian pass, correction: no Guard against an enemy
              // that shoots (`armyOpenToRangedUselessV7`).
              !(
                command.kind === "TRAIN" &&
                armyOpenToRangedUselessV7(context, command, shared)
              ) &&
              !eggBlocked(command)
            : (!spendsReserve ||
                (context.naval.visibleNavalDanger &&
                  command.role === "PATROL_BOAT")) &&
              // Revision 14 AI fix: a garrisoned center only offers naval
              // training, which filled every spare slot with Patrol Boats
              // (~15 per game); beyond two naval units, train only the naval
              // role the plan asks for. pulp_wars-9s0.1: in every match (it
              // was limited to Undead matches to keep all-Human pins): idle
              // boats held the unit slots the land war needed.
              !(
                preferredNaval !== command.role &&
                patrolBoats + battleships + submarines >= 2
              )));
      if (eligible) {
        // Tuning 5 (`pulp_wars-w49.4`): an alert army seat trains the role
        // its composition lacks most (`src/ai/v7-army.ts`), with the
        // faction's own adjustments on top.
        // Tuning 8 (`pulp_wars-w49.11`): onto the empty center of a
        // threatened city with an own unit beside it (the garrison that
        // stepped aside), the seat trains a garrison at least as good.
        const garrisonWorth =
          armyCounts !== null &&
          command.kind === "TRAIN" &&
          city !== undefined &&
          threatened &&
          !garrisonYields &&
          !necromancerDue &&
          !ownedAt.has(coordKey(city.at)) &&
          armyDefenderWorthV7(
            context,
            city.at,
            effectiveRoleRuleV7(command.role, view.viewer.faction),
            roleMechanicsV7(command.role, view.viewer.faction),
            effectiveRoleRuleV7(command.role, view.viewer.faction).maxHp,
          ) >= armyBesideCenterWorthV7(context, city.at) &&
          // The Martian pass (`pulp_wars-w49.14`): never a machine (a
          // Mothership or a Tripod on a center has no Walls and is no
          // garrison), and not a Shield Projector
          // beyond its share of a Martian army (the Projector that stepped
          // aside steps back on; the city trains a Grunt).
          roleMechanicsV7(command.role, view.viewer.faction).movementMode ===
            "GROUND" &&
          !(
            view.viewer.faction === "MARTIAN" &&
            armyClassV7(
              effectiveRoleRuleV7(command.role, view.viewer.faction),
            ) === "DEFENDER" &&
            armySharesV7(
              "MARTIAN",
              armyCounts.hostileFragile >= ARMY_FRAGILE_HOSTILES_V7,
            ).DEFENDER *
              (armyCounts.total + 1) <=
              100 * armyCounts.byClass.DEFENDER
          )
            ? ARMY_GARRISON_TRAINING_VALUE_V7
            : 0;
        // The Dinosaur pass (`pulp_wars-w49.15`): an Egg is the same
        // choice (a Dinosaur city lays where another trains), with what
        // its hatch time and its slots cost on top
        // (`layEggAdjustmentV7`, `dinosaurProductionAdjustmentV7`).
        const armyScore =
          armyCounts !== null &&
          (command.kind === "TRAIN" || command.kind === "LAY_EGG")
            ? garrisonWorth +
              armyRoleScoreV7(
                view.viewer.faction,
                command.role,
                armyCounts,
                // Tuning 7: a frontier center gets a body, not a siege
                // unit (Catapults were trained onto centers one step from
                // the enemy's Swordsmen).
                threatened ||
                  (city !== undefined && armyFrontCenterV7(context, city.at)),
              ) +
              trainingAdjustment(command.role) -
              // Step two of the Martian pass (`pulp_wars-w49.25`): a Shock
              // Trooper for every two Grunts, no more
              // (`armyMartianHeavyCappedV7`).
              (view.viewer.faction === "MARTIAN" &&
              command.role === "SWORDSMAN" &&
              armyMartianHeavyCappedV7(
                ownedRoleCounts.get("SWORDSMAN") ?? 0,
                ownedRoleCounts.get("FIGHTER") ?? 0,
              )
                ? ARMY_MARTIAN_HEAVY_CAP_COST_V7
                : 0) -
              // Step two of the Ice Folk pass (`pulp_wars-w49.27`): no
              // more Musk Oxen than cities, nor than a third of the army
              // (`armyIceFolkDefenderCappedV7`).
              (armyIceFolkSeatV7(context) &&
              command.role === "GUARD" &&
              armyIceFolkDefenderCappedV7(
                armyCounts,
                view.cities.filter((item) => item.ownerId === view.viewer.id)
                  .length,
              )
                ? ARMY_ICE_FOLK_DEFENDER_CAP_COST_V7
                : 0) +
              // Step two of the Undead pass: the Necromancer for the
              // Graves beside this city (`armyNecromancerDueV7`).
              (necromancerDue &&
              command.kind === "TRAIN" &&
              effectiveRoleRuleV7(
                command.role,
                view.viewer.faction,
              ).abilities.includes("RAISE_DEAD")
                ? ARMY_NECROMANCER_TRAINING_VALUE_V7
                : 0) +
              10 * cityAdjustment(command.role) +
              // (A hatch turn in a threatened city weighs as much as a
              // tenth of the army's share; the older policy's biases, the
              // first Triceratops and the first Shaman among them, break
              // ties between classes equally short.)
              10 * layEggAdjustmentV7(view, command, threatened) +
              2 * dinosaurProductionAdjustmentV7(view, command, productionCity)
            : null;
        const utility =
          armyScore !== null
            ? ARMY_TRAINING_UTILITY_V7 + armyScore
            : command.kind === "LAND_GRANT"
              ? neutral * 7 - 18
              : command.kind === "TRAIN" || command.kind === "LAY_EGG"
                ? (effectiveRoleRuleV7(command.role, view.viewer.faction)
                    .maxHp +
                    Number(command.role === "GUARD" && threatened) * 20 +
                    Number(siegeRole(command.role) && durableScreen) * 12 +
                    trainingAdjustment(command.role) +
                    cityAdjustment(command.role) +
                    layEggAdjustmentV7(view, command, threatened) +
                    dinosaurProductionAdjustmentV7(
                      view,
                      command,
                      productionCity,
                    ) +
                    martianAdjustment(command.role, threatened, false) +
                    iceAdjustment(command.role, threatened, false) +
                    dwarfAdjustment(command.role, threatened, false) +
                    candyAdjustment(command.role, threatened) +
                    savingsValue(command.role) -
                    (savingsRole === command.role
                      ? 2 *
                        (effectiveRoleRuleV7(command.role, view.viewer.faction)
                          .cost ?? 0)
                      : 0)) *
                    3 -
                  cost * 4 +
                  (savingsRole === command.role ? cost * 4 : 0) +
                  Number(preferredLand?.role === command.role) * 18
                : (command.role === "PATROL_BOAT" ? 32 : 38) -
                  cost * 4 +
                  Number(preferredNaval === command.role) * 125 -
                  Number(needsCenterDefender) * 100;
        const tie = fallbackTie(view, command, city?.at);
        if (
          best === null ||
          utility > bestUtility ||
          (utility === bestUtility && compareNumericTuple(tie, bestTie) > 0)
        ) {
          best = command;
          bestUtility = utility;
          bestTie = tie;
        }
      }
      yield;
    }
    context.preferredSharedCityActionByCity.set(cityId, best);
    if (
      armyCounts !== null &&
      (best?.kind === "TRAIN" || best?.kind === "LAY_EGG")
    )
      context.armyTrainingScoreByCity.set(
        cityId,
        bestUtility - ARMY_TRAINING_UTILITY_V7,
      );
    yield;
  }
  context.sharedCityContextPrepared = true;
}

/**
 * Revision 13 Undead training values: a Banshee's Wail only matters against
 * a living seat, a Necromancer gains value from visible Graves to raise, and
 * a Lich's splash adds to its Catapult value.
 */
function undeadTrainingAdjustmentsV7(
  view: PlayerViewV7,
): ReadonlyMap<UnitRoleIdV7, number> {
  const adjustments = new Map<UnitRoleIdV7, number>();
  adjustments.set(
    "MARKSMAN",
    hasLivingHostileSeatV7(view, (owner) => isHostile(view, owner)) ? 8 : -30,
  );
  adjustments.set("CAPTAIN", 4 * Math.min(3, view.graves.length));
  // Revision 14: the Lich is the Undead siege and Plague carrier. vkq.10
  // measured +16 (L2) at about Catapult-rate Liches, but an uncapped bias
  // makes the Lich the best base value and armies of dozens of Liches in
  // long games; so +16 only while fewer than three own Liches exist, else the
  // revision-13 +4.
  const owned = (role: UnitRoleIdV7) =>
    view.units.filter(
      (unit) => unit.ownerId === view.viewer.id && unit.role === role,
    ).length;
  adjustments.set("CATAPULT", owned("CATAPULT") < 3 ? 16 : 4);
  // Revision 14: unanswered attacks make one Vampire worth its 9 Coins once
  // the treasury can spare them.
  if (view.viewer.coins >= RICH_TREASURY_COINS_V7 && owned("KNIGHT") === 0)
    adjustments.set("KNIGHT", 20);
  return adjustments;
}

/** Army play: a composition choice outranks every other shared city action. */
const ARMY_TRAINING_UTILITY_V7 = 100_000;

/** Coins at which expensive breakthrough units become worth training. */
const RICH_TREASURY_COINS_V7 = 18;

/**
 * Revision 14 training for a living seat in a match with an Undead seat: a
 * Captain cures Plague and Bitten, so one is worth training while own units
 * are afflicted and no own Captain exists. (Knights get no bias: a rich-
 * treasury bias large enough to matter replaced Catapults with Knights that
 * fed Zombies bites and Infect risings.)
 */
function livingTrainingAdjustmentsV7(
  view: PlayerViewV7,
  afflictions: PublicAfflictionsV7,
): ReadonlyMap<UnitRoleIdV7, number> {
  const adjustments = new Map<UnitRoleIdV7, number>();
  let afflicted = 0;
  let captains = 0;
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id) continue;
    // Revision 15: Plague on its last turn is not worth a Captain.
    if (
      (afflictions.turnsRemaining.get(unit.id) ?? 0) >=
        PLAGUE_TURNS_WORTH_CURING_V7 ||
      afflictions.bitten.has(unit.id)
    )
      afflicted += 1;
    if (unitRoleRuleV7(view, unit).abilities.includes("TEND_WOUNDED"))
      captains += 1;
  }
  if (captains === 0 && afflicted > 0)
    adjustments.set("CAPTAIN", 6 * Math.min(3, afflicted));
  return adjustments;
}

function sharedTrainingCostV7(
  view: PlayerViewV7,
  command: SharedCityCommandV7,
  forgeCities: ReadonlySet<CityId>,
  improvementByKey: ReadonlyMap<string, ImprovementIdV7 | null>,
): number {
  if (command.kind === "LAND_GRANT") return 0;
  const base = effectiveRoleRuleV7(command.role, view.viewer.faction).cost ?? 0;
  return command.kind === "TRAIN_NAVAL"
    ? Math.max(
        1,
        base -
          Number(improvementByKey.get(coordKey(command.at)) === "SHIPYARD") * 2,
      )
    : Math.max(1, base - Number(forgeCities.has(command.cityId)));
}

function preferredSharedCityActionV7(
  context: PolicyContextV7,
  cityId: CityId,
): CommandV7 | null {
  if (!context.sharedCityContextPrepared)
    drain(sharedCityContextWorkV7(context));
  return context.preferredSharedCityActionByCity.get(cityId) ?? null;
}

function leavesSoleThreatenedDefender(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  const actor = context.lookup.unitsById.get(command.unitId);
  const city =
    actor === undefined
      ? undefined
      : cityAt(context.view, actor.at, context.lookup);
  if (
    actor === undefined ||
    city === undefined ||
    city.ownerId !== context.view.viewer.id ||
    !threatenedCity(context, city.id)
  )
    return false;
  if (command.kind === "ATTACK") {
    const preview = queryCombatPreviewV7(
      context.view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview === null || (!preview.attackerDies && !preview.advances))
      return false;
  }
  return !context.tactical.defenderReplacementActionKeys.has(
    policyCommandKeyV7(command),
  );
}

function policyCommandKeyV7(command: CommandV7): string {
  return JSON.stringify(command);
}

function defenderActionException(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" | "ATTACK" }>,
): boolean {
  if (command.kind === "MOVE") return false;
  const preview = queryCombatPreviewV7(
    context.view,
    command.unitId,
    command.targetUnitId,
  );
  if (preview === null) return false;
  const actor = context.lookup.unitsById.get(command.unitId);
  const defendedCity =
    actor === undefined
      ? undefined
      : cityAt(context.view, actor.at, context.lookup);
  if (
    defendedCity === undefined ||
    defendedCity.ownerId !== context.view.viewer.id
  )
    return false;
  return (
    preview.defenderDies &&
    context.threats.some(
      (threat) =>
        threat.cityId === defendedCity.id &&
        threat.unitId === command.targetUnitId,
    ) &&
    !context.threats.some(
      (threat) =>
        threat.cityId === defendedCity.id &&
        threat.unitId !== command.targetUnitId,
    )
  );
}

function isAutoembarkMoveV7(
  context: PolicyContextV7,
  command: CommandV7,
): command is Extract<CommandV7, { kind: "MOVE" }> {
  if (command.kind !== "MOVE") return false;
  const { view } = context;
  const unit = context.lookup.unitsById.get(command.unitId);
  const destination = command.path.at(-1);
  if (unit?.form !== "LAND" || destination === undefined) return false;
  const tile = findPublicTileV7(view, destination);
  return (
    tile?.explored === true &&
    tile.improvement === "PORT" &&
    tile.territoryOwnerId === view.viewer.id &&
    view.naval.ownedPorts.some(
      (port) => port.status === "ACTIVE" && same(port.at, destination),
    )
  );
}

/**
 * `pulp_wars-9s0.1`: an embarked unit is stranded when it has not moved, has
 * no Move that makes route progress or reveals a tile, has no planned
 * landing on offer, and the plan is not holding it off a target that an own
 * or allied capturer is taking. Such a transport used to wait at sea for
 * the rest of the match (and kept the naval plan active); it now lands on an
 * offered tile from which a village or a known enemy city can be walked to,
 * and takes that job ashore (a unit with a job does not board again).
 */
function strandedTransportV7(
  context: PolicyContextV7,
  unitId: UnitId,
): boolean {
  const cached = context.strandedTransports.get(unitId);
  if (cached !== undefined) return cached;
  const actor = context.lookup.unitsById.get(unitId);
  let stranded = false;
  if (
    actor !== undefined &&
    actor.form === "EMBARKED" &&
    actor.ownerId === context.view.viewer.id &&
    !actor.activation.moved &&
    !context.naval.holding &&
    !context.commands.some(
      (command) =>
        command.kind === "DISEMBARK" &&
        command.unitId === unitId &&
        context.naval.landing.some((at) => same(at, command.at)),
    )
  ) {
    stranded = true;
    for (const to of context.lookup.moveDestinationsByUnit.get(unitId) ?? [])
      if (
        navalMovementObjectiveValueV7(context, actor, to, 1) > 0 ||
        publicRevealGain(context.view, actor, to, context.lookup) > 0
      ) {
        stranded = false;
        break;
      }
  }
  context.strandedTransports.set(unitId, stranded);
  return stranded;
}

/**
 * Revision 16 (section 3.6 rule 2): a growth harvest of the level-1 original
 * capital scores at least this, above a level-reaching economic action
 * (1210). While one is ready, research, training, and construction scoring
 * at or above it drop just below it (the free opener, 1305, is never pending
 * while a harvest is legal); attacks, captures, Rally, Tend, and movement
 * keep their priorities.
 */
const NORMAL_GROWTH_HARVEST_PRIORITY_V7 = 1212;

/**
 * A legal, affordable (ready) harvest of a growth resource (Fruit, Game, or
 * Fish) in the viewer's original capital's territory while that capital is
 * still level 1.
 */
function openingGrowthHarvestV7(
  view: PlayerViewV7,
  command: CommandV7,
): boolean {
  if (
    command.kind !== "HARVEST_FRUIT" &&
    command.kind !== "HUNT_GAME" &&
    command.kind !== "HARVEST_FISH"
  )
    return false;
  const capital = view.cities.find(
    (city) =>
      city.id === view.viewer.originalCapitalCityId &&
      city.ownerId === view.viewer.id,
  );
  if (capital === undefined || capital.level !== 1) return false;
  const tile = findPublicTileV7(view, command.at);
  return tile?.explored === true && tile.territoryCityId === capital.id;
}

function scoreCommandWithContext(
  context: PolicyContextV7,
  command: CommandV7,
  readyTuple: readonly number[],
  precomputedKnightOverrun?: KnightOverrunSequenceValue,
): AiScoreV7 {
  const view = context.view;
  const actor = unitForCommand(view, command, context.lookup);
  const resultAt =
    command.kind === "MOVE"
      ? (command.path.at(-1) ?? actor?.at ?? null)
      : (actor?.at ?? null);
  let priority = -1;
  let strategicValue = 0;
  let immediateValue = 0;
  let futureValue = 0;
  let safetyValue = 0;
  let objectiveValue = 0;

  const economic = previewEconomicV7(view, command);
  if (economic.ok) {
    const population = sum(
      economic.preview.populationDeltaByCity.map((item) => item.delta),
    );
    const recurring = sum(
      economic.preview.coinIncomeDeltaByCity.map((item) => item.delta),
    );
    futureValue = scorePublicSpatialPlanV7(view, command);
    immediateValue =
      20 * economic.preview.levelsReached.length +
      5 * population +
      12 * recurring -
      economic.preview.cost +
      (command.kind === "CLEAR_FOREST" ? 1 : 0);
    if (economic.preview.levelsReached.length > 0) priority = 1210;
    else if (recurring > 0) priority = 1200;
    else if (
      command.kind === "BUILD_ROAD" &&
      economic.preview.capitalRoadConnected
    )
      priority = 1120;
    else if (population > 0 || command.kind === "CLEAR_FOREST") priority = 1140;
    else if (futureValue > 0) priority = 1100;
    if (
      economic.preview.outputTransitions.some(
        (item) => item.change === "RESUMED",
      )
    )
      strategicValue += 12;
    if (
      economic.preview.outputTransitions.some(
        (item) => item.change === "OUTAGE",
      )
    )
      strategicValue -= 12;
    if (
      command.kind === "CLEAR_FOREST" &&
      futureValue < 0 &&
      !unlocksAffordableProductiveAction(view)
    )
      priority = -1;
    if (
      context.naval.active &&
      command.kind === "BUILD_PORT" &&
      view.naval.ownedPorts.every((port) => port.status !== "ACTIVE")
    ) {
      priority = 1285;
      const cityId = findPublicTileV7(view, command.at);
      strategicValue =
        10_000 -
        100 *
          (context.naval.target === null
            ? nearestDistance(command.at, context.naval.frontier)
            : distance(command.at, context.naval.target)) -
        (cityId?.explored === true ? (cityId.territoryCityId ?? 0) : 0);
    } else if (context.naval.active && command.kind === "GATHER_PEARLS") {
      priority = Math.max(priority, 1225);
      immediateValue += 4;
    } else if (context.naval.active && command.kind === "HARVEST_FISH") {
      priority = Math.max(priority, 1170);
    }
    // Revision 16 (section 3.6 rule 2): growth before other spending.
    if (openingGrowthHarvestV7(view, command))
      priority = Math.max(priority, NORMAL_GROWTH_HARVEST_PRIORITY_V7);
    // Tuning 6 (`pulp_wars-w49.6`): with no enemy near, an army seat buys
    // a city level, a harvest, or a hunt before it trains.
    if (
      context.army &&
      !context.naval.active &&
      priority >= 0 &&
      armyCheapGrowthV7(economic.preview) &&
      armyUnthreatenedV7(context)
    )
      priority = Math.max(priority, ARMY_GROWTH_PRIORITY_V7);
    // Tuning 7 (`pulp_wars-w49.10`): at the unit limit, and once every
    // city that can train has trained, the Coins buy population: more
    // levels are more unit slots and more income.
    if (
      context.army &&
      !context.naval.active &&
      priority >= 0 &&
      (population > 0 || economic.preview.levelsReached.length > 0) &&
      !armyCanTrainV7(context)
    )
      priority = Math.max(priority, ARMY_GROWTH_PRIORITY_V7);
    // Tuning 8 (`pulp_wars-w49.11`): the capital grows too. Of the growth
    // on offer, an army seat buys the capital's first while the capital is
    // at level 2 or below, or below another own city (an Undead capital
    // stood at 0 of 3 for twelve rounds with Ore in its land while the
    // Mines went to its villages; a Human capital at level 2 beside seven
    // cities of level 3 and 4).
    if (
      context.army &&
      priority >= 0 &&
      economic.preview.cost > 0 &&
      armyCapitalGrowthV7(context, economic.preview.populationDeltaByCity)
    )
      strategicValue += ARMY_CAPITAL_GROWTH_VALUE_V7;
    if (command.kind === "BUILD_ROAD") {
      const corridor = context.tactical.roadCorridor;
      if (
        corridor !== null &&
        corridor.missingRoadKeys[0] === coordKey(command.at)
      ) {
        priority = Math.max(priority, 1110);
        strategicValue +=
          corridor.benefit * 4 - corridor.missingRoadKeys.length * 2;
        objectiveValue += 8 - corridor.missingRoadKeys.length;
      }
    }
  }

  if (command.kind === "BUILD_MONUMENT") {
    const preview = previewMonumentV7(view, command);
    if (preview.ok) {
      const imminent = preview.preview.levelsReached.length;
      immediateValue = 15 + 20 * imminent;
      strategicValue =
        3 +
        preview.preview.rewardWork.reduce(
          (total, work) =>
            total +
            (work.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED" ? 12 : 4),
          0,
        );
      futureValue = scorePublicSpatialPlanV7(view, command);
      priority = imminent > 0 ? 1210 : 1150;
      // Tuning 6 (`pulp_wars-w49.6`): a Monument is free population.
      if (context.army && !context.naval.active)
        priority = ARMY_GROWTH_PRIORITY_V7;
    }
  }

  if (command.kind === "BUILD_FIELD_DEFENSE" && actor !== undefined) {
    const city = cityAt(view, actor.at, context.lookup);
    const danger = visibleImmediateDamage(view, actor, actor.at, context);
    const useful =
      danger > 0 || (city !== undefined && threatenedCity(context, city.id));
    priority = useful
      ? city !== undefined && threatenedCity(context, city.id)
        ? 1265
        : 845
      : -1;
    immediateValue = -3;
    strategicValue = useful ? 12 + danger : 0;
  }

  if (command.kind === "CHOOSE_CITY_REWARD") {
    priority = 1300;
    immediateValue =
      command.reward === "TREASURY"
        ? CITY_REWARD_COINS_V7.TREASURY
        : command.reward === "STOCKPILE"
          ? 4
          : command.reward === "BOOM"
            ? 15
            : command.reward === "JUGGERNAUT"
              ? 40
              : 0;
    if (command.reward === "JUGGERNAUT") {
      strategicValue = threatenedCity(context, command.cityId) ? 30 : 18;
      strategicValue -= freeCapacity(view, command.cityId) <= 1 ? 8 : 0;
    }
  }

  if (command.kind === "RESEARCH" && normalOpeningResearchPendingV7(view)) {
    // Revision 12: the first tier-1 research is free; choose it from the
    // capital surroundings before any other work this turn.
    priority = command.tech === normalOpeningTechnologyV7(view) ? 1305 : -1;
  } else if (command.kind === "RESEARCH") {
    const research = researchValue(context, command.tech);
    priority = research.priority;
    strategicValue = research.strategic;
    immediateValue = -research.cost;
    if (view.viewer.faction === "GOBLIN" && command.tech === "COMMERCE") {
      // Revision 17: Plunder pays a Coin per kill (`pulp_wars-0ao.6`).
      const plunder = plunderResearchValueV7(context);
      if (plunder !== null && plunder.priority > priority) {
        priority = plunder.priority;
        strategicValue = plunder.strategic;
      }
    }
    // The Martian pass (`pulp_wars-w49.14`): an army seat researches in
    // the army's order (`ARMY_RESEARCH_ROLES_V7.MARTIAN`).
    if (view.viewer.faction === "MARTIAN" && !context.army) {
      // The Martian revision (`pulp_wars-t6s.3`): research toward the roles.
      const plan = martianResearchV7(
        view,
        view.cities.filter((city) => city.ownerId === view.viewer.id).length,
        martianCacheV7(context).army.front,
        martianFortifiedHostileVisibleV7(context),
      );
      if (
        plan !== null &&
        plan.tech === command.tech &&
        plan.priority > priority
      ) {
        priority = plan.priority;
        strategicValue = plan.strategic;
      }
    }
    // Step two of the Ice Folk pass (`pulp_wars-w49.27`): an army seat
    // researches in the army's order (`ARMY_RESEARCH_ROLES_V7.ICE_FOLK`).
    if (view.viewer.faction === "ICE_FOLK" && !context.army) {
      // The Ice Folk revision (`pulp_wars-7g3.4`): research toward the roles.
      const plan = iceFolkResearchV7(
        view,
        view.cities.filter((city) => city.ownerId === view.viewer.id).length,
        iceFolkCacheV7(context).army.front,
        iceFolkWoundedAtHomeV7(context),
      );
      if (
        plan !== null &&
        plan.tech === command.tech &&
        plan.priority > priority
      ) {
        priority = plan.priority;
        strategicValue = plan.strategic;
      }
    }
    // Step two of the Dwarf pass (`pulp_wars-w49.28`): an army seat
    // researches in the army's order (`ARMY_RESEARCH_ROLES_V7.DWARF`).
    if (
      view.viewer.faction === "DWARF" &&
      dwarfPlayV7(context) &&
      !context.army
    ) {
      // The Dwarf revision (`pulp_wars-78i.4`): research toward the roles.
      const plan = dwarfResearchV7(view, dwarfResearchFactsV7(context));
      if (
        plan !== null &&
        plan.tech === command.tech &&
        plan.priority > priority
      ) {
        priority = plan.priority;
        strategicValue = plan.strategic;
      }
    }
    if (
      context.candy &&
      view.viewer.faction === "CANDY" &&
      candyPolicyOptionsV7().research
    ) {
      // The Candy revision (`pulp_wars-jdb.4`): research toward the roles.
      const plan = candyResearchV7(view, candyResearchFactsV7(context));
      if (
        plan !== null &&
        plan.tech === command.tech &&
        plan.priority > priority
      ) {
        priority = plan.priority;
        strategicValue = plan.strategic;
      }
    }
    // The Industry reshuffle (7r56): the last step to the defender of a
    // seat outside the army policy (`defenderLastStepResearchV7`).
    const defender = defenderLastStepResearchV7(context, command.tech);
    if (defender !== null && priority < DEFENDER_RESEARCH_PRIORITY_V7) {
      priority = DEFENDER_RESEARCH_PRIORITY_V7;
      strategicValue = Math.max(strategicValue, defender);
    }
    // The Dinosaur pass (`pulp_wars-w49.15`): an army seat follows the
    // army's order (`ARMY_RESEARCH_ROLES_V7.DINOSAUR`).
    if (
      view.viewer.faction === "DINOSAUR" &&
      !context.army &&
      priority < SIGNATURE_RESEARCH_PRIORITY_V7
    ) {
      // Revision 19 (`pulp_wars-c87.8`): the Triceratops and the T-Rex.
      const signature = signatureResearchV7(view);
      if (signature !== null && signature.tech === command.tech) {
        priority = SIGNATURE_RESEARCH_PRIORITY_V7;
        strategicValue = signature.strategic;
      }
    }
    if (
      !view.viewer.researchedTechs.includes("ENGINEERING") &&
      command.tech === "ENGINEERING"
    ) {
      const oreProspectPoints = view.board.tiles.reduce(
        (total, tile) =>
          total +
          (tile.explored &&
          tile.terrain === "MOUNTAIN" &&
          tile.territoryOwnerId === view.viewer.id
            ? tile.biome === "PLAINS"
              ? 30
              : tile.biome === "WOODLAND"
                ? 38
                : 68
            : 0),
        0,
      );
      strategicValue += Math.floor(oreProspectPoints / 100);
      objectiveValue = oreProspectPoints % 100;
    }
    const navalTech = nextNavalTechnologyV7(context);
    if (navalTech === command.tech) {
      priority = 1280;
      strategicValue = context.naval.deepWaterRequired ? 80 : 60;
    } else if (
      context.naval.active &&
      (command.tech === "SHORECRAFT" ||
        command.tech === "NAVIGATION" ||
        command.tech === "NAVAL_ENGINEERING")
    )
      priority = Math.max(priority, 1070);
  }

  // Tuning 5 (`pulp_wars-w49.4`): the army's next fighting role.
  if (
    command.kind === "RESEARCH" &&
    priority >= 0 &&
    context.army &&
    armyResearchTargetV7(context)?.tech === command.tech
  ) {
    // Tuning 6 (`pulp_wars-w49.6`): due and no enemy near, it is bought
    // before training; due with an enemy near, after training (tuning 5);
    // not due, after the growth that adds population.
    // While the seat expands, a city that can train goes first: its
    // first units take the villages.
    priority = !armyResearchIsDueV7(context)
      ? ARMY_UNDUE_RESEARCH_PRIORITY_V7
      : armyUnthreatenedV7(context) &&
          !(armyExpandingV7(context) && armyCanTrainV7(context))
        ? ARMY_DUE_RESEARCH_PRIORITY_V7
        : Math.max(priority, ARMY_RESEARCH_PRIORITY_V7);
    // Tuning 8 (`pulp_wars-w49.11`): in a war the technology the clock
    // says is due is bought before growth and before the units; only a
    // threatened city trains first (1260). A large seat always has an
    // enemy within three tiles of some center: with "units first while
    // pressed" it spent every Coin on units and Farms for ten rounds with
    // its technology affordable.
    if (armyWarV7(context) && armyResearchClockDueV7(context))
      priority = ARMY_DUE_RESEARCH_PRIORITY_V7;
    // The Undead pass, correction: economy first. The growth technology
    // of `armyEconomyFirstV7` is bought as soon as the Coins are there,
    // before the units, also while the seat expands or is at war (its
    // first three Skeletons take the villages; it trained Zombies with 7
    // Coins in hand for three rounds and the technology came in round 8).
    if (
      armyEconomyResearchV7(context, command.tech) ||
      // And the cure (`armyCureDueV7`): the Captain's technology.
      armyCureResearchV7(context, command.tech) ||
      // The Industry reshuffle (7r56): and the last step to the defender
      // of a seat whose order begins with it (`armyDefenderResearchV7`).
      armyDefenderResearchV7(context, command.tech) ||
      // Step two of the Goblin pass: and the urgent blocker (`armyBlockerV7`).
      armyBlockerResearchV7(context, command.tech)
    )
      priority = ARMY_DUE_RESEARCH_PRIORITY_V7;
    // Step two of the Undead pass: bodies first. While an Undead seat is
    // short of units (`armyUndeadBodiesFirstV7`) its technology is bought
    // after the training of the turn, with what the units leave.
    else if (armyUndeadBodiesFirstV7(context))
      priority = Math.min(priority, ARMY_RESEARCH_PRIORITY_V7);
    // Step two of the Undead pass: an Undead seat buys the technology that
    // is due before it captures. A technology costs 1 to 3 Coins more for
    // every city owned, and a capture is made first otherwise (1340): a
    // seat with exactly the 15 Coins of Fortification captured its sixth
    // city, could not pay 17, and bought it four rounds later for 19.
    if (
      priority === ARMY_DUE_RESEARCH_PRIORITY_V7 &&
      // (Step two of the Martian pass: and a Martian seat.)
      armyBodiesSeatV7(context) &&
      context.commands.some((offered) => offered.kind === "CAPTURE")
    )
      priority = ARMY_RESEARCH_BEFORE_CAPTURE_PRIORITY_V7;
    strategicValue = Math.max(strategicValue, 100);
  }

  // pulp_wars-9s0.8: the saved-for technology is researched first.
  if (
    command.kind === "RESEARCH" &&
    priority >= 0 &&
    savingsPlanV7(context)?.affordable === true &&
    savingsPlanV7(context)?.tech === command.tech
  )
    priority = Math.max(priority, SAVINGS_BUY_PRIORITY_V7);

  if (command.kind === "TRAIN" || command.kind === "LAY_EGG") {
    priority = threatenedCity(context, command.cityId)
      ? 1260
      : warTrainingFirstV7(context)
        ? WAR_TRAINING_PRIORITY_V7
        : 1080;
    // pulp_wars-9s0.8: the savings goal is bought before other spending.
    const savings = savingsPlanV7(context);
    if (savings?.affordable === true && savings.role === command.role)
      priority = Math.max(priority, SAVINGS_BUY_PRIORITY_V7);
    immediateValue = -trainingCostV7(view, command);
    strategicValue = trainingStrategicValue(context, command);
    // Tuning 5 (`pulp_wars-w49.4`): an alert army seat trains before any
    // research and construction, the role it lacks most first.
    // (The Dinosaur pass: an Egg is a Dinosaur seat's training.)
    if (
      (command.kind === "TRAIN" ||
        (command.kind === "LAY_EGG" && context.army)) &&
      armyTrainsFirstV7(context)
    ) {
      // Tuning 6 (`pulp_wars-w49.6`): with no enemy near and two thirds
      // of the unit slots filled (`warTrainingFirstV7`), the growth that
      // adds population goes first and training tops the army up after.
      priority = Math.max(priority, armyTrainingPriorityV7(context));
      strategicValue =
        1000 + (context.armyTrainingScoreByCity.get(command.cityId) ?? 0);
    }
  }

  if (command.kind === "HATCH") {
    // Revision 19: previewed value (`pulp_wars-c87.5`).
    const dinosaur = hatchScoreV7(
      view,
      command,
      ownEggDangerV7(context, command.eggUnitId) > 0,
    );
    priority = dinosaur.priority;
    strategicValue = dinosaur.strategic;
    immediateValue = dinosaur.immediate;
  }

  if (command.kind === "TRAIN_NAVAL") {
    priority =
      command.role === "PATROL_BOAT" && context.naval.visibleNavalDanger
        ? 1290
        : command.role === "BATTLESHIP" && context.naval.target !== null
          ? 1215
          : 1090;
    immediateValue = -trainingCostV7(view, command);
    strategicValue =
      command.role === "PATROL_BOAT"
        ? 25 + Number(context.naval.visibleNavalDanger) * 25
        : 35;
  }

  if (command.kind === "DISEMBARK" && actor !== undefined) {
    priority =
      context.naval.active &&
      (context.naval.landing.some((at) => same(at, command.at)) ||
        !strandedTransportV7(context, actor.id))
        ? 1335
        : 810;
    strategicValue = unitRoleRuleV7(view, actor).abilities.includes("CAPTURE")
      ? 70
      : 10;
    objectiveValue =
      context.naval.target === null
        ? publicRevealGain(view, actor, command.at, context.lookup)
        : 100 - distance(command.at, context.naval.target);
    // pulp_wars-1mc: an embarked capturer lands next to an endgame target.
    const landing = endgameLandingValueV7(context, command);
    if (landing > 0) {
      priority = Math.max(priority, ENDGAME_APPROACH_PRIORITY_V7);
      strategicValue += landing;
    }
    if (context.undead && fragileLandingExposedV7(context, actor, command.at))
      priority = -1;
  }

  if (command.kind === "LAND_GRANT") {
    const city = context.lookup.citiesById.get(command.cityId);
    const neutral =
      city === undefined
        ? 0
        : view.board.tiles.filter(
            (tile) =>
              tile.explored &&
              tile.territoryCityId === null &&
              tile.territoryOwnerId === null &&
              Math.abs(tile.at.x - city.at.x) <= 2 &&
              Math.abs(tile.at.y - city.at.y) <= 2,
          ).length;
    priority = neutral >= 4 ? 1170 : 720;
    immediateValue = -6;
    strategicValue = neutral * 3;
  }

  if (command.kind === "ATTACK") {
    const preview = queryCombatPreviewV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview !== null) {
      immediateValue = combatImmediateValue(preview, view);
      const threatening = context.threats.some(
        (item) => item.unitId === command.targetUnitId,
      );
      priority = preview.defenderDies
        ? threatening
          ? 1280
          : 1180
        : threatening
          ? 1240
          : 900;
      strategicValue += combatStrategicValue(context, command, preview);
      const targetUnit = context.lookup.unitsById.get(command.targetUnitId);
      const targetCity =
        targetUnit === undefined
          ? undefined
          : context.lookup.citiesByKey.get(coordKey(targetUnit.at));
      const clearsHostileCity =
        preview.defenderDies &&
        targetUnit !== undefined &&
        targetCity !== undefined &&
        isHostile(view, targetCity.ownerId);
      if (clearsHostileCity) {
        priority = Math.max(priority, 1350);
        strategicValue += 50;
      }
      const opensCaptureFollowUp =
        !preview.defenderDies &&
        targetUnit !== undefined &&
        targetCity !== undefined &&
        isHostile(view, targetCity.ownerId) &&
        hasLethalAttackFollowUpV7(context, command, preview);
      if (opensCaptureFollowUp) {
        priority = Math.max(priority, preview.attackerDies ? 1346 : 1345);
        strategicValue += 45;
      } else if (endgameCombinedKillV7(context, command, preview)) {
        // pulp_wars-1mc: this turn's combined fire clears the last city's
        // center for an adjacent capturer; unanswered hits go first.
        priority = Math.max(priority, preview.attackerDies ? 1343 : 1344);
        strategicValue += 40;
      }
      if (targetUnit?.form === "EMBARKED") {
        priority = Math.max(priority, 1275);
        strategicValue += 40;
      }
      if (
        actor?.role === "BATTLESHIP" &&
        targetUnit?.form === "LAND" &&
        context.naval.target !== null &&
        distance(targetUnit.at, context.naval.target) <= 2
      ) {
        priority = Math.max(priority, 1260);
        strategicValue += 35;
      }
      if (preview.escapeAvailable) strategicValue += 4;
      if (
        actor?.role === "KNIGHT" &&
        actor.form === "LAND" &&
        actor.activation.attacksUsed === 0
      ) {
        const sequence =
          precomputedKnightOverrun ??
          bestKnightOverrunSequence(context, view, command);
        immediateValue = sequence.immediate;
        strategicValue = sequence.strategic;
        safetyValue = sequence.safety;
        objectiveValue = sequence.spacing;
      }
      if (context.undead && actor !== undefined) {
        strategicValue += undeadAttackValueV7(context, command, actor, preview);
        // Revision 14: a Lich volley that plagues three or more hostile
        // units outranks an ordinary kill; killing a Lich that plagues our
        // units cures them all.
        if (
          plagueApplicationValueV7(
            view,
            context.afflictions,
            preview.plagued,
            (owner) => isHostile(view, owner),
          ).hostileVictims >= 3
        )
          priority = Math.max(priority, 1182);
        if (
          preview.defenderDies &&
          targetUnit !== undefined &&
          plagueSourceVictimsV7(
            view,
            context.afflictions,
            targetUnit.id,
            (owner) => !isHostile(view, owner),
          ) > 0
        )
          priority = Math.max(priority, 1285);
      }
      if (context.goblin) {
        // Revision 17: death blasts, Gang Up, and Plunder (`pulp_wars-0ao.6`).
        const goblin = goblinAttackValueV7(context, command, preview);
        strategicValue += goblin.strategic;
        immediateValue += goblin.immediate;
        // pulp_wars-0ao.13: a bomb that splashes own or allied units waits
        // for the same tier's clean attacks (another target, or another
        // unit that may kill this one first).
        if (
          goblinAttackFactsV7(context, command, preview).friendlySplashHits > 0
        )
          priority -= FRIENDLY_SPLASH_PRIORITY_DEMOTION_V7;
      }
      // Revision 19: Grow, kill feeding, Acid, and Egg defence.
      if (context.dinosaur && actor !== undefined) {
        strategicValue += dinosaurAttackValueV7(
          context,
          command,
          actor,
          preview,
        );
        // Revision 20 Charge!: Field Defense destroyed, a defender pushed
        // off a hostile center, and the exposure on the tile it ends on.
        if (linebreakerV7(view, actor)) {
          const charge = chargeAttackScoreV7(context, command, actor, preview);
          strategicValue += charge.strategic;
          if (charge.opensCapture)
            priority = Math.max(priority, CHARGE_PUSH_CENTER_PRIORITY_V7);
          else if (charge.breaksFieldDefense && priority === 900)
            priority = CHARGE_BREAKER_PRIORITY_V7;
        }
      }
      // The Martian revision (`pulp_wars-t6s.3`): Shields, rays, Cooling.
      if (context.martian && actor !== undefined && targetUnit !== undefined) {
        const martian = martianAttackAdjustmentV7(
          context,
          actor,
          targetUnit,
          preview,
          priority,
        );
        priority = martian.priority;
        strategicValue += martian.strategic;
      }
      // The Ice Folk revision (`pulp_wars-7g3.4`): Shatter, Sweep, Boulders,
      // the Sabretooth, the order of the chips, and against the Ice Folk the
      // Witch and the Shatter window.
      if (context.iceFolk && actor !== undefined && targetUnit !== undefined) {
        const ice = iceFolkAttackAdjustmentV7(
          context,
          command,
          actor,
          targetUnit,
          preview,
          priority,
          threatening,
        );
        priority = ice.priority;
        strategicValue += ice.strategic;
      }
      // The Dwarf revision (`pulp_wars-78i.4`): the Gunner's chips before
      // the melee ones, and the Steam Cannon's Knockback.
      if (
        dwarfUnitPlayV7(context, actor) &&
        actor !== undefined &&
        targetUnit !== undefined
      ) {
        const dwarf = dwarfAttackAdjustmentV7(
          context,
          actor,
          targetUnit,
          preview,
          priority,
        );
        priority = dwarf.priority;
        strategicValue += dwarf.strategic;
      }
      // The Candy revision (`pulp_wars-jdb.4`): the Pie Launcher's Splat
      // before the melee chips; against the Candy, a Crashed target and a
      // Bounce.
      if (context.candy && actor !== undefined && targetUnit !== undefined) {
        const candy = candyAttackAdjustmentV7(
          context,
          actor,
          targetUnit,
          preview,
          priority,
        );
        priority = candy.priority;
        strategicValue += candy.strategic;
      }
      // pulp_wars-9s0.8: the hunters' attacks on a hunted high-value unit.
      priority = huntAttackPriorityV7(context, command, preview, priority);
      // Tuning 6 (`pulp_wars-w49.6`): the assault and the retaken center.
      if (context.army && actor !== undefined && targetUnit !== undefined) {
        const army = armyAttackValueV7(
          context,
          actor,
          targetUnit,
          preview,
          priority,
        );
        priority = army.priority;
        strategicValue += army.strategic;
      }
      // pulp_wars-68k.6: focused fire, then the committed melee attack.
      priority = chokepointAttackPriorityV7(
        context,
        command,
        preview,
        priority,
      );
      // Map curiosities (`pulp_wars-737.4`): the kill of a Monster is worth
      // its bounty on top of the ordinary kill value.
      if (
        preview.defenderDies &&
        context.curiosities?.monsterById.has(command.targetUnitId) === true
      )
        strategicValue += MONSTER_BOUNTY_FOR_POLICY_V7;
    }
  }

  // Dwarf crowd control (`pulp_wars-w49.33`): a Whirligig Whirls instead of
  // attacking one unit (its Whirl hits every adjacent enemy, unanswered, and
  // is offered whenever such an attack is). Scored like an attack on the
  // sum of its hits; not tuned.
  if (
    command.kind === "ATTACK" &&
    actor !== undefined &&
    actor.form === "LAND" &&
    unitRoleMechanicsV7(view, actor).whirl
  )
    priority = -1;
  if (command.kind === "WHIRL") {
    const whirl = previewWhirlV7(view, command.unitId);
    if (whirl !== null && whirl.targets.length > 0) {
      const threatening = whirl.targets.some((target) =>
        context.threats.some((item) => item.unitId === target.unitId),
      );
      priority =
        whirl.kills > 0
          ? threatening
            ? 1280
            : 1180
          : threatening
            ? 1240
            : 900;
      immediateValue = whirl.targets.reduce(
        (value, target) =>
          value + 10 * target.damage + 20 * Number(target.dies),
        0,
      );
      strategicValue = whirl.targets.reduce(
        (value, target) =>
          target.dies
            ? value + targetStrategicValue(view, target.unitId, context.lookup)
            : value,
        0,
      );
    }
  }

  if (command.kind === "COLD_SNAP" && context.iceFolk) {
    const snap = coldSnapScoreV7(iceFolkCacheV7(context).tools, command);
    priority = snap.priority;
    strategicValue = snap.strategic;
    immediateValue = snap.immediate;
  }

  if (command.kind === "THROW_BOLAS" && context.iceFolk) {
    const bolas = bolasScoreV7(
      iceFolkCacheV7(context).tools,
      command,
      iceFolkSledKillsV7(context, command.unitId),
    );
    priority = bolas.priority;
    strategicValue = bolas.strategic;
    immediateValue = bolas.immediate;
    // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the Bolas of a
    // combined kill (`iceFolkShatterHuntV7`) is thrown at its target, before
    // the hunters strike; the Sled of such a kill throws at no other unit,
    // and a Sled that is one of its hunters keeps its action for its blow.
    const thrown = iceFolkBolasPlanV7(context, command.unitId);
    if (thrown !== undefined) {
      if (thrown.target.id === command.targetUnitId) {
        priority = BOLAS_SHATTER_PRIORITY_V7;
        strategicValue = Math.max(
          strategicValue,
          targetStrategicValue(view, command.targetUnitId, context.lookup),
        );
      } else priority = -1;
    } else if (
      armyIceFolkSeatV7(context) &&
      priority < BOLAS_SHATTER_PRIORITY_V7 &&
      huntOfV7(context, command.unitId) !== undefined
    )
      priority = -1;
  }

  if (
    (command.kind === "TUNNEL" ||
      command.kind === "BOMB_RUN" ||
      command.kind === "ASSEMBLE") &&
    dwarfUnitPlayV7(context, actor)
  ) {
    // The Dwarf revision (`pulp_wars-78i.4`): the Mole, the Gyrocopter, and
    // the Engineer's Assemble.
    const dwarf = dwarfCommandScoreV7(context, command);
    priority = dwarf.priority;
    strategicValue = dwarf.strategic;
    immediateValue = dwarf.immediate;
  }

  if (command.kind === "SUGAR_RUSH" && context.candy) {
    // The Candy revision (`pulp_wars-jdb.4`): Rush for a reason.
    const plan = candyRushPlanV7(context, command.unitId);
    priority = plan?.priority ?? -1;
    strategicValue = plan?.strategic ?? 0;
  }

  if (command.kind === "REBAKE" && context.candy) {
    const rebake = rebakeScoreV7(candyCacheV7(context).tools, command);
    priority = rebake.priority;
    strategicValue = rebake.strategic;
    immediateValue = rebake.immediate;
  }

  if (command.kind === "SUGAR_TOSS" && context.candy) {
    const toss = sugarTossScoreV7(candyCacheV7(context).tools, command);
    priority = toss.priority;
    strategicValue = toss.strategic;
    immediateValue = toss.immediate;
  }

  if (command.kind === "BEAM_DOWN" && context.martian) {
    const beam = martianBeamDownScoreV7(context, command);
    priority = beam.priority;
    strategicValue = beam.strategic;
    immediateValue = beam.immediate;
  }

  if (command.kind === "MIND_CONTROL" && context.martian) {
    const control = mindControlScoreV7(martianCacheV7(context).tools, command);
    priority = control.priority;
    strategicValue = control.strategic;
    immediateValue = control.immediate;
  }

  if (command.kind === "TRACTOR_BEAM" && context.martian) {
    const pull = tractorBeamScoreV7(
      martianCacheV7(context).tools,
      command,
      (center) => martianCapturerCanEnterV7(context, center),
    );
    priority = pull.priority;
    strategicValue = pull.strategic;
    immediateValue = pull.immediate;
  }

  if (command.kind === "TEND_WOUNDED" && actor !== undefined) {
    const targets = view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.id !== actor.id &&
        unit.form === "LAND" &&
        unit.hp < unit.maxHp &&
        !unit.activation.tendedThisTurn &&
        distance(unit.at, actor.at) === 1,
    );
    immediateValue = sum(
      targets.map((target) => Math.min(2, target.maxHp - target.hp) * 8),
    );
    priority = targets.some((target) =>
      context.threats.some(
        (item) => item.cityId === cityAt(view, target.at, context.lookup)?.id,
      ),
    )
      ? 1270
      : 650;
    if (context.undead) {
      // Revision 14: Tend also cures Plague and Bitten (exact preview).
      // Revision 15: a Plague cure is worth its remaining turns, and one
      // with a single turn left (2 HP) is no more urgent than a heal.
      const tend = publicTendValueV7(view, context.afflictions, actor);
      immediateValue =
        tend.heal * 8 +
        tend.plagueTurns * TEND_PLAGUE_TURN_CURE_VALUE_V7 +
        tend.bittenCures * TEND_BITTEN_CURE_VALUE_V7;
      if (tend.plagueTurns >= PLAGUE_TURNS_WORTH_CURING_V7)
        priority = Math.max(priority, tend.plagueTurns >= 5 ? 1272 : 1262);
      else if (tend.bittenCures > 0) priority = Math.max(priority, 1175);
    }
    // The Dwarf revision (`pulp_wars-78i.4`): Repair heals machines 4 and
    // values HP on a construct double; machines are repaired before the
    // chips, so the mended units fight at their new strength.
    // The Mind Control revision (section 8): by the Engineer's kind (a
    // controlled Engineer repairs, though it cannot Assemble).
    if (
      dwarfUnitPlayV7(context, actor) &&
      (unitRoleRuleV7(view, actor).abilities.includes("ASSEMBLE") ||
        (mindControlPlayV7() &&
          unitRoleMechanicsV7(view, actor).repairMachineHeal !== null))
    ) {
      const repair = repairValueV7(view, dwarfCacheV7(context).facts, actor);
      immediateValue = repair.value * 8;
      if (repair.machineHeal >= MACHINE_REPAIR_MINIMUM_V7)
        priority = Math.max(priority, MACHINE_REPAIR_PRIORITY_V7);
    }
  }

  if (command.kind === "RALLY" && actor !== undefined) {
    // Revision 17: the owner's Rally reach; `pulp_wars-w49.35`: the Orc
    // Warboss's Berserk (radius 2, unmoved units of any role) is scored by
    // `waaaghValueV7` as WAAAGH! was (no AI tuning in that bead).
    const targets = view.units.filter((unit) =>
      isRallyTargetV7(view, actor, unit),
    );
    strategicValue = targets.length * 12;
    priority = targets.length >= 2 ? 1235 : 720;
    // The Mind Control revision (section 8): by the commander's kind (a
    // controlled Necromancer Frenzies, a controlled Warboss calls WAAAGH!).
    const kind = policyUnitFactionV7(view, actor);
    if (kind === "UNDEAD") {
      const frenzy = undeadFrenzyValueV7(context, actor);
      strategicValue = frenzy.strategic;
      priority = frenzy.priority;
    } else if (kind === "GOBLIN") {
      const waaagh = waaaghValueV7(context, actor);
      strategicValue = waaagh.strategic;
      priority = waaagh.priority;
    } else if (kind === "MARTIAN" && context.martian) {
      // The Martian revision: Psychic Command only for adjacent units that
      // can still attack (the Frenzy rule), and Mind Control first.
      const command = undeadFrenzyValueV7(context, actor);
      strategicValue = command.strategic;
      priority = martianCacheV7(context).mindControllers.has(actor.id)
        ? Math.min(command.priority, PSYCHIC_COMMAND_DEFERRED_PRIORITY_V7)
        : command.priority;
    }
  }

  if (command.kind === "RAISE_DEAD" && actor !== undefined) {
    // Revision 13: each eligible Grave rises as a free 5-HP Skeleton.
    const risen = raiseDeadCountV7(view, actor.id);
    // Revision 14 AI fix: a 5-HP Skeleton raised inside visible lethal reach
    // is a free kill for the enemy (the feeding loop); raise only when at
    // least one Skeleton survives or screens a threatened own city.
    const doomed = raiseDeadGravesV7(view, actor.id).filter((grave) =>
      raisedSkeletonDoomedV7(context, actor, grave),
    ).length;
    const safe = risen - doomed;
    priority = safe > 0 ? 1237 : -1;
    strategicValue = safe * RAISE_DEAD_SKELETON_VALUE_V7 - doomed * 6;
    immediateValue = risen * 5;
  }

  if (command.kind === "DEVOUR" && actor !== undefined) {
    const devour = undeadDevourValueV7(context, actor);
    priority = devour.priority;
    strategicValue = devour.strategic;
    immediateValue = devour.heal * 8;
  }

  // The ninth unit (`pulp_wars-w49.17`, 7r55): a Raise Dead or a Devour
  // that would consume the Grave an own Wight climbs out of is held, unless
  // an enemy could stand on that Grave first (`ownWightGraveHeldV7`).
  if (
    (command.kind === "RAISE_DEAD" || command.kind === "DEVOUR") &&
    actor !== undefined &&
    view.ninthUnit.wightGraves.length > 0 &&
    ownWightGraveHeldV7(
      view,
      command.kind === "DEVOUR"
        ? [actor.at]
        : raiseDeadGravesV7(view, actor.id),
      (owner) => isHostile(view, owner),
    )
  )
    priority = -1;

  if (command.kind === "WAIL" && actor !== undefined) {
    const wail = offeredWailSummaryV7(view, actor.id, (unit) =>
      targetStrategicValue(view, unit.id, context.lookup),
    );
    priority = wailPriorityV7(wail);
    // Tuning 7 (`pulp_wars-w49.10`): a committed Banshee Wails whenever a
    // target is in range, before the melee units strike.
    if (priority >= 0 && armyModeV7(context, actor) === "COMMIT")
      priority = Math.max(priority, ARMY_COMMIT_FIRE_PRIORITY_V7);
    immediateValue = wail.value;
    strategicValue = wail.kills * 10 + wail.graves * 4;
    if (
      context.threats.some((threat) =>
        view.units.some(
          (unit) =>
            unit.id === threat.unitId &&
            distance(unit.at, actor.at) <= WAIL_THREAT_RADIUS_V7 &&
            isLivingOwnerV7(view, unit.ownerId),
        ),
      )
    )
      strategicValue += 10;
  }

  if (command.kind === "RECOVER") {
    priority = (actor?.hp ?? 0) * 2 < (actor?.maxHp ?? 0) ? 400 : 300;
    immediateValue =
      actor === undefined ? 0 : Math.min(2, actor.maxHp - actor.hp) * 8;
    if (actor !== undefined && actor.hp * 2 < actor.maxHp) priority = 930;
    // The Martian pass (`pulp_wars-w49.14`): an army seat's Saucer does
    // not recover inside the reach of visible enemies; it flies out first
    // (`ARMY_CARRIER_KEEP_OUT_PRIORITY_V7`).
    if (
      actor !== undefined &&
      context.army &&
      context.martian &&
      actor.ownerId === view.viewer.id &&
      isSaucerForPolicyV7(view, actor) &&
      visibleImmediateDamage(view, actor, actor.at, context) > 0
    )
      priority = Math.min(priority, 300);
    // Revision 17: a regenerating Troll keeps fighting until a quarter HP.
    if (
      actor !== undefined &&
      context.goblin &&
      regenerationV7(view, actor) > 0 &&
      actor.hp * 4 >= actor.maxHp
    )
      priority = 300;
    // Revision 19: a grown unit heals earlier (below two thirds of its HP).
    if (
      actor !== undefined &&
      context.dinosaur &&
      growthStageForPolicyV7(view, actor) > 0 &&
      actor.hp * 3 < actor.maxHp * 2
    )
      priority = 930;
  }

  if (command.kind === "PROMOTE") {
    // Revision 20: a promotion fully heals, so a wounded eligible unit is
    // promoted before any attack or capture (1400) and before the turn ends.
    priority =
      actor !== undefined && actor.hp < actor.maxHp
        ? WOUNDED_PROMOTE_PRIORITY_V7
        : 1320;
    immediateValue = 40;
  }

  if (command.kind === "CAPTURE") {
    const city =
      actor === undefined ? undefined : cityAt(view, actor.at, context.lookup);
    const neutral = city === undefined;
    const finalHostileCity =
      city !== undefined && captureEndsMatchV7(view, city.ownerId);
    priority = finalHostileCity ? 1400 : neutral ? 1340 : 1360;
    immediateValue = neutral ? 30 : 60;
    if (
      !neutral &&
      city !== undefined &&
      view.viewer.researchedTechs.includes("DRILL") &&
      !view.viewer.spoilsClaimedCityIds.includes(city.id)
    )
      immediateValue += 2;
    if (city !== undefined && view.viewer.researchedTechs.includes("DRILL"))
      strategicValue += 6;
  }

  if (command.kind === "MOVE" && actor !== undefined) {
    const autoembark = isAutoembarkMoveV7(context, command);
    const chest = view.treasureChests.some((at) => same(at, resultAt));
    // pulp_wars-9s0.1: a Raider pickets its richest city only while a threat
    // to an own city is visible (it used to orbit that city all game), and a
    // screen does not walk away from its campaign job to stand by a unit.
    const campaign = context.tactical.campaign;
    const routeProgress =
      resultAt === null
        ? null
        : campaignRouteProgressV7(campaign, actor, resultAt);
    const picket =
      routeProgress === null || context.threats.length > 0
        ? scoutPicketValue(view, actor, resultAt)
        : 0;
    const screen =
      routeProgress !== null && routeProgress < 0
        ? 0
        : screenValue(view, actor, resultAt);
    if (chest) {
      priority = 1330;
      strategicValue = 1;
      immediateValue = 5;
    } else if (movesOntoThreatenedCity(context, resultAt)) {
      priority = 1250;
      // The Undead pass, correction: of an Undead seat's units that can
      // step onto the center, the best garrison goes (a Skeleton stepped
      // on with a Zombie beside it).
      if (armyOpeningSeatV7(context) && resultAt !== null)
        strategicValue += Math.min(
          ARMY_CENTER_HOLDER_VALUE_MAXIMUM_V7,
          armyDefenderWorthV7(
            context,
            resultAt,
            unitRoleRuleV7(view, actor),
            unitRoleMechanicsV7(view, actor),
            actor.hp,
          ),
        );
    } else {
      objectiveValue = tacticalMovementObjectiveValueV7(
        context,
        actor,
        resultAt,
      );
      const reveal = publicRevealGain(view, actor, resultAt, context.lookup);
      priority = objectiveValue > 0 ? 700 : reveal > 0 ? 600 : -1;
      strategicValue = picket + screen;
      if (strategicValue > 0) priority = Math.max(priority, 710);
      // pulp_wars-9s0.1: a wave forms at home before it sets out; tactical
      // Moves below (a capture, a kill setup) still apply.
      if (resultAt !== null && campaignHoldsMoveV7(campaign, actor, resultAt)) {
        priority = -1;
        strategicValue = 0;
      }
      if (context.naval.active) {
        const navalValue = navalMovementObjectiveValueV7(
          context,
          actor,
          resultAt,
          command.path.length,
        );
        if (navalValue > 0) {
          objectiveValue += navalValue;
          priority = Math.max(
            priority,
            actor.form === "EMBARKED"
              ? 1230
              : actor.form === "NAVAL"
                ? 830
                : 820,
          );
        }
      }
      const windmillGain = windmillStagingGainV7(view, actor, resultAt);
      if (windmillGain > 0) {
        priority = Math.max(
          priority,
          actor.hp * 2 < actor.maxHp &&
            !(
              context.goblin &&
              regenerationV7(view, actor) > 0 &&
              actor.hp * 4 >= actor.maxHp
            )
            ? 940
            : 715,
        );
        strategicValue += windmillGain;
      }
      const destinationCity =
        resultAt === null ? undefined : cityAt(view, resultAt, context.lookup);
      if (
        destinationCity !== undefined &&
        isHostile(view, destinationCity.ownerId) &&
        unitRoleRuleV7(view, actor).abilities.includes("CAPTURE")
      ) {
        priority = Math.max(priority, 1290);
        strategicValue += 30;
        // Tuning 8 (`pulp_wars-w49.11`): of the units that can step onto
        // the center, the one that holds it best (HP times Defense) goes:
        // it has to live through the enemy's turn to capture. (An Undead
        // seat stepped a Skeleton onto a center three turns running, with
        // a Zombie beside it, and lost each one.) The enemy retakes a
        // center with whatever it has, so the Defense is the mean of the
        // one hand to hand and the one against shots.
        if (context.army && resultAt !== null) {
          const rule = unitRoleRuleV7(view, actor);
          const mechanics = unitRoleMechanicsV7(view, actor);
          // The Undead pass (`pulp_wars-w49.13`): a Defense that is higher
          // only against shots (a Skeleton's Bones) counts as the unit's
          // own here: a center is retaken hand to hand, and the Zombie
          // beside the Skeleton is still the one that holds it.
          const hand = roleDefense2AtDistanceV7(rule, mechanics, 1);
          strategicValue += Math.min(
            ARMY_CENTER_HOLDER_VALUE_MAXIMUM_V7,
            Math.floor(
              (actor.hp *
                (hand +
                  Math.min(
                    hand,
                    roleDefense2AtDistanceV7(rule, mechanics, 2),
                  ))) /
                (2 * ARMY_CENTER_HOLDER_WORTH_V7),
            ),
          );
        }
      }
      const assigned = context.tactical.objectiveByUnitId.get(actor.id);
      if (
        assigned !== undefined &&
        policySiegeRuleV7(unitRoleRuleV7(view, actor)) &&
        resultAt !== null &&
        distance(resultAt, assigned) >= 2 &&
        distance(resultAt, assigned) <= 3 &&
        hasReachableScreenAtV7(context, actor, resultAt)
      )
        priority = Math.max(priority, 735);
    }
    if (actor.activation.escapeAvailable) {
      const retreat = raiderEscapeRetreatValueV7(context, actor, resultAt);
      if (retreat === null) priority = -1;
      else if (retreat > 0) {
        priority = Math.max(priority, 1195);
        strategicValue += retreat;
      }
    }
    // Tuning 5 (`pulp_wars-w49.4`): army play (`src/ai/v7-army.ts`).
    if (context.army && resultAt !== null && !autoembark && !chest) {
      const army = armyMoveValueV7(context, actor, resultAt, priority);
      priority = army.priority;
      strategicValue += army.strategic;
    }
    if (autoembark) {
      priority = Math.max(priority, 1300);
      strategicValue += unitRoleRuleV7(view, actor).abilities.includes(
        "CAPTURE",
      )
        ? 50
        : 5;
    }
    if (
      actor.role === "KNIGHT" &&
      actor.form === "LAND" &&
      precomputedKnightOverrun !== undefined &&
      // Tuning 8: a spent fast unit has no kill on offer; it pulls back.
      !armySpentV7(context, actor)
    ) {
      immediateValue += precomputedKnightOverrun.immediate;
      strategicValue += precomputedKnightOverrun.strategic;
      safetyValue = precomputedKnightOverrun.safety;
      objectiveValue += precomputedKnightOverrun.spacing;
      priority = Math.max(
        priority,
        precomputedKnightOverrun.strategic > 0 ? 1175 : 905,
      );
    }
    const destinationTile =
      resultAt === null ? undefined : findPublicTileV7(view, resultAt);
    if (
      actor.form === "NAVAL" &&
      destinationTile?.explored === true &&
      destinationTile.improvement === "PORT" &&
      destinationTile.territoryOwnerId !== null &&
      isHostile(view, destinationTile.territoryOwnerId)
    ) {
      // A visible Port always attributes one live population to its city. Its
      // owner's private trade network is deliberately not predicted.
      strategicValue += 18;
      priority = Math.max(priority, 850);
    }
    if (context.endgame !== null && resultAt !== null) {
      const endgame = endgameMoveValueV7(context, actor, resultAt, priority);
      priority = endgame.priority;
      strategicValue += endgame.strategic;
    }
    if (context.chokepoint !== null && resultAt !== null && !autoembark) {
      // pulp_wars-68k.6: the head, the siege slots, and the way out.
      const siegeMove = chokepointMoveValueV7(
        context,
        actor,
        resultAt,
        priority,
      );
      priority = siegeMove.priority;
      strategicValue += siegeMove.strategic;
    }
    if (context.undead && resultAt !== null) {
      const undead = undeadMoveValueV7(
        context,
        actor,
        resultAt,
        priority,
        autoembark,
      );
      priority = undead.priority;
      strategicValue += undead.strategic;
      objectiveValue += undead.objective;
      const hunt = plagueHuntMoveValueV7(context, actor, resultAt, priority);
      priority = hunt.priority;
      strategicValue += hunt.strategic;
      const plague = afflictionMoveValueV7(context, actor, resultAt, priority);
      priority = plague.priority;
      strategicValue += plague.strategic;
    }
    if (context.goblin && resultAt !== null) {
      const goblin = goblinMoveValueV7(context, actor, resultAt, priority);
      priority = goblin.priority;
      strategicValue += goblin.strategic;
    }
    if (context.dinosaur && resultAt !== null) {
      // Revision 19: Eggs, growth (`pulp_wars-c87.5`); revision 20: the
      // Charge! run-up.
      const dinosaur = dinosaurMoveValueV7(
        context,
        actor,
        resultAt,
        priority,
        command.path.length,
      );
      priority = dinosaur.priority;
      strategicValue += dinosaur.strategic;
    }
    if (context.martian && resultAt !== null) {
      // The Martian revision (`pulp_wars-t6s.3`).
      const martian = martianMoveValueV7(context, actor, resultAt, priority);
      priority = martian.priority;
      strategicValue += martian.strategic;
    }
    if (context.iceFolk && resultAt !== null) {
      // The Ice Folk revision (`pulp_wars-7g3.4`).
      const ice = iceFolkMoveValueV7(
        context,
        command,
        actor,
        resultAt,
        priority,
      );
      priority = ice.priority;
      strategicValue += ice.strategic;
      objectiveValue = objectiveValue * ice.objectiveScale + ice.objective;
    }
    if (context.dwarf && resultAt !== null) {
      // The Dwarf revision (`pulp_wars-78i.4`).
      const dwarf = dwarfMoveValueV7(context, actor, resultAt, priority);
      priority = dwarf.priority;
      strategicValue += dwarf.strategic;
    }
    if (context.candy && resultAt !== null) {
      // The Candy revision (`pulp_wars-jdb.4`).
      const candy = candyMoveValueV7(
        context,
        actor,
        resultAt,
        priority,
        objectiveValue,
      );
      priority = candy.priority;
      strategicValue += candy.strategic;
      objectiveValue += candy.objective;
    }
    // The ninth unit (`pulp_wars-w49.17`, 7r55): where an Ogre, a Shock
    // Trooper, and a Whirligig stand, and the Grave of a Wight (0 for every
    // other unit on a board without a marked Grave).
    if (resultAt !== null && !autoembark)
      strategicValue += ninthUnitMoveValueV7(view, actor, resultAt, (owner) =>
        isHostile(view, owner),
      );
    // pulp_wars-9s0.8: move in for a kill on a high-value unit.
    if (resultAt !== null && !autoembark) {
      const hunt = huntMoveValueV7(context, actor, resultAt, priority);
      if (hunt !== null) {
        priority = hunt.priority;
        strategicValue += hunt.strategic;
      }
    }
    // Map curiosities (`pulp_wars-737.4`): the Fountain, the Shrine, the
    // Wreck, and the step away from the Spider.
    if (context.curiosities !== null && resultAt !== null) {
      const curiosity = curiosityMoveValueV7(
        context,
        context.curiosities,
        actor,
        resultAt,
        priority,
      );
      priority = curiosity.priority;
      strategicValue += curiosity.strategic;
    }
  }

  if (command.kind === "PILLAGE" && actor !== undefined) {
    const live = visibleImprovementValueAt(view, actor.at, context.lookup);
    const survival = visibleImmediateDamage(view, actor, actor.at, context);
    strategicValue = 12 * (live ?? 0) + 1 - survival;
    immediateValue = 1 + 5 * (live ?? 0);
    priority = strategicValue > 0 ? 1170 : -1;
    // pulp_wars-1mc: in the endgame a capturer approaches first; Pillage
    // (which may follow a Move) no longer spends its turn far from the siege.
    if (endgameCapturerShouldApproachV7(context, actor)) priority = -1;
    // Tuning 8 (`pulp_wars-w49.11`): nor does a stormer, nor a unit on a
    // hostile center it is about to capture.
    if (context.army && armyStormV7(context).byUnit.has(actor.id))
      priority = -1;
  }

  if (command.kind === "DISBAND" && actor !== undefined) {
    immediateValue = Math.floor((unitRoleRuleV7(view, actor).cost ?? 0) / 2);
    strategicValue = freeCapacity(view, actor.homeCityId) <= 0 ? 6 : 0;
    // Revision 19: an abandoned Egg frees the slot a defender needs now.
    priority = actor.form === "EGG" ? EGG_ABANDON_PRIORITY_V7 : 1090;
    // The Mind Control revision (section 4.1): a controlled unit is never
    // disbanded (the engine never offers it; the policy never asks).
    if (isMindControlledV7(view, actor.id)) priority = -1;
  }

  // The correction pass of tuning 6: a Mountain beside a held gate is
  // blasted before the column attacks (the filter allowed only this one
  // outside the own territory).
  if (command.kind === "BLAST_MOUNTAIN" && context.chokepoint !== null) {
    const tile = findPublicTileV7(view, command.at);
    const blast = previewBlastMountainV7(view, command.at);
    if (
      tile?.explored === true &&
      tile.territoryOwnerId !== view.viewer.id &&
      blast !== null &&
      chokepointBlastV7(context, command.at, blast.totals.hostileDamage)
    ) {
      priority = Math.max(priority, CHOKEPOINT_FIRE_PRIORITY_V7 + 2);
      strategicValue += 4 * blast.totals.hostileDamage;
    }
  }

  if (command.kind === "KABOOM" && actor !== undefined && context.goblin) {
    // Revision 17: Kaboom by previewed net value (`pulp_wars-0ao.6`).
    const kaboom = kaboomScoreV7(context, actor);
    priority = kaboom.priority;
    strategicValue = kaboom.strategic;
    immediateValue = kaboom.immediate;
  }

  if (command.kind === "END_TURN") priority = 0;

  // Revision 16 (section 3.6 rule 2): while a growth harvest of the level-1
  // original capital is ready, research, training, and construction wait
  // below it; tactical actions keep their priorities.
  if (
    context.openingGrowthHarvest &&
    priority >= NORMAL_GROWTH_HARVEST_PRIORITY_V7 &&
    (command.kind === "RESEARCH" ||
      command.kind === "TRAIN" ||
      command.kind === "TRAIN_NAVAL" ||
      command.kind === "LAY_EGG" ||
      command.kind.startsWith("BUILD_"))
  )
    priority = NORMAL_GROWTH_HARVEST_PRIORITY_V7 - 1;

  safetyValue +=
    actor === undefined ||
    resultAt === null ||
    command.kind === "ATTACK" ||
    command.kind === "KABOOM" ||
    command.kind === "HATCH" ||
    (command.kind === "MOVE" &&
      actor.role === "KNIGHT" &&
      precomputedKnightOverrun !== undefined)
      ? 0
      : -visibleImmediateDamage(view, actor, resultAt, context);
  const tie = readyTuple.slice(-5) as [number, number, number, number, number];
  return {
    priority,
    strategicValue,
    immediateValue,
    futureValue,
    safetyValue,
    objectiveValue,
    deterministicTieBreak: tie,
  };
}

/**
 * Revision 13 Frenzy (the Undead Rally): only adjacent attack-capable units
 * that can still attack a visible enemy this turn benefit; a Frenzy with no
 * such unit is not worth the Necromancer's action.
 */
function undeadFrenzyValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  let eligible = 0;
  let useful = 0;
  for (const unit of view.units) {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.id === actor.id ||
      unit.form !== "LAND" ||
      unit.activation.inspired ||
      unit.activation.attacked ||
      unit.activation.handled ||
      distance(unit.at, actor.at) !== 1
    )
      continue;
    const rule = unitRoleRuleV7(view, unit);
    if (
      !rule.abilities.includes("ATTACK") ||
      rule.tacticalRole === "SUPPORT" ||
      rule.tacticalRole === "SIEGE"
    )
      continue;
    eligible += 1;
    const reach =
      rule.range +
      (!unit.activation.moved && unitMayActAfterMoveV7(view, unit)
        ? rule.move
        : 0);
    if (
      context.lookup.visibleHostiles.some(
        (hostile) => distance(hostile.at, unit.at) <= reach,
      )
    )
      useful += 1;
  }
  return {
    priority: useful >= 2 ? 1235 : useful === 1 ? 1190 : -1,
    strategic: useful * 12 + (eligible - useful) * 2,
  };
}

/**
 * Revision 13 Devour: heal a wounded Ghoul, or deny a Grave that a hostile
 * Necromancer could raise. A small heal leaves the Grave to an own
 * Necromancer nearby.
 */
function undeadDevourValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly heal: number;
} {
  const view = context.view;
  const heal = devourHealV7(view, actor.id);
  if (heal === null) return { priority: -1, strategic: 0, heal: 0 };
  const deny =
    hostileNecromancersNearV7(view, actor.at, (owner) => isHostile(view, owner))
      .length > 0;
  const ownNecromancer = ownNecromancersNearV7(view, actor.at).length > 0;
  const strategic = heal * 8 + (deny ? 20 : 0);
  if (heal >= DEVOUR_MINIMUM_HEAL_V7 || deny)
    return { priority: 1176, strategic, heal };
  if (heal > 0 && !ownNecromancer) return { priority: 640, strategic, heal };
  return { priority: -1, strategic, heal };
}

/**
 * Revision 13 movement: Grave denial for every seat; for an Undead viewer,
 * Necromancer Grave approach and protection, Ghoul Devour approach, Banshee
 * Wail positioning, and Restless retreat to own territory.
 */
function undeadMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  basePriority: number,
  embarks = false,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly objective: number;
} {
  const view = context.view;
  let priority = basePriority;
  let strategic = 0;
  let objective = 0;
  const hostile = (owner: PlayerId) => isHostile(view, owner);
  let dangerThere: number | null = null;
  const danger = (): number =>
    (dangerThere ??= visibleImmediateDamage(view, actor, to, context));
  // Standing on a Grave keeps it from a hostile Necromancer (occupied Graves
  // never rise); this is cheap Grave denial for any faction.
  if (
    actor.form === "LAND" &&
    isGraveAtV7(view, to) &&
    hostileNecromancersNearV7(view, to, hostile, 2).length > 0
  )
    strategic += 4;
  // The Mind Control revision (section 8): the mover's kind plays it.
  const undeadKind = policyUnitFactionV7(view, actor) === "UNDEAD";
  if (undeadKind && isVampireV7(view, actor)) {
    const vampire = vampireMoveValueV7(context, actor, to, priority, embarks);
    priority = vampire.priority;
    strategic += vampire.strategic;
  }
  // pulp_wars-vkq.21: embarked Liches sailed into Battleship and Patrol Boat
  // reach one after another on naval maps; afloat, a Lich keeps the same
  // rule as on land (never into visible lethal reach unless strictly safer).
  if (
    undeadKind &&
    actor.form === "EMBARKED" &&
    isLichRoleV7(view, actor) &&
    danger() >= actor.hp &&
    danger() >= visibleImmediateDamage(view, actor, actor.at, context)
  )
    priority = -1;
  if (!undeadKind || actor.form !== "LAND")
    return { priority, strategic, objective };
  const primaryReady = isPrimaryUnusedV7(actor);

  // A Ghoul already on a Grave Devours in place instead of moving.
  if (
    isGhoulV7(view, actor) &&
    primaryReady &&
    isGraveAtV7(view, to) &&
    !isGraveAtV7(view, actor.at)
  ) {
    const heal = actor.maxHp - actor.hp;
    const deny = hostileNecromancersNearV7(view, to, hostile).length > 0;
    if ((heal >= DEVOUR_MINIMUM_HEAL_V7 || deny) && danger() < actor.maxHp) {
      priority = Math.max(priority, 1177);
      strategic += heal * 4 + (deny ? 20 : 0);
    }
  }

  if (isBansheeV7(view, actor) && primaryReady) {
    const unitValue = (unit: PublicUnitV7) =>
      targetStrategicValue(view, unit.id, context.lookup);
    const there = projectedWailSummaryV7(view, actor, to, unitValue);
    const band = wailPriorityV7(there);
    if (band >= 0) {
      const here = projectedWailSummaryV7(view, actor, actor.at, unitValue);
      // Tuning 7: a committed Banshee goes where it can Wail (five of
      // them made two Wails in ten rounds), though not under a hostile
      // melee unit, and before the melee units strike, like a shot.
      const committed =
        armyModeV7(context, actor) === "COMMIT" &&
        ((armyMeleeReachV7(context).get(coordKey(to)) ?? 0) === 0 ||
          // (Its Wail reaches no farther than a melee unit walks: behind
          // a line unit of its own it goes in.)
          armyScreenedV7(context, actor, to));
      // The Undead pass (`pulp_wars-w49.13`): a Banshee of an army seat
      // also steps up to a Wail on two or more units (or a kill) when the
      // seat has not committed: behind an own melee unit, whatever comes
      // back (a 3-Coin unit that draws two attacks has paid for itself;
      // five Banshees held back made two Wails in ten rounds).
      const screenedWail =
        context.army && band > 905 && armyScreenedV7(context, actor, to);
      if (
        there.value > here.value &&
        (committed ||
          screenedWail ||
          (band > 905 ? danger() < actor.hp : danger() * 2 < actor.hp))
      ) {
        priority = Math.max(
          priority,
          band + 1,
          committed ? ARMY_COMMIT_FIRE_MOVE_PRIORITY_V7 : 0,
        );
        strategic += there.value - here.value;
      }
    }
  }

  // The Undead pass, correction: a Banshee near a fight walks up. With a
  // hostile land unit within `ARMY_BANSHEE_APPROACH_RADIUS_V7` and none
  // within three tiles, its Move toward the nearest one, to a
  // tile no visible enemy reaches or behind an own melee unit, is a Move
  // worth making. (One of two Banshees sat out seven rounds.)
  if (isBansheeV7(view, actor) && armyUndeadSeatV7(context)) {
    const hostiles = armyHostilesV7(context).map((unit) => unit.at);
    if (hostiles.length > 0) {
      const from = nearestDistance(actor.at, hostiles);
      const next = nearestDistance(to, hostiles);
      // (From three tiles its next step is into Wail range, which the
      // rules above and the army's advance decide: this one is for the
      // Banshee that is farther away.)
      // (And for one that belongs to no assault: a committed or staged
      // army moves its Banshees itself.)
      if (
        from > 3 &&
        from <= ARMY_BANSHEE_APPROACH_RADIUS_V7 &&
        armyModeV7(context, actor) === "NONE" &&
        next < from &&
        (danger() <= 0 ||
          (danger() < actor.hp && armyScreenedV7(context, actor, to)))
      ) {
        priority = Math.max(priority, ARMY_BANSHEE_APPROACH_PRIORITY_V7);
        objective += 2 * (from - next);
      }
    }
  }

  // Restless: a unit at half HP or less recovers only in its own territory.
  if (
    actor.hp * 2 <= actor.maxHp &&
    !inOwnTerritoryForPolicyV7(view, view.viewer.id, actor.at)
  ) {
    if (inOwnTerritoryForPolicyV7(view, view.viewer.id, to)) {
      priority = Math.max(priority, 935);
      strategic += actor.maxHp - actor.hp;
    } else {
      const ownCities = view.cities
        .filter((city) => city.ownerId === view.viewer.id)
        .map((city) => city.at);
      const progress =
        ownCities.length === 0
          ? 0
          : nearestDistance(actor.at, ownCities) -
            nearestDistance(to, ownCities);
      if (progress > 0) {
        priority = Math.max(priority, 720);
        objective += 2 * progress;
      }
    }
  }

  // Revision 14: a Lich never walks into visible lethal reach unless that is
  // strictly safer than staying (fresh Liches stepping toward their siege
  // objective fed enemy Catapults one Lich a turn). One whose Plague holds
  // two or more hostile units (its death cures them all) also retreats out of
  // lethal reach.
  if (isLichV7(view, actor)) {
    const dangerHere = visibleImmediateDamage(view, actor, actor.at, context);
    // pulp_wars-vkq.21: an embarking step is judged afloat (see below).
    const dangerTo = embarks
      ? visibleImmediateDamage(
          view,
          { ...actor, form: "EMBARKED" },
          to,
          context,
        )
      : danger();
    // Tuning 7: a committed Lich advances under the enemy's shots (four of
    // them never fired once the defender had Catapults), but not under a
    // hostile melee unit.
    const committed =
      !embarks &&
      armyModeV7(context, actor) === "COMMIT" &&
      (armyMeleeReachV7(context).get(coordKey(to)) ?? 0) === 0;
    if (dangerTo >= actor.hp && dangerTo >= dangerHere && !committed)
      priority = -1;
    const sourced = plagueSourceVictimsV7(
      view,
      context.afflictions,
      actor.id,
      hostile,
    );
    if (sourced >= 2) {
      if (danger() >= actor.hp) strategic -= 8 * sourced;
      else if (dangerHere >= actor.hp) {
        priority = Math.max(priority, 1150);
        strategic += 8 * sourced;
      }
    }
  }

  if (isNecromancerV7(view, actor)) {
    if (primaryReady) {
      const survivable = (at: CoordV7) =>
        raisableGravesAtV7(view, at, actor.id).filter(
          (grave) => !raisedSkeletonDoomedV7(context, actor, grave),
        ).length;
      const here = survivable(actor.at);
      const there = survivable(to);
      if (
        there > here &&
        (there >= 2 ? danger() < actor.hp : danger() * 2 < actor.hp)
      ) {
        priority = Math.max(priority, there >= 2 ? 1238 : 1160);
        strategic += there * RAISE_DEAD_SKELETON_VALUE_V7;
      } else if (here === 0 && there === 0 && danger() * 2 < actor.hp) {
        // Drift toward the nearest open Grave cluster behind the front.
        const open = view.graves.filter(
          (grave) =>
            !view.units.some(
              (unit) => unit.id !== actor.id && same(unit.at, grave),
            ),
        );
        const before = nearestDistance(actor.at, open);
        const progress = before <= 6 ? before - nearestDistance(to, open) : 0;
        if (progress > 0) {
          priority = Math.max(priority, 700);
          objective += 3 * progress;
        }
      }
    }
    // Protection: never walk the Necromancer into lethal visible danger
    // unless that is strictly safer than staying.
    if (
      danger() >= actor.hp &&
      danger() >= visibleImmediateDamage(view, actor, actor.at, context)
    )
      priority = -1;
  }
  return { priority, strategic, objective };
}

/**
 * Revision 14 Plague and Bitten movement for a living unit (any seat of a
 * match with an Undead seat): keep healthy units off tiles next to plagued
 * units, pull them away when they stand next to one, isolate a plagued unit
 * from healthy own and allied units, bring it to an own Captain, and bring a
 * Captain to plagued or bitten units it can cure this turn.
 */
function afflictionMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  basePriority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const afflictions = context.afflictions;
  let priority = basePriority;
  let strategic = 0;
  if (
    (afflictions.plagued.size === 0 && afflictions.bitten.size === 0) ||
    !isLivingOwnerV7(view, actor.ownerId)
  )
    return { priority, strategic };
  const friendly = (owner: PlayerId) => !isHostile(view, owner);
  const garrison =
    cityAt(view, actor.at, context.lookup)?.ownerId === view.viewer.id;
  let dangerHere: number | null = null;
  let dangerThere: number | null = null;
  const saferOrEqual = () =>
    (dangerThere ??= visibleImmediateDamage(view, actor, to, context)) <=
    (dangerHere ??= visibleImmediateDamage(view, actor, actor.at, context));
  if (afflictions.plagued.size > 0) {
    // Revision 15: only a unit on its first plagued turn spreads, so only
    // such a unit isolates itself, and only spreaders are avoided.
    if (afflictions.spreading.has(actor.id)) {
      const here = healthyLivingNeighboursV7(
        view,
        afflictions,
        actor.at,
        actor.id,
        friendly,
      );
      const there = healthyLivingNeighboursV7(
        view,
        afflictions,
        to,
        actor.id,
        friendly,
      );
      strategic += PLAGUE_EXPOSURE_COST_V7 * (here - there);
      if (there > here && basePriority < 1100) priority = -1;
      else if (there < here && !garrison && saferOrEqual())
        priority = Math.max(priority, 1150);
    }
    if (
      (afflictions.turnsRemaining.get(actor.id) ?? 0) >=
      PLAGUE_TURNS_WORTH_CURING_V7
    ) {
      const captainThere = view.units.some(
        (unit) =>
          unit.ownerId === actor.ownerId &&
          unit.id !== actor.id &&
          distance(unit.at, to) === 1 &&
          isPrimaryUnusedV7(unit) &&
          unitRoleRuleV7(view, unit).abilities.includes("TEND_WOUNDED"),
      );
      if (
        captainThere &&
        actor.form === "LAND" &&
        !garrison &&
        priority >= 0 &&
        saferOrEqual()
      ) {
        priority = Math.max(priority, 1155);
        strategic += 15;
      }
    } else if (!afflictions.plagued.has(actor.id)) {
      const here = plaguedNeighboursV7(view, afflictions, actor.at, actor.id);
      const there = plaguedNeighboursV7(view, afflictions, to, actor.id);
      if (there > 0) {
        strategic -= PLAGUE_EXPOSURE_COST_V7;
        if (here === 0 && basePriority < 1100) priority = -1;
      } else if (here > 0 && !garrison && saferOrEqual()) {
        priority = Math.max(priority, 1150);
        strategic += PLAGUE_EXPOSURE_COST_V7;
      }
    }
  }
  const rule = unitRoleRuleV7(view, actor);
  if (
    actor.form === "LAND" &&
    rule.abilities.includes("TEND_WOUNDED") &&
    isPrimaryUnusedV7(actor)
  ) {
    // Revision 15: a fresh Plague (3 turns) weighs 2, a bite 1.
    const cures = (at: CoordV7) => {
      const tend = publicTendValueV7(view, afflictions, actor, at);
      return (
        (2 * tend.plagueTurns) / PLAGUE_DURATION_TURNS_V7 + tend.bittenCures
      );
    };
    const gain = cures(to) - cures(actor.at);
    if (
      gain > 0 &&
      (dangerThere ??= visibleImmediateDamage(view, actor, to, context)) <
        actor.hp
    ) {
      priority = Math.max(priority, 1160);
      strategic += 15 * gain;
    }
  }
  return { priority, strategic };
}

/**
 * Revision 14 AI fix: a 5-HP Skeleton rising on `grave` dies to visible
 * enemies next turn, unless it stands beside a threatened own city center
 * (it screens the city).
 */
function raisedSkeletonDoomedV7(
  context: PolicyContextV7,
  necromancer: PublicUnitV7,
  grave: CoordV7,
): boolean {
  const view = context.view;
  if (
    context.threats.some((threat) => {
      const city = context.lookup.citiesById.get(threat.cityId);
      return city !== undefined && distance(city.at, grave) <= 1;
    })
  )
    return false;
  const rule = effectiveRoleRuleV7("FIGHTER", view.viewer.faction);
  const skeleton: PublicUnitV7 = {
    ...necromancer,
    role: "FIGHTER",
    at: grave,
    hp: Math.min(RAISED_SKELETON_HP_V7, rule.maxHp),
    maxHp: rule.maxHp,
    kills: 0,
  };
  return visibleImmediateDamage(view, skeleton, grave, context) >= skeleton.hp;
}

/**
 * Whether a full-HP unit of `role` trained on `city`'s center would stand in
 * visible lethal reach (it is exhausted until its owner's next turn).
 */
function freshUnitInLethalReachV7(
  context: PolicyContextV7,
  city: PlayerViewV7["cities"][number],
  role: UnitRoleIdV7,
): boolean {
  const view = context.view;
  const rule = effectiveRoleRuleV7(role, view.viewer.faction);
  const fresh: PublicUnitV7 = {
    id: -1 as UnitId,
    ownerId: view.viewer.id,
    homeCityId: city.id,
    role,
    form: "LAND",
    at: city.at,
    hp: rule.maxHp,
    maxHp: rule.maxHp,
    kills: 0,
    veteran: false,
    captureEligible: false,
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
      handled: true,
      specialActed: false,
    },
  };
  return visibleImmediateDamage(view, fresh, city.at, context) >= fresh.hp;
}

/** Raise Dead creates 5-HP Skeletons (revision 13 section 6.2). */
const RAISED_SKELETON_HP_V7 = 5;

/**
 * Revision 12 Raider Escape. While the Raider stands where visible enemies can
 * hurt it, only an escape Move to a strictly safer visible tile is considered,
 * preferring friendly territory and Forest/Mountain cover. Returns null to
 * reject the Move, 0 when ordinary Move scoring applies (no visible danger).
 */
function raiderEscapeRetreatValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  resultAt: CoordV7 | null,
): number | null {
  if (resultAt === null) return null;
  const view = context.view;
  const dangerHere = visibleImmediateDamage(view, actor, actor.at, context);
  if (dangerHere <= 0) return 0;
  const dangerThere = visibleImmediateDamage(view, actor, resultAt, context);
  if (dangerThere >= dangerHere) return null;
  const tile = findPublicTileV7(view, resultAt);
  const friendly =
    tile?.explored === true && tile.territoryOwnerId === view.viewer.id;
  const cover =
    tile?.explored === true &&
    (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN");
  return 10 * (dangerHere - dangerThere) + (friendly ? 4 : 0) + (cover ? 2 : 0);
}

/**
 * `pulp_wars-vkq.21` Vampire survival (Undead viewer). An attack must kill,
 * or leave the Vampire (after its Lifesteal heal) where the visible enemies'
 * projected damage next turn, ranged and splash included, stays below its HP.
 */
function vampireAttackAcceptableV7(
  context: PolicyContextV7,
  view: PlayerViewV7,
  command: AttackCommandV7,
): boolean {
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  if (preview === null) return false;
  if (preview.defenderDies) return true;
  const actor = view.units.find((unit) => unit.id === command.unitId);
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  if (actor === undefined || target === undefined) return false;
  const hp = Math.min(
    actor.maxHp,
    actor.hp - preview.damageToAttacker + preview.attackerHeal,
  );
  if (hp <= 0) return false;
  const after = projectPublicUnits(
    view,
    view.units.map((unit) =>
      unit.id === actor.id
        ? { ...unit, hp }
        : unit.id === target.id
          ? { ...unit, hp: target.hp - preview.damageToDefender }
          : unit,
    ),
    [actor.id, target.id],
  );
  const wounded = after.units.find((unit) => unit.id === actor.id);
  if (wounded === undefined) return false;
  if (visibleImmediateDamage(after, wounded, wounded.at, context) < hp)
    return true;
  // The Undead pass (`pulp_wars-w49.13`): with Escape the Vampire flies
  // back after its strike, so the strike is good where a tile within its
  // Move leaves it alive.
  return vampireEscapeTileV7(context, after, wounded, hp) !== null;
}

/**
 * The Undead pass (`pulp_wars-w49.13`): a free land tile within the Move
 * of a unit with Escape (the Vampire) on which the visible enemies'
 * projected damage stays below `hp`, the nearest first; null without
 * Escape or without such a tile. A reading of the board, not a path: a
 * zone of control or a blocked way may still stop the flight short.
 */
function vampireEscapeTileV7(
  context: PolicyContextV7,
  view: PlayerViewV7,
  unit: PublicUnitV7,
  hp: number,
): CoordV7 | null {
  const rule = unitRoleRuleV7(view, unit);
  const escapes = unit.form === "LAND" && rule.abilities.includes("ESCAPE");
  if (!escapes) return null;
  let best: CoordV7 | null = null;
  for (const tile of view.board.tiles) {
    const gap = distance(tile.at, unit.at);
    if (
      !tile.explored ||
      gap === 0 ||
      gap > rule.move ||
      // Open land only (a Mountain would end the flight where it stands).
      tile.biome === null ||
      tile.terrain === "RIFT" ||
      tile.terrain === "MOUNTAIN" ||
      (best !== null && gap >= distance(best, unit.at)) ||
      view.units.some((other) => same(other.at, tile.at)) ||
      visibleImmediateDamage(view, unit, tile.at, context) >= hp
    )
      continue;
    best = tile.at;
  }
  return best;
}

/**
 * An own Vampire's attack that neither kills nor leaves it alive (above) is
 * not a candidate; the Vampire repositions instead. A proven city save or an
 * endgame combined kill still excuses it.
 */
function vampireAttackExposedV7(
  context: PolicyContextV7,
  command: AttackCommandV7,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): boolean {
  const view = context.view;
  if (
    actor.ownerId !== view.viewer.id ||
    policyUnitFactionV7(view, actor) !== "UNDEAD" ||
    !isVampireV7(view, actor) ||
    preview.defenderDies ||
    // Tuning 7: a Vampire of a committed position strikes with the rest
    // (two of them walked up to the line and stood there, twice).
    armyModeV7(context, actor) === "COMMIT" ||
    vampireAttackAcceptableV7(context, view, command)
  )
    return false;
  return (
    !attackPurposeFactsV7(context, command, preview).savesCity &&
    !endgameCombinedKillV7(context, command, preview)
  );
}

/**
 * `pulp_wars-vkq.21` Vampire movement (Undead viewer, any form): never into
 * visible lethal reach unless that is strictly safer than staying or the
 * Vampire can strike from there (a kill or a survivable hit); out of lethal
 * reach at priority 1150 when it stands in it. An embarking move is judged
 * with the embarked defense.
 */
function vampireMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  basePriority: number,
  embarks: boolean,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const mover: PublicUnitV7 = embarks ? { ...actor, form: "EMBARKED" } : actor;
  // Tuning 7: a committed Vampire goes in with its position.
  if (!embarks && armyModeV7(context, actor) === "COMMIT")
    return { priority: basePriority, strategic: 0 };
  const dangerThere = visibleImmediateDamage(view, mover, to, context);
  const dangerHere = visibleImmediateDamage(view, actor, actor.at, context);
  if (dangerThere >= actor.hp) {
    if (dangerThere < dangerHere || vampireStrikesFromV7(context, actor, to))
      return { priority: basePriority, strategic: 0 };
    return { priority: -1, strategic: 0 };
  }
  if (dangerHere >= actor.hp)
    return {
      priority: Math.max(basePriority, VAMPIRE_RETREAT_PRIORITY_V7),
      strategic: dangerHere - dangerThere,
    };
  return { priority: basePriority, strategic: 0 };
}

const VAMPIRE_RETREAT_PRIORITY_V7 = 1150;

/**
 * `pulp_wars-vkq.21`: an own Lich or Vampire never boards a transport. It
 * cannot capture, and afloat (Defense 1, no attack, sight 1) it met Patrol
 * Boats and Battleships it could not see: about 70% of their deaths on the
 * naval maps were at sea.
 */
function fragileCargoV7(context: PolicyContextV7, unitId: UnitId): boolean {
  const view = context.view;
  const unit = context.lookup.unitsById.get(unitId);
  return (
    unit !== undefined &&
    unit.ownerId === view.viewer.id &&
    policyUnitFactionV7(view, unit) === "UNDEAD" &&
    (isLichRoleV7(view, unit) || isVampireV7(view, unit))
  );
}

/**
 * `pulp_wars-vkq.21`: an own Lich or Vampire does not land on a tile inside
 * visible lethal reach unless staying afloat is no safer or (a Vampire) it
 * can strike from there.
 */
function fragileLandingExposedV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  at: CoordV7,
): boolean {
  const view = context.view;
  if (
    actor.ownerId !== view.viewer.id ||
    policyUnitFactionV7(view, actor) !== "UNDEAD" ||
    (!isLichRoleV7(view, actor) && !isVampireV7(view, actor))
  )
    return false;
  const landed: PublicUnitV7 = { ...actor, form: "LAND" };
  const dangerThere = visibleImmediateDamage(view, landed, at, context);
  if (dangerThere < actor.hp) return false;
  if (dangerThere < visibleImmediateDamage(view, actor, actor.at, context))
    return false;
  return !isVampireV7(view, actor) || !vampireStrikesFromV7(context, actor, at);
}

/** A Vampire standing ashore on `to` could still make an acceptable attack. */
function vampireStrikesFromV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  if (actor.activation.attacksUsed > 0) return false;
  const view = context.view;
  const tile = findPublicTileV7(view, to);
  if (tile?.explored !== true || tile.biome === null) return false;
  const moved = projectPublicUnitForPolicyV7(view, actor.id, {
    at: to,
    form: "LAND",
    activation: {
      ...actor.activation,
      moved: true,
      movedPathLength: Math.max(1, distance(actor.at, to)),
    },
  });
  return moved.units.some(
    (target) =>
      isHostile(view, target.ownerId) &&
      distance(target.at, to) === 1 &&
      vampireAttackAcceptableV7(context, moved, {
        kind: "ATTACK",
        unitId: actor.id,
        targetUnitId: target.id,
      }),
  );
}

/**
 * `pulp_wars-vkq.21` Lich hunt (a living viewer in a match with an Undead
 * seat). An own attack-capable land unit within six tiles of a firing
 * position on a visible hostile Lich that plagues own or allied units moves
 * closer to that position at priority 1095 (below the spread-discipline
 * threshold of 1100, so it never ends next to spreading Plague), when the
 * destination is outside visible lethal reach. Ranged and siege units close
 * to their range band, so they can fire next turn. Garrisons stay.
 */
function plagueHuntMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  basePriority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const unchanged = { priority: basePriority, strategic: 0 };
  if (
    context.afflictions.plagueSources.size === 0 ||
    actor.form !== "LAND" ||
    actor.ownerId !== view.viewer.id ||
    !isLivingOwnerV7(view, actor.ownerId) ||
    actor.activation.escapeAvailable
  )
    return unchanged;
  const facts = publicCombatFacts(view, actor, context.lookup);
  const rule = unitRoleRuleV7(view, actor);
  if (
    !facts.abilities.includes("ATTACK") ||
    facts.attack2 <= 0 ||
    rule.tacticalRole === "SUPPORT" ||
    cityAt(view, actor.at, context.lookup)?.ownerId === view.viewer.id
  )
    return unchanged;
  const liches = plaguingLichesV7(
    view,
    context.afflictions,
    (owner) => isHostile(view, owner),
    (owner) => !isHostile(view, owner),
  );
  if (liches.length === 0) return unchanged;
  const gap = (at: CoordV7) =>
    Math.min(
      ...liches.map((lich) =>
        firingGapV7(at, lich.at, facts.minimumRange, facts.maximumRange),
      ),
    );
  const here = gap(actor.at);
  const there = gap(to);
  if (here > PLAGUE_HUNT_RADIUS_V7 || there >= here) return unchanged;
  if (visibleImmediateDamage(view, actor, to, context) >= actor.hp)
    return unchanged;
  return {
    priority: Math.max(basePriority, PLAGUE_HUNT_PRIORITY_V7),
    strategic:
      2 * (here - there) + (there === 0 && facts.maximumRange >= 2 ? 4 : 0),
  };
}

const PLAGUE_HUNT_PRIORITY_V7 = 1095;

/**
 * `pulp_wars-9s0.8` hunt: move in for a kill on a high-value unit. The kill
 * and focus rules only ranked attacks already on offer, so a visible Ice
 * Witch (or a Brain, a Necromancer, a Projector) two steps away survived
 * while the units that could kill it this turn stood still.
 *
 * A visible hostile land unit with Blizzard, Cold Snap, Mind Control, Raise
 * Dead, or Force Field is hunted when the own units that can hit it this
 * turn (an offered attack, or a Move into its attack band by a ready unit
 * that may attack after moving, one unit per tile) project at least its HP
 * between them, at most `HUNT_MAXIMUM_HUNTERS_V7` of them, strongest first,
 * each hit projected on the HP the earlier ones leave. The projection is the
 * public one from the tile the hunter attacks from (cover, Snow cover, and
 * the Blizzard halving of a shot included). A hunter's Move into the band
 * goes at `HUNT_MOVE_PRIORITY_V7` (above routine Moves, exempt from the Cold
 * Snap reach and sluggish rules), the safest tile first; its attack on the
 * target goes at `HUNT_ATTACK_PRIORITY_V7`, a kill at `HUNT_KILL_PRIORITY_V7`,
 * and it is never filtered as a low-value attack.
 */
const HUNT_MAXIMUM_HUNTERS_V7 = 5;
const HUNT_MOVE_PRIORITY_V7 = 1177;
const HUNT_ATTACK_PRIORITY_V7 = 1178;
const HUNT_KILL_PRIORITY_V7 = 1182;
const HUNT_TARGET_ABILITIES_V7 = [
  "BLIZZARD",
  "COLD_SNAP",
  "MIND_CONTROL",
  "RAISE_DEAD",
  "FORCE_FIELD",
] as const;

interface HuntPlanV7 {
  /**
   * Tuning 5 (`pulp_wars-w49.4`): a combined kill of army play on an
   * ordinary unit. Its Moves and hits rank below a direct kill, and an
   * attack a faction rule rejects takes no part in it.
   */
  readonly army: boolean;
  readonly target: PublicUnitV7;
  /** The hunters; `true` for one that strikes from where it stands. */
  readonly hunters: ReadonlyMap<UnitId, boolean>;
  /**
   * The tile the plan counted for each hunter that moves in first. Only a
   * Monster hunt holds its hunters to it (`pulp_wars-737.4`): a hunter that
   * took another hunter's only tile would leave the kill short and itself
   * next to the Spider.
   */
  readonly tiles: ReadonlyMap<UnitId, string>;
  /**
   * Step two of the Ice Folk pass (`pulp_wars-w49.27`): the own Sled whose
   * Bolas the plan counts on (the target is not Chilled yet and the kill
   * is a Shatter), and the tile it throws from when it must move first
   * (null: the throw is on offer where it stands).
   */
  readonly bolas?: {
    readonly unitId: UnitId;
    readonly tile: string | null;
  };
}

function huntTargetV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  if (unit.form !== "LAND" || unit.hp <= 0) return false;
  const abilities = unitRoleRuleV7(view, unit).abilities;
  return HUNT_TARGET_ABILITIES_V7.some((ability) =>
    abilities.includes(ability),
  );
}

function huntPlansV7(context: PolicyContextV7): readonly HuntPlanV7[] {
  if (context.hunts !== undefined) return context.hunts;
  const view = context.view;
  const plans: HuntPlanV7[] = [];
  // Map curiosities (`pulp_wars-737.4`, section 11 (a)): a visible Monster
  // is hunted like a high-value unit, in both AI modes: only a kill this
  // turn makes a plan. (No Monster has a hunt-target ability or stands on a
  // center, so without the curiosity facts the list is unchanged.)
  const monsters = context.curiosities?.monsterById ?? null;
  const namedTargets = [
    ...context.lookup.visibleHostiles.filter(
      (unit) =>
        monsters?.has(unit.id) !== true &&
        (huntTargetV7(view, unit) || siegeTargetV7(context, unit)),
    ),
    ...(context.curiosities?.monsters.map((monster) => monster.unit) ?? []),
  ];
  // Tuning 5 (`pulp_wars-w49.4`, `src/ai/v7-army.ts`): an army seat plans a
  // combined kill on every visible hostile land unit in reach. Such a
  // target needs no capturer; and in every hunt of an army seat a hunter
  // serves one kill, and one whose hit would be answered with its death
  // takes no part.
  const armyTargets = new Set(armyHuntTargetsV7(context, namedTargets));
  const targets = [...namedTargets, ...armyTargets];
  const armyHunters = new Set<UnitId>();
  // Indexed once per decision: the offered attacks and each unit's Moves
  // that a hunter may make (not boarding, not leaving a sole defender).
  const offeredAttacks = new Set<string>();
  const movesByUnit = new Map<UnitId, CoordV7[]>();
  if (targets.length > 0)
    for (const command of context.commands) {
      if (command.kind === "ATTACK") {
        if (!armyGarrisonHoldsV7(context, command))
          offeredAttacks.add(`${command.unitId}:${command.targetUnitId}`);
      } else if (command.kind === "MOVE") {
        const to = command.path.at(-1);
        const boards = isAutoembarkMoveV7(context, command as CommandV7);
        const mover = context.lookup.unitsById.get(command.unitId);
        if (
          to === undefined ||
          boards ||
          leavesSoleThreatenedDefender(context, command) ||
          armyGarrisonHoldsV7(context, command) ||
          // Tuning 7: nor a fast unit that waits for the infantry.
          (mover !== undefined && armyHoldsFastV7(context, mover, to))
        )
          continue;
        const list = movesByUnit.get(command.unitId) ?? [];
        list.push(to);
        movesByUnit.set(command.unitId, list);
      }
    }
  for (const target of targets) {
    const army = armyTargets.has(target);
    const siege = !army && siegeTargetV7(context, target);
    const candidates: {
      readonly unit: PublicUnitV7;
      readonly damage: number;
      readonly stays: boolean;
      readonly tiles: readonly string[];
      /** The tile it strikes from. */
      readonly from: CoordV7;
      /** The tiles of `tiles`, as coordinates (a hunter that moves in). */
      readonly places: readonly CoordV7[];
    }[] = [];
    for (const unit of view.units) {
      if (
        unit.ownerId !== view.viewer.id ||
        unit.form !== "LAND" ||
        unit.hp <= 0 ||
        !primaryReadyForPolicyV7(unit) ||
        armyHunters.has(unit.id)
      )
        continue;
      const facts = publicCombatFacts(view, unit, context.lookup);
      if (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0) continue;
      // Map curiosities (`pulp_wars-737.4`): a Monster is not worth a unit.
      // A hunter its retaliation would kill takes no part (judged against
      // the Monster as it stands, so a late hitter is judged cautiously).
      const monster = monsters?.get(target.id);
      if (offeredAttacks.has(`${unit.id}:${target.id}`)) {
        const preview = queryCombatPreviewV7(view, unit.id, target.id);
        if (
          preview !== null &&
          preview.damageToDefender > 0 &&
          !(monster !== undefined && preview.attackerDies) &&
          !(context.army && preview.attackerDies && !preview.defenderDies) &&
          !(
            army &&
            attackFactionRejectedV7(
              context,
              { kind: "ATTACK", unitId: unit.id, targetUnitId: target.id },
              unit,
              preview,
            )
          )
        )
          candidates.push({
            unit,
            damage: preview.damageToDefender,
            stays: true,
            tiles: [],
            from: unit.at,
            places: [],
          });
        continue;
      }
      if (unit.activation.moved || !unitMayActAfterMoveV7(view, unit)) continue;
      // Map curiosities: a sole city defender never walks to a Monster.
      if (monster !== undefined && soleCityDefenderV7(view, unit)) continue;
      const tiles: string[] = [];
      const places: CoordV7[] = [];
      let firstTile: CoordV7 | null = null;
      for (const to of movesByUnit.get(unit.id) ?? []) {
        const range = distance(to, target.at);
        if (range < facts.minimumRange || range > facts.maximumRange) continue;
        // Step two of the Ice Folk pass (`pulp_wars-w49.27`): a Yeti on a
        // Mountain has a range of two, and only from a Mountain.
        if (range >= 2 && !iceFolkRockfallTileV7(view, unit, to)) continue;
        // Map curiosities: only a melee hunter ends next to the Monster.
        if (monster !== undefined && facts.maximumRange > 1 && range <= 1)
          continue;
        tiles.push(coordKey(to));
        places.push(to);
        firstTile ??= to;
      }
      if (firstTile === null) continue;
      if (
        monster !== undefined &&
        distance(firstTile, target.at) <= 1 &&
        publicProjectedDamageWithLookupV7(
          view,
          target,
          { ...unit, at: firstTile },
          firstTile,
          {},
          context.lookup,
        ) >= unit.hp
      )
        continue;
      // Projected from the tile it attacks from (a shot from two or more
      // tiles into a Witch's Blizzard is halved).
      const damage = publicProjectedDamageWithLookupV7(
        view,
        { ...unit, at: firstTile },
        target,
        target.at,
        {},
        context.lookup,
      );
      if (
        context.army &&
        monster === undefined &&
        damage < target.hp &&
        armyRetaliationV7(
          context,
          { ...unit, at: firstTile },
          target,
          distance(firstTile, target.at),
        ) >= unit.hp
      )
        continue;
      // The Martian pass (`pulp_wars-w49.14`): a Saucer flies in only for
      // its own kill (its hit that does not kill is never made).
      if (
        context.army &&
        context.martian &&
        isSaucerForPolicyV7(view, unit) &&
        damage < target.hp
      )
        continue;
      if (damage > 0)
        candidates.push({
          unit,
          damage,
          stays: false,
          tiles,
          from: firstTile,
          places,
        });
    }
    candidates.sort(
      (left, right) =>
        right.damage - left.damage ||
        Number(right.stays) - Number(left.stays) ||
        left.unit.id - right.unit.id,
    );
    // The hits in that order, each on what the earlier ones leave (a
    // wounded unit defends with less).
    const hunters = new Map<UnitId, boolean>();
    const tiles = new Map<UnitId, string>();
    const usedTiles = new Set<string>();
    let left = target.hp;
    // Step two of the Goblin pass (`pulp_wars-w49.23`): a Goblin seat
    // counts the Gang Up its hunters give each other (`goblinMobHuntV7`).
    const mob =
      army && goblinMobSeatV7(context)
        ? goblinMobHuntV7(context, target, candidates)
        : null;
    // (A holder behind the front gate: only the kill by two or more.)
    const gated =
      army &&
      goblinMobSeatV7(context) &&
      armyHuntGatedV7(
        context,
        context.chokepoint === null ? armyAssaultV7(context) : null,
        target,
      );
    if (mob !== null && !(gated && mob.hunters.size < 2)) {
      for (const [id, stays] of mob.hunters) hunters.set(id, stays);
      for (const [id, tile] of mob.tiles) tiles.set(id, tile);
      left = 0;
    }
    // Step two of the Dinosaur pass (`pulp_wars-w49.26`): a Dinosaur seat
    // counts the Crack of its Stegosaurus's shot and the Pack Hunt its
    // dinosaurs give its Cavemen (`dinosaurPackHuntV7`). Where no group
    // kills, the plan of tuning 5 is tried as before.
    const pack =
      army && armyDinosaurSeatV7(context)
        ? dinosaurPackHuntV7(context, target, candidates)
        : null;
    if (pack !== null) {
      for (const [id, stays] of pack.hunters) hunters.set(id, stays);
      for (const [id, tile] of pack.tiles) tiles.set(id, tile);
      left = 0;
    }
    // Step two of the Ice Folk pass (`pulp_wars-w49.27`): an Ice Folk
    // seat counts the Shatter of a Chilled target, with the Bolas that
    // chills it first (`iceFolkShatterHuntV7`). Also for the garrison of a
    // center the campaign marches on and the other named targets (never the
    // Monster): on a recorded position a Yeti struck such a garrison for 5
    // and took 5 before the Sled two tiles away had thrown.
    const shatter = armyIceFolkSeatV7(context)
      ? iceFolkShatterHuntV7(context, target, candidates, armyHunters)
      : null;
    if (shatter !== null) {
      for (const [id, stays] of shatter.hunters) hunters.set(id, stays);
      for (const [id, tile] of shatter.tiles) tiles.set(id, tile);
      left = 0;
    }
    for (const candidate of mob !== null ||
    gated ||
    pack !== null ||
    shatter !== null
      ? []
      : candidates) {
      if (left <= 0 || hunters.size >= HUNT_MAXIMUM_HUNTERS_V7) break;
      if (!candidate.stays) {
        const tile = candidate.tiles.find((key) => !usedTiles.has(key));
        if (tile === undefined) continue;
        usedTiles.add(tile);
        tiles.set(candidate.unit.id, tile);
      }
      hunters.set(candidate.unit.id, candidate.stays);
      left -=
        left === target.hp
          ? candidate.damage
          : publicProjectedDamageWithLookupV7(
              view,
              { ...candidate.unit, at: candidate.from },
              { ...target, hp: left },
              target.at,
              {},
              context.lookup,
            );
    }
    if (
      left <= 0 &&
      (!siege ||
        view.units.some((unit) =>
          capturerNearV7(context, unit, target.at, hunters),
        ))
    ) {
      const bolas = shatter?.bolas;
      plans.push(
        bolas === undefined
          ? { army, target, hunters, tiles }
          : { army, target, hunters, tiles, bolas },
      );
      if (context.army) for (const id of hunters.keys()) armyHunters.add(id);
      if (bolas !== undefined) armyHunters.add(bolas.unitId);
    }
  }
  context.hunts = plans;
  return plans;
}

/**
 * Step two of the Goblin pass (`pulp_wars-w49.23`,
 * docs/product/RULESET_7_TUNING_GOBLIN.md section 14): a Goblin seat that
 * plays the army rules. Its combined kills count Gang Up, its units strike
 * after the helpers have come up, and its cheap units do not walk at the
 * enemy one at a time.
 */
function goblinMobSeatV7(context: PolicyContextV7): boolean {
  return (
    context.army && context.goblin && context.view.viewer.faction === "GOBLIN"
  );
}

/**
 * Step two of the Goblin pass: the combined kill of a Goblin seat, with the
 * Gang Up the hunters give each other. The hunt of tuning 5 projected every
 * hunter's hit as if it struck alone, so two Goblins beside a full Fighter
 * (3 each alone, 6 each with the other beside the target) were no plan, and
 * one of them attacked while the other stood two tiles away: in two matches
 * a Goblin seat made one attack in four with Gang Up.
 *
 * The smallest group of the strongest candidates kills: for one hunter,
 * then two, up to `HUNT_MAXIMUM_HUNTERS_V7`, each hunter's hit is projected
 * on the HP the earlier ones leave, with the Gang Up of the own units beside
 * the target once every hunter of the group stands on its tile (the units
 * there now that are not of the group, and the hunters that strike from a
 * tile beside it; an Ogre counts 2). Null when no group kills.
 */
function goblinMobHuntV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
  candidates: readonly {
    readonly unit: PublicUnitV7;
    readonly stays: boolean;
    readonly tiles: readonly string[];
    readonly from: CoordV7;
    readonly places: readonly CoordV7[];
  }[],
): {
  readonly hunters: ReadonlyMap<UnitId, boolean>;
  readonly tiles: ReadonlyMap<UnitId, string>;
} | null {
  const view = context.view;
  const limit = Math.min(HUNT_MAXIMUM_HUNTERS_V7, candidates.length);
  for (let size = 1; size <= limit; size += 1) {
    const group: { readonly unit: PublicUnitV7; readonly from: CoordV7 }[] = [];
    const hunters = new Map<UnitId, boolean>();
    const tiles = new Map<UnitId, string>();
    const usedTiles = new Set<string>();
    for (const candidate of candidates) {
      if (group.length >= size) break;
      let from = candidate.from;
      if (!candidate.stays) {
        const index = candidate.tiles.findIndex((key) => !usedTiles.has(key));
        const tile = candidate.tiles[index];
        const place = candidate.places[index];
        if (tile === undefined || place === undefined) continue;
        usedTiles.add(tile);
        tiles.set(candidate.unit.id, tile);
        from = place;
      }
      hunters.set(candidate.unit.id, candidate.stays);
      group.push({ unit: candidate.unit, from });
    }
    if (group.length < size) return null;
    // The own units beside the target once the group stands on its tiles.
    let beside = 0;
    for (const unit of view.units)
      if (
        unit.ownerId === view.viewer.id &&
        unit.id !== target.id &&
        !hunters.has(unit.id) &&
        distance(unit.at, target.at) === 1
      )
        beside += gangUpHelperWeightV7(view, unit);
    for (const member of group)
      if (distance(member.from, target.at) === 1)
        beside += gangUpHelperWeightV7(view, member.unit);
    let left = target.hp;
    for (const member of group) {
      if (left <= 0) break;
      const gangUp = gangUpAttackerV7(view, member.unit)
        ? gangUpWithHelpersV7(
            view,
            member.unit,
            beside -
              (distance(member.from, target.at) === 1
                ? gangUpHelperWeightV7(view, member.unit)
                : 0),
          )
        : 0;
      left -= publicProjectedDamageWithLookupV7(
        view,
        { ...member.unit, at: member.from },
        { ...target, hp: left },
        target.at,
        { bonusAttack2: 2 * gangUp },
        context.lookup,
      );
    }
    if (left <= 0) return { hunters, tiles };
  }
  return null;
}

/**
 * Step two of the Goblin pass: the hit of a hunter that stands beside the
 * target waits while another hunter of the same combined kill still has its
 * Move to make, so that the helpers stand beside the target before the
 * first blow (hits ranked above the hunters' Moves, and a Goblin struck
 * alone for 3 before the second came up to strike for 6). Only the hit of
 * a unit whose attack takes Gang Up, on the target of its own plan, that
 * does not kill; and only while a Move of such a hunter to the tile the
 * plan counted is on offer and passes the candidate filter, so that the
 * wait always ends.
 */
function goblinMobWaitsV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): boolean {
  if (!goblinMobSeatV7(context)) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (
    actor === undefined ||
    actor.form !== "LAND" ||
    !gangUpAttackerV7(view, actor)
  )
    return false;
  const plan = huntOfV7(context, command.unitId);
  // (Its hit on another unit waits too: it has one attack.)
  if (
    plan === undefined ||
    !plan.army ||
    plan.hunters.get(command.unitId) !== true ||
    distance(actor.at, plan.target.at) !== 1
  )
    return false;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  if (preview === null || preview.defenderDies) return false;
  for (const [id, stays] of plan.hunters) {
    if (stays) continue;
    const tile = plan.tiles.get(id);
    if (tile === undefined) continue;
    for (const move of context.commands) {
      if (move.kind !== "MOVE" || move.unitId !== id) continue;
      const to = move.path.at(-1);
      if (
        to !== undefined &&
        coordKey(to) === tile &&
        distance(to, plan.target.at) === 1 &&
        isPolicyCandidate(context, move)
      )
        return true;
    }
  }
  return false;
}

/**
 * Step two of the Dinosaur pass (`pulp_wars-w49.26`,
 * docs/product/RULESET_7_TUNING_DINOSAUR.md section 14): where a unit of a
 * Dinosaur seat stands in the order of blows on one target. A Stegosaurus
 * first (0): the unit it hits is Cracked for the rest of the turn, 1 Defense
 * less against every later blow and in its strike back. Then the other
 * dinosaurs (1): a unit a dinosaur has attacked is hunted, and a Caveman has
 * Pack Hunt against it wherever the dinosaur stands. The Cavemen and the
 * Shaman last (2).
 */
function dinosaurBlowRankV7(view: PlayerViewV7, unit: PublicUnitV7): 0 | 1 | 2 {
  if (unit.form !== "LAND") return 2;
  if (unitRoleMechanicsV7(view, unit).cracksArmour) return 0;
  return unitGrowsV7(view, unit) ? 1 : 2;
}

/**
 * Step two of the Dinosaur pass: the combined kill of a Dinosaur seat, with
 * what its units do for each other. The hunt of tuning 5 projects every
 * hunter's hit as if it struck alone, strongest first: a Stegosaurus and a
 * Caveman beside a full Champion were no plan (6 and 4 of its 15 HP),
 * though the shot leaves it Cracked and hunted and the Caveman's blow then
 * deals the 9 it has left.
 *
 * As for a Goblin seat (`goblinMobHuntV7`) the smallest group of the
 * strongest candidates that kills is taken: for one hunter, then two, up to
 * `HUNT_MAXIMUM_HUNTERS_V7`. The blows of a group are projected in the order
 * of `dinosaurBlowRankV7`, each on the HP the earlier ones leave: after a
 * Stegosaurus's shot that does not kill the target is Cracked, and after any
 * dinosaur's blow that does not kill a Caveman has Pack Hunt. Null when no
 * group kills.
 */
function dinosaurPackHuntV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
  candidates: readonly {
    readonly unit: PublicUnitV7;
    readonly stays: boolean;
    readonly tiles: readonly string[];
    readonly from: CoordV7;
    readonly places: readonly CoordV7[];
  }[],
): {
  readonly hunters: ReadonlyMap<UnitId, boolean>;
  readonly tiles: ReadonlyMap<UnitId, string>;
} | null {
  const view = context.view;
  const limit = Math.min(HUNT_MAXIMUM_HUNTERS_V7, candidates.length);
  // (An Egg and the Monster are never Cracked.)
  const cracks =
    target.form === "LAND" &&
    context.curiosities?.monsterById.has(target.id) !== true;
  for (let size = 1; size <= limit; size += 1) {
    const group: {
      readonly unit: PublicUnitV7;
      readonly from: CoordV7;
      readonly rank: 0 | 1 | 2;
      readonly index: number;
    }[] = [];
    const hunters = new Map<UnitId, boolean>();
    const tiles = new Map<UnitId, string>();
    const usedTiles = new Set<string>();
    for (const candidate of candidates) {
      if (group.length >= size) break;
      let from = candidate.from;
      if (!candidate.stays) {
        const index = candidate.tiles.findIndex((key) => !usedTiles.has(key));
        const tile = candidate.tiles[index];
        const place = candidate.places[index];
        if (tile === undefined || place === undefined) continue;
        usedTiles.add(tile);
        tiles.set(candidate.unit.id, tile);
        from = place;
      }
      hunters.set(candidate.unit.id, candidate.stays);
      group.push({
        unit: candidate.unit,
        from,
        rank: dinosaurBlowRankV7(view, candidate.unit),
        index: group.length,
      });
    }
    if (group.length < size) return null;
    group.sort(
      (left, right) => left.rank - right.rank || left.index - right.index,
    );
    let left = target.hp;
    let cracked = false;
    let hunted = false;
    for (const member of group) {
      if (left <= 0) break;
      const struck = { ...member.unit, at: member.from };
      const pack2 = unitRoleMechanicsV7(view, member.unit).packHuntBonus2;
      left -= publicProjectedDamageWithLookupV7(
        view,
        struck,
        { ...target, hp: left },
        target.at,
        {
          // (Not twice: the projection counts the Pack Hunt of the board as
          // it is, a dinosaur beside the target or a target hunted already.)
          bonusAttack2:
            hunted &&
            pack2 > 0 &&
            packHuntForPolicyV7(view, struck, target, target.at) === 0
              ? pack2
              : 0,
          cracked,
        },
        context.lookup,
      );
      if (left <= 0) break;
      if (member.rank === 0 && cracks) cracked = true;
      if (member.rank <= 1) hunted = true;
    }
    if (left <= 0) return { hunters, tiles };
  }
  return null;
}

/**
 * Step two of the Dinosaur pass: the blows of a Dinosaur seat's combined
 * kill fall in the order of `dinosaurBlowRankV7`. A hunter's hit that does
 * not kill waits while a hunter of the same plan with a lower rank (the
 * Stegosaurus before every other unit, a dinosaur before a Caveman) still
 * has its blow on the target to make: its attack is on offer, or it has not
 * moved and its Move to the tile the plan counted is, and that command
 * passes the candidate filter, so that the wait always ends. (Hits ranked
 * by their own value, and a Caveman struck a full Champion for 4 before the
 * Stegosaurus behind it had shot.) Its hit on another unit waits too: it has
 * one attack.
 */
function dinosaurPackWaitsV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): boolean {
  if (!armyDinosaurSeatV7(context)) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (actor === undefined || actor.form !== "LAND") return false;
  const rank = dinosaurBlowRankV7(view, actor);
  if (rank === 0) return false;
  const plan = huntOfV7(context, command.unitId);
  if (plan === undefined || !plan.army) return false;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  if (preview === null || preview.defenderDies) return false;
  // What the wait is for: the Crack of a Stegosaurus's shot (a target that
  // is not Cracked yet), or the Pack Hunt of a Caveman that has none on the
  // target now (no dinosaur beside it, and not hunted). A Caveman whose
  // target stands beside a dinosaur already strikes at once.
  const target = plan.target;
  const wantsCrack =
    target.form === "LAND" &&
    context.curiosities?.monsterById.has(target.id) !== true &&
    !unitIsCrackedV7(view, target.id);
  const wantsPack =
    unitRoleMechanicsV7(view, actor).packHuntBonus2 > 0 &&
    packHuntForPolicyV7(view, actor, target, target.at) === 0;
  if (!wantsCrack && !wantsPack) return false;
  for (const [id, stays] of plan.hunters) {
    if (id === actor.id) continue;
    const other = context.lookup.unitsById.get(id);
    if (other === undefined) continue;
    const otherRank = dinosaurBlowRankV7(view, other);
    if (
      otherRank >= rank ||
      !(otherRank === 0 ? wantsCrack || wantsPack : wantsPack)
    )
      continue;
    const tile = plan.tiles.get(id);
    for (const offered of context.commands) {
      if (
        offered.kind === "ATTACK" &&
        offered.unitId === id &&
        offered.targetUnitId === plan.target.id
      ) {
        if (isPolicyCandidate(context, offered)) return true;
      } else if (
        !stays &&
        tile !== undefined &&
        offered.kind === "MOVE" &&
        offered.unitId === id
      ) {
        const to = offered.path.at(-1);
        if (
          to !== undefined &&
          coordKey(to) === tile &&
          isPolicyCandidate(context, offered)
        )
          return true;
      }
    }
  }
  return false;
}

/**
 * Step two of the Ice Folk pass (`pulp_wars-w49.27`,
 * docs/product/RULESET_7_TUNING_ICE_FOLK.md section 3): the own Sled that
 * can chill `target` this turn for a combined kill: one whose `THROW_BOLAS`
 * on it is on offer where it stands (the lowest unit ID), or else one that
 * has not moved, has a Move to a tile within the Bolas's range of the
 * target that the visible enemies do not kill it on (the tile where they
 * deal it the least, two tiles off before one), and may throw after it.
 * Never a unit already told off for another combined kill (`taken`).
 */
function iceFolkBolasSourceV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
  taken: ReadonlySet<UnitId>,
): { readonly unitId: UnitId; readonly tile: string | null } | null {
  const view = context.view;
  let standing: UnitId | null = null;
  for (const command of context.commands)
    if (
      command.kind === "THROW_BOLAS" &&
      command.targetUnitId === target.id &&
      !taken.has(command.unitId) &&
      (standing === null || command.unitId < standing)
    )
      standing = command.unitId;
  if (standing !== null) return { unitId: standing, tile: null };
  let best: {
    readonly unitId: UnitId;
    readonly tile: string;
    readonly key: readonly number[];
  } | null = null;
  for (const unit of view.units) {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.form !== "LAND" ||
      unit.hp <= 0 ||
      taken.has(unit.id) ||
      unit.activation.moved ||
      !primaryReadyForPolicyV7(unit) ||
      !unitMayActAfterMoveV7(view, unit) ||
      !hasAbilityForIceV7(view, unit, "BOLAS")
    )
      continue;
    for (const to of context.lookup.moveDestinationsByUnit.get(unit.id) ?? []) {
      const gap = distance(to, target.at);
      if (gap > BOLAS_RANGE_V7) continue;
      const danger = visibleImmediateDamage(view, unit, to, context);
      if (danger >= unit.hp) continue;
      const key = [-danger, gap, -unit.id, -to.y, -to.x];
      if (best === null || compareNumericTuple(key, best.key) > 0)
        best = { unitId: unit.id, tile: coordKey(to), key };
    }
  }
  return best === null ? null : { unitId: best.unitId, tile: best.tile };
}

/**
 * Step two of the Ice Folk pass: the combined kill of an Ice Folk seat,
 * with the Shatter. The hunt of tuning 5 projects every hunter's hit by
 * plain damage: a Sled and two Yetis beside a full Swordsman (15 HP: 5 and
 * 5 of it) were no plan, though the Bolas chills it and the second Yeti's
 * blow, which leaves it at 3 HP or fewer, shatters it with no strike back.
 * In a hand-played game on the older policy a seat threw nine Bolas in
 * nine rounds and two were followed by a Shatter.
 *
 * As for a Goblin and a Dinosaur seat, the smallest group of the strongest
 * candidates that kills is taken (one hunter, then two, up to
 * `HUNT_MAXIMUM_HUNTERS_V7`). The blows of a group are projected in order,
 * the strikes from two tiles first (a Snow Hunter's shot, a Rockfall, a
 * Boulder: they never shatter and draw no strike back from a unit that
 * fights hand to hand), then the blows from the next tile, each on the HP
 * the earlier ones leave; the projection counts Cold Blood and the Shatter
 * of a Chilled target (`iceFolkBlowV7`). A target that is Chilled now, or
 * that an own Witch's offered Cold Snap covers (it is cast before every
 * attack), is taken as it is. For one that is not, the group is also tried
 * with the Bolas of `iceFolkBolasSourceV7` thrown first (that Sled does not
 * strike), and the plan with the Bolas is taken when it kills with fewer
 * hunters than the plan without, or when only it kills. Null when no group
 * kills: the plan of tuning 5 is then tried as before.
 */
function iceFolkShatterHuntV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
  candidates: readonly {
    readonly unit: PublicUnitV7;
    readonly stays: boolean;
    readonly tiles: readonly string[];
    readonly from: CoordV7;
    readonly places: readonly CoordV7[];
  }[],
  taken: ReadonlySet<UnitId>,
): {
  readonly hunters: ReadonlyMap<UnitId, boolean>;
  readonly tiles: ReadonlyMap<UnitId, string>;
  readonly bolas?: { readonly unitId: UnitId; readonly tile: string | null };
} | null {
  const view = context.view;
  // (A giant and the Monster are never shattered; an Egg is never Chilled.)
  if (
    target.form !== "LAND" ||
    target.role === "JUGGERNAUT" ||
    context.curiosities?.monsterById.has(target.id) === true
  )
    return null;
  const facts = iceFolkFactsForViewV7(view);
  const snapped = context.commands.some((command) => {
    if (command.kind !== "COLD_SNAP") return false;
    const witch = context.lookup.unitsById.get(command.unitId);
    return (
      witch !== undefined && distance(witch.at, target.at) <= COLD_SNAP_RANGE_V7
    );
  });
  const source =
    snapped || chilledForPolicyV7(facts, target.id)
      ? null
      : iceFolkBolasSourceV7(context, target, taken);
  const kill = (
    chilled: boolean,
    without: UnitId | null,
  ): {
    readonly hunters: ReadonlyMap<UnitId, boolean>;
    readonly tiles: ReadonlyMap<UnitId, string>;
  } | null => {
    const pool =
      without === null
        ? candidates
        : candidates.filter((candidate) => candidate.unit.id !== without);
    const limit = Math.min(HUNT_MAXIMUM_HUNTERS_V7, pool.length);
    for (let size = 1; size <= limit; size += 1) {
      const group: {
        readonly unit: PublicUnitV7;
        readonly from: CoordV7;
        readonly rank: 0 | 1;
        readonly index: number;
      }[] = [];
      const hunters = new Map<UnitId, boolean>();
      const tiles = new Map<UnitId, string>();
      const usedTiles = new Set<string>();
      for (const candidate of pool) {
        if (group.length >= size) break;
        let from = candidate.from;
        if (!candidate.stays) {
          const index = candidate.tiles.findIndex((key) => !usedTiles.has(key));
          const tile = candidate.tiles[index];
          const place = candidate.places[index];
          if (tile === undefined || place === undefined) continue;
          usedTiles.add(tile);
          tiles.set(candidate.unit.id, tile);
          from = place;
        }
        hunters.set(candidate.unit.id, candidate.stays);
        group.push({
          unit: candidate.unit,
          from,
          rank: distance(from, target.at) >= 2 ? 0 : 1,
          index: group.length,
        });
      }
      if (group.length < size) return null;
      group.sort(
        (left, right) => left.rank - right.rank || left.index - right.index,
      );
      let left = target.hp;
      for (const member of group) {
        if (left <= 0) break;
        left -= publicProjectedDamageWithLookupV7(
          view,
          { ...member.unit, at: member.from },
          { ...target, hp: left },
          target.at,
          { chilled },
          context.lookup,
        );
      }
      if (left <= 0) return { hunters, tiles };
    }
    return null;
  };
  const plain = kill(snapped, null);
  if (source === null) return plain;
  const frozen = kill(true, source.unitId);
  return frozen !== null &&
    (plain === null || frozen.hunters.size < plain.hunters.size)
    ? { ...frozen, bolas: source }
    : plain;
}

/**
 * Step two of the Ice Folk pass: the order of an Ice Folk seat's combined
 * kill. A hunter's hit that does not kill waits (it is no candidate) while
 *
 * - the Bolas its plan counts on is still to be thrown: the target is not
 *   Chilled, and the throw, or the Sled's Move to the tile it throws from,
 *   is on offer and passes the candidate filter;
 * - or it strikes from the next tile and a hunter of the same plan that
 *   strikes from two tiles or more still has its blow to make (its attack
 *   is on offer, or it has not moved and its Move to the tile the plan
 *   counted is, and that command passes the candidate filter): the shots
 *   bring the target into the Shatter window, and only a blow from the next
 *   tile shatters.
 *
 * So the wait always ends. Its hit on another unit waits too: it has one
 * attack. (Hits ranked by their own value: a Yeti struck a full Fighter for
 * 5 and took 3 before the Sled beside it had thrown.)
 */
function iceFolkShatterWaitsV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): boolean {
  if (!armyIceFolkSeatV7(context)) return false;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (actor === undefined || actor.form !== "LAND") return false;
  const plan = huntOfV7(context, command.unitId);
  if (plan === undefined) return false;
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  if (preview === null || preview.defenderDies) return false;
  const target = plan.target;
  const bolas = plan.bolas;
  if (
    bolas !== undefined &&
    !chilledForPolicyV7(iceFolkFactsForViewV7(view), target.id)
  )
    for (const offered of context.commands) {
      if (
        offered.kind === "THROW_BOLAS" &&
        offered.unitId === bolas.unitId &&
        offered.targetUnitId === target.id
      ) {
        if (isPolicyCandidate(context, offered)) return true;
      } else if (
        bolas.tile !== null &&
        offered.kind === "MOVE" &&
        offered.unitId === bolas.unitId
      ) {
        const to = offered.path.at(-1);
        if (
          to !== undefined &&
          coordKey(to) === bolas.tile &&
          isPolicyCandidate(context, offered)
        )
          return true;
      }
    }
  if (distance(actor.at, target.at) !== 1) return false;
  for (const [id, stays] of plan.hunters) {
    if (id === actor.id) continue;
    const other = context.lookup.unitsById.get(id);
    if (other === undefined) continue;
    const tile = plan.tiles.get(id);
    for (const offered of context.commands) {
      if (
        offered.kind === "ATTACK" &&
        offered.unitId === id &&
        offered.targetUnitId === target.id
      ) {
        if (
          distance(other.at, target.at) >= 2 &&
          isPolicyCandidate(context, offered)
        )
          return true;
      } else if (
        !stays &&
        tile !== undefined &&
        offered.kind === "MOVE" &&
        offered.unitId === id
      ) {
        const to = offered.path.at(-1);
        if (
          to !== undefined &&
          coordKey(to) === tile &&
          distance(to, target.at) >= 2 &&
          isPolicyCandidate(context, offered)
        )
          return true;
      }
    }
  }
  return false;
}

/**
 * Step two of the Ice Folk pass: the combined kill an own Sled throws its
 * Bolas for (`HuntPlanV7.bolas`), or undefined.
 */
function iceFolkBolasPlanV7(
  context: PolicyContextV7,
  unitId: UnitId,
): HuntPlanV7 | undefined {
  if (!armyIceFolkSeatV7(context)) return undefined;
  return huntPlansV7(context).find((plan) => plan.bolas?.unitId === unitId);
}

/**
 * `pulp_wars-9s0.8` siege: the defender on the center of a hostile city the
 * campaign marches on (or an endgame target) is hunted like a high-value
 * unit while a capturer can take the cleared center (see
 * `capturerNearV7`). The combined attack ranked only attacks already on
 * offer; the hunt moves the rest of the assault into reach first.
 */
function siegeTargetV7(context: PolicyContextV7, unit: PublicUnitV7): boolean {
  if (unit.form !== "LAND" || !isHostile(context.view, unit.ownerId))
    return false;
  return (
    endgameTargetAtV7(context.endgame, unit.at) !== undefined ||
    campaignAssaultCityV7(context, unit.at) !== undefined
  );
}

/**
 * A capturer to take the cleared center: an own capture-capable land unit
 * within two tiles of it that has not moved and is not one of the hunters,
 * or a melee hunter that can capture (a melee kill advances onto the
 * center).
 */
function capturerNearV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  center: CoordV7,
  hunters: ReadonlyMap<UnitId, boolean>,
): boolean {
  if (
    unit.ownerId !== context.view.viewer.id ||
    !canCaptureV7(context.view, unit)
  )
    return false;
  if (hunters.has(unit.id))
    return (
      publicCombatFacts(context.view, unit, context.lookup).maximumRange <= 1
    );
  return (
    distance(unit.at, center) <= 2 &&
    !unit.activation.moved &&
    primaryReadyForPolicyV7(unit)
  );
}

/** The hunt a unit takes part in, the first by target ID. */
function huntOfV7(
  context: PolicyContextV7,
  unitId: UnitId,
): HuntPlanV7 | undefined {
  let found: HuntPlanV7 | undefined;
  for (const plan of huntPlansV7(context))
    if (
      plan.hunters.has(unitId) &&
      (found === undefined || plan.target.id < found.target.id)
    )
      found = plan;
  return found;
}

function huntMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } | null {
  if (actor.ownerId !== context.view.viewer.id || actor.form !== "LAND")
    return null;
  const view = context.view;
  const facts = publicCombatFacts(view, actor, context.lookup);
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the Sled of a
  // combined kill moves to the tile it throws its Bolas from.
  const thrown = iceFolkBolasPlanV7(context, actor.id);
  if (thrown?.bolas !== undefined)
    return thrown.bolas.tile === coordKey(to)
      ? {
          priority: Math.max(priority, ARMY_HUNT_MOVE_PRIORITY_V7),
          strategic:
            -visibleImmediateDamage(view, actor, to, context) +
            ARMY_RANGED_FIRST_VALUE_V7,
        }
      : null;
  const plan = huntOfV7(context, actor.id);
  if (plan === undefined || plan.hunters.get(actor.id) !== false) return null;
  const range = distance(to, plan.target.at);
  if (range < facts.minimumRange || range > facts.maximumRange) return null;
  // Map curiosities (`pulp_wars-737.4`): a Monster's hunter moves only to
  // the tile the plan counted for it.
  if (
    context.curiosities?.monsterById.has(plan.target.id) === true &&
    plan.tiles.get(actor.id) !== coordKey(to)
  )
    return null;
  return {
    priority: Math.max(
      priority,
      plan.army ? ARMY_HUNT_MOVE_PRIORITY_V7 : HUNT_MOVE_PRIORITY_V7,
    ),
    strategic:
      -visibleImmediateDamage(view, actor, to, context) +
      // Tuning 5 (`pulp_wars-w49.4`): an army seat's ranged hunters move in
      // (and so shoot) before its melee hunters: soften, then finish.
      // Step two of the Ice Folk pass (`pulp_wars-w49.27`): an Ice Folk
      // seat's melee hunters move in first and its shooters after them, so
      // that a shooter moves up behind a line that is there
      // (`armyIceFolkShooterHeldV7`); the shots still fall before the blows
      // (`iceFolkShatterWaitsV7`).
      (context.army &&
      (armyIceFolkSeatV7(context)
        ? facts.maximumRange <= 1
        : facts.maximumRange > 1)
        ? ARMY_RANGED_FIRST_VALUE_V7
        : 0),
  };
}

function huntAttackPriorityV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
  priority: number,
): number {
  const plan = huntOfV7(context, command.unitId);
  if (plan === undefined || plan.target.id !== command.targetUnitId)
    return priority;
  // An army plan's kill keeps the priority of any kill.
  if (plan.army)
    return preview.defenderDies
      ? priority
      : Math.max(priority, ARMY_HUNT_ATTACK_PRIORITY_V7);
  return Math.max(
    priority,
    preview.defenderDies ? HUNT_KILL_PRIORITY_V7 : HUNT_ATTACK_PRIORITY_V7,
  );
}

/**
 * Map curiosities (`pulp_wars-737.4`,
 * docs/product/RULESET_7_MAP_CURIOSITIES.md section 11). Every helper below
 * is reached only with `context.curiosities` set (a view with a curiosity or
 * a Monster), so a match without one keeps its decisions.
 *
 * The unit's part in this turn's combined kill of the Monster `monsterId`:
 * `true` when it strikes from where it stands, `false` when it moves in
 * first, undefined when it has none (or no kill is planned).
 */
function monsterHunterV7(
  context: PolicyContextV7,
  unitId: UnitId,
  monsterId: UnitId,
): boolean | undefined {
  return huntPlansV7(context)
    .find((plan) => plan.target.id === monsterId)
    ?.hunters.get(unitId);
}

/** The own units with an offered attack on a unit that is not a Monster. */
function curiosityOtherTargetsV7(
  context: PolicyContextV7,
  facts: CuriosityFactsV7,
): ReadonlySet<UnitId> {
  if (context.curiosityOtherTargets !== undefined)
    return context.curiosityOtherTargets;
  const units = new Set<UnitId>();
  for (const command of context.commands)
    if (
      command.kind === "ATTACK" &&
      !facts.monsterById.has(command.targetUnitId)
    )
      units.add(command.unitId);
  context.curiosityOtherTargets = units;
  return units;
}

/** The curiosity errands of this decision (see `planCuriosityErrandsV7`). */
function curiosityErrandsV7(
  context: PolicyContextV7,
  facts: CuriosityFactsV7,
): ReadonlyMap<UnitId, CuriosityErrandV7> {
  if (context.curiosityErrands !== undefined) return context.curiosityErrands;
  const view = context.view;
  const errands = planCuriosityErrandsV7({
    view,
    facts,
    move: (unit) => publicCombatFacts(view, unit, context.lookup).move,
    construct: (unit) => unitRoleMechanicsV7(view, unit).construct,
    grows: (unit) => unitRoleRuleV7(view, unit).abilities.includes("GROW"),
    captures: (unit) => canCaptureV7(view, unit),
    danger: (unit, at) => visibleImmediateDamage(view, unit, at, context),
    navalDanger: context.naval.visibleNavalDanger,
  });
  context.curiosityErrands = errands;
  return errands;
}

/**
 * The candidate filter of section 11:
 *
 * - a Move (or a landing) never ends on a visible Monster's provoke tiles,
 *   except a melee hunter's Move in a combined kill of that Monster;
 * - an attack on a Monster is offered only (a) as part of this turn's
 *   combined kill (or as the kill itself), or (b) from outside its reach
 *   when the hit beats its regeneration and the unit has no other target;
 * - a hurt unit on a safe Fountain stands until it has healed.
 */
function curiosityRejectsV7(
  context: PolicyContextV7,
  command: CommandV7,
): boolean {
  const facts = context.curiosities;
  if (facts === null) return false;
  if (command.kind === "DISEMBARK")
    return monsterProvokedAtV7(facts, command.at) !== undefined;
  // `pulp_wars-1wy.4`: a carrier sets no unit down on a Monster's provoke
  // tiles (a delivery, a shot on arrival, or an extraction).
  if (command.kind === "BEAM_DOWN")
    return monsterProvokedAtV7(facts, command.to) !== undefined;
  if (command.kind === "ATTACK") {
    const monster = facts.monsterById.get(command.targetUnitId);
    if (monster === undefined) return false;
    const preview = queryCombatPreviewV7(
      context.view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview === null) return true;
    if (
      preview.defenderDies ||
      monsterHunterV7(context, command.unitId, monster.unit.id) !== undefined
    )
      return false;
    return !(
      preview.monsterRetaliates === false &&
      !preview.attackerDies &&
      preview.damageToDefender > MONSTER_REGENERATION_FOR_POLICY_V7 &&
      !curiosityOtherTargetsV7(context, facts).has(command.unitId)
    );
  }
  if (command.kind !== "MOVE") return false;
  const actor = context.lookup.unitsById.get(command.unitId);
  const to = command.path.at(-1);
  if (actor === undefined || to === undefined) return false;
  const monster = monsterProvokedAtV7(facts, to);
  // Only the tile the kill plan counted for this hunter (a melee hunter's:
  // the plan gives a ranged hunter no tile next to the Monster).
  if (
    monster !== undefined &&
    huntPlansV7(context)
      .find((plan) => plan.target.id === monster.unit.id)
      ?.tiles.get(actor.id) !== coordKey(to)
  )
    return true;
  const errand = curiosityErrandsV7(context, facts).get(actor.id);
  return (
    errand?.kind === "FOUNTAIN" &&
    same(errand.at, actor.at) &&
    actor.hp < actor.maxHp
  );
}

/**
 * The Move values of section 11: an errand unit's Move onto or toward its
 * Fountain, Shrine, or Wreck, and the step of a unit the Monster would
 * attack (and that has no attack of its own to make) to a tile where it
 * would not.
 */
function curiosityMoveValueV7(
  context: PolicyContextV7,
  facts: CuriosityFactsV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  let strategic = 0;
  const errand = curiosityErrandsV7(context, facts).get(actor.id);
  const value =
    errand === undefined ? null : curiosityErrandMoveV7(errand, actor.at, to);
  if (value !== null) {
    priority = Math.max(priority, value.priority);
    strategic += value.strategic;
  }
  const threats = monstersThreateningV7(facts, actor.id, actor.at);
  if (
    threats.length > 0 &&
    monstersThreateningV7(facts, actor.id, to).length === 0 &&
    !threats.some(
      (monster) =>
        monsterHunterV7(context, actor.id, monster.unit.id) !== undefined,
    ) &&
    !curiosityOtherTargetsV7(context, facts).has(actor.id)
  )
    priority = Math.max(priority, MONSTER_STEP_AWAY_PRIORITY_V7);
  return { priority, strategic };
}

/**
 * `pulp_wars-1mc` endgame siege. Every helper returns the ordinary behavior
 * (false / unchanged) when `context.endgame` is null, so positions outside
 * the endgame keep their decisions.
 */
function canCaptureV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "LAND" &&
    unitRoleRuleV7(view, unit).abilities.includes("CAPTURE")
  );
}

/** An own capturer next to `center` that can still step onto it this turn. */
function freshCapturerNextToV7(
  context: PolicyContextV7,
  center: CoordV7,
  excluded: ReadonlySet<UnitId>,
): PublicUnitV7 | undefined {
  const view = context.view;
  return view.units.find(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      !excluded.has(unit.id) &&
      distance(unit.at, center) === 1 &&
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed &&
      canCaptureV7(view, unit),
  );
}

/** A siege unit may stand 2–3 from an endgame target without a screen. */
function endgameSiegeTileV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const plan = context.endgame;
  if (plan === null) return false;
  const range = endgameTargetDistanceV7(plan, to);
  return (
    range >= 2 &&
    range <= 3 &&
    visibleImmediateDamage(context.view, actor, to, context) < actor.hp
  );
}

/**
 * The defender on an endgame target's center dies to this attack plus the
 * other offered attacks on it this turn (applied greedily, strongest first,
 * each previewed against the projected wounded defender), and an own
 * capturer outside that fire stands next to the center ready to step in.
 */
function endgameCombinedKillV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): boolean {
  if (preview.defenderDies || preview.damageToDefender <= 0) return false;
  const view = context.view;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined) return false;
  // pulp_wars-9s0.1: the same assault on the center of any city the
  // campaign marches on, not only on the last cities.
  const city =
    endgameTargetAtV7(context.endgame, target.at) ??
    campaignAssaultCityV7(context, target.at);
  if (city === undefined) return false;
  const capturer = freshCapturerNextToV7(
    context,
    city.at,
    new Set([command.unitId]),
  );
  if (capturer === undefined) return false;
  const pool = new Set<UnitId>();
  for (const candidate of context.commands)
    if (
      candidate.kind === "ATTACK" &&
      candidate.targetUnitId === target.id &&
      candidate.unitId !== command.unitId &&
      candidate.unitId !== capturer.id
    )
      pool.add(candidate.unitId);
  let hp = target.hp - preview.damageToDefender;
  while (pool.size > 0) {
    const projected = projectPublicUnitForPolicyV7(view, target.id, { hp });
    let best: {
      readonly id: UnitId;
      readonly damage: number;
      readonly dies: boolean;
    } | null = null;
    for (const unitId of pool) {
      const shot = queryCombatPreviewV7(projected, unitId, target.id);
      if (shot === null) continue;
      if (
        best === null ||
        shot.damageToDefender > best.damage ||
        (shot.damageToDefender === best.damage && unitId < best.id)
      )
        best = {
          id: unitId,
          damage: shot.damageToDefender,
          dies: shot.defenderDies,
        };
    }
    if (best === null || best.damage <= 0) return false;
    if (best.dies) return true;
    hp -= best.damage;
    pool.delete(best.id);
  }
  return false;
}

/** A hostile city center the campaign marches on. */
function campaignAssaultCityV7(
  context: PolicyContextV7,
  at: CoordV7,
): PlayerViewV7["cities"][number] | undefined {
  const city = context.lookup.citiesByKey.get(coordKey(at));
  return city !== undefined &&
    context.tactical.campaign?.targetByCityId.has(city.id) === true
    ? city
    : undefined;
}

/** Endgame training: capturers and siege units wanted near the targets. */
const ENDGAME_CAPTURER_TARGET_V7 = 4;
const ENDGAME_SIEGE_TARGET_V7 = 3;
const ENDGAME_TRAINING_BIAS_V7 = 16;

/**
 * Revision 18: a land unit with Move 2 or more can pass through the viewer's
 * own units, so its endgame route crosses their tiles. A Move-1 unit spends
 * its whole budget on one roadless step and keeps the field in which every
 * unit is a wall.
 */
function passesOwnUnitsV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return unit.form === "LAND" && unitRoleRuleV7(view, unit).move >= 2;
}

/** Own units matching `wanted` that can route to an endgame target. */
function endgameRoutedUnitsV7(
  context: PolicyContextV7,
  wanted: (unit: PublicUnitV7) => boolean,
): number {
  const plan = context.endgame;
  if (plan === null) return 0;
  const view = context.view;
  return view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      wanted(unit) &&
      Number.isFinite(
        endgameRouteDistanceV7(
          plan,
          view,
          unit.at,
          passesOwnUnitsV7(view, unit),
        ),
      ),
  ).length;
}

/** An own capturer off every target center can still route to a target. */
function endgameCapturersWaitingV7(context: PolicyContextV7): boolean {
  const plan = context.endgame;
  if (plan === null) return false;
  const view = context.view;
  return view.units.some(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      canCaptureV7(view, unit) &&
      endgameTargetAtV7(plan, unit.at) === undefined &&
      Number.isFinite(
        endgameRouteDistanceV7(
          plan,
          view,
          unit.at,
          passesOwnUnitsV7(view, unit),
        ),
      ),
  );
}

/** Landing value for an embarked capturer within three route steps. */
function endgameLandingValueV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "DISEMBARK" }>,
): number {
  const plan = context.endgame;
  if (plan === null) return 0;
  const view = context.view;
  const actor = context.lookup.unitsById.get(command.unitId);
  if (
    actor === undefined ||
    !unitRoleRuleV7(view, actor).abilities.includes("CAPTURE")
  )
    return 0;
  const route = plan.routeDistanceByKey.get(coordKey(command.at));
  if (route === undefined || route > 3) return 0;
  // pulp_wars-ykw.7: the route must lead to a target city. While the plan
  // only searches (its routes end on unexplored tiles), a transport keeps
  // exploring by sea: landed for the search, a unit walked a step, boarded
  // to explore, and was landed again.
  if (!plan.targets.some((city) => distance(city.at, command.at) <= route))
    return 0;
  const landed: PublicUnitV7 = { ...actor, form: "LAND", at: command.at };
  if (visibleImmediateDamage(view, landed, command.at, context) >= actor.hp)
    return 0;
  return 10 - 2 * route;
}

/**
 * `pulp_wars-ykw.7`: whether this capturer can walk to an endgame target
 * (the plan has a public land route from its tile), so it stays ashore: the
 * plan lands embarked capturers near its targets
 * ({@link endgameLandingValueV7}).
 */
function endgameKeepsAshoreV7(
  context: PolicyContextV7,
  unitId: UnitId,
): boolean {
  const plan = context.endgame;
  const actor = context.lookup.unitsById.get(unitId);
  if (
    plan === null ||
    actor === undefined ||
    actor.form !== "LAND" ||
    !unitRoleRuleV7(context.view, actor).abilities.includes("CAPTURE")
  )
    return false;
  return Number.isFinite(
    endgameRouteDistanceV7(
      plan,
      context.view,
      actor.at,
      passesOwnUnitsV7(context.view, actor),
    ),
  );
}

/** A capturer that has not moved and can still route closer to a target. */
function endgameCapturerShouldApproachV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): boolean {
  const plan = context.endgame;
  if (
    plan === null ||
    actor.activation.moved ||
    !canCaptureV7(context.view, actor)
  )
    return false;
  const route = endgameRouteDistanceV7(
    plan,
    context.view,
    actor.at,
    passesOwnUnitsV7(context.view, actor),
  );
  return Number.isFinite(route) && route > 1;
}

/**
 * Endgame movement: a non-capturing unit leaves a target center for a fresh
 * adjacent capturer and does not squat on one near capturers; capturers and
 * siege units close in along public land routes (units are walls, except
 * that a Move-2+ unit routes through the viewer's own units) as long as the
 * destination is not in visible lethal reach.
 */
function endgameMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  basePriority: number,
): { readonly priority: number; readonly strategic: number } {
  const plan = context.endgame;
  const unchanged = { priority: basePriority, strategic: 0 };
  if (plan === null || actor.form !== "LAND") return unchanged;
  const view = context.view;
  const capture = canCaptureV7(view, actor);
  const here = endgameTargetAtV7(plan, actor.at);
  if (here !== undefined) {
    if (
      capture ||
      freshCapturerNextToV7(context, here.at, new Set([actor.id])) === undefined
    )
      return unchanged;
    return {
      priority: Math.max(basePriority, ENDGAME_VACATE_PRIORITY_V7),
      strategic: -visibleImmediateDamage(view, actor, to, context),
    };
  }
  const onto = endgameTargetAtV7(plan, to);
  if (onto !== undefined) {
    if (capture) return unchanged;
    return view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.id !== actor.id &&
        distance(unit.at, onto.at) <= 2 &&
        canCaptureV7(view, unit),
    )
      ? { priority: -1, strategic: 0 }
      : unchanged;
  }
  if (!capture && endgameCapturersWaitingV7(context)) {
    // The eight tiles around a target center are the capturers' approach:
    // non-capturing units neither take one nor keep one.
    const rangeFrom = endgameTargetDistanceV7(plan, actor.at);
    const rangeTo = endgameTargetDistanceV7(plan, to);
    if (rangeTo <= 1) return { priority: -1, strategic: 0 };
    if (rangeFrom <= 1)
      return {
        priority: Math.max(basePriority, ENDGAME_VACATE_PRIORITY_V7),
        strategic: -visibleImmediateDamage(view, actor, to, context),
      };
  }
  const siege = policySiegeRuleV7(unitRoleRuleV7(view, actor));
  if (!capture && !siege) return unchanged;
  const passes = passesOwnUnitsV7(view, actor);
  const next = (
    passes ? plan.passRouteDistanceByKey : plan.routeDistanceByKey
  ).get(coordKey(to));
  if (next === undefined) return unchanged;
  let ring = false;
  if (siege) {
    // Siege units stop 2–3 from the target (minimum range 2).
    const rangeFrom = endgameTargetDistanceV7(plan, actor.at);
    const rangeTo = endgameTargetDistanceV7(plan, to);
    if (
      !Number.isFinite(rangeTo) ||
      (rangeFrom >= 2 && rangeFrom <= 3) ||
      rangeTo < 2
    )
      return unchanged;
    ring = rangeTo <= 3;
  }
  const from = endgameRouteDistanceV7(plan, view, actor.at, passes);
  const progress = Number.isFinite(from) ? from - next : 1;
  if (progress <= 0 && !ring) return unchanged;
  if (visibleImmediateDamage(view, actor, to, context) >= actor.hp)
    return unchanged;
  return {
    priority: Math.max(basePriority, ENDGAME_APPROACH_PRIORITY_V7),
    strategic: 2 * Math.max(0, Math.min(3, progress)) + (ring ? 8 : 0),
  };
}

// ---------------------------------------------------------------------------
// `pulp_wars-68k.6` siege of a single-file front (`src/ai/v7-chokepoint.ts`).
// Every helper returns the ordinary behavior (false / unchanged) when
// `context.chokepoint` is null, so a position without a chokepoint front
// keeps its decision. They read only the public view, the offered commands,
// and the public previews, and add no PRNG use, elapsed-time input, or work
// units: each is a bounded scan inside an existing scoring step.

/**
 * The assault on a single-file front is on: the attrition clock has struck
 * (`chokepointAssaultV7`), or, for a seat that plays the army rules, the
 * own units that have come up outweigh the garrison (the position of a
 * garrison unit is committed, `armyAssaultV7`). The correction pass of
 * tuning 6: a seat with numbers attacks the gate every turn instead of
 * waiting for its Coins to pile up.
 */
function chokepointAssaultOnV7(context: PolicyContextV7): boolean {
  if (chokepointAssaultV7(context.view)) return true;
  return chokepointNumbersV7(context);
}

/**
 * A Blast Mountain outside the own territory that helps at a chokepoint
 * front with numbers: the Mountain is next to the corridor or to a holder
 * (it becomes ground the column can use), or the blast hurts the garrison.
 */
function chokepointBlastV7(
  context: PolicyContextV7,
  at: CoordV7,
  hostileDamage: number,
): boolean {
  const plan = context.chokepoint;
  if (plan === null || !chokepointNumbersV7(context)) return false;
  return (
    hostileDamage > 0 ||
    plan.corridor.some((tile) => distance(tile, at) <= 1) ||
    plan.holders.some((holder) => distance(holder.at, at) <= 1)
  );
}

/** The own units at a chokepoint front outweigh its garrison. */
function chokepointNumbersV7(context: PolicyContextV7): boolean {
  const plan = context.chokepoint;
  if (plan === null || !context.army) return false;
  const positions = armyAssaultV7(context).positionByHostile;
  return plan.garrison.some(
    (unit) => positions.get(unit.id)?.mode === "COMMIT",
  );
}

/** The viewer's own land unit a placement rule applies to, or undefined. */
function chokepointActorV7(
  context: PolicyContextV7,
  unitId: UnitId,
): PublicUnitV7 | undefined {
  const actor = context.lookup.unitsById.get(unitId);
  return actor !== undefined &&
    actor.form === "LAND" &&
    actor.ownerId === context.view.viewer.id
    ? actor
    : undefined;
}

/** A Move the placement rule refuses (`chokepointPlaceAllowedV7`). */
function chokepointMoveRejectedV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
): boolean {
  const plan = context.chokepoint;
  if (plan === null) return false;
  const actor = chokepointActorV7(context, command.unitId);
  const to = command.path.at(-1);
  if (actor === undefined || to === undefined) return false;
  if (!chokepointPlaceAllowedV7(context.view, plan, actor, to)) return true;
  // Every other unit stays off the firing tiles the siege units walk to.
  return (
    plan.indexOf(to) === undefined &&
    chokepointUnitClassV7(context.view, actor) !== "RANGED" &&
    chokepointClaimedSlotsV7(context, plan).has(coordKey(to))
  );
}

/**
 * A siege unit may stand on a tile the placement rule gives it (behind the
 * column, or off the corridor) with a target in range: the column is its
 * screen, so the ordinary "a siege tile needs a durable screen" rule does
 * not refuse it.
 */
function chokepointSiegeSlotV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const plan = context.chokepoint;
  if (plan === null || actor.ownerId !== context.view.viewer.id) return false;
  return (
    chokepointUnitClassV7(context.view, actor) === "RANGED" &&
    chokepointTargetsInRangeV7(context.view, plan, actor, to) > 0 &&
    chokepointPlaceAllowedV7(context.view, plan, actor, to) &&
    (chokepointAssaultOnV7(context) ||
      visibleImmediateDamage(context.view, actor, to, context) < actor.hp)
  );
}

/** The holder `unitId`, if it holds the front. */
function chokepointHolderV7(
  context: PolicyContextV7,
  unitId: UnitId,
): PublicUnitV7 | undefined {
  return context.chokepoint?.holders.find((holder) => holder.id === unitId);
}

/**
 * The focus of this turn's fire: the holder left with the least HP by the
 * unanswered own attacks still on offer (`chokepointFocusV7`).
 */
function chokepointFocusForContextV7(
  context: PolicyContextV7,
): PublicUnitV7 | null {
  if (context.chokepointFocus !== undefined) return context.chokepointFocus;
  const plan = context.chokepoint;
  let focus: PublicUnitV7 | null = null;
  if (plan !== null) {
    // Only a holder some own unit can attack this turn is a focus.
    const damage = new Map<UnitId, number>();
    for (const candidate of context.commands) {
      if (
        candidate.kind !== "ATTACK" ||
        chokepointHolderV7(context, candidate.targetUnitId) === undefined
      )
        continue;
      const shot = queryCombatPreviewV7(
        context.view,
        candidate.unitId,
        candidate.targetUnitId,
      );
      if (shot === null) continue;
      damage.set(
        candidate.targetUnitId,
        (damage.get(candidate.targetUnitId) ?? 0) +
          (shot.damageToAttacker > 0 || shot.attackerDies
            ? 0
            : shot.damageToDefender),
      );
    }
    focus = chokepointFocusV7(plan, (holder) => damage.get(holder.id) ?? null);
  }
  context.chokepointFocus = focus;
  return focus;
}

/**
 * An attack on a holder other than the focus by a unit that has the focus
 * on offer: it fires at the focus instead. A kill is always taken.
 */
function chokepointOffFocusV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
): boolean {
  if (context.chokepoint === null) return false;
  const focus = chokepointFocusForContextV7(context);
  if (
    focus === null ||
    focus.id === command.targetUnitId ||
    chokepointHolderV7(context, command.targetUnitId) === undefined ||
    !context.commands.some(
      (candidate) =>
        candidate.kind === "ATTACK" &&
        candidate.unitId === command.unitId &&
        candidate.targetUnitId === focus.id,
    )
  )
    return false;
  return (
    queryCombatPreviewV7(context.view, command.unitId, command.targetUnitId)
      ?.defenderDies !== true
  );
}

/**
 * The committed attack: a melee attack on the focus that the policy
 * otherwise refuses as harmful is taken when the attacker survives, no
 * unanswered own attack on the target is still on offer (the fire comes
 * first), and either the target is wounded (at most half its HP: the siege
 * fire has done its work) or the attrition clock has struck
 * (`chokepointAssaultV7`) and this turn's surviving attackers together
 * out-damage the target's idle recovery.
 */
function chokepointCommitV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): boolean {
  const plan = context.chokepoint;
  if (plan === null || preview.attackerDies || preview.damageToDefender <= 0)
    return false;
  const view = context.view;
  const actor = chokepointActorV7(context, command.unitId);
  const target = chokepointHolderV7(context, command.targetUnitId);
  if (
    actor === undefined ||
    target === undefined ||
    chokepointUnitClassV7(view, actor) === "RANGED" ||
    chokepointUnitClassV7(view, actor) === "OTHER"
  )
    return false;
  const focus = chokepointFocusForContextV7(context);
  if (focus !== null && focus.id !== target.id) return false;
  for (const candidate of context.commands) {
    if (
      candidate.kind !== "ATTACK" ||
      candidate.targetUnitId !== target.id ||
      candidate.unitId === command.unitId
    )
      continue;
    const shot = queryCombatPreviewV7(view, candidate.unitId, target.id);
    if (
      shot !== null &&
      shot.damageToAttacker === 0 &&
      !shot.attackerDies &&
      shot.damageToDefender > 0
    )
      return false;
  }
  if (target.hp * 2 <= target.maxHp) return true;
  if (!chokepointAssaultOnV7(context)) return false;
  // With numbers the gate is fed every turn: the head attacks whenever it
  // survives, and the next unit takes its place when it is worn down.
  if (chokepointNumbersV7(context)) return true;
  // The assault: this turn's surviving attackers together out-damage the
  // target's idle recovery.
  const tile = findPublicTileV7(view, target.at);
  const recovery = context.undead
    ? publicIdleRecoveryV7(view, target.ownerId, target.at)
    : tile?.explored === true && tile.territoryOwnerId === target.ownerId
      ? 4
      : 2;
  let combined = 0;
  for (const candidate of context.commands) {
    if (candidate.kind !== "ATTACK" || candidate.targetUnitId !== target.id)
      continue;
    const hit = queryCombatPreviewV7(view, candidate.unitId, target.id);
    if (hit !== null && !hit.attackerDies) combined += hit.damageToDefender;
  }
  return combined > recovery;
}

/** Focused fire first, then the committed attack, then the column moves. */
function chokepointAttackPriorityV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
  priority: number,
): number {
  if (
    context.chokepoint === null ||
    chokepointActorV7(context, command.unitId) === undefined ||
    chokepointHolderV7(context, command.targetUnitId) === undefined
  )
    return priority;
  const focus = chokepointFocusForContextV7(context);
  if (focus !== null && focus.id !== command.targetUnitId) return priority;
  if (preview.damageToAttacker === 0 && !preview.attackerDies)
    return Math.max(priority, CHOKEPOINT_FIRE_PRIORITY_V7);
  return chokepointCommitV7(context, command, preview)
    ? Math.max(priority, CHOKEPOINT_COMMIT_PRIORITY_V7)
    : priority;
}

/**
 * Column moves, in this order:
 *
 * 1. A unit that is out of place on the corridor leaves toward home
 *    (`chokepointShouldVacateV7`): a wounded head rotates out just above an
 *    urgent Recover, a siege or support unit after its shots.
 * 2. A unit on an apron tile the placement rule does not give it makes room, and
 *    so does a unit on the jammed apron or on a tile a siege unit walks to.
 * 3. A siege unit walks to its firing tile (`chokepointSlotV7`).
 * 4. A melee unit steps onto the corridor, along it, and from its far end
 *    into the mouth, the strongest first: outside visible lethal reach
 *    while the mouth is held, at once through the open mouth or when the
 *    attrition clock has struck.
 */
function chokepointMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  basePriority: number,
): { readonly priority: number; readonly strategic: number } {
  const plan = context.chokepoint;
  const unchanged = { priority: basePriority, strategic: 0 };
  const view = context.view;
  if (
    plan === null ||
    actor.form !== "LAND" ||
    actor.ownerId !== view.viewer.id
  )
    return unchanged;
  const from = plan.indexOf(actor.at);
  const toIndex = plan.indexOf(to);
  const unitClass = chokepointUnitClassV7(view, actor);
  if (from !== undefined && chokepointShouldVacateV7(view, plan, actor)) {
    const back = toIndex === undefined ? plan.homeSide(to) : toIndex < from;
    if (!back) return unchanged;
    return {
      priority: Math.max(
        basePriority,
        unitClass === "HEAD" || unitClass === "MELEE"
          ? CHOKEPOINT_ROTATE_PRIORITY_V7
          : CHOKEPOINT_LANE_PRIORITY_V7,
      ),
      strategic: -visibleImmediateDamage(view, actor, to, context),
    };
  }
  // A unit on an apron tile the placement rule does not give it makes room (a
  // siege unit on the queue tile, a melee unit on the siege's side).
  if (
    from === undefined &&
    toIndex === undefined &&
    chokepointApronBlockerV7(view, plan, actor) &&
    plan.homeSide(to)
  )
    return {
      priority: Math.max(basePriority, CHOKEPOINT_LANE_PRIORITY_V7),
      strategic: -visibleImmediateDamage(view, actor, to, context),
    };
  // A unit on the jammed apron makes room for the unit leaving the corridor
  // (the weakest goes: the staged replacement is the strongest).
  if (
    from === undefined &&
    toIndex === undefined &&
    chokepointApronV7(plan, actor.at) &&
    !chokepointApronV7(plan, to) &&
    plan.homeSide(to) &&
    chokepointApronJammedV7(view, plan)
  )
    return {
      priority: Math.max(basePriority, CHOKEPOINT_ROTATE_PRIORITY_V7),
      strategic: -Math.floor(chokepointStrengthV7(view, actor) / 16),
    };
  // A unit on a tile the staged siege units need makes room.
  if (
    unitClass !== "RANGED" &&
    from === undefined &&
    toIndex === undefined &&
    plan.homeSide(to) &&
    chokepointClaimedSlotsV7(context, plan).has(coordKey(actor.at)) &&
    !chokepointClaimedSlotsV7(context, plan).has(coordKey(to))
  )
    return {
      priority: Math.max(basePriority, CHOKEPOINT_ROTATE_PRIORITY_V7),
      strategic: 0,
    };
  if (unitClass === "RANGED") {
    const slot = chokepointSlotV7(context, plan, actor);
    if (
      slot === null ||
      chokepointSlotStepsV7(context, plan, actor, slot.at, to) >=
        chokepointSlotStepsV7(context, plan, actor, slot.at, actor.at) ||
      (!chokepointAssaultOnV7(context) &&
        visibleImmediateDamage(view, actor, to, context) >= actor.hp)
    )
      return unchanged;
    // A tile with two more targets in range is worth this turn's shot.
    return {
      priority: Math.max(
        basePriority,
        slot.gain >= 2
          ? CHOKEPOINT_FIRE_PRIORITY_V7 + 1
          : CHOKEPOINT_LANE_PRIORITY_V7,
      ),
      strategic: 8 + (same(to, slot.at) ? 4 : 0),
    };
  }
  if (unitClass === "OTHER" || (!plan.open && !chokepointFitV7(actor)))
    return unchanged;
  // The column: a fit melee unit steps onto the corridor, along it, and
  // from its far end into the mouth. The strongest unit goes first.
  const far = plan.corridor.length - 1;
  const forward =
    toIndex !== undefined
      ? from === undefined || toIndex > from
      : from === far &&
        !plan.homeSide(to) &&
        (plan.stepsToTarget(to) ?? Number.POSITIVE_INFINITY) <
          (plan.stepsToTarget(actor.at) ?? 0);
  if (!forward) return unchanged;
  // Outside visible lethal reach, unless the mouth is open (the siege fire
  // cleared it: the column goes through) or the attrition clock has struck.
  if (
    !plan.open &&
    !chokepointAssaultOnV7(context) &&
    visibleImmediateDamage(view, actor, to, context) >= actor.hp
  )
    return unchanged;
  return {
    priority: Math.max(basePriority, CHOKEPOINT_LANE_PRIORITY_V7),
    strategic: 2 + Math.floor(chokepointStrengthV7(view, actor) / 64),
  };
}

/**
 * The firing tiles the own siege units walk to (`chokepointSlotV7`). Every
 * other own unit stays off them, and one standing on such a tile makes
 * room: the siege units fire from where they hit the holders, and the corridor
 * stays free.
 */
function chokepointClaimedSlotsV7(
  context: PolicyContextV7,
  plan: ChokepointPlanV7,
): ReadonlySet<string> {
  if (context.chokepointClaims !== null) return context.chokepointClaims;
  const view = context.view;
  const claims = new Set<string>();
  for (const unit of view.units) {
    if (
      unit.ownerId !== view.viewer.id ||
      chokepointUnitClassV7(view, unit) !== "RANGED"
    )
      continue;
    const slot = chokepointSlotV7(context, plan, unit);
    if (slot !== null) claims.add(coordKey(slot.at));
  }
  context.chokepointClaims = claims;
  return claims;
}

/** A siege unit looks this far (Chebyshev) for a better firing tile. */
const CHOKEPOINT_SLOT_RADIUS_V7 = 4;

/**
 * The firing tile a siege unit walks to: the explored land tile within
 * `CHOKEPOINT_SLOT_RADIUS_V7` that the placement rule gives it (on the home
 * side, or on the corridor behind the column), not held by a hostile or
 * another siege unit (an own melee unit on it makes room), outside visible
 * lethal reach (unless the attrition clock has struck), with the most
 * targets in range (`chokepointTargetsInRangeV7`), off the corridor first,
 * then the nearest, then the first by (y, x). Null when no tile has more
 * targets in range than the unit's own.
 */
function chokepointSlotV7(
  context: PolicyContextV7,
  plan: ChokepointPlanV7,
  actor: PublicUnitV7,
): { readonly at: CoordV7; readonly gain: number } | null {
  const cached = context.chokepointSlots.get(actor.id);
  if (cached !== undefined) return cached;
  const view = context.view;
  const here = chokepointTargetsInRangeV7(view, plan, actor, actor.at);
  const occupied = new Set<string>();
  for (const unit of view.units)
    if (
      unit.id !== actor.id &&
      !(
        unit.ownerId === view.viewer.id &&
        chokepointUnitClassV7(view, unit) !== "RANGED"
      )
    )
      occupied.add(coordKey(unit.at));
  let best: { at: CoordV7; score: number; count: number } | null = null;
  const radius = CHOKEPOINT_SLOT_RADIUS_V7;
  for (let dy = -radius; dy <= radius; dy += 1)
    for (let dx = -radius; dx <= radius; dx += 1) {
      const at = { x: actor.at.x + dx, y: actor.at.y + dy };
      if (plan.stepsToTarget(at) === undefined || occupied.has(coordKey(at)))
        continue;
      const onCorridor = plan.indexOf(at) !== undefined;
      if (
        (!onCorridor && !plan.homeSide(at)) ||
        !chokepointPlaceAllowedV7(view, plan, actor, at)
      )
        continue;
      const count = chokepointTargetsInRangeV7(view, plan, actor, at);
      if (count <= here) continue;
      const score =
        10 * count +
        (onCorridor ? 0 : 3) -
        Math.max(Math.abs(dx), Math.abs(dy));
      if (best !== null && score <= best.score) continue;
      if (
        !chokepointAssaultOnV7(context) &&
        visibleImmediateDamage(view, actor, at, context) >= actor.hp
      )
        continue;
      best = { at, score, count };
    }
  const slot = best === null ? null : { at: best.at, gain: best.count - here };
  context.chokepointSlots.set(actor.id, slot);
  return slot;
}

/**
 * Steps from `at` to a siege unit's firing tile over the tiles the
 * placement rule gives the unit (the queue tile is not one, so the walk
 * goes round it), units not counted as walls; infinite when there is no
 * such walk within `2 * CHOKEPOINT_SLOT_RADIUS_V7` steps.
 */
function chokepointSlotStepsV7(
  context: PolicyContextV7,
  plan: ChokepointPlanV7,
  actor: PublicUnitV7,
  slot: CoordV7,
  at: CoordV7,
): number {
  const cacheKey = `${String(actor.id)}:${coordKey(slot)}`;
  let steps = context.chokepointSlotSteps.get(cacheKey);
  if (steps === undefined) {
    steps = new Map<string, number>([[coordKey(slot), 0]]);
    const queue: CoordV7[] = [slot];
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) break;
      const next = (steps.get(coordKey(current)) ?? 0) + 1;
      if (next > 2 * CHOKEPOINT_SLOT_RADIUS_V7) continue;
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          const tile = { x: current.x + dx, y: current.y + dy };
          if (
            steps.has(coordKey(tile)) ||
            plan.stepsToTarget(tile) === undefined ||
            (plan.indexOf(tile) === undefined && !plan.homeSide(tile)) ||
            // The unit's own tile is walkable wherever it stands.
            (!same(tile, actor.at) &&
              !chokepointPlaceAllowedV7(context.view, plan, actor, tile))
          )
            continue;
          steps.set(coordKey(tile), next);
          queue.push(tile);
        }
    }
    context.chokepointSlotSteps.set(cacheKey, steps);
  }
  return steps.get(coordKey(at)) ?? Number.POSITIVE_INFINITY;
}

/** The seat besieges a single-file front with fewer siege units than wanted. */
function chokepointSiegeShortfallV7(context: PolicyContextV7): boolean {
  if (context.chokepoint === null) return false;
  const view = context.view;
  return (
    view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        policySiegeRuleV7(unitRoleRuleV7(view, unit)),
    ).length < CHOKEPOINT_SIEGE_TARGET_V7
  );
}

// ---------------------------------------------------------------------------
// Revision 17 Goblin play (`pulp_wars-0ao.6`). Everything below runs only in
// a match with a Goblin seat (`context.goblin`), reads only the public view,
// public commands, and the public previews, and adds no PRNG use,
// elapsed-time input, or work units: each helper is a bounded scan of the
// view inside an existing scoring step.

interface GoblinAttackFactsV7 {
  /** The previewed death-blast chain the attack sets off (null: none). */
  readonly chain: ExplosionChainValueV7 | null;
  /** The viewer's Plunder Coins from its own units' blasts in that chain. */
  readonly chainPlunder: number;
  readonly hostileSplashValue: number;
  readonly hostileSplashKills: number;
  readonly friendlySplashValue: number;
  /** Own and allied units the bomb splash hits and kills (`0ao.13`). */
  readonly friendlySplashHits: number;
  readonly friendlySplashKills: number;
}

function friendlyOwnerV7(view: PlayerViewV7, ownerId: PlayerId): boolean {
  return publicPlayersAllied(view, view.viewer.id, ownerId);
}

/** Realized loss of a hostile unit, in target strategic value. */
function hostileLossValueV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  damage: number,
  dies: boolean,
): number {
  const value = targetStrategicValue(context.view, unit.id, context.lookup);
  return dies || unit.hp <= 0
    ? value
    : Math.floor((value * Math.min(damage, unit.hp)) / unit.hp);
}

/** Realized loss of an own or allied unit, in retained unit value. */
function friendlyLossValueV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  damage: number,
  dies: boolean,
): number {
  const value = retainedUnitValue(view, unit);
  return dies || unit.hp <= 0
    ? value
    : Math.floor((value * Math.min(damage, unit.hp)) / unit.hp);
}

/** Splash entries that name an own or allied unit (Goblin bombs only). */
function friendlySplashUnitV7(
  view: PlayerViewV7 | undefined,
  unitId: UnitId,
): PublicUnitV7 | undefined {
  if (view === undefined) return undefined;
  const unit = view.units.find((item) => item.id === unitId);
  return unit !== undefined && !isHostile(view, unit.ownerId)
    ? unit
    : undefined;
}

function goblinAttackFactsV7(
  context: PolicyContextV7,
  command: AttackCommandV7,
  preview: CombatPreviewV7,
): GoblinAttackFactsV7 {
  const key = `${command.unitId}:${command.targetUnitId}`;
  const cached = context.goblinAttackFacts.get(key);
  if (cached !== undefined) return cached;
  const view = context.view;
  const exploding = (unitId: UnitId): boolean => {
    const unit = context.lookup.unitsById.get(unitId);
    return unit !== undefined && deathBlastDamageV7(view, unit) > 0;
  };
  let hostileSplashValue = 0;
  let hostileSplashKills = 0;
  let friendlySplashValue = 0;
  let friendlySplashHits = 0;
  let friendlySplashKills = 0;
  let exploderDies =
    (preview.defenderDies && exploding(command.targetUnitId)) ||
    (preview.attackerDies && exploding(command.unitId));
  for (const splash of preview.splash) {
    const unit = context.lookup.unitsById.get(splash.unitId);
    if (unit === undefined) continue;
    if (splash.dies && exploding(unit.id)) exploderDies = true;
    if (isHostile(view, unit.ownerId)) {
      hostileSplashValue += hostileLossValueV7(
        context,
        unit,
        splash.damage,
        splash.dies,
      );
      if (splash.dies) hostileSplashKills += 1;
    } else if (friendlyOwnerV7(view, unit.ownerId)) {
      friendlySplashValue += friendlyLossValueV7(
        view,
        unit,
        splash.damage,
        splash.dies,
      );
      friendlySplashHits += 1;
      if (splash.dies) friendlySplashKills += 1;
    }
  }
  let chain: ExplosionChainValueV7 | null = null;
  let chainPlunder = 0;
  if (exploderDies) {
    const explosions = previewAttackExplosionsV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (explosions !== null && explosions.explosions.length > 0) {
      chain = explosionChainValueV7(
        view,
        explosions,
        (owner) => isHostile(view, owner),
        (unit, damage, dies) => hostileLossValueV7(context, unit, damage, dies),
        (unit, damage, dies) => friendlyLossValueV7(view, unit, damage, dies),
      );
      chainPlunder = explosions.totals.plunderCoins;
    }
  }
  const facts: GoblinAttackFactsV7 = {
    chain,
    chainPlunder,
    hostileSplashValue,
    hostileSplashKills,
    friendlySplashValue,
    friendlySplashHits,
    friendlySplashKills,
  };
  context.goblinAttackFacts.set(key, facts);
  return facts;
}

/**
 * Goblin-match attack value: death blasts the kill sets off (hostile minus
 * friendly), Gang Up (prefer targets with more own units adjacent), and the
 * Plunder Coins the kills pay.
 */
function goblinAttackValueV7(
  context: PolicyContextV7,
  command: AttackCommandV7,
  preview: CombatPreviewV7,
): { readonly strategic: number; readonly immediate: number } {
  const view = context.view;
  const facts = goblinAttackFactsV7(context, command, preview);
  let strategic = 2 * preview.gangUp;
  let immediate = 0;
  const chain = facts.chain;
  if (chain !== null) {
    strategic += chain.hostileValue - chain.friendlyValue;
    immediate +=
      10 * chain.hostileDamage +
      20 * chain.hostileKills -
      12 * chain.friendlyDamage -
      24 * chain.friendlyKills;
  }
  const plunder = technologyCapabilitiesV7(
    view.viewer.researchedTechs,
    view.viewer.faction,
  ).plunderCoins;
  if (plunder > 0) {
    const coins =
      plunder * (Number(preview.defenderDies) + facts.hostileSplashKills) +
      facts.chainPlunder;
    immediate += coins;
    strategic += COIN_STRATEGIC_VALUE_V7 * coins;
  }
  return { strategic, immediate };
}

/**
 * Goblin-match harm test: an attack whose bomb splash or death-blast chain
 * hurts own or allied units must win at least twice that value from hostile
 * units (for the blast of a hostile Kaboom unit, which could blow up there on
 * its own turn: nothing unless it kills own units, then once), unless it
 * saves a city, clears a hostile city center, or is part of the endgame
 * combined kill. A bomb whose splash kills an own or allied unit
 * (`pulp_wars-0ao.13`) must also kill its target and kill more hostile units
 * than own and allied ones, at any value; only a city save or the endgame
 * combined kill excuses it.
 */
function goblinFriendlyFireRejectedV7(
  context: PolicyContextV7,
  command: AttackCommandV7,
  preview: CombatPreviewV7,
): boolean {
  const facts = goblinAttackFactsV7(context, command, preview);
  const chainLoss = facts.chain?.friendlyValue ?? 0;
  if (facts.friendlySplashValue + chainLoss <= 0) return false;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined) return false;
  const savesCityOrEndgame = (): boolean =>
    attackPurposeFactsV7(context, command, preview).savesCity ||
    endgameCombinedKillV7(context, command, preview);
  // pulp_wars-0ao.13: a bomb that kills own or allied units for a chip, or
  // trades them one for one (or worse) with hostile units, is careless at
  // any value, even when it clears a hostile city center.
  const hostileKills =
    Number(preview.defenderDies) +
    facts.hostileSplashKills +
    (facts.chain?.hostileKills ?? 0);
  if (
    facts.friendlySplashKills > 0 &&
    (!preview.defenderDies || facts.friendlySplashKills >= hostileKills)
  )
    return !savesCityOrEndgame();
  // A hostile land-form unit with Kaboom can blow up next to the same units
  // on its own turn anyway: the blast its death sets off is no extra cost
  // unless it kills own units, and then counts once. Own bomb splash and any
  // other blast count twice.
  const inevitable =
    preview.defenderDies &&
    target.form === "LAND" &&
    kaboomDamageV7(context.view, target) >=
      deathBlastDamageV7(context.view, target);
  const chainFactor = !inevitable
    ? FRIENDLY_FIRE_TRADE_FACTOR_V7
    : (facts.chain?.friendlyKills ?? 0) > 0
      ? 1
      : 0;
  const friendlyLoss =
    FRIENDLY_FIRE_TRADE_FACTOR_V7 * facts.friendlySplashValue +
    chainFactor * chainLoss;
  if (friendlyLoss <= 0) return false;
  const hostileGain =
    hostileLossValueV7(
      context,
      target,
      preview.damageToDefender,
      preview.defenderDies,
    ) +
    facts.hostileSplashValue +
    (facts.chain?.hostileValue ?? 0);
  if (hostileGain >= friendlyLoss) return false;
  const city = context.lookup.citiesByKey.get(coordKey(target.at));
  if (
    preview.defenderDies &&
    city !== undefined &&
    isHostile(context.view, city.ownerId)
  )
    return false;
  return !savesCityOrEndgame();
}

/** Visible enemies can kill `unit` at `at` next turn (public estimate). */
function goblinDoomedAtV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  at: CoordV7,
): boolean {
  if (same(unit.at, at)) {
    const cached = context.goblinDoomed.get(unit.id);
    if (cached !== undefined) return cached;
    const doomed =
      visibleImmediateDamage(context.view, unit, at, context) >= unit.hp;
    context.goblinDoomed.set(unit.id, doomed);
    return doomed;
  }
  return visibleImmediateDamage(context.view, unit, at, context) >= unit.hp;
}

/**
 * The Goblin hand pass at `7r55` (`pulp_wars-w49.19`): whether `actor`,
 * which cannot attack `victim` from where it stands, kills it this turn
 * with its ordinary attack after a Move: a fresh unit that may attack after
 * moving, an offered destination at its range, and a projected hit of the
 * victim's HP (a bomb only where its splash would be accepted). A Bomb
 * Chucker beside a Fighter with 3 HP, which it cannot throw at from the
 * next tile, blew itself up for that one kill, twice in one hand-played
 * game, where a step back and a bomb kill the Fighter too and the Bomb
 * Chucker lives. A unit with an offered attack on the victim is not the
 * case: its kill is already ranked above the blast.
 */
function goblinStepBackKillV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  victimId: UnitId,
): boolean {
  const view = context.view;
  const victim = context.lookup.unitsById.get(victimId);
  if (victim === undefined) return false;
  if (
    context.commands.some(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === actor.id &&
        command.targetUnitId === victimId,
    )
  )
    return false;
  if (
    actor.activation.moved ||
    !unitMayActAfterMoveV7(view, actor) ||
    !primaryReadyForPolicyV7(actor)
  )
    return false;
  const facts = publicCombatFacts(view, actor, context.lookup);
  if (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0) return false;
  const bomber = friendlyFireBomberV7(view, actor);
  for (const to of context.lookup.moveDestinationsByUnit.get(actor.id) ?? []) {
    const range = distance(to, victim.at);
    if (range < facts.minimumRange || range > facts.maximumRange) continue;
    const dealt = publicProjectedDamageWithLookupV7(
      view,
      { ...actor, at: to },
      victim,
      victim.at,
      {},
      context.lookup,
    );
    if (dealt < victim.hp) continue;
    if (bomber && !armyBombSplashAcceptedV7(context, actor, victim, dealt))
      continue;
    return true;
  }
  return false;
}

/**
 * Kaboom (section 6.2) by previewed net value: hostile damage and kills
 * (target value) plus Plunder, a city save, or a cleared hostile center for
 * an own capturer, minus own and allied damage and kills and the exploder
 * itself (a third of it when visible enemies would kill it anyway; plus the
 * enemy Zombie a Bitten exploder would rise as). Never net-negative.
 */
function kaboomScoreV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const view = context.view;
  const none = { priority: -1, strategic: 0, immediate: 0 };
  const preview = previewKaboomV7(view, actor.id);
  if (preview === null) return none;
  const chain = explosionChainValueV7(
    view,
    preview,
    (owner) => isHostile(view, owner),
    (unit, damage, dies) => hostileLossValueV7(context, unit, damage, dies),
    (unit, damage, dies) => friendlyLossValueV7(view, unit, damage, dies),
  );
  // Tuning 6 (`pulp_wars-w49.6`): an army seat's unit blows itself up only
  // for a kill or on two or more enemies (it spent Goblins, and Scrap
  // Buggies, on 5 damage to one unit).
  let clusterHits = 0;
  let crash = false;
  if (context.army) {
    const hit = new Set<UnitId>();
    for (const explosion of preview.explosions)
      for (const result of explosion.results)
        if (
          result.unitId !== null &&
          !result.friendly &&
          result.damage > 0 &&
          isHostile(view, result.ownerId)
        )
          hit.add(result.unitId);
    // The Goblin pass, correction: a Crash (a unit that has attacked, the
    // Scrap Buggy) of a unit the visible enemies kill next turn needs one
    // enemy in the blast and no own unit killed by it: seven Buggies were
    // trained in a game and none crashed.
    crash =
      actor.activation.attacked &&
      hit.size >= 1 &&
      chain.friendlyKills === 0 &&
      goblinDoomedAtV7(context, actor, actor.at);
    if (chain.hostileKills === 0 && hit.size < 2 && !crash) return none;
    // The Goblin hand pass at `7r55`: a blast whose whole gain is one kill
    // is not made by a unit that steps back and makes that kill with its
    // attack (`goblinStepBackKillV7`).
    const onlyKill = chain.hostileKilledIds[0];
    if (
      chain.hostileKills === 1 &&
      hit.size === 1 &&
      onlyKill !== undefined &&
      goblinStepBackKillV7(context, actor, onlyKill)
    )
      return none;
    clusterHits = hit.size;
  }
  const doomed = goblinDoomedAtV7(context, actor, actor.at);
  let exploder = retainedUnitValue(view, actor);
  if (doomed) exploder = Math.floor(exploder / 3);
  // A spent, doomed unit is lost whatever it does.
  if (crash) exploder = 0;
  const biter = context.afflictions.bitten.get(actor.id);
  if (biter !== undefined && isHostile(view, biter))
    exploder += BITTEN_RISING_VALUE_V7;
  const excluded = new Set<UnitId>([actor.id, ...chain.friendlyKilledIds]);
  let capture = false;
  let siege = 0;
  for (const unitId of chain.hostileKilledIds) {
    const unit = context.lookup.unitsById.get(unitId);
    const city =
      unit === undefined
        ? undefined
        : context.lookup.citiesByKey.get(coordKey(unit.at));
    if (unit === undefined || city === undefined) continue;
    if (!isHostile(view, city.ownerId)) continue;
    siege += 6;
    if (freshCapturerNextToV7(context, city.at, excluded) !== undefined)
      capture = true;
  }
  const savesCity = context.threats.some((threat) =>
    chain.hostileKilledIds.includes(threat.unitId),
  );
  const city = context.lookup.citiesByKey.get(coordKey(actor.at));
  if (
    city !== undefined &&
    city.ownerId === view.viewer.id &&
    threatenedCity(context, city.id) &&
    !savesCity
  )
    return none;
  const coins = preview.totals.plunderCoins;
  // The Martian revision (`pulp_wars-t6s.3`): Shields a Kaboom strips from
  // hostile units that own attacks can still hit this turn (0 otherwise).
  const stripped = context.martian
    ? martianStrippedShieldValueV7(context, preview)
    : 0;
  // pulp_wars-0ao.7: friendly fire costs the bomb trade factor here too.
  const net =
    stripped +
    chain.hostileValue -
    FRIENDLY_FIRE_TRADE_FACTOR_V7 * chain.friendlyValue -
    exploder +
    COIN_STRATEGIC_VALUE_V7 * coins +
    siege +
    (capture ? KABOOM_CAPTURE_VALUE_V7 : 0) +
    (savesCity ? KABOOM_CITY_SAVE_VALUE_V7 : 0);
  if (net <= 0) return none;
  const priority = capture
    ? KABOOM_CAPTURE_PRIORITY_V7
    : savesCity
      ? KABOOM_CITY_SAVE_PRIORITY_V7
      : chain.hostileKills >= 2 ||
          // Tuning 8 (`pulp_wars-w49.11`): a blast into three or more
          // enemies that hurts no own unit goes before an ordinary kill,
          // with or without a kill of its own (six Goblins beside three
          // and four defenders made three attacks and no blast).
          (clusterHits >= KABOOM_CLUSTER_HITS_V7 && chain.friendlyDamage === 0)
        ? KABOOM_MULTI_KILL_PRIORITY_V7
        : chain.hostileKills > 0
          ? KABOOM_KILL_PRIORITY_V7
          : doomed
            ? KABOOM_DOOMED_PRIORITY_V7
            : // Tuning 7: a cluster of three is worth the Goblin before its
              // own attack (no Kaboom was used in ten rounds against units
              // standing three and four to a 3 x 3).
              clusterHits >= KABOOM_CLUSTER_HITS_V7
              ? KABOOM_KILL_PRIORITY_V7
              : net >= KABOOM_CHIP_MARGIN_V7
                ? KABOOM_CHIP_PRIORITY_V7
                : -1;
  return {
    priority,
    strategic: net,
    immediate:
      10 * chain.hostileDamage +
      20 * chain.hostileKills -
      12 * chain.friendlyDamage -
      24 * chain.friendlyKills +
      coins,
  };
}

/** Own offered attacks by target, built once per decision (Goblin viewer). */
function goblinAttacksOnV7(
  context: PolicyContextV7,
  targetId: UnitId,
): readonly AttackCommandV7[] {
  let byTarget = goblinAttacksByTargetV7.get(context);
  if (byTarget === undefined) {
    byTarget = new Map();
    for (const command of context.commands)
      if (command.kind === "ATTACK") {
        const list = byTarget.get(command.targetUnitId) ?? [];
        list.push(command);
        byTarget.set(command.targetUnitId, list);
      }
    goblinAttacksByTargetV7.set(context, byTarget);
  }
  return byTarget.get(targetId) ?? [];
}

const goblinAttacksByTargetV7 = new WeakMap<
  PolicyContextV7,
  Map<UnitId, AttackCommandV7[]>
>();

function primaryReadyForPolicyV7(unit: PublicUnitV7): boolean {
  return (
    !unit.activation.attacked &&
    !unit.activation.recovered &&
    !unit.activation.captured &&
    !unit.activation.specialActed
  );
}

/**
 * Gang Up setup (section 5.2): the mover steps next to a visible hostile
 * that another own unit can attack this turn, adding a helper to that attack.
 * Returns the best gain over such attacks and whether it turns one into a
 * kill (projected with the public combat preview).
 */
function gangUpSetupValueV7(
  context: PolicyContextV7,
  mover: PublicUnitV7,
  to: CoordV7,
  projected: () => PlayerViewV7,
): { readonly kill: boolean; readonly value: number } {
  const view = context.view;
  let kill = false;
  let value = 0;
  for (const hostile of context.lookup.visibleHostiles) {
    if (distance(hostile.at, to) !== 1 || distance(hostile.at, mover.at) === 1)
      continue;
    for (const attack of goblinAttacksOnV7(context, hostile.id)) {
      if (attack.unitId === mover.id) continue;
      const before = queryCombatPreviewV7(view, attack.unitId, hostile.id);
      if (before === null || before.gangUp >= 2 || before.defenderDies)
        continue;
      const after = queryCombatPreviewV7(
        projected(),
        attack.unitId,
        hostile.id,
      );
      if (after === null) continue;
      if (after.defenderDies && !after.attackerDies) {
        kill = true;
        value = Math.max(
          value,
          targetStrategicValue(view, hostile.id, context.lookup),
        );
      } else
        value = Math.max(
          value,
          2 * (after.damageToDefender - before.damageToDefender),
        );
    }
  }
  return { kill, value };
}

/**
 * The mover's own Gang Up strike: after this Move it can attack a visible
 * hostile with at least one own helper beside it and kill it.
 */
function gangUpStrikeValueV7(
  context: PolicyContextV7,
  mover: PublicUnitV7,
  to: CoordV7,
  projected: () => PlayerViewV7,
): number {
  const view = context.view;
  const rule = unitRoleRuleV7(view, mover);
  if (
    !unitMayActAfterMoveV7(view, mover) ||
    !rule.abilities.includes("ATTACK") ||
    !primaryReadyForPolicyV7(mover)
  )
    return 0;
  let best = 0;
  for (const hostile of context.lookup.visibleHostiles) {
    const range = distance(hostile.at, to);
    if (range < rule.minimumRange || range > rule.range) continue;
    // A target already in range needs no Move first.
    const current = distance(hostile.at, mover.at);
    if (current >= rule.minimumRange && current <= rule.range) continue;
    if (gangUpForPolicyV7(view, mover, hostile.at, new Set([hostile.id])) === 0)
      continue;
    const preview = queryCombatPreviewV7(projected(), mover.id, hostile.id);
    if (preview === null || !preview.defenderDies || preview.attackerDies)
      continue;
    best = Math.max(
      best,
      targetStrategicValue(view, hostile.id, context.lookup),
    );
  }
  return best;
}

/**
 * A Move after which the mover's Kaboom (one wave, visible units) kills a
 * hostile unit and is net-positive against the mover's full value.
 */
function kaboomSetupValueV7(
  context: PolicyContextV7,
  mover: PublicUnitV7,
  to: CoordV7,
): number {
  const view = context.view;
  const damage = kaboomDamageV7(view, mover);
  if (damage <= 0 || !primaryReadyForPolicyV7(mover)) return 0;
  const tile = findPublicTileV7(view, to);
  if (tile?.explored !== true || tile.biome === null) return 0;
  if (
    !context.lookup.visibleHostiles.some((unit) => distance(unit.at, to) <= 1)
  )
    return 0;
  const blast = hypotheticalBlastV7(
    view,
    to,
    damage,
    mover.id,
    (owner) => isHostile(view, owner),
    (owner) => friendlyOwnerV7(view, owner),
    (unit, hit, dies) => hostileLossValueV7(context, unit, hit, dies),
    (unit, hit, dies) => friendlyLossValueV7(view, unit, hit, dies),
  );
  const net =
    blast.hostileValue - blast.friendlyValue - retainedUnitValue(view, mover);
  // Tuning 7: an army seat also seeks the blast that damages three hostile
  // units without a kill.
  if (
    net <= 0 ||
    (blast.hostileKills === 0 &&
      !(context.army && blast.hostileHits >= KABOOM_CLUSTER_HITS_V7))
  )
    return 0;
  // Only a better Kaboom than the one available where the mover stands.
  const here = hypotheticalBlastV7(
    view,
    mover.at,
    damage,
    mover.id,
    (owner) => isHostile(view, owner),
    (owner) => friendlyOwnerV7(view, owner),
    (unit, hit, dies) => hostileLossValueV7(context, unit, hit, dies),
    (unit, hit, dies) => friendlyLossValueV7(view, unit, hit, dies),
  );
  const hereNet =
    here.hostileValue - here.friendlyValue - retainedUnitValue(view, mover);
  return net > hereNet ? net - Math.max(0, hereNet) : 0;
}

/**
 * Exploder spacing: the value own and allied units would lose to death
 * blasts if `unit` stood at `at` — its own blast when it is an exploding
 * unit visible enemies can badly hurt there, plus the blasts of adjacent own
 * exploding units that visible enemies can badly hurt where they stand.
 */
function exploderSpacingLossV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  at: CoordV7,
): number {
  const view = context.view;
  let loss = 0;
  const blast = deathBlastDamageV7(view, unit);
  const own = (owner: PlayerId) => friendlyOwnerV7(view, owner);
  if (blast > 0 && own(unit.ownerId) && goblinExposedAtV7(context, unit, at))
    for (const other of view.units) {
      if (other.id === unit.id || !own(other.ownerId)) continue;
      if (distance(other.at, at) !== 1) continue;
      // The Goblin pass (7r50): a blast does not hit a Blast-proof unit.
      if (unitIsBlastProofV7(view, other)) continue;
      const hit = Math.min(blast, other.hp);
      loss += friendlyLossValueV7(view, other, hit, hit >= other.hp);
    }
  if (unitIsBlastProofV7(view, unit)) return loss;
  for (const other of view.units) {
    if (other.id === unit.id || other.ownerId !== view.viewer.id) continue;
    if (distance(other.at, at) !== 1) continue;
    const otherBlast = deathBlastDamageV7(view, other);
    if (otherBlast <= 0 || !goblinExposedAtV7(context, other, other.at))
      continue;
    const hit = Math.min(otherBlast, unit.hp);
    loss += friendlyLossValueV7(view, unit, hit, hit >= unit.hp);
  }
  return loss;
}

/**
 * An exploding unit is exposed at `at` when any visible enemy can damage it
 * there this turn (`pulp_wars-0ao.7`). Spacing only from units visible
 * enemies can kill left most death blasts among own units: splash, Wail,
 * Plague, and follow-up attacks finish exploders over several turns.
 */
function goblinExposedAtV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  at: CoordV7,
): boolean {
  return visibleImmediateDamage(context.view, unit, at, context) > 0;
}

/** The best Kaboom visible hostile goblin-crewed units have against `at`. */
function kaboomExposureV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  at: CoordV7,
) {
  const view = context.view;
  return hostileKaboomExposureV7(
    view,
    unit,
    at,
    context.lookup.visibleHostiles,
    (owner) => friendlyOwnerV7(view, owner),
    (center) => {
      const tile = findPublicTileV7(view, center);
      return (
        tile?.explored === true &&
        tile.biome !== null &&
        tile.terrain !== "RIFT" &&
        !(context.threatLookup.occupantsByKey.get(coordKey(center)) ?? []).some(
          (occupant) => occupant.id !== unit.id,
        )
      );
    },
    (center) => {
      const near: PublicUnitV7[] = [];
      for (let y = center.y - 1; y <= center.y + 1; y += 1)
        for (let x = center.x - 1; x <= center.x + 1; x += 1)
          near.push(
            ...(context.threatLookup.occupantsByKey.get(coordKey({ x, y })) ??
              []),
          );
      return near;
    },
    (other, hit, dies) => friendlyLossValueV7(view, other, hit, dies),
    (other, hit, dies) => hostileLossValueV7(context, other, hit, dies),
  );
}

/**
 * Clean bomb strike (`pulp_wars-0ao.13`): a Bomb Chucker whose every kill
 * from where it stands splashes own or allied units moves where its bomb
 * kills a target it cannot reach now without splashing any (projected with
 * the public combat preview). Returns the best such target's value.
 */
function cleanBombStrikeValueV7(
  context: PolicyContextV7,
  mover: PublicUnitV7,
  to: CoordV7,
  projected: () => PlayerViewV7,
): number {
  const view = context.view;
  if (!friendlyFireBomberV7(view, mover)) return 0;
  const rule = unitRoleRuleV7(view, mover);
  if (!unitMayActAfterMoveV7(view, mover) || !primaryReadyForPolicyV7(mover))
    return 0;
  let fouledKill = false;
  for (const command of context.commands) {
    if (command.kind !== "ATTACK" || command.unitId !== mover.id) continue;
    const preview = queryCombatPreviewV7(view, mover.id, command.targetUnitId);
    if (preview === null || !preview.defenderDies) continue;
    if (goblinAttackFactsV7(context, command, preview).friendlySplashHits === 0)
      return 0;
    fouledKill = true;
  }
  if (!fouledKill) return 0;
  let best = 0;
  for (const hostile of context.lookup.visibleHostiles) {
    const range = distance(hostile.at, to);
    if (range < rule.minimumRange || range > rule.range) continue;
    const current = distance(hostile.at, mover.at);
    if (current >= rule.minimumRange && current <= rule.range) continue;
    const preview = queryCombatPreviewV7(projected(), mover.id, hostile.id);
    if (preview === null || !preview.defenderDies || preview.attackerDies)
      continue;
    if (
      preview.splash.some((splash) => {
        const unit = context.lookup.unitsById.get(splash.unitId);
        return unit !== undefined && friendlyOwnerV7(view, unit.ownerId);
      })
    )
      continue;
    best = Math.max(
      best,
      targetStrategicValue(view, hostile.id, context.lookup),
    );
  }
  return best;
}

/** Splash damage of an own Bomb Chucker's offered bomb, once per decision. */
const goblinBombSplashV7 = new WeakMap<PolicyContextV7, Map<string, number>>();

/**
 * Own bomb exposure (`pulp_wars-0ao.13`): the value `unit` would lose at
 * `at` to the splash of an own Bomb Chucker's bomb it can throw now at a
 * visible hostile next to `at` (the worst such bomb), and whether that
 * splash would kill it.
 */
function ownBombExposureV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
  at: CoordV7,
): { readonly loss: number; readonly dies: boolean } {
  const view = context.view;
  // The Goblin pass (7r50): a bomb's splash does not hit a Blast-proof unit.
  if (unitIsBlastProofV7(view, unit)) return { loss: 0, dies: false };
  let cache = goblinBombSplashV7.get(context);
  if (cache === undefined) {
    cache = new Map();
    goblinBombSplashV7.set(context, cache);
  }
  let loss = 0;
  let dies = false;
  for (const hostile of context.lookup.visibleHostiles) {
    if (distance(hostile.at, at) !== 1) continue;
    for (const attack of goblinAttacksOnV7(context, hostile.id)) {
      if (attack.unitId === unit.id) continue;
      const bomber = context.lookup.unitsById.get(attack.unitId);
      if (bomber === undefined || !friendlyFireBomberV7(view, bomber)) continue;
      const key = `${attack.unitId}:${hostile.id}`;
      let splash = cache.get(key);
      if (splash === undefined) {
        const preview = queryCombatPreviewV7(view, attack.unitId, hostile.id);
        splash =
          preview === null || preview.damageToDefender <= 0
            ? 0
            : Math.max(1, Math.ceil(preview.damageToDefender / 2));
        cache.set(key, splash);
      }
      if (splash <= 0) continue;
      const hit = Math.min(splash, unit.hp);
      const lethal = hit >= unit.hp;
      loss = Math.max(loss, friendlyLossValueV7(view, unit, hit, lethal));
      dies ||= lethal;
    }
  }
  return { loss, dies };
}

const GOBLIN_ROUTINE_MOVE_PRIORITY_V7 = 1100;
const GOBLIN_SPACING_PRIORITY_V7 = 760;

/**
 * Goblin-match movement: Gang Up setups and strikes and Kaboom setups (Goblin
 * viewer), exploder spacing, and staying out of clumps a hostile Kaboom
 * would profit from (every viewer). A routine Move (below 1100) that makes
 * either danger worse is not taken, unless it sets up a kill; only a kill
 * setup revives a Move the other rules did not score.
 */
function goblinMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const routine = priority < GOBLIN_ROUTINE_MOVE_PRIORITY_V7;
  // Tuning 7 (`pulp_wars-w49.10`): the exploder spacing does not hold a
  // committed unit back; it still costs the Move strategic value, so the
  // better tile is taken (six Goblins sat three tiles behind an assault
  // for five rounds). The own bomb's splash and a hostile Kaboom still do.
  const committed =
    actor.ownerId === view.viewer.id && armyModeV7(context, actor) === "COMMIT";
  let strategic = 0;
  let setupKill = false;
  let raised = priority;
  // The Mind Control revision (section 8): the mover's kind plays it (a
  // controlled Goblin sets up its Kaboom).
  const goblinKind = policyUnitFactionV7(view, actor) === "GOBLIN";
  if (goblinKind && actor.form === "LAND" && !same(actor.at, to)) {
    let projectedView: PlayerViewV7 | null = null;
    const projected = () =>
      (projectedView ??= projectPublicUnitForPolicyV7(view, actor.id, {
        at: to,
        activation: {
          ...actor.activation,
          moved: true,
          movedPathLength: Math.max(1, distance(actor.at, to)),
        },
      }));
    const setup = gangUpSetupValueV7(context, actor, to, projected);
    if (setup.kill) {
      setupKill = true;
      raised = Math.max(raised, GANG_UP_KILL_SETUP_PRIORITY_V7);
    } else if (setup.value > 0)
      raised = Math.max(raised, GANG_UP_SETUP_PRIORITY_V7);
    strategic += setup.value;
    const strike = gangUpStrikeValueV7(context, actor, to, projected);
    if (strike > 0) {
      setupKill = true;
      raised = Math.max(raised, GANG_UP_STRIKE_PRIORITY_V7);
      strategic += strike;
    }
    const kaboom = kaboomSetupValueV7(context, actor, to);
    if (kaboom > 0) {
      setupKill = true;
      raised = Math.max(raised, KABOOM_SETUP_PRIORITY_V7);
      strategic += kaboom;
    }
    // Tuning 7 (`pulp_wars-w49.10`): the Warboss steps to where its
    // WAAAGH! reaches two or more units that will attack this turn, before
    // they do (it was cast after the attacks, twice).
    if (
      context.army &&
      actor.ownerId === view.viewer.id &&
      unitRoleRuleV7(view, actor).abilities.includes("RALLY") &&
      unitMayActAfterMoveV7(view, actor) &&
      primaryReadyForPolicyV7(actor) &&
      !actor.activation.moved
    ) {
      const there = waaaghUsefulV7(context, { ...actor, at: to });
      if (there >= 2 && there > waaaghUsefulV7(context, actor)) {
        raised = Math.max(raised, WAAAGH_SETUP_PRIORITY_V7);
        strategic += 12 * there;
        setupKill = true;
      }
    }
    const bomb = cleanBombStrikeValueV7(context, actor, to, projected);
    if (bomb > 0) {
      setupKill = true;
      raised = Math.max(raised, CLEAN_BOMB_STRIKE_PRIORITY_V7);
      strategic += bomb;
    }
  }
  // Only a kill setup revives a Move the other rules did not score.
  if (priority < 0 && !setupKill) return { priority, strategic: 0 };
  const onOwnCenter =
    context.lookup.citiesByKey.get(coordKey(actor.at))?.ownerId ===
    view.viewer.id;
  const spacingThere = exploderSpacingLossV7(context, actor, to);
  const spacingHere = exploderSpacingLossV7(context, actor, actor.at);
  strategic -= spacingThere;
  if (routine && !setupKill && !committed && spacingThere > spacingHere)
    return { priority: -1, strategic };
  if (spacingHere > spacingThere && !onOwnCenter) {
    raised = Math.max(raised, GOBLIN_SPACING_PRIORITY_V7);
    strategic += spacingHere - spacingThere;
  }
  // pulp_wars-0ao.13: a routine Move does not end next to a target an own
  // Bomb Chucker can bomb now when the splash would kill the mover there
  // (and not where it stands); a smaller splash only costs strategic value.
  if (goblinKind) {
    const bombThere = ownBombExposureV7(context, actor, to);
    if (bombThere.loss > 0) {
      const bombHere = ownBombExposureV7(context, actor, actor.at);
      if (bombThere.loss > bombHere.loss) {
        strategic -=
          FRIENDLY_FIRE_TRADE_FACTOR_V7 * (bombThere.loss - bombHere.loss);
        if (routine && !setupKill && bombThere.dies && !bombHere.dies)
          return { priority: -1, strategic };
      }
    }
  }
  const there = kaboomExposureV7(context, actor, to);
  if (there.enemyNet > 0 && there.ownHits >= 2) {
    strategic -= Math.ceil(there.ownLoss / 2);
    if (routine && !setupKill) {
      const here = kaboomExposureV7(context, actor, actor.at);
      if (
        !(here.enemyNet > 0 && here.ownHits >= 2) ||
        there.ownLoss > here.ownLoss
      )
        return { priority: -1, strategic };
    }
  }
  return { priority: raised, strategic };
}

/**
 * WAAAGH! (section 7.1) is used like Rally, counting only units in its
 * radius that can still attack a visible enemy this turn.
 */
function waaaghUsefulV7(context: PolicyContextV7, actor: PublicUnitV7): number {
  const view = context.view;
  let useful = 0;
  for (const unit of view.units) {
    if (!isRallyTargetV7(view, actor, unit)) continue;
    if (unit.activation.attacked || !primaryReadyForPolicyV7(unit)) continue;
    const rule = unitRoleRuleV7(view, unit);
    const reach =
      rule.range +
      (!unit.activation.moved && unitMayActAfterMoveV7(view, unit)
        ? rule.move
        : 0);
    if (
      context.lookup.visibleHostiles.some(
        (hostile) => distance(hostile.at, unit.at) <= reach,
      ) &&
      waaaghAttacksV7(context, unit)
    )
      useful += 1;
  }
  return useful;
}

/**
 * Tuning 8 (`pulp_wars-w49.11`): whether an army seat's unit in reach of an
 * enemy will attack this turn: it is not waiting for its army (a staging
 * position, or a fast unit held behind the infantry), and it has an attack
 * on offer or a Move into one it takes, or it is a fast unit free to
 * charge. A WAAAGH! was called on fourteen units that then made no attack.
 */
function waaaghAttacksV7(
  context: PolicyContextV7,
  unit: PublicUnitV7,
): boolean {
  if (!context.army || unit.ownerId !== context.view.viewer.id) return true;
  if (armyModeV7(context, unit) === "STAGE") return false;
  if (armyOfferedAttackersV7(context).has(unit.id)) return true;
  for (const key of armyEngagementsForV7(context, unit).keys()) {
    const [x, y] = key.split(",").map(Number);
    if (
      x !== undefined &&
      y !== undefined &&
      !armyHoldsFastV7(context, unit, { x, y })
    )
      return true;
  }
  // A fast unit that is free to charge takes exchanges the call itself
  // makes acceptable (the call adds to its Attack).
  return (
    armyModeV7(context, unit) === "COMMIT" &&
    armyAssaultV7(context).positionByOwn.get(unit.id)?.ready === true &&
    publicCombatFacts(context.view, unit, context.lookup).move >= 2
  );
}

function waaaghValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  let eligible = 0;
  let useful = 0;
  for (const unit of view.units) {
    if (!isRallyTargetV7(view, actor, unit)) continue;
    if (unit.activation.attacked || !primaryReadyForPolicyV7(unit)) continue;
    eligible += 1;
    const rule = unitRoleRuleV7(view, unit);
    const reach =
      rule.range +
      (!unit.activation.moved && unitMayActAfterMoveV7(view, unit)
        ? rule.move
        : 0);
    if (
      context.lookup.visibleHostiles.some(
        (hostile) => distance(hostile.at, unit.at) <= reach,
      ) &&
      waaaghAttacksV7(context, unit)
    )
      useful += 1;
  }
  return {
    priority: useful >= 2 ? 1235 : useful === 1 ? 720 : -1,
    strategic: useful * 12 + (eligible - useful) * 2,
  };
}

/**
 * Goblin training: the cheap Goblin horde fills Warrens capacity. The Goblin
 * gains a small bias in both the preferred-role value and the city-action
 * utility; the horde adjustment (in `sharedCityContextWorkV7`) also waives
 * the repetition cost of the first four Goblins in the preferred-role
 * choice. The Bomb Chucker gains a bias for its bomb splash
 * (`pulp_wars-0ao.7`). The Orc Warboss cannot tend, so the living-seat cure
 * bias never applies.
 */
function goblinTrainingAdjustmentsV7(): ReadonlyMap<UnitRoleIdV7, number> {
  return new Map<UnitRoleIdV7, number>([
    ["FIGHTER", GOBLIN_TRAINING_BIAS_V7],
    ["MARKSMAN", GOBLIN_BOMB_CHUCKER_TRAINING_BIAS_V7],
  ]);
}

/**
 * Plunder (the Goblin Commerce) pays a Coin per kill: research it by visible
 * combat, the hostile units within three tiles of own units and cities.
 */
function plunderResearchValueV7(
  context: PolicyContextV7,
): { readonly priority: number; readonly strategic: number } | null {
  const view = context.view;
  const own = [
    ...view.units
      .filter((unit) => unit.ownerId === view.viewer.id)
      .map((unit) => unit.at),
    ...view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .map((city) => city.at),
  ];
  const contact = context.lookup.visibleHostiles.filter((hostile) =>
    own.some((at) => distance(at, hostile.at) <= 3),
  ).length;
  if (contact < 2) return null;
  return { priority: 1070, strategic: 4 * Math.min(6, contact) };
}

/**
 * Dinosaur signature research (`pulp_wars-c87.8`): once the seat owns two
 * cities, the next technology toward the signature role whose technology it
 * lacks (the Triceratops or the T-Rex, the one with the shorter remaining
 * chain first) is researched before land production and before the best
 * economic plan. Both units sit behind tier-3 technologies that the ordinary
 * role plan reached after most matches were decided.
 */
function signatureResearchV7(
  view: PlayerViewV7,
): { readonly tech: TechnologyIdV7; readonly strategic: number } | null {
  if (
    view.viewer.faction !== "DINOSAUR" ||
    (view.leaderboard.find((item) => item.isViewer)?.cityCount ?? 0) <
      SIGNATURE_RESEARCH_CITIES_V7
  )
    return null;
  let best: {
    readonly chain: readonly TechnologyIdV7[];
    readonly role: UnitRoleIdV7;
  } | null = null;
  for (const role of SIGNATURE_ROLES_V7) {
    const chain = shortestResearchChainForRole(view, role);
    if (chain.length > 0 && (best === null || chain.length < best.chain.length))
      best = { chain, role };
  }
  const tech = best?.chain[0];
  if (best === null || tech === undefined) return null;
  const rule = effectiveRoleRuleV7(best.role, view.viewer.faction);
  return { tech, strategic: rule.maxHp + rule.attack2 + rule.defense2 };
}

/**
 * Revision 19 Dinosaur play (`pulp_wars-c87.5`). Every helper below runs only
 * in a match with a Dinosaur seat (`context.dinosaur`); each is a bounded
 * scan of the public view and public previews inside an existing scoring
 * step, with no PRNG use, elapsed-time input, or work units.
 */
interface OwnEggFactsV7 {
  readonly unit: PublicUnitV7;
  readonly turnsRemaining: number;
  readonly laidThisTurn: boolean;
  /** The unit inside, scaled by how soon it hatches. */
  readonly value: number;
  /** Projected damage of the visible enemies' next turn. */
  readonly danger: number;
  /** Visible hostile units whose reach includes the Egg's tile. */
  readonly threatIds: ReadonlySet<UnitId>;
  /**
   * A visible enemy can reach the Egg before it hatches (within its
   * remaining turns, looking at most two turns ahead).
   */
  readonly pending: boolean;
  /** The visible hostile attacker nearest to the Egg, if any. */
  readonly nearestThreatAt: CoordV7 | null;
}

interface DinosaurFactsV7 {
  readonly ownEggs: readonly OwnEggFactsV7[];
  readonly nestDanger: Map<string, number>;
}

/** A wounded unit's Promotion (a full heal): before a final capture (1400). */
const WOUNDED_PROMOTE_PRIORITY_V7 = 1410;
/** Abandoning an Egg so a defender can be trained (threatened train: 1260). */
const EGG_ABANDON_PRIORITY_V7 = 1261;
/** A wounded grown unit steps out of visible reach (Recover: 930). */
const GROWN_WOUNDED_RETREAT_PRIORITY_V7 = 935;
/** An Egg is guarded against enemies that reach it within this many turns. */
const EGG_GUARD_HORIZON_TURNS_V7 = 2;
/** Moves below this priority are routine (as for the Goblin spacing rules). */
const DINOSAUR_ROUTINE_MOVE_PRIORITY_V7 = 1100;

function dinosaurFactsV7(context: PolicyContextV7): DinosaurFactsV7 {
  if (context.dinosaurFacts !== null) return context.dinosaurFacts;
  const view = context.view;
  const ownEggs: OwnEggFactsV7[] = [];
  for (const unit of view.units) {
    if (unit.form !== "EGG" || unit.ownerId !== view.viewer.id) continue;
    const status = eggStatusV7(view, unit);
    if (status === undefined) continue;
    const threatIds = new Set<UnitId>();
    let pending = false;
    let nearest: PublicUnitV7 | null = null;
    for (const hostile of context.lookup.visibleHostiles) {
      const facts = publicCombatFacts(view, hostile, context.lookup);
      if (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0) continue;
      const gap = distance(hostile.at, unit.at);
      if (context.threatenedTiles.get(hostile.id)?.has(coordKey(unit.at)))
        threatIds.add(hostile.id);
      if (
        gap <=
        facts.move *
          Math.min(EGG_GUARD_HORIZON_TURNS_V7, status.turnsRemaining) +
          facts.maximumRange
      )
        pending = true;
      if (nearest === null || gap < distance(nearest.at, unit.at))
        nearest = hostile;
    }
    ownEggs.push({
      unit,
      turnsRemaining: status.turnsRemaining,
      laidThisTurn: status.laidThisTurn,
      value: eggProtectionValueV7(view, unit),
      danger: visibleImmediateDamage(view, unit, unit.at, context),
      threatIds,
      pending: pending || threatIds.size > 0,
      nearestThreatAt: nearest?.at ?? null,
    });
  }
  const facts: DinosaurFactsV7 = {
    ownEggs,
    nestDanger: new Map(),
  };
  context.dinosaurFacts = facts;
  return facts;
}

/** The HP of an Egg the viewer lays now (6, or 10 with Nesting). */
function laidEggHpForPolicyV7(view: PlayerViewV7): number {
  return (
    EGG_HP_V7 +
    technologyCapabilitiesV7(view.viewer.researchedTechs, view.viewer.faction)
      .eggHpBonus
  );
}

/**
 * The visible enemies' projected damage next turn to an Egg laid on `at`
 * (their reach now).
 */
function nestDangerV7(context: PolicyContextV7, at: CoordV7): number {
  const facts = dinosaurFactsV7(context);
  const key = coordKey(at);
  const cached = facts.nestDanger.get(key);
  if (cached !== undefined) return cached;
  const view = context.view;
  const hp = laidEggHpForPolicyV7(view);
  let role: UnitRoleIdV7 = "RAIDER";
  for (const command of context.commands)
    if (command.kind === "LAY_EGG") {
      role = command.role;
      break;
    }
  const egg: PublicUnitV7 = {
    id: -1 as UnitId,
    ownerId: view.viewer.id,
    homeCityId: null,
    role,
    form: "EGG",
    at,
    hp,
    maxHp: hp,
    kills: 0,
    veteran: false,
    captureEligible: false,
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
      handled: true,
      specialActed: false,
    },
  };
  const danger = visibleImmediateDamage(view, egg, at, context);
  facts.nestDanger.set(key, danger);
  return danger;
}

/** The projected visible damage to the own Egg `eggUnitId` (0 if unknown). */
function ownEggDangerV7(context: PolicyContextV7, eggUnitId: UnitId): number {
  return (
    dinosaurFactsV7(context).ownEggs.find((egg) => egg.unit.id === eggUnitId)
      ?.danger ?? 0
  );
}

/** The most valuable own Egg within the visible reach of `hostileId`. */
function threatenedEggValueV7(
  context: PolicyContextV7,
  hostileId: UnitId,
): number {
  if (context.view.viewer.faction !== "DINOSAUR") return 0;
  let value = 0;
  for (const egg of dinosaurFactsV7(context).ownEggs)
    if (egg.threatIds.has(hostileId)) value = Math.max(value, egg.value);
  return value;
}

/**
 * An own Egg is abandoned only in a real emergency: its threatened home city
 * has an empty center, no slot left for a defender, the Coins and the city
 * action to train one, and the Egg does not hatch at the next Start Turn.
 */
function eggAbandonEmergencyV7(
  context: PolicyContextV7,
  egg: PublicUnitV7,
): boolean {
  const view = context.view;
  const city =
    egg.homeCityId === null
      ? undefined
      : context.lookup.citiesById.get(egg.homeCityId);
  const status = eggStatusV7(view, egg);
  if (
    city === undefined ||
    status === undefined ||
    status.turnsRemaining < 2 ||
    city.ownerId !== view.viewer.id ||
    city.cityActionAvailable !== true ||
    !threatenedCity(context, city.id)
  )
    return false;
  if (
    (context.threatLookup.occupantsByKey.get(coordKey(city.at)) ?? []).some(
      (unit) => unit.hp > 0 && same(unit.at, city.at),
    )
  )
    return false;
  const free = freeCapacity(view, city.id);
  const defenderCost =
    effectiveRoleRuleV7("FIGHTER", view.viewer.faction).cost ?? 0;
  return (
    free <= 0 &&
    free + unitCapacitySlotsV7(view, egg) >= 1 &&
    view.viewer.coins + Math.floor((unitRoleRuleV7(view, egg).cost ?? 0) / 2) >=
      defenderCost
  );
}

/** Whether the target's cover or fortification is what Acid ignores. */
function acidIgnoresDefenseV7(
  view: PlayerViewV7,
  target: PublicUnitV7,
): boolean {
  if (isAfloatV7(target) || target.form === "EGG") return false;
  const tile = findPublicTileV7(view, target.at);
  if (tile?.explored !== true) return false;
  return (
    tile.terrain === "FOREST" ||
    tile.terrain === "MOUNTAIN" ||
    (tile.territoryOwnerId === target.ownerId &&
      (tile.fortificationLevel ?? 0) > 0)
  );
}

/**
 * A non-lethal melee exchange that leaves the attacker where the wounded
 * target kills it on its own turn (the target's kill, and its growth).
 */
function targetKillsAttackerNextV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): boolean {
  if (preview.defenderDies || preview.attackerDies) return false;
  const facts = publicCombatFacts(context.view, target, context.lookup);
  const gap = distance(actor.at, target.at);
  if (
    !facts.abilities.includes("ATTACK") ||
    gap < facts.minimumRange ||
    gap > facts.maximumRange
  )
    return false;
  const wounded = {
    ...actor,
    hp: Math.min(
      actor.maxHp,
      actor.hp - preview.damageToAttacker + preview.attackerHeal,
    ),
  };
  return (
    publicProjectedDamageWithLookupV7(
      context.view,
      { ...target, hp: target.hp - preview.damageToDefender },
      wounded,
      actor.at,
      {},
      context.lookup,
    ) >= wounded.hp
  );
}

/** The growth a kill would give a hostile land unit (0 for an Egg). */
function hostileGrowthFeedV7(view: PlayerViewV7, unit: PublicUnitV7): number {
  return isAfloatV7(unit) || unit.form === "EGG"
    ? 0
    : growthKillValueV7(view, unit);
}

/**
 * Dinosaur-match attack value: the growth a kill gives an own unit that is
 * one kill from Big or Alpha, the growth an exchange hands a hostile one, an
 * Acid attack on a target whose cover or fortification it ignores, and the
 * own Egg a target could reach.
 */
function dinosaurAttackValueV7(
  context: PolicyContextV7,
  command: AttackCommandV7,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): number {
  const view = context.view;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined) return 0;
  let value = 0;
  // Revision 20: a growth kill is worth the HP it restores (the HP missing
  // after the exchange plus the stage's 4).
  if (preview.defenderDies && !preview.attackerDies)
    value += growthKillValueV7(
      view,
      actor,
      actor.hp - preview.damageToAttacker + preview.attackerHeal,
    );
  const feed = hostileGrowthFeedV7(view, target);
  // Revision 20: killing a wounded hostile dinosaur before its next kill
  // fully heals it.
  if (
    feed > 0 &&
    preview.defenderDies &&
    target.hp < target.maxHp &&
    isHostile(view, target.ownerId)
  )
    value += Math.floor(feed / WOUNDED_DINOSAUR_KILL_DIVISOR_V7);
  if (
    feed > 0 &&
    !preview.defenderDies &&
    (preview.attackerDies ||
      targetKillsAttackerNextV7(context, actor, target, preview))
  )
    value -= feed;
  if (preview.acid && acidIgnoresDefenseV7(view, target))
    value += ACID_TARGET_VALUE_V7;
  const egg = threatenedEggValueV7(context, target.id);
  if (egg > 0)
    value += preview.defenderDies
      ? egg
      : Math.floor(
          (egg * Math.min(target.hp, preview.damageToDefender)) / target.hp,
        );
  return value;
}

/** This turn's offered attacks destroy the Egg (each unit's hit, summed). */
function eggDestructionCompletedV7(
  context: PolicyContextV7,
  egg: PublicUnitV7,
): boolean {
  const best = new Map<UnitId, number>();
  for (const command of context.commands) {
    if (command.kind !== "ATTACK" || command.targetUnitId !== egg.id) continue;
    const preview = queryCombatPreviewV7(
      context.view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview === null) continue;
    best.set(
      command.unitId,
      Math.max(best.get(command.unitId) ?? 0, preview.damageToDefender),
    );
  }
  return sum([...best.values()]) >= egg.hp;
}

/**
 * Dinosaur-match attack rejections (a proven city save, a lethal follow-up
 * this turn, or the endgame combined kill excuses the last three):
 *
 * - a hit on an Egg that hatches next turn and is not destroyed this turn
 *   (an Egg hatches at full HP), and a melee kill of an Egg worth less than
 *   the attacker when the advance onto its tile is lethal;
 * - a hit of at most 1 damage on an Armoured unit that survives;
 * - an attack whose retaliation kills the attacker and so hands a kill to a
 *   hostile unit that is one kill from Big or Alpha;
 * - an own grown unit's non-lethal attack that leaves it where the visible
 *   enemies kill it, when it is not already that exposed.
 */
function dinosaurAttackRejectedV7(
  context: PolicyContextV7,
  command: AttackCommandV7,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): boolean {
  const view = context.view;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined) return false;
  const excused = (): boolean => {
    const facts = attackPurposeFactsV7(context, command, preview);
    return (
      facts.savesCity ||
      facts.opensLethalFollowUp ||
      endgameCombinedKillV7(context, command, preview)
    );
  };
  if (target.form === "EGG") {
    if (!preview.defenderDies)
      return (
        (eggStatusV7(view, target)?.turnsRemaining ?? 1) < 2 &&
        !eggDestructionCompletedV7(context, target)
      );
    if (!preview.advances) return false;
    return (
      targetStrategicValue(view, target.id, context.lookup) <
        retainedUnitValue(view, actor) &&
      visibleImmediateDamage(view, actor, target.at, context) >= actor.hp &&
      visibleImmediateDamage(view, actor, actor.at, context) < actor.hp
    );
  }
  if (
    !preview.defenderDies &&
    preview.damageToDefender <= 1 &&
    armouredForPolicyV7(view, target)
  )
    return !excused();
  if (
    preview.attackerDies &&
    !preview.defenderDies &&
    hostileGrowthFeedV7(view, target) > 0
  )
    return !excused();
  if (
    actor.ownerId === view.viewer.id &&
    growthStageForPolicyV7(view, actor) > 0 &&
    !preview.defenderDies &&
    !preview.attackerDies &&
    visibleImmediateDamage(view, actor, actor.at, context) < actor.hp &&
    !vampireAttackAcceptableV7(context, view, command)
  )
    return !excused();
  // Revision 20: a Charge! that ends where the visible enemies kill the
  // Triceratops, for less than it is worth, is declined.
  if (
    linebreakerV7(view, actor) &&
    chargeAttackScoreV7(context, command, actor, preview).diesForNoGain
  )
    return !excused();
  // The Dinosaur pass, correction: an army seat's Ankylosaurus screens; it
  // makes no attack that takes back more than it deals (it dealt 2 or 3
  // and took 5 or 6 from a walled center, a Swordsman, a Juggernaut).
  if (
    context.army &&
    actor.ownerId === view.viewer.id &&
    view.viewer.faction === "DINOSAUR" &&
    armouredForPolicyV7(view, actor) &&
    !preview.defenderDies &&
    preview.damageToAttacker > preview.damageToDefender
  )
    return !excused();
  return false;
}

/** The Charge!-specific facts of an offered attack by an own Triceratops. */
interface ChargeAttackScoreV7 {
  /** Added to the attack's strategic value. */
  readonly strategic: number;
  /** A defender pushed off a hostile center with an own capturer near. */
  readonly opensCapture: boolean;
  readonly breaksFieldDefense: boolean;
  /**
   * The Charge ends where the visible enemies kill the Triceratops (and it
   * is not already doomed where it stands) for a gain below its own value.
   */
  readonly diesForNoGain: boolean;
}

/**
 * The visible enemies' projected damage next turn to a Triceratops after the
 * previewed Charge!: on the tile it ends on (after an advance or a follow),
 * with a killed target gone and a surviving one wounded where the Push
 * leaves it.
 */
function chargeExposureV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
  hp: number,
): number {
  const view = context.view;
  const endsAt = preview.advances ? target.at : actor.at;
  const pushTo =
    preview.push === "WILL_PUSH"
      ? {
          x: target.at.x * 2 - actor.at.x,
          y: target.at.y * 2 - actor.at.y,
        }
      : target.at;
  const after = projectPublicUnits(
    view,
    view.units.flatMap((unit) =>
      unit.id === actor.id
        ? [{ ...unit, at: endsAt, hp }]
        : unit.id !== target.id
          ? [unit]
          : preview.defenderDies
            ? []
            : [
                {
                  ...unit,
                  at: pushTo,
                  hp: unit.hp - preview.damageToDefender + preview.defenderHeal,
                },
              ],
    ),
    [actor.id, target.id],
  );
  const moved = after.units.find((unit) => unit.id === actor.id);
  return moved === undefined
    ? 0
    : visibleImmediateDamage(after, moved, moved.at, context);
}

/**
 * Revision 20 Charge! (section 7.3): what the ordinary attack scoring does
 * not see of an own Triceratops's attack. The public preview already has
 * the run-up and the ignored fortification in its damage. This adds Field
 * Defense destroyed on the target tile, a defender pushed off a hostile
 * city center (more with an own capturer within two tiles), minus the
 * Triceratops's exposure on the tile it ends on (all of its value when the
 * visible enemies kill it there, a third when it is doomed where it stands
 * anyway). A kill that makes it Big or Alpha fully heals it first.
 */
function chargeAttackScoreV7(
  context: PolicyContextV7,
  command: AttackCommandV7,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): ChargeAttackScoreV7 {
  const view = context.view;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined || preview.attackerDies)
    return {
      strategic: 0,
      opensCapture: false,
      breaksFieldDefense: false,
      diesForNoGain: false,
    };
  const dies = preview.defenderDies;
  const targetTile = findPublicTileV7(view, target.at);
  const breaksFieldDefense =
    targetTile?.explored === true && targetTile.fieldDefense;
  let gain = breaksFieldDefense ? CHARGE_FIELD_DEFENSE_VALUE_V7 : 0;
  const center = context.lookup.citiesByKey.get(coordKey(target.at));
  const hostileCenter =
    target.form !== "EGG" &&
    center !== undefined &&
    isHostile(view, center.ownerId);
  const pushesOffCenter =
    hostileCenter && !dies && preview.push === "WILL_PUSH";
  const opensCapture =
    pushesOffCenter &&
    center !== undefined &&
    view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.id !== actor.id &&
        distance(unit.at, center.at) <= 2 &&
        canCaptureV7(view, unit),
    );
  if (pushesOffCenter)
    gain +=
      CHARGE_PUSH_CENTER_VALUE_V7 +
      (opensCapture ? CHARGE_CAPTURER_NEAR_VALUE_V7 : 0);
  // The Triceratops's HP when the enemies reply: a kill that makes it Big
  // or Alpha fully heals it (revision 20 section 5).
  const grows =
    dies &&
    (actor.kills + 1 === GROWTH_KILLS_V7[0] ||
      actor.kills + 1 === GROWTH_KILLS_V7[1]);
  const hp = grows
    ? actor.maxHp + GROWTH_HP_V7
    : actor.hp - preview.damageToAttacker + preview.attackerHeal;
  const retained = retainedUnitValue(view, actor);
  const exposure = chargeExposureV7(context, actor, target, preview, hp);
  const lethal = exposure >= hp;
  const doomedAnyway =
    lethal &&
    visibleImmediateDamage(view, actor, actor.at, context) >= actor.hp;
  const penalty = lethal
    ? doomedAnyway
      ? Math.floor(retained / 3)
      : retained
    : Math.floor((retained * exposure) / (2 * hp));
  const total =
    gain +
    hostileLossValueV7(context, target, preview.damageToDefender, dies) +
    (dies && hostileCenter ? 50 : 0) +
    (grows ? growthKillValueV7(view, actor, hp) : 0);
  return {
    strategic: gain - penalty,
    opensCapture,
    breaksFieldDefense,
    diesForNoGain: lethal && !doomedAnyway && total < retained,
  };
}

/**
 * The best Charge! an own Triceratops could make from `from` after a Move of
 * `pathLength` tiles: the hostile loss of the projected hit (run-up
 * included, fortification ignored) on a visible hostile unit next to `from`.
 */
function chargeFromV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  from: CoordV7,
  pathLength: number,
): { readonly value: number; readonly kills: boolean } {
  const view = context.view;
  const bonusAttack2 = chargeRunUpForPolicyV7(view, actor, pathLength);
  let value = 0;
  let kills = false;
  for (const hostile of context.lookup.visibleHostiles) {
    if (hostile.hp <= 0 || distance(from, hostile.at) !== 1) continue;
    const damage = publicProjectedDamageWithLookupV7(
      view,
      actor,
      hostile,
      hostile.at,
      { bonusAttack2 },
      context.lookup,
    );
    const dies = damage >= hostile.hp;
    const loss = hostileLossValueV7(context, hostile, damage, dies);
    if (loss > value) value = loss;
    if (dies) kills = true;
  }
  return { value, kills };
}

/** Own land attackers next to `at`, other than `excludedId`. */
function eggGuardsV7(
  context: PolicyContextV7,
  at: CoordV7,
  excludedId: UnitId,
): number {
  const view = context.view;
  let guards = 0;
  for (const neighbor of neighbors8V7(view, at))
    for (const unit of context.threatLookup.occupantsByKey.get(
      coordKey(neighbor),
    ) ?? [])
      if (
        unit.id !== excludedId &&
        unit.hp > 0 &&
        unit.ownerId === view.viewer.id &&
        !isAfloatV7(unit) &&
        unit.form !== "EGG" &&
        same(unit.at, neighbor) &&
        publicCombatFacts(view, unit, context.lookup).attack2 > 0
      )
        guards += 1;
  return guards;
}

/**
 * Dinosaur-match Move adjustments.
 *
 * As Dinosaurs: an unmoved Triceratops takes a safe tile next to a target it
 * can then Charge, preferring the longer run-up, and one already next to a
 * target steps around it when the run-up makes the Charge better (revision
 * 20); a Shaman with its action steps next to an Egg it can hatch,
 * and stays by a long Egg; a unit guards an own Egg that visible enemies can
 * reach before it hatches, and its sole guard stays until it hatches; a
 * grown unit never makes a routine Move into visible lethal reach, leaves
 * it, and when wounded steps out of reach to heal.
 *
 * Every seat: a unit that can attack after moving steps where it destroys a
 * visible hostile Egg; a Move into the lethal reach of a hostile unit one
 * kill from Big or Alpha costs that growth.
 */
function dinosaurMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
  pathLength: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  if (
    isAfloatV7(actor) ||
    actor.ownerId !== view.viewer.id ||
    same(actor.at, to)
  )
    return { priority, strategic: 0 };
  const destination = findPublicTileV7(view, to);
  if (destination?.explored === true && destination.biome === null)
    return { priority, strategic: 0 };
  const routine = priority < DINOSAUR_ROUTINE_MOVE_PRIORITY_V7;
  let raised = priority;
  let strategic = 0;
  let dangerThereValue: number | null = null;
  let dangerHereValue: number | null = null;
  const dangerThere = (): number =>
    (dangerThereValue ??= visibleImmediateDamage(view, actor, to, context));
  const dangerHere = (): number =>
    (dangerHereValue ??= visibleImmediateDamage(
      view,
      actor,
      actor.at,
      context,
    ));
  const facts = publicCombatFacts(view, actor, context.lookup);
  const rule = unitRoleRuleV7(view, actor);
  const attacker = facts.abilities.includes("ATTACK") && facts.attack2 > 0;

  // The Mind Control revision (section 8): the mover's kind plays it.
  if (policyUnitFactionV7(view, actor) === "DINOSAUR") {
    const dinosaur = dinosaurFactsV7(context);
    if (
      linebreakerV7(view, actor) &&
      !actor.activation.moved &&
      primaryReadyForPolicyV7(actor)
    ) {
      // Revision 20: the run-up. Exposure counts before the run-up, so
      // among equally exposed tiles the longer run-up wins.
      const there = chargeFromV7(context, actor, to, pathLength);
      if (there.value > 0 && dangerThere() < actor.hp) {
        const here = chargeFromV7(context, actor, actor.at, 0);
        const better =
          here.value === 0
            ? CHARGE_APPROACH_PRIORITY_V7
            : there.kills && !here.kills
              ? CHARGE_RUN_UP_KILL_PRIORITY_V7
              : there.value > here.value && dangerThere() <= dangerHere()
                ? CHARGE_RUN_UP_CHIP_PRIORITY_V7
                : -1;
        if (better >= 0) {
          raised = Math.max(raised, better);
          strategic +=
            Math.min(24, Math.ceil(there.value / 4)) +
            chargeRunUpForPolicyV7(view, actor, pathLength) -
            Math.min(12, dangerThere());
        }
      }
    }
    if (rule.abilities.includes("HATCH")) {
      // An Egg laid this turn cannot be hatched until the next one.
      const long = dinosaur.ownEggs.filter(
        (egg) => egg.turnsRemaining >= 2 || egg.danger > 0,
      );
      const beside = (at: CoordV7, hatchable: boolean) =>
        long.filter(
          (egg) =>
            distance(egg.unit.at, at) === 1 &&
            (!hatchable || !egg.laidThisTurn),
        );
      const hatchThere = primaryReadyForPolicyV7(actor) ? beside(to, true) : [];
      if (
        hatchThere.length > 0 &&
        beside(actor.at, true).length === 0 &&
        dangerThere() < actor.hp
      ) {
        raised = Math.max(raised, HATCH_APPROACH_PRIORITY_V7);
        strategic += Math.floor(
          Math.max(...hatchThere.map((egg) => eggUnitValueV7(view, egg.unit))) /
            4,
        );
      } else if (beside(actor.at, false).length > 0) {
        if (routine && beside(to, false).length === 0)
          return { priority: -1, strategic };
      } else if (beside(to, false).length > 0 && dangerThere() < actor.hp) {
        raised = Math.max(raised, EGG_GUARD_PRIORITY_V7);
        strategic += 4;
      }
    }
    if (attacker && rule.tacticalRole !== "SUPPORT") {
      for (const egg of dinosaur.ownEggs) {
        if (!egg.pending) continue;
        const here = distance(actor.at, egg.unit.at) === 1;
        const there = distance(to, egg.unit.at) === 1;
        if (here === there || eggGuardsV7(context, egg.unit.at, actor.id) > 0)
          continue;
        if (here) {
          // The sole guard of such an Egg stays beside it until it hatches.
          if (routine) return { priority: -1, strategic };
        } else if (dangerThere() < actor.hp) {
          raised = Math.max(raised, EGG_GUARD_PRIORITY_V7);
          strategic +=
            Math.floor(egg.value / 4) +
            (egg.nearestThreatAt !== null &&
            distance(to, egg.nearestThreatAt) <
              distance(egg.unit.at, egg.nearestThreatAt)
              ? 2
              : 0);
        }
      }
    }
    if (growthStageForPolicyV7(view, actor) > 0) {
      const here = dangerHere();
      const there = dangerThere();
      if (there >= actor.hp) {
        if (routine && there >= here) return { priority: -1, strategic };
      } else if (here >= actor.hp) {
        raised = Math.max(raised, GROWN_RETREAT_PRIORITY_V7);
        strategic += here - there;
      } else if (actor.hp * 3 < actor.maxHp * 2 && there < here) {
        raised = Math.max(raised, GROWN_WOUNDED_RETREAT_PRIORITY_V7);
        strategic += here - there;
      }
    }
  }

  if (
    attacker &&
    unitMayActAfterMoveV7(view, actor) &&
    primaryReadyForPolicyV7(actor)
  ) {
    const inRange = (from: CoordV7, at: CoordV7): boolean =>
      distance(from, at) >= facts.minimumRange &&
      distance(from, at) <= facts.maximumRange;
    let smash = 0;
    for (const hostile of context.lookup.visibleHostiles) {
      if (
        hostile.form !== "EGG" ||
        !inRange(to, hostile.at) ||
        inRange(actor.at, hostile.at)
      )
        continue;
      if (
        publicProjectedDamageWithLookupV7(
          view,
          actor,
          hostile,
          hostile.at,
          {},
          context.lookup,
        ) >= hostile.hp
      )
        smash = Math.max(
          smash,
          targetStrategicValue(view, hostile.id, context.lookup),
        );
    }
    if (smash > 0 && dangerThere() < actor.hp) {
      raised = Math.max(raised, EGG_SMASH_SETUP_PRIORITY_V7);
      strategic += Math.floor(smash / 2);
    }
  }

  let feed = 0;
  for (const hostile of context.lookup.visibleHostiles) {
    const growth = hostileGrowthFeedV7(view, hostile);
    if (
      growth > feed &&
      context.threatenedTiles.get(hostile.id)?.has(coordKey(to)) === true
    )
      feed = growth;
  }
  if (feed > 0 && dangerThere() >= actor.hp) strategic -= feed;
  return { priority: raised, strategic };
}

// The Martian revision (`pulp_wars-t6s.3`, docs/product/RULESET_7_MARTIANS.md
// section 12). Every helper below runs only in a match with a Martian seat
// (`context.martian`) or through facts only a Martian unit has; each is a
// bounded scan of the public view and public previews inside an existing
// scoring step, cached per decision, with no PRNG use, elapsed-time input, or
// work units. The rules and values live in `src/ai/v7-martian.ts`.

interface MartianContextCacheV7 {
  readonly facts: MartianFactsV7;
  readonly army: MartianArmyCountsV7;
  readonly tools: MartianPolicyToolsV7;
  /** Own units with an offered `ATTACK`, and with an offered `MOVE`. */
  readonly attackers: ReadonlySet<UnitId>;
  readonly movers: ReadonlySet<UnitId>;
  /** Own Brains with an offered `MIND_CONTROL`. */
  readonly mindControllers: ReadonlySet<UnitId>;
  /** Hostile units an offered `MIND_CONTROL` targets. */
  readonly mindControlTargets: ReadonlySet<UnitId>;
  /** Ready hostile Brains (no cooldown, below the control limit). */
  readonly hostileBrains: readonly PublicUnitV7[];
  /** Own Saucers with a `BEAM_DOWN` worth taking now. */
  readonly beamers: Map<UnitId, boolean>;
  /** `pulp_wars-1wy.4`: the units a carrier extracts (null: not computed). */
  readonly rescue: { units: readonly PublicUnitV7[] | null };
  /** The own offered attack previews on each target. */
  readonly attacksOnTarget: Map<UnitId, readonly CombatPreviewV7[]>;
}

const martianFactsByViewV7 = new WeakMap<PlayerViewV7, MartianFactsV7>();

function martianFactsForViewV7(view: PlayerViewV7): MartianFactsV7 {
  const cached = martianFactsByViewV7.get(view);
  if (cached !== undefined) return cached;
  const facts = martianFactsV7(view);
  martianFactsByViewV7.set(view, facts);
  return facts;
}

function martianCacheV7(context: PolicyContextV7): MartianContextCacheV7 {
  if (context.martianCache !== null) return context.martianCache;
  const view = context.view;
  const facts = martianFactsForViewV7(view);
  const attackers = new Set<UnitId>();
  const movers = new Set<UnitId>();
  const mindControllers = new Set<UnitId>();
  const mindControlTargets = new Set<UnitId>();
  for (const command of context.commands) {
    if (command.kind === "ATTACK") attackers.add(command.unitId);
    else if (command.kind === "MOVE") movers.add(command.unitId);
    else if (command.kind === "MIND_CONTROL") {
      mindControllers.add(command.unitId);
      mindControlTargets.add(command.targetUnitId);
    }
  }
  const campaign = context.tactical.campaign;
  let waveTarget: CoordV7 | null = null;
  let waveAssigned = -1;
  for (const target of campaign?.targetByCityId.values() ?? [])
    if (
      target.assigned > waveAssigned ||
      (target.assigned === waveAssigned &&
        waveTarget !== null &&
        (target.city.at.y < waveTarget.y ||
          (target.city.at.y === waveTarget.y &&
            target.city.at.x < waveTarget.x)))
    ) {
      waveTarget = target.city.at;
      waveAssigned = target.assigned;
    }
  const threatenedCityIds = new Set(context.threats.map((item) => item.cityId));
  const cache: MartianContextCacheV7 = {
    facts,
    army: martianArmyCountsV7(view),
    attackers,
    movers,
    mindControllers,
    mindControlTargets,
    hostileBrains: readyHostileBrainsV7(view, facts, (owner) =>
      isHostile(view, owner),
    ),
    beamers: new Map(),
    rescue: { units: null },
    attacksOnTarget: new Map(),
    tools: {
      view,
      facts,
      commands: context.commands,
      isHostile: (owner) => isHostile(view, owner),
      unit: (unitId) => context.lookup.unitsById.get(unitId),
      danger: (unit, at) => visibleImmediateDamage(view, unit, at, context),
      targetValue: (unit) =>
        targetStrategicValue(view, unit.id, context.lookup),
      retainedValue: (unit) => retainedUnitValue(view, unit),
      routeProgress: (unit, to) => campaignRouteProgressV7(campaign, unit, to),
      waveTarget,
      threatenedCityIds,
      projectedKillers: (target, at, excludeUnitId) =>
        martianProjectedKillersV7(context, target, at, excludeUnitId),
      arrivalHit: (attacker, target) =>
        publicProjectedDamageWithLookupV7(
          view,
          attacker,
          target,
          target.at,
          {
            uncapped: true,
            ...(isRayUnitV7(view, attacker)
              ? {
                  rayAttack2: Math.floor(
                    unitRoleRuleV7(view, attacker).attack2 / 2,
                  ),
                }
              : {}),
          },
          context.lookup,
        ),
      moveEnds: (unit) =>
        context.lookup.moveDestinationsByUnit.get(unit.id) ?? [],
      hostileTargets: context.lookup.visibleHostiles.filter(
        (unit) => unit.hp > 0,
      ),
    },
  };
  context.martianCache = cache;
  return cache;
}

/** The own offered attack previews on `targetId` (cached per decision). */
function martianAttacksOnTargetV7(
  context: PolicyContextV7,
  targetId: UnitId,
): readonly CombatPreviewV7[] {
  const cache = martianCacheV7(context);
  const cached = cache.attacksOnTarget.get(targetId);
  if (cached !== undefined) return cached;
  const best = new Map<UnitId, CombatPreviewV7>();
  for (const command of context.commands) {
    if (command.kind !== "ATTACK" || command.targetUnitId !== targetId)
      continue;
    const preview = queryCombatPreviewV7(
      context.view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview === null) continue;
    const prior = best.get(command.unitId);
    if (prior === undefined || wholeHitV7(preview) > wholeHitV7(prior))
      best.set(command.unitId, preview);
  }
  const previews = [...best.values()];
  cache.attacksOnTarget.set(targetId, previews);
  return previews;
}

/**
 * Against Martians: whether this turn's offered attacks on a shielded
 * target kill it through its Shield (the sum of each attacker's best whole
 * hit reaches its Shield plus HP).
 */
function martianKillableThisTurnV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
): boolean {
  const shield = martianCacheV7(context).facts.shieldByUnit.get(target.id) ?? 0;
  const previews = martianAttacksOnTargetV7(context, target.id);
  return (
    previews.length >= 2 && sum(previews.map(wholeHitV7)) >= target.hp + shield
  );
}

/**
 * The whole damage own units that need not move could deal to `target`
 * pulled onto `at` (melee units next to it and ray units within their
 * range, at the power they would fire with): the Tractor Beam's kill test.
 */
function martianProjectedKillersV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
  at: CoordV7,
  excludeUnitId?: UnitId,
): number {
  const view = context.view;
  const facts = martianCacheV7(context).facts;
  const moved = { ...target, at };
  let total = 0;
  for (const unit of view.units) {
    if (
      unit.ownerId !== view.viewer.id ||
      unit.id === excludeUnitId ||
      unit.form !== "LAND" ||
      unit.activation.attacksUsed > 0 ||
      // `pulp_wars-1wy.4`: a unit that has moved (handled) still shoots if
      // its role may act after a Move (a Grunt, a ray at half power).
      (mobilityPlayV7()
        ? !primaryReadyForPolicyV7(unit) ||
          (unit.activation.moved && !unitMayActAfterMoveV7(view, unit))
        : unit.activation.handled)
    )
      continue;
    const combat = publicCombatFacts(view, unit, context.lookup);
    if (!combat.abilities.includes("ATTACK") || combat.attack2 <= 0) continue;
    const range = distance(unit.at, at);
    if (range < combat.minimumRange || range > combat.maximumRange) continue;
    const rayAttack2 = isRayUnitV7(view, unit)
      ? unit.activation.moved || facts.coolingNow.has(unit.id)
        ? Math.floor(unitRoleRuleV7(view, unit).attack2 / 2)
        : unitRoleRuleV7(view, unit).attack2
      : undefined;
    total += publicProjectedDamageWithLookupV7(
      view,
      unit,
      moved,
      at,
      { uncapped: true, ...(rayAttack2 === undefined ? {} : { rayAttack2 }) },
      context.lookup,
    );
  }
  return total;
}

/**
 * Martian attack scoring (both sides of a match with a Martian seat).
 *
 * As Martians: Shield spent on retaliation is exposure without Force Fields;
 * a full-power kill that a half-power shot would also make waits for other
 * killers (the next turn's full shot is worth keeping).
 *
 * Against Martians (any seat): a hit that this turn's other attacks complete
 * into a kill through the Shield is taken before other chips (ranged hits,
 * which draw no retaliation, first) and is worth a share of the Shield it
 * strips; a Cooling ray unit is attacked first (it is weak now and next
 * turn).
 */
function martianAttackAdjustmentV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const cache = martianCacheV7(context);
  const facts = cache.facts;
  let strategic = 0;
  let next = priority;
  if (actor.ownerId === view.viewer.id && facts.viewerMartian) {
    // The baseline: controlled units are the front row, their chips go
    // before shielded units' (the Thrall rule; `pulp_wars-b5f.3` drops it:
    // a controlled unit is worth its kind cost).
    if (
      !mindControlPlayV7() &&
      priority === 900 &&
      facts.brainOfControlled.has(actor.id)
    )
      next = CONTROLLED_CHIP_PRIORITY_V7;
    if (preview.attackerShieldDamage > 0 && !facts.forceFields)
      strategic -= RETALIATION_SHIELD_COST_V7 * preview.attackerShieldDamage;
    if (
      preview.rayPower === "FULL" &&
      preview.defenderDies &&
      priority === 1180
    ) {
      const half = publicProjectedDamageWithLookupV7(
        view,
        actor,
        target,
        target.at,
        {
          rayAttack2: Math.floor(unitRoleRuleV7(view, actor).attack2 / 2),
          uncapped: true,
        },
        context.lookup,
      );
      if (half >= target.hp + (facts.shieldByUnit.get(target.id) ?? 0)) {
        next = RAY_WASTED_KILL_PRIORITY_V7;
        strategic -= WASTED_FULL_RAY_COST_V7;
      }
    }
  }
  if (
    facts.viewerMartian &&
    actor.ownerId === view.viewer.id &&
    !preview.defenderDies &&
    next < MIND_CONTROL_SETUP_PRIORITY_V7 &&
    martianConvertibleAfterV7(
      context,
      target,
      target.hp - preview.damageToDefender,
    )
  ) {
    next = MIND_CONTROL_SETUP_PRIORITY_V7;
    // `pulp_wars-b5f.3`: among setups, the most valuable conversion first.
    strategic += mindControlPlayV7()
      ? MIND_CONTROL_VALUE_WEIGHT_V7 * mindControlValueV7(view, target)
      : targetStrategicValue(view, target.id, context.lookup);
  } else if (
    mindControlPlayV7() &&
    facts.viewerMartian &&
    actor.ownerId === view.viewer.id &&
    !preview.defenderDies &&
    next < MIND_CONTROL_FOCUS_PRIORITY_V7
  ) {
    // `pulp_wars-b5f.3`: focus fire to wound, then convert.
    const focus = martianFocusSetupValueV7(context, actor, target, preview);
    if (focus > 0) {
      next = MIND_CONTROL_FOCUS_PRIORITY_V7;
      strategic += focus;
    }
  }
  // `pulp_wars-b5f.3`: Mind Control keeps priority over an attack on the
  // same target (a threat or a kill alike: the conversion removes it too),
  // unless the attack clears or captures a city.
  if (
    mindControlPlayV7() &&
    facts.viewerMartian &&
    actor.ownerId === view.viewer.id &&
    next >= MIND_CONTROL_PRIORITY_V7 &&
    next < MIND_CONTROL_FIRST_CEILING_V7 &&
    cache.mindControlTargets.has(target.id)
  )
    next = MIND_CONTROL_PRIORITY_V7 - 1;
  if (isHostile(view, target.ownerId)) {
    const shield = facts.shieldByUnit.get(target.id) ?? 0;
    if (
      shield > 0 &&
      !preview.defenderDies &&
      wholeHitV7(preview) > 0 &&
      next < SHIELD_BREAK_PRIORITY_V7 &&
      martianKillableThisTurnV7(context, target)
    ) {
      next =
        preview.damageToAttacker === 0 && !preview.retaliation
          ? SHIELD_BREAK_RANGED_PRIORITY_V7
          : SHIELD_BREAK_PRIORITY_V7;
      strategic +=
        SHIELD_BREAK_VALUE_V7 +
        Math.floor(
          (targetStrategicValue(view, target.id, context.lookup) *
            preview.defenderShieldDamage) /
            Math.max(1, target.hp + shield),
        );
    }
    if (isRayUnitV7(view, target) && facts.coolingNow.has(target.id))
      strategic += COOLING_RAY_ATTACK_BONUS_V7;
  }
  return { priority: next, strategic };
}

/**
 * Martian attack rejections: a Pierce that kills an own or allied unit
 * without killing the target; a Saucer's hit that does not kill (it
 * finishes units, it does not trade); and, against Martians, a hit fully
 * absorbed by a Shield that no other attack this turn follows up.
 */
function martianAttackRejectedV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): boolean {
  const view = context.view;
  if (preview.defenderDies) return false;
  if (
    actor.ownerId === view.viewer.id &&
    preview.splash.some((entry) => {
      if (!entry.dies) return false;
      const victim = context.lookup.unitsById.get(entry.unitId);
      return victim !== undefined && !isHostile(view, victim.ownerId);
    }) &&
    hasAbilityV7(view, actor, "PIERCE")
  )
    return !attackPurposeFactsV7(context, command, preview).savesCity;
  // `pulp_wars-1wy.3`: the Saucer (the Mothership carries Beam Down too).
  if (actor.ownerId === view.viewer.id && isSaucerForPolicyV7(view, actor))
    return !attackPurposeFactsV7(context, command, preview).savesCity;
  // The Martian pass (`pulp_wars-w49.14`): an army seat's Shield Projector
  // (Attack 1.5) makes no attack that takes back more than it deals: it
  // holds its tile and its field (a seat's Projectors dealt 3 and took 8
  // from Guards round after round).
  if (
    context.army &&
    actor.ownerId === view.viewer.id &&
    hasAbilityV7(view, actor, "FORCE_FIELD") &&
    preview.damageToAttacker + preview.attackerShieldDamage >
      preview.damageToDefender + preview.defenderShieldDamage
  )
    return !attackPurposeFactsV7(context, command, preview).savesCity;
  return false;
}

/** Against Martians: a shielded target's follow-up kill this turn. */
function martianShieldBreakExceptionV7(
  context: PolicyContextV7,
  target: PublicUnitV7 | undefined,
  preview: CombatPreviewV7,
): boolean {
  return (
    target !== undefined &&
    (martianCacheV7(context).facts.shieldByUnit.get(target.id) ?? 0) > 0 &&
    wholeHitV7(preview) > 0 &&
    martianKillableThisTurnV7(context, target)
  );
}

/**
 * As Martians: whether a hostile unit left with `hp` is a Mind Control target
 * of an own Brain that can still act this turn (no cooldown, below the
 * control limit, primary action unused) and stands within its range, or can
 * step there (one tile) this turn.
 */
function martianConvertibleAfterV7(
  context: PolicyContextV7,
  target: PublicUnitV7,
  hp: number,
): boolean {
  if (hp <= 0 || !isHostile(context.view, target.ownerId)) return false;
  const view = context.view;
  const facts = martianCacheV7(context).facts;
  const brains = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      !unit.activation.handled &&
      !unit.activation.attacked &&
      hasAbilityV7(view, unit, "MIND_CONTROL") &&
      !facts.cooldownBrains.has(unit.id) &&
      (facts.controlledOfBrain.get(unit.id)?.length ?? 0) <
        MIND_CONTROL_LIMIT_V7 &&
      distance(unit.at, target.at) <=
        MIND_CONTROL_RANGE_V7 + (unit.activation.moved ? 0 : 1),
  );
  return mindControlExposedV7(view, target, target.at, hp, brains);
}

/**
 * `pulp_wars-b5f.3` (RULESET_7_MIND_CONTROL.md section 8, the setup): the
 * first of two own hits that leave a hostile unit convertible. This hit
 * leaves it above `MIND_CONTROL_HP_V7`, another own unit's offered attack
 * on it (its best whole hit, through the Shield this hit leaves) then
 * brings it to 1 to 6 HP, a ready own Brain can reach it this turn, and it
 * is worth at least `MIND_CONTROL_FOCUS_MINIMUM_VALUE_V7`. Returns the
 * setup's strategic value, 0 when the hit is not one.
 */
function martianFocusSetupValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number {
  const view = context.view;
  if (preview.attackerDies || !isHostile(view, target.ownerId)) return 0;
  const hp = target.hp - preview.damageToDefender;
  if (hp <= MIND_CONTROL_HP_V7) return 0;
  const value = mindControlValueV7(view, target);
  if (value < MIND_CONTROL_FOCUS_MINIMUM_VALUE_V7) return 0;
  // A ready Brain in reach of a convertible unit on the target's tile.
  if (!martianConvertibleAfterV7(context, target, MIND_CONTROL_HP_V7)) return 0;
  const facts = martianCacheV7(context).facts;
  const shieldLeft = Math.max(
    0,
    (facts.shieldByUnit.get(target.id) ?? 0) - preview.defenderShieldDamage,
  );
  const follows = martianAttacksOnTargetV7(context, target.id).some((other) => {
    if (other.attackerId === actor.id) return false;
    const damage = Math.max(0, wholeHitV7(other) - shieldLeft);
    return damage > 0 && hp - damage > 0 && hp - damage <= MIND_CONTROL_HP_V7;
  });
  return follows ? MIND_CONTROL_VALUE_WEIGHT_V7 * value : 0;
}

/** A visible hostile land unit stands fortified (Walls or Field Defense). */
function martianFortifiedHostileVisibleV7(context: PolicyContextV7): boolean {
  const view = context.view;
  return context.lookup.visibleHostiles.some((unit) => {
    if (unit.form !== "LAND") return false;
    const tile = findPublicTileV7(view, unit.at);
    return (
      tile?.explored === true &&
      tile.territoryOwnerId === unit.ownerId &&
      (tile.fortificationLevel ?? 0) > 0
    );
  });
}

/**
 * Whether an own capture-capable land unit next to `center` can still step
 * onto it this turn (it has an offered Move), once a Tractor Beam empties it.
 */
function martianCapturerCanEnterV7(
  context: PolicyContextV7,
  center: CoordV7,
): boolean {
  const view = context.view;
  const movers = martianCacheV7(context).movers;
  return view.units.some(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      distance(unit.at, center) === 1 &&
      movers.has(unit.id) &&
      unitRoleRuleV7(view, unit).abilities.includes("CAPTURE"),
  );
}

/**
 * Against Martians (Goblin seats): a Kaboom that strips the Shields of a
 * clump the own units can still attack this turn is worth those Shields
 * (Gang Up attacks then deal HP damage).
 */
function martianStrippedShieldValueV7(
  context: PolicyContextV7,
  preview: NonNullable<ReturnType<typeof previewKaboomV7>>,
): number {
  const view = context.view;
  const attacked = new Set<UnitId>();
  for (const command of context.commands)
    if (command.kind === "ATTACK") attacked.add(command.targetUnitId);
  let value = 0;
  for (const explosion of preview.explosions)
    for (const result of explosion.results)
      if (
        result.unitId !== null &&
        !result.friendly &&
        !result.dies &&
        result.shieldDamage > 0 &&
        isHostile(view, result.ownerId) &&
        attacked.has(result.unitId)
      )
        value += STRIPPED_SHIELD_VALUE_V7 * result.shieldDamage;
  return value;
}

/**
 * Against Martians: `actor` moving to `to` stands next to an own city center
 * whose only adjacent own unit is the one on it, while a visible hostile
 * Mothership is within four tiles (it could pull the defender off).
 */
function martianSoleDefenderBesideV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  // `pulp_wars-1wy.4`: every puller. A Saucer pulls from its Move (3) plus
  // its reach (2), a Mothership since `pulp_wars-1wy.3` from Move 2 plus
  // reach 3: five tiles each. The baseline: the Mothership within four.
  const mobility = mobilityPlayV7();
  const motherships = context.lookup.visibleHostiles.filter(
    (unit) =>
      unit.form === "LAND" &&
      (isMothershipForPolicyV7(view, unit) ||
        (mobility &&
          isSaucerForPolicyV7(view, unit) &&
          hasAbilityV7(view, unit, "TRACTOR_BEAM"))),
  );
  if (motherships.length === 0) return false;
  const radius = (unit: PublicUnitV7): number =>
    !mobility
      ? MOTHERSHIP_PULL_RADIUS_V7
      : isMothershipForPolicyV7(view, unit)
        ? HEAVY_PULL_RADIUS_V7
        : SAUCER_PULL_RADIUS_V7;
  return view.cities.some((city) => {
    if (city.ownerId !== view.viewer.id || distance(city.at, to) !== 1)
      return false;
    if (distance(city.at, actor.at) <= 1) return false;
    if (!motherships.some((unit) => distance(unit.at, city.at) <= radius(unit)))
      return false;
    const near = view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        distance(unit.at, city.at) <= 1,
    );
    return near.length === 1 && same(near[0]?.at ?? actor.at, city.at);
  });
}

/** Whether an own Saucer has a `BEAM_DOWN` worth taking now. */
function martianSaucerBeamsV7(
  context: PolicyContextV7,
  saucerId: UnitId,
): boolean {
  const cache = martianCacheV7(context);
  const cached = cache.beamers.get(saucerId);
  if (cached !== undefined) return cached;
  let beams = false;
  for (const command of context.commands)
    if (
      command.kind === "BEAM_DOWN" &&
      command.unitId === saucerId &&
      martianBeamDownScoreV7(context, command).priority > 0
    ) {
      beams = true;
      break;
    }
  cache.beamers.set(saucerId, beams);
  return beams;
}

/**
 * `pulp_wars-1wy.4`: own one-slot ground units that have used their primary
 * action this turn and stand in visible lethal reach, away from an own city
 * center: the units a carrier extracts (cached per decision).
 */
function martianRescueUnitsV7(
  context: PolicyContextV7,
): readonly PublicUnitV7[] {
  const cache = martianCacheV7(context);
  if (cache.rescue.units !== null) return cache.rescue.units;
  const view = context.view;
  const beamed = new Set(view.beamedThisTurn);
  const units = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      unit.hp > 0 &&
      primaryUsedForPolicyV7(unit) &&
      !(unit.activation.recovered && unit.activation.captured) &&
      !beamed.has(unit.id) &&
      !fliesForPolicyV7(view, unit) &&
      unitCapacitySlotsV7(view, unit) === 1 &&
      !view.cities.some((city) => same(city.at, unit.at)) &&
      visibleImmediateDamage(view, unit, unit.at, context) >= unit.hp,
  );
  cache.rescue.units = units;
  return units;
}

/**
 * `pulp_wars-1wy.4`: the value of a carrier's Move to `to` as the first
 * half of an extraction, or null. The carrier still has its primary
 * action, a unit of `martianRescueUnitsV7` is beyond its pick-up range now
 * and within it from `to`, `to` is outside the carrier's lethal reach, and
 * an empty explored land tile next to `to` is outside the unit's.
 */
function martianCarrierRescueMoveV7(
  context: PolicyContextV7,
  carrier: PublicUnitV7,
  to: CoordV7,
): number | null {
  const view = context.view;
  if (!primaryReadyForPolicyV7(carrier) || carrier.activation.handled)
    return null;
  let best: number | null = null;
  for (const unit of martianRescueUnitsV7(context)) {
    if (
      distance(carrier.at, unit.at) <= BEAM_DOWN_PICKUP_RANGE_V7 ||
      distance(to, unit.at) > BEAM_DOWN_PICKUP_RANGE_V7
    )
      continue;
    if (visibleImmediateDamage(view, carrier, to, context) >= carrier.hp)
      continue;
    let lands = false;
    for (let dy = -1; dy <= 1 && !lands; dy += 1)
      for (let dx = -1; dx <= 1 && !lands; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const at = { x: to.x + dx, y: to.y + dy };
        const tile = findPublicTileV7(view, at);
        if (
          tile?.explored !== true ||
          tile.biome === null ||
          tile.site !== null ||
          (context.threatLookup.occupantsByKey.get(coordKey(at))?.length ?? 0) >
            0 ||
          // Map curiosities: never onto a Monster's provoke tiles.
          (context.curiosities !== null &&
            monsterProvokedAtV7(context.curiosities, at) !== undefined)
        )
          continue;
        lands = visibleImmediateDamage(view, unit, at, context) < unit.hp;
      }
    if (!lands) continue;
    const value = retainedUnitValue(view, unit);
    if (best === null || value > best) best = value;
  }
  return best;
}

/**
 * The Martian pass, correction (`pulp_wars-w49.14`): 1 when the Move takes
 * a Martian seat's own unit that a visible hostile unit with Overrun kills
 * in one attack (`armyWeakLinkV7`; not one a Force Field holds) out of the
 * reach of every such unit, -1 when it takes it into one, 0 otherwise. A
 * unit on an own city center stays; a full-HP unit whose Move ends beside
 * an own Shield Projector, with Force Fields, may enter (the field holds).
 * (A hand player's line stepped back out of the Knights' reach and lost
 * four units to thirteen Knights; the seat's own line stood in reach.)
 */
function armyKnightShyV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
): -1 | 0 | 1 {
  const view = context.view;
  if (
    !context.army ||
    !context.martian ||
    actor.form !== "LAND" ||
    actor.ownerId !== view.viewer.id ||
    policyUnitFactionV7(view, actor) !== "MARTIAN" ||
    fliesForPolicyV7(view, actor)
  )
    return 0;
  const chainers = armyChainersV7(context);
  if (chainers.length === 0 || !armyWeakLinkV7(context, actor)) return 0;
  const center = (at: CoordV7): boolean =>
    context.lookup.citiesByKey.get(coordKey(at))?.ownerId === view.viewer.id;
  if (center(actor.at)) return 0;
  const reached = (at: CoordV7): boolean =>
    chainers.some(
      (unit) =>
        context.threatenedTiles.get(unit.id)?.has(coordKey(at)) === true,
    );
  const here = reached(actor.at);
  const there = reached(to);
  if (here && !there) return 1;
  if (here || !there || center(to)) return 0;
  const facts = martianCacheV7(context).facts;
  const fielded =
    facts.forceFields &&
    actor.hp >= actor.maxHp &&
    facts.ownProjectors.some(
      (unit) => unit.id !== actor.id && distance(unit.at, to) <= 1,
    );
  return fielded ? 0 : -1;
}

/**
 * The Martian pass, correction: a carrier that has not used its action
 * ends its Move beside a free village (nobody on it, no visible hostile
 * unit within two tiles, no own capturer within two) with a free tile
 * beside both, while an own capturer that may be beamed stands on or
 * beside an own center three or more tiles from that village.
 */
function armyVillageFerryV7(
  context: PolicyContextV7,
  carrier: PublicUnitV7,
  to: CoordV7,
): boolean {
  const view = context.view;
  if (!primaryReadyForPolicyV7(carrier) || same(carrier.at, to)) return false;
  const centers = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => city.at);
  const capturers = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      !fliesForPolicyV7(view, unit) &&
      unitRoleRuleV7(view, unit).abilities.includes("CAPTURE"),
  );
  return view.board.tiles.some(
    (tile) =>
      tile.explored &&
      tile.site === "VILLAGE" &&
      tile.territoryOwnerId === null &&
      distance(tile.at, to) === 1 &&
      distance(tile.at, carrier.at) > 1 &&
      !view.units.some(
        (unit) =>
          same(unit.at, tile.at) ||
          (isHostile(view, unit.ownerId) && distance(unit.at, tile.at) <= 2),
      ) &&
      !capturers.some((unit) => distance(unit.at, tile.at) <= 2) &&
      capturers.some(
        (unit) =>
          distance(unit.at, tile.at) >= 3 &&
          centers.some((center) => distance(center, unit.at) <= 1) &&
          // (A lone unit on a center stays: another stands beside it.)
          (!centers.some((center) => same(center, unit.at)) ||
            capturers.some(
              (other) =>
                other.id !== unit.id && distance(other.at, unit.at) <= 1,
            )),
      ),
  );
}

/**
 * The Martian pass, correction: the free village a Beam Down to `to`
 * delivers a capturer to: explored, nobody's land, no unit on it, no
 * visible hostile unit within two tiles, beside `to`, and at least
 * `ARMY_VILLAGE_DELIVERY_GAIN_V7` tiles nearer than the passenger stands.
 * (A hand player took five cities by round 8 this way; the seat had two
 * until round 10.)
 */
function armyVillageDeliveryV7(
  context: PolicyContextV7,
  passenger: PublicUnitV7,
  to: CoordV7,
): number | null {
  if (!context.army) return null;
  const view = context.view;
  if (
    passenger.ownerId !== view.viewer.id ||
    !unitRoleRuleV7(view, passenger).abilities.includes("CAPTURE") ||
    // From a city: a unit that has not acted, on or beside an own center.
    !primaryReadyForPolicyV7(passenger) ||
    !view.cities.some(
      (city) =>
        city.ownerId === view.viewer.id && distance(city.at, passenger.at) <= 1,
    )
  )
    return null;
  // A unit on a village it is taking, or the only unit on a center, stays.
  const under = findPublicTileV7(view, passenger.at);
  if (
    under?.explored === true &&
    under.site === "VILLAGE" &&
    under.territoryOwnerId === null
  )
    return null;
  let best: number | null = null;
  for (const tile of view.board.tiles) {
    if (
      !tile.explored ||
      tile.site !== "VILLAGE" ||
      tile.territoryOwnerId !== null ||
      distance(tile.at, to) !== 1
    )
      continue;
    const gain = distance(passenger.at, tile.at) - 1;
    if (gain < ARMY_VILLAGE_DELIVERY_GAIN_V7) continue;
    if (
      view.units.some(
        (unit) =>
          unit.id !== passenger.id &&
          (same(unit.at, tile.at) ||
            (isHostile(view, unit.ownerId) &&
              distance(unit.at, tile.at) <= 2) ||
            // Another own capturer is already as near.
            (unit.ownerId === view.viewer.id &&
              unit.form === "LAND" &&
              distance(unit.at, tile.at) <= 1 &&
              unitRoleRuleV7(view, unit).abilities.includes("CAPTURE"))),
      )
    )
      continue;
    if (best === null || gain > best) best = gain;
  }
  return best;
}

function martianBeamDownScoreV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "BEAM_DOWN" }>,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const cache = martianCacheV7(context);
  const passenger = context.lookup.unitsById.get(command.passengerUnitId);
  if (passenger === undefined)
    return { priority: -1, strategic: 0, immediate: 0 };
  // The passenger joins a group: another own land unit near the landing.
  const joins = context.view.units.some(
    (unit) =>
      unit.id !== passenger.id &&
      unit.id !== command.unitId &&
      unit.ownerId === context.view.viewer.id &&
      unit.form === "LAND" &&
      !fliesForPolicyV7(context.view, unit) &&
      distance(unit.at, command.to) <= 2,
  );
  // The Martian pass, correction: a capturer to a free village.
  const village = armyVillageDeliveryV7(context, passenger, command.to);
  if (
    village !== null &&
    !cache.attackers.has(passenger.id) &&
    visibleImmediateDamage(context.view, passenger, command.to, context) <= 0 &&
    // Not the unit that holds a center with an enemy near.
    !(
      context.lookup.citiesByKey.has(coordKey(passenger.at)) &&
      armyHostilesV7(context).some(
        (unit) => distance(unit.at, passenger.at) <= ARMY_GARRISON_RADIUS_V7,
      )
    )
  )
    return {
      priority: ARMY_VILLAGE_DELIVERY_PRIORITY_V7,
      strategic: 4 * Math.min(village, 8),
      immediate: 0,
    };
  // `pulp_wars-1wy.4`: the group test is the delivery by route's; an
  // extraction and a shot on arrival do not need it.
  if (!joins && !mobilityPlayV7())
    return { priority: -1, strategic: 0, immediate: 0 };
  const score = beamDownScoreV7(
    cache.tools,
    command,
    cache.attackers.has(passenger.id),
    cache.movers.has(passenger.id),
    joins,
  );
  // The Martian pass, correction: an army seat's extraction sets the unit
  // down with its own units or by an own center, not wherever the carrier
  // happens to be (its one promoted Grunt sat out the decisive turns in a
  // corner of the map).
  if (
    context.army &&
    score.priority === BEAM_DOWN_EXTRACT_PRIORITY_V7 &&
    !joins &&
    // (A step out of reach, three tiles at most, is no journey.)
    distance(passenger.at, command.to) > BEAM_DOWN_PICKUP_RANGE_V7 + 1 &&
    !context.view.cities.some(
      (city) =>
        city.ownerId === context.view.viewer.id &&
        distance(city.at, command.to) <= 2,
    )
  )
    return { priority: -1, strategic: 0, immediate: 0 };
  return score;
}

/**
 * `pulp_wars-b5f.2`: the step back of a Martian shooter with range 2 (the
 * Grunt's plain ray pistol, the Ray Gunner, the Tripod, the Colossus) that
 * can still attack after this Move. It stands next to a hostile melee unit
 * (one that cannot shoot at range 2, so it retaliates only when adjacent),
 * or, for the Tripod, inside its minimum range of any hostile unit, and is
 * not on a settlement center: a Move to a tile with no such unit that
 * close, from which a visible hostile land unit is in range, outside
 * visible lethal reach, goes at 904 (above the chips, so it steps before it
 * shoots). A ray unit that could fire at full power where it stands keeps
 * that shot. Null when the rule does not apply.
 */
function martianRangedStepBackV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  blockedHere: boolean,
): { readonly priority: number; readonly strategic: number } | null {
  const view = context.view;
  const cache = martianCacheV7(context);
  const facts = cache.facts;
  if (
    actor.activation.moved ||
    !primaryReadyForPolicyV7(actor) ||
    !unitMayActAfterMoveV7(view, actor)
  )
    return null;
  const rule = unitRoleRuleV7(view, actor);
  if (!rule.abilities.includes("ATTACK")) return null;
  const hostileLand = context.lookup.visibleHostiles.filter(
    (unit) => unit.form === "LAND" && unit.hp > 0,
  );
  if (hostileLand.length === 0) return null;
  const melee = (unit: PublicUnitV7): boolean =>
    publicCombatFacts(view, unit, context.lookup).maximumRange < 2;
  const tooClose = (at: CoordV7): boolean =>
    hostileLand.some((unit) => {
      const gap = distance(unit.at, at);
      return gap < rule.minimumRange || (gap === 1 && melee(unit));
    });
  if (tooClose(to)) return null;
  const targets = hostileLand.filter((unit) => {
    const gap = distance(unit.at, to);
    return gap >= Math.max(2, rule.minimumRange) && gap <= rule.range;
  });
  if (targets.length === 0) return null;
  const danger = visibleImmediateDamage(view, actor, to, context);
  if (danger >= actor.hp) return null;
  if (
    view.cities.some((city) => same(city.at, actor.at)) ||
    !tooClose(actor.at)
  )
    return null;
  // A ready ray unit with a full-power shot where it stands keeps it.
  if (
    isRayUnitV7(view, actor) &&
    !facts.coolingNow.has(actor.id) &&
    !blockedHere &&
    cache.attackers.has(actor.id)
  )
    return null;
  return {
    priority: RANGED_STEP_BACK_PRIORITY_V7,
    strategic: 6 + targets.length - Math.floor(danger / 2),
  };
}

/**
 * Martian Move adjustments.
 *
 * As Martians: a ray unit that can fire at full power fires before it moves
 * and holds its tile while a non-ray hostile unit is three tiles away; a
 * Cooling ray unit next to a hostile melee unit steps back to range two; a
 * Saucer stays out of lethal reach, waits unmoved where it can beam, and
 * otherwise stages within four tiles of the wave target next to the army; a
 * Mothership stays with the army; a Brain stays out of contact and steps
 * into range of a convertible target; a Projector moves to cover more own
 * units, and other units end next to it; a wounded unit with no Shield
 * leaves visible reach.
 *
 * `pulp_wars-1wy.4` (`mobilityPlay`): a puller flies to the tile from which
 * its beam empties a hostile center for an own capturer (1346); a Saucer no
 * longer waits unmoved to beam (the staging rule is unchanged); a carrier
 * flies to a spent unit in lethal reach it can extract from there (891, the
 * Saucer and the Mothership); a shooter's routine Move next to a hostile
 * melee unit costs 8.
 *
 * Against Martians (any seat): a unit at 6 HP or less leaves, and does not
 * enter, the reach of a ready hostile Brain.
 */
function martianMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const cache = martianCacheV7(context);
  const facts = cache.facts;
  let next = priority;
  let strategic = 0;
  const routine = priority < MARTIAN_ROUTINE_MOVE_PRIORITY_V7;
  if (actor.form !== "LAND") return { priority, strategic };
  // Against Martians: Mind Control denial.
  if (cache.hostileBrains.length > 0) {
    const exposedNow = mindControlExposedV7(
      view,
      actor,
      actor.at,
      actor.hp,
      cache.hostileBrains,
    );
    const exposedThere = mindControlExposedV7(
      view,
      actor,
      to,
      actor.hp,
      cache.hostileBrains,
    );
    if (exposedThere && !exposedNow && routine)
      return { priority: -1, strategic: 0 };
    // A step away that leaves the Brain's current range (a Move-1 unit
    // cannot outrun a Brain's Move and range together).
    const nearest = (from: CoordV7): number =>
      Math.min(...cache.hostileBrains.map((brain) => distance(brain.at, from)));
    if (
      exposedNow &&
      nearest(to) > Math.max(MIND_CONTROL_RANGE_V7, nearest(actor.at))
    ) {
      const danger = visibleImmediateDamage(view, actor, to, context);
      if (danger < actor.hp) {
        next = Math.max(next, MIND_CONTROL_ESCAPE_PRIORITY_V7);
        strategic += retainedUnitValue(view, actor);
      }
    }
  }
  // Against Martians: a sole defender of an own center within reach of a
  // visible hostile Mothership is pullable; a second unit stands next to it.
  if (routine && martianSoleDefenderBesideV7(context, actor, to))
    next = Math.max(next, MOTHERSHIP_GUARD_PRIORITY_V7);
  if (!facts.viewerMartian || actor.ownerId !== view.viewer.id)
    return { priority: next, strategic };
  const rule = unitRoleRuleV7(view, actor);
  // Machines cross water only toward their job and never into the reach
  // of a visible hostile naval unit (afloat they cannot fight).
  if (routine && unitMovementModeV7(view, actor) !== "GROUND") {
    const tile = findPublicTileV7(view, to);
    if (tile?.explored === true && tile.biome === null) {
      const progress = campaignRouteProgressV7(
        context.tactical.campaign,
        actor,
        to,
      );
      if (
        (progress !== null && progress <= 0) ||
        context.lookup.visibleHostiles.some(
          (unit) => unit.form === "NAVAL" && distance(unit.at, to) <= 3,
        )
      )
        return { priority: -1, strategic: 0 };
    }
  }
  const abilities = rule.abilities;
  const dangerThere = (): number =>
    visibleImmediateDamage(view, actor, to, context);
  const dangerHere = (): number =>
    visibleImmediateDamage(view, actor, actor.at, context);
  const hostileLand = context.lookup.visibleHostiles.filter(
    (unit) => unit.form === "LAND" && unit.hp > 0,
  );
  // `pulp_wars-1wy.4`: the siege pull, set up. A puller flies to the tile
  // from which its beam empties a hostile center for an own capturer.
  if (
    mobilityPlayV7() &&
    abilities.includes("TRACTOR_BEAM") &&
    !actor.activation.moved &&
    dangerThere() < actor.hp &&
    pullCaptureMoveV7(cache.tools, actor, to, (center) =>
      martianCapturerCanEnterV7(context, center),
    )
  ) {
    next = Math.max(next, TRACTOR_CAPTURE_MOVE_PRIORITY_V7);
    strategic += 40;
  }
  const rangedStepBack = martianPolicyOptionsV7().rangedStepBack;
  // `pulp_wars-b5f.2`: a Tripod (minimum range 2) with a hostile unit
  // inside its minimum range cannot fire from where it stands.
  const blockedHere =
    rangedStepBack &&
    rule.minimumRange >= 2 &&
    hostileLand.some((unit) => distance(unit.at, actor.at) < rule.minimumRange);
  // Rays: full power from where the unit stands.
  if (isRayUnitV7(view, actor) && routine) {
    const ready = !actor.activation.moved && !facts.coolingNow.has(actor.id);
    if (ready && dangerHere() < actor.hp && !blockedHere) {
      if (cache.attackers.has(actor.id)) return { priority: -1, strategic: 0 };
      const approaching = hostileLand.some(
        (unit) => distance(unit.at, actor.at) === 3 && !isRayUnitV7(view, unit),
      );
      if (approaching) return { priority: -1, strategic: 0 };
    }
    // Position the turn before: range 2 of a hostile unit holding a
    // settlement center (it does not walk away), outside lethal reach.
    if (
      !cache.attackers.has(actor.id) &&
      hostileLand.some(
        (unit) =>
          distance(unit.at, to) === 2 &&
          view.cities.some((city) => same(city.at, unit.at)),
      ) &&
      dangerThere() < actor.hp
    ) {
      next = Math.max(next, RAY_SIEGE_PRIORITY_V7);
      strategic += 4;
    }
    if (facts.coolingNow.has(actor.id)) {
      const meleeNear = (at: CoordV7): boolean =>
        hostileLand.some(
          (unit) =>
            distance(unit.at, at) === 1 &&
            publicCombatFacts(view, unit, context.lookup).minimumRange <= 1,
        );
      if (
        meleeNear(actor.at) &&
        !hostileLand.some((unit) => distance(unit.at, to) <= 1) &&
        hostileLand.some((unit) => distance(unit.at, to) === 2) &&
        dangerThere() < actor.hp
      ) {
        // The Martian pass: an army seat steps back before its committed
        // attack from the next tile too (`ARMY_STEP_BACK_PRIORITY_V7`).
        next = Math.max(
          next,
          context.army ? ARMY_STEP_BACK_PRIORITY_V7 : RAY_KITE_PRIORITY_V7,
        );
        strategic += 6;
      }
    }
  }
  // `pulp_wars-b5f.2`: the step back of the Grunt's ray pistol and the
  // Tripod's range-2 ray.
  // `pulp_wars-b5f.3`: a Martian shooter's rule (a controlled Archer is
  // played by its own kind's rules).
  if (
    rangedStepBack &&
    routine &&
    rule.range >= 2 &&
    (!mindControlPlayV7() || policyUnitFactionV7(view, actor) === "MARTIAN")
  ) {
    const ranged = martianRangedStepBackV7(context, actor, to, blockedHere);
    if (ranged !== null) {
      next = Math.max(
        next,
        context.army ? ARMY_STEP_BACK_PRIORITY_V7 : ranged.priority,
      );
      strategic += ranged.strategic;
    }
  }
  // The Martian pass, correction: out of a Knight's reach
  // (`ARMY_KNIGHT_SHY_MAXIMUM_V7`).
  if (
    context.army &&
    priority <= ARMY_KNIGHT_SHY_MAXIMUM_V7 &&
    !same(actor.at, to) &&
    !armyVillageMoveV7(context, actor, to)
  ) {
    const shy = armyKnightShyV7(context, actor, to);
    if (shy < 0) return { priority: -1, strategic: 0 };
    if (shy > 0 && dangerThere() <= dangerHere()) {
      next = Math.max(next, ARMY_STEP_BACK_PRIORITY_V7);
      strategic +=
        8 +
        (hostileLand.some(
          (unit) =>
            distance(unit.at, to) <= rule.range &&
            distance(unit.at, to) >= rule.minimumRange,
        )
          ? 6
          : 0);
    }
  }
  // Flyers: never into visible lethal reach unless it is no worse.
  if (fliesForPolicyV7(view, actor) && routine) {
    const there = dangerThere();
    if (there >= actor.hp && there >= dangerHere())
      return { priority: -1, strategic: 0 };
  }
  // The Saucer: waits where it can beam; stages near the wave target.
  // `pulp_wars-1wy.4`: a carrier flies to a spent unit in lethal reach it
  // can extract from there (the Mothership below).
  const saucerRescue =
    isSaucerForPolicyV7(view, actor) && routine && mobilityPlayV7()
      ? martianCarrierRescueMoveV7(context, actor, to)
      : null;
  if (saucerRescue !== null) {
    next = Math.max(next, CARRIER_RESCUE_MOVE_PRIORITY_V7);
    strategic += saucerRescue;
  } else if (
    // The Martian pass (`pulp_wars-w49.14`): an army seat's Saucer in the
    // reach of visible enemies flies to a tile where it takes less, the
    // nearer to its own units the better.
    context.army &&
    isSaucerForPolicyV7(view, actor) &&
    routine &&
    dangerHere() > 0 &&
    dangerThere() < dangerHere() &&
    dangerThere() < actor.hp
  ) {
    next = Math.max(next, ARMY_CARRIER_KEEP_OUT_PRIORITY_V7);
    strategic +=
      4 * (dangerHere() - dangerThere()) +
      2 *
        Math.min(
          4,
          view.units.filter(
            (unit) =>
              unit.id !== actor.id &&
              unit.ownerId === view.viewer.id &&
              unit.form === "LAND" &&
              distance(unit.at, to) <= 2,
          ).length,
        );
  } else if (
    // The Martian pass, correction: an army seat's Saucer flies to a free
    // village it can deliver a capturer to (`armyVillageFerryV7`).
    context.army &&
    isSaucerForPolicyV7(view, actor) &&
    routine &&
    dangerThere() <= 0 &&
    armyVillageFerryV7(context, actor, to)
  ) {
    next = Math.max(next, ARMY_VILLAGE_FERRY_PRIORITY_V7);
    strategic += 10;
  } else if (isSaucerForPolicyV7(view, actor) && routine) {
    // `pulp_wars-1wy.4`: Beam Down no longer needs an unmoved carrier, so
    // the Saucer does not wait for it (the baseline's rule).
    if (
      !mobilityPlayV7() &&
      !actor.activation.moved &&
      martianSaucerBeamsV7(context, actor.id)
    )
      return { priority: -1, strategic: 0 };
    const target = cache.tools.waveTarget;
    if (target !== null) {
      const staging = (at: CoordV7): number =>
        Math.abs(distance(at, target) - SAUCER_STAGING_DISTANCE_V7 + 1) +
        (view.units.some(
          (unit) =>
            unit.id !== actor.id &&
            unit.ownerId === view.viewer.id &&
            unit.form === "LAND" &&
            !fliesForPolicyV7(view, unit) &&
            distance(unit.at, at) <= 2,
        )
          ? 0
          : 2);
      const gain = staging(actor.at) - staging(to);
      if (gain <= 0) return { priority: -1, strategic: 0 };
      next = Math.max(next, 720);
      strategic += 3 * gain - dangerThere();
    }
  }
  // The Mothership stays with the army.
  if (isMothershipForPolicyV7(view, actor) && routine) {
    const army = view.units.filter(
      (unit) =>
        unit.id !== actor.id &&
        unit.ownerId === view.viewer.id &&
        unit.form === "LAND" &&
        !fliesForPolicyV7(view, unit) &&
        distance(unit.at, to) <= 2,
    ).length;
    if (army === 0 && hostileLand.some((unit) => distance(unit.at, to) <= 3))
      return { priority: -1, strategic: 0 };
    strategic += 2 * Math.min(4, army);
    // `pulp_wars-1wy.4`: the Mothership is a carrier too.
    const rescue = mobilityPlayV7()
      ? martianCarrierRescueMoveV7(context, actor, to)
      : null;
    if (rescue !== null) {
      next = Math.max(next, CARRIER_RESCUE_MOVE_PRIORITY_V7);
      strategic += rescue;
    }
  }
  // `pulp_wars-1wy.4`: a shooter keeps its distance. A routine Move of a
  // Martian ground unit with range 2 that ends next to a hostile melee unit
  // it does not stand next to now, and not on a settlement center, costs 8:
  // among equal Moves it takes the tile two tiles away.
  if (
    mobilityPlayV7() &&
    routine &&
    rule.range >= 2 &&
    abilities.includes("ATTACK") &&
    !fliesForPolicyV7(view, actor) &&
    policyUnitFactionV7(view, actor) === "MARTIAN"
  ) {
    const contact = (at: CoordV7): boolean =>
      hostileLand.some(
        (unit) =>
          distance(unit.at, at) === 1 &&
          publicCombatFacts(view, unit, context.lookup).maximumRange < 2,
      );
    if (
      contact(to) &&
      !contact(actor.at) &&
      !view.cities.some((city) => same(city.at, to))
    )
      strategic -= SHOOTER_CONTACT_COST_V7;
  }
  // The Brain: out of contact; into range of a convertible target.
  if (abilities.includes("MIND_CONTROL")) {
    const ready =
      !facts.cooldownBrains.has(actor.id) &&
      (facts.controlledOfBrain.get(actor.id)?.length ?? 0) <
        MIND_CONTROL_LIMIT_V7 &&
      !actor.activation.handled &&
      !cache.mindControllers.has(actor.id);
    if (ready) {
      const convertible = hostileLand.filter(
        (unit) =>
          distance(unit.at, to) <= MIND_CONTROL_RANGE_V7 &&
          mindControlExposedV7(view, unit, unit.at, unit.hp, [
            { ...actor, at: to },
          ]),
      );
      if (convertible.length > 0 && dangerThere() < actor.hp) {
        next = Math.max(next, MIND_CONTROL_APPROACH_PRIORITY_V7);
        // `pulp_wars-b5f.3`: toward the most valuable conversion.
        strategic += Math.max(
          ...convertible.map((unit) =>
            mindControlPlayV7()
              ? MIND_CONTROL_VALUE_WEIGHT_V7 * mindControlValueV7(view, unit)
              : targetStrategicValue(view, unit.id, context.lookup),
          ),
        );
      }
    }
    if (
      next < MARTIAN_ROUTINE_MOVE_PRIORITY_V7 &&
      hostileLand.some((unit) => distance(unit.at, to) <= 1) &&
      !hostileLand.some((unit) => distance(unit.at, actor.at) <= 1)
    )
      return { priority: -1, strategic: 0 };
  }
  // The Force Field: Projectors cover the army; units end beside them.
  if (abilities.includes("FORCE_FIELD") && routine) {
    const covered = (at: CoordV7): number =>
      view.units.filter(
        (unit) =>
          unit.id !== actor.id &&
          unit.ownerId === view.viewer.id &&
          distance(unit.at, at) === 1 &&
          shieldMaximumForPolicyV7(view, facts, unit) > 0,
      ).length;
    const gain = covered(to) - covered(actor.at);
    strategic += PROJECTOR_COVER_VALUE_V7 * gain;
    if (gain > 0 && next >= 0 && dangerThere() < actor.hp)
      next = Math.max(next, 705);
  } else if (
    // The Martian pass (`pulp_wars-w49.14`): a Projector covers nobody
    // until its owner has Force Fields.
    facts.forceFields &&
    shieldMaximumForPolicyV7(view, facts, actor) > 0 &&
    facts.ownProjectors.some(
      (projector) =>
        projector.id !== actor.id && distance(projector.at, to) === 1,
    )
  )
    strategic += FORCE_FIELD_COVER_VALUE_V7;
  // A wounded unit without a Shield leaves visible reach to recover.
  if (
    routine &&
    actor.hp < actor.maxHp &&
    shieldMaximumForPolicyV7(view, facts, actor) > 0 &&
    (facts.shieldByUnit.get(actor.id) ?? 0) === 0 &&
    dangerHere() > 0 &&
    dangerThere() === 0
  )
    next = Math.max(next, SHIELDLESS_RETREAT_PRIORITY_V7);
  return { priority: next, strategic };
}

// The Ice Folk revision (`pulp_wars-7g3.4`, docs/product/RULESET_7_ICE_FOLK.md
// section 12). Every helper below runs only in a match with an Ice Folk seat
// (`context.iceFolk`) or through facts only such a match has; each is a
// bounded scan of the public view and public previews inside an existing
// scoring step, cached per decision, with no PRNG use, elapsed-time input, or
// work units. The rules and values live in `src/ai/v7-ice-folk.ts`.

interface IceFolkContextCacheV7 {
  readonly facts: IceFolkFactsV7;
  readonly army: IceFolkArmyCountsV7;
  readonly tools: IceFolkPolicyToolsV7;
  /** Own units with an offered `ATTACK`. */
  readonly attackers: ReadonlySet<UnitId>;
  /** The own offered attack previews on each target (best per attacker). */
  readonly attacksOnTarget: Map<UnitId, readonly CombatPreviewV7[]>;
  /** Own units whose offered attack shatters each target once Chilled. */
  readonly shatterSetups: Map<UnitId, readonly UnitId[]>;
  /** Each own Witch's best Move destination (rule 2), or null to stay. */
  readonly witchDestination: Map<UnitId, CoordV7 | null>;
  /** Own Sleds with an offered killing attack. */
  readonly sledKills: Map<UnitId, boolean>;
}

const iceFolkFactsByViewV7 = new WeakMap<PlayerViewV7, IceFolkFactsV7>();

function iceFolkFactsForViewV7(view: PlayerViewV7): IceFolkFactsV7 {
  const cached = iceFolkFactsByViewV7.get(view);
  if (cached !== undefined) return cached;
  const facts = iceFolkFactsV7(view, (owner) => isHostile(view, owner));
  iceFolkFactsByViewV7.set(view, facts);
  return facts;
}

function iceFolkCacheV7(context: PolicyContextV7): IceFolkContextCacheV7 {
  if (context.iceFolkCache !== null) return context.iceFolkCache;
  const view = context.view;
  const facts = iceFolkFactsForViewV7(view);
  const attackers = new Set<UnitId>();
  for (const command of context.commands)
    if (command.kind === "ATTACK") attackers.add(command.unitId);
  const shatterSetups = new Map<UnitId, readonly UnitId[]>();
  const cache: IceFolkContextCacheV7 = {
    facts,
    army: iceFolkArmyCountsV7(view),
    attackers,
    attacksOnTarget: new Map(),
    shatterSetups,
    witchDestination: new Map(),
    sledKills: new Map(),
    tools: {
      view,
      facts,
      commands: context.commands,
      isHostile: (owner) => isHostile(view, owner),
      unit: (unitId) => context.lookup.unitsById.get(unitId),
      targetValue: (unit) =>
        targetStrategicValue(view, unit.id, context.lookup),
      projectedDamage: (attacker, defender) =>
        publicProjectedDamageWithLookupV7(
          view,
          attacker,
          defender,
          defender.at,
          { maximumCharge: true },
          context.lookup,
        ),
      threatens: (hostile, at) =>
        (context.threatenedTiles.get(hostile.id)?.has(coordKey(at)) ?? false) ||
        distance(hostile.at, at) <=
          publicCombatFacts(view, hostile, context.lookup).maximumRange,
      shatterSetups: (targetId, throwerId) => {
        let setups = shatterSetups.get(targetId);
        if (setups === undefined) {
          const found = new Set<UnitId>();
          for (const command of context.commands)
            if (
              command.kind === "ATTACK" &&
              command.targetUnitId === targetId &&
              !found.has(command.unitId) &&
              queryCombatPreviewV7(view, command.unitId, targetId, {
                assumeTargetChilled: true,
              })?.shatters === true
            )
              found.add(command.unitId);
          setups = [...found].sort((left, right) => left - right);
          shatterSetups.set(targetId, setups);
        }
        return setups.filter((unitId) => unitId !== throwerId);
      },
    },
  };
  context.iceFolkCache = cache;
  return cache;
}

/** The own offered attack previews on `targetId` (best per attacker). */
function iceFolkAttacksOnTargetV7(
  context: PolicyContextV7,
  targetId: UnitId,
): readonly CombatPreviewV7[] {
  const cache = iceFolkCacheV7(context);
  const cached = cache.attacksOnTarget.get(targetId);
  if (cached !== undefined) return cached;
  const best = new Map<UnitId, CombatPreviewV7>();
  for (const command of context.commands) {
    if (command.kind !== "ATTACK" || command.targetUnitId !== targetId)
      continue;
    const preview = queryCombatPreviewV7(
      context.view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview === null) continue;
    const prior = best.get(command.unitId);
    if (
      prior === undefined ||
      preview.damageToDefender > prior.damageToDefender
    )
      best.set(command.unitId, preview);
  }
  const previews = [...best.values()];
  cache.attacksOnTarget.set(targetId, previews);
  return previews;
}

/**
 * Against the Ice Folk: a hostile Witch that this turn's offered attacks
 * (each attacker's best hit, at least two attackers) kill.
 */
function iceFolkWitchFocusV7(
  context: PolicyContextV7,
  target: PublicUnitV7 | undefined,
): boolean {
  if (
    target === undefined ||
    !isHostile(context.view, target.ownerId) ||
    !iceFolkFactsForViewV7(context.view).hostileWitches.some(
      (witch) => witch.id === target.id,
    )
  )
    return false;
  const previews = iceFolkAttacksOnTargetV7(context, target.id);
  return (
    previews.length >= 2 &&
    sum(previews.map((preview) => preview.damageToDefender)) >= target.hp
  );
}

/** Whether an own Sled has an offered attack that kills. */
function iceFolkSledKillsV7(context: PolicyContextV7, sledId: UnitId): boolean {
  const cache = iceFolkCacheV7(context);
  const cached = cache.sledKills.get(sledId);
  if (cached !== undefined) return cached;
  let kills = false;
  for (const command of context.commands)
    if (
      command.kind === "ATTACK" &&
      command.unitId === sledId &&
      queryCombatPreviewV7(context.view, sledId, command.targetUnitId)
        ?.defenderDies === true
    ) {
      kills = true;
      break;
    }
  cache.sledKills.set(sledId, kills);
  return kills;
}

/** An own wounded land unit within two tiles of an own city center. */
function iceFolkWoundedAtHomeV7(context: PolicyContextV7): boolean {
  const view = context.view;
  const centers = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => city.at);
  return view.units.some(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.form === "LAND" &&
      unit.hp < unit.maxHp &&
      centers.some((center) => distance(center, unit.at) <= 2),
  );
}

/**
 * Ice Folk attack rejection: an own Sabretooth's attack that neither kills
 * nor leaves it alive through the visible enemies' next turn (the Vampire
 * rule; a city save excuses it).
 */
function iceFolkAttackRejectedV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  actor: PublicUnitV7,
  preview: CombatPreviewV7,
): boolean {
  const view = context.view;
  if (
    preview.defenderDies ||
    actor.ownerId !== view.viewer.id ||
    policyUnitFactionV7(view, actor) !== "ICE_FOLK" ||
    !hasAbilityForIceV7(view, actor, "PROWL") ||
    vampireAttackAcceptableV7(context, view, command)
  )
    return false;
  return !attackPurposeFactsV7(context, command, preview).savesCity;
}

/**
 * Ice Folk attack scoring (both sides of a match with an Ice Folk seat).
 *
 * Every seat: a ranged kill that a hidden Witch's Blizzard could halve
 * (`hiddenBlizzardPossible`) is not counted as a kill.
 *
 * As the Ice Folk: a Shatter kill gains 4; a non-lethal hit that leaves a
 * Chilled unit at the threshold or below for another offered attack, when
 * no own attack kills it outright now, goes at 1179 (above every chip) and
 * gains half the target's value; chips go Snow Hunters, Mammoths, other
 * melee units, Sleds; a Mammoth's Sweep gains 8 for trampled Field Defense
 * and 6 per flank victim left Chilled in the window; a Boulder Yeti gains 3
 * per fortification level ignored; a Sabretooth's kill gains 8 on a backline
 * unit and 4 on an isolated one.
 *
 * Against the Ice Folk: a kill on the Witch goes at 1182 (above every other
 * kill); a hit on her that this turn's attacks complete goes at 1179
 * (ranged) or 1178; an attack whose retaliation leaves a Chilled (or
 * chillable) attacker where a visible Ice Folk melee unit's next hit
 * shatters it costs half the attacker's value.
 */
function iceFolkAttackAdjustmentV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
  priority: number,
  threatening: boolean,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const cache = iceFolkCacheV7(context);
  const facts = cache.facts;
  let next = priority;
  let strategic = 0;
  const range = distance(actor.at, target.at);
  if (
    preview.hiddenBlizzardPossible &&
    preview.defenderDies &&
    range >= 2 &&
    blizzardHalvedDamageV7(preview.damageToDefender) < target.hp
  ) {
    if (next === 1180) next = 900;
    else if (next === 1280) next = threatening ? 1240 : 900;
  }
  const own = actor.ownerId === view.viewer.id;
  // The Mind Control revision (section 8): an own unit of the Ice Folk kind.
  if (own && isIceFolkUnitForPolicyV7(facts, actor)) {
    const abilities = unitRoleRuleV7(view, actor).abilities;
    if (preview.shatters) strategic += SHATTER_KILL_VALUE_V7;
    if (next === 900)
      next += abilities.includes("COLD_BLOOD")
        ? SNOW_HUNTER_CHIP_OFFSET_V7
        : abilities.includes("SWEEP")
          ? MAMMOTH_CHIP_OFFSET_V7
          : abilities.includes("BOLAS")
            ? 0
            : MELEE_CHIP_OFFSET_V7;
    const threshold = shatterThresholdForPolicyV7(facts, view.viewer.id);
    if (
      !preview.defenderDies &&
      !preview.attackerDies &&
      next < SHATTER_SETUP_PRIORITY_V7 &&
      isHostile(view, target.ownerId) &&
      chilledForPolicyV7(facts, target.id) &&
      target.hp - preview.damageToDefender <= threshold &&
      !iceFolkAttacksOnTargetV7(context, target.id).some(
        (other) => other.attackerId !== actor.id && other.defenderDies,
      ) &&
      hasLethalAttackFollowUpV7(context, command, preview)
    ) {
      next = SHATTER_SETUP_PRIORITY_V7;
      strategic += Math.floor(
        targetStrategicValue(view, target.id, context.lookup) / 2,
      );
    }
    if (preview.sweep) {
      const tile = findPublicTileV7(view, target.at);
      if (tile?.explored === true && tile.fieldDefense)
        strategic += TRAMPLE_VALUE_V7;
      for (const entry of preview.splash) {
        const victim = context.lookup.unitsById.get(entry.unitId);
        if (
          victim === undefined ||
          entry.dies ||
          !chilledForPolicyV7(facts, victim.id) ||
          victim.hp - entry.damage > threshold
        )
          continue;
        if (
          context.commands.some(
            (other) =>
              other.kind === "ATTACK" &&
              other.unitId !== actor.id &&
              other.targetUnitId === victim.id,
          )
        )
          strategic += FLANK_SETUP_VALUE_V7;
      }
    }
    if (abilities.includes("BOULDERS"))
      strategic +=
        BOULDER_FORTIFICATION_VALUE_V7 * preview.fortificationIgnored;
    if (abilities.includes("PROWL") && preview.defenderDies) {
      const role = unitRoleRuleV7(view, target).tacticalRole;
      if (role === "RANGED" || role === "SIEGE" || role === "SUPPORT")
        strategic += SABRETOOTH_BACKLINE_VALUE_V7;
      if (
        !view.units.some(
          (unit) =>
            unit.id !== target.id &&
            unit.ownerId === target.ownerId &&
            unit.form === "LAND" &&
            distance(unit.at, target.at) === 1,
        )
      )
        strategic += SABRETOOTH_ISOLATED_VALUE_V7;
    }
  }
  if (isHostile(view, target.ownerId)) {
    const witch = facts.hostileWitches.some((unit) => unit.id === target.id);
    if (
      witch &&
      preview.defenderDies &&
      next >= 1180 &&
      next < WITCH_KILL_PRIORITY_V7
    )
      next = WITCH_KILL_PRIORITY_V7;
    else if (
      witch &&
      !preview.defenderDies &&
      preview.damageToDefender > 0 &&
      next < WITCH_FOCUS_PRIORITY_V7 &&
      iceFolkWitchFocusV7(context, target)
    ) {
      next =
        preview.damageToAttacker === 0 && !preview.retaliation
          ? WITCH_FOCUS_RANGED_PRIORITY_V7
          : WITCH_FOCUS_PRIORITY_V7;
      strategic += 10;
    }
  }
  if (
    own &&
    !preview.attackerDies &&
    preview.damageToAttacker > 0 &&
    facts.hostileMelee.length > 0
  ) {
    const left = actor.hp - preview.damageToAttacker;
    const wounded = { ...actor, hp: left };
    if (
      shatterableNextTurnV7ForPolicy(view, facts, wounded) &&
      facts.hostileMelee.some((hostile) => {
        if (hostile.id === target.id && preview.defenderDies) return false;
        if (!iceFolkMeleeReachesV7(view, hostile, actor.at, context))
          return false;
        const hit = publicProjectedDamageWithLookupV7(
          view,
          hostile,
          wounded,
          actor.at,
          {},
          context.lookup,
        );
        return (
          hit < left &&
          left - hit <= shatterThresholdForPolicyV7(facts, hostile.ownerId)
        );
      })
    )
      strategic -= Math.floor(retainedUnitValue(view, actor) / 2);
  }
  return { priority: next, strategic };
}

function shatterableNextTurnV7ForPolicy(
  view: PlayerViewV7,
  facts: IceFolkFactsV7,
  unit: PublicUnitV7,
): boolean {
  return shatterableNextTurnV7(view, facts, unit, unit.at);
}

/** The best destination of an own Witch's Move (rule 2), or null to stay. */
function iceFolkWitchDestinationV7(
  context: PolicyContextV7,
  witch: PublicUnitV7,
): CoordV7 | null {
  const cache = iceFolkCacheV7(context);
  const cached = cache.witchDestination.get(witch.id);
  if (cached !== undefined) return cached;
  const view = context.view;
  const campaign = context.tactical.campaign;
  const keyAt = (at: CoordV7): readonly number[] =>
    witchMoveKeyV7(
      view,
      witch,
      at,
      visibleImmediateDamage(view, witch, at, context),
      same(at, witch.at)
        ? 0
        : (campaignRouteProgressV7(campaign, witch, at) ?? 0),
      (owner) => isHostile(view, owner),
    );
  let best: CoordV7 | null = null;
  let bestKey = keyAt(witch.at);
  for (const command of context.commands) {
    if (command.kind !== "MOVE" || command.unitId !== witch.id) continue;
    const to = command.path.at(-1);
    if (to === undefined || isAutoembarkMoveV7(context, command)) continue;
    if (campaignHoldsMoveV7(campaign, witch, to)) continue;
    const key = keyAt(to);
    if (
      compareKeysV7(key, bestKey) > 0 ||
      (best !== null &&
        compareKeysV7(key, bestKey) === 0 &&
        (to.y < best.y || (to.y === best.y && to.x < best.x)))
    ) {
      best = to;
      bestKey = key;
    }
  }
  cache.witchDestination.set(witch.id, best);
  return best;
}

/**
 * Ice Folk Move adjustments.
 *
 * Against the Ice Folk (any seat's own units): a sluggish unit with an
 * offered attack makes no routine Move (it attacks from where it stands);
 * without one it moves only when the Move ends outside the melee reach of
 * visible Ice Folk units, makes route progress with no visible hostile unit
 * within three tiles, or leaves a visible Witch's two tiles. A unit of
 * another faction makes no routine Move without route progress into a
 * visible Witch's Cold Snap reach next turn, and a fragile one (ranged,
 * siege, support, or below half HP) pays 3 for ending on hostile Snow.
 *
 * As the Ice Folk: the Witch takes only her best Move (rule 2) at 1296 and
 * otherwise stays; an unmoved Boulder Yeti with an offered attack makes no
 * routine Move (the planted throw); a Sabretooth never moves into visible
 * lethal reach unless it strikes from there or it is no worse; at equal
 * route progress a unit ends within 1 of an own Witch, then on Snow, and a
 * Yeti on a Mountain within Rockfall range of a visible hostile unit.
 */
function iceFolkMoveValueV7(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "MOVE" }>,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly objective: number;
  readonly objectiveScale: number;
} {
  const view = context.view;
  const cache = iceFolkCacheV7(context);
  const facts = cache.facts;
  let next = priority;
  let strategic = 0;
  let objective = 0;
  let objectiveScale = 1;
  const unchanged = { priority, strategic: 0, objective: 0, objectiveScale };
  if (actor.form !== "LAND" || actor.ownerId !== view.viewer.id)
    return unchanged;
  const routine = priority >= 0 && priority < ICE_ROUTINE_MOVE_PRIORITY_V7;
  const reject = { priority: -1, strategic: 0, objective: 0, objectiveScale };
  const iceUnit = isIceFolkUnitForPolicyV7(facts, actor);
  const progress = (): number =>
    campaignRouteProgressV7(context.tactical.campaign, actor, to) ?? 0;
  // Against the Ice Folk.
  if (
    routine &&
    (facts.hostileWitches.length > 0 || facts.hostileMelee.length > 0)
  ) {
    if (unitIsSluggishV7(view, actor)) {
      if (cache.attackers.has(actor.id)) return reject;
      const outside = !facts.hostileMelee.some((hostile) =>
        iceFolkMeleeReachesV7(view, hostile, to, context),
      );
      const quiet =
        progress() > 0 &&
        !context.lookup.visibleHostiles.some(
          (hostile) => hostile.form === "LAND" && distance(hostile.at, to) <= 3,
        );
      const leavesWitch =
        facts.hostileWitches.some(
          (witch) => distance(witch.at, actor.at) <= COLD_SNAP_RANGE_V7,
        ) &&
        !facts.hostileWitches.some(
          (witch) => distance(witch.at, to) <= COLD_SNAP_RANGE_V7,
        );
      if (!outside && !quiet && !leavesWitch) return reject;
    } else if (
      !iceUnit &&
      facts.hostileWitches.some(
        (witch) => distance(witch.at, to) <= WITCH_CHILL_REACH_V7,
      ) &&
      !facts.hostileWitches.some(
        (witch) => distance(witch.at, actor.at) <= WITCH_CHILL_REACH_V7,
      ) &&
      progress() <= 0
    )
      return reject;
    if (!iceUnit && fragileOnSnowV7(view, actor)) {
      const tile = findPublicTileV7(view, to);
      if (
        tile?.explored === true &&
        tile.snow === true &&
        (tile.blizzard === true ||
          (tile.territoryOwnerId !== null &&
            facts.iceOwners.has(tile.territoryOwnerId) &&
            isHostile(view, tile.territoryOwnerId)))
      )
        strategic -= FRAGILE_SNOW_COST_V7;
    }
  }
  // Against the Ice Folk: a unit that only a Shatter kills where it stands
  // steps out of that reach (above routine Moves and the half-HP Recover).
  if (
    priority < ICE_ROUTINE_MOVE_PRIORITY_V7 &&
    next >= 0 &&
    facts.hostileMelee.length > 0 &&
    shatterableNextTurnV7(view, facts, actor, actor.at)
  ) {
    const here = visibleImmediateDamage(view, actor, actor.at, context);
    if (
      here >= actor.hp &&
      visibleImmediateDamage(
        view,
        actor,
        actor.at,
        context,
        context.lookup,
        false,
      ) < actor.hp
    ) {
      const there = visibleImmediateDamage(view, actor, to, context);
      if (there < actor.hp) {
        next = Math.max(next, SHATTER_ESCAPE_PRIORITY_V7);
        strategic += actor.hp - there;
      }
    }
  }
  // The Mind Control revision (section 8): an own unit of the Ice Folk kind
  // (a controlled Witch still places her Blizzard and Cold Snaps).
  if (!iceUnit) return { priority: next, strategic, objective, objectiveScale };
  const abilities = unitRoleRuleV7(view, actor).abilities;
  // The Witch (rule 2).
  if (abilities.includes("COLD_SNAP")) {
    if (priority >= ICE_ROUTINE_MOVE_PRIORITY_V7)
      return { priority: next, strategic, objective, objectiveScale };
    const best = iceFolkWitchDestinationV7(context, actor);
    return best !== null && same(best, to)
      ? {
          priority: WITCH_MOVE_PRIORITY_V7,
          strategic,
          objective,
          objectiveScale,
        }
      : reject;
  }
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): an army seat's
  // Snow Hunter or Boulder Yeti that stands in the reach of a visible
  // hostile unit with Overrun steps out of it (`armyIceFolkChainReachV7`),
  // to a tile where the visible enemies deal it no more: with a shot from
  // there first. Below every kill, above a hit that does not kill.
  if (
    armyIceFolkSeatV7(context) &&
    next >= 0 &&
    priority <= ARMY_KNIGHT_SHY_MAXIMUM_V7 &&
    !same(actor.at, to) &&
    unitRoleRuleV7(view, actor).range >= 2 &&
    !context.lookup.citiesByKey.has(coordKey(actor.at)) &&
    armyIceFolkChainReachV7(context, actor.at) &&
    !armyIceFolkChainReachV7(context, to) &&
    visibleImmediateDamage(view, actor, to, context) <=
      visibleImmediateDamage(view, actor, actor.at, context)
  ) {
    next = Math.max(next, ARMY_STEP_BACK_PRIORITY_V7);
    strategic +=
      8 + (armyEngagementsForV7(context, actor).has(coordKey(to)) ? 6 : 0);
  }
  // pulp_wars-9s0.8: a Mammoth steps where its Sweep hits a flank.
  if (
    abilities.includes("SWEEP") &&
    !actor.activation.moved &&
    primaryReadyForPolicyV7(actor) &&
    unitMayActAfterMoveV7(view, actor)
  ) {
    const there = bestSweepFlankV7(context, to);
    if (
      there > 0 &&
      visibleImmediateDamage(view, actor, to, context) < actor.hp
    ) {
      strategic += MAMMOTH_FLANK_POSITION_VALUE_V7 * there;
      if (bestSweepFlankV7(context, actor.at) === 0)
        next = Math.max(next, MAMMOTH_FLANK_MOVE_PRIORITY_V7);
    }
  }
  // The planted throw.
  if (
    routine &&
    abilities.includes("BOULDERS") &&
    !actor.activation.moved &&
    cache.attackers.has(actor.id)
  )
    return reject;
  // The Sabretooth does not walk into lethal reach for nothing.
  if (abilities.includes("PROWL") && next >= 0 && next < 1290) {
    const there = visibleImmediateDamage(view, actor, to, context);
    if (
      there >= actor.hp &&
      there >= visibleImmediateDamage(view, actor, actor.at, context) &&
      !vampireStrikesFromV7(context, actor, to)
    )
      return reject;
  }
  // Route tie-breaks: the objective (route progress) is scaled by 8 and
  // the tie-breaks add less than one step, so they decide only at equal
  // progress (the objective is an integer).
  if (next >= 0 && command.path.length > 0) {
    objectiveScale = ICE_OBJECTIVE_SCALE_V7;
    if (
      facts.ownWitches.some(
        (witch) => witch.id !== actor.id && distance(witch.at, to) <= 1,
      )
    )
      objective += WITCH_ESCORT_OBJECTIVE_V7;
    const tile = findPublicTileV7(view, to);
    if (tile?.explored === true && tile.snow === true)
      objective += SNOW_OBJECTIVE_V7;
    if (
      abilities.includes("ROCKFALL") &&
      tile?.explored === true &&
      tile.terrain === "MOUNTAIN" &&
      context.lookup.visibleHostiles.some(
        (hostile) => hostile.form === "LAND" && distance(hostile.at, to) <= 2,
      )
    )
      objective += ROCKFALL_PEAK_OBJECTIVE_V7;
  }
  return { priority: next, strategic, objective, objectiveScale };
}

/**
 * `pulp_wars-9s0.8` Mammoth positioning. A Sweep hits the two tiles next to
 * the target on the ring around the Mammoth; the most hostile units a
 * Mammoth standing on `from` hits on the flanks of one adjacent hostile
 * land unit (0 without one). A Move to a tile with a flank hit gains
 * `MAMMOTH_FLANK_POSITION_VALUE_V7` per victim, and while no flank hit is on
 * offer from where it stands it goes at `MAMMOTH_FLANK_MOVE_PRIORITY_V7`
 * (above the chips, so it repositions before it attacks), never into
 * visible lethal reach.
 */
const MAMMOTH_FLANK_POSITION_VALUE_V7 = 4;
const MAMMOTH_FLANK_MOVE_PRIORITY_V7 = 905;
const SWEEP_RING_V7: readonly CoordV7[] = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
];

// --- The Dwarf revision (`pulp_wars-78i.4`) --------------------------------

interface DwarfContextCacheV7 {
  readonly facts: DwarfFactsV7;
  readonly army: DwarfArmyCountsV7;
  readonly tools: DwarfPolicyToolsV7;
  /** Each own Mole's planned Tunnel (Mole rules 1 to 5), or null. */
  tunnels: ReturnType<typeof planTunnelsV7> | null;
  /** Each own Gyrocopter's planned bombing run, or null. */
  bombs: ReturnType<typeof planBombRunsV7> | null;
  /** Each own Engineer's planned Assemble, or null. */
  assembles: ReturnType<typeof planAssemblesV7> | null;
}

const dwarfFactsByViewV7 = new WeakMap<PlayerViewV7, DwarfFactsV7>();

function dwarfFactsForViewV7(view: PlayerViewV7): DwarfFactsV7 {
  const cached = dwarfFactsByViewV7.get(view);
  if (cached !== undefined) return cached;
  const facts = dwarfFactsV7(view, (owner) => isHostile(view, owner));
  dwarfFactsByViewV7.set(view, facts);
  return facts;
}

/** The Dwarf seat's own rules (a Dwarf viewer, and the switch). */
function dwarfPlayV7(context: PolicyContextV7): boolean {
  return (
    context.dwarf &&
    context.view.viewer.faction === "DWARF" &&
    dwarfPolicyOptionsV7().dwarfPlay
  );
}

/**
 * The Mind Control revision (section 8): the Dwarf unit rules for one own
 * unit, by its kind (a controlled Steam Mole tunnels, a controlled
 * Gyrocopter bombs, a controlled Engineer repairs). Without a controlled
 * unit, the same as `dwarfPlayV7` for every own unit.
 */
function dwarfUnitPlayV7(
  context: PolicyContextV7,
  unit: PublicUnitV7 | undefined,
): boolean {
  return (
    unit !== undefined &&
    context.dwarf &&
    policyUnitFactionV7(context.view, unit) === "DWARF" &&
    dwarfPolicyOptionsV7().dwarfPlay
  );
}

/** Every seat's counterplay against Dwarf units (and the switch). */
function againstDwarvesV7(context: PolicyContextV7): boolean {
  return context.dwarf && dwarfPolicyOptionsV7().againstDwarves;
}

/**
 * The shared Dwarf estimates (Plated, Unflinching, Dig In, the mounds, the
 * bombs): on in a match with a Dwarf seat unless both rule groups are
 * switched off (the generic policy of `pulp_wars-78i.3`).
 */
function dwarfEstimatesV7(view: PlayerViewV7): boolean {
  const options = dwarfPolicyOptionsV7();
  return (
    (options.dwarfPlay || options.againstDwarves) && dwarfMatchForPolicyV7(view)
  );
}

/** The public `dwarf` stat block of a visible unit or mound. */
function publicDwarfStatsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  lookup?: PolicyLookupV7,
): PlayerViewV7["unitStats"][number]["dwarf"] {
  return (
    lookup?.unitStatsById.get(unit.id) ??
    view.unitStats.find((stats) => stats.unitId === unit.id)
  )?.dwarf;
}

/**
 * Section 15, "read the mounds" and "read the Gyrocopters": the danger to
 * `actor` on `at` from Dwarf units: each hostile Mole mound's eruption on a
 * ground unit next to it, each hostile mound's surfacing reach (its unit
 * comes up fresh: Move 1 and an attack, the tiles within 2), and one bomb
 * of a visible hostile Gyrocopter within 2 (once per unit, the largest).
 */
function dwarfDangerV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7,
): number {
  const facts = dwarfFactsForViewV7(view);
  let total = onTheGroundV7(view, actor) ? eruptionAtV7(facts, at) : 0;
  total += bombThreatAtV7(facts, at);
  for (const mound of facts.hostileMounds)
    if (distance(mound.unit.at, at) <= 2)
      total += publicProjectedDamageWithLookupV7(view, mound.unit, actor, at, {
        maximumCharge: true,
      });
  return total;
}

function dwarfCacheV7(context: PolicyContextV7): DwarfContextCacheV7 {
  if (context.dwarfCache !== null) return context.dwarfCache;
  const view = context.view;
  const facts = dwarfFactsForViewV7(view);
  const bestHits = new Map<string, number>();
  const cache: DwarfContextCacheV7 = {
    facts,
    army: dwarfArmyCountsV7(view),
    tunnels: null,
    bombs: null,
    assembles: null,
    tools: {
      view,
      facts,
      commands: context.commands,
      options: dwarfPolicyOptionsV7(),
      isHostile: (owner) => isHostile(view, owner),
      unit: (unitId) => context.lookup.unitsById.get(unitId),
      targetValue: (unit) =>
        targetStrategicValue(view, unit.id, context.lookup),
      danger: (unit, at) => visibleImmediateDamage(view, unit, at, context),
      assignment: (unitId) =>
        context.tactical.campaign?.assignmentByUnitId.get(unitId),
      holdsMove: (unit, to) =>
        campaignHoldsMoveV7(context.tactical.campaign, unit, to),
      bestOwnHit: (targetId, exceptUnitId) => {
        const key = `${targetId}:${exceptUnitId}`;
        const cached = bestHits.get(key);
        if (cached !== undefined) return cached;
        let best = 0;
        for (const command of context.commands)
          if (
            command.kind === "ATTACK" &&
            command.targetUnitId === targetId &&
            command.unitId !== exceptUnitId
          )
            best = Math.max(
              best,
              queryCombatPreviewV7(view, command.unitId, targetId)
                ?.damageToDefender ?? 0,
            );
        bestHits.set(key, best);
        return best;
      },
      previewBomb: (command) => previewBombRunV7(view, command),
    },
  };
  context.dwarfCache = cache;
  return cache;
}

/** The one Tunnel, bombing run, or Assemble the Dwarf plans chose. */
function dwarfPlannedCommandV7(
  context: PolicyContextV7,
  command: CommandV7,
): CommandV7 | null {
  const cache = dwarfCacheV7(context);
  if (command.kind === "TUNNEL") {
    cache.tunnels ??= planTunnelsV7(cache.tools);
    return cache.tunnels.get(command.unitId)?.command ?? null;
  }
  if (command.kind === "BOMB_RUN") {
    cache.bombs ??= planBombRunsV7(cache.tools);
    return cache.bombs.get(command.unitId)?.command ?? null;
  }
  if (command.kind === "ASSEMBLE") {
    cache.assembles ??= planAssemblesV7(cache.tools);
    return cache.assembles.get(command.unitId)?.command ?? null;
  }
  return null;
}

/**
 * The score of a planned Tunnel, bombing run, or Assemble (section 15).
 * Assemble is land production: the priority of training at war (or the
 * ordinary training tier), one above it when the Engineer's home city is
 * more than 4 tiles from the target; the savings plan holds it.
 */
function dwarfCommandScoreV7(
  context: PolicyContextV7,
  command: CommandV7,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly immediate: number;
} {
  const none = { priority: -1, strategic: 0, immediate: 0 };
  if (dwarfPlannedCommandV7(context, command) !== command) return none;
  const cache = dwarfCacheV7(context);
  let planned: PlannedDwarfCommandV7<CommandV7> | null | undefined;
  if (command.kind === "TUNNEL") planned = cache.tunnels?.get(command.unitId);
  else if (command.kind === "BOMB_RUN")
    planned = cache.bombs?.get(command.unitId);
  if (planned !== undefined && planned !== null)
    return {
      priority: planned.priority,
      strategic: planned.strategic,
      immediate: 0,
    };
  if (command.kind !== "ASSEMBLE") return none;
  const view = context.view;
  const assemble = cache.assembles?.get(command.unitId);
  const engineer = context.lookup.unitsById.get(command.unitId);
  if (assemble === undefined || assemble === null || engineer === undefined)
    return none;
  const cost = previewAssembleV7(view, command.unitId)?.cost ?? 0;
  if (savingsHoldsV7(context, command, cost)) return none;
  const home =
    engineer.homeCityId === null
      ? undefined
      : context.lookup.citiesById.get(engineer.homeCityId);
  const far =
    home !== undefined &&
    distance(home.at, assemble.target) > ASSEMBLE_FAR_HOME_V7;
  return {
    priority:
      (warTrainingFirstV7(context) ? WAR_TRAINING_PRIORITY_V7 : 1080) +
      (far ? 1 : 0),
    strategic: ASSEMBLE_VALUE_V7,
    immediate: -cost,
  };
}

/** The public facts of the Dwarf research plan. */
function dwarfResearchFactsV7(
  context: PolicyContextV7,
): Parameters<typeof dwarfResearchV7>[1] {
  const view = context.view;
  const cache = dwarfCacheV7(context);
  const centers = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => city.at);
  const near = (at: CoordV7): boolean =>
    centers.some((center) => distance(center, at) <= DIG_IN_THREAT_RADIUS_V7);
  return {
    ownedCities: centers.length,
    counts: cache.army,
    cityThreatened:
      context.lookup.visibleHostiles.some(
        (unit) => unit.form === "LAND" && near(unit.at),
      ) || cache.facts.hostileMounds.some((mound) => near(mound.unit.at)),
    wallsOrShields:
      view.players.some((player) => player.faction === "MARTIAN") ||
      view.cities.some(
        (city) => isHostile(view, city.ownerId) && cityHasWallsV7(city),
      ),
  };
}

/**
 * Dwarf attack scoring (section 15): a Gunner's chip goes after the bombs
 * and before the melee chips; a Steam Cannon prefers a shot whose
 * Knockback pushes a unit off a hostile center (8) or off Field Defense
 * (4), or next to own melee units (2 each, at most three).
 */
function dwarfAttackAdjustmentV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  if (actor.ownerId !== view.viewer.id || actor.form !== "LAND")
    return { priority, strategic: 0 };
  const abilities = unitRoleRuleV7(view, actor).abilities;
  let next = priority;
  let strategic = 0;
  if (abilities.includes("TWIN_SHOT") && next === 900)
    next += GUNNER_CHIP_OFFSET_V7;
  if (
    abilities.includes("KNOCKBACK") &&
    !preview.defenderDies &&
    preview.push === "WILL_PUSH"
  ) {
    const to = knockbackDestinationV7(actor.at, target.at);
    if (
      view.cities.some(
        (city) => same(city.at, target.at) && isHostile(view, city.ownerId),
      )
    )
      strategic += KNOCKBACK_CENTER_VALUE_V7;
    const tile = findPublicTileV7(view, target.at);
    if (tile?.explored === true && tile.fieldDefense)
      strategic += KNOCKBACK_FIELD_DEFENSE_VALUE_V7;
    const melee = view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.id !== actor.id &&
        distance(unit.at, to) === 1 &&
        meleeUnitV7(view, unit),
    ).length;
    strategic += KNOCKBACK_MELEE_VALUE_V7 * Math.min(3, melee);
  }
  return { priority: next, strategic };
}

/**
 * Dwarf Move scoring (section 15).
 *
 * Against the Dwarves (every seat): a ground unit never ends a routine Move
 * next to a hostile Mole mound whose eruption kills it (HP plus Shield at
 * most the eruption), a ranged or siege unit pays 3 for ending one in a
 * ring, and a unit the next eruption kills where it stands steps out of
 * every ring (935) to a tile outside visible lethal reach.
 *
 * As the Dwarves: an unmoved Gunner with an offered attack makes no routine
 * Move (it fires twice); a dug-in Hammerer or Mole with a visible hostile
 * land unit within 3 holds its tile; a Gyrocopter never ends a routine Move
 * on water or into visible lethal reach that is worse than where it is; an
 * Engineer ends its Moves next to wounded constructs and not next to
 * hostile melee units; a Hammerer ends a routine Move next to an own Mole
 * (rule 3's tie-break: a rider for the next tunnel).
 */
function dwarfMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  let next = priority;
  let strategic = 0;
  if (actor.form !== "LAND" || actor.ownerId !== view.viewer.id)
    return { priority, strategic };
  const routine = priority < DWARF_ROUTINE_MOVE_PRIORITY_V7;
  const facts = dwarfFactsForViewV7(view);
  if (
    againstDwarvesV7(context) &&
    facts.hostileMounds.length > 0 &&
    onTheGroundV7(view, actor)
  ) {
    const shield =
      view.shields.find((entry) => entry.unitId === actor.id)?.shield ?? 0;
    const there = eruptionAtV7(facts, to);
    const here = eruptionAtV7(facts, actor.at);
    if (there > 0 && routine) {
      if (actor.hp + shield <= there) return { priority: -1, strategic: 0 };
      const role = policyTacticalRoleV7(unitRoleRuleV7(view, actor));
      if (role === "RANGED" || role === "SIEGE")
        strategic -= RANGED_RING_COST_V7;
    }
    if (
      here > 0 &&
      there === 0 &&
      actor.hp + shield <= here &&
      visibleImmediateDamage(view, actor, to, context) <
        visibleImmediateDamage(view, actor, actor.at, context)
    ) {
      next = Math.max(next, ERUPTION_ESCAPE_PRIORITY_V7);
      strategic += retainedUnitValue(view, actor);
    }
  }
  if (!dwarfUnitPlayV7(context, actor)) return { priority: next, strategic };
  const abilities = unitRoleRuleV7(view, actor).abilities;
  if (routine) {
    if (
      abilities.includes("TWIN_SHOT") &&
      !actor.activation.moved &&
      context.commands.some(
        (command) => command.kind === "ATTACK" && command.unitId === actor.id,
      )
    )
      return { priority: -1, strategic: 0 };
    if (
      !same(to, actor.at) &&
      publicDwarfStatsV7(view, actor, context.lookup)?.dugIn === true &&
      context.lookup.visibleHostiles.some(
        (hostile) =>
          hostile.form === "LAND" &&
          distance(hostile.at, actor.at) <= DIG_IN_THREAT_RADIUS_V7,
      )
    )
      return { priority: -1, strategic: 0 };
    if (abilities.includes("BOMB_RUN")) {
      const tile = findPublicTileV7(view, to);
      if (tile?.explored === true && tile.biome === null)
        return { priority: -1, strategic: 0 };
      const there = visibleImmediateDamage(view, actor, to, context);
      const here = visibleImmediateDamage(view, actor, actor.at, context);
      if (there >= actor.hp && there > here)
        return { priority: -1, strategic: 0 };
    }
  }
  if (abilities.includes("ASSEMBLE"))
    strategic += engineerMoveValueV7(view, facts, actor, to, (owner) =>
      isHostile(view, owner),
    );
  if (
    routine &&
    abilities.includes("RIDES_TUNNEL") &&
    (campaignRouteProgressV7(context.tactical.campaign, actor, to) ?? 0) >= 0 &&
    view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.id !== actor.id &&
        unit.form === "LAND" &&
        distance(unit.at, to) === 1 &&
        unitRoleRuleV7(view, unit).abilities.includes("TUNNEL"),
    )
  )
    strategic += RIDER_STAGING_VALUE_V7;
  return { priority: next, strategic };
}

// --- The Candy revision (`pulp_wars-jdb.4`) --------------------------------

interface CandyContextCacheV7 {
  readonly tools: CandyPolicyToolsV7;
  /** Each own unit's Rush plan of this decision (null: do not Rush). */
  readonly rushPlans: Map<UnitId, RushPlanV7 | null>;
  /** Each own Rushed unit's planned Move of this decision. */
  readonly rushedMoves: Map<UnitId, ReturnType<typeof rushedMovePlanV7>>;
}

/**
 * The Mind Control revision (section 8): the Candy unit rules for one own
 * unit, by its kind (a controlled Candy unit Rushes for its controller).
 */
function candyUnitPlayV7(
  context: PolicyContextV7,
  unit: PublicUnitV7 | undefined,
): unit is PublicUnitV7 {
  return (
    unit !== undefined &&
    context.candy &&
    unit.ownerId === context.view.viewer.id &&
    policyUnitFactionV7(context.view, unit) === "CANDY"
  );
}

function candyCacheV7(context: PolicyContextV7): CandyContextCacheV7 {
  if (context.candyCache !== null) return context.candyCache;
  const view = context.view;
  const without = new Map<UnitId, PlayerViewV7>();
  const cache: CandyContextCacheV7 = {
    rushPlans: new Map(),
    rushedMoves: new Map(),
    tools: {
      view,
      commands: context.commands,
      hostiles: context.lookup.visibleHostiles,
      targetValue: (unit) =>
        targetStrategicValue(view, unit.id, context.lookup),
      danger: (unit, at) => visibleImmediateDamage(view, unit, at, context),
      dangerWithout: (unit, at, withoutUnitId) => {
        let projected = without.get(withoutUnitId);
        if (projected === undefined) {
          projected = projectPublicUnits(
            view,
            view.units.filter((other) => other.id !== withoutUnitId),
            [],
          );
          without.set(withoutUnitId, projected);
        }
        return visibleImmediateDamage(projected, unit, at, context);
      },
      threatens: (unitId) =>
        context.threats.some((item) => item.unitId === unitId),
      projectedDamage: (attacker, target, bonusAttack2) =>
        publicProjectedDamageWithLookupV7(
          view,
          attacker,
          target,
          target.at,
          { bonusAttack2 },
          context.lookup,
        ),
      moved: (unit, at, pathLength) =>
        projectPublicUnitForPolicyV7(view, unit.id, {
          at,
          activation: {
            ...unit.activation,
            moved: true,
            movedPathLength: pathLength,
          },
        }),
      freeCapacity: (unit) => freeCapacity(view, unit.homeCityId),
      threatenedEmptyCenter: (at) => movesOntoThreatenedCity(context, at),
      holdsThreatenedCenter: (unit) => {
        const city = cityAt(view, unit.at, context.lookup);
        return (
          city !== undefined &&
          city.ownerId === view.viewer.id &&
          threatenedCity(context, city.id)
        );
      },
      attackCandidate: (command) => isPolicyCandidate(context, command),
    },
  };
  context.candyCache = cache;
  return cache;
}

/** The Rush plan of an own Candy unit this decision (section 14), or null. */
function candyRushPlanV7(
  context: PolicyContextV7,
  unitId: UnitId,
): RushPlanV7 | null {
  if (!context.candy || !candyPolicyOptionsV7().rush) return null;
  const unit = context.lookup.unitsById.get(unitId);
  if (!candyUnitPlayV7(context, unit)) return null;
  const cache = candyCacheV7(context);
  const cached = cache.rushPlans.get(unitId);
  if (cached !== undefined) return cached;
  const plan = planSugarRushV7(cache.tools, unit);
  cache.rushPlans.set(unitId, plan);
  return plan;
}

/** The public facts of the Candy research plan. */
function candyResearchFactsV7(
  context: PolicyContextV7,
): Parameters<typeof candyResearchV7>[1] {
  const view = context.view;
  const centers = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => city.at);
  const seated = (unit: PublicUnitV7): boolean =>
    context.curiosities?.monsterById.has(unit.id) !== true;
  return {
    ownedCities: centers.length,
    hostileInSight: context.lookup.visibleHostiles.some(seated),
    cityThreatened: context.lookup.visibleHostiles.some(
      (unit) =>
        unit.form === "LAND" &&
        seated(unit) &&
        centers.some(
          (center) =>
            distance(center, unit.at) <= HOME_SWEET_HOME_THREAT_RADIUS_V7,
        ),
    ),
    walledCityVisible: view.cities.some(
      (city) => isHostile(view, city.ownerId) && cityHasWallsV7(city),
    ),
  };
}

/**
 * Candy attack scoring (section 14). As the Candy: a Pie Launcher's chip
 * that Splats a target the own melee units can attack goes before the
 * chips of its tier and is worth the retaliation it saves ("Pie first").
 * Against the Candy: a Crashed target wins a tie, and a melee attack that
 * will be bounced loses a step.
 */
function candyAttackAdjustmentV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
  priority: number,
): { readonly priority: number; readonly strategic: number } {
  const view = context.view;
  const options = candyPolicyOptionsV7();
  let next = priority;
  let strategic = 0;
  if (
    options.readCrash &&
    crashedForPolicyV7(view, target.id) &&
    isHostile(view, target.ownerId)
  )
    strategic += CRASHED_TARGET_VALUE_V7;
  if (options.respectBounce && preview.bounce === "WILL_BOUNCE")
    strategic -= BOUNCE_COST_V7;
  if (
    options.pieFirst &&
    candyUnitPlayV7(context, actor) &&
    preview.splatApplied &&
    !preview.defenderDies
  ) {
    const saved = splatSavedHpV7(candyCacheV7(context).tools, actor, target);
    if (saved > 0) {
      next += PIE_FIRST_OFFSET_V7;
      strategic += saved;
    }
  }
  return { priority: next, strategic };
}

/**
 * Candy Move scoring (section 14). As the Candy: the Move of a Rushed
 * unit's kill plan; a Crashed unit steps out of reach; a Confectioner walks
 * next to Crumbs it can Re-bake. Against the Candy: a routine Move that is
 * no step back ends on hostile Crumbs when they are worth eating.
 */
function candyMoveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7,
  priority: number,
  objective: number,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly objective: number;
} {
  const view = context.view;
  const options = candyPolicyOptionsV7();
  let next = priority;
  let strategic = 0;
  if (actor.form !== "LAND" || actor.ownerId !== view.viewer.id)
    return { priority, strategic, objective: 0 };
  const routine = priority >= 0 && priority < CANDY_ROUTINE_MOVE_PRIORITY_V7;
  const eats =
    options.eatCrumbs &&
    routine &&
    objective >= 0 &&
    eatsCrumbsWorthV7(view, actor, to, (unit, at) =>
      visibleImmediateDamage(view, unit, at, context),
    );
  const bonus = eats ? CRUMBS_EAT_OBJECTIVE_V7 : 0;
  if (!candyUnitPlayV7(context, actor))
    return { priority: next, strategic, objective: bonus };
  const cache = candyCacheV7(context);
  if (options.rush && view.sugarRush.length > 0) {
    let plan = cache.rushedMoves.get(actor.id);
    if (plan === undefined) {
      plan = rushedMovePlanV7(cache.tools, actor);
      cache.rushedMoves.set(actor.id, plan);
    }
    if (plan !== null && same(plan.to, to)) {
      next = Math.max(next, plan.priority);
      strategic += plan.strategic;
    }
  }
  if (options.crashRetreat && crashedForPolicyV7(view, actor.id)) {
    const crashed = crashedMoveValueV7(cache.tools, actor, to, next);
    next = crashed.priority;
    strategic += crashed.strategic;
  }
  if (options.rebake && next < CANDY_ROUTINE_MOVE_PRIORITY_V7) {
    const approach = rebakeApproachValueV7(cache.tools, actor, to);
    if (approach !== null) {
      next = Math.max(next, approach.priority);
      strategic += approach.strategic;
    }
  }
  return { priority: next, strategic, objective: bonus };
}

function bestSweepFlankV7(context: PolicyContextV7, from: CoordV7): number {
  const hostiles = context.lookup.visibleHostiles;
  const hostileAt = (at: CoordV7): boolean =>
    hostiles.some((unit) => same(unit.at, at));
  let best = 0;
  SWEEP_RING_V7.forEach((offset, index) => {
    const target = { x: from.x + offset.x, y: from.y + offset.y };
    if (!hostiles.some((unit) => unit.form === "LAND" && same(unit.at, target)))
      return;
    let hits = 0;
    for (const side of [index + 1, index + 7]) {
      const flank = SWEEP_RING_V7[side % 8];
      if (
        flank !== undefined &&
        hostileAt({ x: from.x + flank.x, y: from.y + flank.y })
      )
        hits += 1;
    }
    best = Math.max(best, hits);
  });
  return best;
}

function captureEndsMatchV7(
  view: PlayerViewV7,
  targetOwnerId: PlayerId,
): boolean {
  const target = view.leaderboard.find(
    (entry) => entry.playerId === targetOwnerId,
  );
  if (target?.status !== "ACTIVE" || target.cityCount !== 1) return false;
  if (targetOwnerId === view.humanPlayerId) return true;
  const survivors = view.leaderboard.filter(
    (entry) => entry.status === "ACTIVE" && entry.playerId !== targetOwnerId,
  );
  return (
    survivors.length === 1 && survivors[0]?.playerId === view.humanPlayerId
  );
}

function* scoreCommandSteps(
  context: PolicyContextV7,
  command: CommandV7,
  readyTuple: readonly number[],
): Generator<void, AiScoreV7> {
  const actor = unitForCommand(context.view, command, context.lookup);
  const knightOverrun =
    command.kind === "ATTACK" &&
    actor?.role === "KNIGHT" &&
    actor.form === "LAND" &&
    actor.activation.attacksUsed === 0
      ? yield* bestKnightOverrunSequenceSteps(context, context.view, command)
      : command.kind === "MOVE" &&
          actor?.role === "KNIGHT" &&
          actor.form === "LAND" &&
          actor.activation.attacksUsed === 0
        ? yield* bestKnightOverrunMoveSequenceSteps(
            context,
            context.view,
            command,
          )
        : undefined;
  return scoreCommandWithContext(context, command, readyTuple, knightOverrun);
}

interface KnightOverrunSequenceValue {
  readonly immediate: number;
  readonly strategic: number;
  readonly safety: number;
  readonly spacing: number;
}

type AttackCommandV7 = Extract<CommandV7, { kind: "ATTACK" }>;
type MoveCommandV7 = Extract<CommandV7, { kind: "MOVE" }>;
type DisbandCommandV7 = { readonly kind: "DISBAND"; readonly unitId: UnitId };

/** Bounded two-attack public lookahead with projected Overrun advances. */
function bestKnightOverrunSequence(
  context: PolicyContextV7,
  view: PlayerViewV7,
  first: AttackCommandV7,
): KnightOverrunSequenceValue {
  return drain(bestKnightOverrunSequenceSteps(context, view, first));
}

function* bestKnightOverrunMoveSequenceSteps(
  context: PolicyContextV7,
  view: PlayerViewV7,
  move: MoveCommandV7,
): Generator<void, KnightOverrunSequenceValue | undefined> {
  const actor = view.units.find((unit) => unit.id === move.unitId);
  const at = move.path.at(-1);
  if (actor === undefined || at === undefined) return undefined;
  const moved = projectPublicUnitForPolicyV7(view, actor.id, {
    at,
    activation: {
      ...actor.activation,
      moved: true,
      movedPathLength: move.path.length,
    },
  });
  const attacks = yield* publicKnightOverrunAttacksSteps(moved, actor.id);
  let best: KnightOverrunSequenceValue | undefined;
  // pulp_wars-vkq.21: a Vampire moves to attack only where the attack kills
  // or leaves it alive through the visible enemies' next turn.
  const vampire = context.undead && isVampireV7(view, actor);
  for (const attack of attacks) {
    if (vampire && !vampireAttackAcceptableV7(context, moved, attack)) continue;
    const candidate = yield* bestKnightOverrunSequenceSteps(
      context,
      moved,
      attack,
    );
    if (
      best === undefined ||
      compareNumericTuple(
        knightOverrunValueTuple(candidate),
        knightOverrunValueTuple(best),
      ) > 0
    )
      best = candidate;
  }
  return best;
}

function* bestKnightOverrunSequenceSteps(
  context: PolicyContextV7,
  view: PlayerViewV7,
  first: AttackCommandV7,
): Generator<void, KnightOverrunSequenceValue> {
  const actor = view.units.find((item) => item.id === first.unitId);
  const target = view.units.find((item) => item.id === first.targetUnitId);
  yield;
  const preview = queryCombatPreviewV7(view, first.unitId, first.targetUnitId);
  if (actor === undefined || target === undefined || preview === null)
    return { immediate: -10_000, strategic: 0, safety: -10_000, spacing: 0 };
  const afterFirst = projectKnightOverrunAttack(view, actor, target, preview);
  const base: KnightOverrunSequenceValue = {
    immediate: combatImmediateValue(preview, view),
    strategic: combatTargetStrategicValue(view, target, preview),
    ...knightOverrunLeafValue(afterFirst, actor.id, context),
  };
  if (preview.attackerDies || preview.attacksRemaining === 0) return base;
  const secondAttacks = yield* publicKnightOverrunAttacksSteps(
    afterFirst,
    actor.id,
  );
  let best = base;
  for (const second of secondAttacks) {
    yield;
    const secondActor = afterFirst.units.find((unit) => unit.id === actor.id);
    const secondTarget = afterFirst.units.find(
      (unit) => unit.id === second.targetUnitId,
    );
    const secondPreview = queryCombatPreviewV7(
      afterFirst,
      second.unitId,
      second.targetUnitId,
    );
    if (
      secondActor === undefined ||
      secondTarget === undefined ||
      secondPreview === null
    )
      continue;
    const afterSecond = projectKnightOverrunAttack(
      afterFirst,
      secondActor,
      secondTarget,
      secondPreview,
    );
    const candidate: KnightOverrunSequenceValue = {
      immediate: base.immediate + combatImmediateValue(secondPreview, view),
      strategic:
        base.strategic +
        combatTargetStrategicValue(afterFirst, secondTarget, secondPreview),
      ...knightOverrunLeafValue(afterSecond, actor.id, context),
    };
    if (
      compareNumericTuple(
        knightOverrunValueTuple(candidate),
        knightOverrunValueTuple(best),
      ) > 0
    )
      best = candidate;
  }
  return best;
}

function* publicKnightOverrunAttacksSteps(
  view: PlayerViewV7,
  unitId: UnitId,
): Generator<void, readonly AttackCommandV7[]> {
  const result: AttackCommandV7[] = [];
  for (const target of view.units) {
    if (!isHostile(view, target.ownerId)) continue;
    yield;
    const command: AttackCommandV7 = {
      kind: "ATTACK",
      unitId,
      targetUnitId: target.id,
    };
    if (queryCombatPreviewV7(view, unitId, target.id) !== null)
      result.push(command);
  }
  return result;
}

function knightOverrunValueTuple(
  value: KnightOverrunSequenceValue,
): readonly number[] {
  return [value.strategic, value.immediate, value.safety, value.spacing];
}

function knightOverrunLeafValue(
  view: PlayerViewV7,
  unitId: UnitId,
  threatContext: PolicyContextV7,
): Pick<KnightOverrunSequenceValue, "safety" | "spacing"> {
  const actor = view.units.find((unit) => unit.id === unitId);
  if (actor === undefined) return { safety: -10_000, spacing: 0 };
  const hostiles = view.units.filter((unit) => isHostile(view, unit.ownerId));
  return {
    safety: -visibleImmediateDamage(view, actor, actor.at, threatContext),
    spacing:
      hostiles.length === 0
        ? Math.max(view.board.width, view.board.height)
        : Math.min(...hostiles.map((unit) => distance(actor.at, unit.at))),
  };
}

function projectKnightOverrunAttack(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): PlayerViewV7 {
  const nextAttacks = preview.attacksUsed;
  const units = view.units.flatMap((unit): readonly PublicUnitV7[] => {
    if (unit.id === target.id)
      return preview.defenderDies
        ? []
        : [{ ...unit, hp: unit.hp - preview.damageToDefender }];
    if (unit.id !== actor.id) return [unit];
    if (preview.attackerDies) return [];
    return [
      {
        ...unit,
        at: preview.advances ? target.at : unit.at,
        hp: unit.hp - preview.damageToAttacker,
        activation: {
          ...unit.activation,
          attacked: true,
          attacksUsed: nextAttacks,
          inspired: false,
          overrunActive: preview.overrunContinues,
          handled: !preview.overrunContinues,
        },
      },
    ];
  });
  return projectPublicUnits(view, units, [actor.id, target.id]);
}

function combatImmediateValue(
  preview: CombatPreviewV7,
  view?: PlayerViewV7,
): number {
  return (
    20 * Number(preview.defenderDies) -
    16 * Number(preview.attackerDies) +
    10 * preview.damageToDefender -
    8 * preview.damageToAttacker +
    // Revision 17: a Goblin bomb also splashes own and allied units, which
    // costs rather than scores (Battleship and Lich splash is hostile-only).
    preview.splash.reduce(
      (value, splash) =>
        friendlySplashUnitV7(view, splash.unitId) === undefined
          ? value + 10 * splash.damage + 20 * Number(splash.dies)
          : value - 12 * splash.damage - 24 * Number(splash.dies),
      0,
    ) +
    // Revision 13 Lifesteal (always 0 outside Undead matches): a heal offsets
    // damage taken; an enemy Vampire's retaliation heal offsets damage dealt.
    8 * preview.attackerHeal -
    10 * preview.defenderHeal
  );
}

function combatTargetStrategicValue(
  view: PlayerViewV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): number {
  const retained = targetStrategicValue(view, target.id);
  return preview.defenderDies
    ? retained
    : Math.floor((retained * preview.damageToDefender) / target.hp);
}

function combatStrategicValue(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): number {
  const attacker = context.lookup.unitsById.get(command.unitId);
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (attacker === undefined || target === undefined) return 0;
  let value = targetStrategicValue(context.view, target.id, context.lookup);
  // Tuning 5 (`pulp_wars-w49.4`): an army seat values a hit that does not
  // kill by the share of the target's HP it takes, so its chips go to the
  // unit they bring closest to dying.
  if (context.army && !preview.defenderDies && target.hp > 0) {
    const plain = Math.min(
      value,
      (unitRoleRuleV7(context.view, target).cost ?? 0) * 4 + target.hp,
    );
    value =
      value -
      plain +
      Math.floor((plain * preview.damageToDefender) / target.hp);
  }
  for (const splash of preview.splash) {
    const splashTarget = context.lookup.unitsById.get(splash.unitId);
    if (splashTarget === undefined) continue;
    // Revision 17: friendly bomb splash is a loss, not a gain.
    if (!isHostile(context.view, splashTarget.ownerId)) {
      value -= friendlyLossValueV7(
        context.view,
        splashTarget,
        splash.damage,
        splash.dies,
      );
      continue;
    }
    const retained = targetStrategicValue(
      context.view,
      splash.unitId,
      context.lookup,
    );
    value += splash.dies
      ? retained
      : Math.floor((retained * splash.damage) / splashTarget.hp);
  }
  if (
    preview.push === "WILL_PUSH" &&
    cityAt(context.view, target.at, context.lookup)?.ownerId ===
      context.view.viewer.id
  )
    value += 10;
  // Revision 20: the volley bonus is for siege units, not the Triceratops.
  if (
    attacker.role === "CATAPULT" &&
    policySiegeRuleV7(unitRoleRuleV7(context.view, attacker))
  ) {
    const medicHealing = context.view.units.some(
      (item) =>
        item.ownerId === target.ownerId &&
        item.role === "CAPTAIN" &&
        // The Ice Folk revision: the Witch has no Tend Wounded.
        !hasAbilityForIceV7(context.view, item, "COLD_SNAP") &&
        distance(item.at, target.at) === 1,
    )
      ? 4
      : 0;
    const tile = findPublicTileV7(context.view, target.at);
    const idleRecovery = context.undead
      ? publicIdleRecoveryV7(context.view, target.ownerId, target.at)
      : tile?.explored === true && tile.territoryOwnerId === target.ownerId
        ? 4
        : 2;
    const shots = context.view.units.flatMap((item) => {
      if (item.ownerId !== context.view.viewer.id || item.role !== "CATAPULT")
        return [];
      const shot = queryCombatPreviewV7(context.view, item.id, target.id);
      return shot === null ? [] : [shot];
    });
    const coordinatedDamage = sum(shots.map((shot) => shot.damageToDefender));
    if (coordinatedDamage >= target.hp + medicHealing + idleRecovery)
      value += 20;
    value += shots.length * 3;
  }
  return value;
}

function researchValue(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): {
  readonly priority: number;
  readonly strategic: number;
  readonly cost: number;
} {
  const tree = queryTechnologyTreeV7(context.view);
  const node = tree.nodes.find((item) => item.id === tech);
  if (node === undefined) return { priority: -1, strategic: 0, cost: 0 };
  const potentials = queryPublicEconomicPotentialsV7(context.view);
  const economicPlans = potentials
    .filter((item) => item.targets > 0)
    .map((item) => {
      const chain = shortestResearchChainForCommand(context.view, item.command);
      return {
        first: chain[0],
        benefit: item.targets + item.bestSpatialScore,
        totalCost: totalResearchCost(context.view, chain),
      };
    })
    .filter((plan) => plan.first !== undefined)
    .sort(
      (left, right) =>
        right.benefit * left.totalCost - left.benefit * right.totalCost ||
        left.totalCost - right.totalCost ||
        TECHNOLOGY_IDS_V7.indexOf(left.first as TechnologyIdV7) -
          TECHNOLOGY_IDS_V7.indexOf(right.first as TechnologyIdV7),
    );
  const bestEconomic = economicPlans[0];
  if (bestEconomic?.first === tech)
    return {
      priority: 1160,
      strategic: bestEconomic.benefit - bestEconomic.totalCost,
      cost: node.cost,
    };
  // Revision 13: an Undead seat never researches toward a Banshee while no
  // hostile seat is living (Wail cannot target Undead units).
  const uselessBanshee =
    context.view.viewer.faction === "UNDEAD" &&
    !hasLivingHostileSeatV7(context.view, (owner) =>
      isHostile(context.view, owner),
    );
  const missingRoles = UNIT_ROLE_IDS_V7.filter(
    (role) =>
      role !== "JUGGERNAUT" &&
      !(uselessBanshee && role === "MARKSMAN") &&
      // Tuning 5 (`pulp_wars-w49.4`): a role only the Human tree unlocks
      // is no research goal of another faction.
      !(
        HUMAN_ONLY_ROLES_V7.includes(role) &&
        !factionUnlocksRoleV7(context.view.viewer.faction, role)
      ) &&
      !context.view.units.some(
        (unit) => unit.ownerId === context.view.viewer.id && unit.role === role,
      ),
  );
  const rolePlans = missingRoles
    .map((role) => {
      const chain = shortestResearchChainForRole(context.view, role);
      return {
        role,
        first: chain[0],
        totalCost:
          totalResearchCost(context.view, chain) +
          (effectiveRoleRuleV7(role, context.view.viewer.faction).cost ?? 0),
        value:
          effectiveRoleRuleV7(role, context.view.viewer.faction).maxHp +
          effectiveRoleRuleV7(role, context.view.viewer.faction).attack2 +
          effectiveRoleRuleV7(role, context.view.viewer.faction).defense2,
      };
    })
    .filter((plan) => plan.first !== undefined)
    .sort(
      (left, right) =>
        right.value * left.totalCost - left.value * right.totalCost ||
        left.totalCost - right.totalCost ||
        UNIT_ROLE_IDS_V7.indexOf(left.role) -
          UNIT_ROLE_IDS_V7.indexOf(right.role),
    );
  // Revision 20: Nesting's city slot and Wallbreaker (Dinosaur seat only).
  const branch = dinosaurBranchResearchV7(context, tech);
  if (
    rolePlans[0]?.first === tech &&
    context.view.cities.some(
      (city) =>
        city.ownerId === context.view.viewer.id &&
        freeCapacity(context.view, city.id) > 0,
    ) &&
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56): Nesting is also
    // the Ankylosaurus's technology now, so it can be the next role
    // technology; its own value, where higher (a crowded city), stands.
    !(branch !== null && branch.priority > 1060)
  )
    return {
      priority: 1060,
      strategic: rolePlans[0].value - rolePlans[0].totalCost,
      cost: node.cost,
    };
  const fortification =
    tech === "ENGINEERING"
      ? (context.view.leaderboard.find((item) => item.isViewer)?.cityCount ?? 0)
      : 0;
  if (branch !== null) return { ...branch, cost: node.cost };
  return { priority: 1040, strategic: fortification, cost: node.cost };
}

/**
 * Revision 20 Dinosaur Industry branch: Nesting is worth a unit slot in
 * every owned city (and its Egg effects), and is researched ahead of the
 * next role technology while an own city has no room for a two-slot Egg;
 * Wallbreaker is worth each visible hostile city with Walls, while the seat
 * owns a dinosaur to use it (one whose attack does not already ignore
 * Walls through Charge! or Acid). Null for every other seat and technology.
 */
function ignoresWallsBenefitsV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): boolean {
  const abilities = unitRoleRuleV7(view, unit).abilities;
  return (
    unit.form === "LAND" &&
    abilities.includes("GROW") &&
    !abilities.includes("LINEBREAKER") &&
    !abilities.includes("ACID")
  );
}

function dinosaurBranchResearchV7(
  context: PolicyContextV7,
  tech: TechnologyIdV7,
): { readonly priority: number; readonly strategic: number } | null {
  const view = context.view;
  if (view.viewer.faction !== "DINOSAUR") return null;
  if (tech === technologyWithUnlockV7(view, "NESTING")) {
    const cities = view.cities.filter(
      (city) => city.ownerId === view.viewer.id,
    );
    const crowded = cities.some((city) => freeCapacity(view, city.id) < 2);
    return {
      priority: crowded ? NESTING_RESEARCH_PRIORITY_V7 : 1040,
      strategic: NESTING_SLOT_VALUE_V7 * cities.length + NESTING_EGG_VALUE_V7,
    };
  }
  if (tech === technologyWithUnlockV7(view, "WALLBREAKER")) {
    const walled = view.cities.filter(
      (city) => isHostile(view, city.ownerId) && cityHasWallsV7(city),
    ).length;
    const dinosaurs = view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id && ignoresWallsBenefitsV7(view, unit),
    );
    // The Dinosaur pass (`pulp_wars-w49.15`): and the second tile of the
    // run-up of every own Triceratops, Walls or no Walls.
    const chargers = view.units.filter(
      (unit) => unit.ownerId === view.viewer.id && linebreakerV7(view, unit),
    ).length;
    const strategic =
      (dinosaurs ? WALLBREAKER_WALLED_CITY_VALUE_V7 * walled : 0) +
      WALLBREAKER_CHARGER_VALUE_V7 * chargers;
    if (strategic === 0) return null;
    return { priority: WALLBREAKER_RESEARCH_PRIORITY_V7, strategic };
  }
  return null;
}

function totalResearchCost(
  view: PlayerViewV7,
  chain: readonly TechnologyIdV7[],
): number {
  const tree = queryTechnologyTreeV7(view);
  return sum(
    chain.map((tech) => tree.nodes.find((node) => node.id === tech)?.cost ?? 0),
  );
}

function shortestResearchChainForCommand(
  view: PlayerViewV7,
  command: string,
): readonly TechnologyIdV7[] {
  const target = factionTreeV7(view.viewer.faction).nodes.find((node) =>
    node.unlocks.some(
      (unlock) => unlock.kind === "COMMAND" && unlock.command === command,
    ),
  );
  return target === undefined ? [] : researchChain(view, target.id);
}

function shortestResearchChainForRole(
  view: PlayerViewV7,
  role: UnitRoleIdV7,
): readonly TechnologyIdV7[] {
  const tech = effectiveRoleRuleV7(role, view.viewer.faction).technology;
  return tech === null ? [] : researchChain(view, tech);
}

function researchChain(
  view: PlayerViewV7,
  target: TechnologyIdV7,
): readonly TechnologyIdV7[] {
  const owned = new Set(view.viewer.researchedTechs);
  const result: TechnologyIdV7[] = [];
  const visit = (tech: TechnologyIdV7): void => {
    if (owned.has(tech) || result.includes(tech)) return;
    const node = factionTreeV7(view.viewer.faction).nodes.find(
      (item) => item.id === tech,
    );
    for (const prerequisite of node?.prerequisites ?? []) visit(prerequisite);
    result.push(tech);
  };
  visit(target);
  return result;
}

function reservedPortCommandV7(
  context: PolicyContextV7,
): { readonly kind: "BUILD_PORT"; readonly at: CoordV7 } | null {
  return (
    context.commands
      .filter(
        (
          command,
        ): command is CommandV7 & {
          readonly kind: "BUILD_PORT";
          readonly at: CoordV7;
        } => command.kind === "BUILD_PORT",
      )
      .slice()
      .sort((left, right) => {
        const leftDistance =
          context.naval.prospectiveWaterDistanceByKey.get(coordKey(left.at)) ??
          Number.MAX_SAFE_INTEGER;
        const rightDistance =
          context.naval.prospectiveWaterDistanceByKey.get(coordKey(right.at)) ??
          Number.MAX_SAFE_INTEGER;
        const cityId = (at: CoordV7): number => {
          const tile = context.view.board.tiles.find(
            (candidate) => candidate.explored && same(candidate.at, at),
          );
          return tile?.explored === true
            ? (tile.territoryCityId ?? Number.MAX_SAFE_INTEGER)
            : Number.MAX_SAFE_INTEGER;
        };
        return (
          leftDistance - rightDistance ||
          cityId(left.at) - cityId(right.at) ||
          left.at.y - right.at.y ||
          left.at.x - right.at.x
        );
      })[0] ?? null
  );
}

function nextNavalTechnologyV7(
  context: PolicyContextV7,
): TechnologyIdV7 | null {
  if (!context.naval.active) return null;
  if (!context.view.viewer.researchedTechs.includes("SHORECRAFT"))
    return "SHORECRAFT";
  if (
    context.naval.deepWaterRequired &&
    !context.view.viewer.researchedTechs.includes("NAVIGATION")
  )
    return "NAVIGATION";
  const defendedLanding =
    context.naval.target !== null &&
    context.view.units.some(
      (unit) =>
        isHostile(context.view, unit.ownerId) &&
        unit.form === "LAND" &&
        distance(unit.at, context.naval.target as CoordV7) <= 2,
    );
  if (
    defendedLanding &&
    !context.view.viewer.researchedTechs.includes("NAVAL_ENGINEERING")
  )
    return context.view.viewer.researchedTechs.includes("NAVIGATION")
      ? "NAVAL_ENGINEERING"
      : "NAVIGATION";
  return null;
}

function preferredReward(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }>,
): (typeof REWARD_IDS_V7)[number] {
  const offered = context.commands
    .filter(
      (item): item is Extract<CommandV7, { kind: "CHOOSE_CITY_REWARD" }> =>
        item.kind === "CHOOSE_CITY_REWARD" &&
        item.cityId === command.cityId &&
        item.reachedLevel === command.reachedLevel,
    )
    .map((item) => item.reward);
  // The Dinosaur pass (`pulp_wars-w49.15`): a Dinosaur army seat takes
  // Scouts, whatever its Coins: the free Raptor is a 4-Coin unit that
  // moves two tiles and takes villages, and needs no technology. (With
  // Stockpile in round 1 the seat of the first diagnostic match took three
  // villages with Cavemen by round 11 and no more.)
  // Step two of the Martian pass (`pulp_wars-w49.25`): and a Martian army
  // seat. The free Saucer is a 4-Coin unit that sets a Grunt down beside a
  // village three tiles away in the turn it is trained: a hand-played
  // Martian seat with three of them owned five cities in round 8 and seven
  // in round 11. (The seat took Stockpile in round 1 with 1 Coin in hand
  // and held four cities from round 6 to round 12.)
  if (
    command.reachedLevel === 2 &&
    context.army &&
    (context.view.viewer.faction === "DINOSAUR" ||
      context.view.viewer.faction === "MARTIAN" ||
      // Step two of the Ice Folk pass (`pulp_wars-w49.27`): and an Ice Folk
      // army seat. The free Sled is a 3-Coin unit that moves two tiles,
      // takes villages, and throws the Bolas before the seat owns Scouting.
      context.view.viewer.faction === "ICE_FOLK") &&
    offered.includes("SURVEY")
  )
    return "SURVEY";
  // Step two of the Dwarf pass (`pulp_wars-w49.28`): a Dwarf army seat
  // takes the 4 Coins: its Survey reveals the area and grants no unit (a
  // Gyrocopter takes no village), and 4 Coins are two Hammerers.
  if (
    command.reachedLevel === 2 &&
    armyDwarfSeatV7(context) &&
    offered.includes("STOCKPILE")
  )
    return "STOCKPILE";
  // Step two of the Undead pass (`pulp_wars-w49.24`): an Undead seat short
  // of units takes the free Ghoul (`armyUndeadShortOfUnitsV7`): it moves two
  // tiles and takes the next village. (A seat with four cities and three
  // Skeletons took Stockpile three times in rounds 5 to 7.)
  if (
    command.reachedLevel === 2 &&
    offered.includes("SURVEY") &&
    armyUndeadShortOfUnitsV7(context)
  )
    return "SURVEY";
  if (command.reachedLevel === 2)
    return offered.includes(
      context.view.viewer.coins < 4 ? "STOCKPILE" : "SURVEY",
    )
      ? context.view.viewer.coins < 4
        ? "STOCKPILE"
        : "SURVEY"
      : (offered[0] ?? command.reward);
  // Step two of the Undead pass: an Undead seat short of units takes the
  // Militia of a city that is not threatened.
  if (
    command.reachedLevel === 3 &&
    offered.includes("MILITIA") &&
    !threatenedCity(context, command.cityId) &&
    armyUndeadShortOfUnitsV7(context)
  )
    return "MILITIA";
  if (command.reachedLevel === 3)
    return offered.includes("MILITIA") &&
      threatenedCity(context, command.cityId) &&
      // The Undead pass, correction: a threatened Undead city takes its
      // Walls (a Zombie behind Walls holds; a 5-HP militia Skeleton does
      // not).
      !(armyUndeadSeatV7(context) && offered.includes("WALLS"))
      ? "MILITIA"
      : offered.includes("WALLS")
        ? "WALLS"
        : (offered[0] ?? command.reward);
  if (command.reachedLevel === 4) {
    const city = context.lookup.citiesById.get(command.cityId);
    const neutral =
      city === undefined
        ? 0
        : context.view.board.tiles.filter(
            (tile) =>
              tile.explored &&
              tile.territoryOwnerId === null &&
              distance(tile.at, city.at) <= 2,
          ).length;
    // Tuning 6 (`pulp_wars-w49.6`): an army seat takes population (toward
    // the next level and its unit slot) before the 6 Coins.
    return !context.army && offered.includes("TREASURY_6") && neutral >= 4
      ? "TREASURY_6"
      : offered.includes("BOOM")
        ? "BOOM"
        : (offered[0] ?? command.reward);
  }
  const cityCount =
    context.view.leaderboard.find((item) => item.isViewer)?.cityCount ?? 0;
  const juggernauts = context.view.units.filter(
    (unit) =>
      unit.ownerId === context.view.viewer.id && unit.role === "JUGGERNAUT",
  ).length;
  // The economy rejig (`pulp_wars-w49.16`, 7r54): every city offers its
  // giant once, from level 6, and the seat takes it when it is offered
  // (while it has fewer giants than cities). Before, the giant was the
  // first capital's and was taken by a threatened city or a seat with 12
  // Coins; a seat that passed it over at level 6 is offered it again only
  // at level 7, which few cities reach.
  return offered.includes("JUGGERNAUT") && juggernauts < cityCount
    ? "JUGGERNAUT"
    : // Tuning 4 (`pulp_wars-w49.3`): a Barracks (+1 unit in the city) before
      // the 6-Coin Treasury.
      offered.includes("BARRACKS")
      ? "BARRACKS"
      : offered.includes("TREASURY")
        ? "TREASURY"
        : (offered[0] ?? command.reward);
}

function trainingStrategicValue(
  context: PolicyContextV7,
  command: LandProductionCommandV7,
): number {
  let value = effectiveRoleRuleV7(
    command.role,
    context.view.viewer.faction,
  ).maxHp;
  if (command.role === "GUARD" && threatenedCity(context, command.cityId))
    value += 20;
  if (
    command.role === "CATAPULT" &&
    policySiegeRuleV7(
      effectiveRoleRuleV7(command.role, context.view.viewer.faction),
    ) &&
    hasDurableScreen(context, command.cityId)
  )
    value += 12;
  return value;
}

function movementObjectiveValue(
  view: PlayerViewV7,
  from: CoordV7,
  to: CoordV7 | null,
): number {
  if (to === null) return 0;
  const objectives = [
    ...view.treasureChests,
    ...view.board.tiles
      .filter(
        (tile) =>
          tile.explored &&
          tile.site === "VILLAGE" &&
          tile.territoryOwnerId === null,
      )
      .map((tile) => tile.at),
    ...view.cities
      .filter((city) => isHostile(view, city.ownerId))
      .map((city) => city.at),
  ];
  if (objectives.length === 0) {
    const unknown = view.board.tiles
      .filter((tile) => !tile.explored)
      .map((tile) => tile.at);
    return nearestDistance(from, unknown) - nearestDistance(to, unknown);
  }
  return nearestDistance(from, objectives) - nearestDistance(to, objectives);
}

function tacticalMovementObjectiveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7 | null,
): number {
  if (to === null) return 0;
  const assigned = context.tactical.objectiveByUnitId.get(actor.id);
  if (assigned === undefined)
    return movementObjectiveValue(context.view, actor.at, to);
  // pulp_wars-9s0.1: a campaign job is approached by land route, so a unit
  // walks around a lake or a mountain instead of stopping in front of it.
  let value =
    campaignRouteProgressV7(context.tactical.campaign, actor, to) ??
    distance(actor.at, assigned) - distance(to, assigned);
  const role = policyTacticalRoleV7(unitRoleRuleV7(context.view, actor));
  if (role === "SIEGE") {
    const range = distance(to, assigned);
    if (range >= 2 && range <= 3 && hasReachableScreenAtV7(context, actor, to))
      value += 8;
    if (range < 2) value -= 12;
  } else if (role === "DEFENDER") {
    if (
      context.view.cities.some(
        (city) =>
          city.ownerId === context.view.viewer.id &&
          threatenedCity(context, city.id) &&
          same(city.at, to),
      )
    )
      value += 12;
  } else if (["SKIRMISHER", "BREAKTHROUGH"].includes(role)) {
    const approaches = neighbors8V7(context.view, assigned);
    if (approaches.some((at) => same(at, to))) value += 5;
  }
  return value;
}

function windmillStagingGainV7(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  to: CoordV7 | null,
): number {
  if (to === null || actor.hp >= actor.maxHp) return 0;
  const ownedWindmills = view.board.tiles.filter(
    (tile) =>
      tile.explored &&
      tile.improvement === "WINDMILL" &&
      tile.territoryOwnerId === view.viewer.id,
  );
  const before = ownedWindmills.some(
    (tile) => distance(tile.at, actor.at) === 1,
  );
  const after = ownedWindmills.some((tile) => distance(tile.at, to) === 1);
  return after && !before ? Math.min(6, actor.maxHp - actor.hp) * 4 : 0;
}

function navalMovementObjectiveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7 | null,
  pathLength: number,
): number {
  if (to === null) return 0;
  const view = context.view;
  if (actor.form === "EMBARKED") {
    const progress = routeProgress(
      context.naval.waterDistanceByKey,
      actor.at,
      to,
    );
    // Revision 16: landing spends one of the two embarked movement points, so
    // an approach that still leaves a landing this turn is worth one more
    // step than a longer approach to the same coast.
    const landsThisTurn =
      progress > 0 &&
      pathLength <= EMBARKED_LANDING_MAX_SPENT_V7 &&
      context.naval.landing.some((at) => distance(at, to) === 1);
    return progress + Number(landsThisTurn);
  }
  if (actor.form === "NAVAL") {
    return routeProgress(context.naval.fleetDistanceByKey, actor.at, to);
  }
  if (!unitRoleRuleV7(context.view, actor).abilities.includes("CAPTURE"))
    return 0;
  // pulp_wars-9s0.1: nor does it walk to a Port.
  if (context.tactical.campaign?.assignmentByUnitId.has(actor.id) === true)
    return 0;
  const ports = view.naval.ownedPorts
    .filter((port) => port.status === "ACTIVE")
    .map((port) => port.at);
  return ports.length === 0
    ? 0
    : nearestDistance(actor.at, ports) - nearestDistance(to, ports);
}

function routeProgress(
  distances: ReadonlyMap<string, number>,
  from: CoordV7,
  to: CoordV7,
): number {
  const before = distances.get(coordKey(from));
  const after = distances.get(coordKey(to));
  return before === undefined || after === undefined ? 0 : before - after;
}

function publicRevealGain(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7 | null,
  lookup?: PolicyLookupV7,
): number {
  if (at === null) return 0;
  const destinationTile = findPublicTileV7(view, at);
  const radius =
    actor.form === "EMBARKED"
      ? 1
      : actor.form === "NAVAL"
        ? unitRoleRuleV7(view, actor).sightRadius
        : Math.max(
            unitRoleRuleV7(view, actor).sightRadius,
            technologyCapabilitiesV7(
              view.viewer.researchedTechs,
              view.viewer.faction,
            ).roleSightRadius[actor.role] ?? 0,
          ) +
          Number(
            view.viewer.researchedTechs.includes("ENGINEERING") &&
              destinationTile?.explored === true &&
              destinationTile.terrain === "MOUNTAIN",
          );
  const cacheKey = `${radius}:${coordKey(at)}`;
  const cached = lookup?.revealGainByRadiusAndKey.get(cacheKey);
  if (cached !== undefined) return cached;
  const result = view.board.tiles.filter(
    (tile) =>
      !tile.explored &&
      !("diplomaticBlock" in tile) &&
      distance(tile.at, at) <= radius,
  ).length;
  lookup?.revealGainByRadiusAndKey.set(cacheKey, result);
  return result;
}

function scoutPicketValue(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7 | null,
): number {
  if (actor.role !== "RAIDER" || at === null) return 0;
  const valuable = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .sort(
      (left, right) =>
        attributableCityIncome(view, right) -
        attributableCityIncome(view, left),
    )[0];
  return valuable !== undefined && distance(at, valuable.at) <= 2
    ? attributableCityIncome(view, valuable)
    : 0;
}

function screenValue(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7 | null,
): number {
  // Revision 20: a Triceratops (a line unit) screens and needs no screen.
  // The Ice Folk revision: neither is the Boulder Yeti.
  const screened = (unit: PublicUnitV7): boolean =>
    (unit.role === "CATAPULT" &&
      !linebreakerV7(view, unit) &&
      !hasAbilityForIceV7(view, unit, "BOULDERS")) ||
    unit.role === "MARKSMAN";
  if (at === null || screened(actor)) return 0;
  if (
    actor.hp * 2 < actor.maxHp ||
    actor.form !== "LAND" ||
    unitRoleRuleV7(view, actor).defense2 < 4
  )
    return 0;
  return (
    view.units.filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        screened(unit) &&
        distance(unit.at, at) === 1,
    ).length * 5
  );
}

function visibleImmediateDamage(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7,
  context?: PolicyContextV7,
  lookup: PolicyLookupV7 | undefined = context?.lookup,
  countShatter = true,
): number {
  // Tuning 7 (`pulp_wars-w49.10`): the danger of a unit of the view on a
  // tile is asked several times in one decision (the Move rules of every
  // layer, the safety value); it is computed once. Only for the unit as
  // the view has it: a projected or altered unit is computed as before.
  if (
    context === undefined ||
    context.view !== view ||
    lookup !== context.lookup ||
    !countShatter ||
    context.lookup.unitsById.get(actor.id) !== actor
  )
    return computeVisibleImmediateDamage(
      view,
      actor,
      at,
      context,
      lookup,
      countShatter,
    );
  const key = `${actor.id}:${at.x},${at.y}`;
  const cached = context.dangerByUnitAndTile.get(key);
  if (cached !== undefined) return cached;
  const danger = computeVisibleImmediateDamage(
    view,
    actor,
    at,
    context,
    lookup,
    countShatter,
  );
  context.dangerByUnitAndTile.set(key, danger);
  return danger;
}

function computeVisibleImmediateDamage(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7,
  context: PolicyContextV7 | undefined,
  lookup: PolicyLookupV7 | undefined,
  countShatter: boolean,
): number {
  let total = 0;
  const effectiveLookup =
    context === undefined || context.view === view ? lookup : undefined;
  const hostiles =
    effectiveLookup?.visibleHostiles ??
    view.units.filter((unit) => isHostile(view, unit.ownerId));
  // Revision 13 (Undead matches only): Wail, Lich splash, and Infect.
  const undead = context?.undead ?? undeadMatchForPolicyV7(view);
  // Revision 17 (Goblin matches only): bomb splash and Gang Up. Landing ends
  // the activation (`pulp_wars-0ao.15`), so an embarked goblin-crewed unit
  // has no same-turn Kaboom and is modelled like any embarked unit.
  const goblin = context?.goblin ?? goblinMatchForPolicyV7(view);
  // The Martian revision (`pulp_wars-t6s.3`): rays at the power they fire
  // with next turn, and the Shield the actor has during the enemy turn.
  const martian =
    (context?.martian ?? martianMatchForPolicyV7(view))
      ? martianFactsForViewV7(view)
      : null;
  // Map curiosities (`pulp_wars-737.4`, section 11, "Threat"): a visible
  // Monster is a threat exactly to a unit on its provoke tiles, or one
  // listed in its `provokedBy` inside its reach, in both AI modes; it is
  // left out of the ordinary reach estimate below. Null in a view with no
  // curiosity and no Monster.
  // The Candy revision (`pulp_wars-jdb.4`): the Crash of hostile Candy
  // units (a match with a Candy seat, and the switch).
  const readCrash =
    candyPolicyOptionsV7().readCrash &&
    (context?.candy ?? candyMatchForPolicyV7(view)) &&
    view.sugarRush.length > 0;
  const curiosities = curiosityFactsV7(view);
  if (curiosities !== null)
    for (const monster of monstersThreateningV7(curiosities, actor.id, at))
      total += publicProjectedDamageWithLookupV7(
        view,
        monster.unit,
        actor,
        at,
        {},
        effectiveLookup,
      );
  for (const hostile of hostiles) {
    if (curiosities?.monsterById.has(hostile.id) === true) continue;
    const facts = publicCombatFacts(view, hostile, effectiveLookup);
    const wail =
      undead &&
      hostile.form === "LAND" &&
      isBansheeV7(view, hostile) &&
      isLivingOwnerV7(view, actor.ownerId);
    if (!wail && (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0))
      continue;
    // The Candy revision (`pulp_wars-jdb.4`, section 14, "read the Crash"):
    // a Crashed unit does not attack on its next turn (the list is empty
    // in a match without a Candy seat).
    if (readCrash && crashedForPolicyV7(view, hostile.id)) continue;
    const d = distance(hostile.at, at);
    const minimumRange = wail ? 1 : facts.minimumRange;
    const maximumRange = wail ? WAIL_THREAT_RADIUS_V7 : facts.maximumRange;
    const directlyThreatened = d >= minimumRange && d <= maximumRange;
    const reachableThreat =
      context?.threatenedTiles.get(hostile.id)?.has(coordKey(at)) ?? false;
    // Revision 20: a hostile Triceratops that reaches `at` by a Move charges
    // with its run-up (`min(2, path length)`, at least the tiles between).
    const runUp2 = directlyThreatened
      ? 0
      : chargeRunUpForPolicyV7(view, hostile, d - 1);
    if (!directlyThreatened && !reachableThreat) {
      // pulp_wars-vkq.21: Battleship splash counts like Lich splash (Liches
      // died one after another to it on naval maps); revision 17 adds the
      // Bomb Chucker's bomb.
      if ((undead || goblin) && isSplashAttackerV7(view, hostile))
        total += publicSplashDangerV7(
          view,
          hostile,
          actor,
          at,
          facts,
          effectiveLookup,
        );
      continue;
    }
    const attackDamage = publicProjectedDamageWithLookupV7(
      view,
      hostile,
      actor,
      at,
      {
        maximumCharge: !directlyThreatened,
        // Revision 17: a hostile Goblin attacker gains Gang Up from its
        // owner's units around the actor's tile.
        ...(goblin && hostile.form === "LAND"
          ? {
              bonusAttack2:
                2 * gangUpForPolicyV7(view, hostile, at, new Set([actor.id])),
            }
          : {}),
        // Revision 20: the Charge! run-up (+1 Attack per tile moved).
        ...(runUp2 > 0 ? { bonusAttack2: runUp2 } : {}),
        // The Martian revision: full power only when it need not move and
        // is not Cooling.
        ...(martian === null
          ? {}
          : rayAttack2OptionV7(view, martian, hostile, !directlyThreatened)),
      },
      effectiveLookup,
    );
    // Revision 17: a goblin-crewed land unit's Kaboom reach (included in its
    // threatened tiles) deals its fixed Kaboom damage, whatever the Defense.
    const kaboomDamage =
      hostile.form === "LAND"
        ? (unitRoleMechanicsV7(view, hostile).kaboomDamage ?? 0)
        : 0;
    const damage =
      kaboomDamage > attackDamage
        ? Math.min(kaboomDamage, actor.hp)
        : attackDamage;
    total += damage;
    // A lethal Zombie hit converts the victim into a hostile Zombie.
    if (
      undead &&
      !wail &&
      actor.form === "LAND" &&
      damage >= actor.hp &&
      isZombieV7(view, hostile)
    )
      total += actor.hp;
  }
  // The Dwarf revision (`pulp_wars-78i.4`, section 15, "read the mounds"
  // and "read the Gyrocopters"): the eruption of every hostile Mole mound
  // next to a ground unit, the surfacing reach of every hostile mound (the
  // Mole and the rider come up fresh: Move 1 and an attack), and one bomb
  // of a visible hostile Gyrocopter within 2 (once per unit); an Egg's nest
  // tile too, so Eggs are not laid in an eruption ring. Mounds and the
  // `dwarf` stats exist only in a match with a Dwarf seat.
  if ((actor.form === "LAND" || actor.form === "EGG") && dwarfEstimatesV7(view))
    total += dwarfDangerV7(view, actor, at);
  // The Martian revision: the Shield absorbs the first hits of the enemy
  // turn (0 for every unit without one).
  if (martian !== null && total > 0)
    total = Math.max(0, total - enemyTurnShieldV7(view, martian, actor, at));
  // The Ice Folk revision (`pulp_wars-7g3.4`, section 12, "count Shatter in
  // every lethal-reach estimate"): a unit left at a visible Ice Folk melee
  // unit's Shatter threshold or below, which can be Chilled then, is in
  // lethal reach of that unit.
  if (
    total > 0 &&
    total < actor.hp &&
    countShatter &&
    (context?.iceFolk ?? iceFolkMatchForPolicyV7(view))
  ) {
    const ice = iceFolkFactsForViewV7(view);
    if (
      shatterLethalV7(view, ice, actor, at, total, (hostile) =>
        iceFolkMeleeReachesV7(view, hostile, at, context),
      )
    )
      total = actor.hp;
  }
  return total;
}

/**
 * The Ice Folk revision: whether a visible hostile unit can strike `at`
 * from an adjacent tile next turn (where it stands, or by its public
 * reach for a unit whose range is 1).
 */
function iceFolkMeleeReachesV7(
  view: PlayerViewV7,
  hostile: PublicUnitV7,
  at: CoordV7,
  context?: PolicyContextV7,
): boolean {
  const range = distance(hostile.at, at);
  if (range === 1) return true;
  if (unitRoleRuleV7(view, hostile).range > 1) return false;
  return context?.threatenedTiles.get(hostile.id)?.has(coordKey(at)) ?? false;
}

function rayAttack2OptionV7(
  view: PlayerViewV7,
  facts: MartianFactsV7,
  hostile: PublicUnitV7,
  mustMove: boolean,
): { readonly rayAttack2?: number } {
  const attack2 = hostileRayAttack2V7(view, facts, hostile, mustMove);
  return attack2 === null ? {} : { rayAttack2: attack2 };
}

/**
 * Revision 13 splash threat (a Lich, and since `pulp_wars-vkq.21` a
 * Battleship): hitting a visible friendly unit next to `at` from where the
 * splash unit stands splashes `max(1, ceil(damage / 2))` onto the actor.
 */
function publicSplashDangerV7(
  view: PlayerViewV7,
  hostile: PublicUnitV7,
  actor: PublicUnitV7,
  at: CoordV7,
  facts: PublicCombatFactsV7,
  lookup?: PolicyLookupV7,
): number {
  const primary = view.units.some(
    (unit) =>
      unit.id !== actor.id &&
      unit.ownerId === actor.ownerId &&
      distance(unit.at, at) === 1 &&
      distance(unit.at, hostile.at) >= facts.minimumRange &&
      distance(unit.at, hostile.at) <= facts.maximumRange,
  );
  if (!primary) return 0;
  const damage = publicProjectedDamageWithLookupV7(
    view,
    hostile,
    actor,
    at,
    {},
    lookup,
  );
  return Math.min(actor.hp, Math.max(1, Math.ceil(damage / 2)));
}

export function publicProjectedDamageForPolicyV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  defender: PublicUnitV7,
  defenderAt: CoordV7,
  options: {
    readonly maximumCharge?: boolean;
    /** Extra `attack2` (the text harness: a Charge! run-up after a Move). */
    readonly bonusAttack2?: number;
  } = {},
): number {
  return publicProjectedDamageWithLookupV7(
    view,
    attacker,
    defender,
    defenderAt,
    options,
  );
}

/**
 * Step two of the Martian pass (`pulp_wars-w49.25`,
 * docs/product/RULESET_7_TUNING_MARTIAN.md section 14): the `attack2` of
 * the viewer's own ray unit projected from a tile it does not stand on. A
 * heat ray after a Move is at half power, and the projection read the
 * unit's published Attack, which is the full power of a ray unit that has
 * not moved: a Tripod two tiles from a firing tile was told its shot deals
 * a Fighter 12 where it deals 5, and walked out in front of its line for
 * "kills" that were not (three Tripods in one turn of the lab, dealing 2,
 * 4, and 5; four of the seat's five were dead a turn later). Undefined for
 * every other attacker, for a unit projected from its own tile, and for
 * one that has moved or is Cooling (its published Attack is the half
 * already). Psychic Command's +1 Attack is kept.
 */
function movedRayAttack2V7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  published2: number,
  lookup?: PolicyLookupV7,
): number | undefined {
  if (attacker.ownerId !== view.viewer.id || !isRayUnitV7(view, attacker))
    return undefined;
  const real =
    lookup?.unitsById.get(attacker.id) ??
    view.units.find((unit) => unit.id === attacker.id);
  if (
    real === undefined ||
    real.activation.moved ||
    (real.at.x === attacker.at.x && real.at.y === attacker.at.y)
  )
    return undefined;
  const full2 = unitRoleRuleV7(view, attacker).attack2;
  if (published2 < full2) return undefined;
  return Math.floor(full2 / 2) + (published2 - full2);
}

/**
 * Step two of the Dinosaur pass (`pulp_wars-w49.26`,
 * docs/product/RULESET_7_TUNING_DINOSAUR.md section 14): the Charge! run-up
 * of the viewer's own Triceratops projected from a tile it has not reached
 * yet. The projection read the unit's published Attack, which has no run-up
 * before the Move, so a combined kill counted a Triceratops that walks up
 * and charges at 8 on a Fighter where it deals 12 (the twin of
 * `movedRayAttack2V7`, the other way round). The tiles are the distance to
 * the tile, as many as count for the viewer (`chargeRunUpForPolicyV7`: one,
 * or two with Wallbreaker). 0 for every other attacker, for a unit projected
 * from its own tile, and for one that has moved or attacked (its published
 * Attack has the run-up already, or it has none).
 */
function movedRunUpAttack2V7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  lookup?: PolicyLookupV7,
): number {
  if (attacker.ownerId !== view.viewer.id || !linebreakerV7(view, attacker))
    return 0;
  const real =
    lookup?.unitsById.get(attacker.id) ??
    view.units.find((unit) => unit.id === attacker.id);
  if (
    real === undefined ||
    real.activation.moved ||
    real.activation.attacksUsed > 0
  )
    return 0;
  return chargeRunUpForPolicyV7(view, attacker, distance(real.at, attacker.at));
}

function publicProjectedDamageWithLookupV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  defender: PublicUnitV7,
  defenderAt: CoordV7,
  options: {
    readonly maximumCharge?: boolean;
    /** Revision 17 Gang Up estimate (Goblin matches only). */
    readonly bonusAttack2?: number;
    /**
     * Step two of the Dinosaur pass: the target is taken as Cracked (an own
     * Stegosaurus strikes it earlier in the same combined kill).
     */
    readonly cracked?: boolean;
    /**
     * The Martian revision: a heat ray's `attack2` at the power it fires
     * with (full or half), instead of the published Attack.
     */
    readonly rayAttack2?: number;
    /** The Martian revision: the whole hit, not capped at the HP. */
    readonly uncapped?: boolean;
    /**
     * Step two of the Ice Folk pass: the target is taken as Chilled (an own
     * Sled's Bolas is thrown at it earlier in the same combined kill).
     */
    readonly chilled?: boolean;
  },
  lookup?: PolicyLookupV7,
): number {
  // Step two of the Ice Folk pass (`pulp_wars-w49.27`): what an own Ice
  // Folk unit's blow has that its published Attack does not (neutral for
  // every other attacker).
  const ice = iceFolkBlowV7(
    view,
    attacker,
    defender,
    defenderAt,
    options.chilled === true,
    lookup,
  );
  const attackRule = unitRoleRuleV7(view, attacker);
  const defenseRule = unitRoleRuleV7(view, defender);
  const attackFacts = publicCombatFacts(view, attacker, lookup);
  const publishedAttack2 =
    options.rayAttack2 ??
    movedRayAttack2V7(view, attacker, attackFacts.attack2, lookup) ??
    ice.rockfall2 ??
    attackFacts.attack2 + ice.bonus2;
  // Revision 19: an Alpha's +1 Attack is part of its published Attack; the
  // Pounce estimate adds it to the role's base (0 for every other unit).
  const attack2 =
    (options.maximumCharge &&
    attacker.form === "LAND" &&
    attackFacts.abilities.includes("CHARGE")
      ? Math.max(
          publishedAttack2,
          attackRule.attack2 + 2 + unitAlphaAttack2V7(view, attacker),
        )
      : publishedAttack2) +
    (options.bonusAttack2 ?? 0) +
    // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the run-up of an
    // own Triceratops projected from a tile it has not reached (0 for every
    // other unit).
    movedRunUpAttack2V7(view, attacker, lookup) +
    // The Dinosaur pass, correction (`pulp_wars-w49.15`): a Caveman's Pack
    // Hunt (0 for every other unit).
    packHuntForPolicyV7(view, attacker, defender, defenderAt);
  if (!Number.isInteger(attack2)) return 0;
  // Revision 19 Acid: a Spitter's attack ignores the defender's cover and
  // fortification (only a Dinosaur unit has Acid).
  const acid =
    attacker.form === "LAND" && attackFacts.abilities.includes("ACID");
  const defenderTile = findPublicTileV7(view, defenderAt);
  // The Ice Folk revision (`pulp_wars-7g3.4`; `pulp_wars-1wy.3`): Snow cover
  // (x 1.25, yielding to the x 1.5 of a Forest or Mountain) for an Ice Folk
  // land unit with no fortification of its own; only Snow tiles carry the
  // flag.
  const snowCover =
    !acid &&
    defender.form === "LAND" &&
    !terrainGivesCoverV7(
      defenderTile?.explored === true ? defenderTile.terrain : null,
      policyForestCoverV7(view, defender, defenderAt),
    ) &&
    defenderTile?.explored === true &&
    defenderTile.snow === true &&
    // The Mind Control revision: a body rule, by the defender's kind.
    policyUnitFactionV7(view, defender) === "ICE_FOLK" &&
    !(
      defenderTile.territoryOwnerId === defender.ownerId &&
      (defenderTile.fortificationLevel ?? 0) > 0
    );
  const bonus = acid
    ? { numerator: 1, denominator: 1 }
    : snowCover
      ? SNOW_COVER_V7
      : projectedDefenseBonus(view, defender, defenderAt);
  const ownTerritoryFortification =
    !acid &&
    defender.form === "LAND" &&
    // The Martian revision: walkers and flyers are never fortified.
    unitTakesCoverV7(view, defender) &&
    defenderTile?.explored === true &&
    defenderTile.territoryOwnerId === defender.ownerId;
  // The Dwarf revision (`pulp_wars-78i.4`): a dug-in Hammerer or Mole that
  // stays where it stands keeps its Field Defense level (the public
  // `dwarf.dugIn`; never with Field Defense on its own territory, and
  // never after a planned Move). Only units of a Dwarf seat have the stat.
  const dugIn =
    !acid &&
    defender.form === "LAND" &&
    same(defenderAt, defender.at) &&
    dwarfEstimatesV7(view) &&
    publicDwarfStatsV7(view, defender, lookup)?.dugIn === true;
  const dugInLevel =
    dugIn && !(ownTerritoryFortification && defenderTile?.fieldDefense === true)
      ? 1
      : 0;
  const tileFortification =
    (ownTerritoryFortification ? (defenderTile?.fortificationLevel ?? 0) : 0) +
    dugInLevel;
  // Revision 20: a Charge! ignores every fortification level, and a
  // dinosaur with Wallbreaker the City Walls levels (the tile level is
  // Walls plus Field Defense). Only a Dinosaur unit has either.
  const fortificationLevel =
    tileFortification === 0
      ? 0
      : attacker.form === "LAND" &&
          attackFacts.abilities.includes("LINEBREAKER")
        ? 0
        : ignoresWallsForPolicyV7(view, attacker)
          ? Math.min(
              tileFortification,
              (defenderTile?.explored === true && defenderTile.fieldDefense) ||
                dugInLevel > 0
                ? 1
                : 0,
            )
          : tileFortification;
  // Step two of the Dinosaur pass (`pulp_wars-w49.26`): a Cracked unit (a
  // Stegosaurus's shot this turn, public in `ninthUnit.crackedThisTurn`; or
  // one an own Stegosaurus strikes earlier in the same combined kill,
  // `options.cracked`) has 1 Defense less, never below 0.5, under its
  // fortification. The projection read the role's Defense, so every blow
  // planned after the shot was counted against an uncracked target. The
  // list is empty in a match without a Dinosaur seat.
  const cracked =
    options.cracked === true || unitIsCrackedV7(view, defender.id);
  // Tuning 5: the Human Guard is open to ranged attacks.
  const roleDefense2 = roleDefense2AtDistanceV7(
    defenseRule,
    unitRoleMechanicsV7(view, defender),
    // A unit that reaches only one tile strikes from there wherever it
    // stands now (a threat estimate); a ranged unit from where it stands,
    // or from its range.
    attackFacts.maximumRange <= 1
      ? 1
      : distance(attacker.at, defenderAt) === 1 && attackFacts.minimumRange <= 1
        ? 1
        : 2,
  );
  // Revision 19: an Egg defends with a fixed 1, like an embarked unit.
  const defense2 =
    defender.form === "EMBARKED"
      ? 2
      : defender.form === "EGG"
        ? EGG_DEFENSE2_V7
        : (cracked ? crackedDefense2V7(roleDefense2) : roleDefense2) +
          fortificationLevel * 2;
  // The Dwarf revision (`pulp_wars-78i.4`): a construct attacks with its
  // maximum HP (Unflinching; on attack only).
  const unflinching =
    attacker.form === "LAND" &&
    dwarfEstimatesV7(view) &&
    publicDwarfStatsV7(view, attacker, lookup)?.construct === true;
  const attackForceNumerator =
    BigInt(attack2) * BigInt(unflinching ? attacker.maxHp : attacker.hp);
  const attackForceDenominator = 2n * BigInt(attacker.maxHp);
  const defenseForceNumerator =
    BigInt(defense2) * BigInt(defender.hp) * BigInt(bonus.numerator);
  const defenseForceDenominator =
    2n * BigInt(defender.maxHp) * BigInt(bonus.denominator);
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const denominator = (attackOnCommon + defenseOnCommon) * 4n;
  if (denominator <= 0n) return 0;
  const formula = Number(
    (2n * attackOnCommon * BigInt(attack2) * 9n + denominator) /
      (2n * denominator),
  );
  // The Ice Folk revision: a shot from two or more tiles on an Ice Folk
  // land unit in the Blizzard of a visible Witch of its own seat is halved
  // (only Blizzard tiles carry the flag).
  const halved =
    defenderTile?.explored === true &&
    defenderTile.blizzard === true &&
    distance(attacker.at, defenderAt) >= 2 &&
    blizzardProtectsV7(view, iceFolkFactsForViewV7(view).visibleWitches, {
      ...defender,
      at: defenderAt,
    })
      ? blizzardHalvedDamageV7(formula)
      : formula;
  // Revision 19 Armoured: one less damage (minimum 1) to an Ankylosaurus,
  // before the cap at its HP; unchanged for every other unit. The Dwarf
  // revision: no single hit takes more than the Plated cap from a Tank.
  const armoured = armouredDamageV7(view, defender, halved);
  const plated =
    defender.form === "LAND" && dwarfEstimatesV7(view)
      ? (publicDwarfStatsV7(view, defender, lookup)?.plated ?? null)
      : null;
  const dealt = Math.min(
    options.uncapped === true ? Number.MAX_SAFE_INTEGER : defender.hp,
    plated === null ? armoured : Math.min(plated, armoured),
  );
  // Step two of the Ice Folk pass: a blow from the next tile that leaves a
  // Chilled unit at the Shatter threshold or below kills it.
  return ice.shatter > 0 &&
    options.uncapped !== true &&
    dealt < defender.hp &&
    defender.hp - dealt <= ice.shatter
    ? defender.hp
    : dealt;
}

/** What `iceFolkBlowV7` returns for every blow that is not an own Ice Folk unit's. */
const NO_ICE_FOLK_BLOW_V7: {
  readonly bonus2: number;
  readonly rockfall2: number | null;
  readonly shatter: number;
} = Object.freeze({ bonus2: 0, rockfall2: null, shatter: 0 });

/**
 * Step two of the Ice Folk pass (`pulp_wars-w49.27`,
 * docs/product/RULESET_7_TUNING_ICE_FOLK.md section 3): what the blow of
 * the viewer's own Ice Folk land unit on `defender` has that the published
 * Attack the projection reads does not. The exact preview of an offered
 * attack always had these; the projection of a blow after a planned Move,
 * or on what earlier blows leave, had none of them.
 *
 * - `bonus2`: Cold Blood (a Snow Hunter's +0.5 Attack against a Chilled
 *   unit; `chilled` or the public Chill entry), less Planted for a Boulder
 *   Yeti projected from a tile it does not stand on (the published Attack
 *   of one that has not moved has the +1, and a throw after a Move does
 *   not).
 * - `rockfall2`: for a Yeti's strike from a Mountain two tiles away, the
 *   Rockfall's `attack2`; null for every other blow. (From any other tile
 *   no such attack exists; the hunt leaves those tiles out,
 *   `iceFolkRockfallTileV7`.)
 * - `shatter`: the viewer's Shatter threshold when the blow comes from the
 *   next tile and the defender is Chilled, in land form, and no giant; 0
 *   otherwise. (A Martian Shield is not read: the blow of a unit that
 *   strikes through one is overrated, as everywhere in the projection.)
 */
function iceFolkBlowV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  defender: PublicUnitV7,
  defenderAt: CoordV7,
  chilledAssumed: boolean,
  lookup?: PolicyLookupV7,
): {
  readonly bonus2: number;
  readonly rockfall2: number | null;
  readonly shatter: number;
} {
  if (
    view.viewer.faction !== "ICE_FOLK" ||
    attacker.ownerId !== view.viewer.id ||
    attacker.form !== "LAND"
  )
    return NO_ICE_FOLK_BLOW_V7;
  const mechanics = unitRoleMechanicsV7(view, attacker);
  const facts = iceFolkFactsForViewV7(view);
  const chilled =
    defender.form === "LAND" &&
    (chilledAssumed || chilledForPolicyV7(facts, defender.id));
  const gap = distance(attacker.at, defenderAt);
  let bonus2 = chilled ? mechanics.coldBloodBonus2 : 0;
  if (mechanics.plantedBonus2 > 0) {
    const real =
      lookup?.unitsById.get(attacker.id) ??
      view.units.find((unit) => unit.id === attacker.id);
    if (
      real !== undefined &&
      !real.activation.moved &&
      !same(real.at, attacker.at)
    )
      bonus2 -= mechanics.plantedBonus2;
  }
  const rockfall2 =
    mechanics.rockfallAttack2 > 0 &&
    gap === 2 &&
    iceFolkRockfallTileV7(view, attacker, attacker.at)
      ? mechanics.rockfallAttack2
      : null;
  return {
    bonus2,
    rockfall2,
    shatter:
      chilled && gap === 1 && defender.role !== "JUGGERNAUT"
        ? shatterThresholdForPolicyV7(facts, view.viewer.id)
        : 0,
  };
}

/**
 * Step two of the Ice Folk pass: whether a Yeti (a unit with Rockfall) may
 * strike from `at` at two tiles: only from a Mountain. True for every unit
 * without Rockfall.
 */
function iceFolkRockfallTileV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
): boolean {
  if (
    unit.form !== "LAND" ||
    unitRoleMechanicsV7(view, unit).rockfallAttack2 <= 0
  )
    return true;
  const tile = findPublicTileV7(view, at);
  return tile?.explored === true && tile.terrain === "MOUNTAIN";
}

function publicCombatFacts(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  lookup?: PolicyLookupV7,
): PublicCombatFactsV7 {
  const cached = lookup?.combatFactsByUnitId.get(unit.id);
  if (cached?.unit === unit) return cached.facts;
  const actual = lookup?.unitsById.get(unit.id) === unit;
  const published = actual
    ? lookup?.unitStatsById.get(unit.id)
    : view.unitStats.find((item) => item.unitId === unit.id);
  const role = unitRoleRuleV7(view, unit);
  const total = (id: "ATTACK" | "MOVE"): number | null => {
    const value = published?.stats.find((item) => item.id === id)?.total;
    return value === undefined ? null : value.numerator / value.denominator;
  };
  const facts: PublicCombatFactsV7 = {
    attack2:
      unit.form === "EMBARKED" ? 0 : (total("ATTACK") ?? role.attack2 / 2) * 2,
    move:
      unit.form === "EMBARKED"
        ? EMBARKED_MOVE_V7
        : (total("MOVE") ?? role.move),
    minimumRange:
      unit.form === "EMBARKED"
        ? 0
        : (published?.minimumRange ?? role.minimumRange),
    maximumRange:
      unit.form === "EMBARKED" ? 0 : (published?.maximumRange ?? role.range),
    abilities:
      unit.form === "EMBARKED" ? [] : (published?.abilities ?? role.abilities),
  };
  if (actual) lookup?.combatFactsByUnitId.set(unit.id, { unit, facts });
  return facts;
}

function projectedDefenseBonus(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
): { readonly numerator: number; readonly denominator: number } {
  if (unit.form !== "LAND") return { numerator: 1, denominator: 1 };
  // The Martian revision: walkers and flyers never take cover (every
  // non-Martian unit does).
  if (!unitTakesCoverV7(view, unit)) return { numerator: 1, denominator: 1 };
  const tile = findPublicTileV7(view, at);
  return tile?.explored === true &&
    terrainGivesCoverV7(tile.terrain, policyForestCoverV7(view, unit, at))
    ? { numerator: 3, denominator: 2 }
    : { numerator: 1, denominator: 1 };
}

/**
 * Tuning 3 (`pulp_wars-w49.3`): whether `unit` would have the Forest cover
 * on `at`. The viewer's own units have it with the viewer's Forestry.
 * Another seat's technologies are private: where such a unit stands now its
 * public Defense breakdown says, and anywhere else the estimate assumes
 * the cover.
 */
function policyForestCoverV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
): boolean {
  if (unit.ownerId === view.viewer.id)
    return technologyCapabilitiesV7(
      view.viewer.researchedTechs,
      view.viewer.faction,
    ).forestCover;
  if (!same(unit.at, at)) return true;
  const tile = findPublicTileV7(view, at);
  return tile?.explored === true && tile.terrain === "FOREST"
    ? publicUnitHasTerrainCoverV7(view, unit.id)
    : true;
}

function visibleImprovementValueAt(
  view: PlayerViewV7,
  at: CoordV7,
  lookup?: PolicyLookupV7,
): number | null {
  const tile = findPublicTileV7(view, at);
  if (tile?.explored !== true || tile.improvement === null) return null;
  const published = view.improvementValues.find((item) => same(item.at, at));
  if (published !== undefined) return published.level;
  if (["FARM", "LUMBER_CAMP", "MINE", "MONUMENT"].includes(tile.improvement))
    return tile.improvement === "FARM"
      ? 2
      : tile.improvement === "LUMBER_CAMP"
        ? 1
        : tile.improvement === "MINE"
          ? 4
          : 3;
  const city =
    tile.territoryCityId === null
      ? undefined
      : (lookup?.citiesById.get(tile.territoryCityId) ??
        (lookup === undefined
          ? view.cities.find((item) => item.id === tile.territoryCityId)
          : undefined));
  if (city === undefined || !cityFootprintFullyExplored(view, city))
    return null;
  const graph: EconomyGraphV7 = {
    board: {
      width: view.board.width,
      height: view.board.height,
      tiles: view.board.tiles.map((item) => ({
        at: item.at,
        improvement: item.explored ? item.improvement : null,
        road: item.explored ? item.road : false,
        territoryCityId: item.explored ? item.territoryCityId : null,
      })),
    },
    cities: view.cities,
  };
  const contribution = spatialContributionAtV7(graph, at, tile.improvement);
  // Revision 16: the engine pays `min(3, 1 + families)` for one Market.
  return tile.improvement === "MARKET"
    ? marketCoinsV7(contribution.marketIncome)
    : contribution.population;
}

/** The income of each city of a view, computed once (a view never changes). */
const attributableCityIncomeByViewV7 = new WeakMap<
  PlayerViewV7,
  Map<CityId, number>
>();

function attributableCityIncome(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): number {
  // Tuning 7 (`pulp_wars-w49.10`): cached per view and city. A Raider's
  // picket value sorted every own city by this for every Move it was
  // offered, a fifth of the decision time of a seat with seventeen cities.
  let cache = attributableCityIncomeByViewV7.get(view);
  if (cache === undefined) {
    cache = new Map();
    attributableCityIncomeByViewV7.set(view, cache);
  }
  const cached = cache.get(city.id);
  if (cached !== undefined) return cached;
  const income = computeAttributableCityIncome(view, city);
  cache.set(city.id, income);
  return income;
}

function computeAttributableCityIncome(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): number {
  const market =
    view.improvementValues.find(
      (item) =>
        item.improvement === "MARKET" &&
        item.measure === "COIN_INCOME" &&
        view.board.tiles.some(
          (tile) =>
            tile.explored &&
            tile.territoryCityId === city.id &&
            same(tile.at, item.at),
        ),
    )?.level ?? 0;
  // Revision 16: the level term of city income is capped at 4.
  return Math.max(
    1,
    Math.min(city.level, CITY_LEVEL_INCOME_CAP_V7) +
      Number(city.isCapital) +
      market +
      Math.min(0, city.population),
  );
}

function hasDurableScreen(context: PolicyContextV7, cityId: CityId): boolean {
  if (context.durableScreenByCity.has(cityId))
    return context.durableScreenByCity.get(cityId) ?? false;
  const city = context.lookup.citiesById.get(cityId);
  return (
    city !== undefined &&
    context.view.units.some(
      (unit) =>
        unit.ownerId === context.view.viewer.id &&
        unit.form === "LAND" &&
        unit.hp * 2 >= unit.maxHp &&
        unitRoleRuleV7(context.view, unit).defense2 >= 4 &&
        (distance(unit.at, city.at) <= 1 ||
          (context.lookup.moveDestinationsByUnit.get(unit.id) ?? []).some(
            (destination) => distance(destination, city.at) <= 1,
          )),
    )
  );
}

function hasReachableScreenAtV7(
  context: PolicyContextV7,
  siege: PublicUnitV7,
  at: CoordV7,
): boolean {
  return context.view.units.some((unit) => {
    if (
      unit.id === siege.id ||
      unit.ownerId !== context.view.viewer.id ||
      unit.form !== "LAND" ||
      unit.hp * 2 < unit.maxHp ||
      unitRoleRuleV7(context.view, unit).defense2 < 4
    )
      return false;
    if (distance(unit.at, at) === 1 && !unit.activation.handled) return true;
    return (
      (context.lookup.moveDestinationsByUnit.get(unit.id) ?? []).some(
        (destination) => distance(destination, at) === 1,
      ) ||
      (context.lookup.emptyMoveUnitIds.has(unit.id) &&
        distance(unit.at, at) === 1)
    );
  });
}

function usefulDisband(
  context: PolicyContextV7,
  command: DisbandCommandV7,
): boolean {
  const { view } = context;
  const unit = context.lookup.unitsById.get(command.unitId);
  if (unit === undefined || isMindControlledV7(view, unit.id)) return false;
  // Tuning 5 (`pulp_wars-w49.4`): an army seat's unit at half its HP or
  // more fights on; it is never disbanded to deny the enemy a kill.
  if (context.army && unit.hp * 2 >= unit.maxHp) return false;
  const refund = Math.floor((unitRoleRuleV7(view, unit).cost ?? 0) / 2);
  const danger = visibleImmediateDamage(
    view,
    unit,
    unit.at,
    undefined,
    context.lookup,
  );
  return (
    refund + (freeCapacity(view, unit.homeCityId) <= 0 ? 3 : 0) >
    retainedUnitValue(view, unit) - danger
  );
}

function retainedUnitValue(view: PlayerViewV7, unit: PublicUnitV7): number {
  const rule = unitRoleRuleV7(view, unit);
  const base =
    unit.role === "JUGGERNAUT"
      ? 40 + rule.attack2 + rule.defense2 + 8 + unit.kills * 2
      : (rule.cost ?? 0) * 4 +
        unit.hp +
        unit.kills * 2 +
        // Revision 19: a grown unit costs more to replace (0 otherwise).
        grownUnitPremiumV7(view, unit);
  // The Martian revision: a controlled unit is worth its HP, a Brain carries
  // its controlled units (unchanged without a Martian seat).
  return view.mindControlled.length > 0
    ? martianRetainedValueV7(view, martianFactsForViewV7(view), unit, base)
    : base;
}

function targetStrategicValue(
  view: PlayerViewV7,
  unitId: UnitId,
  lookup?: PolicyLookupV7,
): number {
  const unit =
    lookup?.unitsById.get(unitId) ??
    (lookup === undefined
      ? view.units.find((item) => item.id === unitId)
      : undefined);
  if (unit === undefined) return 0;
  const rule = unitRoleRuleV7(view, unit);
  // Revision 13: a Necromancer is a priority target; each Grave it could
  // raise now is a Skeleton the enemy would gain.
  const necromancer = rule.abilities.includes("RAISE_DEAD")
    ? NECROMANCER_TARGET_BONUS_V7 +
      4 * Math.min(3, raisableGravesAtV7(view, unit.at, unit.id).length)
    : 0;
  // Revision 14: killing a Lich cures every unit it plagued; each visible
  // plagued own or allied unit it sources raises its value (0 without
  // Plague, so all-Human values are unchanged).
  const plagueSource =
    view.plagued.length > 0 && rule.abilities.includes("PLAGUE")
      ? PLAGUE_SOURCE_TARGET_VALUE_V7 *
        Math.min(
          6,
          view.plagued.filter((entry) => {
            // Revision 15: a victim on its last Plague turn gains little.
            if (
              entry.sourceUnitId !== unit.id ||
              entry.turnsRemaining < PLAGUE_TURNS_WORTH_CURING_V7
            )
              return false;
            const victim =
              lookup?.unitsById.get(entry.unitId) ??
              view.units.find((item) => item.id === entry.unitId);
            return victim !== undefined && !isHostile(view, victim.ownerId);
          }).length,
        )
      : 0;
  // Revision 19 (both 0 without a Dinosaur seat): a grown unit is a priority
  // target, and an Egg is worth more the longer it still needs.
  const dinosaur =
    grownUnitPremiumV7(view, unit) + eggTargetBonusV7(view, unit);
  // The Martian revision: the enablers (0 without a Martian unit).
  const martian = view.players.some((player) => player.faction === "MARTIAN")
    ? martianTargetBonusV7(view, martianFactsForViewV7(view), unit)
    : 0;
  // The Ice Folk revision: the Witch, the Sled, and the Mammoth (0 without
  // an Ice Folk seat).
  const ice = iceFolkMatchForPolicyV7(view)
    ? iceFolkTargetBonusV7(view, iceFolkFactsForViewV7(view), unit)
    : 0;
  // The Dwarf revision: the Engineer and a landed Gyrocopter (0 without a
  // Dwarf seat).
  const dwarf =
    dwarfPolicyOptionsV7().againstDwarves && dwarfMatchForPolicyV7(view)
      ? dwarfTargetBonusV7(view, dwarfFactsForViewV7(view), unit)
      : 0;
  return unit.role === "JUGGERNAUT"
    ? 40 +
        rule.attack2 +
        rule.defense2 +
        (rule.abilities.includes("PUSH") ? 8 : 0) +
        dinosaur +
        martian +
        ice +
        dwarf
    : (rule.cost ?? 0) * 4 +
        unit.hp +
        necromancer +
        plagueSource +
        dinosaur +
        martian +
        ice +
        dwarf;
}

const NECROMANCER_TARGET_BONUS_V7 = 12;
/**
 * Revision 16 (economy deflation): the level term of city income is capped at
 * 4 (revision 14: 5). A copy of the engine's constant in `economy.ts`.
 */
const CITY_LEVEL_INCOME_CAP_V7 = 4;

function cityFootprintFullyExplored(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): boolean {
  const radius = city.expanded || city.landGrantUsed ? 2 : 1;
  return view.board.tiles.every(
    (tile) => distance(tile.at, city.at) > radius || tile.explored,
  );
}

function freeCapacity(view: PlayerViewV7, cityId: CityId | null): number {
  if (cityId === null) return 0;
  const city = view.cities.find(
    (item) => item.id === cityId && item.ownerId === view.viewer.id,
  );
  if (city === undefined) return 0;
  const capacity = cityUnitCapacityForV7(
    city.level,
    view.viewer.researchedTechs,
    view.viewer.faction,
    cityBarracksV7(city),
  );
  // Revision 19 section 5.1: used capacity is a slot sum.
  const assigned = view.units
    .filter(
      (unit) => unit.ownerId === view.viewer.id && unit.homeCityId === cityId,
    )
    .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0);
  return capacity - assigned;
}

function trainingCostV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "TRAIN" | "TRAIN_NAVAL" | "LAY_EGG" }>,
): number {
  const base = effectiveRoleRuleV7(command.role, view.viewer.faction).cost ?? 0;
  if (command.kind === "TRAIN_NAVAL") {
    const tile = view.board.tiles.find(
      (candidate) => candidate.explored && same(candidate.at, command.at),
    );
    return Math.max(
      1,
      base -
        (tile?.explored === true && tile.improvement === "SHIPYARD" ? 2 : 0),
    );
  }
  const forge = view.improvementValues.some((value) => {
    if (value.improvement !== "FORGE" || value.level <= 0) return false;
    const tile = view.board.tiles.find(
      (candidate) => candidate.explored && same(candidate.at, value.at),
    );
    return tile?.explored === true && tile.territoryCityId === command.cityId;
  });
  return Math.max(1, base - (forge ? 1 : 0));
}

/** Reprojects public-only unit facts after a hypothetical policy move. */
export function projectPublicUnitForPolicyV7(
  view: PlayerViewV7,
  unitId: UnitId,
  patch: Partial<PublicUnitV7>,
): PlayerViewV7 {
  return projectPublicUnits(
    view,
    view.units.map((unit) =>
      unit.id === unitId ? { ...unit, ...patch } : unit,
    ),
    [unitId],
  );
}

function projectPublicUnits(
  view: PlayerViewV7,
  units: readonly PublicUnitV7[],
  changedUnitIds: readonly UnitId[],
): PlayerViewV7 {
  const byId = new Map(units.map((unit) => [unit.id, unit] as const));
  const changed = new Set(changedUnitIds);
  return {
    ...view,
    units,
    unitStats: view.unitStats.flatMap((stats) => {
      const unit = byId.get(stats.unitId);
      if (unit === undefined) return [];
      if (!changed.has(unit.id)) return [stats];
      const role = unitRoleRuleV7(view, unit);
      const embarked = unit.form === "EMBARKED";
      const tile = view.board.tiles.find(
        (candidate) => candidate.explored && same(candidate.at, unit.at),
      );
      const fortificationLevel =
        !embarked &&
        unit.form === "LAND" &&
        tile?.explored === true &&
        tile.territoryOwnerId === unit.ownerId
          ? (tile.fortificationLevel ?? 0)
          : 0;
      const defense = embarked
        ? { numerator: 1, denominator: 1 }
        : projectedDefenseBonus(view, unit, unit.at);
      const charge2 =
        !embarked &&
        view.viewer.researchedTechs.includes("RAIDING") &&
        role.abilities.includes("CHARGE") &&
        unit.activation.moved &&
        unit.activation.movedPathLength >= 2 &&
        unit.activation.attacksUsed === 0
          ? 2
          : 0;
      const inspired2 =
        !embarked &&
        unit.activation.inspired &&
        unit.activation.attacksUsed === 0
          ? 2
          : 0;
      // Revision 20: the Charge! run-up of a projected Triceratops (0 for
      // every unit without `LINEBREAKER`).
      // The Dinosaur pass: a hostile unit's research is not public; its
      // run-up is taken at its two tiles (`runUpTilesForPolicyV7`).
      const runUp2 = chargeRunUpForPolicyV7(
        view,
        unit,
        unit.activation.moved && unit.activation.attacksUsed === 0
          ? unit.activation.movedPathLength
          : 0,
      );
      const sight = embarked
        ? 1
        : Math.max(
            role.sightRadius,
            unit.ownerId === view.viewer.id
              ? (technologyCapabilitiesV7(
                  view.viewer.researchedTechs,
                  view.viewer.faction,
                ).roleSightRadius[unit.role] ?? 0)
              : 0,
          );
      const statValue = (
        stat: (typeof stats.stats)[number],
        numerator: number,
        denominator = 1,
        baseNumerator = numerator,
        baseDenominator = denominator,
      ) => ({
        ...stat,
        base: {
          ...stat.base,
          value: rational(baseNumerator, baseDenominator),
        },
        // The Candy revision: the projected total leaves the Rush bonus
        // out, so its modifier goes too, and the preview adds the bonus
        // from the unit's `sugarRush` entry under the first-attack rule (no
        // unit has the modifier in a match without a Candy seat).
        modifiers: embarked
          ? []
          : stat.modifiers.filter(
              (modifier) => modifier.source !== "SUGAR_RUSH",
            ),
        total: rational(numerator, denominator),
      });
      return [
        {
          ...stats,
          stats: stats.stats.map((stat) =>
            stat.id === "HP"
              ? { ...stat, current: unit.hp }
              : stat.id === "ATTACK"
                ? statValue(
                    stat,
                    embarked ? 0 : role.attack2 + charge2 + inspired2 + runUp2,
                    2,
                    embarked ? 0 : role.attack2,
                    2,
                  )
                : stat.id === "DEFENSE"
                  ? statValue(
                      stat,
                      (embarked ? 2 : role.defense2 + fortificationLevel * 2) *
                        defense.numerator,
                      2 * defense.denominator,
                      embarked ? 2 : role.defense2,
                      2,
                    )
                  : stat.id === "MOVE"
                    ? statValue(stat, embarked ? EMBARKED_MOVE_V7 : role.move)
                    : stat.id === "RANGE"
                      ? statValue(stat, embarked ? 0 : role.range)
                      : stat.id === "SIGHT"
                        ? statValue(stat, sight)
                        : stat,
          ),
          minimumRange: embarked ? 0 : role.minimumRange,
          maximumRange: embarked ? 0 : role.range,
          abilities: embarked ? [] : role.abilities,
        },
      ];
    }),
  };
}

function rational(
  numerator: number,
  denominator: number,
): { readonly numerator: number; readonly denominator: number } {
  let left = Math.abs(numerator);
  let right = denominator;
  while (right !== 0) [left, right] = [right, left % right];
  const divisor = left || 1;
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function unitForCommand(
  view: PlayerViewV7,
  command: CommandV7,
  lookup?: PolicyLookupV7,
): PublicUnitV7 | undefined {
  return "unitId" in command
    ? lookup === undefined
      ? view.units.find((unit) => unit.id === command.unitId)
      : lookup.unitsById.get(command.unitId)
    : undefined;
}

function threatenedCity(context: PolicyContextV7, cityId: CityId): boolean {
  return context.threats.some((item) => item.cityId === cityId);
}

function movesOntoThreatenedCity(
  context: PolicyContextV7,
  at: CoordV7 | null,
): boolean {
  return (
    at !== null &&
    context.threats.some((threat) => {
      const city = context.lookup.citiesById.get(threat.cityId);
      return (
        city !== undefined &&
        same(city.at, at) &&
        !(context.threatLookup.occupantsByKey.get(coordKey(at)) ?? []).some(
          (unit) =>
            unit.ownerId === context.view.viewer.id && same(unit.at, at),
        )
      );
    })
  );
}

function cityAt(view: PlayerViewV7, at: CoordV7, lookup?: PolicyLookupV7) {
  return lookup === undefined
    ? view.cities.find((city) => same(city.at, at))
    : lookup.citiesByKey.get(coordKey(at));
}

function unlocksAffordableProductiveAction(view: PlayerViewV7): boolean {
  return queryTechnologyTreeV7(view).nodes.some(
    (node) =>
      node.state === "AVAILABLE" &&
      node.cost === view.viewer.coins + 1 &&
      (node.effects.some((effect) => effect.kind === "UNIT_ROLE") ||
        node.effects.some((effect) => effect.kind === "COMMAND")),
  );
}

function validatePolicyRegistration(view: PlayerViewV7): void {
  let tree: ReturnType<typeof queryTechnologyTreeV7>;
  try {
    tree = queryTechnologyTreeV7(view);
  } catch (cause) {
    throw new NormalPolicyErrorV7(
      "MISSING_FACTION_REGISTRATION",
      cause instanceof Error ? cause.message : "Faction tree unavailable",
    );
  }
  for (const role of UNIT_ROLE_IDS_V7)
    if (tree.roleBindings[role] === undefined)
      throw new NormalPolicyErrorV7(
        "MISSING_ROLE_MAPPING",
        `Missing ${role} mapping in ${tree.id}`,
      );
}

function fallbackTie(
  view: PlayerViewV7,
  command: CommandV7,
  resolvedCityAt?: CoordV7,
): readonly number[] {
  const target =
    "at" in command
      ? command.at
      : "path" in command
        ? (command.path.at(-1) ?? { x: -1, y: -1 })
        : "targetUnitId" in command
          ? (view.units.find((unit) => unit.id === command.targetUnitId)
              ?.at ?? { x: -1, y: -1 })
          : "cityId" in command
            ? (resolvedCityAt ??
              view.cities.find((city) => city.id === command.cityId)?.at ?? {
                x: -1,
                y: -1,
              })
            : { x: -1, y: -1 };
  const primary =
    "unitId" in command
      ? command.unitId
      : "cityId" in command
        ? command.cityId
        : 0;
  const content =
    command.kind === "RESEARCH"
      ? TECHNOLOGY_IDS_V7.indexOf(command.tech)
      : command.kind === "TRAIN" || command.kind === "LAY_EGG"
        ? UNIT_ROLE_IDS_V7.indexOf(command.role)
        : command.kind === "CHOOSE_CITY_REWARD"
          ? REWARD_IDS_V7.indexOf(command.reward)
          : "targetUnitId" in command
            ? command.targetUnitId
            : 0;
  return [
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
  ];
}

function scoreTuple(score: AiScoreV7): readonly number[] {
  return [
    score.priority,
    score.strategicValue,
    score.immediateValue,
    score.futureValue,
    score.safetyValue,
    score.objectiveValue,
    ...score.deterministicTieBreak,
  ];
}

function compareNumericTuple(
  left: readonly number[],
  right: readonly number[],
): number {
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function drain<T>(work: Generator<void, T>): T {
  for (;;) {
    const step = work.next();
    if (step.done) return step.value;
  }
}

function isHostile(view: PlayerViewV7, ownerId: PlayerId): boolean {
  return (
    ownerId !== view.viewer.id &&
    (view.setup.aiMode === "RIVAL" ||
      ownerId === view.humanPlayerId ||
      view.viewer.id === view.humanPlayerId)
  );
}

function publicPlayersAllied(
  view: PlayerViewV7,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return (
    left === right ||
    cooperativeAlliesV7(view.setup.aiMode, view.humanPlayerId, left, right)
  );
}

function nearestDistance(from: CoordV7, targets: readonly CoordV7[]): number {
  return targets.reduce(
    (best, target) => Math.min(best, distance(from, target)),
    Number.POSITIVE_INFINITY,
  );
}

function now(): number {
  return typeof performance === "undefined" ? Date.now() : performance.now();
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const distance = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (left: CoordV7, right: CoordV7 | null) =>
  right !== null && left.x === right.x && left.y === right.y;
const coordKey = (at: CoordV7) => `${at.y},${at.x}`;

// This import is intentionally type checked: every improvement participates in
// policy/telemetry inventories even when a particular score is generic.
const _improvementInventory: readonly ImprovementIdV7[] = [];
void _improvementInventory;
