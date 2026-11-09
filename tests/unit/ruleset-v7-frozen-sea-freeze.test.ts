import { describe, expect, it } from "vitest";
import {
  parsePlayerEventEnvelopeV7,
  previewColdSnapV7,
  projectEventsV7,
  queryPlayerCommandsV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type GameStateV7,
  type TechnologyIdV7,
} from "../../src/engine/index";
import {
  frozenArenaV7,
  frozenStateV7,
  iceEntryV7,
} from "../fixtures/v7-frozen-sea";
import {
  acceptV7,
  navalUnitAtV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// The naval branch, engine step II (`pulp_wars-5ti.3`,
// docs/product/RULESET_7_NAVAL_BRANCH.md section 8.4), the frozen sea
// redesign (`pulp_wars-5ti.25`) and the Ice Folk freeze rework
// (`pulp_wars-s55m.1`), as the one Freeze effect (`pulp_wars-xv0t`, 7r133,
// docs/product/ICE_FOLK_REDESIGN_2026-11.md section 3.1) leaves them: the
// line roles' `FREEZE` is gone, and every freeze of a tile follows one rule,
// here through the Ice Witch's Cold Snap (her ring). Ice is permanent;
// another player's ice is taken, the own cracked ice mended (thick ice
// stays until the naval branch is rebuilt), the own sound ice and every
// dock left as they are; Deep Water needs Pack Ice; a hostile ship is
// Frozen on its open water.

const WITCH: CoordV7 = { x: 2, y: 2 };
const RIME: readonly TechnologyIdV7[] = ["SHORECRAFT"];
const PACK_ICE: readonly TechnologyIdV7[] = ["SHORECRAFT", "NAVIGATION"];
const ALL: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
  "SEAMANSHIP",
  "SUBMERSIBLES",
];

const snap = (state: GameStateV7, at: CoordV7 = WITCH): CommandV7 => ({
  kind: "COLD_SNAP",
  unitId: navalUnitAtV7(state, at).id,
});
const frozenTiles = (state: GameStateV7) => state.ice.map((entry) => entry.at);

describe("the freeze of a tile (section 3.1)", () => {
  it("no `FREEZE` is offered or accepted: the line roles freeze nothing", () => {
    const state = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [{ seat: 0, role: "FIGHTER", at: WITCH }],
    });
    expect(
      queryPlayerCommandsV7(viewForV7(state, seatV7(state, 0).id)).some(
        (command) => (command.kind as string) === "FREEZE",
      ),
    ).toBe(false);
    expect(
      rejectV7(state, 0, {
        kind: "FREEZE",
        unitId: navalUnitAtV7(state, WITCH).id,
        at: { x: 2, y: 3 },
      } as unknown as CommandV7).code,
    ).toBe("INVALID_COMMAND");
  });

  it("makes ice of Shallow Water with Rime, of Deep Water only with Pack Ice", () => {
    // The Witch on the ice of (2, 3): her ring reaches the Deep Water of row 4.
    const options = (technologies: readonly TechnologyIdV7[]) =>
      frozenArenaV7({
        technologies: [technologies, ALL],
        units: [{ seat: 0, role: "CAPTAIN", at: { x: 2, y: 3 } }],
      });
    const rime = options(RIME);
    const shallow = acceptV7(rime, 0, snap(rime, { x: 2, y: 3 })).state;
    expect(frozenTiles(shallow)).toEqual([
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ]);
    const pack = options(PACK_ICE);
    const deep = acceptV7(pack, 0, snap(pack, { x: 2, y: 3 })).state;
    expect(frozenTiles(deep)).toEqual([
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 1, y: 4 },
      { x: 2, y: 4 },
      { x: 3, y: 4 },
    ]);
  });

  it("never touches a tile the actor has not explored", () => {
    // The fogged arena keeps seat 0 to its capital's 3 x 3: nothing of the
    // Witch's ring on (2, 2) is known, so her cast changes nothing.
    const state = frozenArenaV7({
      technologies: [PACK_ICE, ALL],
      explored: [false, true],
      units: [{ seat: 0, role: "CAPTAIN", at: WITCH }],
    });
    expect(rejectV7(state, 0, snap(state))).toEqual({
      code: "COLD_SNAP_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
    // Once she knows (2, 3), that tile alone freezes.
    const known: GameStateV7 = {
      ...state,
      players: state.players.map((player) =>
        player.seat === 0
          ? {
              ...player,
              explored: [...player.explored, { x: 2, y: 3 }].sort(
                (left, right) => left.y - right.y || left.x - right.x,
              ),
            }
          : player,
      ),
    };
    const preview = previewColdSnapV7(
      viewForV7(known, seatV7(known, 0).id),
      navalUnitAtV7(known, WITCH).id,
    );
    const result = acceptV7(known, 0, snap(known));
    expect(frozenTiles(result.state)).toEqual([{ x: 2, y: 3 }]);
    expect(result.state.snow).toEqual([]);
    expect(preview?.tiles).toEqual([{ x: 2, y: 3 }]);
  });

  it("takes another player's ice and leaves its own ice and every dock", () => {
    // The Witch on (3, 2): (2, 3) is the Humans' ice, (3, 3) her own ice,
    // her Port (4, 3) beside her. (A crack to mend went with Glacier: the
    // naval branch rebuilt, `pulp_wars-tzk6`, 7r137.)
    const state = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [{ seat: 0, role: "CAPTAIN", at: { x: 3, y: 2 } }],
      ice: [{ at: { x: 2, y: 3 }, seat: 1 }, { at: { x: 3, y: 3 } }],
    });
    const seat0 = seatV7(state, 0).id;
    const result = acceptV7(state, 0, snap(state, { x: 3, y: 2 }));
    expect(iceEntryV7(result.state, { x: 2, y: 3 })).toMatchObject({
      ownerId: seat0,
    });
    expect(iceEntryV7(result.state, { x: 3, y: 3 })).toMatchObject({
      ownerId: seat0,
    });
    expect(iceEntryV7(result.state, { x: 4, y: 3 })).toBeUndefined();
    const event = result.events.find((entry) => entry.kind === "TILES_FROZEN");
    expect(event?.kind === "TILES_FROZEN" ? event.tiles : null).toEqual([
      { x: 2, y: 3 },
    ]);
    // Her own sound ice is no change: a cast with nothing else to freeze is
    // refused.
    const sound = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [{ seat: 0, role: "CAPTAIN", at: { x: 2, y: 3 } }],
      ice: [
        { at: { x: 1, y: 3 } },
        { at: { x: 3, y: 3 } },
        { at: { x: 1, y: 4 } },
        { at: { x: 2, y: 4 } },
        { at: { x: 3, y: 4 } },
      ],
    });
    const snowed = frozenStateV7(
      {
        ...sound,
        snow: [
          { x: 1, y: 2 },
          { x: 2, y: 2 },
          { x: 3, y: 2 },
        ],
      },
      [],
    );
    expect(rejectV7(snowed, 0, snap(snowed, { x: 2, y: 3 }))).toEqual({
      code: "COLD_SNAP_NOT_LEGAL",
      params: { reason: "NO_TARGET" },
    });
  });

  it("Freezes a hostile ship on its water and leaves that tile open water (Rime alone)", () => {
    const state = frozenArenaV7({
      technologies: [RIME, ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 3 } },
      ],
    });
    const boat = navalUnitAtV7(state, { x: 3, y: 3 });
    const result = acceptV7(state, 0, snap(state));
    expect(result.state.frozen).toEqual([{ unitId: boat.id, turnsLeft: 1 }]);
    expect(iceEntryV7(result.state, { x: 3, y: 3 })).toBeUndefined();
    expect(frozenTiles(result.state)).toEqual([
      { x: 1, y: 3 },
      { x: 2, y: 3 },
    ]);
  });

  it("previews every offered Cold Snap exactly", () => {
    const state = frozenArenaV7({
      technologies: [ALL, ALL],
      units: [
        { seat: 0, role: "CAPTAIN", at: WITCH },
        { seat: 1, role: "PATROL_BOAT", at: { x: 1, y: 3 } },
        { seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } },
      ],
      ice: [{ at: { x: 3, y: 3 }, seat: 1 }],
    });
    const view = viewForV7(state, seatV7(state, 0).id);
    const witch = navalUnitAtV7(state, WITCH);
    const preview = previewColdSnapV7(view, witch.id);
    const result = acceptV7(state, 0, snap(state));
    const units = result.events.find((entry) => entry.kind === "UNITS_FROZEN");
    const tiles = result.events.find((entry) => entry.kind === "TILES_FROZEN");
    expect(preview).toEqual({
      unitId: witch.id,
      targets:
        units?.kind === "UNITS_FROZEN"
          ? units.results.map((entry) => ({ unitId: entry.unitId }))
          : [],
      tiles: tiles?.kind === "TILES_FROZEN" ? tiles.tiles : [],
      snow: tiles?.kind === "TILES_FROZEN" ? tiles.snow : [],
    });
  });
});

describe("a freeze: who learns of it (section 12)", () => {
  it("projects the tiles a viewer has explored, hides an unseen unit, and drops an unseen freeze", () => {
    const scene = (explored: boolean) =>
      frozenArenaV7({
        technologies: [PACK_ICE, ALL],
        explored: [true, explored],
        units: [{ seat: 0, role: "CAPTAIN", at: WITCH }],
      });
    const seen = scene(true);
    const result = acceptV7(seen, 0, snap(seen));
    const opponent = seatV7(seen, 1).id;
    const projected = projectEventsV7(
      seen,
      result.state,
      opponent,
      result.events,
    );
    expect(projected.events).toEqual(result.events);
    expect(parsePlayerEventEnvelopeV7(projected).ok).toBe(true);
    // A viewer that explored nothing of it learns nothing.
    const hidden = scene(false);
    const far = acceptV7(hidden, 0, snap(hidden));
    expect(
      projectEventsV7(hidden, far.state, seatV7(hidden, 1).id, far.events)
        .events,
    ).toEqual([]);
    expect(viewForV7(far.state, seatV7(hidden, 1).id).ice).toEqual([]);
    // A viewer that explored one tile but not the Witch sees that tile only.
    const partial: GameStateV7 = {
      ...hidden,
      players: hidden.players.map((player) =>
        player.seat === 1
          ? {
              ...player,
              explored: [...player.explored, { x: 2, y: 3 }].sort(
                (left, right) => left.y - right.y || left.x - right.x,
              ),
            }
          : player,
      ),
    };
    const partialResult = acceptV7(partial, 0, snap(partial));
    const partialEvents = projectEventsV7(
      partial,
      partialResult.state,
      seatV7(partial, 1).id,
      partialResult.events,
    );
    expect(partialEvents.events).toEqual([
      {
        kind: "TILES_FROZEN",
        playerId: seatV7(partial, 0).id,
        unitId: null,
        tiles: [{ x: 2, y: 3 }],
        snow: [],
      },
    ]);
    expect(parsePlayerEventEnvelopeV7(partialEvents).ok).toBe(true);
    expect(
      viewForV7(partialResult.state, seatV7(partial, 1).id).ice.map(
        (entry) => entry.at,
      ),
    ).toEqual([{ x: 2, y: 3 }]);
  });

  it("a state with ice survives the schema, and the frozen state is what the fixture built", () => {
    const state = frozenArenaV7({
      units: [{ seat: 0, role: "FIGHTER", at: { x: 2, y: 3 } }],
    });
    expect(frozenTiles(state)).toEqual([{ x: 2, y: 3 }]);
    expect(frozenStateV7(state, [{ at: { x: 3, y: 3 } }]).ice).toHaveLength(2);
  });
});
