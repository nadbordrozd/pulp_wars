import {
  chebyshev,
  estimateCombat,
  estimateWallCombat,
  publicTechnologyCost,
  publicUnitCost,
  queryPlayerCommands,
  requireRuleset,
  type CityState,
  type Command,
  type Coord,
  type PlayerCityView,
  type PlayerUnitView,
  type PlayerView,
  type TechId,
  type UnitType,
} from "../engine/index";

export const NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN = 128;

export interface AiScore {
  readonly priority: number;
  readonly strategicValue: number;
  readonly immediateValue: number;
  readonly safetyValue: number;
  readonly objectiveValue: number;
  readonly deterministicTieBreak: readonly number[];
}

export interface ScoredAiCandidate {
  readonly command: Command;
  readonly score: AiScore;
}

export interface NormalAiDecision {
  readonly difficulty: "NORMAL";
  readonly candidates: readonly ScoredAiCandidate[];
  readonly command: Command | null;
  /** Normal POC resolves every tie through stable public fields. */
  readonly prngDraws: 0;
}

interface KnownThreat {
  readonly city: PlayerCityView;
  readonly severity: 1 | 2 | 3;
  readonly defenderHp: number;
}

const KIND_ORDINAL: Readonly<Record<Command["kind"], number>> = {
  MOVE: 0,
  ATTACK: 1,
  ESCAPE_MOVE: 2,
  KAMIKAZE_ROLL: 3,
  RECOVER: 4,
  CAPTURE: 5,
  PROMOTE: 6,
  WAIT: 7,
  BUILD_CHOCOLATE_WALL: 8,
  CANDIFY: 9,
  RESEARCH: 10,
  HARVEST_FRUIT: 11,
  HUNT_ANIMAL: 12,
  BUILD_LUMBER_MILL: 13,
  BUILD_MINE: 14,
  TRAIN: 15,
  CHOOSE_CANDIFY_CITY: 16,
  CHOOSE_CITY_REWARD: 17,
  END_TURN: 18,
};

const TECH_ORDINAL: Readonly<Record<TechId, number>> = {
  CLIMBING: 0,
  RIDING: 1,
  HUNTING: 2,
  ORGANIZATION: 3,
  MINING: 4,
  FORESTRY: 5,
  ARCHERY: 6,
  STRATEGY: 7,
  MATHEMATICS: 8,
};

const UNIT_ORDINAL: Readonly<Record<UnitType, number>> = {
  WARRIOR: 0,
  ARCHER: 1,
  DEFENDER: 2,
  RIDER: 3,
  CATAPULT: 4,
};

const REWARD_ORDINAL = {
  WORKSHOP: 0,
  SURVEY: 1,
  RESOURCES: 2,
  CITY_WALL: 3,
} as const;

const GENERAL_TRAINING_ORDER = [
  "RIDER",
  "ARCHER",
  "CATAPULT",
  "DEFENDER",
  "WARRIOR",
] as const;
const THREATENED_TRAINING_ORDER = [
  "DEFENDER",
  "WARRIOR",
  "ARCHER",
  "RIDER",
  "CATAPULT",
] as const;

export function chooseNormalCommand(view: PlayerView): NormalAiDecision {
  const publicCommands = queryPlayerCommands(view).map(
    ({ command }) => command,
  );
  const candidates = publicCommands
    .filter((command) => isCompositionCandidate(view, publicCommands, command))
    .map((command) => ({ command, score: scoreCommand(view, command) }))
    .filter((candidate) => candidate.score.priority >= 0)
    .sort(compareCandidateBestFirst);
  return {
    difficulty: "NORMAL",
    candidates,
    command: candidates[0]?.command ?? null,
    prngDraws: 0,
  };
}

/** A city production slot contributes exactly one strategically selected role. */
function isCompositionCandidate(
  view: PlayerView,
  publicCommands: readonly Command[],
  command: Command,
): boolean {
  if (command.kind === "WAIT") return false;
  if (command.kind === "KAMIKAZE_ROLL")
    return isSafeValuableRoll(view, command);
  if (command.kind === "ATTACK" && command.target.kind === "CHOCOLATE_WALL") {
    const wallId = command.target.wallId;
    const wall = view.chocolateWalls.find(
      (candidate) => candidate.id === wallId,
    );
    if (wall === undefined || !isHostile(view, wall.ownerId)) return false;
  }
  if (command.kind !== "TRAIN") return true;
  const available = publicCommands.filter(
    (candidate): candidate is Extract<Command, { readonly kind: "TRAIN" }> =>
      candidate.kind === "TRAIN" && candidate.cityId === command.cityId,
  );
  const city = view.cities.find((candidate) => candidate.id === command.cityId);
  const preferred =
    city !== undefined && knownThreatForCity(view, city) !== null
      ? preferredThreatenedTrainingType(available)
      : preferredTrainingType(view, available);
  return preferred === command.unit;
}

function isSafeValuableRoll(
  view: PlayerView,
  command: Extract<Command, { readonly kind: "KAMIKAZE_ROLL" }>,
): boolean {
  const actor = view.units.find((unit) => unit.id === command.unitId);
  if (actor === undefined) return false;
  const delta =
    command.direction === "NORTH"
      ? { x: 0, y: -1 }
      : command.direction === "EAST"
        ? { x: 1, y: 0 }
        : command.direction === "SOUTH"
          ? { x: 0, y: 1 }
          : { x: -1, y: 0 };
  let hostile = false;
  for (
    let at = { x: actor.at.x + delta.x, y: actor.at.y + delta.y };
    at.x >= 0 &&
    at.y >= 0 &&
    at.x < view.board.width &&
    at.y < view.board.height;
    at = { x: at.x + delta.x, y: at.y + delta.y }
  ) {
    const unit = view.units.find((candidate) => sameCoord(candidate.at, at));
    const wall = view.chocolateWalls.find((candidate) =>
      sameCoord(candidate.at, at),
    );
    const ownerId = unit?.ownerId ?? wall?.ownerId;
    if (ownerId === undefined) continue;
    if (!isHostile(view, ownerId)) return false;
    hostile = true;
  }
  return hostile;
}

export function preferredTrainingType(
  view: PlayerView,
  available: readonly Extract<Command, { readonly kind: "TRAIN" }>[],
): Extract<Command, { readonly kind: "TRAIN" }>["unit"] | null {
  const types = available.map((candidate) => candidate.unit);
  if (types.length === 0) return null;
  const counts = ownedUnitCounts(view);
  const missingAvailable = GENERAL_TRAINING_ORDER.find(
    (type) => types.includes(type) && counts[type] === 0,
  );
  if (missingAvailable !== undefined) return missingAvailable;
  return (
    GENERAL_TRAINING_ORDER.filter((type) => types.includes(type)).sort(
      (left, right) =>
        counts[left] - counts[right] ||
        GENERAL_TRAINING_ORDER.indexOf(left) -
          GENERAL_TRAINING_ORDER.indexOf(right),
    )[0] ?? null
  );
}

function preferredThreatenedTrainingType(
  available: readonly Extract<Command, { readonly kind: "TRAIN" }>[],
): Extract<Command, { readonly kind: "TRAIN" }>["unit"] | null {
  const types = available.map((candidate) => candidate.unit);
  return THREATENED_TRAINING_ORDER.find((type) => types.includes(type)) ?? null;
}

export function scoreCommand(view: PlayerView, command: Command): AiScore {
  const actingUnit = unitForCommand(view, command);
  const resultingTile = commandResultTile(view, command, actingUnit);
  const objective =
    actingUnit === null ? null : selectedObjective(view, actingUnit.at);
  let priority = -1;
  let strategicValue = 0;
  let immediateValue = 0;
  let objectiveValue = 0;

  switch (command.kind) {
    case "CAPTURE": {
      const unit = view.units.find(
        (candidate) => candidate.id === command.unitId,
      );
      const city = unit === undefined ? undefined : cityAt(view, unit.at);
      priority = captureEndsVisibleMatch(view, command.unitId)
        ? 1200
        : city !== undefined && city.ownerId !== view.viewer.id
          ? 1160
          : 1140;
      immediateValue = 20;
      break;
    }
    case "PROMOTE":
      priority = 1100;
      break;
    case "ATTACK": {
      const attacker = view.units.find((unit) => unit.id === command.unitId);
      const target = command.target;
      const defender =
        target.kind === "UNIT"
          ? view.units.find((unit) => unit.id === target.unitId)
          : undefined;
      const wall =
        target.kind === "CHOCOLATE_WALL"
          ? view.chocolateWalls.find(
              (candidate) => candidate.id === target.wallId,
            )
          : undefined;
      if (attacker !== undefined) {
        const preview =
          defender !== undefined
            ? estimateCombat(view, attacker, defender)
            : wall !== undefined
              ? estimateWallCombat(view, attacker, wall)
              : null;
        if (preview === null) break;
        const threat =
          defender === undefined ? null : threatFromUnit(view, defender);
        priority =
          threat !== null
            ? preview.defenderDies
              ? 1060
              : 1030
            : preview.defenderDies
              ? 1000
              : 700;
        strategicValue = threat?.severity ?? 0;
        immediateValue =
          10 * preview.damageToDefender - 8 * preview.damageToAttacker;
      }
      break;
    }
    case "KAMIKAZE_ROLL":
      priority = 400;
      break;
    case "BUILD_CHOCOLATE_WALL":
      priority = 450;
      immediateValue = -1;
      break;
    case "CANDIFY": {
      const actor = view.units.find((unit) => unit.id === command.unitId);
      const tile = actor === undefined ? undefined : tileAt(view, actor.at);
      const controller =
        tile?.explored === true && tile.territoryCityId !== null
          ? view.cities.find((city) => city.id === tile.territoryCityId)
          : undefined;
      priority =
        controller !== undefined && isHostile(view, controller.ownerId)
          ? 890
          : 870;
      break;
    }
    case "TRAIN": {
      const city = view.cities.find(
        (candidate) => candidate.id === command.cityId,
      );
      const threat = city === undefined ? null : knownThreatForCity(view, city);
      priority = threat === null ? 860 : 1050;
      strategicValue = threat?.severity ?? 0;
      immediateValue = -publicUnitCost(view, command.unit);
      break;
    }
    case "MOVE":
    case "ESCAPE_MOVE": {
      if (actingUnit !== null && resultingTile !== null) {
        const threatenedCity = knownThreats(view).find(
          (threat) =>
            sameCoord(threat.city.at, resultingTile) &&
            !view.units.some((unit) => sameCoord(unit.at, threat.city.at)),
        );
        if (threatenedCity !== undefined) {
          priority = 1040;
          strategicValue = threatenedCity.severity;
        } else if (
          objective !== null &&
          chebyshev(resultingTile, objective) <
            chebyshev(actingUnit.at, objective)
        ) {
          priority = 600;
          objectiveValue = -chebyshev(resultingTile, objective);
        } else if (objective === null) {
          const frontier = frontierGain(view, resultingTile);
          const explorationTarget = selectedExplorationTarget(
            view,
            actingUnit.at,
          );
          const approachesFrontier =
            explorationTarget !== null &&
            chebyshev(resultingTile, explorationTarget) <
              chebyshev(actingUnit.at, explorationTarget);
          if (frontier > 0 || approachesFrontier) {
            priority = 500;
            // Pack the documented primary frontier count and secondary outward
            // displacement into the single signed objective tuple field.
            objectiveValue =
              frontier * (Math.max(view.board.width, view.board.height) + 1) +
              chebyshev(actingUnit.at, resultingTile);
          }
        }
      }
      break;
    }
    case "CHOOSE_CITY_REWARD":
      priority = 950;
      immediateValue = command.reward === "RESOURCES" ? 5 : 0;
      break;
    case "CHOOSE_CANDIFY_CITY":
      priority = 950;
      strategicValue = candifyFrontierValue(view, command.cityId);
      break;
    case "RESEARCH": {
      const resourceTargets = resourceTargetsForFirstStep(view, command.tech);
      priority =
        resourceTargets > 0
          ? 920
          : roleTargetsForFirstStep(view, command.tech) > 0
            ? 840
            : 820;
      strategicValue = resourceTargets;
      immediateValue = -publicTechnologyCost(view, command.tech);
      break;
    }
    case "HARVEST_FRUIT":
    case "HUNT_ANIMAL":
    case "BUILD_LUMBER_MILL":
    case "BUILD_MINE": {
      const city = ownedCityForTile(view, command.at);
      const populationGained = command.kind === "BUILD_MINE" ? 2 : 1;
      const starsDelta =
        command.kind === "BUILD_MINE"
          ? -5
          : command.kind === "BUILD_LUMBER_MILL"
            ? -3
            : -2;
      const levels =
        city !== null && city.population + populationGained >= city.level + 1
          ? 1
          : 0;
      priority = levels > 0 ? 900 : 880;
      strategicValue = levels;
      immediateValue = 5 * populationGained + starsDelta;
      break;
    }
    case "RECOVER":
      priority =
        actingUnit !== null && actingUnit.hp * 2 < actingUnit.maxHp ? 350 : 250;
      break;
    case "WAIT":
      priority = -1;
      break;
    case "END_TURN":
      priority = 0;
      break;
  }

  if (
    objectiveValue === 0 &&
    actingUnit !== null &&
    resultingTile !== null &&
    objective !== null
  ) {
    objectiveValue = -chebyshev(resultingTile, objective);
  }
  const safetyValue =
    actingUnit === null || resultingTile === null
      ? 0
      : -expectedKnownIncomingDamage(view, actingUnit, resultingTile);
  return {
    priority,
    strategicValue,
    immediateValue,
    safetyValue,
    objectiveValue,
    deterministicTieBreak: tieBreak(view, command),
  };
}

function compareCandidateBestFirst(
  left: ScoredAiCandidate,
  right: ScoredAiCandidate,
): number {
  for (const field of [
    "priority",
    "strategicValue",
    "immediateValue",
    "safetyValue",
    "objectiveValue",
  ] as const) {
    const difference = right.score[field] - left.score[field];
    if (difference !== 0) return difference;
  }
  const length = Math.max(
    left.score.deterministicTieBreak.length,
    right.score.deterministicTieBreak.length,
  );
  for (let index = 0; index < length; index += 1) {
    const difference =
      (left.score.deterministicTieBreak[index] ?? 0) -
      (right.score.deterministicTieBreak[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

function tieBreak(view: PlayerView, command: Command): readonly number[] {
  const at = commandTarget(view, command);
  const detail =
    command.kind === "RESEARCH"
      ? TECH_ORDINAL[command.tech]
      : command.kind === "TRAIN"
        ? UNIT_ORDINAL[command.unit]
        : command.kind === "CHOOSE_CITY_REWARD"
          ? REWARD_ORDINAL[command.reward]
          : 0;
  // The comparator applies ascending order to these final stable fields,
  // equivalent to negating them before lexicographic maximization.
  return [
    KIND_ORDINAL[command.kind],
    at.y,
    at.x,
    commandEntity(command),
    detail,
  ];
}

function commandTarget(view: PlayerView, command: Command): Coord {
  switch (command.kind) {
    case "MOVE":
    case "ESCAPE_MOVE":
      return command.path.at(-1) ?? { x: -1, y: -1 };
    case "ATTACK":
      if (command.target.kind === "UNIT") {
        const id = command.target.unitId;
        return (
          view.units.find((unit) => unit.id === id)?.at ?? { x: -1, y: -1 }
        );
      } else {
        const id = command.target.wallId;
        return (
          view.chocolateWalls.find((wall) => wall.id === id)?.at ?? {
            x: -1,
            y: -1,
          }
        );
      }
    case "KAMIKAZE_ROLL": {
      const unit = view.units.find(
        (candidate) => candidate.id === command.unitId,
      );
      if (unit === undefined) return { x: -1, y: -1 };
      if (command.direction === "NORTH") return { x: unit.at.x, y: 0 };
      if (command.direction === "EAST")
        return { x: view.board.width - 1, y: unit.at.y };
      if (command.direction === "SOUTH")
        return { x: unit.at.x, y: view.board.height - 1 };
      return { x: 0, y: unit.at.y };
    }
    case "HARVEST_FRUIT":
    case "HUNT_ANIMAL":
    case "BUILD_LUMBER_MILL":
    case "BUILD_MINE":
    case "BUILD_CHOCOLATE_WALL":
      return command.at;
    case "TRAIN":
    case "CHOOSE_CANDIFY_CITY":
    case "CHOOSE_CITY_REWARD":
      return (
        view.cities.find((city) => city.id === command.cityId)?.at ?? {
          x: -1,
          y: -1,
        }
      );
    case "RECOVER":
    case "CAPTURE":
    case "PROMOTE":
    case "WAIT":
    case "CANDIFY":
      return (
        view.units.find((unit) => unit.id === command.unitId)?.at ?? {
          x: -1,
          y: -1,
        }
      );
    case "RESEARCH":
    case "END_TURN":
      return { x: -1, y: -1 };
  }
}

function commandEntity(command: Command): number {
  switch (command.kind) {
    case "MOVE":
    case "ATTACK":
    case "ESCAPE_MOVE":
    case "RECOVER":
    case "CAPTURE":
    case "PROMOTE":
    case "WAIT":
    case "CANDIFY":
      return command.unitId;
    case "TRAIN":
    case "CHOOSE_CANDIFY_CITY":
    case "CHOOSE_CITY_REWARD":
      return command.cityId;
    default:
      return 0;
  }
}

function unitForCommand(
  view: PlayerView,
  command: Command,
): PlayerUnitView | null {
  switch (command.kind) {
    case "MOVE":
    case "ATTACK":
    case "ESCAPE_MOVE":
    case "RECOVER":
    case "CAPTURE":
    case "PROMOTE":
    case "WAIT":
    case "CANDIFY":
      return view.units.find((unit) => unit.id === command.unitId) ?? null;
    default:
      return null;
  }
}

function commandResultTile(
  view: PlayerView,
  command: Command,
  unit: PlayerUnitView | null,
): Coord | null {
  if (unit === null) return null;
  if (command.kind === "MOVE" || command.kind === "ESCAPE_MOVE") {
    return command.path.at(-1) ?? unit.at;
  }
  if (command.kind === "ATTACK") {
    if (command.target.kind === "UNIT") {
      const id = command.target.unitId;
      const defender = view.units.find((item) => item.id === id);
      if (
        defender !== undefined &&
        estimateCombat(view, unit, defender).advances
      )
        return defender.at;
    } else {
      const id = command.target.wallId;
      const wall = view.chocolateWalls.find((item) => item.id === id);
      if (wall !== undefined && estimateWallCombat(view, unit, wall).advances)
        return wall.at;
    }
  }
  return unit.at;
}

function knownThreats(view: PlayerView): readonly KnownThreat[] {
  return view.cities
    .filter((city) => city.ownerId === view.viewer.id)
    .map((city) => knownThreatForCity(view, city))
    .filter((threat): threat is KnownThreat => threat !== null)
    .sort(compareThreats);
}

function knownThreatForCity(
  view: PlayerView,
  city: PlayerCityView,
): KnownThreat | null {
  let severity: 1 | 2 | 3 | null = null;
  for (const hostile of visibleHostiles(view)) {
    const distance = chebyshev(hostile.at, city.at);
    const rules = requireRuleset(view.rulesetId).units[hostile.type];
    const candidate = sameCoord(hostile.at, city.at)
      ? 3
      : distance <= rules.range
        ? 2
        : distance <= rules.move + rules.range
          ? 1
          : null;
    if (candidate !== null && (severity === null || candidate > severity)) {
      severity = candidate;
    }
  }
  if (severity === null) return null;
  const defender = view.units.find(
    (unit) => unit.ownerId === view.viewer.id && sameCoord(unit.at, city.at),
  );
  const emptyHp =
    Math.max(
      ...Object.values(requireRuleset(view.rulesetId).units).map(
        (unit) => unit.maxHp,
      ),
    ) + 1;
  return { city, severity, defenderHp: defender?.hp ?? emptyHp };
}

function threatFromUnit(
  view: PlayerView,
  hostile: PlayerUnitView,
): KnownThreat | null {
  if (!isHostile(view, hostile.ownerId)) return null;
  return (
    view.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .map((city) => {
        const distance = chebyshev(hostile.at, city.at);
        const rules = requireRuleset(view.rulesetId).units[hostile.type];
        const severity = sameCoord(hostile.at, city.at)
          ? 3
          : distance <= rules.range
            ? 2
            : distance <= rules.move + rules.range
              ? 1
              : null;
        if (severity === null) return null;
        const defender = view.units.find(
          (unit) =>
            unit.ownerId === view.viewer.id && sameCoord(unit.at, city.at),
        );
        const emptyHp =
          Math.max(
            ...Object.values(requireRuleset(view.rulesetId).units).map(
              (unit) => unit.maxHp,
            ),
          ) + 1;
        return {
          city,
          severity,
          defenderHp: defender?.hp ?? emptyHp,
        } as KnownThreat;
      })
      .filter((threat): threat is KnownThreat => threat !== null)
      .sort(compareThreats)[0] ?? null
  );
}

function compareThreats(left: KnownThreat, right: KnownThreat): number {
  return (
    right.severity - left.severity ||
    Number(right.city.isCapital) - Number(left.city.isCapital) ||
    left.defenderHp - right.defenderHp ||
    left.city.at.y - right.city.at.y ||
    left.city.at.x - right.city.at.x ||
    left.city.id - right.city.id
  );
}

function visibleHostiles(view: PlayerView): readonly PlayerUnitView[] {
  return view.units.filter((unit) => isHostile(view, unit.ownerId));
}

function isHostile(view: PlayerView, ownerId: number): boolean {
  if (ownerId === view.viewer.id) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    ownerId === view.humanPlayerId ||
    view.viewer.id === view.humanPlayerId
  );
}

function resourceTargetsForFirstStep(view: PlayerView, tech: TechId): number {
  let count = 0;
  for (const tile of view.board.tiles) {
    if (
      !tile.explored ||
      (tile.resource !== "FRUIT" &&
        tile.resource !== "ORE" &&
        tile.resource !== "ANIMAL" &&
        !(
          tile.terrain === "FOREST" &&
          tile.resource === null &&
          tile.improvement === null
        ))
    ) {
      continue;
    }
    const city = ownedCityForTile(view, tile.at);
    if (city === null || knownThreatForCity(view, city)?.severity === 3)
      continue;
    const target =
      tile.resource === "FRUIT"
        ? "ORGANIZATION"
        : tile.resource === "ORE"
          ? "MINING"
          : tile.resource === "ANIMAL"
            ? "HUNTING"
            : "FORESTRY";
    if (tile.improvement === null && firstResearchStep(view, target) === tech) {
      count += 1;
    }
  }
  return count;
}

function roleTargetsForFirstStep(view: PlayerView, tech: TechId): number {
  if (!hasPotentialTrainingSlot(view)) return 0;
  const counts = ownedUnitCounts(view);
  const rules = requireRuleset(view.rulesetId);
  return GENERAL_TRAINING_ORDER.filter((unit) => {
    const unlock = rules.unitUnlocks[unit];
    return (
      counts[unit] === 0 &&
      unlock !== null &&
      firstResearchStep(view, unlock) === tech
    );
  }).length;
}

function firstResearchStep(view: PlayerView, target: TechId): TechId | null {
  if (view.viewer.researchedTechs.includes(target)) return null;
  const rules = requireRuleset(view.rulesetId);
  const targetRule = rules.technologies.find((tech) => tech.id === target);
  if (targetRule === undefined) return null;
  const missingPrerequisites = targetRule.prerequisites.filter(
    (tech) => !view.viewer.researchedTechs.includes(tech),
  );
  if (missingPrerequisites.length === 0) return target;
  return (
    missingPrerequisites
      .map((tech) => firstResearchStep(view, tech))
      .filter((tech): tech is TechId => tech !== null)
      .sort((left, right) => TECH_ORDINAL[left] - TECH_ORDINAL[right])[0] ??
    null
  );
}

function hasPotentialTrainingSlot(view: PlayerView): boolean {
  return view.cities.some(
    (city) =>
      city.ownerId === view.viewer.id &&
      city.assignedCounted !== undefined &&
      city.assignedCounted < city.level &&
      knownThreatForCity(view, city)?.severity !== 3,
  );
}

function ownedUnitCounts(view: PlayerView): Record<UnitType, number> {
  const counts: Record<UnitType, number> = {
    WARRIOR: 0,
    ARCHER: 0,
    DEFENDER: 0,
    RIDER: 0,
    CATAPULT: 0,
  };
  for (const unit of view.units) {
    if (unit.ownerId === view.viewer.id) counts[unit.type] += 1;
  }
  return counts;
}

function hasOwnedPendingReward(
  view: PlayerView,
  city: PlayerCityView,
): boolean {
  return (
    view.pendingChoice?.kind === "CITY_REWARD" &&
    view.pendingChoice.cityId === city.id
  );
}

function candifyFrontierValue(view: PlayerView, cityId: number): number {
  const territory = view.board.tiles.filter(
    (tile) => tile.explored && tile.territoryCityId === cityId,
  );
  const adjacent = new Set<string>();
  for (const tile of territory) {
    for (let y = tile.at.y - 1; y <= tile.at.y + 1; y += 1) {
      for (let x = tile.at.x - 1; x <= tile.at.x + 1; x += 1) {
        if (x < 0 || y < 0 || x >= view.board.width || y >= view.board.height)
          continue;
        const candidate = tileAt(view, { x, y });
        if (
          candidate?.explored === true &&
          candidate.territoryCityId !== cityId
        )
          adjacent.add(`${x},${y}`);
      }
    }
  }
  return adjacent.size;
}

function ownedCityForTile(view: PlayerView, at: Coord): PlayerCityView | null {
  const tile = tileAt(view, at);
  if (tile?.explored !== true || tile.territoryCityId === null) return null;
  const city = view.cities.find(
    (candidate) =>
      candidate.id === tile.territoryCityId &&
      candidate.ownerId === view.viewer.id,
  );
  return city === undefined || hasOwnedPendingReward(view, city) ? null : city;
}

function selectedObjective(view: PlayerView, origin: Coord): Coord | null {
  return (
    knownObjectives(view)
      .slice()
      .sort(
        (left, right) =>
          chebyshev(origin, left) - chebyshev(origin, right) ||
          left.y - right.y ||
          left.x - right.x,
      )[0] ?? null
  );
}

function selectedExplorationTarget(
  view: PlayerView,
  origin: Coord,
): Coord | null {
  return (
    view.board.tiles
      .filter((tile) => !tile.explored && !("diplomaticBlock" in tile))
      .map((tile) => tile.at)
      .sort(
        (left, right) =>
          chebyshev(origin, left) - chebyshev(origin, right) ||
          left.y - right.y ||
          left.x - right.x,
      )[0] ?? null
  );
}

function captureEndsVisibleMatch(view: PlayerView, unitId: number): boolean {
  if (!view.board.tiles.every((tile) => tile.explored)) return false;
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (unit === undefined) return false;
  const city = cityAt(view, unit.at);
  return (
    city !== undefined &&
    isHostile(view, city.ownerId) &&
    view.cities.filter(
      (candidate) =>
        candidate.ownerId === city.ownerId &&
        isHostile(view, candidate.ownerId),
    ).length === 1 &&
    view.players
      .filter(
        (player) => player.status === "ACTIVE" && isHostile(view, player.id),
      )
      .every((player) => player.id === city.ownerId)
  );
}

function frontierGain(view: PlayerView, at: Coord): number {
  return view.board.tiles.filter(
    (tile) =>
      !tile.explored &&
      !("diplomaticBlock" in tile) &&
      chebyshev(tile.at, at) <= 1,
  ).length;
}

function expectedKnownIncomingDamage(
  view: PlayerView,
  actingUnit: PlayerUnitView,
  resultingTile: Coord,
): number {
  const defender = { ...actingUnit, at: resultingTile };
  return visibleHostiles(view)
    .filter(
      (enemy) =>
        chebyshev(enemy.at, resultingTile) <=
        requireRuleset(view.rulesetId).units[enemy.type].range,
    )
    .reduce(
      (total, enemy) =>
        total + estimateCombat(view, enemy, defender).damageToDefender,
      0,
    );
}

function cityAt(view: PlayerView, at: Coord): PlayerCityView | undefined {
  return view.cities.find((city) => sameCoord(city.at, at));
}

function tileAt(view: PlayerView, at: Coord) {
  return view.board.tiles[at.y * view.board.width + at.x];
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}

export function knownObjectives(view: PlayerView): readonly CityState["at"][] {
  const result: Coord[] = [];
  for (const tile of view.board.tiles) {
    if (tile.explored && tile.site === "VILLAGE") result.push(tile.at);
  }
  for (const city of view.cities) {
    if (isHostile(view, city.ownerId)) result.push(city.at);
  }
  return result;
}
