export type PlayerId = number & { readonly __brand: "PlayerId" };
export type CityId = number & { readonly __brand: "CityId" };
export type UnitId = number & { readonly __brand: "UnitId" };
export type EntityId = CityId | UnitId;

function assertId(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${label} must be a positive safe integer`);
  }
}

export function playerId(value: number): PlayerId {
  assertId(value, "PlayerId");
  return value as PlayerId;
}

export function cityId(value: number): CityId {
  assertId(value, "CityId");
  return value as CityId;
}

export function unitId(value: number): UnitId {
  assertId(value, "UnitId");
  return value as UnitId;
}

export interface AllocatedEntityId<T extends EntityId> {
  readonly id: T;
  readonly nextEntityId: number;
}

export function allocateCityId(
  nextEntityId: number,
): AllocatedEntityId<CityId> {
  return allocate(nextEntityId, cityId);
}

export function allocateUnitId(
  nextEntityId: number,
): AllocatedEntityId<UnitId> {
  return allocate(nextEntityId, unitId);
}

function allocate<T extends EntityId>(
  nextEntityId: number,
  brand: (value: number) => T,
): AllocatedEntityId<T> {
  const id = brand(nextEntityId);
  const following = nextEntityId + 1;
  assertId(following, "nextEntityId");
  return { id, nextEntityId: following };
}
