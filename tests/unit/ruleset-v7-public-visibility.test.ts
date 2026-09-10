import { describe, expect, it } from "vitest";
import {
  createInitialMapStateV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerId,
  type UnitStateV7,
} from "../../src/engine/index";
import { checkedV7, setupV7 } from "../fixtures/v7-builders";

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  healed: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 durable public visibility", () => {
  it("projects overlapping detection and exposure without unrelated details", () => {
    const { state, source, subject, thirdPlayerId } = visibilityScenario();
    const viewer = source.ownerId;
    const view = viewForV7(state, viewer);
    expect(unit(view, subject.id).visibility).toEqual({
      detection: {
        kind: "DETECTED",
        breakCondition: "OUTSIDE_ALL_LEGAL_DETECTOR_RANGE",
      },
      exposures: [
        {
          reason: "ATTACK",
          boundary: {
            kind: "ANCHOR_NEXT_ACCEPTED_END_TURN",
            anchorPlayerId: viewer,
            round: { known: true, value: state.round },
          },
        },
      ],
    });

    const ownerView = viewForV7(state, subject.ownerId);
    expect(unit(ownerView, subject.id).visibility).toEqual({
      concealment: "OWNER_CAPABILITY",
      exposures: [
        expect.objectContaining({
          reason: "ATTACK",
          boundary: expect.objectContaining({ anchorPlayerId: viewer }),
        }),
      ],
    });
    expect(
      ownerView.units.some((candidate) => candidate.id === source.id),
    ).toBe(false);

    const thirdView = viewForV7(state, thirdPlayerId);
    expect(unit(thirdView, subject.id).visibility).toEqual({
      detection: {
        kind: "DETECTED",
        breakCondition: "OUTSIDE_ALL_LEGAL_DETECTOR_RANGE",
      },
    });
    expect(JSON.stringify(unit(thirdView, subject.id))).not.toMatch(
      /anchorPlayerId|MARK_RESOLVES|sourceUnitId|targetUnitId/,
    );
  });

  it("derives earlier, current, and later anchor End Turn rounds from current state", () => {
    const { state, subject } = visibilityScenario();
    const hostileAnchors = state.turnOrder
      .map((anchorPlayerId, index) => ({ anchorPlayerId, index }))
      .filter(({ anchorPlayerId }) => anchorPlayerId !== subject.ownerId);
    const current = required(hostileAnchors[0], "current anchor missing");
    const earlier = required(
      hostileAnchors.find(({ index }) => index < state.turnOrder.length - 1),
      "earlier anchor missing",
    );
    const later = required(
      hostileAnchors.find(({ index }) => index > 0),
      "later anchor missing",
    );
    for (const [anchor, activeSeatIndex, expectedRound] of [
      [current, current.index, state.round],
      [earlier, earlier.index + 1, state.round + 1],
      [later, later.index - 1, state.round],
    ] as const) {
      const anchored = checkedV7({
        ...state,
        activeSeatIndex,
        saboteurExposures: [
          {
            unitId: subject.id,
            anchorPlayerId: anchor.anchorPlayerId,
            reason: "PILLAGE",
            clearsAtAnchorNextEndTurn: true,
          },
        ],
      });
      expect(
        unit(viewForV7(anchored, subject.ownerId), subject.id).visibility
          ?.exposures?.[0]?.boundary.round,
      ).toEqual({ known: true, value: expectedRound });
    }
  });

  it("shares only applicable exposure records with an ally that has no shared fog", () => {
    const { state, source } = visibilityScenario();
    const humanId = state.humanPlayerId;
    const aiPlayers = state.players.filter((player) => player.id !== humanId);
    const anchor = required(aiPlayers[0], "anchor missing");
    const ally = required(aiPlayers[1], "ally missing");
    const cooperative = checkedV7({
      ...state,
      setup: { ...state.setup, aiMode: "COOPERATIVE" },
      units: state.units.map((unit) =>
        unit.id === source.id
          ? {
              ...unit,
              role: "SABOTEUR" as const,
              hp: 10,
              maxHp: 10,
              blackoutEligibleRound: 1,
            }
          : unit,
      ),
      saboteurExposures: [
        {
          unitId: source.id,
          anchorPlayerId: anchor.id,
          reason: "BLACKOUT",
          clearsAtAnchorNextEndTurn: true,
        },
      ],
    });
    expect(
      unit(viewForV7(cooperative, ally.id), source.id).visibility?.exposures,
    ).toEqual([
      expect.objectContaining({
        reason: "BLACKOUT",
        boundary: expect.objectContaining({ anchorPlayerId: anchor.id }),
      }),
    ]);
  });

  it("does not expose a hidden hostile detector or an unrelated exposure anchor", () => {
    const { state, source, subject, thirdPlayerId } = visibilityScenario();
    const viewer = subject.ownerId;
    const far = farCoordinate(state, subject.at, [source.at]);
    const base = checkedV7({
      ...state,
      saboteurExposures: [],
      players: state.players.map((player) =>
        player.id === viewer
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !same(at, source.at) && !same(at, far),
              ),
            }
          : player,
      ),
      units: state.units.map((unit) =>
        unit.id === source.id
          ? {
              ...unit,
              role: "SCOUT" as const,
              hp: 10,
              maxHp: 10,
            }
          : unit,
      ),
    });
    const moved = checkedV7({
      ...base,
      units: base.units.map((unit) =>
        unit.id === source.id ? { ...unit, at: far } : unit,
      ),
    });
    expect(viewForV7(base, viewer)).toEqual(viewForV7(moved, viewer));

    const unrelated = checkedV7({
      ...state,
      saboteurExposures: [
        ...state.saboteurExposures,
        {
          unitId: subject.id,
          anchorPlayerId: thirdPlayerId,
          reason: "PILLAGE" as const,
          clearsAtAnchorNextEndTurn: true as const,
        },
      ].sort(
        (left, right) =>
          left.unitId - right.unitId ||
          left.anchorPlayerId - right.anchorPlayerId,
      ),
    });
    expect(viewForV7(state, source.ownerId)).toEqual(
      viewForV7(unrelated, source.ownerId),
    );
  });

  it("removes detection independently while exposure keeps visibility", () => {
    const { state, source, subject } = visibilityScenario();
    const viewer = source.ownerId;
    const rangeTwo = coordinateAtDistance(state, subject.at, 2, [source.at]);
    const moved = checkedV7({
      ...state,
      units: state.units.map((unit) =>
        unit.id === source.id ? { ...unit, at: rangeTwo } : unit,
      ),
    });
    expect(
      unit(viewForV7(state, viewer), subject.id).visibility,
    ).toHaveProperty("detection");
    expect(unit(viewForV7(moved, viewer), subject.id).visibility).toEqual({
      exposures: unit(viewForV7(state, viewer), subject.id).visibility
        ?.exposures,
    });

    const concealed = checkedV7({
      ...moved,
      saboteurExposures: [],
    });
    expect(
      viewForV7(concealed, viewer).units.some(
        (candidate) => candidate.id === subject.id,
      ),
    ).toBe(false);
  });

  it("makes unexplored positional stats observation-equivalent and keeps ordinary defense exact", () => {
    const { state, source, subject } = visibilityScenario();
    const viewer = source.ownerId;
    const hidden = hiddenFrom(state, viewer, subject.at);
    const mountain = withTerrain(hidden, subject.at, "MOUNTAIN");
    const grass = withTerrain(hidden, subject.at, "GRASS");
    const targetTurn = (input: GameStateV7) =>
      checkedV7({
        ...input,
        activeSeatIndex: input.turnOrder.indexOf(viewer),
      });
    const mountainView = viewForV7(targetTurn(mountain), viewer);
    const grassView = viewForV7(targetTurn(grass), viewer);
    expect(mountainView).toEqual(grassView);

    const stats = required(
      mountainView.unitStats.find((entry) => entry.unitId === subject.id),
      "subject stats missing",
    );
    expect(stat(stats, "SIGHT")).toMatchObject({
      modifiers: [],
      total: { numerator: 1, denominator: 1 },
      visibility: "BASE_ONLY",
    });
    expect(stat(stats, "DEFENSE")).toMatchObject({
      modifiers: [],
      total: { numerator: 1, denominator: 1 },
      visibility: "BASE_ONLY",
    });
    expect(
      queryCombatPreviewV7(mountainView, source.id, subject.id),
    ).toBeNull();
  });

  it("does not treat a hidden-position BASE_ONLY defense as an exact combat preview", () => {
    const { state, subject, thirdPlayerId } = visibilityScenario();
    const attacker = required(
      state.units.find((unit) => unit.ownerId === thirdPlayerId),
      "attacker missing",
    );
    const thirdTurn = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(thirdPlayerId),
      players: state.players.map((player) =>
        player.id === thirdPlayerId
          ? {
              ...player,
              explored: state.board.tiles.map((tile) => tile.at),
            }
          : player,
      ),
    });
    const exactView = viewForV7(thirdTurn, thirdPlayerId);
    expect(
      queryCombatPreviewV7(exactView, attacker.id, subject.id),
    ).not.toBeNull();
    const hidden = hiddenFrom(thirdTurn, thirdPlayerId, subject.at);
    const view = viewForV7(hidden, thirdPlayerId);
    expect(statFor(view, subject.id, "DEFENSE")).toMatchObject({
      visibility: "BASE_ONLY",
    });
    expect(queryPlayerCommandsV7(view)).toContainEqual({
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: subject.id,
    });
    expect(queryCombatPreviewV7(view, attacker.id, subject.id)).toBeNull();
  });

  it("keeps a maximal-round state projectable when the numeric boundary overflows", () => {
    const { state, subject } = visibilityScenario();
    const activeSeatIndex = 1;
    const anchorPlayerId = required(state.turnOrder[0], "anchor missing");
    const candidate = {
      ...state,
      round: Number.MAX_SAFE_INTEGER,
      activeSeatIndex,
      saboteurExposures: [
        {
          unitId: subject.id,
          anchorPlayerId,
          reason: "PILLAGE" as const,
          clearsAtAnchorNextEndTurn: true as const,
        },
      ],
    };
    const parsed = required(parseGameStateV7(candidate), "max state rejected");
    expect(parsed.round).toBe(Number.MAX_SAFE_INTEGER);
    expect(
      unit(viewForV7(parsed, subject.ownerId), subject.id).visibility
        ?.exposures?.[0]?.boundary,
    ).toEqual({
      kind: "ANCHOR_NEXT_ACCEPTED_END_TURN",
      anchorPlayerId,
      round: { known: false, reason: "SAFE_INTEGER_OVERFLOW" },
    });
  });
});

function visibilityScenario(): {
  readonly state: GameStateV7;
  readonly source: UnitStateV7;
  readonly subject: UnitStateV7;
  readonly thirdPlayerId: PlayerId;
} {
  const created = createInitialMapStateV7(setupV7(4_731, 2));
  if (!created.ok) throw new Error(created.error.code);
  const human = required(
    created.state.players.find(
      (player) => player.id === created.state.humanPlayerId,
    ),
    "human missing",
  );
  const others = created.state.players.filter(
    (player) => player.id !== human.id,
  );
  const targetOwner = required(others[0], "target owner missing");
  const third = required(others[1], "third player missing");
  const sourceBase = required(
    created.state.units.find((unit) => unit.ownerId === human.id),
    "source missing",
  );
  const subjectBase = required(
    created.state.units.find((unit) => unit.ownerId === targetOwner.id),
    "subject missing",
  );
  const thirdBase = required(
    created.state.units.find((unit) => unit.ownerId === third.id),
    "third detector missing",
  );
  const [sourceAt, subjectAt, thirdAt] = openLine(created.state);
  const source: UnitStateV7 = {
    ...sourceBase,
    role: "FIGHTER",
    at: sourceAt,
    hp: 10,
    maxHp: 10,
    activation: READY,
    blackoutEligibleRound: null,
  };
  const subject: UnitStateV7 = {
    ...subjectBase,
    role: "SABOTEUR",
    at: subjectAt,
    hp: 10,
    maxHp: 10,
    activation: READY,
    blackoutEligibleRound: 1,
  };
  const thirdDetector: UnitStateV7 = {
    ...thirdBase,
    role: "FIGHTER",
    at: thirdAt,
    hp: 10,
    maxHp: 10,
    activation: READY,
    blackoutEligibleRound: null,
  };
  const state = checkedV7({
    ...created.state,
    commandIndex: 1,
    activeSeatIndex: created.state.turnOrder.indexOf(human.id),
    players: created.state.players.map((player) => ({
      ...player,
      explored:
        player.id === human.id
          ? created.state.board.tiles
              .map((tile) => tile.at)
              .filter((at) => !same(at, subjectAt))
          : player.id === third.id
            ? [
                ...player.explored.filter(
                  (at) => !same(at, subjectAt) && !same(at, thirdAt),
                ),
                subjectAt,
                thirdAt,
              ].sort((left, right) => left.y - right.y || left.x - right.x)
            : player.explored.filter((at) => !same(at, sourceAt)),
    })),
    units: [source, subject, thirdDetector].sort(
      (left, right) => left.id - right.id,
    ),
    saboteurExposures: [
      {
        unitId: subject.id,
        anchorPlayerId: human.id,
        reason: "ATTACK",
        clearsAtAnchorNextEndTurn: true,
      },
    ],
  });
  return { state, source, subject, thirdPlayerId: third.id };
}

function openLine(state: GameStateV7): readonly [CoordV7, CoordV7, CoordV7] {
  for (const tile of state.board.tiles) {
    const line = [
      tile.at,
      { x: tile.at.x + 1, y: tile.at.y },
      { x: tile.at.x + 2, y: tile.at.y },
    ] as const;
    if (
      line.every((at) => {
        const candidate = state.board.tiles[at.y * state.board.width + at.x];
        return candidate?.site === null && candidate.terrain !== "MOUNTAIN";
      }) &&
      line.every(
        (at) =>
          !state.treasureChests.some((chest) => same(chest, at)) &&
          !state.cities.some((city) => same(city.at, at)),
      )
    )
      return line;
  }
  throw new Error("open line missing");
}

function hiddenFrom(
  state: GameStateV7,
  viewerId: PlayerId,
  at: CoordV7,
): GameStateV7 {
  return checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === viewerId
        ? {
            ...player,
            explored: player.explored.filter((known) => !same(known, at)),
          }
        : player,
    ),
  });
}

function withTerrain(
  state: GameStateV7,
  at: CoordV7,
  terrain: "GRASS" | "MOUNTAIN",
): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        same(tile.at, at) ? { ...tile, terrain } : tile,
      ),
    },
  });
}

function coordinateAtDistance(
  state: GameStateV7,
  origin: CoordV7,
  distance: number,
  excluded: readonly CoordV7[],
): CoordV7 {
  return required(
    state.board.tiles.find(
      (tile) =>
        chebyshev(tile.at, origin) === distance &&
        tile.site === null &&
        !excluded.some((at) => same(at, tile.at)) &&
        !state.units.some(
          (unit) =>
            !excluded.some((at) => same(at, unit.at)) && same(unit.at, tile.at),
        ) &&
        !state.treasureChests.some((chest) => same(chest, tile.at)),
    )?.at,
    "coordinate at distance missing",
  );
}

function farCoordinate(
  state: GameStateV7,
  origin: CoordV7,
  excluded: readonly CoordV7[],
): CoordV7 {
  return required(
    state.board.tiles.find(
      (tile) =>
        chebyshev(tile.at, origin) > 2 &&
        tile.site === null &&
        !excluded.some((at) => same(at, tile.at)) &&
        !state.units.some((unit) => same(unit.at, tile.at)) &&
        !state.treasureChests.some((chest) => same(chest, tile.at)),
    )?.at,
    "far coordinate missing",
  );
}

function unit(view: ReturnType<typeof viewForV7>, unitId: UnitStateV7["id"]) {
  return required(
    view.units.find((entry) => entry.id === unitId),
    "public unit missing",
  );
}

function statFor(
  view: ReturnType<typeof viewForV7>,
  unitId: UnitStateV7["id"],
  statId: "DEFENSE" | "SIGHT",
) {
  const stats = required(
    view.unitStats.find((entry) => entry.unitId === unitId),
    "public stats missing",
  );
  return stat(stats, statId);
}

function stat(
  stats: ReturnType<typeof viewForV7>["unitStats"][number],
  statId: "DEFENSE" | "SIGHT",
) {
  return required(
    stats.stats.find((entry) => entry.id === statId),
    "stat missing",
  );
}

function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

const same = (left: CoordV7, right: CoordV7) =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7) =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
