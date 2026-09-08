import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  ORIGINAL_BASELINE_V3_TREE,
  effectiveRoleRuleV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CombatPreviewV7 } from "../engine/v7/events";
import {
  createPublicCommandWorkV7,
  createPublicPlanningWorkV7,
  previewBlackoutV7,
  previewDefectionV7,
  previewEconomicV7,
  previewMonumentV7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
  queryPublicEconomicPotentialsV7,
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

export const NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7 = 128;

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
  readonly pursuitNodesSearched: number;
  readonly prngDraws: 0;
}

interface ThreatV7 {
  readonly cityId: CityId;
  readonly unitId: UnitId;
  readonly severity: 1 | 2 | 3;
}

interface PolicyContextV7 {
  readonly view: PlayerViewV7;
  readonly commands: readonly CommandV7[];
  readonly threats: ThreatV7[];
  readonly threatenedTiles: ReadonlyMap<UnitId, ReadonlySet<string>>;
  pursuitNodesSearched: number;
}

type AiReadyItemV7 = ReturnType<typeof queryAiReadyCommandsV7>[number];

const THREATENED_ROLE_ORDER = [
  "GUARD",
  "FIGHTER",
  "MEDIC",
  "HEAVY",
  "MARKSMAN",
  "SCOUT",
  "RAIDER",
  "BREACHER",
  "CATAPULT",
  "SABOTEUR",
  "LANCER",
  "ENVOY",
] as const satisfies readonly UnitRoleIdV7[];

const GENERAL_ROLE_ORDER = [
  "SCOUT",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "MEDIC",
  "HEAVY",
  "BREACHER",
  "CATAPULT",
  "LANCER",
  "SABOTEUR",
  "ENVOY",
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
  return scoreCommandWithContext(
    makeContext(
      view,
      queryAiReadyCommandsV7(view).map((item) => item.command),
    ),
    command,
    tie,
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
    "COMMAND_PREPARATION" | "PLANNING_PREPARATION" | "CONTEXT" | "SCORING" =
    "COMMAND_PREPARATION";
  private ready: ReturnType<typeof queryAiReadyCommandsV7> | null = null;
  private context: PolicyContextV7 | null = null;
  private visibleHostiles: readonly PublicUnitV7[] = [];
  private readonly scored: ScoredAiCandidateV7[] = [];
  private contextCursor = 0;
  private cursor = 0;
  private activeScore: Generator<void, AiScoreV7> | null = null;
  private activeItem: AiReadyItemV7 | null = null;

  constructor(
    readonly view: PlayerViewV7,
    private readonly readClock: () => number = now,
  ) {
    validatePolicyRegistration(view);
    this.commandWork = createPublicCommandWorkV7(view);
  }

  runSlice(maxMilliseconds = 8): NormalAiDecisionV7 | null {
    if (!Number.isFinite(maxMilliseconds) || maxMilliseconds <= 0)
      throw new RangeError("maxMilliseconds must be positive");
    const started = this.readClock();
    do {
      if (this.phase === "COMMAND_PREPARATION") {
        const progress = this.commandWork.advance(1);
        if (!progress.done || progress.commands === null) continue;
        if (isGloballyPursuitLockedCommands(progress.commands)) {
          this.prepareScoringContext();
        } else {
          this.planningWork = createPublicPlanningWorkV7(
            this.view,
            progress.commands,
          );
          this.phase = "PLANNING_PREPARATION";
        }
        continue;
      }
      if (this.phase === "PLANNING_PREPARATION") {
        const progress = this.planningWork?.advance(1);
        if (progress?.done === true && progress.result !== null)
          this.prepareScoringContext();
        continue;
      }
      const context = this.context;
      const ready = this.ready;
      if (context === null || ready === null)
        throw new NormalPolicyErrorV7(
          "NO_PUBLIC_COMMAND",
          "Policy preparation lost its public context",
        );
      const hostile = this.visibleHostiles[this.contextCursor];
      if (this.phase === "CONTEXT" && hostile !== undefined) {
        addHostileThreats(context, hostile);
        this.contextCursor += 1;
        continue;
      }
      this.phase = "SCORING";
      if (this.activeScore === null) {
        const item = ready[this.cursor];
        if (item === undefined) return this.finish();
        this.cursor += 1;
        if (!isPolicyCandidate(context, item.command)) continue;
        this.activeItem = item;
        this.activeScore = scoreCommandSteps(context, item.command, item.tuple);
      }
      const step = this.activeScore.next();
      if (!step.done) continue;
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
    } while (this.readClock() - started < maxMilliseconds);
    return null;
  }

  private prepareScoringContext(): void {
    this.ready = queryAiReadyCommandsV7(this.view);
    this.context = bareContext(
      this.view,
      this.ready.map((item) => item.command),
    );
    this.visibleHostiles = this.view.units.filter((unit) =>
      isHostile(this.view, unit.ownerId),
    );
    this.phase = "CONTEXT";
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
      pursuitNodesSearched: context.pursuitNodesSearched,
      prngDraws: 0,
    };
  }
}

function isGloballyPursuitLockedCommands(
  commands: readonly CommandV7[],
): boolean {
  return (
    commands.length > 0 &&
    commands.every(
      (command) =>
        command.kind === "ATTACK" ||
        command.kind === "PURSUE" ||
        command.kind === "END_PURSUIT",
    )
  );
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
    super(
      "Reward work, open Pursuit sequences, and End Turn cannot drain within the turn cap",
    );
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
  const openPursuits = view.units.filter(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.activation.pursuitPhase !== "NONE",
  ).length;
  return unrewardedLevels + openPursuits + 1;
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
  const open = view.units
    .filter(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.activation.pursuitPhase !== "NONE",
    )
    .sort((left, right) => left.id - right.id)[0];
  if (open !== undefined) return [{ kind: "END_PURSUIT", unitId: open.id }];
  return decision.command?.kind === "END_TURN"
    ? [decision.command]
    : [{ kind: "END_TURN" }];
}

function mandatoryWorkDeltaV7(view: PlayerViewV7, command: CommandV7): number {
  if (command.kind === "END_TURN" || command.kind === "END_PURSUIT") return -1;
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
  if (command.kind === "ATTACK") {
    const actor = view.units.find((unit) => unit.id === command.unitId);
    const preview = queryCombatPreviewV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (actor === undefined || preview === null)
      return Number.POSITIVE_INFINITY;
    const wasOpen = actor.activation.pursuitPhase !== "NONE";
    const remainsOpen = preview.pursuitWillOpen;
    return Number(remainsOpen) - Number(wasOpen);
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
  for (const unit of view.units)
    if (isHostile(view, unit.ownerId)) addHostileThreats(context, unit);
  return context;
}

function bareContext(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
): PolicyContextV7 {
  const threatenedTiles = new Map<UnitId, ReadonlySet<string>>();
  const threats: ThreatV7[] = [];
  return { view, commands, threats, threatenedTiles, pursuitNodesSearched: 0 };
}

function addHostileThreats(context: PolicyContextV7, unit: PublicUnitV7): void {
  const view = context.view;
  const tiles = new Set(
    publicThreatenedTilesForVisibleHostile(view, unit).map(coordKey),
  );
  (context.threatenedTiles as Map<UnitId, ReadonlySet<string>>).set(
    unit.id,
    tiles,
  );
  for (const city of view.cities.filter(
    (candidate) => candidate.ownerId === view.viewer.id,
  )) {
    if (!tiles.has(coordKey(city.at))) continue;
    context.threats.push({
      cityId: city.id,
      unitId: unit.id,
      severity: same(unit.at, city.at)
        ? 3
        : distance(unit.at, city.at) <= effectiveRoleRuleV7(unit.role).range
          ? 2
          : 1,
    });
  }
}

function publicThreatenedTilesForVisibleHostile(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CoordV7[] {
  const rule = effectiveRoleRuleV7(unit.role);
  if (!rule.abilities.includes("ATTACK")) return [];
  const origins: CoordV7[] = [unit.at];
  if (rule.mayUsePrimaryActionAfterMove) {
    const queue = [{ at: unit.at, spent2: 0 }];
    const best = new Map([[coordKey(unit.at), 0]]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      for (const tile of view.board.tiles) {
        if (distance(tile.at, current.at) !== 1) continue;
        if (
          tile.explored === false &&
          tile.diplomaticBlock === "ALLIED_TERRITORY"
        )
          continue;
        if (
          tile.explored &&
          tile.territoryOwnerId !== null &&
          tile.territoryOwnerId !== unit.ownerId &&
          publicPlayersAllied(view, unit.ownerId, tile.territoryOwnerId)
        )
          continue;
        if (
          tile.explored &&
          tile.terrain === "MOUNTAIN" &&
          !publicOwnerHasSurveying(view, unit.ownerId)
        )
          continue;
        if (
          view.units.some(
            (occupant) => occupant.id !== unit.id && same(occupant.at, tile.at),
          )
        )
          continue;
        const priorTile = view.board.tiles.find((item) =>
          same(item.at, current.at),
        );
        const roadStep =
          priorTile?.explored === true &&
          tile.explored === true &&
          priorTile.road &&
          tile.road &&
          priorTile.territoryOwnerId === unit.ownerId &&
          tile.territoryOwnerId === unit.ownerId;
        const spent2 = current.spent2 + (roadStep ? 1 : 2);
        if (spent2 > rule.move * 2) continue;
        const key = coordKey(tile.at);
        if ((best.get(key) ?? Number.POSITIVE_INFINITY) <= spent2) continue;
        best.set(key, spent2);
        origins.push(tile.at);
        const terrainStop =
          tile.explored &&
          (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN");
        const hostileZoc = view.units.some(
          (occupant) =>
            occupant.ownerId === view.viewer.id &&
            distance(occupant.at, tile.at) === 1,
        );
        if (!terrainStop && !hostileZoc) queue.push({ at: tile.at, spent2 });
      }
    }
  }
  const direct = view.board.tiles
    .map((tile) => tile.at)
    .filter((at) =>
      origins.some((origin) => {
        const range = distance(origin, at);
        return range >= rule.minimumRange && range <= rule.range;
      }),
    );
  const result =
    unit.role === "LANCER"
      ? [
          ...direct,
          ...view.board.tiles
            .map((tile) => tile.at)
            .filter((at) => direct.some((origin) => distance(origin, at) <= 3)),
        ]
      : direct;
  return [...new Map(result.map((at) => [coordKey(at), at])).values()];
}

function isPolicyCandidate(
  context: PolicyContextV7,
  command: CommandV7,
): boolean {
  if (command.kind === "WAIT") return false;
  if (command.kind === "TRAIN")
    return preferredTrainingRole(context, command.cityId) === command.role;
  if (command.kind === "CHOOSE_CITY_REWARD")
    return preferredReward(context, command) === command.reward;
  if (command.kind === "REDEVELOP")
    return scorePublicSpatialPlanV7(context.view, command) > 0;
  if (command.kind === "DISBAND")
    return usefulDisband(context.view, command as DisbandCommandV7);
  return true;
}

function scoreCommandWithContext(
  context: PolicyContextV7,
  command: CommandV7,
  readyTuple: readonly number[],
  precomputedPursuit?: PursuitSequenceValue,
): AiScoreV7 {
  const view = context.view;
  const actor = unitForCommand(view, command);
  const resultAt =
    command.kind === "MOVE" || command.kind === "PURSUE"
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
    if (command.kind === "BUILD_BARRACKS") {
      strategicValue += 2 * economic.preview.capacityDelta - 4;
      if (freeCapacity(view, economic.preview.ownerCityId) <= 0)
        strategicValue += 8;
    }
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

  if (command.kind === "RESEARCH") {
    const research = researchValue(context, command.tech);
    priority = research.priority;
    strategicValue = research.strategic;
    immediateValue = -research.cost;
  }

  if (command.kind === "TRAIN") {
    const rule = effectiveRoleRuleV7(command.role);
    priority = threatenedCity(context, command.cityId) ? 1260 : 1080;
    immediateValue = -(rule.cost ?? 0);
    strategicValue = trainingStrategicValue(context, command);
  }

  if (command.kind === "ATTACK") {
    const preview = queryCombatPreviewV7(
      view,
      command.unitId,
      command.targetUnitId,
    );
    if (preview !== null) {
      immediateValue = combatImmediateValue(preview);
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
      if (actor?.activation.pursuitPhase !== "NONE") {
        const sequence =
          precomputedPursuit ?? bestPursuitContinuation(context, view, command);
        immediateValue = sequence.immediate;
        strategicValue = sequence.strategic;
        safetyValue = sequence.safety;
        objectiveValue = sequence.spacing;
        priority = sequence.improves ? 1290 : -1;
      }
    }
  }

  if (command.kind === "PURSUE") {
    const sequence =
      precomputedPursuit ??
      bestPursuitContinuation(context, view, command as PursuitMoveCommandV7);
    priority = sequence.improves ? 1290 : -1;
    immediateValue = sequence.immediate;
    strategicValue = sequence.strategic;
    safetyValue = sequence.safety;
    objectiveValue = sequence.spacing;
  }

  if (command.kind === "END_PURSUIT") {
    // End is the zero-value leaf. Any improving complete public sequence beats
    // it on the remaining tuple; when none improves it is the sole fallback.
    priority = 1290;
    immediateValue = 0;
    if (actor !== undefined) {
      const leaf = pursuitLeafValue(view, actor.id, context);
      safetyValue = leaf.safety;
      objectiveValue = leaf.spacing;
    }
  }

  if (command.kind === "HEAL_ADJACENT") {
    const target = view.units.find((item) => item.id === command.targetUnitId);
    if (target !== undefined) {
      const amount = Math.min(
        view.viewer.researchedTechs.includes("RECOVERY") ? 6 : 4,
        target.maxHp - target.hp,
      );
      immediateValue = 8 * amount;
      priority = context.threats.some(
        (item) => item.cityId === cityAt(view, target.at)?.id,
      )
        ? 1270
        : 500;
    }
  }

  if (command.kind === "RECOVER") {
    priority = (actor?.hp ?? 0) * 2 < (actor?.maxHp ?? 0) ? 400 : 300;
    immediateValue =
      actor === undefined ? 0 : Math.min(2, actor.maxHp - actor.hp) * 8;
  }

  if (command.kind === "PROMOTE") {
    priority = 1320;
    immediateValue = 40;
  }

  if (command.kind === "CAPTURE") {
    const city = actor === undefined ? undefined : cityAt(view, actor.at);
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
    if (
      city !== undefined &&
      view.viewer.researchedTechs.includes("FORTIFICATION")
    )
      strategicValue += 6;
  }

  if (command.kind === "MOVE" && actor !== undefined) {
    const chest = view.treasureChests.some((at) => same(at, resultAt));
    const defectionEscape = markedTargetEscapeValue(view, actor, resultAt);
    const picket = scoutPicketValue(view, actor, resultAt);
    const screen = screenValue(view, actor, resultAt);
    if (chest) {
      priority = 1330;
      strategicValue = 1;
      immediateValue = 5;
    } else if (defectionEscape > 0) {
      priority = 1285;
      strategicValue = defectionEscape;
    } else if (movesOntoThreatenedCity(context, resultAt)) {
      priority = 1250;
    } else {
      objectiveValue = movementObjectiveValue(view, actor.at, resultAt);
      const reveal = publicRevealGain(view, actor, resultAt);
      priority = objectiveValue > 0 ? 700 : reveal > 0 ? 600 : -1;
      strategicValue = picket + screen;
      if (strategicValue > 0) priority = Math.max(priority, 710);
    }
  }

  if (command.kind === "OFFER_DEFECTION") {
    const preview = previewDefectionV7(view, command);
    if (preview.ok) {
      const target = view.units.find(
        (item) => item.id === command.targetUnitId,
      );
      const source = view.units.find((item) => item.id === command.unitId);
      const targetValue = target === undefined ? 0 : retainedUnitValue(target);
      const sourceRisk =
        source === undefined
          ? 0
          : visibleImmediateDamage(view, source, source.at, context);
      const escapeOptions = countVisibleDefectionRepliesV7(
        view,
        command.unitId,
        command.targetUnitId,
      );
      strategicValue =
        targetValue -
        sourceRisk -
        4 * escapeOptions -
        3 * Math.max(0, 2 - preview.preview.reservedCity.availableAfterOffer);
      futureValue = preview.preview.reservedCity.availableAfterOffer;
      safetyValue -= context.threats
        .filter(
          (threat) => threat.cityId === preview.preview.reservedCity.cityId,
        )
        .reduce((total, threat) => total + threat.severity, 0);
      objectiveValue = -preview.preview.reservedCity.cityId;
      if (
        preview.preview.cityOccupantSiegeConsequence === "BESIEGES_HOSTILE_CITY"
      )
        strategicValue += 20;
      immediateValue = -6;
      priority = strategicValue > 0 ? 1190 : -1;
    }
  }

  if (command.kind === "BLACKOUT_CITY") {
    const preview = previewBlackoutV7(view, command);
    if (preview.ok && !preview.preview.unitDetectionBlocks) {
      const city = view.cities.find((item) => item.id === command.cityId);
      const source = view.units.find((item) => item.id === command.unitId);
      const suppression =
        city === undefined ? 0 : attributableCityIncome(view, city);
      // Enemy Coins/research are private, so no development or Train command is
      // attributable from the actor's view. Only current public city income is.
      const deniedActions = 0;
      const exposureRisk =
        source === undefined
          ? 0
          : visibleImmediateDamage(view, source, source.at, context);
      strategicValue =
        Math.min(3, suppression) * 12 + deniedActions - exposureRisk;
      priority = strategicValue > 0 ? 1195 : -1;
    }
  }

  if (command.kind === "PILLAGE" && actor !== undefined) {
    const live = visibleImprovementValueAt(view, actor.at);
    const survival = visibleImmediateDamage(view, actor, actor.at, context);
    strategicValue = 12 * (live ?? 0) + 1 - survival;
    immediateValue = 1 + 5 * (live ?? 0);
    priority = strategicValue > 0 ? 1170 : -1;
  }

  if (command.kind === "DISBAND" && actor !== undefined) {
    immediateValue = Math.floor(
      (effectiveRoleRuleV7(actor.role).cost ?? 0) / 2,
    );
    strategicValue = freeCapacity(view, actor.homeCityId) <= 0 ? 6 : 0;
    priority = 1090;
  }

  if (command.kind === "END_TURN") priority = 0;

  safetyValue +=
    actor === undefined ||
    resultAt === null ||
    actor.activation.pursuitPhase !== "NONE"
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
  const actor = unitForCommand(context.view, command);
  const pursuitCommand =
    command.kind === "PURSUE" ||
    (command.kind === "ATTACK" && actor?.activation.pursuitPhase !== "NONE")
      ? (command as PursuitMoveCommandV7 | PursuitAttackCommandV7)
      : null;
  const pursuit =
    pursuitCommand === null
      ? undefined
      : yield* bestPursuitContinuationSteps(
          context,
          context.view,
          pursuitCommand,
        );
  return scoreCommandWithContext(context, command, readyTuple, pursuit);
}

interface PursuitSequenceValue {
  readonly improves: boolean;
  readonly immediate: number;
  readonly strategic: number;
  readonly safety: number;
  readonly spacing: number;
}

type PursuitAttackCommandV7 = Extract<CommandV7, { kind: "ATTACK" }>;
type PursuitMoveCommandV7 = {
  readonly kind: "PURSUE";
  readonly unitId: UnitId;
  readonly path: readonly CoordV7[];
};
type EndPursuitCommandV7 = {
  readonly kind: "END_PURSUIT";
  readonly unitId: UnitId;
};
type PursuitCommandV7 =
  PursuitAttackCommandV7 | PursuitMoveCommandV7 | EndPursuitCommandV7;
type DisbandCommandV7 = { readonly kind: "DISBAND"; readonly unitId: UnitId };

/** Complete public tree; depth is bounded by the authoritative three attacks. */
function bestPursuitContinuation(
  context: PolicyContextV7,
  view: PlayerViewV7,
  first: PursuitCommandV7,
): PursuitSequenceValue {
  return drain(bestPursuitContinuationSteps(context, view, first));
}

function* bestPursuitContinuationSteps(
  context: PolicyContextV7,
  view: PlayerViewV7,
  first: PursuitCommandV7,
): Generator<void, PursuitSequenceValue> {
  const value = yield* pursueBranchSteps(context, view, first);
  const baseline = pursuitLeafValue(view, first.unitId, context);
  return {
    ...value,
    improves:
      compareNumericTuple(pursuitValueTuple(value), [
        0,
        0,
        baseline.safety,
        baseline.spacing,
      ]) > 0,
  };
}

function* pursueBranchSteps(
  context: PolicyContextV7,
  view: PlayerViewV7,
  command: PursuitCommandV7,
): Generator<void, Omit<PursuitSequenceValue, "improves">> {
  context.pursuitNodesSearched += 1;
  yield;
  if (command.kind === "END_PURSUIT")
    return {
      immediate: 0,
      strategic: 0,
      ...pursuitLeafValue(view, command.unitId, context),
    };
  const actor = view.units.find((item) => item.id === command.unitId);
  if (actor === undefined)
    return { immediate: -10_000, strategic: 0, safety: -10_000, spacing: 0 };
  if (command.kind === "PURSUE") {
    const expected = command.path.at(-1) ?? actor.at;
    // A path outside existing public detection can legally shorten on concealed
    // contact. It remains a candidate, but no future target geometry is assumed.
    const guaranteed = command.path.every((at) =>
      publiclyDetected(view, at, actor.id),
    );
    const moved = projectPublicUnitForPolicyV7(view, actor.id, {
      at: expected,
      activation: { ...actor.activation, pursuitPhase: "PURSUIT_MOVED" },
    });
    if (!guaranteed)
      return {
        immediate: 0,
        strategic: 0,
        ...pursuitConservativeMoveLeaf(context, view, actor, command.path),
      };
    const next = pursuitCommands(moved, actor.id);
    return yield* bestPursuitBranchSteps(context, moved, next);
  }
  const preview = queryCombatPreviewV7(
    view,
    command.unitId,
    command.targetUnitId,
  );
  if (preview === null)
    return { immediate: -10_000, strategic: 0, safety: -10_000, spacing: 0 };
  const immediate = combatImmediateValue(preview);
  const target = view.units.find((item) => item.id === command.targetUnitId);
  if (target === undefined)
    return { immediate: -10_000, strategic: 0, safety: -10_000, spacing: 0 };
  const after = projectPursuitAttack(view, actor, target, preview);
  if (!preview.defenderDies || preview.attackerDies || !preview.pursuitWillOpen)
    return {
      immediate,
      strategic: targetStrategicValue(view, command.targetUnitId),
      ...pursuitLeafValue(after, actor.id, context),
    };
  const next = pursuitCommands(after, actor.id);
  const continuation = yield* bestPursuitBranchSteps(context, after, next);
  return {
    immediate: immediate + continuation.immediate,
    strategic:
      targetStrategicValue(view, command.targetUnitId) + continuation.strategic,
    safety: continuation.safety,
    spacing: continuation.spacing,
  };
}

function* bestPursuitBranchSteps(
  context: PolicyContextV7,
  view: PlayerViewV7,
  commands: readonly PursuitCommandV7[],
): Generator<void, Omit<PursuitSequenceValue, "improves">> {
  let best = {
    immediate: 0,
    strategic: 0,
    ...pursuitLeafValue(view, commands[0]?.unitId, context),
  };
  let bestTuple = pursuitValueTuple(best);
  for (const command of commands) {
    const value = yield* pursueBranchSteps(context, view, command);
    const tuple = pursuitValueTuple(value);
    if (compareNumericTuple(tuple, bestTuple) > 0) {
      best = value;
      bestTuple = tuple;
    }
  }
  return best;
}

function pursuitValueTuple(
  value: Omit<PursuitSequenceValue, "improves">,
): readonly number[] {
  return [value.strategic, value.immediate, value.safety, value.spacing];
}

function pursuitLeafValue(
  view: PlayerViewV7,
  unitId: UnitId | undefined,
  threatContext: PolicyContextV7,
): Pick<PursuitSequenceValue, "safety" | "spacing"> {
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

function pursuitConservativeMoveLeaf(
  context: PolicyContextV7,
  view: PlayerViewV7,
  actor: PublicUnitV7,
  path: readonly CoordV7[],
): Pick<PursuitSequenceValue, "safety" | "spacing"> {
  let worst = pursuitLeafValue(view, actor.id, context);
  for (let index = 0; index < path.length; index += 1) {
    const at = path[index];
    if (at === undefined) continue;
    const projected = projectPublicUnitForPolicyV7(view, actor.id, {
      at,
      activation: {
        ...actor.activation,
        pursuitPhase: "PURSUIT_MOVED",
      },
    });
    const candidate = pursuitLeafValue(projected, actor.id, context);
    if (
      compareNumericTuple(
        [candidate.safety, candidate.spacing],
        [worst.safety, worst.spacing],
      ) < 0
    )
      worst = candidate;
  }
  return worst;
}

function projectPursuitAttack(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): PlayerViewV7 {
  const nextAttacks = (actor.activation.attacksUsed + 1) as 1 | 2 | 3;
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
          attacked: !preview.pursuitWillOpen,
          attacksUsed: nextAttacks,
          pursuitPhase: preview.pursuitWillOpen ? "PURSUIT_READY" : "NONE",
          handled: !preview.pursuitWillOpen,
        },
      },
    ];
  });
  return projectPublicUnits(view, units, [actor.id, target.id]);
}

function pursuitCommands(
  view: PlayerViewV7,
  unitId: UnitId,
): readonly PursuitCommandV7[] {
  return queryAiReadyCommandsV7(view)
    .map((item) => item.command)
    .filter(
      (command): command is CommandV7 & PursuitCommandV7 =>
        "unitId" in command &&
        command.unitId === unitId &&
        (command.kind === "ATTACK" ||
          command.kind === "PURSUE" ||
          command.kind === "END_PURSUIT"),
    );
}

function combatImmediateValue(preview: CombatPreviewV7): number {
  return (
    20 * Number(preview.defenderDies) -
    16 * Number(preview.attackerDies) +
    10 * preview.damageToDefender -
    8 * preview.damageToAttacker
  );
}

function combatStrategicValue(
  context: PolicyContextV7,
  command: Extract<CommandV7, { kind: "ATTACK" }>,
  preview: CombatPreviewV7,
): number {
  const attacker = context.view.units.find(
    (item) => item.id === command.unitId,
  );
  const target = context.view.units.find(
    (item) => item.id === command.targetUnitId,
  );
  if (attacker === undefined || target === undefined) return 0;
  let value = targetStrategicValue(context.view, target.id);
  if (
    preview.push === "WILL_PUSH" &&
    cityAt(context.view, target.at)?.ownerId === context.view.viewer.id
  )
    value += 10;
  if (attacker.role === "CATAPULT") {
    const medicHealing = context.view.units.some(
      (item) =>
        item.ownerId === target.ownerId &&
        item.role === "MEDIC" &&
        distance(item.at, target.at) === 1,
    )
      ? 4
      : 0;
    const tile = context.view.board.tiles.find((item) =>
      same(item.at, target.at),
    );
    const idleRecovery =
      tile?.explored === true && tile.territoryOwnerId === target.ownerId
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
  const missingRoles = UNIT_ROLE_IDS_V7.filter(
    (role) =>
      role !== "JUGGERNAUT" &&
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
          (effectiveRoleRuleV7(role).cost ?? 0),
        value:
          effectiveRoleRuleV7(role).maxHp +
          effectiveRoleRuleV7(role).attack2 +
          effectiveRoleRuleV7(role).defense2,
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
    tech === "FORTIFICATION"
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
  const target = ORIGINAL_BASELINE_V3_TREE.nodes.find((node) =>
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
  const tech = effectiveRoleRuleV7(role).technology;
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
    const node = ORIGINAL_BASELINE_V3_TREE.nodes.find(
      (item) => item.id === tech,
    );
    for (const prerequisite of node?.prerequisites ?? []) visit(prerequisite);
    result.push(tech);
  };
  visit(target);
  return result;
}

function preferredTrainingRole(
  context: PolicyContextV7,
  cityId: CityId,
): UnitRoleIdV7 | null {
  const available = context.commands.filter(
    (command): command is Extract<CommandV7, { kind: "TRAIN" }> =>
      command.kind === "TRAIN" && command.cityId === cityId,
  );
  const order = threatenedCity(context, cityId)
    ? THREATENED_ROLE_ORDER
    : GENERAL_ROLE_ORDER;
  return (
    available.slice().sort((left, right) => {
      const count = (role: UnitRoleIdV7) =>
        context.view.units.filter(
          (unit) =>
            unit.ownerId === context.view.viewer.id && unit.role === role,
        ).length;
      const value = (command: typeof left) =>
        trainingStrategicValue(context, command) +
        20 * Number(count(command.role) === 0) -
        2 * (effectiveRoleRuleV7(command.role).cost ?? 0) -
        8 * count(command.role);
      const frozenOrder = order as readonly UnitRoleIdV7[];
      return (
        value(right) - value(left) ||
        frozenOrder.indexOf(left.role) - frozenOrder.indexOf(right.role)
      );
    })[0]?.role ?? null
  );
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
    const city = context.view.cities.find((item) => item.id === command.cityId);
    const neutral =
      city === undefined
        ? 0
        : context.view.board.tiles.filter(
            (tile) =>
              tile.explored &&
              tile.territoryOwnerId === null &&
              distance(tile.at, city.at) <= 2,
          ).length;
    return offered.includes("EXPAND") && neutral >= 4
      ? "EXPAND"
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
  let value = effectiveRoleRuleV7(command.role).maxHp;
  if (
    command.role === "SCOUT" &&
    visibleSaboteurRisk(context.view, command.cityId)
  )
    value += 25;
  if (command.role === "GUARD" && threatenedCity(context, command.cityId))
    value += 20;
  if (
    command.role === "CATAPULT" &&
    hasDurableScreen(context.view, command.cityId)
  )
    value += 12;
  return value;
}

function markedTargetEscapeValue(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  resultAt: CoordV7 | null,
): number {
  if (resultAt === null) return 0;
  const mark = view.defectionStatuses.find(
    (status) =>
      status.visibility === "FULL" && status.targetUnitId === actor.id,
  );
  if (mark?.visibility !== "FULL") return 0;
  const source = view.units.find((item) => item.id === mark.sourceUnitId);
  return source !== undefined && distance(resultAt, source.at) > 2
    ? retainedUnitValue(actor)
    : 0;
}

export function countVisibleDefectionRepliesV7(
  view: PlayerViewV7,
  sourceId: UnitId,
  targetId: UnitId,
): number {
  const source = view.units.find((item) => item.id === sourceId);
  const target = view.units.find((item) => item.id === targetId);
  if (source === undefined || target === undefined) return 0;
  const rule = effectiveRoleRuleV7(target.role);
  const origins = publicDefectionReplyOrigins(view, target);
  const lethalReply =
    rule.abilities.includes("ATTACK") &&
    origins.some(({ at, pathLength }) => {
      if (pathLength > 0 && !rule.mayUsePrimaryActionAfterMove) return false;
      const range = distance(at, source.at);
      if (range < rule.minimumRange || range > rule.range) return false;
      const projected = projectPublicUnitForPolicyV7(view, target.id, {
        at,
        activation: {
          ...target.activation,
          moved: pathLength > 0,
          movedPathLength: pathLength,
          attacked: false,
          handled: false,
        },
      });
      const projectedTarget = projected.units.find(
        (unit) => unit.id === target.id,
      );
      const projectedSource = projected.units.find(
        (unit) => unit.id === source.id,
      );
      return (
        projectedTarget !== undefined &&
        projectedSource !== undefined &&
        publicProjectedDamage(
          projected,
          projectedTarget,
          projectedSource,
          projectedSource.at,
          { breach: rule.abilities.includes("BREACH") && range === 1 },
        ) >= projectedSource.hp
      );
    });
  const escapeOptions = origins.filter(
    ({ at, pathLength }) => pathLength > 0 && distance(at, source.at) > 2,
  ).length;
  return Number(lethalReply) + escapeOptions;
}

interface PublicReplyOriginV7 {
  readonly at: CoordV7;
  readonly pathLength: number;
  readonly spent2: number;
}

/**
 * Conservative public movement for the marked unit's next reply. Hidden
 * research, concealed blockers, and unobserved road connectivity never create
 * a reply that the offering player cannot guarantee from its current view.
 */
function publicDefectionReplyOrigins(
  view: PlayerViewV7,
  target: PublicUnitV7,
): readonly PublicReplyOriginV7[] {
  const rule = effectiveRoleRuleV7(target.role);
  const start: PublicReplyOriginV7 = {
    at: target.at,
    pathLength: 0,
    spent2: 0,
  };
  const results = new Map([[coordKey(target.at), start]]);
  const queue: PublicReplyOriginV7[] = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    for (const tile of view.board.tiles) {
      if (!tile.explored || distance(tile.at, current.at) !== 1) continue;
      if (
        tile.territoryOwnerId !== null &&
        tile.territoryOwnerId !== target.ownerId &&
        publicPlayersAllied(view, target.ownerId, tile.territoryOwnerId)
      )
        continue;
      if (
        tile.terrain === "MOUNTAIN" &&
        !publicOwnerHasSurveying(view, target.ownerId)
      )
        continue;
      if (
        view.units.some(
          (unit) => unit.id !== target.id && same(unit.at, tile.at),
        )
      )
        continue;
      const spent2 = current.spent2 + 2;
      if (spent2 > rule.move * 2) continue;
      const next: PublicReplyOriginV7 = {
        at: tile.at,
        pathLength: current.pathLength + 1,
        spent2,
      };
      const key = coordKey(tile.at);
      const prior = results.get(key);
      if (prior !== undefined && prior.spent2 <= spent2) continue;
      results.set(key, next);
      const terrainStops =
        tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN";
      const visibleHostileZoc = view.units.some(
        (unit) =>
          !publicPlayersAllied(view, target.ownerId, unit.ownerId) &&
          distance(unit.at, tile.at) === 1,
      );
      if (!terrainStops && !visibleHostileZoc) queue.push(next);
    }
  }
  return [...results.values()];
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

function publicRevealGain(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7 | null,
): number {
  if (at === null) return 0;
  const radius = actor.role === "SCOUT" ? 2 : 1;
  return view.board.tiles.filter(
    (tile) =>
      !tile.explored &&
      !("diplomaticBlock" in tile) &&
      distance(tile.at, at) <= radius,
  ).length;
}

function scoutPicketValue(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  at: CoordV7 | null,
): number {
  if (actor.role !== "SCOUT" || at === null) return 0;
  const valuable = view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .sort(
      (left, right) =>
        attributableCityIncome(view, right) -
        attributableCityIncome(view, left),
    )[0];
  const visibleSaboteur = view.units.some(
    (unit) =>
      isHostile(view, unit.ownerId) &&
      unit.role === "SABOTEUR" &&
      distance(unit.at, at) <= 2,
  );
  return (
    (visibleSaboteur ? 12 : 0) +
    (valuable !== undefined && distance(at, valuable.at) <= 2
      ? attributableCityIncome(view, valuable)
      : 0)
  );
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
    effectiveRoleRuleV7(actor.role).defense2 < 4
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
): number {
  let total = 0;
  for (const hostile of view.units.filter((unit) =>
    isHostile(view, unit.ownerId),
  )) {
    const rule = effectiveRoleRuleV7(hostile.role);
    const d = distance(hostile.at, at);
    const directlyThreatened = d >= rule.minimumRange && d <= rule.range;
    const reachableThreat =
      context?.threatenedTiles.get(hostile.id)?.has(coordKey(at)) ?? false;
    if (!directlyThreatened && !reachableThreat) continue;
    if (
      hostile.role === "LANCER" &&
      !directlyThreatened &&
      hasVisibleDurableLancerScreen(view, hostile, actor, at)
    )
      continue;
    total += publicProjectedDamage(view, hostile, actor, at, {
      maximumCharge: !directlyThreatened,
      breach: rule.abilities.includes("BREACH"),
    });
  }
  return total;
}

function publicProjectedDamage(
  view: PlayerViewV7,
  attacker: PublicUnitV7,
  defender: PublicUnitV7,
  defenderAt: CoordV7,
  options: {
    readonly maximumCharge?: boolean;
    readonly breach?: boolean;
  } = {},
): number {
  const attackRule = effectiveRoleRuleV7(attacker.role);
  const defenseRule = effectiveRoleRuleV7(defender.role);
  const attackStats = view.unitStats.find(
    (item) => item.unitId === attacker.id,
  );
  const attack = attackStats?.stats.find((item) => item.id === "ATTACK")?.total;
  if (attack === undefined) return 0;
  const publishedAttack2 = (attack.numerator * 2) / attack.denominator;
  const attack2 =
    options.maximumCharge && attackRule.abilities.includes("CHARGE")
      ? Math.max(publishedAttack2, attackRule.attack2 + 2)
      : publishedAttack2;
  if (!Number.isInteger(attack2)) return 0;
  const breach =
    options.breach === true ||
    (attackRule.abilities.includes("BREACH") &&
      distance(attacker.at, defenderAt) === 1);
  const bonus = breach
    ? { numerator: 1, denominator: 1 }
    : projectedDefenseBonus(view, defender, defenderAt);
  const attackForceNumerator = BigInt(attack2) * BigInt(attacker.hp);
  const attackForceDenominator = 2n * BigInt(attacker.maxHp);
  const defenseForceNumerator =
    BigInt(defenseRule.defense2) *
    BigInt(defender.hp) *
    BigInt(bonus.numerator);
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

function hasVisibleDurableLancerScreen(
  view: PlayerViewV7,
  lancer: PublicUnitV7,
  protectedUnit: PublicUnitV7,
  protectedAt: CoordV7,
): boolean {
  return view.units.some(
    (unit) =>
      unit.id !== protectedUnit.id &&
      unit.ownerId === view.viewer.id &&
      unit.hp * 2 >= unit.maxHp &&
      effectiveRoleRuleV7(unit.role).defense2 >= 4 &&
      distance(unit.at, protectedAt) === 1 &&
      distance(unit.at, lancer.at) < distance(protectedAt, lancer.at),
  );
}

function projectedDefenseBonus(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
): { readonly numerator: number; readonly denominator: number } {
  if (unit.role === "ENVOY") return { numerator: 1, denominator: 1 };
  const city = view.cities.find(
    (candidate) => candidate.ownerId === unit.ownerId && same(candidate.at, at),
  );
  if (
    city?.rewards.some(
      (reward) => reward.reachedLevel === 3 && reward.reward === "WALLS",
    )
  )
    return { numerator: 4, denominator: 1 };
  if (
    city !== undefined &&
    unit.ownerId === view.viewer.id &&
    view.viewer.researchedTechs.includes("FORTIFICATION") &&
    (unit.role === "FIGHTER" || unit.role === "GUARD")
  )
    return { numerator: 2, denominator: 1 };
  if (city !== undefined) return { numerator: 3, denominator: 2 };
  const tile = view.board.tiles.find((candidate) => same(candidate.at, at));
  return tile?.explored === true &&
    (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN")
    ? { numerator: 3, denominator: 2 }
    : { numerator: 1, denominator: 1 };
}

function visibleImprovementValueAt(
  view: PlayerViewV7,
  at: CoordV7,
): number | null {
  const tile = view.board.tiles.find((item) => same(item.at, at));
  if (tile?.explored !== true || tile.improvement === null) return null;
  const published = view.improvementValues.find((item) => same(item.at, at));
  if (published !== undefined) return published.level;
  if (
    ["FARM", "LUMBER_CAMP", "MINE", "QUARRY", "BARRACKS", "MONUMENT"].includes(
      tile.improvement,
    )
  )
    return tile.improvement === "FARM"
      ? 2
      : tile.improvement === "LUMBER_CAMP"
        ? 1
        : tile.improvement === "MINE"
          ? 4
          : tile.improvement === "QUARRY"
            ? 3
            : tile.improvement === "BARRACKS"
              ? 2
              : 3;
  const city =
    tile.territoryCityId === null
      ? undefined
      : view.cities.find((item) => item.id === tile.territoryCityId);
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
  return tile.improvement === "MARKET"
    ? contribution.marketIncome
    : tile.improvement === "BARRACKS"
      ? contribution.capacity
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
  return Math.max(
    1,
    city.level + Number(city.isCapital) + market + Math.min(0, city.population),
  );
}

function visibleSaboteurRisk(view: PlayerViewV7, cityId: CityId): boolean {
  const city = view.cities.find((item) => item.id === cityId);
  return (
    city !== undefined &&
    view.units.some(
      (unit) =>
        unit.role === "SABOTEUR" &&
        isHostile(view, unit.ownerId) &&
        distance(unit.at, city.at) <= 4,
    )
  );
}

function hasDurableScreen(view: PlayerViewV7, cityId: CityId): boolean {
  const city = view.cities.find((item) => item.id === cityId);
  return (
    city !== undefined &&
    view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        unit.hp * 2 >= unit.maxHp &&
        effectiveRoleRuleV7(unit.role).defense2 >= 4 &&
        distance(unit.at, city.at) <= 2,
    )
  );
}

function usefulDisband(view: PlayerViewV7, command: DisbandCommandV7): boolean {
  const unit = view.units.find((item) => item.id === command.unitId);
  if (unit === undefined) return false;
  const refund = Math.floor((effectiveRoleRuleV7(unit.role).cost ?? 0) / 2);
  const danger = visibleImmediateDamage(view, unit, unit.at);
  return (
    refund + (freeCapacity(view, unit.homeCityId) <= 0 ? 3 : 0) >
    retainedUnitValue(unit) - danger
  );
}

function retainedUnitValue(unit: PublicUnitV7): number {
  const rule = effectiveRoleRuleV7(unit.role);
  return unit.role === "JUGGERNAUT"
    ? 40 + rule.attack2 + rule.defense2 + 8 + unit.kills * 2
    : (rule.cost ?? 0) * 4 + unit.hp + unit.kills * 2;
}

function targetStrategicValue(view: PlayerViewV7, unitId: UnitId): number {
  const unit = view.units.find((item) => item.id === unitId);
  if (unit === undefined) return 0;
  const rule = effectiveRoleRuleV7(unit.role);
  return unit.role === "JUGGERNAUT"
    ? 40 +
        rule.attack2 +
        rule.defense2 +
        (rule.abilities.includes("PUSH") ? 8 : 0)
    : (rule.cost ?? 0) * 4 + unit.hp;
}

function publicOwnerHasSurveying(
  view: PlayerViewV7,
  ownerId: PlayerId,
): boolean {
  if (ownerId === view.viewer.id)
    return view.viewer.researchedTechs.includes("SURVEYING");
  // A visible unit standing on Mountain proves the public movement capability;
  // otherwise opponent research remains unknown and is never assumed.
  return view.units.some(
    (unit) =>
      unit.ownerId === ownerId &&
      view.board.tiles.some(
        (tile) =>
          tile.explored &&
          tile.terrain === "MOUNTAIN" &&
          same(tile.at, unit.at),
      ),
  );
}

function cityFootprintFullyExplored(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): boolean {
  const radius = city.expanded ? 2 : 1;
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
  const barracks =
    view.improvementValues.find(
      (item) =>
        item.improvement === "BARRACKS" &&
        item.measure === "CAPACITY" &&
        view.board.tiles.some(
          (tile) =>
            tile.explored &&
            tile.territoryCityId === cityId &&
            same(tile.at, item.at),
        ),
    )?.level ?? 0;
  const capacity =
    city.level +
    1 +
    Number(view.viewer.researchedTechs.includes("FORTIFICATION")) +
    barracks;
  const assigned = view.units.filter(
    (unit) => unit.ownerId === view.viewer.id && unit.homeCityId === cityId,
  ).length;
  const reserved = view.defectionStatuses.filter(
    (status) =>
      status.visibility === "FULL" &&
      status.initiatingPlayerId === view.viewer.id &&
      status.reservedHomeCityId === cityId,
  ).length;
  return capacity - assigned - reserved;
}

function publiclyDetected(
  view: PlayerViewV7,
  at: CoordV7,
  movingUnitId: UnitId,
): boolean {
  return (
    view.cities.some(
      (city) => city.ownerId === view.viewer.id && distance(city.at, at) <= 1,
    ) ||
    view.units.some(
      (unit) =>
        unit.id !== movingUnitId &&
        unit.ownerId === view.viewer.id &&
        distance(unit.at, at) <= (unit.role === "SCOUT" ? 2 : 1),
    )
  );
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
      const role = effectiveRoleRuleV7(unit.role);
      const defense = projectedDefenseBonus(view, unit, unit.at);
      const charge2 =
        role.abilities.includes("CHARGE") &&
        unit.activation.moved &&
        unit.activation.movedPathLength >= 2
          ? 2
          : 0;
      return [
        {
          ...stats,
          stats: stats.stats.map((stat) =>
            stat.id === "HP"
              ? { ...stat, current: unit.hp }
              : stat.id === "ATTACK"
                ? {
                    ...stat,
                    total: rational(role.attack2 + charge2, 2),
                  }
                : stat.id === "DEFENSE"
                  ? {
                      ...stat,
                      total: rational(
                        role.defense2 * defense.numerator,
                        2 * defense.denominator,
                      ),
                    }
                  : stat,
          ),
          statuses: [
            ...stats.statuses.filter(
              (status) =>
                status !== "PURSUIT_READY" && status !== "PURSUIT_MOVED",
            ),
            ...(unit.activation.pursuitPhase === "NONE"
              ? []
              : [unit.activation.pursuitPhase]),
          ],
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
): PublicUnitV7 | undefined {
  return "unitId" in command
    ? view.units.find((unit) => unit.id === command.unitId)
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
      const city = context.view.cities.find(
        (item) => item.id === threat.cityId,
      );
      return (
        city !== undefined &&
        same(city.at, at) &&
        !context.view.units.some(
          (unit) =>
            unit.ownerId === context.view.viewer.id && same(unit.at, at),
        )
      );
    })
  );
}

function cityAt(view: PlayerViewV7, at: CoordV7) {
  return view.cities.find((city) => same(city.at, at));
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
            ? (view.cities.find((city) => city.id === command.cityId)?.at ?? {
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
