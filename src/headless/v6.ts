import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6,
  NormalPolicyErrorV6,
  chooseNormalCommandV6,
} from "../ai/v6";
import type { PlayerId } from "../engine/model/ids";
import { canonicalHash, canonicalJson } from "../engine/replay/canonical";
import { effectiveRoleRuleV6 } from "../engine/rules/ruleset-v6";
import type { CommandV6 } from "../engine/v6/commands";
import {
  arePlayersAlliedV6,
  marketIncomeForCityV6,
} from "../engine/v6/economy";
import type { DomainEventV6 } from "../engine/v6/events";
import {
  queryCombatPreviewV6,
  queryHealPreviewV6,
  queryPlayerCommandsV6,
  previewEconomicV6,
} from "../engine/v6/query";
import {
  applyCommandV6,
  createPlayableGameV6,
  type ApplyCommandResultV6,
  type CreatePlayableGameResultV6,
} from "../engine/v6/reducer";
import {
  runReplayV6,
  type ReplayFileV6,
  type ReplayRunResultV6,
} from "../engine/v6/replay";
import { spatialContributionAtV6 } from "../engine/v6/spatial-economy";
import {
  COMMAND_KIND_ORDER_V6,
  ECONOMIC_IMPROVEMENT_IDS,
  FACTION_TREE_IDS,
  RESOURCE_IDS,
  REWARD_IDS_V6,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  type AiCountV6,
  type AiModeV6,
  type BoardSizeV6,
  type EconomicImprovementId,
  type FactionIdV6,
  type FactionTreeId,
  type GameStateV6,
  type MatchOutcomeV6,
  type MatchSetupV6,
  type ResourceId,
  type RewardIdV6,
  type TechnologyId,
  type UnitRoleId,
} from "../engine/v6/types";
import { viewForV6, type PlayerViewV6 } from "../engine/v6/view";

export const V6_MATCH_MAX_COMMANDS_DEFAULT = 30_000;
export const V6_MATCH_MAX_ROUNDS_DEFAULT = 750;
export const V6_PUBLIC_EQUALITY_COMMAND_LIMIT = 32;

export type AiMatchTerminationV6 =
  "OUTCOME" | "COMMAND_CAP" | "ROUND_CAP" | "STALL" | "ERROR";

export interface AiDiagnosticV6 {
  readonly code: string;
  readonly message: string;
  readonly commandIndex: number;
  readonly round: number;
  readonly playerId: PlayerId | null;
}

export interface AiCommandRecordV6 {
  readonly index: number;
  readonly playerId: PlayerId;
  readonly command: CommandV6;
  readonly events: readonly DomainEventV6[];
  readonly stateHash: string;
}

export interface IncomeSourceMetricV6 {
  readonly base: number;
  readonly capital: number;
  readonly market: number;
  readonly negativePopulation: number;
  readonly total: number;
}

export interface PublicEqualityMetricsV6 {
  readonly commandChecks: number;
  readonly economicPreviewChecks: number;
  readonly combatPreviewChecks: number;
  readonly healPreviewChecks: number;
  readonly mismatches: number;
}

export interface RelationshipViolationMetricsV6 {
  readonly hostileCommandsAgainstAllies: number;
  readonly alliedTerritoryPathSteps: number;
  readonly alliedRollVictims: number;
  readonly alliedTerritoryCandify: number;
  readonly alliedTerritoryWalls: number;
  readonly total: number;
}

export interface HeadlessMetricsV6 {
  readonly factionsBySeat: readonly FactionIdV6[];
  readonly factionTreesBySeat: readonly FactionTreeId[];
  readonly commandsByKind: Readonly<Record<string, number>>;
  readonly eventsByKind: Readonly<Record<string, number>>;
  readonly coinsEarned: number;
  readonly coinsSpent: number;
  readonly incomeByCitySource: Readonly<Record<string, IncomeSourceMetricV6>>;
  readonly negativePopulationIncomeReduction: number;
  readonly resourcesGenerated: Readonly<Record<ResourceId, number>>;
  readonly resourcesRevealed: Readonly<Record<ResourceId, number>>;
  readonly resourcesConsumed: Readonly<Record<ResourceId, number>>;
  readonly improvementsBuilt: Readonly<Record<EconomicImprovementId, number>>;
  readonly improvementsRemoved: Readonly<Record<EconomicImprovementId, number>>;
  readonly roadsBuilt: number;
  readonly treasuresGenerated: number;
  readonly treasuresCaptured: number;
  readonly treasureCoinRewards: number;
  readonly treasureHeavyRewards: number;
  readonly treasureHeavyFallbacks: number;
  readonly liveContributionHistograms: Readonly<
    Record<EconomicImprovementId | "ROAD", Readonly<Record<string, number>>>
  >;
  readonly windmillClusterSizes: Readonly<Record<string, number>>;
  readonly sawmillClusterSizes: Readonly<Record<string, number>>;
  readonly forgeMineAdjacency: Readonly<Record<string, number>>;
  readonly stoneworksAdjacency: Readonly<Record<string, number>>;
  readonly stoneworksOppositePairs: Readonly<Record<string, number>>;
  readonly workshopBasicDiversity: Readonly<Record<string, number>>;
  readonly grandWorksProcessorDiversity: Readonly<Record<string, number>>;
  readonly marketFamilyCounts: Readonly<Record<string, number>>;
  readonly marketCapitalRoadBonus: number;
  readonly cityLevelsBeyondFive: Readonly<Record<string, number>>;
  readonly negativePopulationOccurrences: number;
  readonly rewardChoices: Readonly<Record<RewardIdV6, number>>;
  readonly footprintStates: Readonly<Record<"3x3" | "5x5", number>>;
  readonly capacityStates: Readonly<Record<"BELOW" | "AT" | "OVER", number>>;
  readonly researchByTech: Readonly<Record<TechnologyId, number>>;
  readonly researchByFactionTree: Readonly<
    Record<FactionTreeId, Readonly<Record<TechnologyId, number>>>
  >;
  readonly trainedByRole: Readonly<Record<UnitRoleId, number>>;
  readonly actionsByRole: Readonly<Record<UnitRoleId, number>>;
  readonly killsByRole: Readonly<Record<UnitRoleId, number>>;
  readonly lossesByRole: Readonly<Record<UnitRoleId, number>>;
  readonly trainedByEffectiveLabel: Readonly<Record<string, number>>;
  readonly actionsByEffectiveLabel: Readonly<Record<string, number>>;
  readonly killsByEffectiveLabel: Readonly<Record<string, number>>;
  readonly lossesByEffectiveLabel: Readonly<Record<string, number>>;
  readonly abilityActions: Readonly<
    Record<
      "HEAL" | "CHARGE" | "PUSH" | "BREACH" | "ROLL" | "WALL" | "CANDIFY",
      number
    >
  >;
  readonly publicEquality: PublicEqualityMetricsV6;
  readonly relationshipViolations: RelationshipViolationMetricsV6;
  readonly errors: number;
  readonly stalls: number;
  readonly commandCapHits: number;
  readonly roundCapHits: number;
  readonly commandHash: string;
  readonly eventHash: string;
  readonly checkpointHash: string;
  readonly finalHash: string;
  readonly mapHash: string;
  readonly postGenerationPrngHash: string;
  readonly finalPrngHash: string;
}

export interface AiMatchOptionsV6 {
  readonly maxCommands?: number;
  readonly maxRounds?: number;
  readonly maxCommandsPerTurn?: number;
  readonly recordCheckpointHashes?: boolean;
}

export interface AiMatchResultV6 {
  readonly outcome: MatchOutcomeV6 | null;
  readonly termination: AiMatchTerminationV6;
  readonly acceptedCommands: number;
  readonly rounds: number;
  readonly state: GameStateV6;
  readonly stateHash: string;
  readonly events: readonly DomainEventV6[];
  readonly commandLog: readonly AiCommandRecordV6[];
  readonly errors: readonly AiDiagnosticV6[];
  readonly stalls: readonly AiDiagnosticV6[];
  readonly metrics: HeadlessMetricsV6;
}

export interface AiBatchOptionsV6 {
  readonly seeds: readonly number[];
  readonly aiCounts: readonly AiCountV6[];
  readonly maxCommands?: number;
  readonly maxRounds?: number;
  readonly boardSize?: BoardSizeV6;
  readonly modes?: readonly AiModeV6[];
  readonly factions?: readonly FactionIdV6[];
}

export interface AiBatchEntryV6 {
  readonly seed: number;
  readonly aiCount: AiCountV6;
  readonly aiMode: AiModeV6;
  readonly outcome: MatchOutcomeV6 | null;
  readonly termination: AiMatchTerminationV6;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: number;
  readonly stalls: number;
  readonly capFailure: boolean;
  readonly finalHash: string;
  readonly commandHash: string;
  readonly eventHash: string;
  readonly checkpointHash: string;
  readonly metrics: HeadlessMetricsV6;
}

export interface AiBatchSummaryV6 {
  readonly matches: number;
  readonly completed: number;
  readonly failed: number;
  readonly capped: number;
  readonly errors: number;
  readonly stalls: number;
  readonly totalRounds: number;
  readonly totalCommands: number;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly entries: readonly AiBatchEntryV6[];
}

export interface HeadlessApiV6 {
  create(setup: MatchSetupV6): Promise<CreatePlayableGameResultV6>;
  apply(
    state: GameStateV6,
    actor: PlayerId,
    command: CommandV6,
  ): Promise<ApplyCommandResultV6>;
  viewFor(state: GameStateV6, viewer: PlayerId): Promise<PlayerViewV6>;
  run(
    replay: ReplayFileV6,
    options?: { readonly stopAfter?: number },
  ): Promise<ReplayRunResultV6>;
  runAiMatch(
    setup: MatchSetupV6,
    options?: AiMatchOptionsV6,
  ): Promise<AiMatchResultV6>;
  runAiBatch(options: AiBatchOptionsV6): Promise<AiBatchSummaryV6>;
}

export const headlessV6: HeadlessApiV6 = {
  async create(setup) {
    return Promise.resolve(createPlayableGameV6(setup));
  },
  async apply(state, actor, command) {
    return Promise.resolve(applyCommandV6(state, actor, command));
  },
  async viewFor(state, viewer) {
    return Promise.resolve(viewForV6(state, viewer));
  },
  async run(replay, options = {}) {
    return Promise.resolve(runReplayV6(replay, options));
  },
  async runAiMatch(setup, options = {}) {
    return Promise.resolve(runAiMatchV6(setup, options));
  },
  async runAiBatch(options) {
    return runAiBatchV6(options);
  },
};

export function runAiMatchV6(
  setup: MatchSetupV6,
  options: AiMatchOptionsV6 = {},
): AiMatchResultV6 {
  return runAiMatchInternalV6(setup, options, true);
}

function runAiMatchInternalV6(
  setup: MatchSetupV6,
  options: AiMatchOptionsV6,
  recordCommands: boolean,
): AiMatchResultV6 {
  const maxCommands = options.maxCommands ?? V6_MATCH_MAX_COMMANDS_DEFAULT;
  const maxRounds = options.maxRounds ?? V6_MATCH_MAX_ROUNDS_DEFAULT;
  const maxCommandsPerTurn =
    options.maxCommandsPerTurn ?? NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6;
  validatePositiveCap(maxCommands, "maxCommands");
  validatePositiveCap(maxRounds, "maxRounds");
  validatePositiveCap(maxCommandsPerTurn, "maxCommandsPerTurn");
  if (maxCommandsPerTurn > NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6) {
    throw new RangeError("maxCommandsPerTurn exceeds the Normal v6 limit");
  }
  const created = createPlayableGameV6(setup);
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  let state = created.state;
  const allEvents: DomainEventV6[] = [...created.events];
  const allCommands: CommandV6[] = [];
  const checkpointHashes: string[] = [];
  const commandLog: AiCommandRecordV6[] = [];
  const errors: AiDiagnosticV6[] = [];
  const stalls: AiDiagnosticV6[] = [];
  const metrics = createMetricsV6(state);
  const revealedResources = new Set<string>();
  recordPublicResourcesV6(state, metrics.resourcesRevealed, revealedResources);
  recordIncomeEventsV6(state, created.events, metrics);
  recordStateSnapshotV6(state, metrics);
  let termination: AiMatchTerminationV6 = "COMMAND_CAP";
  let turnPlayerId = activePlayerIdV6(state);
  let commandsThisTurn = 0;

  while (state.outcome === null) {
    if (state.commandIndex >= maxCommands) {
      metrics.commandCapHits += 1;
      termination = "COMMAND_CAP";
      break;
    }
    if (state.round > maxRounds) {
      metrics.roundCapHits += 1;
      termination = "ROUND_CAP";
      break;
    }
    const playerId = activePlayerIdV6(state);
    if (playerId !== turnPlayerId) {
      turnPlayerId = playerId;
      commandsThisTurn = 0;
    }
    const view = viewForV6(state, playerId);
    if (state.commandIndex < V6_PUBLIC_EQUALITY_COMMAND_LIMIT) {
      auditPublicEqualityV6(view, metrics.publicEquality);
    }
    let command: CommandV6 | null;
    try {
      command = chooseNormalTurnCommandV6(
        view,
        commandsThisTurn,
        maxCommandsPerTurn,
      );
    } catch (cause) {
      const turnCap = cause instanceof NormalTurnCommandCapErrorV6;
      const code = turnCap
        ? "TURN_COMMAND_CAP_EXCEEDED"
        : cause instanceof NormalPolicyErrorV6
          ? `POLICY_ERROR:${cause.code}`
          : "POLICY_ERROR";
      errors.push(
        makeDiagnosticV6(
          state,
          playerId,
          code,
          cause instanceof Error ? cause.message : "Policy failed",
        ),
      );
      metrics.errors += 1;
      termination = "ERROR";
      break;
    }
    if (command === null) {
      stalls.push(
        makeDiagnosticV6(
          state,
          playerId,
          "NO_PUBLIC_COMMAND",
          "Observation-safe query returned no command for the active player",
        ),
      );
      metrics.stalls += 1;
      termination = "STALL";
      break;
    }
    const before = state;
    const beforeIndex = state.commandIndex;
    auditRelationshipCommandV6(before, playerId, command, metrics);
    recordCommandCostV6(view, command, metrics);
    const applied = applyCommandV6(state, playerId, command);
    if (!applied.accepted) {
      errors.push(
        makeDiagnosticV6(
          state,
          playerId,
          `COMMAND_REJECTED:${applied.error.code}`,
          `AI-selected ${command.kind} was rejected`,
        ),
      );
      metrics.errors += 1;
      termination = "ERROR";
      break;
    }
    state = applied.state;
    allCommands.push(command);
    allEvents.push(...applied.events);
    const checkpoint = canonicalHash(state);
    checkpointHashes.push(checkpoint);
    if (recordCommands) {
      commandLog.push({
        index: state.commandIndex,
        playerId,
        command,
        events: applied.events,
        stateHash: options.recordCheckpointHashes === false ? "" : checkpoint,
      });
    }
    recordAcceptedCommandV6(
      before,
      state,
      playerId,
      command,
      applied.events,
      metrics,
    );
    recordPublicResourcesV6(
      state,
      metrics.resourcesRevealed,
      revealedResources,
    );
    recordStateSnapshotV6(state, metrics);
    commandsThisTurn += 1;
    if (state.commandIndex !== beforeIndex + 1) {
      stalls.push(
        makeDiagnosticV6(
          state,
          playerId,
          "NO_COMMAND_PROGRESS",
          "Accepted command did not advance commandIndex",
        ),
      );
      metrics.stalls += 1;
      termination = "STALL";
      break;
    }
    if (command.kind === "END_TURN") commandsThisTurn = 0;
  }
  if (state.outcome !== null) termination = "OUTCOME";
  const stateHash = canonicalHash(state);
  metrics.commandHash = canonicalHash(allCommands);
  metrics.eventHash = canonicalHash(allEvents);
  metrics.checkpointHash = canonicalHash(checkpointHashes);
  metrics.finalHash = stateHash;
  metrics.finalPrngHash = canonicalHash(state.random);
  return {
    outcome: state.outcome,
    termination,
    acceptedCommands: state.commandIndex,
    rounds: state.round,
    state,
    stateHash,
    events: allEvents,
    commandLog,
    errors,
    stalls,
    metrics,
  };
}

export class NormalTurnCommandCapErrorV6 extends Error {
  constructor() {
    super("Pending choices and End Turn cannot drain within the turn cap");
    this.name = "NormalTurnCommandCapErrorV6";
  }
}

export function chooseNormalTurnCommandV6(
  view: PlayerViewV6,
  commandsThisTurn: number,
  maxCommandsPerTurn: number,
): CommandV6 | null {
  const reservedSlots = view.pendingChoices.length + 1;
  if (reservedSlots > maxCommandsPerTurn - commandsThisTurn) {
    throw new NormalTurnCommandCapErrorV6();
  }
  if (commandsThisTurn >= maxCommandsPerTurn - reservedSlots) {
    return view.pendingChoices.length > 0
      ? chooseNormalCommandV6(view).command
      : { kind: "END_TURN" };
  }
  return chooseNormalCommandV6(view).command;
}

export async function runAiBatchV6(
  options: AiBatchOptionsV6,
): Promise<AiBatchSummaryV6> {
  if (options.seeds.length === 0) throw new RangeError("seeds cannot be empty");
  if (options.aiCounts.length === 0) {
    throw new RangeError("aiCounts cannot be empty");
  }
  const modes = options.modes ?? (["RIVAL"] as const);
  if (modes.length === 0) throw new RangeError("modes cannot be empty");
  const entries: AiBatchEntryV6[] = [];
  for (const aiMode of modes) {
    for (const aiCount of options.aiCounts) {
      const size =
        options.boardSize ?? (aiCount === 1 ? 11 : aiCount === 2 ? 14 : 16);
      const factions =
        options.factions ??
        Array.from({ length: aiCount + 1 }, () => "ORIGINAL" as const);
      if (factions.length !== aiCount + 1) {
        throw new RangeError("factions length must equal aiCount + 1");
      }
      for (const seed of options.seeds) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        const result = runAiMatchInternalV6(
          {
            rulesetId: "pulp-wars-poc-6",
            mapGenerationRevision: "SPATIAL_ECONOMY",
            seed,
            width: size,
            height: size,
            aiCount,
            aiDifficulty: "NORMAL",
            aiMode,
            humanColor: "CORAL",
            factions,
          },
          {
            maxCommands: options.maxCommands ?? V6_MATCH_MAX_COMMANDS_DEFAULT,
            maxRounds: options.maxRounds ?? V6_MATCH_MAX_ROUNDS_DEFAULT,
          },
          false,
        );
        entries.push({
          seed,
          aiCount,
          aiMode,
          outcome: result.outcome,
          termination: result.termination,
          rounds: result.rounds,
          commands: result.acceptedCommands,
          errors: result.errors.length,
          stalls: result.stalls.length,
          capFailure:
            result.termination === "COMMAND_CAP" ||
            result.termination === "ROUND_CAP",
          finalHash: result.stateHash,
          commandHash: result.metrics.commandHash,
          eventHash: result.metrics.eventHash,
          checkpointHash: result.metrics.checkpointHash,
          metrics: result.metrics,
        });
      }
    }
  }
  const outcomes: Record<string, number> = {};
  for (const entry of entries)
    increment(outcomes, entry.outcome?.kind ?? entry.termination);
  const failed = entries.filter(
    (entry) => entry.termination !== "OUTCOME",
  ).length;
  return {
    matches: entries.length,
    completed: entries.length - failed,
    failed,
    capped: entries.filter((entry) => entry.capFailure).length,
    errors: entries.reduce((total, entry) => total + entry.errors, 0),
    stalls: entries.reduce((total, entry) => total + entry.stalls, 0),
    totalRounds: entries.reduce((total, entry) => total + entry.rounds, 0),
    totalCommands: entries.reduce((total, entry) => total + entry.commands, 0),
    outcomes,
    entries,
  };
}

interface MutablePublicEqualityMetricsV6 {
  commandChecks: number;
  economicPreviewChecks: number;
  combatPreviewChecks: number;
  healPreviewChecks: number;
  mismatches: number;
}

interface MutableRelationshipViolationMetricsV6 {
  hostileCommandsAgainstAllies: number;
  alliedTerritoryPathSteps: number;
  alliedRollVictims: number;
  alliedTerritoryCandify: number;
  alliedTerritoryWalls: number;
  total: number;
}

interface MutableHeadlessMetricsV6 {
  factionsBySeat: readonly FactionIdV6[];
  factionTreesBySeat: readonly FactionTreeId[];
  commandsByKind: Record<string, number>;
  eventsByKind: Record<string, number>;
  coinsEarned: number;
  coinsSpent: number;
  incomeByCitySource: Record<string, IncomeSourceMetricV6>;
  negativePopulationIncomeReduction: number;
  resourcesGenerated: Record<ResourceId, number>;
  resourcesRevealed: Record<ResourceId, number>;
  resourcesConsumed: Record<ResourceId, number>;
  improvementsBuilt: Record<EconomicImprovementId, number>;
  improvementsRemoved: Record<EconomicImprovementId, number>;
  roadsBuilt: number;
  treasuresGenerated: number;
  treasuresCaptured: number;
  treasureCoinRewards: number;
  treasureHeavyRewards: number;
  treasureHeavyFallbacks: number;
  liveContributionHistograms: Record<
    EconomicImprovementId | "ROAD",
    Record<string, number>
  >;
  windmillClusterSizes: Record<string, number>;
  sawmillClusterSizes: Record<string, number>;
  forgeMineAdjacency: Record<string, number>;
  stoneworksAdjacency: Record<string, number>;
  stoneworksOppositePairs: Record<string, number>;
  workshopBasicDiversity: Record<string, number>;
  grandWorksProcessorDiversity: Record<string, number>;
  marketFamilyCounts: Record<string, number>;
  marketCapitalRoadBonus: number;
  cityLevelsBeyondFive: Record<string, number>;
  negativePopulationOccurrences: number;
  rewardChoices: Record<RewardIdV6, number>;
  footprintStates: Record<"3x3" | "5x5", number>;
  capacityStates: Record<"BELOW" | "AT" | "OVER", number>;
  researchByTech: Record<TechnologyId, number>;
  researchByFactionTree: Record<FactionTreeId, Record<TechnologyId, number>>;
  trainedByRole: Record<UnitRoleId, number>;
  actionsByRole: Record<UnitRoleId, number>;
  killsByRole: Record<UnitRoleId, number>;
  lossesByRole: Record<UnitRoleId, number>;
  trainedByEffectiveLabel: Record<string, number>;
  actionsByEffectiveLabel: Record<string, number>;
  killsByEffectiveLabel: Record<string, number>;
  lossesByEffectiveLabel: Record<string, number>;
  abilityActions: Record<
    "HEAL" | "CHARGE" | "PUSH" | "BREACH" | "ROLL" | "WALL" | "CANDIFY",
    number
  >;
  publicEquality: MutablePublicEqualityMetricsV6;
  relationshipViolations: MutableRelationshipViolationMetricsV6;
  errors: number;
  stalls: number;
  commandCapHits: number;
  roundCapHits: number;
  commandHash: string;
  eventHash: string;
  checkpointHash: string;
  finalHash: string;
  mapHash: string;
  postGenerationPrngHash: string;
  finalPrngHash: string;
}

function createMetricsV6(state: GameStateV6): MutableHeadlessMetricsV6 {
  const resourcesGenerated = zeroRecord(RESOURCE_IDS);
  for (const tile of state.board.tiles) {
    if (tile.resource !== null) resourcesGenerated[tile.resource] += 1;
  }
  const contributionHistograms = Object.fromEntries(
    [...ECONOMIC_IMPROVEMENT_IDS, "ROAD"].map((id) => [id, {}]),
  ) as Record<EconomicImprovementId | "ROAD", Record<string, number>>;
  return {
    factionsBySeat: [...state.setup.factions],
    factionTreesBySeat: state.players
      .slice()
      .sort((left, right) => left.seat - right.seat)
      .map((player) => player.factionTreeId),
    commandsByKind: zeroStringRecord(COMMAND_KIND_ORDER_V6),
    eventsByKind: {},
    coinsEarned: 0,
    coinsSpent: 0,
    incomeByCitySource: {},
    negativePopulationIncomeReduction: 0,
    resourcesGenerated,
    resourcesRevealed: zeroRecord(RESOURCE_IDS),
    resourcesConsumed: zeroRecord(RESOURCE_IDS),
    improvementsBuilt: zeroRecord(ECONOMIC_IMPROVEMENT_IDS),
    improvementsRemoved: zeroRecord(ECONOMIC_IMPROVEMENT_IDS),
    roadsBuilt: 0,
    treasuresGenerated: state.treasureChests.length,
    treasuresCaptured: 0,
    treasureCoinRewards: 0,
    treasureHeavyRewards: 0,
    treasureHeavyFallbacks: 0,
    liveContributionHistograms: contributionHistograms,
    windmillClusterSizes: {},
    sawmillClusterSizes: {},
    forgeMineAdjacency: {},
    stoneworksAdjacency: {},
    stoneworksOppositePairs: {},
    workshopBasicDiversity: {},
    grandWorksProcessorDiversity: {},
    marketFamilyCounts: {},
    marketCapitalRoadBonus: 0,
    cityLevelsBeyondFive: {},
    negativePopulationOccurrences: 0,
    rewardChoices: zeroRecord(REWARD_IDS_V6),
    footprintStates: { "3x3": 0, "5x5": 0 },
    capacityStates: { BELOW: 0, AT: 0, OVER: 0 },
    researchByTech: zeroRecord(TECHNOLOGY_IDS),
    researchByFactionTree: Object.fromEntries(
      FACTION_TREE_IDS.map((id) => [id, zeroRecord(TECHNOLOGY_IDS)]),
    ) as Record<FactionTreeId, Record<TechnologyId, number>>,
    trainedByRole: zeroRecord(UNIT_ROLE_IDS),
    actionsByRole: zeroRecord(UNIT_ROLE_IDS),
    killsByRole: zeroRecord(UNIT_ROLE_IDS),
    lossesByRole: zeroRecord(UNIT_ROLE_IDS),
    trainedByEffectiveLabel: {},
    actionsByEffectiveLabel: {},
    killsByEffectiveLabel: {},
    lossesByEffectiveLabel: {},
    abilityActions: {
      HEAL: 0,
      CHARGE: 0,
      PUSH: 0,
      BREACH: 0,
      ROLL: 0,
      WALL: 0,
      CANDIFY: 0,
    },
    publicEquality: {
      commandChecks: 0,
      economicPreviewChecks: 0,
      combatPreviewChecks: 0,
      healPreviewChecks: 0,
      mismatches: 0,
    },
    relationshipViolations: {
      hostileCommandsAgainstAllies: 0,
      alliedTerritoryPathSteps: 0,
      alliedRollVictims: 0,
      alliedTerritoryCandify: 0,
      alliedTerritoryWalls: 0,
      total: 0,
    },
    errors: 0,
    stalls: 0,
    commandCapHits: 0,
    roundCapHits: 0,
    commandHash: "",
    eventHash: "",
    checkpointHash: "",
    finalHash: "",
    mapHash: canonicalHash({
      board: state.board,
      treasureChests: state.treasureChests,
    }),
    postGenerationPrngHash: canonicalHash(state.random),
    finalPrngHash: "",
  };
}

function auditPublicEqualityV6(
  view: PlayerViewV6,
  metrics: MutablePublicEqualityMetricsV6,
): void {
  const first = queryPlayerCommandsV6(view);
  const equalView = JSON.parse(canonicalJson(view)) as PlayerViewV6;
  const second = queryPlayerCommandsV6(equalView);
  metrics.commandChecks += 1;
  if (canonicalJson(first) !== canonicalJson(second)) metrics.mismatches += 1;
  for (const command of first) {
    const economicA = previewEconomicV6(view, command);
    if (economicA.ok) {
      metrics.economicPreviewChecks += 1;
      if (
        canonicalJson(economicA) !==
        canonicalJson(previewEconomicV6(equalView, command))
      ) {
        metrics.mismatches += 1;
      }
    }
    if (command.kind === "ATTACK") {
      metrics.combatPreviewChecks += 1;
      if (
        canonicalJson(
          queryCombatPreviewV6(view, command.unitId, command.target),
        ) !==
        canonicalJson(
          queryCombatPreviewV6(equalView, command.unitId, command.target),
        )
      ) {
        metrics.mismatches += 1;
      }
    }
    if (command.kind === "HEAL_ADJACENT") {
      metrics.healPreviewChecks += 1;
      if (
        canonicalJson(
          queryHealPreviewV6(view, command.unitId, command.targetUnitId),
        ) !==
        canonicalJson(
          queryHealPreviewV6(equalView, command.unitId, command.targetUnitId),
        )
      ) {
        metrics.mismatches += 1;
      }
    }
  }
}

function recordCommandCostV6(
  view: PlayerViewV6,
  command: CommandV6,
  metrics: MutableHeadlessMetricsV6,
): void {
  const economic = previewEconomicV6(view, command);
  if (economic.ok) {
    metrics.coinsSpent += economic.preview.cost;
    return;
  }
  if (command.kind === "RESEARCH") {
    const node = view.viewer.researchedTechs.includes(command.tech)
      ? null
      : queryPlayerCommandsV6(view).some(
            (candidate) =>
              candidate.kind === "RESEARCH" && candidate.tech === command.tech,
          )
        ? command.tech
        : null;
    if (node !== null) {
      const cityCount = view.cities.filter(
        (city) => city.ownerId === view.viewer.id,
      ).length;
      const ordinal = TECHNOLOGY_IDS.indexOf(node);
      const tier =
        ordinal % 5 === 0 ? 1 : ordinal % 5 === 1 || ordinal % 5 === 3 ? 2 : 3;
      metrics.coinsSpent +=
        tier === 1
          ? 5 + cityCount - 1
          : tier === 2
            ? 7 + 2 * (cityCount - 1)
            : 9 + 3 * (cityCount - 1);
    }
  } else if (command.kind === "TRAIN") {
    metrics.coinsSpent +=
      effectiveRoleRuleV6(view.viewer.faction, command.role).cost ?? 0;
  } else if (command.kind === "BUILD_CHOCOLATE_WALL") {
    metrics.coinsSpent += 1;
  }
}

function recordAcceptedCommandV6(
  before: GameStateV6,
  after: GameStateV6,
  actor: PlayerId,
  command: CommandV6,
  events: readonly DomainEventV6[],
  metrics: MutableHeadlessMetricsV6,
): void {
  metrics.commandsByKind[command.kind] =
    (metrics.commandsByKind[command.kind] ?? 0) + 1;
  const actingUnit =
    "unitId" in command
      ? before.units.find((unit) => unit.id === command.unitId)
      : undefined;
  if (actingUnit !== undefined) {
    metrics.actionsByRole[actingUnit.role] += 1;
    increment(
      metrics.actionsByEffectiveLabel,
      effectiveRoleRuleV6(
        playerFaction(before, actingUnit.ownerId),
        actingUnit.role,
      ).label,
    );
  }
  if (command.kind === "RESEARCH") {
    metrics.researchByTech[command.tech] += 1;
    const tree = before.players.find(
      (player) => player.id === actor,
    )?.factionTreeId;
    if (tree !== undefined)
      metrics.researchByFactionTree[tree][command.tech] += 1;
  }
  if (command.kind === "TRAIN") {
    metrics.trainedByRole[command.role] += 1;
    increment(
      metrics.trainedByEffectiveLabel,
      effectiveRoleRuleV6(playerFaction(before, actor), command.role).label,
    );
  }
  if (command.kind === "KAMIKAZE_ROLL") metrics.abilityActions.ROLL += 1;
  if (command.kind === "CANDIFY") metrics.abilityActions.CANDIFY += 1;
  for (const event of events) {
    if (event.kind === "INCOME_AWARDED") {
      recordIncomeEventsV6(after, [event], metrics);
      continue;
    }
    increment(metrics.eventsByKind, event.kind);
    if (event.kind === "FOREST_CLEARED") {
      metrics.coinsEarned += event.coinDelta;
    } else if (event.kind === "CITY_REWARD_CHOSEN") {
      metrics.rewardChoices[event.reward] += 1;
      if (event.reward === "STOCKPILE") metrics.coinsEarned += 4;
      if (event.reward === "TREASURY") metrics.coinsEarned += 5;
    } else if (event.kind === "FRUIT_HARVESTED") {
      metrics.resourcesConsumed.FRUIT += 1;
    } else if (event.kind === "GAME_HUNTED") {
      metrics.resourcesConsumed.GAME += 1;
    } else if (event.kind === "ECONOMIC_BUILDING_BUILT") {
      metrics.improvementsBuilt[event.improvement] += 1;
      if (event.improvement === "FARM")
        metrics.resourcesConsumed.FERTILE_GROUND += 1;
      if (event.improvement === "MINE") metrics.resourcesConsumed.ORE += 1;
      if (event.improvement === "QUARRY") metrics.resourcesConsumed.STONE += 1;
    } else if (event.kind === "ECONOMIC_BUILDING_REMOVED") {
      metrics.improvementsRemoved[event.improvement] += 1;
    } else if (event.kind === "ROAD_BUILT") {
      metrics.roadsBuilt += 1;
    } else if (event.kind === "TREASURE_CAPTURED") {
      metrics.treasuresCaptured += 1;
      if (event.grantedReward === "COINS") {
        metrics.treasureCoinRewards += 1;
        metrics.coinsEarned += event.coinDelta;
      } else {
        metrics.treasureHeavyRewards += 1;
      }
      if (event.heavyFallback) metrics.treasureHeavyFallbacks += 1;
    } else if (event.kind === "UNIT_HEALED") {
      metrics.abilityActions.HEAL += 1;
    } else if (event.kind === "UNIT_PUSHED") {
      metrics.abilityActions.PUSH += 1;
    } else if (event.kind === "COMBAT_RESOLVED") {
      if (event.preview.chargeApplied) metrics.abilityActions.CHARGE += 1;
      if (event.preview.breachApplied) metrics.abilityActions.BREACH += 1;
      recordCombatKillsV6(before, event, metrics);
    } else if (event.kind === "CHOCOLATE_WALL_BUILT") {
      metrics.abilityActions.WALL += 1;
    } else if (event.kind === "UNIT_DIED") {
      const victim = before.units.find((unit) => unit.id === event.unitId);
      if (victim !== undefined) {
        metrics.lossesByRole[victim.role] += 1;
        increment(
          metrics.lossesByEffectiveLabel,
          effectiveRoleRuleV6(
            playerFaction(before, victim.ownerId),
            victim.role,
          ).label,
        );
      }
      if (
        event.cause === "KAMIKAZE_ROLL" &&
        actingUnit !== undefined &&
        event.unitId !== actingUnit.id
      ) {
        metrics.killsByRole[actingUnit.role] += 1;
        increment(
          metrics.killsByEffectiveLabel,
          effectiveRoleRuleV6(
            playerFaction(before, actingUnit.ownerId),
            actingUnit.role,
          ).label,
        );
      }
    }
  }
  auditRelationshipEventsV6(before, actor, command, events, metrics);
}

function recordCombatKillsV6(
  state: GameStateV6,
  event: Extract<DomainEventV6, { readonly kind: "COMBAT_RESOLVED" }>,
  metrics: MutableHeadlessMetricsV6,
): void {
  const attacker = state.units.find(
    (unit) => unit.id === event.preview.attackerId,
  );
  if (attacker === undefined) return;
  if (event.preview.defenderDies && event.preview.target.kind === "UNIT") {
    metrics.killsByRole[attacker.role] += 1;
    increment(
      metrics.killsByEffectiveLabel,
      effectiveRoleRuleV6(playerFaction(state, attacker.ownerId), attacker.role)
        .label,
    );
  }
  if (event.preview.attackerDies && event.preview.target.kind === "UNIT") {
    const defenderId = event.preview.target.unitId;
    const defender = state.units.find((unit) => unit.id === defenderId);
    if (defender !== undefined) {
      metrics.killsByRole[defender.role] += 1;
      increment(
        metrics.killsByEffectiveLabel,
        effectiveRoleRuleV6(
          playerFaction(state, defender.ownerId),
          defender.role,
        ).label,
      );
    }
  }
}

function recordLiveContributionV6(
  state: GameStateV6,
  at: { readonly x: number; readonly y: number },
  improvement: EconomicImprovementId,
  metrics: MutableHeadlessMetricsV6,
): void {
  const value = spatialContributionAtV6(state, at, improvement);
  increment(
    metrics.liveContributionHistograms[improvement],
    String(value.population),
  );
  if (improvement === "WINDMILL")
    increment(
      metrics.windmillClusterSizes,
      String(value.contributingTiles.length),
    );
  if (improvement === "SAWMILL")
    increment(
      metrics.sawmillClusterSizes,
      String(value.contributingTiles.length),
    );
  if (improvement === "FORGE")
    increment(
      metrics.forgeMineAdjacency,
      String(value.contributingTiles.length),
    );
  if (improvement === "STONEWORKS") {
    increment(
      metrics.stoneworksAdjacency,
      String(value.contributingTiles.length),
    );
    increment(
      metrics.stoneworksOppositePairs,
      String(value.oppositePairAxes.length),
    );
  }
  if (improvement === "WORKSHOP")
    increment(
      metrics.workshopBasicDiversity,
      String(value.distinctTypes.length),
    );
  if (improvement === "GRAND_WORKS")
    increment(
      metrics.grandWorksProcessorDiversity,
      String(value.distinctTypes.length),
    );
  if (improvement === "MARKET") {
    increment(
      metrics.marketFamilyCounts,
      String(value.distinctFamilies.length),
    );
    if (value.capitalRoadConnected) metrics.marketCapitalRoadBonus += 1;
  }
}

function recordStateSnapshotV6(
  state: GameStateV6,
  metrics: MutableHeadlessMetricsV6,
): void {
  for (const tile of state.board.tiles) {
    if (tile.improvement !== null) {
      recordLiveContributionV6(state, tile.at, tile.improvement, metrics);
    }
    if (tile.road) increment(metrics.liveContributionHistograms.ROAD, "1");
  }
  for (const city of state.cities) {
    metrics.footprintStates[city.expanded ? "5x5" : "3x3"] += 1;
    if (city.level > 5)
      increment(metrics.cityLevelsBeyondFive, String(city.level));
    if (city.population < 0) metrics.negativePopulationOccurrences += 1;
    const count = state.units.filter(
      (unit) => unit.hp > 0 && unit.homeCityId === city.id,
    ).length;
    const capacity = city.level + 1;
    metrics.capacityStates[
      count < capacity ? "BELOW" : count === capacity ? "AT" : "OVER"
    ] += 1;
  }
}

function recordIncomeEventsV6(
  state: GameStateV6,
  events: readonly DomainEventV6[],
  metrics: MutableHeadlessMetricsV6,
): void {
  for (const event of events) {
    if (event.kind !== "INCOME_AWARDED") {
      increment(metrics.eventsByKind, event.kind);
      continue;
    }
    increment(metrics.eventsByKind, event.kind);
    metrics.coinsEarned += event.totalCoins;
    for (const entry of event.cities) {
      const city = state.cities.find((value) => value.id === entry.cityId);
      if (city === undefined) continue;
      const market = marketIncomeForCityV6(state, city);
      const negativePopulation = Math.min(0, city.population);
      const capital = city.isCapital ? 1 : 0;
      const prior = metrics.incomeByCitySource[String(city.id)] ?? {
        base: 0,
        capital: 0,
        market: 0,
        negativePopulation: 0,
        total: 0,
      };
      metrics.incomeByCitySource[String(city.id)] = {
        base: prior.base + city.level,
        capital: prior.capital + capital,
        market: prior.market + market,
        negativePopulation: prior.negativePopulation + negativePopulation,
        total: prior.total + entry.coins,
      };
      metrics.negativePopulationIncomeReduction += -negativePopulation;
    }
  }
}

function recordPublicResourcesV6(
  state: GameStateV6,
  revealed: Record<ResourceId, number>,
  seen: Set<string>,
): void {
  for (const player of state.players) {
    const view = viewForV6(state, player.id);
    for (const tile of view.board.tiles) {
      if (
        !tile.explored ||
        tile.resource === null ||
        tile.resource === "UNKNOWN_RESOURCE"
      )
        continue;
      const key = `${player.id}:${tile.at.y}:${tile.at.x}:${tile.resource}`;
      if (seen.has(key)) continue;
      seen.add(key);
      revealed[tile.resource] += 1;
    }
  }
}

function auditRelationshipCommandV6(
  state: GameStateV6,
  actor: PlayerId,
  command: CommandV6,
  metrics: MutableHeadlessMetricsV6,
): void {
  if (command.kind === "ATTACK" && command.target.kind === "UNIT") {
    const targetId = command.target.unitId;
    const target = state.units.find((unit) => unit.id === targetId);
    if (
      target !== undefined &&
      arePlayersAlliedV6(state, actor, target.ownerId)
    ) {
      metrics.relationshipViolations.hostileCommandsAgainstAllies += 1;
    }
  }
  if (command.kind === "MOVE") {
    for (const at of command.path) {
      const tile = state.board.tiles[at.y * state.board.width + at.x];
      const city = state.cities.find(
        (value) => value.id === tile?.territoryCityId,
      );
      if (
        city !== undefined &&
        arePlayersAlliedV6(state, actor, city.ownerId)
      ) {
        metrics.relationshipViolations.alliedTerritoryPathSteps += 1;
      }
    }
  }
  if (command.kind === "BUILD_CHOCOLATE_WALL") {
    const tile =
      state.board.tiles[command.at.y * state.board.width + command.at.x];
    const city = state.cities.find(
      (value) => value.id === tile?.territoryCityId,
    );
    if (city !== undefined && arePlayersAlliedV6(state, actor, city.ownerId)) {
      metrics.relationshipViolations.alliedTerritoryWalls += 1;
    }
  }
  metrics.relationshipViolations.total = relationshipTotal(
    metrics.relationshipViolations,
  );
}

function auditRelationshipEventsV6(
  state: GameStateV6,
  actor: PlayerId,
  command: CommandV6,
  events: readonly DomainEventV6[],
  metrics: MutableHeadlessMetricsV6,
): void {
  for (const event of events) {
    if (event.kind === "ROLL_DAMAGE_RESOLVED") {
      const target = event.target;
      const owner =
        target.kind === "UNIT"
          ? state.units.find((unit) => unit.id === target.unitId)?.ownerId
          : state.chocolateWalls.find((wall) => wall.id === target.wallId)
              ?.ownerId;
      if (owner !== undefined && arePlayersAlliedV6(state, actor, owner)) {
        metrics.relationshipViolations.alliedRollVictims += 1;
      }
    }
    if (
      event.kind === "TILE_CANDIFIED" &&
      event.previousOwnerId !== null &&
      arePlayersAlliedV6(state, actor, event.previousOwnerId)
    ) {
      metrics.relationshipViolations.alliedTerritoryCandify += 1;
    }
  }
  if (command.kind === "CAPTURE") {
    const captured = events.find((event) => event.kind === "CITY_CAPTURED");
    if (
      captured?.from !== null &&
      captured?.from !== undefined &&
      arePlayersAlliedV6(state, actor, captured.from)
    ) {
      metrics.relationshipViolations.hostileCommandsAgainstAllies += 1;
    }
  }
  metrics.relationshipViolations.total = relationshipTotal(
    metrics.relationshipViolations,
  );
}

function relationshipTotal(
  metrics: MutableRelationshipViolationMetricsV6,
): number {
  return (
    metrics.hostileCommandsAgainstAllies +
    metrics.alliedTerritoryPathSteps +
    metrics.alliedRollVictims +
    metrics.alliedTerritoryCandify +
    metrics.alliedTerritoryWalls
  );
}

function playerFaction(state: GameStateV6, playerId: PlayerId): FactionIdV6 {
  const faction = state.players.find(
    (player) => player.id === playerId,
  )?.faction;
  if (faction === undefined) throw new RangeError("Player disappeared");
  return faction;
}

function activePlayerIdV6(state: GameStateV6): PlayerId {
  const playerId = state.turnOrder[state.activeSeatIndex];
  if (playerId === undefined) throw new RangeError("Active player disappeared");
  return playerId;
}

function validatePositiveCap(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`);
  }
}

function makeDiagnosticV6(
  state: GameStateV6,
  playerId: PlayerId | null,
  code: string,
  message: string,
): AiDiagnosticV6 {
  return {
    code,
    message,
    commandIndex: state.commandIndex,
    round: state.round,
    playerId,
  };
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function zeroRecord<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map((value) => [value, 0])) as Record<
    T,
    number
  >;
}

function zeroStringRecord(values: readonly string[]): Record<string, number> {
  return Object.fromEntries(values.map((value) => [value, 0]));
}
