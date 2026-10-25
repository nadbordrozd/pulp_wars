import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  projectPublicUnitForPolicyV7,
  publicDangerForPolicyV7,
  publicThreatenedTilesForPolicyV7,
} from "../../src/ai/v7";
import {
  NAVAL_ESCORT_HUNT_RADIUS_V7,
  NAVAL_PORT_TRIP_SLACK_V7,
  NAVAL_TRANSPORT_EXPOSED_TENTHS_V7,
  navalFleetFactsV7,
  navalFleetGoalsV7,
  navalQuickestPortsV7,
  navalTransportExposedV7,
  navalTransportMoveRejectedV7,
  type NavalToolsV7,
  type NavalTransportExposureV7,
} from "../../src/ai/v7-naval";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitId,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_PORTS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
  type NavalArenaOptionsV7,
} from "../fixtures/v7-naval-branch";

// Naval AI iteration 1 (`pulp_wars-6t3e`, docs/architecture/NORMAL_AI.md
// "Naval AI iteration 1"): hand play and a small diagnostic set on separate
// continents found half of all embarked units sunk afloat, the warships
// chasing any hostile ship in sight instead of escorting, and waves boarded
// at the Port nearest the unit whatever water lay beyond it. Each fix is
// proven here on the authored strait of `tests/fixtures/v7-naval-branch.ts`
// (rows 0 to 2 and 8 to 10 land, 3 and 7 Shallow, 4 to 6 Deep; seat 0's
// capital (5, 2) and Port (4, 3), seat 1's capital (5, 8) and Port (6, 7)).

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, seatV7(state, 0).id);
}

function idAt(state: GameStateV7, at: CoordV7): UnitId {
  return navalUnitAtV7(state, at).id;
}

function publicUnit(view: PlayerViewV7, id: UnitId) {
  const unit = view.units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("unit not visible");
  return unit;
}

function candidates(view: PlayerViewV7): readonly CommandV7[] {
  return chooseNormalCommandV7(view).candidates.map((item) => item.command);
}

function endsOf(commands: readonly CommandV7[], unitId: UnitId): CoordV7[] {
  return commands.flatMap((command) => {
    const end = command.kind === "MOVE" ? command.path.at(-1) : undefined;
    return command.kind === "MOVE" &&
      command.unitId === unitId &&
      end !== undefined
      ? [end]
      : [];
  });
}

function toolsOf(view: PlayerViewV7): NavalToolsV7 {
  const commands = queryPlayerCommandsV7(view);
  return {
    isHostile: (ownerId) => ownerId !== view.viewer.id,
    danger: (inView, unit, at) => publicDangerForPolicyV7(inView, unit, at),
    reaches: (hostile, at) =>
      publicThreatenedTilesForPolicyV7(view, hostile).some(
        (tile) => tile.x === at.x && tile.y === at.y,
      ),
    project: projectPublicUnitForPolicyV7,
    moveDestinations: () => [],
    commands,
  };
}

/** The danger to the own unit `id` afloat on `at`, as the policy reads it. */
function afloatDanger(view: PlayerViewV7, id: UnitId, at: CoordV7): number {
  const projected = projectPublicUnitForPolicyV7(view, id, {
    at,
    form: "EMBARKED",
  });
  return publicDangerForPolicyV7(projected, publicUnit(projected, id), at);
}

const exposure = (
  patch: Partial<NavalTransportExposureV7>,
): NavalTransportExposureV7 => ({
  hp: 12,
  dangerAtTo: 0,
  dangerHere: 0,
  escorted: false,
  landsFromTo: false,
  ...patch,
});

describe("the exposure rule (navalTransportExposedV7)", () => {
  it("refuses a destination where the hunters take half the HP or more", () => {
    expect(NAVAL_TRANSPORT_EXPOSED_TENTHS_V7).toBe(5);
    expect(navalTransportExposedV7(exposure({ dangerAtTo: 5 }))).toBe(false);
    expect(navalTransportExposedV7(exposure({ dangerAtTo: 6 }))).toBe(true);
    expect(navalTransportExposedV7(exposure({ dangerAtTo: 14 }))).toBe(true);
    // A boarding is judged the same way (nothing to compare it with here).
    expect(
      navalTransportExposedV7(exposure({ dangerAtTo: 6, dangerHere: null })),
    ).toBe(true);
  });

  it("lets a transport land, sail beside its escort, or leave a bad tile", () => {
    // Landing this turn: the beach is the goal, whatever waits there.
    expect(
      navalTransportExposedV7(exposure({ dangerAtTo: 20, landsFromTo: true })),
    ).toBe(false);
    // An escort beside the tile: allowed unless the danger is lethal.
    expect(
      navalTransportExposedV7(exposure({ dangerAtTo: 8, escorted: true })),
    ).toBe(false);
    expect(
      navalTransportExposedV7(exposure({ dangerAtTo: 12, escorted: true })),
    ).toBe(true);
    // Already exposed where it stands: it may get away to a safer tile,
    // not drift to another tile as bad or worse.
    expect(
      navalTransportExposedV7(exposure({ dangerAtTo: 7, dangerHere: 9 })),
    ).toBe(false);
    expect(
      navalTransportExposedV7(exposure({ dangerAtTo: 9, dangerHere: 9 })),
    ).toBe(true);
    expect(
      navalTransportExposedV7(exposure({ dangerAtTo: 9, dangerHere: 7 })),
    ).toBe(true);
  });
});

describe("transports against Patrol Boats and the shore", () => {
  function convoy(extra: NavalArenaOptionsV7["units"] = []) {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 6 } },
        ...extra,
      ],
    });
    const cargo = idAt(base, { x: 1, y: 2 });
    const state = patchNavalUnitV7(base, cargo, {
      at: { x: 1, y: 3 },
      form: "EMBARKED",
    });
    return { state, view: viewOf(state), cargo };
  }

  it("never sail into two hostile Patrol Boats' reach, which the old rule allowed", () => {
    const { view, cargo } = convoy();
    const cargoUnit = publicUnit(view, cargo);
    const offered = endsOf(queryPlayerCommandsV7(view), cargo);
    const exposed = offered.filter(
      (at) => afloatDanger(view, cargo, at) * 2 >= cargoUnit.hp,
    );
    // The two boats ram anything afloat from x = 3 on: an offered Move ends
    // there, and the Battleship-and-Submarine rule did not refuse it.
    expect(exposed.length).toBeGreaterThan(0);
    for (const at of exposed)
      expect(
        navalTransportMoveRejectedV7(
          view,
          toolsOf(view),
          navalFleetFactsV7(view, (owner) => owner !== view.viewer.id),
          cargoUnit,
          at,
        ),
      ).toBe(false);
    const chosen = endsOf(candidates(view), cargo);
    for (const at of chosen)
      expect(afloatDanger(view, cargo, at) * 2).toBeLessThan(cargoUnit.hp);
    expect(chosen.some((at) => exposed.some((e) => e.x === at.x))).toBe(false);
  });

  it("sail on beside an own warship when the hunters cannot sink them there", () => {
    const { view, cargo } = convoy([
      { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 4 } },
    ]);
    const cargoUnit = publicUnit(view, cargo);
    const chosen = endsOf(candidates(view), cargo);
    const escortedExposed = chosen.filter(
      (at) =>
        Math.max(Math.abs(at.x - 3), Math.abs(at.y - 4)) <= 1 &&
        afloatDanger(view, cargo, at) * 2 >= cargoUnit.hp,
    );
    for (const at of escortedExposed)
      expect(afloatDanger(view, cargo, at)).toBeLessThan(cargoUnit.hp);
    // Every chosen end is either safe or beside the Battleship.
    for (const at of chosen)
      expect(
        afloatDanger(view, cargo, at) * 2 < cargoUnit.hp ||
          Math.max(Math.abs(at.x - 3), Math.abs(at.y - 4)) <= 1,
      ).toBe(true);
  });

  it("do not board at a Port the hunters reach", () => {
    const port = NAVAL_ARENA_PORTS_V7[0];
    const make = (hunters: boolean) => {
      const state = navalArenaV7({
        units: [
          { seat: 0, role: "FIGHTER", at: { x: 3, y: 2 } },
          // An own Patrol Boat afloat out of the way: the older rule (no
          // boarding under visible naval danger without one) is met.
          { seat: 0, role: "PATROL_BOAT", at: { x: 0, y: 5 } },
          ...(hunters
            ? ([
                { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 4 } },
                { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 5 } },
              ] as const)
            : []),
        ],
      });
      return {
        state,
        view: viewOf(state),
        sailor: idAt(state, { x: 3, y: 2 }),
      };
    };
    const hunted = make(true);
    // The boarding Move is offered, and the Port is in the boats' reach.
    expect(
      endsOf(queryPlayerCommandsV7(hunted.view), hunted.sailor).some(
        (at) => at.x === port.x && at.y === port.y,
      ),
    ).toBe(true);
    expect(
      afloatDanger(hunted.view, hunted.sailor, port) * 2,
    ).toBeGreaterThanOrEqual(publicUnit(hunted.view, hunted.sailor).hp);
    expect(
      endsOf(candidates(hunted.view), hunted.sailor).some(
        (at) => at.x === port.x && at.y === port.y,
      ),
    ).toBe(false);
  });
});

describe("the fleet escorts its transports (navalFleetGoalsV7)", () => {
  it("sails for a blockader first, then for the convoy and its hunters", () => {
    const blockader = { x: 4, y: 3 };
    const transport = { x: 1, y: 3 };
    const near = { x: 1 + NAVAL_ESCORT_HUNT_RADIUS_V7, y: 4 };
    const far = { x: 9, y: 6 };
    expect(
      navalFleetGoalsV7({
        blockaders: [blockader],
        ownTransports: [transport],
        hostileAfloat: [far],
      }),
    ).toEqual([blockader]);
    expect(
      navalFleetGoalsV7({
        blockaders: [],
        ownTransports: [transport],
        hostileAfloat: [near, far],
      }),
    ).toEqual([transport, near]);
    expect(
      navalFleetGoalsV7({
        blockaders: [],
        ownTransports: [],
        hostileAfloat: [near, far],
      }),
    ).toEqual([near, far]);
  });

  it("brings a warship back to an own transport instead of a far hostile ship", () => {
    const base = navalArenaV7({
      units: [
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 2 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 9, y: 8 } },
      ],
    });
    const cargo = idAt(base, { x: 1, y: 2 });
    const boat = idAt(base, { x: 5, y: 4 });
    const hostile = idAt(base, { x: 9, y: 8 });
    const embarked = patchNavalUnitV7(base, cargo, {
      at: { x: 1, y: 3 },
      form: "EMBARKED",
    });
    // A hostile transport afloat far to the east, 8 tiles from the own one.
    const state = patchNavalUnitV7(embarked, hostile, {
      at: { x: 9, y: 6 },
      form: "EMBARKED",
    });
    const view = viewOf(state);
    const ends = endsOf(candidates(view), boat);
    expect(ends.length).toBeGreaterThan(0);
    // Its first Move closes on the transport on (1, 3), not the far ship.
    const first = ends[0];
    if (first === undefined) throw new Error("the boat has no Move");
    const toConvoy = (at: CoordV7) =>
      Math.max(Math.abs(at.x - 1), Math.abs(at.y - 3));
    expect(toConvoy(first)).toBeLessThan(toConvoy({ x: 5, y: 4 }));
  });
});

describe("the quickest Port (navalQuickestPortsV7)", () => {
  it("weighs the walk to a Port twice the sail from it", () => {
    const from = { x: 5, y: 5 };
    const nearPort = { x: 6, y: 5 }; // 1 step, 10 tiles of sea: trip 12
    const farPort = { x: 2, y: 5 }; // 3 steps, 2 tiles of sea: trip 8
    const water = new Map([
      ["6,5", 10],
      ["2,5", 2],
    ]);
    const sail = (at: CoordV7) => water.get(`${String(at.x)},${String(at.y)}`);
    expect(navalQuickestPortsV7(from, [nearPort, farPort], sail)).toEqual([
      farPort,
    ]);
    // Within the slack both stay.
    water.set("6,5", 8 + NAVAL_PORT_TRIP_SLACK_V7 - 2);
    expect(navalQuickestPortsV7(from, [nearPort, farPort], sail)).toEqual([
      nearPort,
      farPort,
    ]);
  });

  it("keeps a Port with no known route only while none has one", () => {
    const from = { x: 0, y: 0 };
    const a = { x: 1, y: 0 };
    const b = { x: 2, y: 0 };
    expect(navalQuickestPortsV7(from, [a, b], () => undefined)).toEqual([a, b]);
    expect(
      navalQuickestPortsV7(from, [a, b], (at) => (at.x === 2 ? 4 : undefined)),
    ).toEqual([b]);
  });
});
