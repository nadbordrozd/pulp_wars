import type { CityId, PlayerId, UnitId } from "../engine/model/ids";
import {
  ORIGINAL_BASELINE_V4_TREE,
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
} from "../engine/rules/ruleset-v7";
import type { CommandV7 } from "../engine/v7/commands";
import type { CombatPreviewV7 } from "../engine/v7/events";
import {
  createPublicCommandWorkV7,
  createPublicPlanningWorkV7,
  previewEconomicV7,
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
  naval: NavalPlanV7;
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
  "HORSE_ARCHER",
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
  "HORSE_ARCHER",
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
    | "PLANNING_PREPARATION"
    | "NAVAL_CONTEXT"
    | "CONTEXT"
    | "SCORING" = "COMMAND_PREPARATION";
  private ready: ReturnType<typeof queryAiReadyCommandsV7> | null = null;
  private context: PolicyContextV7 | null = null;
  private visibleHostiles: readonly PublicUnitV7[] = [];
  private readonly scored: ScoredAiCandidateV7[] = [];
  private contextCursor = 0;
  private cursor = 0;
  private activeScore: Generator<void, AiScoreV7> | null = null;
  private activeItem: AiReadyItemV7 | null = null;
  private navalWork: Generator<void, NavalPlanV7> | null = null;

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
        this.planningWork = createPublicPlanningWorkV7(
          this.view,
          progress.commands,
        );
        this.phase = "PLANNING_PREPARATION";
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
      if (this.phase === "NAVAL_CONTEXT") {
        const step = this.navalWork?.next();
        if (step?.done === true) {
          context.naval = step.value;
          this.phase = "CONTEXT";
        }
        continue;
      }
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
    this.navalWork = navalPlanWorkV7(this.view, this.context.commands);
    this.phase = "NAVAL_CONTEXT";
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
  context.naval = drain(navalPlanWorkV7(view, commands));
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
  return {
    view,
    commands,
    threats,
    threatenedTiles,
    naval: NO_NAVAL_PLAN_V7,
  };
}

/** One bounded public-board pass per policy decision, advanced through work slices. */
function* navalPlanWorkV7(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
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
      effectiveRoleRuleV7(unit.role).abilities.includes("CAPTURE"),
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
  const landingLand =
    target === null
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
  );
  const prospectiveWaterDistanceByKey = yield* publicWaterRouteDistancesV7(
    view,
    routeGoals,
    true,
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
    reserveCoins = effectiveRoleRuleV7("PATROL_BOAT").cost ?? 5;
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
): Generator<void, ReadonlyMap<string, number>> {
  const distances = new Map<string, number>();
  const queue = targets
    .filter((at) => passable.has(coordKey(at)))
    .map((at) => ({ at, steps: 0 }));
  for (const item of queue) distances.set(coordKey(item.at), 0);
  for (let index = 0; index < queue.length; index += 1) {
    const item = queue[index];
    if (item === undefined) break;
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

function addHostileThreats(context: PolicyContextV7, unit: PublicUnitV7): void {
  const view = context.view;
  const tiles = new Set(
    publicThreatenedTilesForPolicyV7(view, unit).map(coordKey),
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
        : distance(unit.at, city.at) <=
            publicCombatFacts(view, unit).maximumRange
          ? 2
          : 1,
    });
  }
}

export function publicThreatenedTilesForPolicyV7(
  view: PlayerViewV7,
  unit: PublicUnitV7,
): readonly CoordV7[] {
  const rule = effectiveRoleRuleV7(unit.role);
  const facts = publicCombatFacts(view, unit);
  if (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0) return [];
  const origins: CoordV7[] = [unit.at];
  if (unit.form !== "EMBARKED" && rule.mayUsePrimaryActionAfterMove) {
    const queue = [{ at: unit.at, spent2: 0 }];
    const best = new Map([[coordKey(unit.at), 0]]);
    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;
      for (const tile of view.board.tiles) {
        if (distance(tile.at, current.at) !== 1) continue;
        if (!publicMovementTilePossible(view, unit, tile)) continue;
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
          unit.form === "LAND" &&
          priorTile?.explored === true &&
          tile.explored === true &&
          priorTile.road &&
          tile.road &&
          priorTile.territoryOwnerId === unit.ownerId &&
          tile.territoryOwnerId === unit.ownerId;
        const spent2 = current.spent2 + (roadStep ? 1 : 2);
        if (spent2 > facts.move * 2) continue;
        const key = coordKey(tile.at);
        if ((best.get(key) ?? Number.POSITIVE_INFINITY) <= spent2) continue;
        best.set(key, spent2);
        origins.push(tile.at);
        const terrainStop =
          unit.form === "LAND" &&
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
        return range >= facts.minimumRange && range <= facts.maximumRange;
      }),
    );
  return [...new Map(direct.map((at) => [coordKey(at), at])).values()];
}

function publicMovementTilePossible(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  tile: PlayerViewV7["board"]["tiles"][number],
): boolean {
  if (!tile.explored) return tile.diplomaticBlock !== "ALLIED_TERRITORY";
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
        publicOwnerHasProspecting(view, unit.ownerId))
    );
  return tile.biome === null;
}

function isPolicyCandidate(
  context: PolicyContextV7,
  command: CommandV7,
): boolean {
  if (command.kind === "WAIT") return false;
  const autoembark = isAutoembarkMoveV7(context.view, command);
  if (autoembark && !context.naval.active) return false;
  if (command.kind === "DISEMBARK" && context.naval.active)
    return context.naval.landing.some((at) => same(at, command.at));
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
  if (command.kind === "TRAIN") {
    const spendsReserve =
      context.naval.active &&
      context.view.viewer.coins -
        (effectiveRoleRuleV7(command.role).cost ?? 0) <
        context.naval.reserveCoins;
    if (
      context.naval.active &&
      !threatenedCity(context, command.cityId) &&
      freeCapacity(context.view, command.cityId) <= 1 &&
      context.view.units.some(
        (unit) =>
          unit.ownerId === context.view.viewer.id &&
          unit.form === "LAND" &&
          effectiveRoleRuleV7(unit.role).abilities.includes("CAPTURE"),
      )
    )
      return false;
    if (spendsReserve && !threatenedCity(context, command.cityId)) return false;
    return preferredTrainingRole(context, command.cityId) === command.role;
  }
  if (command.kind === "TRAIN_NAVAL") {
    const spendsReserve =
      context.naval.active &&
      context.view.viewer.coins -
        (effectiveRoleRuleV7(command.role).cost ?? 0) <
        context.naval.reserveCoins;
    if (
      spendsReserve &&
      !(context.naval.visibleNavalDanger && command.role === "PATROL_BOAT")
    )
      return false;
    return (
      preferredNavalTrainingRoleV7(context, command.cityId) === command.role
    );
  }
  if (command.kind === "CHOOSE_CITY_REWARD")
    return preferredReward(context, command) === command.reward;
  if (command.kind === "REDEVELOP")
    return (
      scorePublicSpatialPlanV7(context.view, command) > 0 &&
      queryPublicRedevelopmentChangesImprovementV7(context.view, {
        kind: "REDEVELOP",
        at: command.at,
      })
    );
  if (command.kind === "DISBAND")
    return usefulDisband(context.view, command as DisbandCommandV7);
  const economic = previewEconomicV7(context.view, command);
  if (
    context.naval.active &&
    economic.ok &&
    economic.preview.cost > 0 &&
    context.view.viewer.coins - economic.preview.cost <
      context.naval.reserveCoins &&
    command.kind !== "BUILD_PORT" &&
    command.kind !== "GATHER_PEARLS"
  )
    return false;
  return true;
}

function isAutoembarkMoveV7(
  view: PlayerViewV7,
  command: CommandV7,
): command is Extract<CommandV7, { kind: "MOVE" }> {
  if (command.kind !== "MOVE") return false;
  const unit = view.units.find((candidate) => candidate.id === command.unitId);
  const destination = command.path.at(-1);
  if (unit?.form !== "LAND" || destination === undefined) return false;
  const tile = view.board.tiles.find(
    (candidate) => candidate.explored && same(candidate.at, destination),
  );
  return (
    tile?.explored === true &&
    tile.improvement === "PORT" &&
    tile.territoryOwnerId === view.viewer.id &&
    view.naval.ownedPorts.some(
      (port) => port.status === "ACTIVE" && same(port.at, destination),
    )
  );
}

function scoreCommandWithContext(
  context: PolicyContextV7,
  command: CommandV7,
  readyTuple: readonly number[],
  precomputedHorseArcher?: HorseArcherSequenceValue,
): AiScoreV7 {
  const view = context.view;
  const actor = unitForCommand(view, command);
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
      const cityId = view.board.tiles.find(
        (tile) => tile.explored && same(tile.at, command.at),
      );
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
    const city = cityAt(view, actor.at);
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

  if (command.kind === "RESEARCH") {
    const research = researchValue(context, command.tech);
    priority = research.priority;
    strategicValue = research.strategic;
    immediateValue = -research.cost;
    if (
      !view.viewer.researchedTechs.includes("PROSPECTING") &&
      command.tech === "PROSPECTING"
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
    const rule = effectiveRoleRuleV7(command.role);
    priority = threatenedCity(context, command.cityId) ? 1260 : 1080;
    immediateValue = -(rule.cost ?? 0);
    strategicValue = trainingStrategicValue(context, command);
  }

  if (command.kind === "TRAIN_NAVAL") {
    const rule = effectiveRoleRuleV7(command.role);
    priority =
      command.role === "PATROL_BOAT" && context.naval.visibleNavalDanger
        ? 1290
        : command.role === "BATTLESHIP" && context.naval.target !== null
          ? 1215
          : 1090;
    immediateValue = -(rule.cost ?? 0);
    strategicValue =
      command.role === "PATROL_BOAT"
        ? 25 + Number(context.naval.visibleNavalDanger) * 25
        : 35;
  }

  if (command.kind === "DISEMBARK" && actor !== undefined) {
    priority = context.naval.active ? 1335 : 810;
    strategicValue = effectiveRoleRuleV7(actor.role).abilities.includes(
      "CAPTURE",
    )
      ? 70
      : 10;
    objectiveValue =
      context.naval.target === null
        ? publicRevealGain(view, actor, command.at)
        : 100 - distance(command.at, context.naval.target);
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
      const targetUnit = view.units.find(
        (unit) => unit.id === command.targetUnitId,
      );
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
      if (
        actor?.role === "HORSE_ARCHER" &&
        actor.form === "LAND" &&
        actor.activation.attacksUsed === 0
      ) {
        const sequence =
          precomputedHorseArcher ??
          bestHorseArcherSequence(context, view, command);
        immediateValue = sequence.immediate;
        strategicValue = sequence.strategic;
        safetyValue = sequence.safety;
        objectiveValue = sequence.spacing;
      }
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
    const autoembark = isAutoembarkMoveV7(view, command);
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
      objectiveValue = movementObjectiveValue(view, actor.at, resultAt);
      const reveal = publicRevealGain(view, actor, resultAt);
      priority = objectiveValue > 0 ? 700 : reveal > 0 ? 600 : -1;
      strategicValue = picket + screen;
      if (strategicValue > 0) priority = Math.max(priority, 710);
      if (context.naval.active) {
        const navalValue = navalMovementObjectiveValueV7(
          context,
          actor,
          resultAt,
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
    }
    if (autoembark) {
      priority = Math.max(priority, 1300);
      strategicValue += effectiveRoleRuleV7(actor.role).abilities.includes(
        "CAPTURE",
      )
        ? 50
        : 5;
    }
    if (
      actor.role === "HORSE_ARCHER" &&
      actor.form === "LAND" &&
      precomputedHorseArcher !== undefined
    ) {
      immediateValue += precomputedHorseArcher.immediate;
      strategicValue += precomputedHorseArcher.strategic;
      safetyValue = precomputedHorseArcher.safety;
      objectiveValue += precomputedHorseArcher.spacing;
      priority = Math.max(
        priority,
        precomputedHorseArcher.strategic > 0 ? 1175 : 905,
      );
    }
    const destinationTile =
      resultAt === null
        ? undefined
        : view.board.tiles.find(
            (tile) => tile.explored && same(tile.at, resultAt),
          );
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
    command.kind === "ATTACK" ||
    (command.kind === "MOVE" &&
      actor.role === "HORSE_ARCHER" &&
      precomputedHorseArcher !== undefined)
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
  const horseArcher =
    command.kind === "ATTACK" &&
    actor?.role === "HORSE_ARCHER" &&
    actor.form === "LAND" &&
    actor.activation.attacksUsed === 0
      ? yield* bestHorseArcherSequenceSteps(context, context.view, command)
      : command.kind === "MOVE" &&
          actor?.role === "HORSE_ARCHER" &&
          actor.form === "LAND" &&
          actor.activation.attacksUsed === 0
        ? yield* bestHorseArcherMoveSequenceSteps(
            context,
            context.view,
            command,
          )
        : undefined;
  return scoreCommandWithContext(context, command, readyTuple, horseArcher);
}

interface HorseArcherSequenceValue {
  readonly immediate: number;
  readonly strategic: number;
  readonly safety: number;
  readonly spacing: number;
}

type AttackCommandV7 = Extract<CommandV7, { kind: "ATTACK" }>;
type MoveCommandV7 = Extract<CommandV7, { kind: "MOVE" }>;
type DisbandCommandV7 = { readonly kind: "DISBAND"; readonly unitId: UnitId };

/** Bounded public two-shot valuation from the Horse Archer's fixed coordinate. */
function bestHorseArcherSequence(
  context: PolicyContextV7,
  view: PlayerViewV7,
  first: AttackCommandV7,
): HorseArcherSequenceValue {
  return drain(bestHorseArcherSequenceSteps(context, view, first));
}

function* bestHorseArcherMoveSequenceSteps(
  context: PolicyContextV7,
  view: PlayerViewV7,
  move: MoveCommandV7,
): Generator<void, HorseArcherSequenceValue | undefined> {
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
  const attacks = yield* publicHorseArcherAttacksSteps(moved, actor.id);
  let best: HorseArcherSequenceValue | undefined;
  for (const attack of attacks) {
    const candidate = yield* bestHorseArcherSequenceSteps(
      context,
      moved,
      attack,
    );
    if (
      best === undefined ||
      compareNumericTuple(
        horseArcherValueTuple(candidate),
        horseArcherValueTuple(best),
      ) > 0
    )
      best = candidate;
  }
  return best;
}

function* bestHorseArcherSequenceSteps(
  context: PolicyContextV7,
  view: PlayerViewV7,
  first: AttackCommandV7,
): Generator<void, HorseArcherSequenceValue> {
  const actor = view.units.find((item) => item.id === first.unitId);
  const target = view.units.find((item) => item.id === first.targetUnitId);
  yield;
  const preview = queryCombatPreviewV7(view, first.unitId, first.targetUnitId);
  if (actor === undefined || target === undefined || preview === null)
    return { immediate: -10_000, strategic: 0, safety: -10_000, spacing: 0 };
  const afterFirst = projectHorseArcherAttack(view, actor, target, preview);
  const base: HorseArcherSequenceValue = {
    immediate: combatImmediateValue(preview),
    strategic: combatTargetStrategicValue(view, target, preview),
    ...horseArcherLeafValue(afterFirst, actor.id, context),
  };
  if (preview.attackerDies || preview.attacksRemaining === 0) return base;
  const secondAttacks = yield* publicHorseArcherAttacksSteps(
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
    const afterSecond = projectHorseArcherAttack(
      afterFirst,
      secondActor,
      secondTarget,
      secondPreview,
    );
    const candidate: HorseArcherSequenceValue = {
      immediate: base.immediate + combatImmediateValue(secondPreview),
      strategic:
        base.strategic +
        combatTargetStrategicValue(afterFirst, secondTarget, secondPreview),
      ...horseArcherLeafValue(afterSecond, actor.id, context),
    };
    if (
      compareNumericTuple(
        horseArcherValueTuple(candidate),
        horseArcherValueTuple(best),
      ) > 0
    )
      best = candidate;
  }
  return best;
}

function* publicHorseArcherAttacksSteps(
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

function horseArcherValueTuple(
  value: HorseArcherSequenceValue,
): readonly number[] {
  return [value.strategic, value.immediate, value.safety, value.spacing];
}

function horseArcherLeafValue(
  view: PlayerViewV7,
  unitId: UnitId,
  threatContext: PolicyContextV7,
): Pick<HorseArcherSequenceValue, "safety" | "spacing"> {
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

function projectHorseArcherAttack(
  view: PlayerViewV7,
  actor: PublicUnitV7,
  target: PublicUnitV7,
  preview: CombatPreviewV7,
): PlayerViewV7 {
  const nextAttacks = preview.attacksUsed as 1 | 2;
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
        hp: unit.hp - preview.damageToAttacker,
        activation: {
          ...unit.activation,
          attacked: true,
          attacksUsed: nextAttacks,
          handled: preview.attacksRemaining === 0,
        },
      },
    ];
  });
  return projectPublicUnitVitals(view, units, [actor.id, target.id]);
}

function projectPublicUnitVitals(
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
      return [
        {
          ...stats,
          stats: stats.stats.map((stat) =>
            stat.id === "HP" ? { ...stat, current: unit.hp } : stat,
          ),
        },
      ];
    }),
  };
}

function combatImmediateValue(preview: CombatPreviewV7): number {
  return (
    20 * Number(preview.defenderDies) -
    16 * Number(preview.attackerDies) +
    10 * preview.damageToDefender -
    8 * preview.damageToAttacker +
    preview.splash.reduce(
      (value, splash) => value + 10 * splash.damage + 20 * Number(splash.dies),
      0,
    )
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
  const attacker = context.view.units.find(
    (item) => item.id === command.unitId,
  );
  const target = context.view.units.find(
    (item) => item.id === command.targetUnitId,
  );
  if (attacker === undefined || target === undefined) return 0;
  let value = targetStrategicValue(context.view, target.id);
  for (const splash of preview.splash) {
    const splashTarget = context.view.units.find(
      (unit) => unit.id === splash.unitId,
    );
    if (splashTarget === undefined) continue;
    const retained = targetStrategicValue(context.view, splash.unitId);
    value += splash.dies
      ? retained
      : Math.floor((retained * splash.damage) / splashTarget.hp);
  }
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
  const target = ORIGINAL_BASELINE_V4_TREE.nodes.find((node) =>
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
    const node = ORIGINAL_BASELINE_V4_TREE.nodes.find(
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

function preferredNavalTrainingRoleV7(
  context: PolicyContextV7,
  cityId: CityId,
): "PATROL_BOAT" | "BATTLESHIP" | null {
  const available = context.commands.filter(
    (command): command is Extract<CommandV7, { kind: "TRAIN_NAVAL" }> =>
      command.kind === "TRAIN_NAVAL" && command.cityId === cityId,
  );
  if (available.length === 0) return null;
  const owned = (role: "PATROL_BOAT" | "BATTLESHIP") =>
    context.view.units.filter(
      (unit) => unit.ownerId === context.view.viewer.id && unit.role === role,
    ).length;
  if (context.naval.visibleNavalDanger && owned("PATROL_BOAT") === 0)
    return available.some((command) => command.role === "PATROL_BOAT")
      ? "PATROL_BOAT"
      : (available[0]?.role ?? null);
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
    available.some((command) => command.role === "BATTLESHIP") &&
    owned("BATTLESHIP") === 0
  )
    return "BATTLESHIP";
  const transports = context.view.units.filter(
    (unit) =>
      unit.ownerId === context.view.viewer.id && unit.form === "EMBARKED",
  ).length;
  if (
    transports > 0 &&
    owned("PATROL_BOAT") < transports &&
    available.some((command) => command.role === "PATROL_BOAT")
  )
    return "PATROL_BOAT";
  return null;
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
  if (command.role === "GUARD" && threatenedCity(context, command.cityId))
    value += 20;
  if (
    command.role === "CATAPULT" &&
    hasDurableScreen(context.view, command.cityId)
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

function navalMovementObjectiveValueV7(
  context: PolicyContextV7,
  actor: PublicUnitV7,
  to: CoordV7 | null,
): number {
  if (to === null) return 0;
  const view = context.view;
  if (actor.form === "EMBARKED") {
    return routeProgress(context.naval.waterDistanceByKey, actor.at, to);
  }
  if (actor.form === "NAVAL") {
    return routeProgress(context.naval.fleetDistanceByKey, actor.at, to);
  }
  if (!effectiveRoleRuleV7(actor.role).abilities.includes("CAPTURE")) return 0;
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
): number {
  if (at === null) return 0;
  const radius =
    actor.form === "EMBARKED"
      ? 1
      : actor.form === "NAVAL"
        ? effectiveRoleRuleV7(actor.role).sightRadius
        : actor.role === "SCOUT"
          ? 2
          : 1;
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
    const facts = publicCombatFacts(view, hostile);
    if (!facts.abilities.includes("ATTACK") || facts.attack2 <= 0) continue;
    const d = distance(hostile.at, at);
    const directlyThreatened =
      d >= facts.minimumRange && d <= facts.maximumRange;
    const reachableThreat =
      context?.threatenedTiles.get(hostile.id)?.has(coordKey(at)) ?? false;
    if (!directlyThreatened && !reachableThreat) continue;
    total += publicProjectedDamageForPolicyV7(view, hostile, actor, at, {
      maximumCharge: !directlyThreatened,
      breach: facts.abilities.includes("BREACH"),
    });
  }
  return total;
}

export function publicProjectedDamageForPolicyV7(
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
  const attackFacts = publicCombatFacts(view, attacker);
  const publishedAttack2 = attackFacts.attack2;
  const attack2 =
    options.maximumCharge &&
    attacker.form === "LAND" &&
    attackFacts.abilities.includes("CHARGE")
      ? Math.max(publishedAttack2, attackRule.attack2 + 2)
      : publishedAttack2;
  if (!Number.isInteger(attack2)) return 0;
  const breach =
    options.breach === true ||
    (attacker.form === "LAND" &&
      attackFacts.abilities.includes("BREACH") &&
      distance(attacker.at, defenderAt) === 1);
  const bonus = breach
    ? { numerator: 1, denominator: 1 }
    : projectedDefenseBonus(view, defender, defenderAt);
  const defenderTile = view.board.tiles.find(
    (tile) => tile.explored && same(tile.at, defenderAt),
  );
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
): {
  readonly attack2: number;
  readonly move: number;
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly abilities: readonly string[];
} {
  const published = view.unitStats.find((item) => item.unitId === unit.id);
  const role = effectiveRoleRuleV7(unit.role);
  const total = (id: "ATTACK" | "MOVE"): number | null => {
    const value = published?.stats.find((item) => item.id === id)?.total;
    return value === undefined ? null : value.numerator / value.denominator;
  };
  return {
    attack2:
      unit.form === "EMBARKED" ? 0 : (total("ATTACK") ?? role.attack2 / 2) * 2,
    move: unit.form === "EMBARKED" ? 3 : (total("MOVE") ?? role.move),
    minimumRange:
      unit.form === "EMBARKED"
        ? 0
        : (published?.minimumRange ?? role.minimumRange),
    maximumRange:
      unit.form === "EMBARKED" ? 0 : (published?.maximumRange ?? role.range),
    abilities:
      unit.form === "EMBARKED" ? [] : (published?.abilities ?? role.abilities),
  };
}

function projectedDefenseBonus(
  view: PlayerViewV7,
  unit: PublicUnitV7,
  at: CoordV7,
): { readonly numerator: number; readonly denominator: number } {
  if (unit.form !== "LAND") return { numerator: 1, denominator: 1 };
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

function publicOwnerHasProspecting(
  view: PlayerViewV7,
  ownerId: PlayerId,
): boolean {
  if (ownerId === view.viewer.id)
    return view.viewer.researchedTechs.includes("PROSPECTING");
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
  const capacity =
    city.level +
    1 +
    Number(view.viewer.researchedTechs.includes("FORTIFICATION"));
  const assigned = view.units.filter(
    (unit) => unit.ownerId === view.viewer.id && unit.homeCityId === cityId,
  ).length;
  return capacity - assigned;
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
        role.abilities.includes("CHARGE") &&
        unit.activation.moved &&
        unit.activation.movedPathLength >= 2
          ? 2
          : 0;
      const sight = embarked
        ? 1
        : Math.max(
            role.sightRadius,
            unit.ownerId === view.viewer.id
              ? (technologyCapabilitiesV7(view.viewer.researchedTechs)
                  .roleSightRadius[unit.role] ?? 0)
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
                    embarked ? 0 : role.attack2 + charge2,
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
                    ? statValue(stat, embarked ? 3 : role.move)
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
