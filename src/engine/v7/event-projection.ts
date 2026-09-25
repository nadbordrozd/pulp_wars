import { deepFreeze } from "../model/freeze";
import type { PlayerId, UnitId } from "../model/ids";
import type {
  DomainEventV7,
  PlayerEventEnvelopeV7,
  PlayerEventV7,
} from "./events";
import { detectionCoversCoordV7, isUnitVisibleToPlayerV7 } from "./observation";
import type { CoordV7, GameStateV7, UnitStateV7 } from "./types";
import { viewForV7 } from "./view";

/** Pure canonical-to-player projection. Canonical batches stay authority-only. */
export function projectEventsV7(
  beforeState: GameStateV7,
  afterState: GameStateV7,
  viewerId: PlayerId,
  events: readonly DomainEventV7[],
): PlayerEventEnvelopeV7 {
  viewForV7(beforeState, viewerId);
  viewForV7(afterState, viewerId);
  const beforeVisible = visibility(beforeState, viewerId);
  const afterVisible = visibility(afterState, viewerId);
  const beforeUnitIds = new Set(beforeState.units.map((unit) => unit.id));
  const visiblyCreatedUnitIds = new Set<UnitId>();
  for (const event of events)
    if (
      (event.kind === "UNIT_TRAINED" ||
        event.kind === "NAVAL_UNIT_TRAINED" ||
        event.kind === "UNIT_REWARD_GRANTED") &&
      eventVisible(
        beforeState,
        afterState,
        viewerId,
        event,
        beforeVisible,
        afterVisible,
      )
    )
      visiblyCreatedUnitIds.add(event.unitId);
  const needsReveal = (unitId: UnitId): boolean =>
    !beforeVisible.has(unitId) &&
    afterVisible.has(unitId) &&
    (beforeUnitIds.has(unitId) || !visiblyCreatedUnitIds.has(unitId));
  const revealed = new Set<UnitId>();
  const concealed = new Set<UnitId>();
  const projected: PlayerEventV7[] = [];

  for (const event of events) {
    if (event.kind === "WINDMILL_HEALING_RESOLVED") {
      if (event.playerId === viewerId) projected.push(event);
      else if (coordVisible(afterState, afterState, viewerId, event.at)) {
        const results = event.results.filter((result) =>
          afterVisible.has(result.unitId),
        );
        if (results.length > 0) projected.push({ ...event, results });
      }
      continue;
    }
    const ids = unitIds(event);
    if (event.kind === "UNIT_MOVE_INTERRUPTED")
      for (const unit of afterState.units)
        if (needsReveal(unit.id))
          reveal(projected, revealed, unit, revealReason());
    for (const id of ids) {
      if (needsReveal(id)) {
        const unit = afterState.units.find((candidate) => candidate.id === id);
        if (unit !== undefined)
          reveal(projected, revealed, unit, revealReason());
      }
    }
    if (
      event.kind === "COMBAT_RESOLVED" &&
      ids.some((id) => !beforeVisible.has(id) && !afterVisible.has(id))
    ) {
      const ownedSplash = event.preview.splash.filter(
        (entry) =>
          beforeState.units.find((unit) => unit.id === entry.unitId)
            ?.ownerId === viewerId,
      );
      if (ownedSplash.length > 0)
        projected.push({
          kind: "COMBAT_SPLASH_DAMAGE",
          splash: ownedSplash,
        });
      continue;
    }
    const visible = eventVisible(
      beforeState,
      afterState,
      viewerId,
      event,
      beforeVisible,
      afterVisible,
    );
    if (visible)
      projected.push(
        projectEventPayload(beforeState, afterState, viewerId, event),
      );
  }

  for (const unit of afterState.units) {
    if (needsReveal(unit.id)) reveal(projected, revealed, unit, revealReason());
  }
  for (const unit of beforeState.units) {
    if (
      beforeVisible.has(unit.id) &&
      !afterVisible.has(unit.id) &&
      afterState.units.some((candidate) => candidate.id === unit.id) &&
      !concealed.has(unit.id)
    ) {
      projected.push({
        kind: "UNIT_CONCEALED",
        unitId: unit.id,
        lastSeenAt: unit.at,
      });
      concealed.add(unit.id);
    }
  }
  return deepFreeze({
    format: "pulp-wars-player-events",
    version: 7,
    viewerId,
    commandIndex: afterState.commandIndex,
    events: projected,
  });
}

function eventVisible(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  event: DomainEventV7,
  beforeVisible: ReadonlySet<UnitId>,
  afterVisible: ReadonlySet<UnitId>,
): boolean {
  const ids = unitIds(event);
  if (
    ids.length > 0 &&
    ids.some((id) => !beforeVisible.has(id) && !afterVisible.has(id))
  )
    return false;
  switch (event.kind) {
    case "TURN_STARTED":
    case "INCOME_AWARDED":
    case "INCOME_PREVIEWED":
    case "TECH_RESEARCHED":
      return event.playerId === viewerId;
    case "TILES_REVEALED":
      return event.playerId === viewerId;
    case "PORT_BLOCKADE_CHANGED":
    case "SEA_NETWORK_CHANGED":
      return event.playerId === viewerId;
    case "FRUIT_HARVESTED":
    case "GAME_HUNTED":
    case "ECONOMIC_BUILDING_BUILT":
    case "FOREST_CLEARED":
    case "FOREST_REPLANTED":
    case "FOREST_CULTIVATED":
    case "MOUNTAIN_BLASTED":
    case "SHIPYARD_BUILT":
    case "ROAD_BUILT":
    case "FIELD_DEFENSE_BUILT":
      return (
        event.playerId === viewerId ||
        coordVisible(before, after, viewerId, event.at)
      );
    case "IMPROVEMENT_PILLAGED":
      return ids.every((id) => beforeVisible.has(id) || afterVisible.has(id));
    case "UNIT_DISBANDED":
    case "UNIT_WAITED":
      return event.playerId === viewerId;
    case "WOUNDED_TENDED":
      return (
        before.units.find((unit) => unit.id === event.captainId)?.ownerId ===
          viewerId ||
        after.units.find((unit) => unit.id === event.captainId)?.ownerId ===
          viewerId
      );
    case "WINDMILL_HEALING_RESOLVED":
      return event.playerId === viewerId;
    case "UNIT_TRAINED":
    case "UNIT_REWARD_GRANTED":
      return event.playerId === viewerId;
    case "UNIT_SPAWN_DISPLACED":
      return (
        event.playerId === viewerId ||
        (coordVisible(before, after, viewerId, event.from) &&
          (event.to === null ||
            coordVisible(before, after, viewerId, event.to)))
      );
    case "TREASURE_CAPTURED":
      return event.playerId === viewerId;
    case "SPOILS_AWARDED":
    case "CITY_REWARD_AUTOMATICALLY_GRANTED":
    case "ACHIEVEMENT_UNLOCKED":
      return event.playerId === viewerId;
    case "MONUMENT_BUILT":
      return coordVisible(before, after, viewerId, event.at);
    case "CITY_REWARD_QUEUED":
    case "CITY_ECONOMY_CHANGED":
    case "ECONOMIC_BUILDING_REMOVED":
      return cityOwner(before, after, event.cityId) === viewerId;
    case "CITY_TERRITORY_EXPANDED":
    case "LAND_GRANTED":
      return event.playerId === viewerId;
    case "FIELD_DEFENSE_DESTROYED":
      return coordVisible(before, after, viewerId, event.at);
    case "PLAYER_ELIMINATED":
    case "MATCH_ENDED":
    case "CITY_CAPTURED":
      return true;
    default:
      if ("cityId" in event)
        return cityVisible(before, after, viewerId, event.cityId);
      return (
        ids.length === 0 ||
        ids.every((id) => beforeVisible.has(id) || afterVisible.has(id))
      );
  }
}

function unitIds(event: DomainEventV7): readonly UnitId[] {
  switch (event.kind) {
    case "COMBAT_RESOLVED":
      return [event.preview.attackerId, event.preview.targetUnitId];
    case "UNITS_RALLIED":
      return [event.captainId, ...event.unitIds];
    case "WOUNDED_TENDED":
      return [event.captainId, ...event.results.map((result) => result.unitId)];
    case "WINDMILL_HEALING_RESOLVED":
      return event.results.map((result) => result.unitId);
    case "UNIT_PUSHED":
      return [event.sourceUnitId, event.targetUnitId];
    case "UNIT_SPAWN_DISPLACED":
      return [event.spawnedUnitId, event.displacedUnitId];
    default:
      return "unitId" in event ? [event.unitId] : [];
  }
}

function projectEventPayload(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  event: DomainEventV7,
): PlayerEventV7 {
  if (event.kind === "MONUMENT_BUILT") {
    const cityId = event.cityId;
    const currentOwner = after.cities.find(
      (city) => city.id === cityId,
    )?.ownerId;
    return currentOwner === viewerId
      ? { ...event, visibility: "FULL" }
      : {
          kind: "MONUMENT_BUILT",
          visibility: "BUILDING_ONLY",
          cityId: event.cityId,
          at: event.at,
          populationAdded: 3,
        };
  }
  if (
    event.kind === "ECONOMIC_BUILDING_REMOVED" ||
    event.kind === "IMPROVEMENT_PILLAGED"
  ) {
    const tile = viewForV7(after, viewerId).board.tiles[
      event.at.y * after.board.width + event.at.x
    ];
    const visible = tile?.explored === true ? tile.resource : null;
    const resourceRestored =
      visible === "FERTILE_GROUND" ||
      visible === "ORE" ||
      visible === "UNKNOWN_RESOURCE"
        ? visible
        : null;
    return { ...event, resourceRestored };
  }
  if (event.kind === "COMBAT_RESOLVED") {
    const splash = event.preview.splash.filter((entry) => {
      const unit = before.units.find(
        (candidate) => candidate.id === entry.unitId,
      );
      return (
        unit?.ownerId === viewerId ||
        visibility(before, viewerId).has(entry.unitId)
      );
    });
    event = { ...event, preview: { ...event.preview, splash } };
  }
  if (event.kind !== "COMBAT_RESOLVED" || event.preview.push !== "BLOCKED")
    return event;
  const attacker = before.units.find(
    (unit) => unit.id === event.preview.attackerId,
  );
  const defender = before.units.find(
    (unit) => unit.id === event.preview.targetUnitId,
  );
  if (
    attacker === undefined ||
    defender === undefined ||
    attacker.ownerId !== viewerId ||
    event.preview.defenderDies ||
    attacker.role !== "JUGGERNAUT"
  )
    return event;
  const behind = {
    x: defender.at.x * 2 - attacker.at.x,
    y: defender.at.y * 2 - attacker.at.y,
  };
  const view = viewForV7(before, viewerId);
  const tile =
    behind.x >= 0 &&
    behind.y >= 0 &&
    behind.x < view.board.width &&
    behind.y < view.board.height
      ? view.board.tiles[behind.y * view.board.width + behind.x]
      : undefined;
  if (
    tile?.explored !== true ||
    tile.site !== null ||
    view.units.some(
      (unit) => unit.id !== defender.id && same(unit.at, behind),
    ) ||
    detectionCoversCoordV7(before, viewerId, behind)
  )
    return event;
  return {
    kind: "COMBAT_RESOLVED",
    preview: { ...event.preview, push: "UNKNOWN_BEHIND_FOG" },
  };
}

function visibility(
  state: GameStateV7,
  viewerId: PlayerId,
): ReadonlySet<UnitId> {
  return new Set(
    state.units
      .filter((unit) => isUnitVisibleToPlayerV7(state, viewerId, unit))
      .map((unit) => unit.id),
  );
}

function reveal(
  output: PlayerEventV7[],
  revealed: Set<UnitId>,
  unit: Pick<UnitStateV7, "id" | "at">,
  reason: string,
): void {
  if (revealed.has(unit.id)) return;
  output.push({ kind: "UNIT_REVEALED", unitId: unit.id, at: unit.at, reason });
  revealed.add(unit.id);
}

function revealReason(): string {
  return "DETECTED";
}
function cityOwner(
  before: GameStateV7,
  after: GameStateV7,
  cityId: number,
): PlayerId | undefined {
  return (
    after.cities.find((city) => city.id === cityId)?.ownerId ??
    before.cities.find((city) => city.id === cityId)?.ownerId
  );
}
function cityVisible(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  cityId: number,
): boolean {
  return (
    viewForV7(before, viewerId).cities.some((city) => city.id === cityId) ||
    viewForV7(after, viewerId).cities.some((city) => city.id === cityId)
  );
}
function coordVisible(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  at: CoordV7,
): boolean {
  return [before, after].some((state) =>
    state.players
      .find((player) => player.id === viewerId)
      ?.explored.some((known) => same(known, at)),
  );
}
const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
