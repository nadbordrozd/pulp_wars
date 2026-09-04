import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V6,
  SPATIAL_ECONOMIC_ACTIONS_V6,
  effectiveRoleRuleV6,
  requireFactionTechnologyTreeV6,
  technologyCapabilitiesV6,
  technologyResearchCostV6,
  type BasicEconomicCommandKindV6,
  type EffectiveRoleRuleV6,
  type SpatialEconomicCommandKindV6,
  type TechnologyBranchIdV6,
  type TechnologyCapabilitiesV6,
  type TechnologyUnlockV6,
} from "../rules/ruleset-v6";
import { compareCommandsV6, type CommandV6 } from "./commands";
import type { CombatTargetRefV6 } from "./commands";
import {
  candifyWouldDuplicateSpecializedImprovementV6,
  cityFootprintContainsV6,
  territoryTilesAreConnectedV6,
} from "./candy";
import { calculateCombatPreviewV6 } from "./combat";
import {
  arePlayersAlliedV6,
  assignedUnitCountV6,
  cityUnitCapacityV6,
  resolveCityGrowthV6,
} from "./economy";
import type { CombatPreviewV6 } from "./events";
import { reachableMovementPathsV6 } from "./movement";
import {
  isCapitalConnectedRoadV6,
  spatialContributionAtV6,
  type EconomicFamilyV6,
  type OppositePairAxisV6,
} from "./spatial-economy";
import type {
  BoardStateV6,
  CityStateV6,
  CoordV6,
  EconomicImprovementId,
  FactionIdV6,
  FactionTreeId,
  GameStateV6,
  RewardIdV6,
  TechnologyId,
  TileStateV6,
  UnitRoleId,
} from "./types";
import { CARDINAL_DIRECTION_ORDER_V6, UNIT_ROLE_IDS } from "./types";
import type { PlayerTileViewV6, PlayerViewV6 } from "./view";

export interface CityValueDeltaV6 {
  readonly cityId: CityId;
  readonly delta: number;
}

export interface EconomicPreviewV6 {
  readonly at: CoordV6;
  readonly cost: number;
  readonly ownerCityId: CityId;
  readonly populationDeltaByCity: readonly CityValueDeltaV6[];
  readonly coinIncomeDeltaByCity: readonly CityValueDeltaV6[];
  readonly resultingContribution: number;
  readonly levelsReached: readonly number[];
  readonly distinctTypes: readonly EconomicImprovementId[];
  readonly distinctFamilies: readonly EconomicFamilyV6[];
  readonly contributingTiles: readonly CoordV6[];
  readonly oppositePairAxes: readonly OppositePairAxisV6[];
  readonly capitalRoadConnected: boolean;
  readonly buildingLimitReached: false;
  readonly complete: true;
}

export type EconomicPreviewResultV6 =
  | { readonly ok: true; readonly preview: EconomicPreviewV6 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

export type PublicTechnologyStateV6 = "OWNED" | "AVAILABLE" | "BLOCKED";

export interface PublicTechnologyNodeV6 {
  readonly id: TechnologyId;
  readonly branch: TechnologyBranchIdV6;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechnologyId[];
  readonly missingPrerequisites: readonly TechnologyId[];
  readonly state: PublicTechnologyStateV6;
  readonly cost: number;
  readonly affordable: boolean;
  readonly effects: readonly TechnologyUnlockV6[];
  readonly unlockedRoleRules: readonly EffectiveRoleRuleV6[];
}

export interface PublicTechnologyTreeV6 {
  readonly id: FactionTreeId;
  readonly faction: FactionIdV6;
  readonly ownedCityCount: number;
  readonly nodes: readonly PublicTechnologyNodeV6[];
  readonly roleBindings: Readonly<Record<UnitRoleId, EffectiveRoleRuleV6>>;
}

/** Complete public tree state for the viewer's explicit registration. */
export function queryTechnologyTreeV6(
  view: PlayerViewV6,
): PublicTechnologyTreeV6 {
  const tree = requireFactionTechnologyTreeV6(view.viewer.factionTreeId);
  if (tree.faction !== view.viewer.faction) {
    throw new RangeError("Faction tree does not belong to viewer faction");
  }
  const ownedCityCount = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  ).length;
  if (ownedCityCount < 1) {
    throw new RangeError("Technology cost requires an owned city");
  }
  const owned = new Set(view.viewer.researchedTechs);
  const nodes = tree.nodes.map((node): PublicTechnologyNodeV6 => {
    const missingPrerequisites = node.prerequisites.filter(
      (prerequisite) => !owned.has(prerequisite),
    );
    const state: PublicTechnologyStateV6 = owned.has(node.id)
      ? "OWNED"
      : missingPrerequisites.length === 0
        ? "AVAILABLE"
        : "BLOCKED";
    const cost = technologyResearchCostV6(node.tier, ownedCityCount);
    return {
      id: node.id,
      branch: node.branch,
      tier: node.tier,
      prerequisites: node.prerequisites,
      missingPrerequisites,
      state,
      cost,
      affordable: state === "AVAILABLE" && view.viewer.coins >= cost,
      effects: node.unlocks,
      unlockedRoleRules: node.unlockedRoles.map((role) => tree.roleRules[role]),
    };
  });
  return {
    id: tree.id,
    faction: tree.faction,
    ownedCityCount,
    nodes,
    roleBindings: tree.roleRules,
  };
}

/** Aggregated typed effects for downstream reducers and public policy code. */
export function queryTechnologyCapabilitiesV6(
  view: PlayerViewV6,
): TechnologyCapabilitiesV6 {
  const tree = requireFactionTechnologyTreeV6(view.viewer.factionTreeId);
  if (tree.faction !== view.viewer.faction) {
    throw new RangeError("Faction tree does not belong to viewer faction");
  }
  return technologyCapabilitiesV6(tree.id, view.viewer.researchedTechs);
}

/** Public faction-resolved role data for a visible player/unit. */
export function queryPublicRoleRuleV6(
  view: PlayerViewV6,
  ownerId: PlayerId,
  role: UnitRoleId,
): EffectiveRoleRuleV6 | null {
  const owner = view.players.find((player) => player.id === ownerId);
  return owner === undefined ? null : effectiveRoleRuleV6(owner.faction, role);
}

const BASIC_KINDS = Object.keys(
  BASIC_ECONOMIC_ACTIONS_V6,
) as BasicEconomicCommandKindV6[];
const SPATIAL_KINDS = Object.keys(
  SPATIAL_ECONOMIC_ACTIONS_V6,
) as SpatialEconomicCommandKindV6[];
const PUBLIC_COMMANDS = new WeakMap<PlayerViewV6, readonly CommandV6[]>();

/** Pure observation-safe enumeration for the implemented v6 economy slice. */
export function queryPlayerCommandsV6(
  view: PlayerViewV6,
): readonly CommandV6[] {
  const cached = PUBLIC_COMMANDS.get(view);
  if (cached !== undefined) return cached;
  const activeId = view.turnOrder[view.activeSeatIndex];
  if (
    view.outcome !== null ||
    view.viewer.status !== "ACTIVE" ||
    activeId !== view.viewer.id
  ) {
    return cachePublicCommands(view, []);
  }
  const pending = view.pendingChoices[0];
  if (pending !== undefined) {
    if (pending.kind === "CANDIFY_CITY") {
      const unit = view.units.find(
        (candidate) =>
          candidate.id === pending.unitId &&
          candidate.ownerId === view.viewer.id &&
          candidate.hp > 0,
      );
      const tile =
        unit === undefined
          ? undefined
          : view.board.tiles[unit.at.y * view.board.width + unit.at.x];
      return cachePublicCommands(
        view,
        unit === undefined || tile?.explored !== true
          ? []
          : pending.candidateCityIds
              .filter((cityId) =>
                view.cities.some(
                  (city) =>
                    city.id === cityId &&
                    city.ownerId === view.viewer.id &&
                    !candifyWouldDuplicateSpecializedImprovementV6(
                      view.board.tiles,
                      city.id,
                      tile.improvement,
                    ),
                ),
              )
              .map((cityId): CommandV6 => ({
                kind: "CHOOSE_CANDIFY_CITY",
                unitId: unit.id,
                cityId,
              }))
              .sort(compareCommandsV6),
      );
    }
    const city = view.cities.find(
      (candidate) =>
        candidate.id === pending.cityId && candidate.ownerId === view.viewer.id,
    );
    return cachePublicCommands(
      view,
      city === undefined
        ? []
        : pending.candidates
            .filter((reward) =>
              publicRewardCandidateMayBeLegal(view, city, reward),
            )
            .map((reward): CommandV6 => ({
              kind: "CHOOSE_CITY_REWARD",
              cityId: pending.cityId,
              reachedLevel: pending.reachedLevel,
              reward,
            }))
            .sort(compareCommandsV6),
    );
  }
  const commands: CommandV6[] = [];
  for (const technology of queryTechnologyTreeV6(view).nodes) {
    if (technology.state === "AVAILABLE" && technology.affordable) {
      commands.push({ kind: "RESEARCH", tech: technology.id });
    }
  }
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    for (const kind of BASIC_KINDS) {
      if (publicBasicActionIsLegal(view, tile, kind)) {
        commands.push({ kind, at: tile.at });
      }
    }
    for (const kind of SPATIAL_KINDS) {
      if (publicSpatialActionIsLegal(view, tile, kind)) {
        commands.push({ kind, at: tile.at });
      }
    }
    for (const kind of [
      "CLEAR_FOREST",
      "REPLANT_FOREST",
      "BUILD_ROAD",
      "REDEVELOP",
    ] as const) {
      if (publicInfrastructureActionIsLegal(view, tile, kind)) {
        commands.push({ kind, at: tile.at });
      }
    }
  }
  for (const city of view.cities) {
    if (
      city.ownerId !== view.viewer.id ||
      cityIsPubliclyBesieged(view, city) ||
      view.units.some((unit) => unit.hp > 0 && sameCoord(unit.at, city.at)) ||
      view.chocolateWalls.some((wall) => sameCoord(wall.at, city.at)) ||
      assignedUnitCountV6({ units: view.units }, city.id) >=
        cityUnitCapacityV6(city)
    ) {
      continue;
    }
    const tree = requireFactionTechnologyTreeV6(view.viewer.factionTreeId);
    for (const roleId of UNIT_ROLE_IDS) {
      const role = tree.roleRules[roleId];
      if (
        role.cost !== null &&
        role.cost <= view.viewer.coins &&
        (role.technology === null ||
          view.viewer.researchedTechs.includes(role.technology))
      ) {
        commands.push({ kind: "TRAIN", cityId: city.id, role: role.role });
      }
    }
  }
  const movementState = publicStateForMovement(view);
  for (const unit of view.units) {
    if (unit.ownerId !== view.viewer.id || unit.hp <= 0) continue;
    const role = effectiveRoleRuleV6(view.viewer.faction, unit.role);
    if (
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.healed &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed
    ) {
      for (const reachable of reachableMovementPathsV6(movementState, unit)) {
        commands.push({ kind: "MOVE", unitId: unit.id, path: reachable.path });
      }
    }
    if (
      role.abilities.includes("ATTACK") &&
      role.attack2 > 0 &&
      !unit.activation.attacked &&
      !unit.activation.healed &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed &&
      (!unit.activation.moved || role.mayUsePrimaryActionAfterMove)
    ) {
      for (const target of view.units) {
        if (
          target.hp > 0 &&
          target.ownerId !== view.viewer.id &&
          !arePlayersAlliedV6(view, view.viewer.id, target.ownerId) &&
          chebyshev(unit.at, target.at) <= role.range
        ) {
          commands.push({
            kind: "ATTACK",
            unitId: unit.id,
            target: { kind: "UNIT", unitId: target.id },
          });
        }
      }
      for (const wall of view.chocolateWalls) {
        if (chebyshev(unit.at, wall.at) <= role.range) {
          commands.push({
            kind: "ATTACK",
            unitId: unit.id,
            target: { kind: "CHOCOLATE_WALL", wallId: wall.id },
          });
        }
      }
    }
    if (
      role.abilities.includes("HEAL_ADJACENT") &&
      !unit.activation.attacked &&
      !unit.activation.healed &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed &&
      (!unit.activation.moved || role.mayUsePrimaryActionAfterMove)
    ) {
      for (const target of view.units) {
        if (
          target.id !== unit.id &&
          target.ownerId === view.viewer.id &&
          target.hp > 0 &&
          target.hp < target.maxHp &&
          chebyshev(unit.at, target.at) === 1
        ) {
          commands.push({
            kind: "HEAL_ADJACENT",
            unitId: unit.id,
            targetUnitId: target.id,
          });
        }
      }
    }
    if (
      role.abilities.includes("KAMIKAZE_ROLL") &&
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.healed &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed
    ) {
      for (const direction of CARDINAL_DIRECTION_ORDER_V6) {
        if (rollDirectionIsOnBoard(view, unit.at, direction)) {
          commands.push({
            kind: "KAMIKAZE_ROLL",
            unitId: unit.id,
            direction,
          });
        }
      }
    }
    if (
      role.abilities.includes("BUILD_CHOCOLATE_WALL") &&
      view.viewer.coins >= 1 &&
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.healed &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed
    ) {
      for (const tile of view.board.tiles) {
        if (
          tile.explored &&
          chebyshev(unit.at, tile.at) === 1 &&
          tile.site === null &&
          !view.treasureChests.some((chest) => sameCoord(chest, tile.at)) &&
          !publicTileIsAlliedTerritory(view, tile) &&
          !view.units.some(
            (candidate) => candidate.hp > 0 && sameCoord(candidate.at, tile.at),
          ) &&
          !view.chocolateWalls.some((wall) => sameCoord(wall.at, tile.at))
        ) {
          commands.push({
            kind: "BUILD_CHOCOLATE_WALL",
            unitId: unit.id,
            at: tile.at,
          });
        }
      }
    }
    if (
      role.abilities.includes("CANDIFY") &&
      !unit.activation.attacked &&
      !unit.activation.healed &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed &&
      publicCandifyCandidatesV6(view, unit).length > 0
    ) {
      commands.push({ kind: "CANDIFY", unitId: unit.id });
    }
    if (
      unit.hp < unit.maxHp &&
      !unit.activation.moved &&
      !unit.activation.attacked &&
      !unit.activation.healed &&
      !unit.activation.recovered &&
      !unit.activation.captured &&
      !unit.activation.specialActed
    ) {
      commands.push({ kind: "RECOVER", unitId: unit.id });
    }
    if (publicCaptureIsLegal(view, unit.id)) {
      commands.push({ kind: "CAPTURE", unitId: unit.id });
    }
    if (!unit.veteran && unit.kills >= 3) {
      commands.push({ kind: "PROMOTE", unitId: unit.id });
    }
    if (!unit.activation.handled) {
      commands.push({ kind: "WAIT", unitId: unit.id });
    }
  }
  commands.push({ kind: "END_TURN" });
  return cachePublicCommands(view, commands.sort(compareCommandsV6));
}

function cachePublicCommands(
  view: PlayerViewV6,
  commands: readonly CommandV6[],
): readonly CommandV6[] {
  const frozen = Object.freeze(commands);
  PUBLIC_COMMANDS.set(view, frozen);
  return frozen;
}

/** Fog-safe combat preview for an exact currently offered attack. */
export function queryCombatPreviewV6(
  view: PlayerViewV6,
  attackerId: UnitId,
  target: CombatTargetRefV6,
): CombatPreviewV6 | null {
  const offered = queryPlayerCommandsV6(view).some(
    (command) =>
      command.kind === "ATTACK" &&
      command.unitId === attackerId &&
      sameCombatTarget(command.target, target),
  );
  if (!offered) return null;
  return calculateCombatPreviewV6(
    publicStateForMovement(view),
    attackerId,
    target,
  );
}

/**
 * Observation-safe estimator for a fully visible hypothetical combat pair.
 * Unlike `queryCombatPreviewV6`, this is not restricted to the active viewer's
 * currently offered Attack and is used for public threat/safety scoring.
 */
export function estimatePublicCombatV6(
  view: PlayerViewV6,
  attackerId: UnitId,
  target: CombatTargetRefV6,
): CombatPreviewV6 | null {
  const attacker = view.units.find(
    (unit) => unit.id === attackerId && unit.hp > 0,
  );
  const targetAt =
    target.kind === "UNIT"
      ? view.units.find((unit) => unit.id === target.unitId && unit.hp > 0)?.at
      : view.chocolateWalls.find(
          (wall) => wall.id === target.wallId && wall.hp > 0,
        )?.at;
  if (attacker === undefined || targetAt === undefined) return null;
  const rule = queryPublicRoleRuleV6(view, attacker.ownerId, attacker.role);
  if (
    rule === null ||
    !rule.abilities.includes("ATTACK") ||
    rule.attack2 <= 0 ||
    chebyshev(attacker.at, targetAt) > rule.range
  ) {
    return null;
  }
  return calculateCombatPreviewV6(
    publicStateForMovement(view),
    attackerId,
    target,
  );
}

export interface HealPreviewV6 {
  readonly medicId: UnitId;
  readonly targetUnitId: UnitId;
  readonly amount: number;
  readonly hpAfter: number;
}

export function queryHealPreviewV6(
  view: PlayerViewV6,
  medicId: UnitId,
  targetUnitId: UnitId,
): HealPreviewV6 | null {
  const offered = queryPlayerCommandsV6(view).some(
    (command) =>
      command.kind === "HEAL_ADJACENT" &&
      command.unitId === medicId &&
      command.targetUnitId === targetUnitId,
  );
  if (!offered) return null;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return null;
  const intended = view.viewer.researchedTechs.includes("RECOVERY") ? 6 : 4;
  const amount = Math.min(intended, target.maxHp - target.hp);
  return { medicId, targetUnitId, amount, hpAfter: target.hp + amount };
}

function publicRewardCandidateMayBeLegal(
  view: PlayerViewV6,
  city: CityStateV6,
  reward: RewardIdV6,
): boolean {
  if (reward !== "MILITIA" && reward !== "JUGGERNAUT") return true;
  const occupied = (at: CoordV6): boolean =>
    view.units.some((unit) => unit.hp > 0 && sameCoord(unit.at, at)) ||
    view.chocolateWalls.some((wall) => sameCoord(wall.at, at));
  for (const tile of view.board.tiles) {
    const inFootprint =
      Math.max(
        Math.abs(tile.at.x - city.at.x),
        Math.abs(tile.at.y - city.at.y),
      ) <= (city.expanded ? 2 : 1);
    if (!tile.explored) {
      if (inFootprint) return true;
      continue;
    }
    if (
      tile.territoryCityId === city.id &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("SURVEYING")) &&
      !occupied(tile.at)
    ) {
      return true;
    }
  }
  return false;
}

export function previewEconomicV6(
  view: PlayerViewV6,
  command: CommandV6,
): EconomicPreviewResultV6 {
  let cachedForView = PUBLIC_ECONOMIC_PREVIEWS.get(view);
  if (cachedForView === undefined) {
    cachedForView = new Map();
    PUBLIC_ECONOMIC_PREVIEWS.set(view, cachedForView);
  }
  const key = JSON.stringify(command);
  const cached = cachedForView.get(key);
  if (cached !== undefined) return cached;
  const result = calculateEconomicPreviewV6(view, command);
  cachedForView.set(key, result);
  return result;
}

function calculateEconomicPreviewV6(
  view: PlayerViewV6,
  command: CommandV6,
): EconomicPreviewResultV6 {
  if (
    !("at" in command) ||
    (!BASIC_KINDS.includes(command.kind as BasicEconomicCommandKindV6) &&
      !SPATIAL_KINDS.includes(command.kind as SpatialEconomicCommandKindV6) &&
      command.kind !== "CLEAR_FOREST" &&
      command.kind !== "REPLANT_FOREST" &&
      command.kind !== "BUILD_ROAD" &&
      command.kind !== "REDEVELOP")
  ) {
    return { ok: false, error: "NOT_OFFERED" };
  }
  const offered = queryPlayerCommandsV6(view).some(
    (candidate) =>
      candidate.kind === command.kind &&
      "at" in candidate &&
      sameCoord(candidate.at, command.at),
  );
  if (!offered) return { ok: false, error: "NOT_OFFERED" };
  const tile = view.board.tiles[command.at.y * view.board.width + command.at.x];
  if (tile === undefined || !tile.explored || tile.territoryCityId === null) {
    return { ok: false, error: "NOT_OFFERED" };
  }
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined) return { ok: false, error: "NOT_OFFERED" };

  const beforeGraph = publicGraph(view);
  const basic =
    BASIC_ECONOMIC_ACTIONS_V6[command.kind as BasicEconomicCommandKindV6];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V6[command.kind as SpatialEconomicCommandKindV6];
  const improvement = basic?.improvement ?? spatial?.improvement ?? null;
  const cost =
    basic?.cost ??
    spatial?.cost ??
    (command.kind === "BUILD_ROAD"
      ? 2
      : command.kind === "REPLANT_FOREST"
        ? 4
        : 0);
  if (cost === undefined) return { ok: false, error: "NOT_OFFERED" };
  const afterGraph = replaceGraphTile(beforeGraph, command.at, {
    resource:
      basic !== undefined ||
      command.kind === "CLEAR_FOREST" ||
      command.kind === "REPLANT_FOREST"
        ? null
        : tile.resource === "UNKNOWN_RESOURCE"
          ? null
          : tile.resource,
    improvement:
      command.kind === "REDEVELOP" ? null : (improvement ?? tile.improvement),
    terrain:
      command.kind === "CLEAR_FOREST"
        ? "GRASS"
        : command.kind === "REPLANT_FOREST"
          ? "FOREST"
          : tile.terrain,
    road: command.kind === "BUILD_ROAD" ? true : tile.road,
  });
  const evaluation =
    improvement === null
      ? null
      : spatialContributionAtV6(afterGraph, command.at, improvement);

  const populationDeltaByCity: CityValueDeltaV6[] = [];
  const coinIncomeDeltaByCity: CityValueDeltaV6[] = [];
  const levelsReached: number[] = [];
  for (const candidate of view.cities
    .filter((value) => value.ownerId === view.viewer.id)
    .sort((left, right) => left.id - right.id)) {
    const permanentDelta =
      candidate.id === city.id && basic?.populationCategory === "PERMANENT"
        ? basic.population
        : 0;
    const liveDelta =
      liveTotalForCity(afterGraph, candidate.id) -
      liveTotalForCity(beforeGraph, candidate.id);
    const delta = permanentDelta + liveDelta;
    const growth = resolveCityGrowthV6(
      candidate,
      candidate.permanentPopulation + permanentDelta,
      candidate.economicPopulation + liveDelta,
    );
    const marketBefore = marketForCity(beforeGraph, candidate.id);
    const marketAfter = marketForCity(afterGraph, candidate.id);
    const incomeBefore = publicIncome(candidate, marketBefore);
    const incomeAfter = publicIncome(growth.city, marketAfter);
    if (delta !== 0)
      populationDeltaByCity.push({ cityId: candidate.id, delta });
    if (incomeBefore !== incomeAfter) {
      coinIncomeDeltaByCity.push({
        cityId: candidate.id,
        delta: incomeAfter - incomeBefore,
      });
    }
    levelsReached.push(...growth.reachedLevels);
  }

  return {
    ok: true,
    preview: {
      at: command.at,
      cost,
      ownerCityId: city.id,
      populationDeltaByCity,
      coinIncomeDeltaByCity,
      resultingContribution: evaluation?.population ?? basic?.population ?? 0,
      levelsReached,
      distinctTypes:
        evaluation?.distinctTypes ??
        (improvement === null ? [] : [improvement]),
      distinctFamilies: evaluation?.distinctFamilies ?? [],
      contributingTiles:
        evaluation?.contributingTiles ??
        (basic === undefined ? [] : [command.at]),
      oppositePairAxes: evaluation?.oppositePairAxes ?? [],
      capitalRoadConnected:
        evaluation?.capitalRoadConnected ??
        (command.kind === "BUILD_ROAD"
          ? isCapitalConnectedRoadV6(afterGraph, command.at, view.viewer.id)
          : false),
      buildingLimitReached: false,
      complete: true,
    },
  };
}

/**
 * Pure one-step public spatial reservation score used by Normal. It applies
 * only a candidate's deterministic, already-public tile mutation, then scores
 * the strongest exact next placement for each owned city while ignoring only
 * Coin and technology gates. Unknown resources are never invented.
 */
export function scorePublicSpatialPlanV6(
  view: PlayerViewV6,
  candidate: CommandV6,
): number {
  let cachedForView = PUBLIC_SPATIAL_SCORES.get(view);
  if (cachedForView === undefined) {
    cachedForView = new Map();
    PUBLIC_SPATIAL_SCORES.set(view, cachedForView);
  }
  const key = JSON.stringify(candidate);
  const cached = cachedForView.get(key);
  if (cached !== undefined) return cached;
  const before = publicGraph(view);
  const after = graphAfterPublicCandidate(view, before, candidate);
  const result =
    after === null
      ? 0
      : bestPublicNextPlacementTotal(view, after) -
        publicSpatialBaseline(view, before);
  cachedForView.set(key, result);
  return result;
}

type PublicGraphV6 = ReturnType<typeof publicGraph>;

interface PublicPlacementV6 {
  readonly cityId: CityId;
  readonly at: CoordV6;
  readonly kind:
    | BasicEconomicCommandKindV6
    | SpatialEconomicCommandKindV6
    | "CLEAR_FOREST"
    | "REPLANT_FOREST"
    | "BUILD_ROAD";
}

export interface PublicEconomicPotentialV6 {
  readonly command: PublicPlacementV6["kind"];
  readonly targets: number;
  readonly bestSpatialScore: number;
}

/** Visible placement potential with only Coin/technology gates removed. */
export function queryPublicEconomicPotentialsV6(
  view: PlayerViewV6,
): readonly PublicEconomicPotentialV6[] {
  const cached = PUBLIC_ECONOMIC_POTENTIALS.get(view);
  if (cached !== undefined) return cached;
  const graph = publicGraph(view);
  const placements = enumeratePublicPlacementsIgnoringGates(view, graph);
  const kinds = [
    ...BASIC_KINDS,
    ...SPATIAL_KINDS,
    "CLEAR_FOREST",
    "REPLANT_FOREST",
    "BUILD_ROAD",
  ] as const;
  const result = kinds.map((command) => {
    const matching = placements.filter(
      (placement) => placement.kind === command,
    );
    return {
      command,
      targets: matching.length,
      bestSpatialScore: matching.reduce(
        (best, placement) =>
          Math.max(best, scorePublicPlacement(view, graph, placement)),
        0,
      ),
    };
  });
  PUBLIC_ECONOMIC_POTENTIALS.set(view, result);
  return result;
}

const PUBLIC_ECONOMIC_PREVIEWS = new WeakMap<
  PlayerViewV6,
  Map<string, EconomicPreviewResultV6>
>();
const PUBLIC_SPATIAL_SCORES = new WeakMap<PlayerViewV6, Map<string, number>>();
const PUBLIC_SPATIAL_BASELINES = new WeakMap<PlayerViewV6, number>();
const PUBLIC_ECONOMIC_POTENTIALS = new WeakMap<
  PlayerViewV6,
  readonly PublicEconomicPotentialV6[]
>();
const PUBLIC_GRAPH_TOTALS = new WeakMap<
  object,
  Map<
    PlayerId,
    { readonly population: number; readonly recurringCoins: number }
  >
>();
const PUBLIC_GRAPH_HAS_GRAND_WORKS_SITE = new WeakMap<
  object,
  Map<PlayerId, boolean>
>();

function publicSpatialBaseline(
  view: PlayerViewV6,
  graph: PublicGraphV6,
): number {
  const cached = PUBLIC_SPATIAL_BASELINES.get(view);
  if (cached !== undefined) return cached;
  const score = bestPublicNextPlacementTotal(view, graph);
  PUBLIC_SPATIAL_BASELINES.set(view, score);
  return score;
}

function graphAfterPublicCandidate(
  view: PlayerViewV6,
  graph: PublicGraphV6,
  candidate: CommandV6,
): PublicGraphV6 | null {
  if (
    candidate.kind === "CHOOSE_CITY_REWARD" &&
    candidate.reward === "EXPAND"
  ) {
    const city = view.cities.find(
      (value) =>
        value.id === candidate.cityId && value.ownerId === view.viewer.id,
    );
    if (city === undefined) return null;
    return {
      cities: graph.cities.map((value) =>
        value.id === city.id ? { ...value, expanded: true } : value,
      ),
      board: {
        ...graph.board,
        tiles: graph.board.tiles.map((tile) =>
          tile.territoryCityId === null && chebyshev(tile.at, city.at) <= 2
            ? { ...tile, territoryCityId: city.id }
            : tile,
        ),
      },
    };
  }
  if (!("at" in candidate)) return null;
  const tile = graph.board.tiles.find((value) =>
    sameCoord(value.at, candidate.at),
  );
  if (tile === undefined) return null;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V6[candidate.kind as BasicEconomicCommandKindV6];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V6[candidate.kind as SpatialEconomicCommandKindV6];
  if (basic !== undefined) {
    return replaceGraphTile(graph, candidate.at, {
      resource: null,
      improvement: basic.improvement,
    });
  }
  if (spatial !== undefined) {
    return replaceGraphTile(graph, candidate.at, {
      improvement: spatial.improvement,
    });
  }
  if (candidate.kind === "CLEAR_FOREST") {
    return replaceGraphTile(graph, candidate.at, {
      terrain: "GRASS",
      resource: null,
    });
  }
  if (candidate.kind === "REPLANT_FOREST") {
    return replaceGraphTile(graph, candidate.at, {
      terrain: "FOREST",
      resource: null,
    });
  }
  if (candidate.kind === "BUILD_ROAD") {
    return replaceGraphTile(graph, candidate.at, { road: true });
  }
  if (candidate.kind === "REDEVELOP") {
    return replaceGraphTile(graph, candidate.at, { improvement: null });
  }
  return null;
}

function bestPublicNextPlacementTotal(
  view: PlayerViewV6,
  graph: PublicGraphV6,
): number {
  const placements = enumeratePublicPlacementsIgnoringGates(view, graph);
  let total = 0;
  const reservedTargets = new Set<string>();
  for (const city of graph.cities
    .filter((value) => value.ownerId === view.viewer.id)
    .sort((left, right) => left.id - right.id)) {
    const best = placements
      .filter(
        (placement) =>
          placement.cityId === city.id &&
          !reservedTargets.has(coordKey(placement.at)),
      )
      .map((placement) => ({
        placement,
        score: scorePublicPlacement(view, graph, placement),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          placementKindOrdinal(left.placement.kind) -
            placementKindOrdinal(right.placement.kind) ||
          compareCoordsForQuery(left.placement.at, right.placement.at),
      )[0];
    if (best !== undefined && best.score > 0) {
      total += best.score;
      reservedTargets.add(coordKey(best.placement.at));
    }
  }
  return total;
}

function enumeratePublicPlacementsIgnoringGates(
  view: PlayerViewV6,
  graph: PublicGraphV6,
): readonly PublicPlacementV6[] {
  const placements: PublicPlacementV6[] = [];
  for (const publicTile of view.board.tiles) {
    if (
      !publicTile.explored ||
      publicTile.territoryOwnerId !== view.viewer.id
    ) {
      continue;
    }
    const tile = graph.board.tiles.find((value) =>
      sameCoord(value.at, publicTile.at),
    );
    if (tile === undefined || tile.territoryCityId === null) continue;
    for (const kind of BASIC_KINDS) {
      const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
      if (
        tile.site === null &&
        tile.terrain === rule.terrain &&
        tile.resource === rule.resource &&
        tile.improvement === null
      ) {
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
      }
    }
    for (const kind of SPATIAL_KINDS) {
      const rule = SPATIAL_ECONOMIC_ACTIONS_V6[kind];
      if (
        tile.site !== null ||
        tile.resource !== null ||
        tile.improvement !== null ||
        graph.board.tiles.some(
          (value) =>
            value.territoryCityId === tile.territoryCityId &&
            value.improvement === rule.improvement,
        )
      ) {
        continue;
      }
      const placed = replaceGraphTile(graph, tile.at, {
        improvement: rule.improvement,
      });
      if (
        spatialContributionAtV6(placed, tile.at, rule.improvement)
          .placementCount >= rule.placementMinimum
      ) {
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
      }
    }
    if (
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      tile.terrain === "FOREST"
    ) {
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "CLEAR_FOREST",
      });
    }
    if (
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      tile.terrain === "GRASS"
    ) {
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "REPLANT_FOREST",
      });
    }
    if (tile.site === null && !tile.road) {
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "BUILD_ROAD",
      });
    }
  }
  return placements;
}

function scorePublicPlacement(
  view: PlayerViewV6,
  graph: PublicGraphV6,
  placement: PublicPlacementV6,
): number {
  const tile = graph.board.tiles.find((value) =>
    sameCoord(value.at, placement.at),
  );
  if (tile === undefined) return 0;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V6[placement.kind as BasicEconomicCommandKindV6];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V6[placement.kind as SpatialEconomicCommandKindV6];
  let after = graph;
  if (basic !== undefined) {
    after = replaceGraphTile(graph, placement.at, {
      resource: null,
      improvement: basic.improvement,
    });
  } else if (spatial !== undefined) {
    after = replaceGraphTile(graph, placement.at, {
      improvement: spatial.improvement,
    });
  } else if (placement.kind === "CLEAR_FOREST") {
    after = replaceGraphTile(graph, placement.at, { terrain: "GRASS" });
  } else if (placement.kind === "REPLANT_FOREST") {
    after = replaceGraphTile(graph, placement.at, { terrain: "FOREST" });
  } else if (placement.kind === "BUILD_ROAD") {
    after = replaceGraphTile(graph, placement.at, { road: true });
  }
  const permanentPopulation =
    basic?.populationCategory === "PERMANENT" ? basic.population : 0;
  const beforeTotals = publicGraphTotals(graph, view.viewer.id);
  const afterTotals = publicGraphTotals(after, view.viewer.id);
  const populationDelta =
    permanentPopulation + afterTotals.population - beforeTotals.population;
  const recurringCoinDelta =
    afterTotals.recurringCoins - beforeTotals.recurringCoins;
  const improvement = basic?.improvement ?? spatial?.improvement ?? null;
  const evaluation =
    improvement === null
      ? null
      : spatialContributionAtV6(after, placement.at, improvement);
  const createsGrandWorks =
    isProcessorImprovement(improvement) &&
    !hasLegalGrandWorksSite(graph, view.viewer.id) &&
    createsGrandWorksSiteNear(after, view.viewer.id, placement.at);
  const completesMarketRoad =
    placement.kind === "BUILD_ROAD" && recurringCoinDelta > 0;
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
    (createsGrandWorks ? 6 : 0) +
    (completesMarketRoad ? 4 : 0)
  );
}

function publicGraphTotals(
  graph: PublicGraphV6,
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
  for (const tile of graph.board.tiles) {
    if (
      tile.improvement !== null &&
      tile.territoryCityId !== null &&
      ownedCityIds.has(tile.territoryCityId)
    ) {
      population += spatialContributionAtV6(
        graph,
        tile.at,
        tile.improvement,
      ).population;
    }
  }
  const recurringCoins = graph.cities
    .filter((city) => city.ownerId === ownerId)
    .reduce((total, city) => total + marketForCity(graph, city.id), 0);
  const totals = { population, recurringCoins };
  byOwner.set(ownerId, totals);
  return totals;
}

function isProcessorImprovement(
  improvement: EconomicImprovementId | null,
): improvement is "WINDMILL" | "SAWMILL" | "FORGE" | "STONEWORKS" {
  return (
    improvement === "WINDMILL" ||
    improvement === "SAWMILL" ||
    improvement === "FORGE" ||
    improvement === "STONEWORKS"
  );
}

function createsGrandWorksSiteNear(
  graph: PublicGraphV6,
  ownerId: PlayerId,
  placedAt: CoordV6,
): boolean {
  return graph.board.tiles.some((tile) => {
    if (chebyshev(tile.at, placedAt) !== 1) return false;
    return isLegalGrandWorksSite(graph, ownerId, tile);
  });
}

function hasLegalGrandWorksSite(
  graph: PublicGraphV6,
  ownerId: PlayerId,
): boolean {
  let byOwner = PUBLIC_GRAPH_HAS_GRAND_WORKS_SITE.get(graph);
  if (byOwner === undefined) {
    byOwner = new Map();
    PUBLIC_GRAPH_HAS_GRAND_WORKS_SITE.set(graph, byOwner);
  }
  const cached = byOwner.get(ownerId);
  if (cached !== undefined) return cached;
  const present = graph.board.tiles.some((tile) =>
    isLegalGrandWorksSite(graph, ownerId, tile),
  );
  byOwner.set(ownerId, present);
  return present;
}

function isLegalGrandWorksSite(
  graph: PublicGraphV6,
  ownerId: PlayerId,
  tile: TileStateV6,
): boolean {
  if (
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null ||
    tile.territoryCityId === null ||
    graph.cities.find((city) => city.id === tile.territoryCityId)?.ownerId !==
      ownerId
  ) {
    return false;
  }
  const placed = replaceGraphTile(graph, tile.at, {
    improvement: "GRAND_WORKS",
  });
  return (
    spatialContributionAtV6(placed, tile.at, "GRAND_WORKS").placementCount >= 3
  );
}

function placementKindOrdinal(kind: PublicPlacementV6["kind"]): number {
  return [
    ...BASIC_KINDS,
    ...SPATIAL_KINDS,
    "CLEAR_FOREST",
    "REPLANT_FOREST",
    "BUILD_ROAD",
  ].indexOf(kind);
}

function compareCoordsForQuery(left: CoordV6, right: CoordV6): number {
  return left.y - right.y || left.x - right.x;
}

function publicInfrastructureActionIsLegal(
  view: PlayerViewV6,
  tile: Extract<PlayerTileViewV6, { readonly explored: true }>,
  kind: "CLEAR_FOREST" | "REPLANT_FOREST" | "BUILD_ROAD" | "REDEVELOP",
): boolean {
  const technology =
    kind === "CLEAR_FOREST"
      ? "FORESTRY"
      : kind === "REPLANT_FOREST"
        ? "FIELDCRAFT"
        : kind === "BUILD_ROAD"
          ? "ROADS"
          : "GRAND_WORKS";
  const cost = kind === "BUILD_ROAD" ? 2 : kind === "REPLANT_FOREST" ? 4 : 0;
  if (
    !view.viewer.researchedTechs.includes(technology) ||
    view.viewer.coins < cost ||
    tile.territoryOwnerId !== view.viewer.id ||
    tile.territoryCityId === null ||
    !publicCityAllowsBuild(view, tile.territoryCityId)
  ) {
    return false;
  }
  if (kind === "BUILD_ROAD") return tile.site === null && !tile.road;
  if (kind === "REDEVELOP") return tile.improvement !== null;
  return (
    tile.site === null &&
    tile.resource === null &&
    tile.improvement === null &&
    tile.terrain === (kind === "CLEAR_FOREST" ? "FOREST" : "GRASS")
  );
}

function publicBasicActionIsLegal(
  view: PlayerViewV6,
  tile: Extract<PlayerTileViewV6, { readonly explored: true }>,
  kind: BasicEconomicCommandKindV6,
): boolean {
  const rule = BASIC_ECONOMIC_ACTIONS_V6[kind];
  if (
    !view.viewer.researchedTechs.includes(rule.technology) ||
    view.viewer.coins < rule.cost ||
    tile.territoryOwnerId !== view.viewer.id ||
    tile.territoryCityId === null ||
    tile.site !== null ||
    tile.terrain !== rule.terrain ||
    tile.resource !== rule.resource ||
    tile.improvement !== null
  ) {
    return false;
  }
  return publicCityAllowsBuild(view, tile.territoryCityId);
}

function publicSpatialActionIsLegal(
  view: PlayerViewV6,
  tile: Extract<PlayerTileViewV6, { readonly explored: true }>,
  kind: SpatialEconomicCommandKindV6,
): boolean {
  const rule = SPATIAL_ECONOMIC_ACTIONS_V6[kind];
  if (
    !view.viewer.researchedTechs.includes(rule.technology) ||
    view.viewer.coins < rule.cost ||
    tile.territoryOwnerId !== view.viewer.id ||
    tile.territoryCityId === null ||
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null ||
    !publicCityAllowsBuild(view, tile.territoryCityId) ||
    view.board.tiles.some(
      (candidate) =>
        candidate.explored &&
        candidate.territoryCityId === tile.territoryCityId &&
        candidate.improvement === rule.improvement,
    )
  ) {
    return false;
  }
  const graph = replaceGraphTile(publicGraph(view), tile.at, {
    improvement: rule.improvement,
  });
  return (
    spatialContributionAtV6(graph, tile.at, rule.improvement).placementCount >=
    rule.placementMinimum
  );
}

function publicCityAllowsBuild(view: PlayerViewV6, cityId: CityId): boolean {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  return (
    city !== undefined &&
    !cityIsPubliclyBesieged(view, city) &&
    !view.pendingChoices.some(
      (choice) => choice.kind === "CITY_REWARD" && choice.cityId === city.id,
    )
  );
}

function publicCaptureIsLegal(view: PlayerViewV6, unitId: number): boolean {
  const unit = view.units.find(
    (candidate) =>
      candidate.id === unitId && candidate.ownerId === view.viewer.id,
  );
  if (unit === undefined || unit.hp <= 0) return false;
  const rule = effectiveRoleRuleV6(view.viewer.faction, unit.role);
  if (
    !rule.abilities.includes("CAPTURE") ||
    !unit.captureEligible ||
    unit.activation.moved ||
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed ||
    view.units.some(
      (candidate) =>
        candidate.id !== unit.id && sameCoord(candidate.at, unit.at),
    )
  ) {
    return false;
  }
  const city = view.cities.find((candidate) =>
    sameCoord(candidate.at, unit.at),
  );
  if (city !== undefined) {
    return (
      city.ownerId !== view.viewer.id &&
      !arePlayersAlliedV6(view, view.viewer.id, city.ownerId)
    );
  }
  const tile = view.board.tiles[unit.at.y * view.board.width + unit.at.x];
  return tile?.explored === true && tile.site === "VILLAGE";
}

function publicCandifyCandidatesV6(
  view: PlayerViewV6,
  unit: PlayerViewV6["units"][number],
): readonly CityStateV6[] {
  const tile = view.board.tiles[unit.at.y * view.board.width + unit.at.x];
  if (
    tile?.explored !== true ||
    tile.site !== null ||
    tile.territoryOwnerId === view.viewer.id ||
    publicTileIsAlliedTerritory(view, tile)
  ) {
    return [];
  }
  if (tile.territoryOwnerId !== null) {
    if (tile.territoryCityId === null) return [];
    const controller = view.cities.find(
      (city) => city.id === tile.territoryCityId,
    );
    if (
      controller === undefined ||
      !controllerFootprintIsFullyExplored(view, controller) ||
      !territoryTilesAreConnectedV6(
        controller,
        view.board.tiles.filter(
          (candidate) =>
            candidate.explored &&
            candidate.territoryCityId === controller.id &&
            !sameCoord(candidate.at, unit.at),
        ),
      )
    ) {
      return [];
    }
  }
  const viable = view.cities
    .filter(
      (city) =>
        city.ownerId === view.viewer.id &&
        cityFootprintContainsV6(city, unit.at) &&
        !candifyWouldDuplicateSpecializedImprovementV6(
          view.board.tiles,
          city.id,
          tile.improvement,
        ) &&
        view.board.tiles.some(
          (candidate) =>
            candidate.explored &&
            candidate.territoryCityId === city.id &&
            chebyshev(candidate.at, unit.at) === 1,
        ),
    )
    .map((city) => ({ city, distance: chebyshev(city.at, unit.at) }));
  const minimum = viable.reduce(
    (best, candidate) => Math.min(best, candidate.distance),
    Number.POSITIVE_INFINITY,
  );
  return viable
    .filter((candidate) => candidate.distance === minimum)
    .map((candidate) => candidate.city)
    .sort((left, right) => left.id - right.id);
}

function controllerFootprintIsFullyExplored(
  view: PlayerViewV6,
  city: CityStateV6,
): boolean {
  for (
    let y = Math.max(0, city.at.y - (city.expanded ? 2 : 1));
    y <= Math.min(view.board.height - 1, city.at.y + (city.expanded ? 2 : 1));
    y += 1
  ) {
    for (
      let x = Math.max(0, city.at.x - (city.expanded ? 2 : 1));
      x <= Math.min(view.board.width - 1, city.at.x + (city.expanded ? 2 : 1));
      x += 1
    ) {
      if (view.board.tiles[y * view.board.width + x]?.explored !== true) {
        return false;
      }
    }
  }
  return true;
}

function publicTileIsAlliedTerritory(
  view: PlayerViewV6,
  tile: Extract<PlayerTileViewV6, { readonly explored: true }>,
): boolean {
  return (
    tile.territoryOwnerId !== null &&
    arePlayersAlliedV6(view, view.viewer.id, tile.territoryOwnerId)
  );
}

function rollDirectionIsOnBoard(
  view: PlayerViewV6,
  at: CoordV6,
  direction: (typeof CARDINAL_DIRECTION_ORDER_V6)[number],
): boolean {
  return (
    (direction !== "NORTH" || at.y > 0) &&
    (direction !== "EAST" || at.x < view.board.width - 1) &&
    (direction !== "SOUTH" || at.y < view.board.height - 1) &&
    (direction !== "WEST" || at.x > 0)
  );
}

function cityIsPubliclyBesieged(
  view: PlayerViewV6,
  city: CityStateV6,
): boolean {
  return view.units.some(
    (unit) =>
      unit.hp > 0 &&
      sameCoord(unit.at, city.at) &&
      unit.ownerId !== city.ownerId &&
      !arePlayersAlliedV6(view, unit.ownerId, city.ownerId),
  );
}

const PUBLIC_GRAPHS = new WeakMap<
  PlayerViewV6,
  { readonly board: BoardStateV6; readonly cities: readonly CityStateV6[] }
>();

function publicGraph(view: PlayerViewV6): {
  readonly board: BoardStateV6;
  readonly cities: readonly CityStateV6[];
} {
  const cached = PUBLIC_GRAPHS.get(view);
  if (cached !== undefined) return cached;
  const tiles: TileStateV6[] = view.board.tiles.map((tile) =>
    tile.explored
      ? {
          at: tile.at,
          terrain: tile.terrain,
          resource: tile.resource === "UNKNOWN_RESOURCE" ? null : tile.resource,
          improvement: tile.improvement,
          road: tile.road,
          site: tile.site,
          territoryCityId: tile.territoryCityId,
          // Movement needs the already-public owner even when its city is hidden.
          territoryOwnerId: tile.territoryOwnerId,
        }
      : {
          at: tile.at,
          terrain: "GRASS",
          resource: null,
          improvement: null,
          road: false,
          site: null,
          territoryCityId: null,
        },
  );
  const graph = {
    board: { width: view.board.width, height: view.board.height, tiles },
    cities: view.cities,
  };
  PUBLIC_GRAPHS.set(view, graph);
  return graph;
}

function publicStateForMovement(view: PlayerViewV6): GameStateV6 {
  const graph = publicGraph(view);
  return {
    schemaVersion: 6,
    rulesetId: view.rulesetId,
    setup: view.setup,
    random: { algorithm: "MULBERRY32", version: 1, state: 0 },
    humanPlayerId: view.humanPlayerId,
    nextEntityId: 1,
    commandIndex: view.commandIndex,
    round: view.round,
    activeSeatIndex: view.activeSeatIndex,
    turnOrder: view.turnOrder,
    board: graph.board,
    players: view.players.map((player) =>
      player.id === view.viewer.id ? view.viewer : { ...player, explored: [] },
    ),
    cities: view.cities,
    populationContributions: view.populationContributions,
    units: view.units,
    chocolateWalls: view.chocolateWalls,
    treasureChests: view.treasureChests,
    pendingChoices: view.pendingChoices,
    outcome: view.outcome,
  };
}

function replaceGraphTile(
  graph: {
    readonly board: BoardStateV6;
    readonly cities: readonly CityStateV6[];
  },
  at: CoordV6,
  replacement: Partial<TileStateV6>,
): { readonly board: BoardStateV6; readonly cities: readonly CityStateV6[] } {
  return {
    ...graph,
    board: {
      ...graph.board,
      tiles: graph.board.tiles.map((tile) =>
        sameCoord(tile.at, at)
          ? { ...tile, ...replacement, at: tile.at }
          : tile,
      ),
    },
  };
}

function liveTotalForCity(
  graph: {
    readonly board: BoardStateV6;
    readonly cities: readonly CityStateV6[];
  },
  cityId: CityId,
): number {
  return graph.board.tiles
    .filter(
      (tile) => tile.territoryCityId === cityId && tile.improvement !== null,
    )
    .reduce(
      (total, tile) =>
        total +
        spatialContributionAtV6(
          graph,
          tile.at,
          tile.improvement as EconomicImprovementId,
        ).population,
      0,
    );
}

function marketForCity(
  graph: {
    readonly board: BoardStateV6;
    readonly cities: readonly CityStateV6[];
  },
  cityId: CityId,
): number {
  return graph.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === cityId && tile.improvement === "MARKET",
    )
    .reduce(
      (total, tile) =>
        total + spatialContributionAtV6(graph, tile.at, "MARKET").marketIncome,
      0,
    );
}

function publicIncome(city: CityStateV6, market: number): number {
  return Math.max(
    0,
    city.level +
      (city.isCapital ? 1 : 0) +
      market +
      Math.min(0, city.population),
  );
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function coordKey(at: CoordV6): string {
  return `${at.y},${at.x}`;
}

function chebyshev(left: CoordV6, right: CoordV6): number {
  return Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
}

function sameCombatTarget(
  left: CombatTargetRefV6,
  right: CombatTargetRefV6,
): boolean {
  return left.kind === "UNIT" && right.kind === "UNIT"
    ? left.unitId === right.unitId
    : left.kind === "CHOCOLATE_WALL" && right.kind === "CHOCOLATE_WALL"
      ? left.wallId === right.wallId
      : false;
}
