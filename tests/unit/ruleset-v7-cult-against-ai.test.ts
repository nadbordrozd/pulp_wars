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
  CULT_AGAINST_WARD_PRIORITY_V7,
  cultAgainstEyeMarkedV7,
  cultAgainstFactsV7,
  cultAgainstMoveV7,
  setCultAgainstPolicyOptionsV7,
} from "../../src/ai/v7-cult-against";
import {
  CULT_SUMMONED_ROLE_RULES_V7,
  arePlayersHostileV7,
  previewRampageV7,
  queryAiReadyCommandsV7,
  queryCombatPreviewV7,
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
  withFavourV7,
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
      IMP: CULT_SUMMONED_ROLE_RULES_V7.IMP.favourCost,
      MASS: CULT_SUMMONED_ROLE_RULES_V7.MASS.favourCost,
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
    // Fed: the Cult redesign's Hunger (`pulp_wars-mch9.41`) would break a
    // Herald whose seat has less than 2 Favour anyway.
    state = withFavourV7(state, 1, 10);
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

// --- The Cult redesign's A-R4 (`pulp_wars-mch9.41`) --------------------------
// docs/product/RULESET_7_CULT_REDESIGN.md section 12.4, as built in section
// 12.8. Every rule on a small hand-built state, beside the nearest state
// where it must not fire, and (where the rule changes a decision) with the
// module switched off.

/** An Imp (or another summon) of the Cult seat on `where`, done for the turn. */
const summon = (
  state: GameStateV7,
  where: CoordV7,
  role: "IMP" | "MASS" | "HORROR" | "HERALD",
  hp?: number,
): GameStateV7 =>
  withHorrorV7(state, 1, where, {
    activation: SPENT,
    role,
    ...(hp === undefined ? {} : { hp }),
  });

/** The tools `cultAgainstMoveV7` asks of the policy, for a direct call. */
const moveTools = (state: GameStateV7) => {
  const view = viewOf(state);
  const sites = new Set(
    view.board.tiles
      .filter((tile) => tile.explored && tile.site !== null)
      .map((tile) => `${tile.at.x},${tile.at.y}`),
  );
  return {
    view,
    danger: () => 0,
    site: (where: CoordV7) => sites.has(`${where.x},${where.y}`),
    routineMaximum: 735,
  };
};

const ownUnitOf = (state: GameStateV7, where: CoordV7) => {
  const id = unitAtV7(state, where).id;
  const unit = viewOf(state).units.find((candidate) => candidate.id === id);
  if (unit === undefined) throw new Error("the scene is not as built");
  return unit;
};

const moveValue = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  priority: number,
) => {
  const known = facts(state);
  if (known === null) throw new Error("no facts");
  return cultAgainstMoveV7(
    known,
    moveTools(state),
    ownUnitOf(state, from),
    to,
    priority,
  );
};

describe("against the new Cult: the gate (A-R4)", () => {
  it("reads a standing idol, and nothing else of a Cult seat's plain units", () => {
    const bearer = scene([own("FIGHTER", 6, 2), cult("GUARD", 4, 2)]);
    expect(facts(bearer)?.wardens.has(unitAtV7(bearer, at(4, 2)).id)).toBe(
      true,
    );
    // A frogged bearer's idol is down: nothing to read.
    expect(facts(withFrogsV7(bearer, [at(4, 2)]))?.wardens.size ?? 0).toBe(0);
  });
});

describe("against the new Cult: Brood in the strand hunt (A-R4)", () => {
  // An Initiate channels the Imp on (3, 3); the Imps on (2, 3) and (3, 4)
  // stand beside it, so its one strand holds all three (Brood).
  const brood = (pieces: readonly GoblinPieceV7[], beside = true) => {
    let state = scene([...pieces, cult("FIGHTER", 4, 1)]);
    state = summon(state, at(3, 3), "IMP");
    state = summon(state, beside ? at(2, 3) : at(1, 6), "IMP");
    state = summon(state, beside ? at(3, 4) : at(1, 1), "IMP");
    return withStrandsV7(state, at(3, 3), [at(4, 1)]);
  };

  it("values the channeller of a Brood at every Imp it holds", () => {
    const held = brood([own("MARKSMAN", 6, 1)]);
    const alone = brood([own("MARKSMAN", 6, 1)], false);
    const lender = facts(held)?.daemons.get(unitAtV7(held, at(3, 3)).id);
    expect(lender).toMatchObject({ value: 6, brood: expect.any(Array) });
    expect(lender?.brood).toHaveLength(2);
    const gain = (state: GameStateV7): number =>
      (attack(state, at(6, 1), at(4, 1))?.score.strategicValue ?? 0) -
      (attack(state, at(6, 1), at(4, 1), false)?.score.strategicValue ?? 0);
    // Three Imps (6 Favour) on the strand, against one (2): times 4.
    expect(gain(held)).toBe(24);
    expect(gain(alone)).toBe(8);
    expect(attack(held, at(6, 1), at(4, 1))?.score.priority).toBe(
      CULT_AGAINST_STRAND_PRIORITY_V7,
    );
  });

  it("values the kill of the Imp whose strand lends the Brood", () => {
    // A Fighter beside the channelled Imp and one it holds: both kills.
    const state = brood([own("FIGHTER", 4, 4)]);
    const gain = (target: CoordV7): number =>
      (attack(state, at(4, 4), target)?.score.strategicValue ?? 0) -
      (attack(state, at(4, 4), target, false)?.score.strategicValue ?? 0);
    expect(gain(at(3, 3))).toBe(16);
    expect(gain(at(3, 4))).toBe(0);
  });
});

describe("against the new Cult: Doorstep in the strand hunt (A-R4)", () => {
  it("gives a strand to a Gibbering Mass on its Doorstep no worth", () => {
    // A Mass beside the Cult's capital (2, 8) is held with no strand; the
    // same Mass in the open needs the Initiate's.
    const build = (mass: CoordV7, initiate: CoordV7): GameStateV7 => {
      let state = scene([
        own("MARKSMAN", initiate.x + 2, initiate.y),
        cult("FIGHTER", initiate.x, initiate.y),
      ]);
      state = summon(state, mass, "MASS");
      return withStrandsV7(state, mass, [initiate]);
    };
    const home = build(at(3, 7), at(4, 6));
    expect(facts(home)?.daemons.get(unitAtV7(home, at(3, 7)).id)?.held).toBe(
      true,
    );
    const hit = attack(home, at(6, 6), at(4, 6));
    const before = attack(home, at(6, 6), at(4, 6), false);
    expect(hit?.score.strategicValue).toBe(before?.score.strategicValue);
    expect(hit?.score.priority).toBe(before?.score.priority);
    const open = build(at(4, 3), at(4, 1));
    expect(attack(open, at(6, 1), at(4, 1))?.score.priority).toBe(
      CULT_AGAINST_STRAND_PRIORITY_V7,
    );
  });

  // A strandless Mass on (4, 3) held only by the Idol Bearer on (4, 4),
  // which is down to 1 HP; a Fighter beside the bearer.
  const doorstep = (second = false): GameStateV7 => {
    let state = scene([
      own("FIGHTER", 5, 5),
      cult("GUARD", 4, 4, { hp: 1 }),
      ...(second ? [cult("GUARD", 3, 2)] : []),
    ]);
    state = summon(state, at(4, 3), "MASS");
    return state;
  };

  it("kills the Idol Bearer whose idol alone holds a strandless Mass first", () => {
    const state = doorstep();
    const mass = facts(state)?.daemons.get(unitAtV7(state, at(4, 3)).id);
    expect(mass).toMatchObject({ held: true, short: false });
    expect(
      facts(state)?.wardens.get(unitAtV7(state, at(4, 4)).id)?.masses,
    ).toHaveLength(1);
    expect(attack(state, at(5, 5), at(4, 4))?.score.priority).toBe(
      CULT_AGAINST_WARD_PRIORITY_V7,
    );
    // Before this module the Fighter did not strike the bearer at all.
    expect(
      attack(state, at(5, 5), at(4, 4), false)?.score.priority ?? -1,
    ).toBeLessThan(CULT_AGAINST_WARD_PRIORITY_V7);
  });

  it("does not when a second standing idol holds the Mass too", () => {
    const state = doorstep(true);
    expect(
      facts(state)?.wardens.get(unitAtV7(state, at(4, 4)).id)?.masses,
    ).toHaveLength(0);
    expect(
      attack(state, at(5, 5), at(4, 4))?.score.priority ?? -1,
    ).toBeLessThan(CULT_AGAINST_WARD_PRIORITY_V7);
  });

  it("puts the idol down with a Bolas when that frees the Mass", () => {
    let state = cultFieldV7(
      [
        own("RAIDER", 6, 4),
        cult("GUARD", 4, 4),
        cult("FIGHTER", 3, 5),
        GARRISON,
      ],
      { coins: 0, factions: ["ICE_FOLK", "CULT"] },
    );
    state = summon(state, at(4, 3), "MASS");
    const bolas = (play: boolean) =>
      candidates(state, at(6, 4), "THROW_BOLAS", play).find(
        (candidate) =>
          candidate.command.kind === "THROW_BOLAS" &&
          candidate.command.targetUnitId === unitAtV7(state, at(4, 4)).id,
      );
    expect(bolas(true)?.score.priority).toBe(CULT_AGAINST_WARD_PRIORITY_V7);
    // Before this module the Sled saw no worth in a Bolas on a unit that
    // stands still.
    expect(bolas(false)).toBeUndefined();
  });
});

describe("against the new Cult: the warden (A-R4)", () => {
  // The Idol Bearer on (4, 3) shields the Initiate on (4, 2) that channels
  // the Horror on (2, 2); the bearer is down to 2 HP.
  const shielded = (attacker: GoblinPieceV7): GameStateV7 => {
    let state = scene([
      attacker,
      cult("GUARD", 4, 3, { hp: 2 }),
      cult("FIGHTER", 4, 2),
    ]);
    state = summon(state, at(2, 2), "HORROR");
    return withStrandsV7(state, at(2, 2), [at(4, 2)]);
  };

  it("values the kill of a standing idol at half of what it shields, for a seat with ranged units", () => {
    const state = shielded(own("MARKSMAN", 6, 3));
    const gain =
      (attack(state, at(6, 3), at(4, 3))?.score.strategicValue ?? 0) -
      (attack(state, at(6, 3), at(4, 3), false)?.score.strategicValue ?? 0);
    // The Horror's strand (4 Favour times 4) shielded: half of 16.
    expect(gain).toBe(8);
    // A seat with no ranged unit gains nothing by it.
    const melee = shielded(own("FIGHTER", 5, 3));
    expect(attack(melee, at(5, 3), at(4, 3))?.score.strategicValue).toBe(
      attack(melee, at(5, 3), at(4, 3), false)?.score.strategicValue,
    );
  });

  it("counts a halved shot that does not kill as worth the damage it lost less", () => {
    const state = scene([
      own("MARKSMAN", 6, 1),
      cult("GUARD", 4, 2),
      cult("FIGHTER", 4, 1),
    ]);
    const view = viewOf(state);
    const shot = queryCombatPreviewV7(
      view,
      unitAtV7(state, at(6, 1)).id,
      unitAtV7(state, at(4, 1)).id,
    );
    expect(shot?.idolHalved).toBe(true);
    expect(shot?.defenderDies).toBe(false);
    expect(
      (attack(state, at(6, 1), at(4, 1))?.score.strategicValue ?? 0) -
        (attack(state, at(6, 1), at(4, 1), false)?.score.strategicValue ?? 0),
    ).toBe(-(shot?.damageToDefender ?? 0));
  });

  describe("Awestruck", () => {
    // A standing idol on (4, 3); the Fighter on (7, 3) has a Move worth
    // more than a routine one onto (5, 3), beside it.
    const awe = (bearerHp?: number, fighter = at(7, 3)): GameStateV7 =>
      scene([
        own("FIGHTER", fighter.x, fighter.y),
        cult("GUARD", 4, 3, bearerHp === undefined ? {} : { hp: bearerHp }),
      ]);

    it("gives a Move into a standing idol's ring at most a routine Move's priority", () => {
      expect(moveValue(awe(), at(7, 3), at(5, 3), 1000).priority).toBe(735);
      // Not into the ring: unchanged.
      expect(moveValue(awe(), at(7, 3), at(6, 3), 1000).priority).toBe(1000);
      // From inside the ring: unchanged.
      expect(
        moveValue(awe(undefined, at(5, 2)), at(5, 2), at(5, 4), 1000).priority,
      ).toBe(1000);
    });

    it("lets the Move stand when the attack on the Idol Bearer from there kills", () => {
      expect(moveValue(awe(1), at(7, 3), at(5, 3), 1000).priority).toBe(1000);
    });

    it("lets a Move onto a village stand", () => {
      const state = scene([own("FIGHTER", 6, 6), cult("GUARD", 4, 4)]);
      expect(moveValue(state, at(6, 6), at(5, 5), 1000).priority).toBe(1000);
    });
  });
});

describe("against the new Cult: Drag (A-R4)", () => {
  // A Gibbering Mass in the open on (5, 4), held by the Initiate on (3, 4).
  const dragging = (pieces: readonly GoblinPieceV7[]): GameStateV7 => {
    let state = scene([...pieces, cult("FIGHTER", 3, 4)]);
    state = summon(state, at(5, 4), "MASS");
    return withStrandsV7(state, at(5, 4), [at(3, 4)]);
  };

  it("ends no routine Move beside a hostile Mass", () => {
    const state = dragging([own("FIGHTER", 6, 2)]);
    const beside = (move: { readonly to: CoordV7 }) =>
      gap(move.to, at(5, 4)) === 1;
    expect(moves(state, at(6, 2)).some(beside)).toBe(false);
    expect(moves(state, at(6, 2), false).some(beside)).toBe(true);
    expect(moveValue(state, at(6, 2), at(6, 3), 500).priority).toBe(-1);
    // A Move worth more than a routine one (an attack's approach) stands.
    expect(moveValue(state, at(6, 2), at(6, 3), 1000).priority).toBe(1000);
  });

  it("lets a Move end beside a Mass that guards a center (the siege)", () => {
    // A Mass beside the Cult's capital (2, 8): on its Doorstep.
    let state = scene([own("KNIGHT", 5, 9)]);
    state = summon(state, at(3, 7), "MASS");
    // (3, 8) is beside both the Mass and the center; (4, 6) only the Mass.
    expect(moveValue(state, at(5, 9), at(3, 8), 500).priority).toBe(500);
    expect(moveValue(state, at(5, 9), at(4, 6), 500).priority).toBe(-1);
  });

  it("spends no blow on a Mass it cannot kill when it can break a strand instead", () => {
    // The Marksman reaches the Mass on (4, 3) and the Initiate on (4, 1)
    // that channels it.
    let state = scene([own("MARKSMAN", 6, 2), cult("FIGHTER", 4, 1)]);
    state = summon(state, at(4, 3), "MASS");
    state = withStrandsV7(state, at(4, 3), [at(4, 1)]);
    expect(attack(state, at(6, 2), at(4, 3))).toBeUndefined();
    expect(attack(state, at(6, 2), at(4, 3), false)).toBeDefined();
    // With the channeller out of reach the shot on the Mass is offered.
    let far = scene([own("MARKSMAN", 6, 2), cult("FIGHTER", 1, 3)]);
    far = summon(far, at(4, 3), "MASS");
    far = withStrandsV7(far, at(4, 3), [at(1, 3)]);
    expect(attack(far, at(6, 2), at(4, 3))).toBeDefined();
    // A strand to a Mass on its Doorstep breaks nothing: no reason to spare
    // the Mass (on (3, 7), beside the Cult's capital).
    let home = scene([own("MARKSMAN", 5, 6), cult("FIGHTER", 3, 5)]);
    home = summon(home, at(3, 7), "MASS");
    home = withStrandsV7(home, at(3, 7), [at(3, 5)]);
    expect(attack(home, at(5, 6), at(3, 5))).toBeDefined();
    expect(attack(home, at(5, 6), at(3, 7))).toBeDefined();
  });
});

describe("against the new Cult: Swarm (A-R4)", () => {
  // Two Imps on (5, 3) and (6, 3), held by one strand (Brood).
  const pack = (pieces: readonly GoblinPieceV7[]): GameStateV7 => {
    let state = scene([...pieces, cult("FIGHTER", 3, 4)]);
    state = summon(state, at(5, 3), "IMP");
    state = summon(state, at(6, 3), "IMP");
    return withStrandsV7(state, at(5, 3), [at(3, 4)]);
  };
  const swarmed = (tile: CoordV7): boolean =>
    gap(tile, at(5, 3)) === 1 && gap(tile, at(6, 3)) === 1;

  it("ends no routine Move beside two of a hostile seat's Imps", () => {
    const state = pack([own("GUARD", 7, 1)]);
    expect(moves(state, at(7, 1)).some((move) => swarmed(move.to))).toBe(false);
    expect(moves(state, at(7, 1), false).some((move) => swarmed(move.to))).toBe(
      true,
    );
    // Beside one Imp is no Swarm.
    expect(moveValue(state, at(7, 1), at(7, 2), 500).priority).toBe(500);
  });

  it("lets a Move into the pack stand when its attack from there kills one", () => {
    // A Fighter kills an Imp (6 HP) at a blow: the Swarm is broken.
    const state = pack([own("FIGHTER", 6, 1)]);
    expect(moveValue(state, at(6, 1), at(6, 2), 500).priority).toBe(500);
    // A Guard that does not kill one there is kept out at a routine
    // priority.
    const guard = pack([own("GUARD", 7, 1)]);
    expect(moveValue(guard, at(7, 1), at(6, 2), 500).priority).toBe(-1);
  });

  it("steps a unit beside two Imps away, after its attacks", () => {
    const state = pack([
      own("GUARD", 6, 2, { activation: { attacked: true, attacksUsed: 1 } }),
    ]);
    const out = moveValue(state, at(6, 2), at(7, 1), 500);
    expect(out).toMatchObject({
      priority: CULT_AGAINST_PULL_BACK_PRIORITY_V7,
      forced: true,
    });
    // A step that stays beside both is no way out.
    expect(moveValue(state, at(6, 2), at(5, 2), 500).priority).toBe(500);
    expect(
      moves(state, at(6, 2), false).some(
        (move) => move.priority === CULT_AGAINST_PULL_BACK_PRIORITY_V7,
      ),
    ).toBe(false);
  });
});

describe("against the new Cult: Star-fall's joiners (A-R4)", () => {
  // A star of the Stargazer on (2, 2) with two chanters, marked on (6, 2):
  // 12 damage to the own unit there; with one chanter fewer, 9.
  const star = (target: GoblinPieceV7): GameStateV7 =>
    withRitualV7(
      scene([
        target,
        own("MARKSMAN", 5, 5),
        cult("CATAPULT", 2, 2),
        cult("FIGHTER", 3, 3),
        cult("FIGHTER", 1, 2),
      ]),
      "STARFALL",
      at(2, 2),
      [at(3, 3), at(1, 2)],
      at(6, 2),
    );
  const gain = (state: GameStateV7): number =>
    (attack(state, at(5, 5), at(3, 3))?.score.strategicValue ?? 0) -
    (attack(state, at(5, 5), at(3, 3), false)?.score.strategicValue ?? 0);

  it("hits a joiner first when the 3 it takes off the star saves an own unit", () => {
    // A Fighter at full HP dies under 12 and lives under 9.
    const state = star(own("FIGHTER", 6, 2));
    const joiner = facts(state)?.chanters.get(unitAtV7(state, at(3, 3)).id);
    expect(joiner).toMatchObject({ ends: false, relief: 3, saves: true });
    expect(attack(state, at(5, 5), at(3, 3))?.score.priority).toBe(
      CULT_AGAINST_STAR_HIT_PRIORITY_V7,
    );
    expect(
      attack(state, at(5, 5), at(3, 3), false)?.score.priority,
    ).toBeLessThan(CULT_AGAINST_STAR_HIT_PRIORITY_V7);
  });

  it("values a joiner at the Hit Points it spares when no unit is saved", () => {
    // A Guard lives under 12 as under 9: 3 Hit Points spared (twice, and 2).
    const sturdy = star(own("GUARD", 6, 2));
    expect(
      facts(sturdy)?.chanters.get(unitAtV7(sturdy, at(3, 3)).id),
    ).toMatchObject({ relief: 3, saves: false });
    expect(gain(sturdy)).toBe(8);
    expect(attack(sturdy, at(5, 5), at(3, 3))?.score.priority).toBeLessThan(
      CULT_AGAINST_STAR_HIT_PRIORITY_V7,
    );
    // A unit that dies under 9 as under 12 is spared nothing (a chanter is
    // still worth 2).
    const doomed = star(own("FIGHTER", 6, 2, { hp: 5 }));
    expect(
      facts(doomed)?.chanters.get(unitAtV7(doomed, at(3, 3)).id),
    ).toMatchObject({ relief: 0, saves: false });
    expect(gain(doomed)).toBe(2);
  });
});

describe("against the new Cult: the Herald's Hunger (A-R4)", () => {
  // A Herald on (5, 2) held by three strands (its Control), three tiles
  // from the Guard and from each channeller.
  const herald = (favour: number, summoner = false): GameStateV7 => {
    let state = scene([
      own("GUARD", 8, 2),
      cult("FIGHTER", 2, 1),
      cult(summoner ? "CAPTAIN" : "FIGHTER", 2, 2),
      cult("FIGHTER", 2, 3),
    ]);
    state = summon(state, at(5, 2), "HERALD");
    state = withStrandsV7(state, at(5, 2), [at(2, 1), at(2, 2), at(2, 3)]);
    return withFavourV7(state, 1, favour);
  };
  const hungry = (state: GameStateV7) =>
    facts(state)?.daemons.get(unitAtV7(state, at(5, 2)).id);

  it("reads a Herald its seat cannot feed as about to break", () => {
    expect(hungry(herald(1))).toMatchObject({ hungry: true, short: true });
    expect(hungry(herald(2))).toMatchObject({ hungry: false, short: false });
    // The trickle of a Summoner whose strand holds is paid first.
    expect(hungry(herald(1, true))).toMatchObject({ hungry: false });
  });

  it("keeps out of a hungry Herald's eye mark", () => {
    const near = (move: { readonly to: CoordV7 }) =>
      gap(move.to, at(5, 2)) <= 2;
    expect(moves(herald(1), at(8, 2)).some(near)).toBe(false);
    expect(moves(herald(2), at(8, 2)).some(near)).toBe(true);
  });
});

describe("against the new Cult: the four-step eye mark (A-R4)", () => {
  // A Horror on (5, 2) with no strand: it breaks loose next.
  const loose = (pieces: readonly GoblinPieceV7[]): GameStateV7 =>
    summon(scene(pieces), at(5, 2), "HORROR");

  it("goes for a cultist within 2 before a nearer unit", () => {
    const state = loose([own("GUARD", 6, 2), cult("FIGHTER", 3, 2)]);
    const view = viewOf(state);
    const horror = unitAtV7(state, at(5, 2));
    const daemon = facts(state)?.daemons.get(horror.id);
    const guard = ownUnitOf(state, at(6, 2));
    if (daemon === undefined) throw new Error("the scene is not as built");
    const rampage = previewRampageV7(view, horror.id);
    expect(rampage).toMatchObject({
      targetUnitId: unitAtV7(state, at(3, 2)).id,
      step: 1,
    });
    expect(cultAgainstEyeMarkedV7(view, daemon, guard, guard.at)).toBe(false);
    // Three tiles off, the cultist is just anyone: the Guard is nearest.
    const far = loose([own("GUARD", 6, 2), cult("FIGHTER", 2, 2)]);
    const farDaemon = facts(far)?.daemons.get(unitAtV7(far, at(5, 2)).id);
    if (farDaemon === undefined) throw new Error("the scene is not as built");
    expect(
      cultAgainstEyeMarkedV7(viewOf(far), farDaemon, guard, guard.at),
    ).toBe(true);
  });

  it("goes for anyone in reach before a summon", () => {
    // A bound Imp of the Cult beside the Horror, the Guard two tiles off.
    let state = loose([own("GUARD", 7, 2), cult("FIGHTER", 2, 1)]);
    state = summon(state, at(4, 1), "IMP");
    state = withStrandsV7(state, at(4, 1), [at(2, 1)]);
    const view = viewOf(state);
    const horror = unitAtV7(state, at(5, 2));
    const daemon = facts(state)?.daemons.get(horror.id);
    if (daemon === undefined) throw new Error("the scene is not as built");
    const guard = ownUnitOf(state, at(7, 2));
    expect(previewRampageV7(view, horror.id)?.targetUnitId).toBe(guard.id);
    expect(cultAgainstEyeMarkedV7(view, daemon, guard, guard.at)).toBe(true);
  });
});
