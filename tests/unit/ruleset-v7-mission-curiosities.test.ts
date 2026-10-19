import { describe, expect, it } from "vitest";
import {
  MISSION_REGISTRY_V7,
  MissionBuildErrorV7,
  buildMissionStateV7,
  createPlayableGameV7,
  missionByIdV7,
  missionHasCuriositiesV7,
  missionMatchSetupV7,
  parseGameStateV7,
  parseMatchSetupV7,
  playerId,
  queryPlayerCommandsV7,
  validateMatchSetupV7,
  validateMissionDefinitionV7,
  viewForV7,
  type GameStateV7,
  type MissionCuriosityV7,
  type MissionDefinitionV7,
} from "../../src/engine/index";
import { testGrounds } from "./ruleset-v7-missions.shared";

// Mission curiosities (`pulp_wars-hmyk.14`, docs/product/SAGA.md section 4,
// E1; docs/product/CAMPAIGN.md section 10.9): a definition places
// curiosities by hand; the generator's site rules do not bind them, each
// kind's tile rules do; the setup's `curiosities` key says whether a
// mission places any; HUMAN_5 has the Sea Serpent and HUMAN_6 the Tesla
// Tower; every other mission is built without curiosities as before.

/** TEST_GROUNDS (11 x 11, Humans or Goblins against the Undead) with these. */
function grounds(
  curiosities: readonly MissionCuriosityV7[],
  change: Partial<MissionDefinitionV7> = {},
): MissionDefinitionV7 {
  return { ...testGrounds(), curiosities, ...change };
}

function built(mission: MissionDefinitionV7): GameStateV7 {
  const setup = missionMatchSetupV7(mission);
  if (setup === null) throw new Error("no setup");
  return buildMissionStateV7(mission, setup);
}

function refusal(mission: MissionDefinitionV7): string {
  try {
    validateMissionDefinitionV7(mission);
  } catch (error) {
    expect(error).toBeInstanceOf(MissionBuildErrorV7);
    return (error as Error).message;
  }
  return "accepted";
}

/** A water board: TEST_GROUNDS with the tiles of `box` turned to sea. */
function seaGrounds(
  curiosities: readonly MissionCuriosityV7[],
  box = { x0: 4, y0: 4, x1: 10, y1: 10 },
): MissionDefinitionV7 {
  const base = testGrounds();
  const sea = (rows: readonly string[], fill: string) =>
    rows.map((row, y) =>
      [...row]
        .map((cell, x) =>
          x >= box.x0 && x <= box.x1 && y >= box.y0 && y <= box.y1
            ? fill
            : cell,
        )
        .join(""),
    );
  return {
    ...base,
    terrain: sea(base.terrain, "~"),
    resources: sea(base.resources, "."),
    // The Undead keep their capital; their second city, the Road, the
    // Grave, the chest and the eastern village are gone.
    villages: [{ x: 4, y: 1 }],
    roads: [],
    graves: [],
    treasureChests: [],
    seats: base.seats.map((seat, index) =>
      index === 1
        ? {
            ...seat,
            cities: seat.cities.slice(0, 1),
            units: seat.units.slice(0, 2),
            reveal: { radius: 2 },
          }
        : seat,
    ),
    curiosities,
  };
}

/** The unit `id` on the Tower's tile, seat 0 seeing the whole board. */
function guardOnTower(state: GameStateV7, id: number): GameStateV7 {
  const all = state.board.tiles.map((tile) => tile.at);
  return {
    ...state,
    players: state.players.map((player, seat) =>
      seat === 0 ? { ...player, explored: all } : player,
    ),
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, at: { x: 5, y: 8 } } : unit,
    ),
  };
}

describe("mission curiosities", () => {
  it("leaves every mission without curiosities as it was: none placed, the setup's key false", () => {
    for (const mission of MISSION_REGISTRY_V7) {
      const setup = missionMatchSetupV7(mission);
      if (setup === null) throw new Error(mission.id);
      const placed = ["HUMAN_5", "HUMAN_6", "TEST_CURIOSITIES"].includes(
        mission.id,
      );
      expect(missionHasCuriositiesV7(mission), mission.id).toBe(placed);
      expect(setup.curiosities, mission.id).toBe(placed);
      if (placed) continue;
      expect(mission.curiosities, mission.id).toBeUndefined();
      const created = createPlayableGameV7(setup);
      if (!created.ok) throw new Error(mission.id);
      expect(created.state.curiosities, mission.id).toEqual([]);
    }
  });

  it("places the Sea Serpent in HUMAN_5 and the Tesla Tower in HUMAN_6", () => {
    const broadsides = missionByIdV7("HUMAN_5");
    const hall = missionByIdV7("HUMAN_6");
    if (broadsides === null || hall === null) throw new Error("missing");
    expect([broadsides.revision, hall.revision]).toEqual([2, 2]);
    const sea = createPlayableGameV7(
      missionMatchSetupV7(broadsides) ?? (null as never),
    );
    if (!sea.ok) throw new Error("HUMAN_5");
    expect(sea.state.curiosities).toEqual([]);
    expect(sea.state.monsters).toMatchObject([
      { breed: "SEA_SERPENT", home: { x: 8, y: 5 }, provokedBy: [] },
    ]);
    const serpent = sea.state.units.find(
      (unit) => unit.id === sea.state.monsters[0]?.unitId,
    );
    expect(serpent).toMatchObject({
      ownerId: 0,
      form: "NAVAL",
      at: { x: 8, y: 5 },
      hp: 32,
    });
    // It takes the last initial entity ID, after every seat's units.
    expect(Math.max(...sea.state.units.map((unit) => unit.id))).toBe(
      serpent?.id,
    );
    const lawn = createPlayableGameV7(
      missionMatchSetupV7(hall) ?? (null as never),
    );
    if (!lawn.ok) throw new Error("HUMAN_6");
    expect(lawn.state.curiosities).toEqual([
      { kind: "TESLA_TOWER", at: { x: 10, y: 6 } },
    ]);
    expect(lawn.state.monsters).toEqual([]);
    // Within 2 of the Hall's gate: the generator would never put it there.
    const gate = hall.landmarks?.[0]?.at ?? { x: 0, y: 0 };
    expect(Math.max(Math.abs(gate.x - 10), Math.abs(gate.y - 6))).toBe(2);
  });

  it("requires a mission setup's curiosities key to say whether the definition places any", () => {
    const hall = missionByIdV7("HUMAN_6");
    if (hall === null) throw new Error("HUMAN_6");
    const setup = missionMatchSetupV7(hall);
    if (setup === null) throw new Error("no setup");
    expect(parseMatchSetupV7(setup)).toEqual(setup);
    const invalid = {
      ok: false,
      error: { code: "INVALID_SETUP", params: {} },
    };
    expect(validateMatchSetupV7({ ...setup, curiosities: false })).toEqual(
      invalid,
    );
    const plain = missionMatchSetupV7(testGrounds());
    if (plain === null) throw new Error("no setup");
    expect(validateMatchSetupV7({ ...plain, curiosities: true })).toEqual(
      invalid,
    );
  });

  it("builds every kind fresh, skipping the generator's distances and board widths", () => {
    // TEST_CURIOSITIES: an 11 x 11 board (below every round-3 width), the
    // curiosities next to the settlements.
    const fixture = missionByIdV7("TEST_CURIOSITIES");
    if (fixture === null) throw new Error("TEST_CURIOSITIES");
    expect(fixture).toMatchObject({ hidden: true, revision: 1, size: 11 });
    const state = built(fixture);
    expect(parseGameStateV7(state)).not.toBeNull();
    expect(state.setup.curiosities).toBe(true);
    expect(state.curiosities).toEqual([
      { kind: "GATE", at: { x: 3, y: 2 }, partner: { x: 8, y: 9 } },
      { kind: "MOON_GUN", at: { x: 4, y: 4 }, lastFired: null },
      { kind: "FOUNTAIN", at: { x: 6, y: 4 } },
      { kind: "GOLD_CLAIM", at: { x: 3, y: 6 }, ownerId: null, left: 30 },
      { kind: "LOST_EXPEDITION", at: { x: 6, y: 6 }, foundBy: null },
      { kind: "WISHING_WELL", at: { x: 8, y: 6 }, tossedBy: [] },
      { kind: "TESLA_TOWER", at: { x: 5, y: 8 } },
      { kind: "SHRINE", at: { x: 4, y: 9 } },
      { kind: "GATE", at: { x: 8, y: 9 }, partner: { x: 3, y: 2 } },
    ]);
    expect(state.monsters).toMatchObject([
      { breed: "GIANT_SPIDER", home: { x: 8, y: 5 } },
    ]);
    // No harvest record is written on a curiosity's tile.
    for (const record of state.populationContributions)
      if (record.source.kind === "RESOURCE_ACTION")
        expect(
          state.curiosities.some(
            (item) =>
              item.at.x === record.source.at.x &&
              item.at.y === record.source.at.y,
          ),
        ).toBe(false);
  });

  it("turns the kinds' rules on: a unit on a hand-placed Tesla Tower may zap", () => {
    const state = built(missionByIdV7("TEST_CURIOSITIES") ?? testGrounds());
    const human = playerId(1);
    // The Guard steps onto the Tower (a hand-built position, the board in
    // sight); the Undead Marksman on its second city is 2 away.
    const guard = state.units.find(
      (unit) => unit.ownerId === human && unit.role === "GUARD",
    );
    const marksman = state.units.find(
      (unit) => unit.ownerId !== human && unit.role === "MARKSMAN",
    );
    if (guard === undefined || marksman === undefined) throw new Error("units");
    const onTower = guardOnTower(state, guard.id);
    expect(queryPlayerCommandsV7(viewForV7(onTower, human))).toContainEqual({
      kind: "ZAP",
      unitId: guard.id,
      targetUnitId: marksman.id,
    });
    // Without the Tower nothing is offered.
    const plain = built(testGrounds());
    const moved = guardOnTower(plain, guard.id);
    expect(
      queryPlayerCommandsV7(viewForV7(moved, human)).some(
        (command) => command.kind === "ZAP",
      ),
    ).toBe(false);
  });

  it("places a Sea Serpent on Deep Water with room, and refuses it without", () => {
    // HUMAN_5 builds one (above); here the tile rules on a hand-made sea.
    expect(
      refusal(seaGrounds([{ kind: "SEA_SERPENT", at: { x: 8, y: 7 } }])),
    ).toBe("accepted");
    // Shallow Water (next to the shore).
    expect(
      refusal(seaGrounds([{ kind: "SEA_SERPENT", at: { x: 4, y: 7 } }])),
    ).toMatch(/sea serpent at \(4, 7\) is not on its kind's terrain/);
    // Deep, but in a pond of 10 water tiles within 3: no room to prowl.
    expect(
      refusal(
        seaGrounds([{ kind: "SEA_SERPENT", at: { x: 6, y: 7 } }], {
          x0: 5,
          y0: 6,
          x1: 7,
          y1: 8,
        }),
      ),
    ).toMatch(/sea serpent at \(6, 7\) has fewer than 16 water tiles within 3/);
  });

  it("refuses a hand-placed curiosity that breaks its kind's tile rules", () => {
    const cases: readonly [readonly MissionCuriosityV7[], RegExp][] = [
      // On a city centre, a village, a resource, a chest, a Grave, a unit.
      [[{ kind: "SHRINE", at: { x: 2, y: 3 } }], /is on a settlement/],
      [[{ kind: "SHRINE", at: { x: 5, y: 5 } }], /is on a settlement/],
      [[{ kind: "FOUNTAIN", at: { x: 4, y: 2 } }], /is on a resource/],
      [[{ kind: "SHRINE", at: { x: 5, y: 9 } }], /treasure chest/],
      [[{ kind: "SHRINE", at: { x: 5, y: 7 } }], /is on a Grave/],
      [[{ kind: "TESLA_TOWER", at: { x: 3, y: 8 } }], /starting unit/],
      // An improvement, the wrong terrain, the edge ring.
      [[{ kind: "SHRINE", at: { x: 1, y: 9 } }], /resource|improvement/],
      [[{ kind: "MOON_GUN", at: { x: 3, y: 4 } }], /kind's terrain/],
      [[{ kind: "WRECK", at: { x: 4, y: 4 } }], /kind's terrain/],
      [[{ kind: "SHRINE", at: { x: 0, y: 5 } }], /edge ring/],
      // One of each kind, one tile each, one danger.
      [
        [
          { kind: "SHRINE", at: { x: 4, y: 6 } },
          { kind: "SHRINE", at: { x: 6, y: 6 } },
        ],
        /two curiosities of kind SHRINE/,
      ],
      [
        [{ kind: "GATES", at: { x: 4, y: 6 }, partner: { x: 4, y: 6 } }],
        /shares its tile/,
      ],
      [
        [
          { kind: "MONSTER", at: { x: 8, y: 5 } },
          {
            kind: "DOWNED_SAUCER",
            at: { x: 9, y: 6 },
            guards: [{ breed: "GRUNT", at: { x: 9, y: 5 } }],
          },
        ],
        /one danger/,
      ],
      // A neutral unit stands 3 or more from every centre.
      [[{ kind: "MONSTER", at: { x: 4, y: 7 } }], /within 2 of a settlement/],
      // A camp's guards are of its breeds; no Graveyard with the Undead.
      [
        [
          {
            kind: "DOWNED_SAUCER",
            at: { x: 4, y: 7 },
            guards: [{ breed: "ZOMBIE", at: { x: 4, y: 6 } }],
          },
        ],
        /cannot be guarded by a ZOMBIE/,
      ],
      [
        [
          {
            kind: "GRAVEYARD",
            at: { x: 4, y: 7 },
            guards: [{ breed: "ZOMBIE", at: { x: 4, y: 6 } }],
          },
        ],
        /Graveyard cannot stand on a board with an Undead seat/,
      ],
      [
        [{ kind: "KRAKEN" as never, at: { x: 4, y: 7 } }],
        /curiosity kind KRAKEN is unknown/,
      ],
    ];
    for (const [curiosities, reason] of cases)
      expect(
        refusal(grounds(curiosities)),
        JSON.stringify(curiosities),
      ).toMatch(reason);
  });
});
