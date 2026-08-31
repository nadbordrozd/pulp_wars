import type { CityId, PlayerId } from "../engine/model/ids";
import type { CombatTargetRefV6, CommandV6 } from "../engine/v6/commands";
import {
  estimatePublicCombatV6,
  previewEconomicV6,
  queryCombatPreviewV6,
  queryPlayerCommandsV6,
  queryPublicEconomicPotentialsV6,
  queryPublicRoleRuleV6,
  queryTechnologyTreeV6,
  scorePublicSpatialPlanV6,
  type EconomicPreviewV6,
  type PublicTechnologyTreeV6,
} from "../engine/v6/query";
import {
  CARDINAL_DIRECTION_ORDER_V6,
  COMMAND_KIND_ORDER_V6,
  ECONOMIC_IMPROVEMENT_IDS,
  REWARD_IDS_V6,
  TECHNOLOGY_IDS,
  UNIT_ROLE_IDS,
  type CommandKindV6,
  type CoordV6,
  type EconomicImprovementId,
  type RewardIdV6,
  type TechnologyId,
  type UnitRoleId,
} from "../engine/v6/types";
import type { PlayerTileViewV6, PlayerViewV6 } from "../engine/v6/view";

export const NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V6 = 128;

export type NormalPolicyErrorCodeV6 =
  "MISSING_FACTION_REGISTRATION" | "MISSING_ROLE_MAPPING" | "NO_PUBLIC_COMMAND";

export class NormalPolicyErrorV6 extends Error {
  readonly code: NormalPolicyErrorCodeV6;

  constructor(code: NormalPolicyErrorCodeV6, message: string) {
    super(message);
    this.name = "NormalPolicyErrorV6";
    this.code = code;
  }
}

export interface AiScoreV6 {
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

export interface ScoredAiCandidateV6 {
  readonly command: CommandV6;
  readonly score: AiScoreV6;
  readonly tuple: readonly number[];
}

export interface NormalAiDecisionV6 {
  readonly difficulty: "NORMAL";
  readonly candidates: readonly ScoredAiCandidateV6[];
  readonly command: CommandV6 | null;
  readonly prngDraws: 0;
}

interface KnownThreatV6 {
  readonly city: PlayerViewV6["cities"][number];
  readonly unit: PlayerViewV6["units"][number];
  readonly severity: 1 | 2 | 3;
  readonly defenderHp: number;
}

interface PolicyContextV6 {
  readonly view: PlayerViewV6;
  readonly commands: readonly CommandV6[];
  readonly tree: PublicTechnologyTreeV6;
  readonly threats: readonly KnownThreatV6[];
  economicResearchCache?: readonly ResearchCandidateV6[];
  roleResearchCache?: readonly ResearchCandidateV6[];
}

const THREATENED_ROLE_ORDER = [
  "GUARD",
  "FIGHTER",
  "MEDIC",
  "HEAVY",
  "MARKSMAN",
  "SCOUT",
  "RAIDER",
  "BREACHER",
] as const satisfies readonly UnitRoleId[];

const GENERAL_ROLE_ORDER = [
  "SCOUT",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "MEDIC",
  "HEAVY",
  "BREACHER",
  "FIGHTER",
] as const satisfies readonly UnitRoleId[];

const TILE_IMPROVEMENTS: Partial<
  Readonly<Record<CommandKindV6, EconomicImprovementId>>
> = {
  BUILD_FARM: "FARM",
  BUILD_LUMBER_CAMP: "LUMBER_CAMP",
  BUILD_MINE: "MINE",
  BUILD_QUARRY: "QUARRY",
  BUILD_WINDMILL: "WINDMILL",
  BUILD_SAWMILL: "SAWMILL",
  BUILD_FORGE: "FORGE",
  BUILD_STONEWORKS: "STONEWORKS",
  BUILD_WORKSHOP: "WORKSHOP",
  BUILD_GRAND_WORKS: "GRAND_WORKS",
  BUILD_MARKET: "MARKET",
};

export function chooseNormalCommandV6(view: PlayerViewV6): NormalAiDecisionV6 {
  let tree: PublicTechnologyTreeV6;
  try {
    tree = queryTechnologyTreeV6(view);
  } catch (cause) {
    throw new NormalPolicyErrorV6(
      "MISSING_FACTION_REGISTRATION",
      cause instanceof Error ? cause.message : "Faction tree unavailable",
    );
  }
  for (const role of UNIT_ROLE_IDS) {
    if (tree.roleBindings[role] === undefined) {
      throw new NormalPolicyErrorV6(
        "MISSING_ROLE_MAPPING",
        `Missing ${role} mapping in ${tree.id}`,
      );
    }
  }
  const commands = queryPlayerCommandsV6(view);
  const context: PolicyContextV6 = {
    view,
    commands,
    tree,
    threats: knownThreats(view),
  };
  const candidates = commands
    .filter((command) => isPolicyCandidate(context, command))
    .map((command): ScoredAiCandidateV6 => {
      const score = scoreCommandV6WithContext(context, command);
      return { command, score, tuple: scoreTuple(score) };
    })
    .filter((candidate) => candidate.score.priority >= 0)
    .sort(compareCandidateBestFirstV6);
  return {
    difficulty: "NORMAL",
    candidates,
    command: candidates[0]?.command ?? null,
    prngDraws: 0,
  };
}

export function scoreCommandV6(
  view: PlayerViewV6,
  command: CommandV6,
): AiScoreV6 {
  const tree = queryTechnologyTreeV6(view);
  return scoreCommandV6WithContext(
    {
      view,
      commands: queryPlayerCommandsV6(view),
      tree,
      threats: knownThreats(view),
    },
    command,
  );
}

export function compareCandidateBestFirstV6(
  left: ScoredAiCandidateV6,
  right: ScoredAiCandidateV6,
): number {
  const length = Math.max(left.tuple.length, right.tuple.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (right.tuple[index] ?? 0) - (left.tuple[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function scoreTuple(score: AiScoreV6): readonly number[] {
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

function isPolicyCandidate(
  context: PolicyContextV6,
  command: CommandV6,
): boolean {
  if (command.kind === "WAIT") return false;
  if (command.kind === "KAMIKAZE_ROLL") {
    return safeRollEvaluation(context, command) !== null;
  }
  if (command.kind === "BUILD_CHOCOLATE_WALL") {
    return usefulWallValue(context, command) > 0;
  }
  if (
    command.kind === "CANDIFY" &&
    sacrificesLastThreatenedDefender(context, command.unitId)
  ) {
    return false;
  }
  if (command.kind === "ATTACK" && command.target.kind === "CHOCOLATE_WALL") {
    const wallId = command.target.wallId;
    const wall = context.view.chocolateWalls.find(
      (value) => value.id === wallId,
    );
    if (wall === undefined || !isHostile(context.view, wall.ownerId)) {
      return false;
    }
  }
  if (command.kind === "TRAIN") {
    return preferredTrainingRole(context, command.cityId) === command.role;
  }
  if (command.kind === "CHOOSE_CITY_REWARD") {
    return (
      preferredReward(context, command.cityId, command.reachedLevel) ===
      command.reward
    );
  }
  return true;
}

function scoreCommandV6WithContext(
  context: PolicyContextV6,
  command: CommandV6,
): AiScoreV6 {
  const { view } = context;
  const actingUnit = unitForCommand(view, command);
  let resultTile = actingUnit?.at ?? null;
  let priority = -1;
  let strategicValue = 0;
  let immediateValue = 0;
  let futureValue = 0;
  let objectiveValue = 0;

  switch (command.kind) {
    case "CAPTURE": {
      const unit = unitById(view, command.unitId);
      const city = unit === null ? null : cityAt(view, unit.at);
      const hostileCity = city !== null && isHostile(view, city.ownerId);
      priority = captureVisiblyEndsMatch(view, command.unitId)
        ? 1400
        : hostileCity
          ? 1360
          : 1340;
      immediateValue = 30;
      break;
    }
    case "PROMOTE":
      priority = 1320;
      break;
    case "CHOOSE_CITY_REWARD":
      priority = 1300;
      immediateValue = rewardImmediateValue(command.reward);
      futureValue = scorePublicSpatialPlanV6(view, command);
      break;
    case "CHOOSE_CANDIFY_CITY":
      priority = 1300;
      strategicValue = candifyChoiceValue(view, command.cityId);
      break;
    case "ATTACK": {
      const preview = queryCombatPreviewV6(
        view,
        command.unitId,
        command.target,
      );
      if (preview === null) break;
      const defender = targetUnit(view, command.target);
      const threat =
        defender === null
          ? null
          : (context.threats.find(
              (candidate) => candidate.unit.id === defender.id,
            ) ?? null);
      priority =
        threat !== null && preview.defenderDies
          ? 1280
          : threat !== null
            ? 1240
            : preview.defenderDies
              ? 1180
              : 900;
      strategicValue =
        (threat?.severity ?? 0) +
        (publicPushHasStrategicValue(view, command, preview) ? 1 : 0) +
        (preview.breachApplied &&
        defender !== null &&
        isFortified(view, defender)
          ? 1
          : 0);
      immediateValue = combatImmediateValue(view, command.target, preview);
      if (preview.advances) resultTile = targetAt(view, command.target);
      break;
    }
    case "HEAL_ADJACENT": {
      const target = unitById(view, command.targetUnitId);
      const threat =
        target === null
          ? null
          : (context.threats.find((value) => same(value.city.at, target.at)) ??
            null);
      priority = threat === null ? 500 : 1270;
      if (target !== null) {
        strategicValue =
          Math.floor(((target.maxHp - target.hp) * 10_000) / target.maxHp) +
          (target.maxHp - target.hp);
      }
      break;
    }
    case "TRAIN": {
      const city = view.cities.find((value) => value.id === command.cityId);
      const threat =
        city === undefined
          ? null
          : (context.threats.find((value) => value.city.id === city.id) ??
            null);
      priority = threat === null ? 1080 : 1260;
      strategicValue = threat?.severity ?? 0;
      immediateValue = -(context.tree.roleBindings[command.role].cost ?? 0);
      break;
    }
    case "MOVE": {
      resultTile = command.path.at(-1) ?? actingUnit?.at ?? null;
      if (actingUnit === null || resultTile === null) break;
      const destination = resultTile;
      const threatenedCity = context.threats.find(
        (value) =>
          same(value.city.at, destination) &&
          !view.units.some(
            (unit) => unit.hp > 0 && same(unit.at, value.city.at),
          ),
      );
      if (threatenedCity !== undefined) {
        priority = 1250;
        strategicValue = threatenedCity.severity;
      } else if (moveCreatesCandifyFrontier(view, actingUnit, resultTile)) {
        priority = 650;
        strategicValue = candifyTerritoryValue(view, resultTile);
        objectiveValue = frontierGain(view, actingUnit, resultTile);
      } else {
        const objective = selectedObjective(view, actingUnit.at);
        if (
          objective !== null &&
          chebyshev(resultTile, objective) < chebyshev(actingUnit.at, objective)
        ) {
          priority = 700;
          objectiveValue = -chebyshev(resultTile, objective);
        } else {
          const frontier = frontierGain(view, actingUnit, resultTile);
          const unexplored = nearestPublicUnexplored(view, actingUnit.at);
          if (
            frontier > 0 ||
            (unexplored !== null &&
              chebyshev(resultTile, unexplored) <
                chebyshev(actingUnit.at, unexplored))
          ) {
            priority = 600;
            objectiveValue =
              frontier * (Math.max(view.board.width, view.board.height) + 1) +
              chebyshev(actingUnit.at, resultTile);
          }
        }
      }
      break;
    }
    case "KAMIKAZE_ROLL": {
      const roll = safeRollEvaluation(context, command);
      if (roll === null) break;
      priority = roll.destroysThreat ? 1230 : 880;
      strategicValue = roll.threatSeverity;
      immediateValue = roll.immediateValue;
      break;
    }
    case "RESEARCH": {
      const research = researchPriority(context, command.tech);
      priority = research.priority;
      strategicValue = research.strategicValue;
      immediateValue = -(
        context.tree.nodes.find((node) => node.id === command.tech)?.cost ?? 0
      );
      break;
    }
    case "BUILD_CHOCOLATE_WALL":
      priority = 860;
      strategicValue = usefulWallValue(context, command);
      immediateValue = -1;
      futureValue =
        (isPublicEconomicTarget(context, command.at) ? 0 : 4) +
        wallTerrainValue(view, command.at);
      break;
    case "CANDIFY": {
      const actor = unitById(view, command.unitId);
      const tile = actor === null ? null : tileAt(view, actor.at);
      priority =
        tile?.explored === true &&
        tile.territoryOwnerId !== null &&
        isHostile(view, tile.territoryOwnerId)
          ? 1020
          : 1000;
      strategicValue =
        actor === null ? 0 : candifyTerritoryValue(view, actor.at);
      immediateValue = actor === null ? 0 : -16 - 8 * actor.hp;
      break;
    }
    case "RECOVER":
      priority =
        actingUnit !== null && actingUnit.hp * 2 < actingUnit.maxHp ? 400 : 300;
      break;
    case "END_TURN":
      priority = 0;
      break;
    case "WAIT":
      priority = -1;
      break;
    default: {
      const preview = previewEconomicV6(view, command);
      if (!preview.ok) break;
      futureValue = scorePublicSpatialPlanV6(view, command);
      const economic = economicImmediateValue(command, preview.preview);
      immediateValue = economic.immediateValue;
      strategicValue = economic.levelsReached;
      const permanentCoin = command.kind === "CLEAR_FOREST" ? 1 : 0;
      const recurring = sumDeltas(preview.preview.coinIncomeDeltaByCity);
      const population = sumDeltas(preview.preview.populationDeltaByCity);
      if (economic.levelsReached > 0) priority = 1210;
      else if (
        command.kind === "BUILD_ROAD" &&
        preview.preview.capitalRoadConnected
      ) {
        priority = 1120;
      } else if (recurring > 0) priority = 1200;
      else if (population > 0 || permanentCoin > 0) priority = 1140;
      else if (futureValue > 0) priority = 1100;
      if (command.kind === "REDEVELOP" && futureValue <= 0) priority = -1;
      if (
        (command.kind === "REPLANT_FOREST" || command.kind === "BUILD_ROAD") &&
        recurring <= 0 &&
        futureValue <= 0
      ) {
        priority = -1;
      }
      if (
        command.kind === "CLEAR_FOREST" &&
        futureValue < 0 &&
        !clearMakesHighPriorityCandidateAffordable(context)
      ) {
        priority = -1;
      }
      break;
    }
  }

  const wallAction = command.kind === "BUILD_CHOCOLATE_WALL";
  const objective =
    actingUnit === null || wallAction
      ? null
      : selectedObjective(view, actingUnit.at);
  if (
    objectiveValue === 0 &&
    resultTile !== null &&
    objective !== null &&
    actingUnit !== null
  ) {
    objectiveValue = -chebyshev(resultTile, objective);
  }
  const safetyValue =
    actingUnit === null || resultTile === null || wallAction
      ? 0
      : -projectedPublicDamage(view, actingUnit.id, resultTile);
  return {
    priority,
    strategicValue,
    immediateValue,
    futureValue,
    safetyValue,
    objectiveValue,
    deterministicTieBreak: tieBreak(view, command),
  };
}

function isPublicEconomicTarget(
  context: PolicyContextV6,
  at: CoordV6,
): boolean {
  return context.commands.some(
    (candidate) =>
      "at" in candidate &&
      same(candidate.at, at) &&
      previewEconomicV6(context.view, candidate).ok,
  );
}

function economicImmediateValue(
  command: CommandV6,
  preview: EconomicPreviewV6,
): { readonly immediateValue: number; readonly levelsReached: number } {
  const population = sumDeltas(preview.populationDeltaByCity);
  const recurring = sumDeltas(preview.coinIncomeDeltaByCity);
  const immediateCoins = command.kind === "CLEAR_FOREST" ? 1 : -preview.cost;
  return {
    immediateValue:
      20 * preview.levelsReached.length +
      5 * population +
      12 * recurring +
      immediateCoins,
    levelsReached: preview.levelsReached.length,
  };
}

function combatImmediateValue(
  view: PlayerViewV6,
  target: CombatTargetRefV6,
  preview: NonNullable<ReturnType<typeof queryCombatPreviewV6>>,
): number {
  if (target.kind === "CHOCOLATE_WALL") {
    const wall = view.chocolateWalls.find(
      (value) => value.id === target.wallId,
    );
    const hostile = wall !== undefined && isHostile(view, wall.ownerId);
    return (
      (hostile ? 2 : -8) * preview.damageToDefender -
      8 * preview.damageToAttacker -
      (preview.attackerDies ? 16 : 0)
    );
  }
  return (
    10 * preview.damageToDefender -
    8 * preview.damageToAttacker +
    (preview.defenderDies ? 20 : 0) -
    (preview.attackerDies ? 16 : 0)
  );
}

function researchPriority(
  context: PolicyContextV6,
  tech: TechnologyId,
): { readonly priority: number; readonly strategicValue: number } {
  const economic = economicResearchCandidates(context);
  const ownEconomic = economic.find((value) => value.tech === tech);
  const minimumEconomic = economic.reduce(
    (best, value) => Math.min(best, value.distance),
    Number.POSITIVE_INFINITY,
  );
  if (ownEconomic !== undefined && ownEconomic.distance === minimumEconomic) {
    return { priority: 1160, strategicValue: ownEconomic.value };
  }
  const role = roleResearchCandidates(context);
  const ownRole = role.find((value) => value.tech === tech);
  const minimumRole = role.reduce(
    (best, value) => Math.min(best, value.distance),
    Number.POSITIVE_INFINITY,
  );
  if (ownRole !== undefined && ownRole.distance === minimumRole) {
    return { priority: 1060, strategicValue: ownRole.value };
  }
  return { priority: 1040, strategicValue: 0 };
}

interface ResearchCandidateV6 {
  readonly tech: TechnologyId;
  readonly distance: number;
  readonly value: number;
}

function economicResearchCandidates(
  context: PolicyContextV6,
): readonly ResearchCandidateV6[] {
  if (context.economicResearchCache !== undefined) {
    return context.economicResearchCache;
  }
  const potentials = queryPublicEconomicPotentialsV6(context.view);
  const candidates: ResearchCandidateV6[] = [];
  for (const command of context.commands) {
    if (command.kind !== "RESEARCH") continue;
    let bestDistance = Number.POSITIVE_INFINITY;
    let value = 0;
    for (const node of context.tree.nodes) {
      const unlockedCommands = node.effects
        .filter(
          (
            effect,
          ): effect is Extract<
            (typeof node.effects)[number],
            { readonly kind: "COMMAND" }
          > => effect.kind === "COMMAND",
        )
        .map((effect) => effect.command);
      for (const unlocked of unlockedCommands) {
        const potential = potentials.find(
          (candidate) => candidate.command === unlocked,
        );
        if (potential === undefined || potential.targets === 0) continue;
        const distance = researchDistance(context.tree, command.tech, node.id);
        if (distance === null) continue;
        if (distance < bestDistance) {
          bestDistance = distance;
          value = potential.targets + potential.bestSpatialScore;
        } else if (distance === bestDistance) {
          value += potential.targets + potential.bestSpatialScore;
        }
      }
    }
    if (Number.isFinite(bestDistance)) {
      candidates.push({ tech: command.tech, distance: bestDistance, value });
    }
  }
  context.economicResearchCache = candidates;
  return candidates;
}

function roleResearchCandidates(
  context: PolicyContextV6,
): readonly ResearchCandidateV6[] {
  if (context.roleResearchCache !== undefined) return context.roleResearchCache;
  if (!hasPotentialProductionSlot(context)) return [];
  const owned = new Set(
    context.view.units
      .filter((unit) => unit.ownerId === context.view.viewer.id)
      .map((unit) => unit.role),
  );
  const targets = UNIT_ROLE_IDS.filter((role) => {
    const binding = context.tree.roleBindings[role];
    return (
      binding.cost !== null && binding.technology !== null && !owned.has(role)
    );
  });
  const result: ResearchCandidateV6[] = [];
  for (const command of context.commands) {
    if (command.kind !== "RESEARCH") continue;
    let distance = Number.POSITIVE_INFINITY;
    let value = 0;
    for (const role of targets) {
      const target = context.tree.roleBindings[role].technology;
      if (target === null) continue;
      const candidateDistance = researchDistance(
        context.tree,
        command.tech,
        target,
      );
      if (candidateDistance === null) continue;
      if (candidateDistance < distance) {
        distance = candidateDistance;
        value = 1;
      } else if (candidateDistance === distance) value += 1;
    }
    if (Number.isFinite(distance)) {
      result.push({ tech: command.tech, distance, value });
    }
  }
  context.roleResearchCache = result;
  return result;
}

function researchDistance(
  tree: PublicTechnologyTreeV6,
  first: TechnologyId,
  target: TechnologyId,
): number | null {
  if (first === target) return 1;
  let current = tree.nodes.find((node) => node.id === target);
  let distance = 1;
  while (current !== undefined && current.prerequisites.length > 0) {
    const prerequisite = current.prerequisites[0];
    if (prerequisite === undefined) break;
    distance += 1;
    if (prerequisite === first) return distance;
    current = tree.nodes.find((node) => node.id === prerequisite);
  }
  return null;
}

function clearMakesHighPriorityCandidateAffordable(
  context: PolicyContextV6,
): boolean {
  const view: PlayerViewV6 = {
    ...context.view,
    viewer: { ...context.view.viewer, coins: context.view.viewer.coins + 1 },
    players: context.view.players.map((player) =>
      player.id === context.view.viewer.id
        ? { ...player, coins: context.view.viewer.coins + 1 }
        : player,
    ),
  };
  const commands = queryPlayerCommandsV6(view);
  const newlyAffordable = commands.filter(
    (candidate) =>
      candidate.kind !== "CLEAR_FOREST" &&
      !context.commands.some((offered) => sameCommand(offered, candidate)),
  );
  if (newlyAffordable.length === 0) return false;
  const clonedContext: PolicyContextV6 = {
    view,
    commands,
    tree: queryTechnologyTreeV6(view),
    threats: knownThreats(view),
  };
  return newlyAffordable.some(
    (candidate) =>
      scoreCommandV6WithContext(clonedContext, candidate).priority >= 1160,
  );
}

function publicPushHasStrategicValue(
  view: PlayerViewV6,
  command: Extract<CommandV6, { readonly kind: "ATTACK" }>,
  preview: NonNullable<ReturnType<typeof queryCombatPreviewV6>>,
): boolean {
  if (preview.push !== "WILL_PUSH" || command.target.kind !== "UNIT") {
    return false;
  }
  const attacker = unitById(view, command.unitId);
  const defender = unitById(view, command.target.unitId);
  if (attacker === null || defender === null) return false;
  const destination = {
    x: defender.at.x + (defender.at.x - attacker.at.x),
    y: defender.at.y + (defender.at.y - attacker.at.y),
  };
  const sourceCity = cityAt(view, defender.at);
  if (sourceCity?.ownerId === view.viewer.id) return true;
  if (
    publicDefenseRank(view, defender, destination) <
    publicDefenseRank(view, defender, defender.at)
  ) {
    return true;
  }
  return knownObjectives(view).some(
    (objective) =>
      chebyshev(attacker.at, objective) ===
        chebyshev(attacker.at, defender.at) +
          chebyshev(defender.at, objective) &&
      chebyshev(destination, objective) > chebyshev(defender.at, objective),
  );
}

function publicDefenseRank(
  view: PlayerViewV6,
  unit: PlayerViewV6["units"][number],
  at: CoordV6,
): number {
  const city = cityAt(view, at);
  if (
    city?.ownerId === unit.ownerId &&
    city.rewards.some((record) => record.reward === "WALLS")
  ) {
    return 8;
  }
  const owner = view.players.find((player) => player.id === unit.ownerId);
  if (
    city?.ownerId === unit.ownerId &&
    owner?.researchedTechs.includes("FORTIFICATION") === true &&
    (unit.role === "FIGHTER" || unit.role === "GUARD")
  ) {
    return 4;
  }
  const tile = tileAt(view, at);
  return city?.ownerId === unit.ownerId ||
    (tile?.explored === true &&
      (tile.terrain === "FOREST" || tile.terrain === "MOUNTAIN"))
    ? 3
    : 2;
}

function hasPotentialProductionSlot(context: PolicyContextV6): boolean {
  return context.view.cities.some((city) => {
    if (
      city.ownerId !== context.view.viewer.id ||
      context.threats.some(
        (threat) => threat.city.id === city.id && same(threat.unit.at, city.at),
      )
    ) {
      return false;
    }
    const count = context.view.units.filter(
      (unit) =>
        unit.ownerId === context.view.viewer.id && unit.homeCityId === city.id,
    ).length;
    return count < city.level + 1;
  });
}

function preferredTrainingRole(
  context: PolicyContextV6,
  cityId: CityId,
): UnitRoleId | null {
  const available = context.commands.filter(
    (command): command is Extract<CommandV6, { readonly kind: "TRAIN" }> =>
      command.kind === "TRAIN" && command.cityId === cityId,
  );
  if (available.length === 0) return null;
  const threatened = context.threats.some(
    (threat) => threat.city.id === cityId,
  );
  const order = threatened ? THREATENED_ROLE_ORDER : GENERAL_ROLE_ORDER;
  const roles = available.map((command) => command.role);
  const counts = Object.fromEntries(
    UNIT_ROLE_IDS.map((role) => [
      role,
      context.view.units.filter(
        (unit) => unit.ownerId === context.view.viewer.id && unit.role === role,
      ).length,
    ]),
  ) as Record<UnitRoleId, number>;
  return (
    order.find((role) => roles.includes(role) && counts[role] === 0) ??
    [...order]
      .filter((role) => roles.includes(role))
      .sort(
        (left, right) =>
          counts[left] - counts[right] ||
          order.indexOf(left) - order.indexOf(right),
      )[0] ??
    null
  );
}

function preferredReward(
  context: PolicyContextV6,
  cityId: CityId,
  reachedLevel: number,
): RewardIdV6 | null {
  const available = context.commands
    .filter(
      (
        command,
      ): command is Extract<
        CommandV6,
        { readonly kind: "CHOOSE_CITY_REWARD" }
      > =>
        command.kind === "CHOOSE_CITY_REWARD" &&
        command.cityId === cityId &&
        command.reachedLevel === reachedLevel,
    )
    .map((command) => command.reward);
  if (available.length === 0) return null;
  const city = context.view.cities.find((value) => value.id === cityId);
  let preferred: RewardIdV6;
  if (reachedLevel === 2) {
    preferred = context.view.viewer.coins < 4 ? "STOCKPILE" : "SURVEY";
  } else if (reachedLevel === 3) {
    preferred =
      context.threats.some((threat) => threat.city.id === cityId) &&
      available.includes("MILITIA")
        ? "MILITIA"
        : "WALLS";
  } else if (reachedLevel === 4) {
    const neutral =
      city === undefined
        ? 0
        : context.view.board.tiles.filter(
            (tile) =>
              tile.explored &&
              tile.territoryCityId === null &&
              chebyshev(tile.at, city.at) <= 2,
          ).length;
    const expand: CommandV6 = {
      kind: "CHOOSE_CITY_REWARD",
      cityId,
      reachedLevel,
      reward: "EXPAND",
    };
    preferred =
      neutral >= 4 || scorePublicSpatialPlanV6(context.view, expand) > 0
        ? "EXPAND"
        : "BOOM";
  } else {
    const cities = context.view.cities.filter(
      (value) => value.ownerId === context.view.viewer.id,
    ).length;
    const juggernauts = context.view.units.filter(
      (unit) =>
        unit.ownerId === context.view.viewer.id && unit.role === "JUGGERNAUT",
    ).length;
    preferred =
      juggernauts < cities && available.includes("JUGGERNAUT")
        ? "JUGGERNAUT"
        : "TREASURY";
  }
  return available.includes(preferred)
    ? preferred
    : ([...available].sort(
        (left, right) =>
          REWARD_IDS_V6.indexOf(left) - REWARD_IDS_V6.indexOf(right),
      )[0] ?? null);
}

function knownThreats(view: PlayerViewV6): readonly KnownThreatV6[] {
  const threats: KnownThreatV6[] = [];
  const emptyHp =
    Math.max(
      ...view.players.flatMap((player) =>
        UNIT_ROLE_IDS.map(
          (role) => queryPublicRoleRuleV6(view, player.id, role)?.maxHp ?? 0,
        ),
      ),
    ) + 1;
  for (const city of view.cities.filter(
    (candidate) => candidate.ownerId === view.viewer.id,
  )) {
    const defender = view.units.find(
      (unit) => unit.ownerId === view.viewer.id && same(unit.at, city.at),
    );
    for (const unit of visibleHostiles(view)) {
      const rule = queryPublicRoleRuleV6(view, unit.ownerId, unit.role);
      if (rule === null || rule.attack2 <= 0) continue;
      const distance = chebyshev(unit.at, city.at);
      const severity = same(unit.at, city.at)
        ? 3
        : distance <= rule.range
          ? 2
          : distance <= rule.move + rule.range
            ? 1
            : null;
      if (severity !== null) {
        threats.push({
          city,
          unit,
          severity,
          defenderHp: defender?.hp ?? emptyHp,
        });
      }
    }
  }
  return threats.sort(compareThreats);
}

function compareThreats(left: KnownThreatV6, right: KnownThreatV6): number {
  return (
    right.severity - left.severity ||
    Number(right.city.isCapital) - Number(left.city.isCapital) ||
    left.defenderHp - right.defenderHp ||
    left.city.at.y - right.city.at.y ||
    left.city.at.x - right.city.at.x ||
    left.city.id - right.city.id ||
    left.unit.id - right.unit.id
  );
}

function safeRollEvaluation(
  context: PolicyContextV6,
  command: Extract<CommandV6, { readonly kind: "KAMIKAZE_ROLL" }>,
): {
  readonly immediateValue: number;
  readonly destroysThreat: boolean;
  readonly threatSeverity: number;
} | null {
  const { view } = context;
  const actor = unitById(view, command.unitId);
  if (actor === null) return null;
  const delta = directionDelta(command.direction);
  let immediateValue = -16 - 8 * actor.hp;
  let hostileDamage = 0;
  let destroysThreat = false;
  let threatSeverity = 0;
  for (
    let at = { x: actor.at.x + delta.x, y: actor.at.y + delta.y };
    onBoard(view, at);
    at = { x: at.x + delta.x, y: at.y + delta.y }
  ) {
    const tile = tileAt(view, at);
    if (
      tile?.explored === false &&
      tile.diplomaticBlock === "ALLIED_TERRITORY"
    ) {
      return null;
    }
    const victim = view.units.find((unit) => unit.hp > 0 && same(unit.at, at));
    const wall = view.chocolateWalls.find((value) => same(value.at, at));
    const ownerId = victim?.ownerId ?? wall?.ownerId;
    if (ownerId === undefined) continue;
    if (!isHostile(view, ownerId)) return null;
    if (victim !== undefined) {
      const damage = Math.min(10, victim.hp);
      hostileDamage += damage;
      immediateValue += 10 * damage + (victim.hp <= 10 ? 20 : 0);
      const threat =
        context.threats.find((candidate) => candidate.unit.id === victim.id) ??
        null;
      if (victim.hp <= 10 && threat !== null) {
        destroysThreat = true;
        threatSeverity = Math.max(threatSeverity, threat.severity);
      }
    } else if (wall !== undefined) {
      const damage = Math.min(10, wall.hp);
      hostileDamage += damage;
      immediateValue += 2 * damage;
    }
  }
  return hostileDamage > 0
    ? { immediateValue, destroysThreat, threatSeverity }
    : null;
}

function sacrificesLastThreatenedDefender(
  context: PolicyContextV6,
  unitId: number,
): boolean {
  const unit = unitById(context.view, unitId);
  if (unit?.homeCityId === null || unit === null) return false;
  if (!context.threats.some((threat) => threat.city.id === unit.homeCityId)) {
    return false;
  }
  const assigned = context.view.units.filter(
    (candidate) =>
      candidate.ownerId === context.view.viewer.id &&
      candidate.homeCityId === unit.homeCityId,
  );
  if (assigned.length !== 1) return false;
  return context.commands.some(
    (candidate) =>
      (candidate.kind === "TRAIN" && candidate.cityId === unit.homeCityId) ||
      candidate.kind === "BUILD_CHOCOLATE_WALL" ||
      candidate.kind === "ATTACK" ||
      candidate.kind === "KAMIKAZE_ROLL",
  );
}

function usefulWallValue(
  context: PolicyContextV6,
  command: Extract<CommandV6, { readonly kind: "BUILD_CHOCOLATE_WALL" }>,
): number {
  return context.threats.filter((threat) => {
    if (chebyshev(command.at, threat.city.at) !== 1) return false;
    const direct = publicApproachDistance(
      context.view,
      threat.unit,
      threat.city.at,
      null,
    );
    const walled = publicApproachDistance(
      context.view,
      threat.unit,
      threat.city.at,
      command.at,
    );
    return direct !== null && (walled === null || walled > direct);
  }).length;
}

function publicApproachDistance(
  view: PlayerViewV6,
  unit: PlayerViewV6["units"][number],
  destination: CoordV6,
  blocked: CoordV6 | null,
): number | null {
  const owner = view.players.find((player) => player.id === unit.ownerId);
  if (owner === undefined) return null;
  const queue: { readonly at: CoordV6; readonly distance: number }[] = [
    { at: unit.at, distance: 0 },
  ];
  const visited = new Set([coordKey(unit.at)]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;
    if (same(current.at, destination)) return current.distance;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const at = { x: current.at.x + dx, y: current.at.y + dy };
        const key = coordKey(at);
        if (visited.has(key) || (blocked !== null && same(at, blocked))) {
          continue;
        }
        const tile = tileAt(view, at);
        if (
          !publicApproachTileIsTraversable(
            view,
            owner.id,
            owner.researchedTechs,
            tile,
            unit.id,
            destination,
          )
        ) {
          continue;
        }
        visited.add(key);
        queue.push({ at, distance: current.distance + 1 });
      }
    }
  }
  return null;
}

function publicApproachTileIsTraversable(
  view: PlayerViewV6,
  ownerId: PlayerId,
  researchedTechs: readonly TechnologyId[],
  tile: PlayerTileViewV6 | null,
  movingUnitId: number,
  destination: CoordV6,
): boolean {
  if (tile?.explored !== true) return false;
  if (tile.terrain === "MOUNTAIN" && !researchedTechs.includes("SURVEYING")) {
    return false;
  }
  if (
    tile.territoryOwnerId !== null &&
    playersArePubliclyAllied(view, ownerId, tile.territoryOwnerId)
  ) {
    return false;
  }
  if (same(tile.at, destination)) return true;
  return (
    !view.units.some(
      (unit) =>
        unit.id !== movingUnitId && unit.hp > 0 && same(unit.at, tile.at),
    ) && !view.chocolateWalls.some((wall) => same(wall.at, tile.at))
  );
}

function playersArePubliclyAllied(
  view: PlayerViewV6,
  leftId: PlayerId,
  rightId: PlayerId,
): boolean {
  if (leftId === rightId || view.setup.aiMode !== "COOPERATIVE") return false;
  const left = view.players.find((player) => player.id === leftId);
  const right = view.players.find((player) => player.id === rightId);
  return left?.controller === "AI" && right?.controller === "AI";
}

function wallTerrainValue(view: PlayerViewV6, at: CoordV6): number {
  const tile = tileAt(view, at);
  if (tile?.explored !== true) return 0;
  return tile.terrain === "GRASS" ? 3 : tile.terrain === "FOREST" ? 2 : 1;
}

function projectedPublicDamage(
  view: PlayerViewV6,
  unitId: number,
  resultTile: CoordV6,
): number {
  const target = unitById(view, unitId);
  if (target === null) return 0;
  const projected: PlayerViewV6 = {
    ...view,
    units: view.units.map((unit) =>
      unit.id === target.id ? { ...unit, at: resultTile } : unit,
    ),
  };
  let total = 0;
  for (const hostile of visibleHostiles(projected)) {
    const preview = estimatePublicCombatV6(projected, hostile.id, {
      kind: "UNIT",
      unitId: target.id,
    });
    if (preview !== null) total += preview.damageToDefender;
  }
  return total;
}

function selectedObjective(view: PlayerViewV6, from: CoordV6): CoordV6 | null {
  const objectives = knownObjectives(view);
  return (
    objectives.sort(
      (left, right) =>
        chebyshev(from, left) - chebyshev(from, right) ||
        left.y - right.y ||
        left.x - right.x,
    )[0] ?? null
  );
}

function knownObjectives(view: PlayerViewV6): CoordV6[] {
  return [
    ...view.board.tiles
      .filter(
        (
          tile,
        ): tile is Extract<PlayerTileViewV6, { readonly explored: true }> =>
          tile.explored && tile.site === "VILLAGE",
      )
      .map((tile) => tile.at),
    ...view.cities
      .filter((city) => isHostile(view, city.ownerId))
      .map((city) => city.at),
  ];
}

function nearestPublicUnexplored(
  view: PlayerViewV6,
  from: CoordV6,
): CoordV6 | null {
  return (
    view.board.tiles
      .filter(
        (tile) => !tile.explored && tile.diplomaticBlock !== "ALLIED_TERRITORY",
      )
      .map((tile) => tile.at)
      .sort(
        (left, right) =>
          chebyshev(from, left) - chebyshev(from, right) ||
          left.y - right.y ||
          left.x - right.x,
      )[0] ?? null
  );
}

function frontierGain(
  view: PlayerViewV6,
  unit: PlayerViewV6["units"][number],
  at: CoordV6,
): number {
  const rule = queryPublicRoleRuleV6(view, unit.ownerId, unit.role);
  if (rule === null) return 0;
  const tile = tileAt(view, at);
  const sight =
    rule.sightRadius +
    (tile?.explored === true &&
    tile.terrain === "MOUNTAIN" &&
    view.viewer.researchedTechs.includes("SURVEYING")
      ? 1
      : 0);
  return view.board.tiles.filter(
    (candidate) =>
      !candidate.explored &&
      candidate.diplomaticBlock !== "ALLIED_TERRITORY" &&
      chebyshev(candidate.at, at) <= sight,
  ).length;
}

function moveCreatesCandifyFrontier(
  view: PlayerViewV6,
  unit: PlayerViewV6["units"][number],
  at: CoordV6,
): boolean {
  const rule = queryPublicRoleRuleV6(view, unit.ownerId, unit.role);
  if (rule === null || !rule.abilities.includes("CANDIFY")) return false;
  const tile = tileAt(view, at);
  if (
    tile?.explored !== true ||
    tile.site !== null ||
    tile.territoryOwnerId === view.viewer.id ||
    (tile.territoryOwnerId !== null && !isHostile(view, tile.territoryOwnerId))
  ) {
    return false;
  }
  return view.cities.some(
    (city) =>
      city.ownerId === view.viewer.id &&
      chebyshev(city.at, at) <= (city.expanded ? 2 : 1) &&
      view.board.tiles.some(
        (candidate) =>
          candidate.explored &&
          candidate.territoryCityId === city.id &&
          chebyshev(candidate.at, at) === 1,
      ),
  );
}

function candifyTerritoryValue(view: PlayerViewV6, at: CoordV6): number {
  const tile = tileAt(view, at);
  const hostile =
    tile?.explored === true &&
    tile.territoryOwnerId !== null &&
    isHostile(view, tile.territoryOwnerId)
      ? 2
      : 1;
  const frontier = view.board.tiles.filter(
    (candidate) =>
      !candidate.explored &&
      candidate.diplomaticBlock !== "ALLIED_TERRITORY" &&
      chebyshev(candidate.at, at) === 1,
  ).length;
  const city = view.cities
    .filter(
      (candidate) =>
        candidate.ownerId === view.viewer.id &&
        chebyshev(candidate.at, at) <= (candidate.expanded ? 2 : 1),
    )
    .sort((left, right) => left.id - right.id)[0];
  return hostile * 10_000 + frontier * 100 - (city?.id ?? 0);
}

function candifyChoiceValue(view: PlayerViewV6, cityId: number): number {
  const head = view.pendingChoices[0];
  if (head?.kind !== "CANDIFY_CITY") return -cityId;
  const unit = unitById(view, head.unitId);
  return unit === null
    ? -cityId
    : candifyTerritoryValue(view, unit.at) - cityId;
}

function captureVisiblyEndsMatch(view: PlayerViewV6, unitId: number): boolean {
  if (view.board.tiles.some((tile) => !tile.explored)) return false;
  const unit = unitById(view, unitId);
  const target = unit === null ? null : cityAt(view, unit.at);
  if (target === null || !isHostile(view, target.ownerId)) return false;
  return (
    view.cities.filter((city) => isHostile(view, city.ownerId)).length === 1
  );
}

function isFortified(
  view: PlayerViewV6,
  unit: PlayerViewV6["units"][number],
): boolean {
  const city = cityAt(view, unit.at);
  if (city === null || city.ownerId !== unit.ownerId) return false;
  if (city.rewards.some((record) => record.reward === "WALLS")) return true;
  const owner = view.players.find((player) => player.id === unit.ownerId);
  return (
    owner?.researchedTechs.includes("FORTIFICATION") === true &&
    (unit.role === "FIGHTER" || unit.role === "GUARD")
  );
}

function rewardImmediateValue(reward: RewardIdV6): number {
  return reward === "STOCKPILE"
    ? 4
    : reward === "TREASURY"
      ? 5
      : reward === "BOOM"
        ? 15
        : 0;
}

function tieBreak(
  view: PlayerViewV6,
  command: CommandV6,
): AiScoreV6["deterministicTieBreak"] {
  const target = commandTarget(view, command);
  return [
    stableNegative(COMMAND_KIND_ORDER_V6.indexOf(command.kind)),
    stableNegative(target.y),
    stableNegative(target.x),
    stableNegative(primaryEntityId(view, command)),
    stableNegative(contentOrdinal(command)),
  ];
}

function stableNegative(value: number): number {
  return value === 0 ? 0 : -value;
}

function commandTarget(view: PlayerViewV6, command: CommandV6): CoordV6 {
  if ("at" in command) return command.at;
  if (command.kind === "MOVE") return command.path.at(-1) ?? missingCoord();
  if (command.kind === "ATTACK")
    return targetAt(view, command.target) ?? missingCoord();
  if (command.kind === "HEAL_ADJACENT") {
    return unitById(view, command.targetUnitId)?.at ?? missingCoord();
  }
  if (command.kind === "KAMIKAZE_ROLL") {
    const unit = unitById(view, command.unitId);
    if (unit === null) return missingCoord();
    if (command.direction === "NORTH") return { x: unit.at.x, y: 0 };
    if (command.direction === "EAST") {
      return { x: view.board.width - 1, y: unit.at.y };
    }
    if (command.direction === "SOUTH") {
      return { x: unit.at.x, y: view.board.height - 1 };
    }
    return { x: 0, y: unit.at.y };
  }
  if ("cityId" in command) {
    return (
      view.cities.find((city) => city.id === command.cityId)?.at ??
      missingCoord()
    );
  }
  if ("unitId" in command) {
    return unitById(view, command.unitId)?.at ?? missingCoord();
  }
  return missingCoord();
}

function primaryEntityId(view: PlayerViewV6, command: CommandV6): number {
  if ("unitId" in command) return command.unitId;
  if ("cityId" in command) return command.cityId;
  if ("at" in command) {
    const tile = tileAt(view, command.at);
    return tile?.explored === true ? (tile.territoryCityId ?? 0) : 0;
  }
  return 0;
}

function contentOrdinal(command: CommandV6): number {
  if (command.kind === "RESEARCH") return TECHNOLOGY_IDS.indexOf(command.tech);
  if (command.kind === "TRAIN") return UNIT_ROLE_IDS.indexOf(command.role);
  if (command.kind === "CHOOSE_CITY_REWARD") {
    return REWARD_IDS_V6.indexOf(command.reward);
  }
  if (command.kind === "KAMIKAZE_ROLL") {
    return CARDINAL_DIRECTION_ORDER_V6.indexOf(command.direction);
  }
  const improvement = TILE_IMPROVEMENTS[command.kind];
  return improvement === undefined
    ? 0
    : ECONOMIC_IMPROVEMENT_IDS.indexOf(improvement);
}

function unitForCommand(
  view: PlayerViewV6,
  command: CommandV6,
): PlayerViewV6["units"][number] | null {
  return "unitId" in command ? unitById(view, command.unitId) : null;
}

function targetUnit(
  view: PlayerViewV6,
  target: CombatTargetRefV6,
): PlayerViewV6["units"][number] | null {
  return target.kind === "UNIT" ? unitById(view, target.unitId) : null;
}

function targetAt(
  view: PlayerViewV6,
  target: CombatTargetRefV6,
): CoordV6 | null {
  return target.kind === "UNIT"
    ? (unitById(view, target.unitId)?.at ?? null)
    : (view.chocolateWalls.find((wall) => wall.id === target.wallId)?.at ??
        null);
}

function unitById(
  view: PlayerViewV6,
  id: number,
): PlayerViewV6["units"][number] | null {
  return view.units.find((unit) => unit.id === id) ?? null;
}

function cityAt(
  view: PlayerViewV6,
  at: CoordV6,
): PlayerViewV6["cities"][number] | null {
  return view.cities.find((city) => same(city.at, at)) ?? null;
}

function tileAt(view: PlayerViewV6, at: CoordV6): PlayerTileViewV6 | null {
  if (!onBoard(view, at)) return null;
  return view.board.tiles[at.y * view.board.width + at.x] ?? null;
}

function visibleHostiles(
  view: PlayerViewV6,
): readonly PlayerViewV6["units"][number][] {
  return view.units.filter(
    (unit) => unit.hp > 0 && isHostile(view, unit.ownerId),
  );
}

function isHostile(view: PlayerViewV6, ownerId: PlayerId): boolean {
  return ownerId !== view.viewer.id && !isAllied(view, ownerId);
}

function isAllied(view: PlayerViewV6, ownerId: PlayerId): boolean {
  return (
    ownerId !== view.viewer.id &&
    view.setup.aiMode === "COOPERATIVE" &&
    ownerId !== view.humanPlayerId &&
    view.viewer.id !== view.humanPlayerId
  );
}

function sumDeltas(values: readonly { readonly delta: number }[]): number {
  return values.reduce((total, value) => total + value.delta, 0);
}

function directionDelta(
  direction: (typeof CARDINAL_DIRECTION_ORDER_V6)[number],
): CoordV6 {
  return direction === "NORTH"
    ? { x: 0, y: -1 }
    : direction === "EAST"
      ? { x: 1, y: 0 }
      : direction === "SOUTH"
        ? { x: 0, y: 1 }
        : { x: -1, y: 0 };
}

function onBoard(view: PlayerViewV6, at: CoordV6): boolean {
  return (
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < view.board.width &&
    at.y < view.board.height
  );
}

function missingCoord(): CoordV6 {
  return { x: -1, y: -1 };
}

function same(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function coordKey(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function sameCommand(left: CommandV6, right: CommandV6): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function chebyshev(left: CoordV6, right: CoordV6): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}
