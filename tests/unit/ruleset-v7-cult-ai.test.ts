import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
} from "../../src/ai/v7";
import {
  ARMY_ESCORT_VALUE_V7,
  ARMY_PLAY_FACTIONS_V7,
  ARMY_RESEARCH_ROLES_V7,
  armyGarrisonYieldsToRangedV7,
  armyPlayFactionV7,
  armyRoleScoreV7,
  armySharesV7,
  setArmyPlayFactionsV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  CULT_ARMY_SHARES_V7,
  CULT_FAMILIAR_MAXIMUM_V7,
  CULT_FAMILIAR_PER_UNITS_V7,
  CULT_RESEARCH_ROLES_V7,
  CULT_STARS_FAVOUR_V7,
  CULT_STURDY_V7,
  CULT_SUMMONER_MAXIMUM_V7,
  CULT_SUMMONER_MINIMUM_V7,
  CULT_SUMMONER_PER_UNITS_V7,
  cultBackRowV7,
  cultBodiesV7,
  cultChosenCappedV7,
  cultEscortV7,
  cultFamiliarsWantedV7,
  cultHexersWantedV7,
  cultIdolBearerCappedV7,
  cultRobedV7,
  cultStarsDueV7,
  cultSummonersWantedV7,
  cultWeakLinkV7,
} from "../../src/ai/v7-cult";
import {
  FACTION_IDS_V7,
  TECHNOLOGY_IDS_V7,
  queryAiReadyCommandsV7,
  queryThreatenedTilesV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { cultFieldV7, withFavourV7, withHorrorV7 } from "../fixtures/v7-cult";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import { moveCandidateV7, unitCandidatesV7 } from "../fixtures/v7-dinosaur-ai";
import {
  applyOkV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import type { FieldOptionsV7 } from "../fixtures/v7-revision20";

// The Cult seat on the army policy (`pulp_wars-mch9.9`, bead A1 of
// docs/product/RULESET_7_CULTISTS.md section 15.1; `src/ai/v7-cult.ts`).
// A baseline designed from judgement: no match was played for this bead.
// Every rule is shown on a small hand-built state, as a decision: given
// this public view, the Cult seat names this technology, offers or refuses
// this Move, trains this unit, takes this reward.
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (the Cult, the
// viewer, to move) capital (8, 8) with territory x 7-9, y 7-9; seat 1
// (Human) capital (2, 8) with territory x 1-3, y 7-9; villages (5, 5),
// (8, 5), (5, 8); every other land tile open Grass; every tile explored;
// every technology and 100 Coins unless stated.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const own = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));
const techsWithout = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => !techs.includes(tech));

const asCult = (
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 => cultFieldV7(pieces, options);

/** The same with the Cult units homeless, so the capital keeps its slots. */
function orphans(state: GameStateV7): GameStateV7 {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.ownerId === seatIdV7(state, 0)
        ? { ...unit, homeCityId: null }
        : unit,
    ),
  };
}

function viewOf(state: GameStateV7): PlayerViewV7 {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("active player missing");
  return viewForV7(state, actor);
}

/** The active seat plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
} {
  const actor = start.turnOrder[start.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  const commands: CommandV7[] = [];
  let state = start;
  for (let accepted = 0; accepted < 128; accepted += 1) {
    const view = viewForV7(state, actor);
    const decision = chooseNormalCommandV7(view);
    const command = chooseNormalTurnCommandV7(view, accepted, 128, decision);
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
    // Every command the seat plays is one the engine offers it.
    expect(
      queryAiReadyCommandsV7(view).some(
        (item) => JSON.stringify(item.command) === JSON.stringify(command),
      ),
      command.kind,
    ).toBe(true);
    commands.push(command);
    state = applyOkV7(state, actor, command).state;
  }
  throw new Error("the turn did not end");
}

const research = (state: GameStateV7) =>
  inspectNormalArmyV7(viewOf(state)).research;

const counts = (
  byClass: Partial<ArmyCountsV7["byClass"]>,
  hostileFragile = 0,
): ArmyCountsV7 => {
  const full = {
    LINE: 0,
    DEFENDER: 0,
    RANGED: 0,
    SIEGE: 0,
    BREAKTHROUGH: 0,
    SKIRMISHER: 0,
    SUPPORT: 0,
    ...byClass,
  };
  return {
    total: Object.values(full).reduce((sum, value) => sum + value, 0),
    byClass: full,
    hostileFragile,
  };
};

/** The tiles the Move candidates of the unit on `from` end on. */
const ends = (state: GameStateV7, from: CoordV7): readonly CoordV7[] =>
  unitCandidatesV7(state, from, "MOVE").flatMap((candidate) => {
    const end =
      candidate.command.kind === "MOVE"
        ? candidate.command.path.at(-1)
        : undefined;
    return end === undefined ? [] : [end];
  });

const LAND_ROLES = [
  "FIGHTER",
  "RAIDER",
  "MARKSMAN",
  "GUARD",
  "CAPTAIN",
  "CATAPULT",
  "KNIGHT",
  "SWORDSMAN",
  "JUGGERNAUT",
] as const;

/** One Cult unit of every land role, far from the enemy. */
const roster = (): GameStateV7 =>
  asCult([
    ...LAND_ROLES.map((role, index) =>
      own(role, 6 + (index % 4), 1 + Math.floor(index / 4)),
    ),
    foe("FIGHTER", 2, 8),
  ]);

describe("the Cult seat: who plays the army rules", () => {
  const pieces = [own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)];

  it("counts the Cult among the army factions: every registered faction", () => {
    expect(ARMY_PLAY_FACTIONS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
      "CULT",
    ]);
    expect(armyPlayFactionV7("CULT")).toBe(true);
    expect(
      FACTION_IDS_V7.filter(
        (faction: FactionIdV7) => !ARMY_PLAY_FACTIONS_V7.includes(faction),
      ),
    ).toEqual([]);
  });

  it("is on for a Cult seat against every faction, and for every faction against it", () => {
    for (const other of ARMY_PLAY_FACTIONS_V7) {
      expect(
        inspectNormalArmyV7(
          viewOf(asCult(pieces, { factions: ["CULT", other] })),
        ).army,
        `CULT against ${other}`,
      ).toBe(true);
      // The Candy lesson: the Cult seat does not drag the other seat of its
      // match to the older policy.
      expect(
        inspectNormalArmyV7(
          viewOf(asCult(pieces, { factions: [other, "CULT"] })),
        ).army,
        `${other} against CULT`,
      ).toBe(true);
    }
  });

  it("is the older policy with the Cult taken out of the list (the tests' switch)", () => {
    const previous = setArmyPlayFactionsV7(
      ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "CULT"),
    );
    try {
      expect(inspectNormalArmyV7(viewOf(asCult(pieces))).army).toBe(false);
    } finally {
      setArmyPlayFactionsV7(previous);
    }
    expect(inspectNormalArmyV7(viewOf(asCult(pieces))).army).toBe(true);
  });
});

describe("the Cult seat: the research order", () => {
  const quiet = (
    techs: readonly TechnologyIdV7[],
    other: GoblinPieceV7 = foe("FIGHTER", 0, 0),
  ): GameStateV7 =>
    orphans(
      asCult(
        [
          own("FIGHTER", 9, 9),
          own("FIGHTER", 9, 8),
          own("FIGHTER", 9, 7),
          other,
        ],
        { techs: { 0: techsOf(...techs), 1: [] }, coins: 0 },
      ),
    );

  it("is the Summoner, the Hexer, the Idol Bearer, the Familiar, the Chosen, the Stargazer, the Caller", () => {
    expect(CULT_RESEARCH_ROLES_V7).toEqual([
      "CAPTAIN",
      "MARKSMAN",
      "GUARD",
      "RAIDER",
      "SWORDSMAN",
      "CATAPULT",
      "KNIGHT",
    ]);
    expect(ARMY_RESEARCH_ROLES_V7.CULT).toBe(CULT_RESEARCH_ROLES_V7);
  });

  it("buys, from a Gathering opener, the thirteen technologies of the spec in its order", () => {
    // Three Initiates for one city, no enemy in sight, no Coins: each
    // technology the seat names next, bought in turn. Leadership is the
    // second technology; Harvest Rites comes before the Chosen's chain.
    const order: string[] = [];
    let techs: readonly TechnologyIdV7[] = ["GATHERING"];
    for (let step = 0; step < 14; step += 1) {
      const next = research(quiet(techs));
      if (next === null) break;
      order.push(
        next.unlocks === null ? next.tech : `${next.tech}:${next.unlocks}`,
      );
      techs = [...techs, next.tech];
    }
    expect(order).toEqual([
      "ADMINISTRATION:CAPTAIN",
      "HUNTING",
      "MARKSMANSHIP:MARKSMAN",
      "DRILL",
      "FORTIFICATION:GUARD",
      "SCOUTING:RAIDER",
      "FARMING",
      "ENGINEERING",
      "METALLURGY:SWORDSMAN",
      "FORESTRY",
      "SAWMILLING:CATAPULT",
      "RAIDING",
      "CHIVALRY:KNIGHT",
    ]);
  });

  it("puts Hexers first with a hostile Raider or Knight in sight, and not with a Fighter", () => {
    expect(cultHexersWantedV7([])).toBe(false);
    for (const [role, wanted] of [
      ["FIGHTER", false],
      ["MARKSMAN", false],
      ["RAIDER", true],
      ["KNIGHT", true],
    ] as const) {
      const state = quiet(["GATHERING"], foe(role, 5, 9));
      const view = viewOf(state);
      expect(
        cultHexersWantedV7(
          view.units.filter((unit) => unit.ownerId !== view.viewer.id),
        ),
        role,
      ).toBe(wanted);
      // Hunting is the first step to Hexers; Leadership is the order's.
      expect(research(state)?.tech, role).toBe(
        wanted ? "HUNTING" : "ADMINISTRATION",
      );
    }
    // With Hunting owned the next step is Hexers itself; with Hexers owned
    // the order goes on.
    expect(
      research(quiet(["GATHERING", "HUNTING"], foe("KNIGHT", 5, 9))),
    ).toMatchObject({ tech: "MARKSMANSHIP", unlocks: "MARKSMAN" });
    expect(
      research(
        quiet(["GATHERING", "HUNTING", "MARKSMANSHIP"], foe("KNIGHT", 5, 9)),
      )?.tech,
    ).toBe("ADMINISTRATION");
  });

  it("makes The Stars Are Right its first late technology once Favour has reached 12", () => {
    expect(CULT_STARS_FAVOUR_V7).toBe(12);
    // Every unit of the order is unlocked, an enemy army is at the gates,
    // and Fieldcraft (the first late technology of every seat) and The
    // Stars Are Right are both to buy.
    const late = (favour: number): GameStateV7 =>
      withFavourV7(
        orphans(
          asCult(
            [
              own("FIGHTER", 9, 9),
              own("FIGHTER", 9, 8),
              own("FIGHTER", 9, 7),
              foe("FIGHTER", 5, 8),
              foe("FIGHTER", 5, 7),
            ],
            {
              techs: { 0: techsWithout("FIELDCRAFT", "EXPLOSIVES"), 1: [] },
              coins: 0,
            },
          ),
        ),
        0,
        favour,
      );
    expect(inspectNormalArmyV7(viewOf(late(12))).war).toBe(true);
    expect(cultStarsDueV7(viewOf(late(11)))).toBe(false);
    expect(cultStarsDueV7(viewOf(late(12)))).toBe(true);
    expect(research(late(11))?.tech).toBe("FIELDCRAFT");
    expect(research(late(12))?.tech).toBe("EXPLOSIVES");
  });
});

describe("the Cult seat: the army", () => {
  it("has its shares: 45 line, 10 Idol Bearers, 20 Hexers, 10 Stargazers, 10 Callers", () => {
    expect(CULT_ARMY_SHARES_V7).toEqual({
      LINE: 45,
      DEFENDER: 10,
      RANGED: 20,
      SIEGE: 10,
      BREAKTHROUGH: 10,
    });
    expect(armySharesV7("CULT", false)).toBe(CULT_ARMY_SHARES_V7);
    expect(armySharesV7("CULT", true)).toBe(CULT_ARMY_SHARES_V7);
  });

  it("wants one Summoner for every six units, at least one and at most three", () => {
    expect([
      CULT_SUMMONER_PER_UNITS_V7,
      CULT_SUMMONER_MINIMUM_V7,
      CULT_SUMMONER_MAXIMUM_V7,
    ]).toEqual([6, 1, 3]);
    expect([0, 3, 6, 11, 12, 18, 40].map(cultSummonersWantedV7)).toEqual([
      1, 1, 1, 1, 2, 3, 3,
    ]);
    const summoner = (line: number, support: number): number =>
      armyRoleScoreV7(
        "CULT",
        "CAPTAIN",
        counts({ LINE: line, SUPPORT: support }),
        false,
      );
    // The first Summoner is wanted by an army of any size; a second only
    // from twelve units; never a fourth.
    expect(summoner(1, 0)).toBeGreaterThan(summoner(1, 1));
    expect(summoner(5, 1)).toBe(summoner(10, 1));
    expect(summoner(11, 1)).toBeGreaterThan(summoner(10, 1));
    expect(summoner(40, 3)).toBeLessThan(summoner(40, 2));
    // Another faction's support unit keeps its own count (one for four).
    expect(
      armyRoleScoreV7("ORIGINAL", "CAPTAIN", counts({ LINE: 1 }), false),
    ).toBeLessThan(
      armyRoleScoreV7("ORIGINAL", "CAPTAIN", counts({ LINE: 4 }), false),
    );
  });

  it("wants one Familiar for five units, two at most", () => {
    expect([CULT_FAMILIAR_PER_UNITS_V7, CULT_FAMILIAR_MAXIMUM_V7]).toEqual([
      5, 2,
    ]);
    expect([0, 4, 5, 9, 10, 30].map(cultFamiliarsWantedV7)).toEqual([
      0, 0, 1, 1, 2, 2,
    ]);
    const familiar = (line: number, skirmishers: number): number =>
      armyRoleScoreV7(
        "CULT",
        "RAIDER",
        counts({ LINE: line, SKIRMISHER: skirmishers }),
        false,
      );
    expect(familiar(4, 0)).toBeLessThan(familiar(5, 0));
    expect(familiar(9, 1)).toBeGreaterThan(familiar(9, 2));
    expect(familiar(20, 2)).toBe(familiar(10, 2));
  });

  it("caps the Idol Bearers (no more than cities, nor a third of the army) and the Chosen (one for two Initiates)", () => {
    expect(cultIdolBearerCappedV7(0, 5, 2)).toBe(false);
    expect(cultIdolBearerCappedV7(1, 6, 2)).toBe(false);
    expect(cultIdolBearerCappedV7(2, 7, 2)).toBe(true);
    expect(cultIdolBearerCappedV7(1, 2, 3)).toBe(true);
    expect(cultChosenCappedV7(0, 2)).toBe(false);
    expect(cultChosenCappedV7(1, 2)).toBe(true);
    expect(cultChosenCappedV7(1, 3)).toBe(false);
    expect(cultChosenCappedV7(0, 0)).toBe(true);
  });

  const trained = (state: GameStateV7): UnitRoleIdV7 | undefined => {
    const command = policyTurn(state).commands.find(
      (item) => item.kind === "TRAIN",
    );
    return command?.kind === "TRAIN" ? command.role : undefined;
  };

  it("trains an Initiate, not a second Chosen, beside one Chosen and two Initiates", () => {
    const build = (chosen: number): GameStateV7 =>
      orphans(
        asCult(
          [
            own("FIGHTER", 9, 9),
            own("FIGHTER", 9, 7),
            ...[at(7, 9)]
              .slice(0, chosen)
              .map((where) => own("SWORDSMAN", where.x, where.y)),
            foe("FIGHTER", 5, 8),
            foe("FIGHTER", 5, 7),
            foe("FIGHTER", 5, 9),
          ],
          {
            techs: {
              0: techsOf("GATHERING", "DRILL", "ENGINEERING", "METALLURGY"),
              1: [],
            },
            coins: 6,
          },
        ),
      );
    expect(trained(build(0))).toBe("SWORDSMAN");
    expect(trained(build(1))).toBe("FIGHTER");
  });

  it("trains no second Idol Bearer for its one city", () => {
    const build = (idolBearers: number): GameStateV7 =>
      orphans(
        asCult(
          [
            own("FIGHTER", 9, 9),
            own("FIGHTER", 9, 7),
            own("FIGHTER", 7, 7),
            ...[at(7, 9)]
              .slice(0, idolBearers)
              .map((where) => own("GUARD", where.x, where.y)),
            foe("FIGHTER", 5, 8),
            foe("FIGHTER", 5, 7),
            foe("FIGHTER", 5, 9),
          ],
          {
            techs: { 0: techsOf("GATHERING", "DRILL", "FORTIFICATION"), 1: [] },
            coins: 3,
          },
        ),
      );
    // The capital is threatened, so a defender is what the shares and the
    // garrison want; with one fielded, the cap sends the Coins to a body.
    expect(trained(build(0))).toBe("GUARD");
    expect(trained(build(1))).toBe("FIGHTER");
  });

  it("lets a garrison yield to a Hexer as a Human one does to a Marksman", () => {
    const army = counts({ LINE: 3, DEFENDER: 1 });
    expect(armyGarrisonYieldsToRangedV7("CULT", army, true)).toBe(true);
    expect(armyGarrisonYieldsToRangedV7("CULT", army, false)).toBe(false);
    expect(
      armyGarrisonYieldsToRangedV7(
        "CULT",
        counts({ LINE: 3, DEFENDER: 1, RANGED: 2 }),
        true,
      ),
    ).toBe(false);
  });
});

describe("the Cult seat: bodies first", () => {
  it("knows its robed cultists: every trained land unit but the Familiar, never the Thing or a daemon", () => {
    const state = withHorrorV7(roster(), 0, at(6, 4));
    const view = viewOf(state);
    const robed = view.units
      .filter(
        (unit) => unit.ownerId === view.viewer.id && cultRobedV7(view, unit),
      )
      .map((unit) => unit.role)
      .sort();
    expect(robed).toEqual(
      [
        "FIGHTER",
        "MARKSMAN",
        "GUARD",
        "CAPTAIN",
        "CATAPULT",
        "KNIGHT",
        "SWORDSMAN",
      ].sort(),
    );
    expect(cultBodiesV7(view)).toBe(7);
    // A Human Fighter is not robed.
    const human = view.units.find((unit) => unit.ownerId !== view.viewer.id);
    expect(human !== undefined && cultRobedV7(view, human)).toBe(false);
  });

  it("trains before it researches while it fields fewer robed cultists than its cities and two more", () => {
    const opening = (pieces: readonly GoblinPieceV7[]): GameStateV7 =>
      orphans(
        asCult([...pieces, foe("FIGHTER", 0, 0)], {
          techs: { 0: techsOf("GATHERING"), 1: [] },
          coins: 20,
        }),
      );
    const two = [own("FIGHTER", 9, 9), own("FIGHTER", 9, 8)];
    expect(inspectNormalArmyV7(viewOf(opening(two))).bodiesFirst).toBe(true);
    expect(policyTurn(opening(two)).commands[0]).toMatchObject({
      kind: "TRAIN",
      role: "FIGHTER",
    });
    // A Familiar and the Thing are no bodies: four units, two of them
    // robed, is still short.
    expect(
      inspectNormalArmyV7(
        viewOf(opening([...two, own("RAIDER", 9, 7), own("JUGGERNAUT", 7, 9)])),
      ).bodiesFirst,
    ).toBe(true);
    expect(
      inspectNormalArmyV7(viewOf(opening([...two, own("FIGHTER", 9, 7)])))
        .bodiesFirst,
    ).toBe(false);
  });

  it("takes the Militia's two Initiates at level 2 while short of bodies", () => {
    const base = asCult([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)], {
      techs: { 0: techsOf("GATHERING", "FARMING"), 1: [] },
      coins: 10,
    });
    const actor = seatIdV7(base, 0);
    const farm = at(8, 9);
    const state: GameStateV7 = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          gap(tile.at, farm) === 0
            ? {
                ...tile,
                biome: "PLAINS" as const,
                terrain: "GRASS" as const,
                resource: "FERTILE_GROUND" as const,
                improvement: null,
              }
            : tile,
        ),
      },
    };
    const built = applyOkV7(state, actor, { kind: "BUILD_FARM", at: farm });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
      candidates: ["STOCKPILE", "MILITIA"],
    });
    const choice = chooseNormalCommandV7(viewForV7(built.state, actor)).command;
    expect(choice).toMatchObject({
      kind: "CHOOSE_CITY_REWARD",
      reward: "MILITIA",
    });
    if (choice === null) throw new Error("no choice");
    const after = applyOkV7(built.state, actor, choice).state;
    expect(
      after.units.filter(
        (unit) => unit.ownerId === actor && unit.role === "FIGHTER",
      ).length,
    ).toBe(3);
  });

  it("takes the Thing in the Cellar at a level from 5, also with a Thing for every city", () => {
    // A level-5 choice is pending in a quiet capital, and the seat already
    // fields one giant for its one city: every other seat takes the
    // Treasury there; a Cult seat takes the Thing.
    const pending = (factions: readonly FactionIdV7[]): PlayerViewV7 => {
      const state = asCult(
        [own("FIGHTER", 8, 8), own("JUGGERNAUT", 9, 9), foe("FIGHTER", 2, 8)],
        { factions },
      );
      const view = viewOf(state);
      return {
        ...view,
        pendingChoices: [
          {
            kind: "CITY_REWARD",
            cityId: cityOfV7(state, 0).id,
            reachedLevel: 5,
            candidates: ["TREASURY", "JUGGERNAUT"],
          },
        ],
      };
    };
    expect(
      chooseNormalCommandV7(pending(["CULT", "ORIGINAL"])).command,
    ).toMatchObject({ kind: "CHOOSE_CITY_REWARD", reward: "JUGGERNAUT" });
    expect(
      chooseNormalCommandV7(pending(["ORIGINAL", "CULT"])).command,
    ).toMatchObject({ kind: "CHOOSE_CITY_REWARD", reward: "TREASURY" });
  });
});

describe("the Cult seat: weak links, escorts, and spacing", () => {
  it("names every robed cultist under 15 HP a weak link at full HP, and the Chosen and the Idol Bearer escorts", () => {
    expect(CULT_STURDY_V7).toBe(15);
    const state = withHorrorV7(roster(), 0, at(6, 4));
    const view = viewOf(state);
    const mine = view.units.filter((unit) => unit.ownerId === view.viewer.id);
    expect(
      mine
        .filter((unit) => cultWeakLinkV7(view, unit))
        .map((unit) => unit.role)
        .sort(),
    ).toEqual(["CAPTAIN", "CATAPULT", "FIGHTER", "KNIGHT", "MARKSMAN"]);
    expect(
      mine
        .filter((unit) => cultEscortV7(view, unit))
        .map((unit) => unit.role)
        .sort(),
    ).toEqual(["GUARD", "SWORDSMAN"]);
    // The Familiar, the Thing, and the Horror are neither.
    expect(
      mine.filter(
        (unit) => !cultWeakLinkV7(view, unit) && !cultEscortV7(view, unit),
      ).length,
    ).toBe(3);
  });

  // A unit at (5, 2) with a Move to (6, 3), beside the own unit on (5, 4);
  // a hostile unit at (9, 1) (three tiles from that tile: a Knight there
  // has it in its reach) and the Human capital's Fighter. Only the kind of
  // the neighbour, or of the hostile unit, differs between two scenes.
  // (`ARMY_CHAIN_SPACING_VALUE_V7` in `src/ai/v7.ts`.)
  const CHAIN_SPACING_VALUE = 8;
  const scene = (
    mover: UnitRoleIdV7,
    neighbour: UnitRoleIdV7,
    hostile: UnitRoleIdV7,
  ): GameStateV7 => ({
    ...asCult([
      own(mover, 5, 2),
      own(neighbour, 5, 4),
      foe(hostile, 9, 1),
      foe("FIGHTER", 2, 8),
    ]),
    round: 12,
  });
  const beside = (state: GameStateV7): number =>
    moveCandidateV7(state, at(5, 2), at(6, 3))?.score.strategicValue ??
    Number.NaN;

  it("charges an Initiate for a tile beside another weak link inside a Knight's reach, and not beside a Chosen", () => {
    const weak = beside(scene("FIGHTER", "FIGHTER", "KNIGHT"));
    const sturdy = beside(scene("FIGHTER", "SWORDSMAN", "KNIGHT"));
    expect(sturdy - weak).toBe(CHAIN_SPACING_VALUE);
    // With no unit that rides on in sight the two tiles are worth the same.
    expect(
      beside(scene("FIGHTER", "SWORDSMAN", "FIGHTER")) -
        beside(scene("FIGHTER", "FIGHTER", "FIGHTER")),
    ).toBe(0);
  });

  it("values a Chosen's and an Idol Bearer's tile beside a robed cultist a Knight would kill", () => {
    for (const escort of ["SWORDSMAN", "GUARD"] as const)
      expect(
        beside(scene(escort, "CAPTAIN", "FIGHTER")) -
          beside(scene(escort, "SWORDSMAN", "FIGHTER")),
        escort,
      ).toBe(ARMY_ESCORT_VALUE_V7);
    // An Initiate is no escort.
    expect(
      beside(scene("FIGHTER", "CAPTAIN", "FIGHTER")) -
        beside(scene("FIGHTER", "SWORDSMAN", "FIGHTER")),
    ).toBe(0);
  });
});

describe("the Cult seat: contact with company", () => {
  const touches = (state: GameStateV7): boolean =>
    ends(state, at(2, 4)).some(
      (end) => gap(end, at(2, 2)) === 1 || gap(end, at(3, 2)) === 1,
    );
  const alone: GameStateV7 = {
    ...asCult([
      own("FIGHTER", 2, 4),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 2, 2),
      foe("FIGHTER", 3, 2),
      foe("FIGHTER", 2, 8),
    ]),
    round: 12,
  };

  it("walks no lone Initiate up beside two Fighters that kill it there", () => {
    expect(touches(alone)).toBe(false);
    // On the older policy the same Initiate walks up.
    const previous = setArmyPlayFactionsV7(
      ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "CULT"),
    );
    try {
      expect(touches(alone)).toBe(true);
    } finally {
      setArmyPlayFactionsV7(previous);
    }
  });

  it("lets it go with another own unit already beside that enemy", () => {
    const company: GameStateV7 = {
      ...asCult([
        own("FIGHTER", 2, 4),
        own("FIGHTER", 1, 1),
        own("FIGHTER", 8, 8),
        foe("FIGHTER", 2, 2),
        foe("FIGHTER", 3, 2),
        foe("FIGHTER", 2, 8),
      ]),
      round: 12,
    };
    expect(touches(company)).toBe(true);
  });

  it("holds the Chosen, the Caller, and the Familiar by the same rule", () => {
    for (const role of ["SWORDSMAN", "KNIGHT", "RAIDER"] as const) {
      const state: GameStateV7 = {
        ...asCult([
          own(role, 2, 4, { hp: 4 }),
          own("FIGHTER", 8, 8),
          foe("FIGHTER", 2, 2),
          foe("FIGHTER", 3, 2),
          foe("FIGHTER", 2, 8),
        ]),
        round: 12,
      };
      expect(touches(state), role).toBe(false);
    }
  });
});

describe("the Cult seat: the back row out of reach", () => {
  it("names the Hexer, the Stargazer, and the Summoner its back row", () => {
    const state = withHorrorV7(roster(), 0, at(6, 4));
    const view = viewOf(state);
    expect(
      view.units
        .filter(
          (unit) =>
            unit.ownerId === view.viewer.id && cultBackRowV7(view, unit),
        )
        .map((unit) => unit.role)
        .sort(),
    ).toEqual(["CAPTAIN", "CATAPULT", "MARKSMAN"]);
  });

  // A Fighter at (2, 1) attacks every tile within two of it next turn.
  const scene = (
    role: UnitRoleIdV7,
    hostile: UnitRoleIdV7,
    screen: readonly GoblinPieceV7[] = [],
  ): GameStateV7 => ({
    ...asCult([
      own(role, 2, 4),
      ...screen,
      own("FIGHTER", 8, 8),
      foe(hostile, 2, 1),
      foe("FIGHTER", 2, 8),
    ]),
    round: 12,
  });
  const nearest = (state: GameStateV7): number =>
    Math.min(
      Number.POSITIVE_INFINITY,
      ...ends(state, at(2, 4)).map((end) => gap(end, at(2, 1))),
    );

  it("offers a lone Hexer, Stargazer, or Summoner no Move into a Fighter's reach", () => {
    for (const role of ["MARKSMAN", "CATAPULT", "CAPTAIN"] as const)
      expect(nearest(scene(role, "FIGHTER")), role).toBeGreaterThan(2);
  });

  it("plays a whole turn without walking the lone Hexer up or shooting", () => {
    const state = scene("MARKSMAN", "FIGHTER");
    const hexer = unitAtV7(state, at(2, 4));
    const turn = policyTurn(state);
    const now = turn.state.units.find((unit) => unit.id === hexer.id);
    expect(now === undefined ? 0 : gap(now.at, at(2, 1))).toBeGreaterThan(2);
    expect(
      turn.commands.some(
        (command) => command.kind === "ATTACK" && command.unitId === hexer.id,
      ),
    ).toBe(false);
  });

  it("lets a Hexer and a Summoner step up behind an own Initiate that stands nearer to the enemy", () => {
    for (const role of ["MARKSMAN", "CAPTAIN"] as const)
      expect(
        nearest(scene(role, "FIGHTER", [own("FIGHTER", 2, 2)])),
        role,
      ).toBe(2);
    // The Stargazer is a siege unit besides: the shared siege rule keeps it
    // four tiles from its objective until a unit with Defense 2 or more (a
    // Chosen, an Idol Bearer, the Thing) can stand beside its tile; an
    // Initiate (Defense 1.5) is no such screen.
    expect(
      nearest(scene("CATAPULT", "FIGHTER", [own("FIGHTER", 2, 2)])),
    ).toBeGreaterThan(2);
  });

  it("offers none of them a Move into a Knight's reach from outside it, screened or not", () => {
    // The Knight's reach is the engine's own (`queryThreatenedTilesV7`).
    // Each of the three stands just outside it, behind an own Chosen and
    // an own Initiate; the engine offers it Moves into the reach, and the
    // policy makes none of them a candidate.
    for (const role of ["MARKSMAN", "CATAPULT", "CAPTAIN"] as const) {
      const build = (y: number): GameStateV7 => ({
        ...asCult([
          own(role, 5, y),
          own("SWORDSMAN", 5, 2),
          own("FIGHTER", 6, 2),
          own("FIGHTER", 8, 8),
          foe("KNIGHT", 5, 0),
          foe("FIGHTER", 2, 8),
        ]),
        round: 12,
      });
      const probe = viewOf(build(4));
      const knight = probe.units.find(
        (unit) => unit.ownerId !== probe.viewer.id && unit.role === "KNIGHT",
      );
      if (knight === undefined) throw new Error("no Knight");
      const reach = queryThreatenedTilesV7(probe, knight.id);
      const inside = (where: CoordV7): boolean =>
        reach.some((tile) => gap(tile, where) === 0);
      // The first row outside the reach, in column 5.
      const y = [3, 4, 5, 6].find((row) => !inside(at(5, row)));
      if (y === undefined) throw new Error("no tile outside the reach");
      expect(inside(at(5, y - 1)), role).toBe(true);
      const state = build(y);
      const view = viewOf(state);
      const actor = unitAtV7(state, at(5, y));
      const offeredInside = queryAiReadyCommandsV7(view).some(
        (item) =>
          item.command.kind === "MOVE" &&
          item.command.unitId === actor.id &&
          inside(item.command.path.at(-1) ?? at(-9, -9)),
      );
      expect(offeredInside, role).toBe(true);
      expect(
        ends(state, at(5, y)).some((end) => inside(end)),
        role,
      ).toBe(false);
    }
  });
});

describe("the Cult seat: legal, deterministic turns on what A1 covers", () => {
  // Bead A2 (`pulp_wars-mch9.10`) plays Sacrifice, Seize, Offering, Summon,
  // Channel, Behold!, and Anchor by the Cult seat's plan
  // (tests/unit/ruleset-v7-cult-channel-ai.test.ts); the rituals, Proclaim,
  // and Boo! wait for bead A3.
  const LATER_BEADS: readonly CommandV7["kind"][] = [
    "BOO",
    "BEGIN_RITUAL",
    "PROCLAIM",
  ];

  const midGame = (): GameStateV7 =>
    withFavourV7(
      asCult(
        [
          own("FIGHTER", 6, 6),
          own("FIGHTER", 6, 7),
          own("SWORDSMAN", 6, 8),
          own("GUARD", 8, 8),
          own("MARKSMAN", 7, 6),
          own("CAPTAIN", 7, 7),
          own("CATAPULT", 7, 8),
          own("KNIGHT", 7, 9),
          own("RAIDER", 9, 6),
          own("JUGGERNAUT", 8, 7),
          foe("FIGHTER", 4, 6),
          foe("MARKSMAN", 3, 6),
          foe("KNIGHT", 3, 7),
          foe("GUARD", 2, 8),
        ],
        { coins: 30 },
      ),
      0,
      30,
    );

  it("plays a whole mid-game turn with offered commands only, and none of the later beads' commands", () => {
    const turn = policyTurn(midGame());
    expect(turn.commands.length).toBeGreaterThan(0);
    for (const command of turn.commands)
      expect(LATER_BEADS, command.kind).not.toContain(command.kind);
  });

  it("decides the same command for the same public view", () => {
    const view = viewOf(midGame());
    const first = chooseNormalCommandV7(view);
    const second = chooseNormalCommandV7(
      JSON.parse(JSON.stringify(view)) as PlayerViewV7,
    );
    expect(second.command).toEqual(first.command);
    expect(second.candidates.map((item) => item.command)).toEqual(
      first.candidates.map((item) => item.command),
    );
  });

  it("offers a Cult seat none of the later beads' commands as a candidate", () => {
    const kinds = new Set(
      chooseNormalCommandV7(viewOf(midGame())).candidates.map(
        (candidate) => candidate.command.kind,
      ),
    );
    for (const kind of LATER_BEADS) expect(kinds.has(kind), kind).toBe(false);
  });
});
