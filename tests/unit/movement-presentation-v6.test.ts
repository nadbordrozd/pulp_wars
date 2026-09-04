import { describe, expect, it } from "vitest";
import {
  createPlayableGameV6,
  viewForV6,
  type CommandV6,
  type CoordV6,
  type DomainEventV6,
  type PlayerViewV6,
} from "../../src/engine/index";
import {
  MOVEMENT_PRESENTATION_TIMING_V6,
  movementAnimationFrameV6,
  movementPresentationFromAcceptedBoundaryV6,
} from "../../src/render/canvas/movement-presentation-v6";

describe("ruleset-6 movement presentation", () => {
  it("derives only an accepted public MOVE and uses its authoritative traversed path", () => {
    const fixture = movementFixture();
    const presentation = movementPresentationFromAcceptedBoundaryV6(
      fixture.actorId,
      fixture.before,
      fixture.after,
      { ...fixture.command, path: [...fixture.path, { x: 10, y: 10 }] },
      fixture.events,
      "FULL",
    );

    expect(presentation).toMatchObject({
      key: `${fixture.after.commandIndex}:move:${fixture.unit.id}`,
      actorController: "HUMAN",
      durationMs: MOVEMENT_PRESENTATION_TIMING_V6.segmentMs * 2,
      unit: { id: fixture.unit.id, at: fixture.unit.at },
      path: [fixture.unit.at, ...fixture.path],
      destination: fixture.path[1],
    });
  });

  it("interpolates equal-time segments and snaps exactly to the destination", () => {
    const fixture = movementFixture();
    const presentation = movementPresentationFromAcceptedBoundaryV6(
      fixture.actorId,
      fixture.before,
      fixture.after,
      fixture.command,
      fixture.events,
      "FULL",
    );
    if (presentation === null) throw new Error("Missing movement presentation");
    const segmentMs = MOVEMENT_PRESENTATION_TIMING_V6.segmentMs;

    expect(movementAnimationFrameV6(presentation, 0)).toMatchObject({
      at: fixture.unit.at,
      segmentIndex: 0,
      segmentProgress: 0,
      complete: false,
    });
    expect(movementAnimationFrameV6(presentation, segmentMs / 2).at).toEqual(
      midpoint(fixture.unit.at, fixture.path[0] as CoordV6),
    );
    expect(movementAnimationFrameV6(presentation, segmentMs)).toMatchObject({
      at: fixture.path[0],
      segmentIndex: 1,
      segmentProgress: 0,
    });
    expect(movementAnimationFrameV6(presentation, segmentMs * 1.5).at).toEqual(
      midpoint(fixture.path[0] as CoordV6, fixture.path[1] as CoordV6),
    );
    expect(
      movementAnimationFrameV6(presentation, Number.POSITIVE_INFINITY),
    ).toEqual({
      at: fixture.path[1],
      segmentIndex: 1,
      segmentProgress: 1,
      complete: true,
    });
  });

  it("snaps without a queue for reduced motion and ignores rejection-like boundaries", () => {
    const fixture = movementFixture();
    expect(
      movementPresentationFromAcceptedBoundaryV6(
        fixture.actorId,
        fixture.before,
        fixture.after,
        fixture.command,
        fixture.events,
        "REDUCED",
      ),
    ).toBeNull();
    expect(
      movementPresentationFromAcceptedBoundaryV6(
        fixture.actorId,
        fixture.before,
        fixture.after,
        fixture.command,
        [],
        "FULL",
      ),
    ).toBeNull();
    expect(
      movementPresentationFromAcceptedBoundaryV6(
        fixture.actorId,
        fixture.before,
        fixture.after,
        { kind: "WAIT", unitId: fixture.unit.id },
        fixture.events,
        "FULL",
      ),
    ).toBeNull();
    expect(
      movementPresentationFromAcceptedBoundaryV6(
        fixture.actorId,
        fixture.before,
        { ...fixture.after, units: [] },
        fixture.command,
        fixture.events,
        "FULL",
      ),
    ).toBeNull();
  });
});

function movementFixture(): {
  readonly actorId: number;
  readonly before: PlayerViewV6;
  readonly after: PlayerViewV6;
  readonly unit: PlayerViewV6["units"][number];
  readonly path: readonly [CoordV6, CoordV6];
  readonly command: Extract<CommandV6, { readonly kind: "MOVE" }>;
  readonly events: readonly DomainEventV6[];
} {
  const created = createPlayableGameV6({
    rulesetId: "pulp-wars-poc-6",
    mapGenerationRevision: "SPATIAL_ECONOMY",
    seed: 42,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: ["ORIGINAL", "CANDY"],
  });
  if (!created.ok) throw new Error(created.error.code);
  const before = viewForV6(created.state, created.state.humanPlayerId);
  const unit = before.units.find(
    (candidate) => candidate.ownerId === before.viewer.id,
  );
  if (unit === undefined) throw new Error("Missing human unit");
  const explored = before.board.tiles
    .filter((tile) => tile.explored && !sameCoord(tile.at, unit.at))
    .map((tile) => tile.at);
  const first = explored[0];
  const second = explored[1];
  if (first === undefined || second === undefined)
    throw new Error("Missing explored movement path");
  const path = [first, second] as const;
  const command = { kind: "MOVE", unitId: unit.id, path } as const;
  const events = [{ kind: "UNIT_MOVED", unitId: unit.id, path }] as const;
  const after: PlayerViewV6 = {
    ...before,
    commandIndex: before.commandIndex + 1,
    units: before.units.map((candidate) =>
      candidate.id === unit.id ? { ...candidate, at: second } : candidate,
    ),
  };
  return {
    actorId: before.viewer.id,
    before,
    after,
    unit,
    path,
    command,
    events,
  };
}

function midpoint(left: CoordV6, right: CoordV6): CoordV6 {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}

function sameCoord(left: CoordV6, right: CoordV6): boolean {
  return left.x === right.x && left.y === right.y;
}
