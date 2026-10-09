import { describe, expect, it } from "vitest";
import {
  createPlayableGameV7,
  missionByIdV7,
  parseGameStateV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import {
  candyFieldV7,
  crumbsOnV7,
  exchangeV7,
  rushAtV7,
} from "../fixtures/v7-candy";
import {
  applyOkV7,
  goblinSetupV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  expectOfferedAcceptedV7,
  hasUnitAtV7,
  offeredV7,
  playV7,
  rejectedV7,
} from "../fixtures/v7-martian";
import { activeIdV7, at, attackV7, kindsV7 } from "../fixtures/v7-revision20";

// The Candy revision (`pulp_wars-jdb.3`): interactions with the other seven
// factions' rules, Mind Control, and the setups
// (docs/product/RULESET_7_CANDY.md section 12). The Splat, Bounce, and
// eating rows that name one unit are in ruleset-v7-candy-combat.test.ts and
// ruleset-v7-candy-crumbs.test.ts.

function endTurn(state: GameStateV7) {
  return applyOkV7(state, activeIdV7(state), { kind: "END_TURN" });
}

const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;

function moveTo(state: GameStateV7, from: CoordV7, to: CoordV7) {
  const unit = unitAtV7(state, from);
  const command = offeredV7(state, "MOVE").find(
    (candidate) =>
      candidate.kind === "MOVE" &&
      candidate.unitId === unit.id &&
      sameV7(candidate.path.at(-1) as CoordV7, to),
  );
  if (command === undefined) throw new Error("no Move to the tile");
  return playV7(state, command);
}

const eaten = (events: readonly DomainEventV7[]) =>
  events.filter((event) => event.kind === "CRUMBS_EATEN");

describe("no Candy rule exists without a Candy seat (section 17)", () => {
  it("offers no Candy command and keeps the four lists empty for every other pairing", () => {
    const others: readonly FactionIdV7[] = [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
    ];
    for (const [index, faction] of others.entries()) {
      const other = others[(index + 1) % others.length] as FactionIdV7;
      const state = candyFieldV7(
        [
          { seat: 0, role: "FIGHTER", at: at(5, 3) },
          { seat: 0, role: "CAPTAIN", at: at(4, 3), hp: 5 },
          { seat: 0, role: "MARKSMAN", at: at(6, 3) },
          { seat: 1, role: "GUARD", at: at(5, 2) },
        ],
        { factions: [faction, other] },
      );
      const kinds = new Set(offeredV7(state).map((command) => command.kind));
      for (const kind of ["SUGAR_RUSH", "REBAKE", "SUGAR_TOSS"] as const) {
        expect(kinds.has(kind), `${faction} ${kind}`).toBe(false);
        const command = (
          kind === "SUGAR_RUSH"
            ? { kind, unitId: idAt(state, at(5, 3)) }
            : kind === "REBAKE"
              ? { kind, unitId: idAt(state, at(4, 3)), at: at(4, 4) }
              : {
                  kind,
                  unitId: idAt(state, at(6, 3)),
                  targetUnitId: idAt(state, at(4, 3)),
                }
        ) as CommandV7;
        expect(rejectedV7(state, command).code, `${faction} ${kind}`).toBe(
          "UNIT_ROLE_INVALID",
        );
      }
      const run = attackV7(state, at(5, 3), at(5, 2));
      expect(run.combat, faction).toMatchObject({
        sugarRushApplied: false,
        splatApplied: false,
        bounce: "NONE",
        bounceTo: null,
      });
      const ended = endTurn(run.state);
      expect([
        ended.state.sugarRush,
        ended.state.crumbs,
        ended.state.splattedThisTurn,
        ended.state.tossedThisTurn,
      ]).toEqual([[], [], [], []]);
      const kindsOf = kindsV7([...run.events, ...ended.events]);
      for (const kind of [
        "UNITS_CRASHED",
        "CRUMBS_STALE",
        "CRUMBS_LEFT",
        "CRUMBS_EATEN",
        "UNIT_SUGAR_RUSHED",
      ])
        expect(kindsOf, `${faction} ${kind}`).not.toContain(kind);
      // A Candy entry in such a match is refused.
      expect(
        parseGameStateV7({
          ...state,
          splattedThisTurn: [idAt(state, at(5, 2))],
        }),
      ).toBeNull();
    }
  });
});

describe("Mind Control (section 12.5)", () => {
  const BRAIN = at(5, 4);

  it("takes a Candy unit at 6 HP or less with its Rush entry, and never the Golem", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        { seat: 1, role: "FIGHTER", at: at(5, 3), hp: 6, rush: "CRASHED" },
        { seat: 1, role: "JUGGERNAUT", at: at(4, 3), hp: 5 },
        { seat: 1, role: "KNIGHT", at: at(6, 3), hp: 7 },
      ],
      { factions: ["MARTIAN", "CANDY"] },
    );
    const brain = idAt(state, BRAIN);
    const offered = expectOfferedAcceptedV7(state, "MIND_CONTROL");
    expect(offered).toEqual([
      {
        kind: "MIND_CONTROL",
        unitId: brain,
        targetUnitId: idAt(state, at(5, 3)),
      },
    ]);
    const taken = playV7(state, offered[0] as CommandV7);
    expect(unitAtV7(taken.state, at(5, 3)).ownerId).toBe(seatIdV7(state, 0));
    // The entry belongs to the unit: it survives the change of owner, and
    // ends at the End Turn of whoever owns the unit then.
    expect(rushAtV7(taken.state, at(5, 3))).toBe("CRASHED");
    expect(rushAtV7(endTurn(taken.state).state, at(5, 3))).toBeNull();
  });

  it("a controlled Candy unit follows the body rules for its controller and the seat rules of its controller", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        {
          seat: 1,
          role: "RAIDER",
          at: at(5, 3),
          hp: 6,
          controlledBy: BRAIN,
        },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["MARTIAN", "CANDY"],
        crumbs: [{ at: at(5, 1), role: "KNIGHT", seat: 1 }],
      },
    );
    // It Rushes for its controller (three tiles), keeps its perk, and eats
    // the Candy seat's Crumbs: its owner is hostile to that seat.
    const rushed = playV7(state, {
      kind: "SUGAR_RUSH",
      unitId: idAt(state, at(5, 3)),
    }).state;
    const moved = moveTo(rushed, at(5, 3), at(5, 1));
    expect(eaten(moved.events)).toMatchObject([
      { playerId: seatIdV7(state, 1), damage: 3 },
    ]);
    expect(moved.state.crumbs).toEqual([]);
    expect(unitAtV7(moved.state, at(5, 1)).hp).toBe(3);
    // Psychic Command gives Inspired, and then the Rush bonus does not add.
    const inspired = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 6,
          controlledBy: BRAIN,
          rush: "RUSHED",
          activation: { inspired: true },
        },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
      { factions: ["MARTIAN", "CANDY"] },
    );
    expect(exchangeV7(inspired, at(5, 3), at(5, 2))).toMatchObject({
      inspiredApplied: true,
      sugarRushApplied: false,
      attack2: 6,
    });
  });

  it("releases a controlled unit with its entries when the Brain dies", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "CAPTAIN", at: BRAIN, hp: 1 },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 6,
          controlledBy: BRAIN,
          rush: "RUSHED",
        },
        { seat: 1, role: "KNIGHT", at: at(5, 5) },
      ],
      { factions: ["MARTIAN", "CANDY"], activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 5), BRAIN);
    expect(kindsV7(run.events)).toContain("UNIT_RELEASED");
    expect(unitAtV7(run.state, at(5, 3)).ownerId).toBe(seatIdV7(state, 1));
    expect(rushAtV7(run.state, at(5, 3))).toBe("RUSHED");
    // The Candy seat's End Turn Crashes it; the next one ends the Crash.
    const crashed = endTurn(run.state).state;
    expect(rushAtV7(crashed, at(5, 3))).toBe("CRASHED");
  });
});

describe("the other factions' displacements and placements (sections 12.1 to 12.7)", () => {
  it("a pushed unit keeps its Rush entry", () => {
    const state = candyFieldV7(
      [
        { seat: 1, role: "JUGGERNAUT", at: at(5, 5) },
        { seat: 0, role: "GUARD", at: at(5, 4), rush: "CRASHED" },
      ],
      { activeSeat: 1 },
    );
    const run = attackV7(state, at(5, 5), at(5, 4));
    expect(run.combat.push).toBe("WILL_PUSH");
    expect(run.target?.at).toEqual(at(5, 3));
    expect(rushAtV7(run.state, at(5, 3))).toBe("CRASHED");
  });

  it("a Tractor Beam pulls a Crashed unit, which keeps its entry and eats nothing", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(5, 2) },
        { seat: 1, role: "FIGHTER", at: at(5, 5), rush: "CRASHED" },
      ],
      {
        factions: ["MARTIAN", "CANDY"],
        crumbs: [
          { at: at(5, 3), role: "FIGHTER", seat: 1 },
          { at: at(5, 4), role: "FIGHTER", seat: 1 },
        ],
      },
    );
    const pulls = expectOfferedAcceptedV7(state, "TRACTOR_BEAM");
    expect(pulls.length).toBeGreaterThan(0);
    const pulled = playV7(state, pulls[0] as CommandV7);
    expect(eaten(pulled.events)).toEqual([]);
    expect(pulled.state.crumbs).toHaveLength(2);
    expect(pulled.state.sugarRush).toEqual([
      { unitId: idAt(state, at(5, 5)), phase: "CRASHED" },
    ]);
  });

  it("a Beam Down onto Crumbs is a placement: nothing is eaten", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "RAIDER", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      {
        factions: ["MARTIAN", "CANDY"],
        crumbs: [{ at: at(4, 2), role: "FIGHTER", seat: 1 }],
      },
    );
    const beam = offeredV7(state, "BEAM_DOWN").find(
      (command) => command.kind === "BEAM_DOWN" && sameV7(command.to, at(4, 2)),
    );
    if (beam === undefined) throw new Error("no Beam Down onto the Crumbs");
    const landed = playV7(state, beam);
    expect(hasUnitAtV7(landed.state, at(4, 2))).toBe(true);
    expect(eaten(landed.events)).toEqual([]);
    expect(crumbsOnV7(landed.state, at(4, 2))).toBeDefined();
    // The Grunt that walks off them and back eats them.
    const next = endTurn(endTurn(landed.state).state).state;
    const away = moveTo(next, at(4, 2), at(4, 1));
    expect(eaten(away.events)).toEqual([]);
    expect(crumbsOnV7(away.state, at(4, 2))).toBeDefined();
  });

  it("a Shatter leaves the shattered Candy unit's Crumbs", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(4, 3) },
        {
          seat: 1,
          role: "FIGHTER",
          at: at(5, 3),
          hp: 7,
          frozen: { turnsLeft: 1 },
        },
      ],
      {
        factions: ["ICE_FOLK", "CANDY"],
        techs: { 0: ["SCOUTING", "RAIDING"] },
      },
    );
    const run = attackV7(state, at(4, 3), at(5, 3));
    expect(run.combat.shatters).toBe(true);
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: idAt(state, at(5, 3)),
      cause: "SHATTER",
    });
    expect(run.state.crumbs).toMatchObject([{ at: at(5, 3), role: "FIGHTER" }]);
    expect(kindsV7(run.events)).not.toContain("GRAVE_CREATED");
  });

  it("a Sugar Frenzy takes an exploding unit's blast like any Overrun, and may continue after it", () => {
    const state = candyFieldV7(
      [
        { seat: 0, role: "KNIGHT", at: at(2, 3), rush: "RUSHED" },
        { seat: 1, role: "MARKSMAN", at: at(3, 3), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(4, 3), hp: 1 },
      ],
      { factions: ["CANDY", "GOBLIN"] },
    );
    const run = attackV7(state, at(2, 3), at(3, 3));
    expect(kindsV7(run.events)).toContain("EXPLOSION_RESOLVED");
    const bear = run.attacker;
    if (bear === undefined) throw new Error("the Bear died");
    expect(bear.hp).toBeLessThan(14);
  });

  it("Wail and Lich splash deaths leave Crumbs", () => {
    const wail = candyFieldV7(
      [
        { seat: 1, role: "MARKSMAN", at: at(5, 3) },
        { seat: 0, role: "FIGHTER", at: at(5, 2), hp: 1 },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      { factions: ["CANDY", "UNDEAD"], activeSeat: 1 },
    );
    const wails = offeredV7(wail, "WAIL");
    if (wails.length > 0) {
      const result = playV7(wail, wails[0] as CommandV7);
      if (!hasUnitAtV7(result.state, at(5, 2)))
        expect(result.state.crumbs).toMatchObject([{ at: at(5, 2) }]);
    }
    const lich = candyFieldV7(
      [
        { seat: 1, role: "CATAPULT", at: at(5, 5) },
        { seat: 0, role: "GUARD", at: at(5, 2) },
        { seat: 0, role: "FIGHTER", at: at(5, 1), hp: 1 },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
      ],
      { factions: ["CANDY", "UNDEAD"], activeSeat: 1 },
    );
    const run = attackV7(lich, at(5, 5), at(5, 2));
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: idAt(lich, at(5, 1)),
      cause: "SPLASH",
    });
    expect(run.state.crumbs).toMatchObject([{ at: at(5, 1), role: "FIGHTER" }]);
  });
});

describe("setups (sections 2.4, 12.10, and 12.17)", () => {
  it("starts every setup with a Candy seat with the four lists empty", () => {
    for (const factions of [
      ["CANDY", "ORIGINAL"],
      ["UNDEAD", "CANDY"],
      ["GOBLIN", "CANDY", "MARTIAN"],
      ["DINOSAUR", "ICE_FOLK", "DWARF", "CANDY"],
    ] as const) {
      const created = createPlayableGameV7(goblinSetupV7(factions));
      if (!created.ok) throw new Error(created.error.code);
      const { state } = created;
      expect([
        state.sugarRush,
        state.crumbs,
        state.splattedThisTurn,
        state.tossedThisTurn,
      ]).toEqual([[], [], [], []]);
      // The first turn of every seat offers only accepted commands.
      const actor = activeIdV7(state);
      for (const command of queryPlayerCommandsV7(viewForV7(state, actor)))
        expect(
          applyOkV7(state, actor, command).state.rulesetId,
          JSON.stringify(command),
        ).toBe(state.rulesetId);
    }
  });

  it("keeps the teaser missions free of the Candy", () => {
    for (const id of ["FRONTIER_1", "FRONTIER_2", "FRONTIER_3", "FRONTIER_4"])
      expect(JSON.stringify(missionByIdV7(id))).not.toContain("CANDY");
  });
});
