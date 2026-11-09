import { describe, expect, it } from "vitest";
import {
  parseGameStateV7,
  queryPlayerCommandsV7,
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
// and 2.8): ice is permanent (no thaw) and Black Ice no longer runs at the
// Start Turn. The Ice Folk freeze rework (`pulp_wars-s55m.1`): Icebound and
// its crush are gone, so nothing of the frozen sea runs at a Start Turn.

const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const ICEBOUND: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];
// Harpoons (Black Ice until `pulp_wars-tzk6`, 7r137).
const HARPOONS: readonly TechnologyIdV7[] = ["SHORECRAFT", "SEAMANSHIP"];
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

  it("the view shows the owner, never a countdown, a crack or a thickness", () => {
    // The naval branch rebuilt (`pulp_wars-tzk6`, 7r137): every Naval
    // technology makes no ice thick (Glacier is gone).
    const state = frozenArenaV7({
      technologies: [ALL, RIME],
      units: [],
      ice: [{ at: FAR }, { at: { x: 1, y: 4 } }],
    });
    expect(viewForV7(state, seatV7(state, 1).id).ice).toEqual([
      { at: { x: 1, y: 4 }, ownerId: seatV7(state, 0).id },
      { at: FAR, ownerId: seatV7(state, 0).id },
    ]);
  });

  it("state parsing refuses `turnsLeft` and `cracked`", () => {
    const state = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [],
      ice: [{ at: FAR }],
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
    expect(
      parseGameStateV7({
        ...state,
        ice: [{ ...entry, cracked: true }],
      }),
    ).toBeNull();
  });

  it("no land unit is needed to hold it, and a ship beside it takes no harm at any Start Turn", () => {
    const state = frozenArenaV7({
      technologies: [ICEBOUND, ALL],
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 1, y: 4 } }],
      ice: [{ at: FAR }, { at: { x: 1, y: 6 } }],
    });
    const boat = navalUnitAtV7(state, { x: 1, y: 4 });
    const after = round(round(state).state);
    expect(after.state.ice).toEqual(state.ice);
    expect(navalUnitV7(after.state, boat.id).hp).toBe(boat.hp);
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
    });
  });
});

describe("nothing freezes a unit on the seat's ice at the Start Turn (Black Ice is gone since 7r137)", () => {
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
    for (const technologies of [RIME, HARPOONS]) {
      const state = scene(technologies);
      const started = round(round(state).state);
      expect(kinds(started.events)).not.toContain("UNITS_FROZEN");
      expect(started.state.frozen).toEqual([]);
    }
  });

  it("a unit Frozen on the ice that thawed may act", () => {
    const base = scene(HARPOONS);
    const victim = navalUnitAtV7(base, FAR);
    // Frozen during its owner's turn (as Frostbite does): it thaws after
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
