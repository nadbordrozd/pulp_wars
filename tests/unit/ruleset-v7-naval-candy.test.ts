import { describe, expect, it } from "vitest";
import {
  NAVAL_ROLE_IDS_V7,
  SUGAR_RUSH_MOVE_BONUS_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  previewSugarRushV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  viewForV7,
  type CombatPreviewV7,
  type CommandV7,
  type CoordV7,
  type DomainEventV7,
  type FactionIdV7,
  type GameStateV7,
  type UnitId,
  type UnitRoleIdV7,
} from "../../src/engine/index";
import {
  battleshipUnlockNoteV7,
  navalRamUnlockTextV7,
  patrolBoatUnlockNotesV7,
  pieGalleonSplatRuleV7,
  submarineUnlockNoteV7,
  sugarSailsRuleV7,
  sugarSailsUnlockTextV7,
} from "../../src/render/naval-presentation-v7";
import {
  candyCombatLinesV7,
  candyHelpRulesV7,
} from "../../src/render/candy-presentation-v7";
import { roleGlossaryV7 } from "../../src/render/unit-glossary-v7";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  CANDY_HOME_NAVAL_TECHS_V7,
  CANDY_NAVAL_TECHS_V7,
  CANDY_WITHOUT_SUGAR_SAILS_V7,
  candyStraitV7,
  type CandyPieceV7,
} from "../fixtures/v7-naval-candy";
import { frozenArenaV7 } from "../fixtures/v7-frozen-sea";
import { endTurnUntilV7 } from "../fixtures/v7-goblin-arena";

// Themed naval branches, Sugar Sails (`pulp_wars-5ti.21`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 8): the Gumdrop Tug, the
// Pie Galleon (17 Coins; its shot Splats its target), and the Choco Sub,
// and Sugar Sails (each ship may Sugar Rush afloat: +1 Move and +1 Attack,
// then it Crashes). Every state is the shared authored strait: rows 3 and
// 7 Shallow Water, rows 4 to 6 Deep Water.

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  viewForV7(state, seatV7(state, seat).id);
const json = (value: unknown): string => JSON.stringify(value);
const offered = (state: GameStateV7, command: CommandV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewOf(state, seat)).some(
    (candidate) => json(candidate) === json(command),
  );
const rush = (unitId: number): CommandV7 => ({
  kind: "SUGAR_RUSH",
  unitId: unitId as UnitId,
});
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
const combatOf = (events: readonly DomainEventV7[]): CombatPreviewV7 => {
  const resolved = events.find((event) => event.kind === "COMBAT_RESOLVED");
  if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return resolved.preview;
};

/** The strait with the pieces: a Candy seat and a rival, both at sea. */
function sea(
  pieces: readonly CandyPieceV7[],
  factions: readonly [FactionIdV7, FactionIdV7] = ["CANDY", "ORIGINAL"],
  candyTechs = CANDY_NAVAL_TECHS_V7,
): GameStateV7 {
  return candyStraitV7({
    factions,
    pieces,
    technologies: [
      factions[0] === "CANDY" ? candyTechs : NAVAL_TECHS_V7,
      factions[1] === "CANDY" ? candyTechs : NAVAL_TECHS_V7,
    ],
  });
}

/**
 * The attack of the unit on `from` at the unit on `to`: its public preview
 * just before, and the resolved exchange.
 */
function exchange(
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  seat: 0 | 1 = 0,
): {
  readonly preview: CombatPreviewV7 | null;
  readonly state: GameStateV7;
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
  return { preview, state: result.state, combat: combatOf(result.events) };
}

/** Rushes the unit on `at` (seat 0) and returns the state after it. */
function rushed(state: GameStateV7, at: CoordV7): GameStateV7 {
  return acceptV7(state, 0, rush(navalUnitAtV7(state, at).id)).state;
}

describe("the Sugar Sails fleet registry (sections 8.1 and 8.2)", () => {
  it("registers every row of the unit table", () => {
    const row = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "CANDY");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        `${String(rule.minimumRange)}-${String(rule.range)}`,
        rule.abilities,
        roleMechanicsV7(role, "CANDY").splash,
      ];
    };
    expect(NAVAL_ROLE_IDS_V7.map(row)).toEqual([
      [
        "Gumdrop Tug",
        5,
        10,
        2,
        2,
        2,
        "1-1",
        ["ATTACK", "RAM", "SUGAR_RUSH"],
        false,
      ],
      [
        "Pie Galleon",
        17,
        25,
        5,
        3,
        2,
        "1-3",
        ["ATTACK", "SPLAT", "SUGAR_RUSH"],
        true,
      ],
      [
        "Choco Sub",
        9,
        12,
        4,
        2,
        2,
        "1-1",
        ["ATTACK", "SUBMERGED", "TORPEDO", "SUGAR_RUSH"],
        false,
      ],
    ]);
    // Every other number is the Human ship's, and the Human mechanics.
    for (const role of NAVAL_ROLE_IDS_V7) {
      const human = effectiveRoleRuleV7(role, "ORIGINAL");
      expect({
        ...effectiveRoleRuleV7(role, "CANDY"),
        label: "",
        cost: 0,
        abilities: [],
      }).toEqual({ ...human, label: "", cost: 0, abilities: [] });
      expect(roleMechanicsV7(role, "CANDY")).toEqual(
        roleMechanicsV7(role, "ORIGINAL"),
      );
    }
    // No other faction's ship Rushes or Splats.
    for (const faction of [
      "ORIGINAL",
      "GOBLIN",
      "UNDEAD",
      "DINOSAUR",
      "MARTIAN",
      "DWARF",
      "CULT",
    ] as const)
      for (const role of NAVAL_ROLE_IDS_V7) {
        const abilities = effectiveRoleRuleV7(role, faction)
          .abilities as readonly string[];
        expect(abilities, `${faction} ${role}`).not.toContain("SUGAR_RUSH");
        expect(abilities, `${faction} ${role}`).not.toContain("SPLAT");
      }
  });

  it("trains each ship at a Port for its price (5, 17, 9 Coins)", () => {
    const state = sea([]);
    const capital = state.cities.find(
      (city) => city.ownerId === seatV7(state, 0).id,
    );
    if (capital === undefined) throw new Error("no capital");
    const coins = seatV7(state, 0).coins;
    for (const [role, price] of [
      ["PATROL_BOAT", 5],
      ["BATTLESHIP", 17],
      ["SUBMARINE", 9],
    ] as const) {
      const trained = acceptV7(state, 0, {
        kind: "TRAIN_NAVAL",
        cityId: capital.id,
        role,
        at: { x: 4, y: 3 },
      }).state;
      expect(coins - seatV7(trained, 0).coins, role).toBe(price);
      const ship = navalUnitAtV7(trained, { x: 4, y: 3 });
      expect([ship.form, ship.hp]).toEqual([
        "NAVAL",
        effectiveRoleRuleV7(role, "CANDY").maxHp,
      ]);
    }
  });

  it("names the five technologies and trades Board for Sugar Sails", () => {
    expect(
      (
        [
          "SHORECRAFT",
          "NAVIGATION",
          "NAVAL_ENGINEERING",
          "SEAMANSHIP",
          "SUBMERSIBLES",
        ] as const
      ).map((tech) => technologyDisplayNameV7(tech, "CANDY")),
    ).toEqual([
      "Gumdrop Tugs",
      "Navigation",
      "Pie Galleons",
      "Sugar Sails",
      "Choco Subs",
    ]);
    const seamanship = factionTreeV7("CANDY").nodes.find(
      (node) => node.id === "SEAMANSHIP",
    );
    expect(seamanship?.unlocks).toEqual([
      { kind: "RAM" },
      { kind: "SUGAR_SAILS" },
    ]);
    expect(technologyCapabilitiesV7(NAVAL_TECHS_V7, "CANDY")).toMatchObject({
      sugarSails: true,
      ram: true,
      boarding: false,
    });
    expect(
      technologyCapabilitiesV7(CANDY_WITHOUT_SUGAR_SAILS_V7, "CANDY")
        .sugarSails,
    ).toBe(false);
    // Sugar Sails is the Candy's alone.
    for (const faction of [
      "ORIGINAL",
      "GOBLIN",
      "UNDEAD",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "DWARF",
      "CULT",
    ] as const)
      expect(technologyCapabilitiesV7(NAVAL_TECHS_V7, faction).sugarSails).toBe(
        false,
      );
  });

  it("shows the ships' Rush and the Galleon's Splat in the public Candy block, never Sugar Sails", () => {
    for (const techs of [CANDY_NAVAL_TECHS_V7, CANDY_WITHOUT_SUGAR_SAILS_V7]) {
      const state = sea(
        [
          { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
          { seat: 0, role: "BATTLESHIP", at: { x: 4, y: 5 } },
          { seat: 0, role: "SUBMARINE", at: { x: 6, y: 5 } },
        ],
        ["CANDY", "ORIGINAL"],
        techs,
      );
      for (const seat of [0, 1] as const) {
        const blocks = [
          { x: 2, y: 4 },
          { x: 4, y: 5 },
          { x: 6, y: 5 },
        ].map((at) => {
          const stats = viewOf(state, seat).unitStats.find(
            (entry) => entry.unitId === navalUnitAtV7(state, at).id,
          );
          expect(json(stats)).not.toContain("sugarSails");
          return [stats?.candy?.sugarRush, stats?.candy?.splats];
        });
        // The research is private: the block is the same with or without it.
        expect(blocks).toEqual([
          [true, false],
          [true, true],
          [true, false],
        ]);
      }
    }
  });
});

describe("the worked examples (section 8.4)", () => {
  it("a Rushed Gumdrop Tug rams a Patrol Boat: 10, sunk", () => {
    let state = sea([
      { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 5 } },
    ]);
    const tug = navalUnitAtV7(state, { x: 2, y: 5 });
    state = rushed(state, { x: 2, y: 5 });
    state = acceptV7(
      state,
      0,
      move(tug.id, [
        { x: 3, y: 5 },
        { x: 4, y: 5 },
      ]),
    ).state;
    const { preview, combat } = exchange(state, { x: 4, y: 5 }, { x: 5, y: 5 });
    expect(preview).toEqual(combat);
    expect([
      combat.ram,
      combat.sugarRushApplied,
      combat.damageToDefender,
      combat.defenderDies,
    ]).toEqual([true, true, 10, true]);
  });

  it("a Rushed Tug rams a Submarine: 12, sunk", () => {
    let state = sea([
      { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
      { seat: 1, role: "SUBMARINE", at: { x: 5, y: 5 } },
    ]);
    const tug = navalUnitAtV7(state, { x: 2, y: 5 });
    state = rushed(state, { x: 2, y: 5 });
    state = acceptV7(
      state,
      0,
      move(tug.id, [
        { x: 3, y: 5 },
        { x: 4, y: 5 },
      ]),
    ).state;
    const { preview, combat } = exchange(state, { x: 4, y: 5 }, { x: 5, y: 5 });
    expect(preview).toEqual(combat);
    expect([combat.ram, combat.damageToDefender, combat.defenderDies]).toEqual([
      true,
      12,
      true,
    ]);
  });

  it("a Rushed Choco Sub torpedoes a Battleship: 14; 0", () => {
    let state = sea([
      { seat: 0, role: "SUBMARINE", at: { x: 4, y: 5 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 5 } },
    ]);
    state = rushed(state, { x: 4, y: 5 });
    const { preview, combat } = exchange(state, { x: 4, y: 5 }, { x: 5, y: 5 });
    expect(preview).toEqual(combat);
    expect([
      combat.sugarRushApplied,
      combat.damageToDefender,
      combat.damageToAttacker,
    ]).toEqual([true, 14, 0]);
  });

  it("a Rushed Pie Galleon on a Battleship: 18; 5", () => {
    let state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
    ]);
    state = rushed(state, { x: 3, y: 5 });
    const { preview, combat } = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect([
      combat.sugarRushApplied,
      combat.damageToDefender,
      combat.damageToAttacker,
      combat.splatApplied,
    ]).toEqual([true, 18, 5, true]);
  });

  it("a Pie Galleon shells a Guard: 14, then a Toffee Trooper's hit has no reply", () => {
    // From the next tile, as the baseline's "Battleship on a Guard: 14; 5"
    // (from two tiles the Guard's lower Defense against a shot lets the
    // Galleon sink it outright, and a sunk target is never Splatted).
    const state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 7 } },
      { seat: 0, role: "FIGHTER", at: { x: 2, y: 8 } },
      { seat: 1, role: "GUARD", at: { x: 3, y: 8 } },
    ]);
    const shot = exchange(state, { x: 3, y: 7 }, { x: 3, y: 8 });
    expect(shot.preview).toEqual(shot.combat);
    expect([
      shot.combat.damageToDefender,
      shot.combat.damageToAttacker,
      shot.combat.splatApplied,
      shot.combat.sugarRushApplied,
    ]).toEqual([14, 5, true, false]);
    const guard = navalUnitAtV7(state, { x: 3, y: 8 });
    expect(shot.state.splattedThisTurn).toEqual([guard.id]);
    // The Guard is left on 3 HP: the Trooper's hit finishes it, unanswered
    // (a surviving Splatted target's no-reply is the Tug's Ram below).
    const blow = exchange(shot.state, { x: 2, y: 8 }, { x: 3, y: 8 });
    expect(blow.preview).toEqual(blow.combat);
    expect([
      blow.combat.retaliation,
      blow.combat.damageToAttacker,
      blow.combat.defenderDies,
    ]).toEqual([false, 0, true]);
    // Without the Splat the Guard would strike back.
    const unsplatted = queryCombatPreviewV7(
      viewOf(state),
      navalUnitAtV7(state, { x: 2, y: 8 }).id,
      guard.id,
    );
    expect(unsplatted?.retaliation).toBe(true);
  });
});

describe("the Pie Galleon's Splat (section 8.3 C1)", () => {
  it("lets a Tug ram the Battleship it shelled with no strike-back", () => {
    const state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
      { seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 4 }, ran: 1 },
      { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
    ]);
    const before = queryCombatPreviewV7(
      viewOf(state),
      navalUnitAtV7(state, { x: 5, y: 4 }).id,
      navalUnitAtV7(state, { x: 4, y: 5 }).id,
    );
    expect(before?.retaliation).toBe(true);
    const shot = exchange(state, { x: 2, y: 5 }, { x: 4, y: 5 });
    expect(shot.combat.splatApplied).toBe(true);
    const ram = exchange(shot.state, { x: 5, y: 4 }, { x: 4, y: 5 });
    expect(ram.preview).toEqual(ram.combat);
    expect([
      ram.combat.ram,
      ram.combat.defenderDies,
      ram.combat.retaliation,
      ram.combat.noRetaliationReason,
      ram.combat.damageToAttacker,
    ]).toEqual([true, false, false, "SPLATTED", 0]);
  });

  it("never Splats a target it sinks", () => {
    const state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
    ]);
    const {
      combat,
      preview,
      state: after,
    } = exchange(state, { x: 2, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect([combat.defenderDies, combat.splatApplied]).toEqual([true, false]);
    expect(after.splattedThisTurn).toEqual([]);
  });

  it("Splats a surviving primary target and not the ship its splash hits", () => {
    const state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 5 } },
    ]);
    const target = navalUnitAtV7(state, { x: 4, y: 5 });
    const beside = navalUnitAtV7(state, { x: 5, y: 5 });
    const {
      combat,
      preview,
      state: after,
    } = exchange(state, { x: 2, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect(combat.splatApplied).toBe(true);
    expect(navalUnitV7(after, beside.id).hp).toBeLessThan(beside.hp);
    expect(after.splattedThisTurn).toEqual([target.id]);
  });

  it("shows Splat in the attack preview's Candy lines", () => {
    const state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 7 } },
      { seat: 1, role: "GUARD", at: { x: 3, y: 8 } },
    ]);
    const preview = queryCombatPreviewV7(
      viewOf(state),
      navalUnitAtV7(state, { x: 3, y: 7 }).id,
      navalUnitAtV7(state, { x: 3, y: 8 }).id,
    );
    if (preview === null) throw new Error("no preview");
    expect(candyCombatLinesV7(preview).notes).toContain(
      "Splat: no strike-back this turn",
    );
  });
});

describe("Sugar Sails: the Rush afloat (section 8.3 C2)", () => {
  const SHIPS: readonly (readonly [UnitRoleIdV7, CoordV7])[] = [
    ["PATROL_BOAT", { x: 2, y: 4 }],
    ["BATTLESHIP", { x: 4, y: 5 }],
    ["SUBMARINE", { x: 7, y: 5 }],
  ];

  it("offers and accepts the Rush of every ship with Sugar Sails (Move 3)", () => {
    const state = sea(SHIPS.map(([role, at]) => ({ seat: 0, role, at })));
    for (const [role, at] of SHIPS) {
      const ship = navalUnitAtV7(state, at);
      expect(offered(state, rush(ship.id)), role).toBe(true);
      const result = acceptV7(state, 0, rush(ship.id));
      expect(result.events).toEqual([
        {
          kind: "UNIT_SUGAR_RUSHED",
          playerId: seatV7(state, 0).id,
          unitId: ship.id,
          move: 2 + SUGAR_RUSH_MOVE_BONUS_V7,
        },
      ]);
      expect(result.state.sugarRush).toEqual([
        { unitId: ship.id, phase: "RUSHED" },
      ]);
      expect(previewSugarRushV7(viewOf(state), ship.id)?.move, role).toBe(3);
    }
  });

  it("is refused without Sugar Sails (TECH_REQUIRED) and never offered", () => {
    const state = sea(
      SHIPS.slice(0, 2).map(([role, at]) => ({ seat: 0, role, at })),
      ["CANDY", "ORIGINAL"],
      CANDY_WITHOUT_SUGAR_SAILS_V7,
    );
    for (const [, at] of SHIPS.slice(0, 2)) {
      const ship = navalUnitAtV7(state, at);
      expect(offered(state, rush(ship.id))).toBe(false);
      expect(previewSugarRushV7(viewOf(state), ship.id)).toBeNull();
      expect(rejectV7(state, 0, rush(ship.id))).toEqual({
        code: "TECH_REQUIRED",
        params: { tech: "SEAMANSHIP" },
      });
    }
  });

  it("is refused to an embarked unit (EMBARKED) and to an icebound ship (ICEBOUND)", () => {
    const embarked = sea([
      {
        seat: 0,
        role: "FIGHTER",
        at: { x: 1, y: 1 },
        embarkedAt: { x: 6, y: 5 },
      },
    ]);
    const trooper = navalUnitAtV7(embarked, { x: 6, y: 5 });
    expect(offered(embarked, rush(trooper.id))).toBe(false);
    expect(rejectV7(embarked, 0, rush(trooper.id))).toEqual({
      code: "SUGAR_RUSH_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    const TUG: CoordV7 = { x: 3, y: 5 };
    const frozen = frozenArenaV7({
      factions: ["CANDY", "ORIGINAL"],
      units: [{ seat: 0, role: "PATROL_BOAT", at: TUG }],
      ice: [{ at: TUG, seat: 2, turnsLeft: 5 }],
      third: { faction: "ICE_FOLK", explored: true },
    });
    const tug = navalUnitAtV7(frozen, TUG);
    expect(offered(frozen, rush(tug.id))).toBe(false);
    expect(rejectV7(frozen, 0, rush(tug.id))).toEqual({
      code: "SUGAR_RUSH_NOT_LEGAL",
      params: { reason: "ICEBOUND" },
    });
  });

  it("is refused after a Move (UNIT_ALREADY_ACTED) and never offered twice", () => {
    const state = sea([{ seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } }]);
    const tug = navalUnitAtV7(state, { x: 2, y: 4 });
    const movedState = acceptV7(state, 0, move(tug.id, [{ x: 3, y: 4 }])).state;
    expect(offered(movedState, rush(tug.id))).toBe(false);
    expect(rejectV7(movedState, 0, rush(tug.id)).code).toBe(
      "UNIT_ALREADY_ACTED",
    );
    const twice = rushed(state, { x: 2, y: 4 });
    expect(offered(twice, rush(tug.id))).toBe(false);
    expect(rejectV7(twice, 0, rush(tug.id))).toEqual({
      code: "SUGAR_RUSH_NOT_LEGAL",
      params: { reason: "RUSHED" },
    });
  });

  it("gives a Rushed ship one more tile of Move, offered exactly as accepted", () => {
    const state = sea([{ seat: 0, role: "PATROL_BOAT", at: { x: 1, y: 4 } }]);
    const tug = navalUnitAtV7(state, { x: 1, y: 4 });
    const path = [
      { x: 2, y: 4 },
      { x: 3, y: 4 },
      { x: 4, y: 4 },
    ];
    expect(rejectV7(state, 0, move(tug.id, path)).code).toBeDefined();
    const fast = rushed(state, { x: 1, y: 4 });
    const destinations = previewSugarRushV7(viewOf(state), tug.id);
    expect(destinations?.newDestinations).toContainEqual({ x: 4, y: 4 });
    const ends = (current: GameStateV7) =>
      queryPlayerCommandsV7(viewOf(current)).flatMap((command) =>
        command.kind === "MOVE" && command.unitId === tug.id
          ? [command.path.at(-1)]
          : [],
      );
    expect(ends(fast)).toContainEqual({ x: 4, y: 4 });
    expect(ends(state)).not.toContainEqual({ x: 4, y: 4 });
    const after = acceptV7(fast, 0, move(tug.id, path)).state;
    expect(navalUnitV7(after, tug.id).at).toEqual({ x: 4, y: 4 });
    const stats = viewOf(fast).unitStats.find(
      (entry) => entry.unitId === tug.id,
    );
    const moveStat = stats?.stats.find((stat) => stat.id === "MOVE");
    expect(json(moveStat)).toContain("SUGAR_RUSH");
  });

  it("lets a Rushed Pie Galleon move or fire from where it stands, never both", () => {
    const state = sea([
      { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 5 } },
    ]);
    const galleon = navalUnitAtV7(state, { x: 2, y: 5 });
    const target = navalUnitAtV7(state, { x: 5, y: 5 });
    const fast = rushed(state, { x: 2, y: 5 });
    const after = acceptV7(fast, 0, move(galleon.id, [{ x: 3, y: 5 }])).state;
    expect(offered(after, attack(galleon.id, target.id))).toBe(false);
    expect(offered(fast, attack(galleon.id, target.id))).toBe(true);
  });

  it("Crashes a Rushed ship at End Turn: next turn it moves and strikes back but cannot attack", () => {
    let state = sea([
      { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 4 } },
      { seat: 1, role: "PATROL_BOAT", at: { x: 6, y: 5 } },
    ]);
    const tug = navalUnitAtV7(state, { x: 2, y: 4 });
    const boat = navalUnitAtV7(state, { x: 6, y: 5 });
    state = rushed(state, { x: 2, y: 4 });
    state = acceptV7(
      state,
      0,
      move(tug.id, [
        { x: 3, y: 4 },
        { x: 4, y: 4 },
        { x: 5, y: 4 },
      ]),
    ).state;
    const ended = endTurnUntilV7(state, seatV7(state, 1).id);
    expect(
      ended.events.find((event) => event.kind === "UNITS_CRASHED"),
    ).toEqual({
      kind: "UNITS_CRASHED",
      playerId: seatV7(state, 0).id,
      crashedUnitIds: [tug.id],
      sparedUnitIds: [],
    });
    expect(ended.state.sugarRush).toEqual([
      { unitId: tug.id, phase: "CRASHED" },
    ]);
    // The Human boat attacks the Crashed Tug: it strikes back.
    const hit = exchange(ended.state, { x: 6, y: 5 }, { x: 5, y: 4 }, 1);
    expect(hit.combat.retaliation).toBe(true);
    expect(hit.combat.damageToAttacker).toBeGreaterThan(0);
    // The Tug's own next turn: it may move but not attack.
    const next = endTurnUntilV7(hit.state, seatV7(state, 0).id).state;
    expect(offered(next, attack(tug.id, boat.id))).toBe(false);
    expect(rejectV7(next, 0, attack(tug.id, boat.id))).toEqual({
      code: "UNIT_CRASHED",
      params: { unitId: tug.id },
    });
    expect(offered(next, rush(tug.id))).toBe(false);
    expect(offered(next, move(tug.id, [{ x: 4, y: 4 }]))).toBe(true);
  });

  it("spares a Rushed ship next to an own city center with Home Sweet Home", () => {
    const at: CoordV7 = { x: 5, y: 3 };
    for (const [techs, spared] of [
      [CANDY_HOME_NAVAL_TECHS_V7, true],
      [CANDY_NAVAL_TECHS_V7, false],
    ] as const) {
      let state = sea([{ seat: 0, role: "SUBMARINE", at }], undefined, techs);
      const sub = navalUnitAtV7(state, at);
      state = rushed(state, at);
      const ended = endTurnUntilV7(state, seatV7(state, 1).id);
      expect(
        ended.events.find((event) => event.kind === "UNITS_CRASHED"),
      ).toEqual({
        kind: "UNITS_CRASHED",
        playerId: seatV7(state, 0).id,
        crashedUnitIds: spared ? [] : [sub.id],
        sparedUnitIds: spared ? [sub.id] : [],
      });
      expect(ended.state.sugarRush).toEqual(
        spared ? [] : [{ unitId: sub.id, phase: "CRASHED" }],
      );
    }
  });

  it("counts a Candy ship's Rushed reach in the public threat envelope", () => {
    const state = sea(
      [{ seat: 1, role: "PATROL_BOAT", at: { x: 1, y: 4 } }],
      ["ORIGINAL", "CANDY"],
    );
    const tug = navalUnitAtV7(state, { x: 1, y: 4 });
    // Move 2 + 1 (Rush) + range 1: the Human viewer assumes Sugar Sails.
    const tiles = queryThreatenedTilesV7(viewOf(state, 0), tug.id);
    expect(tiles).toContainEqual({ x: 5, y: 4 });
    expect(tiles).not.toContainEqual({ x: 6, y: 4 });
  });
});

describe("a Candy ship's death (section 8.3)", () => {
  it("leaves no Crumbs afloat", () => {
    const state = sea([
      { seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
      { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
    ]);
    const ended = endTurnUntilV7(state, seatV7(state, 1).id).state;
    const { combat, state: after } = exchange(
      ended,
      { x: 4, y: 5 },
      { x: 2, y: 5 },
      1,
    );
    expect(combat.defenderDies).toBe(true);
    expect(after.crumbs).toEqual([]);
  });
});

describe("the Candy naval text (sections 8.3 and 12)", () => {
  it("names the Splat and Sugar Sails on the cards", () => {
    expect(pieGalleonSplatRuleV7()).toBe(
      "Whoever the Galleon hits cannot strike back this turn.",
    );
    expect(sugarSailsRuleV7()).toBe(
      "Your ships can Sugar Rush: +1 Move and +1 Attack, then they Crash.",
    );
    expect(sugarSailsUnlockTextV7()).toBe(
      "Sugar Sails: Your ships can Sugar Rush: +1 Move and +1 Attack, then they Crash",
    );
    expect(battleshipUnlockNoteV7("CANDY")).toBe(
      "Pie Galleon: long-range splash damage; whoever it hits cannot strike back this turn",
    );
    expect(navalRamUnlockTextV7("CANDY")).toBe(
      "Bow Ram: Gumdrop Tugs that moved hit ships with +1 Attack and shove them back",
    );
    expect(submarineUnlockNoteV7("CANDY")).toBe(
      "Choco Sub: attacked only from the next tile; its torpedo hits ships with no strike-back",
    );
    expect(patrolBoatUnlockNotesV7("CANDY")).toEqual([]);
  });

  it("lists Sugar Rush on the three ships and Splat on the Galleon in the glossary", () => {
    const names = (role: UnitRoleIdV7) =>
      roleGlossaryV7(role, "CANDY").map((entry) => entry.name);
    expect(names("PATROL_BOAT")).toContain("Sugar Rush");
    expect(names("BATTLESHIP")).toEqual(
      expect.arrayContaining(["Sugar Rush", "Splat"]),
    );
    expect(names("SUBMARINE")).toContain("Sugar Rush");
    expect(names("PATROL_BOAT")).not.toContain("Splat");
  });

  it("has an At sea line in the Candy Help and names the Galleon in Splat", () => {
    const rules = new Map(candyHelpRulesV7());
    expect(rules.get("At sea")).toBe(
      "with Sugar Sails, a Gumdrop Tug, Pie Galleon, or Choco Sub may Rush too, then Crashes like a land unit; a Pie Galleon still can't fire after moving, so it Rushes to fire harder from where it stands.",
    );
    expect(rules.get("Splat")).toContain("Pie Galleon");
  });
});
