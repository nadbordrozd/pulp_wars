import { afterEach, describe, expect, it } from "vitest";
import { chooseNormalTurnCommandV7 } from "../../src/ai/v7";
import {
  BOUNCE_COST_V7,
  CANDY_EARLY_RESEARCH_PRIORITY_V7,
  CANDY_FIRST_OF_ROLE_BIAS_V7,
  CANDY_RESEARCH_PRIORITY_V7,
  CRASHED_TARGET_VALUE_V7,
  CRASH_RETREAT_PRIORITY_V7,
  CRUMBS_EAT_OBJECTIVE_V7,
  DEFAULT_CANDY_POLICY_OPTIONS_V7,
  NO_CANDY_POLICY_OPTIONS_V7,
  PIE_FIRST_OFFSET_V7,
  REBAKE_APPROACH_PRIORITY_V7,
  REBAKE_PRIORITY_V7,
  RUSH_KILL_PRIORITY_V7,
  RUSH_MOVE_PRIORITY_V7,
  SUGAR_TOSS_IDLE_PRIORITY_V7,
  SUGAR_TOSS_PRIORITY_V7,
  THREATENED_CANDY_SUPPORT_COST_V7,
  THREATENED_GUMDROP_BIAS_V7,
  candyArmyCountsV7,
  candyMatchForPolicyV7,
  candyPolicyOptionsV7,
  candyProductionAdjustmentV7,
  candyResearchV7,
  setCandyPolicyOptionsV7,
} from "../../src/ai/v7-candy";
import {
  TECHNOLOGY_IDS_V7,
  applyCommandV7,
  queryCombatPreviewV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
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
  scoreV7,
  unitCandidatesV7,
  unitIdAtV7,
  viewerViewV7,
} from "../fixtures/v7-dinosaur-ai";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import { fieldV7 } from "../fixtures/v7-revision20";

// The Candy Normal AI (`pulp_wars-jdb.4`, docs/product/RULESET_7_CANDY.md
// sections 14 and 18). The field: an 11 x 11 board, seat 0 (the viewer)
// capital (8, 8) with territory x 7-9, y 7-9; seat 1 capital (2, 8) with
// territory x 1-3, y 7-9; villages (5, 5), (8, 5), (5, 8); every other land
// tile Grass; every tile explored; every technology and 100 Coins unless
// stated.

const at = (x: number, y: number): CoordV7 => ({ x, y });
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

/** Seat 0 Candy (the viewer) against seat 1 Human. */
const asCandy = (
  pieces: readonly CandyPieceV7[],
  options: CandyFieldOptionsV7 = {},
): GameStateV7 => candyFieldV7(pieces, options);
/** Seat 0 Human (the viewer) against seat 1 Candy. */
const againstCandy = (
  pieces: readonly CandyPieceV7[],
  options: CandyFieldOptionsV7 = {},
): GameStateV7 =>
  candyFieldV7(pieces, { ...options, factions: ["ORIGINAL", "CANDY"] });

const chebyshev = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));
const endOf = (command: CommandV7): CoordV7 | undefined =>
  command.kind === "MOVE" ? command.path.at(-1) : undefined;

afterEach(() => {
  setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
});

/**
 * The HP of the target on `target` at which the unit on `from` kills it
 * Rushed and not plain (the highest such HP).
 */
function rushOnlyHp(
  build: (hp: number) => GameStateV7,
  from: CoordV7,
  target: CoordV7,
  maxHp: number,
): number {
  for (let hp = maxHp; hp >= 1; hp -= 1) {
    const state = build(hp);
    const view = viewerViewV7(state);
    const ids = [unitIdAtV7(state, from), unitIdAtV7(state, target)] as const;
    const plain = queryCombatPreviewV7(view, ids[0], ids[1]);
    const rushed = queryCombatPreviewV7(view, ids[0], ids[1], {
      assumeSugarRush: true,
    });
    if (plain?.defenderDies === false && rushed?.defenderDies === true)
      return hp;
  }
  throw new Error("no HP at which only the Rush kills");
}

/** Plays the viewer's turn with the policy; returns the state before End Turn. */
function playTurn(start: GameStateV7): {
  readonly state: GameStateV7;
  readonly commands: readonly CommandV7[];
} {
  let state = start;
  const commands: CommandV7[] = [];
  const viewer = state.humanPlayerId;
  for (let index = 0; index < 128; index += 1) {
    const command = chooseNormalTurnCommandV7(viewForV7(state, viewer), index);
    if (command === null || command.kind === "END_TURN") break;
    const applied = applyCommandV7(state, viewer, command);
    if (!applied.accepted) throw new Error(`rejected ${command.kind}`);
    state = applied.state;
    commands.push(command);
  }
  return { state, commands };
}

describe("Candy Normal AI: the gate and the switch", () => {
  it("is off in a match without a Candy seat", () => {
    const human = fieldV7(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(1, 1) },
      ],
      { factions: ["ORIGINAL", "DINOSAUR"] },
    );
    expect(candyMatchForPolicyV7(viewerViewV7(human))).toBe(false);
    expect(
      candyMatchForPolicyV7(
        viewerViewV7(asCandy([own("FIGHTER", 5, 3), foe("FIGHTER", 1, 1)])),
      ),
    ).toBe(true);
  });

  it("ships with every group on", () => {
    expect(candyPolicyOptionsV7()).toEqual(DEFAULT_CANDY_POLICY_OPTIONS_V7);
    for (const value of Object.values(DEFAULT_CANDY_POLICY_OPTIONS_V7))
      expect(value).toBe(true);
    for (const value of Object.values(NO_CANDY_POLICY_OPTIONS_V7))
      expect(value).toBe(false);
  });

  it("asks for no Candy command with the groups switched off", () => {
    const build = (hp: number) =>
      asCandy([own("FIGHTER", 5, 3), foe("FIGHTER", 5, 2, { hp })]);
    const state = build(rushOnlyHp(build, at(5, 3), at(5, 2), 10));
    expect(unitCandidatesV7(state, at(5, 3), "SUGAR_RUSH")).toHaveLength(1);
    setCandyPolicyOptionsV7(NO_CANDY_POLICY_OPTIONS_V7);
    expect(
      candidatesV7(state).filter(
        (candidate) =>
          candidate.command.kind === "SUGAR_RUSH" ||
          candidate.command.kind === "REBAKE" ||
          candidate.command.kind === "SUGAR_TOSS",
      ),
    ).toEqual([]);
  });
});

describe("Candy Normal AI: Sugar Rush", () => {
  it("Rushes a Gumdrop for a kill it could not make plain", () => {
    const build = (hp: number) =>
      asCandy([own("FIGHTER", 5, 3), foe("FIGHTER", 5, 2, { hp })]);
    const hp = rushOnlyHp(build, at(5, 3), at(5, 2), 10);
    const state = build(hp);
    const rush = unitCandidatesV7(state, at(5, 3), "SUGAR_RUSH");
    expect(rush).toHaveLength(1);
    expect(rush[0]?.score.priority).toBe(RUSH_KILL_PRIORITY_V7);
    // The plain attack already kills a weaker Fighter: no Rush.
    expect(unitCandidatesV7(build(1), at(5, 3), "SUGAR_RUSH")).toHaveLength(0);
    // The turn: the Rush, then the kill.
    const turn = playTurn(state);
    const kinds = turn.commands
      .filter(
        (command) =>
          "unitId" in command && command.unitId === unitIdAtV7(state, at(5, 3)),
      )
      .map((command) => command.kind);
    expect(kinds.slice(0, 2)).toEqual(["SUGAR_RUSH", "ATTACK"]);
    expect(
      turn.state.units.some((unit) => unit.id === unitIdAtV7(state, at(5, 2))),
    ).toBe(false);
  });

  it("Rushes, moves in, and kills a target out of its plain reach", () => {
    // Two tiles away: the plain Move ends next to it, and so does the Rushed
    // one, but only the Rushed attack kills.
    const build = (hp: number) =>
      asCandy([own("FIGHTER", 5, 3), foe("FIGHTER", 5, 2, { hp })]);
    const hp = rushOnlyHp(build, at(5, 3), at(5, 2), 10);
    const state = asCandy([own("FIGHTER", 5, 4), foe("FIGHTER", 5, 2, { hp })]);
    const gumdrop = unitIdAtV7(state, at(5, 4));
    expect(unitCandidatesV7(state, at(5, 4), "SUGAR_RUSH")).toHaveLength(1);
    const rushed = applyCommandV7(state, state.humanPlayerId, {
      kind: "SUGAR_RUSH",
      unitId: gumdrop,
    });
    expect(rushed.accepted).toBe(true);
    if (!rushed.accepted) return;
    const moves = unitCandidatesV7(rushed.state, at(5, 4), "MOVE");
    const planned = moves.filter(
      (candidate) => candidate.score.priority === RUSH_MOVE_PRIORITY_V7,
    );
    expect(planned).toHaveLength(1);
    const end =
      planned[0] === undefined ? undefined : endOf(planned[0].command);
    expect(end === undefined ? 0 : chebyshev(end, at(5, 2))).toBe(1);
    const turn = playTurn(state);
    expect(
      turn.state.units.some((unit) => unit.id === unitIdAtV7(state, at(5, 2))),
    ).toBe(false);
    expect(turn.state.sugarRush).toEqual([
      { unitId: gumdrop, phase: "RUSHED" },
    ]);
  });

  it("does not Rush into lethal reach for a kill that is not a key role", () => {
    const pieces = (hp: number, role: UnitRoleIdV7): CandyPieceV7[] => [
      own("FIGHTER", 5, 3),
      foe(role, 5, 2, { hp }),
      // Full Fighters: a Rushed Gumdrop does not kill them, and three of
      // them kill it on the target's tile.
      foe("FIGHTER", 4, 1),
      foe("FIGHTER", 6, 1),
      foe("FIGHTER", 5, 1),
    ];
    const fighter = (hp: number) => asCandy(pieces(hp, "FIGHTER"));
    const lethal = fighter(rushOnlyHp(fighter, at(5, 3), at(5, 2), 10));
    expect(unitCandidatesV7(lethal, at(5, 3), "SUGAR_RUSH")).toHaveLength(0);
    // The same kill with no one behind the target is taken.
    const alone = (hp: number) =>
      asCandy([own("FIGHTER", 5, 3), foe("FIGHTER", 5, 2, { hp })]);
    expect(
      unitCandidatesV7(
        alone(rushOnlyHp(alone, at(5, 3), at(5, 2), 10)),
        at(5, 3),
        "SUGAR_RUSH",
      ),
    ).toHaveLength(1);
    // A Captain is worth the unit.
    const captain = (hp: number) => asCandy(pieces(hp, "CAPTAIN"));
    expect(
      unitCandidatesV7(
        captain(rushOnlyHp(captain, at(5, 3), at(5, 2), 10)),
        at(5, 3),
        "SUGAR_RUSH",
      ),
    ).toHaveLength(1);
  });

  it("Rushes a Gummy Bear only for a Sugar Frenzy continuation or a key kill", () => {
    const lone = (hp: number) =>
      asCandy([own("KNIGHT", 5, 3), foe("FIGHTER", 5, 2, { hp })]);
    const hp = rushOnlyHp(lone, at(5, 3), at(5, 2), 10);
    expect(unitCandidatesV7(lone(hp), at(5, 3), "SUGAR_RUSH")).toHaveLength(0);
    // A second target next to the first one's tile: the Frenzy continues.
    const pair = asCandy([
      own("KNIGHT", 5, 3),
      foe("FIGHTER", 5, 2, { hp }),
      foe("MARKSMAN", 5, 1, { hp: 2 }),
    ]);
    expect(unitCandidatesV7(pair, at(5, 3), "SUGAR_RUSH")).toHaveLength(1);
    // A lone Knight is a key kill (a wounded Bear needs the Rush for it).
    const knight = (knightHp: number) =>
      asCandy([
        own("KNIGHT", 5, 3, { hp: 7 }),
        foe("KNIGHT", 5, 2, { hp: knightHp }),
      ]);
    expect(
      unitCandidatesV7(
        knight(rushOnlyHp(knight, at(5, 3), at(5, 2), 10)),
        at(5, 3),
        "SUGAR_RUSH",
      ),
    ).toHaveLength(1);
  });

  it("moves a Crashed unit out of a melee unit's reach", () => {
    // A Guard cannot attack after moving: two tiles away is out of reach.
    const state = asCandy([
      own("FIGHTER", 5, 3, { rush: "CRASHED" }),
      foe("GUARD", 5, 2),
    ]);
    const moves = unitCandidatesV7(state, at(5, 3), "MOVE");
    expect(moves.length).toBeGreaterThan(0);
    for (const candidate of moves) {
      expect(candidate.score.priority).toBe(CRASH_RETREAT_PRIORITY_V7);
      const end = endOf(candidate.command);
      expect(end === undefined ? 0 : chebyshev(end, at(5, 2))).toBeGreaterThan(
        1,
      );
    }
    // The unit's best command is the step back (it cannot attack).
    expect(unitCandidatesV7(state, at(5, 3))[0]?.command.kind).toBe("MOVE");
    // Without the rule it has no such Move.
    setCandyPolicyOptionsV7({ crashRetreat: false });
    expect(
      unitCandidatesV7(state, at(5, 3), "MOVE").every(
        (candidate) => candidate.score.priority < CRASH_RETREAT_PRIORITY_V7,
      ),
    ).toBe(true);
    setCandyPolicyOptionsV7(DEFAULT_CANDY_POLICY_OPTIONS_V7);
    // A Fighter reaches every tile the unit can step to: it holds.
    const held = asCandy([
      own("FIGHTER", 5, 3, { rush: "CRASHED" }),
      foe("FIGHTER", 5, 2),
    ]);
    expect(unitCandidatesV7(held, at(5, 3), "MOVE")).toHaveLength(0);
  });
});

describe("Candy Normal AI: Re-bake, Splat, and Sugar Toss", () => {
  it("walks a Confectioner to Gummy Bear Crumbs and Re-bakes", () => {
    const state = asCandy([own("CAPTAIN", 6, 5), foe("FIGHTER", 1, 1)], {
      crumbs: [
        { at: at(6, 3), role: "KNIGHT" },
        { at: at(4, 5), role: "FIGHTER" },
      ],
    });
    const confectioner = unitIdAtV7(state, at(6, 5));
    const approach = unitCandidatesV7(state, at(6, 5), "MOVE").filter(
      (candidate) => candidate.score.priority === REBAKE_APPROACH_PRIORITY_V7,
    );
    expect(approach.length).toBeGreaterThan(0);
    // The dearest Crumbs: every approach tile is next to the Bear's.
    for (const candidate of approach) {
      const end = endOf(candidate.command);
      expect(end === undefined ? 0 : chebyshev(end, at(6, 3))).toBe(1);
    }
    const turn = playTurn(state);
    const kinds = turn.commands
      .filter(
        (command) => "unitId" in command && command.unitId === confectioner,
      )
      .map((command) => command.kind);
    expect(kinds).toEqual(["MOVE", "REBAKE"]);
    const bear = unitAtV7(turn.state, at(6, 3));
    expect(bear).toMatchObject({ role: "KNIGHT", hp: 7 });
    expect(turn.state.crumbs.map((entry) => entry.role)).toEqual(["FIGHTER"]);
  });

  it("steps toward Crumbs three tiles away only while they last", () => {
    const far = (turnsLeft: 1 | 2 | 3) =>
      asCandy([own("CAPTAIN", 6, 6), foe("FIGHTER", 1, 1)], {
        crumbs: [{ at: at(6, 3), role: "KNIGHT", turnsLeft }],
      });
    const approach = unitCandidatesV7(far(3), at(6, 6), "MOVE").filter(
      (candidate) => candidate.score.priority === REBAKE_APPROACH_PRIORITY_V7,
    );
    expect(approach.length).toBeGreaterThan(0);
    for (const candidate of approach) {
      const end = endOf(candidate.command);
      expect(end === undefined ? 0 : chebyshev(end, at(6, 3))).toBe(2);
    }
    // Stale after this turn: not worth the walk.
    expect(
      unitCandidatesV7(far(1), at(6, 6), "MOVE").filter(
        (candidate) => candidate.score.priority === REBAKE_APPROACH_PRIORITY_V7,
      ),
    ).toHaveLength(0);
  });

  it("scores the one best Re-bake and never a fragile one", () => {
    const safe = asCandy([own("CAPTAIN", 6, 4), foe("FIGHTER", 1, 1)], {
      crumbs: [
        { at: at(6, 3), role: "KNIGHT" },
        { at: at(5, 4), role: "FIGHTER" },
      ],
    });
    const rebakes = unitCandidatesV7(safe, at(6, 4), "REBAKE");
    expect(rebakes).toHaveLength(1);
    expect(rebakes[0]?.score.priority).toBe(REBAKE_PRIORITY_V7);
    expect(rebakes[0]?.command).toMatchObject({ at: at(6, 3) });
    // A 5-HP Gumdrop beside two Knights is a free kill for them.
    const fragile = asCandy(
      [own("CAPTAIN", 6, 4), foe("KNIGHT", 6, 2), foe("KNIGHT", 5, 2)],
      { crumbs: [{ at: at(6, 3), role: "FIGHTER" }] },
    );
    expect(unitCandidatesV7(fragile, at(6, 4), "REBAKE")).toHaveLength(0);
  });

  it("shoots the Pie before the melee attack on the same target", () => {
    const state = asCandy([
      own("CATAPULT", 5, 5),
      own("FIGHTER", 5, 3),
      foe("GUARD", 5, 2),
    ]);
    const pie = scoreV7(state, attackV7(state, at(5, 5), at(5, 2)));
    const melee = scoreV7(state, attackV7(state, at(5, 3), at(5, 2)));
    expect(pie.priority).toBe(melee.priority + PIE_FIRST_OFFSET_V7);
    const turn = playTurn(state);
    const attackers = turn.commands.flatMap((command) =>
      command.kind === "ATTACK" ? [command.unitId] : [],
    );
    expect(attackers[0]).toBe(unitIdAtV7(state, at(5, 5)));
    // Alone, the Pie's chip has the ordinary tier.
    const alone = asCandy([own("CATAPULT", 5, 5), foe("GUARD", 5, 2)]);
    expect(scoreV7(alone, attackV7(alone, at(5, 5), at(5, 2))).priority).toBe(
      melee.priority,
    );
  });

  it("Tosses when the Gunner's shot is weak, at the dearest wounded unit", () => {
    const weak = asCandy([
      own("MARKSMAN", 5, 4, { hp: 6 }),
      own("GUARD", 4, 3, { hp: 9 }),
      own("FIGHTER", 6, 3, { hp: 2 }),
      foe("JUGGERNAUT", 5, 2),
    ]);
    const gunner = unitIdAtV7(weak, at(5, 4));
    const shot = queryCombatPreviewV7(
      viewerViewV7(weak),
      gunner,
      unitIdAtV7(weak, at(5, 2)),
    );
    expect(shot?.damageToDefender).toBeLessThan(3);
    const tosses = unitCandidatesV7(weak, at(5, 4), "SUGAR_TOSS");
    expect(tosses).toHaveLength(1);
    expect(tosses[0]?.score.priority).toBe(SUGAR_TOSS_PRIORITY_V7);
    expect(tosses[0]?.command).toMatchObject({
      targetUnitId: unitIdAtV7(weak, at(4, 3)),
    });
    expect(unitCandidatesV7(weak, at(5, 4))[0]?.command.kind).toBe(
      "SUGAR_TOSS",
    );
    // A shot that kills is taken instead.
    const strong = asCandy([
      own("MARKSMAN", 5, 4),
      own("GUARD", 4, 3, { hp: 9 }),
      foe("FIGHTER", 5, 2, { hp: 1 }),
    ]);
    expect(unitCandidatesV7(strong, at(5, 4), "SUGAR_TOSS")).toHaveLength(0);
    // With no attack offered the Toss waits for the Moves.
    const idle = asCandy([
      own("MARKSMAN", 5, 4),
      own("GUARD", 4, 3, { hp: 9 }),
      foe("FIGHTER", 1, 1),
    ]);
    expect(
      unitCandidatesV7(idle, at(5, 4), "SUGAR_TOSS")[0]?.score.priority,
    ).toBe(SUGAR_TOSS_IDLE_PRIORITY_V7);
  });
});

describe("Candy Normal AI: production and research", () => {
  it("values the first of each role and bodies under threat", () => {
    const view = viewerViewV7(
      asCandy([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)]),
    );
    const counts = candyArmyCountsV7(view);
    for (const role of [
      "GUARD",
      "MARKSMAN",
      "CAPTAIN",
      "CATAPULT",
      "KNIGHT",
    ] as const)
      expect(candyProductionAdjustmentV7(view, role, counts, false)).toBe(
        CANDY_FIRST_OF_ROLE_BIAS_V7,
      );
    expect(candyProductionAdjustmentV7(view, "FIGHTER", counts, true)).toBe(
      THREATENED_GUMDROP_BIAS_V7,
    );
    for (const role of ["CAPTAIN", "CATAPULT"] as const)
      expect(candyProductionAdjustmentV7(view, role, counts, true)).toBe(
        -THREATENED_CANDY_SUPPORT_COST_V7,
      );
    // Gated: 0 for any other faction.
    const human = viewerViewV7(
      againstCandy([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)]),
    );
    expect(
      candyProductionAdjustmentV7(
        human,
        "GUARD",
        candyArmyCountsV7(human),
        false,
      ),
    ).toBe(0);
  });

  it("researches toward its roles", () => {
    const fresh = (techs: readonly (typeof TECHNOLOGY_IDS_V7)[number][]) =>
      viewerViewV7(
        asCandy([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)], {
          techs: { 0: techs, 1: TECHNOLOGY_IDS_V7 },
        }),
      );
    const facts = {
      ownedCities: 1,
      hostileInSight: false,
      cityThreatened: false,
      walledCityVisible: false,
    };
    expect(candyResearchV7(fresh([]), facts)).toMatchObject({
      tech: "HUNTING",
      priority: CANDY_EARLY_RESEARCH_PRIORITY_V7,
    });
    expect(
      candyResearchV7(fresh([]), { ...facts, hostileInSight: true }),
    ).toMatchObject({ tech: "DRILL" });
    expect(
      candyResearchV7(fresh(["HUNTING", "MARKSMANSHIP", "DRILL"]), {
        ...facts,
        cityThreatened: true,
      }),
    ).toMatchObject({
      tech: "FORTIFICATION",
      priority: CANDY_RESEARCH_PRIORITY_V7,
    });
    expect(
      candyResearchV7(fresh(["HUNTING", "MARKSMANSHIP"]), {
        ...facts,
        ownedCities: 2,
      }),
    ).toMatchObject({ tech: "GATHERING" });
    // Gated: null for any other faction.
    expect(
      candyResearchV7(
        viewerViewV7(
          againstCandy([own("FIGHTER", 8, 7), foe("FIGHTER", 1, 1)]),
        ),
        facts,
      ),
    ).toBeNull();
  });
});

describe("Normal AI against the Candy", () => {
  it("ends a routine Move on hostile Crumbs", () => {
    const pieces = [own("FIGHTER", 5, 3), foe("FIGHTER", 1, 1)];
    const techs = {
      0: TECHNOLOGY_IDS_V7,
      1: TECHNOLOGY_IDS_V7.filter((tech) => tech !== "EXPLOSIVES"),
    };
    const plain = againstCandy(pieces, { techs });
    const moves = unitCandidatesV7(plain, at(5, 3), "MOVE");
    expect(moves.length).toBeGreaterThan(0);
    const best = moves[0] === undefined ? undefined : endOf(moves[0].command);
    expect(best).toBeDefined();
    if (best === undefined) return;
    // Crumbs on another tile that is no step back: the Move goes there.
    const side = moves
      .map((candidate) => endOf(candidate.command))
      .find(
        (end) =>
          end !== undefined &&
          (end.x !== best.x || end.y !== best.y) &&
          (moveCandidateV7(plain, at(5, 3), end)?.score.objectiveValue ?? -1) >=
            0,
      );
    expect(side).toBeDefined();
    if (side === undefined) return;
    const crumbs = againstCandy(pieces, {
      techs,
      crumbs: [{ at: side, role: "KNIGHT", seat: 1 }],
    });
    expect(moveCandidateV7(crumbs, at(5, 3), side)?.score.objectiveValue).toBe(
      (moveCandidateV7(plain, at(5, 3), side)?.score.objectiveValue ?? 0) +
        CRUMBS_EAT_OBJECTIVE_V7,
    );
    // A Peppermint bite for a Gumdrop's Crumbs is not worth it.
    const bite = againstCandy(pieces, {
      crumbs: [{ at: side, role: "FIGHTER", seat: 1 }],
    });
    expect(moveCandidateV7(bite, at(5, 3), side)?.score.objectiveValue).toBe(
      moveCandidateV7(plain, at(5, 3), side)?.score.objectiveValue,
    );
    // Off with the switch.
    setCandyPolicyOptionsV7({ eatCrumbs: false });
    expect(moveCandidateV7(crumbs, at(5, 3), side)?.score.objectiveValue).toBe(
      moveCandidateV7(plain, at(5, 3), side)?.score.objectiveValue,
    );
  });

  it("kills the Confectioner first", () => {
    const state = againstCandy([
      own("FIGHTER", 5, 3),
      foe("CAPTAIN", 4, 2),
      foe("FIGHTER", 6, 2),
    ]);
    const attacks = unitCandidatesV7(state, at(5, 3), "ATTACK");
    expect(attacks[0]?.command).toMatchObject({
      targetUnitId: unitIdAtV7(state, at(4, 2)),
    });
  });

  it("prefers a Crashed target and reads it as no threat", () => {
    const state = againstCandy([
      own("FIGHTER", 5, 3),
      foe("FIGHTER", 4, 2, { rush: "CRASHED" }),
      foe("FIGHTER", 6, 2),
    ]);
    const crashed = scoreV7(state, attackV7(state, at(5, 3), at(4, 2)));
    const free = scoreV7(state, attackV7(state, at(5, 3), at(6, 2)));
    expect(crashed.priority).toBe(free.priority);
    expect(crashed.strategicValue).toBe(
      free.strategicValue + CRASHED_TARGET_VALUE_V7,
    );
    expect(unitCandidatesV7(state, at(5, 3), "ATTACK")[0]?.command).toEqual(
      attackV7(state, at(5, 3), at(4, 2)),
    );
    // Only the free Gumdrop threatens the tiles around them.
    const lone = (rush?: "CRASHED") =>
      againstCandy([
        own("FIGHTER", 6, 5),
        foe("FIGHTER", 6, 3, rush === undefined ? {} : { rush }),
      ]);
    const beside = (board: GameStateV7): number =>
      scoreV7(board, {
        kind: "MOVE",
        unitId: unitIdAtV7(board, at(6, 5)),
        path: [at(6, 4)],
      }).safetyValue;
    expect(beside(lone("CRASHED"))).toBeCloseTo(0);
    expect(beside(lone())).toBeLessThan(0);
    // Off with the switch: the Crashed Gumdrop counts like a free one.
    setCandyPolicyOptionsV7({ readCrash: false });
    expect(beside(lone("CRASHED"))).toBe(beside(lone()));
  });

  it("counts a Bounce against a melee attack", () => {
    const state = againstCandy([own("FIGHTER", 5, 3), foe("GUARD", 5, 2)]);
    const attack = attackV7(state, at(5, 3), at(5, 2));
    expect(
      queryCombatPreviewV7(
        viewerViewV7(state),
        attack.unitId,
        attack.targetUnitId,
      )?.bounce,
    ).toBe("WILL_BOUNCE");
    const bounced = scoreV7(state, attack).strategicValue;
    setCandyPolicyOptionsV7({ respectBounce: false });
    expect(scoreV7(state, attack).strategicValue).toBe(
      bounced + BOUNCE_COST_V7,
    );
  });
});
