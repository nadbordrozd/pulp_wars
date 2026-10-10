import { afterEach, describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
  publicProjectedDamageForPolicyV7,
  publicThreatenedTilesForPolicyV7,
} from "../../src/ai/v7";
import {
  ARMY_CANDY_SKIRMISHER_MAXIMUM_V7,
  ARMY_CANDY_SKIRMISHER_PER_UNITS_V7,
  ARMY_CANDY_STURDY_V7,
  ARMY_ESCORT_VALUE_V7,
  ARMY_PLAY_FACTIONS_V7,
  ARMY_RESEARCH_ROLES_V7,
  armyCandyDefenderCappedV7,
  armyCandyHeavyCappedV7,
  armyGarrisonYieldsToRangedV7,
  armyPlayFactionV7,
  armyRoleScoreV7,
  armySharesV7,
  setArmyPlayFactionsV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  DEFAULT_CANDY_POLICY_OPTIONS_V7,
  GLAZE_CARRY_VALUE_V7,
  GLAZE_FIRST_OFFSET_V7,
  JAWBREAKER_BATTERY_COST_V7,
  JAWBREAKER_FRONT_VALUE_V7,
  REBAKE_PRIORITY_V7,
  STICKY_FAST_TARGET_VALUE_V7,
  STUCK_ATTACKER_COST_V7,
  SUGAR_TOSS_IDLE_PRIORITY_V7,
  TOOTHACHE_ATTACKER_COST_V7,
  TOP_UP_DANGER_PRIORITY_V7,
  TOP_UP_KILL_PRIORITY_V7,
  glazeTilesForPolicyV7,
  setCandyPolicyOptionsV7,
} from "../../src/ai/v7-candy";
import {
  FACTION_IDS_V7,
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
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
import {
  candyFieldV7,
  type CandyFieldOptionsV7,
  type CandyPieceV7,
} from "../fixtures/v7-candy";
import {
  attackV7,
  candidatesV7,
  moveCandidateV7,
  publicUnitAtV7,
  scoreV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { withCandyOnOlderPolicyV7 } from "../fixtures/v7-older-policy";

// The Candy army seat (`pulp_wars-jdb.13`,
// docs/product/RULESET_7_CANDY_REDESIGN.md section 13): a Candy seat of the
// Normal AI plays the army rules, so a match with a Candy seat no longer
// keeps the older policy for every seat, and it uses each ability of the
// Candy redesign on purpose. No rule changed (the identity stays
// `pulp-wars-poc-7r70`), and no match was played for this bead: every rule
// is shown on a small hand-built state, and every projection the policy
// makes is compared with the engine's own preview or event.
//
// The field (tests/fixtures/v7-candy.ts, 11 x 11): seat 0 capital (8, 8)
// with territory x 7-9, y 7-9; seat 1 capital (2, 8) with territory x 1-3,
// y 7-9; villages (5, 5), (8, 5), (5, 8); every other land tile open Grass;
// every tile explored; every technology and 100 Coins unless stated. (A
// unit on a village stays to capture it, so no scene stands on one.)

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const byTile = (left: CoordV7, right: CoordV7): number =>
  left.y - right.y || left.x - right.x;

const own = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<CandyPieceV7> = {},
): CandyPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<CandyPieceV7> = {},
): CandyPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));

/** Seat 0 Candy (the viewer, to move) against seat 1 Human. */
const asCandy = (
  pieces: readonly CandyPieceV7[],
  options: CandyFieldOptionsV7 = {},
): GameStateV7 => candyFieldV7(pieces, options);

/** The same with the Candy units homeless, so the capital keeps its slots. */
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
    const command = chooseNormalTurnCommandV7(
      view,
      accepted,
      128,
      chooseNormalCommandV7(view),
    );
    if (command === null) throw new Error("no command");
    if (command.kind === "END_TURN") return { commands, state };
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

afterEach(() => {
  setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
});

describe("the Candy army seat: no rule changed (the identity moved later, with the Cult registration)", () => {
  it("kept the identity", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r76");
  });
});

describe("the Candy army seat: who plays the army rules", () => {
  const pieces = [own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)];

  it("counts the Candy among the army factions: the eight of this bead", () => {
    expect(ARMY_PLAY_FACTIONS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      "ICE_FOLK",
      "DWARF",
      "CANDY",
    ]);
    expect(armyPlayFactionV7("CANDY")).toBe(true);
  });

  it("is on for a Candy seat against every army faction and in a mirror", () => {
    for (const opponent of ARMY_PLAY_FACTIONS_V7)
      expect(
        inspectNormalArmyV7(
          viewOf(asCandy(pieces, { factions: ["CANDY", opponent] })),
        ).army,
        opponent,
      ).toBe(true);
  });

  it("no longer drags the other seat of its match to the older policy", () => {
    for (const viewer of ARMY_PLAY_FACTIONS_V7)
      expect(
        inspectNormalArmyV7(
          viewOf(asCandy(pieces, { factions: [viewer, "CANDY"] })),
        ).army,
        viewer,
      ).toBe(true);
  });

  it("leaves the older policy to a faction outside the list (the tests' switch)", () => {
    // No match reaches the older policy through the eight factions of this
    // bead. The tests that pin it take the Candy out of the list; a faction
    // registered later is outside it until its own pass.
    const previous = setArmyPlayFactionsV7(
      ARMY_PLAY_FACTIONS_V7.filter((faction) => faction !== "CANDY"),
    );
    try {
      expect(armyPlayFactionV7("CANDY")).toBe(false);
      expect(inspectNormalArmyV7(viewOf(asCandy(pieces))).army).toBe(false);
      expect(
        inspectNormalArmyV7(
          viewOf(asCandy(pieces, { factions: ["ORIGINAL", "CANDY"] })),
        ).army,
      ).toBe(false);
    } finally {
      setArmyPlayFactionsV7(previous);
    }
    expect(armyPlayFactionV7("CANDY")).toBe(true);
    // Every faction registered with this bead is in the list. (The ninth,
    // the Cult, is registered by its own engine bead and joins the list in
    // its AI bead; until then a match with a Cult seat keeps the older
    // policy for every seat, so it is left out of this check by name.)
    const outside: readonly string[] = FACTION_IDS_V7.filter(
      (faction: FactionIdV7) => !ARMY_PLAY_FACTIONS_V7.includes(faction),
    );
    expect(outside.filter((faction) => faction !== "CULT")).toEqual([]);
  });
});

describe("the Candy army seat: the research order", () => {
  it("is the Donut Racer, the Gumball Gunner, the Marshmallow, the Confectioner, the Pie Launcher, the Jawbreaker, the Chocolate Bunny", () => {
    expect(ARMY_RESEARCH_ROLES_V7.CANDY).toEqual([
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "CATAPULT",
      "SWORDSMAN",
      "KNIGHT",
    ]);
    // Three Troopers for one city, no enemy in sight, no Coins: each
    // technology the seat names next, bought in turn.
    const order: string[] = [];
    let techs: readonly TechnologyIdV7[] = ["GATHERING"];
    for (let step = 0; step < 13; step += 1) {
      const next = research(
        orphans(
          asCandy(
            [
              own("FIGHTER", 9, 9),
              own("FIGHTER", 9, 8),
              own("FIGHTER", 9, 7),
              foe("FIGHTER", 0, 0),
            ],
            { techs: { 0: techsOf(...techs), 1: [] }, coins: 0 },
          ),
        ),
      );
      if (next === null) break;
      order.push(
        next.unlocks === null ? next.tech : `${next.tech}:${next.unlocks}`,
      );
      techs = [...techs, next.tech];
    }
    expect(order).toEqual([
      "SCOUTING:RAIDER",
      "HUNTING",
      "MARKSMANSHIP:MARKSMAN",
      "DRILL",
      "FORTIFICATION:GUARD",
      "ADMINISTRATION:CAPTAIN",
      "FORESTRY",
      "SAWMILLING:CATAPULT",
      "ENGINEERING",
      "METALLURGY:SWORDSMAN",
      "RAIDING",
      "CHIVALRY:KNIGHT",
    ]);
  });

  it("does not follow the older Candy research plan", () => {
    // The older plan asked for the Marshmallow's chain first with an enemy
    // in sight; the army seat names the first unit of its order.
    const state = orphans(
      asCandy(
        [
          own("FIGHTER", 9, 9),
          own("FIGHTER", 9, 8),
          own("FIGHTER", 9, 7),
          foe("FIGHTER", 5, 9),
        ],
        { techs: { 0: techsOf("GATHERING"), 1: [] }, coins: 0 },
      ),
    );
    expect(research(state)?.tech).toBe("SCOUTING");
  });
});

describe("the Candy army seat: the army", () => {
  it("has its own shares, one Donut Racer for every four units at most two, and two sturdy units", () => {
    expect(armySharesV7("CANDY", false)).toEqual({
      LINE: 40,
      DEFENDER: 15,
      RANGED: 25,
      SIEGE: 10,
      BREAKTHROUGH: 10,
    });
    expect(armySharesV7("CANDY", true)).toEqual({
      LINE: 35,
      DEFENDER: 10,
      RANGED: 25,
      SIEGE: 10,
      BREAKTHROUGH: 20,
    });
    expect([
      ARMY_CANDY_SKIRMISHER_PER_UNITS_V7,
      ARMY_CANDY_SKIRMISHER_MAXIMUM_V7,
    ]).toEqual([4, 2]);
    const racer = (line: number, skirmishers: number): number =>
      armyRoleScoreV7(
        "CANDY",
        "RAIDER",
        counts({ LINE: line, SKIRMISHER: skirmishers }),
        false,
      );
    expect(racer(3, 0)).toBeLessThan(racer(4, 0));
    expect(racer(8, 1)).toBeGreaterThan(racer(8, 2));
    expect(racer(12, 2)).toBe(racer(8, 2));
    // The Marshmallow (18 HP) and the Jawbreaker (16) are the units a
    // Knight's chain does not ride through.
    const sturdy = (
      [
        "FIGHTER",
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "SWORDSMAN",
        "CAPTAIN",
        "CATAPULT",
        "KNIGHT",
      ] as const
    ).filter(
      (role) =>
        effectiveRoleRuleV7(role, "CANDY").maxHp >= ARMY_CANDY_STURDY_V7,
    );
    expect(sturdy).toEqual(["GUARD", "SWORDSMAN"]);
  });

  it("caps the Marshmallows (no more than cities, nor a third of the army) and the Jawbreakers (one for two Troopers)", () => {
    // The Marshmallow does not strike after it moves: it is a garrison.
    expect(
      effectiveRoleRuleV7("GUARD", "CANDY").mayUsePrimaryActionAfterMove,
    ).toBe(false);
    expect(armyCandyDefenderCappedV7(counts({ LINE: 5 }), 2)).toBe(false);
    expect(armyCandyDefenderCappedV7(counts({ LINE: 5, DEFENDER: 2 }), 2)).toBe(
      true,
    );
    expect(armyCandyDefenderCappedV7(counts({ LINE: 1, DEFENDER: 1 }), 3)).toBe(
      true,
    );
    expect(armyCandyHeavyCappedV7(0, 2)).toBe(false);
    expect(armyCandyHeavyCappedV7(1, 2)).toBe(true);
    expect(armyCandyHeavyCappedV7(1, 3)).toBe(false);
    expect(armyCandyHeavyCappedV7(0, 0)).toBe(true);
  });

  it("trains a Toffee Trooper, not a third Jawbreaker, beside two Jawbreakers and two Troopers", () => {
    const build = (jawbreakers: number): GameStateV7 =>
      orphans(
        asCandy(
          [
            own("FIGHTER", 9, 9),
            own("FIGHTER", 9, 7),
            ...[at(7, 9), at(7, 7), at(9, 8)]
              .slice(0, jawbreakers)
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
    const trained = (state: GameStateV7): UnitRoleIdV7 | undefined => {
      const command = policyTurn(state).commands.find(
        (item) => item.kind === "TRAIN",
      );
      return command?.kind === "TRAIN" ? command.role : undefined;
    };
    expect(trained(build(0))).toBe("SWORDSMAN");
    expect(trained(build(1))).toBe("FIGHTER");
  });

  it("trains before it researches while it fields fewer units than its cities and two more", () => {
    const opening = (troopers: number): GameStateV7 =>
      orphans(
        asCandy(
          [
            ...[at(9, 9), at(9, 8), at(9, 7)]
              .slice(0, troopers)
              .map((where) => own("FIGHTER", where.x, where.y)),
            foe("FIGHTER", 0, 0),
          ],
          { techs: { 0: techsOf("GATHERING"), 1: [] }, coins: 20 },
        ),
      );
    expect(inspectNormalArmyV7(viewOf(opening(2))).bodiesFirst).toBe(true);
    expect(policyTurn(opening(2)).commands[0]).toMatchObject({
      kind: "TRAIN",
      role: "FIGHTER",
    });
    expect(inspectNormalArmyV7(viewOf(opening(3))).bodiesFirst).toBe(false);
  });

  it("lets a garrison yield to a Gumball Gunner as a Human one does to a Marksman", () => {
    const army = counts({ LINE: 3, DEFENDER: 1 });
    expect(armyGarrisonYieldsToRangedV7("CANDY", army, true)).toBe(true);
    expect(armyGarrisonYieldsToRangedV7("CANDY", army, false)).toBe(false);
    expect(
      armyGarrisonYieldsToRangedV7(
        "CANDY",
        counts({ LINE: 3, DEFENDER: 1, RANGED: 2 }),
        true,
      ),
    ).toBe(false);
  });
});

describe("the Candy army seat: the line", () => {
  // The reward ladder (`pulp_wars-zypi`): level 2 offers the Stockpile or
  // the Militia, and a seat short of units takes the free Toffee Trooper.
  it("takes the Militia's free Toffee Trooper at level 2 while short of units", () => {
    const base = asCandy([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)], {
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
          same(tile.at, farm)
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
    expect(
      chooseNormalCommandV7(viewForV7(built.state, actor)).command,
    ).toMatchObject({ kind: "CHOOSE_CITY_REWARD", reward: "MILITIA" });
  });

  it("walks no lone Gunner into a Fighter's reach for a shot that does not kill", () => {
    // The Fighter is three tiles away: a tile two from it is a tile it
    // walks up to and strikes (the Gunner has 8 HP and Defense 1).
    const state = asCandy([
      own("MARKSMAN", 2, 4),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 2, 1),
      foe("FIGHTER", 2, 8),
    ]);
    const gunner = unitAtV7(state, at(2, 4));
    const turn = policyTurn(state);
    const now = turn.state.units.find((unit) => unit.id === gunner.id);
    expect(now === undefined ? 0 : gap(now.at, at(2, 1))).toBeGreaterThan(2);
    expect(
      turn.commands.some(
        (command) => command.kind === "ATTACK" && command.unitId === gunner.id,
      ),
    ).toBe(false);
  });

  it("walks no lone Toffee Trooper up beside two Fighters that kill it there", () => {
    const ends = (state: GameStateV7): readonly CoordV7[] =>
      unitCandidatesV7(state, at(2, 4), "MOVE").flatMap((candidate) => {
        const end =
          candidate.command.kind === "MOVE"
            ? candidate.command.path.at(-1)
            : undefined;
        return end === undefined ? [] : [end];
      });
    const touches = (state: GameStateV7): boolean =>
      ends(state).some(
        (end) => gap(end, at(2, 2)) === 1 || gap(end, at(3, 2)) === 1,
      );
    const alone: GameStateV7 = {
      ...asCandy([
        own("FIGHTER", 2, 4),
        own("FIGHTER", 8, 8),
        foe("FIGHTER", 2, 2),
        foe("FIGHTER", 3, 2),
        foe("FIGHTER", 2, 8),
      ]),
      round: 12,
    };
    expect(touches(alone)).toBe(false);
    // On the older policy the same Trooper walks up.
    expect(withCandyOnOlderPolicyV7(() => touches(alone))).toBe(true);
  });
});

describe("the Candy army seat: Ricochet", () => {
  // A Gunner at (5, 5) with two Fighters two tiles away. Beside the
  // northern one stands a Marksman at 2 HP; beside the southern one nothing.
  const pieces = (weak: number): CandyPieceV7[] => [
    own("MARKSMAN", 5, 6),
    own("FIGHTER", 8, 8),
    foe("FIGHTER", 5, 4),
    foe("MARKSMAN", 5, 3, { hp: weak }),
    foe("FIGHTER", 3, 6),
  ];

  it("reads the Ricochet from the exact preview, and the engine does what it says", () => {
    const state = asCandy(pieces(2));
    const shot = attackV7(state, at(5, 6), at(5, 4));
    const preview = queryCombatPreviewV7(
      viewerViewV7(state),
      shot.unitId,
      shot.targetUnitId,
    );
    expect(preview?.ricochet).toMatchObject({
      unitId: unitIdAtV7(state, at(5, 3)),
      dies: true,
    });
    const applied = applyOkV7(state, seatIdV7(state, 0), shot);
    const event = applied.events.find((item) => item.kind === "RICOCHETED");
    expect(event).toMatchObject({
      targetUnitId: unitIdAtV7(state, at(5, 3)),
      damage: preview?.ricochet?.damage,
      dies: true,
    });
  });

  it("picks the shot whose Ricochet kills, at a kill's tier", () => {
    const state = asCandy(pieces(2));
    const kill = scoreV7(state, attackV7(state, at(5, 6), at(5, 4)));
    const plain = scoreV7(state, attackV7(state, at(5, 6), at(3, 6)));
    expect(kill.priority).toBe(1180);
    expect(plain.priority).toBeLessThan(1180);
    expect(unitCandidatesV7(state, at(5, 6))[0]?.command).toEqual(
      attackV7(state, at(5, 6), at(5, 4)),
    );
    const turn = policyTurn(state);
    expect(
      turn.state.units.some((unit) => unit.id === unitIdAtV7(state, at(5, 3))),
    ).toBe(false);
  });

  it("gives a Ricochet that does not kill the hit's value only", () => {
    const state = asCandy(pieces(10));
    const shot = scoreV7(state, attackV7(state, at(5, 6), at(5, 4)));
    expect(shot.priority).toBeLessThan(1180);
    setCandyPolicyOptionsV7({ abilities: false });
    const off = asCandy(pieces(2));
    expect(
      scoreV7(off, attackV7(off, at(5, 6), at(5, 4))).priority,
    ).toBeLessThan(1180);
  });
});

describe("the Candy army seat: Bunny Hop and Thump", () => {
  it("counts the Thump's kills in the blow's score", () => {
    // The Bunny at (4, 4) beside a Guard to its west; two Marksmen at 2 HP
    // stand beside the Bunny, so its blow on the Guard thumps them dead.
    const state = asCandy([
      own("KNIGHT", 4, 4),
      own("FIGHTER", 8, 8),
      foe("GUARD", 3, 4),
      foe("MARKSMAN", 4, 3, { hp: 2 }),
      foe("MARKSMAN", 5, 3, { hp: 2 }),
    ]);
    const blow = attackV7(state, at(4, 4), at(3, 4));
    const preview = queryCombatPreviewV7(
      viewerViewV7(state),
      blow.unitId,
      blow.targetUnitId,
    );
    expect(preview?.defenderDies).toBe(false);
    expect(preview?.thump.map((hit) => [hit.unitId, hit.dies])).toEqual([
      [unitIdAtV7(state, at(4, 3)), true],
      [unitIdAtV7(state, at(5, 3)), true],
    ]);
    expect(scoreV7(state, blow).priority).toBe(1180);
    setCandyPolicyOptionsV7({ abilities: false });
    expect(scoreV7(state, blow).priority).toBeLessThan(1180);
    setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
    // The engine does what the preview says.
    const applied = applyOkV7(state, seatIdV7(state, 0), blow);
    const event = applied.events.find((item) => item.kind === "THUMPED");
    expect(event?.kind === "THUMPED" ? event.hits : []).toEqual(preview?.thump);
  });

  it("hops the screen to the Catapult behind it", () => {
    // Three Guards stand in a row between the Bunny and a Catapult. On
    // foot every step toward it ends in a Guard's zone of control; one hop
    // over the middle Guard lands beside the Catapult.
    const state = asCandy([
      own("KNIGHT", 4, 5),
      own("FIGHTER", 8, 8),
      foe("GUARD", 3, 4),
      foe("GUARD", 4, 4),
      foe("GUARD", 5, 4),
      foe("CATAPULT", 4, 2),
      foe("FIGHTER", 2, 8),
    ]);
    const bunny = unitAtV7(state, at(4, 5));
    const turn = policyTurn(state);
    const first = turn.commands.find(
      (command) => "unitId" in command && command.unitId === bunny.id,
    );
    expect(first).toMatchObject({ kind: "MOVE" });
    const landing = first?.kind === "MOVE" ? first.path.at(-1) : undefined;
    expect(landing).toEqual(at(4, 3));
    expect(first?.kind === "MOVE" ? first.path : []).toEqual([at(4, 3)]);
    expect(
      turn.commands.some(
        (command) =>
          command.kind === "ATTACK" &&
          command.unitId === bunny.id &&
          command.targetUnitId === unitIdAtV7(state, at(4, 2)),
      ),
    ).toBe(true);
  });
});

describe("the Candy army seat: Sticky Toffee", () => {
  it("values the blow that leaves a fast unit Stuck", () => {
    const state = asCandy([
      own("FIGHTER", 4, 4),
      own("FIGHTER", 8, 8),
      foe("RAIDER", 4, 3),
      foe("FIGHTER", 3, 4),
    ]);
    const onRaider = attackV7(state, at(4, 4), at(4, 3));
    const preview = queryCombatPreviewV7(
      viewerViewV7(state),
      onRaider.unitId,
      onRaider.targetUnitId,
    );
    expect(preview?.stuckApplied).toBe("TARGET");
    const on = scoreV7(state, onRaider).strategicValue;
    setCandyPolicyOptionsV7({ abilities: false });
    const off = scoreV7(state, onRaider).strategicValue;
    expect(on - off).toBe(STICKY_FAST_TARGET_VALUE_V7);
    // A Fighter walks one tile anyway: no value.
    setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
    const onFighter = attackV7(state, at(4, 4), at(3, 4));
    const slow = scoreV7(state, onFighter).strategicValue;
    setCandyPolicyOptionsV7({ abilities: false });
    expect(scoreV7(state, onFighter).strategicValue).toBe(slow);
  });

  it("reads a Stuck unit's reach as one step, as the engine does", () => {
    // A Raider five tiles from a Trooper: free, it rides two tiles and
    // strikes at the third; Stuck, it walks one and strikes at the second.
    const reach = (stuck: boolean) => {
      const state = asCandy([
        own("FIGHTER", 5, 8),
        foe("RAIDER", 5, 3, stuck ? { stuck: 1 } : {}),
      ]);
      const view = viewerViewV7(state);
      const raider = publicUnitAtV7(state, at(5, 3));
      return {
        policy: [...publicThreatenedTilesForPolicyV7(view, raider)].sort(
          byTile,
        ),
        engine: [...queryThreatenedTilesV7(view, raider.id)].sort(byTile),
      };
    };
    const free = reach(false);
    const stuck = reach(true);
    expect(free.policy.some((tile) => same(tile, at(5, 6)))).toBe(true);
    expect(stuck.policy.some((tile) => same(tile, at(5, 6)))).toBe(false);
    expect(stuck.policy.some((tile) => same(tile, at(5, 5)))).toBe(true);
    expect(stuck.policy).toEqual(stuck.engine);
    expect(Math.max(...stuck.policy.map((tile) => gap(tile, at(5, 3))))).toBe(
      2,
    );
  });

  it("values a Trooper's tile beside its Gunner while a Raider is near", () => {
    // The Trooper's three Moves all end beside the own Gunner. With a
    // Raider within five tiles the tile is worth an escort's value more;
    // with a Fighter there instead it is not.
    const build = (fast: boolean): GameStateV7 => ({
      ...asCandy([
        own("FIGHTER", 3, 4),
        own("MARKSMAN", 5, 4),
        foe(fast ? "RAIDER" : "FIGHTER", 3, 0),
        foe("FIGHTER", 2, 8),
      ]),
      round: 12,
    });
    const screen = (state: GameStateV7): number => {
      const value = (abilities: boolean): number => {
        setCandyPolicyOptionsV7({ abilities });
        const score = moveCandidateV7(state, at(3, 4), at(4, 4))?.score
          .strategicValue;
        setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
        return score ?? Number.NaN;
      };
      return value(true) - value(false);
    };
    expect(screen(build(true))).toBe(ARMY_ESCORT_VALUE_V7);
    expect(screen(build(false))).toBe(0);
  });
});

describe("the Candy army seat: Toothache", () => {
  it("projects a blow weakened by Toothache as the engine previews it", () => {
    for (const toothache of [undefined, 1] as const) {
      const state = asCandy([
        own("FIGHTER", 4, 4, toothache === undefined ? {} : { toothache }),
        foe("FIGHTER", 4, 3),
      ]);
      const view = viewerViewV7(state);
      const attacker = publicUnitAtV7(state, at(4, 4));
      const defender = publicUnitAtV7(state, at(4, 3));
      const preview = queryCombatPreviewV7(view, attacker.id, defender.id);
      expect(preview?.toothacheAttack).toBe(toothache !== undefined);
      expect(
        publicProjectedDamageForPolicyV7(view, attacker, defender, defender.at),
      ).toBe(preview?.damageToDefender);
    }
  });

  it("counts a hostile unit's Toothache in the danger of standing beside it", () => {
    const danger = (toothache: boolean): number => {
      const state = asCandy([
        own("FIGHTER", 4, 4),
        foe("FIGHTER", 4, 3, toothache ? { toothache: 1 } : {}),
      ]);
      const view = viewerViewV7(state);
      return publicProjectedDamageForPolicyV7(
        view,
        publicUnitAtV7(state, at(4, 3)),
        publicUnitAtV7(state, at(4, 4)),
        at(4, 4),
      );
    };
    expect(danger(true)).toBeLessThan(danger(false));
  });

  it("keeps the Jawbreaker out of a battery and in front of the melee", () => {
    // Two Marksmen at (1, 2) and (2, 2) cover (2, 4) from two tiles; the
    // Fighter on the capital walks up to anything on (2, 6), which no
    // Marksman covers.
    const state: GameStateV7 = {
      ...asCandy([
        own("SWORDSMAN", 1, 5),
        own("FIGHTER", 2, 5),
        own("FIGHTER", 3, 5),
        foe("MARKSMAN", 1, 2),
        foe("MARKSMAN", 2, 2),
        foe("FIGHTER", 5, 3),
        foe("FIGHTER", 2, 8),
      ]),
      round: 12,
    };
    const value = (to: CoordV7, abilities: boolean): number => {
      setCandyPolicyOptionsV7({ abilities });
      const score = moveCandidateV7(state, at(1, 5), to)?.score.strategicValue;
      setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
      return score ?? Number.NaN;
    };
    expect(value(at(2, 4), true) - value(at(2, 4), false)).toBe(
      -2 * JAWBREAKER_BATTERY_COST_V7,
    );
    expect(value(at(2, 6), true) - value(at(2, 6), false)).toBe(
      JAWBREAKER_FRONT_VALUE_V7,
    );
    // Of its two Moves it prefers the front tile; without the rule they tie.
    expect(value(at(2, 6), true)).toBeGreaterThan(value(at(2, 4), true));
    expect(value(at(2, 6), false)).toBe(value(at(2, 4), false));
    // A Toffee Trooper's Move there is not changed.
    const trooper = (abilities: boolean): number => {
      setCandyPolicyOptionsV7({ abilities });
      const score = moveCandidateV7(state, at(3, 5), at(4, 5))?.score
        .strategicValue;
      setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
      return score ?? Number.NaN;
    };
    expect(trooper(true)).toBe(trooper(false));
  });
});

describe("the Candy army seat: Glaze Trail", () => {
  // The wave stands on the open row y = 1: the Trooper at (2, 1), the
  // Racer at (3, 1) in front of it, the enemy six tiles to the east.
  const wave = (): GameStateV7 =>
    asCandy([own("FIGHTER", 2, 1), own("RAIDER", 3, 1), foe("FIGHTER", 9, 1)]);

  it("names the tiles a Racer's Move Glazes, as the engine's event does", () => {
    const state = wave();
    const racer = publicUnitAtV7(state, at(3, 1));
    const path = [at(4, 1), at(5, 1)];
    expect(glazeTilesForPolicyV7(viewerViewV7(state), racer, path)).toEqual([
      at(3, 1),
      at(4, 1),
    ]);
    const applied = applyOkV7(state, seatIdV7(state, 0), {
      kind: "MOVE",
      unitId: racer.id,
      path,
    });
    const event = applied.events.find((item) => item.kind === "TILES_GLAZED");
    expect(event?.kind === "TILES_GLAZED" ? event.tiles : []).toEqual(
      glazeTilesForPolicyV7(viewerViewV7(state), racer, path),
    );
    // A Trooper lays none.
    expect(
      glazeTilesForPolicyV7(
        viewerViewV7(state),
        publicUnitAtV7(state, at(2, 1)),
        [at(2, 2)],
      ),
    ).toEqual([]);
  });

  it("moves the Racer before the Trooper behind it, and the Trooper two tiles along the Glaze", () => {
    const state = wave();
    const racer = unitAtV7(state, at(3, 1));
    const trooper = unitAtV7(state, at(2, 1));
    const turn = policyTurn(state);
    const moves = turn.commands.filter((command) => command.kind === "MOVE");
    expect(moves[0]).toMatchObject({ unitId: racer.id });
    const followed = moves.find(
      (command) => command.kind === "MOVE" && command.unitId === trooper.id,
    );
    expect(followed?.kind === "MOVE" ? followed.path.length : 0).toBe(2);
    const now = turn.state.units.find((unit) => unit.id === trooper.id);
    expect(now === undefined ? 0 : gap(now.at, at(2, 1))).toBe(2);
    // Without the rule the Racer's Move has its ordinary tier.
    const straight = (): ReturnType<typeof moveCandidateV7> =>
      unitCandidatesV7(state, at(3, 1), "MOVE").find(
        (candidate) =>
          candidate.command.kind === "MOVE" &&
          candidate.command.path.length === 2 &&
          same(candidate.command.path[0] ?? at(0, 0), at(4, 1)),
      );
    const lifted = straight()?.score;
    setCandyPolicyOptionsV7({ abilities: false });
    const plain = straight()?.score;
    expect((lifted?.priority ?? 0) - (plain?.priority ?? 0)).toBe(
      GLAZE_FIRST_OFFSET_V7,
    );
    // The Trooper ends one tile further than its own step: one tile carried.
    expect((lifted?.strategicValue ?? 0) - (plain?.strategicValue ?? 0)).toBe(
      GLAZE_CARRY_VALUE_V7,
    );
    setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
    // A Move of one tile Glazes its start alone and carries nobody.
    expect(moveCandidateV7(state, at(3, 1), at(4, 1))?.score.priority).toBe(
      plain?.priority,
    );
  });

  it("lifts no Move of a Racer with nobody to follow it", () => {
    const state = asCandy([own("RAIDER", 3, 1), foe("FIGHTER", 9, 1)]);
    const lifted = unitCandidatesV7(state, at(3, 1), "MOVE")[0]?.score.priority;
    setCandyPolicyOptionsV7({ abilities: false });
    expect(unitCandidatesV7(state, at(3, 1), "MOVE")[0]?.score.priority).toBe(
      lifted,
    );
  });
});

describe("the Candy army seat: Top-Up", () => {
  // A Crashed Trooper at (4, 3) beside a Fighter at 3 HP; the Confectioner
  // stands behind the Trooper.
  const pieces = (hp: number): CandyPieceV7[] => [
    own("CAPTAIN", 4, 4),
    own("FIGHTER", 4, 3, { rush: "CRASHED", hp: 6 }),
    foe("FIGHTER", 4, 2, { hp }),
  ];
  const topUp = (state: GameStateV7): CommandV7 => ({
    kind: "TOP_UP",
    unitId: unitIdAtV7(state, at(4, 4)),
    targetUnitId: unitIdAtV7(state, at(4, 3)),
  });
  /** The unit commands of the turn (a city builds what it likes first). */
  const unitCommands = (commands: readonly CommandV7[]): readonly CommandV7[] =>
    commands.filter((command) => "unitId" in command);

  it("projects the Topped-Up unit's blow as the engine previews it afterwards", () => {
    const state = asCandy(pieces(3));
    const trooper = unitIdAtV7(state, at(4, 3));
    const fighter = unitIdAtV7(state, at(4, 2));
    // Crashed: no attack is offered and none is previewed.
    expect(
      queryCombatPreviewV7(viewerViewV7(state), trooper, fighter),
    ).toBeNull();
    const after = applyOkV7(state, seatIdV7(state, 0), topUp(state)).state;
    const real = queryCombatPreviewV7(viewerViewV7(after), trooper, fighter);
    expect(real?.defenderDies).toBe(true);
    expect(after.units.find((unit) => unit.id === trooper)?.hp).toBe(8);
    // The policy scored the Top-Up as that kill: one tier above it.
    expect(scoreV7(state, topUp(state)).priority).toBe(TOP_UP_KILL_PRIORITY_V7);
  });

  it("Tops Up the Crashed unit with a kill beside it, which then makes the kill", () => {
    const state = asCandy(pieces(3));
    const turn = policyTurn(state);
    const commands = unitCommands(turn.commands);
    expect(commands[0]).toEqual(topUp(state));
    expect(commands[1]).toEqual(attackV7(state, at(4, 3), at(4, 2)));
    expect(
      turn.state.units.some((unit) => unit.id === unitIdAtV7(state, at(4, 2))),
    ).toBe(false);
  });

  it("else Tops Up the Crashed unit in the most danger", () => {
    // No kill: the Fighter is whole. Two Crashed Troopers; the one beside
    // the Fighter is the one in danger.
    const state = asCandy([
      own("CAPTAIN", 4, 4),
      own("FIGHTER", 4, 3, { rush: "CRASHED" }),
      own("FIGHTER", 5, 5, { rush: "CRASHED", hp: 4 }),
      own("FIGHTER", 8, 8),
      foe("GUARD", 4, 2),
    ]);
    const score = scoreV7(state, topUp(state));
    expect(score.priority).toBe(TOP_UP_DANGER_PRIORITY_V7);
    expect(
      scoreV7(state, {
        kind: "TOP_UP",
        unitId: unitIdAtV7(state, at(4, 4)),
        targetUnitId: unitIdAtV7(state, at(5, 5)),
      }).priority,
    ).toBe(-1);
  });

  it("heals at the idle tier when no unit is Crashed in danger", () => {
    const state = asCandy([
      own("CAPTAIN", 4, 4),
      own("FIGHTER", 4, 3, { hp: 4 }),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 0, 10),
    ]);
    expect(scoreV7(state, topUp(state)).priority).toBe(
      SUGAR_TOSS_IDLE_PRIORITY_V7,
    );
  });

  it("never Tops Up instead of a Re-bake it would make", () => {
    const state = asCandy(pieces(3), {
      crumbs: [{ at: at(3, 6), role: "FIGHTER" }],
    });
    expect(scoreV7(state, topUp(state)).priority).toBe(-1);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)[0]).toMatchObject({
      kind: "REBAKE",
      from: at(3, 6),
    });
    expect(
      candidatesV7(state).find((item) => item.command.kind === "REBAKE")?.score
        .priority,
    ).toBe(REBAKE_PRIORITY_V7);
  });
});

describe("the Candy army seat: Re-bake", () => {
  it("bakes before every other command of the turn, the dearest pile first", () => {
    const state = asCandy(
      [
        own("CAPTAIN", 4, 4),
        own("FIGHTER", 4, 3),
        own("FIGHTER", 8, 8),
        foe("FIGHTER", 4, 2, { hp: 3 }),
      ],
      {
        crumbs: [
          { at: at(3, 6), role: "FIGHTER" },
          { at: at(4, 6), role: "MARKSMAN" },
        ],
      },
    );
    const turn = policyTurn(state);
    const copy = turn.commands.filter((command) => "unitId" in command)[0];
    expect(copy).toMatchObject({ kind: "REBAKE", from: at(4, 6) });
    // The copy stands beside the Confectioner, and no nearer to the enemy
    // than the Confectioner is.
    expect(copy?.kind === "REBAKE" ? gap(copy.at, at(4, 4)) : 0).toBe(1);
    expect(
      copy?.kind === "REBAKE" ? gap(copy.at, at(4, 2)) : 0,
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("the Candy army seat: Re-bake from under a unit", () => {
  it("scoops the Crumbs of a Trooper from under the Fighter that killed it, two tiles away", () => {
    // The Fighter advanced onto the Crumbs of the Trooper it killed.
    const state = asCandy(
      [own("CAPTAIN", 4, 5), own("FIGHTER", 3, 4), foe("FIGHTER", 4, 3)],
      { crumbs: [{ at: at(4, 3), role: "FIGHTER" }] },
    );
    const turn = policyTurn(state);
    const first = turn.commands.filter((command) => "unitId" in command)[0];
    expect(first).toMatchObject({ kind: "REBAKE", from: at(4, 3) });
    expect(turn.state.crumbs).toEqual([]);
  });
});

describe("against the Candy: Stuck and Toothache", () => {
  /** Seat 0 Human (the viewer) against seat 1 Candy. */
  const against = (pieces: readonly CandyPieceV7[]): GameStateV7 =>
    candyFieldV7(pieces, { factions: ["ORIGINAL", "CANDY"] });

  it("takes a little off a Raider's blow on a Toffee Trooper and off any blow on a Jawbreaker", () => {
    const cost = (state: GameStateV7, from: CoordV7, to: CoordV7): number => {
      const command = attackV7(state, from, to);
      const on = scoreV7(state, command).strategicValue;
      setCandyPolicyOptionsV7({ respectStatuses: false });
      const off = scoreV7(state, command).strategicValue;
      setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
      return off - on;
    };
    const trooper = against([own("RAIDER", 4, 4), foe("FIGHTER", 4, 3)]);
    expect(
      queryCombatPreviewV7(
        viewerViewV7(trooper),
        unitIdAtV7(trooper, at(4, 4)),
        unitIdAtV7(trooper, at(4, 3)),
      )?.stuckApplied,
    ).toBe("ATTACKER");
    expect(cost(trooper, at(4, 4), at(4, 3))).toBe(STUCK_ATTACKER_COST_V7);
    // A Fighter walks one tile anyway.
    const slow = against([own("FIGHTER", 4, 4), foe("FIGHTER", 4, 3)]);
    expect(cost(slow, at(4, 4), at(4, 3))).toBe(0);
    const jawbreaker = against([own("FIGHTER", 4, 4), foe("SWORDSMAN", 4, 3)]);
    expect(cost(jawbreaker, at(4, 4), at(4, 3))).toBe(
      TOOTHACHE_ATTACKER_COST_V7,
    );
    // A Marksman from two tiles bites nothing.
    const shot = against([own("MARKSMAN", 4, 5), foe("SWORDSMAN", 4, 3)]);
    expect(cost(shot, at(4, 5), at(4, 3))).toBe(0);
  });
});
