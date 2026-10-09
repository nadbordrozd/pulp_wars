import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
  inspectNormalArmyV7,
} from "../../src/ai/v7";
import {
  ARMY_HEAT_SINKS_RAY_GUNNERS_V7,
  ARMY_MARTIAN_HEAVY_CAP_COST_V7,
  ARMY_RESEARCH_BEFORE_CAPTURE_PRIORITY_V7,
  ARMY_RESEARCH_ROLES_V7,
  ARMY_UNDEAD_SPARE_UNITS_V7,
  armyMartianHeavyCappedV7,
} from "../../src/ai/v7-army";
import {
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  parseGameStateV7,
  queryCombatPreviewV7,
  resolveCityGrowthV7,
  queryTractorBeamPathV7,
  unitHeldByCityWallsV7,
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
import { UNIT_GLOSSARY_V7 } from "../../src/render/unit-glossary-v7";
import { shockFieldTextV7 } from "../../scripts/play-text-v7";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { checkedV7 } from "../fixtures/v7-builders";
import { martianFieldV7, offeredV7 } from "../fixtures/v7-martian";

// Step two of the Martian pass (`pulp_wars-w49.25`, `pulp-wars-poc-7r69`,
// docs/product/RULESET_7_TUNING_MARTIAN.md section 14): hand-played games as
// the Humans against the Martian AI and as the Martians. One rule changed:
// City Walls hold a unit on its own city center against a Saucer's Tractor
// Beam (a Mothership's Heavy Tractor Beam still pulls it). The Normal AI of
// a Martian seat trains before it researches while it is short of units,
// takes the free Saucer, researches the Brain third and the Tripod before
// the Shock Trooper unless the enemy fights hand to hand, Heat Sinks after
// its second Ray Gunner, keeps a Shock Trooper for every two Grunts, and
// no longer walks a Tripod out in front of its line for a shot at half
// power. Two-seat arena (seed-2 Dry Land, 11 x 11): seat 0 capital (8, 8),
// seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

interface FieldOptionsV7 extends GoblinArenaOptionsV7 {
  /** The units on these tiles have no home city (the capital keeps slots). */
  readonly orphans?: readonly CoordV7[];
  /** Tiles of Fertile Ground. */
  readonly fertile?: readonly CoordV7[];
  /** Tiles with Fruit. */
  readonly fruit?: readonly CoordV7[];
}

/**
 * The arena with every tile outside a settlement open Grass with no
 * resource but the given Fertile Ground and Fruit.
 */
function field(
  factions: readonly FactionIdV7[],
  pieces: readonly GoblinPieceV7[],
  options: FieldOptionsV7 = {},
): GameStateV7 {
  const base = goblinArenaV7(factions, pieces, options);
  const marked = (list: readonly CoordV7[] | undefined, where: CoordV7) =>
    (list ?? []).some((candidate) => same(candidate, where));
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
              resource: marked(options.fertile, tile.at)
                ? ("FERTILE_GROUND" as const)
                : marked(options.fruit, tile.at)
                  ? ("FRUIT" as const)
                  : null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
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

const trainedIn = (commands: readonly CommandV7[]): readonly UnitRoleIdV7[] =>
  commands.flatMap((command) =>
    command.kind === "TRAIN" ? [command.role] : [],
  );

/** The Moves the policy would make with the unit at `from`. */
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

const HUMAN_CAPITAL = at(2, 8);

/** The seat-1 capital grown to level 3 by three Farms west of it, with Walls. */
function walledHumanCapital(base: GameStateV7): GameStateV7 {
  const capital = base.cities.find((city) => same(city.at, HUMAN_CAPITAL));
  if (capital === undefined) throw new Error("no Human capital");
  const farms = base.board.tiles
    .filter(
      (tile) =>
        tile.territoryCityId === capital.id &&
        tile.site === null &&
        tile.at.x < HUMAN_CAPITAL.x,
    )
    .slice(0, 3);
  if (farms.length !== 3) throw new Error("farm tiles missing");
  const economicPopulation = capital.economicPopulation + 2 * farms.length;
  const grown = resolveCityGrowthV7(
    capital,
    capital.permanentPopulation,
    economicPopulation,
  ).city;
  expect(grown.level).toBe(3);
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + farms.length,
    cities: base.cities.map((city) =>
      city.id === capital.id
        ? {
            ...grown,
            economicPopulation,
            rewards: [
              { reachedLevel: 2, reward: "STOCKPILE" as const },
              { reachedLevel: 3, reward: "WALLS" as const },
            ],
          }
        : city,
    ),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        farms.some((farm) => same(farm.at, tile.at))
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: "FERTILE_GROUND" as const,
              improvement: "FARM" as const,
            }
          : tile,
      ),
    },
    populationContributions: [
      ...base.populationContributions,
      ...farms.map((tile, index) => ({
        id: base.nextEntityId + index,
        cityId: capital.id,
        category: "LIVE" as const,
        amount: 2,
        source: {
          kind: "IMPROVEMENT" as const,
          improvement: "FARM" as const,
          at: tile.at,
        },
      })),
    ],
  });
}

const MARTIAN: readonly FactionIdV7[] = ["MARTIAN", "ORIGINAL"];

describe("step two of the Martian pass: the identity", () => {
  it("was 7r58 after 7r57, with both save keys obsolete now", () => {
    // (Step two of the Ice Folk pass, `pulp_wars-w49.27`, took 7r59,
    // Dwarf crowd control, `pulp_wars-w49.33`, 7r60, and Goblin explosions
    // and Berserk, `pulp_wars-w49.35`, 7r61.)
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r69");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r69.current");
    expect(PRIOR_RULESET_7_IDS.slice(-12, -10)).toEqual([
      "pulp-wars-poc-7r57",
      "pulp-wars-poc-7r58",
    ]);
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-12, -10)).toEqual([
      "pulpWars.save.v7r57.current",
      "pulpWars.save.v7r58.current",
    ]);
  });
});

describe("step two of the Martian pass: City Walls hold against a Saucer's Tractor Beam", () => {
  /**
   * A Human Fighter on its capital center, a Saucer two tiles east of it,
   * a Mothership three tiles east, and a Grunt beside the Saucer. `walls`
   * gives the capital its level-3 City Walls.
   */
  const siege = (walls: boolean): GameStateV7 => {
    const base = martianFieldV7([
      { seat: 0, role: "RAIDER", at: at(4, 8) },
      { seat: 0, role: "KNIGHT", at: at(5, 7) },
      { seat: 0, role: "FIGHTER", at: at(4, 7) },
      { seat: 1, role: "FIGHTER", at: HUMAN_CAPITAL },
    ]);
    return walls ? walledHumanCapital(base) : base;
  };
  const pull = (
    state: GameStateV7,
    puller: CoordV7,
  ): Extract<CommandV7, { kind: "TRACTOR_BEAM" }> => ({
    kind: "TRACTOR_BEAM",
    unitId: unitAtV7(state, puller).id,
    targetUnitId: unitAtV7(state, HUMAN_CAPITAL).id,
  });
  const offeredPulls = (state: GameStateV7): readonly CoordV7[] =>
    offeredV7(state, "TRACTOR_BEAM").flatMap((command) =>
      command.kind === "TRACTOR_BEAM" &&
      command.targetUnitId === unitAtV7(state, HUMAN_CAPITAL).id
        ? [
            state.units.find((unit) => unit.id === command.unitId)?.at ??
              at(-1, -1),
          ]
        : [],
    );

  it("lets a Saucer pull a unit off a center without Walls, as before", () => {
    const state = siege(false);
    expect(
      unitHeldByCityWallsV7(state.cities, unitAtV7(state, HUMAN_CAPITAL)),
    ).toBe(false);
    expect(offeredPulls(state)).toEqual(
      expect.arrayContaining([at(4, 8), at(5, 7)]),
    );
    const pulled = applyOkV7(state, seatIdV7(state, 0), pull(state, at(4, 8)));
    expect(unitAtV7(pulled.state, at(3, 8)).role).toBe("FIGHTER");
  });

  it("holds a unit on its own walled center against the Saucer, in the query and in the reducer", () => {
    const state = siege(true);
    const fighter = unitAtV7(state, HUMAN_CAPITAL);
    expect(unitHeldByCityWallsV7(state.cities, fighter)).toBe(true);
    // The Saucer's pull is not offered and has no path; the Mothership's is.
    expect(offeredPulls(state)).toEqual([at(5, 7)]);
    const view = viewOf(state);
    expect(
      queryTractorBeamPathV7(view, unitAtV7(state, at(4, 8)).id, fighter.id),
    ).toBeNull();
    expect(
      queryTractorBeamPathV7(view, unitAtV7(state, at(5, 7)).id, fighter.id),
    ).not.toBeNull();
    const refused = applyCommandV7(
      state,
      seatIdV7(state, 0),
      pull(state, at(4, 8)),
    );
    expect(refused.accepted).toBe(false);
    if (!refused.accepted)
      expect(refused.error).toMatchObject({
        code: "TRACTOR_BEAM_NOT_LEGAL",
        params: { reason: "TARGET_IMMUNE" },
      });
  });

  it("does not hold against a Mothership's Heavy Tractor Beam", () => {
    const state = siege(true);
    const fighter = unitAtV7(state, HUMAN_CAPITAL);
    const pulled = applyOkV7(state, seatIdV7(state, 0), pull(state, at(5, 7)));
    const after = pulled.state.units.find((unit) => unit.id === fighter.id);
    expect(after === undefined ? null : same(after.at, HUMAN_CAPITAL)).toBe(
      false,
    );
    expect(pulled.events.map((event) => event.kind)).toContain("UNIT_PULLED");
  });

  it("holds only the units of the city's owner, on the center itself", () => {
    // A Martian Grunt that stands on the Humans' walled center is not held
    // (its own Saucer may pull it off), and a Human unit beside the center
    // is not held either.
    const base = siege(true);
    const grunt = unitAtV7(base, at(4, 7));
    const fighter = unitAtV7(base, HUMAN_CAPITAL);
    expect(
      unitHeldByCityWallsV7(base.cities, { ...grunt, at: HUMAN_CAPITAL }),
    ).toBe(false);
    expect(
      unitHeldByCityWallsV7(base.cities, { ...fighter, at: at(2, 7) }),
    ).toBe(false);
    expect(
      unitHeldByCityWallsV7(base.cities, { ...fighter, form: "EMBARKED" }),
    ).toBe(false);
  });

  it("says so where a player reads about the beam", () => {
    const entry = (id: string): string =>
      UNIT_GLOSSARY_V7.find((candidate) => candidate.id === id)?.text ?? "";
    expect(entry("TRACTOR_BEAM")).toContain("City Walls hold");
    expect(entry("TRACTOR_BEAM_HEAVY")).toContain("even off City Walls");
  });
});

describe("step two of the Martian pass: the Martian Normal AI's opening", () => {
  /**
   * A Martian seat with its capital, `grunts` Grunts beside it (the center
   * free), Gathering and the root of Industry, and 20 Coins; the Human
   * seat's only unit is far away.
   */
  const opening = (
    grunts: number,
    options: {
      readonly techs?: readonly TechnologyIdV7[];
      readonly enemyAt?: CoordV7;
      readonly coins?: number;
      readonly saucers?: number;
    } = {},
  ): GameStateV7 =>
    field(
      MARTIAN,
      [
        ...[at(9, 9), at(9, 8), at(9, 7), at(8, 9)]
          .slice(0, grunts)
          .map((where) => ({ seat: 0, role: "FIGHTER" as const, at: where })),
        ...[at(10, 9), at(10, 8)]
          .slice(0, options.saucers ?? 0)
          .map((where) => ({ seat: 0, role: "RAIDER" as const, at: where })),
        { seat: 1, role: "FIGHTER", at: options.enemyAt ?? at(0, 0) },
      ],
      {
        techs: { 0: options.techs ?? techsOf("GATHERING", "DRILL") },
        coins: options.coins ?? 20,
        orphans: [at(9, 9), at(9, 8), at(9, 7), at(8, 9), at(10, 9), at(10, 8)],
        fertile: [at(7, 7), at(9, 7)],
      },
    );

  it("trains before it researches while it fields fewer capturers than its cities and two more", () => {
    expect(ARMY_UNDEAD_SPARE_UNITS_V7).toBe(2);
    expect(inspectNormalArmyV7(viewOf(opening(2))).bodiesFirst).toBe(true);
    const short = policyTurn(opening(2));
    expect(kindsOf(short.commands)[0]).toBe("TRAIN");
    expect(trainedIn(short.commands)).toEqual(["FIGHTER"]);
    // With three Grunts the technology comes first, as before.
    expect(inspectNormalArmyV7(viewOf(opening(3))).bodiesFirst).toBe(false);
    expect(kindsOf(policyTurn(opening(3)).commands)[0]).toBe("RESEARCH");
    // Its Saucers are carriers, not bodies: two Grunts and two Saucers are
    // still short of units.
    expect(
      inspectNormalArmyV7(viewOf(opening(2, { saucers: 2 }))).bodiesFirst,
    ).toBe(true);
    // In a war too (a Human Fighter three tiles from a Grunt).
    expect(
      inspectNormalArmyV7(viewOf(opening(2, { enemyAt: at(6, 6) }))),
    ).toMatchObject({ war: true, bodiesFirst: true });
  });

  it("researches one growth technology before the Shield Projector's two while no enemy is in sight of its cities", () => {
    expect(
      inspectNormalArmyV7(viewOf(opening(3, { techs: ["GATHERING"] })))
        .research,
    ).toMatchObject({ tech: "FARMING", growth: true });
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
    // A hostile unit within six tiles of the capital: the Projector first.
    expect(
      inspectNormalArmyV7(
        viewOf(opening(3, { techs: ["GATHERING"], enemyAt: at(2, 8) })),
      ).research,
    ).toMatchObject({ tech: "DRILL", growth: false });
  });

  it("buys Force Fields as a due technology with an enemy at its gates, and before a capture", () => {
    const pressed = opening(3, {
      techs: techsOf("GATHERING", "FARMING", "DRILL"),
      enemyAt: at(7, 8),
    });
    const fortification = chooseNormalCommandV7(
      viewOf(pressed),
    ).candidates.find(
      (candidate) =>
        candidate.command.kind === "RESEARCH" &&
        candidate.command.tech === "FORTIFICATION",
    );
    expect(fortification?.score.priority).toBe(1219);
    // A due technology before the capture that would raise its price.
    const village = at(8, 5);
    const start = field(
      MARTIAN,
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
    expect(
      offered.find((candidate) => candidate.command.kind === "CAPTURE")?.score
        .priority,
    ).toBe(1340);
    expect(
      offered.find(
        (candidate) =>
          candidate.command.kind === "RESEARCH" &&
          candidate.command.tech === "FORTIFICATION",
      )?.score.priority,
    ).toBe(ARMY_RESEARCH_BEFORE_CAPTURE_PRIORITY_V7);
    const kinds = kindsOf(policyTurn(start).commands);
    expect(kinds.indexOf("RESEARCH")).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf("RESEARCH")).toBeLessThan(kinds.indexOf("CAPTURE"));
  });

  // The reward ladder rework (`pulp_wars-zypi`): the level-2 reward is the
  // Stockpile or the Militia (Scouts, with the free Saucer, before), and
  // this seat, short of Grunts, takes the Militia's free Grunt.
  it("makes its opening harvest with the Coins of its growth technology and takes the free Grunt", () => {
    // Round 1: Gathering, 5 Coins, two Fruit in the capital's land, Fertile
    // Ground (so Farming, 7 Coins, is the target and 5 Coins are kept for
    // it). The seat kept the 5 Coins and harvested nothing; and with 1 Coin
    // left after two harvests it took Stockpile, not Scouts.
    const start = field(
      MARTIAN,
      [
        { seat: 0, role: "FIGHTER", at: at(9, 9) },
        { seat: 1, role: "FIGHTER", at: at(0, 0) },
      ],
      {
        techs: { 0: ["GATHERING"] },
        coins: 5,
        orphans: [at(9, 9)],
        fertile: [at(7, 7)],
        fruit: [at(9, 8), at(7, 8)],
      },
    );
    const capital = start.cities.find((city) => same(city.at, at(8, 8)));
    expect(capital?.level).toBe(1);
    const turn = policyTurn(start);
    expect(
      kindsOf(turn.commands).filter((kind) => kind === "HARVEST_FRUIT"),
    ).toHaveLength(2);
    expect(
      turn.commands.flatMap((command) =>
        command.kind === "CHOOSE_CITY_REWARD" ? [command.reward] : [],
      ),
    ).toEqual(["MILITIA"]);
    const grunts = (state: GameStateV7) =>
      state.units.filter(
        (unit) =>
          unit.ownerId === seatIdV7(start, 0) && unit.role === "FIGHTER",
      ).length;
    expect(grunts(turn.state)).toBe(grunts(start) + 1);
  });

  // The reward ladder rework (`pulp_wars-zypi`): it still gets three Grunts
  // and buys no technology: two trained and the Militia's free one, now the
  // village's level-2 reward (three trained and Scouts' free Saucer before).
  it("on the recorded opening (seed 9, round 8) gets three Grunts where it bought Force Fields and nothing else", () => {
    // Four cities, three Grunts, two Saucers, 14 Coins, the root owned.
    const start = recorded("ruleset-v7-martian-opening");
    const seat = start.players.find((player) => player.faction === "MARTIAN");
    expect(start.turnOrder[start.activeSeatIndex]).toBe(seat?.id);
    expect(
      start.cities.filter((city) => city.ownerId === seat?.id),
    ).toHaveLength(4);
    expect(
      start.units.filter(
        (unit) => unit.ownerId === seat?.id && unit.role === "FIGHTER",
      ),
    ).toHaveLength(3);
    const turn = policyTurn(start);
    expect(trainedIn(turn.commands)).toEqual(["FIGHTER", "FIGHTER"]);
    expect(kindsOf(turn.commands)).not.toContain("RESEARCH");
    // And the fruit of a village takes it to level 2: a free Grunt.
    expect(
      turn.commands.flatMap((command) =>
        command.kind === "CHOOSE_CITY_REWARD" ? [command.reward] : [],
      ),
    ).toEqual(["MILITIA"]);
    expect(
      turn.state.units.filter(
        (unit) => unit.ownerId === seat?.id && unit.role === "FIGHTER",
      ),
    ).toHaveLength(6);
  });
});

describe("step two of the Martian pass: the Martian Normal AI's research order", () => {
  /**
   * A Martian seat with three Grunts, the given technologies, and the
   * given extra pieces; the Human seat's units are `enemies` (far away by
   * default).
   */
  const seat = (
    techs: readonly TechnologyIdV7[],
    own: readonly GoblinPieceV7[] = [],
    enemies: readonly CoordV7[] = [at(0, 0)],
    change: (state: GameStateV7) => GameStateV7 = (state) => state,
  ): PlayerViewV7 =>
    viewOf(
      change(
        field(
          MARTIAN,
          [
            { seat: 0, role: "FIGHTER", at: at(9, 9) },
            { seat: 0, role: "FIGHTER", at: at(9, 8) },
            { seat: 0, role: "FIGHTER", at: at(9, 7) },
            ...own,
            ...enemies.map((where) => ({
              seat: 1,
              role: "FIGHTER" as const,
              at: where,
            })),
          ],
          {
            techs: { 0: techsOf(...techs) },
            coins: 0,
            orphans: [
              at(9, 9),
              at(9, 8),
              at(9, 7),
              ...own.map((piece) => piece.at),
            ],
          },
        ),
      ),
    );
  const RAYS: readonly TechnologyIdV7[] = [
    "GATHERING",
    "FARMING",
    "HUNTING",
    "DRILL",
    "FORTIFICATION",
    "MARKSMANSHIP",
  ];

  it("has the Brain third", () => {
    expect(ARMY_RESEARCH_ROLES_V7.MARTIAN).toEqual([
      "GUARD",
      "MARKSMAN",
      "CAPTAIN",
      "SWORDSMAN",
      "CATAPULT",
      "RAIDER",
      "KNIGHT",
    ]);
    expect(inspectNormalArmyV7(seat(RAYS)).research).toMatchObject({
      tech: "ADMINISTRATION",
      unlocks: "CAPTAIN",
    });
  });

  it("goes on to the Tripod, and to the Shock Trooper first when the enemy in sight fights hand to hand", () => {
    const brained: readonly TechnologyIdV7[] = [...RAYS, "ADMINISTRATION"];
    // No enemy in sight of the army: Forestry, toward the Tripod.
    expect(inspectNormalArmyV7(seat(brained)).research?.tech).toBe("FORESTRY");
    // Three Human Fighters in sight: Engineering, toward the Shock Trooper.
    const melee = [at(2, 2), at(3, 2), at(4, 2)];
    expect(inspectNormalArmyV7(seat(brained, [], melee)).research?.tech).toBe(
      "ENGINEERING",
    );
    // A chain that is begun is finished first, whoever is in sight.
    expect(
      inspectNormalArmyV7(seat([...brained, "ENGINEERING"])).research,
    ).toMatchObject({ tech: "METALLURGY", unlocks: "SWORDSMAN" });
    expect(
      inspectNormalArmyV7(seat([...brained, "FORESTRY"], [], melee)).research,
    ).toMatchObject({ tech: "SAWMILLING", unlocks: "CATAPULT" });
  });

  it("researches Heat Sinks right after its second Ray Gunner", () => {
    expect(ARMY_HEAT_SINKS_RAY_GUNNERS_V7).toBe(2);
    const gunners = (count: number): readonly GoblinPieceV7[] =>
      [at(10, 9), at(10, 8)]
        .slice(0, count)
        .map((where) => ({ seat: 0, role: "MARKSMAN" as const, at: where }));
    expect(inspectNormalArmyV7(seat(RAYS, gunners(2))).research?.tech).toBe(
      "FIELDCRAFT",
    );
    // One Ray Gunner: the Brain, as above. (It was researched before the
    // Mothership, the last unit of the order, which no seat reached.)
    expect(inspectNormalArmyV7(seat(RAYS, gunners(1))).research?.tech).toBe(
      "ADMINISTRATION",
    );
  });
});

describe("step two of the Martian pass: the Disintegrator against City Walls", () => {
  it("is researched once a garrison behind Walls is in sight and the Ray Gunners have Heat Sinks", () => {
    const techs: readonly TechnologyIdV7[] = [
      "GATHERING",
      "FARMING",
      "HUNTING",
      "DRILL",
      "FORTIFICATION",
      "MARKSMANSHIP",
      "FIELDCRAFT",
    ];
    const gunners: readonly GoblinPieceV7[] = [
      { seat: 0, role: "MARKSMAN", at: at(10, 9) },
      { seat: 0, role: "MARKSMAN", at: at(10, 8) },
    ];
    const research = (
      enemyAt: CoordV7,
      walls: boolean,
      own: readonly GoblinPieceV7[] = gunners,
    ) =>
      inspectNormalArmyV7(
        viewOf(
          (walls ? walledHumanCapital : (state: GameStateV7) => state)(
            field(
              MARTIAN,
              [
                { seat: 0, role: "FIGHTER", at: at(9, 9) },
                { seat: 0, role: "FIGHTER", at: at(9, 8) },
                { seat: 0, role: "FIGHTER", at: at(9, 7) },
                ...own,
                { seat: 1, role: "FIGHTER", at: enemyAt },
              ],
              { techs: { 0: techsOf(...techs) }, coins: 0 },
            ),
          ),
        ),
      ).research?.tech;
    // A Fighter on its walled capital: the Disintegrator.
    expect(research(HUMAN_CAPITAL, true)).toBe("EXPLOSIVES");
    // No Walls, a unit beside the walled center, or one Ray Gunner: the
    // Brain, by the order.
    expect(research(HUMAN_CAPITAL, false)).toBe("ADMINISTRATION");
    expect(research(at(3, 8), true)).toBe("ADMINISTRATION");
    expect(research(HUMAN_CAPITAL, true, gunners.slice(0, 1))).toBe(
      "ADMINISTRATION",
    );
  });
});

describe("step two of the Martian pass: a Shock Trooper for every two Grunts", () => {
  it("caps the Troopers at half the Grunts", () => {
    expect(ARMY_MARTIAN_HEAVY_CAP_COST_V7).toBeGreaterThan(0);
    expect(armyMartianHeavyCappedV7(0, 0)).toBe(true);
    expect(armyMartianHeavyCappedV7(0, 1)).toBe(false);
    expect(armyMartianHeavyCappedV7(1, 2)).toBe(true);
    expect(armyMartianHeavyCappedV7(1, 3)).toBe(false);
    expect(armyMartianHeavyCappedV7(2, 4)).toBe(true);
  });

  /**
   * A Martian seat that can train Grunts and Shock Troopers only (the root,
   * Engineering, Armoury), with `grunts` Grunts and `troopers` Troopers
   * beside its capital, a Human Fighter in sight, and 13 Coins (either
   * unit leaves the Coins it keeps for Force Fields).
   */
  const barracks = (grunts: number, troopers: number): GameStateV7 => {
    const tiles = [at(9, 9), at(9, 8), at(9, 7), at(8, 9), at(7, 9), at(10, 8)];
    return field(
      MARTIAN,
      [
        ...tiles.slice(0, grunts).map((where) => ({
          seat: 0,
          role: "FIGHTER" as const,
          at: where,
        })),
        ...tiles.slice(grunts, grunts + troopers).map((where) => ({
          seat: 0,
          role: "SWORDSMAN" as const,
          at: where,
        })),
        { seat: 1, role: "FIGHTER", at: at(4, 8) },
      ],
      {
        techs: {
          0: techsOf("GATHERING", "DRILL", "ENGINEERING", "METALLURGY"),
        },
        coins: 13,
        orphans: tiles,
      },
    );
  };

  /** The unit the capital would train (the one training the policy offers). */
  const chosen = (state: GameStateV7): readonly UnitRoleIdV7[] =>
    chooseNormalCommandV7(viewOf(state)).candidates.flatMap((candidate) =>
      candidate.score.priority >= 0 && candidate.command.kind === "TRAIN"
        ? [candidate.command.role]
        : [],
    );

  it("trains the Trooper while the Grunts allow one, and a Grunt when they do not", () => {
    // Both are on offer and affordable in every case.
    expect(chosen(barracks(2, 0))).toEqual(["SWORDSMAN"]);
    expect(chosen(barracks(2, 1))).toEqual(["FIGHTER"]);
    expect(chosen(barracks(4, 1))).toEqual(["SWORDSMAN"]);
    expect(chosen(barracks(4, 2))).toEqual(["FIGHTER"]);
  });
});

describe("step two of the Martian pass: a ray unit does not walk out in front of its line", () => {
  /**
   * A Tripod four tiles east of a Human Fighter with `hp` HP, on open
   * ground, and the given own pieces. Round 12: since the Tripod captures
   * (`pulp_wars-ke95`), the opening's villages first (ten rounds) keeps it
   * out of the Fighter's reach altogether.
   */
  const front = (
    hp: number,
    own: readonly GoblinPieceV7[] = [],
  ): GameStateV7 => ({
    ...field(
      MARTIAN,
      [
        { seat: 0, role: "CATAPULT", at: at(6, 3) },
        ...own,
        { seat: 1, role: "FIGHTER", at: at(2, 3), hp },
      ],
      { orphans: [at(6, 3), ...own.map((piece) => piece.at)] },
    ),
    round: 12,
  });
  const firingTiles = (state: GameStateV7): readonly CoordV7[] =>
    movesOf(state, at(6, 3)).filter((to) => gap(to, at(2, 3)) <= 2);

  it("knows that its ray after a Move is at half power", () => {
    // From where it stands a Tripod's ray deals a Fighter 12; after a Move
    // it deals 5.
    const state = field(MARTIAN, [
      { seat: 0, role: "CATAPULT", at: at(4, 3) },
      { seat: 1, role: "FIGHTER", at: at(2, 3) },
    ]);
    const tripod = unitAtV7(state, at(4, 3));
    const fighter = unitAtV7(state, at(2, 3));
    expect(
      queryCombatPreviewV7(viewOf(state), tripod.id, fighter.id),
    ).toMatchObject({ damageToDefender: 12, rayPower: "FULL" });
    const moved = applyOkV7(state, tripod.ownerId, {
      kind: "MOVE",
      unitId: tripod.id,
      path: [at(4, 4)],
    }).state;
    expect(
      queryCombatPreviewV7(viewOf(moved), tripod.id, fighter.id),
    ).toMatchObject({ damageToDefender: 5, rayPower: "HALF" });
  });

  it("makes no Move to a firing tile in a melee unit's reach with nothing in front of it", () => {
    // A full Fighter: the shot after the Move deals 5 of 12. The policy
    // read 12 (a kill) and walked up.
    expect(firingTiles(front(12))).toEqual([]);
    // A Fighter the half-power ray does kill: the Tripod goes.
    expect(firingTiles(front(5)).length).toBeGreaterThan(0);
  });

  it("walks up behind a body of its own line", () => {
    // A Shock Trooper beside the Fighter: the tiles two away are screened.
    const screened = front(12, [{ seat: 0, role: "SWORDSMAN", at: at(3, 3) }]);
    expect(firingTiles(screened).length).toBeGreaterThan(0);
  });

  it("on the recorded lab position (round 3) no Tripod moves and fires without a kill", () => {
    // Three Tripods walked two tiles ahead of the Grunts here and fired at
    // half power for 2, 4, and 5; four of the seat's five were dead after
    // the Human turn that followed.
    const start = recorded("ruleset-v7-martian-tripods");
    const seat = start.players.find((player) => player.faction === "MARTIAN");
    expect(start.turnOrder[start.activeSeatIndex]).toBe(seat?.id);
    const tripods = start.units.filter(
      (unit) => unit.ownerId === seat?.id && unit.role === "CATAPULT",
    );
    expect(tripods).toHaveLength(5);
    const actor = seat?.id;
    if (actor === undefined) throw new Error("no Martian seat");
    let state = start;
    const moved = new Set<number>();
    let shotsAfterMove = 0;
    for (let accepted = 0; accepted < 128; accepted += 1) {
      const view = viewForV7(state, actor);
      const command = chooseNormalTurnCommandV7(
        view,
        accepted,
        128,
        chooseNormalCommandV7(view),
      );
      if (command === null || command.kind === "END_TURN") break;
      if (
        command.kind === "MOVE" &&
        tripods.some((unit) => unit.id === command.unitId)
      )
        moved.add(command.unitId);
      if (command.kind === "ATTACK" && moved.has(command.unitId)) {
        shotsAfterMove += 1;
        expect(
          queryCombatPreviewV7(view, command.unitId, command.targetUnitId)
            ?.defenderDies,
        ).toBe(true);
      }
      state = applyOkV7(state, actor, command).state;
    }
    // (One Tripod walks up for a kill of a Champion with 3 HP.)
    expect(shotsAfterMove).toBeLessThanOrEqual(1);
  });
});

describe("step two of the Martian pass: the text harness", () => {
  it("says what a Shock Trooper's Shock Field does on its own line", () => {
    expect(shockFieldTextV7(3)).toBe(
      "Shock Field: while it has Shield, a unit that attacks it from the next tile takes 3",
    );
  });
});
