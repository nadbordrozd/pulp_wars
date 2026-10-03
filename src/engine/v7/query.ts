import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  SPATIAL_ECONOMIC_ACTIONS_V7,
  TECHNOLOGY_BRANCH_IDS_V7,
  EMBARKED_LANDING_MAX_SPENT_V7,
  effectiveRoleRuleV7,
  embarkedMovementSpentV7,
  factionRulesV7,
  factionTreeV7,
  technologyCapabilitiesV7,
  EGG_DEFENSE2_V7,
  MIND_CONTROL_COOLDOWN_TURNS_V7,
  MIND_CONTROL_HP_V7,
  MIND_CONTROL_RANGE_V7,
  MIND_CONTROL_THRALL_LIMIT_V7,
  PROMOTION_KILLS_V7,
  TRACTOR_BEAM_RANGE_V7,
  armouredDamageV7,
  attackIgnoresCityWallsV7,
  attackIsChargeV7,
  canEnterTerrainV7,
  chargeRunUpAttack2V7,
  flyerMayStandOnSiteV7,
  isEggLaidRoleV7,
  unitCapacitySlotsV7,
  CHILL_TURNS_V7,
  unitFliesV7,
  unitGrowsV7,
  unitIsMountainBornV7,
  unitIsSluggishV7,
  unitMayEnterMountainV7,
  primaryActionBlockedAfterMoveV7,
  sluggishUnitMovedV7,
  unitMovementModeV7,
  unitRoleMechanicsV7,
  unitRoleRuleV7,
  unitTakesCoverV7,
  cityUnitCapacityForV7,
  isRallyTargetV7,
  isResourceRevealedV7,
  playerTechnologyResearchCostV7,
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
  arePlayersAlliedV7,
  arePlayersHostileV7,
  assignedUnitCountV7,
  cityLevelIncomeV7,
  cityUnitCapacityV7,
  marketCoinsV7,
  rewardCandidatesForLevelV7,
} from "./economy";
import { raiseDeadGravesV7 } from "./graves";
import { applyCommandV7 } from "./reducer";
import { BITTEN_RISING_HP_V7, afflictionCombatEffectsV7 } from "./afflictions";
import {
  blastAreaV7,
  isExplodingUnitV7,
  resolveExplosionChainV7,
  type BlastUnitV7,
  type ExplosionCauseV7,
} from "./explosions";
import { INFECT_RISING_HP_V7 } from "./infect";
import {
  advanceSiteAllowedV7,
  attackFortificationV7,
  attackHasAcidV7,
  attackHasPierceV7,
  calculateCombatPreviewV7,
  collateralEntryV7,
  gangUpBonusV7,
  sweepEntryV7,
  tractorBeamTargetTechnologyV7,
  undeadCombatEffectsV7,
  type CombatOptionsV7,
} from "./combat";
import {
  attackMaximumRangeV7,
  attackShattersV7,
  unitAvoidsForeignSitesV7,
  blizzardHalvedDamageV7,
  blizzardProtectsV7,
  canBeChilledV7,
  chillOfV7,
  coldSnapTargetsV7,
  isChilledV7,
  isIceFolkLandUnitV7,
  matchHasIceFolkV7,
  sweepFlankTilesV7,
  unitOwnerIsIceFolkV7,
  withinBolasRangeV7,
} from "./ice-folk";
import {
  absorbHitV7,
  isThrallV7,
  pierceTileV7,
  rayPowerV7,
  shieldOfV7,
  tractorBeamDestinationV7,
} from "./martian";
import { grownHpV7 } from "./growth";
import { laidEggHpV7, laidEggTurnsV7, publicNestTilesV7 } from "./eggs";
import type { CombatPreviewV7, DomainEventV7 } from "./events";
import { reachablePlayerMovementPathsV7 } from "./movement";
import {
  spatialContributionAtV7,
  spatialPlacementCountV7,
  tileAtV7,
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
  isAfloatFormV7,
  type CoordV7,
  type FactionIdV7,
  type FactionTreeIdV7,
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
import {
  WAIL_RADIUS_V7,
  publicWailLeavesGraveV7,
  publicWailTargetsV7,
  type WailPreviewV7,
} from "./wail";

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
  readonly id: FactionTreeIdV7;
  readonly faction: FactionIdV7;
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
  // Revision 13: the tree, unlock effects, and role labels are the viewer's
  // own faction registration.
  const tree = factionTreeV7(player.faction);
  return {
    id: tree.id,
    faction: tree.faction,
    ownedCityCount,
    branches: TECHNOLOGY_BRANCH_IDS_V7,
    nodes: tree.nodes.map((node) => {
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
      // The free opener applies only to researchable offers; a Dry Land
      // Naval node keeps its ordinary cost.
      const cost =
        nodeState === "DISABLED"
          ? technologyResearchCostV7(node.tier, ownedCityCount)
          : playerTechnologyResearchCostV7(
              node.tier,
              ownedCityCount,
              player.researchedTechs.length,
            );
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
        unlockedRoleRules: node.unlockedRoles.map(
          (roleId) => tree.roleRules[roleId],
        ),
      };
    }),
    roleBindings: tree.roleRules,
  };
}

export function queryTechnologyCapabilitiesV7(
  input: GameStateV7 | PlayerViewV7,
  viewerId?: PlayerId,
): TechnologyCapabilitiesV7 {
  const viewer = asView(input, viewerId).viewer;
  return technologyCapabilitiesV7(viewer.researchedTechs, viewer.faction);
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
  if (city.cityActionAvailable !== true) return;
  const centerBlocked = view.units.some((unit) => same(unit.at, city.at));
  const capacity = cityUnitCapacityForV7(
    city.level,
    player.researchedTechs,
    player.faction,
  );
  // Revision 19 section 5.1: used slots are a sum (own units are always
  // visible to their owner, with their home city).
  const assigned = view.units
    .filter((unit) => unit.ownerId === player.id && unit.homeCityId === city.id)
    .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0);
  const fits = (role: UnitRoleIdV7): boolean =>
    assigned + unitCapacitySlotsV7(view, { ownerId: player.id, role }) <=
    capacity;
  if (
    player.researchedTechs.includes("PLANNING") &&
    city.level >= 3 &&
    !city.landGrantUsed &&
    player.coins >= 6 &&
    !view.pendingChoices.some((choice) => choice.cityId === city.id) &&
    // An explored cell is neutral only when it has no public territory owner:
    // the view hides the city ID of territory whose city center is still
    // unexplored, but always shows that territory's owner.
    view.board.tiles.some(
      (tile) =>
        Math.abs(tile.at.x - city.at.x) <= 2 &&
        Math.abs(tile.at.y - city.at.y) <= 2 &&
        tile.explored &&
        tile.territoryCityId === null &&
        tile.territoryOwnerId === null,
    )
  )
    candidates.push({ kind: "LAND_GRANT", cityId: city.id });
  const forgeDiscount = view.improvementValues.some(
    (value) =>
      value.improvement === "FORGE" &&
      value.level > 0 &&
      (() => {
        const tile = tileAtView(view, value.at);
        return tile?.explored === true && tile.territoryCityId === city.id;
      })(),
  );
  // Revision 19 section 6.3: an egg-laid role is never trained. Its owner
  // lays it on a nest tile of the city; laying does not need an empty center.
  const nestTiles = UNIT_ROLE_IDS_V7.some((role) =>
    isEggLaidRoleV7(role, player.faction),
  )
    ? publicNestTilesV7(view, city)
    : [];
  for (const role of UNIT_ROLE_IDS_V7) {
    const rule = effectiveRoleRuleV7(role, player.faction);
    if (isEggLaidRoleV7(role, player.faction)) {
      if (
        fits(role) &&
        rule.cost !== null &&
        Math.max(1, rule.cost - (forgeDiscount ? 1 : 0)) <= player.coins &&
        (rule.technology === null ||
          player.researchedTechs.includes(rule.technology))
      )
        for (const at of nestTiles)
          candidates.push({ kind: "LAY_EGG", cityId: city.id, role, at });
      continue;
    }
    if (
      !centerBlocked &&
      fits(role) &&
      role !== "PATROL_BOAT" &&
      role !== "BATTLESHIP" &&
      rule.cost !== null &&
      // The Forge discount never lowers a cost below 1 (revision 17: the
      // 1-Coin Goblin stays at 1), exactly as the reducer charges it.
      Math.max(1, rule.cost - (forgeDiscount ? 1 : 0)) <= player.coins &&
      (rule.technology === null ||
        player.researchedTechs.includes(rule.technology))
    )
      candidates.push({ kind: "TRAIN", cityId: city.id, role });
  }
  for (const role of ["PATROL_BOAT", "BATTLESHIP"] as const) {
    const rule = effectiveRoleRuleV7(role, player.faction);
    if (
      fits(role) &&
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

/**
 * Public landing tiles for an own embarked unit standing at `from`: adjacent,
 * explored land, enterable (Mountain needs Engineering), outside formal
 * allied territory, and with no visible occupant.
 */
function publicLandingTilesV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  from: CoordV7,
): PlayerTileViewV7[] {
  const player = view.viewer;
  // The Martian revision: the landing tile goes through the shared
  // `canEnterTerrainV7` with the unit's land-form movement mode, and a
  // flyer never lands on a settlement center it does not own.
  const movementMode = unitMovementModeV7(view, unit);
  return adjacentPublicTiles(view, from).filter(
    (tile) =>
      tile.explored &&
      canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode,
        afloat: false,
        engineering: player.researchedTechs.includes("ENGINEERING"),
        navigation: player.researchedTechs.includes("NAVIGATION"),
        // The Ice Folk revision section 7.1: the unit lands in land form.
        mountainBorn: unitIsMountainBornV7(view, {
          ownerId: unit.ownerId,
          role: unit.role,
        }),
      }) &&
      // The Ice Folk revision section 7.7: nor does a Sabretooth.
      (!unitAvoidsForeignSitesV7(view, {
        ownerId: unit.ownerId,
        role: unit.role,
      }) ||
        flyerMayStandOnSiteV7(
          tile.site,
          view.cities.find((city) => same(city.at, tile.at))?.ownerId ?? null,
          unit.ownerId,
        )) &&
      (tile.territoryOwnerId === null ||
        tile.territoryOwnerId === player.id ||
        !publicAllied(view, player.id, tile.territoryOwnerId)) &&
      !view.units.some(
        (candidate) => candidate.id !== unit.id && same(candidate.at, tile.at),
      ),
  );
}

export interface PublicLandingAfterMoveV7 {
  /** The land cell the unit would land on. */
  readonly at: CoordV7;
  /** The one-cell Move to the intermediate water cell. */
  readonly move: Extract<CommandV7, { kind: "MOVE" }>;
  /** The landing sent after the Move reaches that cell. */
  readonly disembark: Extract<CommandV7, { kind: "DISEMBARK" }>;
}

export interface PublicLandingPreviewV7 {
  readonly unitId: UnitId;
  /** Offered `DISEMBARK` cells ("Land now"), in `(y, x)` order. */
  readonly direct: readonly CoordV7[];
  /** Cells reached by one water step then landing, in `(y, x)` order. */
  readonly afterMove: readonly PublicLandingAfterMoveV7[];
}

/**
 * Revision 16 landing preview (section 5.4) for an own embarked unit. Direct
 * cells are the offered `DISEMBARK` targets. While the unit has not moved,
 * `afterMove` adds each other legal landing cell adjacent to an offered
 * one-cell Move destination; its intermediate water cell is the first such
 * destination in `(y, x)` order. Null for any other unit.
 */
export function queryLandingPreviewV7(
  view: PlayerViewV7,
  unitId: UnitId,
  commands: readonly CommandV7[] = queryPlayerCommandsV7(view),
): PublicLandingPreviewV7 | null {
  const unit = view.units.find((candidate) => candidate.id === unitId);
  if (
    unit === undefined ||
    unit.ownerId !== view.viewer.id ||
    unit.form !== "EMBARKED"
  )
    return null;
  const byCoord = (left: CoordV7, right: CoordV7) =>
    left.y - right.y || left.x - right.x;
  const direct = commands
    .flatMap((command) =>
      command.kind === "DISEMBARK" && command.unitId === unitId
        ? [command.at]
        : [],
    )
    .sort(byCoord);
  const afterMove = new Map<string, PublicLandingAfterMoveV7>();
  // A one-cell Move spends one point; landing then spends the other.
  if (!unit.activation.moved) {
    const moves = commands
      .flatMap((command) =>
        command.kind === "MOVE" &&
        command.unitId === unitId &&
        command.path.length === 1
          ? [command]
          : [],
      )
      .sort((left, right) =>
        byCoord(left.path[0] as CoordV7, right.path[0] as CoordV7),
      );
    const directKeys = new Set(direct.map((at) => `${at.x},${at.y}`));
    for (const move of moves) {
      const via = move.path[0] as CoordV7;
      for (const tile of publicLandingTilesV7(view, unit, via)) {
        const key = `${tile.at.x},${tile.at.y}`;
        if (directKeys.has(key) || afterMove.has(key)) continue;
        afterMove.set(key, {
          at: tile.at,
          move,
          disembark: { kind: "DISEMBARK", unitId, at: tile.at },
        });
      }
    }
  }
  return {
    unitId,
    direct,
    afterMove: [...afterMove.values()].sort((left, right) =>
      byCoord(left.at, right.at),
    ),
  };
}

function appendPublicUnitCommandsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
  candidates: CommandV7[],
): void {
  const player = view.viewer;
  if (unit.ownerId !== player.id) return;
  // Revision 19 section 6.2: an Egg accepts no unit command except Disband
  // (with Administration, on any turn).
  if (unit.form === "EGG") {
    if (player.researchedTechs.includes("ADMINISTRATION"))
      candidates.push({ kind: "DISBAND", unitId: unit.id });
    return;
  }
  const overrun = unit.activation.overrunActive;
  if (
    !overrun &&
    unit.form === "EMBARKED" &&
    !unit.activation.handled &&
    // Revision 16: landing needs one of the two embarked points left.
    embarkedMovementSpentV7(unit.activation) <= EMBARKED_LANDING_MAX_SPENT_V7
  )
    for (const tile of publicLandingTilesV7(view, unit, unit.at))
      candidates.push({ kind: "DISEMBARK", unitId: unit.id, at: tile.at });
  if (
    unit.activation.escapeAvailable ||
    (!overrun && !unit.activation.moved && !primaryUsedForQuery(unit))
  )
    for (const reachable of reachablePlayerMovementPathsV7(view, unit))
      candidates.push({ kind: "MOVE", unitId: unit.id, path: reachable.path });
  const rule = unitRoleRuleV7(view, unit);
  const primaryReady =
    !primaryUsedForQuery(unit) && !primaryActionBlockedAfterMoveV7(view, unit);
  const attackReady =
    unit.form !== "EMBARKED" && (primaryReady || unit.activation.overrunActive);
  // The Ice Folk revision section 7.2: a Yeti on a Mountain reaches 2.
  const attackRange = publicAttackMaximumRangeV7(view, unit);
  for (const target of view.units) {
    const distance = chebyshev(unit.at, target.at);
    if (
      attackReady &&
      rule.abilities.includes("ATTACK") &&
      publicHostile(view, player.id, target.ownerId) &&
      distance >= rule.minimumRange &&
      distance <= attackRange
    )
      candidates.push({
        kind: "ATTACK",
        unitId: unit.id,
        targetUnitId: target.id,
      });
  }
  // The Martian revision: Beam Down (an unmoved Saucer), Mind Control, and
  // the Tractor Beam, each offered exactly for its legal targets.
  if (
    !overrun &&
    unit.form === "LAND" &&
    !primaryUsedForQuery(unit) &&
    !primaryActionBlockedAfterMoveV7(view, unit)
  ) {
    if (rule.abilities.includes("BEAM_DOWN") && !unit.activation.moved)
      for (const passenger of publicBeamDownPassengersV7(view, unit))
        for (const to of publicBeamDownDestinationsV7(view, unit, passenger))
          candidates.push({
            kind: "BEAM_DOWN",
            unitId: unit.id,
            passengerUnitId: passenger.id,
            to,
          });
    if (rule.abilities.includes("MIND_CONTROL"))
      for (const target of publicMindControlTargetsV7(view, unit))
        candidates.push({
          kind: "MIND_CONTROL",
          unitId: unit.id,
          targetUnitId: target.id,
        });
    if (rule.abilities.includes("TRACTOR_BEAM"))
      for (const target of publicTractorBeamTargetsV7(view, unit))
        candidates.push({
          kind: "TRACTOR_BEAM",
          unitId: unit.id,
          targetUnitId: target.id,
        });
  }
  // The Ice Folk revision: the Sled's Bolas (every legal target, in
  // target-ID order) and the Ice Witch's Cold Snap (with a target).
  if (!overrun && primaryReady && unit.form === "LAND") {
    if (rule.abilities.includes("BOLAS"))
      for (const target of publicBolasTargetsV7(view, unit))
        candidates.push({
          kind: "THROW_BOLAS",
          unitId: unit.id,
          targetUnitId: target.id,
        });
    if (
      rule.abilities.includes("COLD_SNAP") &&
      coldSnapTargetsV7(view, unit, view.units).length > 0
    )
      candidates.push({ kind: "COLD_SNAP", unitId: unit.id });
  }
  // Revision 19 Hatch: every adjacent own Egg laid on an earlier turn.
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("HATCH")
  )
    for (const egg of publicHatchTargetsV7(view, unit))
      candidates.push({ kind: "HATCH", unitId: unit.id, eggUnitId: egg.id });
  // Revision 13 Wail: offered exactly when at least one visible target exists.
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("WAIL") &&
    publicWailTargetsV7(view, unit).length > 0
  )
    candidates.push({ kind: "WAIL", unitId: unit.id });
  // Revision 17 Kaboom: any goblin-crewed land-form unit that has not used a
  // primary action, after a Move too, with or without a unit in the area.
  if (
    !overrun &&
    !primaryUsedForQuery(unit) &&
    !sluggishUnitMovedV7(view, unit) &&
    unit.form === "LAND" &&
    rule.abilities.includes("KABOOM")
  )
    candidates.push({ kind: "KABOOM", unitId: unit.id });
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("RALLY") &&
    view.units.some((target) => isRallyTargetV7(view, unit, target))
  )
    candidates.push({ kind: "RALLY", unitId: unit.id });
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("TEND_WOUNDED") &&
    publicTendTargetsV7(view, unit).length > 0
  )
    candidates.push({ kind: "TEND_WOUNDED", unitId: unit.id });
  // Revision 13 Grave actions (sections 6.2 and 6.3), offered exactly when
  // legal from the viewer's explored Graves and visible units.
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("RAISE_DEAD") &&
    raiseDeadGravesV7(view.graves, view.units, unit.at).length > 0
  )
    candidates.push({ kind: "RAISE_DEAD", unitId: unit.id });
  if (
    !overrun &&
    primaryReady &&
    unit.form === "LAND" &&
    rule.abilities.includes("DEVOUR") &&
    view.graves.some((grave) => same(grave, unit.at))
  )
    candidates.push({ kind: "DEVOUR", unitId: unit.id });
  if (overrun) return;
  if (
    !unit.activation.moved &&
    !primaryUsedForQuery(unit) &&
    unit.hp < unit.maxHp &&
    unit.form !== "EMBARKED" &&
    !publicRestlessOutsideOwnTerritory(view, unit) &&
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
  // Revision 19: a Dinosaur unit grows instead and is never promoted. The
  // Martian revision: a Thrall is never promoted and cannot Disband, and a
  // flyer cannot Pillage.
  const thrall = isThrallV7(view.thralls, unit.id);
  if (
    unit.form !== "EMBARKED" &&
    unit.kills >= PROMOTION_KILLS_V7 &&
    !unit.veteran &&
    !unitGrowsV7(view, unit) &&
    !thrall
  )
    candidates.push({ kind: "PROMOTE", unitId: unit.id });
  const tile = tileAtView(view, unit.at);
  if (
    player.researchedTechs.includes("RAIDING") &&
    unit.form === "LAND" &&
    unit.role !== "JUGGERNAUT" &&
    !unitFliesV7(view, unit) &&
    !primaryUsedForQuery(unit) &&
    !sluggishUnitMovedV7(view, unit) &&
    tile?.explored === true &&
    tile.improvement !== null &&
    tile.territoryOwnerId !== null &&
    publicHostile(view, player.id, tile.territoryOwnerId)
  )
    candidates.push({ kind: "PILLAGE", unitId: unit.id });
  // Revision 14: plagued and bitten units cannot Disband.
  if (
    player.researchedTechs.includes("ADMINISTRATION") &&
    !primaryUsedForQuery(unit) &&
    unit.form === "LAND" &&
    unit.role !== "JUGGERNAUT" &&
    !thrall &&
    !view.plagued.some((entry) => entry.unitId === unit.id) &&
    !view.bitten.some((entry) => entry.unitId === unit.id)
  )
    candidates.push({ kind: "DISBAND", unitId: unit.id });
  if (
    !unit.activation.moved &&
    !primaryUsedForQuery(unit) &&
    unit.form === "LAND" &&
    // Revision 17: the Goblin Goblin cannot build Field Defense.
    unitRoleMechanicsV7(view, unit).buildsFieldDefense &&
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

/**
 * Revision 19 Hatch targets of an own Shaman, from the public view: the own
 * Eggs on the eight tiles around it that were not laid this turn, in unit-ID
 * order. Own units and their countdowns are always visible.
 */
function publicHatchTargetsV7(
  view: PlayerViewV7,
  shaman: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  return view.units
    .filter(
      (egg) =>
        egg.hp > 0 &&
        egg.ownerId === shaman.ownerId &&
        egg.form === "EGG" &&
        chebyshev(egg.at, shaman.at) === 1 &&
        view.eggs.some(
          (entry) => entry.unitId === egg.id && !entry.laidThisTurn,
        ),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * The Martian revision section 8.1 row 6: the passengers an own Saucer may
 * beam: other own living land-form one-slot non-flying units standing on or
 * next to the center of an own city, in unit-ID order. Own units and cities
 * are always visible to their owner.
 */
function publicBeamDownPassengersV7(
  view: PlayerViewV7,
  saucer: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  const centers = view.cities.filter((city) => city.ownerId === saucer.ownerId);
  return view.units
    .filter(
      (unit) =>
        unit.id !== saucer.id &&
        unit.hp > 0 &&
        unit.ownerId === saucer.ownerId &&
        unit.form === "LAND" &&
        unitCapacitySlotsV7(view, unit) === 1 &&
        unitMovementModeV7(view, unit) !== "FLY" &&
        centers.some((city) => chebyshev(city.at, unit.at) <= 1),
    )
    .sort((left, right) => left.id - right.id);
}

/**
 * Section 8.1 row 7: the legal Beam Down tiles of `passenger` around the
 * Saucer, in (y, x) order: land, with no unit and no treasure chest, not a
 * settlement site, not in territory allied to the actor, and enterable by
 * the passenger. Every tile around an own Saucer is explored.
 */
function publicBeamDownDestinationsV7(
  view: PlayerViewV7,
  saucer: PlayerViewV7["units"][number],
  passenger: PlayerViewV7["units"][number],
): readonly CoordV7[] {
  const player = view.viewer;
  const movementMode = unitMovementModeV7(view, passenger);
  return adjacentPublicTiles(view, saucer.at)
    .filter(
      (tile) =>
        tile.explored &&
        tile.site === null &&
        canEnterTerrainV7({
          terrain: tile.terrain,
          movementMode,
          afloat: false,
          engineering: player.researchedTechs.includes("ENGINEERING"),
          navigation: player.researchedTechs.includes("NAVIGATION"),
          mountainBorn: unitIsMountainBornV7(view, passenger),
        }) &&
        !view.units.some((unit) => unit.hp > 0 && same(unit.at, tile.at)) &&
        !view.treasureChests.some((chest) => same(chest, tile.at)) &&
        !(
          tile.territoryOwnerId !== null &&
          publicAllied(view, player.id, tile.territoryOwnerId)
        ),
    )
    .map((tile) => tile.at)
    .sort((left, right) => left.y - right.y || left.x - right.x);
}

/**
 * Section 8.2: the legal Mind Control targets of an own Brain that is ready
 * (land form, no primary action used): none while it has a cooldown entry
 * or controls the limit of Thralls; otherwise every visible hostile
 * land-form one-slot non-`JUGGERNAUT` unit within range with at most
 * `MIND_CONTROL_HP_V7` HP that does not stand on a settlement site.
 */
function publicMindControlTargetsV7(
  view: PlayerViewV7,
  brain: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  if (
    view.mindControlCooldowns.some((entry) => entry.unitId === brain.id) ||
    view.thralls.filter((entry) => entry.brainUnitId === brain.id).length >=
      MIND_CONTROL_THRALL_LIMIT_V7
  )
    return [];
  return view.units
    .filter((target) => {
      const tile = tileAtView(view, target.at);
      return (
        target.hp > 0 &&
        publicHostile(view, brain.ownerId, target.ownerId) &&
        target.form === "LAND" &&
        target.role !== "JUGGERNAUT" &&
        unitCapacitySlotsV7(view, target) === 1 &&
        tile?.explored === true &&
        tile.site === null &&
        chebyshev(brain.at, target.at) <= MIND_CONTROL_RANGE_V7 &&
        target.hp <= MIND_CONTROL_HP_V7
      );
    })
    .sort((left, right) => left.id - right.id);
}

/**
 * Section 8.4: the tile an own Mothership would pull `target` to, or null
 * when the pull is illegal: the target is visible, own or hostile, exactly
 * `TRACTOR_BEAM_RANGE_V7` tiles away, not an Egg, a `JUGGERNAUT`-role unit,
 * or a two-slot unit, and the destination passes the Push conditions and
 * holds no treasure chest. The destination is next to the Mothership, so it
 * is explored and every unit on it is visible.
 */
function publicTractorBeamDestinationV7(
  view: PlayerViewV7,
  mothership: PlayerViewV7["units"][number],
  target: PlayerViewV7["units"][number],
): CoordV7 | null {
  if (
    target.hp <= 0 ||
    publicAllied(view, mothership.ownerId, target.ownerId) ||
    target.form === "EGG" ||
    target.role === "JUGGERNAUT" ||
    unitCapacitySlotsV7(view, target) !== 1 ||
    chebyshev(mothership.at, target.at) !== TRACTOR_BEAM_RANGE_V7
  )
    return null;
  const to = tractorBeamDestinationV7(mothership.at, target.at);
  const tile = tileAtView(view, to);
  if (tile?.explored !== true || tile.site !== null) return null;
  const technology = tractorBeamTargetTechnologyV7(
    target.ownerId === view.viewer.id,
    view.viewer.researchedTechs,
    (() => {
      const from = tileAtView(view, target.at);
      return from?.explored === true ? from.terrain : undefined;
    })(),
  );
  return canEnterTerrainV7({
    terrain: tile.terrain,
    movementMode: unitMovementModeV7(view, target),
    afloat: isAfloatFormV7(target.form),
    ...technology,
    mountainBorn: unitIsMountainBornV7(view, target),
  }) &&
    !view.units.some(
      (unit) => unit.id !== target.id && unit.hp > 0 && same(unit.at, to),
    ) &&
    !view.treasureChests.some((chest) => same(chest, to)) &&
    !(
      tile.territoryOwnerId !== null &&
      publicAllied(view, target.ownerId, tile.territoryOwnerId)
    )
    ? to
    : null;
}

/** The legal Tractor Beam targets of an own Mothership, in unit-ID order. */
function publicTractorBeamTargetsV7(
  view: PlayerViewV7,
  mothership: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  return view.units
    .filter(
      (target) =>
        target.id !== mothership.id &&
        publicTractorBeamDestinationV7(view, mothership, target) !== null,
    )
    .sort((left, right) => left.id - right.id);
}

/** The Martian revision section 11: the preview of an offered Beam Down. */
export interface BeamDownPreviewV7 {
  readonly unitId: UnitId;
  readonly passengerUnitId: UnitId;
  /** The passenger's tile now. */
  readonly from: CoordV7;
  /** The legal destination tiles in (y, x) order. */
  readonly destinations: readonly CoordV7[];
  /** The destinations whose Field Defense the landing would destroy. */
  readonly fieldDefenseDestroyed: readonly CoordV7[];
}

/**
 * Null unless a `BEAM_DOWN` with that Saucer and passenger is offered;
 * otherwise exact (every tile around an own Saucer is explored).
 */
export function previewBeamDownV7(
  view: PlayerViewV7,
  unitId: UnitId,
  passengerUnitId: UnitId,
): BeamDownPreviewV7 | null {
  const destinations = queryPlayerCommandsV7(view).flatMap((command) =>
    command.kind === "BEAM_DOWN" &&
    command.unitId === unitId &&
    command.passengerUnitId === passengerUnitId
      ? [command.to]
      : [],
  );
  const passenger = view.units.find((unit) => unit.id === passengerUnitId);
  if (destinations.length === 0 || passenger === undefined) return null;
  return {
    unitId,
    passengerUnitId,
    from: passenger.at,
    destinations,
    fieldDefenseDestroyed: destinations.filter((at) => {
      const tile = tileAtView(view, at);
      return (
        tile?.explored === true &&
        tile.fieldDefense &&
        tile.territoryOwnerId !== null &&
        publicHostile(view, view.viewer.id, tile.territoryOwnerId)
      );
    }),
  };
}

/** The Martian revision section 11: the preview of an offered Mind Control. */
export interface MindControlPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  /** The tile the Thrall appears on (the target's tile). */
  readonly at: CoordV7;
  readonly thrallHp: number;
  readonly thrallMaxHp: number;
  /** The Thralls the Brain controls afterwards. */
  readonly thrallsAfter: number;
  readonly thrallLimit: number;
  /** The cooldown the Mind Control starts. */
  readonly cooldownTurns: number;
  /** Visible Thralls that collapse because the target is their Brain. */
  readonly collapsingUnitIds: readonly UnitId[];
  /** Visible units whose Plague ends because the target is its source. */
  readonly plagueCleared: readonly UnitId[];
}

/** Null unless that `MIND_CONTROL` is offered; otherwise exact. */
export function previewMindControlV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): MindControlPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "MIND_CONTROL" &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return null;
  const maxHp = effectiveRoleRuleV7("FIGHTER", view.viewer.faction).maxHp;
  return {
    unitId,
    targetUnitId,
    at: target.at,
    thrallHp: Math.min(target.hp, maxHp),
    thrallMaxHp: maxHp,
    thrallsAfter:
      view.thralls.filter((entry) => entry.brainUnitId === unitId).length + 1,
    thrallLimit: MIND_CONTROL_THRALL_LIMIT_V7,
    cooldownTurns: MIND_CONTROL_COOLDOWN_TURNS_V7,
    collapsingUnitIds: view.thralls
      .filter((entry) => entry.brainUnitId === targetUnitId)
      .map((entry) => entry.unitId),
    plagueCleared: view.plagued
      .filter((entry) => entry.sourceUnitId === targetUnitId)
      .map((entry) => entry.unitId),
  };
}

/** The Martian revision section 11: the preview of an offered Tractor Beam. */
export interface TractorBeamPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  readonly from: CoordV7;
  readonly to: CoordV7;
  /** Fortification levels the target has on `from` and not on `to`. */
  readonly fortificationLost: number;
  /** The city whose center the pull empties of a unit not besieging it. */
  readonly emptiesCenterOfCityId: CityId | null;
  /** The city whose siege the pull lifts (the target besieges it). */
  readonly liftsSiegeOfCityId: CityId | null;
}

/** Null unless that `TRACTOR_BEAM` is offered; otherwise exact. */
export function previewTractorBeamV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): TractorBeamPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "TRACTOR_BEAM" &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const mothership = view.units.find((unit) => unit.id === unitId);
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (mothership === undefined || target === undefined) return null;
  const to = publicTractorBeamDestinationV7(view, mothership, target);
  if (to === null) return null;
  const fortification = (at: CoordV7): number => {
    const tile = tileAtView(view, at);
    return unitTakesCoverV7(view, target) &&
      tile?.explored === true &&
      tile.territoryOwnerId === target.ownerId
      ? (tile.fortificationLevel ?? 0)
      : 0;
  };
  const city = view.cities.find((candidate) => same(candidate.at, target.at));
  const besieges =
    city !== undefined && publicHostile(view, target.ownerId, city.ownerId);
  return {
    unitId,
    targetUnitId,
    from: target.at,
    to,
    fortificationLost: Math.max(
      0,
      fortification(target.at) - fortification(to),
    ),
    emptiesCenterOfCityId: city !== undefined && !besieges ? city.id : null,
    liftsSiegeOfCityId: city !== undefined && besieges ? city.id : null,
  };
}

function publicTendTargetsV7(
  view: PlayerViewV7,
  captain: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  const plagued = new Set(view.plagued.map((entry) => entry.unitId));
  const bitten = new Set(view.bitten.map((entry) => entry.unitId));
  return view.units
    .filter(
      (target) =>
        target.ownerId === captain.ownerId &&
        target.form === "LAND" &&
        target.id !== captain.id &&
        (target.hp < target.maxHp ||
          plagued.has(target.id) ||
          bitten.has(target.id) ||
          // The Ice Folk revision section 10.5: Tend Wounded cures Chill.
          isChilledV7(view.chilled, target.id)) &&
        !target.activation.tendedThisTurn &&
        chebyshev(captain.at, target.at) === 1,
    )
    .sort((left, right) => left.id - right.id);
}

/** Revision 14 Tend Wounded preview: heals and cures, in unit-ID order. */
export interface TendWoundedPreviewV7 {
  readonly results: readonly {
    readonly unitId: UnitId;
    readonly amount: number;
    readonly hpAfter: number;
    readonly curedPlague: boolean;
    readonly curedBitten: boolean;
    /** The Ice Folk revision: the target was Chilled and becomes thawing. */
    readonly curedChill: boolean;
  }[];
}

/**
 * Exact Tend Wounded preview: null unless the command is offered. Every
 * target is an own unit, so the preview equals the resolution.
 */
export function previewTendWoundedV7(
  view: PlayerViewV7,
  unitId: UnitId,
): TendWoundedPreviewV7 | null;
export function previewTendWoundedV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): TendWoundedPreviewV7 | null;
export function previewTendWoundedV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): TendWoundedPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "TEND_WOUNDED" && command.unitId === unitId,
    )
  )
    return null;
  const captain = view.units.find((unit) => unit.id === unitId);
  if (captain === undefined) return null;
  const plagued = new Set(view.plagued.map((entry) => entry.unitId));
  const bitten = new Set(view.bitten.map((entry) => entry.unitId));
  return {
    results: publicTendTargetsV7(view, captain).map((target) => {
      const amount = Math.min(2, target.maxHp - target.hp);
      return {
        unitId: target.id,
        amount,
        hpAfter: target.hp + amount,
        curedPlague: plagued.has(target.id),
        curedBitten: bitten.has(target.id),
        curedChill: isChilledV7(view.chilled, target.id),
      };
    }),
  };
}

/**
 * The Ice Folk revision section 7.3: the legal Bolas targets of an own Sled
 * (land form, primary action ready): every visible hostile unit that can be
 * Chilled within Chebyshev 1 to 2, in unit-ID order.
 */
function publicBolasTargetsV7(
  view: PlayerViewV7,
  sled: PlayerViewV7["units"][number],
): readonly PlayerViewV7["units"][number][] {
  return view.units
    .filter(
      (target) =>
        target.id !== sled.id &&
        canBeChilledV7(view, sled.ownerId, target) &&
        withinBolasRangeV7(sled.at, target.at),
    )
    .sort((left, right) => left.id - right.id);
}

/** The Ice Folk revision section 11: the preview of an offered Bolas. */
export interface BolasPreviewV7 {
  readonly unitId: UnitId;
  readonly targetUnitId: UnitId;
  /** The target has no Chill entry, so the Bolas is a new freeze. */
  readonly becomesSluggish: boolean;
  readonly turnsLeft: number;
  /**
   * The viewer's own units whose currently offered attack on the target
   * would shatter it once it is Chilled, in unit-ID order.
   */
  readonly shatterSetups: readonly UnitId[];
}

/** Null unless that `THROW_BOLAS` is offered; otherwise exact. */
export function previewBolasV7(
  view: PlayerViewV7,
  unitId: UnitId,
  targetUnitId: UnitId,
): BolasPreviewV7 | null {
  const commands = queryPlayerCommandsV7(view);
  if (
    !commands.some(
      (command) =>
        command.kind === "THROW_BOLAS" &&
        command.unitId === unitId &&
        command.targetUnitId === targetUnitId,
    )
  )
    return null;
  const shatterSetups = commands
    .flatMap((command) =>
      command.kind === "ATTACK" &&
      command.targetUnitId === targetUnitId &&
      command.unitId !== unitId &&
      queryCombatPreviewV7(view, command.unitId, targetUnitId, {
        assumeTargetChilled: true,
      })?.shatters === true
        ? [command.unitId]
        : [],
    )
    .sort((left, right) => left - right);
  return {
    unitId,
    targetUnitId,
    becomesSluggish: chillOfV7(view.chilled, targetUnitId) === undefined,
    turnsLeft: CHILL_TURNS_V7,
    shatterSetups: [...new Set(shatterSetups)],
  };
}

/** The Ice Folk revision section 11: the preview of an offered Cold Snap. */
export interface ColdSnapPreviewV7 {
  readonly unitId: UnitId;
  readonly targets: readonly {
    readonly unitId: UnitId;
    readonly becomesSluggish: boolean;
  }[];
}

/** Null unless that `COLD_SNAP` is offered; otherwise exact (visible targets). */
export function previewColdSnapV7(
  view: PlayerViewV7,
  unitId: UnitId,
): ColdSnapPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "COLD_SNAP" && command.unitId === unitId,
    )
  )
    return null;
  const witch = view.units.find((unit) => unit.id === unitId);
  if (witch === undefined) return null;
  return {
    unitId,
    targets: coldSnapTargetsV7(view, witch, view.units).map((target) => ({
      unitId: target.id,
      becomesSluggish: chillOfV7(view.chilled, target.id) === undefined,
    })),
  };
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
        isAfloatFormV7(unit.form) &&
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

/**
 * Observation-safe exact preview for an offered Wail (revision 13 section
 * 6.6). Every Wail target is visible to its actor, so the preview equals the
 * resolution and cannot name a hidden unit.
 */
export function previewWailV7(
  view: PlayerViewV7,
  unitId: UnitId,
): WailPreviewV7 | null;
export function previewWailV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): WailPreviewV7 | null;
export function previewWailV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): WailPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "WAIL" && command.unitId === unitId,
    )
  )
    return null;
  const banshee = view.units.find((unit) => unit.id === unitId);
  if (banshee === undefined) return null;
  return {
    unitId,
    at: banshee.at,
    attack2: unitRoleRuleV7(view, banshee).attack2,
    targets: publicWailTargetsV7(view, banshee).map((target) => {
      const unit = view.units.find(
        (candidate) => candidate.id === target.unitId,
      );
      // Revision 14: a bitten land-form victim rises instead of a Grave.
      const bittenRises =
        target.dies &&
        unit !== undefined &&
        unit.form === "LAND" &&
        view.bitten.some((entry) => entry.unitId === target.unitId);
      return {
        ...target,
        leavesGrave:
          target.dies &&
          !bittenRises &&
          unit !== undefined &&
          publicWailLeavesGraveV7(view, unit),
        bittenRises,
      };
    }),
  };
}

/**
 * Observation-safe exact preview for an offered attack. The Ice Folk
 * revision: `options.assumeTargetChilled` evaluates the attack as if the
 * target had a Chill entry (section 11).
 */
export function queryCombatPreviewV7(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options?: CombatOptionsV7,
): CombatPreviewV7 | null;
export function queryCombatPreviewV7(
  state: GameStateV7,
  viewerId: PlayerId,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options?: CombatOptionsV7,
): CombatPreviewV7 | null;
export function queryCombatPreviewV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrAttacker: PlayerId | UnitId,
  attackerOrTarget: UnitId,
  maybeTarget?: UnitId | CombatOptionsV7,
  maybeOptions?: CombatOptionsV7,
): CombatPreviewV7 | null {
  const stateForm = typeof maybeTarget === "number";
  const view = stateForm
    ? asView(input, viewerOrAttacker as PlayerId)
    : (input as PlayerViewV7);
  const attackerId = stateForm
    ? attackerOrTarget
    : (viewerOrAttacker as UnitId);
  const targetUnitId = stateForm ? (maybeTarget as UnitId) : attackerOrTarget;
  const options = stateForm
    ? (maybeOptions ?? {})
    : ((maybeTarget as CombatOptionsV7 | undefined) ?? {});
  if (!publicCommandOfferingAllowedV7(view)) return null;
  return publicCombatPreview(view, attackerId, targetUnitId, options);
}

/**
 * Revision 17 public explosion preview entry. `unitId` is null for a Zombie
 * that rises during the previewed command (its ID does not exist yet).
 * `friendly` means owned by the viewer or an ally.
 */
export interface ExplosionPreviewResultV7 {
  readonly unitId: UnitId | null;
  readonly ownerId: PlayerId;
  readonly at: CoordV7;
  /** HP damage. */
  readonly damage: number;
  readonly dies: boolean;
  readonly friendly: boolean;
  /** The Martian revision: what the victim's Shield absorbs of the blast. */
  readonly shieldDamage: number;
}

/** One previewed explosion of a chain, in resolution order. */
export interface ExplosionPreviewV7 {
  readonly unitId: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly cause: ExplosionCauseV7;
  readonly wave: number;
  readonly damage: number;
  readonly results: readonly ExplosionPreviewResultV7[];
  readonly fieldDefenseDestroyed: readonly CoordV7[];
}

/**
 * Totals over every previewed explosion relative to the viewer (friendly is
 * own or allied; the Kaboom unit itself is never a result). `plunderCoins`
 * is the viewer's Plunder from its own units' blasts (0 without Plunder).
 */
export interface ExplosionPreviewTotalsV7 {
  readonly hostileDamage: number;
  readonly hostileKills: number;
  readonly friendlyDamage: number;
  readonly friendlyKills: number;
  readonly plunderCoins: number;
}

export interface ExplosionChainPreviewV7 {
  readonly explosions: readonly ExplosionPreviewV7[];
  readonly totals: ExplosionPreviewTotalsV7;
  readonly friendlyFire: boolean;
  /**
   * True when a previewed blast area (or, for an attack, the splash ring
   * or an unknown Push destination the chain depends on) includes a cell the
   * viewer has not explored; otherwise the preview equals the resolution.
   */
  readonly touchesUnexplored: boolean;
}

export interface KaboomPreviewV7 extends ExplosionChainPreviewV7 {
  readonly unitId: UnitId;
  readonly at: CoordV7;
}

export interface AttackExplosionsPreviewV7 extends ExplosionChainPreviewV7 {
  readonly attackerId: UnitId;
  readonly targetUnitId: UnitId;
}

/**
 * Revision 17 section 9 Kaboom preview: null unless `KABOOM` is offered;
 * otherwise the chain the Kaboom sets off, computed from the viewer's visible
 * units only. The first blast is always exact (its owner explored the whole
 * area); with `touchesUnexplored: false` the whole preview is exact.
 */
export function previewKaboomV7(
  view: PlayerViewV7,
  unitId: UnitId,
): KaboomPreviewV7 | null;
export function previewKaboomV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): KaboomPreviewV7 | null;
export function previewKaboomV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): KaboomPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === "KABOOM" && command.unitId === unitId,
    )
  )
    return null;
  const exploder = view.units.find((unit) => unit.id === unitId);
  if (exploder === undefined) return null;
  const simulation = createPublicChainSimulationV7(view);
  const units = view.units
    .filter((unit) => unit.id !== exploder.id)
    .map(simulation.blastUnit);
  // Death first, then the bang: a Bitten Kaboom unit rises on its tile.
  const rising = simulation.rise(simulation.blastUnit(exploder));
  if (rising !== null) units.push(rising);
  return {
    unitId,
    at: exploder.at,
    ...simulation.run(units, [
      { unit: simulation.blastUnit(exploder), cause: "KABOOM" },
    ]),
  };
}

/**
 * Revision 17 section 9: the death blasts an offered attack would set off
 * (the exploding units among the defender, the splash victims, and the
 * attacker, after the attack's deaths, risings, advance, and Push), or an
 * empty chain; null when the attack is not offered. Public information only.
 */
export function previewAttackExplosionsV7(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
): AttackExplosionsPreviewV7 | null;
export function previewAttackExplosionsV7(
  state: GameStateV7,
  viewerId: PlayerId,
  attackerId: UnitId,
  targetUnitId: UnitId,
): AttackExplosionsPreviewV7 | null;
export function previewAttackExplosionsV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrAttacker: PlayerId | UnitId,
  attackerOrTarget: UnitId,
  maybeTarget?: UnitId,
): AttackExplosionsPreviewV7 | null {
  const view =
    maybeTarget === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrAttacker as PlayerId);
  const attackerId =
    maybeTarget === undefined ? (viewerOrAttacker as UnitId) : attackerOrTarget;
  const targetUnitId = maybeTarget ?? attackerOrTarget;
  if (!publicCommandOfferingAllowedV7(view)) return null;
  const preview = publicCombatPreviewCore(view, attackerId, targetUnitId);
  if (preview === null) return null;
  const chain = publicAttackChainV7(view, preview);
  return { attackerId, targetUnitId, ...chain.preview };
}

/** Revision 13 Raise Dead preview: the Graves that rise, in (y, x) order. */
export interface RaiseDeadPreviewV7 {
  readonly graves: readonly CoordV7[];
}

/**
 * Observation-safe exact Raise Dead preview (section 6.2): null unless the
 * command is offered. A raiser's neighbours are always explored by its
 * owner, so the preview equals the resolution.
 */
export function previewRaiseDeadV7(
  view: PlayerViewV7,
  unitId: UnitId,
): RaiseDeadPreviewV7 | null;
export function previewRaiseDeadV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): RaiseDeadPreviewV7 | null;
export function previewRaiseDeadV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): RaiseDeadPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  const unit = offeredGraveActor(view, "RAISE_DEAD", unitId);
  return unit === null
    ? null
    : { graves: raiseDeadGravesV7(view.graves, view.units, unit.at) };
}

/** Revision 13 Devour preview; `amount` may be 0. */
export interface DevourPreviewV7 {
  readonly at: CoordV7;
  readonly amount: number;
  readonly hpAfter: number;
}

/**
 * Exact Devour preview (section 6.3): null unless the command is offered. The
 * Ghoul and its tile are its owner's, so the preview equals the resolution.
 */
export function previewDevourV7(
  view: PlayerViewV7,
  unitId: UnitId,
): DevourPreviewV7 | null;
export function previewDevourV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unitId: UnitId,
): DevourPreviewV7 | null;
export function previewDevourV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrUnit: PlayerId | UnitId,
  maybeUnit?: UnitId,
): DevourPreviewV7 | null {
  const view =
    maybeUnit === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrUnit as PlayerId);
  const unitId = maybeUnit ?? (viewerOrUnit as UnitId);
  const unit = offeredGraveActor(view, "DEVOUR", unitId);
  return unit === null
    ? null
    : { at: unit.at, amount: unit.maxHp - unit.hp, hpAfter: unit.maxHp };
}

function offeredGraveActor(
  view: PlayerViewV7,
  kind: "RAISE_DEAD" | "DEVOUR",
  unitId: UnitId,
): PlayerViewV7["units"][number] | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) => command.kind === kind && command.unitId === unitId,
    )
  )
    return null;
  return view.units.find((unit) => unit.id === unitId) ?? null;
}

/** Revision 19 section 10: the laying preview of one role in one city. */
export interface LayEggPreviewV7 {
  readonly cityId: CityId;
  readonly role: UnitRoleIdV7;
  /** Printed cost minus the Arms Industry discount (minimum 1). */
  readonly cost: number;
  readonly slots: number;
  readonly usedSlots: number;
  readonly capacity: number;
  /** HP of the Egg (6, or 10 with Nesting). */
  readonly hp: number;
  /** Owner Start Turns until the Egg hatches. */
  readonly turnsToHatch: number;
  /** The legal nest tiles in (y, x) order. */
  readonly nestTiles: readonly CoordV7[];
  /** The rejection that applies with any tile, or null. */
  readonly unavailableReason:
    | "CITY_ACTION_SPENT"
    | "CITY_BESIEGED"
    | "CITY_REWARD_PENDING"
    | "TECH_REQUIRED"
    | "INVALID_TILE"
    | "CITY_CAPACITY_FULL"
    | "INSUFFICIENT_COINS"
    | null;
}

/**
 * Revision 19 `LAY_EGG` preview (section 10) for the viewer's own city and
 * an egg-laid role of the viewer's registration; null otherwise. The
 * unavailable reason follows the legality order of section 6.3. It is the
 * hatch-timing preview for a new Egg.
 */
export function previewLayEggV7(
  view: PlayerViewV7,
  cityId: CityId,
  role: UnitRoleIdV7,
): LayEggPreviewV7 | null {
  const player = view.viewer;
  const city = view.cities.find(
    (candidate) => candidate.id === cityId && candidate.ownerId === player.id,
  );
  const turnsToHatch = laidEggTurnsV7(
    role,
    player.researchedTechs,
    player.faction,
  );
  const rule = effectiveRoleRuleV7(role, player.faction);
  if (city === undefined || turnsToHatch === null || rule.cost === null)
    return null;
  const forgeDiscount = view.improvementValues.some((value) => {
    if (value.improvement !== "FORGE" || value.level <= 0) return false;
    const tile = tileAtView(view, value.at);
    return tile?.explored === true && tile.territoryCityId === city.id;
  });
  const cost = Math.max(1, rule.cost - (forgeDiscount ? 1 : 0));
  const slots = unitCapacitySlotsV7(view, { ownerId: player.id, role });
  const usedSlots = view.units
    .filter((unit) => unit.ownerId === player.id && unit.homeCityId === city.id)
    .reduce((sum, unit) => sum + unitCapacitySlotsV7(view, unit), 0);
  const capacity = cityUnitCapacityForV7(
    city.level,
    player.researchedTechs,
    player.faction,
  );
  const nestTiles = publicNestTilesV7(view, city);
  return {
    cityId,
    role,
    cost,
    slots,
    usedSlots,
    capacity,
    hp: laidEggHpV7(player.researchedTechs, player.faction),
    turnsToHatch,
    nestTiles,
    unavailableReason:
      city.cityActionAvailable !== true
        ? "CITY_ACTION_SPENT"
        : publicCityBesieged(view, city.at)
          ? "CITY_BESIEGED"
          : view.pendingChoices.some((choice) => choice.cityId === city.id)
            ? "CITY_REWARD_PENDING"
            : rule.technology !== null &&
                !player.researchedTechs.includes(rule.technology)
              ? "TECH_REQUIRED"
              : nestTiles.length === 0
                ? "INVALID_TILE"
                : usedSlots + slots > capacity
                  ? "CITY_CAPACITY_FULL"
                  : player.coins < cost
                    ? "INSUFFICIENT_COINS"
                    : null,
  };
}

/** Revision 19 section 10: the preview of an offered Shaman Hatch. */
export interface HatchPreviewV7 {
  readonly unitId: UnitId;
  readonly eggUnitId: UnitId;
  /** The role of the unit that appears (exhausted for this turn). */
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  /** The hatchling's HP: its role's full HP. */
  readonly hp: number;
  /** The Egg's remaining countdown, which the Hatch saves. */
  readonly turnsSaved: number;
}

/** Revision 19: null unless `HATCH` is offered; it equals the resolution. */
export function previewHatchV7(
  view: PlayerViewV7,
  unitId: UnitId,
  eggUnitId: UnitId,
): HatchPreviewV7 | null {
  if (
    !queryPlayerCommandsV7(view).some(
      (command) =>
        command.kind === "HATCH" &&
        command.unitId === unitId &&
        command.eggUnitId === eggUnitId,
    )
  )
    return null;
  const egg = view.units.find((unit) => unit.id === eggUnitId);
  const entry = view.eggs.find((candidate) => candidate.unitId === eggUnitId);
  if (egg === undefined || entry === undefined) return null;
  return {
    unitId,
    eggUnitId,
    role: egg.role,
    at: egg.at,
    hp: unitRoleRuleV7(view, egg).maxHp,
    turnsSaved: entry.turnsRemaining,
  };
}

/**
 * Canonical combat estimate. Revision 20: `plannedPathLength` is the run-up
 * of an attack after a planned Move of that many tiles (Charge!); without it
 * the unit's current `movedPathLength` applies.
 */
export function estimateCombatV7(
  state: GameStateV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  plannedPathLength?: number,
  options: CombatOptionsV7 = {},
): CombatPreviewV7 | null {
  const attacker = state.units.find(
    (unit) => unit.id === attackerId && unit.hp > 0,
  );
  const target = state.units.find(
    (unit) => unit.id === targetUnitId && unit.hp > 0,
  );
  if (attacker === undefined || target === undefined) return null;
  const rule = unitRoleRuleV7(state, attacker);
  const distance = Math.max(
    Math.abs(attacker.at.x - target.at.x),
    Math.abs(attacker.at.y - target.at.y),
  );
  // Revision 19: an Egg never attacks (it may be the target).
  if (
    attacker.form === "EMBARKED" ||
    attacker.form === "EGG" ||
    !rule.abilities.includes("ATTACK") ||
    distance < rule.minimumRange ||
    distance >
      attackMaximumRangeV7(
        state,
        attacker,
        tileAtV7(state.board, attacker.at)?.terrain,
      )
  )
    return null;
  return calculateCombatPreviewV7(
    state,
    attackerId,
    targetUnitId,
    plannedPathLength,
    options,
  );
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
        : command.kind === "TRAIN" || command.kind === "LAY_EGG"
          ? UNIT_ROLE_IDS_V7.indexOf(command.role)
          : command.kind === "CHOOSE_CITY_REWARD"
            ? REWARD_IDS_V7.indexOf(command.reward)
            : command.kind === "BUILD_MONUMENT"
              ? ACHIEVEMENT_IDS_V7.indexOf(command.achievement)
              : "targetUnitId" in command
                ? command.targetUnitId
                : command.kind === "HATCH"
                  ? command.eggUnitId
                  : command.kind === "BEAM_DOWN"
                    ? command.passengerUnitId
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
  // Revision 19 section 6.2: an Egg threatens nothing.
  if (unit === undefined || unit.form === "EGG") return [];
  const rule = unitRoleRuleV7(view, unit);
  // Revision 13: a Banshee threatens Chebyshev 1-2 around each reachable tile.
  const wail = rule.abilities.includes("WAIL");
  // Revision 17: a goblin-crewed land unit may Kaboom after moving, so it
  // also threatens every tile within Chebyshev 1 of a tile it can reach.
  const kaboom = unit.form === "LAND" && rule.abilities.includes("KABOOM");
  // `pulp_wars-0ao.15`: landing ends the activation, so an embarked unit has
  // no same-turn Kaboom reach from its landing cells.
  if (!rule.abilities.includes("ATTACK") && !wail) return [];
  const minimumRange = kaboom ? 0 : wail ? 1 : rule.minimumRange;
  const maximumRange = wail ? WAIL_RADIUS_V7 : rule.range;
  // The Martian revision: a land-form machine that ends a Move on water
  // self-launches and cannot attack from there, so its water destinations
  // are not attack origins.
  const machine =
    unit.form === "LAND" && unitMovementModeV7(view, unit) !== "GROUND";
  // The Ice Folk revision section 11: a sluggish unit threatens only from
  // where it stands (it cannot act after a Move); the reach includes Glide
  // on known Snow, Mountain-born paths, and Prowl (the public movement
  // query), and a Yeti reaches 2 from every Mountain origin (Rockfall).
  const origins = [
    unit.at,
    ...(unitIsSluggishV7(view, unit)
      ? []
      : reachablePlayerMovementPathsV7(view, unit)
          .map((path) => path.destination)
          .filter((at) => {
            if (!machine) return true;
            const tile = tileAtView(view, at);
            return tile?.explored !== true || tile.biome !== null;
          })),
  ];
  const rangeFrom = (origin: CoordV7): number => {
    if (wail) return maximumRange;
    const tile = tileAtView(view, origin);
    return attackMaximumRangeV7(
      view,
      unit,
      tile?.explored === true ? tile.terrain : undefined,
    );
  };
  const direct = view.board.tiles
    .map((tile) => tile.at)
    .filter((at) =>
      origins.some((origin) => {
        const distance = Math.max(
          Math.abs(origin.x - at.x),
          Math.abs(origin.y - at.y),
        );
        return distance >= minimumRange && distance <= rangeFrom(origin);
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
  if (
    "at" in command &&
    TILE_KINDS.includes(command.kind as never) &&
    queryPlayerCommandsV7(view).some(
      (candidate) =>
        candidate.kind === command.kind &&
        "at" in candidate &&
        same(candidate.at, command.at),
    )
  ) {
    const reuseKey = publicEconomicPreviewFactKeyV7(view);
    const reused = PUBLIC_ECONOMIC_PREVIEW_REUSE.get(reuseKey)?.get(cacheKey);
    if (reused !== undefined) {
      const result = cloneEconomicPreviewResultV7(reused);
      cachedForView.set(cacheKey, result);
      return result;
    }
  }
  const result = calculatePublicEconomicPreviewV7(view, command);
  cachedForView.set(cacheKey, result);
  if (result.ok) {
    const reuseKey = publicEconomicPreviewFactKeyV7(view);
    let byCommand = PUBLIC_ECONOMIC_PREVIEW_REUSE.get(reuseKey);
    if (byCommand === undefined) {
      byCommand = new Map();
      PUBLIC_ECONOMIC_PREVIEW_REUSE.set(reuseKey, byCommand);
      if (PUBLIC_ECONOMIC_PREVIEW_REUSE.size > PUBLIC_PLANNING_REUSE_LIMIT) {
        const oldest = PUBLIC_ECONOMIC_PREVIEW_REUSE.keys().next().value;
        if (oldest !== undefined) PUBLIC_ECONOMIC_PREVIEW_REUSE.delete(oldest);
      }
    }
    byCommand.set(cacheKey, cloneEconomicPreviewResultV7(result));
    if (byCommand.size > 64) {
      const oldest = byCommand.keys().next().value;
      if (oldest !== undefined) byCommand.delete(oldest);
    }
  }
  return result;
}

function cloneEconomicPreviewResultV7(
  value: EconomicPreviewResultV7,
): EconomicPreviewResultV7 {
  return JSON.parse(JSON.stringify(value)) as EconomicPreviewResultV7;
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
  /** Revision 17: the viewer's faction resolves its technology capabilities. */
  readonly faction: PlayerViewV7["viewer"]["faction"];
  readonly activePortKeys: ReadonlySet<string>;
  readonly resolvedPendingCityIds: ReadonlySet<CityId>;
  readonly remainingMonumentEntitlements: number;
  /** Exact predecessor when this graph mutation cannot alter trade connectivity. */
  readonly connectivitySource?: PublicEconomyGraphV7 | undefined;
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
const PUBLIC_PLANNING_FACT_KEYS = new WeakMap<PlayerViewV7, string>();
const PUBLIC_ECONOMIC_PREVIEW_FACT_KEYS = new WeakMap<PlayerViewV7, string>();
const PUBLIC_PLANNING_REUSE_LIMIT = 24;
interface PublicPlanningReuseEntryV7 {
  readonly potentials: readonly PublicEconomicPotentialV7[];
  readonly scores: ReadonlyMap<string, number>;
  readonly redevelopmentChanges: ReadonlyMap<string, boolean>;
}
const PUBLIC_PLANNING_REUSE = new Map<string, PublicPlanningReuseEntryV7>();
const PUBLIC_ECONOMIC_PREVIEW_REUSE = new Map<
  string,
  Map<string, EconomicPreviewResultV7>
>();
const PUBLIC_CITY_BESIEGED = new WeakMap<PlayerViewV7, Map<string, boolean>>();
const PUBLIC_CITY_DEVELOPMENT_FOOTPRINT_KNOWN = new WeakMap<
  PlayerViewV7,
  Map<CityId, boolean>
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

/**
 * Collision-free structural key for every public fact read by economic graph,
 * placement, spatial-score, and preview calculations. Dynamic unit details
 * are deliberately reduced to the two facts those calculations observe:
 * hostile city occupation and hostile naval occupation. No authority state is
 * available at this boundary.
 */
function publicPlanningFactKeyV7(view: PlayerViewV7): string {
  const existing = PUBLIC_PLANNING_FACT_KEYS.get(view);
  if (existing !== undefined) return existing;
  const work = createPublicPlanningFactKeyWorkV7(view);
  for (;;) {
    const progress = work.next();
    if (progress.done) return progress.value;
  }
}

function* createPublicPlanningFactKeyWorkV7(
  view: PlayerViewV7,
): Generator<void, string> {
  const tiles: unknown[] = [];
  for (const tile of view.board.tiles) {
    // Concealed tile fields are deliberately discarded at the public boundary.
    tiles.push(
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
        : { at: tile.at, explored: false },
    );
    yield;
  }
  const cities: unknown[] = [];
  const ownedCityKeys = new Set<string>();
  for (const city of view.cities) {
    cities.push({
      id: city.id,
      ownerId: city.ownerId,
      at: city.at,
      level: city.level,
      permanentPopulation: city.permanentPopulation,
      economicPopulation: city.economicPopulation,
      population: city.population,
      expanded: city.expanded,
      landGrantUsed: city.landGrantUsed,
      isCapital: city.isCapital,
    });
    if (city.ownerId === view.viewer.id) ownedCityKeys.add(coordKeyV7(city.at));
    yield;
  }
  const besiegingUnits: unknown[] = [];
  const hostileNavalUnits: unknown[] = [];
  for (const unit of view.units) {
    if (
      unit.hp > 0 &&
      publicHostile(view, view.viewer.id, unit.ownerId) &&
      ownedCityKeys.has(coordKeyV7(unit.at))
    )
      besiegingUnits.push([unit.ownerId, unit.at.x, unit.at.y]);
    if (
      isAfloatFormV7(unit.form) &&
      publicHostile(view, view.viewer.id, unit.ownerId)
    )
      hostileNavalUnits.push([unit.ownerId, unit.form, unit.at.x, unit.at.y]);
    yield;
  }
  const key = JSON.stringify({
    setupAiMode: view.setup.aiMode,
    humanPlayerId: view.humanPlayerId,
    board: {
      width: view.board.width,
      height: view.board.height,
      tiles,
    },
    cities,
    viewer: {
      id: view.viewer.id,
      originalCapitalCityId: view.viewer.originalCapitalCityId,
      researchedTechs: view.viewer.researchedTechs,
      faction: view.viewer.faction,
      achievementEntitlements: view.viewer.achievementEntitlements,
    },
    pendingChoices: view.pendingChoices,
    treasureChests: view.treasureChests,
    viewerCityCount: view.leaderboard.find((entry) => entry.isViewer)
      ?.cityCount,
    naval: {
      ownedPorts: view.naval.ownedPorts,
    },
    besiegingUnits,
    hostileNavalUnits,
  });
  PUBLIC_PLANNING_FACT_KEYS.set(view, key);
  return key;
}

function publicEconomicPreviewFactKeyV7(view: PlayerViewV7): string {
  const cached = PUBLIC_ECONOMIC_PREVIEW_FACT_KEYS.get(view);
  if (cached !== undefined) return cached;
  const key = JSON.stringify({
    planning: publicPlanningFactKeyV7(view),
    coins: view.viewer.coins,
    cities: view.cities,
    improvementValues: view.improvementValues,
    landTradeCityIds: view.naval.landTradeCityIds,
    seaTradeCityIds: view.naval.seaTradeCityIds,
  });
  PUBLIC_ECONOMIC_PREVIEW_FACT_KEYS.set(view, key);
  return key;
}

function planningReuseEntryV7(
  key: string,
): PublicPlanningReuseEntryV7 | undefined {
  const entry = PUBLIC_PLANNING_REUSE.get(key);
  if (entry !== undefined) {
    PUBLIC_PLANNING_REUSE.delete(key);
    PUBLIC_PLANNING_REUSE.set(key, entry);
  }
  return entry;
}

function retainPlanningReuseEntryV7(
  key: string,
  entry: PublicPlanningReuseEntryV7,
): void {
  PUBLIC_PLANNING_REUSE.delete(key);
  PUBLIC_PLANNING_REUSE.set(key, entry);
  if (PUBLIC_PLANNING_REUSE.size > PUBLIC_PLANNING_REUSE_LIMIT) {
    const oldest = PUBLIC_PLANNING_REUSE.keys().next().value;
    if (oldest !== undefined) PUBLIC_PLANNING_REUSE.delete(oldest);
  }
}

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
    faction: view.viewer.faction,
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
  // Parsed boards, and therefore PlayerView boards, are canonical row-major
  // arrays; spatial-economy and the rest of the engine share this invariant.
  const index = at.y * graph.board.width + at.x;
  const current = graph.board.tiles[index];
  if (current === undefined || !same(current.at, at)) return graph;
  const tiles = graph.board.tiles.slice();
  tiles[index] = { ...current, ...replacement, at: current.at };
  return {
    ...graph,
    board: {
      ...graph.board,
      tiles,
    },
    connectivitySource: graph,
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
        isAfloatFormV7(unit.form) &&
        same(unit.at, command.at) &&
        publicHostile(view, view.viewer.id, unit.ownerId),
    );
    return {
      ...next,
      activePortKeys: blockaded
        ? graph.activePortKeys
        : new Set([...graph.activePortKeys, coordKeyV7(command.at)]),
      connectivitySource: blockaded ? graph : undefined,
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
      resource: projectedResourceAfterMutationV7(
        view,
        "GRASS",
        "FERTILE_GROUND",
      ),
    });
  if (command.kind === "BLAST_MOUNTAIN")
    return replacePublicGraphTileV7(graph, command.at, {
      terrain: "GRASS",
      resource: null,
    });
  if (command.kind === "BUILD_ROAD")
    return {
      ...replacePublicGraphTileV7(graph, command.at, { road: true }),
      connectivitySource: undefined,
    };
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
    return { ...next, activePortKeys, connectivitySource: undefined };
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
  const connectivity = publicGraphNavalConnectivityV7(graph);
  const connectedOtherCities = [...connectivity.network].filter(
    (candidate) => candidate !== graph.originalCapitalCityId,
  );
  const roadPopulation =
    cityId === graph.originalCapitalCityId
      ? connectedOtherCities.length
      : Number(connectedOtherCities.includes(cityId));
  const total = improvementPopulation + roadPopulation;
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
      const value = total + marketCoinsV7(evaluation.marketIncome);
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
  if (graph.connectivitySource !== undefined) {
    const inherited = publicGraphNavalConnectivityV7(graph.connectivitySource);
    PUBLIC_GRAPH_NAVAL_CONNECTIVITY.set(graph, inherited);
    return inherited;
  }
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
  // A Road is usable on a neutral or own-territory tile (section 9.1). The
  // view hides the city ID of territory whose city center is still unexplored
  // but always shows its owner, so a tile is neutral only when both are null.
  const roads = new Set(
    graph.board.tiles
      .filter(
        (tile) =>
          tile.road &&
          graph.researchedTechs.includes("ROADS") &&
          (tile.territoryCityId === null
            ? tile.territoryOwnerId === null
            : ownedIds.has(tile.territoryCityId)),
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
  // Revision 17: land trade is a technology capability of the viewer's tree.
  const landTrade =
    technologyCapabilitiesV7(graph.researchedTechs, graph.faction)
      .landTradeIncomeCoins === 1
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
    cityLevelIncomeV7(city.level) +
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
  for (let market = 0; market <= 8; market += 1)
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
    resource !== null &&
    !isResourceRevealedV7(resource, view.viewer.researchedTechs)
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
          ? marketCoinsV7(evaluation.marketIncome)
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

export interface PublicRedevelopmentChangePossibilityV7 {
  readonly candidate: {
    readonly kind: "REDEVELOP";
    readonly at: CoordV7;
  };
  /**
   * False is a proof that the existing exact redevelopment query is false.
   * True is conservative and means the exact planner must decide.
   */
  readonly mayChangeImprovement: boolean;
}

export interface PublicRedevelopmentPossibilityWorkProgressV7 {
  readonly done: boolean;
  readonly operations: number;
  readonly result: readonly PublicRedevelopmentChangePossibilityV7[] | null;
}

export interface PublicRedevelopmentPossibilityWorkV7 {
  /** Exact maximum number of bounded work units this instance can consume. */
  readonly operationCeiling: number;
  advance(maxOperations: number): PublicRedevelopmentPossibilityWorkProgressV7;
}

/**
 * Creates a public-only, resumable necessary-condition filter for Redevelop.
 * One operation consumes at most one public record or one candidate; candidate
 * evaluation checks a fixed number of placement kinds and adjacent cells.
 */
export function createPublicRedevelopmentPossibilityWorkV7(
  view: PlayerViewV7,
  candidates: readonly {
    readonly kind: "REDEVELOP";
    readonly at: CoordV7;
  }[],
): PublicRedevelopmentPossibilityWorkV7 {
  return new IncrementalPublicRedevelopmentPossibilityWorkV7(view, candidates);
}

class IncrementalPublicRedevelopmentPossibilityWorkV7 implements PublicRedevelopmentPossibilityWorkV7 {
  readonly operationCeiling: number;
  private phase:
    | "TILES"
    | "UNITS"
    | "CHOICES"
    | "TREASURES"
    | "ENTITLEMENTS"
    | "LEADERBOARD"
    | "CITIES"
    | "CANDIDATES"
    | "DONE" = "TILES";
  private index = 0;
  private graph: PublicEconomyGraphV7 | null = null;
  private readonly graphTiles: PublicEconomyGraphTileV7[] = [];
  private readonly unexploredKeys = new Set<string>();
  private readonly hostileUnitKeys = new Set<string>();
  private readonly pendingCityIds = new Set<CityId>();
  private readonly treasureKeys = new Set<string>();
  private readonly cityImprovementKeys = new Set<string>();
  private readonly developmentAllowedCityIds = new Set<CityId>();
  private readonly cityById = new Map<
    CityId,
    PublicEconomyGraphV7["cities"][number]
  >();
  private remainingMonumentEntitlements = 0;
  private publicOwnedCityCount: number | null = null;
  private ownedCityCount = 0;
  private footprintExact = true;
  private readonly values: PublicRedevelopmentChangePossibilityV7[] = [];
  private completed: readonly PublicRedevelopmentChangePossibilityV7[] | null =
    null;

  constructor(
    private readonly view: PlayerViewV7,
    private readonly candidates: readonly {
      readonly kind: "REDEVELOP";
      readonly at: CoordV7;
    }[],
  ) {
    this.operationCeiling =
      view.board.tiles.length +
      view.units.length +
      view.pendingChoices.length +
      view.treasureChests.length +
      view.viewer.achievementEntitlements.length +
      view.leaderboard.length +
      view.cities.length +
      candidates.length;
  }

  advance(maxOperations: number): PublicRedevelopmentPossibilityWorkProgressV7 {
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
    if (this.phase === "TILES") {
      const tile = this.view.board.tiles[this.index];
      if (tile === undefined) {
        this.phase = "UNITS";
        this.index = 0;
        return false;
      }
      const graphTile: PublicEconomyGraphTileV7 = tile.explored
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
          };
      this.graphTiles.push(graphTile);
      if (!tile.explored) this.unexploredKeys.add(coordKeyV7(tile.at));
      if (graphTile.territoryCityId !== null && graphTile.improvement !== null)
        this.cityImprovementKeys.add(
          `${graphTile.territoryCityId}:${graphTile.improvement}`,
        );
      this.index += 1;
      return true;
    }
    if (this.phase === "UNITS") {
      const unit = this.view.units[this.index];
      if (unit === undefined) {
        this.phase = "CHOICES";
        this.index = 0;
        return false;
      }
      if (
        unit.hp > 0 &&
        publicHostile(this.view, this.view.viewer.id, unit.ownerId)
      )
        this.hostileUnitKeys.add(coordKeyV7(unit.at));
      this.index += 1;
      return true;
    }
    if (this.phase === "CHOICES") {
      const choice = this.view.pendingChoices[this.index];
      if (choice === undefined) {
        this.phase = "TREASURES";
        this.index = 0;
        return false;
      }
      this.pendingCityIds.add(choice.cityId);
      this.index += 1;
      return true;
    }
    if (this.phase === "TREASURES") {
      const treasure = this.view.treasureChests[this.index];
      if (treasure === undefined) {
        this.phase = "ENTITLEMENTS";
        this.index = 0;
        return false;
      }
      this.treasureKeys.add(coordKeyV7(treasure));
      this.index += 1;
      return true;
    }
    if (this.phase === "ENTITLEMENTS") {
      const entitlement = this.view.viewer.achievementEntitlements[this.index];
      if (entitlement === undefined) {
        this.phase = "LEADERBOARD";
        this.index = 0;
        return false;
      }
      if (entitlement.unlocked && !entitlement.spent)
        this.remainingMonumentEntitlements += 1;
      this.index += 1;
      return true;
    }
    if (this.phase === "LEADERBOARD") {
      const entry = this.view.leaderboard[this.index];
      if (entry === undefined) {
        this.phase = "CITIES";
        this.index = 0;
        return false;
      }
      if (entry.isViewer) this.publicOwnedCityCount = entry.cityCount;
      this.index += 1;
      return true;
    }
    if (this.phase === "CITIES") {
      const city = this.view.cities[this.index];
      if (city === undefined) {
        this.graph = {
          board: {
            width: this.view.board.width,
            height: this.view.board.height,
            tiles: this.graphTiles,
          },
          cities: this.view.cities,
          ownerId: this.view.viewer.id,
          originalCapitalCityId: this.view.viewer.originalCapitalCityId,
          researchedTechs: this.view.viewer.researchedTechs,
          faction: this.view.viewer.faction,
          activePortKeys: new Set(),
          resolvedPendingCityIds: new Set(),
          remainingMonumentEntitlements: this.remainingMonumentEntitlements,
        };
        this.phase = "CANDIDATES";
        this.index = 0;
        return false;
      }
      this.cityById.set(city.id, city);
      if (city.ownerId === this.view.viewer.id) {
        this.ownedCityCount += 1;
        const radius = city.expanded || city.landGrantUsed ? 2 : 1;
        for (let y = city.at.y - radius; y <= city.at.y + radius; y += 1)
          for (let x = city.at.x - radius; x <= city.at.x + radius; x += 1)
            if (
              x >= 0 &&
              y >= 0 &&
              x < this.view.board.width &&
              y < this.view.board.height &&
              this.unexploredKeys.has(coordKeyV7({ x, y }))
            )
              this.footprintExact = false;
        if (
          !this.hostileUnitKeys.has(coordKeyV7(city.at)) &&
          !this.pendingCityIds.has(city.id)
        )
          this.developmentAllowedCityIds.add(city.id);
      }
      this.index += 1;
      return true;
    }
    if (this.phase === "CANDIDATES") {
      const candidate = this.candidates[this.index];
      if (candidate === undefined) {
        this.completed = this.values;
        this.phase = "DONE";
        return false;
      }
      this.values.push({
        candidate,
        mayChangeImprovement: this.mayChangeImprovement(candidate),
      });
      this.index += 1;
      return true;
    }
    return false;
  }

  private mayChangeImprovement(candidate: {
    readonly kind: "REDEVELOP";
    readonly at: CoordV7;
  }): boolean {
    const graph = this.graph;
    if (
      graph === null ||
      !this.footprintExact ||
      this.publicOwnedCityCount !== this.ownedCityCount
    )
      return true;
    const index = candidate.at.y * graph.board.width + candidate.at.x;
    const tile = graph.board.tiles[index];
    if (
      tile === undefined ||
      !same(tile.at, candidate.at) ||
      !tile.explored ||
      (tile.improvement !== "FARM" &&
        tile.improvement !== "LUMBER_CAMP" &&
        tile.improvement !== "MINE")
    )
      return true;
    const current = tile.improvement;
    const afterTile: PublicEconomyGraphTileV7 = {
      ...tile,
      improvement: null,
      resource: publicRestoredResourceV7(
        this.view,
        tile.terrain,
        tile.improvement,
      ),
    };
    const enumeration: PublicPlacementEnumerationV7 = {
      view: this.view,
      graph,
      placements: [],
      placementsByCity: new Map(),
      entitlementsAvailable: this.remainingMonumentEntitlements > 0,
      treasureKeys: this.treasureKeys,
      cityImprovementKeys: this.cityImprovementKeys,
      developmentAllowedCityIds: this.developmentAllowedCityIds,
      cityById: this.cityById,
    };
    appendPublicPlacementsForTileV7(enumeration, afterTile);
    const replacements = enumeration.placements
      .map(publicPlacementImprovementV7)
      .filter((improvement) => improvement !== null);
    // A valid same-basic rebuild has a strictly positive exact placement
    // score: Farm/Mine restore two fixed population and Camp restores one,
    // while every affected adjacent processor or Market term is monotone and
    // the score has no cost term. If no same rebuild exists, the exact query's
    // undefined-replacement edge returns true, so this proof must also do so.
    // Placement adjacency excludes its center, making the original graph's
    // neighbors equivalent to the graph after removing this target.
    return (
      !replacements.includes(current) ||
      replacements.some((improvement) => improvement !== current)
    );
  }
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
  readonly developmentAllowedCityIds?: ReadonlySet<CityId>;
  readonly cityById: ReadonlyMap<
    CityId,
    PublicEconomyGraphV7["cities"][number]
  >;
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
    cityById: new Map(graph.cities.map((city) => [city.id, city] as const)),
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
    developmentAllowedCityIds,
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
    !(
      developmentAllowedCityIds?.has(tile.territoryCityId) ??
      publicCityAllowsDevelopmentV7(view, graph, tile.territoryCityId)
    )
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
        spatialPlacementCountV7(
          graph,
          tile.at,
          rule.improvement,
          enumeration.cityById,
        ) >= rule.placementMinimum
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
  private readonly factKeyWork: Generator<void, string>;
  private factKey: string | null = null;
  private reuseEntry: PublicPlanningReuseEntryV7 | null = null;
  private readonly candidates: readonly CommandV7[];
  private readonly exact: boolean;
  private phase:
    | "REUSE_FACT_SCAN"
    | "REUSE_RECONSTRUCTION"
    | "BASE_ENUMERATION"
    | "BASE_SCORING"
    | "BASE_SELECTION"
    | "CANDIDATE_START"
    | "CANDIDATE_ENUMERATION"
    | "CANDIDATE_SELECTION"
    | "DONE" = "REUSE_FACT_SCAN";
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
    this.factKeyWork = createPublicPlanningFactKeyWorkV7(view);
    this.exact = publicPlanningGraphExact(view);
    this.enumeration = createPublicPlacementEnumerationV7(view, this.graph);
    for (const kind of ECONOMIC_POTENTIAL_KINDS_V7)
      this.potentialStats.set(kind, { targets: 0, bestSpatialScore: 0 });
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
    if (this.phase === "REUSE_FACT_SCAN") {
      const progress = this.factKeyWork.next();
      if (!progress.done) return true;
      this.factKey = progress.value;
      this.reuseEntry = planningReuseEntryV7(progress.value) ?? null;
      this.phase =
        this.reuseEntry === null
          ? this.exact
            ? "BASE_ENUMERATION"
            : "CANDIDATE_START"
          : "REUSE_RECONSTRUCTION";
      return true;
    }
    if (this.phase === "REUSE_RECONSTRUCTION") {
      const candidate = this.candidates[this.candidateIndex];
      if (candidate === undefined) {
        this.finishReuse();
        return false;
      }
      const cacheKey = JSON.stringify(candidate);
      const reusedScore = this.reuseEntry?.scores.get(cacheKey);
      if (
        reusedScore === undefined &&
        publicPlanningCandidateMayAffectGraphV7(candidate)
      ) {
        this.reuseEntry = null;
        this.scores.length = 0;
        this.candidateIndex = 0;
        PUBLIC_SPATIAL_SCORES.delete(this.view);
        this.phase = this.exact ? "BASE_ENUMERATION" : "CANDIDATE_START";
        return true;
      }
      this.recordCandidateScore(candidate, reusedScore ?? 0);
      this.candidateIndex += 1;
      return true;
    }
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
    if (this.factKey === null)
      throw new RangeError("Public planning fact scan did not complete");
    retainPlanningReuseEntryV7(this.factKey, {
      potentials: potentials.map((potential) => ({ ...potential })),
      scores: new Map(
        this.scores.map(({ command, score }) => [
          JSON.stringify(command),
          score,
        ]),
      ),
      redevelopmentChanges: new Map(
        PUBLIC_REDEVELOPMENT_CHANGES.get(this.view) ?? [],
      ),
    });
    this.phase = "DONE";
  }

  private finishReuse(): void {
    const reused = this.reuseEntry;
    if (reused === null)
      throw new RangeError("Public planning reuse entry was lost");
    const potentials = reused.potentials.map((potential) => ({ ...potential }));
    PUBLIC_ECONOMIC_POTENTIALS.set(this.view, potentials);
    PUBLIC_REDEVELOPMENT_CHANGES.set(
      this.view,
      new Map(reused.redevelopmentChanges),
    );
    this.completed = { potentials, scores: this.scores };
    this.phase = "DONE";
  }
}

function publicPlanningCandidateMayAffectGraphV7(
  candidate: CommandV7,
): boolean {
  return (
    candidate.kind === "CHOOSE_CITY_REWARD" ||
    candidate.kind === "GATHER_PEARLS" ||
    candidate.kind === "BUILD_PORT" ||
    candidate.kind === "BUILD_SHIPYARD" ||
    candidate.kind === "CULTIVATE_FOREST" ||
    candidate.kind === "BLAST_MOUNTAIN" ||
    ECONOMIC_POTENTIAL_KINDS_V7.includes(candidate.kind as never)
  );
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
  const totals = publicGraphTotalsV7(before, ownerId);
  // These totals contain only improvement population and Market income, not
  // road population or trade sets. Every graph-dependent improvement reads
  // only its eight neighbors, so a one-tile mutation has no distant outputs.
  const affectedKeys = new Set([coordKeyV7(changedAt)]);
  for (let y = changedAt.y - 1; y <= changedAt.y + 1; y += 1)
    for (let x = changedAt.x - 1; x <= changedAt.x + 1; x += 1)
      for (const graph of [before, after]) {
        const tile = graph.board.tiles[y * graph.board.width + x];
        if (
          tile !== undefined &&
          tile.at.x === x &&
          tile.at.y === y &&
          tile.improvement !== null &&
          GRAPH_DEPENDENT_IMPROVEMENTS_V7.has(tile.improvement)
        )
          affectedKeys.add(coordKeyV7(tile.at));
      }
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
        ? marketCoinsV7(contribution.marketIncome)
        : contribution.marketIncome,
  };
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
  /**
   * Revision 19: the capacity slots of each role the city's owner can
   * produce (a role with a cost in its registration), in role order.
   */
  readonly roleSlots: readonly {
    readonly role: UnitRoleIdV7;
    readonly slots: number;
  }[];
} | null {
  const city = state.cities.find((item) => item.id === cityId);
  if (city === undefined) return null;
  const capacity = cityUnitCapacityV7(state, city);
  // Revision 19 section 5.1: `assigned` is the used-slot sum.
  const assigned = assignedUnitCountV7(state, cityId);
  return {
    cityId,
    capacity,
    assigned,
    available: Math.max(0, capacity - assigned),
    overCapacity: Math.max(0, assigned - capacity),
    roleSlots: UNIT_ROLE_IDS_V7.filter(
      (role) =>
        unitRoleRuleV7(state, { ownerId: city.ownerId, role }).cost !== null,
    ).map((role) => ({
      role,
      slots: unitCapacitySlotsV7(state, { ownerId: city.ownerId, role }),
    })),
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

/**
 * Revision 13 Restless: an own land-form unit of a Restless faction outside
 * its owner's territory cannot Recover. Own units stand on explored tiles, so
 * the public territory owner is exact.
 */
function publicRestlessOutsideOwnTerritory(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): boolean {
  if (unit.form !== "LAND" || !factionRulesV7(view.viewer.faction).restless)
    return false;
  const tile = tileAtView(view, unit.at);
  return tile?.explored !== true || tile.territoryOwnerId !== unit.ownerId;
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
  let byCity = PUBLIC_CITY_BESIEGED.get(view);
  if (byCity === undefined) {
    byCity = new Map();
    PUBLIC_CITY_BESIEGED.set(view, byCity);
  }
  const cityKey = coordKeyV7(at);
  const cached = byCity.get(cityKey);
  if (cached !== undefined) return cached;
  const besieged = view.units.some(
    (unit) =>
      unit.hp > 0 &&
      publicHostile(view, view.viewer.id, unit.ownerId) &&
      same(unit.at, at),
  );
  byCity.set(cityKey, besieged);
  return besieged;
}

function publicCityDevelopmentFootprintKnown(
  view: PlayerViewV7,
  city: PlayerViewV7["cities"][number],
): boolean {
  let byCity = PUBLIC_CITY_DEVELOPMENT_FOOTPRINT_KNOWN.get(view);
  if (byCity === undefined) {
    byCity = new Map();
    PUBLIC_CITY_DEVELOPMENT_FOOTPRINT_KNOWN.set(view, byCity);
  }
  const cached = byCity.get(city.id);
  if (cached !== undefined) return cached;
  const radius = city.expanded || city.landGrantUsed ? 2 : 1;
  let known = true;
  for (let y = city.at.y - radius; y <= city.at.y + radius && known; y += 1)
    for (let x = city.at.x - radius; x <= city.at.x + radius; x += 1) {
      if (x < 0 || y < 0 || x >= view.board.width || y >= view.board.height)
        continue;
      if (tileAtView(view, { x, y })?.explored !== true) {
        known = false;
        break;
      }
    }
  byCity.set(city.id, known);
  return known;
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
      publicCityDevelopmentFootprintKnown(view, city) &&
      !cityHasImprovement(view, city.id, "SHIPYARD")
    );
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[
      kind as keyof typeof SPATIAL_ECONOMIC_ACTIONS_V7
    ];
  if (spatial !== undefined) {
    if (
      view.viewer.coins < spatial.cost ||
      !publicCityDevelopmentFootprintKnown(view, city) ||
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

function publicCombatPreviewCore(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options: CombatOptionsV7 = {},
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
  const attackerRule = unitRoleRuleV7(view, attacker);
  const defenderRule = unitRoleRuleV7(view, target);
  const attackerMechanics = unitRoleMechanicsV7(view, attacker);
  const distance = chebyshev(attacker.at, target.at);
  const attackReady =
    !primaryUsedForQuery(attacker) || attacker.activation.overrunActive;
  if (
    attacker.form === "EMBARKED" ||
    attacker.form === "EGG" ||
    !attackerRule.abilities.includes("ATTACK") ||
    !attackReady ||
    (!attacker.activation.overrunActive &&
      attacker.activation.attacksUsed >= 1) ||
    primaryActionBlockedAfterMoveV7(view, attacker) ||
    distance < attackerRule.minimumRange ||
    distance > publicAttackMaximumRangeV7(view, attacker)
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
  // Revision 17 Gang Up counts only the viewer's own (always visible) units.
  const gangUp = gangUpBonusV7(view, view.units, attacker, target);
  // Revision 20 Charge!: the run-up is already in the public Attack total
  // (the `RUN_UP` modifier); it is reported separately as `runUp`.
  const charge = attackIsChargeV7(view, attacker);
  const runUpAttack2 = chargeRunUpAttack2V7(view, attacker);
  // The Ice Folk revision (section 8, step 1): Planted is already in the
  // public Attack total (the `PLANTED` modifier); a Rockfall replaces the
  // role Attack, and Cold Blood is added against a Chilled target.
  const attackerMechanics0 = unitRoleMechanicsV7(view, attacker);
  const attackerLand = attacker.form === "LAND";
  const targetChilled =
    target.form === "LAND" &&
    (options.assumeTargetChilled === true ||
      isChilledV7(view.chilled, target.id));
  const rockfallApplied =
    attackerLand && attackerMechanics0.rockfallAttack2 > 0 && distance === 2;
  const coldBloodApplied =
    attackerLand && attackerMechanics0.coldBloodBonus2 > 0 && targetChilled;
  const plantedApplied = attack.modifiers.some(
    (modifier) => modifier.source === "PLANTED",
  );
  const attack2 =
    rationalToHalfUnits(attack.total) +
    gangUp * 2 +
    (rockfallApplied
      ? attackerMechanics0.rockfallAttack2 - attackerRule.attack2
      : 0) +
    (coldBloodApplied ? attackerMechanics0.coldBloodBonus2 : 0);
  // The Martian revision section 6.1: the halving of a half-power ray is
  // already in the public Attack total (the `HALF_POWER` modifier).
  const rayPower = rayPowerV7(
    view,
    view.cooling,
    attacker,
    attacker.activation.moved,
  );
  const targetTile = tileAtView(view, target.at);
  if (targetTile?.explored !== true) return null;
  // Revision 19 Acid: a land-form Spitter's attack ignores the defender's
  // cover and fortification.
  const acid = attackHasAcidV7(attackerRule, attacker);
  // Revision 20: Charge! removes every fortification level and Wallbreaker
  // the City Walls levels. The public tile level is Walls plus Field Defense.
  // The Martian revision: a walker or flyer has no fortification or cover.
  const targetTakesCover = unitTakesCoverV7(view, target);
  const tileFortification =
    targetTakesCover && targetTile.territoryOwnerId === target.ownerId
      ? (targetTile.fortificationLevel ?? 0)
      : 0;
  const tileFieldDefense = Math.min(
    tileFortification,
    targetTile.fieldDefense ? 1 : 0,
  );
  const { fortificationLevel, fortificationIgnored } = attackFortificationV7(
    {
      walls: tileFortification - tileFieldDefense,
      fieldDefense: tileFieldDefense,
    },
    {
      acid,
      charge,
      ignoresCityWalls: attackIgnoresCityWallsV7(
        view,
        attacker,
        view.viewer.researchedTechs,
      ),
      // The Martian revision section 6.5: the Disintegrator.
      disintegrator:
        rayPower !== "NONE" &&
        technologyCapabilitiesV7(
          view.viewer.researchedTechs,
          view.viewer.faction,
        ).raysIgnoreFortification,
      // The Ice Folk revision section 7.6: Boulders.
      boulders: attackerLand && attackerMechanics0.ignoresFortification,
    },
  );
  // Revision 19 section 6.2: an Egg defends with a fixed 1.
  const defense2 =
    target.form === "EMBARKED"
      ? 2
      : target.form === "EGG"
        ? EGG_DEFENSE2_V7
        : defenderRule.defense2 + fortificationLevel * 2;
  // The Ice Folk revision section 6.2: Snow cover from the public Snow flag
  // (a hidden Witch's Blizzard is not known; `hiddenBlizzardPossible`).
  const snowCover =
    !acid &&
    targetTakesCover &&
    targetTile.snow === true &&
    tileFortification === 0 &&
    unitOwnerIsIceFolkV7(view, target);
  const bonus =
    !acid &&
    targetTakesCover &&
    (targetTile.terrain === "FOREST" ||
      targetTile.terrain === "MOUNTAIN" ||
      snowCover)
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
  // Revision 19 Armoured: the reduction applies before the cap at HP.
  const rawDefenderDamage = roundHalfUpPublic(
    attackOnCommon * BigInt(attack2) * 9n,
    total * 4n,
  );
  // The Ice Folk revision section 6.3: the halving of a visible Witch's
  // Blizzard (her seat's units only).
  const blizzardHalved =
    distance >= 2 && blizzardProtectsV7(view, publicWitchesV7(view), target);
  const formulaDefenderDamage = blizzardHalved
    ? blizzardHalvedDamageV7(rawDefenderDamage)
    : rawDefenderDamage;
  // The Martian revision section 5.3: the Shield absorbs the hit first.
  const defenderShield = shieldOfV7(view.shields, target.id);
  const defenderHit = absorbHitV7(
    defenderShield,
    target.hp,
    armouredDamageV7(view, target, formulaDefenderDamage),
  );
  // The Ice Folk revision section 5.5: the viewer's own threshold.
  const shatters = attackShattersV7({
    attackerIceFolk: isIceFolkLandUnitV7(view, attacker),
    distance,
    defenderChilled: targetChilled,
    defender: target,
    hpAfterHit: target.hp - defenderHit.hpDamage,
    threshold: technologyCapabilitiesV7(
      view.viewer.researchedTechs,
      view.viewer.faction,
    ).shatterThreshold,
  });
  const damageToDefender = shatters ? target.hp : defenderHit.hpDamage;
  const defenderShieldDamage = defenderHit.shieldDamage;
  const hitOnDefender = defenderHit.hpDamage + defenderShieldDamage;
  const defenderArmoured =
    hitOnDefender < Math.min(target.hp + defenderShield, formulaDefenderDamage);
  const defenderDies = damageToDefender >= target.hp;
  // Revision 14 (V1): an UNANSWERED attacker draws no retaliation.
  const unanswered = attackerRule.abilities.includes("UNANSWERED");
  // Revision 19: an Egg never retaliates.
  const retaliation =
    !defenderDies &&
    !unanswered &&
    target.form !== "EMBARKED" &&
    target.form !== "EGG" &&
    defenderRule.abilities.includes("ATTACK") &&
    defenderRule.attack2 > 0 &&
    distance >= defenderRule.minimumRange &&
    distance <= defenderRule.range;
  // Section 13.2: retaliation uses the same fortified Defense as the
  // defender's force, exactly as canonical resolution does.
  const rawAttackerDamage = retaliation
    ? roundHalfUpPublic(defenseOnCommon * BigInt(defense2) * 9n, total * 4n)
    : 0;
  const attackerShield = shieldOfV7(view.shields, attacker.id);
  const attackerHit = absorbHitV7(
    attackerShield,
    attacker.hp,
    armouredDamageV7(view, attacker, rawAttackerDamage),
  );
  const damageToAttacker = attackerHit.hpDamage;
  const attackerShieldDamage = attackerHit.shieldDamage;
  const attackerArmoured =
    damageToAttacker + attackerShieldDamage <
    Math.min(attacker.hp + attackerShield, rawAttackerDamage);
  const attackerDies = damageToAttacker >= attacker.hp;
  // Revision 17: the Bomb Chucker's bomb (splash target mode `ALL`) lists
  // visible own and allied units too.
  // The Martian revision: splash and Pierce are computed from the whole hit
  // on the primary target; each visible victim's own Shield absorbs first.
  const splashVictims = attackerMechanics.splash
    ? view.units.filter(
        (unit) =>
          unit.hp > 0 &&
          unit.id !== target.id &&
          unit.id !== attacker.id &&
          chebyshev(unit.at, target.at) === 1 &&
          (attackerMechanics.splashTargets === "ALL" ||
            publicHostile(view, attacker.ownerId, unit.ownerId)),
      )
    : [];
  // Section 6.4 Pierce: the visible unit directly behind the target, of any
  // owner (a hidden one is hit by the resolution only).
  const pierceAt = attackHasPierceV7(attackerRule, attacker)
    ? pierceTileV7(attacker.at, target.at)
    : null;
  const pierced =
    pierceAt === null
      ? undefined
      : view.units.find(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== attacker.id &&
            unit.id !== target.id &&
            same(unit.at, pierceAt) &&
            !splashVictims.some((victim) => victim.id === unit.id),
        );
  // The Ice Folk revision section 7.5 Sweep: the Mammoth's neighbours are
  // always explored by its owner, so the flank victims are exact.
  const sweep = attackerLand && attackerMechanics0.sweepDamage > 0;
  const sweepTiles = sweep ? sweepFlankTilesV7(attacker.at, target.at) : [];
  const byPosition = <U extends { readonly id: number; readonly at: CoordV7 }>(
    units: readonly U[],
  ): U[] =>
    [...units].sort(
      (left, right) =>
        left.at.y - right.at.y || left.at.x - right.at.x || left.id - right.id,
    );
  const splash = sweep
    ? byPosition(
        view.units.filter(
          (unit) =>
            unit.hp > 0 &&
            unit.id !== target.id &&
            unit.id !== attacker.id &&
            sweepTiles.some((at) => same(at, unit.at)) &&
            publicHostile(view, attacker.ownerId, unit.ownerId),
        ),
      ).map((unit) =>
        sweepEntryV7(
          view,
          unit,
          shieldOfV7(view.shields, unit.id),
          attackerMechanics0.sweepDamage,
        ),
      )
    : byPosition([
        ...splashVictims,
        ...(pierced === undefined ? [] : [pierced]),
      ]).map((unit) =>
        collateralEntryV7(
          view,
          unit,
          shieldOfV7(view.shields, unit.id),
          hitOnDefender,
        ),
      );
  // Revision 14 Plague and Bitten from the public statuses of visible units.
  const afflictions = afflictionCombatEffectsV7({
    roster: view,
    attacker,
    defender: target,
    attackerRule,
    defenderRule,
    damageToDefender,
    damageToAttacker,
    defenderShieldDamage,
    attackerDies,
    defenderDies,
    splash,
    splashOwner: (unitId) =>
      view.units.find((unit) => unit.id === unitId)?.ownerId,
    plaguedUnitIds: new Set(view.plagued.map((entry) => entry.unitId)),
    bittenUnitIds: new Set(view.bitten.map((entry) => entry.unitId)),
    eggUnitIds: new Set(
      view.units.filter((unit) => unit.form === "EGG").map((unit) => unit.id),
    ),
  });
  const push = publicPushState(
    view,
    attacker,
    target,
    !defenderDies && distance === 1,
  );
  // Revision 19 section 6.7: a melee attacker that destroys an Egg advances
  // like after killing a land unit. Revision 20: a Charge! also follows a
  // pushed target into the tile it vacated.
  const advances =
    ((defenderDies && !afflictions.defenderBittenRises) ||
      (charge && push === "WILL_PUSH")) &&
    !attackerDies &&
    distance === 1 &&
    attackerMechanics.advancesAfterKill &&
    attacker.form === "LAND" &&
    (target.form === "LAND" || target.form === "EGG") &&
    publicAdvanceDestinationLegal(view, attacker, target.at) &&
    // The Ice Folk revision section 7.7: never onto a foreign center.
    advanceSiteAllowedV7(
      view,
      attacker,
      targetTile.site,
      view.cities.find((city) => same(city.at, target.at))?.ownerId ?? null,
    );
  const nextAttacks = attacker.activation.attacksUsed + 1;
  const overrunContinues =
    attackerRule.abilities.includes("OVERRUN") &&
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
    maximumRange: publicAttackMaximumRangeV7(view, attacker),
    chargeApplied:
      attackerRule.abilities.includes("CHARGE") &&
      view.viewer.researchedTechs.includes("RAIDING") &&
      attacker.activation.moved &&
      attacker.activation.movedPathLength >= 2 &&
      attacker.activation.attacksUsed === 0,
    inspiredApplied:
      attacker.activation.inspired && attacker.activation.attacksUsed === 0,
    inspiredConsumed: attacker.activation.inspired,
    gangUp,
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
        : unanswered
          ? "UNANSWERED"
          : "OUT_OF_RANGE",
    advances,
    push,
    attacksUsed: nextAttacks,
    attacksRemaining: overrunContinues ? 1 : 0,
    overrunAdvance: attackerRule.abilities.includes("OVERRUN") && advances,
    overrunContinues,
    escapeAvailable:
      attacker.form === "LAND" &&
      attackerRule.abilities.includes("ESCAPE") &&
      !attackerDies &&
      !unitIsSluggishV7(view, attacker),
    splash,
    // Revision 13 Lifesteal and Infect from the visible attacker and target.
    ...undeadCombatEffectsV7({
      attacker,
      defender: target,
      attackerRule,
      defenderRule,
      damageToDefender,
      damageToAttacker,
      attackerDies,
      defenderDies,
    }),
    ...afflictions,
    runUp: runUpAttack2 / 2,
    fortificationIgnored,
    acid,
    defenderArmoured,
    attackerArmoured,
    rayPower,
    coolingApplied: rayPower === "FULL",
    defenderShieldDamage,
    attackerShieldDamage,
    shatters,
    coldBloodApplied,
    rockfallApplied,
    plantedApplied,
    blizzardHalved,
    snowCover,
    sweep,
    // Section 10.10: a hidden Witch next to an Ice Folk defender may change
    // its cover and halve a ranged hit.
    hiddenBlizzardPossible:
      isIceFolkLandUnitV7(view, target) &&
      adjacentPublicTiles(view, target.at).some((tile) => !tile.explored),
  };
}

/** The land-form Ice Witches a view can see (section 6.5). */
function publicWitchesV7(
  view: PlayerViewV7,
): readonly PlayerViewV7["units"][number][] {
  if (!matchHasIceFolkV7(view)) return [];
  return view.units.filter(
    (unit) =>
      unit.hp > 0 &&
      unit.form === "LAND" &&
      unitRoleRuleV7(view, unit).abilities.includes("BLIZZARD"),
  );
}

/**
 * Section 7.2: a unit's attack range from the public view (Rockfall: 2 for
 * a land-form Yeti on an explored Mountain).
 */
function publicAttackMaximumRangeV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): number {
  const tile = tileAtView(view, unit.at);
  return attackMaximumRangeV7(
    view,
    unit,
    tile?.explored === true ? tile.terrain : undefined,
  );
}

/**
 * The public combat preview. Revision 17 section 6.7: when the attack sets
 * off a chain, the Overrun (Ram) continuation is evaluated after it.
 */
function publicCombatPreview(
  view: PlayerViewV7,
  attackerId: UnitId,
  targetUnitId: UnitId,
  options: CombatOptionsV7 = {},
): CombatPreviewV7 | null {
  const preview = publicCombatPreviewCore(
    view,
    attackerId,
    targetUnitId,
    options,
  );
  if (preview === null || !preview.overrunAdvance) return preview;
  const chain = publicAttackChainV7(view, preview);
  if (chain.preview.explosions.length === 0) return preview;
  const target = view.units.find((unit) => unit.id === targetUnitId);
  if (target === undefined) return preview;
  const overrunContinues =
    chain.units.some((unit) => unit.id === attackerId) &&
    chain.units.some(
      (unit) =>
        unit.id !== attackerId &&
        unit.hp > 0 &&
        publicHostile(view, view.viewer.id, unit.ownerId) &&
        chebyshev(target.at, unit.at) === 1,
    );
  return {
    ...preview,
    overrunContinues,
    attacksRemaining: overrunContinues ? 1 : 0,
  };
}

interface PublicChainSimulationV7 {
  readonly blastUnit: (unit: PlayerViewV7["units"][number]) => BlastUnitV7;
  /** Records that the attack bites `unitId` for `biterId` (revision 14). */
  readonly bite: (unitId: UnitId, biterId: PlayerId) => void;
  /** The Bitten rising a land-form death leaves, or null. */
  readonly rise: (victim: BlastUnitV7) => BlastUnitV7 | null;
  /** The Infect rising of a land-form victim killed by `killerId`'s Zombie. */
  readonly infect: (victim: BlastUnitV7, killerId: PlayerId) => BlastUnitV7;
  readonly run: (
    units: readonly BlastUnitV7[],
    initial: readonly {
      readonly unit: BlastUnitV7;
      readonly cause: ExplosionCauseV7;
    }[],
    dependsOnUnexplored?: boolean,
    /** Field Defense the previewed command removed before the chain. */
    clearedFieldDefense?: readonly CoordV7[],
    /** The Martian revision: Shields the previewed command already spent. */
    shieldDamage?: ReadonlyMap<UnitId, number>,
  ) => ExplosionChainPreviewV7 & { readonly units: readonly BlastUnitV7[] };
  /**
   * The Martian revision section 8.3: `units` without the visible Thralls
   * whose (visible) Brain is no longer among them.
   */
  readonly collapse: (units: readonly BlastUnitV7[]) => BlastUnitV7[];
}

/**
 * Revision 17 public chain simulation over the viewer's visible units with
 * the canonical chain resolver. Risings get provisional negative IDs that
 * the preview reports as null.
 */
function createPublicChainSimulationV7(
  view: PlayerViewV7,
): PublicChainSimulationV7 {
  let provisional = 0;
  const bites = new Map(
    view.bitten.map((entry) => [entry.unitId, entry.biterPlayerId] as const),
  );
  const owners = new Map<UnitId, PlayerId>(
    view.units.map((unit) => [unit.id, unit.ownerId] as const),
  );
  const rising = (at: CoordV7, ownerId: PlayerId, hp: number): BlastUnitV7 => {
    provisional -= 1;
    const id = provisional as UnitId;
    owners.set(id, ownerId);
    const rule = unitRoleRuleV7(view, { ownerId, role: "GUARD" });
    return {
      id,
      ownerId,
      role: "GUARD",
      form: "LAND",
      at: { x: at.x, y: at.y },
      hp: Math.min(hp, rule.maxHp),
    };
  };
  const rise = (victim: BlastUnitV7): BlastUnitV7 | null => {
    const biterId = bites.get(victim.id);
    return biterId === undefined || victim.form !== "LAND"
      ? null
      : rising(victim.at, biterId, BITTEN_RISING_HP_V7);
  };
  // The Thralls the viewer sees with their Brain (a Thrall whose Brain is
  // hidden cannot be seen to collapse).
  const collapsing = (units: readonly BlastUnitV7[]): readonly UnitId[] => {
    if (view.thralls.length === 0) return [];
    const alive = new Set(units.map((unit) => unit.id));
    return view.thralls
      .filter(
        (entry) =>
          entry.brainUnitId !== null &&
          alive.has(entry.unitId) &&
          !alive.has(entry.brainUnitId),
      )
      .map((entry) => entry.unitId);
  };
  return {
    collapse: (units) => {
      const gone = collapsing(units);
      return units.filter((unit) => !gone.includes(unit.id));
    },
    blastUnit: (unit) => ({
      id: unit.id,
      ownerId: unit.ownerId,
      role: unit.role,
      form: unit.form,
      at: unit.at,
      hp: unit.hp,
    }),
    bite: (unitId, biterId) => {
      bites.set(unitId, biterId);
    },
    rise,
    infect: (victim, killerId) =>
      rising(victim.at, killerId, INFECT_RISING_HP_V7),
    run: (
      units,
      initial,
      dependsOnUnexplored = false,
      clearedFieldDefense = [],
      shieldDamage = new Map(),
    ) => {
      const chain = resolveExplosionChainV7<BlastUnitV7>({
        roster: view,
        width: view.board.width,
        height: view.board.height,
        units,
        initial,
        shields:
          view.shields.length === 0
            ? undefined
            : new Map(
                view.shields.map((entry) => [
                  entry.unitId,
                  Math.max(
                    0,
                    entry.shield - (shieldDamage.get(entry.unitId) ?? 0),
                  ),
                ]),
              ),
        onCollapse: view.thralls.length === 0 ? undefined : collapsing,
        fieldDefense: (at) => {
          if (clearedFieldDefense.some((cleared) => same(at, cleared)))
            return false;
          const tile = tileAtView(view, at);
          return tile?.explored === true && tile.fieldDefense;
        },
        onDeath: (victim) => rise(victim),
      });
      const viewerId = view.viewer.id;
      const plunderCoins = technologyCapabilitiesV7(
        view.viewer.researchedTechs,
        view.viewer.faction,
      ).plunderCoins;
      const totals = {
        hostileDamage: 0,
        hostileKills: 0,
        friendlyDamage: 0,
        friendlyKills: 0,
        plunderCoins: 0,
      };
      let touchesUnexplored = dependsOnUnexplored;
      const explosions = chain.explosions.map(
        (explosion): ExplosionPreviewV7 => {
          if (
            blastAreaV7(explosion.at, view.board.width, view.board.height).some(
              (at) => tileAtView(view, at)?.explored !== true,
            )
          )
            touchesUnexplored = true;
          return {
            unitId: explosion.unitId,
            ownerId: explosion.ownerId,
            role: explosion.role,
            at: explosion.at,
            cause: explosion.cause,
            wave: explosion.wave,
            damage: explosion.damage,
            fieldDefenseDestroyed: explosion.fieldDefenseDestroyed,
            results: explosion.results.map((entry) => {
              const ownerId = owners.get(entry.unitId);
              if (ownerId === undefined) throw new RangeError("INVALID_STATE");
              const friendly =
                ownerId === viewerId ||
                arePlayersAlliedV7(view, viewerId, ownerId);
              if (friendly) {
                totals.friendlyDamage += entry.damage;
                if (entry.dies) totals.friendlyKills += 1;
              } else if (arePlayersHostileV7(view, viewerId, ownerId)) {
                totals.hostileDamage += entry.damage;
                if (entry.dies) {
                  totals.hostileKills += 1;
                  if (explosion.ownerId === viewerId)
                    totals.plunderCoins += plunderCoins;
                }
              }
              return {
                unitId: entry.unitId < 0 ? null : entry.unitId,
                ownerId,
                at: entry.at,
                damage: entry.damage,
                dies: entry.dies,
                friendly,
                shieldDamage: entry.shieldDamage,
              };
            }),
          };
        },
      );
      return {
        units: chain.units,
        explosions,
        totals,
        friendlyFire: totals.friendlyDamage > 0,
        touchesUnexplored,
      };
    },
  };
}

/**
 * Revision 17: the public board after an attack's damage, deaths, risings,
 * advance, and Push, and the chain its exploding victims set off (sections
 * 6.3 and 6.7), mirroring canonical resolution.
 */
function publicAttackChainV7(
  view: PlayerViewV7,
  preview: CombatPreviewV7,
): {
  readonly preview: ExplosionChainPreviewV7;
  readonly units: readonly BlastUnitV7[];
} {
  const sim = createPublicChainSimulationV7(view);
  const attackerUnit = view.units.find(
    (unit) => unit.id === preview.attackerId,
  );
  const targetUnit = view.units.find(
    (unit) => unit.id === preview.targetUnitId,
  );
  if (attackerUnit === undefined || targetUnit === undefined)
    throw new RangeError("INVALID_STATE");
  const attacker = sim.blastUnit(attackerUnit);
  const target = sim.blastUnit(targetUnit);
  const splash = new Map(
    preview.splash.map((entry) => [entry.unitId, entry] as const),
  );
  const units: BlastUnitV7[] = [];
  const risings: BlastUnitV7[] = [];
  const initial: { unit: BlastUnitV7; cause: ExplosionCauseV7 }[] = [];
  if (preview.defenderBitten) sim.bite(target.id, attacker.ownerId);
  if (preview.attackerBitten) sim.bite(attacker.id, target.ownerId);
  // Deaths in canonical order: defender, splash victims, attacker.
  if (preview.defenderDies) {
    const rising = preview.defenderInfected
      ? sim.infect(target, attacker.ownerId)
      : sim.rise(target);
    if (rising !== null) risings.push(rising);
    // The Ice Folk revision section 5.5: a shattered unit never explodes.
    if (isExplodingUnitV7(view, target) && !preview.shatters)
      initial.push({ unit: target, cause: "DEATH" });
  }
  for (const unit of view.units) {
    if (unit.id === attacker.id || unit.id === target.id) continue;
    const entry = splash.get(unit.id);
    const blast = sim.blastUnit(unit);
    if (entry === undefined) units.push(blast);
    else if (!entry.dies) units.push({ ...blast, hp: blast.hp - entry.damage });
  }
  for (const entry of preview.splash) {
    if (!entry.dies) continue;
    const victim = view.units.find((unit) => unit.id === entry.unitId);
    if (victim === undefined) throw new RangeError("INVALID_STATE");
    const blast = sim.blastUnit(victim);
    const rising = sim.rise(blast);
    if (rising !== null) risings.push(rising);
    if (isExplodingUnitV7(view, blast))
      initial.push({ unit: blast, cause: "DEATH" });
  }
  if (preview.attackerDies) {
    const rising = preview.attackerInfected
      ? sim.infect(attacker, target.ownerId)
      : sim.rise(attacker);
    if (rising !== null) risings.push(rising);
    if (isExplodingUnitV7(view, attacker))
      initial.push({ unit: attacker, cause: "DEATH" });
  } else
    // Revision 19 Grow: a surviving Dinosaur attacker grows before the
    // chain (the defender and every hostile splash death count). Revision
    // 20: growing fully heals, and a Charge! follows a pushed target
    // (`advances`).
    units.push({
      ...attacker,
      at: preview.advances ? target.at : attacker.at,
      hp: grownHpV7(
        view,
        attackerUnit,
        attackerUnit.kills,
        attackerUnit.kills +
          (preview.defenderDies ? 1 : 0) +
          preview.splash.filter((entry) => {
            const victim = view.units.find((unit) => unit.id === entry.unitId);
            return (
              entry.dies &&
              victim !== undefined &&
              publicHostile(view, attackerUnit.ownerId, victim.ownerId)
            );
          }).length,
        attacker.hp - preview.damageToAttacker + preview.attackerHeal,
      ),
    });
  if (!preview.defenderDies)
    units.push({
      ...target,
      at:
        preview.push === "WILL_PUSH"
          ? {
              x: target.at.x * 2 - attacker.at.x,
              y: target.at.y * 2 - attacker.at.y,
            }
          : target.at,
      hp: grownHpV7(
        view,
        targetUnit,
        targetUnit.kills,
        targetUnit.kills + (preview.attackerDies ? 1 : 0),
        target.hp - preview.damageToDefender + preview.defenderHeal,
      ),
    });
  units.push(...risings);
  // The Martian revision section 10.8: a Pierce whose tile behind the target
  // is unexplored may hit a hidden unit.
  const pierceAt = attackHasPierceV7(
    unitRoleRuleV7(view, attackerUnit),
    attackerUnit,
  )
    ? pierceTileV7(attacker.at, target.at)
    : null;
  const pierceTile = pierceAt === null ? undefined : tileAtView(view, pierceAt);
  const splashRingUnexplored =
    (unitRoleMechanicsV7(view, attackerUnit).splash &&
      blastAreaV7(target.at, view.board.width, view.board.height).some(
        (at) => tileAtView(view, at)?.explored !== true,
      )) ||
    (pierceTile !== undefined && !pierceTile.explored);
  // The attack's primary Field Defense rules (CATAPULT, INSPIRED,
  // EXPLOSIVES, OCCUPATION) resolve before the chain, as canonically.
  const targetTile = tileAtView(view, target.at);
  const distance = chebyshev(attacker.at, target.at);
  const primaryDefenseLost =
    targetTile?.explored === true &&
    targetTile.fieldDefense &&
    (attackerUnit.role === "CATAPULT" ||
      // The Ice Folk revision section 7.5: Trample.
      preview.sweep ||
      (preview.inspiredApplied && distance === 1 && !preview.attackerDies) ||
      (distance === 1 &&
        !preview.attackerDies &&
        attackerUnit.form === "LAND" &&
        view.viewer.researchedTechs.includes("EXPLOSIVES")) ||
      preview.advances);
  const chain = sim.run(
    // The Thralls of a Brain the attack removed collapse before the chain.
    sim.collapse(units),
    initial,
    splashRingUnexplored ||
      (initial.length > 0 && preview.push === "UNKNOWN_BEHIND_FOG"),
    primaryDefenseLost ? [target.at] : [],
    new Map([
      [target.id, preview.defenderShieldDamage],
      [attacker.id, preview.attackerShieldDamage],
      ...preview.splash.map(
        (entry) => [entry.unitId, entry.shieldDamage] as const,
      ),
    ]),
  );
  const { units: after, ...chainPreview } = chain;
  return { preview: chainPreview, units: after };
}

function publicAdvanceDestinationLegal(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  at: CoordV7,
): boolean {
  const tile = tileAtView(view, at);
  // The advance goes through the shared `canEnterTerrainV7` (a striding
  // Colossus enters a Mountain without Engineering).
  return (
    tile?.explored === true &&
    (tile.terrain !== "MOUNTAIN" ||
      canEnterTerrainV7({
        terrain: tile.terrain,
        movementMode: unitMovementModeV7(view, attacker),
        afloat: false,
        engineering: view.viewer.researchedTechs.includes("ENGINEERING"),
        navigation: false,
        mountainBorn: unitIsMountainBornV7(view, attacker),
      }))
  );
}

function publicPushState(
  view: PlayerViewV7,
  attacker: PlayerViewV7["units"][number],
  defender: PlayerViewV7["units"][number],
  survivesMelee: boolean,
): CombatPreviewV7["push"] {
  // Revision 19 section 6.2: an Egg is never pushed. Revision 20: a Charge!
  // pushes like a `PUSH` attacker.
  if (
    !survivesMelee ||
    defender.form === "EGG" ||
    (!unitRoleRuleV7(view, attacker).abilities.includes("PUSH") &&
      !attackIsChargeV7(view, attacker))
  )
    return "BLOCKED";
  const behind = {
    x: defender.at.x * 2 - attacker.at.x,
    y: defender.at.y * 2 - attacker.at.y,
  };
  const tile = tileAtView(view, behind);
  if (tile === undefined) return "BLOCKED";
  if (!tile.explored) return "UNKNOWN_BEHIND_FOG";
  // Revision 20: a Charge! reads the explored tile as resolution does (every
  // unit on an explored tile is visible), so its Push and follow preview is
  // exact; the Juggernaut-role Push keeps its historical detection rule.
  if (!attackIsChargeV7(view, attacker) && !publicDetectionCovers(view, behind))
    return "UNKNOWN_BEHIND_FOG";
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
  // The Martian revision: a walker or flyer is pushed onto a Mountain
  // whatever its owner has researched (the shared `canEnterTerrainV7`); the
  // Ice Folk revision section 7.1: so is a Mountain-born unit.
  const strides = unitMayEnterMountainV7(view, defender, false);
  if (
    tile.terrain === "MOUNTAIN" &&
    !strides &&
    defender.ownerId !== view.viewer.id
  )
    return "UNKNOWN_BEHIND_FOG";
  if (
    tile.terrain === "MOUNTAIN" &&
    !unitMayEnterMountainV7(
      view,
      defender,
      view.viewer.researchedTechs.includes("ENGINEERING"),
    )
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
        // Revision 19: an Egg has Sight 0 and detects nothing.
        unit.form !== "EGG" &&
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
  if (command.kind === "BEAM_DOWN") return command.to;
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
