import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  parseEventV7,
  parseGameStateV7,
  parsePlayerEventEnvelopeV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type FactionIdV7,
  type GameStateV7,
} from "../../src/engine/index";
import { applyOkV7, seatIdV7, unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  NAVAL_ARENA_PORTS_V7,
  navalArenaV7,
  navalUnitAtV7,
  patchNavalUnitV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  at,
  fieldV7,
  patchTileV7,
  unexploreV7,
} from "../fixtures/v7-revision20";

// Regressions from the headless bug hunt (`pulp_wars-2yc.94`,
// scripts/sim-bug-hunt-v7.ts), each on a small hand-built state.

describe("a themed hull's training event parses at its faction's price", () => {
  const train = (faction: FactionIdV7) => {
    const state = navalArenaV7({
      factions: [faction, faction === "ORIGINAL" ? "UNDEAD" : "ORIGINAL"],
      units: [],
    });
    const actor = seatIdV7(state, 0);
    const city = state.cities.find((entry) => entry.ownerId === actor);
    if (city === undefined) throw new Error("no city");
    const command: CommandV7 = {
      kind: "TRAIN_NAVAL",
      cityId: city.id,
      at: NAVAL_ARENA_PORTS_V7[0],
      role: "PATROL_BOAT",
    };
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
      command,
    );
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) throw new Error(result.error.code);
    const event = result.events.find(
      (entry) => entry.kind === "NAVAL_UNIT_TRAINED",
    );
    if (event === undefined) throw new Error("no training event");
    return event;
  };

  // Seed 108 (`a08`) and 103 (`a03`): the Goblin and Dwarf Patrol Boats
  // cost 4 and 6, and the schema accepted only the Human price, 5.
  it.each([
    ["GOBLIN", 4],
    ["DWARF", 6],
    ["ORIGINAL", 5],
  ] as const)("%s Patrol Boat (%i Coins)", (faction, cost) => {
    const event = train(faction);
    expect(event).toMatchObject({ cost, dock: "PORT" });
    expect(parseEventV7(event).ok).toBe(true);
  });

  it("still refuses a price no faction has", () => {
    const event = train("ORIGINAL");
    expect(parseEventV7({ ...event, cost: 3 }).ok).toBe(false);
  });
});

describe("an unseen splash attack's damage event keeps tile order", () => {
  // Seed 105 (`a05`) and 109 (`a09`): a Lich the victim cannot see hits
  // its unit at (7, 2) and splashes its unit at (6, 2). The hit unit led
  // the projected list, ahead of a tile earlier in the row, and the player
  // event schema refused the batch.
  const strike = (): {
    readonly before: GameStateV7;
    readonly victim: ReturnType<typeof seatIdV7>;
    readonly events: readonly Parameters<typeof projectEventsV7>[3][number][];
    readonly after: GameStateV7;
  } => {
    let state = fieldV7(
      [
        { seat: 0, role: "GUARD", at: at(7, 2) },
        { seat: 0, role: "GUARD", at: at(6, 2) },
        { seat: 0, role: "FIGHTER", at: at(8, 8) },
        { seat: 1, role: "CATAPULT", at: at(4, 2) },
        { seat: 1, role: "FIGHTER", at: at(2, 8) },
      ],
      { factions: ["ORIGINAL", "UNDEAD"], activeSeat: 1 },
    );
    for (const tile of state.board.tiles)
      if (tile.site === "VILLAGE")
        state = patchTileV7(state, tile.at, { site: null });
    state = unexploreV7(state, 0, [at(4, 2), at(3, 2), at(4, 1), at(4, 3)]);
    const victim = seatIdV7(state, 0);
    const result = applyOkV7(state, seatIdV7(state, 1), {
      kind: "ATTACK",
      unitId: unitAtV7(state, at(4, 2)).id,
      targetUnitId: unitAtV7(state, at(7, 2)).id,
    });
    return {
      before: state,
      victim,
      events: result.events,
      after: result.state,
    };
  };

  it("sorts the hit unit among its splash, and the batch parses", () => {
    const { before, victim, events, after } = strike();
    expect(
      viewForV7(before, victim).units.some((unit) => unit.role === "CATAPULT"),
    ).toBe(false);
    const envelope = projectEventsV7(before, after, victim, events);
    const splash = envelope.events.find(
      (event) => event.kind === "COMBAT_SPLASH_DAMAGE",
    );
    expect(splash).toBeDefined();
    if (splash?.kind !== "COMBAT_SPLASH_DAMAGE") return;
    expect(splash.splash.map((entry) => entry.at)).toEqual([
      at(6, 2),
      at(7, 2),
    ]);
    expect(parsePlayerEventEnvelopeV7(envelope).ok).toBe(true);
  });
});

describe("boarding a Plague Galleon ends the Plagues it carries", () => {
  // Round two (`pulp_wars-2yc.97`), seed 427 (`b27`, the Showcase): a Human
  // Submarine boarded the Undead Battleship (the Plague Galleon) whose shot
  // had plagued three Human units. The prize took the Human kind, so its
  // Plagues named a source that is no Plague source any more; the state
  // check refused the result, and the offered Board was rejected as
  // INVALID_STATE.
  const scene = () => {
    const base = navalArenaV7({
      factions: ["ORIGINAL", "UNDEAD"],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: at(5, 4) },
        { seat: 0, role: "PATROL_BOAT", at: at(3, 4) },
        { seat: 1, role: "BATTLESHIP", at: at(5, 5) },
      ],
    });
    const galleon = navalUnitAtV7(base, at(5, 5));
    const boarder = navalUnitAtV7(base, at(5, 4));
    const victim = navalUnitAtV7(base, at(3, 4));
    const low = patchNavalUnitV7(base, galleon.id, { hp: 8 });
    const state = parseGameStateV7({
      ...low,
      plagued: [
        { unitId: boarder.id, sourceUnitId: galleon.id, turnsRemaining: 2 },
        { unitId: victim.id, sourceUnitId: galleon.id, turnsRemaining: 3 },
      ].sort((left, right) => left.unitId - right.unitId),
    });
    if (state === null) throw new Error("the plagued scene is invalid");
    return { state, galleon, boarder, victim };
  };

  it("is offered and accepted, and the Plagues are cleared", () => {
    const { state, galleon, boarder, victim } = scene();
    const actor = seatV7(state, 0).id;
    const command: CommandV7 = {
      kind: "BOARD",
      unitId: boarder.id,
      targetUnitId: galleon.id,
    };
    expect(queryPlayerCommandsV7(viewForV7(state, actor))).toContainEqual(
      command,
    );
    const result = applyCommandV7(state, actor, command);
    if (!result.accepted) throw new Error(result.error.code);
    expect(result.state.plagued).toEqual([]);
    expect(result.events).toContainEqual({
      kind: "PLAGUE_CLEARED",
      unitIds: [boarder.id, victim.id].sort((left, right) => left - right),
    });
    expect(
      result.state.units.find((unit) => unit.id === galleon.id)?.ownerId,
    ).toBe(actor);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(result.state)))).not.toBe(
      null,
    );
    expect(
      parsePlayerEventEnvelopeV7(
        projectEventsV7(state, result.state, actor, result.events),
      ).ok,
    ).toBe(true);
  });
});
