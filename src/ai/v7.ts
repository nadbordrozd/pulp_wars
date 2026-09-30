import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  EMBARKED_LANDING_MAX_SPENT_V7,
  EMBARKED_MOVE_V7,
  effectiveRoleRuleV7,
  cityUnitCapacityForV7,
  factionTreeV7,
  isRallyTargetV7,
  technologyCapabilitiesV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import { marketCoinsV7 } from "../engine/v7/economy";
import type { CombatPreviewV7 } from "../engine/v7/events";
import { validatePlayerMovementPathV7 } from "../engine/v7/movement";
import {
  createPublicCommandWorkV7,
  createPublicPlanningWorkV7,
  createPublicRedevelopmentPossibilityWorkV7,
  previewAttackExplosionsV7,
  previewEconomicV7,
  previewKaboomV7,
  previewMonumentV7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  queryPublicEconomicPotentialsV7,
  queryPublicRedevelopmentChangesImprovementV7,
  queryTechnologyTreeV7,
  scorePublicSpatialPlanV7,
} from "../engine/v7/query";
import {
  COMMAND_KIND_ORDER_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type CoordV7,
  type ImprovementIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import {
  spatialContributionAtV7,
  type EconomyGraphV7,
} from "../engine/v7/spatial-economy";
import type { PlayerViewV7, PublicUnitV7 } from "../engine/v7/view";
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
  COIN_STRATEGIC_VALUE_V7,
  FRIENDLY_FIRE_TRADE_FACTOR_V7,
  GANG_UP_KILL_SETUP_PRIORITY_V7,
  GANG_UP_SETUP_PRIORITY_V7,
  GANG_UP_STRIKE_PRIORITY_V7,
  GOBLIN_HORDE_TRAINING_BIAS_V7,
  GOBLIN_HORDE_TRAINING_MAXIMUM_V7,
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
  deathBlastDamageV7,
  explosionChainValueV7,
  gangUpForPolicyV7,
  goblinMatchForPolicyV7,
  hostileKaboomExposureV7,
  hypotheticalBlastV7,
  kaboomDamageV7,
  regenerationV7,
  type ExplosionChainValueV7,
} from "./v7-goblin";
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
  /** `pulp_wars-1mc`: public endgame siege targets, or null outside it. */
  readonly endgame: EndgamePlanV7 | null;
  readonly commands: readonly CommandV7[];
  /**
   * Revision 16 (section 3.6 rule 2): a ready growth harvest of the level-1
   * original capital, which outranks research, training, and construction.
   */
  readonly openingGrowthHarvest: boolean;
  readonly threats: ThreatV7[];
  readonly threatenedTiles: ReadonlyMap<UnitId, ReadonlySet<string>>;
  naval: NavalPlanV7;
  tactical: TacticalPlanV7;
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
}

const NO_TACTICAL_PLAN_V7: TacticalPlanV7 = Object.freeze({
  objectiveByUnitId: new Map<UnitId, CoordV7>(),
  roadCorridor: null,
  defenderReplacementActionKeys: new Set<string>(),
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
  reserveCoins: 0,
  retainLandedUnitIds: new Set<UnitId>(),
  waterDistanceByKey: new Map(),
  prospectiveWaterDistanceByKey: new Map(),
  fleetDistanceByKey: new Map(),
});

type AiReadyItemV7 = ReturnType<typeof queryAiReadyCommandsV7>[number];
type SharedCityCommandV7 =
  | Extract<CommandV7, { kind: "TRAIN" }>
  | Extract<CommandV7, { kind: "TRAIN_NAVAL" }>
  | Extract<CommandV7, { kind: "LAND_GRANT" }>;

const THREATENED_ROLE_ORDER = [
  "GUARD",
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
    this.ready = queryAiReadyCommandsV7(this.view);
    if (this.ready.length > this.bounds.candidateCeiling)
      throw new NormalPolicyErrorV7(
        "NO_PUBLIC_COMMAND",
        `Policy generated ${this.ready.length} candidates above declared ceiling ${this.bounds.candidateCeiling}`,
      );
    this.context = bareContext(
      this.view,
      this.ready.map((item) => item.command),
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
  commands: readonly CommandV7[],
): PolicyContextV7 {
  const context = bareContext(view, commands);
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
    endgame: endgamePlanForPolicyV7(view, (owner) => isHostile(view, owner)),
    commands,
    openingGrowthHarvest: commands.some((command) =>
      openingGrowthHarvestV7(view, command),
    ),
    threats,
    threatenedTiles,
    naval: NO_NAVAL_PLAN_V7,
    tactical: NO_TACTICAL_PLAN_V7,
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
      const role = unitRoleRuleV7(view, unit).tacticalRole;
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
  return {
    objectiveByUnitId,
    roadCorridor,
    defenderReplacementActionKeys,
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
    const queue: CoordV7[][] = [[]];
    const best = new Map([[coordKey(unit.at), 0]]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const path = queue[cursor];
      if (path === undefined) break;
      const current = path.at(-1) ?? unit.at;
      for (const next of neighbors8V7(view, current)) {
        const candidate = [...path, next];
        const validation = validatePlayerMovementPathV7(view, unit, candidate);
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
        if (same(next, target)) return true;
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
    if (unit.ownerId !== view.viewer.id) {
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
        .landTradeIncomeCoins === 1,
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
  if (view.setup.mapType === "DRY_LAND") return NO_NAVAL_PLAN_V7;
  const tilesByKey = new Map(
    view.board.tiles.map((tile) => [coordKey(tile.at), tile]),
  );
  const land = view.board.tiles
    .filter(
      (tile) =>
        tile.explored &&
        tile.biome !== null &&
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
  const targetHasCaptureUnit =
    target !== null &&
    visibleObjectiveClaimants.some((unit) => same(unit.at, target));
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
  const visibleNavalDanger = view.units.some(
    (unit) => isHostile(view, unit.ownerId) && unit.form !== "LAND",
  );
  const ownedPortKeys = new Set(
    view.naval.ownedPorts.map((port) => coordKey(port.at)),
  );
  const visibleBlockaders = view.units
    .filter(
      (unit) =>
        isHostile(view, unit.ownerId) &&
        unit.form !== "LAND" &&
        ownedPortKeys.has(coordKey(unit.at)),
    )
    .map((unit) => unit.at);
  const visibleHostileFleet = view.units
    .filter((unit) => isHostile(view, unit.ownerId) && unit.form !== "LAND")
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
  const tiles = new Set(
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
    tiles,
  );
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

export function inspectNormalTacticalFactsV7(view: PlayerViewV7): {
  readonly threats: readonly ThreatV7[];
  readonly objectiveByUnitId: readonly {
    readonly unitId: UnitId;
    readonly at: CoordV7;
  }[];
  readonly roadCorridor: RoadCorridorV7 | null;
  readonly defenderReplacementActionKeys: readonly string[];
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
  };
}

function* publicThreatenedTilesWorkV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  lookup: PublicThreatLookupV7,
  pathWork?: MutablePolicyPathDiagnosticsV7,
  policyLookup?: PolicyLookupV7,
): Generator<void, readonly CoordV7[]> {
  const rule = unitRoleRuleV7(view, unit);
  const facts = publicCombatFacts(view, unit, policyLookup);
  // Revision 17 (`pulp_wars-0ao.6`): an embarked goblin-crewed unit may land
  // (after at most one sailing step) and Kaboom the same turn, threatening
  // every tile within Chebyshev 1 of a landing tile.
  if (unit.form === "EMBARKED" && kaboomDamageV7(view, unit) > 0)
    return yield* embarkedKaboomReachWorkV7(view, unit, lookup);
  // Revision 13: a hostile Banshee's Wail threatens a living viewer within
  // Chebyshev 2 of every tile it can reach (it may Wail after moving).
  const wail = publicWailThreatV7(view, unit);
  if (!wail && (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0))
    return [];
  const minimumRange = wail ? 1 : facts.minimumRange;
  const maximumRange = wail ? WAIL_THREAT_RADIUS_V7 : facts.maximumRange;
  // Revision 17: a goblin-crewed land unit may Kaboom after any Move (even a
  // Rocket Cart), threatening every tile within Chebyshev 1 of a tile it can
  // reach. Only Goblin units have Kaboom, so other matches are unchanged.
  const kaboom = unit.form === "LAND" && rule.abilities.includes("KABOOM");
  const origins = new Map([[coordKey(unit.at), unit.at]]);
  if (
    unit.form !== "EMBARKED" &&
    (rule.mayUsePrimaryActionAfterMove || kaboom)
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
        if (
          (lookup.occupantsByKey.get(coordKey(tile.at)) ?? []).some(
            (occupant) => occupant.id !== unit.id && same(occupant.at, tile.at),
          )
        )
          continue;
        const roadStep =
          unit.form === "LAND" &&
          priorRoadNode &&
          publicRoadNodeForOwner(tile, unit.ownerId, lookup);
        const spent2 = current.spent2 + (roadStep ? 1 : 2);
        if (spent2 > facts.move * 2) continue;
        const key = coordKey(tile.at);
        if ((best.get(key) ?? Number.POSITIVE_INFINITY) <= spent2) continue;
        best.set(key, spent2);
        origins.set(key, tile.at);
        const terrainStop =
          unit.form === "LAND" &&
          tile.explored &&
          !roadStep &&
          (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN");
        const hostileZoc = neighbors8V7(view, tile.at).some((adjacent) =>
          (lookup.occupantsByKey.get(coordKey(adjacent)) ?? []).some(
            (occupant) =>
              occupant.id !== unit.id &&
              occupant.hp > 0 &&
              occupant.form !== "EMBARKED" &&
              occupant.ownerId !== unit.ownerId &&
              !publicPlayersAllied(view, unit.ownerId, occupant.ownerId) &&
              publicProjectsZocForThreatV7(view, occupant, unit, tile),
          ),
        );
        if (!terrainStop && !hostileZoc) queue.push({ at: tile.at, spent2 });
      }
      yield;
    }
  }
  const direct: CoordV7[] = [];
  for (const origin of origins.values()) {
    const attacks = rule.mayUsePrimaryActionAfterMove || same(origin, unit.at);
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

function* embarkedKaboomReachWorkV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  lookup: PublicThreatLookupV7,
): Generator<void, readonly CoordV7[]> {
  const open = (at: CoordV7) =>
    !(lookup.occupantsByKey.get(coordKey(at)) ?? []).some(
      (occupant) => occupant.id !== unit.id,
    );
  // One sailing step leaves the landing point (revision 16).
  const waters = [unit.at];
  if (EMBARKED_LANDING_MAX_SPENT_V7 >= 1)
    for (const next of neighbors8V7(view, unit.at)) {
      const tile = tileAtPublicV7(view, next);
      if (publicMovementTilePossible(view, unit, tile, lookup) && open(next))
        waters.push(next);
    }
  const landed: PublicUnitV7 = { ...unit, form: "LAND" };
  const reach = new Map<string, CoordV7>();
  for (const water of waters) {
    for (const landing of neighbors8V7(view, water)) {
      const tile = tileAtPublicV7(view, landing);
      if (!publicMovementTilePossible(view, landed, tile, lookup)) continue;
      if (!open(landing)) continue;
      reach.set(coordKey(landing), landing);
      for (const around of neighbors8V7(view, landing))
        reach.set(coordKey(around), around);
    }
    yield;
  }
  return [...reach.values()];
}

/** A visible hostile land Banshee threatens a living viewer (section 6.6). */
function publicWailThreatV7(view: PlayerViewV7, unit: PublicUnitV7): boolean {
  return (
    unit.form === "LAND" &&
    unit.ownerId !== view.viewer.id &&
    isBansheeV7(view, unit) &&
    isLivingOwnerV7(view, view.viewer.id)
  );
}

function publicProjectsZocForThreatV7(
  view: PlayerViewV7,
  projector: PublicUnitV7,
  target: PublicUnitV7,
  tile: PlayerViewV7["board"]["tiles"][number],
): boolean {
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
  if (unit.form === "LAND")
    return (
      tile.biome !== null &&
      (tile.terrain !== "MOUNTAIN" ||
        lookup.engineeringOwnerIds.has(unit.ownerId))
    );
  return tile.biome === null;
}

function isPolicyCandidate(
  context: PolicyContextV7,
  command: CommandV7,
): boolean {
  if (command.kind === "WAIT") return false;
  if (command.kind === "BUILD_ROAD") {
    const corridor = context.tactical.roadCorridor;
    return (
      corridor !== null && corridor.missingRoadKeys[0] === coordKey(command.at)
    );
  }
  if (
    (command.kind === "MOVE" || command.kind === "ATTACK") &&
    leavesSoleThreatenedDefender(context, command) &&
    !defenderActionException(context, command)
  )
    return false;
  if (command.kind === "MOVE") {
    const actor = context.lookup.unitsById.get(command.unitId);
    const objective = context.tactical.objectiveByUnitId.get(command.unitId);
    const to = command.path.at(-1);
    if (
      actor !== undefined &&
      objective !== undefined &&
      to !== undefined &&
      unitRoleRuleV7(context.view, actor).tacticalRole === "SIEGE" &&
      distance(to, objective) >= 2 &&
      distance(to, objective) <= 3 &&
      !hasReachableScreenAtV7(context, actor, to) &&
      !endgameSiegeTileV7(context, actor, to)
    )
      return false;
  }
  if (command.kind === "ATTACK" && isLowValueAttackV7(context, command))
    return false;
  const autoembark = isAutoembarkMoveV7(context, command);
  if (autoembark && !context.naval.active) return false;
  if (autoembark && context.undead && fragileCargoV7(context, command.unitId))
    return false;
  if (command.kind === "DISEMBARK" && context.naval.active)
    return (
      context.naval.landing.some((at) => same(at, command.at)) ||
      endgameLandingValueV7(context, command) > 0
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
  if (
    command.kind === "TRAIN" ||
    command.kind === "TRAIN_NAVAL" ||
    command.kind === "LAND_GRANT"
  )
    return preferredSharedCityActionV7(context, command.cityId) === command;
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
      })
    );
  }
  if (command.kind === "DISBAND")
    return usefulDisband(context, command as DisbandCommandV7);
  const economic = previewEconomicV7(context.view, command);
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
  if (context.undead && feedsZombieV7(context, command, preview)) return true;
  if (
    context.undead &&
    vampireAttackExposedV7(context, command, actor, preview)
  )
    return true;
  if (context.goblin && goblinFriendlyFireRejectedV7(context, command, preview))
    return true;
  const immediate =
    combatImmediateValue(preview, context.view) +
    (context.undead ? biteHarmAdjustmentV7(context, actor, preview) : 0);
  const harmful =
    (!preview.defenderDies && preview.attackerDies) ||
    (!preview.defenderDies && immediate <= 0);
  if (!harmful) return false;
  if (attackPurposeExceptionV7(context, command, preview)) return false;
  if (endgameCombinedKillV7(context, command, preview)) return false;
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

/** A 10-HP Zombie rising: Zombie cost 3 x 4 + 10 HP. */
const INFECT_RISING_VALUE_V7 = 22;

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
  const projected = projectPublicUnitForPolicyV7(context.view, target.id, {
    hp: target.hp - preview.damageToDefender,
  });
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
  const landByCity = new Map<CityId, Extract<CommandV7, { kind: "TRAIN" }>[]>();
  const navalByCity = new Map<
    CityId,
    Extract<CommandV7, { kind: "TRAIN_NAVAL" }>[]
  >();
  for (const command of context.commands) {
    if (
      command.kind === "TRAIN" ||
      command.kind === "TRAIN_NAVAL" ||
      command.kind === "LAND_GRANT"
    ) {
      const shared = sharedByCity.get(command.cityId) ?? [];
      shared.push(command);
      sharedByCity.set(command.cityId, shared);
      if (command.kind === "TRAIN") {
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
  let transports = 0;
  let defendedLanding = false;
  for (const unit of view.units) {
    if (unit.ownerId === view.viewer.id) {
      ownedRoleCounts.set(unit.role, (ownedRoleCounts.get(unit.role) ?? 0) + 1);
      ownedAt.add(coordKey(unit.at));
      if (unit.homeCityId !== null)
        assignedByCity.set(
          unit.homeCityId,
          (assignedByCity.get(unit.homeCityId) ?? 0) + 1,
        );
      if (
        unit.form === "LAND" &&
        unitRoleRuleV7(view, unit).abilities.includes("CAPTURE")
      )
        hasLandCaptureUnit = true;
      if (unit.role === "PATROL_BOAT") patrolBoats += 1;
      if (unit.role === "BATTLESHIP") battleships += 1;
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
  const trainingAdjustment = (role: UnitRoleIdV7): number =>
    (undeadTraining?.get(role) ?? 0) + (goblinTraining?.get(role) ?? 0);
  // Revision 17: the first Goblins of the horde do not pay the per-role
  // repetition cost of the preferred-role choice.
  const hordeAdjustment = (role: UnitRoleIdV7, count: number): number =>
    goblinTraining !== null && role === "FIGHTER"
      ? GOBLIN_HORDE_TRAINING_BIAS_V7 *
        Math.min(GOBLIN_HORDE_TRAINING_MAXIMUM_V7, count)
      : 0;
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
        unit.form === "LAND" &&
        unitRoleRuleV7(view, unit).tacticalRole === "SIEGE",
    ) < ENDGAME_SIEGE_TARGET_V7;
  const threatenedCityIds = new Set<CityId>();
  for (const threat of context.threats) {
    threatenedCityIds.add(threat.cityId);
    yield;
  }

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
    let preferredLand: Extract<CommandV7, { kind: "TRAIN" }> | null = null;
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
        (siegeExposed && role === "CATAPULT" ? -40 : 0) +
        (vampireExposed && role === "KNIGHT" ? -40 : 0) +
        (endgameCity &&
        ((endgameCaptureShortfall && rule.abilities.includes("CAPTURE")) ||
          (endgameSiegeShortfall && rule.tacticalRole === "SIEGE"))
          ? ENDGAME_TRAINING_BIAS_V7
          : 0)
      );
    };
    for (const command of landByCity.get(cityId) ?? []) {
      const count = ownedRoleCounts.get(command.role) ?? 0;
      const value =
        effectiveRoleRuleV7(command.role, view.viewer.faction).maxHp +
        Number(command.role === "GUARD" && threatened) * 20 +
        Number(command.role === "CATAPULT" && durableScreen) * 12 +
        20 * Number(count === 0) -
        2 * (effectiveRoleRuleV7(command.role, view.viewer.faction).cost ?? 0) -
        8 * count +
        trainingAdjustment(command.role) +
        hordeAdjustment(command.role, count) +
        cityAdjustment(command.role);
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
    let firstNaval: "PATROL_BOAT" | "BATTLESHIP" | null = null;
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
    const free =
      city === undefined
        ? 0
        : cityUnitCapacityForV7(
            city.level,
            view.viewer.researchedTechs,
            view.viewer.faction,
          ) - (assignedByCity.get(cityId) ?? 0);
    const needsCenterDefender =
      city !== undefined && threatened && !ownedAt.has(coordKey(city.at));
    let best: SharedCityCommandV7 | null = null;
    let bestUtility = Number.NEGATIVE_INFINITY;
    let bestTie: readonly number[] = [];
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
      const eligible =
        command.kind === "LAND_GRANT" ||
        (command.kind === "TRAIN"
          ? !(
              context.naval.active &&
              !threatened &&
              free <= 1 &&
              hasLandCaptureUnit
            ) &&
            (!spendsReserve || threatened) &&
            !worsens
          : (!spendsReserve ||
              (context.naval.visibleNavalDanger &&
                command.role === "PATROL_BOAT")) &&
            // Revision 14 AI fix (Undead matches): a garrisoned center only
            // offers naval training, which filled every spare slot with
            // Patrol Boats (~15 per game); beyond two naval units, train
            // only the naval role the plan asks for.
            !(
              context.undead &&
              preferredNaval !== command.role &&
              patrolBoats + battleships >= 2
            ));
      if (eligible) {
        const utility =
          command.kind === "LAND_GRANT"
            ? neutral * 7 - 18
            : command.kind === "TRAIN"
              ? (effectiveRoleRuleV7(command.role, view.viewer.faction).maxHp +
                  Number(command.role === "GUARD" && threatened) * 20 +
                  Number(command.role === "CATAPULT" && durableScreen) * 12 +
                  trainingAdjustment(command.role) +
                  cityAdjustment(command.role)) *
                  3 -
                cost * 4 +
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
        ? 12
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

  if (command.kind === "TRAIN") {
    priority = threatenedCity(context, command.cityId) ? 1260 : 1080;
    immediateValue = -trainingCostV7(view, command);
    strategicValue = trainingStrategicValue(context, command);
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
    priority = context.naval.active ? 1335 : 810;
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
      }
    }
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
  }

  if (command.kind === "RALLY" && actor !== undefined) {
    // Revision 17: the owner's Rally reach (WAAAGH! radius 2 including
    // support and siege roles); Human and Undead Rally are unchanged.
    const targets = view.units.filter((unit) =>
      isRallyTargetV7(view, actor, unit),
    );
    strategicValue = targets.length * 12;
    priority = targets.length >= 2 ? 1235 : 720;
    if (view.viewer.faction === "UNDEAD") {
      const frenzy = undeadFrenzyValueV7(context, actor);
      strategicValue = frenzy.strategic;
      priority = frenzy.priority;
    } else if (view.viewer.faction === "GOBLIN") {
      const waaagh = waaaghValueV7(context, actor);
      strategicValue = waaagh.strategic;
      priority = waaagh.priority;
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

  if (command.kind === "WAIL" && actor !== undefined) {
    const wail = offeredWailSummaryV7(view, actor.id, (unit) =>
      targetStrategicValue(view, unit.id, context.lookup),
    );
    priority = wailPriorityV7(wail);
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
    // Revision 17: a regenerating Troll keeps fighting until a quarter HP.
    if (
      actor !== undefined &&
      context.goblin &&
      regenerationV7(view, actor) > 0 &&
      actor.hp * 4 >= actor.maxHp
    )
      priority = 300;
  }

  if (command.kind === "PROMOTE") {
    priority = 1320;
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
    const picket = scoutPicketValue(view, actor, resultAt);
    const screen = screenValue(view, actor, resultAt);
    if (chest) {
      priority = 1330;
      strategicValue = 1;
      immediateValue = 5;
    } else if (movesOntoThreatenedCity(context, resultAt)) {
      priority = 1250;
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
      }
      const assigned = context.tactical.objectiveByUnitId.get(actor.id);
      if (
        assigned !== undefined &&
        unitRoleRuleV7(view, actor).tacticalRole === "SIEGE" &&
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
      precomputedKnightOverrun !== undefined
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
  }

  if (command.kind === "DISBAND" && actor !== undefined) {
    immediateValue = Math.floor((unitRoleRuleV7(view, actor).cost ?? 0) / 2);
    strategicValue = freeCapacity(view, actor.homeCityId) <= 0 ? 6 : 0;
    priority = 1090;
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
      command.kind.startsWith("BUILD_"))
  )
    priority = NORMAL_GROWTH_HARVEST_PRIORITY_V7 - 1;

  safetyValue +=
    actor === undefined ||
    resultAt === null ||
    command.kind === "ATTACK" ||
    command.kind === "KABOOM" ||
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
      (!unit.activation.moved && rule.mayUsePrimaryActionAfterMove
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
  if (view.viewer.faction === "UNDEAD" && isVampireV7(view, actor)) {
    const vampire = vampireMoveValueV7(context, actor, to, priority, embarks);
    priority = vampire.priority;
    strategic += vampire.strategic;
  }
  // pulp_wars-vkq.21: embarked Liches sailed into Battleship and Patrol Boat
  // reach one after another on naval maps; afloat, a Lich keeps the same
  // rule as on land (never into visible lethal reach unless strictly safer).
  if (
    view.viewer.faction === "UNDEAD" &&
    actor.form === "EMBARKED" &&
    isLichRoleV7(view, actor) &&
    danger() >= actor.hp &&
    danger() >= visibleImmediateDamage(view, actor, actor.at, context)
  )
    priority = -1;
  if (view.viewer.faction !== "UNDEAD" || actor.form !== "LAND")
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
      if (
        there.value > here.value &&
        (band > 905 ? danger() < actor.hp : danger() * 2 < actor.hp)
      ) {
        priority = Math.max(priority, band + 1);
        strategic += there.value - here.value;
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
    if (dangerTo >= actor.hp && dangerTo >= dangerHere) priority = -1;
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
  return (
    wounded !== undefined &&
    visibleImmediateDamage(after, wounded, wounded.at, context) < hp
  );
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
    view.viewer.faction !== "UNDEAD" ||
    !isVampireV7(view, actor) ||
    preview.defenderDies ||
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
    view.viewer.faction === "UNDEAD" &&
    unit.ownerId === view.viewer.id &&
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
    view.viewer.faction !== "UNDEAD" ||
    actor.ownerId !== view.viewer.id ||
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
  const plan = context.endgame;
  if (plan === null || preview.defenderDies || preview.damageToDefender <= 0)
    return false;
  const view = context.view;
  const target = context.lookup.unitsById.get(command.targetUnitId);
  if (target === undefined) return false;
  const city = endgameTargetAtV7(plan, target.at);
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

/** Endgame training: capturers and siege units wanted near the targets. */
const ENDGAME_CAPTURER_TARGET_V7 = 4;
const ENDGAME_SIEGE_TARGET_V7 = 3;
const ENDGAME_TRAINING_BIAS_V7 = 16;

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
      Number.isFinite(endgameRouteDistanceV7(plan, view, unit.at)),
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
      Number.isFinite(endgameRouteDistanceV7(plan, view, unit.at)),
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
  const landed: PublicUnitV7 = { ...actor, form: "LAND", at: command.at };
  if (visibleImmediateDamage(view, landed, command.at, context) >= actor.hp)
    return 0;
  return 10 - 2 * route;
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
  const route = endgameRouteDistanceV7(plan, context.view, actor.at);
  return Number.isFinite(route) && route > 1;
}

/**
 * Endgame movement: a non-capturing unit leaves a target center for a fresh
 * adjacent capturer and does not squat on one near capturers; capturers and
 * siege units close in along public land routes (units are walls) as long
 * as the destination is not in visible lethal reach.
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
  const siege = unitRoleRuleV7(view, actor).tacticalRole === "SIEGE";
  if (!capture && !siege) return unchanged;
  const next = plan.routeDistanceByKey.get(coordKey(to));
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
  const from = endgameRouteDistanceV7(plan, view, actor.at);
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
    } else if (friendlyOwnerV7(view, unit.ownerId))
      friendlySplashValue += friendlyLossValueV7(
        view,
        unit,
        splash.damage,
        splash.dies,
      );
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
 * combined kill.
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
  if (attackPurposeFactsV7(context, command, preview).savesCity) return false;
  return !endgameCombinedKillV7(context, command, preview);
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
  const doomed = goblinDoomedAtV7(context, actor, actor.at);
  let exploder = retainedUnitValue(view, actor);
  if (doomed) exploder = Math.floor(exploder / 3);
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
  const net =
    chain.hostileValue -
    chain.friendlyValue -
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
      : chain.hostileKills >= 2
        ? KABOOM_MULTI_KILL_PRIORITY_V7
        : chain.hostileKills > 0
          ? KABOOM_KILL_PRIORITY_V7
          : doomed
            ? KABOOM_DOOMED_PRIORITY_V7
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
    !rule.mayUsePrimaryActionAfterMove ||
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
  if (blast.hostileKills === 0 || net <= 0) return 0;
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
 * unit visible enemies can kill there, plus the blasts of adjacent own
 * exploding units that visible enemies can kill where they stand.
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
  if (blast > 0 && own(unit.ownerId) && goblinDoomedAtV7(context, unit, at))
    for (const other of view.units) {
      if (other.id === unit.id || !own(other.ownerId)) continue;
      if (distance(other.at, at) !== 1) continue;
      const hit = Math.min(blast, other.hp);
      loss += friendlyLossValueV7(view, other, hit, hit >= other.hp);
    }
  for (const other of view.units) {
    if (other.id === unit.id || other.ownerId !== view.viewer.id) continue;
    if (distance(other.at, at) !== 1) continue;
    const otherBlast = deathBlastDamageV7(view, other);
    if (otherBlast <= 0 || !goblinDoomedAtV7(context, other, other.at))
      continue;
    const hit = Math.min(otherBlast, unit.hp);
    loss += friendlyLossValueV7(view, unit, hit, hit >= unit.hp);
  }
  return loss;
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
  let strategic = 0;
  let setupKill = false;
  let raised = priority;
  if (
    view.viewer.faction === "GOBLIN" &&
    actor.form === "LAND" &&
    !same(actor.at, to)
  ) {
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
  }
  // Only a kill setup revives a Move the other rules did not score.
  if (priority < 0 && !setupKill) return { priority, strategic: 0 };
  const onOwnCenter =
    context.lookup.citiesByKey.get(coordKey(actor.at))?.ownerId ===
    view.viewer.id;
  const spacingThere = exploderSpacingLossV7(context, actor, to);
  const spacingHere = exploderSpacingLossV7(context, actor, actor.at);
  strategic -= spacingThere;
  if (routine && !setupKill && spacingThere > spacingHere)
    return { priority: -1, strategic };
  if (spacingHere > spacingThere && !onOwnCenter) {
    raised = Math.max(raised, GOBLIN_SPACING_PRIORITY_V7);
    strategic += spacingHere - spacingThere;
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
      (!unit.activation.moved && rule.mayUsePrimaryActionAfterMove
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
    priority: useful >= 2 ? 1235 : useful === 1 ? 720 : -1,
    strategic: useful * 12 + (eligible - useful) * 2,
  };
}

/**
 * Goblin training: the cheap Goblin horde fills Warrens capacity. The Goblin
 * gains a small bias in both the preferred-role value and the city-action
 * utility; the horde adjustment (in `sharedCityContextWorkV7`) also waives
 * the repetition cost of the first four Goblins in the preferred-role
 * choice. The Orc Warboss cannot tend, so the living-seat cure bias never
 * applies.
 */
function goblinTrainingAdjustmentsV7(): ReadonlyMap<UnitRoleIdV7, number> {
  return new Map<UnitRoleIdV7, number>([["FIGHTER", GOBLIN_TRAINING_BIAS_V7]]);
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
  if (attacker.role === "CATAPULT") {
    const medicHealing = context.view.units.some(
      (item) =>
        item.ownerId === target.ownerId &&
        item.role === "CAPTAIN" &&
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
  if (
    rolePlans[0]?.first === tech &&
    context.view.cities.some(
      (city) =>
        city.ownerId === context.view.viewer.id &&
        freeCapacity(context.view, city.id) > 0,
    )
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
  return { priority: 1040, strategic: fortification, cost: node.cost };
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
  if (command.reachedLevel === 2)
    return offered.includes(
      context.view.viewer.coins < 4 ? "STOCKPILE" : "SURVEY",
    )
      ? context.view.viewer.coins < 4
        ? "STOCKPILE"
        : "SURVEY"
      : (offered[0] ?? command.reward);
  if (command.reachedLevel === 3)
    return offered.includes("MILITIA") &&
      threatenedCity(context, command.cityId)
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
    return offered.includes("TREASURY_8") && neutral >= 4
      ? "TREASURY_8"
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
  return offered.includes("JUGGERNAUT") &&
    juggernauts < cityCount &&
    (threatenedCity(context, command.cityId) || context.view.viewer.coins >= 12)
    ? "JUGGERNAUT"
    : offered.includes("TREASURY")
      ? "TREASURY"
      : (offered[0] ?? command.reward);
}

function trainingStrategicValue(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "TRAIN" }>,
): number {
  let value = effectiveRoleRuleV7(
    command.role,
    context.view.viewer.faction,
  ).maxHp;
  if (command.role === "GUARD" && threatenedCity(context, command.cityId))
    value += 20;
  if (command.role === "CATAPULT" && hasDurableScreen(context, command.cityId))
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
  let value = distance(actor.at, assigned) - distance(to, assigned);
  const role = unitRoleRuleV7(context.view, actor).tacticalRole;
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
  if (at === null || actor.role === "CATAPULT" || actor.role === "MARKSMAN")
    return 0;
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
        (unit.role === "CATAPULT" || unit.role === "MARKSMAN") &&
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
): number {
  let total = 0;
  const effectiveLookup =
    context === undefined || context.view === view ? lookup : undefined;
  const hostiles =
    effectiveLookup?.visibleHostiles ??
    view.units.filter((unit) => isHostile(view, unit.ownerId));
  // Revision 13 (Undead matches only): Wail, Lich splash, and Infect.
  const undead = context?.undead ?? undeadMatchForPolicyV7(view);
  // Revision 17 (Goblin matches only): bomb splash, Gang Up, and the Kaboom
  // of an embarked goblin-crewed unit that lands next to the actor.
  const goblin = context?.goblin ?? goblinMatchForPolicyV7(view);
  for (const hostile of hostiles) {
    const facts = publicCombatFacts(view, hostile, effectiveLookup);
    const wail =
      undead &&
      hostile.form === "LAND" &&
      isBansheeV7(view, hostile) &&
      isLivingOwnerV7(view, actor.ownerId);
    if (goblin && hostile.form === "EMBARKED") {
      const kaboom = kaboomDamageV7(view, hostile);
      if (
        kaboom > 0 &&
        (context?.threatenedTiles.get(hostile.id)?.has(coordKey(at)) ??
          distance(hostile.at, at) <= 3)
      )
        total += Math.min(kaboom, actor.hp);
      continue;
    }
    if (!wail && (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0))
      continue;
    const d = distance(hostile.at, at);
    const minimumRange = wail ? 1 : facts.minimumRange;
    const maximumRange = wail ? WAIL_THREAT_RADIUS_V7 : facts.maximumRange;
    const directlyThreatened = d >= minimumRange && d <= maximumRange;
    const reachableThreat =
      context?.threatenedTiles.get(hostile.id)?.has(coordKey(at)) ?? false;
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
  return total;
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

function publicProjectedDamageWithLookupV7(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  defender: PublicUnitV7,
  defenderAt: CoordV7,
  options: {
    readonly maximumCharge?: boolean;
    /** Revision 17 Gang Up estimate (Goblin matches only). */
    readonly bonusAttack2?: number;
  },
  lookup?: PolicyLookupV7,
): number {
  const attackRule = unitRoleRuleV7(view, attacker);
  const defenseRule = unitRoleRuleV7(view, defender);
  const attackFacts = publicCombatFacts(view, attacker, lookup);
  const publishedAttack2 = attackFacts.attack2;
  const attack2 =
    (options.maximumCharge &&
    attacker.form === "LAND" &&
    attackFacts.abilities.includes("CHARGE")
      ? Math.max(publishedAttack2, attackRule.attack2 + 2)
      : publishedAttack2) + (options.bonusAttack2 ?? 0);
  if (!Number.isInteger(attack2)) return 0;
  const bonus = projectedDefenseBonus(view, defender, defenderAt);
  const defenderTile = findPublicTileV7(view, defenderAt);
  const fortificationLevel =
    defender.form === "LAND" &&
    defenderTile?.explored === true &&
    defenderTile.territoryOwnerId === defender.ownerId
      ? (defenderTile.fortificationLevel ?? 0)
      : 0;
  const defense2 =
    defender.form === "EMBARKED"
      ? 2
      : defenseRule.defense2 + fortificationLevel * 2;
  const attackForceNumerator = BigInt(attack2) * BigInt(attacker.hp);
  const attackForceDenominator = 2n * BigInt(attacker.maxHp);
  const defenseForceNumerator =
    BigInt(defense2) * BigInt(defender.hp) * BigInt(bonus.numerator);
  const defenseForceDenominator =
    2n * BigInt(defender.maxHp) * BigInt(bonus.denominator);
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const denominator = (attackOnCommon + defenseOnCommon) * 4n;
  if (denominator <= 0n) return 0;
  return Math.min(
    defender.hp,
    Number(
      (2n * attackOnCommon * BigInt(attack2) * 9n + denominator) /
        (2n * denominator),
    ),
  );
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
  const tile = findPublicTileV7(view, at);
  return tile?.explored === true &&
    (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN")
    ? { numerator: 3, denominator: 2 }
    : { numerator: 1, denominator: 1 };
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

function attributableCityIncome(
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
  if (unit === undefined) return false;
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
  return unit.role === "JUGGERNAUT"
    ? 40 + rule.attack2 + rule.defense2 + 8 + unit.kills * 2
    : (rule.cost ?? 0) * 4 + unit.hp + unit.kills * 2;
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
  return unit.role === "JUGGERNAUT"
    ? 40 +
        rule.attack2 +
        rule.defense2 +
        (rule.abilities.includes("PUSH") ? 8 : 0)
    : (rule.cost ?? 0) * 4 + unit.hp + necromancer + plagueSource;
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
  );
  const assigned = view.units.filter(
    (unit) => unit.ownerId === view.viewer.id && unit.homeCityId === cityId,
  ).length;
  return capacity - assigned;
}

function trainingCostV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "TRAIN" | "TRAIN_NAVAL" }>,
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
        modifiers: embarked ? [] : stat.modifiers,
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
                    embarked ? 0 : role.attack2 + charge2 + inspired2,
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
      : command.kind === "TRAIN"
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
    (view.setup.aiMode === "COOPERATIVE" &&
      left !== view.humanPlayerId &&
      right !== view.humanPlayerId)
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
