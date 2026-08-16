import type { CombatPreview } from "../events/types";
import type { CityId, UnitId } from "../model/ids";
import { compareCoords } from "../model/order";
import type {
  CityState,
  Coord,
  PlayerTileView,
  PlayerUnitView,
  PlayerView,
  TechId,
  UnitType,
} from "../model/types";
import { requireRuleset } from "../rules/ruleset";
import type { Command, CommandSummary } from "../commands/types";

/**
 * Observation-safe command/query boundary shared by AI and the future UI.
 * Every result is a pure function of PlayerView; this module deliberately has
 * no GameState, authoritative simulation, or hidden collection dependency.
 */
export function queryPlayerCommands(
  view: PlayerView,
): readonly CommandSummary[] {
  const actor = view.viewer.id;
  if (
    view.outcome !== null ||
    view.turnOrder[view.activeSeatIndex] !== actor ||
    view.viewer.status !== "ACTIVE"
  ) {
    return [];
  }
  if (view.pendingChoice !== null) {
    const rewards = requireRuleset(view.rulesetId).cityLevels.find(
      (level) => level.level === view.pendingChoice?.level,
    )?.rewards;
    return (rewards ?? []).map((reward) => ({
      kind: "CHOOSE_CITY_REWARD",
      command: {
        kind: "CHOOSE_CITY_REWARD",
        cityId: view.pendingChoice?.cityId as CityId,
        reward,
      },
    }));
  }

  const commands: Command[] = [];
  addResearch(view, commands);
  addFruit(view, commands);
  addAnimals(view, commands);
  addLumberMills(view, commands);
  addMines(view, commands);
  addTraining(view, commands);
  for (const unit of [...view.units]
    .filter((candidate) => candidate.ownerId === actor)
    .sort((left, right) => left.id - right.id)) {
    addUnitCommands(view, unit, commands);
  }
  commands.push({ kind: "END_TURN" });
  return commands
    .sort((left, right) => comparePublicCommands(view, left, right))
    .map((command) => ({ kind: command.kind, command }));
}

const COMMAND_ORDINAL: Readonly<Record<Command["kind"], number>> = {
  MOVE: 0,
  ATTACK: 1,
  ESCAPE_MOVE: 2,
  RECOVER: 3,
  CAPTURE: 4,
  PROMOTE: 5,
  WAIT: 6,
  RESEARCH: 7,
  HARVEST_FRUIT: 8,
  HUNT_ANIMAL: 9,
  BUILD_LUMBER_MILL: 10,
  BUILD_MINE: 11,
  TRAIN: 12,
  CHOOSE_CITY_REWARD: 13,
  END_TURN: 14,
};

function comparePublicCommands(
  view: PlayerView,
  left: Command,
  right: Command,
): number {
  const leftAt = publicCommandTarget(view, left);
  const rightAt = publicCommandTarget(view, right);
  return (
    COMMAND_ORDINAL[left.kind] - COMMAND_ORDINAL[right.kind] ||
    compareCoords(leftAt, rightAt) ||
    publicCommandEntity(left) - publicCommandEntity(right) ||
    publicCommandContent(view, left) - publicCommandContent(view, right)
  );
}

function publicCommandTarget(view: PlayerView, command: Command): Coord {
  switch (command.kind) {
    case "MOVE":
    case "ESCAPE_MOVE":
      return command.path.at(-1) ?? { x: -1, y: -1 };
    case "ATTACK":
      return (
        view.units.find((unit) => unit.id === command.targetId)?.at ?? {
          x: -1,
          y: -1,
        }
      );
    case "HARVEST_FRUIT":
    case "HUNT_ANIMAL":
    case "BUILD_LUMBER_MILL":
    case "BUILD_MINE":
      return command.at;
    case "TRAIN":
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

function publicCommandEntity(command: Command): number {
  switch (command.kind) {
    case "MOVE":
    case "ATTACK":
    case "ESCAPE_MOVE":
    case "RECOVER":
    case "CAPTURE":
    case "PROMOTE":
    case "WAIT":
      return command.unitId;
    case "TRAIN":
    case "CHOOSE_CITY_REWARD":
      return command.cityId;
    default:
      return 0;
  }
}

function publicCommandContent(view: PlayerView, command: Command): number {
  if (command.kind === "RESEARCH") {
    return requireRuleset(view.rulesetId).technologies.findIndex(
      (tech) => tech.id === command.tech,
    );
  }
  if (command.kind === "TRAIN") {
    return (
      ["WARRIOR", "ARCHER", "DEFENDER", "RIDER", "CATAPULT"] as const
    ).indexOf(command.unit);
  }
  if (command.kind === "CHOOSE_CITY_REWARD") {
    return (["WORKSHOP", "SURVEY", "RESOURCES", "CITY_WALL"] as const).indexOf(
      command.reward,
    );
  }
  return 0;
}

export function queryPlayerCombatPreview(
  view: PlayerView,
  attackerId: UnitId,
  defenderId: UnitId,
): CombatPreview | null {
  const attacker = view.units.find((unit) => unit.id === attackerId);
  const defender = view.units.find((unit) => unit.id === defenderId);
  if (
    attacker === undefined ||
    defender === undefined ||
    attacker.ownerId !== view.viewer.id ||
    !isHostile(view, defender.ownerId) ||
    !canAttack(view, attacker, defender)
  ) {
    return null;
  }
  return estimateCombat(view, attacker, defender);
}

export function estimateCombat(
  view: PlayerView,
  attacker: PlayerUnitView,
  defender: PlayerUnitView,
): CombatPreview {
  const rules = requireRuleset(view.rulesetId);
  const attackerRule = rules.units[attacker.type];
  const defenderRule = rules.units[defender.type];
  const bonus = defenseBonus(view, defender);
  const attackForceNumerator = attackerRule.attack * attacker.hp;
  const attackForceDenominator = attacker.maxHp;
  const defenseForceNumerator =
    defenderRule.defense * defender.hp * bonus.numerator;
  const defenseForceDenominator = defender.maxHp * bonus.denominator;
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const total = attackOnCommon + defenseOnCommon;
  const damageToDefender = Math.min(
    defender.hp,
    roundHalfUp(attackOnCommon * attackerRule.attack * 9, total * 2),
  );
  const defenderDies = damageToDefender >= defender.hp;
  const distance = chebyshev(attacker.at, defender.at);
  const noRetaliationReason = defenderDies
    ? "DEFENDER_DIED"
    : distance > defenderRule.range
      ? "OUT_OF_RANGE"
      : null;
  // Opponent exploration is intentionally absent from PlayerView. The public
  // estimate conservatively assumes an in-range survivor can retaliate; policy
  // never learns the hidden exploration bit through a preview query.
  const damageToAttacker =
    noRetaliationReason === null
      ? Math.min(
          attacker.hp,
          roundHalfUp(defenseOnCommon * defenderRule.defense * 9, total * 2),
        )
      : 0;
  const attackerDies = damageToAttacker >= attacker.hp;
  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    advances: defenderDies && !attackerDies && distance === 1,
    noRetaliationReason,
  };
}

function addResearch(view: PlayerView, commands: Command[]): void {
  const ownedCities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  ).length;
  for (const tech of requireRuleset(view.rulesetId).technologies) {
    const cost =
      tech.tier * ownedCities +
      requireRuleset(view.rulesetId).technologyBaseCost;
    if (
      !view.viewer.researchedTechs.includes(tech.id) &&
      tech.prerequisites.every((required) =>
        view.viewer.researchedTechs.includes(required),
      ) &&
      view.viewer.stars >= cost
    ) {
      commands.push({ kind: "RESEARCH", tech: tech.id });
    }
  }
}

function addMines(view: PlayerView, commands: Command[]): void {
  if (
    !view.viewer.researchedTechs.includes("MINING") ||
    view.viewer.stars < requireRuleset(view.rulesetId).mineCost
  ) {
    return;
  }
  for (const tile of view.board.tiles) {
    if (
      tile.explored &&
      tile.terrain === "MOUNTAIN" &&
      tile.resource === "ORE" &&
      tile.improvement === null
    ) {
      const city = view.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      );
      if (city?.ownerId === view.viewer.id && !isPubliclyBesieged(view, city)) {
        commands.push({ kind: "BUILD_MINE", at: tile.at });
      }
    }
  }
}

function addFruit(view: PlayerView, commands: Command[]): void {
  const rules = requireRuleset(view.rulesetId);
  if (
    !view.viewer.researchedTechs.includes("ORGANIZATION") ||
    view.viewer.stars < rules.fruitCost
  )
    return;
  for (const tile of view.board.tiles) {
    if (
      tile.explored &&
      tile.terrain === "GRASS" &&
      tile.resource === "FRUIT" &&
      tile.improvement === null
    ) {
      const city = view.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      );
      if (city?.ownerId === view.viewer.id && !isPubliclyBesieged(view, city))
        commands.push({ kind: "HARVEST_FRUIT", at: tile.at });
    }
  }
}

function addAnimals(view: PlayerView, commands: Command[]): void {
  const rules = requireRuleset(view.rulesetId);
  if (
    !view.viewer.researchedTechs.includes("HUNTING") ||
    view.viewer.stars < rules.animalCost
  )
    return;
  for (const tile of view.board.tiles) {
    if (
      tile.explored &&
      tile.terrain === "FOREST" &&
      tile.resource === "ANIMAL" &&
      tile.improvement === null
    ) {
      const city = view.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      );
      if (city?.ownerId === view.viewer.id && !isPubliclyBesieged(view, city))
        commands.push({ kind: "HUNT_ANIMAL", at: tile.at });
    }
  }
}

function addLumberMills(view: PlayerView, commands: Command[]): void {
  const rules = requireRuleset(view.rulesetId);
  if (
    !view.viewer.researchedTechs.includes("FORESTRY") ||
    view.viewer.stars < rules.lumberMillCost
  )
    return;
  for (const tile of view.board.tiles) {
    if (
      tile.explored &&
      tile.terrain === "FOREST" &&
      tile.resource === null &&
      tile.improvement === null
    ) {
      const city = view.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      );
      if (city?.ownerId === view.viewer.id && !isPubliclyBesieged(view, city))
        commands.push({ kind: "BUILD_LUMBER_MILL", at: tile.at });
    }
  }
}

function addTraining(view: PlayerView, commands: Command[]): void {
  const rules = requireRuleset(view.rulesetId);
  for (const city of [...view.cities]
    .filter((candidate) => candidate.ownerId === view.viewer.id)
    .sort((left, right) => left.id - right.id)) {
    if (
      isPubliclyBesieged(view, city) ||
      view.units.some((unit) => sameCoord(unit.at, city.at)) ||
      city.assignedCounted === undefined ||
      city.assignedCounted >= city.level
    ) {
      continue;
    }
    for (const unitType of [
      "WARRIOR",
      "ARCHER",
      "DEFENDER",
      "RIDER",
      "CATAPULT",
    ] as const) {
      const unlock = rules.unitUnlocks[unitType];
      if (
        (unlock === null || view.viewer.researchedTechs.includes(unlock)) &&
        view.viewer.stars >= rules.units[unitType].cost
      ) {
        commands.push({ kind: "TRAIN", cityId: city.id, unit: unitType });
      }
    }
  }
}

function addUnitCommands(
  view: PlayerView,
  unit: PlayerUnitView,
  commands: Command[],
): void {
  const rules = requireRuleset(view.rulesetId);
  if (!unit.activation.handled) {
    commands.push({ kind: "WAIT", unitId: unit.id });
  }
  if (unit.ready) {
    if (
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.recovered &&
      !unit.activation.captured
    ) {
      for (const path of publicMovementPaths(
        view,
        unit,
        rules.units[unit.type].move,
      )) {
        commands.push({ kind: "MOVE", unitId: unit.id, path });
      }
    }
    if (
      !unit.activation.attacked &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      (!unit.activation.moved ||
        rules.units[unit.type].abilities.includes("DASH"))
    ) {
      for (const target of [...view.units]
        .filter(
          (candidate) =>
            isHostile(view, candidate.ownerId) &&
            canAttack(view, unit, candidate),
        )
        .sort((left, right) => left.id - right.id)) {
        commands.push({
          kind: "ATTACK",
          unitId: unit.id,
          targetId: target.id,
        });
      }
    }
    if (
      unit.activation.escapeAvailable &&
      rules.units[unit.type].abilities.includes("ESCAPE")
    ) {
      for (const path of publicMovementPaths(view, unit, 2)) {
        commands.push({ kind: "ESCAPE_MOVE", unitId: unit.id, path });
      }
    }
    if (
      unit.hp < unit.maxHp &&
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.recovered &&
      !unit.activation.captured
    ) {
      commands.push({ kind: "RECOVER", unitId: unit.id });
    }
    if (
      unit.captureEligible &&
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      capturableAt(view, unit)
    ) {
      commands.push({ kind: "CAPTURE", unitId: unit.id });
    }
  }
  if (!unit.veteran && unit.kills >= rules.promotionKills) {
    commands.push({ kind: "PROMOTE", unitId: unit.id });
  }
}

export function publicMovementPaths(
  view: PlayerView,
  unit: PlayerUnitView,
  budget: number,
): readonly (readonly Coord[])[] {
  const queue: (readonly Coord[])[] = [[]];
  const visited = new Set<string>([coordKey(unit.at)]);
  const result: (readonly Coord[])[] = [];
  while (queue.length > 0) {
    const path = queue.shift();
    if (path === undefined) break;
    const current = path.at(-1) ?? unit.at;
    if (path.length >= budget) continue;
    for (const destination of adjacent(view, current)) {
      const key = coordKey(destination.at);
      if (visited.has(key)) continue;
      if (isPublicAlliedTerritory(view, destination)) continue;
      const candidate = [...path, destination.at];
      if (!destination.explored) {
        if ("diplomaticBlock" in destination) continue;
        visited.add(key);
        result.push(candidate);
        continue;
      }
      if (
        view.units.some(
          (other) =>
            other.id !== unit.id && sameCoord(other.at, destination.at),
        ) ||
        (destination.terrain === "MOUNTAIN" &&
          !view.viewer.researchedTechs.includes("CLIMBING"))
      ) {
        continue;
      }
      visited.add(key);
      result.push(candidate);
      const stops =
        destination.terrain === "MOUNTAIN" ||
        destination.terrain === "FOREST" ||
        view.units.some(
          (enemy) =>
            isHostile(view, enemy.ownerId) &&
            chebyshev(enemy.at, destination.at) === 1,
        );
      if (!stops) queue.push(candidate);
    }
  }
  return result.sort((left, right) => {
    const leftAt = left.at(-1) ?? unit.at;
    const rightAt = right.at(-1) ?? unit.at;
    return compareCoords(leftAt, rightAt);
  });
}

function isPublicAlliedTerritory(
  view: PlayerView,
  tile: PlayerTileView,
): boolean {
  if ("diplomaticBlock" in tile) return true;
  if (!tile.explored) return false;
  if (tile.territoryCityId === null) return false;
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  return (
    city !== undefined &&
    !isHostile(view, city.ownerId) &&
    city.ownerId !== view.viewer.id
  );
}

function canAttack(
  view: PlayerView,
  attacker: PlayerUnitView,
  defender: PlayerUnitView,
): boolean {
  return (
    attacker.ready &&
    attacker.hp > 0 &&
    defender.hp > 0 &&
    chebyshev(attacker.at, defender.at) <=
      requireRuleset(view.rulesetId).units[attacker.type].range
  );
}

function capturableAt(view: PlayerView, unit: PlayerUnitView): boolean {
  const tile = tileAt(view, unit.at);
  if (tile === undefined || !tile.explored) return false;
  if (tile.site === "VILLAGE") return true;
  const city = view.cities.find((candidate) =>
    sameCoord(candidate.at, unit.at),
  );
  return city !== undefined && isHostile(view, city.ownerId);
}

function isPubliclyBesieged(view: PlayerView, city: CityState): boolean {
  return view.units.some(
    (unit) => isHostile(view, unit.ownerId) && sameCoord(unit.at, city.at),
  );
}

function isHostile(view: PlayerView, ownerId: number): boolean {
  if (ownerId === view.viewer.id) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    ownerId === view.humanPlayerId ||
    view.viewer.id === view.humanPlayerId
  );
}

function defenseBonus(
  view: PlayerView,
  unit: PlayerUnitView,
): { readonly numerator: number; readonly denominator: number } {
  const rules = requireRuleset(view.rulesetId);
  let bonus = { numerator: 1, denominator: 1 };
  if (rules.units[unit.type].abilities.includes("FORTIFY")) {
    const city = view.cities.find(
      (candidate) =>
        candidate.ownerId === unit.ownerId && sameCoord(candidate.at, unit.at),
    );
    if (city !== undefined) {
      bonus =
        city.rewardLevel3 === "CITY_WALL"
          ? rules.cityWallDefense
          : rules.normalCityDefense;
    }
  }
  const tile = tileAt(view, unit.at);
  if (
    tile?.explored === true &&
    tile.terrain === "MOUNTAIN" &&
    3 * bonus.denominator > 2 * bonus.numerator
  ) {
    bonus = rules.mountainDefense;
  }
  if (
    tile?.explored === true &&
    tile.terrain === "FOREST" &&
    view.players
      .find((player) => player.id === unit.ownerId)
      ?.researchedTechs.includes("ARCHERY") &&
    3 * bonus.denominator > 2 * bonus.numerator
  ) {
    bonus = rules.forestDefense;
  }
  return bonus;
}

function adjacent(view: PlayerView, center: Coord): readonly PlayerTileView[] {
  return view.board.tiles
    .filter((tile) => chebyshev(tile.at, center) === 1)
    .sort((left, right) => compareCoords(left.at, right.at));
}

function tileAt(view: PlayerView, at: Coord): PlayerTileView | undefined {
  return view.board.tiles[at.y * view.board.width + at.x];
}

function roundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

export function chebyshev(left: Coord, right: Coord): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function coordKey(at: Coord): string {
  return `${at.x},${at.y}`;
}

function sameCoord(left: Coord, right: Coord): boolean {
  return left.x === right.x && left.y === right.y;
}

export function publicTechnologyCost(view: PlayerView, tech: TechId): number {
  const rule = requireRuleset(view.rulesetId).technologies.find(
    (candidate) => candidate.id === tech,
  );
  if (rule === undefined) throw new RangeError(`Unknown technology: ${tech}`);
  return (
    rule.tier *
      view.cities.filter((city) => city.ownerId === view.viewer.id).length +
    requireRuleset(view.rulesetId).technologyBaseCost
  );
}

export function publicUnitCost(view: PlayerView, unit: UnitType): number {
  return requireRuleset(view.rulesetId).units[unit].cost;
}
