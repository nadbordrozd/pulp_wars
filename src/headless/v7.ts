import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  NormalPolicyWorkV7,
  NormalPolicyErrorV7,
  NormalTurnCommandCapErrorV7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  type NormalAiDecisionV7,
  type ScoredAiCandidateV7,
} from "../ai/v7";
import { nextBounded, nextUint32, randomState } from "../engine/random/random";
import type { PlayerId, UnitId } from "../engine/model/ids";
import { canonicalHash, canonicalJson } from "../engine/replay/canonical";
import {
  NEUTRAL_KIND_V7,
  ORIGINAL_BASELINE_V5_TREE,
  TECHNOLOGY_BRANCH_IDS_V7,
  unitFactionV7,
  unitFliesV7,
  unitRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import { attackHasPierceV7 } from "../engine/v7/combat";
import type { CommandV7 } from "../engine/v7/commands";
import { pierceTileV7 } from "../engine/v7/martian";
import { distinctFactionsV7 } from "../engine/v7/setup";
import {
  allowedBoardSizesV7,
  autoBoardSizeV7,
  seatCountAllowedV7,
} from "../engine/v7/map-scale";
import {
  createIceFolkMetricsV7,
  createIceFolkTelemetryStateV7,
  recordIceFolkV7,
  type IceFolkMetricsV7,
  type IceFolkTelemetryStateV7,
} from "./ice-folk-telemetry-v7";
import {
  arePlayersAlliedV7,
  arePlayersHostileV7,
  assignedUnitCountV7,
  cityUnitCapacityV7,
  marketCoinsV7,
  marketIncomeForCityV7,
} from "../engine/v7/economy";
import type { DomainEventV7 } from "../engine/v7/events";
import {
  previewEconomicV7,
  previewMonumentV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
} from "../engine/v7/query";
import {
  applyCommandV7,
  createPlayableGameV7,
  type ApplyCommandResultV7,
  type CreatePlayableGameResultV7,
} from "../engine/v7/reducer";
import {
  runReplayV7,
  type ReplayFileV7,
  type ReplayRunResultV7,
} from "../engine/v7/replay";
import { PLAGUE_DURATION_TURNS_V7 } from "../engine/v7/afflictions";
import { spatialContributionAtV7 } from "../engine/v7/spatial-economy";
import {
  ACHIEVEMENT_IDS_V7,
  COMMAND_KIND_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  IMPROVEMENT_IDS_V7,
  RESOURCE_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  isNeutralOwnerV7,
  type AchievementIdV7,
  type AiCountV7,
  type BoardSizeV7,
  type CuriosityKindV7,
  type FactionIdV7,
  type GameStateV7,
  type ImprovementIdV7,
  type MatchOutcomeV7,
  type MatchSetupV7,
  type RandomStateV7,
  type ResourceIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../engine/v7/types";
import { viewForV7, type PlayerViewV7 } from "../engine/v7/view";
import { allOwnedUnitsV7 } from "../engine/v7/units";
import {
  createDwarfMetricsV7,
  createDwarfTelemetryStateV7,
  recordDwarfV7,
  type DwarfMetricsV7,
  type DwarfTelemetryStateV7,
} from "./dwarf-telemetry-v7";
import {
  createCandyMetricsV7,
  recordCandyV7,
  type CandyMetricsV7,
} from "./candy-telemetry-v7";

export const V7_MATCH_MAX_COMMANDS_DEFAULT = 30_000;
export const V7_MATCH_MAX_ROUNDS_DEFAULT = 750;
export const V7_PUBLIC_EQUALITY_COMMAND_LIMIT = 32;

export type AiMatchTerminationV7 =
  "OUTCOME" | "COMMAND_CAP" | "ROUND_CAP" | "STALL" | "ERROR";

export interface AiDiagnosticV7 {
  readonly code: string;
  readonly message: string;
  readonly commandIndex: number;
  readonly round: number;
  readonly playerId: PlayerId | null;
}

export interface AiCommandRecordV7 {
  readonly index: number;
  readonly playerId: PlayerId;
  readonly command: CommandV7;
  readonly events: readonly DomainEventV7[];
  readonly stateHash: string;
}

export interface HeadlessMetricsV7 {
  readonly rulesetId: "pulp-wars-poc-7r53";
  readonly setupHash: string;
  readonly mapHash: string;
  readonly postGenerationPrngHash: string;
  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 4):
   * the kinds the board started with, in (y, x) order of their tiles.
   */
  readonly curiosityKinds: readonly CuriosityKindV7[];
  /**
   * Map curiosities (section 8, `pulp_wars-737.3`): the Giant Spider of the
   * match, if one was placed: the damage and kills it dealt (counted for no
   * role or faction), the bounties paid for it, and the round it was slain
   * (null while it lives or when none was placed).
   */
  readonly monsters: {
    readonly placed: number;
    damageDealt: number;
    kills: number;
    bountyCoins: number;
    slainRound: number | null;
  };
  finalPrngHash: string;
  commandHash: string;
  eventHash: string;
  checkpointHash: string;
  finalHash: string;
  readonly commandsByKind: Record<string, number>;
  readonly eventsByKind: Record<string, number>;
  readonly research: {
    readonly adoption: Record<TechnologyIdV7, number>;
    readonly firstRound: Record<TechnologyIdV7, number | null>;
    readonly byBranch: Record<string, number>;
  };
  readonly economy: {
    coinsEarned: number;
    coinsSpent: number;
    oneCoinFloorAwards: number;
    negativePopulationLoss: number;
    spoilsCoins: number;
    pillageCoins: number;
    disbandCoins: number;
  };
  readonly resources: {
    readonly generated: Record<ResourceIdV7, number>;
    readonly converted: Record<ResourceIdV7, number>;
    readonly restored: Record<ResourceIdV7, number>;
    readonly rebuilt: Record<ResourceIdV7, number>;
  };
  readonly improvements: {
    readonly built: Record<ImprovementIdV7, number>;
    readonly removed: Record<ImprovementIdV7, number>;
    readonly liveOutputHistogram: Record<
      ImprovementIdV7,
      Record<string, number>
    >;
    readonly outages: Record<ImprovementIdV7, number>;
    readonly resumptions: Record<ImprovementIdV7, number>;
    roadsBuilt: number;
  };
  readonly capacity: {
    fortificationAdoptions: number;
    /** Active-player turn-boundary samples of a city over its capacity. */
    overcapacityStates: number;
    readonly overcapacityStatesByFaction: Record<FactionIdV7, number>;
    /** Largest assigned-minus-capacity excess seen at a turn boundary. */
    maximumOvercapacity: number;
  };
  readonly achievements: {
    /** Revision 21: every achievement, the four new ones included. */
    readonly progressMaximum: Record<AchievementIdV7, number>;
    readonly unlockRound: Record<AchievementIdV7, number | null>;
    /** Revision 21: seats that unlocked each achievement during the match. */
    readonly unlockedSeats: Record<AchievementIdV7, number>;
    monumentPlacements: number;
    monumentTransfers: number;
    monumentLosses: number;
    monumentPopulation: number;
    rewardsFromMonumentGrowth: number;
  };
  readonly rewards: Record<(typeof REWARD_IDS_V7)[number], number>;
  readonly roles: {
    readonly trained: Record<UnitRoleIdV7, number>;
    readonly actions: Record<UnitRoleIdV7, number>;
    readonly damage: Record<UnitRoleIdV7, number>;
    readonly kills: Record<UnitRoleIdV7, number>;
    readonly losses: Record<UnitRoleIdV7, number>;
    readonly captures: Record<UnitRoleIdV7, number>;
    readonly trainingCoins: Record<UnitRoleIdV7, number>;
    readonly survivors: Record<UnitRoleIdV7, number>;
    /** Integer survivors per 1,000 training Coins. */
    readonly survivorsPerThousandCoins: Record<UnitRoleIdV7, number>;
  };
  /** Seat-ordered faction of every player (revision 13). */
  readonly factionsBySeat: readonly FactionIdV7[];
  /**
   * Per-faction role inventories. Damage and kills include Wail, splash, and
   * retaliation, credited to the dealing unit's owner's faction.
   */
  readonly factionRoles: Record<FactionIdV7, FactionRoleMetricsV7>;
  readonly undead: UndeadMetricsV7;
  /** The Martian revision: Shield, ray, and ability telemetry. */
  readonly martian: MartianMetricsV7;
  /** The Ice Folk revision: Chill, Shatter, Snow, and ability telemetry. */
  readonly iceFolk: IceFolkMetricsV7;
  /** The Dwarf revision: Tunnel, eruption, bomb, and ability telemetry. */
  readonly dwarf: DwarfMetricsV7;
  /** The Candy revision: Rush, Crumbs, Splat, Bounce, and Toss telemetry. */
  readonly candy: CandyMetricsV7;
  readonly knightOverrun: {
    chainsStarted: number;
    attacks: number;
    continuations: number;
    advances: number;
    completedChains: number;
    longestChain: number;
    retaliations: number;
    survivals: number;
    postAttackCommandInterleaving: number;
    attemptedMovementViolations: number;
    attemptedCaptureViolations: number;
    continuationWithoutAdvanceViolations: number;
    chainAccountingViolations: number;
    readonly attacksPerChain: Record<string, number>;
  };
  readonly catapult: {
    readonly shotRanges: Record<"2" | "3", number>;
    setupTurns: number;
    healingBetweenVolleys: number;
    coordinatedAttackers: number;
    siegeTurnBoundaries: number;
    screenSurvivals: number;
  };
  readonly observation: {
    checks: number;
    commandChecks: number;
    previewChecks: number;
    policyChecks: number;
    mismatches: number;
    hiddenInformationViolations: number;
  };
  readonly relationships: {
    alliedHostileActions: number;
    alliedTerritoryPathSteps: number;
  };
  errors: number;
  stalls: number;
  commandCapHits: number;
  roundCapHits: number;
}

export interface FactionRoleMetricsV7 {
  readonly trained: Record<UnitRoleIdV7, number>;
  readonly trainingCoins: Record<UnitRoleIdV7, number>;
  readonly damage: Record<UnitRoleIdV7, number>;
  readonly kills: Record<UnitRoleIdV7, number>;
  readonly losses: Record<UnitRoleIdV7, number>;
  readonly captures: Record<UnitRoleIdV7, number>;
}

/**
 * Revision-13 Undead ability telemetry. Counts are events or event fields;
 * `gravesMaximum` is a turn-boundary sample and `gravesRemaining` is final.
 */
export interface UndeadMetricsV7 {
  wailUses: number;
  wailTargets: number;
  wailZeroDamageTargets: number;
  wailDamage: number;
  wailKills: number;
  /** Lich and Battleship splash entries, damage, and deaths. */
  splashHits: number;
  splashDamage: number;
  splashKills: number;
  lichSplashDamage: number;
  lichSplashKills: number;
  infections: number;
  infectionsOnAttack: number;
  infectionsOnRetaliation: number;
  /** Infect risings on a city center owned by another player. */
  infectionsOnCityCenters: number;
  /** Infect risings on a village center. */
  infectionsOnVillageCenters: number;
  /** Captures made by a Zombie that rose on a settlement center. */
  centerRisingCaptures: number;
  raiseDeadUses: number;
  skeletonsRaised: number;
  maximumSkeletonsPerRaise: number;
  devours: number;
  devourHealing: number;
  /** Devours at full HP (amount 0): pure Grave denial. */
  devourDenials: number;
  lifestealHeals: number;
  lifestealHealing: number;
  gravesCreated: number;
  gravesMaximum: number;
  gravesRemaining: number;
  /** Kills (any cause) scored by Skeletons that Raise Dead created. */
  raisedSkeletonKills: number;
  raisedSkeletonLosses: number;
  raisedSkeletonCaptures: number;
  /** Raise Dead then Disband: the refund of a free rising. */
  raisedSkeletonsDisbanded: number;
  raisedSkeletonDisbandCoins: number;
  /** Any rising (Raise Dead Skeleton or Infect Zombie) later disbanded. */
  risingsDisbanded: number;
  risingDisbandCoins: number;
  /** Revision 14: units newly plagued by Lich attacks. */
  plagueApplications: number;
  /** Revision 14: units newly plagued by Start Turn spread. */
  plagueSpreads: number;
  /** Revision 14: Start Turn Plague damage entries, damage, and deaths. */
  plagueDamageEntries: number;
  plagueDamage: number;
  plagueDeaths: number;
  /** Revision 14: Plague ended because the source Lich left the board. */
  plagueCleared: number;
  /** Revision 15: Plague ended after its third and last Start Turn. */
  plagueExpired: number;
  /**
   * Revision 15 Plague duration: index `n` counts infections that ended
   * (death, expiry, cure, or source loss) after `n` Start Turn damage steps
   * (0–3). Infections still in force at the end are not counted.
   */
  plagueTurnsAtEnd: number[];
  /** Revision 14: Tend Wounded cures. */
  plagueCures: number;
  bittenCures: number;
  /** Revision 14: bites recorded by Zombie attacks and retaliation. */
  bites: number;
  /** Revision 14: bitten victims that rose as Zombies. */
  bittenRisings: number;
  /** Revision 14: most plagued and bitten units at once; left at the end. */
  plaguedMaximum: number;
  bittenMaximum: number;
  plaguedRemaining: number;
  bittenRemaining: number;
  /** Revision 14: attacks that drew no retaliation (Vampire). */
  unansweredAttacks: number;
}

/**
 * The Martian revision (docs/product/RULESET_7_MARTIANS.md section 16.2):
 * match totals of every Martian mechanic, read from the canonical events.
 * All zero in a match without a Martian seat. The per-seat telemetry of the
 * balance matrix replays the accepted command log and reads the same events.
 */
export interface MartianMetricsV7 {
  /** Shield damage absorbed, by the source of the hit. */
  readonly shieldAbsorbed: {
    attack: number;
    retaliation: number;
    splash: number;
    wail: number;
    blast: number;
  };
  /** Hits (of any source) a Shield absorbed completely (0 HP damage). */
  hitsFullyAbsorbed: number;
  /** `SHIELDS_RECHARGED` events and the Shield entries they changed. */
  rechargeEvents: number;
  rechargedShields: number;
  /** Recharges at End Turn (Force Fields), a subset of the above. */
  endTurnRechargeEvents: number;
  /** Heat rays by power, their HP damage, and their kills. */
  raysFull: number;
  raysHalf: number;
  rayDamage: number;
  rayKills: number;
  /** Half-power rays by reason. */
  raysHalfMoved: number;
  raysHalfCooling: number;
  /** Rays that ignored fortification levels (the Disintegrator). */
  raysIgnoringFortification: number;
  /** Pierce hits on hostile and on own or allied units, damage, kills. */
  pierceHitsHostile: number;
  pierceHitsFriendly: number;
  pierceDamage: number;
  pierceKills: number;
  beamDowns: number;
  readonly beamDownPassengers: Record<UnitRoleIdV7, number>;
  mindControls: number;
  readonly mindControlTargets: Record<UnitRoleIdV7, number>;
  mindControlTargetHp: number;
  /**
   * The Mind Control revision: controlled units released to their original
   * owner, lost with their Brain (`BRAIN_LOST`), the most controlled at
   * once, and captures made by controlled units.
   */
  controlledReleased: number;
  controlledLost: number;
  controlledMaximum: number;
  controlledCaptures: number;
  tractorBeamsOwn: number;
  tractorBeamsHostile: number;
  /** Pulls that moved a unit off a city center. */
  tractorBeamsOffCenter: number;
  psychicCommands: number;
  /** Machines that embarked on a water tile without a Port. */
  selfLaunches: number;
  /** Flyer Moves that passed over a unit of another player. */
  flyoverMoves: number;
}

export interface AiMatchOptionsV7 {
  readonly maxCommands?: number;
  readonly maxRounds?: number;
  readonly maxCommandsPerTurn?: number;
  readonly recordCheckpointHashes?: boolean;
  readonly progressEveryCommands?: number;
  readonly onProgress?: (progress: AiMatchProgressV7) => void;
  /** Use the same bounded Normal-policy work loop as the browser controller. */
  readonly policySliceMilliseconds?: number;
  readonly onPolicyWork?: (diagnostic: AiPolicyWorkDiagnosticV7) => void;
  /**
   * Parity and fixture support: start from this already created first turn
   * (for example a revision-13 board) instead of generating one from the
   * setup. Its state must carry exactly the given setup.
   */
  readonly initialGame?: {
    readonly state: GameStateV7;
    readonly events: readonly DomainEventV7[];
  };
  /**
   * Headless and test only, never the browser (`pulp_wars-68k.3`,
   * docs/product/CAMPAIGN.md section 7.1): vary seat 0's play so a fixed
   * mission played Normal against Normal is not always the same game. See
   * `proxyVariedDecisionV7`.
   */
  readonly proxyVariation?: ProxyVariationV7;
}

/** Seat 0's proxy variation: its own random stream and a rate in [0, 1]. */
export interface ProxyVariationV7 {
  /** Seeds a Mulberry32 stream of its own (never the match's `random`). */
  readonly seed: number;
  /** The probability of a substitution at each seat-0 decision. */
  readonly rate: number;
}

export interface AiPolicyWorkDiagnosticV7 {
  readonly commandIndex: number;
  readonly playerId: PlayerId;
  readonly slices: number;
  readonly wallMilliseconds: number;
  readonly maximumSliceMilliseconds: number;
}

export interface AiMatchProgressV7 {
  readonly acceptedCommands: number;
  readonly round: number;
  readonly activePlayerId: PlayerId;
}

export interface AiMatchResultV7 {
  readonly outcome: MatchOutcomeV7 | null;
  readonly termination: AiMatchTerminationV7;
  readonly acceptedCommands: number;
  readonly rounds: number;
  readonly state: GameStateV7;
  readonly stateHash: string;
  readonly events: readonly DomainEventV7[];
  readonly commandLog: readonly AiCommandRecordV7[];
  readonly errors: readonly AiDiagnosticV7[];
  readonly stalls: readonly AiDiagnosticV7[];
  readonly metrics: HeadlessMetricsV7;
}

export interface AiBatchOptionsV7 {
  readonly seeds: readonly number[];
  readonly aiCounts: readonly AiCountV7[];
  readonly modes?: readonly MatchSetupV7["aiMode"][];
  readonly mapTypes?: readonly MatchSetupV7["mapType"][];
  readonly boardSize?: BoardSizeV7;
  /**
   * Seat-ordered factions; its length must be `aiCount + 1` for every count.
   * Without it the seats play distinct factions in registration order
   * (Human, Undead, Goblin, Dinosaur).
   */
  readonly factions?: readonly FactionIdV7[];
  /**
   * Headless and test only: lets `factions` repeat a faction (mirror
   * matches). Every setup of the batch then carries
   * `allowDuplicateFactions: true` (docs/architecture/HEADLESS_SIMULATION.md).
   */
  readonly allowDuplicateFactions?: boolean;
  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section 3):
   * every setup of the batch carries this value. Required, so a caller
   * always states it; the CLI defaults it to `true` like the setup screen,
   * and the parity, balance, and validation tools pass `false`.
   */
  readonly curiosities: boolean;
  readonly maxCommands?: number;
  readonly maxRounds?: number;
}

export interface AiBatchEntryV7 {
  readonly seed: number;
  readonly aiCount: AiCountV7;
  readonly aiMode: MatchSetupV7["aiMode"];
  readonly mapType: MatchSetupV7["mapType"];
  readonly factions: readonly FactionIdV7[];
  /**
   * The setup's `curiosities` value (section 3); the placed kinds are
   * `metrics.curiosityKinds`.
   */
  readonly curiosities: boolean;
  readonly outcome: MatchOutcomeV7 | null;
  readonly termination: AiMatchTerminationV7;
  readonly rounds: number;
  readonly commands: number;
  readonly errors: number;
  readonly stalls: number;
  readonly capFailure: boolean;
  readonly finalHash: string;
  readonly commandHash: string;
  readonly eventHash: string;
  readonly checkpointHash: string;
  readonly metrics: HeadlessMetricsV7;
}

export interface AiBatchSummaryV7 {
  readonly matches: number;
  readonly completed: number;
  readonly failed: number;
  readonly capped: number;
  readonly errors: number;
  readonly stalls: number;
  readonly totalRounds: number;
  readonly totalCommands: number;
  readonly outcomes: Readonly<Record<string, number>>;
  readonly entries: readonly AiBatchEntryV7[];
}

export interface HeadlessApiV7 {
  create(setup: MatchSetupV7): Promise<CreatePlayableGameResultV7>;
  apply(
    state: GameStateV7,
    actor: PlayerId,
    command: CommandV7,
  ): Promise<ApplyCommandResultV7>;
  viewFor(state: GameStateV7, viewer: PlayerId): Promise<PlayerViewV7>;
  run(replay: ReplayFileV7): Promise<ReplayRunResultV7>;
  runAiMatch(
    setup: MatchSetupV7,
    options?: AiMatchOptionsV7,
  ): Promise<AiMatchResultV7>;
  runAiBatch(options: AiBatchOptionsV7): Promise<AiBatchSummaryV7>;
}

export interface AcceptedTelemetryTransitionV7 {
  readonly before: GameStateV7;
  readonly after: GameStateV7;
  readonly actorId: PlayerId;
  readonly command: CommandV7;
  readonly events: readonly DomainEventV7[];
}

/** Deterministic telemetry collector for checked reducer fixture sequences. */
export function collectAcceptedTelemetryV7(
  initialState: GameStateV7,
  initialEvents: readonly DomainEventV7[],
  transitions: readonly AcceptedTelemetryTransitionV7[],
): HeadlessMetricsV7 {
  const metrics = createMetricsV7(initialState);
  const telemetry = createTelemetryState(initialState);
  recordEventsV7(initialState, initialState, initialEvents, metrics, telemetry);
  recordSnapshotV7(initialState, metrics, telemetry, true);
  let state = initialState;
  const commands: CommandV7[] = [];
  const events = [...initialEvents];
  const checkpoints: string[] = [];
  for (const transition of transitions) {
    if (canonicalHash(transition.before) !== canonicalHash(state))
      throw new RangeError("Telemetry transition is not contiguous");
    if (transition.after.commandIndex !== transition.before.commandIndex + 1)
      throw new RangeError("Telemetry transition is not accepted");
    increment(metrics.commandsByKind, transition.command.kind);
    recordCommandAndEventsV7(
      transition.before,
      transition.after,
      transition.actorId,
      transition.command,
      transition.events,
      metrics,
      telemetry,
    );
    recordSnapshotV7(
      transition.after,
      metrics,
      telemetry,
      transition.events.some((event) => event.kind === "TURN_STARTED"),
    );
    state = transition.after;
    commands.push(transition.command);
    events.push(...transition.events);
    checkpoints.push(canonicalHash(state));
  }
  finalizeMetricsV7(metrics, state, commands, events, checkpoints);
  return metrics;
}

export const headlessV7: HeadlessApiV7 = {
  async create(setup) {
    return Promise.resolve(createPlayableGameV7(setup));
  },
  async apply(state, actor, command) {
    return Promise.resolve(applyCommandV7(state, actor, command));
  },
  async viewFor(state, viewer) {
    return Promise.resolve(viewForV7(state, viewer));
  },
  async run(replay) {
    return Promise.resolve(runReplayV7(replay));
  },
  async runAiMatch(setup, options = {}) {
    return Promise.resolve(runAiMatchV7(setup, options));
  },
  async runAiBatch(options) {
    return runAiBatchV7(options);
  },
};

export function runAiMatchV7(
  setup: MatchSetupV7,
  options: AiMatchOptionsV7 = {},
): AiMatchResultV7 {
  return runAiMatchInternalV7(setup, options, true);
}

function runAiMatchInternalV7(
  setup: MatchSetupV7,
  options: AiMatchOptionsV7,
  recordCommands: boolean,
): AiMatchResultV7 {
  const maxCommands = options.maxCommands ?? V7_MATCH_MAX_COMMANDS_DEFAULT;
  const maxRounds = options.maxRounds ?? V7_MATCH_MAX_ROUNDS_DEFAULT;
  const maxCommandsPerTurn =
    options.maxCommandsPerTurn ?? NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7;
  validateCap(maxCommands, "maxCommands");
  validateCap(maxRounds, "maxRounds");
  validateCap(maxCommandsPerTurn, "maxCommandsPerTurn");
  const progressEveryCommands = options.progressEveryCommands ?? 100;
  validateCap(progressEveryCommands, "progressEveryCommands");
  if (
    options.policySliceMilliseconds !== undefined &&
    (!Number.isFinite(options.policySliceMilliseconds) ||
      options.policySliceMilliseconds <= 0)
  )
    throw new RangeError("policySliceMilliseconds must be positive");
  if (maxCommandsPerTurn > NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7)
    throw new RangeError("maxCommandsPerTurn exceeds the Normal v7 limit");
  const proxy =
    options.proxyVariation === undefined
      ? null
      : {
          random: randomState(options.proxyVariation.seed),
          rate: proxyRateV7(options.proxyVariation.rate),
        };
  const created =
    options.initialGame === undefined
      ? createPlayableGameV7(setup)
      : { ok: true as const, ...options.initialGame };
  if (!created.ok) throw new Error(`CREATE_REJECTED:${created.error.code}`);
  if (canonicalJson(created.state.setup) !== canonicalJson(setup))
    throw new RangeError("initialGame does not match the setup");
  let state = created.state;
  const commands: CommandV7[] = [];
  const events: DomainEventV7[] = [...created.events];
  const checkpoints: string[] = [];
  const commandLog: AiCommandRecordV7[] = [];
  const errors: AiDiagnosticV7[] = [];
  const stalls: AiDiagnosticV7[] = [];
  const metrics = createMetricsV7(state);
  const telemetry = createTelemetryState(state);
  recordEventsV7(state, state, created.events, metrics, telemetry);
  recordSnapshotV7(state, metrics, telemetry, true);
  let termination: AiMatchTerminationV7 = "COMMAND_CAP";
  let turnPlayerId = activePlayerIdV7(state);
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
    const actor = activePlayerIdV7(state);
    if (actor !== turnPlayerId) {
      turnPlayerId = actor;
      commandsThisTurn = 0;
    }
    const view = viewForV7(state, actor);
    if (state.commandIndex < V7_PUBLIC_EQUALITY_COMMAND_LIMIT)
      auditPublicEqualityV7(view, metrics);
    let command: CommandV7 | null;
    try {
      const started = performance.now();
      let slices = 1;
      let decision;
      let maximumSliceMilliseconds = 0;
      if (options.policySliceMilliseconds === undefined)
        decision = chooseNormalCommandV7(view);
      else {
        const work = new NormalPolicyWorkV7(view);
        let sliceStarted = performance.now();
        let pending = work.runSlice(options.policySliceMilliseconds);
        maximumSliceMilliseconds = performance.now() - sliceStarted;
        while (pending === null) {
          slices += 1;
          sliceStarted = performance.now();
          pending = work.runSlice(options.policySliceMilliseconds);
          maximumSliceMilliseconds = Math.max(
            maximumSliceMilliseconds,
            performance.now() - sliceStarted,
          );
        }
        decision = pending;
      }
      options.onPolicyWork?.({
        commandIndex: state.commandIndex,
        playerId: actor,
        slices,
        wallMilliseconds: performance.now() - started,
        maximumSliceMilliseconds,
      });
      if (proxy !== null && view.viewer.seat === 0) {
        const varied = proxyVariedDecisionV7(
          decision,
          proxy.random,
          proxy.rate,
        );
        proxy.random = varied.random;
        decision = varied.decision;
      }
      command = chooseNormalTurnCommandV7(
        view,
        commandsThisTurn,
        maxCommandsPerTurn,
        decision,
      );
    } catch (cause) {
      const code =
        cause instanceof NormalTurnCommandCapErrorV7
          ? "TURN_COMMAND_CAP_EXCEEDED"
          : cause instanceof NormalPolicyErrorV7
            ? `POLICY_ERROR:${cause.code}`
            : "POLICY_ERROR";
      errors.push(diagnostic(state, actor, code, errorMessage(cause)));
      metrics.errors += 1;
      termination = "ERROR";
      break;
    }
    if (command === null) {
      stalls.push(
        diagnostic(
          state,
          actor,
          "NO_PUBLIC_COMMAND",
          "Policy returned no command",
        ),
      );
      metrics.stalls += 1;
      termination = "STALL";
      break;
    }
    const before = state;
    const priorIndex = state.commandIndex;
    auditRelationshipCommandV7(state, actor, command, metrics);
    const applied = applyCommandV7(state, actor, command);
    if (!applied.accepted) {
      errors.push(
        diagnostic(
          state,
          actor,
          `COMMAND_REJECTED:${applied.error.code}`,
          `AI-selected ${command.kind} was rejected`,
        ),
      );
      metrics.errors += 1;
      termination = "ERROR";
      break;
    }
    state = applied.state;
    commands.push(command);
    events.push(...applied.events);
    const checkpoint = canonicalHash(state);
    checkpoints.push(checkpoint);
    if (recordCommands)
      commandLog.push({
        index: state.commandIndex,
        playerId: actor,
        command,
        events: applied.events,
        stateHash: options.recordCheckpointHashes === false ? "" : checkpoint,
      });
    increment(metrics.commandsByKind, command.kind);
    recordCommandAndEventsV7(
      before,
      state,
      actor,
      command,
      applied.events,
      metrics,
      telemetry,
    );
    recordSnapshotV7(
      state,
      metrics,
      telemetry,
      applied.events.some((event) => event.kind === "TURN_STARTED"),
    );
    commandsThisTurn += 1;
    if (
      options.onProgress !== undefined &&
      state.commandIndex % progressEveryCommands === 0
    )
      options.onProgress({
        acceptedCommands: state.commandIndex,
        round: state.round,
        activePlayerId: activePlayerIdV7(state),
      });
    if (state.commandIndex !== priorIndex + 1) {
      stalls.push(
        diagnostic(
          state,
          actor,
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
  finalizeMetricsV7(metrics, state, commands, events, checkpoints);
  return {
    outcome: state.outcome,
    termination,
    acceptedCommands: state.commandIndex,
    rounds: state.round,
    state,
    stateHash,
    events,
    commandLog,
    errors,
    stalls,
    metrics,
  };
}

function proxyRateV7(rate: number): number {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1)
    throw new RangeError("proxyVariation.rate must be in [0, 1]");
  return rate;
}

/**
 * Proxy variation (`pulp_wars-68k.3`, docs/product/CAMPAIGN.md section 7.1;
 * headless and test only, never the browser). At each seat-0 decision the
 * proxy's own Mulberry32 stream draws once: with probability `rate` the
 * second or third best candidate (a second draw picks between them) takes
 * the best one's place. Only candidates in the best candidate's priority
 * band (the same `priority`) qualify, never `END_TURN`, and the best is
 * never replaced when it is `END_TURN`; with no qualifying candidate the
 * decision is unchanged. The substitute moves to the front of the
 * candidate list, so the turn-command cap still applies to it. Every
 * candidate is a ready public command: the command log stays an ordinary
 * valid replay.
 */
export function proxyVariedDecisionV7(
  decision: NormalAiDecisionV7,
  random: RandomStateV7,
  rate: number,
): { readonly decision: NormalAiDecisionV7; readonly random: RandomStateV7 } {
  const draw = nextUint32(random);
  let cursor: RandomStateV7 = draw.random;
  const best = decision.candidates[0];
  if (
    best === undefined ||
    best.command.kind === "END_TURN" ||
    draw.value >= rate * 0x1_0000_0000
  )
    return { decision, random: cursor };
  const alternatives = decision.candidates
    .slice(1)
    .filter(
      (candidate) =>
        candidate.score.priority === best.score.priority &&
        candidate.command.kind !== "END_TURN",
    )
    .slice(0, 2);
  if (alternatives.length === 0) return { decision, random: cursor };
  let chosen = alternatives[0] as ScoredAiCandidateV7;
  if (alternatives.length === 2) {
    const pick = nextBounded(cursor, 2);
    cursor = pick.random;
    chosen = alternatives[pick.value] as ScoredAiCandidateV7;
  }
  return {
    decision: {
      ...decision,
      candidates: [
        chosen,
        ...decision.candidates.filter((candidate) => candidate !== chosen),
      ],
      command: chosen.command,
    },
    random: cursor,
  };
}

function finalizeMetricsV7(
  metrics: HeadlessMetricsV7,
  state: GameStateV7,
  commands: readonly CommandV7[],
  events: readonly DomainEventV7[],
  checkpoints: readonly string[],
): void {
  for (const role of UNIT_ROLE_IDS_V7) {
    // The Dwarf revision section 5.2: survivors are everything owned,
    // burrowed units included.
    metrics.roles.survivors[role] = allOwnedUnitsV7(state).filter(
      (unit) => unit.hp > 0 && unit.role === role,
    ).length;
    metrics.roles.survivorsPerThousandCoins[role] =
      metrics.roles.trainingCoins[role] === 0
        ? 0
        : Math.round(
            (metrics.roles.survivors[role] * 1_000) /
              metrics.roles.trainingCoins[role],
          );
  }
  metrics.undead.gravesRemaining = state.graves.length;
  metrics.undead.plaguedRemaining = state.plagued.length;
  metrics.undead.bittenRemaining = state.bitten.length;
  metrics.commandHash = canonicalHash(commands);
  metrics.eventHash = canonicalHash(events);
  metrics.checkpointHash = canonicalHash(checkpoints);
  metrics.finalHash = canonicalHash(state);
  metrics.finalPrngHash = canonicalHash(state.random);
}

export async function runAiBatchV7(
  options: AiBatchOptionsV7,
): Promise<AiBatchSummaryV7> {
  if (options.seeds.length === 0) throw new RangeError("seeds cannot be empty");
  if (options.aiCounts.length === 0)
    throw new RangeError("aiCounts cannot be empty");
  const modes = options.modes ?? (["RIVAL"] as const);
  if (modes.length === 0) throw new RangeError("modes cannot be empty");
  const mapTypes = options.mapTypes ?? (["CONTINENTS"] as const);
  if (mapTypes.length === 0) throw new RangeError("mapTypes cannot be empty");
  if (options.factions !== undefined)
    for (const aiCount of options.aiCounts)
      if (options.factions.length !== aiCount + 1)
        throw new RangeError("factions must have one entry per seat");
  const entries: AiBatchEntryV7[] = [];
  for (const mapType of mapTypes)
    for (const aiMode of modes)
      for (const aiCount of options.aiCounts) {
        // Map scale sections 3.3 and 6.2: the auto size by default, and a
        // size that does not hold the seats on the map type is refused.
        const seats = aiCount + 1;
        const size = options.boardSize ?? autoBoardSizeV7(seats, mapType);
        if (size === null || !seatCountAllowedV7(size, mapType, seats))
          throw new RangeError(
            `boardSize is too small for aiCount: ${mapType} with ${seats} seats allows ${allowedBoardSizesV7(mapType, seats).join(", ") || "no size"}`,
          );
        for (const seed of options.seeds) {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          const factions = options.factions ?? distinctFactionsV7(aiCount + 1);
          const result = runAiMatchInternalV7(
            {
              rulesetId: "pulp-wars-poc-7r53",
              mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
              seed,
              width: size,
              height: size,
              aiCount,
              aiDifficulty: "NORMAL",
              aiMode,
              humanColor: "CORAL",
              factions,
              mapType,
              curiosities: options.curiosities,
              ...(options.allowDuplicateFactions === true
                ? { allowDuplicateFactions: true as const }
                : {}),
            },
            {
              ...(options.maxCommands === undefined
                ? {}
                : { maxCommands: options.maxCommands }),
              ...(options.maxRounds === undefined
                ? {}
                : { maxRounds: options.maxRounds }),
            },
            false,
          );
          entries.push({
            seed,
            aiCount,
            aiMode,
            mapType,
            factions,
            curiosities: options.curiosities,
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
    errors: sum(entries.map((entry) => entry.errors)),
    stalls: sum(entries.map((entry) => entry.stalls)),
    totalRounds: sum(entries.map((entry) => entry.rounds)),
    totalCommands: sum(entries.map((entry) => entry.commands)),
    outcomes,
    entries,
  };
}

interface TelemetryStateV7 {
  readonly contributionByTile: Map<
    string,
    { readonly improvement: ImprovementIdV7; readonly value: number }
  >;
  readonly knightOverrunChains: Map<UnitId, { attacks: number }>;
  readonly knightOverrunInterleaved: Set<UnitId>;
  readonly catapultShotTargets: Set<UnitId>;
  readonly healingSinceCatapultShot: Map<UnitId, number>;
  readonly catapultSetupUnits: Set<UnitId>;
  readonly restoredSites: Set<string>;
  readonly raisedSkeletons: Set<UnitId>;
  readonly risings: Set<UnitId>;
  readonly centerRisings: Set<UnitId>;
  /** Revision 15: Start Turn Plague damage steps of each current infection. */
  readonly plagueTurns: Map<UnitId, number>;
  /** The Ice Folk revision telemetry state. */
  readonly iceFolk: IceFolkTelemetryStateV7;
  /** The Dwarf revision telemetry state. */
  readonly dwarf: DwarfTelemetryStateV7;
}

function createTelemetryState(state: GameStateV7): TelemetryStateV7 {
  return {
    contributionByTile: currentContributions(state),
    knightOverrunChains: new Map(),
    knightOverrunInterleaved: new Set(),
    catapultShotTargets: new Set(),
    healingSinceCatapultShot: new Map(),
    catapultSetupUnits: new Set(),
    restoredSites: new Set(),
    raisedSkeletons: new Set(),
    risings: new Set(),
    centerRisings: new Set(),
    plagueTurns: new Map(),
    iceFolk: createIceFolkTelemetryStateV7(),
    dwarf: createDwarfTelemetryStateV7(),
  };
}

function createMetricsV7(state: GameStateV7): HeadlessMetricsV7 {
  const generated = zeroRecord(RESOURCE_IDS_V7);
  for (const tile of state.board.tiles)
    if (tile.resource !== null) generated[tile.resource] += 1;
  return {
    rulesetId: "pulp-wars-poc-7r53",
    setupHash: canonicalHash(state.setup),
    mapHash: canonicalHash({
      board: state.board,
      treasureChests: state.treasureChests,
    }),
    postGenerationPrngHash: canonicalHash(state.random),
    curiosityKinds: state.curiosities.map((curiosity) => curiosity.kind),
    monsters: {
      placed: state.monsters.length,
      damageDealt: 0,
      kills: 0,
      bountyCoins: 0,
      slainRound: null,
    },
    finalPrngHash: "",
    commandHash: "",
    eventHash: "",
    checkpointHash: "",
    finalHash: "",
    commandsByKind: zeroStringRecord(COMMAND_KIND_ORDER_V7),
    eventsByKind: zeroStringRecord(DOMAIN_EVENT_KIND_ORDER_V7),
    research: {
      adoption: zeroRecord(TECHNOLOGY_IDS_V7),
      firstRound: Object.fromEntries(
        TECHNOLOGY_IDS_V7.map((tech) => [tech, null]),
      ) as Record<TechnologyIdV7, number | null>,
      byBranch: zeroStringRecord(TECHNOLOGY_BRANCH_IDS_V7),
    },
    economy: {
      coinsEarned: 0,
      coinsSpent: 0,
      oneCoinFloorAwards: 0,
      negativePopulationLoss: 0,
      spoilsCoins: 0,
      pillageCoins: 0,
      disbandCoins: 0,
    },
    resources: {
      generated,
      converted: zeroRecord(RESOURCE_IDS_V7),
      restored: zeroRecord(RESOURCE_IDS_V7),
      rebuilt: zeroRecord(RESOURCE_IDS_V7),
    },
    improvements: {
      built: zeroRecord(IMPROVEMENT_IDS_V7),
      removed: zeroRecord(IMPROVEMENT_IDS_V7),
      liveOutputHistogram: Object.fromEntries(
        IMPROVEMENT_IDS_V7.map((item) => [item, {}]),
      ) as Record<ImprovementIdV7, Record<string, number>>,
      outages: zeroRecord(IMPROVEMENT_IDS_V7),
      resumptions: zeroRecord(IMPROVEMENT_IDS_V7),
      roadsBuilt: 0,
    },
    capacity: {
      fortificationAdoptions: 0,
      overcapacityStates: 0,
      overcapacityStatesByFaction: zeroRecord(FACTION_IDS_V7),
      maximumOvercapacity: 0,
    },
    achievements: {
      progressMaximum: zeroRecord(ACHIEVEMENT_IDS_V7),
      unlockRound: Object.fromEntries(
        ACHIEVEMENT_IDS_V7.map((achievement) => [achievement, null]),
      ) as Record<AchievementIdV7, number | null>,
      unlockedSeats: zeroRecord(ACHIEVEMENT_IDS_V7),
      monumentPlacements: 0,
      monumentTransfers: 0,
      monumentLosses: 0,
      monumentPopulation: 0,
      rewardsFromMonumentGrowth: 0,
    },
    rewards: zeroRecord(REWARD_IDS_V7),
    roles: {
      trained: zeroRecord(UNIT_ROLE_IDS_V7),
      actions: zeroRecord(UNIT_ROLE_IDS_V7),
      damage: zeroRecord(UNIT_ROLE_IDS_V7),
      kills: zeroRecord(UNIT_ROLE_IDS_V7),
      losses: zeroRecord(UNIT_ROLE_IDS_V7),
      captures: zeroRecord(UNIT_ROLE_IDS_V7),
      trainingCoins: zeroRecord(UNIT_ROLE_IDS_V7),
      survivors: zeroRecord(UNIT_ROLE_IDS_V7),
      survivorsPerThousandCoins: zeroRecord(UNIT_ROLE_IDS_V7),
    },
    factionsBySeat: [...state.setup.factions],
    factionRoles: Object.fromEntries(
      FACTION_IDS_V7.map((faction) => [
        faction,
        {
          trained: zeroRecord(UNIT_ROLE_IDS_V7),
          trainingCoins: zeroRecord(UNIT_ROLE_IDS_V7),
          damage: zeroRecord(UNIT_ROLE_IDS_V7),
          kills: zeroRecord(UNIT_ROLE_IDS_V7),
          losses: zeroRecord(UNIT_ROLE_IDS_V7),
          captures: zeroRecord(UNIT_ROLE_IDS_V7),
        },
      ]),
    ) as Record<FactionIdV7, FactionRoleMetricsV7>,
    undead: {
      wailUses: 0,
      wailTargets: 0,
      wailZeroDamageTargets: 0,
      wailDamage: 0,
      wailKills: 0,
      splashHits: 0,
      splashDamage: 0,
      splashKills: 0,
      lichSplashDamage: 0,
      lichSplashKills: 0,
      infections: 0,
      infectionsOnAttack: 0,
      infectionsOnRetaliation: 0,
      infectionsOnCityCenters: 0,
      infectionsOnVillageCenters: 0,
      centerRisingCaptures: 0,
      raiseDeadUses: 0,
      skeletonsRaised: 0,
      maximumSkeletonsPerRaise: 0,
      devours: 0,
      devourHealing: 0,
      devourDenials: 0,
      lifestealHeals: 0,
      lifestealHealing: 0,
      gravesCreated: 0,
      gravesMaximum: state.graves.length,
      gravesRemaining: 0,
      raisedSkeletonKills: 0,
      raisedSkeletonLosses: 0,
      raisedSkeletonCaptures: 0,
      raisedSkeletonsDisbanded: 0,
      raisedSkeletonDisbandCoins: 0,
      risingsDisbanded: 0,
      risingDisbandCoins: 0,
      plagueApplications: 0,
      plagueSpreads: 0,
      plagueDamageEntries: 0,
      plagueDamage: 0,
      plagueDeaths: 0,
      plagueCleared: 0,
      plagueExpired: 0,
      plagueTurnsAtEnd: Array.from(
        { length: PLAGUE_DURATION_TURNS_V7 + 1 },
        () => 0,
      ),
      plagueCures: 0,
      bittenCures: 0,
      bites: 0,
      bittenRisings: 0,
      plaguedMaximum: state.plagued.length,
      bittenMaximum: state.bitten.length,
      plaguedRemaining: 0,
      bittenRemaining: 0,
      unansweredAttacks: 0,
    },
    martian: {
      shieldAbsorbed: {
        attack: 0,
        retaliation: 0,
        splash: 0,
        wail: 0,
        blast: 0,
      },
      hitsFullyAbsorbed: 0,
      rechargeEvents: 0,
      rechargedShields: 0,
      endTurnRechargeEvents: 0,
      raysFull: 0,
      raysHalf: 0,
      rayDamage: 0,
      rayKills: 0,
      raysHalfMoved: 0,
      raysHalfCooling: 0,
      raysIgnoringFortification: 0,
      pierceHitsHostile: 0,
      pierceHitsFriendly: 0,
      pierceDamage: 0,
      pierceKills: 0,
      beamDowns: 0,
      beamDownPassengers: zeroRecord(UNIT_ROLE_IDS_V7),
      mindControls: 0,
      mindControlTargets: zeroRecord(UNIT_ROLE_IDS_V7),
      mindControlTargetHp: 0,
      controlledReleased: 0,
      controlledLost: 0,
      controlledMaximum: state.mindControlled.length,
      controlledCaptures: 0,
      tractorBeamsOwn: 0,
      tractorBeamsHostile: 0,
      tractorBeamsOffCenter: 0,
      psychicCommands: 0,
      selfLaunches: 0,
      flyoverMoves: 0,
    },
    iceFolk: createIceFolkMetricsV7(),
    dwarf: createDwarfMetricsV7(),
    candy: createCandyMetricsV7(),
    knightOverrun: {
      chainsStarted: 0,
      attacks: 0,
      continuations: 0,
      advances: 0,
      completedChains: 0,
      longestChain: 0,
      retaliations: 0,
      survivals: 0,
      postAttackCommandInterleaving: 0,
      attemptedMovementViolations: 0,
      attemptedCaptureViolations: 0,
      continuationWithoutAdvanceViolations: 0,
      chainAccountingViolations: 0,
      attacksPerChain: {},
    },
    catapult: {
      shotRanges: { "2": 0, "3": 0 },
      setupTurns: 0,
      healingBetweenVolleys: 0,
      coordinatedAttackers: 0,
      siegeTurnBoundaries: 0,
      screenSurvivals: 0,
    },
    observation: {
      checks: 0,
      commandChecks: 0,
      previewChecks: 0,
      policyChecks: 0,
      mismatches: 0,
      hiddenInformationViolations: 0,
    },
    relationships: { alliedHostileActions: 0, alliedTerritoryPathSteps: 0 },
    errors: 0,
    stalls: 0,
    commandCapHits: 0,
    roundCapHits: 0,
  };
}

function recordCommandAndEventsV7(
  before: GameStateV7,
  after: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  events: readonly DomainEventV7[],
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
): void {
  const actorUnit =
    "unitId" in command
      ? before.units.find((unit) => unit.id === command.unitId)
      : undefined;
  for (const unitId of telemetry.knightOverrunChains.keys())
    if (
      !telemetry.knightOverrunInterleaved.has(unitId) &&
      !(command.kind === "ATTACK" && command.unitId === unitId)
    ) {
      telemetry.knightOverrunInterleaved.add(unitId);
      metrics.knightOverrun.postAttackCommandInterleaving += 1;
    }
  if (actorUnit !== undefined) metrics.roles.actions[actorUnit.role] += 1;
  recordCommandCost(before, actorId, command, metrics);
  if (command.kind === "ATTACK" && actorUnit?.role === "CATAPULT") {
    const target = before.units.find(
      (unit) => unit.id === command.targetUnitId,
    );
    if (target !== undefined) {
      const range = chebyshev(actorUnit.at, target.at) as 2 | 3;
      if (range === 2 || range === 3)
        metrics.catapult.shotRanges[String(range) as "2" | "3"] += 1;
      metrics.catapult.healingBetweenVolleys +=
        telemetry.healingSinceCatapultShot.get(target.id) ?? 0;
      telemetry.healingSinceCatapultShot.delete(target.id);
      telemetry.catapultShotTargets.add(target.id);
      const view = viewForV7(before, actorId);
      metrics.catapult.coordinatedAttackers += before.units.filter(
        (unit) =>
          unit.ownerId === actorId &&
          unit.role === "CATAPULT" &&
          queryCombatPreviewV7(view, unit.id, target.id) !== null,
      ).length;
    }
  }
  if (command.kind === "MOVE" && actorUnit?.role === "CATAPULT")
    telemetry.catapultSetupUnits.add(actorUnit.id);
  if (command.kind === "CAPTURE" && actorUnit !== undefined) {
    metrics.roles.captures[actorUnit.role] += 1;
    metrics.factionRoles[unitKind(before, actorUnit)].captures[
      actorUnit.role
    ] += 1;
    if (telemetry.raisedSkeletons.has(actorUnit.id))
      metrics.undead.raisedSkeletonCaptures += 1;
    if (telemetry.centerRisings.has(actorUnit.id))
      metrics.undead.centerRisingCaptures += 1;
  }
  recordEventsV7(before, after, events, metrics, telemetry);
  recordMartianV7(before, after, actorId, command, events, metrics);
  recordIceFolkV7(
    before,
    after,
    actorId,
    command,
    events,
    metrics.iceFolk,
    telemetry.iceFolk,
  );
  recordDwarfV7(
    before,
    after,
    actorId,
    command,
    events,
    metrics.dwarf,
    telemetry.dwarf,
  );
  recordCandyV7(before, after, actorId, command, events, metrics.candy);
  if (command.kind === "END_TURN") {
    for (const [unitId, chain] of telemetry.knightOverrunChains) {
      const unit = before.units.find((candidate) => candidate.id === unitId);
      if (unit?.ownerId !== actorId) continue;
      finishKnightOverrunChain(metrics, chain.attacks);
      telemetry.knightOverrunChains.delete(unitId);
      telemetry.knightOverrunInterleaved.delete(unitId);
    }
    metrics.catapult.setupTurns += [...telemetry.catapultSetupUnits].filter(
      (unitId) =>
        before.units.some(
          (unit) => unit.id === unitId && unit.ownerId === actorId,
        ),
    ).length;
    for (const unit of before.units)
      if (unit.ownerId === actorId)
        telemetry.catapultSetupUnits.delete(unit.id);
  }
  recordContributionTransitions(before, after, metrics, telemetry);
}

function recordCommandCost(
  state: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  metrics: HeadlessMetricsV7,
): void {
  const view = viewForV7(state, actorId);
  const economic = previewEconomicV7(view, command);
  if (economic.ok) {
    metrics.economy.coinsSpent += economic.preview.cost;
    return;
  }
  if (command.kind === "RESEARCH")
    metrics.economy.coinsSpent += queryResearchCost(view, command.tech);
}

function finishKnightOverrunChain(
  metrics: HeadlessMetricsV7,
  attacks: number,
): void {
  metrics.knightOverrun.completedChains += 1;
  metrics.knightOverrun.longestChain = Math.max(
    metrics.knightOverrun.longestChain,
    attacks,
  );
  increment(metrics.knightOverrun.attacksPerChain, String(attacks));
}

function recordEventsV7(
  before: GameStateV7,
  after: GameStateV7,
  events: readonly DomainEventV7[],
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
): void {
  for (const event of events) {
    increment(metrics.eventsByKind, event.kind);
    if (event.kind === "INCOME_AWARDED") {
      metrics.economy.coinsEarned += event.totalCoins;
      metrics.economy.oneCoinFloorAwards += event.cities.filter((income) => {
        const city = after.cities.find((item) => item.id === income.cityId);
        if (city === undefined || cityIsBesieged(after, city.id)) return false;
        const market = marketIncomeForCityV7(after, city);
        return (
          city.level +
            Number(city.isCapital) +
            market +
            Math.min(0, city.population) <=
            1 && income.coins === 1
        );
      }).length;
    }
    if (event.kind === "TECH_RESEARCHED") {
      increment(metrics.research.adoption, event.tech);
      metrics.research.firstRound[event.tech] ??= after.round;
      const branch = technologyBranch(event.tech);
      increment(metrics.research.byBranch, branch);
      if (event.tech === "ENGINEERING")
        metrics.capacity.fortificationAdoptions += 1;
    }
    if (event.kind === "FRUIT_HARVESTED")
      metrics.resources.converted.FRUIT += 1;
    if (event.kind === "GAME_HUNTED") metrics.resources.converted.GAME += 1;
    if (event.kind === "ECONOMIC_BUILDING_BUILT") {
      metrics.improvements.built[event.improvement] += 1;
      const prior = before.board.tiles.find((tile) =>
        same(tile.at, event.at),
      )?.resource;
      if (prior !== null && prior !== undefined) {
        metrics.resources.converted[prior] += 1;
        if (prior === "FERTILE_GROUND" && event.improvement === "FARM")
          metrics.resources.rebuilt[prior] += Number(
            telemetry.restoredSites.delete(coordKey(event.at)),
          );
      }
    }
    if (
      event.kind === "ECONOMIC_BUILDING_REMOVED" ||
      event.kind === "IMPROVEMENT_PILLAGED"
    ) {
      metrics.improvements.removed[event.improvement] += 1;
      if (event.resourceRestored !== null) {
        metrics.resources.restored[event.resourceRestored] += 1;
        telemetry.restoredSites.add(coordKey(event.at));
      }
      if (event.improvement === "MONUMENT")
        metrics.achievements.monumentLosses += 1;
    }
    if (event.kind === "ROAD_BUILT") metrics.improvements.roadsBuilt += 1;
    if (event.kind === "FOREST_CLEARED" && event.coinDelta > 0)
      metrics.economy.coinsEarned += event.coinDelta;
    if (event.kind === "TREASURE_CAPTURED" && event.coinDelta > 0)
      metrics.economy.coinsEarned += event.coinDelta;
    if (event.kind === "SPOILS_AWARDED") {
      metrics.economy.coinsEarned += event.coins;
      metrics.economy.spoilsCoins += event.coins;
    }
    if (event.kind === "IMPROVEMENT_PILLAGED") {
      metrics.economy.coinsEarned += event.coinDelta;
      metrics.economy.pillageCoins += event.coinDelta;
    }
    if (event.kind === "UNIT_DISBANDED") {
      metrics.economy.coinsEarned += event.coinDelta;
      metrics.economy.disbandCoins += event.coinDelta;
      if (telemetry.risings.has(event.unitId)) {
        metrics.undead.risingsDisbanded += 1;
        metrics.undead.risingDisbandCoins += event.coinDelta;
      }
      if (telemetry.raisedSkeletons.has(event.unitId)) {
        metrics.undead.raisedSkeletonsDisbanded += 1;
        metrics.undead.raisedSkeletonDisbandCoins += event.coinDelta;
      }
    }
    if (event.kind === "CITY_REWARD_CHOSEN") {
      metrics.rewards[event.reward] += 1;
      if (event.coinDelta > 0) metrics.economy.coinsEarned += event.coinDelta;
    }
    if (event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED") {
      metrics.rewards[event.reward] += 1;
      metrics.economy.coinsEarned += event.coins;
    }
    // Revision 19: an Egg laid counts as its role's production (the Coins
    // are spent when it is laid); Dinosaur telemetry is `pulp_wars-c87.8`.
    if (
      event.kind === "UNIT_TRAINED" ||
      event.kind === "NAVAL_UNIT_TRAINED" ||
      event.kind === "EGG_LAID"
    ) {
      metrics.roles.trained[event.role] += 1;
      metrics.economy.coinsSpent += event.cost;
      metrics.roles.trainingCoins[event.role] += event.cost;
      const faction = ownerFaction(after, event.playerId);
      metrics.factionRoles[faction].trained[event.role] += 1;
      metrics.factionRoles[faction].trainingCoins[event.role] += event.cost;
    }
    if (event.kind === "MONSTER_BOUNTY_AWARDED")
      metrics.monsters.bountyCoins += event.coins;
    if (event.kind === "COMBAT_RESOLVED") {
      const preview = event.preview;
      const attacker = before.units.find(
        (unit) => unit.id === preview.attackerId,
      );
      if (attacker !== undefined) {
        const splashDamage = sum(preview.splash.map((entry) => entry.damage));
        const splashKills = preview.splash.filter((entry) => entry.dies).length;
        creditDamage(
          before,
          metrics,
          telemetry,
          attacker,
          preview.damageToDefender + splashDamage,
          Number(preview.defenderDies) + splashKills,
        );
        metrics.undead.splashHits += preview.splash.length;
        metrics.undead.splashDamage += splashDamage;
        metrics.undead.splashKills += splashKills;
        if (
          attacker.role === "CATAPULT" &&
          !isNeutralOwnerV7(attacker.ownerId) &&
          unitKind(before, attacker) === "UNDEAD"
        ) {
          metrics.undead.lichSplashDamage += splashDamage;
          metrics.undead.lichSplashKills += splashKills;
        }
        const heal = preview.attackerHeal + preview.defenderHeal;
        if (heal > 0) {
          metrics.undead.lifestealHeals +=
            Number(preview.attackerHeal > 0) + Number(preview.defenderHeal > 0);
          metrics.undead.lifestealHealing += heal;
        }
        metrics.undead.plagueApplications += preview.plagued.length;
        metrics.undead.bites +=
          Number(preview.attackerBitten) + Number(preview.defenderBitten);
        metrics.undead.unansweredAttacks += Number(
          preview.noRetaliationReason === "UNANSWERED",
        );
        metrics.undead.infectionsOnAttack += Number(preview.defenderInfected);
        metrics.undead.infectionsOnRetaliation += Number(
          preview.attackerInfected,
        );
        if (attacker.role === "KNIGHT") {
          metrics.knightOverrun.attacks += 1;
          metrics.knightOverrun.retaliations += Number(preview.retaliation);
          metrics.knightOverrun.survivals += Number(!preview.attackerDies);
          metrics.knightOverrun.advances += Number(preview.overrunAdvance);
          metrics.knightOverrun.continuations += Number(
            preview.overrunContinues,
          );
          metrics.knightOverrun.continuationWithoutAdvanceViolations += Number(
            preview.overrunContinues && !preview.overrunAdvance,
          );
          let chain = telemetry.knightOverrunChains.get(attacker.id);
          if (chain === undefined) {
            metrics.knightOverrun.chainsStarted += 1;
            chain = { attacks: 0 };
            telemetry.knightOverrunChains.set(attacker.id, chain);
          }
          metrics.knightOverrun.chainAccountingViolations += Number(
            preview.attacksUsed !== chain.attacks + 1,
          );
          chain.attacks += 1;
          metrics.knightOverrun.longestChain = Math.max(
            metrics.knightOverrun.longestChain,
            chain.attacks,
          );
          if (!preview.overrunContinues || preview.attackerDies) {
            finishKnightOverrunChain(metrics, chain.attacks);
            telemetry.knightOverrunChains.delete(attacker.id);
            telemetry.knightOverrunInterleaved.delete(attacker.id);
          }
        }
      }
      const defender = before.units.find(
        (unit) => unit.id === preview.targetUnitId,
      );
      if (defender !== undefined && preview.damageToAttacker > 0)
        creditDamage(
          before,
          metrics,
          telemetry,
          defender,
          preview.damageToAttacker,
          Number(preview.attackerDies),
        );
    }
    if (event.kind === "WAIL_RESOLVED") {
      const banshee = before.units.find((unit) => unit.id === event.unitId);
      const damage = sum(event.results.map((entry) => entry.damage));
      const kills = event.results.filter((entry) => entry.dies).length;
      metrics.undead.wailUses += 1;
      metrics.undead.wailTargets += event.results.length;
      metrics.undead.wailZeroDamageTargets += event.results.filter(
        (entry) => entry.damage === 0,
      ).length;
      metrics.undead.wailDamage += damage;
      metrics.undead.wailKills += kills;
      if (banshee !== undefined)
        creditDamage(before, metrics, telemetry, banshee, damage, kills);
    }
    if (event.kind === "UNIT_INFECTED") {
      metrics.undead.infections += 1;
      telemetry.risings.add(event.unitId);
      const tile = before.board.tiles.find((item) => same(item.at, event.at));
      const city = before.cities.find((item) => same(item.at, event.at));
      const hostileCity = city !== undefined && city.ownerId !== event.playerId;
      const village = city === undefined && tile?.site === "VILLAGE";
      metrics.undead.infectionsOnCityCenters += Number(hostileCity);
      metrics.undead.infectionsOnVillageCenters += Number(village);
      if (hostileCity || village) telemetry.centerRisings.add(event.unitId);
    }
    if (event.kind === "GRAVE_CREATED") metrics.undead.gravesCreated += 1;
    if (event.kind === "PLAGUE_DAMAGED") {
      for (const entry of event.results)
        telemetry.plagueTurns.set(
          entry.unitId,
          (telemetry.plagueTurns.get(entry.unitId) ?? 0) + 1,
        );
      metrics.undead.plagueDamageEntries += event.results.length;
      metrics.undead.plagueDamage += sum(
        event.results.map((entry) => entry.damage),
      );
      metrics.undead.plagueDeaths += event.results.filter(
        (entry) => entry.dies,
      ).length;
    }
    if (event.kind === "PLAGUE_SPREAD")
      metrics.undead.plagueSpreads += event.results.length;
    if (event.kind === "PLAGUE_CLEARED")
      metrics.undead.plagueCleared += event.unitIds.length;
    if (event.kind === "PLAGUE_EXPIRED")
      metrics.undead.plagueExpired += event.unitIds.length;
    if (event.kind === "BITTEN_UNIT_RISEN") {
      metrics.undead.bittenRisings += 1;
      telemetry.risings.add(event.unitId);
    }
    if (event.kind === "WOUNDED_TENDED")
      for (const result of event.results) {
        metrics.undead.plagueCures += Number(result.curedPlague);
        metrics.undead.bittenCures += Number(result.curedBitten);
      }
    if (event.kind === "DEAD_RAISED") {
      metrics.undead.raiseDeadUses += 1;
      metrics.undead.skeletonsRaised += event.results.length;
      metrics.undead.maximumSkeletonsPerRaise = Math.max(
        metrics.undead.maximumSkeletonsPerRaise,
        event.results.length,
      );
      for (const result of event.results) {
        telemetry.raisedSkeletons.add(result.unitId);
        telemetry.risings.add(result.unitId);
      }
    }
    if (event.kind === "GRAVE_DEVOURED") {
      metrics.undead.devours += 1;
      metrics.undead.devourHealing += event.amount;
      metrics.undead.devourDenials += Number(event.amount === 0);
    }
    if (
      event.kind === "UNIT_DIED" ||
      (event.kind === "UNIT_SPAWN_DISPLACED" && event.to === null)
    ) {
      const removedUnitId =
        event.kind === "UNIT_DIED" ? event.unitId : event.displacedUnitId;
      // A burrowed unit dies with its eliminated seat (an all-units read).
      const unit = allOwnedUnitsV7(before).find(
        (item) => item.id === removedUnitId,
      );
      if (unit !== undefined && isNeutralOwnerV7(unit.ownerId))
        metrics.monsters.slainRound = before.round;
      else if (unit !== undefined) {
        metrics.roles.losses[unit.role] += 1;
        metrics.factionRoles[unitKind(before, unit)].losses[unit.role] += 1;
      }
      if (telemetry.raisedSkeletons.has(removedUnitId))
        metrics.undead.raisedSkeletonLosses += 1;
      telemetry.catapultShotTargets.delete(removedUnitId);
      telemetry.healingSinceCatapultShot.delete(removedUnitId);
      telemetry.catapultSetupUnits.delete(removedUnitId);
      const chain = telemetry.knightOverrunChains.get(removedUnitId);
      if (chain !== undefined) {
        finishKnightOverrunChain(metrics, chain.attacks);
        telemetry.knightOverrunChains.delete(removedUnitId);
        telemetry.knightOverrunInterleaved.delete(removedUnitId);
      }
    }
    if (event.kind === "WOUNDED_TENDED")
      for (const result of event.results)
        if (telemetry.catapultShotTargets.has(result.unitId))
          telemetry.healingSinceCatapultShot.set(
            result.unitId,
            (telemetry.healingSinceCatapultShot.get(result.unitId) ?? 0) +
              result.amount,
          );
    if (event.kind === "WINDMILL_HEALING_RESOLVED")
      for (const result of event.results)
        if (telemetry.catapultShotTargets.has(result.unitId))
          telemetry.healingSinceCatapultShot.set(
            result.unitId,
            (telemetry.healingSinceCatapultShot.get(result.unitId) ?? 0) +
              result.amount,
          );
    if (
      event.kind === "UNIT_RECOVERED" &&
      telemetry.catapultShotTargets.has(event.unitId)
    )
      telemetry.healingSinceCatapultShot.set(
        event.unitId,
        (telemetry.healingSinceCatapultShot.get(event.unitId) ?? 0) +
          event.amount,
      );
    if (event.kind === "ACHIEVEMENT_UNLOCKED") {
      metrics.achievements.unlockRound[event.achievement] ??= after.round;
      metrics.achievements.unlockedSeats[event.achievement] += 1;
    }
    if (event.kind === "MONUMENT_BUILT") {
      metrics.achievements.monumentPlacements += 1;
      metrics.achievements.monumentPopulation += event.populationAdded;
      metrics.achievements.rewardsFromMonumentGrowth += events.filter(
        (candidate) =>
          candidate.kind === "CITY_REWARD_QUEUED" ||
          candidate.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED",
      ).length;
    }
    if (event.kind === "CITY_CAPTURED")
      recordMonumentOwnershipChange(before, after, event.cityId, metrics);
  }
  // Revision 15 Plague duration: an infection ends when its entry leaves
  // canonical state (Plague never ends and restarts within one transition).
  if (before.plagued.length > 0) {
    const current = new Set(after.plagued.map((entry) => entry.unitId));
    for (const entry of before.plagued) {
      if (current.has(entry.unitId)) continue;
      const turns = Math.min(
        PLAGUE_DURATION_TURNS_V7,
        telemetry.plagueTurns.get(entry.unitId) ?? 0,
      );
      metrics.undead.plagueTurnsAtEnd[turns] =
        (metrics.undead.plagueTurnsAtEnd[turns] ?? 0) + 1;
      telemetry.plagueTurns.delete(entry.unitId);
    }
  }
}

function recordSnapshotV7(
  state: GameStateV7,
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
  turnBoundary: boolean,
): void {
  const activePlayerId = activePlayerIdV7(state);
  for (const player of state.players) {
    const view = viewForV7(state, player.id);
    for (const progress of view.achievementProgress)
      metrics.achievements.progressMaximum[progress.achievement] = Math.max(
        metrics.achievements.progressMaximum[progress.achievement],
        progress.achievement === "EXPLORER"
          ? progress.currentExploredTiles
          : progress.achievement === "ENGINEER"
            ? progress.currentMaximumOutput
            : progress.achievement === "MUSTER"
              ? progress.currentDistinctTrainableRoles
              : progress.current,
      );
  }
  if (turnBoundary) {
    for (const city of state.cities.filter(
      (candidate) => candidate.ownerId === activePlayerId,
    )) {
      if (city.population < 0)
        metrics.economy.negativePopulationLoss += -city.population;
      const excess =
        assignedUnitCountV7(state, city.id) - cityUnitCapacityV7(state, city);
      if (excess > 0) {
        metrics.capacity.overcapacityStates += 1;
        metrics.capacity.overcapacityStatesByFaction[
          ownerFaction(state, city.ownerId)
        ] += 1;
        metrics.capacity.maximumOvercapacity = Math.max(
          metrics.capacity.maximumOvercapacity,
          excess,
        );
      }
      if (cityIsBesieged(state, city.id))
        metrics.catapult.siegeTurnBoundaries += 1;
    }
    for (const tile of state.board.tiles) {
      if (tile.improvement === null) continue;
      const value = spatialContributionAtV7(state, tile.at, tile.improvement);
      // Revision 14 (E2): Commerce no longer doubles Market income.
      const output =
        tile.improvement === "MARKET"
          ? marketCoinsV7(value.marketIncome)
          : value.population;
      increment(
        metrics.improvements.liveOutputHistogram[tile.improvement],
        String(output),
      );
    }
  }
  metrics.undead.gravesMaximum = Math.max(
    metrics.undead.gravesMaximum,
    state.graves.length,
  );
  metrics.undead.plaguedMaximum = Math.max(
    metrics.undead.plaguedMaximum,
    state.plagued.length,
  );
  metrics.undead.bittenMaximum = Math.max(
    metrics.undead.bittenMaximum,
    state.bitten.length,
  );
  metrics.achievements.monumentPopulation =
    state.board.tiles.filter((tile) => tile.improvement === "MONUMENT").length *
    3;
  if (turnBoundary)
    for (const unit of state.units.filter(
      (candidate) =>
        candidate.role === "CATAPULT" &&
        candidate.ownerId === activePlayerId &&
        candidate.hp > 0,
    )) {
      const screened = state.units.some(
        (candidate) =>
          candidate.ownerId === unit.ownerId &&
          candidate.id !== unit.id &&
          candidate.hp * 2 >= candidate.maxHp &&
          unitRoleRuleV7(state, candidate).defense2 >= 4 &&
          chebyshev(candidate.at, unit.at) === 1,
      );
      if (screened) metrics.catapult.screenSurvivals += 1;
    }
  telemetry.contributionByTile.clear();
  for (const [key, value] of currentContributions(state))
    telemetry.contributionByTile.set(key, value);
}

function recordContributionTransitions(
  before: GameStateV7,
  after: GameStateV7,
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
): void {
  const prior =
    telemetry.contributionByTile.size > 0
      ? telemetry.contributionByTile
      : currentContributions(before);
  const next = currentContributions(after);
  for (const [key, value] of next) {
    const old = prior.get(key);
    if (old !== undefined && old.value > 0 && value.value === 0)
      metrics.improvements.outages[value.improvement] += 1;
    if (old !== undefined && old.value === 0 && value.value > 0)
      metrics.improvements.resumptions[value.improvement] += 1;
  }
}

function currentContributions(state: GameStateV7) {
  const result = new Map<
    string,
    { readonly improvement: ImprovementIdV7; readonly value: number }
  >();
  for (const tile of state.board.tiles) {
    if (tile.improvement === null) continue;
    const contribution = spatialContributionAtV7(
      state,
      tile.at,
      tile.improvement,
    );
    result.set(coordKey(tile.at), {
      improvement: tile.improvement,
      value:
        tile.improvement === "MARKET"
          ? marketCoinsV7(contribution.marketIncome)
          : contribution.population,
    });
  }
  return result;
}

function auditPublicEqualityV7(
  view: PlayerViewV7,
  metrics: HeadlessMetricsV7,
): void {
  const equal = JSON.parse(canonicalJson(view)) as PlayerViewV7;
  const left = queryPlayerCommandsV7(view);
  const right = queryPlayerCommandsV7(equal);
  metrics.observation.checks += 1;
  metrics.observation.commandChecks += 1;
  if (canonicalJson(left) !== canonicalJson(right))
    metrics.observation.mismatches += 1;
  for (const command of left) {
    const previews: unknown[] = [
      previewEconomicV7(view, command),
      previewEconomicV7(equal, command),
    ];
    if (command.kind === "ATTACK")
      previews.push(
        queryCombatPreviewV7(view, command.unitId, command.targetUnitId),
        queryCombatPreviewV7(equal, command.unitId, command.targetUnitId),
      );
    if (command.kind === "BUILD_MONUMENT")
      previews.push(
        previewMonumentV7(view, command),
        previewMonumentV7(equal, command),
      );
    for (let index = 0; index < previews.length; index += 2) {
      metrics.observation.previewChecks += 1;
      if (canonicalJson(previews[index]) !== canonicalJson(previews[index + 1]))
        metrics.observation.mismatches += 1;
    }
  }
  metrics.observation.policyChecks += 1;
  if (
    canonicalJson(chooseNormalCommandV7(view)) !==
    canonicalJson(chooseNormalCommandV7(equal))
  )
    metrics.observation.mismatches += 1;
  metrics.observation.hiddenInformationViolations =
    metrics.observation.mismatches;
}

function auditRelationshipCommandV7(
  state: GameStateV7,
  actor: PlayerId,
  command: CommandV7,
  metrics: HeadlessMetricsV7,
): void {
  const actorUnit =
    "unitId" in command
      ? state.units.find((unit) => unit.id === command.unitId)
      : undefined;
  if (
    command.kind === "MOVE" &&
    actorUnit?.role === "KNIGHT" &&
    actorUnit.activation.attacksUsed > 0
  )
    metrics.knightOverrun.attemptedMovementViolations += 1;
  if (command.kind === "CAPTURE" && actorUnit?.role === "KNIGHT")
    metrics.knightOverrun.attemptedCaptureViolations += 1;
  if (
    command.kind === "ATTACK" &&
    arePlayersAlliedV7(
      state,
      actor,
      state.units.find((unit) => unit.id === command.targetUnitId)?.ownerId ??
        actor,
    )
  )
    metrics.relationships.alliedHostileActions += 1;
  if (command.kind === "MOVE")
    for (const at of command.path) {
      const tile = state.board.tiles.find((item) => same(item.at, at));
      const owner = state.cities.find(
        (city) => city.id === tile?.territoryCityId,
      )?.ownerId;
      if (owner !== undefined && arePlayersAlliedV7(state, actor, owner))
        metrics.relationships.alliedTerritoryPathSteps += 1;
    }
}

function recordMonumentOwnershipChange(
  before: GameStateV7,
  after: GameStateV7,
  cityId: number,
  metrics: HeadlessMetricsV7,
): void {
  const beforeOwner = before.cities.find((city) => city.id === cityId)?.ownerId;
  const afterOwner = after.cities.find((city) => city.id === cityId)?.ownerId;
  const count = before.board.tiles.filter(
    (tile) =>
      tile.territoryCityId === cityId && tile.improvement === "MONUMENT",
  ).length;
  if (count > 0 && beforeOwner !== afterOwner)
    metrics.achievements.monumentTransfers += count;
}

/**
 * The Martian revision telemetry (section 16.2) of one accepted command,
 * from its canonical events and the states around it.
 */
function recordMartianV7(
  before: GameStateV7,
  after: GameStateV7,
  actorId: PlayerId,
  command: CommandV7,
  events: readonly DomainEventV7[],
  metrics: HeadlessMetricsV7,
): void {
  const martian = metrics.martian;
  martian.controlledMaximum = Math.max(
    martian.controlledMaximum,
    after.mindControlled.length,
  );
  const absorbed = (
    source: keyof MartianMetricsV7["shieldAbsorbed"],
    shieldDamage: number,
    hpDamage: number,
  ): void => {
    martian.shieldAbsorbed[source] += shieldDamage;
    if (shieldDamage > 0 && hpDamage === 0) martian.hitsFullyAbsorbed += 1;
  };
  const actorUnit =
    "unitId" in command
      ? before.units.find((unit) => unit.id === command.unitId)
      : undefined;
  if (
    command.kind === "CAPTURE" &&
    before.mindControlled.some((entry) => entry.unitId === command.unitId)
  )
    martian.controlledCaptures += 1;
  if (
    command.kind === "RALLY" &&
    actorUnit !== undefined &&
    unitKind(before, actorUnit) === "MARTIAN"
  )
    martian.psychicCommands += 1;
  if (
    command.kind === "MOVE" &&
    actorUnit !== undefined &&
    unitFliesV7(before, actorUnit)
  ) {
    const moved = events.find((event) => event.kind === "UNIT_MOVED");
    if (
      moved?.kind === "UNIT_MOVED" &&
      moved.path
        .slice(0, -1)
        .some((at) =>
          before.units.some(
            (unit) => unit.ownerId !== actorId && same(unit.at, at),
          ),
        )
    )
      martian.flyoverMoves += 1;
  }
  let turnEnded = false;
  for (const event of events) {
    if (event.kind === "TURN_ENDED") turnEnded = true;
    if (event.kind === "SHIELDS_RECHARGED") {
      martian.rechargeEvents += 1;
      martian.rechargedShields += event.results.length;
      if (command.kind === "END_TURN" && !turnEnded)
        martian.endTurnRechargeEvents += 1;
    }
    if (event.kind === "COMBAT_RESOLVED") {
      const preview = event.preview;
      absorbed(
        "attack",
        preview.defenderShieldDamage,
        preview.damageToDefender,
      );
      if (preview.retaliation)
        absorbed(
          "retaliation",
          preview.attackerShieldDamage,
          preview.damageToAttacker,
        );
      const attacker = before.units.find(
        (unit) => unit.id === preview.attackerId,
      );
      const target = before.units.find(
        (unit) => unit.id === preview.targetUnitId,
      );
      const pierceAt =
        attacker !== undefined &&
        target !== undefined &&
        attackHasPierceV7(unitRoleRuleV7(before, attacker), attacker)
          ? pierceTileV7(attacker.at, target.at)
          : null;
      for (const entry of preview.splash) {
        absorbed("splash", entry.shieldDamage, entry.damage);
        if (pierceAt === null || !same(entry.at, pierceAt)) continue;
        const victim = before.units.find((unit) => unit.id === entry.unitId);
        if (
          victim !== undefined &&
          arePlayersHostileV7(before, actorId, victim.ownerId)
        )
          martian.pierceHitsHostile += 1;
        else martian.pierceHitsFriendly += 1;
        martian.pierceDamage += entry.damage;
        martian.pierceKills += Number(entry.dies);
      }
      if (preview.rayPower !== "NONE") {
        if (preview.rayPower === "FULL") martian.raysFull += 1;
        else {
          martian.raysHalf += 1;
          if (
            before.cooling.some(
              (entry) =>
                entry.unitId === preview.attackerId && !entry.firedThisTurn,
            )
          )
            martian.raysHalfCooling += 1;
          else martian.raysHalfMoved += 1;
        }
        martian.rayDamage += preview.damageToDefender;
        martian.rayKills += Number(preview.defenderDies);
        if (preview.fortificationIgnored > 0)
          martian.raysIgnoringFortification += 1;
      }
    }
    if (event.kind === "WAIL_RESOLVED")
      for (const entry of event.results)
        absorbed("wail", entry.shieldDamage, entry.damage);
    if (event.kind === "EXPLOSION_RESOLVED")
      for (const entry of event.results)
        absorbed("blast", entry.shieldDamage, entry.damage);
    if (event.kind === "UNIT_BEAMED") {
      martian.beamDowns += 1;
      const passenger = before.units.find(
        (unit) => unit.id === event.passengerUnitId,
      );
      if (passenger !== undefined)
        martian.beamDownPassengers[passenger.role] += 1;
    }
    if (event.kind === "UNIT_MIND_CONTROLLED") {
      martian.mindControls += 1;
      martian.mindControlTargets[event.targetRole] += 1;
      martian.mindControlTargetHp += event.hp;
    }
    if (event.kind === "UNIT_RELEASED") martian.controlledReleased += 1;
    if (event.kind === "UNIT_DIED" && event.cause === "BRAIN_LOST")
      martian.controlledLost += 1;
    if (event.kind === "UNIT_PULLED") {
      const target = before.units.find(
        (unit) => unit.id === event.targetUnitId,
      );
      if (target?.ownerId === actorId) martian.tractorBeamsOwn += 1;
      else martian.tractorBeamsHostile += 1;
      if (before.cities.some((city) => same(city.at, event.from)))
        martian.tractorBeamsOffCenter += 1;
    }
    if (event.kind === "UNIT_EMBARKED") {
      const tile = before.board.tiles.find((item) => same(item.at, event.to));
      if (tile?.improvement !== "PORT" && tile?.improvement !== "SHIPYARD")
        martian.selfLaunches += 1;
    }
  }
}

/**
 * The Mind Control revision: a unit's kind (its role statistics belong to
 * the faction whose unit it is, also while it is mind-controlled).
 */
function unitKind(
  state: GameStateV7,
  unit: Pick<GameStateV7["units"][number], "id" | "ownerId">,
): FactionIdV7 {
  // Map curiosities (section 10.5): a player-only reader; every caller skips
  // the neutral Monster first (its numbers belong to no faction).
  if (isNeutralOwnerV7(unit.ownerId)) throw new RangeError("NEUTRAL_UNIT");
  const kind = state.players.some((player) => player.id === unit.ownerId)
    ? unitFactionV7(state, unit)
    : "ORIGINAL";
  return kind === NEUTRAL_KIND_V7 ? "ORIGINAL" : kind;
}

function ownerFaction(state: GameStateV7, playerId: PlayerId): FactionIdV7 {
  return (
    state.players.find((player) => player.id === playerId)?.faction ??
    "ORIGINAL"
  );
}

/** Credit damage and kills (including Wail, splash, and retaliation). */
function creditDamage(
  before: GameStateV7,
  metrics: HeadlessMetricsV7,
  telemetry: TelemetryStateV7,
  dealer: GameStateV7["units"][number],
  damage: number,
  kills: number,
): void {
  // Map curiosities: the neutral Monster's damage and kills belong to no
  // role or faction (they are counted in `metrics.monsters`).
  if (isNeutralOwnerV7(dealer.ownerId)) {
    metrics.monsters.damageDealt += damage;
    metrics.monsters.kills += kills;
    return;
  }
  const faction = metrics.factionRoles[unitKind(before, dealer)];
  metrics.roles.damage[dealer.role] += damage;
  metrics.roles.kills[dealer.role] += kills;
  faction.damage[dealer.role] += damage;
  faction.kills[dealer.role] += kills;
  if (telemetry.raisedSkeletons.has(dealer.id))
    metrics.undead.raisedSkeletonKills += kills;
}

function cityIsBesieged(state: GameStateV7, cityId: number): boolean {
  const city = state.cities.find((item) => item.id === cityId);
  return (
    city !== undefined &&
    state.units.some(
      (unit) =>
        unit.hp > 0 &&
        same(unit.at, city.at) &&
        unit.ownerId !== city.ownerId &&
        !arePlayersAlliedV7(state, unit.ownerId, city.ownerId),
    )
  );
}

function technologyBranch(tech: TechnologyIdV7): string {
  return (
    ORIGINAL_BASELINE_V5_TREE.nodes.find((node) => node.id === tech)?.branch ??
    "SETTLEMENT"
  );
}

function queryResearchCost(view: PlayerViewV7, tech: TechnologyIdV7): number {
  const cities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  ).length;
  const tier = ORIGINAL_BASELINE_V5_TREE.nodes.find(
    (node) => node.id === tech,
  )?.tier;
  if (tier === undefined) throw new RangeError("Unknown technology");
  return tier === 1
    ? 5 + cities - 1
    : tier === 2
      ? 7 + 2 * (cities - 1)
      : 9 + 3 * (cities - 1);
}

function activePlayerIdV7(state: GameStateV7): PlayerId {
  const id = state.turnOrder[state.activeSeatIndex];
  if (id === undefined) throw new RangeError("Active player disappeared");
  return id;
}

function diagnostic(
  state: GameStateV7,
  playerId: PlayerId | null,
  code: string,
  message: string,
): AiDiagnosticV7 {
  return {
    code,
    message,
    commandIndex: state.commandIndex,
    round: state.round,
    playerId,
  };
}

function validateCap(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new RangeError(`${name} must be a positive safe integer`);
}

function errorMessage(cause: unknown): string {
  return cause instanceof Error ? cause.message : "Policy failed";
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

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

const chebyshev = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const same = (
  left: { x: number; y: number },
  right: { x: number; y: number },
) => left.x === right.x && left.y === right.y;
const coordKey = (at: { x: number; y: number }) => `${at.y},${at.x}`;
