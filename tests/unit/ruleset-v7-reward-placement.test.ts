import { describe, expect, it } from "vitest";
import {
  chooseNormalCommandV7,
  rewardWithArrivalV7,
  scoreCommandV7,
} from "../../src/ai/v7";
import {
  REWARD_ARRIVAL_RADIUS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  isCityBesiegedV7,
  parseEventV7,
  parseGameStateV7,
  previewEconomicV7,
  previewRewardArrivalV7,
  queryPlayerCommandsV7,
  rewardArrivalV7,
  unitId,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import { rewardArrivalNoteV7 } from "../../src/render/blocked-actions-v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { withHorrorV7, withStrandsV7 } from "../fixtures/v7-cult";
import { cityOfV7, rewardStateV7 } from "../fixtures/v7-dinosaur-arena";
import {
  READY_V7,
  applyOkV7,
  endTurnUntilV7,
  goblinArenaV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { at, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * Reward arrival (`pulp_wars-sa3h`; `pulp_wars-spue`, `pulp_wars-rzqf`;
 * docs/product/RULESET_7_CURRENT.md section 4.6), on small hand-built
 * states of the two-seat arena: seat 0's capital is at (8, 8) with the
 * eight tiles around it as its territory, on an 11 by 11 board, so every
 * tile within two of the center is on the board.
 *
 * A reward unit takes the city center. The unit standing there, friend or
 * foe, is pushed to the nearest free tile next to the center (the city's
 * territory first, then (y, x) order), else within two; it keeps its Hit
 * Points and statuses and loses `captureEligible`, which ends a siege.
 * Nothing is killed or damaged. With nowhere to push it (or a unit nothing
 * moves) the reward unit appears beside the city, else it is held.
 */
const CENTER = at(8, 8);
/** Every tile within two of the center but the center, in (y, x) order. */
const AROUND: readonly CoordV7[] = (() => {
  const tiles: CoordV7[] = [];
  for (let y = CENTER.y - 2; y <= CENTER.y + 2; y += 1)
    for (let x = CENTER.x - 2; x <= CENTER.x + 2; x += 1)
      if (x !== CENTER.x || y !== CENTER.y) tiles.push(at(x, y));
  return tiles;
})();
const RING = AROUND.filter(
  (where) => Math.max(Math.abs(where.x - 8), Math.abs(where.y - 8)) === 1,
);

interface Piece {
  readonly seat: number;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
}

/** Adds homeless units to a checked state. */
function withUnits(state: GameStateV7, pieces: readonly Piece[]): GameStateV7 {
  return checkedV7({
    ...state,
    nextEntityId: state.nextEntityId + pieces.length,
    units: [
      ...state.units,
      ...pieces.map((piece, index): UnitStateV7 => {
        const ownerId = seatIdV7(state, piece.seat);
        const faction = state.players.find(
          (player) => player.id === ownerId,
        )?.faction;
        if (faction === undefined) throw new Error("seat missing");
        const rule = effectiveRoleRuleV7(piece.role, faction);
        return {
          id: unitId(state.nextEntityId + index),
          ownerId,
          homeCityId: null,
          role: piece.role,
          form: "LAND",
          at: piece.at,
          hp: rule.maxHp,
          maxHp: rule.maxHp,
          kills: 0,
          veteran: false,
          captureEligible: false,
          activation: READY_V7,
        };
      }),
    ],
  });
}

/** Seat-0 Fighters on every free tile of `tiles` (all within two) but `except`. */
function crowded(
  state: GameStateV7,
  except: readonly CoordV7[] = [],
  tiles: readonly CoordV7[] = AROUND,
): GameStateV7 {
  return withUnits(
    state,
    tiles
      .filter(
        (where) =>
          !except.some((item) => item.x === where.x && item.y === where.y) &&
          !state.units.some(
            (unit) => unit.at.x === where.x && unit.at.y === where.y,
          ),
      )
      .map((where) => ({ seat: 0, role: "FIGHTER", at: where })),
  );
}

/** `state` with the unit on `where` changed by `patch`. */
function patchUnit(
  state: GameStateV7,
  where: CoordV7,
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  return checkedV7({
    ...state,
    units: state.units.map((unit) =>
      unit.at.x === where.x && unit.at.y === where.y
        ? { ...unit, ...patch }
        : unit,
    ),
  });
}

const granted = (
  events: readonly DomainEventV7[],
): readonly Extract<DomainEventV7, { kind: "UNIT_REWARD_GRANTED" }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: "UNIT_REWARD_GRANTED" }> =>
      event.kind === "UNIT_REWARD_GRANTED",
  );

const pushes = (
  events: readonly DomainEventV7[],
): readonly Extract<DomainEventV7, { kind: "UNIT_SPAWN_DISPLACED" }>[] =>
  events.filter(
    (
      event,
    ): event is Extract<DomainEventV7, { kind: "UNIT_SPAWN_DISPLACED" }> =>
      event.kind === "UNIT_SPAWN_DISPLACED",
  );

const kinds = (events: readonly DomainEventV7[]): string[] =>
  events.map((event) => event.kind);

/**
 * Every unit of `before` is in `after` with its Hit Points and everything
 * else; only a pushed unit has a new tile and no capture eligibility.
 */
function unharmed(
  before: GameStateV7,
  after: GameStateV7,
  events: readonly DomainEventV7[],
): void {
  const moved = new Map(
    pushes(events).map((event) => [event.displacedUnitId, event.to]),
  );
  for (const unit of before.units) {
    const to = moved.get(unit.id);
    expect(after.units.find((item) => item.id === unit.id)).toEqual(
      to === undefined || to === null
        ? unit
        : { ...unit, at: to, captureEligible: false },
    );
  }
}

function choose(
  fixture: ReturnType<typeof rewardStateV7>,
  state: GameStateV7 = fixture.state,
): ReturnType<typeof applyOkV7> {
  const result = applyOkV7(state, seatIdV7(state, 0), fixture.command);
  for (const event of result.events) expect(parseEventV7(event).ok).toBe(true);
  expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).toEqual(
    result.state,
  );
  expect(kinds(result.events)).not.toContain("UNIT_DIED");
  for (const event of pushes(result.events)) expect(event.to).not.toBeNull();
  unharmed(state, result.state, result.events);
  return result;
}

const preview = (
  fixture: ReturnType<typeof rewardStateV7>,
  state: GameStateV7 = fixture.state,
) =>
  previewRewardArrivalV7(
    viewForV7(state, seatIdV7(state, 0)),
    fixture.command.cityId,
    fixture.command.reward,
  );

const note = (
  fixture: ReturnType<typeof rewardStateV7>,
  state: GameStateV7 = fixture.state,
) =>
  rewardArrivalNoteV7(
    viewForV7(state, seatIdV7(state, 0)),
    fixture.command.cityId,
    fixture.command.reward,
  );

describe("reward arrival: an own unit on the center", () => {
  it("puts the Militia on the center and pushes the wounded garrison to the first tile of the territory", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    const state = patchUnit(fixture.state, CENTER, { hp: 4 });
    const guard = unitAtV7(state, CENTER);
    expect(preview(fixture, state)).toEqual({
      cityId: fixture.command.cityId,
      reward: "MILITIA",
      role: "FIGHTER",
      at: CENTER,
      pushedUnitId: guard.id,
      pushTo: at(7, 7),
      exact: true,
    });
    expect(note(fixture, state)).toEqual({
      text: `Pushes the ${effectiveRoleRuleV7("GUARD", "ORIGINAL").label} off the city`,
      placement: "PUSH",
    });
    const result = choose(fixture, state);
    const [unit] = granted(result.events);
    expect(unitAtV7(result.state, CENTER)).toMatchObject({
      id: unit?.unitId,
      role: "FIGHTER",
      homeCityId: fixture.command.cityId,
    });
    expect(unitAtV7(result.state, at(7, 7))).toEqual({
      ...guard,
      at: at(7, 7),
    });
    expect(pushes(result.events)).toEqual([
      {
        kind: "UNIT_SPAWN_DISPLACED",
        playerId: seatIdV7(state, 0),
        cityId: fixture.command.cityId,
        spawnedUnitId: unit?.unitId,
        displacedUnitId: guard.id,
        from: CENTER,
        to: at(7, 7),
      },
    ]);
  });

  it("puts the Scouts' Saucer on the center and pushes the Grunt off (MARTIAN_5)", () => {
    const fixture = rewardStateV7("SURVEY", "MARTIAN", [
      { role: "FIGHTER", at: CENTER },
    ]);
    const grunt = unitAtV7(fixture.state, CENTER);
    expect(note(fixture)?.text).toBe("Pushes the Grunt off the city");
    const result = choose(fixture);
    expect(unitAtV7(result.state, CENTER).role).toBe("RAIDER");
    expect(unitAtV7(result.state, at(7, 7)).id).toBe(grunt.id);
    expect(effectiveRoleRuleV7("RAIDER", "MARTIAN").label).toBe("Saucer");
  });

  it("puts the giant on the center and pushes the garrison off", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    const guard = unitAtV7(fixture.state, CENTER);
    expect(preview(fixture)?.pushedUnitId).toBe(guard.id);
    const result = choose(fixture);
    expect(unitAtV7(result.state, CENTER).role).toBe("JUGGERNAUT");
    expect(unitAtV7(result.state, at(7, 7)).id).toBe(guard.id);
  });

  it("pushes a channelling cultist off and breaks its strand, as any push does", () => {
    for (const reward of ["SURVEY", "MILITIA", "JUGGERNAUT"] as const) {
      const fixture = rewardStateV7(reward, "CULT", [
        { role: "GUARD", at: CENTER },
      ]);
      // The Idol Bearer on the center channels a Horror of its seat.
      const state = withStrandsV7(
        withHorrorV7(fixture.state, 0, at(5, 2)),
        at(5, 2),
        [CENTER],
      );
      const cultist = unitAtV7(state, CENTER);
      expect(state.cult.strands).toHaveLength(1);
      const result = choose(fixture, state);
      expect(unitAtV7(result.state, at(7, 7)).id, reward).toBe(cultist.id);
      expect(result.state.cult.strands, reward).toEqual([]);
      expect(kinds(result.events), reward).toContain("STRAND_BROKEN");
      const units = granted(result.events).map((event) => event.unitId);
      // A Cult Militia is two Initiates: the first takes the center, the
      // second the nearest free tile of the territory.
      const tiles = reward === "MILITIA" ? [CENTER, at(8, 7)] : [CENTER];
      expect(
        tiles.map((where) => unitAtV7(result.state, where).id),
        reward,
      ).toEqual(units);
    }
    expect(effectiveRoleRuleV7("RAIDER", "CULT").label).toBe("Familiar");
    expect(effectiveRoleRuleV7("JUGGERNAUT", "CULT").label).toBe(
      "Thing in the Cellar",
    );
  });

  it("still puts the reward unit on a free center, with no line on the card", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL");
    expect(preview(fixture)).toMatchObject({
      at: CENTER,
      pushedUnitId: null,
      pushTo: null,
    });
    const result = choose(fixture);
    expect(unitAtV7(result.state, CENTER).id).toBe(
      granted(result.events)[0]?.unitId,
    );
    expect(pushes(result.events)).toEqual([]);
    expect(note(fixture)).toBeNull();
  });
});

describe("reward arrival: a hostile unit on the center", () => {
  it("pushes the besieger off and ends the siege: it can no longer capture, and the second Goblin goes beside (GOBLIN_4)", () => {
    const fixture = rewardStateV7("MILITIA", "GOBLIN", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    // The besieger took the center by a kill: it may capture next turn.
    const state = patchUnit(fixture.state, CENTER, {
      captureEligible: true,
      hp: 7,
    });
    const besieger = unitAtV7(state, CENTER);
    expect(cityOfV7(state, 0).id).toBe(fixture.command.cityId);
    expect(isCityBesiegedV7(state, cityOfV7(state, 0))).toBe(true);
    expect(preview(fixture, state)).toMatchObject({
      at: CENTER,
      pushedUnitId: besieger.id,
      pushTo: at(7, 7),
    });
    expect(note(fixture, state)?.text).toBe("Pushes the Fighter off the city");
    const result = choose(fixture, state);
    expect(unitAtV7(result.state, at(7, 7))).toEqual({
      ...besieger,
      at: at(7, 7),
      captureEligible: false,
    });
    expect(isCityBesiegedV7(result.state, cityOfV7(result.state, 0))).toBe(
      false,
    );
    const units = granted(result.events).map((event) => event.unitId);
    expect(units).toHaveLength(2);
    expect([CENTER, at(8, 7)].map((w) => unitAtV7(result.state, w).id)).toEqual(
      units,
    );
    // Its owner's turn: no Capture is offered to the pushed unit.
    const foe = seatIdV7(result.state, 1);
    const turn = endTurnUntilV7(result.state, foe);
    expect(
      queryPlayerCommandsV7(viewForV7(turn.state, foe)).some(
        (command) =>
          command.kind === "CAPTURE" && command.unitId === besieger.id,
      ),
    ).toBe(false);
  });

  it("puts the reward beside a besieger nothing moves (a Jawbreaker), and the siege goes on", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      faction: "CANDY",
      pieces: [{ role: "SWORDSMAN", at: CENTER }],
    });
    const jawbreaker = unitAtV7(fixture.state, CENTER);
    expect(effectiveRoleRuleV7("SWORDSMAN", "CANDY").label).toBe("Jawbreaker");
    expect(preview(fixture)).toMatchObject({
      at: at(7, 7),
      pushedUnitId: null,
    });
    expect(note(fixture)).toEqual({
      text: "Appears beside the city",
      placement: "BESIDE",
    });
    const result = choose(fixture);
    expect(pushes(result.events)).toEqual([]);
    expect(unitAtV7(result.state, CENTER)).toEqual(jawbreaker);
    expect(unitAtV7(result.state, at(7, 7)).role).toBe("FIGHTER");
    expect(isCityBesiegedV7(result.state, cityOfV7(result.state, 0))).toBe(
      true,
    );
  });

  it("never rewards a seat for a city it does not own", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    const foe = seatIdV7(fixture.state, 1);
    const result = applyCommandV7(fixture.state, foe, fixture.command);
    expect(result.accepted).toBe(false);
    expect(
      previewRewardArrivalV7(
        viewForV7(fixture.state, foe),
        fixture.command.cityId,
        "MILITIA",
      ),
    ).toBeNull();
  });
});

describe("reward arrival: where the pushed unit goes", () => {
  it("goes within two when no tile next to the center is free: the city's territory first, then (y, x)", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    // Every tile next to the center is taken. Two away, (6, 6) comes
    // first in (y, x) order (a Mountain: seat 0 has Engineering).
    const ring = crowded(fixture.state, [], RING);
    const guard = unitAtV7(ring, CENTER);
    expect(preview(fixture, ring)).toMatchObject({
      at: CENTER,
      pushedUnitId: guard.id,
      pushTo: at(6, 6),
      exact: true,
    });
    const first = choose(fixture, ring);
    expect(unitAtV7(first.state, at(6, 6)).id).toBe(guard.id);
    expect(unitAtV7(first.state, CENTER).role).toBe("FIGHTER");
    // A tile of the territory two away comes before it.
    const grown = patchTileV7(ring, at(10, 8), {
      territoryCityId: fixture.command.cityId,
    });
    expect(preview(fixture, grown)?.pushTo).toEqual(at(10, 8));
    expect(unitAtV7(choose(fixture, grown).state, at(10, 8)).id).toBe(guard.id);
  });

  it("takes a hostile unit's own terrain rule: its Engineering is private, so the preview says when it is not exact", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    const state = crowded(fixture.state, [], RING);
    const besieger = unitAtV7(state, CENTER);
    // Seat 1 has Engineering: the push takes the Mountain at (6, 6). The
    // preview cannot see that and names (7, 6), not exact.
    expect(preview(fixture, state)).toMatchObject({
      at: CENTER,
      pushedUnitId: besieger.id,
      pushTo: at(7, 6),
      exact: false,
    });
    const result = choose(fixture, state);
    expect(unitAtV7(result.state, at(6, 6)).id).toBe(besieger.id);
    expect(unitAtV7(result.state, CENTER).ownerId).toBe(seatIdV7(state, 0));
  });
});

describe("reward arrival: no tile to push to", () => {
  it("leaves the occupant and puts the reward on a farther tile of the territory", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    // Every tile within two is taken; (9, 5), three away, is the city's.
    const state = patchTileV7(crowded(fixture.state), at(9, 5), {
      territoryCityId: fixture.command.cityId,
    });
    const guard = unitAtV7(state, CENTER);
    expect(preview(fixture, state)).toMatchObject({
      at: at(9, 5),
      pushedUnitId: null,
      pushTo: null,
    });
    expect(note(fixture, state)?.text).toBe("Appears beside the city");
    const result = choose(fixture, state);
    expect(pushes(result.events)).toEqual([]);
    expect(unitAtV7(result.state, CENTER)).toEqual(guard);
    expect(unitAtV7(result.state, at(9, 5)).id).toBe(
      granted(result.events)[0]?.unitId,
    );
  });

  const full = () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    return { fixture, state: crowded(fixture.state) };
  };

  it("holds the unit on the city and kills nothing; it appears at a later Start Turn when a tile is free", () => {
    const { fixture, state } = full();
    const own = seatIdV7(state, 0);
    expect(preview(fixture, state)?.at).toBeNull();
    expect(note(fixture, state)?.text).toBe(
      "No room near the city: arrives when a tile is free",
    );
    const result = choose(fixture, state);
    expect(granted(result.events)).toEqual([]);
    expect(pushes(result.events)).toEqual([]);
    expect(result.state.units).toEqual(state.units);
    expect(result.state.nextEntityId).toBe(state.nextEntityId);
    expect(cityOfV7(result.state, 0).heldRewardUnits).toEqual([
      { reachedLevel: 2, role: "FIGHTER" },
    ]);
    // Still no room at its next Start Turn: it stays held.
    const waiting = endTurnUntilV7(result.state, own);
    expect(granted(waiting.events)).toEqual([]);
    expect(cityOfV7(waiting.state, 0).heldRewardUnits).toHaveLength(1);
    // A territory tile and an outer tile free up: it takes the territory
    // tile and leaves the garrison on the center (a held unit never
    // pushes).
    const freed = checkedV7({
      ...waiting.state,
      units: waiting.state.units.filter(
        (unit) =>
          !(unit.at.x === 9 && unit.at.y === 9) &&
          !(unit.at.x === 10 && unit.at.y === 10),
      ),
    });
    const arrived = endTurnUntilV7(freed, own);
    const [event] = granted(arrived.events);
    expect(event).toMatchObject({
      playerId: own,
      cityId: fixture.command.cityId,
      reachedLevel: 2,
      role: "FIGHTER",
    });
    expect(pushes(arrived.events)).toEqual([]);
    for (const item of arrived.events) expect(parseEventV7(item).ok).toBe(true);
    expect(unitAtV7(arrived.state, at(9, 9))).toMatchObject({
      id: event?.unitId,
      role: "FIGHTER",
      homeCityId: fixture.command.cityId,
      hp: effectiveRoleRuleV7("FIGHTER", "ORIGINAL").maxHp,
    });
    expect(cityOfV7(arrived.state, 0)).not.toHaveProperty("heldRewardUnits");
    expect(unitAtV7(arrived.state, CENTER).role).toBe("GUARD");
  });

  it("with one free tile, the first Goblin of a Militia pushes the garrison there and the second is held", () => {
    const fixture = rewardStateV7("MILITIA", "GOBLIN", [
      { role: "FIGHTER", at: CENTER },
    ]);
    const state = crowded(fixture.state, [at(10, 10)]);
    const garrison = unitAtV7(state, CENTER);
    const result = choose(fixture, state);
    expect(granted(result.events)).toHaveLength(1);
    expect(unitAtV7(result.state, CENTER).id).toBe(
      granted(result.events)[0]?.unitId,
    );
    expect(unitAtV7(result.state, at(10, 10)).id).toBe(garrison.id);
    expect(cityOfV7(result.state, 0).heldRewardUnits).toEqual([
      { reachedLevel: 2, role: "FIGHTER" },
    ]);
  });

  it("drops the held units when the city is captured", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      faction: "CANDY",
      pieces: [{ role: "SWORDSMAN", at: CENTER }],
    });
    const result = choose(fixture, crowded(fixture.state));
    expect(cityOfV7(result.state, 0).heldRewardUnits).toHaveLength(1);
    const foe = seatIdV7(result.state, 1);
    const besieger = unitAtV7(result.state, CENTER);
    const ready = checkedV7({
      ...result.state,
      activeSeatIndex: result.state.turnOrder.indexOf(foe),
      units: result.state.units.map((unit) =>
        unit.id === besieger.id ? { ...unit, captureEligible: true } : unit,
      ),
    });
    const captured = applyOkV7(ready, foe, {
      kind: "CAPTURE",
      unitId: besieger.id,
    });
    const city = captured.state.cities.find(
      (item) => item.id === fixture.command.cityId,
    );
    expect(city?.ownerId).toBe(foe);
    expect(city).not.toHaveProperty("heldRewardUnits");
  });

  it("parses a held unit only as the unit of a reward the city took", () => {
    const { fixture, state } = full();
    const result = choose(fixture, state);
    const stored = JSON.parse(JSON.stringify(result.state)) as {
      cities: { heldRewardUnits?: unknown }[];
    };
    const index = result.state.cities.findIndex(
      (city) => city.id === fixture.command.cityId,
    );
    const withHeld = (held: unknown): unknown => ({
      ...stored,
      cities: stored.cities.map((city, at) =>
        at === index ? { ...city, heldRewardUnits: held } : city,
      ),
    });
    for (const held of [
      [],
      [{ reachedLevel: 2, role: "JUGGERNAUT" }],
      [{ reachedLevel: 3, role: "FIGHTER" }],
      [{ reachedLevel: 2, role: "FIGHTER", extra: 1 }],
      [
        { reachedLevel: 2, role: "FIGHTER" },
        { reachedLevel: 2, role: "FIGHTER" },
        { reachedLevel: 2, role: "FIGHTER" },
      ],
    ])
      expect(parseGameStateV7(withHeld(held)), JSON.stringify(held)).toBeNull();
  });
});

describe("reward arrival: the shared rule", () => {
  const tiles = AROUND;
  const occupant = { id: unitId(99) };
  const base = {
    center: CENTER,
    tiles,
    occupant,
    pushes: true,
    occupantMayStand: () => true,
    mayStand: () => true,
    cityTerritory: (where: CoordV7) => where.x === 9,
  };
  const beside = (where: CoordV7 | null) => ({
    at: where,
    pushedUnitId: null,
    pushTo: null,
  });

  it("takes a free center", () => {
    expect(rewardArrivalV7({ ...base, occupant: null })).toEqual(
      beside(CENTER),
    );
  });

  it("pushes the occupant next to the center, territory first, then (y, x); else within two", () => {
    const pushed = (to: CoordV7) => ({
      at: CENTER,
      pushedUnitId: occupant.id,
      pushTo: to,
    });
    expect(rewardArrivalV7(base)).toEqual(pushed(at(9, 7)));
    expect(rewardArrivalV7({ ...base, cityTerritory: () => false })).toEqual(
      pushed(at(7, 7)),
    );
    // A territory tile two away comes after every free tile next to the
    // center.
    expect(
      rewardArrivalV7({
        ...base,
        cityTerritory: (where) => where.y === 6,
      }),
    ).toEqual(pushed(at(7, 7)));
    expect(
      rewardArrivalV7({
        ...base,
        occupantMayStand: (where) => where.y === 10 || where.y === 6,
        cityTerritory: (where) => where.y === 10,
      }),
    ).toEqual(pushed(at(6, 10)));
    expect(REWARD_ARRIVAL_RADIUS_V7).toBe(2);
  });

  it("falls back to the placement beside the city when nothing is pushed, else holds", () => {
    // No tile within two for the occupant, or a unit that may not push
    // (a second Militia unit, a held unit).
    for (const input of [
      { ...base, occupantMayStand: () => false },
      { ...base, pushes: false },
    ]) {
      expect(rewardArrivalV7(input)).toEqual(beside(at(9, 7)));
      expect(rewardArrivalV7({ ...input, cityTerritory: () => false })).toEqual(
        beside(at(7, 7)),
      );
      expect(
        rewardArrivalV7({
          ...input,
          cityTerritory: () => false,
          mayStand: (where) => where.y === 10,
        }),
      ).toEqual(beside(at(6, 10)));
      // Outside the territory, nothing beyond two tiles.
      expect(
        rewardArrivalV7({
          ...input,
          tiles: [...tiles, at(8, 11)],
          cityTerritory: () => false,
          mayStand: (where) => where.y === 11,
        }),
      ).toEqual(beside(null));
      // A territory tile three away still counts.
      expect(
        rewardArrivalV7({
          ...input,
          tiles: [...tiles, at(8, 11)],
          cityTerritory: (where) => where.y === 11,
          mayStand: (where) => where.y === 11,
        }),
      ).toEqual(beside(at(8, 11)));
    }
    // The occupant is never pushed farther than two.
    expect(
      rewardArrivalV7({
        ...base,
        tiles: [...tiles, at(8, 11)],
        occupantMayStand: (where) => where.y === 11,
        mayStand: () => false,
      }),
    ).toEqual(beside(null));
  });
});

describe("reward arrival: the Normal AI", () => {
  it("takes the Militia to push a besieger off, where the ladder would take the Coins", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    const view = viewForV7(fixture.state, seatIdV7(fixture.state, 0));
    expect(
      rewardWithArrivalV7(
        view,
        fixture.command.cityId,
        ["STOCKPILE", "MILITIA"],
        "STOCKPILE",
      ),
    ).toBe("MILITIA");
    const decision = chooseNormalCommandV7(view).command;
    expect(decision).toEqual({ ...fixture.command, reward: "MILITIA" });
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => JSON.stringify(command) === JSON.stringify(decision),
      ),
    ).toBe(true);
  });

  it("takes the giant over the Treasury to push a besieger off", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    const view = viewForV7(fixture.state, seatIdV7(fixture.state, 0));
    expect(
      rewardWithArrivalV7(
        view,
        fixture.command.cityId,
        ["JUGGERNAUT", "TREASURY"],
        "TREASURY",
      ),
    ).toBe("JUGGERNAUT");
  });

  it("levels a besieged city first to push the besieger off, then takes the Militia that does it", () => {
    // Seat 0's capital at level 1 with 1 population: one more harvest
    // takes it to level 2 (Stockpile or Militia).
    const arena = (seat: number): GameStateV7 => {
      const base = goblinArenaV7(
        ["ORIGINAL", "ORIGINAL"],
        [{ seat, role: "FIGHTER", at: CENTER }],
      );
      return applyOkV7(base, seatIdV7(base, 0), {
        kind: "HARVEST_FRUIT",
        at: at(8, 9),
      }).state;
    };
    const levelUp = { kind: "HARVEST_FRUIT", at: at(9, 9) } as const;
    const besieged = arena(1);
    const view = viewForV7(besieged, seatIdV7(besieged, 0));
    const economic = previewEconomicV7(view, levelUp);
    expect(economic.ok && economic.preview.levelsReached).toEqual([2]);
    // The level-up outranks every other growth only under a siege.
    expect(scoreCommandV7(view, levelUp).priority).toBe(1290);
    const garrisoned = arena(0);
    expect(
      scoreCommandV7(viewForV7(garrisoned, seatIdV7(garrisoned, 0)), levelUp)
        .priority,
    ).toBeLessThan(1290);
    const decision = chooseNormalCommandV7(view).command;
    expect(decision).not.toBeNull();
    if (decision === null) return;
    const chosen = previewEconomicV7(view, decision);
    expect(chosen.ok && chosen.preview.levelsReached).toEqual([2]);
    // The level reached, the Militia takes the center and the siege ends.
    const own = seatIdV7(besieged, 0);
    const leveled = applyOkV7(besieged, own, decision).state;
    const reward = chooseNormalCommandV7(viewForV7(leveled, own)).command;
    expect(reward).toMatchObject({
      kind: "CHOOSE_CITY_REWARD",
      reward: "MILITIA",
    });
    if (reward === null) return;
    const besieger = unitAtV7(leveled, CENTER);
    const after = applyOkV7(leveled, own, reward).state;
    expect(unitAtV7(after, CENTER).ownerId).toBe(own);
    expect(after.units.find((unit) => unit.id === besieger.id)).toMatchObject({
      hp: besieger.hp,
      captureEligible: false,
    });
    expect(isCityBesiegedV7(after, cityOfV7(after, 0))).toBe(false);
  });

  it("keeps the ladder's choice for its own garrison, but not to push its own channelling cultist", () => {
    const fixture = rewardStateV7("MILITIA", "CULT", [
      { role: "GUARD", at: CENTER },
    ]);
    const plain = viewForV7(fixture.state, seatIdV7(fixture.state, 0));
    expect(
      rewardWithArrivalV7(
        plain,
        fixture.command.cityId,
        ["STOCKPILE", "MILITIA"],
        "MILITIA",
      ),
    ).toBe("MILITIA");
    const channelling = withStrandsV7(
      withHorrorV7(fixture.state, 0, at(5, 2)),
      at(5, 2),
      [CENTER],
    );
    expect(
      rewardWithArrivalV7(
        viewForV7(channelling, seatIdV7(channelling, 0)),
        fixture.command.cityId,
        ["STOCKPILE", "MILITIA"],
        "MILITIA",
      ),
    ).toBe("STOCKPILE");
  });
});
