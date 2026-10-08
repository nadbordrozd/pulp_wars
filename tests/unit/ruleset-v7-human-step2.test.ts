import { describe, expect, it } from "vitest";
import {
  ARMY_GARRISON_YIELD_BODIES_V7,
  armyGarrisonYieldsToRangedV7,
  type ArmyCountsV7,
} from "../../src/ai/v7-army";
import {
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  applyOkV7,
  seatIdV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { at, fieldV7, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * Step two of the Human pass (`pulp_wars-w49.22`, identity unchanged at
 * `pulp-wars-poc-7r56`; docs/product/RULESET_7_TUNING_HUMAN.md section 17).
 * No rule and no number changed. Two things in the Normal AI of a Human
 * seat, both about what a city trains:
 *
 * 1. the garrison rule of a threatened city (tuning 8: onto its empty
 *    center the seat trains a garrison at least as good as the unit that
 *    stepped aside) yields to a ranged unit while the army is short of
 *    one, so a seat with Marksmanship fields Marksmen in a war;
 * 2. a city chooses among the units the Coins kept for the due technology
 *    allow, so it trains the Fighter that fits where its shares wanted a
 *    Marksman that does not.
 *
 * Two-seat field (tests/fixtures/v7-revision20.ts): seat 0 capital (8, 8),
 * seat 1 capital (2, 8). Every tile is explored by both seats.
 */

const techs = (...ids: readonly TechnologyIdV7[]): readonly TechnologyIdV7[] =>
  TECHNOLOGY_IDS_V7.filter((tech) => ids.includes(tech));

/** Gathering, Hunting, Forestry, and Marksmanship: Fighters and Marksmen. */
const MARKSMEN = techs("GATHERING", "HUNTING", "FORESTRY", "MARKSMANSHIP");

/** The field without its villages; seat 0's units fill no unit slot. */
function position(
  pieces: readonly GoblinPieceV7[],
  options: {
    readonly coins: number;
    readonly round?: number;
    readonly factions?: readonly ["ORIGINAL" | "GOBLIN", "ORIGINAL" | "GOBLIN"];
    readonly techs?: readonly TechnologyIdV7[];
    readonly levelTwo?: boolean;
  },
): GameStateV7 {
  let state = fieldV7(pieces, {
    factions: options.factions ?? ["ORIGINAL", "GOBLIN"],
    techs: { 0: options.techs ?? MARKSMEN },
    coins: 20,
  });
  for (const tile of state.board.tiles)
    if (tile.site === "VILLAGE")
      state = patchTileV7(state, tile.at, { site: null });
  const own = seatIdV7(state, 0);
  if (options.levelTwo === true) {
    // Two harvests take the capital to level 2 (3 Coins a turn).
    const capital = state.cities.find((city) => city.ownerId === own);
    if (capital === undefined) throw new Error("no capital");
    const tiles = state.board.tiles
      .filter(
        (tile) =>
          tile.territoryCityId === capital.id &&
          tile.terrain === "GRASS" &&
          tile.site === null &&
          !state.units.some(
            (unit) => unit.at.x === tile.at.x && unit.at.y === tile.at.y,
          ),
      )
      .slice(0, 2);
    if (tiles.length < 2) throw new Error("no room for two harvests");
    for (const tile of tiles) {
      state = patchTileV7(state, tile.at, { resource: "FRUIT" });
      state = applyOkV7(state, own, {
        kind: "HARVEST_FRUIT",
        at: tile.at,
      }).state;
    }
    for (const choice of state.pendingChoices)
      if (choice.kind === "CITY_REWARD")
        state = applyOkV7(state, own, {
          kind: "CHOOSE_CITY_REWARD",
          cityId: choice.cityId,
          reachedLevel: choice.reachedLevel,
          reward: "STOCKPILE",
        }).state;
  }
  return checkedV7({
    ...state,
    round: options.round ?? 1,
    players: state.players.map((player) =>
      player.seat === 0 ? { ...player, coins: options.coins } : player,
    ),
    units: state.units.map((unit) =>
      unit.ownerId === own ? { ...unit, homeCityId: null } : unit,
    ),
  });
}

/** Seat 0 plays its turn with the Normal policy. */
function policyTurn(start: GameStateV7): {
  readonly commands: readonly CommandV7[];
  readonly state: GameStateV7;
} {
  const actor = seatIdV7(start, 0);
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
    commands.push(command);
    if (command.kind === "END_TURN") return { commands, state };
    state = applyOkV7(state, actor, command).state;
    if (state.outcome !== null) return { commands, state };
  }
  throw new Error("the turn did not end");
}

const trainedOf = (commands: readonly CommandV7[]): readonly string[] =>
  commands.flatMap((command) =>
    command.kind === "TRAIN" ? [command.role] : [],
  );

const coinsOf = (state: GameStateV7): number =>
  state.players.find((player) => player.seat === 0)?.coins ?? 0;

/** Three Fighters of seat 0 beside its capital, the center empty. */
const BODIES: readonly GoblinPieceV7[] = [
  { seat: 0, role: "FIGHTER", at: at(9, 8) },
  { seat: 0, role: "FIGHTER", at: at(9, 7) },
  { seat: 0, role: "FIGHTER", at: at(9, 9) },
];
const ENEMY_GARRISON: GoblinPieceV7 = {
  seat: 1,
  role: "FIGHTER",
  at: at(2, 8),
};

describe("step two of the Human pass: identity", () => {
  it("is still 7r56: no rule, number, command, state, or event shape changed", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r56");
  });
});

describe("1. the garrison rule yields to a ranged unit", () => {
  const counts = (
    line: number,
    defender: number,
    ranged: number,
  ): ArmyCountsV7 => ({
    total: line + defender + ranged,
    byClass: {
      LINE: line,
      DEFENDER: defender,
      RANGED: ranged,
      SIEGE: 0,
      BREAKTHROUGH: 0,
      SKIRMISHER: 0,
      SUPPORT: 0,
    },
    hostileFragile: 0,
  });

  it("while a Human army with three bodies is below its share of ranged units and the city can pay for one", () => {
    expect(ARMY_GARRISON_YIELD_BODIES_V7).toBe(3);
    expect(
      armyGarrisonYieldsToRangedV7("ORIGINAL", counts(5, 0, 0), true),
    ).toBe(true);
    // A fifth of the army: one Marksman of six units is still short, two of
    // eight are the share (20 x 9 against 100 x 2).
    expect(
      armyGarrisonYieldsToRangedV7("ORIGINAL", counts(5, 0, 1), true),
    ).toBe(true);
    expect(
      armyGarrisonYieldsToRangedV7("ORIGINAL", counts(5, 2, 2), true),
    ).toBe(false);
    // Not with fewer than three bodies, not when no ranged unit is on
    // offer, and not for another faction's seat.
    expect(
      armyGarrisonYieldsToRangedV7("ORIGINAL", counts(2, 0, 0), true),
    ).toBe(false);
    expect(
      armyGarrisonYieldsToRangedV7("ORIGINAL", counts(5, 0, 0), false),
    ).toBe(false);
    // (Step two of the Goblin pass, `pulp_wars-w49.23`: a Goblin seat's
    // yields too; `tests/unit/ruleset-v7-goblin-step2.test.ts`.)
    for (const faction of ["UNDEAD", "MARTIAN", "DINOSAUR"] as const)
      expect(armyGarrisonYieldsToRangedV7(faction, counts(5, 0, 0), true)).toBe(
        false,
      );
  });

  it("a threatened capital whose garrison stepped aside trains a Marksman, not a fourth Fighter", () => {
    // A Wolf Rider three tiles from the center: the city is threatened and
    // no enemy stands at its gates.
    const start = position(
      [...BODIES, ENEMY_GARRISON, { seat: 1, role: "RAIDER", at: at(5, 8) }],
      { coins: 4 },
    );
    expect(trainedOf(policyTurn(start).commands)).toEqual(["MARKSMAN"]);
  });

  it("with the enemy at the gates it trains the body", () => {
    const start = position(
      [...BODIES, ENEMY_GARRISON, { seat: 1, role: "RAIDER", at: at(6, 8) }],
      { coins: 4 },
    );
    expect(trainedOf(policyTurn(start).commands)).toEqual(["FIGHTER"]);
  });

  it("with its share of Marksmen it trains the garrison again", () => {
    const start = position(
      [
        ...BODIES,
        { seat: 0, role: "MARKSMAN", at: at(10, 8) },
        ENEMY_GARRISON,
        { seat: 1, role: "RAIDER", at: at(5, 8) },
      ],
      { coins: 4 },
    );
    expect(trainedOf(policyTurn(start).commands)).toEqual(["FIGHTER"]);
  });
});

describe("2. a city chooses among the units the kept Coins allow", () => {
  it("trains the Fighter that fits when the Coins kept for its due technology do not allow the Marksman", () => {
    // Round 30 with four technologies and the root: the research clock
    // says Fortification (7 Coins) is due. The seat has 6, earns 3 a turn
    // (a level-2 capital), and keeps 4: that pays for a Fighter and not
    // for a Marksman.
    const start = position(
      [...BODIES, ENEMY_GARRISON, { seat: 1, role: "RAIDER", at: at(5, 8) }],
      {
        coins: 6,
        round: 30,
        techs: techs(...MARKSMEN, "DRILL"),
        levelTwo: true,
      },
    );
    const turn = policyTurn(start);
    // (Before this pass the shares chose the Marksman, the kept Coins
    // refused it, and the city trained nothing.)
    expect(trainedOf(turn.commands)).toEqual(["FIGHTER"]);
    expect(coinsOf(turn.state)).toBe(4);
  });
});
