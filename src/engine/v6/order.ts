import {
  CARDINAL_DIRECTION_ORDER_V6,
  ECONOMIC_IMPROVEMENT_IDS,
  FACTION_IDS_V6,
  FACTION_TREE_IDS,
  RESOURCE_IDS,
  TERRAIN_IDS_V6,
  type CardinalDirectionV6,
  type EconomicImprovementId,
  type FactionIdV6,
  type FactionTreeId,
  type ResourceId,
  type TerrainIdV6,
} from "./types";

export function compareFactionIdsV6(
  left: FactionIdV6,
  right: FactionIdV6,
): number {
  return compareOrdinal(FACTION_IDS_V6, left, right);
}

export function compareFactionTreeIdsV6(
  left: FactionTreeId,
  right: FactionTreeId,
): number {
  return compareOrdinal(FACTION_TREE_IDS, left, right);
}

export function compareTerrainIdsV6(
  left: TerrainIdV6,
  right: TerrainIdV6,
): number {
  return compareOrdinal(TERRAIN_IDS_V6, left, right);
}

export function compareResourceIdsV6(
  left: ResourceId,
  right: ResourceId,
): number {
  return compareOrdinal(RESOURCE_IDS, left, right);
}

export function compareEconomicImprovementIdsV6(
  left: EconomicImprovementId,
  right: EconomicImprovementId,
): number {
  return compareOrdinal(ECONOMIC_IMPROVEMENT_IDS, left, right);
}

export function compareCardinalDirectionsV6(
  left: CardinalDirectionV6,
  right: CardinalDirectionV6,
): number {
  return compareOrdinal(CARDINAL_DIRECTION_ORDER_V6, left, right);
}

function compareOrdinal<T extends string>(
  order: readonly T[],
  left: T,
  right: T,
): number {
  return order.indexOf(left) - order.indexOf(right);
}
