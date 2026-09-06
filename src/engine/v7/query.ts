import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  ORIGINAL_BASELINE_V2_TREE,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  TECHNOLOGY_BRANCH_IDS_V7,
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
  technologyResearchCostV7,
  type EffectiveRoleRuleV7,
  type TechnologyBranchIdV7,
  type TechnologyCapabilitiesV7,
  type TechnologyUnlockV7,
} from "../rules/ruleset-v7";
import { compareCommandsV7, type CommandV7 } from "./commands";
import {
  assignedUnitCountV7,
  cityIncomeV7,
  cityUnitCapacityV7,
  reservedCapacityCountV7,
} from "./economy";
import { applyCommandV7 } from "./reducer";
import { calculateCombatPreviewV7 } from "./combat";
import type { CombatPreviewV7 } from "./events";
import { reachableMovementPathsV7 } from "./movement";
import {
  isCapitalConnectedRoadV7,
  spatialContributionAtV7,
  type EconomicFamilyV7,
  type OppositePairAxisV7,
} from "./spatial-economy";
import {
  UNIT_ROLE_IDS_V7,
  type CoordV7,
  type GameStateV7,
  type ImprovementIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { publicUnitStatsV7, type PublicUnitStatsV7 } from "./unit-stats";

export type PublicTechnologyStateV7 = "OWNED" | "AVAILABLE" | "BLOCKED";
export interface PublicTechnologyNodeV7 {
  readonly id: TechnologyIdV7;
  readonly branch: TechnologyBranchIdV7;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: readonly TechnologyIdV7[];
  readonly missingPrerequisites: readonly TechnologyIdV7[];
  readonly state: PublicTechnologyStateV7;
  readonly cost: number;
  readonly affordable: boolean;
  readonly effects: readonly TechnologyUnlockV7[];
  readonly unlockedRoleRules: readonly EffectiveRoleRuleV7[];
}
export interface PublicTechnologyTreeV7 {
  readonly id: "ORIGINAL_BASELINE_V2";
  readonly faction: "ORIGINAL";
  readonly ownedCityCount: number;
  readonly branches: typeof TECHNOLOGY_BRANCH_IDS_V7;
  readonly nodes: readonly PublicTechnologyNodeV7[];
  readonly roleBindings: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
}

export function queryTechnologyTreeV7(
  state: GameStateV7,
  viewerId: PlayerId,
): PublicTechnologyTreeV7 {
  const player = requirePlayer(state, viewerId);
  const ownedCityCount = state.cities.filter(
    (city) => city.ownerId === viewerId,
  ).length;
  if (ownedCityCount < 1) throw new RangeError("Technology requires a city");
  const owned = new Set(player.researchedTechs);
  return {
    id: "ORIGINAL_BASELINE_V2",
    faction: "ORIGINAL",
    ownedCityCount,
    branches: TECHNOLOGY_BRANCH_IDS_V7,
    nodes: ORIGINAL_BASELINE_V2_TREE.nodes.map((node) => {
      const missingPrerequisites = node.prerequisites.filter(
        (tech) => !owned.has(tech),
      );
      const nodeState: PublicTechnologyStateV7 = owned.has(node.id)
        ? "OWNED"
        : missingPrerequisites.length === 0
          ? "AVAILABLE"
          : "BLOCKED";
      const cost = technologyResearchCostV7(node.tier, ownedCityCount);
      return {
        id: node.id,
        branch: node.branch,
        tier: node.tier,
        prerequisites: node.prerequisites,
        missingPrerequisites,
        state: nodeState,
        cost,
        affordable: nodeState === "AVAILABLE" && player.coins >= cost,
        effects: node.unlocks,
        unlockedRoleRules: node.unlockedRoles.map(effectiveRoleRuleV7),
      };
    }),
    roleBindings: ORIGINAL_BASELINE_V2_TREE.roleRules,
  };
}

export function queryTechnologyCapabilitiesV7(
  state: GameStateV7,
  viewerId: PlayerId,
): TechnologyCapabilitiesV7 {
  return technologyCapabilitiesV7(
    requirePlayer(state, viewerId).researchedTechs,
  );
}

const TILE_KINDS = [
  ...Object.keys(BASIC_ECONOMIC_ACTIONS_V7),
  ...Object.keys(SPATIAL_ECONOMIC_ACTIONS_V7),
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
] as const;
const COMMAND_CACHE = new WeakMap<
  GameStateV7,
  Map<PlayerId, readonly CommandV7[]>
>();

/** Authority-backed enumeration for the implemented v7 slice. */
export function queryPlayerCommandsV7(
  state: GameStateV7,
  viewerId: PlayerId,
): readonly CommandV7[] {
  let byPlayer = COMMAND_CACHE.get(state);
  if (byPlayer === undefined) {
    byPlayer = new Map();
    COMMAND_CACHE.set(state, byPlayer);
  }
  const cached = byPlayer.get(viewerId);
  if (cached !== undefined) return cached;
  const player = requirePlayer(state, viewerId);
  if (
    state.outcome !== null ||
    player.status !== "ACTIVE" ||
    state.turnOrder[state.activeSeatIndex] !== viewerId
  )
    return store(byPlayer, viewerId, []);
  const head = state.pendingChoices[0];
  if (head !== undefined) {
    const choices = head.candidates.map((reward): CommandV7 => ({
      kind: "CHOOSE_CITY_REWARD",
      cityId: head.cityId,
      reachedLevel: head.reachedLevel,
      reward,
    }));
    return store(
      byPlayer,
      viewerId,
      acceptedCandidates(state, viewerId, choices),
    );
  }
  const candidates: CommandV7[] = [];
  const capabilities = queryTechnologyCapabilitiesV7(state, viewerId);
  const unlocked = new Set(capabilities.commands);
  for (const node of queryTechnologyTreeV7(state, viewerId).nodes)
    if (node.state === "AVAILABLE" && node.affordable)
      candidates.push({ kind: "RESEARCH", tech: node.id });
  const explored = new Set(player.explored.map((at) => `${at.y},${at.x}`));
  for (const tile of state.board.tiles)
    if (explored.has(`${tile.at.y},${tile.at.x}`)) {
      if (tile.resource === "FRUIT" && unlocked.has("HARVEST_FRUIT"))
        candidates.push({ kind: "HARVEST_FRUIT", at: tile.at });
      if (tile.resource === "GAME" && unlocked.has("HUNT_GAME"))
        candidates.push({ kind: "HUNT_GAME", at: tile.at });
      if (tile.resource === "FERTILE_GROUND" && unlocked.has("BUILD_FARM"))
        candidates.push({ kind: "BUILD_FARM", at: tile.at });
      if (
        tile.terrain === "FOREST" &&
        tile.resource === null &&
        tile.improvement === null &&
        unlocked.has("BUILD_LUMBER_CAMP")
      )
        candidates.push({ kind: "BUILD_LUMBER_CAMP", at: tile.at });
      if (tile.resource === "ORE" && unlocked.has("BUILD_MINE"))
        candidates.push({ kind: "BUILD_MINE", at: tile.at });
      if (tile.resource === "STONE" && unlocked.has("BUILD_QUARRY"))
        candidates.push({ kind: "BUILD_QUARRY", at: tile.at });
      if (
        tile.site === null &&
        tile.resource === null &&
        tile.improvement === null
      ) {
        for (const kind of Object.keys(SPATIAL_ECONOMIC_ACTIONS_V7))
          if (unlocked.has(kind as never))
            candidates.push({ kind, at: tile.at } as CommandV7);
        if (tile.terrain === "FOREST" && unlocked.has("CLEAR_FOREST"))
          candidates.push({ kind: "CLEAR_FOREST", at: tile.at });
        if (tile.terrain === "GRASS" && unlocked.has("REPLANT_FOREST"))
          candidates.push({ kind: "REPLANT_FOREST", at: tile.at });
      }
      if (tile.site === null && !tile.road && unlocked.has("BUILD_ROAD"))
        candidates.push({ kind: "BUILD_ROAD", at: tile.at });
      if (tile.improvement !== null && unlocked.has("REDEVELOP"))
        candidates.push({ kind: "REDEVELOP", at: tile.at });
    }
  for (const city of state.cities)
    if (city.ownerId === viewerId)
      for (const role of UNIT_ROLE_IDS_V7)
        candidates.push({ kind: "TRAIN", cityId: city.id, role });
  for (const unit of state.units)
    if (unit.ownerId === viewerId) {
      if (unit.activation.pursuitPhase !== "NONE") {
        candidates.push({ kind: "END_PURSUIT", unitId: unit.id });
        for (const target of state.units)
          if (target.ownerId !== viewerId)
            candidates.push({
              kind: "ATTACK",
              unitId: unit.id,
              targetUnitId: target.id,
            });
        if (unit.activation.pursuitPhase === "PURSUIT_READY")
          for (const reachable of reachableMovementPathsV7(
            state,
            unit,
            "PURSUE",
          ))
            candidates.push({
              kind: "PURSUE",
              unitId: unit.id,
              path: reachable.path,
            });
        continue;
      }
      if (!unit.activation.moved && !primaryUsedForQuery(unit))
        for (const reachable of reachableMovementPathsV7(state, unit))
          candidates.push({
            kind: "MOVE",
            unitId: unit.id,
            path: reachable.path,
          });
      for (const target of state.units) {
        if (target.ownerId !== viewerId)
          candidates.push({
            kind: "ATTACK",
            unitId: unit.id,
            targetUnitId: target.id,
          });
        if (target.ownerId === viewerId && target.id !== unit.id)
          candidates.push({
            kind: "HEAL_ADJACENT",
            unitId: unit.id,
            targetUnitId: target.id,
          });
      }
      candidates.push({ kind: "RECOVER", unitId: unit.id });
      candidates.push({ kind: "CAPTURE", unitId: unit.id });
      candidates.push({ kind: "PROMOTE", unitId: unit.id });
      candidates.push({ kind: "PILLAGE", unitId: unit.id });
      candidates.push({ kind: "DISBAND", unitId: unit.id });
      candidates.push({ kind: "WAIT", unitId: unit.id });
    }
  candidates.push({ kind: "END_TURN" });
  return store(
    byPlayer,
    viewerId,
    acceptedCandidates(state, viewerId, candidates).sort(compareCommandsV7),
  );
}

/** Exact authoritative preview for an offered attack. */
export function queryCombatPreviewV7(
  state: GameStateV7,
  viewerId: PlayerId,
  attackerId: UnitId,
  targetUnitId: UnitId,
): CombatPreviewV7 | null {
  const offered = applyCommandV7(state, viewerId, {
    kind: "ATTACK",
    unitId: attackerId,
    targetUnitId,
  }).accepted;
  return offered
    ? calculateCombatPreviewV7(state, attackerId, targetUnitId)
    : null;
}

export function estimateCombatV7(
  state: GameStateV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
): CombatPreviewV7 | null {
  const attacker = state.units.find(
    (unit) => unit.id === attackerId && unit.hp > 0,
  );
  const target = state.units.find(
    (unit) => unit.id === targetUnitId && unit.hp > 0,
  );
  if (attacker === undefined || target === undefined) return null;
  const rule = effectiveRoleRuleV7(attacker.role);
  const distance = Math.max(
    Math.abs(attacker.at.x - target.at.x),
    Math.abs(attacker.at.y - target.at.y),
  );
  if (
    !rule.abilities.includes("ATTACK") ||
    distance < rule.minimumRange ||
    distance > rule.range
  )
    return null;
  return calculateCombatPreviewV7(state, attackerId, targetUnitId);
}

export function queryUnitStatsV7(
  state: GameStateV7,
  unitId: UnitId,
): PublicUnitStatsV7 | null {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  return unit === undefined ? null : publicUnitStatsV7(state, unit);
}

export interface PursuitPathPreviewV7 {
  readonly path: readonly CoordV7[];
  readonly destination: CoordV7;
  readonly targetUnitIds: readonly UnitId[];
}
export interface PursuitPreviewV7 {
  readonly unitId: UnitId;
  readonly phase: "PURSUIT_READY" | "PURSUIT_MOVED";
  readonly attacksUsed: 1 | 2;
  readonly attacksRemaining: 1 | 2;
  readonly directTargetUnitIds: readonly UnitId[];
  readonly pursuePaths: readonly PursuitPathPreviewV7[];
}
export function queryPursuitPreviewV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): PursuitPreviewV7 | null {
  const unit = state.units.find(
    (candidate) =>
      candidate.id === unitId &&
      candidate.ownerId === viewerId &&
      candidate.hp > 0,
  );
  if (unit === undefined || unit.activation.pursuitPhase === "NONE")
    return null;
  const hostileAdjacent = (at: CoordV7) =>
    state.units
      .filter(
        (target) =>
          target.ownerId !== viewerId &&
          Math.max(
            Math.abs(target.at.x - at.x),
            Math.abs(target.at.y - at.y),
          ) === 1 &&
          applyCommandV7(
            {
              ...state,
              units: state.units.map((candidate) =>
                candidate.id === unit.id ? { ...candidate, at } : candidate,
              ),
            } as GameStateV7,
            viewerId,
            { kind: "ATTACK", unitId, targetUnitId: target.id },
          ).accepted,
      )
      .map((target) => target.id)
      .sort((a, b) => a - b);
  const paths =
    unit.activation.pursuitPhase === "PURSUIT_READY"
      ? reachableMovementPathsV7(state, unit, "PURSUE").map((reachable) => ({
          path: reachable.path,
          destination: reachable.destination,
          targetUnitIds: state.units
            .filter(
              (target) =>
                target.ownerId !== viewerId &&
                Math.max(
                  Math.abs(target.at.x - reachable.destination.x),
                  Math.abs(target.at.y - reachable.destination.y),
                ) === 1,
            )
            .map((target) => target.id)
            .sort((a, b) => a - b),
        }))
      : [];
  return {
    unitId,
    phase: unit.activation.pursuitPhase,
    attacksUsed: unit.activation.attacksUsed as 1 | 2,
    attacksRemaining: (3 - unit.activation.attacksUsed) as 1 | 2,
    directTargetUnitIds: hostileAdjacent(unit.at),
    pursuePaths: paths,
  };
}

/** Geometry-safe threat envelope, including Lancer kill-advance plus Pursue reach. */
export function queryThreatenedTilesV7(
  state: GameStateV7,
  unitId: UnitId,
): readonly CoordV7[] {
  const unit = state.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined) return [];
  const rule = effectiveRoleRuleV7(unit.role);
  if (!rule.abilities.includes("ATTACK")) return [];
  const origins = [
    unit.at,
    ...reachableMovementPathsV7(state, unit).map((path) => path.destination),
  ];
  const direct = state.board.tiles
    .map((tile) => tile.at)
    .filter((at) =>
      origins.some((origin) => {
        const distance = Math.max(
          Math.abs(origin.x - at.x),
          Math.abs(origin.y - at.y),
        );
        return distance >= rule.minimumRange && distance <= rule.range;
      }),
    );
  const all =
    unit.role === "LANCER"
      ? [
          ...direct,
          ...state.board.tiles
            .map((tile) => tile.at)
            .filter((at) =>
              direct.some(
                (prior) =>
                  Math.max(
                    Math.abs(prior.x - at.x),
                    Math.abs(prior.y - at.y),
                  ) <= 3,
              ),
            ),
        ]
      : direct;
  return [...new Map(all.map((at) => [`${at.y},${at.x}`, at])).values()].sort(
    (a, b) => a.y - b.y || a.x - b.x,
  );
}

function primaryUsedForQuery(unit: UnitStateV7): boolean {
  return (
    unit.activation.attacked ||
    unit.activation.healed ||
    unit.activation.recovered ||
    unit.activation.captured ||
    unit.activation.specialActed
  );
}

export interface CityValueDeltaV7 {
  readonly cityId: CityId;
  readonly delta: number;
}
export interface EconomicPreviewV7 {
  readonly at: CoordV7;
  readonly cost: number;
  readonly ownerCityId: CityId;
  readonly populationDeltaByCity: readonly CityValueDeltaV7[];
  readonly coinIncomeDeltaByCity: readonly CityValueDeltaV7[];
  readonly resultingContribution: number;
  readonly capacityDelta: number;
  readonly levelsReached: readonly number[];
  readonly distinctTypes: readonly ImprovementIdV7[];
  readonly distinctFamilies: readonly EconomicFamilyV7[];
  readonly contributingTiles: readonly CoordV7[];
  readonly oppositePairAxes: readonly OppositePairAxisV7[];
  readonly capitalRoadConnected: boolean;
  readonly buildingLimitReached: false;
  readonly complete: true;
}
export type EconomicPreviewResultV7 =
  | { readonly ok: true; readonly preview: EconomicPreviewV7 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

export function previewEconomicV7(
  state: GameStateV7,
  viewerId: PlayerId,
  command: CommandV7,
): EconomicPreviewResultV7 {
  if (!("at" in command) || !TILE_KINDS.includes(command.kind as never))
    return { ok: false, error: "NOT_OFFERED" };
  const result = applyCommandV7(state, viewerId, command);
  if (!result.accepted) return { ok: false, error: "NOT_OFFERED" };
  const tile =
    state.board.tiles[command.at.y * state.board.width + command.at.x];
  if (tile === undefined || tile.territoryCityId === null)
    return { ok: false, error: "NOT_OFFERED" };
  const build = result.events.find(
    (event) =>
      event.kind === "ECONOMIC_BUILDING_BUILT" ||
      event.kind === "ECONOMIC_BUILDING_REMOVED",
  );
  const afterTile =
    result.state.board.tiles[
      command.at.y * result.state.board.width + command.at.x
    ];
  const improvement =
    afterTile?.improvement ??
    (build?.kind === "ECONOMIC_BUILDING_REMOVED" ? build.improvement : null);
  const evaluation =
    afterTile !== undefined && afterTile.improvement !== null
      ? spatialContributionAtV7(result.state, command.at, afterTile.improvement)
      : null;
  const costEvent = result.events.find(
    (event) =>
      event.kind === "FRUIT_HARVESTED" ||
      event.kind === "GAME_HUNTED" ||
      event.kind === "ECONOMIC_BUILDING_BUILT" ||
      event.kind === "ROAD_BUILT",
  );
  const cost =
    costEvent !== undefined && "cost" in costEvent
      ? costEvent.cost
      : command.kind === "REPLANT_FOREST"
        ? 4
        : 0;
  const populationDeltaByCity = state.cities
    .map((city) => {
      const after = result.state.cities.find((item) => item.id === city.id);
      return {
        cityId: city.id,
        delta:
          after === undefined
            ? 0
            : after.permanentPopulation +
              after.economicPopulation -
              city.permanentPopulation -
              city.economicPopulation,
      };
    })
    .filter((entry) => entry.delta !== 0);
  const coinIncomeDeltaByCity = state.cities
    .map((city) => {
      const after = result.state.cities.find((item) => item.id === city.id);
      return {
        cityId: city.id,
        delta:
          after === undefined
            ? 0
            : cityIncomeV7(result.state, after) - cityIncomeV7(state, city),
      };
    })
    .filter((entry) => entry.delta !== 0);
  return {
    ok: true,
    preview: {
      at: command.at,
      cost: typeof cost === "number" ? cost : 0,
      ownerCityId: tile.territoryCityId,
      populationDeltaByCity,
      coinIncomeDeltaByCity,
      resultingContribution:
        build?.kind === "ECONOMIC_BUILDING_BUILT"
          ? build.populationContribution
          : result.events.some(
                (event) =>
                  event.kind === "FRUIT_HARVESTED" ||
                  event.kind === "GAME_HUNTED",
              )
            ? 1
            : (evaluation?.population ?? 0),
      capacityDelta:
        build?.kind === "ECONOMIC_BUILDING_BUILT" ||
        build?.kind === "ECONOMIC_BUILDING_REMOVED"
          ? build.capacityDelta
          : 0,
      levelsReached: result.events
        .filter((event) => event.kind === "CITY_LEVELED_UP")
        .map((event) => event.level),
      distinctTypes:
        evaluation?.distinctTypes ??
        (improvement === null ? [] : [improvement]),
      distinctFamilies: evaluation?.distinctFamilies ?? [],
      contributingTiles:
        evaluation?.contributingTiles ??
        (result.events.some(
          (event) =>
            event.kind === "FRUIT_HARVESTED" || event.kind === "GAME_HUNTED",
        )
          ? [command.at]
          : []),
      oppositePairAxes: evaluation?.oppositePairAxes ?? [],
      capitalRoadConnected:
        evaluation?.capitalRoadConnected ??
        (command.kind === "BUILD_ROAD"
          ? isCapitalConnectedRoadV7(result.state, command.at, viewerId)
          : false),
      buildingLimitReached: false,
      complete: true,
    },
  };
}

export function previewCityCapacityV7(
  state: GameStateV7,
  cityId: CityId,
): {
  readonly cityId: CityId;
  readonly capacity: number;
  readonly assigned: number;
  readonly reserved: number;
  readonly available: number;
  readonly overCapacity: number;
} | null {
  const city = state.cities.find((item) => item.id === cityId);
  if (city === undefined) return null;
  const capacity = cityUnitCapacityV7(state, city);
  const assigned = assignedUnitCountV7(state, cityId);
  const reserved = reservedCapacityCountV7(state, cityId);
  return {
    cityId,
    capacity,
    assigned,
    reserved,
    available: Math.max(0, capacity - assigned - reserved),
    overCapacity: Math.max(0, assigned - capacity),
  };
}

export function previewDisbandV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): {
  readonly unitId: UnitId;
  readonly refund: number;
  readonly homeCityId: CityId | null;
  readonly complete: true;
} | null {
  const unit = state.units.find((item) => item.id === unitId);
  if (unit === undefined || unit.ownerId !== viewerId) return null;
  const result = applyCommandV7(state, viewerId, { kind: "DISBAND", unitId });
  if (!result.accepted) return null;
  const event = result.events.find((item) => item.kind === "UNIT_DISBANDED");
  return event?.kind === "UNIT_DISBANDED"
    ? {
        unitId,
        refund: event.coinDelta,
        homeCityId: unit.homeCityId,
        complete: true,
      }
    : null;
}
export function previewPillageV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): {
  readonly unitId: UnitId;
  readonly at: CoordV7;
  readonly cityId: CityId;
  readonly improvement: ImprovementIdV7;
  readonly coinDelta: 1;
  readonly capacityDelta: 0 | -1;
  readonly complete: true;
} | null {
  const result = applyCommandV7(state, viewerId, { kind: "PILLAGE", unitId });
  if (!result.accepted) return null;
  const event = result.events.find(
    (item) => item.kind === "IMPROVEMENT_PILLAGED",
  );
  return event?.kind === "IMPROVEMENT_PILLAGED"
    ? {
        unitId,
        at: event.at,
        cityId: event.cityId,
        improvement: event.improvement,
        coinDelta: 1,
        capacityDelta: event.improvement === "BARRACKS" ? -1 : 0,
        complete: true,
      }
    : null;
}
export function previewCaptureSpoilsV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): {
  readonly unitId: UnitId;
  readonly cityId: CityId;
  readonly coins: 0 | 2;
  readonly firstHostileCapture: boolean;
  readonly complete: true;
} | null {
  const result = applyCommandV7(state, viewerId, { kind: "CAPTURE", unitId });
  if (!result.accepted) return null;
  const capture = result.events.find((item) => item.kind === "CITY_CAPTURED");
  if (capture?.kind !== "CITY_CAPTURED") return null;
  const spoils = result.events.some((item) => item.kind === "SPOILS_AWARDED");
  return {
    unitId,
    cityId: capture.cityId,
    coins: spoils ? 2 : 0,
    firstHostileCapture: capture.from !== null && spoils,
    complete: true,
  };
}

function acceptedCandidates(
  state: GameStateV7,
  playerId: PlayerId,
  candidates: readonly CommandV7[],
): CommandV7[] {
  return candidates.filter(
    (command) => applyCommandV7(state, playerId, command).accepted,
  );
}
function store(
  cache: Map<PlayerId, readonly CommandV7[]>,
  playerId: PlayerId,
  commands: readonly CommandV7[],
): readonly CommandV7[] {
  cache.set(playerId, commands);
  return commands;
}
function requirePlayer(state: GameStateV7, id: PlayerId) {
  const player = state.players.find((item) => item.id === id);
  if (player === undefined) throw new RangeError("Player missing");
  return player;
}
