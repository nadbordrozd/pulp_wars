import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyCommandV7,
  deathCreatesGraveV7,
  defenseBonusForUnitV7,
  detectionCoversCoordV7,
  estimateCombatV7,
  fortificationLevelForUnitV7,
  gangUpBonusV7,
  isActivePortV7,
  isAfloatFormV7,
  isRallyTargetV7,
  parseGameStateV7,
  pushedDestinationV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  reachableMovementPathsV7,
  reachablePlayerMovementPathsV7,
  unitGrowsV7,
  unitSightRadiusAtV7,
  viewForV7,
  type CoordV7,
  type GameStateV7,
} from "../../src/engine/index";
import { publicThreatenedTilesForPolicyV7 } from "../../src/ai/v7";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7, withEggsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";

// Revision 19 (`pulp_wars-c87.3`): the `form` audit of concern 1
// (docs/product/RULESET_7_REVISION_19_DINOSAURS.md sections 6.1 and 17).
// Widening `UnitStateV7.form` with `EGG` breaks every site that read
// "not `LAND`" as "afloat". These tests pin, rule by rule, that an Egg is a
// land-standing unit that is not afloat, never acts, and still occupies its
// tile, and that no new "not `LAND`" test enters the engine or the Normal AI
// without an audit.

const NEST = { x: 7, y: 7 } as const;

/** Seat 0 Dinosaur with a Raptor Egg on the nest tile (7, 7). */
function arena(
  pieces: Parameters<typeof goblinArenaV7>[1],
  options: Parameters<typeof goblinArenaV7>[2] & {
    readonly opponent?: "ORIGINAL" | "UNDEAD" | "GOBLIN" | "DINOSAUR";
    readonly eggHp?: number;
    readonly eggMaxHp?: number;
  } = {},
): GameStateV7 {
  return withEggsV7(
    goblinArenaV7(
      ["DINOSAUR", options.opponent ?? "ORIGINAL"],
      pieces,
      options,
    ),
    [
      {
        seat: 0,
        role: "RAIDER",
        at: NEST,
        ...(options.eggMaxHp === undefined ? {} : { maxHp: options.eggMaxHp }),
        ...(options.eggHp === undefined ? {} : { hp: options.eggHp }),
      },
    ],
  );
}

function grass(state: GameStateV7, tiles: readonly CoordV7[]): GameStateV7 {
  return checkedV7({
    ...state,
    board: {
      ...state.board,
      tiles: state.board.tiles.map((tile) =>
        tiles.some((at) => sameV7(at, tile.at)) && tile.site === null
          ? {
              ...tile,
              biome: "PLAINS" as const,
              terrain: "GRASS" as const,
              resource: null,
              improvement: null,
              road: false,
              fieldDefense: false,
            }
          : tile,
      ),
    },
  });
}

describe("ruleset-7 revision-19 form audit: an Egg is on land and not afloat", () => {
  it("names exactly the naval and embarked forms afloat", () => {
    expect(
      (["LAND", "EMBARKED", "NAVAL", "EGG"] as const).map((form) =>
        isAfloatFormV7(form),
      ),
    ).toEqual([false, true, true, false]);
  });

  it("passes state parsing on a land tile and is rejected on water", () => {
    const state = arena([{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }]);
    expect(parseGameStateV7(JSON.parse(JSON.stringify(state)))).toEqual(state);
    const afloat = {
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          sameV7(tile.at, NEST)
            ? {
                ...tile,
                biome: null,
                terrain: "SHALLOW_WATER",
                resource: null,
                improvement: null,
              }
            : tile,
        ),
      },
    };
    expect(parseGameStateV7(afloat)).toBeNull();
    // A naval or embarked unit on that land tile is rejected, as before.
    for (const form of ["NAVAL", "EMBARKED"] as const)
      expect(
        parseGameStateV7({
          ...state,
          units: state.units.map((unit) =>
            unit.form === "EGG" ? { ...unit, form } : unit,
          ),
        }),
      ).toBeNull();
  });

  it("is not pushed, with land or with water behind it (Push)", () => {
    // Juggernaut (6, 7) → Egg (7, 7) → (8, 7): land behind.
    const land = grass(
      arena([{ seat: 1, role: "JUGGERNAUT", at: { x: 6, y: 7 }, hp: 3 }], {
        activeSeat: 1,
        eggMaxHp: 10,
      }),
      [{ x: 8, y: 7 }],
    );
    // The same with water behind: a naval unit would be pushed onto it.
    const water = arena(
      [{ seat: 1, role: "JUGGERNAUT", at: { x: 6, y: 7 }, hp: 3 }],
      { activeSeat: 1, eggMaxHp: 10, water: [{ x: 8, y: 7 }] },
    );
    for (const state of [land, water]) {
      const attacker = unitAtV7(state, { x: 6, y: 7 });
      const egg = unitAtV7(state, NEST);
      expect(pushedDestinationV7(state, attacker, egg)).toBeNull();
      expect(estimateCombatV7(state, attacker.id, egg.id)).toMatchObject({
        defenderDies: false,
        push: "BLOCKED",
      });
      expect(
        queryCombatPreviewV7(state, seatIdV7(state, 1), attacker.id, egg.id),
      ).toMatchObject({ push: "BLOCKED" });
      const result = applyOkV7(state, seatIdV7(state, 1), {
        kind: "ATTACK",
        unitId: attacker.id,
        targetUnitId: egg.id,
      });
      expect(unitAtV7(result.state, NEST).id).toBe(egg.id);
    }
  });

  it("projects no zone of control onto land or water (ZOC)", () => {
    // Land: a Raider walks two tiles past the Egg.
    const landPath = [
      { x: 6, y: 6 },
      { x: 5, y: 6 },
    ];
    const land = grass(
      arena([{ seat: 1, role: "RAIDER", at: { x: 7, y: 6 } }], {
        activeSeat: 1,
      }),
      landPath,
    );
    expect(
      applyCommandV7(land, seatIdV7(land, 1), {
        kind: "MOVE",
        unitId: unitAtV7(land, { x: 7, y: 6 }).id,
        path: landPath,
      }).accepted,
    ).toBe(true);
    // Water: a Patrol Boat sails two tiles along the shore next to the Egg.
    // A land-form unit with a melee Attack there would stop it.
    const sea = [
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 6, y: 7 },
    ];
    const boatAt = sea[0] as CoordV7;
    const path = sea.slice(1);
    const shore = arena(
      [{ seat: 1, role: "PATROL_BOAT", form: "NAVAL", at: boatAt }],
      { activeSeat: 1, water: sea },
    );
    expect(
      applyCommandV7(shore, seatIdV7(shore, 1), {
        kind: "MOVE",
        unitId: unitAtV7(shore, boatAt).id,
        path,
      }).accepted,
    ).toBe(true);
    const guarded = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 1, role: "PATROL_BOAT", form: "NAVAL", at: boatAt },
        { seat: 0, role: "RAIDER", at: NEST },
      ],
      { activeSeat: 1, water: sea },
    );
    expect(
      applyCommandV7(guarded, seatIdV7(guarded, 1), {
        kind: "MOVE",
        unitId: unitAtV7(guarded, boatAt).id,
        path,
      }),
    ).toMatchObject({
      accepted: false,
      error: { params: { reason: "ZOC_STOPS_MOVE" } },
    });
    // The Normal AI's own threat model agrees: the boat's reach is the same
    // with and without the Egg on the shore.
    const withoutEgg = goblinArenaV7(
      ["DINOSAUR", "ORIGINAL"],
      [{ seat: 1, role: "PATROL_BOAT", form: "NAVAL", at: boatAt }],
      { activeSeat: 1, water: sea },
    );
    const reach = (state: GameStateV7): readonly CoordV7[] => {
      const view = viewForV7(state, seatIdV7(state, 0));
      const boat = view.units.find((unit) => unit.role === "PATROL_BOAT");
      if (boat === undefined) throw new Error("boat missing");
      return publicThreatenedTilesForPolicyV7(view, boat);
    };
    expect(reach(shore)).toEqual(reach(withoutEgg));
  });

  it("never blockades a dock (blockade)", () => {
    // A Human Port at (6, 7) next to the Egg stays active; a hostile boat on
    // it blockades it.
    const dock = { x: 6, y: 7 };
    const base = arena([{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }], {
      water: [dock],
    });
    const humanCity = cityOfV7(base, 1);
    const state = {
      ...base,
      board: {
        ...base.board,
        tiles: base.board.tiles.map((tile) =>
          sameV7(tile.at, dock)
            ? {
                ...tile,
                improvement: "PORT" as const,
                territoryCityId: humanCity.id,
              }
            : tile,
        ),
      },
    };
    expect(isActivePortV7(state, dock, humanCity.ownerId)).toBe(true);
    const egg = unitAtV7(base, NEST);
    // Only an afloat hostile unit on the dock tile blockades; an Egg cannot
    // even stand there.
    expect(
      isActivePortV7(
        {
          ...state,
          units: [{ ...egg, at: dock }],
        },
        dock,
        humanCity.ownerId,
      ),
    ).toBe(true);
    expect(
      isActivePortV7(
        { ...state, units: [{ ...egg, at: dock, form: "EMBARKED" }] },
        dock,
        humanCity.ownerId,
      ),
    ).toBe(false);
  });

  it("leaves no Grave, unlike a land-form unit on the same tile (Graves)", () => {
    const state = arena([{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }], {
      opponent: "UNDEAD",
      activeSeat: 1,
    });
    const egg = unitAtV7(state, NEST);
    expect(deathCreatesGraveV7(state, state.graves, egg)).toBe(false);
    expect(
      deathCreatesGraveV7(state, state.graves, { ...egg, form: "LAND" }),
    ).toBe(true);
    const result = applyOkV7(state, seatIdV7(state, 1), {
      kind: "ATTACK",
      unitId: unitAtV7(state, { x: 6, y: 7 }).id,
      targetUnitId: egg.id,
    });
    expect(result.state.graves).toEqual([]);
    expect(
      result.events.some(
        (event) =>
          event.kind === "GRAVE_CREATED" ||
          event.kind === "UNIT_INFECTED" ||
          event.kind === "BITTEN_UNIT_RISEN",
      ),
    ).toBe(false);
  });

  it("is a land target for attack legality, and never an attacker", () => {
    // A melee land unit advances onto the Egg's tile after destroying it; a
    // Battleship attacks it at range from the sea and does not advance.
    const sea = [{ x: 5, y: 5 }];
    const state = arena(
      [
        { seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } },
        {
          seat: 1,
          role: "BATTLESHIP",
          form: "NAVAL",
          at: { x: 5, y: 5 },
        },
      ],
      { activeSeat: 1, water: sea, eggHp: 1 },
    );
    const humanId = seatIdV7(state, 1);
    const egg = unitAtV7(state, NEST);
    const offered = queryPlayerCommandsV7(state, humanId).flatMap((command) =>
      command.kind === "ATTACK" && command.targetUnitId === egg.id
        ? [command.unitId]
        : [],
    );
    expect(offered.sort()).toEqual(
      [
        unitAtV7(state, { x: 6, y: 7 }).id,
        unitAtV7(state, { x: 5, y: 5 }).id,
      ].sort(),
    );
    const melee = applyOkV7(state, humanId, {
      kind: "ATTACK",
      unitId: unitAtV7(state, { x: 6, y: 7 }).id,
      targetUnitId: egg.id,
    });
    expect(unitAtV7(melee.state, NEST).role).toBe("FIGHTER");
    const ranged = applyOkV7(state, humanId, {
      kind: "ATTACK",
      unitId: unitAtV7(state, { x: 5, y: 5 }).id,
      targetUnitId: egg.id,
    });
    expect(unitAtV7(ranged.state, { x: 5, y: 5 }).role).toBe("BATTLESHIP");
    expect(ranged.state.units.some((unit) => sameV7(unit.at, NEST))).toBe(
      false,
    );
    // The Egg never attacks: nothing is offered, estimated, or accepted.
    const own = arena([{ seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } }]);
    const target = unitAtV7(own, { x: 6, y: 7 });
    expect(estimateCombatV7(own, unitAtV7(own, NEST).id, target.id)).toBeNull();
    expect(
      queryCombatPreviewV7(
        own,
        own.humanPlayerId,
        unitAtV7(own, NEST).id,
        target.id,
      ),
    ).toBeNull();
    expect(
      applyCommandV7(own, own.humanPlayerId, {
        kind: "ATTACK",
        unitId: unitAtV7(own, NEST).id,
        targetUnitId: target.id,
      }),
    ).toMatchObject({ accepted: false, error: { code: "UNIT_IS_EGG" } });
  });

  it("fails every active-ability gate that needs land form", () => {
    const state = arena([
      { seat: 0, role: "CAPTAIN", at: { x: 6, y: 6 } },
      { seat: 1, role: "FIGHTER", at: { x: 6, y: 7 } },
    ]);
    const egg = unitAtV7(state, NEST);
    const shaman = unitAtV7(state, { x: 6, y: 6 });
    // No cover, no fortification, no Gang Up help, no Rally, no growth, no
    // sight, no detection, no movement, and no threat.
    const fortified = checkedV7({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((tile) =>
          sameV7(tile.at, NEST)
            ? {
                ...tile,
                terrain: "FOREST" as const,
                biome: "WOODLAND" as const,
                fieldDefense: true,
              }
            : tile,
        ),
      },
    });
    const fortifiedEgg = unitAtV7(fortified, NEST);
    expect(defenseBonusForUnitV7(fortified, fortifiedEgg)).toEqual({
      numerator: 1,
      denominator: 1,
    });
    expect(fortificationLevelForUnitV7(fortified, fortifiedEgg)).toBe(0);
    expect(
      fortificationLevelForUnitV7(fortified, { ...fortifiedEgg, form: "LAND" }),
    ).toBe(1);
    expect(isRallyTargetV7(state, shaman, egg)).toBe(false);
    expect(isRallyTargetV7(state, shaman, { ...egg, form: "LAND" })).toBe(true);
    expect(unitGrowsV7(state, egg)).toBe(false);
    expect(unitGrowsV7(state, { ...egg, form: "LAND" })).toBe(true);
    expect(unitSightRadiusAtV7(state, egg)).toBe(0);
    expect(reachableMovementPathsV7(state, egg)).toEqual([]);
    const view = viewForV7(state, state.humanPlayerId);
    const publicEgg = view.units.find((unit) => unit.id === egg.id);
    if (publicEgg === undefined) throw new Error("Egg not visible");
    expect(reachablePlayerMovementPathsV7(view, publicEgg)).toEqual([]);
    expect(queryThreatenedTilesV7(state, egg.id, seatIdV7(state, 1))).toEqual(
      [],
    );
    expect(
      publicThreatenedTilesForPolicyV7(
        viewForV7(state, seatIdV7(state, 1)),
        publicEgg,
      ),
    ).toEqual([]);
    // Detection: the Egg alone covers nothing; a hatched Raptor covers two.
    const lone = arena([{ seat: 1, role: "FIGHTER", at: { x: 1, y: 1 } }]);
    // (6, 6) is next to the Egg and two tiles from the city center (8, 8).
    const far = { x: 6, y: 6 };
    expect(detectionCoversCoordV7(lone, lone.humanPlayerId, far)).toBe(false);
    const hatched = checkedV7({
      ...lone,
      eggs: [],
      units: lone.units.map((unit) =>
        unit.form === "EGG"
          ? {
              ...unit,
              form: "LAND" as const,
              hp: 12,
              maxHp: 12,
              activation: {
                ...unit.activation,
              },
            }
          : unit,
      ),
    });
    expect(detectionCoversCoordV7(hatched, hatched.humanPlayerId, far)).toBe(
      true,
    );
    // Gang Up never counts an Egg for anyone: Eggs are Dinosaur units and a
    // Dinosaur attacker has no Gang Up.
    expect(
      gangUpBonusV7(
        state,
        state.units,
        shaman,
        unitAtV7(state, { x: 6, y: 7 }),
      ),
    ).toBe(0);
  });
});

describe("ruleset-7 revision-19 form audit: source", () => {
  // Every `form !== "LAND"` test in the engine and the Normal AI, by file.
  // Each one was audited for an Egg in `pulp_wars-c87.3`: it is either a
  // land-form gate that an Egg must fail (abilities, cover, fortification,
  // Graves, risings, Rally, Tend, Recover, Pillage, Disband, capture), or a
  // test on a unit that can never be an Egg (the mover of a Move, the
  // defender of a Push after the explicit Egg guard, the actor of a policy
  // decision). "Afloat" is always asked with `isAfloatFormV7`.
  //
  // A new `form !== "LAND"` fails this test: audit it for Eggs (is "not
  // LAND" being read as "afloat"?), then update the count.
  const AUDITED: Readonly<Record<string, number>> = {
    "src/engine/v7/combat.ts": 4,
    "src/engine/v7/explosions.ts": 1,
    "src/engine/v7/graves.ts": 1,
    "src/engine/v7/movement.ts": 3,
    "src/engine/v7/query.ts": 5,
    "src/engine/v7/reducer.ts": 13,
    "src/engine/v7/state-schema.ts": 2,
    "src/engine/v7/wail.ts": 1,
    "src/engine/rules/ruleset-v7.ts": 1,
    "src/ai/v7-goblin.ts": 1,
    "src/ai/v7-undead.ts": 1,
    "src/ai/v7.ts": 11,
  };

  it("has no unaudited not-LAND form test in the engine or the Normal AI", () => {
    const root = join(import.meta.dirname, "..", "..");
    const files = [
      ...readdirSync(join(root, "src/engine/v7"))
        .filter((name) => name.endsWith(".ts"))
        .map((name) => `src/engine/v7/${name}`),
      "src/engine/rules/ruleset-v7.ts",
      ...readdirSync(join(root, "src/ai"))
        .filter((name) => name.startsWith("v7") && name.endsWith(".ts"))
        .map((name) => `src/ai/${name}`),
    ];
    const counted: Record<string, number> = {};
    for (const file of files) {
      const count = (
        readFileSync(join(root, file), "utf8").match(/form\s*!==\s*"LAND"/g) ??
        []
      ).length;
      if (count > 0) counted[file] = count;
    }
    expect(counted).toEqual(AUDITED);
  });
});
