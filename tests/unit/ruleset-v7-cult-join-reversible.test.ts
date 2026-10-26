import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  chantsLeftByCommandV7,
  queryAiReadyCommandsV7,
  queryIdleRecoveryV7,
  ritualChantersV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type PlayerId,
} from "../../src/engine/index";
import { cultFieldV7 } from "../fixtures/v7-cult";
import {
  endTurnUntilV7,
  seatIdV7,
  unitAtV7,
  type GoblinPieceV7,
} from "../fixtures/v7-goblin-arena";
import { offeredV7, playV7 } from "../fixtures/v7-martian";
import { at, kindsV7, patchUnitV7 } from "../fixtures/v7-revision20";

/**
 * Join the chant, reversible like Wait (`pulp_wars-mch9.61`; the user,
 * 2026-10-26: "just as with the 'wait' action - this should be reversible.
 * the player can still change their mind and direct the unit to do
 * something else"). A join spends nothing and only marks the joiner
 * handled; any other order to it in that turn takes it out of the chant
 * first (`CHANT_LEFT`), and the star counts the chanters that still hold
 * when it falls at the Cult's next Start Turn.
 *
 * Every state is built by hand on the two-seat field of `cultFieldV7`
 * (seat 0 the Cult, seat 1 Human); no match is played. The Cult's roles:
 * `FIGHTER` Initiate, `CATAPULT` Stargazer, `CAPTAIN` Summoner.
 */

function need<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("missing");
  return value;
}

const cultId = (state: GameStateV7): PlayerId => seatIdV7(state, 0);
const idAt = (state: GameStateV7, where: CoordV7) => unitAtV7(state, where).id;
const unitOf = (state: GameStateV7, unitId: number) =>
  need(state.units.find((unit) => unit.id === unitId));
const eventsOf = <K extends DomainEventV7["kind"]>(
  events: readonly DomainEventV7[],
  kind: K,
): Extract<DomainEventV7, { kind: K }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: K }> =>
      event.kind === kind,
  );

/** Star A: the Stargazer on (5, 2) marks (5, 6). */
const GAZER = at(5, 2);
const STAR = at(5, 6);
/** Star B: a second Stargazer on (7, 2) marks (7, 6). */
const SECOND_GAZER = at(7, 2);
const SECOND_STAR = at(7, 6);
const WEST = at(4, 2);
/** Beside both Stargazers. */
const BETWEEN = at(6, 2);

const begin = (
  state: GameStateV7,
  gazer: CoordV7 = GAZER,
  mark: CoordV7 = STAR,
): GameStateV7 =>
  playV7(state, {
    kind: "BEGIN_RITUAL",
    ritual: "STARFALL",
    unitId: idAt(state, gazer),
    at: mark,
  }).state;

const join = (
  state: GameStateV7,
  where: CoordV7,
  gazer: CoordV7 = GAZER,
): CommandV7 => ({
  kind: "JOIN_CHANT",
  unitId: idAt(state, where),
  leaderUnitId: idAt(state, gazer),
});

const chantersOf = (state: GameStateV7, gazer: CoordV7 = GAZER) =>
  need(
    state.cult.rituals.find(
      (ritual) => ritual.leaderUnitId === idAt(state, gazer),
    ),
  ).chanterUnitIds;

/** The star of `pieces` begun, and the Initiate on `WEST` joined. */
function joinedField(pieces: readonly GoblinPieceV7[] = []): {
  readonly before: GameStateV7;
  readonly joined: GameStateV7;
} {
  const field = cultFieldV7([
    { seat: 0, role: "CATAPULT", at: GAZER },
    { seat: 0, role: "FIGHTER", at: WEST },
    { seat: 1, role: "FIGHTER", at: STAR },
    ...pieces,
  ]);
  const before = begin(field);
  return { before, joined: playV7(before, join(before, WEST)).state };
}

describe("joining a chant spends nothing (pulp_wars-mch9.61)", () => {
  it("only marks the joiner handled, as a Wait does", () => {
    const { before, joined } = joinedField();
    const joiner = idAt(joined, WEST);
    expect(unitOf(joined, joiner).activation).toEqual({
      ...unitOf(before, joiner).activation,
      handled: true,
    });
    expect(chantersOf(joined)).toEqual([joiner]);
  });

  it("keeps a join that is never countermanded, and the star counts it", () => {
    // A hurt joiner: chanting is its action, so it does not idle-recover.
    const { joined } = joinedField();
    const hurt = patchUnitV7(joined, WEST, { hp: 3 });
    const joiner = idAt(hurt, WEST);
    expect(
      queryIdleRecoveryV7(hurt, cultId(hurt)).map((entry) => entry.unitId),
    ).not.toContain(joiner);
    const round = endTurnUntilV7(hurt, cultId(hurt));
    expect(
      eventsOf(round.events, "UNIT_RECOVERED").map((event) => event.unitId),
    ).not.toContain(joiner);
    expect(eventsOf(round.events, "STAR_FELL")).toMatchObject([
      { chanters: 1, damage: 9 },
    ]);
  });
});

describe("another order takes the joiner out of the chant (pulp_wars-mch9.61)", () => {
  it("leaves the chant before a Move, and the star falls without it", () => {
    const { joined } = joinedField();
    const joiner = idAt(joined, WEST);
    const move = need(
      offeredV7(joined, "MOVE").find(
        (command) => command.kind === "MOVE" && command.unitId === joiner,
      ),
    );
    const moved = playV7(joined, move);
    expect(moved.events[0]).toEqual({
      kind: "CHANT_LEFT",
      playerId: cultId(joined),
      unitId: joiner,
      leaderUnitId: idAt(joined, GAZER),
      damage: 6,
    });
    expect(kindsV7(moved.events)).toContain("UNIT_MOVED");
    // No disruption: it left by its own order.
    expect(kindsV7(moved.events)).not.toContain("RITUAL_DISRUPTED");
    expect(chantersOf(moved.state)).toEqual([]);
    expect(unitOf(moved.state, joiner).activation.moved).toBe(true);
    const round = endTurnUntilV7(moved.state, cultId(moved.state));
    expect(eventsOf(round.events, "STAR_FELL")).toMatchObject([
      { chanters: 0, damage: 6 },
    ]);
  });

  it("leaves the chant before an attack, with the attack judged as if it never joined", () => {
    const { joined } = joinedField([
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
    ]);
    const joiner = idAt(joined, WEST);
    const attack: CommandV7 = {
      kind: "ATTACK",
      unitId: joiner,
      targetUnitId: idAt(joined, at(3, 2)),
    };
    const struck = playV7(joined, attack);
    expect(struck.events[0]?.kind).toBe("CHANT_LEFT");
    expect(kindsV7(struck.events)).toContain("COMBAT_RESOLVED");
    expect(chantersOf(struck.state)).toEqual([]);
    expect(unitOf(struck.state, joiner).activation.attacked).toBe(true);
  });

  it("switches to another star: out of the first chant, into the second", () => {
    const field = cultFieldV7([
      { seat: 0, role: "CATAPULT", at: GAZER },
      { seat: 0, role: "CATAPULT", at: SECOND_GAZER },
      { seat: 0, role: "FIGHTER", at: BETWEEN },
      { seat: 1, role: "FIGHTER", at: STAR },
    ]);
    const both = begin(begin(field), SECOND_GAZER, SECOND_STAR);
    const joiner = idAt(both, BETWEEN);
    const first = playV7(both, join(both, BETWEEN)).state;
    // The same star again is refused; the other star is offered.
    const joins = offeredV7(first, "JOIN_CHANT").filter(
      (command) => command.kind === "JOIN_CHANT" && command.unitId === joiner,
    );
    expect(joins).toEqual([join(first, BETWEEN, SECOND_GAZER)]);
    const switched = playV7(first, join(first, BETWEEN, SECOND_GAZER));
    expect(switched.events).toEqual([
      {
        kind: "CHANT_LEFT",
        playerId: cultId(first),
        unitId: joiner,
        leaderUnitId: idAt(first, GAZER),
        damage: 6,
      },
      {
        kind: "CHANT_JOINED",
        playerId: cultId(first),
        unitId: joiner,
        leaderUnitId: idAt(first, SECOND_GAZER),
        damage: 9,
      },
    ]);
    expect(chantersOf(switched.state)).toEqual([]);
    expect(chantersOf(switched.state, SECOND_GAZER)).toEqual([joiner]);
    expect(unitOf(switched.state, joiner).activation.handled).toBe(true);
  });

  it("keeps the join when the order is refused", () => {
    const { joined } = joinedField();
    const joiner = idAt(joined, WEST);
    const refused = applyCommandV7(joined, cultId(joined), {
      kind: "MOVE",
      unitId: joiner,
      path: [WEST, at(9, 9)],
    });
    expect(refused.accepted).toBe(false);
    expect(refused.state).toBe(joined);
    expect(chantersOf(refused.state)).toEqual([joiner]);
  });

  it("is not taken back by Wait, Promote, Disband, or a join of the same star", () => {
    const { joined } = joinedField();
    const joiner = idAt(joined, WEST);
    const rituals = joined.cult.rituals;
    for (const command of [
      { kind: "WAIT", unitId: joiner },
      { kind: "PROMOTE", unitId: joiner },
      { kind: "DISBAND", unitId: joiner },
      join(joined, WEST),
    ] satisfies CommandV7[])
      expect(
        chantsLeftByCommandV7(rituals, cultId(joined), command),
        command.kind,
      ).toEqual([]);
    expect(
      chantsLeftByCommandV7(rituals, cultId(joined), {
        kind: "RECOVER",
        unitId: joiner,
      }),
    ).toEqual([{ unitId: joiner, leaderUnitId: idAt(joined, GAZER) }]);
    // Another seat's order never touches the Cult's chant.
    expect(
      chantsLeftByCommandV7(rituals, seatIdV7(joined, 1), {
        kind: "RECOVER",
        unitId: joiner,
      }),
    ).toEqual([]);
  });
});

describe("the joins others read (pulp_wars-mch9.61)", () => {
  it("keeps a joiner out of a Great Summoning's circle", () => {
    // A Summoner on (5, 4): the cultist on (5, 3) stands beside it and the
    // Stargazer.
    const field = cultFieldV7([
      { seat: 0, role: "CATAPULT", at: GAZER },
      { seat: 0, role: "CAPTAIN", at: at(5, 4) },
      { seat: 0, role: "FIGHTER", at: at(5, 3) },
      { seat: 1, role: "FIGHTER", at: at(5, 7) },
    ]);
    const begun = begin(field, GAZER, at(2, 2));
    const summoner = unitAtV7(begun, at(5, 4));
    const cultist = idAt(begun, at(5, 3));
    expect(
      ritualChantersV7(begun, begun.units, summoner).map((unit) => unit.id),
    ).toEqual([cultist]);
    const joined = playV7(begun, join(begun, at(5, 3))).state;
    expect(ritualChantersV7(joined, joined.units, summoner)).toEqual([]);
  });

  it("offers the Normal AI no order that would take a joiner out of its chant", () => {
    const { before, joined } = joinedField([
      { seat: 1, role: "FIGHTER", at: at(3, 2) },
    ]);
    const joiner = idAt(joined, WEST);
    const byJoiner = (state: GameStateV7) =>
      queryAiReadyCommandsV7(viewForV7(state, cultId(state)))
        .map((item) => item.command)
        .filter((command) => "unitId" in command && command.unitId === joiner)
        .map((command) => command.kind);
    expect(byJoiner(before)).toEqual(
      expect.arrayContaining(["MOVE", "ATTACK", "JOIN_CHANT"]),
    );
    // Its Move and attack are still offered to the player...
    expect(
      offeredV7(joined).some(
        (command) => command.kind === "ATTACK" && command.unitId === joiner,
      ),
    ).toBe(true);
    // ...but the AI sees only what keeps the chant.
    for (const kind of byJoiner(joined))
      expect(["WAIT", "PROMOTE", "DISBAND"]).toContain(kind);
  });
});
