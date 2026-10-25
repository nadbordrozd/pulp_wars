import { describe, expect, it } from "vitest";
import {
  HOVER_PODS_RULE_V7,
  SHIELDED_HULL_RULE_V7,
  battleshipUnlockNoteV7,
  hoverPodsUnlockTextV7,
  navalRamUnlockTextV7,
  submarineUnlockNoteV7,
} from "../../src/render/naval-presentation-v7";
import {
  glossaryEntryV7,
  roleGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import { martianMoveLabelV7 } from "../../src/render/canvas/martian-board-plan-v7";
import { HOVER_LAUNCH_LABEL_V7 } from "../../src/render/martian-presentation-v7";
import {
  FORCE_FIELD_SHIELD_V7,
  NAVAL_ROLE_IDS_V7,
  effectiveRoleRuleV7,
  factionTreeV7,
  hoverLaunchAllowedV7,
  parseGameStateV7,
  publicUnitHoverPodsV7,
  publicUnitLaunchesV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  queryThreatenedTilesV7,
  reachablePlayerMovementPathsV7,
  rechargeShieldsV7,
  roleMechanicsV7,
  shieldOfV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  unitCapabilitiesV7,
  viewForV7,
  type CombatPreviewV7,
  type PlayerId,
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
import { frozenStateV7 } from "../fixtures/v7-frozen-sea";
import {
  MARTIAN_FLEET_UI_V7,
  martianFleetFixtureV7,
  martianHoverLaunchFixtureV7,
} from "../fixtures/v7-naval-martian-ui";

// Themed naval branches, the Martian Hover Fleet (`pulp_wars-5ti.19`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 6): the Skimmer, the
// Hover Cruiser, and the Bathysphere (frail hulls behind Shields), and
// Hover Pods (a foot unit makes the last step of a Move onto free Shallow
// Water and launches there with no Port). Every state is a small authored
// strait: rows 0 to 2 and 8 to 10 land, rows 3 and 7 Shallow Water, rows 4
// to 6 Deep Water, the islet on (9, 5) with Shallow Water on its four
// orthogonal neighbours; seat 0's capital on (5, 2) with a Port on (4, 3).

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** An embarked land unit (a transport) on this water tile. */
  readonly embarkedAt?: CoordV7;
  /** The tiles its Move entered this turn (it moved and may still act). */
  readonly ran?: number;
}

function strait(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly PieceV7[],
  technologies: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ] = [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
  ports: readonly [boolean, boolean] = [true, true],
): GameStateV7 {
  let state = navalArenaV7({
    factions,
    technologies,
    ports,
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

const WITHOUT_HOVER_PODS: readonly TechnologyIdV7[] = NAVAL_TECHS_V7.filter(
  (tech) => tech !== "SEAMANSHIP" && tech !== "SUBMERSIBLES",
);

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
const combatOf = (events: readonly DomainEventV7[]): CombatPreviewV7 => {
  const resolved = events.find((event) => event.kind === "COMBAT_RESOLVED");
  if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return resolved.preview;
};
const offeredMoves = (state: GameStateV7, unitId: number, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewOf(state, seat)).flatMap((command) =>
    command.kind === "MOVE" && command.unitId === unitId
      ? [command.path.at(-1)]
      : [],
  );
const shield = (state: GameStateV7, at: CoordV7): number =>
  shieldOfV7(state.shields, navalUnitAtV7(state, at).id);

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

describe("the Martian fleet registry (sections 6.1 and 6.2)", () => {
  it("registers every row of the unit table", () => {
    const row = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "MARTIAN");
      const mechanics = roleMechanicsV7(role, "MARTIAN");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        mechanics.shield,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        `${String(rule.minimumRange)}-${String(rule.range)}`,
        rule.abilities,
        mechanics.splash,
      ];
    };
    expect(NAVAL_ROLE_IDS_V7.map(row)).toEqual([
      ["Skimmer", 5, 8, 2, 2, 2, 2, "1-1", ["ATTACK", "RAM"], false],
      ["Hover Cruiser", 16, 20, 3, 5, 3, 2, "1-3", ["ATTACK"], true],
      [
        "Bathysphere",
        9,
        10,
        2,
        4,
        2,
        2,
        "1-1",
        ["ATTACK", "SUBMERGED", "TORPEDO"],
        false,
      ],
    ]);
    // Every other number is the Human ship's.
    for (const role of NAVAL_ROLE_IDS_V7)
      expect({
        ...effectiveRoleRuleV7(role, "MARTIAN"),
        label: "",
        maxHp: 0,
      }).toEqual({
        ...effectiveRoleRuleV7(role, "ORIGINAL"),
        label: "",
        maxHp: 0,
      });
  });

  it("names the five technologies and trades Board for Hover Pods", () => {
    expect(
      (
        [
          "SHORECRAFT",
          "NAVIGATION",
          "NAVAL_ENGINEERING",
          "SEAMANSHIP",
          "SUBMERSIBLES",
        ] as const
      ).map((tech) => technologyDisplayNameV7(tech, "MARTIAN")),
    ).toEqual([
      "Skimmers",
      "Navigation",
      "Hover Cruisers",
      "Hover Pods",
      "Bathyspheres",
    ]);
    const seamanship = factionTreeV7("MARTIAN").nodes.find(
      (node) => node.id === "SEAMANSHIP",
    );
    expect(seamanship?.unlocks).toEqual([
      { kind: "RAM" },
      { kind: "HOVER_PODS" },
    ]);
    const all = technologyCapabilitiesV7(NAVAL_TECHS_V7, "MARTIAN");
    expect(all).toMatchObject({ hoverPods: true, ram: true, boarding: false });
    expect(
      technologyCapabilitiesV7(WITHOUT_HOVER_PODS, "MARTIAN").hoverPods,
    ).toBe(false);
    // Hover Pods is the Martians' alone.
    for (const faction of ["ORIGINAL", "GOBLIN", "UNDEAD", "DINOSAUR"] as const)
      expect(technologyCapabilitiesV7(NAVAL_TECHS_V7, faction).hoverPods).toBe(
        false,
      );
  });
});

describe("Shielded hulls (section 6.3 M1)", () => {
  it("trains a ship with its full Shield; a Human ship has none", () => {
    const state = strait(["MARTIAN", "ORIGINAL"], []);
    const capital = state.cities.find(
      (city) => city.ownerId === seatV7(state, 0).id,
    );
    if (capital === undefined) throw new Error("no capital");
    for (const [role, maximum] of [
      ["PATROL_BOAT", 2],
      ["BATTLESHIP", 3],
      ["SUBMARINE", 2],
    ] as const) {
      const trained = acceptV7(state, 0, {
        kind: "TRAIN_NAVAL",
        cityId: capital.id,
        role,
        at: { x: 4, y: 3 },
      }).state;
      const ship = navalUnitAtV7(trained, { x: 4, y: 3 });
      expect([
        ship.form,
        ship.hp,
        shieldOfV7(trained.shields, ship.id),
      ]).toEqual([
        "NAVAL",
        effectiveRoleRuleV7(role, "MARTIAN").maxHp,
        maximum,
      ]);
      expect(parseGameStateV7(trained)).not.toBeNull();
    }
    const human = strait(["ORIGINAL", "MARTIAN"], []);
    const humanCapital = human.cities.find(
      (city) => city.ownerId === seatV7(human, 0).id,
    );
    if (humanCapital === undefined) throw new Error("no capital");
    const boat = acceptV7(human, 0, {
      kind: "TRAIN_NAVAL",
      cityId: humanCapital.id,
      role: "PATROL_BOAT",
      at: { x: 4, y: 3 },
    }).state;
    expect(
      shieldOfV7(boat.shields, navalUnitAtV7(boat, { x: 4, y: 3 }).id),
    ).toBe(0);
    expect(boat.shields).toEqual(human.shields);
  });

  it("recharges a ship's Shield at its owner's Start Turn, to 4 beside a Shield Projector with Force Fields", () => {
    const state = strait(
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 4, y: 3 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 8, y: 3 } },
        { seat: 0, role: "GUARD", at: { x: 4, y: 2 } },
      ],
      [[...NAVAL_TECHS_V7, "DRILL", "FORTIFICATION"], NAVAL_TECHS_V7],
    );
    const cruiser = navalUnitAtV7(state, { x: 4, y: 3 });
    const skimmer = navalUnitAtV7(state, { x: 8, y: 3 });
    const spent: GameStateV7 = {
      ...state,
      shields: state.shields.map((entry) =>
        entry.unitId === skimmer.id ? { ...entry, shield: 0 } : entry,
      ),
    };
    const recharged = rechargeShieldsV7(spent, seatV7(state, 0).id).state;
    expect(shieldOfV7(recharged.shields, skimmer.id)).toBe(2);
    expect(shieldOfV7(recharged.shields, cruiser.id)).toBe(
      FORCE_FIELD_SHIELD_V7,
    );
  });

  it("is shown in the ship's public stats", () => {
    const state = strait(
      ["MARTIAN", "ORIGINAL"],
      [{ seat: 0, role: "PATROL_BOAT", at: { x: 2, y: 3 } }],
    );
    const skimmer = navalUnitAtV7(state, { x: 2, y: 3 });
    for (const seat of [0, 1] as const) {
      const stats = viewOf(state, seat).unitStats.find(
        (entry) => entry.unitId === skimmer.id,
      );
      expect(stats?.martian).toMatchObject({ shield: 2, shieldMaximum: 2 });
      expect(stats?.stats.some((stat) => stat.id === "SHIELD")).toBe(true);
    }
  });
});

describe("the worked examples (section 6.4)", () => {
  it("a Patrol Boat rams a Skimmer: 2 on the Shield, 6 on HP (2 left); 4 taken", () => {
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const { preview, result, combat } = exchange(
      state,
      { x: 3, y: 5 },
      { x: 4, y: 5 },
    );
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({
      ram: true,
      defenderShieldDamage: 2,
      damageToDefender: 6,
      damageToAttacker: 4,
      defenderDies: false,
    });
    const skimmer = navalUnitV7(result.state, combat.targetUnitId);
    expect(skimmer.hp).toBe(2);
  });

  it("a Patrol Boat attacks a Skimmer without a ram: 2 on the Shield, 3 on HP; 5 taken", () => {
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const { preview, combat } = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({
      ram: false,
      defenderShieldDamage: 2,
      damageToDefender: 3,
      damageToAttacker: 5,
    });
  });

  it("a Skimmer rams a Patrol Boat: 8; 2, its Shield takes 2 of the reply", () => {
    const state = strait(
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const { preview, combat } = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({
      ram: true,
      damageToDefender: 8,
      attackerShieldDamage: 2,
      damageToAttacker: 2,
    });
  });

  it("a Battleship sinks a Skimmer (the Shield adds 2 to 8)", () => {
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const { preview, combat } = exchange(state, { x: 2, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({ defenderDies: true, damageToAttacker: 0 });
  });

  // The Battleship of the comparison is the Dinosaur War Raft: the Human
  // numbers (two seats of the arena never play one faction).
  it("two Submarine torpedoes leave a Hover Cruiser 1 HP (a Battleship 3)", () => {
    const cruiserLeft = (faction: FactionIdV7): number => {
      const state = strait(
        ["ORIGINAL", faction],
        [
          { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
          { seat: 0, role: "SUBMARINE", at: { x: 5, y: 5 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        ],
      );
      const first = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
      const second = exchange(
        first.result.state,
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      );
      if (faction === "MARTIAN") {
        expect(first.combat).toMatchObject({
          torpedo: true,
          defenderShieldDamage: 3,
          damageToDefender: 7,
        });
        expect(second.combat).toMatchObject({
          defenderShieldDamage: 0,
          damageToDefender: 12,
        });
      }
      expect(first.preview).toEqual(first.combat);
      expect(second.preview).toEqual(second.combat);
      return navalUnitAtV7(second.result.state, { x: 4, y: 5 }).hp;
    };
    expect(cruiserLeft("MARTIAN")).toBe(1);
    expect(cruiserLeft("DINOSAUR")).toBe(3);
  });

  it("a Battleship on a Hover Cruiser: 3 + 11; 5", () => {
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const { preview, combat } = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({
      defenderShieldDamage: 3,
      damageToDefender: 11,
      damageToAttacker: 5,
    });
  });

  it("a Patrol Boat rams a hover-launched Grunt: Shield 2 then 8, sunk", () => {
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 }, ran: 1 },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 2, y: 9 },
          embarkedAt: { x: 2, y: 3 },
        },
      ],
    );
    expect(shield(state, { x: 2, y: 3 })).toBe(2);
    const { preview, combat } = exchange(state, { x: 3, y: 4 }, { x: 2, y: 3 });
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({
      ram: true,
      defenderShieldDamage: 2,
      damageToDefender: 8,
      defenderDies: true,
      damageToAttacker: 0,
    });
  });
});

describe("a prize under its new flag (section 2 rule 5)", () => {
  it("a boarded Skimmer becomes a Human Patrol Boat and loses its Shield entry; a Martian ship cannot board", () => {
    const state = strait(
      ["ORIGINAL", "MARTIAN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 }, hp: 2 },
      ],
    );
    const skimmer = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(shieldOfV7(state.shields, skimmer.id)).toBe(2);
    const boarded = acceptV7(state, 0, {
      kind: "BOARD",
      unitId: navalUnitAtV7(state, { x: 3, y: 5 }).id,
      targetUnitId: skimmer.id,
    }).state;
    const prize = navalUnitV7(boarded, skimmer.id);
    expect([prize.ownerId, prize.maxHp, prize.hp]).toEqual([
      seatV7(state, 0).id,
      10,
      4,
    ]);
    expect(shieldOfV7(boarded.shields, skimmer.id)).toBe(0);
    // A Martian ship never boards (Hover Pods instead of Board), so no
    // prize ever takes a Shield.
    const martian = strait(
      ["MARTIAN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 }, hp: 2 },
      ],
    );
    expect(
      rejectV7(martian, 0, {
        kind: "BOARD",
        unitId: navalUnitAtV7(martian, { x: 3, y: 5 }).id,
        targetUnitId: navalUnitAtV7(martian, { x: 4, y: 5 }).id,
      }),
    ).toEqual({ code: "TECH_REQUIRED", params: { tech: "SEAMANSHIP" } });
  });
});

describe("Hover Pods (section 6.3 M2)", () => {
  const BEACH: CoordV7 = { x: 2, y: 2 };
  const SHORE: CoordV7 = { x: 2, y: 3 };
  const beach = (
    technologies: readonly TechnologyIdV7[] = NAVAL_TECHS_V7,
    role: UnitRoleIdV7 = "FIGHTER",
    extra: readonly PieceV7[] = [],
  ): GameStateV7 =>
    strait(
      ["MARTIAN", "ORIGINAL"],
      [{ seat: 0, role, at: BEACH }, ...extra],
      [technologies, NAVAL_TECHS_V7],
      [false, true],
    );

  it("launches a Grunt from the beach onto free Shallow Water, offered and accepted, exhausted and embarked with its Shield", () => {
    const state = beach();
    const grunt = navalUnitAtV7(state, BEACH);
    expect(offeredMoves(state, grunt.id)).toEqual(
      expect.arrayContaining([
        { x: 1, y: 3 },
        { x: 2, y: 3 },
        { x: 3, y: 3 },
      ]),
    );
    const result = acceptV7(state, 0, move(grunt.id, [SHORE]));
    const launched = navalUnitV7(result.state, grunt.id);
    expect(launched).toMatchObject({
      at: SHORE,
      form: "EMBARKED",
      activation: { moved: true, handled: true, movedPathLength: 1 },
    });
    expect(shieldOfV7(result.state.shields, grunt.id)).toBe(2);
    expect(parseGameStateV7(result.state)).not.toBeNull();
    // It embarks there as at a Port (the existing embark cue plays).
    expect(result.events).toContainEqual({
      kind: "UNIT_EMBARKED",
      playerId: seatV7(state, 0).id,
      unitId: grunt.id,
      passengerRole: "FIGHTER",
      from: BEACH,
      to: SHORE,
    });
  });

  it("launches every Martian foot unit (Grunt, Ray Gunner, Shield Projector, Brain, Shock Trooper), never a machine's own way or a non-Martian", () => {
    for (const role of [
      "FIGHTER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "SWORDSMAN",
    ] as const) {
      const state = beach(NAVAL_TECHS_V7, role);
      const unit = navalUnitAtV7(state, BEACH);
      expect(acceptV7(state, 0, move(unit.id, [SHORE])).state.units).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: unit.id, form: "EMBARKED" }),
        ]),
      );
    }
    // A Human Fighter on the same beach walks to its Port.
    const human = strait(
      ["ORIGINAL", "MARTIAN"],
      [{ seat: 0, role: "FIGHTER", at: BEACH }],
    );
    const fighter = navalUnitAtV7(human, BEACH);
    expect(offeredMoves(human, fighter.id)).not.toContainEqual(SHORE);
    expect(rejectV7(human, 0, move(fighter.id, [SHORE]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
  });

  it("needs Hover Pods", () => {
    const state = beach(WITHOUT_HOVER_PODS);
    const grunt = navalUnitAtV7(state, BEACH);
    expect(offeredMoves(state, grunt.id)).not.toContainEqual(SHORE);
    expect(rejectV7(state, 0, move(grunt.id, [SHORE]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
  });

  it("never launches onto Deep Water, ice, a dock, or an occupied tile, nor mid-Move", () => {
    // The islet: Shallow Water on its four sides, Deep Water on its corners.
    const islet = strait(
      ["MARTIAN", "ORIGINAL"],
      [{ seat: 0, role: "FIGHTER", at: { x: 9, y: 5 } }],
    );
    const stranded = navalUnitAtV7(islet, { x: 9, y: 5 });
    const fromIslet = offeredMoves(islet, stranded.id);
    expect(fromIslet).toHaveLength(4);
    expect(fromIslet).toEqual(
      expect.arrayContaining([
        { x: 9, y: 4 },
        { x: 8, y: 5 },
        { x: 10, y: 5 },
        { x: 9, y: 6 },
      ]),
    );
    expect(rejectV7(islet, 0, move(stranded.id, [{ x: 8, y: 4 }]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
    // Ice is ground: a Grunt walks onto it and slips (no launch).
    const iced = frozenStateV7(
      strait(
        ["MARTIAN", "ICE_FOLK"],
        [{ seat: 0, role: "FIGHTER", at: BEACH }],
        [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
        [false, true],
      ),
      [{ at: SHORE, seat: 1 }],
    );
    const walker = navalUnitAtV7(iced, BEACH);
    const slipped = navalUnitV7(
      acceptV7(iced, 0, move(walker.id, [SHORE])).state,
      walker.id,
    );
    expect([slipped.at, slipped.form]).toEqual([SHORE, "LAND"]);
    // A hostile dock is closed (an own active Port embarks as ever).
    const docks = strait(
      ["MARTIAN", "ORIGINAL"],
      [{ seat: 0, role: "FIGHTER", at: { x: 7, y: 8 } }],
    );
    const raider = navalUnitAtV7(docks, { x: 7, y: 8 });
    expect(offeredMoves(docks, raider.id)).not.toContainEqual({ x: 6, y: 7 });
    expect(offeredMoves(docks, raider.id)).toContainEqual({ x: 7, y: 7 });
    expect(rejectV7(docks, 0, move(raider.id, [{ x: 6, y: 7 }]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
    // An occupied tile.
    const crowded = beach(NAVAL_TECHS_V7, "FIGHTER", [
      { seat: 0, role: "PATROL_BOAT", at: SHORE },
    ]);
    const blocked = navalUnitAtV7(crowded, BEACH);
    expect(offeredMoves(crowded, blocked.id)).not.toContainEqual(SHORE);
    expect(rejectV7(crowded, 0, move(blocked.id, [SHORE]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "OCCUPIED" },
    });
    // Mid-Move: a step past the water is no launch.
    const grunt = navalUnitAtV7(beach(), BEACH);
    expect(
      rejectV7(beach(), 0, move(grunt.id, [SHORE, { x: 3, y: 2 }])),
    ).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
  });

  it("is the rule of the shared helper: the last single step onto known Shallow Water that is no ice and no dock", () => {
    const base = {
      hoverPods: true,
      movementMode: "GROUND",
      form: "LAND",
      terrain: "SHALLOW_WATER",
      ice: false,
      improvement: null,
      lastStep: true,
      hop: false,
      known: true,
      embarks: true,
    } as const;
    expect(hoverLaunchAllowedV7(base)).toBe(true);
    for (const patch of [
      { hoverPods: false },
      { movementMode: "STRIDE" },
      { form: "EMBARKED" },
      { terrain: "DEEP_WATER" },
      { ice: true },
      { improvement: "PORT" },
      { improvement: "SHIPYARD" },
      { lastStep: false },
      { hop: true },
      { known: false },
      { embarks: false },
    ] as const)
      expect(hoverLaunchAllowedV7({ ...base, ...patch })).toBe(false);
  });

  it("follows the Thrall rules: a controlled Martian foot unit launches with its controller's Hover Pods; a controlled unit of another kind never", () => {
    const controlled = (
      factions: readonly [FactionIdV7, FactionIdV7],
      technologies: readonly TechnologyIdV7[],
    ): { state: GameStateV7; unitId: number } => {
      const base = strait(
        factions,
        [
          { seat: 0, role: "CAPTAIN", at: { x: 1, y: 1 } },
          { seat: 1, role: "FIGHTER", at: BEACH },
        ],
        [technologies, NAVAL_TECHS_V7],
      );
      const thrall = navalUnitAtV7(base, BEACH);
      const state = parseGameStateV7({
        ...base,
        units: base.units.map((unit) =>
          unit.id === thrall.id
            ? {
                ...unit,
                ownerId: seatV7(base, 0).id,
                homeCityId: null,
                captureEligible: false,
              }
            : unit,
        ),
        mindControlled: [
          {
            unitId: thrall.id,
            brainUnitId: navalUnitAtV7(base, { x: 1, y: 1 }).id,
            originalOwnerId: thrall.ownerId,
          },
        ],
      });
      if (state === null) throw new Error("invalid thrall state");
      return { state, unitId: thrall.id };
    };
    // A Human Fighter under a Martian Brain reads its own tree: no Hover
    // Pods, whatever its controller researched.
    const human = controlled(["MARTIAN", "ORIGINAL"], NAVAL_TECHS_V7);
    expect(offeredMoves(human.state, human.unitId)).not.toContainEqual(SHORE);
    expect(rejectV7(human.state, 0, move(human.unitId, [SHORE]))).toEqual({
      code: "MOVEMENT_ILLEGAL",
      params: { reason: "ENGINEERING_REQUIRED" },
    });
    // A Martian Grunt under another Martian seat's Brain (two Martian seats,
    // which no arena match can hold, so the roster is written out) reads
    // the Martian tree with its controller's research: the general
    // `unitCapabilitiesV7` rule that both movement validations read.
    const roster = {
      players: [
        { id: 1 as PlayerId, faction: "MARTIAN" as const },
        { id: 2 as PlayerId, faction: "MARTIAN" as const },
      ],
      mindControlled: [
        {
          unitId: 7 as UnitId,
          brainUnitId: 3 as UnitId,
          originalOwnerId: 2 as PlayerId,
        },
      ],
    };
    const thrall = {
      id: 7 as UnitId,
      ownerId: 1 as PlayerId,
      role: "FIGHTER" as const,
    };
    expect(unitCapabilitiesV7(roster, thrall, NAVAL_TECHS_V7).hoverPods).toBe(
      true,
    );
    expect(
      unitCapabilitiesV7(roster, thrall, WITHOUT_HOVER_PODS).hoverPods,
    ).toBe(false);
  });

  it("is assumed for another seat's Martian foot unit (private research), whose launch tiles are no attack origins", () => {
    const state = beach(WITHOUT_HOVER_PODS);
    const grunt = navalUnitAtV7(state, BEACH);
    const hostileView = viewOf(state, 1);
    const seen = hostileView.units.find((unit) => unit.id === grunt.id);
    if (seen === undefined) throw new Error("the Grunt is hidden");
    expect(publicUnitHoverPodsV7(hostileView, seen)).toBe(true);
    expect(publicUnitLaunchesV7(hostileView, seen)).toBe(true);
    expect(
      reachablePlayerMovementPathsV7(hostileView, seen).map(
        (path) => path.destination,
      ),
    ).toContainEqual(SHORE);
    // Its own view is exact.
    const ownView = viewOf(state, 0);
    const own = ownView.units.find((unit) => unit.id === grunt.id);
    if (own === undefined) throw new Error("no Grunt");
    expect(publicUnitHoverPodsV7(ownView, own)).toBe(false);
    // The Grunt's range-2 shot reaches row 4 from the beach; from the
    // launch tile it could not shoot at all (it is afloat).
    const threatened = queryThreatenedTilesV7(hostileView, grunt.id);
    expect(threatened).toContainEqual({ x: 2, y: 4 });
    expect(threatened).not.toContainEqual({ x: 2, y: 5 });
  });
});

describe("the interface text (section 12)", () => {
  it("names the ships on the cards and says the Hover Pods and Shield sentences", () => {
    expect(navalRamUnlockTextV7("MARTIAN")).toContain("Skimmer");
    expect(battleshipUnlockNoteV7("MARTIAN")).toBe(
      "Hover Cruiser: long-range splash damage",
    );
    expect(submarineUnlockNoteV7("MARTIAN")).toMatch(/^Bathysphere/);
    expect(hoverPodsUnlockTextV7()).toBe(
      "Hover Pods: Your foot troops can hover off any beach",
    );
    expect(HOVER_PODS_RULE_V7).toBe(
      "Your foot troops can hover off any beach.",
    );
    expect(SHIELDED_HULL_RULE_V7).toBe(
      "Its Shield takes hits first and recharges every turn.",
    );
  });

  it("lists the Shield on each Martian hull and Hover Pods on each Martian foot unit in the glossary", () => {
    const shieldEntry = glossaryEntryV7("SHIELD");
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(roleGlossaryV7(role, "MARTIAN")).toContainEqual(shieldEntry);
    expect(roleGlossaryV7("PATROL_BOAT", "ORIGINAL")).not.toContainEqual(
      shieldEntry,
    );
    const hover = glossaryEntryV7("HOVER_PODS");
    expect(hover.name).toBe("Hover Pods");
    for (const role of [
      "FIGHTER",
      "MARKSMAN",
      "GUARD",
      "CAPTAIN",
      "SWORDSMAN",
    ] as const)
      expect(roleGlossaryV7(role, "MARTIAN")).toContainEqual(hover);
    for (const role of ["RAIDER", "CATAPULT", "KNIGHT", "JUGGERNAUT"] as const)
      expect(roleGlossaryV7(role, "MARTIAN")).not.toContainEqual(hover);
    expect(roleGlossaryV7("FIGHTER", "ORIGINAL")).not.toContainEqual(hover);
  });

  it("marks a shore launch on the board; a Saucer over water has no Launch (7r116)", () => {
    const state = martianHoverLaunchFixtureV7();
    const view = viewOf(state);
    const grunt = navalUnitAtV7(state, MARTIAN_FLEET_UI_V7.grunt);
    const commands = queryPlayerCommandsV7(view).filter(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" && command.unitId === grunt.id,
    );
    const labels = new Map(
      commands.map((command) => [
        JSON.stringify(command.path.at(-1)),
        martianMoveLabelV7(view, command),
      ]),
    );
    expect(labels.get(JSON.stringify(MARTIAN_FLEET_UI_V7.launch))).toBe(
      HOVER_LAUNCH_LABEL_V7,
    );
    expect(labels.get(JSON.stringify({ x: 3, y: 1 }))).toBeNull();
    const saucer = navalUnitAtV7(state, MARTIAN_FLEET_UI_V7.saucer);
    const saucerLaunch = queryPlayerCommandsV7(view).find(
      (command): command is Extract<CommandV7, { kind: "MOVE" }> =>
        command.kind === "MOVE" &&
        command.unitId === saucer.id &&
        command.path.at(-1)?.y === 3,
    );
    if (saucerLaunch === undefined) throw new Error("no saucer launch");
    // Flyers over water (`pulp_wars-7pi5`): a flyer stays in the air over
    // water, so its Move there is no launch (the Tripod's Launch is tested
    // in ruleset-v7-flyers-over-water.test.ts).
    expect(martianMoveLabelV7(view, saucerLaunch)).toBeNull();
  });

  it("captures the fleet: the review fixture's Skimmer previews a shielded Ram", () => {
    const state = martianFleetFixtureV7();
    expect(parseGameStateV7(state)).not.toBeNull();
    const view = viewOf(state);
    const at = (coord: CoordV7) => navalUnitAtV7(state, coord).id;
    expect(
      queryCombatPreviewV7(
        view,
        at(MARTIAN_FLEET_UI_V7.skimmer),
        at(MARTIAN_FLEET_UI_V7.boat),
      ),
    ).toMatchObject({
      ram: true,
      damageToDefender: 8,
      attackerShieldDamage: 2,
    });
    for (const ship of [
      MARTIAN_FLEET_UI_V7.skimmer,
      MARTIAN_FLEET_UI_V7.cruiser,
      MARTIAN_FLEET_UI_V7.bathysphere,
    ])
      expect(shield(state, ship)).toBeGreaterThan(0);
  });
});
