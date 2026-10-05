import { describe, expect, it } from "vitest";
import {
  TERRAIN_IDS_V7,
  applyCommandV7,
  canEnterTerrainV7,
  deathCreatesGraveV7,
  isSnowV7,
  parseGameStateV7,
  riftAtV7,
  viewForV7,
  type CommandV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitId,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { unitAtV7 } from "../fixtures/v7-goblin-arena";
import {
  martianFieldV7,
  offeredV7,
  playV7,
  rejectedV7,
  type MartianPieceV7,
} from "../fixtures/v7-martian";
import {
  activeIdV7,
  at,
  attackV7,
  patchTileV7,
  tileV7,
} from "../fixtures/v7-revision20";

// The Rift (docs/product/RULESET_7_RIFT.md, bead pulp_wars-9s0.5): every
// ruling of sections 2 to 4 on the two-seat 11 x 11 field (seat 0 capital
// (8, 8), seat 1 capital (2, 8), villages (5, 5), (8, 5), (5, 8)).

/** A horizontal Rift on open Grass north of the villages. */
const RIFT: readonly CoordV7[] = [at(4, 2), at(5, 2), at(6, 2)];

function rifted(
  state: GameStateV7,
  tiles: readonly CoordV7[] = RIFT,
): GameStateV7 {
  let next = state;
  for (const where of tiles)
    next = patchTileV7(next, where, { terrain: "RIFT" });
  return next;
}

const field = (
  pieces: readonly MartianPieceV7[],
  factions: readonly FactionIdV7[] = ["MARTIAN", "ORIGINAL"],
  tiles: readonly CoordV7[] = RIFT,
) =>
  rifted(
    martianFieldV7(
      [...pieces, { seat: 1, role: "FIGHTER" as const, at: at(1, 1) }].filter(
        (piece, index, all) =>
          all.findIndex(
            (other) => other.at.x === piece.at.x && other.at.y === piece.at.y,
          ) === index,
      ),
      { factions },
    ),
    tiles,
  );

const idAt = (state: GameStateV7, where: CoordV7): UnitId =>
  unitAtV7(state, where).id;

const move = (
  state: GameStateV7,
  from: CoordV7,
  path: readonly CoordV7[],
): CommandV7 => ({ kind: "MOVE", unitId: idAt(state, from), path: [...path] });

const onRift = (path: readonly CoordV7[]) =>
  path.some((step) =>
    RIFT.some((tile) => tile.x === step.x && tile.y === step.y),
  );

describe("the Rift terrain (section 2)", () => {
  it("is the sixth terrain, appended to the frozen order", () => {
    expect([...TERRAIN_IDS_V7]).toEqual([
      "GRASS",
      "FOREST",
      "MOUNTAIN",
      "SHALLOW_WATER",
      "DEEP_WATER",
      "RIFT",
    ]);
  });

  it("canEnterTerrainV7: a land-form flyer only", () => {
    const enter = (
      movementMode: "GROUND" | "STRIDE" | "FLY",
      afloat: boolean,
      engineering = true,
      mountainBorn = false,
    ) =>
      canEnterTerrainV7({
        terrain: "RIFT",
        movementMode,
        afloat,
        engineering,
        navigation: true,
        mountainBorn,
        ice: false,
      });
    expect(enter("FLY", false)).toBe(true);
    expect(enter("FLY", false, false)).toBe(true);
    expect(enter("FLY", true)).toBe(false);
    expect(enter("STRIDE", false)).toBe(false);
    expect(enter("GROUND", false)).toBe(false);
    expect(enter("GROUND", false, true, true)).toBe(false);
    expect(enter("GROUND", true)).toBe(false);
  });

  it("is land with its biome, shown in every explorer's view", () => {
    const state = field([{ seat: 0, role: "RAIDER", at: at(3, 2) }]);
    expect(tileV7(state, at(5, 2))).toMatchObject({
      terrain: "RIFT",
      biome: "PLAINS",
    });
    expect(riftAtV7(state.board, at(5, 2))).toBe(true);
    expect(riftAtV7(state.board, at(3, 2))).toBe(false);
    expect(riftAtV7(state.board, at(-1, 2))).toBe(false);
    for (const player of state.players) {
      const tile = viewForV7(state, player.id).board.tiles[2 * 11 + 5];
      expect(tile).toMatchObject({ explored: true, terrain: "RIFT" });
    }
  });

  it("state parsing: nothing on a Rift, and only a land-form flyer stands there", () => {
    const state = field([{ seat: 0, role: "RAIDER", at: at(5, 2) }]);
    expect(parseGameStateV7(state)).not.toBeNull();
    const tile = (patch: Record<string, unknown>) => ({
      ...state,
      board: {
        ...state.board,
        tiles: state.board.tiles.map((entry) =>
          entry.at.x === 4 && entry.at.y === 2 ? { ...entry, ...patch } : entry,
        ),
      },
    });
    expect(parseGameStateV7(tile({ road: true }))).toBeNull();
    expect(parseGameStateV7(tile({ fieldDefense: true }))).toBeNull();
    expect(parseGameStateV7(tile({ resource: "FRUIT" }))).toBeNull();
    expect(parseGameStateV7(tile({ improvement: "MARKET" }))).toBeNull();
    expect(
      parseGameStateV7({ ...state, treasureChests: [at(4, 2)] }),
    ).toBeNull();
    // A Grunt (ground) or a Tripod (walker) on a Rift is not a legal state.
    for (const role of ["FIGHTER", "CATAPULT"] as const)
      expect(
        parseGameStateV7({
          ...state,
          units: state.units.map((unit) =>
            unit.at.x === 5 && unit.at.y === 2 ? { ...unit, role } : unit,
          ),
        }),
      ).toBeNull();
    // An afloat unit never stands on land, a Rift included.
    expect(
      parseGameStateV7({
        ...state,
        units: state.units.map((unit) =>
          unit.at.x === 5 && unit.at.y === 2
            ? { ...unit, form: "EMBARKED" as const }
            : unit,
        ),
      }),
    ).toBeNull();
  });
});

describe("movement and zone of control (section 4.1)", () => {
  it("a flyer enters, crosses, and ends a Move on a Rift", () => {
    const state = field([{ seat: 0, role: "RAIDER", at: at(3, 2) }]);
    const offered = offeredV7(state, "MOVE");
    expect(offered).toContainEqual(move(state, at(3, 2), [at(4, 2)]));
    // The query offers the cheapest path to every Rift tile.
    for (const tile of RIFT)
      expect(
        offered.some(
          (command) =>
            command.kind === "MOVE" &&
            command.path.at(-1)?.x === tile.x &&
            command.path.at(-1)?.y === tile.y,
        ),
      ).toBe(true);
    // Along the crack and ending on it, then through it and off the far side.
    for (const path of [
      [at(4, 2), at(5, 2), at(6, 2)],
      [at(4, 2), at(5, 2), at(6, 3)],
    ]) {
      const result = applyCommandV7(
        state,
        activeIdV7(state),
        move(state, at(3, 2), path),
      );
      expect(result.accepted).toBe(true);
      if (result.accepted)
        expect(unitAtV7(result.state, path.at(-1) as CoordV7).role).toBe(
          "RAIDER",
        );
    }
    const ended = playV7(state, move(state, at(3, 2), [at(4, 2)])).state;
    expect(unitAtV7(ended, at(4, 2)).role).toBe("RAIDER");
  });

  it("no ground unit or walker enters or paths through a Rift", () => {
    for (const [role, factions] of [
      ["FIGHTER", ["MARTIAN", "ORIGINAL"]],
      ["CATAPULT", ["MARTIAN", "ORIGINAL"]],
      ["RAIDER", ["ORIGINAL", "MARTIAN"]],
      ["KNIGHT", ["ORIGINAL", "MARTIAN"]],
    ] as const) {
      const state = field([{ seat: 0, role, at: at(5, 1) }], factions);
      expect(
        offeredV7(state, "MOVE").filter(
          (command) => command.kind === "MOVE" && onRift(command.path),
        ),
        role,
      ).toEqual([]);
      expect(rejectedV7(state, move(state, at(5, 1), [at(5, 2)]))).toEqual({
        code: "MOVEMENT_ILLEGAL",
        params: { reason: "ENGINEERING_REQUIRED" },
      });
      if (role === "RAIDER" || role === "KNIGHT")
        expect(
          rejectedV7(state, move(state, at(5, 1), [at(5, 2), at(5, 3)])),
        ).toEqual({
          code: "MOVEMENT_ILLEGAL",
          params: { reason: "ENGINEERING_REQUIRED" },
        });
    }
  });

  it("a Rift exerts no zone of control and a flyer on it exerts none", () => {
    // A Human Raider passes along a Saucer standing on the Rift.
    const state = field(
      [
        { seat: 0, role: "RAIDER", at: at(3, 3) },
        { seat: 1, role: "RAIDER", at: at(4, 2) },
      ],
      ["ORIGINAL", "MARTIAN"],
    );
    expect(offeredV7(state, "MOVE")).toContainEqual(
      move(state, at(3, 3), [at(4, 3), at(5, 3)]),
    );
  });
});

describe("building, economy, and territory (section 3)", () => {
  // (7, 7) lies in seat 0's capital territory (the 3 x 3 around (8, 8)).
  const OWNED = at(7, 7);
  const owned = () =>
    field(
      [{ seat: 0, role: "FIGHTER", at: at(8, 8) }],
      ["ORIGINAL", "ORIGINAL"],
      [OWNED],
    );

  it("no tile command is offered for a Rift tile", () => {
    const state = owned();
    expect(tileV7(state, OWNED).territoryCityId).not.toBeNull();
    expect(
      offeredV7(state).filter(
        (command) =>
          "at" in command &&
          command.at.x === OWNED.x &&
          command.at.y === OWNED.y,
      ),
    ).toEqual([]);
  });

  it("buildings, the Monument, Roads, and terrain actions are rejected", () => {
    const state = owned();
    const at7 = { at: OWNED };
    expect(rejectedV7(state, { kind: "BUILD_ROAD", ...at7 }).code).toBe(
      "INVALID_TILE",
    );
    expect(rejectedV7(state, { kind: "BUILD_MARKET", ...at7 }).code).toBe(
      "INVALID_TILE",
    );
    expect(rejectedV7(state, { kind: "BUILD_WORKSHOP", ...at7 }).code).toBe(
      "INVALID_TILE",
    );
    expect(
      rejectedV7(state, {
        kind: "BUILD_MONUMENT",
        achievement: "EXPLORER",
        ...at7,
      }).code,
    ).toBe("INVALID_TILE");
    expect(rejectedV7(state, { kind: "BLAST_MOUNTAIN", ...at7 }).code).toBe(
      "INVALID_TILE",
    );
    for (const kind of [
      "CLEAR_FOREST",
      "REPLANT_FOREST",
      "CULTIVATE_FOREST",
    ] as const)
      expect(rejectedV7(state, { kind, ...at7 }).code).toBe(
        "FOREST_ACTION_INVALID_TILE",
      );
    expect(rejectedV7(state, { kind: "REDEVELOP", ...at7 }).code).toBe(
      "REDEVELOP_INVALID_TARGET",
    );
    // A neutral Rift takes no neutral Road either.
    const neutral = field([], ["ORIGINAL", "ORIGINAL"]);
    expect(rejectedV7(neutral, { kind: "BUILD_ROAD", at: at(5, 2) }).code).toBe(
      "INVALID_TILE",
    );
  });
});

describe("combat and abilities (section 4.3)", () => {
  it("attacks onto a flyer on a Rift are ordinary, and the killer does not advance", () => {
    const state = field(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 1, role: "RAIDER", at: at(5, 2), hp: 1, shield: 0 },
      ],
      ["ORIGINAL", "MARTIAN"],
    );
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat.defenderDies).toBe(true);
    expect(run.combat.advances).toBe(false);
    expect(run.attacker?.at).toEqual(at(5, 3));
    expect(
      run.state.units.some((unit) => unit.at.x === 5 && unit.at.y === 2),
    ).toBe(false);
    // The same kill off the Rift advances.
    const open = field(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 4) },
        { seat: 1, role: "RAIDER", at: at(5, 3), hp: 1, shield: 0 },
      ],
      ["ORIGINAL", "MARTIAN"],
    );
    expect(attackV7(open, at(5, 4), at(5, 3)).combat.advances).toBe(true);
  });

  it("a ranged unit shoots across the Rift", () => {
    const state = field(
      [
        { seat: 0, role: "MARKSMAN", at: at(5, 3) },
        { seat: 1, role: "FIGHTER", at: at(5, 1) },
      ],
      ["ORIGINAL", "ORIGINAL"],
    );
    expect(
      attackV7(state, at(5, 3), at(5, 1)).combat.defenderDies,
    ).toBeDefined();
  });

  it("Push: a non-flyer is not pushed onto a Rift; a flyer is", () => {
    // A Human Guard (17 HP) survives the Juggernaut and is not pushed.
    const guard = attackV7(
      field(
        [
          { seat: 0, role: "JUGGERNAUT", at: at(5, 4) },
          { seat: 1, role: "GUARD", at: at(5, 3) },
        ],
        ["ORIGINAL", "ORIGINAL"],
      ),
      at(5, 4),
      at(5, 3),
    );
    expect(guard.combat.defenderDies).toBe(false);
    expect(guard.combat.push).toBe("BLOCKED");
    expect(guard.target?.at).toEqual(at(5, 3));
    // A Mothership (a flyer) is pushed onto the Rift.
    const mothership = attackV7(
      field(
        [
          { seat: 0, role: "JUGGERNAUT", at: at(5, 4) },
          { seat: 1, role: "KNIGHT", at: at(5, 3) },
        ],
        ["ORIGINAL", "MARTIAN"],
      ),
      at(5, 4),
      at(5, 3),
    );
    expect(mothership.combat.defenderDies).toBe(false);
    expect(mothership.combat.push).toBe("WILL_PUSH");
    expect(mothership.target?.at).toEqual(at(5, 2));
  });

  it("Tractor Beam: pulls only a flyer onto a Rift", () => {
    const near = (role: "FIGHTER" | "RAIDER", seat: number) => {
      const state = field([
        { seat: 0, role: "KNIGHT", at: at(5, 3) },
        { seat, role, at: at(5, 1) },
      ]);
      return {
        state,
        command: {
          kind: "TRACTOR_BEAM",
          unitId: idAt(state, at(5, 3)),
          targetUnitId: idAt(state, at(5, 1)),
        } as CommandV7,
      };
    };
    const fighter = near("FIGHTER", 1);
    expect(rejectedV7(fighter.state, fighter.command)).toEqual({
      code: "TRACTOR_BEAM_NOT_LEGAL",
      params: { reason: "BLOCKED" },
    });
    const saucer = near("RAIDER", 0);
    const pulled = playV7(saucer.state, saucer.command).state;
    expect(unitAtV7(pulled, at(5, 2)).role).toBe("RAIDER");
  });

  it("Beam Down never targets a Rift", () => {
    const state = field([
      { seat: 0, role: "RAIDER", at: at(5, 1) },
      { seat: 0, role: "FIGHTER", at: at(8, 8) },
    ]);
    const offered = offeredV7(state, "BEAM_DOWN");
    expect(offered.length).toBeGreaterThan(0);
    expect(
      offered.filter(
        (command) => command.kind === "BEAM_DOWN" && onRift([command.to]),
      ),
    ).toEqual([]);
    expect(
      rejectedV7(state, {
        kind: "BEAM_DOWN",
        unitId: idAt(state, at(5, 1)),
        passengerUnitId: idAt(state, at(8, 8)),
        to: at(5, 2),
      }),
    ).toEqual({ code: "INVALID_TILE", params: { action: "BEAM_DOWN" } });
  });

  it("Mind Control: a unit on a Rift is immune", () => {
    const control = (target: CoordV7) => {
      const state = field(
        [
          { seat: 0, role: "CAPTAIN", at: at(5, 4) },
          { seat: 1, role: "RAIDER", at: target, hp: 5 },
        ],
        ["MARTIAN", "MARTIAN"],
      );
      return {
        state,
        command: {
          kind: "MIND_CONTROL",
          unitId: idAt(state, at(5, 4)),
          targetUnitId: idAt(state, target),
        } as CommandV7,
      };
    };
    const immune = control(at(5, 2));
    expect(rejectedV7(immune.state, immune.command)).toEqual({
      code: "MIND_CONTROL_NOT_LEGAL",
      params: { reason: "TARGET_IMMUNE" },
    });
    const open = control(at(4, 3));
    expect(offeredV7(open.state, "MIND_CONTROL")).toContainEqual(open.command);
  });

  it("a Zombie's kill on a Rift does not rise and leaves no Grave", () => {
    const kill = (target: CoordV7) =>
      attackV7(
        field(
          [
            { seat: 0, role: "GUARD", at: at(5, 3) },
            { seat: 1, role: "RAIDER", at: target, hp: 1, shield: 0 },
          ],
          ["UNDEAD", "MARTIAN"],
        ),
        at(5, 3),
        target,
      );
    const rift = kill(at(5, 2));
    expect(rift.combat.defenderDies).toBe(true);
    expect(rift.combat.defenderInfected).toBe(false);
    expect(rift.events.some((event) => event.kind === "UNIT_INFECTED")).toBe(
      false,
    );
    expect(rift.state.graves).toEqual([]);
    expect(
      rift.state.units.some((unit) => unit.at.x === 5 && unit.at.y === 2),
    ).toBe(false);
    const open = kill(at(4, 3));
    expect(open.combat.defenderInfected).toBe(true);
  });

  it("a bitten flyer killed on a Rift does not rise and leaves no Grave", () => {
    const base = field(
      [
        { seat: 0, role: "FIGHTER", at: at(5, 3) },
        { seat: 0, role: "GUARD", at: at(8, 8) },
        { seat: 1, role: "RAIDER", at: at(5, 2), hp: 1, shield: 0 },
      ],
      ["UNDEAD", "MARTIAN"],
    );
    const state = checkedV7({
      ...base,
      bitten: [
        {
          unitId: idAt(base, at(5, 2)),
          biterPlayerId: unitAtV7(base, at(8, 8)).ownerId,
          biterUnitId: idAt(base, at(8, 8)),
        },
      ],
    });
    const run = attackV7(state, at(5, 3), at(5, 2));
    expect(run.combat.defenderDies).toBe(true);
    expect(run.combat.defenderBittenRises).toBe(false);
    expect(run.events.some((event) => event.kind === "BITTEN_UNIT_RISEN")).toBe(
      false,
    );
    expect(run.state.graves).toEqual([]);
  });

  it("deathCreatesGraveV7 is false on a Rift", () => {
    const state = field([], ["UNDEAD", "ORIGINAL"]);
    const context = {
      setup: state.setup,
      board: state.board,
      treasureChests: state.treasureChests,
    };
    expect(
      deathCreatesGraveV7(context, [], { form: "LAND", at: at(5, 2) }),
    ).toBe(false);
    expect(
      deathCreatesGraveV7(context, [], { form: "LAND", at: at(5, 3) }),
    ).toBe(true);
  });

  it("a Rift is never Snow", () => {
    const state = field(
      [{ seat: 0, role: "FIGHTER", at: at(8, 8) }],
      ["ICE_FOLK", "ORIGINAL"],
      [at(7, 7)],
    );
    expect(isSnowV7(state, at(7, 7))).toBe(false);
    expect(isSnowV7(state, at(9, 9))).toBe(true);
    expect(
      viewForV7(state, activeIdV7(state)).board.tiles[7 * 11 + 7],
    ).not.toMatchObject({ snow: true });
  });

  it("every offered command on a Rift board is accepted", () => {
    const state = field([
      { seat: 0, role: "RAIDER", at: at(3, 2) },
      { seat: 0, role: "KNIGHT", at: at(5, 3) },
      { seat: 0, role: "CATAPULT", at: at(7, 3) },
      { seat: 0, role: "FIGHTER", at: at(5, 1) },
    ]);
    for (const command of offeredV7(state))
      expect(
        applyCommandV7(state, activeIdV7(state), command).accepted,
        JSON.stringify(command),
      ).toBe(true);
  });
});
