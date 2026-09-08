import { deepFreeze } from "../model/freeze";
import type { CityId, PlayerId, UnitId } from "../model/ids";
import { arePlayersAlliedV7 } from "./economy";
import {
  detectionCoversCoordV7,
  isUnitVisibleToPlayerV7,
  isUnitVisibleWithoutDefectionV7,
  unitExplicitlyRevealedByDefectionV7,
} from "./observation";
import { spatialContributionAtV7 } from "./spatial-economy";
import type {
  BoardSizeV7,
  AchievementIdV7,
  CityBlackoutV7,
  CoordV7,
  GameStateV7,
  ImprovementIdV7,
  MatchOutcomeV7,
  MatchSetupV7,
  PendingChoiceV7,
  PlayerColorV7,
  PlayerStateV7,
  PopulationContributionV7,
  ResourceIdV7,
  RewardIdV7,
  RulesetIdV7,
  TerrainIdV7,
  UnitActivationV7,
  UnitRoleIdV7,
} from "./types";
import { publicUnitStatsV7, type PublicUnitStatsV7 } from "./unit-stats";

export const UNKNOWN_RESOURCE_V7 = "UNKNOWN_RESOURCE" as const;
export type PublicResourceV7 = ResourceIdV7 | null | typeof UNKNOWN_RESOURCE_V7;

export type PlayerTileViewV7 =
  | {
      readonly at: CoordV7;
      readonly explored: false;
      readonly diplomaticBlock?: "ALLIED_TERRITORY";
    }
  | {
      readonly at: CoordV7;
      readonly explored: true;
      readonly terrain: TerrainIdV7;
      readonly resource: PublicResourceV7;
      readonly improvement: ImprovementIdV7 | null;
      readonly road: boolean;
      readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
      readonly territoryCityId: CityId | null;
      readonly territoryOwnerId: PlayerId | null;
    };

export interface PlayerBoardViewV7 {
  readonly width: BoardSizeV7;
  readonly height: BoardSizeV7;
  readonly tiles: readonly PlayerTileViewV7[];
}

export interface PublicPlayerV7 {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColorV7;
  readonly faction: "ORIGINAL";
  readonly factionTreeId: "ORIGINAL_BASELINE_V3";
  readonly status: "ACTIVE" | "ELIMINATED";
}

export type PublicBlackoutStatusV7 =
  | {
      readonly visibility: "FULL";
      readonly cityId: CityId;
      readonly phase: CityBlackoutV7["phase"];
      readonly sourceUnitId: UnitId | null;
      readonly suppressedCoins: number | null;
      readonly unaffectedTurnStarted: boolean | null;
    }
  | {
      readonly visibility: "CITY_ONLY";
      readonly cityId: CityId;
      readonly phase: CityBlackoutV7["phase"];
    };

export interface PublicCityV7 {
  readonly id: CityId;
  readonly ownerId: PlayerId;
  readonly at: CoordV7;
  readonly level: number;
  readonly permanentPopulation: number;
  readonly economicPopulation: number;
  readonly population: number;
  readonly isCapital: boolean;
  readonly expanded: boolean;
  readonly rewards: readonly {
    readonly reachedLevel: number;
    readonly reward: RewardIdV7;
  }[];
  readonly blackout: PublicBlackoutStatusV7 | null;
}

export interface PublicUnitV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly captureEligible: boolean;
  readonly activation: UnitActivationV7;
  readonly blackoutEligibility:
    | { readonly known: true; readonly round: number }
    | { readonly known: false };
  /** Present only for viewer-safe Concealment and special reveal facts. */
  readonly visibility?: PublicUnitVisibilityV7;
}

export interface PublicUnitVisibilityV7 {
  readonly concealment?: "OWNER_CAPABILITY";
  readonly detection?: {
    readonly kind: "DETECTED";
    readonly breakCondition: "OUTSIDE_ALL_LEGAL_DETECTOR_RANGE";
  };
  readonly exposures?: readonly PublicSaboteurExposureV7[];
  readonly defectionReveals?: readonly PublicDefectionRevealV7[];
}

export interface PublicSaboteurExposureV7 {
  readonly reason: "ATTACK" | "PILLAGE" | "BLACKOUT";
  readonly boundary: {
    readonly kind: "ANCHOR_NEXT_ACCEPTED_END_TURN";
    readonly anchorPlayerId: PlayerId;
    readonly round:
      | { readonly known: true; readonly value: number }
      | {
          readonly known: false;
          readonly reason: "SAFE_INTEGER_OVERFLOW";
        };
  };
}

export interface PublicDefectionRevealV7 {
  readonly phase: "WAITING_FOR_REPLY" | "ARMED";
  readonly breakCondition: "MARK_RESOLVES_OR_CANCELS";
}

export type PublicDefectionStatusV7 =
  | {
      readonly visibility: "FULL";
      readonly markId: number;
      readonly sourceUnitId: UnitId;
      readonly targetUnitId: UnitId;
      readonly initiatingPlayerId: PlayerId;
      readonly targetOwnerId: PlayerId;
      readonly reservedHomeCityId: CityId;
      readonly phase: "WAITING_FOR_REPLY" | "ARMED";
    }
  | {
      readonly visibility: "ENDPOINT";
      readonly endpointUnitId: UnitId;
      readonly phase: "WAITING_FOR_REPLY" | "ARMED";
    };

export interface PublicLeaderboardEntryV7 {
  readonly playerId: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColorV7;
  readonly faction: "ORIGINAL";
  readonly status: "ACTIVE" | "ELIMINATED";
  readonly isViewer: boolean;
  readonly cityCount: number;
  readonly livingUnitCount: number;
}

export type PublicImprovementValueV7 = {
  readonly at: CoordV7;
  readonly improvement:
    | "WINDMILL"
    | "SAWMILL"
    | "FORGE"
    | "STONEWORKS"
    | "WORKSHOP"
    | "GRAND_WORKS"
    | "MARKET"
    | "BARRACKS"
    | "MONUMENT";
  readonly level: number;
  readonly measure: "POPULATION" | "COIN_INCOME" | "CAPACITY";
  readonly contributingTiles: readonly CoordV7[];
};

export type AchievementProgressV7 =
  | {
      readonly achievement: "ENGINEER";
      readonly currentMaximumOutput: number;
      readonly requiredOutput: 6;
    }
  | {
      readonly achievement: "MUSTER";
      readonly currentDistinctTrainableRoles: number;
      readonly requiredDistinctTrainableRoles: 4;
    };

export type PublicPopulationContributionV7 =
  | (Omit<PopulationContributionV7, "source"> & {
      readonly source: Exclude<
        PopulationContributionV7["source"],
        { kind: "MONUMENT" }
      >;
    })
  | (Omit<PopulationContributionV7, "amount" | "category" | "source"> & {
      readonly category: "LIVE";
      readonly amount: 3;
      readonly source:
        | {
            readonly kind: "MONUMENT";
            readonly visibility: "FULL";
            readonly achievement: AchievementIdV7;
            readonly at: CoordV7;
          }
        | {
            readonly kind: "MONUMENT";
            readonly visibility: "BUILDING_ONLY";
            readonly at: CoordV7;
          };
    });

export interface PlayerViewV7 {
  readonly schemaVersion: 7;
  readonly rulesetId: RulesetIdV7;
  readonly commandIndex: number;
  readonly setup: MatchSetupV7;
  readonly humanPlayerId: PlayerId;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly viewer: PlayerStateV7;
  readonly achievementProgress: readonly AchievementProgressV7[];
  readonly players: readonly PublicPlayerV7[];
  readonly leaderboard: readonly PublicLeaderboardEntryV7[];
  readonly board: PlayerBoardViewV7;
  readonly cities: readonly PublicCityV7[];
  readonly populationContributions: readonly PublicPopulationContributionV7[];
  readonly improvementValues: readonly PublicImprovementValueV7[];
  readonly units: readonly PublicUnitV7[];
  readonly unitStats: readonly PublicUnitStatsV7[];
  readonly treasureChests: readonly CoordV7[];
  readonly defectionStatuses: readonly PublicDefectionStatusV7[];
  readonly blackoutStatuses: readonly PublicBlackoutStatusV7[];
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}

export function viewForV7(
  state: GameStateV7,
  viewerId: PlayerId,
): PlayerViewV7 {
  const viewer = state.players.find((player) => player.id === viewerId);
  if (viewer === undefined) throw new RangeError(`Unknown viewer: ${viewerId}`);
  const explored = new Set(viewer.explored.map(key));
  const visibleCities = state.cities.filter((city) =>
    explored.has(key(city.at)),
  );
  const visibleCityIds = new Set(visibleCities.map((city) => city.id));
  const citiesById = new Map(
    state.cities.map((city) => [city.id, city] as const),
  );
  const tiles: PlayerTileViewV7[] = state.board.tiles.map((tile) => {
    const territory =
      tile.territoryCityId === null
        ? null
        : citiesById.get(tile.territoryCityId);
    if (!explored.has(key(tile.at))) {
      return territory !== null &&
        territory !== undefined &&
        arePlayersAlliedV7(state, viewerId, territory.ownerId)
        ? { at: tile.at, explored: false, diplomaticBlock: "ALLIED_TERRITORY" }
        : { at: tile.at, explored: false };
    }
    return {
      at: tile.at,
      explored: true,
      terrain: tile.terrain,
      resource: publicResourceV7(tile, viewer.researchedTechs),
      improvement: tile.improvement,
      road: tile.road,
      site: tile.site,
      territoryCityId:
        tile.territoryCityId === null ||
        visibleCityIds.has(tile.territoryCityId)
          ? tile.territoryCityId
          : null,
      territoryOwnerId: territory?.ownerId ?? null,
    };
  });
  const visibleUnits = state.units.filter((unit) =>
    isUnitVisibleToPlayerV7(state, viewerId, unit),
  );
  const publicUnits = visibleUnits.map((unit): PublicUnitV7 => {
    const visibility = publicUnitVisibilityV7(state, viewerId, unit);
    return {
      id: unit.id,
      ownerId: unit.ownerId,
      homeCityId: unit.ownerId === viewerId ? unit.homeCityId : null,
      role: unit.role,
      at: unit.at,
      hp: unit.hp,
      maxHp: unit.maxHp,
      kills: unit.kills,
      veteran: unit.veteran,
      captureEligible: unit.captureEligible,
      activation: unit.activation,
      blackoutEligibility:
        unit.ownerId === viewerId && unit.blackoutEligibleRound !== null
          ? { known: true, round: unit.blackoutEligibleRound }
          : { known: false },
      ...(visibility === undefined ? {} : { visibility }),
    };
  });
  const visibleContributions = state.populationContributions.flatMap(
    (contribution): readonly PublicPopulationContributionV7[] => {
      if (!explored.has(key(contribution.source.at))) return [];
      const owner = state.cities.find(
        (city) => city.id === contribution.cityId,
      )?.ownerId;
      if (contribution.source.kind !== "MONUMENT")
        return owner === viewerId
          ? [{ ...contribution, source: contribution.source }]
          : [];
      return [
        {
          ...contribution,
          category: "LIVE",
          amount: 3,
          source:
            owner === viewerId
              ? {
                  ...contribution.source,
                  visibility: "FULL" as const,
                }
              : {
                  kind: "MONUMENT" as const,
                  visibility: "BUILDING_ONLY" as const,
                  at: contribution.source.at,
                },
        },
      ];
    },
  );
  const improvementValues = state.board.tiles.flatMap(
    (tile): readonly PublicImprovementValueV7[] => {
      if (!explored.has(key(tile.at)) || tile.improvement === null) return [];
      const city =
        tile.territoryCityId === null
          ? undefined
          : citiesById.get(tile.territoryCityId);
      if (tile.improvement === "MONUMENT")
        return [
          {
            at: tile.at,
            improvement: "MONUMENT",
            level: 3,
            measure: "POPULATION",
            contributingTiles: [],
          },
        ];
      if (city?.ownerId !== viewerId || !isValued(tile.improvement)) return [];
      if (tile.improvement === "BARRACKS")
        return [
          {
            at: tile.at,
            improvement: "BARRACKS",
            level: 2,
            measure: "CAPACITY",
            contributingTiles: [],
          },
        ];
      const evaluation = spatialContributionAtV7(
        state,
        tile.at,
        tile.improvement,
      );
      const population = visibleContributions.find(
        (entry) =>
          entry.category === "LIVE" &&
          entry.source.kind === "IMPROVEMENT" &&
          same(entry.source.at, tile.at),
      );
      return [
        {
          at: tile.at,
          improvement: tile.improvement,
          level:
            tile.improvement === "MARKET"
              ? evaluation.marketIncome
              : (population?.amount ?? 0),
          measure: tile.improvement === "MARKET" ? "COIN_INCOME" : "POPULATION",
          contributingTiles: evaluation.contributingTiles.filter((at) =>
            explored.has(key(at)),
          ),
        },
      ];
    },
  );
  const visibleIds = new Set(publicUnits.map((unit) => unit.id));
  const defectionStatuses = state.defectionMarks.flatMap(
    (mark): readonly PublicDefectionStatusV7[] => {
      const privileged =
        viewerId === mark.initiatingPlayerId ||
        viewerId === mark.recordedTargetOwnerId;
      const source = state.units.find((unit) => unit.id === mark.sourceUnitId);
      const target = state.units.find((unit) => unit.id === mark.targetUnitId);
      const sourceIndependent =
        source !== undefined &&
        isUnitVisibleWithoutDefectionV7(state, viewerId, source);
      const targetIndependent =
        target !== undefined &&
        isUnitVisibleWithoutDefectionV7(state, viewerId, target);
      if (privileged || (sourceIndependent && targetIndependent))
        return [
          {
            visibility: "FULL",
            markId: mark.id,
            sourceUnitId: mark.sourceUnitId,
            targetUnitId: mark.targetUnitId,
            initiatingPlayerId: mark.initiatingPlayerId,
            targetOwnerId: mark.recordedTargetOwnerId,
            reservedHomeCityId: mark.reservedHomeCityId,
            phase: mark.phase,
          },
        ];
      const sourceVisible = visibleIds.has(mark.sourceUnitId);
      const targetVisible = visibleIds.has(mark.targetUnitId);
      if (sourceVisible || targetVisible)
        return [
          {
            visibility: "ENDPOINT",
            endpointUnitId: sourceVisible
              ? mark.sourceUnitId
              : mark.targetUnitId,
            phase: mark.phase,
          },
        ];
      return [];
    },
  );
  const blackoutStatuses = visibleCities.flatMap(
    (city): readonly PublicBlackoutStatusV7[] =>
      city.blackout === null
        ? []
        : [publicBlackout(viewerId, city.id, city.ownerId, city.blackout)],
  );
  const publicCities = visibleCities.map((city): PublicCityV7 => ({
    id: city.id,
    ownerId: city.ownerId,
    at: city.at,
    level: city.level,
    permanentPopulation: city.permanentPopulation,
    economicPopulation: city.economicPopulation,
    population: city.population,
    isCapital: city.isCapital,
    expanded: city.expanded,
    rewards: city.rewards,
    blackout:
      city.blackout === null
        ? null
        : publicBlackout(viewerId, city.id, city.ownerId, city.blackout),
  }));
  const cityCounts = countBy(state.cities.map((city) => city.ownerId));
  const unitCounts = countBy(
    state.units.filter((unit) => unit.hp > 0).map((unit) => unit.ownerId),
  );
  const playersById = new Map(
    state.players.map((player) => [player.id, player] as const),
  );
  const leaderboard = state.turnOrder.map(
    (playerId): PublicLeaderboardEntryV7 => {
      const player = playersById.get(playerId);
      if (player === undefined)
        throw new RangeError("Unknown turn-order player");
      return {
        playerId,
        seat: player.seat,
        controller: player.controller,
        color: player.color,
        faction: "ORIGINAL",
        status: player.status,
        isViewer: playerId === viewerId,
        cityCount:
          player.status === "ELIMINATED" ? 0 : (cityCounts.get(playerId) ?? 0),
        livingUnitCount:
          player.status === "ELIMINATED" ? 0 : (unitCounts.get(playerId) ?? 0),
      };
    },
  );
  return deepFreeze({
    schemaVersion: 7,
    rulesetId: state.rulesetId,
    commandIndex: state.commandIndex,
    setup: state.setup,
    humanPlayerId: state.humanPlayerId,
    round: state.round,
    activeSeatIndex: state.activeSeatIndex,
    turnOrder: state.turnOrder,
    viewer,
    achievementProgress: achievementProgressV7(state, viewerId),
    players: state.players.map(
      ({
        coins: _coins,
        researchedTechs: _techs,
        explored: _explored,
        spoilsClaimedCityIds: _spoils,
        achievementEntitlements: _achievements,
        ...player
      }) => {
        void _coins;
        void _techs;
        void _explored;
        void _spoils;
        void _achievements;
        return player;
      },
    ),
    leaderboard,
    board: { width: state.board.width, height: state.board.height, tiles },
    cities: publicCities,
    populationContributions: visibleContributions,
    improvementValues,
    units: publicUnits,
    unitStats: visibleUnits.map((unit) => {
      const stats = publicUnitStatsForViewerV7(
        publicUnitStatsV7(state, unit),
        unit.role,
        explored.has(key(unit.at)),
      );
      const exposed = state.saboteurExposures.some(
        (exposure) =>
          exposure.unitId === unit.id &&
          (unit.ownerId === viewerId ||
            exposure.anchorPlayerId === viewerId ||
            arePlayersAlliedV7(state, viewerId, exposure.anchorPlayerId)),
      );
      return exposed
        ? { ...stats, statuses: [...stats.statuses, "EXPOSED"] }
        : stats;
    }),
    treasureChests: state.treasureChests.filter((chest) =>
      explored.has(key(chest)),
    ),
    defectionStatuses,
    blackoutStatuses,
    pendingChoices: state.pendingChoices.filter((choice) =>
      state.cities.some(
        (city) => city.id === choice.cityId && city.ownerId === viewerId,
      ),
    ),
    outcome: state.outcome,
  });
}

function publicUnitVisibilityV7(
  state: GameStateV7,
  viewerId: PlayerId,
  unit: GameStateV7["units"][number],
): PublicUnitVisibilityV7 | undefined {
  const concealment =
    unit.role === "SABOTEUR" && unit.ownerId === viewerId
      ? ("OWNER_CAPABILITY" as const)
      : undefined;
  const detection =
    unit.role === "SABOTEUR" &&
    unit.ownerId !== viewerId &&
    !arePlayersAlliedV7(state, viewerId, unit.ownerId) &&
    detectionCoversCoordV7(state, viewerId, unit.at)
      ? ({
          kind: "DETECTED",
          breakCondition: "OUTSIDE_ALL_LEGAL_DETECTOR_RANGE",
        } as const)
      : undefined;
  const exposures = state.saboteurExposures.flatMap(
    (exposure): readonly PublicSaboteurExposureV7[] =>
      exposure.unitId === unit.id &&
      (unit.ownerId === viewerId ||
        exposure.anchorPlayerId === viewerId ||
        arePlayersAlliedV7(state, viewerId, exposure.anchorPlayerId))
        ? [
            {
              reason: exposure.reason,
              boundary: {
                kind: "ANCHOR_NEXT_ACCEPTED_END_TURN",
                anchorPlayerId: exposure.anchorPlayerId,
                round: nextExposureBoundaryRoundV7(
                  state,
                  exposure.anchorPlayerId,
                ),
              },
            },
          ]
        : [],
  );
  const defectionReveals = state.defectionMarks.flatMap(
    (mark): readonly PublicDefectionRevealV7[] =>
      unit.ownerId !== viewerId &&
      unitExplicitlyRevealedByDefectionV7(state, viewerId, unit, mark)
        ? [
            {
              phase: mark.phase,
              breakCondition: "MARK_RESOLVES_OR_CANCELS",
            },
          ]
        : [],
  );
  if (
    concealment === undefined &&
    detection === undefined &&
    exposures.length === 0 &&
    defectionReveals.length === 0
  )
    return undefined;
  return {
    ...(concealment === undefined ? {} : { concealment }),
    ...(detection === undefined ? {} : { detection }),
    ...(exposures.length === 0 ? {} : { exposures }),
    ...(defectionReveals.length === 0 ? {} : { defectionReveals }),
  };
}

function nextExposureBoundaryRoundV7(
  state: GameStateV7,
  anchorPlayerId: PlayerId,
): PublicSaboteurExposureV7["boundary"]["round"] {
  const anchorIndex = state.turnOrder.indexOf(anchorPlayerId);
  if (anchorIndex < 0) throw new RangeError("Unknown exposure anchor");
  const round = state.round + Number(anchorIndex < state.activeSeatIndex);
  return Number.isSafeInteger(round)
    ? { known: true, value: round }
    : { known: false, reason: "SAFE_INTEGER_OVERFLOW" };
}

const HIDDEN_POSITION_MODIFIERS_V7 = new Set([
  "CITY_WALLS",
  "FORTIFICATION",
  "FRIENDLY_CITY",
  "MOUNTAIN",
  "FOREST",
  "HIGH_GROUND",
]);

function publicUnitStatsForViewerV7(
  stats: PublicUnitStatsV7,
  role: UnitRoleIdV7,
  positionExplored: boolean,
): PublicUnitStatsV7 {
  if (positionExplored) return stats;
  return {
    ...stats,
    stats: stats.stats.map((entry) => {
      const positionCanModify =
        entry.id === "SIGHT" || (entry.id === "DEFENSE" && role !== "ENVOY");
      if (!positionCanModify) return entry;
      const modifiers = entry.modifiers.filter(
        (modifier) => !HIDDEN_POSITION_MODIFIERS_V7.has(modifier.source),
      );
      return {
        ...entry,
        modifiers,
        total: modifiers.reduce(
          (total, modifier) => addPublicStatValues(total, modifier.value),
          entry.base.value,
        ),
        visibility: "BASE_ONLY" as const,
      };
    }),
  };
}

function addPublicStatValues(
  left: { readonly numerator: number; readonly denominator: number },
  right: { readonly numerator: number; readonly denominator: number },
): { readonly numerator: number; readonly denominator: number } {
  const numerator =
    left.numerator * right.denominator + right.numerator * left.denominator;
  const denominator = left.denominator * right.denominator;
  const divisor = greatestCommonDivisor(Math.abs(numerator), denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function greatestCommonDivisor(left: number, right: number): number {
  while (right !== 0) [left, right] = [right, left % right];
  return left || 1;
}

export function achievementProgressV7(
  state: GameStateV7,
  playerId: PlayerId,
): readonly AchievementProgressV7[] {
  const currentMaximumOutput = state.populationContributions.reduce(
    (maximum, contribution) =>
      contribution.category === "LIVE" &&
      contribution.source.kind === "IMPROVEMENT" &&
      [
        "WINDMILL",
        "SAWMILL",
        "FORGE",
        "STONEWORKS",
        "WORKSHOP",
        "GRAND_WORKS",
      ].includes(contribution.source.improvement) &&
      state.cities.some(
        (city) => city.id === contribution.cityId && city.ownerId === playerId,
      )
        ? Math.max(maximum, contribution.amount)
        : maximum,
    0,
  );
  const roles = new Set(
    state.units.flatMap((unit) =>
      unit.ownerId === playerId && unit.hp > 0 && unit.role !== "JUGGERNAUT"
        ? [unit.role]
        : [],
    ),
  );
  return [
    { achievement: "ENGINEER", currentMaximumOutput, requiredOutput: 6 },
    {
      achievement: "MUSTER",
      currentDistinctTrainableRoles: roles.size,
      requiredDistinctTrainableRoles: 4,
    },
  ];
}

export function publicResourceV7(
  tile: {
    readonly terrain: TerrainIdV7;
    readonly resource: ResourceIdV7 | null;
  },
  technologies: readonly string[],
): PublicResourceV7 {
  if (tile.terrain === "FOREST") return tile.resource;
  const revealed =
    tile.terrain === "GRASS"
      ? technologies.includes("GATHERING")
      : technologies.includes("SURVEYING");
  return revealed ? tile.resource : UNKNOWN_RESOURCE_V7;
}

function publicBlackout(
  viewerId: PlayerId,
  cityId: CityId,
  cityOwnerId: PlayerId,
  blackout: CityBlackoutV7,
): PublicBlackoutStatusV7 {
  const sourceOwnerId =
    blackout.phase === "RECOVERY" ? null : blackout.sourceOwnerId;
  const full = viewerId === cityOwnerId || sourceOwnerId === viewerId;
  if (!full) return { visibility: "CITY_ONLY", cityId, phase: blackout.phase };
  return {
    visibility: "FULL",
    cityId,
    phase: blackout.phase,
    sourceUnitId: blackout.phase === "PENDING" ? blackout.sourceUnitId : null,
    suppressedCoins:
      blackout.phase === "ACTIVE" ? blackout.suppressedCoins : null,
    unaffectedTurnStarted:
      blackout.phase === "RECOVERY" ? blackout.unaffectedTurnStarted : null,
  };
}

function isValued(
  improvement: ImprovementIdV7,
): improvement is PublicImprovementValueV7["improvement"] {
  return [
    "WINDMILL",
    "SAWMILL",
    "FORGE",
    "STONEWORKS",
    "WORKSHOP",
    "GRAND_WORKS",
    "MARKET",
    "BARRACKS",
    "MONUMENT",
  ].includes(improvement);
}
function countBy(values: readonly PlayerId[]): Map<PlayerId, number> {
  const result = new Map<PlayerId, number>();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}
const key = (at: CoordV7) => `${at.y},${at.x}`;
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
