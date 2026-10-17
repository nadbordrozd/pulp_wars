import { describe, expect, it } from "vitest";
import {
  BOARD_SEA_BEAST_V7,
  HORNED_PROW_LABEL_V7,
  SEA_BEAST_BLOCK_V7,
  battleshipUnlockNoteV7,
  boardBlockTextV7,
  boardUnavailableTextV7,
  hornedProwRuleV7,
  navalAbilityNameV7,
  navalCombatLinesV7,
  navalRamDescriptionV7,
  navalRamLabelV7,
  navalRamUnlockTextV7,
  plesiosaurRuleV7,
  submarineUnlockNoteV7,
} from "../../src/render/naval-presentation-v7";
import {
  glossaryEntryV7,
  roleGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import { roleAbilityNameV7 } from "../../src/render/role-presentation-v7";
import { seaBeastAttacksV7 } from "../../src/audio/sound-events-v7";
import { SOUND_IDS_V1 } from "../../src/audio/sound-manifest";
import { SOUND_DEFAULT_CLIPS_V1 } from "../../src/audio/sound-choices";
import {
  GROWTH_HP_V7,
  HORNED_PROW_RAM_BONUS2_V7,
  NAVAL_ROLE_IDS_V7,
  RAM_BONUS2_V7,
  RAM_RUN_UP_TILES_V7,
  attackIgnoresCityWallsV7,
  effectiveRoleRuleV7,
  estimateCombatV7,
  factionTreeV7,
  isRallyTargetV7,
  packHuntAttack2V7,
  parseGameStateV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  ramBonus2V7,
  roleMechanicsV7,
  roleRamBonus2MaximumV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  unitGrowthStageV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type TechnologyIdV7,
  type UnitId,
  type UnitRoleIdV7,
  type UnitStateV7,
} from "../../src/engine/index";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  DINOSAUR_FLEET_UI_V7,
  dinosaurFleetFixtureV7,
} from "../fixtures/v7-naval-dinosaur-ui";

// Themed naval branches, Horned Prows and the Plesiosaur
// (`pulp_wars-5ti.18`, docs/product/RULESET_7_NAVAL_FACTIONS.md section 5):
// the Dugout (the Patrol Boat with a Horned Prow: its Ram adds +1.5 Attack
// after a run of two tiles), the War Raft (the Battleship), and the
// Plesiosaur (a sea reptile that grows from kills and cannot be boarded).
// Every state is a small authored strait: rows 3 and 7 Shallow Water, rows
// 4 to 6 Deep Water.

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** An embarked land unit (a transport) on this water tile. */
  readonly embarkedAt?: CoordV7;
  /** The tiles its Move entered this turn (it moved and may still act). */
  readonly ran?: number;
  readonly kills?: number;
  readonly maxHp?: number;
}

function strait(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly PieceV7[],
  technologies: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ] = [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
  explored: readonly [boolean, boolean] = [true, true],
): GameStateV7 {
  let state = navalArenaV7({
    factions,
    technologies,
    explored,
    units: pieces.map((piece) => ({
      seat: piece.seat,
      role: piece.role,
      at: piece.at,
    })),
  });
  for (const piece of pieces) {
    const unit = navalUnitAtV7(state, piece.at);
    const patch: Partial<UnitStateV7> = {
      ...(piece.hp === undefined ? {} : { hp: piece.hp }),
      ...(piece.kills === undefined ? {} : { kills: piece.kills }),
      ...(piece.maxHp === undefined ? {} : { maxHp: piece.maxHp }),
      ...(piece.embarkedAt === undefined
        ? {}
        : { at: piece.embarkedAt, form: "EMBARKED" as const }),
      ...(piece.ran === undefined
        ? {}
        : {
            activation: {
              ...unit.activation,
              moved: true,
              movedPathLength: piece.ran,
            },
          }),
    };
    if (Object.keys(patch).length > 0)
      state = patchNavalUnitV7(state, unit.id, patch);
  }
  return state;
}

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  viewForV7(state, seatV7(state, seat).id);
const attack = (unitId: number, targetUnitId: number): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitId as UnitId,
  targetUnitId: targetUnitId as UnitId,
});
const move = (unitId: number, path: readonly CoordV7[]): CommandV7 => ({
  kind: "MOVE",
  unitId: unitId as UnitId,
  path: [...path],
});
const board = (unitId: number, targetUnitId: number): CommandV7 => ({
  kind: "BOARD",
  unitId: unitId as UnitId,
  targetUnitId: targetUnitId as UnitId,
});
const combatOf = (events: readonly DomainEventV7[]): CombatPreviewV7 => {
  const resolved = events.find((event) => event.kind === "COMBAT_RESOLVED");
  if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return resolved.preview;
};
const grewOf = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) => (event.kind === "UNIT_GREW" ? [event] : []));

/** The attack of the unit on `from` at the unit on `to`, previewed and resolved. */
function exchange(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  seat: 0 | 1 = 0,
): {
  readonly preview: CombatPreviewV7 | null;
  readonly result: ReturnType<typeof acceptV7>;
  readonly combat: CombatPreviewV7;
} {
  const attacker = navalUnitAtV7(state, from);
  const target = navalUnitAtV7(state, to);
  const preview = queryCombatPreviewV7(
    viewOf(state, seat),
    attacker.id,
    target.id,
  );
  const result = acceptV7(state, seat, attack(attacker.id, target.id));
  return { preview, result, combat: combatOf(result.events) };
}

describe("the Dinosaur fleet registry (sections 5.1 and 5.2)", () => {
  it("registers every row of the unit table", () => {
    const row = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "DINOSAUR");
      const mechanics = roleMechanicsV7(role, "DINOSAUR");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        `${String(rule.minimumRange)}-${String(rule.range)}`,
        rule.abilities,
        mechanics.ramRunUpBonus2,
        mechanics.seaBeast,
        mechanics.hatchTurns,
      ];
    };
    expect(row("PATROL_BOAT")).toEqual([
      "Dugout",
      5,
      10,
      2,
      2,
      2,
      "1-1",
      ["ATTACK", "RAM"],
      HORNED_PROW_RAM_BONUS2_V7,
      false,
      null,
    ]);
    expect(row("BATTLESHIP")).toEqual([
      "War Raft",
      16,
      25,
      5,
      3,
      2,
      "1-3",
      ["ATTACK"],
      RAM_BONUS2_V7,
      false,
      null,
    ]);
    expect(row("SUBMARINE")).toEqual([
      "Plesiosaur",
      10,
      12,
      4,
      2,
      2,
      "1-1",
      ["ATTACK", "SUBMERGED", "TORPEDO", "GROW", "SEA_BEAST"],
      RAM_BONUS2_V7,
      true,
      // Trained at a dock, never laid as an Egg.
      null,
    ]);
    expect(HORNED_PROW_RAM_BONUS2_V7).toBe(3);
    expect(RAM_RUN_UP_TILES_V7).toBe(2);
    // The War Raft splashes like every Battleship; the Dugout and the
    // Plesiosaur have the Human Patrol Boat's and Submarine's sight.
    expect(roleMechanicsV7("BATTLESHIP", "DINOSAUR").splash).toBe(true);
    expect(effectiveRoleRuleV7("SUBMARINE", "DINOSAUR").sightRadius).toBe(2);
    // Every other faction's Ram has no run-up bonus, and only the Dinosaur
    // and the Cult (the Kraken, `pulp_wars-5ti.22`) Submarines are sea
    // beasts.
    for (const faction of [
      "ORIGINAL",
      "UNDEAD",
      "GOBLIN",
      "MARTIAN",
      "DWARF",
      "CANDY",
      "CULT",
    ] as const)
      for (const role of NAVAL_ROLE_IDS_V7) {
        expect(roleMechanicsV7(role, faction).ramRunUpBonus2).toBe(
          RAM_BONUS2_V7,
        );
        expect(roleMechanicsV7(role, faction).seaBeast).toBe(
          faction === "CULT" && role === "SUBMARINE",
        );
      }
  });

  it("names the five technologies and keeps Ram and Board in Horned Prows", () => {
    expect(
      (
        [
          "SHORECRAFT",
          "NAVIGATION",
          "NAVAL_ENGINEERING",
          "SEAMANSHIP",
          "SUBMERSIBLES",
        ] as const
      ).map((tech) => technologyDisplayNameV7(tech, "DINOSAUR")),
    ).toEqual([
      "Dugouts",
      "Navigation",
      "War Rafts",
      "Horned Prows",
      "Plesiosaurs",
    ]);
    const seamanship = factionTreeV7("DINOSAUR").nodes.find(
      (node) => node.id === "SEAMANSHIP",
    );
    expect(seamanship?.unlocks).toEqual([
      { kind: "RAM" },
      { kind: "COMMAND", command: "BOARD" },
    ]);
    const caps = technologyCapabilitiesV7(NAVAL_TECHS_V7, "DINOSAUR");
    expect([caps.ram, caps.boarding]).toEqual([true, true]);
  });
});

describe("D1: the Horned Prow (section 5.3)", () => {
  it("adds +1 Attack after one tile and +1.5 after two or more", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [{ seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } }],
    );
    const dugout = navalUnitAtV7(state, { x: 3, y: 5 });
    expect(
      [0, 1, 2, 3].map((tiles) => ramBonus2V7(state, dugout, tiles)),
    ).toEqual([2, 2, 3, 3]);
    expect(roleRamBonus2MaximumV7("PATROL_BOAT", "DINOSAUR")).toBe(3);
    expect(roleRamBonus2MaximumV7("PATROL_BOAT", "ORIGINAL")).toBe(2);
    // A Human Patrol Boat keeps +1 whatever its run.
    const human = strait(
      ["ORIGINAL", "DINOSAUR"],
      [{ seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } }],
    );
    expect(ramBonus2V7(human, navalUnitAtV7(human, { x: 3, y: 5 }), 2)).toBe(
      RAM_BONUS2_V7,
    );
  });

  it("matches the worked examples: a Patrol Boat takes 8 after one tile and sinks after two", () => {
    const after = (ran: number) =>
      strait(
        ["DINOSAUR", "ORIGINAL"],
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran },
          { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
        ],
      );
    const one = exchange(after(1), { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(one.preview).toMatchObject({
      ram: true,
      attack2: 6,
      damageToDefender: 8,
      damageToAttacker: 4,
      defenderDies: false,
    });
    expect(one.combat).toEqual(one.preview);
    const two = exchange(after(2), { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(two.preview).toMatchObject({
      ram: true,
      attack2: 7,
      damageToDefender: 10,
      damageToAttacker: 0,
      defenderDies: true,
    });
    expect(two.combat).toEqual(two.preview);
    expect(
      two.result.state.units.some(
        (unit) => unit.id === navalUnitAtV7(after(2), { x: 4, y: 5 }).id,
      ),
    ).toBe(false);
  });

  it("matches the worked examples after a two-tile run: a Submarine 10 (2 left) and 3 back, a Battleship 8 and 6 back", () => {
    const sub = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 2 },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 } },
      ],
    );
    const onSub = exchange(sub, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(onSub.preview).toMatchObject({
      ram: true,
      damageToDefender: 10,
      damageToAttacker: 3,
      defenderDies: false,
    });
    expect(onSub.combat).toEqual(onSub.preview);
    expect(navalUnitAtV7(onSub.result.state, { x: 5, y: 5 }).hp).toBe(2);
    const battleship = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 2 },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const onBattleship = exchange(battleship, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(onBattleship.preview).toMatchObject({
      ram: true,
      damageToDefender: 8,
      damageToAttacker: 6,
    });
    expect(onBattleship.combat).toEqual(onBattleship.preview);
  });

  it("sinks a 12-HP transport after a two-tile run", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 2 },
        // A Human Fighter (12 HP) embarked on (4, 5).
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 4, y: 2 },
          embarkedAt: { x: 4, y: 5 },
        },
      ],
    );
    const fighter = navalUnitAtV7(state, { x: 4, y: 5 });
    expect([fighter.form, fighter.maxHp]).toEqual(["EMBARKED", 12]);
    const ram = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(ram.preview).toMatchObject({
      ram: true,
      damageToDefender: 12,
      defenderDies: true,
      damageToAttacker: 0,
    });
    expect(ram.combat).toEqual(ram.preview);
  });

  it("counts the real Move: one tile, two tiles, and an interrupted Move by the tiles it entered", () => {
    const pieces: readonly PieceV7[] = [
      { seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 5 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
    ];
    const state = strait(["DINOSAUR", "ORIGINAL"], pieces);
    const dugout = navalUnitAtV7(state, { x: 1, y: 5 });
    const target = navalUnitAtV7(state, { x: 4, y: 5 });
    // Two tiles: (2, 5) then (3, 5).
    const ran = acceptV7(
      state,
      0,
      move(dugout.id, [
        { x: 2, y: 5 },
        { x: 3, y: 5 },
      ]),
    ).state;
    expect(navalUnitV7(ran, dugout.id).activation.movedPathLength).toBe(2);
    const twoTiles = exchange(ran, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(twoTiles.preview).toMatchObject({ ram: true, defenderDies: true });
    expect(twoTiles.combat.damageToDefender).toBe(10);
    // One tile: from (2, 5) to (3, 5).
    const near = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const stepped = acceptV7(
      near,
      0,
      move(navalUnitAtV7(near, { x: 2, y: 5 }).id, [{ x: 3, y: 5 }]),
    ).state;
    const oneTile = exchange(stepped, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(oneTile.combat).toMatchObject({
      ram: true,
      damageToDefender: 8,
      defenderDies: false,
    });
    // Interrupted: the second tile holds a boat the Dugout had not seen, so
    // the Move stops after one tile and its Ram is the one-tile Ram.
    const fogged = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
      [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
      [false, true],
    );
    const hiddenTarget = navalUnitAtV7(fogged, { x: 4, y: 5 });
    expect(
      fogged.players[0]?.explored.some((at) => at.x === 4 && at.y === 5),
    ).toBe(false);
    const interrupted = acceptV7(
      fogged,
      0,
      move(navalUnitAtV7(fogged, { x: 2, y: 5 }).id, [
        { x: 3, y: 5 },
        { x: 4, y: 5 },
      ]),
    ).state;
    const stopped = navalUnitAtV7(interrupted, { x: 3, y: 5 });
    expect(stopped.activation).toMatchObject({
      moved: true,
      movedPathLength: 1,
    });
    const afterStop = acceptV7(
      interrupted,
      0,
      attack(stopped.id, hiddenTarget.id),
    );
    expect(combatOf(afterStop.events)).toMatchObject({
      ram: true,
      damageToDefender: 8,
    });
    expect(target.id).toBeGreaterThan(0);
  });

  it("estimates the run-up for a planned path length", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const dugout = navalUnitAtV7(state, { x: 3, y: 5 });
    const target = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(estimateCombatV7(state, dugout.id, target.id)?.ram).toBe(false);
    expect(estimateCombatV7(state, dugout.id, target.id, 1)).toMatchObject({
      ram: true,
      damageToDefender: 8,
    });
    expect(estimateCombatV7(state, dugout.id, target.id, 2)).toMatchObject({
      ram: true,
      damageToDefender: 10,
      defenderDies: true,
    });
  });

  it("keeps every other Ram rule: Seamanship, a target afloat, never on retaliation, the shove", () => {
    const noSeamanship = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 2 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
      [["SHORECRAFT", "NAVIGATION"], NAVAL_TECHS_V7],
    );
    const plain = exchange(noSeamanship, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(plain.preview).toMatchObject({ ram: false, damageToDefender: 5 });
    // On land: no Ram.
    const coast = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 3 }, ran: 2 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
    );
    expect(
      queryCombatPreviewV7(
        viewOf(coast),
        navalUnitAtV7(coast, { x: 3, y: 3 }).id,
        navalUnitAtV7(coast, { x: 3, y: 2 }).id,
      )?.ram,
    ).toBe(false);
    // A survivor is shoved one tile straight back.
    const shove = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 2 },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const shoved = exchange(shove, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(shoved.preview?.push).toBe("WILL_PUSH");
    expect(navalUnitAtV7(shoved.result.state, { x: 5, y: 5 }).role).toBe(
      "BATTLESHIP",
    );
    // A Human Patrol Boat that rams a Dugout that ran meets no Horned Prow
    // in the reply: the Dugout strikes back at its own Attack.
    const reply = strait(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 }, ran: 2 },
      ],
    );
    expect(
      exchange(reply, { x: 3, y: 5 }, { x: 4, y: 5 }).preview,
    ).toMatchObject({ ram: true, damageToDefender: 8, damageToAttacker: 4 });
  });
});

describe("D2: the Plesiosaur (section 5.3)", () => {
  it("matches the worked examples: it torpedoes a Battleship for 10, or 14 as an Alpha", () => {
    const fresh = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const stage0 = exchange(fresh, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(stage0.preview).toMatchObject({
      torpedo: true,
      damageToDefender: 10,
      damageToAttacker: 0,
    });
    expect(stage0.combat).toEqual(stage0.preview);
    const alpha = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        {
          seat: 0,
          role: "SUBMARINE",
          at: { x: 3, y: 5 },
          kills: 3,
          maxHp: 20,
          hp: 20,
        },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const plesiosaur = navalUnitAtV7(alpha, { x: 3, y: 5 });
    expect(unitGrowthStageV7(alpha, plesiosaur)).toBe(2);
    const stage2 = exchange(alpha, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(stage2.preview).toMatchObject({
      torpedo: true,
      attack2: 10,
      damageToDefender: 14,
      damageToAttacker: 0,
    });
    expect(stage2.combat).toEqual(stage2.preview);
  });

  it("matches the worked examples on an Alpha Plesiosaur: a ram deals 8 and takes 4, a Battleship beside it 16 and 3", () => {
    const pieces = (role: UnitRoleIdV7): readonly PieceV7[] => [
      { seat: 0, role, at: { x: 3, y: 5 }, ran: 1 },
      {
        seat: 1,
        role: "SUBMARINE",
        at: { x: 4, y: 5 },
        kills: 3,
        maxHp: 20,
        hp: 20,
      },
    ];
    const rammed = exchange(
      strait(["ORIGINAL", "DINOSAUR"], pieces("PATROL_BOAT")),
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    );
    expect(rammed.preview).toMatchObject({
      ram: true,
      damageToDefender: 8,
      damageToAttacker: 4,
    });
    expect(rammed.combat).toEqual(rammed.preview);
    const shelled = exchange(
      strait(
        ["ORIGINAL", "DINOSAUR"],
        [
          { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
          pieces("PATROL_BOAT")[1] as PieceV7,
        ],
      ),
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    );
    expect(shelled.preview).toMatchObject({
      damageToDefender: 16,
      damageToAttacker: 3,
      defenderDies: false,
    });
    expect(shelled.combat).toEqual(shelled.preview);
  });

  it("matches the worked example: a Submarine's torpedo sinks a fresh Plesiosaur", () => {
    const state = strait(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 } },
      ],
    );
    const torpedo = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(torpedo.preview).toMatchObject({
      torpedo: true,
      damageToDefender: 12,
      defenderDies: true,
      damageToAttacker: 0,
    });
  });

  it("grows from a torpedo kill: Big at the first kill, +4 maximum HP and a full heal", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 }, hp: 7 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 }, hp: 3 },
      ],
    );
    const plesiosaur = navalUnitAtV7(state, { x: 3, y: 5 });
    const shot = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(shot.combat.defenderDies).toBe(true);
    expect(navalUnitV7(shot.result.state, plesiosaur.id)).toMatchObject({
      kills: 1,
      maxHp: 12 + GROWTH_HP_V7,
      hp: 12 + GROWTH_HP_V7,
      veteran: false,
    });
    expect(grewOf(shot.result.events)).toEqual([
      {
        kind: "UNIT_GREW",
        unitId: plesiosaur.id,
        stage: 1,
        maxHp: 16,
        hp: 16,
      },
    ]);
    expect(parseGameStateV7(shot.result.state)).not.toBeNull();
  });

  it("grows from a retaliation kill, and reaches Alpha at the third kill", () => {
    const state = strait(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, hp: 2 },
        {
          seat: 1,
          role: "SUBMARINE",
          at: { x: 4, y: 5 },
          kills: 2,
          maxHp: 16,
          hp: 16,
        },
      ],
    );
    const plesiosaur = navalUnitAtV7(state, { x: 4, y: 5 });
    const reply = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(reply.combat.attackerDies).toBe(true);
    expect(navalUnitV7(reply.result.state, plesiosaur.id)).toMatchObject({
      kills: 3,
      maxHp: 20,
      hp: 20,
    });
    expect(grewOf(reply.result.events)).toMatchObject([
      { unitId: plesiosaur.id, stage: 2, maxHp: 20, hp: 20 },
    ]);
  });

  it("parses its maximum HP against its kills, and is never promoted", () => {
    const grown = strait(
      ["DINOSAUR", "ORIGINAL"],
      [{ seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 }, kills: 3, maxHp: 20 }],
    );
    expect(parseGameStateV7(grown)).not.toBeNull();
    const plesiosaur = navalUnitAtV7(grown, { x: 3, y: 5 });
    // A maximum that does not match the kills is refused.
    for (const maxHp of [12, 16, 25])
      expect(
        parseGameStateV7(
          patchUnsafe(grown, plesiosaur.id, { maxHp, hp: Math.min(12, maxHp) }),
        ),
        String(maxHp),
      ).toBeNull();
    expect(
      queryPlayerCommandsV7(viewOf(grown)).some(
        (command) => command.kind === "PROMOTE",
      ),
    ).toBe(false);
    expect(
      rejectV7(grown, 0, {
        kind: "PROMOTE",
        unitId: plesiosaur.id as UnitId,
      }).code,
    ).toBe("PROMOTION_NOT_ELIGIBLE");
    // A Human Submarine with three kills is promoted as ever.
    const human = strait(
      ["ORIGINAL", "DINOSAUR"],
      [{ seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 }, kills: 3 }],
    );
    expect(
      queryPlayerCommandsV7(viewOf(human)).some(
        (command) => command.kind === "PROMOTE",
      ),
    ).toBe(true);
  });

  it("is trained at a dock for 10 Coins (8 at a Shipyard) as a 12-HP Plesiosaur", () => {
    const state = strait(["DINOSAUR", "ORIGINAL"], []);
    const view = viewOf(state);
    const offered = queryPlayerCommandsV7(view).find(
      (command) =>
        command.kind === "TRAIN_NAVAL" && command.role === "SUBMARINE",
    );
    expect(offered).toBeDefined();
    if (offered === undefined) throw new Error("no training");
    const coins = seatV7(state, 0).coins;
    const result = acceptV7(state, 0, offered);
    expect(seatV7(result.state, 0).coins).toBe(coins - 10);
    const trained = result.state.units.find(
      (unit) =>
        unit.role === "SUBMARINE" && unit.ownerId === seatV7(state, 0).id,
    );
    expect(trained).toMatchObject({
      form: "NAVAL",
      hp: 12,
      maxHp: 12,
      kills: 0,
    });
  });

  it("is not a dinosaur for Pack Hunt, Wallbreaker, War Drums, or the Shaman's Tend", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "FIGHTER", at: { x: 4, y: 1 } },
        { seat: 0, role: "CAPTAIN", at: { x: 2, y: 2 } },
        { seat: 0, role: "RAIDER", at: { x: 3, y: 0 } },
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 3 }, hp: 5 },
        { seat: 1, role: "FIGHTER", at: { x: 3, y: 2 } },
      ],
      [
        [...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION", "EXPLOSIVES"],
        NAVAL_TECHS_V7,
      ],
    );
    const caveman = navalUnitAtV7(state, { x: 4, y: 1 });
    const shaman = navalUnitAtV7(state, { x: 2, y: 2 });
    const raptor = navalUnitAtV7(state, { x: 3, y: 0 });
    const plesiosaur = navalUnitAtV7(state, { x: 2, y: 3 });
    const target = navalUnitAtV7(state, { x: 3, y: 2 });
    // Pack Hunt: the target stands next to the Plesiosaur (and the
    // Shaman), and the Caveman gets no bonus; a Raptor beside it gives one.
    expect(packHuntAttack2V7(state, state.units, caveman, target, [])).toBe(0);
    const raptorBeside = patchNavalUnitV7(state, raptor.id, {
      at: { x: 3, y: 1 },
    });
    expect(
      packHuntAttack2V7(
        raptorBeside,
        raptorBeside.units,
        caveman,
        navalUnitV7(raptorBeside, target.id),
        [],
      ),
    ).toBe(2);
    // Wallbreaker (the Dinosaur Explosives) reaches land dinosaurs only.
    expect(
      technologyCapabilitiesV7(
        [...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION", "EXPLOSIVES"],
        "DINOSAUR",
      ).ignoresCityWalls,
    ).toBe(true);
    expect(
      attackIgnoresCityWallsV7(state, plesiosaur, [
        ...NAVAL_TECHS_V7,
        "DRILL",
        "FORTIFICATION",
        "EXPLOSIVES",
      ]),
    ).toBe(false);
    // War Drums: no Rally reaches a ship.
    expect(isRallyTargetV7(state, shaman, plesiosaur)).toBe(false);
    // Tend Wounded: the wounded Plesiosaur beside the Shaman is no target.
    expect(
      rejectV7(state, 0, {
        kind: "TEND_WOUNDED",
        unitId: shaman.id as UnitId,
      }).code,
    ).toBe("HEAL_TARGET_NOT_FOUND");
  });
});

describe("D2: nobody boards a Plesiosaur, and a Dinosaur ship boards no Submarine (section 2 rule 6)", () => {
  it("refuses a Human ship's Board of a weak Plesiosaur as TARGET_IMMUNE and never offers it", () => {
    const state = strait(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 }, hp: 3 },
      ],
    );
    const boarder = navalUnitAtV7(state, { x: 3, y: 5 });
    const beast = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(
      queryPlayerCommandsV7(viewOf(state)).some(
        (command) => command.kind === "BOARD",
      ),
    ).toBe(false);
    expect(rejectV7(state, 0, board(boarder.id, beast.id))).toEqual({
      code: "BOARD_NOT_LEGAL",
      params: expect.objectContaining({ reason: "TARGET_IMMUNE" }),
    });
    expect(boardUnavailableTextV7(viewOf(state), boarder, false)).toBe(
      BOARD_SEA_BEAST_V7,
    );
  });

  it("refuses a Dinosaur ship's Board of a weak Submarine, and boards a Patrol Boat or a Battleship as the Humans do", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 }, hp: 4 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 3, y: 4 }, hp: 3 },
        { seat: 0, role: "BATTLESHIP", at: { x: 7, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 8, y: 5 }, hp: 8 },
      ],
    );
    const dugout = navalUnitAtV7(state, { x: 3, y: 5 });
    const submarine = navalUnitAtV7(state, { x: 4, y: 5 });
    const boat = navalUnitAtV7(state, { x: 3, y: 4 });
    const raft = navalUnitAtV7(state, { x: 7, y: 5 });
    const battleship = navalUnitAtV7(state, { x: 8, y: 5 });
    const boards = queryPlayerCommandsV7(viewOf(state)).filter(
      (command) => command.kind === "BOARD",
    );
    expect(
      boards.map((command) =>
        command.kind === "BOARD" ? command.targetUnitId : null,
      ),
    ).toEqual(expect.arrayContaining([boat.id, battleship.id]));
    expect(
      boards.some(
        (command) =>
          command.kind === "BOARD" && command.targetUnitId === submarine.id,
      ),
    ).toBe(false);
    expect(rejectV7(state, 0, board(dugout.id, submarine.id))).toEqual({
      code: "BOARD_NOT_LEGAL",
      params: expect.objectContaining({ reason: "TARGET_IMMUNE" }),
    });
    const taken = acceptV7(state, 0, board(dugout.id, boat.id)).state;
    expect(navalUnitV7(taken, boat.id)).toMatchObject({
      ownerId: seatV7(state, 0).id,
      role: "PATROL_BOAT",
      maxHp: 10,
      hp: 4,
    });
    const capital = acceptV7(state, 0, board(raft.id, battleship.id)).state;
    expect(navalUnitV7(capital, battleship.id)).toMatchObject({
      ownerId: seatV7(state, 0).id,
      role: "BATTLESHIP",
      maxHp: 25,
      hp: 9,
    });
  });
});

describe("the Dinosaur fleet's words (sections 5.3 and 12)", () => {
  it("names the Horned Prow on the card, in the preview, and in the glossary", () => {
    expect(navalRamLabelV7("DINOSAUR")).toBe(HORNED_PROW_LABEL_V7);
    expect(navalRamLabelV7("ORIGINAL")).toBe("Bow Ram");
    expect(navalRamUnlockTextV7("DINOSAUR")).toBe(
      "Horned Prow: Dugouts that moved hit ships with +1 Attack (+1.5 after 2 tiles) and shove them back",
    );
    expect(navalRamDescriptionV7("DINOSAUR")).toBe(
      "With Horned Prows: a Dugout that moved this turn hits boats and transports with +1 Attack (+1.5 after a two-tile run) and shoves them one tile back.",
    );
    expect(navalRamDescriptionV7("ORIGINAL")).toBe(
      "With Boarding: a Patrol Boat that moved this turn hits boats and transports with +1 Attack and shoves them one tile back.",
    );
    expect(hornedProwRuleV7()).toBe(
      "A Dugout's ram hits harder after a longer run.",
    );
    expect(plesiosaurRuleV7()).toBe(
      "A sea reptile: the Plesiosaur grows from kills like a dinosaur, and nobody can board it.",
    );
    expect(navalAbilityNameV7("RAM", "DINOSAUR")).toBe("Horned Prow");
    expect(roleAbilityNameV7("RAM", "DINOSAUR")).toBe("Horned Prow");
    expect(roleAbilityNameV7("RAM", "ORIGINAL")).toBe("Bow Ram");
    expect(roleAbilityNameV7("SEA_BEAST", "DINOSAUR")).toBe("Sea beast");
    const ids = (role: UnitRoleIdV7) =>
      roleGlossaryV7(role, "DINOSAUR").map((entry) => entry.id);
    expect(ids("PATROL_BOAT")).toContain("HORNED_PROW");
    expect(ids("PATROL_BOAT")).not.toContain("BOW_RAM");
    expect(ids("SUBMARINE")).toEqual(
      expect.arrayContaining(["SUBMERGED", "TORPEDO", "GROW", "SEA_BEAST"]),
    );
    expect(
      roleGlossaryV7("PATROL_BOAT", "ORIGINAL").map((entry) => entry.id),
    ).toContain("BOW_RAM");
    expect(glossaryEntryV7("HORNED_PROW").name).toBe("Horned Prow");
    expect(glossaryEntryV7("SEA_BEAST").text).toBe(
      "A living beast: it cannot be boarded.",
    );
    expect(battleshipUnlockNoteV7("DINOSAUR")).toBe(
      "War Raft: long-range splash damage",
    );
    expect(submarineUnlockNoteV7("DINOSAUR")).toBe(
      "Plesiosaur: hit only from the next tile; torpedo with no strike-back; grows; never boarded",
    );
    expect(boardBlockTextV7("TARGET_IMMUNE", 4, true)).toBe(SEA_BEAST_BLOCK_V7);
    expect(boardBlockTextV7("TARGET_IMMUNE", null)).toBe("Not a ship");
  });

  it("captures the fleet: the review fixture's Dugout previews a Horned Prow kill and its Alpha Plesiosaur a 14-damage torpedo", () => {
    const state = dinosaurFleetFixtureV7();
    expect(parseGameStateV7(state)).not.toBeNull();
    const view = viewOf(state);
    const at = (coord: CoordV7) => navalUnitAtV7(state, coord).id;
    const ram = queryCombatPreviewV7(
      view,
      at(DINOSAUR_FLEET_UI_V7.dugout),
      at(DINOSAUR_FLEET_UI_V7.boat),
    );
    if (ram === null) throw new Error("no preview");
    expect(ram).toMatchObject({ ram: true, defenderDies: true });
    expect(navalCombatLinesV7(view, ram).notes).toEqual(["Horned Prow +1.5"]);
    expect(
      queryCombatPreviewV7(
        view,
        at(DINOSAUR_FLEET_UI_V7.plesiosaur),
        at(DINOSAUR_FLEET_UI_V7.battleship),
      ),
    ).toMatchObject({ torpedo: true, damageToDefender: 14 });
  });

  it("bites with its own sound: a Plesiosaur's torpedo plays the ElevenLabs bite, a Submarine's the swing", () => {
    const state = strait(
      ["DINOSAUR", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 5, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const beast = navalUnitAtV7(state, { x: 3, y: 5 });
    const submarine = navalUnitAtV7(state, { x: 5, y: 5 });
    // (`pulp_wars-5ti.22`: the helper names the beast's own sound.)
    expect(seaBeastAttacksV7([view], beast.id)).toBe("attack.plesiosaur");
    expect(seaBeastAttacksV7([view], submarine.id)).toBeNull();
    expect(SOUND_IDS_V1).toContain("attack.plesiosaur");
    expect(
      SOUND_DEFAULT_CLIPS_V1.find((clip) => clip.id === "attack.plesiosaur")
        ?.file,
    ).toBe("attack-plesiosaur-104.m4a");
  });

  it("previews the Horned Prow's bonus: +1 after one tile and +1.5 after two", () => {
    const lines = (ran: number) => {
      const state = strait(
        ["DINOSAUR", "ORIGINAL"],
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        ],
      );
      const view = viewOf(state);
      const preview = queryCombatPreviewV7(
        view,
        navalUnitAtV7(state, { x: 3, y: 5 }).id,
        navalUnitAtV7(state, { x: 4, y: 5 }).id,
      );
      if (preview === null) throw new Error("no preview");
      return navalCombatLinesV7(view, preview).notes;
    };
    expect(lines(1)).toEqual(["Horned Prow +1", "Shoves back"]);
    expect(lines(2)).toEqual(["Horned Prow +1.5", "Shoves back"]);
    const human = strait(
      ["ORIGINAL", "DINOSAUR"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 2 },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const view = viewOf(human);
    const preview = queryCombatPreviewV7(
      view,
      navalUnitAtV7(human, { x: 3, y: 5 }).id,
      navalUnitAtV7(human, { x: 4, y: 5 }).id,
    );
    if (preview === null) throw new Error("no preview");
    expect(navalCombatLinesV7(view, preview).notes[0]).toBe("Bow Ram +1");
  });
});

/** A unit patch that skips the fixture's own schema check (for refusals). */
function patchUnsafe(
  state: GameStateV7,
  id: number,
  patch: Partial<UnitStateV7>,
): GameStateV7 {
  return {
    ...state,
    units: state.units.map((unit) =>
      unit.id === id ? { ...unit, ...patch } : unit,
    ),
  };
}
