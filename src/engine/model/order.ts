import type { Coord } from "./types";
import type { EntityId } from "./ids";

export function compareEntityIds(left: EntityId, right: EntityId): number {
  return left - right;
}

export function compareCoords(left: Coord, right: Coord): number {
  return left.y - right.y || left.x - right.x;
}

export function sortByEntityId<T extends { readonly id: EntityId }>(
  values: readonly T[],
): readonly T[] {
  return [...values].sort((left, right) => compareEntityIds(left.id, right.id));
}

export function sortCoords(values: readonly Coord[]): readonly Coord[] {
  return [...values].sort(compareCoords);
}
