import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  type ScoredAiCandidateV7,
} from "../../src/ai/v7";
import {
  CULT_AGAINST_COWED_PRIORITY_V7,
  CULT_AGAINST_CURE_PRIORITY_V7,
  CULT_AGAINST_DAEMON_VALUE_V7,
  CULT_AGAINST_PULL_BACK_PRIORITY_V7,
  CULT_AGAINST_STAR_HIT_PRIORITY_V7,
  CULT_AGAINST_STAR_STEP_PRIORITY_V7,
  CULT_AGAINST_STRAND_PRIORITY_V7,
  CULT_AGAINST_SUMMONING_PRIORITY_V7,
  cultAgainstEyeMarkedV7,
  cultAgainstFactsV7,
  setCultAgainstPolicyOptionsV7,
} from "../../src/ai/v7-cult-against";
import {
  CULT_SUMMONED_ROLE_RULES_V7,
  arePlayersHostileV7,
  previewRampageV7,
  queryAiReadyCommandsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type PlayerViewV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  cultFieldV7,
  withCowedV7,
  withFrogsV7,
  withGripV7,
  withHorrorV7,
  withRitualV7,
  withStrandsV7,
  withTentacleV7,
  withUnboundV7,
} from "../fixtures/v7-cult";
import { unitAtV7, type GoblinPieceV7 } from "../fixtures/v7-goblin-arena";
import { fieldV7 } from "../fixtures/v7-revision20";

// Every seat against the Cult (`pulp_wars-mch9.12`, bead A4 of
// docs/product/RULESET_7_CULTISTS.md section 15.5, as built in section
// 15.9; `src/ai/v7-cult-against.ts`). A baseline designed from judgement:
// no match was played for this bead. Every rule is a decision, or the
// candidates of one decision, on a small hand-built state; most are shown
// again with the module switched off (the decision the seat made before).
//
// The field (tests/fixtures/v7-cult.ts, 11 x 11): seat 0 (Human, the
// viewer, to move) capital (8, 8); seat 1 (the Cult) capital (2, 8);
// villages (5, 5), (8, 5), (5, 8); every other land tile open Grass; every
// tile explored; every technology; no Coins. The Cult's roles: FIGHTER the
// Initiate, CAPTAIN the Summoner, MARKSMAN the Hexer, GUARD the Idol
// Bearer, CATAPULT the Stargazer, JUGGERNAUT the Thing (its KNIGHT and
// SWORDSMAN slots are vacant since the Cult redesign, `pulp_wars-mch9.31`).

const at = (x: number, y: number): CoordV7 => ({ x, y });
const gap = (left: CoordV7, right: CoordV7): number =>
  Math.max(Math.abs(left.x - right.x), Math.abs(left.y - right.y));

const own = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 0, role, at: at(x, y), ...extra });
const cult = (
  role: UnitRoleIdV7,
  x: number,
  y: number,
  extra: Partial<GoblinPieceV7> = {},
): GoblinPieceV7 => ({ seat: 1, role, at: at(x, y), ...extra });

/** A unit that can do nothing more this turn. */
const SPENT: Partial<UnitStateV7["activation"]> = {
  moved: true,
  attacked: true,
  attacksUsed: 1,
  recovered: true,
  captured: true,
  handled: true,
  specialActed: true,
};

/** The Cult's garrison: the enemy the board always has, far from the scene. */
const GARRISON = cult("FIGHTER", 2, 8);

const scene = (pieces: readonly GoblinPieceV7[]): GameStateV7 => {
  const state = cultFieldV7([...pieces, GARRISON], {
    coins: 0,
    factions: ["ORIGINAL", "CULT"],
  });
  return {
    ...state,
    round: 12,
    players: state.players.map((player) => ({
      ...player,
      achievementEntitlements: player.achievementEntitlements.map((entry) =>
        entry.unlocked ? { ...entry, spent: true } : entry,
      ),
    })),
  };
};

const viewOf = (state: GameStateV7): PlayerViewV7 =>
  viewForV7(state, state.humanPlayerId);

/** The seat's decision with the module on (the default) or off. */
function decision(
  state: GameStateV7,
  play = true,
): ReturnType<typeof chooseNormalCommandV7> {
  const previous = setCultAgainstPolicyOptionsV7({ play });
  try {
    return chooseNormalCommandV7(viewOf(state));
  } finally {
    setCultAgainstPolicyOptionsV7(previous);
  }
}

const decides = (state: GameStateV7, play = true): CommandV7 | null =>
  decision(state, play).command;

/** The candidates of the unit on `from`, of one kind. */
const candidates = (
  state: GameStateV7,
  from: CoordV7,
  kind: CommandV7["kind"],
  play = true,
): readonly ScoredAiCandidateV7[] => {
  const id = unitAtV7(state, from).id;
  return decision(state, play).candidates.filter(
    (candidate) =>
      candidate.command.kind === kind &&
      "unitId" in candidate.command &&
      candidate.command.unitId === id,
  );
};

/** The attack candidate of the unit on `from` on the unit on `target`. */
const attack = (
  state: GameStateV7,
  from: CoordV7,
  target: CoordV7,
  play = true,
): ScoredAiCandidateV7 | undefined => {
  const id = unitAtV7(state, target).id;
  return candidates(state, from, "ATTACK", play).find(
    (candidate) =>
      candidate.command.kind === "ATTACK" &&
      candidate.command.targetUnitId === id,
  );
};

/** The tiles the Move candidates of the unit on `from` end on. */
const moves = (
  state: GameStateV7,
  from: CoordV7,
  play = true,
): readonly { readonly to: CoordV7; readonly priority: number }[] =>
  candidates(state, from, "MOVE", play).flatMap((candidate) => {
    const to =
      candidate.command.kind === "MOVE"
        ? candidate.command.path.at(-1)
        : undefined;
    return to === undefined ? [] : [{ to, priority: candidate.score.priority }];
  });

const attackOn = (state: GameStateV7, from: CoordV7, target: CoordV7) => ({
  kind: "ATTACK",
  unitId: unitAtV7(state, from).id,
  targetUnitId: unitAtV7(state, target).id,
});

const facts = (state: GameStateV7) => {
  const view = viewOf(state);
  return cultAgainstFactsV7(view, queryPlayerCommandsV7(view), (owner) =>
    arePlayersHostileV7(view, view.viewer.id, owner),
  );
};

describe("against the Cult: the gate", () => {
  it("has no facts, and decides as before, in a view with none of the Cult's marks", () => {
    const fixtures: readonly GameStateV7[] = [
      // A Cult seat's plain units in sight: no strand, circle, daemon,
      // frog, Tentacle, or Cowed city.
      scene([
        own("FIGHTER", 6, 2),
        own("MARKSMAN", 7, 2),
        cult("FIGHTER", 5, 2),
        cult("MARKSMAN", 3, 2),
      ]),
      // The Cult seat itself, to move.
      cultFieldV7(
        [
          own("FIGHTER", 7, 6),
          own("CAPTAIN", 8, 7),
          cult("FIGHTER", 6, 5),
          GARRISON,
        ],
        { coins: 0 },
      ),
      // A match without a Cult seat.
      fieldV7(
        [own("FIGHTER", 6, 4), own("MARKSMAN", 7, 5), cult("FIGHTER", 5, 4)],
        { coins: 4 },
      ),
    ];
    for (const state of fixtures) {
      expect(facts(state)).toBeNull();
      const on = decision(state, true);
      const off = decision(state, false);
      expect(on.command).toEqual(off.command);
      expect(on.candidates).toEqual(off.candidates);
    }
  });

  it("keeps its own copy of a daemon's Favour cost", () => {
    expect(CULT_AGAINST_DAEMON_VALUE_V7).toEqual({
      HORROR: CULT_SUMMONED_ROLE_RULES_V7.HORROR.favourCost,
      HERALD: CULT_SUMMONED_ROLE_RULES_V7.HERALD.favourCost,
    });
  });

  it("decides only commands the engine offers", () => {
    let state = scene([
      own("MARKSMAN", 6, 2),
      own("FIGHTER", 6, 3),
      cult("FIGHTER", 4, 2),
      cult("GUARD", 5, 3),
    ]);
    state = withHorrorV7(state, 1, at(3, 4), { activation: SPENT });
    state = withStrandsV7(state, at(3, 4), [at(4, 2)]);
    const view = viewOf(state);
    const offered = queryAiReadyCommandsV7(view).map((item) =>
      JSON.stringify(item.command),
    );
    for (const candidate of decision(state).candidates)
      expect(offered).toContain(JSON.stringify(candidate.command));
  });
});

describe("against the Cult: hunt the strands (section 15.5)", () => {
  // A Horror held by one Initiate two tiles from a Marksman, and a broken
  // Initiate the shot would kill instead.
  const oneStrand = (): GameStateV7 => {
    let state = scene([
      own("MARKSMAN", 6, 2),
      cult("FIGHTER", 4, 2),
      cult("FIGHTER", 6, 4, { hp: 2 }),
    ]);
    state = withHorrorV7(state, 1, at(3, 4), { activation: SPENT });
    return withStrandsV7(state, at(3, 4), [at(4, 2)]);
  };

  it("shoots the channeller whose strand holds the Horror, before a kill", () => {
    const state = oneStrand();
    expect(decides(state)).toEqual(attackOn(state, at(6, 2), at(4, 2)));
    expect(attack(state, at(6, 2), at(4, 2))?.score.priority).toBe(
      CULT_AGAINST_STRAND_PRIORITY_V7,
    );
    // Before this module the seat took the kill.
    expect(decides(state, false)).toEqual(attackOn(state, at(6, 2), at(6, 4)));
  });

  it("does not put a hit first that cannot bring the daemon below its Control", () => {
    // Two strands on a Horror (Control 1): one shot leaves it held.
    let state = scene([
      own("MARKSMAN", 6, 2),
      cult("FIGHTER", 4, 2),
      cult("FIGHTER", 2, 2),
    ]);
    state = withHorrorV7(state, 1, at(3, 4), { activation: SPENT });
    state = withStrandsV7(state, at(3, 4), [at(4, 2), at(2, 2)]);
    const on = attack(state, at(6, 2), at(4, 2));
    const off = attack(state, at(6, 2), at(4, 2), false);
    expect(on?.score.priority).toBe(off?.score.priority);
    // It is still worth its share of the daemon.
    expect(on?.score.strategicValue).toBeGreaterThan(
      off?.score.strategicValue ?? Number.POSITIVE_INFINITY,
    );
  });

  it("puts both hits first when two shooters can break both strands", () => {
    let state = scene([
      own("MARKSMAN", 6, 2),
      own("MARKSMAN", 6, 3),
      cult("FIGHTER", 4, 2),
      cult("FIGHTER", 4, 3),
    ]);
    state = withHorrorV7(state, 1, at(2, 3), { activation: SPENT });
    state = withStrandsV7(state, at(2, 3), [at(4, 2), at(4, 3)]);
    for (const from of [at(6, 2), at(6, 3)])
      for (const target of [at(4, 2), at(4, 3)])
        expect(attack(state, from, target)?.score.priority).toBe(
          CULT_AGAINST_STRAND_PRIORITY_V7,
        );
  });

  it("counts a gripped channeller's strand as three", () => {
    // A Herald (Control 3) on a gripped strand and one more: 4 strands,
    // two to spare; the one hit on the gripped channeller breaks three.
    let state = scene([
      own("MARKSMAN", 6, 2),
      cult("FIGHTER", 4, 2),
      cult("JUGGERNAUT", 3, 1),
      cult("FIGHTER", 1, 3),
    ]);
    state = withHorrorV7(state, 1, at(2, 3), {
      activation: SPENT,
      role: "HERALD",
    });
    state = withStrandsV7(state, at(2, 3), [at(4, 2), at(1, 3)]);
    state = withGripV7(state, at(3, 1), at(4, 2));
    expect(
      facts(state)?.channellers.get(unitAtV7(state, at(4, 2)).id),
    ).toMatchObject({
      weight: 3,
      daemon: { strands: 4, control: 3, spare: 2 },
    });
    expect(decides(state)).toEqual(attackOn(state, at(6, 2), at(4, 2)));
    expect(attack(state, at(6, 2), at(4, 2))?.score.priority).toBe(
      CULT_AGAINST_STRAND_PRIORITY_V7,
    );
  });

  it("holds for a Cult seat that faces another lodge", () => {
    // Seat 0 is a Cult seat too: its Hexer shoots the other lodge's
    // channeller.
    let state = cultFieldV7(
      [own("MARKSMAN", 6, 2), cult("FIGHTER", 4, 2), GARRISON],
      { coins: 0, factions: ["CULT", "CULT"] },
    );
    state = withHorrorV7(state, 1, at(3, 4), { activation: SPENT });
    state = withStrandsV7(state, at(3, 4), [at(4, 2)]);
    expect(attack(state, at(6, 2), at(4, 2))?.score.priority).toBe(
      CULT_AGAINST_STRAND_PRIORITY_V7,
    );
    expect(
      attack(state, at(6, 2), at(4, 2), false)?.score.priority,
    ).toBeLessThan(CULT_AGAINST_STRAND_PRIORITY_V7);
  });

  // (The Cult redesign, `pulp_wars-mch9.33`: an idol keeps no strand any
  // more, so a channeller beside an Idol Bearer is hunted like any other;
  // the warden's own rules for the other seats are A-R4's.)
  it("hunts a channeller beside a standing idol like any other", () => {
    let state = scene([
      own("MARKSMAN", 6, 2),
      cult("FIGHTER", 4, 2),
      cult("GUARD", 4, 3),
    ]);
    state = withHorrorV7(state, 1, at(2, 3), { activation: SPENT });
    state = withStrandsV7(state, at(2, 3), [at(4, 2)]);
    expect(attack(state, at(6, 2), at(4, 2))?.score.priority).toBe(
      CULT_AGAINST_STRAND_PRIORITY_V7,
    );
  });

  describe("a circle", () => {
    const summoning = (pieces: readonly GoblinPieceV7[]): GameStateV7 =>
      withRitualV7(
        scene([
          ...pieces,
          cult("CAPTAIN", 3, 3),
          cult("FIGHTER", 4, 3),
          cult("FIGHTER", 3, 2),
          cult("FIGHTER", 2, 3),
        ]),
        "GREAT_SUMMONING",
        at(3, 3),
        [at(4, 3), at(3, 2), at(2, 3)],
        at(4, 2),
      );

    it("ends a Great Summoning with one hit on a chanter it cannot spare", () => {
      const state = summoning([own("MARKSMAN", 6, 3)]);
      expect(decides(state)).toEqual(attackOn(state, at(6, 3), at(4, 3)));
      expect(attack(state, at(6, 3), at(4, 3))?.score.priority).toBe(
        CULT_AGAINST_SUMMONING_PRIORITY_V7,
      );
      expect(
        attack(state, at(6, 3), at(4, 3), false)?.score.priority,
      ).toBeLessThan(CULT_AGAINST_SUMMONING_PRIORITY_V7);
    });

    const starfall = (mark: CoordV7): GameStateV7 =>
      withRitualV7(
        scene([
          own("MARKSMAN", 5, 2),
          own("FIGHTER", 9, 2),
          cult("CATAPULT", 3, 2),
          cult("FIGHTER", 2, 2),
        ]),
        "STARFALL",
        at(3, 2),
        [at(2, 2)],
        mark,
      );

    it("ends a star that would land on its own units, by a hit on the leader", () => {
      // The mark is on the Marksman: the star takes its Hit Points.
      const state = starfall(at(5, 2));
      expect(attack(state, at(5, 2), at(3, 2))?.score.priority).toBe(
        CULT_AGAINST_STAR_HIT_PRIORITY_V7,
      );
      expect(decides(state)).toEqual(attackOn(state, at(5, 2), at(3, 2)));
    });

    it("leaves the leader of a star that hits nobody of its own an ordinary target", () => {
      const state = starfall(at(7, 0));
      expect(attack(state, at(5, 2), at(3, 2))?.score.priority).toBe(
        attack(state, at(5, 2), at(3, 2), false)?.score.priority,
      );
    });
  });
});

describe("against the Cult: stand on the X (section 15.5)", () => {
  const circle = (fighter: GoblinPieceV7): GameStateV7 =>
    withRitualV7(
      scene([
        fighter,
        cult("CAPTAIN", 3, 3),
        cult("FIGHTER", 3, 4),
        cult("FIGHTER", 2, 2),
        cult("FIGHTER", 2, 3),
      ]),
      "GREAT_SUMMONING",
      at(3, 3),
      [at(3, 4), at(2, 2), at(2, 3)],
      at(4, 2),
    );

  it("walks a healthy unit onto the mark, with the priority of the hit that ends the circle", () => {
    const state = circle(own("GUARD", 5, 1));
    expect(decides(state)).toMatchObject({
      kind: "MOVE",
      unitId: unitAtV7(state, at(5, 1)).id,
    });
    const chosen = decides(state);
    expect(chosen?.kind === "MOVE" ? chosen.path.at(-1) : null).toEqual(
      at(4, 2),
    );
    expect(
      moves(state, at(5, 1)).find((move) => gap(move.to, at(4, 2)) === 0)
        ?.priority,
    ).toBe(CULT_AGAINST_SUMMONING_PRIORITY_V7);
    // Before this module the mark was a tile like any other.
    const before = decides(state, false);
    expect(before?.kind === "MOVE" ? before.path.at(-1) : null).not.toEqual(
      at(4, 2),
    );
  });

  it("does not send a broken living unit (it would be consumed)", () => {
    const state = circle(own("GUARD", 5, 1, { hp: 5 }));
    expect(
      moves(state, at(5, 1)).find((move) => gap(move.to, at(4, 2)) === 0)
        ?.priority ?? 0,
    ).toBeLessThan(CULT_AGAINST_SUMMONING_PRIORITY_V7);
  });

  it("keeps the unit on the mark there", () => {
    const state = circle(own("GUARD", 4, 2));
    expect(moves(state, at(4, 2))).toEqual([]);
    expect(moves(state, at(4, 2), false).length).toBeGreaterThan(0);
  });
});

describe("against the Cult: step out from under a star (section 15.5)", () => {
  // A star marked on (6, 2): its ring is x 5 to 7, y 1 to 3.
  const star = (pieces: readonly GoblinPieceV7[]): GameStateV7 =>
    withRitualV7(
      scene([...pieces, cult("CATAPULT", 2, 2), cult("FIGHTER", 1, 2)]),
      "STARFALL",
      at(2, 2),
      [at(1, 2)],
      at(6, 2),
    );
  const under = (tile: CoordV7): boolean => gap(tile, at(6, 2)) <= 1;

  it("steps a unit on the ring's edge out", () => {
    const state = star([own("GUARD", 7, 2)]);
    const chosen = decides(state);
    expect(chosen).toMatchObject({ kind: "MOVE" });
    const end = chosen?.kind === "MOVE" ? chosen.path.at(-1) : undefined;
    expect(end !== undefined && !under(end)).toBe(true);
    for (const move of moves(state, at(7, 2)))
      if (!under(move.to))
        expect(move.priority).toBe(CULT_AGAINST_STAR_STEP_PRIORITY_V7);
  });

  it("makes no routine Move into the ring", () => {
    const state = star([own("GUARD", 8, 2)]);
    expect(moves(state, at(8, 2)).some((move) => under(move.to))).toBe(false);
    // Before this module it walked in (toward the enemy).
    expect(moves(state, at(8, 2), false).some((move) => under(move.to))).toBe(
      true,
    );
  });
});

describe("against the Cult: the eye mark (section 15.5)", () => {
  // A Horror with no strand (short of its Control: it breaks loose at its
  // seat's next Start Turn), an Initiate three tiles from it.
  const loose = (
    pieces: readonly GoblinPieceV7[],
    held = false,
  ): GameStateV7 => {
    const state = withHorrorV7(
      scene([...pieces, cult("FIGHTER", 2, 2)]),
      1,
      at(5, 2),
      { activation: SPENT },
    );
    return held ? withStrandsV7(state, at(5, 2), [at(2, 2)]) : state;
  };

  it("agrees with the engine's rampage preview on whom the daemon goes for", () => {
    for (const guard of [at(7, 2), at(8, 2), at(8, 4), at(6, 3)]) {
      const state = loose([own("GUARD", guard.x, guard.y)]);
      const view = viewOf(state);
      const horror = unitAtV7(state, at(5, 2));
      const daemon = facts(state)?.daemons.get(horror.id);
      const actor = view.units.find((unit) => gap(unit.at, guard) === 0);
      if (daemon === undefined || actor === undefined)
        throw new Error("the scene is not as built");
      expect(daemon.short).toBe(true);
      const rampage = previewRampageV7(view, horror.id);
      expect(cultAgainstEyeMarkedV7(view, daemon, actor, actor.at)).toBe(
        rampage?.targetUnitId === actor.id && rampage.attacks,
      );
    }
  });

  it("pulls the eye-marked unit back so that the Cult's own unit is nearest", () => {
    // The Guard is 2 from the Horror, the Initiate 3: one step back makes
    // a tie, and a tie goes to the daemon's own seat.
    const state = loose([own("GUARD", 7, 2)]);
    const chosen = decides(state);
    expect(chosen).toMatchObject({ kind: "MOVE" });
    const end = chosen?.kind === "MOVE" ? chosen.path.at(-1) : undefined;
    expect(end === undefined ? 0 : gap(end, at(5, 2))).toBe(3);
    for (const move of moves(state, at(7, 2))) {
      if (gap(move.to, at(5, 2)) >= 3)
        expect(move.priority).toBe(CULT_AGAINST_PULL_BACK_PRIORITY_V7);
      // A step that leaves it the eye-marked unit is no better than before.
      else
        expect(move.priority).toBeLessThan(CULT_AGAINST_PULL_BACK_PRIORITY_V7);
    }
    // Before this module it had no such Move.
    expect(
      moves(state, at(7, 2), false).some(
        (move) => move.priority === CULT_AGAINST_PULL_BACK_PRIORITY_V7,
      ),
    ).toBe(false);
  });

  it("makes no routine Move that ends as the eye-marked unit", () => {
    const state = loose([own("GUARD", 8, 2)]);
    expect(
      moves(state, at(8, 2)).some((move) => gap(move.to, at(5, 2)) <= 2),
    ).toBe(false);
    expect(
      moves(state, at(8, 2), false).some((move) => gap(move.to, at(5, 2)) <= 2),
    ).toBe(true);
  });

  it("has no eye mark to mind on a daemon that is held", () => {
    const state = loose([own("GUARD", 8, 2)], true);
    expect(facts(state)?.daemons.get(unitAtV7(state, at(5, 2)).id)?.short).toBe(
      false,
    );
    expect(moves(state, at(8, 2))).toEqual(moves(state, at(8, 2), false));
  });
});

describe("against the Cult: do not fight the Herald (section 15.5)", () => {
  // A Herald held by four Initiates out of every own unit's reach.
  const herald = (pieces: readonly GoblinPieceV7[]): GameStateV7 => {
    let state = scene([
      ...pieces,
      cult("FIGHTER", 1, 1),
      cult("FIGHTER", 1, 2),
      cult("FIGHTER", 1, 3),
      cult("FIGHTER", 2, 1),
    ]);
    state = withHorrorV7(state, 1, at(4, 2), {
      activation: SPENT,
      role: "HERALD",
    });
    return withStrandsV7(state, at(4, 2), [
      at(1, 1),
      at(1, 2),
      at(1, 3),
      at(2, 1),
    ]);
  };

  it("never strikes a bound Herald with a blow that does not kill it", () => {
    const state = herald([own("SWORDSMAN", 5, 2)]);
    expect(attack(state, at(5, 2), at(4, 2))).toBeUndefined();
    // Before this module the blow was a candidate.
    expect(attack(state, at(5, 2), at(4, 2), false)).toBeDefined();
  });

  it("lets a shooter with no other target take the shot it cannot answer", () => {
    const state = herald([own("MARKSMAN", 6, 2)]);
    expect(attack(state, at(6, 2), at(4, 2))).toBeDefined();
  });

  it("spends the shot on another target when it has one", () => {
    const state = herald([own("MARKSMAN", 6, 2), cult("FIGHTER", 5, 4)]);
    expect(attack(state, at(6, 2), at(4, 2))).toBeUndefined();
    expect(attack(state, at(6, 2), at(5, 4))).toBeDefined();
  });
});

describe("against the Cult: an Unbound daemon and a Tentacle (sections 15.5 and 21.6)", () => {
  it("ends no routine Move in an Unbound Horror's reach, and strikes it only for a kill", () => {
    let state = scene([own("GUARD", 9, 2), own("SWORDSMAN", 6, 2)]);
    state = withHorrorV7(state, 1, at(5, 2));
    state = withUnboundV7(state, at(5, 2), 1);
    // Its reach: its Move (2) and one.
    expect(
      moves(state, at(9, 2)).some((move) => gap(move.to, at(5, 2)) <= 3),
    ).toBe(false);
    expect(attack(state, at(6, 2), at(5, 2))).toBeUndefined();
  });

  it("lets the unit a Tentacle holds strike it", () => {
    const state = withTentacleV7(
      scene([own("FIGHTER", 6, 2), cult("CAPTAIN", 2, 2)]),
      at(2, 2),
      at(5, 2),
      { grabbed: at(6, 2) },
    );
    expect(decides(state)).toEqual(attackOn(state, at(6, 2), at(5, 2)));
    // Before this module a Tentacle was struck only for a kill.
    expect(attack(state, at(6, 2), at(5, 2), false)).toBeUndefined();
  });

  it("leaves a Tentacle that holds nobody of its own alone", () => {
    const state = withTentacleV7(
      scene([own("FIGHTER", 6, 2), cult("CAPTAIN", 2, 2)]),
      at(2, 2),
      at(5, 2),
    );
    expect(attack(state, at(6, 2), at(5, 2))).toBeUndefined();
  });
});

describe("against the Cult: a frog (section 15.5)", () => {
  it("is cured first by a unit that Tends beside it", () => {
    const state = withFrogsV7(
      scene([
        own("FIGHTER", 6, 2),
        own("CAPTAIN", 7, 2),
        cult("MARKSMAN", 4, 2),
      ]),
      [at(6, 2)],
    );
    expect(decides(state)).toEqual({
      kind: "TEND_WOUNDED",
      unitId: unitAtV7(state, at(7, 2)).id,
    });
    expect(candidates(state, at(7, 2), "TEND_WOUNDED")[0]?.score.priority).toBe(
      CULT_AGAINST_CURE_PRIORITY_V7,
    );
    // Before this module a full-HP frog was not worth a Tend.
    expect(decides(state, false)).not.toMatchObject({ kind: "TEND_WOUNDED" });
  });

  it("steps back to a safer tile, never forward", () => {
    const state = withFrogsV7(
      scene([
        own("FIGHTER", 6, 2),
        cult("FIGHTER", 4, 2),
        cult("MARKSMAN", 3, 2),
      ]),
      [at(6, 2)],
    );
    const chosen = decides(state);
    expect(chosen).toMatchObject({
      kind: "MOVE",
      unitId: unitAtV7(state, at(6, 2)).id,
    });
    expect(chosen?.kind === "MOVE" ? chosen.path.at(-1)?.x : null).toBe(7);
    for (const move of moves(state, at(6, 2))) {
      expect(move.to.x).toBeGreaterThanOrEqual(6);
      if (move.to.x === 7)
        expect(move.priority).toBe(CULT_AGAINST_PULL_BACK_PRIORITY_V7);
    }
    // Before this module the step back was a routine Move like any other.
    expect(
      moves(state, at(6, 2), false).some(
        (move) => move.priority >= CULT_AGAINST_PULL_BACK_PRIORITY_V7,
      ),
    ).toBe(false);
  });
});

describe("against the Cult: a Cowed city (section 15.5)", () => {
  it("keeps the garrison of a Cowed city on its center", () => {
    const state = withCowedV7(
      scene([own("FIGHTER", 8, 8), cult("FIGHTER", 6, 6)]),
      at(8, 8),
    );
    expect(moves(state, at(8, 8))).toEqual([]);
    const free = scene([own("FIGHTER", 8, 8), cult("FIGHTER", 6, 6)]);
    expect(facts(free)).toBeNull();
  });

  it("gives an empty Cowed center a garrison", () => {
    const state = withCowedV7(
      scene([own("FIGHTER", 7, 7), cult("FIGHTER", 4, 6)]),
      at(8, 8),
    );
    const chosen = decides(state);
    expect(chosen?.kind === "MOVE" ? chosen.path.at(-1) : null).toEqual(
      at(8, 8),
    );
    expect(
      moves(state, at(7, 7)).find((move) => gap(move.to, at(8, 8)) === 0)
        ?.priority,
    ).toBe(CULT_AGAINST_COWED_PRIORITY_V7);
    // `pulp_wars-mch9.27`: with the module switched off the step is made
    // too now, by every army seat's garrison rule: an empty center that a
    // visible enemy within six tiles watches (here the Cult's garrison and
    // the Initiate) and that its city does not train onto (a Cowed city
    // trains nobody) gets its best garrison.
    const before = decides(state, false);
    expect(before?.kind === "MOVE" ? before.path.at(-1) : null).toEqual(
      at(8, 8),
    );
  });
});
