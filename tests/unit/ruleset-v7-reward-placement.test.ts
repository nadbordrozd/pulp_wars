import { describe, expect, it } from "vitest";
import { chooseNormalCommandV7 } from "../../src/ai/v7";
import {
  REWARD_ARRIVAL_RADIUS_V7,
  applyCommandV7,
  effectiveRoleRuleV7,
  isCityBesiegedV7,
  parseEventV7,
  parseGameStateV7,
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
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import { at, patchTileV7 } from "../fixtures/v7-revision20";

/**
 * Reward placement (`pulp_wars-spue`, `pulp_wars-rzqf`,
 * `pulp-wars-poc-7r112`; docs/product/RULESET_7_CURRENT.md section 4.6), on
 * small hand-built states of the two-seat arena: seat 0's capital is at
 * (8, 8) with the eight tiles around it as its territory, on an 11 by 11
 * board, so every tile within two of the center is on the board.
 *
 * A reward unit never kills, damages, moves, or pushes a unit already on
 * the board. It appears on the free center, else on the nearest free tile
 * of the city's territory, else on the nearest free tile within two of the
 * center (distance, then (y, x) order), else it is held on the city and
 * appears at a later Start Turn of its owner.
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

/** Seat-0 Fighters on every free tile within two of the center but `except`. */
function crowded(
  state: GameStateV7,
  except: readonly CoordV7[] = [],
): GameStateV7 {
  return withUnits(
    state,
    AROUND.filter(
      (where) =>
        !except.some((item) => item.x === where.x && item.y === where.y) &&
        !state.units.some(
          (unit) => unit.at.x === where.x && unit.at.y === where.y,
        ),
    ).map((where) => ({ seat: 0, role: "FIGHTER", at: where })),
  );
}

const granted = (
  events: readonly DomainEventV7[],
): readonly Extract<DomainEventV7, { kind: "UNIT_REWARD_GRANTED" }>[] =>
  events.filter(
    (event): event is Extract<DomainEventV7, { kind: "UNIT_REWARD_GRANTED" }> =>
      event.kind === "UNIT_REWARD_GRANTED",
  );

const kinds = (events: readonly DomainEventV7[]): string[] =>
  events.map((event) => event.kind);

/** Every unit of `before` is in `after`, exactly as it was. */
function unharmed(before: GameStateV7, after: GameStateV7): void {
  for (const unit of before.units)
    expect(after.units.find((item) => item.id === unit.id)).toEqual(unit);
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
  expect(kinds(result.events)).not.toContain("UNIT_SPAWN_DISPLACED");
  expect(kinds(result.events)).not.toContain("UNIT_DIED");
  unharmed(state, result.state);
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

describe("reward placement: an own unit on the center", () => {
  it("leaves the garrison on the center and puts the Militia on the nearest tile of the territory", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    const guard = unitAtV7(fixture.state, CENTER);
    expect(preview(fixture)?.at).toEqual(at(7, 7));
    const result = choose(fixture);
    expect(unitAtV7(result.state, CENTER)).toEqual(guard);
    const [unit] = granted(result.events);
    expect(unitAtV7(result.state, at(7, 7))).toMatchObject({
      id: unit?.unitId,
      role: "FIGHTER",
      homeCityId: fixture.command.cityId,
    });
  });

  it("puts the Scouts' Saucer beside a Grunt on the center and kills nothing (MARTIAN_5)", () => {
    const fixture = rewardStateV7("SURVEY", "MARTIAN", [
      { role: "FIGHTER", at: CENTER },
    ]);
    const grunt = unitAtV7(fixture.state, CENTER);
    expect(preview(fixture)).toEqual({
      cityId: fixture.command.cityId,
      reward: "SURVEY",
      role: "RAIDER",
      at: at(7, 7),
    });
    const result = choose(fixture);
    expect(unitAtV7(result.state, CENTER)).toEqual(grunt);
    expect(unitAtV7(result.state, at(7, 7)).role).toBe("RAIDER");
    expect(effectiveRoleRuleV7("RAIDER", "MARTIAN").label).toBe("Saucer");
  });

  it("keeps a channelling cultist on the center and its strand: the Familiar, the Militia, and the Thing appear beside it", () => {
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
      const result = choose(fixture, state);
      expect(unitAtV7(result.state, CENTER), reward).toEqual(cultist);
      expect(result.state.cult.strands, reward).toEqual(state.cult.strands);
      expect(kinds(result.events), reward).not.toContain("STRAND_BROKEN");
      const units = granted(result.events).map((event) => event.unitId);
      // A Cult Militia is two Initiates: the two nearest tiles.
      const tiles = reward === "MILITIA" ? [at(7, 7), at(8, 7)] : [at(7, 7)];
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

  it("puts the giant beside the garrison", () => {
    const fixture = rewardStateV7("JUGGERNAUT", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    const guard = unitAtV7(fixture.state, CENTER);
    expect(preview(fixture)?.at).toEqual(at(7, 7));
    const result = choose(fixture);
    expect(unitAtV7(result.state, CENTER)).toEqual(guard);
    expect(unitAtV7(result.state, at(7, 7)).role).toBe("JUGGERNAUT");
  });

  it("still puts the reward unit on a free center", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL");
    expect(preview(fixture)?.at).toEqual(CENTER);
    const result = choose(fixture);
    expect(unitAtV7(result.state, CENTER).id).toBe(
      granted(result.events)[0]?.unitId,
    );
    expect(
      rewardArrivalNoteV7(
        viewForV7(fixture.state, seatIdV7(fixture.state, 0)),
        fixture.command.cityId,
        "MILITIA",
      ),
    ).toBeNull();
  });
});

describe("reward placement: a hostile unit on the center", () => {
  it("leaves a besieger where it is: a Goblin Militia appears beside it and the siege goes on (GOBLIN_4)", () => {
    const fixture = rewardStateV7("MILITIA", "GOBLIN", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    // The besieger took the center by a kill: it may capture next turn.
    const state = checkedV7({
      ...fixture.state,
      units: fixture.state.units.map((unit) =>
        unit.at.x === CENTER.x && unit.at.y === CENTER.y
          ? { ...unit, captureEligible: true, hp: 7 }
          : unit,
      ),
    });
    const besieger = unitAtV7(state, CENTER);
    // The reward is the owner's: seat 0 owns the city it chooses for.
    expect(cityOfV7(state, 0).id).toBe(fixture.command.cityId);
    expect(isCityBesiegedV7(state, cityOfV7(state, 0))).toBe(true);
    expect(preview(fixture, state)?.at).toEqual(at(7, 7));
    const result = choose(fixture, state);
    expect(unitAtV7(result.state, CENTER)).toEqual(besieger);
    expect(isCityBesiegedV7(result.state, cityOfV7(result.state, 0))).toBe(
      true,
    );
    const units = granted(result.events).map((event) => event.unitId);
    expect(units).toHaveLength(2);
    expect(
      [at(7, 7), at(8, 7)].map((w) => unitAtV7(result.state, w).id),
    ).toEqual(units);
    expect(
      rewardArrivalNoteV7(
        viewForV7(state, seatIdV7(state, 0)),
        fixture.command.cityId,
        "MILITIA",
      )?.text,
    ).toBe("Appears beside the city");
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

describe("reward placement: where beside the city", () => {
  it("prefers a tile of the city's territory, even farther, to a nearer one outside it", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    // Every ring tile but (9, 9) is taken, and (9, 9) is neutral.
    const ring = AROUND.filter(
      (where) =>
        Math.max(Math.abs(where.x - 8), Math.abs(where.y - 8)) === 1 &&
        (where.x !== 9 || where.y !== 9),
    );
    const base = patchTileV7(
      withUnits(
        fixture.state,
        ring.map((where) => ({ seat: 0, role: "FIGHTER", at: where })),
      ),
      at(9, 9),
      { territoryCityId: null },
    );
    // Without territory left, the nearest tile within two: (9, 9).
    expect(preview(fixture, base)?.at).toEqual(at(9, 9));
    expect(granted(choose(fixture, base).events)).toHaveLength(1);
    expect(unitAtV7(choose(fixture, base).state, at(9, 9)).role).toBe(
      "FIGHTER",
    );
    // A tile of the territory two away comes first.
    const grown = patchTileV7(base, at(10, 8), {
      territoryCityId: fixture.command.cityId,
    });
    expect(preview(fixture, grown)?.at).toEqual(at(10, 8));
    expect(unitAtV7(choose(fixture, grown).state, at(10, 8)).role).toBe(
      "FIGHTER",
    );
  });
});

describe("reward placement: no free tile", () => {
  const full = () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [
      { role: "GUARD", at: CENTER },
    ]);
    return { fixture, state: crowded(fixture.state) };
  };

  it("holds the unit on the city, and it appears at a later Start Turn when a tile is free", () => {
    const { fixture, state } = full();
    const own = seatIdV7(state, 0);
    expect(preview(fixture, state)?.at).toBeNull();
    expect(
      rewardArrivalNoteV7(
        viewForV7(state, own),
        fixture.command.cityId,
        "MILITIA",
      )?.text,
    ).toBe("No room near the city: arrives when a tile is free");
    const result = choose(fixture, state);
    expect(granted(result.events)).toEqual([]);
    expect(result.state.units).toEqual(state.units);
    expect(result.state.nextEntityId).toBe(state.nextEntityId);
    expect(cityOfV7(result.state, 0).heldRewardUnits).toEqual([
      { reachedLevel: 2, role: "FIGHTER" },
    ]);
    // Still no room at its next Start Turn: it stays held.
    const waiting = endTurnUntilV7(result.state, own);
    expect(granted(waiting.events)).toEqual([]);
    expect(cityOfV7(waiting.state, 0).heldRewardUnits).toHaveLength(1);
    // A territory tile and an outer tile free up: it takes the territory.
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

  it("places the first Goblin of a Militia on the last free tile and holds the second", () => {
    const fixture = rewardStateV7("MILITIA", "GOBLIN", [
      { role: "FIGHTER", at: CENTER },
    ]);
    const state = crowded(fixture.state, [at(10, 10)]);
    const result = choose(fixture, state);
    expect(granted(result.events)).toHaveLength(1);
    expect(unitAtV7(result.state, at(10, 10)).id).toBe(
      granted(result.events)[0]?.unitId,
    );
    expect(cityOfV7(result.state, 0).heldRewardUnits).toEqual([
      { reachedLevel: 2, role: "FIGHTER" },
    ]);
  });

  it("drops the held units when the city is captured", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
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

describe("reward placement: the shared rule", () => {
  const tiles = AROUND;
  it("takes the free center, then the nearest territory tile, then the nearest tile within two, else holds", () => {
    const base = {
      center: CENTER,
      tiles,
      mayStand: () => true,
      cityTerritory: (where: CoordV7) => where.x === 9,
    };
    expect(rewardArrivalV7({ ...base, centerFree: true })).toEqual(CENTER);
    expect(rewardArrivalV7({ ...base, centerFree: false })).toEqual(at(9, 7));
    expect(
      rewardArrivalV7({
        ...base,
        centerFree: false,
        cityTerritory: () => false,
      }),
    ).toEqual(at(7, 7));
    expect(
      rewardArrivalV7({
        ...base,
        centerFree: false,
        cityTerritory: () => false,
        mayStand: (where) => where.y === 10,
      }),
    ).toEqual(at(6, 10));
    // Outside the territory, nothing beyond two tiles.
    expect(REWARD_ARRIVAL_RADIUS_V7).toBe(2);
    expect(
      rewardArrivalV7({
        ...base,
        tiles: [...tiles, at(8, 11)],
        centerFree: false,
        cityTerritory: () => false,
        mayStand: (where) => where.y === 11,
      }),
    ).toBeNull();
    // A territory tile three away still counts.
    expect(
      rewardArrivalV7({
        ...base,
        tiles: [...tiles, at(8, 11)],
        centerFree: false,
        cityTerritory: (where) => where.y === 11,
        mayStand: (where) => where.y === 11,
      }),
    ).toEqual(at(8, 11));
  });
});

describe("reward placement: the Normal AI", () => {
  it("chooses a legal reward for a besieged city", () => {
    const fixture = rewardStateV7("MILITIA", "ORIGINAL", [], {
      pieces: [{ role: "FIGHTER", at: CENTER }],
    });
    const view = viewForV7(fixture.state, seatIdV7(fixture.state, 0));
    const decision = chooseNormalCommandV7(view).command;
    expect(decision?.kind).toBe("CHOOSE_CITY_REWARD");
    expect(
      queryPlayerCommandsV7(view).some(
        (command) => JSON.stringify(command) === JSON.stringify(decision),
      ),
    ).toBe(true);
  });
});
