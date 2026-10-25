import { describe, expect, it } from "vitest";
import { activeMissionDirectiveV7 } from "../../src/ai/v7-directives";
import {
  DOMAIN_EVENT_KIND_ORDER_V7,
  MISSION_REGISTRY_V7,
  MISSION_WAVE_REACH_V7,
  PRIOR_RULESET_7_IDS,
  RULESET_7_ID,
  SAVE_STORAGE_KEY_V7,
  applyCommandV7,
  arePlayersAlliedV7,
  canonicalHash,
  createPlayableGameV7,
  forbiddenTechnologiesV7,
  generatedMissionLayersV7,
  missionByIdV7,
  missionHasGoalsV7,
  missionMapDriftV7,
  missionMapLayersV7,
  missionMatchSetupV7,
  missionOutcomeV7,
  missionSeatFactionsV7,
  missionStatusV7,
  missionTaggedUnitsV7,
  parseGameStateV7,
  unitSightRadiusAtV7,
  validateMissionDefinitionV7,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type MissionDefinitionV7,
  type PlayerId,
  type UnitId,
} from "../../src/engine/index";
import { OBSOLETE_SAVE_STORAGE_KEYS_V7 } from "../../src/persistence/index";
import {
  missionMarkersV7,
  missionOutcomeLineV7,
  missionStarGoalsV7,
  missionTrackerV7,
} from "../../src/render/mission-presentation-v7";

// Mission objectives (`pulp_wars-v642.1`, `pulp-wars-poc-7r82`;
// docs/product/CAMPAIGN.md section 10, RULESET_7_CURRENT.md section 2.6):
// each objective kind's win, loss and edges, the order of the two, the
// clock, teams, reinforcements, a seat's own forbidden technologies, the
// directive schedule, the public status, the board marks and the tracker,
// and the natural maps. Every state is a mission's initial state with a few
// units or cities moved by hand; the only commands applied are End Turns.

function definition(id: string): MissionDefinitionV7 {
  const mission = missionByIdV7(id);
  if (mission === null) throw new Error(`${id} is not registered`);
  return mission;
}

function start(id: string, faction?: FactionIdV7): GameStateV7 {
  const mission = definition(id);
  const setup = missionMatchSetupV7(
    mission,
    faction ?? missionSeatFactionsV7(mission.seats[0] as never)[0],
  );
  if (setup === null) throw new Error(`${id}: no setup`);
  const created = createPlayableGameV7(setup);
  if (!created.ok) throw new Error(created.error.code);
  return created.state;
}

function tagged(state: GameStateV7, tag: string): UnitId {
  const mission = definition(state.setup.mission?.id ?? "");
  const id = missionTaggedUnitsV7(mission, state.setup).get(tag);
  if (id === undefined) throw new Error(`no unit tagged ${tag}`);
  return id;
}

const at = (x: number, y: number): CoordV7 => ({ x, y });

function moved(state: GameStateV7, id: UnitId, to: CoordV7): GameStateV7 {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, at: to } : unit,
    ),
  };
}

function killed(state: GameStateV7, ...ids: UnitId[]): GameStateV7 {
  return {
    ...state,
    units: state.units.filter((unit) => !ids.includes(unit.id)),
  };
}

function cityTaken(state: GameStateV7, where: CoordV7, by: PlayerId) {
  return {
    ...state,
    cities: state.cities.map((city) =>
      city.at.x === where.x && city.at.y === where.y
        ? { ...city, ownerId: by }
        : city,
    ),
  };
}

function seatId(state: GameStateV7, seat: number): PlayerId {
  const player = state.players[seat];
  if (player === undefined) throw new Error(`no seat ${String(seat)}`);
  return player.id;
}

/** The outcome after a command that left the round as it was. */
function decided(after: GameStateV7, actor = after.humanPlayerId) {
  return missionOutcomeV7({ round: after.round }, after, actor);
}

/** The outcome after the command that ended round `ended`. */
function decidedAtRoundEnd(after: GameStateV7, ended: number, actor: PlayerId) {
  return missionOutcomeV7(
    { round: ended },
    { ...after, round: ended + 1 },
    actor,
  );
}

/** Ends turns, seat after seat, until the match ends or `rounds` have gone. */
function endTurns(
  state: GameStateV7,
  rounds: number,
): { readonly state: GameStateV7; readonly events: readonly DomainEventV7[] } {
  let current = state;
  const events: DomainEventV7[] = [];
  const stopAt = state.round + rounds;
  while (current.outcome === null && current.round < stopAt) {
    const actor = current.turnOrder[current.activeSeatIndex] as PlayerId;
    const applied = applyCommandV7(current, actor, { kind: "END_TURN" });
    if (!applied.accepted) throw new Error(applied.error.code);
    events.push(...applied.events);
    current = applied.state;
  }
  return { state: current, events };
}

describe("the identity", () => {
  // Objectives decide a match's outcome, an outcome carries its cause, a
  // seat may be forbidden technologies of its own, a mission may bring
  // reinforcements (a new event kind) and name teams: 7r82.
  it("was 7r82 after 7r81, both save keys obsolete now", () => {
    expect(PRIOR_RULESET_7_IDS.slice(-34, -32)).toEqual([
      "pulp-wars-poc-7r81",
      "pulp-wars-poc-7r82",
    ]);
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.slice(-34, -32)).toEqual([
      "pulpWars.save.v7r81.current",
      "pulpWars.save.v7r82.current",
    ]);
    expect(DOMAIN_EVENT_KIND_ORDER_V7.at(-2)).toBe("REINFORCEMENT_ARRIVED");
    expect(DOMAIN_EVENT_KIND_ORDER_V7.at(-1)).toBe("MATCH_ENDED");
  });
  // A wave arrives with its turn spent and never beside a hostile unit
  // (`pulp_wars-v642.5`): 7r83, a prior identity since 7r84
  // (`pulp_wars-5ti.13`).
  it("was 7r83 after 7r82, its save key obsolete now", () => {
    expect(PRIOR_RULESET_7_IDS.at(-32)).toBe("pulp-wars-poc-7r83");
    expect(OBSOLETE_SAVE_STORAGE_KEYS_V7.at(-32)).toBe(
      "pulpWars.save.v7r83.current",
    );
    expect(RULESET_7_ID).toBe("pulp-wars-poc-7r115");
    expect(SAVE_STORAGE_KEY_V7).toBe("pulpWars.save.v7r115.current");
  });
});

describe("ESCORT", () => {
  it("is won when the escorted unit stands within the distance of the place", () => {
    const state = start("TEST_ESCORT");
    const envoy = tagged(state, "ENVOY");
    expect(decided(state)).toBeNull();
    // The gate is at (2, 2) and `within` is 1: two tiles away is not there.
    expect(decided(moved(state, envoy, at(2, 4)))).toBeNull();
    expect(decided(moved(state, envoy, at(3, 3)))).toEqual({
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      cause: "ESCORT_ARRIVED",
    });
  });

  it("is not won by another unit, nor by the escorted unit in other hands", () => {
    const state = start("TEST_ESCORT");
    const envoy = tagged(state, "ENVOY");
    const other = state.units.find(
      (unit) => unit.ownerId === state.humanPlayerId && unit.id !== envoy,
    );
    if (other === undefined) throw new Error("no second unit");
    expect(decided(moved(state, other.id, at(3, 3)))).toBeNull();
    const taken = moved(state, envoy, at(3, 3));
    expect(
      decided({
        ...taken,
        units: taken.units.map((unit) =>
          unit.id === envoy ? { ...unit, ownerId: seatId(state, 1) } : unit,
        ),
      }),
    ).toBeNull();
  });

  it("is lost when the escorted unit dies, by whoever killed it", () => {
    const state = start("TEST_ESCORT");
    const goblin = seatId(state, 1);
    const dead = killed(state, tagged(state, "ENVOY"));
    expect(decided(dead, goblin)).toEqual({
      kind: "DEFEAT",
      humanId: state.humanPlayerId,
      defeatedByPlayerId: goblin,
      cause: "ESCORT_LOST",
    });
    // Its own owner's command (a Kaboom, say): the first hostile seat.
    expect(decided(dead, state.humanPlayerId)).toMatchObject({
      defeatedByPlayerId: goblin,
      cause: "ESCORT_LOST",
    });
  });

  it("reports the steps to go, the place and the unit in the public status", () => {
    const state = start("TEST_ESCORT");
    const envoy = tagged(state, "ENVOY");
    const status = missionStatusV7(state);
    expect(status).toMatchObject({
      missionId: "TEST_ESCORT",
      kind: "ESCORT",
      clock: null,
      // From (2, 7) to within 1 of (2, 2).
      escortDistance: 4,
      places: [{ tag: "GATE", at: at(2, 2), role: "DESTINATION", held: false }],
      units: [{ tag: "ENVOY", unitId: envoy, role: "ESCORT", alive: true }],
      stars: null,
    });
    expect(missionStatusV7(moved(state, envoy, at(2, 3)))?.escortDistance).toBe(
      0,
    );
    expect(missionStatusV7(killed(state, envoy))).toMatchObject({
      escortDistance: null,
      units: [{ tag: "ENVOY", alive: false }],
    });
  });
});

describe("SURVIVE", () => {
  it("is won by the End Turn that ends the last round, not before", () => {
    const state = start("TEST_SURVIVE");
    expect(missionStatusV7(state)?.clock).toEqual({
      kind: "SURVIVE",
      lastRound: 3,
      roundsLeft: 3,
    });
    const two = endTurns(state, 2).state;
    expect(two.round).toBe(3);
    expect(two.outcome).toBeNull();
    expect(missionStatusV7(two)?.clock?.roundsLeft).toBe(1);
    // The human's own End Turn of round 3 does not end the round.
    const mine = applyCommandV7(two, two.humanPlayerId, { kind: "END_TURN" });
    if (!mine.accepted) throw new Error(mine.error.code);
    expect(mine.state.outcome).toBeNull();
    const done = endTurns(two, 1);
    expect(done.state.outcome).toEqual({
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      cause: "SURVIVED",
    });
    expect(done.events.at(-1)).toMatchObject({ kind: "MATCH_ENDED" });
    expect(parseGameStateV7(done.state)).not.toBeNull();
    // One star: the fixture has no secondary goal.
    expect(missionStatusV7(done.state)?.stars).toBe(1);
  });

  it("is lost when the protected place changes hands", () => {
    const state = start("TEST_SURVIVE");
    const goblin = seatId(state, 1);
    const fallen = cityTaken(state, at(2, 8), goblin);
    // The capture of the human's last city is the ordinary defeat, decided
    // before the objective is asked; here the human keeps a second city.
    const second = {
      ...fallen,
      cities: [
        ...fallen.cities,
        {
          ...(fallen.cities[0] as GameStateV7["cities"][number]),
          id: 99 as never,
          at: at(8, 8),
          ownerId: state.humanPlayerId,
          isCapital: false,
        },
      ],
    };
    expect(decided(second, goblin)).toEqual({
      kind: "DEFEAT",
      humanId: state.humanPlayerId,
      defeatedByPlayerId: goblin,
      cause: "PLACE_LOST",
    });
    expect(missionStatusV7(second)?.places).toEqual([
      { tag: "KEEP", at: at(2, 8), role: "PROTECT", held: false },
    ]);
  });

  it("judges the win before the loss in one command", () => {
    const state = start("TEST_SURVIVE");
    const goblin = seatId(state, 1);
    const fallen = cityTaken(state, at(2, 8), goblin);
    expect(decidedAtRoundEnd(fallen, 3, goblin)).toMatchObject({
      kind: "VICTORY",
      cause: "SURVIVED",
    });
    expect(decidedAtRoundEnd(fallen, 2, goblin)).toMatchObject({
      kind: "DEFEAT",
      cause: "PLACE_LOST",
    });
  });
});

describe("reinforcements", () => {
  it("arrive at their seat's Start Turn of the round, on or beside their tile, homeless", () => {
    const state = start("TEST_SURVIVE");
    const goblin = seatId(state, 1);
    const before = new Set(state.units.map((unit) => unit.id));
    // Round 1 has none.
    const first = applyCommandV7(state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!first.accepted) throw new Error(first.error.code);
    expect(
      first.events.some((event) => event.kind === "REINFORCEMENT_ARRIVED"),
    ).toBe(false);
    const two = endTurns(state, 1);
    expect(two.state.round).toBe(2);
    // Round 2: the human's Start Turn brings nothing; the Goblins' brings
    // two Fighters, the second beside the first.
    const mine = applyCommandV7(two.state, state.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!mine.accepted) throw new Error(mine.error.code);
    const arrived = mine.events.filter(
      (event) => event.kind === "REINFORCEMENT_ARRIVED",
    );
    expect(
      arrived.map((event) =>
        event.kind === "REINFORCEMENT_ARRIVED"
          ? [event.playerId, event.role, event.at]
          : null,
      ),
    ).toEqual([
      [goblin, "FIGHTER", at(5, 5)],
      [goblin, "FIGHTER", at(4, 4)],
    ]);
    const fresh = mine.state.units.filter((unit) => !before.has(unit.id));
    expect(fresh).toHaveLength(2);
    for (const unit of fresh) {
      expect(unit.ownerId).toBe(goblin);
      expect(unit.homeCityId).toBeNull();
      expect(unit.hp).toBe(unit.maxHp);
    }
    expect(parseGameStateV7(mine.state)).not.toBeNull();
    // Round 3: the relief Guard, beside the occupied capital.
    const three = endTurns(mine.state, 1);
    const relief = three.events.filter(
      (event) =>
        event.kind === "REINFORCEMENT_ARRIVED" &&
        event.playerId === state.humanPlayerId,
    );
    expect(relief).toHaveLength(1);
    expect(relief[0]).toMatchObject({ role: "GUARD" });
  });

  it("are the same on a replay", () => {
    const run = (): string =>
      canonicalHash(endTurns(start("TEST_SURVIVE"), 3).state);
    expect(run()).toBe(run());
  });

  // `pulp_wars-v642.5` (7r83): a wave arrives with its turn spent, and
  // never beside a unit of a seat hostile to it.
  it("arrive with their turn spent: no move and no attack until their next turn", () => {
    const two = endTurns(start("TEST_SURVIVE"), 1).state;
    const before = new Set(two.units.map((unit) => unit.id));
    const mine = applyCommandV7(two, two.humanPlayerId, { kind: "END_TURN" });
    if (!mine.accepted) throw new Error(mine.error.code);
    const goblin = seatId(two, 1);
    const fresh = mine.state.units.filter((unit) => !before.has(unit.id));
    expect(fresh).toHaveLength(2);
    for (const unit of fresh) {
      expect(unit.activation).toMatchObject({
        moved: true,
        attacked: true,
        handled: true,
      });
      const step = applyCommandV7(mine.state, goblin, {
        kind: "MOVE",
        unitId: unit.id,
        to: at(unit.at.x, unit.at.y + 1),
      } as never);
      expect(step.accepted).toBe(false);
    }
    // At the seat's next Start Turn they act like any other unit.
    const next = endTurns(mine.state, 1).state;
    const goblinTurn = applyCommandV7(next, next.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!goblinTurn.accepted) throw new Error(goblinTurn.error.code);
    for (const unit of goblinTurn.state.units.filter((item) =>
      fresh.some((arrived) => arrived.id === item.id),
    ))
      expect(unit.activation.moved).toBe(false);
  });

  it("arrive on the nearest free tile that is not beside a hostile unit", () => {
    const two = endTurns(start("TEST_SURVIVE"), 1).state;
    const human = two.humanPlayerId;
    const first = two.units.find((unit) => unit.ownerId === human);
    if (first === undefined) throw new Error("TEST_SURVIVE has no human unit");
    // Two human units stand on the written tile's ring: (5, 6) and (6, 4).
    const placed: GameStateV7 = {
      ...two,
      nextEntityId: two.nextEntityId + 1,
      units: [
        ...two.units.map((unit) =>
          unit.id === first.id ? { ...unit, at: at(5, 6) } : unit,
        ),
        { ...first, id: two.nextEntityId as UnitId, at: at(6, 4) },
      ],
    };
    const mine = applyCommandV7(placed, human, { kind: "END_TURN" });
    if (!mine.accepted) throw new Error(mine.error.code);
    const tiles = mine.events.flatMap((event) =>
      event.kind === "REINFORCEMENT_ARRIVED" ? [event.at] : [],
    );
    expect(tiles).toHaveLength(2);
    const hostiles = mine.state.units.filter(
      (unit) => unit.ownerId === human && unit.hp > 0,
    );
    const steps = (a: CoordV7, b: CoordV7): number =>
      Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
    for (const tile of tiles)
      for (const unit of hostiles)
        expect(steps(tile, unit.at)).toBeGreaterThan(1);
    // The written tile is beside (5, 6); of its ring only the corner (4, 4)
    // is beside neither, and the second Fighter goes a ring further out,
    // (y, x) order: the corner (3, 3).
    expect(tiles).toEqual([at(4, 4), at(3, 3)]);
    // The same walk on a replay.
    const again = applyCommandV7(placed, human, { kind: "END_TURN" });
    if (!again.accepted) throw new Error(again.error.code);
    expect(canonicalHash(again.state)).toBe(canonicalHash(mine.state));
  });

  // `pulp_wars-hmyk.17`: like a starting unit, an arriving one never stands
  // on ground its seat has not explored.
  it("reveal their sight for their own seat as they arrive", () => {
    const two = endTurns(start("TEST_SURVIVE"), 1).state;
    const goblin = seatId(two, 1);
    // The Goblins have forgotten the middle of the board.
    const middle = (at: CoordV7): boolean =>
      at.x >= 2 && at.x <= 8 && at.y >= 2 && at.y <= 8;
    const blind: GameStateV7 = {
      ...two,
      players: two.players.map((player) =>
        player.id === goblin
          ? {
              ...player,
              explored: player.explored.filter((at) => !middle(at)),
            }
          : player,
      ),
    };
    const before = new Set(blind.units.map((unit) => unit.id));
    const mine = applyCommandV7(blind, blind.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!mine.accepted) throw new Error(mine.error.code);
    const fresh = mine.state.units.filter((unit) => !before.has(unit.id));
    expect(fresh).toHaveLength(2);
    const explored = new Set(
      mine.state.players
        .find((player) => player.id === goblin)
        ?.explored.map((at) => `${String(at.x)},${String(at.y)}`),
    );
    const revealed = mine.events.flatMap((event) =>
      event.kind === "TILES_REVEALED" && event.playerId === goblin
        ? event.tiles
        : [],
    );
    for (const unit of fresh) {
      const radius = unitSightRadiusAtV7(mine.state, unit);
      expect(radius).toBeGreaterThan(0);
      for (let dy = -radius; dy <= radius; dy += 1)
        for (let dx = -radius; dx <= radius; dx += 1) {
          const at = { x: unit.at.x + dx, y: unit.at.y + dy };
          expect(explored.has(`${String(at.x)},${String(at.y)}`)).toBe(true);
          if (middle(at)) expect(revealed).toContainEqual(at);
        }
    }
  });
});

// `pulp_wars-hmyk.35`: a wave keeps clear of hostile units only within
// MISSION_WAVE_REACH_V7 tiles of its written tiles. With no calm tile there
// it is held and tried again at its seat's next Start Turn, and two rounds
// after its own it comes regardless, on the nearest free tile.
describe("reinforcements held back", () => {
  /** `state` with copies of the seat's first unit, homeless, on `tiles`. */
  function withCopiesOf(
    state: GameStateV7,
    seat: number,
    tiles: readonly CoordV7[],
  ): GameStateV7 {
    const owner = seatId(state, seat);
    const model = state.units.find((unit) => unit.ownerId === owner);
    if (model === undefined) throw new Error(`seat ${String(seat)}: no unit`);
    return {
      ...state,
      nextEntityId: state.nextEntityId + tiles.length,
      units: [
        ...state.units,
        ...tiles.map((tile, index) => ({
          ...model,
          id: (state.nextEntityId + index) as UnitId,
          homeCityId: null,
          at: tile,
        })),
      ],
    };
  }

  /** End Turns until the Start Turn of `seat` in `round` has happened. */
  function untilTurnOf(
    state: GameStateV7,
    seat: number,
    round: number,
  ): { readonly state: GameStateV7; readonly events: DomainEventV7[] } {
    let current = state;
    let events: DomainEventV7[] = [];
    const player = seatId(state, seat);
    while (!(
      current.round === round &&
      current.turnOrder[current.activeSeatIndex] === player
    )) {
      const actor = current.turnOrder[current.activeSeatIndex] as PlayerId;
      const applied = applyCommandV7(current, actor, { kind: "END_TURN" });
      if (!applied.accepted) throw new Error(applied.error.code);
      events = [...applied.events];
      current = applied.state;
    }
    return { state: current, events };
  }

  const steps = (a: CoordV7, b: CoordV7): number =>
    Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

  /**
   * TEST_WAVES, three seats (you, the allied Undead, the Goblins): Goblin
   * Fighters beside every tile within 3 of the Undead wave's tiles (6, 7)
   * and (7, 6), so it has no calm tile within reach; the old search went
   * out to the board's corners.
   */
  const BLOCKERS = [4, 7, 10].flatMap((x) => [4, 7, 10].map((y) => at(x, y)));
  const blocked = (extra: readonly CoordV7[] = []): GameStateV7 =>
    withCopiesOf(start("TEST_WAVES"), 2, [...BLOCKERS, ...extra]);

  it("come within the reach of their tile when it is blocked", () => {
    expect(MISSION_WAVE_REACH_V7).toBe(3);
    // TEST_SURVIVE: four human Guards make every tile within 2 of the
    // Goblin wave's (5, 5) a tile beside them; ring 3 has calm tiles.
    const two = endTurns(start("TEST_SURVIVE"), 1).state;
    const placed = withCopiesOf(two, 0, [
      at(4, 4),
      at(4, 6),
      at(6, 4),
      at(6, 6),
    ]);
    const mine = applyCommandV7(placed, placed.humanPlayerId, {
      kind: "END_TURN",
    });
    if (!mine.accepted) throw new Error(mine.error.code);
    const arrived = mine.events.flatMap((event) =>
      event.kind === "REINFORCEMENT_ARRIVED" ? [event] : [],
    );
    // Ring 3 in (y, x) order: (2, 2) is a village, then (3, 2), (4, 2).
    expect(arrived.map((event) => event.at)).toEqual([at(3, 2), at(4, 2)]);
    expect(arrived.map((event) => event.wave)).toEqual([0, 0]);
    for (const event of arrived) expect(steps(event.at, at(5, 5))).toBe(3);
    expect(mine.state.heldWaves).toBeUndefined();
  });

  it("are held with no calm tile within reach, and come the next round", () => {
    const state = blocked();
    const round2 = untilTurnOf(state, 1, 2);
    expect(
      round2.events.some((event) => event.kind === "REINFORCEMENT_ARRIVED"),
    ).toBe(false);
    expect(round2.state.heldWaves).toEqual([0]);
    expect(parseGameStateV7(round2.state)).not.toBeNull();
    // The Goblins' own wave of round 2 is not held up.
    const goblins = untilTurnOf(round2.state, 2, 2);
    expect(
      goblins.events.filter((event) => event.kind === "REINFORCEMENT_ARRIVED"),
    ).toHaveLength(3);
    expect(goblins.state.heldWaves).toEqual([0]);
    // The Goblins march off before the Undead's next Start Turn.
    const human3 = untilTurnOf(goblins.state, 0, 3);
    const cleared: GameStateV7 = {
      ...human3.state,
      units: human3.state.units.filter(
        (unit) => !BLOCKERS.some((tile) => steps(tile, unit.at) === 0),
      ),
    };
    const round3 = untilTurnOf(cleared, 1, 3);
    const arrived = round3.events.flatMap((event) =>
      event.kind === "REINFORCEMENT_ARRIVED" ? [event] : [],
    );
    expect(arrived.map((event) => [event.at, event.wave])).toEqual([
      [at(6, 7), 0],
      [at(7, 6), 0],
    ]);
    expect(round3.state.heldWaves).toBeUndefined();
    expect("heldWaves" in round3.state).toBe(false);
  });

  it("come regardless two rounds after their own, on the nearest free tile", () => {
    // A Goblin on (6, 7) too: the first Undead Fighter's own tile is taken.
    const state = blocked([at(6, 7)]);
    const round3 = untilTurnOf(state, 1, 3);
    expect(
      round3.events.some((event) => event.kind === "REINFORCEMENT_ARRIVED"),
    ).toBe(false);
    expect(round3.state.heldWaves).toEqual([0]);
    const round4 = untilTurnOf(round3.state, 1, 4);
    const arrived = round4.events.flatMap((event) =>
      event.kind === "REINFORCEMENT_ARRIVED" ? [event] : [],
    );
    // Beside Goblins now, but never on one: (6, 7) is taken, so the ring
    // round it in (y, x) order gives (5, 6); (7, 6) is free.
    expect(arrived.map((event) => event.at)).toEqual([at(5, 6), at(7, 6)]);
    const goblin = seatId(state, 2);
    for (const event of arrived) {
      expect(
        round4.state.units.filter(
          (unit) => unit.hp > 0 && steps(unit.at, event.at) === 0,
        ),
      ).toHaveLength(1);
      expect(
        round4.state.units.some(
          (unit) => unit.ownerId === goblin && steps(unit.at, event.at) === 1,
        ),
      ).toBe(true);
    }
    expect(round4.state.heldWaves).toBeUndefined();
  });

  it("are the same on a replay, and a stored hold is checked", () => {
    const run = (): string =>
      canonicalHash(untilTurnOf(blocked([at(6, 7)]), 1, 4).state);
    expect(run()).toBe(run());
    const held = untilTurnOf(blocked(), 1, 2).state;
    expect(canonicalHash(parseGameStateV7(held))).toBe(canonicalHash(held));
    // Empty, out of range, or not strictly ascending: refused.
    for (const heldWaves of [[], [3], [0, 0], [1, 0], [-1], [0.5]])
      expect(parseGameStateV7({ ...held, heldWaves })).toBeNull();
    expect(parseGameStateV7({ ...held, heldWaves: [0, 2] })).not.toBeNull();
    // A mission without waves holds nothing.
    const plain = start("TEST_ESCORT");
    expect(parseGameStateV7({ ...plain, heldWaves: [0] })).toBeNull();
  });
});

describe("CAPTURE, a deadline, and an ally", () => {
  it("makes the allied seat an ally and the third seat an enemy, whatever the mode", () => {
    const state = start("TEST_CAPTURE");
    const [human, ally, enemy] = [0, 1, 2].map((seat) =>
      seatId(state, seat),
    ) as [PlayerId, PlayerId, PlayerId];
    expect(state.setup.aiMode).toBe("RIVAL");
    expect(arePlayersAlliedV7(state, human, ally)).toBe(true);
    expect(arePlayersAlliedV7(state, ally, human)).toBe(true);
    expect(arePlayersAlliedV7(state, human, enemy)).toBe(false);
    expect(arePlayersAlliedV7(state, ally, enemy)).toBe(false);
    // A mission without teams keeps the mode's rule.
    const plain = start("TEST_ESCORT");
    expect(
      arePlayersAlliedV7(plain, plain.humanPlayerId, seatId(plain, 1)),
    ).toBe(false);
    // The ally's units are not attack targets of the human's commands.
    const view = viewForV7(state, human);
    expect(view.mission?.places).toEqual([
      { tag: "OUTPOST", at: at(5, 3), role: "CAPTURE", held: false },
      { tag: "ALLY_HOME", at: at(8, 8), role: "PROTECT", held: true },
    ]);
  });

  it("is won when the human or the ally owns every named place", () => {
    const state = start("TEST_CAPTURE");
    expect(decided(state)).toBeNull();
    for (const seat of [0, 1])
      expect(
        decided(cityTaken(state, at(5, 3), seatId(state, seat))),
        `seat ${String(seat)}`,
      ).toEqual({
        kind: "VICTORY",
        winnerId: state.humanPlayerId,
        cause: "PLACES_CAPTURED",
      });
  });

  it("is lost at the end of the last round, not a round earlier, and won on the last command", () => {
    const state = start("TEST_CAPTURE");
    const enemy = seatId(state, 2);
    expect(missionStatusV7(state)?.clock).toEqual({
      kind: "DEADLINE",
      lastRound: 4,
      roundsLeft: 4,
    });
    expect(decidedAtRoundEnd(state, 3, enemy)).toBeNull();
    expect(decidedAtRoundEnd(state, 4, enemy)).toEqual({
      kind: "DEFEAT",
      humanId: state.humanPlayerId,
      defeatedByPlayerId: enemy,
      cause: "OUT_OF_TIME",
    });
    // Captured by the very command that ends the last round: a win.
    expect(
      decidedAtRoundEnd(
        cityTaken(state, at(5, 3), state.humanPlayerId),
        4,
        enemy,
      ),
    ).toMatchObject({ kind: "VICTORY", cause: "PLACES_CAPTURED" });
    // Played out: four rounds of End Turns end in the defeat.
    const played = endTurns(state, 4).state;
    expect(played.outcome).toMatchObject({
      kind: "DEFEAT",
      cause: "OUT_OF_TIME",
    });
    expect(played.round).toBe(5);
  });

  it("is lost when the ally's protected city falls, and won when every enemy is gone", () => {
    const state = start("TEST_CAPTURE");
    const enemy = seatId(state, 2);
    expect(decided(cityTaken(state, at(8, 8), enemy), enemy)).toMatchObject({
      kind: "DEFEAT",
      cause: "PLACE_LOST",
    });
    // The ally stays active: only the hostile seat has to be eliminated.
    const cleared = {
      ...state,
      players: state.players.map((player) =>
        player.id === enemy
          ? { ...player, status: "ELIMINATED" as const }
          : player,
      ),
    };
    expect(decided(cleared)).toEqual({
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      cause: "ENEMIES_ELIMINATED",
    });
  });

  it("counts the stars at the victory: one, plus each secondary goal that holds", () => {
    const state = start("TEST_CAPTURE");
    const won = (after: GameStateV7): GameStateV7 => ({
      ...after,
      outcome: {
        kind: "VICTORY",
        winnerId: state.humanPlayerId,
        cause: "PLACES_CAPTURED",
      },
    });
    expect(missionStatusV7(state)?.stars).toBeNull();
    expect(missionStatusV7(won(state))?.stars).toBe(2);
    expect(
      missionStatusV7(won(cityTaken(state, at(8, 8), seatId(state, 2))))?.stars,
    ).toBe(1);
    // UNDEAD_3: by round 16 and with both own towns.
    const chapter = start("UNDEAD_3");
    const chapterWon = (after: GameStateV7): GameStateV7 => ({
      ...after,
      outcome: { kind: "VICTORY", winnerId: after.humanPlayerId },
    });
    expect(missionStatusV7(chapterWon(chapter))?.stars).toBe(3);
    expect(missionStatusV7(chapterWon({ ...chapter, round: 17 }))?.stars).toBe(
      2,
    );
    const town = definition("UNDEAD_3").seats[0]?.cities[1]?.at as CoordV7;
    expect(
      missionStatusV7(
        chapterWon(
          cityTaken({ ...chapter, round: 17 }, town, seatId(chapter, 1)),
        ),
      )?.stars,
    ).toBe(1);
    // A defeat has no stars.
    expect(
      missionStatusV7({
        ...chapter,
        outcome: {
          kind: "DEFEAT",
          humanId: chapter.humanPlayerId,
          defeatedByPlayerId: seatId(chapter, 1),
        },
      })?.stars,
    ).toBeNull();
  });
});

describe("KILL", () => {
  it("is won when every target is dead, lost when a protected unit dies, the win first", () => {
    const state = start("TEST_KILL");
    const boss = tagged(state, "BOSS");
    const hero = tagged(state, "HERO");
    const goblin = seatId(state, 1);
    expect(decided(state)).toBeNull();
    expect(decided(killed(state, boss))).toEqual({
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      cause: "TARGETS_KILLED",
    });
    expect(decided(killed(state, hero), goblin)).toEqual({
      kind: "DEFEAT",
      humanId: state.humanPlayerId,
      defeatedByPlayerId: goblin,
      cause: "UNIT_LOST",
    });
    expect(decided(killed(state, boss, hero), goblin)).toMatchObject({
      kind: "VICTORY",
      cause: "TARGETS_KILLED",
    });
  });

  it("counts a target at 0 hit points as dead and one swallowed by an Abomination as alive", () => {
    const state = start("TEST_KILL");
    const boss = tagged(state, "BOSS");
    const zero = {
      ...state,
      units: state.units.map((unit) =>
        unit.id === boss ? { ...unit, hp: 0 } : unit,
      ),
    };
    expect(decided(zero)).toMatchObject({ cause: "TARGETS_KILLED" });
    const record = state.units.find((unit) => unit.id === boss);
    if (record === undefined) throw new Error("no boss");
    const swallowed = {
      ...killed(state, boss),
      giants: {
        ...state.giants,
        swallowed: [{ unit: record }] as never,
      },
    };
    expect(decided(swallowed)).toBeNull();
    expect(missionStatusV7(swallowed)?.units).toEqual([
      { tag: "BOSS", unitId: boss, role: "KILL", alive: true },
      {
        tag: "HERO",
        unitId: tagged(state, "HERO"),
        role: "PROTECT",
        alive: true,
      },
    ]);
  });
});

describe("a mission without goals", () => {
  it("keeps the ordinary elimination rule and still has a public status", () => {
    const grounds = definition("TEST_GROUNDS");
    expect(missionHasGoalsV7(grounds)).toBe(false);
    expect(missionHasGoalsV7(definition("HUMAN_1"))).toBe(true);
    const state = start("TEST_GROUNDS");
    const cleared = {
      ...state,
      players: state.players.map((player) =>
        player.id === state.humanPlayerId
          ? player
          : { ...player, status: "ELIMINATED" as const },
      ),
    };
    expect(decided(cleared)).toBeNull();
    expect(missionStatusV7(state)).toEqual({
      missionId: "TEST_GROUNDS",
      kind: "DOMINATION",
      clock: null,
      escortDistance: null,
      places: [],
      units: [],
      bonus: [],
      stars: null,
    });
  });

  it("decides nothing once the match has an outcome", () => {
    const state = start("TEST_KILL");
    const over: GameStateV7 = {
      ...killed(state, tagged(state, "BOSS")),
      outcome: {
        kind: "DEFEAT",
        humanId: state.humanPlayerId,
        defeatedByPlayerId: seatId(state, 1),
      },
    };
    expect(decided(over)).toBeNull();
  });
});

describe("the public status and the saved outcome", () => {
  it("is the same for every viewer, is in every mission view, and in no other", () => {
    const state = start("TEST_CAPTURE");
    const views = state.players.map((player) => viewForV7(state, player.id));
    for (const view of views)
      expect(view.mission).toEqual(missionStatusV7(state));
    expect(views[0]?.mission?.missionId).toBe("TEST_CAPTURE");
    // The same state gives the same status, key for key.
    expect(canonicalHash(missionStatusV7(state))).toBe(
      canonicalHash(missionStatusV7(start("TEST_CAPTURE"))),
    );
  });

  it("round-trips an outcome with its cause, and refuses a cause of the wrong side", () => {
    const state = start("TEST_KILL");
    const victory = (cause: string) =>
      parseGameStateV7({
        ...state,
        outcome: {
          kind: "VICTORY",
          winnerId: state.humanPlayerId,
          cause,
        } as never,
      });
    expect(victory("TARGETS_KILLED")?.outcome).toEqual({
      kind: "VICTORY",
      winnerId: state.humanPlayerId,
      cause: "TARGETS_KILLED",
    });
    expect(victory("OUT_OF_TIME")).toBeNull();
    expect(victory("NO_SUCH_CAUSE")).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        outcome: {
          kind: "DEFEAT",
          humanId: state.humanPlayerId,
          defeatedByPlayerId: seatId(state, 1),
          cause: "SURVIVED",
        } as never,
      }),
    ).toBeNull();
  });
});

describe("a seat's own forbidden technologies and its directive schedule", () => {
  it("forbids the AI seat's list to that seat alone", () => {
    // The Kessler Hall finale: the Goblin seat's own long list.
    const state = start("HUMAN_6");
    const everyone = forbiddenTechnologiesV7(state.setup);
    const human = forbiddenTechnologiesV7(state.setup, 0);
    const goblins = forbiddenTechnologiesV7(state.setup, 1);
    expect(everyone.has("SHORECRAFT")).toBe(true);
    expect(everyone.has("ENGINEERING")).toBe(false);
    expect([...human.keys()].sort()).toEqual([...everyone.keys()].sort());
    expect(goblins.has("SHORECRAFT")).toBe(true);
    for (const technology of [
      "ENGINEERING",
      "MARKSMANSHIP",
      "SCOUTING",
    ] as const)
      expect(goblins.has(technology), technology).toBe(true);
    // The Goblin seat is refused the research; the human is not offered it
    // as forbidden.
    const goblin = seatId(state, 1);
    const turned = {
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(goblin),
      players: state.players.map((player) =>
        player.id === goblin ? { ...player, coins: 99 } : player,
      ),
    };
    const refused = applyCommandV7(turned, goblin, {
      kind: "RESEARCH",
      technologyId: "SCOUTING",
    } as never);
    expect(refused.accepted).toBe(false);
  });

  it("plays the schedule's first entry whose rounds hold the round", () => {
    const state = start("TEST_SURVIVE");
    const goblin = seatId(state, 1);
    const kind = (round: number): string | null =>
      activeMissionDirectiveV7(viewForV7({ ...state, round }, goblin))?.kind ??
      null;
    expect([1, 2, 3].map(kind)).toEqual(["HOLD", "RUSH", "RUSH"]);
    // The human's seat has no directive.
    expect(
      activeMissionDirectiveV7(viewForV7(state, state.humanPlayerId)),
    ).toBeNull();
  });
});

describe("definition validity", () => {
  const edited = (
    id: string,
    change: (mission: MissionDefinitionV7) => Partial<MissionDefinitionV7>,
  ): MissionDefinitionV7 => {
    const base = JSON.parse(
      JSON.stringify(definition(id)),
    ) as MissionDefinitionV7;
    return { ...base, ...change(base) };
  };

  it("accepts every registered mission, whose objective names only what the mission has", () => {
    for (const mission of MISSION_REGISTRY_V7) {
      expect(
        () => validateMissionDefinitionV7(mission),
        mission.id,
      ).not.toThrow();
      // Every tag resolves to a unit of the built state, for every choice.
      for (const faction of missionSeatFactionsV7(mission.seats[0] as never)) {
        const state = start(mission.id, faction);
        const status = missionStatusV7(state);
        expect(status?.missionId).toBe(mission.id);
        for (const unit of status?.units ?? [])
          expect(
            state.units.some((candidate) => candidate.id === unit.unitId),
            `${mission.id} ${unit.tag}`,
          ).toBe(true);
        for (const place of status?.places ?? [])
          expect(
            state.board.tiles.some(
              (tile) => tile.at.x === place.at.x && tile.at.y === place.at.y,
            ),
            `${mission.id} ${place.tag}`,
          ).toBe(true);
        expect((mission.objective.bonus ?? []).length).toBeLessThanOrEqual(2);
      }
    }
  });

  it("refuses an objective that names nothing, a hostile escort, bad teams and bad waves", () => {
    const cases: readonly (readonly [string, MissionDefinitionV7])[] = [
      [
        "no landmark",
        edited("TEST_ESCORT", (mission) => ({
          objective: { ...mission.objective, to: "NOWHERE" } as never,
        })),
      ],
      [
        "no unit",
        edited("TEST_ESCORT", (mission) => ({
          objective: { ...mission.objective, unit: "NOBODY" } as never,
        })),
      ],
      [
        "escort distance",
        edited("TEST_ESCORT", (mission) => ({
          objective: { ...mission.objective, within: 3 } as never,
        })),
      ],
      [
        "survive with a deadline",
        edited("TEST_SURVIVE", (mission) => ({
          objective: { ...mission.objective, byRound: 5 } as never,
        })),
      ],
      [
        "survive one round",
        edited("TEST_SURVIVE", (mission) => ({
          objective: { ...mission.objective, rounds: 1 } as never,
        })),
      ],
      [
        "capture your own city",
        edited("TEST_CAPTURE", (mission) => ({
          objective: { ...mission.objective, places: ["ALLY_HOME"] } as never,
        })),
      ],
      [
        "kill your own unit",
        edited("TEST_KILL", (mission) => ({
          objective: { ...mission.objective, units: ["HERO"] } as never,
        })),
      ],
      [
        "three secondary goals",
        edited("TEST_ESCORT", (mission) => ({
          objective: {
            ...mission.objective,
            bonus: [
              { kind: "KEEP_CITIES" },
              { kind: "KEEP_CITIES" },
              { kind: "KEEP_CITIES" },
            ],
          } as never,
        })),
      ],
      [
        "teams of the wrong length",
        edited("TEST_CAPTURE", () => ({ teams: [0, 1] })),
      ],
      [
        "everyone on one team",
        edited("TEST_CAPTURE", () => ({ teams: [0, 0, 0] })),
      ],
      [
        "a wave in round 1",
        edited("TEST_SURVIVE", (mission) => ({
          reinforcements: [
            {
              ...(mission.reinforcements?.[0] as NonNullable<
                MissionDefinitionV7["reinforcements"]
              >[number]),
              round: 1,
            },
          ],
        })),
      ],
      [
        "a wave for no seat",
        edited("TEST_SURVIVE", (mission) => ({
          reinforcements: [
            {
              ...(mission.reinforcements?.[0] as NonNullable<
                MissionDefinitionV7["reinforcements"]
              >[number]),
              seat: 7,
            },
          ],
        })),
      ],
      [
        "a landmark off the board",
        edited("TEST_ESCORT", () => ({
          landmarks: [{ tag: "GATE", at: at(40, 2) }],
        })),
      ],
      // Story names (`pulp_wars-v642.5`).
      [
        "a story name used twice",
        edited("TEST_CAPTURE", (mission) => ({
          seats: mission.seats.map((seat) => ({
            ...seat,
            cities: seat.cities.map((city) => ({ ...city, name: "Twinford" })),
          })),
        })),
      ],
      [
        "a blank story name",
        edited("TEST_CAPTURE", (mission) => ({
          seats: mission.seats.map((seat, index) =>
            index === 0
              ? {
                  ...seat,
                  cities: seat.cities.map((city) => ({ ...city, name: " " })),
                }
              : seat,
          ),
        })),
      ],
      [
        "a named landmark on a city",
        edited("TEST_CAPTURE", (mission) => ({
          landmarks: (mission.landmarks ?? []).map((landmark) => ({
            ...landmark,
            name: `${landmark.tag.charAt(0)}${landmark.tag.slice(1).toLowerCase()}`,
          })),
        })),
      ],
      [
        "a seat forbidden a technology it starts with",
        edited("TEST_ESCORT", (mission) => ({
          seats: mission.seats.map((seat, index) =>
            index === 0 ? { ...seat, forbiddenTechnologies: ["DRILL"] } : seat,
          ),
        })),
      ],
    ];
    for (const [label, mission] of cases)
      expect(() => validateMissionDefinitionV7(mission), label).toThrow(
        /^Mission TEST_/,
      );
  });
});

describe("natural maps", () => {
  it("rebuilds every registered mission's board from its recorded seed and edits", () => {
    const natural = MISSION_REGISTRY_V7.filter(
      (mission) => mission.source !== undefined,
    );
    // The prologue's ten were the first (`pulp_wars-v642.1`); they were
    // retired with it (`pulp_wars-hmyk.22`).
    expect(natural.map((mission) => mission.id)).toEqual([
      // The Humans campaign (`pulp_wars-hmyk.4`).
      "HUMAN_1",
      "HUMAN_2",
      "HUMAN_3",
      "HUMAN_4",
      "HUMAN_5",
      "HUMAN_6",
      // The Undead campaign (`pulp_wars-hmyk.5`).
      "UNDEAD_1",
      "UNDEAD_2",
      "UNDEAD_3",
      "UNDEAD_4",
      "UNDEAD_5",
      "UNDEAD_6",
      // The Dinosaur campaign (`pulp_wars-hmyk.6`).
      "DINOSAUR_1",
      "DINOSAUR_2",
      "DINOSAUR_3",
      "DINOSAUR_4",
      "DINOSAUR_5",
      "DINOSAUR_6",
      // The Martian campaign (`pulp_wars-hmyk.7`).
      "MARTIAN_1",
      "MARTIAN_2",
      "MARTIAN_3",
      "MARTIAN_4",
      "MARTIAN_5",
      "MARTIAN_6",
      // The Goblin campaign (`pulp_wars-hmyk.8`).
      "GOBLIN_1",
      "GOBLIN_2",
      "GOBLIN_3",
      "GOBLIN_4",
      "GOBLIN_5",
      "GOBLIN_6",
      // The Dwarf campaign (`pulp_wars-hmyk.9`).
      "DWARF_1",
      "DWARF_2",
      "DWARF_3",
      "DWARF_4",
      "DWARF_5",
      "DWARF_6",
      // The Candy campaign (`pulp_wars-hmyk.11`).
      "CANDY_1",
      "CANDY_2",
      "CANDY_3",
      "CANDY_4",
      "CANDY_5",
      "CANDY_6",
      // The Ice Folk campaign (`pulp_wars-hmyk.10`).
      "ICE_FOLK_1",
      "ICE_FOLK_2",
      "ICE_FOLK_3",
      "ICE_FOLK_4",
      "ICE_FOLK_5",
      "ICE_FOLK_6",
      // The Cult campaign (`pulp_wars-hmyk.12`).
      "CULT_1",
      "CULT_2",
      "CULT_3",
      "CULT_4",
      "CULT_5",
      "CULT_6",
    ]);
    for (const mission of MISSION_REGISTRY_V7)
      expect(missionMapDriftV7(mission), mission.id).toEqual([]);
    // The edit lists are small: the board is the generator's (ten edits
    // at most, `pulp_wars-v642.2`: a three-seat board has more villages to
    // take away from the AI seats). The missions below take more.
    const mostEdits: Readonly<Record<string, number>> = {
      // Kessler Hall (`pulp_wars-hmyk.4`): the Baron's plain keeps no
      // villages (thirteen gone, six of them under cities) and the Hall's
      // tile loses its Game; the second retune (`pulp_wars-hmyk.19`) takes
      // four of the six villages on the Frontier's side of the ridge.
      HUMAN_6: 19,
      // The Founder's Tomb (`pulp_wars-hmyk.5`): eleven villages gone (two
      // under towns), a chest, and the Lodge's and Ashby Camp's fields.
      UNDEAD_6: 16,
      // Undead retune 2 (`pulp_wars-hmyk.20`): the villages within reach
      // of the dead's towns go, so the start does not snowball.
      UNDEAD_2: 13,
      UNDEAD_3: 11,
      UNDEAD_4: 12,
      UNDEAD_5: 11,
      // Dinosaur retune 3 (`pulp_wars-hmyk.21`): the villages and chests
      // within reach of your town are gone, so the big top's roustabouts
      // and the Barrowlands' dead do not meet an easy start; retune 4
      // (`pulp_wars-hmyk.27`) gives two villages back to each.
      DINOSAUR_4: 12,
      DINOSAUR_5: 11,
      // The Candy campaign (`pulp_wars-hmyk.11`): Riftwatch's crack and
      // eight villages (four under cities); the lake of the Commissioner
      // keeps one village (the island raised, thirteen gone, two under
      // cities: nobody grows while the ships fight); the long night's four
      // seats stand on seven villages and four more are gone.
      CANDY_2: 11,
      CANDY_3: 14,
      CANDY_6: 11,
      // Retune 3 (`pulp_wars-hmyk.21`): the villages by the player's start
      // go; retune 4 (`pulp_wars-hmyk.31`) gives some back (I4 is within
      // ten again, I5 has three of the snowfield's back).
      ICE_FOLK_5: 12,
      // The Winter Crown (`pulp_wars-hmyk.10`): the four seats stand on five
      // villages and the ones round the slopes and the barrows are gone, so
      // neither the Lodge nor the dead grows a free town (retune 4: the old
      // Ember Lodge's village behind Rime Camp is back).
      ICE_FOLK_6: 15,
      // The Long Night (`pulp_wars-hmyk.12`): the Lodge's, the Pact's and
      // the dead's nine towns stand on villages, and nine more between them
      // are gone, so the night is a battle and not a land rush.
      CULT_6: 18,
    };
    const terrainEdits: Readonly<Record<string, number>> = {
      // The Rangers' fields on the summit and Ashby Camp's cleared wood.
      UNDEAD_6: 3,
      // The Rift between Saucer Field and the scrap camps (`pulp_wars-hmyk.7`).
      MARTIAN_1: 3,
      // The diggers' cave cleared in the shaft wall (`pulp_wars-hmyk.9`).
      DWARF_3: 1,
      // The crack beside the library at Riftwatch, and the Crown's island
      // fort raised out of the lake (`pulp_wars-hmyk.11`).
      CANDY_2: 3,
      CANDY_3: 1,
    };
    for (const mission of natural) {
      const source = mission.source as NonNullable<
        MissionDefinitionV7["source"]
      >;
      expect(source.edits.length, mission.id).toBeLessThanOrEqual(
        mostEdits[mission.id] ?? 10,
      );
      expect(source.size).toBe(mission.size);
      expect(source.seats).toBe(mission.seats.length);
      // Terrain is changed where a mission's story needs it (a neck, a
      // Rift, a clearing); every other edit removes a village, a chest or a
      // resource (`pulp_wars-hmyk.4`: the Pearls the Redcaps cashed in H5,
      // the Game under Kessler Hall in H6).
      expect(
        source.edits.filter((edit) => edit.kind === "TERRAIN").length,
        mission.id,
      ).toBe(terrainEdits[mission.id] ?? 0);
      expect(
        source.edits.every(
          (edit) =>
            edit.kind === "TERRAIN" ||
            (edit.kind === "RESOURCE" && edit.resource === ".") ||
            ((edit.kind === "VILLAGE" || edit.kind === "CHEST") &&
              !edit.present),
        ),
        mission.id,
      ).toBe(true);
    }
  });

  it("reports a board that no longer matches its source", () => {
    // Signal from Home: a Rift of three tiles cut into the generator's
    // board (`pulp_wars-hmyk.7`).
    const mission = definition("MARTIAN_1");
    const terrain = [...mission.terrain];
    const first = terrain[0] as string;
    terrain[0] = `${first.startsWith("~") ? "." : "~"}${first.slice(1)}`;
    expect(missionMapDriftV7({ ...mission, terrain })).not.toEqual([]);
    const source = mission.source as NonNullable<MissionDefinitionV7["source"]>;
    expect(
      missionMapDriftV7({ ...mission, source: { ...source, seed: 7 } }),
    ).not.toEqual([]);
    expect(
      missionMapDriftV7({
        ...mission,
        terrain,
        source: { ...source, frozen: true },
      }),
    ).toEqual([]);
    // The generator alone, without the edits, has no Rift there.
    const raw = generatedMissionLayersV7(source);
    expect(raw.terrain[4]?.slice(5, 8)).not.toBe("xxx");
    expect(missionMapLayersV7(source).terrain[4]?.slice(5, 8)).toBe("xxx");
  });
});

describe("how the objective is shown", () => {
  it("builds the tracker: the line, one counter, and urgency near a deadline", () => {
    const capture = start("TEST_CAPTURE");
    const view = viewForV7(capture, capture.humanPlayerId);
    expect(missionTrackerV7(view)).toEqual({
      missionId: "TEST_CAPTURE",
      icon: "flag",
      line: "Capture outpost by turn 4.",
      counter: "4 turns",
      urgent: false,
      description: "Objective: Capture outpost by turn 4. 4 turns left.",
    });
    const late = viewForV7({ ...capture, round: 4 }, capture.humanPlayerId);
    expect(missionTrackerV7(late)).toMatchObject({
      counter: "1 turn",
      urgent: true,
    });
    const escort = start("TEST_ESCORT");
    expect(
      missionTrackerV7(viewForV7(escort, escort.humanPlayerId)),
    ).toMatchObject({
      icon: "move",
      counter: "4 steps",
      description: "Objective: Bring envoy to gate. 4 steps to go.",
    });
    // A chapter mission uses the campaign's own line.
    const chapter = start("HUMAN_2");
    expect(
      missionTrackerV7(viewForV7(chapter, chapter.humanPlayerId)),
    ).toMatchObject({
      line: "Take the three toll forts by turn 30.",
      counter: "30 turns",
    });
    // A mission without goals still has its line; no mission, no tracker.
    const plain = start("TEST_GROUNDS");
    expect(
      missionTrackerV7(viewForV7(plain, plain.humanPlayerId)),
    ).toMatchObject({ line: "Capture every enemy city.", counter: null });
    expect(missionTrackerV7({})).toBeNull();
  });

  it("marks places and the named units the viewer sees, and nothing once the match is over", () => {
    const state = start("TEST_KILL");
    const view = viewForV7(state, state.humanPlayerId);
    expect(missionMarkersV7(view)).toEqual([
      { kind: "TARGET", at: at(5, 5), on: "UNIT", label: "boss" },
      { kind: "ESCORT", at: at(4, 6), on: "UNIT", label: "hero" },
    ]);
    // A target out of sight has no mark.
    const boss = tagged(state, "BOSS");
    const unseen = {
      ...view,
      units: view.units.filter((unit) => unit.id !== boss),
    };
    expect(missionMarkersV7(unseen).map((mark) => mark.label)).toEqual([
      "hero",
    ]);
    expect(
      missionMarkersV7({
        ...view,
        outcome: { kind: "VICTORY", winnerId: state.humanPlayerId },
      }),
    ).toEqual([]);
    // A captured place turns from a goal into a place to hold.
    const capture = start("TEST_CAPTURE");
    const held = cityTaken(capture, at(5, 3), capture.humanPlayerId);
    expect(
      missionMarkersV7(viewForV7(held, held.humanPlayerId)).map(
        (mark) => mark.kind,
      ),
    ).toEqual(["DEFEND", "DEFEND"]);
  });

  it("says in one line why a mission ended, and what each star was for", () => {
    const state = start("TEST_KILL");
    const view = viewForV7(state, state.humanPlayerId);
    const ended = (kind: "VICTORY" | "DEFEAT", cause?: string) =>
      missionOutcomeLineV7({
        ...view,
        outcome: (kind === "VICTORY"
          ? { kind, winnerId: state.humanPlayerId, cause }
          : {
              kind,
              humanId: state.humanPlayerId,
              defeatedByPlayerId: seatId(state, 1),
              cause,
            }) as never,
      });
    expect(missionOutcomeLineV7(view)).toBeNull();
    expect(ended("VICTORY", "TARGETS_KILLED")).toBe("Boss is dead.");
    expect(ended("VICTORY", "ENEMIES_ELIMINATED")).toBe(
      "Every enemy is beaten.",
    );
    expect(ended("VICTORY")).toBe("Every enemy is beaten.");
    expect(ended("DEFEAT", "OUT_OF_TIME")).toBe("Out of time.");
    expect(ended("DEFEAT")).toBe("Your last city fell.");
    const lost = viewForV7(
      killed(state, tagged(state, "HERO")),
      state.humanPlayerId,
    );
    expect(
      missionOutcomeLineV7({
        ...lost,
        outcome: {
          kind: "DEFEAT",
          humanId: state.humanPlayerId,
          defeatedByPlayerId: seatId(state, 1),
          cause: "UNIT_LOST",
        },
      }),
    ).toBe("Hero was killed.");
    expect(missionStarGoalsV7("TEST_KILL", null)).toEqual([
      { text: "Win the mission", met: false },
      { text: "Keep hero alive", met: false },
    ]);
    expect(
      missionStarGoalsV7("HUMAN_2", null).map((goal) => goal.text),
    ).toEqual(["Win the mission", "Win by turn 22", "Lose no city"]);
    expect(missionStarGoalsV7("NO_SUCH_MISSION", null)).toEqual([]);
  });
});
