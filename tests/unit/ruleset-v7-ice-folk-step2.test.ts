import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
  publicProjectedDamageForPolicyV7,
} from "../../src/ai/v7";
import {
  ARMY_ICE_FOLK_DEFENDER_CAP_COST_V7,
  ARMY_ICE_FOLK_SKIRMISHER_MAXIMUM_V7,
  ARMY_ICE_FOLK_SKIRMISHER_PER_UNITS_V7,
  ARMY_ICE_FOLK_STURDY_V7,
  ARMY_PLAY_FACTIONS_V7,
  ARMY_RESEARCH_ROLES_V7,
  armyClassV7,
  armyIceFolkDefenderCappedV7,
  armyPlayFactionV7,
  armyShareClassV7,
  armySharesV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  SURVEY_RAIDERS_V7,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
  missionByIdV7,
  queryCombatPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type TechnologyIdV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/browser-v7";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { iceFieldV7, type IcePieceV7 } from "../fixtures/v7-ice-folk";

// Step two of the Ice Folk pass (`pulp_wars-w49.27`,
// docs/product/RULESET_7_TUNING_ICE_FOLK.md): hand-played games as the
// Humans against the Ice Folk AI and as the Ice Folk. One rule changed (an
// Ice Folk city's Survey grants a free Sled, Scouts, as the other five
// factions of the army policy have), so the identity is
// `pulp-wars-poc-7r61`. An Ice Folk seat of the Normal AI plays the army
// rules in a match of Humans, Undead, Goblins, Martians, Dinosaurs, and Ice
// Folk: it researches toward its own units in its own order, trains before
// it researches while it is short of capturers, caps its Musk Oxen, counts
// Cold Blood, Planted, and Shatter in the blows it plans, throws the Bolas
// before the blow that then shatters, and keeps its shooters out of a melee
// unit's reach. Two-seat field (tests/fixtures/v7-ice-folk.ts, 11 x 11):
// seat 0 capital (8, 8), seat 1 capital (2, 8), villages (5, 5), (8, 5),
// (5, 8); every other land tile open Grass.

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
/** Every technology but Brittle (the Ice Folk Explosives). */
const NO_BRITTLE = TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES");

/**
 * Seat 0 Ice Folk against seat 1 (Human unless stated); the Ice Folk move.
 * With `orphans` the Ice Folk units have no home city (the capital keeps
 * its unit slots).
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
  const state = iceFieldV7(pieces, {
    factions: ["ICE_FOLK", options.opponent ?? "ORIGINAL"],
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

/** The unit commands of a turn (city and seat commands left out). */
const unitCommands = (commands: readonly CommandV7[]): readonly CommandV7[] =>
  commands.filter((command) => "unitId" in command);
const publicUnit = (view: PlayerViewV7, where: CoordV7) => {
  const unit = view.units.find((candidate) => same(candidate.at, where));
  if (unit === undefined) throw new Error("no unit");
  return unit;
};
const research = (state: GameStateV7) =>
  inspectNormalArmyV7(viewOf(state)).research;

describe("step two of the Ice Folk pass: the identity", () => {
  it("was 7r59 after 7r58, with both save keys obsolete now", () => {
    // (Dwarf crowd control, `pulp_wars-w49.33`, took 7r60, and Goblin
    // explosions and Berserk, `pulp_wars-w49.35`, 7r61.)
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r61");
    expect(PRIOR_RULESET_7_IDS.slice(-3, -1)).toEqual([
      "pulp-wars-poc-7r58",
      "pulp-wars-poc-7r59",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r61.current");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-3, -1)).toEqual([
      "pulpWars.save.v7r58.current",
      "pulpWars.save.v7r59.current",
    ]);
  });
});

describe("step two of the Ice Folk pass: Scouts", () => {
  it("gives an Ice Folk city's Survey a free Sled", () => {
    expect(SURVEY_RAIDERS_V7.ICE_FOLK).toBe(1);
    // The two factions outside the army policy are as they were.
    expect([SURVEY_RAIDERS_V7.DWARF, SURVEY_RAIDERS_V7.CANDY]).toEqual([0, 0]);
    const base = field([own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)], {
      techs: techsOf("GATHERING", "FARMING"),
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
      players: base.players.map((player) =>
        player.id === actor ? { ...player, coins: 10 } : player,
      ),
    };
    const built = applyOkV7(state, actor, { kind: "BUILD_FARM", at: farm });
    expect(built.state.pendingChoices[0]).toMatchObject({
      kind: "CITY_REWARD",
      reachedLevel: 2,
    });
    const chosen = applyOkV7(built.state, actor, {
      kind: "CHOOSE_CITY_REWARD",
      cityId: capital.id,
      reachedLevel: 2,
      reward: "SURVEY",
    });
    expect(
      chosen.events.find((event) => event.kind === "UNIT_REWARD_GRANTED"),
    ).toMatchObject({ role: "RAIDER", reachedLevel: 2 });
    // Without Scouting, beside the garrisoned center.
    const sled = chosen.state.units.find(
      (unit) => unit.ownerId === actor && unit.role === "RAIDER",
    );
    if (sled === undefined) throw new Error("no Sled");
    expect(gap(sled.at, capital.at)).toBe(1);
    expect(effectiveRoleRuleV7("RAIDER", "ICE_FOLK").label).toBe("Sled");
  });
});

describe("step two of the Ice Folk pass: who plays the army rules", () => {
  const pieces = [own("FIGHTER", 8, 8), foe("FIGHTER", 2, 8)];

  it("counts an Ice Folk seat among the army factions, its Boulder Yeti a ranged unit with the siege share", () => {
    const boulder = effectiveRoleRuleV7("CATAPULT", "ICE_FOLK");
    expect([armyShareClassV7(boulder), armyClassV7(boulder)]).toEqual([
      "SIEGE",
      "RANGED",
    ]);
    expect(ARMY_PLAY_FACTIONS_V7).toEqual([
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      "ICE_FOLK",
      // Step two of the Dwarf pass (`pulp_wars-w49.28`).
      "DWARF",
    ]);
    expect(armyPlayFactionV7("ICE_FOLK")).toBe(true);
    expect(armyPlayFactionV7("CANDY")).toBe(false);
  });

  // Step two of the Dwarf pass (`pulp_wars-w49.28`): on against a Dwarf
  // seat too; only a Candy seat is outside the army rules.
  it("is on against each of the other six, and off with a Candy seat", () => {
    for (const opponent of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DINOSAUR",
      "ICE_FOLK",
      "DWARF",
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

describe("step two of the Ice Folk pass: the Ice Folk Normal AI's research order", () => {
  it("is the Sled, the Snow Hunter, the Musk Ox, the Ice Witch, the Mammoth, the Boulder Yeti, the Sabretooth", () => {
    expect(ARMY_RESEARCH_ROLES_V7.ICE_FOLK).toEqual([
      "RAIDER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "SWORDSMAN",
      "CATAPULT",
      "KNIGHT",
    ]);
    // Three capturers for one city, no enemy in sight, no Coins: each
    // technology the seat names next, bought in turn.
    const order: string[] = [];
    let techs: readonly TechnologyIdV7[] = ["GATHERING"];
    for (let step = 0; step < 12; step += 1) {
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
      "SCOUTING:RAIDER",
      "HUNTING",
      "MARKSMANSHIP:MARKSMAN",
      "DRILL",
      "FORTIFICATION:GUARD",
      "ADMINISTRATION:CAPTAIN",
      "ENGINEERING",
      "METALLURGY:SWORDSMAN",
      "FORESTRY",
      "SAWMILLING:CATAPULT",
      "RAIDING",
      "CHIVALRY:KNIGHT",
    ]);
  });
});

describe("step two of the Ice Folk pass: the Ice Folk Normal AI's army", () => {
  const counts = (defenders: number, total: number): ArmyCountsV7 =>
    ({
      total,
      byClass: {
        LINE: total - defenders,
        DEFENDER: defenders,
        RANGED: 0,
        SIEGE: 0,
        BREAKTHROUGH: 0,
        SKIRMISHER: 0,
        SUPPORT: 0,
      },
      hostileFragile: 0,
    }) satisfies ArmyCountsV7;

  it("trains before it researches while it fields fewer capturers than its cities and two more", () => {
    const opening = (yetis: number): GameStateV7 =>
      field(
        [
          ...[at(9, 9), at(9, 8), at(9, 7)]
            .slice(0, yetis)
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

  it("has its own shares, and one Sled for every four units, at most three", () => {
    expect(armySharesV7("ICE_FOLK", false)).toEqual({
      LINE: 40,
      DEFENDER: 15,
      RANGED: 20,
      SIEGE: 15,
      BREAKTHROUGH: 10,
    });
    expect(armySharesV7("ICE_FOLK", true)).toEqual({
      LINE: 35,
      DEFENDER: 10,
      RANGED: 25,
      SIEGE: 20,
      BREAKTHROUGH: 10,
    });
    expect([
      ARMY_ICE_FOLK_SKIRMISHER_PER_UNITS_V7,
      ARMY_ICE_FOLK_SKIRMISHER_MAXIMUM_V7,
    ]).toEqual([4, 3]);
    // The Musk Ox (16 HP) and the Mammoth (20) are the sturdy units a
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
        effectiveRoleRuleV7(role, "ICE_FOLK").maxHp >= ARMY_ICE_FOLK_STURDY_V7,
    );
    expect(sturdy).toEqual(["GUARD", "SWORDSMAN"]);
  });

  it("caps its Musk Oxen at one a city and a third of the army", () => {
    expect(ARMY_ICE_FOLK_DEFENDER_CAP_COST_V7).toBe(6000);
    expect(armyIceFolkDefenderCappedV7(counts(0, 0), 1)).toBe(false);
    expect(armyIceFolkDefenderCappedV7(counts(1, 6), 1)).toBe(true);
    expect(armyIceFolkDefenderCappedV7(counts(1, 6), 3)).toBe(false);
    expect(armyIceFolkDefenderCappedV7(counts(2, 6), 3)).toBe(false);
    // A third of the army with the new Ox counted: three of eight.
    expect(armyIceFolkDefenderCappedV7(counts(3, 8), 5)).toBe(true);
    expect(armyIceFolkDefenderCappedV7(counts(2, 8), 5)).toBe(false);
  });

  it("garrisons a threatened center with one Musk Ox, and trains a Yeti beside it", () => {
    const threatened = (garrison: UnitRoleIdV7): GameStateV7 =>
      field([own(garrison, 8, 8), foe("FIGHTER", 6, 6)], {
        techs: techsOf("GATHERING", "DRILL", "FORTIFICATION"),
        coins: 4,
        orphans: true,
      });
    const trained = (state: GameStateV7) =>
      policyTurn(state).commands.find((command) => command.kind === "TRAIN");
    // A Yeti on the center: the city trains its Ox (the unit steps off).
    expect(trained(threatened("FIGHTER"))).toMatchObject({ role: "GUARD" });
    // An Ox there already: one city, one Ox; the 4 Coins buy a Yeti.
    expect(trained(threatened("GUARD"))).toMatchObject({ role: "FIGHTER" });
  });
});

describe("step two of the Ice Folk pass: what the policy counts for its own blows", () => {
  /** A Yeti beside a Chilled Human Fighter at `hp`. */
  const chilled = (hp: number, techs: readonly TechnologyIdV7[]) => {
    const state = field(
      [
        own("FIGHTER", 5, 4),
        own("FIGHTER", 8, 8),
        foe("FIGHTER", 5, 3, { hp, chill: { sluggish: false, turnsLeft: 2 } }),
      ],
      { techs },
    );
    const view = viewOf(state);
    const yeti = publicUnit(view, at(5, 4));
    const fighter = publicUnit(view, at(5, 3));
    const exact = queryCombatPreviewV7(view, yeti.id, fighter.id);
    if (exact === null) throw new Error("no preview");
    return {
      exact,
      projected: publicProjectedDamageForPolicyV7(
        view,
        yeti,
        fighter,
        fighter.at,
      ),
    };
  };

  it("counts the Shatter of a Chilled unit its blow leaves at the threshold", () => {
    // The Yeti's hit is 5. A Chilled Fighter at 8 HP is left at 3: it
    // shatters, and the blow is worth all 8.
    const plain = chilled(8, NO_BRITTLE);
    expect(plain.exact).toMatchObject({
      damageToDefender: 8,
      defenderDies: true,
    });
    expect(plain.projected).toBe(8);
    // At 9 HP it is left at 4: a kill with Brittle only.
    expect(chilled(9, NO_BRITTLE).exact.defenderDies).toBe(false);
    expect(chilled(9, NO_BRITTLE).projected).toBe(5);
    expect(chilled(9, TECHNOLOGY_IDS_V7).exact.defenderDies).toBe(true);
    expect(chilled(9, TECHNOLOGY_IDS_V7).projected).toBe(9);
    // At 10 HP it is left at 5 either way.
    expect(chilled(10, TECHNOLOGY_IDS_V7).projected).toBe(5);
    for (const hp of [7, 8, 9, 10])
      for (const techs of [NO_BRITTLE, TECHNOLOGY_IDS_V7]) {
        const both = chilled(hp, techs);
        expect(both.projected, `${hp}`).toBe(both.exact.damageToDefender);
      }
  });

  it("counts Planted for a Boulder Yeti that stays, and not for one that moves", () => {
    const state = field([
      own("CATAPULT", 6, 4),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 6, 1),
      foe("FIGHTER", 6, 2),
    ]);
    const view = viewOf(state);
    const boulder = publicUnit(view, at(6, 4));
    const near = publicUnit(view, at(6, 2));
    const far = publicUnit(view, at(6, 1));
    // Planted where it stands: 8 on the Fighter two tiles away.
    expect(queryCombatPreviewV7(view, boulder.id, near.id)).toMatchObject({
      damageToDefender: 8,
      plantedApplied: true,
    });
    expect(publicProjectedDamageForPolicyV7(view, boulder, near, near.at)).toBe(
      8,
    );
    // From another tile the throw is not Planted: 5, and the engine agrees
    // once the Move is made.
    const from = at(5, 3);
    expect(
      publicProjectedDamageForPolicyV7(
        view,
        { ...boulder, at: from },
        far,
        far.at,
      ),
    ).toBe(5);
    const moved = applyOkV7(state, seatIdV7(state, 0), {
      kind: "MOVE",
      unitId: boulder.id,
      path: [from],
    }).state;
    expect(
      queryCombatPreviewV7(viewOf(moved), boulder.id, far.id),
    ).toMatchObject({ damageToDefender: 5, plantedApplied: false });
  });
});

describe("step two of the Ice Folk pass: Chill, then Shatter", () => {
  /** A Sled two tiles from a Human Fighter at `hp`, a Yeti beside it. */
  const position = (hp: number): GameStateV7 =>
    field([
      own("RAIDER", 5, 5),
      own("FIGHTER", 4, 3),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 5, 3, { hp }),
    ]);

  it("throws the Bolas first, and the Yeti's blow then shatters the Fighter", () => {
    // A Fighter at 9 HP: the Yeti's hit alone leaves 4 (and the Yeti takes
    // the answer). Chilled, the same hit shatters it (Brittle: 4).
    const state = position(9);
    const sled = unitAtV7(state, at(5, 5));
    const yeti = unitAtV7(state, at(4, 3));
    const fighter = unitAtV7(state, at(5, 3));
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands).slice(0, 2)).toEqual([
      { kind: "THROW_BOLAS", unitId: sled.id, targetUnitId: fighter.id },
      { kind: "ATTACK", unitId: yeti.id, targetUnitId: fighter.id },
    ]);
    expect(turn.state.units.some((unit) => unit.id === fighter.id)).toBe(false);
    // The Yeti's blow is no candidate while the Bolas is still to come.
    const first = chooseNormalCommandV7(viewOf(state)).candidates.filter(
      (candidate) =>
        candidate.score.priority >= 0 &&
        (candidate.command.kind === "ATTACK" ||
          candidate.command.kind === "THROW_BOLAS"),
    );
    expect(first.map((candidate) => candidate.command)).toEqual([
      { kind: "THROW_BOLAS", unitId: sled.id, targetUnitId: fighter.id },
    ]);
  });

  it("does not wait for a Bolas that sets up no Shatter", () => {
    // At 10 HP the Chilled Fighter is left at 5: the Yeti strikes as any
    // unit does, and the Sled keeps its Bolas.
    const state = position(10);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)).toEqual([
      {
        kind: "ATTACK",
        unitId: unitAtV7(state, at(4, 3)).id,
        targetUnitId: unitAtV7(state, at(5, 3)).id,
      },
    ]);
  });
});

describe("step two of the Ice Folk pass: the shooters stay out of reach", () => {
  it("walks no lone Snow Hunter into a Fighter's reach for a shot that does not kill", () => {
    // The Fighter is three tiles away: a tile two from it is a tile it
    // walks up to and strikes.
    const state = field([
      own("MARKSMAN", 6, 5),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 6, 2),
    ]);
    const hunter = unitAtV7(state, at(6, 5));
    const turn = policyTurn(state);
    const now = turn.state.units.find((unit) => unit.id === hunter.id);
    expect(now === undefined ? 0 : gap(now.at, at(6, 2))).toBeGreaterThan(2);
    expect(turn.commands.some((command) => command.kind === "ATTACK")).toBe(
      false,
    );
  });

  it("still shoots the unit it kills from where it stands", () => {
    const state = field([
      own("MARKSMAN", 6, 4),
      own("FIGHTER", 8, 8),
      foe("FIGHTER", 6, 2, { hp: 3 }),
    ]);
    const turn = policyTurn(state);
    expect(unitCommands(turn.commands)[0]).toEqual({
      kind: "ATTACK",
      unitId: unitAtV7(state, at(6, 4)).id,
      targetUnitId: unitAtV7(state, at(6, 2)).id,
    });
    expect(
      turn.state.units.some((unit) => unit.ownerId !== seatIdV7(state, 0)),
    ).toBe(false);
  });
});

describe("step two of the Ice Folk pass: the lab", () => {
  it("registers the Ice Folk middle game for the text harness", () => {
    const lab = missionByIdV7("LAB_ICE_FOLK_MID");
    expect(lab).toMatchObject({
      id: "LAB_ICE_FOLK_MID",
      revision: 1,
      hidden: true,
    });
  });
});
