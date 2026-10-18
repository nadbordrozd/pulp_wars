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
// docs/product/RULESET_7_NAVAL_BRANCH.md sections 8.5, 8.8, 8.9, and 9):
// the turn steps of the frozen sea. The frozen sea redesign
// (`pulp_wars-5ti.25`, docs/product/RULESET_7_ICE_REDESIGN.md sections 2.3
// and 2.8): ice is permanent (no thaw), Black Ice no longer runs at the
// Start Turn, and the crush stays.

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

describe("permanent ice (redesign section 2.3)", () => {
  it("an entry made on a turn is still there after 20 End Turns of every player", () => {
    let state = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [],
      ice: [{ at: FAR }, { at: { x: 5, y: 3 } }],
    });
    expect(inTerritoryOfV7(state, 0, FAR)).toBe(false);
    expect(inTerritoryOfV7(state, 0, { x: 5, y: 3 })).toBe(true);
    const before = state.ice;
    for (let turn = 0; turn < 20; turn += 1) {
      const result = round(state);
      expect(kinds(result.events)).not.toContain("ICE_MELTED");
      state = result.state;
    }
    expect(state.ice).toEqual(before);
    expect(parseGameStateV7(state)).not.toBeNull();
  });

  it("the view shows the owner, the crack and whether it is thick, never a countdown", () => {
    const state = frozenArenaV7({
      technologies: [ALL, RIME],
      units: [],
      ice: [{ at: FAR }, { at: { x: 1, y: 4 }, cracked: true }],
    });
    expect(viewForV7(state, seatV7(state, 1).id).ice).toEqual([
      {
        at: { x: 1, y: 4 },
        ownerId: seatV7(state, 0).id,
        cracked: true,
        thick: true,
      },
      { at: FAR, ownerId: seatV7(state, 0).id, cracked: false, thick: true },
    ]);
    // Without Glacier the ice is not thick, and a crack is refused.
    const thin = frozenArenaV7({
      technologies: [RIME, RIME],
      units: [],
      ice: [{ at: FAR }],
    });
    expect(viewForV7(thin, seatV7(thin, 0).id).ice).toEqual([
      { at: FAR, ownerId: seatV7(thin, 0).id, cracked: false, thick: false },
    ]);
    expect(() => frozenStateV7(thin, [{ at: FAR, cracked: true }])).toThrow();
  });

  it("state parsing refuses `turnsLeft` and accepts `cracked`", () => {
    const state = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [],
      ice: [{ at: FAR, cracked: true }],
    });
    expect(parseGameStateV7(state)).not.toBeNull();
    const entry = state.ice[0];
    if (entry === undefined) throw new Error("no ice");
    expect(
      parseGameStateV7({
        ...state,
        ice: [{ at: entry.at, ownerId: entry.ownerId, turnsLeft: 3 }],
      }),
    ).toBeNull();
    expect(
      parseGameStateV7({
        ...state,
        ice: [{ ...entry, turnsLeft: 3 }],
      }),
    ).toBeNull();
  });

  it("no land unit is needed to hold it, and an icebound ship stays icebound", () => {
    const state = frozenArenaV7({
      technologies: [ICEBOUND, ALL],
      units: [{ seat: 1, role: "PATROL_BOAT", at: FAR }],
      ice: [{ at: FAR }, { at: { x: 1, y: 6 } }],
    });
    const boat = navalUnitAtV7(state, FAR);
    expect(unitIsIceboundV7(state, boat)).toBe(true);
    const after = round(round(state).state);
    expect(after.state.ice).toEqual(state.ice);
    expect(kinds(after.events)).not.toContain("ICE_MELTED");
    const crushed = navalUnitV7(after.state, boat.id);
    expect(unitIsIceboundV7(after.state, crushed)).toBe(true);
  });

  it("an eliminated owner's ice stays", () => {
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
    const state = frozenStateV7(eliminated, [{ at: FAR, seat: 2 }]);
    const later = round(round(state).state);
    expect(iceEntryV7(later.state, FAR)).toEqual({
      at: FAR,
      ownerId: third.id,
      cracked: false,
    });
  });
});

describe("Black Ice no longer runs at the Start Turn (redesign section 2.8)", () => {
  const scene = (technologies: readonly TechnologyIdV7[]) =>
    frozenArenaV7({
      technologies: [technologies, ALL],
      units: [
        // A hostile land unit and an own one on the seat's ice.
        { seat: 1, role: "FIGHTER", at: FAR },
        { seat: 0, role: "FIGHTER", at: { x: 1, y: 6 } },
      ],
      ice: [{ at: FAR }, { at: { x: 1, y: 6 } }],
    });

  it("a hostile land unit that stands on the seat's ice is not frozen by a Start Turn", () => {
    for (const technologies of [RIME, BLACK_ICE]) {
      const state = scene(technologies);
      const started = round(round(state).state);
      expect(kinds(started.events)).not.toContain("UNITS_FROZEN");
      expect(started.state.frozen).toEqual([]);
    }
  });

  it("a victim of Black Ice that thawed on the ice may act", () => {
    const base = scene(BLACK_ICE);
    const victim = navalUnitAtV7(base, FAR);
    // Frozen during its owner's turn (Black Ice on entry): it thaws after
    // its owner's next turn and is never frozen again while it stays.
    const state = { ...base, frozen: [{ unitId: victim.id, turnsLeft: 1 }] };
    const parsed = parseGameStateV7(state);
    if (parsed === null) throw new Error("invalid");
    const thawed = endTurn(endTurn(parsed, 0).state, 1);
    expect(thawed.state.frozen).toEqual([]);
    const later = round(thawed.state);
    expect(later.state.frozen).toEqual([]);
    // On its owner's turn it may act from the ice (here: attack the Yeti).
    const own = endTurn(later.state, 0);
    expect(
      queryPlayerCommandsV7(viewForV7(own.state, seatV7(base, 1).id)).some(
        (command) => command.kind === "ATTACK" && command.unitId === victim.id,
      ),
    ).toBe(true);
  });
});

describe("the crush (section 8.9)", () => {
  it("deals 3 to every icebound unit on the seat's ice at its Start Turn (Black Ice no longer runs there)", () => {
    const state = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [
        { seat: 1, role: "PATROL_BOAT", at: FAR },
        { seat: 1, role: "BATTLESHIP", at: { x: 1, y: 4 } },
        // A ship on open water, a land unit on the ice.
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 6 } },
      ],
      ice: [{ at: FAR }, { at: { x: 1, y: 4 } }, { at: { x: 1, y: 6 } }],
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
    // The redesign: the Fighter on the ice is not frozen at the Start Turn.
    expect(kinds(started.events)).not.toContain("UNITS_FROZEN");
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
      ice: [{ at: FAR }],
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
      [{ at: { x: 1, y: 7 } }],
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
      ice: [{ at: { x: 1, y: 6 } }],
    });
    const goblin = navalUnitAtV7(base, { x: 1, y: 8 });
    const yeti = navalUnitAtV7(base, { x: 1, y: 6 });
    const state = frozenStateV7(
      patchFrozenUnitV7(base, goblin.id, {
        at: { x: 1, y: 7 },
        form: "EMBARKED",
        hp: 1,
      }),
      [{ at: { x: 1, y: 7 } }],
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
