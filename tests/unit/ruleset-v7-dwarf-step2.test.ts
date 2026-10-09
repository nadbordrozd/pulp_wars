import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
} from "../../src/ai/v7";
import {
  ARMY_DWARF_SKIRMISHER_MAXIMUM_V7,
  ARMY_DWARF_SKIRMISHER_PER_UNITS_V7,
  ARMY_DWARF_STURDY_V7,
  ARMY_PLAY_FACTIONS_V7,
  ARMY_RESEARCH_ROLES_V7,
  armyGarrisonYieldsToRangedV7,
  armyPlayFactionV7,
  armyRoleScoreV7,
  armySharesV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  RULESET_7_ID,
  SURVEY_RAIDERS_V7,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
  missionByIdV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { dwarfFieldV7 } from "../fixtures/v7-dwarf";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import type { IcePieceV7 } from "../fixtures/v7-ice-folk";

// Step two of the Dwarf pass (`pulp_wars-w49.28`,
// docs/product/RULESET_7_TUNING_DWARF.md): hand-played games as the Humans
// against the Dwarf AI and as the Dwarves. No rule changed, so the identity
// stayed `pulp-wars-poc-7r59` (7r60 since Dwarf crowd control,
// `pulp_wars-w49.33`, and 7r61 since Goblin explosions and Berserk,
// `pulp_wars-w49.35`). A Dwarf seat of the Normal AI plays the army
// rules in a match whose every seat is Human, Undead, Goblin, Martian,
// Dinosaur, Ice Folk, or Dwarf (a Candy seat keeps the older policy for
// every seat): it researches toward its own units in its own order, trains
// before it researches while it is short of capturers, took the 4 Coins at
// level 2 (until the reward ladder rework, `pulp_wars-zypi`, 7r63), counts its fragile units as weak links of a Knight's chain,
// and keeps its Clockwork Gunners out of a melee unit's reach. Two-seat field (tests/fixtures/v7-dwarf.ts,
// 11 x 11): seat 0 capital (8, 8), seat 1 capital (2, 8), villages (5, 5),
// (8, 5), (5, 8); every other land tile open Grass.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const own = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<IcePieceV7> = {},
): IcePieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));

/**
 * Seat 0 Dwarf against seat 1 (Human unless stated); the Dwarves move.
 * With `orphans` the Dwarf units have no home city (the capital keeps its
 * unit slots).
 */
function field(
  pieces: readonly IcePieceV7[],
  options: {
    readonly techs?: readonly TechnologyIdV7[];
    readonly coins?: number;
    readonly orphans?: boolean;
    readonly opponent?: FactionIdV7;
  } = {},
): GameStateV7 {
  const state = dwarfFieldV7(pieces, {
    factions: ["DWARF", options.opponent ?? "ORIGINAL"],
    techs: { 0: options.techs ?? TECHNOLOGY_IDS_V7, 1: [] },
    coins: options.coins ?? 0,
  });
  if (options.orphans !== true) return state;
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

describe("step two of the Dwarf pass: no rule changed", () => {
  // The reward ladder rework (`pulp_wars-zypi`, 7r63): every faction's
  // Scouts, a level-3 reward since then, grants its fast unit, so the
  // Dwarves a Gyrocopter (the Dwarf Survey was the area alone here).
  it("kept the identity; the Dwarf Survey has a Gyrocopter since the reward ladder rework", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r63");
    expect([SURVEY_RAIDERS_V7.DWARF, SURVEY_RAIDERS_V7.CANDY]).toEqual([1, 1]);
  });
});

describe("step two of the Dwarf pass: who plays the army rules", () => {
  const pieces = [own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)];

  it("counts a Dwarf seat among the army factions; only a Candy seat is outside", () => {
    expect(ARMY_PLAY_FACTIONS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      "ICE_FOLK",
      "DWARF",
    ]);
    expect(armyPlayFactionV7("DWARF")).toBe(true);
    expect(armyPlayFactionV7("CANDY")).toBe(false);
  });

  it("is on against each of the other six and a Dwarf mirror, and off with a Candy seat", () => {
    for (const opponent of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      "ICE_FOLK",
    ] as const)
      expect(
        inspectNormalArmyV7(viewOf(field(pieces, { opponent }))).army,
        opponent,
      ).toBe(true);
    expect(
      inspectNormalArmyV7(viewOf(field(pieces, { opponent: "CANDY" }))).army,
    ).toBe(false);
  });
});

describe("step two of the Dwarf pass: the Dwarf Normal AI's research order", () => {
  it("is the Steam Mole, the Clockwork Gunner, the Gyrocopter, the Engineer, the Steam Tank, the Steam Cannon, the Whirligig", () => {
    expect(ARMY_RESEARCH_ROLES_V7.DWARF).toEqual([
      "GUARD",
      "MARKSMAN",
      "RAIDER",
      "CAPTAIN",
      "SWORDSMAN",
      "CATAPULT",
      "KNIGHT",
    ]);
    // Three capturers for one city, no enemy in sight, no Coins: each
    // technology the seat names next, bought in turn.
    const order: string[] = [];
    let techs: readonly TechnologyIdV7[] = ["GATHERING"];
    for (let step = 0; step < 13; step += 1) {
      const next = research(
        field(
          [
            own("FIGHTER", 9, 9),
            own("FIGHTER", 9, 8),
            own("FIGHTER", 9, 7),
            foe("FIGHTER", 0, 0),
          ],
          { techs: techsOf(...techs), orphans: true },
        ),
      );
      if (next === null) break;
      order.push(
        next.unlocks === null ? next.tech : `${next.tech}:${next.unlocks}`,
      );
      techs = [...techs, next.tech];
    }
    expect(order).toEqual([
      "DRILL",
      "FORTIFICATION:GUARD",
      "HUNTING",
      "MARKSMANSHIP:MARKSMAN",
      "SCOUTING:RAIDER",
      "ADMINISTRATION:CAPTAIN",
      "ENGINEERING",
      "METALLURGY:SWORDSMAN",
      "FORESTRY",
      "SAWMILLING:CATAPULT",
      "RAIDING",
      "CHIVALRY:KNIGHT",
    ]);
  });

  it("buys Blasting Charges first of the late technologies at war", () => {
    // Every unit of the order owned, a Human army in the field.
    const everything = TECHNOLOGY_IDS_V7.filter(
      (tech) => tech !== "EXPLOSIVES",
    );
    const state = field(
      [
        own("FIGHTER", 8, 8),
        own("FIGHTER", 7, 7),
        own("FIGHTER", 9, 7),
        foe("FIGHTER", 6, 6),
        foe("FIGHTER", 5, 6),
        foe("FIGHTER", 6, 5),
      ],
      { techs: everything, orphans: true },
    );
    expect(inspectNormalArmyV7(viewOf(state)).war).toBe(true);
    expect(research(state)?.tech).toBe("EXPLOSIVES");
  });
});

describe("step two of the Dwarf pass: the Dwarf Normal AI's army", () => {
  it("trains before it researches while it fields fewer capturers than its cities and two more", () => {
    const opening = (hammerers: number): GameStateV7 =>
      field(
        [
          ...[at(9, 9), at(9, 8), at(9, 7)]
            .slice(0, hammerers)
            .map((where) => own("FIGHTER", where.x, where.y)),
          foe("FIGHTER", 0, 0),
        ],
        { techs: techsOf("GATHERING"), coins: 20, orphans: true },
      );
    expect(inspectNormalArmyV7(viewOf(opening(2))).bodiesFirst).toBe(true);
    expect(policyTurn(opening(2)).commands[0]).toMatchObject({
      kind: "TRAIN",
      role: "FIGHTER",
    });
    expect(inspectNormalArmyV7(viewOf(opening(3))).bodiesFirst).toBe(false);
  });

  it("counts only the units that capture: a Gyrocopter and a Steam Tank take no village", () => {
    const with2 = (role: UnitRoleIdV7): GameStateV7 =>
      field(
        [
          own("FIGHTER", 9, 9),
          own("FIGHTER", 9, 8),
          own(role, 9, 7),
          foe("FIGHTER", 0, 0),
        ],
        { techs: techsOf("GATHERING"), coins: 20, orphans: true },
      );
    expect(inspectNormalArmyV7(viewOf(with2("RAIDER"))).bodiesFirst).toBe(true);
    expect(inspectNormalArmyV7(viewOf(with2("SWORDSMAN"))).bodiesFirst).toBe(
      true,
    );
    // A Steam Mole and a Clockwork Gunner capture.
    expect(inspectNormalArmyV7(viewOf(with2("GUARD"))).bodiesFirst).toBe(false);
    expect(inspectNormalArmyV7(viewOf(with2("MARKSMAN"))).bodiesFirst).toBe(
      false,
    );
  });

  it("has its own shares, one Gyrocopter for every five units at most two, and two sturdy units", () => {
    expect(armySharesV7("DWARF", false)).toEqual({
      LINE: 40,
      DEFENDER: 15,
      RANGED: 25,
      SIEGE: 10,
      BREAKTHROUGH: 10,
    });
    expect(armySharesV7("DWARF", true)).toEqual({
      LINE: 35,
      DEFENDER: 10,
      RANGED: 25,
      SIEGE: 10,
      BREAKTHROUGH: 20,
    });
    expect([
      ARMY_DWARF_SKIRMISHER_PER_UNITS_V7,
      ARMY_DWARF_SKIRMISHER_MAXIMUM_V7,
    ]).toEqual([5, 2]);
    // Four line units: no Gyrocopter is wanted yet; ten: two; fifteen:
    // still two.
    const gyro = (line: number, skirmishers: number): number =>
      armyRoleScoreV7(
        "DWARF",
        "RAIDER",
        counts({ LINE: line, SKIRMISHER: skirmishers }),
        false,
      );
    expect(gyro(4, 0)).toBeLessThan(gyro(5, 0));
    expect(gyro(10, 1)).toBeGreaterThan(gyro(10, 2));
    expect(gyro(15, 2)).toBe(gyro(10, 2));
    // The Steam Mole (16 HP) and the Steam Tank (16, Plated) are the units
    // a Knight's chain does not ride through.
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
        effectiveRoleRuleV7(role, "DWARF").maxHp >= ARMY_DWARF_STURDY_V7,
    );
    expect(sturdy).toEqual(["GUARD", "SWORDSMAN"]);
  });

  it("lets a garrison yield to a Clockwork Gunner as a Human one does to a Marksman", () => {
    const army = counts({ LINE: 3, DEFENDER: 1 });
    expect(armyGarrisonYieldsToRangedV7("DWARF", army, true)).toBe(true);
    expect(armyGarrisonYieldsToRangedV7("DWARF", army, false)).toBe(false);
    expect(armyGarrisonYieldsToRangedV7("CANDY", army, true)).toBe(false);
  });

  // The reward ladder rework (`pulp_wars-zypi`): level 2 offers the
  // Stockpile or the Militia (the Survey or the Stockpile before, where
  // this seat took the 4 Coins), and a seat with fewer than two units for
  // each city takes the Militia's free Hammerer.
  it("takes the Militia's free Hammerer at level 2 while short of units", () => {
    const base = field([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)], {
      techs: techsOf("GATHERING", "FARMING"),
      coins: 10,
    });
    const actor = seatIdV7(base, 0);
    const capital = base.cities.find((city) => city.ownerId === actor);
    if (capital === undefined) throw new Error("capital missing");
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
});

describe("step two of the Dwarf pass: the Clockwork Gunner stays out of reach", () => {
  it("walks no lone Gunner into a Fighter's reach for a shot that does not kill", () => {
    // The Fighter is three tiles away: a tile two from it is a tile it
    // walks up to and strikes (the Gunner has 10 HP and Defense 1, and
    // never heals by itself).
    const state = field([
      own("MARKSMAN", 6, 5),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 6, 2),
    ]);
    const gunner = unitAtV7(state, at(6, 5));
    const turn = policyTurn(state);
    const now = turn.state.units.find((unit) => unit.id === gunner.id);
    expect(now === undefined ? 0 : gap(now.at, at(6, 2))).toBeGreaterThan(2);
    expect(turn.commands.some((command) => command.kind === "ATTACK")).toBe(
      false,
    );
  });

  it("still fires twice from where it stands at a unit in range", () => {
    const state = field([
      own("MARKSMAN", 6, 4),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 6, 2, { hp: 6 }),
    ]);
    const turn = policyTurn(state);
    const shots = turn.commands.filter(
      (command) =>
        command.kind === "ATTACK" &&
        command.unitId === unitAtV7(state, at(6, 4)).id,
    );
    expect(shots).toHaveLength(2);
    expect(
      turn.state.units.some((unit) => unit.ownerId !== seatIdV7(state, 0)),
    ).toBe(false);
  });
});

describe("step two of the Dwarf pass: the lab", () => {
  it("is LAB_DWARF_MID: the Dwarf roster against the Human side of the Ice Folk lab", () => {
    const lab = missionByIdV7("LAB_DWARF_MID");
    if (lab === null) throw new Error("no lab");
    expect(lab).toMatchObject({ revision: 1, hidden: true, size: 16 });
    const [dwarves, humans] = lab.seats;
    if (dwarves === undefined || humans === undefined)
      throw new Error("seats missing");
    expect(dwarves.faction).toBe("DWARF");
    expect(humans.faction).toBe("ORIGINAL");
    expect(dwarves.technologies).toHaveLength(13);
    expect(dwarves.technologies).not.toContain("EXPLOSIVES");
    const roles = dwarves.units.map((unit) => unit.role);
    const tally = Object.fromEntries(
      [...new Set(roles)].map((role) => [
        role,
        roles.filter((item) => item === role).length,
      ]),
    );
    expect(tally).toEqual({
      FIGHTER: 5,
      RAIDER: 2,
      MARKSMAN: 2,
      GUARD: 2,
      CAPTAIN: 1,
      SWORDSMAN: 2,
      CATAPULT: 1,
      KNIGHT: 1,
    });
    const coins = roles.reduce(
      (sum, role) => sum + (effectiveRoleRuleV7(role, "DWARF").cost ?? 0),
      0,
    );
    expect(coins).toBe(74);
    // The Human side is the Ice Folk lab's.
    const iceFolk = missionByIdV7("LAB_ICE_FOLK_MID");
    expect(humans).toEqual(iceFolk?.seats[1]);
  });
});
