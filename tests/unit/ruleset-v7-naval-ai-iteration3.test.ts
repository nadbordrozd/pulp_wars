import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalNavalPlanV7,
} from "../../src/ai/v7";
import {
  NAVAL_PORT_FAR_MARGIN_V7,
  navalLandingCoastV7,
  navalPortFarV7,
} from "../../src/ai/v7-naval";
import {
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Naval AI iteration 3 (`pulp_wars-n3ih`, docs/architecture/NORMAL_AI.md
// "Naval AI iteration 3"): a coastal target city is no landing tile of its
// own, and a seat whose Ports lie far round its coast from where it sails
// builds the near Port and boards nowhere else. Proven on the authored
// strait of `tests/fixtures/v7-naval-branch.ts` (rows 0 to 2 and 8 to 10
// land, 3 and 7 Shallow, 4 to 6 Deep; seat 0's capital (5, 2), seat 1's
// capital (5, 8) with a Fighter on it and Port (6, 7)).

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, seatV7(state, 0).id);
}

const key = (at: CoordV7): string => `${at.x},${at.y}`;

describe("the landing coast of a coastal city (navalLandingCoastV7)", () => {
  const coast: CoordV7[] = [
    { x: 4, y: 8 },
    { x: 5, y: 8 },
    { x: 6, y: 8 },
  ];

  it("leaves the target city out while other coast is known", () => {
    expect(navalLandingCoastV7(coast, { x: 5, y: 8 }, true).map(key)).toEqual([
      "4,8",
      "6,8",
    ]);
    // The city is the only coast: it stays.
    expect(
      navalLandingCoastV7([{ x: 5, y: 8 }], { x: 5, y: 8 }, true).map(key),
    ).toEqual(["5,8"]);
    // A village is landed on (the landing takes it), and with no target
    // the coast is unchanged.
    expect(navalLandingCoastV7(coast, { x: 5, y: 8 }, false)).toEqual(coast);
    expect(navalLandingCoastV7(coast, null, true)).toEqual(coast);
  });

  it("sends a transport at sea to the coast beside the city, not the city", () => {
    // A seat-0 Fighter afloat in mid strait: no landing is offered from
    // there, so the plan used to name only the garrisoned capital (5, 8).
    const arena = navalArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 3, y: 1 } }],
    });
    const state = patchNavalUnitV7(
      arena,
      navalUnitAtV7(arena, { x: 3, y: 1 }).id,
      { at: { x: 5, y: 4 }, form: "EMBARKED" },
    );
    const plan = inspectNormalNavalPlanV7(viewOf(state));
    expect(plan.active).toBe(true);
    expect(plan.target).toEqual({ x: 5, y: 8 });
    expect(plan.landing.map(key)).not.toContain("5,8");
    expect(plan.landing.map(key)).toEqual(["4,8", "6,8"]);
  });
});

describe("the Port far round the coast (navalPortFarV7)", () => {
  it("asks for the Port site only when it beats every Port by the margin", () => {
    expect(NAVAL_PORT_FAR_MARGIN_V7).toBe(4);
    expect(navalPortFarV7(10, 4)).toBe(true);
    expect(navalPortFarV7(8, 4)).toBe(false);
    expect(navalPortFarV7(9, 4)).toBe(true);
    // No Port has a route; no site is known.
    expect(navalPortFarV7(null, 4)).toBe(true);
    expect(navalPortFarV7(10, null)).toBe(false);
  });

  // Seat 0's land is row 2 only, its one Port on (5, 1) on the north
  // shore; the north sea joins the strait round (0, 2). From that Port the
  // landing coast by seat 1's capital is nine or ten tiles of water; from
  // the Port sites of the capital on the strait (row 3) it is four.
  const farPortArena = (): GameStateV7 =>
    navalArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } }],
      ports: [false, true],
      improvements: [{ at: { x: 5, y: 1 }, improvement: "PORT" }],
      terrain: [
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "~..........",
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "~~~~~~~~~.~",
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "...........",
        "...........",
        "...........",
      ],
    });

  it("builds the near Port and boards at no other", () => {
    const state = farPortArena();
    const view = viewOf(state);
    expect(
      view.naval.ownedPorts.map((port) => [key(port.at), port.status]),
    ).toEqual([["5,1", "ACTIVE"]]);
    const plan = inspectNormalNavalPlanV7(view);
    expect(plan.active).toBe(true);
    expect(plan.target).toEqual({ x: 5, y: 8 });
    // The north Port reaches the landing coast, but far round the coast.
    expect(plan.servingPorts.map(key)).toEqual(["5,1"]);
    expect(plan.portMissing).toBe(true);
    const candidates = chooseNormalCommandV7(view).candidates;
    // Nobody walks onto the far Port to board.
    expect(
      candidates.some(
        (item) =>
          item.command.kind === "MOVE" &&
          key(item.command.path.at(-1) ?? { x: -1, y: -1 }) === "5,1",
      ),
    ).toBe(false);
    // The Port on the strait is built first, at the Port priority.
    const port = candidates.find((item) => item.command.kind === "BUILD_PORT");
    expect(port?.command.kind === "BUILD_PORT" && port.command.at.y).toBe(3);
    expect(port?.tuple[0]).toBe(1285);
  });

  it("boards at the Port it has once the near one stands", () => {
    // The same board with the Port on the strait built: it is the near
    // Port, and boarding is allowed again.
    const state = navalArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 4, y: 2 } }],
      improvements: [{ at: { x: 5, y: 1 }, improvement: "PORT" }],
      terrain: [
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "~..........",
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "~~~~~~~~~.~",
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "...........",
        "...........",
        "...........",
      ],
    });
    const plan = inspectNormalNavalPlanV7(viewOf(state));
    expect(plan.servingPorts.map(key).sort()).toEqual(["4,3", "5,1"]);
    expect(plan.portMissing).toBe(false);
  });
});
