import { describe, expect, it } from "vitest";
import {
  RUN_UP_MAXIMUM_TILES_V7,
  effectiveRoleRuleV7,
  estimateCombatV7,
  fortificationLevelForUnitV7,
  isRallyTargetV7,
  publicUnitStatsV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  roleMechanicsV7,
  viewForV7,
  type CoordV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import { checkedV7 } from "../fixtures/v7-builders";
import { cityOfV7, withKillsV7 } from "../fixtures/v7-dinosaur-arena";
import {
  applyOkV7,
  goblinArenaV7,
  sameV7,
  seatIdV7,
  unitAtV7,
} from "../fixtures/v7-goblin-arena";
import {
  activeIdV7,
  at,
  attackV7,
  fieldDefenseV7,
  fieldV7,
  forestV7,
  kindsV7,
  mountainV7,
  moveV7,
  movedV7,
  patchTileV7,
  patchUnitV7,
  tileV7,
  unexploreV7,
  walledV7,
  withoutTechsV7,
} from "../fixtures/v7-revision20";

// Revision 20 (`pulp_wars-0hi.2`): the Triceratops's passive Charge!
// (docs/product/RULESET_7_REVISION_20.md section 2). The board is the
// two-seat field of `fieldV7`: open Grass outside the two capitals'
// territories (x 7-9 and x 1-3, y 7-9) and the villages (5, 5), (8, 5),
// (5, 8).

/** A Triceratops on (3, 2) next to one seat-1 unit on (4, 2), open ground. */
function duel(
  role: UnitRoleIdV7,
  options: {
    readonly faction?: FactionIdV7;
    readonly moved?: number;
    readonly triceratopsHp?: number;
    readonly targetHp?: number;
    readonly kills?: number;
  } = {},
): GameStateV7 {
  const state = fieldV7(
    [
      {
        seat: 0,
        role: "CATAPULT",
        at: at(3, 2),
        ...(options.triceratopsHp === undefined
          ? {}
          : { hp: options.triceratopsHp }),
        ...(options.moved === undefined
          ? {}
          : { activation: movedV7(options.moved) }),
      },
      {
        seat: 1,
        role,
        at: at(4, 2),
        ...(options.targetHp === undefined ? {} : { hp: options.targetHp }),
      },
    ],
    { factions: ["DINOSAUR", options.faction ?? "ORIGINAL"] },
  );
  return options.kills === undefined
    ? state
    : withKillsV7(state, at(3, 2), options.kills);
}

describe("ruleset-7 revision-20 Triceratops stats", () => {
  it("registers every value of section 2.1", () => {
    expect(effectiveRoleRuleV7("CATAPULT", "DINOSAUR")).toEqual({
      role: "CATAPULT",
      label: "Triceratops",
      tacticalRole: "SIEGE",
      cost: 8,
      maxHp: 20,
      attack2: 6,
      defense2: 4,
      move: 2,
      range: 1,
      minimumRange: 1,
      sightRadius: 1,
      technology: "SAWMILLING",
      mayUsePrimaryActionAfterMove: true,
      abilities: ["ATTACK", "LINEBREAKER", "GROW"],
    });
    expect(roleMechanicsV7("CATAPULT", "DINOSAUR")).toMatchObject({
      advancesAfterKill: true,
      capacitySlots: 2,
      hatchTurns: 2,
      runUpBonus2: 2,
    });
    expect(RUN_UP_MAXIMUM_TILES_V7).toBe(2);
    // Only the Triceratops has Charge!.
    for (const faction of ["ORIGINAL", "UNDEAD", "GOBLIN", "DINOSAUR"] as const)
      for (const role of [
        "FIGHTER",
        "RAIDER",
        "MARKSMAN",
        "GUARD",
        "CAPTAIN",
        "CATAPULT",
        "KNIGHT",
        "JUGGERNAUT",
        "PATROL_BOAT",
        "BATTLESHIP",
      ] as const) {
        const linebreaker = faction === "DINOSAUR" && role === "CATAPULT";
        expect(
          effectiveRoleRuleV7(role, faction).abilities.includes("LINEBREAKER"),
        ).toBe(linebreaker);
        expect(roleMechanicsV7(role, faction).runUpBonus2).toBe(
          linebreaker ? 2 : 0,
        );
      }
  });

  it("grows 20 / 24 / 28 HP with Attack 3 / 3 / 4 and refunds 4 on Disband", () => {
    const base = duel("FIGHTER");
    for (const [kills, maxHp, attack2] of [
      [0, 20, 6],
      [1, 24, 6],
      [3, 28, 8],
    ] as const) {
      const state = withKillsV7(base, at(3, 2), kills);
      expect(unitAtV7(state, at(3, 2)).maxHp).toBe(maxHp);
      expect(
        estimateCombatV7(
          state,
          unitAtV7(state, at(3, 2)).id,
          unitAtV7(state, at(4, 2)).id,
        )?.attack2,
      ).toBe(attack2);
    }
    const disbanded = applyOkV7(base, activeIdV7(base), {
      kind: "DISBAND",
      unitId: unitAtV7(base, at(3, 2)).id,
    });
    expect(disbanded.events).toContainEqual(
      expect.objectContaining({ kind: "UNIT_DISBANDED", coinDelta: 4 }),
    );
  });

  it("attacks after a Move, once per turn, and never captures", () => {
    const state = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(2, 2) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
      { seat: 1, role: "GUARD", at: at(5, 3) },
    ]);
    const moved = moveV7(state, at(2, 2), [at(3, 2), at(4, 2)]).state;
    const run = attackV7(moved, at(4, 2), at(5, 2));
    expect(run.combat).toMatchObject({ runUp: 2, attack2: 10 });
    // One attack per turn: the second target is refused and not offered.
    const actor = activeIdV7(run.state);
    const triceratops = run.attacker;
    if (triceratops === undefined) throw new Error("Triceratops died");
    const second = unitAtV7(run.state, at(5, 3));
    expect(
      queryPlayerCommandsV7(run.state, actor).filter(
        (command) =>
          "unitId" in command &&
          command.unitId === triceratops.id &&
          (command.kind === "ATTACK" || command.kind === "MOVE"),
      ),
    ).toEqual([]);
    expect(
      applyCommandResult(run.state, {
        kind: "ATTACK",
        unitId: triceratops.id,
        targetUnitId: second.id,
      }),
    ).toBe("UNIT_ALREADY_ACTED");
    expect(effectiveRoleRuleV7("CATAPULT", "DINOSAUR").abilities).not.toContain(
      "CAPTURE",
    );
  });

  it("threatens its ordinary move-then-melee reach and no lane tiles", () => {
    const state = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(5, 2) },
      { seat: 1, role: "FIGHTER", at: at(0, 10) },
    ]);
    const tiles = queryThreatenedTilesV7(
      state,
      unitAtV7(state, at(5, 2)).id,
      seatIdV7(state, 1),
    );
    const has = (where: CoordV7): boolean =>
      tiles.some((tile) => sameV7(tile, where));
    // Move 2 then range 1: Chebyshev distance 3, in every direction.
    expect(has(at(8, 2))).toBe(true);
    expect(has(at(7, 4))).toBe(true);
    expect(has(at(6, 5))).toBe(true);
    expect(has(at(9, 2))).toBe(false);
    expect(has(at(5, 6))).toBe(false);
  });
});

function applyCommandResult(
  state: GameStateV7,
  command: Parameters<typeof applyOkV7>[2],
): string {
  try {
    applyOkV7(state, activeIdV7(state), command);
    return "ACCEPTED";
  } catch (error) {
    return String((error as Error).message).split(": ")[1] ?? "";
  }
}

describe("ruleset-7 revision-20 Charge! run-up", () => {
  it("adds +1 Attack per tile moved, up to +2, into the preview and attack2", () => {
    for (const [tiles, runUp] of [
      [0, 0],
      [1, 1],
      [2, 2],
      [3, 2],
      [4, 2],
    ] as const) {
      const state =
        tiles === 0 ? duel("GUARD") : duel("GUARD", { moved: tiles });
      const run = attackV7(state, at(3, 2), at(4, 2));
      expect(run.combat, `${tiles} tiles`).toMatchObject({
        runUp,
        attack2: 6 + 2 * runUp,
        chargeApplied: false,
        inspiredApplied: false,
      });
      expect(run.preview.runUp).toBe(runUp);
    }
  });

  it("counts the tiles of a real Move: one, two, and over an own unit", () => {
    const near = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(2, 2) },
      { seat: 1, role: "GUARD", at: at(4, 0) },
    ]);
    // One tile: (2, 2) -> (3, 1), next to the Guard on (4, 0).
    const one = moveV7(near, at(2, 2), [at(3, 1)]).state;
    expect(attackV7(one, at(3, 1), at(4, 0)).combat).toMatchObject({
      runUp: 1,
      attack2: 8,
    });
    const base = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(2, 2) },
      { seat: 0, role: "FIGHTER", at: at(3, 3) },
      { seat: 1, role: "GUARD", at: at(5, 2) },
    ]);
    // Two tiles in a bend: no lane and no straight line is needed.
    const two = moveV7(base, at(2, 2), [at(3, 1), at(4, 1)]).state;
    expect(attackV7(two, at(4, 1), at(5, 2)).combat).toMatchObject({
      runUp: 2,
      attack2: 10,
    });
    // A tile passed over an own unit counts (revision 18).
    const over = moveV7(base, at(2, 2), [at(3, 3), at(4, 3)]).state;
    expect(unitAtV7(over, at(4, 3)).activation).toMatchObject({
      moved: true,
      movedPathLength: 2,
    });
    expect(attackV7(over, at(4, 3), at(5, 2)).combat).toMatchObject({
      runUp: 2,
    });
  });

  it("still gives +2 after a three- or four-tile Road Move", () => {
    let state = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(1, 2) },
      { seat: 1, role: "GUARD", at: at(6, 2) },
    ]);
    for (const x of [1, 2, 3, 4, 5])
      state = patchTileV7(state, at(x, 2), { road: true });
    const actor = activeIdV7(state);
    const unit = unitAtV7(state, at(1, 2));
    const long = queryPlayerCommandsV7(state, actor).flatMap((command) =>
      command.kind === "MOVE" &&
      command.unitId === unit.id &&
      command.path.length >= 3 &&
      sameV7(command.path.at(-1) as CoordV7, at(5, 2))
        ? [command]
        : [],
    );
    expect(long.length).toBeGreaterThan(0);
    for (const command of long) {
      const moved = applyOkV7(state, actor, command).state;
      expect(unitAtV7(moved, at(5, 2)).activation.movedPathLength).toBe(
        command.path.length,
      );
      expect(attackV7(moved, at(5, 2), at(6, 2)).combat).toMatchObject({
        runUp: 2,
        attack2: 10,
      });
    }
  });

  it("counts the truncated length of an interrupted Move", () => {
    // The Guard on (5, 2) stands on a tile the Dinosaur seat has not
    // explored: the two-tile Move stops after one tile.
    const state = unexploreV7(
      fieldV7([
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ]),
      0,
      [at(5, 1), at(5, 2), at(5, 3)],
    );
    const moved = moveV7(state, at(3, 2), [at(4, 2), at(5, 2)]);
    expect(kindsV7(moved.events)).toContain("UNIT_MOVE_INTERRUPTED");
    expect(unitAtV7(moved.state, at(4, 2)).activation).toMatchObject({
      moved: true,
      movedPathLength: 1,
    });
    expect(attackV7(moved.state, at(4, 2), at(5, 2)).combat).toMatchObject({
      runUp: 1,
      attack2: 8,
    });
  });

  it("gives nothing to an unmoved unit, after landing, or to another role", () => {
    expect(attackV7(duel("GUARD"), at(3, 2), at(4, 2)).combat).toMatchObject({
      runUp: 0,
      attack2: 6,
    });
    // Landing ends the activation: no attack at all this turn.
    const afloat = fieldV7(
      [
        {
          seat: 0,
          role: "CATAPULT",
          at: at(3, 2),
          form: "EMBARKED",
          activation: movedV7(1),
        },
        { seat: 1, role: "GUARD", at: at(5, 2) },
      ],
      { water: [at(3, 2)] },
    );
    const landed = applyOkV7(afloat, activeIdV7(afloat), {
      kind: "DISEMBARK",
      unitId: unitAtV7(afloat, at(3, 2)).id,
      at: at(4, 2),
    }).state;
    const triceratops = unitAtV7(landed, at(4, 2));
    expect(
      queryPlayerCommandsV7(landed, activeIdV7(landed)).some(
        (command) =>
          command.kind === "ATTACK" && command.unitId === triceratops.id,
      ),
    ).toBe(false);
    expect(
      publicUnitStatsV7(landed, triceratops)
        .stats.find((stat) => stat.id === "ATTACK")
        ?.modifiers.map((term) => term.source),
    ).toEqual([]);
    // A T-Rex that moved two tiles has no run-up; a Raptor has Pounce.
    for (const [role, chargeApplied] of [
      ["KNIGHT", false],
      ["RAIDER", true],
    ] as const) {
      const state = fieldV7([
        { seat: 0, role, at: at(3, 2), activation: movedV7(2) },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ]);
      expect(
        estimateCombatV7(
          state,
          unitAtV7(state, at(3, 2)).id,
          unitAtV7(state, at(4, 2)).id,
        ),
      ).toMatchObject({ runUp: 0, chargeApplied, fortificationIgnored: 0 });
    }
  });

  it("stacks with Alpha, and an estimate takes a planned Move's length", () => {
    const alpha = duel("GUARD", { moved: 2, kills: 3 });
    expect(attackV7(alpha, at(3, 2), at(4, 2)).combat).toMatchObject({
      runUp: 2,
      attack2: 12,
    });
    const still = duel("GUARD");
    const ids = [
      unitAtV7(still, at(3, 2)).id,
      unitAtV7(still, at(4, 2)).id,
    ] as const;
    expect(estimateCombatV7(still, ids[0], ids[1])?.runUp).toBe(0);
    expect(estimateCombatV7(still, ids[0], ids[1], 1)?.runUp).toBe(1);
    expect(estimateCombatV7(still, ids[0], ids[1], 4)).toMatchObject({
      runUp: 2,
      attack2: 10,
    });
  });

  it("publishes the run-up as an Attack modifier and a status on its owner's turn", () => {
    const state = duel("GUARD", { moved: 2 });
    const triceratops = unitAtV7(state, at(3, 2));
    const stats = publicUnitStatsV7(state, triceratops);
    const attack = stats.stats.find((stat) => stat.id === "ATTACK");
    expect(attack?.modifiers).toEqual([
      expect.objectContaining({
        source: "RUN_UP",
        sourceLabel: "Charge!",
        value: { numerator: 2, denominator: 1 },
      }),
    ]);
    expect(attack?.total).toEqual({ numerator: 5, denominator: 1 });
    expect(stats.statuses).toContain("Charge! +2 Attack");
    expect(stats.dinosaur).toMatchObject({ runUpBonus: 1, runUpMaximum: 2 });
    // The same public facts for the opponent who sees it.
    const view = viewForV7(state, seatIdV7(state, 1));
    expect(
      view.unitStats
        .find((entry) => entry.unitId === triceratops.id)
        ?.stats.find((stat) => stat.id === "ATTACK")?.total,
    ).toEqual({ numerator: 5, denominator: 1 });
    // After the attack, and on the other seat's turn, no run-up is shown.
    const after = attackV7(state, at(3, 2), at(4, 2)).state;
    const spent = after.units.find((unit) => unit.id === triceratops.id);
    if (spent === undefined) throw new Error("Triceratops died");
    expect(publicUnitStatsV7(after, spent).statuses).not.toContain(
      "Charge! +2 Attack",
    );
    const waiting = checkedV7({
      ...state,
      activeSeatIndex: state.turnOrder.indexOf(seatIdV7(state, 1)),
    });
    expect(
      publicUnitStatsV7(waiting, unitAtV7(waiting, at(3, 2))).stats.find(
        (stat) => stat.id === "ATTACK",
      )?.modifiers,
    ).toEqual([]);
    // Other Dinosaur roles publish no run-up numbers.
    const raptor = fieldV7([
      { seat: 0, role: "RAIDER", at: at(3, 2) },
      { seat: 1, role: "GUARD", at: at(9, 2) },
    ]);
    expect(
      publicUnitStatsV7(raptor, unitAtV7(raptor, at(3, 2))).dinosaur,
    ).toMatchObject({ runUpBonus: 0, runUpMaximum: 0 });
  });
});

describe("ruleset-7 revision-20 Charge! ignores fortification", () => {
  it("removes Walls, Field Defense, and both, for damage and retaliation", () => {
    // Guard on the Walled center (8, 8); the Triceratops attacks from (7, 8).
    for (const [fieldDefense, ignored] of [
      [false, 2],
      [true, 3],
    ] as const) {
      const state = walledV7({
        attackers: [{ role: "CATAPULT", at: at(7, 8) }],
        fieldDefense,
      });
      const guard = unitAtV7(state, at(8, 8));
      expect(fortificationLevelForUnitV7(state, guard)).toBe(ignored);
      const run = attackV7(state, at(7, 8), at(8, 8));
      expect(run.combat).toMatchObject({
        fortificationLevel: 0,
        fortificationIgnored: ignored,
        defense2: 6,
        damageToDefender: 7,
        damageToAttacker: 7,
        acid: false,
      });
      // Walls are not destroyed: the reward stays and the next defender on
      // the center is fortified again.
      expect(cityOfV7(run.state, 0).rewards).toContainEqual({
        reachedLevel: 3,
        reward: "WALLS",
      });
    }
    // Field Defense alone, on an own-territory tile off the center.
    const base = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(4, 7) },
      { seat: 1, role: "GUARD", at: at(3, 7) },
    ]);
    const fortified = fieldDefenseV7(base, at(3, 7));
    expect(
      fortificationLevelForUnitV7(fortified, unitAtV7(fortified, at(3, 7))),
    ).toBe(1);
    const run = attackV7(fortified, at(4, 7), at(3, 7));
    expect(run.combat).toMatchObject({
      fortificationLevel: 0,
      fortificationIgnored: 1,
      defense2: 6,
    });
    expect(run.combat.damageToDefender).toBe(
      attackV7(base, at(4, 7), at(3, 7)).combat.damageToDefender,
    );
    expect(run.combat.damageToAttacker).toBe(
      attackV7(base, at(4, 7), at(3, 7)).combat.damageToAttacker,
    );
  });

  it("keeps Forest and Mountain cover", () => {
    for (const cover of [forestV7, mountainV7]) {
      const state = cover(
        fieldDefenseV7(
          fieldV7([
            {
              seat: 0,
              role: "CATAPULT",
              at: at(4, 7),
              activation: movedV7(2),
            },
            { seat: 1, role: "GUARD", at: at(3, 7) },
          ]),
          at(3, 7),
        ),
        at(3, 7),
      );
      const run = attackV7(state, at(4, 7), at(3, 7));
      // Section 2.5: Guard in a Forest with Field Defense, two tiles moved.
      expect(run.combat).toMatchObject({
        attack2: 10,
        defense2: 6,
        defenseBonusNumerator: 3,
        defenseBonusDenominator: 2,
        fortificationLevel: 0,
        fortificationIgnored: 1,
        damageToDefender: 12,
        damageToAttacker: 6,
      });
    }
  });
});

/** Section 13.2 damage of one exchange, for the "ordinary" column. */
function exchange(
  attack: number,
  defense: number,
  cover = 1,
): readonly [number, number] {
  const total = attack + defense * cover;
  return [
    Math.floor((attack / total) * attack * 4.5 + 0.5),
    Math.floor(((defense * cover) / total) * defense * 4.5 + 0.5),
  ];
}

describe("ruleset-7 revision-20 Charge! worked examples (section 2.5)", () => {
  interface Row {
    readonly name: string;
    readonly faction?: FactionIdV7;
    readonly role: UnitRoleIdV7;
    readonly moved: number;
    readonly attack2: number;
    readonly defense2: number;
    readonly damage: number;
    /** Null: the target dies and never retaliates. */
    readonly retaliation: number | null;
    readonly triceratopsHp?: number;
    readonly kills?: number;
  }
  const rows: readonly Row[] = [
    {
      name: "Fighter, unmoved",
      role: "FIGHTER",
      moved: 0,
      attack2: 6,
      defense2: 4,
      damage: 8,
      retaliation: 4,
    },
    {
      name: "Fighter, one tile",
      role: "FIGHTER",
      moved: 1,
      attack2: 8,
      defense2: 4,
      damage: 10,
      retaliation: null,
    },
    {
      name: "Guard, unmoved",
      role: "GUARD",
      moved: 0,
      attack2: 6,
      defense2: 6,
      damage: 7,
      retaliation: 7,
    },
    {
      name: "Guard, one tile",
      role: "GUARD",
      moved: 1,
      attack2: 8,
      defense2: 6,
      damage: 10,
      retaliation: 6,
    },
    {
      name: "Guard, two tiles",
      role: "GUARD",
      moved: 2,
      attack2: 10,
      defense2: 6,
      damage: 14,
      retaliation: 5,
    },
    {
      name: "Orc Brute, two tiles",
      faction: "GOBLIN",
      role: "GUARD",
      moved: 2,
      attack2: 10,
      defense2: 5,
      damage: 15,
      retaliation: null,
    },
    {
      name: "Juggernaut, two tiles",
      role: "JUGGERNAUT",
      moved: 2,
      attack2: 10,
      defense2: 8,
      damage: 13,
      retaliation: 8,
    },
    {
      name: "Ankylosaurus, two tiles (Armoured)",
      faction: "DINOSAUR",
      role: "GUARD",
      moved: 2,
      attack2: 10,
      defense2: 6,
      damage: 13,
      retaliation: 5,
    },
    {
      name: "Guard, Triceratops at 10 of 20 HP, two tiles",
      role: "GUARD",
      moved: 2,
      attack2: 10,
      defense2: 6,
      damage: 10,
      retaliation: 7,
      triceratopsHp: 10,
    },
    {
      name: "Guard, Alpha Triceratops, two tiles",
      role: "GUARD",
      moved: 2,
      attack2: 12,
      defense2: 6,
      damage: 15,
      retaliation: null,
      kills: 3,
    },
  ];
  for (const row of rows)
    it(`${row.name}: ${row.damage} damage`, () => {
      const state = duel(row.role, {
        ...(row.faction === undefined ? {} : { faction: row.faction }),
        ...(row.moved === 0 ? {} : { moved: row.moved }),
        ...(row.triceratopsHp === undefined
          ? {}
          : { triceratopsHp: row.triceratopsHp }),
        ...(row.kills === undefined ? {} : { kills: row.kills }),
      });
      const run = attackV7(state, at(3, 2), at(4, 2));
      expect(run.combat).toMatchObject({
        attack2: row.attack2,
        defense2: row.defense2,
        runUp: row.moved,
        damageToDefender: row.damage,
        defenderDies: row.retaliation === null,
        damageToAttacker: row.retaliation ?? 0,
        retaliation: row.retaliation !== null,
        fortificationLevel: 0,
        fortificationIgnored: 0,
      });
      if (row.retaliation === null) {
        // A kill: the Triceratops advances.
        expect(run.target).toBeUndefined();
        expect(run.attacker?.at).toEqual(at(4, 2));
      } else {
        // A survivor is pushed and the Triceratops follows.
        expect(run.target?.at).toEqual(at(5, 2));
        expect(run.attacker?.at).toEqual(at(4, 2));
      }
      if (row.name.startsWith("Ankylosaurus"))
        expect(run.combat.defenderArmoured).toBe(true);
    });

  it("Guard on a Walled center with Field Defense: 14 and 5, and 7 and 7 unmoved", () => {
    for (const [moved, damage, retaliation, ordinary] of [
      [2, 14, 5, [10, 15]],
      [0, 7, 7, [5, 18]],
    ] as const) {
      let state = walledV7({
        attackers: [{ role: "CATAPULT", at: at(7, 8) }],
        fieldDefense: true,
      });
      if (moved > 0)
        state = patchUnitV7(state, at(7, 8), {
          activation: {
            ...unitAtV7(state, at(7, 8)).activation,
            ...movedV7(moved),
          },
        });
      const run = attackV7(state, at(7, 8), at(8, 8));
      expect(run.combat).toMatchObject({
        defense2: 6,
        fortificationLevel: 0,
        fortificationIgnored: 3,
        damageToDefender: damage,
        damageToAttacker: retaliation,
      });
      // What the same attack would do if the fortification counted.
      expect(exchange(3 + moved, 6)).toEqual(ordinary);
      // Field Defense is gone and the Guard is pushed off the center.
      expect(tileV7(run.state, at(8, 8)).fieldDefense).toBe(false);
      expect(run.target?.at).toEqual(at(9, 8));
      expect(run.attacker?.at).toEqual(at(8, 8));
    }
    // The Forest row's "ordinary" numbers: Defense 4 x 1.5 against Attack 5.
    expect(exchange(5, 4, 1.5)).toEqual([10, 10]);
  });

  it("Zombie on Field Defense: 16 damage, the bite, then the Push", () => {
    const state = fieldDefenseV7(
      fieldV7(
        [
          {
            seat: 0,
            role: "CATAPULT",
            at: at(4, 7),
            activation: movedV7(2),
          },
          { seat: 1, role: "GUARD", at: at(3, 7) },
        ],
        { factions: ["DINOSAUR", "UNDEAD"] },
      ),
      at(3, 7),
    );
    const run = attackV7(state, at(4, 7), at(3, 7));
    expect(run.combat).toMatchObject({
      attack2: 10,
      defense2: 4,
      fortificationIgnored: 1,
      damageToDefender: 16,
      damageToAttacker: 3,
      attackerBitten: true,
      push: "WILL_PUSH",
    });
    expect(run.target).toMatchObject({ hp: 2, at: at(2, 7) });
    expect(run.attacker).toMatchObject({ hp: 17, at: at(3, 7) });
    expect(run.state.bitten.map((entry) => entry.unitId)).toEqual([
      run.attacker?.id,
    ]);
  });
});

describe("ruleset-7 revision-20 Charge! destroys Field Defense", () => {
  const fortified = (
    triceratopsHp: number | undefined,
    targetHp: number | undefined,
    blocker: boolean,
  ): GameStateV7 =>
    fieldDefenseV7(
      fieldV7([
        {
          seat: 0,
          role: "CATAPULT",
          at: at(4, 7),
          ...(triceratopsHp === undefined ? {} : { hp: triceratopsHp }),
        },
        {
          seat: 1,
          role: "GUARD",
          at: at(3, 7),
          ...(targetHp === undefined ? {} : { hp: targetHp }),
        },
        ...(blocker
          ? [{ seat: 1, role: "FIGHTER" as const, at: at(2, 7) }]
          : []),
      ]),
      at(3, 7),
    );

  it("on a kill, a Push, a blocked Push, and when the Triceratops dies", () => {
    for (const [name, state, expected] of [
      ["kill", fortified(undefined, 3, false), { defenderDies: true }],
      ["push", fortified(undefined, undefined, false), { push: "WILL_PUSH" }],
      ["blocked", fortified(undefined, undefined, true), { push: "BLOCKED" }],
      ["dies", fortified(2, undefined, false), { attackerDies: true }],
    ] as const) {
      const run = attackV7(state, at(4, 7), at(3, 7));
      expect(run.combat, name).toMatchObject(expected);
      expect(run.events, name).toContainEqual({
        kind: "FIELD_DEFENSE_DESTROYED",
        at: at(3, 7),
        reason: "CATAPULT",
      });
      expect(tileV7(run.state, at(3, 7)).fieldDefense, name).toBe(false);
    }
  });
});

describe("ruleset-7 revision-20 Charge! push and follow (section 2.4)", () => {
  it("advances after a kill and follows a pushed survivor", () => {
    const kill = attackV7(duel("FIGHTER", { targetHp: 3 }), at(3, 2), at(4, 2));
    expect(kill.combat).toMatchObject({ defenderDies: true, advances: true });
    expect(kill.attacker?.at).toEqual(at(4, 2));
    const push = attackV7(duel("GUARD"), at(3, 2), at(4, 2));
    expect(push.combat).toMatchObject({
      defenderDies: false,
      push: "WILL_PUSH",
      advances: true,
      retaliation: true,
    });
    expect(push.target?.at).toEqual(at(5, 2));
    expect(push.attacker?.at).toEqual(at(4, 2));
    // The retaliation was resolved before the Push: the Triceratops took
    // melee damage from a unit that now stands two tiles away.
    expect(push.attacker?.hp).toBe(20 - push.combat.damageToAttacker);
    expect(push.combat.damageToAttacker).toBeGreaterThan(0);
  });

  it("emits the events in the order of section 2.3", () => {
    const state = fieldDefenseV7(
      fieldV7([
        { seat: 0, role: "CATAPULT", at: at(4, 7) },
        { seat: 1, role: "GUARD", at: at(3, 7) },
      ]),
      at(3, 7),
    );
    const push = attackV7(state, at(4, 7), at(3, 7));
    expect(
      kindsV7(push.events).filter((kind) => kind !== "TILES_REVEALED"),
    ).toEqual([
      "COMBAT_RESOLVED",
      "FIELD_DEFENSE_DESTROYED",
      "UNIT_PUSHED",
      "UNIT_MOVED",
    ]);
    expect(push.events).toContainEqual({
      kind: "UNIT_PUSHED",
      sourceUnitId: push.attacker?.id,
      targetUnitId: push.target?.id,
      from: at(3, 7),
      to: at(2, 7),
    });
    expect(push.events).toContainEqual({
      kind: "UNIT_MOVED",
      unitId: push.attacker?.id,
      path: [at(3, 7)],
    });
    // A kill that makes the Triceratops Big: death, growth, then the advance.
    const kill = attackV7(duel("FIGHTER", { targetHp: 3 }), at(3, 2), at(4, 2));
    expect(
      kindsV7(kill.events).filter((kind) => kind !== "TILES_REVEALED"),
    ).toEqual(["COMBAT_RESOLVED", "UNIT_DIED", "UNIT_GREW", "UNIT_MOVED"]);
  });

  it("keeps the pushed unit's HP and statuses and clears its capture eligibility", () => {
    const base = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(4, 5) },
        { seat: 1, role: "GUARD", at: at(5, 5), captureEligible: true },
        { seat: 2, role: "GUARD", at: at(0, 13) },
        { seat: 2, role: "CATAPULT", at: at(1, 13) },
      ],
      { factions: ["DINOSAUR", "ORIGINAL", "UNDEAD"] },
    );
    const guard = unitAtV7(base, at(5, 5));
    const state = checkedV7({
      ...base,
      bitten: [
        {
          unitId: guard.id,
          biterPlayerId: seatIdV7(base, 2),
          biterUnitId: unitAtV7(base, at(0, 13)).id,
        },
      ],
      plagued: [
        {
          unitId: guard.id,
          sourceUnitId: unitAtV7(base, at(1, 13)).id,
          turnsRemaining: 3,
        },
      ],
    });
    const run = attackV7(state, at(4, 5), at(5, 5));
    expect(run.target).toMatchObject({
      at: at(6, 5),
      hp: guard.hp - run.combat.damageToDefender,
      captureEligible: false,
    });
    expect(run.state.bitten.map((entry) => entry.unitId)).toEqual([guard.id]);
    expect(run.state.plagued.map((entry) => entry.unitId)).toEqual([guard.id]);
  });

  it("does not advance when a Bitten target rises in place", () => {
    const base = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(4, 5) },
        { seat: 1, role: "FIGHTER", at: at(5, 5), hp: 3 },
        { seat: 2, role: "GUARD", at: at(0, 13) },
      ],
      { factions: ["DINOSAUR", "ORIGINAL", "UNDEAD"] },
    );
    const state = checkedV7({
      ...base,
      bitten: [
        {
          unitId: unitAtV7(base, at(5, 5)).id,
          biterPlayerId: seatIdV7(base, 2),
          biterUnitId: unitAtV7(base, at(0, 13)).id,
        },
      ],
    });
    const run = attackV7(state, at(4, 5), at(5, 5));
    expect(run.combat).toMatchObject({
      defenderDies: true,
      defenderBittenRises: true,
      advances: false,
    });
    expect(run.attacker?.at).toEqual(at(4, 5));
    expect(unitAtV7(run.state, at(5, 5))).toMatchObject({
      ownerId: seatIdV7(state, 2),
      role: "GUARD",
    });
  });

  it("stays put after a kill on a Mountain without Engineering", () => {
    const state = mountainV7(
      fieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(3, 2) },
          { seat: 1, role: "FIGHTER", at: at(4, 2), hp: 2 },
        ],
        { techs: { 0: withoutTechsV7("DINOSAUR", "ENGINEERING") } },
      ),
      at(4, 2),
    );
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat).toMatchObject({ defenderDies: true, advances: false });
    expect(run.attacker?.at).toEqual(at(3, 2));
  });

  it("pushes a defender off a village center and stands on it without capturing", () => {
    const state = fieldV7([
      { seat: 0, role: "CATAPULT", at: at(4, 5) },
      { seat: 1, role: "GUARD", at: at(5, 5) },
    ]);
    expect(tileV7(state, at(5, 5)).site).toBe("VILLAGE");
    const run = attackV7(state, at(4, 5), at(5, 5));
    expect(run.target?.at).toEqual(at(6, 5));
    expect(run.attacker).toMatchObject({
      at: at(5, 5),
      captureEligible: false,
    });
    expect(
      queryPlayerCommandsV7(run.state, activeIdV7(run.state)).some(
        (command) => command.kind === "CAPTURE",
      ),
    ).toBe(false);
    expect(tileV7(run.state, at(5, 5)).site).toBe("VILLAGE");
  });

  it("pushes a defender off a Walled city center and besieges it", () => {
    const state = walledV7({
      attackers: [{ role: "CATAPULT", at: at(7, 8) }],
    });
    const run = attackV7(state, at(7, 8), at(8, 8));
    expect(run.target?.at).toEqual(at(9, 8));
    expect(run.attacker?.at).toEqual(at(8, 8));
    expect(cityOfV7(run.state, 0).ownerId).toBe(seatIdV7(state, 0));
  });

  it("leaves the target and the Triceratops in place when the Push is blocked", () => {
    const blocked: readonly (readonly [string, () => GameStateV7])[] = [
      [
        "off the board",
        () =>
          fieldV7([
            { seat: 0, role: "CATAPULT", at: at(1, 2) },
            { seat: 1, role: "GUARD", at: at(0, 2) },
          ]),
      ],
      [
        "water",
        () =>
          fieldV7(
            [
              { seat: 0, role: "CATAPULT", at: at(3, 2) },
              { seat: 1, role: "GUARD", at: at(4, 2) },
            ],
            { water: [at(5, 2)] },
          ),
      ],
      [
        "a unit",
        () =>
          fieldV7([
            { seat: 0, role: "CATAPULT", at: at(3, 2) },
            { seat: 1, role: "GUARD", at: at(4, 2) },
            { seat: 0, role: "FIGHTER", at: at(5, 2) },
          ]),
      ],
      [
        "a settlement site",
        () =>
          fieldV7([
            { seat: 0, role: "CATAPULT", at: at(3, 5) },
            { seat: 1, role: "GUARD", at: at(4, 5) },
          ]),
      ],
      [
        "a Mountain its owner cannot enter",
        () =>
          mountainV7(
            fieldV7(
              [
                { seat: 0, role: "CATAPULT", at: at(3, 2) },
                { seat: 1, role: "GUARD", at: at(4, 2) },
              ],
              { techs: { 1: withoutTechsV7("ORIGINAL", "ENGINEERING") } },
            ),
            at(5, 2),
          ),
      ],
    ];
    for (const [name, build] of blocked) {
      const state = build();
      const triceratops = state.units.find((unit) => unit.role === "CATAPULT");
      const guard = state.units.find((unit) => unit.role === "GUARD");
      if (triceratops === undefined || guard === undefined)
        throw new Error("pieces missing");
      const run = attackV7(state, triceratops.at, guard.at);
      expect(run.combat.push, name).toBe("BLOCKED");
      expect(run.combat.advances, name).toBe(false);
      expect(run.target?.at, name).toEqual(guard.at);
      expect(run.attacker?.at, name).toEqual(triceratops.at);
      expect(kindsV7(run.events), name).not.toContain("UNIT_PUSHED");
      expect(kindsV7(run.events), name).not.toContain("UNIT_MOVED");
    }
  });

  it("never pushes into territory allied to the target", () => {
    // Cooperative AI seats 1 and 2 are allies: seat 2's capital territory is
    // closed to a pushed seat-1 unit.
    const base = patchTileV7(
      goblinArenaV7(
        ["DINOSAUR", "ORIGINAL", "ORIGINAL"],
        [
          { seat: 0, role: "CATAPULT", at: at(8, 3) },
          { seat: 1, role: "GUARD", at: at(9, 3) },
        ],
        { aiMode: "COOPERATIVE" },
      ),
      at(10, 3),
      { terrain: "GRASS", biome: "PLAINS", resource: null, improvement: null },
    );
    const behind = tileV7(base, at(10, 3));
    expect(
      base.cities.find((city) => city.id === behind.territoryCityId)?.ownerId,
    ).toBe(seatIdV7(base, 2));
    const run = attackV7(base, at(8, 3), at(9, 3));
    expect(run.combat).toMatchObject({ push: "BLOCKED", advances: false });
    expect(run.target?.at).toEqual(at(9, 3));
  });

  it("reports an unexplored tile behind as UNKNOWN_BEHIND_FOG and does not push", () => {
    const state = unexploreV7(
      fieldV7([
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ]),
      0,
      [at(5, 2)],
    );
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.preview.push).toBe("UNKNOWN_BEHIND_FOG");
    expect(run.combat).toMatchObject({
      push: "UNKNOWN_BEHIND_FOG",
      advances: false,
    });
    expect(run.target?.at).toEqual(at(4, 2));
    expect(run.attacker?.at).toEqual(at(3, 2));
  });

  it("pushes a unit off a Mountain it cannot follow onto without Engineering", () => {
    const state = mountainV7(
      fieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(3, 2) },
          { seat: 1, role: "GUARD", at: at(4, 2) },
        ],
        { techs: { 0: withoutTechsV7("DINOSAUR", "ENGINEERING") } },
      ),
      at(4, 2),
    );
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat).toMatchObject({ push: "WILL_PUSH", advances: false });
    expect(run.target?.at).toEqual(at(5, 2));
    expect(run.attacker?.at).toEqual(at(3, 2));
    expect(kindsV7(run.events)).toContain("UNIT_PUSHED");
    expect(kindsV7(run.events)).not.toContain("UNIT_MOVED");
  });

  it("never pushes an Egg, and advances after destroying one", () => {
    const eggs = (triceratopsHp: number): GameStateV7 =>
      fieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(4, 7), hp: triceratopsHp },
          { seat: 1, role: "FIGHTER", at: at(0, 0) },
        ],
        {
          factions: ["DINOSAUR", "DINOSAUR"],
          eggs: [{ seat: 1, role: "RAIDER", at: at(3, 7) }],
        },
      );
    const survives = attackV7(eggs(2), at(4, 7), at(3, 7));
    expect(survives.combat).toMatchObject({
      defenderDies: false,
      retaliation: false,
      push: "BLOCKED",
      advances: false,
    });
    expect(survives.target?.at).toEqual(at(3, 7));
    expect(survives.attacker?.at).toEqual(at(4, 7));
    const destroyed = attackV7(eggs(20), at(4, 7), at(3, 7));
    expect(destroyed.combat).toMatchObject({
      defenderDies: true,
      advances: true,
    });
    // Destroying an Egg is a kill: the Triceratops becomes Big.
    expect(destroyed.attacker).toMatchObject({
      at: at(3, 7),
      kills: 1,
      maxHp: 24,
      hp: 24,
    });
  });

  it("pushes a boat attacked from the shore and never follows onto water", () => {
    const afloat = (hp?: number): GameStateV7 =>
      fieldV7(
        [
          { seat: 0, role: "CATAPULT", at: at(3, 2) },
          {
            seat: 1,
            role: "PATROL_BOAT",
            at: at(4, 2),
            form: "NAVAL",
            ...(hp === undefined ? {} : { hp }),
          },
        ],
        { water: [at(4, 2), at(5, 2)] },
      );
    const pushed = attackV7(afloat(), at(3, 2), at(4, 2));
    expect(pushed.combat).toMatchObject({
      defenderDies: false,
      push: "WILL_PUSH",
      advances: false,
    });
    expect(pushed.target?.at).toEqual(at(5, 2));
    expect(pushed.attacker?.at).toEqual(at(3, 2));
    const sunk = attackV7(afloat(1), at(3, 2), at(4, 2));
    expect(sunk.combat).toMatchObject({ defenderDies: true, advances: false });
    expect(sunk.attacker?.at).toEqual(at(3, 2));
  });

  it("still pushes the target when the Triceratops dies in the exchange", () => {
    const run = attackV7(
      duel("GUARD", { triceratopsHp: 2 }),
      at(3, 2),
      at(4, 2),
    );
    expect(run.combat).toMatchObject({
      attackerDies: true,
      push: "WILL_PUSH",
      advances: false,
    });
    expect(run.attacker).toBeUndefined();
    expect(run.target?.at).toEqual(at(5, 2));
  });

  it("leaves the Juggernaut-role Push without a follow", () => {
    for (const faction of ["DINOSAUR", "ORIGINAL"] as const) {
      const state = fieldV7(
        [
          { seat: 0, role: "JUGGERNAUT", at: at(3, 2) },
          { seat: 1, role: "GUARD", at: at(4, 2) },
        ],
        { factions: [faction, "ORIGINAL"] },
      );
      const run = attackV7(state, at(3, 2), at(4, 2));
      expect(run.combat).toMatchObject({
        push: "WILL_PUSH",
        advances: false,
        runUp: 0,
        fortificationIgnored: 0,
      });
      expect(run.target?.at).toEqual(at(5, 2));
      expect(run.attacker?.at).toEqual(at(3, 2));
    }
  });
});

describe("ruleset-7 revision-20 Charge! interactions (section 2.6)", () => {
  it("is infected by a Zombie whose retaliation kills it", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2), hp: 1 },
        { seat: 1, role: "GUARD", at: at(4, 2) },
      ],
      { factions: ["DINOSAUR", "UNDEAD"] },
    );
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat).toMatchObject({
      attackerDies: true,
      attackerInfected: true,
    });
    // It rises where it stood as the Zombie owner's ordinary Zombie; the
    // Zombie was pushed first.
    expect(unitAtV7(run.state, at(3, 2))).toMatchObject({
      ownerId: seatIdV7(state, 1),
      role: "GUARD",
    });
    expect(run.target?.at).toEqual(at(5, 2));
  });

  it("lets a Vampire retaliate and heal, then pushes it", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2), hp: 6 },
        { seat: 1, role: "KNIGHT", at: at(4, 2) },
      ],
      { factions: ["DINOSAUR", "UNDEAD"] },
    );
    const vampire = unitAtV7(state, at(4, 2));
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat.retaliation).toBe(true);
    expect(run.combat.defenderHeal).toBeGreaterThan(0);
    expect(run.target).toMatchObject({
      at: at(5, 2),
      hp: vampire.hp - run.combat.damageToDefender + run.combat.defenderHeal,
    });
  });

  it("is hit by the blast of an exploding unit it kills and advances onto", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2) },
        { seat: 1, role: "MARKSMAN", at: at(4, 2), hp: 3 },
      ],
      { factions: ["DINOSAUR", "GOBLIN"] },
    );
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat).toMatchObject({ defenderDies: true, advances: true });
    const blast = run.events.find(
      (event) => event.kind === "EXPLOSION_RESOLVED",
    );
    if (blast?.kind !== "EXPLOSION_RESOLVED") throw new Error("no blast");
    // The Triceratops grew (Big, fully healed to 24) and advanced before
    // the blast, which hits it on the target's tile.
    expect(blast.results).toContainEqual({
      unitId: run.attacker?.id,
      at: at(4, 2),
      damage: blast.damage,
      dies: false,
      shieldDamage: 0,
    });
    expect(run.attacker).toMatchObject({
      at: at(4, 2),
      maxHp: 24,
      hp: 24 - blast.damage,
    });
    const order = kindsV7(run.events);
    expect(order.indexOf("UNIT_GREW")).toBeLessThan(
      order.indexOf("UNIT_MOVED"),
    );
    expect(order.indexOf("UNIT_MOVED")).toBeLessThan(
      order.indexOf("EXPLOSION_RESOLVED"),
    );
  });

  it("pushes a surviving exploding unit, which does not explode", () => {
    const state = fieldV7(
      [
        { seat: 0, role: "CATAPULT", at: at(3, 2), hp: 4 },
        { seat: 1, role: "KNIGHT", at: at(4, 2) },
      ],
      { factions: ["DINOSAUR", "GOBLIN"] },
    );
    const run = attackV7(state, at(3, 2), at(4, 2));
    expect(run.combat.defenderDies).toBe(false);
    expect(run.target?.at).toEqual(at(5, 2));
    expect(kindsV7(run.events)).not.toContain("EXPLOSION_RESOLVED");
  });

  it("is never Inspired by War Drums", () => {
    const state = fieldV7([
      { seat: 0, role: "CAPTAIN", at: at(3, 3) },
      { seat: 0, role: "CATAPULT", at: at(3, 2) },
      { seat: 0, role: "FIGHTER", at: at(2, 2) },
      { seat: 1, role: "GUARD", at: at(4, 2) },
    ]);
    const shaman = unitAtV7(state, at(3, 3));
    expect(isRallyTargetV7(state, shaman, unitAtV7(state, at(3, 2)))).toBe(
      false,
    );
    expect(isRallyTargetV7(state, shaman, unitAtV7(state, at(2, 2)))).toBe(
      true,
    );
    const rallied = applyOkV7(state, activeIdV7(state), {
      kind: "RALLY",
      unitId: shaman.id,
    }).state;
    expect(unitAtV7(rallied, at(3, 2)).activation.inspired).toBe(false);
    expect(attackV7(rallied, at(3, 2), at(4, 2)).combat).toMatchObject({
      inspiredApplied: false,
      attack2: 6,
    });
  });

  it("has no Raider Charge, Gang Up, or Rampage", () => {
    const run = attackV7(
      duel("FIGHTER", { moved: 2, targetHp: 3 }),
      at(3, 2),
      at(4, 2),
    );
    expect(run.combat).toMatchObject({
      chargeApplied: false,
      gangUp: 0,
      overrunAdvance: false,
      overrunContinues: false,
      attacksRemaining: 0,
      escapeAvailable: false,
    });
  });

  it("previews exactly what the opponent's view projects", () => {
    const state = duel("GUARD", { moved: 2 });
    const view = viewForV7(state, activeIdV7(state));
    const preview = queryCombatPreviewV7(
      view,
      unitAtV7(state, at(3, 2)).id,
      unitAtV7(state, at(4, 2)).id,
    );
    expect(preview).toMatchObject({
      runUp: 2,
      attack2: 10,
      push: "WILL_PUSH",
      advances: true,
    });
  });
});
