import {
  ACHIEVEMENT_IDS_V7,
  BLACKOUT_PHASE_ORDER_V7,
  CARDINAL_DIRECTION_ORDER_V7,
  DOMAIN_EVENT_KIND_ORDER_V7,
  FACTION_IDS_V7,
  FACTION_TREE_IDS_V7,
  IMPROVEMENT_IDS_V7,
  PLAYER_EVENT_KIND_ORDER_V7,
  RESOURCE_IDS_V7,
  REWARD_IDS_V7,
  TECHNOLOGY_IDS_V7,
  TERRAIN_IDS_V7,
  UNIT_ROLE_IDS_V7,
} from "./types";

export const compareTerrainIdsV7 = ordinalComparator(TERRAIN_IDS_V7);
export const compareResourceIdsV7 = ordinalComparator(RESOURCE_IDS_V7);
export const compareImprovementIdsV7 = ordinalComparator(IMPROVEMENT_IDS_V7);
export const compareAchievementIdsV7 = ordinalComparator(ACHIEVEMENT_IDS_V7);
export const compareUnitRoleIdsV7 = ordinalComparator(UNIT_ROLE_IDS_V7);
export const compareTechnologyIdsV7 = ordinalComparator(TECHNOLOGY_IDS_V7);
export const compareRewardIdsV7 = ordinalComparator(REWARD_IDS_V7);
export const compareFactionIdsV7 = ordinalComparator(FACTION_IDS_V7);
export const compareFactionTreeIdsV7 = ordinalComparator(FACTION_TREE_IDS_V7);
export const compareCardinalDirectionsV7 = ordinalComparator(
  CARDINAL_DIRECTION_ORDER_V7,
);
export const compareBlackoutPhasesV7 = ordinalComparator(
  BLACKOUT_PHASE_ORDER_V7,
);
export const compareDomainEventKindsV7 = ordinalComparator(
  DOMAIN_EVENT_KIND_ORDER_V7,
);
export const comparePlayerEventKindsV7 = ordinalComparator(
  PLAYER_EVENT_KIND_ORDER_V7,
);

function ordinalComparator<T extends string>(
  order: readonly T[],
): (left: T, right: T) => number {
  return (left, right) => order.indexOf(left) - order.indexOf(right);
}
