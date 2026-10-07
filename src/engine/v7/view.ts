import { deepFreeze } from "../model/freeze";
import type { CityId, PlayerId, UnitId } from "../model/ids";
import {
  REVISION_21_ACHIEVEMENT_IDS_V7,
  ENGINEER_MILL_OUTPUT_V7,
  MUSTER_KINDS_V7,
  REVISION_21_ACHIEVEMENT_REQUIRED_V7,
  explorerTilesRequiredV7,
  revision21AchievementCountsV7,
  type Revision21AchievementIdV7,
} from "./achievements";
import {
  arePlayersAlliedV7,
  combinedNetworkCityIdsV7,
  combinedNetworkRoadKeysV7,
  isActivePortV7,
  landTradeCityIdsV7,
  marketCoinsV7,
  seaTradeCityIdsV7,
} from "./economy";
import {
  MONUMENT_POPULATION_V7,
  isResourceRevealedV7,
  unitRoleRuleV7,
  FIELD_DEFENSE_FORTIFICATION_LEVELS_V7,
} from "../rules/ruleset-v7";
import { isUnitVisibleToPlayerV7 } from "./observation";
import { spatialContributionAtV7 } from "./spatial-economy";
import { knownWinterV7 } from "./ice-folk";
import { iceIsPermanentV7 } from "./ice";
import { crumbsBiteV7 } from "./candy";
import type {
  BoardSizeV7,
  BiomeIdV7,
  AchievementIdV7,
  ChillStatusV7,
  CoolingStatusV7,
  CoordV7,
  CrumbsV7,
  CuriosityV7,
  SugarRushStatusV7,
  MonsterStateV7,
  EggStatusV7,
  FactionIdV7,
  FactionTreeIdV7,
  GameStateV7,
  IceTileV7,
  ImprovementIdV7,
  MatchOutcomeV7,
  MatchSetupV7,
  MindControlCooldownV7,
  NinthUnitStateV7,
  PendingChoiceV7,
  PlayerColorV7,
  PlayerStateV7,
  PopulationContributionV7,
  ResourceIdV7,
  RewardIdV7,
  RulesetIdV7,
  ShieldStatusV7,
  TerrainIdV7,
  UnitActivationV7,
  UnitFormV7,
  UnitRoleIdV7,
} from "./types";
import { publicUnitStatsV7, type PublicUnitStatsV7 } from "./unit-stats";
import { allOwnedUnitsV7 } from "./units";

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
      readonly biome: BiomeIdV7 | null;
      readonly terrain: TerrainIdV7;
      readonly resource: PublicResourceV7;
      readonly improvement: ImprovementIdV7 | null;
      readonly road: boolean;
      readonly fieldDefense: boolean;
      readonly fortificationLevel: number | null;
      readonly site: "CAPITAL" | "VILLAGE" | "CITY" | null;
      readonly territoryCityId: CityId | null;
      readonly territoryOwnerId: PlayerId | null;
      /**
       * The Ice Folk revision (section 6.5): the derived Snow the viewer
       * knows of: territory and Deep Winter Snow, and the Blizzard of a
       * Witch the viewer can see. The UI draws the overlay from it.
       * `viewForV7` always sets both flags on an explored tile; they are
       * optional in the type only so that hand-built scene fixtures (art
       * review scenes) need not spell out `false`. Readers test `=== true`.
       */
      readonly snow?: boolean;
      /** Within 1 of an Ice Witch the viewer can see (water included). */
      readonly blizzard?: boolean;
    };

export interface PlayerBoardViewV7 {
  readonly width: BoardSizeV7;
  readonly height: BoardSizeV7;
  readonly tiles: readonly PlayerTileViewV7[];
  /** Real territory edges touching explored ground; no tile content is projected. */
  readonly territoryBorders: readonly PublicTerritoryBorderV7[];
}

export interface PublicTerritoryBorderV7 {
  readonly at: CoordV7;
  readonly edge: "NORTH" | "EAST" | "SOUTH" | "WEST";
  /** Present only where the owners differ. */
  readonly ownerId: PlayerId | null;
  /** Both owners only when both adjacent territory tiles are explored. */
  readonly sharedOwnerIds: readonly [PlayerId, PlayerId] | null;
  /** Visible city centers whose actual territory ends on this edge. */
  readonly cityIds: readonly CityId[];
}

export interface PublicPlayerV7 {
  readonly id: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColorV7;
  readonly faction: FactionIdV7;
  readonly factionTreeId: FactionTreeIdV7;
  readonly originalCapitalCityId: CityId;
  readonly status: "ACTIVE" | "ELIMINATED";
}

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
  readonly landGrantUsed: boolean;
  /** Owner-private shared TRAIN/TRAIN_NAVAL/LAND_GRANT availability. */
  readonly cityActionAvailable?: boolean;
  readonly rewards: readonly {
    readonly reachedLevel: number;
    readonly reward: RewardIdV7;
  }[];
}

export interface PublicUnitV7 {
  readonly id: UnitId;
  readonly ownerId: PlayerId;
  readonly homeCityId: CityId | null;
  readonly role: UnitRoleIdV7;
  /** Revision 19: `EGG` for a Dinosaur Egg (see `PlayerViewV7.eggs`). */
  readonly form: UnitFormV7;
  readonly at: CoordV7;
  readonly hp: number;
  readonly maxHp: number;
  readonly kills: number;
  readonly veteran: boolean;
  readonly captureEligible: boolean;
  readonly activation: UnitActivationV7;
}

export interface PublicLeaderboardEntryV7 {
  readonly playerId: PlayerId;
  readonly seat: number;
  readonly controller: "HUMAN" | "AI";
  readonly color: PlayerColorV7;
  readonly faction: FactionIdV7;
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
    | "WORKSHOP"
    | "MARKET"
    | "MONUMENT"
    | "SHIPYARD";
  readonly level: number;
  readonly measure: "POPULATION" | "COIN_INCOME";
  readonly contributingTiles: readonly CoordV7[];
};

export type AchievementProgressV7 =
  | {
      readonly achievement: "EXPLORER";
      readonly currentExploredTiles: number;
      /** Half the board's tiles, rounded up (the economy rejig, 7r54). */
      readonly requiredExploredTiles: number;
    }
  | {
      readonly achievement: "ENGINEER";
      readonly currentMaximumOutput: number;
      readonly requiredOutput: typeof ENGINEER_MILL_OUTPUT_V7;
    }
  | {
      readonly achievement: "MUSTER";
      readonly currentDistinctTrainableRoles: number;
      readonly requiredDistinctTrainableRoles: typeof MUSTER_KINDS_V7;
    }
  // Revision 21: Conqueror, Land Baron, Sea Dog, and Slayer share one shape.
  | {
      readonly achievement: Revision21AchievementIdV7;
      readonly current: number;
      readonly required: number;
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
      /** `MONUMENT_POPULATION_V7` (3 since the economy rejig, 7r54). */
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
  readonly naval: PublicNavalFactsV7;
  readonly treasureChests: readonly CoordV7[];
  /**
   * Map curiosities (docs/product/RULESET_7_MAP_CURIOSITIES.md section
   * 10.4): the curiosities on tiles the viewer has explored, sorted by
   * (y, x). A curiosity is public on an explored tile.
   */
  readonly curiosities: readonly CuriosityV7[];
  /**
   * The naval branch, the frozen sea
   * (docs/product/RULESET_7_NAVAL_BRANCH.md section 8.3): the ice on tiles
   * the viewer has explored, sorted by (y, x). Ice is public like a unit on
   * an explored tile: the viewer sees it appear and melt there.
   */
  readonly ice: readonly PublicIceTileV7[];
  /**
   * Map curiosities (section 8.8): every visible Monster (a unit in
   * `units` owned by the neutral owner) with its home and its `provokedBy`
   * filtered to the units the viewer can see, sorted by unit ID.
   */
  readonly monsters: readonly MonsterStateV7[];
  /** Revision 13: the viewer-explored subset of the canonical Graves. */
  readonly graves: readonly CoordV7[];
  /**
   * Revision 14: the Plague status of every unit in `units`, sorted by unit
   * ID. The source Lich is named only when the viewer can see it.
   */
  readonly plagued: readonly PublicPlagueStatusV7[];
  /** Revision 14: the Bitten status of every unit in `units`, by unit ID. */
  readonly bitten: readonly PublicBittenStatusV7[];
  /**
   * Revision 19: the countdown of every Egg in `units`, sorted by unit ID
   * (an Egg's role, HP, and countdown are public on a visible Egg).
   */
  readonly eggs: readonly EggStatusV7[];
  /**
   * The Martian revision: the Shield of every unit in `units` whose Shield
   * is at least 1, sorted by unit ID (a visible unit's Shield is public).
   */
  readonly shields: readonly ShieldStatusV7[];
  /** The Martian revision: the Cooling entries of the units in `units`. */
  readonly cooling: readonly CoolingStatusV7[];
  /**
   * The Mind Control revision (section 6): every mind-controlled unit in
   * `units` and `burrowed`, sorted by unit ID; its Brain is named only when
   * the viewer can see it, and its original owner is public.
   */
  readonly mindControlled: readonly PublicMindControlledStatusV7[];
  /** The Martian revision: the Mind Control cooldowns of visible Brains. */
  readonly mindControlCooldowns: readonly MindControlCooldownV7[];
  /**
   * The Ice Folk revision (section 5.1): the Chill entries of every unit in
   * `units`, sorted by unit ID (Chill is public on a visible unit).
   */
  readonly chilled: readonly ChillStatusV7[];
  /**
   * The Dwarf revision (section 5.2): every mound on a tile the viewer has
   * explored (every own mound is), sorted by unit ID, with the public
   * fields of the burrowed record (`at` is the mound tile) and its Mole. A
   * mound is public exactly as a unit on that tile would be.
   */
  readonly burrowed: readonly PublicBurrowedEntryV7[];
  /** The Dwarf revision (section 5.4): `surfacedThisTurn` of visible units. */
  readonly surfacedThisTurn: readonly UnitId[];
  /** The Dwarf revision (section 6.3): `bombedThisTurn` of visible units. */
  readonly bombedThisTurn: readonly UnitId[];
  /**
   * The Martian balance revision (`pulp_wars-1wy.3`): `beamedThisTurn` and
   * `tractorUsedThisTurn` of visible units.
   */
  readonly beamedThisTurn: readonly UnitId[];
  readonly tractorUsedThisTurn: readonly UnitId[];
  /**
   * The Candy revision (docs/product/RULESET_7_CANDY.md section 12.14): the
   * `sugarRush` entries of visible units, sorted by unit ID.
   */
  readonly sugarRush: readonly SugarRushStatusV7[];
  /**
   * The Candy revision (section 12.14): the Crumbs on tiles the viewer has
   * explored (public like Graves), sorted by (y, x), each with its owner's
   * public Peppermint Surprise damage (`bite`).
   */
  readonly crumbs: readonly PublicCrumbsV7[];
  /** The Candy revision: `splattedThisTurn` of visible units. */
  readonly splattedThisTurn: readonly UnitId[];
  /** The Candy revision: `tossedThisTurn` of visible units. */
  readonly tossedThisTurn: readonly UnitId[];
  /**
   * The Dinosaur pass, correction: `huntedThisTurn` of visible units (the
   * targets a Caveman of the active seat has Pack Hunt against).
   */
  readonly huntedThisTurn: readonly UnitId[];
  /**
   * The ninth unit (`pulp_wars-w49.17`, 7r55): the marked Graves on tiles
   * the viewer has explored (public like Graves, with the seat the Wight
   * returns for), the risen Wights and Cracked units among the visible
   * units, and the struck pairs of visible attackers.
   */
  readonly ninthUnit: NinthUnitStateV7;
  readonly pendingChoices: readonly PendingChoiceV7[];
  readonly outcome: MatchOutcomeV7 | null;
}

/**
 * The Candy revision (section 12.14): Crumbs in a player's view. `bite` is
 * the damage an eater takes (the owner's `crumbsBite`: 0 without Peppermint
 * Surprise).
 */
export interface PublicCrumbsV7 extends CrumbsV7 {
  readonly bite: number;
}

/**
 * The frozen sea (naval branch section 8.3): an ice tile in a player's
 * view. `permanent`: the tile is in its owner's territory, where the ice
 * never counts down.
 */
export interface PublicIceTileV7 extends IceTileV7 {
  readonly permanent: boolean;
}

/** The Dwarf revision (section 5.2): a mound in a player's view. */
export interface PublicBurrowedEntryV7 {
  readonly unit: PublicUnitV7;
  readonly moleUnitId: UnitId | null;
}

/** The Mind Control revision: the public status of a controlled unit. */
export interface PublicMindControlledStatusV7 {
  readonly unitId: UnitId;
  readonly brainUnitId: UnitId | null;
  readonly originalOwnerId: PlayerId;
}

/**
 * Revision 14 public Plague status of a visible unit. Revision 15:
 * `turnsRemaining` (1–3) is how many more of its owner's Start Turns deal
 * Plague damage; the unit spreads Plague only while it is 3.
 */
export interface PublicPlagueStatusV7 {
  readonly unitId: UnitId;
  readonly sourceUnitId: UnitId | null;
  readonly turnsRemaining: number;
}

/** Revision 14 public Bitten status: whose Zombie the unit would rise as. */
export interface PublicBittenStatusV7 {
  readonly unitId: UnitId;
  readonly biterPlayerId: PlayerId;
}

export interface PublicNavalFactsV7 {
  readonly ownedPorts: readonly {
    readonly at: CoordV7;
    readonly cityId: CityId;
    readonly status: "ACTIVE" | "BLOCKADED";
  }[];
  readonly tradeCityIds: readonly CityId[];
  readonly landTradeCityIds: readonly CityId[];
  readonly seaTradeCityIds: readonly CityId[];
  readonly networkCityIds: readonly CityId[];
  readonly networkRoads: readonly CoordV7[];
  readonly seaRoutes: readonly {
    readonly fromCityId: CityId;
    readonly toCityId: CityId;
    readonly path: readonly CoordV7[];
  }[];
  readonly recoverableNavalUnitIds: readonly UnitId[];
}

export function viewForV7(
  state: GameStateV7,
  viewerId: PlayerId,
): PlayerViewV7 {
  const viewer = state.players.find((player) => player.id === viewerId);
  if (viewer === undefined) throw new RangeError(`Unknown viewer: ${viewerId}`);
  const explored = new Set(viewer.explored.map(key));
  // The Ice Folk revision section 6.5: the Snow and Blizzard the viewer knows.
  const winter = knownWinterV7(
    state,
    viewerId,
    new Set(viewer.explored.map((at) => at.y * state.board.width + at.x)),
  );
  const visibleCities = state.cities.filter((city) =>
    explored.has(key(city.at)),
  );
  const visibleCityIds = new Set(visibleCities.map((city) => city.id));
  const citiesById = new Map(
    state.cities.map((city) => [city.id, city] as const),
  );
  const ownedPorts = state.board.tiles
    .filter(
      (tile) =>
        explored.has(key(tile.at)) &&
        (tile.improvement === "PORT" || tile.improvement === "SHIPYARD") &&
        state.cities.find((city) => city.id === tile.territoryCityId)
          ?.ownerId === viewerId,
    )
    .map((tile) => ({
      at: tile.at,
      cityId: tile.territoryCityId as CityId,
      status: isActivePortV7(state, tile.at, viewerId)
        ? ("ACTIVE" as const)
        : ("BLOCKADED" as const),
    }));
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
      biome: tile.biome,
      terrain: tile.terrain,
      resource: publicResourceV7(tile, viewer.researchedTechs),
      improvement: tile.improvement,
      road: tile.road,
      fieldDefense: tile.fieldDefense,
      fortificationLevel:
        territory !== undefined &&
        territory !== null &&
        (territory.ownerId === viewerId ||
          state.units.some(
            (unit) =>
              same(unit.at, tile.at) &&
              isUnitVisibleToPlayerV7(state, viewerId, unit),
          ))
          ? tileFortificationLevel(state, tile.at, territory)
          : null,
      site: tile.site,
      territoryCityId:
        tile.territoryCityId === null ||
        visibleCityIds.has(tile.territoryCityId)
          ? tile.territoryCityId
          : null,
      territoryOwnerId: territory?.ownerId ?? null,
      snow: winter.snow.has(tile.at.y * state.board.width + tile.at.x),
      blizzard: winter.blizzard.has(tile.at.y * state.board.width + tile.at.x),
    };
  });
  const tilesByCoord = new Map(
    state.board.tiles.map((tile) => [key(tile.at), tile] as const),
  );
  const territoryBorders: PublicTerritoryBorderV7[] = [];
  const directions = [
    { edge: "NORTH", dx: 0, dy: -1 },
    { edge: "EAST", dx: 1, dy: 0 },
    { edge: "SOUTH", dx: 0, dy: 1 },
    { edge: "WEST", dx: -1, dy: 0 },
  ] as const;
  for (const tile of state.board.tiles) {
    for (const { edge, dx, dy } of directions) {
      // Interior edges are emitted once. West and north still cover board edges.
      if (
        (edge === "WEST" && tile.at.x > 0) ||
        (edge === "NORTH" && tile.at.y > 0)
      )
        continue;
      const neighbor = tilesByCoord.get(
        key({ x: tile.at.x + dx, y: tile.at.y + dy }),
      );
      if (
        !explored.has(key(tile.at)) &&
        (neighbor === undefined || !explored.has(key(neighbor.at)))
      )
        continue;
      const leftCity = tile.territoryCityId;
      const rightCity = neighbor?.territoryCityId ?? null;
      if (leftCity === rightCity) continue;
      const leftOwner =
        leftCity === null ? null : (citiesById.get(leftCity)?.ownerId ?? null);
      const rightOwner =
        rightCity === null
          ? null
          : (citiesById.get(rightCity)?.ownerId ?? null);
      const ownerId =
        leftOwner === rightOwner ? null : (leftOwner ?? rightOwner);
      const sharedOwnerIds =
        neighbor !== undefined &&
        explored.has(key(tile.at)) &&
        explored.has(key(neighbor.at)) &&
        leftOwner !== null &&
        rightOwner !== null &&
        leftOwner !== rightOwner
          ? ([leftOwner, rightOwner] as const)
          : null;
      const cityIds = [leftCity, rightCity].filter(
        (cityId): cityId is CityId =>
          cityId !== null && visibleCityIds.has(cityId),
      );
      if (ownerId === null && cityIds.length === 0) continue;
      territoryBorders.push({
        at: tile.at,
        edge,
        ownerId,
        sharedOwnerIds,
        cityIds,
      });
    }
  }
  const visibleUnits = state.units.filter((unit) =>
    isUnitVisibleToPlayerV7(state, viewerId, unit),
  );
  const visibleUnitIds = new Set(visibleUnits.map((unit) => unit.id));
  // The Dwarf revision section 5.3: a mound is visible on an explored tile.
  const visibleBurrowed = state.burrowed.filter(
    (entry) =>
      entry.unit.ownerId === viewerId || explored.has(key(entry.unit.at)),
  );
  const visibleBurrowedIds = new Set(
    visibleBurrowed.map((entry) => entry.unit.id),
  );
  const publicUnit = (unit: GameStateV7["units"][number]): PublicUnitV7 => {
    return {
      id: unit.id,
      ownerId: unit.ownerId,
      homeCityId: unit.ownerId === viewerId ? unit.homeCityId : null,
      role: unit.role,
      form: unit.form,
      at: unit.at,
      hp: unit.hp,
      maxHp: unit.maxHp,
      kills: unit.kills,
      veteran: unit.veteran,
      captureEligible: unit.captureEligible,
      activation:
        unit.ownerId === viewerId
          ? unit.activation
          : { ...unit.activation, tendedThisTurn: false },
    };
  };
  const publicUnits = visibleUnits.map(publicUnit);
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
          amount: MONUMENT_POPULATION_V7,
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
            level: MONUMENT_POPULATION_V7,
            measure: "POPULATION",
            contributingTiles: [],
          },
        ];
      if (city?.ownerId !== viewerId || !isValued(tile.improvement)) return [];
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
              ? marketCoinsV7(evaluation.marketIncome)
              : (population?.amount ?? 0),
          measure: tile.improvement === "MARKET" ? "COIN_INCOME" : "POPULATION",
          contributingTiles: evaluation.contributingTiles.filter((at) =>
            explored.has(key(at)),
          ),
        },
      ];
    },
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
    landGrantUsed: city.landGrantUsed,
    ...(city.ownerId === viewerId
      ? { cityActionAvailable: city.cityActionAvailable }
      : {}),
    rewards: city.rewards,
  }));
  const cityCounts = countBy(state.cities.map((city) => city.ownerId));
  // The Dwarf revision section 5.2: the leaderboard counts everything a
  // player owns, burrowed units included.
  const unitCounts = countBy(
    allOwnedUnitsV7(state)
      .filter((unit) => unit.hp > 0)
      .map((unit) => unit.ownerId),
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
        faction: player.faction,
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
    board: {
      width: state.board.width,
      height: state.board.height,
      tiles,
      territoryBorders,
    },
    cities: publicCities,
    populationContributions: visibleContributions,
    improvementValues,
    units: publicUnits,
    // The Dwarf revision: a mound's record has stats like a visible unit.
    unitStats: [
      ...visibleUnits,
      ...visibleBurrowed.map((entry) => entry.unit),
    ].map((unit) =>
      publicUnitStatsForViewerV7(
        // The Ice Folk revision: Snow cover from the Snow the viewer knows.
        publicUnitStatsV7(state, unit, {
          snowAt: (at) => winter.snow.has(at.y * state.board.width + at.x),
          blizzardAt: (at) =>
            winter.blizzard.has(at.y * state.board.width + at.x),
        }),
        unit.ownerId === viewerId,
        explored.has(key(unit.at)),
        visibleUnitIds,
      ),
    ),
    naval: {
      ownedPorts,
      tradeCityIds: [...seaTradeCityIdsV7(state, viewerId)].sort(
        (left, right) => left - right,
      ),
      landTradeCityIds: [...landTradeCityIdsV7(state, viewerId)].sort(
        (left, right) => left - right,
      ),
      seaTradeCityIds: [...seaTradeCityIdsV7(state, viewerId)].sort(
        (left, right) => left - right,
      ),
      networkCityIds: [...combinedNetworkCityIdsV7(state, viewerId)].sort(
        (left, right) => left - right,
      ),
      networkRoads: state.board.tiles
        .filter(
          (tile) =>
            explored.has(key(tile.at)) &&
            combinedNetworkRoadKeysV7(state, viewerId).has(key(tile.at)),
        )
        .map((tile) => tile.at),
      seaRoutes: publicSeaRoutes(state, viewer, ownedPorts),
      recoverableNavalUnitIds: state.units
        .filter(
          (unit) =>
            unit.ownerId === viewerId &&
            unit.form === "NAVAL" &&
            [
              unit.at,
              ...neighbors8(state.board.width, state.board.height, unit.at),
            ].some((at) => isActivePortV7(state, at, viewerId)),
        )
        .map((unit) => unit.id)
        .sort((left, right) => left - right),
    },
    treasureChests: state.treasureChests.filter((chest) =>
      explored.has(key(chest)),
    ),
    curiosities: state.curiosities
      .filter((curiosity) => explored.has(key(curiosity.at)))
      .map((curiosity) => ({ kind: curiosity.kind, at: curiosity.at })),
    // The frozen sea (naval branch section 8.3): ice is public on an
    // explored tile, with its owner, its countdown, and `permanent`.
    ice: state.ice
      .filter((entry) => explored.has(key(entry.at)))
      .map((entry) => ({
        at: entry.at,
        ownerId: entry.ownerId,
        turnsLeft: entry.turnsLeft,
        permanent: iceIsPermanentV7(state, entry),
      })),
    monsters: state.monsters
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({
        unitId: entry.unitId,
        home: entry.home,
        provokedBy: entry.provokedBy.filter((unitId) =>
          visibleUnitIds.has(unitId),
        ),
      })),
    graves: state.graves.filter((grave) => explored.has(key(grave))),
    // Revision 14 statuses are public on every visible unit.
    plagued: state.plagued
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({
        unitId: entry.unitId,
        sourceUnitId: visibleUnitIds.has(entry.sourceUnitId)
          ? entry.sourceUnitId
          : null,
        // Revision 15: the remaining Plague turns are public.
        turnsRemaining: entry.turnsRemaining,
      })),
    bitten: state.bitten
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({
        unitId: entry.unitId,
        biterPlayerId: entry.biterPlayerId,
      })),
    eggs: state.eggs
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({
        unitId: entry.unitId,
        turnsRemaining: entry.turnsRemaining,
        laidThisTurn: entry.laidThisTurn,
      })),
    // The Martian revision: Shields, Cooling, and Mind Control cooldowns are
    // public on every visible unit.
    shields: state.shields
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({ unitId: entry.unitId, shield: entry.shield })),
    cooling: state.cooling
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({
        unitId: entry.unitId,
        firedThisTurn: entry.firedThisTurn,
      })),
    // The Mind Control revision (section 6): every visible controlled unit
    // (on the board or a visible mound); the original owner is public.
    mindControlled: state.mindControlled
      .filter(
        (entry) =>
          visibleUnitIds.has(entry.unitId) ||
          visibleBurrowedIds.has(entry.unitId),
      )
      .map((entry) => ({
        unitId: entry.unitId,
        brainUnitId: visibleUnitIds.has(entry.brainUnitId)
          ? entry.brainUnitId
          : null,
        originalOwnerId: entry.originalOwnerId,
      })),
    mindControlCooldowns: state.mindControlCooldowns
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({
        unitId: entry.unitId,
        turnsRemaining: entry.turnsRemaining,
      })),
    // The Ice Folk revision: Chill is public on every visible unit.
    chilled: state.chilled
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({
        unitId: entry.unitId,
        sluggish: entry.sluggish,
        turnsLeft: entry.turnsLeft,
      })),
    // The Dwarf revision (sections 5.2, 5.4, and 6.3): the mounds the viewer
    // has explored and the public per-turn lists of visible units.
    burrowed: visibleBurrowed.map((entry) => ({
      unit: publicUnit(entry.unit),
      moleUnitId: entry.moleUnitId,
    })),
    surfacedThisTurn: state.surfacedThisTurn.filter((unitId) =>
      visibleUnitIds.has(unitId),
    ),
    bombedThisTurn: state.bombedThisTurn.filter((unitId) =>
      visibleUnitIds.has(unitId),
    ),
    // The Martian balance revision (`pulp_wars-1wy.3`): the public per-turn
    // lists of visible units (every own unit is visible).
    beamedThisTurn: state.beamedThisTurn.filter((unitId) =>
      visibleUnitIds.has(unitId),
    ),
    tractorUsedThisTurn: state.tractorUsedThisTurn.filter((unitId) =>
      visibleUnitIds.has(unitId),
    ),
    // The Candy revision (section 12.14): Rush, Splat, and Toss are public
    // on visible units; Crumbs are public on explored tiles, with the bite.
    sugarRush: state.sugarRush
      .filter((entry) => visibleUnitIds.has(entry.unitId))
      .map((entry) => ({ unitId: entry.unitId, phase: entry.phase })),
    crumbs: state.crumbs
      .filter((entry) => explored.has(key(entry.at)))
      .map((entry) => ({
        at: entry.at,
        role: entry.role,
        ownerId: entry.ownerId,
        turnsLeft: entry.turnsLeft,
        bite: crumbsBiteV7(state, entry.ownerId),
      })),
    splattedThisTurn: state.splattedThisTurn.filter((unitId) =>
      visibleUnitIds.has(unitId),
    ),
    tossedThisTurn: state.tossedThisTurn.filter((unitId) =>
      visibleUnitIds.has(unitId),
    ),
    huntedThisTurn: state.huntedThisTurn.filter((unitId) =>
      visibleUnitIds.has(unitId),
    ),
    // The ninth unit (7r55): see `PlayerViewV7.ninthUnit`.
    ninthUnit: {
      wightGraves: state.ninthUnit.wightGraves
        .filter((entry) => explored.has(key(entry.at)))
        .map((entry) => ({ at: entry.at, ownerId: entry.ownerId })),
      risenWights: state.ninthUnit.risenWights.filter((unitId) =>
        visibleUnitIds.has(unitId),
      ),
      crackedThisTurn: state.ninthUnit.crackedThisTurn.filter((unitId) =>
        visibleUnitIds.has(unitId),
      ),
      struckThisTurn: state.ninthUnit.struckThisTurn
        .filter((entry) => visibleUnitIds.has(entry.unitId))
        .map((entry) => ({
          unitId: entry.unitId,
          targetUnitId: entry.targetUnitId,
        })),
    },
    pendingChoices: state.pendingChoices.filter((choice) =>
      state.cities.some(
        (city) => city.id === choice.cityId && city.ownerId === viewerId,
      ),
    ),
    outcome: state.outcome,
  });
}

function publicSeaRoutes(
  state: GameStateV7,
  viewer: PlayerStateV7,
  ports: readonly {
    readonly at: CoordV7;
    readonly cityId: CityId;
    readonly status: "ACTIVE" | "BLOCKADED";
  }[],
): PublicNavalFactsV7["seaRoutes"] {
  if (!viewer.researchedTechs.includes("SHORECRAFT")) return [];
  const explored = new Set(viewer.explored.map(key));
  const water = new Set(
    state.board.tiles
      .filter(
        (tile) =>
          tile.biome === null &&
          explored.has(key(tile.at)) &&
          (tile.terrain !== "DEEP_WATER" ||
            viewer.researchedTechs.includes("NAVIGATION")),
      )
      .map((tile) => key(tile.at)),
  );
  const best = new Map<string, PublicNavalFactsV7["seaRoutes"][number]>();
  const active = ports.filter((port) => port.status === "ACTIVE");
  for (const from of active) {
    const parents = waterParents(
      state.board.width,
      state.board.height,
      water,
      from.at,
      5,
    );
    for (const to of active) {
      if (from.cityId >= to.cityId) continue;
      const path = reconstructWaterPath(parents, to.at);
      if (path === null) continue;
      const route = { fromCityId: from.cityId, toCityId: to.cityId, path };
      const routeKey = `${from.cityId}:${to.cityId}`;
      const existing = best.get(routeKey);
      if (
        existing === undefined ||
        route.path.length < existing.path.length ||
        (route.path.length === existing.path.length &&
          comparePath(route.path, existing.path) < 0)
      )
        best.set(routeKey, route);
    }
  }
  return [...best.values()].sort(
    (left, right) =>
      left.fromCityId - right.fromCityId || left.toCityId - right.toCityId,
  );
}

function comparePath(
  left: readonly CoordV7[],
  right: readonly CoordV7[],
): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined || b === undefined) break;
    const order = a.y - b.y || a.x - b.x;
    if (order !== 0) return order;
  }
  return left.length - right.length;
}

function waterParents(
  width: number,
  height: number,
  water: ReadonlySet<string>,
  start: CoordV7,
  maximumDistance: number,
): ReadonlyMap<string, CoordV7 | null> {
  const queue = [start];
  const distance = new Map<string, number>([[key(start), 0]]);
  const prior = new Map<string, CoordV7 | null>([[key(start), null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined) break;
    const currentDistance = distance.get(key(current));
    if (currentDistance === undefined || currentDistance >= maximumDistance)
      continue;
    for (const near of neighbors8(width, height, current))
      if (water.has(key(near)) && !prior.has(key(near))) {
        prior.set(key(near), current);
        distance.set(key(near), currentDistance + 1);
        queue.push(near);
      }
  }
  return prior;
}

function reconstructWaterPath(
  prior: ReadonlyMap<string, CoordV7 | null>,
  finish: CoordV7,
): CoordV7[] | null {
  if (!prior.has(key(finish))) return null;
  const path: CoordV7[] = [];
  let step: CoordV7 | null = finish;
  while (step !== null) {
    path.push(step);
    step = prior.get(key(step)) ?? null;
  }
  return path.reverse();
}

const HIDDEN_POSITION_MODIFIERS_V7 = new Set([
  "CITY_WALLS",
  "CITY_FORTIFICATION",
  "FIELD_DEFENSE",
  "MOUNTAIN",
  "FOREST",
  "HIGH_GROUND",
  // The Ice Folk revision: Snow cover depends on the position.
  "SNOW",
]);

function publicUnitStatsForViewerV7(
  input: PublicUnitStatsV7,
  isOwner: boolean,
  positionExplored: boolean,
  visibleUnitIds: ReadonlySet<UnitId>,
): PublicUnitStatsV7 {
  // The Mind Control revision: a controlled unit's Brain is named only when
  // the viewer can see it (the Plague-source precedent).
  const control = input.mindControl ?? null;
  const stats: PublicUnitStatsV7 =
    control === null ||
    control.brainUnitId === null ||
    visibleUnitIds.has(control.brainUnitId)
      ? input
      : { ...input, mindControl: { ...control, brainUnitId: null } };
  const statuses = isOwner
    ? stats.statuses
    : stats.statuses.filter((status) => status.startsWith("Inspired:"));
  if (positionExplored) return { ...stats, statuses };
  return {
    ...stats,
    statuses,
    stats: stats.stats.map((entry) => {
      const positionCanModify = entry.id === "SIGHT" || entry.id === "DEFENSE";
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
      ["WINDMILL", "SAWMILL", "FORGE", "WORKSHOP"].includes(
        contribution.source.improvement,
      ) &&
      state.cities.some(
        (city) => city.id === contribution.cityId && city.ownerId === playerId,
      )
        ? Math.max(maximum, contribution.amount)
        : maximum,
    0,
  );
  const revision21Counts = revision21AchievementCountsV7(state, playerId);
  // Revision 19 section 9.7: an Egg does not count until it hatches.
  const roles = new Set(
    state.units.flatMap((unit) =>
      unit.ownerId === playerId &&
      unit.hp > 0 &&
      unit.form !== "EGG" &&
      unitRoleRuleV7(state, unit).cost !== null
        ? [unit.role]
        : [],
    ),
  );
  return [
    {
      achievement: "EXPLORER",
      currentExploredTiles:
        state.players.find((player) => player.id === playerId)?.explored
          .length ?? 0,
      requiredExploredTiles: explorerTilesRequiredV7(state.board),
    },
    {
      achievement: "ENGINEER",
      currentMaximumOutput,
      requiredOutput: ENGINEER_MILL_OUTPUT_V7,
    },
    {
      achievement: "MUSTER",
      currentDistinctTrainableRoles: roles.size,
      requiredDistinctTrainableRoles: MUSTER_KINDS_V7,
    },
    ...REVISION_21_ACHIEVEMENT_IDS_V7.map((achievement) => ({
      achievement,
      current: revision21Counts[achievement],
      required: REVISION_21_ACHIEVEMENT_REQUIRED_V7[achievement],
    })),
  ];
}

export function publicResourceV7(
  tile: {
    readonly terrain: TerrainIdV7;
    readonly resource: ResourceIdV7 | null;
    readonly improvement?: ImprovementIdV7 | null;
  },
  technologies: readonly string[],
): PublicResourceV7 {
  if (
    tile.resource !== null &&
    !isResourceRevealedV7(tile.resource, technologies)
  )
    return null;
  // Revision 12: a resource kept under an improvement is hidden while the
  // improvement stands. Ports and Shipyards still share visible Fish/Pearls.
  const improvement = tile.improvement ?? null;
  if (
    improvement !== null &&
    improvement !== "PORT" &&
    improvement !== "SHIPYARD"
  )
    return null;
  return tile.resource;
}

function isValued(
  improvement: ImprovementIdV7,
): improvement is PublicImprovementValueV7["improvement"] {
  return [
    "WINDMILL",
    "SAWMILL",
    "FORGE",
    "WORKSHOP",
    "MARKET",
    "MONUMENT",
    "SHIPYARD",
  ].includes(improvement);
}
function tileFortificationLevel(
  state: GameStateV7,
  at: CoordV7,
  territory: GameStateV7["cities"][number],
): number {
  const tile = state.board.tiles[at.y * state.board.width + at.x];
  // Tuning 4: a Field Defense is two levels.
  let level = tile?.fieldDefense ? FIELD_DEFENSE_FORTIFICATION_LEVELS_V7 : 0;
  if (same(territory.at, at)) {
    if (territory.rewards.some((reward) => reward.reward === "WALLS"))
      level += 2;
  }
  return level;
}
function countBy(values: readonly PlayerId[]): Map<PlayerId, number> {
  const result = new Map<PlayerId, number>();
  for (const value of values) result.set(value, (result.get(value) ?? 0) + 1);
  return result;
}
function neighbors8(width: number, height: number, at: CoordV7): CoordV7[] {
  const result: CoordV7[] = [];
  for (let y = at.y - 1; y <= at.y + 1; y += 1)
    for (let x = at.x - 1; x <= at.x + 1; x += 1)
      if (
        (x !== at.x || y !== at.y) &&
        x >= 0 &&
        y >= 0 &&
        x < width &&
        y < height
      )
        result.push({ x, y });
  return result;
}
const key = (at: CoordV7) => `${at.y},${at.x}`;
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
