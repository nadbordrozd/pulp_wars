import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  ORIGINAL_BASELINE_V5_TREE,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  TECHNOLOGY_BRANCH_IDS_V7,
  effectiveRoleRuleV7,
  technologyCapabilitiesV7,
  technologyResearchCostV7,
  type BasicEconomicCommandKindV7,
  type EffectiveRoleRuleV7,
  type SpatialEconomicCommandKindV7,
  type TechnologyBranchIdV7,
  type TechnologyCapabilitiesV7,
  type TechnologyUnlockV7,
} from "../rules/ruleset-v7";
import { compareCommandsV7, type CommandV7 } from "./commands";
import {
  assignedUnitCountV7,
  cityUnitCapacityV7,
  rewardCandidatesForLevelV7,
} from "./economy";
import { applyCommandV7 } from "./reducer";
import { calculateCombatPreviewV7 } from "./combat";
import type { CombatPreviewV7, DomainEventV7 } from "./events";
import { reachablePlayerMovementPathsV7 } from "./movement";
import {
  spatialContributionAtV7,
  type EconomyGraphV7,
  type EconomicFamilyV7,
  type OppositePairAxisV7,
} from "./spatial-economy";
import {
  COMMAND_KIND_ORDER_V7,
  ACHIEVEMENT_IDS_V7,
  REWARD_IDS_V7,
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

export type PublicTechnologyStateV7 =
  "OWNED" | "AVAILABLE" | "BLOCKED" | "DISABLED";
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
  readonly id: "ORIGINAL_BASELINE_V5";
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
    id: "ORIGINAL_BASELINE_V5",
    faction: "ORIGINAL",
    ownedCityCount,
    branches: TECHNOLOGY_BRANCH_IDS_V7,
    nodes: ORIGINAL_BASELINE_V5_TREE.nodes.map((node) => {
      const missingPrerequisites = node.prerequisites.filter(
        (tech) => !owned.has(tech),
      );
      const nodeState: PublicTechnologyStateV7 =
        view.setup.mapType === "DRY_LAND" &&
        node.branch === "NAVAL" &&
        !owned.has(node.id)
          ? "DISABLED"
          : owned.has(node.id)
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
    roleBindings: ORIGINAL_BASELINE_V5_TREE.roleRules,
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

const BASIC_KINDS = Object.keys(
  BASIC_ECONOMIC_ACTIONS_V7,
) as BasicEconomicCommandKindV7[];
const SPATIAL_KINDS = Object.keys(
  SPATIAL_ECONOMIC_ACTIONS_V7,
) as SpatialEconomicCommandKindV7[];
const TILE_KINDS = [
  ...BASIC_KINDS,
  ...SPATIAL_KINDS,
  "GATHER_PEARLS",
  "BUILD_PORT",
  "BUILD_SHIPYARD",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "CULTIVATE_FOREST",
  "BLAST_MOUNTAIN",
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
  const work = createPublicCommandWorkV7(view);
  return requiredPublicCommandWorkResultV7(
    work.advance(Number.MAX_SAFE_INTEGER),
  );
}

export interface PublicCommandWorkProgressV7 {
  readonly done: boolean;
  readonly operations: number;
  readonly commands: readonly CommandV7[] | null;
}
export interface PublicCommandWorkV7 {
  advance(maxOperations: number): PublicCommandWorkProgressV7;
}

/** Resumable exact command enumeration; one operation handles one tile, city, or unit. */
export function createPublicCommandWorkV7(
  view: PlayerViewV7,
): PublicCommandWorkV7 {
  return new IncrementalPublicCommandWorkV7(view);
}

class IncrementalPublicCommandWorkV7 implements PublicCommandWorkV7 {
  private readonly candidates: CommandV7[] = [];
  private unlocked: ReadonlySet<CommandV7["kind"]> = new Set();
  private phase: "TILES" | "CITIES" | "UNITS" | "DONE" = "TILES";
  private index = 0;
  private commands: readonly CommandV7[] | null = null;

  constructor(private readonly view: PlayerViewV7) {
    const cached = COMMAND_CACHE.get(view);
    if (cached !== undefined) {
      this.commands = cached;
      this.phase = "DONE";
      return;
    }
    const player = view.viewer;
    if (
      view.outcome !== null ||
      player.status !== "ACTIVE" ||
      view.turnOrder[view.activeSeatIndex] !== player.id
    ) {
      this.finish([]);
      return;
    }
    const head = view.pendingChoices[0];
    if (head !== undefined) {
      this.finish(
        head.candidates.map((reward): CommandV7 => ({
          kind: "CHOOSE_CITY_REWARD",
          cityId: head.cityId,
          reachedLevel: head.reachedLevel,
          reward,
        })),
      );
      return;
    }
    this.unlocked = new Set(queryTechnologyCapabilitiesV7(view).commands);
    for (const node of queryTechnologyTreeV7(view).nodes)
      if (node.state === "AVAILABLE" && node.affordable)
        this.candidates.push({ kind: "RESEARCH", tech: node.id });
  }

  advance(maxOperations: number): PublicCommandWorkProgressV7 {
    if (!Number.isSafeInteger(maxOperations) || maxOperations <= 0)
      throw new RangeError("maxOperations must be a positive safe integer");
    let operations = 0;
    while (operations < maxOperations && this.phase !== "DONE") {
      if (this.phase === "TILES") {
        const tile = this.view.board.tiles[this.index];
        if (tile === undefined) {
          this.phase = "CITIES";
          this.index = 0;
          continue;
        }
        appendPublicTileCommandsV7(
          this.view,
          tile,
          this.unlocked,
          this.candidates,
        );
      } else if (this.phase === "CITIES") {
        const city = this.view.cities[this.index];
        if (city === undefined) {
          this.phase = "UNITS";
          this.index = 0;
          continue;
        }
        appendPublicCityCommandsV7(this.view, city, this.candidates);
      } else {
        const unit = this.view.units[this.index];
        if (unit === undefined) {
          this.candidates.push({ kind: "END_TURN" });
          this.finish(this.candidates);
          continue;
        }
        appendPublicUnitCommandsV7(this.view, unit, this.candidates);
      }
      this.index += 1;
      operations += 1;
    }
    return {
      done: this.phase === "DONE",
      operations,
      commands: this.commands,
    };
  }

  private finish(commands: readonly CommandV7[]): void {
    this.commands = store(this.view, [...commands].sort(compareCommandsV7));
    this.phase = "DONE";
  }
}

function requiredPublicCommandWorkResultV7(
  progress: PublicCommandWorkProgressV7,
): readonly CommandV7[] {
  if (!progress.done || progress.commands === null)
    throw new RangeError("Public command work did not drain");
  return progress.commands;
}

function appendPublicTileCommandsV7(
  view: PlayerViewV7,
  tile: PlayerTileViewV7,
  unlocked: ReadonlySet<CommandV7["kind"]>,
  candidates: CommandV7[],
): void {
  if (!tile.explored) return;
  for (const kind of TILE_KINDS)
    if (publicTileCommandLegal(view, tile, kind, unlocked))
      candidates.push({ kind, at: tile.at } as CommandV7);
  const monumentCity = view.cities.find(
    (city) => city.id === tile.territoryCityId,
  );
  if (
    monumentCity?.ownerId === view.viewer.id &&
    !publicCityBesieged(view, monumentCity.at) &&
    publicCityDevelopmentFootprintKnown(view, monumentCity) &&
    !view.pendingChoices.some((choice) => choice.cityId === monumentCity.id) &&
    tile.biome !== null &&
    (tile.terrain !== "MOUNTAIN" ||
      view.viewer.researchedTechs.includes("ENGINEERING")) &&
    !view.treasureChests.some((chest) => same(chest, tile.at)) &&
    tile.site === null &&
    tile.resource === null &&
    tile.improvement === null &&
    !cityHasImprovement(view, monumentCity.id, "MONUMENT")
  )
    for (const entitlement of view.viewer.achievementEntitlements)
      if (entitlement.unlocked && !entitlement.spent)
        candidates.push({
          kind: "BUILD_MONUMENT",
          achievement: entitlement.achievement,
          at: tile.at,
        });
}

function appendPublicCityCommandsV7(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
  candidates: CommandV7[],
): void {
  const player = view.viewer;
  if (city.ownerId !== player.id || publicCityBesieged(view, city.at)) return;
  const centerBlocked = view.units.some(
    (unit) => unit.ownerId !== player.id && same(unit.at, city.at),
  );
  const capacity =
    city.level + 1 + (player.researchedTechs.includes("PLANNING") ? 1 : 0);
  const assigned = view.units.filter(
    (unit) => unit.ownerId === player.id && unit.homeCityId === city.id,
  ).length;
  if (
    player.researchedTechs.includes("PLANNING") &&
    city.level >= 3 &&
    !city.landGrantUsed &&
    player.coins >= 6 &&
    !view.pendingChoices.some((choice) => choice.cityId === city.id) &&
    view.board.tiles.some(
      (tile) =>
        Math.abs(tile.at.x - city.at.x) <= 2 &&
        Math.abs(tile.at.y - city.at.y) <= 2 &&
        tile.explored &&
        tile.territoryCityId === null,
    )
  )
    candidates.push({ kind: "LAND_GRANT", cityId: city.id });
  if (assigned >= capacity) return;
  const forgeDiscount = view.improvementValues.some(
    (value) =>
      value.improvement === "FORGE" &&
      value.level > 0 &&
      (() => {
        const tile = tileAtView(view, value.at);
        return tile?.explored === true && tile.territoryCityId === city.id;
      })(),
  );
  for (const role of UNIT_ROLE_IDS_V7) {
    const rule = effectiveRoleRuleV7(role);
    if (
      !centerBlocked &&
      role !== "PATROL_BOAT" &&
      role !== "BATTLESHIP" &&
      rule.cost !== null &&
      rule.cost - (forgeDiscount ? 1 : 0) <= player.coins &&
      (rule.technology === null ||
        player.researchedTechs.includes(rule.technology))
    )
      candidates.push({ kind: "TRAIN", cityId: city.id, role });
  }
  for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const) {
    const rule = effectiveRoleRuleV7(role);
    if (
      rule.cost !== null &&
      (rule.technology === null ||
        player.researchedTechs.includes(rule.technology))
    )
      for (const port of view.board.tiles)
        if (
          publicActiveOwnedPort(view, port, player.id) &&
          port.explored &&
          port.territoryCityId === city.id &&
          !view.units.some((unit) => same(unit.at, port.at)) &&
          rule.cost - (port.improvement === "SHIPYARD" ? 2 : 0) <= player.coins
        )
          candidates.push({
            kind: "TRAIN_NAVAL",
            cityId: city.id,
            at: port.at,
            role,
          });
  }
}

function appendPublicUnitCommandsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  candidates: CommandV7[],
): void {
  const player = view.viewer;
  if (unit.ownerId !== player.id) return;
  const overrun = unit.activation.overrunActive;
  if (!overrun && unit.form === "EMBARKED" && !unit.activation.handled)
    for (const tile of adjacentPublicTiles(view, unit.at))
      if (
        tile.explored &&
        tile.biome !== null &&
        !(
          tile.terrain === "MOUNTAIN" &&
          !player.researchedTechs.includes("ENGINEERING")
        ) &&
        (tile.territoryOwnerId === null ||
          tile.territoryOwnerId === player.id ||
          !publicAllied(view, player.id, tile.territoryOwnerId)) &&
        !view.units.some((candidate) => same(candidate.at, tile.at))
      )
        candidates.push({ kind: "DISEMBARK", unitId: unit.id, at: tile.at });
  if (!overrun && !unit.activation.moved && !primaryUsedForQuery(unit))
    for (const reachable of reachablePlayerMovementPathsV7(view, unit))
      candidates.push({ kind: "MOVE", unitId: unit.id, path: reachable.path });
  const rule = effectiveRoleRuleV7(unit.role);
  const primaryReady =
    !primaryUsedForQuery(unit) &&
    (!unit.activation.moved || rule.mayUsePrimaryActionAfterMove);
  const attackReady =
    unit.form !== "EMBARKED" && (primaryReady || unit.activation.overrunActive);
  for (const target of view.units) {
    const distance = chebyshev(unit.at, target.at);
    if (
      attackReady &&
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
  }
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("RALLY") &&
    view.units.some((target) => {
      const targetRole = effectiveRoleRuleV7(target.role).tacticalRole;
      return (
        target.ownerId === player.id &&
        target.form === "LAND" &&
        target.id !== unit.id &&
        !target.activation.inspired &&
        targetRole !== "SUPPORT" &&
        targetRole !== "SIEGE" &&
        chebyshev(unit.at, target.at) === 1
      );
    })
  )
    candidates.push({ kind: "RALLY", unitId: unit.id });
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("TEND_WOUNDED") &&
    view.units.some(
      (target) =>
        target.ownerId === player.id &&
        target.form === "LAND" &&
        target.id !== unit.id &&
        target.hp < target.maxHp &&
        !target.activation.tendedThisTurn &&
        chebyshev(unit.at, target.at) === 1,
    )
  )
    candidates.push({ kind: "TEND_WOUNDED", unitId: unit.id });
  if (overrun) return;
  if (
    !unit.activation.moved &&
    !primaryUsedForQuery(unit) &&
    unit.hp < unit.maxHp &&
    unit.form !== "EMBARKED" &&
    (unit.form !== "NAVAL" ||
      [tileAtView(view, unit.at), ...adjacentPublicTiles(view, unit.at)].some(
        (tile) =>
          tile !== undefined && publicActiveOwnedPort(view, tile, player.id),
      ))
  )
    candidates.push({ kind: "RECOVER", unitId: unit.id });
  if (
    !unit.activation.moved &&
    !primaryUsedForQuery(unit) &&
    unit.captureEligible &&
    publicCaptureTarget(view, unit.at)
  )
    candidates.push({ kind: "CAPTURE", unitId: unit.id });
  if (unit.form !== "EMBARKED" && unit.kills >= 3 && !unit.veteran)
    candidates.push({ kind: "PROMOTE", unitId: unit.id });
  const tile = tileAtView(view, unit.at);
  if (
    ((unit.role === "RAIDER" && player.researchedTechs.includes("RAIDING")) ||
      player.researchedTechs.includes("EXPLOSIVES")) &&
    unit.form === "LAND" &&
    unit.role !== "JUGGERNAUT" &&
    !primaryUsedForQuery(unit) &&
    tile?.explored === true &&
    tile.improvement !== null &&
    tile.territoryOwnerId !== null &&
    publicHostile(view, player.id, tile.territoryOwnerId)
  )
    candidates.push({ kind: "PILLAGE", unitId: unit.id });
  if (
    player.researchedTechs.includes("ADMINISTRATION") &&
    !primaryUsedForQuery(unit) &&
    unit.form === "LAND" &&
    unit.role !== "JUGGERNAUT"
  )
    candidates.push({ kind: "DISBAND", unitId: unit.id });
  if (
    !unit.activation.moved &&
    !primaryUsedForQuery(unit) &&
    unit.form === "LAND" &&
    (unit.role === "FIGHTER" || unit.role === "GUARD") &&
    player.researchedTechs.includes("FORTIFICATION") &&
    tile?.explored === true &&
    tile.biome !== null &&
    tile.territoryOwnerId === player.id &&
    !tile.fieldDefense &&
    player.coins >= 3
  )
    candidates.push({ kind: "BUILD_FIELD_DEFENSE", unitId: unit.id });
  if (!unit.activation.handled)
    candidates.push({ kind: "WAIT", unitId: unit.id });
}

function publicActiveOwnedPort(
  view: PlayerViewV7,
  tile: PlayerTileViewV7,
  ownerId: PlayerId,
): boolean {
  return (
    tile.explored &&
    (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
    tile.territoryOwnerId === ownerId &&
    !view.units.some(
      (unit) =>
        same(unit.at, tile.at) &&
        unit.form !== "LAND" &&
        publicHostile(view, ownerId, unit.ownerId),
    )
  );
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
  const tile = tileAtView(view, command.at);
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
    rewardWork.push({
      kind: "CITY_REWARD_QUEUED",
      cityId: city.id,
      reachedLevel,
      candidates: rewardCandidatesForLevelV7(reachedLevel),
    });
    break;
  }
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
  if (!publicCommandOfferingAllowedV7(view)) return null;
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
    attacker.form === "EMBARKED" ||
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
            ? REWARD_IDS_V7.indexOf(command.reward)
            : command.kind === "BUILD_MONUMENT"
              ? ACHIEVEMENT_IDS_V7.indexOf(command.achievement)
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

/** Geometry-safe threat envelope for movement plus attack range. */
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
  return [
    ...new Map(direct.map((at) => [`${at.y},${at.x}`, at])).values(),
  ].sort((a, b) => a.y - b.y || a.x - b.x);
}

function primaryUsedForQuery(unit: Pick<UnitStateV7, "activation">): boolean {
  return (
    unit.activation.attacked ||
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
  readonly ownerCityId: CityId | null;
  readonly populationDeltaByCity: readonly CityValueDeltaV7[];
  readonly coinIncomeDeltaByCity: readonly CityValueDeltaV7[];
  readonly resultingContribution: number;
  readonly outputTransitions: readonly EconomicOutputTransitionV7[];
  readonly resourceRestored:
    "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null;
  readonly levelsReached: readonly number[];
  readonly distinctTypes: readonly ImprovementIdV7[];
  readonly distinctFamilies: readonly EconomicFamilyV7[];
  readonly contributingTiles: readonly CoordV7[];
  readonly oppositePairAxes: readonly OppositePairAxisV7[];
  readonly capitalRoadConnected: boolean;
  readonly buildingLimitReached: false;
  readonly complete: true;
}
export interface EconomicOutputTransitionV7 {
  readonly at: CoordV7;
  readonly improvement: ImprovementIdV7;
  readonly measure: "POPULATION" | "COIN_INCOME";
  readonly before: number;
  readonly after: number;
  readonly change: "CREATED" | "REMOVED" | "OUTAGE" | "RESUMED" | "CHANGED";
}
export type EconomicPreviewResultV7 =
  | { readonly ok: true; readonly preview: EconomicPreviewV7 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

export function previewEconomicV7(
  view: PlayerViewV7,
  command: CommandV7,
): EconomicPreviewResultV7;
export function previewEconomicV7(
  state: GameStateV7,
  viewerId: PlayerId,
  command: CommandV7,
): EconomicPreviewResultV7;
export function previewEconomicV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrCommand: PlayerId | CommandV7,
  maybeCommand?: CommandV7,
): EconomicPreviewResultV7 {
  const view =
    maybeCommand === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrCommand as PlayerId);
  const command = maybeCommand ?? (viewerOrCommand as CommandV7);
  let cachedForView = PUBLIC_ECONOMIC_PREVIEWS.get(view);
  if (cachedForView === undefined) {
    cachedForView = new Map();
    PUBLIC_ECONOMIC_PREVIEWS.set(view, cachedForView);
  }
  const cacheKey = JSON.stringify(command);
  const cached = cachedForView.get(cacheKey);
  if (cached !== undefined) return cached;
  const result = calculatePublicEconomicPreviewV7(view, command);
  cachedForView.set(cacheKey, result);
  return result;
}

function calculatePublicEconomicPreviewV7(
  view: PlayerViewV7,
  command: CommandV7,
): EconomicPreviewResultV7 {
  if (!("at" in command) || !TILE_KINDS.includes(command.kind as never))
    return { ok: false, error: "NOT_OFFERED" };
  const offered = queryPlayerCommandsV7(view).some(
    (candidate) =>
      candidate.kind === command.kind &&
      "at" in candidate &&
      same(candidate.at, command.at),
  );
  if (!offered || !publicEconomicPreviewExact(view, command))
    return { ok: false, error: "NOT_OFFERED" };
  const tile = tileAtView(view, command.at);
  const neutralRoad =
    command.kind === "BUILD_ROAD" &&
    tile?.explored === true &&
    tile.territoryCityId === null &&
    tile.territoryOwnerId === null;
  if (
    tile?.explored !== true ||
    (tile.territoryCityId === null && !neutralRoad)
  )
    return { ok: false, error: "NOT_OFFERED" };
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined && !neutralRoad)
    return { ok: false, error: "NOT_OFFERED" };
  const beforeGraph = publicEconomyGraph(view);
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[command.kind as BasicEconomicCommandKindV7];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[command.kind as SpatialEconomicCommandKindV7];
  const improvement =
    command.kind === "BUILD_PORT"
      ? ("PORT" as const)
      : command.kind === "BUILD_SHIPYARD"
        ? ("SHIPYARD" as const)
        : (basic?.improvement ?? spatial?.improvement ?? null);
  const cost =
    basic?.cost ??
    spatial?.cost ??
    (command.kind === "GATHER_PEARLS"
      ? 2
      : command.kind === "BUILD_PORT"
        ? 4
        : command.kind === "BUILD_SHIPYARD"
          ? 5
          : command.kind === "BUILD_ROAD"
            ? 2
            : command.kind === "REPLANT_FOREST"
              ? 4
              : command.kind === "CULTIVATE_FOREST"
                ? 4
                : command.kind === "BLAST_MOUNTAIN"
                  ? 3
                  : 0);
  const afterGraph = graphAfterTileCommandV7(view, beforeGraph, command, tile);
  if (afterGraph === null) return { ok: false, error: "NOT_OFFERED" };
  const evaluation =
    improvement !== null && improvement !== "PORT" && improvement !== "SHIPYARD"
      ? spatialContributionAtV7(afterGraph, command.at, improvement)
      : null;
  try {
    const populationDeltaByCity: CityValueDeltaV7[] = [];
    const coinIncomeDeltaByCity: CityValueDeltaV7[] = [];
    const levelsReached: number[] = [];
    const changesLiveGraph = economicCommandChangesLiveGraphV7(command.kind);
    for (const candidate of view.cities
      .filter((value) => value.ownerId === view.viewer.id)
      .sort((left, right) => left.id - right.id)) {
      const permanentDelta =
        candidate.id === city?.id && basic?.populationCategory === "PERMANENT"
          ? basic.population
          : 0;
      const liveDelta = changesLiveGraph
        ? liveTotalForCityV7(afterGraph, candidate.id) -
          liveTotalForCityV7(beforeGraph, candidate.id)
        : 0;
      const delta = permanentDelta + liveDelta;
      const growth = resolvePublicCityGrowthV7(
        candidate,
        candidate.permanentPopulation + permanentDelta,
        candidate.economicPopulation + liveDelta,
      );
      const incomeDelta = changesLiveGraph
        ? publicCityIncomeV7(
            view,
            growth.city,
            marketForCityV7(afterGraph, candidate.id),
            Number(
              publicGraphNavalConnectivityV7(afterGraph).landTrade.has(
                candidate.id,
              ),
            ) +
              Number(
                publicGraphNavalConnectivityV7(afterGraph).seaTrade.has(
                  candidate.id,
                ),
              ),
          ) -
          publicCityIncomeV7(
            view,
            candidate,
            marketForCityV7(beforeGraph, candidate.id),
            Number(
              publicGraphNavalConnectivityV7(beforeGraph).landTrade.has(
                candidate.id,
              ),
            ) +
              Number(
                publicGraphNavalConnectivityV7(beforeGraph).seaTrade.has(
                  candidate.id,
                ),
              ),
          )
        : exactIncomeDeltaWithUnchangedMarketV7(view, candidate, growth.city);
      if (incomeDelta === null) throw new RangeError("PUBLIC_GRAPH_AMBIGUOUS");
      if (delta !== 0)
        populationDeltaByCity.push({ cityId: candidate.id, delta });
      if (incomeDelta !== 0)
        coinIncomeDeltaByCity.push({
          cityId: candidate.id,
          delta: incomeDelta,
        });
      levelsReached.push(...growth.reachedLevels);
    }
    const immediateCoins = command.kind === "CLEAR_FOREST" ? 1 : 0;
    const coinsAfterAutomaticRewards =
      BigInt(view.viewer.coins) - BigInt(cost) + BigInt(immediateCoins);
    if (coinsAfterAutomaticRewards > BigInt(Number.MAX_SAFE_INTEGER))
      throw new RangeError("INTEGER_OVERFLOW");
    return {
      ok: true,
      preview: {
        at: command.at,
        cost,
        ownerCityId: tile.territoryCityId,
        populationDeltaByCity,
        coinIncomeDeltaByCity,
        resultingContribution:
          command.kind === "BUILD_PORT"
            ? 1
            : (evaluation?.population ?? basic?.population ?? 0),
        outputTransitions: economicOutputTransitionsV7(
          view,
          beforeGraph,
          afterGraph,
        ),
        resourceRestored:
          command.kind === "REDEVELOP"
            ? publicRestoredResourceV7(view, tile.terrain, tile.improvement)
            : null,
        levelsReached,
        distinctTypes:
          evaluation?.distinctTypes ??
          (improvement === null ? [] : [improvement]),
        distinctFamilies: evaluation?.distinctFamilies ?? [],
        contributingTiles:
          evaluation?.contributingTiles ??
          (basic !== undefined ? [command.at] : []),
        oppositePairAxes: evaluation?.oppositePairAxes ?? [],
        capitalRoadConnected:
          (improvement === "MARKET" || command.kind === "BUILD_ROAD") &&
          publicGraphNeighborCoordsV7(afterGraph, command.at).some((at) =>
            publicGraphNavalConnectivityV7(afterGraph).roadKeys.has(
              coordKeyV7(at),
            ),
          ),
        buildingLimitReached: false,
        complete: true,
      },
    };
  } catch {
    return { ok: false, error: "NOT_OFFERED" };
  }
}

function publicEconomicPreviewExact(
  view: PlayerViewV7,
  command: Extract<CommandV7, { at: CoordV7 }>,
): boolean {
  const tile = tileAtView(view, command.at);
  const neutralRoad =
    command.kind === "BUILD_ROAD" &&
    tile?.explored === true &&
    tile.territoryCityId === null &&
    tile.territoryOwnerId === null;
  if (
    tile?.explored !== true ||
    (tile.territoryCityId === null && !neutralRoad)
  )
    return false;
  if (neutralRoad && !view.board.tiles.every((candidate) => candidate.explored))
    return false;
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined && !neutralRoad) return false;
  // A changed improvement can affect adjacent same-owner processors and other
  // adjacent same-owner buildings across city borders. Every
  // tile in every owned city footprint must therefore be public before a
  // canonical reducer result can be reported as an exact public preview.
  const changesImprovementGraph =
    command.kind === "REDEVELOP" ||
    command.kind === "BUILD_ROAD" ||
    command.kind === "BUILD_FARM" ||
    command.kind === "BUILD_LUMBER_CAMP" ||
    command.kind === "BUILD_MINE" ||
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

  return true;
}

function economicCommandChangesLiveGraphV7(kind: CommandV7["kind"]): boolean {
  return (
    kind === "BUILD_FARM" ||
    kind === "BUILD_LUMBER_CAMP" ||
    kind === "BUILD_MINE" ||
    kind === "BUILD_PORT" ||
    kind === "BUILD_SHIPYARD" ||
    kind === "BUILD_ROAD" ||
    kind === "REDEVELOP" ||
    kind === "CULTIVATE_FOREST" ||
    kind === "BLAST_MOUNTAIN" ||
    kind in SPATIAL_ECONOMIC_ACTIONS_V7
  );
}

type PublicEconomyGraphTileV7 = EconomyGraphV7["board"]["tiles"][number] & {
  readonly explored: boolean;
  readonly terrain:
    Extract<PlayerTileViewV7, { explored: true }>["terrain"] | null;
  readonly resource:
    Extract<PlayerTileViewV7, { explored: true }>["resource"] | null;
  readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
  readonly territoryOwnerId: PlayerId | null;
};
type PublicEconomyGraphV7 = {
  readonly board: {
    readonly width: number;
    readonly height: number;
    readonly tiles: readonly PublicEconomyGraphTileV7[];
  };
  readonly cities: PlayerViewV7["cities"];
  readonly ownerId: PlayerId;
  readonly originalCapitalCityId: CityId;
  readonly researchedTechs: PlayerViewV7["viewer"]["researchedTechs"];
  readonly activePortKeys: ReadonlySet<string>;
  readonly resolvedPendingCityIds: ReadonlySet<CityId>;
  readonly remainingMonumentEntitlements: number;
};

const PUBLIC_ECONOMY_GRAPHS = new WeakMap<PlayerViewV7, PublicEconomyGraphV7>();
const PUBLIC_ECONOMIC_PREVIEWS = new WeakMap<
  PlayerViewV7,
  Map<string, EconomicPreviewResultV7>
>();
const PUBLIC_SPATIAL_SCORES = new WeakMap<PlayerViewV7, Map<string, number>>();
const PUBLIC_SPATIAL_BASELINES = new WeakMap<PlayerViewV7, number>();
const PUBLIC_REDEVELOPMENT_CHANGES = new WeakMap<
  PlayerViewV7,
  Map<string, boolean>
>();
const PUBLIC_ECONOMIC_POTENTIALS = new WeakMap<
  PlayerViewV7,
  readonly PublicEconomicPotentialV7[]
>();
const PUBLIC_GRAPH_TOTALS = new WeakMap<
  PublicEconomyGraphV7,
  Map<
    PlayerId,
    { readonly population: number; readonly recurringCoins: number }
  >
>();
const PUBLIC_GRAPH_NAVAL_CONNECTIVITY = new WeakMap<
  PublicEconomyGraphV7,
  {
    readonly network: ReadonlySet<CityId>;
    readonly landTrade: ReadonlySet<CityId>;
    readonly seaTrade: ReadonlySet<CityId>;
    readonly roadKeys: ReadonlySet<string>;
  }
>();

function publicEconomyGraph(view: PlayerViewV7): PublicEconomyGraphV7 {
  const cached = PUBLIC_ECONOMY_GRAPHS.get(view);
  if (cached !== undefined) return cached;
  const graph: PublicEconomyGraphV7 = {
    board: {
      width: view.board.width,
      height: view.board.height,
      tiles: view.board.tiles.map((tile): PublicEconomyGraphTileV7 =>
        tile.explored
          ? {
              at: tile.at,
              explored: true,
              terrain: tile.terrain,
              resource: tile.resource,
              improvement: tile.improvement,
              road: tile.road,
              site: tile.site,
              territoryCityId: tile.territoryCityId,
              territoryOwnerId: tile.territoryOwnerId,
            }
          : {
              at: tile.at,
              explored: false,
              terrain: null,
              resource: null,
              improvement: null,
              road: false,
              site: null,
              territoryCityId: null,
              territoryOwnerId: null,
            },
      ),
    },
    cities: view.cities,
    ownerId: view.viewer.id,
    originalCapitalCityId: view.viewer.originalCapitalCityId,
    researchedTechs: view.viewer.researchedTechs,
    activePortKeys: new Set(
      view.naval.ownedPorts
        .filter((port) => port.status === "ACTIVE")
        .map((port) => coordKeyV7(port.at)),
    ),
    resolvedPendingCityIds: new Set(),
    remainingMonumentEntitlements: view.viewer.achievementEntitlements.filter(
      (entitlement) => entitlement.unlocked && !entitlement.spent,
    ).length,
  };
  PUBLIC_ECONOMY_GRAPHS.set(view, graph);
  return graph;
}

function replacePublicGraphTileV7(
  graph: PublicEconomyGraphV7,
  at: CoordV7,
  replacement: Partial<PublicEconomyGraphTileV7>,
): PublicEconomyGraphV7 {
  return {
    ...graph,
    board: {
      ...graph.board,
      tiles: graph.board.tiles.map((tile) =>
        same(tile.at, at) ? { ...tile, ...replacement, at: tile.at } : tile,
      ),
    },
  };
}

function graphAfterTileCommandV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  command: Extract<CommandV7, { at: CoordV7 }>,
  tile = graph.board.tiles.find((candidate) => same(candidate.at, command.at)),
): PublicEconomyGraphV7 | null {
  if (tile === undefined || !tile.explored) return null;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[command.kind as BasicEconomicCommandKindV7];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[command.kind as SpatialEconomicCommandKindV7];
  if (basic !== undefined)
    return replacePublicGraphTileV7(graph, command.at, {
      resource: projectedResourceAfterMutationV7(view, tile.terrain, null),
      improvement:
        command.kind === "HARVEST_FISH" &&
        (tile.improvement === "PORT" || tile.improvement === "SHIPYARD")
          ? tile.improvement
          : basic.improvement,
    });
  if (command.kind === "GATHER_PEARLS")
    return replacePublicGraphTileV7(graph, command.at, { resource: null });
  if (command.kind === "BUILD_PORT") {
    const next = replacePublicGraphTileV7(graph, command.at, {
      improvement: "PORT",
    });
    const blockaded = view.units.some(
      (unit) =>
        unit.form !== "LAND" &&
        same(unit.at, command.at) &&
        publicHostile(view, view.viewer.id, unit.ownerId),
    );
    return {
      ...next,
      activePortKeys: blockaded
        ? graph.activePortKeys
        : new Set([...graph.activePortKeys, coordKeyV7(command.at)]),
    };
  }
  if (command.kind === "BUILD_SHIPYARD")
    return replacePublicGraphTileV7(graph, command.at, {
      improvement: "SHIPYARD",
    });
  if (spatial !== undefined)
    return replacePublicGraphTileV7(graph, command.at, {
      improvement: spatial.improvement,
    });
  if (command.kind === "CLEAR_FOREST")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "GRASS",
      resource: projectedResourceAfterMutationV7(view, "GRASS", null),
    });
  if (command.kind === "REPLANT_FOREST")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "FOREST",
      resource: projectedResourceAfterMutationV7(view, "FOREST", null),
    });
  if (command.kind === "CULTIVATE_FOREST")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "GRASS",
      resource: "FERTILE_GROUND",
    });
  if (command.kind === "BLAST_MOUNTAIN")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "GRASS",
      resource: null,
    });
  if (command.kind === "BUILD_ROAD")
    return replacePublicGraphTileV7(graph, command.at, { road: true });
  if (command.kind === "REDEVELOP") {
    const next = replacePublicGraphTileV7(graph, command.at, {
      improvement: null,
      resource:
        tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
          ? tile.resource
          : publicRestoredResourceV7(view, tile.terrain, tile.improvement),
    });
    if (tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD")
      return next;
    const activePortKeys = new Set(graph.activePortKeys);
    activePortKeys.delete(coordKeyV7(command.at));
    return { ...next, activePortKeys };
  }
  return null;
}

function liveTotalForCityV7(
  graph: PublicEconomyGraphV7,
  cityId: CityId,
): number {
  const improvementPopulation = graph.board.tiles
    .filter(
      (tile) => tile.territoryCityId === cityId && tile.improvement !== null,
    )
    .reduce((total, tile) => {
      const improvement = tile.improvement;
      if (improvement === null) return total;
      const value =
        total +
        (improvement === "PORT" || improvement === "SHIPYARD"
          ? graph.activePortKeys.has(coordKeyV7(tile.at))
            ? improvement === "SHIPYARD"
              ? 2
              : 1
            : 0
          : spatialContributionAtV7(graph, tile.at, improvement).population);
      if (!Number.isSafeInteger(value))
        throw new RangeError("INTEGER_OVERFLOW");
      return value;
    }, 0);
  const total = improvementPopulation;
  if (!Number.isSafeInteger(total)) throw new RangeError("INTEGER_OVERFLOW");
  return total;
}

function marketForCityV7(graph: PublicEconomyGraphV7, cityId: CityId): number {
  return graph.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === cityId && tile.improvement === "MARKET",
    )
    .reduce((total, tile) => {
      const evaluation = spatialContributionAtV7(graph, tile.at, "MARKET");
      const value = total + Math.min(4, evaluation.marketIncome);
      if (!Number.isSafeInteger(value))
        throw new RangeError("INTEGER_OVERFLOW");
      return value;
    }, 0);
}

function publicGraphNavalConnectivityV7(graph: PublicEconomyGraphV7): {
  readonly network: ReadonlySet<CityId>;
  readonly landTrade: ReadonlySet<CityId>;
  readonly seaTrade: ReadonlySet<CityId>;
  readonly roadKeys: ReadonlySet<string>;
} {
  const cached = PUBLIC_GRAPH_NAVAL_CONNECTIVITY.get(graph);
  if (cached !== undefined) return cached;
  const ownedCities = graph.cities.filter(
    (city) => city.ownerId === graph.ownerId,
  );
  const ownedIds = new Set(ownedCities.map((city) => city.id));
  const legalWater = new Set(
    graph.board.tiles
      .filter(
        (tile) =>
          tile.explored &&
          tile.terrain !== null &&
          (tile.terrain === "SHALLOW_WATER" ||
            (tile.terrain === "DEEP_WATER" &&
              graph.researchedTechs.includes("NAVIGATION"))),
      )
      .map((tile) => coordKeyV7(tile.at)),
  );
  const ports = graph.researchedTechs.includes("NAVIGATION")
    ? graph.board.tiles.filter(
        (tile) =>
          (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
          tile.territoryCityId !== null &&
          ownedIds.has(tile.territoryCityId) &&
          graph.activePortKeys.has(coordKeyV7(tile.at)) &&
          legalWater.has(coordKeyV7(tile.at)),
      )
    : [];
  const seaEdges = new Map<CityId, Set<CityId>>();
  const edges = new Map<CityId, Set<CityId>>();
  const connect = (
    target: Map<CityId, Set<CityId>>,
    left: CityId,
    right: CityId,
  ) => {
    const values = target.get(left) ?? new Set<CityId>();
    values.add(right);
    target.set(left, values);
  };
  const portsByCoordinate = new Map(
    ports.map((port) => [coordKeyV7(port.at), port] as const),
  );
  for (const from of ports) {
    const fromCityId = from.territoryCityId;
    if (fromCityId === null) continue;
    const queue = [from.at];
    const distance = new Map<string, number>([[coordKeyV7(from.at), 0]]);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) break;
      const currentDistance = distance.get(coordKeyV7(current));
      if (currentDistance === undefined) continue;
      const destination = portsByCoordinate.get(coordKeyV7(current));
      const destinationCityId = destination?.territoryCityId ?? null;
      if (destinationCityId !== null && destinationCityId !== fromCityId) {
        connect(seaEdges, fromCityId, destinationCityId);
      }
      if (currentDistance >= 5) continue;
      for (const near of publicGraphNeighborCoordsV7(graph, current)) {
        const nearKey = coordKeyV7(near);
        if (legalWater.has(nearKey) && !distance.has(nearKey)) {
          distance.set(nearKey, currentDistance + 1);
          queue.push(near);
        }
      }
    }
  }
  const cityAt = new Map(
    ownedCities.map((city) => [coordKeyV7(city.at), city.id] as const),
  );
  const roads = new Set(
    graph.board.tiles
      .filter(
        (tile) =>
          tile.road &&
          graph.researchedTechs.includes("ROADS") &&
          (tile.territoryCityId === null || ownedIds.has(tile.territoryCityId)),
      )
      .map((tile) => coordKeyV7(tile.at)),
  );
  if (graph.researchedTechs.includes("ROADS"))
    for (const at of cityAt.keys()) roads.add(at);
  const roadComponents: {
    readonly keys: ReadonlySet<string>;
    readonly cityIds: readonly CityId[];
  }[] = [];
  for (const component of publicGraphComponentsV7(graph, roads)) {
    const cityIds = [...component]
      .map((at) => cityAt.get(at))
      .filter((id): id is CityId => id !== undefined);
    for (const left of cityIds)
      for (const right of cityIds)
        if (left !== right) connect(edges, left, right);
    roadComponents.push({ keys: component, cityIds });
  }
  const originalCapital = ownedCities.find(
    (city) => city.id === graph.originalCapitalCityId,
  );
  const roots = originalCapital === undefined ? [] : [originalCapital.id];
  const network = new Set<CityId>(roots);
  const queue = [...roots];
  for (let index = 0; index < queue.length; index += 1) {
    const cityId = queue[index];
    if (cityId === undefined) break;
    for (const next of edges.get(cityId) ?? [])
      if (!network.has(next)) {
        network.add(next);
        queue.push(next);
      }
  }
  const landTrade = graph.researchedTechs.includes("COMMERCE")
    ? new Set([...network].filter((cityId) => !roots.includes(cityId)))
    : new Set<CityId>();
  const seaTrade = new Set(
    ownedCities
      .map((city) => city.id)
      .filter(
        (cityId) =>
          !roots.includes(cityId) && (seaEdges.get(cityId)?.size ?? 0) > 0,
      ),
  );
  const roadKeys = new Set<string>();
  for (const component of roadComponents)
    if (component.cityIds.some((cityId) => network.has(cityId)))
      for (const at of component.keys) roadKeys.add(at);
  const result = { network, landTrade, seaTrade, roadKeys };
  PUBLIC_GRAPH_NAVAL_CONNECTIVITY.set(graph, result);
  return result;
}

function publicGraphNeighborCoordsV7(
  graph: PublicEconomyGraphV7,
  at: CoordV7,
): readonly CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1)
      if (
        (x !== at.x || y !== at.y) &&
        x >= 0 &&
        y >= 0 &&
        x < graph.board.width &&
        y < graph.board.height
      )
        result.push({ x, y });
  return result;
}

function publicGraphComponentsV7(
  graph: PublicEconomyGraphV7,
  available: ReadonlySet<string>,
): readonly ReadonlySet<string>[] {
  const left = new Set(available);
  const result: Set<string>[] = [];
  while (left.size > 0) {
    const first = left.values().next().value as string;
    const [y, x] = first.split(",").map(Number);
    if (x === undefined || y === undefined)
      throw new RangeError("INVALID_STATE");
    const queue = [{ x, y }];
    const component = new Set<string>();
    left.delete(first);
    for (let index = 0; index < queue.length; index += 1) {
      const at = queue[index];
      if (at === undefined) break;
      component.add(coordKeyV7(at));
      for (let dy = -1; dy <= 1; dy += 1)
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const near = { x: at.x + dx, y: at.y + dy };
          if (
            near.x >= 0 &&
            near.y >= 0 &&
            near.x < graph.board.width &&
            near.y < graph.board.height &&
            left.delete(coordKeyV7(near))
          )
            queue.push(near);
        }
    }
    result.push(component);
  }
  return result;
}

function resolvePublicCityGrowthV7(
  city: PlayerViewV7["cities"][number],
  permanentPopulation: number,
  economicPopulation: number,
) {
  const total = permanentPopulation + economicPopulation;
  if (
    !Number.isSafeInteger(permanentPopulation) ||
    permanentPopulation < 0 ||
    !Number.isSafeInteger(economicPopulation) ||
    economicPopulation < 0 ||
    !Number.isSafeInteger(total)
  )
    throw new RangeError("INTEGER_OVERFLOW");
  let level = city.level;
  const reachedLevels: number[] = [];
  while (total - growthSpentForPreview(level) >= level + 1) {
    level += 1;
    if (!Number.isSafeInteger(level)) throw new RangeError("INTEGER_OVERFLOW");
    reachedLevels.push(level);
  }
  const population = total - growthSpentForPreview(level);
  if (!Number.isSafeInteger(population))
    throw new RangeError("INTEGER_OVERFLOW");
  return {
    city: {
      ...city,
      level,
      permanentPopulation,
      economicPopulation,
      population,
    },
    reachedLevels,
  };
}

function publicCityIncomeV7(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
  market: number,
  tradeBonuses = Number(view.naval.landTradeCityIds.includes(city.id)) +
    Number(view.naval.seaTradeCityIds.includes(city.id)),
): number {
  if (publicCityBesieged(view, city.at)) return 0;
  const result = Math.max(
    1,
    city.level +
      (city.isCapital ? 1 : 0) +
      tradeBonuses +
      market +
      Math.min(0, city.population),
  );
  if (!Number.isSafeInteger(result)) throw new RangeError("INTEGER_OVERFLOW");
  return result;
}

function exactIncomeDeltaWithUnchangedMarketV7(
  view: PlayerViewV7,
  before: PlayerViewV7["cities"][number],
  after: PlayerViewV7["cities"][number],
): number | null {
  if (before.level === after.level && before.population === after.population)
    return 0;
  const knownMarket = exactVisibleMarketIncomeV7(view, before.id);
  if (knownMarket !== null)
    return (
      publicCityIncomeV7(view, after, knownMarket) -
      publicCityIncomeV7(view, before, knownMarket)
    );
  const possible = new Set<number>();
  for (let market = 0; market <= 5; market += 1)
    possible.add(
      publicCityIncomeV7(view, after, market) -
        publicCityIncomeV7(view, before, market),
    );
  const only = [...possible][0];
  return possible.size === 1 && only !== undefined ? only : null;
}

function exactVisibleMarketIncomeV7(
  view: PlayerViewV7,
  cityId: CityId,
): number | null {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return null;
  const market = view.improvementValues.find((value) => {
    if (value.improvement !== "MARKET" || value.measure !== "COIN_INCOME")
      return false;
    const tile = tileAtView(view, value.at);
    return tile?.explored === true && tile.territoryCityId === cityId;
  });
  if (market !== undefined) return market.level;
  if (publicPlanningGraphExact(view))
    return marketForCityV7(publicEconomyGraph(view), cityId);
  return publicCityDevelopmentFootprintKnown(view, city) ? 0 : null;
}

function publicRestoredResourceV7(
  view: PlayerViewV7,
  terrain: PublicEconomyGraphTileV7["terrain"],
  improvement: ImprovementIdV7 | null,
): EconomicPreviewV7["resourceRestored"] {
  const restored =
    improvement === "FARM"
      ? "FERTILE_GROUND"
      : improvement === "MINE"
        ? "ORE"
        : null;
  return projectedResourceAfterMutationV7(view, terrain, restored);
}

function projectedResourceAfterMutationV7(
  view: PlayerViewV7,
  terrain: PublicEconomyGraphTileV7["terrain"],
  resource: "FERTILE_GROUND" | "ORE" | null,
): EconomicPreviewV7["resourceRestored"] {
  if (terrain === null) return null;
  if (
    resource === "ORE" &&
    !view.viewer.researchedTechs.includes("ENGINEERING")
  )
    return null;
  if (terrain === "FOREST") return resource;
  return resource;
}

function economicOutputTransitionsV7(
  view: PlayerViewV7,
  before: PublicEconomyGraphV7,
  after: PublicEconomyGraphV7,
): readonly EconomicOutputTransitionV7[] {
  const outputAt = (graph: PublicEconomyGraphV7, at: CoordV7) => {
    const tile = graph.board.tiles.find((candidate) => same(candidate.at, at));
    if (
      tile?.improvement === null ||
      tile?.improvement === undefined ||
      tile.territoryOwnerId !== view.viewer.id
    )
      return null;
    const evaluation = spatialContributionAtV7(
      graph,
      tile.at,
      tile.improvement,
    );
    return {
      improvement: tile.improvement,
      measure:
        tile.improvement === "MARKET"
          ? ("COIN_INCOME" as const)
          : ("POPULATION" as const),
      value:
        tile.improvement === "MARKET"
          ? evaluation.marketIncome
          : evaluation.population,
    };
  };
  return before.board.tiles
    .map((tile) => {
      const prior = outputAt(before, tile.at);
      const next = outputAt(after, tile.at);
      if (
        prior?.improvement === next?.improvement &&
        prior?.measure === next?.measure &&
        prior?.value === next?.value
      )
        return null;
      const improvement = next?.improvement ?? prior?.improvement;
      const measure = next?.measure ?? prior?.measure;
      if (improvement === undefined || measure === undefined) return null;
      const beforeValue = prior?.value ?? 0;
      const afterValue = next?.value ?? 0;
      return {
        at: tile.at,
        improvement,
        measure,
        before: beforeValue,
        after: afterValue,
        change:
          prior === null
            ? ("CREATED" as const)
            : next === null
              ? ("REMOVED" as const)
              : beforeValue > 0 && afterValue === 0
                ? ("OUTAGE" as const)
                : beforeValue === 0 && afterValue > 0
                  ? ("RESUMED" as const)
                  : ("CHANGED" as const),
      };
    })
    .filter((value) => value !== null)
    .sort((left, right) => left.at.y - right.at.y || left.at.x - right.at.x);
}

const ECONOMIC_POTENTIAL_KINDS_V7 = [
  ...(Object.keys(BASIC_ECONOMIC_ACTIONS_V7) as BasicEconomicCommandKindV7[]),
  ...(Object.keys(
    SPATIAL_ECONOMIC_ACTIONS_V7,
  ) as SpatialEconomicCommandKindV7[]),
  "BUILD_MONUMENT",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
] as const;
type PublicEconomicPotentialKindV7 =
  (typeof ECONOMIC_POTENTIAL_KINDS_V7)[number];
interface PublicPlacementV7 {
  readonly cityId: CityId;
  readonly at: CoordV7;
  readonly kind: PublicEconomicPotentialKindV7;
}
export interface PublicEconomicPotentialV7 {
  readonly command: PublicEconomicPotentialKindV7;
  readonly targets: number;
  readonly bestSpatialScore: number;
}

export interface PublicSpatialPlanScoreV7 {
  readonly command: CommandV7;
  readonly score: number;
}
export interface PublicPlanningWorkResultV7 {
  readonly potentials: readonly PublicEconomicPotentialV7[];
  readonly scores: readonly PublicSpatialPlanScoreV7[];
}
export interface PublicPlanningWorkProgressV7 {
  readonly done: boolean;
  readonly operations: number;
  readonly result: PublicPlanningWorkResultV7 | null;
}
export interface PublicPlanningWorkV7 {
  advance(maxOperations: number): PublicPlanningWorkProgressV7;
}

/** Known legal public placement potential with only Coin/technology gates removed. */
export function queryPublicEconomicPotentialsV7(
  view: PlayerViewV7,
): readonly PublicEconomicPotentialV7[] {
  const cached = PUBLIC_ECONOMIC_POTENTIALS.get(view);
  if (cached !== undefined) return cached;
  const graph = publicEconomyGraph(view);
  const placements = publicPlanningGraphExact(view)
    ? enumeratePublicPlacementsIgnoringGatesV7(view, graph)
    : [];
  const result = ECONOMIC_POTENTIAL_KINDS_V7.map((command) => {
    const matching = placements.filter(
      (placement) => placement.kind === command,
    );
    return {
      command,
      targets: matching.length,
      bestSpatialScore: matching.reduce(
        (best, placement) =>
          Math.max(best, scorePublicPlacementV7(view, graph, placement)),
        0,
      ),
    };
  });
  PUBLIC_ECONOMIC_POTENTIALS.set(view, result);
  return result;
}

/**
 * Incremental form of public economic-potential preparation and spatial
 * scoring. Each operation evaluates at most one board tile or one placement;
 * callers choose the integer operation budget and wall time never affects the
 * result.
 */
export function createPublicPlanningWorkV7(
  view: PlayerViewV7,
  candidates: readonly CommandV7[],
): PublicPlanningWorkV7 {
  return new IncrementalPublicPlanningWorkV7(view, candidates);
}

/** Deterministic one-step per-city public spatial reservation score. */
export function scorePublicSpatialPlanV7(
  view: PlayerViewV7,
  candidate: CommandV7,
): number {
  let cachedForView = PUBLIC_SPATIAL_SCORES.get(view);
  if (cachedForView === undefined) {
    cachedForView = new Map();
    PUBLIC_SPATIAL_SCORES.set(view, cachedForView);
  }
  const cacheKey = JSON.stringify(candidate);
  const cached = cachedForView.get(cacheKey);
  if (cached !== undefined) return cached;
  if (!publicPlanningGraphExact(view)) {
    cachedForView.set(cacheKey, 0);
    return 0;
  }
  const before = publicEconomyGraph(view);
  const after = graphAfterPublicCandidateV7(view, before, candidate);
  const result =
    after === null
      ? 0
      : bestPublicNextPlacementTotalV7(view, after) -
        publicSpatialBaselineV7(view, before);
  cachedForView.set(cacheKey, result);
  return result;
}

/** Whether the public one-step spatial plan replaces an improvement with a different result. */
export function queryPublicRedevelopmentChangesImprovementV7(
  view: PlayerViewV7,
  candidate: { readonly kind: "REDEVELOP"; readonly at: CoordV7 },
): boolean {
  const key = JSON.stringify(candidate);
  const cached = PUBLIC_REDEVELOPMENT_CHANGES.get(view)?.get(key);
  if (cached !== undefined) return cached;
  if (!publicPlanningGraphExact(view)) return false;
  const before = publicEconomyGraph(view);
  const after = graphAfterPublicCandidateV7(view, before, candidate);
  if (after === null) return false;
  const replacement = enumeratePublicPlacementsIgnoringGatesV7(view, after)
    .filter(
      (placement) =>
        same(placement.at, candidate.at) &&
        publicPlacementImprovementV7(placement) !== null,
    )
    .map((placement) => ({
      placement,
      score: scorePublicPlacementV7(view, after, placement),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        comparePublicPlacementV7(left.placement, right.placement),
    )[0];
  return redevelopmentChangesImprovementV7(
    view,
    before,
    after,
    candidate,
    replacement?.score !== undefined && replacement.score > 0
      ? replacement.placement
      : undefined,
  );
}

function publicPlanningGraphExact(view: PlayerViewV7): boolean {
  const ownedCities = view.cities.filter(
    (city) => city.ownerId === view.viewer.id,
  );
  return (
    view.leaderboard.find((entry) => entry.isViewer)?.cityCount ===
      ownedCities.length &&
    ownedCities.every((city) => publicCityDevelopmentFootprintKnown(view, city))
  );
}

function publicSpatialBaselineV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): number {
  const cached = PUBLIC_SPATIAL_BASELINES.get(view);
  if (cached !== undefined) return cached;
  const score = bestPublicNextPlacementTotalV7(view, graph);
  PUBLIC_SPATIAL_BASELINES.set(view, score);
  return score;
}

function graphAfterPublicCandidateV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  candidate: CommandV7,
): PublicEconomyGraphV7 | null {
  if (candidate.kind === "CHOOSE_CITY_REWARD") {
    const city = view.cities.find(
      (value) =>
        value.id === candidate.cityId && value.ownerId === view.viewer.id,
    );
    if (city === undefined) return null;
    const resolvedPendingCityIds = new Set(graph.resolvedPendingCityIds);
    resolvedPendingCityIds.add(city.id);
    return { ...graph, resolvedPendingCityIds };
  }
  if (candidate.kind === "BUILD_MONUMENT") {
    const tile = graph.board.tiles.find((value) =>
      same(value.at, candidate.at),
    );
    if (
      tile?.explored !== true ||
      (tile.terrain === "MOUNTAIN" &&
        !view.viewer.researchedTechs.includes("ENGINEERING"))
    )
      return null;
    return {
      ...replacePublicGraphTileV7(graph, candidate.at, {
        improvement: "MONUMENT",
      }),
      remainingMonumentEntitlements: Math.max(
        0,
        graph.remainingMonumentEntitlements - 1,
      ),
    };
  }
  if (!("at" in candidate)) return null;
  return graphAfterTileCommandV7(view, graph, candidate);
}

function bestPublicNextPlacementTotalV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): number {
  const placements = enumeratePublicPlacementsIgnoringGatesV7(view, graph);
  const reservedTargets = new Set<string>();
  let remainingMonumentEntitlements = graph.remainingMonumentEntitlements;
  let total = 0;
  for (const city of graph.cities
    .filter((value) => value.ownerId === view.viewer.id)
    .sort((left, right) => left.id - right.id)) {
    const best = placements
      .filter(
        (placement) =>
          placement.cityId === city.id &&
          (placement.kind !== "BUILD_MONUMENT" ||
            remainingMonumentEntitlements > 0) &&
          !reservedTargets.has(coordKeyV7(placement.at)),
      )
      .map((placement) => ({
        placement,
        score: scorePublicPlacementV7(view, graph, placement),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          potentialKindOrdinalV7(left.placement.kind) -
            potentialKindOrdinalV7(right.placement.kind) ||
          left.placement.at.y - right.placement.at.y ||
          left.placement.at.x - right.placement.at.x,
      )[0];
    if (best !== undefined && best.score > 0) {
      total += best.score;
      if (!Number.isSafeInteger(total))
        throw new RangeError("INTEGER_OVERFLOW");
      reservedTargets.add(coordKeyV7(best.placement.at));
      if (best.placement.kind === "BUILD_MONUMENT")
        remainingMonumentEntitlements -= 1;
    }
  }
  return total;
}

function redevelopmentChangesImprovementV7(
  view: PlayerViewV7,
  before: PublicEconomyGraphV7,
  after: PublicEconomyGraphV7,
  candidate: { readonly kind: "REDEVELOP"; readonly at: CoordV7 },
  replacement: PublicPlacementV7 | undefined,
): boolean {
  const current = before.board.tiles.find((tile) =>
    same(tile.at, candidate.at),
  )?.improvement;
  if (current === undefined || current === null) return false;
  if (replacement === undefined) return true;
  const replaced = graphAfterPublicCandidateV7(view, after, {
    kind: replacement.kind,
    at: replacement.at,
  } as CommandV7);
  const next = replaced?.board.tiles.find((tile) =>
    same(tile.at, candidate.at),
  )?.improvement;
  return next !== current;
}

function publicPlacementImprovementV7(
  placement: PublicPlacementV7,
): ImprovementIdV7 | null {
  if (placement.kind === "BUILD_MONUMENT") return "MONUMENT";
  return (
    BASIC_ECONOMIC_ACTIONS_V7[placement.kind as BasicEconomicCommandKindV7]
      ?.improvement ??
    SPATIAL_ECONOMIC_ACTIONS_V7[placement.kind as SpatialEconomicCommandKindV7]
      ?.improvement ??
    null
  );
}

function enumeratePublicPlacementsIgnoringGatesV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): readonly PublicPlacementV7[] {
  const enumeration = createPublicPlacementEnumerationV7(view, graph);
  for (const tile of graph.board.tiles) {
    appendPublicPlacementsForTileV7(enumeration, tile);
  }
  return enumeration.placements;
}

interface PublicPlacementEnumerationV7 {
  readonly view: PlayerViewV7;
  readonly graph: PublicEconomyGraphV7;
  readonly placements: PublicPlacementV7[];
  readonly placementsByCity: Map<CityId, PublicPlacementV7[]>;
  readonly entitlementsAvailable: boolean;
  readonly treasureKeys: ReadonlySet<string>;
  readonly cityImprovementKeys: ReadonlySet<string>;
}

function createPublicPlacementEnumerationV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): PublicPlacementEnumerationV7 {
  return {
    view,
    graph,
    placements: [],
    placementsByCity: new Map(),
    entitlementsAvailable: graph.remainingMonumentEntitlements > 0,
    treasureKeys: new Set(view.treasureChests.map(coordKeyV7)),
    cityImprovementKeys: new Set(
      graph.board.tiles.flatMap((tile) =>
        tile.territoryCityId === null || tile.improvement === null
          ? []
          : [`${tile.territoryCityId}:${tile.improvement}`],
      ),
    ),
  };
}

function appendPublicPlacementsForTileV7(
  enumeration: PublicPlacementEnumerationV7,
  tile: PublicEconomyGraphTileV7,
): void {
  const {
    view,
    graph,
    placements,
    entitlementsAvailable,
    treasureKeys,
    cityImprovementKeys,
  } = enumeration;
  const beforeLength = placements.length;
  if (
    tile.explored &&
    tile.territoryOwnerId === null &&
    tile.territoryCityId === null &&
    tile.terrain !== null &&
    tile.site === null &&
    !tile.road
  ) {
    const capitalId = view.viewer.originalCapitalCityId;
    const placement = {
      cityId: capitalId,
      at: tile.at,
      kind: "BUILD_ROAD",
    } as const;
    placements.push(placement);
    let capitalPlacements = enumeration.placementsByCity.get(capitalId);
    if (capitalPlacements === undefined) {
      capitalPlacements = [];
      enumeration.placementsByCity.set(capitalId, capitalPlacements);
    }
    capitalPlacements.push(placement);
    return;
  }
  if (
    !tile.explored ||
    tile.territoryOwnerId !== view.viewer.id ||
    tile.territoryCityId === null ||
    !publicCityAllowsDevelopmentV7(view, graph, tile.territoryCityId)
  )
    return;
  {
    for (const kind of Object.keys(
      BASIC_ECONOMIC_ACTIONS_V7,
    ) as BasicEconomicCommandKindV7[]) {
      const rule = BASIC_ECONOMIC_ACTIONS_V7[kind];
      if (
        tile.site === null &&
        tile.terrain === rule.terrain &&
        tile.resource === rule.resource &&
        tile.improvement === null &&
        !treasureKeys.has(coordKeyV7(tile.at))
      )
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
    }
    for (const kind of Object.keys(
      SPATIAL_ECONOMIC_ACTIONS_V7,
    ) as SpatialEconomicCommandKindV7[]) {
      const rule = SPATIAL_ECONOMIC_ACTIONS_V7[kind];
      if (
        (tile.terrain === "MOUNTAIN" &&
          !view.viewer.researchedTechs.includes("ENGINEERING")) ||
        tile.site !== null ||
        tile.resource !== null ||
        tile.improvement !== null ||
        treasureKeys.has(coordKeyV7(tile.at)) ||
        cityImprovementKeys.has(`${tile.territoryCityId}:${rule.improvement}`)
      )
        continue;
      if (
        spatialContributionAtV7(graph, tile.at, rule.improvement)
          .placementCount >= rule.placementMinimum
      )
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
    }
    if (
      entitlementsAvailable &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("ENGINEERING")) &&
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      !treasureKeys.has(coordKeyV7(tile.at)) &&
      !cityImprovementKeys.has(`${tile.territoryCityId}:MONUMENT`)
    )
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "BUILD_MONUMENT",
      });
    if (
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      tile.terrain === "FOREST"
    )
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "CLEAR_FOREST",
      });
    if (
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      tile.terrain === "GRASS"
    )
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "REPLANT_FOREST",
      });
    if (tile.site === null && !tile.road)
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "BUILD_ROAD",
      });
    if (tile.improvement !== null)
      placements.push({
        cityId: tile.territoryCityId,
        at: tile.at,
        kind: "REDEVELOP",
      });
  }
  if (placements.length > beforeLength) {
    let cityPlacements = enumeration.placementsByCity.get(tile.territoryCityId);
    if (cityPlacements === undefined) {
      cityPlacements = [];
      enumeration.placementsByCity.set(tile.territoryCityId, cityPlacements);
    }
    cityPlacements.push(...placements.slice(beforeLength));
  }
}

interface IncrementalBestSelectionV7 {
  readonly graph: PublicEconomyGraphV7;
  readonly placementsByCity: ReadonlyMap<CityId, readonly PublicPlacementV7[]>;
  readonly knownScores: ReadonlyMap<PublicPlacementV7, number> | null;
  readonly cities: readonly PublicEconomyGraphV7["cities"][number][];
  readonly reservedTargets: Set<string>;
  readonly bestByTarget: Map<
    string,
    { readonly placement: PublicPlacementV7; readonly score: number }
  >;
  cityIndex: number;
  placementIndex: number;
  remainingMonumentEntitlements: number;
  total: number;
  best: {
    readonly placement: PublicPlacementV7;
    readonly score: number;
  } | null;
}

function createIncrementalBestSelectionV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  placementsByCity: ReadonlyMap<CityId, readonly PublicPlacementV7[]>,
  knownScores: ReadonlyMap<PublicPlacementV7, number> | null = null,
): IncrementalBestSelectionV7 {
  return {
    graph,
    placementsByCity,
    knownScores,
    cities: graph.cities
      .filter((city) => city.ownerId === view.viewer.id)
      .sort((left, right) => left.id - right.id),
    reservedTargets: new Set(),
    bestByTarget: new Map(),
    cityIndex: 0,
    placementIndex: 0,
    remainingMonumentEntitlements: graph.remainingMonumentEntitlements,
    total: 0,
    best: null,
  };
}

function advanceIncrementalBestSelectionV7(
  view: PlayerViewV7,
  selection: IncrementalBestSelectionV7,
): boolean {
  while (selection.cityIndex < selection.cities.length) {
    const city = selection.cities[selection.cityIndex];
    if (city === undefined) break;
    const placements = selection.placementsByCity.get(city.id) ?? [];
    const placement = placements[selection.placementIndex];
    if (placement !== undefined) {
      selection.placementIndex += 1;
      const score =
        selection.knownScores?.get(placement) ??
        scorePublicPlacementV7(view, selection.graph, placement);
      if (publicPlacementImprovementV7(placement) !== null) {
        const targetKey = coordKeyV7(placement.at);
        const targetBest = selection.bestByTarget.get(targetKey);
        if (
          targetBest === undefined ||
          score > targetBest.score ||
          (score === targetBest.score &&
            comparePublicPlacementV7(placement, targetBest.placement) < 0)
        )
          selection.bestByTarget.set(targetKey, { placement, score });
      }
      if (
        (placement.kind === "BUILD_MONUMENT" &&
          selection.remainingMonumentEntitlements <= 0) ||
        selection.reservedTargets.has(coordKeyV7(placement.at))
      )
        return true;
      if (
        selection.best === null ||
        score > selection.best.score ||
        (score === selection.best.score &&
          comparePublicPlacementV7(placement, selection.best.placement) < 0)
      )
        selection.best = { placement, score };
      return true;
    }
    if (selection.best !== null && selection.best.score > 0) {
      selection.total += selection.best.score;
      if (!Number.isSafeInteger(selection.total))
        throw new RangeError("INTEGER_OVERFLOW");
      selection.reservedTargets.add(coordKeyV7(selection.best.placement.at));
      if (selection.best.placement.kind === "BUILD_MONUMENT")
        selection.remainingMonumentEntitlements -= 1;
    }
    selection.cityIndex += 1;
    selection.placementIndex = 0;
    selection.best = null;
  }
  return false;
}

function comparePublicPlacementV7(
  left: PublicPlacementV7,
  right: PublicPlacementV7,
): number {
  return (
    potentialKindOrdinalV7(left.kind) - potentialKindOrdinalV7(right.kind) ||
    left.at.y - right.at.y ||
    left.at.x - right.at.x
  );
}

class IncrementalPublicPlanningWorkV7 implements PublicPlanningWorkV7 {
  private readonly graph: PublicEconomyGraphV7;
  private readonly candidates: readonly CommandV7[];
  private readonly exact: boolean;
  private phase:
    | "BASE_ENUMERATION"
    | "BASE_SCORING"
    | "BASE_SELECTION"
    | "CANDIDATE_START"
    | "CANDIDATE_ENUMERATION"
    | "CANDIDATE_SELECTION"
    | "DONE" = "BASE_ENUMERATION";
  private enumeration: PublicPlacementEnumerationV7;
  private tileIndex = 0;
  private placementIndex = 0;
  private candidateIndex = 0;
  private selection: IncrementalBestSelectionV7 | null = null;
  private readonly baseScores = new Map<PublicPlacementV7, number>();
  private readonly potentialStats = new Map<
    PublicEconomicPotentialKindV7,
    { targets: number; bestSpatialScore: number }
  >();
  private readonly scores: PublicSpatialPlanScoreV7[] = [];
  private baseline = 0;
  private completed: PublicPlanningWorkResultV7 | null = null;

  constructor(
    private readonly view: PlayerViewV7,
    candidates: readonly CommandV7[],
  ) {
    this.candidates = [...candidates];
    this.graph = publicEconomyGraph(view);
    this.exact = publicPlanningGraphExact(view);
    this.enumeration = createPublicPlacementEnumerationV7(view, this.graph);
    for (const kind of ECONOMIC_POTENTIAL_KINDS_V7)
      this.potentialStats.set(kind, { targets: 0, bestSpatialScore: 0 });
    if (!this.exact) this.phase = "CANDIDATE_START";
  }

  advance(maxOperations: number): PublicPlanningWorkProgressV7 {
    if (!Number.isSafeInteger(maxOperations) || maxOperations <= 0)
      throw new RangeError("maxOperations must be a positive safe integer");
    let operations = 0;
    while (operations < maxOperations && this.phase !== "DONE") {
      if (this.advanceOne()) operations += 1;
    }
    return {
      done: this.phase === "DONE",
      operations,
      result: this.completed,
    };
  }

  private advanceOne(): boolean {
    if (this.phase === "BASE_ENUMERATION") {
      const tile = this.graph.board.tiles[this.tileIndex];
      if (tile !== undefined) {
        appendPublicPlacementsForTileV7(this.enumeration, tile);
        this.tileIndex += 1;
        return true;
      }
      this.phase = "BASE_SCORING";
      this.placementIndex = 0;
      return false;
    }
    if (this.phase === "BASE_SCORING") {
      const placement = this.enumeration.placements[this.placementIndex];
      if (placement !== undefined) {
        const score = scorePublicPlacementV7(this.view, this.graph, placement);
        this.baseScores.set(placement, score);
        const stats = this.potentialStats.get(placement.kind);
        if (stats !== undefined) {
          stats.targets += 1;
          stats.bestSpatialScore = Math.max(stats.bestSpatialScore, score);
        }
        this.placementIndex += 1;
        return true;
      }
      this.selection = createIncrementalBestSelectionV7(
        this.view,
        this.graph,
        this.enumeration.placementsByCity,
        this.baseScores,
      );
      this.phase = "BASE_SELECTION";
      return false;
    }
    if (this.phase === "BASE_SELECTION") {
      if (
        this.selection !== null &&
        advanceIncrementalBestSelectionV7(this.view, this.selection)
      )
        return true;
      this.baseline = this.selection?.total ?? 0;
      PUBLIC_SPATIAL_BASELINES.set(this.view, this.baseline);
      this.selection = null;
      this.phase = "CANDIDATE_START";
      return false;
    }
    if (this.phase === "CANDIDATE_START") {
      const candidate = this.candidates[this.candidateIndex];
      if (candidate === undefined) {
        this.finish();
        return false;
      }
      const after = this.exact
        ? graphAfterPublicCandidateV7(this.view, this.graph, candidate)
        : null;
      if (after === null) {
        this.recordCandidateScore(candidate, 0);
        this.candidateIndex += 1;
        return true;
      }
      this.enumeration = createPublicPlacementEnumerationV7(this.view, after);
      this.tileIndex = 0;
      this.phase = "CANDIDATE_ENUMERATION";
      return true;
    }
    if (this.phase === "CANDIDATE_ENUMERATION") {
      const tile = this.enumeration.graph.board.tiles[this.tileIndex];
      if (tile !== undefined) {
        appendPublicPlacementsForTileV7(this.enumeration, tile);
        this.tileIndex += 1;
        return true;
      }
      this.selection = createIncrementalBestSelectionV7(
        this.view,
        this.enumeration.graph,
        this.enumeration.placementsByCity,
      );
      this.phase = "CANDIDATE_SELECTION";
      return false;
    }
    if (this.phase === "CANDIDATE_SELECTION") {
      if (
        this.selection !== null &&
        advanceIncrementalBestSelectionV7(this.view, this.selection)
      )
        return true;
      const candidate = this.candidates[this.candidateIndex];
      if (candidate !== undefined) {
        this.recordCandidateScore(
          candidate,
          (this.selection?.total ?? 0) - this.baseline,
        );
        if (candidate.kind === "REDEVELOP" && this.selection !== null) {
          let cached = PUBLIC_REDEVELOPMENT_CHANGES.get(this.view);
          if (cached === undefined) {
            cached = new Map();
            PUBLIC_REDEVELOPMENT_CHANGES.set(this.view, cached);
          }
          const best = this.selection.bestByTarget.get(
            coordKeyV7(candidate.at),
          );
          cached.set(
            JSON.stringify(candidate),
            redevelopmentChangesImprovementV7(
              this.view,
              this.graph,
              this.selection.graph,
              { kind: "REDEVELOP", at: candidate.at },
              best !== undefined && best.score > 0 ? best.placement : undefined,
            ),
          );
        }
      }
      this.selection = null;
      this.candidateIndex += 1;
      this.phase = "CANDIDATE_START";
      return false;
    }
    return false;
  }

  private recordCandidateScore(command: CommandV7, score: number): void {
    this.scores.push({ command, score });
    let cached = PUBLIC_SPATIAL_SCORES.get(this.view);
    if (cached === undefined) {
      cached = new Map();
      PUBLIC_SPATIAL_SCORES.set(this.view, cached);
    }
    cached.set(JSON.stringify(command), score);
  }

  private finish(): void {
    const potentials = ECONOMIC_POTENTIAL_KINDS_V7.map((command) => ({
      command,
      ...(this.potentialStats.get(command) ?? {
        targets: 0,
        bestSpatialScore: 0,
      }),
    }));
    PUBLIC_ECONOMIC_POTENTIALS.set(this.view, potentials);
    this.completed = { potentials, scores: this.scores };
    this.phase = "DONE";
  }
}

function scorePublicPlacementV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  placement: PublicPlacementV7,
): number {
  const tile = graph.board.tiles.find((candidate) =>
    same(candidate.at, placement.at),
  );
  if (tile === undefined) return 0;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[placement.kind as BasicEconomicCommandKindV7];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[placement.kind as SpatialEconomicCommandKindV7];
  const after =
    placement.kind === "BUILD_MONUMENT"
      ? replacePublicGraphTileV7(graph, placement.at, {
          improvement: "MONUMENT",
        })
      : graphAfterTileCommandV7(view, graph, {
          kind: placement.kind as Exclude<
            PublicEconomicPotentialKindV7,
            "BUILD_MONUMENT"
          >,
          at: placement.at,
        } as Extract<CommandV7, { at: CoordV7 }>);
  if (after === null) return 0;
  const beforeTotals = publicGraphTotalsV7(graph, view.viewer.id);
  const afterTotals = publicGraphTotalsAfterSingleTileChangeV7(
    graph,
    after,
    view.viewer.id,
    placement.at,
  );
  const permanentPopulation =
    basic?.populationCategory === "PERMANENT" ? basic.population : 0;
  const populationDelta =
    permanentPopulation + afterTotals.population - beforeTotals.population;
  const recurringCoinDelta =
    afterTotals.recurringCoins - beforeTotals.recurringCoins;
  const improvement =
    placement.kind === "BUILD_MONUMENT"
      ? "MONUMENT"
      : (basic?.improvement ?? spatial?.improvement ?? null);
  const evaluation =
    improvement === null
      ? null
      : spatialContributionAtV7(after, placement.at, improvement);
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
    (placement.kind === "BUILD_ROAD" && recurringCoinDelta > 0 ? 4 : 0)
  );
}

function publicGraphTotalsV7(
  graph: PublicEconomyGraphV7,
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
  for (const tile of graph.board.tiles)
    if (
      tile.improvement !== null &&
      tile.territoryCityId !== null &&
      ownedCityIds.has(tile.territoryCityId)
    ) {
      population +=
        tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
          ? Number(graph.activePortKeys.has(coordKeyV7(tile.at))) *
            (tile.improvement === "SHIPYARD" ? 2 : 1)
          : spatialContributionAtV7(graph, tile.at, tile.improvement)
              .population;
      if (!Number.isSafeInteger(population))
        throw new RangeError("INTEGER_OVERFLOW");
    }
  if (!Number.isSafeInteger(population))
    throw new RangeError("INTEGER_OVERFLOW");
  let recurringCoins = 0;
  for (const city of graph.cities)
    if (city.ownerId === ownerId) {
      recurringCoins += marketForCityV7(graph, city.id);
      if (!Number.isSafeInteger(recurringCoins))
        throw new RangeError("INTEGER_OVERFLOW");
    }
  const totals = { population, recurringCoins };
  byOwner.set(ownerId, totals);
  return totals;
}

const GRAPH_DEPENDENT_IMPROVEMENTS_V7: ReadonlySet<ImprovementIdV7> = new Set([
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "WORKSHOP",
  "MARKET",
]);

/** Exact total update for the one-coordinate mutations used by placement scoring. */
function publicGraphTotalsAfterSingleTileChangeV7(
  before: PublicEconomyGraphV7,
  after: PublicEconomyGraphV7,
  ownerId: PlayerId,
  changedAt: CoordV7,
): { readonly population: number; readonly recurringCoins: number } {
  const beforeConnectivity = publicGraphNavalConnectivityV7(before);
  const afterConnectivity = publicGraphNavalConnectivityV7(after);
  if (
    !sameSet(beforeConnectivity.network, afterConnectivity.network) ||
    !sameSet(beforeConnectivity.landTrade, afterConnectivity.landTrade) ||
    !sameSet(beforeConnectivity.seaTrade, afterConnectivity.seaTrade) ||
    !sameSet(beforeConnectivity.roadKeys, afterConnectivity.roadKeys)
  )
    return publicGraphTotalsV7(after, ownerId);
  const totals = publicGraphTotalsV7(before, ownerId);
  const affectedKeys = new Set([coordKeyV7(changedAt)]);
  for (const graph of [before, after])
    for (const tile of graph.board.tiles)
      if (
        tile.improvement !== null &&
        GRAPH_DEPENDENT_IMPROVEMENTS_V7.has(tile.improvement)
      )
        affectedKeys.add(coordKeyV7(tile.at));
  let population = totals.population;
  let recurringCoins = totals.recurringCoins;
  for (const tileKey of affectedKeys) {
    const index =
      Number(tileKey.split(",")[0]) * before.board.width +
      Number(tileKey.split(",")[1]);
    const beforeTile = before.board.tiles[index];
    const afterTile = after.board.tiles[index];
    if (beforeTile === undefined || afterTile === undefined) continue;
    const prior = publicTileGraphOutputV7(before, beforeTile, ownerId);
    const next = publicTileGraphOutputV7(after, afterTile, ownerId);
    population += next.population - prior.population;
    recurringCoins += next.recurringCoins - prior.recurringCoins;
    if (
      !Number.isSafeInteger(population) ||
      !Number.isSafeInteger(recurringCoins)
    )
      throw new RangeError("INTEGER_OVERFLOW");
  }
  return { population, recurringCoins };
}

function publicTileGraphOutputV7(
  graph: PublicEconomyGraphV7,
  tile: PublicEconomyGraphTileV7,
  ownerId: PlayerId,
): { readonly population: number; readonly recurringCoins: number } {
  if (
    tile.improvement === null ||
    tile.territoryCityId === null ||
    graph.cities.find((city) => city.id === tile.territoryCityId)?.ownerId !==
      ownerId
  )
    return { population: 0, recurringCoins: 0 };
  const contribution = spatialContributionAtV7(
    graph,
    tile.at,
    tile.improvement,
  );
  return {
    population:
      tile.improvement === "PORT" || tile.improvement === "SHIPYARD"
        ? Number(graph.activePortKeys.has(coordKeyV7(tile.at))) *
          (tile.improvement === "SHIPYARD" ? 2 : 1)
        : contribution.population,
    recurringCoins:
      tile.improvement === "MARKET"
        ? Math.min(4, contribution.marketIncome)
        : contribution.marketIncome,
  };
}

function sameSet<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  return (
    left.size === right.size && [...left].every((value) => right.has(value))
  );
}

function publicCityAllowsDevelopmentV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  cityId: CityId,
): boolean {
  const city = view.cities.find((candidate) => candidate.id === cityId);
  return (
    city?.ownerId === view.viewer.id &&
    !publicCityBesieged(view, city.at) &&
    (!view.pendingChoices.some((choice) => choice.cityId === city.id) ||
      graph.resolvedPendingCityIds.has(city.id))
  );
}

function potentialKindOrdinalV7(kind: PublicEconomicPotentialKindV7): number {
  return ECONOMIC_POTENTIAL_KINDS_V7.indexOf(kind);
}

function coordKeyV7(at: CoordV7): string {
  return `${at.y},${at.x}`;
}

export function previewCityCapacityV7(
  state: GameStateV7,
  cityId: CityId,
): {
  readonly cityId: CityId;
  readonly capacity: number;
  readonly assigned: number;
  readonly available: number;
  readonly overCapacity: number;
} | null {
  const city = state.cities.find((item) => item.id === cityId);
  if (city === undefined) return null;
  const capacity = cityUnitCapacityV7(state, city);
  const assigned = assignedUnitCountV7(state, cityId);
  return {
    cityId,
    capacity,
    assigned,
    available: Math.max(0, capacity - assigned),
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
  readonly resourceRestored:
    "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null;
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

function publicCommandOfferingAllowedV7(view: PlayerViewV7): boolean {
  if (
    view.outcome !== null ||
    view.viewer.status !== "ACTIVE" ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    view.pendingChoices.length > 0
  )
    return false;
  return true;
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
  if (
    !Number.isSafeInteger(at.x) ||
    !Number.isSafeInteger(at.y) ||
    at.x < 0 ||
    at.y < 0 ||
    at.x >= view.board.width ||
    at.y >= view.board.height
  )
    return undefined;
  const tile = view.board.tiles[at.y * view.board.width + at.x];
  return tile?.at.x === at.x && tile.at.y === at.y ? tile : undefined;
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
): "FERTILE_GROUND" | "ORE" | "UNKNOWN_RESOURCE" | null {
  return resource === "FERTILE_GROUND" ||
    resource === "ORE" ||
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
  if (
    tile.biome === null &&
    !["HARVEST_FISH", "GATHER_PEARLS", "BUILD_PORT", "BUILD_SHIPYARD"].includes(
      kind,
    ) &&
    (kind !== "REDEVELOP" ||
      (tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD"))
  )
    return false;
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  const neutralRoad =
    kind === "BUILD_ROAD" &&
    tile.territoryCityId === null &&
    tile.territoryOwnerId === null;
  if (
    (!neutralRoad && city?.ownerId !== view.viewer.id) ||
    (city !== undefined && publicCityBesieged(view, city.at)) ||
    (city !== undefined &&
      view.pendingChoices.some((choice) => choice.cityId === city.id))
  )
    return false;
  if (neutralRoad)
    return (
      view.viewer.coins >= 2 &&
      tile.biome !== null &&
      tile.site === null &&
      !tile.road &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("ENGINEERING"))
    );
  if (city === undefined) return false;
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[kind as keyof typeof BASIC_ECONOMIC_ACTIONS_V7];
  if (basic !== undefined)
    return (
      view.viewer.coins >= basic.cost &&
      !view.treasureChests.some((chest) => same(chest, tile.at)) &&
      tile.site === null &&
      tile.terrain === basic.terrain &&
      tile.resource === basic.resource &&
      (kind === "HARVEST_FISH"
        ? tile.improvement === null ||
          ((tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
            publicActiveOwnedPort(view, tile, view.viewer.id))
        : tile.improvement === null)
    );
  if (kind === "GATHER_PEARLS")
    return (
      view.viewer.coins >= 2 &&
      tile.resource === "PEARLS" &&
      (tile.terrain === "SHALLOW_WATER" || tile.terrain === "DEEP_WATER") &&
      (tile.terrain !== "DEEP_WATER" ||
        view.viewer.researchedTechs.includes("NAVIGATION")) &&
      ((tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD") ||
        publicActiveOwnedPort(view, tile, view.viewer.id))
    );
  if (kind === "BUILD_PORT")
    return (
      view.viewer.coins >= 4 &&
      tile.terrain === "SHALLOW_WATER" &&
      tile.improvement === null &&
      tile.site === null &&
      !tile.road &&
      adjacentPublicTiles(view, tile.at).some(
        (near) =>
          near.explored &&
          near.biome !== null &&
          near.territoryCityId === city.id,
      )
    );
  if (kind === "BUILD_SHIPYARD")
    return (
      view.viewer.coins >= 5 &&
      view.viewer.researchedTechs.includes("NAVAL_ENGINEERING") &&
      tile.improvement === "PORT" &&
      publicActiveOwnedPort(view, tile, view.viewer.id) &&
      !cityHasImprovement(view, city.id, "SHIPYARD")
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
      (tile.terrain === "MOUNTAIN" &&
        !view.viewer.researchedTechs.includes("ENGINEERING")) ||
      tile.resource !== null ||
      tile.improvement !== null ||
      cityHasImprovement(view, city.id, spatial.improvement)
    )
      return false;
    const adjacent = adjacentPublicTiles(view, tile.at).filter(
      (candidate): candidate is Extract<PlayerTileViewV7, { explored: true }> =>
        candidate.explored,
    );
    if (kind === "BUILD_WINDMILL")
      return adjacent.some(
        (item) =>
          item.territoryOwnerId === view.viewer.id &&
          item.improvement === "FARM",
      );
    if (kind === "BUILD_SAWMILL")
      return adjacent.some(
        (item) =>
          item.territoryOwnerId === view.viewer.id &&
          item.improvement === "LUMBER_CAMP",
      );
    if (kind === "BUILD_FORGE")
      return adjacent.some(
        (item) =>
          item.territoryOwnerId === view.viewer.id &&
          item.improvement === "MINE",
      );
    if (kind === "BUILD_WORKSHOP")
      return (
        distinct(
          adjacent.flatMap((item) =>
            item.territoryCityId === city.id &&
            item.improvement !== null &&
            ["FARM", "LUMBER_CAMP", "MINE"].includes(item.improvement)
              ? [item.improvement]
              : [],
          ),
        ).length >= 1
      );
    if (kind === "BUILD_MARKET")
      return (
        distinct(
          adjacent.flatMap((item) => {
            if (item.territoryOwnerId !== view.viewer.id) return [];
            const family = improvementFamily(item.improvement);
            return family === null ? [] : [family];
          }),
        ).length >= 1
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
  if (kind === "CULTIVATE_FOREST")
    return (
      view.viewer.coins >= 4 &&
      tile.site === null &&
      tile.terrain === "FOREST" &&
      tile.resource === null &&
      tile.improvement === null
    );
  if (kind === "BLAST_MOUNTAIN")
    return (
      view.viewer.coins >= 3 &&
      view.viewer.researchedTechs.includes("ENGINEERING") &&
      tile.site === null &&
      tile.terrain === "MOUNTAIN" &&
      tile.resource === null &&
      tile.improvement === null &&
      !tile.fieldDefense
    );
  if (kind === "BUILD_ROAD")
    return (
      view.viewer.coins >= 2 &&
      tile.biome !== null &&
      tile.site === null &&
      !tile.road &&
      (tile.terrain !== "MOUNTAIN" ||
        view.viewer.researchedTechs.includes("ENGINEERING"))
    );
  return (
    kind === "REDEVELOP" &&
    tile.improvement !== null &&
    ((tile.improvement !== "PORT" && tile.improvement !== "SHIPYARD") ||
      !view.units.some((unit) => same(unit.at, tile.at)))
  );
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
  const attackReady =
    !primaryUsedForQuery(attacker) || attacker.activation.overrunActive;
  if (
    attacker.form === "EMBARKED" ||
    !attackerRule.abilities.includes("ATTACK") ||
    !attackReady ||
    (!attacker.activation.overrunActive &&
      attacker.activation.attacksUsed >= 1) ||
    (attacker.activation.moved && !attackerRule.mayUsePrimaryActionAfterMove) ||
    distance < attackerRule.minimumRange ||
    distance > attackerRule.range
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
  if (defense.visibility === "BASE_ONLY") return null;
  const attack2 = rationalToHalfUnits(attack.total);
  const targetTile = tileAtView(view, target.at);
  if (targetTile?.explored !== true) return null;
  const fortificationLevel =
    target.form === "LAND" && targetTile.territoryOwnerId === target.ownerId
      ? (targetTile.fortificationLevel ?? 0)
      : 0;
  const defense2 =
    target.form === "EMBARKED"
      ? 2
      : defenderRule.defense2 + fortificationLevel * 2;
  const bonus =
    target.form === "LAND" &&
    (targetTile.terrain === "FOREST" || targetTile.terrain === "MOUNTAIN")
      ? { numerator: 3, denominator: 2 }
      : { numerator: 1, denominator: 1 };
  const breachApplied = false;
  const applied = bonus;
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
    target.form !== "EMBARKED" &&
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
    attacker.role !== "CATAPULT" &&
    attacker.form === "LAND" &&
    target.form === "LAND" &&
    !(attacker.role === "MARKSMAN" && distance > 1) &&
    publicAdvanceDestinationLegal(view, target.at);
  const nextAttacks = attacker.activation.attacksUsed + 1;
  const overrunContinues =
    attacker.role === "KNIGHT" &&
    advances &&
    view.units.some(
      (unit) =>
        unit.id !== attacker.id &&
        unit.id !== target.id &&
        unit.hp > 0 &&
        publicHostile(view, attacker.ownerId, unit.ownerId) &&
        chebyshev(target.at, unit.at) === 1,
    );
  return {
    attackerId,
    targetUnitId,
    attack2,
    defense2,
    minimumRange: attackerRule.minimumRange,
    maximumRange: attackerRule.range,
    chargeApplied:
      attacker.role === "RAIDER" &&
      view.viewer.researchedTechs.includes("RAIDING") &&
      attacker.activation.moved &&
      attacker.activation.movedPathLength >= 2 &&
      attacker.activation.attacksUsed === 0,
    inspiredApplied:
      attacker.activation.inspired && attacker.activation.attacksUsed === 0,
    inspiredConsumed: attacker.activation.inspired,
    breachApplied,
    defenseBonusNumerator: applied.numerator,
    defenseBonusDenominator: applied.denominator,
    fortificationLevel,
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
    attacksUsed: nextAttacks,
    attacksRemaining: overrunContinues ? 1 : 0,
    overrunAdvance: attacker.role === "KNIGHT" && advances,
    overrunContinues,
    splash:
      attacker.role === "BATTLESHIP"
        ? view.units
            .filter(
              (unit) =>
                unit.hp > 0 &&
                unit.id !== target.id &&
                chebyshev(unit.at, target.at) === 1 &&
                publicHostile(view, attacker.ownerId, unit.ownerId),
            )
            .sort(
              (left, right) =>
                left.at.y - right.at.y ||
                left.at.x - right.at.x ||
                left.id - right.id,
            )
            .map((unit) => {
              const damage = Math.min(
                unit.hp,
                Math.max(1, Math.ceil(damageToDefender / 2)),
              );
              return {
                unitId: unit.id,
                at: unit.at,
                damage,
                dies: damage >= unit.hp,
              };
            })
        : [],
  };
}

function publicAdvanceDestinationLegal(
  view: PlayerViewV7,
  at: CoordV7,
): boolean {
  const tile = tileAtView(view, at);
  return (
    tile?.explored === true &&
    (tile.terrain !== "MOUNTAIN" ||
      view.viewer.researchedTechs.includes("ENGINEERING"))
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
  const water = tile.biome === null;
  if (
    (defender.form === "LAND" && water) ||
    (defender.form !== "LAND" && !water)
  )
    return "BLOCKED";
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
    !view.viewer.researchedTechs.includes("ENGINEERING")
  )
    return "BLOCKED";
  if (tile.terrain === "DEEP_WATER") {
    if (defender.ownerId !== view.viewer.id) return "UNKNOWN_BEHIND_FOG";
    if (!view.viewer.researchedTechs.includes("NAVIGATION")) return "BLOCKED";
  }
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
        chebyshev(unit.at, at) <=
          (unit.form === "LAND" && unit.role === "RAIDER" ? 2 : 1),
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
