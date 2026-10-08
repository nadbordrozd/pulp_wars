import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  scoreCommandV7,
  type NormalAiDecisionV7,
} from "../../src/ai/v7";
import {
  BITE_VALUE_V7,
  PLAGUE_SPREAD_VALUE_V7,
  TEND_PLAGUE_CURE_VALUE_V7,
} from "../../src/ai/v7-undead";
import {
  RULESET_7_ID,
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  unitId,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
  PLAGUE_DURATION_TURNS_V7,
} from "../../src/engine/index";
import { runAiMatchV7 } from "../../src/headless/v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { createRevision13MapStateV7 } from "../fixtures/v7-revision13-map";

// Seed-2 DRY_LAND two-seat revision-13 board (11 x 11): seat 0 capital (8, 8),
// seat 1 capital (2, 8); rows 0-4 west of x 6 are open neutral land. Every
// scenario is seat 0 to move with every technology and a full treasury.

const READY: UnitStateV7["activation"] = {
  moved: false,
  movedPathLength: 0,
  attacked: false,
  attacksUsed: 0,
  tendedThisTurn: false,
  inspired: false,
  overrunActive: false,
  escapeAvailable: false,
  recovered: false,
  captured: false,
  handled: false,
  specialActed: false,
};

describe("ruleset-7 revision-14 Normal AI: Undead use Plague and Bitten", () => {
  it("aims Plague where it can spread to more living units", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 1 } },
        // Clump: primary (3, 1), splash (4, 1), healthy spread target (5, 1).
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 4, y: 1 } },
        { seat: 1, role: "FIGHTER", at: { x: 5, y: 1 } },
        // Pair: primary (0, 4), splash (1, 5), nothing further.
        { seat: 1, role: "FIGHTER", at: { x: 0, y: 4 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 5 } },
      ],
    );
    const lich = unitAt(state, { x: 0, y: 1 });
    const clump = unitAt(state, { x: 3, y: 1 });
    const pair = unitAt(state, { x: 0, y: 4 });
    const view = viewFor(state);
    expect(queryCombatPreviewV7(view, lich.id, clump.id)?.plagued).toEqual([
      clump.id,
      unitAt(state, { x: 4, y: 1 }).id,
    ]);
    const toClump = scoreCommandV7(view, attackCommand(lich, clump));
    const toPair = scoreCommandV7(view, attackCommand(lich, pair));
    expect(toClump.strategicValue - toPair.strategicValue).toBe(
      PLAGUE_SPREAD_VALUE_V7,
    );
    const lichAttacks = chooseNormalCommandV7(view).candidates.filter(
      ({ command }) => command.kind === "ATTACK" && command.unitId === lich.id,
    );
    expect(lichAttacks[0]?.command).toEqual(attackCommand(lich, clump));
  });

  it("ranks a volley that plagues three hostile units above a plain kill", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 0, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 4, y: 1 } },
        { seat: 1, role: "GUARD", at: { x: 4, y: 2 } },
      ],
    );
    const lich = unitAt(state, { x: 0, y: 1 });
    const target = unitAt(state, { x: 3, y: 1 });
    const view = viewFor(state);
    expect(
      queryCombatPreviewV7(view, lich.id, target.id)?.plagued,
    ).toHaveLength(3);
    expect(scoreCommandV7(view, attackCommand(lich, target)).priority).toBe(
      1182,
    );
  });

  it("values a new bite over biting an already bitten unit", () => {
    const state = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 2, y: 3 } },
      ],
      { bitten: [{ at: { x: 2, y: 3 }, biter: { x: 2, y: 2 } }] },
    );
    const zombie = unitAt(state, { x: 2, y: 2 });
    const fresh = unitAt(state, { x: 3, y: 2 });
    const bitten = unitAt(state, { x: 2, y: 3 });
    const view = viewFor(state);
    expect(
      queryCombatPreviewV7(view, zombie.id, fresh.id)?.defenderBitten,
    ).toBe(true);
    const guardValue =
      (effectiveRoleRuleV7("GUARD", "ORIGINAL").cost ?? 0) * 4 + fresh.hp;
    expect(
      scoreCommandV7(view, attackCommand(zombie, fresh)).strategicValue -
        scoreCommandV7(view, attackCommand(zombie, bitten)).strategicValue,
      // The Undead pass (`pulp_wars-w49.13`): and 4 a Coin of the Guard's
      // price (3) for the new bite (`ARMY_ZOMBIE_BITE_VALUE_V7`).
    ).toBe(BITE_VALUE_V7 + Math.floor(guardValue / 5) + 4 * 3);
  });

  it("does not raise Skeletons that visible enemies kill next turn", () => {
    const grave = { x: 3, y: 2 };
    const exposed = arena(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 1, role: "KNIGHT", at: { x: 4, y: 2 } },
      ],
      { graves: [grave] },
    );
    const necromancer = unitAt(exposed, { x: 2, y: 2 });
    const raise: CommandV7 = { kind: "RAISE_DEAD", unitId: necromancer.id };
    const exposedView = viewFor(exposed);
    expect(queryPlayerCommandsV7(exposedView)).toContainEqual(raise);
    expect(scoreCommandV7(exposedView, raise).priority).toBe(-1);

    const safe = arena(
      ["UNDEAD", "ORIGINAL"],
      [{ seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } }],
      { graves: [grave] },
    );
    expect(scoreCommandV7(viewFor(safe), raise).priority).toBe(1237);
  });
});

describe("ruleset-7 revision-14 Normal AI: living seats counter", () => {
  it("kills the Lich that plagues its units first", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 1, y: 1 } },
        { seat: 0, role: "GUARD", at: { x: 2, y: 3 } },
        { seat: 0, role: "GUARD", at: { x: 3, y: 2 } },
        { seat: 1, role: "CATAPULT", at: { x: 4, y: 1 }, hp: 3 },
        { seat: 1, role: "GUARD", at: { x: 1, y: 4 }, hp: 3 },
      ],
      {
        plagued: [
          { at: { x: 2, y: 3 }, source: { x: 4, y: 1 } },
          { at: { x: 3, y: 2 }, source: { x: 4, y: 1 } },
        ],
      },
    );
    const catapult = unitAt(state, { x: 1, y: 1 });
    const lich = unitAt(state, { x: 4, y: 1 });
    const view = viewFor(state);
    expect(view.plagued.map((entry) => entry.sourceUnitId)).toEqual([
      lich.id,
      lich.id,
    ]);
    const decision = decide(state);
    expect(decision.command).toEqual(attackCommand(catapult, lich));
    expect(decision.candidates[0]?.score.priority).toBe(1285);
  });

  it("tends a plagued unit at full HP to cure it", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 0, role: "GUARD", at: { x: 3, y: 2 } },
        { seat: 1, role: "CATAPULT", at: { x: 0, y: 8 } },
      ],
      { plagued: [{ at: { x: 3, y: 2 }, source: { x: 0, y: 8 } }] },
    );
    const captain = unitAt(state, { x: 2, y: 2 });
    const decision = decide(state);
    expect(decision.command).toEqual({
      kind: "TEND_WOUNDED",
      unitId: captain.id,
    });
    expect(decision.candidates[0]?.score.priority).toBe(1262);
    expect(decision.candidates[0]?.score.immediateValue).toBe(
      TEND_PLAGUE_CURE_VALUE_V7,
    );
  });

  it("separates healthy units from a plagued unit", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "GUARD", at: { x: 2, y: 2 } },
        { seat: 0, role: "FIGHTER", at: { x: 3, y: 2 } },
        { seat: 1, role: "CATAPULT", at: { x: 0, y: 8 } },
      ],
      { plagued: [{ at: { x: 2, y: 2 }, source: { x: 0, y: 8 } }] },
    );
    const decision = decide(state);
    expect(decision.command?.kind).toBe("MOVE");
    expect(decision.candidates[0]?.score.priority).toBe(1150);
    const moved = apply(state, required(decision.command ?? undefined));
    const plagued = unitAt(moved, unitAtPosition(state, { x: 2, y: 2 }));
    const healthy = unitAt(moved, unitAtPosition(state, { x: 3, y: 2 }));
    expect(chebyshev(plagued.at, healthy.at)).toBeGreaterThan(1);

    // A routine move never ends next to the plagued unit.
    const fighter = unitAt(state, { x: 3, y: 2 });
    const view = viewFor(state);
    for (const command of queryPlayerCommandsV7(view)) {
      if (command.kind !== "MOVE" || command.unitId !== fighter.id) continue;
      const to = required(command.path.at(-1));
      if (chebyshev(to, { x: 2, y: 2 }) === 1)
        expect(scoreCommandV7(view, command).priority).toBeLessThan(1100);
    }
  });

  it("avoids chipping a Zombie with a valuable melee unit, but shoots it", () => {
    const state = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 2, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 2 } },
      ],
    );
    const fighter = unitAt(state, { x: 2, y: 2 });
    const zombie = unitAt(state, { x: 3, y: 2 });
    const view = viewFor(state);
    const preview = required(queryCombatPreviewV7(view, fighter.id, zombie.id));
    expect(preview.defenderDies).toBe(false);
    expect(preview.attackerBitten).toBe(true);
    expect(
      decide(state).candidates.some(
        ({ command }) =>
          command.kind === "ATTACK" && command.unitId === fighter.id,
      ),
    ).toBe(false);

    const ranged = arena(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 1, y: 2 } },
        { seat: 0, role: "GUARD", at: { x: 2, y: 2 } },
        { seat: 1, role: "GUARD", at: { x: 3, y: 2 } },
      ],
    );
    const marksman = unitAt(ranged, { x: 1, y: 2 });
    const rangedPreview = required(
      queryCombatPreviewV7(
        viewFor(ranged),
        marksman.id,
        unitAt(ranged, { x: 3, y: 2 }).id,
      ),
    );
    expect(rangedPreview.attackerBitten).toBe(false);
    expect(
      decide(ranged).candidates.some(
        ({ command }) =>
          command.kind === "ATTACK" && command.unitId === marksman.id,
      ),
    ).toBe(true);
  });
});

describe("ruleset-7 Normal AI: Land Grant neutral count", () => {
  it("does not count rival territory whose city center is unexplored", () => {
    const base = arena(["ORIGINAL", "UNDEAD"], []);
    const own = required(
      base.cities.find((city) => city.ownerId === base.humanPlayerId),
    );
    const rival = required(
      base.cities.find((city) => city.ownerId !== base.humanPlayerId),
    );
    const grant: CommandV7 = { kind: "LAND_GRANT", cityId: own.id };
    const neutralNear = base.board.tiles.filter(
      (tile) =>
        tile.territoryCityId === null && chebyshev(tile.at, own.at) <= 2,
    );
    expect(neutralNear.length).toBeGreaterThan(2);
    const claimed = neutralNear.slice(0, 2).map((tile) => tile.at);
    // Two neutral tiles near our city now belong to the rival city, whose
    // center (and its own footprint) we have never explored.
    const hidden = base.board.tiles
      .filter((tile) => chebyshev(tile.at, rival.at) <= 1)
      .map((tile) => tile.at);
    const state = checkedV7({
      ...base,
      players: base.players.map((player) =>
        player.id === base.humanPlayerId
          ? {
              ...player,
              explored: player.explored.filter(
                (at) => !hidden.some((item) => same(item, at)),
              ),
            }
          : player,
      ),
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          claimed.some((at) => same(at, tile.at))
            ? { ...tile, territoryCityId: rival.id }
            : tile,
        ),
      },
    });
    const view = viewFor(state);
    const rivalTiles = view.board.tiles.filter(
      (tile) =>
        tile.explored &&
        claimed.some((at) => same(at, tile.at)) &&
        tile.territoryCityId === null &&
        tile.territoryOwnerId === rival.ownerId,
    );
    expect(rivalTiles).toHaveLength(2);
    expect(scoreCommandV7(view, grant).strategicValue).toBe(
      scoreCommandV7(viewFor(base), grant).strategicValue - 2 * 3,
    );
  });
});

describe("ruleset-7 revision-14 Normal AI: headless play", () => {
  it("trains a Lich and plagues in a deterministic mixed match", () => {
    // pulp_wars-1mc: the seed-3 Continents match used before now enters the
    // Human seat's endgame siege at round 9 (three cities against one) and
    // the Undead seat never reaches a Lich; seed 5 Pangea still did until the
    // revision-16 economy numbers, and seed 4 Pangea did with them. Under the
    // revision-18 movement rules seed 4 no longer reaches a Lich within 40
    // rounds; seed 8 Pangea did. With the revision-21 achievements
    // (`pulp_wars-9s0.4`) a match changes once a seat unlocks one (seed 8:
    // Conqueror and Land Baron in round 16) and seed 8 ends in round 23
    // with no Lich; seed 4 Pangea trained one and plagued again. With the
    // campaign plan (`pulp_wars-9s0.1`) seed 4 ends in round 18 before any
    // Lich; seed 16 Pangea trained one and plagued (4 of seeds 0-23 trained a
    // Lich within 40 rounds, as before). With the revision-20 section 6.3
    // Human HP (`pulp_wars-0hi.3`) every match with a Human seat changes:
    // seed 16 reaches the 40-round cap without a Lich; seed 8 Pangea trains
    // one and plagues (3 of seeds 0-23 train a Lich within 40 rounds: 8,
    // 12, and 15). The Pangea coast ring (`pulp_wars-9s0.2`) regenerates
    // every Pangea board: seed 8 now ends in round 24 with no Lich; seed 3
    // Pangea trains two and plagues (3 of seeds 0-23 train a Lich within 40
    // rounds: 3, 7, and 11; 3 and 7 also plague). The village density
    // (`pulp_wars-ykw.2`) regenerates every board again: of seeds 0-23 only
    // seed 21 Pangea trains a Lich and plagues within 40 rounds.
    // With 3 starting Coins (`pulp_wars-if6`) every opening changes: of
    // seeds 0-23 only seed 3 Pangea trains a Lich (two) and plagues within
    // 40 rounds. Many seats (`pulp_wars-ykw.3`) regenerates every board
    // again: seeds 1, 7, 9, and 13 Pangea train a Lich and plague within 40
    // rounds (seed 1: two Liches, seven Plague applications). With tuning 1
    // (`pulp_wars-w49.3`, 7r46) seed 1 trains none; seeds 4, 5, 7, and 9
    // Pangea do and plague (seed 5: three Liches, 13 Plague applications).
    // With tuning 4 (`pulp_wars-w49.3`: research is priced by the
    // technologies owned, so the Normal AI reaches Sawmilling later) only
    // seeds 2, 12, and 13 of 0-15 train a Lich within 40 rounds, and only
    // seed 2 plagues (one Lich, one Plague application, over in round 26).
    // With tuning 6 (`pulp_wars-w49.6`: each faction's own research order,
    // the Undead by Drill, Marksmanship, and Administration to Sawmilling;
    // research at 1 Coin a technology owned) seed 2 trains three Liches
    // and plagues, over in round 30.
    // With tuning 7 (`pulp_wars-w49.10`: the assault on a local position,
    // growth research at the unit limit, wartime spending) seed 2 is over
    // in round 18 without a Lich; seeds 10, 11, 13, and 14 of 0-15 train
    // one and plague (seed 14: four Liches, over in round 22).
    // With tuning 8 (`pulp_wars-w49.11`: research on a clock while at war,
    // the capture of a reached center) seed 14 is over in round 24 without
    // a Lich; seeds 0, 2, 10, and 13 of 0-15 train one and plague (seed 0:
    // six Liches, ten Plague applications, 40 rounds). With its correction
    // pass seed 0 trains two Liches that never plague; seeds 2 and 6 of
    // 0-15 train one and plague (seed 2: three Liches, 17 Plague
    // applications, 38 rounds). The Goblin pass, correction
    // (`pulp_wars-w49.12`: the Human seat researches the Swordsman third):
    // seed 2 trains two Liches that never plague; of seeds 0-6 only seed 6
    // trains one and plagues (three applications, 40 rounds). The Undead
    // pass's correction (`pulp_wars-w49.13`: a Lich plagues only with
    // Pestilence, which the Undead seat researches once it fields two
    // Liches): seed 6 trains one Lich that never plagues; of seeds 0-15,
    // seeds 0 and 9 plague (seed 0: two Liches, 13 applications). The
    // ninth unit (`pulp_wars-w49.17`, 7r55: the Wight's technologies in
    // the Undead order): the two Liches of seed 0 never plague; of seeds
    // 0-19, seeds 8 and 13 plague (seed 8: four Liches, 7 applications).
    // The Industry reshuffle (`pulp_wars-w49.21`, 7r56: the Zombie and
    // the Guard behind Fortification): the two Liches of seed 8 never
    // plague; of seeds 0-19, seeds 2, 10, and 13 plague (seed 10: three
    // Liches, 10 applications, over in round 37). Step two of the Undead
    // pass (`pulp_wars-w49.24`, 7r57: the Undead seat trains before it
    // researches while it is short of units): seed 10 trains no Lich; of
    // seeds 0-19, seeds 1 and 5 plague (seed 1: three Liches, 9
    // applications, 40 rounds).
    const setup: MatchSetupV7 = {
      rulesetId: RULESET_7_ID,
      seed: 1,
      width: 11,
      height: 11,
      aiCount: 1,
      aiDifficulty: "NORMAL",
      aiMode: "RIVAL",
      humanColor: "CORAL",
      factions: ["UNDEAD", "ORIGINAL"],
      mapType: "PANGEA",
      mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
      curiosities: false,
    };
    const first = runAiMatchV7(setup, { maxRounds: 40 });
    expect(first.errors).toEqual([]);
    expect(first.stalls).toEqual([]);
    expect(first.metrics.factionRoles.UNDEAD.trained.CATAPULT).toBeGreaterThan(
      0,
    );
    expect(first.metrics.undead.plagueApplications).toBeGreaterThan(0);
    const again = runAiMatchV7(setup, { maxRounds: 40 });
    expect(again.stateHash).toBe(first.stateHash);
  }, 600_000);
});

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
}

interface ArenaOptions {
  readonly graves?: readonly CoordV7[];
  /** Plagued pieces (by coordinate) and the coordinate of their source. */
  readonly plagued?: readonly {
    at: CoordV7;
    source: CoordV7;
    /** Revision 15 remaining Plague turns (default 3, freshly applied). */
    turnsRemaining?: number;
  }[];
  /** Bitten pieces (by coordinate) and the coordinate of their biter. */
  readonly bitten?: readonly { at: CoordV7; biter: CoordV7 }[];
}

function setupWith(factions: readonly FactionIdV7[]): MatchSetupV7 {
  return {
    rulesetId: RULESET_7_ID,
    seed: 2,
    width: 11,
    height: 11,
    aiCount: 1,
    aiDifficulty: "NORMAL",
    aiMode: "RIVAL",
    humanColor: "CORAL",
    factions: [...factions],
    mapType: "DRY_LAND",
    mapGenerationRevision: "REGIONAL_BIOMES_NAVAL_V4",
    curiosities: false,
  };
}

/**
 * A seed-2 revision-13 board with every technology, the given pieces as the
 * only units, seat 0 active with every tile explored, each piece or Grave
 * tile that is not a settlement cleared to plain Grass, and the given
 * afflictions.
 */
function arena(
  factions: readonly FactionIdV7[],
  pieces: readonly Piece[],
  options: ArenaOptions = {},
): GameStateV7 {
  const created = createRevision13MapStateV7(setupWith(factions));
  if (!created.ok) throw new Error(created.error.code);
  const base = created.state;
  const size = base.board.width;
  const player = (seat: number) =>
    required(base.players.find((candidate) => candidate.seat === seat));
  const units = pieces.map((piece, index): UnitStateV7 => {
    const owner = player(piece.seat);
    const rule = effectiveRoleRuleV7(piece.role, owner.faction);
    return {
      id: unitId(base.nextEntityId + index),
      ownerId: owner.id,
      homeCityId:
        base.cities.find((city) => city.ownerId === owner.id)?.id ?? null,
      role: piece.role,
      form: "LAND",
      at: piece.at,
      hp: piece.hp ?? rule.maxHp,
      maxHp: rule.maxHp,
      kills: 0,
      veteran: false,
      captureEligible: false,
      activation: READY,
    };
  });
  const idAt = (at: CoordV7) =>
    required(units.find((unit) => same(unit.at, at))).id;
  const graves = options.graves ?? [];
  const cleared = [...pieces.map((piece) => piece.at), ...graves];
  const every: CoordV7[] = [];
  for (let y = 0; y < size; y += 1)
    for (let x = 0; x < size; x += 1) every.push({ x, y });
  return checkedV7({
    ...base,
    nextEntityId: base.nextEntityId + pieces.length,
    activeSeatIndex: base.turnOrder.indexOf(player(0).id),
    players: base.players.map((candidate) => ({
      ...candidate,
      researchedTechs: TECHNOLOGY_IDS_V7,
      coins: 0,
      explored: every,
    })),
    cities: base.cities.map((city) => ({ ...city, cityActionAvailable: true })),
    units,
    treasureChests: base.treasureChests.filter(
      (chest) => !cleared.some((at) => same(at, chest)),
    ),
    graves: [...graves].sort(
      (left, right) => left.y - right.y || left.x - right.x,
    ),
    plagued: (options.plagued ?? [])
      .map((entry) => ({
        unitId: idAt(entry.at),
        sourceUnitId: idAt(entry.source),
        turnsRemaining: entry.turnsRemaining ?? PLAGUE_DURATION_TURNS_V7,
      }))
      .sort((left, right) => left.unitId - right.unitId),
    bitten: (options.bitten ?? [])
      .map((entry) => {
        const biter = required(
          units.find((unit) => same(unit.at, entry.biter)),
        );
        return {
          unitId: idAt(entry.at),
          biterPlayerId: biter.ownerId,
          biterUnitId: biter.id,
        };
      })
      .sort((left, right) => left.unitId - right.unitId),
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        cleared.some((at) => same(at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: tile.biome ?? "PLAINS",
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

function attackCommand(attacker: UnitStateV7, target: UnitStateV7): CommandV7 {
  return { kind: "ATTACK", unitId: attacker.id, targetUnitId: target.id };
}

function viewFor(state: GameStateV7): PlayerViewV7 {
  return viewForV7(state, required(state.turnOrder[state.activeSeatIndex]));
}

function decide(state: GameStateV7): NormalAiDecisionV7 {
  return chooseNormalCommandV7(viewFor(state));
}

function apply(state: GameStateV7, command: CommandV7): GameStateV7 {
  const result = applyCommandV7(
    state,
    required(state.turnOrder[state.activeSeatIndex]),
    command,
  );
  if (!result.accepted)
    throw new Error(`${command.kind} rejected: ${result.error.code}`);
  return result.state;
}

function unitAt(
  state: GameStateV7,
  at: CoordV7 | UnitStateV7["id"],
): UnitStateV7 {
  return required(
    state.units.find((unit) =>
      typeof at === "number" ? unit.id === at : same(unit.at, at),
    ),
  );
}

function unitAtPosition(state: GameStateV7, at: CoordV7): UnitStateV7["id"] {
  return unitAt(state, at).id;
}

function required<T>(value: T | undefined | null): T {
  if (value === undefined || value === null)
    throw new Error("fixture value missing");
  return value;
}

const same = (left: CoordV7, right: CoordV7): boolean =>
  left.x === right.x && left.y === right.y;
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
