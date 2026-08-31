import type { CityId, UnitId } from "../model/ids";
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
import { cityFootprintContainsV6, territoryTilesAreConnectedV6 } from "./candy";
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

const BASIC_KINDS = Object.keys(
  BASIC_ECONOMIC_ACTIONS_V6,
) as BasicEconomicCommandKindV6[];
const SPATIAL_KINDS = Object.keys(
  SPATIAL_ECONOMIC_ACTIONS_V6,
) as SpatialEconomicCommandKindV6[];

/** Pure observation-safe enumeration for the implemented v6 economy slice. */
export function queryPlayerCommandsV6(
  view: PlayerViewV6,
): readonly CommandV6[] {
  const activeId = view.turnOrder[view.activeSeatIndex];
  if (
    view.outcome !== null ||
    view.viewer.status !== "ACTIVE" ||
    activeId !== view.viewer.id
  ) {
    return [];
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
      return unit === undefined
        ? []
        : pending.candidateCityIds
            .filter((cityId) =>
              view.cities.some(
                (city) => city.id === cityId && city.ownerId === view.viewer.id,
              ),
            )
            .map((cityId): CommandV6 => ({
              kind: "CHOOSE_CANDIFY_CITY",
              unitId: unit.id,
              cityId,
            }))
            .sort(compareCommandsV6);
    }
    const city = view.cities.find(
      (candidate) =>
        candidate.id === pending.cityId && candidate.ownerId === view.viewer.id,
    );
    return city === undefined
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
          .sort(compareCommandsV6);
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
  return commands.sort(compareCommandsV6);
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

function publicGraph(view: PlayerViewV6): {
  readonly board: BoardStateV6;
  readonly cities: readonly CityStateV6[];
} {
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
  return {
    board: { width: view.board.width, height: view.board.height, tiles },
    cities: view.cities,
  };
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
