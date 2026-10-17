import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  publicDangerForPolicyV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import { PIE_FIRST_OFFSET_V7 } from "../../src/ai/v7-candy";
import {
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  CANDY_HOME_NAVAL_TECHS_V7,
  CANDY_NAVAL_TECHS_V7,
  CANDY_WITHOUT_SUGAR_SAILS_V7,
  candyStraitV7,
  type CandyPieceV7,
} from "../fixtures/v7-naval-candy";

// Themed naval branches, Sugar Sails: the Normal AI (`pulp_wars-5ti.21`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 8.6), each on a small
// hand-built strait: the shared arena of `v7-naval-branch.ts` (rows 0 to 2
// and 8 to 10 land, rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water),
// seat 0's capital on (5, 2), seat 1's on (5, 8). Seat 0 decides unless a
// test says otherwise. No match is played.

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0): PlayerViewV7 =>
  viewForV7(state, seatV7(state, seat).id);

/** The best candidate of one unit, in the policy's order (null: none). */
function candidateOf(view: PlayerViewV7, unitId: number): CommandV7 | null {
  return (
    chooseNormalCommandV7(view).candidates.find(
      (item) => "unitId" in item.command && item.command.unitId === unitId,
    )?.command ?? null
  );
}

/** The first candidate of any of the units, in the policy's order. */
function firstOf(view: PlayerViewV7, unitIds: readonly number[]): CommandV7 {
  const first = chooseNormalCommandV7(view).candidates.find(
    (item) => "unitId" in item.command && unitIds.includes(item.command.unitId),
  );
  if (first === undefined) throw new Error("no candidate");
  return first.command;
}

function sea(
  pieces: readonly CandyPieceV7[],
  candyTechs: readonly TechnologyIdV7[] = CANDY_NAVAL_TECHS_V7,
): GameStateV7 {
  return candyStraitV7({
    pieces,
    technologies: [candyTechs, NAVAL_TECHS_V7],
  });
}

/**
 * Plays the policy's best command for the unit until it has attacked (at
 * most `limit` commands): the commands it chose and the state after them.
 */
function playUnit(
  state: GameStateV7,
  unitId: number,
  limit = 4,
): { readonly kinds: readonly string[]; readonly state: GameStateV7 } {
  let current = state;
  const kinds: string[] = [];
  for (let step = 0; step < limit; step += 1) {
    const best = candidateOf(viewOf(current), unitId);
    if (best === null) break;
    kinds.push(best.kind);
    current = acceptV7(current, 0, best).state;
    if (best.kind === "ATTACK") break;
  }
  return { kinds, state: current };
}

const TUG: CoordV7 = { x: 2, y: 4 };
const BOAT: CoordV7 = { x: 5, y: 4 };

describe("Rush at sea (section 8.6)", () => {
  it("a Tug that kills only when Rushed Rushes, sails in, and rams the boat under", () => {
    const state = sea([
      { seat: 0, role: "PATROL_BOAT", at: TUG },
      { seat: 1, role: "PATROL_BOAT", at: BOAT },
    ]);
    const tug = navalUnitAtV7(state, TUG);
    const boat = navalUnitAtV7(state, BOAT);
    expect(candidateOf(viewOf(state), tug.id)).toEqual({
      kind: "SUGAR_RUSH",
      unitId: tug.id,
    });
    const played = playUnit(state, tug.id);
    expect(played.kinds).toEqual(["SUGAR_RUSH", "MOVE", "ATTACK"]);
    expect(played.state.units.some((unit) => unit.id === boat.id)).toBe(false);
  });

  it("a Tug whose Crash would leave it beside a hostile Battleship does not Rush", () => {
    const state = sea([
      { seat: 0, role: "PATROL_BOAT", at: TUG },
      { seat: 1, role: "PATROL_BOAT", at: BOAT },
      { seat: 1, role: "BATTLESHIP", at: { x: 6, y: 6 } },
    ]);
    const tug = navalUnitAtV7(state, TUG);
    const view = viewOf(state);
    expect(
      chooseNormalCommandV7(view).candidates.some(
        (item) =>
          item.command.kind === "SUGAR_RUSH" && item.command.unitId === tug.id,
      ),
    ).toBe(false);
    expect(candidateOf(view, tug.id)?.kind).not.toBe("SUGAR_RUSH");
  });

  it("Rushes into lethal reach when Home Sweet Home spares it by an own city", () => {
    // The Tug reaches the boat on (6, 4) only Rushed, from (5, 3) beside its
    // own capital on (5, 2); the Battleship on (7, 6) covers (5, 3).
    const pieces: readonly CandyPieceV7[] = [
      { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 4 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 6 } },
    ];
    for (const [techs, rushes] of [
      [CANDY_HOME_NAVAL_TECHS_V7, true],
      [CANDY_NAVAL_TECHS_V7, false],
    ] as const) {
      const state = sea(pieces, techs);
      const tug = navalUnitAtV7(state, { x: 2, y: 3 });
      expect(candidateOf(viewOf(state), tug.id)?.kind === "SUGAR_RUSH").toBe(
        rushes,
      );
    }
  });

  it("a Pie Galleon Rushes to fire harder from where it stands when only the Rushed shot sinks", () => {
    // Out of reach of the Human capital (a defender there is a dearer
    // kill). At 18 HP the plain shot deals 16 and the Rushed one sinks it.
    const state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 7, y: 4 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 9, y: 4 }, hp: 18 },
    ]);
    const galleon = navalUnitAtV7(state, { x: 7, y: 4 });
    const target = navalUnitAtV7(state, { x: 9, y: 4 });
    const played = playUnit(state, galleon.id);
    expect(played.kinds).toEqual(["SUGAR_RUSH", "ATTACK"]);
    expect(played.state.units.some((unit) => unit.id === target.id)).toBe(
      false,
    );
  });

  it("a Choco Sub Rushes when only the extra tile brings a sinking torpedo in reach", () => {
    // Move 2 leaves the Sub two tiles short of the boat; Rushed, it sails
    // three and torpedoes it (12, sunk).
    const state = sea([
      { seat: 0, role: "SUBMARINE", at: { x: 1, y: 4 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
    ]);
    const sub = navalUnitAtV7(state, { x: 1, y: 4 });
    const boat = navalUnitAtV7(state, { x: 5, y: 4 });
    const played = playUnit(state, sub.id);
    expect(played.kinds).toEqual(["SUGAR_RUSH", "MOVE", "ATTACK"]);
    expect(played.state.units.some((unit) => unit.id === boat.id)).toBe(false);
  });

  it("offers no ship Rush without Sugar Sails, and the Tug rams plain", () => {
    const state = sea(
      [
        { seat: 0, role: "PATROL_BOAT", at: TUG },
        { seat: 1, role: "PATROL_BOAT", at: BOAT },
      ],
      CANDY_WITHOUT_SUGAR_SAILS_V7,
    );
    const tug = navalUnitAtV7(state, TUG);
    expect(
      queryPlayerCommandsV7(viewOf(state)).some(
        (command) => command.kind === "SUGAR_RUSH" && command.unitId === tug.id,
      ),
    ).toBe(false);
    expect(candidateOf(viewOf(state), tug.id)?.kind).not.toBe("SUGAR_RUSH");
  });
});

describe("Splat first (section 8.6)", () => {
  // Away from the Human capital (out of the Galleon's reach), a Guard on
  // the beach beside a landed Toffee Trooper, the Galleon next to it.
  const BEACH: readonly CandyPieceV7[] = [
    { seat: 0, role: "BATTLESHIP", at: { x: 9, y: 7 } },
    { seat: 0, role: "FIGHTER", at: { x: 10, y: 8 } },
    { seat: 1, role: "GUARD", at: { x: 9, y: 8 } },
  ];

  it("a Pie Galleon Splats the coastal defender before the landed Toffee Trooper attacks it", () => {
    // Without Sugar Sails (the Galleon needs only Pie Galleons): its plain
    // shot leaves the Guard on 3 HP, Splatted.
    const state = sea(BEACH, CANDY_WITHOUT_SUGAR_SAILS_V7);
    const galleon = navalUnitAtV7(state, { x: 9, y: 7 });
    const trooper = navalUnitAtV7(state, { x: 10, y: 8 });
    const guard = navalUnitAtV7(state, { x: 9, y: 8 });
    expect(firstOf(viewOf(state), [galleon.id, trooper.id])).toEqual({
      kind: "ATTACK",
      unitId: galleon.id,
      targetUnitId: guard.id,
    });
    // The Pie-first rule, keyed to the Splat ability: the Galleon's shot
    // goes ahead of the Trooper's attack of the same tier.
    const view = viewOf(state);
    const shotScore = scoreCommandV7(view, {
      kind: "ATTACK",
      unitId: galleon.id,
      targetUnitId: guard.id,
    });
    const blowScore = scoreCommandV7(view, {
      kind: "ATTACK",
      unitId: trooper.id,
      targetUnitId: guard.id,
    });
    expect(shotScore.priority).toBe(blowScore.priority + PIE_FIRST_OFFSET_V7);
    const shot = acceptV7(state, 0, {
      kind: "ATTACK",
      unitId: galleon.id,
      targetUnitId: guard.id,
    }).state;
    expect(shot.splattedThisTurn).toEqual([guard.id]);
    // The Trooper follows on the Splatted Guard.
    expect(candidateOf(viewOf(shot), trooper.id)).toEqual({
      kind: "ATTACK",
      unitId: trooper.id,
      targetUnitId: guard.id,
    });
  });

  it("with Sugar Sails the Galleon Rushes first and its shot sinks the defender outright", () => {
    const state = sea(BEACH);
    const galleon = navalUnitAtV7(state, { x: 9, y: 7 });
    const trooper = navalUnitAtV7(state, { x: 10, y: 8 });
    const guard = navalUnitAtV7(state, { x: 9, y: 8 });
    expect(firstOf(viewOf(state), [galleon.id, trooper.id])).toEqual({
      kind: "SUGAR_RUSH",
      unitId: galleon.id,
    });
    const played = playUnit(state, galleon.id);
    expect(played.kinds).toEqual(["SUGAR_RUSH", "ATTACK"]);
    expect(played.state.units.some((unit) => unit.id === guard.id)).toBe(false);
  });
});

describe("other seats against Sugar Sails (section 8.6)", () => {
  it("count a hostile Tug's Rushed reach and its Rushed Ram", () => {
    // A Human Patrol Boat four tiles from a Candy Tug: in Rushed Ram reach
    // (Move 3, then the Ram), and the assumed Ram plus Rush sinks it.
    const state = candyStraitV7({
      factions: ["ORIGINAL", "CANDY"],
      pieces: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 6, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
      ],
    });
    const view = viewOf(state);
    const boat = navalUnitAtV7(state, { x: 6, y: 4 });
    expect(publicDangerForPolicyV7(view, boat, { x: 6, y: 4 })).toBe(10);
    expect(publicDangerForPolicyV7(view, boat, { x: 7, y: 4 })).toBe(0);
  });

  it("read a Crashed Candy ship as no threat on its next turn", () => {
    const state = candyStraitV7({
      factions: ["ORIGINAL", "CANDY"],
      pieces: [
        { seat: 0, role: "PATROL_BOAT", at: { x: 4, y: 4 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 4 }, rush: "CRASHED" },
      ],
    });
    const view = viewOf(state);
    const boat = navalUnitAtV7(state, { x: 4, y: 4 });
    expect(publicDangerForPolicyV7(view, boat, { x: 3, y: 4 })).toBe(0);
  });
});
