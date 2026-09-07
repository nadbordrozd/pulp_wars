import { deepFreeze } from "../model/freeze";
import type { PlayerId, UnitId } from "../model/ids";
import { arePlayersAlliedV7 } from "./economy";
import type {
  DomainEventV7,
  PlayerEventEnvelopeV7,
  PlayerEventV7,
} from "./events";
import {
  detectionCoversCoordV7,
  isUnitVisibleToPlayerV7,
  withUnitAtForObservationV7,
} from "./observation";
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
  const revealed = new Set<UnitId>();
  const concealed = new Set<UnitId>();
  const projected: PlayerEventV7[] = [];

  for (const event of events) {
    if (event.kind === "UNIT_MOVED" || event.kind === "UNIT_PURSUED") {
      const moving =
        beforeState.units.find((unit) => unit.id === event.unitId) ??
        afterState.units.find((unit) => unit.id === event.unitId);
      if (moving?.role === "SABOTEUR" && moving.ownerId !== viewerId) {
        projectSaboteurMovement(
          beforeState,
          afterState,
          viewerId,
          event,
          moving,
          projected,
          revealed,
          concealed,
        );
        continue;
      }
    }

    const ids = unitIds(event);
    if (event.kind === "UNIT_MOVE_INTERRUPTED") {
      const contacted = afterState.units.find(
        (unit) =>
          unit.role === "SABOTEUR" &&
          (same(unit.at, event.at) ||
            (event.reason === "ZOC" && chebyshev(unit.at, event.at) === 1)) &&
          !beforeVisible.has(unit.id) &&
          afterVisible.has(unit.id),
      );
      if (contacted !== undefined)
        reveal(projected, revealed, contacted, "CONTACT");
    }
    for (const id of ids) {
      if (!beforeVisible.has(id) && afterVisible.has(id)) {
        const unit = afterState.units.find((candidate) => candidate.id === id);
        if (unit !== undefined)
          reveal(
            projected,
            revealed,
            unit,
            revealReason(afterState, viewerId, unit),
          );
      }
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
      projected.push(projectEventPayload(beforeState, viewerId, event));
    else if (
      event.kind === "DEFECTION_OFFERED" ||
      event.kind === "DEFECTION_ARMED"
    ) {
      const endpoint = viewForV7(afterState, viewerId).defectionStatuses.find(
        (status) =>
          status.visibility === "ENDPOINT" &&
          (status.endpointUnitId === event.sourceUnitId ||
            status.endpointUnitId === event.targetUnitId),
      );
      if (endpoint?.visibility === "ENDPOINT")
        projected.push({
          kind: "DEFECTION_ENDPOINT_STATUS",
          unitId: endpoint.endpointUnitId,
          phase: endpoint.phase,
        });
    }
  }

  for (const unit of afterState.units) {
    if (!beforeVisible.has(unit.id) && afterVisible.has(unit.id))
      reveal(
        projected,
        revealed,
        unit,
        revealReason(afterState, viewerId, unit),
      );
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

function projectSaboteurMovement(
  before: GameStateV7,
  after: GameStateV7,
  viewerId: PlayerId,
  event: Extract<DomainEventV7, { kind: "UNIT_MOVED" | "UNIT_PURSUED" }>,
  moving: UnitStateV7,
  output: PlayerEventV7[],
  revealed: Set<UnitId>,
  concealed: Set<UnitId>,
): void {
  const startsVisible = isUnitVisibleToPlayerV7(before, viewerId, moving);
  const visibilityByStep = event.path.map((at) =>
    isUnitVisibleToPlayerV7(
      withUnitAtForObservationV7(before, moving.id, at),
      viewerId,
      { ...moving, at },
    ),
  );
  let currentlyVisible = startsVisible;
  let lastSeenAt = moving.at;
  let segmentStart = -1;
  const flush = (endExclusive: number) => {
    if (segmentStart < 0) return;
    const path = event.path.slice(segmentStart, endExclusive);
    if (path.length === 0) return;
    if (event.kind === "UNIT_MOVED")
      output.push({ kind: "UNIT_MOVED", unitId: event.unitId, path });
    else
      output.push({
        kind: "UNIT_PURSUED",
        unitId: event.unitId,
        path,
        from:
          segmentStart === 0 && startsVisible
            ? event.from
            : (path[0] as CoordV7),
        to: path.at(-1) as CoordV7,
      });
    segmentStart = -1;
  };
  for (let index = 0; index < event.path.length; index += 1) {
    const at = event.path[index] as CoordV7;
    const stepVisible = visibilityByStep[index] === true;
    if (stepVisible) {
      if (!currentlyVisible)
        reveal(output, revealed, { ...moving, at }, "DETECTED");
      if (segmentStart < 0) segmentStart = index;
      lastSeenAt = at;
    } else if (currentlyVisible) {
      flush(index);
      output.push({
        kind: "UNIT_CONCEALED",
        unitId: moving.id,
        lastSeenAt,
      });
      concealed.add(moving.id);
      revealed.delete(moving.id);
    }
    currentlyVisible = stepVisible;
  }
  flush(event.path.length);
  const endsVisible = isUnitVisibleToPlayerV7(
    after,
    viewerId,
    after.units.find((unit) => unit.id === moving.id) ?? moving,
  );
  if (currentlyVisible && !endsVisible) {
    output.push({ kind: "UNIT_CONCEALED", unitId: moving.id, lastSeenAt });
    concealed.add(moving.id);
    revealed.delete(moving.id);
  }
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
    case "FRUIT_HARVESTED":
    case "GAME_HUNTED":
    case "ECONOMIC_BUILDING_BUILT":
    case "FOREST_CLEARED":
    case "FOREST_REPLANTED":
    case "ROAD_BUILT":
      return (
        event.playerId === viewerId ||
        coordVisible(before, after, viewerId, event.at)
      );
    case "IMPROVEMENT_PILLAGED":
      return ids.every((id) => beforeVisible.has(id) || afterVisible.has(id));
    case "UNIT_DISBANDED":
    case "UNIT_WAITED":
      return event.playerId === viewerId;
    case "UNIT_TRAINED":
    case "UNIT_REWARD_GRANTED":
      return event.playerId === viewerId;
    case "TREASURE_CAPTURED":
      return event.playerId === viewerId;
    case "SABOTEUR_EXPOSED":
      return (
        after.units.find((unit) => unit.id === event.unitId)?.ownerId ===
          viewerId ||
        event.anchorPlayerId === viewerId ||
        arePlayersAlliedV7(after, viewerId, event.anchorPlayerId)
      );
    case "DEFECTION_OFFERED":
    case "DEFECTION_ARMED":
    case "DEFECTION_RESOLVED":
      return defectionVisible(
        after,
        viewerId,
        event.sourceUnitId,
        event.targetUnitId,
      );
    case "DEFECTION_CANCELLED":
      return (
        viewForV7(before, viewerId).defectionStatuses.some(
          (status) =>
            status.visibility === "FULL" && status.markId === event.markId,
        ) ||
        viewForV7(after, viewerId).defectionStatuses.some(
          (status) =>
            status.visibility === "FULL" && status.markId === event.markId,
        )
      );
    case "BLACKOUT_PLANTED":
      return (
        event.sourceOwnerId === viewerId || event.targetOwnerId === viewerId
      );
    case "BLACKOUT_ACTIVATED":
      return fullBlackoutVisible(after, viewerId, event.cityId);
    case "BLACKOUT_RECOVERY_STARTED":
    case "BLACKOUT_RECOVERY_COMPLETED":
      return cityVisible(before, after, viewerId, event.cityId);
    case "SPOILS_AWARDED":
      return event.playerId === viewerId;
    case "CITY_REWARD_QUEUED":
    case "CITY_ECONOMY_CHANGED":
    case "ECONOMIC_BUILDING_REMOVED":
      return cityOwner(before, after, event.cityId) === viewerId;
    case "CITY_TERRITORY_EXPANDED":
      return event.playerId === viewerId;
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
    case "UNIT_HEALED":
      return [event.medicId, event.targetUnitId];
    case "UNIT_PUSHED":
      return [event.sourceUnitId, event.targetUnitId];
    case "DEFECTION_OFFERED":
    case "DEFECTION_ARMED":
    case "DEFECTION_RESOLVED":
      return [event.sourceUnitId, event.targetUnitId];
    case "BLACKOUT_PLANTED":
      return [event.sourceUnitId];
    default:
      return "unitId" in event ? [event.unitId] : [];
  }
}

function projectEventPayload(
  before: GameStateV7,
  viewerId: PlayerId,
  event: DomainEventV7,
): DomainEventV7 {
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
    !["HEAVY", "JUGGERNAUT"].includes(attacker.role)
  )
    return event;
  const behind = {
    x: defender.at.x * 2 - attacker.at.x,
    y: defender.at.y * 2 - attacker.at.y,
  };
  const view = viewForV7(before, viewerId);
  const tile = view.board.tiles[behind.y * view.board.width + behind.x];
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

function revealReason(
  state: GameStateV7,
  viewerId: PlayerId,
  unit: UnitStateV7,
): string {
  if (
    state.saboteurExposures.some(
      (entry) =>
        entry.unitId === unit.id &&
        (entry.anchorPlayerId === viewerId ||
          arePlayersAlliedV7(state, viewerId, entry.anchorPlayerId)),
    )
  )
    return "EXPOSURE";
  if (
    state.defectionMarks.some(
      (mark) => mark.sourceUnitId === unit.id || mark.targetUnitId === unit.id,
    )
  )
    return "DEFECTION";
  return "DETECTED";
}

function defectionVisible(
  state: GameStateV7,
  viewerId: PlayerId,
  sourceUnitId: UnitId,
  targetUnitId: UnitId,
): boolean {
  return viewForV7(state, viewerId).defectionStatuses.some(
    (status) =>
      status.visibility === "FULL" &&
      status.sourceUnitId === sourceUnitId &&
      status.targetUnitId === targetUnitId,
  );
}
function fullBlackoutVisible(
  state: GameStateV7,
  viewerId: PlayerId,
  cityId: number,
): boolean {
  return viewForV7(state, viewerId).blackoutStatuses.some(
    (status) => status.cityId === cityId && status.visibility === "FULL",
  );
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
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
