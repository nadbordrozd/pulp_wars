import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  inspectNormalArmyV7,
  inspectNormalNavalPlanV7,
} from "../../src/ai/v7";
import {
  ARMY_APPROACH_PRIORITY_V7,
  ARMY_REGROUP_PRIORITY_V7,
} from "../../src/ai/v7-army";
import type {
  CommandV7,
  CoordV7,
  FactionIdV7,
  GameStateV7,
  PlayerViewV7,
  TechnologyIdV7,
  UnitId,
  UnitRoleIdV7,
} from "../../src/engine/index";
import {
  OPEN_GROUND_V7,
  thirdPassAcceptV7,
  thirdPassArenaV7,
  thirdPassNextTurnV7,
  thirdPassPatchV7,
  thirdPassUnitAtV7,
  thirdPassViewV7,
} from "../fixtures/v7-third-pass";

// The third pass of the Normal AI (`pulp_wars-9s0.14`, with the marching
// bug `pulp_wars-9s0.17`; docs/architecture/NORMAL_AI.md, "Third pass").
// No test plays a match. Each builds a board by hand, asks the policy for a
// decision, and where a sequence matters applies the policy's own commands
// and asks again: a few decisions of a few units, with the other seats
// only ending their turns.

const at = (x: number, y: number): CoordV7 => ({ x, y });

const NAVAL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

/** The unit's candidates in this decision, best first. */
function candidatesOf(view: PlayerViewV7, id: UnitId) {
  return chooseNormalCommandV7(view).candidates.filter(
    (item) => "unitId" in item.command && item.command.unitId === id,
  );
}

const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;

const endsOn = (command: CommandV7, tile: CoordV7): boolean => {
  const end = endOf(command);
  return end !== undefined && end.x === tile.x && end.y === tile.y;
};

const unitOf = (state: GameStateV7, id: UnitId) => {
  const unit = state.units.find((item) => item.id === id);
  if (unit === undefined) throw new Error("unit missing");
  return unit;
};

/** The state with these units aboard on the given water tiles. */
function aboard(
  state: GameStateV7,
  moves: readonly (readonly [CoordV7, CoordV7])[],
): GameStateV7 {
  return thirdPassPatchV7(
    state,
    new Map(
      moves.map(([from, to]) => [
        thirdPassUnitAtV7(state, from),
        { form: "EMBARKED" as const, at: to },
      ]),
    ),
  );
}

/** Seat 0 plays one turn by the policy, up to its End Turn. */
function policyTurn(state: GameStateV7): {
  readonly state: GameStateV7;
  readonly commands: readonly CommandV7[];
} {
  const commands: CommandV7[] = [];
  let next = state;
  for (let step = 0; step < 60; step += 1) {
    const command = chooseNormalCommandV7(thirdPassViewV7(next)).command;
    if (command === null || command.kind === "END_TURN") break;
    commands.push(command);
    next = thirdPassAcceptV7(next, 0, command);
  }
  return { state: next, commands };
}

// ---------------------------------------------------------------------------
// pulp_wars-9s0.17: a lone unit marching on a held city.
// ---------------------------------------------------------------------------

describe("a lone unit marching on a held city (pulp_wars-9s0.17)", () => {
  // Open ground. Seat 0's capital is on (1, 5) with its garrison; the
  // enemy capital on (9, 5) is held by a Fighter. A second Fighter of seat
  // 0 starts on (`x`, 5). "Alone among enemies" is: outside the own land, a
  // hostile land unit within 5 tiles, no own fighting unit within 3. On
  // x = 4 the unit has its garrison 3 tiles behind it and the enemy 5
  // tiles ahead: not alone, so the approach (720) took it to x = 5, where
  // it was alone, and the regroup (705) took it back: before the fix the
  // unit that started on x = 3 stood on x = 4, 5, 5, 5, 4, 5, 5, 5, 4 at
  // the start of its next eight turns.
  const march = (x: number): GameStateV7 =>
    thirdPassArenaV7({
      mapType: "PANGEA",
      terrain: OPEN_GROUND_V7,
      seats: [
        {
          faction: "ORIGINAL",
          cities: [at(1, 5)],
          units: [
            { role: "FIGHTER", at: at(1, 5) },
            { role: "FIGHTER", at: at(x, 5) },
          ],
        },
        {
          faction: "UNDEAD",
          cities: [at(9, 5)],
          units: [{ role: "FIGHTER", at: at(9, 5) }],
        },
      ],
    });

  /** The unit's best command over `turns` turns: where it stood, and why. */
  function follow(start: GameStateV7, id: UnitId, turns: number) {
    const trail: { x: number; priority: number | null }[] = [];
    let state = start;
    for (let turn = 0; turn < turns; turn += 1) {
      const best = candidatesOf(thirdPassViewV7(state), id)[0];
      trail.push({
        x: unitOf(state, id).at.x,
        priority: best?.score.priority ?? null,
      });
      state = thirdPassNextTurnV7(
        best === undefined ? state : thirdPassAcceptV7(state, 0, best.command),
      );
    }
    return trail;
  }

  it("walks up to the last tile in company and waits there", () => {
    const start = march(3);
    const id = thirdPassUnitAtV7(start, at(3, 5));
    expect(follow(start, id, 5)).toEqual([
      { x: 3, priority: ARMY_APPROACH_PRIORITY_V7 },
      { x: 4, priority: null },
      { x: 4, priority: null },
      { x: 4, priority: null },
      { x: 4, priority: null },
    ]);
  });

  it("does not step out from that tile: no Move of it ends where it would be alone", () => {
    const start = march(4);
    const id = thirdPassUnitAtV7(start, at(4, 5));
    const moves = candidatesOf(thirdPassViewV7(start), id);
    expect(moves.filter((item) => (endOf(item.command)?.x ?? 0) >= 5)).toEqual(
      [],
    );
  });

  it("alone in front of the city it comes back once, by the step that brings it nearest, and stays", () => {
    const start = march(6);
    const id = thirdPassUnitAtV7(start, at(6, 5));
    const trail = follow(start, id, 6);
    expect(trail.map((step) => step.x)).toEqual([6, 5, 4, 4, 4, 4]);
    expect(trail.map((step) => step.priority)).toEqual([
      ARMY_REGROUP_PRIORITY_V7,
      ARMY_REGROUP_PRIORITY_V7,
      null,
      null,
      null,
      null,
    ]);
  });

  it("two units go on together", () => {
    const start = thirdPassArenaV7({
      mapType: "PANGEA",
      terrain: OPEN_GROUND_V7,
      seats: [
        {
          faction: "ORIGINAL",
          cities: [at(1, 5)],
          units: [
            { role: "FIGHTER", at: at(1, 5) },
            { role: "FIGHTER", at: at(4, 5) },
            { role: "FIGHTER", at: at(4, 4) },
          ],
        },
        {
          faction: "UNDEAD",
          cities: [at(9, 5)],
          units: [{ role: "FIGHTER", at: at(9, 5) }],
        },
      ],
    });
    for (const from of [at(4, 5), at(4, 4)]) {
      const best = candidatesOf(
        thirdPassViewV7(start),
        thirdPassUnitAtV7(start, from),
      )[0];
      expect(endOf(best?.command ?? { kind: "END_TURN" })?.x).toBe(5);
    }
  });
});

// ---------------------------------------------------------------------------
// pulp_wars-9s0.14, army size under savings.
// ---------------------------------------------------------------------------

describe("army size under savings (pulp_wars-9s0.14)", () => {
  const FACTIONS: readonly FactionIdV7[] = [
    "ORIGINAL",
    "UNDEAD",
    "GOBLIN",
    "MARTIAN",
    "DINOSAUR",
    "ICE_FOLK",
    "DWARF",
    "CANDY",
  ];
  /**
   * Three cities and `units` Fighters (the first two on centers), 20
   * Coins, no technology but the opener. The enemy capital is far off;
   * with `war` an enemy Fighter stands four tiles from two of the centers.
   */
  const thin = (
    faction: FactionIdV7,
    options: { readonly units?: number; readonly war?: boolean } = {},
  ): GameStateV7 =>
    thirdPassArenaV7({
      mapType: "PANGEA",
      terrain: OPEN_GROUND_V7,
      seats: [
        {
          faction,
          coins: 20,
          cities: [at(1, 5), at(1, 9), at(4, 9)],
          units: [at(1, 5), at(1, 9), at(4, 9), at(2, 6), at(3, 7)]
            .slice(0, options.units ?? 2)
            .map((where) => ({ role: "FIGHTER" as const, at: where })),
        },
        {
          faction: faction === "UNDEAD" ? "ORIGINAL" : "UNDEAD",
          cities: [at(9, 1)],
          units: [
            { role: "FIGHTER", at: at(9, 1) },
            ...(options.war === false
              ? []
              : [{ role: "FIGHTER" as const, at: at(5, 5) }]),
          ],
        },
      ],
    });

  it("every faction's seat trains before it researches while it is short of units in a war", () => {
    for (const faction of FACTIONS) {
      const state = thin(faction);
      expect(
        inspectNormalArmyV7(thirdPassViewV7(state)).bodiesFirst,
        faction,
      ).toBe(true);
      const kinds = policyTurn(state).commands.map((command) => command.kind);
      const firstUnit = kinds.findIndex(
        (kind) => kind === "TRAIN" || kind === "LAY_EGG",
      );
      // The opener is free and comes first; the next technology is paid.
      const paidResearch = kinds.indexOf(
        "RESEARCH",
        kinds.indexOf("RESEARCH") + 1,
      );
      expect(firstUnit, faction).toBeGreaterThanOrEqual(0);
      if (paidResearch >= 0)
        expect(firstUnit, faction).toBeLessThan(paidResearch);
    }
  });

  it("a Human and a Goblin seat keep their own order with their units, and in peace", () => {
    for (const faction of ["ORIGINAL", "GOBLIN"] as const) {
      // Five units on three cities: not short.
      const full = inspectNormalArmyV7(
        thirdPassViewV7(thin(faction, { units: 5 })),
      );
      expect(full.war, faction).toBe(true);
      expect(full.bodiesFirst, faction).toBe(false);
      // No enemy army in the field (the enemy city is known): the due
      // technology before the units, as tuning 6 has it.
      const peace = inspectNormalArmyV7(
        thirdPassViewV7(thin(faction, { war: false })),
      );
      expect(peace.war, faction).toBe(false);
      expect(peace.bodiesFirst, faction).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// pulp_wars-9s0.14, the overseas invasion.
// ---------------------------------------------------------------------------

/**
 * Four seats. Seat 0's land is the north shore (rows 0 to 2) with its
 * capital on (1, 2) and its Port on (1, 3). Three islands lie across five
 * rows of water: the west one (x 0 to 2) with the Undead capital on
 * (1, 9), the middle one (x 4 to 6) with the Goblin capital on (5, 9), and
 * the east one (x 8 to 10) with the Martian capital on (9, 8).
 */
const ISLANDS: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "...~...~...",
  "...~...~...",
  "...~...~...",
];
const HOME_CAPITAL = at(1, 2);
const HOME_PORT = at(1, 3);
const WEST = at(1, 9);
const MIDDLE = at(5, 9);
const EAST = at(9, 8);

const islands = (units: readonly CoordV7[]): GameStateV7 =>
  thirdPassArenaV7({
    mapType: "CONTINENTS",
    terrain: ISLANDS,
    ports: [HOME_PORT],
    seats: [
      {
        faction: "ORIGINAL",
        cities: [HOME_CAPITAL],
        technologies: NAVAL,
        units: [HOME_CAPITAL, ...units].map((where) => ({
          role: "FIGHTER" as const,
          at: where,
        })),
      },
      {
        faction: "UNDEAD",
        cities: [WEST],
        units: [{ role: "FIGHTER", at: WEST }],
      },
      {
        faction: "GOBLIN",
        cities: [MIDDLE],
        units: [{ role: "FIGHTER", at: MIDDLE }],
      },
      {
        faction: "MARTIAN",
        cities: [EAST],
        units: [{ role: "FIGHTER", at: EAST }],
      },
    ],
  });

const planOf = (state: GameStateV7) =>
  inspectNormalNavalPlanV7(thirdPassViewV7(state));

describe("one overseas target with four seats (pulp_wars-9s0.14)", () => {
  // The west and the middle capital are 7 tiles from seat 0's capital, the
  // east one 8: the target is the west one (the tie goes to the lower x).

  it("is the hostile city nearest an own city, wherever the units stand", () => {
    // A unit in the far east corner of the home shore is nearest the east
    // capital (6 tiles; the west one is 9): the plan used to count from the
    // nearest capture unit, so that unit turned the whole plan east.
    for (const units of [[], [at(10, 2)], [at(0, 0), at(10, 0), at(5, 1)]])
      expect(planOf(islands(units))).toMatchObject({
        active: true,
        target: WEST,
      });
  });

  it("is kept when every capture unit is aboard", () => {
    // With no capture unit ashore the order used to fall back on board
    // position (the lowest row first: the east capital).
    const state = aboard(islands([at(10, 2)]), [
      [HOME_CAPITAL, at(1, 4)],
      [at(10, 2), at(9, 4)],
    ]);
    expect(planOf(state)).toMatchObject({ active: true, target: WEST });
    // The transport in the east sails west with the other one.
    const east = thirdPassUnitAtV7(state, at(9, 4));
    const best = candidatesOf(thirdPassViewV7(state), east)[0];
    expect(best?.score.priority).toBe(1230);
    expect(endOf(best?.command ?? { kind: "END_TURN" })?.x).toBeLessThan(9);
  });

  it("is kept when the first unit has landed, and the rest of the wave follows it", () => {
    // A landed unit used to make its landmass "reachable": the plan turned
    // to the next overseas city with the wave still at sea, and with no
    // transport left the units at home stopped boarding.
    const start = islands([at(10, 2), at(0, 2)]);
    const landed = thirdPassPatchV7(
      aboard(start, [[at(10, 2), at(2, 6)]]),
      new Map([[thirdPassUnitAtV7(start, at(0, 2)), { at: at(0, 8) }]]),
    );
    expect(planOf(landed)).toMatchObject({ active: true, target: WEST });
    const view = thirdPassViewV7(landed);
    // The transport closes on the west coast.
    const transport = candidatesOf(view, thirdPassUnitAtV7(landed, at(2, 6)));
    expect(transport[0]?.score.priority).toBe(1230);
    expect(endOf(transport[0]?.command ?? { kind: "END_TURN" })?.y).toBe(7);
    // The unit at home boards.
    const home = candidatesOf(view, thirdPassUnitAtV7(landed, HOME_CAPITAL));
    expect(home[0]?.command).toMatchObject({ kind: "MOVE", path: [HOME_PORT] });
    expect(home[0]?.score.priority).toBe(1300);
    // With the unit ashore and no transport at all the plan is still on.
    const ashore = thirdPassPatchV7(
      start,
      new Map([
        [thirdPassUnitAtV7(start, at(0, 2)), { at: at(0, 8) }],
        [thirdPassUnitAtV7(start, at(10, 2)), { at: at(2, 8) }],
      ]),
    );
    expect(planOf(ashore)).toMatchObject({ active: true, target: WEST });
    // The landed units do not board again: they have the city in front.
    expect(
      candidatesOf(
        thirdPassViewV7(ashore),
        thirdPassUnitAtV7(ashore, at(0, 8)),
      ).some(
        (item) =>
          item.command.kind === "MOVE" && endsOn(item.command, HOME_PORT),
      ),
    ).toBe(false);
  });
});

/** A strait of five rows of water between two shores. */
const STRAIT: readonly string[] = [
  "...........",
  "...........",
  "...........",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "~~~~~~~~~~~",
  "...........",
  "...........",
  "...........",
];

function strait(
  terrain: readonly string[],
  options: {
    readonly capital: CoordV7;
    readonly ports: readonly CoordV7[];
    readonly enemy: CoordV7;
    readonly units?: readonly (readonly [UnitRoleIdV7, CoordV7])[];
    readonly coins?: number;
    readonly technologies?: readonly TechnologyIdV7[];
  },
): GameStateV7 {
  return thirdPassArenaV7({
    mapType: "CONTINENTS",
    terrain,
    ports: options.ports,
    seats: [
      {
        faction: "ORIGINAL",
        cities: [options.capital],
        technologies: options.technologies ?? NAVAL,
        coins: options.coins ?? 0,
        units: [
          { role: "FIGHTER", at: options.capital },
          ...(options.units ?? []).map(([role, where]) => ({
            role,
            at: where,
          })),
        ],
      },
      {
        faction: "UNDEAD",
        cities: [options.enemy],
        units: [{ role: "FIGHTER", at: options.enemy }],
      },
    ],
  });
}

describe("the landing coast and the Port that serves it (pulp_wars-9s0.14)", () => {
  it("lands on the coast its transports can reach, not on a lake behind the city", () => {
    // The enemy capital on (5, 9) with a lake of one tile behind it on
    // (5, 10): the capital itself stands on that lake's shore, so the
    // nearest "coast" of the old plan was the capital's own tile, the water
    // to sail to was the lake, and no transport had a route. The sea coast
    // is row 7, two steps from the capital.
    const state = strait(
      [
        "...........",
        "...........",
        "...........",
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "~~~~~~~~~~~",
        "...........",
        "...........",
        "...........",
        ".....~.....",
      ],
      {
        capital: at(5, 2),
        ports: [at(4, 3)],
        enemy: at(5, 9),
        units: [["FIGHTER", at(3, 2)]],
      },
    );
    const sailing = aboard(state, [[at(3, 2), at(4, 4)]]);
    const plan = planOf(sailing);
    expect(plan).toMatchObject({ active: true, target: at(5, 9) });
    expect(plan.servingPorts).toEqual([at(4, 3)]);
    expect(plan.landing.length).toBeGreaterThan(0);
    for (const tile of plan.landing) expect(tile.y).toBe(7);
    // The transport has a route: it sails on.
    const best = candidatesOf(
      thirdPassViewV7(sailing),
      thirdPassUnitAtV7(sailing, at(4, 4)),
    )[0];
    expect(best?.score.priority).toBe(1230);
    expect(endOf(best?.command ?? { kind: "END_TURN" })?.y).toBe(6);
  });

  // The home shore with a pond on (1, 1) inside the capital's land, and
  // the enemy across the strait.
  const POND: readonly string[] = [
    "...........",
    ".~.........",
    "...........",
    ...STRAIT.slice(3),
  ];
  const POND_PORT = at(1, 1);

  it("does not board at a Port on a pond, and builds the Port on the sea", () => {
    const state = strait(POND, {
      capital: at(2, 2),
      ports: [POND_PORT],
      enemy: at(5, 9),
      coins: 12,
    });
    const view = thirdPassViewV7(state);
    expect(planOf(state)).toMatchObject({
      active: true,
      target: at(5, 9),
      servingPorts: [],
      portMissing: true,
      // The Coins of a Port are kept, as for a seat with no Port.
      reserveCoins: 4,
    });
    const unit = thirdPassUnitAtV7(state, at(2, 2));
    // It used to board at the pond (1300) and wait there aboard for good.
    expect(
      candidatesOf(view, unit).some((item) => endsOn(item.command, POND_PORT)),
    ).toBe(false);
    const choice = chooseNormalCommandV7(view);
    expect(choice.command).toMatchObject({ kind: "BUILD_PORT" });
    expect(choice.candidates[0]?.score.priority).toBe(1285);
    const site =
      choice.command?.kind === "BUILD_PORT" ? choice.command.at : null;
    expect(site?.y).toBe(3);
    // With that Port the seat is served, and the unit boards there.
    const built = thirdPassAcceptV7(state, 0, choice.command as CommandV7);
    expect(planOf(built)).toMatchObject({
      servingPorts: [site],
      portMissing: false,
    });
    const boarding = candidatesOf(thirdPassViewV7(built), unit)[0];
    expect(boarding?.command).toMatchObject({ kind: "MOVE", path: [site] });
    expect(boarding?.score.priority).toBe(1300);
  });

  it("boards at any Port while no Port site of its own would serve either", () => {
    // Without the Coins nothing is offered, but a Port site exists: the
    // unit waits for the Port. Without a site (the sea outside every own
    // territory is not one) the old rule stands.
    const state = strait(POND, {
      capital: at(2, 2),
      ports: [POND_PORT],
      enemy: at(5, 9),
    });
    expect(planOf(state)).toMatchObject({ portMissing: true });
    const inland = strait(
      [
        "...........",
        ".~.........",
        "...........",
        "...........",
        ...STRAIT.slice(3, 7),
        ...STRAIT.slice(8),
      ],
      { capital: at(2, 2), ports: [POND_PORT], enemy: at(5, 9) },
    );
    expect(planOf(inland)).toMatchObject({
      active: true,
      servingPorts: [],
      portMissing: false,
    });
    expect(
      candidatesOf(
        thirdPassViewV7(inland),
        thirdPassUnitAtV7(inland, at(2, 2)),
      ).some((item) => endsOn(item.command, POND_PORT)),
    ).toBe(true);
  });
});

describe("a wave boards and lands together (pulp_wars-9s0.14)", () => {
  const PORT = at(4, 3);
  const gather = (others: readonly CoordV7[]): GameStateV7 =>
    strait(STRAIT, {
      capital: at(5, 2),
      ports: [PORT],
      enemy: at(5, 9),
      units: others.map((where) => ["FIGHTER", where] as const),
    });
  const boardsNow = (state: GameStateV7, from: CoordV7): boolean =>
    candidatesOf(thirdPassViewV7(state), thirdPassUnitAtV7(state, from)).some(
      (item) => endsOn(item.command, PORT),
    );

  it("a unit beside the Port waits for the units that are on their way to it", () => {
    // Two more Fighters four and five tiles from the Port, each with a Move
    // that brings it nearer: the two beside the Port wait, the others come.
    const state = gather([at(3, 2), at(8, 1), at(9, 0)]);
    expect(boardsNow(state, at(5, 2))).toBe(false);
    expect(boardsNow(state, at(3, 2))).toBe(false);
    for (const from of [at(8, 1), at(9, 0)]) {
      const best = candidatesOf(
        thirdPassViewV7(state),
        thirdPassUnitAtV7(state, from),
      )[0];
      expect(best?.score.priority).toBe(820);
      expect(endOf(best?.command ?? { kind: "END_TURN" })?.x).toBeLessThan(
        from.x,
      );
    }
  });

  it("three units gathered board at once, and so does a unit with nobody coming", () => {
    const three = gather([at(3, 2), at(5, 1), at(9, 0)]);
    expect(boardsNow(three, at(5, 2))).toBe(true);
    expect(boardsNow(three, at(3, 2))).toBe(true);
    expect(boardsNow(gather([]), at(5, 2))).toBe(true);
    // A unit far along the shore is not waited for.
    expect(boardsNow(gather([at(10, 0)]), at(5, 2))).toBe(true);
  });

  it("a wave that has begun to leave is followed at once", () => {
    const start = gather([at(3, 2), at(2, 2), at(8, 1)]);
    // Two transports two tiles off the Port, one unit beside it, one coming.
    const state = aboard(start, [
      [at(3, 2), at(4, 5)],
      [at(2, 2), at(3, 5)],
    ]);
    expect(boardsNow(state, at(5, 2))).toBe(true);
  });

  const COAST = at(5, 7);
  /** `aboardAt`: the tiles of seat 0's transports; the capital keeps its unit. */
  const landing = (aboardAt: readonly CoordV7[]): GameStateV7 => {
    const homes = [at(3, 2), at(2, 2), at(1, 2), at(0, 2)].slice(
      0,
      aboardAt.length,
    );
    const start = gather(homes);
    return aboard(
      start,
      aboardAt.map((to, index) => [homes[index] as CoordV7, to] as const),
    );
  };
  const landsNow = (state: GameStateV7, from: CoordV7): boolean =>
    candidatesOf(thirdPassViewV7(state), thirdPassUnitAtV7(state, from)).some(
      (item) => item.command.kind === "DISEMBARK",
    );

  it("a transport at the coast waits for the one close behind it, and stays where it is", () => {
    const state = landing([COAST, at(5, 4)]);
    const first = thirdPassUnitAtV7(state, COAST);
    expect(candidatesOf(thirdPassViewV7(state), first)).toEqual([]);
    // The one behind comes up.
    const second = candidatesOf(
      thirdPassViewV7(state),
      thirdPassUnitAtV7(state, at(5, 4)),
    )[0];
    expect(second?.score.priority).toBe(1230);
  });

  it("lands at once alone, with three at the coast, beside a beachhead, or when the one behind is stuck", () => {
    expect(landsNow(landing([COAST]), COAST)).toBe(true);
    // The other transport is too far behind to wait for.
    expect(landsNow(landing([COAST, at(5, 3)]), COAST)).toBe(true);
    // Three at the coast: the wave is there, whoever follows.
    const three = landing([COAST, at(4, 7), at(6, 7), at(5, 5)]);
    for (const from of [COAST, at(4, 7), at(6, 7)])
      expect(landsNow(three, from)).toBe(true);
    // An own unit already ashore beside it: the landing has begun.
    const start = landing([COAST, at(5, 4)]);
    const beachhead = thirdPassPatchV7(
      start,
      new Map([[thirdPassUnitAtV7(start, at(5, 2)), { at: at(6, 8) }]]),
    );
    expect(landsNow(beachhead, COAST)).toBe(true);
    // The one behind has no Move along the route (it floats on a lake of
    // one tile on the far shore): it is not waited for.
    const blocked = strait(
      [...STRAIT.slice(0, 9), "........~..", "..........."],
      {
        capital: at(5, 2),
        ports: [PORT],
        enemy: at(5, 9),
        units: [
          ["FIGHTER", at(3, 2)],
          ["FIGHTER", at(2, 2)],
        ],
      },
    );
    const stuck = aboard(blocked, [
      [at(3, 2), at(6, 7)],
      [at(2, 2), at(8, 9)],
    ]);
    expect(landsNow(stuck, at(6, 7))).toBe(true);
  });

  it("the wave comes ashore in one turn, side by side", () => {
    // Two transports at the coast and a third two tiles behind: the policy's
    // own commands, two turns of seat 0 (the enemy only ends its turn).
    let state = landing([COAST, at(4, 7), at(6, 5)]);
    const first = policyTurn(state);
    expect(first.commands.some((command) => command.kind === "DISEMBARK")).toBe(
      false,
    );
    state = thirdPassNextTurnV7(first.state);
    const second = policyTurn(state);
    const landed = second.commands.flatMap((command) =>
      command.kind === "DISEMBARK" ? [command.at] : [],
    );
    expect(landed).toHaveLength(3);
    expect(
      new Set(landed.map((tile) => `${String(tile.x)},${String(tile.y)}`)).size,
    ).toBe(3);
    for (const tile of landed) expect(tile.y).toBe(8);
    // Side by side: three tiles in a row along the coast.
    const xs = landed.map((tile) => tile.x).sort((left, right) => left - right);
    expect((xs[2] ?? 0) - (xs[0] ?? 0)).toBe(2);
  });

  it("a village is landed on at once", () => {
    // No hostile city on the far shore: nothing to wait for.
    const start = thirdPassArenaV7({
      mapType: "CONTINENTS",
      terrain: STRAIT,
      ports: [PORT],
      villages: [at(5, 9)],
      seats: [
        {
          faction: "ORIGINAL",
          cities: [at(5, 2)],
          technologies: NAVAL,
          units: [at(5, 2), at(3, 2), at(2, 2)].map((where) => ({
            role: "FIGHTER" as const,
            at: where,
          })),
          explored: [{ x0: 0, y0: 0, x1: 10, y1: 9 }],
        },
        {
          faction: "UNDEAD",
          cities: [at(9, 1)],
          units: [{ role: "FIGHTER", at: at(9, 1) }],
          explored: [{ x0: 8, y0: 0, x1: 10, y1: 2 }],
        },
      ],
    });
    const state = aboard(start, [
      [at(3, 2), COAST],
      [at(2, 2), at(5, 4)],
    ]);
    expect(landsNow(state, COAST)).toBe(true);
  });
});

describe("the escort (pulp_wars-9s0.14)", () => {
  it("a warship with no enemy ship in sight sails with the transports", () => {
    const start = strait(STRAIT, {
      capital: at(5, 2),
      ports: [at(4, 3)],
      enemy: at(5, 9),
      units: [
        ["FIGHTER", at(3, 2)],
        ["PATROL_BOAT", at(9, 3)],
      ],
    });
    const state = aboard(start, [[at(3, 2), at(4, 5)]]);
    const best = candidatesOf(
      thirdPassViewV7(state),
      thirdPassUnitAtV7(state, at(9, 3)),
    )[0];
    expect(best?.score.priority).toBe(830);
    expect(endOf(best?.command ?? { kind: "END_TURN" })?.x).toBeLessThan(9);
  });
});
