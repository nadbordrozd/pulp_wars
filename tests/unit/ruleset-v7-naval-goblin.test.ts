import { describe, expect, it } from "vitest";
import { chibiFallbackSubjectV7 } from "../../src/assets/chibi-art-v7";
import { technologySubjectV7 } from "../../src/assets/chibi-ui-art-v7";
import {
  NAVAL_RAM_UNLOCK_V7,
  battleshipUnlockNoteV7,
  dreadnoughtBlastRuleV7,
  fireRaftsUnlockTextV7,
  navalRamUnlockTextV7,
  submarineUnlockNoteV7,
} from "../../src/render/naval-presentation-v7";
import {
  glossaryEntryV7,
  roleGlossaryV7,
} from "../../src/render/unit-glossary-v7";
import {
  FACTION_IDS_V7,
  NAVAL_ROLE_IDS_V7,
  UNIT_ROLE_IDS_V7,
  boardSeaBeastBlockedV7,
  boardTargetBlockV7,
  effectiveRoleRuleV7,
  factionTreeV7,
  parseGameStateV7,
  previewAttackExplosionsV7,
  previewBoardV7,
  previewKaboomV7,
  queryCombatPreviewV7,
  queryPlayerCommandsV7,
  roleMechanicsV7,
  technologyCapabilitiesV7,
  technologyDisplayNameV7,
  unitFactionV7,
  viewForV7,
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
import { frozenArenaV7, patchFrozenUnitV7 } from "../fixtures/v7-frozen-sea";
import {
  NAVAL_ARENA_PORTS_V7,
  NAVAL_TECHS_V7,
  acceptV7,
  movedActivationV7,
  navalArenaV7,
  navalUnitAtV7,
  navalUnitV7,
  patchNavalUnitV7,
  rejectV7,
  seatV7,
} from "../fixtures/v7-naval-branch";

// Themed naval branches, the Goblin Scrap Fleet (`pulp_wars-5ti.16`,
// docs/product/RULESET_7_NAVAL_FACTIONS.md sections 2 and 3): the Fire Raft
// (Kaboom 5 afloat with Powder Kegs), the Scrap Dreadnought (death blast 7,
// none when boarded or crushed), the Diving Barrel, the Powder Kegs
// Seamanship, and the shared plumbing (the prize's maximum HP under its new
// kind, the sea-beast Board rule). Every state is a small authored strait:
// rows 3 and 7 Shallow Water, rows 4 to 6 Deep Water.

const WITHOUT_SEAMANSHIP: readonly TechnologyIdV7[] = [
  "SHORECRAFT",
  "NAVIGATION",
  "NAVAL_ENGINEERING",
];

interface PieceV7 {
  readonly seat: 0 | 1;
  readonly role: UnitRoleIdV7;
  readonly at: CoordV7;
  readonly hp?: number;
  /** An embarked land unit (a transport) on this water tile. */
  readonly embarkedAt?: CoordV7;
}

/** A strait with the pieces; land pieces with `embarkedAt` are put afloat. */
function strait(
  factions: readonly [FactionIdV7, FactionIdV7],
  pieces: readonly PieceV7[],
  technologies: readonly [
    readonly TechnologyIdV7[],
    readonly TechnologyIdV7[],
  ] = [NAVAL_TECHS_V7, NAVAL_TECHS_V7],
): GameStateV7 {
  let state = navalArenaV7({
    factions,
    technologies,
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
    };
    if (Object.keys(patch).length > 0)
      state = patchNavalUnitV7(state, unit.id, patch);
  }
  return state;
}

const viewOf = (state: GameStateV7, seat: 0 | 1 = 0) =>
  viewForV7(state, seatV7(state, seat).id);
const offered = (state: GameStateV7, command: CommandV7, seat: 0 | 1 = 0) =>
  queryPlayerCommandsV7(viewOf(state, seat)).some(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(command),
  );
const kaboom = (unitId: number): CommandV7 => ({
  kind: "KABOOM",
  unitId: unitId as UnitId,
});
const attack = (unitId: number, targetUnitId: number): CommandV7 => ({
  kind: "ATTACK",
  unitId: unitId as UnitId,
  targetUnitId: targetUnitId as UnitId,
});
const explosionsOf = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) =>
    event.kind === "EXPLOSION_RESOLVED" ? [event] : [],
  );
const diedOf = (events: readonly DomainEventV7[]) =>
  events.flatMap((event) => (event.kind === "UNIT_DIED" ? [event] : []));
const moved = (state: GameStateV7, unitId: number) =>
  patchNavalUnitV7(state, unitId, {
    activation: movedActivationV7(navalUnitV7(state, unitId)),
  });

describe("the Scrap Fleet registry (section 3.1 and 3.2)", () => {
  it("registers every row of the unit table", () => {
    const row = (role: UnitRoleIdV7) => {
      const rule = effectiveRoleRuleV7(role, "GOBLIN");
      const mechanics = roleMechanicsV7(role, "GOBLIN");
      return [
        rule.label,
        rule.cost,
        rule.maxHp,
        rule.attack2 / 2,
        rule.defense2 / 2,
        rule.move,
        `${String(rule.minimumRange)}-${String(rule.range)}`,
        rule.abilities,
        mechanics.kaboomDamage,
        mechanics.deathBlastDamage,
      ];
    };
    expect(row("PATROL_BOAT")).toEqual([
      "Fire Raft",
      4,
      8,
      2,
      2,
      2,
      "1-1",
      ["ATTACK", "RAM", "KABOOM"],
      5,
      null,
    ]);
    expect(row("BATTLESHIP")).toEqual([
      "Scrap Dreadnought",
      16,
      25,
      5,
      3,
      2,
      "1-3",
      ["ATTACK"],
      null,
      7,
    ]);
    expect(row("SUBMARINE")).toEqual([
      "Diving Barrel",
      8,
      10,
      4,
      2,
      2,
      "1-1",
      ["ATTACK", "SUBMERGED", "TORPEDO"],
      null,
      null,
    ]);
    // The tactical labels never change; the Dreadnought keeps its splash.
    for (const role of NAVAL_ROLE_IDS_V7)
      expect(effectiveRoleRuleV7(role, "GOBLIN").tacticalRole).toBe(
        effectiveRoleRuleV7(role, "ORIGINAL").tacticalRole,
      );
    expect(roleMechanicsV7("BATTLESHIP", "GOBLIN").splash).toBe(true);
  });

  it("names the five technologies and makes Seamanship the Ram and Powder Kegs", () => {
    expect(
      NAVAL_TECHS_V7.map((tech) => technologyDisplayNameV7(tech, "GOBLIN")),
    ).toEqual([
      "Fire Rafts",
      "Navigation",
      "Dreadnoughts",
      "Powder Kegs",
      "Diving Barrels",
    ]);
    const seamanship = factionTreeV7("GOBLIN").nodes.find(
      (node) => node.id === "SEAMANSHIP",
    );
    expect(seamanship?.unlocks).toEqual([
      { kind: "RAM" },
      { kind: "FIRE_RAFTS" },
    ]);
    const kegs = technologyCapabilitiesV7(
      ["SHORECRAFT", "SEAMANSHIP"],
      "GOBLIN",
    );
    expect([kegs.ram, kegs.fireRafts, kegs.boarding]).toEqual([
      true,
      true,
      false,
    ]);
    // Every other faction has no Fire Rafts; those not yet themed keep
    // Board (the Undead trade it for Drowned Crews, `pulp_wars-5ti.17`).
    for (const faction of FACTION_IDS_V7) {
      if (faction === "GOBLIN" || faction === "ICE_FOLK") continue;
      const other = technologyCapabilitiesV7(
        ["SHORECRAFT", "SEAMANSHIP"],
        faction,
      );
      expect([other.boarding, other.fireRafts], faction).toEqual([
        faction !== "UNDEAD",
        false,
      ]);
    }
  });

  it("trains a Fire Raft for 4 Coins at a Port, with 8 HP", () => {
    const state = strait(["GOBLIN", "ORIGINAL"], []);
    const actor = seatV7(state, 0);
    const city = state.cities.find((entry) => entry.ownerId === actor.id);
    if (city === undefined) throw new Error("no city");
    const train: CommandV7 = {
      kind: "TRAIN_NAVAL",
      cityId: city.id,
      at: NAVAL_ARENA_PORTS_V7[0],
      role: "PATROL_BOAT",
    };
    expect(offered(state, train)).toBe(true);
    const result = acceptV7(state, 0, train);
    expect(result.events[0]).toMatchObject({
      kind: "NAVAL_UNIT_TRAINED",
      role: "PATROL_BOAT",
      cost: 4,
    });
    expect(navalUnitAtV7(result.state, NAVAL_ARENA_PORTS_V7[0])).toMatchObject({
      role: "PATROL_BOAT",
      hp: 8,
      maxHp: 8,
    });
    expect(seatV7(result.state, 0).coins).toBe(actor.coins - 4);
  });
});

describe("G1, the Fire Raft's Kaboom afloat", () => {
  const RAFT: CoordV7 = { x: 3, y: 5 };
  const scene = (technologies: readonly TechnologyIdV7[] = NAVAL_TECHS_V7) =>
    strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: RAFT },
        // An own Diving Barrel in the area takes the blast too.
        { seat: 0, role: "SUBMARINE", at: { x: 2, y: 4 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
        // Two Human transports.
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 1, y: 9 },
          embarkedAt: { x: 4, y: 4 },
        },
        {
          seat: 1,
          role: "FIGHTER",
          at: { x: 2, y: 9 },
          embarkedAt: { x: 4, y: 6 },
        },
      ],
      [technologies, NAVAL_TECHS_V7],
    );

  it("hits every unit around the raft for 5, own ones included; the raft is gone and leaves no Grave", () => {
    const state = scene();
    const raft = navalUnitAtV7(state, RAFT);
    const command = kaboom(raft.id);
    expect(offered(state, command)).toBe(true);
    const preview = previewKaboomV7(viewOf(state), raft.id);
    const result = acceptV7(state, 0, command);
    const explosions = explosionsOf(result.events);
    expect(explosions).toHaveLength(1);
    expect(explosions[0]).toMatchObject({
      unitId: raft.id,
      cause: "KABOOM",
      wave: 1,
      damage: 5,
      at: RAFT,
    });
    // Battleship, both transports, and the own Diving Barrel: 5 each.
    expect(
      explosions[0]?.results.map((entry) => [entry.at, entry.damage]),
    ).toEqual([
      [{ x: 2, y: 4 }, 5],
      [{ x: 4, y: 4 }, 5],
      [{ x: 4, y: 5 }, 5],
      [{ x: 4, y: 6 }, 5],
    ]);
    expect(diedOf(result.events)).toEqual([
      { kind: "UNIT_DIED", unitId: raft.id, cause: "KABOOM" },
    ]);
    expect(result.state.units.some((unit) => unit.id === raft.id)).toBe(false);
    expect(result.state.graves).toEqual(state.graves);
    expect(navalUnitAtV7(result.state, { x: 4, y: 5 }).hp).toBe(20);
    // The preview equals the resolution (every unit is visible).
    expect(preview?.explosions.map((entry) => entry.results.length)).toEqual([
      4,
    ]);
    expect(preview?.totals).toMatchObject({
      hostileDamage: 15,
      friendlyDamage: 5,
      hostileKills: 0,
    });
    expect(parseGameStateV7(result.state)).not.toBeNull();
  });

  it("may Kaboom after moving, never after attacking", () => {
    const state = scene();
    const raft = navalUnitAtV7(state, RAFT);
    const after = acceptV7(state, 0, {
      kind: "MOVE",
      unitId: raft.id,
      path: [{ x: 3, y: 4 }],
    }).state;
    expect(offered(after, kaboom(raft.id))).toBe(true);
    acceptV7(after, 0, kaboom(raft.id));
    // A transport never strikes back.
    const transport = navalUnitAtV7(state, { x: 4, y: 4 });
    const attacked = acceptV7(state, 0, attack(raft.id, transport.id)).state;
    const survivor = attacked.units.find((unit) => unit.id === raft.id);
    if (survivor === undefined) throw new Error("the raft sank attacking");
    expect(offered(attacked, kaboom(raft.id))).toBe(false);
    expect(rejectV7(attacked, 0, kaboom(raft.id))).toEqual({
      code: "UNIT_ALREADY_ACTED",
      params: { unitId: raft.id },
    });
  });

  it("needs Powder Kegs: never offered and TECH_REQUIRED without Seamanship", () => {
    const state = scene(WITHOUT_SEAMANSHIP);
    const raft = navalUnitAtV7(state, RAFT);
    expect(offered(state, kaboom(raft.id))).toBe(false);
    expect(previewKaboomV7(viewOf(state), raft.id)).toBeNull();
    expect(rejectV7(state, 0, kaboom(raft.id))).toEqual({
      code: "TECH_REQUIRED",
      params: { tech: "SEAMANSHIP" },
    });
  });

  it("is refused to an icebound raft (ICEBOUND) and never offered", () => {
    const state = frozenArenaV7({
      factions: ["GOBLIN", "ORIGINAL"],
      units: [
        { seat: 0, role: "PATROL_BOAT", at: RAFT },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
      ice: [{ at: RAFT, seat: 2, turnsLeft: 5 }],
      third: { faction: "ICE_FOLK", explored: true },
    });
    const raft = navalUnitAtV7(state, RAFT);
    expect(offered(state, kaboom(raft.id))).toBe(false);
    expect(rejectV7(state, 0, kaboom(raft.id))).toEqual({
      code: "KABOOM_NOT_LEGAL",
      params: { reason: "ICEBOUND" },
    });
  });

  it("is no Kaboom of the other ships, of a Human boat, or of an embarked unit", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 0, role: "SUBMARINE", at: { x: 4, y: 5 } },
        {
          seat: 0,
          role: "FIGHTER",
          at: { x: 1, y: 1 },
          embarkedAt: { x: 6, y: 5 },
        },
      ],
    );
    for (const [at, role] of [
      [{ x: 2, y: 5 }, "BATTLESHIP"],
      [{ x: 4, y: 5 }, "SUBMARINE"],
    ] as const) {
      const unit = navalUnitAtV7(state, at);
      expect(offered(state, kaboom(unit.id))).toBe(false);
      expect(rejectV7(state, 0, kaboom(unit.id))).toEqual({
        code: "UNIT_ROLE_INVALID",
        params: { role },
      });
    }
    const goblin = navalUnitAtV7(state, { x: 6, y: 5 });
    expect(rejectV7(state, 0, kaboom(goblin.id))).toEqual({
      code: "KABOOM_NOT_LEGAL",
      params: { reason: "EMBARKED" },
    });
    const human = strait(
      ["ORIGINAL", "GOBLIN"],
      [{ seat: 0, role: "PATROL_BOAT", at: RAFT }],
    );
    const boat = navalUnitAtV7(human, RAFT);
    expect(rejectV7(human, 0, kaboom(boat.id))).toEqual({
      code: "UNIT_ROLE_INVALID",
      params: { role: "PATROL_BOAT" },
    });
  });

  it("offers a Kaboom exactly when it is accepted, over every own unit of several states", () => {
    const states = [
      scene(),
      scene(WITHOUT_SEAMANSHIP),
      moved(scene(), navalUnitAtV7(scene(), RAFT).id),
    ];
    for (const state of states)
      for (const unit of state.units.filter(
        (candidate) => candidate.ownerId === seatV7(state, 0).id,
      )) {
        const command = kaboom(unit.id);
        const legal = offered(state, command);
        const result = rejectOrAccept(state, command);
        expect(result, `${unit.role} ${String(unit.id)}`).toBe(legal);
      }
  });

  it("three rafts, not beside one another, deal one Battleship 15 of its 25", () => {
    let state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 4 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 5, y: 4 } },
        { seat: 0, role: "PATROL_BOAT", at: { x: 4, y: 6 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    for (const at of [
      { x: 3, y: 4 },
      { x: 5, y: 4 },
      { x: 4, y: 6 },
    ])
      state = acceptV7(state, 0, kaboom(navalUnitAtV7(state, at).id)).state;
    expect(navalUnitAtV7(state, { x: 4, y: 5 }).hp).toBe(10);
  });

  it("pays Plunder for a hostile unit its blast kills", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: RAFT },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 }, hp: 4 },
      ],
      [[...NAVAL_TECHS_V7, "SCOUTING", "ROADS", "COMMERCE"], NAVAL_TECHS_V7],
    );
    const result = acceptV7(state, 0, kaboom(navalUnitAtV7(state, RAFT).id));
    expect(result.events).toContainEqual({
      kind: "PLUNDER_AWARDED",
      playerId: seatV7(state, 0).id,
      kills: 1,
      coins: 2,
    });
  });

  it("a Fire Raft killed does not explode: only its Kaboom does", () => {
    const state = strait(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const battleship = navalUnitAtV7(state, { x: 2, y: 5 });
    const raft = navalUnitAtV7(state, { x: 4, y: 5 });
    const preview = queryCombatPreviewV7(viewOf(state), battleship.id, raft.id);
    expect(preview?.defenderDies).toBe(true);
    const result = acceptV7(state, 0, attack(battleship.id, raft.id));
    expect(explosionsOf(result.events)).toEqual([]);
  });
});

/** Accepted (true) or rejected atomically (false). */
function rejectOrAccept(state: GameStateV7, command: CommandV7): boolean {
  try {
    acceptV7(state, 0, command);
    return true;
  } catch {
    rejectV7(state, 0, command);
    return false;
  }
}

describe("the worked examples of section 3.4, as exact previews and results", () => {
  it("Fire Raft rams a Patrol Boat: 8; 4, as the Human boat", () => {
    const base = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
      ],
    );
    const raft = navalUnitAtV7(base, { x: 3, y: 5 });
    const boat = navalUnitAtV7(base, { x: 4, y: 5 });
    const state = moved(base, raft.id);
    const preview = queryCombatPreviewV7(viewOf(state), raft.id, boat.id);
    expect(preview).toMatchObject({
      ram: true,
      damageToDefender: 8,
      damageToAttacker: 4,
    });
    const result = acceptV7(state, 0, attack(raft.id, boat.id));
    expect(navalUnitV7(result.state, raft.id).hp).toBe(4);
  });

  it("Patrol Boat rams a Fire Raft: sunk; a Battleship sinks one; a Submarine sinks a Diving Barrel", () => {
    const base = strait(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
        { seat: 0, role: "BATTLESHIP", at: { x: 6, y: 3 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 8, y: 3 } },
        { seat: 0, role: "SUBMARINE", at: { x: 1, y: 6 } },
        { seat: 1, role: "SUBMARINE", at: { x: 2, y: 6 } },
      ],
    );
    const boat = navalUnitAtV7(base, { x: 3, y: 5 });
    const state = moved(base, boat.id);
    const view = viewOf(state);
    const id = (at: CoordV7) => navalUnitAtV7(state, at).id;
    expect(
      queryCombatPreviewV7(view, boat.id, id({ x: 4, y: 5 })),
    ).toMatchObject({ ram: true, damageToDefender: 8, defenderDies: true });
    expect(
      queryCombatPreviewV7(view, id({ x: 6, y: 3 }), id({ x: 8, y: 3 })),
    ).toMatchObject({ defenderDies: true });
    expect(
      queryCombatPreviewV7(view, id({ x: 1, y: 6 }), id({ x: 2, y: 6 })),
    ).toMatchObject({ torpedo: true, defenderDies: true });
  });

  it("Diving Barrel torpedoes a Battleship: 10; 0, as the Human Submarine", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const barrel = navalUnitAtV7(state, { x: 3, y: 5 });
    const battleship = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(
      queryCombatPreviewV7(viewOf(state), barrel.id, battleship.id),
    ).toMatchObject({
      torpedo: true,
      damageToDefender: 10,
      damageToAttacker: 0,
    });
  });

  it("Submarine finishes a Dreadnought at 9 HP from the next tile: sunk, and the Submarine takes 7 (5 of 12 left)", () => {
    const state = strait(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "SUBMARINE", at: { x: 3, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp: 9 },
      ],
    );
    const sub = navalUnitAtV7(state, { x: 3, y: 5 });
    const dreadnought = navalUnitAtV7(state, { x: 4, y: 5 });
    const blast = previewAttackExplosionsV7(
      viewOf(state),
      sub.id,
      dreadnought.id,
    );
    expect(blast?.explosions).toMatchObject([
      {
        unitId: dreadnought.id,
        cause: "DEATH",
        damage: 7,
        results: [{ unitId: sub.id, damage: 7, dies: false }],
      },
    ]);
    const result = acceptV7(state, 0, attack(sub.id, dreadnought.id));
    expect(explosionsOf(result.events)).toMatchObject([
      { unitId: dreadnought.id, cause: "DEATH", damage: 7 },
    ]);
    expect(navalUnitV7(result.state, sub.id).hp).toBe(5);
  });

  it("a Human ship boards that Dreadnought at 8 HP instead: its Battleship at 9 HP, and nothing explodes", () => {
    const state = strait(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp: 8 },
      ],
    );
    const boat = navalUnitAtV7(state, { x: 3, y: 5 });
    const dreadnought = navalUnitAtV7(state, { x: 4, y: 5 });
    const board: CommandV7 = {
      kind: "BOARD",
      unitId: boat.id,
      targetUnitId: dreadnought.id,
    };
    expect(
      previewBoardV7(viewOf(state), boat.id, dreadnought.id)?.hpAfter,
    ).toBe(9);
    const result = acceptV7(state, 0, board);
    expect(explosionsOf(result.events)).toEqual([]);
    const prize = navalUnitV7(result.state, dreadnought.id);
    expect(prize).toMatchObject({ hp: 9, maxHp: 25, role: "BATTLESHIP" });
    expect(unitFactionV7(result.state, prize)).toBe("ORIGINAL");
    // The prize is a Human Battleship: no blast when it sinks.
    expect(roleMechanicsV7("BATTLESHIP", "ORIGINAL").deathBlastDamage).toBe(
      null,
    );
  });
});

describe("G2, the Scrap Dreadnought's death blast, by every cause", () => {
  it("explodes when it dies attacking (its retaliation death)", () => {
    const base = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 3, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 } },
      ],
    );
    const dreadnought = navalUnitAtV7(base, { x: 3, y: 5 });
    const target = navalUnitAtV7(base, { x: 4, y: 5 });
    const state = patchNavalUnitV7(base, dreadnought.id, { hp: 1 });
    expect(
      queryCombatPreviewV7(viewOf(state), dreadnought.id, target.id),
    ).toMatchObject({ attackerDies: true, defenderDies: false });
    const result = acceptV7(state, 0, attack(dreadnought.id, target.id));
    expect(diedOf(result.events)).toContainEqual({
      kind: "UNIT_DIED",
      unitId: dreadnought.id,
      cause: "RETALIATION",
    });
    expect(explosionsOf(result.events)).toMatchObject([
      {
        unitId: dreadnought.id,
        cause: "DEATH",
        damage: 7,
        results: [{ unitId: target.id, damage: 7 }],
      },
    ]);
  });

  it("explodes when a Battleship's splash sinks it", () => {
    const state = strait(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "BATTLESHIP", at: { x: 2, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 4, y: 5 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 5, y: 5 }, hp: 2 },
      ],
    );
    const battleship = navalUnitAtV7(state, { x: 2, y: 5 });
    const raft = navalUnitAtV7(state, { x: 4, y: 5 });
    const dreadnought = navalUnitAtV7(state, { x: 5, y: 5 });
    const result = acceptV7(state, 0, attack(battleship.id, raft.id));
    expect(diedOf(result.events)).toContainEqual({
      kind: "UNIT_DIED",
      unitId: dreadnought.id,
      cause: "SPLASH",
    });
    expect(explosionsOf(result.events)).toMatchObject([
      { unitId: dreadnought.id, cause: "DEATH", damage: 7 },
    ]);
  });

  it("explodes when a blast sinks it (a chain from a Fire Raft's Kaboom)", () => {
    const state = strait(
      ["GOBLIN", "ORIGINAL"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 0, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp: 3 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 5 } },
      ],
    );
    const raft = navalUnitAtV7(state, { x: 3, y: 5 });
    const dreadnought = navalUnitAtV7(state, { x: 4, y: 5 });
    const hostile = navalUnitAtV7(state, { x: 5, y: 5 });
    const result = acceptV7(state, 0, kaboom(raft.id));
    expect(explosionsOf(result.events)).toMatchObject([
      { unitId: raft.id, cause: "KABOOM", wave: 1 },
      {
        unitId: dreadnought.id,
        cause: "DEATH",
        wave: 2,
        damage: 7,
        results: [{ unitId: hostile.id, damage: 7 }],
      },
    ]);
  });

  it("explodes when a Banshee's Wail sinks it", () => {
    const state = strait(
      ["UNDEAD", "GOBLIN"],
      [
        { seat: 0, role: "MARKSMAN", at: { x: 4, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 4 }, hp: 1 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 5 } },
      ],
    );
    const banshee = navalUnitAtV7(state, { x: 4, y: 2 });
    const dreadnought = navalUnitAtV7(state, { x: 4, y: 4 });
    const result = acceptV7(state, 0, {
      kind: "WAIL",
      unitId: banshee.id,
    });
    expect(diedOf(result.events)).toContainEqual({
      kind: "UNIT_DIED",
      unitId: dreadnought.id,
      cause: "WAIL",
    });
    expect(explosionsOf(result.events)).toMatchObject([
      { unitId: dreadnought.id, cause: "DEATH", damage: 7 },
    ]);
  });

  it("explodes when Plague sinks it at its owner's Start Turn", () => {
    const base = strait(
      ["UNDEAD", "GOBLIN"],
      [
        { seat: 0, role: "CATAPULT", at: { x: 2, y: 2 } },
        { seat: 1, role: "BATTLESHIP", at: { x: 4, y: 5 }, hp: 2 },
        { seat: 1, role: "PATROL_BOAT", at: { x: 5, y: 5 } },
      ],
    );
    const lich = navalUnitAtV7(base, { x: 2, y: 2 });
    const dreadnought = navalUnitAtV7(base, { x: 4, y: 5 });
    const plagued = parseGameStateV7({
      ...base,
      plagued: [
        { unitId: dreadnought.id, sourceUnitId: lich.id, turnsRemaining: 3 },
      ],
    });
    if (plagued === null) throw new Error("the plagued state is invalid");
    const result = acceptV7(plagued, 0, { kind: "END_TURN" });
    expect(diedOf(result.events)).toContainEqual({
      kind: "UNIT_DIED",
      unitId: dreadnought.id,
      cause: "PLAGUE",
    });
    expect(explosionsOf(result.events)).toMatchObject([
      { unitId: dreadnought.id, cause: "DEATH", damage: 7 },
    ]);
  });

  it("sinks quietly when the Ice Folk ice crushes it", () => {
    const base = frozenArenaV7({
      factions: ["ICE_FOLK", "GOBLIN"],
      units: [
        { seat: 1, role: "BATTLESHIP", at: { x: 1, y: 5 } },
        { seat: 1, role: "PATROL_BOAT", at: { x: 2, y: 5 } },
      ],
      ice: [{ at: { x: 1, y: 5 }, turnsLeft: 5 }],
    });
    const dreadnought = navalUnitAtV7(base, { x: 1, y: 5 });
    const raft = navalUnitAtV7(base, { x: 2, y: 5 });
    const state = patchFrozenUnitV7(base, dreadnought.id, { hp: 2 });
    const first = acceptV7(state, 0, { kind: "END_TURN" });
    const second = acceptV7(first.state, 1, { kind: "END_TURN" });
    const events = [...first.events, ...second.events];
    expect(diedOf(events)).toContainEqual({
      kind: "UNIT_DIED",
      unitId: dreadnought.id,
      cause: "CRUSHED",
    });
    expect(explosionsOf(events)).toEqual([]);
    expect(navalUnitV7(second.state, raft.id).hp).toBe(raft.hp);
  });
});

describe("a prize under its new flag (section 2 rule 5)", () => {
  const scene = (
    factions: readonly [FactionIdV7, FactionIdV7],
    targetRole: UnitRoleIdV7,
    patch: Partial<UnitStateV7>,
  ) => {
    const base = strait(factions, [
      { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
      { seat: 1, role: targetRole, at: { x: 4, y: 5 } },
    ]);
    const target = navalUnitAtV7(base, { x: 4, y: 5 });
    const state = patchNavalUnitV7(base, target.id, patch);
    return {
      state,
      boarder: navalUnitAtV7(state, { x: 3, y: 5 }),
      target,
    };
  };

  it("takes its new kind's maximum HP and is patched to one above that line", () => {
    for (const [factions, role, patch, expected] of [
      // A Fire Raft (8) becomes a Human Patrol Boat (10) at 4.
      [["ORIGINAL", "GOBLIN"], "PATROL_BOAT", { hp: 2 }, [10, 4]],
      // A veteran Fire Raft (13) becomes a veteran Patrol Boat (15) at 6.
      [
        ["ORIGINAL", "GOBLIN"],
        "PATROL_BOAT",
        { hp: 4, maxHp: 13, kills: 3, veteran: true },
        [15, 6],
      ],
      // A Diving Barrel (10) becomes a Human Submarine (12) at 5.
      [["ORIGINAL", "GOBLIN"], "SUBMARINE", { hp: 3 }, [12, 5]],
      // A Dinosaur seat takes a Fire Raft as its own boat (10) at 4.
      [["DINOSAUR", "GOBLIN"], "PATROL_BOAT", { hp: 2 }, [10, 4]],
    ] as const) {
      const fixture = scene(factions, role, patch);
      const preview = previewBoardV7(
        viewOf(fixture.state),
        fixture.boarder.id,
        fixture.target.id,
      );
      expect(preview?.hpAfter, `${factions[0]} ${role}`).toBe(expected[1]);
      const result = acceptV7(fixture.state, 0, {
        kind: "BOARD",
        unitId: fixture.boarder.id,
        targetUnitId: fixture.target.id,
      });
      const prize = navalUnitV7(result.state, fixture.target.id);
      expect([prize.maxHp, prize.hp], `${factions[0]} ${role}`).toEqual(
        expected,
      );
      // Every other kept field stays.
      expect(prize).toMatchObject({
        id: fixture.target.id,
        role,
        at: fixture.target.at,
        kills: patch.kills ?? 0,
        veteran: patch.veteran ?? false,
      });
      expect(parseGameStateV7(result.state)).not.toBeNull();
    }
  });

  it("keeps today's rule where both rosters are the Human one", () => {
    const fixture = scene(["ORIGINAL", "UNDEAD"], "BATTLESHIP", { hp: 8 });
    const result = acceptV7(fixture.state, 0, {
      kind: "BOARD",
      unitId: fixture.boarder.id,
      targetUnitId: fixture.target.id,
    });
    expect(navalUnitV7(result.state, fixture.target.id)).toMatchObject({
      maxHp: 25,
      hp: 9,
    });
  });
});

describe("sea beasts are never boarded (section 2 rule 6)", () => {
  it("has no sea beast yet, and the shared rule refuses one as TARGET_IMMUNE", () => {
    for (const faction of FACTION_IDS_V7)
      for (const role of UNIT_ROLE_IDS_V7)
        expect(
          roleMechanicsV7(role, faction).seaBeast,
          `${faction} ${role}`,
        ).toBe(false);
    const state = strait(
      ["ORIGINAL", "GOBLIN"],
      [
        { seat: 0, role: "PATROL_BOAT", at: { x: 3, y: 5 } },
        { seat: 1, role: "SUBMARINE", at: { x: 4, y: 5 }, hp: 3 },
      ],
    );
    const boarder = navalUnitAtV7(state, { x: 3, y: 5 });
    const target = navalUnitAtV7(state, { x: 4, y: 5 });
    expect(boardSeaBeastBlockedV7(state, boarder.ownerId, target)).toBe(false);
    expect(boardTargetBlockV7(boarder, target, "DEEP_WATER", true)).toBeNull();
    expect(boardTargetBlockV7(boarder, target, "DEEP_WATER", true, true)).toBe(
      "TARGET_IMMUNE",
    );
  });
});

describe("the Scrap Fleet's words and pictures (section 12)", () => {
  it("names each faction's ships on the cards and says the two Goblin sentences", () => {
    expect(navalRamUnlockTextV7("GOBLIN")).toBe(
      "Bow Ram: Fire Rafts that moved hit ships with +1 Attack and shove them back",
    );
    expect(navalRamUnlockTextV7("ORIGINAL")).toBe(NAVAL_RAM_UNLOCK_V7);
    expect(fireRaftsUnlockTextV7()).toBe(
      "Powder Kegs: A Fire Raft can blow itself up, hitting every unit around it for 5",
    );
    expect(dreadnoughtBlastRuleV7()).toBe(
      "When the Dreadnought sinks it explodes, hitting every unit around it for 7.",
    );
    expect(battleshipUnlockNoteV7("GOBLIN")).toBe(
      "Scrap Dreadnought: long-range splash damage; explodes when it sinks (7 to every unit around it)",
    );
    expect(battleshipUnlockNoteV7("ORIGINAL")).toBe(
      "Battleship: long-range splash damage",
    );
    expect(submarineUnlockNoteV7("GOBLIN")).toMatch(/^Diving Barrel: /);
    // Help: the Dreadnought's blast is its own line; the raft's Kaboom is
    // the Goblins' Kaboom! line (Powder Kegs says it needs a technology).
    expect(
      roleGlossaryV7("BATTLESHIP", "GOBLIN").map((entry) => entry.id),
    ).toContain("SINKS_EXPLODING");
    expect(
      roleGlossaryV7("PATROL_BOAT", "GOBLIN").map((entry) => entry.id),
    ).toEqual(expect.arrayContaining(["BOW_RAM", "KABOOM", "SHIP"]));
    expect(glossaryEntryV7("SEA_BEAST").text).toBe(
      "A living beast: it cannot be boarded.",
    );
  });

  it("shows the Fire Raft and Diving Barrel portraits and the Powder Kegs keg on the Goblin cards", () => {
    expect(
      NAVAL_TECHS_V7.map((tech) => technologySubjectV7(tech, "GOBLIN")),
    ).toEqual([
      "PORTRAIT:GOBLIN:PATROL_BOAT",
      "ICON:TECH:NAVIGATION",
      "UNIT:GOBLIN:BATTLESHIP",
      "ICON:TECH:GOBLIN:SEAMANSHIP",
      "PORTRAIT:GOBLIN:SUBMARINE",
    ]);
    // A look without the keg shows the shared wheel.
    expect(chibiFallbackSubjectV7("ICON:TECH:GOBLIN:SEAMANSHIP")).toBe(
      "ICON:TECH:SEAMANSHIP",
    );
  });
});
