import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  ORIGINAL_BASELINE_V3_TREE,
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
  rewardCandidatesForLevelV7,
  reservedCapacityCountV7,
} from "./economy";
import { applyCommandV7 } from "./reducer";
import { calculateCombatPreviewV7 } from "./combat";
import type { CombatPreviewV7, DomainEventV7 } from "./events";
import { reachablePlayerMovementPathsV7 } from "./movement";
import {
  isCapitalConnectedRoadV7,
  spatialContributionAtV7,
  type EconomicFamilyV7,
  type OppositePairAxisV7,
} from "./spatial-economy";
import {
  COMMAND_KIND_ORDER_V7,
  TECHNOLOGY_IDS_V7,
  UNIT_ROLE_IDS_V7,
  type CoordV7,
  type AchievementEntitlementV7,
  type AchievementIdV7,
  type GameStateV7,
  type ImprovementIdV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "./types";
import { publicUnitStatsV7, type PublicUnitStatsV7 } from "./unit-stats";
import { viewForV7, type PlayerTileViewV7, type PlayerViewV7 } from "./view";

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
  readonly id: "ORIGINAL_BASELINE_V3";
  readonly faction: "ORIGINAL";
  readonly ownedCityCount: number;
  readonly branches: typeof TECHNOLOGY_BRANCH_IDS_V7;
  readonly nodes: readonly PublicTechnologyNodeV7[];
  readonly roleBindings: Readonly<Record<UnitRoleIdV7, EffectiveRoleRuleV7>>;
}

export function queryTechnologyTreeV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): PublicTechnologyTreeV7 {
  const view = asView(input, viewerId);
  const player = view.viewer;
  const ownedCityCount = view.cities.filter(
    (city) => city.ownerId === player.id,
  ).length;
  if (ownedCityCount < 1) throw new RangeError("Technology requires a city");
  const owned = new Set(player.researchedTechs);
  return {
    id: "ORIGINAL_BASELINE_V3",
    faction: "ORIGINAL",
    ownedCityCount,
    branches: TECHNOLOGY_BRANCH_IDS_V7,
    nodes: ORIGINAL_BASELINE_V3_TREE.nodes.map((node) => {
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
    roleBindings: ORIGINAL_BASELINE_V3_TREE.roleRules,
  };
}

export function queryTechnologyCapabilitiesV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): TechnologyCapabilitiesV7 {
  return technologyCapabilitiesV7(
    asView(input, viewerId).viewer.researchedTechs,
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
const COMMAND_CACHE = new WeakMap<PlayerViewV7, readonly CommandV7[]>();

/** PlayerView-only enumeration for the implemented v7 slice. */
export function queryPlayerCommandsV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): readonly CommandV7[] {
  const view = asView(input, viewerId);
  const cached = COMMAND_CACHE.get(view);
  if (cached !== undefined) return cached;
  const player = view.viewer;
  if (
    view.outcome !== null ||
    player.status !== "ACTIVE" ||
    view.turnOrder[view.activeSeatIndex] !== player.id
  )
    return store(view, []);
  const head = view.pendingChoices[0];
  if (head !== undefined) {
    const choices = head.candidates.map((reward): CommandV7 => ({
      kind: "CHOOSE_CITY_REWARD",
      cityId: head.cityId,
      reachedLevel: head.reachedLevel,
      reward,
    }));
    return store(view, choices.sort(compareCommandsV7));
  }
  const candidates: CommandV7[] = [];
  const capabilities = queryTechnologyCapabilitiesV7(view);
  const unlocked = new Set(capabilities.commands);
  for (const node of queryTechnologyTreeV7(view).nodes)
    if (node.state === "AVAILABLE" && node.affordable)
      candidates.push({ kind: "RESEARCH", tech: node.id });
  for (const tile of view.board.tiles) {
    if (!tile.explored) continue;
    for (const kind of TILE_KINDS)
      if (publicTileCommandLegal(view, tile, kind, unlocked))
        candidates.push({ kind, at: tile.at } as CommandV7);
    const monumentCity = view.cities.find(
      (city) => city.id === tile.territoryCityId,
    );
    if (
      monumentCity?.ownerId === player.id &&
      !publicCityBesieged(view, monumentCity.at) &&
      monumentCity.blackout?.phase !== "ACTIVE" &&
      publicCityDevelopmentFootprintKnown(view, monumentCity) &&
      !view.pendingChoices.some(
        (choice) => choice.cityId === monumentCity.id,
      ) &&
      !view.treasureChests.some((chest) => same(chest, tile.at)) &&
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      !cityHasImprovement(view, monumentCity.id, "MONUMENT")
    )
      for (const entitlement of player.achievementEntitlements)
        if (entitlement.unlocked && !entitlement.spent)
          candidates.push({
            kind: "BUILD_MONUMENT",
            achievement: entitlement.achievement,
            at: tile.at,
          });
  }
  for (const city of view.cities) {
    if (city.ownerId !== player.id || publicCityBesieged(view, city.at))
      continue;
    const centerOccupied = view.units.some((unit) => same(unit.at, city.at));
    const capacity =
      city.level +
      1 +
      (player.researchedTechs.includes("FORTIFICATION") ? 1 : 0) +
      (cityHasImprovement(view, city.id, "BARRACKS") ? 2 : 0);
    const assigned = view.units.filter(
      (unit) => unit.ownerId === player.id && unit.homeCityId === city.id,
    ).length;
    const reserved = view.defectionStatuses.filter(
      (status) =>
        status.visibility === "FULL" &&
        status.initiatingPlayerId === player.id &&
        status.reservedHomeCityId === city.id,
    ).length;
    if (
      centerOccupied ||
      assigned + reserved >= capacity ||
      city.blackout?.phase === "ACTIVE"
    )
      continue;
    for (const role of UNIT_ROLE_IDS_V7) {
      const rule = effectiveRoleRuleV7(role);
      if (
        rule.cost !== null &&
        rule.cost <= player.coins &&
        (rule.technology === null ||
          player.researchedTechs.includes(rule.technology))
      )
        candidates.push({ kind: "TRAIN", cityId: city.id, role });
    }
  }
  for (const unit of view.units)
    if (unit.ownerId === player.id) {
      if (unit.activation.pursuitPhase !== "NONE") {
        candidates.push({ kind: "END_PURSUIT", unitId: unit.id });
        for (const target of view.units)
          if (
            publicHostile(view, player.id, target.ownerId) &&
            chebyshev(unit.at, target.at) === 1
          )
            candidates.push({
              kind: "ATTACK",
              unitId: unit.id,
              targetUnitId: target.id,
            });
        if (unit.activation.pursuitPhase === "PURSUIT_READY")
          for (const reachable of reachablePlayerMovementPathsV7(
            view,
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
        for (const reachable of reachablePlayerMovementPathsV7(view, unit))
          candidates.push({
            kind: "MOVE",
            unitId: unit.id,
            path: reachable.path,
          });
      const rule = effectiveRoleRuleV7(unit.role);
      const primaryReady =
        !primaryUsedForQuery(unit) &&
        (!unit.activation.moved || rule.mayUsePrimaryActionAfterMove);
      for (const target of view.units) {
        const distance = chebyshev(unit.at, target.at);
        if (
          primaryReady &&
          rule.abilities.includes("ATTACK") &&
          publicHostile(view, player.id, target.ownerId) &&
          distance >= rule.minimumRange &&
          distance <= rule.range
        )
          candidates.push({
            kind: "ATTACK",
            unitId: unit.id,
            targetUnitId: target.id,
          });
        if (
          primaryReady &&
          rule.abilities.includes("HEAL_ADJACENT") &&
          target.ownerId === player.id &&
          target.id !== unit.id &&
          target.hp < target.maxHp &&
          distance === 1
        )
          candidates.push({
            kind: "HEAL_ADJACENT",
            unitId: unit.id,
            targetUnitId: target.id,
          });
      }
      if (
        !unit.activation.moved &&
        !primaryUsedForQuery(unit) &&
        unit.hp < unit.maxHp
      )
        candidates.push({ kind: "RECOVER", unitId: unit.id });
      if (
        !unit.activation.moved &&
        !primaryUsedForQuery(unit) &&
        unit.captureEligible &&
        publicCaptureTarget(view, unit.at)
      )
        candidates.push({ kind: "CAPTURE", unitId: unit.id });
      if (unit.kills >= 3 && !unit.veteran)
        candidates.push({ kind: "PROMOTE", unitId: unit.id });
      const tile = tileAtView(view, unit.at);
      if (
        player.researchedTechs.includes("EXPLOSIVES") &&
        primaryReady &&
        tile?.explored === true &&
        tile.improvement !== null &&
        tile.territoryOwnerId !== null &&
        publicHostile(view, player.id, tile.territoryOwnerId)
      )
        candidates.push({ kind: "PILLAGE", unitId: unit.id });
      if (
        player.researchedTechs.includes("RECOVERY") &&
        primaryReady &&
        unit.role !== "JUGGERNAUT"
      )
        candidates.push({ kind: "DISBAND", unitId: unit.id });
      if (!unit.activation.handled)
        candidates.push({ kind: "WAIT", unitId: unit.id });
    }
  if (view.defectionStatuses.length === 0 && view.blackoutStatuses.length === 0)
    candidates.push({ kind: "END_TURN" });
  return store(view, candidates.sort(compareCommandsV7));
}

export interface MonumentPreviewV7 {
  readonly achievement: AchievementIdV7;
  readonly entitlement: AchievementEntitlementV7;
  readonly at: CoordV7;
  readonly cityId: CityId;
  readonly cityHasMonument: false;
  readonly onePerCityAvailable: true;
  readonly populationAdded: 3;
  readonly levelsReached: readonly number[];
  readonly rewardWork: readonly Extract<
    DomainEventV7,
    {
      kind: "CITY_REWARD_AUTOMATICALLY_GRANTED" | "CITY_REWARD_QUEUED";
    }
  >[];
  readonly lostEmptyTile: true;
  readonly complete: true;
}

export type MonumentPreviewResultV7 =
  | { readonly ok: true; readonly preview: MonumentPreviewV7 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

export function previewMonumentV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrCommand: PlayerId | Extract<CommandV7, { kind: "BUILD_MONUMENT" }>,
  maybeCommand?: Extract<CommandV7, { kind: "BUILD_MONUMENT" }>,
): MonumentPreviewResultV7 {
  const view =
    maybeCommand === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrCommand as PlayerId);
  const command =
    maybeCommand ??
    (viewerOrCommand as Extract<CommandV7, { kind: "BUILD_MONUMENT" }>);
  const offered = queryPlayerCommandsV7(view).some(
    (candidate) =>
      candidate.kind === "BUILD_MONUMENT" &&
      candidate.achievement === command.achievement &&
      same(candidate.at, command.at),
  );
  if (!offered) return { ok: false, error: "NOT_OFFERED" };
  const tile = view.board.tiles[command.at.y * view.board.width + command.at.x];
  const entitlement = view.viewer.achievementEntitlements.find(
    (item) => item.achievement === command.achievement,
  );
  if (
    tile?.explored !== true ||
    tile.territoryCityId === null ||
    entitlement === undefined
  )
    return { ok: false, error: "NOT_OFFERED" };
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined) return { ok: false, error: "NOT_OFFERED" };
  const levelsReached: number[] = [];
  const total = city.permanentPopulation + city.economicPopulation + 3;
  if (!Number.isSafeInteger(total)) return { ok: false, error: "NOT_OFFERED" };
  let level = city.level;
  while (total - growthSpentForPreview(level) >= level + 1) {
    level += 1;
    levelsReached.push(level);
  }
  const rewardWork: Extract<
    DomainEventV7,
    { kind: "CITY_REWARD_AUTOMATICALLY_GRANTED" | "CITY_REWARD_QUEUED" }
  >[] = [];
  for (const reachedLevel of levelsReached) {
    if (reachedLevel >= 5) {
      const placement = publicRewardPlacementStatus(view, city.id);
      if (placement === "UNKNOWN") return { ok: false, error: "NOT_OFFERED" };
      if (placement === "NONE") {
        rewardWork.push({
          kind: "CITY_REWARD_AUTOMATICALLY_GRANTED",
          playerId: view.viewer.id,
          cityId: city.id,
          reachedLevel,
          reward: "TREASURY",
          coins: 12,
        });
        continue;
      }
    }
    rewardWork.push({
      kind: "CITY_REWARD_QUEUED",
      cityId: city.id,
      reachedLevel,
      candidates: rewardCandidatesForLevelV7(reachedLevel),
    });
    break;
  }
  const automaticCoins =
    rewardWork.filter(
      (event) => event.kind === "CITY_REWARD_AUTOMATICALLY_GRANTED",
    ).length * 12;
  if (!Number.isSafeInteger(view.viewer.coins + automaticCoins))
    return { ok: false, error: "NOT_OFFERED" };
  return {
    ok: true,
    preview: {
      achievement: command.achievement,
      entitlement,
      at: command.at,
      cityId: tile.territoryCityId,
      cityHasMonument: false,
      onePerCityAvailable: true,
      populationAdded: 3,
      levelsReached,
      rewardWork,
      lostEmptyTile: true,
      complete: true,
    },
  };
}

function growthSpentForPreview(level: number): number {
  const result = (level * (level + 1)) / 2 - 1;
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}

function publicRewardPlacementStatus(
  view: PlayerViewV7,
  cityId: CityId,
): "AVAILABLE" | "NONE" | "UNKNOWN" {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return "UNKNOWN";
  const candidates = view.board.tiles.filter(
    (tile): tile is Extract<PlayerTileViewV7, { explored: true }> =>
      tile.explored &&
      tile.territoryCityId === cityId &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("SURVEYING")),
  );
  let hasConcealableCell = false;
  for (const tile of candidates) {
    if (view.units.some((unit) => unit.hp > 0 && same(unit.at, tile.at)))
      continue;
    const detected =
      view.cities.some(
        (city) =>
          city.ownerId === view.viewer.id && chebyshev(city.at, tile.at) <= 1,
      ) ||
      view.units.some(
        (unit) =>
          unit.ownerId === view.viewer.id &&
          chebyshev(unit.at, tile.at) <= (unit.role === "SCOUT" ? 2 : 1),
      );
    if (detected) return "AVAILABLE";
    hasConcealableCell = true;
  }
  if (
    view.board.tiles.some(
      (tile) =>
        !tile.explored &&
        chebyshev(tile.at, city.at) <= (city.expanded ? 2 : 1),
    )
  )
    return "UNKNOWN";
  return hasConcealableCell ? "UNKNOWN" : "NONE";
}

/** Observation-safe exact preview for an offered attack. */
export function queryCombatPreviewV7(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
): CombatPreviewV7 | null;
export function queryCombatPreviewV7(
  state: GameStateV7,
  viewerId: PlayerId,
  attackerId: UnitId,
  targetUnitId: UnitId,
): CombatPreviewV7 | null;
export function queryCombatPreviewV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrAttacker: PlayerId | UnitId,
  attackerOrTarget: UnitId,
  maybeTarget?: UnitId,
): CombatPreviewV7 | null {
  const view =
    maybeTarget === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrAttacker as PlayerId);
  const attackerId =
    maybeTarget === undefined ? (viewerOrAttacker as UnitId) : attackerOrTarget;
  const targetUnitId = maybeTarget ?? attackerOrTarget;
  return publicCombatPreview(view, attackerId, targetUnitId);
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
  input: GameStateV7 | PlayerViewV7,
  unitId: UnitId,
  viewerId?: PlayerId,
): PublicUnitStatsV7 | null {
  if ("leaderboard" in input)
    return input.unitStats.find((stats) => stats.unitId === unitId) ?? null;
  if (viewerId !== undefined) {
    const view = viewForV7(input, viewerId);
    return view.unitStats.find((stats) => stats.unitId === unitId) ?? null;
  }
  const unit = input.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  return unit === undefined ? null : publicUnitStatsV7(input, unit);
}

export type PublicSelectionV7 =
  | {
      readonly kind: "UNIT";
      readonly unit: PlayerViewV7["units"][number];
      readonly stats: PublicUnitStatsV7;
    }
  | { readonly kind: "CITY"; readonly city: PlayerViewV7["cities"][number] }
  | { readonly kind: "TILE"; readonly tile: PlayerTileViewV7 };

/** Selection lookup cannot name an entity omitted from PlayerView. */
export function queryPublicSelectionV7(
  view: PlayerViewV7,
  at: CoordV7,
): PublicSelectionV7 {
  const unit = view.units.find((candidate) => same(candidate.at, at));
  if (unit !== undefined) {
    const stats = view.unitStats.find((entry) => entry.unitId === unit.id);
    if (stats === undefined) throw new RangeError("Visible unit stats missing");
    return { kind: "UNIT", unit, stats };
  }
  const city = view.cities.find((candidate) => same(candidate.at, at));
  if (city !== undefined) return { kind: "CITY", city };
  const tile = tileAtView(view, at);
  if (tile === undefined) throw new RangeError("Tile missing");
  return { kind: "TILE", tile };
}

export interface AiReadyCommandV7 {
  readonly command: CommandV7;
  readonly tuple: readonly [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ];
}

/**
 * Observation-safe deterministic candidate substrate. The policy bead fills
 * the first six scores; this boundary freezes only public tie-break fields.
 */
export function queryAiReadyCommandsV7(
  view: PlayerViewV7,
): readonly AiReadyCommandV7[] {
  return queryPlayerCommandsV7(view).map((command) => {
    const target = publicCommandTarget(view, command);
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
            ? ORIGINAL_BASELINE_V3_TREE.nodes.length + command.reachedLevel
            : "targetUnitId" in command
              ? command.targetUnitId
              : 0;
    return {
      command,
      tuple: [
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
      ],
    };
  });
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
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnitId?: UnitId,
): PursuitPreviewV7 | null {
  const view =
    maybeUnitId === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnitId ?? (viewerOrUnit as UnitId);
  const unit = view.units.find(
    (candidate) =>
      candidate.id === unitId &&
      candidate.ownerId === view.viewer.id &&
      candidate.hp > 0,
  );
  if (unit === undefined || unit.activation.pursuitPhase === "NONE")
    return null;
  const hostileAdjacent = (at: CoordV7) =>
    view.units
      .filter(
        (target) =>
          publicHostile(view, view.viewer.id, target.ownerId) &&
          Math.max(
            Math.abs(target.at.x - at.x),
            Math.abs(target.at.y - at.y),
          ) === 1 &&
          queryCombatPreviewAtV7(view, unit, at, target) !== null,
      )
      .map((target) => target.id)
      .sort((a, b) => a - b);
  const paths =
    unit.activation.pursuitPhase === "PURSUIT_READY"
      ? reachablePlayerMovementPathsV7(view, unit, "PURSUE").map(
          (reachable) => ({
            path: reachable.path,
            destination: reachable.destination,
            targetUnitIds: view.units
              .filter(
                (target) =>
                  publicHostile(view, view.viewer.id, target.ownerId) &&
                  Math.max(
                    Math.abs(target.at.x - reachable.destination.x),
                    Math.abs(target.at.y - reachable.destination.y),
                  ) === 1,
              )
              .map((target) => target.id)
              .sort((a, b) => a - b),
          }),
        )
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
  input: GameStateV7 | PlayerViewV7,
  unitId: UnitId,
  viewerId?: PlayerId,
): readonly CoordV7[] {
  const view =
    "leaderboard" in input
      ? input
      : viewForV7(input, viewerId ?? input.humanPlayerId);
  const unit = view.units.find(
    (candidate) => candidate.id === unitId && candidate.hp > 0,
  );
  if (unit === undefined) return [];
  const rule = effectiveRoleRuleV7(unit.role);
  if (!rule.abilities.includes("ATTACK")) return [];
  const origins = [
    unit.at,
    ...reachablePlayerMovementPathsV7(view, unit).map(
      (path) => path.destination,
    ),
  ];
  const direct = view.board.tiles
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
          ...view.board.tiles
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

function primaryUsedForQuery(unit: Pick<UnitStateV7, "activation">): boolean {
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
  readonly resourceRestored:
    "FERTILE_GROUND" | "ORE" | "STONE" | "UNKNOWN_RESOURCE" | null;
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
  const view = viewForV7(state, viewerId);
  const offered = queryPlayerCommandsV7(view).some(
    (candidate) =>
      candidate.kind === command.kind &&
      "at" in candidate &&
      same(candidate.at, command.at),
  );
  if (!offered || !publicEconomicPreviewExact(view, command))
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
  const afterPublicTile = viewForV7(result.state, viewerId).board.tiles[
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
      resourceRestored:
        build?.kind === "ECONOMIC_BUILDING_REMOVED" &&
        afterPublicTile?.explored === true
          ? projectedRestoredResource(afterPublicTile.resource)
          : null,
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

function publicEconomicPreviewExact(
  view: PlayerViewV7,
  command: Extract<CommandV7, { at: CoordV7 }>,
): boolean {
  const tile = tileAtView(view, command.at);
  if (tile?.explored !== true || tile.territoryCityId === null) return false;
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined) return false;
  // A changed improvement can propagate through connected same-city basics,
  // processors, and adjacent same-owner buildings across city borders. Every
  // tile in every owned city footprint must therefore be public before a
  // canonical reducer result can be reported as an exact public preview.
  const changesImprovementGraph =
    command.kind === "REDEVELOP" ||
    command.kind === "BUILD_ROAD" ||
    command.kind === "BUILD_FARM" ||
    command.kind === "BUILD_LUMBER_CAMP" ||
    command.kind === "BUILD_MINE" ||
    command.kind === "BUILD_QUARRY" ||
    command.kind in SPATIAL_ECONOMIC_ACTIONS_V7;
  const ownedCities = view.cities.filter(
    (candidate) => candidate.ownerId === view.viewer.id,
  );
  const publicOwnedCityCount = view.leaderboard.find(
    (entry) => entry.isViewer,
  )?.cityCount;
  if (
    changesImprovementGraph &&
    (publicOwnedCityCount !== ownedCities.length ||
      ownedCities.some(
        (candidate) => !publicCityDevelopmentFootprintKnown(view, candidate),
      ))
  )
    return false;

  // Reward placement is absent from this preview, so hidden occupancy matters
  // only when automatic Treasury work could make canonical acceptance overflow.
  // Eighteen population per board tile is a conservative upper bound on newly
  // crossed reward levels for one economic mutation.
  const maximumAutomaticRewardCoins = view.board.tiles.length * 18 * 12;
  if (
    economicCommandCanAddPopulation(command.kind) &&
    view.viewer.coins > Number.MAX_SAFE_INTEGER - maximumAutomaticRewardCoins &&
    view.cities.some(
      (candidate) =>
        candidate.ownerId === view.viewer.id &&
        publicRewardPlacementStatus(view, candidate.id) === "UNKNOWN",
    )
  )
    return false;
  return true;
}

function economicCommandCanAddPopulation(kind: CommandV7["kind"]): boolean {
  return (
    kind === "HARVEST_FRUIT" ||
    kind === "HUNT_GAME" ||
    kind === "BUILD_FARM" ||
    kind === "BUILD_LUMBER_CAMP" ||
    kind === "BUILD_MINE" ||
    kind === "BUILD_QUARRY" ||
    (kind in SPATIAL_ECONOMIC_ACTIONS_V7 &&
      kind !== "BUILD_MARKET" &&
      kind !== "BUILD_BARRACKS")
  );
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
  readonly capacityDelta: 0 | -2;
  readonly resourceRestored:
    "FERTILE_GROUND" | "ORE" | "STONE" | "UNKNOWN_RESOURCE" | null;
  readonly complete: true;
} | null {
  const result = applyCommandV7(state, viewerId, { kind: "PILLAGE", unitId });
  if (!result.accepted) return null;
  const event = result.events.find(
    (item) => item.kind === "IMPROVEMENT_PILLAGED",
  );
  const afterTile =
    event?.kind === "IMPROVEMENT_PILLAGED"
      ? viewForV7(result.state, viewerId).board.tiles[
          event.at.y * result.state.board.width + event.at.x
        ]
      : undefined;
  return event?.kind === "IMPROVEMENT_PILLAGED"
    ? {
        unitId,
        at: event.at,
        cityId: event.cityId,
        improvement: event.improvement,
        coinDelta: 1,
        capacityDelta: event.improvement === "BARRACKS" ? -2 : 0,
        resourceRestored:
          afterTile?.explored === true
            ? projectedRestoredResource(afterTile.resource)
            : null,
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

function store(
  view: PlayerViewV7,
  commands: readonly CommandV7[],
): readonly CommandV7[] {
  COMMAND_CACHE.set(view, commands);
  return commands;
}
function asView(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): PlayerViewV7 {
  if ("leaderboard" in input) return input;
  if (viewerId === undefined)
    throw new RangeError("A viewer is required for authoritative state");
  return viewForV7(input, viewerId);
}

function tileAtView(view: PlayerViewV7, at: CoordV7) {
  return view.board.tiles[at.y * view.board.width + at.x];
}

function publicHostile(
  view: PlayerViewV7,
  left: PlayerId,
  right: PlayerId,
): boolean {
  if (left === right) return false;
  return (
    view.setup.aiMode === "RIVAL" ||
    left === view.humanPlayerId ||
    right === view.humanPlayerId
  );
}

function publicCityBesieged(view: PlayerViewV7, at: CoordV7): boolean {
  return view.units.some(
    (unit) =>
      unit.hp > 0 &&
      publicHostile(view, view.viewer.id, unit.ownerId) &&
      same(unit.at, at),
  );
}

function publicCityDevelopmentFootprintKnown(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): boolean {
  const radius = city.expanded ? 2 : 1;
  return view.board.tiles.every(
    (tile) => chebyshev(tile.at, city.at) > radius || tile.explored,
  );
}

function publicCaptureTarget(view: PlayerViewV7, at: CoordV7): boolean {
  const tile = tileAtView(view, at);
  if (tile?.explored !== true) return false;
  if (tile.site === "VILLAGE" && tile.territoryOwnerId === null) return true;
  const city = view.cities.find((candidate) => same(candidate.at, at));
  return (
    city !== undefined &&
    publicHostile(view, view.viewer.id, city.ownerId) &&
    !view.units.some(
      (unit) =>
        unit.ownerId !== view.viewer.id && unit.hp > 0 && same(unit.at, at),
    )
  );
}

function projectedRestoredResource(
  resource: Extract<PlayerTileViewV7, { explored: true }>["resource"],
): "FERTILE_GROUND" | "ORE" | "STONE" | "UNKNOWN_RESOURCE" | null {
  return resource === "FERTILE_GROUND" ||
    resource === "ORE" ||
    resource === "STONE" ||
    resource === "UNKNOWN_RESOURCE"
    ? resource
    : null;
}

function cityHasImprovement(
  view: PlayerViewV7,
  cityId: CityId,
  improvement: ImprovementIdV7,
): boolean {
  return view.board.tiles.some(
    (tile) =>
      tile.explored &&
      tile.territoryCityId === cityId &&
      tile.improvement === improvement,
  );
}

function publicTileCommandLegal(
  view: PlayerViewV7,
  tile: Extract<PlayerTileViewV7, { explored: true }>,
  kind: (typeof TILE_KINDS)[number],
  unlocked: ReadonlySet<string>,
): boolean {
  if (!unlocked.has(kind)) return false;
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (
    city?.ownerId !== view.viewer.id ||
    publicCityBesieged(view, city.at) ||
    city.blackout?.phase === "ACTIVE" ||
    view.pendingChoices.some((choice) => choice.cityId === city.id)
  )
    return false;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[kind as keyof typeof BASIC_ECONOMIC_ACTIONS_V7];
  if (basic !== undefined)
    return (
      view.viewer.coins >= basic.cost &&
      !view.treasureChests.some((chest) => same(chest, tile.at)) &&
      tile.site === null &&
      tile.terrain === basic.terrain &&
      tile.resource === basic.resource &&
      tile.improvement === null
    );
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[
      kind as keyof typeof SPATIAL_ECONOMIC_ACTIONS_V7
    ];
  if (spatial !== undefined) {
    if (
      view.viewer.coins < spatial.cost ||
      view.treasureChests.some((chest) => same(chest, tile.at)) ||
      tile.site !== null ||
      tile.resource !== null ||
      tile.improvement !== null ||
      cityHasImprovement(view, city.id, spatial.improvement)
    )
      return false;
    if (kind === "BUILD_BARRACKS") return chebyshev(tile.at, city.at) === 1;
    const adjacent = adjacentPublicTiles(view, tile.at).filter(
      (candidate): candidate is Extract<PlayerTileViewV7, { explored: true }> =>
        candidate.explored,
    );
    if (kind === "BUILD_WINDMILL")
      return adjacent.some(
        (item) =>
          item.territoryCityId === city.id && item.improvement === "FARM",
      );
    if (kind === "BUILD_SAWMILL")
      return adjacent.some(
        (item) =>
          item.territoryCityId === city.id &&
          item.improvement === "LUMBER_CAMP",
      );
    if (kind === "BUILD_STONEWORKS")
      return adjacent.some(
        (item) =>
          item.territoryCityId === city.id && item.improvement === "QUARRY",
      );
    if (kind === "BUILD_WORKSHOP")
      return (
        distinct(
          adjacent.flatMap((item) =>
            item.territoryOwnerId === view.viewer.id &&
            item.improvement !== null &&
            ["FARM", "LUMBER_CAMP", "MINE", "QUARRY"].includes(item.improvement)
              ? [item.improvement]
              : [],
          ),
        ).length >= 1
      );
    if (kind === "BUILD_GRAND_WORKS")
      return (
        distinct(
          adjacent.flatMap((item) =>
            item.territoryOwnerId === view.viewer.id &&
            item.improvement !== null &&
            ["WINDMILL", "SAWMILL", "FORGE", "STONEWORKS"].includes(
              item.improvement,
            ) &&
            view.improvementValues.some(
              (value) =>
                same(value.at, item.at) &&
                value.measure === "POPULATION" &&
                value.level > 0,
            )
              ? [item.improvement]
              : [],
          ),
        ).length >= 2
      );
    if (kind === "BUILD_MARKET")
      return (
        distinct(
          adjacent.flatMap((item) => {
            if (item.territoryOwnerId !== view.viewer.id) return [];
            const family = improvementFamily(item.improvement);
            return family === null ? [] : [family];
          }),
        ).length >= 2
      );
    return true;
  }
  if (kind === "CLEAR_FOREST")
    return (
      tile.site === null &&
      tile.terrain === "FOREST" &&
      tile.resource === null &&
      tile.improvement === null
    );
  if (kind === "REPLANT_FOREST")
    return (
      view.viewer.coins >= 4 &&
      tile.site === null &&
      tile.terrain === "GRASS" &&
      tile.resource === null &&
      tile.improvement === null
    );
  if (kind === "BUILD_ROAD")
    return view.viewer.coins >= 2 && tile.site === null && !tile.road;
  return kind === "REDEVELOP" && tile.improvement !== null;
}

function adjacentPublicTiles(
  view: PlayerViewV7,
  at: CoordV7,
): PlayerTileViewV7[] {
  const result: PlayerTileViewV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1) {
      if (x === at.x && y === at.y) continue;
      const tile = tileAtView(view, { x, y });
      if (tile !== undefined) result.push(tile);
    }
  return result;
}

function improvementFamily(improvement: ImprovementIdV7 | null): string | null {
  if (improvement === "FARM" || improvement === "WINDMILL")
    return "AGRICULTURE";
  if (improvement === "LUMBER_CAMP" || improvement === "SAWMILL")
    return "TIMBER";
  if (improvement === "MINE" || improvement === "FORGE") return "METAL";
  if (improvement === "QUARRY" || improvement === "STONEWORKS") return "STONE";
  return null;
}

function distinct<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function publicCombatPreview(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
): CombatPreviewV7 | null {
  const attacker = view.units.find(
    (unit) => unit.id === attackerId && unit.ownerId === view.viewer.id,
  );
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (
    attacker === undefined ||
    target === undefined ||
    !publicHostile(view, attacker.ownerId, target.ownerId)
  )
    return null;
  const attackerRule = effectiveRoleRuleV7(attacker.role);
  const defenderRule = effectiveRoleRuleV7(target.role);
  const distance = chebyshev(attacker.at, target.at);
  if (
    !attackerRule.abilities.includes("ATTACK") ||
    primaryUsedForQuery(attacker) ||
    (attacker.activation.moved && !attackerRule.mayUsePrimaryActionAfterMove) ||
    distance < attackerRule.minimumRange ||
    distance > attackerRule.range ||
    (attacker.activation.pursuitPhase !== "NONE" && distance !== 1)
  )
    return null;
  const attackStats = view.unitStats.find(
    (stats) => stats.unitId === attacker.id,
  );
  const defenseStats = view.unitStats.find(
    (stats) => stats.unitId === target.id,
  );
  if (attackStats === undefined || defenseStats === undefined) return null;
  const attack = attackStats.stats.find((stat) => stat.id === "ATTACK");
  const defense = defenseStats.stats.find((stat) => stat.id === "DEFENSE");
  if (attack === undefined || defense === undefined) return null;
  const attack2 = rationalToHalfUnits(attack.total);
  const defense2 = defenderRule.defense2;
  const bonus = ratio(defense.total, defense.base.value);
  const breachApplied =
    attackerRule.abilities.includes("BREACH") && distance === 1;
  const applied = breachApplied ? { numerator: 1, denominator: 1 } : bonus;
  const attackForceNumerator = BigInt(attack2) * BigInt(attacker.hp);
  const attackForceDenominator = 2n * BigInt(attacker.maxHp);
  const defenseForceNumerator =
    BigInt(defense2) * BigInt(target.hp) * BigInt(applied.numerator);
  const defenseForceDenominator =
    2n * BigInt(target.maxHp) * BigInt(applied.denominator);
  const attackOnCommon = attackForceNumerator * defenseForceDenominator;
  const defenseOnCommon = defenseForceNumerator * attackForceDenominator;
  const total = attackOnCommon + defenseOnCommon;
  if (total <= 0n) return null;
  const damageToDefender = Math.min(
    target.hp,
    roundHalfUpPublic(attackOnCommon * BigInt(attack2) * 9n, total * 4n),
  );
  const defenderDies = damageToDefender >= target.hp;
  const retaliation =
    !defenderDies &&
    defenderRule.abilities.includes("ATTACK") &&
    defenderRule.attack2 > 0 &&
    distance >= defenderRule.minimumRange &&
    distance <= defenderRule.range;
  const damageToAttacker = retaliation
    ? Math.min(
        attacker.hp,
        roundHalfUpPublic(
          defenseOnCommon * BigInt(defenderRule.defense2) * 9n,
          total * 4n,
        ),
      )
    : 0;
  const attackerDies = damageToAttacker >= attacker.hp;
  const advances =
    defenderDies &&
    !attackerDies &&
    distance === 1 &&
    attacker.role !== "CATAPULT";
  const nextAttacks = attacker.activation.attacksUsed + 1;
  return {
    attackerId,
    targetUnitId,
    attack2,
    defense2,
    minimumRange: attackerRule.minimumRange,
    maximumRange: attackerRule.range,
    chargeApplied: attack2 > attackerRule.attack2,
    breachApplied,
    defenseBonusNumerator: applied.numerator,
    defenseBonusDenominator: applied.denominator,
    damageToDefender,
    damageToAttacker,
    defenderDies,
    attackerDies,
    retaliation,
    noRetaliationReason: defenderDies
      ? "DEFENDER_DIED"
      : retaliation
        ? null
        : "OUT_OF_RANGE",
    advances,
    push: publicPushState(
      view,
      attacker,
      target,
      !defenderDies && distance === 1,
    ),
    pursuitWillOpen:
      attacker.role === "LANCER" &&
      defenderDies &&
      !attackerDies &&
      nextAttacks < 3,
  };
}

function queryCombatPreviewAtV7(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  at: CoordV7,
  target: PlayerViewV7["units"][number],
): CombatPreviewV7 | null {
  return publicCombatPreview(
    {
      ...view,
      units: view.units.map((unit) =>
        unit.id === attacker.id ? { ...unit, at } : unit,
      ),
    },
    attacker.id,
    target.id,
  );
}

function publicPushState(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  defender: PlayerViewV7["units"][number],
  survivesMelee: boolean,
): CombatPreviewV7["push"] {
  if (
    !survivesMelee ||
    !effectiveRoleRuleV7(attacker.role).abilities.includes("PUSH")
  )
    return "BLOCKED";
  const behind = {
    x: defender.at.x * 2 - attacker.at.x,
    y: defender.at.y * 2 - attacker.at.y,
  };
  const tile = tileAtView(view, behind);
  if (tile === undefined) return "BLOCKED";
  if (!tile.explored) return "UNKNOWN_BEHIND_FOG";
  if (!publicDetectionCovers(view, behind)) return "UNKNOWN_BEHIND_FOG";
  if (
    tile.site !== null ||
    view.units.some(
      (unit) => unit.id !== defender.id && same(unit.at, behind),
    ) ||
    (tile.territoryOwnerId !== null &&
      publicAllied(view, defender.ownerId, tile.territoryOwnerId))
  )
    return "BLOCKED";
  if (tile.terrain === "MOUNTAIN" && defender.ownerId !== view.viewer.id)
    return "UNKNOWN_BEHIND_FOG";
  if (
    tile.terrain === "MOUNTAIN" &&
    !view.viewer.researchedTechs.includes("SURVEYING")
  )
    return "BLOCKED";
  return "WILL_PUSH";
}

function publicDetectionCovers(view: PlayerViewV7, at: CoordV7): boolean {
  return (
    view.cities.some(
      (city) => city.ownerId === view.viewer.id && chebyshev(city.at, at) <= 1,
    ) ||
    view.units.some(
      (unit) =>
        unit.ownerId === view.viewer.id &&
        chebyshev(unit.at, at) <= (unit.role === "SCOUT" ? 2 : 1),
    )
  );
}

function publicAllied(
  view: PlayerViewV7,
  left: PlayerId,
  right: PlayerId,
): boolean {
  return (
    left !== right &&
    view.setup.aiMode === "COOPERATIVE" &&
    left !== view.humanPlayerId &&
    right !== view.humanPlayerId
  );
}

function rationalToHalfUnits(value: {
  numerator: number;
  denominator: number;
}): number {
  const result = (value.numerator * 2) / value.denominator;
  if (!Number.isInteger(result)) throw new RangeError("Non-half-unit stat");
  return result;
}
function ratio(
  total: { numerator: number; denominator: number },
  base: { numerator: number; denominator: number },
) {
  return reduceRational(
    total.numerator * base.denominator,
    total.denominator * base.numerator,
  );
}
function reduceRational(numerator: number, denominator: number) {
  const divisor = gcdPublic(Math.abs(numerator), Math.abs(denominator));
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}
function gcdPublic(left: number, right: number): number {
  while (right !== 0) [left, right] = [right, left % right];
  return left || 1;
}
function roundHalfUpPublic(numerator: bigint, denominator: bigint): number {
  return Number((2n * numerator + denominator) / (2n * denominator));
}

function publicCommandTarget(view: PlayerViewV7, command: CommandV7): CoordV7 {
  if ("at" in command) return command.at;
  if ("path" in command) return command.path.at(-1) ?? { x: -1, y: -1 };
  if ("targetUnitId" in command)
    return (
      view.units.find((unit) => unit.id === command.targetUnitId)?.at ?? {
        x: -1,
        y: -1,
      }
    );
  if ("cityId" in command)
    return (
      view.cities.find((city) => city.id === command.cityId)?.at ?? {
        x: -1,
        y: -1,
      }
    );
  return { x: -1, y: -1 };
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
