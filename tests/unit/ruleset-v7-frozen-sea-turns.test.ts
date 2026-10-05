import { describe, expect, it } from "vitest";
import {
  ICE_CRUSH_DAMAGE_V7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  unitIsIceboundV7,
  viewForV7,
  type CoordV7,
  type DomainEventV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  frozenStateV7,
  iceEntryV7,
  inTerritoryOfV7,
  patchFrozenUnitV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.5, 8.8, 8.9, and 9): the
// thaw at an End Turn, and Black Ice and the crush at a Start Turn.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const ICEBOUND: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];
const BLACK_ICE: readonly TechnologyIdV7[] = ["SHORECRAFT", "SEAMANSHIP"];
const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];
/** Open water far from both capitals. */
const FAR: CoordV7 = { x: 1, y: 5 };

const endTurn = (state: GameStateV7, seat: 0 | 1) =>
  acceptV7(state, seat, { kind: "END_TURN" });
/** Seat 0 ends its turn, then seat 1: seat 0's next Start Turn. */
const round = (
  state: GameStateV7,
): {
  readonly state: GameStateV7;
  readonly events: readonly DomainEventV7[];
} => {
  const first = endTurn(state, 0);
  const second = endTurn(first.state, 1);
  return { state: second.state, events: [...first.events, ...second.events] };
};
const kinds = (events: readonly DomainEventV7[]) =>
  events.map((event) => event.kind);

describe("the thaw (section 8.5)", () => {
  it("counts down at its owner's End Turn only, and melts at 0", () => {
    const state = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [],
      ice: [{ at: FAR, turnsLeft: 2 }],
    });
    expect(inTerritoryOfV7(state, 0, FAR)).toBe(false);
    const first = endTurn(state, 0);
    expect(iceEntryV7(first.state, FAR)?.turnsLeft).toBe(1);
    expect(kinds(first.events)).not.toContain("ICE_MELTED");
    // The other seat's End Turn does not count it.
    const other = endTurn(first.state, 1);
    expect(iceEntryV7(other.state, FAR)?.turnsLeft).toBe(1);
    const second = endTurn(other.state, 0);
    expect(second.state.ice).toEqual([]);
    const melted = second.events.find((event) => event.kind === "ICE_MELTED");
    expect(melted).toEqual({ kind: "ICE_MELTED", tiles: [FAR], freed: [] });
    expect(parseEventV7(melted).ok).toBe(true);
    // After the Chill countdown and before the income preview.
    expect(kinds(second.events).indexOf("ICE_MELTED")).toBeLessThan(
      kinds(second.events).indexOf("INCOME_PREVIEWED"),
    );
    expect(parseGameStateV7(second.state)).not.toBeNull();
  });

  it("never counts down in its owner's territory", () => {
    const home = { x: 5, y: 3 };
    let state = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [],
      ice: [{ at: home, turnsLeft: 1 }],
    });
    expect(inTerritoryOfV7(state, 0, home)).toBe(true);
    expect(viewForV7(state, seatV7(state, 1).id).ice).toEqual([
      {
        at: home,
        ownerId: seatV7(state, 0).id,
        turnsLeft: 1,
        permanent: true,
      },
    ]);
    for (let turn = 0; turn < 3; turn += 1) state = round(state).state;
    expect(iceEntryV7(state, home)?.turnsLeft).toBe(1);
  });

  it("is held by a land unit of any owner, and melts once the tile is empty", () => {
    const state = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [
        { seat: 0, role: "FIGHTER", at: FAR },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 6 } },
      ],
      ice: [
        { at: FAR, turnsLeft: 1 },
        { at: { x: 1, y: 6 }, turnsLeft: 1 },
      ],
    });
    const after = endTurn(state, 0);
    expect(after.state.ice.map((entry) => entry.turnsLeft)).toEqual([0, 0]);
    expect(kinds(after.events)).not.toContain("ICE_MELTED");
    // Still held a round later; nobody drowns.
    const later = endTurn(endTurn(endTurn(after.state, 1).state, 0).state, 1);
    expect(later.state.ice).toHaveLength(2);
    expect(parseGameStateV7(later.state)).not.toBeNull();
    // The enemy Fighter leaves its tile: that entry melts at the owner's
    // next End Turn.
    const enemy = navalUnitAtV7(later.state, { x: 1, y: 6 });
    const left = patchFrozenUnitV7(later.state, enemy.id, {
      at: { x: 0, y: 9 },
    });
    const final = endTurn(left, 0);
    expect(final.state.ice.map((entry) => entry.at)).toEqual([FAR]);
    expect(final.events).toContainEqual({
      kind: "ICE_MELTED",
      tiles: [{ x: 1, y: 6 }],
      freed: [],
    });
  });

  it("an afloat unit does not hold it: an icebound ship floats free", () => {
    const state = frozenArenaV7({
      technologies: [ICEBOUND, ALL],
      units: [{ seat: 1, role: "PATROL_BOAT", at: FAR }],
      ice: [{ at: FAR, turnsLeft: 1 }],
    });
    const boat = navalUnitAtV7(state, FAR);
    expect(unitIsIceboundV7(state, boat)).toBe(true);
    const after = endTurn(state, 0);
    expect(after.events).toContainEqual({
      kind: "ICE_MELTED",
      tiles: [FAR],
      freed: [boat.id],
    });
    expect(after.state.ice).toEqual([]);
    expect(unitIsIceboundV7(after.state, boat)).toBe(false);
    // Its owner may sail it again.
    expect(
      queryPlayerCommandsV7(viewForV7(after.state, seatV7(state, 1).id)).some(
        (command) => command.kind === "MOVE" && command.unitId === boat.id,
      ),
    ).toBe(true);
    // The owner of the freed ship and a viewer of the tile learn of it.
    for (const seat of [0, 1] as const) {
      const envelope = projectEventsV7(
        state,
        after.state,
        seatV7(state, seat).id,
        after.events,
      );
      expect(envelope.events).toContainEqual({
        kind: "ICE_MELTED",
        tiles: [FAR],
        freed: [boat.id],
      });
      expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
    }
  });

  it("an eliminated owner's ice counts down at every End Turn", () => {
    const base = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [],
      third: { faction: "GOBLIN", explored: true },
    });
    const third = seatV7(base, 2);
    // The bystander is eliminated: its city is seat 1's, its unit is gone.
    const eliminated = parseGameStateV7({
      ...base,
      players: base.players.map((player) =>
        player.id === third.id ? { ...player, status: "ELIMINATED" } : player,
      ),
      cities: base.cities.map((city) =>
        city.ownerId === third.id
          ? { ...city, ownerId: seatV7(base, 1).id }
          : city,
      ),
      units: base.units.filter((unit) => unit.ownerId !== third.id),
    });
    if (eliminated === null) throw new Error("the eliminated state is invalid");
    const state = frozenStateV7(eliminated, [
      { at: FAR, seat: 2, turnsLeft: 2 },
    ]);
    const first = endTurn(state, 0);
    expect(iceEntryV7(first.state, FAR)?.turnsLeft).toBe(1);
    const second = endTurn(first.state, 1);
    expect(second.state.ice).toEqual([]);
    expect(second.events).toContainEqual({
      kind: "ICE_MELTED",
      tiles: [FAR],
      freed: [],
    });
  });
});

describe("Black Ice (section 8.8)", () => {
  const scene = (technologies: readonly TechnologyIdV7[]) =>
    frozenArenaV7({
      technologies: [technologies, ALL],
      units: [
        // A hostile land unit and an own one on the seat's ice.
        { seat: 1, role: "FIGHTER", at: FAR },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 6 } },
        // A hostile ship on open water next to it.
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
      ],
      ice: [
        { at: FAR, turnsLeft: 3 },
        { at: { x: 1, y: 6 }, turnsLeft: 3 },
      ],
    });

  it("chills every hostile land unit on the seat's ice at its Start Turn", () => {
    const state = scene(BLACK_ICE);
    const victim = navalUnitAtV7(state, FAR);
    const started = round(state);
    const chilled = started.events.filter(
      (event) => event.kind === "UNITS_CHILLED",
    );
    expect(chilled).toEqual([
      {
        kind: "UNITS_CHILLED",
        playerId: seatV7(state, 0).id,
        sourceUnitId: null,
        source: "BLACK_ICE",
        results: [{ unitId: victim.id, sluggish: true, turnsLeft: 2 }],
      },
    ]);
    expect(parseEventV7(chilled[0]).ok).toBe(true);
    expect(started.state.chilled).toEqual([
      { unitId: victim.id, sluggish: true, turnsLeft: 2 },
    ]);
    // After the Start Turn's first events and before the income.
    const order = kinds(started.events);
    expect(order.lastIndexOf("TURN_STARTED")).toBeLessThan(
      order.indexOf("UNITS_CHILLED"),
    );
    // A re-application refreshes the two turns without a new sluggish turn.
    const again = round(started.state);
    expect(again.state.chilled).toEqual([
      { unitId: victim.id, sluggish: false, turnsLeft: 2 },
    ]);
    // The victim's owner learns of it with no source unit.
    const envelope = projectEventsV7(
      state,
      started.state,
      seatV7(state, 1).id,
      started.events,
    );
    expect(envelope.events).toContainEqual(chilled[0]);
    expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
  });

  it("needs the technology, and only works on the seat's own ice", () => {
    const without = round(scene(RIME));
    expect(kinds(without.events)).not.toContain("UNITS_CHILLED");
    expect(without.state.chilled).toEqual([]);
    // Ice that belongs to the other seat does nothing for the Ice Folk.
    const foreign = frozenStateV7(scene(BLACK_ICE), [
      { at: FAR, seat: 1, turnsLeft: 3 },
    ]);
    expect(round(foreign).state.chilled).toEqual([]);
  });
});

describe("the crush (section 8.9)", () => {
  it("deals 3 to every icebound unit on the seat's ice at its Start Turn, after Black Ice", () => {
    const state = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [
        { seat: 1, role: "PATROL_BOAT", at: FAR },
        { seat: 1, role: "BATTLESHIP", at: { x: 1, y: 4 } },
        // A ship on open water, a land unit on the ice.
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 6 } },
      ],
      ice: [
        { at: FAR, turnsLeft: 5 },
        { at: { x: 1, y: 4 }, turnsLeft: 5 },
        { at: { x: 1, y: 6 }, turnsLeft: 5 },
      ],
    });
    const boat = navalUnitAtV7(state, FAR);
    const battleship = navalUnitAtV7(state, { x: 1, y: 4 });
    const free = navalUnitAtV7(state, { x: 3, y: 5 });
    expect(ICE_CRUSH_DAMAGE_V7).toBe(3);
    const started = round(state);
    const crushed = started.events.filter(
      (event) => event.kind === "UNITS_CRUSHED",
    );
    // In unit-ID order.
    const expected = [boat, battleship]
      .sort((left, right) => left.id - right.id)
      .map((unit) => ({
        unitId: unit.id,
        damage: 3,
        shieldDamage: 0,
        hpAfter: unit.hp - 3,
      }));
    expect(crushed).toEqual([
      {
        kind: "UNITS_CRUSHED",
        playerId: seatV7(state, 0).id,
        results: expected,
      },
    ]);
    expect(parseEventV7(crushed[0]).ok).toBe(true);
    expect(navalUnitV7(started.state, boat.id).hp).toBe(boat.hp - 3);
    expect(navalUnitV7(started.state, battleship.id).hp).toBe(
      battleship.hp - 3,
    );
    expect(navalUnitV7(started.state, free.id).hp).toBe(free.hp);
    // Black Ice (the Fighter on the ice) comes first.
    const order = kinds(started.events);
    expect(order.indexOf("UNITS_CHILLED")).toBeLessThan(
      order.indexOf("UNITS_CRUSHED"),
    );
    // The other seat's Start Turn crushes nothing.
    expect(kinds(endTurn(state, 0).events)).not.toContain("UNITS_CRUSHED");
    // The victims' owner learns of it.
    const envelope = projectEventsV7(
      state,
      started.state,
      seatV7(state, 1).id,
      started.events,
    );
    expect(envelope.events).toContainEqual(crushed[0]);
    expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
  });

  it("sinks a ship at 3 HP or less: cause CRUSHED, no credit, no Grave", () => {
    const base = frozenArenaV7({
      factions: ["ICE_FOLK", "UNDEAD"],
      technologies: [ALL, ALL],
      units: [
        { seat: 1, role: "PATROL_BOAT", at: FAR },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 6 } },
      ],
      ice: [{ at: FAR, turnsLeft: 5 }],
    });
    const boat = navalUnitAtV7(base, FAR);
    const yeti = navalUnitAtV7(base, { x: 1, y: 6 });
    const state = patchFrozenUnitV7(base, boat.id, { hp: 2 });
    const started = round(state);
    expect(started.events).toContainEqual({
      kind: "UNITS_CRUSHED",
      playerId: seatV7(state, 0).id,
      results: [{ unitId: boat.id, damage: 2, shieldDamage: 0, hpAfter: 0 }],
    });
    expect(started.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: boat.id,
      cause: "CRUSHED",
    });
    expect(started.state.units.some((unit) => unit.id === boat.id)).toBe(false);
    expect(started.state.graves).toEqual([]);
    expect(kinds(started.events)).not.toContain("GRAVE_CREATED");
    expect(navalUnitV7(started.state, yeti.id).kills).toBe(0);
    expect(parseGameStateV7(started.state)).not.toBeNull();
  });

  it("is absorbed by a Shield first (an icebound self-launched machine)", () => {
    const base = frozenArenaV7({
      factions: ["ICE_FOLK", "MARTIAN"],
      technologies: [ALL, ALL],
      units: [{ seat: 1, role: "CATAPULT", at: { x: 1, y: 8 } }],
    });
    const tripod = navalUnitAtV7(base, { x: 1, y: 8 });
    const shield = base.shields.find((entry) => entry.unitId === tripod.id);
    expect(shield?.shield).toBe(2);
    const state = frozenStateV7(
      patchFrozenUnitV7(base, tripod.id, {
        at: { x: 1, y: 7 },
        form: "EMBARKED",
      }),
      [{ at: { x: 1, y: 7 }, turnsLeft: 5 }],
    );
    const started = round(state);
    expect(started.events).toContainEqual({
      kind: "UNITS_CRUSHED",
      playerId: seatV7(state, 0).id,
      results: [
        {
          unitId: tripod.id,
          damage: 1,
          shieldDamage: 2,
          hpAfter: tripod.hp - 1,
        },
      ],
    });
    expect(navalUnitV7(started.state, tripod.id).hp).toBe(tripod.hp - 1);
  });

  it("an embarked exploding unit that is crushed explodes on its tile", () => {
    const base = frozenArenaV7({
      factions: ["ICE_FOLK", "GOBLIN"],
      technologies: [ALL, ALL],
      units: [
        { seat: 1, role: "MARKSMAN", at: { x: 1, y: 8 } },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 6 } },
      ],
      ice: [{ at: { x: 1, y: 6 }, turnsLeft: 5 }],
    });
    const goblin = navalUnitAtV7(base, { x: 1, y: 8 });
    const yeti = navalUnitAtV7(base, { x: 1, y: 6 });
    const state = frozenStateV7(
      patchFrozenUnitV7(base, goblin.id, {
        at: { x: 1, y: 7 },
        form: "EMBARKED",
        hp: 1,
      }),
      [{ at: { x: 1, y: 7 }, turnsLeft: 5 }],
    );
    const started = round(state);
    const order = kinds(started.events);
    expect(order).toContain("UNITS_CRUSHED");
    expect(started.events).toContainEqual({
      kind: "UNIT_DIED",
      unitId: goblin.id,
      cause: "CRUSHED",
    });
    const blast = started.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    expect(blast).toMatchObject({
      kind: "EXPLOSION_RESOLVED",
      unitId: goblin.id,
      at: { x: 1, y: 7 },
      cause: "DEATH",
    });
    expect(order.indexOf("UNITS_CRUSHED")).toBeLessThan(
      order.indexOf("EXPLOSION_RESOLVED"),
    );
    expect(navalUnitV7(started.state, yeti.id).hp).toBeLessThan(yeti.hp);
    expect(parseGameStateV7(started.state)).not.toBeNull();
  });
});
