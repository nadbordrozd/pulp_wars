import { describe, expect, it } from "vitest";
import {
  ASSEMBLE_COST_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  applyCommandV7,
  effectiveRoleRuleV7,
  previewAssembleV7,
  publicUnitStatsV7,
  queryPlayerCommandsV7,
  recomputeLiveEconomyV7,
  viewForV7,
  type CommandV7,
  type GameStateV7,
  type PopulationContributionV7,
} from "../../src/engine/index";
import {
  OBSOLETE_SAVE_STORAGE_KEYS_V7,
  SAVE_STORAGE_KEY_V7,
} from "../../src/persistence/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7 } from "../fixtures/v7-dinosaur-arena";
import { dwarfFieldV7, offeredOfV7, refusalV7 } from "../fixtures/v7-dwarf";
import { sameV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import { playV7 } from "../fixtures/v7-martian";
import { activeIdV7, at, attackV7 } from "../fixtures/v7-revision20";

// Dwarf oomph (`pulp_wars-o2g8`, `pulp-wars-poc-7r122`; the user,
// 2026-11-05: "building a new unit seems like it would be great but in
// practice I can just build the same unit cheaper in the city ... the
// gyrocopter is fun even though it's very weak"). An Assemble costs 2 Coins
// (1 with a producing Forge in the Engineer's home city), below training a
// Gunner (3); the assembled Gunner may fire one shot on the turn it is
// assembled and cannot move; a trained Gunner is still exhausted; the
// Gyrocopter has 10 HP. Hand-built states on the Dwarf field (seat 0
// capital (8, 8), territory x 7-9, y 7-9; villages (5, 5), (8, 5), (5, 8)).

describe("the identity", () => {
  // The Ice Folk freeze rework (`pulp_wars-s55m.1`) took 7r123 after it.
  it("was 7r122 after 7r121, both save keys obsolete now", () => {
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r130");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r130.current");
    const at = PRIOR_RULESET_7_IDS.indexOf("pulp-wars-poc-7r122");
    expect(at).toBeGreaterThan(0);
    expect(PRIOR_RULESET_7_IDS[at - 1]).toBe("pulp-wars-poc-7r121");
    expect(PRIOR_RULESET_7_IDS).not.toContain(RULESET_7_ID);
    const key = OBSOLETE_SAVE_STORAGE_KEYS_V7.indexOf(
      "pulpWars.save.v7r122.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7[key - 1]).toBe(
      "pulpWars.save.v7r121.current",
    );
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7).not.toContain(SAVE_STORAGE_KEY_V7);
  });
});

const ENGINEER_AT = at(5, 2);
const GUNNER_AT = at(6, 3);

/** An Engineer at (5, 2), an enemy Fighter at (6, 5) and one at (1, 1). */
function field(options: Parameters<typeof dwarfFieldV7>[1] = {}): GameStateV7 {
  return dwarfFieldV7(
    [
      { seat: 0, role: "CAPTAIN", at: ENGINEER_AT },
      { seat: 1, role: "FIGHTER", at: at(6, 5) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ],
    options,
  );
}

const coinsOf = (state: GameStateV7): number =>
  state.players.find((player) => player.id === activeIdV7(state))?.coins ?? 0;

const withCoins = (state: GameStateV7, coins: number): GameStateV7 =>
  checkedV7({
    ...state,
    players: state.players.map((player) =>
      player.id === activeIdV7(state) ? { ...player, coins } : player,
    ),
  });

function assemble(state: GameStateV7): CommandV7 {
  return {
    kind: "ASSEMBLE",
    unitId: unitAtV7(state, ENGINEER_AT).id,
    to: GUNNER_AT,
  };
}

/** A level-2 seat-0 capital with a Mine and a Forge with positive output. */
function withActiveForge(base: GameStateV7): GameStateV7 {
  const city = cityOfV7(base, 0);
  const forgeAt = { x: 9, y: 7 };
  const mineAt = { x: 9, y: 8 };
  const contributions: PopulationContributionV7[] = [
    {
      id: base.nextEntityId,
      cityId: city.id,
      category: "LIVE",
      amount: 1,
      source: { kind: "IMPROVEMENT", improvement: "MINE", at: mineAt },
    },
    {
      id: base.nextEntityId + 1,
      cityId: city.id,
      category: "LIVE",
      amount: 1,
      source: { kind: "IMPROVEMENT", improvement: "FORGE", at: forgeAt },
    },
  ];
  const candidate: GameStateV7 = {
    ...base,
    nextEntityId: base.nextEntityId + contributions.length,
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        sameV7(tile.at, forgeAt) || sameV7(tile.at, mineAt)
          ? {
              ...tile,
              biome: "HIGHLANDS" as const,
              terrain: "MOUNTAIN" as const,
              resource: sameV7(tile.at, mineAt) ? ("ORE" as const) : null,
              improvement: sameV7(tile.at, mineAt)
                ? ("MINE" as const)
                : ("FORGE" as const),
              road: false,
            }
          : tile,
      ),
    },
    populationContributions: contributions,
  };
  const economy = recomputeLiveEconomyV7(
    base,
    candidate,
    candidate.populationContributions,
  );
  return checkedV7({
    ...candidate,
    cities: economy.cities.map((item) =>
      item.id === city.id
        ? {
            ...item,
            level: 2,
            population: item.permanentPopulation + item.economicPopulation - 2,
            rewards: [{ reachedLevel: 2, reward: "STOCKPILE" as const }],
          }
        : item,
    ),
    populationContributions: economy.populationContributions,
  });
}

describe("the Assemble cost", () => {
  it("is 2 Coins, below training a Gunner (3), at the exact Coin boundary", () => {
    expect(ASSEMBLE_COST_V7).toBe(2);
    expect(effectiveRoleRuleV7("MARKSMAN", "DWARF").cost).toBe(3);
    const state = field();
    const engineer = unitAtV7(state, ENGINEER_AT);
    expect(
      previewAssembleV7(viewForV7(state, activeIdV7(state)), engineer.id),
    ).toMatchObject({ cost: 2 });
    const result = playV7(state, assemble(state));
    expect(result.events[0]).toMatchObject({ kind: "UNIT_ASSEMBLED", cost: 2 });
    expect(coinsOf(state) - coinsOf(result.state)).toBe(2);
    const exact = withCoins(state, 2);
    expect(
      queryPlayerCommandsV7(viewForV7(exact, activeIdV7(exact))),
    ).toContainEqual(assemble(exact));
    const short = withCoins(state, 1);
    expect(refusalV7(short, assemble(short))).toEqual({
      code: "INSUFFICIENT_COINS",
      params: { cost: 2 },
    });
  });

  it("is 1 Coin with a producing Forge in the Engineer's home city", () => {
    const state = withActiveForge(field());
    const engineer = unitAtV7(state, ENGINEER_AT);
    expect(
      previewAssembleV7(viewForV7(state, activeIdV7(state)), engineer.id),
    ).toMatchObject({ cost: 1 });
    const poor = withCoins(state, 1);
    const result = playV7(poor, assemble(poor));
    expect(result.events[0]).toMatchObject({ kind: "UNIT_ASSEMBLED", cost: 1 });
    expect(coinsOf(result.state)).toBe(0);
  });
});

describe("the assembled Gunner's first-turn shot", () => {
  it("fires one shot on the turn it is assembled, cannot move, and has no second shot", () => {
    const assembled = playV7(field(), assemble(field())).state;
    const gunner = unitAtV7(assembled, GUNNER_AT);
    expect(gunner.activation).toMatchObject({
      moved: true,
      attacked: false,
      attacksUsed: 0,
      handled: false,
    });
    // Its allowance is a moved Gunner's 1, not the unmoved 2.
    expect(publicUnitStatsV7(assembled, gunner).dwarf?.shotsLeft).toBe(1);
    expect(offeredOfV7(assembled, GUNNER_AT, "MOVE")).toEqual([]);
    expect(
      refusalV7(assembled, {
        kind: "MOVE",
        unitId: gunner.id,
        path: [at(6, 4)],
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
    // The shot is offered and previewed (`attackV7` checks both).
    const shot = attackV7(assembled, GUNNER_AT, at(6, 5));
    expect(shot.combat.damageToDefender).toBeGreaterThan(0);
    expect(shot.combat.attacksRemaining).toBe(0);
    expect(shot.target).toBeDefined();
    expect(offeredOfV7(shot.state, GUNNER_AT, "ATTACK")).toEqual([]);
    expect(
      refusalV7(shot.state, {
        kind: "ATTACK",
        unitId: gunner.id,
        targetUnitId: unitAtV7(shot.state, at(6, 5)).id,
      }).code,
    ).toBe("UNIT_ALREADY_ACTED");
    expect(
      publicUnitStatsV7(shot.state, unitAtV7(shot.state, GUNNER_AT)).dwarf
        ?.shotsLeft,
    ).toBe(0);
  });

  it("leaves a trained Gunner exhausted on arrival", () => {
    const state = dwarfFieldV7([
      { seat: 1, role: "FIGHTER", at: at(8, 6) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    const city = cityOfV7(state, 0);
    const trained = playV7(state, {
      kind: "TRAIN",
      cityId: city.id,
      role: "MARKSMAN",
    }).state;
    const gunner = unitAtV7(trained, city.at);
    expect(gunner.role).toBe("MARKSMAN");
    expect(gunner.activation).toMatchObject({ attacked: true, handled: true });
    expect(offeredOfV7(trained, city.at, "ATTACK")).toEqual([]);
    const refused = applyCommandV7(trained, activeIdV7(trained), {
      kind: "ATTACK",
      unitId: gunner.id,
      targetUnitId: unitAtV7(trained, at(8, 6)).id,
    });
    expect(refused.accepted).toBe(false);
    if (!refused.accepted)
      expect(refused.error.code).toBe("UNIT_ALREADY_ACTED");
  });
});

describe("the Gyrocopter", () => {
  it("has 10 HP; its cost, Attack, Defense, Move, and Sight are unchanged", () => {
    expect(effectiveRoleRuleV7("RAIDER", "DWARF")).toMatchObject({
      label: "Gyrocopter",
      maxHp: 10,
      cost: 4,
      attack2: 3,
      defense2: 2,
      move: 3,
      sightRadius: 2,
    });
    const state = dwarfFieldV7([
      { seat: 0, role: "RAIDER", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(1, 1) },
    ]);
    expect(unitAtV7(state, at(5, 2))).toMatchObject({ hp: 10, maxHp: 10 });
  });
});
