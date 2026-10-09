import { afterEach, describe, expect, it } from "vitest";
import { chooseNormalCommandV7, scoreCommandV7 } from "../../src/ai/v7";
import {
  CURIOSITY_APPROACH_PRIORITY_V7,
  CURIOSITY_CLAIM_PRIORITY_V7,
  DEFAULT_CURIOSITY_POLICY_OPTIONS_V7,
  FOUNTAIN_APPROACH_PRIORITY_V7,
  FOUNTAIN_ARRIVE_PRIORITY_V7,
  MONSTER_BOUNTY_FOR_POLICY_V7,
  MONSTER_REGENERATION_FOR_POLICY_V7,
  MONSTER_STEP_AWAY_PRIORITY_V7,
  curiosityFactsV7,
  curiosityPolicyOptionsV7,
  planCuriosityErrandsV7,
  setCuriosityPolicyOptionsV7,
  soleCityDefenderV7,
  type CuriosityPolicyToolsV7,
} from "../../src/ai/v7-curiosities";
import {
  MONSTER_BOUNTY_V7,
  MONSTER_REGENERATION_V7,
  applyCommandV7,
  previewMonsterV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type CuriosityV7,
  type FactionIdV7,
  type GameStateV7,
  type PlayerViewV7,
  type PublicUnitV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import {
  candidatesV7,
  moveCandidateV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import {
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
  type GoblinArenaOptionsV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import {
  MONSTER_LAIR_V7,
  monsterArenaV7,
  monsterOfV7,
} from "../fixtures/v7-monster-arena";

// Map curiosities, the Normal AI (`pulp_wars-737.4`,
// docs/product/RULESET_7_MAP_CURIOSITIES.md sections 11 and 13.3).
//
// The Spider tests use the four-seat 16 x 16 arena of `monsterArenaV7`: the
// viewer (seat 0, player 1) has its capital on (4, 4); the Spider stands on
// its lair (7, 7). The other tests use the two-seat 11 x 11 arena: the
// viewer's capital on (8, 8), seat 1's on (2, 8), villages (5, 5), (8, 5),
// and (5, 8).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;
const own = (
  role: GoblinPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const foe = (
  role: GoblinPieceV7["role"],
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

afterEach(() => {
  setCuriosityPolicyOptionsV7(DEFAULT_CURIOSITY_POLICY_OPTIONS_V7);
});

/** The ends of the Moves the engine offers the unit on `from`. */
function offeredEnds(state: GameStateV7, from: CoordV7): readonly CoordV7[] {
  const id = unitIdAtV7(state, from);
  return queryPlayerCommandsV7(viewerViewV7(state))
    .filter((command) => command.kind === "MOVE" && command.unitId === id)
    .map(endOf)
    .filter((end): end is CoordV7 => end !== undefined);
}

/** The ends of the Move candidates of the unit on `from`. */
function candidateEnds(state: GameStateV7, from: CoordV7): readonly CoordV7[] {
  return unitCandidatesV7(state, from, "MOVE")
    .map((candidate) => endOf(candidate.command))
    .filter((end): end is CoordV7 => end !== undefined);
}

const FOUNTAIN = at(2, 3);
const SHRINE = at(7, 2);
const WRECK = at(4, 1);
const WATER = [at(2, 1), at(3, 1), at(4, 1), at(5, 1), at(6, 1)];

/** The two-seat arena with the option on and `curiosities` on their tiles. */
function curiosityArena(
  pieces: readonly GoblinPieceV7[],
  curiosities: readonly CuriosityV7[],
  options: GoblinArenaOptionsV7 = {},
  factions: readonly FactionIdV7[] = ["ORIGINAL", "UNDEAD"],
): GameStateV7 {
  const base = goblinArenaV7(factions, pieces, options);
  return checkedV7({
    ...base,
    setup: { ...base.setup, curiosities: true },
    curiosities: [...curiosities].sort(
      (a, b) => a.at.y - b.at.y || a.at.x - b.at.x,
    ),
    treasureChests: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.site === null &&
        tile.terrain !== "SHALLOW_WATER" &&
        tile.terrain !== "DEEP_WATER"
          ? {
              ...tile,
              biome: "PLAINS" as const,
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

/** The open monster arena: every non-site land tile is plain Grass. */
function spiderArena(
  pieces: readonly GoblinPieceV7[],
  options: Parameters<typeof monsterArenaV7>[1] = {},
): GameStateV7 {
  const base = monsterArenaV7(pieces, options);
  return checkedV7({
    ...base,
    treasureChests: [],
    board: {
      ...base.board,
      tiles: base.board.tiles.map((tile) =>
        tile.site === null &&
        tile.terrain !== "SHALLOW_WATER" &&
        tile.terrain !== "DEEP_WATER"
          ? {
              ...tile,
              biome: "PLAINS" as const,
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

describe("the gate and the switch (section 11, Gating)", () => {
  it("reads the published Monster numbers", () => {
    expect(MONSTER_REGENERATION_FOR_POLICY_V7).toBe(MONSTER_REGENERATION_V7);
    expect(MONSTER_BOUNTY_FOR_POLICY_V7).toBe(MONSTER_BOUNTY_V7);
  });

  it("has no facts for a view without a curiosity or a Monster", () => {
    const plain = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [own("FIGHTER", 7, 7), foe("FIGHTER", 3, 7)],
    );
    expect(curiosityFactsV7(viewerViewV7(plain))).toBeNull();
    expect(curiosityPolicyOptionsV7()).toEqual({ curiosityPlay: true });
    const before = chooseNormalCommandV7(viewerViewV7(plain));
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(chooseNormalCommandV7(viewerViewV7(plain))).toEqual(before);
  });

  it("has facts with a Monster or a curiosity, and none with the switch off", () => {
    const spider = spiderArena([own("FIGHTER", 7, 4)]);
    const facts = curiosityFactsV7(viewerViewV7(spider));
    expect(facts?.monsters).toHaveLength(1);
    expect(facts?.monsters[0]?.unit.id).toBe(monsterOfV7(spider).id);
    const fountain = curiosityArena(
      [own("FIGHTER", 7, 7)],
      [{ kind: "FOUNTAIN", at: FOUNTAIN }],
    );
    expect(curiosityFactsV7(viewerViewV7(fountain))?.fountains).toEqual([
      FOUNTAIN,
    ]);
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(curiosityFactsV7(viewerViewV7(spider))).toBeNull();
    expect(curiosityFactsV7(viewerViewV7(fountain))).toBeNull();
  });
});

describe("the Giant Spider: routine Moves (section 11)", () => {
  it("never ends a routine Move next to the Spider", () => {
    const state = spiderArena([own("FIGHTER", 7, 5), own("RAIDER", 10, 6)]);
    for (const from of [at(7, 5), at(10, 6)]) {
      expect(
        offeredEnds(state, from).some(
          (end) => chebyshev(end, MONSTER_LAIR_V7) === 1,
        ),
      ).toBe(true);
      const ends = candidateEnds(state, from);
      expect(ends.length).toBeGreaterThan(0);
      expect(ends.every((end) => chebyshev(end, MONSTER_LAIR_V7) > 1)).toBe(
        true,
      );
    }
  });

  it("holds for an AI seat in a Cooperative match too", () => {
    const state = spiderArena([{ seat: 1, role: "FIGHTER", at: at(7, 5) }], {
      aiMode: "COOPERATIVE",
      activeSeat: 1,
    });
    const view = viewForV7(state, seatIdV7(state, 1));
    const fighter = unitAtV7(state, at(7, 5)).id;
    const moves = chooseNormalCommandV7(view).candidates.filter(
      (candidate) =>
        candidate.command.kind === "MOVE" &&
        candidate.command.unitId === fighter,
    );
    expect(moves.length).toBeGreaterThan(0);
    for (const candidate of moves) {
      const end = endOf(candidate.command);
      expect(end !== undefined && chebyshev(end, MONSTER_LAIR_V7) > 1).toBe(
        true,
      );
    }
    // An attack on it is no candidate either.
    const adjacent = spiderArena([{ seat: 1, role: "FIGHTER", at: at(7, 6) }], {
      aiMode: "COOPERATIVE",
      activeSeat: 1,
    });
    const stuck = unitAtV7(adjacent, at(7, 6)).id;
    const unit = chooseNormalCommandV7(
      viewForV7(adjacent, seatIdV7(adjacent, 1)),
    ).candidates.filter(
      (candidate) =>
        "unitId" in candidate.command && candidate.command.unitId === stuck,
    );
    expect(unit.some((candidate) => candidate.command.kind === "ATTACK")).toBe(
      false,
    );
    expect(unit[0]?.command.kind).toBe("MOVE");
    expect(unit[0]?.score.priority).toBe(MONSTER_STEP_AWAY_PRIORITY_V7);
  });

  it("steps a unit with no attack away from the Spider", () => {
    const state = spiderArena([own("FIGHTER", 7, 6)]);
    const fighter = unitIdAtV7(state, at(7, 6));
    const candidates = unitCandidatesV7(state, at(7, 6));
    expect(
      candidates.some((candidate) => candidate.command.kind === "ATTACK"),
    ).toBe(false);
    const best = candidates[0];
    expect(best?.command).toMatchObject({ kind: "MOVE", unitId: fighter });
    expect(best?.score.priority).toBe(MONSTER_STEP_AWAY_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(end !== undefined && chebyshev(end, MONSTER_LAIR_V7) > 1).toBe(true);
  });

  it("steps a unit that hurt the Spider out of its reach", () => {
    // The Marksman on (9, 7) is 2 from the Spider (not next to it) but in
    // its `provokedBy` and its reach (the Spider may step to (8, 7)): it
    // leaves the reach.
    const state = spiderArena([own("MARKSMAN", 9, 7)], { provokedBy: [0] });
    const reach = previewMonsterV7(
      viewerViewV7(state),
      monsterOfV7(state).id,
    )?.reachTiles;
    expect(reach?.some((tile) => tile.x === 9 && tile.y === 7)).toBe(true);
    const best = unitCandidatesV7(state, at(9, 7), "MOVE")[0];
    expect(best?.command.kind).toBe("MOVE");
    expect(best?.score.priority).toBe(MONSTER_STEP_AWAY_PRIORITY_V7);
    const end = best === undefined ? undefined : endOf(best.command);
    expect(
      end !== undefined &&
        !(reach ?? []).some((tile) => tile.x === end.x && tile.y === end.y),
    ).toBe(true);
  });
});

describe("the Giant Spider: attacks (section 11 (a) and (b))", () => {
  const attacksOn = (state: GameStateV7) => {
    const spider = monsterOfV7(state).id;
    return candidatesV7(state).filter(
      (candidate) =>
        candidate.command.kind === "ATTACK" &&
        candidate.command.targetUnitId === spider,
    );
  };

  it("does not chip a healthy Spider from inside its reach", () => {
    // A Fighter next to it and a Marksman 2 away, inside its reach (it may
    // step to (8, 7)): both would be attacked.
    const state = spiderArena([own("FIGHTER", 7, 6), own("MARKSMAN", 9, 8)]);
    const spider = monsterOfV7(state).id;
    const offered = queryPlayerCommandsV7(viewerViewV7(state)).filter(
      (command) => command.kind === "ATTACK" && command.targetUnitId === spider,
    );
    expect(offered).toHaveLength(2);
    expect(attacksOn(state)).toEqual([]);
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(attacksOn(state).length).toBeGreaterThan(0);
  });

  it("attacks from outside its reach when the hit beats its regeneration", () => {
    // The Catapult on (7, 4) is 3 from the Spider: out of its reach.
    const state = spiderArena([own("CATAPULT", 7, 4)]);
    const view = viewerViewV7(state);
    const preview = queryCombatPreviewV7(
      view,
      unitIdAtV7(state, at(7, 4)),
      monsterOfV7(state).id,
    );
    expect(preview?.monsterRetaliates).toBe(false);
    expect(preview?.damageToDefender).toBeGreaterThan(MONSTER_REGENERATION_V7);
    expect(attacksOn(state)).toHaveLength(1);
    expect(unitCandidatesV7(state, at(7, 4))[0]?.command.kind).toBe("ATTACK");
  });

  it("shoots from outside its reach with a Marksman too", () => {
    // (9, 9) is 2 from the Spider and out of its reach (it cannot step to
    // (8, 8), which is within 2 of a village).
    const state = spiderArena([own("MARKSMAN", 9, 9)], { monsterHp: 20 });
    const preview = queryCombatPreviewV7(
      viewerViewV7(state),
      unitIdAtV7(state, at(9, 9)),
      monsterOfV7(state).id,
    );
    expect(preview?.monsterRetaliates).toBe(false);
    expect(attacksOn(state)).toHaveLength(
      (preview?.damageToDefender ?? 0) > MONSTER_REGENERATION_V7 ? 1 : 0,
    );
  });

  it("prefers another target to a chip on the Spider", () => {
    const state = monsterArenaV7(
      [own("CATAPULT", 7, 4), { seat: 1, role: "FIGHTER", at: at(9, 3) }],
      {},
    );
    expect(attacksOn(state)).toEqual([]);
  });

  it("joins a combined kill this turn, and values the bounty", () => {
    // 4 HP left: the two Fighters next to it kill it between them.
    const state = spiderArena([own("FIGHTER", 7, 6), own("FIGHTER", 6, 7)], {
      monsterHp: 4,
    });
    const attacks = attacksOn(state);
    expect(attacks.length).toBeGreaterThan(0);
    for (const from of [at(7, 6), at(6, 7)])
      expect(unitCandidatesV7(state, from)[0]?.command.kind).toBe("ATTACK");
    const kill = attacks.find((candidate) => {
      const command = candidate.command;
      return (
        command.kind === "ATTACK" &&
        queryCombatPreviewV7(
          viewerViewV7(state),
          command.unitId,
          command.targetUnitId,
        )?.defenderDies === true
      );
    });
    if (kill !== undefined) {
      setCuriosityPolicyOptionsV7({ curiosityPlay: false });
      const plain = scoreCommandV7(viewerViewV7(state), kill.command);
      expect(kill.score.strategicValue - plain.strategicValue).toBe(
        MONSTER_BOUNTY_V7,
      );
    }
  });

  it("moves a melee unit next to the Spider only for the kill", () => {
    const hunt = spiderArena([own("FIGHTER", 7, 5)], { monsterHp: 1 });
    const move = unitCandidatesV7(hunt, at(7, 5))[0];
    expect(move?.command.kind).toBe("MOVE");
    const end = move === undefined ? undefined : endOf(move.command);
    expect(end !== undefined && chebyshev(end, MONSTER_LAIR_V7) === 1).toBe(
      true,
    );
    // A healthy Spider is not worth it: no Move ends next to it.
    const healthy = spiderArena([own("FIGHTER", 7, 5)]);
    expect(
      candidateEnds(healthy, at(7, 5)).every(
        (to) => chebyshev(to, MONSTER_LAIR_V7) > 1,
      ),
    ).toBe(true);
    const moved = applyCommandV7(
      hunt,
      hunt.humanPlayerId,
      move?.command as CommandV7,
    );
    if (!moved.accepted) throw new Error(moved.error.code);
    const strike = unitCandidatesV7(moved.state, end as CoordV7)[0];
    expect(strike?.command.kind).toBe("ATTACK");
    const struck = applyCommandV7(
      moved.state,
      hunt.humanPlayerId,
      strike?.command as CommandV7,
    );
    if (!struck.accepted) throw new Error(struck.error.code);
    expect(struck.state.monsters).toEqual([]);
    expect(
      struck.events.some((event) => event.kind === "MONSTER_BOUNTY_AWARDED"),
    ).toBe(true);
  });

  const nextToLair = (state: GameStateV7, from: CoordV7) =>
    unitCandidatesV7(state, from, "MOVE").filter((candidate) => {
      const end = endOf(candidate.command);
      return end !== undefined && chebyshev(end, MONSTER_LAIR_V7) === 1;
    });

  it("holds each hunter of a combined kill to its own tile", () => {
    // 8 HP left: two Fighters that move in kill it between them (7, then
    // the rest). Each could reach three tiles next to it; the plan gives
    // each one tile, so neither takes the tile the other needs.
    const state = spiderArena([own("FIGHTER", 7, 5), own("FIGHTER", 9, 5)], {
      monsterHp: 8,
    });
    const first = nextToLair(state, at(7, 5));
    const second = nextToLair(state, at(9, 5));
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(endOf(first[0]?.command as CommandV7)).not.toEqual(
      endOf(second[0]?.command as CommandV7),
    );
    // One Fighter alone does not kill it: nobody moves in.
    const alone = spiderArena([own("FIGHTER", 7, 5)], { monsterHp: 8 });
    expect(nextToLair(alone, at(7, 5))).toEqual([]);
  });

  it("leaves out a hunter the Spider's retaliation would kill", () => {
    // The second Fighter has 4 HP: its hit would finish the Spider, but
    // judged against the Spider as it stands it dies, so there is no plan.
    const state = spiderArena(
      [own("FIGHTER", 7, 5), own("FIGHTER", 9, 5, { hp: 4 })],
      { monsterHp: 8 },
    );
    expect(nextToLair(state, at(7, 5))).toEqual([]);
    expect(nextToLair(state, at(9, 5))).toEqual([]);
  });

  it("never sends a sole city defender to the Spider", () => {
    // The viewer's capital is (13, 4); a lair on (10, 7) is 3 from it. The
    // Raider on the capital could reach (11, 6) and kill the 1-HP Spider,
    // but it is the capital's only defender.
    const lair = at(10, 7);
    const alone = spiderArena([own("RAIDER", 13, 4)], {
      home: lair,
      monsterHp: 1,
    });
    expect(
      soleCityDefenderV7(
        viewerViewV7(alone),
        viewerViewV7(alone).units.find(
          (unit) => unit.id === unitIdAtV7(alone, at(13, 4)),
        ) as PublicUnitV7,
      ),
    ).toBe(true);
    expect(
      offeredEnds(alone, at(13, 4)).some((end) => chebyshev(end, lair) === 1),
    ).toBe(true);
    expect(
      candidateEnds(alone, at(13, 4)).every((end) => chebyshev(end, lair) > 1),
    ).toBe(true);
    // With a second unit by the capital it goes.
    const guarded = spiderArena([own("RAIDER", 13, 4), own("FIGHTER", 14, 4)], {
      home: lair,
      monsterHp: 1,
    });
    expect(
      candidateEnds(guarded, at(13, 4)).some(
        (end) => chebyshev(end, lair) === 1,
      ),
    ).toBe(true);
  });
});

describe("the Giant Spider: the threat estimate (section 11, Threat)", () => {
  const safety = (state: GameStateV7, from: CoordV7, to: CoordV7): number => {
    const command = queryPlayerCommandsV7(viewerViewV7(state)).find(
      (candidate) => {
        const end = endOf(candidate);
        return (
          candidate.kind === "MOVE" &&
          candidate.unitId === unitIdAtV7(state, from) &&
          end !== undefined &&
          end.x === to.x &&
          end.y === to.y
        );
      },
    );
    if (command === undefined) throw new Error("Move not offered");
    return scoreCommandV7(viewerViewV7(state), command).safetyValue;
  };

  it("counts the Spider on its provoke tiles only", () => {
    const state = spiderArena([own("FIGHTER", 9, 5)]);
    // (9, 6) is 2 from the Spider: in its reach, but safe unprovoked.
    expect(safety(state, at(9, 5), at(9, 6))).toBe(0);
    const near = spiderArena([own("FIGHTER", 7, 5)]);
    expect(safety(near, at(7, 5), at(7, 6))).toBeLessThan(0);
    // The policy of `7r36` counted its whole Move-and-attack reach.
    setCuriosityPolicyOptionsV7({ curiosityPlay: false });
    expect(safety(state, at(9, 5), at(9, 6))).toBeLessThan(0);
  });

  it("counts it for a unit in its `provokedBy` inside its reach", () => {
    const state = spiderArena([own("FIGHTER", 9, 5)], { provokedBy: [0] });
    expect(safety(state, at(9, 5), at(9, 6))).toBeLessThan(0);
    expect(safety(state, at(9, 5), at(9, 4))).toBe(0);
  });
});

describe("the Fountain of Youth (section 11, Fountain)", () => {
  const fountain: readonly CuriosityV7[] = [{ kind: "FOUNTAIN", at: FOUNTAIN }];

  it("walks a unit at half HP to a safe Fountain", () => {
    const far = curiosityArena([own("FIGHTER", 4, 3, { hp: 6 })], fountain);
    const step = unitCandidatesV7(far, at(4, 3))[0];
    expect(step?.command.kind).toBe("MOVE");
    expect(step?.score.priority).toBe(FOUNTAIN_APPROACH_PRIORITY_V7);
    const end = step === undefined ? undefined : endOf(step.command);
    expect(end !== undefined && chebyshev(end, FOUNTAIN) === 1).toBe(true);
    const near = curiosityArena([own("FIGHTER", 3, 3, { hp: 6 })], fountain);
    const arrive = unitCandidatesV7(near, at(3, 3))[0];
    expect(arrive?.command.kind).toBe("MOVE");
    expect(arrive === undefined ? undefined : endOf(arrive.command)).toEqual(
      FOUNTAIN,
    );
    expect(arrive?.score.priority).toBe(FOUNTAIN_ARRIVE_PRIORITY_V7);
  });

  it("leaves a unit above half HP, or too far, to its ordinary play", () => {
    const healthy = curiosityArena([own("FIGHTER", 3, 3, { hp: 7 })], fountain);
    expect(
      moveCandidateV7(healthy, at(3, 3), FOUNTAIN)?.score.priority,
    ).not.toBe(FOUNTAIN_ARRIVE_PRIORITY_V7);
    // A Fighter (Move 1) three steps away is more than two turns out.
    const far = curiosityArena([own("FIGHTER", 5, 3, { hp: 6 })], fountain);
    expect(
      unitCandidatesV7(far, at(5, 3), "MOVE").some(
        (candidate) =>
          candidate.score.priority === FOUNTAIN_APPROACH_PRIORITY_V7,
      ),
    ).toBe(false);
  });

  it("stands on the Fountain until it has healed", () => {
    const hurt = curiosityArena([own("GUARD", 2, 3, { hp: 4 })], fountain);
    expect(offeredEnds(hurt, FOUNTAIN).length).toBeGreaterThan(0);
    expect(unitCandidatesV7(hurt, FOUNTAIN, "MOVE")).toEqual([]);
    const healed = curiosityArena([own("GUARD", 2, 3)], fountain);
    expect(unitCandidatesV7(healed, FOUNTAIN, "MOVE").length).toBeGreaterThan(
      0,
    );
  });

  it("does not walk to a Fountain an enemy can reach", () => {
    const state = curiosityArena(
      [own("FIGHTER", 4, 3, { hp: 6 }), foe("FIGHTER", 2, 5)],
      fountain,
    );
    expect(
      unitCandidatesV7(state, at(4, 3), "MOVE").some(
        (candidate) =>
          candidate.score.priority === FOUNTAIN_APPROACH_PRIORITY_V7 ||
          candidate.score.priority === FOUNTAIN_ARRIVE_PRIORITY_V7,
      ),
    ).toBe(false);
  });
});

describe("the errand planner (section 11)", () => {
  const tools = (
    view: PlayerViewV7,
    extra: Partial<CuriosityPolicyToolsV7> = {},
  ): CuriosityPolicyToolsV7 => {
    const facts = curiosityFactsV7(view);
    if (facts === null) throw new Error("no curiosity facts");
    return {
      view,
      facts,
      move: () => 1,
      construct: () => false,
      grows: () => false,
      captures: () => false,
      danger: () => 0,
      navalDanger: false,
      ...extra,
    };
  };
  const fountain: readonly CuriosityV7[] = [{ kind: "FOUNTAIN", at: FOUNTAIN }];
  const shrine: readonly CuriosityV7[] = [{ kind: "SHRINE", at: SHRINE }];

  it("gives the Fountain to the nearest hurt unit, never a construct", () => {
    const state = curiosityArena(
      [own("FIGHTER", 4, 3, { hp: 6 }), own("FIGHTER", 3, 4, { hp: 5 })],
      fountain,
    );
    const view = viewerViewV7(state);
    const nearest = unitIdAtV7(state, at(3, 4));
    expect([...planCuriosityErrandsV7(tools(view)).keys()]).toEqual([nearest]);
    expect(
      planCuriosityErrandsV7(tools(view, { construct: () => true })).size,
    ).toBe(0);
    expect(planCuriosityErrandsV7(tools(view, { danger: () => 3 })).size).toBe(
      0,
    );
  });

  it("gives the Shrine to the nearest unit that can be Promoted", () => {
    const state = curiosityArena(
      [own("FIGHTER", 7, 5), own("FIGHTER", 5, 2)],
      shrine,
    );
    const view = viewerViewV7(state);
    const errands = planCuriosityErrandsV7(tools(view));
    expect([...errands.keys()]).toEqual([unitIdAtV7(state, at(5, 2))]);
    expect(errands.get(unitIdAtV7(state, at(5, 2)))).toMatchObject({
      kind: "SHRINE",
      at: SHRINE,
    });
    // A growing unit (a dinosaur) cannot claim it.
    expect(
      planCuriosityErrandsV7(tools(view, { grows: () => true })).size,
    ).toBe(0);
    // A capturer with a capture to make keeps to it: (7, 5) is next to the
    // village (8, 5), so only the unit on (5, 2) is left.
    expect([
      ...planCuriosityErrandsV7(tools(view, { captures: () => true })).keys(),
    ]).toEqual([unitIdAtV7(state, at(5, 2))]);
  });

  it("never sends a sole city defender", () => {
    // The hurt unit on the capital (8, 8) is its only defender (a curiosity
    // is never within 3 of a center, so the test gives it Move 3: the
    // Fountain on (2, 3) is six steps away, two turns). With a second unit
    // by the capital it goes.
    const alone = curiosityArena([own("FIGHTER", 8, 8, { hp: 6 })], fountain);
    const view = viewerViewV7(alone);
    const defender = view.units.find(
      (unit) => unit.id === unitIdAtV7(alone, at(8, 8)),
    ) as PublicUnitV7;
    expect(soleCityDefenderV7(view, defender)).toBe(true);
    expect(planCuriosityErrandsV7(tools(view, { move: () => 3 })).size).toBe(0);
    const guarded = curiosityArena(
      [own("FIGHTER", 8, 8, { hp: 6 }), own("FIGHTER", 7, 8)],
      fountain,
    );
    const guardedView = viewerViewV7(guarded);
    expect(
      soleCityDefenderV7(
        guardedView,
        guardedView.units.find(
          (unit) => unit.id === unitIdAtV7(guarded, at(8, 8)),
        ) as PublicUnitV7,
      ),
    ).toBe(false);
    expect([
      ...planCuriosityErrandsV7(tools(guardedView, { move: () => 3 })).keys(),
    ]).toEqual([unitIdAtV7(guarded, at(8, 8))]);
  });
});

describe("the Shrine and the Wreck (section 11)", () => {
  it("claims a Shrine like a treasure chest", () => {
    const shrine: readonly CuriosityV7[] = [{ kind: "SHRINE", at: SHRINE }];
    const next = curiosityArena([own("FIGHTER", 6, 2)], shrine);
    const claim = candidatesV7(next)[0];
    expect(claim?.command.kind).toBe("MOVE");
    expect(claim === undefined ? undefined : endOf(claim.command)).toEqual(
      SHRINE,
    );
    expect(claim?.score.priority).toBe(CURIOSITY_CLAIM_PRIORITY_V7);
    const far = curiosityArena([own("FIGHTER", 4, 2)], shrine);
    const step = unitCandidatesV7(far, at(4, 2), "MOVE")[0];
    expect(step?.score.priority).toBe(CURIOSITY_APPROACH_PRIORITY_V7);
    const end = step === undefined ? undefined : endOf(step.command);
    expect(end !== undefined && chebyshev(end, SHRINE) === 2).toBe(true);
  });

  it("leaves the Shrine to a unit that can be Promoted", () => {
    const shrine: readonly CuriosityV7[] = [{ kind: "SHRINE", at: SHRINE }];
    const base = curiosityArena([own("FIGHTER", 6, 2)], shrine);
    const veteran = checkedV7({
      ...base,
      units: base.units.map((unit) => ({
        ...unit,
        veteran: true,
        kills: 3,
        maxHp: unit.maxHp + 5,
        hp: unit.maxHp + 5,
      })),
    });
    expect(moveCandidateV7(veteran, at(6, 2), SHRINE)?.score.priority).not.toBe(
      CURIOSITY_CLAIM_PRIORITY_V7,
    );
  });

  it("salvages a Wreck with a unit afloat", () => {
    const wreck: readonly CuriosityV7[] = [{ kind: "WRECK", at: WRECK }];
    const state = curiosityArena(
      [own("PATROL_BOAT", 3, 1, { form: "NAVAL" })],
      wreck,
      { water: WATER },
    );
    const claim = moveCandidateV7(state, at(3, 1), WRECK);
    expect(claim?.score.priority).toBe(CURIOSITY_CLAIM_PRIORITY_V7);
    expect(candidatesV7(state)[0]?.command).toEqual(claim?.command);
  });
});
