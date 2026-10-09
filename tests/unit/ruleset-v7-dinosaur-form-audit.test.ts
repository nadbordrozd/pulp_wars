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
    ).toBe(2);
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
  //
  // The Martian revision (`pulp_wars-t6s.2`) re-audited every site. Cover,
  // fortification, and terrain entry no longer read the form directly: they
  // go through `unitTakesCoverV7` and the shared `canEnterTerrainV7` (whose
  // `afloat` input is `isAfloatFormV7`, or the mover's land form in a Move),
  // which removed three tests from combat.ts and one from movement.ts. The
  // reducer gained four land-form gates that an Egg must fail: the Saucer
  // of a Beam Down, the Brain and the target of a Mind Control, and the
  // Mothership of a Tractor Beam. The state schema gained the Thrall form
  // rule (a Thrall is land-form or embarked, never an Egg or a boat).
  //
  // The Ice Folk revision (`pulp_wars-7g3.3`) adds two land-form gates to
  // the reducer that an Egg must fail: the Sled of a Throw Bolas and the
  // Ice Witch of a Cold Snap. Its Chill targets are tested with
  // `form === "LAND"` (an Egg, an embarked unit, and a boat are never
  // Chilled).
  //
  // The Dwarf revision (`pulp_wars-78i.3`) adds land-form gates that an
  // Egg, an embarked unit, and a boat must fail: the Mole of a Tunnel, the
  // Gyrocopter of a Bomb Run, and the Engineer of an Assemble; the rising
  // of a Bitten eruption or bomb victim (an Egg is never Bitten); Dig In
  // (dwarf.ts); Plated (ruleset-v7.ts: the Tank's cap, land form only); and
  // the state schema's burrowed entry (a mound is a land-form record).
  //
  // The Candy revision (`pulp_wars-jdb.3`) adds land-form gates that an
  // Egg, an embarked unit, and a boat must fail (candy.ts): the unit of a
  // Sugar Rush, the Rush bonus and the Escape perk of an attacker (an Egg
  // never attacks), the death that leaves Crumbs (an Egg is never a Candy
  // seat's unit), the Confectioner of a Re-bake and the Gunner of a Sugar
  // Toss, and a Toss target ("never an Egg"); the eater of Crumbs
  // (candy-reducer.ts: an Egg never moves, and an embarked unit that ends a
  // Move afloat is not on Crumbs); and the state schema's `sugarRush` entry
  // (land or embarked, never an Egg or a boat) and `tossedThisTurn` entry
  // (land form). The Candy redesign (`pulp_wars-jdb.12`) removes the
  // Escape perk's gate (candy.ts) and adds the Top-Up target's
  // (candy-abilities.ts: an Egg, an embarked unit, and a boat are never
  // topped up).
  const AUDITED: Readonly<Record<string, number>> = {
    "src/engine/v7/candy.ts": 5,
    "src/engine/v7/candy-abilities.ts": 1,
    "src/engine/v7/candy-reducer.ts": 1,
    // The Dinosaur pass (`pulp_wars-w49.15`): Pack Hunt counts a dinosaur
    // beside the target in land form only (`packHuntAttack2V7`: never an
    // Egg or an embarked unit).
    "src/engine/v7/combat.ts": 2,
    // Tuning 5 (`pulp_wars-w49.4`): the unit that sets a Blast Mountain and
    // is not hit is a land-form unit (an Egg, an embarked unit, and a boat
    // set no charge).
    "src/engine/v7/explosions.ts": 2,
    "src/engine/v7/graves.ts": 1,
    // `pulp_wars-5ti.3` (the frozen sea): a boat or an embarked unit on ice is
    // Icebound and makes no Move (canonical and public validation; an Egg is
    // never on water).
    "src/engine/v7/movement.ts": 4,
    // `pulp_wars-5ti.3`: a Wreck is salvaged by an afloat unit or by a
    // land-form unit standing on ice (an Egg never moves onto one).
    "src/engine/v7/curiosities.ts": 1,
    // Revision 20 removed the Stampede resolution and preview (two tests
    // each in the reducer and the queries).
    // `pulp_wars-v3w`: the public Restless test moved to the shared Recover
    // predicate (recovery.ts, which asks for the land form and excludes an
    // Egg and an embarked unit by name).
    // Dwarf crowd control (`pulp_wars-w49.33`): the public Barricade tiles
    // and the unavailable reason are an Engineer's in land form (an
    // embarked Engineer builds nothing; an Egg is not an Engineer).
    "src/engine/v7/query.ts": 4,
    // `pulp_wars-b5f.6`: the Mind Control target gate moved from the
    // reducer into the shared `mindControlTargetBlockV7` (martian.ts), which
    // the reducer and the public query both call; the Brain gate stays in
    // the reducer. An Egg, an embarked unit, and a boat must still fail it.
    // `pulp_wars-5ti.3`: Freeze is used by a land-form unit only (an Egg, an
    // embarked unit, and a boat must fail it).
    // Tuning 5 (`pulp_wars-w49.4`) removed Drill and its land-form gate.
    // Map curiosities round 2 (`pulp_wars-737.14`): the Wishing Well's
    // tosser stands on the Well in land form; Ice Folk Freeze
    // (`pulp_wars-w49.37`): the Ice Witch casts in land form (an Egg, an
    // embarked unit, and a boat must fail both). Found by the Candy
    // redesign's rebase (`pulp_wars-jdb.12`): this pin had been left at 17.
    "src/engine/v7/reducer.ts": 19,
    // Step two of the Martian pass (`pulp_wars-w49.25`, 7r58): City Walls
    // hold a land-form unit on its own center against a Saucer's Tractor
    // Beam (`unitHeldByCityWallsV7`; an Egg, an embarked unit, and a boat
    // are never held: Walls fortify land-form units only).
    "src/engine/v7/martian.ts": 2,
    // `pulp_wars-9s0.5`: only a land-form flyer stands on a Rift (an Egg,
    // an embarked unit, and a boat must fail the state check).
    // `pulp_wars-737.3`: a Giant Spider is a land-form unit (an Egg, an
    // embarked unit, and a boat must fail its state check).
    // The giants' signatures (`pulp_wars-w49.30`): a held victim and its
    // holder are land-form units (an Egg, an embarked unit, and a boat must
    // fail the `giants` check), and a Gingerbread Man (`variant`) is a land
    // or embarked unit (never an Egg or a boat).
    "src/engine/v7/state-schema.ts": 11,
    // The giants' signatures (`pulp_wars-w49.30`, G2): every signature
    // needs the giant in land form (the Abomination of a Swallow, the Troll
    // of a Toss, the Brontosaurus of a Stomp, the Gingerbread Giant of a
    // Break Off), a Swallow target is a land-form unit, a death by a fixed
    // hit leaves its rising only for a land-form unit (as a splash death),
    // and an embarked holder's victim is digested, never released afloat.
    "src/engine/v7/giants.ts": 7,
    // Ice Folk Freeze (`pulp_wars-w49.37`): the Frost Giant's Cold Aura
    // freezes only when the Giant ends its Move in land form (an embarked
    // Giant, an Egg, and a boat freeze nothing), and a Stampede needs the
    // Mammoth in land form (an embarked one is refused `EMBARKED`; an Egg
    // never reaches it).
    "src/engine/v7/ice-folk.ts": 1,
    "src/engine/v7/stampede.ts": 1,
    "src/engine/v7/dwarf-reducer.ts": 5,
    // The ninth unit (`pulp_wars-w49.17`, 7r55): the attacks a unit has in
    // a turn (`attackAllowanceV7`: an Egg and an embarked unit have the one
    // attack of their transport, never a Gunner's two).
    "src/engine/v7/dwarf.ts": 2,
    // Dwarf crowd control (`pulp_wars-w49.33`): a Whirl and a Barricade
    // need a land-form actor (an embarked unit is refused `EMBARKED`, and
    // an Egg never reaches them), Repair mends Barricades only from land
    // form, a Whirl victim rises as a Zombie only in land form (the Bitten
    // rule), and a Barricade is attacked from land or a ship (an embarked
    // unit has no attack).
    "src/engine/v7/dwarf-crowd-control.ts": 5,
    // The ninth unit: the Shock Field is a land-form defender's (no Martian
    // unit is an Egg, and an embarked Shock Trooper has no field), and a
    // Wight marks its Grave only when it dies in land form (an embarked
    // unit leaves no Grave, and the Undead lay no Egg).
    "src/engine/v7/ninth-unit.ts": 2,
    "src/engine/v7/wail.ts": 1,
    "src/engine/rules/ruleset-v7.ts": 2,
    // `pulp_wars-c87.5`: the own land units counted for the Shaman training
    // bias (an Egg and an embarked unit are neither a Shaman nor a fighter).
    // Revision 20: the Wallbreaker estimate asks for a land-form attacker
    // (an Egg and an embarked unit never attack).
    // `pulp_wars-9s0.1`: the campaign plan gives jobs to land-form units
    // only (an Egg and an embarked unit must fail the gate).
    // `pulp_wars-t6s.3`: Mind Control targets and the enabler target values
    // are land-form units (an Egg and an embarked unit are never Mind
    // Controlled and project no Force Field); the Tractor Beam kill test
    // counts land-form attackers, the Disintegrator research a land-form
    // fortified unit, and the Martian Move rules a land-form mover (an Egg
    // never moves; an embarked unit keeps the naval rules).
    // `pulp_wars-7g3.4`: the Ice Folk facts (Witches, Sleds, melee units),
    // the Chill and Shatter tests, the Cold Snap targets, the Witch's escort
    // and the hostile units within 2 of her, and the Witch and Sled target
    // values count land-form units only (an Egg is never Chilled and never
    // a Witch, and an embarked unit has no Blizzard); the Ice Folk Move rules
    // take a land-form mover.
    // `pulp_wars-9s0.8`: a hunted unit, a siege target, a hunter, and the
    // mover of a hunt are land-form units (an Egg is never hunted and never
    // hunts, and an embarked unit keeps the naval rules).
    // `pulp_wars-78i.4`: the Dwarf facts (hostile Gyrocopters and Engineers),
    // a melee unit, the eruption ground test (an Egg is on the ground, an
    // embarked unit is not), the Engineer's target value, the Dwarf attack
    // and Move rules, and the mound and bomb danger take land-form units (an
    // Egg's nest tile too, so Eggs are not laid in an eruption ring).
    // `pulp_wars-68k.6`: the siege of a single-file front plays land-form
    // units only: the unit class (an Egg and an embarked unit are `OTHER`
    // and stay off the lane) and the lane Moves take a land-form mover.
    "src/ai/v7-dwarf.ts": 4,
    "src/ai/v7-campaign.ts": 1,
    "src/ai/v7-chokepoint.ts": 1,
    // `pulp_wars-737.4`: a sole city defender is a land-form unit (an Egg
    // lies next to a center, never on one, and an embarked unit or a boat
    // defends no center).
    "src/ai/v7-curiosities.ts": 1,
    "src/ai/v7-dinosaur.ts": 2,
    // Step two of the Goblin pass (`pulp_wars-w49.23`): only a land-form
    // attacker has Gang Up (`gangUpWithHelpersV7`, as the engine's
    // `gangUpBonusV7`; an Egg makes no attack).
    "src/ai/v7-goblin.ts": 2,
    "src/ai/v7-ice-folk.ts": 7,
    "src/ai/v7-martian.ts": 2,
    "src/ai/v7-undead.ts": 1,
    // `pulp_wars-jdb.4`: a Rush plan, the Move of a Rushed unit's plan, and
    // a Confectioner's walk to Crumbs take a land-form own unit (an Egg
    // never Rushes or Re-bakes, and an embarked unit cannot); the melee
    // unit a Crashed unit steps away from is a land-form unit (an Egg and
    // an embarked unit never attack); the Candy Move rules take a land-form
    // mover.
    "src/ai/v7-candy.ts": 4,
    // `pulp_wars-ykw.7`: the capturer that stays ashore because it can walk
    // to an endgame target is a land-form unit (an Egg never boards, and an
    // embarked unit is already afloat).
    // Tuning 5 (`pulp_wars-w49.4`), army play: the unit that steps off a
    // center so the city trains, the garrison, the unit an army Move is
    // valued for, and a hunted unit are land-form units (an Egg never moves
    // or garrisons, and an embarked unit keeps the naval rules).
    // Tuning 6 (`pulp_wars-w49.6`): the unit that steps aside while the
    // seat expands, the units weighed in an assault, an attack valued for a
    // committed unit, the exposed Guard, and the unit that regroups are
    // land-form units (an Egg neither moves nor attacks, and an embarked
    // unit keeps the naval rules).
    // The Goblin pass, correction (`pulp_wars-w49.12`): the shooters an
    // Orc Brute stands beside are land-form units (an Egg and an embarked
    // unit are escorted by nobody).
    // The Martian pass's correction (`pulp_wars-w49.14`): the Knight-shy
    // rule is a land-form unit's (`armyKnightShyV7`).
    // The Dinosaur pass's correction (`pulp_wars-w49.15`): the garrison
    // that stays under a fast unit's eye, the Triceratops's support, and
    // its held Move are rules of land-form units (an Egg and an embarked
    // unit make no Move).
    // Step two of the Goblin pass (`pulp_wars-w49.23`): the Goblin that
    // waits for its helpers, the one that goes into contact, and its
    // company are land-form units (an Egg and an embarked unit neither
    // strike beside a target nor walk up to one).
    // Step two of the Undead pass (`pulp_wars-w49.24`): the unit that stays
    // on its Field Defense is a land-form unit (an Egg makes no Move, and
    // an embarked unit stands on no Field Defense).
    // Step two of the Dinosaur pass (`pulp_wars-w49.26`): the Caveman or
    // Raptor that goes into contact, the place of a unit in the order of
    // blows (an Egg and an embarked unit strike nobody: last), its company
    // beside an enemy, and the hit that waits for the Stegosaurus are a
    // land-form unit's.
    // Step two of the Ice Folk pass (`pulp_wars-w49.27`): the Snow Hunter
    // that comes to throw its Bolas, the hunted unit a Shatter plan is made
    // for, the unit that waits for the Bolas, the shooter that keeps out of
    // reach, and the attacker whose Cold Blood, Planted, Rockfall and
    // Shatter are projected are land-form units (an Egg and an embarked
    // unit throw nothing, are never Chilled, and strike nobody).
    "src/ai/v7.ts": 54,
    // Tuning 5: the army count takes land-form units only (an Egg and an
    // embarked unit are in no fighting class).
    "src/ai/v7-army.ts": 1,
    // The ninth unit (`pulp_wars-w49.17`): the five positional values (the
    // Ogre beside a target, the Shock Trooper in front, the Whirligig's
    // crowd, a marked Grave to stand on, an own Grave to keep off) are for
    // a land-form mover (an Egg makes no Move, and an embarked unit keeps
    // the naval rules).
    "src/ai/v7-ninth-unit.ts": 5,
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
