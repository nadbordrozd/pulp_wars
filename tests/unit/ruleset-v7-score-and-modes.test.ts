import { describe, expect, it } from "vitest";
import {
  FLAWLESS_BREAKING_EVENT_KINDS_V7,
  HARDEST_AI_DIFFICULTY_V7,
  PERFECTION_ROUNDS_V7,
  SCORE_GIANT_VALUE_V7,
  SCORE_MONSTER_VALUE_V7,
  appendReplayCommandV7,
  applyCommandV7,
  canonicalJson,
  collectScoreCreditsV7,
  createPlayableGameV7,
  createReplayV7,
  effectiveRoleRuleV7,
  foldScoreLedgerV7,
  gameModeOfV7,
  matchSummaryV7,
  parseGameStateV7,
  playerId,
  queryScoreV7,
  queryStarGradeV7,
  runReplayV7,
  scoreFromCountsV7,
  scoreRankingV7,
  scoreV7,
  scoresV7,
  starGradeInputsV7,
  starGradeV7,
  starThresholdsV7,
  unitId,
  unitScoreValueV7,
  validateMatchSetupV7,
  viewForV7,
  type DomainEventV7,
  type GameStateV7,
  type MatchSetupV7,
  type PlayerId,
  type ScoreCountsV7,
  type ScoreLedgerEntryV7,
  type StarGradeInputsV7,
} from "../../src/engine/index";
import { createSaveEnvelopeV7, parseSaveV7 } from "../../src/persistence/index";
import {
  NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7,
  chooseNormalCommandV7,
  chooseNormalTurnCommandV7,
} from "../../src/ai/v7";
import {
  applyOkV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { browserSetupV7, checkedV7 } from "../fixtures/v7-builders";
import { dwarfFieldV7 } from "../fixtures/v7-dwarf";
import { endTurnUntilV7 } from "../fixtures/v7-goblin-arena";
import { activeIdV7, fieldV7 } from "../fixtures/v7-revision20";

const at = (x: number, y: number) => ({ x, y });

function counts(
  territoryTiles: number,
  cityLevels: number,
  techTiers: number,
  achievements: number,
  armyValue: number,
  killValue: number,
  lossValue: number,
  hpLost: number,
): ScoreCountsV7 {
  return {
    territoryTiles,
    cityLevels,
    techTiers,
    achievements,
    armyValue,
    killValue,
    lossValue,
    hpLost,
  };
}

function grade(
  overrides: Partial<StarGradeInputsV7> & {
    readonly yourScore: number;
    readonly bestRivalPeak: number;
  },
) {
  return starGradeV7({
    gameMode: "DOMINATION",
    victory: true,
    rivals: 3,
    hardestDifficulty: true,
    ratingRound: 20,
    everyRivalEliminatedByYou: true,
    flawless: false,
    ...overrides,
  });
}

function created(setup: MatchSetupV7): GameStateV7 {
  const game = createPlayableGameV7(setup);
  if (!game.ok) throw new Error(game.error.code);
  return game.state;
}

function perfectionSetup(seed = 71): MatchSetupV7 {
  return { ...browserSetupV7(seed), gameMode: "PERFECTION" };
}

/** The state in round 30, at the last seat's turn. */
function lastTurnOfRound30(state: GameStateV7): GameStateV7 {
  return checkedV7({
    ...state,
    round: PERFECTION_ROUNDS_V7,
    activeSeatIndex: state.turnOrder.length - 1,
  });
}

function endTurn(state: GameStateV7) {
  const actor = state.turnOrder[state.activeSeatIndex];
  if (actor === undefined) throw new Error("no active seat");
  return applyOkV7(state, actor, { kind: "END_TURN" });
}

describe("score and modes: the score of section 3.1", () => {
  it("weights each factor alone", () => {
    expect(scoreFromCountsV7(counts(1, 0, 0, 0, 0, 0, 0, 0)).total).toBe(2);
    expect(scoreFromCountsV7(counts(0, 1, 0, 0, 0, 0, 0, 0)).total).toBe(10);
    expect(scoreFromCountsV7(counts(0, 0, 1, 0, 0, 0, 0, 0)).total).toBe(8);
    expect(scoreFromCountsV7(counts(0, 0, 0, 1, 0, 0, 0, 0)).total).toBe(40);
    expect(scoreFromCountsV7(counts(0, 0, 0, 0, 1, 0, 0, 0)).total).toBe(1);
    expect(scoreFromCountsV7(counts(0, 0, 0, 0, 0, 1, 0, 0)).total).toBe(2);
    const losses = scoreFromCountsV7(counts(0, 10, 0, 0, 0, 0, 3, 0));
    expect(losses.losses).toEqual({ count: 3, points: -3 });
    expect(losses.total).toBe(97);
    const damage = scoreFromCountsV7(counts(0, 10, 0, 0, 0, 0, 0, 14));
    expect(damage.damage).toEqual({ count: 14, points: -2 });
    expect(damage.total).toBe(98);
  });

  it("caps the penalty at half the positive points, below, at, and above", () => {
    // positive 100: a penalty of 49, 50, and 51 (and far more).
    const below = scoreFromCountsV7(counts(0, 10, 0, 0, 0, 0, 49, 0));
    expect([below.penaltyApplied, below.capReturned, below.total]).toEqual([
      49, 0, 51,
    ]);
    const exact = scoreFromCountsV7(counts(0, 10, 0, 0, 0, 0, 50, 0));
    expect([exact.penaltyApplied, exact.capReturned, exact.total]).toEqual([
      50, 0, 50,
    ]);
    const above = scoreFromCountsV7(counts(0, 10, 0, 0, 0, 0, 51, 0));
    expect([above.penaltyApplied, above.capReturned, above.total]).toEqual([
      50, 1, 50,
    ]);
    // An odd positive total rounds the cap down: 101 keeps 51.
    const odd = scoreFromCountsV7(counts(0, 10, 0, 0, 1, 0, 500, 5000));
    expect(odd.total).toBe(51);
    // Nothing positive: never negative.
    expect(scoreFromCountsV7(counts(0, 0, 0, 0, 0, 0, 99, 999)).total).toBe(0);
    expect(() => scoreFromCountsV7(counts(0, 0, 0, 0, 0, 0, 0, 0.5))).toThrow(
      RangeError,
    );
  });

  it("reproduces worked examples A to E to the point (section 5.6)", () => {
    const rows: readonly [ScoreCountsV7, number, number][] = [
      // A: you at the end (R16), the Goblin peak (R11 end).
      [counts(54, 13, 11, 1, 26, 24, 8, 64), 440, 420],
      [counts(27, 6, 5, 0, 16, 8, 6, 32), 186, 174],
      // B: you at R30, the best rival peak by R30.
      [counts(117, 40, 30, 2, 70, 60, 30, 180), 1144, 1078],
      [counts(108, 34, 24, 1, 90, 50, 20, 150), 978, 928],
      // C: flawless.
      [counts(63, 17, 16, 2, 34, 30, 0, 46), 598, 589],
      [counts(45, 10, 10, 0, 24, 10, 8, 40), 314, 298],
      // D: hard elimination game.
      [counts(99, 30, 24, 3, 48, 70, 16, 120), 998, 958],
      [counts(54, 14, 14, 1, 30, 22, 10, 60), 474, 452],
      // E: Perfection.
      [counts(144, 46, 34, 3, 80, 90, 24, 160), 1400, 1344],
      [counts(90, 28, 20, 1, 60, 40, 20, 140), 800, 752],
    ];
    for (const [input, positive, total] of rows) {
      const score = scoreFromCountsV7(input);
      expect(score.positive).toBe(positive);
      expect(score.total).toBe(total);
    }
  });

  it("grades worked examples A to F (section 5.6)", () => {
    // A: 1 rival, 420 against 174: 2.41, 2 stars, no glow.
    const a = grade({ rivals: 1, yourScore: 420, bestRivalPeak: 174 });
    expect([a.stars, a.glow, a.rating.display]).toEqual([2, false, "2.41"]);
    // B: 7 rivals, 1,078 against 928 at round 30: 1.16, 1 star.
    const b = grade({
      rivals: 7,
      yourScore: 1078,
      bestRivalPeak: 928,
      ratingRound: 30,
    });
    expect([b.stars, b.rating.display, b.ratingRound]).toEqual([1, "1.16", 30]);
    // C: 2 rivals, flawless, 589 against 298: 1.97, 3 stars and the glow,
    // whoever eliminated the rivals and on any difficulty.
    const c = grade({
      rivals: 2,
      yourScore: 589,
      bestRivalPeak: 298,
      flawless: true,
      everyRivalEliminatedByYou: false,
      hardestDifficulty: false,
    });
    expect([c.stars, c.glow, c.rating.display]).toEqual([3, true, "1.97"]);
    // D: 3 rivals, every elimination yours: 2.11, 3 stars; with one
    // elimination made by a rival, 2 stars.
    const d = grade({ rivals: 3, yourScore: 958, bestRivalPeak: 452 });
    expect([d.stars, d.rating.display]).toEqual([3, "2.11"]);
    expect(
      grade({
        rivals: 3,
        yourScore: 958,
        bestRivalPeak: 452,
        everyRivalEliminatedByYou: false,
      }).stars,
    ).toBe(2);
    // E: Perfection, 4 rivals, 1,344 against 752: 1.78, 2 stars.
    const e = grade({
      gameMode: "PERFECTION",
      rivals: 4,
      yourScore: 1344,
      bestRivalPeak: 752,
      everyRivalEliminatedByYou: false,
    });
    expect([e.stars, e.rating.display]).toEqual([2, "1.78"]);
    expect(e.conditions.everyRivalEliminatedByYou).toBeNull();
    // F: Perfection, outscored 433 to 521: a defeat, 0 stars.
    const f = grade({
      gameMode: "PERFECTION",
      rivals: 1,
      victory: false,
      yourScore: 433,
      bestRivalPeak: 521,
    });
    expect([f.stars, f.glow]).toEqual([0, false]);
  });
});

describe("score and modes: the grade of section 5", () => {
  it("sets the thresholds by rival count (section 5.2)", () => {
    expect(starThresholdsV7(1)).toEqual({
      twoStarsHundredths: 200,
      threeStarsHundredths: 300,
    });
    expect(starThresholdsV7(2)).toEqual({
      twoStarsHundredths: 175,
      threeStarsHundredths: 250,
    });
    expect(starThresholdsV7(3)).toEqual({
      twoStarsHundredths: 150,
      threeStarsHundredths: 200,
    });
    expect(starThresholdsV7(7)).toEqual(starThresholdsV7(3));
  });

  it("compares the exact fraction at each boundary", () => {
    for (const [rivals, two, three] of [
      [1, 200, 300],
      [2, 175, 250],
      [3, 150, 200],
      [7, 150, 200],
    ] as const) {
      // A rival peak of 400: the boundary is exactly `threshold × 4`.
      const at = (yourScore: number) =>
        grade({ rivals, yourScore, bestRivalPeak: 400 }).stars;
      expect(at(two * 4 - 1)).toBe(1);
      expect(at(two * 4)).toBe(2);
      expect(at(three * 4 - 1)).toBe(2);
      expect(at(three * 4)).toBe(3);
    }
    // 2.005 against 2.00 is exact, not rounded: 401 / 200 meets 2 stars
    // with one rival; 399 / 200 does not.
    expect(grade({ rivals: 1, yourScore: 401, bestRivalPeak: 200 }).stars).toBe(
      2,
    );
    expect(grade({ rivals: 1, yourScore: 399, bestRivalPeak: 200 }).stars).toBe(
      1,
    );
  });

  it("grades every row of section 5.3", () => {
    // Defeat: 0 stars whatever the rating.
    expect(
      grade({ victory: false, yourScore: 900, bestRivalPeak: 100 }).stars,
    ).toBe(0);
    // Victory below the 2-star rating: 1 star.
    expect(grade({ yourScore: 140, bestRivalPeak: 100 }).stars).toBe(1);
    // 3-star rating but not the hardest difficulty: 2 stars.
    expect(
      grade({
        yourScore: 300,
        bestRivalPeak: 100,
        hardestDifficulty: false,
      }).stars,
    ).toBe(2);
    // Perfection asks for no eliminations.
    expect(
      grade({
        gameMode: "PERFECTION",
        yourScore: 300,
        bestRivalPeak: 100,
        everyRivalEliminatedByYou: false,
      }).stars,
    ).toBe(3);
    // Flawless needs the 2-star rating for the glow (the pacifist game).
    const pacifist = grade({
      gameMode: "PERFECTION",
      yourScore: 140,
      bestRivalPeak: 100,
      flawless: true,
    });
    expect([pacifist.stars, pacifist.glow]).toEqual([1, false]);
    // A flawless defeat earns nothing.
    expect(
      grade({
        victory: false,
        flawless: true,
        yourScore: 900,
        bestRivalPeak: 100,
      }),
    ).toMatchObject({ stars: 0, glow: false });
    expect(HARDEST_AI_DIFFICULTY_V7).toBe("NORMAL");
  });
});

describe("score and modes: the score query over a state", () => {
  it("counts territory, levels, tiers, achievements, and army (section 3.2)", () => {
    const state = created(browserSetupV7(71));
    for (const player of state.players) {
      const score = scoreV7(state, player.id);
      const cityIds = new Set(
        state.cities
          .filter((city) => city.ownerId === player.id)
          .map((city) => city.id),
      );
      expect(score.territory.count).toBe(
        state.board.tiles.filter(
          (tile) =>
            tile.territoryCityId !== null && cityIds.has(tile.territoryCityId),
        ).length,
      );
      expect(score.cities.count).toBe(
        state.cities
          .filter((city) => city.ownerId === player.id)
          .reduce((sum, city) => sum + city.level, 0),
      );
      expect(score.army.count).toBe(
        state.units
          .filter((unit) => unit.ownerId === player.id)
          .reduce(
            (sum, unit) =>
              sum + (effectiveRoleRuleV7(unit.role, player.faction).cost ?? 0),
            0,
          ),
      );
      expect(score.kills.count + score.losses.count + score.damage.count).toBe(
        0,
      );
    }
    // A level-1 capital with its 9 tiles and a Fighter: 18 + 10 + 2.
    expect(scoreV7(state, state.humanPlayerId).total).toBeGreaterThanOrEqual(
      30,
    );
  });

  it("values a role with no printed cost at 12 and the Giant Spider at 10", () => {
    const state = created(browserSetupV7(71));
    const human = state.humanPlayerId;
    expect(effectiveRoleRuleV7("JUGGERNAUT", "ORIGINAL").cost).toBeNull();
    expect(
      unitScoreValueV7(state, {
        id: unitId(9999),
        ownerId: human,
        role: "JUGGERNAUT",
      }),
    ).toBe(SCORE_GIANT_VALUE_V7);
    expect(SCORE_GIANT_VALUE_V7).toBe(12);
    expect(SCORE_MONSTER_VALUE_V7).toBe(10);
    expect(
      unitScoreValueV7(state, {
        id: unitId(9999),
        ownerId: 0 as PlayerId,
        role: "JUGGERNAUT",
      }),
    ).toBe(10);
    // Map curiosities round 2 (`pulp_wars-737.14`): every neutral unit is
    // worth its breed's bounty (a neutral FIGHTER is a Grunt, 3; a neutral
    // GUARD with 18 HP a Zombie, 5; a neutral RAIDER is Bigfoot, 12).
    expect(
      unitScoreValueV7(state, {
        id: unitId(9999),
        ownerId: 0 as PlayerId,
        role: "FIGHTER",
      }),
    ).toBe(3);
    expect(
      unitScoreValueV7(state, {
        id: unitId(9999),
        ownerId: 0 as PlayerId,
        role: "GUARD",
        maxHp: 18,
      }),
    ).toBe(5);
    expect(
      unitScoreValueV7(state, {
        id: unitId(9999),
        ownerId: 0 as PlayerId,
        role: "RAIDER",
      }),
    ).toBe(12);
    expect(
      unitScoreValueV7(state, {
        id: unitId(9999),
        ownerId: human,
        role: "FIGHTER",
      }),
    ).toBe(effectiveRoleRuleV7("FIGHTER", "ORIGINAL").cost);
  });

  it("starts the ledger at 0, flawless, with the starting score as the peak", () => {
    const setup = browserSetupV7(72);
    const game = createPlayableGameV7(setup);
    if (!game.ok) throw new Error(game.error.code);
    expect(game.state.scoreLedger).toHaveLength(game.state.players.length);
    for (const entry of game.state.scoreLedger)
      expect(entry).toMatchObject({
        killValue: 0,
        lossValue: 0,
        hpLost: 0,
        flawless: true,
        eliminatedBy: null,
        eliminatedAt: null,
        round30: null,
      });
    for (const entry of game.state.scoreLedger)
      expect(entry.peakScore).toBeGreaterThan(0);
  });
});

describe("score and modes: the counters of section 3.2", () => {
  it("credits a kill, a loss, and the HP of the victim (ATTACK)", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "FIGHTER", at: at(5, 4), hp: 1 },
      ],
    );
    const human = seatIdV7(state, 0);
    const rival = seatIdV7(state, 1);
    const attacker = unitAtV7(state, at(4, 4));
    const victim = unitAtV7(state, at(5, 4));
    const value = effectiveRoleRuleV7("FIGHTER", "UNDEAD").cost ?? 0;
    const after = applyOkV7(state, human, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: victim.id,
    }).state;
    const ledger = (id: PlayerId) =>
      after.scoreLedger.find((entry) => entry.playerId === id);
    expect(ledger(human)).toMatchObject({
      killValue: value,
      lossValue: 0,
      hpLost: 0,
      flawless: true,
    });
    expect(ledger(rival)).toMatchObject({
      killValue: 0,
      lossValue: value,
      hpLost: 1,
      flawless: false,
    });
    expect(scoreV7(after, human).kills).toEqual({
      count: value,
      points: 2 * value,
    });
  });

  it("counts the HP the attacker lost to retaliation without breaking flawless", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [
        { seat: 0, role: "FIGHTER", at: at(4, 4) },
        { seat: 1, role: "GUARD", at: at(5, 4) },
      ],
    );
    const human = seatIdV7(state, 0);
    const rival = seatIdV7(state, 1);
    const attacker = unitAtV7(state, at(4, 4));
    const defender = unitAtV7(state, at(5, 4));
    const result = applyOkV7(state, human, {
      kind: "ATTACK",
      unitId: attacker.id,
      targetUnitId: defender.id,
    });
    const hpOf = (s: GameStateV7, id: number) =>
      s.units.find((unit) => unit.id === id)?.hp ?? 0;
    const ledger = (id: PlayerId) =>
      result.state.scoreLedger.find((entry) => entry.playerId === id);
    expect(ledger(human)?.hpLost).toBe(
      attacker.hp - hpOf(result.state, attacker.id),
    );
    expect(ledger(rival)?.hpLost).toBe(
      defender.hp - hpOf(result.state, defender.id),
    );
    expect(ledger(human)?.flawless).toBe(hpOf(result.state, attacker.id) > 0);
  });

  it("matches Plunder credit and skips friendly fire (a Kaboom)", () => {
    // A Goblin Kaboom (6 damage since Goblin explosions, 7r61) next to a
    // Human Fighter at 3 HP, a Human Fighter at full HP, and an own Goblin
    // at 3 HP.
    const state = goblinArenaV7(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: at(0, 0) },
        { seat: 0, role: "FIGHTER", at: at(1, 1), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(1, 0), hp: 3 },
        { seat: 1, role: "FIGHTER", at: at(0, 1) },
      ],
    );
    const goblin = seatIdV7(state, 0);
    const human = seatIdV7(state, 1);
    const exploder = unitAtV7(state, at(0, 0));
    const { result, credits } = collectScoreCreditsV7(() =>
      applyCommandV7(state, goblin, { kind: "KABOOM", unitId: exploder.id }),
    );
    if (!result.accepted) throw new Error(result.error.code);
    // Both blast deaths are credited to the Goblin seat; the exploder
    // itself to nobody.
    expect(credits.map((credit) => credit.victimUnitId).sort()).toEqual(
      [unitAtV7(state, at(1, 1)).id, unitAtV7(state, at(1, 0)).id].sort(),
    );
    expect(credits.every((credit) => credit.creditedId === goblin)).toBe(true);
    const plunder = result.events.find(
      (event) => event.kind === "PLUNDER_AWARDED",
    );
    // Plunder and Kills count the same hostile credited death.
    expect(plunder).toMatchObject({ playerId: goblin, kills: 1 });
    const goblinValue = effectiveRoleRuleV7("FIGHTER", "GOBLIN").cost ?? 0;
    const humanValue = effectiveRoleRuleV7("FIGHTER", "ORIGINAL").cost ?? 0;
    const ledger = (id: PlayerId) =>
      result.state.scoreLedger.find((entry) => entry.playerId === id);
    expect(ledger(goblin)).toMatchObject({
      killValue: humanValue,
      // The Kaboom unit and the own Goblin died.
      lossValue: 2 * goblinValue,
      flawless: false,
    });
    expect(ledger(goblin)?.hpLost).toBe(exploder.hp + 3);
    expect(ledger(human)).toMatchObject({
      killValue: 0,
      lossValue: humanValue,
      hpLost: 3 + 6,
      flawless: false,
    });
  });

  it("credits Wail deaths to the Banshee's owner (section 18.9)", () => {
    const state = goblinArenaV7(
      ["UNDEAD", "ORIGINAL"],
      [
        { seat: 0, role: "MARKSMAN", at: at(2, 2) },
        { seat: 1, role: "FIGHTER", at: at(1, 1), hp: 1 },
        { seat: 1, role: "FIGHTER", at: at(3, 2), hp: 1 },
      ],
    );
    const undead = seatIdV7(state, 0);
    const result = applyOkV7(state, undead, {
      kind: "WAIL",
      unitId: unitAtV7(state, at(2, 2)).id,
    });
    expect(
      result.events.filter(
        (event) => event.kind === "UNIT_DIED" && event.cause === "WAIL",
      ),
    ).toHaveLength(2);
    expect(
      result.state.scoreLedger.find((entry) => entry.playerId === undead)
        ?.killValue,
    ).toBe(2 * (effectiveRoleRuleV7("FIGHTER", "ORIGINAL").cost ?? 0));
  });

  it("keeps eliminated players' counters and zeroes their land and army", () => {
    const state = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [{ seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true }],
    );
    const human = seatIdV7(state, 0);
    const rival = seatIdV7(state, 1);
    const capturer = unitAtV7(state, at(2, 8));
    const captured = applyOkV7(state, human, {
      kind: "CAPTURE",
      unitId: capturer.id,
    }).state;
    expect(captured.outcome).toEqual({ kind: "VICTORY", winnerId: human });
    const entry = captured.scoreLedger.find((item) => item.playerId === rival);
    expect(entry).toMatchObject({
      eliminatedBy: human,
      eliminatedAt: state.commandIndex,
      flawless: false,
    });
    const score = scoreV7(captured, rival);
    expect([
      score.territory.count,
      score.cities.count,
      score.army.count,
    ]).toEqual([0, 0, 0]);
    expect(score.technology.count).toBeGreaterThan(0);
  });
});

describe("score and modes: the ledger fold", () => {
  const base = goblinArenaV7(
    ["MARTIAN", "ORIGINAL", "UNDEAD"],
    [
      { seat: 0, role: "FIGHTER", at: at(4, 4) },
      { seat: 1, role: "FIGHTER", at: at(6, 6) },
      { seat: 1, role: "GUARD", at: at(7, 6) },
      { seat: 2, role: "FIGHTER", at: at(9, 9) },
    ],
  );
  const id = (seat: number) => seatIdV7(base, seat);
  const unit = (x: number, y: number) => unitAtV7(base, at(x, y));
  const entry = (
    ledger: readonly ScoreLedgerEntryV7[],
    seat: number,
  ): ScoreLedgerEntryV7 => {
    const found = ledger.find((item) => item.playerId === id(seat));
    if (found === undefined) throw new Error("missing entry");
    return found;
  };
  const fold = (
    events: readonly DomainEventV7[],
    credits: Parameters<typeof foldScoreLedgerV7>[3] = [],
    after: Pick<GameStateV7, "units" | "burrowed"> = base,
    state: GameStateV7 = base,
  ) => foldScoreLedgerV7(state, after, events, credits, state.scoreLedger);

  it("returns the same ledger when nothing happened", () => {
    expect(fold([])).toBe(base.scoreLedger);
  });

  it("does not count the removals as losses or damage", () => {
    for (const cause of ["ELIMINATION", "BRAIN_LOST"] as const) {
      const ledger = fold(
        [{ kind: "UNIT_DIED", unitId: unit(6, 6).id, cause }],
        [],
        {
          units: base.units.filter((item) => item.id !== unit(6, 6).id),
          burrowed: [],
        },
      );
      expect(entry(ledger, 1)).toMatchObject({
        lossValue: 0,
        hpLost: 0,
        flawless: false,
      });
    }
  });

  it("counts every other cause as a loss with its HP", () => {
    const victim = unit(6, 6);
    for (const cause of [
      "PLAGUE",
      "KABOOM",
      "CRUSHED",
      "CITY_CAPTURED",
      "ATTACK",
    ] as const) {
      const ledger = fold(
        [{ kind: "UNIT_DIED", unitId: victim.id, cause }],
        [],
        {
          units: base.units.filter((item) => item.id !== victim.id),
          burrowed: [],
        },
      );
      expect(entry(ledger, 1)).toMatchObject({
        lossValue: effectiveRoleRuleV7("FIGHTER", "ORIGINAL").cost,
        hpLost: victim.hp,
        flawless: false,
      });
      // An uncredited death is nobody's Kill.
      expect(entry(ledger, 0).killValue + entry(ledger, 2).killValue).toBe(0);
    }
  });

  it("skips control changes for Damage but breaks flawless", () => {
    const target = unit(6, 6);
    const controlled = base.units.map((item) =>
      item.id === target.id ? { ...item, ownerId: id(0), hp: 1 } : item,
    );
    const ledger = fold(
      [
        {
          kind: "UNIT_MIND_CONTROLLED",
          playerId: id(0),
          unitId: unit(4, 4).id,
          targetUnitId: target.id,
          targetOwnerId: id(1),
          targetRole: "FIGHTER",
          at: target.at,
          hp: 1,
        },
      ],
      [],
      { units: controlled, burrowed: [] },
    );
    expect(entry(ledger, 1)).toMatchObject({ hpLost: 0, flawless: false });
    expect(entry(ledger, 0)).toMatchObject({ hpLost: 0, flawless: true });
  });

  it("credits only hostile victims of a player: allies, own units, and the Monster's kills earn nothing", () => {
    const victim = unit(6, 6);
    const credit = (creditedId: PlayerId) => ({
      creditedId,
      victimOwnerId: id(1),
      victimUnitId: victim.id,
      value: 2,
    });
    const died: DomainEventV7[] = [
      { kind: "UNIT_DIED", unitId: victim.id, cause: "EXPLOSION" },
    ];
    expect(entry(fold(died, [credit(id(0))]), 0).killValue).toBe(2);
    // Friendly fire: the victim's own seat.
    expect(entry(fold(died, [credit(id(1))]), 1).killValue).toBe(0);
    // The Monster's kills credit no player.
    const monster = fold(died, [credit(0 as PlayerId)]);
    expect(monster.reduce((sum, item) => sum + item.killValue, 0)).toBe(0);
    // Cooperative mode: the AI seats are allies.
    const cooperative = checkedV7({
      ...base,
      setup: { ...base.setup, aiMode: "COOPERATIVE" },
    });
    expect(
      entry(fold(died, [credit(id(2))], cooperative, cooperative), 2).killValue,
    ).toBe(0);
    expect(entry(fold(died, [credit(id(2))], base, base), 2).killValue).toBe(2);
    // A unit dies once: a victim credited twice counts once, for the first.
    const twice = fold(died, [credit(id(0)), credit(id(2))]);
    expect(entry(twice, 0).killValue).toBe(2);
    expect(entry(twice, 2).killValue).toBe(0);
  });

  it("values a Monster victim at its bounty", () => {
    const ledger = fold(
      [{ kind: "UNIT_DIED", unitId: unitId(4242), cause: "ATTACK" }],
      [
        {
          creditedId: id(0),
          victimOwnerId: 0 as PlayerId,
          victimUnitId: unitId(4242),
          value: SCORE_MONSTER_VALUE_V7,
        },
      ],
    );
    expect(entry(ledger, 0).killValue).toBe(10);
  });

  it("clears flawless on every event that removes a unit or a city (the audit of section 5.4)", () => {
    expect([...FLAWLESS_BREAKING_EVENT_KINDS_V7].sort()).toEqual(
      [
        "CITY_CAPTURED",
        "SHIP_BOARDED",
        "UNIT_DIED",
        "UNIT_DISBANDED",
        "UNIT_MIND_CONTROLLED",
        "UNIT_RELEASED",
        "UNIT_SWALLOWED",
      ].sort(),
    );
    const victim = unit(6, 6);
    const loser = id(1);
    const events: Record<
      (typeof FLAWLESS_BREAKING_EVENT_KINDS_V7)[number],
      DomainEventV7
    > = {
      UNIT_DIED: { kind: "UNIT_DIED", unitId: victim.id, cause: "PLAGUE" },
      UNIT_DISBANDED: {
        kind: "UNIT_DISBANDED",
        playerId: loser,
        unitId: victim.id,
        role: "FIGHTER",
        coinDelta: 1,
      },
      UNIT_MIND_CONTROLLED: {
        kind: "UNIT_MIND_CONTROLLED",
        playerId: id(0),
        unitId: unit(4, 4).id,
        targetUnitId: victim.id,
        targetOwnerId: loser,
        targetRole: "FIGHTER",
        at: victim.at,
        hp: victim.hp,
      },
      SHIP_BOARDED: {
        kind: "SHIP_BOARDED",
        playerId: id(0),
        unitId: unit(4, 4).id,
        targetUnitId: victim.id,
        fromPlayerId: loser,
        at: victim.at,
        hp: victim.hp,
      },
      UNIT_RELEASED: {
        kind: "UNIT_RELEASED",
        unitId: victim.id,
        brainUnitId: unit(4, 4).id,
        fromPlayerId: loser,
        toPlayerId: id(2),
        at: victim.at,
      },
      CITY_CAPTURED: {
        kind: "CITY_CAPTURED",
        cityId: base.cities[0]?.id ?? (1 as never),
        from: loser,
        to: id(0),
      },
      UNIT_SWALLOWED: {
        kind: "UNIT_SWALLOWED",
        playerId: id(0),
        unitId: unit(4, 4).id,
        victimUnitId: victim.id,
        victimOwnerId: loser,
        role: "FIGHTER",
        hp: victim.hp,
      },
    };
    for (const kind of FLAWLESS_BREAKING_EVENT_KINDS_V7) {
      const ledger = fold([events[kind]]);
      expect(entry(ledger, 1).flawless, kind).toBe(false);
      expect(entry(ledger, 0).flawless, kind).toBe(true);
    }
    // Disbanding is not a loss (section 3.2).
    expect(entry(fold([events.UNIT_DISBANDED]), 1).lossValue).toBe(0);
  });

  it("records the captor of the last city as the eliminator", () => {
    const city = base.cities.find((item) => item.ownerId === id(2));
    if (city === undefined) throw new Error("no city");
    const ledger = fold([
      { kind: "CITY_CAPTURED", cityId: city.id, from: id(2), to: id(1) },
      { kind: "PLAYER_ELIMINATED", playerId: id(2) },
    ]);
    expect(entry(ledger, 2)).toMatchObject({
      eliminatedBy: id(1),
      eliminatedAt: base.commandIndex,
      flawless: false,
    });
  });
});

describe("score and modes: round ends and Perfection (sections 3.3 and 4.2)", () => {
  it("raises the peaks at each round end and stores the round-30 snapshot", () => {
    let state = created(browserSetupV7(73));
    // Ending turns changes no score in the End Turn steps, so the score
    // before the round's last END_TURN is the round-end score.
    let peaks = state.scoreLedger.map((entry) => entry.peakScore);
    while (state.round <= 3) {
      const before = state;
      state = endTurn(state).state;
      if (state.round !== before.round)
        peaks = scoresV7(before).map((entry, index) =>
          Math.max(entry.total, peaks[index] ?? 0),
        );
      expect(state.scoreLedger.map((entry) => entry.peakScore)).toEqual(peaks);
    }
    expect(state.scoreLedger.every((entry) => entry.round30 === null)).toBe(
      true,
    );
    // Domination: round 30 ends like any round, with the snapshot.
    const domination = endTurn(lastTurnOfRound30(state));
    expect(domination.state.outcome).toBeNull();
    expect(domination.state.round).toBe(31);
    for (const entry of domination.state.scoreLedger) {
      expect(entry.round30).not.toBeNull();
      expect(entry.round30?.peakScore).toBe(entry.peakScore);
    }
  });

  it("uses the score at the round end itself for the peak", () => {
    const state = lastTurnOfRound30(created(browserSetupV7(74)));
    // A peak far above the score stays; a peak below it is raised.
    const high = checkedV7({
      ...state,
      scoreLedger: state.scoreLedger.map((entry) => ({
        ...entry,
        peakScore: 5000,
      })),
    });
    const kept = endTurn(high).state;
    expect(kept.scoreLedger.map((entry) => entry.peakScore)).toEqual(
      state.scoreLedger.map(() => 5000),
    );
    expect(kept.scoreLedger.map((entry) => entry.round30?.peakScore)).toEqual(
      state.scoreLedger.map(() => 5000),
    );
    const low = checkedV7({
      ...state,
      scoreLedger: state.scoreLedger.map((entry) => ({
        ...entry,
        peakScore: 0,
      })),
    });
    const raised = endTurn(low).state;
    for (const entry of raised.scoreLedger)
      expect(entry.peakScore).toBe(entry.round30?.score);
  });

  it("ends a Perfection match at the round end of round 30 with nothing of round 31", () => {
    const state = lastTurnOfRound30(created(perfectionSetup(75)));
    const result = endTurn(state);
    expect(result.state.round).toBe(PERFECTION_ROUNDS_V7);
    expect(result.state.activeSeatIndex).toBe(state.activeSeatIndex);
    expect(result.events.map((event) => event.kind).slice(-2)).toEqual([
      "TURN_ENDED",
      "MATCH_ENDED",
    ]);
    expect(
      result.events.some(
        (event) =>
          event.kind === "TURN_STARTED" ||
          event.kind === "INCOME_AWARDED" ||
          event.kind === "NEUTRAL_TURN_STARTED",
      ),
    ).toBe(false);
    const outcome = result.state.outcome;
    if (outcome === null || outcome.kind === "HEADLESS_VICTORY")
      throw new Error("no outcome");
    expect(outcome.decidedBy).toBe("SCORE");
    const scores = scoresV7(result.state);
    expect(outcome.ranking).toEqual(scoreRankingV7(result.state, scores));
    const first = outcome.ranking?.[0];
    expect(
      outcome.kind === "VICTORY"
        ? outcome.winnerId
        : outcome.defeatedByPlayerId,
    ).toBe(first);
    for (const entry of result.state.scoreLedger)
      expect(entry.round30?.score).toBe(
        scores.find((item) => item.playerId === entry.playerId)?.total,
      );
    // The match is over: every command is refused.
    const after = applyCommandV7(result.state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    expect(after.accepted).toBe(false);
  });

  it("makes the highest score win and the outscored human lose", () => {
    const state = lastTurnOfRound30(created(perfectionSetup(76)));
    const human = state.humanPlayerId;
    const rival = state.players.find((player) => player.id !== human)?.id;
    if (rival === undefined) throw new Error("no rival");
    const boosted = (id: PlayerId) =>
      checkedV7({
        ...state,
        scoreLedger: state.scoreLedger.map((entry) =>
          entry.playerId === id ? { ...entry, killValue: 500 } : entry,
        ),
      });
    expect(endTurn(boosted(human)).state.outcome).toEqual({
      kind: "VICTORY",
      winnerId: human,
      decidedBy: "SCORE",
      ranking: [human, rival],
    });
    expect(endTurn(boosted(rival)).state.outcome).toEqual({
      kind: "DEFEAT",
      humanId: human,
      defeatedByPlayerId: rival,
      decidedBy: "SCORE",
      ranking: [rival, human],
    });
  });

  it("still ends early by elimination, with no score decision", () => {
    const base = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [{ seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true }],
    );
    const state = checkedV7({
      ...base,
      setup: { ...base.setup, gameMode: "PERFECTION" },
    });
    const human = seatIdV7(state, 0);
    const won = applyOkV7(state, human, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(2, 8)).id,
    }).state;
    expect(won.outcome).toEqual({ kind: "VICTORY", winnerId: human });
    const summary = matchSummaryV7(won);
    expect(summary?.decidedBy).toBe("ELIMINATION");
    expect(summary?.gradeInputs).toMatchObject({
      gameMode: "PERFECTION",
      victory: true,
      everyRivalEliminatedByYou: true,
    });
    expect(summary?.grade.conditions.everyRivalEliminatedByYou).toBeNull();
  });

  it("ranks by score, then cities, then territory, then turn order; eliminated players last", () => {
    const state = created(browserSetupV7(77, 3));
    const order = state.turnOrder;
    const [a, b, c, d] = order as [PlayerId, PlayerId, PlayerId, PlayerId];
    const score = (playerId: PlayerId, total: number, territory: number) => ({
      ...scoreV7(state, playerId),
      total,
      territory: { count: territory, points: territory * 2 },
    });
    // Every survivor tied on score and cities: territory, then turn order.
    expect(
      scoreRankingV7(state, [
        score(a, 100, 9),
        score(b, 100, 12),
        score(c, 100, 9),
        score(d, 100, 9),
      ]),
    ).toEqual([b, a, c, d]);
    // Score first.
    expect(
      scoreRankingV7(state, [
        score(a, 100, 9),
        score(b, 90, 30),
        score(c, 300, 9),
        score(d, 100, 9),
      ]),
    ).toEqual([c, a, d, b]);
    // More cities before territory.
    const capital = state.cities.find((city) => city.ownerId === d);
    if (capital === undefined) throw new Error("no capital");
    const twoCities = {
      ...state,
      cities: [
        ...state.cities,
        { ...capital, id: 9999 as never, at: at(0, 0) },
      ],
    };
    expect(
      scoreRankingV7(twoCities, [
        score(a, 100, 30),
        score(b, 100, 9),
        score(c, 100, 9),
        score(d, 100, 9),
      ]),
    ).toEqual([d, a, b, c]);
    // The later eliminated above the earlier, below every survivor.
    const eliminated = {
      ...state,
      players: state.players.map((player) =>
        player.id === a || player.id === b
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
      scoreLedger: state.scoreLedger.map((entry) =>
        entry.playerId === a
          ? { ...entry, eliminatedBy: c, eliminatedAt: 40 }
          : entry.playerId === b
            ? { ...entry, eliminatedBy: c, eliminatedAt: 90 }
            : entry,
      ),
    };
    expect(
      scoreRankingV7(eliminated, [
        score(a, 500, 0),
        score(b, 400, 0),
        score(c, 10, 9),
        score(d, 20, 9),
      ]),
    ).toEqual([d, c, b, a]);
  });
});

describe("score and modes: grade inputs from a finished match (section 5.1)", () => {
  it("rates against the rivals' peaks at the end before round 30", () => {
    // The rival has no technology: its final score (an achievement) is
    // below the peak, so the peak is the bar.
    const base = goblinArenaV7(
      ["ORIGINAL", "UNDEAD"],
      [{ seat: 0, role: "FIGHTER", at: at(2, 8), captureEligible: true }],
      { techs: { 1: [] } },
    );
    const human = seatIdV7(base, 0);
    const rival = seatIdV7(base, 1);
    const state = checkedV7({
      ...base,
      round: 12,
      scoreLedger: base.scoreLedger.map((entry) =>
        entry.playerId === rival ? { ...entry, peakScore: 77 } : entry,
      ),
    });
    const won = applyOkV7(state, human, {
      kind: "CAPTURE",
      unitId: unitAtV7(state, at(2, 8)).id,
    }).state;
    const inputs = starGradeInputsV7(won);
    expect(inputs).toMatchObject({
      gameMode: "DOMINATION",
      victory: true,
      rivals: 1,
      hardestDifficulty: true,
      bestRivalPeak: 77,
      ratingRound: 12,
      everyRivalEliminatedByYou: true,
      flawless: true,
      yourScore: scoreV7(won, human).total,
    });
  });

  it("rates the round-30 snapshot after round 30", () => {
    const state = created(browserSetupV7(78));
    const human = state.humanPlayerId;
    const rival = state.players.find((player) => player.id !== human)?.id;
    if (rival === undefined) throw new Error("no rival");
    const finished = checkedV7({
      ...state,
      round: 44,
      scoreLedger: state.scoreLedger.map((entry) => ({
        ...entry,
        flawless: false,
        peakScore: 999,
        round30:
          entry.playerId === human
            ? { score: 300, peakScore: 320 }
            : { score: 90, peakScore: 150 },
      })),
      outcome: { kind: "VICTORY", winnerId: human },
    });
    const inputs = starGradeInputsV7(finished);
    expect(inputs).toMatchObject({
      yourScore: 300,
      bestRivalPeak: 150,
      ratingRound: 30,
    });
    expect(starGradeV7(inputs).stars).toBe(2);
    expect(matchSummaryV7(finished)?.grade.rating.display).toBe("2.00");
  });
});

describe("score and modes: the view and the public queries (section 3.4)", () => {
  it("shows every total and only the viewer's breakdown while the match runs", () => {
    const state = created(browserSetupV7(79));
    const human = state.humanPlayerId;
    const view = viewForV7(state, human);
    const scores = scoresV7(state);
    for (const entry of view.leaderboard)
      expect(entry.score).toBe(
        scores.find((item) => item.playerId === entry.playerId)?.total,
      );
    expect(view.score.breakdowns.map((entry) => entry.playerId)).toEqual([
      human,
    ]);
    expect(view.score.summary).toBeNull();
    expect(view.score).toMatchObject({
      gameMode: "DOMINATION",
      roundLimit: null,
      roundsLeft: null,
    });
    const query = queryScoreV7(view);
    expect(query.own?.playerId).toBe(human);
    expect(query.totals.map((entry) => entry.playerId)).toEqual(
      view.leaderboard.map((entry) => entry.playerId),
    );
    expect(queryStarGradeV7(view)).toBeNull();
    const perfection = viewForV7(
      created(perfectionSetup(79)),
      created(perfectionSetup(79)).humanPlayerId,
    );
    expect(perfection.score).toMatchObject({
      gameMode: "PERFECTION",
      roundLimit: 30,
      roundsLeft: 29,
    });
  });

  it("shows every breakdown and the grade once the match is over", () => {
    const state = lastTurnOfRound30(created(perfectionSetup(80)));
    const over = endTurn(state).state;
    const view = viewForV7(over, over.humanPlayerId);
    expect(view.score.breakdowns).toHaveLength(over.players.length);
    const graded = queryStarGradeV7(view);
    expect(graded).not.toBeNull();
    expect(graded?.gameMode).toBe("PERFECTION");
    expect(graded?.faction).toBe("ORIGINAL");
    expect(graded?.recordable).toBe(true);
    expect(view.score.summary?.ranking).toEqual(
      over.outcome?.kind === "HEADLESS_VICTORY" ? [] : over.outcome?.ranking,
    );
    // The viewer's AI rival sees the same summary.
    const rival = over.players.find(
      (player) => player.id !== over.humanPlayerId,
    );
    if (rival === undefined) throw new Error("no rival");
    expect(canonicalJson(viewForV7(over, rival.id).score.summary)).toBe(
      canonicalJson(view.score.summary),
    );
  });
});

describe("score and modes: setup, saves, and replays (section 4.3)", () => {
  it("accepts both modes, reads a setup without the key as Domination, and keeps its shape", () => {
    const legacy = browserSetupV7(81);
    const parsed = validateMatchSetupV7(legacy);
    expect(parsed.ok && "gameMode" in parsed.setup).toBe(false);
    expect(gameModeOfV7(legacy)).toBe("DOMINATION");
    for (const gameMode of ["DOMINATION", "PERFECTION"] as const) {
      const result = validateMatchSetupV7({ ...legacy, gameMode });
      expect(result.ok && result.setup.gameMode).toBe(gameMode);
    }
    expect(validateMatchSetupV7({ ...legacy, gameMode: "GLORY" }).ok).toBe(
      false,
    );
    expect(validateMatchSetupV7({ ...legacy, gameMode: null }).ok).toBe(false);
  });

  it("keeps the Showcase and missions Domination only", () => {
    const showcase: MatchSetupV7 = {
      ...browserSetupV7(82),
      width: 16,
      height: 16,
      mapType: "SHOWCASE",
    };
    expect(validateMatchSetupV7(showcase).ok).toBe(true);
    expect(
      validateMatchSetupV7({ ...showcase, gameMode: "DOMINATION" }).ok,
    ).toBe(true);
    expect(
      validateMatchSetupV7({ ...showcase, gameMode: "PERFECTION" }).ok,
    ).toBe(false);
  });

  it("round-trips states of both modes and loads a state without a ledger", () => {
    for (const setup of [browserSetupV7(83), perfectionSetup(83)]) {
      const state = endTurn(created(setup)).state;
      const copy = parseGameStateV7(JSON.parse(JSON.stringify(state)));
      expect(copy).not.toBeNull();
      expect(canonicalJson(copy)).toBe(canonicalJson(state));
      expect(gameModeOfV7(copy?.setup ?? setup)).toBe(
        setup.gameMode ?? "DOMINATION",
      );
    }
    const state = created(browserSetupV7(84));
    const { scoreLedger: _ledger, ...older } = structuredClone(state);
    void _ledger;
    const loaded = parseGameStateV7(older);
    expect(loaded?.scoreLedger.map((entry) => entry.flawless)).toEqual(
      state.players.map(() => false),
    );
    expect(loaded?.scoreLedger.map((entry) => entry.peakScore)).toEqual(
      scoresV7(state).map((entry) => entry.total),
    );
    // A malformed ledger is refused.
    expect(
      parseGameStateV7({
        ...structuredClone(state),
        scoreLedger: state.scoreLedger.slice(1),
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...structuredClone(state),
        scoreLedger: state.scoreLedger.map((entry) => ({
          ...entry,
          killValue: -1,
        })),
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...structuredClone(state),
        scoreLedger: state.scoreLedger.map((entry) => ({
          ...entry,
          eliminatedBy: playerId(99),
          eliminatedAt: 3,
        })),
      }),
    ).toBeNull();
  });

  it("round-trips a score-decided outcome and refuses a broken ranking", () => {
    const over = endTurn(lastTurnOfRound30(created(perfectionSetup(85)))).state;
    expect(canonicalJson(parseGameStateV7(structuredClone(over)))).toBe(
      canonicalJson(over),
    );
    const outcome = over.outcome;
    if (outcome === null || outcome.kind === "HEADLESS_VICTORY")
      throw new Error("no outcome");
    const broken = (patch: object) =>
      parseGameStateV7({
        ...structuredClone(over),
        outcome: { ...outcome, ...patch },
      });
    expect(
      broken({ ranking: [...(outcome.ranking ?? [])].reverse() }),
    ).toBeNull();
    expect(broken({ ranking: outcome.ranking?.slice(0, 1) })).toBeNull();
    expect(broken({ decidedBy: "ELIMINATION" })).toBeNull();
    const { decidedBy: _decided, ...noDecision } = outcome;
    void _decided;
    expect(
      parseGameStateV7({ ...structuredClone(over), outcome: noDecision }),
    ).toBeNull();
  });

  it("round-trips saves of both modes and replays their scores", () => {
    for (const setup of [browserSetupV7(86), perfectionSetup(86)]) {
      let state = created(setup);
      let replay = createReplayV7(setup);
      for (let step = 0; step < 4; step += 1) {
        const actor = state.turnOrder[state.activeSeatIndex];
        if (actor === undefined) throw new Error("no active seat");
        const result = applyCommandV7(state, actor, { kind: "END_TURN" });
        if (!result.accepted) throw new Error(result.error.code);
        state = result.state;
        replay = appendReplayCommandV7(replay, { kind: "END_TURN" }, state);
      }
      const save = createSaveEnvelopeV7(
        { state, replay },
        "2026-10-09T12:00:00.000Z",
      );
      const loaded = parseSaveV7(JSON.stringify(save));
      expect(loaded.kind).toBe("VALID");
      if (loaded.kind !== "VALID") return;
      expect(canonicalJson(loaded.save.state)).toBe(canonicalJson(state));
      expect(loaded.save.setup.gameMode).toBe(setup.gameMode);
      const replayed = runReplayV7(JSON.parse(JSON.stringify(replay)));
      expect(canonicalJson(scoresV7(replayed.state))).toBe(
        canonicalJson(scoresV7(state)),
      );
      expect(canonicalJson(replayed.state.scoreLedger)).toBe(
        canonicalJson(state.scoreLedger),
      );
    }
  });
});

describe("score and modes: the Normal AI in Perfection (section 4.2)", () => {
  // The user, 2026-10-09: the AI never plays for score and there is no
  // Perfection AI; in every mode the Normal AI builds and conquers as in
  // Domination, and it stays legal at the round-30 end. One AI turn of a
  // hand-built position, no match.
  it("decides as in Domination and ends round 30 legally, which ends the match", () => {
    const state = [71, 72, 73, 74, 75, 76, 77, 78]
      .map((seed) => lastTurnOfRound30(created(perfectionSetup(seed))))
      .find(
        (candidate) =>
          candidate.turnOrder[candidate.activeSeatIndex] !==
          candidate.humanPlayerId,
      );
    if (state === undefined) throw new Error("no seed with an AI seat last");
    const actor = state.turnOrder[state.activeSeatIndex];
    if (actor === undefined) throw new Error("no active seat");
    const { gameMode: _mode, ...dominationSetup } = state.setup;
    void _mode;
    const domination = checkedV7({ ...state, setup: dominationSetup });
    const decide = (position: GameStateV7) => {
      const decision = chooseNormalCommandV7(viewForV7(position, actor));
      return {
        command: decision.command,
        candidates: decision.candidates.map((candidate) => candidate.command),
      };
    };
    expect(decide(state)).toEqual(decide(domination));
    let current = state;
    for (let count = 0; current.outcome === null; count += 1) {
      expect(count).toBeLessThan(NORMAL_AI_MAX_ACCEPTED_COMMANDS_PER_TURN_V7);
      const command = chooseNormalTurnCommandV7(
        viewForV7(current, actor),
        count,
      );
      if (command === null) throw new Error("the AI offered no command");
      const result = applyCommandV7(current, actor, command);
      expect(result.accepted).toBe(true);
      if (!result.accepted) return;
      current = result.state;
    }
    expect(current.round).toBe(PERFECTION_ROUNDS_V7);
    const outcome = current.outcome;
    expect(
      outcome !== null && outcome.kind !== "HEADLESS_VICTORY"
        ? outcome.decidedBy
        : null,
    ).toBe("SCORE");
  });
});

describe("score and modes: kills of the giants and the Dwarves (section 3.2)", () => {
  // Hand-built positions (tests/fixtures/v7-revision20.ts and v7-dwarf.ts:
  // seat 0 acts). Every credited death reaches the ledger exactly once.
  const ledgerOf = (state: GameStateV7, seat: number) => {
    const found = state.scoreLedger.find(
      (item) => item.playerId === seatIdV7(state, seat),
    );
    if (found === undefined) throw new Error("missing entry");
    return found;
  };
  const valueAt = (state: GameStateV7, x: number, y: number) =>
    unitScoreValueV7(state, unitAtV7(state, at(x, y)));

  it("credits a Whirl kill to the Whirligig's owner, once", () => {
    const state = dwarfFieldV7([
      { seat: 0, role: "KNIGHT", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 3 },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    const value = valueAt(state, 4, 2);
    const guard = unitAtV7(state, at(5, 2));
    const run = applyOkV7(state, activeIdV7(state), {
      kind: "WHIRL",
      unitId: unitAtV7(state, at(5, 3)).id,
    });
    const after = run.state.units.find((unit) => unit.id === guard.id);
    expect(after).toBeDefined();
    expect(ledgerOf(run.state, 0)).toMatchObject({
      killValue: value,
      lossValue: 0,
      hpLost: 0,
      flawless: true,
    });
    expect(ledgerOf(run.state, 1)).toMatchObject({
      killValue: 0,
      lossValue: value,
      hpLost: 3 + guard.hp - (after?.hp ?? 0),
      flawless: false,
    });
  });

  it("credits a Thunder Stomp kill to the Brontosaurus's owner, once", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(6, 4), hp: 2 },
      ],
      { factions: ["DINOSAUR", "ORIGINAL"] },
    );
    const value = valueAt(state, 6, 4);
    const run = applyOkV7(state, activeIdV7(state), {
      kind: "STOMP",
      unitId: unitAtV7(state, at(5, 3)).id,
    });
    expect(run.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: unitAtV7(state, at(6, 4)).id,
      cause: "STOMP",
    });
    expect(ledgerOf(run.state, 0)).toMatchObject({
      killValue: value,
      lossValue: 0,
    });
    expect(ledgerOf(run.state, 1)).toMatchObject({
      lossValue: value,
      hpLost: 2,
      flawless: false,
    });
  });

  it("follows a swallowed unit: no loss when swallowed, a kill and a loss when digested", () => {
    const start = fieldV7(
      [
        { seat: 0, role: "JUGGERNAUT", at: at(5, 3), hp: 30 },
        { seat: 1, role: "KNIGHT", at: at(6, 3), hp: 9 },
      ],
      { factions: ["UNDEAD", "ORIGINAL"] },
    );
    const value = valueAt(start, 6, 3);
    const undead = seatIdV7(start, 0);
    let state = applyOkV7(start, undead, {
      kind: "SWALLOW",
      unitId: unitAtV7(start, at(5, 3)).id,
      targetUnitId: unitAtV7(start, at(6, 3)).id,
    }).state;
    // Swallowed: not a death, but no longer the owner's to command.
    expect(ledgerOf(state, 1)).toMatchObject({
      lossValue: 0,
      hpLost: 0,
      flawless: false,
    });
    expect(scoreV7(state, seatIdV7(state, 1)).army.count).toBe(
      scoreV7(start, seatIdV7(start, 1)).army.count - value,
    );
    // Digested at the holder's Start Turns, 4 HP a turn: 9, 5, 1, dead.
    for (let turn = 0; turn < 3; turn += 1)
      state = endTurnUntilV7(state, undead).state;
    expect(state.giants.swallowed).toEqual([]);
    expect(ledgerOf(state, 0)).toMatchObject({ killValue: value });
    expect(ledgerOf(state, 1)).toMatchObject({
      lossValue: value,
      hpLost: 9,
    });
  });

  it("gives no kill or loss for a Barricade, which is not a unit", () => {
    const base = dwarfFieldV7(
      [
        { seat: 1, role: "FIGHTER", at: at(4, 4) },
        { seat: 0, role: "FIGHTER", at: at(1, 1) },
      ],
      { activeSeat: 1 },
    );
    const state = checkedV7({
      ...base,
      barricades: [{ at: at(4, 3), ownerId: seatIdV7(base, 0), hp: 1 }],
    });
    const run = applyOkV7(state, activeIdV7(state), {
      kind: "ATTACK_BARRICADE",
      unitId: unitAtV7(state, at(4, 4)).id,
      at: at(4, 3),
    });
    expect(run.state.barricades).toEqual([]);
    expect(run.state.scoreLedger).toEqual(state.scoreLedger);
  });
});
