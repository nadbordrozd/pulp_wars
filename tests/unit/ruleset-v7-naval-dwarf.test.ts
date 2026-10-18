import { describe, expect, it } from "vitest";
import {
  NAVAL_ROLE_IDS_V7,
  PLAGUE_DAMAGE_V7,
  ICE_CRUSH_DAMAGE_V7,
  TUNNEL_RANGE_V7,
  allOwnedUnitsV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  parseGameStateV7,
  previewTunnelV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  seaTunnelPassableV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
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
} from "../../src/engine/index";
import {
  armouredHullRuleV7,
  battleshipUnlockNoteV7,
  navalRamUnlockTextV7,
  patrolBoatUnlockNotesV7,
  seaTunnelsRuleV7,
  seaTunnelsUnlockTextV7,
  submarineUnlockNoteV7,
} from "../../src/render/naval-presentation-v7";
import {
  glossaryEntryV7,
  roleGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  dwarfCombatLinesV7,
  dwarfHelpRulesV7,
} from "../../src/render/dwarf-presentation-v7";
import { seaTunnelRouteV7 } from "../../src/render/dwarf-tunnel-v7";
import { dwarfPickTargetsV7 } from "../../src/render/canvas/dwarf-board-plan-v7";
import {
  NAVAL_TECHS_V7,
  acceptV7,
  navalUnitAtV7,
  navalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";
import {
  DWARF_NAVAL_TECHS_V7,
  DWARF_WITHOUT_SEA_TUNNELS_V7,
  SEA_TUNNEL_NARROW_V7,
  SEA_TUNNEL_STRAIT_V7,
  dwarfStraitV7,
  type DwarfPieceV7,
} from "../fixtures/v7-naval-dwarf";
import { frozenArenaV7, frozenStateV7 } from "../fixtures/v7-frozen-sea";
import { patchTileV7 } from "../fixtures/v7-revision20";
import { endTurnUntilV7, seatIdV7 } from "../fixtures/v7-goblin-arena";

// Themed naval branches, Ironclads and Sea Tunnels (`pulp_wars-5ti.20`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md section 7): the Steam Launch,
// the Ironclad, and the Diving Bell (Armoured hulls at a higher price), and
// Sea Tunnels (a Steam Mole's tunnel may pass under one or two Shallow
// Water tiles, never Deep Water or ice). The exchanges use the authored
// strait of `v7-naval-branch.ts` (rows 3 and 7 Shallow Water, rows 4 to 6
// Deep Water); the tunnels the straits of `v7-naval-dwarf.ts` (a two-tile
// strait between (1, 5) and (1, 8), and a one-tile one between (1, 6) and
// (1, 8)).

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  viewForV7(state, seatV7(state, seat).id);
const attack = (unitId: number, targetUnitId: number): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitId as UnitId,
  targetUnitId: targetUnitId as UnitId,
});
const combatOf = (events: readonly DomainEventV7[]): CombatPreviewV7 => {
  const resolved = events.find((event) => event.kind === "COMBAT_RESOLVED");
  if (resolved?.kind !== "COMBAT_RESOLVED") throw new Error("no combat");
  return resolved.preview;
};
const json = (value: unknown): string => JSON.stringify(value);
const offered = (state: GameStateV7, command: CommandV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewOf(state, seat)).some(
    (candidate) => json(candidate) === json(command),
  );
const tunnel = (
  state: GameStateV7,
  from: CoordV7,
  to: CoordV7,
  rider: { readonly from: CoordV7; readonly to: CoordV7 } | null = null,
): CommandV7 => ({
  kind: "TUNNEL",
  unitId: navalUnitAtV7(state, from).id,
  to,
  rider:
    rider === null
      ? null
      : { unitId: navalUnitAtV7(state, rider.from).id, to: rider.to },
});

/** The exchanges' strait (the shared arena), Dwarves against `rival`. */
function sea(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly DwarfPieceV7[],
): GameStateV7 {
  return dwarfStraitV7({
    factions,
    pieces,
    technologies: [
      factions[0] === "DWARF" ? DWARF_NAVAL_TECHS_V7 : NAVAL_TECHS_V7,
      factions[1] === "DWARF" ? DWARF_NAVAL_TECHS_V7 : NAVAL_TECHS_V7,
    ],
  });
}

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

const MOLE: CoordV7 = { x: 1, y: 5 };
const HAMMERER: CoordV7 = { x: 1, y: 4 };
const FAR_COAST: CoordV7 = { x: 1, y: 8 };
const ENEMY: CoordV7 = { x: 2, y: 9 };

/** The two-tile strait with a Mole, a Hammerer beside it, and a Fighter beyond. */
function straitOf(
  technologies: readonly TechnologyIdV7[] = DWARF_NAVAL_TECHS_V7,
  terrain: readonly string[] = SEA_TUNNEL_STRAIT_V7,
  mole: CoordV7 = MOLE,
  hammerer: CoordV7 = HAMMERER,
): GameStateV7 {
  return dwarfStraitV7({
    terrain,
    pieces: [
      { seat: 0, role: "GUARD", at: mole },
      { seat: 0, role: "FIGHTER", at: hammerer },
      { seat: 1, role: "FIGHTER", at: ENEMY },
    ],
    technologies: [technologies, NAVAL_TECHS_V7],
  });
}

describe("the Ironclad fleet registry (sections 7.1 and 7.2)", () => {
  it("registers every row of the unit table", () => {
    const row = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "DWARF");
      const mechanics = roleMechanicsV7(role, "DWARF");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        `${String(rule.minimumRange)}-${String(rule.range)}`,
        rule.abilities,
        mechanics.splash,
        mechanics.armourReduction,
      ];
    };
    expect(NAVAL_ROLE_IDS_V7.map(row)).toEqual([
      [
        "Steam Launch",
        6,
        10,
        2,
        2,
        2,
        "1-1",
        ["ATTACK", "RAM", "ARMOURED"],
        false,
        1,
      ],
      ["Ironclad", 18, 25, 5, 3, 2, "1-3", ["ATTACK", "ARMOURED"], true, 1],
      [
        "Diving Bell",
        10,
        12,
        4,
        2,
        2,
        "1-1",
        ["ATTACK", "SUBMERGED", "TORPEDO", "ARMOURED"],
        false,
        1,
      ],
    ]);
    // Every other number is the Human ship's; no other faction's ship is
    // Armoured.
    for (const role of NAVAL_ROLE_IDS_V7) {
      const human = effectiveRoleRuleV7(role, "ORIGINAL");
      expect({
        ...effectiveRoleRuleV7(role, "DWARF"),
        label: "",
        cost: 0,
        abilities: [],
      }).toEqual({ ...human, label: "", cost: 0, abilities: [] });
      for (const faction of [
        "ORIGINAL",
        "GOBLIN",
        "UNDEAD",
        "DINOSAUR",
        "MARTIAN",
        "CANDY",
        "CULT",
      ] as const)
        expect(roleMechanicsV7(role, faction).armourReduction).toBe(0);
    }
  });

  it("trains each ship at a Port for its price (6, 18, 10 Coins)", () => {
    const state = sea(["DWARF", "ORIGINAL"], []);
    const capital = state.cities.find(
      (city) => city.ownerId === seatV7(state, 0).id,
    );
    if (capital === undefined) throw new Error("no capital");
    const coins = seatV7(state, 0).coins;
    for (const [role, price] of [
      ["PATROL_BOAT", 6],
      ["BATTLESHIP", 18],
      ["SUBMARINE", 10],
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
        effectiveRoleRuleV7(role, "DWARF").maxHp,
      ]);
    }
  });

  it("names the five technologies and trades Board for Sea Tunnels", () => {
    expect(
      (
        [
          "SHORECRAFT",
          "NAVIGATION",
          "NAVAL_ENGINEERING",
          "SEAMANSHIP",
          "SUBMERSIBLES",
        ] as const
      ).map((tech) => technologyDisplayNameV7(tech, "DWARF")),
    ).toEqual([
      "Steam Launches",
      "Navigation",
      "Ironclads",
      "Sea Tunnels",
      "Diving Bells",
    ]);
    const seamanship = factionTreeV7("DWARF").nodes.find(
      (node) => node.id === "SEAMANSHIP",
    );
    expect(seamanship?.unlocks).toEqual([
      { kind: "RAM" },
      { kind: "SEA_TUNNELS" },
    ]);
    expect(technologyCapabilitiesV7(NAVAL_TECHS_V7, "DWARF")).toMatchObject({
      seaTunnels: true,
      ram: true,
      boarding: false,
    });
    expect(
      technologyCapabilitiesV7(DWARF_WITHOUT_SEA_TUNNELS_V7, "DWARF")
        .seaTunnels,
    ).toBe(false);
    // Sea Tunnels is the Dwarves' alone.
    for (const faction of [
      "ORIGINAL",
      "GOBLIN",
      "UNDEAD",
      "DINOSAUR",
      "MARTIAN",
      "ICE_FOLK",
      "CANDY",
      "CULT",
    ] as const)
      expect(technologyCapabilitiesV7(NAVAL_TECHS_V7, faction).seaTunnels).toBe(
        false,
      );
  });

  it("shows Armoured in the ship's public Dwarf block, and never Sea Tunnels", () => {
    const state = sea(
      ["DWARF", "ORIGINAL"],
      [{ seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } }],
    );
    const ironclad = navalUnitAtV7(state, { x: 2, y: 5 });
    for (const seat of [0, 1] as const) {
      const stats = viewOf(state, seat).unitStats.find(
        (entry) => entry.unitId === ironclad.id,
      );
      expect(stats?.dwarf?.armourReduction).toBe(1);
      expect(json(stats)).not.toContain("seaTunnels");
    }
    const capital = viewOf(state, 1).unitStats.find(
      (entry) => entry.unitId === navalUnitAtV7(state, { x: 5, y: 2 }).id,
    );
    expect(capital?.dwarf?.armourReduction).toBe(0);
  });
});

describe("the worked examples (section 7.4)", () => {
  it("a Patrol Boat rams a Steam Launch: 7 (8 less 1); 4", () => {
    const state = sea(
      ["ORIGINAL", "DWARF"],
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
      damageToDefender: 7,
      damageToAttacker: 4,
      defenderArmoured: true,
      attackerArmoured: false,
    });
    expect(navalUnitV7(result.state, combat.targetUnitId).hp).toBe(3);
  });

  it("a Steam Launch rams a Patrol Boat: 8; 3", () => {
    const state = sea(
      ["DWARF", "ORIGINAL"],
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
      damageToAttacker: 3,
      attackerArmoured: true,
    });
  });

  it("a Patrol Boat rams an Ironclad: 6; 7, a losing ram", () => {
    const state = sea(
      ["ORIGINAL", "DWARF"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const { preview, combat } = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({
      ram: true,
      damageToDefender: 6,
      damageToAttacker: 7,
    });
  });

  it("two Submarine torpedoes leave an Ironclad 5 HP (9, then 11); a Battleship 3", () => {
    for (const [rival, left, hits] of [
      ["DWARF", 5, [9, 11]],
      ["DINOSAUR", 3, [10, 12]],
    ] as const) {
      const state = sea(
        ["ORIGINAL", rival],
        [
          { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
          { seat: 0, role: "SUBMARINE", at: { x: 5, y: 5 } },
          { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        ],
      );
      const first = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
      expect(first.preview).toEqual(first.combat);
      const second = exchange(
        first.result.state,
        { x: 5, y: 5 },
        {
          x: 4,
          y: 5,
        },
      );
      expect(second.preview).toEqual(second.combat);
      expect(
        [first.combat.damageToDefender, second.combat.damageToDefender],
        rival,
      ).toEqual(hits);
      expect(first.combat.damageToAttacker).toBe(0);
      expect(
        navalUnitV7(second.result.state, first.combat.targetUnitId).hp,
        rival,
      ).toBe(left);
    }
  });

  it("a Battleship on an Ironclad: 13; 5", () => {
    const state = sea(
      ["ORIGINAL", "DWARF"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const { preview, combat } = exchange(state, { x: 3, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    expect(combat).toMatchObject({
      damageToDefender: 13,
      damageToAttacker: 5,
    });
  });
});

describe("W1, Armoured on every damage source but the crush", () => {
  it("takes 1 off a Battleship's splash on a Steam Launch", () => {
    const state = sea(
      ["ORIGINAL", "DWARF"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 5 } },
      ],
    );
    const { preview, combat } = exchange(state, { x: 2, y: 5 }, { x: 4, y: 5 });
    expect(preview).toEqual(combat);
    const launch = navalUnitAtV7(state, { x: 5, y: 5 });
    const entry = combat.splash.find((item) => item.unitId === launch.id);
    const hit = combat.damageToDefender + combat.defenderShieldDamage;
    expect(entry?.damage).toBe(Math.max(1, Math.ceil(hit / 2)) - 1);
  });

  it("takes 1 off a Fire Raft's Kaboom (5) and a Dreadnought's death blast (7)", () => {
    const state = sea(
      ["GOBLIN", "DWARF"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 4 }, hp: 3 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 4 } },
      ],
    );
    const raft = navalUnitAtV7(state, { x: 3, y: 5 });
    const launch = navalUnitAtV7(state, { x: 4, y: 5 });
    const ironclad = navalUnitAtV7(state, { x: 4, y: 4 });
    const result = acceptV7(state, 0, {
      kind: "KABOOM",
      unitId: raft.id,
    });
    const explosions = result.events.flatMap((event) =>
      event.kind === "EXPLOSION_RESOLVED" ? [event] : [],
    );
    // The Kaboom (5) sinks the 3-HP Dreadnought, whose blast (7) follows.
    const hitOn = (index: number, unitId: number) =>
      explosions[index]?.results.find((entry) => entry.unitId === unitId)
        ?.damage;
    expect(explosions.map((entry) => entry.damage)).toEqual([5, 7]);
    expect([hitOn(0, launch.id), hitOn(0, ironclad.id)]).toEqual([4, 4]);
    expect([hitOn(1, launch.id), hitOn(1, ironclad.id)]).toEqual([6, 6]);
  });

  it("takes 1 off a Banshee's Wail", () => {
    const wailOn = (rival: FactionIdV7): number => {
      const state = sea(
        ["UNDEAD", rival],
        [
          { seat: 0, role: "MARKSMAN", at: { x: 4, y: 2 } },
          { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 4 } },
        ],
      );
      const banshee = navalUnitAtV7(state, { x: 4, y: 2 });
      const boat = navalUnitAtV7(state, { x: 4, y: 4 });
      const result = acceptV7(state, 0, { kind: "WAIL", unitId: banshee.id });
      return boat.hp - navalUnitV7(result.state, boat.id).hp;
    };
    const human = wailOn("ORIGINAL");
    expect(human).toBeGreaterThanOrEqual(2);
    expect(wailOn("DWARF")).toBe(human - 1);
  });

  it("takes 1 off Plague (2) at its owner's Start Turn", () => {
    const base = sea(
      ["UNDEAD", "DWARF"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const lich = navalUnitAtV7(base, { x: 2, y: 2 });
    const ironclad = navalUnitAtV7(base, { x: 4, y: 5 });
    const plagued = parseGameStateV7({
      ...base,
      plagued: [
        { unitId: ironclad.id, sourceUnitId: lich.id, turnsRemaining: 3 },
      ],
    });
    if (plagued === null) throw new Error("the plagued state is invalid");
    const result = acceptV7(plagued, 0, { kind: "END_TURN" });
    const damage = result.events.flatMap((event) =>
      event.kind === "PLAGUE_DAMAGED" ? event.results : [],
    );
    expect(PLAGUE_DAMAGE_V7).toBe(2);
    expect(damage).toMatchObject([{ unitId: ironclad.id, damage: 1 }]);
  });

  it("does not reduce the Ice Folk crush (3)", () => {
    const state = frozenArenaV7({
      factions: ["ICE_FOLK", "DWARF"],
      technologies: [NAVAL_TECHS_V7, DWARF_NAVAL_TECHS_V7],
      units: [{ seat: 1, role: "PATROL_BOAT", at: { x: 1, y: 5 } }],
      ice: [{ at: { x: 1, y: 5 } }],
    });
    const launch = navalUnitAtV7(state, { x: 1, y: 5 });
    const first = acceptV7(state, 0, { kind: "END_TURN" });
    const second = acceptV7(first.state, 1, { kind: "END_TURN" });
    const crushed = [...first.events, ...second.events].flatMap((event) =>
      event.kind === "UNITS_CRUSHED" ? event.results : [],
    );
    expect(crushed).toMatchObject([
      { unitId: launch.id, damage: ICE_CRUSH_DAMAGE_V7 },
    ]);
  });
});

describe("W2, Sea Tunnels (section 7.3)", () => {
  it("is the rule of the shared helper: land always, Shallow Water without ice with Sea Tunnels only", () => {
    const tile = (terrain: "GRASS" | "SHALLOW_WATER" | "DEEP_WATER") => ({
      land: terrain === "GRASS",
      terrain,
    });
    expect([
      seaTunnelPassableV7({ seaTunnels: false, ...tile("GRASS"), ice: false }),
      seaTunnelPassableV7({
        seaTunnels: false,
        ...tile("SHALLOW_WATER"),
        ice: false,
      }),
      seaTunnelPassableV7({
        seaTunnels: true,
        ...tile("SHALLOW_WATER"),
        ice: false,
      }),
      seaTunnelPassableV7({
        seaTunnels: true,
        ...tile("SHALLOW_WATER"),
        ice: true,
      }),
      seaTunnelPassableV7({
        seaTunnels: true,
        ...tile("DEEP_WATER"),
        ice: false,
      }),
    ]).toEqual([true, false, true, false, false]);
  });

  it("tunnels a Mole and its Hammerer under a two-tile strait: offered, accepted, both surface on the far coast and erupt", () => {
    const state = straitOf();
    const command = tunnel(state, MOLE, FAR_COAST, {
      from: HAMMERER,
      to: { x: 0, y: 8 },
    });
    expect(offered(state, command)).toBe(true);
    const preview = previewTunnelV7(viewOf(state), command as never);
    const enemy = navalUnitAtV7(state, ENEMY);
    expect(preview?.eruptionTargets).toMatchObject([
      { unitId: enemy.id, damage: 2 },
    ]);
    const result = acceptV7(state, 0, command);
    expect(result.events[0]).toMatchObject({
      kind: "UNIT_TUNNELLED",
      from: MOLE,
      to: FAR_COAST,
      riderFrom: HAMMERER,
      riderTo: { x: 0, y: 8 },
    });
    expect(result.state.burrowed.map((entry) => entry.unit.at)).toEqual([
      FAR_COAST,
      { x: 0, y: 8 },
    ]);
    expect(parseGameStateV7(result.state)).not.toBeNull();
    // At the Dwarves' next Start Turn both surface and the Mole erupts.
    const back = endTurnUntilV7(
      endTurnUntilV7(result.state, seatIdV7(state, 1)).state,
      seatIdV7(state, 0),
    );
    const surfaced = back.events.find(
      (event) => event.kind === "UNIT_SURFACED",
    );
    expect(surfaced).toMatchObject({
      at: FAR_COAST,
      riderAt: { x: 0, y: 8 },
    });
    expect(
      allOwnedUnitsV7(back.state).find((unit) => unit.id === enemy.id)?.hp,
    ).toBe(enemy.hp - 2);
    expect(back.state.burrowed).toEqual([]);
  });

  it("tunnels under a one-tile strait, and range stays 3", () => {
    const state = straitOf(
      DWARF_NAVAL_TECHS_V7,
      SEA_TUNNEL_NARROW_V7,
      { x: 1, y: 6 },
      { x: 1, y: 5 },
    );
    const destinations = queryPlayerCommandsV7(viewOf(state)).flatMap(
      (command) =>
        command.kind === "TUNNEL" && command.rider === null ? [command.to] : [],
    );
    expect(destinations).toContainEqual({ x: 1, y: 8 });
    expect(destinations).toContainEqual({ x: 1, y: 9 });
    expect(destinations).not.toContainEqual({ x: 1, y: 10 });
    expect(
      destinations.every(
        (to) =>
          Math.max(Math.abs(to.x - 1), Math.abs(to.y - 6)) <= TUNNEL_RANGE_V7,
      ),
    ).toBe(true);
    acceptV7(state, 0, tunnel(state, { x: 1, y: 6 }, { x: 1, y: 9 }));
  });

  it("needs Sea Tunnels: never offered and DESTINATION without Seamanship", () => {
    const state = straitOf(DWARF_WITHOUT_SEA_TUNNELS_V7);
    const command = tunnel(state, MOLE, FAR_COAST);
    expect(offered(state, command)).toBe(false);
    expect(rejectV7(state, 0, command)).toEqual({
      code: "TUNNEL_NOT_LEGAL",
      params: { reason: "DESTINATION" },
    });
    // No offered destination lies across the water.
    expect(
      queryPlayerCommandsV7(viewOf(state)).some(
        (candidate) => candidate.kind === "TUNNEL" && candidate.to.y >= 8,
      ),
    ).toBe(false);
  });

  it("never passes under Deep Water", () => {
    let state = straitOf();
    for (let x = 0; x <= 3; x += 1)
      state = patchTileV7(state, { x, y: 6 }, { terrain: "DEEP_WATER" });
    const command = tunnel(state, MOLE, FAR_COAST);
    expect(offered(state, command)).toBe(false);
    expect(rejectV7(state, 0, command).params).toEqual({
      reason: "DESTINATION",
    });
  });

  it("never passes under ice", () => {
    const base = dwarfStraitV7({
      terrain: SEA_TUNNEL_STRAIT_V7,
      pieces: [
        { seat: 0, role: "GUARD", at: MOLE },
        { seat: 0, role: "FIGHTER", at: HAMMERER },
      ],
      technologies: [DWARF_NAVAL_TECHS_V7, NAVAL_TECHS_V7],
      third: { faction: "ICE_FOLK" },
    });
    const state = frozenStateV7(
      base,
      [0, 1, 2, 3].map((x) => ({ at: { x, y: 7 }, seat: 2 as const })),
    );
    const command = tunnel(state, MOLE, FAR_COAST);
    expect(offered(state, command)).toBe(false);
    expect(rejectV7(state, 0, command).params).toEqual({
      reason: "DESTINATION",
    });
    // Without the ice the same tunnel is offered.
    expect(offered(base, tunnel(base, MOLE, FAR_COAST))).toBe(true);
  });

  it("never ends on water: the Mole's destination and the rider's tile stay land", () => {
    const state = straitOf();
    expect(
      rejectV7(state, 0, tunnel(state, MOLE, { x: 1, y: 7 })).params,
    ).toEqual({ reason: "DESTINATION" });
    expect(
      rejectV7(
        state,
        0,
        tunnel(state, MOLE, FAR_COAST, { from: HAMMERER, to: { x: 0, y: 7 } }),
      ).params,
    ).toEqual({ reason: "RIDER_DESTINATION" });
  });

  it("offers a tunnel exactly when it is accepted, over every offer of the strait", () => {
    const state = straitOf();
    const offers = queryPlayerCommandsV7(viewOf(state)).filter(
      (command) => command.kind === "TUNNEL",
    );
    expect(
      offers.some((command) => command.kind === "TUNNEL" && command.to.y === 8),
    ).toBe(true);
    for (const command of offers) acceptV7(state, 0, command);
    // And a sweep of every land tile in reach: refused exactly when not offered.
    for (let y = 2; y <= 10; y += 1)
      for (let x = 0; x <= 4; x += 1) {
        const command = tunnel(state, MOLE, { x, y });
        const accepted = (() => {
          try {
            acceptV7(state, 0, command);
            return true;
          } catch {
            return false;
          }
        })();
        expect(accepted, `${String(x)},${String(y)}`).toBe(
          offered(state, command),
        );
      }
  });

  it("touches no water on the board: nothing stands on the strait and no dock changes", () => {
    const state = straitOf();
    const result = acceptV7(
      state,
      0,
      tunnel(state, MOLE, FAR_COAST, { from: HAMMERER, to: { x: 0, y: 8 } }),
    );
    expect(
      result.state.units.filter((unit) => unit.at.y === 6 || unit.at.y === 7),
    ).toEqual(state.units.filter((unit) => unit.at.y === 6 || unit.at.y === 7));
    expect(result.state.board).toEqual(state.board);
    expect(result.events.map((event) => event.kind)).not.toContain(
      "PORT_BLOCKADE_CHANGED",
    );
  });
});

describe("the interface (sections 7.3 and 12)", () => {
  it("names the ships on the cards and says the Armoured and Sea Tunnels sentences", () => {
    expect(navalRamUnlockTextV7("DWARF")).toBe(
      "Bow Ram: Steam Launches that moved hit ships with +1 Attack and shove them back",
    );
    expect(battleshipUnlockNoteV7("DWARF")).toBe(
      "Ironclad: long-range splash damage; Armoured (every hit of 2 or more does 1 less)",
    );
    expect(submarineUnlockNoteV7("DWARF")).toBe(
      "Diving Bell: hit only from the next tile; torpedo with no strike-back; Armoured",
    );
    expect(patrolBoatUnlockNotesV7("DWARF")).toEqual([
      "Steam Launch: Armoured, every hit of 2 or more does 1 less",
    ]);
    expect(patrolBoatUnlockNotesV7("ORIGINAL")).toEqual([]);
    expect(armouredHullRuleV7("DWARF")).toBe(
      "Armoured: every hit of 2 or more does 1 less.",
    );
    expect(seaTunnelsRuleV7()).toBe(
      "Your Steam Moles can tunnel under shallow water.",
    );
    expect(seaTunnelsUnlockTextV7()).toBe(
      "Sea Tunnels: Your Steam Moles can tunnel under shallow water",
    );
    // Every other faction's card lines are unchanged.
    expect(battleshipUnlockNoteV7("ORIGINAL")).toBe(
      "Battleship: long-range splash damage",
    );
    expect(submarineUnlockNoteV7("ORIGINAL")).toBe(
      "Submarine: attacked only from the next tile; its torpedo hits ships with no strike-back",
    );
    const atSea = dwarfHelpRulesV7().find(([label]) => label === "At sea");
    expect(atSea?.[1]).toBe(
      "the Steam Launch, Ironclad, and Diving Bell are Armoured: every hit of 2 or more does 1 less; with Sea Tunnels, a Steam Mole can tunnel under shallow water (never deep water or ice) and surface on the far coast.",
    );
  });

  it("lists Armoured on each Dwarf hull and Sea Tunnels on the Mole in the glossary", () => {
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(
        roleGlossaryV7(role, "DWARF").map((entry) => entry.name),
        role,
      ).toContain("Armoured");
    expect(roleGlossaryV7("GUARD", "DWARF")).toContainEqual(
      glossaryEntryV7("SEA_TUNNELS"),
    );
    expect(glossaryEntryV7("SEA_TUNNELS").name).toBe("Sea Tunnels");
    for (const role of ["FIGHTER", "GUARD"] as const)
      for (const faction of ["ORIGINAL", "MARTIAN"] as const)
        expect(
          roleGlossaryV7(role, faction).map((entry) => entry.name),
        ).not.toContain("Sea Tunnels");
    expect(
      roleGlossaryV7("FIGHTER", "DWARF").map((entry) => entry.name),
    ).not.toContain("Sea Tunnels");
  });

  it("previews Armoured on either side of a Dwarf ship's exchange", () => {
    const state = sea(
      ["ORIGINAL", "DWARF"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const view = viewOf(state);
    const preview = queryCombatPreviewV7(
      view,
      navalUnitAtV7(state, { x: 3, y: 5 }).id,
      navalUnitAtV7(state, { x: 4, y: 5 }).id,
    );
    if (preview === null) throw new Error("no preview");
    expect(dwarfCombatLinesV7(view, preview).notes).toContain("Armoured −1");
    const dwarf = sea(
      ["DWARF", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 }, ran: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const dwarfView = viewOf(dwarf);
    const ram = queryCombatPreviewV7(
      dwarfView,
      navalUnitAtV7(dwarf, { x: 3, y: 5 }).id,
      navalUnitAtV7(dwarf, { x: 4, y: 5 }).id,
    );
    if (ram === null) throw new Error("no preview");
    expect(dwarfCombatLinesV7(dwarfView, ram).notes).toContain(
      "Your armour −1",
    );
  });

  it("draws a tunnel's route under the strait, and none for a tunnel under land", () => {
    const state = straitOf();
    const view = viewOf(state);
    expect(seaTunnelRouteV7(view, MOLE, FAR_COAST, TUNNEL_RANGE_V7)).toEqual([
      MOLE,
      { x: 1, y: 6 },
      { x: 1, y: 7 },
      FAR_COAST,
    ]);
    expect(
      seaTunnelRouteV7(view, MOLE, { x: 1, y: 2 }, TUNNEL_RANGE_V7),
    ).toBeNull();
    const mole = navalUnitAtV7(state, MOLE);
    const commands = queryPlayerCommandsV7(view);
    const targets = dwarfPickTargetsV7(view, commands, {
      kind: "TUNNEL",
      unitId: mole.id,
      to: null,
      riderUnitId: null,
      riderTo: null,
    });
    const across = targets.find(
      (target) => target.at.x === 1 && target.at.y === 8,
    );
    expect(across?.tunnel?.underWater).toEqual([
      { at: MOLE, water: false },
      { at: { x: 1, y: 6 }, water: true },
      { at: { x: 1, y: 7 }, water: true },
      { at: FAR_COAST, water: false },
    ]);
    const ashore = targets.find(
      (target) => target.at.x === 1 && target.at.y === 2,
    );
    expect(ashore?.tunnel).toBeDefined();
    expect(ashore?.tunnel?.underWater).toBeUndefined();
  });
});
