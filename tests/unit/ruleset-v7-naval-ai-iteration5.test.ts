import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalNavalPlanV7,
} from "../../src/ai/v7";
import {
  NAVAL_SIEGE_REACH_V7,
  navalSiegeTargetRankV7,
} from "../../src/ai/v7-naval";
import { SCALE_MODE_UNITS_V7, scaleModeV7 } from "../../src/ai/v7-scale";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
} from "../../src/engine/index";
import {
  NAVAL_ARENA_CAPITALS_V7,
  NAVAL_ARENA_PORTS_V7,
  NAVAL_ARENA_THIRD_CAPITAL_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
  type NavalArenaUnitV7,
} from "../fixtures/v7-naval-branch";

// Naval AI iteration 5 (`pulp_wars-2oj9`, docs/architecture/NORMAL_AI.md
// "Naval AI iteration 5"): the naval plan targets the hostile city an own
// siege ship has in reach, or whose centre stands empty, and no ship (the
// counter included) is launched onto a dock where it is sunk. Proven on the
// authored strait of `tests/fixtures/v7-naval-branch.ts` (rows 0 to 2 and 8
// to 10 land, 3 and 7 Shallow, 4 to 6 Deep; seat 0's capital (5, 2) and
// Port (4, 3); seat 1's capital (5, 8); with `third`, a bystander's capital
// (9, 9) on the same southern landmass).

function viewOf(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, seatV7(state, 0).id);
}

const key = (at: CoordV7 | null): string =>
  at === null ? "none" : `${at.x},${at.y}`;

describe("the siege target rank (navalSiegeTargetRankV7)", () => {
  it("puts a city under an own siege ship's guns, or with an empty centre, first", () => {
    expect(
      navalSiegeTargetRankV7({
        city: true,
        centreEmpty: false,
        siegeShipInReach: true,
      }),
    ).toBe(0);
    expect(
      navalSiegeTargetRankV7({
        city: true,
        centreEmpty: true,
        siegeShipInReach: false,
      }),
    ).toBe(0);
    expect(
      navalSiegeTargetRankV7({
        city: true,
        centreEmpty: false,
        siegeShipInReach: false,
      }),
    ).toBe(1);
    // A village keeps its place (villages rank after every city anyway).
    expect(
      navalSiegeTargetRankV7({
        city: false,
        centreEmpty: false,
        siegeShipInReach: false,
      }),
    ).toBe(0);
  });
});

describe("the naval plan lands where the siege is", () => {
  // Seat 1's capital (5, 8) is the hostile city nearest to seat 0's
  // capital (5, 2): distance 6; the bystander's (9, 9) is 7 away.
  const arena = (units: readonly NavalArenaUnitV7[]): GameStateV7 =>
    navalArenaV7({ units, third: { faction: "GOBLIN" } });

  it("targets the nearest hostile city without a siege", () => {
    const plan = inspectNormalNavalPlanV7(viewOf(arena([])));
    expect(plan.active).toBe(true);
    expect(key(plan.target)).toBe(key(NAVAL_ARENA_CAPITALS_V7[1]));
  });

  it("targets the city an own Battleship has in reach", () => {
    // (9, 6) is 3 from (9, 9) and 4 from (5, 8).
    const ship: NavalArenaUnitV7 = {
      seat: 0,
      role: "BATTLESHIP",
      at: { x: 9, y: 6 },
    };
    expect(
      Math.max(
        Math.abs(ship.at.x - NAVAL_ARENA_THIRD_CAPITAL_V7.x),
        Math.abs(ship.at.y - NAVAL_ARENA_THIRD_CAPITAL_V7.y),
      ),
    ).toBe(NAVAL_SIEGE_REACH_V7);
    const plan = inspectNormalNavalPlanV7(viewOf(arena([ship])));
    expect(key(plan.target)).toBe(key(NAVAL_ARENA_THIRD_CAPITAL_V7));
    // One tile farther out the ship has no city in reach: the nearest again.
    const far = inspectNormalNavalPlanV7(
      viewOf(arena([{ ...ship, at: { x: 10, y: 5 } }])),
    );
    expect(key(far.target)).toBe(key(NAVAL_ARENA_CAPITALS_V7[1]));
  });

  it("targets the city whose centre stands empty", () => {
    const state = arena([]);
    const garrison = navalUnitAtV7(state, NAVAL_ARENA_THIRD_CAPITAL_V7);
    const emptied = patchNavalUnitV7(state, garrison.id, {
      at: { x: 9, y: 10 },
    });
    const plan = inspectNormalNavalPlanV7(viewOf(emptied));
    expect(key(plan.target)).toBe(key(NAVAL_ARENA_THIRD_CAPITAL_V7));
  });

  it("keeps the siege target inside the scale mode's window", () => {
    // Over SCALE_MODE_UNITS_V7 own units: Fighters on the northern land and
    // Patrol Boats in the eastern strait, away from the Port. The plan is
    // read from the whole view, so the window does not change the target;
    // a training belongs to no unit and is offered in every window, so the
    // launch rule needs no window of its own.
    const fillers: NavalArenaUnitV7[] = [];
    for (let y = 0; y <= 2; y += 1)
      for (let x = 0; x <= 10; x += 1)
        if (!(x === 5 && y === 2))
          fillers.push({ seat: 0, role: "FIGHTER", at: { x, y } });
    for (const y of [3, 4])
      for (let x = 7; x <= 10; x += 1)
        fillers.push({ seat: 0, role: "PATROL_BOAT", at: { x, y } });
    const ship: NavalArenaUnitV7 = {
      seat: 0,
      role: "BATTLESHIP",
      at: { x: 9, y: 6 },
    };
    const state = navalArenaV7({
      units: [...fillers, ship],
      third: { faction: "GOBLIN" },
    });
    const view = viewOf(state);
    expect(
      view.units.filter((unit) => unit.ownerId === view.viewer.id).length,
    ).toBeGreaterThan(SCALE_MODE_UNITS_V7);
    expect(scaleModeV7(view)).toBe(true);
    expect(key(inspectNormalNavalPlanV7(view).target)).toBe(
      key(NAVAL_ARENA_THIRD_CAPITAL_V7),
    );
  });
});

describe("no counter launched onto a dock where it is sunk", () => {
  // Seat 1's Battleship far off in the west makes the Submarine seat 0's
  // counter; three seat-1 Patrol Boats off seat 0's Port (4, 3) sink a new
  // ship there.
  const hunter: NavalArenaUnitV7 = {
    seat: 1,
    role: "BATTLESHIP",
    at: { x: 0, y: 6 },
  };
  const boats: NavalArenaUnitV7[] = [
    { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
    { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 4 } },
    { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
  ];
  const submarineAt = (state: GameStateV7) =>
    chooseNormalCommandV7(viewOf(state)).candidates.filter(
      (item) =>
        item.command.kind === "TRAIN_NAVAL" &&
        item.command.role === "SUBMARINE" &&
        key(item.command.at) === key(NAVAL_ARENA_PORTS_V7[0]),
    );
  const offered = (state: GameStateV7): boolean =>
    queryPlayerCommandsV7(state, seatV7(state, 0).id).some(
      (command) =>
        command.kind === "TRAIN_NAVAL" &&
        command.role === "SUBMARINE" &&
        key(command.at) === key(NAVAL_ARENA_PORTS_V7[0]),
    );

  it("trains the counter on a clear dock", () => {
    const clear = navalArenaV7({ units: [hunter] });
    expect(offered(clear)).toBe(true);
    const items = submarineAt(clear);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.tuple[0]).toBeGreaterThan(1000);
  });

  it("does not train it on a dock the hostile fleet covers", () => {
    const covered = navalArenaV7({ units: [hunter, ...boats] });
    expect(offered(covered)).toBe(true);
    for (const item of submarineAt(covered)) expect(item.tuple[0]).toBe(-1);
  });
});
