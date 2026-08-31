import type { CityId } from "../model/ids";
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
import { arePlayersAlliedV6, resolveCityGrowthV6 } from "./economy";
import {
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
  TechnologyId,
  TileStateV6,
  UnitRoleId,
} from "./types";
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
  readonly capitalRoadConnected: false;
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
    activeId !== view.viewer.id ||
    view.pendingChoices.length > 0
  ) {
    return [];
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
  }
  for (const unit of view.units) {
    if (publicCaptureIsLegal(view, unit.id)) {
      commands.push({ kind: "CAPTURE", unitId: unit.id });
    }
  }
  commands.push({ kind: "END_TURN" });
  return commands.sort(compareCommandsV6);
}

export function previewEconomicV6(
  view: PlayerViewV6,
  command: CommandV6,
): EconomicPreviewResultV6 {
  if (
    !("at" in command) ||
    (!BASIC_KINDS.includes(command.kind as BasicEconomicCommandKindV6) &&
      !SPATIAL_KINDS.includes(command.kind as SpatialEconomicCommandKindV6))
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
  const cost = basic?.cost ?? spatial?.cost;
  if (cost === undefined) return { ok: false, error: "NOT_OFFERED" };
  const afterGraph = replaceGraphTile(beforeGraph, command.at, {
    resource: null,
    improvement,
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
      capitalRoadConnected: false,
      buildingLimitReached: false,
      complete: true,
    },
  };
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
