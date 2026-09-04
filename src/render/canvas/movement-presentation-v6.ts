import type {
  CommandV6,
  CoordV6,
  DomainEventV6,
  FactionIdV6,
  PlayerViewV6,
  UnitId,
  UnitRoleId,
} from "../../engine/index";

export const MOVEMENT_PRESENTATION_TIMING_V6 = Object.freeze({
  segmentMs: 120,
});

export interface MovementSpriteSnapshotV6 {
  readonly id: UnitId;
  readonly ownerId: number;
  readonly faction: FactionIdV6;
  readonly role: UnitRoleId;
  readonly at: CoordV6;
}

export interface MovementPresentationV6 {
  readonly key: string;
  readonly commandIndex: number;
  readonly motion: "FULL";
  readonly durationMs: number;
  readonly actorController: "HUMAN" | "AI";
  readonly unit: MovementSpriteSnapshotV6;
  /** Origin followed by each authoritative accepted traversal coordinate. */
  readonly path: readonly CoordV6[];
  readonly destination: CoordV6;
}

export interface MovementAnimationFrameV6 {
  readonly at: CoordV6;
  readonly segmentIndex: number;
  readonly segmentProgress: number;
  readonly complete: boolean;
}

/**
 * Builds a slide only from one accepted MOVE boundary. Both endpoints and the
 * complete accepted traversal must be public in a boundary view; hidden AI
 * movement is never reconstructed from domain facts alone.
 */
export function movementPresentationFromAcceptedBoundaryV6(
  actorId: number,
  beforeView: PlayerViewV6,
  afterView: PlayerViewV6,
  command: CommandV6,
  events: readonly DomainEventV6[],
  motion: "FULL" | "REDUCED",
): MovementPresentationV6 | null {
  if (motion === "REDUCED" || command.kind !== "MOVE") return null;
  const moved = events.find(
    (event): event is Extract<DomainEventV6, { readonly kind: "UNIT_MOVED" }> =>
      event.kind === "UNIT_MOVED" && event.unitId === command.unitId,
  );
  if (moved === undefined || moved.path.length === 0) return null;
  const beforeUnit = beforeView.units.find(
    (unit) => unit.id === command.unitId,
  );
  const afterUnit = afterView.units.find((unit) => unit.id === command.unitId);
  const faction = beforeView.players.find(
    (player) => player.id === beforeUnit?.ownerId,
  )?.faction;
  const destination = moved.path.at(-1);
  if (
    beforeUnit === undefined ||
    afterUnit === undefined ||
    faction === undefined ||
    destination === undefined ||
    !sameCoord(destination, afterUnit.at) ||
    !moved.path.every(
      (at) => isExplored(beforeView, at) || isExplored(afterView, at),
    )
  ) {
    return null;
  }
  const path = Object.freeze([beforeUnit.at, ...moved.path]);
  return Object.freeze({
    key: `${afterView.commandIndex}:move:${beforeUnit.id}`,
    commandIndex: afterView.commandIndex,
    motion: "FULL",
    durationMs: MOVEMENT_PRESENTATION_TIMING_V6.segmentMs * (path.length - 1),
    actorController:
      beforeView.players.find((player) => player.id === actorId)?.controller ??
      "AI",
    unit: Object.freeze({
      id: beforeUnit.id,
      ownerId: beforeUnit.ownerId,
      faction,
      role: beforeUnit.role,
      at: beforeUnit.at,
    }),
    path,
    destination: afterUnit.at,
  });
}

/** Pure linear, equal-time, segment-by-segment projection. */
export function movementAnimationFrameV6(
  presentation: MovementPresentationV6,
  elapsedMs: number,
): MovementAnimationFrameV6 {
  const segmentCount = presentation.path.length - 1;
  const elapsed = clamp(elapsedMs, 0, presentation.durationMs);
  if (elapsed >= presentation.durationMs) {
    return {
      at: presentation.destination,
      segmentIndex: segmentCount - 1,
      segmentProgress: 1,
      complete: true,
    };
  }
  const segmentIndex = Math.min(
    segmentCount - 1,
    Math.floor(elapsed / MOVEMENT_PRESENTATION_TIMING_V6.segmentMs),
  );
  const from = presentation.path[segmentIndex];
  const to = presentation.path[segmentIndex + 1];
  if (from === undefined || to === undefined) {
    return {
      at: presentation.destination,
      segmentIndex: segmentCount - 1,
      segmentProgress: 1,
      complete: true,
    };
  }
  const segmentProgress =
    (elapsed - segmentIndex * MOVEMENT_PRESENTATION_TIMING_V6.segmentMs) /
    MOVEMENT_PRESENTATION_TIMING_V6.segmentMs;
  return {
    at: {
      x: from.x + (to.x - from.x) * segmentProgress,
      y: from.y + (to.y - from.y) * segmentProgress,
    },
    segmentIndex,
    segmentProgress,
    complete: false,
  };
}

function isExplored(view: PlayerViewV6, at: CoordV6): boolean {
  return view.board.tiles.some(
    (tile) => tile.explored && sameCoord(tile.at, at),
  );
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
