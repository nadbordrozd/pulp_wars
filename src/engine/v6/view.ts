import { deepFreeze } from "../model/freeze";
import type { PlayerId } from "../model/ids";
import { arePlayersAlliedV6 } from "./economy";
import { spatialContributionAtV6 } from "./spatial-economy";
import type {
  BoardSizeV6,
  ChocolateWallStateV6,
  CityStateV6,
  CoordV6,
  EconomicImprovementId,
  GameStateV6,
  MatchOutcomeV6,
  MatchSetupV6,
  PendingChoiceV6,
  PopulationContributionV6,
  PlayerStateV6,
  ResourceId,
  RulesetIdV6,
  TechnologyId,
  TileStateV6,
  UnitStateV6,
} from "./types";
import { publicUnitStatsV6, type PublicUnitStatsV6 } from "./unit-stats";

export const LEVELED_ECONOMIC_IMPROVEMENT_IDS_V6 = Object.freeze([
  "WINDMILL",
  "SAWMILL",
  "FORGE",
  "STONEWORKS",
  "WORKSHOP",
  "GRAND_WORKS",
  "MARKET",
] as const);

export type LeveledEconomicImprovementIdV6 =
  (typeof LEVELED_ECONOMIC_IMPROVEMENT_IDS_V6)[number];

export interface PublicImprovementValueV6 {
  readonly at: CoordV6;
  readonly improvement: LeveledEconomicImprovementIdV6;
  /** One presentation level per live population or recurring Market Coin. */
  readonly level: number;
  readonly measure: "POPULATION" | "COIN_INCOME";
}

export const UNKNOWN_RESOURCE_V6 = "UNKNOWN_RESOURCE" as const;
export type PublicResourceV6 = ResourceId | null | typeof UNKNOWN_RESOURCE_V6;

export type PlayerTileViewV6 =
  | {
      readonly at: CoordV6;
      readonly explored: false;
      readonly diplomaticBlock?: "ALLIED_TERRITORY";
    }
  | (Omit<TileStateV6, "resource" | "territoryCityId"> & {
      readonly explored: true;
      readonly resource: PublicResourceV6;
      /** Redacted until the controlling city center itself is explored. */
      readonly territoryCityId: TileStateV6["territoryCityId"];
      readonly territoryOwnerId: PlayerId | null;
    });

export interface PlayerBoardViewV6 {
  readonly width: BoardSizeV6;
  readonly height: BoardSizeV6;
  readonly tiles: readonly PlayerTileViewV6[];
}

export type PublicPlayerStateV6 = Omit<PlayerStateV6, "explored">;

/**
 * Globally public match standings. Counts are projected from authoritative
 * state so clients never infer rival totals from fog-filtered entities.
 */
export interface PublicLeaderboardEntryV6 {
  readonly playerId: PlayerId;
  readonly seat: number;
  readonly controller: PlayerStateV6["controller"];
  readonly color: PlayerStateV6["color"];
  readonly faction: PlayerStateV6["faction"];
  readonly status: PlayerStateV6["status"];
  readonly isViewer: boolean;
  readonly cityCount: number;
  readonly livingUnitCount: number;
}

export interface PlayerViewV6 {
  readonly schemaVersion: 6;
  readonly rulesetId: RulesetIdV6;
  readonly commandIndex: number;
  readonly setup: MatchSetupV6;
  readonly humanPlayerId: PlayerId;
  readonly round: number;
  readonly activeSeatIndex: number;
  readonly turnOrder: readonly PlayerId[];
  readonly viewer: PlayerStateV6;
  readonly players: readonly PublicPlayerStateV6[];
  /** Turn-order standings with aggregate counts and no entity locations. */
  readonly leaderboard: readonly PublicLeaderboardEntryV6[];
  readonly board: PlayerBoardViewV6;
  readonly cities: readonly CityStateV6[];
  readonly populationContributions: readonly PopulationContributionV6[];
  /** Stable live values for the viewer's explored, owned leveled improvements. */
  readonly improvementValues: readonly PublicImprovementValueV6[];
  readonly units: readonly UnitStateV6[];
  /** Authority-derived stat breakdowns for exactly the visible units. */
  readonly unitStats: readonly PublicUnitStatsV6[];
  readonly chocolateWalls: readonly ChocolateWallStateV6[];
  /** Treasure locations are global public objectives, including through fog. */
  readonly treasureChests: readonly CoordV6[];
  readonly pendingChoices: readonly PendingChoiceV6[];
  readonly outcome: MatchOutcomeV6 | null;
}

/**
 * Observation-safe ruleset-6 projection. Game is public on every explored
 * Forest from match start; on other technology-locked terrain, resource
 * identity and absence share the same content-free arm.
 */
export function viewForV6(
  state: GameStateV6,
  viewerId: PlayerId,
): PlayerViewV6 {
  const viewer = state.players.find((player) => player.id === viewerId);
  if (viewer === undefined) throw new RangeError(`Unknown viewer: ${viewerId}`);
  const exploredKeys = new Set(viewer.explored.map(coordKey));
  const visibleCityIds = new Set(
    state.cities
      .filter((city) => exploredKeys.has(coordKey(city.at)))
      .map((city) => city.id),
  );
  const cityOwners = new Map(
    state.cities.map((city) => [city.id, city.ownerId] as const),
  );
  const tiles: PlayerTileViewV6[] = state.board.tiles.map((tile) => {
    if (!exploredKeys.has(coordKey(tile.at))) {
      const territoryOwner =
        tile.territoryCityId === null
          ? null
          : (cityOwners.get(tile.territoryCityId) ?? null);
      return territoryOwner !== null &&
        arePlayersAlliedV6(state, viewerId, territoryOwner)
        ? {
            at: tile.at,
            explored: false,
            diplomaticBlock: "ALLIED_TERRITORY" as const,
          }
        : { at: tile.at, explored: false };
    }
    const territoryKnown =
      tile.territoryCityId === null || visibleCityIds.has(tile.territoryCityId);
    return {
      ...tile,
      explored: true,
      resource: publicResourceV6(tile, viewer.researchedTechs),
      territoryCityId: territoryKnown ? tile.territoryCityId : null,
      territoryOwnerId:
        tile.territoryCityId === null
          ? null
          : (cityOwners.get(tile.territoryCityId) ?? null),
    };
  });
  const pendingChoices = state.pendingChoices.filter((choice) =>
    choice.kind === "CITY_REWARD"
      ? state.cities.some(
          (city) => city.id === choice.cityId && city.ownerId === viewerId,
        )
      : state.units.some(
          (unit) => unit.id === choice.unitId && unit.ownerId === viewerId,
        ),
  );
  const visiblePopulationContributions = state.populationContributions.filter(
    (contribution) =>
      exploredKeys.has(coordKey(contribution.source.at)) &&
      state.cities.some(
        (city) => city.id === contribution.cityId && city.ownerId === viewerId,
      ),
  );
  const improvementValues = state.board.tiles.flatMap(
    (tile): readonly PublicImprovementValueV6[] => {
      if (
        !exploredKeys.has(coordKey(tile.at)) ||
        tile.improvement === null ||
        !isLeveledEconomicImprovementV6(tile.improvement)
      ) {
        return [];
      }
      const city = state.cities.find(
        (candidate) => candidate.id === tile.territoryCityId,
      );
      if (city?.ownerId !== viewerId) return [];
      if (tile.improvement === "MARKET") {
        return [
          {
            at: tile.at,
            improvement: tile.improvement,
            level: spatialContributionAtV6(state, tile.at, tile.improvement)
              .marketIncome,
            measure: "COIN_INCOME",
          },
        ];
      }
      const contribution = visiblePopulationContributions.find(
        (candidate) =>
          candidate.category === "LIVE" &&
          candidate.source.kind === "IMPROVEMENT" &&
          candidate.source.improvement === tile.improvement &&
          sameCoord(candidate.source.at, tile.at),
      );
      return contribution === undefined
        ? []
        : [
            {
              at: tile.at,
              improvement: tile.improvement,
              level: contribution.amount,
              measure: "POPULATION",
            },
          ];
    },
  );
  const playersById = new Map(
    state.players.map((player) => [player.id, player] as const),
  );
  const cityCounts = new Map<PlayerId, number>();
  for (const city of state.cities) {
    cityCounts.set(city.ownerId, (cityCounts.get(city.ownerId) ?? 0) + 1);
  }
  const livingUnitCounts = new Map<PlayerId, number>();
  for (const unit of state.units) {
    if (unit.hp <= 0) continue;
    livingUnitCounts.set(
      unit.ownerId,
      (livingUnitCounts.get(unit.ownerId) ?? 0) + 1,
    );
  }
  const leaderboard = state.turnOrder.map((playerId) => {
    const player = playersById.get(playerId);
    if (player === undefined) {
      throw new RangeError(`Turn order contains unknown player: ${playerId}`);
    }
    const eliminated = player.status === "ELIMINATED";
    return {
      playerId: player.id,
      seat: player.seat,
      controller: player.controller,
      color: player.color,
      faction: player.faction,
      status: player.status,
      isViewer: player.id === viewerId,
      cityCount: eliminated ? 0 : (cityCounts.get(player.id) ?? 0),
      livingUnitCount: eliminated ? 0 : (livingUnitCounts.get(player.id) ?? 0),
    } satisfies PublicLeaderboardEntryV6;
  });
  const visibleUnits = state.units.filter((unit) =>
    exploredKeys.has(coordKey(unit.at)),
  );
  return deepFreeze({
    schemaVersion: state.schemaVersion,
    rulesetId: state.rulesetId,
    commandIndex: state.commandIndex,
    setup: state.setup,
    humanPlayerId: state.humanPlayerId,
    round: state.round,
    activeSeatIndex: state.activeSeatIndex,
    turnOrder: state.turnOrder,
    viewer,
    players: state.players.map(({ explored: _explored, ...player }) => {
      void _explored;
      return player;
    }),
    leaderboard,
    board: { width: state.board.width, height: state.board.height, tiles },
    cities: state.cities.filter((city) => visibleCityIds.has(city.id)),
    populationContributions: visiblePopulationContributions,
    improvementValues,
    units: visibleUnits,
    unitStats: visibleUnits.map((unit) => publicUnitStatsV6(state, unit)),
    chocolateWalls: state.chocolateWalls.filter((wall) =>
      exploredKeys.has(coordKey(wall.at)),
    ),
    treasureChests: state.treasureChests,
    pendingChoices,
    outcome: state.outcome,
  });
}

export function publicImprovementValueAtV6(
  view: PlayerViewV6,
  at: CoordV6,
): PublicImprovementValueV6 | null {
  return (
    view.improvementValues.find((value) => sameCoord(value.at, at)) ?? null
  );
}

export function publicResourceV6(
  tile: Pick<TileStateV6, "terrain" | "resource">,
  researchedTechs: readonly TechnologyId[],
): PublicResourceV6 {
  if (tile.terrain === "FOREST") return tile.resource;
  const reveal = tile.terrain === "GRASS" ? "GATHERING" : "SURVEYING";
  return researchedTechs.includes(reveal) ? tile.resource : UNKNOWN_RESOURCE_V6;
}

function coordKey(at: CoordV6): string {
  return `${at.x},${at.y}`;
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function isLeveledEconomicImprovementV6(
  improvement: EconomicImprovementId,
): improvement is LeveledEconomicImprovementIdV6 {
  return LEVELED_ECONOMIC_IMPROVEMENT_IDS_V6.some(
    (candidate) => candidate === improvement,
  );
}
