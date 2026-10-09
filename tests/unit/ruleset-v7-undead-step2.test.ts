import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
} from "../../src/ai/v7";
import {
  ARMY_NECROMANCER_GRAVES_V7,
  ARMY_NECROMANCER_GRAVE_REACH_V7,
  ARMY_RESEARCH_BEFORE_CAPTURE_PRIORITY_V7,
  ARMY_UNDEAD_GROWTH_FIRST_TECHNOLOGIES_V7,
  ARMY_UNDEAD_SPARE_UNITS_V7,
  ARMY_UNDEAD_WAR_RESEARCH_GRACE_V7,
  armyGarrisonYieldsToRangedV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  BITTEN_RISING_HP_V7,
  INFECT_RISING_HP_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  effectiveRoleRuleV7,
  parseGameStateV7,
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
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";

// Step two of the Undead pass (`pulp_wars-w49.24`, `pulp-wars-poc-7r57`,
// docs/product/RULESET_7_TUNING_UNDEAD.md section 15): five hand-played
// games. One number changed: a Zombie that rises (Infect or Bitten) has 12
// of its 18 HP (10 before). The Normal AI of an Undead seat opens with
// bodies and one growth technology before the Zombie's two, takes the free
// Ghoul and the Militia while it is short of units, trains Banshees and
// Liches in a threatened city, and a Necromancer where Graves lie; and a
// unit of any army seat stays on the Field Defense it stands on. Two-seat
// arena (seed-2 Dry Land, 11 x 11): seat 0 capital (8, 8), seat 1 capital
// (2, 8); every tile explored.

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

interface FieldOptionsV7 extends GoblinArenaOptionsV7 {
  readonly graves?: readonly CoordV7[];
  /** The units on these tiles have no home city (the capital keeps slots). */
  readonly orphans?: readonly CoordV7[];
  /** Tiles of Fertile Ground. */
  readonly fertile?: readonly CoordV7[];
  /** Tiles with a Field Defense. */
  readonly fieldDefenses?: readonly CoordV7[];
}

/**
 * The arena with every tile outside a settlement open Grass with no
 * resource (so a level-1 capital has no opening harvest and the seat's army
 * rules are on), and the given Graves, orphans, Fertile Ground, and Field
 * Defenses.
 */
function field(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 {
  const base = goblinArenaV7(factions, pieces, options);
  return {
    ...base,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.site === null
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: (options.fertile ?? []).some((where) =>
                same(where, tile.at),
              )
                ? ("FERTILE_GROUND" as const)
                : null,
              improvement: null,
              road: false,
              fieldDefense: (options.fieldDefenses ?? []).some((where) =>
                same(where, tile.at),
              ),
            }
          : tile,
      ),
    },
    graves: [...(options.graves ?? [])].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    ),
    units: base.units.map((unit) =>
      (options.orphans ?? []).some((where) => same(where, unit.at))
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

/** The technologies in the canonical order a state lists them in. */
const techsOf = (
  ...techs: readonly TechnologyIdV7[]
): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => techs.includes(tech));

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

const kindsOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.map((command) => command.kind);

/** The routine and other Moves the policy would make with the unit at `from`. */
function movesOf(state: GameStateV7, from: CoordV7): readonly CoordV7[] {
  const unit = unitAtV7(state, from);
  return chooseNormalCommandV7(viewOf(state)).candidates.flatMap((candidate) =>
    candidate.score.priority >= 0 &&
    candidate.command.kind === "MOVE" &&
    candidate.command.unitId === unit.id
      ? [candidate.command.path.at(-1) ?? from]
      : [],
  );
}

function recorded(name: string): GameStateV7 {
  const state = parseGameStateV7(
    JSON.parse(readFileSync(`tests/fixtures/${name}.json`, "utf8")),
  );
  if (state === null) throw new Error(`${name}: not a current state`);
  return state;
}

const UNDEAD: readonly FactionIdV7[] = ["UNDEAD", "ORIGINAL"];

describe("step two of the Undead pass: the identity", () => {
  it("was 7r57 after 7r56, with both save keys obsolete now", () => {
    // (Step two of the Martian pass, `pulp_wars-w49.25`, took 7r58, and
    // step two of the Ice Folk pass, `pulp_wars-w49.27`, 7r59.)
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r70");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r70.current");
    expect(PRIOR_RULESET_7_IDS.slice(-14, -12)).toEqual([
      "pulp-wars-poc-7r56",
      "pulp-wars-poc-7r57",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-14, -12)).toEqual([
      "pulpWars.save.v7r56.current",
      "pulpWars.save.v7r57.current",
    ]);
  });
});

describe("step two of the Undead pass: a Zombie that rises has 12 HP", () => {
  /** What the unit of `factions[0]` at (5, 3) deals the Zombie at (5, 4). */
  const blow = (
    attacker: FactionIdV7,
    role: UnitRoleIdV7,
    hp: number,
    helpers: readonly UnitRoleIdV7[] = [],
    range = 1,
  ): { readonly dealt: number; readonly kills: boolean } => {
    const state = goblinArenaV7(
      [attacker, "UNDEAD"],
      [
        { seat: 0, role, at: at(5, 4 - range) },
        { seat: 1, role: "GUARD", at: at(5, 4), hp },
        ...helpers.map((helper, index) => ({
          seat: 0,
          role: helper,
          at: at(index === 0 ? 4 : 6, 4),
        })),
      ],
    );
    const preview = queryCombatPreviewV7(
      viewOf(state),
      unitAtV7(state, at(5, 4 - range)).id,
      unitAtV7(state, at(5, 4)).id,
    );
    if (preview === null) throw new Error("attack not offered");
    return { dealt: preview.damageToDefender, kills: preview.defenderDies };
  };

  it("raises a Zombie's kill and a bitten death at 12 of 18 HP", () => {
    expect(INFECT_RISING_HP_V7).toBe(12);
    expect(BITTEN_RISING_HP_V7).toBe(12);
    expect(effectiveRoleRuleV7("GUARD", "UNDEAD").maxHp).toBe(18);
    // Infect: a Zombie kills a Fighter beside it.
    const infect = field(UNDEAD, [
      { seat: 0, role: "GUARD", at: at(5, 4) },
      { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 2 },
    ]);
    const zombie = unitAtV7(infect, at(5, 4));
    const preview = queryCombatPreviewV7(
      viewOf(infect),
      zombie.id,
      unitAtV7(infect, at(5, 5)).id,
    );
    expect(preview?.defenderInfected).toBe(true);
    const infected = applyOkV7(infect, zombie.ownerId, {
      kind: "ATTACK",
      unitId: zombie.id,
      targetUnitId: unitAtV7(infect, at(5, 5)).id,
    });
    expect(infected.events.map((event) => event.kind)).toContain(
      "UNIT_INFECTED",
    );
    expect(unitAtV7(infected.state, at(5, 5))).toMatchObject({
      role: "GUARD",
      ownerId: zombie.ownerId,
      hp: 12,
      maxHp: 18,
      homeCityId: null,
    });
    // Bitten: a Skeleton kills a Fighter a Zombie has bitten.
    const base = field(UNDEAD, [
      { seat: 0, role: "FIGHTER", at: at(5, 4) },
      { seat: 0, role: "GUARD", at: at(7, 7) },
      { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 2 },
    ]);
    const bitten: GameStateV7 = {
      ...base,
      bitten: [
        {
          unitId: unitAtV7(base, at(5, 5)).id,
          biterPlayerId: unitAtV7(base, at(7, 7)).ownerId,
          biterUnitId: unitAtV7(base, at(7, 7)).id,
        },
      ],
    };
    const skeleton = unitAtV7(bitten, at(5, 4));
    const risen = applyOkV7(bitten, skeleton.ownerId, {
      kind: "ATTACK",
      unitId: skeleton.id,
      targetUnitId: unitAtV7(bitten, at(5, 5)).id,
    });
    expect(risen.events.map((event) => event.kind)).toContain(
      "BITTEN_UNIT_RISEN",
    );
    expect(unitAtV7(risen.state, at(5, 5))).toMatchObject({
      role: "GUARD",
      ownerId: skeleton.ownerId,
      hp: 12,
      maxHp: 18,
    });
  });

  it("lives through the single blows that killed a rising of 10 HP, and not through a Knight's", () => {
    // At 10 HP (to 7r56) each of these killed a rising in one attack.
    expect(blow("ORIGINAL", "SWORDSMAN", 10)).toEqual({
      dealt: 10,
      kills: true,
    });
    expect(blow("ORIGINAL", "CATAPULT", 10, [], 3).kills).toBe(true);
    expect(blow("GOBLIN", "FIGHTER", 10, ["FIGHTER", "FIGHTER"]).kills).toBe(
      true,
    );
    expect(blow("GOBLIN", "RAIDER", 10, ["FIGHTER"]).kills).toBe(true);
    // At 12 HP: a Champion 11, a Catapult 9, a Goblin with two helpers 11,
    // a Wolf Rider with one helper 9.
    expect(blow("ORIGINAL", "SWORDSMAN", 12)).toEqual({
      dealt: 11,
      kills: false,
    });
    expect(blow("ORIGINAL", "CATAPULT", 12, [], 3)).toEqual({
      dealt: 9,
      kills: false,
    });
    expect(blow("GOBLIN", "FIGHTER", 12, ["FIGHTER", "FIGHTER"])).toEqual({
      dealt: 11,
      kills: false,
    });
    expect(blow("GOBLIN", "RAIDER", 12, ["FIGHTER"])).toEqual({
      dealt: 9,
      kills: false,
    });
    // Two ordinary hits no longer kill (6 and 4 killed a rising of 10): a
    // Fighter and a Marksman deal 5 each, a bomb 5.
    expect(blow("ORIGINAL", "FIGHTER", 12).dealt).toBe(5);
    expect(blow("ORIGINAL", "MARKSMAN", 12, [], 2).dealt).toBe(5);
    expect(blow("GOBLIN", "MARKSMAN", 12, [], 2).dealt).toBe(5);
    // The counters stand: a Knight and a Wolf Rider with two helpers kill.
    expect(blow("ORIGINAL", "KNIGHT", 12)).toEqual({ dealt: 12, kills: true });
    expect(blow("GOBLIN", "RAIDER", 12, ["FIGHTER", "FIGHTER"]).kills).toBe(
      true,
    );
  });
});

describe("step two of the Undead pass: the Undead Normal AI's opening", () => {
  /**
   * An Undead seat with its capital, `skeletons` Skeletons beside it (the
   * center free), Gathering and the root of Industry, and 20 Coins; the
   * Human seat's only unit is far away.
   */
  const opening = (
    skeletons: number,
    options: {
      readonly techs?: readonly TechnologyIdV7[];
      readonly enemyAt?: CoordV7;
      readonly coins?: number;
    } = {},
  ): GameStateV7 =>
    field(
      UNDEAD,
      [
        ...[at(9, 9), at(9, 8), at(9, 7), at(8, 9)]
          .slice(0, skeletons)
          .map((where) => ({ seat: 0, role: "FIGHTER" as const, at: where })),
        { seat: 1, role: "FIGHTER", at: options.enemyAt ?? at(0, 0) },
      ],
      {
        techs: { 0: options.techs ?? techsOf("GATHERING", "DRILL") },
        coins: options.coins ?? 20,
        orphans: [at(9, 9), at(9, 8), at(9, 7), at(8, 9)],
        fertile: [at(7, 7), at(9, 7)],
      },
    );

  it("trains before it researches while it fields fewer units than its cities and two more", () => {
    expect(ARMY_UNDEAD_SPARE_UNITS_V7).toBe(2);
    // One city and two Skeletons: a Skeleton first, the technology with
    // what is left.
    const short = policyTurn(opening(2));
    expect(kindsOf(short.commands)[0]).toBe("TRAIN");
    expect(kindsOf(short.commands)).toContain("RESEARCH");
    // Three Skeletons: the technology first, as before.
    const full = policyTurn(opening(3));
    expect(kindsOf(full.commands)[0]).toBe("RESEARCH");
    // One step from the Zombie with 6 Coins, a Coin short of Fortification:
    // short of units the Skeleton is trained and no Coins are kept; with
    // its units the seat keeps them, as since the Industry reshuffle.
    const beforeZombie = techsOf("GATHERING", "HUNTING", "DRILL");
    const poor = policyTurn(opening(2, { coins: 6, techs: beforeZombie }));
    expect(kindsOf(poor.commands)).toContain("TRAIN");
    const saving = policyTurn(opening(3, { coins: 6, techs: beforeZombie }));
    expect(kindsOf(saving.commands)).not.toContain("TRAIN");
    expect(
      saving.state.players.find((player) => player.seat === 0)?.coins,
    ).toBe(6);
  });

  it("holds in a war too, and not with enough units, without the Coins, or for another faction", () => {
    // A Human Fighter three tiles from a Skeleton in the field. (Bodies
    // first was a rule of peace for one diagnostic match: the seat bought
    // three technologies in rounds 10 to 13 on the research clock of a war
    // with six units on five cities, and was eliminated in round 22.)
    expect(inspectNormalArmyV7(viewOf(opening(2)))).toMatchObject({
      war: false,
      bodiesFirst: true,
    });
    const war = opening(2, { enemyAt: at(6, 6) });
    expect(inspectNormalArmyV7(viewOf(war))).toMatchObject({
      war: true,
      bodiesFirst: true,
    });
    expect(kindsOf(policyTurn(war).commands)[0]).toBe("TRAIN");
    // Until the research clock of the war is a whole technology behind.
    // One technology beside the root; a technology stands for five rounds
    // on this seat's clock (Fortification is 7 Coins, the capital earns 2:
    // four turns and one more), so the next is due from round 5 and is
    // bought before the units again from round 10.
    expect(ARMY_UNDEAD_WAR_RESEARCH_GRACE_V7).toBe(1);
    expect(inspectNormalArmyV7(viewOf(war)).research).toMatchObject({
      tech: "FORTIFICATION",
      cost: 7,
    });
    expect(
      [4, 5, 9, 10, 11].map(
        (round) => inspectNormalArmyV7(viewOf({ ...war, round })).bodiesFirst,
      ),
    ).toEqual([true, true, true, false, false]);
    // (What the clock does then: `tests/unit/ruleset-v7-tuning-8.test.ts`,
    // "2. research while at war".)
    // In peace the round changes nothing.
    expect(
      inspectNormalArmyV7(viewOf({ ...opening(2), round: 30 })).bodiesFirst,
    ).toBe(true);
    // With its units, without the Coins for a Skeleton, or for a seat of
    // another faction: never.
    expect(inspectNormalArmyV7(viewOf(opening(3))).bodiesFirst).toBe(false);
    expect(
      inspectNormalArmyV7(viewOf(opening(2, { coins: 1 }))).bodiesFirst,
    ).toBe(false);
    const human = field(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(9, 9) },
        { seat: 1, role: "FIGHTER", at: at(0, 0) },
      ],
      { techs: { 0: ["GATHERING"] }, coins: 20 },
    );
    expect(inspectNormalArmyV7(viewOf(human)).bodiesFirst).toBe(false);
  });

  it("researches one growth technology before the Zombie's two while no enemy is in sight of its cities", () => {
    expect(ARMY_UNDEAD_GROWTH_FIRST_TECHNOLOGIES_V7).toBe(1);
    // Its opener only, Fertile Ground in its land, the enemy eight tiles
    // away: Farming.
    expect(
      inspectNormalArmyV7(viewOf(opening(3, { techs: ["GATHERING"] })))
        .research,
    ).toMatchObject({ tech: "FARMING", growth: true });
    // The root of Industry does not count as a technology owned.
    expect(inspectNormalArmyV7(viewOf(opening(3))).research).toMatchObject({
      tech: "FARMING",
      growth: true,
    });
    // With that technology the Zombie's are next.
    expect(
      inspectNormalArmyV7(
        viewOf(opening(3, { techs: techsOf("GATHERING", "FARMING") })),
      ).research,
    ).toMatchObject({ tech: "DRILL", growth: false });
    expect(
      inspectNormalArmyV7(
        viewOf(opening(3, { techs: techsOf("GATHERING", "FARMING", "DRILL") })),
      ).research,
    ).toMatchObject({ tech: "FORTIFICATION", unlocks: "GUARD" });
    // A hostile unit within six tiles of the capital: the Zombie first.
    expect(
      inspectNormalArmyV7(
        viewOf(opening(3, { techs: ["GATHERING"], enemyAt: at(2, 8) })),
      ).research,
    ).toMatchObject({ tech: "DRILL", growth: false });
    // A Human seat keeps its own order.
    const human = field(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(9, 9) },
        { seat: 1, role: "FIGHTER", at: at(0, 0) },
      ],
      { techs: { 0: ["GATHERING"] }, fertile: [at(7, 7), at(9, 7)] },
    );
    expect(inspectNormalArmyV7(viewOf(human)).research?.growth).toBe(false);
  });

  it("buys the Zombie's last technology as a due one with an enemy at its gates too", () => {
    // Three Skeletons, Crafting owned, a Human Fighter beside the capital.
    const start = opening(3, {
      techs: techsOf("GATHERING", "FARMING", "DRILL"),
      enemyAt: at(7, 8),
    });
    const fortification = chooseNormalCommandV7(viewOf(start)).candidates.find(
      (candidate) =>
        candidate.command.kind === "RESEARCH" &&
        candidate.command.tech === "FORTIFICATION",
    );
    // (1165, the routine research of an army seat, before this pass.)
    expect(fortification?.score.priority).toBe(1219);
  });

  it("buys a due technology before the capture that would raise its price", () => {
    const village = goblinArenaV7(UNDEAD, []).board.tiles.find(
      (tile) => tile.site === "VILLAGE",
    )?.at;
    if (village === undefined) throw new Error("no village in the arena");
    const start = field(
      UNDEAD,
      [
        { seat: 0, role: "FIGHTER", at: village, captureEligible: true },
        { seat: 0, role: "FIGHTER", at: at(9, 8) },
        { seat: 0, role: "FIGHTER", at: at(9, 7) },
        { seat: 1, role: "FIGHTER", at: at(0, 0) },
      ],
      {
        techs: { 0: techsOf("GATHERING", "FARMING", "DRILL") },
        coins: 20,
        orphans: [village, at(9, 8), at(9, 7)],
      },
    );
    const offered = chooseNormalCommandV7(viewOf(start)).candidates;
    const capture = offered.find(
      (candidate) => candidate.command.kind === "CAPTURE",
    );
    const research = offered.find(
      (candidate) =>
        candidate.command.kind === "RESEARCH" &&
        candidate.command.tech === "FORTIFICATION",
    );
    expect(capture?.score.priority).toBe(1340);
    expect(ARMY_RESEARCH_BEFORE_CAPTURE_PRIORITY_V7).toBe(1341);
    expect(research?.score.priority).toBe(1341);
    const kinds = kindsOf(policyTurn(start).commands);
    expect(kinds.indexOf("RESEARCH")).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf("RESEARCH")).toBeLessThan(kinds.indexOf("CAPTURE"));
    // A Human seat captures first, as before.
    const human = field(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: village, captureEligible: true },
        { seat: 1, role: "FIGHTER", at: at(0, 0) },
      ],
      { techs: { 0: ["GATHERING"] }, coins: 20 },
    );
    expect(kindsOf(policyTurn(human).commands)[0]).toBe("CAPTURE");
  });

  it("takes the Militia and the free Ghoul on the recorded opening (seed 9, round 7)", () => {
    // Four cities and three Skeletons, 9 Coins: it took Walls and Stockpile
    // (twice) here, and trained nothing in rounds 5 to 7.
    const start = recorded("ruleset-v7-undead-opening");
    const seat = start.players.find((player) => player.faction === "UNDEAD");
    expect(start.turnOrder[start.activeSeatIndex]).toBe(seat?.id);
    expect(
      start.units.filter((unit) => unit.ownerId === seat?.id),
    ).toHaveLength(3);
    expect(
      start.cities.filter((city) => city.ownerId === seat?.id),
    ).toHaveLength(4);
    const turn = policyTurn(start);
    const rewards = turn.commands.flatMap((command) =>
      command.kind === "CHOOSE_CITY_REWARD" ? [command.reward] : [],
    );
    // The reward ladder rework (`pulp_wars-zypi`): it still takes both, in
    // the other order (Scouts, with the Ghoul, is a level-3 reward and the
    // Militia a level-2 one since then; the other way round before).
    expect(rewards).toEqual(["SURVEY", "MILITIA"]);
    expect(
      turn.state.units.filter((unit) => unit.ownerId === seat?.id).length,
    ).toBeGreaterThanOrEqual(5);
  });
});

describe("step two of the Undead pass: what a threatened Undead city trains", () => {
  const counts = (
    line: number,
    defender: number,
    ranged: number,
    siege: number,
  ): ArmyCountsV7 => ({
    total: line + defender + ranged + siege,
    byClass: {
      LINE: line,
      DEFENDER: defender,
      RANGED: ranged,
      SIEGE: siege,
      BREAKTHROUGH: 0,
      SKIRMISHER: 0,
      SUPPORT: 0,
    },
    hostileFragile: 0,
  });

  it("lets the garrison rule of an Undead seat yield to a Banshee or a Lich", () => {
    // Three Skeletons and three Zombies, no Banshee: a fifth of the army is
    // their share, and a fifth is the Liches'.
    expect(
      armyGarrisonYieldsToRangedV7("UNDEAD", counts(3, 3, 0, 0), true),
    ).toBe(true);
    expect(
      armyGarrisonYieldsToRangedV7("UNDEAD", counts(3, 3, 0, 0), false, true),
    ).toBe(true);
    // With their shares (three of twelve units each) the body is trained
    // again.
    expect(
      armyGarrisonYieldsToRangedV7("UNDEAD", counts(3, 3, 3, 3), true, true),
    ).toBe(false);
    // Short of Liches only: a Lich when one is on offer, else the body.
    expect(
      armyGarrisonYieldsToRangedV7("UNDEAD", counts(3, 3, 3, 0), true, true),
    ).toBe(true);
    expect(
      armyGarrisonYieldsToRangedV7("UNDEAD", counts(3, 3, 3, 0), true, false),
    ).toBe(false);
    // Not with fewer than three bodies, and not with neither on offer.
    expect(
      armyGarrisonYieldsToRangedV7("UNDEAD", counts(1, 1, 0, 0), true),
    ).toBe(false);
    expect(
      armyGarrisonYieldsToRangedV7("UNDEAD", counts(3, 3, 0, 0), false, false),
    ).toBe(false);
    // A Human seat's rule is about its ranged class only.
    expect(
      armyGarrisonYieldsToRangedV7("ORIGINAL", counts(5, 0, 0, 0), false, true),
    ).toBe(false);
  });

  /**
   * An Undead seat with every technology, a Zombie beside its capital and
   * five more units, and a Human Fighter three tiles from the capital (the
   * city is threatened; the enemy is not at its gates).
   */
  const city = (graves: readonly CoordV7[], enemyAt = at(5, 8)): GameStateV7 =>
    field(
      UNDEAD,
      [
        { seat: 0, role: "GUARD", at: at(9, 8) },
        { seat: 0, role: "GUARD", at: at(9, 9) },
        { seat: 0, role: "FIGHTER", at: at(8, 9) },
        { seat: 0, role: "FIGHTER", at: at(7, 9) },
        { seat: 0, role: "MARKSMAN", at: at(9, 7) },
        { seat: 0, role: "CATAPULT", at: at(10, 8) },
        { seat: 1, role: "FIGHTER", at: enemyAt },
      ],
      {
        coins: 5,
        graves,
        orphans: [at(9, 8), at(9, 9), at(8, 9), at(7, 9), at(9, 7), at(10, 8)],
      },
    );
  const trained = (state: GameStateV7): readonly UnitRoleIdV7[] =>
    policyTurn(state).commands.flatMap((command) =>
      command.kind === "TRAIN" ? [command.role] : [],
    );

  it("trains a Necromancer where three free Graves lie within three tiles of the center", () => {
    expect(ARMY_NECROMANCER_GRAVES_V7).toBe(3);
    expect(ARMY_NECROMANCER_GRAVE_REACH_V7).toBe(3);
    const three = [at(6, 6), at(7, 6), at(6, 9)];
    expect(trained(city(three))).toEqual(["CAPTAIN"]);
    // Two Graves, or three with one of them under a unit, or three farther
    // away: no Necromancer (a support unit in a threatened city).
    expect(trained(city(three.slice(0, 2)))).not.toContain("CAPTAIN");
    expect(trained(city([at(6, 6), at(7, 6), at(7, 9)]))).not.toContain(
      "CAPTAIN",
    );
    expect(trained(city([at(4, 4), at(4, 5), at(3, 6)]))).not.toContain(
      "CAPTAIN",
    );
    // With an enemy at the gates the city trains a body.
    expect(trained(city(three, at(6, 8)))).not.toContain("CAPTAIN");
  });
});

describe("step two of the Undead pass: a unit stays on its Field Defense", () => {
  it("on the recorded position the Zombie builds a Field Defense on its center and does not walk off it", () => {
    // Round 8 of a hand-played game of the Goblin pass: the Undead seat
    // built a Field Defense under the Zombie on a village center, walked
    // the Zombie off it in the same turn, and a Skeleton stepped on.
    const start = recorded("ruleset-v7-undead-field-defense");
    const seat = start.players.find((player) => player.faction === "UNDEAD");
    expect(start.turnOrder[start.activeSeatIndex]).toBe(seat?.id);
    const turn = policyTurn(start);
    const built = turn.commands.flatMap((command) =>
      command.kind === "BUILD_FIELD_DEFENSE" ? [command.unitId] : [],
    );
    expect(built).toHaveLength(1);
    const zombie = start.units.find((unit) => unit.id === built[0]);
    expect(zombie?.role).toBe("GUARD");
    expect(
      turn.commands.filter(
        (command) => command.kind === "MOVE" && command.unitId === built[0],
      ),
    ).toEqual([]);
    expect(turn.state.units.find((unit) => unit.id === built[0])?.at).toEqual(
      zombie?.at,
    );
  });

  it("an army seat's unit on a Field Defense in an enemy's reach makes no routine Move", () => {
    // A Fighter (a Skeleton) beside its capital, another on the center, and
    // two enemy Fighters two tiles from it. On open ground it has Moves; on
    // a Field Defense it keeps only the ones worth more than a routine
    // Move, which end beside an enemy unit.
    for (const factions of [
      ["ORIGINAL", "GOBLIN"],
      ["UNDEAD", "ORIGINAL"],
    ] as const) {
      const pieces: GoblinPieceV7[] = [
        { seat: 0, role: "FIGHTER", at: at(7, 7) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "FIGHTER", at: at(5, 7), hp: 6 },
        { seat: 1, role: "FIGHTER", at: at(5, 8) },
      ];
      const open = field(factions, pieces);
      const dug = field(factions, pieces, { fieldDefenses: [at(7, 7)] });
      // (The tile is the seat's own land in this arena.)
      expect(
        open.board.tiles.find((tile) => same(tile.at, at(7, 7)))
          ?.territoryCityId,
      ).not.toBeNull();
      const before = movesOf(open, at(7, 7));
      const after = movesOf(dug, at(7, 7));
      expect(before.length, factions[0]).toBeGreaterThan(0);
      for (const end of after)
        expect(
          Math.min(gap(end, at(5, 7)), gap(end, at(5, 8))),
          factions[0],
        ).toBe(1);
      expect(after.length, factions[0]).toBeLessThan(before.length);
    }
  });

  it("the seat ids of the arena", () => {
    // (Guards the fixture: seat 0 moves first.)
    const state = field(UNDEAD, [{ seat: 0, role: "FIGHTER", at: at(9, 9) }]);
    expect(state.turnOrder[state.activeSeatIndex]).toBe(seatIdV7(state, 0));
  });
});
