import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  BASIC_ECONOMIC_ACTIONS_V7,
  ORIGINAL_BASELINE_V3_TREE,
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
  reservedCapacityCountV7,
} from "./economy";
import { applyCommandV7 } from "./reducer";
import { calculateCombatPreviewV7 } from "./combat";
import type { CombatPreviewV7, DomainEventV7 } from "./events";
import { reachablePlayerMovementPathsV7 } from "./movement";
import {
  isCapitalConnectedRoadV7,
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

const BASIC_KINDS = Object.keys(
  BASIC_ECONOMIC_ACTIONS_V7,
) as BasicEconomicCommandKindV7[];
const SPATIAL_KINDS = Object.keys(
  SPATIAL_ECONOMIC_ACTIONS_V7,
) as SpatialEconomicCommandKindV7[];
const TILE_KINDS = [
  ...BASIC_KINDS,
  ...SPATIAL_KINDS,
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
] as const;
const BLACKOUT_BLOCKED_COMMANDS_V7: readonly CommandV7["kind"][] = [
  "HARVEST_FRUIT",
  "HUNT_GAME",
  "BUILD_FARM",
  "BUILD_LUMBER_CAMP",
  "BUILD_MINE",
  "BUILD_QUARRY",
  "BUILD_WINDMILL",
  "BUILD_SAWMILL",
  "BUILD_FORGE",
  "BUILD_STONEWORKS",
  "BUILD_WORKSHOP",
  "BUILD_GRAND_WORKS",
  "BUILD_MARKET",
  "BUILD_BARRACKS",
  "BUILD_MONUMENT",
  "CLEAR_FOREST",
  "REPLANT_FOREST",
  "BUILD_ROAD",
  "REDEVELOP",
  "TRAIN",
];
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
  const pursuit = firstOpenPursuitUnitV7(view);
  if (pursuit !== undefined)
    return store(view, publicPursuitCommandsV7(view, pursuit));
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
        if (
          primaryReady &&
          rule.abilities.includes("DEFECTION") &&
          publicHostile(view, player.id, target.ownerId) &&
          distance >= 1 &&
          distance <= 2 &&
          !view.defectionStatuses.some(
            (status) =>
              (status.visibility === "FULL" &&
                status.targetUnitId === target.id) ||
              (status.visibility === "ENDPOINT" &&
                status.endpointUnitId === target.id),
          )
        )
          for (const city of availableDefectionCitiesV7(view))
            candidates.push({
              kind: "OFFER_DEFECTION",
              unitId: unit.id,
              targetUnitId: target.id,
              homeCityId: city.cityId,
            });
      }
      if (
        primaryReady &&
        unit.role === "SABOTEUR" &&
        unit.blackoutEligibility.known &&
        view.round >= unit.blackoutEligibility.round &&
        Number.isSafeInteger(view.round + 3)
      ) {
        const detection = publicBlackoutDetectionV7(view, unit);
        if (detection.clearanceKnown && detection.sources.length === 0)
          for (const city of view.cities)
            if (
              publicHostile(view, player.id, city.ownerId) &&
              chebyshev(unit.at, city.at) === 1 &&
              city.blackout === null
            )
              candidates.push({
                kind: "BLACKOUT_CITY",
                unitId: unit.id,
                cityId: city.id,
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
        (unit.role === "SABOTEUR" ||
          player.researchedTechs.includes("EXPLOSIVES")) &&
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
  candidates.push({ kind: "END_TURN" });
  return store(view, candidates.sort(compareCommandsV7));
}

function publicPursuitCommandsV7(
  view: PlayerViewV7,
  unit: PlayerViewV7["units"][number],
): readonly CommandV7[] {
  const candidates: CommandV7[] = [{ kind: "END_PURSUIT", unitId: unit.id }];
  for (const target of view.units)
    if (
      publicHostile(view, view.viewer.id, target.ownerId) &&
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
  return candidates.sort(compareCommandsV7);
}

export interface PublicDefectionCityCapacityV7 {
  readonly cityId: CityId;
  readonly capacity: number;
  readonly assigned: number;
  readonly reservedBeforeOffer: number;
  readonly availableBeforeOffer: number;
  readonly reservedAfterOffer: number;
  readonly availableAfterOffer: number;
}

function availableDefectionCitiesV7(
  view: PlayerViewV7,
): readonly PublicDefectionCityCapacityV7[] {
  return view.cities
    .filter(
      (city) =>
        city.ownerId === view.viewer.id &&
        publicCityDevelopmentFootprintKnown(view, city),
    )
    .map((city) => {
      const capacity =
        city.level +
        1 +
        (view.viewer.researchedTechs.includes("FORTIFICATION") ? 1 : 0) +
        (cityHasImprovement(view, city.id, "BARRACKS") ? 2 : 0);
      const assigned = view.units.filter(
        (unit) =>
          unit.ownerId === view.viewer.id && unit.homeCityId === city.id,
      ).length;
      const reservedBeforeOffer = view.defectionStatuses.filter(
        (status) =>
          status.visibility === "FULL" &&
          status.initiatingPlayerId === view.viewer.id &&
          status.reservedHomeCityId === city.id,
      ).length;
      return {
        cityId: city.id,
        capacity,
        assigned,
        reservedBeforeOffer,
        availableBeforeOffer: Math.max(
          0,
          capacity - assigned - reservedBeforeOffer,
        ),
        reservedAfterOffer: reservedBeforeOffer + 1,
        availableAfterOffer: Math.max(
          0,
          capacity - assigned - reservedBeforeOffer - 1,
        ),
      };
    })
    .filter((city) => city.availableBeforeOffer > 0)
    .sort((left, right) => left.cityId - right.cityId);
}

export interface DefectionPreviewV7 {
  readonly sourceUnitId: UnitId;
  readonly target: {
    readonly unitId: UnitId;
    readonly ownerId: PlayerId;
    readonly role: UnitRoleIdV7;
    readonly at: CoordV7;
  };
  readonly reservedCity: PublicDefectionCityCapacityV7;
  readonly recordedReplyOwnerId: PlayerId;
  readonly replyBoundary: {
    readonly kind: "TARGET_OWNER_NEXT_END_TURN";
    readonly playerId: PlayerId;
    readonly earliestRound: number;
  };
  readonly earliestResolutionBoundary: {
    readonly kind: "INITIATOR_NEXT_START_TURN_AFTER_REPLY";
    readonly playerId: PlayerId;
    readonly earliestRound: number;
  };
  readonly cancellationConditions: readonly [
    "SOURCE_MISSING",
    "TARGET_MISSING",
    "SOURCE_OWNER_CHANGED",
    "TARGET_OWNER_CHANGED",
    "RELATIONSHIP_CHANGED",
    "OUT_OF_RANGE",
    "RESERVED_CITY_LOST",
    "CAPACITY_LOST",
    "INITIATOR_ELIMINATED",
    "TARGET_OWNER_ELIMINATED",
    "STATE_CANCELLED",
  ];
  readonly conversion: {
    readonly whollyExhausted: true;
    readonly captureEligible: false;
    readonly preservesRoleHpVeteranKillsAndCooldown: true;
  };
  readonly cityOccupantSiegeConsequence:
    | "BESIEGES_HOSTILE_CITY"
    | "RELIEVES_FRIENDLY_CITY_SIEGE"
    | "NONE"
    | "UNKNOWN_HIDDEN_TILE";
  readonly complete: true;
}

export type DefectionPreviewResultV7 =
  | { readonly ok: true; readonly preview: DefectionPreviewV7 }
  | { readonly ok: false; readonly error: "NOT_OFFERED" };

export function previewDefectionV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "OFFER_DEFECTION" }>,
): DefectionPreviewResultV7;
export function previewDefectionV7(
  state: GameStateV7,
  viewerId: PlayerId,
  command: Extract<CommandV7, { kind: "OFFER_DEFECTION" }>,
): DefectionPreviewResultV7;
export function previewDefectionV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrCommand: PlayerId | Extract<CommandV7, { kind: "OFFER_DEFECTION" }>,
  maybeCommand?: Extract<CommandV7, { kind: "OFFER_DEFECTION" }>,
): DefectionPreviewResultV7 {
  const view =
    maybeCommand === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrCommand as PlayerId);
  const command =
    maybeCommand ??
    (viewerOrCommand as Extract<CommandV7, { kind: "OFFER_DEFECTION" }>);
  const offered = queryPlayerCommandsV7(view).some(
    (candidate) =>
      candidate.kind === "OFFER_DEFECTION" &&
      candidate.unitId === command.unitId &&
      candidate.targetUnitId === command.targetUnitId &&
      candidate.homeCityId === command.homeCityId,
  );
  if (!offered) return { ok: false, error: "NOT_OFFERED" };
  const target = view.units.find((unit) => unit.id === command.targetUnitId);
  const reservedCity = availableDefectionCitiesV7(view).find(
    (city) => city.cityId === command.homeCityId,
  );
  if (target === undefined || reservedCity === undefined)
    return { ok: false, error: "NOT_OFFERED" };
  const tile = tileAtView(view, target.at);
  const city = view.cities.find((candidate) => same(candidate.at, target.at));
  const siege =
    tile?.explored !== true
      ? "UNKNOWN_HIDDEN_TILE"
      : city !== undefined && publicHostile(view, view.viewer.id, city.ownerId)
        ? "BESIEGES_HOSTILE_CITY"
        : city !== undefined &&
            publicHostile(view, target.ownerId, city.ownerId) &&
            !publicHostile(view, view.viewer.id, city.ownerId)
          ? "RELIEVES_FRIENDLY_CITY_SIEGE"
          : "NONE";
  const targetTurnIndex = view.turnOrder.indexOf(target.ownerId);
  const initiatorTurnIndex = view.turnOrder.indexOf(view.viewer.id);
  if (targetTurnIndex < 0 || initiatorTurnIndex < 0)
    return { ok: false, error: "NOT_OFFERED" };
  return {
    ok: true,
    preview: {
      sourceUnitId: command.unitId,
      target: {
        unitId: target.id,
        ownerId: target.ownerId,
        role: target.role,
        at: target.at,
      },
      reservedCity,
      recordedReplyOwnerId: target.ownerId,
      replyBoundary: {
        kind: "TARGET_OWNER_NEXT_END_TURN",
        playerId: target.ownerId,
        earliestRound:
          view.round + Number(targetTurnIndex <= initiatorTurnIndex),
      },
      earliestResolutionBoundary: {
        kind: "INITIATOR_NEXT_START_TURN_AFTER_REPLY",
        playerId: view.viewer.id,
        earliestRound: view.round + 1,
      },
      cancellationConditions: [
        "SOURCE_MISSING",
        "TARGET_MISSING",
        "SOURCE_OWNER_CHANGED",
        "TARGET_OWNER_CHANGED",
        "RELATIONSHIP_CHANGED",
        "OUT_OF_RANGE",
        "RESERVED_CITY_LOST",
        "CAPACITY_LOST",
        "INITIATOR_ELIMINATED",
        "TARGET_OWNER_ELIMINATED",
        "STATE_CANCELLED",
      ],
      conversion: {
        whollyExhausted: true,
        captureEligible: false,
        preservesRoleHpVeteranKillsAndCooldown: true,
      },
      cityOccupantSiegeConsequence: siege,
      complete: true,
    },
  };
}

export interface BlackoutDetectorV7 {
  readonly unitId: UnitId;
  readonly ownerId: PlayerId;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly detectionRadius: 1 | 2;
}

export interface BlackoutPreviewV7 {
  readonly sourceUnitId: UnitId;
  readonly target: {
    readonly cityId: CityId;
    readonly ownerId: PlayerId;
    readonly at: CoordV7;
  };
  readonly detectingSources: readonly BlackoutDetectorV7[];
  readonly unitDetectionBlocks: boolean;
  readonly cityDetectionBlocks: false;
  readonly actionRound: number;
  readonly nextEligibleRound: number;
  readonly incomeDenial: {
    readonly suppressionCap: 3;
    readonly exactFutureSuppressedCoins: null;
    readonly resolvesAt: "TARGET_OWNER_NEXT_START_TURN";
  };
  readonly blockedCommandKinds: readonly CommandV7["kind"][];
  readonly mandatoryRewardsRemainAvailable: true;
  readonly unitActionsRemainAvailable: true;
  readonly existingInfrastructureRemainsEffective: true;
  readonly exposureBoundary: {
    readonly kind: "TARGET_OWNER_NEXT_END_TURN";
    readonly playerId: PlayerId;
    readonly earliestRound: number;
  };
  readonly unaffectedRecoveryTurn: {
    readonly kind: "TARGET_CITY_CURRENT_OWNER_FULL_TURN";
    readonly earliestRound: number;
  };
  readonly prospective: true;
}

export type BlackoutPreviewResultV7 =
  | { readonly ok: true; readonly preview: BlackoutPreviewV7 }
  | {
      readonly ok: false;
      readonly error: "NOT_PREVIEWABLE" | "DETECTION_UNKNOWN";
    };

export function previewBlackoutV7(
  view: PlayerViewV7,
  command: Extract<CommandV7, { kind: "BLACKOUT_CITY" }>,
): BlackoutPreviewResultV7;
export function previewBlackoutV7(
  state: GameStateV7,
  viewerId: PlayerId,
  command: Extract<CommandV7, { kind: "BLACKOUT_CITY" }>,
): BlackoutPreviewResultV7;
export function previewBlackoutV7(
  input: GameStateV7 | PlayerViewV7,
  viewerOrCommand: PlayerId | Extract<CommandV7, { kind: "BLACKOUT_CITY" }>,
  maybeCommand?: Extract<CommandV7, { kind: "BLACKOUT_CITY" }>,
): BlackoutPreviewResultV7 {
  const view =
    maybeCommand === undefined
      ? (input as PlayerViewV7)
      : asView(input, viewerOrCommand as PlayerId);
  const command =
    maybeCommand ??
    (viewerOrCommand as Extract<CommandV7, { kind: "BLACKOUT_CITY" }>);
  if (!publicCommandOfferingAllowedV7(view, command.kind, command.unitId))
    return { ok: false, error: "NOT_PREVIEWABLE" };
  const source = view.units.find(
    (unit) => unit.id === command.unitId && unit.ownerId === view.viewer.id,
  );
  const city = view.cities.find((candidate) => candidate.id === command.cityId);
  const active =
    view.outcome === null &&
    view.viewer.status === "ACTIVE" &&
    view.turnOrder[view.activeSeatIndex] === view.viewer.id &&
    view.pendingChoices.length === 0;
  if (
    !active ||
    source?.role !== "SABOTEUR" ||
    primaryUsedForQuery(source) ||
    (source.activation.moved &&
      !effectiveRoleRuleV7(source.role).mayUsePrimaryActionAfterMove) ||
    source.activation.pursuitPhase !== "NONE" ||
    !source.blackoutEligibility.known ||
    view.round < source.blackoutEligibility.round ||
    city === undefined ||
    !publicHostile(view, view.viewer.id, city.ownerId) ||
    chebyshev(source.at, city.at) !== 1 ||
    city.blackout !== null
  )
    return { ok: false, error: "NOT_PREVIEWABLE" };
  const detection = publicBlackoutDetectionV7(view, source);
  if (!detection.clearanceKnown && detection.sources.length === 0)
    return { ok: false, error: "DETECTION_UNKNOWN" };
  const sourceTurnIndex = view.turnOrder.indexOf(view.viewer.id);
  const targetTurnIndex = view.turnOrder.indexOf(city.ownerId);
  if (sourceTurnIndex < 0 || targetTurnIndex < 0)
    return { ok: false, error: "NOT_PREVIEWABLE" };
  const affectedRound = view.round + Number(targetTurnIndex <= sourceTurnIndex);
  if (
    !Number.isSafeInteger(view.round + 3) ||
    !Number.isSafeInteger(affectedRound) ||
    !Number.isSafeInteger(affectedRound + 1)
  )
    return { ok: false, error: "NOT_PREVIEWABLE" };
  return {
    ok: true,
    preview: {
      sourceUnitId: source.id,
      target: { cityId: city.id, ownerId: city.ownerId, at: city.at },
      detectingSources: detection.sources,
      unitDetectionBlocks: detection.sources.length > 0,
      cityDetectionBlocks: false,
      actionRound: view.round,
      nextEligibleRound: view.round + 3,
      incomeDenial: {
        suppressionCap: 3,
        exactFutureSuppressedCoins: null,
        resolvesAt: "TARGET_OWNER_NEXT_START_TURN",
      },
      blockedCommandKinds: BLACKOUT_BLOCKED_COMMANDS_V7,
      mandatoryRewardsRemainAvailable: true,
      unitActionsRemainAvailable: true,
      existingInfrastructureRemainsEffective: true,
      exposureBoundary: {
        kind: "TARGET_OWNER_NEXT_END_TURN",
        playerId: city.ownerId,
        earliestRound: affectedRound,
      },
      unaffectedRecoveryTurn: {
        kind: "TARGET_CITY_CURRENT_OWNER_FULL_TURN",
        earliestRound: affectedRound + 1,
      },
      prospective: true,
    },
  };
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
  if (!publicCommandOfferingAllowedV7(view, "ATTACK", attackerId)) return null;
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
  if (!publicCommandOfferingAllowedV7(view, "END_PURSUIT", unitId)) return null;
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
  readonly outputTransitions: readonly EconomicOutputTransitionV7[];
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
export interface EconomicOutputTransitionV7 {
  readonly at: CoordV7;
  readonly improvement: ImprovementIdV7;
  readonly measure: "POPULATION" | "COIN_INCOME" | "CAPACITY";
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
  if (tile?.explored !== true || tile.territoryCityId === null)
    return { ok: false, error: "NOT_OFFERED" };
  const city = view.cities.find(
    (candidate) => candidate.id === tile.territoryCityId,
  );
  if (city === undefined) return { ok: false, error: "NOT_OFFERED" };
  const beforeGraph = publicEconomyGraph(view);
  const basic =
    BASIC_ECONOMIC_ACTIONS_V7[command.kind as BasicEconomicCommandKindV7];
  const spatial =
    SPATIAL_ECONOMIC_ACTIONS_V7[command.kind as SpatialEconomicCommandKindV7];
  const improvement = basic?.improvement ?? spatial?.improvement ?? null;
  const cost =
    basic?.cost ??
    spatial?.cost ??
    (command.kind === "BUILD_ROAD"
      ? 2
      : command.kind === "REPLANT_FOREST"
        ? 4
        : 0);
  const afterGraph = graphAfterTileCommandV7(view, beforeGraph, command, tile);
  if (afterGraph === null) return { ok: false, error: "NOT_OFFERED" };
  const evaluation =
    improvement !== null
      ? spatialContributionAtV7(afterGraph, command.at, improvement)
      : null;
  try {
    const populationDeltaByCity: CityValueDeltaV7[] = [];
    const coinIncomeDeltaByCity: CityValueDeltaV7[] = [];
    const levelsReached: number[] = [];
    const reachedLevelsByCity = new Map<CityId, readonly number[]>();
    const changesLiveGraph = economicCommandChangesLiveGraphV7(command.kind);
    for (const candidate of view.cities
      .filter((value) => value.ownerId === view.viewer.id)
      .sort((left, right) => left.id - right.id)) {
      const permanentDelta =
        candidate.id === city.id && basic?.populationCategory === "PERMANENT"
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
          ) -
          publicCityIncomeV7(
            view,
            candidate,
            marketForCityV7(beforeGraph, candidate.id),
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
      reachedLevelsByCity.set(candidate.id, growth.reachedLevels);
    }
    const automaticRewardCoins = publicAutomaticRewardCoinsV7(
      view,
      reachedLevelsByCity,
    );
    const immediateCoins = command.kind === "CLEAR_FOREST" ? 1 : 0;
    const coinsAfterAutomaticRewards =
      BigInt(view.viewer.coins) -
      BigInt(cost) +
      BigInt(immediateCoins) +
      BigInt(automaticRewardCoins);
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
        resultingContribution: evaluation?.population ?? basic?.population ?? 0,
        capacityDelta:
          spatial?.improvement === "BARRACKS"
            ? 2
            : command.kind === "REDEVELOP" && tile.improvement === "BARRACKS"
              ? -2
              : 0,
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
          evaluation?.capitalRoadConnected ??
          (command.kind === "BUILD_ROAD"
            ? isCapitalConnectedRoadV7(afterGraph, command.at, view.viewer.id)
            : false),
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

function publicAutomaticRewardCoinsV7(
  view: PlayerViewV7,
  reachedLevelsByCity: ReadonlyMap<CityId, readonly number[]>,
): number {
  let coins = 0;
  for (const city of [...view.cities]
    .filter((candidate) => candidate.ownerId === view.viewer.id)
    .sort((left, right) => left.id - right.id)) {
    for (const level of reachedLevelsByCity.get(city.id) ?? []) {
      if (level < 5) return coins;
      const placement = publicRewardPlacementStatus(view, city.id);
      if (placement !== "NONE") return coins;
      coins += 12;
      if (!Number.isSafeInteger(coins))
        throw new RangeError("INTEGER_OVERFLOW");
    }
  }
  return coins;
}

function economicCommandChangesLiveGraphV7(kind: CommandV7["kind"]): boolean {
  return (
    kind === "BUILD_FARM" ||
    kind === "BUILD_LUMBER_CAMP" ||
    kind === "BUILD_MINE" ||
    kind === "BUILD_QUARRY" ||
    kind === "BUILD_ROAD" ||
    kind === "REDEVELOP" ||
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
const PUBLIC_GRAPH_HAS_GRAND_WORKS_SITE = new WeakMap<
  PublicEconomyGraphV7,
  Map<PlayerId, boolean>
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
      improvement: basic.improvement,
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
  if (command.kind === "BUILD_ROAD")
    return replacePublicGraphTileV7(graph, command.at, { road: true });
  if (command.kind === "REDEVELOP")
    return replacePublicGraphTileV7(graph, command.at, {
      improvement: null,
      resource: publicRestoredResourceV7(view, tile.terrain, tile.improvement),
    });
  return null;
}

function liveTotalForCityV7(
  graph: PublicEconomyGraphV7,
  cityId: CityId,
): number {
  return graph.board.tiles
    .filter(
      (tile) => tile.territoryCityId === cityId && tile.improvement !== null,
    )
    .reduce((total, tile) => {
      const improvement = tile.improvement;
      if (improvement === null) return total;
      const value =
        total + spatialContributionAtV7(graph, tile.at, improvement).population;
      if (!Number.isSafeInteger(value))
        throw new RangeError("INTEGER_OVERFLOW");
      return value;
    }, 0);
}

function marketForCityV7(graph: PublicEconomyGraphV7, cityId: CityId): number {
  return graph.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === cityId && tile.improvement === "MARKET",
    )
    .reduce((total, tile) => {
      const value =
        total + spatialContributionAtV7(graph, tile.at, "MARKET").marketIncome;
      if (!Number.isSafeInteger(value))
        throw new RangeError("INTEGER_OVERFLOW");
      return value;
    }, 0);
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
): number {
  if (publicCityBesieged(view, city.at)) return 0;
  const preBlackout = Math.max(
    1,
    city.level +
      (city.isCapital ? 1 : 0) +
      market +
      Math.min(0, city.population),
  );
  const result =
    preBlackout -
    (city.blackout?.phase === "ACTIVE" ? Math.min(3, preBlackout) : 0);
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
        : improvement === "QUARRY"
          ? "STONE"
          : null;
  return projectedResourceAfterMutationV7(view, terrain, restored);
}

function projectedResourceAfterMutationV7(
  view: PlayerViewV7,
  terrain: PublicEconomyGraphTileV7["terrain"],
  resource: "FERTILE_GROUND" | "ORE" | "STONE" | null,
): EconomicPreviewV7["resourceRestored"] {
  if (terrain === null) return null;
  if (terrain === "FOREST") return resource;
  const revealed =
    terrain === "GRASS"
      ? view.viewer.researchedTechs.includes("GATHERING")
      : view.viewer.researchedTechs.includes("SURVEYING");
  return revealed ? resource : "UNKNOWN_RESOURCE";
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
          : tile.improvement === "BARRACKS"
            ? ("CAPACITY" as const)
            : ("POPULATION" as const),
      value:
        tile.improvement === "MARKET"
          ? evaluation.marketIncome
          : tile.improvement === "BARRACKS"
            ? evaluation.capacity
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
    .filter((value): value is EconomicOutputTransitionV7 => value !== null)
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
    if (candidate.reward !== "EXPAND")
      return { ...graph, resolvedPendingCityIds };
    return {
      ...graph,
      cities: graph.cities.map((value) =>
        value.id === city.id ? { ...value, expanded: true } : value,
      ),
      resolvedPendingCityIds,
      board: {
        ...graph.board,
        tiles: graph.board.tiles.map((tile) =>
          tile.explored &&
          tile.territoryCityId === null &&
          tile.territoryOwnerId === null &&
          chebyshev(tile.at, city.at) <= 2
            ? {
                ...tile,
                territoryCityId: city.id,
                territoryOwnerId: view.viewer.id,
              }
            : tile,
        ),
      },
    };
  }
  if (candidate.kind === "BUILD_MONUMENT")
    return {
      ...replacePublicGraphTileV7(graph, candidate.at, {
        improvement: "MONUMENT",
      }),
      remainingMonumentEntitlements: Math.max(
        0,
        graph.remainingMonumentEntitlements - 1,
      ),
    };
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

function enumeratePublicPlacementsIgnoringGatesV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
): readonly PublicPlacementV7[] {
  const placements: PublicPlacementV7[] = [];
  const entitlementsAvailable = graph.remainingMonumentEntitlements > 0;
  for (const tile of graph.board.tiles) {
    if (
      !tile.explored ||
      tile.territoryOwnerId !== view.viewer.id ||
      tile.territoryCityId === null ||
      !publicCityAllowsDevelopmentV7(view, graph, tile.territoryCityId)
    )
      continue;
    for (const kind of Object.keys(
      BASIC_ECONOMIC_ACTIONS_V7,
    ) as BasicEconomicCommandKindV7[]) {
      const rule = BASIC_ECONOMIC_ACTIONS_V7[kind];
      if (
        tile.site === null &&
        tile.terrain === rule.terrain &&
        tile.resource === rule.resource &&
        tile.improvement === null &&
        !view.treasureChests.some((chest) => same(chest, tile.at))
      )
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
    }
    for (const kind of Object.keys(
      SPATIAL_ECONOMIC_ACTIONS_V7,
    ) as SpatialEconomicCommandKindV7[]) {
      const rule = SPATIAL_ECONOMIC_ACTIONS_V7[kind];
      if (
        tile.site !== null ||
        tile.resource !== null ||
        tile.improvement !== null ||
        view.treasureChests.some((chest) => same(chest, tile.at)) ||
        graph.board.tiles.some(
          (candidate) =>
            candidate.territoryCityId === tile.territoryCityId &&
            candidate.improvement === rule.improvement,
        )
      )
        continue;
      const city = graph.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      );
      if (
        rule.improvement === "BARRACKS" &&
        (city === undefined || chebyshev(tile.at, city.at) !== 1)
      )
        continue;
      const placed = replacePublicGraphTileV7(graph, tile.at, {
        improvement: rule.improvement,
      });
      if (
        spatialContributionAtV7(placed, tile.at, rule.improvement)
          .placementCount >= rule.placementMinimum
      )
        placements.push({ cityId: tile.territoryCityId, at: tile.at, kind });
    }
    if (
      entitlementsAvailable &&
      tile.site === null &&
      tile.resource === null &&
      tile.improvement === null &&
      !view.treasureChests.some((chest) => same(chest, tile.at)) &&
      !graph.board.tiles.some(
        (candidate) =>
          candidate.territoryCityId === tile.territoryCityId &&
          candidate.improvement === "MONUMENT",
      )
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
  return placements;
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
  const afterTotals = publicGraphTotalsV7(after, view.viewer.id);
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
  const createsGrandWorks =
    isProcessorImprovementV7(improvement) &&
    !hasLegalGrandWorksSiteV7(view, graph, view.viewer.id) &&
    createsGrandWorksSiteNearV7(view, after, view.viewer.id, placement.at);
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
      population += spatialContributionAtV7(
        graph,
        tile.at,
        tile.improvement,
      ).population;
      if (!Number.isSafeInteger(population))
        throw new RangeError("INTEGER_OVERFLOW");
    }
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

function isProcessorImprovementV7(
  improvement: ImprovementIdV7 | null,
): improvement is "WINDMILL" | "SAWMILL" | "FORGE" | "STONEWORKS" {
  return (
    improvement === "WINDMILL" ||
    improvement === "SAWMILL" ||
    improvement === "FORGE" ||
    improvement === "STONEWORKS"
  );
}

function createsGrandWorksSiteNearV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  ownerId: PlayerId,
  placedAt: CoordV7,
): boolean {
  return graph.board.tiles.some(
    (tile) =>
      chebyshev(tile.at, placedAt) === 1 &&
      isLegalGrandWorksSiteV7(view, graph, ownerId, tile),
  );
}

function hasLegalGrandWorksSiteV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  ownerId: PlayerId,
): boolean {
  let byOwner = PUBLIC_GRAPH_HAS_GRAND_WORKS_SITE.get(graph);
  if (byOwner === undefined) {
    byOwner = new Map();
    PUBLIC_GRAPH_HAS_GRAND_WORKS_SITE.set(graph, byOwner);
  }
  const cached = byOwner.get(ownerId);
  if (cached !== undefined) return cached;
  const result = graph.board.tiles.some((tile) =>
    isLegalGrandWorksSiteV7(view, graph, ownerId, tile),
  );
  byOwner.set(ownerId, result);
  return result;
}

function isLegalGrandWorksSiteV7(
  view: PlayerViewV7,
  graph: PublicEconomyGraphV7,
  ownerId: PlayerId,
  tile: PublicEconomyGraphTileV7,
): boolean {
  if (
    !tile.explored ||
    tile.site !== null ||
    tile.resource !== null ||
    tile.improvement !== null ||
    tile.territoryCityId === null ||
    !publicCityAllowsDevelopmentV7(view, graph, tile.territoryCityId) ||
    view.treasureChests.some((chest) => same(chest, tile.at)) ||
    graph.board.tiles.some(
      (candidate) =>
        candidate.territoryCityId === tile.territoryCityId &&
        candidate.improvement === "GRAND_WORKS",
    ) ||
    graph.cities.find((city) => city.id === tile.territoryCityId)?.ownerId !==
      ownerId
  )
    return false;
  const placed = replacePublicGraphTileV7(graph, tile.at, {
    improvement: "GRAND_WORKS",
  });
  return (
    spatialContributionAtV7(placed, tile.at, "GRAND_WORKS").placementCount >= 2
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
    city.blackout?.phase !== "ACTIVE" &&
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

function firstOpenPursuitUnitV7(
  view: PlayerViewV7,
): PlayerViewV7["units"][number] | undefined {
  return view.units.find(
    (unit) =>
      unit.ownerId === view.viewer.id &&
      unit.activation.pursuitPhase !== "NONE",
  );
}

function publicCommandOfferingAllowedV7(
  view: PlayerViewV7,
  kind: CommandV7["kind"],
  unitId?: UnitId,
): boolean {
  if (
    view.outcome !== null ||
    view.viewer.status !== "ACTIVE" ||
    view.turnOrder[view.activeSeatIndex] !== view.viewer.id ||
    view.pendingChoices.length > 0
  )
    return false;
  const pursuit = firstOpenPursuitUnitV7(view);
  return (
    pursuit === undefined ||
    (unitId === pursuit.id &&
      (kind === "ATTACK" || kind === "PURSUE" || kind === "END_PURSUIT"))
  );
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
    attacker.role !== "CATAPULT" &&
    publicAdvanceDestinationLegal(view, target.at);
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

function publicAdvanceDestinationLegal(
  view: PlayerViewV7,
  at: CoordV7,
): boolean {
  const tile = tileAtView(view, at);
  return (
    tile?.explored === true &&
    (tile.terrain !== "MOUNTAIN" ||
      view.viewer.researchedTechs.includes("SURVEYING"))
  );
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

function publicBlackoutDetectionV7(
  view: PlayerViewV7,
  source: PlayerViewV7["units"][number],
): {
  readonly clearanceKnown: boolean;
  readonly sources: readonly BlackoutDetectorV7[];
} {
  const sources = view.units
    .filter(
      (unit) =>
        unit.id !== source.id &&
        publicHostile(view, source.ownerId, unit.ownerId) &&
        chebyshev(source.at, unit.at) <= (unit.role === "SCOUT" ? 2 : 1),
    )
    .map((unit): BlackoutDetectorV7 => ({
      unitId: unit.id,
      ownerId: unit.ownerId,
      role: unit.role,
      at: unit.at,
      detectionRadius: unit.role === "SCOUT" ? 2 : 1,
    }))
    .sort((left, right) => left.unitId - right.unitId);
  const clearanceKnown = view.board.tiles
    .filter((tile) => chebyshev(source.at, tile.at) <= 2)
    .every((tile) => tile.explored);
  return { clearanceKnown, sources };
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
